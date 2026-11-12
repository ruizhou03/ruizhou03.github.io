/* 猫咪炸毛 · 机器人（浏览器 window.ZhamaoAI / Node require 共用，无 DOM）
 *
 * 机器人只能看 R.view(state, seat)：自己的手牌、公开信息、自己亲眼看到的（猫眼偷看 / 自己塞回的炸毛猫 / 被蹭走偷走的牌）。
 * 五个决策点：act（出什么 / 摸牌）、react（要不要「喵？不行」）、give（被蹭时给哪张）、pick（五张各不同捡哪张）、insert（炸毛猫塞哪）。
 *
 * 三档：
 *   easy   入门：大多直接摸牌，偶尔随手出张牌；炸毛猫随便塞
 *   normal 普通：算牌堆顶是炸毛猫的概率，危险就偷看 / 装睡 / 推锅，知道顶上是炸毛猫就躲；
 *          没逗猫棒时想办法偷；被针对时用「不行」；炸毛猫多半塞最上面坑下家
 *   hard   高手：出牌和塞炸毛猫用 PIMC——按自己知道的信息随机补全别人手牌和牌堆，
 *          每个候选走法都在同一批假想局面里用「普通」打到底，挑存活名次最好的；「不行」沿用普通
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

  /* 牌的「留着有多值钱」 */
  const VALUE = { defuse: 100, nope: 30, tattack: 28, attack: 26, skip: 20, future: 15, shuffle: 13, favor: 10 };
  function cardValue(hand, id) {
    const k = K[id];
    if (VALUE[k] != null) return VALUE[k];
    return R.countKind(hand, k) >= 2 ? 7 : 2; // 猫：成对才有用
  }

  /* ───── 局面判断 ───── */
  function topInfo(v) {
    const top = v.known.find((x) => x.pos === 0);
    if (top) return { known: true, boom: K[top.id] === R.BOOM, p: K[top.id] === R.BOOM ? 1 : 0 };
    const knownBooms = v.known.filter((x) => K[x.id] === R.BOOM).length;
    const slots = v.deckSize - v.known.length;
    const p = slots > 0 ? Math.max(0, v.kittens - knownBooms) / slots : 1;
    return { known: false, boom: false, p };
  }
  const has = (v, k) => R.countKind(v.hand, k) > 0;
  const one = (v, k) => R.findKind(v.hand, k);
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
  const pickRand = (arr, rng) => arr[(rng() * arr.length) | 0];
  /* 指定甩锅甩给谁：手牌最少的（最可能没有逗猫棒 / 作废），知道他没逗猫棒的更优先 */
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
  // 甩锅（普通或指定）：有普通的先用普通，留着指定的
  function attackMove(v) {
    if (has(v, R.ATTACK)) return playMove([one(v, R.ATTACK)]);
    if (has(v, R.TATTACK)) { const t = victim(v); if (t >= 0) return playMove([one(v, R.TATTACK)], t); }
    return null;
  }

  function playMove(cards, target, named) {
    const m = { type: 'play', cards };
    if (target != null && target >= 0) m.target = target;
    if (named) m.named = named;
    return m;
  }
  const DRAW = Object.freeze({ type: 'draw' });

  /* 能凑出的组合 */
  function pairsOf(v) {
    const by = {};
    for (const id of v.hand) { const k = K[id]; (by[k] = by[k] || []).push(id); }
    return by;
  }
  function fiveDistinct(v) {
    // 挑五种最不值钱的各一张；不拆逗猫棒
    const by = pairsOf(v), picks = [];
    for (const k of Object.keys(by)) if (k !== R.DEFUSE) picks.push(by[k].slice().sort((a, b) => cardValue(v.hand, a) - cardValue(v.hand, b))[0]);
    if (picks.length < 5) return null;
    picks.sort((a, b) => cardValue(v.hand, a) - cardValue(v.hand, b));
    return picks.slice(0, 5);
  }

  /* ───── 入门 ───── */
  function easyAct(v, rng) {
    if (rng() < 0.72) return DRAW;
    const singles = v.hand.filter((id) => R.ACTIONS.indexOf(K[id]) >= 0);
    if (!singles.length) return DRAW;
    const id = pickRand(singles, rng);
    if (K[id] === R.FAVOR) { const ts = targets(v); return ts.length ? playMove([id], pickRand(ts, rng)) : DRAW; }
    if (K[id] === R.TATTACK) { const t = victim(v); return t >= 0 ? playMove([id], t) : DRAW; }
    return playMove([id]);
  }

  /* ───── 普通 ───── */
  function normalAct(v, rng) {
    const top = topInfo(v);
    const def = has(v, R.DEFUSE);
    const by = pairsOf(v);
    const ts = targets(v);

    if (top.known && top.boom) {
      const am = attackMove(v);
      if (am) return am;
      if (has(v, R.SKIP)) return playMove([one(v, R.SKIP)]);
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
    const lookAt = def ? 0.22 : 0.1;
    const dodgeAt = def ? 0.45 : 0.2;
    if (risk >= lookAt && has(v, R.FUTURE) && v.deckSize > 1) return playMove([one(v, R.FUTURE)]);
    if (v.turnsLeft >= 2 && risk >= 0.12) { const am = attackMove(v); if (am) return am; }
    if (risk >= dodgeAt) {
      const am = attackMove(v);
      if (am) return am;
      if (has(v, R.SKIP)) return playMove([one(v, R.SKIP)]);
    }
    // 成对的猫没别的用处，拿去偷一张
    for (const k of R.CATS) if ((by[k] || []).length >= 2 && ts.length) return playMove(by[k].slice(0, 2), richest(v, R.DEFUSE));
    return DRAW;
  }

  function stealMove(v, by, ts, desperate) {
    if (!ts.length) return null;
    const t = richest(v, R.DEFUSE);
    for (const k of Object.keys(by)) {
      if (k === R.DEFUSE || k === R.NOPE) continue;
      if (by[k].length >= 3 && (desperate || R.isCat(k) || VALUE[k] <= 15)) return playMove(by[k].slice(0, 3), t, R.DEFUSE);
    }
    if (desperate || v.discard.some((id) => K[id] === R.DEFUSE)) {
      const five = fiveDistinct(v);
      if (five && v.discard.some((id) => K[id] === R.DEFUSE)) return playMove(five);
    }
    for (const k of R.CATS) if ((by[k] || []).length >= 2) return playMove(by[k].slice(0, 2), t);
    if (has(v, R.FAVOR)) return playMove([one(v, R.FAVOR)], t);
    if (desperate) for (const k of Object.keys(by)) if (k !== R.DEFUSE && by[k].length >= 2) return playMove(by[k].slice(0, 2), t);
    return null;
  }

  /* 「不行」：pending 当前生效（nopes 偶数）且冲我来 → 作废它；我出的牌被作废了且这张很要紧 → 再顶回去 */
  function againstMe(v) {
    const p = v.pending;
    if (!p) return false;
    if (p.type === R.ATTACK) return nextAliveV(v, p.by) === v.me;
    if (p.type === R.TATTACK) return p.target === v.me;
    if (p.type === R.FAVOR || p.type === 'pair' || p.type === 'triple') return p.target === v.me;
    return false;
  }
  function normalReact(v, rng, tier) {
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
      if ((p.type === R.ATTACK || p.type === R.TATTACK || p.type === R.SKIP || p.type === R.SHUFFLE) && (top.boom || top.p >= 0.3)) return true;
      if ((p.type === 'pair' || p.type === 'triple' || p.type === R.FAVOR || p.type === 'five') && !has(v, R.DEFUSE)) return true;
    }
    return false;
  }

  function chooseGive(v, tier, rng) {
    rng = rng || Math.random;
    const hand = v.hand;
    if (tier === 'easy') { const non = hand.filter((id) => K[id] !== R.DEFUSE); return pickRand(non.length ? non : hand, rng); }
    return hand.slice().sort((a, b) => cardValue(hand, a) - cardValue(hand, b))[0];
  }
  function choosePick(v, tier, rng) {
    rng = rng || Math.random;
    const cands = v.discard.filter((id) => K[id] !== R.BOOM);
    if (tier === 'easy') return pickRand(cands, rng);
    const hand = v.hand;
    return cands.slice().sort((a, b) => cardValue(hand, b) - cardValue(hand, a))[0];
  }
  function normalInsert(v, tier, rng) {
    const size = v.deckSize; // 塞之前牌堆的张数：pos 0..size
    if (tier === 'easy') return (rng() * (size + 1)) | 0;
    if (v.turnsLeft > 1) return Math.min(size, 2 + ((rng() * Math.max(1, size - 1)) | 0)); // 自己还要摸，别塞顶上
    if (rng() < 0.6) return 0;
    return Math.min(size, 1 + ((rng() * 3) | 0));
  }

  /* ───── PIMC（高手） ───── */
  const ALL_IDS = Array.from({ length: R.DECK_SIZE }, (_, i) => i);

  /* 按 v 补全一个完整局面（别人手牌 + 牌堆未知位置随机），phase 取 v 当前的 'act' 或 'defuse' */
  function determinize(v, seed) {
    const st = { rs: (seed >>> 0) || 1 };
    const rnd = () => R.rand(st);
    const used = new Set(v.hand.concat(v.discard, v.removed));
    if (v.defuse && v.defuse.card != null) used.add(v.defuse.card);
    for (const x of v.known) used.add(x.id);
    v.handKnown.forEach((ids) => ids.forEach((id) => used.add(id)));
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
    const fill = R.shuffleIn(st, others.concat(kits));
    for (let i = 0; i < slots; i++) if (deck[i] < 0) deck[i] = fill.pop();
    const memo = [];
    for (let s = 0; s < v.n; s++) memo.push({ deck: [], hands: Array.from({ length: v.n }, () => []) });
    memo[v.me].deck = v.known.map((x) => x.id);
    memo[v.me].hands = v.handKnown.map((h) => h.slice());
    return {
      n: v.n, rules: v.rules, rs: (seed * 2654435761) >>> 0 || 7,
      deck, discard: v.discard.slice(), removed: v.removed.slice(), hands,
      alive: v.alive.slice(), outOrder: [],
      turn: v.turn, turnsLeft: v.turnsLeft, phase: v.phase === 'defuse' ? 'defuse' : 'act',
      pending: null, give: null, pick: null,
      defuse: v.phase === 'defuse' ? { by: v.me, card: v.defuse.card } : null,
      winner: -1, seq: 0, memo,
    };
  }

  /* 让局面按某个策略推进一步（act/react/give/pick/defuse 都管） */
  function stepWith(s, tierOf, rng) {
    switch (s.phase) {
      case 'act': {
        const me = s.turn, v = R.view(s, me);
        const m = actFor(v, tierOf(me) === 'hard' ? 'normal' : tierOf(me), rng);
        if (m.type === 'play' && R.checkPlay(s, me, m.cards, m)) R.play(s, me, m.cards, m); else R.draw(s, me);
        return;
      }
      case 'react': {
        for (const t of R.awaitingReaction(s)) {
          if (R.canNope(s, t) && normalReact(R.view(s, t), rng, tierOf(t))) { R.nope(s, t); return; }
          R.pass(s, t);
        }
        R.closeReaction(s);
        return;
      }
      case 'give': { const f = s.give.from; R.give(s, f, chooseGive(R.view(s, f), tierOf(f), rng)); return; }
      case 'pick': { const b = s.pick.by; R.pickDiscard(s, b, choosePick(R.view(s, b), tierOf(b), rng)); return; }
      case 'defuse': { const b = s.defuse.by; R.insertKitten(s, b, normalInsert(R.view(s, b), tierOf(b), rng)); return; }
    }
  }
  function placement(s, me) { // 1 = 赢，越早炸越接近 0
    if (s.winner === me) return 1;
    const i = s.outOrder.indexOf(me);
    return i < 0 ? 0.5 : i / (s.n - 1);
  }
  function rollout(s, me, rng) {
    const tierOf = () => 'normal';
    let guard = 0;
    while (s.phase !== 'over' && s.alive[me] && guard++ < 2000) stepWith(s, tierOf, rng);
    return s.alive[me] && s.phase !== 'over' ? 0.5 : placement(s, me);
  }

  function actCandidates(v) {
    const out = [DRAW], by = pairsOf(v), ts = targets(v);
    for (const k of R.ACTIONS) {
      const id = one(v, k);
      if (id == null) continue;
      if (k === R.FAVOR) { for (const t of ts) out.push(playMove([id], t)); }
      else if (k === R.TATTACK) { for (let t = 0; t < v.n; t++) if (t !== v.me && v.alive[t]) out.push(playMove([id], t)); }
      else if (k !== R.FUTURE) out.push(playMove([id])); // 偷看靠启发式（它的价值在信息，模拟里体现不出来）
    }
    for (const k of Object.keys(by)) {
      if (k === R.DEFUSE) continue;
      if (by[k].length >= 2 && (R.isCat(k) || by[k].length >= 3)) for (const t of ts) out.push(playMove(by[k].slice(0, 2), t));
      if (by[k].length >= 3) for (const t of ts) out.push(playMove(by[k].slice(0, 3), t, R.DEFUSE));
    }
    const five = fiveDistinct(v);
    if (five) out.push(playMove(five));
    return out;
  }

  function evaluate(v, applyFn, cands, samples, rng) {
    const scores = cands.map(() => 0);
    for (let i = 0; i < samples; i++) {
      const seed = (rng() * 4294967296) >>> 0;
      const base = determinize(v, seed);
      cands.forEach((c, ci) => {
        const s = R.cloneGame(base);
        s.rs = (seed ^ 0x9e3779b9) >>> 0; // 各候选共享同一串随机数（复式比较）
        let ok = true;
        try { applyFn(s, c); } catch (_) { ok = false; }
        scores[ci] += ok ? rollout(s, v.me, () => R.rand(s)) : -1;
      });
    }
    return scores;
  }

  function hardAct(v, rng, opts) {
    const top = topInfo(v);
    // 偷看：信息价值模拟不出来，沿用普通的时机
    if (!top.known && has(v, R.FUTURE) && v.deckSize > 1 && top.p >= (has(v, R.DEFUSE) ? 0.2 : 0.1)) return playMove([one(v, R.FUTURE)]);
    const cands = actCandidates(v);
    if (cands.length === 1) return DRAW;
    // 总模拟次数封顶（候选多时每个少模拟几次），最坏一步也不卡住动画
    const samples = (opts && opts.samples) || Math.max(12, Math.min(48, Math.floor(420 / cands.length)));
    const scores = evaluate(v, (s, m) => {
      if (m.type === 'draw') { R.draw(s, v.me); return; }
      R.play(s, v.me, m.cards, m);
      // 反应窗按普通处理
      let g = 0;
      while (s.phase === 'react' && g++ < 20) stepWith(s, () => 'normal', () => R.rand(s));
    }, cands, samples, rng);
    let bi = 0;
    for (let i = 1; i < cands.length; i++) if (scores[i] > scores[bi] + 1e-9) bi = i;
    return cands[bi];
  }

  function hardInsert(v, rng, opts) {
    const size = v.deckSize;
    const set = new Set([0, 1, 2, 3, Math.floor(size / 2), size].filter((p) => p <= size));
    const cands = Array.from(set);
    const samples = (opts && opts.samples) || 40;
    const scores = evaluate(v, (s, pos) => R.insertKitten(s, v.me, pos), cands, samples, rng);
    let bi = 0;
    for (let i = 1; i < cands.length; i++) if (scores[i] > scores[bi] + 1e-9) bi = i;
    return cands[bi];
  }

  /* ───── 对外 ───── */
  function actFor(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'easy') return easyAct(v, rng);
    if (tier === 'hard') return hardAct(v, rng);
    return normalAct(v, rng);
  }
  function reactFor(v, tier, rng) { return normalReact(v, rng || Math.random, tier); }
  function insertFor(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'hard') return hardInsert(v, rng);
    return normalInsert(v, tier, rng);
  }

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
      default: return null;
    }
  }

  return {
    TIERS, TIER_NAMES, cardValue, topInfo, determinize, decide,
    actFor, reactFor, insertFor, chooseGive, choosePick, stepWith,
  };
});
