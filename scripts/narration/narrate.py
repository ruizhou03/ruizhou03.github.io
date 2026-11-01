#!/usr/bin/env python3
"""
narrate.py — 把听稿合成成整篇音频 + 分块清单（Qwen3-TTS 克隆周睿参考音）。

输入：audio/scripts/<slug>.md
  · 一段一块；`## ` 开头是小节标题；`# ` 开头是注释，跳过。
  · {显示|读法}：屏幕上显示前者，合成时读后者（专名、单位、文件名的读法纠正）。
输出：audio/out/<slug>.wav             整篇音频
      audio/out/<slug>.blocks.json     每块的显示片段、读法、在整篇里的起止秒数
      ~/.cache/zircon-narration/<hash>.wav  分块缓存（按读法文本哈希，只重合成改过的块）

在 qwentts conda 环境里运行：
  source scripts/podcast/config.sh   # 提供 PODCAST_REF_WAV / PODCAST_REF_TEXT
  python scripts/narration/narrate.py audio/scripts/zotero-setup.md
可选：--model <dir>（默认 ~/qwen-tts/models/Qwen3-TTS-12Hz-0.6B-Base）  --limit N（只合成前 N 块）
"""
import argparse, hashlib, json, os, re, sys, time
from pathlib import Path

import numpy as np
import soundfile as sf

GAP_PARA, GAP_HEAD = 0.45, 0.7          # 块间静音（秒）：段落之间 / 标题前后
CACHE = Path.home() / '.cache' / 'zircon-narration'
MARK = re.compile(r'\{([^{}|]+)\|([^{}]+)\}')


def parse(path: Path):
    text = path.read_text(encoding='utf-8')
    meta = {}
    if text.startswith('---'):
        _, fm, text = text.split('---', 2)
        for line in fm.strip().splitlines():
            k, _, v = line.partition(':')
            meta[k.strip()] = v.strip()
    blocks = []
    for raw in re.split(r'\n\s*\n', text):
        raw = ' '.join(raw.split())
        if not raw or (raw.startswith('#') and not raw.startswith('## ')):
            continue
        kind = 'head' if raw.startswith('## ') else 'para'
        body = raw[3:] if kind == 'head' else raw
        segs, pos = [], 0                       # [(显示, 读法)]，普通文字两者相同
        for m in MARK.finditer(body):
            if m.start() > pos:
                plain = body[pos:m.start()]
                segs.append((plain, plain))
            segs.append((m.group(1), m.group(2)))
            pos = m.end()
        if pos < len(body):
            segs.append((body[pos:], body[pos:]))
        blocks.append({'type': kind, 'segs': segs, 'spoken': ''.join(s for _, s in segs)})
    return meta, blocks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('script')
    ap.add_argument('--model', default=str(Path.home() / 'qwen-tts/models/Qwen3-TTS-12Hz-0.6B-Base'))
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()

    script = Path(args.script)
    slug = script.stem
    out_dir = script.parent.parent / 'out'
    out_dir.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    meta, blocks = parse(script)
    if args.limit:
        blocks = blocks[:args.limit]
    ref_wav, ref_text = os.environ['PODCAST_REF_WAV'], os.environ['PODCAST_REF_TEXT']
    model_tag = Path(args.model).name

    def key(b):
        return hashlib.sha1(f'{model_tag}|{ref_text}|{b["spoken"]}'.encode()).hexdigest()[:16]

    todo = [b for b in blocks if not (CACHE / f'{key(b)}.wav').exists()]
    print(f'[plan] {len(blocks)} blocks, {len(todo)} to synthesize, {len(blocks) - len(todo)} cached', flush=True)
    if todo:
        import torch
        from qwen_tts import Qwen3TTSModel
        device = 'mps' if torch.backends.mps.is_available() and os.environ.get('QWEN_DEVICE', 'mps') == 'mps' else 'cpu'
        t0 = time.time()
        model = Qwen3TTSModel.from_pretrained(args.model, device_map=device, dtype=torch.float32)
        prompt = model.create_voice_clone_prompt(ref_audio=ref_wav, ref_text=ref_text, x_vector_only_mode=False)
        print(f'[load] {time.time() - t0:.1f}s on {device}', flush=True)
        for i, b in enumerate(todo):
            t1 = time.time()
            wavs, sr = model.generate_voice_clone(text=b['spoken'], language='Chinese', voice_clone_prompt=prompt)
            w = np.asarray(wavs[0], dtype=np.float32)
            sf.write(CACHE / f'{key(b)}.wav', w, sr)
            print(f'[synth {i + 1}/{len(todo)}] {len(b["spoken"])} chars -> {len(w) / sr:.1f}s in {time.time() - t1:.0f}s', flush=True)

    pieces, t, sr, manifest = [], 0.0, None, []
    for i, b in enumerate(blocks):
        w, sr_i = sf.read(CACHE / f'{key(b)}.wav', dtype='float32')
        sr = sr or sr_i
        gap = GAP_HEAD if (b['type'] == 'head' or (i + 1 < len(blocks) and blocks[i + 1]['type'] == 'head')) else GAP_PARA
        manifest.append({'type': b['type'], 'segs': b['segs'], 'spoken': b['spoken'],
                         'start': round(t, 3), 'end': round(t + len(w) / sr, 3), 'cache': key(b)})
        pieces.append(w)
        t += len(w) / sr
        if i + 1 < len(blocks):
            pieces.append(np.zeros(int(sr * gap), dtype=np.float32))
            t += gap
    sf.write(out_dir / f'{slug}.wav', np.concatenate(pieces), sr)
    (out_dir / f'{slug}.blocks.json').write_text(json.dumps({'meta': meta, 'sr': sr, 'duration': round(t, 3), 'blocks': manifest},
                                                            ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'[done] {out_dir / (slug + ".wav")} {t:.1f}s, {len(blocks)} blocks', flush=True)


if __name__ == '__main__':
    main()
