#!/usr/bin/env python3
"""Exploratory sensitivity experiments for four-way-stop versus signal control.

This module deliberately separates the published-headway baseline from a set of
stylized counterfactual knobs.  The knobs are not engineering-design defaults:
they ask which mechanisms can move the qualitative boundary and which mostly
change tails, fairness, or a simple conflict-exposure proxy.

Outputs are kept separate from the article's baseline CSV and figures.
"""

from __future__ import annotations

import csv
import math
import random
import statistics
import zlib
from collections import deque
from dataclasses import dataclass
from pathlib import Path

import four_way_stop_quant as base


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "assets" / "images" / "life" / "four-way-stop" / "experiments"
DATA_DIR = ROOT / "files" / "life" / "four-way-stop" / "experiments"

REFERENCE_COMPLIANCE = 0.80
STOP_DWELL_EFFECT = 1.0
PEDESTRIAN_CROSSING_TIME = 8.0
PEDESTRIAN_RESIDUAL_BLOCK = 4.0
AWSC_TURN_PENALTY = {"L": 1.0, "T": 0.0, "R": 0.15}
SIGNAL_TURN_PENALTY = {"L": 0.8, "T": 0.0, "R": 0.15}
AWSC_BASELINE_TURN_PENALTY = 0.10 * 1.0 + 0.10 * 0.15
SIGNAL_BASELINE_TURN_PENALTY = 0.10 * 0.8 + 0.10 * 0.15


@dataclass(frozen=True)
class Scenario:
    left_share: float = 0.10
    right_share: float = 0.10
    pedestrian_rate: float = 0.0
    ambiguity_window: float = 0.0
    hesitation_mean: float = 0.0
    stop_compliance: float = REFERENCE_COMPLIANCE
    signal_priority: float = 1.0

    @property
    def through_share(self) -> float:
        return 1.0 - self.left_share - self.right_share


@dataclass
class ExtendedResult:
    mean_delay: float
    p95_delay: float
    throughput: float
    end_queue: int
    max_approach_delay: float
    delay_gini: float
    conflict_exposures_per_1000: float
    ambiguity_events_per_1000: float
    pedestrian_blocks_per_1000: float


def stable_seed(*parts: object) -> int:
    token = "|".join(str(part) for part in parts).encode("utf-8")
    return zlib.crc32(token) & 0xFFFFFFFF


def choose_turn(rng: random.Random, scenario: Scenario) -> str:
    u = rng.random()
    if u < scenario.left_share:
        return "L"
    if u < scenario.left_share + scenario.through_share:
        return "T"
    return "R"


def generate_arrivals(
    total_flow: int,
    major_share: float,
    scenario: Scenario,
    seed: int,
) -> list[list[base.Vehicle]]:
    rng = random.Random(seed)
    streams: list[list[base.Vehicle]] = [[] for _ in base.APPROACHES]
    for approach, hourly_rate in enumerate(base.rates(total_flow, major_share)):
        t = 0.0
        while t < base.HORIZON:
            t += rng.expovariate(hourly_rate / 3600)
            if t < base.HORIZON:
                streams[approach].append(
                    base.Vehicle(t, approach, choose_turn(rng, scenario))
                )
    return streams


def pedestrian_block_probability(rate: float, movement: str, control: str) -> float:
    occupancy = 1.0 - math.exp(-rate * PEDESTRIAN_CROSSING_TIME / 3600)
    if control == "Signal" and movement == "T":
        return 0.0
    weight = {"L": 0.75, "T": 0.25, "R": 1.0}[movement]
    return min(1.0, occupancy * weight)


def extend_result(
    arrivals: list[list[base.Vehicle]],
    departures: dict[base.Vehicle, float],
    end_queue: int,
    exposures: int,
    ambiguity_events: int = 0,
    pedestrian_blocks: int = 0,
) -> ExtendedResult:
    result = base.summarize(arrivals, departures, end_queue)
    served = sum(1 for depart in departures.values() if base.WARMUP <= depart <= base.HORIZON)
    rate = exposures / served * 1000 if served else 0.0
    return ExtendedResult(
        mean_delay=result.mean_delay,
        p95_delay=result.p95_delay,
        throughput=result.throughput,
        end_queue=result.end_queue,
        max_approach_delay=result.max_approach_delay,
        delay_gini=result.delay_gini,
        conflict_exposures_per_1000=rate,
        ambiguity_events_per_1000=ambiguity_events / served * 1000 if served else 0.0,
        pedestrian_blocks_per_1000=pedestrian_blocks / served * 1000 if served else 0.0,
    )


def simulate_awsc(
    arrivals: list[list[base.Vehicle]], scenario: Scenario, seed: int
) -> ExtendedResult:
    rng = random.Random(seed + 100_000)
    queues = [deque() for _ in base.APPROACHES]
    indices = [0, 0, 0, 0]
    departures: dict[base.Vehicle, float] = {}
    next_service = math.inf
    exposures = 0
    ambiguity_events = 0
    pedestrian_blocks = 0

    def next_arrival() -> tuple[float, int]:
        choices = [
            (arrivals[a][indices[a]].arrival, a)
            for a in base.APPROACHES
            if indices[a] < len(arrivals[a])
        ]
        return min(choices) if choices else (math.inf, -1)

    while True:
        arrival_time, arrival_approach = next_arrival()
        event_time = min(arrival_time, next_service)
        if event_time > base.HORIZON or math.isinf(event_time):
            break

        if arrival_time <= next_service:
            vehicle = arrivals[arrival_approach][indices[arrival_approach]]
            indices[arrival_approach] += 1
            was_empty = not any(queues)
            queues[arrival_approach].append(vehicle)
            if was_empty:
                next_service = event_time + base.lognormal_with_mean(
                    rng, base.HEADWAY_CASE_MEANS[1], base.HEADWAY_CV
                )
            continue

        active = [a for a in base.APPROACHES if queues[a]]
        if not active:
            next_service = math.inf
            continue

        front_arrivals = {a: queues[a][0].arrival for a in active}
        chosen = min(active, key=lambda a: front_arrivals[a])
        first = queues[chosen].popleft()
        released = [first]
        departures[first] = event_time

        opposite = base.OPPOSITE[chosen]
        if (
            len(active) == 2
            and queues[opposite]
            and base.opposing_movements_compatible(first, queues[opposite][0])
        ):
            second = queues[opposite].popleft()
            released.append(second)
            departures[second] = event_time

        ambiguous = False
        if scenario.ambiguity_window > 0 and len(active) > 1:
            other_fronts = [
                arrival
                for approach, arrival in front_arrivals.items()
                if approach != chosen
            ]
            ambiguous = min(other_fronts) - front_arrivals[chosen] <= scenario.ambiguity_window

        block = any(
            rng.random()
            < pedestrian_block_probability(
                scenario.pedestrian_rate, vehicle.turn, "AWSC"
            )
            for vehicle in released
        )
        compliant = rng.random() < scenario.stop_compliance
        if not compliant and (len(active) > 1 or block):
            exposures += 1
        if ambiguous:
            ambiguity_events += 1
        if block:
            pedestrian_blocks += 1

        remaining = [a for a in base.APPROACHES if queues[a]]
        if not remaining:
            next_service = math.inf
            continue

        mean_interval = base.HEADWAY_CASE_MEANS[len(active)] / len(active)
        interval = base.lognormal_with_mean(rng, mean_interval, base.HEADWAY_CV)
        interval += (
            statistics.fmean(AWSC_TURN_PENALTY[v.turn] for v in released)
            - AWSC_BASELINE_TURN_PENALTY
        )
        interval += (float(compliant) - REFERENCE_COMPLIANCE) * STOP_DWELL_EFFECT
        if ambiguous and scenario.hesitation_mean > 0:
            interval += base.lognormal_with_mean(rng, scenario.hesitation_mean, 0.25)
        if block:
            interval += PEDESTRIAN_RESIDUAL_BLOCK
        next_service = event_time + max(0.4, interval)

    end_queue = sum(len(queue) for queue in queues)
    for approach in base.APPROACHES:
        end_queue += len(arrivals[approach]) - indices[approach]
    return extend_result(
        arrivals,
        departures,
        end_queue,
        exposures,
        ambiguity_events,
        pedestrian_blocks,
    )


def signal_plan(major_share: float, priority: float) -> tuple[float, float]:
    effective = base.SIGNAL_CYCLE - base.SIGNAL_LOST_TOTAL
    major_weight = major_share**priority
    minor_weight = (1.0 - major_share) ** priority
    target = effective * major_weight / (major_weight + minor_weight)
    major_green = max(10.0, min(effective - 10.0, target))
    return major_green, effective - major_green


def simulate_signal(
    arrivals: list[list[base.Vehicle]],
    major_share: float,
    scenario: Scenario,
    seed: int,
) -> ExtendedResult:
    rng = random.Random(seed + 200_000)
    departures: dict[base.Vehicle, float] = {}
    end_queue = 0
    pedestrian_blocks = 0
    major_green, minor_green = signal_plan(major_share, scenario.signal_priority)

    for approach in base.APPROACHES:
        stream = arrivals[approach]
        queue: deque[base.Vehicle] = deque()
        index = 0
        cycle_start = 0.0
        while cycle_start < base.HORIZON:
            if approach < 2:
                green_start = cycle_start
                green_end = green_start + major_green
            else:
                green_start = cycle_start + major_green + base.SIGNAL_LOST_TOTAL / 2
                green_end = green_start + minor_green

            slot = green_start + base.SIGNAL_STARTUP
            while slot < green_end:
                while index < len(stream) and stream[index].arrival <= slot:
                    queue.append(stream[index])
                    index += 1
                if not queue:
                    if index >= len(stream) or stream[index].arrival >= green_end:
                        break
                    slot = max(slot, stream[index].arrival)
                    continue

                vehicle = queue.popleft()
                departures[vehicle] = slot
                interval = (
                    base.SIGNAL_HEADWAY
                    + SIGNAL_TURN_PENALTY[vehicle.turn]
                    - SIGNAL_BASELINE_TURN_PENALTY
                )
                if rng.random() < pedestrian_block_probability(
                    scenario.pedestrian_rate, vehicle.turn, "Signal"
                ):
                    interval += PEDESTRIAN_RESIDUAL_BLOCK
                    pedestrian_blocks += 1
                slot += interval
            cycle_start += base.SIGNAL_CYCLE

        while index < len(stream) and stream[index].arrival <= base.HORIZON:
            queue.append(stream[index])
            index += 1
        end_queue += len(queue)

    return extend_result(
        arrivals,
        departures,
        end_queue,
        0,
        pedestrian_blocks=pedestrian_blocks,
    )


def run_pair(
    total_flow: int,
    major_share: float,
    scenario: Scenario,
    reps: int,
    key: str,
) -> dict[str, list[ExtendedResult]]:
    out = {"AWSC": [], "Signal": []}
    for rep in range(reps):
        seed = stable_seed(total_flow, major_share, key, rep)
        arrivals = generate_arrivals(total_flow, major_share, scenario, seed)
        out["AWSC"].append(simulate_awsc(arrivals, scenario, seed))
        out["Signal"].append(simulate_signal(arrivals, major_share, scenario, seed))
    return out


def aggregate(results: list[ExtendedResult]) -> dict[str, float]:
    return {
        "mean_delay": statistics.fmean(r.mean_delay for r in results),
        "p95_delay": statistics.fmean(r.p95_delay for r in results),
        "throughput": statistics.fmean(r.throughput for r in results),
        "end_queue": statistics.fmean(r.end_queue for r in results),
        "max_approach_delay": statistics.fmean(r.max_approach_delay for r in results),
        "delay_gini": statistics.fmean(r.delay_gini for r in results),
        "conflict_exposures_per_1000": statistics.fmean(
            r.conflict_exposures_per_1000 for r in results
        ),
        "ambiguity_events_per_1000": statistics.fmean(
            r.ambiguity_events_per_1000 for r in results
        ),
        "pedestrian_blocks_per_1000": statistics.fmean(
            r.pedestrian_blocks_per_1000 for r in results
        ),
    }


def result_row(
    experiment: str,
    parameter_1: str,
    value_1: object,
    parameter_2: str,
    value_2: object,
    total_flow: int,
    major_share: float,
    mode: str,
    results: list[ExtendedResult],
) -> dict[str, object]:
    row: dict[str, object] = {
        "experiment": experiment,
        "parameter_1": parameter_1,
        "value_1": value_1,
        "parameter_2": parameter_2,
        "value_2": value_2,
        "total_flow": total_flow,
        "major_share": major_share,
        "mode": mode,
        "replications": len(results),
    }
    row.update({key: round(value, 4) for key, value in aggregate(results).items()})
    return row


def crossover(rows: list[dict[str, object]]) -> float | None:
    by_flow: dict[int, dict[str, float]] = {}
    for row in rows:
        by_flow.setdefault(int(row["total_flow"]), {})[str(row["mode"])] = float(
            row["mean_delay"]
        )
    points = []
    for flow, values in sorted(by_flow.items()):
        if "AWSC" in values and "Signal" in values:
            points.append((flow, values["AWSC"] - values["Signal"]))
    for (flow_0, diff_0), (flow_1, diff_1) in zip(points, points[1:]):
        if diff_0 <= 0 < diff_1:
            weight = -diff_0 / (diff_1 - diff_0)
            return flow_0 + weight * (flow_1 - flow_0)
    return None


def experiment_crossovers(rows: list[dict[str, object]]) -> list[dict[str, object]]:
    definitions = [
        ("left_turn_share", [0.0, 0.1, 0.2, 0.3, 0.4]),
        ("pedestrian_rate", [0, 50, 100, 200, 400]),
        ("stop_compliance", [0.6, 0.7, 0.8, 0.9, 1.0]),
    ]
    flows = list(range(900, 2001, 100))
    summary = []
    for parameter, values in definitions:
        for value in values:
            if parameter == "left_turn_share":
                scenario = Scenario(left_share=float(value))
            elif parameter == "pedestrian_rate":
                scenario = Scenario(pedestrian_rate=float(value))
            else:
                scenario = Scenario(stop_compliance=float(value))
            subset = []
            for flow in flows:
                seed_key = (
                    f"{parameter}-{value}"
                    if parameter == "left_turn_share"
                    else f"{parameter}-common"
                )
                paired = run_pair(flow, 0.5, scenario, 24, seed_key)
                for mode, results in paired.items():
                    row = result_row(
                        "crossover",
                        parameter,
                        value,
                        "",
                        "",
                        flow,
                        0.5,
                        mode,
                        results,
                    )
                    rows.append(row)
                    subset.append(row)
            summary.append(
                {
                    "parameter": parameter,
                    "value": value,
                    "crossover_flow": crossover(subset),
                }
            )
    return summary


def experiment_ambiguity(rows: list[dict[str, object]]) -> None:
    for window in [0.0, 0.5, 1.0, 2.0, 3.0]:
        for hesitation in [0.0, 0.5, 1.0, 2.0, 3.0]:
            scenario = Scenario(
                ambiguity_window=window,
                hesitation_mean=hesitation,
            )
            paired = run_pair(1500, 0.5, scenario, 32, "ambiguity-common")
            for mode, results in paired.items():
                rows.append(
                    result_row(
                        "ambiguity_hesitation",
                        "ambiguity_window",
                        window,
                        "hesitation_mean",
                        hesitation,
                        1500,
                        0.5,
                        mode,
                        results,
                    )
                )


def experiment_turn_pedestrian(rows: list[dict[str, object]]) -> None:
    for right_share in [0.0, 0.1, 0.2, 0.3, 0.4]:
        for pedestrian_rate in [0, 50, 100, 200, 400]:
            scenario = Scenario(
                right_share=right_share,
                pedestrian_rate=pedestrian_rate,
            )
            paired = run_pair(
                1500,
                0.5,
                scenario,
                32,
                f"right-ped-{right_share}",
            )
            for mode, results in paired.items():
                rows.append(
                    result_row(
                        "right_turn_pedestrian",
                        "right_turn_share",
                        right_share,
                        "pedestrian_rate",
                        pedestrian_rate,
                        1500,
                        0.5,
                        mode,
                        results,
                    )
                )


def experiment_fairness(rows: list[dict[str, object]]) -> None:
    for priority in [0.0, 0.25, 0.5, 0.75, 1.0, 1.1, 1.2]:
        scenario = Scenario(signal_priority=priority)
        paired = run_pair(1600, 0.8, scenario, 40, "fairness-common")
        for mode, results in paired.items():
            rows.append(
                result_row(
                    "efficiency_fairness",
                    "signal_priority",
                    priority,
                    "",
                    "",
                    1600,
                    0.8,
                    mode,
                    results,
                )
            )


def experiment_compliance(rows: list[dict[str, object]]) -> None:
    for compliance in [0.6, 0.7, 0.8, 0.9, 1.0]:
        scenario = Scenario(stop_compliance=compliance)
        paired = run_pair(1400, 0.5, scenario, 40, "compliance-common")
        for mode, results in paired.items():
            rows.append(
                result_row(
                    "compliance_tradeoff",
                    "stop_compliance",
                    compliance,
                    "",
                    "",
                    1400,
                    0.5,
                    mode,
                    results,
                )
            )


def path(points: list[tuple[float, float]]) -> str:
    return " ".join(
        ("M" if index == 0 else "L") + f"{x:.1f},{y:.1f}"
        for index, (x, y) in enumerate(points)
    )


def make_crossover_figure(summary: list[dict[str, object]]) -> None:
    width, height = 760, 520
    left, right, top = 245, 710, 58
    groups = [
        ("左转比例", "left_turn_share", lambda value: f"{float(value):.0%}"),
        ("行人流量（人/小时）", "pedestrian_rate", lambda value: f"{int(value)}"),
        ("完整停车比例", "stop_compliance", lambda value: f"{float(value):.0%}"),
    ]
    xmin, xmax = 1000.0, 1800.0
    chunks = [
        '<text x="380" y="24" text-anchor="middle" font-size="16" font-weight="600">哪些变量会移动平均延误反转边界？</text>',
        '<line class="grid" x1="535" y1="42" x2="535" y2="470" stroke-dasharray="4 4"/>',
        '<text class="muted" x="541" y="51" font-size="9">基准约 1,500</text>',
    ]
    row = 0
    for group_index, (label, key, formatter) in enumerate(groups):
        y_label = top + row * 24
        chunks.append(f'<text x="12" y="{y_label+4}" font-size="12" font-weight="600">{label}</text>')
        subset = [item for item in summary if item["parameter"] == key]
        for item in subset:
            row += 1
            y = top + row * 24
            cross = float(item["crossover_flow"] or xmin)
            x = left + (cross - xmin) / (xmax - xmin) * (right - left)
            chunks.append(f'<text class="muted" x="{left-12}" y="{y+4}" text-anchor="end" font-size="10">{formatter(item["value"])}</text>')
            chunks.append(f'<line class="grid" x1="{left}" y1="{y}" x2="{right}" y2="{y}"/>')
            chunks.append(f'<circle class="signal-fill" cx="{x:.1f}" cy="{y}" r="4"/>')
            chunks.append(f'<text x="{x+8:.1f}" y="{y+4}" font-size="9">{cross:.0f}</text>')
        row += 1
    axis_y = 475
    chunks.append(f'<line class="axis" x1="{left}" y1="{axis_y}" x2="{right}" y2="{axis_y}"/>')
    for tick in [1000, 1200, 1400, 1600, 1800]:
        x = left + (tick - xmin) / (xmax - xmin) * (right - left)
        chunks.append(f'<text class="muted" x="{x:.1f}" y="{axis_y+17}" text-anchor="middle" font-size="10">{tick}</text>')
    chunks.append('<text class="muted" x="478" y="514" text-anchor="middle" font-size="11">插值得到的反转流量（辆/小时）</text>')
    svg = base.svg_shell(
        width,
        height,
        "".join(chunks),
        "敏感性因素与平均延误反转流量",
        "点图比较左转比例、行人流量和停车遵从度变化时，四向停车与信号灯平均延误反转边界的位置。",
    )
    (IMAGE_DIR / "crossover-sensitivity.svg").write_text(svg, encoding="utf-8")


def heatmap(
    filename: str,
    title: str,
    desc: str,
    x_values: list[float],
    y_values: list[float],
    values: dict[tuple[float, float], float],
    x_label: str,
    y_label: str,
    formatter,
    x_tick_formatter=lambda value: f"{value:g}",
    y_tick_formatter=lambda value: f"{value:g}",
) -> None:
    width, height = 700, 470
    left, top, cell_w, cell_h = 145, 58, 90, 62
    max_abs = max(abs(value) for value in values.values()) or 1.0
    chunks = [f'<text x="350" y="24" text-anchor="middle" font-size="16" font-weight="600">{title}</text>']
    for yi, y_value in enumerate(reversed(y_values)):
        y = top + yi * cell_h
        chunks.append(f'<text class="muted" x="{left-12}" y="{y+36}" text-anchor="end" font-size="10">{y_tick_formatter(y_value)}</text>')
        for xi, x_value in enumerate(x_values):
            x = left + xi * cell_w
            value = values[(x_value, y_value)]
            css = "awsc-fill" if value > 0 else "signal-fill"
            opacity = 0.12 + 0.55 * min(1.0, abs(value) / max_abs)
            chunks.append(f'<rect x="{x}" y="{y}" width="{cell_w-3}" height="{cell_h-3}" rx="3" class="{css}" opacity="{opacity:.2f}"/>')
            chunks.append(f'<text x="{x+(cell_w-3)/2:.1f}" y="{y+35}" text-anchor="middle" font-size="11">{formatter(value)}</text>')
    for xi, x_value in enumerate(x_values):
        x = left + xi * cell_w + (cell_w - 3) / 2
        chunks.append(f'<text class="muted" x="{x:.1f}" y="{top+len(y_values)*cell_h+18}" text-anchor="middle" font-size="10">{x_tick_formatter(x_value)}</text>')
    chunks += [
        f'<text class="muted" x="{left+len(x_values)*cell_w/2}" y="{top+len(y_values)*cell_h+48}" text-anchor="middle" font-size="11">{x_label}</text>',
        f'<text class="muted" x="24" y="{top+len(y_values)*cell_h/2}" transform="rotate(-90 24 {top+len(y_values)*cell_h/2})" text-anchor="middle" font-size="11">{y_label}</text>',
    ]
    svg = base.svg_shell(width, height, "".join(chunks), title, desc)
    (IMAGE_DIR / filename).write_text(svg, encoding="utf-8")


def make_ambiguity_figure(rows: list[dict[str, object]]) -> None:
    subset = [row for row in rows if row["experiment"] == "ambiguity_hesitation" and row["mode"] == "AWSC"]
    values = {
        (float(row["value_1"]), float(row["value_2"])): float(row["mean_delay"])
        for row in subset
    }
    heatmap(
        "ambiguity-hesitation.svg",
        "同时到达判断误差与犹豫如何叠加？",
        "总流量每小时一千五百辆时，颜色和数字表示四向停车平均延误。",
        [0.0, 0.5, 1.0, 2.0, 3.0],
        [0.0, 0.5, 1.0, 2.0, 3.0],
        values,
        "被视为同时到达的时间窗（秒）",
        "每次歧义额外犹豫（秒）",
        lambda value: f"{value:.1f}s",
    )


def make_turn_pedestrian_figure(rows: list[dict[str, object]]) -> None:
    subset = [row for row in rows if row["experiment"] == "right_turn_pedestrian"]
    lookup = {
        (float(row["value_1"]), float(row["value_2"]), str(row["mode"])): float(row["mean_delay"])
        for row in subset
    }
    values = {
        (right, pedestrian): lookup[(right, pedestrian, "AWSC")] - lookup[(right, pedestrian, "Signal")]
        for right in [0.0, 0.1, 0.2, 0.3, 0.4]
        for pedestrian in [0.0, 50.0, 100.0, 200.0, 400.0]
    }
    heatmap(
        "right-turn-pedestrian.svg",
        "右转与行人不是两个独立变量",
        "总流量每小时一千五百辆时，正值表示四向停车更慢，负值表示信号灯更慢。",
        [0.0, 0.1, 0.2, 0.3, 0.4],
        [0.0, 50.0, 100.0, 200.0, 400.0],
        values,
        "右转比例",
        "每条冲突横道行人流量（人/小时）",
        lambda value: ("停慢 " if value > 0 else "灯慢 ") + f"{abs(value):.1f}s",
        lambda value: f"{value:.0%}",
        lambda value: f"{int(value)}",
    )


def make_fairness_figure(rows: list[dict[str, object]]) -> None:
    subset = [row for row in rows if row["experiment"] == "efficiency_fairness"]
    signals = sorted(
        [row for row in subset if row["mode"] == "Signal"],
        key=lambda row: float(row["value_1"]),
    )
    awsc = [row for row in subset if row["mode"] == "AWSC" and float(row["value_1"]) == 1.0][0]
    width, height = 700, 460
    left, top, plot_w, plot_h = 85, 45, 550, 330
    x_min, x_max = 10.0, 25.0
    y_min, y_max = 15.0, 65.0
    sx = lambda value: left + (value - x_min) / (x_max - x_min) * plot_w
    sy = lambda value: top + plot_h - (value - y_min) / (y_max - y_min) * plot_h
    chunks = ['<text x="350" y="23" text-anchor="middle" font-size="16" font-weight="600">偏向主路，究竟换来了什么？</text>']
    for tick in [20, 30, 40, 50, 60]:
        y = sy(tick)
        chunks.append(f'<line class="grid" x1="{left}" y1="{y:.1f}" x2="{left+plot_w}" y2="{y:.1f}"/>')
        chunks.append(f'<text class="muted" x="{left-8}" y="{y+4:.1f}" text-anchor="end" font-size="10">{tick}</text>')
    for tick in [10, 15, 20, 25]:
        x = sx(tick)
        chunks.append(f'<text class="muted" x="{x:.1f}" y="{top+plot_h+18}" text-anchor="middle" font-size="10">{tick}</text>')
    points = [(sx(float(row["mean_delay"])), sy(float(row["max_approach_delay"]))) for row in signals]
    chunks.append(f'<path d="{path(points)}" class="signal" stroke-width="2.5"/>')
    for row, (x, y) in zip(signals, points):
        priority = float(row["value_1"])
        chunks.append(f'<circle class="signal-fill" cx="{x:.1f}" cy="{y:.1f}" r="4"/>')
        chunks.append(f'<text x="{x+7:.1f}" y="{y-5:.1f}" font-size="9">α={priority:g}</text>')
    ax, ay = sx(float(awsc["mean_delay"])), sy(float(awsc["max_approach_delay"]))
    chunks.append(f'<path class="awsc-fill" d="M{ax:.1f},{ay-6:.1f} L{ax+6:.1f},{ay:.1f} L{ax:.1f},{ay+6:.1f} L{ax-6:.1f},{ay:.1f} Z"/>')
    chunks.append(f'<text x="{ax+10:.1f}" y="{ay+4:.1f}" font-size="10">四向停车</text>')
    chunks += [
        f'<line class="axis" x1="{left}" y1="{top}" x2="{left}" y2="{top+plot_h}"/><line class="axis" x1="{left}" y1="{top+plot_h}" x2="{left+plot_w}" y2="{top+plot_h}"/>',
        '<text class="muted" x="360" y="420" text-anchor="middle" font-size="11">全部车辆平均延误（秒/辆，越左越好）</text>',
        '<text class="muted" x="20" y="210" transform="rotate(-90 20 210)" text-anchor="middle" font-size="11">最差方向平均延误（秒/辆，越低越好）</text>',
        '<text class="muted" x="350" y="448" text-anchor="middle" font-size="9">固定需求：总流量 1,600 辆/小时，主路占 80%；α 越大，绿灯越偏向主路</text>',
    ]
    svg = base.svg_shell(width, height, "".join(chunks), "信号优先程度下的效率公平前沿", "固定偏流需求下，信号灯主路优先参数改变全部车辆平均延误和最差方向平均延误。四向停车作为参照点。")
    (IMAGE_DIR / "efficiency-fairness.svg").write_text(svg, encoding="utf-8")


def make_compliance_figure(rows: list[dict[str, object]]) -> None:
    subset = sorted(
        [row for row in rows if row["experiment"] == "compliance_tradeoff" and row["mode"] == "AWSC"],
        key=lambda row: float(row["value_1"]),
    )
    width, height = 700, 390
    panels = [(70, "平均延误（秒/辆）", "mean_delay", 0.0, 30.0), (390, "冲突暴露代理（每千辆）", "conflict_exposures_per_1000", 0.0, 450.0)]
    chunks = ['<text x="350" y="23" text-anchor="middle" font-size="16" font-weight="600">Rolling stop：一点效率，多少风险暴露？</text>']
    for x0, label, key, ymin, ymax in panels:
        top, plot_w, plot_h = 62, 240, 240
        chunks.append(f'<text x="{x0+plot_w/2}" y="48" text-anchor="middle" font-size="11">{label}</text>')
        ticks = [0, 10, 20, 30] if key == "mean_delay" else [0, 150, 300, 450]
        for tick in ticks:
            y = top + plot_h - (tick - ymin) / (ymax - ymin) * plot_h
            chunks.append(f'<line class="grid" x1="{x0}" y1="{y:.1f}" x2="{x0+plot_w}" y2="{y:.1f}"/>')
            chunks.append(f'<text class="muted" x="{x0-8}" y="{y+4:.1f}" text-anchor="end" font-size="9">{tick}</text>')
        points = []
        for row in subset:
            compliance = float(row["value_1"])
            value = float(row[key])
            x = x0 + (compliance - 0.6) / 0.4 * plot_w
            y = top + plot_h - (value - ymin) / (ymax - ymin) * plot_h
            points.append((x, y))
        chunks.append(f'<path d="{path(points)}" class="awsc" stroke-width="2.5"/>')
        for row, (x, y) in zip(subset, points):
            chunks.append(f'<circle class="awsc-fill" cx="{x:.1f}" cy="{y:.1f}" r="4"/>')
        chunks.append(f'<line class="axis" x1="{x0}" y1="{top}" x2="{x0}" y2="{top+plot_h}"/><line class="axis" x1="{x0}" y1="{top+plot_h}" x2="{x0+plot_w}" y2="{top+plot_h}"/>')
        for compliance in [0.6, 0.7, 0.8, 0.9, 1.0]:
            x = x0 + (compliance - 0.6) / 0.4 * plot_w
            chunks.append(f'<text class="muted" x="{x:.1f}" y="{top+plot_h+17}" text-anchor="middle" font-size="9">{compliance:.0%}</text>')
    chunks += [
        '<text class="muted" x="350" y="350" text-anchor="middle" font-size="11">完整停车比例</text>',
        '<text class="muted" x="350" y="378" text-anchor="middle" font-size="9">冲突暴露不是事故概率：仅计未完整停车且同时存在其它进口车辆或行人的服务事件</text>',
    ]
    svg = base.svg_shell(width, height, "".join(chunks), "停车遵从度的效率与冲突暴露", "四向停车在每小时一千四百辆的均衡需求下，完整停车比例变化对平均延误和冲突暴露代理的影响。")
    (IMAGE_DIR / "compliance-tradeoff.svg").write_text(svg, encoding="utf-8")


def write_rows(rows: list[dict[str, object]]) -> None:
    fieldnames = list(rows[0])
    with (DATA_DIR / "sensitivity-results.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def write_crossovers(summary: list[dict[str, object]]) -> None:
    with (DATA_DIR / "crossover-summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["parameter", "value", "crossover_flow"], lineterminator="\n")
        writer.writeheader()
        for row in summary:
            writer.writerow({**row, "crossover_flow": round(float(row["crossover_flow"] or 0.0), 2)})


def main() -> None:
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, object]] = []
    crossovers = experiment_crossovers(rows)
    experiment_ambiguity(rows)
    experiment_turn_pedestrian(rows)
    experiment_fairness(rows)
    experiment_compliance(rows)
    write_rows(rows)
    write_crossovers(crossovers)
    make_crossover_figure(crossovers)
    make_ambiguity_figure(rows)
    make_turn_pedestrian_figure(rows)
    make_fairness_figure(rows)
    make_compliance_figure(rows)

    print(f"wrote {len(rows)} aggregated rows")
    for item in crossovers:
        print(f"{item['parameter']}={item['value']}: crossover={float(item['crossover_flow'] or 0):.0f}")


if __name__ == "__main__":
    main()
