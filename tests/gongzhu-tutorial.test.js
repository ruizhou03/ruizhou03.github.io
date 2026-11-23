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

/* ───── 进阶教程 · 明牌 ───── */
const A = T.advanced;

test('advanced tutorial: full deck, one exposable card each', () => {
  assert.equal(new Set(A.HANDS.flat()).size, 52);
  A.HANDS.forEach((h) => assert.equal(h.length, 13));
  assert.ok(A.HANDS[0].includes(R.HEART_ACE));
  for (const [s, cs] of A.EXPOSE) for (const c of cs) assert.ok(A.HANDS[s].includes(c));
});

test('advanced tutorial: every line I can play follows the script (exhaustive over the scripted tricks)', () => {
  let lines = 0;
  const has = (t, c) => t.plays.some((p) => p.card === c);
  function walk(r) {
    if (r.trickNo >= A.SCRIPTED) {
      lines++;
      const H = r.history;
      assert.ok(!has(H[0], R.PIG) && H[0].winner === 3, '墩1：下家出不了明猪，上家吃');
      assert.ok(H[1].winner === 2 && !has(H[1], R.HEART_ACE), '墩2：我出不了明 ♥A，对家收红桃');
      assert.ok(!has(H[2], R.DOUBLER) && H[2].winner === 0, '墩3：上家出不了明变压器，我吃');
      assert.ok(has(H[3], R.SHEEP) && H[3].winner === 0, '墩4：对家只剩羊、被迫出，我吃羊');
      assert.ok(has(H[4], R.DOUBLER) && H[4].winner === 0, '墩5：我吃变压器');
      assert.ok(has(H[5], R.PIG) && H[5].winner === 3, '墩6：上家吃明猪');
      assert.equal(R.scoreCaptured(r.captured[0], R.scoreCtx(r)).total, 800);
      return;
    }
    const s = r.turn;
    let moves;
    if (s === 0) {
      const g = A.guide(r);
      moves = g >= 0 ? [g] : R.legalFor(r, 0);
    } else moves = [A.director(r, s)];
    for (const c of moves) {
      assert.ok(R.legalFor(r, s).includes(c), '座位 ' + s + ' 出了不合法的 ' + R.cardLabel(c));
      const d = R.cloneRound(r);
      R.playCard(d, s, c);
      walk(d);
    }
  }
  const r = A.createRound();
  R.expose(r, 0, R.HEART_ACE);
  for (const [s, cs] of A.EXPOSE) for (const c of cs) R.expose(r, s, c);
  walk(r);
  assert.equal(lines, 8);
});

test('advanced tutorial: the coach has something to say at every beat', () => {
  const coach = A.createCoach();
  assert.ok(coach.intro.length && coach.pick && coach.afterExpose.length === 2);
  const r = A.createRound();
  R.expose(r, 0, R.HEART_ACE);
  for (const [s, cs] of A.EXPOSE) for (const c of cs) R.expose(r, s, c);
  const said = [];
  while (r.trickNo < A.SCRIPTED) {
    const s = r.turn;
    let c;
    if (s === 0) {
      const h = coach.hint(r);
      if (r.trickNo !== 2 || !r.trick.length) said.push(!!h || r.trickNo === 2);
      const g = A.guide(r);
      c = g >= 0 ? g : R.legalFor(r, 0)[0];
    } else c = A.director(r, s);
    const done = R.playCard(r, s, c);
    if (done) {
      const talk = coach.afterTrick(done, r);
      assert.ok(talk.before.length > 0, '墩 ' + r.trickNo + ' 牌还在桌上时要讲');
    }
  }
  assert.ok(said.every(Boolean));
});

/* ───── 压短的新手教程（?gztut=a|b 预览） ─────
 * 穷举新手每一步的所有合法牌：都要在 MAX 轮内收尾，四件事都讲到，总句数不超过 12 */
function walkShort(S, onLeaf) {
  let leaves = 0;
  function walk(r, line) {
    if (S.isDone(r)) { leaves++; onLeaf(r, line); return; }
    assert.ok(!R.isRoundOver(r) && r.trickNo < S.MAX, S.id + '：没在 ' + S.MAX + ' 轮内收尾');
    const s = r.turn;
    const moves = s === 0 ? R.legalFor(r, 0) : [S.director(r, s)];
    for (const c of moves) {
      assert.ok(R.legalFor(r, s).includes(c), S.id + '：座位 ' + s + ' 出了不合法的 ' + R.cardLabel(c));
      const d = R.cloneRound(r);
      R.playCard(d, s, c);
      walk(d, line.concat([c]));
    }
  }
  walk(S.createRound(), []);
  return leaves;
}
// 照着一条路线重放，收集讲解（和界面一样：轮到我出牌前 hint；一轮打满 afterTrick；收尾 outro）
function replayShort(S, line) {
  const r = S.createRound(), coach = S.createCoach(), said = coach.intro.map((m) => m.text);
  let k = 0;
  while (!S.isDone(r)) {
    const s = r.turn;
    let c;
    if (s === 0) { const h = coach.hint(r); if (h) said.push(h); }
    c = line[k++];
    const done = R.playCard(r, s, c);
    if (done) { const t = coach.afterTrick(done, r); for (const m of t.before.concat(t.after)) said.push(m.text); }
  }
  for (const m of coach.outro(r)) said.push(m.text);
  return { r, said };
}

for (const id of ['a', 'b']) {
  const S = T.short[id];
  test('short tutorial ' + id + ': full deck', () => {
    assert.equal(new Set(S.HANDS.flat()).size, 52);
    S.HANDS.forEach((h) => assert.equal(h.length, 13));
  });
  test('short tutorial ' + id + ': every beginner line finishes the script (exhaustive)', () => {
    let maxLines = 0, maxChars = 0, sheepMine = 0, sheepLost = 0;
    const leaves = walkShort(S, (r, line) => {
      const { said } = replayShort(S, line);
      const all = said.join('\n');
      maxLines = Math.max(maxLines, said.length);
      maxChars = Math.max(maxChars, ...said.map((x) => x.replace(/\{[^}]+\}/g, '牌').length));
      assert.ok(said.length <= 12, id + '：讲了 ' + said.length + ' 句：\n' + all);
      assert.ok(r.played[R.PIG], id + '：猪没出现');
      assert.ok(!r.captured[0].includes(R.PIG), id + '：猪落到我手里');
      assert.ok(r.history.some((t) => t.plays.some((p) => R.suitOf(p.card) !== R.suitOf(t.plays[0].card))), id + '：没人垫过牌');
      assert.ok(!r.played[R.DOUBLER], id + '：变压器出现了（留给实战讲）');
      for (const word of ['猪', '羊', '垫']) assert.ok(all.includes(word), id + '：没讲「' + word + '」：\n' + all);
      if (r.captured[0].includes(R.SHEEP)) sheepMine++; else sheepLost++;
      if (id === 'a') assert.ok(r.captured[0].includes(R.SHEEP) && r.captured[1].includes(R.PIG), 'a：羊归我、猪归下家');
      if (id === 'b') {
        assert.ok(r.played[R.SHEEP], 'b：羊没出现');
        const mine = r.history[1].plays.find((p) => p.seat === 0).card;
        assert.notEqual(R.suitOf(mine), R.CLUB, 'b：第 2 轮我必须是垫牌');
      }
    });
    assert.ok(leaves > 10, id + '：路线太少 ' + leaves);
    if (id === 'b') assert.ok(sheepMine && sheepLost, 'b：羊要能抢到、也要能错过');
    console.log('  short ' + id + ': ' + leaves + ' 条路线，最多 ' + maxLines + ' 句，最长一句 ' + maxChars + ' 字');
  });
}
