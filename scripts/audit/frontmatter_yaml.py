#!/usr/bin/env python3
"""front-matter YAML 合法性巡检：扫 `_notes/**/*.md`，把每篇 `---` 之间的
front-matter 喂给 yaml.safe_load，凡是抛 YAMLError 的全报出来。

最常见的坑是双引号字段值里嵌了 ASCII 直引号 `"`，YAML 解析到第一个内嵌
`"` 就把字符串提前截断，整篇 front-matter 失效，Jekyll 静默丢掉
title / permalink / date，文章在 timemachine 之类的索引里就会显示 null。
2026-05-26 在 vpn-setup-ios.md 的 outdated_note 里就翻过这个车。

只报告，不写文件。修复方式：
- 用单引号包：`outdated_note: '...里面可以放 "ASCII 双引号" ...'`
- 或 YAML 块标量：`outdated_note: |` 然后换行写正文
- 或把内嵌的 ASCII `"` 改成中文弯引号 `"` `"`
"""
import os
import re
import sys
import time
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "_notes"

FM_RE = re.compile(r"\A---\n(.*?)\n---\s*\n", re.DOTALL)


def scan_file(path):
    """返回 (fm_lines_count, error_msg) 或 None（front-matter 合法 / 无 front-matter）"""
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        return (0, f"读文件失败：{e}")
    m = FM_RE.match(text)
    if not m:
        return None
    fm = m.group(1)
    try:
        yaml.safe_load(fm)
    except yaml.YAMLError as e:
        # PyYAML 的错误 message 里通常带行号定位
        msg = str(e).strip().replace("\n", " ⏎ ")
        if len(msg) > 280:
            msg = msg[:277] + "…"
        return (fm.count("\n") + 1, msg)
    return None


def main():
    print(f"# front-matter YAML 合法性巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> front-matter 解析失败时 Jekyll 静默丢掉 title / permalink / date，"
          "文章会在 timemachine 等索引里以 null 标题、默认 permalink 出现。"
          "最常见的坑是 `\"...\"` 字段值里嵌了 ASCII 直引号 `\"`。\n")

    if not ROOT.exists():
        print("（无 _notes/ 目录，跳过）")
        return 0

    bad = []
    for root, _, files in os.walk(ROOT):
        for fn in sorted(files):
            if not fn.endswith(".md"):
                continue
            fp = Path(root) / fn
            r = scan_file(fp)
            if r is not None:
                bad.append((str(fp.relative_to(REPO)), r))

    if not bad:
        print("✅ 没发现 front-matter YAML 解析错误。")
        return 0

    print(f"## YAML 解析失败 —— {len(bad)} 个文件\n")
    for rel, (lines, msg) in bad:
        print(f"\n### `{rel}`（front-matter {lines} 行）")
        print(f"- {msg}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
