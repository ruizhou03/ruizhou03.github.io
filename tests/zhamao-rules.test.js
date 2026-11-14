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
  // 第一副 76 张（老牌 0..67 + 万能猫 135..138 + 转向 143..146）；6 人及以上再加第二副 75 张（68..134 + 139..142 + 147..150）
  assert.equal(R.BASE_SIZE, 76);
  assert.equal(R.DECK_SIZE, 151);
  assert.deepEqual(R.KIND_OF.slice(135, 143).every((k) => k === R.WILD), true, '万能猫的牌号接在最后，老牌号不变');
  assert.deepEqual(R.KIND_OF.slice(143).every((k) => k === R.REVERSE), true, '转向接在万能猫后面');
  assert.equal(R.KIND_OF.filter((k) => k === R.REVERSE).length, 8);
  assert.equal(R.KIND_OF.filter((k) => k === R.WILD).length, 8);
  const base = (k) => ofKind(k).filter((id) => !R.inSecondDeck(id)).length;
  assert.equal(base(R.SWAP), 3);
  assert.equal(base(R.BOTTOM), 4);
  assert.equal(base(R.ALTER), 3);
  assert.equal(base(R.TATTACK), 3);
  assert.equal(base(R.BOOM), 4);
  assert.equal(base(R.DEFUSE), 6);
  assert.equal(base(R.WILD), 4);
  assert.equal(base(R.REVERSE), 4);
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
      const s = R.createGame(n, seed, { deckSize: 'more' });
      assert.equal(total(s), R.DECK_SIZE);
      assert.equal(R.kittensInDeck(s), n - 1);
      for (const h of s.hands) {
        assert.equal(h.length, 5);
        assert.equal(R.countKind(h, R.DEFUSE), 1);
        assert.equal(R.countKind(h, R.BOOM), 0);
      }
      const defInDeck = s.deck.filter((id) => R.KIND_OF[id] === R.DEFUSE).length;
      assert.equal(defInDeck, 6 - n);   // 默认：剩下的逗猫棒全放回（官方规则）
      // 没放回的炸毛猫 / 逗猫棒收进盒子（不参与这局），弃牌堆一开始是空的
      assert.equal(s.discard.length, 0);
      assert.equal(s.removed.length, (4 - (n - 1)) + 3 + (R.DECK_SIZE - R.BASE_SIZE)); // + 3 张交换（没开交换牌）+ 整个第二副
      assert.ok(s.deck.concat(...s.hands).every((id) => !R.inSecondDeck(id)), '5 人及以下只用第一副');
    }
  }
  assert.equal(R.normalizeRules({ extraDefuse: 'two' }).extraDefuse, 'all');   // 开关拿掉了：一律全放回
  const all = R.createGame(2, 3, { extraDefuse: 'all', deckSize: 'more' });
  assert.equal(all.deck.filter((id) => R.KIND_OF[id] === R.DEFUSE).length, 4);
});

test('setup for 6..9 players (two decks)', () => {
  for (let n = 6; n <= 9; n++) {
    for (let seed = 1; seed <= 20; seed++) {
      const s = R.createGame(n, seed, { deckSize: 'more' });
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
    const off = R.createGame(n, 11, { deckSize: 'more' });
    assert.equal(off.deck.concat(...off.hands).filter((id) => R.KIND_OF[id] === 'swap').length, 0);
    const on = R.createGame(n, 11, { swap: true, deckSize: 'more' });
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

test('deckSize: 标准 / 快局 shrink the pile by player count, cats cut most, booms stay n−1, nothing lost', () => {
  assert.equal(R.normalizeRules({}).deckSize, 'std', '默认标准');
  const count = (s, k) => s.deck.concat(...s.hands).filter((id) => R.KIND_OF[id] === k).length;
  for (let n = 2; n <= 9; n++) {
    const more = R.createGame(n, 5, { deckSize: 'more' }), std = R.createGame(n, 5, { deckSize: 'std' }), quick = R.createGame(n, 5, { deckSize: 'quick' });
    for (const s of [std, quick]) {
      assert.equal(total(s), R.DECK_SIZE);
      assert.equal(count(s, 'boom'), n - 1);
      assert.ok(s.hands.every((h) => h.length === 5 && R.countKind(h, 'defuse') >= 1));
      for (const c of R.CATS) assert.ok(count(s, c) >= 2, n + ' 人 ' + c + ' 至少 2 张');
      assert.ok(count(s, 'nope') >= 2 && count(s, 'skip') >= 2 && count(s, 'attack') >= 2);
    }
    assert.ok(std.deck.length < more.deck.length && quick.deck.length < std.deck.length, n + ' 人：快局 < 标准 < 多');
    // 猫砍得比作废狠
    const ratio = (k) => count(std, k) / count(more, k);
    assert.ok(ratio('orange') <= ratio('nope') + 1e-9);
  }
  assert.equal(R.createGame(4, 7, { deckSize: 'std' }).deck.length, 24);
  assert.equal(R.createGame(8, 7, { deckSize: 'std' }).deck.length, 49);
});

test('swap with swapDefuse: the whole hand moves, defuses included', () => {
  const s = rig([['swap', 'defuse', 'cow'], ['defuse', 'defuse', 'skip', 'tabby'], ['orange']], ['orange', 'calico', 'cow']);
  s.rules = R.normalizeRules({ swap: true, swapDefuse: true });
  assert.equal(s.rules.swapDefuse, true);
  R.play(s, 0, [idOf(s, 0, 'swap')], { target: 1 });
  const sw = closeAll(s).find((e) => e.t === 'swap');
  assert.equal(sw.toB, 2); assert.equal(sw.toA, 4);
  assert.equal(R.countKind(s.hands[0], 'defuse'), 2); assert.equal(R.countKind(s.hands[1], 'defuse'), 1);
  assert.equal(s.hands[0].length, 4); assert.equal(s.hands[1].length, 2);
  assert.equal(total(s), R.DECK_SIZE);
  assert.equal(R.normalizeRules({}).swapDefuse, false, '默认不换逗猫棒');
});

test('万能猫能顶任何一种猫：对子 / 三张 / 五种各一张', () => {
  const id = (k, skip) => R.KIND_OF.findIndex((x, i) => x === k && i >= (skip || 0));
  const w1 = id(R.WILD), w2 = id(R.WILD, w1 + 1), w3 = id(R.WILD, w2 + 1);
  const o1 = id('orange'), o2 = id('orange', o1 + 1), c1 = id('calico'), cw = id('cow'), tb = id('tabby'), sm = id('siamese');
  assert.equal(R.classify([o1, w1]).type, 'pair');
  assert.equal(R.classify([w1, w2]).type, 'pair');
  assert.equal(R.classify([o1, c1]), null, '两种不同的猫不成对');
  assert.equal(R.classify([o1, o2, w1]).type, 'triple');
  assert.equal(R.classify([o1, w1, w2]).type, 'triple');
  assert.equal(R.classify([o1, c1, w1]), null);
  assert.equal(R.classify([id(R.SKIP), w1]), null, '万能猫只顶猫，不顶行动牌');
  assert.equal(R.classify([o1, c1, cw, tb, w1]).type, 'five');
  assert.equal(R.classify([o1, c1, w1, w2, w3]).type, 'five');
  const w4 = id(R.WILD, w3 + 1);
  assert.equal(R.classify([w1, w2, w3, w4, tb]).type, 'five', '4 张万能猫 + 任意 1 只猫也算五种各一张');
  assert.equal(R.classify([o1, c1, cw, w1, w2]).type, 'five', '3 种不同的猫 + 2 张万能猫');
  assert.equal(R.classify([o1, c1, cw, w1, id(R.SKIP)]), null, '万能猫不能顶行动牌，五张里混了行动牌就不行');
  assert.equal(R.classify([id(R.SKIP), w1, w2]), null);
  assert.equal(R.classify([o1, o2, cw, tb, w1]), null, '五张里真猫不能重样');
  assert.equal(R.classify([o1, c1, cw, tb, sm]).type, 'five');
  assert.equal(R.classify([w1]), null, '单张万能猫不能出');
});

test('转向：方向反过来、结束一回合不摸牌；被甩锅时只顶一回合；两个人等于跳过', () => {
  const rev = (s, seat) => { const id = R.KIND_OF.findIndex((k, i) => k === R.REVERSE && s.hands.every((h) => h.indexOf(i) < 0)); const src = [s.deck, s.discard, s.removed].find((a) => a.indexOf(id) >= 0); src.splice(src.indexOf(id), 1); s.hands[seat].push(id); return id; };
  const s = R.createGame(4, 7);
  s.turn = 1; s.turnsLeft = 1; s.phase = 'act';
  const id = rev(s, 1);
  const deck0 = s.deck.length;
  R.play(s, 1, [id]); closeAll(s);
  assert.equal(s.dir, -1);
  assert.equal(s.turn, 0, '反过来以后 1 号的下家是 0 号');
  assert.equal(s.deck.length, deck0, '不摸牌');
  assert.equal(R.nextAlive(s, 0), 3);
  // 再转一次回到原方向；被甩锅（还剩 2 回合）时只顶掉一回合
  s.turnsLeft = 2;
  const id2 = rev(s, 0);
  R.play(s, 0, [id2]); closeAll(s);
  assert.equal(s.dir, 1);
  assert.equal(s.turn, 0); assert.equal(s.turnsLeft, 1);
  // 甩锅按当前方向甩给下家
  const t2 = R.createGame(4, 9); t2.turn = 2; t2.phase = 'act'; t2.dir = -1;
  const a = R.KIND_OF.findIndex((k, i) => k === R.ATTACK && t2.hands.every((h) => h.indexOf(i) < 0) && t2.deck.indexOf(i) >= 0);
  t2.deck.splice(t2.deck.indexOf(a), 1); t2.hands[2].push(a);
  R.play(t2, 2, [a]); closeAll(t2);
  assert.equal(t2.turn, 1);
  // 两个人：等于跳过
  const d2 = R.createGame(2, 3); d2.turn = 0; d2.phase = 'act';
  const r2 = rev(d2, 0); R.play(d2, 0, [r2]); closeAll(d2);
  assert.equal(d2.turn, 1);
});

test('insertSeen (default on): public coarse height, random hides it, bots see top/bottom only, invalidated by draws / alter / shuffle', () => {
  const AI = require('../assets/js/games/zhamao-ai.js');
  assert.equal(R.DEFAULT_RULES.insertSeen, true);
  assert.equal(R.normalizeRules({}).insertSeen, true);
  assert.equal(R.normalizeRules({ insertSeen: false }).insertSeen, false);
  // 造一个「刚拆完炸毛猫、该塞回去」的局面
  function atDefuse(rules) {
    const s = R.createGame(3, 11, rules);
    const me = s.turn;
    const boom = s.deck.find((id) => R.KIND_OF[id] === R.BOOM);
    s.deck.splice(s.deck.indexOf(boom), 1); s.deck.unshift(boom);
    if (!s.hands[me].some((id) => R.KIND_OF[id] === R.DEFUSE)) {
      const def = ofKind(R.DEFUSE).find((id) => s.deck.includes(id));
      s.deck.splice(s.deck.indexOf(def), 1); s.hands[me].push(def);
    }
    R.draw(s, me);
    assert.equal(s.phase, 'defuse');
    return { s, me, boom };
  }
  const visOf = (ev) => ev.find((e) => e.t === 'insert').vis;
  // 最上 / 最底照实；中间取到 1/8，且不会被取成 0 或 1
  let t = atDefuse(); assert.equal(visOf(R.insertKitten(t.s, t.me, 0)), 0);
  t = atDefuse(); const size = t.s.deck.length; assert.equal(visOf(R.insertKitten(t.s, t.me, size)), 1);
  t = atDefuse(); const v1 = visOf(R.insertKitten(t.s, t.me, 1)); assert.ok(v1 > 0 && v1 < 1 && Math.abs(v1 * 8 - Math.round(v1 * 8)) < 1e-9);
  t = atDefuse(); const vm = visOf(R.insertKitten(t.s, t.me, Math.floor(size / 2))); assert.ok(vm > 0 && vm < 1);
  // 随机 / 规则关：vis 为空，别人什么也看不出
  t = atDefuse(); assert.equal(visOf(R.insertKitten(t.s, t.me, 0, true)), null); assert.equal(t.s.ins.seen, null);
  t = atDefuse({ insertSeen: false }); assert.equal(visOf(R.insertKitten(t.s, t.me, 0)), null);
  // 去敏：别人拿到 vis，拿不到 pos / card
  t = atDefuse(); const other = (t.me + 1) % 3;
  const red = R.redactEvents(R.insertKitten(t.s, t.me, 0), other).find((e) => e.t === 'insert');
  assert.equal(red.vis, 0); assert.equal(red.pos, undefined); assert.equal(red.card, undefined);
  // 机器猫：别人放在最上 → 它知道顶上是炸毛猫，不会去摸（有别的办法时）；真人的记忆（牌堆发红光用的）不变
  assert.equal(t.s.ins.seen, 'top');
  assert.ok(!t.s.memo[other].deck.includes(t.boom));
  const vTop = R.view(t.s, other);
  assert.ok(!vTop.known.some((k) => k.id === t.boom));
  // 从顶上摸走一张以后就不准了：模拟 top 计数
  t.s.ins.top = 1;
  const d1 = AI.decide(t.s, t.s.turn, 'normal', () => 0.5); assert.ok(d1);
  // 改命动过顶上 → seen 清掉
  t = atDefuse(); R.insertKitten(t.s, t.me, 0); assert.equal(t.s.ins.seen, 'top');
  t.s.phase = 'alter'; t.s.alter = { by: (t.me + 1) % 3, cards: t.s.deck.slice(0, 3) };
  R.alterTop(t.s, t.s.alter.by, t.s.alter.cards.slice().reverse());
  assert.equal(t.s.ins.seen, null);
  assert.equal(total(t.s), R.DECK_SIZE);
});

test('insertSeen: a bot that saw the kitten go on top avoids drawing it when it can', () => {
  const AI = require('../assets/js/games/zhamao-ai.js');
  let avoided = 0, tried = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = R.createGame(3, seed);
    const me = s.turn, nxt = R.nextAlive(s, me);
    const boom = s.deck.find((id) => R.KIND_OF[id] === R.BOOM);
    s.deck.splice(s.deck.indexOf(boom), 1); s.deck.unshift(boom);
    if (!s.hands[me].some((id) => R.KIND_OF[id] === R.DEFUSE)) { const def = ofKind(R.DEFUSE).find((id) => s.deck.includes(id)); s.deck.splice(s.deck.indexOf(def), 1); s.hands[me].push(def); }
    R.draw(s, me);
    R.insertKitten(s, me, 0);
    if (s.turn !== nxt || s.phase !== 'act') continue;
    // 给下家一张跳过，让它有得躲
    const skip = ofKind(R.SKIP).find((id) => s.deck.includes(id));
    if (skip == null) continue;
    s.deck.splice(s.deck.indexOf(skip), 1); s.hands[nxt].push(skip);
    tried++;
    const d = AI.decide(s, nxt, 'normal', () => 0.5);
    if (d.type !== 'draw') avoided++;
  }
  assert.ok(tried >= 10, 'enough cases');
  assert.ok(avoided / tried > 0.8, 'bot avoids a visibly-topped kitten: ' + avoided + '/' + tried);
});
