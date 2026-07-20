#!/usr/bin/env python3
"""月度运维快照：内容、公开互动、服务可用性与关键 GitHub Actions。

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
import subprocess
from pathlib import Path
from collections import Counter

REPO = Path(__file__).resolve().parents[2]
NOTES_ROOT = REPO / "_notes"

SITE_URL = "https://ruizhou03.com/"
COMMENT_URL = "https://zircon-comments.fly.dev/"
URGE_URL = "https://zircon-urge.fly.dev/api/urge"
REPO_SLUG = "ruizhou03/ruizhou03.github.io"


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
        with urllib.request.urlopen(req, timeout=12) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        return {"_error": str(e)[:80]}


def probe(url):
    """用 curl 记录 HTTP 状态和总耗时；失败也只写入报告。"""
    try:
        run = subprocess.run(
            ["curl", "-sS", "-L", "--max-time", "12", "-o", "/dev/null",
             "-w", "%{http_code} %{time_total}", url],
            capture_output=True, text=True, timeout=15,
        )
        if run.returncode != 0:
            return "失败", run.stderr.strip()[:80] or f"curl exit {run.returncode}"
        code, elapsed = run.stdout.strip().split(maxsplit=1)
        label = "正常" if code.startswith("2") else f"HTTP {code}"
        return label, f"{float(elapsed):.2f}s"
    except Exception as e:
        return "失败", f"{type(e).__name__}: {str(e)[:60]}"


def latest_workflow_run(workflow):
    """读取最近一次 Actions 运行；未安装/未登录 gh 时降级。"""
    try:
        run = subprocess.run(
            ["gh", "run", "list", "--repo", REPO_SLUG, "--workflow", workflow,
             "--limit", "1", "--json", "status,conclusion,createdAt,url,headSha"],
            capture_output=True, text=True, timeout=15,
        )
        if run.returncode != 0:
            return {"_error": run.stderr.strip()[:100] or f"gh exit {run.returncode}"}
        rows = json.loads(run.stdout)
        return rows[0] if rows else {"_error": "no runs"}
    except Exception as e:
        return {"_error": f"{type(e).__name__}: {str(e)[:80]}"}


def git_activity():
    try:
        run = subprocess.run(
            ["git", "-C", str(REPO), "rev-list", "--count", "--since=30 days ago", "HEAD"],
            capture_output=True, text=True, timeout=10, check=True,
        )
        return int(run.stdout.strip())
    except Exception:
        return None


def main():
    today = datetime.date.today()
    print(f"# 月度运维快照（{today.strftime('%Y-%m-%d')}）\n")
    print("本报告只读取公开接口、Git 历史和 GitHub Actions 元数据，不读取或输出任何密钥。\n")

    print("## 服务可用性\n")
    print("| 服务 | 状态 | 本次请求耗时 |")
    print("|---|---:|---:|")
    for label, url in [("主站", SITE_URL), ("账号 / 互动后端", URGE_URL), ("评论后端", COMMENT_URL)]:
        status, detail = probe(url)
        print(f"| {label} | {status} | {detail} |")
    print()

    print("## 自动化与恢复信号\n")
    for label, workflow in [("每周数据备份", "weekly-data-backup.yml"), ("Pages 构建检查", "pages-build-check.yml")]:
        run = latest_workflow_run(workflow)
        if "_error" in run:
            print(f"- **{label}**：未能读取（{run['_error']}）")
        else:
            result = run.get("conclusion") or run.get("status") or "unknown"
            sha = str(run.get("headSha") or "")[:8]
            print(f"- **{label}**：[{result}]({run.get('url', '')})，{run.get('createdAt', '?')}，commit `{sha}`")
    commits = git_activity()
    print(f"- **最近 30 天主仓库提交数**：{commits if commits is not None else '未能读取'}")
    print("- **人工复核项**：域名续费、账单、2FA / 恢复码、恢复联系人（见 `docs/OPERATIONS_INVENTORY.md`）\n")

    print("## 内容规模\n")

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

    # 公开互动数据（best-effort；评论详情已受保护，不在这里绕过权限）
    print("## 公开互动数据\n")
    data = try_fetch(URGE_URL)
    if "_error" in data:
        print(f"- **首页反应**：未能拉取 ({data['_error']})")
    else:
        print(f"- **催更**：{data.get('urge', 0)}")
        print(f"- **赞 / 爱心 / 收藏星**：{data.get('like', 0)} / {data.get('heart', 0)} / {data.get('star', 0)}")
        recent = sum(int(day.get("count", 0)) for day in data.get("last15days", []) if isinstance(day, dict))
        print(f"- **最近 15 天催更**：{recent}")
    print("- **评论**：公开聚合接口已关闭；需在 Waline 管理端人工复核，快照不绕过访问控制。")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
