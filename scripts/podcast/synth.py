#!/usr/bin/env python3
"""
synth.py — 把播客稿合成成 mp3。

输入：audio/scripts/<slug>.md   （front-matter + 分段中文文稿）
输出：audio/out/<slug>.mp3

要在 CosyVoice 的 conda 环境里运行（见 install_cosyvoice.sh）。
路径 / 参考音 / 参考文字通过环境变量传入，由 publish.sh 读 config.sh 注入：

  COSYVOICE_DIR     CosyVoice 仓库目录
  PODCAST_REF_WAV   参考音 wav（周睿录的那段，固定复用）
  PODCAST_REF_TEXT  参考音的逐字转写（必须和录音内容完全一致）

用法：
  python synth.py --script audio/scripts/birthday-21.md --out audio/out/birthday-21.mp3
  python synth.py --script ... --out ... --limit 3   # 只合成前 3 段，用于试音
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

MAX_CHARS = 180  # 单次送进模型的最大字符数，过长的段落按句号再切


def read_script(path: Path):
    """读播客稿，去掉 YAML front-matter 和 # 开头的导演注释，返回段落列表。"""
    text = path.read_text(encoding="utf-8")
    if text.lstrip().startswith("---"):
        # 去掉第一段 --- ... --- front-matter
        parts = text.split("---", 2)
        if len(parts) == 3:
            text = parts[2]
    paragraphs = []
    for block in re.split(r"\n\s*\n", text):
        block = block.strip()
        if not block or block.startswith("#"):
            continue
        # 段内换行并成一行，去掉残留的 markdown 强调符
        block = " ".join(block.split()).replace("*", "")
        paragraphs.append(block)
    return paragraphs


def split_sentences(para: str, max_chars: int = MAX_CHARS):
    """把过长的段落按中文句末标点切成 <= max_chars 的小块。"""
    sentences = re.findall(r"[^。！？!?\n]+[。！？!?]?", para) or [para]
    chunks, buf = [], ""
    for s in sentences:
        if len(buf) + len(s) > max_chars and buf:
            chunks.append(buf)
            buf = s
        else:
            buf += s
    if buf:
        chunks.append(buf)
    return chunks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True, help="播客稿 .md 路径")
    ap.add_argument("--out", required=True, help="输出 mp3 路径")
    ap.add_argument("--limit", type=int, default=0, help="只合成前 N 段（0=全部，用于试音）")
    args = ap.parse_args()

    cosyvoice_dir = os.environ.get("COSYVOICE_DIR")
    ref_wav = os.environ.get("PODCAST_REF_WAV")
    ref_text = os.environ.get("PODCAST_REF_TEXT")
    for name, val in [("COSYVOICE_DIR", cosyvoice_dir),
                      ("PODCAST_REF_WAV", ref_wav),
                      ("PODCAST_REF_TEXT", ref_text)]:
        if not val:
            sys.exit(f"环境变量 {name} 没设置 —— 请先从 config.example.sh 复制出 config.sh 并填好。")
    if not Path(ref_wav).exists():
        sys.exit(f"参考音文件不存在：{ref_wav}")

    paragraphs = read_script(Path(args.script))
    if args.limit:
        paragraphs = paragraphs[: args.limit]
    if not paragraphs:
        sys.exit("播客稿里没有可合成的正文段落。")
    total_chars = sum(len(p) for p in paragraphs)
    print(f"共 {len(paragraphs)} 段，约 {total_chars} 字。")

    # —— 延迟导入：这些只有在 CosyVoice 环境里才装得上 ——
    sys.path.insert(0, os.path.join(cosyvoice_dir, "third_party/Matcha-TTS"))
    sys.path.insert(0, cosyvoice_dir)
    import torch
    import torchaudio
    from cosyvoice.cli.cosyvoice import CosyVoice2

    model_dir = os.path.join(cosyvoice_dir, "pretrained_models/CosyVoice2-0.5B")
    print(f"加载模型：{model_dir}")
    model = CosyVoice2(model_dir, load_jit=False, load_trt=False, fp16=False)
    sr = model.sample_rate
    # 当前版本 CosyVoice 的 inference_zero_shot 直接收参考音【文件路径】

    gap_sentence = torch.zeros(1, int(sr * 0.30))  # 句间停顿
    gap_paragraph = torch.zeros(1, int(sr * 0.75))  # 段间停顿

    pieces = []
    for pi, para in enumerate(paragraphs, 1):
        for chunk in split_sentences(para):
            print(f"  [{pi}/{len(paragraphs)}] 合成 {len(chunk)} 字 …")
            segs = [j["tts_speech"] for j in
                    model.inference_zero_shot(chunk, ref_text, ref_wav, stream=False)]
            if segs:
                pieces.append(torch.cat(segs, dim=1))
                pieces.append(gap_sentence)
        pieces.append(gap_paragraph)

    audio = torch.cat(pieces, dim=1)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_wav = tmp.name
    torchaudio.save(tmp_wav, audio, sr)
    # wav -> mp3（-q:a 2 ≈ 190kbps VBR，人声足够）
    subprocess.run(
        ["ffmpeg", "-y", "-i", tmp_wav, "-codec:a", "libmp3lame", "-q:a", "2", str(out_path)],
        check=True,
    )
    os.unlink(tmp_wav)
    dur = audio.shape[1] / sr
    print(f"✅ 完成：{out_path}  时长 {int(dur // 60)}:{int(dur % 60):02d}")


if __name__ == "__main__":
    main()
