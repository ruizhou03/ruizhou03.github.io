#!/usr/bin/env python3
"""SEO/keywords 漏检：列出散文类文章里缺 `keywords:` 或 `keywords` 太薄（少于 3 项）的。

只看散文类（_notes/life, _notes/research, _notes/essays）；跳过：
- layout: recipe（菜谱有自己的 schema）
- 纯 PDF 存档（pdf_url 设了 + 正文几乎为空）

输出 markdown 报告到 stdout。不修改文件。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TARGETS = ["_notes/life", "_notes/research", "_notes/essays"]
MIN_KW = 3   # 少于 3 项算"太薄"


def split_fm(text):
    if not text.startswith("---"):
        return None, None
    end = text.find("\n---", 3)
    if end == -1:
        return None, None
    return text[3:end].lstrip("\n"), text[end + 4:]


def count_keywords(fm):
    # 先找 keywords: 行；可能是 inline 流式 `keywords: ["a","b"]`
    # 也可能是块式（下方 `- item`，支持缩进与否）
    lines = fm.splitlines()
    idx = next((i for i, l in enumerate(lines) if l.startswith("keywords:")), -1)
    if idx == -1:
        return None
    same_line = lines[idx][len("keywords:"):].strip()
    if same_line.startswith("["):
        return len([x for x in re.findall(r'"[^"]*"', same_line) if x.strip('"').strip()])
    # YAML 块式列表：支持缩进 `  - item` 与不缩进 `- item` 两种合法格式
    count = 0
    for l in lines[idx + 1:]:
        stripped = l.lstrip()
        if stripped.startswith("- "):
            count += 1
        elif stripped == "":
            continue
        else:
            break
    return count


def main():
    print(f"# Keywords 覆盖率巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)

    missing = []
    thin = []
    total = 0
    for d in TARGETS:
        base = REPO / d
        if not base.exists():
            continue
        for root, _, files in os.walk(base):
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
                if re.search(r"^layout:\s*recipe", fm, re.M):
                    continue
                if re.search(r"^pdf_url:", fm, re.M) and len(body.strip()) < 80:
                    continue
                total += 1
                kc = count_keywords(fm)
                rel = fp.relative_to(REPO)
                if kc is None:
                    missing.append(str(rel))
                elif kc < MIN_KW:
                    thin.append((str(rel), kc))

    print(f"散文类文章共 **{total}** 篇。", flush=True)
    if not missing and not thin:
        print("\n✅ 所有散文类文章 `keywords:` 充足。", flush=True)
        return 0

    if missing:
        print(f"\n## 🚫 完全缺 keywords —— {len(missing)} 篇\n")
        print("> 修复方法：跑 `python3 scripts/seed_keywords.py` 自动种子；或对单篇用 `/search-keywords` skill。\n")
        for p in missing:
            print(f"- {p}")

    if thin:
        print(f"\n## ⚠️ keywords 太薄（少于 {MIN_KW} 项）—— {len(thin)} 篇\n")
        for p, k in sorted(thin, key=lambda x: x[1]):
            print(f"- {p}（仅 {k} 项）")

    return 0


if __name__ == "__main__":
    sys.exit(main())
