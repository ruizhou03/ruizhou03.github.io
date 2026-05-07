/* doudizhu/ai.js
 * 三档 AI 出牌决策。所有函数严格无状态：输入 (hand, prev, ctx) → 输出 play | null。
 * 续局后状态由主循环重建 ctx，AI 行为应保持一致。
 *
 *   ctx = {
 *     myIdx: 0|1|2,
 *     myRole: 'landlord' | 'peasant',
 *     landlordIdx: 0|1|2,
 *     handSizes: [n0, n1, n2],     // 三家剩余手牌数
 *     seen: number[15],            // 已见过的 weight 直方图（含底牌揭示后的）
 *     trickHistory: [{seat, pattern}, ...],
 *     lastTrickSeat: 0|1|2|-1,     // 桌面最近一手的座位（连续两 pass 后置 -1）
 *   }
 */
(function () {
  'use strict';
  const E = (typeof window !== 'undefined' ? window.DDZEngine : require('./engine.js'));
  const T = E.TYPES;

  // 全副牌每个 weight 的总张数：3..A(0..11)各 4 张，2(12)4 张，小王(13)1 张，大王(14)1 张
  const TOTAL_BY_WEIGHT = [4,4,4,4,4,4,4,4,4,4,4,4,4,1,1];

  // ============================================================
  // easy: 随机合法出牌；prev 非空时 30% 概率 pass
  // ============================================================
  function chooseEasy(hand, prev, ctx) {
    const beats = E.enumerateBeats(hand, prev);
    if (!beats.length) return null;
    if (prev && Math.random() < 0.3) return null;
    return beats[Math.floor(Math.random() * beats.length)];
  }

  // ============================================================
  // normal: 贪心
  // ============================================================
  // 跟牌：优先非炸弹小牌；炸弹仅在自家≤6 或对家≤4 时甩
  // 首出：用 decompose 后按 priority 出最值的那手
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

  function minOppHandSize(ctx) {
    let m = 99;
    for (let i = 0; i < 3; i++) if (i !== ctx.myIdx) m = Math.min(m, ctx.handSizes[i]);
    return m;
  }

  function chooseNormal(hand, prev, ctx) {
    const beats = E.enumerateBeats(hand, prev);
    if (!beats.length) return null;

    if (prev) {
      // 跟牌
      const nonBombs = beats.filter(p => p.type !== T.BOMB && p.type !== T.ROCKET);
      if (nonBombs.length) {
        return nonBombs.reduce((best, p) => (p.weight < best.weight ? p : best), nonBombs[0]);
      }
      // 只剩炸弹 / 王炸
      const myHand = hand.length;
      const oppMin = minOppHandSize(ctx);
      if (myHand <= 6 || oppMin <= 4) {
        const bombs = beats.filter(p => p.type === T.BOMB);
        if (bombs.length) return bombs.reduce((b, p) => p.weight < b.weight ? p : b, bombs[0]);
        const rk = beats.find(p => p.type === T.ROCKET);
        if (rk) return rk;
      }
      return null;
    }

    // 首出：从 decompose 里挑优先级最高的（值最低）
    const plays = E.decomposeHand(hand);
    plays.sort((a, b) => {
      const pa = PLAY_PRIORITY[a.type] || 99;
      const pb = PLAY_PRIORITY[b.type] || 99;
      if (pa !== pb) return pa - pb;
      return a.weight - b.weight;
    });
    // 别一上来就甩王炸/炸弹/2 单
    for (const p of plays) {
      if (p.type === T.BOMB || p.type === T.ROCKET) continue;
      if (p.type === T.SINGLE && p.weight >= 12) continue; // 单 2/王 留着
      return p;
    }
    // 全是炸弹/王炸/大单 — 那就出最小的
    return plays[0];
  }

  // ============================================================
  // hard: normal + 记牌器 + 角色感知 + 农民协作
  // ============================================================
  function partnerOf(myIdx, landlordIdx) {
    if (myIdx === landlordIdx) return -1;
    for (let i = 0; i < 3; i++) if (i !== myIdx && i !== landlordIdx) return i;
    return -1;
  }

  // 计算"还没见过的牌池"（不在 seen、不在 myHand 里的牌池里有多少 weight）
  function remainingByWeight(seen, myHand) {
    const myHist = E.histByWeight(myHand);
    const out = new Array(15).fill(0);
    for (let w = 0; w < 15; w++) {
      out[w] = TOTAL_BY_WEIGHT[w] - (seen[w] || 0) - (myHist[w] || 0);
      if (out[w] < 0) out[w] = 0;
    }
    return out;
  }

  // 估算"当前牌型 prev 在 remaining 里能被压住的最低 weight"
  // 简化版：只考虑同型同长压制 + 炸弹/王炸
  // 返回 null 表示池里压不住
  function minBeaterIn(remaining, prev) {
    if (!prev) return 0;
    if (prev.type === T.ROCKET) return null;
    if (prev.type === T.BOMB) {
      for (let w = prev.weight + 1; w < 13; w++) {
        if (remaining[w] >= 4) return w;
      }
      // 王炸
      if (remaining[13] >= 1 && remaining[14] >= 1) return 100;
      return null;
    }
    // 普通牌型：先看同型同长能否压；炸弹/王炸都算备选
    if (prev.type === T.SINGLE) {
      for (let w = prev.weight + 1; w < 15; w++) if (remaining[w] >= 1) return w;
    } else if (prev.type === T.PAIR) {
      for (let w = prev.weight + 1; w < 13; w++) if (remaining[w] >= 2) return w;
    } else if (prev.type === T.TRIPLE) {
      for (let w = prev.weight + 1; w < 13; w++) if (remaining[w] >= 3) return w;
    } else if (prev.type === T.TRIPLE_ONE) {
      for (let w = prev.weight + 1; w < 13; w++) {
        if (remaining[w] >= 3) {
          // 还得有任一 kicker
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
    } else if (prev.type === T.PLANE) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((remaining[w + i] || 0) < 3) { ok = false; break; }
        if (ok) return w;
      }
    } else if (prev.type === T.PLANE_ONE || prev.type === T.PLANE_PAIR) {
      // 简化：只看主组够不够
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((remaining[w + i] || 0) < 3) { ok = false; break; }
        if (ok) return w;
      }
    }
    // 炸弹反压
    for (let w = 0; w < 13; w++) if (remaining[w] >= 4) return 50 + w;
    if (remaining[13] >= 1 && remaining[14] >= 1) return 100;
    return null;
  }

  function chooseHard(hand, prev, ctx) {
    const myRole = ctx.myRole;
    const landlordIdx = ctx.landlordIdx;
    const myIdx = ctx.myIdx;
    const partnerIdx = partnerOf(myIdx, landlordIdx);
    const partnerHand = (partnerIdx >= 0) ? ctx.handSizes[partnerIdx] : 99;
    const landlordHand = ctx.handSizes[landlordIdx];

    const beats = E.enumerateBeats(hand, prev);

    // 农民协作规则 1: 队友刚出且地主没盖 → 永远 pass（除非自己手牌 ≤ 2 直接收）
    if (prev && myRole === 'peasant' && ctx.lastTrickSeat === partnerIdx) {
      // 例外：如果我的手牌已经很少（≤ 2），或者队友手牌还多（>10）反而该自己接
      if (hand.length > 2 && partnerHand <= 10) {
        return null;
      }
    }

    if (!beats.length) return null;

    // 跟牌阶段
    if (prev) {
      const nonBombs = beats.filter(p => p.type !== T.BOMB && p.type !== T.ROCKET);
      const remaining = remainingByWeight(ctx.seen || new Array(15).fill(0), hand);

      // 农民协作规则 2: 队友手牌 ≤ 4，地主出牌→我能压就压（防止地主转手）
      if (myRole === 'peasant' && ctx.lastTrickSeat === landlordIdx && partnerHand <= 4) {
        if (nonBombs.length) {
          // 选最大那张压（让地主彻底没机会反压）
          return nonBombs.reduce((b, p) => p.weight > b.weight ? p : b, nonBombs[0]);
        }
        // 没普通牌可压 — 如果地主手牌很少，连炸弹都甩
        if (landlordHand <= 4) {
          const bombs = beats.filter(p => p.type === T.BOMB);
          if (bombs.length) return bombs[0];
          const rk = beats.find(p => p.type === T.ROCKET);
          if (rk) return rk;
        }
        return null;
      }

      // 地主单挑 / 农民对地主普通跟牌
      if (nonBombs.length) {
        // 如果地主只剩 ≤2 张，必须不惜代价压
        if (myRole === 'peasant' && landlordHand <= 2) {
          return nonBombs.reduce((b, p) => p.weight > b.weight ? p : b, nonBombs[0]);
        }
        // 否则出最小那张
        return nonBombs.reduce((b, p) => p.weight < b.weight ? p : b, nonBombs[0]);
      }

      // 只剩炸弹/王炸
      const myHand = hand.length;
      const oppMin = minOppHandSize(ctx);
      const shouldBomb =
        myHand <= 6 ||
        oppMin <= 3 ||
        (myRole === 'peasant' && landlordHand <= 4) ||
        (myRole === 'landlord' && oppMin <= 4);
      if (shouldBomb) {
        const bombs = beats.filter(p => p.type === T.BOMB);
        if (bombs.length) return bombs[0];
        const rk = beats.find(p => p.type === T.ROCKET);
        if (rk) return rk;
      }
      return null;
    }

    // 首出阶段
    const plays = E.decomposeHand(hand);

    // 农民协作规则 3: 队友手牌 ≤ 4，主动出小单牌（不出长结构）
    if (myRole === 'peasant' && partnerHand <= 4) {
      const singles = plays.filter(p => p.type === T.SINGLE);
      if (singles.length) {
        return singles.reduce((b, p) => p.weight < b.weight ? p : b, singles[0]);
      }
    }

    // 地主：如果我手牌已经很少（≤ 3），优先打必胜
    if (myRole === 'landlord' && hand.length <= 3) {
      // 一手出完就赢
      const winner = plays.find(p => p.cards.length === hand.length);
      if (winner) return winner;
    }

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
  }

  // ============================================================
  // 总入口
  // ============================================================
  function chooseMove(hand, prev, ctx, level) {
    if (level === 'easy') return chooseEasy(hand, prev, ctx);
    if (level === 'hard') return chooseHard(hand, prev, ctx);
    return chooseNormal(hand, prev, ctx);
  }

  // ============================================================
  // 叫地主决策（简化版）：根据手牌强度决定叫几分
  // 强度评分：
  //   王炸 (52+53)             +8
  //   单大王                    +4
  //   单小王                    +3
  //   每张 2                   +2
  //   每个炸弹                  +6
  //   含 A 多                   +1 each
  // 总分阈值：≥10 叫 3 分，≥6 叫 2 分，≥3 叫 1 分，否则不叫
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
    return 0; // 不叫
  }

  const api = {
    chooseMove,
    chooseEasy, chooseNormal, chooseHard,
    evaluateHand, bid,
    remainingByWeight, minBeaterIn,
    PLAY_PRIORITY,
  };

  if (typeof window !== 'undefined') window.DDZAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
