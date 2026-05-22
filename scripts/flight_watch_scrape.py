#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""锆铌·机票监控 —— Trip.com 抓取层。由 flight_watch.sh 调用。

模式：
  probe <dcity> <acity> <date>   单次搜索，把抓到的航班列表 dump 到 debug 目录（排障 / 接口改版核对用）。
  run                            读 config.json，遍历所有 航线×日期 抓取+硬过滤，
                                 结果写 /tmp/flight_watch_results.json，供 claude 那层判断。

抓取手法：用 Playwright 开 Trip.com 的 showfarefirst 结果页，拦截页面自己发出的两个接口：
  - FlightListSearchSSE     航班全量列表（事件流）—— 解析出每条 itinerary 做硬过滤
  - GetLowPriceInCalender   该航线未来 ~170 天的每日最低价 —— 每条航线抓一次，
                            给 claude 做「价格趋势 / 淡旺季」分析（见 prompt 改进 3）

列表 JSON 里 stops / 联程 / 托运行李 等硬性字段都是现成的，本脚本直接做硬过滤；
「便宜到值不值得抢」「趋势」的判断留给 claude 那层。

抓不到时如实记 status（blocked / no_data / error），绝不静默。
依赖：Playwright，装在 ~/.config/zirconeey-flight-watch/venv。
"""
import json
import sys
import time
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

CONFIG_PATH = Path.home() / ".config" / "zirconeey-flight-watch" / "config.json"
DEBUG_DIR = Path.home() / ".config" / "zirconeey-flight-watch" / "debug"
RESULTS_PATH = Path("/tmp/flight_watch_results.json")

# Trip.com 国际站结果页。dcity/acity 用小写城市码，ddate=出发日，class=ys 经济舱，triptype=ow 单程。
TRIP_URL = ("https://us.trip.com/flights/showfarefirst"
            "?dcity={dcity}&acity={acity}&ddate={ddate}"
            "&triptype=ow&class=ys&quantity={qty}&curr=USD&locale=en-US")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

# 中东航司 IATA 代码（与城市码互为冗余保险）
MIDDLE_EAST_AIRLINE_CODES = {"QR", "TK", "EK", "EY", "SV", "WY", "GF", "KU", "IR", "J2", "G9", "FZ"}

KEEP_TOP_N = 5           # 每个搜索保留最便宜的几条「合规」offer


def log(msg):
    print(f"[scrape] {msg}", file=sys.stderr, flush=True)


def load_config():
    if not CONFIG_PATH.exists():
        sys.exit(f"配置不存在：{CONFIG_PATH}")
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


# ─────────────────────────── Playwright 抓取 ───────────────────────────

def _new_browser(pw):
    browser = pw.chromium.launch(
        headless=True,
        args=["--disable-blink-features=AutomationControlled",
              "--disable-dev-shm-usage", "--no-sandbox"],
    )
    ctx = browser.new_context(
        user_agent=UA,
        viewport={"width": 1440, "height": 900},
        locale="en-US",
        timezone_id="America/New_York",
    )
    ctx.add_init_script(
        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});")
    return browser, ctx


def _click_search(page):
    """主动点「Search」按钮强制触发航班搜索。

    showfarefirst 页有时只加载日历、不自动发起列表搜索（疑似 A/B 分桶），
    点一下 Search 能稳定触发。best-effort，点不到也不报错。"""
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
    """轮询等 SSE 响应被 on_response 收下。收到后再多等一轮让分批结果补齐。"""
    for _ in range(rounds):
        time.sleep(2.5)
        if bodies:
            time.sleep(4)
            return True
    return False


def _parse_calendar(body):
    """解析 GetLowPriceInCalender 响应 → {date_iso: lowest_price}。

    dDate 是「中国本地零点」的 epoch 秒，加 8 小时再取日期才对得上。
    这些价是日历上的「最低价」（可能含被淘汰的拼接票），仅作趋势 / 淡旺季的形状参考。"""
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


def fetch_itineraries(ctx, dcity, acity, ddate, qty=1, want_calendar=False):
    """开一次搜索页，回收 FlightListSearchSSE 的 itineraryList（want_calendar 时连价格日历一起）。

    返回 (itinerary_list, airline_map, calendar, status)。
    calendar: {date_iso: lowest_price} 或 None。
    status: ok / no_data / blocked / error:<msg>
    """
    page = ctx.new_page()
    bodies, cal_bodies = [], []

    def on_response(resp):
        u = resp.url
        if "FlightListSearchSSE" in u:
            try:
                bodies.append(resp.body())
            except Exception as e:
                log(f"  读 SSE body 失败：{e}")
        elif want_calendar and "GetLowPriceInCalender" in u:
            try:
                cal_bodies.append(resp.body())
            except Exception:
                pass

    page.on("response", on_response)
    url = TRIP_URL.format(dcity=dcity.lower(), acity=acity.lower(), ddate=ddate, qty=qty)
    status = "ok"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        time.sleep(3)
        _click_search(page)                 # 主动触发
        if not _wait_for_sse(bodies, 22):    # 最多等 ~55s
            _click_search(page)              # 没动静再触发一次
            _wait_for_sse(bodies, 12)
        if not bodies:
            # 没拿到搜索响应 —— 看页面是不是被验证码 / 风控拦了
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

    # 合并所有 SSE 批次的 itineraryList，按 uniqueId 去重
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
    """policyFlags / journeyFlags 的元素可能是 str 也可能是 {'key':...}，统一成 set。"""
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


def parse_offer(it, airline_map):
    """把一条原始 itinerary 收敛成统一 offer dict。"""
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
            "flight_no": fi.get("flightNo"), "duration_min": s.get("duration"),
        })

    transfers = [s["to"] for s in segments[:-1]]
    transfer_cities = [(s.get("arrivePoint") or {}).get("cityName")
                       for s in flight_secs[:-1]]
    stops = max(len(segments) - 1, 0)

    # 中转停留时长 + 过夜判定（中转区间跨任一日的 01:00–05:00 即算过夜）
    layovers, overnight = [], False
    for i in range(len(segments) - 1):
        arr = _parse_dt(segments[i]["arr"])
        dep = _parse_dt(segments[i + 1]["dep"])
        if arr and dep and dep > arr:
            layovers.append(int((dep - arr).total_seconds() // 60))
            for dayoff in range((dep.date() - arr.date()).days + 1):
                base = datetime.combine(arr.date() + timedelta(days=dayoff),
                                        datetime.min.time())
                if arr < base.replace(hour=5) and dep > base.replace(hour=1):
                    overnight = True
        else:
            layovers.append(None)

    return {
        "price": price,
        "stops": stops,
        "segments": segments,
        "transfer_airports": transfers,
        "transfer_cities": transfer_cities,
        "layovers_min": layovers,
        "overnight_layover": overnight,
        "total_duration_min": journey.get("duration"),
        "dep_time": segments[0]["dep"] if segments else None,
        "arr_time": segments[-1]["arr"] if segments else None,
        "arr_airport": segments[-1]["to"] if segments else None,
        "airlines": sorted({s["airline"] for s in segments if s.get("airline")}),
        "airline_codes": sorted({s["airline_code"] for s in segments if s.get("airline_code")}),
        # 硬过滤要用的显式布尔
        "interline": "INTERLINE_FLIGHT" in pflags,
        "multi_ticket": ("TRANSFER_MULTIPLE_TICKET" in tagkeys
                         or "TRANSFER_SPLICING_MULTIPLE_TICKETS" in pflags
                         or "NON_INTERLINE_FLIGHT" in pflags),
        "checked_bag_included": ("FREE_CHECKED_BAGGAGE" in pflags
                                 or "FREE_CHECKED_BAGGAGE" in tagkeys),
        "is_lcc": "LCC" in pflags,
    }


def hard_filter(offer, cons):
    """按 config 的 constraints 做硬过滤。返回 (passes:bool, reasons:list[str])。

    注意：过夜中转、2 中转 已不在硬过滤里 —— 它们交给 claude 那层按软性偏好权衡。
    硬过滤只拦：3+ 中转、非联程、无托运、中东转、单段中转 >12h、全程 >34h。"""
    reasons = []
    if offer["price"] is None:
        reasons.append("无价格")
    if offer["stops"] is not None and offer["stops"] > cons["max_stops"]:
        reasons.append(f"中转 {offer['stops']} 次（上限 {cons['max_stops']}）")
    if cons.get("require_through_ticket"):
        if offer["multi_ticket"] or not offer["interline"]:
            reasons.append("非联程（拼接票/自行换乘）")
    if cons.get("min_checked_bags", 0) >= 1 and not offer["checked_bag_included"]:
        reasons.append("不含托运行李额")
    bad_air = set(offer["transfer_airports"]) & set(cons.get("exclude_transfer_airports", []))
    if bad_air:
        reasons.append(f"经停中东机场 {','.join(sorted(bad_air))}")
    bad_al = set(offer["airline_codes"]) & MIDDLE_EAST_AIRLINE_CODES
    if bad_al:
        reasons.append(f"含中东航司 {','.join(sorted(bad_al))}")
    maxlay = cons.get("max_layover_hours", 99) * 60
    for lay in offer["layovers_min"]:
        if lay is not None and lay > maxlay:
            reasons.append(f"中转停留 {lay // 60}h{lay % 60}m 超过 {cons['max_layover_hours']}h")
    maxdur = cons.get("max_total_duration_hours")
    dur = offer["total_duration_min"]
    if maxdur and dur and dur > maxdur * 60:
        reasons.append(f"全程 {dur // 60}h{dur % 60}m 超过 {maxdur}h")
    return (not reasons), reasons


# ─────────────────────────── 入口 ───────────────────────────

def _process_search(itineraries, airline_map, cons):
    """解析 + 硬过滤一个搜索的所有 itinerary。返回 (合规offers_topN, 最便宜被淘汰的, 总数)。"""
    offers = []
    for it in itineraries:
        try:
            offers.append(parse_offer(it, airline_map))
        except Exception as e:
            log(f"  解析一条 itinerary 失败：{e}")
    priced = [o for o in offers if o["price"] is not None]
    passed, rejected = [], []
    for o in priced:
        ok, reasons = hard_filter(o, cons)
        if ok:
            passed.append(o)
        else:
            o["reject_reasons"] = reasons
            rejected.append(o)
    passed.sort(key=lambda o: o["price"])
    rejected.sort(key=lambda o: o["price"])
    cheapest_rejected = None
    if rejected:
        r = rejected[0]
        cheapest_rejected = {"price": r["price"], "stops": r["stops"],
                             "airlines": r["airlines"],
                             "reject_reasons": r["reject_reasons"]}
    return passed[:KEEP_TOP_N], cheapest_rejected, len(priced)


def cmd_run():
    from playwright.sync_api import sync_playwright
    cfg = load_config()
    cons = cfg["constraints"]
    qty = cfg.get("passengers", 1)
    origins = cfg["routes"]["origins"]
    dests = cfg["routes"]["destinations"]
    dates = cfg["dates"]

    searches = []
    route_calendars = {}            # {origin-dest: {date_iso: lowest_price}}
    with sync_playwright() as pw:
        browser, ctx = _new_browser(pw)
        try:
            for o in origins:
                for d in dests:
                    route_key = f"{o['code']}-{d['code']}"
                    for date in dates:
                        # 该航线还没拿到价格日历 → 这次顺便抓（每条航线只需一次）
                        want_cal = route_key not in route_calendars
                        rec = {"origin": o["code"], "origin_name": o["name"],
                               "dest": d["code"], "dest_name": d["name"],
                               "date": date, "status": "ok",
                               "search_url": TRIP_URL.format(dcity=o["code"].lower(),
                                                             acity=d["code"].lower(),
                                                             ddate=date, qty=qty),
                               "offers": [], "cheapest_rejected": None,
                               "total_priced": 0}
                        try:
                            itins, amap, cal, st = fetch_itineraries(
                                ctx, o["code"], d["code"], date, qty, want_calendar=want_cal)
                            if cal and route_key not in route_calendars:
                                route_calendars[route_key] = cal
                            if st != "ok":
                                rec["status"] = st
                            else:
                                passed, cheap_rej, total = _process_search(itins, amap, cons)
                                rec["offers"] = passed
                                rec["cheapest_rejected"] = cheap_rej
                                rec["total_priced"] = total
                                if not passed:
                                    rec["status"] = "no_compliant_offer"
                        except Exception as e:
                            rec["status"] = f"error:{str(e)[:120]}"
                        log(f"{o['code']}→{d['code']} {date}: {rec['status']} "
                            f"（合规 {len(rec['offers'])} / 共 {rec['total_priced']}）")
                        searches.append(rec)
                        time.sleep(random.uniform(3, 7))
        finally:
            ctx.close()
            browser.close()

    out = {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "site": "trip.com",
        "search_count": len(searches),
        "ok_count": sum(1 for s in searches if s["offers"]),
        "blocked_count": sum(1 for s in searches if s["status"] == "blocked"),
        "searches": searches,
        "route_calendars": route_calendars,
        "_calendars_note": "每条航线未来 ~170 天的每日最低价（含被淘汰的拼接票，仅作趋势/淡旺季形状参考）",
    }
    RESULTS_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"写出 {RESULTS_PATH}：{out['ok_count']}/{len(searches)} 个搜索有合规航班，"
        f"{out['blocked_count']} 个疑似被拦，{len(route_calendars)} 条航线拿到价格日历")


def cmd_probe(dcity, acity, ddate):
    from playwright.sync_api import sync_playwright
    cfg = load_config()
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    with sync_playwright() as pw:
        browser, ctx = _new_browser(pw)
        try:
            itins, amap, cal, st = fetch_itineraries(
                ctx, dcity, acity, ddate, want_calendar=True)
        finally:
            ctx.close()
            browser.close()
    log(f"probe {dcity}→{acity} {ddate}: status={st}, {len(itins)} 条原始 itinerary, "
        f"价格日历 {len(cal or {})} 天")
    if not itins:
        return
    passed, cheap_rej, total = _process_search(itins, amap, cfg["constraints"])
    out = {"status": st, "raw_count": len(itins), "total_priced": total,
           "compliant": passed, "cheapest_rejected": cheap_rej, "calendar": cal}
    p = DEBUG_DIR / f"probe_{dcity}_{acity}_{ddate}_{stamp}.json"
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"合规 {len(passed)} 条 / 共 {total} 条已定价。详情 → {p}")
    for o in passed[:3]:
        log(f"  ${o['price']}  {'-'.join([o['segments'][0]['from']] + o['transfer_airports'] + [o['arr_airport']])}  "
            f"{'/'.join(o['airlines'])}  {o['stops']}转  {o['total_duration_min']}min")
    if cheap_rej:
        log(f"  （最便宜但被淘汰：${cheap_rej['price']} — {'；'.join(cheap_rej['reject_reasons'])}）")


def main():
    if len(sys.argv) < 2:
        sys.exit("用法：flight_watch_scrape.py probe <dcity> <acity> <date> | run")
    mode = sys.argv[1]
    if mode == "probe":
        if len(sys.argv) != 5:
            sys.exit("用法：flight_watch_scrape.py probe <dcity> <acity> <date>")
        cmd_probe(sys.argv[2], sys.argv[3], sys.argv[4])
    elif mode == "run":
        cmd_run()
    else:
        sys.exit(f"未知模式：{mode}")


if __name__ == "__main__":
    main()
