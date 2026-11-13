/* 百变小咪 · 机器人（浏览器 window.ZhamaoAI / Node require 共用，无 DOM）
 *
 * 机器人只能看 R.view(state, seat)：自己的手牌、公开信息、自己亲眼看到的（窥探 / 自己塞回的炸毛猫 / 被蹭走偷走的牌）。
 * 决策点：act（出什么 / 摸牌）、react（要不要作废）、give（被索要时给哪张）、pick（五张各不同捡哪张）、
 *         insert（炸毛猫塞哪）、alter（改命怎么排）、steal（偷哪张——扣着的牌没信息，随便点）。
 *
 * 三档：
 *   easy   入门：大多直接摸牌，偶尔随手出张牌；炸毛猫随便塞
 *   normal 普通：算牌堆顶是炸毛猫的概率（规则公开了「最近一次谁塞回炸毛猫、之后摸走几张」时，按它估计那只猫在哪），
 *          危险就窥探 / 躲 / 甩锅，知道顶上是炸毛猫就躲；没逗猫棒时想办法偷。阈值和牌值是自博弈调出来的（2026-11，~/zhamao-rl）
 *   hard   高手：以「普通」为底，出牌和塞炸毛猫用 PIMC——按自己知道的信息随机补全别人手牌和牌堆，
 *          每个候选在同一批假想局面里用「普通」打到底；出牌只有明显比普通的选择好（名次分高 ANCHOR）才换（防噪声乱换）
 *
 * 两套参数：规则的 view 里有 ins 字段（公开塞猫历史）用 P_HIST，没有用 P_BASE（两套都是调出来的，互相不通用）。
 */
(function (root, factory) {
  const api = factory(root.ZhamaoRules || (typeof require === 'function' ? require('./zhamao-rules.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoAI = api;
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  const K = R.KIND_OF;
  const TIERS = Object.freeze(['easy', 'normal', 'hard']);
  const TIER_NAMES = Object.freeze({ easy: '入门', normal: '普通', hard: '高手' });

  /* ───── 调参结果（交叉熵搜索 + 自博弈，详见 ~/zhamao-rl/REPORT.md） ─────
   * v*        牌「留着有多值钱」（给牌 / 捡牌 / 交换 / 三张点名用），逗猫棒固定 100
   * look*     顶上是炸毛猫的概率 ≥ 它就窥探 / 改命（Def = 手里有逗猫棒，No = 没有）
   * dodge*    概率 ≥ 它就甩锅 / 跳过 / 抽底躲开
   * multiAtk  被甩锅（还要摸 ≥2 回合）时概率 ≥ 它就把锅甩出去
   * insTop    （普通）塞回炸毛猫时放最上面的概率，否则放第 1..insSpread 位
   * nopeBackP 我的躲闪牌被作废时，顶上危险 ≥ 它就再作废回去
   * bottomDef 有逗猫棒、底牌未知时也用抽底躲
   * histW / histTop  估计别人刚塞回的炸毛猫：信这条历史的权重 / 认为他塞在最上面的概率
   * shuffleAt 顶上危险 ≥ 它、又没别的躲法时洗牌 */
  const P_BASE = Object.freeze({
    vNope: 20.094, vTattack: 40.692, vAttack: 23.992, vSwap: 8.596, vSkip: 12.89, vBottom: 25.25, vAlter: 41.225, vFuture: 18.315,
    vShuffle: 26.922, vFavor: 16.236, vCatPair: 6.397, vCatSingle: 3.559,
    lookDef: 0.539, lookNo: 0.005, dodgeDef: 0.844, dodgeNo: 0.021, multiAtk: 0.047,
    insTop: 0.986, insSpread: 2, nopeBackP: 0.751, bottomDef: 0, histW: 0, histTop: 0, shuffleAt: 2,
    swapMargin: 20, swapUnk: 12,
  });
  const P_HIST = Object.freeze({
    vNope: 35.38, vTattack: 31.125, vAttack: 55.499, vSwap: 2.029, vSkip: 21.424, vBottom: 10.926, vAlter: 34.115, vFuture: 12.706,
    vShuffle: 10.197, vFavor: 11.578, vCatPair: 29.18, vCatSingle: 7.359,
    lookDef: 0.632, lookNo: 0.016, dodgeDef: 0.709, dodgeNo: 0.213, multiAtk: 0.075,
    insTop: 0.96, insSpread: 2, nopeBackP: 0.494, bottomDef: 1, histW: 0.994, histTop: 0.733, shuffleAt: 0.56,
    swapMargin: 20, swapUnk: 12,
  });

  /* 入门（2026-11-13 起）= 原来线上「普通」的那套常数：排行赛里它和原来的高手同属第三梯队，原来的入门远低于它，不再用 */
  const P_OLD = Object.freeze({
    vNope: 30, vTattack: 28, vAttack: 26, vSwap: 22, vSkip: 20, vBottom: 18, vAlter: 17, vFuture: 15, vShuffle: 13, vFavor: 10, vCatPair: 7, vCatSingle: 2,
    lookDef: 0.22, lookNo: 0.10, dodgeDef: 0.45, dodgeNo: 0.20, multiAtk: 0.12,
    insTop: 0.6, insSpread: 3, nopeBackP: 0.3, bottomDef: 0, histW: 0, histTop: 0.6, shuffleAt: 2,
    swapMargin: 20, swapUnk: 12,
  });

  const has = (v, k) => R.countKind(v.hand, k) > 0;
  const one = (v, k) => R.findKind(v.hand, k);
  const pickRand = (arr, rng) => arr[(rng() * arr.length) | 0];
  function nextAliveV(v, seat) {
    for (let i = 1; i <= v.n; i++) { const t = (seat + i) % v.n; if (v.alive[t]) return t; }
    return seat;
  }
  function targets(v) {
    const out = [];
    for (let t = 0; t < v.n; t++) if (t !== v.me && v.alive[t] && v.counts[t] > 0) out.push(t);
    return out;
  }
  /* 偷谁：知道他手里有逗猫棒的优先，其次手牌最多的 */
  function richest(v, wantKind) {
    let best = -1, score = -1;
    for (const t of targets(v)) {
      const knows = wantKind ? v.handKnown[t].some((id) => K[id] === wantKind) : false;
      const sc = v.counts[t] + (knows ? 100 : 0);
      if (sc > score) { score = sc; best = t; }
    }
    return best;
  }
  /* 指定甩锅甩给谁：手牌最少的（最可能没有逗猫棒 / 作废），知道他有逗猫棒的往后排 */
  function victim(v) {
    let best = -1, score = Infinity;
    for (let t = 0; t < v.n; t++) {
      if (t === v.me || !v.alive[t]) continue;
      const knowsDef = v.handKnown[t].some((id) => K[id] === R.DEFUSE);
      const sc = v.counts[t] + (knowsDef ? 50 : 0);
      if (sc < score) { score = sc; best = t; }
    }
    return best;
  }
  function playMove(cards, target, named) {
    const m = { type: 'play', cards };
    if (target != null && target >= 0) m.target = target;
    if (named) m.named = named;
    return m;
  }
  const DRAW = Object.freeze({ type: 'draw' });
  function pairsOf(v) {
    const by = {};
    for (const id of v.hand) { const k = K[id]; (by[k] = by[k] || []).push(id); }
    return by;
  }
  // 五种猫各一张（规则只认猫）：每种挑一张，缺的拿万能猫顶；顶不上就凑不成
  function fiveCats(v) {
    const picks = [], wild = v.hand.filter((id) => K[id] === R.WILD);
    for (const k of R.CATS) {
      let id = one(v, k);
      if (id == null) id = wild.shift();
      if (id == null) return null;
      picks.push(id);
    }
    return picks;
  }
  // 猫种 k 凑 n 张：先用真猫，不够拿万能猫补；一张真猫都没有就不凑（两张以上万能猫自己就是一样的牌，走 by.wild）
  function catSet(by, k, n) {
    const real = by[k] || [], wild = by[R.WILD] || [];
    if (!real.length || real.length + wild.length < n) return null;
    return real.slice(0, n).concat(wild.slice(0, Math.max(0, n - real.length)));
  }
  // 一对猫：纯的优先，其次真猫 + 万能猫，最后两张万能猫
  function catPair(by) {
    for (const k of R.CATS) if ((by[k] || []).length >= 2) return by[k].slice(0, 2);
    for (const k of R.CATS) { const c = catSet(by, k, 2); if (c) return c; }
    return (by[R.WILD] || []).length >= 2 ? by[R.WILD].slice(0, 2) : null;
  }
  function bottomInfo(v) {
    const b = v.known.find((x) => x.pos === v.deckSize - 1);
    if (b) return { known: true, boom: K[b.id] === R.BOOM };
    return { known: false, boom: false };
  }
  const bottomOk = (v) => has(v, R.BOTTOM) && v.deckSize > 1 && !bottomInfo(v).boom;



  /* ───── 普通（一套参数一个实例） ───── */
  function makeNormal(P) {
    const VALUE = { defuse: 100, nope: P.vNope, tattack: P.vTattack, attack: P.vAttack, swap: P.vSwap, skip: P.vSkip, bottom: P.vBottom, alter: P.vAlter, future: P.vFuture, shuffle: P.vShuffle, favor: P.vFavor };
    function cardValue(hand, id) {
      const k = K[id];
      if (VALUE[k] != null) return VALUE[k];
      if (k === R.WILD) return P.vCatPair;   // 万能猫跟哪只猫都能凑对
      return R.countKind(hand, k) + R.countKind(hand, R.WILD) >= 2 ? P.vCatPair : P.vCatSingle; // 猫：成对才有用
    }

    /* 牌堆前 m 个位置各是炸毛猫的概率 */
    function kittenBelief(v, m) {
      const size = v.deckSize, out = new Array(Math.min(m, size)).fill(0);
      const knownAt = new Map(v.known.map((x) => [x.pos, x.id]));
      const knownBooms = v.known.filter((x) => K[x.id] === R.BOOM).length;
      const unk = Math.max(0, v.kittens - knownBooms);
      const slots = size - v.known.length;
      // 公开历史：别人最近塞回去的那只（我不知道位置）。先验：最上面 histTop，第 1..3 位分一半剩下的，其余位置均分另一半；
      // 塞完后从顶上摸走 top 张、从底下摸走 bot 张都没炸 → 它不在那些位置
      let hist = null;
      if (P.histW > 0 && v.ins && v.ins.by !== v.me && unk > 0) {
        const d = v.ins.top || 0, db = v.ins.bot || 0;
        if (d + db <= v.ins.size) {
          const S = v.ins.size, w = new Array(S).fill(0);
          const rest = Math.max(0, S - 4);
          for (let p = 0; p < S; p++) {
            if (p === 0) w[p] = P.histTop;
            else if (p <= 3) w[p] = (1 - P.histTop) * 0.5 / Math.min(3, S - 1);
            else w[p] = (1 - P.histTop) * 0.5 / rest;
          }
          let tot = 0;
          const cur = new Array(size).fill(0);
          for (let p = d; p < S - db; p++) { const q = p - d; if (q < size && !knownAt.has(q)) { cur[q] = w[p]; tot += w[p]; } }
          if (tot > 0) { for (let q = 0; q < size; q++) cur[q] /= tot; hist = cur; }
        }
      }
      for (let i = 0; i < out.length; i++) {
        if (knownAt.has(i)) { out[i] = K[knownAt.get(i)] === R.BOOM ? 1 : 0; continue; }
        if (hist) {
          const uniRest = slots > 1 ? (unk - 1) / (slots - 1) : 0;
          const ph = P.histW * hist[i] + (1 - P.histW) * (slots > 0 ? 1 / slots : 0);
          out[i] = Math.min(1, ph + (1 - ph) * uniRest);
        } else out[i] = slots > 0 ? unk / slots : 1;
      }
      return out;
    }
    function topInfo(v) {
      const top = v.known.find((x) => x.pos === 0);
      if (top) return { known: true, boom: K[top.id] === R.BOOM, p: K[top.id] === R.BOOM ? 1 : 0 };
      if (v.deckSize <= 0) return { known: false, boom: false, p: 1 };
      const b = kittenBelief(v, 1);
      return { known: false, boom: false, p: b.length ? b[0] : 1 };
    }

    /* 交换：逗猫棒不跟着换，所以只比「能换走的牌」——换过来的不知道的牌按 swapUnk 估值，至少多出 swapMargin 才换 */
    function swapMove(v) {
      if (!has(v, R.SWAP)) return null;
      const sid = one(v, R.SWAP);
      const mine = v.hand.filter((id) => id !== sid && K[id] !== R.DEFUSE);
      const myVal = mine.reduce((a, id) => a + Math.min(30, cardValue(v.hand, id)), 0);
      let best = -1, bestGain = -Infinity;
      for (let t = 0; t < v.n; t++) {
        if (t === v.me || !v.alive[t]) continue;
        const knownDef = v.handKnown[t].filter((id) => K[id] === R.DEFUSE).length;
        const theirs = Math.max(0, v.counts[t] - knownDef);
        const gain = theirs * P.swapUnk - myVal;
        if (gain > bestGain) { bestGain = gain; best = t; }
      }
      return best >= 0 && bestGain >= P.swapMargin ? playMove([sid], best) : null;
    }
    // 甩锅（普通或指定）：有普通的先用普通，留着指定的
    function attackMove(v) {
      if (has(v, R.ATTACK)) return playMove([one(v, R.ATTACK)]);
      if (has(v, R.TATTACK)) { const t = victim(v); if (t >= 0) return playMove([one(v, R.TATTACK)], t); }
      return null;
    }

    function stealMove(v, by, ts, desperate) {
      if (!ts.length) return null;
      const t = richest(v, R.DEFUSE);
      for (const k of Object.keys(by)) {
        if (k === R.DEFUSE || k === R.NOPE) continue;
        if (by[k].length >= 3 && (desperate || R.catLike(k) || VALUE[k] <= 15)) return playMove(by[k].slice(0, 3), t, R.DEFUSE);
      }
      for (const k of R.CATS) { const c = catSet(by, k, 3); if (c) return playMove(c, t, R.DEFUSE); }   // 拿万能猫凑三张
      if (desperate || v.discard.some((id) => K[id] === R.DEFUSE)) {
        const five = fiveCats(v);
        if (five && v.discard.some((id) => K[id] === R.DEFUSE)) return playMove(five);
      }
      const pr = catPair(by);
      if (pr) return playMove(pr, t);
      if (has(v, R.FAVOR)) return playMove([one(v, R.FAVOR)], t);
      if (desperate) for (const k of Object.keys(by)) if (k !== R.DEFUSE && by[k].length >= 2) return playMove(by[k].slice(0, 2), t);
      return null;
    }

    function act(v) {
      const top = topInfo(v);
      const def = has(v, R.DEFUSE);
      const by = pairsOf(v);
      const ts = targets(v);

      if (top.known && top.boom) {
        const am = attackMove(v);
        if (am) return am;
        if (has(v, R.SKIP)) return playMove([one(v, R.SKIP)]);
        if (bottomOk(v)) return playMove([one(v, R.BOTTOM)]);   // 顶上是炸毛猫：从底下摸
        if (has(v, R.ALTER) && v.deckSize > 1) return playMove([one(v, R.ALTER)]);   // 把顶上的炸毛猫往下塞
        if (has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
        if (def) return DRAW;
        const steal = stealMove(v, by, ts, true);
        if (steal) return steal;
        return DRAW;
      }
      if (top.known) return DRAW; // 顶上是安全牌，放心摸

      // 没逗猫棒：先想办法弄一张
      if (!def) {
        const steal = stealMove(v, by, ts, false);
        if (steal) return steal;
      }
      const risk = top.p;
      const lookAt = def ? P.lookDef : P.lookNo;
      const dodgeAt = def ? P.dodgeDef : P.dodgeNo;
      if (risk >= lookAt && has(v, R.FUTURE) && v.deckSize > 1) return playMove([one(v, R.FUTURE)]);
      if (risk >= lookAt && has(v, R.ALTER) && v.deckSize > 1) return playMove([one(v, R.ALTER)]);
      if (v.turnsLeft >= 2 && risk >= P.multiAtk) { const am = attackMove(v); if (am) return am; }
      if (risk >= dodgeAt) {
        const am = attackMove(v);
        if (am) return am;
        if (has(v, R.SKIP)) return playMove([one(v, R.SKIP)]);
        if (bottomOk(v) && (bottomInfo(v).known || !def || P.bottomDef)) return playMove([one(v, R.BOTTOM)]);
      }
      if (risk >= P.shuffleAt && has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
      const sw = swapMove(v);
      if (sw) return sw;
      // 闲着的索要 / 成对的猫：拿去偷一张
      if (def && has(v, R.FAVOR) && ts.length) return playMove([one(v, R.FAVOR)], richest(v, R.DEFUSE));
      for (const k of R.CATS) if ((by[k] || []).length >= 2 && ts.length) return playMove(by[k].slice(0, 2), richest(v, R.DEFUSE));
      return DRAW;
    }

    /* 作废：pending 当前生效（nopes 偶数）且冲我来 → 作废它；我出的牌被作废了且这张很要紧 → 再顶回去 */
    function againstMe(v) {
      const p = v.pending;
      if (!p) return false;
      if (p.type === R.ATTACK) return nextAliveV(v, p.by) === v.me;
      if (p.type === R.TATTACK) return p.target === v.me;
      if (p.type === R.SWAP) return p.target === v.me && v.hand.filter((id) => K[id] !== R.DEFUSE).length >= Math.max(0, v.counts[p.by] - 1);   // 他那手比我还少才挡
      if (p.type === R.FAVOR || p.type === 'pair' || p.type === 'triple') return p.target === v.me;
      return false;
    }
    function react(v, rng, tier) {
      const p = v.pending;
      if (!p || !has(v, R.NOPE)) return false;
      const live = p.nopes % 2 === 0;
      if (live && againstMe(v)) {
        if (p.type === 'triple' && p.named !== R.DEFUSE && R.countKind(v.hand, p.named) === 0) return false; // 他要的我本来就没有
        if (p.type === R.FAVOR && v.counts[v.me] <= 1 && !has(v, R.DEFUSE)) return false;
        return tier === 'easy' ? rng() < 0.4 : true;
      }
      if (!live && p.by === v.me && tier !== 'easy') {
        const top = topInfo(v);
        if ((p.type === R.ATTACK || p.type === R.TATTACK || p.type === R.SKIP || p.type === R.BOTTOM || p.type === R.SHUFFLE) && (top.boom || top.p >= P.nopeBackP)) return true;
        if ((p.type === 'pair' || p.type === 'triple' || p.type === R.FAVOR || p.type === 'five') && !has(v, R.DEFUSE)) return true;
      }
      return false;
    }

    function give(v, tier, rng) {
      const hand = v.hand;
      if (tier === 'easy') { const non = hand.filter((id) => K[id] !== R.DEFUSE); return pickRand(non.length ? non : hand, rng); }
      return hand.slice().sort((a, b) => cardValue(hand, a) - cardValue(hand, b))[0];
    }
    function pick(v, tier, rng) {
      const cands = v.discard.filter((id) => K[id] !== R.BOOM);
      if (tier === 'easy') return pickRand(cands, rng);
      const hand = v.hand;
      return cands.slice().sort((a, b) => cardValue(hand, b) - cardValue(hand, a))[0];
    }
    /* 改命：顶上有炸毛猫——这回合躲得掉（甩锅 / 跳过 / 抽底）就把它放最上面留给下一个人；
     * 躲不掉就先放够我这几回合要摸的安全牌，炸毛猫紧跟在后面留给下家 */
    function alter(v, tier, rng) {
      const cards = (v.alter && v.alter.cards) || [];
      if (tier === 'easy') return R.shuffleIn({ rs: (rng() * 4294967296) >>> 0 }, cards.slice());
      const booms = cards.filter((id) => K[id] === R.BOOM), safe = cards.filter((id) => K[id] !== R.BOOM);
      if (!booms.length) return cards.slice();
      const canDodge = has(v, R.ATTACK) || has(v, R.TATTACK) || has(v, R.SKIP) || has(v, R.BOTTOM);
      if (canDodge) return booms.concat(safe);
      const k = Math.min(v.turnsLeft, safe.length);
      return safe.slice(0, k).concat(booms, safe.slice(k));
    }
    function insert(v, tier, rng) {
      const size = v.deckSize; // 塞之前牌堆的张数：pos 0..size
      if (tier === 'easy') return (rng() * (size + 1)) | 0;
      if (v.turnsLeft > 1) return Math.min(size, 2 + ((rng() * Math.max(1, size - 1)) | 0)); // 自己还要摸，别塞顶上
      if (rng() < P.insTop) return 0;
      return Math.min(size, 1 + ((rng() * P.insSpread) | 0));
    }
    return { P, cardValue, kittenBelief, topInfo, act, react, give, pick, alter, insert };
  }
  const NB = makeNormal(P_BASE), NH = makeNormal(P_HIST), NO = makeNormal(P_OLD);
  const pol = (v) => (v.ins !== undefined ? NH : NB);   // 规则公开塞猫历史就用对应那套
  const polT = (v, tier) => (tier === 'easy' ? NO : pol(v));   // 入门 = 原来的普通

  /* ───── PIMC（高手） ───── */
  const BUDGET = 900, MIN_S = 16, MAX_S = 80, INSERT_S = 40, ANCHOR = 0.2;
  const ALL_IDS = Array.from({ length: R.DECK_SIZE }, (_, i) => i);

  /* 按 v 补全一个完整局面（别人手牌 + 牌堆未知位置随机；别人刚塞回的炸毛猫按信念放），phase 取 v 当前的 */
  function determinize(v, seed) {
    const N = pol(v);
    const st = { rs: (seed >>> 0) || 1 };
    const used = new Set(v.hand.concat(v.discard, v.removed));
    if (v.defuse && v.defuse.card != null) used.add(v.defuse.card);
    for (const x of v.known) used.add(x.id);
    v.handKnown.forEach((ids) => ids.forEach((id) => used.add(id)));
    if (v.alter && v.alter.cards) v.alter.cards.forEach((id) => used.add(id));
    const pool = ALL_IDS.filter((id) => !used.has(id));
    const kits = pool.filter((id) => K[id] === R.BOOM);
    const others = R.shuffleIn(st, pool.filter((id) => K[id] !== R.BOOM));
    const hands = [];
    for (let s = 0; s < v.n; s++) {
      if (s === v.me) { hands.push(v.hand.slice()); continue; }
      const h = v.handKnown[s].slice();
      while (h.length < v.counts[s]) h.push(others.pop());
      hands.push(R.sortHand(h));
    }
    const slots = v.deckSize;
    const deck = new Array(slots).fill(-1);
    for (const x of v.known) deck[x.pos] = x.id;
    if (v.alter && v.alter.cards) v.alter.cards.forEach((id, i) => { deck[i] = id; });
    const kitList = kits.slice();
    if (N.P.histW > 0 && v.ins && v.ins.by !== v.me && kitList.length) {
      const b = N.kittenBelief(v, slots);
      const uni = kitList.length / Math.max(1, slots - v.known.length);
      const excess = b.map((p, i) => (deck[i] < 0 ? Math.max(0, p - uni) : 0));
      const tot = excess.reduce((a, b2) => a + b2, 0);
      if (tot > 0 && R.rand(st) < Math.min(1, tot)) {
        let r = R.rand(st) * tot, pos = 0;
        for (; pos < slots; pos++) { r -= excess[pos]; if (r <= 0) break; }
        if (pos < slots && deck[pos] < 0) deck[pos] = kitList.pop();
      }
    }
    const fill = R.shuffleIn(st, others.concat(kitList));
    for (let i = 0; i < slots; i++) if (deck[i] < 0) deck[i] = fill.pop();
    const memo = [];
    for (let s = 0; s < v.n; s++) memo.push({ deck: [], hands: Array.from({ length: v.n }, () => []) });
    memo[v.me].deck = v.known.map((x) => x.id).concat(v.alter && v.alter.cards ? v.alter.cards : []);
    memo[v.me].hands = v.handKnown.map((h) => h.slice());
    const s = {
      n: v.n, rules: v.rules, rs: (seed * 2654435761) >>> 0 || 7,
      deck, discard: v.discard.slice(), removed: v.removed.slice(), hands,
      alive: v.alive.slice(), outOrder: [],
      turn: v.turn, turnsLeft: v.turnsLeft, phase: 'act',
      pending: null, give: null, pick: null, defuse: null, alter: null, steal: null,
      winner: -1, seq: 0, memo,
    };
    if (v.ins !== undefined) s.ins = v.ins && Object.assign({}, v.ins);
    if (v.phase === 'defuse') { s.phase = 'defuse'; s.defuse = { by: v.me, card: v.defuse.card }; }
    if (v.phase === 'react' && v.pending) {
      s.phase = 'react';
      s.pending = { by: v.pending.by, type: v.pending.type, cards: v.pending.cards.slice(), target: v.pending.target, named: v.pending.named,
        nopes: Array.from({ length: v.pending.nopes }, () => ({ seat: -1, card: -1 })), passed: [] };
    }
    if (v.phase === 'alter') { s.phase = 'alter'; s.alter = { by: v.me, cards: v.alter.cards.slice() }; }
    if (v.phase === 'give') { s.phase = 'give'; s.give = Object.assign({}, v.give); }
    return s;
  }

  /* 让局面推进一步（模拟里所有人都按「普通」；tierOf 只为兼容旧接口保留，easy 的座位按入门） */
  function stepWith(s, tierOf, rng) {
    const tier = (seat) => (tierOf && tierOf(seat) === 'easy' ? 'easy' : 'normal');
    switch (s.phase) {
      case 'act': {
        const me = s.turn, v = R.view(s, me);
        const m = polT(v, tier(me)).act(v);
        if (m.type === 'play' && R.checkPlay(s, me, m.cards, m)) R.play(s, me, m.cards, m); else R.draw(s, me);
        return;
      }
      case 'react': {
        for (const t of R.awaitingReaction(s)) {
          if (R.canNope(s, t)) { const v = R.view(s, t); if (polT(v, tier(t)).react(v, rng, 'normal')) { R.nope(s, t); return; } }
          R.pass(s, t);
        }
        R.closeReaction(s);
        return;
      }
      case 'give': { const f = s.give.from, v = R.view(s, f); R.give(s, f, polT(v, tier(f)).give(v, 'normal', rng)); return; }
      case 'pick': { const b = s.pick.by, v = R.view(s, b); R.pickDiscard(s, b, polT(v, tier(b)).pick(v, 'normal', rng)); return; }
      case 'defuse': { const b = s.defuse.by, v = R.view(s, b); R.insertKitten(s, b, polT(v, tier(b)).insert(v, 'normal', rng)); return; }
      case 'alter': { const b = s.alter.by, v = R.view(s, b); R.alterTop(s, b, polT(v, tier(b)).alter(v, 'normal', rng)); return; }
      case 'steal': { const b = s.steal.by; R.stealPick(s, b, (rng() * s.steal.perm.length) | 0); return; }
    }
  }
  // 名次分：赢 1，第 i 个出局 i/(n-1)（算上模拟开始前已经出局的人）
  function scoreOf(s, me, deadBefore) {
    if (s.winner === me) return 1;
    const i = s.outOrder.indexOf(me);
    if (i < 0) return 0.5;
    return (i + deadBefore) / (s.n - 1);
  }

  /* 每个候选都在同一批假想局面里、用同一串随机数打到底（复式比较），返回名次分合计 */
  function evaluate(v, applyFn, cands, samples, rng) {
    const scores = cands.map(() => 0);
    const deadBefore = v.alive.filter((a) => !a).length;
    for (let i = 0; i < samples; i++) {
      const seed = (rng() * 4294967296) >>> 0;
      const base = determinize(v, seed);
      cands.forEach((c, ci) => {
        const s = R.cloneGame(base);
        if (base.ins !== undefined) s.ins = base.ins && Object.assign({}, base.ins);
        s.rs = (seed ^ 0x9e3779b9) >>> 0;
        const rr = () => R.rand(s);
        try { applyFn(s, c, rr); } catch (e) { scores[ci] += -1; return; }
        let guard = 0;
        while (s.phase !== 'over' && s.alive[v.me] && guard++ < 3000) stepWith(s, null, rr);
        scores[ci] += (s.phase === 'over' || !s.alive[v.me]) ? scoreOf(s, v.me, deadBefore) : 0.5;
      });
    }
    return scores;
  }
  const argmax = (a) => { let bi = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[bi] + 1e-9) bi = i; return bi; };

  function actCandidates(v) {
    const out = [DRAW], by = pairsOf(v), ts = targets(v);
    for (const k of R.ACTIONS) {
      const id = one(v, k);
      if (id == null) continue;
      if (k === R.FAVOR) { for (const t of ts) out.push(playMove([id], t)); }
      else if (k === R.TATTACK || k === R.SWAP) { for (let t = 0; t < v.n; t++) if (t !== v.me && v.alive[t]) out.push(playMove([id], t)); }
      else if (k !== R.FUTURE && k !== R.ALTER) out.push(playMove([id])); // 窥探 / 改命照普通的时机出
    }
    for (const k of Object.keys(by)) {
      if (k === R.DEFUSE) continue;
      if (by[k].length >= 2 && (R.catLike(k) || by[k].length >= 3)) for (const t of ts) out.push(playMove(by[k].slice(0, 2), t));
      if (by[k].length >= 3) for (const t of ts) out.push(playMove(by[k].slice(0, 3), t, R.DEFUSE));
    }
    if (by[R.WILD]) for (const k of R.CATS) {   // 真猫 + 万能猫凑的对子 / 三张（纯的上面已经有了）
      const real = (by[k] || []).length;
      const c2 = real < 2 && catSet(by, k, 2), c3 = real < 3 && catSet(by, k, 3);
      if (c2) for (const t of ts) out.push(playMove(c2, t));
      if (c3) for (const t of ts) out.push(playMove(c3, t, R.DEFUSE));
    }
    const five = fiveCats(v);
    if (five) out.push(playMove(five));
    return out;
  }
  const moveKey = (m) => m.type + ':' + (m.cards || []).map((id) => K[id]).sort().join(',') + ':' + (m.target == null ? '' : m.target) + ':' + (m.named || '');

  function hardAct(v, rng) {
    const N = pol(v);
    const nm = N.act(v);
    if (nm.type === 'play' && nm.cards.length === 1 && (K[nm.cards[0]] === R.FUTURE || K[nm.cards[0]] === R.ALTER)) return nm;
    const cands = actCandidates(v);
    if (cands.length === 1) return DRAW;
    // 总模拟次数封顶（候选多时每个少模拟几次），最坏一步也不卡住动画
    const samples = Math.max(MIN_S, Math.min(MAX_S, Math.floor(BUDGET / cands.length)));
    // 普通的选择也在候选里（找不到就补进去）；别的候选平均名次分要高出 ANCHOR 才换
    let ai = cands.findIndex((c) => moveKey(c) === moveKey(N.act(v)));
    if (ai < 0) { cands.push(N.act(v)); ai = cands.length - 1; }
    const scores = evaluate(v, (s, m, rr) => {
      if (m.type === 'draw') { R.draw(s, v.me); return; }
      R.play(s, v.me, m.cards, m);
      let g = 0;
      while (s.phase === 'react' && g++ < 20) stepWith(s, null, rr); // 反应窗按普通处理
    }, cands, samples, rng);
    const bi = argmax(scores);
    return scores[bi] - scores[ai] < ANCHOR * samples ? cands[ai] : cands[bi];
  }

  function hardInsert(v, rng) {
    const size = v.deckSize;
    const cands = Array.from(new Set([0, 1, 2, 3, Math.floor(size / 2), size].filter((p) => p <= size)));
    const scores = evaluate(v, (s, pos) => R.insertKitten(s, v.me, pos), cands, INSERT_S, rng);
    return cands[argmax(scores)];
  }

  /* ───── 对外 ───── */
  function actFor(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'hard') return hardAct(v, rng);
    return polT(v, tier).act(v);
  }
  // 各档内部的细节判断一律按「普通」的走法（原来入门那套随手乱出的已经不用了）
  function reactFor(v, tier, rng) { return polT(v, tier).react(v, rng || Math.random, 'normal'); }
  function insertFor(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'hard') return hardInsert(v, rng);
    return polT(v, tier).insert(v, 'normal', rng);
  }
  function chooseGive(v, tier, rng) { return polT(v, tier).give(v, 'normal', rng || Math.random); }
  function choosePick(v, tier, rng) { return polT(v, tier).pick(v, 'normal', rng || Math.random); }
  function chooseAlter(v, tier, rng) { return polT(v, tier).alter(v, 'normal', rng || Math.random); }
  function cardValue(hand, id) { return NB.cardValue(hand, id); }
  function topInfo(v) { return pol(v).topInfo(v); }

  /* 一步到位：给定 state 和座位，按档位产出该座位此刻的决定（UI / 服务器用） */
  function decide(state, seat, tier, rng) {
    rng = rng || Math.random;
    const v = R.view(state, seat);
    switch (state.phase) {
      case 'act': return actFor(v, tier, rng);
      case 'react': return { type: reactFor(v, tier, rng) ? 'nope' : 'pass' };
      case 'give': return { type: 'give', card: chooseGive(v, tier, rng) };
      case 'pick': return { type: 'pick', card: choosePick(v, tier, rng) };
      case 'defuse': return { type: 'insert', pos: insertFor(v, tier, rng) };
      case 'alter': return { type: 'alter', order: chooseAlter(v, tier, rng) };
      case 'steal': return { type: 'steal', idx: (rng() * v.steal.count) | 0 };   // 扣着的牌没信息，随便点
      default: return null;
    }
  }

  return {
    TIERS, TIER_NAMES, cardValue, topInfo, determinize, decide,
    actFor, reactFor, insertFor, chooseGive, choosePick, chooseAlter, stepWith,
  };
});
