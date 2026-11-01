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
  assert.equal(R.HEART_VALUES.reduce((a, b) => a + b, 0), -200);
});

test('scoring: plain cards', () => {
  assert.equal(R.scoreCaptured([]).total, 0);
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG]).total, -210);
  assert.equal(R.scoreCaptured([H('3'), H('4'), H('5'), R.SHEEP]).total, 90);
  assert.equal(R.scoreCaptured([R.PIG, R.SHEEP]).total, 0);
});

test('scoring: doubler', () => {
  assert.equal(R.scoreCaptured([R.DOUBLER]).total, 50);
  assert.equal(R.scoreCaptured([R.DOUBLER, H('2')]).total, 0, '0 分红桃也算有分牌');
  assert.equal(R.scoreCaptured([H('A'), H('K'), H('8'), H('7'), R.PIG, R.DOUBLER]).total, -420);
  assert.equal(R.scoreCaptured([R.SHEEP, R.DOUBLER]).total, 200);
});

test('scoring: all hearts and grand slam', () => {
  assert.equal(R.scoreCaptured(ALL_HEARTS).total, 200);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG]).total, 100, '全红猪不变色');
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG, R.SHEEP]).total, 200);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.DOUBLER]).total, 400);
  assert.equal(R.scoreCaptured([...ALL_HEARTS, R.PIG, R.SHEEP, R.DOUBLER]).total, 800);
  assert.equal(R.scoreCaptured(ALL_HEARTS.slice(1)).total, -200, '差一张 ♥2 不算全红');
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
    const r = R.createRound(hands, R.firstLeader(hands));
    assert.ok(r.hands[r.leader].includes(R.SPADE_TWO));
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
