#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · 配置层（前端 ↔ 后端桥）。

把前端「盯票码」(fw_ + base64url(JSON)) 或下载的 flightwatch.json 读进来，
规范化成运行器各层要用的 RunnerConfig：航线 / 日期 / 硬性约束 / 价格 / 投递 / 调度。

前端 collectConfig() 的字段见 config-onepage.html；本模块与其一一对应、互逆解码。
"""
import base64
import json
from pathlib import Path

# 舱位 → Trip.com class 参数（超经 yc 待抓包核实）
CABIN_MAP = {"经济舱": "ys", "超级经济舱": "yc", "商务舱": "c", "头等舱": "f"}
# 行程类型 → Trip.com triptype
TRIP_MAP = {"单程": "ow", "往返": "rt"}


def decode_code(code):
    """fw_<base64url(JSON)> → dict。与前端 encodeCode 互逆。

    前端：btoa(unescape(encodeURIComponent(JSON))) 后 +→- /→_ 去 =。
    这里反向补齐 padding 再 base64 解，得到 UTF-8 字节，decode 即原 JSON。
    """
    b = code.strip()
    if b.startswith("fw_"):
        b = b[3:]
    b = b.replace("-", "+").replace("_", "/")
    b += "=" * (-len(b) % 4)
    return json.loads(base64.b64decode(b).decode("utf-8"))


def load_raw(source):
    """source = 盯票码字符串 / flightwatch.json 路径 / 已解析 dict → 原始前端配置 dict。"""
    if isinstance(source, dict):
        return source
    s = str(source)
    if s.startswith("fw_"):
        return decode_code(s)
    p = Path(s)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return decode_code(s)  # 兜底：当成裸 base64 码


def _codes(chips):
    """[{key:'city:BJS'|'ap:XMN', label:'北京'}] → [{code,name,kind}]。"""
    out = []
    for c in chips or []:
        key = c.get("key", "")
        kind, _, code = key.partition(":")
        out.append({"code": code or key, "name": c.get("label", code), "kind": kind or "ap"})
    return out


def _num(v):
    for cast in (int, float):
        try:
            return cast(v)
        except (TypeError, ValueError):
            continue
    return None


def _pax_int(s):
    for ch in str(s):
        if ch.isdigit():
            return int(ch)
    return 1


def _delivery(arr):
    """前端 delivery 是 [邮件, 网站, APP推送, 桌面通知] 的 bool 数组。"""
    arr = arr or []
    keys = ("email", "website", "app", "desktop")
    return {k: (bool(arr[i]) if i < len(arr) else False) for i, k in enumerate(keys)}


def _schedule(freq):
    """前端 freq.n = '1'|'2'|'more' → 运行器调度槽。

    ⚠️ 当前设计稿的 collectConfig 只序列化了频率档位 n、没带具体钟点，
    这里先给默认时间；待前端把 freqTimes 里的时刻一并序列化后改为读真实值。
    """
    n = (freq or {}).get("n", "2")
    times = (freq or {}).get("times")  # 前端补齐后会有；没有则用默认
    if n == "1":
        return {"mode": "times", "times": times or ["10:00"]}
    if n == "more":
        return {
            "mode": "interval",
            "start": (freq or {}).get("start", "08:00"),
            "end": (freq or {}).get("end", "22:00"),
            "every_hours": (freq or {}).get("every_hours", 4),
        }
    return {"mode": "times", "times": times or ["09:00", "21:00"]}


def normalize(raw):
    """前端配置 dict → 运行器规范化配置 RunnerConfig。"""
    trip = raw.get("trip", {}) or {}
    date = raw.get("date", {}) or {}
    stop = raw.get("stop", {}) or {}
    bag = raw.get("bag", {}) or {}
    dur = raw.get("dur", {}) or {}
    times = raw.get("times", {}) or {}
    price = raw.get("price", {}) or {}

    dep_dates = sorted(set(date.get("depCand", []) or []) | set(date.get("depIdeal", []) or []))
    ideal_dates = sorted(set(date.get("depIdeal", []) or []))

    smax = stop.get("max", "1")
    max_stops = 99 if smax == "9" else int(smax or 1)

    constraints = {
        "max_stops": max_stops,
        "require_through_ticket": bool(stop.get("oneTicket")),
        "no_overnight": bool(stop.get("noOvernight")),
        "no_transit_visa": bool(stop.get("noTransitVisa")),
        "min_checked_bags": 1 if bag.get("checked") else 0,
        "require_hand_bag": bool(bag.get("hand")),
        "exclude_transfer_airports": [a.get("code") for a in (stop.get("avoid") or []) if a.get("code")],
        "max_layover_hours": stop.get("layover", 12),
        "max_total_duration_hours": ((_num(dur.get("hours")) or None) if dur.get("on") else None),
        "dep_time_window": times.get("dep"),   # {from,to} 或 None
        "arr_time_window": times.get("arr"),
    }

    return {
        "version": raw.get("v", 1),
        "trip_type": TRIP_MAP.get(trip.get("type", "单程"), "ow"),
        "cabin_class": CABIN_MAP.get(trip.get("cabin", "经济舱"), "ys"),
        "cabin_label": trip.get("cabin", "经济舱"),
        "passengers": _pax_int(trip.get("pax", "1")),
        "passenger_type": trip.get("paxType", "成人"),
        "routes": {
            "origins": _codes(raw.get("origin")),
            "destinations": _codes(raw.get("dest")),
        },
        "dates": dep_dates,
        "ideal_dates": ideal_dates,
        "arr_dates": sorted(set(date.get("arrCand", []) or []) | set(date.get("arrIdeal", []) or [])),
        "constraints": constraints,
        "price": {"target": _num(price.get("low")), "budget": _num(price.get("high"))},
        "priority": raw.get("priority", []),
        "delivery": _delivery(raw.get("delivery")),
        "schedule": _schedule(raw.get("freq", {})),
        "email": raw.get("email", ""),
    }


def load(source):
    """一步到位：盯票码 / json 路径 / dict → RunnerConfig。"""
    return normalize(load_raw(source))


if __name__ == "__main__":
    import sys
    cfg = load(sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read().strip())
    print(json.dumps(cfg, ensure_ascii=False, indent=2))
