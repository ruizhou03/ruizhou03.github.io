'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/gongzhu-rules.js');

const H = (label) => R.HEART * 13 + R.RANK_LABELS.indexOf(label);
const ALL_HEARTS = Array.from({ length: 13 }, (_, i) => 13 + i);

test('special card codes', () => {
  assert.equal(R.cardLabel(R.PIG), '♠Q');
  assert.equal(R.cardLabel(R.SHEEP), '♦J');
  assert.equal(R.cardLabel(R.DOUBLER), '♣10');
  assert.equal(R.cardLabel(R.SPADE_TWO), '♠2');
  assert.equal(R.HEART_VALUES.reduce((a, b) => a + b, 0), -91);
  assert.equal(R.rawValue(H('2')), -2);
  assert.equal(R.rawValue(H('10')), -10);
  assert.equal(R.rawValue(H('K')), -13);
  assert.equal(R.rawValue(H('A')), -1);
});

test('scoring: plain cards', () => {
  assert.equal(R.scoreCaptured([]).total, 0);
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG]).total, -129);
  assert.equal(R.scoreCaptured([H('3'), H('4'), H('5'), R.SHEEP]).total, 88);
  assert.equal(R.scoreCaptured([R.PIG, R.SHEEP]).total, 0);
});

test('scoring: doubler', () => {
  assert.equal(R.scoreCaptured([R.DOUBLER]).total, 50);
  assert.equal(R.scoreCaptured([R.DOUBLER, H('2')]).total, -4);
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG, R.DOUBLER]).total, -258);
  assert.equal(R.scoreCaptured([R.SHEEP, R.DOUBLER]).total, 200);
});

test('scoring: all hearts and grand slam', () => {
  assert.equal(R.scoreCaptured(ALL_HEARTS).total, 200);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG]).total, 100, '全红猪不变色');
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG, R.SHEEP]).total, 200);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.DOUBLER]).total, 400);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG, R.SHEEP, R.DOUBLER]).total, 800);
  assert.equal(R.scoreCaptured(ALL_HEARTS.slice(1)).total, -89, '差一张 ♥2 不算全红');
});

test('legal cards: must follow suit, otherwise anything', () => {
  const hand = [0, 5, 14, 30];
  assert.deepEqual(R.legalCards(hand, R.SPADE), [0, 5]);
  assert.deepEqual(R.legalCards(hand, R.CLUB), hand);
  assert.deepEqual(R.legalCards(hand, -1), hand);
});

test('trick winner: only the led suit counts', () => {
  const ace = (s) => s * 13 + 12;
  const trick = [
    { seat: 2, card: R.SPADE * 13 + 3 },
    { seat: 3, card: ace(R.HEART) },
    { seat: 0, card: R.SPADE * 13 + 5 },
    { seat: 1, card: ace(R.CLUB) },
  ];
  assert.equal(R.trickWinner(trick), 0);
});

test('deal is reproducible and complete', () => {
  const a = R.deal(R.makeRng(7));
  const b = R.deal(R.makeRng(7));
  assert.deepEqual(a, b);
  assert.deepEqual(a.flat().sort((x, y) => x - y), Array.from({ length: 52 }, (_, i) => i));
  a.forEach((h) => assert.equal(h.length, 13));
});

test('random playouts keep invariants', () => {
  const rng = R.makeRng(42);
  for (let g = 0; g < 500; g++) {
    const hands = R.deal(rng);
    const r = R.createRound(hands, R.firstLeader(hands), R.SPADE_TWO);
    assert.ok(r.hands[r.leader].includes(R.SPADE_TWO));
    assert.deepEqual(R.legalFor(r, r.leader), [R.SPADE_TWO]);
    while (!R.isRoundOver(r)) {
      const legal = R.legalFor(r, r.turn);
      R.playCard(r, r.turn, legal[(rng() * legal.length) | 0]);
    }
    assert.equal(r.history.length, 13);
    r.hands.forEach((h) => assert.equal(h.length, 0));
    const capturedAll = r.captured.flat().sort((x, y) => x - y);
    assert.equal(capturedAll.length, 16);
    assert.ok(r.pigTaker >= 0 && r.captured[r.pigTaker].includes(R.PIG));
    // 每墩的赢家必须是下一墩的领出者
    for (let i = 1; i < 13; i++) assert.equal(r.history[i].leader, r.history[i - 1].winner);
  }
});

test('illegal plays are rejected', () => {
  const hands = R.deal(R.makeRng(1));
  const r = R.createRound(hands, 0);
  assert.throws(() => R.playCard(r, 1, hands[1][0]), /not_your_turn/);
  const lead = hands[0].find((c) => R.suitOf(c) === R.SPADE) ?? hands[0][0];
  R.playCard(r, 0, lead);
  const s = R.suitOf(lead);
  const off = r.hands[1].find((c) => R.suitOf(c) !== s);
  if (off !== undefined && r.hands[1].some((c) => R.suitOf(c) === s)) {
    assert.throws(() => R.playCard(r, 1, off), /must_follow/);
  }
});

test('match ends at -1000', () => {
  assert.equal(R.isMatchOver([0, -999, 100, 50]), false);
  assert.equal(R.isMatchOver([0, -1000, 100, 50]), true);
  assert.equal(R.matchLoser([0, -1200, 100, -1100]), 1);
});

test('first lead must be the spade two when required', () => {
  const hands = R.deal(R.makeRng(3));
  const leader = R.firstLeader(hands);
  const r = R.createRound(hands, leader, R.SPADE_TWO);
  const other = hands[leader].find((c) => c !== R.SPADE_TWO);
  assert.throws(() => R.playCard(r, leader, other), /must_lead/);
  R.playCard(r, leader, R.SPADE_TWO);
  const free = R.createRound(R.deal(R.makeRng(4)), 2);
  assert.equal(R.legalFor(free, 2).length, 13, '之后的局领出不受限');
});

/* ───── 可选规则（设置开关） ───── */

const ctx = (rules, exposed, swap) => ({ rules: R.normalizeRules(rules), exposed: exposed || [], swap: !!swap });

test('rules normalize to defaults', () => {
  assert.deepEqual(R.normalizeRules(null), R.DEFAULT_RULES);
  assert.deepEqual(R.normalizeRules({ hearts: 'classic', leader: 'nope' }), Object.assign({}, R.DEFAULT_RULES, { hearts: 'classic' }));
});

test('classic heart values', () => {
  assert.equal(R.HEART_VALUES_CLASSIC.reduce((a, b) => a + b, 0), -200);
  const c = ctx({ hearts: 'classic' });
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG], c).total, -210, '维基算例');
  assert.equal(R.scoreCaptured([H('3'), H('4'), H('5'), R.SHEEP], c).total, 90, '维基算例');
  assert.equal(R.scoreCaptured([H('3'), R.DOUBLER], c).total, 0, '0 分红桃也算分牌，变压器不再单吃 +50');
  assert.equal(R.scoreCaptured(ALL_HEARTS, c).total, 200);
});

test('exposed cards double', () => {
  const c = (ex) => ctx({ hearts: 'classic' }, ex);
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG], c([R.HEART_ACE])).total, -320, '维基：亮 ♥A');
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG], c([R.PIG])).total, -310, '维基：亮猪');
  assert.equal(R.scoreCaptured([R.SHEEP], c([R.SHEEP])).total, 200);
  assert.equal(R.scoreCaptured([R.DOUBLER], c([R.DOUBLER])).total, 100);
  assert.equal(R.scoreCaptured([R.PIG, R.DOUBLER], c([R.PIG, R.DOUBLER])).total, -800, 'Pagat：亮猪 + 亮变压器');
  assert.equal(R.scoreCaptured(ALL_HEARTS, c([R.HEART_ACE])).total, 400);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG, R.SHEEP, R.DOUBLER], c(R.EXPOSABLE.slice())).total, 3200, '维基：全亮大满贯');
});

test('all-hearts pig modes', () => {
  const hp = [...ALL_HEARTS, R.PIG];
  const hps = [...ALL_HEARTS, R.PIG, R.SHEEP];
  assert.equal(R.scoreCaptured(hp, ctx({ allHeartsPig: 'slam' })).total, 100);
  assert.equal(R.scoreCaptured(hp, ctx({ allHeartsPig: 'hearts' })).total, 300, 'Pagat 主规则');
  assert.equal(R.scoreCaptured(hp, ctx({ allHeartsPig: 'manjuan' })).total, 100);
  assert.equal(R.scoreCaptured(hps, ctx({ allHeartsPig: 'manjuan' })).total, 400, '猪羊满圈');
  assert.equal(R.scoreCaptured(hps, ctx({ allHeartsPig: 'slam' })).total, 200);
  // 猪羊变色：别人全红时，吃猪的人 +100、吃羊的人 −100
  assert.equal(R.scoreCaptured([R.PIG], ctx({ allHeartsPig: 'swap' }, [], true)).total, 100);
  assert.equal(R.scoreCaptured([R.SHEEP, R.DOUBLER], ctx({ allHeartsPig: 'swap' }, [], true)).total, -200);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG, R.SHEEP, R.DOUBLER], ctx({ allHeartsPig: 'swap' }, [], true)).total, 800, '大满贯例外');
});

test('swap is detected from the round', () => {
  const hands = R.deal(R.makeRng(9));
  const r = R.createRound(hands, 0, -1, { allHeartsPig: 'swap' });
  r.captured = [ALL_HEARTS.slice(), [R.PIG], [R.SHEEP], []];
  assert.deepEqual(R.roundScores(r), [200, 100, -100, 0]);
  r.rules = R.normalizeRules({ allHeartsPig: 'slam' });
  assert.deepEqual(R.roundScores(r), [200, -100, 100, 0]);
});

test('exposed card cannot go to the first trick of its suit', () => {
  // seat 0：♠2 ♠5 ♠Q(亮) ♥3；seat 1：♠A ♦2；seat 2：♠9 ♣2；seat 3：♦5 ♣3
  const hands = [[0, 3, R.PIG, 14], [12, 26], [7, 39], [29, 40]];
  const r = R.createRound(hands, 1, -1);
  R.expose(r, 0, R.PIG);
  assert.throws(() => R.expose(r, 1, 12), /bad_card/);
  R.playCard(r, 1, 12);  // 领 ♠A：黑桃第一墩
  assert.deepEqual(R.legalFor(r, 2), [7]);
  R.playCard(r, 2, 7);
  R.playCard(r, 3, 29);
  assert.deepEqual(R.legalFor(r, 0), [0, 3], '亮出的猪不能跟在黑桃第一墩');
  assert.throws(() => R.playCard(r, 0, R.PIG), /exposed_first_round/);
  R.playCard(r, 0, 3);
  // 下一墩 seat 1 领（♠A 吃）；黑桃已领过，之后猪随便出
  R.playCard(r, 1, 26);
  assert.ok(R.legalFor(r, 2).includes(39));
});

test('exposed card: no leading it into a fresh suit, unless it is the only one', () => {
  const r = R.createRound([[R.SHEEP, 30, 0], [1, 27, 40], [2, 28, 41], [3, 29, 42]], 0, -1);
  R.expose(r, 0, R.SHEEP);
  assert.deepEqual(R.legalFor(r, 0), [30, 0]);
  const solo = R.createRound([[R.SHEEP, 0], [1, 40], [2, 41], [3, 42]], 0, -1);
  R.expose(solo, 0, R.SHEEP);
  assert.deepEqual(R.legalFor(solo, 0), [R.SHEEP, 0]);
  const off = R.createRound([[R.PIG], [1], [2], [3]], 0, -1, { expose: false });
  assert.throws(() => R.expose(off, 0, R.PIG), /disabled/);
});

test('round start: who leads and whether the spade two is forced', () => {
  const hands = R.deal(R.makeRng(5));
  const s2 = R.firstLeader(hands);
  const other = (s2 + 1) % 4;
  assert.deepEqual(R.roundStart({}, hands, false, other), { leader: s2, mustLead: R.SPADE_TWO }, '默认：每局 ♠2 先出且必须打 ♠2');
  assert.deepEqual(R.roundStart({ leader: 'pig' }, hands, false, other), { leader: other, mustLead: -1 });
  assert.deepEqual(R.roundStart({ leader: 'pig' }, hands, true, other), { leader: s2, mustLead: R.SPADE_TWO });
  assert.deepEqual(R.roundStart({ spadeTwoFirst: false }, hands, true, -1), { leader: s2, mustLead: -1 });
});

test('match end modes and tied pigs', () => {
  assert.equal(R.isMatchOver([1000, 0, 0, -50], { end: 'lose1000' }, 3), false);
  assert.equal(R.isMatchOver([1000, 0, 0, -50], { end: 'pm1000' }, 3), true);
  assert.equal(R.isMatchOver([0, 0, 0, 0], { end: 'rounds10' }, 9), false);
  assert.equal(R.isMatchOver([0, 0, 0, 0], { end: 'rounds10' }, 10), true);
  assert.equal(R.isMatchOver([-5000, 0, 0, 0], { end: 'none' }, 99), false);
  assert.deepEqual(R.matchLosers([-1100, 20, -1100, 5]), [0, 2]);
});

test('random playouts with exposures under every rule set', () => {
  const rng = R.makeRng(77);
  const keys = Object.keys(R.RULE_OPTIONS);
  for (let g = 0; g < 600; g++) {
    const rules = {};
    for (const k of keys) rules[k] = R.RULE_OPTIONS[k][(rng() * R.RULE_OPTIONS[k].length) | 0];
    rules.expose = true;
    const hands = R.deal(rng);
    const st = R.roundStart(rules, hands, rng() < 0.5, (rng() * 4) | 0);
    const r = R.createRound(hands, st.leader, st.mustLead, rules);
    for (const c of R.EXPOSABLE) if (rng() < 0.5) R.expose(r, hands.findIndex((h) => h.includes(c)), c);
    while (!R.isRoundOver(r)) {
      const legal = R.legalFor(r, r.turn);
      assert.ok(legal.length > 0);
      R.playCard(r, r.turn, legal[(rng() * legal.length) | 0]);
    }
    assert.equal(R.roundScores(r).length, 4);
  }
});
