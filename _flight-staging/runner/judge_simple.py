#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · 简单模式判断层（阈值比价，不调 AI，零密钥）。

只按用户设的『目标价』比：任一航线的最低合规价 ≤ 目标价就算 deal。
无 AI、无趋势/逐航线触发价——那些是完整模式(judge_api)的事。
Python 生成纯文本报告 + 更新价格历史（供本地面板）；去重规则与完整模式一致。
"""
import json
from pathlib import Path

RENOTIFY_DROP = 0.05          # 已推送过的航线×日期，需再降≥5% 才重推
HISTORY_KEEP = 60


def _rk(origin, dest, date):
    return f"{origin}-{dest}-{date}"


def _fmt_min(m):
    return f"{m // 60}h{m % 60:02d}m" if m else ""


def run_simple(cfg, results, history, state, now_iso):
    """纯函数：吃配置/抓取/历史/状态 → (verdict, history, state, report_md)。就地更新 history/state。"""
    first_run = not state.get("first_run_done")
    searches = results.get("searches", []) or []
    blocked = sum(1 for s in searches if s.get("status") == "blocked")
    no_data = sum(1 for s in searches if s.get("status") == "no_data")
    scrape_problem = blocked >= 3 or (bool(searches) and no_data >= len(searches) * 0.5)
    target = (cfg.get("price") or {}).get("target")

    routes_hist = history.setdefault("routes", {})
    notified = state.setdefault("notified", {})
    rows, fresh = [], []
    for s in searches:
        rk = _rk(s["origin"], s["dest"], s["date"])
        offers = sorted((o for o in (s.get("offers") or []) if o.get("price") is not None),
                        key=lambda o: o["price"])
        low = offers[0] if offers else None
        low_price = low["price"] if low else None
        route = f"{s.get('origin_name', s['origin'])} → {s.get('dest_name', s['dest'])}"

        recs = routes_hist.setdefault(rk, [])
        recs.append({"at": now_iso, "cheapest_compliant": low_price, "offer_count": len(offers)})
        del recs[:-HISTORY_KEEP]
        rows.append({"route": route, "date": s["date"], "low": low_price})

        if low_price is not None and target is not None and low_price <= target:
            prev = notified.get(rk)
            if prev and low_price >= prev["price"] * (1 - RENOTIFY_DROP):
                continue                      # 近期已推送过同价或更高，跳过
            fresh.append({"route_key": rk, "route": route, "date": s["date"],
                          "price": low_price, "stops": low.get("stops"),
                          "duration": _fmt_min(low.get("total_duration_min")),
                          "why": f"≤ 目标价 ${target}"})
            notified[rk] = {"price": low_price, "at": now_iso}

    if first_run:
        reason, should = "first_run", True
    elif fresh:
        reason, should = "deal", True
    elif scrape_problem:
        reason, should = "scrape_problem", True
    else:
        reason, should = "quiet", False
    state["first_run_done"] = True

    if fresh:
        summary = f"捡漏！{len(fresh)} 张 ≤ 目标价 ${target}"
    elif first_run:
        summary = "已开始盯票（简单模式）"
    else:
        summary = f"各线暂无 ≤ ${target} 的合规票"

    verdict = {
        "run_at": now_iso, "should_notify": should, "reason": reason,
        "summary": summary, "deals": fresh,
        "scrape_health": {"ok": sum(1 for s in searches if s.get("offers")),
                          "blocked": blocked, "no_data": no_data, "total": len(searches)},
    }
    return verdict, history, state, _report(rows, fresh, target, blocked, no_data, len(searches))


def _report(rows, fresh, target, blocked, no_data, total):
    out = ["# 机票监控 · 简单模式简报", ""]
    if fresh:
        out.append(f"**捡漏！{len(fresh)} 张 ≤ 目标价 ${target}：**")
        out += [f"- {d['route']} {d['date']}：**${d['price']}**"
                + (f"（{d['duration']}）" if d.get("duration") else "") for d in fresh]
        out.append("")
    out += ["## 各航线当前最低合规价", "", f"目标价 ${target}", "",
            "| 航线 | 日期 | 当前最低 |", "|---|---|---|"]
    for r in rows:
        low = f"**${r['low']}**" if (r["low"] is not None and target is not None and r["low"] <= target) \
              else (f"${r['low']}" if r["low"] is not None else "（无合规票）")
        out.append(f"| {r['route']} | {r['date']} | {low} |")
    out += ["", f"抓取健康度：正常 {total - blocked - no_data} · 无数据 {no_data} · 疑似被拦 {blocked}（共 {total}）"]
    return "\n".join(out)


# ─────────────────────────── 文件桥 ───────────────────────────

def simple_files(config_path, results_path, history_path, state_path,
                 verdict_path, report_path, now_iso):
    from . import config as cfgmod
    cfg = cfgmod.load(config_path) if not isinstance(config_path, dict) else config_path
    results = json.loads(Path(results_path).read_text(encoding="utf-8"))
    history = _read_json(history_path, {})
    state = _read_json(state_path, {})
    verdict, history, state, report_md = run_simple(cfg, results, history, state, now_iso)
    _write_json(history_path, history)
    _write_json(state_path, state)
    _write_json(verdict_path, verdict)
    Path(report_path).write_text(report_md, encoding="utf-8")
    return verdict


def _read_json(path, default):
    p = Path(path)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def _write_json(path, obj):
    Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
