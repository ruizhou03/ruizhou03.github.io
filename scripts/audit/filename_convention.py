#!/usr/bin/env python3
"""文件名约定巡检：与某一年开课/考试绑定的 `files/<topic>/*.pdf` 应让人从文件名看出年份。

意图：避免同课多年份的试卷/讲义并存时搞混。**只有"绑定具体年份"的资料才需要年份**——
章节碎片、常青教程、样卷/作业汇总/讲义合订本这类本就没有单一年份的，强塞年份是臆造，
而且改名会连带改同名 .md 的 permalink（即线上 URL）、打断外链，得不偿失（2026-06-01
与用户确认：修规则、不 churn URL）。

判定一篇 OK 的条件（任一满足）：
  - 文件名 stem 里有 4 位年份（不限位置：`2025-final` / `mid-2020-en` 都算，年份可读即可）；
  - 在 `chapters/` 子目录下（整本讲义的拆分卷，是结构碎片不是独立档）；
  - 所在 topic 目录属常青/暂缓集合 EVERGREEN_DIRS（r 教程、GRE 备考、初升高手写笔记）；
  - basename 是 `Main.pdf`（各 topic 文件夹的主文件，按主题非按年份组织）；
  - 在 ACCEPTED_UNDATED 白名单里（已确认本就无单一年份的样卷 / 作业·演示汇总 / 讲义合订本）。

跳过：files/audio、images、_archive（非课程材料）、en（英文站独立体系）。

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "files"
SKIP_DIRS = {"audio", "images", "_archive", "en"}

# 常青/暂缓 topic 目录：内容不绑定具体开课年份，不要求年份后缀
EVERGREEN_DIRS = {"r-tutorials", "gre", "tutoring"}

# 已确认"本就无单一年份"的资料：跨学期样卷、作业/演示汇总、讲义合订本等。
# 它们不绑定某一年，且改名会动到线上 URL，故保留原名、计为合规。
ACCEPTED_UNDATED = {
    "files/corp-fin/mid-sample-1.pdf",
    "files/corp-fin/mid-sample-1-sol.pdf",
    "files/corp-fin/mid-sample-2.pdf",
    "files/corp-fin/mid-sample-2-sol.pdf",
    "files/corp-fin/mid-sample-3-sol.pdf",
    "files/corp-fin/mid-sample-4.pdf",
    "files/corp-fin/mid-sample-4-sol.pdf",
    "files/psy-stat-I/anova-R.pdf",
    "files/psy-stat-I/demo-summary.pdf",
    "files/psy-stat-I/hw-summary.pdf",
    "files/causal-id/robustness-check.pdf",
    "files/adv-metrics-psu/metrics-survival-guide.pdf",
    "files/adv-macro-psu/Macro.pdf",
    "files/adv-micro-psu/adv-micro-psu-lecture-notes.pdf",
    "files/monetary-econ/monetary-econ-hw-summary.pdf",
    "files/real-anal/hw-summary-with-sol.pdf",
    "files/tennis/tennis-exam-prep.pdf",
    # 常青讲义合订本/知识点梳理：按主题（非年份）组织，title 已含「讲义」/「知识点梳理」
    "files/linear-algebra/linear-algebra-strang.pdf",
    "files/mao-thought/mao-thought-principles.pdf",
    "files/marxism/marxism-principles.pdf",
    # 原创教材（8 Part / 42 章），按主题组织、无单一年份
    "files/econ-math-toolkit/econ-math-toolkit.pdf",
}

YEAR_SUFFIX_RE = re.compile(r"-(19|20)\d{2}$")
ANY_YEAR_RE = re.compile(r"(19|20)\d{2}")


def main():
    print(f"# 文件名约定巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 绑定具体年份的 `files/<topic>/*.pdf` 应让人从文件名看出年份；章节碎片/常青/合订本等豁免。\n")

    missing = []
    if not ROOT.exists():
        print("（无 files/ 目录，跳过）", flush=True)
        return 0

    for topic_dir in sorted(ROOT.iterdir()):
        if not topic_dir.is_dir() or topic_dir.name in SKIP_DIRS:
            continue
        if topic_dir.name in EVERGREEN_DIRS:
            continue
        for root, _, files in os.walk(topic_dir):
            # 章节拆分卷是结构碎片，按章不按年，不要求年份
            if "chapters" in Path(root).relative_to(ROOT).parts:
                continue
            for fn in sorted(files):
                if not fn.endswith(".pdf"):
                    continue
                stem = fn[:-4]
                # 年份在名字任意位置都算"可读年份" → 合规
                if ANY_YEAR_RE.search(stem):
                    continue
                if fn == "Main.pdf":
                    continue
                rel = str((Path(root) / fn).relative_to(REPO))
                if rel in ACCEPTED_UNDATED:
                    continue
                missing.append((rel, False))

    if not missing:
        print("✅ 绑定年份的 PDF 都能从文件名看出年份（章节/常青/合订本等已豁免）。", flush=True)
        return 0

    print(f"## 绑定具体年份却看不出年份的 PDF —— {len(missing)} 个\n")
    print("> 若确属某一年的试卷/讲义，建议名字里带上年份；若本就无单一年份，加进脚本 ACCEPTED_UNDATED。\n")
    for rel, _ in missing:
        print(f"- `{rel}`")

    return 0


if __name__ == "__main__":
    sys.exit(main())
