#!/usr/bin/env python3
"""Monte Carlo simulator for the deterministic two-player Dinggou rules.

Examples:
  python3 files/data/dinggou/dinggou_sim.py --cards 4:54:1 --trials 10000 \
    --csv files/data/dinggou/dinggou-scan.csv
  python3 files/data/dinggou/dinggou_sim.py --trace-cards 40 --trace-seed 20260721 \
    --trace-csv files/data/dinggou/dinggou-trajectory-40.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
import statistics
from collections import deque
from dataclasses import dataclass
from pathlib import Path


J, Q, K, SMALL_JOKER, BIG_JOKER = 10, 11, 12, 13, 14
STANDARD_DECK = tuple(rank for rank in range(13) for _ in range(4)) + (
    SMALL_JOKER,
    BIG_JOKER,
)
STEAL_COUNT = {Q: 2, K: 3, SMALL_JOKER: 4, BIG_JOKER: 5}


@dataclass
class GameResult:
    total_cards: int
    plays: int
    completed: bool
    cycle: bool
    capped: bool
    winner: int | None
    seventy_five_entries: int
    majority_reversals: int
    strong_reversals: int
    seventy_five_givebacks: int
    loser_had_seventy_five: bool


def build_pool(total_cards: int, rng: random.Random) -> list[int]:
    """Return full decks plus a uniform subset of one additional deck."""
    full_decks, remainder = divmod(total_cards, 54)
    pool = list(STANDARD_DECK) * full_decks
    if remainder:
        pool.extend(rng.sample(STANDARD_DECK, remainder))
    return pool


def state_signature(
    hands: tuple[deque[int], deque[int]], table: list[int], active: int
) -> bytes:
    return (
        bytes(hands[0])
        + b"\xfe"
        + bytes(hands[1])
        + b"\xfd"
        + bytes(table)
        + bytes((active,))
    )


def simulate_game(
    total_cards: int,
    rng: random.Random,
    max_plays: int = 100_000,
    detect_cycles: bool = True,
    keep_trace: bool = False,
) -> tuple[GameResult, list[dict[str, int | float | str]]]:
    if total_cards < 2:
        raise ValueError("At least two cards are required")

    pool = build_pool(total_cards, rng)
    rng.shuffle(pool)
    low = total_cards // 2
    split = low + 1 if total_cards % 2 and rng.randrange(2) == 0 else low
    hands = (deque(pool[:split]), deque(pool[split:]))
    active = rng.randrange(2)
    table: list[int] = []
    seen: set[bytes] = set()
    trace: list[dict[str, int | float | str]] = []

    entries_75 = 0
    majority_reversals = 0
    strong_reversals = 0
    givebacks_75 = 0
    ever_75 = [False, False]
    in_75 = [False, False]
    pending_giveback = [False, False]
    last_majority: int | None = None
    last_strong: int | None = None

    def record(play: int, event: str) -> None:
        if not keep_trace:
            return
        trace.append(
            {
                "play": play,
                "a_cards": len(hands[0]),
                "b_cards": len(hands[1]),
                "table_cards": len(table),
                "a_share": len(hands[0]) / total_cards,
                "b_share": len(hands[1]) / total_cards,
                "event": event,
            }
        )

    def observe() -> None:
        nonlocal entries_75, majority_reversals, strong_reversals, givebacks_75
        nonlocal last_majority, last_strong
        counts = (len(hands[0]), len(hands[1]))
        for player in (0, 1):
            now_75 = counts[player] * 4 >= total_cards * 3
            if now_75 and not in_75[player]:
                entries_75 += 1
                ever_75[player] = True
                pending_giveback[player] = True
            in_75[player] = now_75
            if pending_giveback[player] and counts[player] * 2 <= total_cards:
                givebacks_75 += 1
                pending_giveback[player] = False

        majority = None
        if counts[0] * 2 > total_cards:
            majority = 0
        elif counts[1] * 2 > total_cards:
            majority = 1
        if majority is not None:
            if last_majority is not None and majority != last_majority:
                majority_reversals += 1
            last_majority = majority

        strong = None
        if counts[0] * 5 >= total_cards * 3:
            strong = 0
        elif counts[1] * 5 >= total_cards * 3:
            strong = 1
        if strong is not None:
            if last_strong is not None and strong != last_strong:
                strong_reversals += 1
            last_strong = strong

    record(0, "开局")
    plays = 0
    cycle = False
    capped = False
    winner: int | None = None

    while True:
        if not hands[active]:
            winner = 1 - active
            break
        if plays >= max_plays:
            capped = True
            break
        if detect_cycles:
            signature = state_signature(hands, table, active)
            if signature in seen:
                cycle = True
                break
            seen.add(signature)

        card = hands[active].popleft()
        table.append(card)
        plays += 1
        bonus_turn = False
        event = "普通出牌"

        if card == J:
            hands[active].extend(table)
            table.clear()
            bonus_turn = True
            event = "J 收桌面"
        elif card in STEAL_COUNT:
            opponent = 1 - active
            transfer_count = min(STEAL_COUNT[card], len(hands[opponent]))
            for _ in range(transfer_count):
                hands[active].append(hands[opponent].popleft())
            bonus_turn = True
            event = f"特殊牌转移 {transfer_count} 张"
        else:
            previous = -1
            for index in range(len(table) - 2, -1, -1):
                if table[index] == card:
                    previous = index
                    break
            if previous >= 0:
                captured = table[previous:]
                del table[previous:]
                hands[active].extend(captured)
                bonus_turn = True
                event = f"同点收走 {len(captured)} 张"

        assert len(hands[0]) + len(hands[1]) + len(table) == total_cards
        observe()
        record(plays, event)

        if not hands[0] or not hands[1]:
            if not hands[0] and hands[1]:
                winner = 1
            elif not hands[1] and hands[0]:
                winner = 0
            else:
                winner = 1 - active
            break
        if not bonus_turn:
            active = 1 - active

    completed = winner is not None
    result = GameResult(
        total_cards=total_cards,
        plays=plays,
        completed=completed,
        cycle=cycle,
        capped=capped,
        winner=winner,
        seventy_five_entries=entries_75,
        majority_reversals=majority_reversals,
        strong_reversals=strong_reversals,
        seventy_five_givebacks=givebacks_75,
        loser_had_seventy_five=bool(completed and ever_75[1 - winner]),
    )
    return result, trace


def percentile(values: list[int], probability: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lower, upper = math.floor(position), math.ceil(position)
    if lower == upper:
        return float(ordered[lower])
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def summarize(total_cards: int, games: list[GameResult]) -> dict[str, float | int]:
    completed = [game for game in games if game.completed]
    plays = [game.plays for game in completed]

    def avg(field: str) -> float:
        return sum(getattr(game, field) for game in completed) / len(completed)

    swings = sum(
        game.strong_reversals + game.seventy_five_givebacks for game in completed
    )
    return {
        "decks": total_cards / 54,
        "cards": total_cards,
        "trials": len(games),
        "completed": len(completed),
        "cycle_rate": sum(game.cycle for game in games) / len(games),
        "cap_rate": sum(game.capped for game in games) / len(games),
        "mean_plays": statistics.fmean(plays),
        "median_plays": statistics.median(plays),
        "p90_plays": percentile(plays, 0.90),
        "avg_75_entries": avg("seventy_five_entries"),
        "avg_majority_reversals": avg("majority_reversals"),
        "avg_meaningful_swings": swings / len(completed),
        "big_comeback_rate": sum(game.loser_had_seventy_five for game in completed)
        / len(completed),
    }


def parse_card_counts(specification: str) -> list[int]:
    counts: list[int] = []
    for item in specification.split(","):
        item = item.strip()
        if ":" in item:
            start, stop, step = (int(part) for part in item.split(":"))
            counts.extend(range(start, stop + 1, step))
        elif item:
            counts.append(int(item))
    return sorted(set(counts))


def write_rows(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cards", default="27,38,54,81,108,162")
    parser.add_argument("--trials", type=int, default=1000)
    parser.add_argument("--max-plays", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=20260720)
    parser.add_argument("--csv", type=Path)
    parser.add_argument("--json", type=Path)
    parser.add_argument("--trace-cards", type=int)
    parser.add_argument("--trace-seed", type=int, default=20260721)
    parser.add_argument("--trace-csv", type=Path)
    args = parser.parse_args()

    if args.trace_cards:
        result, trace = simulate_game(
            args.trace_cards,
            random.Random(args.trace_seed),
            max_plays=args.max_plays,
            keep_trace=True,
        )
        print(json.dumps(result.__dict__, ensure_ascii=False))
        if args.trace_csv:
            write_rows(args.trace_csv, trace)
        return

    rng = random.Random(args.seed)
    summaries = []
    for total_cards in parse_card_counts(args.cards):
        games = [
            simulate_game(total_cards, rng, max_plays=args.max_plays)[0]
            for _ in range(args.trials)
        ]
        summary = summarize(total_cards, games)
        summaries.append(summary)
        print(json.dumps(summary, ensure_ascii=False))
    if args.csv:
        write_rows(args.csv, summaries)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8"
        )


if __name__ == "__main__":
    main()
