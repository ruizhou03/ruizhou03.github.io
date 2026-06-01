#!/usr/bin/env python3
"""同 sub_category 互链巡检：同一 sub_category 下 ≥3 篇笔记，每篇都应有「串读到 sibling」的入口。

提供入口的方式有两种，任一满足即算 OK：
  1. 正文里手写引用了某个 sibling（按 permalink 或 stem 匹配）；
  2. 该篇带 `course` 字段、且同 course 还有 ≥1 篇——此时 post.html 的
     「📚 同课程其他资料」自动侧栏会渲染并列出全部同课程资料（见 _layouts/post.html）。
     PDF-only 笔记没有正文可写手写互链，全靠这个自动侧栏，所以必须认账。

因此只 flag 真正拿不到导航入口的：既没手写互链、又没有同 course 兄弟（course 字段缺失
或本组内独一份）的孤儿。这个脚本不强制，但每天提醒一次。

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
COURSE_RE = re.compile(r'^course:\s*[“"]?([^”"\n]+?)[”"]?\s*$', re.M)


def split_fm(text):
    if not text.startswith("---"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    return text[3:end].lstrip("\n"), text[end + 4:]


def main():
    print(f"# 同 sub_category 互链巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 同一 sub_category 下 ≥3 篇笔记，每篇都应有串读入口（手写互链 或 同课程自动侧栏）。\n")

    if not SCAN_DIR.exists():
        print("（无 _notes/study/ 目录，跳过）", flush=True)
        return 0

    groups = defaultdict(list)   # sub_category -> [(rel, body, permalink, stem, course)]
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
            cm = COURSE_RE.search(fm)
            course = cm.group(1).strip() if cm else ""
            stem = fp.stem
            groups[sub].append((str(fp.relative_to(REPO)), body, permalink, stem, course))

    lonely = []   # (sub, rel, n_siblings)
    checked_groups = 0
    for sub, items in groups.items():
        if len(items) < 3:
            continue
        checked_groups += 1
        # 同 course 出现次数：≥2 时 post.html 的「同课程其他资料」自动侧栏会渲染
        course_count = defaultdict(int)
        for _, _, _, _, course in items:
            if course:
                course_count[course] += 1
        for rel, body, _, stem, course in items:
            # 入口①：自动侧栏（带 course 且同 course 还有 ≥1 篇兄弟）
            if course and course_count[course] >= 2:
                continue
            # 入口②：正文手写引用了某个 sibling 的 permalink / stem
            sib_keys = []
            for r2, _, perm2, stem2, _ in items:
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
