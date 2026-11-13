/* 猫咪炸毛 · 纯规则模块（浏览器 window.ZhamaoRules / Node require 共用，无 DOM）
 *
 * 玩法机制参考公开规则（摸到「炸」的出局、拆除后塞回牌堆、跳过 / 甩给下家 / 洗牌 / 看未来 / 索要 / 否决、
 * 两张同样的偷一张），牌名、形象全部是我们自己的（2026-11-11 用户定：原创猫咪主题，基础版全套 + 三种组合）。
 *
 * 一副 56 张（2–5 人）：
 *   炸毛猫 ×4    摸到就炸毛出局，除非手里有逗猫棒
 *   逗猫棒 ×6    摸到炸毛猫时自动打出，把炸毛猫偷偷塞回牌堆任意位置
 *   喵？不行 ×5  作废别人刚出的牌（也能作废「不行」，叠来叠去，单数张=作废）。不能挡炸毛猫 / 逗猫棒
 *   攻击 ×4      结束自己的回合、不摸牌，下家连着摸两回合
 *   跳过 ×4      结束一个回合、不摸牌（被攻击时只顶掉其中一回合）
 *   索要 ×4      指定一人，他自己挑一张给你
 *   洗牌 ×4      把牌堆洗乱
 *   窥探 ×5      看牌堆最上面三张（不改顺序、别人看不到）
 *   橘猫 / 三花 / 奶牛 / 狸花 / 暹罗 各 ×4   本身没用，凑组合
 * 组合（任何同名牌都算，炸毛猫除外）：
 *   两张同样   指定一人，从他手里随机抽一张
 *   三张同样   指定一人并点名一种牌，他有就得给你一张，没有就落空
 *   五张各不同 从弃牌堆里挑任意一张（炸毛猫除外）
 * 开局：抽出炸毛猫和逗猫棒，余下洗匀每人发 4 张，再每人发 1 张逗猫棒；
 *       放回「人数 −1」张炸毛猫，再放回 min(2, 剩余) 张逗猫棒（RULES.extraDefuse='all' 时全放回），洗匀；
 *       多出来的收进盒子（state.removed），这局不用。
 * 回合：可以出任意多张 / 组合（每出一次都留一个「不行」反应窗），最后摸一张牌结束回合。
 *       甩锅叠加（RULES.stackAttack）：默认开 = 被甩锅的人再甩锅，剩下的回合 +2 一起甩走（可以一路越叠越多）；关 = 下家仍只摸两回合。
 *   指定甩锅 ×3  同甩锅，但甩给任意一个还在场的人（不一定是下家）
 *   交换（可选，RULES.swap，默认关）  和指定的一个人整手交换——各自的逗猫棒不换。整副里有 3 张，开局只放 min(3, 人数−1) 张进来
 *     （2 人 1 张、3 人 2 张、4–5 人 3 张：人越多、每人摸到的机会越被摊薄，所以随人数加；但封顶 3 张，免得满桌一直换手），其余收进盒子
 * 只剩一人没炸毛时他赢。
 *
 * 牌编码：card = 0..55 的整数 id，KIND_OF[id] 是牌种（字符串）。牌堆 deck[0] 是最上面那张。
 * 座位 0..n-1，出牌顺序 seat → 下一个还没出局的人（UI 负责画成逆时针）。
 *
 * 状态机（state.phase）：
 *   'act'    轮到 state.turn 出牌或摸牌
 *   'react'  有人刚出了牌（state.pending），等大家决定要不要「不行」：nope() / pass()，全部表态后 closeReaction()
 *   'give'   被「蹭一张」的人挑一张给出：give()
 *   'pick'   五种猫各一张：出牌人从弃牌堆挑一张：pickDiscard()
 *   'steal'  两张一样：出牌人从对方扣着的手牌里点一张（顺序打乱过，看不出是哪张）：stealPick()
 *   'alter'  「重排」：出牌人把牌堆最上面（至多）三张按自己想要的顺序放回去：alterTop()
 *   'defuse' 刚用逗猫棒拆了炸毛猫，把它塞回去：insertKitten()
 *   'over'   结束，state.winner
 * 每个改状态的函数都返回事件数组（UI 播动画 / 服务器转发）。带 priv 字段的事件只有 priv 里列的座位能看到全部内容，
 * redactEvents(events, seat) 给别人去掉 card / cards / pos。
 *
 * 知识（state.memo[seat]，给机器人用，规则本身不依赖）：
 *   deck  该座位确切知道位置的牌 id 集合（看未来 / 自己塞回的炸毛猫）；别人塞炸毛猫或洗牌后作废
 *   hands 该座位知道「别人手里有」的牌 id（被蹭走 / 偷走 / 点名要走 / 弃牌堆捡走 / 从自己知道的牌堆顶摸走）
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoRules = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOOM = 'boom', DEFUSE = 'defuse', NOPE = 'nope', ATTACK = 'attack', TATTACK = 'tattack', SKIP = 'skip', BOTTOM = 'bottom',
    FAVOR = 'favor', SHUFFLE = 'shuffle', FUTURE = 'future', ALTER = 'alter', SWAP = 'swap';
  const CATS = Object.freeze(['orange', 'calico', 'cow', 'tabby', 'siamese']);
  const ACTIONS = Object.freeze([ATTACK, TATTACK, SKIP, BOTTOM, FAVOR, SHUFFLE, FUTURE, ALTER, SWAP]);
  const COUNTS = Object.freeze({
    boom: 4, defuse: 6, nope: 5, attack: 4, tattack: 3, skip: 4, favor: 4, shuffle: 4, future: 4, alter: 3, swap: 3, bottom: 4,
    orange: 4, calico: 4, cow: 4, tabby: 4, siamese: 4,
  });
  const KINDS = Object.freeze(Object.keys(COUNTS));
  const NAMES = Object.freeze({
    boom: '炸毛猫', defuse: '逗猫棒', nope: '作废', attack: '甩锅', tattack: '自由甩锅', skip: '跳过', bottom: '抽底', favor: '索要',
    shuffle: '洗牌', future: '窥探', alter: '改命', swap: '交换', orange: '橘猫', calico: '三花', cow: '奶牛猫', tabby: '狸花', siamese: '暹罗',
  });
  /* 第二副牌（2026-11-12 起最多 9 人）：6 人以上开局把它也洗进来——炸毛猫最多 8 只、逗猫棒最多 11 根，功能牌和猫牌也多一倍；
   * 5 人及以下它一开局就整副收进盒子。牌号接在第一副后面（0..67 不变，旧存档 / 联机局照常） */
  const COUNTS2 = Object.freeze({
    boom: 4, defuse: 5, nope: 5, attack: 4, tattack: 3, skip: 4, favor: 4, shuffle: 4, future: 4, alter: 3, swap: 3, bottom: 4,
    orange: 4, calico: 4, cow: 4, tabby: 4, siamese: 4,
  });
  const KIND_OF = Object.freeze((function () {
    const a = [];
    for (const k of KINDS) for (let i = 0; i < COUNTS[k]; i++) a.push(k);
    for (const k of KINDS) for (let i = 0; i < (COUNTS2[k] || 0); i++) a.push(k);
    return a;
  })());
  const BASE_SIZE = KINDS.reduce((t, k) => t + COUNTS[k], 0);   // 68：第一副（含 3 张交换、4 张抽底）
  const DECK_SIZE = KIND_OF.length;                              // 135：两副的牌号总数
  const MIN_PLAYERS = 2, MAX_PLAYERS = 9, TWO_DECKS_FROM = 6;
  const usesSecondDeck = (n) => n >= TWO_DECKS_FROM;

  const RULE_OPTIONS = Object.freeze({
    stackAttack: [false, true],
    extraDefuse: ['two', 'all'],
    swap: [false, true],
  });
  const DEFAULT_RULES = Object.freeze({ stackAttack: true, extraDefuse: 'two', swap: false });
  const swapsInPlay = (n) => Math.min(usesSecondDeck(n) ? 6 : 3, n - 1);
  function normalizeRules(r) {
    const out = {};
    for (const k of Object.keys(DEFAULT_RULES)) {
      const v = r && r[k];
      out[k] = RULE_OPTIONS[k].indexOf(v) >= 0 ? v : DEFAULT_RULES[k];
    }
    return out;
  }

  const kindOf = (id) => KIND_OF[id];
  const isCat = (k) => CATS.indexOf(k) >= 0;
  const cardName = (id) => NAMES[KIND_OF[id]];

  /* ───── 随机数：状态里只存一个整数 rs，可序列化（服务器 / 克隆都方便） ───── */
  function rand(state) {
    state.rs = (state.rs + 0x6D2B79F5) >>> 0;
    let t = state.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffleIn(state, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rand(state) * (i + 1)) | 0;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* 手牌排序：逗猫棒、不行、行动牌、猫，同种挨着 */
  const ORDER = [DEFUSE, NOPE, ATTACK, TATTACK, SKIP, BOTTOM, FAVOR, SWAP, SHUFFLE, FUTURE, ALTER].concat(CATS, [BOOM]);
  function sortHand(hand) {
    return hand.slice().sort((a, b) => (ORDER.indexOf(KIND_OF[a]) - ORDER.indexOf(KIND_OF[b])) || (a - b));
  }

  function newMemo(n) {
    const m = [];
    for (let s = 0; s < n; s++) m.push({ deck: [], hands: Array.from({ length: n }, () => []) });
    return m;
  }

  /* ───── 开局 ───── */
  function createGame(n, seed, rules) {
    if (!(n >= MIN_PLAYERS && n <= MAX_PLAYERS)) throw new Error('bad player count');
    rules = normalizeRules(rules);
    const state = {
      n, rules, rs: (seed >>> 0) || 1,
      deck: [], discard: [], removed: [], hands: [], alive: [], outOrder: [],
      turn: 0, turnsLeft: 1, phase: 'act', pending: null, give: null, pick: null, defuse: null, alter: null, steal: null,
      winner: -1, seq: 0, memo: newMemo(n), ins: null,
    };
    const booms = [], defuses = [], rest = [], swaps = [], unused = [];
    const top = usesSecondDeck(n) ? DECK_SIZE : BASE_SIZE;   // 5 人及以下只用第一副（发出来和以前一模一样）
    for (let id = top; id < DECK_SIZE; id++) unused.push(id);
    for (let id = 0; id < top; id++) {
      const k = KIND_OF[id];
      if (k === BOOM) booms.push(id); else if (k === DEFUSE) defuses.push(id); else if (k === SWAP) swaps.push(id); else rest.push(id);
    }
    const swapIn = rules.swap ? swaps.slice(0, swapsInPlay(n)) : [];
    rest.push(...swapIn);
    shuffleIn(state, rest);
    for (let s = 0; s < n; s++) {
      state.hands.push(sortHand(rest.splice(0, 4).concat(defuses.shift())));
      state.alive.push(true);
    }
    shuffleIn(state, booms);
    const extra = rules.extraDefuse === 'all' ? defuses.length : Math.min(2, defuses.length);
    state.deck = shuffleIn(state, rest.concat(booms.slice(0, n - 1), defuses.slice(0, extra)));
    state.removed = booms.slice(n - 1).concat(defuses.slice(extra), swaps.slice(swapIn.length), unused); // 这局不用的，收进盒子

    state.turn = (rand(state) * n) | 0;
    return state;
  }

  function cloneGame(s) {
    return {
      n: s.n, rules: s.rules, rs: s.rs,
      deck: s.deck.slice(), discard: s.discard.slice(), removed: s.removed.slice(), hands: s.hands.map((h) => h.slice()),
      alive: s.alive.slice(), outOrder: s.outOrder.slice(),
      turn: s.turn, turnsLeft: s.turnsLeft, phase: s.phase,
      pending: s.pending && Object.assign({}, s.pending, { cards: s.pending.cards.slice(), nopes: s.pending.nopes.slice(), passed: s.pending.passed.slice() }),
      give: s.give && Object.assign({}, s.give), pick: s.pick && Object.assign({}, s.pick), defuse: s.defuse && Object.assign({}, s.defuse),
      alter: s.alter && { by: s.alter.by, cards: s.alter.cards.slice() },
      steal: s.steal && { by: s.steal.by, from: s.steal.from, perm: s.steal.perm.slice() },
      winner: s.winner, seq: s.seq, ins: s.ins ? Object.assign({}, s.ins) : null,
      memo: s.memo.map((m) => ({ deck: m.deck.slice(), hands: m.hands.map((h) => h.slice()) })),
    };
  }

  /* ───── 查询 ───── */
  const aliveCount = (s) => s.alive.reduce((a, b) => a + (b ? 1 : 0), 0);
  function nextAlive(s, seat) {
    for (let i = 1; i <= s.n; i++) { const t = (seat + i) % s.n; if (s.alive[t]) return t; }
    return seat;
  }
  const countKind = (hand, k) => hand.reduce((a, id) => a + (KIND_OF[id] === k ? 1 : 0), 0);
  const findKind = (hand, k) => hand.find((id) => KIND_OF[id] === k);
  const kittensInDeck = (s) => s.deck.reduce((a, id) => a + (KIND_OF[id] === BOOM ? 1 : 0), 0);

  /* 一组牌是什么：返回 { type, needsTarget, needsName } 或 null（不能出）
   * type：五种行动牌名 | 'pair' | 'triple' | 'five' */
  function classify(cards) {
    if (!cards || !cards.length) return null;
    if (new Set(cards).size !== cards.length) return null;
    const kinds = cards.map((id) => KIND_OF[id]);
    if (kinds.indexOf(BOOM) >= 0) return null;
    if (cards.length === 1) {
      const k = kinds[0];
      if (ACTIONS.indexOf(k) < 0) return null;
      return { type: k, needsTarget: k === FAVOR || k === TATTACK || k === SWAP, needsName: false };
    }
    const same = kinds.every((k) => k === kinds[0]);
    if (cards.length === 2 && same) return { type: 'pair', needsTarget: true, needsName: false };
    if (cards.length === 3 && same) return { type: 'triple', needsTarget: true, needsName: true };
    // 五张：必须是五种猫各一张（橘猫 / 三花 / 奶牛猫 / 狸花 / 暹罗），行动牌、「作废」都不算
    if (cards.length === 5 && kinds.every(isCat) && new Set(kinds).size === 5) return { type: 'five', needsTarget: false, needsName: false };
    return null;
  }

  /* 能被指定的人：还在场、不是自己、手里有牌（指定甩锅不看手牌：在场的人都能甩） */
  function validTargets(s, seat, type) {
    const out = [];
    for (let t = 0; t < s.n; t++) if (t !== seat && s.alive[t] && (type === TATTACK || type === SWAP || s.hands[t].length > 0)) out.push(t);
    return out;
  }

  /* 出牌前的完整合法性检查；ok 时返回 classify 结果 */
  function checkPlay(s, seat, cards, opts) {
    opts = opts || {};
    if (s.phase !== 'act' || s.turn !== seat) return null;
    const hand = s.hands[seat];
    if (!cards.every((id) => hand.indexOf(id) >= 0)) return null;
    const c = classify(cards);
    if (!c) return null;
    if (c.needsTarget && validTargets(s, seat, c.type).indexOf(opts.target) < 0) return null;
    if (c.needsName && (KINDS.indexOf(opts.named) < 0 || opts.named === BOOM)) return null;
    // 五张各不同：弃牌堆空着也能出（出完这五张自己就在弃牌堆里了，可以捡回其中一张）
    return c;
  }

  /* ───── 知识维护 ───── */
  function forgetCard(s, id) { // 牌离开手牌进弃牌堆 / 出局：所有人关于它在谁手里的记忆作废
    for (const m of s.memo) for (const h of m.hands) { const i = h.indexOf(id); if (i >= 0) h.splice(i, 1); }
  }
  function learnHand(s, knower, holder, id) {
    const h = s.memo[knower].hands[holder];
    if (knower !== holder && h.indexOf(id) < 0) h.push(id);
  }
  function moveCard(s, from, to, id, witnesses) { // witnesses: 'all' | 座位数组（知道是哪张的人）
    const i = s.hands[from].indexOf(id);
    s.hands[from].splice(i, 1);
    s.hands[to].push(id);
    s.hands[to] = sortHand(s.hands[to]);
    forgetCard(s, id);
    for (let k = 0; k < s.n; k++) if (witnesses === 'all' || witnesses.indexOf(k) >= 0) learnHand(s, k, to, id);
  }

  /* ───── 回合推进 ───── */
  function endOneTurn(s, ev) {
    s.turnsLeft -= 1;
    if (s.turnsLeft <= 0) {
      s.turn = nextAlive(s, s.turn);
      s.turnsLeft = 1;
    }
    s.phase = 'act';
    ev.push({ t: 'turn', seat: s.turn, turnsLeft: s.turnsLeft });
  }

  /* ───── 出牌（进入反应窗） ───── */
  function play(s, seat, cards, opts) {
    opts = opts || {};
    const c = checkPlay(s, seat, cards, opts);
    if (!c) throw new Error('illegal play');
    for (const id of cards) { s.hands[seat].splice(s.hands[seat].indexOf(id), 1); s.discard.push(id); forgetCard(s, id); }
    s.seq += 1;
    s.pending = {
      by: seat, type: c.type, cards: cards.slice(),
      target: c.needsTarget ? opts.target : -1, named: c.needsName ? opts.named : null,
      nopes: [], passed: [],
    };
    s.phase = 'react';
    return [{ t: 'play', seat, cards: cards.slice(), type: c.type, target: s.pending.target, named: s.pending.named }];
  }

  /* 反应窗：谁还要表态（最后出牌 / 出「不行」的人自己不用） */
  function lastActor(s) { const p = s.pending; return p.nopes.length ? p.nopes[p.nopes.length - 1].seat : p.by; }
  function awaitingReaction(s) {
    if (s.phase !== 'react') return [];
    const last = lastActor(s), out = [];
    for (let t = 0; t < s.n; t++) if (s.alive[t] && t !== last && s.pending.passed.indexOf(t) < 0) out.push(t);
    return out;
  }
  function canNope(s, seat) {
    return s.phase === 'react' && s.alive[seat] && seat !== lastActor(s) && countKind(s.hands[seat], NOPE) > 0;
  }
  function nope(s, seat) {
    if (!canNope(s, seat)) throw new Error('illegal nope');
    const id = findKind(s.hands[seat], NOPE);
    s.hands[seat].splice(s.hands[seat].indexOf(id), 1);
    s.discard.push(id);
    forgetCard(s, id);
    s.pending.nopes.push({ seat, card: id });
    s.pending.passed = [];
    s.seq += 1;
    return [{ t: 'nope', seat, card: id, count: s.pending.nopes.length }];
  }
  function pass(s, seat) {
    if (s.phase !== 'react') return [];
    if (s.pending.passed.indexOf(seat) < 0) s.pending.passed.push(seat);
    return [];
  }
  const reactionDone = (s) => s.phase === 'react' && awaitingReaction(s).length === 0;
  const isCancelled = (s) => s.phase === 'react' && s.pending.nopes.length % 2 === 1;

  /* 反应窗关闭：结算（被作废就什么都不发生，牌照样进弃牌堆） */
  function closeReaction(s) {
    if (s.phase !== 'react') throw new Error('no reaction');
    const p = s.pending, ev = [];
    const cancelled = p.nopes.length % 2 === 1;
    s.pending = null;
    s.phase = 'act';
    ev.push({ t: 'resolve', seat: p.by, type: p.type, cancelled, target: p.target, named: p.named });
    if (cancelled) return ev;
    const me = p.by;
    switch (p.type) {
      case SKIP:
        endOneTurn(s, ev);
        break;
      case BOTTOM:
        // 抽底：这一回合不从顶上摸，改从牌堆最底下摸一张（摸完照常结束这一回合；摸到炸毛猫照样炸）
        if (s.deck.length) ev.push(...takeCard(s, me, true));
        break;
      case ATTACK:
      case TATTACK: {
        const left = s.turnsLeft;
        const next = p.type === TATTACK && s.alive[p.target] && p.target !== me ? p.target : nextAlive(s, me);
        s.turn = next;
        s.turnsLeft = s.rules.stackAttack && left > 1 ? left + 2 : 2;
        ev.push({ t: 'turn', seat: next, turnsLeft: s.turnsLeft, attacked: true });
        break;
      }
      case SHUFFLE:
        shuffleIn(s, s.deck);
        s.ins = null;
        for (const m of s.memo) m.deck = [];
        ev.push({ t: 'shuffle', seat: me });
        break;
      case FUTURE: {
        const top = s.deck.slice(0, 3);
        const m = s.memo[me].deck;
        for (const id of top) if (m.indexOf(id) < 0) m.push(id);
        ev.push({ t: 'future', seat: me, cards: top, priv: [me] });
        break;
      }
      case ALTER: {
        const top = s.deck.slice(0, 3);
        const m = s.memo[me].deck;
        for (const id of top) if (m.indexOf(id) < 0) m.push(id);
        if (top.length >= 2) {
          s.phase = 'alter';
          s.alter = { by: me, cards: top.slice() };
          ev.push({ t: 'alter', seat: me, cards: top, priv: [me] });
        } else {
          ev.push({ t: 'future', seat: me, cards: top, priv: [me] }); // 只剩一张：没得排，等于偷看
        }
        break;
      }
      case SWAP: {
        // 整手交换，逗猫棒各自留着；两人都看得到对方换过来的是哪些，别人只知道换了几张、以前记得的全作废
        const a = me, b = p.target;
        if (!s.alive[b]) break;
        const keepA = s.hands[a].filter((id) => KIND_OF[id] === DEFUSE), keepB = s.hands[b].filter((id) => KIND_OF[id] === DEFUSE);
        const moveA = s.hands[a].filter((id) => KIND_OF[id] !== DEFUSE), moveB = s.hands[b].filter((id) => KIND_OF[id] !== DEFUSE);
        for (const id of moveA.concat(moveB)) forgetCard(s, id);
        s.hands[a] = sortHand(keepA.concat(moveB));
        s.hands[b] = sortHand(keepB.concat(moveA));
        for (const id of moveA) learnHand(s, a, b, id);
        for (const id of moveB) learnHand(s, b, a, id);
        ev.push({ t: 'swap', a, b, toB: moveA.length, toA: moveB.length, cardsA: moveA, cardsB: moveB, priv: [a, b] });
        break;
      }
      case FAVOR:
        if (s.hands[p.target].length) {
          s.phase = 'give';
          s.give = { from: p.target, to: me };
          ev.push({ t: 'askGive', from: p.target, to: me });
        }
        break;
      case 'pair': {
        // 不再随机抽：对方的手牌打乱顺序扣着摆出来，出牌人自己点一张（stealPick）
        const h = s.hands[p.target];
        if (h.length) {
          s.phase = 'steal';
          s.steal = { by: me, from: p.target, perm: shuffleIn(s, h.slice()) };
          ev.push({ t: 'askSteal', by: me, from: p.target, count: h.length });
        }
        break;
      }
      case 'triple': {
        const id = findKind(s.hands[p.target], p.named);
        if (id != null) {
          moveCard(s, p.target, me, id, 'all');
          ev.push({ t: 'take', from: p.target, to: me, card: id, named: p.named });
        } else {
          ev.push({ t: 'miss', from: p.target, to: me, named: p.named });
        }
        break;
      }
      case 'five':
        if (s.discard.some((id) => KIND_OF[id] !== BOOM)) {
          s.phase = 'pick';
          s.pick = { by: me };
          ev.push({ t: 'askPick', seat: me });
        }
        break;
    }
    return ev;
  }

  function give(s, seat, id) {
    if (s.phase !== 'give' || s.give.from !== seat || s.hands[seat].indexOf(id) < 0) throw new Error('illegal give');
    const to = s.give.to;
    moveCard(s, seat, to, id, [seat, to]);
    s.give = null;
    s.phase = 'act';
    return [{ t: 'give', from: seat, to, card: id, priv: [seat, to] }];
  }

  function pickDiscard(s, seat, id) {
    if (s.phase !== 'pick' || s.pick.by !== seat) throw new Error('illegal pick');
    const i = s.discard.indexOf(id);
    if (i < 0 || KIND_OF[id] === BOOM) throw new Error('illegal pick');
    s.discard.splice(i, 1);
    s.hands[seat].push(id);
    s.hands[seat] = sortHand(s.hands[seat]);
    for (let k = 0; k < s.n; k++) learnHand(s, k, seat, id);
    s.pick = null;
    s.phase = 'act';
    return [{ t: 'pick', seat, card: id }];
  }

  /* 两张一样偷牌：点对方扣着的第 idx 张（perm 是开局就打乱好的顺序，idx 公开、是哪张只有两个人知道） */
  function stealPick(s, seat, idx) {
    if (s.phase !== 'steal' || s.steal.by !== seat) throw new Error('illegal steal');
    const perm = s.steal.perm;
    if (!(idx >= 0 && idx < perm.length) || (idx | 0) !== idx) throw new Error('illegal steal index');
    const from = s.steal.from, id = perm[idx];
    moveCard(s, from, seat, id, [seat, from]);
    s.steal = null;
    s.phase = 'act';
    return [{ t: 'steal', from, to: seat, card: id, idx, priv: [seat, from] }];
  }

  /* 「重排」：按 order（就是 s.alter.cards 换个顺序）放回牌堆顶；别人之前知道的这几张的位置作废 */
  function alterTop(s, seat, order) {
    if (s.phase !== 'alter' || s.alter.by !== seat) throw new Error('illegal alter');
    const cards = s.alter.cards;
    if (!Array.isArray(order) || order.length !== cards.length || order.some((id) => cards.indexOf(id) < 0) || new Set(order).size !== order.length) throw new Error('illegal alter order');
    s.deck.splice(0, order.length, ...order);
    for (let k = 0; k < s.n; k++) if (k !== seat) s.memo[k].deck = s.memo[k].deck.filter((id) => cards.indexOf(id) < 0);
    s.alter = null;
    s.phase = 'act';
    return [{ t: 'altered', seat, cards: order.slice(), priv: [seat] }];
  }

  /* ───── 摸牌（结束一个回合） ───── */
  function draw(s, seat) {
    if (s.phase !== 'act' || s.turn !== seat) throw new Error('illegal draw');
    return takeCard(s, seat, false);
  }
  // 摸一张（bottom = 从最底下摸，抽底用）：事件带 bottom 标记，动画从牌堆底下抽
  function takeCard(s, seat, bottom) {
    const id = bottom ? s.deck.pop() : s.deck.shift();
    const B = bottom ? { bottom: true } : null;
    s.seq += 1;
    if (s.ins) { if (bottom) s.ins.bot += 1; else s.ins.top += 1; }
    const ev = [];
    for (let k = 0; k < s.n; k++) { // 知道牌堆顶是哪张的人，也就知道它进了谁手里
      const d = s.memo[k].deck, i = d.indexOf(id);
      if (i >= 0) { d.splice(i, 1); if (KIND_OF[id] !== BOOM) learnHand(s, k, seat, id); }
    }
    if (KIND_OF[id] !== BOOM) {
      s.hands[seat].push(id);
      s.hands[seat] = sortHand(s.hands[seat]);
      ev.push(Object.assign({ t: 'draw', seat, card: id, priv: [seat] }, B));
      endOneTurn(s, ev);
      return ev;
    }
    ev.push(Object.assign({ t: 'boom', seat, card: id }, B));
    s.ins = null;
    const def = findKind(s.hands[seat], DEFUSE);
    if (def != null) {
      s.hands[seat].splice(s.hands[seat].indexOf(def), 1);
      s.discard.push(def);
      forgetCard(s, def);
      s.phase = 'defuse';
      s.defuse = { by: seat, card: id };
      ev.push({ t: 'defuse', seat, card: def, kitten: id });
      return ev;
    }
    // 炸毛出局：手牌连同炸毛猫全进弃牌堆，剩下的回合作废
    s.alive[seat] = false;
    s.outOrder.push(seat);
    const hand = s.hands[seat];
    s.hands[seat] = [];
    for (const c of hand) { s.discard.push(c); forgetCard(s, c); }
    s.discard.push(id);
    for (const m of s.memo) m.hands[seat] = [];
    ev.push({ t: 'out', seat, cards: hand });
    if (aliveCount(s) <= 1) {
      s.phase = 'over';
      s.winner = s.alive.indexOf(true);
      ev.push({ t: 'win', seat: s.winner });
      return ev;
    }
    s.turn = nextAlive(s, seat);
    s.turnsLeft = 1;
    s.phase = 'act';
    ev.push({ t: 'turn', seat: s.turn, turnsLeft: 1 });
    return ev;
  }

  /* pos：0 = 最上面，deck.length = 最底下 */
  function insertKitten(s, seat, pos) {
    if (s.phase !== 'defuse' || s.defuse.by !== seat) throw new Error('illegal insert');
    pos = Math.max(0, Math.min(s.deck.length, pos | 0));
    const id = s.defuse.card;
    s.deck.splice(pos, 0, id);
    for (let k = 0; k < s.n; k++) if (k !== seat) s.memo[k].deck = []; // 别人不知道塞在哪，原先记的位置全乱了
    if (s.memo[seat].deck.indexOf(id) < 0) s.memo[seat].deck.push(id);
    s.defuse = null;
    s.ins = { by: seat, size: s.deck.length, top: 0, bot: 0 };
    s.seq += 1;
    const ev = [{ t: 'insert', seat, card: id, pos, size: s.deck.length, priv: [seat] }];
    endOneTurn(s, ev);
    return ev;
  }

  /* 现在该谁做决定（反应窗返回还没表态的所有人） */
  function whoActs(s) {
    switch (s.phase) {
      case 'act': return [s.turn];
      case 'react': return awaitingReaction(s);
      case 'give': return [s.give.from];
      case 'pick': return [s.pick.by];
      case 'defuse': return [s.defuse.by];
      case 'alter': return [s.alter.by];
      case 'steal': return [s.steal.by];
      default: return [];
    }
  }

  /* 给某个座位看的公开信息 + 他自己的私有知识（机器人只能用这个） */
  function view(s, seat) {
    const memo = s.memo[seat];
    const known = [];
    for (const id of memo.deck) { const pos = s.deck.indexOf(id); if (pos >= 0) known.push({ pos, id }); }
    known.sort((a, b) => a.pos - b.pos);
    return {
      me: seat, n: s.n, rules: s.rules,
      hand: s.hands[seat].slice(),
      counts: s.hands.map((h) => h.length),
      alive: s.alive.slice(),
      deckSize: s.deck.length,
      kittens: kittensInDeck(s),
      discard: s.discard.slice(),
      known,
      handKnown: memo.hands.map((h) => h.slice()),
      turn: s.turn, turnsLeft: s.turnsLeft, phase: s.phase,
      pending: s.pending && { by: s.pending.by, type: s.pending.type, target: s.pending.target, named: s.pending.named, nopes: s.pending.nopes.length, cards: s.pending.cards.slice() },
      give: s.give, pick: s.pick,
      defuse: s.defuse && (s.defuse.by === seat ? { by: seat, card: s.defuse.card } : { by: s.defuse.by }),
      alter: s.alter && (s.alter.by === seat ? { by: seat, cards: s.alter.cards.slice() } : { by: s.alter.by }),
      steal: s.steal && { by: s.steal.by, from: s.steal.from, count: s.steal.perm.length },
      ins: s.ins ? Object.assign({}, s.ins) : null, // 公开：最近一次塞回炸毛猫的人、塞完后牌堆张数、之后从顶 / 底各摸走几张
      removed: s.removed.slice(), // 收进盒子的牌种是公开的（多余的炸毛猫 / 逗猫棒）
    };
  }

  /* 事件去敏：priv 不含 seat 的，去掉具体是哪张 / 位置 */
  function redactEvents(events, seat) {
    return events.map((e) => {
      if (!e.priv || e.priv.indexOf(seat) >= 0) { const o = Object.assign({}, e); delete o.priv; return o; }
      const o = Object.assign({}, e);
      delete o.priv; delete o.card; delete o.cards; delete o.pos; delete o.cardsA; delete o.cardsB;
      if (e.t === 'future' || e.t === 'alter' || e.t === 'altered') o.count = e.cards.length;
      return o;
    });
  }

  return {
    BOOM, DEFUSE, NOPE, ATTACK, TATTACK, SKIP, BOTTOM, FAVOR, SHUFFLE, FUTURE, ALTER, SWAP, CATS, ACTIONS, COUNTS, KINDS, NAMES, KIND_OF, DECK_SIZE,
    MIN_PLAYERS, MAX_PLAYERS, TWO_DECKS_FROM, BASE_SIZE, usesSecondDeck, RULE_OPTIONS, DEFAULT_RULES, normalizeRules, swapsInPlay,
    kindOf, isCat, cardName, sortHand, rand, shuffleIn,
    createGame, cloneGame, aliveCount, nextAlive, countKind, findKind, kittensInDeck,
    classify, validTargets, checkPlay, play, awaitingReaction, canNope, nope, pass, reactionDone, isCancelled, closeReaction,
    give, pickDiscard, alterTop, stealPick, draw, insertKitten, whoActs, view, redactEvents,
  };
});
