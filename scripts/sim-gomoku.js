#!/usr/bin/env node
'use strict';
// 五子棋 AI 难度梯子探针。
// 逻辑忠实移植自 toolbox/gomoku/index.html 的内联 <script>（丢弃 DOM/渲染/联机）。
// 移植对象：棋盘表示、checkWin（五连）、evaluatePoint、scoreLineFor、getCandidates、pickAiMove（含 hard 2-ply）。
//
// 用法：
//   node scripts/sim-gomoku.js probe [N]     # 每对 N 局（默认 60），含 sanity + 三对 + 单步耗时
//
// 注意：原 index.html 里 evaluatePoint / getCandidates / checkWin 直接读写全局 state.board。
// 这里改成显式传入 board 数组，行为一致。

const N = 15;
const EMPTY = 0, BLACK = 1, WHITE = 2;

// —— 忠实抄自 index.html 的 DIFFICULTY ——
const DIFFICULTY = {
  easy:   { defenseWeight: 0.30, windowRadius: 1, scoreNoise: 0.20, topK: 5,  lookahead: 0, delayMs: 200 },
  normal: { defenseWeight: 0.85, windowRadius: 2, scoreNoise: 0,    topK: 1,  lookahead: 0, delayMs: 280 },
  hard:   { defenseWeight: 1.10, windowRadius: 2, scoreNoise: 0,    topK: 12, lookahead: 2, delayMs: 500 }
};

function newBoard() {
  return Array.from({ length: N }, () => Array(N).fill(EMPTY));
}

// —— checkWin：抄自 index.html，board 显式传入 ——
function checkWin(board, r, c, who) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let k = 1; k < 5; k++) {
      const nr = r + dr * k, nc = c + dc * k;
      if (nr<0||nr>=N||nc<0||nc>=N||board[nr][nc]!==who) break;
      count++;
    }
    for (let k = 1; k < 5; k++) {
      const nr = r - dr * k, nc = c - dc * k;
      if (nr<0||nr>=N||nc<0||nc>=N||board[nr][nc]!==who) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
}

// —— scoreLineFor：逐字抄自 index.html ——
function scoreLineFor(line, who) {
  let s = 0;
  const opp = who === BLACK ? WHITE : BLACK;
  const str = line.map(x => x === who ? 'X' : x === opp ? 'O' : x === -1 ? 'B' : '.').join('');
  const patterns = [
    ['XXXXX', 100000],
    ['.XXXX.', 10000],
    ['.XXXX', 1000], ['XXXX.', 1000],
    ['XX.XX', 1000], ['X.XXX', 1000], ['XXX.X', 1000],
    ['.XXX.', 800],
    ['.XXX', 100], ['XXX.', 100],
    ['XX.X', 100], ['X.XX', 100],
    ['.XX.', 50],
    ['.X.X.', 30],
    ['.X.', 5]
  ];
  for (const [p, v] of patterns) {
    let i = str.indexOf(p);
    while (i !== -1) {
      s += v;
      i = str.indexOf(p, i + 1);
    }
  }
  return s;
}

// —— evaluatePoint：抄自 index.html，board 显式传入 ——
function evaluatePoint(board, r, c, who, defenseWeight) {
  const opp = who === BLACK ? WHITE : BLACK;
  let score = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const line = [];
    for (let k = -4; k <= 4; k++) {
      const nr = r + dr * k, nc = c + dc * k;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) line.push(-1);
      else line.push(board[nr][nc]);
    }
    line[4] = who;
    score += scoreLineFor(line, who);
    line[4] = opp;
    score += scoreLineFor(line, opp) * defenseWeight;
  }
  return score;
}

// —— getCandidates：抄自 index.html，board + moveCount 显式传入 ——
function getCandidates(board, moveCount, radius) {
  if (moveCount === 0) return [{ r: 7, c: 7 }];
  const out = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board[r][c] !== EMPTY) continue;
      let near = false;
      for (let dr = -radius; dr <= radius && !near; dr++)
        for (let dc = -radius; dc <= radius && !near; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr>=0 && nr<N && nc>=0 && nc<N && board[nr][nc] !== EMPTY) near = true;
        }
      if (near) out.push({ r, c });
    }
  }
  return out;
}

// —— pickAiMove：抄自 index.html。cfg/board/moveCount 显式传入，rng 可注入 ——
function pickAiMove(board, moveCount, ai, cfg, rng) {
  rng = rng || Math.random;
  const opp = ai === BLACK ? WHITE : BLACK;
  const cands = getCandidates(board, moveCount, cfg.windowRadius);
  if (cands.length === 0) return { r: 7, c: 7 };

  const scored = cands.map(({ r, c }) => {
    let s = evaluatePoint(board, r, c, ai, cfg.defenseWeight);
    if (cfg.scoreNoise > 0) s *= (1 + (rng() - 0.5) * cfg.scoreNoise * 2);
    return { r, c, s };
  });
  scored.sort((a, b) => b.s - a.s);

  // Easy: weighted random pick from top-K
  if (cfg.lookahead === 0 && cfg.topK > 1) {
    const top = scored.slice(0, Math.min(cfg.topK, scored.length));
    const minS = Math.min(...top.map(x => x.s));
    const weights = top.map(x => Math.max(1, x.s - minS + 50));
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = rng() * sum;
    for (let i = 0; i < top.length; i++) {
      r -= weights[i];
      if (r <= 0) return { r: top[i].r, c: top[i].c };
    }
    return { r: top[0].r, c: top[0].c };
  }

  // Normal: greedy top-1
  if (cfg.lookahead === 0) return { r: scored[0].r, c: scored[0].c };

  // Hard: 2-ply
  const top = scored.slice(0, Math.min(cfg.topK, scored.length));
  let best = top[0], bestVal = -Infinity;
  for (const cand of top) {
    board[cand.r][cand.c] = ai;
    let val;
    if (checkWin(board, cand.r, cand.c, ai)) {
      val = 1e9;
    } else {
      const oppCands = getCandidates(board, moveCount + 1, cfg.windowRadius);
      let oppBest = 0, oppWins = false;
      for (const oc of oppCands) {
        board[oc.r][oc.c] = opp;
        if (checkWin(board, oc.r, oc.c, opp)) { oppWins = true; board[oc.r][oc.c] = EMPTY; break; }
        board[oc.r][oc.c] = EMPTY;
        // FIX 变体：对手应招的威胁用「纯进攻分」(defenseWeight=0)，否则 evaluatePoint
        // 内含 defenseWeight×我方威胁，会让我方强手反被扣分（原 bug）。
        const FIX = process.env.GOMOKU_FIX || '0';
        const oppDW = (FIX === '0') ? cfg.defenseWeight : 0;
        const os = evaluatePoint(board, oc.r, oc.c, opp, oppDW);
        if (os > oppBest) oppBest = os;
      }
      const FIX2 = process.env.GOMOKU_FIX || '0';
      // 0=原版(buggy)  1=纯进攻oppBest+×defenseWeight  2=纯进攻oppBest+权重1.0
      const oppPenalty = (FIX2 === '2') ? oppBest : oppBest * cfg.defenseWeight;
      val = oppWins ? -1e8 : (cand.s - oppPenalty);
    }
    board[cand.r][cand.c] = EMPTY;
    if (val > bestVal) { bestVal = val; best = cand; }
  }
  return { r: best.r, c: best.c };
}

// —— 一局 AI vs AI。blackCfg 执黑（先手），whiteCfg 执白。返回 BLACK/WHITE/0(平局) ——
function playGame(blackCfg, whiteCfg, rng) {
  const board = newBoard();
  let turn = BLACK;
  let moveCount = 0;
  while (moveCount < N * N) {
    const cfg = turn === BLACK ? blackCfg : whiteCfg;
    const mv = pickAiMove(board, moveCount, turn, cfg, rng);
    // 防御性：若返回了占用格（理论上不会），找任意空格
    if (board[mv.r][mv.c] !== EMPTY) {
      let placed = false;
      for (let r = 0; r < N && !placed; r++)
        for (let c = 0; c < N && !placed; c++)
          if (board[r][c] === EMPTY) { mv.r = r; mv.c = c; placed = true; }
    }
    board[mv.r][mv.c] = turn;
    moveCount++;
    if (checkWin(board, mv.r, mv.c, turn)) return turn;
    turn = turn === BLACK ? WHITE : BLACK;
  }
  return 0; // 平局
}

// —— 一对：A vs B，交替先手 n 局。返回 A 的胜场/平局/总数 ——
function playMatch(cfgA, cfgB, n, rng) {
  let aWins = 0, bWins = 0, draws = 0;
  for (let i = 0; i < n; i++) {
    let winner;
    if (i % 2 === 0) {
      // A 执黑（先手）
      const w = playGame(cfgA, cfgB, rng);
      winner = w === BLACK ? 'A' : w === WHITE ? 'B' : 'D';
    } else {
      // B 执黑（先手），A 执白
      const w = playGame(cfgB, cfgA, rng);
      winner = w === BLACK ? 'B' : w === WHITE ? 'A' : 'D';
    }
    if (winner === 'A') aWins++;
    else if (winner === 'B') bWins++;
    else draws++;
  }
  return { aWins, bWins, draws, n };
}

function fmtRate(label, r) {
  // 胜率以非平局判定 + 平局算半场，给出 A 视角胜率
  const score = r.aWins + r.draws * 0.5;
  const rate = score / r.n;
  const se = Math.sqrt(rate * (1 - rate) / r.n);
  return label.padEnd(26) + (rate * 100).toFixed(1) + '% ± ' + (1.96 * se * 100).toFixed(1) +
    '%   (A ' + r.aWins + ' / B ' + r.bWins + ' / 平 ' + r.draws + ', n=' + r.n + ')';
}

// —— hard 单步耗时探针 ——
function timeHardStep(label, board, moveCount, reps) {
  const cfg = DIFFICULTY.hard;
  // 预热
  pickAiMove(board, moveCount, WHITE, cfg, Math.random);
  let worst = 0, total = 0;
  for (let i = 0; i < reps; i++) {
    const t0 = process.hrtime.bigint();
    pickAiMove(board, moveCount, WHITE, cfg, Math.random);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    worst = Math.max(worst, ms);
    total += ms;
  }
  console.log('  ' + label.padEnd(28) + '最坏 ' + worst.toFixed(1) + ' ms  / 均 ' + (total / reps).toFixed(1) + ' ms  (候选数=' + getCandidates(board, moveCount, cfg.windowRadius).length + ')');
}

function probe(n) {
  const rng = Math.random;
  console.log('== 五子棋难度梯子探针 == 每对 n=' + n + ' 局（交替先手）\n');

  console.log('-- 胜率（A 视角，平局计半场）--');
  console.log(fmtRate('sanity: normal vs normal', playMatch(DIFFICULTY.normal, DIFFICULTY.normal, n, rng)));
  console.log(fmtRate('hard vs normal', playMatch(DIFFICULTY.hard, DIFFICULTY.normal, n, rng)));
  console.log(fmtRate('normal vs easy', playMatch(DIFFICULTY.normal, DIFFICULTY.easy, n, rng)));
  console.log(fmtRate('hard vs easy', playMatch(DIFFICULTY.hard, DIFFICULTY.easy, n, rng)));

  console.log('\n-- hard（lookahead=2, topK=12）单步耗时 --');
  // 开局：空棋盘 → getCandidates 返回中心一点，几乎瞬时
  timeHardStep('开局（空棋盘）', newBoard(), 0, 20);

  // 中局：用 normal 自对弈跑出一个 ~30 手的真实局面
  const mid = newBoard();
  let turn = BLACK, mc = 0;
  while (mc < 30) {
    const mv = pickAiMove(mid, mc, turn, DIFFICULTY.normal, rng);
    mid[mv.r][mv.c] = turn; mc++;
    if (checkWin(mid, mv.r, mv.c, turn)) { break; }
    turn = turn === BLACK ? WHITE : BLACK;
  }
  timeHardStep('中局（约 ' + mc + ' 手后）', mid.map(row => row.slice()), mc, 20);

  // 更密集的中后期局面（~60 手）以看最坏情况
  const late = newBoard();
  turn = BLACK; mc = 0;
  while (mc < 60) {
    const mv = pickAiMove(late, mc, turn, DIFFICULTY.normal, rng);
    if (late[mv.r][mv.c] !== EMPTY) break;
    late[mv.r][mv.c] = turn; mc++;
    if (checkWin(late, mv.r, mv.c, turn)) { break; }
    turn = turn === BLACK ? WHITE : BLACK;
  }
  if (mc >= 40) timeHardStep('中后期（约 ' + mc + ' 手后）', late.map(row => row.slice()), mc, 20);
}

const cmd = process.argv[2] || 'probe';
if (cmd === 'probe') {
  probe(parseInt(process.argv[3], 10) || 60);
} else {
  console.log('未知命令。用法: node scripts/sim-gomoku.js probe [N]');
}
