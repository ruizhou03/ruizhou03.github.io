/* games-shell/chess-ai.js
 * 国际象棋 AI：material + PST 评估 + α-β negamax + quiescence + 迭代加深 + 置换表 + mini 开局库。
 * 在浏览器主线程或 Web Worker 都能用（dual export: window.ChessAI / self.ChessAI）。
 *
 * 依赖：chess.js（提供 Chess 类）。Worker 端 importScripts 同样的 chess.min.js 路径。
 *
 * 用法：const move = ChessAI.pickAiMove(chessJsGameInstance, cfg);
 * cfg = { depth, randomTopK, noise, useBook }
 */
(function (global) {
  'use strict';

  const FILES = ['a','b','c','d','e','f','g','h'];
  const RANKS = ['8','7','6','5','4','3','2','1'];

  const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  // Tomasz Michniewski simplified evaluation tables — white's POV, mirror for black.
  const PST = {
    p: [
       0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
       5,  5, 10, 25, 25, 10,  5,  5,
       0,  0,  0, 20, 20,  0,  0,  0,
       5, -5,-10,  0,  0,-10, -5,  5,
       5, 10, 10,-20,-20, 10, 10,  5,
       0,  0,  0,  0,  0,  0,  0,  0
    ],
    n: [
     -50,-40,-30,-30,-30,-30,-40,-50,
     -40,-20,  0,  0,  0,  0,-20,-40,
     -30,  0, 10, 15, 15, 10,  0,-30,
     -30,  5, 15, 20, 20, 15,  5,-30,
     -30,  0, 15, 20, 20, 15,  0,-30,
     -30,  5, 10, 15, 15, 10,  5,-30,
     -40,-20,  0,  5,  5,  0,-20,-40,
     -50,-40,-30,-30,-30,-30,-40,-50
    ],
    b: [
     -20,-10,-10,-10,-10,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5, 10, 10,  5,  0,-10,
     -10,  5,  5, 10, 10,  5,  5,-10,
     -10,  0, 10, 10, 10, 10,  0,-10,
     -10, 10, 10, 10, 10, 10, 10,-10,
     -10,  5,  0,  0,  0,  0,  5,-10,
     -20,-10,-10,-10,-10,-10,-10,-20
    ],
    r: [
       0,  0,  0,  0,  0,  0,  0,  0,
       5, 10, 10, 10, 10, 10, 10,  5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
       0,  0,  0,  5,  5,  0,  0,  0
    ],
    q: [
     -20,-10,-10, -5, -5,-10,-10,-20,
     -10,  0,  0,  0,  0,  0,  0,-10,
     -10,  0,  5,  5,  5,  5,  0,-10,
      -5,  0,  5,  5,  5,  5,  0, -5,
       0,  0,  5,  5,  5,  5,  0, -5,
     -10,  5,  5,  5,  5,  5,  0,-10,
     -10,  0,  5,  0,  0,  0,  0,-10,
     -20,-10,-10, -5, -5,-10,-10,-20
    ],
    k: [
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -30,-40,-40,-50,-50,-40,-40,-30,
     -20,-30,-30,-40,-40,-30,-30,-20,
     -10,-20,-20,-20,-20,-20,-20,-10,
      20, 20,  0,  0,  0,  0, 20, 20,
      20, 30, 10,  0,  0, 10, 30, 20
    ]
  };

  function squareIndex(sq) {
    const file = sq.charCodeAt(0) - 97;
    const rank = 8 - parseInt(sq[1], 10);
    return rank * 8 + file;
  }

  function pstScore(piece, color, sq) {
    const idx = squareIndex(sq);
    const tableIdx = color === 'w' ? idx : (idx ^ 56);
    return PST[piece][tableIdx];
  }

  // White-relative static evaluation (positive = good for white).
  function evaluateBoard(game) {
    if (game.in_checkmate()) return game.turn() === 'w' ? -1e6 : 1e6;
    if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition() || game.insufficient_material()) return 0;
    let score = 0;
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell) continue;
        const sq = FILES[f] + RANKS[r];
        const sign = cell.color === 'w' ? 1 : -1;
        score += sign * (PIECE_VALUE[cell.type] + pstScore(cell.type, cell.color, sq));
      }
    }
    return score;
  }

  // MVV-LVA ordering: captures (high-victim, low-attacker) first, then promotions, then checks.
  function moveOrderKey(m) {
    let k = 0;
    if (m.flags.indexOf('c') !== -1 || m.flags.indexOf('e') !== -1) {
      k += 10000 + PIECE_VALUE[m.captured || 'p'] * 10 - PIECE_VALUE[m.piece];
    }
    if (m.flags.indexOf('p') !== -1) k += 9000;
    if (m.flags.indexOf('k') !== -1 || m.flags.indexOf('q') !== -1) k += 100;
    return k;
  }

  // Position key for transposition table — strip halfmove/fullmove clocks (they don't affect
  // the searchable position, but vary across visits to the same node).
  function positionKey(game) {
    const parts = game.fen().split(' ');
    return parts.slice(0, 4).join(' ');
  }

  // TT flags: 0=EXACT (full window), 1=LOWERBOUND (β cutoff), 2=UPPERBOUND (failed low).
  const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;

  // Quiescence search: at horizon, extend only captures + promotions so the eval isn't
  // ambushed by tactical noise (e.g. seeing "won a queen" at depth 0 right before getting recaptured).
  // Hard cap at QMAX plies — tactical positions could otherwise chain ~10+ deep on every leaf.
  const QMAX = 6;
  function quiesce(game, alpha, beta, color, ply) {
    const standPat = color * evaluateBoard(game);
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    if (ply >= QMAX) return alpha;
    const moves = game.moves({ verbose: true })
      .filter(m => m.flags.indexOf('c') !== -1 || m.flags.indexOf('e') !== -1 || m.flags.indexOf('p') !== -1);
    moves.sort((a, b) => moveOrderKey(b) - moveOrderKey(a));
    for (const m of moves) {
      game.move(m);
      const score = -quiesce(game, -beta, -alpha, -color, ply + 1);
      game.undo();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(game, depth, alpha, beta, color, tt) {
    const alphaOrig = alpha;
    const key = tt ? positionKey(game) : null;
    if (tt && key) {
      const entry = tt.get(key);
      if (entry && entry.depth >= depth) {
        if (entry.flag === TT_EXACT) return { score: entry.score, move: entry.move };
        if (entry.flag === TT_LOWER && entry.score > alpha) alpha = entry.score;
        else if (entry.flag === TT_UPPER && entry.score < beta) beta = entry.score;
        if (alpha >= beta) return { score: entry.score, move: entry.move };
      }
    }

    if (game.game_over()) return { score: color * evaluateBoard(game), move: null };
    if (depth === 0) return { score: quiesce(game, alpha, beta, color, 0), move: null };

    const moves = game.moves({ verbose: true });
    moves.sort((a, b) => moveOrderKey(b) - moveOrderKey(a));
    let bestMove = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      game.move(m);
      const child = negamax(game, depth - 1, -beta, -alpha, -color, tt);
      const score = -child.score;
      game.undo();
      if (score > bestScore) { bestScore = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    if (tt && key) {
      let flag = TT_EXACT;
      if (bestScore <= alphaOrig) flag = TT_UPPER;
      else if (bestScore >= beta) flag = TT_LOWER;
      tt.set(key, { score: bestScore, depth, flag, move: bestMove });
      // Cap TT size to avoid unbounded memory growth (rare in a single move's search but defensive).
      if (tt.size > 200000) {
        const firstKey = tt.keys().next().value;
        tt.delete(firstKey);
      }
    }
    return { score: bestScore, move: bestMove };
  }

  // Mini opening book: hand-curated mainline responses to the first few plies.
  // Key = SAN move history joined by space (e.g. "e4 c5" → Sicilian). Empty key = first move.
  const OPENING_BOOK = {
    '': ['e4', 'e4', 'e4', 'd4', 'd4', 'Nf3', 'c4'],
    'e4': ['e5', 'c5', 'e5', 'c5', 'e6', 'c6', 'd5'],
    'e4 e5': ['Nf3', 'Nf3', 'Nc3', 'Bc4'],
    'e4 e5 Nf3': ['Nc6', 'Nc6', 'Nf6'],
    'e4 e5 Nf3 Nc6': ['Bb5', 'Bc4', 'd4'],
    'e4 c5': ['Nf3', 'Nc3', 'c3'],
    'e4 c5 Nf3': ['d6', 'Nc6', 'e6'],
    'e4 e6': ['d4', 'Nc3'],
    'e4 c6': ['d4', 'Nc3'],
    'e4 d5': ['exd5', 'Nc3'],
    'd4': ['d5', 'Nf6', 'd5', 'Nf6', 'f5'],
    'd4 d5': ['c4', 'Nf3', 'Bf4'],
    'd4 d5 c4': ['e6', 'c6', 'dxc4'],
    'd4 Nf6': ['c4', 'Nf3', 'Bg5'],
    'd4 Nf6 c4': ['e6', 'g6', 'c5'],
    'Nf3': ['Nf6', 'd5', 'g6'],
    'c4': ['e5', 'c5', 'Nf6', 'e6'],
  };

  function pickFromBook(game) {
    const history = game.history();
    const key = history.join(' ');
    const book = OPENING_BOOK[key];
    if (!book || !book.length) return null;
    // Pick uniformly at random from the array (entries can repeat to weight popular lines).
    const san = book[Math.floor(Math.random() * book.length)];
    const moves = game.moves({ verbose: true });
    return moves.find(m => m.san === san) || null;
  }

  function pickAiMove(game, cfg) {
    cfg = cfg || {};
    const depth = cfg.depth || 2;
    const randomTopK = cfg.randomTopK || 1;
    const noise = cfg.noise || 0;
    const useBook = cfg.useBook !== false;

    // 开局库优先
    if (useBook) {
      const bookMove = pickFromBook(game);
      if (bookMove) return bookMove;
    }

    const moves = game.moves({ verbose: true });
    if (!moves.length) return null;
    moves.sort((a, b) => moveOrderKey(b) - moveOrderKey(a));
    const colorSign = game.turn() === 'w' ? 1 : -1;
    const tt = new Map();

    // 迭代加深：从 1 ply 起逐步加深，每一次都让 TT 帮加速下一次。
    // 当 depth=1 时只跑一次（与原 easy 行为一致）。
    //
    // 根节点 α-β：siblings 之间共享 α 上界 → 一旦找到分数 S 的走法，后续兄弟节点
    // 用 (-Inf, -S) 搜索，烂走法会 fail-low 直接被剪掉。
    // 但 easy 模式（randomTopK>1 或 noise>0）要看所有走法的真实分数做加权抽样，
    // fail-low 给的是上界而不是精确分，所以这种模式回退到原来的全窗口搜索。
    const useRootAB = (randomTopK <= 1 && noise === 0);
    let scored = [];
    for (let d = 1; d <= depth; d++) {
      scored = [];
      let alpha = -Infinity;
      const beta = Infinity;
      for (const m of moves) {
        game.move(m);
        const searchAlpha = useRootAB ? alpha : -Infinity;
        const child = negamax(game, d - 1, -beta, -searchAlpha, -colorSign, tt);
        const score = -child.score;
        game.undo();
        scored.push({ move: m, score });
        if (useRootAB && score > alpha) alpha = score;
      }
      // 把上一轮的 best-first 反馈给下一轮的 move ordering（提高 α-β 剪枝命中率）
      scored.sort((a, b) => b.score - a.score);
      moves.length = 0;
      for (const s of scored) moves.push(s.move);
    }

    // 难度噪声（仅 easy 用）
    if (noise > 0) {
      scored = scored.map(s => ({
        move: s.move,
        score: s.score + (Math.random() - 0.5) * 2 * noise * Math.abs(s.score || 50),
      }));
      scored.sort((a, b) => b.score - a.score);
    }

    if (randomTopK > 1 && scored.length > 1) {
      const k = Math.min(randomTopK, scored.length);
      const top = scored.slice(0, k);
      const minS = Math.min(...top.map(x => x.score));
      const weights = top.map(x => Math.max(1, x.score - minS + 30));
      const sum = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * sum;
      for (let i = 0; i < top.length; i++) {
        r -= weights[i];
        if (r <= 0) return top[i].move;
      }
      return top[0].move;
    }
    return scored[0].move;
  }

  global.ChessAI = {
    PIECE_VALUE,
    PST,
    evaluateBoard,
    pickAiMove,
    pickFromBook,
  };
})(typeof self !== 'undefined' ? self : globalThis);
