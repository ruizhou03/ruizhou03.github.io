#!/usr/bin/env python3
"""裸 URL 巡检：扫 `_notes/**/*.md` 正文，找未被 markdown link 包裹也不在尖括号/
代码里的裸 `http(s)://...`。

CommonMark 把裸 URL 显示为字面文本（不会自动变链接）；规范写法是
`[文字](url)` 或 `<url>`（autolink）。所以正文里直接糊一串
`参见 https://example.com/foo` 既不可点也丑。

跳过：
  - YAML frontmatter
  - fenced code（``` / ~~~）
  - inline code（`...`）
  - 整行 HTML 标签所在行（含 `<a href>`、`<img src>` 等）
  - autolink `<https://...>`
  - 已经在 markdown link 里的 url：`[...](...)`、引用式 `[label]: url`

只报告，不写文件。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "_notes"

URL_RE = re.compile(r"(?<![\(<\"'])https?://[^\s<>\)\]\"']+(?<![\.,;:!?])")
REF_LINK_RE = re.compile(r"^\s*\[[^\]]+\]:\s*https?://", re.MULTILINE)
# defang 标记（安全示例里把 . 写成 [.]、把 http 写成 hxxp 等故意打断 autolink 的写法）
DEFANG_RE = re.compile(r"\[\.\]|\(\.\)|hxxps?://|\[http", re.IGNORECASE)


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


def strip_inline_code(line):
    out = []
    i = 0
    n = len(line)
    while i < n:
        if line[i] == "`":
            j = i + 1
            while j < n and line[j] != "`":
                j += 1
            if j < n:
                out.append(" " * (j - i + 1))
                i = j + 1
                continue
        out.append(line[i])
        i += 1
    return "".join(out)


def is_html_line(stripped):
    return stripped.startswith("<") and ("href=" in stripped or "src=" in stripped or stripped.endswith(">"))


def scan_body(body):
    hits = []
    in_fence = False
    fence_marker = None
    for idx, raw in enumerate(body.splitlines(), start=1):
        stripped = raw.lstrip()
        # fenced code 起止
        leading = raw[: len(raw) - len(stripped)]
        if len(leading) < 4:
            if stripped.startswith("```"):
                if not in_fence:
                    in_fence = True
                    fence_marker = "```"
                elif fence_marker == "```":
                    in_fence = False
                    fence_marker = None
                continue
            if stripped.startswith("~~~"):
                if not in_fence:
                    in_fence = True
                    fence_marker = "~~~"
                elif fence_marker == "~~~":
                    in_fence = False
                    fence_marker = None
                continue
        if in_fence:
            continue
        # 整行 HTML
        if is_html_line(stripped):
            continue
        # 引用式 link 定义 `[label]: url`
        if REF_LINK_RE.match(raw):
            continue
        # 整行含 defang 标记（[.] / (.) / hxxp 等）→ 是安全/钓鱼示例，整行所有 URL 都不算
        if DEFANG_RE.search(raw):
            continue
        # 抹掉 inline code 再判
        scrub = strip_inline_code(raw)
        # 抹掉已经在 markdown link 里的 url
        scrub = re.sub(r"\]\(https?://[^\s\)]+\)", lambda m: " " * len(m.group(0)), scrub)
        # 抹掉 autolink `<https://...>`
        scrub = re.sub(r"<https?://[^>\s]+>", lambda m: " " * len(m.group(0)), scrub)
        for m in URL_RE.finditer(scrub):
            url = m.group(0)
            # 容忍长度阈值 + 限速展示
            snippet = raw.strip()
            if len(snippet) > 140:
                snippet = snippet[:137] + "…"
            hits.append((idx, url, snippet))
    return hits


def main():
    print(f"# 裸 URL 巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 正文里 `参见 https://example.com/foo` 这样的裸 URL 不会自动变链接。"
          "建议改写成 `[文字](url)` 或 autolink `<url>`。\n")

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
            hits = scan_body(body)
            if hits:
                bad.append((str(fp.relative_to(REPO)), hits))

    if not bad:
        print("✅ 没发现裸 URL。")
        return 0

    total = sum(len(v) for _, v in bad)
    print(f"## 裸 URL —— {len(bad)} 个文件 / {total} 处\n")
    for rel, hits in bad:
        print(f"\n### `{rel}`（{len(hits)} 处）")
        for line, url, snip in hits[:5]:
            print(f"- L{line}: `{url}` — `{snip}`")
        if len(hits) > 5:
            print(f"- …另 {len(hits) - 5} 处")

    return 0


if __name__ == "__main__":
    sys.exit(main())
