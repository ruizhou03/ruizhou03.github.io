#!/usr/bin/env python3
"""发表前检查：对给定 .md 文件跑 4 项 inspection 并报告不合规项。

用法：
  python3 scripts/pre_publish_check.py <file.md>...     # 逐文件报告
  python3 scripts/pre_publish_check.py --staged           # 只看 git 暂存区 _notes/*.md

退出码：0 = 全部通过；1 = 有不合规项（含修复提示）。

覆盖的检查项（对齐 new-post skill 通用正文规则）：
  1. img-caption 内 markdown 残留（**粗体** / `代码` / [链接](url)）
  2. SVG <text> 含中文却 font-style="italic"
  3. 裸 http(s):// URL（未包 markdown link 或 autolink）
  4. 裸 $ 金额未转义（会被 KaTeX 当公式吃掉）
  5. CJK ↔ 拉丁/数字紧贴缺空格（盘古之白）

新文章发表前跑一遍，配合 new-post skill 的"写完后"步骤。
只报告、不修改（修复用 scripts/fix_*.py 对应工具）。
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


# ── 工具函数 ────────────────────────────────────────────
def split_frontmatter(text):
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return "", text
    lines = text.splitlines(keepends=True)
    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            return "".join(lines[: i + 1]), "".join(lines[i + 1 :])
    return "", text


def line_no(text, pos):
    return text.count("\n", 0, pos) + 1


# ── 检查 1: caption markdown 残留 ──────────────────────
CAPTION_RE = re.compile(
    r'<p\s+class=(["\'])img-caption\1[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)
MD_PATTERNS = [
    ("**粗体**", re.compile(r"\*\*[^*\n]+?\*\*")),
    ("__粗体__", re.compile(r"__[^_\n]+?__")),
    ("`代码`", re.compile(r"`[^`\n]+?`")),
    ("[链接](…)", re.compile(r"\[[^\]\n]+?\]\([^)\n]+?\)")),
]


def check_caption_md(body):
    hits = []
    for m in CAPTION_RE.finditer(body):
        inner = m.group(2)
        for label, pat in MD_PATTERNS:
            if pat.search(inner):
                ln = line_no(body, m.start())
                snip = m.group(0).replace("\n", " ⏎ ").strip()
                if len(snip) > 150:
                    snip = snip[:147] + "…"
                hits.append((ln, label, snip))
                break
    return hits


# ── 检查 2: SVG 中文斜体 ───────────────────────────────
SVG_RE = re.compile(r"<svg\b[^>]*>(.*?)</svg>", re.IGNORECASE | re.DOTALL)
TEXT_RE = re.compile(r"<text\b([^>]*)>(.*?)</text>", re.IGNORECASE | re.DOTALL)
ITALIC_ATTR = re.compile(r'font-style\s*=\s*(["\'])\s*italic\s*\1', re.IGNORECASE)
ITALIC_STYLE = re.compile(r"font-style\s*:\s*italic", re.IGNORECASE)
CJK_RE = re.compile(r"[㐀-鿿　-〿＀-￯]")


def check_svg_italic(body):
    hits = []
    for svg_m in SVG_RE.finditer(body):
        svg_start = svg_m.start()
        svg_open = body[svg_start : svg_start + body[svg_start:].find(">") + 1]
        svg_italic = bool(ITALIC_ATTR.search(svg_open) or ITALIC_STYLE.search(svg_open))
        for tm in TEXT_RE.finditer(svg_m.group(0)):
            attrs, inner = tm.group(1), tm.group(2)
            has_italic = svg_italic or bool(ITALIC_ATTR.search(attrs) or ITALIC_STYLE.search(attrs))
            if not has_italic or not CJK_RE.search(inner):
                continue
            ln = line_no(body, svg_start + tm.start())
            snip = inner.strip().replace("\n", " ")
            if len(snip) > 80:
                snip = snip[:77] + "…"
            hits.append((ln, snip))
    return hits


# ── 检查 3: 裸 URL ─────────────────────────────────────
URL_RE = re.compile(r"(?<![\(<\"'])https?://[^\s<>\)\]\"']+(?<![\.,;:!?])")
REF_LINK_RE = re.compile(r"^\s*\[[^\]]+\]:\s*https?://", re.MULTILINE)


def check_bare_url(body):
    hits = []
    in_fence = False
    fence_marker = None
    for idx, raw in enumerate(body.splitlines(), start=1):
        stripped = raw.lstrip()
        leading = raw[:len(raw) - len(stripped)]
        if len(leading) < 4:
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
        # 抹 inline code + markdown link + autolink
        scrub = raw
        scrub = re.sub(r"`[^`\n]*`", lambda m: " " * len(m.group(0)), scrub)
        scrub = re.sub(r"\]\(https?://[^\s\)]+\)", lambda m: " " * len(m.group(0)), scrub)
        scrub = re.sub(r"<https?://[^>\s]+>", lambda m: " " * len(m.group(0)), scrub)
        for m in URL_RE.finditer(scrub):
            url = m.group(0)
            snip = raw.strip()
            if len(snip) > 140:
                snip = snip[:137] + "…"
            hits.append((idx, url, snip))
    return hits


# ── 检查 4: 裸 $ 金额 ──────────────────────────────────
def _find_closing(body, start, end):
    k = start
    while k < end:
        if body[k] == "$" and (k == 0 or body[k - 1] != "\\"):
            return k
        k += 1
    return -1


def check_bare_dollar(body):
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
                    in_fence = False
                    fence_marker = None
                    continue
            i += 1
            continue
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
                ln = line_no(body, i)
                ls = body.rfind("\n", 0, i) + 1
                le2 = body.find("\n", i)
                snippet = body[ls:(le2 if le2 != -1 else n)].strip()
                hits.append((ln, snippet))
                i += 1; continue
            i += 1; continue
        i += 1
    return hits


# ── 检查 5: CJK ↔ 拉丁/数字紧贴 ─────────────────────────
_CJK = r"一-鿿㐀-䶿぀-ゟ゠-ヿ"
_LATIN = r"A-Za-z0-9"
CJK_LATIN_LEFT = re.compile(rf"([{_CJK}])([{_LATIN}])")
LATIN_CJK_RIGHT = re.compile(rf"([{_LATIN}])([{_CJK}])")


def _protect_masked(body):
    """掩掉不可改片段后做 CJK 空格检测（只报告，不改写）。"""
    chunks = []

    def push(m):
        chunks.append(m.group(0))
        return "\x00M{}\x00".format(len(chunks) - 1)

    # fenced code
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


def check_cjk_spacing(body):
    protected, _ = _protect_masked(body)
    hits = []
    for idx, raw in enumerate(body.splitlines(), start=1):
        p_idx = protected.splitlines()[min(idx - 1, len(protected.splitlines()) - 1)] if protected.splitlines() else raw
        for m in CJK_LATIN_LEFT.finditer(p_idx):
            hits.append((idx, m.start(), "缺空格 → 在汉字和数字/英文之间加空格"))
        for m in LATIN_CJK_RIGHT.finditer(p_idx):
            hits.append((idx, m.start(), "缺空格 → 在数字/英文和汉字之间加空格"))
    return hits


# ── 主入口 ──────────────────────────────────────────────
CHECKERS = [
    ("caption markdown 残留", check_caption_md, "把 ** 改成 <strong>、` 改成 <code>、[..](..) 改成 <a>"),
    ("SVG 中文斜体", check_svg_italic, "去掉 font-style=\"italic\"，中文用字号/颜色/加粗替代强调"),
    ("裸 URL", check_bare_url, "改成 [文字](url) 或 <url>"),
    ("裸 $ 金额", check_bare_dollar, "改成 \\$（如 \\$100），否则 KaTeX 会误匹配"),
    ("CJK 紧贴缺空格", check_cjk_spacing, "在汉字与英文/数字之间加半角空格"),
]


def check_file(path):
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return [(f"读取失败: {e}", [])]
    _, body = split_frontmatter(text)
    results = []
    for name, fn, hint in CHECKERS:
        hits = fn(body)
        results.append((name, hits, hint))
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--staged", action="store_true", help="只检查 git 暂存区的 _notes/*.md")
    ap.add_argument("--ci", action="store_true", help="CI 模式：更简洁的单行输出")
    ap.add_argument("paths", nargs="*")
    args = ap.parse_args()

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
            print("✅ 暂存区没有 _notes/ 下的 .md 文件，跳过。")
            return 0
    elif args.paths:
        files = [(REPO / p).resolve() for p in args.paths]
    else:
        ap.print_help()
        return 1

    any_issues = False
    for fp in files:
        fp = fp.resolve()
        rel = str(fp.relative_to(REPO))
        results = check_file(fp)
        file_issues = [(name, h, hint) for name, h, hint in results if h]
        if not file_issues:
            if not args.ci:
                print(f"✅ {rel}  4 项检查全部通过")
            continue
        any_issues = True
        if args.ci:
            for name, hits, _ in file_issues:
                print(f"❌ {rel}  [{name}: {len(hits)} 处]")
        else:
            print(f"\n{'=' * 60}")
            print(f"📄 {rel}")
            print(f"{'=' * 60}")
            for name, hits, hint in file_issues:
                print(f"\n  ❌ {name}（{len(hits)} 处）→ {hint}")
                for h in hits[:5]:
                    # Format varies by checker; unpack best effort
                    parts = [str(x) for x in h]
                    if len(parts) >= 2:
                        print(f"    L{parts[0]}: {parts[-1][:120]}")
                    else:
                        print(f"    {parts[0][:120]}")
                if len(hits) > 5:
                    print(f"    …另 {len(hits) - 5} 处")

    if not any_issues:
        print("✅ 全部通过！", end="\n" if not args.ci else "")
        return 0

    print(f"\n{'─' * 40}")
    print("💡 修复工具:")
    print("  裸 $ 金额   →  python3 scripts/fix_dollar.py <file>")
    print("  CJK 空格    →  python3 scripts/fix_cjk_spacing.py <file> --write")
    print("  caption 等  →  手工改（参考上方提示）")
    print(f"{'─' * 40}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
