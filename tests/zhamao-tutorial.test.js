'use strict';

/* 按牌桌调用钩子的方式把新手教程（一局学会全部）从头走到尾：只做剧本放行的操作，每一步都有讲解，最后必须是我赢 */
const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/zhamao-rules.js');
const T = require('../assets/js/games/zhamao-tutorial.js');

test('tutorial: one game teaches everything and ends with my win', () => {
  const hints = [];
  const ctl = T.create(R, { hint: (h) => { if (h) hints.push(h); }, say() {} });
  const s = ctl.state;
  const said = [...ctl.intro];
  const seen = new Set();
  const after = (ev) => { ev.forEach((e) => seen.add(e.t + (e.type ? ':' + e.type : ''))); const m = ctl.after(ev, s); if (m && m.length) said.push(...m); };
  const moves = ctl.solve.slice();
  let guard = 0;
  while (s.phase !== 'over') {
    assert.ok(++guard < 400, 'tutorial stuck in ' + s.phase);
    if (s.phase === 'react') {
      if (ctl.mustNope(s) && R.canNope(s, 0)) {
        ctl.idle(s);
        assert.equal(moves.shift(), 'nope');
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
      const mk = moves.shift();
      assert.ok(typeof mk === 'function', 'unexpected turn for me in phase ' + s.phase + ' (next move ' + mk + ')');
      const mv = mk(s);
      assert.ok(ctl.allow(mv), 'move not allowed: ' + JSON.stringify(mv));
      if (mv.type === 'play') assert.ok(ctl.allow(Object.assign({}, mv, { preview: true, target: undefined, named: undefined })), 'preview not allowed');
      if (mv.type !== 'draw') assert.equal(ctl.allow({ type: 'draw' }), false, 'draw should be blocked here');
      if (mv.type === 'draw') after(R.draw(s, 0));
      else if (mv.type === 'play') after(R.play(s, 0, mv.cards, mv));
      else if (mv.type === 'steal') after(R.stealPick(s, 0, mv.idx));
      else if (mv.type === 'pick') after(R.pickDiscard(s, 0, mv.card));
      else if (mv.type === 'alter') after(R.alterTop(s, 0, mv.order));
      else throw new Error('move ' + mv.type);
      continue;
    }
    const d = ctl.bot(s, seat);
    assert.ok(d, 'bot has no scripted move in ' + s.phase);
    if (d.type === 'draw') after(R.draw(s, seat));
    else if (d.type === 'play') after(R.play(s, seat, d.cards, d));
    else if (d.type === 'insert') after(R.insertKitten(s, seat, d.pos));
    else throw new Error('bot move ' + d.type);
  }
  assert.equal(s.winner, 0, 'I should win');
  assert.equal(moves.length, 0, 'unused moves');
  said.push(...ctl.finish(true));
  assert.ok(said.length >= 25, 'explanations: ' + said.length);
  // 一局里每样都用到了
  for (const k of ['skip', 'favor', 'attack', 'tattack', 'bottom', 'pair', 'triple', 'five']) assert.ok(seen.has('resolve:' + k), 'not covered: ' + k + ' (' + [...seen].join(' ') + ')');
  for (const t of ['nope', 'future', 'alter', 'altered', 'defuse', 'insert', 'steal', 'take', 'pick', 'out', 'win']) assert.ok(seen.has(t), 'not covered: ' + t);
});
