#!/usr/bin/env python3
"""触屏适配巡检：toolbox 小游戏里 `:hover { ... }` 必须包在 `@media (hover: hover) { ... }` 内。

不包的话，iOS / 安卓上触摸一下也会触发"鼠标 hover 态卡住"，按钮按完颜色不退，
体验非常糟糕。

实现：CSS 大致按花括号配对一遍，记录每行所处的 @media 嵌套层；任意 `:hover {` 不在
`@media (hover: hover)` 至少一层包裹之内 → 触发。

只扫 `toolbox/` 下的 `.html` 和 `.css`（站内游戏的 CSS 几乎都内联在 `<style>` 块里）。

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "toolbox"

HOVER_MEDIA_RE = re.compile(r"@media\s*\([^)]*hover\s*:\s*hover[^)]*\)\s*\{")
ANY_MEDIA_RE = re.compile(r"@media\b[^{]*\{")
HOVER_RULE_RE = re.compile(r":hover\b[^{]*\{")
COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)


def strip_comments(text):
    return COMMENT_RE.sub(" ", text)


def find_hover_violations(text):
    """返回 [(line_no, snippet)] —— 每个 :hover { 但不在 @media (hover: hover) 包裹内的位置。"""
    text = strip_comments(text)
    violations = []

    # 先找所有 @media (hover: hover) 的字符区间 (start, end)
    hover_media_ranges = []
    for m in HOVER_MEDIA_RE.finditer(text):
        start = m.end() - 1  # 指到 '{' 位置
        # 找配对的 '}' —— 简单大括号栈
        depth = 1
        i = start + 1
        while i < len(text) and depth > 0:
            c = text[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            i += 1
        end = i  # 越过 '}'
        hover_media_ranges.append((start, end))

    for m in HOVER_RULE_RE.finditer(text):
        pos = m.start()
        # 是否落在某个 hover-media 区间内？
        inside = any(s <= pos < e for s, e in hover_media_ranges)
        if inside:
            continue
        # 算行号
        line_no = text.count("\n", 0, pos) + 1
        # 取该行内容做提示
        line_start = text.rfind("\n", 0, pos) + 1
        line_end = text.find("\n", pos)
        snippet = text[line_start:line_end if line_end != -1 else len(text)].strip()
        violations.append((line_no, snippet))
    return violations


def main():
    print(f"# 触屏 hover 适配巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> toolbox 小游戏里所有 `:hover { ... }` 都应包在 `@media (hover: hover) { ... }` 内，"
          "否则触摸设备会卡住 hover 态。\n")

    if not ROOT.exists():
        print("（无 toolbox/ 目录，跳过）", flush=True)
        return 0

    bad = []  # (rel, [(line, snippet)])
    for root, _, files in os.walk(ROOT):
        for fn in sorted(files):
            if not (fn.endswith(".html") or fn.endswith(".css")):
                continue
            fp = Path(root) / fn
            try:
                text = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            v = find_hover_violations(text)
            if v:
                bad.append((str(fp.relative_to(REPO)), v))

    if not bad:
        print("✅ 所有 `:hover` 都已用 `@media (hover: hover)` 守卫。", flush=True)
        return 0

    total = sum(len(v) for _, v in bad)
    print(f"## 缺 `@media (hover: hover)` 守卫 —— {len(bad)} 个文件 / {total} 处\n")
    for rel, v in bad:
        print(f"\n### `{rel}`（{len(v)} 处）")
        for line, snip in v[:5]:
            print(f"- L{line}: `{snip}`")
        if len(v) > 5:
            print(f"- …另 {len(v) - 5} 处")

    return 0


if __name__ == "__main__":
    sys.exit(main())
