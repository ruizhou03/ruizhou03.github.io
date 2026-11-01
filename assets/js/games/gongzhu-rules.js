/* 拱猪 · 纯规则模块（浏览器 window.GongzhuRules / Node require 共用，无 DOM）
 *
 * 规则（2026-11-01 与用户逐条定稿；对照 Pagat「Gong Zhu」与中文维基「拱猪」）：
 *   52 张、4 人各 13 张、不换牌；有该花色必须跟，没有可垫任意牌；任何牌都可领出（红桃不必「破」）；
 *   没有将牌，每墩由领出花色中最大的一张吃进；首墩也可以垫分牌。
 *   计分：猪 ♠Q −100；羊 ♦J +100；
 *         变压器 ♣10：只吃到它、没有任何其它分牌 → +50；否则全部分数（正负都算）×2；
 *         全红（13 张红桃一人吃齐）→ 红桃记 +200；
 *         大满贯（红桃全 + 猪 + 羊 + 变压器）→ 全部为正 → (200+100+100)×2 = +800。
 *   亮牌：开局前 ♥A ♠Q ♦J ♣10 的持有者可以亮出：♥A 亮 → 红桃全部 ×2（全红 +400）；
 *         ♠Q 亮 → ±200；♦J 亮 → +200；♣10 亮 → ×4、单吃 +100。
 *         亮出的牌在该花色第一次被领出的那一墩里不能出（也不能拿它首领该花色），除非那门只剩它一张；垫牌不受限。
 *
 * 可选规则（RULES，设置里的开关；默认值 = 用户自家玩法）：
 *   spadeTwoFirst  ♠2 先出的那一局，第一张必须是 ♠2（主流只要求 ♠2 持有者先出）
 *   leader         'spade2' 每局都由 ♠2 持有者先出 | 'pig' 第一局 ♠2、之后上局吃猪的人先出（主流）
 *   hearts         'face' 按牌面 2…10、J−11 Q−12 K−13 A−1（合计 −91）
 *                  | 'classic' A−50 K−40 Q−30 J−20 10~5 各−10 4~2 为 0（合计 −200，0 分的也算分牌）
 *   allHeartsPig   全红时猪怎么算：'slam' 只有大满贯才变正 | 'hearts' 全红 + 猪即变 +100（Pagat）
 *                  | 'manjuan' 全红 + 猪 + 羊才变正（猪羊满圈）| 'swap' 有人全红时这一局所有人的猪羊互换正负（猪羊变色，大满贯除外）
 *   expose         是否允许亮牌
 *   end            一盘何时结束：'lose1000' 有人到 −1000 | 'pm1000' 有人到 ±1000 | 'rounds10' 打满 10 局 | 'none' 不设终点
 *                  结束时分最低的人当猪，并列都是猪。
 *
 * 牌编码：card = suit * 13 + rank；suit 0♠ 1♥ 2♦ 3♣（与掼蛋一致）；rank 0=2 … 12=A。
 * 座位 0..3，出牌顺序 seat → (seat + 1) % 4。牌桌上画成逆时针由 UI 负责。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GongzhuRules = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SPADE = 0, HEART = 1, DIAMOND = 2, CLUB = 3;
  const RANK_LABELS = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
  const SUIT_CHARS = Object.freeze(['♠', '♥', '♦', '♣']);
  const PIG = SPADE * 13 + 10;      // ♠Q
  const SHEEP = DIAMOND * 13 + 9;   // ♦J
  const DOUBLER = CLUB * 13 + 8;    // ♣10
  const SPADE_TWO = SPADE * 13 + 0; // ♠2
  const HEART_ACE = HEART * 13 + 12; // ♥A
  const HEART_VALUES = Object.freeze([-2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -1]);
  const HEART_VALUES_CLASSIC = Object.freeze([0, 0, 0, -10, -10, -10, -10, -10, -10, -20, -30, -40, -50]);
  const EXPOSABLE = Object.freeze([HEART_ACE, PIG, SHEEP, DOUBLER]);
  const LOSE_LINE = -1000;

  const RULE_OPTIONS = Object.freeze({
    spadeTwoFirst: [true, false],
    leader: ['spade2', 'pig'],
    hearts: ['face', 'classic'],
    allHeartsPig: ['slam', 'hearts', 'manjuan', 'swap'],
    expose: [true, false],
    end: ['lose1000', 'pm1000', 'rounds10', 'none'],
  });
  const DEFAULT_RULES = Object.freeze({
    spadeTwoFirst: true, leader: 'spade2', hearts: 'face', allHeartsPig: 'slam', expose: true, end: 'lose1000',
  });
  /* 缺省 / 不认识的值都回落到默认值；老代码不传 rules 时行为与 2026-11-01 定稿一致（不亮牌另行由 exposed 为空保证） */
  function normalizeRules(x) {
    const out = {};
    for (const k of Object.keys(DEFAULT_RULES)) out[k] = x && RULE_OPTIONS[k].includes(x[k]) ? x[k] : DEFAULT_RULES[k];
    return out;
  }
  function heartValue(card, rules) {
    return ((rules && rules.hearts === 'classic') ? HEART_VALUES_CLASSIC : HEART_VALUES)[card - 13];
  }

  function suitOf(card) { return (card / 13) | 0; }
  function rankOf(card) { return card % 13; }
  function cardLabel(card) { return SUIT_CHARS[suitOf(card)] + RANK_LABELS[rankOf(card)]; }
  function isHeart(card) { return card >= 13 && card < 26; }
  function isScoring(card) { return isHeart(card) || card === PIG || card === SHEEP || card === DOUBLER; }

  /* 卡的「面值」分（不含变压器倍数、全红 / 大满贯修正），给 UI 和 AI 估值用 */
  function rawValue(card, rules) {
    if (isHeart(card)) return heartValue(card, rules);
    if (card === PIG) return -100;
    if (card === SHEEP) return 100;
    return 0;
  }

  /* mulberry32：可复现发牌（调试、复式对局、联机由服务器给种子都靠它） */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledDeck(rng) {
    const deck = [];
    for (let c = 0; c < 52; c++) deck.push(c);
    for (let i = 51; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck;
  }

  function deal(rng) {
    const deck = shuffledDeck(rng || Math.random);
    const hands = [[], [], [], []];
    for (let i = 0; i < 52; i++) hands[i % 4].push(deck[i]);
    hands.forEach(sortHand);
    return hands;
  }

  /* 手牌排序：♠ ♥ ♣ ♦ 黑红相间，同花色从小到大 */
  const SUIT_ORDER = [0, 1, 3, 2];
  function sortKey(card) { return SUIT_ORDER[suitOf(card)] * 13 + rankOf(card); }
  function sortHand(hand) { hand.sort((a, b) => sortKey(a) - sortKey(b)); return hand; }

  /* 可出的牌：领出时全部可出；跟牌时有该花色只能出该花色 */
  function legalCards(hand, leadSuit) {
    if (leadSuit < 0) return hand.slice();
    const follow = hand.filter((c) => suitOf(c) === leadSuit);
    return follow.length ? follow : hand.slice();
  }

  /* trick = [{ seat, card }]，第一张为领出 */
  function trickWinner(trick) {
    const lead = suitOf(trick[0].card);
    let best = trick[0];
    for (let i = 1; i < trick.length; i++) {
      const p = trick[i];
      if (suitOf(p.card) === lead && rankOf(p.card) > rankOf(best.card)) best = p;
    }
    return best.seat;
  }

  /* 一个人一局吃进的牌 → 本局得分。captured 只需含分牌，其它牌传进来也无妨。
   * ctx（可省）= { rules, exposed: 亮出的牌（数组）, swap: 本局有人全红且规则是猪羊变色 }，用 scoreCtx(r) 从局面取 */
  function scoreCaptured(captured, ctx) {
    const rules = (ctx && ctx.rules) || DEFAULT_RULES;
    const ex = (ctx && ctx.exposed) || [];
    let hearts = 0, heartSum = 0, pig = false, sheep = false, doubler = false;
    for (const c of captured) {
      if (isHeart(c)) { hearts++; heartSum += heartValue(c, rules); }
      else if (c === PIG) pig = true;
      else if (c === SHEEP) sheep = true;
      else if (c === DOUBLER) doubler = true;
    }
    const heartMul = ex.includes(HEART_ACE) ? 2 : 1;
    const pigVal = ex.includes(PIG) ? 200 : 100;
    const sheepVal = ex.includes(SHEEP) ? 200 : 100;
    const dblMul = ex.includes(DOUBLER) ? 4 : 2;
    const allHearts = hearts === 13;
    const grandSlam = allHearts && pig && sheep && doubler;
    const swapped = !!(ctx && ctx.swap) && !grandSlam;
    let pigPositive = grandSlam;
    if (rules.allHeartsPig === 'hearts' && allHearts) pigPositive = true;
    if (rules.allHeartsPig === 'manjuan' && allHearts && sheep) pigPositive = true;
    if (swapped) pigPositive = true;
    const heartScore = (allHearts ? 200 : heartSum) * heartMul;
    const pigScore = pig ? (pigPositive ? pigVal : -pigVal) : 0;
    const sheepScore = sheep ? (swapped ? -sheepVal : sheepVal) : 0;
    const others = hearts > 0 || pig || sheep;
    let total;
    if (doubler && !others) total = dblMul * 25;   // 单吃：+50，亮过 +100
    else total = (heartScore + pigScore + sheepScore) * (doubler ? dblMul : 1);
    return {
      total,
      heartScore, pigScore, sheepScore,
      hearts, pig, sheep, doubler,
      doublerAlone: doubler && !others,
      allHearts, grandSlam,
    };
  }

  function exposedCards(r) { return r.exposed.map((e) => e[0]); }
  function exposedOwner(r, card) { for (const e of r.exposed) if (e[0] === card) return e[1]; return -1; }
  function swapActive(r) {
    return r.rules.allHeartsPig === 'swap' && r.captured.some((c) => c.filter(isHeart).length === 13);
  }
  function scoreCtx(r) { return { rules: r.rules, exposed: exposedCards(r), swap: swapActive(r) }; }

  /* ───── 一局的状态机（可变、可 clone，AI 搜索直接在副本上跑） ───── */

  /* mustLead：本局第一张必须打的牌（♠2），-1 表示不限。rules 缺省 = DEFAULT_RULES。
   * 亮牌在第一张牌打出之前用 expose() 登记。 */
  function createRound(hands, leader, mustLead, rules) {
    return {
      rules: normalizeRules(rules),
      exposed: [],         // [[card, seat], ...]：亮出的牌及其主人（公开信息）
      led: [false, false, false, false],  // 各花色是否已被领出过（亮牌限制要用）
      firstOfSuit: false,  // 当前这墩是不是领出花色的第一墩
      mustLead: mustLead === undefined ? -1 : mustLead,
      hands: hands.map((h) => h.slice()),
      leader,
      turn: leader,
      trick: [],
      trickNo: 0,          // 已完成的墩数 0..13
      captured: [[], [], [], []],  // 每人吃进的分牌（公开信息）
      history: [],         // 已完成的墩：{ leader, plays: [{seat,card}], winner }
      voids: [[false, false, false, false], [false, false, false, false],
        [false, false, false, false], [false, false, false, false]],
      pigTaker: -1,
      played: new Array(52).fill(false),  // 已打出（含当前墩）的牌
    };
  }

  function cloneRound(r) {
    return {
      rules: r.rules,
      exposed: r.exposed,  // 开打后不再变
      led: r.led.slice(),
      firstOfSuit: r.firstOfSuit,
      mustLead: r.mustLead,
      hands: r.hands.map((h) => h.slice()),
      leader: r.leader,
      turn: r.turn,
      trick: r.trick.slice(),
      trickNo: r.trickNo,
      captured: r.captured.map((c) => c.slice()),
      history: r.history,  // 只追加不改，搜索里不需要深拷
      voids: r.voids.map((v) => v.slice()),
      pigTaker: r.pigTaker,
      played: r.played.slice(),
    };
  }

  function leadSuitOf(r) { return r.trick.length ? suitOf(r.trick[0].card) : -1; }
  function legalFor(r, seat) {
    const hand = r.hands[seat];
    if (r.mustLead >= 0 && r.trickNo === 0 && !r.trick.length && hand.includes(r.mustLead)) return [r.mustLead];
    const legal = legalCards(hand, leadSuitOf(r));
    if (!r.exposed.length) return legal;
    return legal.filter((c) => !exposedBlocked(r, seat, c));
  }
  /* 亮出的牌：该花色第一次被领出的那一墩不能跟出它、也不能拿它首领该花色，除非那门只剩它一张；垫牌不受限 */
  function exposedBlocked(r, seat, card) {
    if (exposedOwner(r, card) !== seat) return false;
    const s = suitOf(card);
    const lead = leadSuitOf(r);
    const firstTime = lead < 0 ? !r.led[s] : (lead === s && r.firstOfSuit);
    if (!firstTime) return false;
    return r.hands[seat].some((c) => c !== card && suitOf(c) === s);
  }
  /* 开打前亮牌：card 必须在 seat 手里、是可亮的四张之一 */
  function expose(r, seat, card) {
    if (!r.rules.expose) throw new Error('gongzhu_expose_disabled');
    if (r.trickNo > 0 || r.trick.length) throw new Error('gongzhu_expose_too_late');
    if (!EXPOSABLE.includes(card) || !r.hands[seat].includes(card)) throw new Error('gongzhu_expose_bad_card');
    if (exposedOwner(r, card) < 0) r.exposed = r.exposed.concat([[card, seat]]);
  }
  function isRoundOver(r) { return r.trickNo >= 13; }

  /* 出一张牌。返回 null（墩未完）或 { winner, plays }（刚完成的墩）。非法出牌抛错。 */
  function playCard(r, seat, card) {
    if (seat !== r.turn) throw new Error('gongzhu_not_your_turn');
    const hand = r.hands[seat];
    const idx = hand.indexOf(card);
    if (idx < 0) throw new Error('gongzhu_card_not_in_hand');
    if (r.mustLead >= 0 && r.trickNo === 0 && !r.trick.length && card !== r.mustLead && hand.includes(r.mustLead)) {
      throw new Error('gongzhu_must_lead_' + r.mustLead);
    }
    if (r.exposed.length && exposedBlocked(r, seat, card) && (r.trick.length === 0 || suitOf(card) === leadSuitOf(r))) {
      throw new Error('gongzhu_exposed_first_round');
    }
    const lead = leadSuitOf(r);
    if (lead < 0) { r.firstOfSuit = !r.led[suitOf(card)]; r.led[suitOf(card)] = true; }
    if (lead >= 0 && suitOf(card) !== lead) {
      if (hand.some((c) => suitOf(c) === lead)) throw new Error('gongzhu_must_follow');
      r.voids[seat][lead] = true;
    }
    hand.splice(idx, 1);
    r.played[card] = true;
    r.trick.push({ seat, card });
    if (r.trick.length < 4) { r.turn = (seat + 1) % 4; return null; }
    const plays = r.trick;
    const winner = trickWinner(plays);
    for (const p of plays) {
      if (isScoring(p.card)) r.captured[winner].push(p.card);
      if (p.card === PIG) r.pigTaker = winner;
    }
    r.history.push({ leader: plays[0].seat, plays, winner });
    r.trick = [];
    r.trickNo++;
    r.leader = winner;
    r.turn = winner;
    return { winner, plays };
  }

  function roundScores(r) {
    const ctx = scoreCtx(r);
    return r.captured.map((c) => scoreCaptured(c, ctx).total);
  }

  /* ───── 一盘（多局） ───── */

  function firstLeader(hands) {
    for (let s = 0; s < 4; s++) if (hands[s].includes(SPADE_TWO)) return s;
    return 0;
  }

  /* 这一局谁先出、第一张是否必须 ♠2。first = 本盘第一局；pigTaker = 上局吃猪的人 */
  function roundStart(rules, hands, first, pigTaker) {
    rules = normalizeRules(rules);
    const bySpade = first || rules.leader === 'spade2' || pigTaker < 0;
    const leader = bySpade ? firstLeader(hands) : pigTaker;
    return { leader, mustLead: bySpade && rules.spadeTwoFirst ? SPADE_TWO : -1 };
  }

  /* roundsPlayed：已打完的局数（'rounds10' 用） */
  function isMatchOver(totals, rules, roundsPlayed) {
    const end = normalizeRules(rules).end;
    if (end === 'none') return false;
    if (end === 'rounds10') return (roundsPlayed | 0) >= 10;
    if (end === 'pm1000') return totals.some((t) => t <= LOSE_LINE || t >= -LOSE_LINE);
    return totals.some((t) => t <= LOSE_LINE);
  }

  /* 一盘结束时的「猪」：分最低者，并列都是 */
  function matchLosers(totals) {
    const lo = Math.min(...totals);
    return [0, 1, 2, 3].filter((s) => totals[s] === lo);
  }
  function matchLoser(totals) { return matchLosers(totals)[0]; }

  return {
    SPADE, HEART, DIAMOND, CLUB,
    RANK_LABELS, SUIT_CHARS, PIG, SHEEP, DOUBLER, SPADE_TWO, HEART_ACE, HEART_VALUES, HEART_VALUES_CLASSIC, EXPOSABLE, LOSE_LINE,
    RULE_OPTIONS, DEFAULT_RULES, normalizeRules, heartValue,
    suitOf, rankOf, cardLabel, isHeart, isScoring, rawValue,
    makeRng, shuffledDeck, deal, sortHand,
    legalCards, trickWinner, scoreCaptured, scoreCtx, exposedCards, exposedOwner, swapActive,
    createRound, cloneRound, leadSuitOf, legalFor, exposedBlocked, expose, isRoundOver, playCard, roundScores,
    firstLeader, roundStart, isMatchOver, matchLosers, matchLoser,
  };
});
