/* doudizhu/ai.js
 * 四档 AI 出牌决策（新手 / 普通 / 高手 / 大神）。
 *
 * 设计原则：
 *   1) 四档共用同一个决策结构 chooseUnified()，但每档对几个"聪明"功能有不同的
 *      激活概率。未激活时回退到 baseline 贪心（最便宜的非炸压牌）。
 *   2) 概率本身带高斯波动（noiseSigma），避免行为过于可预测。大神例外，无波动。
 *   3) 高手 / 大神 额外在跟牌阶段跑一个轻量 MCTS — 采样若干种对手手牌分布，
 *      对几个候选动作做"一步前瞻"评分，挑最佳。
 *
 * ctx 接口（由主程序填充）：
 *   ctx = {
 *     myIdx: 0|1|2,
 *     myRole: 'landlord' | 'peasant',
 *     landlordIdx: 0|1|2,
 *     handSizes: [n0, n1, n2],
 *     seen: number[15],            // AI 自己的"记忆"，可能有噪声（主程序按难度扰动）
 *     trickHistory: [{seat, pattern}, ...],
 *     lastTrickSeat: 0|1|2|-1,
 *   }
 */
(function () {
  'use strict';
  const E = (typeof window !== 'undefined' ? window.DDZEngine : require('./engine.js'));
  const T = E.TYPES;

  // 全副牌每个 weight 的总张数：3..A(0..11) 各 4 张，2(12) 4 张，小王(13) 1 张，大王(14) 1 张
  const TOTAL_BY_WEIGHT = [4,4,4,4,4,4,4,4,4,4,4,4,4,1,1];

  // ============================================================
  // 难度 profile：每档对各功能的激活概率 + MCTS 强度
  //
  //   counterPredictRate：反压预测（出 A/2 之前先看牌池能不能被反压）
  //   peasantCoopRate   ：农民协作（让队友收牌 / 喂小单 / 顶地主）
  //   bombSmartRate     ：炸弹时机判断（不乱甩炸，关键时刻必甩）
  //   firstPlayLookAhead：首出时按 priority 表选最优分解（否则乱出）
  //   randomActionRate  ：完全随机的概率（模拟"走神"，主要给 easy 用）
  //   mctsSamples       ：MCTS 跟牌采样次数（0 = 不跑 MCTS）
  //   noiseSigma        ：每条概率的高斯波动；大神 = 0（行为稳定）
  // ============================================================
  const LEVEL_PROFILES = {
    easy:   { counterPredictRate: 0.20, peasantCoopRate: 0.20, bombSmartRate: 0.35, firstPlayLookAhead: 0.35, randomActionRate: 0.32, mctsSamples: 0,  noiseSigma: 0.10 },
    normal: { counterPredictRate: 0.55, peasantCoopRate: 0.50, bombSmartRate: 0.65, firstPlayLookAhead: 0.78, randomActionRate: 0.08, mctsSamples: 0,  noiseSigma: 0.08 },
    hard:   { counterPredictRate: 0.82, peasantCoopRate: 0.80, bombSmartRate: 0.85, firstPlayLookAhead: 0.95, randomActionRate: 0.02, mctsSamples: 6,  noiseSigma: 0.06 },
    master: { counterPredictRate: 1.0,  peasantCoopRate: 1.0,  bombSmartRate: 1.0,  firstPlayLookAhead: 1.0,  randomActionRate: 0,    mctsSamples: 30, noiseSigma: 0    },
  };

  // ============================================================
  // WEIGHTS_BY_DIFFICULTY — 三档可训练权重（共 16 个）
  // Phase 1 阶段三档全填同一份 baseline（=当前 hard 的值），保证重构
  // 没引入行为变化；Phase 5 训练完替换为 ES + 锦标赛选出的三套不同向量。
  //
  // 5 个规则触发概率（A 类，[0,1]）：从 LEVEL_PROFILES 拆出来，由本表替代
  // 5 个 MCTS evalOnePly 系数（B 类，浮点）：原本硬编码在 evalOnePly
  // 6 个 quickHandStrength 系数（C 类，浮点）：原本硬编码在 quickHandStrength
  //
  // 不在表里的：LEVEL_PROFILES.{mctsSamples, noiseSigma} 是结构性字段，不训练
  // ============================================================
  const _W_BASELINE = {
    counterPredictRate: 0.82, peasantCoopRate: 0.80, bombSmartRate: 0.85,
    firstPlayLookAhead: 0.95, randomActionRate: 0.02,
    mctsHandShortPerCard: 2.0, mctsPartnerProgressMult: 0.8,
    mctsPartnerSmallCounterBonus: 1.5, mctsOppStrengthPenaltyMult: 0.5,
    mctsLandlordLargeCounterBonus: 2.5,
    qhsBothKings: 8, qhsBigKing: 4, qhsSmallKing: 3,
    qhsTwoMult: 2, qhsBombBonus: 6, qhsAceMult: 1,
    // 整数阈值（Phase 2.5 加，ES 用 float、运行时 Math.round）
    peasantCoopPassMinHand: 2,             // L228: hand.length > N（默认 2）
    peasantTopPartnerThresh: 4,            // L239: partnerHand <= N
    peasantTopPartnerBombThresh: 4,        // L243: landlordHand <= N（炸地主条件）
    peasantMaxOnLandlordLowThresh: 2,      // L255: landlordHand <= N
    feedPartnerThresh: 4,                  // L298: partnerHand <= N
    landlordFinishThresh: 3,               // L306: hand.length <= N
    bombMyHandThresh: 6,                   // L277: myHand <= N
    bombOppMinThresh: 3,                   // L278: oppMin <= N
    randomBombFallbackRate: 0.10,          // L289: 未激活 smart 时甩炸概率
  };
  // ============================================================
  // 三档训练权重（2026-05-29）
  //
  // 来源：scripts/sim-doudizhu.js
  //   pop-gen K=10 gen=5 popSize=20 matchesPerEval=200 startSigma=0.6（25 维空间）
  //   30 候选 + DEFAULT_W 锚点 → 31-候选锦标赛（200 matches/pair）
  //   1000-match h2h 验证：hard:normal 51%, hard:easy 64%, normal:easy 58%
  //
  // 三档风格速记（来自 25 个权重的差异化画像）：
  //   hard   (run2_gen0, Elo 1521) — "炸地主威慑型"
  //     bombMyHandThresh≈0 (永远不为减牌而炸)、qhsBigKing=6.2 / qhsTwoMult=4.3
  //     高度看重大王/2/炸弹，关键时刻才出炸，常规出牌按 priority 表
  //   normal (run4_gen4, Elo 1508) — "反协作 / 自私风格"
  //     peasantCoopRate=0.00 (从不跟队友配合)、qhsBothKings=2.5 / qhsBombBonus=1.6
  //     低估牌力，不为队友牺牲，但出牌井井有条
  //   easy   (run9_gen2, Elo 1455) — "首出乱出 / 高协作"
  //     firstPlayLookAhead=0.046 (lead 阶段几乎不用 priority 表 → 出牌偏随机)
  //     peasantCoopRate=0.97 + bombMyHandThresh=8 (热心协作 + 早早就甩炸)
  //
  // master 档保留 _W_BASELINE，配 mctsSamples=30，是单独的"最强 AI"路径
  // ============================================================
  const WEIGHTS_BY_DIFFICULTY = {
    easy: {
      counterPredictRate: 0.4550,
      peasantCoopRate: 0.9730,
      bombSmartRate: 0.7890,
      firstPlayLookAhead: 0.0465,
      randomActionRate: 0.0234,
      mctsHandShortPerCard: 1.5843,
      mctsPartnerProgressMult: 0.0125,
      mctsPartnerSmallCounterBonus: 2.1604,
      mctsOppStrengthPenaltyMult: 0.7963,
      mctsLandlordLargeCounterBonus: 1.8404,
      qhsBothKings: 9.2497,
      qhsBigKing: 2.2962,
      qhsSmallKing: 4.6806,
      qhsTwoMult: 1.0263,
      qhsBombBonus: 1.0221,
      qhsAceMult: 0.6466,
      peasantCoopPassMinHand: 1.5111,
      peasantTopPartnerThresh: 2.8309,
      peasantTopPartnerBombThresh: 4.6824,
      peasantMaxOnLandlordLowThresh: 2.7062,
      feedPartnerThresh: 4.7135,
      landlordFinishThresh: 3.0124,
      bombMyHandThresh: 7.7957,
      bombOppMinThresh: 1.2288,
      randomBombFallbackRate: 0.0219,
    },
    normal: {
      counterPredictRate: 0.2635,
      peasantCoopRate: 0.0000,
      bombSmartRate: 0.8860,
      firstPlayLookAhead: 0.9397,
      randomActionRate: 0.0337,
      mctsHandShortPerCard: 0.8157,
      mctsPartnerProgressMult: 0.9065,
      mctsPartnerSmallCounterBonus: 0.9118,
      mctsOppStrengthPenaltyMult: 0.3718,
      mctsLandlordLargeCounterBonus: 1.3182,
      qhsBothKings: 2.5175,
      qhsBigKing: 1.0862,
      qhsSmallKing: 4.5518,
      qhsTwoMult: 2.9359,
      qhsBombBonus: 1.6155,
      qhsAceMult: 1.0768,
      peasantCoopPassMinHand: 2.4842,
      peasantTopPartnerThresh: 1.5525,
      peasantTopPartnerBombThresh: 3.5458,
      peasantMaxOnLandlordLowThresh: 0.6292,
      feedPartnerThresh: 5.6727,
      landlordFinishThresh: 4.2755,
      bombMyHandThresh: 5.0855,
      bombOppMinThresh: 0.9272,
      randomBombFallbackRate: 0.1162,
    },
    hard: {
      counterPredictRate: 0.5518,
      peasantCoopRate: 0.7691,
      bombSmartRate: 0.3097,
      firstPlayLookAhead: 0.9885,
      randomActionRate: 0.0058,
      mctsHandShortPerCard: 0.8365,
      mctsPartnerProgressMult: 1.1195,
      mctsPartnerSmallCounterBonus: 0.1914,
      mctsOppStrengthPenaltyMult: 0.2879,
      mctsLandlordLargeCounterBonus: 2.7008,
      qhsBothKings: 4.8921,
      qhsBigKing: 6.2086,
      qhsSmallKing: 2.5165,
      qhsTwoMult: 4.2711,
      qhsBombBonus: 6.5560,
      qhsAceMult: 0.1064,
      peasantCoopPassMinHand: 3.3986,
      peasantTopPartnerThresh: 4.6587,
      peasantTopPartnerBombThresh: 3.5449,
      peasantMaxOnLandlordLowThresh: 3.5589,
      feedPartnerThresh: 4.8851,
      landlordFinishThresh: 3.4122,
      bombMyHandThresh: 0.0100,
      bombOppMinThresh: 3.8565,
      randomBombFallbackRate: 0.0905,
    },
    // master 档：复用 hard 的训练权重 + LEVEL_PROFILES.master 的 30 samples（更深 lookahead）
    // 这样 master 才真的是"hard + 多算几步"的严格升级版
    master: {
      counterPredictRate: 0.5518,
      peasantCoopRate: 0.7691,
      bombSmartRate: 0.3097,
      firstPlayLookAhead: 0.9885,
      randomActionRate: 0.0058,
      mctsHandShortPerCard: 0.8365,
      mctsPartnerProgressMult: 1.1195,
      mctsPartnerSmallCounterBonus: 0.1914,
      mctsOppStrengthPenaltyMult: 0.2879,
      mctsLandlordLargeCounterBonus: 2.7008,
      qhsBothKings: 4.8921,
      qhsBigKing: 6.2086,
      qhsSmallKing: 2.5165,
      qhsTwoMult: 4.2711,
      qhsBombBonus: 6.5560,
      qhsAceMult: 0.1064,
      peasantCoopPassMinHand: 3.3986,
      peasantTopPartnerThresh: 4.6587,
      peasantTopPartnerBombThresh: 3.5449,
      peasantMaxOnLandlordLowThresh: 3.5589,
      feedPartnerThresh: 4.8851,
      landlordFinishThresh: 3.4122,
      bombMyHandThresh: 0.0100,
      bombOppMinThresh: 3.8565,
      randomBombFallbackRate: 0.0905,
    },
  };

  function aiWeights(level) {
    return WEIGHTS_BY_DIFFICULTY[level] || WEIGHTS_BY_DIFFICULTY.normal;
  }

  // 高斯采样 + 钳位的功能激活骰子
  function rollFeature(rate, sigma) {
    if (rate >= 1.0 && (!sigma || sigma <= 0)) return true;
    if (rate <= 0.0 && (!sigma || sigma <= 0)) return false;
    let effective = rate;
    if (sigma && sigma > 0) {
      const u1 = Math.max(Math.random(), 1e-6);
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      effective = Math.max(0, Math.min(1, rate + z * sigma));
    }
    return Math.random() < effective;
  }

  // ============================================================
  // 首出 priority 表 — 顺子最先打，单牌最后留
  // ============================================================
  const PLAY_PRIORITY = {
    [T.STRAIGHT]: 1,
    [T.PAIR_STRAIGHT]: 2,
    [T.PLANE_PAIR]: 3,
    [T.PLANE_ONE]: 3,
    [T.PLANE]: 3,
    [T.TRIPLE_PAIR]: 4,
    [T.TRIPLE_ONE]: 4,
    [T.TRIPLE]: 5,
    [T.PAIR]: 6,
    [T.SINGLE]: 7,
    [T.FOUR_TWO]: 8,
    [T.FOUR_TWO_PAIR]: 8,
    [T.BOMB]: 9,
    [T.ROCKET]: 10,
  };

  // ============================================================
  // 辅助：座位 / 牌池 / 反压预测
  // ============================================================
  function partnerOf(myIdx, landlordIdx) {
    if (myIdx === landlordIdx) return -1;
    for (let i = 0; i < 3; i++) if (i !== myIdx && i !== landlordIdx) return i;
    return -1;
  }

  function minOppHandSize(ctx) {
    let m = 99;
    for (let i = 0; i < 3; i++) if (i !== ctx.myIdx) m = Math.min(m, ctx.handSizes[i]);
    return m;
  }

  function remainingByWeight(seen, myHand) {
    const myHist = E.histByWeight(myHand);
    const out = new Array(15).fill(0);
    for (let w = 0; w < 15; w++) {
      out[w] = TOTAL_BY_WEIGHT[w] - (seen[w] || 0) - (myHist[w] || 0);
      if (out[w] < 0) out[w] = 0;
    }
    return out;
  }

  // 给定 remaining 牌池，估计能否压住 prev（只看同型同长 + 炸弹/王炸）
  function minBeaterIn(remaining, prev) {
    if (!prev) return 0;
    if (prev.type === T.ROCKET) return null;
    if (prev.type === T.BOMB) {
      for (let w = prev.weight + 1; w < 13; w++) if (remaining[w] >= 4) return w;
      if (remaining[13] >= 1 && remaining[14] >= 1) return 100;
      return null;
    }
    if (prev.type === T.SINGLE) {
      for (let w = prev.weight + 1; w < 15; w++) if (remaining[w] >= 1) return w;
    } else if (prev.type === T.PAIR) {
      for (let w = prev.weight + 1; w < 13; w++) if (remaining[w] >= 2) return w;
    } else if (prev.type === T.TRIPLE) {
      for (let w = prev.weight + 1; w < 13; w++) if (remaining[w] >= 3) return w;
    } else if (prev.type === T.TRIPLE_ONE) {
      for (let w = prev.weight + 1; w < 13; w++) {
        if (remaining[w] >= 3) {
          for (let kw = 0; kw < 15; kw++) if (kw !== w && remaining[kw] >= 1) return w;
        }
      }
    } else if (prev.type === T.TRIPLE_PAIR) {
      for (let w = prev.weight + 1; w < 13; w++) {
        if (remaining[w] >= 3) {
          for (let kw = 0; kw < 13; kw++) if (kw !== w && remaining[kw] >= 2) return w;
        }
      }
    } else if (prev.type === T.STRAIGHT) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((remaining[w + i] || 0) < 1) { ok = false; break; }
        if (ok) return w;
      }
    } else if (prev.type === T.PAIR_STRAIGHT) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((remaining[w + i] || 0) < 2) { ok = false; break; }
        if (ok) return w;
      }
    } else if (prev.type === T.PLANE || prev.type === T.PLANE_ONE || prev.type === T.PLANE_PAIR) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((remaining[w + i] || 0) < 3) { ok = false; break; }
        if (ok) return w;
      }
    }
    for (let w = 0; w < 13; w++) if (remaining[w] >= 4) return 50 + w;
    if (remaining[13] >= 1 && remaining[14] >= 1) return 100;
    return null;
  }

  // ============================================================
  // 主决策：所有难度走这个；profile 控制每条规则的激活概率
  // ============================================================
  function chooseUnified(hand, prev, ctx, profile, w) {
    // 0. "走神"：完全随机（主要给 easy 用，模拟新手的非理性行为）
    if (Math.random() < w.randomActionRate) {
      if (!prev) {
        const plays = E.decomposeHand(hand);
        return plays[Math.floor(Math.random() * plays.length)];
      }
      const beats = E.enumerateBeats(hand, prev);
      if (!beats.length) return null;
      // 偶尔可以压但不压（明明能 beat 但 pass）
      if (Math.random() < 0.4) return null;
      return beats[Math.floor(Math.random() * beats.length)];
    }

    // 1. 本轮每个功能各掷一次骰子 — 是否激活
    const useCounter      = rollFeature(w.counterPredictRate, profile.noiseSigma);
    const usePeasantCoop  = rollFeature(w.peasantCoopRate,    profile.noiseSigma);
    const useBombSmart    = rollFeature(w.bombSmartRate,      profile.noiseSigma);
    const useFirstPriority = rollFeature(w.firstPlayLookAhead, profile.noiseSigma);

    const myRole = ctx.myRole;
    const landlordIdx = ctx.landlordIdx;
    const myIdx = ctx.myIdx;
    const partnerIdx = partnerOf(myIdx, landlordIdx);
    const partnerHand = (partnerIdx >= 0) ? ctx.handSizes[partnerIdx] : 99;
    const landlordHand = ctx.handSizes[landlordIdx];

    const beats = E.enumerateBeats(hand, prev);

    // 农民协作规则 1：队友刚出且地主没盖 → 默认 pass
    if (prev && usePeasantCoop && myRole === 'peasant'
        && ctx.lastTrickSeat === partnerIdx
        && ctx.lastTrickSeat !== landlordIdx) {
      if (hand.length > Math.round(w.peasantCoopPassMinHand) && landlordHand > 1) return null;
    }

    if (!beats.length) return null;

    // 跟牌阶段
    if (prev) {
      const nonBombs = beats.filter(p => p.type !== T.BOMB && p.type !== T.ROCKET);

      // 农民协作规则 2：队友手牌 ≤ N 且地主刚出 → 拼命顶住
      if (usePeasantCoop && myRole === 'peasant'
          && ctx.lastTrickSeat === landlordIdx
          && partnerHand <= Math.round(w.peasantTopPartnerThresh)) {
        if (nonBombs.length) {
          return nonBombs.reduce((b, p) => p.weight > b.weight ? p : b, nonBombs[0]);
        }
        if (useBombSmart && landlordHand <= Math.round(w.peasantTopPartnerBombThresh)) {
          const bombs = beats.filter(p => p.type === T.BOMB);
          if (bombs.length) return bombs[0];
          const rk = beats.find(p => p.type === T.ROCKET);
          if (rk) return rk;
        }
        return null;
      }

      // 普通跟牌：最便宜的非炸
      if (nonBombs.length) {
        // 例外：地主已剩 ≤ N 张 → 农民拼最大的
        if (myRole === 'peasant' && landlordHand <= Math.round(w.peasantMaxOnLandlordLowThresh)) {
          return nonBombs.reduce((b, p) => p.weight > b.weight ? p : b, nonBombs[0]);
        }
        const candidate = nonBombs.reduce((b, p) => p.weight < b.weight ? p : b, nonBombs[0]);

        // 反压预测：要打 A/2 之前看牌池里地主能不能反压
        if (useCounter && myRole === 'peasant' && ctx.lastTrickSeat === landlordIdx) {
          const remaining = remainingByWeight(ctx.seen || new Array(15).fill(0), hand);
          const counter = minBeaterIn(remaining, candidate);
          if (counter != null && counter < 50) {
            if (candidate.weight >= 11 && partnerHand > 4) {
              return null;
            }
          }
        }
        return candidate;
      }

      // 只剩炸弹 / 王炸
      const myHand = hand.length;
      const oppMin = minOppHandSize(ctx);
      const shouldBomb = useBombSmart && (
        myHand <= Math.round(w.bombMyHandThresh) ||
        oppMin <= Math.round(w.bombOppMinThresh) ||
        (myRole === 'peasant' && landlordHand <= Math.round(w.peasantTopPartnerBombThresh)) ||
        (myRole === 'landlord' && oppMin <= Math.round(w.peasantTopPartnerBombThresh))
      );
      if (shouldBomb) {
        const bombs = beats.filter(p => p.type === T.BOMB);
        if (bombs.length) return bombs[0];
        const rk = beats.find(p => p.type === T.ROCKET);
        if (rk) return rk;
      }
      // bombSmart 未激活时偶尔仍然甩（默认 10% — 模拟"乱炸"的新手）
      if (!useBombSmart && Math.random() < w.randomBombFallbackRate) {
        const bombs = beats.filter(p => p.type === T.BOMB);
        if (bombs.length) return bombs[0];
      }
      return null;
    }

    // 首出阶段
    // 农民协作规则 3：队友手牌 ≤ N → 主动喂小单
    if (usePeasantCoop && myRole === 'peasant'
        && partnerHand <= Math.round(w.feedPartnerThresh)) {
      const singles = E.decomposeHand(hand).filter(p => p.type === T.SINGLE);
      if (singles.length) {
        return singles.reduce((b, p) => p.weight < b.weight ? p : b, singles[0]);
      }
    }

    // 地主：手牌 ≤ N → 一手出完直接赢
    if (myRole === 'landlord' && hand.length <= Math.round(w.landlordFinishThresh)) {
      const plays = E.decomposeHand(hand);
      const winner = plays.find(p => p.cards.length === hand.length);
      if (winner) return winner;
    }

    const plays = E.decomposeHand(hand);
    if (useFirstPriority) {
      // 按 priority 表升序 — 顺子 / 连对先打
      plays.sort((a, b) => {
        const pa = PLAY_PRIORITY[a.type] || 99;
        const pb = PLAY_PRIORITY[b.type] || 99;
        if (pa !== pb) return pa - pb;
        return a.weight - b.weight;
      });
      for (const p of plays) {
        if (p.type === T.BOMB || p.type === T.ROCKET) continue;
        if (p.type === T.SINGLE && p.weight >= 12 && hand.length > 4) continue;
        return p;
      }
      return plays[0];
    } else {
      // 未激活 → 随便挑一手非炸
      const non = plays.filter(p => p.type !== T.BOMB && p.type !== T.ROCKET);
      if (non.length) return non[Math.floor(Math.random() * non.length)];
      return plays[Math.floor(Math.random() * plays.length)];
    }
  }

  // ============================================================
  // 轻量 MCTS：仅在跟牌阶段、候选 ≥ 2 时启用
  //
  // 思路（"PIMC" perfect-information Monte Carlo 的简化）：
  //   1) 采样若干种"对手手牌的可能分布"，用 seen[] 约束
  //   2) 对几个候选动作做一步前瞻：模拟"我打 M → 两家用 normal-tier 启发式应对"
  //   3) 打分：剩余手牌强度 - 对手剩余强度（用 evaluateHand 估算）
  //   4) 取均值最高的候选
  //
  // 不跑深层 rollout — 这里只评估到一轮结束。在浏览器内 budget 充足。
  // ============================================================
  function shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  // 简单牌力评估（与 evaluateHand 同口径，仅用于 MCTS 相对比较）
  function quickHandStrength(weightArray, w) {
    const ww = w || _W_BASELINE;
    let s = 0;
    const hist = new Array(15).fill(0);
    for (const x of weightArray) hist[x]++;
    if (hist[13] && hist[14]) s += ww.qhsBothKings;
    else if (hist[14]) s += ww.qhsBigKing;
    else if (hist[13]) s += ww.qhsSmallKing;
    s += (hist[12] || 0) * ww.qhsTwoMult;
    for (let k = 0; k < 13; k++) if (hist[k] >= 4) s += ww.qhsBombBonus;
    s += (hist[11] || 0) * ww.qhsAceMult;
    return s;
  }

  // 从 weight 数组中"消耗"指定 pattern 用的牌（按 weight 数）
  function consumeForPattern(weightArr, pattern) {
    if (!pattern) return weightArr.slice();
    const need = {};
    for (const c of pattern.cards) {
      // 这里 pattern.cards 可能是 cardId（54 张编码）；我们只关心 weight
      const w = E.cardWeight(c);
      need[w] = (need[w] || 0) + 1;
    }
    const result = weightArr.slice();
    for (const w of Object.keys(need)) {
      let n = need[w];
      for (let i = result.length - 1; i >= 0 && n > 0; i--) {
        if (result[i] === Number(w)) { result.splice(i, 1); n--; }
      }
    }
    return result;
  }

  // 给一个 weight 数组找一个能压过 prev 的最便宜非炸（启发式应对）
  function findCheapestNonBombByWeight(weightArr, prev) {
    if (!prev) return null;
    // 同型同长压制 — 用 minBeaterIn 找最小 weight，然后看能否凑齐
    const hist = new Array(15).fill(0);
    for (const w of weightArr) hist[w]++;
    const beater = minBeaterIn(hist, prev);
    if (beater == null || beater >= 50) return null;     // 找不到非炸压
    // 简化：返回一个虚拟 pattern 描述（type/weight/length 同 prev）
    return { type: prev.type, weight: beater, length: prev.length || prev.cards?.length || 1, cards: [] };
  }

  function sampleOpponentHandsWeights(ctx, myHand) {
    const myHist = E.histByWeight(myHand);
    const remaining = [];
    for (let w = 0; w < 15; w++) {
      const left = TOTAL_BY_WEIGHT[w] - (ctx.seen[w] || 0) - (myHist[w] || 0);
      for (let i = 0; i < left; i++) remaining.push(w);
    }
    const otherSeats = [0, 1, 2].filter(i => i !== ctx.myIdx);
    const total = ctx.handSizes[otherSeats[0]] + ctx.handSizes[otherSeats[1]];
    if (total !== remaining.length) return null;
    shuffleArray(remaining);
    return {
      [otherSeats[0]]: remaining.slice(0, ctx.handSizes[otherSeats[0]]),
      [otherSeats[1]]: remaining.slice(ctx.handSizes[otherSeats[0]]),
    };
  }

  // 一步前瞻评分：我打 M → 队友 / 对手用启发式应对 → 评估终态。
  //
  // 关键：分清"队友"和"对手"。当我是农民时，另一个农民是队友，地主才是对手。
  //   对队友：手牌越少越好（接近赢牌）；用小牌接我的牌更好（大牌留着）
  //   对真对手：剩余手牌强度越低越好
  // 这样 MCTS 才不会"破坏队友协作"。
  function evalOnePly(myMove, myHandIds, oppHandsWeights, ctx, w) {
    const ww = w || _W_BASELINE;
    const myHandWeights = myHandIds.map(c => E.cardWeight(c));
    const myAfter = consumeForPattern(myHandWeights, myMove);
    let score = quickHandStrength(myAfter, ww);

    // 我自己手牌越少越接近赢，加额外鼓励
    if (myAfter.length <= 4) score += (5 - myAfter.length) * ww.mctsHandShortPerCard;

    const iAmPeasant = (ctx.myRole === 'peasant');

    for (const seatStr of Object.keys(oppHandsWeights)) {
      const seat = Number(seatStr);
      const oppArr = oppHandsWeights[seat];
      const counter = findCheapestNonBombByWeight(oppArr, myMove);
      let oppAfter = oppArr.slice();
      let counterWeight = -1;
      if (counter) {
        counterWeight = counter.weight;
        const n = myMove.cards.length;
        let consumed = 0;
        for (let i = oppAfter.length - 1; i >= 0 && consumed < n; i--) {
          if (oppAfter[i] === counterWeight) { oppAfter.splice(i, 1); consumed++; }
        }
      }

      const seatIsLandlord = (seat === ctx.landlordIdx);

      if (iAmPeasant && !seatIsLandlord) {
        // 这是我的农民队友 — 鼓励队友的进展
        score += (17 - oppAfter.length) * ww.mctsPartnerProgressMult;
        // 队友用小牌接我的牌（大牌还留着）— 好事
        if (counter && counterWeight < 11) score += ww.mctsPartnerSmallCounterBonus;
      } else {
        // 真正的对手
        score -= quickHandStrength(oppAfter, ww) * ww.mctsOppStrengthPenaltyMult;
        // 我是农民、地主被迫用大牌反压 — 大好事
        if (iAmPeasant && seatIsLandlord && counter && counterWeight >= 11) {
          score += ww.mctsLandlordLargeCounterBonus;
        }
      }
    }
    return score;
  }

  function mctsLite(hand, prev, ctx, profile, w, samples, baselineMove) {
    if (!prev || samples <= 0) return baselineMove;
    const beats = E.enumerateBeats(hand, prev);
    if (beats.length < 2) return baselineMove;

    // 候选：baseline + 最便宜非炸 + 最贵非炸 + 中位非炸
    const nonBombs = beats.filter(p => p.type !== T.BOMB && p.type !== T.ROCKET)
                          .sort((a,b) => a.weight - b.weight);
    const candidates = new Set([baselineMove]);
    if (nonBombs.length) {
      candidates.add(nonBombs[0]);
      candidates.add(nonBombs[nonBombs.length - 1]);
      if (nonBombs.length >= 3) candidates.add(nonBombs[Math.floor(nonBombs.length / 2)]);
    }
    const candArr = Array.from(candidates);
    if (candArr.length < 2) return baselineMove;

    const scores = new Array(candArr.length).fill(0);
    let validSamples = 0;
    for (let s = 0; s < samples; s++) {
      const oppHands = sampleOpponentHandsWeights(ctx, hand);
      if (!oppHands) continue;
      validSamples++;
      for (let i = 0; i < candArr.length; i++) {
        scores[i] += evalOnePly(candArr[i], hand, oppHands, ctx, w);
      }
    }
    if (validSamples === 0) return baselineMove;

    let bestIdx = 0, bestScore = -Infinity;
    for (let i = 0; i < candArr.length; i++) {
      if (scores[i] > bestScore) { bestScore = scores[i]; bestIdx = i; }
    }
    return candArr[bestIdx];
  }

  // ============================================================
  // 总入口
  // ============================================================
  function chooseMove(hand, prev, ctx, level, wOverride) {
    const profile = LEVEL_PROFILES[level] || LEVEL_PROFILES.normal;
    const w = wOverride || aiWeights(level);
    // Phase 1 设计：三档（easy/normal/hard）统一 mctsSamples=6，差异 100% 来自
    // 权重；master 档保留 30 samples 不进训练。所有差异化策略画像通过 w 表达。
    const effectiveSamples = (level === 'master') ? profile.mctsSamples : 6;

    const baseline = chooseUnified(hand, prev, ctx, profile, w);
    if (effectiveSamples > 0 && baseline) {
      const refined = mctsLite(hand, prev, ctx, profile, w, effectiveSamples, baseline);
      return refined || baseline;
    }
    return baseline;
  }

  // 为向后兼容保留三个旧导出（薄包装）
  function chooseEasy(hand, prev, ctx)   { return chooseMove(hand, prev, ctx, 'easy'); }
  function chooseNormal(hand, prev, ctx) { return chooseMove(hand, prev, ctx, 'normal'); }
  function chooseHard(hand, prev, ctx)   { return chooseMove(hand, prev, ctx, 'hard'); }
  function chooseMaster(hand, prev, ctx) { return chooseMove(hand, prev, ctx, 'master'); }

  // ============================================================
  // 叫地主决策（按手牌强度评分）
  // ============================================================
  function evaluateHand(hand) {
    const hist = E.histByWeight(hand);
    let score = 0;
    if (hand.includes(52) && hand.includes(53)) score += 8;
    else if (hand.includes(53)) score += 4;
    else if (hand.includes(52)) score += 3;
    score += (hist[12] || 0) * 2;
    for (let w = 0; w < 13; w++) if ((hist[w] || 0) >= 4) score += 6;
    score += (hist[11] || 0) * 1;
    return score;
  }

  function bid(hand, currentBid) {
    const score = evaluateHand(hand);
    let want = 0;
    if (score >= 10) want = 3;
    else if (score >= 6) want = 2;
    else if (score >= 3) want = 1;
    if (want > currentBid) return want;
    return 0;
  }

  const api = {
    chooseMove,
    chooseEasy, chooseNormal, chooseHard, chooseMaster,
    evaluateHand, bid,
    remainingByWeight, minBeaterIn,
    PLAY_PRIORITY, LEVEL_PROFILES,
    WEIGHTS_BY_DIFFICULTY, aiWeights, _W_BASELINE,
  };

  if (typeof window !== 'undefined') window.DDZAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
