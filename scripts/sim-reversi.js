#!/usr/bin/env node
'use strict';

/*
 * 黑白棋 (Reversi/Othello) AI 难度梯子探针
 *   忠实移植 toolbox/reversi/index.html 内联 <script> 的纯逻辑，
 *   丢弃 DOM/渲染/动画/延迟。AI-vs-AI 自对弈。
 *
 * 关键移植说明：
 *  - evaluate() 在原代码里读全局 state.difficulty 判断是否加「前沿子」项
 *    （只有 hard 才加）。这里把它改成「当前思考方所用的难度」传进去，
 *    忠实保留：hard 用带前沿子的评估，easy/normal 不用。
 *  - easy(depth=0) 在 pickAiMove 里走的是「随机偏角」分支，根本不调 minimax。
 *  - normal(depth=3) 固定深度 alpha-beta。
 *  - hard(depth=5) 迭代加深 d=2..5 + timeCapMs 截断。
 *
 * 用法：
 *   node scripts/sim-reversi.js probe [N]      # 全套探针（默认 N=100）
 *   node scripts/sim-reversi.js timing         # 仅 hard 单步耗时分布
 */

const N = 8;
const EMPTY = 0, BLACK = 1, WHITE = 2;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

const DIFFICULTY = {
  easy:   { depth: 0 },
  normal: { depth: 3 },
  hard:   { depth: 5, timeCapMs: 850 },
};

const WEIGHTS = [
  [120, -20, 20,  5,  5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [  5,  -5,  3,  3,  3,  3,  -5,   5],
  [ 20,  -5, 15,  3,  3, 15,  -5,  20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20,  5,  5, 20, -20, 120]
];

// ============ 规则核心（逐字移植） ============
function freshBoard() {
  const b = Array.from({ length: N }, () => Array(N).fill(EMPTY));
  b[3][3] = WHITE; b[3][4] = BLACK;
  b[4][3] = BLACK; b[4][4] = WHITE;
  return b;
}

function flipsFor(board, r, c, who) {
  if (board[r][c] !== EMPTY) return [];
  const opp = who === BLACK ? WHITE : BLACK;
  const flips = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === opp) {
      line.push([nr, nc]);
      nr += dr; nc += dc;
    }
    if (line.length && nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === who) {
      for (const p of line) flips.push(p);
    }
  }
  return flips;
}

function legalMoves(board, who) {
  const out = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (board[r][c] === EMPTY && flipsFor(board, r, c, who).length) out.push([r, c]);
  return out;
}

function applyMove(board, r, c, who) {
  const flips = flipsFor(board, r, c, who);
  board[r][c] = who;
  for (const [fr, fc] of flips) board[fr][fc] = who;
  return flips;
}

function countDiscs(board) {
  let b = 0, w = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (board[r][c] === BLACK) b++;
      else if (board[r][c] === WHITE) w++;
    }
  return { b, w };
}

function cloneBoard(b) { return b.map(row => row.slice()); }

// ============ AI（逐字移植，把 state.difficulty 改成参数 diff） ============
// evaluate 永远从 WHITE(=AI) 视角打分。
// 原代码里只有 diff==='hard' 才加前沿子项 —— 这里保留该行为。
function evaluate(board, diff) {
  const { b, w } = countDiscs(board);
  const total = b + w;

  if (total === 64 || (legalMoves(board, BLACK).length === 0 && legalMoves(board, WHITE).length === 0)) {
    if (w > b) return 100000 + (w - b);
    if (b > w) return -100000 - (b - w);
    return 0;
  }

  let posScore = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (board[r][c] === WHITE) posScore += WEIGHTS[r][c];
      else if (board[r][c] === BLACK) posScore -= WEIGHTS[r][c];
    }

  const wMob = legalMoves(board, WHITE).length;
  const bMob = legalMoves(board, BLACK).length;
  let mobScore = 0;
  if (wMob + bMob !== 0) mobScore = 100 * (wMob - bMob) / (wMob + bMob);

  const corners = [[0,0],[0,7],[7,0],[7,7]];
  let wCorner = 0, bCorner = 0;
  for (const [cr, cc] of corners) {
    if (board[cr][cc] === WHITE) wCorner++;
    else if (board[cr][cc] === BLACK) bCorner++;
  }
  const cornerScore = 800 * (wCorner - bCorner);

  let discScore = 0;
  if (total > 52) discScore = 60 * (w - b);

  let score = posScore + mobScore + cornerScore + discScore;

  if (diff === 'hard') {
    let wFront = 0, bFront = 0;
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        if (board[r][c] === EMPTY) continue;
        let frontier = false;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && board[nr][nc] === EMPTY) { frontier = true; break; }
        }
        if (frontier) { if (board[r][c] === WHITE) wFront++; else bFront++; }
      }
    score += 12 * (bFront - wFront);
  }

  return score;
}

// alpha-beta；who 为当前行动方。AI=WHITE 是极大方，BLACK 是极小方。
// diff 决定 evaluate 用哪套（前沿子）。
function minimax(board, depth, alpha, beta, who, deadline, diff) {
  if (depth === 0) return evaluate(board, diff);
  if (deadline && Date.now() > deadline) return evaluate(board, diff);

  const moves = legalMoves(board, who);
  const opp = who === BLACK ? WHITE : BLACK;

  if (moves.length === 0) {
    if (legalMoves(board, opp).length === 0) return evaluate(board, diff);
    return minimax(board, depth - 1, alpha, beta, opp, deadline, diff);
  }

  if (who === WHITE) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      const nb = cloneBoard(board);
      applyMove(nb, r, c, who);
      const v = minimax(nb, depth - 1, alpha, beta, opp, deadline, diff);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      const nb = cloneBoard(board);
      applyMove(nb, r, c, who);
      const v = minimax(nb, depth - 1, alpha, beta, opp, deadline, diff);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

/*
 * AI 选点。原代码里 AI 永远是 WHITE、人类是 BLACK，minimax 也把 WHITE 当
 * 极大方写死了。为了让两个 AI 对打，我让「当前思考的 AI」始终扮演 WHITE：
 * 即把它当成原代码里那个 AI=WHITE。这要求棋盘以「该 AI 视角」喂进去。
 *
 * 简化且忠实的做法：保留全局 BLACK/WHITE 固定颜色，写一个 pickMove(board,
 * meColor, diff)。当 meColor===WHITE 时与原代码逐字一致；当 meColor===BLACK
 * 时，把棋盘黑白对调后复用同一套（因为 evaluate/minimax 把 WHITE 写死成极大方）。
 * 颜色对调是无副作用的对称变换，等价于原 AI 的策略。
 */
function swapColors(board) {
  const nb = Array.from({ length: N }, () => Array(N).fill(EMPTY));
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const v = board[r][c];
      nb[r][c] = v === BLACK ? WHITE : (v === WHITE ? BLACK : EMPTY);
    }
  return nb;
}

// 返回 { move:[r,c]|null, elapsedMs }，move 是在「原始 board / meColor」坐标下的落子
function pickMove(board, meColor, diff) {
  const t0 = Date.now();
  // 把局面变换成「我是 WHITE」的视角
  const view = meColor === WHITE ? board : swapColors(board);
  const cfg = DIFFICULTY[diff];
  const moves = legalMoves(view, WHITE);
  if (moves.length === 0) return { move: null, elapsedMs: Date.now() - t0 };

  let chosen;

  if (diff === 'easy') {
    const cornerMoves = moves.filter(([r, c]) => (r === 0 || r === 7) && (c === 0 || c === 7));
    if (cornerMoves.length) {
      chosen = cornerMoves[(Math.random() * cornerMoves.length) | 0];
    } else {
      const safe = moves.filter(([r, c]) => WEIGHTS[r][c] >= 0);
      const pool = safe.length ? safe : moves;
      chosen = pool[(Math.random() * pool.length) | 0];
    }
    return { move: chosen, elapsedMs: Date.now() - t0 };
  }

  let best = moves[0], bestVal = -Infinity;
  const orderMoves = moves.slice().sort((a, b) => WEIGHTS[b[0]][b[1]] - WEIGHTS[a[0]][a[1]]);

  if (diff === 'hard') {
    const deadline = Date.now() + (cfg.timeCapMs || 850);
    for (let d = 2; d <= cfg.depth; d++) {
      let curBest = orderMoves[0], curVal = -Infinity;
      let aborted = false;
      for (const [r, c] of orderMoves) {
        if (Date.now() > deadline) { aborted = true; break; }
        const nb = cloneBoard(view);
        applyMove(nb, r, c, WHITE);
        const v = minimax(nb, d - 1, -Infinity, Infinity, BLACK, deadline, diff);
        if (v > curVal) { curVal = v; curBest = [r, c]; }
      }
      if (!aborted) { best = curBest; bestVal = curVal; }
      if (Date.now() > deadline) break;
    }
    chosen = best;
  } else {
    for (const [r, c] of orderMoves) {
      const nb = cloneBoard(view);
      applyMove(nb, r, c, WHITE);
      const v = minimax(nb, cfg.depth - 1, -Infinity, Infinity, BLACK, null, diff);
      if (v > bestVal) { bestVal = v; best = [r, c]; }
    }
    chosen = best;
  }
  // chosen 是在 view 坐标里的格子。颜色对调不改坐标，所以直接返回。
  return { move: chosen, elapsedMs: Date.now() - t0 };
}

// ============ 一局 AI vs AI ============
// blackDiff / whiteDiff：黑方、白方各自难度。返回 { winner: 'black'|'white'|'draw', b, w }
// randOpenPlies：开局先随机走若干合法步再交给 AI，用来打破 normal/hard 的
//   确定性（否则交替先手只产生 2 个不同棋局，有效样本=2）。
function playGame(blackDiff, whiteDiff, timings, randOpenPlies) {
  const board = freshBoard();
  let turn = BLACK;
  let passes = 0;
  let plies = 0;
  let randLeft = randOpenPlies || 0;
  while (randLeft > 0) {
    const moves = legalMoves(board, turn);
    if (moves.length === 0) {
      passes++;
      if (passes >= 2) break;
      turn = turn === BLACK ? WHITE : BLACK;
      continue;
    }
    passes = 0;
    const m = moves[(Math.random() * moves.length) | 0];
    applyMove(board, m[0], m[1], turn);
    plies++;
    turn = turn === BLACK ? WHITE : BLACK;
    randLeft--;
  }
  while (true) {
    const moves = legalMoves(board, turn);
    if (moves.length === 0) {
      passes++;
      if (passes >= 2) break; // 双方都无子
      turn = turn === BLACK ? WHITE : BLACK;
      continue;
    }
    passes = 0;
    const diff = turn === BLACK ? blackDiff : whiteDiff;
    const { move, elapsedMs } = pickMove(board, turn, diff);
    if (timings && diff === 'hard') {
      const filled = countDiscs(board); const total = filled.b + filled.w;
      const phase = total <= 20 ? 'open' : (total <= 48 ? 'mid' : 'end');
      timings[phase].push(elapsedMs);
    }
    if (!move) { turn = turn === BLACK ? WHITE : BLACK; continue; }
    applyMove(board, move[0], move[1], turn);
    plies++;
    turn = turn === BLACK ? WHITE : BLACK;
  }
  const { b, w } = countDiscs(board);
  let winner = b > w ? 'black' : (w > b ? 'white' : 'draw');
  return { winner, b, w, plies };
}

// pair: A vs B，交替先手（黑先有优势）。N 局。返回 A 视角胜率。
// 第 i 局：i 偶数 → A 执黑(先)、B 执白；i 奇数 → A 执白、B 执黑。
function runPair(diffA, diffB, n, timings, randOpenPlies) {
  let aWins = 0, bWins = 0, draws = 0;
  let aAsBlackWins = 0, aAsBlack = 0, aAsWhiteWins = 0, aAsWhite = 0;
  for (let i = 0; i < n; i++) {
    const aBlack = (i % 2 === 0);
    const blackDiff = aBlack ? diffA : diffB;
    const whiteDiff = aBlack ? diffB : diffA;
    const res = playGame(blackDiff, whiteDiff, timings, randOpenPlies);
    let aResult;
    if (res.winner === 'draw') aResult = 'draw';
    else if ((res.winner === 'black') === aBlack) aResult = 'A';
    else aResult = 'B';
    if (aResult === 'A') aWins++; else if (aResult === 'B') bWins++; else draws++;
    if (aBlack) { aAsBlack++; if (aResult === 'A') aAsBlackWins++; }
    else { aAsWhite++; if (aResult === 'A') aAsWhiteWins++; }
  }
  return { aWins, bWins, draws, n, aAsBlack, aAsBlackWins, aAsWhite, aAsWhiteWins };
}

function fmtPair(label, r) {
  const decisive = r.aWins + r.bWins;
  const rate = decisive ? r.aWins / decisive : 0;             // 排除平局的胜率
  const rateAll = (r.aWins + 0.5 * r.draws) / r.n;            // 含平局算 0.5 的得分率
  const se = decisive ? Math.sqrt(rate * (1 - rate) / decisive) : 0;
  return label.padEnd(26) +
    'A胜率 ' + (rate * 100).toFixed(1) + '% ±' + (1.96 * se * 100).toFixed(1) +
    '  (A ' + r.aWins + ' / B ' + r.bWins + ' / 平 ' + r.draws + ', n=' + r.n + ')' +
    '  得分率 ' + (rateAll * 100).toFixed(1) + '%';
}

function probe(n) {
  console.log('== 黑白棋难度梯子探针 (每对 n=' + n + ' 局, 交替先手) ==');
  console.log('约定：每行「A」=左侧难度。黑先手有先手优势，已通过交替先手抵消。');
  console.log('注意：normal/hard 是确定性策略（无随机），从同一开局出发只会产生固定棋局，');
  console.log('      所以做两遍——「定式」(从标准开局直接对弈) 和「随机开局」(先随机走 4 步再交给 AI)。\n');

  const ROP = 4; // 随机开局步数

  console.log('--- A: 定式开局（normal/hard 间有效样本仅 2 局，看绝对胜负方向）---');
  console.log(fmtPair('normal vs normal', runPair('normal', 'normal', n)));
  console.log(fmtPair('hard vs normal', runPair('hard', 'normal', n)));
  console.log(fmtPair('normal vs easy', runPair('normal', 'easy', n)));
  console.log(fmtPair('hard vs easy', runPair('hard', 'easy', n)));
  console.log();

  console.log('--- B: 随机开局（先随机 ' + ROP + ' 步，得到 ' + n + ' 个不同局面，统计才有效）---');
  console.log(fmtPair('normal vs normal', runPair('normal', 'normal', n, null, ROP)));
  console.log(fmtPair('hard vs normal', runPair('hard', 'normal', n, null, ROP)));
  console.log(fmtPair('normal vs easy', runPair('normal', 'easy', n, null, ROP)));
  console.log(fmtPair('hard vs easy', runPair('hard', 'easy', n, null, ROP)));
  console.log();

  // 单步耗时：跑若干 hard 参与的局，按阶段统计
  console.log('--- hard(depth=5, timeCap=850ms) 单步耗时 ---');
  const timings = { open: [], mid: [], end: [] };
  const timN = Math.max(10, Math.min(n, 30));
  for (let i = 0; i < timN; i++) {
    playGame(i % 2 === 0 ? 'hard' : 'normal', i % 2 === 0 ? 'normal' : 'hard', timings);
  }
  for (const phase of ['open', 'mid', 'end']) {
    const arr = timings[phase].sort((a, b) => a - b);
    if (!arr.length) { console.log(phase + ': (无数据)'); continue; }
    const max = arr[arr.length - 1];
    const p50 = arr[Math.floor(arr.length * 0.5)];
    const p95 = arr[Math.floor(arr.length * 0.95)];
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const labelMap = { open: '开局(≤20子)', mid: '中局(21-48)', end: '残局(49+)' };
    console.log(labelMap[phase].padEnd(16) +
      'mean ' + mean.toFixed(0) + 'ms  p50 ' + p50 + '  p95 ' + p95 +
      '  max ' + max + 'ms  (n=' + arr.length + ' 步)');
  }
}

function timingOnly() {
  const timings = { open: [], mid: [], end: [] };
  for (let i = 0; i < 40; i++) playGame('hard', 'normal', timings);
  for (const phase of ['open', 'mid', 'end']) {
    const arr = timings[phase].sort((a, b) => a - b);
    const max = arr.length ? arr[arr.length - 1] : 0;
    console.log(phase + ' max ' + max + 'ms (n=' + arr.length + ')');
  }
}

const cmd = process.argv[2] || 'probe';
if (cmd === 'probe') probe(parseInt(process.argv[3], 10) || 100);
else if (cmd === 'timing') timingOnly();
else { console.error('unknown cmd: ' + cmd); process.exit(1); }
