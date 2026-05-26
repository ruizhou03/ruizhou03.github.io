#!/usr/bin/env python3
"""中英文（CJK ↔ Latin/数字）紧贴空格补齐脚本。

排版约定（"盘古之白" 简化版）：CJK 与拉丁字母/阿拉伯数字相邻时插入半角空格。
本脚本默认 dry-run，能让你先看会改哪些再决定是否落盘（--write 真正写入）。

跳过：
  - YAML frontmatter
  - fenced code（``` / ~~~）
  - inline code（`...`）
  - HTML 起始的整行（避免破坏 SVG/<a>/<img> 等）
  - 数学公式 `$...$` / `$$...$$`
  - markdown link 文本与目标 `[text](url)`

只处理"两侧都是字符（不是标点）"的情况：CJK + Latin/数字 → CJK + 空格 + Latin/数字
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# 只匹配 CJK 表意字与假名，**不**含 CJK 标点（`，。、！？（）` 等）与全角拉丁。
# 否则会给"（2023"误加空格，把（变成"（ 2023"。
CJK = r"一-鿿㐀-䶿぀-ゟ゠-ヿ"
LATIN = r"A-Za-z0-9"

LEFT_RE = re.compile(rf"([{CJK}])([{LATIN}])")
RIGHT_RE = re.compile(rf"([{LATIN}])([{CJK}])")


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


# 把不可改的片段挖掉占位，结束时还原
PLACEHOLDER = "\x00CJK{}\x00"
RE_FENCE_LINE = re.compile(r"^(\s{0,3})(`{3,}|~{3,}).*$", re.MULTILINE)
RE_INLINE_CODE = re.compile(r"`[^`\n]+`")
RE_HTML_LINE = re.compile(r"^\s*<[^>]+>.*$", re.MULTILINE)
RE_MATH_BLOCK = re.compile(r"\$\$[\s\S]+?\$\$")
RE_MATH_INLINE = re.compile(r"(?<!\\)\$[^\$\n]+?(?<!\\)\$")
RE_LINK = re.compile(r"\[[^\]\n]+\]\([^)\n]+\)")
RE_AUTOLINK = re.compile(r"<https?://[^>\s]+>")


def protect(body):
    chunks = []

    def take(pattern):
        nonlocal body
        def sub(m):
            chunks.append(m.group(0))
            return PLACEHOLDER.format(len(chunks) - 1)
        body = pattern.sub(sub, body)

    # fenced code blocks（含起止 fence 行之间所有内容）：粗略匹配
    body = re.sub(
        r"(^|\n)((?:```|~~~)[^\n]*\n(?:.*?\n)??(?:```|~~~)[^\n]*)",
        lambda m: m.group(1) + PLACEHOLDER.format(len(chunks)) + (chunks.append(m.group(2)) or ""),
        body,
        flags=re.DOTALL,
    )
    take(RE_MATH_BLOCK)
    take(RE_MATH_INLINE)
    take(RE_LINK)
    take(RE_AUTOLINK)
    take(RE_HTML_LINE)
    take(RE_INLINE_CODE)
    return body, chunks


def restore(body, chunks):
    pat = re.compile(re.escape("\x00CJK") + r"(\d+)" + re.escape("\x00"))
    return pat.sub(lambda m: chunks[int(m.group(1))], body)


def add_spaces(body):
    new = LEFT_RE.sub(r"\1 \2", body)
    new = RIGHT_RE.sub(r"\1 \2", new)
    return new


def count_changes(before, after):
    return sum(1 for a, b in zip(before, after) if a != b) + abs(len(after) - len(before))


def process_file(path, write=False):
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return 0
    fm, body = split_frontmatter(text)
    protected, chunks = protect(body)
    spaced = add_spaces(protected)
    if spaced == protected:
        return 0
    restored = restore(spaced, chunks)
    changes = (LEFT_RE.findall(protected).__len__()) + (RIGHT_RE.findall(protected).__len__())
    if write:
        path.write_text(fm + restored, encoding="utf-8")
    return changes


def collect_all_md():
    return sorted((REPO / "_notes").rglob("*.md"))


def collect_staged():
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        cwd=REPO, capture_output=True, text=True, check=True,
    )
    files = []
    for line in out.stdout.splitlines():
        line = line.strip()
        if line.endswith(".md"):
            p = REPO / line
            if p.is_file():
                files.append(p)
    return files


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--staged", action="store_true")
    ap.add_argument("--write", action="store_true", help="真正落盘（默认 dry-run）")
    ap.add_argument("paths", nargs="*")
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

    total_changes = 0
    total_files = 0
    for f in files:
        c = process_file(f, write=args.write)
        if c > 0:
            total_files += 1
            total_changes += c
            rel = f.relative_to(REPO) if f.is_absolute() else f
            mark = "(dry-run) " if not args.write else ""
            print(f"  {mark}{rel}: ~{c} 处")

    verb = "将改" if not args.write else "已改"
    print(f"\n共 {total_files} 个文件 {verb} ~{total_changes} 处。")
    if not args.write and total_changes:
        print("（用 --write 真正落盘）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
