#!/usr/bin/env python3
"""同 sub_category 互链巡检：同一 sub_category 下 ≥3 篇笔记应当至少互相引用一次。

动机：实分析 ch0–ch6 是同一门课的 7 篇章节笔记，causal-id 系列里 robustness-check
和 causal-id-2023 应该互相引用以方便读者跳转——目前往往各自孤立，读者读完一篇没
入口去读后续。这个脚本不强制，但每天提醒一次。

规则：
  - 按 sub_category 分组（只算 _notes/study/ 下）。
  - 同组 ≥3 篇时检查每篇是否引用了至少 1 个 sibling（按 sibling 的 permalink 或 stem 匹配）。
  - 没引用任何 sibling 的 → 列出。

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCAN_DIR = REPO / "_notes" / "study"

SUB_RE = re.compile(r'^sub_category:\s*[“"]?([^”"\n]+?)[”"]?\s*$', re.M)
PERMALINK_RE = re.compile(r'^permalink:\s*[“"]?([^”"\n]+?)[”"]?\s*$', re.M)


def split_fm(text):
    if not text.startswith("---"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    return text[3:end].lstrip("\n"), text[end + 4:]


def main():
    print(f"# 同 sub_category 互链巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 同一 sub_category 下 ≥3 篇笔记，每篇应至少互引一次 sibling，方便读者串读。\n")

    if not SCAN_DIR.exists():
        print("（无 _notes/study/ 目录，跳过）", flush=True)
        return 0

    groups = defaultdict(list)   # sub_category -> [(rel, body, permalink, stem)]
    for root, _, files in os.walk(SCAN_DIR):
        for fn in sorted(files):
            if not fn.endswith(".md"):
                continue
            fp = Path(root) / fn
            try:
                text = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            fm, body = split_fm(text)
            if fm is None:
                continue
            sm = SUB_RE.search(fm)
            if not sm:
                continue
            sub = sm.group(1).strip()
            pm = PERMALINK_RE.search(fm)
            permalink = pm.group(1).strip() if pm else ""
            stem = fp.stem
            groups[sub].append((str(fp.relative_to(REPO)), body, permalink, stem))

    lonely = []   # (sub, rel, n_siblings)
    checked_groups = 0
    for sub, items in groups.items():
        if len(items) < 3:
            continue
        checked_groups += 1
        # 每篇看 body 里有没有出现任何 sibling 的 permalink 或 stem
        for rel, body, _, stem in items:
            sib_keys = []
            for r2, _, perm2, stem2 in items:
                if r2 == rel:
                    continue
                if perm2:
                    sib_keys.append(perm2)
                sib_keys.append(stem2)
            hit = any(k and k in body for k in sib_keys)
            if not hit:
                lonely.append((sub, rel, len(items) - 1))

    if not lonely:
        print(f"✅ 已检查 **{checked_groups}** 个 ≥3 篇的 sub_category 组，全部已互链。", flush=True)
        return 0

    print(f"## 没引用任何 sibling 的笔记 —— {len(lonely)} 篇（{checked_groups} 个组检查）\n")
    by_sub = defaultdict(list)
    for sub, rel, nsib in lonely:
        by_sub[sub].append((rel, nsib))
    for sub in sorted(by_sub.keys()):
        rows = by_sub[sub]
        print(f"\n### `{sub}`（{len(rows)} 篇孤立 / 组内共 {rows[0][1] + 1} 篇 sibling）")
        for rel, _ in rows:
            print(f"- `{rel}`")

    return 0


if __name__ == "__main__":
    sys.exit(main())
