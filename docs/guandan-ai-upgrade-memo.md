<!-- 工作流产出:15-agent 研究(6 份外部材料精读 + 4 路代码诊断 + 3 路对抗审稿),2026-06-16 -->
<!-- 核心论断已在实际部署代码中验证:assets/js/games/guandan.js 的 chooseAIMoveLookahead→cloneStateMinLA(L3703) 复制全部 state.hands(开天眼);clone 不含 levels/弃牌堆(无记牌/无级牌态) -->

# Decision Memo: Should We Train a New Guandan Bot?

**To:** Project owner
**From:** Principal RL/game-AI engineer
**Re:** Diagnosis of the current heuristic bot, ruling on the three hypotheses (objective / decision variables / method), and a path-ordered, ROI-honest plan to a meaningfully stronger Guandan AI.

**Bottom line up front.** Yes — there is real strength left on the table, and yes, a learned value net (Deep Monte-Carlo with action-as-input, the DanZero/DouZero blueprint) is the right long-run endpoint. But the draft had the **path ordering backwards for a solo developer**. The two defects that cripple the current bot — it *cheats* (reads opponents' real cards in its own rollout) and it *has no memory* (no discard tracking, no belief, no level-state) — are fixable in **pure JS on the existing engine in days-to-weeks**, with no training pipeline. The expensive multi-month self-play run only buys whatever margin remains *after* those fixes, and that margin is currently **unestimated**. So: **de-blind and add search first, measure it, and gate the neural investment on the measured residual gap.** On the three hypotheses: **decision variables (missing state + tiny policy class) are the primary bottleneck; method (credit-starved black-box search) is real and secondary; the objective is mostly right** (one shaping fix). Deployment is feasible but the draft's “no blocker” was overstated — it holds **only if we ship pure-JS inference on both client and server and prove the phone/256MB numbers on a dummy net before training**, not after.

---

## 1. Diagnosis — why the current bot is weak

The current bot is a linear evaluator (`moveUtility`) over a greedy hand decomposition, wrapped in a fixed depth-2 single-line rollout, tuned by black-box search against self-play win rate. Each weakness below is tied to code I verified.

### 1.1 Policy-class capacity is tiny — and the plateau evidence is real but narrower than it looks
- The learned object is an **8-dimensional real vector**: only the 8 `TUNE_KEYS` are optimized; the other ~16 named weights plus `lookaheadDepth` are hard-frozen across the whole population. Perturbations are **multiplicative and sign-fixed**, so zeros and sign-flips are unreachable.
- The evaluator's *form* is rigid: `groupValue`'s type table (joker-bomb, straight-flush, …), the `teamValueAt` leaf, and the bomb-economy block are hardcoded and **not in the search space**. The optimizer can nudge 8 coefficients, never reshape the policy.
- The strength evidence: **~190.5 Elo top-to-bottom across the population, ~+114 Elo for the best tune over the naive hand-guess (`DEFAULT_W`)**, with independent restarts converging to the same basin (CV 34–46% on tuned dims, near-identical optima). **Correction to the draft:** the top performer in `ranking.json` is **`coord-best` (coordinate descent) at ~1575.8 Elo**, *not* an ES winner — genuine ES restarts (`run*_gen*`) plateau slightly below at ~1565. The attribution matters only in that it *strengthens* the thesis: two different black-box optimizers (ES and coordinate descent) independently exhaust the same flat basin.

**Important caveat the draft hid (raised by the ROI lens, and correct):** this 190-Elo plateau was measured on a **cheating, memoryless, non-adversarial** bot. It bounds *that* configuration. It does **not** prove a de-blinded, card-tracking, searching version of the same linear evaluator has plateaued. We should not use the plateau to pre-condemn the entire heuristic family before we have removed the handicaps under which the plateau was produced. This single observation is why the roadmap is re-ordered (§3, §5).

**Verdict:** A genuine bottleneck, but the plateau evidence is *conditional on the current handicaps* and cannot be cited as proof that handcrafted-feature play is dead.

### 1.2 Feature blindness — the bot is missing the information that defines skilled play
The live decision never sees:
- **Hidden information — it cheats.** Both the greedy policy and the rollout read opponents' true hands: `cloneStateMin` (the draft mis-named this `cloneStateMinLA`) copies `state.hands`, and the rollout scores against real cards. The weights are tuned for a clairvoyant world the live bot doesn't inhabit, so they encode **zero** uncertainty handling.
- **No card counting / discard memory.** Only `state.lastPlay` exists; nothing tracks the global discard pile. The bot doesn't know which A / 级牌 / 2 / 王 / bombs are gone. `grep playedCards|seenCards` returns nothing.
- **No belief / void inference.** It never reasons “opponent passed on singles ⇒ likely void in singles.”
- **No level/match-state awareness.** `cloneStateMin` drops `state.levels`; nothing in the evaluator encodes “we're at A, 头游 ends the match” or “deny opponent 头游 at A.” The single most important strategic context in Guandan is invisible. (Note the `+50`/`+60` finish term lives in `moveUtility`'s `playFinish`, **not** in the `teamValueAt` leaf, whose leaf is `1.5*(oppCnt−myCnt) + 0.2*(myEff−oppEff)`; the draft garbled two code locations.)
- **Weak partner modeling.** Only trick-level booleans (`partnerWinning`, `partnerCount<=3`, `partnerOut`). No inference of partner's hand, no signaling, no who-goes-out-first control.
- **Single greedy decomposition.** `decompose()` yields one partition; a card usable in either a straight or a bomb is mis-valued because alternatives are never searched.

**Verdict:** This is the dominant bottleneck — and crucially, **most of it is missing *state*, not a wrong policy class.** Card memory, belief, and level-state can be fed to *any* evaluator, linear or neural. That is the whole reason the cheap path exists.

### 1.3 Shallow, optimistic, non-adversarial search
Lookahead is fixed depth-2, a single deterministic line (RNG stubbed to 0.5), with **every seat — opponents and partner — modeled by the searcher's own greedy weights.** No min node, no determinization over hidden hands, no Monte-Carlo averaging, no deepening, no pruning. The search is therefore **self-consistent, clairvoyant, and optimistic**: it assumes everyone plays like me and that I see all cards. It cannot find forcing lines, exploit a weak opponent, or plan multi-trick lead control.

**Verdict:** Secondary bottleneck — but note that *fixing* it (real adversarial search over a belief state) is cheap and reuses the existing engine.

### 1.4 Sample-inefficient, credit-starved optimization (Hypothesis 3)
The only learning signal is a **binary terminal match-win rate** from `runMatches`, gated through the 过A ladder, so most decisions get **zero direct credit**. With binomial SE ≈ 0.06 on ~60 matches, the optimizer chases sub-5% edges inside ±6% noise, against a **moving baseline** (candidate vs current center). There is **no per-decision credit assignment**: black-box search is a bandit over the weight vector and cannot attribute “we lost because of *that* bomb on trick 9.” Contrast DMC, where a Monte-Carlo return regresses onto **every (state, action) pair on the trajectory** — orders of magnitude more signal per game.

**Verdict on the three hypotheses:**

| Hypothesis | Ruling | Why |
|---|---|---|
| **2. Decision variables wrong/insufficient** | **PRIMARY** | Missing state (no card memory, no belief, no level-state, no partner inference) caps strength *regardless of tuning*. Secondarily, the 8-scalar fixed-form policy class is under-capacity. The first half is fixable without ML; the second half needs a learned model. |
| **3. Optimization method suboptimal** | **REAL, secondary** | Black-box-over-winrate gives one noisy scalar per candidate, no per-move credit → sample-starved, plateaus. It is also the *reason* you're stuck with a tiny policy class (black-box search can't fit a large net). A value-net + MC-return target fixes credit assignment *and* unlocks capacity. |
| **1. Objective function wrong** | **MOSTLY FINE — one fix** | The terminal team-outcome objective is right in spirit and matches the frontier. Defect: the binary 过A-gated signal is **too sparse**. Fix: adopt the frontier's **ordinal finishing-order reward (+3/+2/+1 by 双下/单下)** for graded per-round signal, plus a global match bonus (§2.2). Shaping refinement, not a wrong objective. |

**One-line synthesis:** The killer is feature-blindness (Hyp 2, primary) — and the cheapest large win is to fix the *state*, not the *model*. The method (Hyp 3) is what eventually lets you grow the model; the objective (Hyp 1) needs only a graded reward.

---

## 2. What the frontier does (and what to steal)

All six sources converge on **one paradigm**: Deep Monte-Carlo (DMC) with the action-as-input trick. I state the consensus and flag where the draft's numbers were over-precise.

> **Provenance warning (rl-method lens, correct).** Every paper-derived number below comes from **second-hand source summaries** and several are routinely conflated between **DanZero** (the DMC base) and **DanZero+** (the PPO-augmented follow-up). Treat the 513-dim field ranges, +3/+2/+1, k=2, 55.1%, 92.7%, 80 actors / 30 days, etc. as **“per summary, verify against the primary paper/repo before they drive an engineering decision.”** They are directionally reliable, not citable specs.

### 2.1 Core idea: Deep Monte-Carlo with action-as-input
- **Don't build a policy head over all actions.** Guandan's legal set is enormous and variable: >5000 at the opening, <50 late game, changing every turn. A softmax over a fixed enum is impossible.
- **Score each legal action independently.** Encode **state** + **one candidate action**, concat, feed a small MLP, output a **single scalar Q(s,a)**. Enumerate legal moves, one forward pass each, argmax (ε-greedy in training). The action is a *feature*, so a fixed-size net generalizes over an unbounded, variable action set.
- **Regress Q toward Monte-Carlo returns** from self-play. Loss = mean `(Q(s,a) − r)²`.

**Honest correction the draft botched (rl-method lens, important).** DMC is **not overestimation-free**. It removes the *bootstrap/max-bias of TD Q-learning*, yes — but it regresses onto **high-variance terminal returns** and then acts by argmax over Q(s,a). Rarely-sampled actions get noisy, optimistically-biased estimates, and argmax systematically selects the over-estimated ones (the optimizer's-curse / max-of-noisy-estimates). This is *exactly* why CRAD reports pure expert-imitation DMC “trains poorly (overestimation on unexplored actions)” and why DanZero+ and warm-start mitigations exist. The draft's clean “DMC dodges overestimation” framing contradicted its own later citation. **Correct framing:** DMC kills the TD max-bias but inherits MC variance and under-sampled-action over-valuation; the mitigations are ε-greedy exploration, large self-play volume, action pruning (DanZero+), and warm-start blending (CRAD).

### 2.2 Concrete specs (treat as a feature spec to verify, not copy blindly)

**State encoding — DanZero's ~513-dim layout** (own hand / unseen-remaining / last-move-to-beat / partner-move / opponents' remaining counts / play-history of the other three / team-opponent-current levels / **wild-card capability flags**), with **54-dim {0,1,2} suit-aware card blocks** (preserves suit for flushes/wilds, unlike DouDizhu). Ablation indicates the wild-card flags materially help.

> **Two clarifications the draft conflated:**
> 1. **Card memory ≠ opponent belief.** The play-history block *is* card memory (what's gone). The `[54–107]` “unseen/remaining” block is a **single shared pool count**, i.e., a deterministic remaining-card mask — **not a per-opponent distribution over who holds what.** Calling it a “belief prior” oversells it. Strong play wants per-opponent belief (void inference, hand-strength estimates); the DanZero state gives memory and a pooled prior, and leaves most explicit opponent-belief to be learned implicitly. Don't expect the feature spec to hand you opponent modeling for free.
> 2. **Feature ≠ objective.** Including level-state as an *input* lets the net *condition* on the level. It does **not** make the net *optimize* the 过A meta — that requires the **reward** to reflect match progression (the episode bonus below). The draft's “level-awareness fixed for free by features” repeated the same input-vs-reward confusion.

**Action encoding — two flavors:** DanZero's **54-dim {0,1,2}** card-count (→ state+action ≈ 567-dim); or CRAD/SDMC's richer **133-dim** typed action (play-type one-hot + size/strength + card matrix), marginally better for wild/flush disambiguation. PASS = zero block, distinct from “no record.”

**Reward / objective (fixes our Hyp-1 defect):**
- **Per-round ordinal finishing-order reward** (winning team's whole trajectory gets a graded +3/+2/+1 by 双下/单下; symmetric negatives; 0 when the team structurally can't win that round), **plus a global ±1 episode bonus** (DanZero+) on every sample so the agent optimizes *winning the multi-deal match*, not just a round. γ=1, undiscounted, sparse terminal. This is a drop-in upgrade over our binary 过A signal.
- **Variance caveat (rl-method lens):** undiscounted MC returns over long Guandan episodes are **high-variance** targets. Budget for **return normalization / variance reduction** and large sample volume; “γ=1 is fine here” should be validated, not assumed.

**Multi-agent credit assignment — the central 2v2 difficulty the draft waved away.** A shared team return assigns the **same scalar to both teammates' (s,a) pairs** regardless of who actually made the good or bad play. That is a textbook cooperative credit-assignment problem (lazy-partner / spurious-credit), **not** something “team reward solves by construction.” It is *partially* mitigated when both seats **share weights** in self-play (every good play trains the same net), and the finishing-order ordinal already does the “help partner go out first” shaping. But residual per-teammate credit noise is real. **Decision to make explicitly (§6):** shared single net across seats (recommended — pools data, mitigates credit noise) vs CRAD's per-seat nets (the draft cited this without flagging the cooperative implication).

**Network (small):** DanZero uses a **plain 4-hidden-layer × 512 tanh MLP** (history folded into the flat state, no recurrence), ~567-in → 1 scalar. CRAD/SDMC follows DouZero with an **LSTM over play-history + 6×512 MLP**, one net per seat. **Recommendation: the flat history-in-state MLP is a firm constraint for us, not a preference** — see §4; the LSTM is effectively out for the in-browser / 256 MB target unless the flat MLP demonstrably underperforms, in which case the entire §4 feasibility verdict must be revisited.

**Corrected parameter/byte budget (deployment + rl-method lenses — the draft's load-bearing number was wrong).** The draft cited “~0.6M params / ~0.6 MB int8" three times as the basis for ”no blocker.“ Recomputing a 567-in / 4×512-hidden / 1-out MLP: `567·512 + 3·(512·512) + 512·1 ≈ 0.29M + 0.79M + ... ≈ ~1.1M params` (≈0.8M if only 3 hidden layers). So:
- **~0.8–1.1M params**, **~3.3–4.3 MB fp32**, **~0.8–1.1 MB int8.**
Still tiny — but stop citing 0.6M. The model bytes were never the real deployment cost anyway (§4).

**Training infra:** distributed self-play actor-learner; roughly **80 actors / 1 mid-range GPU (RTX 3070) + ~160 CPU / ~30 days**, checkpoints daily. **This is the academic team's wall-clock, not our cost driver — see §3 and §5 for the honest solo-dev cost.**

### 2.3 Refinements (steal selectively)
- **DanZero+ (PPO on top):** freeze DMC as a teacher that prunes legal actions to **top-k (k=2 best)**, then a thin PPO head picks among those k. Reported to beat its DMC teacher ~55.1% head-to-head (≈ **+35 Elo — real, second-order, not ”+2–3%“**; I use this single consistent characterization throughout). Trains <1 day because the action space is pre-constrained. **Verdict: genuine but second-order polish; pure DMC already reaches strong play.**
- **CRAD/SDMC tricks (directly useful):** (a) **soft warm-start** — blend an expert policy into early rollouts (ω decaying) to cut convergence; we *have* an expert to seed from. (b) **Soft Action Sampling (SAS)** at inference — softmax-sample near-top-Q instead of argmax; a strength dial. (c) **pure expert-imitation DMC trains poorly** (over-valuation on unexplored actions) → warm-start must be a *blend*, not a bootstrap.
- **On SAS as a difficulty knob (ROI lens — this contradicts a tested project decision).** Per project memory (`reference_guandan_ai_population`), the current three tiers are **three genuinely different trained weight vectors from population training, deliberately *not* one model + noise** — precisely because temperature/noise on one strong policy yields a bot that plays strong lines then randomly blunders, which feels *unnatural* rather than *weaker*. SAS temperature **is** ”one model + noise.“ So SAS is **not** a free ”cleaner“ replacement; it re-opens a question the team already answered. Honest options: keep distinct-policy tiers (e.g., checkpoints from different self-play stages, or separately warm-started runs) for natural style diversity, or validate SAS against the population approach before adopting. Do not present it as a foregone cleanup.
- **Patent CN113018837A:** hand-crafted energy-minimization + shallow UCT; heuristic-tier, weakly evaluated. Steal only as a cheap pruning prefilter or an ”easy“ tier.
- **CFR/MCCFR — corrected framing (rl-method lens).** The draft said CFR ”can't be applied“ because the space ”can't be abstracted like poker.“ That's the **wrong reason and overstated** — Deep CFR / ReBeL / Player of Games handle spaces far larger than 2-player poker via abstraction + function approximation. The **accurate** reason: CFR-family methods target **two-player zero-sum equilibria** and lack a coherent solution concept / convergence guarantee in **4-player 2v2 cooperative** games (team coordination breaks the equilibrium notion); combined with Guandan's expensive per-state action enumeration, CFR is **ill-suited *here***, not categorically inapplicable. Conclusion unchanged: no strong Guandan system uses play-time tree search or CFR; a learned value net is the endpoint.
- **Why not pure PPO-from-scratch (rl-method lens — argue it, don't assert).** Dispreferred because (a) the variable, enormous legal action set has no natural fixed policy parameterization without a per-action scorer, and (b) on-policy PPO is sample-inefficient on long, sparse-reward episodes. DMC's per-action Q + MC return sidesteps both; PPO re-enters only *after* the value net constrains the action set to top-k (the DanZero+ recipe).
- **过A endgame is a rare-state, value-cliff sampling problem (rl-method lens).** The 过A rules create sharp non-smooth value cliffs near the terminal level (头游-at-A ends the match, pass restrictions, etc.). A pure MC net needs **enormous self-play volume at these rare A-level states** to learn the cliff and may under-sample them. Plan for **curriculum / seeded high-level start positions** and explicit eval at A-level, not ”uniform self-play will cover it.“
- **Self-play stability (rl-method lens, missing in draft).** Single-net self-play in a 4-player game can chase **non-transitive strategy cycles**. Budget for opponent diversity — a checkpoint/league pool or fictitious-self-play — not just ”PBT optional at the end.“
- **Tribute/return is a deliberate scope cut, not free (rl-method lens).** Every strong system hand-codes tribute and discards those samples; the net learns card-play only. But 抗贡 / which big card to tribute / return-card choice are **strategically load-bearing** and interact with the 过A meta. Frame heuristic tribute as a **deliberate strength tradeoff** that caps achievable strength on tribute-sensitive rounds, with ”learned tribute“ listed as a known future lever — not as costless.

---

## 3. Recommendation — should we train a new model?

**Yes, eventually — but not first, and not before you've measured what's cheap.** The draft's ”DMC is the primary path, ISMCTS is a skippable fallback“ is **backwards ROI for a solo developer.** Here is the honest trade-off and a defensible ordering.

### 3.1 The trade-off, stated plainly
- The **two dominant bottlenecks** (§1.2) are the **perfect-information cheat** and **missing card memory/belief/level-state**. **Both are fixable in pure JS on the existing engine, in days-to-weeks, with zero training infrastructure.** Doing so converts the current ”weak rule bot“ into a **de-blinded, belief-based, adversarially-searching agent** — a fundamentally different and much stronger thing than the bot the 190-Elo plateau was measured on.
- The frontier's ”DMC wins 80–100% / reaches human level“ numbers are **absolute, versus weak published rule bots and casual humans** — they are **not** the marginal gain of DMC over a de-blinded ISMCTS heuristic. **The only number that justifies the expensive neural phase is the DMC-over-Phase-2 delta, and we currently have no evidence it is large.** The draft marketed the absolute frontier figure as if it were the incremental ROI.
- For a solo dev, the real cost of the neural path is **not GPU-days** (you waived those). It is **engineer-months**: porting the JS engine into a vectorized trainable Python/Torch pipeline with **bit-exact rules parity**, standing up distributed self-play, instrumenting reproducible external eval, and chasing the **silent failures** (reward-sign errors, encoding mismatches, tribute leakage, non-stationarity) that make self-play runs quietly fail for weeks. ”Effort: high“ was a euphemism for the single largest line item in the project.

### 3.2 The defensible recommendation
**Build the cheap, high-confidence path first (belief + card-tracking + ISMCTS, pure JS), ship it, *measure* it against `hard` and real humans, and gate the DMC investment on the measured residual gap.** Concretely:

1. **Primary near-term deliverable: de-blind + search (Phases 1–2).** Removes the cheat and the missing state — the very defects the diagnosis names as dominant — using `genMoves()` / `decompose()` / the existing `moveUtility` as a leaf evaluator. Highest strength-per-unit-effort, no ML risk.
2. **Then decide on DMC with data, not faith.** If the Phase-2 bot already beats `hard` by a large margin *and feels strong to good humans*, the multi-month neural run may have **near-zero perceptible marginal value for this product** (a single-player browser game for casual players) and should be reconsidered, not auto-executed. If a clear gap remains, **DMC is the right way to close it** and the long-run ceiling — proceed.

This is **not** fence-sitting: it is a **cheap-first, gate-driven** plan with an explicit **kill criterion** for the expensive phase. The neural endpoint is correct as a *ceiling* argument; it is wrong as a *first move* for a solo dev with no measured baseline.

### 3.3 If/when we do train: the DMC spec
- **State:** adopt the ~513-dim DanZero layout (verify field ranges against the primary source), suit-aware {0,1,2} blocks, wild-card flags. Reuse the **belief plumbing built in Phase 1** for the unseen-card prior.
- **Action-as-input** over `genMoves()` (DanZero 54-dim, or CRAD 133-dim typed for cleaner wild/flush — §6).
- **Reward:** ordinal finishing-order + global ±1 episode bonus (the Hyp-1 fix). **Do not** inject `evaluateHand` as a reward — that re-imports the heuristic's biases.
- **Algorithm:** DMC first (MC-return regression, ε-greedy, no bootstrapping), **shared net across seats** to pool data and damp cooperative-credit noise, **warm-start as a blend** (not bootstrap) from our tuned vectors, **checkpoint pool / opponent diversity** against non-transitive cycling, **curriculum-seeded A-level states** for the 过A cliff, **return normalization** for MC variance. Tribute heuristic, samples discarded (acknowledged scope cut). DanZero+ top-2 PPO only as later polish (~+35 Elo).
- **Evaluation (must be external — fixing the same moving-baseline flaw we criticize today):** Elo vs the 3 tiers is necessary but **not an absolute read** (a stronger net just shifts the whole ladder). **Obtain a fixed external anchor** — a ported competition rule bot or the released DanZero+ checkpoint — *before* gating shipping on internal Elo. If no anchor is obtainable, say so and treat the internal number as relative only.

---

## 4. The deployment story (concrete and honest)

The draft's ”no blocker“ was overstated. The model bytes were never the issue; the **inference runtime and the per-request cost** are. Corrected verdict: **no blocker IF we ship pure-JS inference on both paths and prove the phone / 256 MB numbers on a dummy net up front.**

### 4.1 The blocker the draft missed: the runtime payload, not the model
- The model is **~0.8–1.1 MB int8** (corrected). But **ONNX Runtime Web's WASM binary is ~9–11 MB uncompressed (~3–4 MB br/gzip)**; TF.js+WASM is the same order. The **current guandan client bundle is 243 KB.** Shipping ORT-web is a **~20–30× payload jump**, and *the runtime, not the ≤1 MB model, dominates first-load and SW-cache cost.* The draft's ”doesn't bloat the SW cache“ was exactly backwards.
- **Decision: do not ship ORT-web/TF.js to the browser.** A 4×512 MLP forward is **a handful of dense matmuls** — trivially hand-rolled in pure JS. Pure-JS inference **collapses the payload back toward 243 KB**, eliminates the WebGL/WebGPU ”uneven on phones“ risk, and **removes the WASM-runtime cold-start** entirely. This also resolves the draft's internal contradiction (three inference impls vs a ”mirror the artifact“ invariant): **ship ONE pure-JS matmul module, imported by both the browser bundle and the fly handler.** One implementation → the mirror invariant is satisfied trivially.

### 4.2 In-browser single-player — FEASIBLE with pure-JS inference, latency to be measured
- **Batch all candidate `[state‖action]` rows into one (N×567) matmul**; encode the shared 513-dim state once, vary only the action block per row.
- **Latency — must be prototyped, not asserted.** The draft's ”single-digit ms“ / ”well under 1s“ had no basis and sat in tension with its own ”fall back to slow WASM on phones.“ Honest estimate: a >5000-action opening is ~5000×~1.1M ≈ **~5 GFLOP** for the matmul alone — plausibly tens-to-hundreds of ms on a mid Android phone single-threaded — **and the likely true bottleneck is the JS-side construction of 5000+ action vectors plus state re-encoding, not the matmul.** Both lenses flagged this. **Do not call it ”well under 1s“ until measured** on a real low/mid Android device for the opening worst case.
- **Footprint:** pure-JS code (KBs) + model ~1 MB int8 ≈ back near the current 243 KB + ~1 MB. SW-cache and offline-first are preserved; no WASM runtime to cold-start.

### 4.3 Online fly.io backend — FEASIBLE, but cost is per-*request*, not per-*move*
- **The draft hid a multiplier.** Verified in `guandan-room.js`: `advanceAi()` runs a while-loop executing **every consecutive AI seat in one call** — up to **3 AI moves** when a human plays into a 3-bot table (and full auto-run for all-AI progressions); `tributeAutoStep` loops similarly — all **synchronously on the request thread**. So per-HTTP-request cost = **(consecutive AI seats) × (legal actions) × (forward pass)**, and the >5000-action opening **stacks across up to 3 seats in one handler.** With the current cheap linear eval this is invisible; with NN-per-legal-action it is several thousand forward passes ×3 in one synchronous request.
- **Mitigations:** use the **same batched-matmul** on the backend (the draft only batched the browser). Use the **same pure-JS matmul module** — avoid `onnxruntime-node`'s native binary, which pressures the **256 MB** cap (OOM risk). **No NN-MCTS on the synchronous request path.** **Concurrency:** multiple simultaneous rooms each holding model weights + per-request action-batch tensors on one shared CPU / 256 MB box has **no headroom analysis yet** — do one. The serving box (256 MB) is a completely different machine from the training box (RTX 3070 + 160 CPU); don't conflate.
- **Load-test the all-AI / 3-AI-seat opening request against the ~4 s poll budget**, not a single move.

### 4.4 Quantization fidelity and the parity invariant
- **int8 quantization can shift argmax over thousands of near-tied legal actions.** The ”mirror the artifact, front/back must not diverge“ invariant the draft cited for *rules* now applies to a *numeric net*, which is harder to keep identical (rounding, tie-breaking, op order). With **one shared pure-JS matmul module** the trainer↔browser↔server divergence problem mostly collapses, but we still must **validate that the quantized/JS student picks the same moves as the fp32 teacher** on a held-out state set before shipping. If a distilled student is ever shipped, treat it as a **different artifact behind explicit eval**, not a ”mirror.“

### 4.5 Distillation — insurance, with one option deleted
- Keep distillation in reserve **only if** the trained net is too big to ship raw (e.g., if we ever adopt the LSTM, which we are choosing not to). Distill into a **smaller NN that still consumes the full learned state encoding**, and **measure the student's Elo drop vs the teacher before committing.**
- **Delete the draft's option (ii)** — ”regress the teacher's Q onto an expanded handcrafted feature set.“ It is **self-defeating**: it re-imports the exact §1.2 feature-blindness the memo says is the primary bottleneck. A linear/2-layer regressor on handcrafted features is bounded by what those features capture and **cannot carry a teacher whose strength comes from the learned play-history / unseen-card representation.** Keep it only as an explicit *weaker* tier if ever wanted, never as a strength-preserving distillation target.

### 4.6 Build/CI and SW versioning (missing in draft)
Specify **how the trained artifact reproducibly reaches the static Jekyll/GitHub-Pages PWA and the fly bundle**, and **how SW cache-versioning invalidates an updated model without stranding offline users on an old net.** This is a real release-engineering item, not an afterthought.

**Net deployment verdict:** No hard blocker, **conditional**: pure-JS matmul on **both** client and server (one shared module), **flat history-in-state MLP only** (LSTM is out for this target), and a **deployment spike on a dummy net proving phone latency + 256 MB fit + total payload *before* the training run.** As written, ”no blocker“ was overstated; the honest statement is the conditional one.

---

## 5. Phased roadmap (cheap-first, gate-driven, with a kill criterion)

Costs are denominated in **solo-dev time**, not GPU-days. Every phase has a gate; the neural phase has an explicit **stop** condition.

### Phase 0 — Honest baseline + eval harness + deployment spike (days)
- **Build:** (a) Wire the 3 tiers into an Elo ladder over **thousands** of games anchored to a **fixed reference** (kill the moving baseline); obtain **one external anchor** if possible (competition rule bot or DanZero+ checkpoint). (b) **Deployment spike:** export a random-weight 567-in/4×512 MLP, run the **pure-JS batched matmul in-browser on a real mid Android phone** for the >5000-action opening (measure matmul *and* action-encoding time and total payload), **and** on the **256 MB fly box under a 3-AI-seat opening request.**
- **Why first:** today there is no absolute skill number and no proof the deployment economics hold. The spike can force architecture choices (model width, flat-only) *before* any expensive run.
- **Gate:** defensible Elo for `hard`; **deployment proven on a dummy net** (opening-move latency budget met, 256 MB fit, payload near current bundle).

### Phase 1 — De-blind the engine: card memory + belief + level-state, kill the cheat (1–2 weeks)
- **Build:** discard-history + remaining-card tracker; **per-opponent void/belief inference**; replace the perfect-info rollout with **determinizations sampled from the belief**; add **level-state + match-context** to `moveUtility` (it currently can't see 过A). Reuses `genMoves` / `decompose`.
- **Expected gain:** large, honest Elo bump — removes clairvoyance and the biggest missing feature. Strength still capped by the linear eval, but meaningfully higher *and* legitimate. This is the belief plumbing the eventual net's unseen-card prior reuses.
- **Gate:** beats `hard` head-to-head by a clear margin.

### Phase 2 — ISMCTS on the (now-richer) eval — the PRIMARY near-term deliverable (1–2 weeks)
- **Build:** Information-Set MCTS over belief determinizations, leaf = the now-de-blinded evaluator. Reuses everything from Phase 1.
- **Expected gain:** real adversarial multi-trick search on honest information — the de-blinded, searching agent that the §1.1 plateau **does not** bound.
- **Gate / KILL CRITERION:** **measure vs `hard` and vs good humans.** *If Phase-2 already beats `hard` by a large margin and feels strong to humans, STOP — do not build the training pipeline* (the marginal DMC value for a casual single-player game is likely imperceptible and not worth multi-month solo effort). Only if a clear, perceptible gap remains do we proceed to Phase 3. **This gate is the whole point of the re-ordering.**

### Phase 3 — DMC value net, self-play training (only if Phase-2 gap justifies it) (multi-month solo)
- **Build:** port the JS engine to a **vectorized trainable pipeline with bit-exact rules parity**; 513-dim encoder + action-as-input over `genMoves()`; DMC actor-learner; **shared net**, **blended warm-start**, **checkpoint/league pool** (non-transitivity), **A-level curriculum**, **return normalization**; ordinal + episode reward; heuristic tribute (samples dropped). Budget explicitly for **engine-throughput** (CRAD's ~2.7–4×10⁸ steps imply tens of millions of full games — the *real* feasibility gate is sim throughput, not GPU dollars) and for **debugging silent self-play failures.**
- **Expected gain:** the **honest unknown** — the DMC-over-Phase-2 delta, *not* the absolute 80–100% figure. Likely smaller than the frontier headline; justified only if Phase 2 left a clear gap.
- **Gate:** DMC net beats Phase-2 *and* `hard` by a clear, externally-anchored margin → ship.

### Phase 4 — Difficulty tiers + deployment (1 week)
- **Build:** export to **pure-JS matmul** (the module proven in Phase 0) for both single-player and fly; SW-cache versioning per §4.6. **Difficulty:** do **not** blindly replace the tested 3-vector design with SAS temperature; either keep distinct-policy tiers (different-stage checkpoints / separate warm-starts) for natural style, or **validate SAS against the population approach** first (it is one-model-plus-noise, the thing the team already rejected for feeling unnatural).
- **Gate:** opening-move latency within budget on a mid phone (re-measure, not assume), payload near current bundle, online path within 256 MB under concurrency.

### Phase 5 — Optional polish (open-ended)
- **Build:** DanZero+ top-2 PPO teacher/chooser (~+35 Elo / ~55% head-to-head — real, second-order, trains <1 day); optionally PBT for tier diversity.
- **Gate:** measurable head-to-head win over pure DMC.

---

## 6. Open questions for the owner

1. **Stop-at-Phase-2 or go neural?** The pivotal decision. Are you willing to **ship the belief+ISMCTS bot and let its measured strength decide** whether the multi-month DMC run happens? Or do you want the frontier-ceiling net regardless of marginal ROI? (My recommendation: gate on Phase-2 measurement.)
2. **Strength target & external anchor.** Is ”convincingly beats `hard`, feels strong to good humans“ enough, or do you want a *measured absolute* anchor (porting a competition baseline / running the DanZero+ checkpoint)? This sets how heavy Phase-0 eval is.
3. **Difficulty model.** Keep the tested 3-distinct-vector tiers (natural style, already built) or move to single-net + SAS temperature (simpler but one-model-plus-noise, previously rejected as unnatural)? If SAS, are you OK validating it against the population approach first?
4. **Shared net vs per-seat nets** for the 2v2 cooperative training (affects credit assignment)? Recommendation: shared.
5. **Action encoding:** DanZero 54-dim vs CRAD 133-dim typed (better wild/flush disambiguation, slightly wider input)? Low-stakes but forks the feature spec.
6. **Tribute scope:** keep naive heuristic tribute (frontier does this, deliberate strength cut) or invest in learned tribute later? Recommendation: heuristic now, note it as a known ceiling.

---

## Bottom line

**Should you train a new model? Eventually yes — but not as your first move, and not before you've measured the cheap path.** The current bot is weak for two concrete, code-verified reasons: it **cheats** (its rollout reads opponents' real cards) and it **has no memory** (no discards, no belief, no level-state). Both are fixable in **pure JS on the existing engine in days-to-weeks** — and doing so produces a de-blinded, belief-based, ISMCTS-searching agent that the existing 190-Elo ”plateau“ evidence does **not** bound, because that plateau was measured under exactly those handicaps. The frontier's ”DMC wins 80–100% / human level“ numbers are absolute-versus-weak-bots, **not** the marginal gain over such a de-blinded bot — and that marginal gain is the only number that justifies a **multi-month solo** self-play build. So: **first concrete step — Phase 0: build a fixed-anchor Elo harness for the 3 tiers AND run a one-day deployment spike (random-weight 4×512 MLP, pure-JS batched matmul) on a real mid Android phone and the 256 MB fly box to prove latency, payload, and memory before any training.** Then build belief + ISMCTS (Phases 1–2), **measure it**, and **train the DMC value net only if a clear, human-perceptible gap to `hard` remains.** When you do train: a **flat history-in-state DMC MLP (~0.8–1.1M params, ~1 MB int8), action-as-input, shared net, ordinal+episode reward, blended warm-start, served by one pure-JS matmul module on both client and server** — never ONNX-web (its ~9–11 MB runtime, not the model, is the real payload), never the LSTM, never distillation-back-to-handcrafted-features.