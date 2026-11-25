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
  if (d.type === 'alter') return R.alterTop(s, seat, d.order);
  if (d.type === 'steal') return R.stealPick(s, seat, d.idx);
  throw new Error('bad decision ' + JSON.stringify(d));
}

function playOut(n, seed, tiers, check, rules) {
  const s = R.createGame(n, seed, rules);
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

test('with swap cards on, every tier still plays legal moves to the end', () => {
  for (let n = 2; n <= 5; n++) {
    for (let seed = 1; seed <= 6; seed++) {
      const tiers = Array.from({ length: n }, (_, i) => A.TIERS[(i + seed) % 3]);
      const s = playOut(n, seed * 17 + n, tiers, null, { swap: true });
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
      assert.equal(all.length, R.DECK_SIZE);
      assert.equal(new Set(all).size, R.DECK_SIZE);
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
  assert.ok([R.SKIP, R.ATTACK, R.TATTACK, R.ALTER, R.SHUFFLE, R.BOTTOM].indexOf(R.KIND_OF[d.cards[0]]) >= 0);
  assert.ok(kitten >= 0);
});

test('iron rule: never draws a certain kitten without a defuse while holding a dodge (self-play, hard)', () => {
  // 对打里数：这一摸一定是猫（看过 / 看见塞在最上面 / 牌堆全是猫）、没逗猫棒、没别的救法、手里有甩锅 / 跳过 / 转向——还摸了，就算违规。
  // 改之前：经典 4 人高手这种局面里约 7% 直接摸，百变开交换约 15%
  const dodge = [R.ATTACK, R.TATTACK, R.SKIP, R.REVERSE];
  const rulesList = [Object.assign({}, R.DEFAULT_RULES), Object.assign({}, R.DEFAULT_RULES, { mode: 'flux', swap: true, swapDefuse: true })];
  let seen = 0;
  for (const rules of rulesList) for (let g = 0; g < 12; g++) {
    const s = R.createGame(4, 900 + g, rules);
    const st = { rs: g + 3 }; const rng = () => R.rand(st);
    let guard = 0;
    while (s.phase !== 'over') {
      assert.ok(++guard < 4000, 'runaway');
      if (s.phase === 'react') {
        for (const t of R.awaitingReaction(s)) { const d = A.decide(s, t, 'hard', rng); if (d.type === 'nope') { R.nope(s, t); break; } R.pass(s, t); }
        if (R.reactionDone(s)) R.closeReaction(s);
        continue;
      }
      const seat = R.whoActs(s)[0];
      const d = A.decide(s, seat, 'hard', rng);
      if (s.phase === 'act' && s.turn === seat && !s.flux) {
        const v = R.view(s, seat), hand = s.hands[seat].map((id) => R.KIND_OF[id]);
        const ins = v.ins, seenTop = ins && ins.seen === 'top' && ins.top === 0 && ins.card != null && ins.by !== seat;
        const certain = v.kittens >= v.deckSize || seenTop || v.known.some((k) => k.pos === 0 && R.KIND_OF[k.id] === R.BOOM);
        const teamSave = v.mates && v.mates.some((m) => v.alive[m]);
        if (certain && !teamSave && hand.indexOf(R.DEFUSE) < 0 && hand.some((k) => dodge.indexOf(k) >= 0)) {
          seen++;
          assert.notEqual(d.type, 'draw', 'drew a certain kitten while holding a dodge');
        }
      }
      apply(s, seat, d);
    }
  }
  assert.ok(seen > 5, 'too few doomed spots to test: ' + seen);
});

test('iron rule: never swaps a much bigger hand for a small one (self-play, roles, hard)', () => {
  // 改之前：角色猫模式高手约 15% 的交换是「我换出去的比换过来的多 4 张以上」（例：11 张换 2 张）
  const rules = Object.assign({}, R.DEFAULT_RULES, { mode: 'roles', swap: true, swapDefuse: true });
  let swaps = 0;
  for (let g = 0; g < 16; g++) {
    const s = R.createGame(4, 1234 + g, rules);
    const st = { rs: g + 9 }; const rng = () => R.rand(st);
    let guard = 0;
    while (s.phase !== 'over') {
      assert.ok(++guard < 5000, 'runaway');
      if (s.phase === 'react') {
        for (const t of R.awaitingReaction(s)) { const d = A.decide(s, t, 'hard', rng); if (d.type === 'nope') { R.nope(s, t); break; } R.pass(s, t); }
        if (R.reactionDone(s)) R.closeReaction(s);
        continue;
      }
      const seat = R.whoActs(s)[0];
      const d = A.decide(s, seat, 'hard', rng);
      if (d.type === 'play' && d.cards.length === 1 && R.KIND_OF[d.cards[0]] === R.SWAP) {
        swaps++;
        const v = R.view(s, seat), mine = s.hands[seat].length - 1, theirs = s.hands[d.target].length;
        const myDef = s.hands[seat].filter((id) => R.KIND_OF[id] === R.DEFUSE).length, thDef = v.handKnown[d.target].filter((id) => R.KIND_OF[id] === R.DEFUSE).length;
        if (thDef <= myDef) assert.ok(mine < theirs + 3, `swapped ${mine} cards for ${theirs}`);
      }
      apply(s, seat, d);
    }
  }
  assert.ok(swaps > 5, 'too few swaps to test: ' + swaps);
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
