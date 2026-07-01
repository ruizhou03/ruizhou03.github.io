#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · 抓取层（Trip.com，Playwright）。

自包含（随运行器分发到用户机器，不依赖任何私人路径）。在私人版验证过的抓取逻辑上
补：配置驱动的舱位/乘客数、手提行李(FREE_CARRY_ON_BAGGAGE)硬过滤、出发/到达时段硬过滤、
过夜中转硬过滤。往返需返程日期——当前配置未含（UI 暂无返程日选择器）→ 按单程抓取并 log。

接口：scrape.run(cfg, out_path, log=print) —— cfg 为 config.load() 的 RunnerConfig。
硬字段（stops/联程/行李/中东/时长）在列表 JSON 里现成；『值不值得抢/趋势』留给判断层。
"""
import json
import random
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

TRIP_URL = ("https://us.trip.com/flights/showfarefirst"
            "?dcity={dcity}&acity={acity}&ddate={ddate}"
            "&triptype={tt}&class={cls}&quantity={qty}&curr=USD&locale=en-US")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

MIDDLE_EAST_AIRLINE_CODES = {"QR", "TK", "EK", "EY", "SV", "WY", "GF", "KU", "IR", "J2", "G9", "FZ"}
KEEP_TOP_N = 5


# ─────────────────────────── Playwright 抓取 ───────────────────────────

def _new_browser(pw):
    browser = pw.chromium.launch(
        headless=True,
        args=["--disable-blink-features=AutomationControlled",
              "--disable-dev-shm-usage", "--no-sandbox"])
    ctx = browser.new_context(user_agent=UA, viewport={"width": 1440, "height": 900},
                              locale="en-US", timezone_id="America/New_York")
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
    return browser, ctx


def _click_search(page):
    for sel in ('button:has-text("Search")', '[class*="search-btn"]', 'text=Search'):
        try:
            loc = page.locator(sel).first
            if loc.count() > 0:
                loc.click(timeout=4000)
                return True
        except Exception:
            continue
    return False


def _wait_for_sse(bodies, rounds):
    for _ in range(rounds):
        time.sleep(2.5)
        if bodies:
            time.sleep(4)
            return True
    return False


def _parse_calendar(body):
    try:
        d = json.loads(body.decode("utf-8", "replace"))
    except Exception:
        return None
    cal = {}
    for item in d.get("lowPriceInCalenderDtoInfoList") or []:
        ts = item.get("dDate")
        price = item.get("currencyPrice") or item.get("originPrice")
        if ts and price:
            try:
                iso = datetime.utcfromtimestamp(int(ts) + 8 * 3600).strftime("%Y-%m-%d")
                cal[iso] = price
            except Exception:
                continue
    return cal or None


def fetch_itineraries(ctx, dcity, acity, ddate, cls="ys", triptype="ow", qty=1, want_calendar=False):
    """开一次搜索页，回收 FlightListSearchSSE 的 itineraryList（+ 可选价格日历）。

    返回 (itinerary_list, airline_map, calendar, status)。status: ok/no_data/blocked/error:...
    """
    page = ctx.new_page()
    bodies, cal_bodies = [], []

    def on_response(resp):
        u = resp.url
        if "FlightListSearchSSE" in u:
            try:
                bodies.append(resp.body())
            except Exception:
                pass
        elif want_calendar and "GetLowPriceInCalender" in u:
            try:
                cal_bodies.append(resp.body())
            except Exception:
                pass

    page.on("response", on_response)
    url = TRIP_URL.format(dcity=dcity.lower(), acity=acity.lower(), ddate=ddate,
                          tt=triptype, cls=cls, qty=qty)
    status = "ok"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        _click_search(page)
        if not _wait_for_sse(bodies, 22):
            _click_search(page)
            _wait_for_sse(bodies, 12)
        if not bodies:
            txt = ""
            try:
                txt = page.inner_text("body")[:400].lower()
            except Exception:
                pass
            status = "blocked" if any(w in txt for w in
                     ("verify", "captcha", "robot", "unusual", "security check")) else "no_data"
    except Exception as e:
        status = f"error:{str(e)[:120]}"
    finally:
        page.close()

    calendar = None
    for b in cal_bodies:
        calendar = _parse_calendar(b)
        if calendar:
            break

    if status != "ok":
        return [], {}, calendar, status

    itineraries, seen, airline_map = [], set(), {}
    for body in bodies:
        try:
            text = body.decode("utf-8", "replace").strip()
            if text.startswith("data:"):
                text = text[5:].strip()
            d = json.loads(text)
        except Exception:
            continue
        for a in d.get("airlineList", []) or []:
            code = a.get("airlineCode") or a.get("code")
            name = a.get("airlineName") or a.get("name")
            if code and name:
                airline_map[code] = name
        for it in d.get("itineraryList", []) or []:
            uid = (it.get("journeyList", [{}])[0] or {}).get("uniqueId") or id(it)
            if uid in seen:
                continue
            seen.add(uid)
            itineraries.append(it)
    return itineraries, airline_map, calendar, ("ok" if itineraries else "no_data")


# ─────────────────────────── 解析 + 硬过滤 ───────────────────────────

def _flag_set(seq):
    out = set()
    for f in seq or []:
        if isinstance(f, str):
            out.add(f)
        elif isinstance(f, dict):
            k = f.get("key") or f.get("flag")
            if k:
                out.add(k)
    return out


def _parse_dt(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _hm(s):
    try:
        h, m = str(s).split(":")
        return int(h) * 60 + int(m)
    except Exception:
        return None


def _time_in_window(dt_str, win):
    """dt 的时刻是否落在 {from,to} 时间窗内（支持跨午夜）。窗无效/缺则视为通过。"""
    if not win:
        return True
    d = _parse_dt(dt_str)
    if not d:
        return True
    hm = d.hour * 60 + d.minute
    fr, to = _hm(win.get("from")), _hm(win.get("to"))
    if fr is None or to is None:
        return True
    return fr <= hm <= to if fr <= to else (hm >= fr or hm <= to)


def parse_offer(it, airline_map):
    journey = (it.get("journeyList") or [{}])[0]
    secs = journey.get("transSectionList") or []
    flight_secs = [s for s in secs if s.get("transportType") == "FLIGHT"]
    policy = (it.get("policies") or [{}])[0]
    price = (policy.get("price") or {}).get("totalPrice")
    pflags = _flag_set(policy.get("policyFlags"))
    tagkeys = {t.get("key") for t in (policy.get("tagList") or []) if isinstance(t, dict)}

    segments = []
    for s in flight_secs:
        dp, ap = s.get("departPoint") or {}, s.get("arrivePoint") or {}
        fi = s.get("flightInfo") or {}
        code = fi.get("airlineCode")
        segments.append({
            "from": dp.get("airportCode"), "to": ap.get("airportCode"),
            "dep": s.get("departDateTime"), "arr": s.get("arriveDateTime"),
            "airline": airline_map.get(code, code), "airline_code": code,
            "flight_no": fi.get("flightNo"), "duration_min": s.get("duration")})

    transfers = [s["to"] for s in segments[:-1]]
    stops = max(len(segments) - 1, 0)
    layovers, overnight = [], False
    for i in range(len(segments) - 1):
        arr = _parse_dt(segments[i]["arr"])
        dep = _parse_dt(segments[i + 1]["dep"])
        if arr and dep and dep > arr:
            layovers.append(int((dep - arr).total_seconds() // 60))
            for off in range((dep.date() - arr.date()).days + 1):
                base = datetime.combine(arr.date() + timedelta(days=off), datetime.min.time())
                if arr < base.replace(hour=5) and dep > base.replace(hour=1):
                    overnight = True
        else:
            layovers.append(None)

    return {
        "price": price, "stops": stops, "segments": segments,
        "transfer_airports": transfers, "layovers_min": layovers,
        "overnight_layover": overnight,
        "total_duration_min": journey.get("duration"),
        "dep_time": segments[0]["dep"] if segments else None,
        "arr_time": segments[-1]["arr"] if segments else None,
        "arr_airport": segments[-1]["to"] if segments else None,
        "airlines": sorted({s["airline"] for s in segments if s.get("airline")}),
        "airline_codes": sorted({s["airline_code"] for s in segments if s.get("airline_code")}),
        "interline": "INTERLINE_FLIGHT" in pflags,
        "multi_ticket": ("TRANSFER_MULTIPLE_TICKET" in tagkeys
                         or "TRANSFER_SPLICING_MULTIPLE_TICKETS" in pflags
                         or "NON_INTERLINE_FLIGHT" in pflags),
        "checked_bag_included": ("FREE_CHECKED_BAGGAGE" in pflags or "FREE_CHECKED_BAGGAGE" in tagkeys),
        "hand_bag_included": ("FREE_CARRY_ON_BAGGAGE" in pflags or "FREE_CARRY_ON_BAGGAGE" in tagkeys),  # ← 新
        "is_lcc": "LCC" in pflags,
        "is_student": "STUDENT" in tagkeys,
    }


def hard_filter(offer, cons):
    """按 constraints 硬过滤。返回 (passes, reasons)。"""
    reasons = []
    if offer["price"] is None:
        reasons.append("无价格")
    if offer["stops"] is not None and offer["stops"] > cons["max_stops"]:
        reasons.append(f"中转 {offer['stops']} 次（上限 {cons['max_stops']}）")
    if cons.get("require_through_ticket") and (offer["multi_ticket"] or not offer["interline"]):
        reasons.append("非联程（拼接票/自行换乘）")
    if cons.get("min_checked_bags", 0) >= 1 and not offer["checked_bag_included"]:
        reasons.append("不含托运行李额")
    if cons.get("require_hand_bag") and not offer["hand_bag_included"]:
        reasons.append("不含手提行李")
    if cons.get("no_overnight") and offer["overnight_layover"]:
        reasons.append("含过夜中转")
    bad_air = set(offer["transfer_airports"]) & set(cons.get("exclude_transfer_airports", []))
    if bad_air:
        reasons.append(f"经停避开地 {','.join(sorted(bad_air))}")
    bad_al = set(offer["airline_codes"]) & MIDDLE_EAST_AIRLINE_CODES
    if bad_al:
        reasons.append(f"含中东航司 {','.join(sorted(bad_al))}")
    maxlay = cons.get("max_layover_hours", 99) * 60
    for lay in offer["layovers_min"]:
        if lay is not None and lay > maxlay:
            reasons.append(f"中转停留 {lay // 60}h{lay % 60}m 超 {cons['max_layover_hours']}h")
    maxdur = cons.get("max_total_duration_hours")
    dur = offer["total_duration_min"]
    if maxdur and dur and dur > maxdur * 60:
        reasons.append(f"全程 {dur // 60}h{dur % 60}m 超 {maxdur}h")
    if not _time_in_window(offer["dep_time"], cons.get("dep_time_window")):
        reasons.append("出发时刻不在时间窗内")
    if not _time_in_window(offer["arr_time"], cons.get("arr_time_window")):
        reasons.append("到达时刻不在时间窗内")
    return (not reasons), reasons


def _process_search(itineraries, airline_map, cons):
    offers = []
    for it in itineraries:
        try:
            offers.append(parse_offer(it, airline_map))
        except Exception:
            continue
    priced = [o for o in offers if o["price"] is not None]
    passed, rejected = [], []
    for o in priced:
        ok, reasons = hard_filter(o, cons)
        (passed if ok else rejected).append(o if ok else {**o, "reject_reasons": reasons})
    passed.sort(key=lambda o: o["price"])
    rejected.sort(key=lambda o: o["price"])
    cheapest_rejected = None
    if rejected:
        r = rejected[0]
        cheapest_rejected = {"price": r["price"], "stops": r["stops"],
                             "airlines": r["airlines"], "reject_reasons": r["reject_reasons"]}
    return passed[:KEEP_TOP_N], cheapest_rejected, len(priced)


# ─────────────────────────── 入口：CLI 约定的 run ───────────────────────────

def run(cfg, out_path, log=print):
    from playwright.sync_api import sync_playwright
    cons = cfg["constraints"]
    qty = cfg.get("passengers", 1)
    cls = cfg.get("cabin_class", "ys")
    triptype = cfg.get("trip_type", "ow")
    if triptype == "rt":
        log("往返需返程日期（当前配置未含返程日选择）——本轮按单程抓取")
        triptype = "ow"
    origins = cfg["routes"]["origins"]
    dests = cfg["routes"]["destinations"]
    dates = cfg["dates"]

    searches, route_calendars = [], {}
    with sync_playwright() as pw:
        browser, ctx = _new_browser(pw)
        try:
            for o in origins:
                for d in dests:
                    rk = f"{o['code']}-{d['code']}"
                    for date in dates:
                        want_cal = rk not in route_calendars
                        rec = {"origin": o["code"], "origin_name": o.get("name", o["code"]),
                               "dest": d["code"], "dest_name": d.get("name", d["code"]),
                               "date": date, "status": "ok", "offers": [],
                               "cheapest_rejected": None, "total_priced": 0,
                               "search_url": TRIP_URL.format(dcity=o["code"].lower(),
                                                             acity=d["code"].lower(), ddate=date,
                                                             tt=triptype, cls=cls, qty=qty)}
                        try:
                            itins, amap, cal, st = fetch_itineraries(
                                ctx, o["code"], d["code"], date, cls, triptype, qty, want_cal)
                            if cal and rk not in route_calendars:
                                route_calendars[rk] = cal
                            if st != "ok":
                                rec["status"] = st
                            else:
                                passed, cheap, total = _process_search(itins, amap, cons)
                                rec["offers"], rec["cheapest_rejected"], rec["total_priced"] = passed, cheap, total
                                if not passed:
                                    rec["status"] = "no_compliant_offer"
                        except Exception as e:
                            rec["status"] = f"error:{str(e)[:120]}"
                        log(f"{o['code']}→{d['code']} {date}: {rec['status']}"
                            f"（合规 {len(rec['offers'])} / 共 {rec['total_priced']}）")
                        searches.append(rec)
                        time.sleep(random.uniform(3, 7))
        finally:
            ctx.close()
            browser.close()

    out = {"scraped_at": datetime.now(timezone.utc).isoformat(), "site": "trip.com",
           "search_count": len(searches),
           "ok_count": sum(1 for s in searches if s["offers"]),
           "blocked_count": sum(1 for s in searches if s["status"] == "blocked"),
           "searches": searches, "route_calendars": route_calendars}
    Path(out_path).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"抓取完成：{out['ok_count']}/{len(searches)} 个搜索有合规航班，"
        f"{out['blocked_count']} 疑似被拦，{len(route_calendars)} 条航线拿到日历")
    return out
