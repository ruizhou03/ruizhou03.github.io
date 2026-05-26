#!/usr/bin/env python3
"""PII 巡检：扫 _notes/ 下所有 markdown，列出含真实姓名 / 学校名 / 学号 的文件。

不是"必须修复"的清单。站主的散文/经验帖里很多是有意公开的（如 college-admission-essay
就是写本人录取经验，名字、学校都是必要素材）。这个脚本的目的是给一个清单，让站主在
新增笔记或抽检时看一眼"哪些文章泄露了 PII"，自己决定是保留还是脱敏。

匹配规则：
  - 姓名：明确的"周睿"全名（双字名前后用边界守卫，避免误把"周"/"睿"单字算上）。
  - 学校：三明二中 / 三明市第二中学 / 三明市二中（注意 "三明治"=sandwich 要排除）。
  - 学号：8–12 位连续阿拉伯数字（粗筛；会有日期等假阳性，标 ⚠️）。

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCAN_DIRS = ["_notes"]

# 排除 keywords/permalink 这类 front-matter 字段里的命中——这些是 SEO 关键词
# 不算真正"正文里有 PII"。我们只看正文有没有出现。
# 实现上：split 出 body 部分再 grep。

NAME_RE = re.compile(r"周睿")
SCHOOL_PATTERNS = [
    (re.compile(r"三明市第二中学"), "三明市第二中学"),
    (re.compile(r"三明二中"), "三明二中"),
    (re.compile(r"三明市二中"), "三明市二中"),
]
# 学号：8–12 位纯数字，前后不接其它数字
STUDENT_ID_RE = re.compile(r"(?<!\d)(\d{8,12})(?!\d)")
# 显然是日期 / 时间戳 / commit hash 的假阳性，过滤掉
DATE_LIKE_RE = re.compile(r"^(19|20)\d{6}$")


def split_fm(text):
    if not text.startswith("---"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    return text[3:end].lstrip("\n"), text[end + 4:]


def scan_file(fp: Path):
    try:
        text = fp.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None
    _, body = split_fm(text)
    hits = {"name": 0, "schools": [], "ids": []}
    hits["name"] = len(NAME_RE.findall(body))
    for rx, label in SCHOOL_PATTERNS:
        n = len(rx.findall(body))
        if n:
            hits["schools"].append((label, n))
    for m in STUDENT_ID_RE.finditer(body):
        s = m.group(1)
        if DATE_LIKE_RE.match(s):
            continue
        hits["ids"].append(s)
    if hits["name"] == 0 and not hits["schools"] and not hits["ids"]:
        return None
    return hits


def main():
    print(f"# PII 巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 含真实姓名 / 学校 / 学号 的文章清单。**不是必须修复项** —— "
          "如本人录取经验等场景这些是必要内容；站主据此自检即可。\n")

    findings = []
    for d in SCAN_DIRS:
        base = REPO / d
        if not base.exists():
            continue
        for root, _, files in os.walk(base):
            for fn in sorted(files):
                if not fn.endswith(".md"):
                    continue
                fp = Path(root) / fn
                h = scan_file(fp)
                if h:
                    findings.append((str(fp.relative_to(REPO)), h))

    if not findings:
        print("✅ 没扫出明显 PII。", flush=True)
        return 0

    print(f"扫出 **{len(findings)}** 篇文章含 PII 模式：\n")
    for rel, h in findings:
        parts = []
        if h["name"]:
            parts.append(f"姓名×{h['name']}")
        for s, n in h["schools"]:
            parts.append(f"{s}×{n}")
        if h["ids"]:
            sample = ", ".join(h["ids"][:3])
            extra = "" if len(h["ids"]) <= 3 else f" ...另 {len(h['ids'])-3} 个"
            parts.append(f"疑似学号×{len(h['ids'])}（{sample}{extra}）")
        print(f"- `{rel}` —— {'; '.join(parts)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
