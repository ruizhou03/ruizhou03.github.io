'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const R = require('../assets/js/games/gongzhu-rules.js');
const S = require('../assets/js/games/gongzhu-stats.js');

const HEARTS = Array.from({ length: 13 }, (_, i) => 13 + i);
const NONE = [[], [], [], []];
const ctx = (rules) => ({ rules: R.normalizeRules(rules), exposed: [], swap: false });

function round(no, mineCaptured, scores) {
  const captured = [mineCaptured || [], [], [], []];
  return { roundNo: no, captured, scores: scores || [0, 0, 0, 0], ctx: ctx() };
}
function snap(id, no, opts) {
  opts = opts || {};
  return Object.assign({
    mode: 'solo', id, rules: {}, totals: [0, 0, 0, 0], last: round(no, opts.mine, opts.scores), over: false, losers: null,
    tiers: ['normal', 'normal', 'normal'], auto: false,
  }, opts);
}

test('一局一局记进 live，盘终落成一条；同一局重复调用不重复计', () => {
  const s = S.empty();
  S.note(s, snap('s:1', 1, { mine: [R.PIG], auto: true }), 1000);
  S.note(s, snap('s:1', 1, { mine: [R.PIG] }), 1001);   // 联机快照重放同一局
  assert.equal(Object.keys(s.live.solo.r).length, 1);
  S.note(s, snap('s:1', 2, { mine: HEARTS }), 1002);
  S.note(s, snap('s:1', 3, { mine: HEARTS.concat([R.PIG, R.SHEEP, R.DOUBLER]), totals: [-200, 300, -1000, 100], over: true }), 1003);
  assert.equal(s.games.length, 1);
  assert.equal(s.live.solo, null);
  const g = s.games[0];
  assert.deepEqual([g.n, g.seen, g.ah, g.gs, g.eatPig, g.sheep, g.dbl, g.auto], [3, 3, 2, 1, 2, 1, 1, 1]);
  assert.equal(g.rank, 3);
  assert.equal(g.pig, false);
  assert.equal(g.m, 's');
  assert.deepEqual(g.tiers, ['normal', 'normal', 'normal']);
  assert.equal(g.rules.end, 'lose1000');
  // 落成后再来同一盘的快照：不再记
  S.note(s, snap('s:1', 3, { totals: [-200, 300, -1000, 100], over: true }), 1004);
  assert.equal(s.games.length, 1);
});

test('名次：同分同名次（1、1、3、4），并列最低都当猪', () => {
  const s = S.empty();
  S.note(s, snap('s:a', 1, { totals: [100, 100, -50, -1000], over: true }));
  S.note(s, snap('s:b', 1, { totals: [-50, 100, 100, -1000], over: true }));
  S.note(s, snap('s:c', 1, { totals: [-1000, -1000, 0, 200], over: true }));
  assert.deepEqual(s.games.map((g) => [g.rank, g.pig]), [[1, false], [3, false], [3, true]]);
});

test('联机以服务器 losers 为准；叫停不评猪、不计名次统计', () => {
  const s = S.empty();
  S.note(s, snap('n:R1:1', 4, { mode: 'net', tiers: null, totals: [-1000, 0, 0, 10], losers: [], over: true }));
  assert.equal(s.games[0].pig, false);
  assert.equal(s.games[0].m, 'n');
  assert.equal(s.games[0].tiers, null);
  S.note(s, snap('n:R1:2', 2, { mode: 'net', tiers: null, rules: { end: 'none' }, totals: [-300, 0, 0, 10], losers: [3], over: true }));
  const g = s.games[1];
  assert.equal(g.stop, true);
  assert.equal(g.pig, false);
  const sum = S.summarize(s);
  assert.equal(sum.games, 2);
  assert.equal(sum.ranked, 1);
  assert.equal(sum.stops, 1);
  assert.deepEqual(sum.dist, [0, 0, 0, 1]);
});

test('中途放弃：换了新一盘或对账时存档对不上 → 放弃次数加一，不落成一条', () => {
  const s = S.empty();
  S.note(s, snap('s:1', 1));
  S.note(s, snap('s:2', 1));   // 重开一盘
  assert.equal(s.abandoned, 1);
  assert.equal(s.games.length, 0);
  S.reconcile(s, 's:2', 5);
  assert.equal(s.abandoned, 1);   // 还是这一盘：不动
  S.reconcile(s, 's:3', 5);
  assert.equal(s.abandoned, 2);
  assert.equal(s.live.solo, null);
  // 联机：太久没动算放弃
  S.note(s, snap('n:X:1', 1, { mode: 'net' }), 1000);
  S.reconcile(s, null, 1000 + 13 * 3600e3);
  assert.equal(s.abandoned, 3);
  // 一局都没打完的新开一盘被换掉：不算放弃
  S.note(s, Object.assign(snap('s:9', 1), { last: null }));
  S.note(s, snap('s:10', 1));
  assert.equal(s.abandoned, 3);
});

test('进房时这一盘已结束（一局都没看着打）：不记', () => {
  const s = S.empty();
  S.note(s, Object.assign(snap('n:Y:1', 5, { mode: 'net', over: true }), { last: { roundNo: 5, captured: null, scores: [0, 0, 0, 0] } }));
  assert.equal(s.games.length, 0);
});

test('汇总：名次分布、各档位、当猪率、平均局数、连续不当猪、徽章', () => {
  const s = S.empty();
  const tot = { 1: [300, 0, -100, -1000], 2: [0, 300, -100, -1000], 4: [-1000, 0, -100, 300] };
  const seq = [[1, 'hard'], [2, 'normal'], [4, 'easy'], [1, 'hard'], [2, 'hard'], [2, 'hard'], [1, 'hard'], [2, 'normal'], [4, 'normal']];
  seq.forEach(([rk, tier], i) => {
    for (let r = 1; r <= 4; r++) S.note(s, snap('s:' + i, r, { mine: r === 2 && i === 0 ? HEARTS : [] }), i * 10 + r);
    S.note(s, snap('s:' + i, 4, { totals: tot[rk], tiers: [tier, tier, tier], over: true }), i * 10 + 5);
  });
  const m = S.summarize(s);
  assert.equal(m.games, 9);
  assert.equal(m.rounds, 36);
  assert.equal(m.avgRounds, 4);
  assert.deepEqual(m.dist, [3, 4, 0, 2]);
  assert.equal(m.pigs, 2);
  assert.ok(Math.abs(m.pigRate - 2 / 9) < 1e-9);
  assert.equal(m.streakBest, 5);   // 第 4～8 盘
  assert.equal(m.streakCur, 0);
  const hard = m.tiers.find((t) => t.key === 'hard');
  assert.equal(hard.n, 5);
  assert.ok(Math.abs(hard.avgRank - 7 / 5) < 1e-9);
  assert.equal(hard.pigRate, 0);
  assert.deepEqual(m.tiers.map((t) => t.key), ['easy', 'normal', 'hard']);
  const got = Object.fromEntries(m.badges.map((b) => [b.id, b.got]));
  assert.ok(got.first && got.top && got.ah && got.five && got.clean && got.hard);
  assert.equal(got.gs, 0);
  assert.equal(got.ten, 0);
  assert.equal(got.ah, 5);   // 第一盘落成那一刻
  assert.equal(m.recent.length, 9);
});

test('混档与联机分开统计', () => {
  const s = S.empty();
  S.note(s, snap('s:m', 1, { tiers: ['hard', 'easy', 'easy'], totals: [5, 0, 0, -1000], over: true }));
  S.note(s, snap('n:z:1', 1, { mode: 'net', tiers: null, totals: [5, 0, 0, -1000], losers: [3], over: true }));
  assert.deepEqual(S.summarize(s).tiers.map((t) => t.key), ['mix', 'net']);
});

test('超过上限的老盘折叠进 fold，汇总数字不变', () => {
  const a = S.empty(), many = 520;
  for (let i = 0; i < many; i++) {
    const t = i % 4 === 3 ? [-1000, 0, 0, 5] : i % 4 === 0 ? [10, 0, 0, -1000] : [0, 10, 0, -1000];
    S.note(a, snap('s:' + i, 1, { mine: i === 3 ? HEARTS : [], totals: t, over: true }), i + 1);
  }
  assert.equal(a.games.length, S.CAP);
  assert.ok(a.fold);
  assert.equal(a.fold.games, many - S.CAP);
  const m = S.summarize(a);
  assert.equal(m.games, many);
  assert.equal(m.pigs, many / 4);
  assert.equal(m.dist[0], many / 4);
  assert.equal(m.streakBest, 3);
  assert.equal(m.badges.find((b) => b.id === 'ah').got, 4);   // 折叠前就拿到的徽章还在
  assert.equal(m.badges.find((b) => b.id === 'ten').got, 10);
  assert.ok(Math.abs(m.avgRank - (130 * 1 + 260 * 2 + 130 * 4) / 520) < 1e-9);
});

test('坏数据 / 旧版本读进来回落成空表；演示数据能汇总', () => {
  assert.deepEqual(S.normalize({ v: 0 }).games, []);
  assert.deepEqual(S.normalize(null).games, []);
  const m = S.summarize(S.demoStore(40));
  assert.equal(m.games, 40);
  assert.equal(m.stops, 1);
  assert.equal(m.recent.length, 10);
  assert.ok(m.badges.some((b) => b.got) && m.badges.some((b) => !b.got));
  assert.equal(S.summarize(S.empty()).avgRank, null);
});
