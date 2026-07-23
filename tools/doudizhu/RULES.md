# Doudizhu core contract v1

`ddz-core-1.0.0` uses the standard DouZero rank-multiset action space:

- single, pair, triple, triple with single, triple with pair;
- straights of at least five ranks, pair straights of at least three ranks,
  and triple straights of at least two ranks, never including 2 or jokers;
- every legal single-wing and pair-wing combination for a triple straight;
- four with two arbitrary physical cards, and four with two distinct pairs;
- bombs and the two-joker rocket.

Physical cards are IDs `0..53`. A legal hand and action may contain each ID at
most once. Rank-equivalent suit choices are one semantic action. `parsePattern`,
`enumerateBeats`, `validatePlay`, and `applyAction` are the canonical contract;
callers must not mutate a game before `applyAction` succeeds.

`applyAction` requires matching `gameEpoch`, `expectedRevision`, `phase`, and
`seat`. It is immutable and rejects stale, out-of-turn, non-subset, malformed,
and non-beating commands atomically.

Room configuration owns bidding semantics:

- `rob`: call/rob/pass state machine; every successful rob doubles the base.
- `call`: numeric 1/2/3 bidding; timeout is a numeric zero/pass.

Scoring is zero-sum. The landlord settles independently against each farmer.
Each pair amount applies the base, bombs, spring, landlord double, that farmer's
double, and the configured per-pair cap. Both farmers share the win/loss result.

The action-space reference is
`kwai/DouZero@718a5c920bf3361e34178a38f3b80458e176b351`
(`douzero/env/move_generator.py`, Apache-2.0).
