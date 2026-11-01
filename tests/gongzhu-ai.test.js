'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/gongzhu-rules.js');
const AI = require('../assets/js/games/gongzhu-ai.js');

function playOut(policies, seed) {
  const rng = R.makeRng(seed);
  const hands = R.deal(rng);
  const r = R.createRound(hands, R.firstLeader(hands));
  while (!R.isRoundOver(r)) {
    const s = r.turn;
    const card = policies[s](r, s, rng);
    assert.ok(R.legalFor(r, s).includes(card), `seat ${s} played illegal ${R.cardLabel(card)}`);
    R.playCard(r, s, card);
  }
  return R.roundScores(r);
}

test('heuristic policies only play legal cards', () => {
  for (let g = 0; g < 300; g++) playOut([AI.basicPolicy, AI.countingPolicy, AI.randomPolicy, AI.countingPolicy], g + 1);
});

test('search policies only play legal cards', () => {
  const pimc = AI.makePimc({ samples: 6 });
  const ismcts = AI.makeIsmcts({ iterations: 80 });
  for (let g = 0; g < 6; g++) playOut([pimc, AI.countingPolicy, ismcts, AI.basicPolicy], 100 + g);
});

test('every tier resolves to a working policy', () => {
  for (const tier of Object.keys(AI.TIERS)) playOut([0, 1, 2, 3].map(() => AI.policyForTier(tier)), 7);
});

test('determinize keeps own hand, hand sizes and known voids', () => {
  const rng = R.makeRng(9);
  for (let g = 0; g < 200; g++) {
    const hands = R.deal(rng);
    const r = R.createRound(hands, R.firstLeader(hands));
    const stop = (rng() * 40) | 0;
    for (let i = 0; i < stop; i++) R.playCard(r, r.turn, AI.basicPolicy(r, r.turn, rng));
    const seat = r.turn;
    const d = AI.determinize(r, seat, rng);
    assert.deepEqual(d.hands[seat], r.hands[seat]);
    const all = d.hands.flat().concat(Array.from({ length: 52 }, (_, c) => c).filter((c) => r.played[c]));
    assert.deepEqual(all.sort((a, b) => a - b), Array.from({ length: 52 }, (_, c) => c));
    for (let s = 0; s < 4; s++) {
      assert.equal(d.hands[s].length, r.hands[s].length);
      for (const c of d.hands[s]) assert.ok(s === seat || !r.voids[s][R.suitOf(c)], 'sampled card breaks a known void');
    }
  }
});

test('counting dumps the pig under a higher spade', () => {
  // 我（座位 3）手里 ♠Q ♠5 ♥2，别人领 ♠3、♠K 已经压上：该垫猪
  const hands = [[1], [11], [2], [R.PIG, 3, 14]];
  const r = R.createRound(hands, 0);
  r.hands = [[1, 20], [11, 21], [2, 22], [R.PIG, 3, 14]];
  R.playCard(r, 0, 1);
  R.playCard(r, 1, 11);
  R.playCard(r, 2, 2);
  assert.equal(AI.countingPolicy(r, 3), R.PIG);
});

test('determinize keeps exposed cards with their owners', () => {
  const rng = R.makeRng(11);
  for (let g = 0; g < 50; g++) {
    const hands = R.deal(rng);
    const r = R.createRound(hands, R.firstLeader(hands), -1);
    for (const c of R.EXPOSABLE) R.expose(r, hands.findIndex((h) => h.includes(c)), c);
    const viewer = g % 4;
    const d = AI.determinize(r, viewer, rng);
    for (const [c, o] of r.exposed) assert.ok(d.hands[o].includes(c));
    d.hands.forEach((h, s) => assert.equal(h.length, hands[s].length));
    assert.equal(new Set(d.hands.flat()).size, 52);
  }
});

test('exposers return only exposable cards from the own hand, and nothing when disabled', () => {
  const rng = R.makeRng(12);
  for (let g = 0; g < 10; g++) {
    const hands = R.deal(rng);
    const r = R.createRound(hands, R.firstLeader(hands), R.SPADE_TWO);
    for (let s = 0; s < 4; s++) {
      for (const tier of ['easy', 'normal', 'hard']) {
        const e = AI.exposerForTier(tier)(r, s, rng);
        for (const c of e) assert.ok(R.EXPOSABLE.includes(c) && hands[s].includes(c));
      }
    }
    const off = R.createRound(hands, 0, -1, { expose: false });
    assert.deepEqual(AI.exposerForTier('hard')(off, 0, rng), []);
  }
});

test('all tiers play legal cards with exposures and other rules', () => {
  const rng = R.makeRng(13);
  const rulesList = [{ hearts: 'classic', allHeartsPig: 'swap' }, { leader: 'pig', allHeartsPig: 'manjuan' }];
  for (const rules of rulesList) {
    const hands = R.deal(rng);
    const r = R.createRound(hands, R.firstLeader(hands), R.SPADE_TWO, rules);
    for (const c of R.EXPOSABLE) R.expose(r, hands.findIndex((h) => h.includes(c)), c);
    const tiers = ['easy', 'normal', 'hard', 'normal'];
    while (!R.isRoundOver(r)) {
      const s = r.turn;
      const pol = s === 2 ? AI.makeIsmcts({ iterations: 200 }) : AI.policyForTier(tiers[s]);
      const c = pol(r, s, rng);
      assert.ok(R.legalFor(r, s).includes(c));
      R.playCard(r, s, c);
    }
  }
});
