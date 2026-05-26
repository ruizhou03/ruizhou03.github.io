#!/usr/bin/env python3
"""
把 .md 文件正文里的「裸 $ 金额」转义为 `\\$`，避免 KaTeX 把成对 `$...$`
之间的金额识别为公式。

判定规则（按出现顺序处理 `$`）：
  - 前面是 `\\` → 已转义，保留
  - 后面紧跟 `\\` → KaTeX 公式起点，跳到本行下一个未转义 `$`
  - 后跟数字（可选空白）：
      * 数字序列消费完后，下一非空白字符是 `$ \\ ^ _ { }` → 仍是公式（如 `$0.447$` /
        `$2 \\times 2$`），跳到本行配对的 `$`
      * 否则 → 视为金额，把 `$` 改成 `\\$`
  - 其他 `$` 保留不动

跳过：
  - YAML frontmatter（首个 --- 到下一个 ---）
  - fenced code blocks（``` 或 ~~~）
  - inline code（行内 ` ... `）
  - 整行 HTML 标签所在行

用法：
  python3 scripts/fix_dollar.py --all             # 扫描 _notes/ 下全部 .md
  python3 scripts/fix_dollar.py --all --dry-run   # 预览：列出每文件将改多少处
  python3 scripts/fix_dollar.py --staged          # 只处理 git 暂存区的 .md
  python3 scripts/fix_dollar.py <path1> <path2>   # 显式指定文件
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return "", text
    lines = text.splitlines(keepends=True)
    if not lines or not lines[0].startswith("---"):
        return "", text
    end = None
    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            end = i
            break
    if end is None:
        return "", text
    fm = "".join(lines[: end + 1])
    body = "".join(lines[end + 1 :])
    return fm, body


def _find_closing_dollar(body: str, start: int, line_end: int) -> int:
    """从 start 起找本行内第一个未被 `\\` 转义的 `$`；找不到返回 -1。"""
    k = start
    while k < line_end:
        if body[k] == "$" and (k == 0 or body[k - 1] != "\\"):
            return k
        k += 1
    return -1


def convert_body(body: str) -> tuple[str, int]:
    out: list[str] = []
    i = 0
    n = len(body)
    changes = 0

    in_fence = False
    fence_marker = None

    def at_line_start(pos: int) -> bool:
        return pos == 0 or body[pos - 1] == "\n"

    while i < n:
        ch = body[i]

        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] in " \t":
                j += 1
            if j < n and body[j] == "<" and j + 1 < n and (body[j + 1].isalpha() or body[j + 1] == "/"):
                line_end = body.find("\n", j)
                if line_end == -1:
                    line_end = n
                else:
                    line_end += 1
                out.append(body[i:line_end])
                i = line_end
                continue

        if at_line_start(i) and not in_fence:
            j = i
            leading_spaces = 0
            while j < n and body[j] == " " and leading_spaces < 4:
                j += 1
                leading_spaces += 1
            if leading_spaces < 4:
                if body.startswith("```", j):
                    in_fence = True
                    fence_marker = "```"
                    line_end = body.find("\n", j)
                    if line_end == -1:
                        line_end = n
                    else:
                        line_end += 1
                    out.append(body[i:line_end])
                    i = line_end
                    continue
                if body.startswith("~~~", j):
                    in_fence = True
                    fence_marker = "~~~"
                    line_end = body.find("\n", j)
                    if line_end == -1:
                        line_end = n
                    else:
                        line_end += 1
                    out.append(body[i:line_end])
                    i = line_end
                    continue

        if in_fence:
            if at_line_start(i):
                j = i
                leading_spaces = 0
                while j < n and body[j] == " " and leading_spaces < 4:
                    j += 1
                    leading_spaces += 1
                if leading_spaces < 4 and body.startswith(fence_marker, j):
                    k = j + len(fence_marker)
                    while k < n and body[k] in " \t":
                        k += 1
                    if k == n or body[k] == "\n":
                        line_end = body.find("\n", j)
                        if line_end == -1:
                            line_end = n
                        else:
                            line_end += 1
                        out.append(body[i:line_end])
                        i = line_end
                        in_fence = False
                        fence_marker = None
                        continue
            out.append(ch)
            i += 1
            continue

        if ch == "`":
            start = i
            while i < n and body[i] == "`":
                i += 1
            ticks = body[start:i]
            close_idx = body.find(ticks, i)
            if close_idx != -1:
                after = close_idx + len(ticks)
                out.append(body[start:after])
                i = after
                continue
            else:
                out.append(ticks)
                continue

        if ch == "$":
            line_end_pos = body.find("\n", i)
            if line_end_pos == -1:
                line_end_pos = n

            if i > 0 and body[i - 1] == "\\":
                out.append(ch)
                i += 1
                continue

            if i + 1 < n and body[i + 1] == "\\":
                close = _find_closing_dollar(body, i + 1, line_end_pos)
                if close != -1:
                    out.append(body[i : close + 1])
                    i = close + 1
                else:
                    out.append(ch)
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
                m = k
                while m < n and body[m] in " \t":
                    m += 1
                if m < n and body[m] in "$\\^_{}":
                    close = _find_closing_dollar(body, i + 1, line_end_pos)
                    if close != -1:
                        out.append(body[i : close + 1])
                        i = close + 1
                        continue
                out.append("\\$")
                changes += 1
                i += 1
                continue

            out.append(ch)
            i += 1
            continue

        out.append(ch)
        i += 1

    return "".join(out), changes


def process_file(path: Path, dry_run: bool = False) -> int:
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError) as e:
        print(f"  ! 跳过 {path}: {e}", file=sys.stderr)
        return 0

    fm, body = split_frontmatter(text)
    new_body, changes = convert_body(body)
    if changes == 0:
        return 0

    new_text = fm + new_body
    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return changes


def collect_all_md() -> list[Path]:
    notes_dir = REPO_ROOT / "_notes"
    return sorted(notes_dir.rglob("*.md"))


def collect_staged() -> list[Path]:
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    files = []
    for line in out.stdout.splitlines():
        line = line.strip()
        if line.endswith(".md"):
            p = REPO_ROOT / line
            if p.is_file():
                files.append(p)
    return files


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="scan _notes/ recursively")
    ap.add_argument("--staged", action="store_true", help="only staged .md files")
    ap.add_argument("--dry-run", action="store_true", help="preview, don't write")
    ap.add_argument("paths", nargs="*", help="explicit file paths")
    args = ap.parse_args()

    if args.all:
        files = collect_all_md()
    elif args.staged:
        files = collect_staged()
    elif args.paths:
        files = [Path(p) for p in args.paths]
    else:
        ap.print_help()
        return 1

    if not files:
        print("（没有需要处理的文件）")
        return 0

    total_changes = 0
    total_files = 0
    for f in files:
        c = process_file(f, dry_run=args.dry_run)
        if c > 0:
            total_files += 1
            total_changes += c
            rel = f.relative_to(REPO_ROOT) if f.is_absolute() else f
            mark = "(dry-run) " if args.dry_run else ""
            print(f"  {mark}{rel}: {c} 处")

    verb = "将改" if args.dry_run else "已改"
    print(f"\n共 {total_files} 个文件 {verb} {total_changes} 处。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
