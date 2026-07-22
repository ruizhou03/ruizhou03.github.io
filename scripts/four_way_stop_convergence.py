#!/usr/bin/env python3
"""Audit Monte Carlo convergence for the headline intersection scenarios."""

from __future__ import annotations

import csv
import math
import statistics
from pathlib import Path

import four_way_stop_quant as model


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "files" / "life" / "four-way-stop" / "convergence-audit.csv"
FLOWS = [400, 1400, 1600, 1800]
CHECKPOINTS = [20, 40, 80, 160, 320]
MAJOR_SHARE = 0.5


def summarize(values: list[float]) -> tuple[float, float, float]:
    mean = statistics.fmean(values)
    if len(values) < 2:
        return mean, 0.0, 0.0
    mcse = statistics.stdev(values) / math.sqrt(len(values))
    return mean, mcse, 1.96 * mcse


def main() -> None:
    rows: list[dict[str, object]] = []
    cached: dict[tuple[int, str], list[float]] = {}

    for flow in FLOWS:
        results = model.run_replications(flow, MAJOR_SHARE, reps=max(CHECKPOINTS))
        for mode, runs in results.items():
            cached[(flow, mode)] = [run.mean_delay for run in runs]
            for reps in CHECKPOINTS:
                mean, mcse, half_width = summarize(cached[(flow, mode)][:reps])
                rows.append(
                    {
                        "total_flow": flow,
                        "mode": mode,
                        "replications": reps,
                        "mean_delay": round(mean, 4),
                        "mcse": round(mcse, 4),
                        "ci95_half_width": round(half_width, 4),
                    }
                )

    for reps in CHECKPOINTS:
        awsc_1400 = statistics.fmean(cached[(1400, "AWSC")][:reps])
        signal_1400 = statistics.fmean(cached[(1400, "Signal")][:reps])
        awsc_1600 = statistics.fmean(cached[(1600, "AWSC")][:reps])
        signal_1600 = statistics.fmean(cached[(1600, "Signal")][:reps])
        diff_0 = awsc_1400 - signal_1400
        diff_1 = awsc_1600 - signal_1600
        weight = -diff_0 / (diff_1 - diff_0)
        crossover = 1400 + 200 * weight
        rows.append(
            {
                "total_flow": "interpolated_crossover",
                "mode": "AWSC_minus_Signal",
                "replications": reps,
                "mean_delay": round(crossover, 2),
                "mcse": "",
                "ci95_half_width": "",
            }
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    print("replications,crossover_flow")
    for row in rows:
        if row["total_flow"] == "interpolated_crossover":
            print(f"{row['replications']},{row['mean_delay']}")
    print("\n320-rep headline estimates (mean ± 95% MC half-width)")
    for flow in FLOWS:
        for mode in ["AWSC", "Signal"]:
            values = cached[(flow, mode)]
            mean, _mcse, half_width = summarize(values)
            print(f"flow={flow}, {mode}: {mean:.2f} ± {half_width:.2f} s")


if __name__ == "__main__":
    main()
