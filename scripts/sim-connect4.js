#!/usr/bin/env node
'use strict';

/*
 * 四子棋（Connect4）AI 难度梯子「探针」 —— 忠实移植自 toolbox/connect4/index.html
 * 的内联 <script>（negamax + alpha-beta），丢弃所有 DOM / canvas / 动画。
 *
 * 用法：
 *   node scripts/sim-connect4.js probe [N]   # 三档对拉胜率 + 单步最坏耗时（N≈100 局/对）
 *
 * 关键点：原版的 simPlace/simUndo/negamax/checkWin/evaluate/pickAiMove 全都直接读写
 * 模块级的 state.board / state.heights，这里完整保留这种「共享 state」结构，只是把
 * state 做成函数参数显式传入，确保行为与浏览器里逐字一致。
 *
 * DIFFICULTY（逐字抄）：
 *   easy:   depth 2, noise 0.45, randChance 0.30
 *   normal: depth 4, noise 0,    randChance 0
 *   hard:   depth 7, noise 0,    randChance 0
 */

// ===== 棋盘常量（抄自 index.html）=====
const COLS = 7, ROWS = 6;
const EMPTY = 0, HUMAN = 1, AI = 2;

const DIFFICULTY = {
  easy:   { depth: 2, noise: 0.45, randChance: 0.30, delayMs: 240 },
  normal: { depth: 4, noise: 0,    randChance: 0,    delayMs: 320 },
  hard:   { depth: 7, noise: 0,    randChance: 0,    delayMs: 460 }
};

// 列搜索顺序：中路优先（4,3,5,2,6,1,0）
const COL_ORDER = (() => {
  const mid = (COLS - 1) / 2;
  return [...Array(COLS).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
})();

// ===== 引擎（纯逻辑，把原来读 state.board/state.heights 的函数都改成显式传 st）=====
function newState() {
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY)),
    heights: Array(COLS).fill(0)
  };
}

function legalCols(st) {
  return COL_ORDER.filter(c => st.heights[c] < ROWS);
}

function simPlace(st, col, who) {
  const r = ROWS - 1 - st.heights[col];
  st.board[r][col] = who;
  st.heights[col]++;
  return r;
}
function simUndo(st, col, r) {
  st.board[r][col] = EMPTY;
  st.heights[col]--;
}

function checkWin(st, r, c, who) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    const cells = [{ r, c }];
    for (let k = 1; k < 4; k++) {
      const nr = r + dr * k, nc = c + dc * k;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || st.board[nr][nc] !== who) break;
      cells.push({ r: nr, c: nc });
    }
    for (let k = 1; k < 4; k++) {
      const nr = r - dr * k, nc = c - dc * k;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || st.board[nr][nc] !== who) break;
      cells.unshift({ r: nr, c: nc });
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return null;
}

// 一段 4 连窗口的局部分（逐字抄）
function scoreWindow(w, who) {
  const opp = who === HUMAN ? AI : HUMAN;
  let me = 0, op = 0, e = 0;
  for (const v of w) { if (v === who) me++; else if (v === opp) op++; else e++; }
  if (me > 0 && op > 0) return 0;
  if (me === 4) return 100000;
  if (me === 3 && e === 1) return 100;
  if (me === 2 && e === 2) return 10;
  if (op === 4) return -100000;
  if (op === 3 && e === 1) return -120;
  if (op === 2 && e === 2) return -10;
  return 0;
}

// 整盘静态评估（以 who 视角，逐字抄）
function evaluate(st, who) {
  let score = 0;
  const mid = (COLS - 1) / 2;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (st.board[r][c] === who) score += (3 - Math.abs(c - mid)) * 2;
      else if (st.board[r][c] !== EMPTY) score -= (3 - Math.abs(c - mid)) * 2;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([st.board[r][c], st.board[r][c + 1], st.board[r][c + 2], st.board[r][c + 3]], who);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([st.board[r][c], st.board[r + 1][c], st.board[r + 2][c], st.board[r + 3][c]], who);
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([st.board[r][c], st.board[r + 1][c + 1], st.board[r + 2][c + 2], st.board[r + 3][c + 3]], who);
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([st.board[r][c], st.board[r - 1][c + 1], st.board[r - 2][c + 2], st.board[r - 3][c + 3]], who);

  return score;
}

// negamax + alpha-beta（逐字抄）
function negamax(st, depth, alpha, beta, who) {
  const cols = legalCols(st);
  if (cols.length === 0) return 0;
  for (const c of cols) {
    const r = simPlace(st, c, who);
    const win = checkWin(st, r, c, who);
    simUndo(st, c, r);
    if (win) return 100000 + depth;
  }
  if (depth === 0) return evaluate(st, who);

  let best = -Infinity;
  for (const c of cols) {
    const r = simPlace(st, c, who);
    const val = -negamax(st, depth - 1, -beta, -alpha, who === HUMAN ? AI : HUMAN);
    simUndo(st, c, r);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/*
 * pickAiMove（逐字抄）。原版固定让 AI 执 AI(2)、对手是 HUMAN(1)。
 * 这里推广成「me / opp 任意」，但默认按原版 me=AI、opp=HUMAN 调用，
 * 保证行为一致；AI-vs-AI 只是把双方都当成 me=自己色。
 * 返回 {col, costMs} —— 顺带量单步耗时。
 */
function pickAiMove(st, cfg, me, opp) {
  const cols = legalCols(st);
  if (cols.length === 0) return { col: -1, costMs: 0 };
  const t0 = process.hrtime.bigint();

  // 1) 必胜
  for (const c of cols) {
    const r = simPlace(st, c, me);
    const win = checkWin(st, r, c, me);
    simUndo(st, c, r);
    if (win) return { col: c, costMs: hrMs(t0) };
  }
  // 2) 必防
  for (const c of cols) {
    const r = simPlace(st, c, opp);
    const win = checkWin(st, r, c, opp);
    simUndo(st, c, r);
    if (win) return { col: c, costMs: hrMs(t0) };
  }
  // 3) easy 随机
  if (cfg.randChance > 0 && Math.random() < cfg.randChance) {
    return { col: cols[Math.floor(Math.random() * cols.length)], costMs: hrMs(t0) };
  }
  // 4) negamax
  let best = cols[0], bestVal = -Infinity;
  for (const c of cols) {
    const r = simPlace(st, c, me);
    let val = -negamax(st, cfg.depth - 1, -Infinity, Infinity, opp);
    simUndo(st, c, r);
    if (cfg.noise > 0) val += (Math.random() - 0.5) * 2 * cfg.noise * 200;
    if (val > bestVal) { bestVal = val; best = c; }
  }
  return { col: best, costMs: hrMs(t0) };
}

function hrMs(t0) { return Number(process.hrtime.bigint() - t0) / 1e6; }

// ===== AI-vs-AI 一局 =====
// firstCfg 先手（=原版 HUMAN 红 1 的位置），secondCfg 后手（=原版 AI 黄 2）。
// 返回 { winner: 1|2|0, costsByDiff: {diffName: [costMs...]} }
function playGame(firstCfg, secondCfg, costSink) {
  const st = newState();
  // 座位 1 先手用 firstCfg，座位 2 后手用 secondCfg
  const cfgBySeat = { 1: firstCfg, 2: secondCfg };
  let turn = HUMAN; // 1 先手

  for (let ply = 0; ply < ROWS * COLS; ply++) {
    const me = turn;
    const opp = me === HUMAN ? AI : HUMAN;
    const cfg = cfgBySeat[me];
    const { col, costMs } = pickAiMove(st, cfg.params, me, opp);
    if (col < 0) return { winner: 0 }; // 棋盘满 -> 平局
    if (costSink) {
      (costSink[cfg.name] = costSink[cfg.name] || []).push(costMs);
    }
    const r = simPlace(st, col, me);
    if (checkWin(st, r, col, me)) return { winner: me };
    turn = opp;
  }
  return { winner: 0 };
}

// ===== probe：N 局，交替先手 =====
function probe(N) {
  const diffs = {
    easy:   { name: 'easy',   params: DIFFICULTY.easy },
    normal: { name: 'normal', params: DIFFICULTY.normal },
    hard:   { name: 'hard',   params: DIFFICULTY.hard }
  };

  const pairs = [
    ['sanity normal-vs-normal', diffs.normal, diffs.normal],
    ['hard-vs-normal',          diffs.hard,   diffs.normal],
    ['normal-vs-easy',          diffs.normal, diffs.easy],
    ['hard-vs-easy',            diffs.hard,   diffs.easy]
  ];

  const costSink = {}; // diffName -> [costMs...]

  console.log(`Connect4 AI 梯子探针  N=${N} 局/对（交替先手消除先手优势）\n`);

  for (const [label, A, B] of pairs) {
    let aWins = 0, bWins = 0, draws = 0;
    for (let i = 0; i < N; i++) {
      // 交替先手：偶数局 A 先手，奇数局 B 先手
      const aFirst = (i % 2 === 0);
      const first = aFirst ? A : B;
      const second = aFirst ? B : A;
      const res = playGame(first, second, costSink);
      if (res.winner === 0) draws++;
      else {
        const firstWon = res.winner === HUMAN;
        const winnerIsA = (aFirst && firstWon) || (!aFirst && !firstWon);
        if (winnerIsA) aWins++; else bWins++;
      }
    }
    const pa = (aWins / N * 100).toFixed(1);
    const pb = (bWins / N * 100).toFixed(1);
    const pd = (draws / N * 100).toFixed(1);
    const aName = A.name, bName = B.name;
    console.log(`${label}`);
    console.log(`  ${aName}(A) ${aWins}胜 ${pa}%  |  ${bName}(B) ${bWins}胜 ${pb}%  |  平局 ${draws} ${pd}%`);
    console.log('');
  }

  // 单步耗时统计
  console.log('单步耗时（毫秒，所有 probe 对局累计）：');
  for (const name of ['easy', 'normal', 'hard']) {
    const arr = costSink[name];
    if (!arr || !arr.length) { console.log(`  ${name}: 无样本`); continue; }
    arr.sort((a, b) => a - b);
    const max = arr[arr.length - 1];
    const p50 = arr[Math.floor(arr.length * 0.5)];
    const p95 = arr[Math.floor(arr.length * 0.95)];
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const flag = max > 300 ? '  <<< >300ms 需注意' : '';
    console.log(`  ${name}: n=${arr.length} mean=${mean.toFixed(2)} p50=${p50.toFixed(2)} p95=${p95.toFixed(2)} max=${max.toFixed(2)}${flag}`);
  }

  // 专门量 hard 开局单步最坏耗时（空盘 + 几个中局点）
  console.log('\nhard depth=7 专项最坏耗时（单独测，避开浏览器 delay）：');
  measureHardWorstStep();
}

function measureHardWorstStep() {
  const cfg = DIFFICULTY.hard;
  // 空盘开局
  {
    const st = newState();
    const { costMs } = pickAiMove(st, cfg, AI, HUMAN);
    console.log(`  开局空盘:        ${costMs.toFixed(1)} ms`);
  }
  // 典型中局：双方各下若干子（用 normal 自对弈走 8 ply 造一个真实中局）
  {
    const st = newState();
    let turn = HUMAN;
    for (let p = 0; p < 8; p++) {
      const me = turn, opp = me === HUMAN ? AI : HUMAN;
      const { col } = pickAiMove(st, DIFFICULTY.normal, me, opp);
      if (col < 0) break;
      const r = simPlace(st, col, me);
      if (checkWin(st, r, col, me)) break;
      turn = opp;
    }
    let worst = 0;
    for (let k = 0; k < 5; k++) {
      const { costMs } = pickAiMove(st, cfg, AI, HUMAN);
      if (costMs > worst) worst = costMs;
    }
    console.log(`  中局(8子后)最坏: ${worst.toFixed(1)} ms`);
  }
}

// ===== main =====
const cmd = process.argv[2] || 'probe';
if (cmd === 'probe') {
  const N = parseInt(process.argv[3], 10) || 100;
  probe(N);
} else {
  console.error('未知命令。用法: node scripts/sim-connect4.js probe [N]');
  process.exit(1);
}
