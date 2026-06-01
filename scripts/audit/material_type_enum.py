#!/usr/bin/env python3
"""material_type 枚举巡检：扫 _notes/ 所有 markdown，列出 material_type 取值不在合法枚举内的。

合法枚举分两类——

学术资料（模板 _layouts/post.html 有专属文案）：
    Notes      —— 学习笔记 / 整理 / 综述
    Exams      —— 试卷 / cheat sheet / 历年真题 / 期末复习
    Homework   —— 作业整理

非学术资料（人面分类标签，模板走 {% else %} 兜底，正常渲染）：
    课程测评 / 经验之谈 / 错题本 / 写作 / 词汇 / 口语

这些中文标签是有意为之、准确描述资料类型的展示值（课程测评本就是「课程测评」、
错题本本就是「错题本」），不是字段跑偏。docs/MAINTENANCE.md 的字段说明也认这套。
本脚本只 flag 不在这份白名单内的取值（用来抓真正的新增打字错，如「课程评测」、
单数「Note」），不自动改——具体改成哪个枚举值需要人判断。

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCAN_DIR = REPO / "_notes"

# 学术资料（模板有专属文案）+ 非学术人面分类标签（模板 {% else %} 兜底）
ENUM = {
    "Notes", "Exams", "Homework",
    "课程测评", "经验之谈", "错题本", "写作", "词汇", "口语",
}

# YAML 取值可能带普通双引号、中文弯引号、或裸字符串
MT_RE = re.compile(r'^material_type:\s*[“"]?([^”"\n]+?)[”"]?\s*$', re.M)


def main():
    print(f"# material_type 枚举巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print(f"> 合法枚举：`{', '.join(sorted(ENUM))}`。其他取值会被列出。\n")

    bad = []          # (rel, value, reason)
    by_value = {}     # value -> count

    if not SCAN_DIR.exists():
        print("（无 _notes/ 目录，跳过）", flush=True)
        return 0

    for root, _, files in os.walk(SCAN_DIR):
        for fn in sorted(files):
            if not fn.endswith(".md"):
                continue
            fp = Path(root) / fn
            try:
                text = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            m = MT_RE.search(text[:2000])  # 只读 front-matter 区
            if not m:
                continue
            val = m.group(1).strip()
            by_value[val] = by_value.get(val, 0) + 1
            if val in ENUM:
                continue
            reason = "弯引号包裹（应用直引号）" if "“" in m.group(0) or "”" in m.group(0) else "取值不在枚举内"
            bad.append((str(fp.relative_to(REPO)), val, reason))

    if not bad:
        print("✅ 所有 `material_type` 都在枚举内。", flush=True)
        # 仍然给一个分布表，方便回顾
        print("\n### 当前分布\n")
        for v, c in sorted(by_value.items(), key=lambda x: -x[1]):
            print(f"- `{v}` × {c}")
        return 0

    print(f"## 不合规 —— {len(bad)} 处\n")
    for rel, val, reason in bad:
        print(f"- `{rel}` —— `material_type: {val}`（{reason}）")

    print("\n### 全量分布（参考）\n")
    for v, c in sorted(by_value.items(), key=lambda x: -x[1]):
        mark = "✅" if v in ENUM else "⚠️"
        print(f"- {mark} `{v}` × {c}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
