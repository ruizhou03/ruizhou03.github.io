#!/usr/bin/env python3
"""
align.py — 给 narrate.py 的产物逐块做强制对齐，生成前端逐字高亮用的时间轴。

输入：audio/out/<slug>.blocks.json（narrate.py 输出，含每块读法与在整篇里的起止秒数）
      ~/.cache/zircon-narration/<hash>.wav（分块音频）
输出：audio/out/<slug>.json
  { "v":1, "duration":秒, "blocks":[ {"t":"head|para", "s":起点厘秒, "r":[[显示文字, 起点厘秒], ...]} ] }
  · r 里每一项是一个高亮单元：一个汉字 / 一个英文词 / 一个 {显示|读法} 整体；标点与空格并入前一单元。
  · 前端规则：currentTime ≥ 起点 即算读过；点任一单元跳到它的起点。

在 qwenasr conda 环境里运行：
  python scripts/narration/align.py audio/out/zotero-setup.blocks.json
可选：--model <dir>（默认 ~/qwen-tts/models/Qwen3-ForcedAligner-0.6B）
"""
import argparse, json, re, sys, time
from pathlib import Path

CACHE = Path.home() / '.cache' / 'zircon-narration'
CJK = re.compile(r'[㐀-鿿豈-﫿]')
WORDCH = re.compile(r'[0-9A-Za-z㐀-鿿豈-﫿]')


def units_of(text):
    """把一段显示文字切成高亮单元的 (起, 止) 区间：汉字逐个、英文数字按词；标点空格挂到前一单元。"""
    spans, i, n = [], 0, len(text)
    while i < n:
        ch = text[i]
        if CJK.match(ch):
            spans.append([i, i + 1]); i += 1
        elif re.match(r'[0-9A-Za-z]', ch):
            j = i
            while j < n and re.match(r'[0-9A-Za-z._\-\'()]', text[j]) and not CJK.match(text[j]):
                j += 1
            spans.append([i, j]); i = j
        else:
            if spans:
                spans[-1][1] = i + 1
            else:
                spans.append([i, i + 1])
            i += 1
    return spans


def char_times(spoken, items):
    """把对齐器返回的 (文字, 起, 止) 逐项定位回 spoken 的字符下标，得到每个可读字符的起点秒数。"""
    times = [None] * len(spoken)
    low, pos = spoken.lower(), 0
    for it in items:
        tok = ''.join(c for c in it.text.lower() if WORDCH.match(c))
        if not tok:
            continue
        k = low.find(tok, pos)
        if k < 0 or k - pos > 40:            # 找不到或跳得太远就跳过这一项，后面内插补
            continue
        for j in range(k, k + len(tok)):
            times[j] = float(it.start_time)
        pos = k + len(tok)
    # 没对上的可读字符：线性内插在前后已知点之间
    known = [(i, t) for i, t in enumerate(times) if t is not None and WORDCH.match(spoken[i])]
    if not known:
        return times
    for i in range(len(spoken)):
        if times[i] is None:
            prev = [(a, t) for a, t in known if a < i]
            nxt = [(a, t) for a, t in known if a > i]
            if prev and nxt:
                (a, ta), (b, tb) = prev[-1], nxt[0]
                times[i] = ta + (tb - ta) * (i - a) / (b - a)
            else:
                times[i] = (prev[-1][1] if prev else nxt[0][1])
    return times


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('blocks_json')
    ap.add_argument('--model', default=str(Path.home() / 'qwen-tts/models/Qwen3-ForcedAligner-0.6B'))
    args = ap.parse_args()
    src = Path(args.blocks_json)
    data = json.loads(src.read_text(encoding='utf-8'))

    import torch
    from qwen_asr import Qwen3ForcedAligner
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    t0 = time.time()
    model = Qwen3ForcedAligner.from_pretrained(args.model, dtype=torch.float32, device_map=device)
    print(f'[load] {time.time() - t0:.1f}s on {device}', flush=True)

    out_blocks, misses = [], 0
    for bi, b in enumerate(data['blocks']):
        res = model.align(audio=str(CACHE / f'{b["cache"]}.wav'), text=b['spoken'], language='Chinese')
        items = res[0]
        ct = char_times(b['spoken'], items)
        runs, sp = [], 0                      # sp：当前显示片段在 spoken 里的起点
        for disp, spk in b['segs']:
            if disp == spk:
                for a, z in units_of(disp):
                    t = next((ct[sp + j] for j in range(a, z) if ct[sp + j] is not None and WORDCH.match(spk[j])), None)
                    runs.append([disp[a:z], t])
            else:
                ts = [ct[sp + j] for j in range(len(spk)) if ct[sp + j] is not None and WORDCH.match(spk[j])]
                runs.append([disp, min(ts) if ts else None])
            sp += len(spk)
        # 起点缺失的单元（纯标点开头等）沿用前一单元；保证单调不减
        last = 0.0
        for r in runs:
            if r[1] is None:
                r[1] = last; misses += 1
            r[1] = max(r[1], last)
            last = r[1]
        off = b['start']
        out_blocks.append({'t': b['type'], 's': round(off * 100),
                           'r': [[txt, round((off + t) * 100)] for txt, t in runs]})
        print(f'[align {bi + 1}/{len(data["blocks"])}] {len(items)} items -> {len(runs)} units', flush=True)

    dst = src.with_name(src.name.replace('.blocks.json', '.json'))
    dst.write_text(json.dumps({'v': 1, 'duration': data['duration'], 'blocks': out_blocks}, ensure_ascii=False, separators=(',', ':')),
                   encoding='utf-8')
    print(f'[done] {dst} ({dst.stat().st_size // 1024} KB), {misses} units without own timestamp', flush=True)


if __name__ == '__main__':
    main()
