'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/gongzhu-rules.js');
const T = require('../assets/js/games/gongzhu-tutorial.js');

/* 剧本检查：每墩打完立刻核对 */
function trickProblem(done, tn) {
  const cs = done.plays.map((p) => p.card), w = done.winner;
  for (const x of cs) {
    if (R.isHeart(x) && w !== 2) return '红桃落到座位 ' + w;
    if (x === R.PIG && (w === 0 || w === 2)) return '猪落到座位 ' + w;
    if ((x === R.SHEEP || x === R.DOUBLER) && w !== 0) return '羊 / 变压器落到座位 ' + w;
  }
  if (tn === 0 && w !== 3) return '第 1 墩不是上家吃';
  if (tn === 1 && (R.suitOf(cs[0]) !== R.CLUB || cs.some(R.isScoring) || w === 0)) return '第 2 墩不对';
  if (tn === 2 && (R.suitOf(cs[0]) !== R.DIAMOND || w !== 0)) return '第 3 墩不对';
  return '';
}

test('the tutorial deal is a full deck', () => {
  const all = T.HANDS.flat();
  assert.equal(new Set(all).size, 52);
  T.HANDS.forEach((h) => assert.equal(h.length, 13));
});

test('every possible beginner line follows the script (exhaustive)', () => {
  let lines = 0;
  const finals = new Set();
  const minDiscards = { n: 99 };
  function walk(r, disc) {
    if (R.isRoundOver(r)) { lines++; finals.add(R.roundScores(r).join(',')); minDiscards.n = Math.min(minDiscards.n, disc); return; }
    const s = r.turn, lead = R.leadSuitOf(r);
    const moves = s === 0 ? R.legalFor(r, s) : [T.director(r, s)];
    for (const c of moves) {
      assert.ok(R.legalFor(r, s).includes(c));
      const d = R.cloneRound(r), tn = d.trickNo;
      const done = R.playCard(d, s, c);
      if (done) assert.equal(trickProblem(done, tn), '');
      walk(d, disc + (s === 0 && lead >= 0 && R.suitOf(c) !== lead ? 1 : 0));
    }
  }
  walk(T.createRound(), 0);
  assert.ok(lines > 1000);
  assert.deepEqual([...finals], ['200,-100,200,0']);
  assert.ok(minDiscards.n >= 3, '每条路线至少连续垫 3 次');
});

test('coach explains every key event exactly where it happens', () => {
  const rng = R.makeRng(5);
  for (let g = 0; g < 400; g++) {
    const r = T.createRound();
    const coach = T.createCoach();
    const said = [];
    while (!R.isRoundOver(r)) {
      const s = r.turn;
      let c;
      if (s === 0) { const h = coach.hint(r); if (h) said.push(h); const l = R.legalFor(r, 0); c = l[(rng() * l.length) | 0]; }
      else c = T.director(r, s);
      const done = R.playCard(r, s, c);
      if (done) { const t = coach.afterTrick(done, r); for (const m of t.before.concat(t.after)) said.push(m.text); }
    }
    const all = said.join('\n');
    for (const word of ['「羊」', '「吃羊」', '「猪」', '「变压器」', '每张红桃都要扣分', '「垫牌」', '「全红」']) assert.ok(all.includes(word), word + ' 没讲到：\n' + all);
  }
});
