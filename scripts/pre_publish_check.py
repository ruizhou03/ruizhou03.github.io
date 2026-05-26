#!/usr/bin/env python3
"""发表前检查 + 自动修复：对给定 .md 文件跑 5 项 inspection，--fix 自动修。

用法：
  python3 scripts/pre_publish_check.py <file.md>...     # 只报告
  python3 scripts/pre_publish_check.py <file.md> --fix   # 报告 + 自动修
  python3 scripts/pre_publish_check.py --staged           # 扫 git 暂存区 _notes/*.md
  python3 scripts/pre_publish_check.py --staged --fix     # 扫暂存区并自动修

退出码：0 = 全部通过（或已自动修复）；1 = 有无法自动修复的项。

检查项：
  1. img-caption 内 markdown 残留       → --fix: 自动转 HTML（**→<strong>、`→<code>、[..](..)→<a>）
  2. SVG <text> 中文 italic             → --fix: 自动去掉 font-style="italic"
  3. 裸 http(s):// URL                  → 不自动修（需人工判断链接文字）
  4. 裸 $ 金额                           → --fix: 自动转 \\$
  5. CJK ↔ 拉丁/数字紧贴缺空格            → --fix: 自动补空格
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


# ═══════════════════════════════════════════════════════════
# 工具
# ═══════════════════════════════════════════════════════════
def split_frontmatter(text):
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return "", text
    lines = text.splitlines(keepends=True)
    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            return "".join(lines[: i + 1]), "".join(lines[i + 1 :])
    return "", text


# ═══════════════════════════════════════════════════════════
# 1. caption markdown 残留
# ═══════════════════════════════════════════════════════════
CAPTION_RE = re.compile(
    r'<p\s+class=(["\'])img-caption\1[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)

# key = (pattern_to_find, find_label, fix_fn: str -> str)
_CAPTION_FIXES = [
    (re.compile(r"\*\*([^*\n]+?)\*\*"),      "**粗体**", lambda m: f"<strong>{m.group(1)}</strong>"),
    (re.compile(r"__([^_\n]+?)__"),           "__粗体__", lambda m: f"<strong>{m.group(1)}</strong>"),
    (re.compile(r"`([^`\n]+?)`"),             "`代码`",   lambda m: f"<code>{m.group(1)}</code>"),
    (re.compile(r"\[([^\]\n]+?)\]\(([^)\n]+?)\)"), "[链接](url)", lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>'),
]


def check_caption_md(body):
    hits = []
    for m in CAPTION_RE.finditer(body):
        inner = m.group(2)
        for pat, label, _ in _CAPTION_FIXES:
            if pat.search(inner):
                ln = body.count("\n", 0, m.start()) + 1
                snip = m.group(0).replace("\n", " ⏎ ").strip()
                hits.append((ln, label, snip[:150]))
                break
    return hits


def fix_caption_md(body):
    def _fix_one(m):
        inner = m.group(2)
        for pat, _, fn in _CAPTION_FIXES:
            inner = pat.sub(fn, inner)
        return m.group(0).replace(m.group(2), inner)
    return CAPTION_RE.sub(_fix_one, body)


# ═══════════════════════════════════════════════════════════
# 2. SVG 中文斜体
# ═══════════════════════════════════════════════════════════
SVG_RE = re.compile(r"<svg\b[^>]*>(.*?)</svg>", re.IGNORECASE | re.DOTALL)
TEXT_RE = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.IGNORECASE | re.DOTALL)
ITALIC_ATTR = re.compile(r'font-style\s*=\s*(["\'])\s*italic\s*\1', re.IGNORECASE)
ITALIC_STYLE = re.compile(r"font-style\s*:\s*italic\s*;?", re.IGNORECASE)
CJK_RE = re.compile(r"[㐀-鿿　-〿＀-￯]")


def _has_italic(s):
    return bool(ITALIC_ATTR.search(s) or ITALIC_STYLE.search(s))


def check_svg_italic(body):
    hits = []
    for svg_m in SVG_RE.finditer(body):
        svg_start = svg_m.start()
        svg_open = body[svg_start : svg_start + body[svg_start:].find(">") + 1]
        svg_italic = _has_italic(svg_open)
        for tm in TEXT_RE.finditer(svg_m.group(0)):
            attrs, inner = tm.group(1), tm.group(2)
            if not (svg_italic or _has_italic(attrs)):
                continue
            if not CJK_RE.search(inner):
                continue
            ln = body.count("\n", 0, svg_start + tm.start()) + 1
            snip = inner.strip().replace("\n", " ")
            hits.append((ln, snip[:80]))
    return hits


def fix_svg_italic(body):
    def _fix_svg(m):
        svg_inner = m.group(1)
        def _fix_text(tm):
            attrs = tm.group(1)
            if not CJK_RE.search(tm.group(2)):
                return tm.group(0)
            if _has_italic(attrs):
                attrs = ITALIC_ATTR.sub("", attrs)
                attrs = ITALIC_STYLE.sub("", attrs)
                return f"<text{attrs}>{tm.group(2)}</text>"
            return tm.group(0)
        svg_inner = TEXT_RE.sub(_fix_text, svg_inner)
        svg_open = m.group(0)[:m.group(0).find(">") + 1]
        if _has_italic(svg_open):
            svg_open = ITALIC_ATTR.sub("", svg_open)
            svg_open = ITALIC_STYLE.sub("", svg_open)
            svg_inner = re.sub(r"</svg>$", "", svg_inner, flags=re.IGNORECASE)
            return svg_open + svg_inner
        return m.group(0).replace(m.group(1), svg_inner)
    return SVG_RE.sub(_fix_svg, body)


# ═══════════════════════════════════════════════════════════
# 3. 裸 URL —— 不自动修
# ═══════════════════════════════════════════════════════════
URL_RE = re.compile(r"(?<![\(<\"'])https?://[^\s<>\)\]\"']+(?<![\.,;:!?])")
REF_LINK_RE = re.compile(r"^\s*\[[^\]]+\]:\s*https?://", re.MULTILINE)


def check_bare_url(body):
    hits = []
    in_fence = False
    fence_marker = None
    for idx, raw in enumerate(body.splitlines(), start=1):
        stripped = raw.lstrip()
        lead = raw[: len(raw) - len(stripped)]
        if len(lead) < 4:
            if stripped.startswith("```"):
                if not in_fence:
                    in_fence = True; fence_marker = "```"
                elif fence_marker == "```":
                    in_fence = False; fence_marker = None
                continue
            if stripped.startswith("~~~"):
                if not in_fence:
                    in_fence = True; fence_marker = "~~~"
                elif fence_marker == "~~~":
                    in_fence = False; fence_marker = None
                continue
        if in_fence:
            continue
        if stripped.startswith("<") and ("href=" in stripped or "src=" in stripped or stripped.endswith(">")):
            continue
        if REF_LINK_RE.match(raw):
            continue
        scrub = raw
        scrub = re.sub(r"`[^`\n]*`", lambda m: " " * len(m.group(0)), scrub)
        scrub = re.sub(r"\]\(https?://[^\s\)]+\)", lambda m: " " * len(m.group(0)), scrub)
        scrub = re.sub(r"<https?://[^>\s]+>", lambda m: " " * len(m.group(0)), scrub)
        for m in URL_RE.finditer(scrub):
            snip = raw.strip()[:140]
            hits.append((idx, m.group(0), snip))
    return hits


# ═══════════════════════════════════════════════════════════
# 4. 裸 $ 金额
# ═══════════════════════════════════════════════════════════
def _find_closing(body, start, end):
    k = start
    while k < end:
        if body[k] == "$" and (k == 0 or body[k - 1] != "\\"):
            return k
        k += 1
    return -1


def check_bare_dollar(body):
    hits = []
    n = len(body)
    i = 0
    in_fence = False
    fence_marker = None

    def at_line_start(pos):
        return pos == 0 or body[pos - 1] == "\n"

    while i < n:
        ch = body[i]
        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] in " \t":
                j += 1
            if j < n and body[j] == "<" and j + 1 < n and (body[j + 1].isalpha() or body[j + 1] == "/"):
                le = body.find("\n", j)
                i = (le + 1) if le != -1 else n
                continue
        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] == " ":
                j += 1
            if body.startswith("```", j) or body.startswith("~~~", j):
                in_fence = True
                fence_marker = "```" if body.startswith("```", j) else "~~~"
                le = body.find("\n", j)
                i = (le + 1) if le != -1 else n
                continue
        if in_fence:
            if at_line_start(i):
                j = i
                while j < n and body[j] == " ":
                    j += 1
                if body.startswith(fence_marker, j):
                    le = body.find("\n", j)
                    i = (le + 1) if le != -1 else n
                    in_fence = False; fence_marker = None
                    continue
            i += 1; continue
        if ch == "`":
            ticks = ch
            while i + 1 < n and body[i + 1] == "`":
                i += 1; ticks += "`"
            ci = body.find(ticks, i + 1)
            i = ci + len(ticks) if ci != -1 else i + 1
            continue
        if ch == "$":
            le = body.find("\n", i)
            if le == -1:
                le = n
            if i > 0 and body[i - 1] == "\\":
                i += 1; continue
            if i + 1 < n and body[i + 1] == "\\":
                cl = _find_closing(body, i + 1, le)
                i = cl + 1 if cl != -1 else i + 1
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
                    cl = _find_closing(body, i + 1, le)
                    if cl != -1:
                        i = cl + 1; continue
                ln = body.count("\n", 0, i) + 1
                ls = body.rfind("\n", 0, i) + 1
                le2 = body.find("\n", i)
                snippet = body[ls:(le2 if le2 != -1 else n)].strip()
                hits.append((ln, snippet))
                i += 1; continue
            i += 1; continue
        i += 1
    return hits


def fix_bare_dollar(body):
    """按字符遍历，把裸 $<数字> 改成 \\$<数字>"""
    out = []
    i = 0
    n = len(body)
    in_fence = False; fence_marker = None

    def at_line_start(pos):
        return pos == 0 or body[pos - 1] == "\n"

    while i < n:
        ch = body[i]

        # skip HTML-only lines
        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] in " \t":
                j += 1
            if j < n and body[j] == "<" and j + 1 < n and (body[j + 1].isalpha() or body[j + 1] == "/"):
                le = body.find("\n", j)
                if le != -1:
                    out.append(body[i:le + 1]); i = le + 1
                else:
                    out.append(body[i:]); i = n
                continue

        # fence enter/exit
        if at_line_start(i) and not in_fence:
            j = i
            while j < n and body[j] == " ":
                j += 1
            if body.startswith("```", j) or body.startswith("~~~", j):
                in_fence = True
                fence_marker = "```" if body.startswith("```", j) else "~~~"
                le = body.find("\n", j)
                if le != -1:
                    out.append(body[i:le + 1]); i = le + 1
                else:
                    out.append(body[i:]); i = n
                continue
        if in_fence:
            if at_line_start(i):
                j = i
                while j < n and body[j] == " ":
                    j += 1
                if body.startswith(fence_marker, j):
                    le = body.find("\n", j)
                    if le != -1:
                        out.append(body[i:le + 1]); i = le + 1
                    else:
                        out.append(body[i:]); i = n
                    in_fence = False; fence_marker = None
                    continue
            out.append(ch); i += 1; continue

        # inline code: pass through
        if ch == "`":
            j = i
            while j < n and body[j] == "`":
                j += 1
            ticks = body[i:j]
            ci = body.find(ticks, j)
            if ci != -1:
                out.append(body[i:ci + len(ticks)]); i = ci + len(ticks)
            else:
                out.append(ticks); i = j
            continue

        if ch == "$":
            if i > 0 and body[i - 1] == "\\":
                out.append(ch); i += 1; continue
            le = body.find("\n", i)
            if le == -1:
                le = n
            if i + 1 < n and body[i + 1] == "\\":
                cl = _find_closing(body, i + 1, le)
                if cl != -1:
                    out.append(body[i:cl + 1]); i = cl + 1
                else:
                    out.append(ch); i += 1
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
                    cl = _find_closing(body, i + 1, le)
                    if cl != -1:
                        out.append(body[i:cl + 1]); i = cl + 1; continue
                out.append("\\$"); i += 1; continue
            out.append(ch); i += 1; continue
        out.append(ch); i += 1
    return "".join(out)


# ═══════════════════════════════════════════════════════════
# 5. CJK ↔ 拉丁/数字紧贴
# ═══════════════════════════════════════════════════════════
_CJK = r"一-鿿㐀-䶿぀-ゟ゠-ヿ"
_LATIN = r"A-Za-z0-9"
CJK_LATIN_LEFT = re.compile(rf"([{_CJK}])([{_LATIN}])")
LATIN_CJK_RIGHT = re.compile(rf"([{_LATIN}])([{_CJK}])")


def _mask_unfixable(body):
    """掩掉不可改的片段（fenced code, math, links, HTML, inline code），
    避免在公式/代码里乱加空格。返回 (masked_body, 原始片段列表)。"""
    chunks = []

    def push(m):
        chunks.append(m.group(0))
        return "\x00M{}\x00".format(len(chunks) - 1)

    body = re.sub(
        r"(^|\n)((?:```|~~~)[^\n]*\n(?:.*?\n)??(?:```|~~~)[^\n]*)",
        lambda m: m.group(1) + push(m), body, flags=re.DOTALL,
    )
    for pat in [
        re.compile(r"\$\$[\s\S]+?\$\$"),
        re.compile(r"(?<!\\)\$[^\$\n]+?(?<!\\)\$"),
        re.compile(r"\[[^\]\n]+\]\([^)\n]+\)"),
        re.compile(r"<https?://[^>\s]+>"),
        re.compile(r"^\s*<[^>]+>.*$", re.MULTILINE),
        re.compile(r"`[^`\n]+`"),
    ]:
        body = pat.sub(push, body)
    return body, chunks


def _restore(body, chunks):
    return re.compile(re.escape("\x00M") + r"(\d+)" + re.escape("\x00")).sub(
        lambda m: chunks[int(m.group(1))], body,
    )


def check_cjk_spacing(body):
    protected, _ = _mask_unfixable(body)
    hits = []
    for idx, raw in enumerate(body.splitlines(), start=1):
        plines = protected.splitlines()
        p_idx = plines[min(idx - 1, len(plines) - 1)] if plines else raw
        for m in CJK_LATIN_LEFT.finditer(p_idx):
            hits.append((idx, m.start(), "汉字紧贴英文/数字"))
        for m in LATIN_CJK_RIGHT.finditer(p_idx):
            hits.append((idx, m.start(), "英文/数字紧贴汉字"))
    return hits


def fix_cjk_spacing(body):
    protected, chunks = _mask_unfixable(body)
    new = CJK_LATIN_LEFT.sub(r"\1 \2", protected)
    new = LATIN_CJK_RIGHT.sub(r"\1 \2", new)
    return _restore(new, chunks)


# ═══════════════════════════════════════════════════════════
# 主逻辑
# ═══════════════════════════════════════════════════════════
CHECKERS = [
    # (name, check_fn, fix_fn, auto_fixable)
    ("caption markdown 残留", check_caption_md, fix_caption_md, True),
    ("SVG 中文斜体",          check_svg_italic, fix_svg_italic, True),
    ("裸 URL",               check_bare_url,   None,            False),
    ("裸 $ 金额",             check_bare_dollar, fix_bare_dollar, True),
    ("CJK 紧贴缺空格",        check_cjk_spacing, fix_cjk_spacing, True),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--staged", action="store_true", help="只检查 git 暂存区 _notes/*.md")
    ap.add_argument("--fix", action="store_true", help="自动修复可修复的问题")
    ap.add_argument("paths", nargs="*")
    args = ap.parse_args()
    FIX = args.fix

    if args.staged:
        out = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            cwd=REPO, capture_output=True, text=True, check=True,
        )
        files = []
        for line in out.stdout.splitlines():
            line = line.strip()
            if line.startswith("_notes/") and line.endswith(".md"):
                p = REPO / line
                if p.is_file():
                    files.append(p)
        if not files:
            return 0
    elif args.paths:
        files = [(REPO / p).resolve() for p in args.paths]
    else:
        ap.print_help()
        return 1

    any_issues = False
    for fp in files:
        fp = fp.resolve()
        try:
            rel = str(fp.relative_to(REPO))
        except ValueError:
            rel = str(fp)
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            print(f"❌ {rel}  读取失败: {e}")
            any_issues = True
            continue

        fm, body = split_frontmatter(text)

        for name, check_fn, fix_fn, auto in CHECKERS:
            hits = check_fn(body)
            if not hits:
                continue
            if FIX and auto and fix_fn:
                body = fix_fn(body)
                print(f"🔧 {rel}  [{name}: {len(hits)} 处 → 已自动修复]")
                continue
            any_issues = True
            print(f"❌ {rel}  [{name}: {len(hits)} 处{'（需手动改）' if not auto else ''}]")
            for h in hits[:3]:
                parts = [str(x) for x in h]
                print(f"    L{parts[0]}: {parts[-1][:120]}")
            if len(hits) > 3:
                print(f"    …另 {len(hits) - 3} 处")

        if FIX and body != split_frontmatter(text)[1]:
            fp.write_text(fm + body, encoding="utf-8")

    return 1 if any_issues else 0


if __name__ == "__main__":
    sys.exit(main())
