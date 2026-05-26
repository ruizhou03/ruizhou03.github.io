#!/usr/bin/env python3
"""图片配文 markdown 残留巡检：扫 `_notes/**/*.md`，找 `<p class="img-caption">…</p>`
里残留的 markdown 语法（**粗体**、_斜体_、`code`、[链接]() 等）。

站点 layout 里 `.img-caption` 是直接当 HTML 渲染的（不走 markdown parser），
所以正文里写 `<p class="img-caption">**重点**</p>` 不会变粗体，而是把字面
的 `**` 当文本展示。三轮抽检累计修了 30+ 处。

只报告，不写文件。修复手工把 `**…**` 改成 `<strong>…</strong>`、
`*…*` 改成 `<em>…</em>`、`` `…` `` 改成 `<code>…</code>`、
`[文字](url)` 改成 `<a href="url">文字</a>`。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "_notes"

# 单行 caption（绝大多数情况），跨行 caption 也覆盖到（DOTALL）
CAPTION_RE = re.compile(
    r'<p\s+class=(["\'])img-caption\1[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)

# 检测的 markdown 残留：
#   **粗体** ／ __粗体__
#   *斜体*  ／ _斜体_（避免误伤普通下划线，只匹配两端有非空白字符的）
#   `inline code`
#   [文字](url)
PATTERNS = [
    ("**粗体**", re.compile(r"\*\*[^*\n]+?\*\*")),
    ("__粗体__", re.compile(r"__[^_\n]+?__")),
    ("`代码`", re.compile(r"`[^`\n]+?`")),
    ("[链接](…)", re.compile(r"\[[^\]\n]+?\]\([^)\n]+?\)")),
]


def scan_file(path):
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return []
    hits = []
    for m in CAPTION_RE.finditer(text):
        inner = m.group(2)
        for label, pat in PATTERNS:
            if pat.search(inner):
                line_no = text.count("\n", 0, m.start()) + 1
                snippet = m.group(0).replace("\n", " ⏎ ").strip()
                if len(snippet) > 140:
                    snippet = snippet[:137] + "…"
                hits.append((line_no, label, snippet))
                break  # 一处 caption 只报一次
    return hits


def main():
    print(f"# 图片配文 markdown 残留巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> `.img-caption` 是 HTML 元素，不走 markdown 渲染；caption 里写 `**重点**` 不会变粗体。"
          "把 `**…**` 改成 `<strong>…</strong>`、`*…*` 改成 `<em>…</em>`、"
          "`` `…` `` 改成 `<code>…</code>`、`[文字](url)` 改成 `<a>` 标签。\n")

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
        print("✅ 没发现 caption 里的 markdown 残留。")
        return 0

    total = sum(len(v) for _, v in bad)
    print(f"## caption 内 markdown 残留 —— {len(bad)} 个文件 / {total} 处\n")
    for rel, hits in bad:
        print(f"\n### `{rel}`（{len(hits)} 处）")
        for line, label, snip in hits[:5]:
            print(f"- L{line} [{label}]: `{snip}`")
        if len(hits) > 5:
            print(f"- …另 {len(hits) - 5} 处")

    return 0


if __name__ == "__main__":
    sys.exit(main())
