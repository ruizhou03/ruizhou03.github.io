/* 拱猪 · 纯规则模块（浏览器 window.GongzhuRules / Node require 共用，无 DOM）
 *
 * 规则（2026-11-01 用户定稿，华牌通行版去掉亮牌、红桃改按牌面）：
 *   52 张、4 人各 13 张、不换牌；第一局 ♠2 的持有者先出，而且第一张必须打 ♠2；
 *   之后每局由上一局吃到猪的人先出（任意牌）；
 *   有该花色必须跟，没有可垫任意牌；任何牌都可领出（红桃不必「破」），首轮也可垫分牌；
 *   每墩由领出花色中最大的一张吃进。
 *   计分：红桃按牌面扣分 ♥2 −2 … ♥10 −10、♥J −11、♥Q −12、♥K −13，♥A 只扣 −1（合计 −91）；
 *         猪 ♠Q −100；羊 ♦J +100；
 *         变压器 ♣10：只吃到它、没有任何其它分牌 → +50（通行规则）；否则全部分数（正负都算）×2；
 *         全红（13 张红桃一人吃齐）→ 红桃记 +200；猪羊不变色；
 *         大满贯（红桃全 + 猪 + 羊 + 变压器）→ 猪也变正 → (200+100+100)×2 = +800。
 *   一盘打到有人累计 ≤ −1000 结束，此人当「猪」。
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
  const HEART_VALUES = Object.freeze([-2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -1]);
  const LOSE_LINE = -1000;

  function suitOf(card) { return (card / 13) | 0; }
  function rankOf(card) { return card % 13; }
  function cardLabel(card) { return SUIT_CHARS[suitOf(card)] + RANK_LABELS[rankOf(card)]; }
  function isHeart(card) { return card >= 13 && card < 26; }
  function isScoring(card) { return isHeart(card) || card === PIG || card === SHEEP || card === DOUBLER; }

  /* 卡的「面值」分（不含变压器倍数、全红 / 大满贯修正），给 UI 和 AI 估值用 */
  function rawValue(card) {
    if (isHeart(card)) return HEART_VALUES[card - 13];
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

  /* 一个人一局吃进的牌 → 本局得分。captured 只需含分牌，其它牌传进来也无妨 */
  function scoreCaptured(captured) {
    let hearts = 0, heartSum = 0, pig = false, sheep = false, doubler = false;
    for (const c of captured) {
      if (isHeart(c)) { hearts++; heartSum += HEART_VALUES[c - 13]; }
      else if (c === PIG) pig = true;
      else if (c === SHEEP) sheep = true;
      else if (c === DOUBLER) doubler = true;
    }
    const allHearts = hearts === 13;
    const grandSlam = allHearts && pig && sheep && doubler;
    const heartScore = allHearts ? 200 : heartSum;
    const pigScore = pig ? (grandSlam ? 100 : -100) : 0;
    const sheepScore = sheep ? 100 : 0;
    const others = hearts > 0 || pig || sheep;
    let total;
    if (doubler && !others) total = 50;
    else total = (heartScore + pigScore + sheepScore) * (doubler ? 2 : 1);
    return {
      total,
      heartScore, pigScore, sheepScore,
      hearts, pig, sheep, doubler,
      doublerAlone: doubler && !others,
      allHearts, grandSlam,
    };
  }

  /* ───── 一局的状态机（可变、可 clone，AI 搜索直接在副本上跑） ───── */

  /* mustLead：本局第一张必须打的牌（第一局 = ♠2），-1 表示不限 */
  function createRound(hands, leader, mustLead) {
    return {
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
    if (r.mustLead >= 0 && r.trickNo === 0 && !r.trick.length && r.hands[seat].includes(r.mustLead)) return [r.mustLead];
    return legalCards(r.hands[seat], leadSuitOf(r));
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
    const lead = leadSuitOf(r);
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
    return r.captured.map((c) => scoreCaptured(c).total);
  }

  /* ───── 一盘（多局，到 −1000 结束） ───── */

  function firstLeader(hands) {
    for (let s = 0; s < 4; s++) if (hands[s].includes(SPADE_TWO)) return s;
    return 0;
  }

  function isMatchOver(totals) { return totals.some((t) => t <= LOSE_LINE); }

  /* 一盘结束时的「猪」：分最低者（并列取座位号小的） */
  function matchLoser(totals) {
    let lo = 0;
    for (let s = 1; s < 4; s++) if (totals[s] < totals[lo]) lo = s;
    return lo;
  }

  return {
    SPADE, HEART, DIAMOND, CLUB,
    RANK_LABELS, SUIT_CHARS, PIG, SHEEP, DOUBLER, SPADE_TWO, HEART_VALUES, LOSE_LINE,
    suitOf, rankOf, cardLabel, isHeart, isScoring, rawValue,
    makeRng, shuffledDeck, deal, sortHand,
    legalCards, trickWinner, scoreCaptured,
    createRound, cloneRound, leadSuitOf, legalFor, isRoundOver, playCard, roundScores,
    firstLeader, isMatchOver, matchLoser,
  };
});
