#!/usr/bin/env python3
"""死链巡检：扫 _notes / _includes / _layouts / 顶层 html 里的外链，
HEAD（必要时 GET）检测，输出 status >= 400 或连不上的清单。

输出 markdown 报告到 stdout（供 daily-review Claude 读取）。
不修改任何文件。

设计：
- 并发 16，超时 8s
- 跳过本站内链、相对路径、mailto:、tel:、javascript:、data:
- 跳过常见易误报域名（豆瓣详情页等返回 418/403 但实际可达）—— 写在 SKIP_HOST_PATTERNS
- 结果缓存到 .audit-cache/dead_links.json，TTL 7 天，避免每天重抓同样的 URL
"""
import json
import os
import re
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE_DIR = REPO / ".audit-cache"
CACHE_FILE = CACHE_DIR / "dead_links.json"
CACHE_TTL = 7 * 24 * 3600  # 7 天

SCAN_DIRS = ["_notes", "_includes", "_layouts", "life", "research", "essays", "notes", "study", "toolbox", "tools"]
SCAN_EXT = {".md", ".html", ".htm"}

# 一些常见的"返回非 2xx 但页面其实活着"的域名 / 路径模式 —— 直接信任，不报死链
SKIP_HOST_PATTERNS = [
    r"^localhost$",
    r"^127\.0\.0\.1$",
    r"^example\.com$",
    r"^zirconeey\.github\.io$",  # 本站内链
    r"^ruizhou03\.github\.io$",  # 英文镜像
]

URL_RE = re.compile(r'https?://[^\s)<>"\'`，。、；！？]+')


def should_skip_url(url: str) -> bool:
    try:
        host = urllib.parse.urlparse(url).hostname or ""
    except Exception:
        return True
    for pat in SKIP_HOST_PATTERNS:
        if re.match(pat, host):
            return True
    return False


def collect_urls():
    """返回 {url: [文件:行号, ...]}"""
    found = {}
    for d in SCAN_DIRS:
        base = REPO / d
        if not base.exists():
            continue
        for root, _, files in os.walk(base):
            for fn in files:
                ext = os.path.splitext(fn)[1].lower()
                if ext not in SCAN_EXT:
                    continue
                fp = Path(root) / fn
                try:
                    text = fp.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                for i, line in enumerate(text.splitlines(), 1):
                    for m in URL_RE.finditer(line):
                        url = m.group(0).rstrip(".,;:)]}\"'")
                        if should_skip_url(url):
                            continue
                        found.setdefault(url, []).append(f"{fp.relative_to(REPO)}:{i}")
    return found


def load_cache():
    if not CACHE_FILE.exists():
        return {}
    try:
        data = json.loads(CACHE_FILE.read_text())
        now = time.time()
        return {u: v for u, v in data.items() if now - v.get("checked_at", 0) < CACHE_TTL}
    except Exception:
        return {}


def save_cache(cache):
    CACHE_DIR.mkdir(exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2))


def check_one(url):
    try:
        import requests
    except ImportError:
        return url, None, "requests-not-installed"
    headers = {"User-Agent": "Mozilla/5.0 (zirconeey-daily-review-bot)"}
    try:
        r = requests.head(url, headers=headers, timeout=8, allow_redirects=True)
        if r.status_code in (405, 403, 401):
            # HEAD 不让，用 GET 再试
            r = requests.get(url, headers=headers, timeout=10, allow_redirects=True, stream=True)
            r.close()
        return url, r.status_code, None
    except Exception as e:
        return url, None, str(e)[:120]


def main():
    urls = collect_urls()
    cache = load_cache()
    pending = [u for u in urls if u not in cache]
    print(f"# 死链巡检报告（{time.strftime('%Y-%m-%d %H:%M')}）", flush=True)
    print(f"\n共发现 **{len(urls)}** 个外链，其中 **{len(pending)}** 个需要重新检查（其余命中 7 天缓存）。", flush=True)

    if pending:
        with ThreadPoolExecutor(max_workers=16) as ex:
            futs = {ex.submit(check_one, u): u for u in pending}
            for fut in as_completed(futs):
                url, status, err = fut.result()
                cache[url] = {"status": status, "err": err, "checked_at": time.time()}
        save_cache(cache)

    dead = []
    for url, refs in urls.items():
        info = cache.get(url, {})
        status = info.get("status")
        err = info.get("err")
        if err and "requests-not-installed" in err:
            print("\n> [!] 缺 `requests` 模块。`pip install requests` 后再跑。", flush=True)
            return 0
        if err or (isinstance(status, int) and status >= 400):
            dead.append((url, status, err, refs))

    if not dead:
        print("\n✅ 没有死链。", flush=True)
        return 0

    print(f"\n## ❌ 共 {len(dead)} 条疑似死链\n", flush=True)
    for url, status, err, refs in sorted(dead, key=lambda x: (x[1] or 999, x[0])):
        marker = f"HTTP {status}" if status else f"网络错误: {err}"
        print(f"- **{marker}** `{url}`")
        for ref in refs[:5]:
            print(f"  - {ref}")
        if len(refs) > 5:
            print(f"  - ...另 {len(refs)-5} 处")
    print(flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
