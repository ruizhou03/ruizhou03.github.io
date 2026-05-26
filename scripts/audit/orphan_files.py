#!/usr/bin/env python3
"""孤儿文件扫描：找出 files/ 下被站点完全不引用的文件。

动机：`files/<course>/` 子目录有 `_notes/study/<course>/` 的 md 约束，孤儿不易出现；
但 `files/en/`、`files/images/`、`files/audio/` 等"非课程"目录没有 schema 约束，
容易出现"上传了但忘了挂出去"的孤儿（如 2026-05-26 删的
`files/en/Grading Systems and Student Effort.pdf`：994KB、文件名带空格、被引用 0 处）。

扫描范围：默认 `files/`、`audio/` 下所有非 PDF-only-archive 文件（这块由 spotcheck 覆盖）。
引用判定：在 `_notes/`、`_layouts/`、`_includes/`、`docs/`、根目录所有 HTML/md/yml/json
里 grep 文件名 + 完整路径。两者都搜不到 = 孤儿。

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import subprocess
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# 哪些目录算"非课程目录"——需要扫孤儿
NON_COURSE_DIRS = [
    "files/en",
    "files/images",
    "files/audio",
    "files/podcasts",
    "audio",
]
# files/ 下"课程目录"——已经被 _notes/study/<course>/ md 的 pdf_url 字段约束，
# 孤儿主要由 spotcheck.py 的 pdf_archive 类型负责。这里默认跳过它们以减少噪音。
# 用户想全扫时可以传 --all 参数。

# 哪些目录里搜引用
SEARCH_ROOTS = [
    "_notes",
    "_layouts",
    "_includes",
    "_data",
    "docs",
    "life",
    "research",
    "essays",
    "en",
    "notes",
    "toolbox",
]
# 根目录单文件也要扫
ROOT_FILES = ["index.html", "_config.yml", "manifest.json", "sw.js"]

# 跳过哪些（搜索 corpus）
SKIP_DIRS = {"_site", ".jekyll-cache", ".audit-cache", ".git", "node_modules"}


def grep_repo(pattern: str) -> list[str]:
    """用 git grep 在已跟踪文件里找 pattern，返回匹配的文件路径列表。"""
    try:
        result = subprocess.run(
            ["git", "grep", "-lI", "--fixed-strings", pattern],
            cwd=REPO,
            capture_output=True,
            text=True,
            check=False,
        )
        return [line.strip() for line in result.stdout.splitlines() if line.strip()]
    except FileNotFoundError:
        return []


def collect_target_files(scan_all: bool) -> list[Path]:
    """收集需要检查的文件清单。"""
    targets = []
    if scan_all:
        for root, dirs, files in os.walk(REPO / "files"):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fn in files:
                if fn.startswith("."):
                    continue
                targets.append(Path(root) / fn)
    else:
        for rel in NON_COURSE_DIRS:
            base = REPO / rel
            if not base.exists():
                continue
            for root, dirs, files in os.walk(base):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for fn in files:
                    if fn.startswith("."):
                        continue
                    targets.append(Path(root) / fn)
    return targets


def is_orphan(fp: Path) -> tuple[bool, list[str]]:
    """判断一个文件是不是孤儿。返回 (是否孤儿, 被引用的文件路径列表)。"""
    rel = fp.relative_to(REPO)
    rel_str = str(rel)
    fname = fp.name

    # 自己引用自己不算（path == 文件本身路径在某些 tex/md 里会自引用）
    matches = set()
    # 尝试两种匹配：完整相对路径（带前导斜杠和不带）+ 仅文件名
    for needle in [
        rel_str,                         # files/en/cv.pdf
        "/" + rel_str,                   # /files/en/cv.pdf
        fname,                           # cv.pdf
    ]:
        for hit in grep_repo(needle):
            if hit == rel_str:
                continue  # 自引用
            matches.add(hit)

    return (len(matches) == 0, sorted(matches))


def human_bytes(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}" if unit == "B" else f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main():
    scan_all = "--all" in sys.argv

    print(f"# 孤儿文件扫描（{time.strftime('%Y-%m-%d %H:%M')}）\n")
    if scan_all:
        print("**范围**：`files/` 下全部文件（含课程目录，可能与 spotcheck 重合）")
    else:
        print(f"**范围**：非课程目录 {', '.join(f'`{d}`' for d in NON_COURSE_DIRS)}。课程目录由 spotcheck 的 pdf_archive 类型覆盖。")
    print()

    targets = collect_target_files(scan_all)
    if not targets:
        print("**无目标文件**（NON_COURSE_DIRS 都不存在或为空）。")
        return

    print(f"扫描 {len(targets)} 个文件……\n")

    orphans = []
    for fp in targets:
        ok, refs = is_orphan(fp)
        if ok:
            orphans.append((fp, fp.stat().st_size))

    print(f"---\n\n## 结果：{len(orphans)} 个孤儿\n")

    if not orphans:
        print("✅ 没发现孤儿文件。")
        return

    # 按大小排序，最大的最先看
    orphans.sort(key=lambda x: -x[1])

    print("| 文件 | 大小 | 备注 |")
    print("|------|------|------|")
    for fp, size in orphans:
        rel = fp.relative_to(REPO)
        notes = []
        if " " in str(rel):
            notes.append("⚠️ 文件名含空格")
        if size > 5 * 1024 * 1024:
            notes.append("⚠️ > 5MB")
        if fp.suffix == ".pdf":
            notes.append("可考虑 pdfslim")
        note_str = " · ".join(notes) if notes else "—"
        print(f"| `{rel}` | {human_bytes(size)} | {note_str} |")

    print()
    print("## 处理规则（写给 daily-review Claude）")
    print()
    print("每个孤儿都要逐项判断（**不要**自动批量删）：")
    print("- 是站主自己的内容（论文、CV、相册）→ 找到合适的页面挂出去")
    print("- 是别人的资料/已弃用版本 → 写进 DAILY_REVIEW 待办让站主拍板再删")
    print("- 文件名异味（含空格、大小写混乱）→ 顺便建议 git mv rename 成 kebab-case")
    print()
    print("注意：grep 是字符串匹配，可能漏检 base64/动态引用——**建议先 P2 待办、由人审一遍再删**。")


if __name__ == "__main__":
    main()
