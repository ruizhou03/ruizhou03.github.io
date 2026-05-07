/* doudizhu/engine.js
 * 斗地主核心引擎：牌编码、牌型解析、合法性比较、手牌枚举与最少手数分解。
 * 全部纯函数，无副作用 — 方便单元测试，也方便 AI 模块复用、便于续局后行为一致。
 *
 * 牌编码（整数 0..53）：
 *   0..51  : (rank << 2) | suit
 *     rank: 0..12 对应 3,4,5,6,7,8,9,10,J,Q,K,A,2
 *     suit: 0=♠ 1=♥ 2=♦ 3=♣
 *   52     : 小王（黑王）
 *   53     : 大王（红王）
 *
 * weight（用于比较，跟 rank 一一对应但单列出来更直观）：
 *   3..10 → 0..7,  J=8, Q=9, K=10, A=11, 2=12, 小王=13, 大王=14
 *
 * 暴露在 window.DDZEngine（浏览器 IIFE）。
 */
(function () {
  'use strict';

  const RANK_LABELS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const SUIT_LABELS = ['♠', '♥', '♦', '♣'];
  // Unicode 扑克牌起点：U+1F0A1 黑桃 A，按花色每色 16 个 codepoint
  // 我们用 (rank, suit) 反查到具体字符
  const SUIT_BASE = [0x1F0A0, 0x1F0B0, 0x1F0C0, 0x1F0D0]; // ♠/♥/♦/♣ 的基址
  // 每花色里牌的偏移：A=1, 2=2, ..., 10=10, J=11, C(骑士)=12跳过, Q=13, K=14
  // 我们用的是 A,2,3,4,5,6,7,8,9,10,J,Q,K（跳过骑士 C）
  const RANK_OFFSET_FROM_A = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]; // index = rank-of-A-as-1 (0..12)

  function cardId(rank, suit) { return (rank << 2) | suit; }
  function cardRank(c) { return c >= 52 ? (c === 52 ? 13 : 14) : (c >> 2); }
  function cardSuit(c) { return c >= 52 ? 0 : (c & 3); }
  function cardWeight(c) { return cardRank(c); } // weight === rank in our encoding

  // 渲染：返回 unicode 字符 + 是否红色花色（用于 CSS 上色）
  function cardGlyph(c) {
    if (c === 52) return { ch: '🃟', red: false }; // 小王（黑王，但渲染上常见为 black joker）
    if (c === 53) return { ch: '🃏', red: true };  // 大王（红王，常见为 red joker）
    const r = cardRank(c);
    const s = cardSuit(c);
    // ddz 里 rank 0..12 对应 3..A,2，为查表方便先转成"以 A=0、2=1、3=2..."不太自然
    // 改用我们的 rank: 0=3, 1=4, ..., 7=10, 8=J, 9=Q, 10=K, 11=A, 12=2
    // 映射到「扑克 unicode 里 rank 序号」（A=1, 2=2, ..., 10=10, J=11, Q=13, K=14）
    const POKER_OFFSET = {
      0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10,
      8: 11, 9: 13, 10: 14, 11: 1, 12: 2,
    };
    const off = POKER_OFFSET[r];
    return {
      ch: String.fromCodePoint(SUIT_BASE[s] + off),
      red: (s === 1 || s === 2),
    };
  }

  function cardLabel(c) {
    if (c === 52) return 'BJ';
    if (c === 53) return 'RJ';
    return SUIT_LABELS[cardSuit(c)] + RANK_LABELS[cardRank(c)];
  }

  // 一副完整 54 张牌
  function fullDeck() {
    const out = [];
    for (let r = 0; r < 13; r++) for (let s = 0; s < 4; s++) out.push(cardId(r, s));
    out.push(52); out.push(53);
    return out;
  }

  function shuffle(arr, rng) {
    const r = rng || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function deal(rng) {
    const d = shuffle(fullDeck(), rng);
    return {
      hands: [d.slice(0, 17), d.slice(17, 34), d.slice(34, 51)],
      bottom: d.slice(51, 54),
    };
  }

  // 排序（升序 by weight；同 weight 按 suit）
  function sortHand(cards) {
    return cards.slice().sort((a, b) => cardWeight(a) - cardWeight(b) || cardSuit(a) - cardSuit(b));
  }

  // 频次直方图：map weight -> count
  function histByWeight(cards) {
    const h = {};
    for (const c of cards) {
      const w = cardWeight(c);
      h[w] = (h[w] || 0) + 1;
    }
    return h;
  }

  // 把直方图分组：返回 { count -> [weights]（升序） }
  // 比如 hist={3:2, 4:2, 5:1} → {2: [3,4], 1: [5]}
  function groupByCount(hist) {
    const g = {};
    for (const w of Object.keys(hist)) {
      const cnt = hist[w];
      if (!g[cnt]) g[cnt] = [];
      g[cnt].push(Number(w));
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => a - b);
    return g;
  }

  // 检查一组 weight 是否连续
  function isConsecutive(weights) {
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] !== weights[i - 1] + 1) return false;
    }
    return true;
  }

  // 对斗地主而言，单顺 / 连对 / 飞机的连续段不能含 2(weight=12) 或王(13/14)
  function noBigCards(weights) {
    return weights.every(w => w < 12);
  }

  // ============================================================
  // parsePattern(cards) — 把任意一组牌识别成牌型；非法返回 null
  // ============================================================
  // PlayPattern shape:
  //   { type, weight, length?, kickerCount?, cards: number[] }
  // type 取值见下面常量。weight 是"主组的代表 weight"，比较时用：
  //   single/pair/triple/triple_one/triple_pair/four_two/four_two_pair/bomb
  //     → weight = 主组的那个 weight
  //   straight / pair_straight / plane*
  //     → weight = 主组连续段的最低 weight（约定）
  //   rocket → weight = 100（保证最大）
  const TYPES = {
    SINGLE: 'single',
    PAIR: 'pair',
    TRIPLE: 'triple',
    TRIPLE_ONE: 'triple_one',
    TRIPLE_PAIR: 'triple_pair',
    STRAIGHT: 'straight',
    PAIR_STRAIGHT: 'pair_straight',
    PLANE: 'plane',
    PLANE_ONE: 'plane_one',
    PLANE_PAIR: 'plane_pair',
    FOUR_TWO: 'four_two',
    FOUR_TWO_PAIR: 'four_two_pair',
    BOMB: 'bomb',
    ROCKET: 'rocket',
    PASS: 'pass',
  };

  function parsePattern(cards) {
    if (!cards || cards.length === 0) return null;
    const n = cards.length;

    // 王炸
    if (n === 2 && cards.includes(52) && cards.includes(53)) {
      return { type: TYPES.ROCKET, weight: 100, cards: cards.slice() };
    }

    const hist = histByWeight(cards);
    const groups = groupByCount(hist);
    const weights = Object.keys(hist).map(Number).sort((a, b) => a - b);

    // 单张
    if (n === 1) {
      return { type: TYPES.SINGLE, weight: cardWeight(cards[0]), cards: cards.slice() };
    }
    // 对子
    if (n === 2) {
      if ((groups[2] || []).length === 1) {
        return { type: TYPES.PAIR, weight: groups[2][0], cards: cards.slice() };
      }
      return null;
    }
    // 三张
    if (n === 3) {
      if ((groups[3] || []).length === 1) {
        return { type: TYPES.TRIPLE, weight: groups[3][0], cards: cards.slice() };
      }
      return null;
    }
    // 4 张：炸弹 / 三带一
    if (n === 4) {
      if ((groups[4] || []).length === 1) {
        return { type: TYPES.BOMB, weight: groups[4][0], cards: cards.slice() };
      }
      if ((groups[3] || []).length === 1 && (groups[1] || []).length === 1) {
        return { type: TYPES.TRIPLE_ONE, weight: groups[3][0], kickerCount: 1, cards: cards.slice() };
      }
      return null;
    }
    // 5 张：三带二 / 单顺
    if (n === 5) {
      if ((groups[3] || []).length === 1 && (groups[2] || []).length === 1) {
        return { type: TYPES.TRIPLE_PAIR, weight: groups[3][0], kickerCount: 2, cards: cards.slice() };
      }
      // 单顺：5 张全单 + 连续 + 不含 2/王
      if ((groups[1] || []).length === 5 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 5, cards: cards.slice() };
      }
      return null;
    }
    // 6 张：单顺6 / 连对3 / 四带二（单）/ 飞机不带
    if (n === 6) {
      if ((groups[1] || []).length === 6 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 6, cards: cards.slice() };
      }
      if ((groups[2] || []).length === 3 && isConsecutive(groups[2]) && noBigCards(groups[2])) {
        return { type: TYPES.PAIR_STRAIGHT, weight: groups[2][0], length: 3, cards: cards.slice() };
      }
      if ((groups[3] || []).length === 2 && isConsecutive(groups[3]) && noBigCards(groups[3])) {
        // 两连三不带（飞机不带翼）
        return { type: TYPES.PLANE, weight: groups[3][0], length: 2, cards: cards.slice() };
      }
      // 四带二（单）：6 张里 1 个四 + 2 个单（且两单不能再凑成对，但允许两单同 weight？
      // 标准规则：四带二的"二"是任意两张单牌（含同 weight 的对子也行），但有些地方限定为两张不同点数。
      // 我们采纳常见网络版规则：两张单牌可以相同 weight（即等价于"四带一对"），实际上等同 four_two_pair 中带一对。
      // 简化为：1 个四 + 2 张单（不要求 weight 不同）
      if ((groups[4] || []).length === 1 && cards.length === 6) {
        // 四张以外的 2 张
        const fourW = groups[4][0];
        const others = cards.filter(c => cardWeight(c) !== fourW);
        if (others.length === 2) {
          return { type: TYPES.FOUR_TWO, weight: fourW, kickerCount: 2, cards: cards.slice() };
        }
      }
      return null;
    }
    // 7 张：单顺
    if (n === 7) {
      if ((groups[1] || []).length === 7 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 7, cards: cards.slice() };
      }
      return null;
    }
    // 8 张：单顺8 / 连对4 / 飞机带翼（2 三 + 2 单）/ 四带二对（1 四 + 2 对）
    if (n === 8) {
      if ((groups[1] || []).length === 8 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 8, cards: cards.slice() };
      }
      if ((groups[2] || []).length === 4 && isConsecutive(groups[2]) && noBigCards(groups[2])) {
        return { type: TYPES.PAIR_STRAIGHT, weight: groups[2][0], length: 4, cards: cards.slice() };
      }
      // 飞机带翼（带单）：2 个连续三 + 2 个单牌（单牌 weight 不能和飞机自身相同；可以和王同？王张数最多1，
      // 跟飞机自身 weight 永远不同）。两个单牌允许相等。
      if ((groups[3] || []).length === 2 && isConsecutive(groups[3]) && noBigCards(groups[3])) {
        const planeWeights = new Set(groups[3]);
        const singles = cards.filter(c => !planeWeights.has(cardWeight(c)));
        // singles 必须恰好 2 张（即 n - 6 = 2），上面 n===8 已保证。
        // 不允许 singles 里再凑出三张（即不能含飞机 weight），上面 filter 已保证。
        // 不允许 singles 里再凑出炸弹（即四张同 weight）；singles 只 2 张，自然不会。
        if (singles.length === 2) {
          return { type: TYPES.PLANE_ONE, weight: groups[3][0], length: 2, kickerCount: 1, cards: cards.slice() };
        }
      }
      // 四带二对：1 个四 + 2 个对（两对 weight 不能与四相同，且互不相等）
      if ((groups[4] || []).length === 1 && (groups[2] || []).length === 2) {
        return { type: TYPES.FOUR_TWO_PAIR, weight: groups[4][0], kickerCount: 2, cards: cards.slice() };
      }
      return null;
    }
    // 9 张：单顺
    if (n === 9) {
      if ((groups[1] || []).length === 9 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 9, cards: cards.slice() };
      }
      // 三连三不带（极少见）
      if ((groups[3] || []).length === 3 && isConsecutive(groups[3]) && noBigCards(groups[3])) {
        return { type: TYPES.PLANE, weight: groups[3][0], length: 3, cards: cards.slice() };
      }
      return null;
    }
    // 10 张：单顺10 / 连对5 / 飞机带对 (2 三 + 2 对)
    if (n === 10) {
      if ((groups[1] || []).length === 10 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 10, cards: cards.slice() };
      }
      if ((groups[2] || []).length === 5 && isConsecutive(groups[2]) && noBigCards(groups[2])) {
        return { type: TYPES.PAIR_STRAIGHT, weight: groups[2][0], length: 5, cards: cards.slice() };
      }
      // 飞机带对：2 个连续三 + 2 个对子（对子的 weight 不能与飞机自身相同）
      if ((groups[3] || []).length === 2 && isConsecutive(groups[3]) && noBigCards(groups[3])) {
        const planeW = new Set(groups[3]);
        const pairWs = (groups[2] || []).filter(w => !planeW.has(w));
        if (pairWs.length === 2) {
          return { type: TYPES.PLANE_PAIR, weight: groups[3][0], length: 2, kickerCount: 2, cards: cards.slice() };
        }
      }
      return null;
    }
    // 11 张：单顺11
    if (n === 11) {
      if ((groups[1] || []).length === 11 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 11, cards: cards.slice() };
      }
      return null;
    }
    // 12 张：单顺12 / 连对6 / 飞机带翼（3 三 + 3 单）/ 三连三 + 单
    if (n === 12) {
      if ((groups[1] || []).length === 12 && isConsecutive(weights) && noBigCards(weights)) {
        return { type: TYPES.STRAIGHT, weight: weights[0], length: 12, cards: cards.slice() };
      }
      if ((groups[2] || []).length === 6 && isConsecutive(groups[2]) && noBigCards(groups[2])) {
        return { type: TYPES.PAIR_STRAIGHT, weight: groups[2][0], length: 6, cards: cards.slice() };
      }
      if ((groups[3] || []).length === 3 && isConsecutive(groups[3]) && noBigCards(groups[3])) {
        const planeW = new Set(groups[3]);
        const singles = cards.filter(c => !planeW.has(cardWeight(c)));
        if (singles.length === 3) {
          return { type: TYPES.PLANE_ONE, weight: groups[3][0], length: 3, kickerCount: 1, cards: cards.slice() };
        }
      }
      return null;
    }
    // 长顺子（最长 12，weight 0..11，全 A 不到 2）
    if (n >= 5 && n <= 12 && (groups[1] || []).length === n && isConsecutive(weights) && noBigCards(weights)) {
      return { type: TYPES.STRAIGHT, weight: weights[0], length: n, cards: cards.slice() };
    }

    // 一些更长的飞机带对或带单可以补充，但实战中很罕见，v1 暂略
    return null;
  }

  // ============================================================
  // canBeat(me, prev) — 我能不能盖住上家
  // ============================================================
  function canBeat(me, prev) {
    if (!me) return false;
    if (!prev) return true;                      // 首出/桌面空 → 任何合法牌型均可
    if (me.type === TYPES.ROCKET) return true;   // 王炸最大
    if (me.type === TYPES.BOMB) {
      if (prev.type === TYPES.ROCKET) return false;
      if (prev.type === TYPES.BOMB) return me.weight > prev.weight;
      return true;
    }
    // 普通牌型：必须同型同长同 kicker 形态，比 weight
    if (me.type !== prev.type) return false;
    if ((me.length || 0) !== (prev.length || 0)) return false;
    if ((me.kickerCount || 0) !== (prev.kickerCount || 0)) return false;
    return me.weight > prev.weight;
  }

  // ============================================================
  // enumerateBeats(hand, prev) — 列出 hand 里所有"能盖 prev"的合法出牌
  // 返回 PlayPattern[]，**不含** PASS。
  // 实现思路：根据 prev 的 type/length/kickerCount 反推枚举模板。
  // ============================================================
  function enumerateBeats(hand, prev) {
    const out = [];
    const hist = histByWeight(hand);
    const weights = Object.keys(hist).map(Number).sort((a, b) => a - b);
    const w2cards = {};
    for (const c of hand) {
      const w = cardWeight(c);
      if (!w2cards[w]) w2cards[w] = [];
      w2cards[w].push(c);
    }

    function pickN(w, n) { return w2cards[w].slice(0, n); }
    function hasBJandRJ() { return hand.includes(52) && hand.includes(53); }

    // 王炸：永远可以盖（除非自己已经是王炸 prev — 但王炸 vs 王炸不可能因为只有一对王）
    if (hasBJandRJ()) {
      const cards = [52, 53];
      out.push({ type: TYPES.ROCKET, weight: 100, cards });
    }

    // 炸弹：枚举所有 4 张同 weight，看能不能盖
    for (const w of weights) {
      if ((hist[w] || 0) >= 4) {
        const me = { type: TYPES.BOMB, weight: w, cards: pickN(w, 4) };
        if (canBeat(me, prev)) out.push(me);
      }
    }

    if (!prev) {
      // 首出：枚举所有可以打出的合法牌型（不含王炸/炸弹，已经在上面加了）
      enumerateAllNonBomb(hand, hist, weights, w2cards, out);
      return out;
    }

    // 跟牌：根据 prev.type 反推
    const t = prev.type;
    if (t === TYPES.SINGLE) {
      for (const w of weights) {
        if (w > prev.weight) out.push({ type: TYPES.SINGLE, weight: w, cards: pickN(w, 1) });
      }
      // 王
      if (hand.includes(52) && prev.weight < 13) out.push({ type: TYPES.SINGLE, weight: 13, cards: [52] });
      if (hand.includes(53) && prev.weight < 14) out.push({ type: TYPES.SINGLE, weight: 14, cards: [53] });
    } else if (t === TYPES.PAIR) {
      for (const w of weights) {
        if (w > prev.weight && (hist[w] || 0) >= 2) {
          out.push({ type: TYPES.PAIR, weight: w, cards: pickN(w, 2) });
        }
      }
    } else if (t === TYPES.TRIPLE) {
      for (const w of weights) {
        if (w > prev.weight && (hist[w] || 0) >= 3) {
          out.push({ type: TYPES.TRIPLE, weight: w, cards: pickN(w, 3) });
        }
      }
    } else if (t === TYPES.TRIPLE_ONE) {
      // 找 weight > prev.weight 的三 + 任一 kicker（单）
      for (const w of weights) {
        if (w > prev.weight && (hist[w] || 0) >= 3) {
          const tripleCards = pickN(w, 3);
          for (const w2 of weights) {
            if (w2 === w) continue;
            // 取一张
            out.push({
              type: TYPES.TRIPLE_ONE, weight: w, kickerCount: 1,
              cards: tripleCards.concat(pickN(w2, 1)),
            });
          }
          // 单王也能当 kicker
          if (hand.includes(52)) out.push({ type: TYPES.TRIPLE_ONE, weight: w, kickerCount: 1, cards: tripleCards.concat([52]) });
          if (hand.includes(53)) out.push({ type: TYPES.TRIPLE_ONE, weight: w, kickerCount: 1, cards: tripleCards.concat([53]) });
        }
      }
    } else if (t === TYPES.TRIPLE_PAIR) {
      for (const w of weights) {
        if (w > prev.weight && (hist[w] || 0) >= 3) {
          const tripleCards = pickN(w, 3);
          for (const w2 of weights) {
            if (w2 === w) continue;
            if ((hist[w2] || 0) >= 2) {
              out.push({
                type: TYPES.TRIPLE_PAIR, weight: w, kickerCount: 2,
                cards: tripleCards.concat(pickN(w2, 2)),
              });
            }
          }
        }
      }
    } else if (t === TYPES.STRAIGHT) {
      const len = prev.length;
      // 找所有起点 w 满足: w > prev.weight, w..w+len-1 全 < 12, 全有牌
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if (!hist[w + i]) { ok = false; break; }
        if (!ok) continue;
        const cards = [];
        for (let i = 0; i < len; i++) cards.push(pickN(w + i, 1)[0]);
        out.push({ type: TYPES.STRAIGHT, weight: w, length: len, cards });
      }
    } else if (t === TYPES.PAIR_STRAIGHT) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((hist[w + i] || 0) < 2) { ok = false; break; }
        if (!ok) continue;
        const cards = [];
        for (let i = 0; i < len; i++) cards.push(...pickN(w + i, 2));
        out.push({ type: TYPES.PAIR_STRAIGHT, weight: w, length: len, cards });
      }
    } else if (t === TYPES.PLANE) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((hist[w + i] || 0) < 3) { ok = false; break; }
        if (!ok) continue;
        const cards = [];
        for (let i = 0; i < len; i++) cards.push(...pickN(w + i, 3));
        out.push({ type: TYPES.PLANE, weight: w, length: len, cards });
      }
    } else if (t === TYPES.PLANE_ONE) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((hist[w + i] || 0) < 3) { ok = false; break; }
        if (!ok) continue;
        const planeRange = new Set();
        for (let i = 0; i < len; i++) planeRange.add(w + i);
        const planeCards = [];
        for (let i = 0; i < len; i++) planeCards.push(...pickN(w + i, 3));
        // 选 len 张单作 kicker：从 weights 里挑 len 个非 plane 的（每个 weight 只取 1 张，王也算）
        const kickerPool = weights.filter(ww => !planeRange.has(ww));
        const allKickers = kickerPool.slice();
        if (hand.includes(52)) allKickers.push(13);
        if (hand.includes(53)) allKickers.push(14);
        if (allKickers.length < len) continue;
        // v1 简化：只挑最小 len 个作为代表（AI 出牌不需要枚举所有组合）
        const chosen = allKickers.slice(0, len);
        const kickerCards = [];
        for (const kw of chosen) {
          if (kw === 13) kickerCards.push(52);
          else if (kw === 14) kickerCards.push(53);
          else kickerCards.push(pickN(kw, 1)[0]);
        }
        out.push({
          type: TYPES.PLANE_ONE, weight: w, length: len, kickerCount: 1,
          cards: planeCards.concat(kickerCards),
        });
      }
    } else if (t === TYPES.PLANE_PAIR) {
      const len = prev.length;
      for (let w = prev.weight + 1; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((hist[w + i] || 0) < 3) { ok = false; break; }
        if (!ok) continue;
        const planeRange = new Set();
        for (let i = 0; i < len; i++) planeRange.add(w + i);
        const planeCards = [];
        for (let i = 0; i < len; i++) planeCards.push(...pickN(w + i, 3));
        // 选 len 个对作 kicker
        const pairWs = weights.filter(ww => !planeRange.has(ww) && hist[ww] >= 2);
        if (pairWs.length < len) continue;
        const chosen = pairWs.slice(0, len);
        const kickerCards = [];
        for (const kw of chosen) kickerCards.push(...pickN(kw, 2));
        out.push({
          type: TYPES.PLANE_PAIR, weight: w, length: len, kickerCount: 2,
          cards: planeCards.concat(kickerCards),
        });
      }
    } else if (t === TYPES.FOUR_TWO) {
      for (const w of weights) {
        if (w > prev.weight && hist[w] >= 4) {
          const fourCards = pickN(w, 4);
          // 选 2 张单作 kicker
          const others = hand.filter(c => cardWeight(c) !== w);
          if (others.length < 2) continue;
          out.push({
            type: TYPES.FOUR_TWO, weight: w, kickerCount: 2,
            cards: fourCards.concat(others.slice(0, 2)),
          });
        }
      }
    } else if (t === TYPES.FOUR_TWO_PAIR) {
      for (const w of weights) {
        if (w > prev.weight && hist[w] >= 4) {
          const fourCards = pickN(w, 4);
          const pairWs = weights.filter(ww => ww !== w && hist[ww] >= 2);
          if (pairWs.length < 2) continue;
          const k1 = pickN(pairWs[0], 2);
          const k2 = pickN(pairWs[1], 2);
          out.push({
            type: TYPES.FOUR_TWO_PAIR, weight: w, kickerCount: 2,
            cards: fourCards.concat(k1, k2),
          });
        }
      }
    }
    // ROCKET / BOMB 已在上面统一处理

    return out;
  }

  // 首出阶段：枚举所有合法非炸弹/非火箭牌型（用于 enumerateBeats(prev=null)）
  function enumerateAllNonBomb(hand, hist, weights, w2cards, out) {
    function pickN(w, n) { return w2cards[w].slice(0, n); }

    // 单
    for (const w of weights) out.push({ type: TYPES.SINGLE, weight: w, cards: pickN(w, 1) });
    if (hand.includes(52)) out.push({ type: TYPES.SINGLE, weight: 13, cards: [52] });
    if (hand.includes(53)) out.push({ type: TYPES.SINGLE, weight: 14, cards: [53] });

    // 对
    for (const w of weights) if (hist[w] >= 2) out.push({ type: TYPES.PAIR, weight: w, cards: pickN(w, 2) });

    // 三
    for (const w of weights) if (hist[w] >= 3) out.push({ type: TYPES.TRIPLE, weight: w, cards: pickN(w, 3) });

    // 三带一
    for (const w of weights) {
      if (hist[w] >= 3) {
        const tc = pickN(w, 3);
        for (const w2 of weights) {
          if (w2 === w) continue;
          out.push({ type: TYPES.TRIPLE_ONE, weight: w, kickerCount: 1, cards: tc.concat(pickN(w2, 1)) });
        }
      }
    }
    // 三带二
    for (const w of weights) {
      if (hist[w] >= 3) {
        const tc = pickN(w, 3);
        for (const w2 of weights) {
          if (w2 === w) continue;
          if (hist[w2] >= 2) out.push({ type: TYPES.TRIPLE_PAIR, weight: w, kickerCount: 2, cards: tc.concat(pickN(w2, 2)) });
        }
      }
    }

    // 单顺
    for (let len = 5; len <= 12; len++) {
      for (let w = 0; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if (!hist[w + i]) { ok = false; break; }
        if (!ok) continue;
        const cards = [];
        for (let i = 0; i < len; i++) cards.push(pickN(w + i, 1)[0]);
        out.push({ type: TYPES.STRAIGHT, weight: w, length: len, cards });
      }
    }

    // 连对
    for (let len = 3; len <= 10; len++) {
      for (let w = 0; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((hist[w + i] || 0) < 2) { ok = false; break; }
        if (!ok) continue;
        const cards = [];
        for (let i = 0; i < len; i++) cards.push(...pickN(w + i, 2));
        out.push({ type: TYPES.PAIR_STRAIGHT, weight: w, length: len, cards });
      }
    }

    // 飞机不带翼 / 带单 / 带对（v1 限定 length 2~3）
    for (let len = 2; len <= 3; len++) {
      for (let w = 0; w + len - 1 < 12; w++) {
        let ok = true;
        for (let i = 0; i < len; i++) if ((hist[w + i] || 0) < 3) { ok = false; break; }
        if (!ok) continue;
        const planeRange = new Set();
        for (let i = 0; i < len; i++) planeRange.add(w + i);
        const planeCards = [];
        for (let i = 0; i < len; i++) planeCards.push(...pickN(w + i, 3));
        // 不带
        out.push({ type: TYPES.PLANE, weight: w, length: len, cards: planeCards.slice() });
        // 带单
        const singleWs = weights.filter(ww => !planeRange.has(ww));
        const allK = singleWs.slice();
        if (hand.includes(52)) allK.push(13);
        if (hand.includes(53)) allK.push(14);
        if (allK.length >= len) {
          const chosen = allK.slice(0, len);
          const kCards = [];
          for (const kw of chosen) {
            if (kw === 13) kCards.push(52);
            else if (kw === 14) kCards.push(53);
            else kCards.push(pickN(kw, 1)[0]);
          }
          out.push({ type: TYPES.PLANE_ONE, weight: w, length: len, kickerCount: 1, cards: planeCards.concat(kCards) });
        }
        // 带对
        const pairWs = weights.filter(ww => !planeRange.has(ww) && hist[ww] >= 2);
        if (pairWs.length >= len) {
          const chosen = pairWs.slice(0, len);
          const kCards = [];
          for (const kw of chosen) kCards.push(...pickN(kw, 2));
          out.push({ type: TYPES.PLANE_PAIR, weight: w, length: len, kickerCount: 2, cards: planeCards.concat(kCards) });
        }
      }
    }

    // 四带二（单）/ 四带二对
    for (const w of weights) {
      if (hist[w] >= 4) {
        const fourCards = pickN(w, 4);
        const others = hand.filter(c => cardWeight(c) !== w);
        if (others.length >= 2) {
          out.push({ type: TYPES.FOUR_TWO, weight: w, kickerCount: 2, cards: fourCards.concat(others.slice(0, 2)) });
        }
        const pairWs = weights.filter(ww => ww !== w && hist[ww] >= 2);
        if (pairWs.length >= 2) {
          const k1 = pickN(pairWs[0], 2);
          const k2 = pickN(pairWs[1], 2);
          out.push({ type: TYPES.FOUR_TWO_PAIR, weight: w, kickerCount: 2, cards: fourCards.concat(k1, k2) });
        }
      }
    }
  }

  // ============================================================
  // decomposeHand(hand) — 把手牌分解成尽量少手数的组合（贪心 + 局部回溯）
  // 返回 PlayPattern[]，按 cards 的总和应等于 hand。
  // 这个分解用于 AI 首出策略；不一定最优，但要"还能玩"。
  // ============================================================
  function decomposeHand(hand) {
    const remaining = hand.slice();
    const plays = [];

    function take(cards) {
      for (const c of cards) {
        const idx = remaining.indexOf(c);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }

    // 1. 王炸先单独识别（炸弹更优先：王炸保留到关键时刻？这里先记下来不出 — AI 自己再决定）
    // 但分解阶段我们倾向"分清楚有什么"，王炸算一手
    if (remaining.includes(52) && remaining.includes(53)) {
      plays.push({ type: TYPES.ROCKET, weight: 100, cards: [52, 53] });
      take([52, 53]);
    }

    // 2. 炸弹（4 张同 weight）— 单出炸弹算一手
    let h = histByWeight(remaining);
    for (const w of Object.keys(h).map(Number).sort((a, b) => a - b)) {
      if (h[w] >= 4) {
        const cards = remaining.filter(c => cardWeight(c) === w).slice(0, 4);
        plays.push({ type: TYPES.BOMB, weight: w, cards });
        take(cards);
      }
    }

    // 3. 找单顺（贪心：从最长可能开始）
    function tryStraight() {
      const hh = histByWeight(remaining);
      for (let len = 12; len >= 5; len--) {
        for (let w = 0; w + len - 1 < 12; w++) {
          let ok = true;
          for (let i = 0; i < len; i++) if (!hh[w + i]) { ok = false; break; }
          if (!ok) continue;
          const cards = [];
          for (let i = 0; i < len; i++) {
            const c = remaining.find(c => cardWeight(c) === w + i);
            cards.push(c);
          }
          return { type: TYPES.STRAIGHT, weight: w, length: len, cards };
        }
      }
      return null;
    }
    while (true) {
      const s = tryStraight();
      if (!s) break;
      plays.push(s);
      take(s.cards);
    }

    // 4. 找连对
    function tryPairStraight() {
      const hh = histByWeight(remaining);
      for (let len = 10; len >= 3; len--) {
        for (let w = 0; w + len - 1 < 12; w++) {
          let ok = true;
          for (let i = 0; i < len; i++) if ((hh[w + i] || 0) < 2) { ok = false; break; }
          if (!ok) continue;
          const cards = [];
          for (let i = 0; i < len; i++) {
            const found = remaining.filter(c => cardWeight(c) === w + i).slice(0, 2);
            cards.push(...found);
          }
          return { type: TYPES.PAIR_STRAIGHT, weight: w, length: len, cards };
        }
      }
      return null;
    }
    while (true) {
      const s = tryPairStraight();
      if (!s) break;
      plays.push(s);
      take(s.cards);
    }

    // 5. 找飞机（连续两副以上的三张）
    function tryPlane() {
      const hh = histByWeight(remaining);
      for (let len = 3; len >= 2; len--) {
        for (let w = 0; w + len - 1 < 12; w++) {
          let ok = true;
          for (let i = 0; i < len; i++) if ((hh[w + i] || 0) < 3) { ok = false; break; }
          if (!ok) continue;
          const planeCards = [];
          for (let i = 0; i < len; i++) {
            const found = remaining.filter(c => cardWeight(c) === w + i).slice(0, 3);
            planeCards.push(...found);
          }
          return { type: TYPES.PLANE, weight: w, length: len, cards: planeCards };
        }
      }
      return null;
    }
    while (true) {
      const p = tryPlane();
      if (!p) break;
      plays.push(p);
      take(p.cards);
    }

    // 6. 三带一 / 三带二（剩下的三张配上单或对）
    h = histByWeight(remaining);
    const threes = Object.keys(h).map(Number).filter(w => h[w] >= 3).sort((a, b) => a - b);
    for (const w of threes) {
      const cur = histByWeight(remaining);
      if ((cur[w] || 0) < 3) continue;
      const tc = remaining.filter(c => cardWeight(c) === w).slice(0, 3);
      // 找一个 weight !== w 且有牌的 kicker：优先对（凑三带二），否则单
      const otherWs = Object.keys(cur).map(Number).filter(ww => ww !== w);
      otherWs.sort((a, b) => (cur[a] >= 2 ? 0 : 1) - (cur[b] >= 2 ? 0 : 1) || a - b);
      // 简化：尽量出三带二
      let kicker = null;
      let kickerType = TYPES.TRIPLE;
      const pairW = otherWs.find(ww => cur[ww] >= 2);
      if (pairW != null) {
        kicker = remaining.filter(c => cardWeight(c) === pairW).slice(0, 2);
        kickerType = TYPES.TRIPLE_PAIR;
      } else if (otherWs.length > 0) {
        const sw = otherWs[0];
        kicker = remaining.filter(c => cardWeight(c) === sw).slice(0, 1);
        kickerType = TYPES.TRIPLE_ONE;
      }
      if (kicker) {
        plays.push({
          type: kickerType, weight: w,
          kickerCount: kickerType === TYPES.TRIPLE_PAIR ? 2 : 1,
          cards: tc.concat(kicker),
        });
        take(tc.concat(kicker));
      } else {
        plays.push({ type: TYPES.TRIPLE, weight: w, cards: tc });
        take(tc);
      }
    }

    // 7. 剩下的对子单出
    h = histByWeight(remaining);
    for (const w of Object.keys(h).map(Number).sort((a, b) => a - b)) {
      while ((histByWeight(remaining)[w] || 0) >= 2) {
        const tc = remaining.filter(c => cardWeight(c) === w).slice(0, 2);
        plays.push({ type: TYPES.PAIR, weight: w, cards: tc });
        take(tc);
      }
    }

    // 8. 剩下的单牌单出
    for (const c of remaining.slice()) {
      plays.push({ type: TYPES.SINGLE, weight: cardWeight(c), cards: [c] });
    }

    return plays;
  }

  // 把 PlayPattern.cards 从 hand 里 splice 出去（深拷贝原 hand 不改）
  function removeCards(hand, cards) {
    const out = hand.slice();
    for (const c of cards) {
      const idx = out.indexOf(c);
      if (idx >= 0) out.splice(idx, 1);
    }
    return out;
  }

  // ============================================================
  // 公开 API
  // ============================================================
  const api = {
    TYPES,
    cardId, cardRank, cardSuit, cardWeight,
    cardGlyph, cardLabel,
    fullDeck, shuffle, deal, sortHand,
    histByWeight, groupByCount,
    parsePattern, canBeat, enumerateBeats, decomposeHand,
    removeCards,
  };

  if (typeof window !== 'undefined') window.DDZEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
