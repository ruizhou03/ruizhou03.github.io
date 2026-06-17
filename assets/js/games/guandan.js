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
  const SESSION_KEY = 'tool.guandan.session.v1';
  const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const GD_BUILD = '2026.06.16.9';  // 版本号：每次改动递增；刷新后看左下角徽标即可确认已加载最新版（含 AI 引擎状态）
  const SUIT_LABELS = ['♠','♥','♦','♣'];
  // ===== 牌面 V2：四象限版型用的「真实矢量花色」（从 Apple Symbols 字体提取轮廓；♠♣ 底脚重设计、不越两瓣最低线）=====
  // viewBox 0 0 1000 1000；按 1em 缩放，fill=currentColor 跟随红/黑。
  const SVG_SUITS = {
    0: { t: 'translate(500 500) scale(0.80349) translate(-626.5 -1393.0)', d: 'M679 1714 Q660 1815 712 1880Q624 1852 536 1880Q588 1815 574 1715Q548 1788 492.5 1836.5Q437 1885 380 1885Q295 1885 233.0 1813.0Q171 1741 171 1642Q171 1503 306 1344Q326 1319 361 1275Q401 1227 416 1209Q548 1048 619 906Q649 953 659 968L717 1051L786 1150Q844 1231 908 1303Q1082 1495 1082 1641Q1082 1739 1022.5 1810.0Q963 1881 881 1881Q810 1881 763.5 1842.5Q717 1804 679 1714Z' },
    1: { t: 'translate(500 500) scale(0.80349) translate(-715.0 -1473.5)', d: 'M714 2046 658 1955Q540 1762 352 1581Q241 1473 196.5 1387.0Q152 1301 152 1195Q152 1075 235.0 988.0Q318 901 432 901Q590 901 716 1141Q850 906 1009 906Q1125 906 1201.5 992.0Q1278 1078 1278 1210Q1278 1299 1241.5 1387.5Q1205 1476 1146 1528L1067 1599Q960 1696 857 1848L803 1928Q790 1947 714 2046Z' },
    2: { t: 'translate(500 500) scale(0.80349) translate(-616.0 -1475.5)', d: 'M1057 1475 617 2044 175 1479 616 907Z' },
    3: { t: 'translate(500 500) scale(0.80349) translate(-709.0 -1402.0)', d: 'M762 1900Q708 1874 654 1900Q678 1812 689 1726Q629 1823 570.5 1863.0Q512 1903 431 1903Q327 1903 254.0 1830.0Q181 1757 181 1652Q181 1535 268.0 1462.0Q355 1389 494 1389L552 1390Q461 1255 461 1154Q461 1050 534.5 977.0Q608 904 713 904Q820 904 894.5 977.5Q969 1051 969 1157Q969 1253 867 1390Q919 1387 936 1387Q1067 1387 1152.0 1461.0Q1237 1535 1237 1649Q1237 1751 1162.0 1828.0Q1087 1905 988 1905Q903 1905 843.0 1862.5Q783 1820 728 1720Q745 1812 762 1900Z' },
  };
  // ♠(0) / ♣(3) 用原本的文字符号（用户偏好原来的「emoji 样子」，不再用自画矢量）；♥(1) / ♦(2) 仍用矢量。
  const SUIT_CHARS = { 0: '♠', 3: '♣' };
  function suitSVG(suit) {
    if (SUIT_CHARS[suit]) return SUIT_CHARS[suit];
    const s = SVG_SUITS[suit];
    return '<svg class="suit-svg" viewBox="0 0 1000 1000" aria-hidden="true"><g transform="' + s.t + '"><path d="' + s.d + '"/></g></svg>';
  }
  // 逐花色参数（编辑器调好的定稿）：tr/bl 角标大小、big 大花色大小、br/bb 右移/下沉、op 不透明度
  const SUITP = {
    // big/br/bb/op = 右下大花色「竖排(手牌/单张)」; bigH/brH/bbH/opH = 「横排(出牌)」专属(初始=竖排值,在编辑器里分开调)
    // trY/blY = 右上/左下 角标花色「逐花色上下微调」(占卡宽比例,正=下移/负=上移;与下面统一偏移相加)
    0: { tr: 0.335, bl: 0.34, big: 1.13, br: -0.08, bb: -0.045, op: 1,   bigH: 1.13, brH: -0.125, bbH: -0.135, opH: 1,   trY: 0.02, blY: -0.175 },
    1: { tr: 0.19,  bl: 0.2,  big: 0.6,  br: 0.17,  bb: 0.245,  op: 1,   bigH: 0.6,  brH: 0.09,   bbH: 0.2,    opH: 1,   trY: 0,    blY: -0.2 },
    2: { tr: 0.22,  bl: 0.22, big: 0.74, br: 0.115, bb: 0.19,   op: 0.9, bigH: 0.68, brH: 0.075,  bbH: 0.175,  opH: 0.9, trY: 0,    blY: -0.2 },
    3: { tr: 0.325, bl: 0.34, big: 1.04, br: -0.04, bb: -0.015, op: 0.9, bigH: 0.99, brH: -0.055, bbH: -0.065, opH: 1,   trY: 0,    blY: -0.17 },
  };
  // 角标花色「上下整体偏移」(占卡宽比例,正=下移/负=上移)：编辑器「统一」滑杆调,所有花色一起动;最终偏移 = 整体 + 逐花色 trY/blY
  const SUIT_TRY_ALL = 0.02;  // 右上花色(竖排手牌) 整体上下
  const SUIT_BLY_ALL = -0.2;  // 左下花色(横排出牌) 整体上下
  const GD_S_RATIO = 0.38;   // 左上正方形 / 横纵分割线 = 0.39W；竖排错位也用它（露横分割线以上）
  const LEVEL_SEQ = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']; // 级牌进阶序

  // 炸弹 → 倍数（仿斗地主：每出一次累乘到 state.bombMult）
  //   4 炸 ×2  5 炸 ×3  6 炸 ×4  7 炸 ×5  8+ 炸 ×6
  //   同花顺 ×4   天王炸 ×8
  function bombMultiplierFor(combo) {
    if (!combo) return 1;
    if (combo.type === T.JOKER_BOMB) return 8;
    if (combo.type === T.STR_FLUSH) return 4;
    if (combo.type === T.BOMB) {
      const n = combo.len | 0;
      if (n === 4) return 2;
      if (n === 5) return 3;
      if (n === 6) return 4;
      if (n === 7) return 5;
      return 6; // 8+
    }
    return 1;
  }

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

    // 4. 钢板（二连三）：两点连续各 ≥3 张 → 6 张一组
    function pullTripleStraight() {
      const ranks = [...cnt.keys()].sort((a, b) => a - b);
      for (let i = 0; i + 1 < ranks.length; i++) {
        const r1 = ranks[i], r2 = ranks[i + 1];
        if (r2 - r1 !== 1) continue;
        if ((cnt.get(r1) || []).length >= 3 && (cnt.get(r2) || []).length >= 3) {
          return [...take(r1, 3), ...take(r2, 3)];
        }
      }
      return null;
    }
    let ts; while ((ts = pullTripleStraight())) groups.push({ type: T.TRIPLE_STR, cards: ts });

    // 5. 三连对（木板）：三点连续各 ≥2 张 → 6 张一组
    function pullPairStraight() {
      const ranks = [...cnt.keys()].sort((a, b) => a - b);
      for (let i = 0; i + 2 < ranks.length; i++) {
        const r1 = ranks[i], r2 = ranks[i + 1], r3 = ranks[i + 2];
        if (r2 - r1 !== 1 || r3 - r2 !== 1) continue;
        if ((cnt.get(r1) || []).length >= 2 && (cnt.get(r2) || []).length >= 2 && (cnt.get(r3) || []).length >= 2) {
          return [...take(r1, 2), ...take(r2, 2), ...take(r3, 2)];
        }
      }
      return null;
    }
    let ps; while ((ps = pullPairStraight())) groups.push({ type: T.PAIR_STR, cards: ps });

    // 6. 三张（先全部抠出三张，下一步再尝试匹配对子凑三带二）
    for (const [r, arr] of [...cnt.entries()]) {
      while (cnt.has(r) && cnt.get(r).length >= 3) {
        groups.push({ type: T.TRIPLE, cards: take(r, 3) });
      }
    }
    // 7. 对子
    for (const [r, arr] of [...cnt.entries()]) {
      while (cnt.has(r) && cnt.get(r).length >= 2) {
        groups.push({ type: T.PAIR, cards: take(r, 2) });
      }
    }
    // 8. 三带二：用前两步抠出的"独立三张 + 独立对子"凑 5 张组合，
    //    比拆开打多个单/对更高效（领出 1 次而非 2 次）
    while (true) {
      const tIdx = groups.findIndex(g => g.type === T.TRIPLE);
      const pIdx = groups.findIndex(g => g.type === T.PAIR);
      if (tIdx < 0 || pIdx < 0) break;
      const t = groups[tIdx], p = groups[pIdx];
      const merged = { type: T.TRIPLE_PAIR, cards: [...t.cards, ...p.cards] };
      // 移除原 triple + pair，添加 merged
      const remove = [tIdx, pIdx].sort((a, b) => b - a);
      for (const i of remove) groups.splice(i, 1);
      groups.push(merged);
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

  // stats per-difficulty 给每个难度补 totalScore 兼容字段
  function normalizeStats(raw) {
    const base = { easy: { w: 0, l: 0, totalScore: 0 }, normal: { w: 0, l: 0, totalScore: 0 }, hard: { w: 0, l: 0, totalScore: 0 }, bestLevel: 0 };
    const out = Object.assign(base, raw || {});
    for (const k of ['easy', 'normal', 'hard']) {
      const cur = out[k] || {};
      out[k] = { w: cur.w | 0, l: cur.l | 0, totalScore: cur.totalScore | 0 };
    }
    out.bestLevel = out.bestLevel | 0;
    return out;
  }

  // 玩法可调选项的合法档位（UI 段选 + 房间 config 共用）
  const SCORE_CAP_OPTS = [0, 3, 5, 8];     // 0 = 不限
  const TURN_SEC_OPTS = [10, 20, 30, 0];   // 0 = 不限
  // 同队进贡默认开（按官方名次规则，1、4 同队那局末游仍给队友头游进贡）
  function normalizeOptions(o) {
    o = o || {};
    return {
      teamTribute: (o.teamTribute === undefined) ? true : !!o.teamTribute,
      scoreCap: SCORE_CAP_OPTS.includes(o.scoreCap) ? o.scoreCap : 0,
      turnSec: TURN_SEC_OPTS.includes(o.turnSec) ? o.turnSec : 20,
    };
  }

  const CARD_SIZE_OPTS = [0.85, 1, 1.25, 1.5];
  const state = {
    aiLevel: ['easy','normal','hard'].includes(stored.lastDiff) ? stored.lastDiff : 'normal',
    options: normalizeOptions(stored.options),       // PGO 里可编辑的「下一盘」玩法设置
    matchOptions: normalizeOptions(stored.options),  // 当前这盘冻结的玩法设置（startMatch 时从 options 拷贝）
    openMult: [1, 2, 3].includes(stored.lastMult) ? stored.lastMult : 1,
    cardSizeMult: CARD_SIZE_OPTS.includes(stored.cardSizeMult) ? stored.cardSizeMult : 1,
    stats: normalizeStats(stored.stats),
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
    arrangeMode: false,                   // 已弃用：保留字段供旧 session 兼容；不再有任何效果
    customGroups: [],                     // 🔀 理牌：用户手动摞起来的牌堆
                                          // [{ id, cards:[card_id...], strength:number, type:'bomb'|'normal' }]
                                          // 渲染顺序：炸弹组（strength 降序）| 默认列 | 普通组（创建序）
    autopilot: false,                     // 🤖 托管：AI 替我打；连续 2 次超时被动自动开启
    _consecutiveTimeouts: 0,              // 玩家连续被动出牌（超时）计数
    bombMult: 1,                          // 本副对局内炸弹累乘倍数（startMatch 重置）
    lastRoundScore: null,                 // 上一小局结算分（含正负，供下一局展示后清）
    lastRoundDetail: null,                // { openMult, bombMult, advance, winTeam }
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
    chipScore: $('gdChipScore'), scoreVal: $('gdScoreVal'),
    hand: $('gdHand'),
    playBtn: $('gdPlayBtn'), passBtn: $('gdPassBtn'),
    hintBtn: $('gdHintBtn'), sortBtn: $('gdSortBtn'),
    arrangeBtn: $('gdArrangeBtn'), restoreBtn: $('gdRestoreBtn'),
    selfClock: $('gdSelfClock'),
    spectateNote: $('gdSpectateNote'),
    autopilotBtn: $('gdAutopilotBtn'),
    pgo: $('gdPgo'), pgoStart: $('gdPgoStart'),
    pgoDiff: $('gdPgoDiff'), pgoStats: $('gdPgoStats'), hs: $('gdHs'),
    pgoTeamTrib: $('gdPgoTeamTrib'), pgoScoreCap: $('gdPgoScoreCap'), pgoTurnSec: $('gdPgoTurnSec'), pgoCardSize: $('gdPgoCardSize'),
    gameOpts: $('gdGameOpts'), gameOptsToggle: $('gdGameOptsToggle'),
    gameOptsBody: $('gdGameOptsBody'), gameOptsSum: $('gdGameOptsSum'),
    tribOverlay: $('gdTributeOverlay'), tribTitle: $('gdTribTitle'),
    tribDesc: $('gdTribDesc'), tribPick: $('gdTribPick'), tribConfirm: $('gdTribConfirm'),
    roundOverlay: $('gdRoundOverlay'), roundTitle: $('gdRoundTitle'),
    roundNext: $('gdRoundNext'),
    roundLevelYou: $('gdResultLevelYou'), roundLevelOpp: $('gdResultLevelOpp'),
    roundPlayersYou: $('gdResultPlayersYou'), roundPlayersOpp: $('gdResultPlayersOpp'),
    roundTeamYou: $('gdResultTeamYou'), roundTeamOpp: $('gdResultTeamOpp'),
    roundScore: $('gdRoundScore'), roundFlipYou: $('gdResultFlipYou'), roundFlipOpp: $('gdResultFlipOpp'),
    matchOverlay: $('gdMatchOverlay'), matchTitle: $('gdMatchTitle'),
    matchAgain: $('gdMatchAgain'), matchSetup: $('gdMatchSetup'),
    matchLevelYou: $('gdMatchLevelYou'), matchLevelOpp: $('gdMatchLevelOpp'),
    matchPlayersYou: $('gdMatchPlayersYou'), matchPlayersOpp: $('gdMatchPlayersOpp'),
    matchTeamYou: $('gdMatchTeamYou'), matchTeamOpp: $('gdMatchTeamOpp'),
    matchScore: $('gdMatchScore'), matchLevelCards: $('gdMatchLevelCards'),
    pgoScore: $('gdPgoScore'),
    dblNoBtn: $('gdDblNoBtn'), dblYesBtn: $('gdDblYesBtn'),
    resumeOverlay: $('gdResumeOverlay'), resumeSummary: $('gdResumeSummary'),
    resumeContinue: $('gdResumeContinue'), resumeDiscard: $('gdResumeDiscard'),
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
        lastDiff: state.aiLevel, lastMult: state.openMult,
        sortMode: state.sortMode, stats: state.stats,
        options: state.options, cardSizeMult: state.cardSizeMult,
      }));
    } catch (e) { /* ignore */ }
  }

  // ---- session（中断保留）：只在 PLAYING/ROUND_END 阶段保存 ----
  // TRIBUTE 阶段过短（5s 超时自动确定），刷新场景极小，忽略以保持简单
  function isResumableSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return false;
    if (snap.phase !== PHASE.PLAYING && snap.phase !== PHASE.ROUND_END) return false;
    if (!Array.isArray(snap.hands) || snap.hands.length !== 4) return false;
    return true;
  }
  function buildSessionSnapshot() {
    return {
      v: 1,
      savedAt: Date.now(),
      aiLevel: state.aiLevel,
      options: state.options,
      matchOptions: state.matchOptions,
      openMult: state.openMult,
      phase: state.phase,
      levels: state.levels.slice(),
      actingTeam: state.actingTeam,
      firstLeader: state.firstLeader,
      hands: state.hands.map(h => h.slice()),
      out: state.out.slice(),
      turn: state.turn,
      trick: state.trick ? {
        lead: state.trick.lead,
        best: state.trick.best || null,
        bestSeat: state.trick.bestSeat,
        passes: state.trick.passes,
      } : null,
      handOrder: state.handOrder ? state.handOrder.slice() : null,
      customGroups: Array.isArray(state.customGroups) ? state.customGroups.map(g => ({
        id: g.id, cards: g.cards.slice(), strength: g.strength | 0, type: g.type,
      })) : [],
      lastPlay: state.lastPlay.map(p => (p === 'pass' || p == null) ? p : { type: p.type, len: p.len, key: p.key, bombStrength: p.bombStrength, cards: (p.cards || []).slice() }),
      runStartedAt: state.runStartedAt,
      runNonce: state.runNonce,
      autopilot: !!state.autopilot,
      _consecutiveTimeouts: state._consecutiveTimeouts | 0,
      bombMult: state.bombMult || 1,
      lastRoundScore: (state.lastRoundScore == null) ? null : state.lastRoundScore,
      lastRoundDetail: state.lastRoundDetail || null,
      lastRanking: Array.isArray(state.lastRanking) ? state.lastRanking.slice() : null,
      _pendingMatchWin: (state._pendingMatchWin == null) ? null : state._pendingMatchWin,
    };
  }
  let _saveSessionPending = false;
  function saveSession() {
    if (state.phase !== PHASE.PLAYING && state.phase !== PHASE.ROUND_END) return;
    if (state._doublingActive) return;   // 加倍阶段 5s 内不存档；状态短促且 lastPlay 是临时标签
    if (_saveSessionPending) return;
    _saveSessionPending = true;
    setTimeout(() => {
      _saveSessionPending = false;
      try {
        const snap = buildSessionSnapshot();
        localStorage.setItem(SESSION_KEY, JSON.stringify(snap));
      } catch (e) { /* ignore quota / serialization */ }
    }, 0);
  }
  function saveSessionSync() {
    if (state.phase !== PHASE.PLAYING && state.phase !== PHASE.ROUND_END) return;
    if (state._doublingActive) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(buildSessionSnapshot()));
    } catch (e) { /* ignore */ }
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }
  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const snap = JSON.parse(raw);
      if (!isResumableSnapshot(snap)) { clearSession(); return null; }
      return snap;
    } catch (e) { clearSession(); return null; }
  }

  let toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1600);
  }

  // ---- 卡片渲染 ----
  // 牌面 V2：四象限版型。常规牌 = 左上点数(正方形) + 右上花色 + 左下花色(靠上) + 右下超大花色(贴底出血)；
  // 级牌/逢人配 = 整张深色(is-level)；逢人配出牌时用 repRank/repSuit 画成它顶替的牌、仍深色。
  // 大小王沿用原样(★ + JOKER + ♛/♚)，横排被盖时由 CSS 切到左条竖排 JOKER。
  function buildCardEl(c, sizeClass, level, opts) {
    opts = opts || {};
    const el = document.createElement('span');
    if (isJoker(c)) {
      const kind = jokerKind(c);
      el.className = 'gd-card ' + sizeClass + ' is-joker joker-' + kind;
      if (opts.cid != null) el.dataset.cid = opts.cid;
      if (opts.selected) el.classList.add('selected');
      if (opts.groupStart) el.classList.add('group-start');
      // 四象限版型：左上 ★；右上横排 JOKER(竖排时露)；左下竖排 JOKER(横排时露)；右下皇冠
      const crown = (kind === 'big') ? '♛' : '♚';
      el.innerHTML =
        '<span class="q q-tl">★</span>' +
        '<span class="q q-tr jk-word-h">JOKER</span>' +
        '<span class="q q-bl jk-word-v"><span>J</span><span>O</span><span>K</span><span>E</span><span>R</span></span>' +
        '<span class="bigsuit jk-crown">' + crown + '</span>';
      return el;
    }
    // 出牌区可让逢人配画成它顶替的牌（opts.repRank/repSuit）；颜色/花色按"显示出来的"走
    const dSuit = (opts.repSuit != null) ? opts.repSuit : cardSuit(c);
    const dRank = (opts.repRank != null) ? opts.repRank : cardRankIdx(c);
    const red = (dSuit === 1 || dSuit === 2);
    let cls = 'gd-card ' + sizeClass + (red ? ' suit-red' : ' suit-black');
    // 整张深色高亮只给红桃级牌(逢人配)：普通级牌(♠♦♣)不高亮。逢人配顶替展示时仍深色 → 一张深色的"3"即配牌。
    if (level && isWild(c, level)) cls += ' is-level';
    // J 在 Cormorant 里带下伸、整体偏长，单独把字号收一点点，免得竖排时探出被下张盖住
    if (RANK_LABELS[dRank] === 'J') cls += ' rank-j';
    el.className = cls;
    if (opts.cid != null) el.dataset.cid = opts.cid;
    if (opts.selected) el.classList.add('selected');
    if (opts.groupStart) el.classList.add('group-start');
    const p = SUITP[dSuit];
    el.style.setProperty('--gd-tr', p.tr);
    el.style.setProperty('--gd-bl', p.bl);
    el.style.setProperty('--gd-big', p.big);
    el.style.setProperty('--gd-br', p.br);
    el.style.setProperty('--gd-bb', p.bb);
    el.style.setProperty('--gd-op', p.op);
    el.style.setProperty('--gd-bigH', p.bigH != null ? p.bigH : p.big);   // 横排出牌大花色(分开设计;缺省回退竖排)
    el.style.setProperty('--gd-brH', p.brH != null ? p.brH : p.br);
    el.style.setProperty('--gd-bbH', p.bbH != null ? p.bbH : p.bb);
    el.style.setProperty('--gd-opH', p.opH != null ? p.opH : p.op);
    el.style.setProperty('--gd-try', SUIT_TRY_ALL + (p.trY || 0));   // 右上角标上下偏移 = 整体 + 本花色微调
    el.style.setProperty('--gd-bly', SUIT_BLY_ALL + (p.blY || 0));   // 左下角标上下偏移 = 整体 + 本花色微调
    const sv = suitSVG(dSuit);
    el.innerHTML =
      '<span class="q q-tl">' + RANK_LABELS[dRank] + '</span>' +
      '<span class="q q-tr">' + sv + '</span>' +
      '<span class="q q-bl">' + sv + '</span>' +
      '<span class="bigsuit">' + sv + '</span>';
    return el;
  }

  // 视角座位：通常 0（我）；我已出完且对家(座 2)还在场 → 切换看对家手牌
  function viewSeat() {
    if (state.out.includes(0) && !state.out.includes(2)) return 2;
    return 0;
  }
  function isSpectating() { return viewSeat() !== 0; }

  // 把手牌按 columnKey 分组（每个 key 一列）。红桃级牌（逢人配）独占一列，
  // 排在小王和普通级牌之间。列内按花色固定顺序排，王和级牌单独成列。
  // handArg 可选：传一个子集时按子集生成列（用于"剔除已 custom 摞起来的卡"）
  function buildHandColumns(handArg) {
    const level = currentLevelLabel();
    const hand = handArg || state.hands[viewSeat()];
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
    // 看对家手牌时不用我的自定义顺序；用默认排序
    if (!isSpectating() && Array.isArray(state.handOrder) && state.handOrder.length) {
      const present = new Set(weights);
      const filtered = state.handOrder.filter(w => present.has(w));
      // 不在自定义里的列（新生的、进贡得到的牌、"还原"释放回去的）按默认排序
      // 插到自然位置（高→低）—— 而不是一股脑塞到末尾。
      const seen = new Set(filtered);
      const unseen = weights.filter(w => !seen.has(w)).sort((a, b) => b - a);
      for (const u of unseen) {
        let idx = 0;
        while (idx < filtered.length && filtered[idx] > u) idx++;
        filtered.splice(idx, 0, u);
      }
      weights = filtered;
    } else {
      weights.sort((a, b) => b - a);                 // 默认高在左
    }
    return weights.map(w => ({ weight: w, cards: byW.get(w) }));
  }

  function renderHand() {
    els.hand.innerHTML = '';
    els.hand.style.removeProperty('--gd-card-w');
    els.hand.style.removeProperty('--gd-card-h');
    els.hand.style.removeProperty('--gd-stack-step');
    if (state.phase === PHASE.IDLE) return;
    const level = currentLevelLabel();

    // 自定义摞过的卡 ID → 把它们从默认列里挖出来
    let customGroups = (!isSpectating() && Array.isArray(state.customGroups)) ? state.customGroups : [];
    // 清掉已经不在手牌里的 group（出牌后那张卡走了）
    if (customGroups.length) {
      const handSet = new Set(state.hands[0]);
      customGroups = customGroups.map(g => ({
        ...g,
        cards: g.cards.filter(c => handSet.has(c)),
      })).filter(g => g.cards.length > 0);
      if (!isSpectating()) state.customGroups = customGroups;
    }
    const customCardSet = new Set();
    for (const g of customGroups) for (const c of g.cards) customCardSet.add(c);

    // 默认列只用未被自定义摞起来的剩余牌
    const remainingHand = isSpectating()
      ? state.hands[viewSeat()]
      : state.hands[0].filter(c => !customCardSet.has(c));
    const cols = buildHandColumns(remainingHand);
    if (!isSpectating()) state.handOrder = cols.map(c => c.weight);
    els.hand.classList.toggle('is-spectating', isSpectating());
    // 「正在查看队友手牌」提示挪到出牌按钮那一行（最底一行）显示
    if (els.spectateNote) els.spectateNote.hidden = !isSpectating();

    const stackStep = parseFloat(
      getComputedStyle(els.hand).getPropertyValue('--gd-stack-step')
    ) || 18;
    const cardH = parseFloat(
      getComputedStyle(els.hand).getPropertyValue('--gd-card-h')
    ) || 72;

    // items 可为 [cardInt...] 或 [{c, repRank, repSuit}...]（自定义组按牌型展示，逢人配画成它顶替的牌）
    function renderCol(items, opts) {
      opts = opts || {};
      const col = document.createElement('div');
      col.className = 'gd-rank-col' + (opts.customClass ? (' ' + opts.customClass) : '');
      if (opts.weight != null) col.dataset.weight = String(opts.weight);
      if (opts.customId != null) col.dataset.customId = String(opts.customId);
      col.style.height = ((items.length - 1) * stackStep + cardH) + 'px';
      items.forEach((it, i) => {
        const obj = (typeof it === 'object');
        const c = obj ? it.c : it;
        const cardEl = buildCardEl(c, 'size-full', level, {
          cid: c, selected: state.selected.has(c),
          repRank: obj ? it.repRank : null,
          repSuit: obj ? it.repSuit : null,
        });
        cardEl.style.top = (i * stackStep) + 'px';
        cardEl.style.zIndex = String(i + 1);
        col.appendChild(cardEl);
      });
      els.hand.appendChild(col);
    }

    // 旁观对家时不展示我的 custom groups
    const bombGroups = customGroups.filter(g => g.type === 'bomb')
      .slice().sort((a, b) => b.strength - a.strength);
    const normalGroups = customGroups.filter(g => g.type !== 'bomb');

    // 渲染顺序：炸弹组（强→弱）→ 默认列 → 普通自定义组（创建序）
    // 自定义组用 comboDisplay：既给展示顺序、又把逢人配标成它顶替的牌（理牌堆里也显示成替换的数字）
    for (const g of bombGroups) {
      const disp = comboDisplay(g.cards.slice(), classifyType(g.cards, level), level);
      renderCol(disp, { customClass: 'gd-custom-col gd-custom-bomb', customId: g.id });
    }
    for (const { weight, cards } of cols) {
      renderCol(cards, { weight });
    }
    for (const g of normalGroups) {
      const disp = comboDisplay(g.cards.slice(), classifyType(g.cards, level), level);
      renderCol(disp, { customClass: 'gd-custom-col gd-custom-normal', customId: g.id });
    }
    adaptHandSize();
  }

  function classifyType(cards, level) {
    const cb = classify(cards, level);
    return cb ? cb.type : T.SINGLE;
  }

  function adaptHandSize() {
    const hand = els.hand;
    const cols = hand.querySelectorAll('.gd-rank-col');
    if (!cols.length) return;
    hand.style.removeProperty('--gd-card-w');
    hand.style.removeProperty('--gd-card-h');
    hand.style.removeProperty('--gd-stack-step');
    const cs = getComputedStyle(hand);
    const defCardW = parseFloat(cs.getPropertyValue('--gd-card-w')) || 50;
    const defCardH = parseFloat(cs.getPropertyValue('--gd-card-h')) || 72;
    const defStep  = parseFloat(cs.getPropertyValue('--gd-stack-step')) || 18;
    const gap = parseFloat(cs.getPropertyValue('--gd-col-gap')) || 4;
    const padL = parseFloat(cs.paddingLeft)  || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const availW = hand.clientWidth - padL - padR;
    if (availW <= 0) return;

    const mult = state.cardSizeMult || 1;
    const userW = Math.round(defCardW * mult);
    const userH = Math.round(defCardH * mult);
    const userStep = Math.round(defStep * mult);
    const MAX_HAND_COLS = 15;
    let cardW = userW, cardH = userH;
    const neededW = MAX_HAND_COLS * userW + (MAX_HAND_COLS - 1) * gap;
    if (neededW > availW && mult <= 1) {
      cardW = Math.max(26, Math.floor((availW - (MAX_HAND_COLS - 1) * gap) / MAX_HAND_COLS));
      cardH = Math.round(defCardH * (cardW / defCardW));
    }
    // 竖排错位 = 横向分割线 = 0.39W（只露分割线以上：点数+右上花色，无额外呼吸）
    const step = Math.round(cardW * GD_S_RATIO);
    if (cardW !== defCardW) hand.style.setProperty('--gd-card-w', cardW + 'px');
    if (cardH !== defCardH) hand.style.setProperty('--gd-card-h', cardH + 'px');
    hand.style.setProperty('--gd-stack-step', step + 'px');
    cols.forEach(col => {
      const cards = col.querySelectorAll('.gd-card');
      col.style.height = ((cards.length - 1) * step + cardH) + 'px';
      cards.forEach((c, i) => { c.style.top = (i * step) + 'px'; });
    });
  }

  function renderPlayArea(seat) {
    const slot = seatEls[seat].play;
    const lp = state.lastPlay[seat];
    // 状态哈希：renderAll 被频繁调用，同一手"不要"/同一组牌不应每次重建 DOM —
    // 那会让 gd-pass-pop 动画反复重放（用户看到别人弃出时，自己的"不要"也跟着闪）
    const level = currentLevelLabel();
    const trib = (lp && lp.tributeLabel) || '';
    const dbl = (lp && lp.type === 'doubling') ? lp.doubleChoice : '';
    const key = lp === 'pass' ? 'pass:' + level :
                dbl ? 'doubling:' + dbl :
                (lp && lp.cards && lp.cards.length) ? ('combo:' + level + ':' + lp.cards.slice().sort((a, b) => a - b).join(',') + (trib ? ':' + trib : '')) :
                'empty';
    if (slot.dataset.lpKey === key) return;
    slot.dataset.lpKey = key;
    slot.innerHTML = '';
    if (lp === 'pass') {
      // 大字"不要"浮窗：仿欢乐斗地主——每家弃出都让人一眼看见，不再藏在虚线小角标里
      const big = document.createElement('span');
      big.className = 'gd-pass-big'; big.textContent = '不出';
      slot.appendChild(big);
    } else if (dbl) {
      // 加倍阶段公示：用大字"加倍 ×2 / 不加倍"占住 play area
      const big = document.createElement('span');
      big.className = 'gd-double-big ' + (dbl === 'double' ? 'choice-yes' : 'choice-no');
      big.textContent = lp.doubleLabel;
      slot.appendChild(big);
    } else if (lp && lp.cards) {
      const row = document.createElement('div');
      row.className = 'gd-played-row';
      if (trib) row.classList.add('gd-tribute-row');
      // 进/还贡只有一张，跳过排序直接走原顺序；其余按牌型展示，逢人配画成它顶替的牌
      const descriptors = trib
        ? lp.cards.slice().map(c => ({ c, repRank: null, repSuit: null }))
        : comboDisplay(lp.cards, lp.type, level);
      // 别人出的牌跟我的手牌一样大（用 size-full）—— 用户反馈现在的太小
      for (const d of descriptors) {
        row.appendChild(buildCardEl(d.c, 'size-full', level, { repRank: d.repRank, repSuit: d.repSuit }));
      }
      if (trib) {
        const lab = document.createElement('span');
        lab.className = 'gd-tribute-tag tribute-' + (trib === '进' ? 'give' : 'return');
        lab.textContent = trib;
        row.appendChild(lab);
      }
      slot.appendChild(row);
    }
  }

  // 顺子里某张牌的"自然位置"——用于展示排序，无视级牌权重抬升。
  // A 在 A2345 顺子里当 1，在 10JQKA 当 14。
  function straightPos(c, allCards, level) {
    if (isJoker(c)) return 100;
    if (isWild(c, level)) return cardRankIdx(c) + 2;
    const ri = cardRankIdx(c);
    if (RANK_LABELS[ri] === 'A') {
      const has2 = allCards.some(cc => !isJoker(cc) && !isWild(cc, level) && cardRankIdx(cc) === 0);
      return has2 ? 1 : 14;
    }
    return ri + 2;
  }

  // 牌展示排序：
  //   三带二 → 三张组排前面，wild 跟到三张组里（不甩到末尾）；
  //   顺子 / 同花顺 / 三连对 / 二连三 → wild 按"它顶替的顺子位置"摆放，不按自然 rank；
  //   其他 → 单牌权重降序。
  function sortDisplayCards(cards, type, level) {
    if (type === T.TRIPLE_PAIR) return sortTriplePair(cards, level);
    if (type === T.STRAIGHT || type === T.STR_FLUSH || type === T.PAIR_STR || type === T.TRIPLE_STR) {
      return sortRunLike(cards, type, level);
    }
    return cards.slice().sort((a, b) => singleWeight(b, level) - singleWeight(a, level));
  }

  // 三带二：找出"三张组的 rank"（含 wild 顶替），把 wild 排到三张组里、紧贴真牌
  function sortTriplePair(cards, level) {
    const cnt = new Map();          // rank → real card count
    let wildCount = 0;
    for (const c of cards) {
      if (isJoker(c) || isWild(c, level)) { wildCount++; continue; }
      const r = cardRankIdx(c);
      cnt.set(r, (cnt.get(r) || 0) + 1);
    }
    // 找三张组的 rank：
    //   有 rank 数=3 → 即此 rank
    //   有 rank 数=2 + wild → wild 顶最强 rank；用 rankIdxWeight 比较（级牌=15 > 任何普通牌），
    //     这样 99 + 22 + wild（级=2）会判 222 是三、99 是对，跟 classify 的最强解读一致
    let tripleRank = null;
    for (const [r, n] of cnt) if (n === 3) { tripleRank = r; break; }
    if (tripleRank == null) {
      const twos = [...cnt.entries()].filter(([, n]) => n === 2).map(([r]) => r);
      twos.sort((a, b) => rankIdxWeight(b, level) - rankIdxWeight(a, level));
      tripleRank = twos[0] != null ? twos[0] : [...cnt.keys()][0];
    }
    const arr = cards.slice();
    arr.sort((a, b) => {
      const aw = isJoker(a) || isWild(a, level);
      const bw = isJoker(b) || isWild(b, level);
      const aRank = aw ? tripleRank : cardRankIdx(a);
      const bRank = bw ? tripleRank : cardRankIdx(b);
      // 三张组在前(列顶/出牌区左侧)、对子在后(列底/出牌区右侧)
      const aTrip = aRank === tripleRank ? 1 : 0;
      const bTrip = bRank === tripleRank ? 1 : 0;
      if (aTrip !== bTrip) return bTrip - aTrip;
      // 同组里：真牌在前、wild 在后
      if (aw !== bw) return aw ? 1 : -1;
      // 都真牌：高 rank 在前
      if (aRank !== bRank) return bRank - aRank;
      // 同 rank 按花色
      if (!aw && !bw) return cardSuit(a) - cardSuit(b);
      return 0;
    });
    return arr;
  }

  // 顺子点(1..14) → rank label。p=1 是 A 当头(A2345)，p=14 是 A 收尾。
  function pointToRankLabel(p) { return p === 1 ? 'A' : RANK_LABELS[p - 2]; }

  // 顺子族布局：返回 [{c, point}]，point = 该牌在顺子里占的点(1..14)。
  // 真牌取自然点；wild 补到空位 → point = 空位点。出牌区据此把 wild 画成它顶替的牌。
  function runLayout(cards, type, level) {
    const reals = cards.filter(c => !isJoker(c) && !isWild(c, level));
    const wilds = cards.filter(c => isJoker(c) || isWild(c, level));
    const per = (type === T.STRAIGHT || type === T.STR_FLUSH) ? 1
              : (type === T.PAIR_STR) ? 2
              : (type === T.TRIPLE_STR) ? 3 : 1;
    const groups = cards.length / per;
    const realByPoint = new Map();
    for (const c of reals) {
      const p = cardRankIdx(c) + 2;
      if (!realByPoint.has(p)) realByPoint.set(p, []);
      realByPoint.get(p).push(c);
    }
    let bestStart = -1;
    for (let s = 1; s + groups - 1 <= 14; s++) {
      let need = 0, ok = true;
      for (let k = 0; k < groups; k++) {
        const p = s + k;
        const realPt = (p === 1) ? 14 : p;
        const have = (realByPoint.get(realPt) || []).length;
        if (have > per) { ok = false; break; }
        need += per - have;
      }
      if (ok && need === wilds.length) bestStart = s;
    }
    if (bestStart < 0) {
      // 兜底：按自然位置排序
      const arr = cards.slice().sort((a, b) => {
        const pa = straightPos(a, cards, level), pb = straightPos(b, cards, level);
        if (pa !== pb) return pa - pb;
        return cardSuit(a) - cardSuit(b);
      });
      return arr.map(c => ({ c, point: straightPos(c, cards, level) }));
    }
    const wildsLeft = wilds.slice();
    const out = [];
    for (let k = 0; k < groups; k++) {
      const p = bestStart + k;
      const realPt = (p === 1) ? 14 : p;
      const realsHere = (realByPoint.get(realPt) || []).slice().sort((a, b) => cardSuit(a) - cardSuit(b));
      for (const c of realsHere) out.push({ c, point: p });
      const missing = per - realsHere.length;
      for (let m = 0; m < missing; m++) {
        if (wildsLeft.length) out.push({ c: wildsLeft.shift(), point: p });
      }
    }
    for (const c of wildsLeft) out.push({ c, point: null });   // 理论上不应发生
    return out;
  }

  // 顺子/同花顺/三连对/钢板：识别 wild 顶替的顺子位置，按 slot 排序
  function sortRunLike(cards, type, level) {
    return runLayout(cards, type, level).map(x => x.c);
  }
  // 三带二展示布局：返回 [{c, rank}]，rank = 该牌所属的点（三张组 / 对子）。
  // 复用 sortTriplePair 的顺序，并标出每张 wild 顶替的是三张组还是对子。
  function triplePairDisplay(cards, level) {
    const ordered = sortTriplePair(cards, level);
    const cnt = new Map();
    for (const c of cards) {
      if (isJoker(c) || isWild(c, level)) continue;
      const r = cardRankIdx(c); cnt.set(r, (cnt.get(r) || 0) + 1);
    }
    let tripleRank = null;
    for (const [r, n] of cnt) if (n === 3) { tripleRank = r; break; }
    if (tripleRank == null) {
      const twos = [...cnt.entries()].filter(([, n]) => n === 2).map(([r]) => r);
      twos.sort((a, b) => rankIdxWeight(b, level) - rankIdxWeight(a, level));
      tripleRank = twos[0] != null ? twos[0] : [...cnt.keys()][0];
    }
    let pairRank = null;
    for (const r of cnt.keys()) if (r !== tripleRank) { pairRank = r; break; }
    const needTripleWild = Math.max(0, 3 - (cnt.get(tripleRank) || 0));
    let wildSeen = 0;
    return ordered.map(c => {
      if (isWild(c, level)) {
        const tgt = (wildSeen < needTripleWild) ? tripleRank : pairRank;
        wildSeen++;
        if (tgt != null && tgt !== cardRankIdx(c)) return { c, repRank: tgt, repSuit: 1 };
      }
      return { c, repRank: null, repSuit: null };
    });
  }

  // 出牌区展示：返回有序 [{c, repRank, repSuit}]。逢人配(红桃级牌)在组合里会被画成
  // 它实际顶替的那张牌（点数 + 花色：顺子保留♥、同花顺用该花色），仍带"配"标，
  // 让人一眼读懂牌型、也明白这手为什么 valid。repRank=null 表示按本来面目画。
  function comboDisplay(cards, type, level) {
    if (type === T.STRAIGHT || type === T.STR_FLUSH || type === T.PAIR_STR || type === T.TRIPLE_STR) {
      let flushSuit = 1;
      if (type === T.STR_FLUSH) {
        const anyReal = cards.find(c => !isJoker(c) && !isWild(c, level));
        if (anyReal != null) flushSuit = cardSuit(anyReal);
      }
      return runLayout(cards, type, level).map(({ c, point }) => {
        if (isWild(c, level) && point != null) {
          return { c, repRank: RANK_LABELS.indexOf(pointToRankLabel(point)), repSuit: flushSuit };
        }
        return { c, repRank: null, repSuit: null };
      });
    }
    if (type === T.TRIPLE_PAIR) return triplePairDisplay(cards, level);
    // 单/对/三/炸：同点组合，wild 顶该点（全 wild 时是真级牌对，不顶替）
    const ordered = sortDisplayCards(cards, type, level);
    const anyReal = cards.find(c => !isJoker(c) && !isWild(c, level));
    const rank = anyReal != null ? cardRankIdx(anyReal) : null;
    return ordered.map(c => {
      if (isWild(c, level) && rank != null && rank !== cardRankIdx(c)) {
        return { c, repRank: rank, repSuit: 1 };
      }
      return { c, repRank: null, repSuit: null };
    });
  }

  function renderAll() {
    updateBuildBadge();
    const youLv = LEVEL_SEQ[state.levels[0]];
    const oppLv = LEVEL_SEQ[state.levels[1]];
    els.levelYou.textContent = youLv;
    els.levelOpp.textContent = oppLv;
    // 当前主级用角标右侧的亮点表示，不再写"◀ 当前主级"长尾文字
    els.chipYou.classList.toggle('acting', state.actingTeam === 0);
    els.chipOpp.classList.toggle('acting', state.actingTeam === 1);
    refreshScoreChip();

    for (let s = 0; s < 4; s++) {
      const se = seatEls[s];
      const handLen = state.hands[s].length;
      se.cnt.textContent = handLen;
      // 报牌：≤10 张持续红色警示
      se.cnt.classList.toggle('warn', handLen > 0 && handLen <= 10);
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

  // 在 chip 上显示本难度累计分；变化时按正/负闪一下
  function refreshScoreChip() {
    if (!els.scoreVal || !els.chipScore) return;
    const st = state.stats[state.aiLevel] || { totalScore: 0 };
    const total = st.totalScore | 0;
    const sign = total >= 0 ? '+' : '';
    const newText = sign + total;
    const prev = els.scoreVal.dataset.lastTotal == null ? null : parseInt(els.scoreVal.dataset.lastTotal, 10);
    els.scoreVal.textContent = newText;
    els.scoreVal.dataset.lastTotal = String(total);
    if (prev != null && total !== prev) {
      els.chipScore.classList.remove('delta-up', 'delta-down');
      void els.chipScore.offsetWidth;     // reflow → 让动画重启
      els.chipScore.classList.add(total > prev ? 'delta-up' : 'delta-down');
      setTimeout(() => els.chipScore && els.chipScore.classList.remove('delta-up', 'delta-down'), 900);
    }
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
    // 加倍阶段（4 人同时决策）：turn=leader 多半不是我，但我此刻正要按"加倍/不加倍"，
    // 不能把我的手牌 dim 成半透明（用户反馈像"一层蒙版盖住牌"）。整桌全亮。
    if (state._doublingActive) return;
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
    // 旁观对家手牌时不允许任何点 / 拖
    if (isSpectating()) return;
    // 选牌不限制"轮到我"——别人回合也可以提前选好；TRIBUTE 还贡阶段也可以选；
    // 实际能不能出由出牌按钮的 disabled / hidden 控制
    const canInteract = state.phase === PHASE.PLAYING || state.phase === PHASE.TRIBUTE;
    if (!canInteract) return;
    if (!els.hand.contains(e.target)) return;
    // 进贡 / 还贡阶段：只追踪 first touch。已经有指针在追了就忽略后续触点
    // （多指滑动 / 第二根手指落下都不会改变本次选中）。用 phase 判定更稳——
    // 别人进贡、我等待时 give/pair 都为 null 也算 inTribute，杜绝此刻乱选牌。
    const inTribute = state.phase === PHASE.TRIBUTE;
    if (inTribute && pState) return;
    const card = e.target.closest('.gd-card');
    const pt = e.touches ? e.touches[0] : e;
    pState = {
      startX: pt.clientX, startY: pt.clientY,
      startCid: card ? parseInt(card.dataset.cid, 10) : null,
      dragMode: null,
      mode: 'PENDING',
      inTribute,
    };
    e.preventDefault();
  }

  function onHandPointerMove(e) {
    if (!pState) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - pState.startX;
    const dy = pt.clientY - pState.startY;

    if (pState.mode === 'PENDING') {
      if (Math.abs(dx) < MOVE_THRESHOLD && Math.abs(dy) < MOVE_THRESHOLD) return;
      // 进贡 / 还贡阶段：整段禁用矩形框选；只认 first touch 的那张牌。即使用户滑出
      // 阈值距离也保持 PENDING — 让 pointerup 的"单击 = 选中起点牌"分支起作用。
      // 用 phase 判定（而非 give/pair 是否激活），杜绝框选绕过校验把非法牌选中。
      if (state.phase === PHASE.TRIBUTE) return;
      pState.mode = 'MULTI_SELECT';
      pState.dragMode = (pState.startCid != null && state.selected.has(pState.startCid)) ? 'remove' : 'add';
      pState.originalSelected = new Set(state.selected);
      applyRectSelection(pt.clientX, pt.clientY);
      e.preventDefault && e.preventDefault();
      return;
    }

    if (pState.mode === 'MULTI_SELECT') {
      applyRectSelection(pt.clientX, pt.clientY);
      e.preventDefault && e.preventDefault();
    }
  }

  function onHandPointerUp(e) {
    if (!pState) return;

    if (pState.mode === 'PENDING') {
      // 没动过 → 当作点击
      if (pState.startCid != null) {
        // 进贡阶段（玩家是 giver）：只能点同等级合法牌；并且是单选（替换）。
        // 点了不合法的牌：直接「不让选中」、静默忽略，不弹任何提示窗。
        const giveCtx = activeTributeGive();
        if (giveCtx) {
          if (giveCtx.validCards.includes(pState.startCid)) {
            state.selected.clear();
            state.selected.add(pState.startCid);
            renderHand();
            updateActions();
          }
          pState = null;
          return;
        }
        // 还贡阶段（玩家是 receiver）：只能点合法还贡牌（≤10，详见 isValidReturnCard）；
        // 同样单选替换。点了不合法的牌：直接不让选中、静默忽略，不弹窗。
        const returnCtx = activeTributePair();
        if (returnCtx) {
          if (isValidReturnCard(pState.startCid)) {
            state.selected.clear();
            state.selected.add(pState.startCid);
            renderHand();
            updateActions();
          }
          pState = null;
          return;
        }
        // 仍在进贡阶段、但此刻轮不到我给/还（在等别人）：一律不许普通选牌。
        // 杜绝 give/pair 都为 null 时落到下面无校验的普通选牌分支、把非法牌选中
        //（这正是"第一次点弹窗没选中、第二次却能选中并真把大牌进贡出去"的根因）。
        if (state.phase === PHASE.TRIBUTE) { pState = null; return; }
        // 正常切换该卡选中。smartSnap 只在用户"刚加进一张牌"时触发，自动补齐成
        // 复合牌型；如果用户是"去掉一张已选牌"，听用户的，别再把那张牌补回来。
        const wasSelected = state.selected.has(pState.startCid);
        if (wasSelected) state.selected.delete(pState.startCid);
        else state.selected.add(pState.startCid);
        if (!wasSelected) smartSnap(false);
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
    // 加倍阶段（5s 同时决策）：动作行只显示 不加倍 / 加倍 ×2；玩家已决则全藏
    if (state._doublingActive) {
      els.playBtn.hidden = true;
      els.passBtn.hidden = true;
      els.hintBtn.hidden = true;
      const myDone = state._doubleChoices && state._doubleChoices[0] != null;
      if (els.dblNoBtn) els.dblNoBtn.hidden = myDone;
      if (els.dblYesBtn) els.dblYesBtn.hidden = myDone;
      updateRestoreBtn();
      return;
    }
    // 非加倍阶段：藏掉加倍按钮
    if (els.dblNoBtn) els.dblNoBtn.hidden = true;
    if (els.dblYesBtn) els.dblYesBtn.hidden = true;
    // 进贡阶段（玩家是 giver）：按钮文字"进贡"
    const tributeGive = activeTributeGive();
    if (tributeGive) {
      els.playBtn.hidden = false;
      els.playBtn.textContent = '进贡';
      els.passBtn.hidden = true;
      els.hintBtn.hidden = true;
      const sel = selectedCards();
      els.playBtn.disabled = !(sel.length === 1 && tributeGive.validCards.includes(sel[0]));
      updateRestoreBtn();
      return;
    }
    // 还贡阶段（玩家是收贡方）：按钮文字"还贡"
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
    const trick = state.trick;
    const mustLead = trick && (trick.best == null || trick.bestSeat === 0);

    // "压不过上家"检测：跟牌场景下，手里若无任何能压的组合 → 灰显手牌、
    // 隐藏 提示/出牌，只剩 不出（仿斗地主 refreshNoPlayState）。无文字提示。
    let noPlay = false;
    if (myTurn && !mustLead) {
      const level = currentLevelLabel();
      const moves = genMoves(state.hands[0], trick.best, level);
      noPlay = moves.length === 0;
    }
    if (els.hand) els.hand.classList.toggle('no-play', noPlay);

    // 托管中：操作按钮一律藏起来（450ms 后系统会替我出牌，不要让用户点）
    const showActions = myTurn && !state.autopilot;
    els.playBtn.hidden = !showActions || noPlay;
    els.hintBtn.hidden = !showActions || noPlay;
    els.passBtn.hidden = !showActions || mustLead;
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
  // ===========================================================
  //  联网模式（服务器权威 Phase 2）
  // ===========================================================
  // 服务器只下发当前座位的手牌 + 四家张数 + 当前桌面（lastPlay/trick）。
  // 客户端不从服务器拿到别人的手牌，对手手牌用 stub 占位（只显示张数/头像，不渲染卡面）。
  function startNetworkedGame(gv) {
    state.isNetworked = true;
    state.phase = gv.phase === 'tribute' ? PHASE.TRIBUTE : PHASE.PLAYING;
    state.matchOptions = normalizeOptions(state.options || { teamTribute: false, scoreCap: 0, turnSec: state.matchOptions ? state.matchOptions.turnSec : 20 });
    state.levels = gv.levels.slice();
    state.actingTeam = gv.actingTeam;
    state.firstLeader = gv.turn;
    state.out = gv.out.slice();
    state.selected.clear();
    state.handOrder = null;
    state.customGroups = [];
    state.bombMult = gv.bombMult;
    state.openMult = gv.openMult;
    state._needDoubleChoice = false;
    applyServerGameState(gv);
    renderAll();
    saveSession();
  }

  // 每轮收到服务器状态时刷新本地的牌面/回合/出牌区
  function applyServerGameState(gv) {
    if (!gv || !state.isNetworked) return;
    state.hands[0] = gv.myHand.slice();
    for (let s = 1; s < 4; s++) {
      const want = (gv.counts && gv.counts[s]) || 0;
      const cur = (state.hands[s] && state.hands[s].length) || 0;
      if (cur !== want) state.hands[s] = new Array(want).fill(-1);
    }
    state.turn = gv.turn;
    state.phase = gv.phase === 'tribute' ? PHASE.TRIBUTE : gv.phase;
    state.out = gv.out.slice();
    state.lastPlay = gv.lastPlay ? gv.lastPlay.slice() : [null, null, null, null];
    state.trick = {
      lead: gv.trick ? gv.trick.lead : gv.turn,
      best: gv.trick ? gv.trick.best : null,
      bestSeat: gv.trick ? gv.trick.bestSeat : -1,
      passes: gv.trick ? gv.trick.passes : 0,
    };
    state.bombMult = gv.bombMult;
    state.ranking = gv.ranking;
    state.roundResult = gv.roundResult;
    state.matchWinner = gv.matchWinner;

    // 进贡阶段：根据服务器状态设置本地 tribute 上下文，让已有 UI 复用
    state._activeTributeGive = null;
    state._activeTributePair = null;
    state.pendingTribute = null;
    if (gv.tribute) {
      const tv = gv.tribute;
      if (tv.myAction === 'give' && tv.validGiveCards) {
        state._activeTributeGive = {
          seat: 0,
          defaultCard: tv.defaultGiveCard,
          validCards: tv.validGiveCards,
        };
        state.selected.clear();
        if (tv.defaultGiveCard != null) state.selected.add(tv.defaultGiveCard);
      } else if (tv.myAction === 'return') {
        state.pendingTribute = {
          pairs: tv.pairs || [],
          newLeader: null,
        };
        const pairIdx = (tv.pairs || []).findIndex(p => p.receiver === 0 && !p.returnCard);
        if (pairIdx >= 0) {
          state._activeTributePair = pairIdx;
          state.selected.clear();
        }
      }
    }

    if (gv.phase === 'round_end') endRound();
    else if (gv.phase === 'match_end') { endRound(); endMatch(gv.matchWinner); }
    else if (gv.phase === 'tribute') {
      renderAll();
      saveSession();
      updateActions();
      if (gv.tribute && gv.tribute.myAction === 'give') {
        startTurnClock(0, () => {
          if (state._activeTributeGive) sendNetworkedTribute('give', state._activeTributeGive.defaultCard);
        }, 5000);
      } else if (gv.tribute && gv.tribute.myAction === 'return') {
        startTurnClock(0, () => {
          const card = pickReturnCard(state.hands[0], currentLevelLabel());
          sendNetworkedTribute('return', card);
        }, 20000);
      }
    } else {
      renderAll();
      saveSession();
      if (gv.turn === 0 && gv.phase === 'playing') {
        updateActions();
        armTurnClock();
      } else {
        applyAttentionFocus();
        updateActions();
      }
    }
  }

  // 联网模式下我的出牌/不出 → 发给服务器（不是本地 commit）
  async function sendNetworkedMove(action, cards) {
    if (!state.isNetworked || !onlineState) return;
    state.busy = true;
    updateActions();
    const r = await gdApi('move', {
      body: { code: onlineState.code, token: onlineState.token, move: { action, cards } }
    });
    state.busy = false;
    if (!r.ok) {
      const err = r.error || 'illegal_move';
      // 非法操作（例如点慢了 server 已不在你的回合）：用服务器状态强行覆盖
      if (r.data && r.data.state && r.data.state.game) {
        clearSession();
        applyServerGameState(r.data.state.game);
        if (err === 'not_your_turn') { /* 静默，只是慢了一点 */ }
        else toast(errText(err));
      } else {
        toast(errText(err));
      }
      return;
    }
    // 成功：服务器已认证这一手，立刻 apply 带回来的新状态
    clearSession();
    if (r.data && r.data.state && r.data.state.game) {
      state.selected.clear();
      applyServerGameState(r.data.state.game);
    }
    // 让轮询也不停拉最新（万一 POST 和 poll 有竞态）
    pokePoll();
  }

  // 联网模式下进贡/还贡 → 发给服务器
  async function sendNetworkedTribute(type, card) {
    if (!state.isNetworked || !onlineState) return;
    state.busy = true;
    state._activeTributeGive = null;
    state._activeTributePair = null;
    stopTurnClock();
    updateActions();
    const r = await gdApi('tribute', {
      body: { code: onlineState.code, token: onlineState.token, tribute: { type, card } }
    });
    state.busy = false;
    if (!r.ok) {
      if (r.data && r.data.state && r.data.state.game) {
        clearSession();
        applyServerGameState(r.data.state.game);
      } else {
        toast(errText(r.error || 'tribute_error'));
      }
      return;
    }
    clearSession();
    if (r.data && r.data.state && r.data.state.game) {
      state.selected.clear();
      applyServerGameState(r.data.state.game);
    }
    pokePoll();
  }

  // 联网模式下开下一局（局末点"继续" / 整盘结束点"再来一局"）
  async function nextRoundNet() {
    if (!state.isNetworked || !onlineState) return;
    state.phase = PHASE.IDLE;
    renderAll();
    const r = await gdApi('next_round', { body: { code: onlineState.code, token: onlineState.token } });
    if (r.ok && r.data && r.data.state && r.data.state.game) {
      state.selected.clear();
      state.hands = [[], [], [], []];
      state.lastPlay = [null, null, null, null];
      state.out = [];
      state.ranking = null;
      state.matchWinner = null;
      state.bombMult = 1;
      state.customGroups = [];
      startNetworkedGame(r.data.state.game);
    } else {
      toast('开下一局失败');
    }
  }

  // 检查是否联网模式且需要跳过本地 AI / commit
  function isNetworked() { return !!state.isNetworked; }

  function startMatch() {
    // 冻结这一盘的玩法设置：只在开新一盘时从可编辑的 options 拷贝一次。
    // 这盘进行中（含局与局之间）engine 只读 matchOptions，改 PGO 设置要等下一盘才生效。
    state.matchOptions = normalizeOptions(state.options);
    state.levels = [0, 0];           // 都从 '2'
    state.actingTeam = 0;            // 你方先做主级（首局由座 0 起手）
    state.firstLeader = 0;
    state.runStartedAt = Date.now();
    state.runNonce = (window.GamesShell && GamesShell.Identity)
      ? GamesShell.Identity.newRunNonce() : String(Date.now());
    // 新一副：清炸弹倍数 / 上局分 / 任何残存 session
    state.bombMult = 1;
    state.lastRoundScore = null;
    state.lastRoundDetail = null;
    state._pendingMatchWin = null;
    state.lastRanking = null;
    clearSession();
    startRound(null);
  }

  // tributeResult: null（首局）| { from, to, card }（含还贡后）
  function startRound(prevRanking) {
    state.phase = PHASE.PLAYING;
    // 新一局默认「不」继承上一局的托管：每局都要用户自己再点一次「🤖 托管」才接管。
    // （超时被动开启的计数也清零，新局从头算。）
    state.autopilot = false;
    state._consecutiveTimeouts = 0;
    refreshAutopilotBtn();
    state.out = [];
    state.selected.clear();
    state.handOrder = null;          // 重新发牌 → 重置自定义列顺序
    state.lastPlay = [null, null, null, null];
    state.busy = false;
    state.bombMult = 1;              // 每小局炸弹倍数清零
    state.lastRoundScore = null;
    state.lastRoundDetail = null;
    state.customGroups = [];         // 每小局重发 → 清掉手动摞起来的组
    // 新一局重置智能选牌门闩，避免新局首手与上局某一刻 trick 状态 + 手牌张数偶然碰撞
    state._autoTurnKey = null;
    // 每小局都让用户选一次加倍；resume 路径不走 startRound，所以不会重新弹
    state._needDoubleChoice = true;
    state.openMult = 1;
    state._doublingActive = false;
    state._doubleChoices = null;
    state._doublingLeader = null;
    const deck = shuffle(buildDeck());
    state.hands = [[], [], [], []];
    for (let i = 0; i < 108; i++) state.hands[i % 4].push(deck[i]);
    if (typeof GuandanDMC !== 'undefined') { GuandanDMC.resetRound(); ensureDMC(); }

    // 决定先手：首局随机抽一家；之后由进贡/抗贡规则在 handleTribute 里改写
    // （这里的 leader 只是非进贡场景的兜底：传入的是上局头游）
    let leader;
    if (prevRanking && prevRanking.length) leader = prevRanking[0];
    else leader = Math.floor(Math.random() * 4);   // 首局随机
    state.firstLeader = leader;

    // 进贡处理（非首局）
    if (prevRanking && prevRanking.length === 4) {
      handleTribute(prevRanking, leader);
    } else {
      beginPlay(leader);
    }
  }

  function beginPlay(leader) {
    // 升级规则下倍数无意义：移除开局加倍环节，直接进入出牌
    state._needDoubleChoice = false;
    state.openMult = 1;
    state.phase = PHASE.PLAYING;
    state.turn = leader;
    state.trick = { lead: leader, best: null, bestSeat: -1, passes: 0 };
    state.busy = false;
    renderAll();
    saveSession();
    if (leader !== 0) scheduleAI();
    else { updateActions(); armTurnClock(); }
  }

  // 加倍阶段：所有 4 家同时决策，5s 倒计时。
  //   - 玩家：动作行出 [不加倍] [加倍 ×2] 按钮 + gd-self-clock 跑 5s
  //   - AI：随机 0.5-3.5s 内决策（基于"大牌数"启发式）
  //   - 别人决定 → 立刻在其 play area 显示"加倍"/"不加倍"标签（仿"不出"）
  //   - 5s 到 / 全部决定 → 公示 1s（把未决的标 不加倍）→ 清牌位 → 进入正式出牌
  //   - 倍数：openMult = 2 ^ (加倍人数)；只有 1 个人加倍就 ×2，2 个人 ×4，依此类推
  const DOUBLING_WINDOW_MS = 5000;
  const DOUBLING_REVEAL_MS = 1000;
  function enterDoublingPhase(leader) {
    state.phase = PHASE.PLAYING;
    state.turn = leader;
    state.trick = { lead: leader, best: null, bestSeat: -1, passes: 0 };
    state.busy = true;          // 阻断 AI 出牌调度（注意：AI 的"加倍决策"另起 setTimeout，不走 scheduleAI）
    state.openMult = 1;
    state._doublingActive = true;
    state._doublingLeader = leader;
    state._doubleChoices = [null, null, null, null];
    // 清掉上一局残留的 lastPlay，让 doubling label 干净登场
    state.lastPlay = [null, null, null, null];
    renderAll();
    updateActions();            // 显示 不加倍/加倍 按钮
    // 玩家 5s 倒计时（gd-self-clock）；时钟跑完调 finalizeDoubling 兜底
    startTurnClock(0, finalizeDoubling, DOUBLING_WINDOW_MS);
    // 给 3 个 AI 各排一个随机延迟决策；只要 _doublingActive=false 就放弃
    for (let s = 1; s < 4; s++) {
      const delay = 500 + Math.random() * 3000;
      setTimeout(() => {
        if (!state._doublingActive) return;
        const choice = aiDecideDouble(s);
        registerDoubleChoice(s, choice);
      }, delay);
    }
  }

  // 启发：手里"大牌"够多就加倍。统计大王/小王/A/级牌的张数；≥4 张就加倍
  function aiDecideDouble(seat) {
    const hand = state.hands[seat];
    const level = currentLevelLabel();
    let big = 0;
    for (const c of hand) {
      if (isJoker(c)) { big++; continue; }
      const lab = RANK_LABELS[cardRankIdx(c)];
      if (lab === 'A' || lab === level) big++;
    }
    return big >= 4 ? 'double' : 'pass';
  }

  function registerDoubleChoice(seat, choice) {
    if (!state._doublingActive) return;
    if (state._doubleChoices[seat] != null) return;     // 已决定，忽略
    state._doubleChoices[seat] = choice;
    // 把决定挂到 lastPlay 让 renderPlayArea 显示标签（公示）
    state.lastPlay[seat] = {
      type: 'doubling',
      cards: [],
      doubleLabel: choice === 'double' ? '加倍 ×2' : '不加倍',
      doubleChoice: choice,
    };
    if (seat === 0) {
      // 玩家已决 → 收掉时钟 + 隐藏加倍按钮
      stopTurnClock();
      updateActions();
    }
    renderAll();
    // 全部决定完 → 立即进入公示
    if (state._doubleChoices.every(c => c != null)) {
      finalizeDoubling();
    }
  }

  function finalizeDoubling() {
    if (!state._doublingActive) return;
    state._doublingActive = false;
    stopTurnClock();
    // 兜底：5s 内没决定的算 不加倍
    for (let s = 0; s < 4; s++) {
      if (state._doubleChoices[s] == null) {
        state._doubleChoices[s] = 'pass';
        state.lastPlay[s] = {
          type: 'doubling', cards: [],
          doubleLabel: '不加倍', doubleChoice: 'pass',
        };
      }
    }
    // 算总倍数：2 ^ 加倍人数
    const doublers = state._doubleChoices.filter(c => c === 'double').length;
    state.openMult = doublers > 0 ? Math.pow(2, doublers) : 1;
    persist();
    updateActions();         // 藏掉加倍按钮
    renderAll();
    // 公示 1s 后清牌位，开始正式出牌
    setTimeout(() => {
      for (let s = 0; s < 4; s++) state.lastPlay[s] = null;
      state._doubleChoices = null;
      state._needDoubleChoice = false;
      state.busy = false;
      const leader = state._doublingLeader;
      state._doublingLeader = null;
      beginPlay(leader);
    }, DOUBLING_REVEAL_MS);
  }

  // 玩家按 不加倍 / 加倍 按钮
  function playerDoubleChoice(choice) {
    if (!state._doublingActive) return;
    registerDoubleChoice(0, choice);
  }

  function seatName(s) {
    // 不用「对家 / 对手·左 / 对手·右」方位标签（不同人视角下方位会错乱）：
    // 三家电脑按固定编号 AI 1 / 2 / 3（座 0 是我）。结算面板、进贡 / 接风提示都走这里。
    return ['你', 'AI 1', 'AI 2', 'AI 3'][s];
  }

  // ---- 进贡 / 还贡 ----
  // 进贡分两种（依官方规则，东南大学/BCTA/维基一致）：
  //   单贡：普通局——末游(4th)给头游(1st)进"最大非红桃级牌单张"，头游还一张≤10。
  //   双贡（双下）：上一局一方包揽 1st+2nd（3rd & 4th 同队且非胜方）——3rd+4th 都进贡，
  //                 较大贡牌→头游、较小→二游，两边都还贡。
  // 先出牌（首家）规则：
  //   单贡正常        → 进贡者（末游）先出
  //   单贡抗贡        → 收贡者（头游）先出
  //   双贡正常        → 两个进贡者中"贡牌大"的那家先出；两张一样大则头游下家先出
  //   双贡抗贡        → 头游先出
  // 抗贡：贡方手握两个大王 → 免贡（单贡看末游一人，双贡看 3rd+4th 合计）。
  // 红心级牌不能进贡（pickTributeCard 已排除）。
  function handleTribute(ranking, leader) {
    const first = ranking[0], second = ranking[1], third = ranking[2], fourth = ranking[3];
    const winTeam = TEAM(first);
    const doubleDown = (TEAM(third) === TEAM(fourth)) && (TEAM(third) !== winTeam);
    if (doubleDown) { handleDoubleTribute(first, second, third, fourth); return; }
    // 单贡：末游→头游。若关了「同队进贡」且末游正好是头游队友（1、4 同队那局），
    // 则跳过进贡，直接由头游先出。
    if (!state.matchOptions.teamTribute && TEAM(fourth) === TEAM(first)) {
      beginPlay(first);
      return;
    }
    handleSingleTribute(first, fourth);
  }

  // 数某些座位手里共有几张大王（抗贡判定用）
  function countBigJokers(seats) {
    let n = 0;
    for (const s of seats)
      for (const c of state.hands[s]) if (isJoker(c) && jokerKind(c) === 'big') n++;
    return n;
  }

  // 单贡：末游(fourth) → 头游(first)
  function handleSingleTribute(first, fourth) {
    state.phase = PHASE.TRIBUTE;
    renderAll();
    // 抗贡：末游独握双大王 → 免贡，头游先出
    if (countBigJokers([fourth]) >= 2) {
      showTributeBanner('🛡️ 抗贡成功', seatName(fourth) + ' 握双大王，免进贡', 2000);
      setTimeout(() => { beginPlay(first); }, 2000);   // 收贡者（头游）先出
      return;
    }
    resolveGiverCard(fourth, card => {
      state.pendingTribute = {
        pairs: [{ giver: fourth, receiver: first, tributeCard: card, returnCard: null }],
        newLeader: fourth,   // 进贡者（末游）先出
      };
      collectThenSwap();
    });
  }

  // 双贡（双下）：fourth & third 都进贡
  function handleDoubleTribute(first, second, third, fourth) {
    state.phase = PHASE.TRIBUTE;
    renderAll();
    // 抗贡：贡方（3rd+4th）合计握有 2 大王 → 免贡，头游先出
    if (countBigJokers([third, fourth]) >= 2) {
      showTributeBanner('🛡️ 抗贡成功', seatName(third) + ' & ' + seatName(fourth) + ' 握双大王，免进贡', 2000);
      setTimeout(() => { beginPlay(first); }, 2000);   // 双贡抗贡 → 头游先出
      return;
    }
    // 两位 giver 都给"最大非红桃级牌单张"。玩家是其一时给 5s 选同等级别花色。
    resolveGiverCard(fourth, fourthCard => {
      resolveGiverCard(third, thirdCard => {
        const level = currentLevelLabel();
        const fw = singleWeight(fourthCard, level);
        const tw = singleWeight(thirdCard, level);
        // 大牌→头游、小牌→二游；并列时按约定 fourth→first, third→second
        let bigGiver, bigCard, smallGiver, smallCard;
        if (fw >= tw) {
          bigGiver = fourth; bigCard = fourthCard;
          smallGiver = third; smallCard = thirdCard;
        } else {
          bigGiver = third; bigCard = thirdCard;
          smallGiver = fourth; smallCard = fourthCard;
        }
        // 先出：贡牌大的那家先出；两张一样大则头游下家先出
        const newLeader = (fw === tw) ? (first + 1) % 4 : bigGiver;
        state.pendingTribute = {
          pairs: [
            { giver: bigGiver, receiver: first, tributeCard: bigCard, returnCard: null },
            { giver: smallGiver, receiver: second, tributeCard: smallCard, returnCard: null },
          ],
          newLeader,
        };
        collectThenSwap();
      });
    });
  }

  const TRIBUTE_GIVE_TIMEOUT_MS = 5000;
  // 取出某座 giver 准备进贡的牌。AI → 直接 pickTributeCard；玩家 → 弹 5s
  // 倒计时，预选最大牌并允许换同等级的别张花色，否则用默认。
  function resolveGiverCard(seat, cb) {
    const level = currentLevelLabel();
    const defaultCard = pickTributeCard(state.hands[seat], level);
    if (seat !== 0) { cb(defaultCard); return; }
    // 同等级（同 singleWeight 且不是红桃级牌）的所有候选牌
    const defWeight = singleWeight(defaultCard, level);
    const validCards = state.hands[0].filter(c =>
      !isWild(c, level) && singleWeight(c, level) === defWeight);
    state._activeTributeGive = { seat: 0, defaultCard, validCards };
    state.selected.clear();
    state.selected.add(defaultCard);
    renderAll();
    startTurnClock(0, () => {
      // 5s 超时：用当前选中（用户改过的）或 default 兜底确认
      const sel = selectedCards();
      const card = (sel.length === 1 && validCards.includes(sel[0])) ? sel[0] : defaultCard;
      commitGivePlayer(card, cb);
    }, TRIBUTE_GIVE_TIMEOUT_MS);
    state._tributeGiveCb = cb;
  }
  function commitGivePlayer(card, cb) {
    const ctx = state._activeTributeGive;
    if (!ctx || ctx.seat !== 0) return;
    state._activeTributeGive = null;
    state._tributeGiveCb = null;
    state.selected.clear();
    stopTurnClock();
    (cb || ctx._cb)(card);
  }
  // 玩家点击"进贡"按钮的确认入口
  function confirmGiveTribute() {
    const ctx = state._activeTributeGive;
    if (!ctx) return;
    const sel = selectedCards();
    if (sel.length !== 1) { toast('请选一张'); return; }
    if (!ctx.validCards.includes(sel[0])) { toast('只能选同等级的最大可进贡牌'); return; }
    if (isNetworked()) { sendNetworkedTribute('give', sel[0]); return; }
    commitGivePlayer(sel[0], state._tributeGiveCb);
  }
  function activeTributeGive() {
    if (state.phase !== PHASE.TRIBUTE) return null;
    const ctx = state._activeTributeGive;
    if (!ctx || ctx.seat !== 0) return null;
    return ctx;
  }

  // 新流程：进贡和还贡分两阶段
  //   1) 决定 pair.returnCard（AI 立即选好；玩家由 UI 选完）—— 此时不飞
  //   2) swapTributePair：两张牌同时起飞、相互交换，再各塞入对方牌堆
  // 进贡：先把所有牌选定（AI 收方立刻选还贡牌；玩家收方等其挑完），四张全就绪后再一起交换。
  // 双下时这样就实现"等四个人都提交了才交换"；单贡是一对，逻辑相同。
  function collectThenSwap() {
    const pt = state.pendingTribute;
    if (!pt) return;
    const level = currentLevelLabel();
    let playerIdx = -1;
    pt.pairs.forEach((pair, idx) => {
      if (pair.returnCard != null) return;        // 已定（玩家刚提交的、或之前 AI 选的）
      if (pair.receiver === 0) playerIdx = idx;    // 玩家收方：稍后等其挑
      else pair.returnCard = pickReturnCard(state.hands[pair.receiver], level);
    });
    if (playerIdx >= 0) {
      // 等玩家挑还贡牌（动作行显示"还贡"）；挑完 confirmReturnTribute 会再调本函数
      state._activeTributePair = playerIdx;
      state.selected.clear();
      renderAll();
      startTurnClock(0, autoReturnTribute, TRIBUTE_TIMEOUT_MS);
      return;
    }
    swapAllPairs();   // 四张牌全部就绪 → 同时交换所有对
  }
  function swapAllPairs() {
    const pt = state.pendingTribute;
    if (!pt) return;
    let remaining = pt.pairs.length;
    const newLeader = pt.newLeader != null ? pt.newLeader : 0;
    pt.pairs.forEach((_, idx) => swapTributePair(idx, () => {
      if (--remaining === 0) finishTribute(newLeader);
    }));
  }

  // 进贡 4 段式（按用户反馈对齐欢乐斗地主体感）：
  //   P1 打出  —— 两张牌真正"从牌堆里出去"：state.hands[seat] 移除该牌、count -1、play area 显示牌 + 进/还角标
  //   P2 交换  —— 两张浮卡分别飞到对方的 play area
  //   P3 停留  —— 0.5s，让用户看清新位置
  //   P4 收牌  —— 把对方的牌塞进对方牌堆（count +1），玩家方走 just-inserted 弹动
  function swapTributePair(idx, onComplete) {
    const pair = state.pendingTribute.pairs[idx];
    const level = currentLevelLabel();
    const mkCombo = (card, label) => ({
      type: T.SINGLE, cards: [card],
      key: singleWeight(card, level), bombStrength: 0,
      tributeLabel: label,
    });
    const removeFromHand = (seat, card) => {
      const i = state.hands[seat].indexOf(card);
      if (i >= 0) state.hands[seat].splice(i, 1);
    };
    const hideSlot = (slot) => {
      const cardEl = slot.querySelector('.gd-card');
      const tagEl = slot.querySelector('.gd-tribute-tag');
      if (cardEl) cardEl.style.visibility = 'hidden';
      if (tagEl) tagEl.style.visibility = 'hidden';
    };

    // P1: 同时把两张牌从手牌里拿出来，挂到各自 play area
    removeFromHand(pair.giver, pair.tributeCard);
    removeFromHand(pair.receiver, pair.returnCard);
    state.lastPlay[pair.giver] = mkCombo(pair.tributeCard, '进');
    state.lastPlay[pair.receiver] = mkCombo(pair.returnCard, '还');
    renderAll();

    setTimeout(phaseSwap, 600);

    function phaseSwap() {
      const giverSlot = seatEls[pair.giver].play;
      const receiverSlot = seatEls[pair.receiver].play;
      hideSlot(giverSlot);
      hideSlot(receiverSlot);
      let done = 0;
      const onArrive = () => { if (++done === 2) phasePause(); };
      flyCardBetweenSlots(pair.tributeCard, giverSlot, receiverSlot, level, onArrive);
      flyCardBetweenSlots(pair.returnCard, receiverSlot, giverSlot, level, onArrive);
    }

    function phasePause() {
      // 把 lastPlay 写成交换后的位置（giver slot 现在显示 return card，反之亦然），
      // 让用户在 0.5s 停留里看清"新位置"
      state.lastPlay[pair.giver] = mkCombo(pair.returnCard, '还');
      state.lastPlay[pair.receiver] = mkCombo(pair.tributeCard, '进');
      renderAll();
      setTimeout(phaseInsert, 500);
    }

    function phaseInsert() {
      // 真正把牌塞进对方牌堆（count +1），清掉 play area
      state.hands[pair.giver].push(pair.returnCard);
      state.hands[pair.receiver].push(pair.tributeCard);
      state.lastPlay[pair.giver] = null;
      state.lastPlay[pair.receiver] = null;
      renderAll();

      const selfInvolved = (pair.giver === 0 || pair.receiver === 0);
      if (selfInvolved) {
        const newCard = pair.giver === 0 ? pair.returnCard : pair.tributeCard;
        requestAnimationFrame(() => {
          const inserted = els.hand && els.hand.querySelector('.gd-card[data-cid="' + newCard + '"]');
          if (inserted) {
            inserted.classList.add('just-inserted');
            setTimeout(() => inserted.classList.remove('just-inserted'), 720);
          }
        });
      }
      // 本对交换完成回调（swapAllPairs 收齐所有对后 finishTribute）
      setTimeout(() => { if (onComplete) onComplete(); }, selfInvolved ? 720 : 400);
    }
  }

  // 一张牌从一个 play slot 飞到另一个 play slot，~700ms
  function flyCardBetweenSlots(card, fromSlot, toSlot, level, onDone) {
    const fromR = fromSlot.getBoundingClientRect();
    const toR = toSlot.getBoundingClientRect();
    // 空 slot 的 BoundingClientRect 可能宽高=0；用 seat 头像作为 fallback 让动画起点不至于卡在角落
    const fromCx = (fromR.width > 0 ? fromR.left + fromR.width / 2 : fromR.left);
    const fromCy = (fromR.height > 0 ? fromR.top + fromR.height / 2 : fromR.top);
    const toCx = (toR.width > 0 ? toR.left + toR.width / 2 : toR.left);
    const toCy = (toR.height > 0 ? toR.top + toR.height / 2 : toR.top);
    const cardEl = buildCardEl(card, 'size-full', level);
    cardEl.style.position = 'fixed';
    cardEl.style.left = fromCx + 'px';
    cardEl.style.top = fromCy + 'px';
    cardEl.style.transform = 'translate(-50%, -50%)';
    cardEl.style.zIndex = '9999';
    cardEl.style.transition = 'left 0.7s cubic-bezier(0.4, 0.0, 0.2, 1), top 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)';
    cardEl.style.pointerEvents = 'none';
    cardEl.style.boxShadow = '0 6px 14px rgba(20,37,63,0.45)';
    const wrap = document.querySelector('.guandan-wrap') || document.body;
    wrap.appendChild(cardEl);
    requestAnimationFrame(() => {
      cardEl.style.left = toCx + 'px';
      cardEl.style.top = toCy + 'px';
    });
    setTimeout(() => {
      cardEl.remove();
      onDone && onDone();
    }, 720);
  }

  // 进贡阶段中心 banner：每次显示前先清掉上一条（避免叠字成重影）
  // 当前唯一调用点：抗贡。durationMs 默认 1300，可覆盖
  function showTributeBanner(line1, line2, durationMs) {
    if (!els.table) return;
    els.table.querySelectorAll('.gd-fx-banner.gd-tribute-banner').forEach(el => el.remove());
    const ban = document.createElement('div');
    ban.className = 'gd-fx-banner gd-tribute-banner';
    ban.style.fontSize = '1.7rem';
    ban.innerHTML = line1 + (line2 ? '<br><span style="font-size:0.8rem;letter-spacing:0.05em;opacity:0.88;">' + line2 + '</span>' : '');
    els.table.appendChild(ban);
    setTimeout(() => { if (ban.parentNode) ban.remove(); }, durationMs || 1300);
  }

  // 接风视觉：中央大字"🪁 接风" + finisher 头像金光发出 → 队友头像金光接收
  function showJiefengFx(fromSeat, toSeat) {
    if (!els.table) return;
    const ban = document.createElement('div');
    ban.className = 'gd-fx-banner gd-jiefeng-banner';
    // 只显示「接风」两字（去掉「X 领出」副标题，多余）
    ban.innerHTML =
      '<span class="gd-jiefeng-icon">🪁</span>' +
      '<span class="gd-jiefeng-text">接风</span>';
    els.table.appendChild(ban);
    setTimeout(() => ban.remove(), 1500);
    // 来源和接收方头像各闪一次金光
    const flash = (seat) => {
      const av = seatEls[seat] && seatEls[seat].seat && seatEls[seat].seat.querySelector('.gd-avatar');
      if (!av) return;
      av.classList.add('gd-jiefeng-flash');
      setTimeout(() => av.classList.remove('gd-jiefeng-flash'), 1300);
    };
    flash(fromSeat);
    setTimeout(() => flash(toSeat), 400);
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
      const lowOk = lab !== level && ['2','3','4','5','6','7','8','9','10'].includes(lab);  // 级牌是大牌，不算小牌
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
    const level = currentLevelLabel();
    // 小牌 = 点数 2~10 且【不是级牌】。级牌即便数字 ≤10，本局也是大牌（凌驾于 10 之上），不算小牌。
    const isLow = x => {
      if (isJoker(x)) return false;
      const rl = RANK_LABELS[cardRankIdx(x)];
      if (rl === level) return false;
      return ['2','3','4','5','6','7','8','9','10'].includes(rl);
    };
    const handHasLow = state.hands[0].some(isLow);
    if (handHasLow) return isLow(c);
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
    const low = hand.filter(c => !isJoker(c) && RANK_LABELS[cardRankIdx(c)] !== level && ['2','3','4','5','6','7','8','9','10'].includes(RANK_LABELS[cardRankIdx(c)]));
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
    if (isNetworked()) { sendNetworkedTribute('return', sel[0]); return; }
    pair.returnCard = sel[0];
    state.selected.clear();
    stopTurnClock();
    state._activeTributePair = null;
    // 记下玩家还贡牌；若四张已齐 collectThenSwap 会一起交换，否则继续等下一个收方
    collectThenSwap();
  }

  // ---- 出牌 ----
  function commitPlay(seat, combo) {
    if (isNetworked()) { sendNetworkedMove('play', combo.cards.slice()); return; }
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
    if (typeof GuandanDMC !== 'undefined') GuandanDMC.recordPlay(seat, combo.cards);
    if (afterLen === 0 && !state.out.includes(seat)) {
      state.out.push(seat);
    }
    renderAll();
    // 报牌：首次跨过 10 张时，给该家的余牌徽弹动一次。徽本身一直红色警示
    // 直至清零；不再弹 toast，避免重复打扰
    if (beforeLen > 10 && afterLen <= 10 && afterLen > 0) {
      const cnt = seatEls[seat] && seatEls[seat].cnt;
      if (cnt) {
        cnt.classList.add('first');
        setTimeout(() => cnt.classList.remove('first'), 1050);
      }
    }
    // 炸弹类视觉反馈：起牌区红闪 + 表桌抖一下 + 全桌大字浮屏
    if (isBombType(combo.type)) {
      const mult = bombMultiplierFor(combo);
      if (mult > 1) state.bombMult = (state.bombMult || 1) * mult;
      playBombFx(seat, combo);
    }
    // 玩家刚出牌后立即藏掉操作按钮，否则 renderAll 内的 updateActions 会因为
    // state.turn 仍是 0 而把按钮再渲一遍（直到 afterMove 把 turn 推走）
    if (seat === 0) hidePlayActionsImmediate();
    saveSession();
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
    if (isNetworked()) { sendNetworkedMove('pass'); return; }
    state.lastPlay[seat] = 'pass';
    state.trick.passes++;
    if (typeof GuandanDMC !== 'undefined') GuandanDMC.recordPass(seat);
    renderAll();
    if (seat === 0) hidePlayActionsImmediate();
    saveSession();
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
    // 收圈需「除当前最大牌持有者外其余在场者都过」。持有者若已出完(不在 remaining 里)，
    // 则需全部 remaining 家都过，否则会跳过最后一位应答者（漏掉其压/炸机会）。
    const needPass = remaining - (state.out.includes(bestSeat) ? 0 : 1);
    if (bestSeat >= 0 && state.trick.passes >= needPass && remaining >= 1) {
      // 本圈结束 → 清场，最大者（若已出完则其下一个在场者）领出
      let nextLeader = bestSeat;
      let jiefengTo = -1;
      if (state.out.includes(bestSeat)) {
        // 接风：终结者最后一手未被压过 → 由其对家(队友)领出。
        // 上下家(对手方)均未接牌时这条天然成立——bestSeat 还是 finisher。
        // 队友也已出完时回退到 nextAlive。
        const partner = (bestSeat + 2) % 4;
        if (!state.out.includes(partner)) {
          nextLeader = partner;
          jiefengTo = partner;
        } else {
          nextLeader = nextAlive(bestSeat);
        }
      }
      if (jiefengTo >= 0) showJiefengFx(bestSeat, jiefengTo);
      // 延迟一会儿再 clearTrick，让"第三家不出"那条 lastPlay 在画面上有时间
      // 被用户看到——不然 commitPass 一渲完，afterMove 立刻清空所有 play 区。
      state.busy = true;
      setTimeout(() => { state.busy = false; clearTrick(nextLeader); }, 800);
      return;
    }

    // 轮到下一个在场玩家
    let nx = nextAlive(seat);
    state.turn = nx;
    state.trick.lead = nx;
    // 又轮到这家出牌了 → 把他/她上一手的残留清掉，不论那是"不出"还是出过的牌。
    // 旧牌已经过期，留在桌上会让人误以为"他又出了一样的牌却被跳过"，体验很怪。
    // 注意：本圈里能轮回到某家，必有人在中途翻新过最大（否则早就满弃收圈了），
    // 所以此处被清掉的一定不是当前最大那一手——当前最大属于另一家、照常保留展示。
    state.lastPlay[nx] = null;
    renderAll();
    saveSession();
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
    saveSession();
    if (leader === 0 && !state.out.includes(0)) { updateActions(); armTurnClock(); }
    else scheduleAI();
  }

  // 本局是否结束：当一支队伍两名成员都已出完 → 立即结束（不必打到最后一人）
  // 触发结算前停 1s，让用户看清最后一手 + 结果，不要直接弹结算面板
  const END_ROUND_DELAY_MS = 1000;
  function checkRoundOver() {
    if (state.out.length >= 3) {
      // 第 3 名确定后第 4 名自动确定
      if (state.out.length === 3) {
        const last = [0,1,2,3].find(s => !state.out.includes(s));
        state.out.push(last);
      }
      state.busy = true;
      setTimeout(endRound, END_ROUND_DELAY_MS);
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
      state.busy = true;
      setTimeout(endRound, END_ROUND_DELAY_MS);
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
    // 判定整局胜负：过 A 须「一名头游 + 队友非末游」(名次 1+2 或 1+3，advance≥2)；
    // 1+4（头游+末游）在 A 不算过，继续打 A（不退级、进贡照常）。
    const matchWon = wasAtA && advance >= 2;
    if (!matchWon) state.levels[winTeam] = newIdx;

    // 赢方成为下一局“主级方”
    state.actingTeam = winTeam;
    state.lastRanking = ranking;

    // 单局结算分：开局倍数 × 炸弹累乘 × 升级数。赢方得正，输方得负。
    // 「单局积分上限」(matchOptions.scoreCap, 0=不限) 给一局输赢分数封顶；升级数不受影响。
    const openMult = state.openMult || 1;
    const bombMult = state.bombMult || 1;
    const rawScore = openMult * bombMult * advance;
    const cap = state.matchOptions.scoreCap | 0;
    const capped = cap > 0 && rawScore > cap;
    const roundScore = capped ? cap : rawScore;
    state.lastRoundScore = (winTeam === 0) ? roundScore : -roundScore;
    state.lastRoundDetail = { openMult, bombMult, advance, winTeam, beforeIdx, newIdx, matchWon, cap: capped ? cap : 0 };
    // 累计到当前难度总分
    const stForScore = state.stats[state.aiLevel];
    if (stForScore) stForScore.totalScore = (stForScore.totalScore | 0) + state.lastRoundScore;
    persist();
    refreshScoreChip();   // 立即闪一下角标新分；不依赖下一次 renderAll

    showRoundOverlay(ranking, winTeam, advance, beforeIdx, newIdx, matchWon);
    saveSession();
  }

  // 座位 avatar 表（跟桌面 .gd-avatar 里的 emoji 一致）
  const SEAT_AVATARS = ['😎', '🤖', '🤖', '🤖'];
  const POS_NAMES = ['头游', '二游', '三游', '末游'];

  // 给一个 .gd-result-players 容器渲染 [seat0, seat2] 或 [seat1, seat3] 的玩家卡
  function renderResultTeamPlayers(container, seats, seatToRank) {
    if (!container) return;
    container.innerHTML = '';
    // 先走(名次靠前)在左 → 按名次升序排两列
    const ordered = seats.slice().sort((a, b) => seatToRank[a] - seatToRank[b]);
    for (const s of ordered) {
      const rank = seatToRank[s];
      const col = document.createElement('div');
      col.className = 'gd-result-player';
      col.innerHTML =
        '<span class="gd-result-avatar">' + SEAT_AVATARS[s] + '</span>' +
        '<span class="gd-result-name">' + seatName(s) + '</span>' +
        '<span class="gd-result-rank" data-rank="' + rank + '">' + POS_NAMES[rank - 1] + '</span>';
      container.appendChild(col);
    }
  }

  // 单队级牌翻牌（放本栏两列玩家下方）；胜方 before→after 翻面、败方静态；lc-win/lc-lose 由 CSS 描边
  function renderTeamFlip(slot, before, after, isWinner) {
    if (!slot) return;
    slot.innerHTML = '';
    slot.classList.toggle('lc-win', isWinner);
    slot.classList.toggle('lc-lose', !isWinner);
    const flip = document.createElement('div');
    flip.className = 'gd-level-flip';
    const inner = document.createElement('div');
    inner.className = 'gd-level-flip-inner';
    if (isWinner && before !== after) {
      const front = buildLevelCardEl(before); front.classList.add('lc-front');
      const back = buildLevelCardEl(after); back.classList.add('lc-back');
      inner.appendChild(front); inner.appendChild(back);
      flip.appendChild(inner); slot.appendChild(flip);
      setTimeout(() => flip.classList.add('flipped'), 600);
    } else {
      inner.appendChild(buildLevelCardEl(before));
      flip.appendChild(inner); slot.appendChild(flip);
    }
  }

  function buildLevelCardEl(rankLabel) {
    // 结算翻牌：级牌(红桃)，四象限版型；用普通牌色（不加级牌深色高亮，输赢由蒙版区分）
    const el = document.createElement('span');
    el.className = 'gd-card size-full suit-red';
    const p = SUITP[1];
    el.style.setProperty('--gd-tr', p.tr);
    el.style.setProperty('--gd-bl', p.bl);
    el.style.setProperty('--gd-big', p.big);
    el.style.setProperty('--gd-br', p.br);
    el.style.setProperty('--gd-bb', p.bb);
    el.style.setProperty('--gd-op', p.op);
    el.style.setProperty('--gd-try', SUIT_TRY_ALL + (p.trY || 0));
    el.style.setProperty('--gd-bly', SUIT_BLY_ALL + (p.blY || 0));
    const sv = suitSVG(1);
    el.innerHTML =
      '<span class="q q-tl">' + rankLabel + '</span>' +
      '<span class="q q-tr">' + sv + '</span>' +
      '<span class="q q-bl">' + sv + '</span>' +
      '<span class="bigsuit">' + sv + '</span>';
    return el;
  }

  function renderLevelCards(container, youLabel, oppLabel, winTeam, beforeLabel, afterLabel) {
    if (!container) return;
    container.innerHTML = '';
    function makeTeam(label, lvBefore, lvAfter, isWinner) {
      const team = document.createElement('div');
      team.className = 'gd-lc-team ' + (isWinner ? 'lc-win' : 'lc-lose');
      const lbl = document.createElement('span');
      lbl.className = 'gd-lc-label';
      lbl.textContent = label;
      team.appendChild(lbl);
      if (isWinner && lvBefore !== lvAfter) {
        const flip = document.createElement('div');
        flip.className = 'gd-level-flip';
        const inner = document.createElement('div');
        inner.className = 'gd-level-flip-inner';
        const front = buildLevelCardEl(lvBefore);
        front.classList.add('lc-front');
        const back = buildLevelCardEl(lvAfter);
        back.classList.add('lc-back');
        inner.appendChild(front); inner.appendChild(back);
        flip.appendChild(inner);
        team.appendChild(flip);
        setTimeout(() => flip.classList.add('flipped'), 600);
      } else {
        const flip = document.createElement('div');
        flip.className = 'gd-level-flip';
        const inner = document.createElement('div');
        inner.className = 'gd-level-flip-inner';
        inner.appendChild(buildLevelCardEl(lvBefore));
        flip.appendChild(inner);
        team.appendChild(flip);
      }
      return team;
    }
    const youBefore = winTeam === 0 ? beforeLabel : youLabel;
    const youAfter  = winTeam === 0 ? afterLabel  : youLabel;
    const oppBefore = winTeam === 1 ? beforeLabel : oppLabel;
    const oppAfter  = winTeam === 1 ? afterLabel  : oppLabel;
    container.appendChild(makeTeam('你方', youBefore, youAfter, winTeam === 0));
    container.appendChild(makeTeam('对方', oppBefore, oppAfter, winTeam === 1));
  }

  function showRoundOverlay(ranking, winTeam, advance, beforeIdx, newIdx, matchWon) {
    const seatToRank = {};
    for (let i = 0; i < 4; i++) seatToRank[ranking[i]] = i + 1;

    // 大标题：整局结束才显示"胜利/失败"；每小局不写"我方头游"标题
    const youWon = winTeam === 0;
    if (matchWon) {
      els.roundTitle.textContent = youWon ? '胜利' : '失败';
      els.roundTitle.style.display = '';
      els.roundTitle.classList.toggle('win', youWon);
      els.roundTitle.classList.toggle('lose', !youWon);
    } else {
      els.roundTitle.style.display = 'none';
    }

    // 队伍面板高亮
    els.roundTeamYou.classList.toggle('winning', winTeam === 0);
    els.roundTeamOpp.classList.toggle('winning', winTeam === 1);

    // 级牌：胜方 before → after，败方维持当前
    const youLvCurr = LEVEL_SEQ[state.levels[0]];
    const oppLvCurr = LEVEL_SEQ[state.levels[1]];
    const winnerBefore = LEVEL_SEQ[beforeIdx];
    const winnerAfter = LEVEL_SEQ[newIdx];

    // 玩家卡：0+2 = 我方；1+3 = 对方（每栏两列：先走/名次靠前在左）
    renderResultTeamPlayers(els.roundPlayersYou, [0, 2], seatToRank);
    renderResultTeamPlayers(els.roundPlayersOpp, [1, 3], seatToRank);

    // 各栏下方：本队级牌翻牌（胜方 before→after 翻面，败方静态）
    renderTeamFlip(els.roundFlipYou, winTeam === 0 ? winnerBefore : youLvCurr, winTeam === 0 ? winnerAfter : youLvCurr, winTeam === 0);
    renderTeamFlip(els.roundFlipOpp, winTeam === 1 ? winnerBefore : oppLvCurr, winTeam === 1 ? winnerAfter : oppLvCurr, winTeam === 1);

    // 分数展示
    if (els.roundScore) {
      const score = state.lastRoundScore;
      const detail = state.lastRoundDetail;
      if (score == null || !detail) {
        els.roundScore.innerHTML = '';
      } else {
        const cls = score >= 0 ? 'win' : 'lose';
        const sign = score > 0 ? '+' : '';
        const total = (state.stats[state.aiLevel] || { totalScore: 0 }).totalScore | 0;
        els.roundScore.innerHTML =
          '<span class="delta ' + cls + '">' + sign + score + ' 分</span>' +
          '<span class="breakdown">开局 ×' + detail.openMult +
          ' · 炸弹 ×' + detail.bombMult +
          ' · 升 ' + detail.advance + ' 级' +
          (detail.cap ? ' · 封顶 ' + detail.cap : '') +
          ' · 累计 ' + (total >= 0 ? '+' : '') + total + ' 分</span>';
      }
    }

    els.roundNext.textContent = matchWon ? '查看战报 ▶' : '继续 ▶';
    stopTurnClock();
    els.roundOverlay.classList.add('open');
    els.roundNext.onclick = () => {
      els.roundOverlay.classList.remove('open');
      if (isNetworked()) {
        // 服务器权威：发 next_round → 服务器开下一局 → 轮询拉回新状态
        nextRoundNet();
      } else if (matchWon) {
        endMatch(winTeam);
      } else {
        startRound(ranking);
      }
    };
    if (matchWon) state._pendingMatchWin = winTeam;
  }

  function endMatch(winTeam) {
    state.phase = PHASE.MATCH_END;
    // 整局结束 → 关托管，重置超时计数（下一局从头来）
    state.autopilot = false;
    state._consecutiveTimeouts = 0;
    refreshAutopilotBtn();
    const youWon = winTeam === 0;
    // 大标题：胜利 / 失败
    els.matchTitle.textContent = youWon ? '胜利' : '失败';
    els.matchTitle.classList.toggle('win', youWon);
    els.matchTitle.classList.toggle('lose', !youWon);
    // 队伍面板高亮
    els.matchTeamYou.classList.toggle('winning', youWon);
    els.matchTeamOpp.classList.toggle('winning', !youWon);
    // 级牌：胜方在 A、败方维持当前
    els.matchLevelYou.innerHTML = '级 <strong>' + LEVEL_SEQ[state.levels[0]] + '</strong>' + (youWon ? '（打过）' : '');
    els.matchLevelOpp.innerHTML = '级 <strong>' + LEVEL_SEQ[state.levels[1]] + '</strong>' + (youWon ? '' : '（打过）');
    // 最后一局名次
    const r = state.lastRanking || [];
    const seatToRank = {};
    for (let i = 0; i < 4; i++) seatToRank[r[i]] = i + 1;
    renderResultTeamPlayers(els.matchPlayersYou, [0, 2], seatToRank);
    renderResultTeamPlayers(els.matchPlayersOpp, [1, 3], seatToRank);
    // 级牌翻牌：胜方从当前级翻到 A（打过），败方维持当前
    const youLv = LEVEL_SEQ[state.levels[0]];
    const oppLv = LEVEL_SEQ[state.levels[1]];
    const detail = state.lastRoundDetail;
    const bLabel = detail ? LEVEL_SEQ[detail.beforeIdx] : youLv;
    const aLabel = detail ? LEVEL_SEQ[detail.newIdx] : youLv;
    renderLevelCards(els.matchLevelCards, youLv, oppLv, winTeam, bLabel, aLabel);
    // 战绩
    const st = state.stats[state.aiLevel];
    if (youWon) st.w++; else st.l++;
    state.stats.bestLevel = Math.max(state.stats.bestLevel || 0, state.levels[0]);
    persist();
    refreshHs();
    stopTurnClock();
    // 战报分数展示
    if (els.matchScore) {
      const total = (st.totalScore | 0);
      const sign = total >= 0 ? '+' : '';
      const lastDelta = state.lastRoundScore;
      const lastDetail = state.lastRoundDetail;
      let lastLine = '';
      if (lastDelta != null && lastDetail) {
        const ls = lastDelta > 0 ? '+' : '';
        lastLine = '<span class="breakdown">本局 ' + ls + lastDelta + ' 分（开局 ×' + lastDetail.openMult +
          ' · 炸弹 ×' + lastDetail.bombMult + ' · 升 ' + lastDetail.advance + ' 级）</span>';
      }
      els.matchScore.innerHTML =
        '<span class="delta ' + (total >= 0 ? 'win' : 'lose') + '">累计 ' + sign + total + ' 分</span>' +
        lastLine;
    }
    // 整副结束 → 清掉 session
    clearSession();
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
  // 出牌时间（毫秒）：来自本盘冻结的 matchOptions.turnSec；0 = 不限（不挂时钟、不自动出）
  function turnMs() {
    const s = state.matchOptions.turnSec | 0;
    return s > 0 ? s * 1000 : 0;
  }
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
    if (state._doublingActive) return;     // 加倍阶段已挂 5s 时钟，别覆盖
    if (state.out.includes(state.turn)) { stopTurnClock(); return; }
    const seat = state.turn;
    if (seat === 0) {
      // 玩家新轮次开始 → 重置提示循环索引，第一次按"提示"永远是最优一手
      state._hintIdx = null;
      if (state.autopilot) {
        // 托管模式：不挂时钟，~450ms 后直接自动出牌
        stopTurnClock();
        setTimeout(() => {
          if (state.autopilot && state.phase === PHASE.PLAYING && state.turn === 0 && !state.busy) {
            doAutoPlayPick();
          }
        }, 450);
        return;
      }
      const tm = turnMs();
      if (tm === 0) { stopTurnClock(); return; }   // 不限：不挂时钟、不自动出
      startTurnClock(0, autoPlayOnTimeout, tm);
    } else {
      const tm = turnMs();
      if (tm === 0) { stopTurnClock(); return; }   // 不限：AI 也不显示时钟
      startTurnClock(seat, null, tm);
    }
  }
  // 玩家被动 / 托管的"自动出"共享同一份决策；isTimeout 控制是否计入超时计数
  // 一手"破坏多张组"的代价：每用 1 张 rank R 的牌而手里还残余 R 的同伴 →
  // 代价 = 残余数（残余越多说明本来能组成更大组合，现在被拆得越厉害）。
  // 王 / wild 视为无代价（它们独立）。
  function moveBreakCost(move, hand, level) {
    const used = new Map();
    for (const c of move.cards) {
      if (isJoker(c) || isWild(c, level)) continue;
      const r = cardRankIdx(c);
      used.set(r, (used.get(r) || 0) + 1);
    }
    const handCnt = new Map();
    for (const c of hand) {
      if (isJoker(c) || isWild(c, level)) continue;
      const r = cardRankIdx(c);
      handCnt.set(r, (handCnt.get(r) || 0) + 1);
    }
    let cost = 0;
    for (const [r, u] of used) {
      const total = handCnt.get(r) || 0;
      const remain = total - u;
      // 还残余 1+ 同 rank → 本来这一手可以一起出（更长/更整），现在拆出来
      if (remain > 0) cost += remain;
    }
    return cost;
  }

  // 把 genMoves 出来的候选按"语义最优"排序：
  //   领出（prev=null）→ 优先大组合（一次出更多牌）+ 不拆多张组，同长比小点数
  //   跟牌（prev!=null）→ 优先短组合 + 不拆多张组（用散牌反压） + 小 key
  // 炸弹永远放最后，保留到关键时刻才用。
  //
  // key 相同时（比如三带二里 triple 一样、pair 不同），按"使用的卡总权重"递增 →
  // 用小牌的 pair 优先（如 Q + 4 对 优于 Q + 10 对）。
  function moveTotalWeight(move, level) {
    let w = 0;
    for (const c of move.cards) w += singleWeight(c, level);
    return w;
  }
  function rankMoves(moves, prev, hand, level) {
    return moves.slice().sort((a, b) => {
      const ab = isBombType(a.combo.type) ? 1 : 0;
      const bb = isBombType(b.combo.type) ? 1 : 0;
      if (ab !== bb) return ab - bb;
      if (prev) {
        // 跟牌：短的优先
        if (a.cards.length !== b.cards.length) return a.cards.length - b.cards.length;
        if (hand) {
          const ca = moveBreakCost(a, hand, level);
          const cb = moveBreakCost(b, hand, level);
          if (ca !== cb) return ca - cb;
        }
        if (a.combo.key !== b.combo.key) return a.combo.key - b.combo.key;
        return moveTotalWeight(a, level) - moveTotalWeight(b, level);
      }
      // 领出：大组合优先
      if (a.cards.length !== b.cards.length) return b.cards.length - a.cards.length;
      if (hand) {
        const ca = moveBreakCost(a, hand, level);
        const cb = moveBreakCost(b, hand, level);
        if (ca !== cb) return ca - cb;
      }
      if (a.combo.key !== b.combo.key) return a.combo.key - b.combo.key;
      // key 相等时（三带二同 triple 不同 pair；钢板同 max-rank 等）→ 用小牌优先
      return moveTotalWeight(a, level) - moveTotalWeight(b, level);
    });
  }

  function doAutoPlayPick() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const level = currentLevelLabel();
    const trick = state.trick;
    const prev = (trick && trick.best != null && trick.bestSeat !== 0) ? trick.best : null;
    const leading = !prev;
    state.selected.clear();
    // 借用 AI 决策——领出走 decompose + orderLeadGroups（不会把对子拆成单张），
    // 跟牌按当前难度行为；与三家 AI 体验一致
    const decision = chooseAIMove(0, state.hands[0], prev, leading, level);
    if (!decision) {
      // 不出（仅跟牌时合法）
      if (prev) commitPass(0);
      return;
    }
    commitPlay(0, decision);
  }
  function autoPlayOnTimeout() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    // 累计 2 次超时 → 自动进入托管，直到用户关或整局结束
    state._consecutiveTimeouts = (state._consecutiveTimeouts || 0) + 1;
    if (!state.autopilot && state._consecutiveTimeouts >= 2) {
      state.autopilot = true;
      // 不弹提示：靠托管按钮持续橙色高亮(.on)表示已进入托管即可（用户不喜欢弹窗）
      refreshAutopilotBtn();
    }
    doAutoPlayPick();
  }
  function refreshAutopilotBtn() {
    if (!els.autopilotBtn) return;
    // 纯机器人图标，不再改文字；托管中靠 .on 的橙色高亮表示，点一下即切换。
    els.autopilotBtn.classList.toggle('on', !!state.autopilot);
    els.autopilotBtn.title = state.autopilot ? '正在托管中 · 点一下取消' : '托管：让 AI 替你打牌';
  }

  function scheduleAI() {
    if (isNetworked()) return;   // 联网模式：AI 在服务器跑，客户端只等轮询
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
    if (state._testMode) {
      // 测试模式：被压就过、轮到领出就打最小单张兜底，让玩家能反复领出各种牌型
      if (state.out.includes(seat)) { afterMove(seat); return; }
      const tr = state.trick;
      const leading = !(tr.best && tr.bestSeat !== seat);
      if (!leading) { commitPass(seat); return; }
      const th = state.hands[seat];
      if (!th.length) { afterMove(seat); return; }
      const tlv = currentLevelLabel();
      let sm = th[0], sw = singleWeight(th[0], tlv);
      for (const c of th) { const w = singleWeight(c, tlv); if (w < sw) { sw = w; sm = c; } }
      commitPlay(seat, classify([sm], tlv));
      return;
    }
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

  // ============================================================
  //  效用函数式决策（per-difficulty weights）
  //  V(state) ≈ HandEfficiency = Σ groupValue - handLenPenalty · 手牌张数
  //  每个候选 move 算 U(m) = ΔV - Cost + Bonus，argmax U(m) 决定出牌
  //  pass 也作为候选参与 argmax（仅跟牌时合法）
  //
  //  三档难度（easy/normal/hard）对应**不同的权重向量**——来自独立 ES self-play
  //  训练终点+早中段快照，按 tournament Elo 排出强弱后选定。差异化来自策略偏好
  //  （更/不愿意拆组、更/不愿意炸、更/不愿意 pass），不是噪声或硬编码降级，
  //  所以 easy AI 始终按其"较弱但连贯"的策略打，不会有同一局面突然下莫名其妙
  //  一手的"变笨"感。
  // ============================================================

  // 三档权重来自群体训练 + 锦标赛分级（K=8 ES runs × 4 gen × 16 pop × 50 matches
  // → 26 候选 round-robin → Elo 排名；2026-06-12 新大训练 run15_gen6 替代旧 hard（胜率 +6%））：
  //   hard   = run2_gen0 (Elo 1544, rank 1/26)  战术家：敢拆组、保炸、拼走完
  //   normal = run3_gen3 (Elo 1480, rank 16/26) 守成派：极不拆组、狠让队友
  //   hard   = coord-best  (Elo 1576, #1/62,  62.6% win)
  //   normal = run12_gen6  (Elo 1493, #31/62, 47.0% win)
  //   easy   = run9_gen0   (Elo 1385, #62/62, 30.8% win)
  // 62 候选 × 1891 对 × 20 局 tournament，2026-06-12
  const WEIGHTS_BY_DIFFICULTY = {
    hard: {
      passBase: -4.658, passPartnerWin: 13.685, passPartnerLow: 4,
      playFollowActive: 2.125, playFinish: 51,
      playFinishPartnerWin: 35, playPartnerWinPenalty: -19.305,
      playLeadLength: 0.35, playFollowLength: -0.12,
      breakMult: 1.316, wildCost: 7, jokerCost: 5,
      bombBase4: 6.8, bombPerExtra: 4,
      bombLeadMult: 1, bombLeadLateBonus: 0.6,
      bombFollowMult: 0.6, bombFollowOppLow: 1.3, bombFollowOppMed: 0.3,
      groupBombBase: 14, groupBombPerExtra: 8,
      handLenPenalty: 0.325, lookaheadDepth: 2,
    },
    // 普通 = 原困难档 coord-best (Elo 1575.8)：神经网络上线后整体台阶上移
    normal: {
      passBase: -4.658, passPartnerWin: 13.685, passPartnerLow: 4,
      playFollowActive: 2.125, playFinish: 51,
      playFinishPartnerWin: 35, playPartnerWinPenalty: -19.305,
      playLeadLength: 0.35, playFollowLength: -0.12,
      breakMult: 1.316, wildCost: 7, jokerCost: 5,
      bombBase4: 6.8, bombPerExtra: 4,
      bombLeadMult: 1, bombLeadLateBonus: 0.6,
      bombFollowMult: 0.6, bombFollowOppLow: 1.3, bombFollowOppMed: 0.3,
      groupBombBase: 14, groupBombPerExtra: 8,
      handLenPenalty: 0.325, lookaheadDepth: 2,
    },
    // 新手 = 原普通档 run12_gen6 (Elo 1493)
    easy: {
      passBase: -4.135, passPartnerWin: 11.089, passPartnerLow: 4,
      playFollowActive: 2.255, playFinish: 27.101,
      playFinishPartnerWin: 35, playPartnerWinPenalty: -23.474,
      playLeadLength: 0.35, playFollowLength: -0.12,
      breakMult: 1.285, wildCost: 7, jokerCost: 5,
      bombBase4: 8.420, bombPerExtra: 4,
      bombLeadMult: 1, bombLeadLateBonus: 0.6,
      bombFollowMult: 0.6, bombFollowOppLow: 1.3, bombFollowOppMed: 0.3,
      groupBombBase: 14, groupBombPerExtra: 8,
      handLenPenalty: 0.319, lookaheadDepth: 2,
    },
  };
  function aiWeights() {
    return WEIGHTS_BY_DIFFICULTY[state.aiLevel] || WEIGHTS_BY_DIFFICULTY.normal;
  }

  function groupValue(g, level, w) {
    if (!g || !g.cards || !g.cards.length) return 0;
    const len = g.cards.length;
    const maxRankW = Math.max(...g.cards.map(c => singleWeight(c, level)));
    switch (g.type) {
      case T.JOKER_BOMB: return 60;
      case T.STR_FLUSH:  return 35;
      case T.BOMB:       return w.groupBombBase + (len - 4) * w.groupBombPerExtra + maxRankW * 0.05;
      case T.TRIPLE_STR: return 12;
      case T.PAIR_STR:   return 10;
      case T.STRAIGHT:   return 8;
      case T.TRIPLE_PAIR:return 7;
      case T.TRIPLE:     return 4;
      case T.PAIR:       return 3;
      case T.SINGLE:
        if (maxRankW >= 16) return 4;
        if (maxRankW >= 15) return 2.5;
        if (maxRankW >= 14) return 1;
        return -0.5;
    }
    return 0;
  }
  function evaluateHand(hand, level, w) {
    if (!hand || !hand.length) return 100;
    const groups = decompose(hand, level);
    let v = 0;
    for (const g of groups) v += groupValue(g, level, w);
    v -= w.handLenPenalty * hand.length;
    return v;
  }

  // 构造决策上下文：partnerWinning / 对手最小手牌 / 队友手牌等
  function moveContext(seat) {
    const partner = (seat + 2) % 4;
    const myTeam = TEAM(seat);
    const oppSeats = [0,1,2,3].filter(s => TEAM(s) !== myTeam && !state.out.includes(s));
    const opponentMin = oppSeats.length
      ? Math.min(...oppSeats.map(s => state.hands[s].length))
      : 99;
    return {
      partner,
      partnerWinning: state.trick && state.trick.bestSeat === partner && !state.out.includes(partner),
      partnerCount: state.out.includes(partner) ? 0 : state.hands[partner].length,
      partnerOut: state.out.includes(partner),
      opponentMin,
      myCount: state.hands[seat].length,
    };
  }

  // 一手 move 的效用。move 可以是 {combo, cards}（出牌）或 {pass: true}
  // w = 当前难度的权重对象（来自 WEIGHTS_BY_DIFFICULTY[state.aiLevel]）
  function moveUtility(move, seat, hand, prev, leading, level, ctx, w) {
    if (move.pass) {
      if (leading) return -Infinity;
      let u = w.passBase;
      if (ctx.partnerWinning) u += w.passPartnerWin;
      if (ctx.partnerWinning && ctx.partnerCount <= 3 && !ctx.partnerOut) u += w.passPartnerLow;
      return u;
    }
    const combo = move.combo;
    const isBomb = isBombType(combo.type);
    const cardSet = new Set(move.cards);
    const handAfter = hand.filter(c => !cardSet.has(c));
    const before = evaluateHand(hand, level, w);
    const after = evaluateHand(handAfter, level, w);
    let u = after - before;
    if (handAfter.length === 0) u += w.playFinish;

    if (leading) {
      u += move.cards.length * w.playLeadLength;
    } else {
      u += w.playFollowActive;
      u += move.cards.length * w.playFollowLength;
    }

    u -= moveBreakCost(move, hand, level) * w.breakMult;
    const wildUsed = move.cards.filter(c => isWild(c, level)).length;
    u -= wildUsed * w.wildCost;
    const jokerUsed = move.cards.filter(isJoker).length;
    u -= jokerUsed * w.jokerCost;

    if (isBomb) {
      const bombBase = (combo.type === T.JOKER_BOMB) ? 30
                     : (combo.type === T.STR_FLUSH) ? 16
                     : (w.bombBase4 + (combo.len - 4) * w.bombPerExtra);
      if (leading) {
        u -= bombBase * w.bombLeadMult;
        if (hand.length <= 5) u += bombBase * w.bombLeadLateBonus;
      } else {
        u -= bombBase * w.bombFollowMult;
        if (ctx.opponentMin <= 3) u += bombBase * w.bombFollowOppLow;
        else if (ctx.opponentMin <= 5) u += bombBase * w.bombFollowOppMed;
      }
    }

    if (!leading && ctx.partnerWinning) {
      if (handAfter.length === 0) u += w.playFinishPartnerWin;
      else u += w.playPartnerWinPenalty;
    }
    // 注意：之前 easy/normal 难度通过加噪声（Math.random）人为降级 → AI "变笨"。
    // 现在三档难度差异完全来自 w 权重组本身的不同（来自 tournament 选档），
    // 所以这里不再注入任何噪声，每档 AI 始终按其策略偏好"想清楚再出"。
    return u;
  }

  // 选牌核心：argmax over candidates ∪ {pass}
  //
  // 所有三档难度都用 lookahead depth=2（差异完全来自 WEIGHTS_BY_DIFFICULTY 里的
  // 权重组不同，不再用深度或噪声制造区别）。depth=2 在 self-play 模拟里相对
  // greedy 100% 胜，相对 depth=1 +9%，depth=3 不显著 → 甜蜜点。
  const LOOKAHEAD_DEPTH = 2;
  // DanZero DMC 神经网络（高手档）。进游戏即后台预下载；带进度；返回 Promise（永不 reject，
  // 失败置 _dmcState=3）。下完才让高手上桌，期间不用「假高手」。
  let _dmcState = 0, _dmcProgress = 0, _dmcPromise = null, _dmcProgressCb = null; // 0 idle,1 loading,2 ready,3 failed
  function ensureDMC(onProgress) {
    if (onProgress) _dmcProgressCb = onProgress;
    if (typeof GuandanDMC === 'undefined') { _dmcState = 3; return Promise.resolve(); }
    if (GuandanDMC.ready()) { _dmcState = 2; _dmcProgress = 1; return Promise.resolve(); }
    if (_dmcPromise) return _dmcPromise;
    _dmcState = 1; _dmcProgress = 0;
    _dmcPromise = fetch('/assets/js/games/guandan-dmc.bin?v=20260616int8')
      .then(r => {
        if (!r.ok) throw new Error('http ' + r.status);
        const total = +r.headers.get('content-length') || 1359880;
        if (!r.body || !r.body.getReader) return r.arrayBuffer();
        const reader = r.body.getReader(); let got = 0; const chunks = [];
        return (function pump() {
          return reader.read().then(({ done, value }) => {
            if (done) { const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out.buffer; }
            chunks.push(value); got += value.length; _dmcProgress = Math.min(0.999, got / total);
            if (_dmcProgressCb) { try { _dmcProgressCb(_dmcProgress); } catch (e) {} }
            return pump();
          });
        })();
      })
      .then(buf => { GuandanDMC.loadWeights(buf); _dmcState = 2; _dmcProgress = 1; if (_dmcProgressCb) { try { _dmcProgressCb(1); } catch (e) {} } updateBuildBadge(); })
      .catch(e => { console.warn('[guandan] DMC weights load failed:', e); _dmcState = 3; _dmcPromise = null; updateBuildBadge(); });
    return _dmcPromise;
  }
  function chooseAIMove(seat, hand, prev, leading, level) {
    // 高手档用 DanZero 神经网络；网络只看公开信息（自己手牌+已出牌+张数+级牌）。
    if (state.aiLevel === 'hard' && typeof GuandanDMC !== 'undefined') {
      ensureDMC();
      if (GuandanDMC.ready()) {
        const moves = genMoves(hand, prev, level);
        const selfLv = LEVEL_SEQ[state.levels[seat % 2]];
        const oppoLv = LEVEL_SEQ[state.levels[1 - (seat % 2)]];
        const pick = GuandanDMC.choose(seat, state.hands, state.out, level, selfLv, oppoLv, moves, leading);
        if (!(leading && pick == null)) return pick;   // pick=combo 或 null(pass)；只拦「领出却想pass」
      }
    }
    const w = aiWeights();
    return chooseAIMoveLookahead(seat, hand, prev, leading, level, w, LOOKAHEAD_DEPTH);
  }
  // 版本 / AI 引擎 徽标（左下角，半透明）：刷新即可确认加载的版本 + 高手档用的是神经网络还是启发式
  function updateBuildBadge() {
    if (typeof document === 'undefined' || !document.body) return;
    let el = document.getElementById('gdBuildBadge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gdBuildBadge';
      el.style.cssText = 'position:fixed;left:7px;bottom:6px;z-index:2147483646;font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,0.82);background:rgba(20,20,30,0.62);padding:3px 8px;border-radius:8px;pointer-events:none;letter-spacing:.3px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);';
      document.body.appendChild(el);
    }
    let ai = '';
    const lv = state && state.aiLevel;
    if (lv === 'hard') ai = ' · 高手 ' + (_dmcState === 2 ? 'DanZero🧠' : _dmcState === 1 ? '载入中…' : _dmcState === 3 ? '启发式·载入失败' : '启发式');
    else if (lv) ai = ' · ' + (lv === 'normal' ? '普通' : '新手') + ' 启发式';
    el.textContent = 'v' + GD_BUILD + ai;
  }
  function chooseAIMoveGreedy(seat, hand, prev, leading, level, w) {
    const ctx = moveContext(seat);
    const moves = genMoves(hand, prev, level);
    if (leading && !moves.length) {
      const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
      return classify([c], level);
    }
    let bestU = -Infinity, bestMove = null;
    for (const m of moves) {
      const u = moveUtility(m, seat, hand, prev, leading, level, ctx, w);
      if (u > bestU) { bestU = u; bestMove = m; }
    }
    if (!leading) {
      const passU = moveUtility({ pass: true }, seat, hand, prev, leading, level, ctx, w);
      if (passU > bestU) { bestU = passU; bestMove = null; }
    }
    return bestMove ? bestMove.combo : null;
  }

  // ---- 1-step lookahead ----
  // 每个候选 move 模拟 depth 个 ply（含对手回应），用 teamValueAt 评估最终状态，argmax
  function cloneStateMinLA() {
    return {
      hands: state.hands.map(h => h.slice()),
      out: state.out.slice(),
      trick: state.trick ? { lead: state.trick.lead, best: state.trick.best, bestSeat: state.trick.bestSeat, passes: state.trick.passes } : null,
      lastPlay: state.lastPlay.slice(),
    };
  }
  function applyDecisionLA(s, seat, decision) {
    if (!decision) {
      s.lastPlay[seat] = 'pass';
      s.trick.passes++;
      return;
    }
    for (const c of decision.cards) {
      const i = s.hands[seat].indexOf(c);
      if (i >= 0) s.hands[seat].splice(i, 1);
    }
    s.lastPlay[seat] = decision;
    s.trick.best = decision;
    s.trick.bestSeat = seat;
    s.trick.passes = 0;
    if (s.hands[seat].length === 0 && !s.out.includes(seat)) s.out.push(seat);
  }
  function didRoundEndLA(s) {
    if (s.out.length >= 3) return true;
    const t0 = s.out.filter(x => x % 2 === 0).length;
    const t1 = s.out.filter(x => x % 2 === 1).length;
    return t0 === 2 || t1 === 2;
  }
  function nextSeatLA(s, seat) {
    const alive = [0,1,2,3].filter(x => !s.out.includes(x));
    if (s.trick.bestSeat >= 0 && s.trick.passes >= alive.length - 1 && alive.length >= 1) {
      let next = s.trick.bestSeat;
      if (s.out.includes(next)) {
        const partner = (next + 2) % 4;
        if (!s.out.includes(partner)) next = partner;
        else {
          let x = next;
          for (let i = 0; i < 4; i++) {
            x = (x + 1) % 4;
            if (!s.out.includes(x)) { next = x; break; }
          }
        }
      }
      return { seat: next, trickReset: true };
    }
    let x = seat;
    for (let i = 0; i < 4; i++) {
      x = (x + 1) % 4;
      if (!s.out.includes(x)) return { seat: x, trickReset: false };
    }
    return { seat, trickReset: false };
  }
  // 终值 = 我方进度 - 对方进度。关键：不能只用 eff 差（AI 会拼命留牌）
  function teamValueAtLA(s, level, myTeam, w) {
    let myCnt = 0, oppCnt = 0, myEff = 0, oppEff = 0;
    for (let x = 0; x < 4; x++) {
      const isMy = x % 2 === myTeam;
      if (s.out.includes(x)) {
        if (isMy) myEff += 50; else oppEff += 50;
      } else {
        const eff = evaluateHand(s.hands[x], level, w);
        if (isMy) { myCnt += s.hands[x].length; myEff += eff; }
        else { oppCnt += s.hands[x].length; oppEff += eff; }
      }
    }
    return 1.5 * (oppCnt - myCnt) + 0.2 * (myEff - oppEff);
  }
  // 模拟某座对决策 decision（null=pass）应用后再走 depth 步 ply，返回终值
  function rolloutValue(seat, decision, level, depth, myTeam, w) {
    const s = cloneStateMinLA();
    applyDecisionLA(s, seat, decision);
    if (didRoundEndLA(s)) return teamValueAtLA(s, level, myTeam, w);
    let curSeat = seat;
    for (let p = 0; p < depth; p++) {
      const { seat: nextSeat, trickReset } = nextSeatLA(s, curSeat);
      if (trickReset) {
        s.lastPlay = [null, null, null, null];
        s.trick = { lead: nextSeat, best: null, bestSeat: -1, passes: 0 };
      }
      curSeat = nextSeat;
      const prev2 = (s.trick.best && s.trick.bestSeat !== curSeat) ? s.trick.best : null;
      const leading2 = !prev2;
      const dec = lookaheadGreedyDecide(curSeat, s.hands[curSeat], prev2, leading2, level, s, w);
      applyDecisionLA(s, curSeat, dec);
      if (didRoundEndLA(s)) break;
    }
    return teamValueAtLA(s, level, myTeam, w);
  }
  // rollout 内部 greedy 决策——用 same w（即同一档难度的权重）
  function lookaheadGreedyDecide(seat, hand, prev, leading, level, simState, w) {
    const partner = (seat + 2) % 4;
    const myTeam = seat % 2;
    const oppSeats = [0,1,2,3].filter(s => (s % 2) !== myTeam && !simState.out.includes(s));
    const opponentMin = oppSeats.length ? Math.min(...oppSeats.map(s => simState.hands[s].length)) : 99;
    const ctx = {
      partner,
      partnerWinning: simState.trick && simState.trick.bestSeat === partner && !simState.out.includes(partner),
      partnerCount: simState.out.includes(partner) ? 0 : simState.hands[partner].length,
      partnerOut: simState.out.includes(partner),
      opponentMin,
      myCount: simState.hands[seat].length,
    };
    const moves = genMoves(hand, prev, level);
    if (leading && !moves.length) {
      const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
      return classify([c], level);
    }
    let bestU = -Infinity, bestMove = null;
    for (const m of moves) {
      const u = moveUtility(m, seat, hand, prev, leading, level, ctx, w);
      if (u > bestU) { bestU = u; bestMove = m; }
    }
    if (!leading) {
      const passU = moveUtility({ pass: true }, seat, hand, prev, leading, level, ctx, w);
      if (passU > bestU) { bestU = passU; bestMove = null; }
    }
    return bestMove ? bestMove.combo : null;
  }
  function chooseAIMoveLookahead(seat, hand, prev, leading, level, w, depth) {
    const myTeam = seat % 2;
    const ctx = moveContext(seat);
    const moves = genMoves(hand, prev, level);
    if (leading && !moves.length) {
      const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
      return classify([c], level);
    }
    let bestBlend = -Infinity, bestMove = null;
    for (const m of moves) {
      const lookV = rolloutValue(seat, m, level, depth, myTeam, w);
      const greedyU = moveUtility(m, seat, hand, prev, leading, level, ctx, w);
      const blend = lookV + 0.35 * greedyU;
      if (blend > bestBlend) { bestBlend = blend; bestMove = m; }
    }
    if (!leading) {
      const lookV = rolloutValue(seat, null, level, depth, myTeam, w);
      const passU = moveUtility({ pass: true }, seat, hand, prev, leading, level, ctx, w);
      const blend = lookV + 0.35 * passU;
      if (blend > bestBlend) { bestBlend = blend; bestMove = null; }
    }
    return bestMove ? bestMove.combo : null;
  }

  // 领出时给”组”排序。新策略（按用户反馈）：normal/hard 优先打大组合（一次出
  // 更多牌、领出更高效），同样大小再挑点数小的；easy 保留旧逻辑（最小先出）。
  // 炸弹一律留到跟牌或必要时再出。
  function orderLeadGroups(groups, level, lvl) {
    const arr = groups.filter(g => !isBombType(g.type));
    arr.sort((a, b) => {
      const wa = Math.min(...a.cards.map(c => singleWeight(c, level)));
      const wb = Math.min(...b.cards.map(c => singleWeight(c, level)));
      if (lvl === 'easy') return wa - wb;
      // normal/hard：先看 len（牌数越多越优先 → 一次性下更多牌）
      if (a.cards.length !== b.cards.length) return b.cards.length - a.cards.length;
      // 同长 → 小点数先（用掉小牌、留大牌做尾盘）
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
  // 用户主动点 不出/出牌 后立即藏掉这一排按钮，给即时反馈；其后 renderAll
  // 也会一致 hide=true。如果出牌失败（toast 提示）会在下一个 renderAll
  // 恢复显示。
  function hidePlayActionsImmediate() {
    els.playBtn.hidden = true;
    els.passBtn.hidden = true;
    els.hintBtn.hidden = true;
    if (els.dblNoBtn) els.dblNoBtn.hidden = true;
    if (els.dblYesBtn) els.dblYesBtn.hidden = true;
    if (els.selfClock) els.selfClock.hidden = true;
  }

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
    state._consecutiveTimeouts = 0;   // 主动出牌 → 清掉超时计数
    stopTurnClock();
    hidePlayActionsImmediate();
    commitPlay(0, cb);
  }

  function playerPass() {
    if (state.phase !== PHASE.PLAYING || state.turn !== 0 || state.busy) return;
    const trick = state.trick;
    if (!trick.best || trick.bestSeat === 0) { toast('你领出，必须出牌'); return; }
    state.selected.clear();
    state._consecutiveTimeouts = 0;   // 主动不出 → 同理清计数
    stopTurnClock();
    hidePlayActionsImmediate();
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
    // 提示循环：每次给下一个候选。语义最优排序（领出大组合优先，跟牌最便宜反压，
    // 同长里都优先选"不拆多张组"的散牌）
    moves = rankMoves(moves, prev, state.hands[0], level);
    // 玩家已经手动摞起来的牌（customGroups）表达了"我想一起出"的意愿。
    // 把"会拆已摞组"的候选稳定 sink 到列表末尾——前几次点提示先看不动摞的方案，
    // 实在没得选时再考虑拆。stable sort：同 break 数内沿用原 rankMoves 顺序。
    const grouped = new Set();
    if (Array.isArray(state.customGroups)) {
      for (const g of state.customGroups) {
        if (!g || !Array.isArray(g.cards)) continue;
        for (const c of g.cards) grouped.add(c);
      }
    }
    if (grouped.size) {
      moves = moves
        .map((m, i) => ({ m, i, brk: m.cards.reduce((n, c) => n + (grouped.has(c) ? 1 : 0), 0) }))
        .sort((a, b) => (a.brk - b.brk) || (a.i - b.i))
        .map(x => x.m);
    }
    state._hintIdx = (state._hintIdx == null) ? 0 : (state._hintIdx + 1) % moves.length;
    const pick = moves[state._hintIdx];
    state.selected.clear();
    for (const c of pick.cards) state.selected.add(c);
    renderHand();
    updateSelHint();
    updateActions();
  }

  els.playBtn.addEventListener('click', () => {
    // 进贡（玩家是 giver） / 还贡（玩家是 receiver） / 出牌 三态复用同一按钮
    if (state.phase === PHASE.TRIBUTE) {
      if (activeTributeGive()) { confirmGiveTribute(); return; }
      if (activeTributePair()) { confirmReturnTribute(); return; }
    }
    playerPlay();
  });
  els.passBtn.addEventListener('click', playerPass);
  els.hintBtn.addEventListener('click', playerHint);
  if (els.dblNoBtn)  els.dblNoBtn.addEventListener('click', () => playerDoubleChoice('pass'));
  if (els.dblYesBtn) els.dblYesBtn.addEventListener('click', () => playerDoubleChoice('double'));
  if (els.autopilotBtn) {
    els.autopilotBtn.addEventListener('click', () => {
      state.autopilot = !state.autopilot;
      state._consecutiveTimeouts = 0;
      refreshAutopilotBtn();
      if (state.autopilot && state.phase === PHASE.PLAYING && state.turn === 0 && !state.busy) {
        // 立即接管：停时钟后短延迟自动出
        stopTurnClock();
        setTimeout(() => {
          if (state.autopilot && state.phase === PHASE.PLAYING && state.turn === 0 && !state.busy) {
            doAutoPlayPick();
          }
        }, 300);
      } else if (!state.autopilot && state.phase === PHASE.PLAYING && state.turn === 0 && !state.busy) {
        // 退出托管：重新挂时钟 + 重新渲染按钮（托管态下 updateActions 把不出/提示/出牌全藏了）
        armTurnClock();
        updateActions();
      }
    });
  }
  // 一键理牌：清掉所有 custom groups + handOrder，回到完全默认排序
  // 用户要求理牌/还原/一键理牌不弹任何 toast —— 静默执行；点错了就什么都不发生。
  els.sortBtn.addEventListener('click', () => {
    state.handOrder = null;
    state.customGroups = [];
    state.selected.clear();
    renderHand();
    updateActions();
  });

  // 还原：选中的牌恰好等于某个 custom group 的全部卡 → 解散那个 group
  if (els.restoreBtn) {
    els.restoreBtn.addEventListener('click', () => {
      const sel = [...state.selected].filter(c => state.hands[0].includes(c));
      if (!sel.length) return;
      const selSet = new Set(sel);
      // 查找 custom group：必须 sel 是该 group 的"超集"或"恰好"。这里要求"恰好等于"
      const idx = state.customGroups.findIndex(g =>
        g.cards.length === sel.length && g.cards.every(c => selSet.has(c)));
      if (idx < 0) {
        // 也可能用户选了多个 group → 一并解散
        const toRemove = state.customGroups
          .map((g, i) => ({ g, i }))
          .filter(x => x.g.cards.every(c => selSet.has(c)));
        if (!toRemove.length) return;
        const ids = new Set(toRemove.map(x => x.g.id));
        state.customGroups = state.customGroups.filter(g => !ids.has(g.id));
        state.selected.clear();
        renderHand();
        updateActions();
        return;
      }
      state.customGroups.splice(idx, 1);
      state.selected.clear();
      renderHand();
      updateActions();
    });
  }
  // 兼容：旧地方仍在调 updateRestoreBtn，留空
  function updateRestoreBtn() { /* no-op */ }

  // 🔀 理牌：把当前选中的牌组成新的一摞 custom group
  //   - classify 是炸弹 → strength = bombStrength，渲染时摞到最左（多个炸弹按 strength 降序）
  //   - 普通牌型 / 不成型组合 → 渲染时摞到最右（创建顺序）
  if (els.arrangeBtn) {
    els.arrangeBtn.addEventListener('click', () => {
      const sel = [...state.selected].filter(c => state.hands[0].includes(c));
      if (sel.length < 2) return;
      const level = currentLevelLabel();
      const cb = classify(sel, level);
      // 只允许把「能整摞一起打出去的合法牌型」摞起来：对子/三张/三带二/顺子/连对(木板)/
      // 钢板/炸弹/同花顺/天王炸……classify 认得就放行，认不得(随手凑的一堆杂牌)就静默不摞，
      // 杜绝把任意张数(甚至 8+)的杂牌硬摞成一摞。不弹窗，点错了什么都不发生。
      if (!cb) return;
      // 选中的牌若与已有摞重叠：直接拆掉那些旧摞、用当前选中重新摞一摞 ——
      // 这样「已摞好的三张」+「一对」可以直接并成一摞三带二，不必先还原。
      const selSet = new Set(sel);
      state.customGroups = state.customGroups.filter(g => !g.cards.some(c => selSet.has(c)));
      const isBomb = cb && isBombType(cb.type);
      const strength = isBomb ? (cb.bombStrength || 0) : 0;
      state.customGroups.push({
        id: Date.now() + Math.random(),
        cards: sel.slice(),
        strength: strength,
        type: isBomb ? 'bomb' : 'normal',
      });
      state.selected.clear();
      renderHand();
      updateActions();
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
  // 本机最高级牌 + 难度胜负数已按用户反馈从初始页隐藏；保留这两个函数
  // 当 no-op 即可，state.stats 仍在后台累计、上传战绩榜。
  function refreshHs() { /* no-op：已移除 UI */ }
  function refreshPgoStats() { /* no-op：已移除 UI */ }
  function syncPgoDiff() {
    [...els.pgoDiff.querySelectorAll('.gs-pgo-mode-tab')].forEach(t =>
      t.classList.toggle('selected', t.dataset.value === state.aiLevel));
    syncPgoOptions();
    syncPgoScoreSummary();
  }
  // 段选组：把 value 对应的 tab 设为 selected
  function selectSeg(container, value) {
    if (!container) return;
    [...container.querySelectorAll('.gs-pgo-mode-tab')].forEach(t =>
      t.classList.toggle('selected', t.dataset.value === value));
  }
  function syncPgoOptions() {
    const o = state.options;
    selectSeg(els.pgoTeamTrib, o.teamTribute ? 'on' : 'off');
    selectSeg(els.pgoScoreCap, String(o.scoreCap));
    selectSeg(els.pgoTurnSec, String(o.turnSec));
    if (els.pgoCardSize) selectSeg(els.pgoCardSize, String(state.cardSizeMult));
    // 折叠态下显示的一行摘要
    if (els.gameOptsSum) {
      els.gameOptsSum.textContent =
        (o.teamTribute ? '同队进贡' : '同队免贡') + ' · ' +
        (o.scoreCap ? '上限' + o.scoreCap : '分不限') + ' · ' +
        (o.turnSec ? o.turnSec + '秒' : '不限时');
    }
  }
  function syncPgoScoreSummary() {
    if (!els.pgoScore) return;
    const st = state.stats[state.aiLevel] || { w: 0, l: 0 };
    if ((st.w | 0) === 0 && (st.l | 0) === 0) {
      els.pgoScore.innerHTML = '';
      return;
    }
    // 升级规则下不展示分数，只保留胜负记录
    els.pgoScore.innerHTML = '本难度 <strong>' + (st.w | 0) + '</strong> 胜 <strong>' + (st.l | 0) + '</strong> 负';
  }
  els.pgoDiff.addEventListener('click', e => {
    const t = e.target.closest('.gs-pgo-mode-tab');
    if (!t) return;
    state.aiLevel = t.dataset.value;
    persist();
    syncPgoDiff();
    refreshScoreChip();
  });
  // 玩法设置段选：同队进贡 / 单局积分上限 / 出牌时间
  if (els.pgoTeamTrib) els.pgoTeamTrib.addEventListener('click', e => {
    const t = e.target.closest('.gs-pgo-mode-tab'); if (!t) return;
    state.options.teamTribute = (t.dataset.value === 'on');
    persist(); syncPgoOptions();
  });
  if (els.pgoScoreCap) els.pgoScoreCap.addEventListener('click', e => {
    const t = e.target.closest('.gs-pgo-mode-tab'); if (!t) return;
    state.options.scoreCap = parseInt(t.dataset.value, 10) || 0;
    persist(); syncPgoOptions();
  });
  if (els.pgoTurnSec) els.pgoTurnSec.addEventListener('click', e => {
    const t = e.target.closest('.gs-pgo-mode-tab'); if (!t) return;
    state.options.turnSec = parseInt(t.dataset.value, 10) || 0;
    persist(); syncPgoOptions();
  });
  if (els.pgoCardSize) els.pgoCardSize.addEventListener('click', e => {
    const t = e.target.closest('.gs-pgo-mode-tab'); if (!t) return;
    state.cardSizeMult = parseFloat(t.dataset.value) || 1;
    selectSeg(els.pgoCardSize, t.dataset.value);
    persist(); renderHand();
  });
  // 玩法设置折叠/展开
  if (els.gameOptsToggle) els.gameOptsToggle.addEventListener('click', () => {
    const open = els.gameOptsBody.hidden;          // 当前收起 → 要展开
    els.gameOptsBody.hidden = !open;
    els.gameOptsToggle.setAttribute('aria-expanded', String(open));
  });
  els.pgoStart.addEventListener('click', () => {
    // 高手档若神经网络还没下好：原地显示下载进度,下完才开始,不让「假高手」(启发式)上桌
    const needNet = state.aiLevel === 'hard' && typeof GuandanDMC !== 'undefined' && !GuandanDMC.ready();
    if (!needNet) { els.pgo.classList.remove('open'); startMatch(); return; }
    const btn = els.pgoStart;
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.style.pointerEvents = 'none'; btn.style.opacity = '0.85';
    const tick = p => { btn.textContent = '下载高手模型 ' + Math.round(p * 100) + '%'; };
    tick(_dmcProgress);
    ensureDMC(tick).then(() => {
      btn.style.pointerEvents = ''; btn.style.opacity = '';
      if (_dmcState === 2) { btn.innerHTML = btn.dataset.orig; els.pgo.classList.remove('open'); startMatch(); }
      else { _dmcState = 0; _dmcPromise = null; btn.textContent = '下载失败,点击重试（或改选普通档）'; }   // 不回退假高手：重试或换档
    });
  });
  els.matchAgain.addEventListener('click', () => {
    els.matchOverlay.classList.remove('open');
    if (isNetworked()) nextRoundNet();
    else startMatch();
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
  //  测试 / 演示模式：页面连打 TEST 触发。发一副含所有牌型 + 边界(8张炸弹/8尖/天王炸)
  //  的手牌，AI 自动过让你逐个打出去看效果；左侧面板按钮演示他家牌型与各流程动画。
  // ===========================================================
  function buildTestHand() {
    const C = (suit, rank, deck) => (deck || 0) * 54 + suit * 13 + rank;  // 0♠1♥2♦3♣ ; rank 0=2..12=A
    const SJ = (deck) => (deck || 0) * 54 + 52;   // 小王
    const BJ = (deck) => (deck || 0) * 54 + 53;   // 大王
    const R = { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12 };
    const h = [];
    h.push(SJ(0), SJ(1), BJ(0), BJ(1));                                    // 天王炸（双大双小）
    for (let s = 0; s < 4; s++) h.push(C(s, R['3'], 0), C(s, R['3'], 1));  // 8 张同点炸弹(3)——测竖叠边界
    for (let s = 0; s < 4; s++) h.push(C(s, R['A'], 0), C(s, R['A'], 1));  // 8 个尖(A)——测横排/竖叠边界
    for (let s = 0; s < 4; s++) h.push(C(s, R['2'], 0), C(s, R['2'], 1));  // 全部级牌(级=2：♥为逢人配深色)
    h.push(C(0,R['9'],0), C(1,R['10'],0), C(2,R['J'],0), C(3,R['Q'],0), C(0,R['K'],0)); // 顺子 9-10-J-Q-K(混色)
    h.push(C(0,R['7'],0), C(1,R['7'],0), C(2,R['7'],0), C(0,R['8'],0), C(1,R['8'],0), C(2,R['8'],0)); // 钢板 777888
    h.push(C(0,R['6'],0), C(1,R['6'],0), C(2,R['6'],0), C(0,R['5'],0), C(1,R['5'],0)); // 三带二 66655
    h.push(C(3,R['4'],0), C(3,R['5'],0), C(3,R['6'],0), C(3,R['7'],0), C(3,R['8'],0)); // 同花顺 ♣4-8
    h.push(C(1,R['9'],0), C(2,R['9'],0), C(0,R['10'],0), C(2,R['10'],0), C(0,R['J'],0), C(1,R['J'],0)); // 连对 99 1010 JJ
    return h;
  }

  function enterTestMode() {
    if (isNetworked()) return;
    state.matchOptions = normalizeOptions(state.options);
    state.levels = [0, 0];          // 级 = '2'
    state.actingTeam = 0;
    state._testMode = true;
    state.autopilot = false;
    state.out = [];
    state.selected.clear();
    state.customGroups = [];
    state.handOrder = null;
    state.lastPlay = [null, null, null, null];
    state.busy = false;
    state.bombMult = 1;
    const h0 = buildTestHand();
    const used = new Set(h0);
    const left = [];
    for (let c = 0; c < 108; c++) if (!used.has(c)) left.push(c);
    state.hands = [h0, left.slice(0, 7), left.slice(7, 14), left.slice(14, 21)];
    state.phase = PHASE.PLAYING;
    state.turn = 0;
    state.trick = { lead: 0, best: null, bestSeat: -1, passes: 0 };
    if (els.pgo) els.pgo.classList.remove('open');
    if (els.roundOverlay) els.roundOverlay.classList.remove('open');
    if (els.matchOverlay) els.matchOverlay.classList.remove('open');
    renderAll();
    updateActions();
    armTurnClock();
    buildTestPanel();
    toast('🧪 测试模式：已发全牌型手牌，AI 会自动过');
  }

  function demoOtherPlay(seat, cards, label) {
    const combo = classify(cards, currentLevelLabel());
    if (!combo) { toast('演示牌型构造失败：' + (label || '')); return; }
    state.lastPlay[seat] = combo;
    renderAll();
  }
  function demoTribute(double) {
    const C = (s, r) => s * 13 + r;
    const lv = currentLevelLabel();
    const mk = (card, label) => ({ type: T.SINGLE, cards: [card], key: singleWeight(card, lv), bombStrength: 0, tributeLabel: label });
    state.lastPlay = [null, null, null, null];
    // 对方(1,3)垫底 → 进贡给你方(0,2)
    state.lastPlay[1] = mk(C(0, 12), '进'); state.lastPlay[0] = mk(C(0, 6), '还');
    if (double) { state.lastPlay[3] = mk(C(1, 12), '进'); state.lastPlay[2] = mk(C(1, 6), '还'); }
    renderAll();
  }
  function demoResult() {
    if (typeof showRoundOverlay === 'function') {
      showRoundOverlay([0, 2, 1, 3], 0, 1, 0, 1, false);   // 你方头游+二游，级 2→3
      if (els.roundOverlay) els.roundOverlay.classList.add('open');
    }
  }

  function buildTestPanel() {
    if (document.getElementById('gdTestPanel')) return;
    const C = (s, r) => s * 13 + r;
    const SJ = 52, BJ = 53;
    const R = { '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'10':8,'J':9,'Q':10,'K':11,'A':12 };
    const p = document.createElement('div');
    p.id = 'gdTestPanel';
    p.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9998;width:118px;max-height:92vh;overflow:auto;' +
      'background:rgba(20,30,45,0.92);border:1px solid #c9a96e;border-radius:10px;padding:8px;' +
      'display:flex;flex-direction:column;gap:4px;font-family:var(--font-body,sans-serif);box-shadow:0 4px 14px rgba(0,0,0,0.4);';
    const title = document.createElement('div');
    title.textContent = '🧪 测试台'; title.style.cssText = 'color:#f5d142;font-weight:700;font-size:13px;text-align:center;margin-bottom:2px;';
    p.appendChild(title);
    const grp = (t) => { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'color:#c9a96e;font-size:10px;margin-top:5px;border-top:1px solid rgba(201,169,110,0.4);padding-top:3px;'; p.appendChild(d); };
    const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font-size:11.5px;padding:5px 4px;border-radius:6px;border:1px solid rgba(201,169,110,0.5);background:#f7f2e6;color:#2b2a26;cursor:pointer;'; b.addEventListener('click', fn); p.appendChild(b); };

    grp('他家出牌');
    btn('对家·三带二', () => demoOtherPlay(2, [C(0,R['9']),C(1,R['9']),C(2,R['9']),C(0,R['10']),C(1,R['10'])], '三带二'));
    btn('下家·四张炸', () => demoOtherPlay(1, [C(0,R['K']),C(1,R['K']),C(2,R['K']),C(3,R['K'])], '四炸'));
    btn('上家·同花顺', () => demoOtherPlay(3, [C(0,R['4']),C(0,R['5']),C(0,R['6']),C(0,R['7']),C(0,R['8'])], '同花顺'));
    btn('对家·天王炸', () => demoOtherPlay(2, [SJ, SJ + 54, BJ, BJ + 54], '天王炸'));
    btn('逢人配替牌', () => demoOtherPlay(2, [C(0,R['9']),C(1,R['2']),C(0,R['J']),C(0,R['Q']),C(0,R['K'])], '逢人配替10'));

    grp('流程/动画');
    btn('接风', () => { if (typeof showJiefengFx === 'function') showJiefengFx(2, 0); });
    btn('抗贡', () => { if (typeof showTributeBanner === 'function') showTributeBanner('🛡️ 抗贡成功', '握双大王，免进贡', 2200); });
    btn('进贡(单)', () => demoTribute(false));
    btn('进贡(双下)', () => demoTribute(true));
    btn('结算面板', () => demoResult());

    grp('其它');
    btn('重发测试牌', () => {
      state.hands[0] = buildTestHand(); state.lastPlay = [null, null, null, null];
      state.selected.clear(); state.customGroups = []; state.out = [];
      state.turn = 0; state.trick = { lead: 0, best: null, bestSeat: -1, passes: 0 };
      renderAll(); updateActions();
    });
    btn('退出测试', () => { state._testMode = false; p.remove(); location.reload(); });
    document.body.appendChild(p);
  }

  // 连打 TEST 触发测试模式
  (function () {
    let buf = '';
    document.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = (e.key || '').toLowerCase();
      if (k.length === 1 && k >= 'a' && k <= 'z') {
        buf = (buf + k).slice(-4);
        if (buf === 'test') { buf = ''; enterTestMode(); }
      }
    });
  })();

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
    '<p>键盘：Enter 出牌 · Space 不要 · H 提示。手牌按点数竖向成列；点牌选中、横拖多选。' +
    '<strong>🔀 理牌</strong>：选中若干张点一下，把它们摞成一摞 —— 炸弹自动摞到最左（多个炸弹按强度从大到小排）、其他牌摞到最右。' +
    '<strong>↩ 还原</strong>：选中某一摞的所有牌后点击，把它解散回默认位置。<strong>🧩 一键理牌</strong>：把所有自定义摞清掉，全部回默认排序。</p>';

  // ---- 永久全屏：进页面即铺满 viewport，不再提供退出全屏（最佳体验就是全屏玩）。
  //      玩法 / 战绩榜 / 评论改在游戏内「🏆 榜单」浮层看，不用跳出游戏外。 ----
  document.body.classList.add('gd-game-fullscreen');
  const boardModal = $('gdBoardModal');
  function openBoard() { if (boardModal) boardModal.hidden = false; }
  function closeBoard() { if (boardModal) boardModal.hidden = true; }
  if ($('gdBoardBtn')) $('gdBoardBtn').addEventListener('click', openBoard);
  if ($('gdBoardClose')) $('gdBoardClose').addEventListener('click', closeBoard);
  if ($('gdBoardBackdrop')) $('gdBoardBackdrop').addEventListener('click', closeBoard);
  // ⚙️ 设置：调出 Pre-Game 页（含全部设置）。对局进行中露出「返回游戏」让你能关掉续局。
  const gdPgoCloseBtn = $('gdPgoClose');
  if ($('gdSettingsBtn')) $('gdSettingsBtn').addEventListener('click', () => {
    const mid = state.phase === PHASE.PLAYING || state.phase === PHASE.TRIBUTE;
    if (gdPgoCloseBtn) gdPgoCloseBtn.hidden = !mid;
    els.pgo.classList.add('open');
  });
  if (gdPgoCloseBtn) gdPgoCloseBtn.addEventListener('click', () => {
    els.pgo.classList.remove('open');
    gdPgoCloseBtn.hidden = true;
  });
  // 中途退出本局：随时弃掉当前这副牌，回到难度选择页（PGO）。复用 matchSetup 那套
  // 收尾——停时钟、关托管、回 IDLE、重渲、亮起 PGO。不弹确认窗（用户讨厌弹窗）；
  // 旧对局快照留着不清，万一手滑还能靠 resume 救回来，开新局时 startMatch 自会覆盖。
  function quitToSetup() {
    closeBoard();
    stopTurnClock();
    state.phase = PHASE.IDLE;
    state.autopilot = false;
    state._consecutiveTimeouts = 0;
    refreshAutopilotBtn();
    renderAll();
    refreshPgoStats();
    syncPgoDiff();
    refreshHs();
    els.pgo.classList.add('open');
  }
  // 右上角「退出本局」按钮 → 先弹确认窗（用户明确要求确认），确认后才 quitToSetup
  const confirmExit = $('gdConfirmExit');
  function openConfirmExit() { if (confirmExit) confirmExit.hidden = false; }
  function closeConfirmExit() { if (confirmExit) confirmExit.hidden = true; }
  if ($('gdExitBtn')) $('gdExitBtn').addEventListener('click', openConfirmExit);
  if ($('gdConfirmExitCancel')) $('gdConfirmExitCancel').addEventListener('click', closeConfirmExit);
  if ($('gdConfirmExitBackdrop')) $('gdConfirmExitBackdrop').addEventListener('click', closeConfirmExit);
  if ($('gdConfirmExitOk')) $('gdConfirmExitOk').addEventListener('click', () => { closeConfirmExit(); quitToSetup(); });
  // 旋转/尺寸变化：复位滚动 + 强制 position:fixed 重新按当前视口铺满，避免 Safari 旋转后
  // 顶部残留一小栏（wrap 被滚下去一点 / fixed 没按新视口重算）的坑。
  function gdReflowViewport() {
    const wrap = document.querySelector('.guandan-wrap');
    if (wrap) {
      wrap.scrollTop = 0;
      // toggle display 触发整块重新布局，逼浏览器按当前视口重排 fixed 容器
      const prev = wrap.style.display;
      wrap.style.display = 'none';
      void wrap.offsetHeight;
      wrap.style.display = prev;
    }
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    adaptHandSize();
  }
  window.addEventListener('resize', gdReflowViewport);
  window.addEventListener('orientationchange', () => { setTimeout(gdReflowViewport, 120); setTimeout(gdReflowViewport, 400); });

  // ---- 启动 ----
  refreshHs();
  refreshPgoStats();
  syncPgoDiff();
  renderAll();
  initShell();

  // 中断保留：visibility / beforeunload 时同步保存一次
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveSessionSync();
  });
  window.addEventListener('beforeunload', () => { saveSessionSync(); });

  // 进入游戏即全屏：有未完成对局 → 弹恢复 modal；否则跳过 PGO 设置面板，直接发一局单机掼蛋。
  // （难度 / 玩法 / 联机仍可随时点右上角 ⚙️ 设置进 PGO 调整，下一盘生效。）
  // 每次进入游戏都先走 Pregame（难度选择）页 + 后台预下载高手神经网络模型，
  // 给下载争取时间，保证点「开始」时高手档已就绪（不用假高手顶替）。
  function showPgo() {
    state.phase = PHASE.IDLE;
    renderAll();
    refreshPgoStats();
    syncPgoDiff();
    refreshHs();
    if (els.pgo) els.pgo.classList.add('open');
    ensureDMC();   // 后台预下载,不阻塞
  }
  (function maybeResumeOnLoad() {
    const snap = loadSession();
    if (snap) { showResumeOverlay(snap); ensureDMC(); return; }
    showPgo();
  })();

  function showResumeOverlay(snap) {
    if (!els.resumeOverlay) return;
    const level = snap.levels ? LEVEL_SEQ[snap.levels[snap.actingTeam | 0] | 0] : '?';
    const youLv = snap.levels ? LEVEL_SEQ[snap.levels[0] | 0] : '?';
    const oppLv = snap.levels ? LEVEL_SEQ[snap.levels[1] | 0] : '?';
    const handsLeft = Array.isArray(snap.hands) ? snap.hands[0].length : 0;
    const mins = Math.max(1, Math.round((Date.now() - (snap.savedAt || Date.now())) / 60000));
    const phaseLabel = snap.phase === PHASE.ROUND_END ? '小局结算未确认' : '对局进行中';
    if (els.resumeSummary) {
      els.resumeSummary.innerHTML =
        '<span class="row phase">' + phaseLabel + '</span>' +
        '<span class="row">我方 级 <span class="key">' + youLv + '</span>' +
        '<span class="sep">·</span>对方 级 <span class="key">' + oppLv + '</span>' +
        '<span class="sep">·</span>当前主级 <span class="key">' + level + '</span></span>' +
        '<span class="row">我方手牌剩 <span class="key">' + handsLeft + '</span> 张' +
        '<span class="sep">·</span>保存于 <span class="key">' + mins + '</span> 分钟前</span>';
    }
    els.resumeOverlay.classList.add('open');
  }
  if (els.resumeContinue) {
    els.resumeContinue.addEventListener('click', () => {
      const snap = loadSession();
      if (!snap) {
        els.resumeOverlay.classList.remove('open');
        els.pgo.classList.remove('open');
        startMatch();
        return;
      }
      els.resumeOverlay.classList.remove('open');
      els.pgo.classList.remove('open');
      restoreFromSession(snap);
    });
  }
  if (els.resumeDiscard) {
    els.resumeDiscard.addEventListener('click', () => {
      clearSession();
      els.resumeOverlay.classList.remove('open');
      // 放弃续局 → 回到 Pregame（难度选择）页让用户重选档（同时后台已在预下载模型）
      showPgo();
    });
  }

  function restoreFromSession(snap) {
    // 写回 state 数据字段
    if (['easy','normal','hard'].includes(snap.aiLevel)) state.aiLevel = snap.aiLevel;
    if (snap.options) state.options = normalizeOptions(snap.options);
    // 恢复这盘冻结的设置；旧 session 没有 matchOptions 就退回 options
    state.matchOptions = normalizeOptions(snap.matchOptions || snap.options);
    if ([1,2,3].includes(snap.openMult)) state.openMult = snap.openMult;
    state.phase = snap.phase;
    state.levels = Array.isArray(snap.levels) ? snap.levels.slice() : [0, 0];
    state.actingTeam = snap.actingTeam | 0;
    state.firstLeader = snap.firstLeader | 0;
    state.hands = Array.isArray(snap.hands) ? snap.hands.map(h => h.slice()) : [[],[],[],[]];
    state.out = Array.isArray(snap.out) ? snap.out.slice() : [];
    state.turn = snap.turn | 0;
    state.trick = snap.trick ? { lead: snap.trick.lead | 0, best: snap.trick.best || null, bestSeat: snap.trick.bestSeat | 0, passes: snap.trick.passes | 0 } : null;
    state.handOrder = Array.isArray(snap.handOrder) ? snap.handOrder.slice() : null;
    state.customGroups = Array.isArray(snap.customGroups) ? snap.customGroups.map(g => ({
      id: g.id, cards: (g.cards || []).slice(), strength: g.strength | 0, type: g.type,
    })) : [];
    state.lastPlay = Array.isArray(snap.lastPlay) ? snap.lastPlay.slice() : [null, null, null, null];
    state.runStartedAt = snap.runStartedAt || Date.now();
    state.runNonce = snap.runNonce || ((window.GamesShell && GamesShell.Identity) ? GamesShell.Identity.newRunNonce() : String(Date.now()));
    state.autopilot = !!snap.autopilot;
    state._consecutiveTimeouts = snap._consecutiveTimeouts | 0;
    state.bombMult = snap.bombMult || 1;
    state.lastRoundScore = (snap.lastRoundScore == null) ? null : snap.lastRoundScore;
    state.lastRoundDetail = snap.lastRoundDetail || null;
    state.lastRanking = Array.isArray(snap.lastRanking) ? snap.lastRanking.slice() : null;
    state.selected = new Set();
    state.busy = false;
    state.arrangeMode = false;  // 字段已弃用
    state.pendingTribute = null;
    state._activeTributeGive = null;
    state._activeTributePair = null;
    state._pendingMatchWin = (snap._pendingMatchWin == null) ? null : snap._pendingMatchWin;

    syncPgoDiff();
    refreshAutopilotBtn();
    renderAll();

    if (state.phase === PHASE.PLAYING) {
      // 重新启动当前回合的时钟 / AI 调度
      if (state.turn === 0 && !state.out.includes(0)) {
        updateActions();
        armTurnClock();
      } else {
        scheduleAI();
      }
      toast('已恢复对局');
    } else if (state.phase === PHASE.ROUND_END) {
      // 小局结算页：用快照里 ranking + lastRoundDetail 还原 overlay
      const ranking = state.lastRanking || [];
      const detail = state.lastRoundDetail || { advance: 1, beforeIdx: 0, newIdx: 0, winTeam: 0, matchWon: false };
      showRoundOverlay(ranking, detail.winTeam | 0, detail.advance | 0, detail.beforeIdx | 0, detail.newIdx | 0, !!detail.matchWon);
      toast('已恢复对局');
    }
  }

  // ===========================================================
  //  联机模式 (Phase 1: 房间 lobby 同步)
  //  后端：https://zircon-urge.fly.dev/api/guandan
  //  长轮询拉 state；本地用 onlineState 单独存房间快照，不污染单机 state
  // ===========================================================
  const GUANDAN_API = 'https://zircon-urge.fly.dev/api/guandan';
  const ONLINE_SESSION_KEY = 'tool.guandan.online.session.v1';

  // 当前联机会话（null = 不在线）
  let onlineState = null;

  const onlineEls = {
    pgoPlayMode: $('gdPgoPlayMode'),
    singleSetup: $('gdSingleSetup'),
    onlineSetup: $('gdOnlineSetup'),
    tabs: $('gdOnlineTabs'),
    nick: $('gdOnlineNick'),
    code: $('gdOnlineCode'),
    submit: $('gdOnlineSubmit'),
    hint: $('gdOnlineHint'),
    lobby: $('gdLobby'),
    roomCode: $('gdRoomCode'),
    seatTop: $('gdLobbySeatTop'),
    seatLeft: $('gdLobbySeatLeft'),
    seatRight: $('gdLobbySeatRight'),
    seatBottom: $('gdLobbySeatBottom'),
    seated: $('gdLobbySeated'),
    startBtn: $('gdLobbyStartBtn'),
    leaveBtn: $('gdLobbyLeaveBtn'),
    copyCodeBtn: $('gdCopyCodeBtn'),
    copyLinkBtn: $('gdCopyLinkBtn'),
  };
  let onlineTab = 'create';
  let playMode = 'single';   // 'single' | 'online'

  // 把「玩法设置」面板搬到当前该出现的位置：单机 → 难度下方；联机·创建房间 → 提交键上方；
  // 联机·加入房间 → 隐藏（设置由房主定，加入者不需要）。移动 DOM 节点，监听器/选中态都保留。
  function placeGameOpts() {
    const opts = els.gameOpts;
    if (!opts) return;
    if (playMode === 'single') {
      if (els.pgoScore) onlineEls.singleSetup.insertBefore(opts, els.pgoScore);
      opts.hidden = false;
    } else if (onlineTab === 'create') {
      const form = onlineEls.submit && onlineEls.submit.parentNode;
      if (form) form.insertBefore(opts, onlineEls.submit);
      opts.hidden = false;
    } else {
      opts.hidden = true;
    }
  }

  // ---- API ----
  async function gdApi(action, opts) {
    opts = opts || {};
    const isGet = !opts.body;
    const url = GUANDAN_API + '?action=' + encodeURIComponent(action) +
      (opts.qs ? '&' + new URLSearchParams(opts.qs).toString() : '');
    const init = {
      method: isGet ? 'GET' : 'POST',
      headers: isGet ? {} : { 'Content-Type': 'application/json' },
      body: isGet ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    };
    try {
      const res = await fetch(url, init);
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) return { ok: false, status: res.status, error: (data && data.error) || 'http_error', data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, status: 0, error: 'network', err: String(e) };
    }
  }

  // ---- session ----
  function onlineSessionSave(s) {
    try { localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify(s)); } catch {}
  }
  function onlineSessionClear() {
    try { localStorage.removeItem(ONLINE_SESSION_KEY); } catch {}
  }

  // ---- identity ----
  function gdGetDeviceId() {
    if (window.GamesShell && GamesShell.Identity && GamesShell.Identity.getDeviceId) {
      return GamesShell.Identity.getDeviceId();
    }
    let did = localStorage.getItem('gs.did.v1');
    if (!did) {
      did = 'd-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      try { localStorage.setItem('gs.did.v1', did); } catch {}
    }
    return did;
  }
  function gdGetNick() {
    return (window.GamesShell && GamesShell.Identity && GamesShell.Identity.getNick && GamesShell.Identity.getNick()) || '';
  }
  function gdSetNick(n) {
    if (window.GamesShell && GamesShell.Identity && GamesShell.Identity.setNick) GamesShell.Identity.setNick(n);
  }

  // ---- hint ----
  function setOnlineHint(text, isError) {
    if (!onlineEls.hint) return;
    onlineEls.hint.textContent = text || '';
    onlineEls.hint.className = 'gd-online-hint' + (isError ? ' error' : '');
  }
  const ERR_MSG = {
    room_not_found: '房间不存在或已过期',
    room_in_progress: '游戏已开始，无法加入',
    room_full: '房间已满，换一个房号试试',
    room_dissolved: '房间已解散',
    nick_taken_in_room: '昵称已被占用，换一个试试',
    invalid_nick: '昵称不合法（1-12 字，禁特殊符号）',
    invalid_code: '房号格式不对（4 位数字）',
    invalid_device: '设备标识异常，请刷新页面',
    not_host: '只有房主才能这样做',
    not_in_lobby: '当前阶段不允许',
    seat_taken: '这个座位已经有人',
    seats_not_full: '4 座没坐满，还不能开始',
    host_must_transfer_or_dissolve: '房主退出需选择转交或解散',
    network: '网络异常，请重试',
  };
  const errText = e => ERR_MSG[e] || ('错误：' + e);

  // ---- tabs ----
  if (onlineEls.tabs) {
    [...onlineEls.tabs.querySelectorAll('.gd-online-tab')].forEach(b => {
      b.addEventListener('click', () => {
        [...onlineEls.tabs.querySelectorAll('.gd-online-tab')].forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        onlineTab = b.dataset.tab;
        onlineEls.code.hidden = (onlineTab === 'create');
        onlineEls.submit.textContent = (onlineTab === 'create') ? '创建房间' : '加入房间';
        placeGameOpts();   // 创建房间显示玩法设置，加入房间隐藏
        setOnlineHint('');
      });
    });
  }
  // playmode toggle
  if (onlineEls.pgoPlayMode) {
    [...onlineEls.pgoPlayMode.querySelectorAll('.gs-pgo-mode-tab')].forEach(b => {
      b.addEventListener('click', () => {
        [...onlineEls.pgoPlayMode.querySelectorAll('.gs-pgo-mode-tab')].forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        const m = b.dataset.playmode;
        playMode = m;
        if (m === 'online') {
          onlineEls.singleSetup.hidden = true;
          onlineEls.onlineSetup.hidden = false;
          // 预填昵称
          if (onlineEls.nick && !onlineEls.nick.value) onlineEls.nick.value = gdGetNick();
        } else {
          onlineEls.singleSetup.hidden = false;
          onlineEls.onlineSetup.hidden = true;
        }
        placeGameOpts();   // 切模式时把玩法设置搬到对应位置
      });
    });
  }
  placeGameOpts();   // 初始（默认单机）把玩法设置放到难度下方

  // ---- submit (create/join) ----
  if (onlineEls.submit) {
    onlineEls.submit.addEventListener('click', async () => {
      const nick = onlineEls.nick.value.trim();
      if (!nick || nick.length > 12) { setOnlineHint('昵称 1-12 字', true); return; }
      gdSetNick(nick);
      if (onlineTab === 'create') {
        setOnlineHint('创建中…');
        const r = await gdApi('create', { body: { nick, deviceId: gdGetDeviceId(), config: { aiLevel: state.aiLevel, options: state.options } } });
        if (!r.ok) { setOnlineHint(errText(r.error), true); return; }
        enterRoom(r.data, nick);
      } else {
        const code = onlineEls.code.value.trim();
        if (!/^\d{4}$/.test(code)) { setOnlineHint('请输入 4 位房号', true); return; }
        setOnlineHint('加入中…');
        const r = await gdApi('join', { body: { code, nick, deviceId: gdGetDeviceId() } });
        if (!r.ok) { setOnlineHint(errText(r.error), true); return; }
        enterRoom(r.data, nick);
      }
    });
  }
  // Enter 触发 submit
  ['gdOnlineNick', 'gdOnlineCode'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter' && onlineEls.submit) onlineEls.submit.click(); });
  });

  // ---- enter / leave ----
  function enterRoom(joinData, nick) {
    onlineSessionSave({
      code: joinData.code,
      token: joinData.playerToken,
      playerId: joinData.playerId,
      nick: nick,
      ts: Date.now(),
    });
    // create 响应必带 config；join 不带。靠这个判断本人是不是房主，免去等第一轮轮询
    const isCreate = !!(joinData && joinData.config);
    onlineState = {
      code: joinData.code,
      token: joinData.playerToken,
      playerId: joinData.playerId,
      isHost: isCreate,            // create 时本人就是房主
      mySeat: isCreate ? 0 : null, // 创房默认占座 0；join 时未坐下
      lastVersion: 0,
      polling: false,
      pollAbort: null,
      // 创房时构造一个最小 srv 投影，使 renderLobby 能立刻画出"我已在 bottom + 三空座 + 加机器人"
      players: isCreate ? [{
        id: joinData.playerId,
        seat: 0,
        nick: nick,
        isAi: false,
        online: true,
        isHost: true,
      }] : [],
      hostPlayerId: isCreate ? joinData.playerId : null,
      config: (joinData && joinData.config) || null,
      srvState: 'lobby',
      swapSelected: null,
      swapPending: null,
      preStartRotation: false,
      _animating: false,
      _swapPhase: null,        // null | 'animating' | 'holding'
      _expectedVersion: 0,     // 乐观操作期望服端推到的最小 version
      _revealPending: !isCreate, // 加入者：等第一条 server state 才揭开大厅（别先画空房）
      _autoSatTried: false,    // 加入者：进房后自动找空座落座，只试一次
    };
    if (onlineEls.roomCode) onlineEls.roomCode.textContent = joinData.code;
    if (isCreate) {
      // 房主：已知自己占座 0，立刻进大厅画出来。
      setOnlineHint('');
      revealLobby();
      renderLobbyOptimistic();
    } else {
      // 加入者：此刻还不知道房间长啥样（players 是空的）。若现在就画大厅会是"一屋子空座 +
      // 坐下按钮"，加入者会误以为这是自己开的新房、自己是房主。所以先停在 PGO 显示「加入中…」，
      // 等第一条 server state 回来（applyServerOnlineState 里的 _revealPending）再揭开大厅。
      setOnlineHint('加入中…');
    }
    startOnlinePolling();
  }

  // 揭开联机大厅：关掉 PGO 浮层、显示大厅、给牌桌挂 gd-in-lobby（藏掉牌局 UI）。
  function revealLobby() {
    if (els.pgo) els.pgo.classList.remove('open');
    if (onlineEls.lobby) onlineEls.lobby.hidden = false;
    if (els.table) els.table.classList.add('gd-in-lobby');
  }

  // 加入者自动落座：进房默认是 standing（seat=null，旧版根本不渲染 standing 玩家，于是
  // 房主看不到人进来、加入者也一直浮在房外）。这里找一个空座自动坐下 —— 房主立刻能在大厅
  // 看到这个人，加入者也清楚自己只是普通玩家（房主标签挂在房主头上）。只尝试一次；4 座全满
  // （房主把空位都填了 AI）时保持 standing 不动。
  function maybeAutoSit(srv) {
    if (!onlineState || onlineState.isHost) return;
    if (!srv || srv.state !== 'lobby') return;
    if (typeof onlineState.mySeat === 'number') return;   // 已坐下
    if (onlineState._autoSatTried) return;
    const taken = new Set((srv.players || []).filter(p => typeof p.seat === 'number').map(p => p.seat));
    let emptySeat = -1;
    for (let s = 0; s < 4; s++) { if (!taken.has(s)) { emptySeat = s; break; } }
    if (emptySeat < 0) return;
    onlineState._autoSatTried = true;
    sendSit(emptySeat);
  }

  async function leaveRoom(silent, opts) {
    opts = opts || {};
    if (!onlineState) {
      onlineSessionClear();
      onlineEls.lobby.hidden = true;
      if (els.table) els.table.classList.remove('gd-in-lobby');
      els.pgo && els.pgo.classList.add('open');
      return;
    }
    const body = { code: onlineState.code, token: onlineState.token };
    if (opts.transferTo) body.transferTo = opts.transferTo;
    if (opts.dissolveOnLeave) body.dissolveOnLeave = true;
    try { await gdApi('leave', { body }); } catch {}
    clearSwapTimers();
    stopOnlinePolling();
    onlineSessionClear();
    onlineState = null;
    if (onlineEls.lobby) {
      onlineEls.lobby.hidden = true;
      onlineEls.lobby.classList.remove('starting');
    }
    if (els.table) els.table.classList.remove('gd-in-lobby');
    if (els.pgo) els.pgo.classList.add('open');
    if (!silent) setOnlineHint('已离开房间');
  }

  if (onlineEls.leaveBtn) {
    onlineEls.leaveBtn.addEventListener('click', async () => {
      if (!onlineState) return;
      // 房主 + 房里还有别的真人 → 提示先转交或解散
      if (onlineState.isHost) {
        const otherHumans = (onlineState.players || []).filter(p => !p.isAi && p.id !== onlineState.playerId);
        if (otherHumans.length > 0) {
          const choice = await pickHostExit(otherHumans);
          if (choice == null) return;     // 取消
          if (choice === '__dissolve__') {
            await leaveRoom(false, { dissolveOnLeave: true });
          } else {
            await leaveRoom(false, { transferTo: choice });
          }
          return;
        }
      }
      await leaveRoom(false);
    });
  }
  // 房主退出选择：转交给哪位真人 / 直接解散
  function pickHostExit(otherHumans) {
    return new Promise(resolve => {
      const html =
        '<div style="text-align:center;font-size:0.95rem;color:var(--color-ink);margin-bottom:0.6rem;">' +
        '你是房主，离开前请选择：</div>' +
        '<div style="display:flex;flex-direction:column;gap:0.4rem;">' +
        otherHumans.map(p => '<button class="gd-btn" data-pid="' + p.id + '">转交给 ' +
          escGdHtml(p.nick) + '</button>').join('') +
        '<button class="gd-btn" data-pid="__dissolve__" style="margin-top:0.4rem;">直接解散房间</button>' +
        '<button class="gd-btn" data-pid="__cancel__">取消</button>' +
        '</div>';
      const wrap = document.createElement('div');
      wrap.className = 'gd-overlay open';
      wrap.style.zIndex = '50';
      wrap.innerHTML = '<div class="panel" style="max-width:340px;">' + html + '</div>';
      els.table.appendChild(wrap);
      wrap.addEventListener('click', e => {
        const b = e.target.closest('button[data-pid]');
        if (!b) return;
        const pid = b.dataset.pid;
        wrap.remove();
        if (pid === '__cancel__') resolve(null);
        else resolve(pid);
      });
    });
  }

  // ---- polling ----
  async function startOnlinePolling() {
    if (!onlineState || onlineState.polling) return;
    onlineState.polling = true;
    while (onlineState && onlineState.polling && onlineState.token) {
      const ctrl = new AbortController();
      onlineState.pollAbort = ctrl;
      const r = await gdApi('state', {
        qs: { code: onlineState.code, token: onlineState.token, since: onlineState.lastVersion },
        signal: ctrl.signal,
      }).catch(() => ({ ok: false, error: 'aborted' }));
      if (!onlineState || !onlineState.polling) break;
      if (r.ok && r.data) {
        applyServerOnlineState(r.data);
      } else if (r.status === 403 || r.status === 404) {
        toast(r.error === 'room_not_found' ? '房间已过期' : '会话失效');
        await leaveRoom(true);
        break;
      } else if (r.error === 'aborted') {
        // 主动 abort：刚发了一次操作，立刻发新长轮询拉最新状态，不睡 1.5s
        continue;
      } else {
        await new Promise(rs => setTimeout(rs, 1500));
      }
    }
    if (onlineState) { onlineState.polling = false; onlineState.pollAbort = null; }
  }
  function stopOnlinePolling() {
    if (onlineState) {
      onlineState.polling = false;
      if (onlineState.pollAbort) try { onlineState.pollAbort.abort(); } catch {}
    }
  }
  // 操作成功后调一下：中断当前 4s 长轮询，立刻发新一轮，把刚改的状态拉回来。
  // 不动 polling 标志，循环会自然进下一圈（aborted 分支跳过 1.5s 退避）。
  function pokePoll() {
    if (onlineState && onlineState.pollAbort) {
      try { onlineState.pollAbort.abort(); } catch {}
    }
  }

  function applyServerOnlineState(srv) {
    if (!srv || !onlineState) return;
    // 防止"过期"的轮询响应回滚乐观状态：
    // - 乐观操作后置 onlineState._expectedVersion = lastVersion + 1（"我期望服端 version 至少这么大"）
    // - 在 POST 真的把 version 推到 _expectedVersion 之前，如果 in-flight 长轮询的 4s 超时先返回，
    //   它会带回 OLD 状态（没有 AI），把刚 push 进 onlineState.players 的乐观 AI 抹掉
    // - 现在 srv.version < expectedVersion 时直接忽略整条响应，等 POST 自己把状态推上来
    const expV = onlineState._expectedVersion || 0;
    const srvV = typeof srv.version === 'number' ? srv.version : 0;
    if (srvV > 0 && expV > 0 && srvV < expV) return;
    // 同一 version 重复推也不用做事
    if (srvV > 0 && srvV < (onlineState.lastVersion || 0)) return;

    onlineState.lastVersion = srv.version || 0;
    onlineState.players = srv.players || [];
    onlineState.hostPlayerId = srv.hostPlayerId;
    onlineState.config = srv.config;
    if (srvV >= expV) onlineState._expectedVersion = 0;
    const wasState = onlineState.srvState;
    onlineState.srvState = srv.state;
    onlineState.firstLeader = (typeof srv.firstLeader === 'number') ? srv.firstLeader : null;
    const me = (srv.players || []).find(p => p.id === onlineState.playerId);
    if (me) {
      onlineState.isHost = !!me.isHost;
      onlineState.mySeat = (typeof me.seat === 'number') ? me.seat : null;
    } else if (onlineState.playerId && srv.state !== 'dissolved') {
      // 我在服端 projection 里没了 → 我被踢/移除了 → 强退房
      toast('你已离开房间');
      leaveRoom(true);
      return;
    }
    if (srv.state === 'dissolved') {
      toast('房间已解散');
      leaveRoom(true);
      return;
    }
    // 加入者：第一条 server state 到了，现在才揭开大厅（之前停在 PGO「加入中…」）。
    if (onlineState._revealPending) {
      onlineState._revealPending = false;
      setOnlineHint('');
      revealLobby();
    }
    // 本地正在跑 swap / 旋转动画：onlineState.players 已经同步成 srv 的真状态，
    // 但 DOM 里那两个 seat-inner 正在 FLIP transition 中——如果这里 renderLobby
    // 会清掉 innerHTML 重建，动画就被掐了。所以动画期间跳过重绘，等动画完成后由
    // sendSwapSeats / rotateLobbyToSouth 的回调里收尾再绘一次。
    // _swapPhase 在 swap 动画 → hold（金边保留）阶段也设置，同样跳过重绘。
    if (!onlineState._animating && !onlineState._swapPhase) renderLobby(srv);
    // 加入者进房后自动落座（让房主立刻看到人、加入者明确不是房主）
    maybeAutoSit(srv);
    // 联网模式中：每当服务器 game 状态变更，刷新本地牌局（AI 回合的进展 / 其他人出牌）
    if (srv.state === 'playing' && srv.game && state.isNetworked && !onlineState._startedTransition) {
      applyServerGameState(srv.game);
    }
    // 状态从 lobby → playing 的第一次跃迁：触发"我滑到 bottom-left"动画
    if (wasState !== 'playing' && srv.state === 'playing' && !onlineState._startedTransition) {
      onlineState._startedTransition = true;
      triggerLobbyToGameTransition(srv);
    }
  }

  // 房主点了开始游戏 → 服务端进入 playing → 先跑一段旋转动画把"我"从当前座位
  // 滑到 south（lobby 期间座位是固定映射，我可能在 right/top/left），然后才开本地对局。
  //   Phase 1 没有真正的多人对局同步，每个人各自开 3 AI 的本地局。
  function triggerLobbyToGameTransition(srv) {
    const cfg = (srv && srv.config) || {};
    const lvl = cfg.aiLevel || state.aiLevel;
    // Phase 2: 服务器权威 —— 不再停止轮询（接下来整盘靠服务器喂状态），不设 onlineState=null
    if (['easy','normal','hard'].includes(lvl)) {
      state.aiLevel = lvl;
      try { syncPgoDiff(); } catch {}
      try { persist(); } catch {}
    }
    if (cfg.options) {
      state.options = normalizeOptions(cfg.options);
      try { syncPgoOptions(); } catch {}
      try { persist(); } catch {}
    }
    rotateLobbyToSouth(() => {
      if (onlineEls.lobby) {
        onlineEls.lobby.hidden = true;
        onlineEls.lobby.classList.remove('starting');
      }
      if (els.table) els.table.classList.remove('gd-in-lobby');
      if (els.pgo) els.pgo.classList.remove('open');
      // Phase 2: 从服务器 game 视图初始化本地状态（替代 Phase 1 的本地 startMatch()）
      if (srv && srv.game) startNetworkedGame(srv.game);
      else startMatch();   // 兜底：如果服务器没带 game（旧版/降级），走本地局
    });
  }
  // 开局旋转动画：lobby 是固定映射，我可能视觉上不在 bottom；现在打开 preStartRotation
  // 重绘成"我在 bottom"，并用 FLIP 把 4 个 seat-inner 从旧位置平移过去再 transition 回 0。
  // mySeat == 0（本来就在 bottom）的话不需要动画，直接 callback。
  function rotateLobbyToSouth(callback) {
    if (!onlineState || !onlineEls.seatBottom) { callback(); return; }
    const mySeat = (typeof onlineState.mySeat === 'number') ? onlineState.mySeat : 0;
    if (mySeat === 0) { callback(); return; }
    const cells = [onlineEls.seatBottom, onlineEls.seatRight, onlineEls.seatTop, onlineEls.seatLeft];
    // 旋转前：server seat S 在 cells[S]。捕获每个 inner 的 rect。
    const oldRects = {};
    for (let s = 0; s < 4; s++) {
      const inner = cells[s].querySelector('.seat-inner');
      if (inner) oldRects[s] = inner.getBoundingClientRect();
    }
    // 打开旋转 + 重绘：现在 server seat S → cells[(S - mySeat + 4) % 4]
    onlineState.preStartRotation = true;
    onlineState._animating = true;
    renderLobbyOptimistic();
    // 对每个 display cell d，里面装的是 server seat (d + mySeat) % 4；它原本在 cells[s] = cells[(d + mySeat) % 4]，旧 rect 在 oldRects[s]
    const inners = [];
    for (let d = 0; d < 4; d++) {
      const s = (d + mySeat) % 4;
      const inner = cells[d].querySelector('.seat-inner');
      if (!inner || !oldRects[s]) continue;
      const newRect = inner.getBoundingClientRect();
      const dx = oldRects[s].left - newRect.left;
      const dy = oldRects[s].top - newRect.top;
      inner.style.transition = 'none';
      inner.style.transform = `translate(${dx}px, ${dy}px)`;
      inners.push(inner);
    }
    // 强制 reflow，再加 transition 滑回 0
    void document.body.offsetHeight;
    const DUR_MS = 700;
    for (const inner of inners) {
      inner.style.transition = `transform ${DUR_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      inner.style.transform = '';
    }
    setTimeout(() => {
      for (const inner of inners) { inner.style.transition = ''; }
      callback();
    }, DUR_MS + 60);
  }
  // 交换两座的 FLIP 动画：cell 本身不动，只动两个 seat-inner —— 各自从对方的旧位置
  // 平移到自己的当前位置（identity），用 transform transition 回 0 形成滑动效果。
  function flipSwapAnimation(seatA, seatB, oldRectA, oldRectB) {
    if (!oldRectA || !oldRectB) return;
    const cellA = displayCellForSeat(seatA);
    const cellB = displayCellForSeat(seatB);
    const innerA = cellA && cellA.querySelector('.seat-inner');
    const innerB = cellB && cellB.querySelector('.seat-inner');
    const inners = [];
    if (innerA) {
      const nr = innerA.getBoundingClientRect();
      const dx = oldRectB.left - nr.left, dy = oldRectB.top - nr.top;
      innerA.style.transition = 'none';
      innerA.style.transform = `translate(${dx}px, ${dy}px)`;
      inners.push(innerA);
    }
    if (innerB) {
      const nr = innerB.getBoundingClientRect();
      const dx = oldRectA.left - nr.left, dy = oldRectA.top - nr.top;
      innerB.style.transition = 'none';
      innerB.style.transform = `translate(${dx}px, ${dy}px)`;
      inners.push(innerB);
    }
    void document.body.offsetHeight;
    const DUR_MS = 380;
    for (const inner of inners) {
      inner.style.transition = `transform ${DUR_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      inner.style.transform = '';
    }
    return DUR_MS + 60;
  }

  // ---- lobby render ----
  function escGdHtml(s) {
    return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  // 4 个座位 lobby 期间走"固定映射"：server seat S → 永远落在 LOBBY_POSITIONS[S]
  //   pos 0 = bottom, 1 = right, 2 = top, 3 = left
  // 不再绕"我"轮转 —— 每个玩家看到的座位布局都是绝对的：我坐 seat 2 就视觉在 top。
  // 队伍颜色按奇偶（同奇偶 = 同队，mySeat 已知时跟随；未坐下时按 0/2 默认同队）。
  // 开局瞬间（onlineState.preStartRotation = true）才打开"旋转到我在 south"映射，
  // 配合 FLIP 动画把 4 个座位的 inner 平移过去。
  const LOBBY_POSITIONS = ['bottom', 'right', 'top', 'left'];
  const LOBBY_AI_ICONS = ['🤖', '🦊', '🤝', '🐱'];

  // 给定 server seat 号，返回它当前应该落在哪个 display cell（DOM 元素）。
  // lobby 期间是 identity；开局动画期间按 preStartRotation 把 mySeat 推到 bottom。
  function displayIdxForSeat(s) {
    if (!onlineState) return s;
    if (!onlineState.preStartRotation) return s;
    const mySeat = (typeof onlineState.mySeat === 'number') ? onlineState.mySeat : 0;
    return (s - mySeat + 4) % 4;
  }
  function displayCellForSeat(s) {
    const idx = displayIdxForSeat(s);
    const cells = [onlineEls.seatBottom, onlineEls.seatRight, onlineEls.seatTop, onlineEls.seatLeft];
    return cells[idx];
  }

  function renderLobby(srv) {
    if (!onlineEls.seatBottom) return;
    const seatedMap = {};
    const standing = [];
    for (const p of srv.players || []) {
      if (typeof p.seat === 'number' && p.seat >= 0 && p.seat < 4) seatedMap[p.seat] = p;
      else standing.push(p);
    }
    const posEls = {
      bottom: onlineEls.seatBottom,
      right:  onlineEls.seatRight,
      top:    onlineEls.seatTop,
      left:   onlineEls.seatLeft,
    };
    // 清空 + 复位 class
    for (const k of Object.keys(posEls)) {
      posEls[k].innerHTML = '';
      posEls[k].className = 'gd-lobby-seat at-' + k;
    }
    const mySeatRaw = (typeof onlineState.mySeat === 'number') ? onlineState.mySeat : null;
    const myParity = (mySeatRaw == null) ? 0 : (mySeatRaw % 2);
    const isHost = !!onlineState.isHost;
    // 选中的座位若已空（例如被踢/移除），自动清掉金边
    if (typeof onlineState.swapSelected === 'number' && !seatedMap[onlineState.swapSelected]) {
      onlineState.swapSelected = null;
    }
    if (typeof onlineState.swapPending === 'number' && !seatedMap[onlineState.swapPending]) {
      onlineState.swapPending = null;
    }
    const swapSel = (typeof onlineState.swapSelected === 'number') ? onlineState.swapSelected : null;
    const swapPend = (typeof onlineState.swapPending === 'number') ? onlineState.swapPending : null;
    let seatedCount = 0;
    for (let s = 0; s < 4; s++) {
      const displayIdx = displayIdxForSeat(s);
      const pos = LOBBY_POSITIONS[displayIdx];
      const cell = posEls[pos];
      // 队伍颜色按奇偶
      cell.classList.add((s % 2 === myParity) ? 'team-you' : 'team-opp');
      const p = seatedMap[s];
      // 内容包装层：方便 swap / 开局旋转 用 transform 做 FLIP 动画
      const inner = document.createElement('div');
      inner.className = 'seat-inner';
      if (!p) {
        // 空座：大灰头像 + "坐下"
        cell.classList.add('empty');
        const av = document.createElement('div');
        av.className = 'avatar';
        av.textContent = '👤';
        const nick = document.createElement('div');
        nick.className = 'nick';
        const badges = document.createElement('div');
        badges.className = 'badges';
        // 谁能点这个空座：
        //   - 房主：随时可坐（也是房主换座的唯一方式 = 直接点目标空座）
        //   - 非房主：只有 mySeat == null（还没初次入座）时能坐
        const canSit = isHost || (mySeatRaw == null);
        if (canSit) {
          nick.textContent = '坐下';
          const sit = () => sendSit(s);
          av.addEventListener('click', sit);
          nick.addEventListener('click', sit);
        } else {
          nick.textContent = '虚位';
          av.style.cursor = 'default';
          nick.style.cursor = 'default';
        }
        inner.appendChild(av);
        inner.appendChild(nick);
        inner.appendChild(badges);
        cell.appendChild(inner);
        // 「🤖 加机器人」浮泡：只房主有；它 position: absolute，必须挂 cell 上不挂 inner
        if (isHost) {
          const aiBtn = document.createElement('button');
          aiBtn.className = 'add-ai-btn';
          aiBtn.textContent = '🤖 加机器人';
          aiBtn.addEventListener('click', (e) => { e.stopPropagation(); sendAddAi(s); });
          cell.appendChild(aiBtn);
        }
      } else {
        seatedCount++;
        const isMe = p.id === onlineState.playerId;
        // 头像金边：手动 swap 选中的两侧都点亮，让"我点了"和"准备换那位"同时可见
        if (swapSel === s || swapPend === s) cell.classList.add('swap-selected');
        const av = document.createElement('div');
        av.className = 'avatar';
        av.textContent = p.isAi ? '🤖' : (isMe ? '😎' : LOBBY_AI_ICONS[s] || '👤');
        // 房主点已有玩家头像 → 进入/确认换座选择
        if (isHost) {
          av.style.cursor = 'pointer';
          av.addEventListener('click', (e) => { e.stopPropagation(); handleHostAvatarClick(s); });
        }
        const nick = document.createElement('div');
        nick.className = 'nick';
        nick.textContent = p.nick;
        const badges = document.createElement('div');
        badges.className = 'badges';
        const addBadge = (cls, text) => {
          const b = document.createElement('span');
          b.className = 'badge ' + cls;
          b.textContent = text;
          badges.appendChild(b);
        };
        if (p.isHost) addBadge('host', '房主');
        if (isMe) addBadge('me', '我');
        if (p.isAi) addBadge('ai', 'AI');
        if (!p.online) addBadge('offline', '离线');
        inner.appendChild(av);
        inner.appendChild(nick);
        inner.appendChild(badges);
        // 房主对真人/AI 的操作（踢 / 让位 / 移除）—— 放在 inner 里随 FLIP 一起飞
        if (isHost && !isMe) {
          const acts = document.createElement('div');
          acts.className = 'seat-actions';
          if (p.isAi) {
            const rmBtn = document.createElement('button');
            rmBtn.className = 'gd-btn mini';
            rmBtn.textContent = '移除';
            rmBtn.addEventListener('click', (e) => { e.stopPropagation(); sendRemoveAi(s); });
            acts.appendChild(rmBtn);
          } else {
            const kickBtn = document.createElement('button');
            kickBtn.className = 'gd-btn mini';
            kickBtn.textContent = '踢';
            kickBtn.addEventListener('click', (e) => { e.stopPropagation(); sendKick(p.id); });
            acts.appendChild(kickBtn);
            const xferBtn = document.createElement('button');
            xferBtn.className = 'gd-btn mini';
            xferBtn.textContent = '让位';
            xferBtn.title = '转交房主给 ' + p.nick;
            xferBtn.addEventListener('click', (e) => { e.stopPropagation(); sendTransferHost(p.id); });
            acts.appendChild(xferBtn);
          }
          inner.appendChild(acts);
        }
        cell.appendChild(inner);
      }
    }
    // 旁观者（standing） — Phase 1 暂时不渲染；他们可以点空座位坐下。
    // 入座计数 + 中央按钮切换：
    //   房主 + 4 坐满 → 把"邀请好友"换成"开始游戏"；其余时刻保持 邀请好友 + 离开房间
    if (onlineEls.seated) onlineEls.seated.textContent = seatedCount + '/4';
    const ready = onlineState.isHost && seatedCount === 4;
    const inviteBtn = $('gdCopyLinkBtn');
    if (onlineEls.startBtn && inviteBtn) {
      if (ready) {
        inviteBtn.hidden = true;
        onlineEls.startBtn.hidden = false;
        onlineEls.startBtn.disabled = false;
        onlineEls.startBtn.textContent = '🎮 开始游戏';
      } else {
        inviteBtn.hidden = false;
        onlineEls.startBtn.hidden = true;
      }
    }
    if (srv.state === 'playing' && typeof srv.firstLeader === 'number') {
      if (onlineEls.startBtn && inviteBtn) {
        inviteBtn.hidden = true;
        onlineEls.startBtn.hidden = false;
        onlineEls.startBtn.disabled = true;
        onlineEls.startBtn.textContent = '🎲 抽签：座 ' + (srv.firstLeader + 1) + ' 首出';
      }
    }
  }

  // ---- actions ----
  // 后端在每个动作的成功响应里都带回 state（新 server projection），客户端直接 apply，
  // 省掉等下一轮 GET state 的 RTT —— 把"点一下要等 ~600ms 才更新"的根因（POST + 二次
  // 轮询拉状态）干掉。第二步把 RTT 也藏起来：本地乐观更新 onlineState.players + 立刻
  // 重绘 lobby，UI 0 延迟就改了；POST 在后台跑，回来用服务端真状态 reconcile（同一结果
  // 直接覆盖，无视觉变化；万一被拒就 revert + toast 报错）。
  function applyActionResult(r) {
    if (r && r.ok && r.data && r.data.state) {
      applyServerOnlineState(r.data.state);
    }
    if (r && r.ok) pokePoll();
  }
  // 用 onlineState 本地状态合成一个仿 srv 对象，喂给 renderLobby（乐观重绘用）。
  function renderLobbyOptimistic() {
    if (!onlineState) return;
    renderLobby({
      players: onlineState.players,
      state: onlineState.srvState || 'lobby',
      firstLeader: onlineState.firstLeader,
      hostPlayerId: onlineState.hostPlayerId,
      config: onlineState.config,
    });
  }
  // 应用乐观补丁 + 重绘；返回 snapshot（用于失败回滚）。
  // _expectedVersion = "我期望服端 version 至少推到这里，比这早的轮询/POST 响应都别覆盖"
  // 关键：连续多次乐观操作时必须**累积**地 +1，而不是每次都重置成 lastVersion+1：
  //   反例：T=0 点 add 设 expV=V+1；T=50 点 remove 又设 expV=V+1（lastVersion 还是 V）；
  //   POST add 先回（srvV=V+1=expV，不跳）→ 把"已乐观 remove 后的 players=[host]"覆盖回
  //   [host, real_AI] → 用户看到刚删的 AI 又回来了。
  //   正解：T=50 时 base 应该取 max(当前 expV, lastVersion)=V+1，再 +1 → expV=V+2，
  //   POST add 响应 srvV=V+1 < V+2 → 跳过，等 POST remove 的 srvV=V+2 才真正应用。
  function applyOptimistic(patchFn) {
    if (!onlineState) return null;
    const snap = JSON.stringify(onlineState.players);
    try { patchFn(onlineState.players); } catch {}
    const baseV = Math.max(onlineState._expectedVersion || 0, onlineState.lastVersion || 0);
    onlineState._expectedVersion = baseV + 1;
    renderLobbyOptimistic();
    pokePoll();
    return snap;
  }
  function revertOptimistic(snap) {
    if (!onlineState || snap == null) return;
    try { onlineState.players = JSON.parse(snap); } catch { return; }
    // 用 me 字段把 mySeat 也回滚
    const me = onlineState.players.find(p => p.id === onlineState.playerId);
    onlineState.mySeat = me && typeof me.seat === 'number' ? me.seat : null;
    onlineState._expectedVersion = 0;  // 不再等乐观 version 推上来
    renderLobbyOptimistic();
  }

  // 处理 add_ai / remove_ai 响应：
  //   r.ok                → 正常 applyActionResult（含 state，覆盖 expV 校验）
  //   seat_taken / no_ai_at_seat → "soft 错误"：服端状态本来就是用户最终想要的方向
  //     （我们想 add → 已经有人；我们想 remove → 早就没了），不报错、不 revert。
  //     这俩响应已带 state，把 _expectedVersion 清零后直接 apply，让乱序 POST 不卡住。
  //   其他硬错（room_not_found / 403 等） → revert + toast
  // soft 错误最常见的来源就是用户在 ~50ms 内连点 add+remove+add 让 POST 在服端乱序：
  // 不阻塞用户、不弹错、客户端跟着服端状态走最自然。
  function handleAiActionResp(r, snap) {
    if (r.ok) { applyActionResult(r); return; }
    if ((r.error === 'seat_taken' || r.error === 'no_ai_at_seat') && r.data && r.data.state) {
      // 强制接受：清掉乐观期望，让 applyServerOnlineState 不被版本校验跳过
      if (onlineState) onlineState._expectedVersion = 0;
      applyServerOnlineState(r.data.state);
      return;
    }
    revertOptimistic(snap);
    toast(errText(r.error));
  }
  async function sendSit(seat) {
    if (!onlineState) return;
    const snap = applyOptimistic(players => {
      const me = players.find(p => p.id === onlineState.playerId);
      if (me) me.seat = seat;
    });
    onlineState.mySeat = seat;
    const r = await gdApi('sit', { body: { code: onlineState.code, token: onlineState.token, seat } });
    if (!r.ok) { revertOptimistic(snap); toast(errText(r.error)); }
    else applyActionResult(r);
  }
  async function sendAddAi(seat) {
    if (!onlineState) return;
    const snap = applyOptimistic(players => {
      players.push({
        id: '_optimistic_ai_' + seat + '_' + (onlineState._expectedVersion | 0),
        seat,
        nick: 'AI · ' + (seat + 1),
        isAi: true,
        online: true,
        isHost: false,
      });
    });
    const r = await gdApi('add_ai', { body: { code: onlineState.code, token: onlineState.token, seat } });
    handleAiActionResp(r, snap);
  }
  async function sendRemoveAi(seat) {
    if (!onlineState) return;
    const snap = applyOptimistic(players => {
      const i = players.findIndex(p => p.seat === seat && p.isAi);
      if (i >= 0) players.splice(i, 1);
    });
    const r = await gdApi('remove_ai', { body: { code: onlineState.code, token: onlineState.token, seat } });
    handleAiActionResp(r, snap);
  }
  async function sendKick(targetPid) {
    if (!onlineState) return;
    if (!confirm('确认踢出这位玩家？')) return;
    const snap = applyOptimistic(players => {
      const i = players.findIndex(p => p.id === targetPid);
      if (i >= 0) players.splice(i, 1);
    });
    const r = await gdApi('kick', { body: { code: onlineState.code, token: onlineState.token, targetPid } });
    if (!r.ok) { revertOptimistic(snap); toast(errText(r.error)); }
    else applyActionResult(r);
  }
  async function sendTransferHost(targetPid) {
    if (!onlineState) return;
    if (!confirm('确认把房主让给这位玩家？')) return;
    // 转交房主是状态变化大、和客户端身份判定耦合的动作 —— 不做乐观，等服务端 reconcile。
    const r = await gdApi('transfer_host', { body: { code: onlineState.code, token: onlineState.token, targetPid } });
    if (!r.ok) toast(errText(r.error));
    else applyActionResult(r);
  }
  // swap 的两阶段时间线：
  //   T0 → T0+animMs       : '_swapPhase = animating'，FLIP transition 进行中，禁止新一轮 swap
  //   T0+animMs → +HOLD_MS : '_swapPhase = holding'，金边保留 500ms 给用户反应
  //                          这期间点别人头像 = 立刻清掉旧金边 + 开新一轮选中
  //   T0+animMs+HOLD_MS    : 清 _swapPhase + swapSelected/Pending，重绘 lobby
  // _animating 在整段 swap 期间都为 true，让 applyServerOnlineState 不要清 DOM
  // （但 _swapPhase 也参与判断，两个变量加起来更直白）
  const SWAP_HOLD_MS = 500;
  function clearSwapTimers() {
    if (!onlineState) return;
    if (onlineState._swapAnimTimer) { clearTimeout(onlineState._swapAnimTimer); onlineState._swapAnimTimer = null; }
    if (onlineState._swapHoldTimer) { clearTimeout(onlineState._swapHoldTimer); onlineState._swapHoldTimer = null; }
  }
  async function sendSwapSeats(seatA, seatB) {
    if (!onlineState) return;
    clearSwapTimers();
    const cellA = displayCellForSeat(seatA);
    const cellB = displayCellForSeat(seatB);
    const innerA = cellA && cellA.querySelector('.seat-inner');
    const innerB = cellB && cellB.querySelector('.seat-inner');
    const oldRectA = innerA ? innerA.getBoundingClientRect() : null;
    const oldRectB = innerB ? innerB.getBoundingClientRect() : null;

    onlineState._animating = true;
    onlineState._swapPhase = 'animating';
    const snap = applyOptimistic(players => {
      const a = players.find(p => p.seat === seatA);
      const b = players.find(p => p.seat === seatB);
      if (a && b) { a.seat = seatB; b.seat = seatA; }
    });

    const animMs = flipSwapAnimation(seatA, seatB, oldRectA, oldRectB) || 0;

    // 动画结束 → 切到 hold 阶段；hold 结束 → 清金边 + 重绘
    onlineState._swapAnimTimer = setTimeout(() => {
      if (!onlineState) return;
      onlineState._swapAnimTimer = null;
      onlineState._swapPhase = 'holding';
      onlineState._swapHoldTimer = setTimeout(() => {
        if (!onlineState) return;
        onlineState._swapHoldTimer = null;
        onlineState._swapPhase = null;
        onlineState._animating = false;
        onlineState.swapSelected = null;
        onlineState.swapPending = null;
        renderLobbyOptimistic();
      }, SWAP_HOLD_MS);
    }, animMs);

    const r = await gdApi('swap_seats', { body: { code: onlineState.code, token: onlineState.token, seatA, seatB } });
    if (!r.ok) {
      // 罕见：服端拒绝（房间已解散等）→ 取消计时器 + 回滚 + 报错
      if (onlineState) {
        clearSwapTimers();
        onlineState._swapPhase = null;
        onlineState._animating = false;
      }
      revertOptimistic(snap);
      toast(errText(r.error));
      return;
    }
    applyActionResult(r);
  }
  // 房主点已坐玩家头像：
  //   第一次点 → 该座金边
  //   同一座再点 → 取消
  //   点另一座 → 两座都金边（让"我要换的对象"也立刻反馈）+ 发 swap 请求
  //   swap 动画完进入 hold 阶段（金边保留 500ms）期间再点 → 立刻清旧金边 + 新一轮选中
  function handleHostAvatarClick(seat) {
    if (!onlineState || !onlineState.isHost) return;
    // 动画阶段（avatar 飞行中）禁止打断
    if (onlineState._swapPhase === 'animating') return;
    // hold 阶段：用户点了别的 → 立刻取消金边自动消失，并作为新一轮选中起点
    if (onlineState._swapPhase === 'holding') {
      clearSwapTimers();
      onlineState._swapPhase = null;
      onlineState._animating = false;
      onlineState.swapSelected = null;
      onlineState.swapPending = null;
    }
    const sel = onlineState.swapSelected;
    if (sel == null) {
      onlineState.swapSelected = seat;
      onlineState.swapPending = null;
      renderLobbyOptimistic();
      return;
    }
    if (sel === seat) {
      onlineState.swapSelected = null;
      onlineState.swapPending = null;
      renderLobbyOptimistic();
      return;
    }
    onlineState.swapPending = seat;
    renderLobbyOptimistic();
    sendSwapSeats(sel, seat);
  }
  if (onlineEls.startBtn) {
    onlineEls.startBtn.addEventListener('click', async () => {
      if (!onlineState || !onlineState.isHost) return;
      const r = await gdApi('start', { body: { code: onlineState.code, token: onlineState.token } });
      if (!r.ok) toast(errText(r.error));
      else pokePoll();
    });
  }
  if (onlineEls.copyCodeBtn) {
    onlineEls.copyCodeBtn.addEventListener('click', () => copyText(onlineState && onlineState.code));
  }
  if (onlineEls.copyLinkBtn) {
    onlineEls.copyLinkBtn.addEventListener('click', () => {
      if (!onlineState) return;
      copyText(location.origin + location.pathname + '?room=' + onlineState.code);
    });
  }
  function copyText(t) {
    if (!t) return;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('已复制')).catch(() => toast('复制失败，请手动'));
    else toast('请手动复制：' + t);
  }

  // ---- beforeunload: best-effort 用 sendBeacon 通知 leave ----
  window.addEventListener('beforeunload', () => {
    if (onlineState && onlineState.token) {
      try {
        const body = JSON.stringify({ code: onlineState.code, token: onlineState.token });
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(GUANDAN_API + '?action=leave', blob);
      } catch {}
    }
  });

  // ---- URL ?room=xxxx 自动进入"加入"流程 ----
  (function autoJoinFromUrl() {
    const m = location.search.match(/[?&]room=(\d{4})/);
    if (!m) return;
    const code = m[1];
    // 切到联机 + 加入 tab
    const onlineBtn = onlineEls.pgoPlayMode && onlineEls.pgoPlayMode.querySelector('[data-playmode="online"]');
    if (onlineBtn) onlineBtn.click();
    const joinTab = onlineEls.tabs && onlineEls.tabs.querySelector('[data-tab="join"]');
    if (joinTab) joinTab.click();
    if (onlineEls.code) onlineEls.code.value = code;
    const savedNick = gdGetNick();
    if (savedNick) {
      onlineEls.nick.value = savedNick;
      setTimeout(() => { onlineEls.submit && onlineEls.submit.click(); }, 200);
    } else {
      onlineEls.nick && onlineEls.nick.focus();
      setOnlineHint('输入昵称后按回车自动加入房间');
    }
  })();

})();
