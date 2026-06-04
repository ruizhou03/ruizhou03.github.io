(() => {
  // ============================================================
  // Core engine — kept in sync with /tmp/tiaoqi-core.js (tested separately)
  // ============================================================
  const ROWS = 17, COLS = 25;
  const DIRS = [
    [0, +2],   // 0 E
    [+1, +1],  // 1 SE
    [+1, -1],  // 2 SW
    [0, -2],   // 3 W
    [-1, -1],  // 4 NW
    [-1, +1],  // 5 NE
  ];

  const ROW_COLS = (() => {
    const m = {};
    m[0] = [12]; m[1] = [11, 13]; m[2] = [10, 12, 14]; m[3] = [9, 11, 13, 15];
    m[4] = []; for (let c = 0;  c <= 24; c += 2) m[4].push(c);
    m[5] = []; for (let c = 1;  c <= 23; c += 2) m[5].push(c);
    m[6] = []; for (let c = 2;  c <= 22; c += 2) m[6].push(c);
    m[7] = []; for (let c = 3;  c <= 21; c += 2) m[7].push(c);
    m[8] = []; for (let c = 4;  c <= 20; c += 2) m[8].push(c);
    m[9]  = []; for (let c = 3;  c <= 21; c += 2) m[9].push(c);
    m[10] = []; for (let c = 2;  c <= 22; c += 2) m[10].push(c);
    m[11] = []; for (let c = 1;  c <= 23; c += 2) m[11].push(c);
    m[12] = []; for (let c = 0;  c <= 24; c += 2) m[12].push(c);
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
    N:  { name: '北', arrow: '↑', cells: [[0,12],[1,11],[1,13],[2,10],[2,12],[2,14],[3,9],[3,11],[3,13],[3,15]],         goal: 'S',  color: '#e74c3c', label: '红' },
    NE: { name: '东北', arrow: '↗', cells: [[4,18],[4,20],[4,22],[4,24],[5,19],[5,21],[5,23],[6,20],[6,22],[7,21]],       goal: 'SW', color: '#f39c12', label: '橙' },
    SE: { name: '东南', arrow: '↘', cells: [[9,21],[10,20],[10,22],[11,19],[11,21],[11,23],[12,18],[12,20],[12,22],[12,24]], goal: 'NW', color: '#27ae60', label: '绿' },
    S:  { name: '南', arrow: '↓', cells: [[13,9],[13,11],[13,13],[13,15],[14,10],[14,12],[14,14],[15,11],[15,13],[16,12]], goal: 'N',  color: '#2980b9', label: '蓝' },
    SW: { name: '西南', arrow: '↙', cells: [[9,3],[10,2],[10,4],[11,1],[11,3],[11,5],[12,0],[12,2],[12,4],[12,6]],         goal: 'NE', color: '#8e44ad', label: '紫' },
    NW: { name: '西北', arrow: '↖', cells: [[4,0],[4,2],[4,4],[4,6],[5,1],[5,3],[5,5],[6,2],[6,4],[7,3]],                  goal: 'SE', color: '#16a085', label: '青' },
  };
  const CORNER_KEYS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

  // Quick lookup: which corner's start triangle does (r,c) belong to (or null)
  const CELL_TRIANGLE = (() => {
    const m = {};
    for (const ck of CORNER_KEYS) for (const [r, c] of CORNERS[ck].cells) m[r*100+c] = ck;
    return m;
  })();

  function key(r, c) { return r * 100 + c; }
  function fromKey(k) { return [Math.floor(k / 100), k % 100]; }
  function hexDist(r1, c1, r2, c2) {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
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

  // 6 hex-neighbor empty cells from (r, c) — 1-step walks.
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

  // Long-jump rule (传统中式跳棋): from (r,c) along each hex direction, find the
  // first piece (the "screen") at some distance k≥1 with all cells before it
  // empty; the landing is the cell at distance 2k (the "mirror" point). All
  // cells between screen and landing must be empty, and the landing must be
  // empty. Returns landing cells reachable in exactly ONE hop (no chaining).
  function singleJumpDestinations(board, r, c) {
    const out = [];
    for (const [dr, dc] of DIRS) {
      let k = 1;
      let mr = r + dr, mc = c + dc;
      while (isValid(mr, mc) && board[key(mr, mc)] === null) {
        k++;
        mr = r + dr * k;
        mc = c + dc * k;
      }
      if (!isValid(mr, mc)) continue;        // no screen on this line
      const tr = r + dr * 2 * k;
      const tc = c + dc * 2 * k;
      if (!isValid(tr, tc)) continue;
      let blocked = false;
      for (let j = k + 1; j < 2 * k; j++) {
        const ir = r + dr * j;
        const ic = c + dc * j;
        if (!isValid(ir, ic) || board[key(ir, ic)] !== null) { blocked = true; break; }
      }
      if (blocked) continue;
      if (board[key(tr, tc)] !== null) continue;
      out.push([tr, tc]);
    }
    return out;
  }

  // Chain-hop BFS with parent tracking. Returns [{to:[r,c], path:[[r,c], ...]}]
  // where `path` is the ordered list of intermediate landings starting from the
  // first hop (excluding the original start cell). path.length === 1 means a
  // single hop; path.length ≥ 2 means a multi-hop chain.
  // The piece at (r, c) is treated as "in transit" — temporarily ghosted from
  // the board so chain searches can pass back through its origin.
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
        const path = [];
        let curK = tk;
        while (curK !== startK) {
          path.unshift(fromKey(curK));
          curK = parent.get(curK);
        }
        out.push({ to: [tr, tc], path });
        frontier.push([tr, tc]);
      }
    }
    board[startK] = piece;
    return out;
  }

  // All legal moves for `player`. Each move carries a `path` field (the sequence
  // of intermediate landings, length ≥ 1). Used by AI search and for end-of-game
  // "any legal move?" checks. The human UI does NOT call this — it uses the per-
  // piece helpers (stepDestinations + singleJumpDestinations) to build its own
  // step-by-step interaction.
  function legalMoves(board, player) {
    const out = [];
    for (const k in board) {
      if (board[k] !== player) continue;
      const [r, c] = fromKey(parseInt(k, 10));
      for (const [tr, tc] of stepDestinations(board, r, c)) {
        out.push({ from: [r, c], to: [tr, tc], hop: false, path: [[tr, tc]] });
      }
      for (const { to, path } of hopPaths(board, r, c)) {
        out.push({ from: [r, c], to, hop: true, path });
      }
    }
    return out;
  }

  function makeMove(board, m) {
    const fk = key(m.from[0], m.from[1]);
    const tk = key(m.to[0], m.to[1]);
    const piece = board[fk];
    board[fk] = null;
    board[tk] = piece;
    return { fk, tk, piece };
  }
  function undoMove(board, u) {
    board[u.tk] = null;
    board[u.fk] = u.piece;
  }

  function hasWon(board, player) {
    const goalCells = CORNERS[CORNERS[player].goal].cells;
    let mineInGoal = 0;
    for (const [r, c] of goalCells) if (board[key(r, c)] === player) mineInGoal++;
    if (mineInGoal !== 10) return false;
    let total = 0;
    for (const k in board) if (board[k] === player) total++;
    return total === 10;
  }

  function distanceScore(board, player) {
    const goalCells = CORNERS[CORNERS[player].goal].cells;
    let sum = 0;
    for (const k in board) {
      if (board[k] !== player) continue;
      const [r, c] = fromKey(parseInt(k, 10));
      let best = Infinity;
      for (const [gr, gc] of goalCells) {
        const d = hexDist(r, c, gr, gc);
        if (d < best) best = d;
      }
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
  function evalForPlayer(board, player) {
    return -distanceScore(board, player) * 10 + inGoalCount(board, player) * 1000 - inStartCount(board, player) * 50;
  }

  function maxThreatToPlayer(board, players, aiIdx) {
    const aiPlayer = players[aiIdx];
    const baseScore = evalForPlayer(board, aiPlayer);
    let worst = baseScore;
    for (let i = 0; i < players.length; i++) {
      if (i === aiIdx) continue;
      const moves = legalMoves(board, players[i]);
      if (moves.length === 0) continue;
      let lowest = baseScore;
      for (let j = 0; j < Math.min(moves.length, 8); j++) {
        const u = makeMove(board, moves[j]);
        const v = evalForPlayer(board, aiPlayer);
        undoMove(board, u);
        if (v < lowest) lowest = v;
      }
      if (lowest < worst) worst = lowest;
    }
    return worst;
  }
  // α-β minimax（2 人）。depth = 还要展开的 ply 数；toMove = 当前轮到谁。
  // 叶子返回「ai 视角」的净分差。用法：AI 在根节点走完一步后，调
  // minimax2p(board, opp, ai, opp, plies, …) 让对手最优应招——plies=1 即
  // 「我走一步 + 对手最优回应」的真 depth-2 前瞻（探针实测 100% 胜纯贪心）。
  // 注：旧版用 (depth%2) 推断该谁走，初始 depth=1 时误判成 ai 再走一步、
  // 完全没算对手回应，导致「困难」实际≈贪心；此处改为显式传 toMove 修正。
  function minimax2p(board, toMove, ai, opp, depth, alpha, beta) {
    if (depth === 0 || hasWon(board, ai) || hasWon(board, opp)) {
      return evalForPlayer(board, ai) - evalForPlayer(board, opp);
    }
    const moves = legalMoves(board, toMove);
    if (moves.length === 0) return evalForPlayer(board, ai) - evalForPlayer(board, opp);
    const next = (toMove === ai) ? opp : ai;
    if (toMove === ai) {
      let best = -Infinity;
      for (const m of moves) {
        const u = makeMove(board, m);
        const v = minimax2p(board, next, ai, opp, depth - 1, alpha, beta);
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
        const v = minimax2p(board, next, ai, opp, depth - 1, alpha, beta);
        undoMove(board, u);
        if (v < best) best = v;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return best;
    }
  }
  function pickAiMove(board, players, aiIdx, cfg) {
    const ai = players[aiIdx];
    const moves = legalMoves(board, ai);
    if (moves.length === 0) return null;
    const isTwoPlayer = players.length === 2;
    const opp = isTwoPlayer ? players[1 - aiIdx] : null;

    const scored = moves.map(m => {
      const u = makeMove(board, m);
      let score = evalForPlayer(board, ai);
      if (cfg.difficulty === 'hard') {
        if (isTwoPlayer) {
          // 真 depth-2：我已走这步，让对手最优应招后再评估（plies=1）。
          score = minimax2p(board, opp, ai, opp, 1, -Infinity, Infinity);
        } else {
          score = 0.6 * score + 0.4 * maxThreatToPlayer(board, players, aiIdx);
        }
      }
      undoMove(board, u);
      return { move: m, score };
    });
    scored.sort((a, b) => b.score - a.score);

    if (cfg.difficulty === 'easy') {
      const k = Math.min(5, scored.length);
      const top = scored.slice(0, k);
      for (const t of top) t.score *= (1 + (Math.random() - 0.5) * 0.5);
      top.sort((a, b) => b.score - a.score);
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

  // ============================================================
  // SVG geometry & rendering
  // ============================================================
  const SVG_W = 660, SVG_H = 753, MARGIN = 30;
  const UNIT_X = (SVG_W - MARGIN * 2) / 24;       // 25
  const UNIT_Y = (SVG_H - MARGIN * 2) / 16;       // 43.3
  const CELL_R = 18, PIECE_R = 16;
  function svgX(c) { return MARGIN + c * UNIT_X; }
  function svgY(r) { return MARGIN + r * UNIT_Y; }

  // Lighten hex color: blend with white at given alpha.
  function lighten(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.round(r + (255 - r) * (1 - alpha));
    const lg = Math.round(g + (255 - g) * (1 - alpha));
    const lb = Math.round(b + (255 - b) * (1 - alpha));
    return '#' + [lr, lg, lb].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ============================================================
  // State
  // ============================================================
  const STORE_KEY = 'tool.tiaoqi.v1';
  const stored = (() => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } })();
  const DIFFICULTY = {
    easy:   { difficulty: 'easy',   delayMs: 250 },
    normal: { difficulty: 'normal', delayMs: 380 },
    hard:   { difficulty: 'hard',   delayMs: 500 },
  };
  const TQ_DIFF_LABEL = { easy: '简单', normal: '普通', hard: '困难' };

  // setupConfig: { N: 'empty'|'human'|'ai'|'remote', NE: ..., ... }
  function defaultSetup() { return { N: 'human', NE: 'empty', SE: 'empty', S: 'human', SW: 'empty', NW: 'empty' }; }
  // Per-base AI difficulty (each robot seat has its own).
  function defaultAiDiff() { const o = {}; for (const ck of CORNER_KEYS) o[ck] = 'normal'; return o; }
  function aiDiffOf(corner) { return (state.aiDiff && state.aiDiff[corner]) || 'normal'; }

  const state = {
    setupConfig: stored.setupConfig || defaultSetup(),
    aiDiff: stored.aiDiff || defaultAiDiff(),
    difficulty: DIFFICULTY[stored.difficulty] ? stored.difficulty : 'normal',
    // Active game state (populated when a game starts):
    started: false,
    players: [],          // ordered list of corner keys in turn order (clockwise from N)
    playerKinds: {},      // corner → 'human'|'ai'
    board: null,
    turnIdx: 0,           // index into players array
    selected: null,       // [r, c] of the piece the human is operating on
    legalTargets: [],     // each: {to:[r,c], kind:'step'|'jump'} for the selected/chain piece
    chainPiece: null,     // [r, c] — set during a multi-hop chain (after the first jump)
    chainStartFrom: null, // [r, c] — original position before the chain began
    lastTrail: null,        // {color, cells:[[r,c]…]} — most recent committed chain (start + every landing) by ANY player; rendered faded; persists until next player commits a new move
    history: [],          // [{undo, prevTurnIdx}]
    aiThinking: false,
    paused: false,
    over: false,
    winner: null,
    finalRanking: [],     // [{player, distance}], sorted best→worst
    lastMove: null,
  };

  // DOM refs
  const gameControls = document.getElementById('tqGameControls');
  const turnEl = document.getElementById('tqTurn');
  const rosterEl = document.getElementById('tqRoster');
  const svg = document.getElementById('tqSvg');
  const overlay = document.getElementById('tqOverlay');
  const ovTitle = document.getElementById('tqOvTitle');
  const ovRanking = document.getElementById('tqOvRanking');
  const ovBtn = document.getElementById('tqOvBtn');
  const pausedOverlay = document.getElementById('tqPausedOverlay');
  const resumeBtn = document.getElementById('tqResumeBtn');
  const undoBtn = document.getElementById('tqUndoBtn');
  const pauseBtn = document.getElementById('tqPauseBtn');
  const newBtn = document.getElementById('tqNewBtn');
  const endChainBtn = document.getElementById('tqEndChainBtn');

  function persist() {
    localStorage.setItem(STORE_KEY, JSON.stringify({ setupConfig: state.setupConfig, aiDiff: state.aiDiff, difficulty: state.difficulty }));
  }

  // ============================================================
  // Setup: tap a territory on the board to cycle 空 → 人类 → AI.
  // Seat state is drawn as corner-tip badges inside the SVG (see renderBoard);
  // the centered card holds mode/difficulty/start.
  // ============================================================
  // Re-render the setup/lobby overlay (seat cards + top-bar start). Seat config
  // now lives on the HTML lobby cards (#tqLobby), not on SVG badges.
  function refreshSetupControls() {
    if (state.started) return;
    if (typeof tqRenderLobby === 'function') tqRenderLobby();
  }

  // ============================================================
  // Game lifecycle
  // ============================================================
  function startGame() {
    // Build players list in turn order: clockwise from N skipping empty
    state.players = [];
    state.playerKinds = {};
    for (const ck of CORNER_KEYS) {
      // Online pre-maps a seated 联机真人 to 'human'; only human/ai seats play.
      if (state.setupConfig[ck] === 'human' || state.setupConfig[ck] === 'ai') {
        state.players.push(ck);
        state.playerKinds[ck] = state.setupConfig[ck];
      }
    }
    // Representative difficulty for the vs-AI leaderboard = the hardest AI seat.
    const dord = { easy: 0, normal: 1, hard: 2 };
    const aiDiffs = state.players.filter(c => state.playerKinds[c] === 'ai').map(aiDiffOf);
    if (aiDiffs.length) state.difficulty = aiDiffs.reduce((a, b) => dord[b] > dord[a] ? b : a);
    state.board = startingBoard(state.players);
    state.turnIdx = 0;
    state.selected = null;
    state.legalTargets = [];
    state.chainPiece = null;
    state.chainStartFrom = null;
    state.lastTrail = null;
    state.history = [];
    state.aiThinking = false;
    state.paused = false;
    state.over = false;
    state.winner = null;
    state.finalRanking = [];
    state.lastMove = null;
    state.started = true;
    gameControls.hidden = false;
    rosterEl.hidden = false;
    overlay.classList.remove('show');
    pausedOverlay.classList.remove('show');
    tqHideLobby();
    tqRunStartedAt = Date.now();
    tqRunNonce = (window.GamesShell && GamesShell.Identity.newRunNonce()) || ('r-' + Date.now());
    tqLastResult = null;
    if (typeof tqSettleBtn !== 'undefined' && tqSettleBtn) tqSettleBtn.setEnabled(false);
    pauseBtn.hidden = (typeof tqOnline !== 'undefined' && tqOnline.active()) || !Object.values(state.playerKinds).includes('ai');
    renderBoard();
    updateStatus();
    maybeTriggerAi(320);
    if (typeof tqPumpRemote === 'function') tqPumpRemote();
  }

  function backToSetup() {
    state.started = false;
    state.aiThinking = false;
    state.players = [];
    state.playerKinds = {};
    state.board = null;
    state.history = [];
    state.lastMove = null;
    state.over = false;
    state.winner = null;
    state.selected = null;
    state.legalTargets = [];
    state.chainPiece = null;
    state.chainStartFrom = null;
    state.lastTrail = null;
    gameControls.hidden = true;
    rosterEl.hidden = true;
    overlay.classList.remove('show');
    pausedOverlay.classList.remove('show');
    if (typeof tqOnline !== 'undefined' && tqOnline.active()) tqOnline.leave();
    if (typeof tqSave !== 'undefined' && tqSave) tqSave.discard();
    refreshSetupControls();
    renderBoard();
    updateStatus();
  }

  function currentPlayer() { return state.players[state.turnIdx]; }
  function currentKindIsAi() { return state.playerKinds[currentPlayer()] === 'ai'; }
  function nextTurn() { state.turnIdx = (state.turnIdx + 1) % state.players.length; }

  function updateStatus() {
    let label;
    if (!state.started) {
      const activeCount = Object.values(state.setupConfig).filter(v => v !== 'empty').length;
      label = activeCount < 2
        ? '— 请配置玩家（至少 2 角）—'
        : `— 请配置玩家（${activeCount} 人，可继续调整）—`;
    } else if (state.paused) {
      label = '⏸ 已暂停';
    } else if (state.over) {
      const winC = state.winner;
      label = winC
        ? `🎉 ${CORNERS[winC].label}方（${CORNERS[winC].name}角）胜！`
        : '— 游戏结束 —';
    } else if (state.aiThinking) {
      label = '🤖 AI 思考中…';
    } else if (state.chainPiece) {
      const p = currentPlayer();
      const c = CORNERS[p];
      label = `<span class="swatch" style="background:${c.color}"></span>${c.label}方连跳中——继续点目标格，或点「✓ 结束跳跃」`;
    } else {
      const p = currentPlayer();
      const c = CORNERS[p];
      label = `轮到 <span class="swatch" style="background:${c.color}"></span>${c.label}方（${c.name}角）`;
    }
    turnEl.innerHTML = label;

    // Roster
    rosterEl.innerHTML = '';
    state.players.forEach((p, i) => {
      const c = CORNERS[p];
      const item = document.createElement('span');
      item.className = 'item';
      if (!state.over && i === state.turnIdx) item.classList.add('is-current');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = c.color;
      const txt = document.createElement('span');
      const kind = state.playerKinds[p];
      txt.textContent = c.label + (kind === 'ai' ? ' 🤖' : ' 👤');
      item.appendChild(sw);
      item.appendChild(txt);
      rosterEl.appendChild(item);
    });

    undoBtn.disabled = state.history.length === 0 || state.aiThinking || state.paused || state.over || !!state.chainPiece;
    pauseBtn.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    pauseBtn.disabled = state.over || !Object.values(state.playerKinds).includes('ai') || !!state.chainPiece;
    pausedOverlay.classList.toggle('show', state.paused && !state.over);
    endChainBtn.hidden = !state.chainPiece;
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Determine which corners are "active" (visually tinted as starting triangles +
  // get preview/real pieces). In game mode this is state.players; in config mode
  // it derives from state.setupConfig.
  function activeCornerSet() {
    if (state.started) return new Set(state.players);
    // In an online lobby the live seat config lives in tqOnline (net.seats),
    // not state.setupConfig — read it so the SVG frames track the actual seats.
    if (tqOnline.active() && tqOnline.seatMap) {
      const seats = tqOnline.seatMap() || {};
      return new Set(CORNER_KEYS.filter(c => seats[c] && seats[c].kind !== 'empty'));
    }
    return new Set(CORNER_KEYS.filter(c => state.setupConfig[c] !== 'empty'));
  }

  function renderBoard() {
    svg.innerHTML = '';
    const activeCorners = activeCornerSet();

    // Layer 1: cell backgrounds (with starting-triangle tints for active corners)
    const bgGroup = svgEl('g', { class: 'cells' });
    for (let r = 0; r < ROWS; r++) {
      for (const c of ROW_COLS[r]) {
        const tri = CELL_TRIANGLE[key(r, c)];
        let fill = '#f5e6c8';
        if (tri && activeCorners.has(tri)) {
          fill = lighten(CORNERS[tri].color, 0.18);
        } else if (tri) {
          fill = '#ece2cd';
        }
        bgGroup.appendChild(svgEl('circle', {
          class: 'cell-bg',
          cx: svgX(c), cy: svgY(r), r: CELL_R, fill,
        }));
      }
    }
    svg.appendChild(bgGroup);

    // Layer 1b: setup-mode base frames — outline each home base by its TRIANGLE
    // shape (not a rectangle): solid colour when a player sits there, dashed grey
    // when empty. The HTML config card floats inside the framed triangle.
    if (!state.started) drawBaseFrames(activeCorners);

    // Layer 2: last-move halos (game mode only)
    if (state.started && state.lastMove) {
      const halo = svgEl('g');
      for (const sq of [state.lastMove.from, state.lastMove.to]) {
        halo.appendChild(svgEl('circle', { class: 'last-mark', cx: svgX(sq[1]), cy: svgY(sq[0]), r: CELL_R + 4 }));
      }
      svg.appendChild(halo);
    }

    // Layer 2b: most-recent chain trail — faded ghost-pieces at every cell the
    // most recent chain-hopping piece (any player) passed through (start + each
    // landing). Persists from one player's commit until the next player commits
    // their own move, so opponents can re-read the move at leisure.
    if (state.started && state.lastTrail) {
      const trail = svgEl('g');
      for (const [tr, tc] of state.lastTrail.cells) {
        trail.appendChild(svgEl('circle', {
          class: 'ai-trail',
          cx: svgX(tc), cy: svgY(tr),
          r: PIECE_R,
          fill: state.lastTrail.color,
        }));
      }
      svg.appendChild(trail);
    }

    // Layer 3: pieces. In game mode use state.board; in config mode show a preview
    // built from setupConfig (each non-empty corner has its 10 starting pieces).
    const pcs = svgEl('g', { class: 'pieces' });
    // During setup the home triangles stay clear (just tinted) so the config
    // cards read cleanly; marbles appear once play starts.
    const previewBoard = state.started ? state.board : {};
    for (const k in previewBoard) {
      const owner = previewBoard[k];
      if (!owner) continue;
      const [r, c] = fromKey(parseInt(k, 10));
      const cls = ['piece'];
      if (state.started && state.selected && state.selected[0] === r && state.selected[1] === c) cls.push('selected');
      pcs.appendChild(svgEl('circle', {
        class: cls.join(' '),
        cx: svgX(c), cy: svgY(r), r: PIECE_R,
        fill: CORNERS[owner].color,
      }));
    }
    svg.appendChild(pcs);

    // Layer 4: target dots (legalTargets contains {to, kind} where kind='step'|'jump')
    if (state.legalTargets.length > 0) {
      const dots = svgEl('g');
      for (const t of state.legalTargets) {
        const isHop = t.kind === 'jump';
        dots.appendChild(svgEl('circle', {
          class: 'target-dot' + (isHop ? ' hop' : ''),
          cx: svgX(t.to[1]), cy: svgY(t.to[0]),
          r: isHop ? 9 : 6,
        }));
      }
      svg.appendChild(dots);
    }

    // Layer 5: invisible click hit-targets
    const hits = svgEl('g');
    for (let r = 0; r < ROWS; r++) {
      for (const c of ROW_COLS[r]) {
        hits.appendChild(svgEl('circle', {
          class: 'cell-hit',
          cx: svgX(c), cy: svgY(r), r: CELL_R + 2,
          'data-row': r, 'data-col': c,
        }));
      }
    }
    svg.appendChild(hits);

    // Setup-mode seat config is handled by the HTML lobby cards (#tqLobby),
    // not by SVG corner badges.
  }

  // The 3 outer cells of each home triangle (tip + the two base ends).
  const TRI_VERTS = {
    N:  [[0, 12], [3, 9], [3, 15]],
    S:  [[16, 12], [13, 9], [13, 15]],
    NE: [[4, 24], [4, 18], [7, 21]],
    NW: [[4, 0], [4, 6], [7, 3]],
    SE: [[12, 24], [12, 18], [9, 21]],
    SW: [[12, 0], [12, 6], [9, 3]],
  };
  // Rounded-triangle path = Minkowski sum of the 3-vertex home triangle with a
  // disk of radius `pad`: every straight edge is pushed outward by pad (so it
  // clears the marbles on that edge), and each corner becomes a pad-radius arc
  // centred on the corner cell. That rounds the three spikes off *around the
  // corner grid points* instead of ending in sharp points, and the offset edges
  // fully enclose the 10 base marbles.
  function roundedTriPath(verts, pad) {
    const cx = (verts[0][0] + verts[1][0] + verts[2][0]) / 3;
    const cy = (verts[0][1] + verts[1][1] + verts[2][1]) / 3;
    // Shoelace in SVG (y-down) coords: >0 ⇒ clockwise on screen ⇒ the outward
    // corner arcs sweep clockwise (SVG sweep-flag 1); <0 ⇒ flag 0.
    let area = 0;
    for (let i = 0; i < 3; i++) { const a = verts[i], b = verts[(i + 1) % 3]; area += a[0] * b[1] - b[0] * a[1]; }
    const sweep = area > 0 ? 1 : 0;
    // Per edge: outward unit normal (flipped to always point away from centroid).
    const edges = verts.map((a, i) => {
      const b = verts[(i + 1) % 3];
      let nx = -(b[1] - a[1]), ny = (b[0] - a[0]);
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if ((mx + nx - cx) ** 2 + (my + ny - cy) ** 2 < (mx - cx) ** 2 + (my - cy) ** 2) { nx = -nx; ny = -ny; }
      return { a, b, nx, ny };
    });
    let d = '';
    for (let i = 0; i < 3; i++) {
      const e = edges[i], next = edges[(i + 1) % 3];
      const sx = e.a[0] + pad * e.nx, sy = e.a[1] + pad * e.ny;
      const ex = e.b[0] + pad * e.nx, ey = e.b[1] + pad * e.ny;
      const nsx = next.a[0] + pad * next.nx, nsy = next.a[1] + pad * next.ny;
      if (i === 0) d += `M ${sx.toFixed(1)} ${sy.toFixed(1)} `;
      d += `L ${ex.toFixed(1)} ${ey.toFixed(1)} A ${pad} ${pad} 0 0 ${sweep} ${nsx.toFixed(1)} ${nsy.toFixed(1)} `;
    }
    return d + 'Z';
  }

  // Setup-mode online seats can be highlighted: 'me' = your own joined seat,
  // 'sel' = the seat the host has picked to swap. Rendered on the SVG frame so
  // it reads as a glow on the whole base, never a floating rectangle.
  function cornerHighlight(ck) {
    if (state.started) return null;
    return (tqOnline.active() && tqOnline.highlightFor) ? tqOnline.highlightFor(ck) : null;
  }

  // Frame each home base with a rounded triangle that doubles as the config
  // card's backdrop: a near-opaque white fill (the 底框, covering the whole
  // base) plus the team-colour border — dashed grey when the seat is empty.
  function drawBaseFrames(activeCorners) {
    const g = svgEl('g', { class: 'base-frames' });
    // pad clears the base marbles (r=18) with a hair of margin but stops short
    // of the next board-cell row outside the base (its rim sits ~25px out).
    const PAD = 21;
    for (const ck of CORNER_KEYS) {
      const verts = TRI_VERTS[ck].map(([r, c]) => [svgX(c), svgY(r)]);
      const d = roundedTriPath(verts, PAD);
      const active = activeCorners.has(ck);
      const color = CORNERS[ck].color;
      g.appendChild(svgEl('path', {
        d,
        fill: active ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.42)',
        stroke: active ? color : '#b09a78',
        'stroke-width': active ? 3 : 2,
        'stroke-linejoin': 'round',
        'stroke-dasharray': active ? 'none' : '6 5',
      }));
      const hl = cornerHighlight(ck);
      if (hl) {
        g.appendChild(svgEl('path', {
          d, fill: 'none',
          stroke: '#e5b500',
          'stroke-width': hl === 'sel' ? 5 : 3.5,
          'stroke-linejoin': 'round',
          'stroke-opacity': hl === 'sel' ? 0.95 : 0.6,
        }));
      }
    }
    svg.appendChild(g);
  }

  // ============================================================
  // Actions
  // ============================================================
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Show step + single-jump destinations for the human's selected piece.
  function computeHumanTargets(board, r, c) {
    const out = [];
    for (const [tr, tc] of stepDestinations(board, r, c)) out.push({ to: [tr, tc], kind: 'step' });
    for (const [tr, tc] of singleJumpDestinations(board, r, c)) out.push({ to: [tr, tc], kind: 'jump' });
    return out;
  }

  // End-of-turn bookkeeping shared by step move, single hop, full chain. Pushes
  // one history entry covering the whole turn (originalFrom → finalTo, no captures
  // since long-jump doesn't take pieces), runs the win check, hands off the turn.
  function commitTurn(originalFrom, finalTo, piece) {
    // Trails of length < 3 (a step or single jump) duplicate the lastMove halo
    // and add no new info — drop them so the only persistent trails on screen
    // are real chains (≥ 2 hops).
    if (state.lastTrail && state.lastTrail.cells.length < 3) state.lastTrail = null;
    const fk = key(originalFrom[0], originalFrom[1]);
    const tk = key(finalTo[0], finalTo[1]);
    state.history.push({
      undo: { fk, tk, piece, captured: null, movingPiece: piece, from: originalFrom.slice(), to: finalTo.slice() },
      prevTurnIdx: state.turnIdx
    });
    state.lastMove = { from: originalFrom.slice(), to: finalTo.slice() };
    state.selected = null;
    state.legalTargets = [];
    state.chainPiece = null;
    state.chainStartFrom = null;
    state.lastTrail = null;
    endChainBtn.hidden = true;
    const cur = currentPlayer();
    // Online: the controlling client broadcasts this completed move so others replay it.
    if (typeof tqEmitMove === 'function') tqEmitMove(cur, originalFrom, finalTo);
    if (hasWon(state.board, cur)) {
      state.over = true;
      state.winner = cur;
      computeFinalRanking();
      finishGame();
      renderBoard();
      updateStatus();
      if (typeof tqAfterTurnResolved === 'function') tqAfterTurnResolved();
      return;
    }
    nextTurn();
    renderBoard();
    updateStatus();
    if (typeof maybeTriggerAi === 'function') maybeTriggerAi(100);
    if (typeof tqAfterTurnResolved === 'function') tqAfterTurnResolved();
  }

  // Human single-step (1-cell walk). Fully commits the turn.
  // Step moves don't generate a trail (lastMove halo is enough), so the
  // previous player's trail is dropped here.
  function applyHumanStep(from, to) {
    state.lastTrail = null;
    tqMovePath = [to.slice()];
    const fromK = key(from[0], from[1]);
    const piece = state.board[fromK];
    state.board[fromK] = null;
    state.board[key(to[0], to[1])] = piece;
    commitTurn(from, to, piece);
  }

  // Human first hop: moves the piece, then either auto-commits (no further hops)
  // or enters CHAIN mode (more hops available). Builds a tentative trail
  // [from, to] which grows on each subsequent chain hop. commitTurn discards
  // it if the final length is < 3 (i.e. just a single jump).
  function applyHumanFirstHop(from, to) {
    const fromK = key(from[0], from[1]);
    const piece = state.board[fromK];
    tqMovePath = [to.slice()];
    state.lastTrail = { color: CORNERS[piece].color, cells: [from.slice(), to.slice()] };
    state.board[fromK] = null;
    state.board[key(to[0], to[1])] = piece;
    state.lastMove = { from: from.slice(), to: to.slice() };
    state.chainStartFrom = from.slice();
    state.chainPiece = to.slice();
    state.selected = to.slice();
    const nextHops = singleJumpDestinations(state.board, to[0], to[1]);
    if (nextHops.length === 0) {
      commitTurn(state.chainStartFrom, state.chainPiece, piece);
    } else {
      state.legalTargets = nextHops.map(([tr, tc]) => ({ to: [tr, tc], kind: 'jump' }));
      endChainBtn.hidden = false;
      renderBoard();
      updateStatus();
    }
  }

  // Human chain hop: piece is already in CHAIN mode (chainPiece set). Hops to
  // the new cell, then either continues CHAIN or auto-commits. Each chain hop
  // grows the trail (started in applyHumanFirstHop) by pushing the new landing.
  function applyHumanChainHop(to) {
    const cp = state.chainPiece;
    const fromK = key(cp[0], cp[1]);
    const piece = state.board[fromK];
    state.board[fromK] = null;
    state.board[key(to[0], to[1])] = piece;
    state.lastMove = { from: cp.slice(), to: to.slice() };
    if (tqMovePath) tqMovePath.push(to.slice());
    if (state.lastTrail) state.lastTrail.cells.push(to.slice());
    state.chainPiece = to.slice();
    state.selected = to.slice();
    const nextHops = singleJumpDestinations(state.board, to[0], to[1]);
    if (nextHops.length === 0) {
      commitTurn(state.chainStartFrom, state.chainPiece, piece);
    } else {
      state.legalTargets = nextHops.map(([tr, tc]) => ({ to: [tr, tc], kind: 'jump' }));
      renderBoard();
      updateStatus();
    }
  }

  // Manually end a chain (button or click chain piece). Commits at current chain pos.
  function commitChain() {
    if (!state.chainPiece || !state.chainStartFrom) return;
    const piece = state.board[key(state.chainPiece[0], state.chainPiece[1])];
    commitTurn(state.chainStartFrom, state.chainPiece, piece);
  }

  // AI move with full path. path.length === 1 → instant move (step or single hop).
  // path.length > 1 → animate each hop in sequence with an 800ms gap, and leave
  // a faded "trail" of cells the piece passed through (start + every landing) so
  // the human can read the chain's geometry after the fact.
  async function applyAiMove(move) {
    tqMovePath = move.path.map(p => p.slice());
    const fromK = key(move.from[0], move.from[1]);
    const piece = state.board[fromK];
    // Reset trail to the start cell only; landings get pushed during animation.
    state.lastTrail = { color: CORNERS[piece].color, cells: [move.from.slice()] };
    state.board[fromK] = null;
    let prev = move.from.slice();
    for (let i = 0; i < move.path.length; i++) {
      const cur = move.path[i];
      state.board[key(cur[0], cur[1])] = piece;
      state.lastMove = { from: prev, to: cur.slice() };
      state.lastTrail.cells.push(cur.slice());
      renderBoard();
      if (i < move.path.length - 1) {
        await sleep(800);
        // Ghost the piece briefly so the next render shows movement
        state.board[key(cur[0], cur[1])] = null;
        prev = cur.slice();
      }
    }
    const finalTo = move.path[move.path.length - 1];
    // commitTurn drops trails of length < 3 (i.e. step or single hop) — they
    // would just duplicate the lastMove halo.
    commitTurn(move.from, finalTo, piece);
  }

  function computeFinalRanking() {
    state.finalRanking = state.players.map(p => ({
      player: p,
      distance: distanceScore(state.board, p),
      inGoal: inGoalCount(state.board, p),
    }));
    // Winner first; rest sorted by inGoal desc, then distance asc
    state.finalRanking.sort((a, b) => {
      if (a.player === state.winner) return -1;
      if (b.player === state.winner) return 1;
      if (b.inGoal !== a.inGoal) return b.inGoal - a.inGoal;
      return a.distance - b.distance;
    });
  }

  function finishGame() {
    if (typeof tqSave !== 'undefined' && tqSave) tqSave.discard();
    // Result for the (sole) human player, if any
    const humanCorners = state.players.filter(p => state.playerKinds[p] === 'human');
    if (humanCorners.length === 1) {
      tqLastResult = (humanCorners[0] === state.winner) ? 'win' : 'lose';
      // Wins leaderboard: only when 1 human vs >=1 AI and human won
      if (tqLastResult === 'win' && state.players.some(p => state.playerKinds[p] === 'ai')) {
        tqTryAutoSubmit();
      }
    } else {
      // Multi-human or no-human: use 'win' if first human is winner, 'lose' otherwise (best-effort framing)
      if (humanCorners.length > 0) tqLastResult = (humanCorners[0] === state.winner) ? 'win' : 'lose';
      else tqLastResult = 'lose';
    }
    if (typeof tqSettleBtn !== 'undefined' && tqSettleBtn) tqSettleBtn.setEnabled(true);

    // Show overlay
    ovTitle.textContent = `🎉 ${CORNERS[state.winner].label}方（${CORNERS[state.winner].name}角）胜！`;
    ovRanking.innerHTML = renderRankingHtml();
    overlay.classList.add('show');
  }

  function renderRankingHtml() {
    const medals = ['🥇', '🥈', '🥉', '🏅', '🏅', '🏅'];
    return state.finalRanking.map((r, i) => {
      const c = CORNERS[r.player];
      const kind = state.playerKinds[r.player] === 'ai' ? '🤖 AI' : '👤 人类';
      return `<div>${medals[i] || '·'} ${c.label} ${kind} <span style="opacity:0.7;font-size:0.85em">— 已到 ${r.inGoal}/10</span></div>`;
    }).join('');
  }

  function triggerAiMove() {
    if (state.over || state.paused) return;
    if (typeof tqReplaying !== 'undefined' && tqReplaying) return;   // replay drives moves itself
    if (typeof tqControlsCurrent === 'function' && !tqControlsCurrent()) return;  // online: only the seat's controller (host) runs AI
    if (!currentKindIsAi()) return;
    state.aiThinking = true;
    updateStatus();
    const cfg = DIFFICULTY[aiDiffOf(currentPlayer())] || DIFFICULTY.normal;
    setTimeout(() => {
      const t0 = Date.now();
      const move = pickAiMove(state.board, state.players, state.turnIdx, cfg);
      const elapsed = Date.now() - t0;
      const wait = Math.max(0, cfg.delayMs - elapsed);
      setTimeout(async () => {
        state.aiThinking = false;
        if (state.paused || state.over) { updateStatus(); return; }
        if (move) {
          await applyAiMove(move);
        } else {
          nextTurn(); updateStatus();
          maybeTriggerAi(100);
        }
      }, wait);
    }, 30);
  }

  // ============================================================
  // Input — three-state machine: IDLE / SELECTED / CHAIN
  // ============================================================
  svg.addEventListener('click', (e) => {
    // Setup-mode seat config is on the HTML lobby cards, not the SVG.
    if (!state.started) return;

    const target = e.target.closest('.cell-hit');
    if (!target) return;
    const r = parseInt(target.getAttribute('data-row'), 10);
    const c = parseInt(target.getAttribute('data-col'), 10);

    if (state.over || state.aiThinking || state.paused) return;
    if (currentKindIsAi()) return;
    if (typeof tqReplaying !== 'undefined' && tqReplaying) return;
    if (typeof tqControlsCurrent === 'function' && !tqControlsCurrent()) return;  // online: only the seat's controller moves
    const owner = state.board[key(r, c)];
    const me = currentPlayer();

    // CHAIN mode: only allow continuing the chain or ending it.
    if (state.chainPiece) {
      // Click on the chain piece itself → end chain
      if (state.chainPiece[0] === r && state.chainPiece[1] === c) {
        commitChain();
        return;
      }
      // Click on a legal next-hop target → continue chain
      const t = state.legalTargets.find(t => t.to[0] === r && t.to[1] === c);
      if (t) applyHumanChainHop([r, c]);
      return;
    }

    // SELECTED mode
    if (state.selected) {
      const t = state.legalTargets.find(t => t.to[0] === r && t.to[1] === c);
      if (t) {
        const from = state.selected.slice();
        if (t.kind === 'step') applyHumanStep(from, [r, c]);
        else applyHumanFirstHop(from, [r, c]);
        return;
      }
      // Click another own piece → switch selection
      if (owner === me) {
        state.selected = [r, c];
        state.legalTargets = computeHumanTargets(state.board, r, c);
        renderBoard();
        return;
      }
      // Click empty/opponent cell → deselect
      state.selected = null;
      state.legalTargets = [];
      renderBoard();
      return;
    }

    // IDLE mode → select own piece
    if (owner === me) {
      state.selected = [r, c];
      state.legalTargets = computeHumanTargets(state.board, r, c);
      renderBoard();
    }
  });

  newBtn.onclick = backToSetup;
  ovBtn.onclick = backToSetup;

  function togglePause() {
    if (state.over || !Object.values(state.playerKinds).includes('ai')) return;
    state.paused = !state.paused;
    updateStatus();
    maybeTriggerAi(100);
  }
  pauseBtn.onclick = togglePause;
  resumeBtn.onclick = togglePause;
  endChainBtn.onclick = commitChain;

  undoBtn.onclick = () => {
    if (typeof tqOnline !== 'undefined' && tqOnline.active()) return;   // no undo in online (would desync)
    if (state.aiThinking || state.paused || state.history.length === 0 || state.over || state.chainPiece) return;
    // Undo: in vs-AI mode, roll back enough plies so it's the human's turn again.
    // Simpler: undo 1 ply if no AI in game; otherwise keep undoing until last move
    // taker is a human and current turn is a human's turn.
    let safety = 0;
    do {
      const last = state.history.pop();
      undoMove(state.board, last.undo);
      state.turnIdx = last.prevTurnIdx;
      safety++;
    } while (
      safety < 12 &&
      state.history.length > 0 &&
      currentKindIsAi()
    );
    state.selected = null;
    state.legalTargets = [];
    state.lastMove = state.history.length > 0
      ? { from: fromKey(state.history[state.history.length - 1].undo.fk).slice(), to: fromKey(state.history[state.history.length - 1].undo.tk).slice() }
      : null;
    state.lastTrail = null; // can't reconstruct prior trail from history; safest to drop
    renderBoard();
    updateStatus();
  };

  // ============================================================
  // games-shell integration
  // ============================================================
  let tqWlbWidget = null;
  let tqNickPrompt = null;
  let tqRunStartedAt = Date.now();
  let tqRunNonce = (window.GamesShell && GamesShell.Identity.newRunNonce()) || ('r-' + Date.now());
  let tqSettleBtn = null;
  let tqLastResult = null;

  function tqFormatDuration(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  // Paint final board onto a canvas. Designed for settlement.js which provides
  // a clipped (rounded-rect) draw region (x, y, w, h).
  function tqPaintBoard(ctx, ox, oy, ow, oh) {
    const aspect = SVG_W / SVG_H;
    const targetH = Math.min(oh, ow / aspect);
    const targetW = targetH * aspect;
    const dx = ox + (ow - targetW) / 2;
    const dy = oy + (oh - targetH) / 2;
    const sx = targetW / SVG_W;
    const sy = targetH / SVG_H;

    // Background
    ctx.fillStyle = '#f8f3e6';
    ctx.fillRect(ox, oy, ow, oh);

    // Cells
    for (let r = 0; r < ROWS; r++) {
      for (const c of ROW_COLS[r]) {
        const tri = CELL_TRIANGLE[key(r, c)];
        let fill = '#f5e6c8';
        if (tri && state.players && state.players.includes(tri)) {
          fill = lighten(CORNERS[tri].color, 0.18);
        } else if (tri) {
          fill = '#ece2cd';
        }
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#8a7050';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dx + svgX(c) * sx, dy + svgY(r) * sy, CELL_R * sx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    // Pieces
    for (const k in state.board) {
      const owner = state.board[k];
      if (!owner) continue;
      const [r, c] = fromKey(parseInt(k, 10));
      ctx.fillStyle = CORNERS[owner].color;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.5 * sx;
      ctx.beginPath();
      ctx.arc(dx + svgX(c) * sx, dy + svgY(r) * sy, PIECE_R * sx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function tqGetSettlementOpts() {
    if (!state.over || !state.winner) return null;
    const elapsed = Math.floor((Date.now() - tqRunStartedAt) / 1000);
    const humanCorners = state.players.filter(p => state.playerKinds[p] === 'human');
    const aiCount = state.players.filter(p => state.playerKinds[p] === 'ai').length;

    // Build opponent label
    let opponent;
    if (state.players.length === 2) {
      opponent = humanCorners.length === 1
        ? `vs AI · ${TQ_DIFF_LABEL[state.difficulty] || state.difficulty}`
        : '同机对弈';
    } else {
      opponent = `${state.players.length} 人对局` + (aiCount > 0 ? ` · AI ${TQ_DIFF_LABEL[state.difficulty] || state.difficulty}` : '');
    }

    // Stats: rank list with medal + corner color label + kind
    const medals = ['🥇 1st', '🥈 2nd', '🥉 3rd', '🏅 4th', '🏅 5th', '🏅 6th'];
    const stats = state.finalRanking.map((r, i) => {
      const c = CORNERS[r.player];
      const kind = state.playerKinds[r.player] === 'ai' ? 'AI' : '人类';
      return { label: medals[i] || '', value: `${c.label}方（${kind}）  ${r.inGoal}/10` };
    });
    stats.push({ label: '用时', value: tqFormatDuration(elapsed) });

    return {
      kind: 'duel',
      gameId: 'tiaoqi',
      title: '跳棋',
      emoji: '⭐',
      nick: (window.GamesShell && GamesShell.Identity.getNick()) || '匿名',
      opponent,
      result: tqLastResult || 'draw',
      stats,
      paintBoard: tqPaintBoard,
      boardW: 480,
      boardAspect: SVG_W / SVG_H,
      watermark: 'ruizhou03.com/toolbox/tiaoqi',
    };
  }

  function tqSubmitWins(nick) {
    const submittedNick = nick;
    return GamesShell.WinsLeaderboard.submit({
      gameId: 'tiaoqi',
      nick,
      did: GamesShell.Identity.getDeviceId(),
      aiLevel: state.difficulty,
      moves: state.history.length,
      durationMs: Math.max(5000, Date.now() - tqRunStartedAt),
      clientNonce: tqRunNonce,
    }).then(r => {
      if (r && r.ok) {
        if (tqWlbWidget) tqWlbWidget.refresh();
        if (tqNickPrompt) tqNickPrompt.hide();
        return;
      }
      if (r && r.reason === 'nick_taken') {
        GamesShell.Identity.clearNick();
        if (tqNickPrompt) { tqNickPrompt.refresh(); tqNickPrompt.show(); tqNickPrompt.showError('"' + submittedNick + '" 已被别的玩家占用，请换一个昵称'); }
        return;
      }
      if (r && r.reason) console.warn('[tiaoqi] wins submit rejected:', r.reason);
    });
  }

  function tqTryAutoSubmit() {
    if (!window.GamesShell) return;
    const humans = state.players.filter(p => state.playerKinds[p] === 'human');
    const ais = state.players.filter(p => state.playerKinds[p] === 'ai');
    if (humans.length !== 1 || ais.length === 0) return;
    if (!['easy', 'normal', 'hard'].includes(state.difficulty)) return;
    const nick = GamesShell.Identity.getNick();
    if (nick) {
      tqSubmitWins(nick);
      return;
    }
    if (tqNickPrompt) tqNickPrompt.show();
  }

  function tqInitShell() {
    if (!window.GamesShell || !GamesShell.WinsLeaderboard) return;
    tqWlbWidget = GamesShell.WinsLeaderboard.mount({
      container: document.getElementById('tq-wlb-mount'),
      gameId: 'tiaoqi',
      title: '🏆 跳棋 战绩榜（vs AI）',
      getCurrentNick: () => GamesShell.Identity.getNick(),
    });
    GamesShell.Comments.mount({
      container: document.getElementById('tq-cm-mount'),
      path: '/toolbox/tiaoqi/',
      title: '💬 棋友交流',
      intro: '聊聊跳棋的开局思路、围堵 / 跳跳跳的小技巧，或者吐槽 AI ~',
      placeholder: '聊聊你的跳棋心得 ~',
    });
    if (GamesShell.NickPrompt) {
      tqNickPrompt = GamesShell.NickPrompt.mount({
        container: document.getElementById('tq-nick-mount'),
        prompt: '赢一局！起个昵称上榜吧',
        onSubmit: nick => tqSubmitWins(nick),
        onSkip: () => { if (tqNickPrompt) tqNickPrompt.hide(); },
      });
    }
    if (GamesShell.Settlement) {
      tqSettleBtn = GamesShell.Settlement.mountButton({
        container: document.getElementById('tq-settle-btn-mount'),
        gameId: 'tiaoqi',
        getOpts: tqGetSettlementOpts,
        startDisabled: true,
      });
    }
  }
  tqInitShell();

  // ============================================================
  // 48h save-state (only persists active games)
  // ============================================================
  let tqSave = null;
  function tqSerialize() {
    if (!state.started || state.over) return null;
    // Don't snapshot mid-chain — wait until the turn fully commits.
    if (state.chainPiece) return null;
    return {
      setupConfig: state.setupConfig,
      difficulty: state.difficulty,
      players: state.players,
      playerKinds: state.playerKinds,
      board: state.board,
      turnIdx: state.turnIdx,
      lastMove: state.lastMove,
      runStartedAt: tqRunStartedAt,
      runNonce: tqRunNonce,
      moveCount: state.history.length,
    };
  }
  function tqRestore(saved) {
    state.setupConfig = saved.setupConfig || defaultSetup();
    state.difficulty = saved.difficulty || 'normal';
    state.players = saved.players || [];
    state.playerKinds = saved.playerKinds || {};
    state.board = saved.board;
    state.turnIdx = saved.turnIdx || 0;
    state.history = [];
    state.selected = null;
    state.legalTargets = [];
    state.chainPiece = null;
    state.chainStartFrom = null;
    state.lastTrail = null;
    state.aiThinking = false;
    state.paused = false;
    state.over = false;
    state.winner = null;
    state.lastMove = saved.lastMove || null;
    state.started = true;
    tqRunStartedAt = Number(saved.runStartedAt) || Date.now();
    tqRunNonce = saved.runNonce || ((window.GamesShell && GamesShell.Identity.newRunNonce()) || ('r-' + Date.now()));
    tqHideLobby();
    gameControls.hidden = false;
    rosterEl.hidden = false;
    pauseBtn.hidden = !Object.values(state.playerKinds).includes('ai');
    renderBoard();
    updateStatus();
    maybeTriggerAi(320);
  }

  // Initial render (config mode by default)
  function initialSetupRender() {
    refreshSetupControls();
    renderBoard();
    updateStatus();
  }

  // ============ Setup / Lobby (config cards on each home triangle) ============
  const tqLobby = document.getElementById('tqLobby');
  const tqLobbyHint = document.getElementById('tqLobbyHint');
  const tqLobbyErr = document.getElementById('tqLobbyErr');
  const tqRoomChip = document.getElementById('tqRoomChip');
  const tqRoomCodeNum = document.getElementById('tqRoomCodeNum');
  const tqStartBtn = document.getElementById('tqStartBtn');
  const tqSeatEls = {};
  for (const ck of CORNER_KEYS) tqSeatEls[ck] = document.getElementById('tqSeat' + ck);

  const KIND_ICON = { empty: '➕', human: '👤', ai: '🤖', remote: '🔗' };
  const DIFF3 = { easy: '新手', normal: '普通', hard: '高手' };
  const LOCAL_SUB = { empty: '空位', human: '本机真人', ai: '电脑', remote: '邀请加入' };
  const LOCAL_CYCLE = ['empty', 'human', 'ai', 'remote'];

  function tqEl(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function tqSetErr(m) { tqLobbyErr.textContent = m || ''; }
  function tqActiveCount() { return CORNER_KEYS.filter(ck => state.setupConfig[ck] !== 'empty').length; }
  function tqGetNick() { return (window.GamesShell && GamesShell.Identity.getNick && GamesShell.Identity.getNick()) || ('玩家' + Math.floor(Math.random() * 9000 + 1000)); }

  function tqHideLobby() { tqLobby.hidden = true; tqStartBtn.hidden = true; tqRoomChip.hidden = true; tqLobbyHint.hidden = true; }

  // Per-base AI difficulty chips.
  function tqDiffChips(curDiff, onPick) {
    const wrap = tqEl('div', 'tq-seat-diff');
    ['easy', 'normal', 'hard'].forEach(d => {
      const b = tqEl('button', d === (curDiff || 'normal') ? 'sel' : '', DIFF3[d]);
      b.onclick = (e) => { e.stopPropagation(); onPick(d); };
      wrap.appendChild(b);
    });
    return wrap;
  }

  // Build one home-triangle config card from a model + handlers.
  function tqMakeCard(ck, m, h) {
    const info = CORNERS[ck];
    const card = tqEl('div', 'tq-seat-card'
      + (m.kind === 'empty' ? ' empty' : '')
      + (m.me ? ' is-me' : '') + (m.sel ? ' swap-sel' : ''));
    card.style.setProperty('--seat', info.color);
    if (h.onTap) card.onclick = h.onTap;
    card.appendChild(tqEl('span', 'ico', m.icon || KIND_ICON[m.kind] || '👤'));
    card.appendChild(tqEl('span', 'lbl', m.label || (info.label + '方')));
    if (m.host || m.off) {
      const tags = tqEl('div', 'tq-seat-badges');
      if (m.host) tags.appendChild(tqEl('span', 'tq-seat-tag host', '房主'));
      if (m.off) tags.appendChild(tqEl('span', 'tq-seat-tag off', '离线'));
      card.appendChild(tags);
    }
    card.appendChild(tqEl('span', 'sub', m.sub || ''));
    if (m.kind === 'ai' && h.onDiff) card.appendChild(tqDiffChips(m.aiDiff, h.onDiff));
    if (m.showCopy && h.onCopy) { const b = tqEl('button', 'tq-seat-mini', '🔗 复制链接'); b.onclick = (e) => { e.stopPropagation(); h.onCopy(); }; card.appendChild(b); }
    if (m.showKick && h.onKick) { const b = tqEl('button', 'tq-seat-mini kick', '✕ 踢出'); b.onclick = (e) => { e.stopPropagation(); h.onKick(); }; card.appendChild(b); }
    return card;
  }

  function tqCycleLocal(ck) {
    const cur = state.setupConfig[ck];
    state.setupConfig[ck] = LOCAL_CYCLE[(LOCAL_CYCLE.indexOf(cur) + 1) % LOCAL_CYCLE.length];
    persist(); tqRenderLobby(); renderBoard();
  }

  function tqStartLocalGame() {
    if (tqActiveCount() < 2) return;
    if (CORNER_KEYS.some(ck => state.setupConfig[ck] === 'remote')) return;  // invite seats need a room first
    if (typeof tqSave !== 'undefined' && tqSave) tqSave.discard();
    startGame();
    if (typeof tqSave !== 'undefined' && tqSave) tqSave.start();
  }

  function tqRenderLobby() {
    if (state.started) { tqHideLobby(); return; }
    tqLobby.hidden = false; tqLobbyHint.hidden = false;
    if (tqOnline.active()) { tqOnline.renderLobby(); return; }
    // ---- LOCAL config (no room) ----
    tqRoomChip.hidden = true;
    for (const ck of CORNER_KEYS) {
      const kind = state.setupConfig[ck];
      const m = { kind, sub: LOCAL_SUB[kind], aiDiff: state.aiDiff[ck], showCopy: kind === 'remote' };
      const h = {
        onTap: () => tqCycleLocal(ck),
        onDiff: kind === 'ai' ? (d) => { state.aiDiff[ck] = d; persist(); tqRenderLobby(); } : null,
        onCopy: kind === 'remote' ? () => tqOnline.startInvite() : null,
      };
      const hostEl = tqSeatEls[ck]; hostEl.innerHTML = '';
      hostEl.appendChild(tqMakeCard(ck, m, h));
    }
    const remoteNoRoom = CORNER_KEYS.some(ck => state.setupConfig[ck] === 'remote');
    const n = tqActiveCount();
    tqStartBtn.hidden = false;
    tqStartBtn.onclick = tqStartLocalGame;
    if (remoteNoRoom) {
      tqStartBtn.disabled = true;
      tqStartBtn.textContent = '▶ 开始游戏';
      tqLobbyHint.textContent = '点「邀请」领地里的「🔗 复制链接」即可建房、邀请好友联机';
    } else {
      tqStartBtn.disabled = n < 2;
      tqStartBtn.textContent = n < 2 ? '▶ 开始游戏' : ('▶ 开始游戏（' + n + ' 人）');
      tqLobbyHint.textContent = '点六角领地切换 空 / 本机真人 / 电脑（可设难度）/ 邀请联机';
    }
    tqSetErr('');
    renderBoard();   // keep SVG base-frame fills in sync with seat config
  }

  // ============ Online (rooms + deterministic move-event sync) ============
  // Lobby + gameplay ride the relay event log (board.js `event` action):
  //   {t:'seats', seats}                          host broadcasts seat config
  //   {t:'turn', corner, from:[r,c], path:[[r,c]…]} one completed move (step/jump/chain)
  // Every client converges by replaying moves in seq order. The host runs every
  // ai/local seat; each guest runs its own seat. Reuses the same `event` action
  // already deployed for feixingqi (no backend change).
  const tqOnline = (() => {
    const API = 'https://zircon-urge.fly.dev/api/board';
    let net = null;
    // net = { code, token, playerId, deviceId, isHost, players:[], seats:{ck:{kind,pid,aiDiff?}}, swapSel, ver, lastSeq, started, poller }

    function active() { return !!net; }
    function isHost() { return !!net && net.isHost; }
    function seatMap() { return net && net.seats; }

    function api(method, action, body) {
      return fetch(API + '?action=' + action, {
        method, headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: body ? JSON.stringify(body) : undefined,
      }).then(r => r.json()).catch(e => ({ error: e.name === 'TimeoutError' ? 'timeout' : 'network' }));
    }
    async function emit(data) {
      if (!net) return null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await api('POST', 'event', { code: net.code, token: net.token, event: data });
        if (r && r.ok) { net.ver = r.version; return r; }
        if (r && r.error === 'locked') { await new Promise(s => setTimeout(s, 160)); continue; }
        return r;
      }
      return { error: 'locked' };
    }

    function seatsFromSetup() {
      const s = {};
      for (const ck of CORNER_KEYS) {
        const k = state.setupConfig[ck];
        if (k === 'human') s[ck] = { kind: 'human', pid: null };
        else if (k === 'ai') s[ck] = { kind: 'ai', pid: null, aiDiff: state.aiDiff[ck] || 'normal' };
        else if (k === 'remote') s[ck] = { kind: 'remote', pid: null };
        else s[ck] = { kind: 'empty', pid: null };
      }
      return s;
    }

    // Clipboard writes MUST happen synchronously inside the click gesture or the
    // browser blocks them — which is exactly why the first 复制链接 pre-generates
    // a code and copies the link BEFORE the async room-create round-trip.
    function writeClip(text) { try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text); } catch (e) {} }
    function inviteUrl(code) { return location.origin + '/toolbox/tiaoqi/?room=' + code; }

    // First 复制链接 tap (no room yet): pick a code, copy the link instantly
    // (in-gesture), then create the room with that code in the background. If
    // the room already exists, just re-copy its link.
    function startInvite() {
      if (net) { writeClip(inviteUrl(net.code)); tqLobbyHint.textContent = '✓ 已复制邀请链接（房号 ' + net.code + '），发给好友打开即加入'; return; }
      const code = String(Math.floor(1000 + Math.random() * 9000));
      writeClip(inviteUrl(code));
      tqLobbyHint.textContent = '✓ 已复制邀请链接（房号 ' + code + '），正在建房…';
      goOnline(code);
    }

    async function goOnline(presetCode) {
      const deviceId = GamesShell.Identity.getDeviceId();
      let cr = await api('POST', 'create', { gameId: 'tiaoqi', nick: tqGetNick(), deviceId, code: presetCode });
      // Rare: the pre-picked code collided — let the server assign a fresh one.
      if (cr && cr.reason === 'code_taken') cr = await api('POST', 'create', { gameId: 'tiaoqi', nick: tqGetNick(), deviceId });
      if (!cr || !cr.ok) { tqSetErr('创建房间失败，请检查网络后重试'); tqLobbyHint.textContent = ''; return; }
      net = { code: cr.code, token: cr.playerToken, playerId: cr.playerId, deviceId,
        isHost: true, players: (cr.room && cr.room.players) || [], seats: seatsFromSetup(),
        swapSel: null, ver: (cr.room && cr.room.version) || 0, lastSeq: 0, started: false, poller: null };
      tqSetErr('');
      await emit({ t: 'seats', seats: net.seats });
      startPolling();
      tqRenderLobby();
      if (presetCode && cr.code !== presetCode) { writeClip(inviteUrl(cr.code)); tqLobbyHint.textContent = '房号已更新为 ' + cr.code + '（已复制新链接，旧号失效）'; }
      else tqLobbyHint.textContent = '✓ 已复制邀请链接（房号 ' + cr.code + '），发给好友打开即加入';
    }

    async function join(rawCode) {
      const c = String(rawCode || '').replace(/\D/g, '').slice(0, 4);
      if (c.length !== 4) { tqSetErr('请输入 4 位房号'); return; }
      tqSetErr('正在加入…');
      const deviceId = GamesShell.Identity.getDeviceId();
      const r = await api('POST', 'join', { code: c, nick: tqGetNick(), deviceId });
      if (!r || !r.ok) {
        const msgs = { room_not_found: '房间不存在', room_full: '房间已满', room_in_progress: '游戏已开始，无法加入', nick_taken_in_room: '昵称已被占用，换一个' };
        tqSetErr((r && (msgs[r.reason] || msgs[r.error])) || '加入失败'); return;
      }
      net = { code: r.code, token: r.playerToken, playerId: r.playerId, deviceId,
        isHost: false, players: (r.room && r.room.players) || [], seats: null,
        swapSel: null, ver: (r.room && r.room.version) || 0, lastSeq: 0, started: false, poller: null };
      tqSetErr('');
      startPolling();
      tqRenderLobby();
    }

    async function leave() {
      stopPolling();
      const had = net; net = null;
      if (had && had.token) { try { await api('POST', 'leave', { code: had.code, token: had.token }); } catch (e) {} }
      for (const ck of CORNER_KEYS) if (state.setupConfig[ck] === 'remote') state.setupConfig[ck] = 'empty';
      persist();
      if (!state.started) { tqRenderLobby(); renderBoard(); }
    }

    function copyLink() {
      if (!net) return;
      writeClip(inviteUrl(net.code));   // existing room → in-gesture copy
      tqLobbyHint.textContent = '✓ 已复制邀请链接（房号 ' + net.code + '），发给好友打开即加入';
    }

    function hostReconcile() {
      if (!net.isHost) return false;
      let changed = false;
      const ids = net.players.map(p => p.id);
      for (const ck of CORNER_KEYS) {
        const s = net.seats[ck];
        if (s.kind === 'remote' && s.pid && !ids.includes(s.pid)) { s.pid = null; changed = true; }
      }
      for (const p of net.players) {
        if (p.id === net.playerId) continue;
        if (CORNER_KEYS.some(ck => net.seats[ck].pid === p.id)) continue;
        const slot = CORNER_KEYS.find(ck => net.seats[ck].kind === 'remote' && !net.seats[ck].pid)
          || CORNER_KEYS.find(ck => net.seats[ck].kind === 'empty');
        if (slot) { net.seats[slot] = { kind: 'remote', pid: p.id }; changed = true; }
      }
      return changed;
    }
    function broadcastSeats() { if (net && net.isHost) emit({ t: 'seats', seats: net.seats }); }

    function onSeatClick(ck) {
      if (!net.isHost) return;
      const s = net.seats[ck];
      if (net.swapSel == null) {
        if (s.kind === 'remote' && s.pid) { net.swapSel = ck; renderLobby(); return; }   // occupied: select for swap (kick to change)
        const cyc = ['empty', 'human', 'ai', 'remote'];
        const next = cyc[(cyc.indexOf(s.kind) + 1) % cyc.length];
        net.seats[ck] = next === 'ai' ? { kind: 'ai', pid: null, aiDiff: 'normal' } : { kind: next, pid: null };
        broadcastSeats(); renderLobby(); return;
      }
      if (net.swapSel === ck) { net.swapSel = null; renderLobby(); return; }
      const a = net.swapSel; const t = net.seats[a]; net.seats[a] = net.seats[ck]; net.seats[ck] = t;
      net.swapSel = null; broadcastSeats(); renderLobby();
    }

    async function kick(ck) {
      const s = net.seats[ck];
      if (!net.isHost || !(s.kind === 'remote' && s.pid)) return;
      await api('POST', 'kick', { code: net.code, token: net.token, targetPlayerId: s.pid });
    }

    function seatedCount() { return CORNER_KEYS.filter(ck => { const s = net.seats[ck]; return s && (s.kind === 'human' || s.kind === 'ai' || (s.kind === 'remote' && s.pid)); }).length; }
    function remoteJoined() { return CORNER_KEYS.some(ck => { const s = net.seats[ck]; return s && s.kind === 'remote' && s.pid && s.pid !== net.playerId; }); }

    async function start() {
      if (!net.isHost) return;
      if (seatedCount() < 2) { tqSetErr('至少需要 2 席'); return; }
      if (!remoteJoined()) { tqSetErr('还需至少 1 位联机真人加入（否则用本地模式即可）'); return; }
      await emit({ t: 'seats', seats: net.seats });
      const r = await api('POST', 'start', { code: net.code, token: net.token });
      if (!r || !r.ok) {
        const msgs = { not_enough_players: '还需至少 1 位玩家加入', not_host: '只有房主能开始' };
        tqSetErr((r && (msgs[r.reason] || msgs[r.error])) || '开始失败'); return;
      }
    }

    function stopPolling() { if (net && net.poller) { clearTimeout(net.poller); net.poller = null; } }
    function startPolling() {
      stopPolling();
      const tick = async () => {
        if (!net) return;
        const r = await api('GET', 'state&code=' + net.code + '&token=' + net.token + '&since=' + net.ver);
        if (!net) return;
        if (r && r.ok && r.room) {
          net.ver = r.room.version;
          net.players = r.room.players || [];
          applyLog(r.room.moves || []);
          if (!net.players.some(p => p.id === net.playerId)) { onGone('你已离开房间'); return; }
          if (net.isHost && r.room.state === 'lobby' && hostReconcile()) broadcastSeats();
          if (r.room.state === 'playing' && !net.started) beginGame();
          if (!state.started) tqRenderLobby();
        } else if (r && (r.reason === 'room_not_found' || r.reason === 'room_dissolved')) {
          onGone('房间已关闭'); return;
        }
        if (net) net.poller = setTimeout(tick, state.started ? 800 : 1000);
      };
      tick();
    }
    function onGone(msg) {
      stopPolling(); const wasStarted = state.started; net = null;
      if (!wasStarted) {
        for (const ck of CORNER_KEYS) if (state.setupConfig[ck] === 'remote') state.setupConfig[ck] = 'empty';
        tqSetErr(msg); tqRenderLobby(); renderBoard();
      }
    }

    function applyLog(moves) {
      for (const m of moves) {
        if (!m || typeof m.seq !== 'number' || m.seq <= net.lastSeq) continue;
        net.lastSeq = m.seq;
        const ev = m.event; if (!ev) continue;
        if (ev.t === 'seats') { if (!net.isHost) net.seats = ev.seats; }
        else if (ev.t === 'turn') { if (m.playerId !== net.playerId) tqEnqueueRemoteTurn(ev); }
      }
    }

    function controlsColor(corner) {
      if (!net) return true;
      const s = net.seats[corner];
      if (!s) return false;
      if (s.kind === 'remote') return s.pid === net.playerId;
      return net.isHost;
    }

    function beginGame() {
      net.started = true;
      net.swapSel = null;
      tqApplyOnlineSeatsToGame();
      tqHideLobby();
      if (typeof tqSave !== 'undefined' && tqSave) tqSave.discard();
      startGame();
      tqPumpRemote();
    }

    function nickOf(pid) { const p = net.players.find(x => x.id === pid); return p ? p.nick : '玩家'; }
    function onlineOf(pid) { const p = net.players.find(x => x.id === pid); return p ? p.online : false; }
    function hostOf(pid) { const p = net.players.find(x => x.id === pid); return !!(p && p.isHost); }
    function onlineModel(ck, s) {
      const sel = net.swapSel === ck;
      if (s.kind === 'empty') return { kind: 'empty', sub: '空位', sel };
      if (s.kind === 'human') return { kind: 'human', sub: '本机真人', sel };
      if (s.kind === 'ai') return { kind: 'ai', sub: '电脑', aiDiff: s.aiDiff || 'normal', sel };
      if (!s.pid) return { kind: 'remote', icon: '🔗', sub: '等待加入…', showCopy: true, sel };
      const me = s.pid === net.playerId;
      return { kind: 'remote', icon: '🌐', label: nickOf(s.pid) + (me ? '（你）' : ''), sub: '联机真人', me, off: !onlineOf(s.pid), host: hostOf(s.pid), showKick: net.isHost && !me, sel };
    }

    function renderLobby() {
      tqRoomChip.hidden = false; tqRoomCodeNum.textContent = net.code; tqRoomChip.onclick = () => copyLink();
      for (const ck of CORNER_KEYS) {
        const s = (net.seats && net.seats[ck]) || { kind: 'empty', pid: null };
        const m = onlineModel(ck, s);
        const h = {
          onTap: net.isHost ? () => onSeatClick(ck) : null,
          onDiff: (net.isHost && s.kind === 'ai') ? (d) => { net.seats[ck].aiDiff = d; broadcastSeats(); renderLobby(); } : null,
          onCopy: m.showCopy ? () => copyLink() : null,
          onKick: m.showKick ? () => kick(ck) : null,
        };
        const hostEl = tqSeatEls[ck]; hostEl.innerHTML = '';
        hostEl.appendChild(tqMakeCard(ck, m, h));
      }
      if (net.isHost) {
        const ok = seatedCount() >= 2 && remoteJoined();
        tqStartBtn.hidden = false; tqStartBtn.disabled = !ok;
        tqStartBtn.textContent = '▶ 开始游戏（' + seatedCount() + '）';
        tqStartBtn.onclick = start;
        tqLobbyHint.textContent = net.swapSel ? '再点另一块领地完成换位'
          : '点领地切模式（改联机真人要先「踢出」）· 点两个已入座者换位 · 房号 ' + net.code;
      } else {
        tqStartBtn.hidden = true;
        tqLobbyHint.textContent = '已加入房间 ' + net.code + '，等待房主开始…（点房号可把链接转发给别人）';
      }
      tqSetErr('');
      renderBoard();   // keep SVG base-frame fills + me/swap highlights in sync
    }

    // Which highlight (if any) the SVG base frame should draw for corner `ck`.
    function highlightFor(ck) {
      if (!net || net.started) return null;
      if (net.swapSel === ck) return 'sel';
      const s = net.seats && net.seats[ck];
      if (s && s.kind === 'remote' && s.pid && s.pid === net.playerId) return 'me';
      return null;
    }

    return { active, isHost, seatMap, controlsColor, highlightFor, goOnline, startInvite, join, leave, broadcastSeats, onSeatClick, renderLobby, emit, autoJoin };

    function autoJoin() { const code = new URLSearchParams(location.search).get('room'); if (code && /^\d{4}$/.test(code)) join(code); }
  })();

  // ---- move-event sync bridges (used by the turn flow above) ----
  let tqReplaying = false;       // true while replaying a remote move
  let tqMovePath = null;         // landings of the move in progress (set by the appliers)
  let tqAiTimer = 0;
  const tqRemoteQueue = [];      // queued remote moves awaiting replay

  function tqControlsCurrent() { return tqOnline.active() ? tqOnline.controlsColor(currentPlayer()) : true; }

  function maybeTriggerAi(delay) {
    if (state.over || state.paused || tqReplaying) return;
    if (!tqControlsCurrent()) return;       // online: only the controller (host) runs AI
    if (!currentKindIsAi()) return;
    clearTimeout(tqAiTimer);
    tqAiTimer = setTimeout(triggerAiMove, delay || 100);
  }

  // Freeze online seats into setupConfig so startGame() builds players/kinds.
  function tqApplyOnlineSeatsToGame() {
    const seats = tqOnline.seatMap() || {};
    for (const ck of CORNER_KEYS) {
      const s = seats[ck] || { kind: 'empty' };
      state.setupConfig[ck] = (s.kind === 'ai') ? 'ai'
        : (s.kind === 'human') ? 'human'
        : (s.kind === 'remote' && s.pid) ? 'human' : 'empty';
      if (s.kind === 'ai' && s.aiDiff) state.aiDiff[ck] = s.aiDiff;
    }
  }

  // Broadcast a completed move (called from commitTurn on the controlling client).
  function tqEmitMove(corner, fromArr, toArr) {
    if (!tqOnline.active() || tqReplaying) return;
    if (!tqOnline.controlsColor(corner)) return;
    const path = (tqMovePath && tqMovePath.length) ? tqMovePath.map(p => p.slice()) : [toArr.slice()];
    tqOnline.emit({ t: 'turn', corner, from: fromArr.slice(), path });
  }

  function tqEnqueueRemoteTurn(ev) { tqRemoteQueue.push(ev); tqPumpRemote(); }
  function tqAfterTurnResolved() { tqPumpRemote(); }
  function tqPumpRemote() {
    if (tqReplaying || !state.started || state.over || state.paused) return;
    if (state.aiThinking || state.chainPiece) return;
    if (!tqRemoteQueue.length) return;
    const ev = tqRemoteQueue[0];
    if (ev.corner !== currentPlayer()) return;   // ordered log: wait until it's that seat's turn
    tqRemoteQueue.shift();
    tqReplaying = true;
    const move = { from: ev.from, to: ev.path[ev.path.length - 1], path: ev.path };
    Promise.resolve(applyAiMove(move)).then(() => {
      tqReplaying = false;
      updateStatus();
      maybeTriggerAi(100);
      tqPumpRemote();
    });
  }

  // Initial render (config mode by default)
  initialSetupRender();

  // Opening a ?room=XXXX invite link drops you straight into that lobby.
  const tqHasRoomLink = /[?&]room=\d{4}/.test(location.search);
  if (tqHasRoomLink) tqOnline.autoJoin();

  // Resume of a saved LOCAL game — skipped when arriving via an invite link.
  if (!tqHasRoomLink && window.GamesShell && GamesShell.SaveState) {
    tqSave = GamesShell.SaveState.create({
      key: 'tool.tiaoqi.savestate.v1',
      ttlMs: 48 * 3600 * 1000,
      serialize: tqSerialize,
    });
    const peek = tqSave.peek();
    if (peek && peek.data && peek.data.board && peek.data.players) {
      const np = peek.data.players.length;
      GamesShell.SaveState.showResumeModal({
        summaryHtml: `<strong>${np} 人对局</strong> 已走 <strong>${peek.data.moveCount || 0}</strong> 步<span class="gs-resume-meta">${peek.agoText}保存</span>`,
        onResume: () => { tqRestore(peek.data); tqSave.start(); },
        onDiscard: () => { tqSave.discard(); tqSave.start(); },
      });
    } else {
      tqSave.start();
    }
  }

})();
