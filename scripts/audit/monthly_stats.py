#!/usr/bin/env python3
"""月度内容统计：各分类发文数、最近一个月新增、字数分布、互动数据（如果后端可达）。

输出 markdown 报告到 stdout。不修改文件。

只在每月 1 号被 run.sh 调用，平时不跑（重复跑也没害处，只是浪费）。
"""
import os
import re
import sys
import time
import datetime
import urllib.request
import json
from pathlib import Path
from collections import Counter

REPO = Path(__file__).resolve().parents[2]
NOTES_ROOT = REPO / "_notes"

# 后端聚合接口（如有；不可达就跳过这段，不影响主体报告）
COMMENT_API = "https://zircon-comments.fly.dev/api/stats"
URGE_API = "https://zircon-urge.fly.dev/api/stats"


def split_fm(text):
    if not text.startswith("---"):
        return None, None
    end = text.find("\n---", 3)
    if end == -1:
        return None, None
    return text[3:end].lstrip("\n"), text[end + 4:]


def parse_date(fm):
    m = re.search(r"^date:\s*['\"]?(\d{4}-\d{2}-\d{2})", fm, re.M)
    if not m:
        return None
    try:
        return datetime.date.fromisoformat(m.group(1))
    except Exception:
        return None


def get_cat(fp: Path):
    rel = fp.relative_to(NOTES_ROOT).parts
    return rel[0] if rel else "?"


def get_subcat(fm):
    m = re.search(r"^sub_category:\s*[\"']?([^\"'\n]+)[\"']?", fm, re.M)
    return m.group(1).strip() if m else None


def try_fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "zirconeey-monthly-stats"})
        with urllib.request.urlopen(req, timeout=6) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        return {"_error": str(e)[:80]}


def main():
    today = datetime.date.today()
    print(f"# 月度内容统计（{today.strftime('%Y-%m-%d')}）\n")

    all_posts = []
    for root, _, files in os.walk(NOTES_ROOT):
        for fn in files:
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
            cat = get_cat(fp)
            sub = get_subcat(fm)
            dt = parse_date(fm)
            wc = len(re.sub(r"\s+", "", body))
            all_posts.append({"path": str(fp.relative_to(REPO)), "cat": cat, "sub": sub, "date": dt, "wc": wc})

    print(f"全站文章总数（_notes 下）：**{len(all_posts)}** 篇\n")

    # 分类统计
    cat_count = Counter(p["cat"] for p in all_posts)
    print("## 各一级分类发文数\n")
    for c, n in sorted(cat_count.items(), key=lambda x: -x[1]):
        print(f"- **{c}**: {n} 篇")
    print()

    # sub_category 分布（前 10）
    subs = Counter(p["sub"] for p in all_posts if p["sub"])
    if subs:
        print("## sub_category 热度 TOP 10\n")
        for s, n in subs.most_common(10):
            print(f"- {s}: {n}")
        print()

    # 本月新增
    month_start = today.replace(day=1)
    last_30 = today - datetime.timedelta(days=30)
    new_this_month = [p for p in all_posts if p["date"] and p["date"] >= month_start]
    new_last_30 = [p for p in all_posts if p["date"] and p["date"] >= last_30]
    print(f"## 本月新增 —— {len(new_this_month)} 篇\n")
    for p in sorted(new_this_month, key=lambda x: x["date"] or datetime.date.min, reverse=True)[:20]:
        print(f"- {p['date']} `{p['path']}` ({p['wc']} 字, {p['cat']})")
    if not new_this_month:
        print("（本月暂无新文章）")
    print(f"\n## 最近 30 天新增 —— {len(new_last_30)} 篇\n")

    # 字数分布
    if all_posts:
        wcs = sorted(p["wc"] for p in all_posts)
        print("## 字数分布\n")
        print(f"- 中位数: {wcs[len(wcs)//2]} 字")
        print(f"- 最长: {wcs[-1]} 字")
        print(f"- 最短: {wcs[0]} 字")
        print(f"- 平均: {sum(wcs)/len(wcs):.0f} 字")
        print()

    # 后端互动数据（best-effort）
    print("## 互动数据（后端聚合接口，可能未实现）\n")
    for label, url in [("评论", COMMENT_API), ("催更", URGE_API)]:
        data = try_fetch(url)
        if "_error" in data:
            print(f"- **{label}**：未能拉取 ({data['_error']})")
        else:
            print(f"- **{label}**：{json.dumps(data, ensure_ascii=False)}")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
