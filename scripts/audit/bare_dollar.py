#!/usr/bin/env python3
"""裸 $ 巡检：扫 `_notes/**/*.md` 正文，找未转义且不是 KaTeX 公式的 `$<数字>`。

站点同时启用了 KaTeX 数学渲染。markdown 里若同一段出现两个未转义的 `$`，
KaTeX 会把中间部分当作公式渲染，导致金额变成乱码或表达式被吞。修复方法是
写 `\\$`。

策略：
  - 跳过 YAML frontmatter、fenced code（```/~~~）、inline code、整行 HTML
  - `$` 前面是 `\\` → 已转义，跳过
  - `$` 后紧跟 `\\` → KaTeX 公式起点，跳到本行下一个未转义 `$`
  - `$` 后跟数字（含逗号/小数点/K/M/B）：
      * 数字消费完后，下一非空白字符是 `$ \\ ^ _ { }` → 仍是公式，跳过整段
      * 否则 → 视为裸金额，记一次缺陷

只报告，不写文件。修复用 `scripts/fix_dollar.py`。
"""
import os
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "_notes"


def split_frontmatter(text):
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return "", text
    lines = text.splitlines(keepends=True)
    end = None
    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            end = i
            break
    if end is None:
        return "", text
    return "".join(lines[: end + 1]), "".join(lines[end + 1 :])


def _find_closing_dollar(body, start, line_end):
    k = start
    while k < line_end:
        if body[k] == "$" and (k == 0 or body[k - 1] != "\\"):
            return k
        k += 1
    return -1


def count_bare_dollars(body):
    n = len(body)
    i = 0
    in_fence = False
    fence_marker = None
    hits = []

    def at_line_start(pos):
        return pos == 0 or body[pos - 1] == "\n"

    while i < n:
        ch = body[i]

        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] in " \t":
                j += 1
            if j < n and body[j] == "<" and j + 1 < n and (body[j + 1].isalpha() or body[j + 1] == "/"):
                line_end = body.find("\n", j)
                i = (line_end + 1) if line_end != -1 else n
                continue

        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] == " ":
                j += 1
            if body.startswith("```", j) or body.startswith("~~~", j):
                in_fence = True
                fence_marker = "```" if body.startswith("```", j) else "~~~"
                line_end = body.find("\n", j)
                i = (line_end + 1) if line_end != -1 else n
                continue

        if in_fence:
            if at_line_start(i):
                j = i
                while j < n and body[j] == " ":
                    j += 1
                if body.startswith(fence_marker, j):
                    line_end = body.find("\n", j)
                    i = (line_end + 1) if line_end != -1 else n
                    in_fence = False
                    fence_marker = None
                    continue
            i += 1
            continue

        if ch == "`":
            start = i
            while i < n and body[i] == "`":
                i += 1
            ticks = body[start:i]
            close_idx = body.find(ticks, i)
            if close_idx != -1:
                i = close_idx + len(ticks)
                continue
            continue

        if ch == "$":
            line_end_pos = body.find("\n", i)
            if line_end_pos == -1:
                line_end_pos = n

            if i > 0 and body[i - 1] == "\\":
                i += 1
                continue

            if i + 1 < n and body[i + 1] == "\\":
                close = _find_closing_dollar(body, i + 1, line_end_pos)
                if close != -1:
                    i = close + 1
                else:
                    i += 1
                continue

            j = i + 1
            while j < n and body[j] in " \t":
                j += 1
            if j < n and body[j].isdigit():
                k = j
                while k < n and (body[k].isdigit() or body[k] in ",."):
                    k += 1
                if k < n and body[k] in "KMBkmb":
                    k += 1
                # 启发式：$\d+/\d+$ 数学分数（e.g. $0/0$、$2/3$），跳过
                if k < n and body[k] == "/":
                    p = k + 1
                    while p < n and body[p].isdigit():
                        p += 1
                    if p > k + 1 and p < n and body[p] == "$":
                        i = p + 1
                        continue
                m = k
                while m < n and body[m] in " \t":
                    m += 1
                if m < n and body[m] in "$\\^_{}":
                    close = _find_closing_dollar(body, i + 1, line_end_pos)
                    if close != -1:
                        i = close + 1
                        continue
                line_no = body.count("\n", 0, i) + 1
                line_start = body.rfind("\n", 0, i) + 1
                line_end = body.find("\n", i)
                snippet = body[line_start:line_end if line_end != -1 else n].strip()
                hits.append((line_no, snippet))
                i += 1
                continue

            i += 1
            continue

        i += 1

    return hits


def main():
    print(f"# 裸 $ 金额巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> markdown 正文里 `$100` 这类未转义裸 `$` 会被 KaTeX 配对当公式渲染。"
          "用 `python3 scripts/fix_dollar.py <file>` 批量改成 `\\$`。\n")

    if not ROOT.exists():
        print("（无 _notes/ 目录，跳过）")
        return 0

    bad = []
    for root, _, files in os.walk(ROOT):
        for fn in sorted(files):
            if not fn.endswith(".md"):
                continue
            fp = Path(root) / fn
            try:
                text = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            _, body = split_frontmatter(text)
            hits = count_bare_dollars(body)
            if hits:
                bad.append((str(fp.relative_to(REPO)), hits))

    if not bad:
        print("✅ 没发现未转义的裸 `$` 金额。")
        return 0

    total = sum(len(v) for _, v in bad)
    print(f"## 未转义裸 `$` —— {len(bad)} 个文件 / {total} 处\n")
    for rel, hits in bad:
        print(f"\n### `{rel}`（{len(hits)} 处）")
        for line, snip in hits[:5]:
            print(f"- L{line}: `{snip[:120]}`")
        if len(hits) > 5:
            print(f"- …另 {len(hits) - 5} 处")

    return 0


if __name__ == "__main__":
    sys.exit(main())
