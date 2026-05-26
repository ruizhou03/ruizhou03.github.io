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
      if (distinct.length === 0 && wild === 2) return null; // 两张 wild：当对（同红桃级牌，其实是真的对）→ 实际它们是真牌对，归到下面
      if (distinct.length <= 1) {
        // 0 或 1 个 distinct + wild 补齐
        let r;
        if (distinct.length === 1) r = distinct[0];
        else r = null;
        if (r == null) {
          // 两张都 wild：它们本就是一对红桃级牌
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
    actYou: $('gdActYou'), actOpp: $('gdActOpp'),
    hand: $('gdHand'), selHint: $('gdSelHint'),
    playBtn: $('gdPlayBtn'), passBtn: $('gdPassBtn'),
    hintBtn: $('gdHintBtn'), sortBtn: $('gdSortBtn'),
    trickInfo: $('gdTrickInfo'),
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

  // 把手牌按"点数权重"分组（每个 singleWeight 一列）。
  // 列内按花色固定顺序排（黑桃→红心→方块→梅花），王和级牌单独成列。
  function buildHandColumns() {
    const level = currentLevelLabel();
    const hand = state.hands[0];
    const byW = new Map();
    for (const c of hand) {
      const w = singleWeight(c, level);
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
      // 出过牌之后新没了的列自动剔除；如果用户排过的列里漏了某些 weight（理论不会，但保险）补到末尾
      const seen = new Set(filtered);
      for (const w of weights) if (!seen.has(w)) filtered.push(w);
      weights = filtered;
    } else {
      weights.sort((a, b) => b - a);                 // 默认高在左
    }
    return weights.map(w => ({ weight: w, cards: byW.get(w) }));
  }

  function renderHand() {
    els.hand.innerHTML = '';
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
  }

  function renderPlayArea(seat) {
    const slot = seatEls[seat].play;
    slot.innerHTML = '';
    const lp = state.lastPlay[seat];
    if (lp === 'pass') {
      const tag = document.createElement('span');
      tag.className = 'gd-pass-tag'; tag.textContent = '不要';
      slot.appendChild(tag);
    } else if (lp && lp.cards) {
      const level = currentLevelLabel();
      const sorted = lp.cards.slice().sort((a, b) => singleWeight(b, level) - singleWeight(a, level));
      for (const c of sorted) slot.appendChild(buildCardEl(c, 'size-mini', level));
    }
  }

  function renderAll() {
    const youLv = LEVEL_SEQ[state.levels[0]];
    const oppLv = LEVEL_SEQ[state.levels[1]];
    els.levelYou.textContent = youLv;
    els.levelOpp.textContent = oppLv;
    els.actYou.textContent = state.actingTeam === 0 ? '◀ 当前主级' : '';
    els.actOpp.textContent = state.actingTeam === 1 ? '当前主级 ▶' : '';

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
  }

  // ---- 选牌 + 拖列交互 ----
  // 三种模式：
  //   PENDING       —— pointerdown 后等待
  //   MULTI_SELECT  —— 快速横/竖向移动 → 多选连刷（沿用旧体验）
  //   COL_DRAG      —— 在原地长按 380ms → 列整体可拖到新位置
  const LONG_PRESS_MS = 380;
  const MOVE_THRESHOLD = 10;
  let pState = null;     // { startX, startY, startCid, startCol, dragMode, mode, lpTimer, gapIdx, gapMarker }

  function applySelectionDrag(cid) {
    if (pState.dragMode === 'add') state.selected.add(cid);
    else state.selected.delete(cid);
    renderHand();
    updateSelHint();
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
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const col = e.target.closest('.gd-rank-col');
    if (!col || !els.hand.contains(col)) return;
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
    pState.lpTimer = setTimeout(() => {
      if (!pState || pState.mode !== 'PENDING') return;
      pState.mode = 'COL_DRAG';
      col.classList.add('col-dragging');
      const rects = colsRectsX();
      const draggingIdx = rects.findIndex(r => r.el === col);
      placeGapMarker(rects, draggingIdx);
      pState.gapIdx = draggingIdx;
    }, LONG_PRESS_MS);
    e.preventDefault();
  }

  function onHandPointerMove(e) {
    if (!pState) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - pState.startX;
    const dy = pt.clientY - pState.startY;

    if (pState.mode === 'PENDING') {
      if (Math.abs(dx) < MOVE_THRESHOLD && Math.abs(dy) < MOVE_THRESHOLD) return;
      // 动了 → 取消长按，进入多选拖刷模式（沿用旧体验）
      clearTimeout(pState.lpTimer);
      if (pState.startCid == null) { pState = null; return; }
      pState.mode = 'MULTI_SELECT';
      pState.dragMode = state.selected.has(pState.startCid) ? 'remove' : 'add';
      applySelectionDrag(pState.startCid);
      return;
    }

    if (pState.mode === 'MULTI_SELECT') {
      const t = document.elementFromPoint(pt.clientX, pt.clientY);
      if (!t) return;
      const card = t.closest && t.closest('.gd-card');
      if (!card || !els.hand.contains(card)) return;
      applySelectionDrag(parseInt(card.dataset.cid, 10));
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
      // 没动过 → 当作点击：切换该卡选中
      if (pState.startCid != null) {
        if (state.selected.has(pState.startCid)) state.selected.delete(pState.startCid);
        else state.selected.add(pState.startCid);
        renderHand();
        updateSelHint();
        updateActions();
      }
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

  function updateSelHint() {
    const sel = selectedCards();
    if (!sel.length) { els.selHint.textContent = ''; els.selHint.className = 'gd-sel-hint'; return; }
    const level = currentLevelLabel();
    const cb = classify(sel, level);
    if (!cb) {
      els.selHint.textContent = '当前选择不成牌型';
      els.selHint.className = 'gd-sel-hint bad';
      return;
    }
    const name = comboName(cb);
    const prev = state.trick && state.trick.best;
    if (prev && state.trick.bestSeat !== 0 && !beats(cb, prev)) {
      els.selHint.textContent = name + ' · 压不过上家';
      els.selHint.className = 'gd-sel-hint bad';
    } else {
      els.selHint.textContent = name + ' ✓';
      els.selHint.className = 'gd-sel-hint ok';
    }
  }

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
    els.trickInfo.textContent = (leader === 0 ? '你' : seatName(leader)) + ' 先出';
    if (leader !== 0) scheduleAI();
    else { updateActions(); }
  }

  function seatName(s) {
    return ['你', '对手·右', '对家', '对手·左'][s];
  }

  // ---- 进贡 / 还贡 ----
  // 规则（实现）：上一局若一方“双下”（其两名成员是 3rd & 4th），末游(4th)向头游(1st)
  // 进贡其“最大的非红桃级牌单张”（大小王也算最大）。头游回还一张 ≤10 的牌。
  // 抗贡：接贡方（头游+二游同一队的话）手握两个大王 → 免贡。
  // 简化：仅“双下”触发进贡（单贡情形略），保持逻辑清晰正确。
  function handleTribute(ranking, leader) {
    const first = ranking[0], second = ranking[1], third = ranking[2], fourth = ranking[3];
    const winTeam = TEAM(first);
    const doubleDown = (TEAM(third) === TEAM(fourth)) && (TEAM(third) !== winTeam);
    if (!doubleDown) { beginPlay(leader); return; }

    // 抗贡：头游一方两人合计是否握有 2 大王
    const winnerSeats = [first, second];
    let bigJokers = 0;
    for (const s of winnerSeats)
      for (const c of state.hands[s]) if (isJoker(c) && jokerKind(c) === 'big') bigJokers++;
    if (bigJokers >= 2) {
      toast('对方握双大王，抗贡成功，免进贡');
      els.trickInfo.textContent = '抗贡 — 直接开打';
      beginPlay(leader);
      return;
    }

    // 末游(fourth) 进贡最大牌给头游(first)
    const giver = fourth, receiver = first;
    const level = currentLevelLabel();
    const tributeCard = pickTributeCard(state.hands[giver], level);
    moveCard(giver, receiver, tributeCard);

    // 还贡：头游回一张 ≤10 的牌给末游（玩家参与则给 UI）
    state.pendingTribute = { giver, receiver, tributeCard, leader };
    if (receiver === 0) {
      // 我是头游 → 我来还贡（选 ≤10）
      showReturnTributeUI(giver, tributeCard);
    } else {
      // AI 还贡
      const back = pickReturnCard(state.hands[receiver], level);
      moveCard(receiver, giver, back);
      const desc = `${seatName(giver)} 进贡 ${cardText(tributeCard)} 给 ${seatName(receiver)}，` +
        `${seatName(receiver)} 还贡 ${cardText(back)}`;
      toast('进贡完成');
      els.trickInfo.textContent = desc;
      // 进贡后由“接贡方”里末游先出（规则简化为：进贡牌的接收者那一队中、原末游先出）
      finishTribute(leader);
    }
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

  function showReturnTributeUI(giver, tributeCard) {
    state.phase = PHASE.TRIBUTE;
    els.tribTitle.textContent = '还贡';
    els.tribDesc.innerHTML = '';
    els.tribDesc.textContent = `${seatName(giver)} 向你进贡了 ${cardText(tributeCard)}。` +
      `请选一张 10 或更小的牌还给对手（没有则可还任意最小牌）。`;
    const level = currentLevelLabel();
    els.tribPick.innerHTML = '';
    let chosen = null;
    const lowCards = state.hands[0].filter(c => {
      if (isJoker(c)) return false;
      return ['2','3','4','5','6','7','8','9','10'].includes(RANK_LABELS[cardRankIdx(c)]);
    });
    const pool = lowCards.length ? lowCards : state.hands[0].filter(c => !isJoker(c));
    pool.sort((a, b) => singleWeight(a, level) - singleWeight(b, level));
    pool.forEach(c => {
      const el = buildCardEl(c, 'size-mini', level, { cid: c });
      el.addEventListener('click', () => {
        chosen = c;
        [...els.tribPick.children].forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
      });
      els.tribPick.appendChild(el);
    });
    els.tribOverlay.classList.add('open');
    els.tribConfirm.onclick = () => {
      if (chosen == null) { toast('请选一张牌'); return; }
      moveCard(0, giver, chosen);
      els.tribOverlay.classList.remove('open');
      toast('还贡完成');
      finishTribute(state.pendingTribute.leader);
    };
  }

  // ---- 出牌 ----
  function commitPlay(seat, combo) {
    const level = currentLevelLabel();
    // 从手牌移除
    for (const c of combo.cards) {
      const i = state.hands[seat].indexOf(c);
      if (i >= 0) state.hands[seat].splice(i, 1);
    }
    state.lastPlay[seat] = combo;
    state.trick.best = combo;
    state.trick.bestSeat = seat;
    state.trick.passes = 0;
    if (state.hands[seat].length === 0 && !state.out.includes(seat)) {
      state.out.push(seat);
    }
    renderAll();
    afterMove(seat);
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
      if (state.out.includes(bestSeat)) nextLeader = nextAlive(bestSeat);
      clearTrick(nextLeader);
      return;
    }

    // 轮到下一个在场玩家
    let nx = nextAlive(seat);
    state.turn = nx;
    state.trick.lead = nx;
    renderAll();
    if (nx === 0 && !state.out.includes(0)) {
      els.trickInfo.textContent = '轮到你' + describeToBeat();
      updateActions();
    } else {
      scheduleAI();
    }
  }

  function describeToBeat() {
    const t = state.trick;
    if (!t.best) return '（自由出牌）';
    if (t.bestSeat === 0) return '（你领出新一圈）';
    return `（需压过 ${seatName(t.bestSeat)} 的 ${comboName(t.best)}）`;
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
    els.trickInfo.textContent = (leader === 0 ? '你' : seatName(leader)) + ' 领出新一圈';
    if (leader === 0 && !state.out.includes(0)) updateActions();
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
    els.matchOverlay.classList.add('open');
    if (youWon) submitWin();
  }

  // ===========================================================
  //  AI 决策
  // ===========================================================
  function scheduleAI() {
    if (state.busy) return;
    state.busy = true;
    renderAll();
    const seat = state.turn;
    const delay = 360 + Math.random() * 320;
    setTimeout(() => {
      // 先释放 busy ——否则 aiAct → commitPlay → afterMove → scheduleAI 这条链
      // 会被自己的 busy 守卫拦截，导致出完一手就卡住（图五 bug）。
      // aiAct 是同步的，期间没有事件循环让玩家插队，所以释放是安全的。
      state.busy = false;
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
    commitPlay(0, cb);
  }

  function playerPass() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const trick = state.trick;
    if (!trick.best || trick.bestSeat === 0) { toast('你领出，必须出牌'); return; }
    state.selected.clear();
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

  els.playBtn.addEventListener('click', playerPlay);
  els.passBtn.addEventListener('click', playerPass);
  els.hintBtn.addEventListener('click', playerHint);
  els.sortBtn.addEventListener('click', () => {
    state.handOrder = null;   // 清掉自定义顺序 → 回到默认（点数高→低，从左到右）
    renderHand();
    toast('已按点数恢复默认顺序');
  });
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

  // ---- 启动 ----
  refreshHs();
  refreshPgoStats();
  syncPgoDiff();
  renderAll();
  initShell();

})();
