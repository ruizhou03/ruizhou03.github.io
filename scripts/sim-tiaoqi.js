#!/usr/bin/env node
'use strict';

/*
 * 跳棋（中国跳棋）探针 —— 在投入权重训练前，先判断强弱主要来自
 * 「搜索深度」还是「eval 权重」。
 *
 * 用法：
 *   node scripts/sim-tiaoqi.js probe   # 跑全套探针（搜索深度 + eval 权重 + 天花板）
 *
 * 引擎从 assets/js/games/tiaoqi.js 抄过来（纯逻辑，丢弃 SVG 渲染）。
 * 探针只用 2 人对局（N 北 vs S 南，goal 互为对角），最干净。
 */

// ===========================================================
// 引擎（抄自 assets/js/games/tiaoqi.js）
// ===========================================================
const ROWS = 17;
const DIRS = [[0, +2], [+1, +1], [+1, -1], [0, -2], [-1, -1], [-1, +1]];

const ROW_COLS = (() => {
  const m = {};
  m[0] = [12]; m[1] = [11, 13]; m[2] = [10, 12, 14]; m[3] = [9, 11, 13, 15];
  m[4] = []; for (let c = 0; c <= 24; c += 2) m[4].push(c);
  m[5] = []; for (let c = 1; c <= 23; c += 2) m[5].push(c);
  m[6] = []; for (let c = 2; c <= 22; c += 2) m[6].push(c);
  m[7] = []; for (let c = 3; c <= 21; c += 2) m[7].push(c);
  m[8] = []; for (let c = 4; c <= 20; c += 2) m[8].push(c);
  m[9] = []; for (let c = 3; c <= 21; c += 2) m[9].push(c);
  m[10] = []; for (let c = 2; c <= 22; c += 2) m[10].push(c);
  m[11] = []; for (let c = 1; c <= 23; c += 2) m[11].push(c);
  m[12] = []; for (let c = 0; c <= 24; c += 2) m[12].push(c);
  m[13] = [9, 11, 13, 15]; m[14] = [10, 12, 14]; m[15] = [11, 13]; m[16] = [12];
  return m;
})();
const VALID_SET = (() => {
  const s = new Set();
  for (let r = 0; r < ROWS; r++) for (const c of ROW_COLS[r]) s.add(r * 100 + c);
  return s;
})();
function isValid(r, c) { return VALID_SET.has(r * 100 + c); }

const CORNERS = {
  N:  { cells: [[0,12],[1,11],[1,13],[2,10],[2,12],[2,14],[3,9],[3,11],[3,13],[3,15]], goal: 'S' },
  NE: { cells: [[4,18],[4,20],[4,22],[4,24],[5,19],[5,21],[5,23],[6,20],[6,22],[7,21]], goal: 'SW' },
  SE: { cells: [[9,21],[10,20],[10,22],[11,19],[11,21],[11,23],[12,18],[12,20],[12,22],[12,24]], goal: 'NW' },
  S:  { cells: [[13,9],[13,11],[13,13],[13,15],[14,10],[14,12],[14,14],[15,11],[15,13],[16,12]], goal: 'N' },
  SW: { cells: [[9,3],[10,2],[10,4],[11,1],[11,3],[11,5],[12,0],[12,2],[12,4],[12,6]], goal: 'NE' },
  NW: { cells: [[4,0],[4,2],[4,4],[4,6],[5,1],[5,3],[5,5],[6,2],[6,4],[7,3]], goal: 'SE' },
};

function key(r, c) { return r * 100 + c; }
function fromKey(k) { return [Math.floor(k / 100), k % 100]; }
function hexDist(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
  return Math.max(dr, Math.floor((dr + dc) / 2));
}
function emptyBoard() {
  const b = {};
  for (let r = 0; r < ROWS; r++) for (const c of ROW_COLS[r]) b[r * 100 + c] = null;
  return b;
}
function startingBoard(playerCorners) {
  const b = emptyBoard();
  for (const ck of playerCorners) for (const [r, c] of CORNERS[ck].cells) b[key(r, c)] = ck;
  return b;
}
function stepDestinations(board, r, c) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (!isValid(nr, nc)) continue;
    if (board[key(nr, nc)] !== null) continue;
    out.push([nr, nc]);
  }
  return out;
}
function singleJumpDestinations(board, r, c) {
  const out = [];
  for (const [dr, dc] of DIRS) {
    let k = 1, mr = r + dr, mc = c + dc;
    while (isValid(mr, mc) && board[key(mr, mc)] === null) { k++; mr = r + dr * k; mc = c + dc * k; }
    if (!isValid(mr, mc)) continue;
    const tr = r + dr * 2 * k, tc = c + dc * 2 * k;
    if (!isValid(tr, tc)) continue;
    let blocked = false;
    for (let j = k + 1; j < 2 * k; j++) {
      const ir = r + dr * j, ic = c + dc * j;
      if (!isValid(ir, ic) || board[key(ir, ic)] !== null) { blocked = true; break; }
    }
    if (blocked) continue;
    if (board[key(tr, tc)] !== null) continue;
    out.push([tr, tc]);
  }
  return out;
}
function hopPaths(board, r, c) {
  const startK = key(r, c);
  const piece = board[startK];
  board[startK] = null;
  const parent = new Map();
  parent.set(startK, null);
  const out = [];
  const frontier = [[r, c]];
  while (frontier.length > 0) {
    const [cr, cc] = frontier.shift();
    const fromK = key(cr, cc);
    for (const [tr, tc] of singleJumpDestinations(board, cr, cc)) {
      const tk = key(tr, tc);
      if (parent.has(tk)) continue;
      parent.set(tk, fromK);
      out.push({ to: [tr, tc] });
      frontier.push([tr, tc]);
    }
  }
  board[startK] = piece;
  return out;
}
function legalMoves(board, player) {
  const out = [];
  for (const k in board) {
    if (board[k] !== player) continue;
    const [r, c] = fromKey(parseInt(k, 10));
    for (const [tr, tc] of stepDestinations(board, r, c)) out.push({ from: [r, c], to: [tr, tc] });
    for (const { to } of hopPaths(board, r, c)) out.push({ from: [r, c], to });
  }
  return out;
}
function makeMove(board, m) {
  const fk = key(m.from[0], m.from[1]), tk = key(m.to[0], m.to[1]);
  const piece = board[fk];
  board[fk] = null; board[tk] = piece;
  return { fk, tk, piece };
}
function undoMove(board, u) { board[u.tk] = null; board[u.fk] = u.piece; }
function hasWon(board, player) {
  const goalCells = CORNERS[CORNERS[player].goal].cells;
  let mineInGoal = 0;
  for (const [r, c] of goalCells) if (board[key(r, c)] === player) mineInGoal++;
  if (mineInGoal !== 10) return false;
  let total = 0;
  for (const k in board) if (board[k] === player) total++;
  return total === 10;
}

// --- 参数化 eval（W = {dist, goal, start}） ---
// 预计算所有合法格的 [k,r,c]，避免每次 eval 都 for-in 遍历字符串键（慢）。
const CELLS = (() => {
  const out = [];
  for (let r = 0; r < ROWS; r++) for (const c of ROW_COLS[r]) out.push([r * 100 + c, r, c]);
  return out;
})();
function distanceScore(board, player) {
  const goalCells = CORNERS[CORNERS[player].goal].cells;
  let sum = 0;
  for (const [k, r, c] of CELLS) {
    if (board[k] !== player) continue;
    let best = Infinity;
    for (const [gr, gc] of goalCells) { const d = hexDist(r, c, gr, gc); if (d < best) best = d; }
    sum += best;
  }
  return sum;
}
function inGoalCount(board, player) {
  const goalCells = CORNERS[CORNERS[player].goal].cells;
  let n = 0;
  for (const [r, c] of goalCells) if (board[key(r, c)] === player) n++;
  return n;
}
function inStartCount(board, player) {
  const startCells = CORNERS[player].cells;
  let n = 0;
  for (const [r, c] of startCells) if (board[key(r, c)] === player) n++;
  return n;
}
const DEFAULT_W = { dist: 10, goal: 1000, start: 50 };
function evalForPlayer(board, player, W) {
  return -distanceScore(board, player) * W.dist + inGoalCount(board, player) * W.goal - inStartCount(board, player) * W.start;
}

// --- 干净的 D 层 minimax（depth=ply 数；depth1=贪心 eval） ---
function minimax(board, toMove, ai, opp, depth, alpha, beta, W) {
  if (depth === 0 || hasWon(board, ai) || hasWon(board, opp)) {
    return evalForPlayer(board, ai, W) - evalForPlayer(board, opp, W);
  }
  const moves = legalMoves(board, toMove);
  if (moves.length === 0) return evalForPlayer(board, ai, W) - evalForPlayer(board, opp, W);
  const next = (toMove === ai) ? opp : ai;
  if (toMove === ai) {
    let best = -Infinity;
    for (const m of moves) {
      const u = makeMove(board, m);
      const v = minimax(board, next, ai, opp, depth - 1, alpha, beta, W);
      undoMove(board, u);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const u = makeMove(board, m);
      const v = minimax(board, next, ai, opp, depth - 1, alpha, beta, W);
      undoMove(board, u);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// policy = { depth, W, random }。返回选定的 move。
function pickMove(board, ai, opp, policy, rng) {
  const moves = legalMoves(board, ai);
  if (moves.length === 0) return null;
  if (policy.random) return moves[Math.floor(rng() * moves.length)];
  const W = policy.W || DEFAULT_W;
  if (policy.depth <= 1) {
    let best = null, bestV = -Infinity;
    for (const m of moves) {
      const u = makeMove(board, m);
      const v = evalForPlayer(board, ai, W) - evalForPlayer(board, opp, W);
      undoMove(board, u);
      if (v > bestV) { bestV = v; best = m; }
    }
    return best;
  }
  let best = null, bestV = -Infinity;
  for (const m of moves) {
    const u = makeMove(board, m);
    const v = minimax(board, opp, ai, opp, policy.depth - 1, -Infinity, Infinity, W);
    undoMove(board, u);
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

// ===========================================================
// 2 人对局：N 北 vs S 南
// ===========================================================
function playGame(policyN, policyS, rng, maxPlies = 160) {
  const board = startingBoard(['N', 'S']);
  const players = ['N', 'S'];
  const policies = { N: policyN, S: policyS };
  let turn = 0;
  for (let ply = 0; ply < maxPlies; ply++) {
    const me = players[turn % 2], opp = players[(turn + 1) % 2];
    if (hasWon(board, me)) return me;
    const m = pickMove(board, me, opp, policies[me], rng);
    if (m) {
      makeMove(board, m);
      if (hasWon(board, me)) return me;
    }
    turn++;
  }
  // 超时兜底：到家多者赢，其次距离近者
  const gN = inGoalCount(board, 'N'), gS = inGoalCount(board, 'S');
  if (gN !== gS) return gN > gS ? 'N' : 'S';
  return distanceScore(board, 'N') <= distanceScore(board, 'S') ? 'N' : 'S';
}

// A vs B：交替先手消除先手优势
function runMatches(policyA, policyB, n, rng = Math.random) {
  let aWins = 0;
  for (let i = 0; i < n; i++) {
    const aFirst = (i % 2 === 0);
    const winner = aFirst ? playGame(policyA, policyB, rng) : playGame(policyB, policyA, rng);
    const aColor = aFirst ? 'N' : 'S';
    if (winner === aColor) aWins++;
  }
  return { aWins, n };
}

function show(label, r, t0) {
  const rate = r.aWins / r.n;
  const se = Math.sqrt(rate * (1 - rate) / r.n);
  const secs = t0 ? '  [' + ((Date.now() - t0) / 1000).toFixed(0) + 's]' : '';
  console.log(label.padEnd(26) + (rate * 100).toFixed(1) + '% ± ' + (1.96 * se * 100).toFixed(1) + '%  (' + r.aWins + '/' + r.n + ')' + secs);
}
function timed(label, fn) { const t0 = Date.now(); show(label, fn(), t0); }

function probe() {
  const g = d => ({ depth: d, W: DEFAULT_W });
  const RAND = { random: true };

  console.log('== ① 策略天花板：贪心(d1) vs 纯随机 ==');
  timed('greedy-d1 vs random', () => runMatches(g(1), RAND, 60));

  console.log('\n== ② 搜索深度：深 vs 浅（看是否搜索主导）==');
  timed('d2 vs d1', () => runMatches(g(2), g(1), 40));
  timed('d3 vs d1', () => runMatches(g(3), g(1), 24));
  timed('d3 vs d2', () => runMatches(g(3), g(2), 24));

  console.log('\n== ③ eval 权重：扰动 vs baseline（同 d1）==');
  const variants = {
    'dist×0.5': { ...DEFAULT_W, dist: 5 },
    'dist×2':   { ...DEFAULT_W, dist: 20 },
    'start×0':  { ...DEFAULT_W, start: 0 },
    'start×4':  { ...DEFAULT_W, start: 200 },
    'goal×0.2': { ...DEFAULT_W, goal: 200 },
  };
  for (const [name, W] of Object.entries(variants)) {
    timed(name + ' vs base', () => runMatches({ depth: 1, W }, g(1), 60));
  }

  console.log('\n（判读：②若 d2/d3 大幅 >50% → 搜索主导，难度该调深度；');
  console.log('  ③若某扰动稳定 >55% → 权重可训；都 ~50% → 现有 eval 已够好）');
}

function evalprobe() {
  const g = d => ({ depth: d, W: DEFAULT_W });
  console.log('== ③ eval 权重：扰动 vs baseline（同 d1，看权重是否可调）==');
  const variants = {
    'dist×0.5': { ...DEFAULT_W, dist: 5 },
    'dist×2':   { ...DEFAULT_W, dist: 20 },
    'start×0':  { ...DEFAULT_W, start: 0 },
    'start×4':  { ...DEFAULT_W, start: 200 },
    'goal×0.2': { ...DEFAULT_W, goal: 200 },
    'goal×5':   { ...DEFAULT_W, goal: 5000 },
  };
  for (const [name, W] of Object.entries(variants)) {
    timed(name + ' vs base', () => runMatches({ depth: 1, W }, g(1), 80));
  }
}

function movetime() {
  // 测 depth-2 / depth-3 在「开局」和「中局」的单步耗时（浏览器可行性）
  const board = startingBoard(['N', 'S']);
  const probe = (label, b) => {
    for (const d of [2, 3]) {
      const t0 = Date.now();
      pickMove(b, 'N', 'S', { depth: d, W: DEFAULT_W }, Math.random);
      console.log(label + ' depth=' + d + ': ' + (Date.now() - t0) + 'ms  (合法手 ' + legalMoves(b, 'N').length + ')');
    }
  };
  probe('开局', board);
  // 推进 20 步做个中局快照
  let turn = 0; const players = ['N', 'S'];
  for (let i = 0; i < 20; i++) {
    const me = players[turn % 2], opp = players[(turn + 1) % 2];
    const m = pickMove(board, me, opp, { depth: 1, W: DEFAULT_W }, Math.random);
    if (m) makeMove(board, m);
    turn++;
  }
  probe('中局(20步后)', board);
}

const cmd = process.argv[2] || 'probe';
if (cmd === 'movetime') movetime();
else if (cmd === 'evalprobe') evalprobe();
else if (cmd === 'probe') probe();
else { console.error('unknown cmd: ' + cmd); process.exit(1); }
