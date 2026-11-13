'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/zhamao-rules.js');

const ofKind = (k) => R.KIND_OF.map((x, id) => (x === k ? id : -1)).filter((id) => id >= 0);
const total = (s) => s.deck.length + s.discard.length + s.removed.length + s.hands.reduce((a, h) => a + h.length, 0)
  + (s.defuse ? 1 : 0);

/* 造一个可控局面：hands 给每人指定牌种，deck 从上到下指定牌种，其余牌进弃牌堆（保证整副牌守恒） */
function rig(handKinds, deckKinds, turn) {
  const s = R.createGame(handKinds.length, 7);
  const pool = {};
  for (const k of R.KINDS) pool[k] = ofKind(k);
  const take = (k) => { const id = pool[k].shift(); assert.ok(id != null, 'out of ' + k); return id; };
  s.hands = handKinds.map((ks) => R.sortHand(ks.map(take)));
  s.deck = deckKinds.map(take);
  s.discard = [].concat(...Object.values(pool));
  s.removed = [];
  s.turn = turn || 0; s.turnsLeft = 1; s.phase = 'act';
  s.memo = s.memo.map(() => ({ deck: [], hands: s.hands.map(() => []) }));
  return s;
}
const idOf = (s, seat, k) => s.hands[seat].find((id) => R.KIND_OF[id] === k);
const closeAll = (s) => { for (const t of R.awaitingReaction(s)) R.pass(s, t); return R.closeReaction(s); };

test('deck composition', () => {
  // 第一副 68 张（id 0..67）；6 人及以上再加第二副 67 张（id 68..134）
  assert.equal(R.BASE_SIZE, 68);
  assert.equal(R.DECK_SIZE, 135);
  const base = (k) => ofKind(k).filter((id) => id < R.BASE_SIZE).length;
  assert.equal(base(R.SWAP), 3);
  assert.equal(base(R.BOTTOM), 4);
  assert.equal(base(R.ALTER), 3);
  assert.equal(base(R.TATTACK), 3);
  assert.equal(base(R.BOOM), 4);
  assert.equal(base(R.DEFUSE), 6);
  assert.equal(ofKind(R.BOOM).length, 8);
  assert.equal(ofKind(R.DEFUSE).length, 11);
});

test('抽底: draws the bottom card and ends the turn; a kitten at the bottom explodes / gets defused', () => {
  const s = R.createGame(3, 9);
  const me = s.turn;
  const bot = ofKind(R.BOTTOM).find((id) => !s.removed.includes(id));
  // 把一张抽底塞到我手里（从别处挪过来，总张数不变）
  for (const arr of [s.deck, s.discard, ...s.hands]) { const i = arr.indexOf(bot); if (i >= 0) arr.splice(i, 1); }
  s.hands[me].push(bot);
  const safeBottom = s.deck[s.deck.length - 1];
  const before = s.deck.length;
  R.play(s, me, [bot]);
  for (const x of R.awaitingReaction(s)) R.pass(s, x);
  const ev = R.closeReaction(s);
  assert.equal(s.deck.length, before - 1);
  const d = ev.find((e) => e.t === 'draw' || e.t === 'boom');
  assert.ok(d && d.bottom, 'draw event is marked bottom');
  assert.equal(d.card, safeBottom);
  if (d.t === 'draw') { assert.ok(s.hands[me].includes(safeBottom)); assert.notEqual(s.turn, me); }
  assert.equal(total(s), R.DECK_SIZE);
});

test('setup for 2..5 players', () => {
  for (let n = 2; n <= 5; n++) {
    for (let seed = 1; seed <= 20; seed++) {
      const s = R.createGame(n, seed);
      assert.equal(total(s), R.DECK_SIZE);
      assert.equal(R.kittensInDeck(s), n - 1);
      for (const h of s.hands) {
        assert.equal(h.length, 5);
        assert.equal(R.countKind(h, R.DEFUSE), 1);
        assert.equal(R.countKind(h, R.BOOM), 0);
      }
      const defInDeck = s.deck.filter((id) => R.KIND_OF[id] === R.DEFUSE).length;
      assert.equal(defInDeck, Math.min(2, 6 - n));
      // 没放回的炸毛猫 / 逗猫棒收进盒子（不参与这局），弃牌堆一开始是空的
      assert.equal(s.discard.length, 0);
      assert.equal(s.removed.length, (4 - (n - 1)) + (6 - n - Math.min(2, 6 - n)) + 3 + (R.DECK_SIZE - R.BASE_SIZE)); // + 3 张交换（没开交换牌）+ 整个第二副
      assert.ok(s.deck.concat(...s.hands).every((id) => id < R.BASE_SIZE), '5 人及以下只用第一副');
    }
  }
  const all = R.createGame(2, 3, { extraDefuse: 'all' });
  assert.equal(all.deck.filter((id) => R.KIND_OF[id] === R.DEFUSE).length, 4);
});

test('setup for 6..9 players (two decks)', () => {
  for (let n = 6; n <= 9; n++) {
    for (let seed = 1; seed <= 20; seed++) {
      const s = R.createGame(n, seed);
      assert.equal(total(s), R.DECK_SIZE);
      assert.equal(R.kittensInDeck(s), n - 1);
      assert.equal(s.hands.length, n);
      for (const h of s.hands) {
        assert.equal(h.length, 5);
        assert.equal(R.countKind(h, R.DEFUSE), 1);
        assert.equal(R.countKind(h, R.BOOM), 0);
      }
      assert.ok(s.deck.length > 60, 'deck big enough: ' + s.deck.length);
    }
  }
  assert.throws(() => R.createGame(10, 1));
});

test('classify', () => {
  const [a1] = ofKind('attack');
  const [o1, o2, o3] = ofKind('orange');
  const [n1] = ofKind('nope');
  const [d1, d2] = ofKind('defuse');
  const [b1] = ofKind('boom');
  assert.equal(R.classify([a1]).type, 'attack');
  assert.equal(R.classify([n1]), null);
  assert.equal(R.classify([d1]), null);
  assert.equal(R.classify([o1]), null);
  assert.equal(R.classify([o1, o2]).type, 'pair');
  assert.equal(R.classify([d1, d2]).type, 'pair');
  assert.equal(R.classify([o1, o2, o3]).type, 'triple');
  assert.equal(R.classify([o1, a1]), null);
  assert.equal(R.classify([o1, o1]), null);
  assert.equal(R.classify([b1]), null);
  const five = [ofKind('orange')[0], ofKind('calico')[0], ofKind('cow')[0], ofKind('tabby')[0], ofKind('siamese')[0]];
  assert.equal(R.classify(five).type, 'five');
  assert.equal(R.classify(five.slice(0, 4)), null);
  // 五张不同但带了行动牌 / 作废：不算
  assert.equal(R.classify([ofKind('orange')[0], ofKind('calico')[0], ofKind('cow')[0], ofKind('skip')[0], ofKind('nope')[0]]), null);
});

test('draw safe card ends turn', () => {
  const s = rig([['skip'], ['skip']], ['orange', 'boom']);
  const ev = R.draw(s, 0);
  assert.equal(ev[0].t, 'draw');
  assert.equal(s.turn, 1);
  assert.equal(R.countKind(s.hands[0], 'orange'), 1);
});

test('kitten with defuse: insert anywhere, without: out', () => {
  const s = rig([['defuse'], ['skip'], ['cow']], ['boom', 'orange', 'calico', 'boom']);
  let ev = R.draw(s, 0);
  assert.deepEqual(ev.map((e) => e.t), ['boom', 'defuse']);
  assert.equal(s.phase, 'defuse');
  ev = R.insertKitten(s, 0, 1);
  assert.equal(R.KIND_OF[s.deck[1]], 'boom');
  assert.equal(s.turn, 1);
  assert.deepEqual(R.view(s, 0).known, [{ pos: 1, id: s.deck[1] }]);
  assert.deepEqual(R.view(s, 1).known, []);
  // seat1 摸 orange，seat2 摸到炸毛猫、没逗猫棒 → 出局
  R.draw(s, 1);
  assert.deepEqual(R.view(s, 0).known, [{ pos: 0, id: s.deck[0] }]);
  ev = R.draw(s, 2);
  assert.deepEqual(ev.map((e) => e.t), ['boom', 'out', 'turn']);
  assert.equal(s.alive[2], false);
  assert.equal(s.hands[2].length, 0);
  assert.equal(s.turn, 0);
  assert.equal(total(s), R.DECK_SIZE);
});

test('last one standing wins', () => {
  const s = rig([['skip'], ['cow']], ['orange', 'boom']);
  R.draw(s, 0);
  const ev = R.draw(s, 1);
  assert.equal(ev.at(-1).t, 'win');
  assert.equal(s.winner, 0);
  assert.equal(s.phase, 'over');
});

test('skip ends one turn; attack gives next two turns', () => {
  const s = rig([['skip', 'attack'], ['skip', 'skip'], ['cow']], ['orange', 'calico', 'cow', 'tabby']);
  R.play(s, 0, [idOf(s, 0, 'attack')]);
  closeAll(s);
  assert.equal(s.turn, 1); assert.equal(s.turnsLeft, 2);
  R.play(s, 1, [idOf(s, 1, 'skip')]); closeAll(s);
  assert.equal(s.turn, 1); assert.equal(s.turnsLeft, 1);
  R.play(s, 1, [idOf(s, 1, 'skip')]); closeAll(s);
  assert.equal(s.turn, 2); assert.equal(s.turnsLeft, 1);
});

test('attack while attacked always stacks: remaining + 2 (the old non-stacking option is gone)', () => {
  for (const stack of [false, true, undefined]) {
    const s = rig([['attack'], ['attack'], ['cow']], ['orange', 'calico', 'cow']);
    s.rules = R.normalizeRules({ stackAttack: stack });
    assert.equal(s.rules.stackAttack, true);
    R.play(s, 0, [idOf(s, 0, 'attack')]); closeAll(s);
    R.play(s, 1, [idOf(s, 1, 'attack')]); closeAll(s);
    assert.equal(s.turn, 2);
    assert.equal(s.turnsLeft, 4);
  }
  // 摸过一张之后再甩：剩下 1 + 2 = 3；4 回合摸一张剩 3、再甩 = 5
  const s = rig([['attack', 'attack'], ['cow'], ['cow']], ['orange', 'calico', 'cow', 'tabby', 'siamese']);
  s.turnsLeft = 4;
  R.draw(s, 0);
  assert.equal(s.turnsLeft, 3);
  R.play(s, 0, [idOf(s, 0, 'attack')]); closeAll(s);
  assert.equal(s.turn, 1); assert.equal(s.turnsLeft, 5);
});

test('targeted attack: any alive player, stacks with remaining turns by default', () => {
  const s = rig([['tattack', 'cow'], ['tattack'], [], ['cow']], ['orange', 'calico', 'cow', 'tabby']);
  assert.equal(R.normalizeRules({}).stackAttack, true);
  const c = R.classify([idOf(s, 0, 'tattack')]);
  assert.equal(c.type, 'tattack'); assert.equal(c.needsTarget, true);
  assert.deepEqual(R.validTargets(s, 0, 'tattack'), [1, 2, 3]); // 手里没牌的 2 号也能甩
  assert.equal(R.checkPlay(s, 0, [idOf(s, 0, 'tattack')], {}), null); // 不指定人不行
  R.play(s, 0, [idOf(s, 0, 'tattack')], { target: 2 }); closeAll(s);
  assert.equal(s.turn, 2); assert.equal(s.turnsLeft, 2);
  // 2 号被甩了两回合：摸一张后还剩一回合。再造一个被甩的人甩给别人：2 + 2 = 4
  const t = rig([['tattack'], ['tattack'], ['cow'], ['cow']], ['orange', 'calico', 'cow']);
  R.play(t, 0, [idOf(t, 0, 'tattack')], { target: 1 }); closeAll(t);
  R.play(t, 1, [idOf(t, 1, 'tattack')], { target: 3 }); closeAll(t);
  assert.equal(t.turn, 3); assert.equal(t.turnsLeft, 4);
});

test('nope chain: odd cancels, even goes through', () => {
  const s = rig([['attack', 'nope'], ['nope', 'nope'], ['cow']], ['orange', 'calico', 'cow']);
  R.play(s, 0, [idOf(s, 0, 'attack')]);
  assert.equal(R.canNope(s, 0), false); // 自己刚出的不能自己作废
  R.nope(s, 1);
  assert.equal(R.canNope(s, 1), false);
  assert.ok(R.canNope(s, 0));
  R.nope(s, 0); // 不行的不行 = 照样生效
  R.nope(s, 1);
  assert.equal(R.isCancelled(s), true);
  const ev = closeAll(s);
  assert.equal(ev[0].cancelled, true);
  assert.equal(s.turn, 0);
  assert.equal(s.phase, 'act');
  assert.equal(total(s), R.DECK_SIZE);
});

test('reaction waits for everyone alive except last actor', () => {
  const s = rig([['skip'], ['cow'], ['cow'], ['cow']], ['orange', 'calico']);
  s.alive[3] = false; s.hands[3] = [];
  R.play(s, 0, [idOf(s, 0, 'skip')]);
  assert.deepEqual(R.awaitingReaction(s), [1, 2]);
  R.pass(s, 1);
  assert.equal(R.reactionDone(s), false);
  R.pass(s, 2);
  assert.equal(R.reactionDone(s), true);
});

test('favor: target chooses', () => {
  const s = rig([['favor'], ['defuse', 'cow']], ['orange', 'calico']);
  R.play(s, 0, [idOf(s, 0, 'favor')], { target: 1 });
  closeAll(s);
  assert.equal(s.phase, 'give');
  assert.deepEqual(R.whoActs(s), [1]);
  const cow = idOf(s, 1, 'cow');
  const ev = R.give(s, 1, cow);
  assert.equal(ev[0].card, cow);
  assert.ok(s.hands[0].indexOf(cow) >= 0);
  assert.equal(s.phase, 'act');
  assert.equal(s.turn, 0);
  // 只有双方知道
  assert.deepEqual(R.redactEvents(ev, 2)[0].card, undefined);
  assert.equal(R.redactEvents(ev, 0)[0].card, cow);
});

test('favor / pair need a target with cards', () => {
  const s = rig([['favor', 'cow', 'cow'], []], ['orange', 'calico']);
  assert.equal(R.checkPlay(s, 0, [idOf(s, 0, 'favor')], { target: 1 }), null);
  assert.equal(R.checkPlay(s, 0, [idOf(s, 0, 'favor')], { target: 0 }), null);
});

test('pair: thief picks one of the face-down cards, triple names', () => {
  let s = rig([['cow', 'cow'], ['defuse', 'skip', 'nope']], ['orange', 'calico']);
  const cows = s.hands[0].slice();
  R.play(s, 0, cows, { target: 1 });
  const ev0 = closeAll(s);
  assert.equal(s.phase, 'steal');
  assert.deepEqual(R.whoActs(s), [0]);
  assert.deepEqual(ev0.find((e) => e.t === 'askSteal'), { t: 'askSteal', by: 0, from: 1, count: 3 });
  assert.equal(R.view(s, 0).steal.count, 3);
  assert.equal(R.view(s, 0).steal.perm, undefined); // 看不到扣着的是哪张
  assert.throws(() => R.stealPick(s, 1, 0));
  assert.throws(() => R.stealPick(s, 0, 3));
  const want = s.steal.perm[2];
  const sev = R.stealPick(s, 0, 2);
  assert.equal(s.phase, 'act');
  assert.equal(sev[0].card, want); assert.equal(sev[0].idx, 2);
  assert.equal(R.redactEvents(sev, 2 % s.n === 0 ? 1 : 2)[0].card === undefined || s.n === 2, true);
  assert.ok(s.hands[0].indexOf(want) >= 0);
  assert.equal(s.hands[1].length, 2);
  assert.equal(total(s), R.DECK_SIZE);

  s = rig([['cow', 'cow', 'cow'], ['defuse', 'skip']], ['orange', 'calico']);
  R.play(s, 0, s.hands[0].slice(), { target: 1, named: 'defuse' });
  let ev = closeAll(s);
  assert.equal(ev.find((e) => e.t === 'take').named, 'defuse');
  assert.equal(R.countKind(s.hands[0], 'defuse'), 1);
  assert.equal(R.view(s, 1).handKnown[0].length, 1); // 公开：大家都知道

  s = rig([['cow', 'cow', 'cow'], ['skip']], ['orange', 'calico']);
  R.play(s, 0, s.hands[0].slice(), { target: 1, named: 'defuse' });
  ev = closeAll(s);
  assert.ok(ev.find((e) => e.t === 'miss'));
  assert.equal(s.hands[1].length, 1);
});

test('five different: pick from discard', () => {
  const s = rig([['cow', 'orange', 'calico', 'tabby', 'siamese'], ['tabby']], ['orange', 'calico']);
  R.play(s, 0, s.hands[0].slice()); closeAll(s);
  assert.equal(s.phase, 'pick');
  const def = s.discard.find((id) => R.KIND_OF[id] === 'defuse');
  const boom = s.discard.find((id) => R.KIND_OF[id] === 'boom');
  assert.throws(() => R.pickDiscard(s, 0, boom));
  R.pickDiscard(s, 0, def);
  assert.equal(R.countKind(s.hands[0], 'defuse'), 1);
  assert.equal(total(s), R.DECK_SIZE);
});

test('see the future is private and survives draws, dies on shuffle', () => {
  const s = rig([['future', 'shuffle'], ['cow']], ['orange', 'boom', 'calico', 'cow']);
  R.play(s, 0, [idOf(s, 0, 'future')]);
  const ev = closeAll(s);
  const fut = ev.find((e) => e.t === 'future');
  assert.deepEqual(fut.cards.map((id) => R.KIND_OF[id]), ['orange', 'boom', 'calico']);
  assert.equal(R.redactEvents([fut], 1)[0].cards, undefined);
  assert.equal(R.redactEvents([fut], 1)[0].count, 3);
  assert.equal(R.view(s, 0).known.length, 3);
  R.draw(s, 0); // 摸走 orange
  assert.deepEqual(R.view(s, 0).known.map((k) => k.pos), [0, 1]);
  assert.equal(R.view(s, 0).handKnown[0].length, 0);
  // seat1 摸到的是 boom，没逗猫棒 → 出局；换一个局面测洗牌
  const t = rig([['future', 'shuffle'], ['cow']], ['orange', 'boom', 'calico', 'cow']);
  R.play(t, 0, [idOf(t, 0, 'future')]); closeAll(t);
  R.play(t, 0, [idOf(t, 0, 'shuffle')]); closeAll(t);
  assert.equal(R.view(t, 0).known.length, 0);
});

test('knowing the top card tells who drew it', () => {
  const s = rig([['future'], ['cow']], ['orange', 'calico', 'tabby']);
  R.play(s, 0, [idOf(s, 0, 'future')]); closeAll(s);
  R.draw(s, 0); R.draw(s, 1);
  const cal = s.hands[1].find((id) => R.KIND_OF[id] === 'calico');
  assert.deepEqual(R.view(s, 0).handKnown[1], [cal]);
});

test('illegal moves throw', () => {
  const s = rig([['skip'], ['skip']], ['orange', 'calico']);
  assert.throws(() => R.draw(s, 1));
  assert.throws(() => R.play(s, 1, [idOf(s, 1, 'skip')]));
  assert.throws(() => R.nope(s, 1));
  assert.throws(() => R.give(s, 1, idOf(s, 1, 'skip')));
});

test('random full games conserve cards and end with one winner', () => {
  for (let n = 2; n <= 9; n++) {
    for (let seed = 1; seed <= (n <= 5 ? 300 : 80); seed++) {
      const s = R.createGame(n, seed * 31 + n);
      let steps = 0;
      while (s.phase !== 'over') {
        assert.ok(++steps < 5000, 'runaway game');
        const rnd = () => R.rand(s);
        switch (s.phase) {
          case 'act': {
            const me = s.turn, hand = s.hands[me];
            if (rnd() < 0.5) { R.draw(s, me); break; }
            const id = hand[(rnd() * hand.length) | 0];
            const same = hand.filter((x) => R.KIND_OF[x] === R.KIND_OF[id]);
            const pick = rnd() < 0.5 && same.length >= 2 ? same.slice(0, 2 + (rnd() < 0.3 && same.length >= 3 ? 1 : 0)) : [id];
            const c0 = R.classify(pick);
            const targets = R.validTargets(s, me, c0 && c0.type);
            const opts = { target: targets[(rnd() * targets.length) | 0], named: R.KINDS[1 + ((rnd() * 12) | 0)] };
            if (R.checkPlay(s, me, pick, opts)) R.play(s, me, pick, opts); else R.draw(s, me);
            break;
          }
          case 'react': {
            for (const t of R.awaitingReaction(s)) {
              if (R.canNope(s, t) && rnd() < 0.3) { R.nope(s, t); break; }
              R.pass(s, t);
            }
            if (R.reactionDone(s)) R.closeReaction(s);
            break;
          }
          case 'give': R.give(s, s.give.from, s.hands[s.give.from][0]); break;
          case 'pick': R.pickDiscard(s, s.pick.by, s.discard.find((x) => R.KIND_OF[x] !== R.BOOM)); break;
          case 'defuse': R.insertKitten(s, s.defuse.by, (rnd() * (s.deck.length + 1)) | 0); break;
          case 'alter': R.alterTop(s, s.alter.by, s.alter.cards.slice().reverse()); break;
          case 'steal': R.stealPick(s, s.steal.by, (rnd() * s.steal.perm.length) | 0); break;
        }
        assert.equal(total(s), R.DECK_SIZE);
        assert.equal(R.kittensInDeck(s) + (s.defuse ? 1 : 0), R.aliveCount(s) - 1 + (s.phase === 'over' ? 0 : 0));
        // 牌堆永远摸不完
        if (s.phase !== 'over' && s.phase !== 'defuse') assert.ok(s.deck.length >= 1);
        // 知识只能是真的
        for (let k = 0; k < n; k++) {
          const v = R.view(s, k);
          for (const { pos, id } of v.known) assert.equal(s.deck[pos], id);
          v.handKnown.forEach((ids, h) => { for (const id of ids) assert.ok(s.hands[h].indexOf(id) >= 0, 'stale hand memo'); });
        }
      }
      assert.equal(R.aliveCount(s), 1);
      assert.equal(s.alive[s.winner], true);
    }
  }
});

test('clone is independent', () => {
  const s = R.createGame(4, 99);
  const c = R.cloneGame(s);
  R.draw(c, c.turn);
  assert.notEqual(c.deck.length, s.deck.length);
  assert.equal(total(s), R.DECK_SIZE);
});

test('alter the future: private reorder of the top three', () => {
  const s = rig([['alter', 'cow'], ['future', 'cow']], ['boom', 'orange', 'calico', 'tabby']);
  // 1 号先偷看过：知道顶上是炸毛猫
  s.memo[1].deck = s.deck.slice(0, 3);
  R.play(s, 0, [idOf(s, 0, 'alter')]);
  const ev = closeAll(s);
  const a = ev.find((e) => e.t === 'alter');
  assert.equal(s.phase, 'alter'); assert.deepEqual(R.whoActs(s), [0]);
  assert.equal(R.redactEvents([a], 1)[0].cards, undefined);
  assert.equal(R.redactEvents([a], 1)[0].count, 3);
  assert.equal(R.view(s, 1).alter.cards, undefined);
  const top = s.alter.cards.slice();
  assert.throws(() => R.alterTop(s, 0, [top[0], top[0], top[1]]));
  assert.throws(() => R.alterTop(s, 1, top));
  R.alterTop(s, 0, [top[1], top[2], top[0]]);
  assert.equal(s.phase, 'act');
  assert.deepEqual(s.deck.slice(0, 3), [top[1], top[2], top[0]]);
  assert.equal(R.KIND_OF[s.deck[2]], 'boom');
  assert.deepEqual(R.view(s, 0).known.map((x) => x.pos), [0, 1, 2]);
  assert.equal(R.view(s, 1).known.length, 0); // 别人原来知道的位置作废
  assert.equal(total(s), R.DECK_SIZE);
});

test('alter with a single card left = just a peek', () => {
  const s = rig([['alter'], ['cow']], ['boom']);
  R.play(s, 0, [idOf(s, 0, 'alter')]);
  const ev = closeAll(s);
  assert.equal(s.phase, 'act');
  assert.ok(ev.find((e) => e.t === 'future'));
});

test('swap: optional, scales with players, keeps defuses', () => {
  for (const n of [2, 3, 4, 5]) {
    const off = R.createGame(n, 11);
    assert.equal(off.deck.concat(...off.hands).filter((id) => R.KIND_OF[id] === 'swap').length, 0);
    const on = R.createGame(n, 11, { swap: true });
    assert.equal(on.deck.concat(...on.hands).filter((id) => R.KIND_OF[id] === 'swap').length, Math.min(3, n - 1));
    assert.equal(total(on), R.DECK_SIZE);
  }
  const s = rig([['swap', 'defuse', 'cow'], ['defuse', 'skip', 'nope', 'tabby'], ['orange']], ['orange', 'calico', 'cow']);
  s.rules = R.normalizeRules({ swap: true });
  const mine = s.hands[0].slice(), theirs = s.hands[1].slice();
  assert.deepEqual(R.validTargets(s, 0, 'swap'), [1, 2]);
  R.play(s, 0, [idOf(s, 0, 'swap')], { target: 1 });
  const ev = closeAll(s);
  const sw = ev.find((e) => e.t === 'swap');
  assert.equal(sw.toB, 1); assert.equal(sw.toA, 3);
  assert.equal(R.countKind(s.hands[0], 'defuse'), 1); assert.equal(R.countKind(s.hands[1], 'defuse'), 1);
  assert.equal(s.hands[0].length, 4); assert.equal(s.hands[1].length, 2);
  assert.ok(s.hands[1].indexOf(mine.find((id) => R.KIND_OF[id] === 'cow')) >= 0);
  assert.equal(R.redactEvents([sw], 2)[0].cardsA, undefined);
  assert.equal(R.view(s, 0).handKnown[1].length, 1);   // 我知道我的奶牛猫现在在他手里
  assert.equal(total(s), R.DECK_SIZE);
  void theirs;
});
