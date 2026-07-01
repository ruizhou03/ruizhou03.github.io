#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · 完整模式判断层（直连 Anthropic API）。

替代私人版的 `claude --dangerously-skip-permissions` 全权限 agent：
Python 负责【所有】文件读写与「要不要推送」的判定，只把抓取数据喂给 API、
要回一段【结构化 JSON】（deals / 逐航线目标价 / 趋势 / 人读报告）。
用户用自己的 sk-ant key（环境变量 ANTHROPIC_API_KEY）——无本地 agent、
无文件/命令权限、无 skip-permissions。

用官方 anthropic Python SDK；结构化输出用 output_config.format(json_schema)。
模型默认 claude-opus-4-8，可用 FLIGHTWATCH_MODEL 覆盖（按运行成本自行选择，
如 claude-sonnet-4-6 更省）。判断层不联网抓取，只推理。
"""
import json
import os
from pathlib import Path

MODEL = os.environ.get("FLIGHTWATCH_MODEL", "claude-opus-4-8")
EFFORT = os.environ.get("FLIGHTWATCH_EFFORT", "medium")   # low|medium|high|xhigh|max
RENOTIFY_DROP = 0.05          # 已推送过的航线×日期，需再降≥5% 才重推
HISTORY_KEEP = 60             # 每条航线保留最近 N 条价格历史

# ─────────────────────────── 结构化输出 schema ───────────────────────────
# json_schema 限制：所有 object 必须 additionalProperties:false；不支持 min/max。
VERDICT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "deals", "targets", "trend_md", "report_md"],
    "properties": {
        "summary": {"type": "string", "description": "一句话总结，进通知标题区"},
        "deals": {
            "type": "array",
            "description": "你判断【值得主人去抢】的航班（可空）。不一定最便宜，综合价/中转/时长/白天到达。",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["route_key", "route", "date", "price", "stops", "duration", "why"],
                "properties": {
                    "route_key": {"type": "string", "description": "务必用输入里该 search 的 route_key（origin-dest-date 机场码）"},
                    "route": {"type": "string", "description": "中文展示，如 上海 → 洛杉矶"},
                    "date": {"type": "string"},
                    "price": {"type": "number"},
                    "stops": {"type": "integer"},
                    "duration": {"type": "string"},
                    "why": {"type": "string", "description": "为什么值得抢，一句话"},
                    "url": {"type": "string"},
                },
            },
        },
        "targets": {
            "type": "array",
            "description": "为每条 preferred 航线×日期估的『触发价』——跌到就该立刻下手的价位。",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["route_key", "target_price", "note"],
                "properties": {
                    "route_key": {"type": "string"},
                    "target_price": {"type": "number"},
                    "note": {"type": "string", "description": "依据，如 该航线6月低至$440、旺季溢价后$820合理"},
                },
            },
        },
        "trend_md": {"type": "string", "description": "趋势与潜力（markdown）：每条航线当前价/触发价/历史低点/一句趋势判断"},
        "report_md": {"type": "string", "description": "完整人读报告（markdown，规范标题/表格/加粗）"},
    },
}

SYSTEM = """你是「机票监控」的判断大脑。抓取层已把中国→美国各航线×日期的航班抓好、做完\
【硬性过滤】（中转数/联程/含托运/避开地/中转时长/全程时长都已满足用户底线）。你的活是：
读数据、判断有没有『便宜到该让主人去抢』的票、做价格趋势/潜力分析、为每条 preferred 航线估\
一个『触发价』、写一份干净的人读报告。

要点：
- 只推理，不联网、不假设你能读写文件。所有结论放进结构化 JSON 返回。
- deals：挑真正值得抢的（综合价格/中转/总时长/白天到达/是否命中理想日），不是单纯最便宜。\
1 中转优先；2 中转仅在明显更便宜且时长没长太多时才算值得。每条 deal 的 route_key 必须原样\
用输入里对应 search 的 route_key。
- targets（触发价）：参考该航线价格日历的近月/6月低点，叠加合理旺季系数，估一个『现实、\
跌到就下手』的价位——别定得遥不可及、也别轻易触发。
- 趋势/潜力：对比目标出行日与更近日期（尤其6月）的日历价，识别『现在贵但有潜力』的航线。
- 报告：规范 markdown（标题/表格/加粗），含：本次概况、deal 详情、各 preferred 航线当前最低\
合规价表、趋势与潜力、抓取健康度。没有 deal 也照写，让主人看到监控在跑。
- 只描述方向与幅度，不预测『哪天触发』、不用『大概率有戏』这类打包票措辞。
返回严格符合给定 schema 的 JSON。"""


# ─────────────────────────── 输入压缩（省 token） ───────────────────────────

def _route_key(origin, dest, date):
    return f"{origin}-{dest}-{date}"


def _calendar_digest(cal, target_dates):
    """把一条航线 ~170 天日历压成模型要的几个点：整体低点 + 目标日价。"""
    if not cal:
        return None
    items = sorted(cal.items())              # [(iso, price), ...]
    lo_date, lo_price = min(items, key=lambda kv: kv[1])
    return {
        "overall_min": lo_price,
        "overall_min_date": lo_date,
        "on_target_dates": {d: cal.get(d) for d in target_dates if d in cal},
    }


def _brief(cfg, results, history, state):
    """把配置 + 抓取结果 + 历史 + 当前目标价压成紧凑 dict，作为 user 消息。"""
    searches = []
    for s in results.get("searches", []):
        rk = _route_key(s["origin"], s["dest"], s["date"])
        offers = (s.get("offers") or [])[:3]     # 每条最多 3 条合规
        searches.append({
            "route_key": rk,
            "route": f"{s.get('origin_name', s['origin'])} → {s.get('dest_name', s['dest'])}",
            "date": s["date"],
            "status": s.get("status"),
            "offers": [{
                "price": o.get("price"), "stops": o.get("stops"),
                "airlines": o.get("airlines"),
                "total_min": o.get("total_duration_min"),
                "transfers": o.get("transfer_airports"),
                "overnight": o.get("overnight_layover"),
                "arr_airport": o.get("arr_airport"),
                "arr_time": o.get("arr_time"),
            } for o in offers],
            "cheapest_rejected": s.get("cheapest_rejected"),
        })
    cals = {}
    for rk, cal in (results.get("route_calendars") or {}).items():
        dig = _calendar_digest(cal, cfg.get("dates", []))
        if dig:
            cals[rk] = dig
    hist = {rk: recs[-8:] for rk, recs in (history.get("routes") or {}).items()}
    return json.dumps({
        "config": {
            "routes": cfg.get("routes"), "dates": cfg.get("dates"),
            "ideal_dates": cfg.get("ideal_dates"), "cabin": cfg.get("cabin_label"),
            "price": cfg.get("price"), "constraints": cfg.get("constraints"),
        },
        "searches": searches,
        "calendars": cals,
        "history_recent": hist,
        "current_targets": state.get("targets", {}),
    }, ensure_ascii=False)


# ─────────────────────────── API 调用（可注入以便离线测试） ───────────────────────────

def _schema_hint(schema):
    return ("只返回一个 JSON 对象，严格符合下面的 schema——不要多余文字、不要 markdown 代码围栏：\n"
            + json.dumps(schema, ensure_ascii=False))


def call_anthropic(ai, system, user, schema, effort=EFFORT):
    """Claude 原生 SDK；结构化输出约束成给定 json_schema。

    key：ANTHROPIC_API_KEY 优先，其次 FLIGHTWATCH_API_KEY（安装器统一写这一个）。
    """
    from anthropic import Anthropic
    client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY")
                       or os.environ.get("FLIGHTWATCH_API_KEY"))
    resp = client.messages.create(
        model=ai.get("model") or MODEL,
        max_tokens=8000,
        system=system,
        output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        messages=[{"role": "user", "content": user}],
    )
    if getattr(resp, "stop_reason", None) == "refusal":
        raise RuntimeError("模型拒答（refusal），本轮跳过判断")
    text = "".join(getattr(b, "text", "") for b in resp.content
                   if getattr(b, "type", None) == "text")
    return json.loads(text)


def call_openai(ai, system, user, schema):
    """OpenAI 兼容接口（GPT / DeepSeek / Kimi / GLM…）：chat.completions + JSON 模式。

    key 读 OPENAI_API_KEY 或 FLIGHTWATCH_API_KEY；base_url 来自厂商注册表（config._ai）。
    这些厂商的结构化输出支持不一，用最通用的 json_object + prompt 里附 schema。
    """
    from openai import OpenAI
    key = os.environ.get("OPENAI_API_KEY") or os.environ.get("FLIGHTWATCH_API_KEY")
    client = OpenAI(api_key=key, base_url=ai.get("base_url") or None)
    resp = client.chat.completions.create(
        model=ai.get("model"),
        max_tokens=8000,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system + "\n\n" + _schema_hint(schema)},
            {"role": "user", "content": user},
        ],
    )
    return json.loads(resp.choices[0].message.content)


def call_model(ai, system, user, schema):
    """按厂商 sdk 分发：anthropic 走原生 SDK，其余走 OpenAI 兼容接口。"""
    ai = ai or {}
    if ai.get("sdk", "anthropic") == "anthropic":
        return call_anthropic(ai, system, user, schema)
    return call_openai(ai, system, user, schema)


# ─────────────────────────── 判断主流程 ───────────────────────────

def run_judge(cfg, results, history, state, now_iso, call=call_model):
    """纯函数：吃配置/抓取/历史/状态 → (verdict, history, state)。call 可注入。

    Python 决定 should_notify（含去重），模型只做分析。history/state 就地更新。
    """
    first_run = not state.get("first_run_done")
    searches = results.get("searches", []) or []
    blocked = sum(1 for s in searches if s.get("status") == "blocked")
    no_data = sum(1 for s in searches if s.get("status") == "no_data")
    scrape_problem = blocked >= 3 or (bool(searches) and no_data >= len(searches) * 0.5)

    # 1) 更新价格历史
    routes_hist = history.setdefault("routes", {})
    for s in searches:
        rk = _route_key(s["origin"], s["dest"], s["date"])
        offers = s.get("offers") or []
        prices = [o["price"] for o in offers if o.get("price") is not None]
        cheapest_compliant = min(prices) if prices else None
        cheap_rej = s.get("cheapest_rejected") or {}
        cheapest_overall = cheap_rej.get("price", cheapest_compliant)
        recs = routes_hist.setdefault(rk, [])
        recs.append({"at": now_iso, "cheapest_compliant": cheapest_compliant,
                     "cheapest_overall": cheapest_overall, "offer_count": len(offers)})
        del recs[:-HISTORY_KEEP]

    # 2) 问模型（按 cfg.ai 选厂商/模型；拿 deals / targets / 报告）
    res = call(cfg.get("ai") or {}, SYSTEM, _brief(cfg, results, history, state), VERDICT_SCHEMA)

    # 3) 目标价写回 state
    targets = state.setdefault("targets", {})
    for t in res.get("targets", []) or []:
        if t.get("route_key") and t.get("target_price") is not None:
            targets[t["route_key"]] = {"target_price": t["target_price"], "note": t.get("note", "")}

    # 4) 去重 + 决定 should_notify（Python 权威，模型不决定）
    notified = state.setdefault("notified", {})
    fresh = []
    for d in res.get("deals", []) or []:
        rk, price = d.get("route_key"), d.get("price")
        if rk is None or price is None:
            continue
        prev = notified.get(rk)
        if prev and price >= prev["price"] * (1 - RENOTIFY_DROP):
            continue                          # 近期已推送过同价或更高，跳过
        fresh.append(d)
        notified[rk] = {"price": price, "at": now_iso}

    if first_run:
        reason, should = "first_run", True
    elif fresh:
        reason, should = "deal", True
    elif scrape_problem:
        reason, should = "scrape_problem", True
    else:
        reason, should = "quiet", False
    state["first_run_done"] = True

    verdict = {
        "run_at": now_iso,
        "should_notify": should,
        "reason": reason,
        "summary": res.get("summary", ""),
        "deals": fresh,
        "trend_md": res.get("trend_md", ""),
        "scrape_health": {"ok": sum(1 for s in searches if s.get("offers")),
                          "blocked": blocked, "no_data": no_data,
                          "total": len(searches)},
    }
    return verdict, history, state, res.get("report_md", "")


# ─────────────────────────── 文件桥（运行器入口用） ───────────────────────────

def judge_files(config_path, results_path, history_path, state_path,
                verdict_path, report_path, now_iso, call=call_model):
    """读盘 → run_judge → 写 history/state/verdict/report。运行器实际调这个。"""
    from . import config as cfgmod  # 复用 config.py 的规范化
    cfg = cfgmod.load(config_path) if not isinstance(config_path, dict) else config_path
    results = json.loads(Path(results_path).read_text(encoding="utf-8"))
    history = _read_json(history_path, {})
    state = _read_json(state_path, {})

    verdict, history, state, report_md = run_judge(cfg, results, history, state, now_iso, call=call)

    _write_json(history_path, history)
    _write_json(state_path, state)
    _write_json(verdict_path, verdict)
    Path(report_path).write_text(report_md or verdict.get("summary", ""), encoding="utf-8")
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
