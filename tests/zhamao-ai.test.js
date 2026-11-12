'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/zhamao-rules.js');
const A = require('../assets/js/games/zhamao-ai.js');

function apply(s, seat, d) {
  if (d.type === 'draw') return R.draw(s, seat);
  if (d.type === 'play') return R.play(s, seat, d.cards, d);
  if (d.type === 'give') return R.give(s, seat, d.card);
  if (d.type === 'pick') return R.pickDiscard(s, seat, d.card);
  if (d.type === 'insert') return R.insertKitten(s, seat, d.pos);
  throw new Error('bad decision ' + JSON.stringify(d));
}

function playOut(n, seed, tiers, check) {
  const s = R.createGame(n, seed);
  const st = { rs: seed + 5 }; const rng = () => R.rand(st);
  let guard = 0;
  while (s.phase !== 'over') {
    assert.ok(++guard < 4000, 'runaway');
    if (s.phase === 'react') {
      for (const t of R.awaitingReaction(s)) {
        const d = A.decide(s, t, tiers[t], rng);
        if (d.type === 'nope') { assert.ok(R.canNope(s, t)); R.nope(s, t); break; }
        R.pass(s, t);
      }
      if (R.reactionDone(s)) R.closeReaction(s);
      continue;
    }
    const seat = R.whoActs(s)[0];
    if (check) check(s, seat);
    const d = A.decide(s, seat, tiers[seat], rng);
    if (d.type === 'play') assert.ok(R.checkPlay(s, seat, d.cards, d), 'illegal play ' + JSON.stringify(d));
    apply(s, seat, d);
  }
  return s;
}

test('every tier only makes legal moves and games finish', () => {
  for (let n = 2; n <= 5; n++) {
    for (let seed = 1; seed <= 12; seed++) {
      const tiers = Array.from({ length: n }, (_, i) => A.TIERS[(i + seed) % 3]);
      const s = playOut(n, seed * 13 + n, tiers);
      assert.equal(R.aliveCount(s), 1);
    }
  }
});

test('determinize is consistent with what the seat knows', () => {
  for (let seed = 1; seed <= 40; seed++) {
    playOut(4, seed, ['normal', 'normal', 'normal', 'normal'], (s, seat) => {
      if (s.phase !== 'act' && s.phase !== 'defuse') return;
      const v = R.view(s, seat);
      const d = A.determinize(v, seed);
      const all = d.deck.concat(d.discard, d.removed, ...d.hands, d.defuse ? [d.defuse.card] : []);
      assert.equal(all.length, 56);
      assert.equal(new Set(all).size, 56);
      assert.deepEqual(d.hands[seat], s.hands[seat]);
      d.hands.forEach((h, i) => assert.equal(h.length, s.hands[i].length));
      for (const { pos, id } of v.known) assert.equal(d.deck[pos], id);
      assert.equal(R.kittensInDeck(d), R.kittensInDeck(s));
      d.hands.forEach((h) => assert.equal(R.countKind(h, R.BOOM), 0));
    });
  }
});

test('normal dodges a known kitten on top', () => {
  const s = R.createGame(3, 4);
  const kitten = R.KIND_OF.indexOf(R.BOOM);
  // 把一张炸毛猫挪到顶上，让当前玩家「看见」它
  const i = s.deck.findIndex((id) => R.KIND_OF[id] === R.BOOM);
  s.deck.unshift(s.deck.splice(i, 1)[0]);
  const me = s.turn;
  s.memo[me].deck = [s.deck[0]];
  const skip = R.KIND_OF.findIndex((k, id) => k === R.SKIP && s.hands.every((h) => h.indexOf(id) < 0) && s.deck.indexOf(id) >= 0);
  s.deck.splice(s.deck.indexOf(skip), 1);
  s.hands[me].push(skip);
  const d = A.decide(s, me, 'normal');
  assert.equal(d.type, 'play');
  assert.ok([R.SKIP, R.ATTACK, R.SHUFFLE].indexOf(R.KIND_OF[d.cards[0]]) >= 0);
  assert.ok(kitten >= 0);
});

test('hard beats normal heads-up (sanity, small sample)', () => {
  let hard = 0;
  const G = 40;
  for (let g = 0; g < G; g++) {
    const tiers = g % 2 ? ['hard', 'normal'] : ['normal', 'hard'];
    const s = playOut(2, 500 + g, tiers);
    if (tiers[s.winner] === 'hard') hard++;
  }
  assert.ok(hard >= 20, 'hard won only ' + hard + '/' + G);
});
