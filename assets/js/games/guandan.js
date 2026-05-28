(() => {
  'use strict';

  // ===========================================================
  //  掼蛋引擎
  //  牌编码：0..107（两副 54 张）。
  //   - 标准牌 id = deck*54 + suit*13 + rank
  //     suit: 0♠ 1♥ 2♦ 3♣ ; rank: 0=2,1=3,...,8=10,9=J,10=Q,11=K,12=A
  //   - 小王: deck*54 + 52 ; 大王: deck*54 + 53
  // ===========================================================
  const STORE_KEY = 'tool.guandan.v1';
  const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const SUIT_LABELS = ['♠','♥','♦','♣'];
  const LEVEL_SEQ = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']; // 级牌进阶序

  // ---- 基础解码 ----
  function isJoker(c) { const m = c % 54; return m === 52 || m === 53; }
  function jokerKind(c) { return (c % 54) === 53 ? 'big' : 'small'; } // big=大王 small=小王
  function cardDeck(c) { return Math.floor(c / 54); }
  function cardSuit(c) { return Math.floor((c % 54) / 13); }   // 仅非王有效
  function cardRankIdx(c) { return (c % 54) % 13; }            // 0..12，仅非王有效

  // 牌“自然点数权重”：用于顺子/连对里的位置 + 普通比较的基线。
  // 2..A → 0..11(A) ；级牌不在此处抬升（顺子里级牌保持自然位）。
  // 这里 rank index 0..12 = 2,3,...,A，自然顺序里 2 最小、A 最大。
  // 顺子用的是 RANK_LABELS 顺序里的“连续点”，A 可高(10JQKA)可低(A2345)。

  // 单牌比较权重（含级牌抬升 + 王）。level = 当前打的级牌 label (e.g. 'A')
  // 顺序：2 < 3 < ... < K < A < 级牌 < 小王 < 大王
  function singleWeight(c, level) {
    if (isJoker(c)) return jokerKind(c) === 'big' ? 17 : 16;
    const r = cardRankIdx(c);                // 0..12 = 2..A
    const label = RANK_LABELS[r];
    if (label === level) return 15;          // 级牌抬到 A 之上、王之下
    // 2..A 自然： r=0(2)..12(A) → 映射到 2..14
    return r + 2;                            // 2→2 ... A→14
  }

  // 是否“红桃级牌”→ 逢人配 wild
  function isWild(c, level) {
    if (isJoker(c)) return false;
    return cardSuit(c) === 1 && RANK_LABELS[cardRankIdx(c)] === level;
  }

  // 仅用于"列分组"和"列排序"。红桃级牌（逢人配）独占一列、排在小王(16)与
  // 普通级牌(15)之间(15.5)。其余牌沿用 singleWeight（牌力比较仍是单一标量，
  // 所有级牌都是 15 — 牌力不变）。
  function columnKey(c, level) {
    if (!isJoker(c) && isWild(c, level)) return 15.5;
    return singleWeight(c, level);
  }

  // 牌型常量
  const T = {
    SINGLE: 'single', PAIR: 'pair', TRIPLE: 'triple',
    TRIPLE_PAIR: 'triple_pair',   // 三带二（三同 + 一对）
    PAIR_STR: 'pair_str',         // 三连对 木板 (e.g. 334455)
    TRIPLE_STR: 'triple_str',     // 二连三 钢板 (e.g. 333444)
    STRAIGHT: 'straight',         // 五张顺子
    BOMB: 'bomb',                 // 4+ 同张炸弹
    STR_FLUSH: 'str_flush',       // 同花顺
    JOKER_BOMB: 'joker_bomb',     // 四王炸（天王炸）
  };

  // ---- 顺子点位：把一张非王牌映射成“顺子点 1..13”（A 既是 1 也是 14 由调用方处理）
  // 顺子里：级牌保持自然位置（题面要求），所以这里直接用 rank label 顺序。
  // 顺序点：2=2,3=3,...,10=10,J=11,Q=12,K=13,A=14；A 也可当 1。
  function straightPoint(c) {
    const r = cardRankIdx(c); // 0..12 → 2..A
    return r + 2;             // 2..14
  }

  // ---- 组合判定 ----
  // 给定一组牌 id（已含 wild），返回所有可能的“牌型对象”里**最优**的一个，
  // 或 null。牌型对象：{ type, len, key, bombStrength }
  //  - key：同型间比较的标量（越大越强）
  //  - bombStrength：炸弹强度标量（非炸为 0），跨型用它兜底比较
  //
  // wild（红桃级牌）可当任意非王牌；不能当王、不能在含王的组合里替王。
  //
  // 设计：先把牌分成 [普通牌按 rank 计数] + [wild 数量] + [王列表]。
  // 然后按 len 分支穷举可行牌型，挑“能成型且 key 最大”的。

  // 炸弹强度刻度（统一可比标量）：
  //  4 炸 = 100 + rankWeight
  //  5 炸 = 200 + rankWeight
  //  同花顺 = 300 + topPoint        （介于 5 炸与 6 炸之间）
  //  6 炸 = 400 + rankWeight
  //  7 炸 = 500 + ...
  //  n(>=6) 炸 = (n-1)*100 + rankWeight
  //  四王炸 = 99999（天王，压一切）
  function bombStrengthN(n, rankW) {
    if (n === 4) return 100 + rankW;
    if (n === 5) return 200 + rankW;
    // 6 及以上
    return (n - 1) * 100 + rankW;
  }
  const STR_FLUSH_STRENGTH_BASE = 300; // + topPoint(2..14)

  // 把一组牌做统计；返回 { counts:Map(rankIdx->n), wild:int, jokers:[big/small...], normals:[...] }
  function tally(cards, level) {
    const counts = new Map();   // rankIdx -> 张数（不含 wild）
    let wild = 0;
    const bigJ = [], smallJ = [];
    const normals = [];
    for (const c of cards) {
      if (isJoker(c)) {
        if (jokerKind(c) === 'big') bigJ.push(c); else smallJ.push(c);
        continue;
      }
      if (isWild(c, level)) { wild++; continue; }
      const r = cardRankIdx(c);
      counts.set(r, (counts.get(r) || 0) + 1);
      normals.push(c);
    }
    return { counts, wild, bigJ, smallJ, normals };
  }

  // rankIdx → 比较权重（用于对/三/炸的“点”）：与 singleWeight 一致（级牌抬升）
  function rankIdxWeight(r, level) {
    const label = RANK_LABELS[r];
    if (label === level) return 15;
    return r + 2;
  }

  // 对外的 classify：保证返回的 combo 一定带 cards 字段（多处依赖 combo.cards）。
  function classify(cards, level) {
    const cb = classifyRaw(cards, level);
    if (cb && !cb.cards) cb.cards = cards.slice();
    return cb;
  }

  // 判定并返回该组合的牌型（取最强解读）。cards 不可为空。
  function classifyRaw(cards, level) {
    if (!cards || !cards.length) return null;
    const n = cards.length;
    const tg = tally(cards, level);
    const { counts, wild } = tg;
    const totalJ = tg.bigJ.length + tg.smallJ.length;
    const distinct = [...counts.keys()];

    // ===== 四王炸 =====
    if (n === 4 && totalJ === 4) {
      return { type: T.JOKER_BOMB, len: 4, key: 99999, bombStrength: 99999, cards };
    }

    // 含王的组合：王只能用于 单/对/三/炸（全王）/四王。题面：wild 不能替王。
    // 简化：王只能与同为王的牌组成 对王/三王/炸（很少见，但允许），
    //       或单独作单张。普通牌型里不允许混入王（王不参与顺子/三带二等）。
    if (totalJ > 0) {
      // 全是王
      if (tg.normals.length === 0 && wild === 0) {
        if (n === 1) {
          const c = cards[0];
          return { type: T.SINGLE, len: 1, key: singleWeight(c, level), bombStrength: 0, cards };
        }
        // 同种王（全大或全小）成对/三/炸
        const allBig = tg.smallJ.length === 0;
        const allSmall = tg.bigJ.length === 0;
        if (allBig || allSmall) {
          const rw = allBig ? 17 : 16;
          if (n === 2) return { type: T.PAIR, len: 2, key: rw, bombStrength: 0, cards };
          if (n === 3) return { type: T.TRIPLE, len: 3, key: rw, bombStrength: 0, cards };
          if (n >= 4) return { type: T.BOMB, len: n, key: bombStrengthN(n, rw), bombStrength: bombStrengthN(n, rw), cards };
        }
        return null; // 大小王混（非四张）不成型
      }
      return null; // 王 + 普通牌：不成型（wild 不替王）
    }

    // ===== 不含王 =====
    // ---- 单张 ----
    if (n === 1) {
      const c = cards[0];
      return { type: T.SINGLE, len: 1, key: singleWeight(c, level), bombStrength: 0, cards };
    }

    // 一组“某 rank 的有效张数”= counts + 可用 wild。判断能否凑成全同张 m 张。
    // 多 distinct + wild 时，wild 优先补到“能让组合成立且点数最大”的 rank。

    // ---- 2 张：对子 ----
    if (n === 2) {
      if (distinct.length <= 1) {
        // 0 或 1 个 distinct + wild 补齐
        const r = distinct.length === 1 ? distinct[0] : null;
        if (r == null) {
          // 两张都是 wild（红桃级牌）→ 本就是一对真级牌，可以直接打出
          return { type: T.PAIR, len: 2, key: 15, bombStrength: 0, cards };
        }
        if ((counts.get(r) + wild) === 2) {
          return { type: T.PAIR, len: 2, key: rankIdxWeight(r, level), bombStrength: 0, cards };
        }
      }
      return null;
    }

    // ---- 3 张：三张 ----
    if (n === 3) {
      if (distinct.length <= 1) {
        let r = distinct.length === 1 ? distinct[0] : null;
        if (r == null) return null; // 3 张 wild 不可能（每副只 1 张红桃级牌，共 2 张）
        if ((counts.get(r) + wild) === 3) {
          return { type: T.TRIPLE, len: 3, key: rankIdxWeight(r, level), bombStrength: 0, cards };
        }
      }
      return null;
    }

    // ---- 4+ 同张 = 炸弹（先验证是否单一 rank） ----
    if (n >= 4) {
      if (distinct.length <= 1) {
        let r = distinct.length === 1 ? distinct[0] : null;
        if (r != null && (counts.get(r) + wild) === n) {
          const rw = rankIdxWeight(r, level);
          return { type: T.BOMB, len: n, key: bombStrengthN(n, rw), bombStrength: bombStrengthN(n, rw), cards };
        }
        if (r == null && wild === n) {
          // 全 wild 凑炸（最多 2 张，不会到 4）→ 不可能
          return null;
        }
      }
    }

    // ---- 5 张：可能是 顺子 / 三带二 / 同花顺 / 5 炸 ----
    if (n === 5) {
      // 三带二
      const tp = tryTriplePair(tg, level);
      if (tp) return tp;
      // 同花顺（5 张同花色连续）—— 优先于普通顺子（它是炸）
      const sf = tryStraightFlush(cards, tg, level);
      if (sf) return sf;
      // 普通顺子
      const st = tryStraight(tg, level, 5);
      if (st) return st;
      return null;
    }

    // ---- 6 张：三连对 / 二连三(钢板) ----
    if (n === 6) {
      const ps = tryPairStraight(tg, level, 3);   // 334455
      if (ps) return ps;
      const ts = tryTripleStraight(tg, level, 2);  // 333444
      if (ts) return ts;
      return null;
    }

    return null;
  }

  // 三带二：3 同 + 1 对（题面 三带二 = 三同张 + 一对）
  function tryTriplePair(tg, level) {
    const { counts, wild } = tg;
    const entries = [...counts.entries()]; // [rankIdx, n]
    // 目标：选 rankA 作三张、rankB 作对子（A≠B）
    let best = null;
    const ranks = entries.map(e => e[0]);
    // 列出可作三张的 rank（n + 部分 wild = 3）
    for (const ra of ranks) {
      const needA = 3 - counts.get(ra);
      if (needA < 0 || needA > wild) continue;
      const remW = wild - needA;
      for (const rb of ranks) {
        if (rb === ra) continue;
        const needB = 2 - counts.get(rb);
        if (needB < 0 || needB > remW) continue;
        // 必须恰好用完所有牌
        if (counts.get(ra) + counts.get(rb) + (3 - counts.get(ra)) + (2 - counts.get(rb)) !== 5) continue;
        const key = rankIdxWeight(ra, level); // 三带二按三张的点比
        if (!best || key > best.key) best = { type: T.TRIPLE_PAIR, len: 5, key, bombStrength: 0 };
      }
      // wild 也可独立凑对（rb 不存在于 counts）：needB=2，需 remW>=2
      if (remW >= 2 && counts.get(ra) + needA === 3) {
        // 两张 wild 当一对：但 wild 本身是红桃级牌，作对点=15
        const key = rankIdxWeight(ra, level);
        if (!best || key > best.key) best = { type: T.TRIPLE_PAIR, len: 5, key, bombStrength: 0 };
      }
    }
    return best;
  }

  // 顺子：len 张连续单牌（默认 5）。A 可高可低；级牌保持自然位。
  function tryStraight(tg, level, len) {
    const { counts, wild } = tg;
    // 每个 rank 最多用 1 张（顺子是单牌序列）；wild 可补空位。
    // 候选起点：以“顺子点”表示。点序列 A2345(=1..5) ... 10JQKA(=10..14)
    // 把 counts 转成“点 -> 有该点的真实牌”可用集合
    const pointHas = new Set(); // 顺子点 2..14
    for (const [r] of counts) pointHas.add(r + 2); // 2..14
    const hasAceLow = pointHas.has(14); // A 也能当 1
    let best = null;
    // 起点 s：最低 1(=A 当1) .. 使 s+len-1 <= 14
    for (let s = 1; s + len - 1 <= 14; s++) {
      let needWild = 0, ok = true;
      const usedPts = [];
      for (let k = 0; k < len; k++) {
        let p = s + k;
        let present;
        if (p === 1) present = hasAceLow; // A 当 1
        else present = pointHas.has(p);
        if (present) { usedPts.push(p === 1 ? 14 : p); }
        else { needWild++; if (needWild > wild) { ok = false; break; } usedPts.push(p === 1 ? 14 : p); }
      }
      if (!ok) continue;
      if (needWild !== wild) continue; // 必须用尽 wild（牌数=len 已固定）
      // 顺子大小：按最高点比较（A 高顺最大）。s 越大越强。
      const top = s + len - 1;
      const key = top; // 5..14
      if (!best || key > best.key) best = { type: T.STRAIGHT, len, key, bombStrength: 0 };
    }
    return best;
  }

  // 同花顺：5 张同花色连续 → 炸弹级。wild(红桃级牌)可补，且补的牌视作该花色。
  function tryStraightFlush(cards, tg, level) {
    const { wild } = tg;
    // 按花色分组真实牌的点
    const bySuit = [new Set(), new Set(), new Set(), new Set()];
    for (const c of cards) {
      if (isJoker(c)) return null;
      if (isWild(c, level)) continue;
      bySuit[cardSuit(c)].add(cardRankIdx(c) + 2); // 点 2..14
    }
    let best = null;
    for (let su = 0; su < 4; su++) {
      const pts = bySuit[su];
      if (pts.size + wild < 5) continue;
      const aceLow = pts.has(14);
      for (let s = 1; s + 4 <= 14; s++) {
        let needWild = 0, ok = true;
        for (let k = 0; k < 5; k++) {
          const p = s + k;
          let present = (p === 1) ? aceLow : pts.has(p);
          if (!present) { needWild++; if (needWild > wild) { ok = false; break; } }
        }
        if (!ok) continue;
        if (needWild !== wild) continue;
        const top = s + 4; // 5..14
        const strength = STR_FLUSH_STRENGTH_BASE + top;
        if (!best || strength > best.bombStrength)
          best = { type: T.STR_FLUSH, len: 5, key: strength, bombStrength: strength };
      }
    }
    return best;
  }

  // 三连对（木板）：g 组连续对子（默认 3 组 = 6 张）。级牌保持自然位。
  function tryPairStraight(tg, level, groups) {
    const { counts, wild } = tg;
    const pointCnt = new Map(); // 点 -> 真实张数
    for (const [r, c] of counts) pointCnt.set(r + 2, c);
    const hasAceLow = pointCnt.has(14);
    let best = null;
    for (let s = 1; s + groups - 1 <= 14; s++) {
      let needWild = 0, ok = true;
      for (let k = 0; k < groups; k++) {
        const p = s + k;
        const have = (p === 1) ? (hasAceLow ? pointCnt.get(14) : 0) : (pointCnt.get(p) || 0);
        const miss = 2 - Math.min(2, have);
        if (have > 2) { ok = false; break; }
        needWild += miss;
        if (needWild > wild) { ok = false; break; }
      }
      if (!ok) continue;
      if (needWild !== wild) continue;
      const top = s + groups - 1;
      const key = top;
      if (!best || key > best.key) best = { type: T.PAIR_STR, len: groups * 2, key, bombStrength: 0 };
    }
    return best;
  }

  // 二连三（钢板）：g 组连续三张（默认 2 组 = 6 张）。
  function tryTripleStraight(tg, level, groups) {
    const { counts, wild } = tg;
    const pointCnt = new Map();
    for (const [r, c] of counts) pointCnt.set(r + 2, c);
    const hasAceLow = pointCnt.has(14);
    let best = null;
    for (let s = 1; s + groups - 1 <= 14; s++) {
      let needWild = 0, ok = true;
      for (let k = 0; k < groups; k++) {
        const p = s + k;
        const have = (p === 1) ? (hasAceLow ? pointCnt.get(14) : 0) : (pointCnt.get(p) || 0);
        if (have > 3) { ok = false; break; }
        needWild += 3 - Math.min(3, have);
        if (needWild > wild) { ok = false; break; }
      }
      if (!ok) continue;
      if (needWild !== wild) continue;
      const top = s + groups - 1;
      const key = top;
      if (!best || key > best.key) best = { type: T.TRIPLE_STR, len: groups * 3, key, bombStrength: 0 };
    }
    return best;
  }

  // 是否炸弹类（炸 / 同花顺 / 四王）
  function isBombType(t) {
    return t === T.BOMB || t === T.STR_FLUSH || t === T.JOKER_BOMB;
  }

  // beats：cand 能否压过 prev（prev 为本轮当前最大；prev=null 表示自由出）
  function beats(cand, prev) {
    if (!cand) return false;
    if (!prev) return true;
    const cb = isBombType(cand.type), pb = isBombType(prev.type);
    if (cb && !pb) return true;          // 炸压非炸
    if (!cb && pb) return false;         // 非炸压不过炸
    if (cb && pb) return cand.bombStrength > prev.bombStrength; // 炸比强度
    // 都是普通牌型：必须同型同长，比 key
    if (cand.type !== prev.type) return false;
    if (cand.len !== prev.len) return false;
    return cand.key > prev.key;
  }

  // ===========================================================
  //  发牌
  // ===========================================================
  function buildDeck() {
    const d = [];
    for (let deck = 0; deck < 2; deck++) {
      for (let s = 0; s < 4; s++)
        for (let r = 0; r < 13; r++)
          d.push(deck * 54 + s * 13 + r);
      d.push(deck * 54 + 52); // 小王
      d.push(deck * 54 + 53); // 大王
    }
    return d; // 108
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===========================================================
  //  AI：手牌拆解 + 出牌决策
  // ===========================================================
  // 拆解：贪心把手牌拆成不重叠的牌型组（炸弹优先保留，剩下凑顺/连对/三/对/单）。
  // 用于：估计“需要几手出完” + 选最优最小牌出。
  function decompose(hand, level) {
    const cards = hand.slice();
    const groups = [];
    // 1. 先抠四王炸
    const jb = cards.filter(isJoker);
    if (jb.length === 4) {
      groups.push({ type: T.JOKER_BOMB, cards: jb.slice() });
      for (const c of jb) cards.splice(cards.indexOf(c), 1);
    }
    // 计数（不含 wild / 王，单列出来）
    function buildCnt(list) {
      const m = new Map();
      for (const c of list) {
        if (isJoker(c) || isWild(c, level)) continue;
        const r = cardRankIdx(c);
        if (!m.has(r)) m.set(r, []);
        m.get(r).push(c);
      }
      return m;
    }
    let wilds = cards.filter(c => isWild(c, level));
    let jokers = cards.filter(isJoker);
    let cnt = buildCnt(cards);

    function take(r, k) {
      const arr = cnt.get(r);
      const out = arr.splice(0, k);
      if (!arr.length) cnt.delete(r);
      return out;
    }

    // 2. 普通炸弹（4+ 同张），从大张优先保留
    let changed = true;
    while (changed) {
      changed = false;
      for (const [r, arr] of [...cnt.entries()]) {
        if (arr.length >= 4) {
          groups.push({ type: T.BOMB, cards: take(r, arr.length) });
          changed = true;
        }
      }
    }
    // 3. 顺子（5 连单）——从可用真实点里抽，尽量长用 wild 少
    function pointMap() {
      const pm = new Map();
      for (const [r, arr] of cnt) pm.set(r + 2, arr.length);
      return pm;
    }
    function pullStraight() {
      const pm = pointMap();
      const aceLow = pm.has(14);
      for (let s = 10; s >= 1; s--) {     // 偏好大顺
        if (s + 4 > 14) continue;
        let need = 0; const pts = [];
        for (let k = 0; k < 5; k++) {
          const p = s + k;
          const has = (p === 1) ? aceLow : (pm.get(p) > 0);
          if (has) pts.push(p === 1 ? 14 : p);
          else { need++; pts.push(p === 1 ? 14 : p); }
        }
        if (need <= wilds.length) {
          const used = [];
          for (const p of pts) {
            const ri = p - 2;
            if (cnt.has(ri) && cnt.get(ri).length) used.push(take(ri, 1)[0]);
            else used.push(wilds.shift());
          }
          return used;
        }
      }
      return null;
    }
    let st;
    while ((st = pullStraight())) groups.push({ type: T.STRAIGHT, cards: st });

    // 4. 三连对 / 钢板 略（普通 AI 不强求，留作单/对/三）
    // 5. 三张
    for (const [r, arr] of [...cnt.entries()]) {
      while (cnt.has(r) && cnt.get(r).length >= 3) {
        groups.push({ type: T.TRIPLE, cards: take(r, 3) });
      }
    }
    // 6. 对子
    for (const [r, arr] of [...cnt.entries()]) {
      while (cnt.has(r) && cnt.get(r).length >= 2) {
        groups.push({ type: T.PAIR, cards: take(r, 2) });
      }
    }
    // 7. wild 尽量贴到单张升级成对（让残牌更好打）
    let singles = [];
    for (const [r, arr] of cnt) for (const c of arr) singles.push(c);
    singles.sort((a, b) => singleWeight(a, level) - singleWeight(b, level));
    while (wilds.length && singles.length) {
      const big = singles.pop(); // 配最大单张成对
      groups.push({ type: T.PAIR, cards: [big, wilds.shift()] });
    }
    for (const w of wilds) groups.push({ type: T.SINGLE, cards: [w] });
    // 8. 余下王
    const jb2 = jokers.slice();
    while (jb2.length >= 2) groups.push({ type: T.PAIR, cards: [jb2.shift(), jb2.shift()] });
    for (const j of jb2) groups.push({ type: T.SINGLE, cards: [j] });
    // 9. 余单张
    for (const c of singles) groups.push({ type: T.SINGLE, cards: [c] });

    return groups;
  }

  // 列出当前手牌里所有“能压过 prev”的候选出牌（不含炸弹优先；caller 决定要不要炸）。
  // prev=null → 列出所有合法首攻基础组合。
  // 返回数组 [{ combo(classify结果), cards }]
  function genMoves(hand, prev, level, opts) {
    opts = opts || {};
    const res = [];
    const seenKey = new Set();
    function consider(cards) {
      if (!cards || !cards.length) return;
      const cb = classify(cards, level);
      if (!cb) return;
      if (prev && !beats(cb, prev)) return;
      if (!prev && opts.leadType && cb.type !== opts.leadType) return;
      const k = cb.type + ':' + cb.len + ':' + cb.key + ':' + cards.slice().sort((a,b)=>a-b).join(',');
      if (seenKey.has(k)) return;
      seenKey.add(k);
      res.push({ combo: cb, cards: cards.slice() });
    }

    const wilds = hand.filter(c => isWild(c, level));
    const jokers = hand.filter(isJoker);
    // rank -> [cards]
    const byRank = new Map();
    for (const c of hand) {
      if (isJoker(c) || isWild(c, level)) continue;
      const r = cardRankIdx(c);
      if (!byRank.has(r)) byRank.set(r, []);
      byRank.get(r).push(c);
    }
    const ranks = [...byRank.keys()];

    const wantType = prev ? prev.type : (opts.leadType || null);

    // ---- 单张 ----
    if (!prev || prev.type === T.SINGLE) {
      for (const c of hand) if (!isWild(c, level)) consider([c]);
      // wild 单出（很弱，一般不主动）
      for (const w of wilds) consider([w]);
    }
    // ---- 对子 ----
    if (!prev || prev.type === T.PAIR) {
      for (const r of ranks) {
        const a = byRank.get(r);
        if (a.length >= 2) consider([a[0], a[1]]);
        else if (a.length === 1 && wilds.length >= 1) consider([a[0], wilds[0]]);
      }
      // 王对
      const bigs = jokers.filter(c => jokerKind(c) === 'big');
      const smalls = jokers.filter(c => jokerKind(c) === 'small');
      if (bigs.length >= 2) consider([bigs[0], bigs[1]]);
      if (smalls.length >= 2) consider([smalls[0], smalls[1]]);
      if (wilds.length >= 2) consider([wilds[0], wilds[1]]);
    }
    // ---- 三张 ----
    if (!prev || prev.type === T.TRIPLE) {
      for (const r of ranks) {
        const a = byRank.get(r);
        if (a.length >= 3) consider([a[0], a[1], a[2]]);
        else if (a.length === 2 && wilds.length >= 1) consider([a[0], a[1], wilds[0]]);
        else if (a.length === 1 && wilds.length >= 2) consider([a[0], wilds[0], wilds[1]]);
      }
    }
    // ---- 三带二 ----
    if (!prev || prev.type === T.TRIPLE_PAIR) {
      for (const r of ranks) {
        const a = byRank.get(r);
        let triple = null;
        if (a.length >= 3) triple = [a[0], a[1], a[2]];
        else if (a.length === 2 && wilds.length >= 1) triple = [a[0], a[1], wilds[0]];
        if (!triple) continue;
        const usedW = triple.filter(x => isWild(x, level)).length;
        const remW = wilds.filter(w => !triple.includes(w));
        for (const r2 of ranks) {
          if (r2 === r) continue;
          const b = byRank.get(r2);
          if (b.length >= 2) consider([...triple, b[0], b[1]]);
          else if (b.length === 1 && remW.length >= 1) consider([...triple, b[0], remW[0]]);
        }
      }
    }
    // ---- 顺子 ----
    if (!prev || prev.type === T.STRAIGHT) {
      genSeq(5, 1, T.STRAIGHT);
    }
    // ---- 三连对 ----
    if (!prev || prev.type === T.PAIR_STR) {
      genSeq(3, 2, T.PAIR_STR);
    }
    // ---- 钢板（二连三） ----
    if (!prev || prev.type === T.TRIPLE_STR) {
      genSeq(2, 3, T.TRIPLE_STR);
    }

    // 通用连续型生成：groups 组、每组 per 张连续
    function genSeq(groups, per, type) {
      const pointCards = new Map(); // 点(2..14) -> [cards]
      for (const r of ranks) pointCards.set(r + 2, byRank.get(r).slice());
      const aceLow = pointCards.has(14);
      for (let s = 1; s + groups - 1 <= 14; s++) {
        let need = 0; const pick = []; let okShape = true;
        for (let k = 0; k < groups; k++) {
          const p = s + k;
          const realPt = (p === 1) ? 14 : p;
          const avail = pointCards.get(realPt) || [];
          if (avail.length >= per) { pick.push(avail.slice(0, per)); }
          else {
            const miss = per - avail.length;
            need += miss;
            if (avail.length > 0 && type !== T.STRAIGHT && avail.length > 0) {
              // 部分真实 + wild 补
            }
            pick.push({ real: avail.slice(), miss });
          }
        }
        if (need > wilds.length) continue;
        // 组装
        const cards = [];
        let wi = 0;
        for (const grp of pick) {
          if (Array.isArray(grp)) cards.push(...grp);
          else {
            cards.push(...grp.real);
            for (let m = 0; m < grp.miss; m++) cards.push(wilds[wi++]);
          }
        }
        if (cards.length === groups * per) consider(cards);
      }
    }

    // ---- 炸弹（始终可出，除非自由出且 leadType 限定非炸） ----
    if (!opts.noBomb) {
      // 同张炸（4+）
      for (const r of ranks) {
        const a = byRank.get(r);
        for (let sz = 4; sz <= a.length + wilds.length; sz++) {
          if (a.length >= 4 && sz <= a.length) consider(a.slice(0, sz));
          else if (sz - a.length >= 1 && sz - a.length <= wilds.length && a.length >= 2)
            consider([...a, ...wilds.slice(0, sz - a.length)]);
        }
      }
      // 同花顺
      const bySuitPts = [new Map(), new Map(), new Map(), new Map()];
      for (const c of hand) {
        if (isJoker(c) || isWild(c, level)) continue;
        const su = cardSuit(c), p = cardRankIdx(c) + 2;
        if (!bySuitPts[su].has(p)) bySuitPts[su].set(p, []);
        bySuitPts[su].get(p).push(c);
      }
      for (let su = 0; su < 4; su++) {
        const pm = bySuitPts[su];
        const aceLow = pm.has(14);
        for (let s = 1; s + 4 <= 14; s++) {
          let need = 0; const cards = [];
          for (let k = 0; k < 5; k++) {
            const p = s + k; const real = (p === 1) ? 14 : p;
            const arr = pm.get(real);
            if (arr && arr.length) cards.push(arr[0]);
            else { need++; if (need > wilds.length) { cards.length = 0; break; } cards.push(wilds[need - 1]); }
          }
          if (cards.length === 5) consider(cards);
        }
      }
      // 四王炸
      if (jokers.length === 4) consider(jokers.slice());
    }

    return res;
  }

  // ===========================================================
  //  游戏状态机
  // ===========================================================
  const TEAM = c => (c % 2 === 0) ? 0 : 1; // 座 0/2 → team0(你方)；1/3 → team1(对方)
  const PHASE = { IDLE: 'idle', TRIBUTE: 'tribute', PLAYING: 'playing', ROUND_END: 'round_end', MATCH_END: 'match_end' };

  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); }
    catch { return {}; }
  })();

  const state = {
    aiLevel: ['easy','normal','hard'].includes(stored.lastDiff) ? stored.lastDiff : 'normal',
    stats: Object.assign(
      { easy: { w: 0, l: 0 }, normal: { w: 0, l: 0 }, hard: { w: 0, l: 0 }, bestLevel: 0 },
      stored.stats || {}
    ),
    phase: PHASE.IDLE,
    levels: [2 - 2, 2 - 2],          // team level index into LEVEL_SEQ (0='2')
    actingTeam: 0,                   // 谁“坐庄”决定主级牌（首局随机/座 0 起手）
    hands: [[], [], [], []],
    out: [],                         // 已出完的座位顺序（finishing order）
    turn: 0,
    trick: null,                     // { lead:int, best:combo|null, bestSeat:int, passes:int }
    sortMode: stored.sortMode === 'group' ? 'group' : 'rank',  // 保留字段供旧版兼容，新逻辑不再读
    handOrder: null,                 // 用户自定义的列顺序：[rankWeight, ...]；每局重发自动重置
    selected: new Set(),
    busy: false,
    lastPlay: [null, null, null, null],   // 每座最近一手（combo/'pass'/null）
    runStartedAt: 0,
    runNonce: '',
    pendingTribute: null,
    arrangeMode: false,                   // 🔀 理牌：开启后拖动列直接重排，不需长按
  };

  // 当前“打的级牌”label：行动方（actingTeam）的级牌
  function currentLevelLabel() {
    return LEVEL_SEQ[state.levels[state.actingTeam]];
  }

  // ---- DOM ----
  const $ = id => document.getElementById(id);
  const els = {
    table: $('gdTable'),
    levelYou: $('gdLevelYou'), levelOpp: $('gdLevelOpp'),
    chipYou: $('gdChipYou'), chipOpp: $('gdChipOpp'),
    hand: $('gdHand'),
    playBtn: $('gdPlayBtn'), passBtn: $('gdPassBtn'),
    hintBtn: $('gdHintBtn'), sortBtn: $('gdSortBtn'),
    arrangeBtn: $('gdArrangeBtn'), restoreBtn: $('gdRestoreBtn'),
    selfClock: $('gdSelfClock'),
    pgo: $('gdPgo'), pgoStart: $('gdPgoStart'),
    pgoDiff: $('gdPgoDiff'), pgoStats: $('gdPgoStats'), hs: $('gdHs'),
    tribOverlay: $('gdTributeOverlay'), tribTitle: $('gdTribTitle'),
    tribDesc: $('gdTribDesc'), tribPick: $('gdTribPick'), tribConfirm: $('gdTribConfirm'),
    roundOverlay: $('gdRoundOverlay'), roundTitle: $('gdRoundTitle'),
    roundRanks: $('gdRoundRanks'), roundChange: $('gdRoundChange'), roundNext: $('gdRoundNext'),
    matchOverlay: $('gdMatchOverlay'), matchTitle: $('gdMatchTitle'),
    matchDesc: $('gdMatchDesc'), matchSummary: $('gdMatchSummary'),
    matchAgain: $('gdMatchAgain'), matchSetup: $('gdMatchSetup'),
    toast: $('gdToast'),
  };
  const seatEls = [0,1,2,3].map(i => ({
    seat: $('gdSeat' + i),
    av: $('gdAv' + i),
    clk: $('gdClk' + i),
    cnt: $('gdCnt' + i),
    rk: $('gdRk' + i),
    play: i === 0 ? $('gdPlay0Center') : $('gdPlay' + i),
  }));

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        lastDiff: state.aiLevel, sortMode: state.sortMode, stats: state.stats,
      }));
    } catch (e) { /* ignore */ }
  }

  let toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1600);
  }

  // ---- 卡片渲染 ----
  function buildCardEl(c, sizeClass, level, opts) {
    opts = opts || {};
    const el = document.createElement('span');
    let cls = 'gd-card ' + sizeClass;
    if (isJoker(c)) {
      cls += ' is-joker ' + (jokerKind(c) === 'big' ? 'joker-big' : 'joker-small');
    } else {
      const red = (cardSuit(c) === 1 || cardSuit(c) === 2);
      cls += red ? ' suit-red' : ' suit-black';
      if (level && isWild(c, level)) cls += ' is-wild';
    }
    el.className = cls;
    if (opts.cid != null) el.dataset.cid = opts.cid;
    if (opts.selected) el.classList.add('selected');
    if (opts.groupStart) el.classList.add('group-start');

    if (isJoker(c)) {
      for (const pos of ['tl', 'br']) {
        const corner = document.createElement('span');
        corner.className = 'corner ' + pos;
        const rk = document.createElement('span');
        rk.className = 'rk'; rk.textContent = '★';
        corner.appendChild(rk);
        el.appendChild(corner);
      }
      const pip = document.createElement('span');
      pip.className = 'pip';
      const txt = document.createElement('span');
      txt.className = 'joker-text'; txt.textContent = 'JOKER';
      const icon = document.createElement('span');
      icon.className = 'joker-icon';
      icon.textContent = jokerKind(c) === 'big' ? '♛' : '♚';
      pip.appendChild(txt); pip.appendChild(icon);
      el.appendChild(pip);
    } else {
      const rkLabel = RANK_LABELS[cardRankIdx(c)];
      const suLabel = SUIT_LABELS[cardSuit(c)];
      for (const pos of ['tl', 'br']) {
        const corner = document.createElement('span');
        corner.className = 'corner ' + pos;
        const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = rkLabel;
        const su = document.createElement('span'); su.className = 'su'; su.textContent = suLabel;
        corner.appendChild(rk); corner.appendChild(su);
        el.appendChild(corner);
      }
      const pip = document.createElement('span');
      pip.className = 'pip'; pip.textContent = suLabel;
      el.appendChild(pip);
    }
    return el;
  }

  // 把手牌按 columnKey 分组（每个 key 一列）。红桃级牌（逢人配）独占一列，
  // 排在小王和普通级牌之间。列内按花色固定顺序排，王和级牌单独成列。
  function buildHandColumns() {
    const level = currentLevelLabel();
    const hand = state.hands[0];
    const byW = new Map();
    for (const c of hand) {
      const w = columnKey(c, level);
      if (!byW.has(w)) byW.set(w, []);
      byW.get(w).push(c);
    }
    // 列内堆叠顺序：从上到下花色递增（♠ 在最上面，♣ 在最下面；王按大→小）
    for (const arr of byW.values()) {
      arr.sort((a, b) => {
        const ja = isJoker(a), jb = isJoker(b);
        if (ja && jb) return (b % 54) - (a % 54);  // 大王(53) 在上
        if (ja) return -1;
        if (jb) return 1;
        return cardSuit(a) - cardSuit(b);            // ♠0 ♥1 ♣2 ♦3
      });
    }
    // 列顺序：用户自定义优先；否则点数降序（高→低 从左到右）
    let weights = [...byW.keys()];
    if (Array.isArray(state.handOrder) && state.handOrder.length) {
      const present = new Set(weights);
      const filtered = state.handOrder.filter(w => present.has(w));
      // 不在自定义里的列（包括新生的、"还原"释放回去的），按点数高→低重新排序追加到末尾
      const seen = new Set(filtered);
      const unseen = weights.filter(w => !seen.has(w)).sort((a, b) => b - a);
      weights = filtered.concat(unseen);
    } else {
      weights.sort((a, b) => b - a);                 // 默认高在左
    }
    return weights.map(w => ({ weight: w, cards: byW.get(w) }));
  }

  function renderHand() {
    els.hand.innerHTML = '';
    // 清掉上一轮渲染留下的尺寸覆写，让 stylesheet 默认值先生效，再按可用宽度二次适配
    els.hand.style.removeProperty('--gd-card-w');
    els.hand.style.removeProperty('--gd-card-h');
    els.hand.style.removeProperty('--gd-stack-step');
    if (state.phase === PHASE.IDLE) return;
    const level = currentLevelLabel();
    const cols = buildHandColumns();
    // 把当前列顺序 sync 回 state.handOrder，下次出牌后保持
    state.handOrder = cols.map(c => c.weight);

    const stackStep = parseFloat(
      getComputedStyle(els.hand).getPropertyValue('--gd-stack-step')
    ) || 22;
    const cardH = parseFloat(
      getComputedStyle(els.hand).getPropertyValue('--gd-card-h')
    ) || 72;

    for (const { weight, cards } of cols) {
      const col = document.createElement('div');
      col.className = 'gd-rank-col';
      col.dataset.weight = String(weight);
      col.style.height = ((cards.length - 1) * stackStep + cardH) + 'px';
      cards.forEach((c, i) => {
        const cardEl = buildCardEl(c, 'size-full', level, {
          cid: c, selected: state.selected.has(c),
        });
        cardEl.style.top = (i * stackStep) + 'px';
        cardEl.style.zIndex = String(i + 1);
        col.appendChild(cardEl);
      });
      els.hand.appendChild(col);
    }
    adaptHandSize();
  }

  // 按"最大可能列数 15"算目标卡宽并锁定整局不变——避免出过几张牌、列消失后
  // 卡变大、整张手牌横向画幅缩小的"画幅抖动"。最大列数 = 2~A + 大小王 = 15。
  // 实际列数 ≤ 15，按 15 列预算的尺寸装下当前任意列数都绰绰有余。
  const MAX_HAND_COLS = 15;
  function adaptHandSize() {
    const hand = els.hand;
    const cols = hand.querySelectorAll('.gd-rank-col');
    if (!cols.length) return;
    const cs = getComputedStyle(hand);
    const defCardW = parseFloat(cs.getPropertyValue('--gd-card-w')) || 50;
    const defCardH = parseFloat(cs.getPropertyValue('--gd-card-h')) || 72;
    const defStep  = parseFloat(cs.getPropertyValue('--gd-stack-step')) || 22;
    const gap = parseFloat(cs.getPropertyValue('--gd-col-gap')) || 4;
    const padL = parseFloat(cs.paddingLeft)  || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const availW = hand.clientWidth - padL - padR;
    if (availW <= 0) return;
    const neededW = MAX_HAND_COLS * defCardW + (MAX_HAND_COLS - 1) * gap;
    if (neededW <= availW) return;   // 装得下 → 用 CSS 默认尺寸
    const newCardW = Math.max(26, Math.floor((availW - (MAX_HAND_COLS - 1) * gap) / MAX_HAND_COLS));
    if (newCardW >= defCardW) return;
    const ratio = newCardW / defCardW;
    const newCardH = Math.round(defCardH * ratio);
    const newStep = Math.max(13, Math.round(defStep * ratio));
    hand.style.setProperty('--gd-card-w', newCardW + 'px');
    hand.style.setProperty('--gd-card-h', newCardH + 'px');
    hand.style.setProperty('--gd-stack-step', newStep + 'px');
    cols.forEach(col => {
      const cards = col.querySelectorAll('.gd-card');
      col.style.height = ((cards.length - 1) * newStep + newCardH) + 'px';
      cards.forEach((c, i) => { c.style.top = (i * newStep) + 'px'; });
    });
  }

  function renderPlayArea(seat) {
    const slot = seatEls[seat].play;
    const lp = state.lastPlay[seat];
    // 状态哈希：renderAll 被频繁调用，同一手"不要"/同一组牌不应每次重建 DOM —
    // 那会让 gd-pass-pop 动画反复重放（用户看到别人弃出时，自己的"不要"也跟着闪）
    const level = currentLevelLabel();
    const key = lp === 'pass' ? 'pass:' + level :
                (lp && lp.cards) ? ('combo:' + level + ':' + lp.cards.slice().sort((a, b) => a - b).join(',')) :
                'empty';
    if (slot.dataset.lpKey === key) return;
    slot.dataset.lpKey = key;
    slot.innerHTML = '';
    if (lp === 'pass') {
      // 大字"不要"浮窗：仿欢乐斗地主——每家弃出都让人一眼看见，不再藏在虚线小角标里
      const big = document.createElement('span');
      big.className = 'gd-pass-big'; big.textContent = '不出';
      slot.appendChild(big);
    } else if (lp && lp.cards) {
      const row = document.createElement('div');
      row.className = 'gd-played-row';
      const sorted = lp.cards.slice().sort((a, b) => singleWeight(b, level) - singleWeight(a, level));
      // 别人出的牌跟我的手牌一样大（用 size-full）—— 用户反馈现在的太小
      for (const c of sorted) row.appendChild(buildCardEl(c, 'size-full', level));
      slot.appendChild(row);
    }
  }

  function renderAll() {
    const youLv = LEVEL_SEQ[state.levels[0]];
    const oppLv = LEVEL_SEQ[state.levels[1]];
    els.levelYou.textContent = youLv;
    els.levelOpp.textContent = oppLv;
    // 当前主级用角标右侧的亮点表示，不再写"◀ 当前主级"长尾文字
    els.chipYou.classList.toggle('acting', state.actingTeam === 0);
    els.chipOpp.classList.toggle('acting', state.actingTeam === 1);

    for (let s = 0; s < 4; s++) {
      const se = seatEls[s];
      se.cnt.textContent = state.hands[s].length;
      se.seat.classList.toggle('turn', state.phase === PHASE.PLAYING && state.turn === s && !state.busy);
      const isOut = state.out.includes(s);
      se.seat.classList.toggle('dim', isOut);
      const rankPos = state.out.indexOf(s);
      if (rankPos >= 0) {
        se.rk.hidden = false;
        se.rk.className = 'gd-rank-badge r' + (rankPos + 1);
        se.rk.textContent = ['头游','二游','三游','末游'][rankPos];
      } else {
        se.rk.hidden = true;
      }
      renderPlayArea(s);
    }
    renderHand();
    updateActions();
    applyAttentionFocus();
  }

  // 注意力锁定（仿斗地主 applyAttentionFocus）：
  // PLAYING 阶段，只亮当前轮次的座位 + 对应手牌；其他三家 + 我的手牌 dim 一档。
  // 4 人桌画面拥挤，dim 是大幅可读性提升。其他阶段（贡牌弹窗等）全亮。
  function applyAttentionFocus() {
    const selfBar = document.querySelector('.gd-self-bar');
    const handEl = els.hand;
    const seatEls0 = [0,1,2,3].map(s => seatEls[s].seat);
    seatEls0.forEach(e => e && e.classList.remove('is-dim'));
    if (selfBar) selfBar.classList.remove('is-dim');
    if (handEl) handEl.classList.remove('is-dim');
    if (state.phase !== PHASE.PLAYING) return;
    const curr = state.turn;
    // 座位 0（我）的 .gd-seat 已经是 .gd-self-bar 的子节点，dim 父级即可，
    // 不要双重 dim 否则 opacity 复合后过暗。AI 三家直接 dim 各自 .gd-seat。
    for (let s = 1; s < 4; s++) {
      if (s !== curr) seatEls0[s] && seatEls0[s].classList.add('is-dim');
    }
    if (curr !== 0) {
      if (selfBar) selfBar.classList.add('is-dim');
      if (handEl) handEl.classList.add('is-dim');
    }
  }

  // ---- 选牌 + 拖列交互 ----
  // 三种模式：
  //   PENDING       —— pointerdown 后等待
  //   MULTI_SELECT  —— 快速横/竖向移动 → 多选连刷（沿用旧体验）
  //   COL_DRAG      —— 在原地长按 380ms → 列整体可拖到新位置
  const LONG_PRESS_MS = 380;
  const MOVE_THRESHOLD = 10;
  let pState = null;     // { startX, startY, startCid, startCol, dragMode, mode, lpTimer, gapIdx, gapMarker }

  // 矩形框选（仿桌面文件管理器）：按下后从起点到当前点画一个虚线矩形，
  // 凡是与矩形相交的牌都进入选中（或反向：起点已选 → 进入"删"模式，移出已选）。
  // 每次 move 都拿原始 selected 集 + 当前矩形重新算，所以拖出又拖回去会回到原状。
  function ensureMarquee() {
    let m = document.getElementById('gdMarquee');
    if (!m) {
      m = document.createElement('div');
      m.id = 'gdMarquee';
      m.className = 'gd-marquee';
      document.body.appendChild(m);
    }
    return m;
  }
  function updateMarquee(x, y, w, h) {
    const m = ensureMarquee();
    m.style.left = x + 'px';
    m.style.top = y + 'px';
    m.style.width = w + 'px';
    m.style.height = h + 'px';
    m.style.display = 'block';
  }
  function removeMarquee() {
    const m = document.getElementById('gdMarquee');
    if (m) m.style.display = 'none';
  }

  function applyRectSelection(curX, curY) {
    const x0 = Math.min(pState.startX, curX);
    const x1 = Math.max(pState.startX, curX);
    const y0 = Math.min(pState.startY, curY);
    const y1 = Math.max(pState.startY, curY);
    updateMarquee(x0, y0, x1 - x0, y1 - y0);

    const cardEls = els.hand.querySelectorAll('.gd-card[data-cid]');
    cardEls.forEach(card => {
      const cid = parseInt(card.dataset.cid, 10);
      if (!Number.isFinite(cid)) return;
      const r = card.getBoundingClientRect();
      const inside = r.right > x0 && r.left < x1 && r.bottom > y0 && r.top < y1;
      const wasSelected = pState.originalSelected.has(cid);
      let shouldBeSelected;
      if (pState.dragMode === 'add') shouldBeSelected = wasSelected || inside;
      else shouldBeSelected = wasSelected && !inside;
      card.classList.toggle('selected', shouldBeSelected);
      if (shouldBeSelected) state.selected.add(cid);
      else state.selected.delete(cid);
    });
    updateActions();
  }

  function colsRectsX() {
    const arr = [];
    els.hand.querySelectorAll('.gd-rank-col').forEach((col, i) => {
      const r = col.getBoundingClientRect();
      arr.push({ idx: i, weight: parseInt(col.dataset.weight, 10), left: r.left, right: r.right, mid: (r.left + r.right) / 2, el: col });
    });
    return arr;
  }
  function computeGapIndex(rects, clientX, draggingIdx) {
    // 返回插入索引 i：把 dragging 放在 i 位置（i ∈ [0, rects.length]）。
    // 用 mid 比较来分边。
    let gap = rects.length;
    for (let i = 0; i < rects.length; i++) {
      if (clientX < rects[i].mid) { gap = i; break; }
    }
    // 同位置或紧邻当前位置的两端视为不变（避免视觉抖动）
    if (gap === draggingIdx || gap === draggingIdx + 1) return draggingIdx;
    return gap;
  }
  function placeGapMarker(rects, gap) {
    if (!pState.gapMarker) {
      const m = document.createElement('div');
      m.className = 'gd-col-gap-marker';
      els.hand.appendChild(m);
      pState.gapMarker = m;
    }
    const handRect = els.hand.getBoundingClientRect();
    let x;
    if (gap >= rects.length) x = (rects[rects.length - 1].right - handRect.left + els.hand.scrollLeft + 2);
    else x = (rects[gap].left - handRect.left + els.hand.scrollLeft - 3);
    pState.gapMarker.style.left = x + 'px';
  }
  function removeGapMarker() {
    if (pState && pState.gapMarker) { pState.gapMarker.remove(); pState.gapMarker = null; }
  }

  function onHandPointerDown(e) {
    // 选牌不再限制"轮到我"——别人回合也可以提前选好；TRIBUTE 还贡阶段也可以选；
    // 实际能不能出由出牌按钮的 disabled / hidden 控制
    const canInteract = state.phase === PHASE.PLAYING || state.phase === PHASE.TRIBUTE;
    if (!canInteract && !state.arrangeMode) return;
    if (!els.hand.contains(e.target)) return;
    const col = e.target.closest('.gd-rank-col');
    // 理牌模式必须从某一列开始；选牌模式允许从空白处开始矩形框选
    if (state.arrangeMode && !col) return;
    const card = e.target.closest('.gd-card');
    const pt = e.touches ? e.touches[0] : e;
    pState = {
      startX: pt.clientX, startY: pt.clientY,
      startCid: card ? parseInt(card.dataset.cid, 10) : null,
      startCol: col,
      dragMode: null,
      mode: 'PENDING',
      lpTimer: null,
      gapIdx: null,
      gapMarker: null,
    };
    if (state.arrangeMode) {
      // 直接进入 COL_DRAG（不等 380ms），整个手势都用来调列序
      pState.mode = 'COL_DRAG';
      col.classList.add('col-dragging');
      const rects = colsRectsX();
      const draggingIdx = rects.findIndex(r => r.el === col);
      placeGapMarker(rects, draggingIdx);
      pState.gapIdx = draggingIdx;
    } else if (col) {
      // 长按 380ms 还在原地 → 进入 COL_DRAG。空白处起手不进 COL_DRAG。
      pState.lpTimer = setTimeout(() => {
        if (!pState || pState.mode !== 'PENDING') return;
        pState.mode = 'COL_DRAG';
        col.classList.add('col-dragging');
        const rects = colsRectsX();
        const draggingIdx = rects.findIndex(r => r.el === col);
        placeGapMarker(rects, draggingIdx);
        pState.gapIdx = draggingIdx;
      }, LONG_PRESS_MS);
    }
    e.preventDefault();
  }

  function onHandPointerMove(e) {
    if (!pState) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - pState.startX;
    const dy = pt.clientY - pState.startY;

    if (pState.mode === 'PENDING') {
      if (Math.abs(dx) < MOVE_THRESHOLD && Math.abs(dy) < MOVE_THRESHOLD) return;
      // 动了 → 取消长按，进入矩形框选模式
      clearTimeout(pState.lpTimer);
      pState.mode = 'MULTI_SELECT';
      // 起点是一张已选牌 → 进入"减"模式（拖一圈把它们移出选中）
      // 否则 → "加"模式（拖一圈圈中的都进选中）
      pState.dragMode = (pState.startCid != null && state.selected.has(pState.startCid)) ? 'remove' : 'add';
      pState.originalSelected = new Set(state.selected);
      applyRectSelection(pt.clientX, pt.clientY);
      e.preventDefault && e.preventDefault();
      return;
    }

    if (pState.mode === 'MULTI_SELECT') {
      applyRectSelection(pt.clientX, pt.clientY);
      e.preventDefault && e.preventDefault();
      return;
    }

    if (pState.mode === 'COL_DRAG') {
      const rects = colsRectsX();
      const draggingIdx = rects.findIndex(r => r.el === pState.startCol);
      const gap = computeGapIndex(rects, pt.clientX, draggingIdx);
      if (gap !== pState.gapIdx) {
        pState.gapIdx = gap;
        placeGapMarker(rects, gap);
      }
      e.preventDefault && e.preventDefault();
    }
  }

  function onHandPointerUp(e) {
    if (!pState) return;
    if (pState.lpTimer) clearTimeout(pState.lpTimer);

    if (pState.mode === 'PENDING') {
      // 没动过 → 当作点击：切换该卡选中。点完跑一次轻量 smartSnap（仅"加"，
      // 不去重也不删，避免用户刚点的牌被擅自抹掉）。
      if (pState.startCid != null) {
        if (state.selected.has(pState.startCid)) state.selected.delete(pState.startCid);
        else state.selected.add(pState.startCid);
        smartSnap(false);
        renderHand();
        updateSelHint();
        updateActions();
      }
    } else if (pState.mode === 'MULTI_SELECT') {
      // 矩形框选完成：抹掉浮层；selected 集本身已经在 applyRectSelection 里更新好。
      // 矩形是"模糊"选 → 允许去重 / 删多余，把用户的意图 snap 到最近的复合牌型。
      removeMarquee();
      smartSnap(true);
      renderHand();
      updateSelHint();
      updateActions();
    } else if (pState.mode === 'COL_DRAG') {
      const rects = colsRectsX();
      const draggingIdx = rects.findIndex(r => r.el === pState.startCol);
      const order = (state.handOrder && state.handOrder.length)
        ? state.handOrder.slice()
        : rects.map(r => r.weight);
      const fromW = rects[draggingIdx].weight;
      const fromIdx = order.indexOf(fromW);
      let target = pState.gapIdx;
      if (fromIdx >= 0 && target != null && target !== fromIdx && target !== fromIdx + 1) {
        order.splice(fromIdx, 1);
        if (target > fromIdx) target -= 1;
        target = Math.max(0, Math.min(order.length, target));
        order.splice(target, 0, fromW);
        state.handOrder = order;
      }
      pState.startCol.classList.remove('col-dragging');
      removeGapMarker();
      renderHand();
    }
    pState = null;
  }

  els.hand.addEventListener('mousedown', onHandPointerDown);
  els.hand.addEventListener('touchstart', onHandPointerDown, { passive: false });
  window.addEventListener('mousemove', onHandPointerMove);
  window.addEventListener('touchmove', onHandPointerMove, { passive: false });
  window.addEventListener('mouseup', onHandPointerUp);
  window.addEventListener('touchend', onHandPointerUp);
  // 跨出 hand 时也要兜底（防止指针离开导致 ghost marker）
  window.addEventListener('touchcancel', onHandPointerUp);

  function selectedCards() {
    return [...state.selected].filter(c => state.hands[0].includes(c));
  }

  // 牌型提示已按用户反馈移除——出牌按钮 disabled 状态足以告诉用户能不能出。
  // 保留这个空函数以兼容仍在调用它的各个分支，避免在五六处都得删一遍。
  function updateSelHint() { /* no-op */ }

  function comboName(cb) {
    const map = {
      [T.SINGLE]: '单张', [T.PAIR]: '对子', [T.TRIPLE]: '三张',
      [T.TRIPLE_PAIR]: '三带二', [T.PAIR_STR]: '三连对（木板）',
      [T.TRIPLE_STR]: '钢板（二连三）', [T.STRAIGHT]: '顺子',
      [T.BOMB]: cb.len + ' 张炸弹', [T.STR_FLUSH]: '同花顺', [T.JOKER_BOMB]: '四王炸·天王',
    };
    return map[cb.type] || cb.type;
  }

  function updateActions() {
    // 还贡阶段（玩家是收贡方）：把"出牌"按钮借为"还贡"，隐藏 不出/提示
    const tributeReturn = state.phase === PHASE.TRIBUTE && activeTributePair();
    if (tributeReturn) {
      els.playBtn.hidden = false;
      els.playBtn.textContent = '还贡';
      els.passBtn.hidden = true;
      els.hintBtn.hidden = true;
      const sel = selectedCards();
      els.playBtn.disabled = !(sel.length === 1 && isValidReturnCard(sel[0]));
      updateRestoreBtn();
      return;
    }
    // 正常打牌：把按钮文字复位为"出牌"
    els.playBtn.textContent = '出牌';
    const myTurn = state.phase === PHASE.PLAYING && state.turn === 0 && !state.busy && !state.out.includes(0);
    els.playBtn.hidden = !myTurn;
    els.hintBtn.hidden = !myTurn;
    const trick = state.trick;
    const mustLead = trick && (trick.best == null || trick.bestSeat === 0);
    els.passBtn.hidden = !myTurn || mustLead;
    if (myTurn) {
      const sel = selectedCards();
      const level = currentLevelLabel();
      let ok = false;
      if (sel.length) {
        const cb = classify(sel, level);
        if (cb) {
          if (!trick || trick.best == null || trick.bestSeat === 0) ok = true;
          else ok = beats(cb, trick.best);
        }
      }
      els.playBtn.disabled = !ok;
    }
    // 智能选牌：每次轮到我（开局先出 / 收圈领出 / AI 们都过完）首次进入时，
    // 自动勾选一手"最经济的能压牌"。键由 trick 状态 + 手牌张数构成，状态变 → 重新自动选；
    // 状态不变即"同一回合内"，无论用户再怎么改动都听用户的（不复选）。
    maybeAutoSelectForTurn();
    updateRestoreBtn();
  }

  // "轮到我"的开局自动选牌已按用户反馈完全关闭——开局不替用户选。
  // 真正的智能选牌挪到 smartSnap()，仅在用户主动做选择动作的瞬间触发。
  function maybeAutoSelectForTurn() { /* no-op */ }

  // 智能补齐 / 抹掉多余：仅在用户刚做完一次"选择动作"的瞬间运行。
  // 用户例子：
  //   ① 选了 44556（5 张）→ 自动加 1 张 6 → 445566（三连对）
  //   ② 拖框选到 233456（多了一张 3）→ 去重得 23456（顺子）
  // 只补齐"复合牌型"——单/对/三这种一眼能看清的不去打扰；只动 ±1~2 张。
  // allowTrim=false: 仅尝试加 1/加 2（点单张时不擅自移除用户刚点中的牌）；
  // allowTrim=true : 同时允许去重 / 减 1（矩形框选完用户期望 marquee 自动清理）。
  function smartSnap(allowTrim) {
    // 还贡阶段只需要单张，不要 snap 到牌型
    if (state.phase === PHASE.TRIBUTE) return false;
    const sel = selectedCards();
    if (sel.length < 2) return false;
    const level = currentLevelLabel();
    const already = classify(sel, level);
    // 已经是合法牌型 → 不动；但若是 PAIR_STR 等复合可压可让；以"已合法"为优先
    if (already) return false;

    // 排除"单/对/三/炸"这种用户自能识别的——仅在复合牌型上做补齐
    const isCompound = (cb) => cb && cb.type !== T.SINGLE && cb.type !== T.PAIR
      && cb.type !== T.TRIPLE && cb.type !== T.BOMB && cb.type !== T.JOKER_BOMB;

    const hand = state.hands[0];
    const selSet = new Set(sel);
    const remaining = hand.filter(c => !selSet.has(c));

    // ① 加 1 张：覆盖 "44556 → 445566 / 23455 → 22345_顺子" 等场景
    for (const c of remaining) {
      const test = sel.concat([c]);
      const cb = classify(test, level);
      if (isCompound(cb)) {
        state.selected.add(c);
        return true;
      }
    }

    if (allowTrim) {
      // ② 去重为顺子：distinct ranks 形成 5 连即可
      const byRank = new Map();
      for (const c of sel) {
        if (isJoker(c) || isWild(c, level)) continue;
        const r = cardRankIdx(c);
        if (!byRank.has(r)) byRank.set(r, []);
        byRank.get(r).push(c);
      }
      const distinctRanks = [...byRank.keys()].sort((a, b) => a - b);
      for (let i = 0; i + 4 < distinctRanks.length; i++) {
        let ok = true;
        for (let j = 0; j < 4; j++) {
          if (distinctRanks[i + j + 1] !== distinctRanks[i + j] + 1) { ok = false; break; }
        }
        if (!ok) continue;
        const candidate = [];
        for (let k = 0; k < 5; k++) candidate.push(byRank.get(distinctRanks[i + k])[0]);
        const cb = classify(candidate, level);
        if (cb && cb.type === T.STRAIGHT) {
          state.selected.clear();
          for (const c of candidate) state.selected.add(c);
          return true;
        }
      }
      // ③ 减 1 张：兜底
      for (let i = 0; i < sel.length; i++) {
        const trimmed = sel.slice(0, i).concat(sel.slice(i + 1));
        const cb = classify(trimmed, level);
        if (isCompound(cb)) {
          state.selected.delete(sel[i]);
          return true;
        }
      }
    }

    // ④ 加 2 张：覆盖 4456 → 444566（三带二）等更欠的场景，需要更多遍历
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const test = sel.concat([remaining[i], remaining[j]]);
        const cb = classify(test, level);
        if (isCompound(cb)) {
          state.selected.add(remaining[i]);
          state.selected.add(remaining[j]);
          return true;
        }
      }
    }
    return false;
  }

  // ===========================================================
  //  回合流程
  // ===========================================================
  function startMatch() {
    state.levels = [0, 0];           // 都从 '2'
    state.actingTeam = 0;            // 你方先做主级（首局由座 0 起手）
    state.firstLeader = 0;
    state.runStartedAt = Date.now();
    state.runNonce = (window.GamesShell && GamesShell.Identity)
      ? GamesShell.Identity.newRunNonce() : String(Date.now());
    startRound(null);
  }

  // tributeResult: null（首局）| { from, to, card }（含还贡后）
  function startRound(prevRanking) {
    state.phase = PHASE.PLAYING;
    state.out = [];
    state.selected.clear();
    state.handOrder = null;          // 重新发牌 → 重置自定义列顺序
    state.lastPlay = [null, null, null, null];
    state.busy = false;
    // 新一局重置智能选牌门闩，避免新局首手与上局某一刻 trick 状态 + 手牌张数偶然碰撞
    state._autoTurnKey = null;
    const deck = shuffle(buildDeck());
    state.hands = [[], [], [], []];
    for (let i = 0; i < 108; i++) state.hands[i % 4].push(deck[i]);

    // 决定先手：首局座 0；之后由上局头游先出（贡牌后由还贡相关规则简化为头游先出）
    let leader = 0;
    if (prevRanking && prevRanking.length) leader = prevRanking[0];
    state.firstLeader = leader;

    // 进贡处理（非首局）
    if (prevRanking && prevRanking.length === 4) {
      handleTribute(prevRanking, leader);
    } else {
      beginPlay(leader);
    }
  }

  function beginPlay(leader) {
    state.phase = PHASE.PLAYING;
    state.turn = leader;
    state.trick = { lead: leader, best: null, bestSeat: -1, passes: 0 };
    renderAll();
    if (leader !== 0) scheduleAI();
    else { updateActions(); armTurnClock(); }
  }

  function seatName(s) {
    return ['你', '对手·右', '对家', '对手·左'][s];
  }

  // ---- 进贡 / 还贡 ----
  // 规则：上一局若一方"双下"（其两名成员是 3rd & 4th），3rd+4th 都各进贡
  //      "最大非红桃级牌单张"；其中较大者→1st（头游），较小者→2nd（二游），
  //      然后两边都还贡。
  // 抗贡：贡方（即 3rd+4th 损方）手握两个大王 → 免贡（直接开打）。
  // 红心级牌不能进贡（pickTributeCard 已排除）。
  // 还贡完成后，由"给头游进贡的人"领出下一圈（受了头游还贡的人），实现下游领出。
  function handleTribute(ranking, leader) {
    const first = ranking[0], second = ranking[1], third = ranking[2], fourth = ranking[3];
    const winTeam = TEAM(first);
    const doubleDown = (TEAM(third) === TEAM(fourth)) && (TEAM(third) !== winTeam);
    if (!doubleDown) { beginPlay(leader); return; }

    // 抗贡：贡方（损方，即 3rd+4th）合计是否握有 2 大王 → 免贡
    const giverSeats = [third, fourth];
    let bigJokers = 0;
    for (const s of giverSeats)
      for (const c of state.hands[s]) if (isJoker(c) && jokerKind(c) === 'big') bigJokers++;
    if (bigJokers >= 2) {
      toast('损方握双大王，抗贡成功，免进贡');
      beginPlay(leader);
      return;
    }

    // 两位 giver 各自挑"最大非红桃级牌"
    const level = currentLevelLabel();
    const fourthCard = pickTributeCard(state.hands[fourth], level);
    const thirdCard = pickTributeCard(state.hands[third], level);
    const fw = singleWeight(fourthCard, level);
    const tw = singleWeight(thirdCard, level);

    // 大牌→头游、小牌→二游；并列时按顺时针（约定：fourth→first, third→second）
    let bigGiver, bigCard, smallGiver, smallCard;
    if (fw >= tw) {
      bigGiver = fourth; bigCard = fourthCard;
      smallGiver = third; smallCard = thirdCard;
    } else {
      bigGiver = third; bigCard = thirdCard;
      smallGiver = fourth; smallCard = fourthCard;
    }

    // pendingTribute.pairs: 顺序处理；每一 pair 完成后才开下一个
    // pair[0] 总是头游那对（更重要 → 先来）
    state.pendingTribute = {
      pairs: [
        { giver: bigGiver, receiver: first, tributeCard: bigCard, returnCard: null },
        { giver: smallGiver, receiver: second, tributeCard: smallCard, returnCard: null },
      ],
      headGiver: bigGiver,   // 进贡后由这人领出下一圈
    };
    state.phase = PHASE.TRIBUTE;
    renderAll();
    showTributeBanner('双下进贡', seatName(bigGiver) + '→' + seatName(first) + ' / ' + seatName(smallGiver) + '→' + seatName(second));
    processTributePair(0);
  }

  function processTributePair(idx) {
    const pt = state.pendingTribute;
    if (!pt || idx >= pt.pairs.length) {
      // 全部还贡完成 → 由"给头游进贡的人"领出下一圈
      const newLeader = pt && pt.headGiver != null ? pt.headGiver : 0;
      finishTribute(newLeader);
      return;
    }
    const pair = pt.pairs[idx];
    const level = currentLevelLabel();
    if (idx > 0) showTributeBanner('继续进贡', seatName(pair.giver) + ' → ' + seatName(pair.receiver));
    animateCardFly(pair.giver, pair.receiver, pair.tributeCard, () => {
      moveCard(pair.giver, pair.receiver, pair.tributeCard);
      renderAll();
      if (pair.receiver === 0) {
        // 玩家是接贡方 → 在主牌区挑还贡牌
        state._activeTributePair = idx;
        state.selected.clear();
        showTributeBanner('还贡', '选 ≤10 牌点"还贡" → ' + seatName(pair.giver));
        toast(seatName(pair.giver) + ' 进贡 ' + cardText(pair.tributeCard) + ' → 你，请还一张 ≤10 牌');
        renderAll();
        startTurnClock(0, autoReturnTribute, TRIBUTE_TIMEOUT_MS);
      } else {
        // AI 还贡
        const back = pickReturnCard(state.hands[pair.receiver], level);
        animateCardFly(pair.receiver, pair.giver, back, () => {
          moveCard(pair.receiver, pair.giver, back);
          pair.returnCard = back;
          renderAll();
          toast(seatName(pair.receiver) + ' 还贡 ' + cardText(back) + ' → ' + seatName(pair.giver));
          processTributePair(idx + 1);
        });
      }
    });
  }

  // 抛物线式卡片飞行：from 座位中心 → to 座位中心，~700ms
  function animateCardFly(fromSeat, toSeat, card, onDone) {
    const fromEl = seatEls[fromSeat] && seatEls[fromSeat].seat;
    const toEl = seatEls[toSeat] && seatEls[toSeat].seat;
    if (!fromEl || !toEl) { onDone && onDone(); return; }
    const fromR = fromEl.getBoundingClientRect();
    const toR = toEl.getBoundingClientRect();
    const level = currentLevelLabel();
    const cardEl = buildCardEl(card, 'size-full', level);
    cardEl.style.position = 'fixed';
    cardEl.style.left = (fromR.left + fromR.width / 2) + 'px';
    cardEl.style.top = (fromR.top + fromR.height / 2) + 'px';
    cardEl.style.transform = 'translate(-50%, -50%) scale(1.4)';
    cardEl.style.zIndex = '9999';
    cardEl.style.transition = 'left 0.7s cubic-bezier(0.4, 0.0, 0.2, 1), top 0.7s cubic-bezier(0.4, 0.0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s';
    cardEl.style.pointerEvents = 'none';
    cardEl.style.boxShadow = '0 6px 14px rgba(20,37,63,0.45)';
    document.body.appendChild(cardEl);
    requestAnimationFrame(() => {
      cardEl.style.left = (toR.left + toR.width / 2) + 'px';
      cardEl.style.top = (toR.top + toR.height / 2) + 'px';
      cardEl.style.transform = 'translate(-50%, -50%) scale(0.85)';
    });
    setTimeout(() => { cardEl.style.opacity = '0'; }, 600);
    setTimeout(() => {
      cardEl.remove();
      onDone && onDone();
      // 落到玩家手里 → 等 onDone 里 renderAll 渲完，给新插入的牌做个高亮 pop
      if (toSeat === 0) {
        requestAnimationFrame(() => {
          const inserted = els.hand && els.hand.querySelector('.gd-card[data-cid="' + card + '"]');
          if (inserted) {
            inserted.classList.add('just-inserted');
            setTimeout(() => inserted.classList.remove('just-inserted'), 720);
          }
        });
      }
    }, 760);
  }

  // 进贡阶段开始时在桌面正中央显一行大字 banner，1.1s 渐隐
  function showTributeBanner(line1, line2) {
    if (!els.table) return;
    const ban = document.createElement('div');
    ban.className = 'gd-fx-banner';
    ban.style.fontSize = '1.7rem';
    ban.innerHTML = line1 + (line2 ? '<br><span style="font-size:0.8rem;letter-spacing:0.05em;opacity:0.88;">' + line2 + '</span>' : '');
    els.table.appendChild(ban);
    setTimeout(() => ban.remove(), 1300);
  }

  function finishTribute(leader) {
    state.pendingTribute = null;
    beginPlay(leader);
  }

  function cardText(c) {
    if (isJoker(c)) return jokerKind(c) === 'big' ? '大王' : '小王';
    return SUIT_LABELS[cardSuit(c)] + RANK_LABELS[cardRankIdx(c)];
  }

  function moveCard(from, to, c) {
    const i = state.hands[from].indexOf(c);
    if (i >= 0) state.hands[from].splice(i, 1);
    state.hands[to].push(c);
  }

  // 进贡：最大的“非红桃级牌”单张（大小王最大）
  function pickTributeCard(hand, level) {
    let best = null, bw = -1;
    for (const c of hand) {
      if (isWild(c, level)) continue; // 不进红桃级牌
      const w = singleWeight(c, level);
      if (w > bw) { bw = w; best = c; }
    }
    if (best == null) best = hand[0]; // 兜底（极端：满手红桃级牌）
    return best;
  }
  // 还贡：≤10 的牌里挑一张（优先最小，留大牌）
  function pickReturnCard(hand, level) {
    let best = null, bw = 1e9;
    for (const c of hand) {
      if (isJoker(c)) continue;
      const lab = RANK_LABELS[cardRankIdx(c)];
      const lowOk = ['2','3','4','5','6','7','8','9','10'].includes(lab);
      if (!lowOk) continue;
      const w = singleWeight(c, level);
      if (w < bw) { bw = w; best = c; }
    }
    if (best == null) {
      // 没有 ≤10 的牌：回最小的非王牌
      for (const c of hand) {
        if (isJoker(c)) continue;
        const w = singleWeight(c, level);
        if (w < bw) { bw = w; best = c; }
      }
    }
    if (best == null) best = hand[0];
    return best;
  }

  const TRIBUTE_TIMEOUT_MS = 20000;

  // 判断一张牌是不是"合法还贡牌"。规则：手里有 ≤10 就必须从 ≤10 中选；否则
  // 可还任意非王。用于 updateActions 决定"还贡"按钮的 disabled。
  function isValidReturnCard(c) {
    if (isJoker(c)) return false;
    const r = RANK_LABELS[cardRankIdx(c)];
    const handHasLow = state.hands[0].some(x => {
      if (isJoker(x)) return false;
      return ['2','3','4','5','6','7','8','9','10'].includes(RANK_LABELS[cardRankIdx(x)]);
    });
    if (handHasLow) return ['2','3','4','5','6','7','8','9','10'].includes(r);
    return true;
  }

  // 当前活跃的玩家还贡 pair（索引）。双下时玩家最多接一次（要么 1st 要么 2nd）
  // 但同一局也只会被激活一次。null 表示当前没有等玩家还贡。
  function activeTributePair() {
    const pt = state.pendingTribute;
    if (!pt || !Array.isArray(pt.pairs)) return null;
    const idx = state._activeTributePair;
    if (idx == null) return null;
    const pair = pt.pairs[idx];
    if (!pair || pair.receiver !== 0 || pair.returnCard != null) return null;
    return { idx, pair };
  }

  function autoReturnTribute() {
    const cur = activeTributePair();
    if (!cur) return;
    const level = currentLevelLabel();
    const hand = state.hands[0];
    const low = hand.filter(c => !isJoker(c) && ['2','3','4','5','6','7','8','9','10'].includes(RANK_LABELS[cardRankIdx(c)]));
    const pool = low.length ? low : hand.filter(c => !isJoker(c));
    pool.sort((a, b) => singleWeight(a, level) - singleWeight(b, level));
    if (!pool.length) return;
    state.selected.clear();
    state.selected.add(pool[0]);
    confirmReturnTribute();
  }
  function confirmReturnTribute() {
    const cur = activeTributePair();
    if (!cur) return;
    const { idx, pair } = cur;
    const sel = selectedCards();
    if (sel.length !== 1) { toast('请选一张牌'); return; }
    if (!isValidReturnCard(sel[0])) { toast('请选 ≤10 的一张牌'); return; }
    const chosen = sel[0];
    state.selected.clear();
    stopTurnClock();
    state._activeTributePair = null;
    animateCardFly(0, pair.giver, chosen, () => {
      moveCard(0, pair.giver, chosen);
      pair.returnCard = chosen;
      renderAll();
      toast('还贡 ' + cardText(chosen) + ' → ' + seatName(pair.giver));
      processTributePair(idx + 1);
    });
  }

  // ---- 出牌 ----
  function commitPlay(seat, combo) {
    const level = currentLevelLabel();
    const beforeLen = state.hands[seat].length;
    // 从手牌移除
    for (const c of combo.cards) {
      const i = state.hands[seat].indexOf(c);
      if (i >= 0) state.hands[seat].splice(i, 1);
    }
    const afterLen = state.hands[seat].length;
    state.lastPlay[seat] = combo;
    state.trick.best = combo;
    state.trick.bestSeat = seat;
    state.trick.passes = 0;
    if (afterLen === 0 && !state.out.includes(seat)) {
      state.out.push(seat);
    }
    // 报牌：≤10 张时第一次声明（正式规则只允许一次，所以只在跨过 10 时 toast）
    if (beforeLen > 10 && afterLen <= 10 && afterLen > 0) {
      toast(seatName(seat) + ' 报牌：剩 ' + afterLen + ' 张');
    }
    renderAll();
    // 炸弹类视觉反馈：起牌区红闪 + 表桌抖一下 + 全桌大字浮屏
    if (isBombType(combo.type)) playBombFx(seat, combo);
    afterMove(seat);
  }

  function playBombFx(seat, combo) {
    const slot = seatEls[seat].play;
    if (!slot) return;
    let cls = 'fx-bomb';
    let banner = combo.len + ' 张炸弹';
    if (combo.type === T.STR_FLUSH) { cls = 'fx-strflush'; banner = '同花顺'; }
    else if (combo.type === T.JOKER_BOMB) { cls = 'fx-jokerbomb'; banner = '天王炸'; }
    else if (combo.len >= 6) banner = combo.len + ' 张炸';
    slot.classList.remove('fx-bomb', 'fx-strflush', 'fx-jokerbomb');
    // 强制 reflow 让动画能重新触发
    void slot.offsetWidth;
    slot.classList.add(cls);
    setTimeout(() => slot.classList.remove(cls), 1100);
    // 整桌震屏：仅天王炸 / 6+ 张炸 / 同花顺
    const big = combo.type === T.JOKER_BOMB || combo.type === T.STR_FLUSH || combo.len >= 6;
    if (big && els.table) {
      els.table.classList.remove('mega-quake');
      void els.table.offsetWidth;
      els.table.classList.add('mega-quake');
      setTimeout(() => els.table && els.table.classList.remove('mega-quake'), 900);
    }
    // 全桌中央大字浮屏
    if (els.table) {
      const ban = document.createElement('div');
      ban.className = 'gd-fx-banner';
      ban.textContent = banner;
      els.table.appendChild(ban);
      setTimeout(() => ban.remove(), 1200);
    }
  }

  function commitPass(seat) {
    state.lastPlay[seat] = 'pass';
    state.trick.passes++;
    renderAll();
    afterMove(seat);
  }

  function alivePlayers() {
    return [0,1,2,3].filter(s => !state.out.includes(s));
  }

  function afterMove(seat) {
    // 回合结束判定：4 人桌，已出 N 个，还在场 (4-N)。
    // “连续 (在场人数-1) 次不要”后，当前最大者那一手获胜，本圈清空、由其领出。
    const alive = alivePlayers();
    // 整局是否提前结束（一队两人都打完）
    if (checkRoundOver()) return;

    const remaining = alive.length;
    const bestSeat = state.trick.bestSeat;
    if (bestSeat >= 0 && state.trick.passes >= remaining - 1 && remaining >= 1) {
      // 本圈结束 → 清场，最大者（若已出完则其下一个在场者）领出
      let nextLeader = bestSeat;
      if (state.out.includes(bestSeat)) {
        // 接风：终结者最后一手未被压过 → 由其对家(队友)领出。
        // 上下家(对手方)均未接牌时这条天然成立——bestSeat 还是 finisher。
        // 队友也已出完时回退到 nextAlive。
        const partner = (bestSeat + 2) % 4;
        if (!state.out.includes(partner)) {
          nextLeader = partner;
          toast('接风：由 ' + seatName(partner) + ' 领出');
        } else {
          nextLeader = nextAlive(bestSeat);
        }
      }
      clearTrick(nextLeader);
      return;
    }

    // 轮到下一个在场玩家
    let nx = nextAlive(seat);
    state.turn = nx;
    state.trick.lead = nx;
    renderAll();
    if (nx === 0 && !state.out.includes(0)) {
      updateActions();
      armTurnClock();
    } else {
      scheduleAI();
    }
  }

  function nextAlive(seat) {
    let s = seat;
    for (let i = 0; i < 4; i++) {
      s = (s + 1) % 4;
      if (!state.out.includes(s)) return s;
    }
    return seat;
  }

  function clearTrick(leader) {
    state.lastPlay = [null, null, null, null];
    if (state.out.includes(leader)) leader = nextAlive(leader);
    state.turn = leader;
    state.trick = { lead: leader, best: null, bestSeat: -1, passes: 0 };
    renderAll();
    if (leader === 0 && !state.out.includes(0)) { updateActions(); armTurnClock(); }
    else scheduleAI();
  }

  // 本局是否结束：当一支队伍两名成员都已出完 → 立即结束（不必打到最后一人）
  function checkRoundOver() {
    if (state.out.length >= 3) {
      // 第 3 名确定后第 4 名自动确定
      if (state.out.length === 3) {
        const last = [0,1,2,3].find(s => !state.out.includes(s));
        state.out.push(last);
      }
      endRound();
      return true;
    }
    // 一队双成员都出完（双上）→ 直接结束
    const t0 = state.out.filter(s => TEAM(s) === 0).length;
    const t1 = state.out.filter(s => TEAM(s) === 1).length;
    if (t0 === 2 || t1 === 2) {
      // 补齐剩余名次（按当前手牌，先空者在前，余者按座位顺序）
      const rest = [0,1,2,3].filter(s => !state.out.includes(s));
      rest.sort((a, b) => state.hands[a].length - state.hands[b].length);
      for (const s of rest) state.out.push(s);
      endRound();
      return true;
    }
    return false;
  }

  function endRound() {
    state.phase = PHASE.ROUND_END;
    const ranking = state.out.slice(0, 4);
    const first = ranking[0];
    const winTeam = TEAM(first);
    // 计算队友名次 → 升级数
    const partner = (first + 2) % 4;
    const partnerPos = ranking.indexOf(partner);
    let advance;
    if (partnerPos === 1) advance = 3;       // 头游 + 二游
    else if (partnerPos === 2) advance = 2;  // 头游 + 三游
    else advance = 1;                        // 头游 + 末游
    const beforeIdx = state.levels[winTeam];
    const wasAtA = LEVEL_SEQ[beforeIdx] === 'A';

    // 升级（封顶在 A：到了 A 不再溢出，需在 A 时拿头游才算赢）
    let newIdx = Math.min(LEVEL_SEQ.length - 1, beforeIdx + advance);
    // 判定整局胜负：在 A 还拿到头游 → 该队赢下整局（“打过 A”）
    const matchWon = wasAtA; // 之前已在 A，又拿头游 → 胜
    if (!matchWon) state.levels[winTeam] = newIdx;

    // 赢方成为下一局“主级方”
    state.actingTeam = winTeam;
    state.lastRanking = ranking;
    showRoundOverlay(ranking, winTeam, advance, beforeIdx, newIdx, matchWon);
  }

  function showRoundOverlay(ranking, winTeam, advance, beforeIdx, newIdx, matchWon) {
    els.roundRanks.innerHTML = '';
    const posName = ['头游','二游','三游','末游'];
    ranking.forEach((s, i) => {
      const li = document.createElement('li');
      if (TEAM(s) === winTeam) li.classList.add('win-team');
      const pos = document.createElement('span');
      pos.className = 'pos'; pos.textContent = posName[i];
      const who = document.createElement('span');
      who.className = 'who';
      const teamLab = TEAM(s) === 0 ? '你方' : '对方';
      who.innerHTML = '';
      who.textContent = seatName(s) + ' ';
      const sm = document.createElement('small');
      sm.textContent = '(' + teamLab + ')';
      who.appendChild(sm);
      li.appendChild(pos); li.appendChild(who);
      els.roundRanks.appendChild(li);
    });
    const teamLabel = winTeam === 0 ? '你方' : '对方';
    const advText = ['', '+1 级（队友末游）', '+2 级（队友三游）', '+3 级（队友二游）'][advance];
    if (matchWon) {
      els.roundTitle.textContent = teamLabel + ' 在 A 上拿到头游！';
      els.roundChange.textContent = teamLabel + ' 打过 A — 本局获胜 🎉';
    } else {
      els.roundTitle.textContent = (winTeam === 0 ? '你方' : '对方') + ' 头游';
      els.roundChange.textContent =
        `${teamLabel} 升级：${LEVEL_SEQ[beforeIdx]} → ${LEVEL_SEQ[newIdx]} · ${advText}`;
    }
    els.roundNext.textContent = matchWon ? '查看战报 ▶' : '继续 ▶';
    stopTurnClock();
    els.roundOverlay.classList.add('open');
    els.roundNext.onclick = () => {
      els.roundOverlay.classList.remove('open');
      if (matchWon) endMatch(winTeam);
      else startRound(ranking);
    };
    if (matchWon) state._pendingMatchWin = winTeam;
  }

  function endMatch(winTeam) {
    state.phase = PHASE.MATCH_END;
    const youWon = winTeam === 0;
    els.matchTitle.textContent = youWon ? '🎉 你方打过 A，赢下整局！' : '😤 对方打过 A';
    els.matchDesc.textContent = youWon
      ? '你和对家一路从 2 打到 A，并在 A 上拿下头游。'
      : '对方先打过了 A。再来一局，争口气！';
    els.matchSummary.innerHTML = '';
    const r = state.lastRanking || [];
    const posName = ['头游','二游','三游','末游'];
    r.forEach((s, i) => {
      const li = document.createElement('li');
      const pos = document.createElement('span');
      pos.className = 'pos'; pos.textContent = posName[i];
      const who = document.createElement('span');
      who.className = 'who'; who.textContent = seatName(s) + (TEAM(s) === 0 ? '（你方）' : '（对方）');
      li.appendChild(pos); li.appendChild(who);
      els.matchSummary.appendChild(li);
    });
    // 战绩
    const st = state.stats[state.aiLevel];
    if (youWon) st.w++; else st.l++;
    state.stats.bestLevel = Math.max(state.stats.bestLevel || 0, state.levels[0]);
    persist();
    refreshHs();
    stopTurnClock();
    els.matchOverlay.classList.add('open');
    if (youWon) submitWin();
  }

  // ===========================================================
  //  AI 决策
  // ===========================================================
  // ===========================================================
  //  轮次倒计时（仿斗地主 clockEl / startTurnCountdown）
  // ===========================================================
  const TURN_TIMEOUT_MS = 25000;
  const AI_CLOCK_MS = 25000;   // AI 通常 < 1s 出牌 → 这个值大多走不完
  let turnClockTimer = null;
  let turnClockEndAt = 0;
  let turnClockSeat = -1;

  function clockEl(seat) {
    if (seat === 0) return els.selfClock || null;
    const playedEl = seatEls[seat] && seatEls[seat].play;
    if (!playedEl) return null;
    let clock = playedEl.querySelector('.gd-played-clock');
    if (!clock) {
      // AI 出牌槽里灌时钟；commitPlay 之后 renderPlayArea 会用真出牌覆盖
      playedEl.innerHTML = '';
      playedEl.dataset.lpKey = '__clock__';
      clock = document.createElement('span');
      clock.className = 'gd-played-clock';
      clock.innerHTML =
        '<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">' +
          '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
          '<path d="M12 13 V8 M12 13 L15.4 14.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
          '<path d="M9.5 3.5 H14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '</svg>' +
        '<span class="gd-played-clock-num">25</span><span class="gd-played-clock-s">s</span>';
      playedEl.appendChild(clock);
    }
    return clock;
  }
  function hideAllClocks() {
    if (els.selfClock) { els.selfClock.hidden = true; els.selfClock.classList.remove('urgent'); }
    for (let s = 1; s < 4; s++) {
      const p = seatEls[s] && seatEls[s].play;
      if (!p) continue;
      p.querySelectorAll('.gd-played-clock').forEach(el => el.remove());
    }
  }
  function startTurnClock(seat, onTimeout, durationMs) {
    stopTurnClock();
    turnClockEndAt = Date.now() + (durationMs || TURN_TIMEOUT_MS);
    turnClockSeat = seat;
    const el = clockEl(seat);
    if (!el) return;
    el.hidden = false;
    el.classList.remove('urgent');
    const numEl = el.querySelector('.gd-self-clock-num, .gd-played-clock-num');
    function tick() {
      const left = Math.max(0, turnClockEndAt - Date.now());
      const s = Math.ceil(left / 1000);
      if (numEl) numEl.textContent = String(s);
      else el.textContent = s + 's';
      el.classList.toggle('urgent', s <= 5);
      if (left <= 0) {
        stopTurnClock();
        try { onTimeout && onTimeout(); } catch (e) { console.warn(e); }
      }
    }
    tick();
    turnClockTimer = setInterval(tick, 250);
  }
  function stopTurnClock() {
    if (turnClockTimer) clearInterval(turnClockTimer);
    turnClockTimer = null;
    turnClockSeat = -1;
    hideAllClocks();
  }
  // 轮到某座位时挂上对应时钟。玩家超时 → 自动"不出"或打出最小单张领出
  function armTurnClock() {
    if (state.phase !== PHASE.PLAYING) { stopTurnClock(); return; }
    if (state.out.includes(state.turn)) { stopTurnClock(); return; }
    const seat = state.turn;
    if (seat === 0) {
      startTurnClock(0, autoPlayOnTimeout, TURN_TIMEOUT_MS);
    } else {
      startTurnClock(seat, null, AI_CLOCK_MS);
    }
  }
  function autoPlayOnTimeout() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const level = currentLevelLabel();
    const trick = state.trick;
    const prev = (trick && trick.best != null && trick.bestSeat !== 0) ? trick.best : null;
    state.selected.clear();
    // 跟"提示"按钮第一次点击拿到的候选一致：genMoves + 同一个排序
    let moves = genMoves(state.hands[0], prev, level);
    if (!moves.length) {
      // 跟不上 → 不出（只有跟牌场景下 genMoves 才可能空）
      if (prev) commitPass(0);
      return;
    }
    moves.sort((a, b) =>
      (isBombType(a.combo.type) ? 1 : 0) - (isBombType(b.combo.type) ? 1 : 0) ||
      a.cards.length - b.cards.length || a.combo.key - b.combo.key);
    const pick = moves[0];
    const cb = classify(pick.cards, level);
    if (cb) commitPlay(0, cb);
  }

  function scheduleAI() {
    if (state.busy) return;
    state.busy = true;
    renderAll();
    armTurnClock();    // 给当前 AI 座挂时钟
    const seat = state.turn;
    const delay = 360 + Math.random() * 320;
    setTimeout(() => {
      // 先释放 busy ——否则 aiAct → commitPlay → afterMove → scheduleAI 这条链
      // 会被自己的 busy 守卫拦截，导致出完一手就卡住（图五 bug）。
      // aiAct 是同步的，期间没有事件循环让玩家插队，所以释放是安全的。
      state.busy = false;
      stopTurnClock();
      try { aiAct(seat); }
      catch (e) { console.error('[guandan] aiAct', e); }
      updateActions();
    }, delay);
  }

  function aiAct(seat) {
    if (state.phase !== PHASE.PLAYING) return;
    if (state.out.includes(seat)) { afterMove(seat); return; }
    const level = currentLevelLabel();
    const hand = state.hands[seat];
    const trick = state.trick;
    const prev = (trick.best && trick.bestSeat !== seat) ? trick.best : null;
    const leading = !prev;

    const decision = chooseAIMove(seat, hand, prev, leading, level);
    if (!decision) {
      commitPass(seat);
    } else {
      commitPlay(seat, decision);
    }
  }

  // 选牌核心：依难度调强度
  function chooseAIMove(seat, hand, prev, leading, level) {
    const lvl = state.aiLevel;
    const partner = (seat + 2) % 4;
    const partnerIsBest = state.trick.bestSeat === partner;
    const partnerOut = state.out.includes(partner);
    const myTeam = TEAM(seat);

    // ---- 跟牌 ----
    if (!leading) {
      // 队友正压着这一圈 → 一般不抢（除非能直接走完 / hard 战术）
      if (partnerIsBest && !partnerOut) {
        if (lvl === 'easy') return null;
        // normal/hard：除非这手能让我直接打空，否则让队友
        const finishers = genMoves(hand, prev, level).filter(m => m.cards.length === hand.length);
        if (finishers.length && lvl === 'hard') return finishers[0].combo;
        return null;
      }
      const moves = genMoves(hand, prev, level);
      if (!moves.length) return null;
      // 拆出非炸的最小压制
      const nonBomb = moves.filter(m => !isBombType(m.combo.type));
      const bombs = moves.filter(m => isBombType(m.combo.type));

      if (lvl === 'easy') {
        if (nonBomb.length) return smallestMove(nonBomb).combo;
        // easy 很少炸
        return Math.random() < 0.15 && bombs.length ? bombs[0].combo : null;
      }

      // normal / hard：优先用最便宜的非炸压
      if (nonBomb.length) {
        // 不轻易拆大牌：选“出掉后剩余手牌仍最整齐”的最小一手
        const pick = bestResponse(hand, nonBomb, level);
        // hard：若对手只剩很少牌且这手压不死，考虑炸
        if (lvl === 'hard') {
          const oppMin = Math.min(
            ...[0,1,2,3].filter(s => TEAM(s) !== myTeam && !state.out.includes(s))
              .map(s => state.hands[s].length)
          );
          if (oppMin <= 2 && bombs.length && Math.random() < 0.5) {
            return smallestBomb(bombs).combo;
          }
        }
        return pick.combo;
      }
      // 只能炸
      if (bombs.length) {
        const oppLow = [0,1,2,3].some(s => TEAM(s) !== myTeam && !state.out.includes(s) && state.hands[s].length <= 3);
        if (lvl === 'hard') {
          if (oppLow) return smallestBomb(bombs).combo;
          return Math.random() < 0.35 ? smallestBomb(bombs).combo : null;
        }
        return Math.random() < 0.45 ? smallestBomb(bombs).combo : null;
      }
      return null;
    }

    // ---- 领出 ----
    const groups = decompose(hand, level);
    // 队友若快走完了（hard：帮队友，先出小牌让其领）
    // 选择策略：出“最小且不破坏炸弹”的一组；hard 会优先清理散单/小对
    const ordered = orderLeadGroups(groups, level, lvl);
    if (!ordered.length) {
      // 兜底：出最小单张
      const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
      const cb = classify([c], level);
      return cb;
    }
    // hard：若我只剩 1 组能一把走完，直接走
    if (lvl !== 'easy') {
      const onlyGroup = groups.length === 1;
      if (onlyGroup) {
        const cb = classify(groups[0].cards, level);
        if (cb) return cb;
      }
    }
    const g = ordered[0];
    const cb = classify(g.cards, level);
    if (cb) return cb;
    // 组合非法兜底
    const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
    return classify([c], level);
  }

  // 领出时给“组”排序：先出小牌/散牌，保留炸弹与大牌；hard 更精细
  function orderLeadGroups(groups, level, lvl) {
    const typeRank = {
      [T.SINGLE]: 0, [T.PAIR]: 1, [T.STRAIGHT]: 2, [T.PAIR_STR]: 2,
      [T.TRIPLE]: 3, [T.TRIPLE_PAIR]: 3, [T.TRIPLE_STR]: 3,
      [T.BOMB]: 9, [T.STR_FLUSH]: 9, [T.JOKER_BOMB]: 10,
    };
    const arr = groups.filter(g => !isBombType(g.type));
    arr.sort((a, b) => {
      const ta = typeRank[a.type] ?? 5, tb = typeRank[b.type] ?? 5;
      // easy：纯按最小单组；normal/hard：先清单/对里点数小的
      const wa = Math.min(...a.cards.map(c => singleWeight(c, level)));
      const wb = Math.min(...b.cards.map(c => singleWeight(c, level)));
      if (lvl === 'easy') return wa - wb;
      if (ta !== tb) return ta - tb;
      return wa - wb;
    });
    if (lvl !== 'easy') {
      // 若手里只剩炸弹组，也要能出
      if (!arr.length && groups.length) return [groups[0]];
    }
    return arr.length ? arr : (groups.length ? [groups[0]] : []);
  }

  function smallestMove(moves) {
    return moves.slice().sort((a, b) =>
      a.combo.key - b.combo.key || a.cards.length - b.cards.length)[0];
  }
  function smallestBomb(moves) {
    return moves.slice().sort((a, b) => a.combo.bombStrength - b.combo.bombStrength)[0];
  }
  // 跟牌时挑“代价最小”的一手：优先点数小、不拆出比手里更长结构
  function bestResponse(hand, moves, level) {
    return moves.slice().sort((a, b) => {
      // 1. 牌少优先（少用牌）
      if (a.cards.length !== b.cards.length) return a.cards.length - b.cards.length;
      // 2. key 小优先（用最小的能压牌）
      return a.combo.key - b.combo.key;
    })[0];
  }

  // ===========================================================
  //  玩家操作
  // ===========================================================
  function playerPlay() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const sel = selectedCards();
    if (!sel.length) { toast('请先选牌'); return; }
    const level = currentLevelLabel();
    const cb = classify(sel, level);
    if (!cb) { toast('选择不成牌型'); return; }
    const trick = state.trick;
    const needBeat = trick.best != null && trick.bestSeat !== 0;
    if (needBeat && !beats(cb, trick.best)) { toast('压不过上家'); return; }
    state.selected.clear();
    stopTurnClock();
    commitPlay(0, cb);
  }

  function playerPass() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const trick = state.trick;
    if (!trick.best || trick.bestSeat === 0) { toast('你领出，必须出牌'); return; }
    state.selected.clear();
    stopTurnClock();
    commitPass(0);
  }

  function playerHint() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const level = currentLevelLabel();
    const trick = state.trick;
    const prev = (trick.best != null && trick.bestSeat !== 0) ? trick.best : null;
    let moves = genMoves(state.hands[0], prev, level);
    if (!moves.length) {
      if (prev) { toast('没有能压的牌，可以「不要」'); return; }
      toast('无可出'); return;
    }
    // 提示循环：每次给下一个候选
    moves.sort((a, b) =>
      (isBombType(a.combo.type) ? 1 : 0) - (isBombType(b.combo.type) ? 1 : 0) ||
      a.cards.length - b.cards.length || a.combo.key - b.combo.key);
    state._hintIdx = (state._hintIdx == null) ? 0 : (state._hintIdx + 1) % moves.length;
    const pick = moves[state._hintIdx];
    state.selected.clear();
    for (const c of pick.cards) state.selected.add(c);
    renderHand();
    updateSelHint();
    updateActions();
  }

  els.playBtn.addEventListener('click', () => {
    // 还贡阶段：复用此按钮做"还贡"确认
    if (state.phase === PHASE.TRIBUTE && activeTributePair()) {
      confirmReturnTribute();
      return;
    }
    playerPlay();
  });
  els.passBtn.addEventListener('click', playerPass);
  els.hintBtn.addEventListener('click', playerHint);
  els.sortBtn.addEventListener('click', () => {
    state.handOrder = null;   // 清掉自定义顺序 → 回到默认（点数高→低，从左到右）
    renderHand();
    updateRestoreBtn();
    toast('已按点数恢复默认顺序');
  });
  if (els.restoreBtn) {
    els.restoreBtn.addEventListener('click', () => {
      // 选中整列（且这些列在自定义顺序里）→ 把它们从 state.handOrder 拿掉，
      // 回到默认点数位置；其余列保持现有自定义顺序
      const ranks = selectedFullColumnRanks();
      if (!ranks.length) return;
      if (Array.isArray(state.handOrder) && state.handOrder.length) {
        state.handOrder = state.handOrder.filter(w => !ranks.includes(w));
        if (!state.handOrder.length) state.handOrder = null;
      }
      state.selected.clear();
      renderHand();
      updateRestoreBtn();
      updateActions();
      toast('已还原 ' + ranks.length + ' 列到默认位置');
    });
  }

  // 还原按钮可见性：仅当"选中的恰好是若干完整列、且这些列处于自定义顺序里"才可见。
  // 多选一张不完整的、或没选任何整列、或这些列本就在默认位置 → 都隐藏。
  function selectedFullColumnRanks() {
    const sel = [...state.selected].filter(c => state.hands[0].includes(c));
    if (!sel.length) return [];
    const level = currentLevelLabel();
    // 按 columnKey 分组选中（红桃级牌独占 15.5 一列）
    const byW = new Map();
    for (const c of sel) {
      const w = columnKey(c, level);
      if (!byW.has(w)) byW.set(w, 0);
      byW.set(w, byW.get(w) + 1);
    }
    // 手牌每个 columnKey 的总数
    const handByW = new Map();
    for (const c of state.hands[0]) {
      const w = columnKey(c, level);
      handByW.set(w, (handByW.get(w) || 0) + 1);
    }
    // 选中的每个 weight 必须等于该 weight 在手牌中的总数（"完整一列"）
    const cols = [];
    for (const [w, n] of byW) {
      if (handByW.get(w) !== n) return []; // 有列没选全 → 整体作废
      cols.push(w);
    }
    // 这些列必须出现在自定义顺序里——否则按"还原"也没什么可还原的
    if (!Array.isArray(state.handOrder) || !state.handOrder.length) return [];
    return cols.filter(w => state.handOrder.includes(w));
  }
  function updateRestoreBtn() {
    if (!els.restoreBtn) return;
    const ranks = selectedFullColumnRanks();
    els.restoreBtn.hidden = ranks.length === 0;
  }
  if (els.arrangeBtn) {
    els.arrangeBtn.addEventListener('click', () => {
      state.arrangeMode = !state.arrangeMode;
      els.arrangeBtn.classList.toggle('on', state.arrangeMode);
      els.hand.classList.toggle('is-arranging', state.arrangeMode);
      // 进入理牌模式时清掉旧的"出牌选择"，避免视觉误导
      if (state.arrangeMode && state.selected.size) {
        state.selected.clear();
        renderHand();
        updateSelHint();
        updateActions();
        toast('理牌模式：拖动列调整顺序；再点"理牌"退出');
      } else if (state.arrangeMode) {
        toast('理牌模式：拖动列调整顺序；再点"理牌"退出');
      } else {
        toast('已退出理牌模式');
      }
    });
  }
  document.addEventListener('keydown', e => {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Enter') { e.preventDefault(); playerPlay(); }
    else if (e.code === 'Space') { e.preventDefault(); playerPass(); }
    else if (e.code === 'KeyH') { e.preventDefault(); playerHint(); }
  });

  // ===========================================================
  //  Pre-game overlay / 难度
  // ===========================================================
  function refreshHs() {
    const bl = state.stats.bestLevel || 0;
    els.hs.textContent = LEVEL_SEQ[bl] || '2';
  }
  function refreshPgoStats() {
    els.pgoStats.innerHTML = '';
    const labels = { easy: '新手', normal: '普通', hard: '高手' };
    for (const k of ['easy', 'normal', 'hard']) {
      const s = state.stats[k] || { w: 0, l: 0 };
      const d = document.createElement('div');
      d.className = 'gd-pgo-stat';
      const strong = document.createElement('strong');
      strong.textContent = labels[k];
      d.appendChild(strong);
      d.appendChild(document.createTextNode(` ${s.w} 胜 / ${s.l} 负`));
      els.pgoStats.appendChild(d);
    }
  }
  function syncPgoDiff() {
    [...els.pgoDiff.querySelectorAll('.gs-pgo-mode-tab')].forEach(t =>
      t.classList.toggle('selected', t.dataset.value === state.aiLevel));
  }
  els.pgoDiff.addEventListener('click', e => {
    const t = e.target.closest('.gs-pgo-mode-tab');
    if (!t) return;
    state.aiLevel = t.dataset.value;
    persist();
    syncPgoDiff();
  });
  els.pgoStart.addEventListener('click', () => {
    els.pgo.classList.remove('open');
    startMatch();
  });
  els.matchAgain.addEventListener('click', () => {
    els.matchOverlay.classList.remove('open');
    startMatch();
  });
  els.matchSetup.addEventListener('click', () => {
    els.matchOverlay.classList.remove('open');
    state.phase = PHASE.IDLE;
    renderAll();
    refreshPgoStats();
    syncPgoDiff();
    refreshHs();
    els.pgo.classList.add('open');
  });

  // ===========================================================
  //  games-shell：战绩榜 / 昵称 / 评论
  // ===========================================================
  let wlb = null, np = null;
  function initShell() {
    if (!window.GamesShell) return;
    if (GamesShell.WinsLeaderboard) {
      wlb = GamesShell.WinsLeaderboard.mount({
        container: $('gd-wlb-mount'),
        gameId: 'guandan',
        title: '🏆 掼蛋 战绩榜',
        unit: '胜',
        getCurrentNick: () => GamesShell.Identity.getNick(),
      });
    }
    if (GamesShell.NickPrompt) {
      np = GamesShell.NickPrompt.mount({
        container: $('gd-nick-mount'),
        prompt: '想上掼蛋战绩榜？起个昵称吧',
        onSubmit: nick => { GamesShell.Identity.setNick(nick); doSubmit(nick); },
        onSkip: () => {},
      });
    }
    if (GamesShell.Comments) {
      GamesShell.Comments.mount({
        container: $('gd-cm-mount'),
        path: '/toolbox/guandan/',
        title: '💬 掼蛋交流',
        intro: '聊聊你的逢人配妙手、惊天大炸弹与队友配合 ~',
        placeholder: '说说你这局是怎么打过 A 的 ~',
      });
    }
  }

  function submitWin() {
    if (!window.GamesShell || !GamesShell.WinsLeaderboard) return;
    if (!['easy','normal','hard'].includes(state.aiLevel)) return;
    const nick = GamesShell.Identity.getNick();
    if (!nick) { if (np) np.show(); return; }
    doSubmit(nick);
  }
  function doSubmit(nick) {
    if (!window.GamesShell || !GamesShell.WinsLeaderboard) return;
    GamesShell.WinsLeaderboard.submit({
      gameId: 'guandan',
      nick,
      did: GamesShell.Identity.getDeviceId(),
      aiLevel: state.aiLevel,
      moves: 0,
      durationMs: Math.max(5000, Date.now() - state.runStartedAt),
      clientNonce: state.runNonce,
    }).then(r => {
      if (r && r.ok) { if (wlb) wlb.refresh(); return; }
      if (r && r.reason === 'nick_taken') {
        GamesShell.Identity.clearNick();
        toast('该昵称已被占用，请换一个');
        if (np) np.show();
        return;
      }
      if (r && r.reason) console.warn('[guandan] submit rejected:', r.reason);
    }).catch(() => {});
  }

  // ===========================================================
  //  规则说明
  // ===========================================================
  $('gdRulesBody').innerHTML =
    '<p><strong>牌与队伍</strong>：两副牌共 108 张（含 4 张王）。4 人 2 打 2，' +
    '你（座 0）与对家（座 2）一队，对手在左右。每人发 27 张。</p>' +
    '<p><strong>级牌 / 打几</strong>：每队级牌从 2 起。<strong>当前主级</strong>由上局赢家那队决定（级牌条上标注）。' +
    '主级牌点数被抬到 A 之上、王之下（顺子里仍按自然位）。' +
    '<strong>红桃级牌 = 逢人配</strong>（万能牌，卡面有「配」标记）：可当除王以外任意牌，但不能替王、也不能与王组炸。</p>' +
    '<p><strong>牌型</strong>：单张 / 对子 / 三张 / 三带二（三同+一对）/ 三连对（如 334455）/ ' +
    '钢板（二连三，如 333444）/ 五张顺子。跟牌须同型同长且更大。' +
    '点数序：2&lt;3&lt;…&lt;K&lt;A&lt;主级牌&lt;小王&lt;大王；顺子内 A 可高(10JQKA)可低(A2345)。</p>' +
    '<p><strong>炸弹</strong>：压一切普通牌型，互相比强度。强度刻度（统一可比标量）：' +
    '4 张炸 &lt; 5 张炸 &lt; <strong>同花顺</strong>（介于 5 炸与 6 炸之间）&lt; 6 张炸 &lt; 7 张炸 …，' +
    '<strong>四王炸（天王炸）</strong>压一切。</p>' +
    '<p><strong>一圈</strong>：领出任意合法牌型，其余依次出更大同型或炸弹，或「不要」。' +
    '在场玩家中连续 (人数−1) 家不要后，本圈最大者收圈并领出新一圈。打空手牌即出局，按出完先后定名次。</p>' +
    '<p><strong>进贡 / 还贡</strong>（实现）：上一局若一队「双下」（其两人是三游+末游），由末游把' +
    '<strong>最大的非红桃级牌</strong>进贡给头游，头游回还一张 ≤10 的牌。若头游一方两人合计握有两个大王则<strong>抗贡</strong>免贡。' +
    '（其余进贡情形本实现从简略过。）</p>' +
    '<p><strong>升级</strong>：拿到头游的队伍按队友名次升级 —— 队友二游 +3 级、三游 +2 级、末游 +1 级。' +
    '级牌依 2,3,…,10,J,Q,K,A 递进。</p>' +
    '<p><strong>本实现的取胜规则</strong>：当一队级牌已到 <code>A</code>，' +
    '只要在该局再次<strong>拿到头游</strong>即「打过 A」，立刻赢下整局（不要求 A 上双下）。' +
    '你方打过 A → 战绩 +1 胜并上传战绩榜；对方打过 A → 记一负。</p>' +
    '<p>键盘：Enter 出牌 · Space 不要 · H 提示。手牌按点数竖向成列；点牌选中、横拖多选；「长按一列再拖到新位置」可自定义理牌顺序，「🧩 一键理牌」恢复默认（点数高→低）。</p>';

  // ---- 全屏切换：参考斗地主，用 body 类而非浏览器 Fullscreen API；
  //      进页面默认就铺满 viewport，不用先看局促画幅再点全屏。 ----
  const fsBtn = $('gdFullscreenToggle');
  function refreshFsBtn() {
    if (!fsBtn) return;
    const on = document.body.classList.contains('gd-game-fullscreen');
    fsBtn.classList.toggle('on', on);
    fsBtn.textContent = on ? '⛶ 退出全屏' : '⛶ 全屏';
  }
  document.body.classList.add('gd-game-fullscreen');
  refreshFsBtn();
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      document.body.classList.toggle('gd-game-fullscreen');
      refreshFsBtn();
      // 画幅变化 → 重新按可用宽度适配手牌
      adaptHandSize();
    });
  }
  window.addEventListener('resize', () => adaptHandSize());

  // ---- 启动 ----
  refreshHs();
  refreshPgoStats();
  syncPgoDiff();
  renderAll();
  initShell();

})();
