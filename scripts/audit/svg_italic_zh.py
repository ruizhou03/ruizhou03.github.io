#!/usr/bin/env python3
"""SVG 中文斜体巡检：扫 `_notes/**/*.md`，找内嵌 SVG 里 `font-style="italic"`（或
`font-style: italic`）命中的 `<text>` 元素含中文字符的情况。

全站约定：中文一律不用斜体（CJK 字形没有真正的意大利体，浏览器只会画出歪斜
的合成假斜体，丑且难看）。三轮抽检累计修了 25+ 处。

只报告，不写文件。修复手工把对应 `<text>` 的 `font-style="italic"` 去掉，
或用其它视觉手段（颜色、字号、加粗）替代强调。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "_notes"

SVG_RE = re.compile(r"<svg\b[^>]*>(.*?)</svg>", re.IGNORECASE | re.DOTALL)
TEXT_RE = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.IGNORECASE | re.DOTALL)
ITALIC_ATTR = re.compile(r'font-style\s*=\s*(["\'])\s*italic\s*\1', re.IGNORECASE)
ITALIC_STYLE = re.compile(r"font-style\s*:\s*italic", re.IGNORECASE)
CJK_RE = re.compile(r"[㐀-鿿　-〿＀-￯]")

# parent <g>/<svg> 设了 font-style="italic" 也算继承命中
def parent_italic(svg_inner_with_ctx):
    return bool(ITALIC_ATTR.search(svg_inner_with_ctx) or ITALIC_STYLE.search(svg_inner_with_ctx))


def scan_file(path):
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []
    hits = []
    for svg_m in SVG_RE.finditer(text):
        svg_open_attrs = text[svg_m.start():svg_m.start() + text[svg_m.start():].find(">") + 1]
        svg_inherits = parent_italic(svg_open_attrs)
        for tm in TEXT_RE.finditer(svg_m.group(0)):
            attrs, inner = tm.group(1), tm.group(2)
            has_italic = svg_inherits or parent_italic(attrs)
            if not has_italic:
                continue
            if not CJK_RE.search(inner):
                continue
            abs_start = svg_m.start() + tm.start()
            line_no = text.count("\n", 0, abs_start) + 1
            snippet = inner.strip().replace("\n", " ")
            if len(snippet) > 80:
                snippet = snippet[:77] + "…"
            hits.append((line_no, snippet))
    return hits


def main():
    print(f"# SVG 中文斜体巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 全站约定：中文不用斜体。SVG `<text>` 上的 `font-style=\"italic\"` "
          "若文本含中文，浏览器会画出合成假斜体，请去掉斜体或改用别的强调方式。\n")

    if not ROOT.exists():
        print("（无 _notes/ 目录，跳过）")
        return 0

    bad = []
    for root, _, files in os.walk(ROOT):
        for fn in sorted(files):
            if not fn.endswith(".md"):
                continue
            fp = Path(root) / fn
            hits = scan_file(fp)
            if hits:
                bad.append((str(fp.relative_to(REPO)), hits))

    if not bad:
        print("✅ 没发现 SVG 中文斜体。")
        return 0

    total = sum(len(v) for _, v in bad)
    print(f"## SVG 中文 `font-style=italic` —— {len(bad)} 个文件 / {total} 处\n")
    for rel, hits in bad:
        print(f"\n### `{rel}`（{len(hits)} 处）")
        for line, snip in hits[:5]:
            print(f"- L{line}: `{snip}`")
        if len(hits) > 5:
            print(f"- …另 {len(hits) - 5} 处")

    return 0


if __name__ == "__main__":
    sys.exit(main())
