#!/usr/bin/env python3
"""后端脉搏巡检：拉 zircon-urge / zircon-comments 的公开接口，
把催更/反应/排行榜/最近评论的当前快照汇总成一份 markdown 报告。

输出到 stdout。不修改文件。
不依赖任何后端密钥 —— 只用公开 GET 接口。

Best-effort：任何接口不可达 / 超时 / 返回异常 → 该段写"未能拉取"，
不让整体报告挂掉。
"""
import json
import subprocess
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

URGE = "https://zircon-urge.fly.dev"
COMMENTS = "https://zircon-comments.fly.dev"
TIMEOUT = 10  # waline 偶尔冷启动慢，给宽点


_HTTP_CODE_MARKER = "\n__HTTP_CODE__"


def get_json(url):
    """走 curl，避免 macOS python 的 SSL CA 坑。

    错误细分：
      - network 出口失败 → "network: ..."
      - 5xx → "backend HTTP 5xx (fly 502 / 后端挂了)"
      - 4xx → "backend HTTP 4xx"
      - 200 空 body → "empty response"
      - 200 非 JSON → "non-json (HTTP 200): <preview>"
    """
    try:
        out = subprocess.run(
            ["curl", "-sSL", "--max-time", str(TIMEOUT),
             "-H", "User-Agent: zirconeey-backend-pulse",
             "-H", "Accept: application/json",
             "-w", _HTTP_CODE_MARKER + "%{http_code}",
             url],
            capture_output=True, text=True, timeout=TIMEOUT + 2,
        )
        if out.returncode != 0:
            return {"_error": f"network: curl exit {out.returncode} ({out.stderr.strip()[:80]})"}
        body = out.stdout
        if _HTTP_CODE_MARKER in body:
            body, _, code = body.rpartition(_HTTP_CODE_MARKER)
            code = code.strip()
        else:
            code = "???"
        if code == "000":
            return {"_error": "network: connect failed (DNS/沙箱出口?)"}
        if code.startswith("5"):
            return {"_error": f"backend HTTP {code} (fly 502 / 后端挂了)"}
        if code.startswith("4"):
            return {"_error": f"backend HTTP {code}"}
        if not body.strip():
            return {"_error": f"empty response (HTTP {code})"}
        try:
            return json.loads(body)
        except json.JSONDecodeError as e:
            preview = body.strip().replace("\n", " ")[:80]
            return {"_error": f"non-json (HTTP {code}): {preview!r} ({e.msg})"}
    except subprocess.TimeoutExpired:
        return {"_error": "timeout"}
    except Exception as e:
        return {"_error": f"{type(e).__name__}: {str(e)[:80]}"}


def bar(n, max_n, width=24):
    if max_n <= 0:
        return ""
    return "█" * max(1, int(round(n / max_n * width))) if n else ""


def section_urge():
    print("## 🔥 首页催更 / 反应（zircon-urge）\n")
    data = get_json(f"{URGE}/api/urge")
    if "_error" in data:
        print(f"未能拉取：{data['_error']}\n")
        return
    counts = {k: data.get(k, 0) for k in ("urge", "like", "heart", "star")}
    print("| 类型 | 累计 |")
    print("|------|------|")
    print(f"| 催更 urge | {counts['urge']} |")
    print(f"| 👍 like | {counts['like']} |")
    print(f"| ❤️ heart | {counts['heart']} |")
    print(f"| ⭐ star | {counts['star']} |")
    print()

    days = data.get("last15days", [])
    if days:
        max_n = max((d.get("count", 0) for d in days), default=0)
        print("**最近 15 天催更分布**\n")
        print("```")
        for d in days:
            n = d.get("count", 0)
            print(f"{d['date']}  {n:3d}  {bar(n, max_n)}")
        print("```\n")
    dsr = data.get("daysSinceReset")
    if dsr is not None:
        print(f"距上次 reset：{dsr} 天\n")


def section_leaderboards():
    print("## 🏆 小游戏排行榜（top 1 概览）\n")
    games_data = get_json(f"{URGE}/api/lb?action=games")
    if "_error" in games_data:
        print(f"未能拉取游戏列表：{games_data['_error']}\n")
        return
    games = games_data.get("games", {})
    if not games:
        print("无游戏注册。\n")
        return

    # 并发拉每个游戏（含 default split）top 1
    def fetch_one(gid, gmeta):
        params = {"action": "top", "game": gid, "limit": "1"}
        if gmeta.get("defaultSplit"):
            params["split"] = gmeta["defaultSplit"]
        url = f"{URGE}/api/lb?" + urllib.parse.urlencode(params)
        return gid, gmeta, get_json(url)

    rows = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        for gid, gmeta, res in ex.map(lambda kv: fetch_one(*kv), games.items()):
            if "_error" in res:
                rows.append((gid, gmeta, None, None, None, res.get("total", 0)))
                continue
            entries = res.get("entries", [])
            total = res.get("total", 0)
            if not entries:
                rows.append((gid, gmeta, None, None, None, total))
            else:
                e = entries[0]
                rows.append((gid, gmeta, e.get("nick"), e.get("score"), e.get("ts"), total))

    # 按总参与人数排序
    rows.sort(key=lambda x: -x[5])
    print("| 游戏 | 参与人数 | top 1 | 分数 |")
    print("|------|----------|-------|------|")
    for gid, gmeta, nick, score, ts, total in rows:
        label = gmeta.get("label", gid)
        sort_dir = gmeta.get("sortDir", "desc")
        if nick is None:
            print(f"| {label} | {total} | — | — |")
        else:
            # asc 排行（用时短在前）显示为时间
            if sort_dir == "asc":
                s = f"{score/1000:.1f}s" if score else "—"
            else:
                s = f"{score:,}" if score else "—"
            print(f"| {label} | {total} | {nick} | {s} |")
    print()


def section_recent_comments():
    print("## 💬 最近评论（waline）\n")
    data = get_json(f"{COMMENTS}/api/comment?type=recent&count=10")
    if "_error" in data:
        print(f"未能拉取：{data['_error']}\n")
        return
    if data.get("errno") != 0:
        print(f"接口错误：{data.get('errmsg', '?')}\n")
        return
    items = data.get("data", [])
    if not items:
        print("近期无评论。\n")
        return
    for c in items[:10]:
        nick = c.get("nick", "?")
        # 去 html
        text = c.get("comment", "").replace("<p>", "").replace("</p>", "").strip()
        if len(text) > 60:
            text = text[:60] + "…"
        url = c.get("url", "")
        when = c.get("time", 0) or c.get("insertedAt", "")
        if isinstance(when, (int, float)) and when > 1_000_000_000_000:
            when = time.strftime("%m-%d %H:%M", time.localtime(when / 1000))
        print(f"- **{nick}** ({when}) on `{url}`: {text}")
    print()


def main():
    print(f"# 后端脉搏（{time.strftime('%Y-%m-%d %H:%M')}）\n")
    section_urge()
    section_leaderboards()
    section_recent_comments()
    return 0


if __name__ == "__main__":
    sys.exit(main())
