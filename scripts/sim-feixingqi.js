#!/usr/bin/env node
'use strict';

/*
 * 飞行棋 self-play 模拟 + AI 权重调参（对标 sim-guandan.js）
 *
 * 用法：
 *   node scripts/sim-feixingqi.js sanity              # baseline 自对弈：每色 ~25%、pairwise ~50%
 *   node scripts/sim-feixingqi.js tune [N]            # coordinate descent 调参（N=每 trial 的对局数）
 *   node scripts/sim-feixingqi.js es-tune [gen] [pop] [matches] [start.json]
 *   node scripts/sim-feixingqi.js pop-gen [K] [gen] [pop] [matches] [startSigma]
 *   node scripts/sim-feixingqi.js tournament [matchesPerPair]
 *   node scripts/sim-feixingqi.js compare <test.json> [N] [baseline.json]
 *
 * 与掼蛋的区别：飞行棋是多人混战（4 色），没有队伍。pairwise 评估时
 * 把 4 个座位排成 2 个 A-座 + 2 个 B-座（[A,B,A,B] / [B,A,B,A] 交替消除先手优势），
 * 首个全到家的颜色属于哪一方就算哪一方赢，从而复用现成的 ES / Elo 机器。
 *
 * 难度模型完全对齐掼蛋：三档 = 三套权重向量，全部用同一个贪心 argmax 策略，
 * 不再有 easy/normal/hard 的代码分支（旧 index.html 里 easy=纯随机、hard 才算 risk）。
 */

// ===========================================================
// 引擎（纯逻辑，从 toolbox/feixingqi/index.html 抄过来）
//   只保留走子相关字段：type / color / plane / stretchEntry，
//   丢弃所有 cx/cy/poly 几何（渲染才用得到）。
// ===========================================================
const TRACK_LEN = 56;
const SEGMENT_LEN = 14;
const STRETCH_LEN = 5;
const SMALL_JUMP_DISTANCE = 4;
const COLORS = ['red', 'yellow', 'blue', 'green'];
const TURN_ORDER = ['red', 'yellow', 'blue', 'green'];
const COLOR_CYCLE = ['green', 'red', 'yellow', 'blue'];

function shiftCycle(color, shift) {
  if (color === 'white') return 'white';
  const i = COLOR_CYCLE.indexOf(color);
  if (i < 0) return color;
  return COLOR_CYCLE[((i + shift) % 4 + 4) % 4];
}

// 红段模板 k=0..13（只留逻辑字段）。
const RED_SEG_TEMPLATE = [
  { type: 'takeoff', color: 'white', plane: 'red' },
  { type: 'tri', color: 'green' },
  { type: 'rect', color: 'red' },
  { type: 'rect', color: 'yellow' },
  { type: 'tri-concave', color: 'blue', plane: 'blue' },
  { type: 'tri-concave', color: 'green', plane: 'green' },
  { type: 'rect', color: 'red' },
  { type: 'rect', color: 'yellow' },
  { type: 'tri-convex', color: 'blue' },
  { type: 'rect', color: 'green' },
  { type: 'rect', color: 'red' },
  { type: 'rect', color: 'yellow', stretchEntry: 'yellow' },
  { type: 'rect', color: 'blue' },
  { type: 'rect', color: 'green' },
];

function buildTrack() {
  const out = [];
  for (let segIdx = 0; segIdx < 4; segIdx++) {
    for (let k = 0; k < SEGMENT_LEN; k++) {
      const t = RED_SEG_TEMPLATE[k];
      out.push({
        type: t.type,
        color: shiftCycle(t.color, segIdx),
        plane: t.plane ? shiftCycle(t.plane, segIdx) : null,
        stretchEntry: t.stretchEntry ? shiftCycle(t.stretchEntry, segIdx) : null,
        segIdx, k,
      });
    }
  }
  return out;
}

function buildLayout() {
  const L = {
    TRACK_LEN, SEGMENT_LEN, STRETCH_LEN, SMALL_JUMP_DISTANCE,
    TRACK: buildTrack(),
    EXIT_INDEX: { red: 0, yellow: 14, blue: 28, green: 42 },
    STRETCH_TRANSITION: { yellow: 11, blue: 25, green: 39, red: 53 },
    FLIGHT_CROSSES: {
      blue:   { color: 'red',    stretchPos: 2 },
      red:    { color: 'blue',   stretchPos: 2 },
      green:  { color: 'yellow', stretchPos: 2 },
      yellow: { color: 'green',  stretchPos: 2 },
    },
  };
  // 大跳端点：自身飞机 glyph 落在 tri-concave 角的两个 idx
  const byColor = {};
  for (const c of COLORS) byColor[c] = [];
  L.TRACK.forEach((cell, idx) => {
    if (cell.plane && cell.type === 'tri-concave') byColor[cell.plane].push(idx);
  });
  L.BIG_JUMP_START = {};
  L.BIG_JUMP_END = {};
  for (const c of COLORS) {
    const eps = byColor[c] || [];
    if (eps.length < 2) continue;
    const exit = L.EXIT_INDEX[c];
    const dist = e => (e - exit + TRACK_LEN) % TRACK_LEN;
    const [a, b] = eps;
    const [startIdx, endIdx] = dist(a) < dist(b) ? [a, b] : [b, a];
    L.BIG_JUMP_START[c] = startIdx;
    L.BIG_JUMP_END[c] = endIdx;
  }
  return L;
}

const L = buildLayout();

// --- 走子原语（game = { players, pieces }；pieces[color] = [{status,pos}×4]） ---
function advanceOneOnLoop(player, idx) {
  let cur = (idx + 1) % TRACK_LEN;
  while (L.TRACK[cur].type === 'takeoff' && L.TRACK[cur].plane !== player) {
    cur = (cur + 1) % TRACK_LEN;
  }
  return cur;
}

function advanceInStretch(fromStretchIdx, steps) {
  const len = L.STRETCH_LEN;
  let target = fromStretchIdx + steps;
  if (target === len) return { kind: 'goal' };
  if (target > len) target = 2 * len - target;
  if (target < 0) target = 0;
  return { kind: 'stretch', pos: target };
}

function advanceOnTrack(player, fromTrackIdx, steps) {
  const transition = L.STRETCH_TRANSITION[player];
  let cur = fromTrackIdx;
  for (let i = 0; i < steps; i++) {
    if (cur === transition) return advanceInStretch(-1, steps - i);
    cur = advanceOneOnLoop(player, cur);
  }
  return { kind: 'track', pos: cur };
}

function resolveJumps(player, idx) {
  const cell = L.TRACK[idx];
  const triggered = { bigJumped: false, smallJumped: false };
  const startIdx = L.BIG_JUMP_START[player];
  if (idx === startIdx && cell.type === 'tri-concave' && cell.plane === player) {
    const endIdx = L.BIG_JUMP_END[player];
    if (endIdx !== undefined && endIdx !== idx) {
      idx = endIdx;
      triggered.bigJumped = true;
    }
  } else if (cell.color === player && idx !== L.STRETCH_TRANSITION[player]) {
    for (let k = 0; k < SMALL_JUMP_DISTANCE; k++) idx = advanceOneOnLoop(player, idx);
    triggered.smallJumped = true;
  }
  return { idx, triggered };
}

function previewMove(game, player, pieceIdx, dice) {
  const piece = game.pieces[player][pieceIdx];
  if (piece.status === 'hangar') {
    if (dice !== 6) return { ok: false };
    return {
      ok: true, toStatus: 'track', toPos: L.EXIT_INDEX[player],
      cellsAdvanced: 0, triggered: { bigJumped: false, smallJumped: false },
    };
  }
  if (piece.status === 'track') {
    const r = advanceOnTrack(player, piece.pos, dice);
    if (r.kind === 'track') {
      const { idx, triggered } = resolveJumps(player, r.pos);
      const extra = (idx - r.pos + TRACK_LEN) % TRACK_LEN;
      return { ok: true, toStatus: 'track', toPos: idx, dicePos: r.pos, cellsAdvanced: dice + extra, triggered };
    } else if (r.kind === 'stretch') {
      return { ok: true, toStatus: 'stretch', toPos: r.pos, cellsAdvanced: dice, triggered: { bigJumped: false, smallJumped: false } };
    }
    return { ok: true, toStatus: 'goal', toPos: 0, cellsAdvanced: dice, triggered: { bigJumped: false, smallJumped: false } };
  }
  if (piece.status === 'stretch') {
    const r = advanceInStretch(piece.pos, dice);
    if (r.kind === 'stretch') {
      return { ok: true, toStatus: 'stretch', toPos: r.pos, cellsAdvanced: r.pos - piece.pos, triggered: { bigJumped: false, smallJumped: false } };
    }
    return { ok: true, toStatus: 'goal', toPos: 0, cellsAdvanced: L.STRETCH_LEN - piece.pos, triggered: { bigJumped: false, smallJumped: false } };
  }
  return { ok: false };
}

function opponentsOnCell(game, player, trackIdx) {
  const out = [];
  for (const c of game.players) {
    if (c === player) continue;
    for (let i = 0; i < 4; i++) {
      const p = game.pieces[c][i];
      if (p.status === 'track' && p.pos === trackIdx) out.push({ color: c, idx: i });
    }
  }
  return out;
}

function legalPiecesFor(game, player, dice) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const piece = game.pieces[player][i];
    if (piece.status === 'goal') continue;
    if (piece.status === 'hangar' && dice !== 6) continue;
    out.push(i);
  }
  return out;
}

function applyMove(game, player, pieceIdx, dice) {
  const piece = game.pieces[player][pieceIdx];
  const preview = previewMove(game, player, pieceIdx, dice);
  if (!preview.ok) return null;
  let captures = [];
  if (piece.status === 'hangar') {
    piece.status = 'track';
    piece.pos = L.EXIT_INDEX[player];
    captures = opponentsOnCell(game, player, piece.pos);
  } else if (preview.toStatus === 'track') {
    piece.status = 'track';
    piece.pos = preview.toPos;
    const seen = new Set();
    const addCaps = caps => { for (const c of caps) {
      const key = c.color + ':' + c.idx;
      if (!seen.has(key)) { seen.add(key); captures.push(c); }
    } };
    if (preview.dicePos !== undefined && preview.dicePos !== preview.toPos) {
      addCaps(opponentsOnCell(game, player, preview.dicePos));
    }
    addCaps(opponentsOnCell(game, player, preview.toPos));
    if (preview.triggered && preview.triggered.bigJumped) {
      const cross = L.FLIGHT_CROSSES[player];
      if (cross && game.pieces[cross.color]) {
        for (let i = 0; i < 4; i++) {
          const op = game.pieces[cross.color][i];
          if (op.status === 'stretch' && op.pos === cross.stretchPos) addCaps([{ color: cross.color, idx: i }]);
        }
      }
    }
  } else if (preview.toStatus === 'stretch') {
    piece.status = 'stretch';
    piece.pos = preview.toPos;
  } else if (preview.toStatus === 'goal') {
    piece.status = 'goal';
    piece.pos = 0;
  }
  for (const cap of captures) {
    game.pieces[cap.color][cap.idx].status = 'hangar';
    game.pieces[cap.color][cap.idx].pos = cap.idx;
  }
  return { captures, triggered: preview.triggered };
}

// ===========================================================
// AI 策略：参数化的 scoreOption（三档共用，难度=权重）
// ===========================================================
function distToStretchTransition(player, trackIdx) {
  const t = L.STRETCH_TRANSITION[player];
  return (t - trackIdx + TRACK_LEN) % TRACK_LEN;
}

function computeCaptureRisk(game, player, trackIdx, W) {
  let risk = 0;
  for (const c of game.players) {
    if (c === player) continue;
    for (const p of game.pieces[c]) {
      if (p.status !== 'track') continue;
      const dist = (trackIdx - p.pos + TRACK_LEN) % TRACK_LEN;
      if (dist > 0 && dist <= W.riskWindow) risk += 1;
    }
    const oppExit = L.EXIT_INDEX[c];
    const distExit = (trackIdx - oppExit + TRACK_LEN) % TRACK_LEN;
    const inHangar = game.pieces[c].filter(p => p.status === 'hangar').length;
    if (inHangar > 0 && distExit === 0) risk += W.riskHangar;
  }
  return risk;
}

function scoreOption(game, player, pieceIdx, dice, W) {
  const piece = game.pieces[player][pieceIdx];
  const preview = previewMove(game, player, pieceIdx, dice);
  if (!preview.ok) return -1e9;
  let s = 0;

  if (preview.toStatus === 'goal') s += W.goal;

  if (preview.toStatus === 'track') {
    const captured = opponentsOnCell(game, player, preview.toPos);
    s += captured.length * W.capturePerOpp;
  }

  if (piece.status === 'hangar' && preview.toStatus === 'track') {
    const inHangar = game.pieces[player].filter(p => p.status === 'hangar').length;
    s += W.exitBase + inHangar * W.exitPerHangar;
  }

  if (preview.triggered && preview.triggered.bigJumped) s += W.bigJump;
  if (preview.triggered && preview.triggered.smallJumped) s += W.smallJump;

  s += (preview.cellsAdvanced || 0) * W.advanceMult;

  if (preview.toStatus === 'stretch') {
    if (piece.status === 'stretch') {
      const advance = preview.toPos - piece.pos;
      if (advance > 0) s += W.stretchAdvanceBase + preview.toPos * W.stretchAdvancePerPos;
      else if (advance === 0) s -= W.stretchBouncePenalty;
      else s -= W.stretchBackBase + Math.abs(advance) * W.stretchBackPerPos;
    } else {
      s += W.stretchEnterBase + preview.toPos * W.stretchEnterPerPos;
    }
  }

  if (preview.toStatus === 'track') {
    const risk = computeCaptureRisk(game, player, preview.toPos, W);
    s -= risk * W.riskMult;
    const dist = distToStretchTransition(player, preview.toPos);
    s += Math.max(0, W.proximityCap - dist) * W.proximityMult;
  }

  return s;
}

// 贪心 argmax（W.__random 纯随机；W.epsilon 概率走随机手 = 难度旋钮）
function pickAiPiece(game, player, dice, legal, W, rng) {
  const rnd = rng || Math.random;
  if (W && W.__random) return legal[Math.floor(rnd() * legal.length)];
  if (W && W.epsilon && rnd() < W.epsilon) return legal[Math.floor(rnd() * legal.length)];
  let bestIdx = legal[0];
  let bestScore = -Infinity;
  for (const idx of legal) {
    const sc = scoreOption(game, player, idx, dice, W);
    if (sc > bestScore) { bestScore = sc; bestIdx = idx; }
  }
  return bestIdx;
}

// ===========================================================
// 当前 index.html 用的那组硬编码常数 = baseline 权重
// ===========================================================
const DEFAULT_W = {
  goal: 1000,
  capturePerOpp: 600,
  exitBase: 60,
  exitPerHangar: 8,
  bigJump: 180,
  smallJump: 60,
  advanceMult: 2,
  stretchAdvanceBase: 30,
  stretchAdvancePerPos: 8,
  stretchBouncePenalty: 80,
  stretchBackBase: 100,
  stretchBackPerPos: 12,
  stretchEnterBase: 60,
  stretchEnterPerPos: 6,
  riskMult: 75,
  riskWindow: 6,     // 整数阈值，不参与 ES 扰动
  riskHangar: 0.5,
  proximityCap: 30,
  proximityMult: 1.5,
};

// ===========================================================
// 单局 4 人对战
// ===========================================================
function roll(rng) { return 1 + Math.floor(rng() * 6); }

function freshGame(players) {
  const pieces = {};
  for (const c of players) {
    pieces[c] = [];
    for (let i = 0; i < 4; i++) pieces[c].push({ status: 'hangar', pos: i });
  }
  return { players, pieces, finalRanking: [], turnIdx: 0, over: false };
}

function progressScore(game, color) {
  // 用于超时兜底排名：到家>冲刺>跑道里程
  let s = 0;
  for (const p of game.pieces[color]) {
    if (p.status === 'goal') s += 1000;
    else if (p.status === 'stretch') s += 300 + p.pos * 20;
    else if (p.status === 'track') s += (TRACK_LEN - distToStretchTransition(color, p.pos));
  }
  return s;
}

function takeTurn(game, player, W, rng) {
  let consecutiveSixes = 0;
  let lastMovedIdx = null;
  while (true) {
    const dice = roll(rng);
    if (dice === 6) consecutiveSixes++; else consecutiveSixes = 0;
    if (consecutiveSixes >= 3) {
      if (lastMovedIdx != null) {
        const p = game.pieces[player][lastMovedIdx];
        if (p.status !== 'goal') { p.status = 'hangar'; p.pos = lastMovedIdx; }
      }
      return;
    }
    const legal = legalPiecesFor(game, player, dice);
    if (legal.length === 0) return;
    const idx = pickAiPiece(game, player, dice, legal, W, rng);
    applyMove(game, player, idx, dice);
    lastMovedIdx = idx;
    const allInGoal = game.pieces[player].every(p => p.status === 'goal');
    if (allInGoal && !game.finalRanking.includes(player)) {
      game.finalRanking.push(player);
      const remaining = game.players.filter(c => !game.finalRanking.includes(c));
      if (remaining.length <= 1) {
        for (const c of remaining) game.finalRanking.push(c);
        game.over = true;
        return;
      }
    }
    if (dice === 6 && !allInGoal) continue;
    return;
  }
}

function nextTurn(game) {
  game.turnIdx = (game.turnIdx + 1) % game.players.length;
  let safety = 0;
  while (safety++ < 4 && game.pieces[game.players[game.turnIdx]].every(p => p.status === 'goal')) {
    game.turnIdx = (game.turnIdx + 1) % game.players.length;
  }
}

// weightsBySeat: color -> W。返回 finalRanking（名次顺序的颜色数组）
function playGame(weightsBySeat, rng, maxTurns = 4000) {
  const players = TURN_ORDER.slice();
  const game = freshGame(players);
  let turns = 0;
  while (!game.over && turns < maxTurns) {
    const player = game.players[game.turnIdx];
    if (game.pieces[player].every(p => p.status === 'goal')) { nextTurn(game); turns++; continue; }
    takeTurn(game, player, weightsBySeat[player], rng);
    turns++;
    if (game.over) break;
    nextTurn(game);
  }
  if (!game.over) {
    // 超时兜底：未排名的按 progress 降序补进 finalRanking
    const rest = players.filter(c => !game.finalRanking.includes(c));
    rest.sort((a, b) => progressScore(game, b) - progressScore(game, a));
    game.finalRanking.push(...rest);
  }
  return game.finalRanking;
}

// ===========================================================
// pairwise：4 座位 = 2 A + 2 B，[A,B,A,B]/[B,A,B,A] 交替消除先手
// ===========================================================
function runMatches(weightsA, weightsB, n, rng = Math.random) {
  let aWins = 0, bWins = 0;
  for (let i = 0; i < n; i++) {
    const aFirst = (i % 2 === 0);
    const seatW = {}, seatSide = {};
    TURN_ORDER.forEach((c, pos) => {
      const isA = aFirst ? (pos % 2 === 0) : (pos % 2 === 1);
      seatW[c] = isA ? weightsA : weightsB;
      seatSide[c] = isA ? 'A' : 'B';
    });
    const ranking = playGame(seatW, rng);
    if (seatSide[ranking[0]] === 'A') aWins++; else bWins++;
  }
  return { testWins: aWins, baselineWins: bWins, n };
}

// ===========================================================
// 调参框架（ES / pop-gen / tournament）— 移植自 sim-guandan.js
// ===========================================================
const TUNE_KEYS = Object.keys(DEFAULT_W).filter(k => k !== 'riskWindow');
const COORD_KEYS = [
  'capturePerOpp', 'exitBase', 'advanceMult', 'riskMult',
  'proximityMult', 'stretchEnterBase', 'smallJump', 'bigJump',
];
const DELTAS = [-0.35, -0.15, 0, 0.15, 0.35];

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function tune({ matchesPerTrial = 80, iterations = 2 }) {
  let current = { ...DEFAULT_W };
  console.log('== baseline weights ==');
  for (let it = 0; it < iterations; it++) {
    console.log('\n=== iteration ' + (it + 1) + ' ===');
    for (const key of COORD_KEYS) {
      const base = current[key];
      let bestVal = base, bestRate = -1;
      const results = [];
      for (const delta of DELTAS) {
        const tryVal = (delta === 0) ? base : base * (1 + delta);
        const tryW = { ...current, [key]: tryVal };
        const { testWins, baselineWins } = runMatches(tryW, current, matchesPerTrial);
        const rate = testWins / (testWins + baselineWins);
        results.push({ delta, rate });
        if (rate > bestRate) { bestRate = rate; bestVal = tryVal; }
      }
      console.log(key.padEnd(22) + ' base=' + base.toFixed(2) + '  ' +
        results.map(r => (r.delta === 0 ? '·' : (r.delta > 0 ? '+' : '')) + (r.delta * 100).toFixed(0) + '%:' + r.rate.toFixed(3)).join('  ') +
        '  → ' + bestVal.toFixed(2) + (Math.abs(bestVal - base) > 1e-9 ? ' (changed)' : ''));
      current[key] = bestVal;
    }
  }
  console.log('\n== best weights ==');
  console.log(JSON.stringify(current, null, 2));
  const final = runMatches(current, DEFAULT_W, matchesPerTrial * 6);
  const rate = final.testWins / final.n;
  const se = Math.sqrt(rate * (1 - rate) / final.n);
  console.log('\nvs baseline: ' + final.testWins + '/' + final.n + ' = ' + rate.toFixed(3) + ' ± ' + (1.96 * se).toFixed(3));
  require('fs').writeFileSync('scripts/sim-feixingqi-best.json', JSON.stringify(current, null, 2));
  console.log('written to scripts/sim-feixingqi-best.json');
}

function runES({ startCenter, sigmaInit = 0.25, generations = 5, popSize = 20, matchesPerEval = 60, label = '' }) {
  let center = { ...startCenter };
  let sigma = sigmaInit;
  const centroids = [];
  for (let gen = 0; gen < generations; gen++) {
    const pop = [];
    for (let i = 0; i < popSize; i++) {
      const cand = { ...center };
      for (const k of TUNE_KEYS) cand[k] = center[k] * (1 + gaussianRandom() * sigma);
      pop.push(cand);
    }
    const results = [];
    const tStart = Date.now();
    for (let i = 0; i < pop.length; i++) {
      const { testWins } = runMatches(pop[i], center, matchesPerEval);
      results.push({ cand: pop[i], rate: testWins / matchesPerEval });
      process.stdout.write('\r' + label + ' gen ' + gen + ' eval ' + (i + 1) + '/' + popSize + '   ');
    }
    process.stdout.write('\n');
    const elapsed = ((Date.now() - tStart) / 1000).toFixed(0);
    results.sort((a, b) => b.rate - a.rate);
    const top = results.slice(0, Math.max(2, Math.floor(popSize / 4)));
    const newCenter = { ...center };
    for (const k of TUNE_KEYS) {
      let sum = 0;
      for (const r of top) sum += r.cand[k];
      newCenter[k] = sum / top.length;
    }
    sigma *= 0.78;
    console.log(label + ' gen ' + gen + ' done (' + elapsed + 's): top rates [' +
      top.slice(0, 5).map(r => r.rate.toFixed(2)).join(', ') + ']; sigma → ' + sigma.toFixed(3));
    center = newCenter;
    centroids.push({ gen, center: { ...center }, topRate: top[0].rate });
  }
  return centroids;
}

function esTune({ generations = 6, popSize = 24, matchesPerEval = 80, sigmaInit = 0.25, startWeights = null }) {
  const startCenter = startWeights ? { ...DEFAULT_W, ...startWeights } : { ...DEFAULT_W };
  console.log('== ES tune == popSize=' + popSize + ' gen=' + generations + ' matches=' + matchesPerEval);
  const centroids = runES({ startCenter, sigmaInit, generations, popSize, matchesPerEval });
  const center = centroids[centroids.length - 1].center;
  console.log('\n== ES best weights ==');
  console.log(JSON.stringify(center, null, 2));
  const final = runMatches(center, DEFAULT_W, matchesPerEval * 4);
  const rate = final.testWins / final.n;
  console.log('vs baseline: ' + final.testWins + '/' + final.n + ' = ' + rate.toFixed(3));
  require('fs').writeFileSync('scripts/sim-feixingqi-es-best.json', JSON.stringify(center, null, 2));
}

function popGen({ K = 10, generations = 4, popSize = 16, matchesPerEval = 60, startSigma = 0.4 }) {
  const fs = require('fs');
  const popPath = 'scripts/sim-feixingqi-population.json';
  let population = [];
  let startK = 0;
  if (fs.existsSync(popPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(popPath, 'utf8'));
      if (Array.isArray(existing) && existing.length > 0) {
        population = existing;
        startK = Math.max(...existing.map(e => e.runIdx || 0)) + 1;
        console.log('resuming (' + existing.length + ' entries, next runIdx=' + startK + ')');
      }
    } catch (e) { /* fresh */ }
  }
  console.log('== pop-gen == K=' + K + ' gen=' + generations + ' pop=' + popSize + ' matches=' + matchesPerEval);
  console.log('est ' + (K * generations * popSize * matchesPerEval * 0.02 / 60).toFixed(1) + ' min total (粗估)');
  const overallStart = Date.now();
  for (let k = startK; k < K; k++) {
    const startCenter = { ...DEFAULT_W };
    if (k > 0) for (const key of TUNE_KEYS) startCenter[key] = DEFAULT_W[key] * (1 + gaussianRandom() * startSigma);
    console.log('\n--- run ' + k + ' / ' + K + ' ---');
    const centroids = runES({ startCenter, sigmaInit: 0.25, generations, popSize, matchesPerEval, label: 'run' + k });
    const snapGens = [...new Set([0, Math.floor((generations - 1) / 2), generations - 1])];
    for (const g of snapGens) {
      population.push({ id: 'run' + k + '_gen' + g, runIdx: k, genSnapshot: g, startCenter: { ...startCenter }, weights: { ...centroids[g].center } });
    }
    fs.writeFileSync(popPath, JSON.stringify(population, null, 2));
    console.log('run ' + k + ' saved; pop size = ' + population.length + '; elapsed ' + ((Date.now() - overallStart) / 1000 / 60).toFixed(1) + ' min');
  }
  console.log('\n== pop-gen DONE; ' + population.length + ' candidates ==');
}

function tournament({ matchesPerPair = 80 }) {
  const fs = require('fs');
  const popPath = 'scripts/sim-feixingqi-population.json';
  if (!fs.existsSync(popPath)) { console.error('missing ' + popPath + ', run pop-gen first'); process.exit(1); }
  const population = JSON.parse(fs.readFileSync(popPath, 'utf8'));
  const anchors = [{ id: 'DEFAULT_W', weights: { ...DEFAULT_W } }];
  const coordPath = 'scripts/sim-feixingqi-best.json';
  if (fs.existsSync(coordPath)) anchors.push({ id: 'coord-best', weights: { ...DEFAULT_W, ...JSON.parse(fs.readFileSync(coordPath, 'utf8')) } });
  const all = anchors.concat(population.map(p => ({ id: p.id, weights: p.weights })));
  const N = all.length;
  const numPairs = N * (N - 1) / 2;
  console.log('== tournament == N=' + N + ' pairs=' + numPairs + ' matchesPerPair=' + matchesPerPair);
  const elo = new Map();
  for (const c of all) elo.set(c.id, 1500);
  const winsMatrix = {};
  let pairIdx = 0;
  const tStart = Date.now();
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = all[i], b = all[j];
      const r = runMatches(a.weights, b.weights, matchesPerPair);
      const aWins = r.testWins, bWins = r.baselineWins;
      winsMatrix[a.id] = winsMatrix[a.id] || {}; winsMatrix[a.id][b.id] = aWins;
      winsMatrix[b.id] = winsMatrix[b.id] || {}; winsMatrix[b.id][a.id] = bWins;
      const sa = aWins / (aWins + bWins);
      const ea = 1 / (1 + Math.pow(10, (elo.get(b.id) - elo.get(a.id)) / 400));
      const K_ELO = 24;
      elo.set(a.id, elo.get(a.id) + K_ELO * (sa - ea));
      elo.set(b.id, elo.get(b.id) + K_ELO * ((1 - sa) - (1 - ea)));
      pairIdx++;
      const elapsed = (Date.now() - tStart) / 1000;
      const eta = elapsed / pairIdx * (numPairs - pairIdx) / 60;
      process.stdout.write('\rpair ' + pairIdx + '/' + numPairs + ' ' + a.id + ' vs ' + b.id + ' = ' + aWins + ':' + bWins + ' (ETA ' + eta.toFixed(0) + ' min)        ');
      if (pairIdx % 20 === 0) saveTournamentResults(all, elo, winsMatrix, false);
    }
  }
  process.stdout.write('\n');
  saveTournamentResults(all, elo, winsMatrix, true);
}

function saveTournamentResults(all, elo, winsMatrix, final) {
  const fs = require('fs');
  const ranking = all.map(c => {
    const wins = winsMatrix[c.id] || {};
    let totalWins = 0, totalGames = 0;
    for (const opp of Object.keys(wins)) {
      totalWins += wins[opp];
      totalGames += wins[opp] + ((winsMatrix[opp] || {})[c.id] || 0);
    }
    return { id: c.id, elo: elo.get(c.id), totalWins, totalGames, winRate: totalGames > 0 ? totalWins / totalGames : 0, weights: c.weights };
  });
  ranking.sort((a, b) => b.elo - a.elo);
  fs.writeFileSync('scripts/sim-feixingqi-ranking.json', JSON.stringify(ranking, null, 2));
  fs.writeFileSync('scripts/sim-feixingqi-wins-matrix.json', JSON.stringify(winsMatrix, null, 2));
  if (final) {
    console.log('\n== tournament DONE ==');
    console.log('Top 5: ' + ranking.slice(0, 5).map(r => r.id + '(' + r.elo.toFixed(0) + ')').join(', '));
    console.log('Bot 5: ' + ranking.slice(-5).map(r => r.id + '(' + r.elo.toFixed(0) + ')').join(', '));
    console.log('Elo spread: ' + ranking[0].elo.toFixed(0) + ' → ' + ranking[ranking.length - 1].elo.toFixed(0));
  }
}

function sanity() {
  console.log('== sanity: baseline 自对弈 ==');
  // 1) 每色胜率（4 个相同权重，应各 ~25%，先手色略高）
  const counts = { red: 0, yellow: 0, blue: 0, green: 0 };
  const N = 2000;
  const seatW = {}; for (const c of TURN_ORDER) seatW[c] = DEFAULT_W;
  let totalTurns = 0;
  for (let i = 0; i < N; i++) {
    const ranking = playGame(seatW, Math.random);
    counts[ranking[0]]++;
  }
  console.log('每色第一名占比 (n=' + N + '): ' + TURN_ORDER.map(c => c + ' ' + (counts[c] / N * 100).toFixed(1) + '%').join('  '));
  // 2) pairwise（应 ~50%）
  const r = runMatches(DEFAULT_W, DEFAULT_W, N);
  console.log('pairwise A vs A: ' + r.testWins + '/' + r.n + ' = ' + (r.testWins / r.n).toFixed(3) + ' (期望 ~0.50)');
}

// ===========================================================
// CLI
// ===========================================================
function gap() {
  const N = 4000;
  const RAND = { __random: true };
  // 反向策略：进度/到家/吃子全反号 → 故意往后退、躲到家
  const ANTI = { ...DEFAULT_W };
  for (const k of ['goal', 'capturePerOpp', 'bigJump', 'smallJump', 'advanceMult', 'stretchAdvanceBase', 'stretchEnterBase', 'proximityMult']) ANTI[k] = -DEFAULT_W[k];
  const show = (label, r) => {
    const rate = r.testWins / r.n;
    const se = Math.sqrt(rate * (1 - rate) / r.n);
    console.log(label.padEnd(34) + (rate * 100).toFixed(1) + '% ± ' + (1.96 * se * 100).toFixed(1) + '%  (' + r.testWins + '/' + r.n + ')');
  };
  console.log('== 策略天花板探针 (n=' + N + ' / 对) ==');
  show('DEFAULT_W vs 纯随机', runMatches(DEFAULT_W, RAND, N));
  show('DEFAULT_W vs 反向策略', runMatches(DEFAULT_W, ANTI, N));
  show('纯随机 vs 反向策略', runMatches(RAND, ANTI, N));
}

function ladder() {
  const N = 4000;
  const hard = { ...DEFAULT_W, epsilon: 0 };
  const show = (label, r) => {
    const rate = r.testWins / r.n;
    const se = Math.sqrt(rate * (1 - rate) / r.n);
    console.log(label.padEnd(22) + (rate * 100).toFixed(1) + '% ± ' + (1.96 * se * 100).toFixed(1) + '%');
  };
  console.log('== ε-greedy 阶梯：各 ε 档 vs hard(ε=0)，n=' + N + ' ==');
  for (const eps of [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1.0]) {
    show('ε=' + eps.toFixed(2), runMatches({ ...DEFAULT_W, epsilon: eps }, hard, N));
  }
}

const cmd = process.argv[2] || 'sanity';
if (cmd === 'ladder') ladder();
else if (cmd === 'gap') gap();
else if (cmd === 'sanity') sanity();
else if (cmd === 'tune') tune({ matchesPerTrial: parseInt(process.argv[3], 10) || 80, iterations: 2 });
else if (cmd === 'es-tune') {
  const generations = parseInt(process.argv[3], 10) || 6;
  const popSize = parseInt(process.argv[4], 10) || 24;
  const matchesPerEval = parseInt(process.argv[5], 10) || 80;
  const startPath = process.argv[6];
  const startWeights = startPath ? JSON.parse(require('fs').readFileSync(startPath, 'utf8')) : null;
  esTune({ generations, popSize, matchesPerEval, startWeights });
}
else if (cmd === 'pop-gen') {
  popGen({
    K: parseInt(process.argv[3], 10) || 10,
    generations: parseInt(process.argv[4], 10) || 4,
    popSize: parseInt(process.argv[5], 10) || 16,
    matchesPerEval: parseInt(process.argv[6], 10) || 60,
    startSigma: parseFloat(process.argv[7]) || 0.4,
  });
}
else if (cmd === 'tournament') tournament({ matchesPerPair: parseInt(process.argv[3], 10) || 80 });
else if (cmd === 'compare') {
  const fs = require('fs');
  const path = process.argv[3];
  const n = parseInt(process.argv[4], 10) || 800;
  const baselinePath = process.argv[5];
  const testW = Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(path, 'utf8')));
  const baselineW = baselinePath ? Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(baselinePath, 'utf8'))) : DEFAULT_W;
  console.log('compare ' + path + ' vs ' + (baselinePath || 'DEFAULT_W') + ', n=' + n);
  const r = runMatches(testW, baselineW, n);
  const rate = r.testWins / r.n;
  const se = Math.sqrt(rate * (1 - rate) / r.n);
  console.log('test wins ' + r.testWins + '/' + r.n + ' = ' + rate.toFixed(3) + ' ± ' + (1.96 * se).toFixed(3) + ' (95% CI)');
}
else { console.error('unknown cmd: ' + cmd); process.exit(1); }
