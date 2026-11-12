'use strict';

/* 按牌桌调用钩子的方式把新手教程从头走到尾：只做剧本放行的操作，最后必须是我赢、每一步都有讲解 */
const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/zhamao-rules.js');
const T = require('../assets/js/games/zhamao-tutorial.js');

test('tutorial script plays through to my win', () => {
  const hints = [];
  const ctl = T.create(R, { hint: (h) => { if (h) hints.push(h); }, say() {} });
  const s = ctl.state;
  const said = [];
  const after = (ev) => { const m = ctl.after(ev, s); if (m && m.length) said.push(...m); };
  const myMoves = [
    { type: 'draw' },
    'nope',
    () => ({ type: 'play', cards: [s.hands[0].find((id) => R.KIND_OF[id] === 'future')] }),
    () => ({ type: 'play', cards: [s.hands[0].find((id) => R.KIND_OF[id] === 'skip')] }),
    () => ({ type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'orange'), target: 1 }),
    () => ({ type: 'steal', idx: 0 }),
    () => ({ type: 'play', cards: [s.hands[0].find((id) => R.KIND_OF[id] === 'attack')] }),
  ];
  let guard = 0;
  while (s.phase !== 'over') {
    assert.ok(++guard < 200, 'tutorial stuck');
    if (s.phase === 'react') {
      if (ctl.mustNope(s) && R.canNope(s, 0)) {
        ctl.idle(s);
        const mv = myMoves.shift();
        assert.equal(mv, 'nope');
        assert.ok(ctl.allow({ type: 'nope' }));
        after(R.nope(s, 0));
        continue;
      }
      for (const t of R.awaitingReaction(s)) { assert.equal(ctl.botNope(s, t), false); R.pass(s, t); }
      after(R.closeReaction(s));
      continue;
    }
    const seat = R.whoActs(s)[0];
    if (seat === 0) {
      ctl.idle(s);
      let mv = myMoves.shift();
      if (typeof mv === 'function') mv = mv();
      assert.ok(mv && mv !== 'nope', 'unexpected turn for me in phase ' + s.phase);
      assert.ok(ctl.allow(mv), 'move not allowed: ' + JSON.stringify(mv));
      // 别的操作都要被拦住
      if (mv.type !== 'draw' && mv.type !== 'steal') assert.equal(ctl.allow({ type: 'draw' }), false);
      if (mv.type === 'draw') after(R.draw(s, 0)); else if (mv.type === 'steal') after(R.stealPick(s, 0, mv.idx)); else after(R.play(s, 0, mv.cards, mv));
      continue;
    }
    const d = ctl.bot(s, seat);
    assert.ok(d, 'bot has no scripted move in ' + s.phase);
    if (d.type === 'draw') after(R.draw(s, seat));
    else if (d.type === 'play') after(R.play(s, seat, d.cards, d));
    else if (d.type === 'insert') after(R.insertKitten(s, seat, d.pos));
  }
  assert.equal(s.winner, 0);
  assert.equal(myMoves.length, 0);
  assert.ok(said.length >= 10);
  assert.ok(hints.length >= 6);
  assert.equal(ctl.finish(true).length, 3);
});
