#!/usr/bin/env python3
"""文件名约定巡检：`files/<topic>/*.pdf` 应在 basename 末尾带 `-YYYY` 年份后缀。

约定来自实际仓库样本：
  files/real-anal/real-anal-ch0-2024.pdf  ✓
  files/causal-id/causal-id-2023.pdf       ✓
  files/causal-id/robustness-check.pdf     ✗ ← 该巡检会触发

意图：让 PDF 直接看文件名就能知道年份，避免后续维护时多份并存搞混。

跳过：
  - files/audio/、files/images/、files/_archive/：非课程材料
  - files/en/：英文站独立体系
  - 名字里已经含 4 位数字（包括无 dash 的，比如 2023final.pdf 也算）的，
    才严格匹配 `-YYYY.pdf` 后缀。

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

YEAR_SUFFIX_RE = re.compile(r"-(19|20)\d{2}$")
ANY_YEAR_RE = re.compile(r"(19|20)\d{2}")


def main():
    print(f"# 文件名约定巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> `files/<topic>/*.pdf` 文件名末尾应带 `-YYYY` 年份后缀。\n")

    missing = []
    if not ROOT.exists():
        print("（无 files/ 目录，跳过）", flush=True)
        return 0

    for topic_dir in sorted(ROOT.iterdir()):
        if not topic_dir.is_dir() or topic_dir.name in SKIP_DIRS:
            continue
        for root, _, files in os.walk(topic_dir):
            for fn in sorted(files):
                if not fn.endswith(".pdf"):
                    continue
                stem = fn[:-4]
                if YEAR_SUFFIX_RE.search(stem):
                    continue
                rel = str((Path(root) / fn).relative_to(REPO))
                has_year_inside = bool(ANY_YEAR_RE.search(stem))
                missing.append((rel, has_year_inside))

    if not missing:
        print("✅ 所有 PDF 都符合 `-YYYY.pdf` 命名约定。", flush=True)
        return 0

    print(f"## 缺 `-YYYY` 后缀 —— {len(missing)} 个\n")
    for rel, has_year in missing:
        if has_year:
            print(f"- `{rel}`  ← 名字内有 4 位数字但不是 `-YYYY.pdf` 形式，建议改名")
        else:
            print(f"- `{rel}`")

    return 0


if __name__ == "__main__":
    sys.exit(main())
