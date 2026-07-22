#!/usr/bin/env python3
"""Reproduce the quantitative figures for four-way-stop-vs-signal.md.

The model is deliberately transparent rather than a replacement for the HCM.
Arrivals are independent Poisson processes on four single-lane approaches.
The AWSC controller uses empirical departure-headway cases reported by Kyte
(1990): roughly 3.7, 5.7, 6.5, and 8.4 seconds for one through four occupied
approach configurations.  A service event may release compatible opposing
movements together.  The fixed signal uses a 70-second, two-phase cycle,
8 seconds of total clearance/lost time, demand-proportional green splits, and
a 2.0-second saturation headway.  Turning shares are 10% left, 80% through,
10% right unless changed below.

This is a stylized Monte Carlo experiment calibrated to published headways.
It is not an implementation of the proprietary HCM procedure and should not
be used for engineering design.
"""

from __future__ import annotations

import csv
import math
import random
import statistics
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "assets" / "images" / "life" / "four-way-stop"
DATA_DIR = ROOT / "files" / "life" / "four-way-stop"

APPROACHES = range(4)  # N, S, E, W; N/S are the major street.
OPPOSITE = {0: 1, 1: 0, 2: 3, 3: 2}
WARMUP = 15 * 60
HORIZON = 75 * 60
MEASURE = HORIZON - WARMUP
TURN_SHARES = (0.10, 0.80, 0.10)  # left, through, right
HEADWAY_CASE_MEANS = {1: 3.7, 2: 5.7, 3: 6.5, 4: 8.4}
HEADWAY_CV = 0.15
SIGNAL_CYCLE = 70.0
SIGNAL_LOST_TOTAL = 8.0
SIGNAL_HEADWAY = 2.0
SIGNAL_STARTUP = 2.0


@dataclass(frozen=True)
class Vehicle:
    arrival: float
    approach: int
    turn: str


@dataclass
class RunResult:
    mean_delay: float
    p95_delay: float
    throughput: float
    end_queue: int
    max_approach_delay: float
    delay_gini: float


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    x = sorted(values)
    pos = (len(x) - 1) * p
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return x[lo]
    return x[lo] * (hi - pos) + x[hi] * (pos - lo)


def gini(values: list[float]) -> float:
    vals = sorted(max(0.0, x) for x in values)
    if not vals or sum(vals) == 0:
        return 0.0
    n = len(vals)
    weighted = sum((i + 1) * x for i, x in enumerate(vals))
    return 2 * weighted / (n * sum(vals)) - (n + 1) / n


def lognormal_with_mean(rng: random.Random, mean: float, cv: float) -> float:
    sigma2 = math.log(1 + cv * cv)
    sigma = math.sqrt(sigma2)
    mu = math.log(mean) - sigma2 / 2
    return rng.lognormvariate(mu, sigma)


def choose_turn(rng: random.Random) -> str:
    u = rng.random()
    if u < TURN_SHARES[0]:
        return "L"
    if u < TURN_SHARES[0] + TURN_SHARES[1]:
        return "T"
    return "R"


def rates(total_flow: float, major_share: float) -> list[float]:
    major_each = total_flow * major_share / 2
    minor_each = total_flow * (1 - major_share) / 2
    return [major_each, major_each, minor_each, minor_each]


def generate_arrivals(
    total_flow: float,
    major_share: float,
    seed: int,
    rate_multiplier: Callable[[float], float] | None = None,
) -> list[list[Vehicle]]:
    rng = random.Random(seed)
    base = rates(total_flow, major_share)
    result: list[list[Vehicle]] = [[] for _ in APPROACHES]
    for approach in APPROACHES:
        t = 0.0
        # Thinning handles the optional time-varying peak profile.
        max_rate = base[approach] * (max(1.0, rate_multiplier(0.0)) if rate_multiplier else 1.0)
        if rate_multiplier:
            max_rate = base[approach] * 5.0
        while t < HORIZON:
            t += rng.expovariate(max_rate / 3600)
            if t >= HORIZON:
                break
            mult = rate_multiplier(t) if rate_multiplier else 1.0
            if rng.random() <= (base[approach] * mult) / max_rate:
                result[approach].append(Vehicle(t, approach, choose_turn(rng)))
    return result


def opposing_movements_compatible(a: Vehicle, b: Vehicle) -> bool:
    # Opposing streams can commonly move together; a left turn conflicts with
    # the opposing through/right movement in this simplified one-lane model.
    return not ((a.turn == "L") ^ (b.turn == "L"))


def summarize(
    arrivals: list[list[Vehicle]],
    departure_times: dict[Vehicle, float],
    end_queue: int,
) -> RunResult:
    delays: list[float] = []
    by_approach: list[list[float]] = [[] for _ in APPROACHES]
    completed = 0
    for stream in arrivals:
        for vehicle in stream:
            if vehicle.arrival < WARMUP:
                continue
            depart = departure_times.get(vehicle)
            if depart is None or depart > HORIZON:
                delay = HORIZON - vehicle.arrival  # right-censored lower bound
            else:
                delay = max(0.0, depart - vehicle.arrival)
                completed += 1
            delays.append(delay)
            by_approach[vehicle.approach].append(delay)
    approach_means = [statistics.fmean(x) if x else 0.0 for x in by_approach]
    return RunResult(
        mean_delay=statistics.fmean(delays) if delays else 0.0,
        p95_delay=percentile(delays, 0.95),
        throughput=completed / (MEASURE / 3600),
        end_queue=end_queue,
        max_approach_delay=max(approach_means),
        delay_gini=gini(approach_means),
    )


def simulate_awsc(arrivals: list[list[Vehicle]], seed: int) -> RunResult:
    rng = random.Random(seed + 100_000)
    queues = [deque() for _ in APPROACHES]
    indices = [0, 0, 0, 0]
    departure_times: dict[Vehicle, float] = {}
    next_service = math.inf
    t = 0.0

    def next_arrival() -> tuple[float, int]:
        choices = [
            (arrivals[a][indices[a]].arrival, a)
            for a in APPROACHES
            if indices[a] < len(arrivals[a])
        ]
        return min(choices) if choices else (math.inf, -1)

    while True:
        arrival_time, arrival_approach = next_arrival()
        event_time = min(arrival_time, next_service)
        if event_time > HORIZON or math.isinf(event_time):
            break
        t = event_time
        if arrival_time <= next_service:
            vehicle = arrivals[arrival_approach][indices[arrival_approach]]
            indices[arrival_approach] += 1
            was_empty = not any(queues)
            queues[arrival_approach].append(vehicle)
            if was_empty:
                next_service = t + lognormal_with_mean(
                    rng, HEADWAY_CASE_MEANS[1], HEADWAY_CV
                )
            continue

        active = [a for a in APPROACHES if queues[a]]
        if not active:
            next_service = math.inf
            continue
        chosen = min(active, key=lambda a: queues[a][0].arrival)
        first = queues[chosen].popleft()
        departure_times[first] = t

        opposite = OPPOSITE[chosen]
        if len(active) == 2 and queues[opposite] and opposing_movements_compatible(first, queues[opposite][0]):
            second = queues[opposite].popleft()
            departure_times[second] = t

        occupied_before = len(active)
        remaining = [a for a in APPROACHES if queues[a]]
        if not remaining:
            next_service = math.inf
        else:
            # The published headway is per approach. Dividing by the number of
            # occupied approaches converts it to the interval between global
            # right-of-way service events under rotating/FCFS use.
            mean_interval = HEADWAY_CASE_MEANS[occupied_before] / occupied_before
            next_service = t + lognormal_with_mean(rng, mean_interval, HEADWAY_CV)

    end_queue = sum(len(q) for q in queues)
    for a in APPROACHES:
        end_queue += len(arrivals[a]) - indices[a]
    return summarize(arrivals, departure_times, end_queue)


def signal_plan(major_share: float) -> tuple[float, float]:
    effective = SIGNAL_CYCLE - SIGNAL_LOST_TOTAL
    major_green = max(10.0, min(effective - 10.0, effective * major_share))
    return major_green, effective - major_green


def service_slots(approach: int, major_share: float) -> Iterable[float]:
    major_green, minor_green = signal_plan(major_share)
    cycle_start = 0.0
    while cycle_start < HORIZON:
        if approach < 2:
            green_start = cycle_start
            green_end = green_start + major_green
        else:
            green_start = cycle_start + major_green + SIGNAL_LOST_TOTAL / 2
            green_end = green_start + minor_green
        slot = green_start + SIGNAL_STARTUP
        while slot < green_end:
            yield slot
            slot += SIGNAL_HEADWAY
        cycle_start += SIGNAL_CYCLE


def simulate_signal(arrivals: list[list[Vehicle]], major_share: float) -> RunResult:
    departure_times: dict[Vehicle, float] = {}
    end_queue = 0
    for approach in APPROACHES:
        queue: deque[Vehicle] = deque()
        stream = arrivals[approach]
        idx = 0
        for slot in service_slots(approach, major_share):
            while idx < len(stream) and stream[idx].arrival <= slot:
                queue.append(stream[idx])
                idx += 1
            if queue:
                departure_times[queue.popleft()] = slot
        while idx < len(stream) and stream[idx].arrival <= HORIZON:
            queue.append(stream[idx])
            idx += 1
        end_queue += len(queue)
    return summarize(arrivals, departure_times, end_queue)


def run_replications(total_flow: int, major_share: float, reps: int = 40) -> dict[str, list[RunResult]]:
    out = {"AWSC": [], "Signal": []}
    for rep in range(reps):
        seed = total_flow * 10_000 + round(major_share * 100) * 100 + rep
        arrivals = generate_arrivals(total_flow, major_share, seed)
        out["AWSC"].append(simulate_awsc(arrivals, seed))
        out["Signal"].append(simulate_signal(arrivals, major_share))
    return out


def mean_ci(values: list[float]) -> tuple[float, float, float]:
    mean = statistics.fmean(values)
    if len(values) < 2:
        return mean, mean, mean
    se = statistics.stdev(values) / math.sqrt(len(values))
    return mean, mean - 1.96 * se, mean + 1.96 * se


def escape(text: object) -> str:
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def svg_shell(width: int, height: int, body: str, title: str, desc: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title>
<desc id="desc">{escape(desc)}</desc>
<style>
text{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif;fill:#28313b}}
.muted{{fill:#66717d}} .axis{{stroke:#66717d;stroke-width:1}} .grid{{stroke:#d8dde3;stroke-width:1}}
.awsc{{stroke:#c65d4b;fill:none}} .signal{{stroke:#347d67;fill:none}}
.awsc-fill{{fill:#c65d4b}} .signal-fill{{fill:#347d67}} .surge{{fill:#b58a35}}
@media(prefers-color-scheme:dark){{
  text{{fill:#f2f0eb}} .muted{{fill:#c5c8cc}} .axis{{stroke:#c5c8cc}} .grid{{stroke:#555b63}}
  .awsc{{stroke:#ef8c78}} .signal{{stroke:#65b99d}} .awsc-fill{{fill:#ef8c78}} .signal-fill{{fill:#65b99d}} .surge{{fill:#d8b566}}
}}
</style>
{body}
</svg>
'''


def line_path(points: list[tuple[float, float]]) -> str:
    return " ".join(("M" if i == 0 else "L") + f"{x:.1f},{y:.1f}" for i, (x, y) in enumerate(points))


def make_delay_figure(rows: list[dict[str, object]]) -> None:
    width, height = 760, 520
    panels = [(0.5, 55, "四向均衡：主路占 50%"), (0.8, 400, "明显偏流：主路占 80%")]
    left, panel_w, top, panel_h = 65, 285, 55, 360
    ymax = 300.0
    chunks = [f'<text x="{width/2}" y="24" text-anchor="middle" font-size="16" font-weight="600">平均延误随总流量变化</text>']
    for share, x0, label in panels:
        chunks.append(f'<text x="{x0 + panel_w/2}" y="45" text-anchor="middle" font-size="13">{label}</text>')
        for tick in [0, 75, 150, 225, 300]:
            y = top + panel_h - tick / ymax * panel_h
            chunks.append(f'<line class="grid" x1="{x0}" y1="{y:.1f}" x2="{x0+panel_w}" y2="{y:.1f}"/>')
            if x0 == panels[0][1]:
                chunks.append(f'<text class="muted" x="{x0-8}" y="{y+4:.1f}" text-anchor="end" font-size="11">{tick}</text>')
        chunks.append(f'<line class="axis" x1="{x0}" y1="{top}" x2="{x0}" y2="{top+panel_h}"/>')
        chunks.append(f'<line class="axis" x1="{x0}" y1="{top+panel_h}" x2="{x0+panel_w}" y2="{top+panel_h}"/>')
        subset = [r for r in rows if r["major_share"] == share]
        for mode, css in [("AWSC", "awsc"), ("Signal", "signal")]:
            pts = []
            upper = []
            lower = []
            for r in subset:
                if r["mode"] != mode:
                    continue
                x = x0 + (int(r["total_flow"]) - 200) / 2400 * panel_w
                y = top + panel_h - min(ymax, float(r["mean_delay"])) / ymax * panel_h
                yu = top + panel_h - min(ymax, float(r["ci_high"])) / ymax * panel_h
                yl = top + panel_h - min(ymax, float(r["ci_low"])) / ymax * panel_h
                pts.append((x, y)); upper.append((x, yu)); lower.append((x, yl))
            polygon = upper + list(reversed(lower))
            fill_class = "awsc-fill" if mode == "AWSC" else "signal-fill"
            chunks.append(f'<path d="{line_path(polygon)} Z" class="{fill_class}" opacity="0.12"/>')
            chunks.append(f'<path d="{line_path(pts)}" class="{css}" stroke-width="2.5"/>')
        for flow in [200, 800, 1400, 2000, 2600]:
            x = x0 + (flow - 200) / 2400 * panel_w
            chunks.append(f'<text class="muted" x="{x:.1f}" y="{top+panel_h+18}" text-anchor="middle" font-size="10">{flow}</text>')
    chunks += [
        '<text class="muted" x="17" y="235" transform="rotate(-90 17 235)" text-anchor="middle" font-size="12">平均控制延误（秒/辆）</text>',
        '<text class="muted" x="355" y="462" text-anchor="middle" font-size="12">总进入流量（辆/小时）</text>',
        '<line class="awsc" x1="245" y1="493" x2="275" y2="493" stroke-width="3"/><text x="282" y="497" font-size="12">四向停车</text>',
        '<line class="signal" x1="395" y1="493" x2="425" y2="493" stroke-width="3"/><text x="432" y="497" font-size="12">定时信号</text>',
        '<text class="muted" x="660" y="497" text-anchor="end" font-size="10">阴影：95% Monte Carlo CI</text>',
    ]
    svg = svg_shell(width, height, "".join(chunks), "四向停车与信号灯的平均延误曲线", "平衡和偏流两种需求结构下，平均控制延误随总进入流量变化，并显示百分之九十五蒙特卡洛置信区间。")
    (IMAGE_DIR / "delay-curves.svg").write_text(svg, encoding="utf-8")


def make_phase_map(rows: list[dict[str, object]]) -> None:
    width, height = 760, 500
    left, top, cell_w, cell_h = 74, 48, 50, 48
    flows = list(range(200, 2601, 200))
    shares = [0.9, 0.8, 0.7, 0.6, 0.5]
    lookup = {(int(r["total_flow"]), float(r["major_share"]), str(r["mode"])): float(r["mean_delay"]) for r in rows}
    chunks = ['<text x="380" y="24" text-anchor="middle" font-size="16" font-weight="600">哪种控制方式的平均延误更低？</text>']
    for yi, share in enumerate(shares):
        y = top + yi * cell_h
        chunks.append(f'<text class="muted" x="{left-12}" y="{y+29}" text-anchor="end" font-size="11">{int(share*100)}%</text>')
        for xi, flow in enumerate(flows):
            x = left + xi * cell_w
            a = lookup[(flow, share, "AWSC")]
            s = lookup[(flow, share, "Signal")]
            diff = a - s
            winner = "AWSC" if diff < 0 else "Signal"
            klass = "awsc-fill" if winner == "AWSC" else "signal-fill"
            chunks.append(f'<rect x="{x}" y="{y}" width="{cell_w-2}" height="{cell_h-2}" rx="3" class="{klass}" opacity="0.30"/>')
            symbol = "停" if winner == "AWSC" else "灯"
            chunks.append(f'<text x="{x+(cell_w-2)/2}" y="{y+22}" text-anchor="middle" font-size="13" font-weight="600">{symbol}</text>')
            chunks.append(f'<text x="{x+(cell_w-2)/2}" y="{y+37}" text-anchor="middle" font-size="9">{abs(diff):.0f}s</text>')
    for xi, flow in enumerate(flows):
        x = left + xi * cell_w + (cell_w - 2) / 2
        chunks.append(f'<text class="muted" x="{x}" y="{top+len(shares)*cell_h+18}" text-anchor="middle" font-size="10">{flow}</text>')
    chunks += [
        f'<text class="muted" x="{left + len(flows)*cell_w/2}" y="{top+len(shares)*cell_h+48}" text-anchor="middle" font-size="12">总进入流量（辆/小时）</text>',
        f'<text class="muted" x="25" y="{top+len(shares)*cell_h/2}" transform="rotate(-90 25 {top+len(shares)*cell_h/2})" text-anchor="middle" font-size="12">主路流量占比</text>',
        '<rect x="205" y="380" width="15" height="15" rx="2" class="awsc-fill" opacity="0.65"/><text x="228" y="392" font-size="11">停：四向停车胜</text>',
        '<rect x="385" y="380" width="15" height="15" rx="2" class="signal-fill" opacity="0.65"/><text x="408" y="392" font-size="11">灯：信号灯胜</text>',
        '<text class="muted" x="380" y="425" text-anchor="middle" font-size="11">格内秒数 = 两者平均延误之差的绝对值</text>',
        '<text class="muted" x="380" y="451" text-anchor="middle" font-size="10">单车道、Poisson 到达、左/直/右 = 10%/80%/10%，每格 40 次重复</text>',
    ]
    svg = svg_shell(width, height, "".join(chunks), "四向停车与信号灯的选择相图", "横轴为总流量，纵轴为主路流量占比。每个方格显示平均延误较低的控制方式以及延误差。")
    (IMAGE_DIR / "control-phase-map.svg").write_text(svg, encoding="utf-8")


def simulate_peak_profile(mode: str, seed: int) -> list[int]:
    # Baseline 400 veh/h; 20-minute surge at 2,000 veh/h.
    def multiplier(t: float) -> float:
        return 5.0 if 25 * 60 <= t < 45 * 60 else 1.0

    arrivals = generate_arrivals(400, 0.5, seed, multiplier)
    sample_times = [m * 60 for m in range(76)]
    # Reuse the model and reconstruct queue counts from arrival/departure times.
    if mode == "AWSC":
        result_departures = departure_schedule_awsc(arrivals, seed)
    else:
        result_departures = departure_schedule_signal(arrivals, 0.5)
    counts = []
    all_vehicles = [v for stream in arrivals for v in stream]
    for t in sample_times:
        q = sum(1 for v in all_vehicles if v.arrival <= t < result_departures.get(v, math.inf))
        counts.append(q)
    return counts


def departure_schedule_awsc(arrivals: list[list[Vehicle]], seed: int) -> dict[Vehicle, float]:
    # Small wrapper with the same event logic as simulate_awsc, retained here
    # so the time-path figure can count vehicles waiting at each minute.
    rng = random.Random(seed + 100_000)
    queues = [deque() for _ in APPROACHES]
    indices = [0, 0, 0, 0]
    departures: dict[Vehicle, float] = {}
    next_service = math.inf
    while True:
        choices = [(arrivals[a][indices[a]].arrival, a) for a in APPROACHES if indices[a] < len(arrivals[a])]
        arrival_time, approach = min(choices) if choices else (math.inf, -1)
        t = min(arrival_time, next_service)
        if t > HORIZON or math.isinf(t):
            break
        if arrival_time <= next_service:
            vehicle = arrivals[approach][indices[approach]]
            indices[approach] += 1
            empty = not any(queues)
            queues[approach].append(vehicle)
            if empty:
                next_service = t + lognormal_with_mean(rng, HEADWAY_CASE_MEANS[1], HEADWAY_CV)
            continue
        active = [a for a in APPROACHES if queues[a]]
        chosen = min(active, key=lambda a: queues[a][0].arrival)
        first = queues[chosen].popleft(); departures[first] = t
        opposite = OPPOSITE[chosen]
        if len(active) == 2 and queues[opposite] and opposing_movements_compatible(first, queues[opposite][0]):
            departures[queues[opposite].popleft()] = t
        if any(queues):
            next_service = t + lognormal_with_mean(rng, HEADWAY_CASE_MEANS[len(active)] / len(active), HEADWAY_CV)
        else:
            next_service = math.inf
    return departures


def departure_schedule_signal(arrivals: list[list[Vehicle]], major_share: float) -> dict[Vehicle, float]:
    departures: dict[Vehicle, float] = {}
    for approach in APPROACHES:
        queue: deque[Vehicle] = deque(); idx = 0; stream = arrivals[approach]
        for slot in service_slots(approach, major_share):
            while idx < len(stream) and stream[idx].arrival <= slot:
                queue.append(stream[idx]); idx += 1
            if queue:
                departures[queue.popleft()] = slot
    return departures


def make_peak_figure() -> None:
    width, height = 760, 410
    left, top, plot_w, plot_h = 65, 45, 640, 285
    reps = 40
    series = {}
    for mode in ["AWSC", "Signal"]:
        paths = [simulate_peak_profile(mode, 8_000 + rep) for rep in range(reps)]
        series[mode] = [statistics.fmean(run[m] for run in paths) for m in range(76)]
    ymax = max(max(v) for v in series.values()) * 1.12
    chunks = ['<text x="380" y="22" text-anchor="middle" font-size="16" font-weight="600">20 分钟集中放学后，队伍多久消得掉？</text>']
    for tick in range(0, math.ceil(ymax / 10) * 10 + 1, 10):
        y = top + plot_h - tick / ymax * plot_h
        chunks.append(f'<line class="grid" x1="{left}" y1="{y:.1f}" x2="{left+plot_w}" y2="{y:.1f}"/>')
        chunks.append(f'<text class="muted" x="{left-8}" y="{y+4:.1f}" text-anchor="end" font-size="10">{tick}</text>')
    surge_x1 = left + 25 / 75 * plot_w; surge_x2 = left + 45 / 75 * plot_w
    chunks.append(f'<rect x="{surge_x1:.1f}" y="{top}" width="{surge_x2-surge_x1:.1f}" height="{plot_h}" class="surge" opacity="0.10"/>')
    chunks.append(f'<text x="{(surge_x1+surge_x2)/2:.1f}" y="{top+16}" text-anchor="middle" font-size="10">集中放学：2,000 辆/小时</text>')
    for mode, css in [("AWSC", "awsc"), ("Signal", "signal")]:
        pts = [(left + minute / 75 * plot_w, top + plot_h - q / ymax * plot_h) for minute, q in enumerate(series[mode])]
        chunks.append(f'<path d="{line_path(pts)}" class="{css}" stroke-width="2.7"/>')
    chunks += [
        f'<line class="axis" x1="{left}" y1="{top}" x2="{left}" y2="{top+plot_h}"/><line class="axis" x1="{left}" y1="{top+plot_h}" x2="{left+plot_w}" y2="{top+plot_h}"/>',
        '<text class="muted" x="18" y="190" transform="rotate(-90 18 190)" text-anchor="middle" font-size="12">路口前排队车辆</text>',
        '<text class="muted" x="385" y="370" text-anchor="middle" font-size="12">模拟时间（分钟）</text>',
        '<line class="awsc" x1="255" y1="394" x2="285" y2="394" stroke-width="3"/><text x="292" y="398" font-size="11">四向停车</text>',
        '<line class="signal" x1="405" y1="394" x2="435" y2="394" stroke-width="3"/><text x="442" y="398" font-size="11">定时信号</text>',
    ]
    for tick in [0, 15, 25, 35, 45, 60, 75]:
        x = left + tick / 75 * plot_w
        chunks.append(f'<text class="muted" x="{x:.1f}" y="{top+plot_h+18}" text-anchor="middle" font-size="10">{tick}</text>')
    svg = svg_shell(width, height, "".join(chunks), "高峰冲击下的排队动态", "基础流量为每小时四百辆，第25到45分钟上升至每小时两千辆。曲线显示四十次模拟的平均排队车辆数。")
    (IMAGE_DIR / "peak-queue.svg").write_text(svg, encoding="utf-8")


def main() -> None:
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    flows = list(range(200, 2601, 200))
    shares = [0.5, 0.6, 0.7, 0.8, 0.9]
    rows: list[dict[str, object]] = []
    for share in shares:
        for flow in flows:
            runs = run_replications(flow, share)
            for mode, results in runs.items():
                mean, lo, hi = mean_ci([r.mean_delay for r in results])
                rows.append({
                    "total_flow": flow,
                    "major_share": share,
                    "mode": mode,
                    "mean_delay": round(mean, 3),
                    "ci_low": round(lo, 3),
                    "ci_high": round(hi, 3),
                    "p95_delay": round(statistics.fmean(r.p95_delay for r in results), 3),
                    "throughput": round(statistics.fmean(r.throughput for r in results), 3),
                    "end_queue": round(statistics.fmean(r.end_queue for r in results), 3),
                    "max_approach_delay": round(statistics.fmean(r.max_approach_delay for r in results), 3),
                    "delay_gini": round(statistics.fmean(r.delay_gini for r in results), 4),
                    "replications": len(results),
                })
    fieldnames = list(rows[0])
    with (DATA_DIR / "simulation-results.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader(); writer.writerows(rows)
    make_delay_figure(rows)
    make_phase_map(rows)
    make_peak_figure()

    print("Selected scenarios (mean seconds per vehicle):")
    for share in [0.5, 0.8]:
        for flow in [400, 1200, 1800, 2400]:
            selected = [r for r in rows if r["major_share"] == share and r["total_flow"] == flow]
            values = ", ".join(f'{r["mode"]}={float(r["mean_delay"]):.1f}' for r in selected)
            print(f"  major={share:.1f}, flow={flow}: {values}")


if __name__ == "__main__":
    main()
