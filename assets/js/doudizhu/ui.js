(() => {
  const E = window.DDZEngine;
  const AI = window.DDZAI;
  const T = E.TYPES;

  // ============================================================
  // State
  // ============================================================
  const PHASE = {
    IDLE: 'idle',
    DEALING: 'dealing',
    BIDDING: 'bidding',         // 抢地主阶段（轮叫 / 抢）
    REVEAL: 'reveal',
    DOUBLING: 'doubling',        // 揭牌后加倍阶段
    PLAYING: 'playing',
    SETTLEMENT: 'settlement',
  };

  const state = {
    phase: PHASE.IDLE,
    difficulty: 'normal',
    autopilot: false,            // 托管：true 时所有"我"的决策都由 AI 代打
    hands: [[], [], []],         // 索引 0=玩家, 1=右上 AI(下家), 2=左上 AI(上家)
    bottom: [],                   // 3 张底牌（揭示后并入地主手牌）
    bottomRevealed: false,
    bottomPlayed: new Set(),      // 已被地主打出去的底牌 cid 集合（顶部那 3 张要灰掉）
    // 抢地主
    landlordIdx: -1,             // 最终地主
    landlordCandidate: -1,       // 当前抢到的候选地主
    bidStartSeat: 0,
    bidTurnIdx: 0,
    bidActions: [],               // [{seat, action: 'rob'|'pass'}]
    robCount: 0,                  // 总抢次数（决定 base multiplier）
    // 加倍
    doubleTurnIdx: 0,
    doubleActions: [],            // [{seat, double: bool}]
    // 通用倍数
    multiplier: 1,                // = baseFromRob × 2^doubles × 2^bombs × spring
    bombCount: 0,
    spring: 0,                    // 0 / 1 / 2（春天 / 反春天 each ×2）
    landlordPlayCount: 0,        // 地主出牌次数（用于反春天）
    peasantPlayCount: 0,         // 农民出牌次数（用于春天）
    // 出牌
    turnIdx: 0,
    lastTrick: null,             // {seat, pattern}
    passCount: 0,
    selected: new Set(),
    declared: false,                                // 是否明牌（任一玩家明牌）
    declaredSeat: -1,                               // 谁明牌
    initialHands: null,                             // 开局快照 [arr0, arr1, arr2]（含地主底牌）— 春天结算图用
    seen: new Array(15).fill(0),                   // 真实已出统计（仅供调试 / 玩家视角）
    aiPerceivedSeen: [                              // 每个 AI 自己的"记忆"，可能有噪声
      null,
      new Array(15).fill(0),                        // AI 1（下家）
      new Array(15).fill(0),                        // AI 2（上家）
    ],
    runStartedAt: 0,
    runNonce: '',
    result: null,                // { winnerRole, multiplier, score }
    resumed: false,
    // 提示循环
    hintCycle: [],
    hintIdx: -1,
    hintForPrev: null,
    // 模式
    mode: 'single',              // 'single' | 'online'
    online: null,                // { code, token, playerId, mySeat, isHost, lastVersion, polling, sessionKey }
  };

  // ============================================================
  // 音效系统（Web Audio API，全部 procedural — 不引外部资源）
  // 默认静音；setup 屏右上 chip 切换；偏好持久化
  // ============================================================
  const SFX_KEY = 'tool.doudizhu.sfx.v1';
  let sfxEnabled = false;
  let _audioCtx = null;
  function audioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { _audioCtx = null; }
    }
    return _audioCtx;
  }
  function _tone(freq, dur, type, vol) {
    const ctx = audioCtx(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type || 'sine';
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
  function _noiseBurst(dur, vol) {
    const ctx = audioCtx(); if (!ctx) return;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * dur, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() - 0.5) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.18;
    // bandpass to make it sound less harsh
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 0.5;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start();
  }
  const SFX = {
    click()  { _tone(680, 0.04, 'square', 0.025); },
    play()   { _tone(520, 0.06, 'sine', 0.05); _tone(780, 0.04, 'sine', 0.03); },
    pass()   { _tone(220, 0.10, 'triangle', 0.04); },
    bomb()   { _noiseBurst(0.30, 0.22); _tone(95, 0.30, 'sawtooth', 0.10); },
    rocket() {
      // 多频段叠加 + 大噪音
      [220, 330, 440, 660, 880].forEach((f, i) => setTimeout(() => _tone(f, 0.45, 'sawtooth', 0.07), i * 50));
      setTimeout(() => _noiseBurst(0.45, 0.28), 250);
      setTimeout(() => _tone(60, 0.55, 'sine', 0.12), 280);
    },
    win()    { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => _tone(f, 0.16, 'sine', 0.07), i * 95)); },
    lose()   { [440, 330, 220].forEach((f, i) => setTimeout(() => _tone(f, 0.20, 'triangle', 0.05), i * 130)); },
    tick()   { _tone(1200, 0.03, 'square', 0.02); },
  };
  function playSfx(name) {
    if (!sfxEnabled) return;
    try {
      const ctx = audioCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (SFX[name]) SFX[name]();
    } catch {}
  }
  function loadSfxPref() {
    try { sfxEnabled = localStorage.getItem(SFX_KEY) === '1'; } catch { sfxEnabled = false; }
  }
  function setSfxEnabled(b) {
    sfxEnabled = !!b;
    try { localStorage.setItem(SFX_KEY, sfxEnabled ? '1' : '0'); } catch {}
    refreshSfxToggle();
    if (sfxEnabled) playSfx('click');
  }
  function refreshSfxToggle() {
    const btn = document.getElementById('ddzSfxToggle');
    if (!btn) return;
    btn.classList.toggle('on', sfxEnabled);
    btn.textContent = sfxEnabled ? '🔊 音效' : '🔇 静音';
  }
  loadSfxPref();
  // setup 一次后再绑定按钮
  setTimeout(() => {
    refreshSfxToggle();
    const btn = document.getElementById('ddzSfxToggle');
    if (btn) btn.addEventListener('click', () => setSfxEnabled(!sfxEnabled));
  }, 0);

  // ============================================================
  // 倒计时（贴到当前玩家头像上的闹钟 badge）
  // ============================================================
  const TURN_TIMEOUT_MS = 25000;
  const DOUBLE_TIMEOUT_MS = 5000;
  const BID_TIMEOUT_MS = 10000;   // 叫地主 / 抢地主单回合超时 — 到点默认不叫/不抢
  // 现在 countdownEl 接受一个 seat 参数（0/1/2 显示座位），返回对应的 .ddz-clock
  function clockEl(seat) { return document.getElementById('ddzClock' + seat); }
  function hideAllClocks() {
    for (let i = 0; i < 3; i++) {
      const el = clockEl(i);
      if (el) { el.hidden = true; el.classList.remove('urgent'); }
    }
  }
  let turnCountdownTimer = null;
  let turnCountdownEndAt = 0;
  let turnCountdownSeat = 0;
  // seat = 显示座位 (0/1/2)；onTimeout 仅在 seat===0 时触发玩家自动出
  // durationMs 不传则用默认 TURN_TIMEOUT_MS（出牌阶段）；叫/抢地主传 BID_TIMEOUT_MS
  function startTurnCountdown(onTimeout, seat, durationMs) {
    stopTurnCountdown();
    turnCountdownEndAt = Date.now() + (durationMs || TURN_TIMEOUT_MS);
    turnCountdownSeat = (typeof seat === 'number') ? seat : 0;
    const el = clockEl(turnCountdownSeat);
    if (!el) return;
    el.hidden = false;
    el.classList.remove('urgent');
    let lastTickedSec = 99;       // 用于「仅在跨秒时」播放心跳音
    function tick() {
      const left = Math.max(0, turnCountdownEndAt - Date.now());
      const s = Math.ceil(left / 1000);
      el.textContent = s + 's';
      el.classList.toggle('urgent', s <= 5);
      // 只在玩家自己（seat===0）轮次的最后 3 秒播心跳音
      if (turnCountdownSeat === 0 && s !== lastTickedSec && s > 0 && s <= 3) {
        playSfx('tick');
      }
      lastTickedSec = s;
      if (left <= 0) {
        stopTurnCountdown();
        try { onTimeout && onTimeout(); } catch (e) { console.warn(e); }
      }
    }
    tick();
    turnCountdownTimer = setInterval(tick, 250);
  }
  function stopTurnCountdown() {
    if (turnCountdownTimer) clearInterval(turnCountdownTimer);
    turnCountdownTimer = null;
    hideAllClocks();
  }

  // ============================================================
  // DOM refs
  // ============================================================
  const $ = id => document.getElementById(id);
  const setupView = $('ddzSetup');
  const tableView = $('ddzTable');
  // 进页面默认：牌桌可见（"初始化"状态），setup 浮层显在其上（参考合成大西瓜）
  if (tableView) tableView.hidden = false;
  if (setupView) setupView.hidden = false;
  const _lobbyAtInit = document.getElementById('ddzLobby');
  if (_lobbyAtInit) _lobbyAtInit.hidden = true;
  const _gameOverAtInit = document.getElementById('ddzGameOverOverlay');
  if (_gameOverAtInit) _gameOverAtInit.classList.remove('show', 'has-spring');
  const handEl = $('ddzHand');
  const playActions = $('ddzPlayActions');
  const playBtn = $('ddzPlayBtn');
  const passBtn = $('ddzPassBtn');
  const hintBtn = $('ddzHintBtn');
  const bidPanel = $('ddzBidPanel');
  const bidTitle = $('ddzBidTitle');
  const bidButtonsEl = $('ddzBidButtons');
  const statusMsg = $('ddzStatusMsg');
  const multiEl = $('ddzMultiplier');
  const bottomPileEl = $('ddzBottomPile');
  const gameOverOverlay = $('ddzGameOverOverlay');
  const gameOverTitle = $('ddzGameOverTitle');
  const gameOverDetail = $('ddzGameOverDetail');

  // 三档难度 tab
  document.querySelectorAll('.ddz-mode-tab').forEach(t => {
    t.addEventListener('click', () => {
      if (state.phase !== PHASE.IDLE && state.phase !== PHASE.SETTLEMENT) return;
      document.querySelectorAll('.ddz-mode-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      state.difficulty = t.dataset.diff;
    });
  });

  $('ddzStartBtn').addEventListener('click', () => startNewGame());
  // 明牌开始 ×5：发牌前就锁定明牌；和发牌阶段按钮（×5/×4/×3/×2 递减）共存
  $('ddzDeclareStartBtn').addEventListener('click', () => startNewGame({ declareStart: true }));
  // 智能分组开关（const / let 必须在 refreshGroupSortToggle() 调用前初始化，
  // 否则 TDZ 抛 ReferenceError，整个 IIFE 提前夭折 → 进游戏一片空白）
  const GROUP_SORT_KEY = 'tool.doudizhu.groupSort.v1';
  let groupSortEnabled = false;
  try { groupSortEnabled = localStorage.getItem(GROUP_SORT_KEY) === '1'; } catch {}
  refreshGroupSortToggle();
  $('ddzGroupSortToggle').addEventListener('click', () => setGroupSortEnabled(!groupSortEnabled));

  // 托管按钮 —— 点击切换 state.autopilot；开启后机器人会接管我的所有决策
  // （叫地主 / 抢地主 / 加倍 / 出牌 / 不出 / 明牌）
  const autopilotBtn = $('ddzAutopilotBtn');
  function refreshAutopilotBtn() {
    if (!autopilotBtn) return;
    if (state.autopilot) {
      autopilotBtn.classList.add('active');
      autopilotBtn.textContent = '✓ 托管中';
    } else {
      autopilotBtn.classList.remove('active');
      autopilotBtn.textContent = '🤖 托管';
    }
  }
  function setAutopilot(on) {
    state.autopilot = !!on;
    refreshAutopilotBtn();
    if (state.autopilot) triggerAutopilotIfMyTurn();
  }
  if (autopilotBtn) autopilotBtn.addEventListener('click', () => setAutopilot(!state.autopilot));
  refreshAutopilotBtn();

  // 用户点开"托管"时如果正好轮到我，立刻让 AI 接管：
  //   - 出牌阶段：调 autoPlayOnTimeout()（已有的代打逻辑）
  //   - 叫/抢地主：把当前按钮面板的 AI 决策路径走起
  //   - 加倍：把"我"加进 doubling AI 决策队列
  function triggerAutopilotIfMyTurn() {
    if (state.phase === PHASE.PLAYING && state.turnIdx === 0) {
      // 立刻让 AI 出牌：复用 autoPlayOnTimeout
      autoPlayOnTimeout();
    } else if (state.phase === PHASE.BIDDING && state.bidTurnIdx === 0
               && !bidPanel.hidden) {
      // 当前正在等我点叫/抢；直接走 AI 阈值决定
      const isCallPhase = state.landlordCandidate < 0;
      const score = AI.evaluateHand(state.hands[0]);
      const threshold = isCallPhase ? 3 : 8;
      const want = score >= threshold ? 'rob' : 'pass';
      bidPanel.hidden = true;
      handleBid(0, want);
    } else if (state.phase === PHASE.DOUBLING && !doubleDecided[0]) {
      const score = AI.evaluateHand(state.hands[0]);
      const want = score >= 8 ? 'double' : 'pass';
      commitDouble(0, want);
    }
  }
  // 全屏切换 —— 用 body class 而非浏览器 fullscreen API：
  // 1) 桌面：浏览器 fullscreen API 容易把整个浏览器进入全屏（含书签栏等）而非"游戏画幅"
  // 2) 手机：浏览器 fullscreen API 在 Safari 等基本不支持
  // body class 切换 → CSS 隐排行榜/评论、把 .ddz-wrap 固定铺满 viewport，跨平台稳定
  const fsBtn = $('ddzFullscreenToggle');
  function refreshFsBtn() {
    if (!fsBtn) return;
    const on = document.body.classList.contains('ddz-game-fullscreen');
    fsBtn.classList.toggle('on', on);
    fsBtn.textContent = on ? '⛶ 退出全屏' : '⛶ 全屏';
  }
  // 一进来就直接铺满 viewport——比"先看一眼局促的画幅再点全屏"舒服。
  // 想退出仍可点右上角"退出全屏"。
  document.body.classList.add('ddz-game-fullscreen');
  refreshFsBtn();
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      document.body.classList.toggle('ddz-game-fullscreen');
      refreshFsBtn();
    });
  }
  $('ddzPlayAgainBtn').addEventListener('click', () => {
    gameOverOverlay.classList.remove('show', 'has-spring');
    startNewGame();
  });
  $('ddzBackToSetupBtn').addEventListener('click', () => {
    gameOverOverlay.classList.remove('show', 'has-spring');
    state.phase = PHASE.IDLE;
    // 牌桌一直可见；只是清掉上一局残留 + 重新弹出 setup 浮层
    setupView.hidden = false;
    resetTableToIdle();
    if (ddzSettleBtn) ddzSettleBtn.setEnabled(false);
  });

  // 把牌桌还原成"初始化"状态（清手牌 / 清出牌区 / 清角标 / 隐操作按钮）
  // 给"换难度"和将来的"重玩"用，避免上局画面残留在 setup 浮层背后
  function resetTableToIdle() {
    state.hands = [[], [], []];
    state.bottom = [];
    state.bottomRevealed = false;
    state.bottomPlayed = new Set();
    state.landlordIdx = -1;
    state.lastTrick = null;
    state.declared = false;
    state.declaredSeat = -1;
    state.doubleActions = [];
    state.multiplier = 1;
    state.bombCount = 0;
    state.spring = 0;
    state.selected.clear();
    renderHand();
    renderHandCounts();
    renderBottomPile();
    clearAllPlayed();
    renderRoles();
    renderMultiplier();
    if (bidPanel) bidPanel.hidden = true;
    if (playActions) playActions.hidden = true;
    const dealBtn = document.getElementById('ddzDealDeclareBtn');
    if (dealBtn) dealBtn.hidden = true;
  }

  // 叫 / 抢 / 加倍 按钮的 click 在 renderBidButtons 时绑定（动态）

  // 出牌按钮
  playBtn.addEventListener('click', () => playerPlay());
  passBtn.addEventListener('click', () => playerPass());
  hintBtn.addEventListener('click', () => playerHint());
  // 明牌按钮（地主未明牌 + 出牌阶段才显示）
  const declareBtnEl = $('ddzDeclareBtn');
  if (declareBtnEl) declareBtnEl.addEventListener('click', () => playerDeclareInPlay());

  // 键盘：Enter=出牌，Space=不出，H=提示
  document.addEventListener('keydown', e => {
    if (state.phase !== PHASE.PLAYING) return;
    if (state.turnIdx !== 0) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'Enter') { e.preventDefault(); playerPlay(); }
    else if (e.code === 'Space') { e.preventDefault(); playerPass(); }
    else if (e.code === 'KeyH') { e.preventDefault(); playerHint(); }
  });

  // ============================================================
  // 渲染：CSS 自绘卡片（角标 rank+suit + 中央 pip）
  // ============================================================
  const RANK_LABELS = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
  const SUIT_LABELS = ['♠','♥','♦','♣'];

  function cardDisplayInfo(c) {
    if (c === 52) return { isJoker: true, jokerKind: 'small', cornerRk: '★' };
    if (c === 53) return { isJoker: true, jokerKind: 'big',   cornerRk: '★' };
    const r = E.cardRank(c);
    const s = E.cardSuit(c);
    return {
      rank: RANK_LABELS[r],
      suit: SUIT_LABELS[s],
      red: (s === 1 || s === 2),
      isJoker: false,
    };
  }

  function buildCardEl(c, sizeClass, opts) {
    opts = opts || {};
    const info = cardDisplayInfo(c);
    const el = document.createElement('span');
    let cls = 'ddz-card ' + sizeClass;
    if (info.isJoker) {
      cls += ' is-joker ' + (info.jokerKind === 'big' ? 'joker-big' : 'joker-small');
    } else {
      cls += ' ' + (info.red ? 'suit-red' : 'suit-black');
    }
    el.className = cls;
    if (opts.cid != null) el.dataset.cid = opts.cid;
    if (opts.selected) el.classList.add('selected');

    if (info.isJoker) {
      // 角标：JOKER 竖排文字
      for (const pos of ['tl', 'br']) {
        const corner = document.createElement('span');
        corner.className = 'corner ' + pos;
        const rk = document.createElement('span');
        rk.className = 'rk';
        rk.textContent = info.cornerRk;
        corner.appendChild(rk);
        el.appendChild(corner);
      }
      // pip：JOKER 文字 + 小冠图标
      const pip = document.createElement('span');
      pip.className = 'pip';
      const txt = document.createElement('span');
      txt.className = 'joker-text';
      txt.textContent = 'JOKER';
      const icon = document.createElement('span');
      icon.className = 'joker-icon';
      // ♛ (大王 - 红) / ♚ (小王 - 黑)，更经典的"小丑王冠"
      icon.textContent = info.jokerKind === 'big' ? '♛' : '♚';
      pip.appendChild(txt);
      pip.appendChild(icon);
      el.appendChild(pip);
    } else {
      // 普通牌：双角标 + 中央 pip
      for (const pos of ['tl', 'br']) {
        const corner = document.createElement('span');
        corner.className = 'corner ' + pos;
        const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = info.rank;
        corner.appendChild(rk);
        const su = document.createElement('span'); su.className = 'su'; su.textContent = info.suit;
        corner.appendChild(su);
        el.appendChild(corner);
      }
      const pip = document.createElement('span');
      pip.className = 'pip';
      pip.textContent = info.suit;
      el.appendChild(pip);
    }
    return el;
  }

  // 渲染用降序排序：从大到小（左 → 右），玩家更直观
  function sortHandDesc(cards) {
    return cards.slice().sort((a, b) => E.cardWeight(b) - E.cardWeight(a) || E.cardSuit(b) - E.cardSuit(a));
  }

  // ========== 智能分组排序 (B1) ==========
  // 把手牌按 decomposeHand 拆成牌型组，组内紧凑、组间留白，整体 lead-card 大的组在左
  // 返回 [{ card, groupId, isStart }, ...]
  const GROUP_DISPLAY_RANK = {
    [T.STRAIGHT]: 1, [T.PAIR_STRAIGHT]: 1,
    [T.PLANE]: 2, [T.PLANE_ONE]: 2, [T.PLANE_PAIR]: 2,
    [T.BOMB]: 3, [T.ROCKET]: 3,
    [T.FOUR_TWO]: 3, [T.FOUR_TWO_PAIR]: 3,
    [T.TRIPLE]: 4, [T.TRIPLE_ONE]: 4, [T.TRIPLE_PAIR]: 4,
    [T.PAIR]: 5,
    [T.SINGLE]: 6,
  };
  function arrangeHandByGroups(hand) {
    if (!hand || !hand.length) return [];
    const decomp = E.decomposeHand(hand);
    // 每组按"组型重要性 → 组内最大 weight 降序"排序
    decomp.sort((a, b) => {
      const ra = GROUP_DISPLAY_RANK[a.type] || 99;
      const rb = GROUP_DISPLAY_RANK[b.type] || 99;
      if (ra !== rb) return ra - rb;
      const wa = Math.max(...a.cards.map(c => E.cardWeight(c)));
      const wb = Math.max(...b.cards.map(c => E.cardWeight(c)));
      return wb - wa;
    });
    const out = [];
    decomp.forEach((p, gi) => {
      // 组内按 weight 降序 + 同 weight 按 suit 降序
      const cards = p.cards.slice().sort((a, b) => E.cardWeight(b) - E.cardWeight(a) || E.cardSuit(b) - E.cardSuit(a));
      cards.forEach((c, i) => out.push({ card: c, groupId: gi, isStart: i === 0 && gi > 0 }));
    });
    return out;
  }

  // ── 手机端关键修复：一行牌（手牌 / 出牌区）总能完整显示 ──
  // 牌靠负 margin 叠放；牌多 + 屏窄时一行放不下。原来 justify-content:center
  // 会把最左边几张牌挤到滚不到也点不到的位置（牌上 touch-action:none，
  // 没法滑动）——这就是"看不全自己的牌 / 对手的牌"。这里按容器实际可用
  // 宽度反算每张该露多少，动态写 --*-overlap，保证 N 张牌正好铺满、张张可见。
  function fitCardRow(container, overlapVar, minStep, availOverride) {
    if (!container) return;
    container.style.removeProperty(overlapVar);            // 先回到 CSS 默认
    const cards = container.querySelectorAll('.ddz-card, .ddz-card-back');
    const n = cards.length;
    if (n < 2) return;
    const cardW = cards[0].offsetWidth;
    const avail = availOverride || container.clientWidth;
    if (!cardW || !avail) return;                          // 容器还没布局好（隐藏中）→ 跳过，resize/重渲染时再算
    const cs = getComputedStyle(container);
    const defOverlap = parseFloat(cs.getPropertyValue(overlapVar)) || 0;
    const defStep = cardW - defOverlap;                    // CSS 默认每张露出的宽度
    const fitStep = (avail - cardW) / (n - 1);             // 要全塞下时每张该露的宽度
    let step = Math.min(defStep, fitStep);
    step = Math.max(step, minStep || 12);                  // 不压到看不清
    const overlap = Math.max(0, cardW - step);
    if (overlap > defOverlap + 0.5) {                      // 只在确实更挤时覆盖；默认能放下就保留居中观感
      container.style.setProperty(overlapVar, overlap.toFixed(2) + 'px');
    }
  }

  // 手牌专用：用户要求"始终一排、绝不滚动"。优先收 overlap，压到可读下限
  // 仍放不下时再等比收窄卡宽，保证任意机型 / 地主 20 张牌都在一行内、张张可点。
  function fitHandRow() {
    const c = handEl;
    if (!c) return;
    c.style.removeProperty('--ddz-card-overlap');          // 先全部回到 CSS 默认再量
    c.style.removeProperty('--ddz-card-w');
    c.style.removeProperty('--ddz-card-h');
    const n = c.querySelectorAll('.ddz-card, .ddz-card-back').length;
    if (n < 2) return;
    const avail = c.clientWidth - 2;                        // 留 2px 安全余量
    if (avail <= 0) return;                                 // 隐藏/未布局 → 重渲染或 resize 时再算
    const cs = getComputedStyle(c);
    const cardW = parseFloat(cs.getPropertyValue('--ddz-card-w')) || 0;
    const cardH = parseFloat(cs.getPropertyValue('--ddz-card-h')) || 0;
    const defOverlap = parseFloat(cs.getPropertyValue('--ddz-card-overlap')) || 0;
    if (!cardW) return;
    const MIN_STEP = 14;                                    // 每张至少露 14px：角标可读可点
    const MIN_W = 26;                                       // 卡宽下限
    const fitStep = (avail - cardW) / (n - 1);              // 默认卡宽下全塞进一行每张该露的宽
    if (fitStep >= cardW - defOverlap) return;              // 默认就放得下 → 保持居中观感
    if (fitStep >= MIN_STEP) {                              // 仅收 overlap 就够
      c.style.setProperty('--ddz-card-overlap', (cardW - fitStep).toFixed(2) + 'px');
      return;
    }
    // overlap 到下限仍放不下 → 等比收窄卡宽，再按 MIN_STEP 贴合
    const newW = Math.max(MIN_W, avail - (n - 1) * MIN_STEP);
    c.style.setProperty('--ddz-card-w', newW.toFixed(1) + 'px');
    if (cardH) c.style.setProperty('--ddz-card-h', (cardH * newW / cardW).toFixed(1) + 'px');
    // 极窄机型卡宽到下限仍超 → 步长再压到能放下（牌很窄但仍单行不滚动，硬约束优先）
    const step2 = Math.min(MIN_STEP, (avail - newW) / (n - 1));
    c.style.setProperty('--ddz-card-overlap', Math.max(0, newW - step2).toFixed(2) + 'px');
  }

  function fitDoudizhuRows() {
    fitHandRow();
    for (let s = 0; s < 3; s++) {
      const el = $('ddzPlayed' + s);
      if (!el) continue;
      // s=0 自己出牌区在 decision-slot（较宽，min-step 10 留可读）。
      // s=1/2 在各自头像下的半屏区：min-step 6 → 12 张顺子 / 飞机这种
      // 长牌型也能压进半屏一行不被剪，仍能看清每张角标。
      fitCardRow(el, '--ddz-card-mini-overlap', s === 0 ? 10 : 6);
    }
  }

  let _ddzRefitTimer;
  function scheduleRefit(delay) {
    clearTimeout(_ddzRefitTimer);
    _ddzRefitTimer = setTimeout(fitDoudizhuRows, delay);
  }
  window.addEventListener('resize', () => scheduleRefit(120));
  // 旋转后 iOS 可能短暂报旧尺寸 → 稍长延时再算（自愿横屏 / 转回竖屏都重排）
  window.addEventListener('orientationchange', () => scheduleRefit(260));

  function renderHand() {
    handEl.innerHTML = '';
    if (!state.hands[0].length) return;
    // 是否启用智能分组（默认关，玩家自己排）— setup 屏 toggle 可开
    const useGroups = !!groupSortEnabled;
    const arranged = useGroups
      ? arrangeHandByGroups(state.hands[0])
      : sortHandDesc(state.hands[0]).map((c, i) => ({ card: c, groupId: 0, isStart: false }));
    arranged.forEach((item) => {
      const c = item.card;
      const cardEl = buildCardEl(c, 'size-full', { cid: c, selected: state.selected.has(c) });
      if (item.isStart) cardEl.classList.add('group-start');
      cardEl.addEventListener('pointerdown', e => onCardPointerDown(e, cardEl, c));
      cardEl.addEventListener('mouseenter', () => {
        if (!canSelectCards()) return;
        if (state.selected.has(c)) return;
        cardEl.classList.add('hover-preview');
      });
      cardEl.addEventListener('mouseleave', () => cardEl.classList.remove('hover-preview'));
      handEl.appendChild(cardEl);
    });
    requestAnimationFrame(fitDoudizhuRows);
  }

  // 智能分组开关（默认关；玩家可在 setup 屏 toggle）
  // 注：const GROUP_SORT_KEY / let groupSortEnabled 已经在更上面 refreshGroupSortToggle() 调用前初始化
  function setGroupSortEnabled(b) {
    groupSortEnabled = !!b;
    try { localStorage.setItem(GROUP_SORT_KEY, groupSortEnabled ? '1' : '0'); } catch {}
    if (state.hands[0] && state.hands[0].length) renderHand();
    refreshGroupSortToggle();
  }
  function refreshGroupSortToggle() {
    const btn = document.getElementById('ddzGroupSortToggle');
    if (!btn) return;
    btn.classList.toggle('on', groupSortEnabled);
    btn.textContent = groupSortEnabled ? '🧩 理牌：开' : '🧩 理牌：关';
    btn.classList.toggle('active', groupSortEnabled);
  }

  // ============================================================
  // 拖动连续选牌（pointer events 统一处理）+ 智能补全
  // ============================================================
  function canSelectCards() {
    return state.phase === PHASE.PLAYING;
  }

  let dragActive = false;
  let dragPointerId = null;
  let dragMode = null;          // 'add' | 'remove'
  let dragLastCid = null;
  let dragMoved = false;        // 是否真的移动过（不止初始 down）

  function onCardPointerDown(e, cardEl, cid) {
    if (e.button != null && e.button !== 0) return;  // 仅左键 / 主指
    if (!canSelectCards()) return;
    e.preventDefault();
    dragActive = true;
    dragPointerId = e.pointerId;
    dragMode = state.selected.has(cid) ? 'remove' : 'add';
    dragLastCid = null;
    dragMoved = false;
    applyDragToCard(cardEl, cid);
    // 让后续 move/up 派发到这张卡片（即使手指/光标已离开）
    try { cardEl.setPointerCapture(e.pointerId); } catch {}
  }

  function applyDragToCard(cardEl, cid) {
    if (dragLastCid === cid) return;
    if (dragLastCid !== null) dragMoved = true;
    dragLastCid = cid;
    if (dragMode === 'add') state.selected.add(cid);
    else { state.selected.delete(cid); snapLockedThisTrick = true; }   // 任何"取消"动作 → 锁
    cardEl.classList.toggle('selected', state.selected.has(cid));
    playSfx('click');
    updatePlayBtnState();
  }

  function endDragSelect() {
    if (!dragActive) return;
    dragActive = false;
    dragPointerId = null;
    dragLastCid = null;
    dragMoved = false;
    scheduleSmartSnap();
  }

  function pointToCardEl(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) return null;
    const card = target.closest('.ddz-card.size-full');
    if (!card || !handEl.contains(card)) return null;
    return card;
  }

  // pointermove 在 document 上监听 — 即便 setPointerCapture 把目标转到 cardEl，
  // 冒泡到 document 仍能触发；如果某些浏览器不冒泡，这里也兜底从坐标查找新卡片
  document.addEventListener('pointermove', e => {
    if (!dragActive) return;
    if (dragPointerId != null && e.pointerId !== dragPointerId) return;
    const card = pointToCardEl(e.clientX, e.clientY);
    if (!card) return;
    const cid = parseInt(card.dataset.cid, 10);
    if (!Number.isFinite(cid)) return;
    applyDragToCard(card, cid);
  });
  document.addEventListener('pointerup', e => {
    if (dragPointerId != null && e.pointerId !== dragPointerId) return;
    endDragSelect();
  });
  document.addEventListener('pointercancel', endDragSelect);

  // 智能补全：把当前选中"吸附"到最接近的合法牌型
  // 规则同前；但加 lock —— 用户做过"取消选中" / 已经吸附过一次后，本 trick 内不再触发
  let snapTimer = null;
  let snapLockedThisTrick = false;        // 本 trick 内是否已锁（用户操作过 → 听玩家）
  function scheduleSmartSnap(delayMs) {
    if (snapLockedThisTrick) return;
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(() => { snapTimer = null; smartSnap(); }, delayMs == null ? 280 : delayMs);
  }

  function smartSnap() {
    if (!canSelectCards()) return;
    if (state.selected.size < 3) return;
    const cardsArr = Array.from(state.selected);
    if (E.parsePattern(cardsArr)) return;  // 已合法，无需吸附
    const hand = state.hands[0];
    if (!hand || !hand.length) return;
    const candidates = E.enumerateBeats(hand, null);   // 所有合法牌型
    if (!candidates.length) return;
    const sel = state.selected;
    let best = null;
    let bestKey = null;   // [dist, -pattern.size, weight]
    for (const p of candidates) {
      const pSet = p.cards;
      let overlap = 0;
      for (const c of pSet) if (sel.has(c)) overlap++;
      const removed = sel.size - overlap;     // 选中里被吸附掉的
      const added = pSet.length - overlap;     // 吸附进来的
      const dist = removed + added;
      // 重叠不够，跳过
      if (overlap * 2 < sel.size) continue;
      // 三种通过条件
      const pureExpand = removed === 0 && dist <= 4;
      const pureContract = added === 0 && dist <= 3 && pSet.length >= 3;
      const mixed = dist <= 2 && overlap * 10 >= sel.size * 6;
      if (!(pureExpand || pureContract || mixed)) continue;
      const key = [dist, -pSet.length, p.weight];
      if (!bestKey || (key[0] !== bestKey[0] ? key[0] < bestKey[0] :
                       key[1] !== bestKey[1] ? key[1] < bestKey[1] :
                       key[2] < bestKey[2])) {
        bestKey = key;
        best = p;
      }
    }
    if (!best) return;
    state.selected.clear();
    for (const c of best.cards) state.selected.add(c);
    snapLockedThisTrick = true;          // 自动补全过一次就锁，剩下听玩家
    renderHand();
    updatePlayBtnState();
    if (state.phase === PHASE.PLAYING && state.turnIdx === 0) {
      setStatus('已自动补全为：' + describePattern(best) + '（之后听你调整）');
    }
  }

  function renderHandCounts() {
    $('ddzCount0').textContent = state.hands[0].length;
    $('ddzCount1').textContent = state.hands[1].length;
    $('ddzCount2').textContent = state.hands[2].length;
  }

  function renderRoles() {
    for (let i = 0; i < 3; i++) {
      const av = $('ddzAvatar' + i);
      av.classList.toggle('is-landlord', i === state.landlordIdx);
      av.classList.toggle('is-current',
        (i === state.turnIdx && state.phase === PHASE.PLAYING) ||
        (i === state.bidTurnIdx && state.phase === PHASE.BIDDING) ||
        (i === state.doubleTurnIdx && state.phase === PHASE.DOUBLING)
      );
      const dbBadge = $('ddzDoubled' + i);
      if (dbBadge) dbBadge.hidden = !seatDoubled(i);
      const dcBadge = $('ddzDeclared' + i);
      if (dcBadge) dcBadge.hidden = (state.declaredSeat !== i);
    }
    // 同步明牌按钮可见性（地主未明牌 + 出牌阶段才显示）
    updateDeclareBtn();
    if (state.landlordIdx >= 0) {
      const role = state.landlordIdx === 0 ? '地主' : '农民';
      $('ddzName0').textContent = '我（' + role + '）';
    } else {
      $('ddzName0').textContent = '我';
    }
    applyAttentionFocus();
  }

  // 注意力锁定：非当前 actor 的座位 / 我的手牌 dim 一档
  function applyAttentionFocus() {
    const selfEl = document.querySelector('.ddz-self');
    const aiEls = document.querySelectorAll('.ddz-seat-ai');
    const handEl2 = document.getElementById('ddzHand');
    // 总是先清掉
    if (selfEl) selfEl.classList.remove('is-dim');
    aiEls.forEach(e => e.classList.remove('is-dim'));
    if (handEl2) handEl2.classList.remove('is-dim');
    // BIDDING 阶段不调暗 —— 用户希望三家叫/抢决策一样明亮、一目了然
    // DOUBLING 同时决策 也不 dim
    // 只有 PLAYING 阶段才 dim 非 actor 座位
    if (state.phase !== PHASE.PLAYING) return;
    const curr = state.turnIdx;
    if (curr < 0) return;
    if (curr === 0) {
      aiEls.forEach(e => {
        const ds = parseInt(e.dataset.seat || '0', 10);
        if (ds !== 0) e.classList.add('is-dim');
      });
    } else {
      if (selfEl) selfEl.classList.add('is-dim');
      aiEls.forEach(e => {
        const ds = parseInt(e.dataset.seat || '0', 10);
        if (ds !== curr) e.classList.add('is-dim');
      });
      if (handEl2) handEl2.classList.add('is-dim');
    }
  }

  // 判断某个显示座位是否选了加倍
  function seatDoubled(seat) {
    if (state.mode === 'online' && state.online && state.online.doubleChoice) {
      return state.online.doubleChoice[seat] === 'double';
    }
    // 单机：在 doubleActions 里查（注意单机的 actions 也已是显示坐标）
    if (state.doubleActions && state.doubleActions.length) {
      const a = state.doubleActions.find(x => x.seat === seat);
      return a && a.double;
    }
    return false;
  }

  function renderPlayedAt(seat, pattern) {
    const el = $('ddzPlayed' + seat);
    el.innerHTML = '';
    // 重置 fx classes（保留 ddz-played 基础类）
    el.className = 'ddz-played';
    if (!pattern) return;
    if (pattern === 'pass') {
      const tag = document.createElement('span');
      tag.className = 'pass-tag';
      tag.textContent = '不出';
      el.appendChild(tag);
      return;
    }
    // 按牌型加 fx-* class
    const fxClass = patternFxClass(pattern.type);
    if (fxClass) el.classList.add(fxClass);
    const sortedCards = sortHandDesc(pattern.cards);
    for (const c of sortedCards) {
      el.appendChild(buildCardEl(c, 'size-mini'));
    }
    // 牌型文字提示：浮在这家出牌区顶部（炸弹 / 王炸 更醒目）
    const pname = patternName(pattern);
    if (pname) {
      const lbl = document.createElement('span');
      lbl.className = 'ddz-ptype';
      if (pattern.type === T.BOMB) { lbl.classList.add('is-bomb'); lbl.textContent = '炸弹!'; }
      else if (pattern.type === T.ROCKET) { lbl.classList.add('is-rocket'); lbl.textContent = '王炸!'; }
      else lbl.textContent = pname;
      el.appendChild(lbl);
    }
    requestAnimationFrame(fitDoudizhuRows);
    // 王炸特别处理：触发全屏地震 + 金光闪屏 + 粒子四射
    if (pattern.type === T.ROCKET) triggerRocketFullscreenFX();
  }

  function triggerRocketFullscreenFX() {
    const wrap = document.querySelector('.ddz-wrap');
    if (wrap) {
      wrap.classList.remove('mega-quake');
      // force reflow 重启动画
      // eslint-disable-next-line no-unused-expressions
      wrap.offsetWidth;
      wrap.classList.add('mega-quake');
      setTimeout(() => wrap.classList.remove('mega-quake'), 1200);
    }
    // 全屏金色闪光
    const flash = document.createElement('div');
    flash.className = 'ddz-fullscreen-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1400);
    // 全屏粒子（随机散布 24 颗 ✦）
    const stars = document.createElement('div');
    stars.className = 'ddz-fullscreen-stars';
    for (let i = 0; i < 24; i++) {
      const s = document.createElement('span');
      s.textContent = '✦';
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = 22 + Math.random() * 26;
      const delay = Math.random() * 0.3;
      s.style.left = x + '%';
      s.style.top = y + '%';
      s.style.fontSize = size + 'px';
      s.style.animationDelay = delay + 's';
      stars.appendChild(s);
    }
    document.body.appendChild(stars);
    setTimeout(() => stars.remove(), 1600);
    // 设备震动（手机）
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 80, 30, 100]); } catch {}
  }

  function patternFxClass(type) {
    if (type === T.STRAIGHT) return 'fx-straight';
    if (type === T.PAIR_STRAIGHT) return 'fx-pair-straight';
    if (type === T.PLANE || type === T.PLANE_ONE || type === T.PLANE_PAIR) return 'fx-plane';
    if (type === T.BOMB) return 'fx-bomb';
    if (type === T.ROCKET) return 'fx-rocket';
    return null;
  }

  // 牌型中文名：只对"看一眼能更快读懂"的大牌型给提示。
  // 单牌/对子/三条/三带X/四带X 一目了然，不显示；飞机各变体统一显示"飞机"。
  function patternName(pattern) {
    if (!pattern || !pattern.type) return '';
    switch (pattern.type) {
      case T.STRAIGHT: return '顺子';
      case T.PAIR_STRAIGHT: return '连对';
      case T.PLANE:
      case T.PLANE_ONE:
      case T.PLANE_PAIR: return '飞机';
      case T.BOMB: return '炸弹';
      case T.ROCKET: return '王炸';
      default: return '';
    }
  }

  // Bug 7: 公布地主牌动画 — 3 张底牌从中央桌面"飞入"地主手牌区
  // 地主 = seat 0 (我): 飞到下方 .ddz-hand 中央
  // 地主 = seat 1/2 (AI): 飞到对应 .ddz-avatar 中央
  function flyBottomToLandlord(bottomCards, landlordSeat) {
    if (!bottomCards || bottomCards.length === 0) return;
    const srcEl = document.getElementById('ddzBottomPile');
    if (!srcEl) return;
    const srcRect = srcEl.getBoundingClientRect();
    const destEl = landlordSeat === 0
      ? document.getElementById('ddzHand')
      : document.getElementById('ddzAvatar' + landlordSeat);
    if (!destEl) return;
    const destRect = destEl.getBoundingClientRect();
    const destX = destRect.left + destRect.width / 2;
    const destY = destRect.top + destRect.height / 2;

    // 用 srcEl 的 3 张底牌 children 作为基准位置
    const cardEls = Array.from(srcEl.querySelectorAll('.ddz-card'));
    cardEls.forEach((origCard, i) => {
      const r = origCard.getBoundingClientRect();
      const cardId = bottomCards[i];
      const clone = buildCardEl(cardId, 'size-bottom');
      clone.classList.add('ddz-bottom-fly');
      clone.style.left = (r.left + r.width / 2) + 'px';
      clone.style.top  = (r.top  + r.height / 2) + 'px';
      document.body.appendChild(clone);
      // 错开 50ms 让 3 张依次飞
      const delay = i * 60;
      const dx = destX - (r.left + r.width / 2);
      const dy = destY - (r.top  + r.height / 2);
      setTimeout(() => {
        clone.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.75)`;
        clone.style.opacity = '0.6';
      }, delay + 30);
      setTimeout(() => { clone.style.opacity = '0'; }, delay + 500);
      setTimeout(() => clone.remove(), delay + 700);
    });
  }

  function clearAllPlayed() {
    for (let i = 0; i < 3; i++) {
      const el = $('ddzPlayed' + i);
      el.innerHTML = '';
      el.className = 'ddz-played';   // 顺带把 settle-reveal 清掉
    }
    // 结算 reveal 残留：大字 banner / 飘字 / 樱花层 / 倍数 toast
    document.querySelectorAll(
      '.ddz-settle-banner, .ddz-coin-delta, .ddz-sakura-overlay, .ddz-mult-toast'
    ).forEach(el => el.remove());
  }

  function renderBottomPile() {
    bottomPileEl.innerHTML = '';
    if (!state.bottomRevealed) {
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('span');
        s.className = 'ddz-card-back';
        bottomPileEl.appendChild(s);
      }
      return;
    }
    for (const c of sortHandDesc(state.bottom)) {
      const el = buildCardEl(c, 'size-bottom');
      if (state.bottomPlayed && state.bottomPlayed.has(c)) el.classList.add('is-played');
      bottomPileEl.appendChild(el);
    }
  }

  function setStatus(msg) {
    // 已删除 .ddz-status-msg 视觉元素（信息冗余）；保留函数以兼容上百个调用点
    // 真正需要弹给用户看的关键错误请用 alert()，其它直接静默
    if (statusMsg) statusMsg.textContent = msg;
  }

  function renderMultiplier() {
    // 右下角 chip：显示"赢可得 N 分"。加倍是按对计算的（地主 vs 农民1、
    // 地主 vs 农民2 两条独立账），所以地主 / 农民这边显示的分数不一定一致。
    if (state.phase === PHASE.IDLE || state.phase === PHASE.DEALING || state.landlordIdx < 0) {
      multiEl.innerHTML = '';
      return;
    }
    multiEl.textContent = `${myScoreDisplay()} 分`;
  }

  // 不含加倍的"基础倍数"：robs × declared × bombs × spring。state.multiplier 在 finalizeDoubling
  // 之后已经不再自我乘 2 —— 加倍只通过 doubleSeatMap 影响每对账面。
  function currentMultiplier() {
    return state.multiplier * (1 << state.bombCount) * (1 << state.spring);
  }

  // 返回三家"是否加倍"，索引 = seat 0/1/2。
  // 加倍阶段进行中也能调用（已决的算数，未决的算未加倍）。
  function doubleSeatMap() {
    const map = [false, false, false];
    if (state.doubleActions && state.doubleActions.length) {
      for (const a of state.doubleActions) map[a.seat] = !!a.double;
    }
    if (state.phase === PHASE.DOUBLING && typeof doubleChoice !== 'undefined') {
      for (let i = 0; i < 3; i++) if (doubleChoice[i] === 'double') map[i] = true;
    }
    return map;
  }

  // "按对计算"的核心：返回每个农民座位对应那一对的倍数。
  //   pairMult(p) = base × (landlord 加倍?×2:×1) × (peasant p 加倍?×2:×1)
  // 没定地主时返回 base。
  function pairMultiplierFor(peasantSeat) {
    const base = currentMultiplier();
    if (state.landlordIdx < 0) return base;
    const d = doubleSeatMap();
    const landlordDouble = d[state.landlordIdx] ? 2 : 1;
    const peasantDouble = d[peasantSeat] ? 2 : 1;
    return base * landlordDouble * peasantDouble;
  }

  // 当前我（座位 0）这一局赢可得 / 输要付的分数。
  //   地主：两对账之和 (地主-农民1) + (地主-农民2)
  //   农民：和地主那一对账
  function myScoreDisplay() {
    if (state.landlordIdx < 0) return currentMultiplier() * 2;   // 占位，不真正用
    return computeMyScoreForMap(doubleSeatMap());
  }

  // 给定任意"三家加倍决定"映射，算我（座位 0）的总分。
  //   用途：加倍按钮 label 要预测"假设我点加倍后我能拿多少"
  function computeMyScoreForMap(dmap) {
    const base = currentMultiplier();
    if (state.landlordIdx < 0) return base * 2;
    const landlordDouble = dmap[state.landlordIdx] ? 2 : 1;
    const peasants = [0,1,2].filter(s => s !== state.landlordIdx);
    if (state.landlordIdx === 0) {
      // 地主 = 两对农民之和
      return peasants.reduce((sum, p) => sum + base * landlordDouble * (dmap[p] ? 2 : 1), 0);
    }
    // 农民只看自己那一对
    return base * landlordDouble * (dmap[0] ? 2 : 1);
  }

  function updatePlayBtnState() {
    if (state.phase !== PHASE.PLAYING || state.turnIdx !== 0) {
      playBtn.disabled = true; passBtn.disabled = true;
      return;
    }
    // "不出"按钮：只有上家出牌（lastTrick 存在且不是自己）才显示
    // 自己做庄时（lastTrick=null 或 lastTrick.seat === 0）压根不该有"不出"
    const canPass = state.lastTrick && state.lastTrick.seat !== 0;
    passBtn.hidden = !canPass;
    passBtn.disabled = !canPass;

    if (state.selected.size === 0) { playBtn.disabled = true; return; }
    const cards = Array.from(state.selected);
    const me = E.parsePattern(cards);
    if (!me) { playBtn.disabled = true; return; }
    const prev = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
    playBtn.disabled = !E.canBeat(me, prev);
  }

  // ============================================================
  // 流程控制
  // ============================================================
  function startNewGame(opts) {
    opts = opts || {};
    setupView.hidden = true;
    tableView.hidden = false;
    state.phase = PHASE.DEALING;
    // 托管开关每局自动重置，避免上局开了忘关
    state.autopilot = false;
    state.consecutiveTimeouts = 0;
    refreshAutopilotBtn();
    state.hands = [[], [], []];
    state.bottom = [];
    state.bottomRevealed = false;
    state.bottomPlayed = new Set();
    state.landlordIdx = -1;
    state.landlordCandidate = -1;
    state.bidActions = [];
    state.robCount = 0;
    state.doubleActions = [];
    state.multiplier = 1;
    state.bombCount = 0;
    state.spring = 0;
    state.declared = false;
    state.declaredSeat = -1;
    state.landlordPlayCount = 0;
    state.peasantPlayCount = 0;
    state.lastTrick = null;
    state.passCount = 0;
    state.selected.clear();
    state.seen = new Array(15).fill(0);
    state.aiPerceivedSeen = [
      null,
      new Array(15).fill(0),
      new Array(15).fill(0),
    ];
    state.runStartedAt = Date.now();
    state.runNonce = (window.GamesShell && GamesShell.Identity.newRunNonce()) || ('r-' + Date.now());
    state.result = null;
    state.resumed = false;

    if (ddzSettleBtn) ddzSettleBtn.setEnabled(false);

    const d = E.deal();
    state.hands[0] = d.hands[0];
    state.hands[1] = d.hands[1];
    state.hands[2] = d.hands[2];
    state.bottom = d.bottom;

    clearAllPlayed();
    renderHand();
    renderHandCounts();
    renderBottomPile();
    renderRoles();
    multiEl.textContent = '';

    // 发牌动画 — 17 张牌从大到小依次出现，4s 内逐张露出
    // 同时挂出"明牌 ×N"按钮，倍数随发牌进度从 5 降到 2，发完即隐
    const handDealEl = document.getElementById('ddzHand');
    if (handDealEl) handDealEl.classList.add('dealing');
    startDealDeclareWatcher(opts.declareStart);
  }

  // 发牌阶段「明牌 ×N」逻辑：
  //   t=0   → ×5
  //   t≈1s  → ×4   (第 ~4-5 张牌已揭开)
  //   t≈2s  → ×3   (~第 8-9 张)
  //   t≈3s  → ×2   (~第 13 张)
  //   t≈4s  → 隐藏（发牌结束）
  // 若 opts.declareStart=true（理论上 setup 已移除该入口，保留兼容），直接当成 ×5 明牌进入。
  const DEAL_TOTAL_MS = 4000;
  const DEAL_DECLARE_STEPS = [
    { atMs: 0,    mult: 5 },
    { atMs: 1000, mult: 4 },
    { atMs: 2000, mult: 3 },
    { atMs: 3000, mult: 2 },
  ];
  let dealTickerTimer = null;
  let dealEndAt = 0;
  let dealDeclareLockedMult = 0;   // 玩家点了之后锁住的 ×N（避免按钮文字再变）

  function startDealDeclareWatcher(declareStartImmediately) {
    clearDealDeclareWatcher();
    const btn = document.getElementById('ddzDealDeclareBtn');
    if (!btn) {
      // 没有按钮容器（极端 fallback）—— 直接发完进入叫地主
      setTimeout(() => enterBidding(), DEAL_TOTAL_MS + 200);
      return;
    }
    dealDeclareLockedMult = 0;
    dealEndAt = Date.now() + DEAL_TOTAL_MS;
    // 把发牌阶段的"明牌 ×N"按钮露出来：actions 行可见、只这一个按钮 visible
    playActions.hidden = false;
    // 强制把出牌阶段才用的按钮藏起来——上局如果停留在 PLAYING 阶段，
    // 这些 button 的 hidden 状态会泄漏到本局发牌画面
    if (passBtn) passBtn.hidden = true;
    if (hintBtn) hintBtn.hidden = true;
    if (playBtn) playBtn.hidden = true;
    if (declareBtnEl) declareBtnEl.hidden = true;
    btn.hidden = false;
    btn.disabled = false;
    btn.textContent = '明牌 ×5';

    // 兼容旧入口：如果调用方要求 declareStartImmediately，直接锁 ×5
    if (declareStartImmediately) {
      commitDealDeclare(5);
      return;
    }

    btn.onclick = () => {
      const elapsed = Date.now() - (dealEndAt - DEAL_TOTAL_MS);
      // 按当前阶梯定 N
      let mult = DEAL_DECLARE_STEPS[0].mult;
      for (const step of DEAL_DECLARE_STEPS) {
        if (elapsed >= step.atMs) mult = step.mult;
      }
      commitDealDeclare(mult);
    };

    function tick() {
      const left = dealEndAt - Date.now();
      if (left <= 0) {
        clearDealDeclareWatcher();
        // 发完 → 隐按钮 + 隐 actions 行 → 进入叫地主
        btn.hidden = true;
        playActions.hidden = true;
        const handDealEl = document.getElementById('ddzHand');
        if (handDealEl) handDealEl.classList.remove('dealing');
        if (dealDeclareLockedMult > 0) {
          enterBidding({ startSeat: 0 });
        } else {
          enterBidding();
        }
        return;
      }
      // 玩家已经锁了多少倍 → 按钮文字不再变（按钮也已隐）
      if (dealDeclareLockedMult > 0) return;
      const elapsed = DEAL_TOTAL_MS - left;
      let mult = DEAL_DECLARE_STEPS[0].mult;
      for (const step of DEAL_DECLARE_STEPS) {
        if (elapsed >= step.atMs) mult = step.mult;
      }
      btn.textContent = `明牌 ×${mult}`;
    }
    tick();
    dealTickerTimer = setInterval(tick, 150);
  }

  function commitDealDeclare(mult) {
    dealDeclareLockedMult = mult;
    state.declared = true;
    state.declaredSeat = 0;
    state.multiplier = mult;
    renderRoles();
    renderMultiplier();
    const btn = document.getElementById('ddzDealDeclareBtn');
    if (btn) { btn.disabled = true; btn.hidden = true; }
    // 玩家已经决定明牌 → actions 行收起来，剩下发牌动画静静走完
    playActions.hidden = true;
  }

  function clearDealDeclareWatcher() {
    if (dealTickerTimer) { clearInterval(dealTickerTimer); dealTickerTimer = null; }
  }

  function pushSplashLog(text) {
    // 简化：暂时只 setStatus；将来可以做 toast 动画
    setStatus(text);
  }

  // ============================================================
  // 叫/抢地主流程：
  //   1) 叫阶段：从 bidStartSeat 起，按顺序每人 1 次 "叫/不叫" 机会
  //      - 有人叫 → 进入抢阶段
  //      - 全员都不叫 → 重发
  //   2) 抢阶段：每位玩家（含原本叫地主的人）都有且仅有 1 次 "抢/不抢" 机会
  //      - 当 candidate 已是自己时不再问（不能抢自己）
  //      - 每抢一次 multiplier ×2
  //   3) 抢阶段所有人决定完后 finalize，最后的 candidate 当地主
  //
  // 例：我叫 → 下家抢 → 上家抢 → 我还有"反抢"机会（旧实现错过了这步）
  // ============================================================
  function enterBidding(opts) {
    opts = opts || {};
    state.phase = PHASE.BIDDING;
    state.bidStartSeat = (typeof opts.startSeat === 'number') ? opts.startSeat : Math.floor(Math.random() * 3);
    state.bidTurnIdx = state.bidStartSeat;
    state.bidActions = [];
    state.landlordCandidate = -1;
    state.robCount = 0;
    state.callDecided = [false, false, false];   // 叫阶段是否已表态
    state.callPassed  = [false, false, false];   // 叫阶段选了"不叫"——按规则丧失"抢"资格
    state.robDecided  = [false, false, false];   // 抢阶段是否已表态
    renderRoles();
    nextBidTurn();
  }

  // 在某座位的 .ddz-played 区域贴一个 bid-tag（叫/不叫/抢/不抢）
  function renderBidTagAt(seat, act, isFirst) {
    const el = $('ddzPlayed' + seat);
    if (!el) return;
    el.className = 'ddz-played';
    const tag = document.createElement('span');
    tag.className = 'bid-tag ' + (act === 'rob' ? 'rob' : 'pass');
    if (act === 'rob') tag.textContent = isFirst ? '叫地主' : '抢地主';
    else tag.textContent = isFirst ? '不叫' : '不抢';
    el.innerHTML = '';
    el.appendChild(tag);
  }
  function renderBidThinkingAt(seat) {
    const el = $('ddzPlayed' + seat);
    if (!el) return;
    el.className = 'ddz-played';
    el.innerHTML = '<span class="think-tag">思考</span>';
  }

  function nextBidTurn() {
    // 阶段 1：叫地主（still no candidate, 还有人没表态）
    if (state.landlordCandidate < 0) {
      const callPending = state.callDecided.some(d => !d);
      if (!callPending) {
        // 全员都不叫 → 重发
        setStatus('三家都没叫地主，重新发牌');
        setTimeout(() => startNewGame(), 1200);
        return;
      }
      // 从 bidTurnIdx 起找下一个未表态的 seat
      for (let i = 0; i < 3; i++) {
        const seat = (state.bidTurnIdx + i) % 3;
        if (!state.callDecided[seat]) {
          state.bidTurnIdx = seat;
          presentBidChoice(seat, /*isCall=*/true);
          return;
        }
      }
      return; // 兜底
    }

    // 阶段 2：抢地主（已有 candidate）
    // 每个非 candidate 的 seat 都有 1 次抢机会
    // 规则：在叫阶段已经"不叫"的玩家无法"抢地主"——直接跳过
    for (let i = 0; i < 3; i++) {
      const seat = (state.bidTurnIdx + i) % 3;
      if (state.robDecided[seat]) continue;
      if (seat === state.landlordCandidate) continue;   // 不能抢自己
      if (state.callPassed[seat]) continue;              // 不叫过 → 无抢资格
      state.bidTurnIdx = seat;
      presentBidChoice(seat, /*isCall=*/false);
      return;
    }

    // 抢阶段全员决定完 → 等 800ms 让玩家看清最后一手，再 finalize
    setTimeout(() => finalizeLandlord(), 800);
  }

  function presentBidChoice(seat, isCall) {
    // 进入"叫/抢"决策 — 隐掉加倍阶段才用的 corner 倒计时
    const cdEl = document.getElementById('ddzDoubleCountdown');
    if (cdEl) cdEl.hidden = true;
    // 不再写"轮到 X 叫地主"之类的文字 — 按钮 / 思考 tag 已经说清楚状态了
    setStatus('');
    // 托管：自己这局也走 AI 路径
    const useAi = seat !== 0 || state.autopilot;
    if (!useAi) {
      bidPanel.hidden = false;
      bidTitle.textContent = '';   // 只露按钮，规则三的"不要多余文字"
      renderBidButtons([
        { label: isCall ? '叫地主' : '抢地主', value: 'rob', primary: true },
        { label: isCall ? '不叫' : '不抢', value: 'pass' },
      ], handleBid);
      // 倒计时：BID_TIMEOUT_MS 内不点 → 默认不叫/不抢
      startTurnCountdown(() => {
        if (state.phase === PHASE.BIDDING && state.bidTurnIdx === 0 && !bidPanel.hidden) {
          handleBid(0, 'pass');
        }
      }, 0, BID_TIMEOUT_MS);
    } else {
      bidPanel.hidden = true;
      renderBidThinkingAt(seat);
      // AI 头像上也亮 BID 时长的闹钟，跟玩家观感一致
      startTurnCountdown(null, seat, BID_TIMEOUT_MS);
      setTimeout(() => {
        const score = AI.evaluateHand(state.hands[seat]);
        // AI 阈值：叫阶段 3、抢阶段 8（避免无脑抢）
        const threshold = isCall ? 3 : 8;
        const want = score >= threshold ? 'rob' : 'pass';
        handleBid(seat, want);
      }, 700);
    }
  }

  function handleBid(seatOrAction, action) {
    let seat, act;
    if (typeof seatOrAction === 'number') {
      seat = seatOrAction;
      act = action;
    } else {
      seat = 0;
      act = seatOrAction;
    }
    // 决策已收 → 收掉这一回合的倒计时（避免到点回调和真实点击重复触发）
    stopTurnCountdown();
    bidPanel.hidden = true;
    const isCallPhase = state.landlordCandidate < 0;
    state.bidActions.push({ seat, action: act, phase: isCallPhase ? 'call' : 'rob' });
    renderBidTagAt(seat, act, isCallPhase);

    // 标记本阶段已表态
    if (isCallPhase) {
      state.callDecided[seat] = true;
      if (act === 'pass') state.callPassed[seat] = true;   // 失去"抢"资格（规则四·4）
    } else {
      state.robDecided[seat]  = true;
    }

    if (act === 'rob') {
      if (isCallPhase) {
        state.landlordCandidate = seat;
        // 叫地主本身不增加倍数；明牌开局的 ×5 / ×4 / ×3 不能被这里清掉。
        state.robCount = 1;
      } else {
        state.landlordCandidate = seat;
        state.multiplier *= 2;
        state.robCount++;
      }
      renderMultiplier();
    }
    // 决策结果通过座位上的 bid-tag 公开，不用再写状态文字
    state.bidTurnIdx = (state.bidTurnIdx + 1) % 3;
    setTimeout(() => nextBidTurn(), 700);
  }

  function finalizeLandlord() {
    if (state.landlordCandidate < 0) {
      // 三家都没叫，直接重发，不用状态文字
      setTimeout(() => startNewGame(), 1200);
      return;
    }
    state.landlordIdx = state.landlordCandidate;
    setStatus('');
    state.phase = PHASE.REVEAL;
    setTimeout(() => revealBottom(), 600);
  }

  // 检测底牌特殊情形，返回 { bonus, reasons }（bonus 是倍数累乘因子）
  function detectBottomBonus(bottom) {
    const weights = bottom.map(c => E.cardWeight(c));
    let bonus = 1;
    const reasons = [];
    const hasSmallJoker = weights.includes(13);
    const hasBigJoker = weights.includes(14);
    if (hasSmallJoker && hasBigJoker) {
      bonus *= 4;
      reasons.push('双王');
    } else if (hasSmallJoker) {
      bonus *= 2;
      reasons.push('含小王');
    } else if (hasBigJoker) {
      bonus *= 2;
      reasons.push('含大王');
    }
    const sorted = weights.slice().sort((a, b) => a - b);
    if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) {
      bonus *= 2;
      reasons.push('三同');
    } else if (sorted[2] < 12 && sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
      bonus *= 2;
      reasons.push('三连');
    }
    return { bonus, reasons };
  }

  function revealBottom() {
    state.bottomRevealed = true;
    renderBottomPile();

    // Bug 8: 底牌特殊情形加倍 — 含王 / 双王 / 三同 / 三连
    const bonusInfo = detectBottomBonus(state.bottom);
    if (bonusInfo.bonus > 1) {
      state.multiplier *= bonusInfo.bonus;
      setStatus(`底牌 ${bonusInfo.reasons.join(' + ')} — 倍数 ×${bonusInfo.bonus}`);
      renderMultiplier();
    }

    setTimeout(() => {
      const newBottom = state.bottom.slice();
      const landlordSeat = state.landlordIdx;

      // 公共：把底牌合入地主手牌 + 更新已见 + AI 感知 + 快照
      const mergeBottomIntoHand = () => {
        state.hands[landlordSeat] = state.hands[landlordSeat].concat(newBottom);
        for (const c of newBottom) state.seen[E.cardWeight(c)]++;
        aiPerceiveBottom();
        state.initialHands = [
          state.hands[0].slice(),
          state.hands[1].slice(),
          state.hands[2].slice(),
        ];
        renderHandCounts();
        renderRoles();
      };

      if (landlordSeat === 0) {
        // 我是地主：3 张底牌从底牌位"插空"飞到自己排序后的目标位
        animateBottomInsertIntoMyHand(newBottom, () => {
          // 动画结束后进加倍阶段（不需要再 renderHand —— animateBottomInsert 已经渲染完了）
          enterDoubling();
        });
        // 状态 / 已见 / 感知 在动画启动那一刻就更新好（hand 也已经合并）
      } else {
        // AI 是地主：保留原本"飞到 AI 头像"的动画
        flyBottomToLandlord(newBottom, landlordSeat);
        setTimeout(() => {
          mergeBottomIntoHand();
          renderHand();
          enterDoubling();
        }, 700);
      }
    }, 900);   // 给玩家看清底牌 + 特殊加成提示
  }

  // 我是地主时的"底牌插空"动画（FLIP 方式，分两步更柔和）：
  //   ① 先记录现有 17 张手牌的位置；
  //   ② 把 3 张底牌合入手牌、重排成 20 张并渲染（DOM 即终态）；
  //   ③ 让那 17 张老牌"从旧位置滑到新位置"——给底牌让位的微动画；
  //   ④ 老牌挪到位后，3 张底牌依次从中央底牌位飞入预留的空位；
  //   ⑤ 收尾后再把手牌计数从 17 改成 20。
  function animateBottomInsertIntoMyHand(bottomCards, onDone) {
    const handEl = document.getElementById('ddzHand');
    const pileEl = document.getElementById('ddzBottomPile');
    if (!handEl) { onDone && onDone(); return; }

    // ① 快照旧 17 张的位置（cid → DOMRect）
    const oldRects = new Map();
    handEl.querySelectorAll('.ddz-card').forEach(el => {
      const cid = Number(el.dataset.cid);
      if (!Number.isNaN(cid)) oldRects.set(cid, el.getBoundingClientRect());
    });

    // ② 合并状态 + 更新已见 / 感知 / 快照（先于渲染，否则 renderHand 不会渲染 20 张）
    state.hands[0] = state.hands[0].concat(bottomCards);
    for (const c of bottomCards) state.seen[E.cardWeight(c)]++;
    aiPerceiveBottom();
    state.initialHands = [
      state.hands[0].slice(),
      state.hands[1].slice(),
      state.hands[2].slice(),
    ];
    renderRoles();
    // 注意：renderHandCounts 留到收尾再调，让 17 → 20 跟动画收齐

    // 渲染完整 20 张（已排序）
    renderHand();

    // 区分新底牌 vs 老 17 张的 DOM
    const bottomSet = new Set(bottomCards);
    const cardEls = Array.from(handEl.querySelectorAll('.ddz-card'));
    const existingEls = cardEls.filter(el => !bottomSet.has(Number(el.dataset.cid)));
    const incomingEls = cardEls.filter(el => bottomSet.has(Number(el.dataset.cid)));

    // ③ FLIP：让 17 张老牌"先回到旧位置再滑到新位置"
    const SHIFT_MS = 320;
    existingEls.forEach(el => {
      const cid = Number(el.dataset.cid);
      const oldR = oldRects.get(cid);
      if (!oldR) return;
      const newR = el.getBoundingClientRect();
      const dx = oldR.left - newR.left;
      const dy = oldR.top - newR.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;   // 没动到 → 不浪费 transition
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    // 强制回流一次，确保起点 transform 生效
    void handEl.offsetWidth;
    existingEls.forEach(el => {
      if (!el.style.transform) return;
      el.style.transition = `transform ${SHIFT_MS}ms cubic-bezier(0.22,0.8,0.3,1)`;
      el.style.transform = '';
    });

    // ④ 3 张底牌从中央底牌位飞入预留空位；等老牌挪好后再开始
    const pileRect = pileEl ? pileEl.getBoundingClientRect() : null;
    const pileCx = pileRect ? (pileRect.left + pileRect.width / 2) : (window.innerWidth / 2);
    const pileCy = pileRect ? (pileRect.top + pileRect.height / 2) : (window.innerHeight / 2);

    incomingEls.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = pileCx - cx;
      const dy = pileCy - cy;
      el.style.setProperty('--dx', dx + 'px');
      el.style.setProperty('--dy', dy + 'px');
      // 等老牌挪完再插入，依次错开
      el.style.animationDelay = (SHIFT_MS + i * 110) + 'ms';
      el.classList.add('ddz-card-incoming');
    });

    // ⑤ 收尾：清掉 transition / transform / 动画类，再 17 → 20
    const TOTAL = SHIFT_MS + 770;
    setTimeout(() => {
      existingEls.forEach(el => {
        el.style.transition = '';
        el.style.transform = '';
      });
      incomingEls.forEach(el => {
        el.classList.remove('ddz-card-incoming');
        el.style.removeProperty('--dx');
        el.style.removeProperty('--dy');
        el.style.animationDelay = '';
      });
      renderHandCounts();
      onDone && onDone();
    }, TOTAL);
  }

  // 玩家点"明牌"按钮：倍数 ×2 + 头像上挂明牌 badge
  function playerDeclareInPlay() {
    if (state.phase !== PHASE.PLAYING) return;
    if (state.landlordIdx !== 0) return;
    if (state.declared) return;
    state.declared = true;
    state.declaredSeat = 0;
    state.multiplier *= 2;
    renderMultiplier();
    renderRoles();
    updateDeclareBtn();
    if (ddzSave) ddzSave.tick();
  }

  function updateDeclareBtn() {
    const btn = document.getElementById('ddzDeclareBtn');
    if (!btn) return;
    // 明牌只能在"地主第一轮出牌前"决定：
    //   - 出牌阶段 + 我是地主 + 未明牌
    //   - 地主还没出过牌（landlordPlayCount === 0）
    //   - 必须轮到我（playActions 可见时才有意义）
    const visible = state.phase === PHASE.PLAYING
      && state.landlordIdx === 0
      && !state.declared
      && state.landlordPlayCount === 0
      && state.turnIdx === 0;
    btn.hidden = !visible;
  }

  // ============================================================
  // 加倍：3 家同时决策（5 秒）；超时未决 = 不加倍
  // 决策一公布全员可见；倒计时一直跑直到全决完或时间到
  // ============================================================
  let doubleTimer = null;
  let doubleEndAt = 0;
  let doubleDecided = [false, false, false];   // 每家是否已决定
  let doubleChoice = [null, null, null];        // 'double' | 'pass'

  function enterDoubling() {
    state.phase = PHASE.DOUBLING;
    state.doubleActions = [];
    doubleDecided = [false, false, false];
    doubleChoice = [null, null, null];
    // 清掉 bidding 阶段每个座位 .ddz-played 上的"叫/抢/不叫/不抢" tag
    clearAllPlayed();
    setStatus('');
    renderMultiplier();

    // 渲染面板：三家状态行 + 玩家按钮
    renderDoubleSimultaneousPanel();
    bidPanel.hidden = false;

    // AI 在 0.8 - 4.5 秒内随机做决定；托管时把"我"也丢进去
    const aiSeats = [1, 2];
    if (state.autopilot) aiSeats.unshift(0);
    for (const seat of aiSeats) {
      const delay = 800 + Math.random() * 3700;
      setTimeout(() => {
        if (state.phase !== PHASE.DOUBLING) return;
        if (doubleDecided[seat]) return;
        const score = AI.evaluateHand(state.hands[seat]);
        const want = score >= 8 ? 'double' : 'pass';
        commitDouble(seat, want);
      }, delay);
    }

    // 倒计时
    doubleEndAt = Date.now() + DOUBLE_TIMEOUT_MS;
    function tick() {
      const left = Math.max(0, doubleEndAt - Date.now());
      const s = Math.ceil(left / 1000);
      const cb = document.getElementById('ddzDoubleCountdown');
      if (cb) cb.textContent = s + 's';
      if (left <= 0) {
        clearInterval(doubleTimer); doubleTimer = null;
        finalizeDoubling();
      }
    }
    tick();
    doubleTimer = setInterval(tick, 200);
  }

  function commitDouble(seat, choice) {
    if (state.phase !== PHASE.DOUBLING) return;
    if (doubleDecided[seat]) return;
    doubleDecided[seat] = true;
    doubleChoice[seat] = choice;
    state.doubleActions.push({ seat, double: choice === 'double' });
    renderDoubleSimultaneousPanel();   // 更新状态行（公开决策）
    if (doubleDecided.every(Boolean)) {
      // 三家全决完 — 提前结束
      if (doubleTimer) { clearInterval(doubleTimer); doubleTimer = null; }
      setTimeout(() => finalizeDoubling(), 500);
    }
  }

  function finalizeDoubling() {
    if (state.phase !== PHASE.DOUBLING) return;
    // 收尾：隐 corner 倒计时
    const cdEl = document.getElementById('ddzDoubleCountdown');
    if (cdEl) cdEl.hidden = true;
    // 未决定的一律算 pass
    for (let i = 0; i < 3; i++) {
      if (!doubleDecided[i]) {
        doubleDecided[i] = true;
        doubleChoice[i] = 'pass';
        state.doubleActions.push({ seat: i, double: false });
      }
    }
    // 加倍不再合并到 state.multiplier —— 按规则六，地主和每个农民之间是独立的对账：
    //   pair_mult = base × landlordDoubled?×2 × peasantDoubled?×2
    // 所以这里把决策结果留在 state.doubleActions / doubleChoice 里，
    // 真正的金额由 pairMultiplierFor / myScoreDisplay 计算。
    bidPanel.hidden = true;
    state.phase = PHASE.PLAYING;
    state.turnIdx = state.landlordIdx;
    state.lastTrick = null;
    state.passCount = 0;
    renderRoles();
    renderMultiplier();
    updateDeclareBtn();   // 进入出牌 → 地主未明牌则显示明牌按钮
    setStatus('');
    proceedTurn();
  }

  function renderDoubleSimultaneousPanel() {
    renderDoublePanelLayout({
      decided: doubleDecided.slice(),
      choice: doubleChoice.slice(),
      onChoose: (c) => commitDouble(0, c),
    });
  }

  // 单机 + 联机共用的加倍面板布局：3 列等宽
  //   上家 (cell) | 我 (cell, 中间) | 下家 (cell)
  //   - 上家/下家：根据是否已决，显示"加倍 / 不加倍 / 思考中…"文字
  //   - 我：未决时显示两个堆叠按钮（加倍 ×N / 不加倍）；已决时显示决定文字
  function renderDoublePanelLayout({ decided, choice, onChoose }) {
    bidTitle.innerHTML = '';
    bidButtonsEl.innerHTML = '';
    const cdEl = document.getElementById('ddzDoubleCountdown');
    if (cdEl) cdEl.hidden = false;

    const grid = document.createElement('div');
    grid.className = 'ddz-double-grid';

    // 三列顺序：上家(seat 2) | 我(seat 0) | 下家(seat 1)
    for (const seat of [2, 0, 1]) {
      const cell = document.createElement('div');
      cell.className = 'ddz-double-cell';
      const isMe = seat === 0;
      const isDecided = decided[seat];
      const c = choice[seat];

      // 顶部"我 / 上家 / 下家"标签
      const who = document.createElement('div');
      who.className = 'who';
      who.textContent = isMe ? '我' : (seat === 1 ? '下家' : '上家');
      cell.appendChild(who);

      if (isMe && !isDecided) {
        // 中间未决：两个堆叠按钮
        cell.classList.add('me-pending');
        const btns = document.createElement('div');
        btns.className = 'me-btns';
        const yes = document.createElement('button');
        yes.type = 'button'; yes.className = 'primary';
        yes.textContent = '加倍';
        yes.addEventListener('click', () => onChoose('double'));
        const no = document.createElement('button');
        no.type = 'button';
        no.textContent = '不加倍';
        no.addEventListener('click', () => onChoose('pass'));
        btns.appendChild(yes); btns.appendChild(no);
        cell.appendChild(btns);
      } else {
        // 已决 / 上家下家：状态文字
        const status = document.createElement('div');
        status.className = 'status';
        if (isDecided) {
          cell.classList.add(c === 'double' ? 'decided-yes' : 'decided-no');
          status.textContent = c === 'double' ? '加倍' : '不加倍';
        } else {
          cell.classList.add('pending');
          status.textContent = '思考中';
        }
        cell.appendChild(status);
      }
      grid.appendChild(cell);
    }
    bidButtonsEl.appendChild(grid);
  }

  function renderBidButtons(items, onClick) {
    bidButtonsEl.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      if (it.primary) b.classList.add('primary');
      b.addEventListener('click', () => onClick(it.value));
      bidButtonsEl.appendChild(b);
    }
  }

  // 玩家"压不住"状态 — 手牌灰授 + 按钮区只留"不出"（隐掉"提示"和"出牌"）。
  // 仅在 PLAYING 阶段、轮到玩家、有上家牌要应（即不是自己做庄）时检查。
  function refreshNoPlayState() {
    const hand = document.getElementById('ddzHand');
    const acts = document.getElementById('ddzPlayActions');
    if (!hand || !acts) return;
    const isMyPlayTurn = state.phase === PHASE.PLAYING && state.turnIdx === 0;
    const prev = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
    let noPlay = false;
    if (isMyPlayTurn && prev) {
      const beats = E.enumerateBeats(state.hands[0], prev);
      noPlay = beats.length === 0;
    }
    hand.classList.toggle('no-play', noPlay);
    acts.classList.toggle('no-play', noPlay);
  }

  // ----- 出牌轮转 -----
  function proceedTurn() {
    if (state.phase !== PHASE.PLAYING) return;
    if (state.hands[state.turnIdx].length === 0) {
      finishGame(state.turnIdx);
      return;
    }
    renderRoles();
    updatePlayBtnState();
    refreshNoPlayState();
    const seat = state.turnIdx;
    if (seat === 0 && !state.autopilot) {
      playActions.hidden = false;
      // 出牌/提示 在 PLAYING + 我轮才露；不出/明牌 ×2 / 明牌 ×N 由各自逻辑控制
      $('ddzPlayBtn').hidden = false;
      $('ddzHintBtn').hidden = false;
      const dealBtn = document.getElementById('ddzDealDeclareBtn');
      if (dealBtn) dealBtn.hidden = true;   // 出牌阶段把发牌阶段的明牌按钮收掉
      const prev = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
      setStatus(prev ? '轮到你 — 出牌或不出' : '轮到你 — 你做庄');
      resetHintCycle();
      startTurnCountdown(() => autoPlayOnTimeout(), 0);
    } else {
      playActions.hidden = true;
      setStatus(state.autopilot && seat === 0 ? '托管中…' : `${seatLabel(seat)} 思考中…`);
      const playedEl = $('ddzPlayed' + seat);
      playedEl.className = 'ddz-played';
      playedEl.innerHTML = '<span class="think-tag">思考</span>';
      // AI 也亮闹钟，跟玩家观感一致
      startTurnCountdown(null, seat);
      setTimeout(() => aiTakeTurn(seat), 700 + Math.random() * 400);
    }
  }

  function autoPlayOnTimeout() {
    if (state.phase !== PHASE.PLAYING || state.turnIdx !== 0) return;
    // 连续 2 次超时 → 自动切到托管（机器人全程接管）
    state.consecutiveTimeouts = (state.consecutiveTimeouts || 0) + 1;
    if (state.consecutiveTimeouts >= 2 && !state.autopilot) {
      setAutopilot(true);
      // 走 setAutopilot 的 triggerAutopilotIfMyTurn 路径，这里就不再单独出牌
      return;
    }
    const prev = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
    if (prev) {
      // 跟牌：找一个最小可压；没有就 pass
      const beats = E.enumerateBeats(state.hands[0], prev);
      const nonBomb = beats.filter(p => p.type !== T.BOMB && p.type !== T.ROCKET);
      if (nonBomb.length) {
        const best = nonBomb.reduce((b, p) => p.weight < b.weight ? p : b, nonBomb[0]);
        state.selected.clear();
        commitPlay(0, best);
      } else {
        commitPass(0);
      }
    } else {
      // 首出：用 AI normal 策略代为决定
      const ctx = {
        myIdx: 0,
        myRole: state.landlordIdx === 0 ? 'landlord' : 'peasant',
        landlordIdx: state.landlordIdx,
        handSizes: state.hands.map(h => h.length),
        seen: state.seen.slice(),
        lastTrickSeat: state.lastTrick ? state.lastTrick.seat : -1,
      };
      const play = AI.chooseNormal(state.hands[0], null, ctx);
      if (play) { state.selected.clear(); commitPlay(0, play); }
    }
  }

  function aiTakeTurn(seat) {
    if (state.phase !== PHASE.PLAYING || state.turnIdx !== seat) return;
    const prev = (state.lastTrick && state.lastTrick.seat !== seat) ? state.lastTrick.pattern : null;
    const perceived = state.aiPerceivedSeen[seat] || new Array(15).fill(0);
    const ctx = {
      myIdx: seat,
      myRole: seat === state.landlordIdx ? 'landlord' : 'peasant',
      landlordIdx: state.landlordIdx,
      handSizes: state.hands.map(h => h.length),
      seen: perceived.slice(),                  // ← 用 AI 自己的"记忆"，不是上帝视角
      trickHistory: [],
      lastTrickSeat: state.lastTrick ? state.lastTrick.seat : -1,
    };
    const play = AI.chooseMove(state.hands[seat], prev, ctx, state.difficulty);
    if (!play) {
      // pass — 但如果 prev=null（即 AI 是首出）不允许 pass，强制出最小单牌
      if (!prev) {
        const smallest = state.hands[seat].reduce((b, c) => E.cardWeight(c) < E.cardWeight(b) ? c : b, state.hands[seat][0]);
        commitPlay(seat, { type: T.SINGLE, weight: E.cardWeight(smallest), cards: [smallest] });
      } else {
        commitPass(seat);
      }
    } else {
      commitPlay(seat, play);
    }
  }

  function commitPlay(seat, pattern) {
    stopTurnCountdown();   // 任何人出牌都关闹钟（下个 proceedTurn 会再开）
    state.hands[seat] = E.removeCards(state.hands[seat], pattern.cards);
    for (const c of pattern.cards) state.seen[E.cardWeight(c)]++;
    updateAiPerception(pattern);          // AI 感知（带噪声）
    if (pattern.type === T.BOMB || pattern.type === T.ROCKET) state.bombCount++;
    if (seat === state.landlordIdx) state.landlordPlayCount++;
    else state.peasantPlayCount++;
    state.lastTrick = { seat, pattern };
    state.passCount = 0;
    if (seat === 0) state.selected.clear();   // 自己出牌：清空选；AI 出牌：保留预选
    else pruneSelectedToHand();               // 但要确保选中的还在我手里
    resetHintCycle();
    renderPlayedAt(seat, pattern);
    playSfx(pattern.type === T.BOMB ? 'bomb' :
            pattern.type === T.ROCKET ? 'rocket' : 'play');
    // 炸弹 / 王炸：倍数翻倍 → 飘 toast + chip 闪光（参考欢乐斗地主 image 11 ×2 badge）
    if (pattern.type === T.BOMB || pattern.type === T.ROCKET) {
      const label = pattern.type === T.ROCKET ? '王炸 ×2' : '炸弹 ×2';
      setTimeout(() => spawnMultiplierToast(seat, label), 220);
    }
    if (seat === 0) renderHand();
    renderHandCounts();
    renderMultiplier();
    // 地主出的若包含底牌 → 顶部对应那张灰掉
    if (seat === state.landlordIdx && state.bottom && state.bottom.length) {
      const bottomSet = new Set(state.bottom);
      let touched = false;
      for (const c of pattern.cards) {
        if (bottomSet.has(c) && !state.bottomPlayed.has(c)) {
          state.bottomPlayed.add(c);
          touched = true;
        }
      }
      if (touched) renderBottomPile();
    }
    if (ddzSave) ddzSave.tick();
    if (state.hands[seat].length === 0) {
      setTimeout(() => finishGame(seat), 600);
      return;
    }
    setTimeout(() => {
      // 下一家：清空他的"上次出牌"显示？保留 — 三人出牌区独立
      state.turnIdx = (seat + 1) % 3;
      proceedTurn();
    }, 800);
  }

  function commitPass(seat) {
    stopTurnCountdown();   // 任何人出牌都关闹钟（下个 proceedTurn 会再开）
    // 玩家自己 pass → 立即拿掉灰授 + 按钮恢复（不要等 700ms 后 proceedTurn 才清）
    if (seat === 0) {
      const hand = document.getElementById('ddzHand');
      const acts = document.getElementById('ddzPlayActions');
      if (hand) hand.classList.remove('no-play');
      if (acts) acts.classList.remove('no-play');
    }
    state.passCount++;
    renderPlayedAt(seat, 'pass');
    playSfx('pass');
    if (state.passCount >= 2) {
      state.lastTrick = null;
      state.passCount = 0;
      setTimeout(() => clearAllPlayed(), 400);
    }
    resetHintCycle();
    if (ddzSave) ddzSave.tick();
    setTimeout(() => {
      state.turnIdx = (seat + 1) % 3;
      proceedTurn();
    }, 700);
  }

  function playerPlay() {
    if (state.phase !== PHASE.PLAYING || state.turnIdx !== 0) return;
    if (state.selected.size === 0) return;
    const cards = Array.from(state.selected);
    const me = E.parsePattern(cards);
    if (!me) { setStatus('这组牌型不合法'); return; }
    const prev = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
    if (!E.canBeat(me, prev)) { setStatus('压不住上家，请换一组'); return; }
    state.consecutiveTimeouts = 0;   // 手动出牌 → 清空连续超时计数
    // 立即隐按钮 — 避免玩家点完后那 700-800ms 还看着自己的不出/提示/出牌
    playActions.hidden = true;
    if (state.mode === 'online') sendOnlinePlay(cards);
    else commitPlay(0, me);
  }

  function playerPass() {
    if (state.phase !== PHASE.PLAYING || state.turnIdx !== 0) return;
    if (!state.lastTrick || state.lastTrick.seat === 0) return;
    state.consecutiveTimeouts = 0;   // 手动不出 → 清空连续超时计数
    state.selected.clear();
    renderHand();
    // 立即隐按钮 + 清掉灰授（不等下一回合 proceedTurn 才清）
    playActions.hidden = true;
    const handEl3 = document.getElementById('ddzHand');
    if (handEl3) handEl3.classList.remove('no-play');
    playActions.classList.remove('no-play');
    if (state.mode === 'online') sendOnlinePass();
    else commitPass(0);
  }

  function resetHintCycle() {
    state.hintCycle = [];
    state.hintIdx = -1;
    state.hintForPrev = null;
    snapLockedThisTrick = false;        // trick 切换 → 解锁智能补全
  }

  // prev 牌型签名（决定提示候选是否需要重算）
  function trickSignature() {
    const t = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
    if (!t) return 'first';
    return t.type + ':' + t.weight + ':' + (t.length || 0) + ':' + (t.kickerCount || 0);
  }

  // 候选排序：非炸弹小牌先，相同类型按 weight 升序，同 weight 按张数升序
  function rankPlayForHint(p) {
    const TYPE_RANK = {
      [T.SINGLE]: 0, [T.PAIR]: 1, [T.TRIPLE]: 2,
      [T.TRIPLE_ONE]: 3, [T.TRIPLE_PAIR]: 4,
      [T.STRAIGHT]: 5, [T.PAIR_STRAIGHT]: 6,
      [T.PLANE]: 7, [T.PLANE_ONE]: 8, [T.PLANE_PAIR]: 9,
      [T.FOUR_TWO]: 10, [T.FOUR_TWO_PAIR]: 11,
      [T.BOMB]: 20, [T.ROCKET]: 21,
    };
    return [TYPE_RANK[p.type] || 99, p.weight, (p.length || 0), p.cards.length];
  }
  function comparePlay(a, b) {
    const ra = rankPlayForHint(a), rb = rankPlayForHint(b);
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i];
    }
    return 0;
  }

  // 去重：同类型 + 同 weight + 同 length + 同 kicker + 同主组牌集合 → 视为重复
  function playKey(p) {
    return p.type + '|' + p.weight + '|' + (p.length || 0) + '|' + (p.kickerCount || 0)
      + '|' + p.cards.slice().sort((a, b) => a - b).join(',');
  }

  function playerHint() {
    if (state.phase !== PHASE.PLAYING || state.turnIdx !== 0) return;
    const sig = trickSignature();
    if (sig !== state.hintForPrev || !state.hintCycle.length) {
      // 重新枚举候选
      const prev = (state.lastTrick && state.lastTrick.seat !== 0) ? state.lastTrick.pattern : null;
      const beats = E.enumerateBeats(state.hands[0], prev);
      if (!beats.length) {
        setStatus(sig === 'first' ? '没合法牌型，请检查' : '没牌可出，请「不出」');
        return;
      }
      // 去重
      const seen = new Set();
      const uniq = [];
      for (const p of beats) {
        const k = playKey(p);
        if (seen.has(k)) continue;
        seen.add(k); uniq.push(p);
      }
      // 调 AI 同档难度作为「首选」推荐（避免无谓推炸弹）
      const level = (state.mode === 'online') ? 'normal' : (state.difficulty || 'normal');
      const myRole = state.landlordIdx === 0 ? 'landlord' : 'peasant';
      const ctx = {
        myIdx: 0, myRole,
        landlordIdx: state.landlordIdx,
        handSizes: state.hands.map(h => h.length),
        seen: state.seen ? state.seen.slice() : new Array(15).fill(0),
        lastTrickSeat: state.lastTrick ? state.lastTrick.seat : -1,
      };
      const aiPick = AI.chooseMove(state.hands[0], prev, ctx, level);
      // 把 AI 推荐排到最前；剩下的按 comparePlay 排
      let primary = null;
      if (aiPick) {
        const aiKey = playKey(aiPick);
        primary = uniq.find(p => playKey(p) === aiKey);
      }
      const rest = uniq.filter(p => p !== primary).sort(comparePlay);
      state.hintCycle = primary ? [primary, ...rest] : rest;
      state.hintIdx = -1;
      state.hintForPrev = sig;
    }
    state.hintIdx = (state.hintIdx + 1) % state.hintCycle.length;
    const pick = state.hintCycle[state.hintIdx];
    state.selected.clear();
    for (const c of pick.cards) state.selected.add(c);
    renderHand();
    updatePlayBtnState();
    setStatus(`提示 ${state.hintIdx + 1} / ${state.hintCycle.length}：${describePattern(pick)}`);
  }

  // ============================================================
  // 预选辅助：把不在我手里的 selected 项清掉（手牌变了之后用）
  // ============================================================
  function pruneSelectedToHand() {
    const inHand = new Set(state.hands[0]);
    for (const c of Array.from(state.selected)) {
      if (!inHand.has(c)) state.selected.delete(c);
    }
  }

  // ============================================================
  // AI 感知（带难度扰动）— 不是上帝视角
  // - easy: 完全不记
  // - normal: 只记 2 / 王 / 炸弹（高威胁牌），其它不记
  // - hard: 全记但有遗忘率（高 rank 记得清，小 rank 偶尔漏）
  // - 双 AI 各自独立扰动（互相不一致）
  // ============================================================
  function perceiveWeight(perceived, w, level) {
    if (level === 'easy') return;
    if (level === 'master') {
      // 大神：完美记牌（永不漏）
      perceived[w]++;
      return;
    }
    if (level === 'normal') {
      // 只关心 2(12) / 小王(13) / 大王(14)
      if (w >= 12 && Math.random() > 0.15) perceived[w]++;
      return;
    }
    // hard: rank 越大记得越准；偶尔漏
    let missChance;
    if (w >= 13)      missChance = 0.05;   // 王
    else if (w === 12) missChance = 0.07;  // 2
    else if (w >= 10)  missChance = 0.12;  // K / A
    else if (w >= 8)   missChance = 0.18;  // J / Q
    else               missChance = 0.25;  // 3-10
    if (Math.random() > missChance) perceived[w]++;
  }

  function updateAiPerception(pattern) {
    const lvl = state.difficulty;
    if (lvl === 'easy') return;
    for (let seat = 1; seat <= 2; seat++) {
      const ai = state.aiPerceivedSeen[seat];
      if (!ai) continue;
      for (const c of pattern.cards) {
        perceiveWeight(ai, E.cardWeight(c), lvl);
      }
    }
  }

  // 揭底牌时也喂给 AI（公开信息，但仍按难度过滤）
  function aiPerceiveBottom() {
    const lvl = state.difficulty;
    if (lvl === 'easy') return;
    for (let seat = 1; seat <= 2; seat++) {
      const ai = state.aiPerceivedSeen[seat];
      if (!ai) continue;
      for (const c of state.bottom) {
        const w = E.cardWeight(c);
        // 公开揭底，记忆稍微准一点（用 hard 风格记，但 normal 仍只看大牌）
        if (lvl === 'normal') {
          if (w >= 12 && Math.random() > 0.05) ai[w]++;
        } else {
          if (Math.random() > 0.05) ai[w]++;
        }
      }
    }
  }

  function describePattern(p) {
    const NAMES = {
      [T.SINGLE]: '单', [T.PAIR]: '对', [T.TRIPLE]: '三',
      [T.TRIPLE_ONE]: '三带一', [T.TRIPLE_PAIR]: '三带二',
      [T.STRAIGHT]: '单顺', [T.PAIR_STRAIGHT]: '连对',
      [T.PLANE]: '飞机', [T.PLANE_ONE]: '飞机带翼', [T.PLANE_PAIR]: '飞机带对',
      [T.FOUR_TWO]: '四带二', [T.FOUR_TWO_PAIR]: '四带二对',
      [T.BOMB]: '炸弹', [T.ROCKET]: '王炸',
    };
    return NAMES[p.type] || p.type;
  }

  // ====== 结算 reveal 辅助（参考欢乐斗地主 image 13）======
  // 揭示对家剩余手牌（输的那一方），翻面铺到他们的 played 槽
  function revealOpponentHandsForSettlement() {
    for (let i = 1; i <= 2; i++) {
      const el = $('ddzPlayed' + i);
      if (!el) continue;
      const cards = state.hands[i];
      // 没牌 = 这家把牌打完了（赢家或地主胜后的另一农民有可能）→ 留空，不渲染
      if (!cards || cards.length === 0) continue;
      el.innerHTML = '';
      el.className = 'ddz-played settle-reveal';
      const sorted = sortHandDesc(cards);
      for (const c of sorted) el.appendChild(buildCardEl(c, 'size-mini'));
    }
  }
  // 大字"地主胜利 / 失败"banner（自动 ~2s 后消失）
  function showSettleBanner(playerWon) {
    const tableEl = $('ddzTable');
    if (!tableEl) return;
    const prev = tableEl.querySelector('.ddz-settle-banner');
    if (prev) prev.remove();
    const banner = document.createElement('div');
    banner.className = 'ddz-settle-banner ' + (playerWon ? 'win' : 'lose');
    // 文案以我为视角：我是地主 → 地主胜利/失败；我是农民 → 农民胜利/失败
    const role = state.landlordIdx === 0 ? '地主' : '农民';
    banner.textContent = role + (playerWon ? '胜利' : '失败');
    tableEl.appendChild(banner);
    setTimeout(() => banner.remove(), 2200);
  }
  // 每个座位头像上方飘金币 +N / -N
  function showCoinDeltas(pairAmts, peasantSeats, winnerRole) {
    const lordSign = winnerRole === 'landlord' ? +1 : -1;
    const peasantSign = -lordSign;
    const lordTotal = pairAmts.reduce((a, b) => a + b, 0);
    spawnCoinDelta(state.landlordIdx, lordSign * lordTotal);
    for (let i = 0; i < peasantSeats.length; i++) {
      spawnCoinDelta(peasantSeats[i], peasantSign * pairAmts[i]);
    }
  }
  function spawnCoinDelta(seat, delta) {
    const container = (seat === 0)
      ? document.querySelector('.ddz-self')
      : document.querySelector(`.ddz-seat-ai[data-seat="${seat}"]`);
    if (!container) return;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    const el = document.createElement('div');
    el.className = 'ddz-coin-delta ' + (delta >= 0 ? 'gain' : 'lose');
    el.textContent = (delta >= 0 ? '+' : '') + delta;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }
  // 春天 全屏樱花飘落
  function spawnSakuraPetals(count) {
    const n = count || 32;
    const overlay = document.createElement('div');
    overlay.className = 'ddz-sakura-overlay';
    document.body.appendChild(overlay);
    const glyphs = ['🌸', '🌺', '🌷', '🌼'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.textContent = glyphs[i % glyphs.length];
      p.style.left = (Math.random() * 100) + '%';
      p.style.setProperty('--dur', (3.6 + Math.random() * 2.6) + 's');
      p.style.setProperty('--drift', (Math.random() * 240 - 120) + 'px');
      p.style.animationDelay = (Math.random() * 1.4) + 's';
      p.style.fontSize = (16 + Math.random() * 14) + 'px';
      overlay.appendChild(p);
    }
    setTimeout(() => overlay.remove(), 7200);
  }
  // 联机模式飘金币：用 state.result.multiplier 估算每家本盘净增减
  function showOnlineCoinDeltas(result, online) {
    if (!result) return;
    const lordSign = result.winnerRole === 'landlord' ? +1 : -1;
    const peasantSign = -lordSign;
    const m = result.multiplier || 1;
    // 简化估算：地主 ±2m，两农民各 ±m。加倍 / 春天通过 multiplier 已并入。
    const peasantSeats = [0,1,2].filter(s => s !== state.landlordIdx);
    spawnCoinDelta(state.landlordIdx, lordSign * 2 * m);
    for (const ps of peasantSeats) spawnCoinDelta(ps, peasantSign * m);
  }
  // 倍数翻倍 toast（炸弹 / 王炸 / 春天即将命中 时调用）
  function spawnMultiplierToast(seat, label) {
    const tableEl = $('ddzTable');
    const targetEl = (seat === 0) ? $('ddzPlayed0') : $('ddzPlayed' + seat);
    if (!tableEl || !targetEl) return;
    const t = targetEl.getBoundingClientRect();
    const r = tableEl.getBoundingClientRect();
    const toast = document.createElement('div');
    toast.className = 'ddz-mult-toast';
    toast.textContent = label || '倍数 ×2';
    toast.style.left = (t.left + t.width / 2 - r.left) + 'px';
    toast.style.top = (t.top - r.top - 4) + 'px';
    tableEl.appendChild(toast);
    setTimeout(() => toast.remove(), 1500);
    // 同步 pulse 倍数 chip
    if (multiEl) {
      multiEl.classList.remove('boom');
      void multiEl.offsetWidth;
      multiEl.classList.add('boom');
      setTimeout(() => multiEl.classList.remove('boom'), 800);
    }
  }

  function finishGame(winnerSeat) {
    state.phase = PHASE.SETTLEMENT;
    updateDeclareBtn();   // 游戏结束 → 隐藏明牌按钮
    const winnerRole = winnerSeat === state.landlordIdx ? 'landlord' : 'peasant';
    // 春天 / 反春天判定
    if (winnerRole === 'landlord' && state.peasantPlayCount === 0) {
      state.spring = 1; // 春天
    } else if (winnerRole === 'peasant' && state.landlordPlayCount === 1) {
      state.spring = 1; // 反春天
    }
    const base = currentMultiplier();
    // 按对结算：地主 ↔ 农民1 一对账，地主 ↔ 农民2 一对账。
    // 每对的倍数 = base × 地主加倍?×2 × 该农民加倍?×2
    const peasantSeats = [0,1,2].filter(s => s !== state.landlordIdx);
    const pairAmts = peasantSeats.map(p => pairMultiplierFor(p));
    // 我的净得分：地主胜 → 收两对；地主败 → 付两对；农民胜 → 收自己那对；农民败 → 付自己那对
    let score;
    if (state.landlordIdx === 0) {
      score = pairAmts[0] + pairAmts[1];
    } else {
      const idxInPeasants = peasantSeats.indexOf(0);
      score = pairAmts[idxInPeasants];
    }
    state.result = { winnerSeat, winnerRole, multiplier: base, score, pairAmts };
    if (ddzSave) ddzSave.discard();
    renderMultiplier();

    const playerWon = (winnerRole === 'landlord' && state.landlordIdx === 0) ||
                      (winnerRole === 'peasant' && state.landlordIdx !== 0);
    gameOverTitle.textContent = playerWon ? '🎉 你赢了！' : '😢 你输了';
    setTimeout(() => playSfx(playerWon ? 'win' : 'lose'), 300);
    const myRole = state.landlordIdx === 0 ? '地主' : '农民';
    const winText = winnerRole === 'landlord' ? '地主' : '农民';
    // 春天 / 反春天用专门的庆祝 badge
    const springBadge = state.spring > 0
      ? `<div class="ddz-spring-badge">${winnerRole === 'landlord' ? '🌸 春天' : '🍁 反春天'} ×2</div>`
      : '';
    gameOverDetail.innerHTML =
      springBadge +
      `<div>${winText}获胜 · 你是${myRole}</div>` +
      `<div>本局积分 <strong>${score}</strong></div>`;
    gameOverOverlay.classList.toggle('has-spring', state.spring > 0);
    // 平时不显示结算图按钮；只有春天 / 反春天才弹
    if (ddzSettleBtn && ddzSettleBtn.element) ddzSettleBtn.element.hidden = true;

    // —— Reveal 阶段（先于浮层，参考欢乐斗地主 image 13） ——
    // ① 翻开对家手牌；② 大字胜利/失败 banner；③ 头像上方飘 +N / -N 金币
    revealOpponentHandsForSettlement();
    showSettleBanner(playerWon);
    showCoinDeltas(pairAmts, peasantSeats, winnerRole);
    // 春天 → 全屏樱花
    if (state.spring > 0) spawnSakuraPetals(40);

    // ~1.8s 后再弹「再来一局」浮层，期间 reveal 跟金币飘字可以充分被看到
    setTimeout(() => {
      gameOverOverlay.classList.add('show');
      if (state.spring > 0) {
        setTimeout(() => triggerSpringSettlement(), 350);
      }
    }, 1800);

    renderRoles();

    if (playerWon) tryAutoSubmit();
  }

  // 春天 / 反春天专用结算图：弹出春天那人的初始手牌
  function triggerSpringSettlement() {
    if (!window.GamesShell || !GamesShell.Settlement) return;
    if (!state.initialHands || !state.result) return;
    const opts = ddzGetSpringOpts();
    if (!opts) return;
    const dataURL = GamesShell.Settlement.compose(opts);
    if (!dataURL) return;
    const ts = Date.now();
    const filename = `doudizhu_spring_${ts}.png`;
    GamesShell.Settlement.present({ dataURL, filename });
  }

  function difficultyLabel(d) { return { easy: '🌱 新手', normal: '🙂 普通', hard: '🔥 高手', master: '👑 大神' }[d] || d; }
  function seatLabel(s) { return s === 0 ? '你' : (s === 1 ? '下家' : '上家'); }
  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  // ============================================================
  // 排行榜 / 续局 / 结算 集成
  // ============================================================
  let ddzWlb = null, ddzSettleBtn = null;
  let ddzNickPrompt = null;
  let ddzSave = null;

  // 春天 / 反春天结算图：标题 + 「那一方」的初始手牌（行）
  function ddzGetSpringOpts() {
    if (!state.result || state.spring <= 0 || !state.initialHands) return null;
    const isSpring = state.result.winnerRole === 'landlord';   // 春天=地主胜
    const subtitle = isSpring ? '🌸 春天' : '🍁 反春天';
    // 收集要展示的「赢家」初始手牌
    let rows;
    if (isSpring) {
      // 春天：展示地主初始 20 张
      const seat = state.landlordIdx;
      rows = [{ label: seatLongLabel(seat) + '（地主）· 初始 20 张', cards: state.initialHands[seat] }];
    } else {
      // 反春天：展示两个农民各自 17 张
      rows = [];
      for (let s = 0; s < 3; s++) {
        if (s === state.landlordIdx) continue;
        rows.push({ label: seatLongLabel(s) + '（农民）· 初始 17 张', cards: state.initialHands[s] });
      }
    }
    return {
      kind: 'duel',
      gameId: 'doudizhu',
      title: '斗地主 · ' + subtitle,
      emoji: isSpring ? '🌸' : '🍁',
      nick: (window.GamesShell && GamesShell.Identity.getNick()) || '匿名',
      opponent: 'AI · ' + difficultyLabel(state.difficulty),
      result: state.landlordIdx === 0
        ? (isSpring ? 'win' : 'lose')
        : (isSpring ? 'lose' : 'win'),
      stats: [
        { label: subtitle.replace(/^[^\s]+\s/, '') + ' 加成', value: '×2' },
        { label: '总倍数', value: '×' + state.result.multiplier },
        { label: '本局积分', value: state.result.score },
      ],
      paintBoard: (ctx, x, y, w, h) => paintSpringBoard(ctx, x, y, w, h, rows, subtitle),
      boardW: 520,
      boardAspect: rows.length === 1 ? 1.05 : 1.45,
      watermark: 'ruizhou03.com/toolbox/doudizhu',
    };
  }

  function seatLongLabel(seat) {
    if (seat === 0) return '我';
    if (seat === 1) return 'AI · 下家';
    return 'AI · 上家';
  }

  function paintSpringBoard(ctx, x, y, w, h, rows, subtitle) {
    // 海军蓝绒底（呼应主站调色）
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#243f63');
    grad.addColorStop(0.65, '#14253f');
    grad.addColorStop(1, '#0d182b');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // 顶部标题：春天 / 反春天 + ×2 高光
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 30px Georgia, "STSong", serif';
    ctx.fillStyle = '#f5d142';
    ctx.shadowColor = 'rgba(245,209,66,0.55)';
    ctx.shadowBlur = 14;
    ctx.fillText(subtitle + ' ×2', x + w / 2, y + 36);
    ctx.shadowBlur = 0;

    // 副标题
    ctx.font = '14px -apple-system, "PingFang SC", sans-serif';
    ctx.fillStyle = '#f0e8d5';
    ctx.fillText('赢家初始手牌', x + w / 2, y + 64);

    // 牌行布局
    const padX = 24;
    const rowH = (h - 100) / rows.length;
    let ry = y + 92;
    for (const row of rows) {
      // row label
      ctx.font = '13px -apple-system, "PingFang SC", sans-serif';
      ctx.fillStyle = '#c9a96e';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(row.label, x + padX, ry);
      // 牌
      const sortedC = sortHandDesc(row.cards);
      const total = sortedC.length;
      const cardH = Math.min(56, rowH - 28);
      const cardW = Math.round(cardH * 0.71);
      const overlap = Math.min(cardW * 0.55, (w - padX * 2 - cardW) / Math.max(1, total - 1));
      const startX = x + padX;
      const cy = ry + 22;
      for (let i = 0; i < total; i++) {
        const c = sortedC[i];
        const cx = startX + i * (cardW - overlap);
        paintCardOnCanvas(ctx, c, cx, cy, cardW, cardH);
      }
      ry += rowH;
    }
  }

  function paintCardOnCanvas(ctx, c, cx, cy, cw, ch) {
    const info = cardDisplayInfo(c);
    // 卡片底（奶白）
    const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
    cardGrad.addColorStop(0, '#fafaf9');
    cardGrad.addColorStop(1, '#f5f4f0');
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cx, cy, cw, ch, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,169,110,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (info.isJoker) {
      const isBig = info.jokerKind === 'big';
      ctx.fillStyle = isBig ? '#8b2e2e' : '#4a4a4a';
      // 角标星
      ctx.font = `${Math.round(cw * 0.32)}px Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('★', cx + 3, cy + 2);
      // 中央 JOKER + 王冠
      ctx.font = `700 ${Math.round(cw * 0.22)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JOKER', cx + cw / 2, cy + ch / 2 - ch * 0.12);
      ctx.font = `${Math.round(cw * 0.5)}px "Apple Symbols", monospace`;
      ctx.fillText(isBig ? '♛' : '♚', cx + cw / 2, cy + ch / 2 + ch * 0.18);
    } else {
      ctx.fillStyle = info.red ? '#8b2e2e' : '#1a1a2e';
      // rank
      ctx.font = `700 ${Math.round(cw * 0.40)}px Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(info.rank, cx + 3, cy + 2);
      // suit small below rank
      ctx.font = `${Math.round(cw * 0.30)}px "Apple Symbols", monospace`;
      ctx.fillText(info.suit, cx + 3, cy + Math.round(cw * 0.42));
      // 中央 pip
      ctx.font = `${Math.round(cw * 0.7)}px "Apple Symbols", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.suit, cx + cw / 2, cy + ch / 2 + 2);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 难度权重：easy=1, normal=2, hard=3, master=4, online=3
  function difficultyWeight(d) {
    return ({ easy: 1, normal: 2, hard: 3, master: 4, online: 3 })[d] || 1;
  }

  function ddzSubmitWins(nick) {
    const submittedNick = nick;
    if (!state.result) return;
    const aiLevel = state.difficulty;
    if (!['easy', 'normal', 'hard', 'master'].includes(aiLevel)) return;
    const totalActions = state.landlordPlayCount + state.peasantPlayCount + (state.bidActions.length || 0);
    const moves = Math.max(4, Math.min(500, totalActions));
    const durationMs = Math.max(5000, Date.now() - state.runStartedAt);
    const baseScore = state.result.score;
    const weight = difficultyWeight(aiLevel);
    const score = Math.min(4096, baseScore * weight);   // 后端 cap 4096
    return GamesShell.WinsLeaderboard.submit({
      gameId: 'doudizhu',
      nick,
      did: GamesShell.Identity.getDeviceId(),
      aiLevel,
      moves,
      durationMs,
      clientNonce: state.runNonce,
      score,
    }).then(r => {
      if (r && r.ok) {
        if (ddzWlb) ddzWlb.refresh();
        if (ddzNickPrompt) ddzNickPrompt.hide();
        return;
      }
      if (r && r.reason === 'nick_taken') {
        GamesShell.Identity.clearNick();
        if (ddzNickPrompt) { ddzNickPrompt.refresh(); ddzNickPrompt.show(); ddzNickPrompt.showError('"' + submittedNick + '" 已被别的玩家占用，请换一个昵称'); }
        return;
      }
      if (r && r.reason) console.warn('[doudizhu] wins submit rejected:', r.reason);
    });
  }

  function tryAutoSubmit() {
    if (!window.GamesShell) return;
    if (!state.result) return;
    const playerRole = state.landlordIdx === 0 ? 'landlord' : 'peasant';
    if (state.result.winnerRole !== playerRole) return; // 输了不上传
    const aiLevel = state.difficulty;
    if (!['easy', 'normal', 'hard', 'master'].includes(aiLevel)) return;
    const nick = GamesShell.Identity.getNick();
    if (nick) {
      ddzSubmitWins(nick);
      return;
    }
    if (ddzNickPrompt) ddzNickPrompt.show();
  }

  function initShell() {
    if (!window.GamesShell || !GamesShell.WinsLeaderboard) return;
    ddzWlb = GamesShell.WinsLeaderboard.mount({
      container: $('ddz-wlb-mount'),
      gameId: 'doudizhu',
      title: '🏆 斗地主 · 积分榜',
      unit: '分',
      getCurrentNick: () => GamesShell.Identity.getNick(),
    });
    GamesShell.Comments.mount({
      container: $('ddz-cm-mount'),
      path: '/toolbox/doudizhu/',
      title: '💬 牌友交流',
      intro: '聊聊斗地主的开局思路、地主 / 农民的取舍，或者吐槽 AI ~',
      placeholder: '聊聊你的斗地主心得 ~',
    });
    if (GamesShell.NickPrompt) {
      ddzNickPrompt = GamesShell.NickPrompt.mount({
        container: document.getElementById('ddz-nick-mount'),
        prompt: '赢一局！起个昵称上榜吧',
        onSubmit: nick => ddzSubmitWins(nick),
        onSkip: () => { if (ddzNickPrompt) ddzNickPrompt.hide(); },
      });
    }
    if (GamesShell.Settlement) {
      // 平时不挂结算按钮，只在春天时主动 compose+present
      ddzSettleBtn = null;
    }
  }
  initShell();

  // ============================================================
  // 联机模式（HTTP 长轮询 + 服务端权威）
  // ============================================================
  const DDZ_API = 'https://zircon-urge.fly.dev/api/ddz';
  const SESSION_KEY = 'tool.doudizhu.online.session.v1';
  const lobbyEl = $('ddzLobby');
  const singleSetupEl = $('ddzSingleSetup');
  const onlineSetupEl = $('ddzOnlineSetup');

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }
  function saveSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  async function apiCall(action, opts) {
    opts = opts || {};
    const isGet = !opts.body;
    const url = `${DDZ_API}?action=${encodeURIComponent(action)}` +
      (opts.qs ? '&' + new URLSearchParams(opts.qs).toString() : '');
    const init = {
      method: isGet ? 'GET' : 'POST',
      headers: isGet ? {} : { 'Content-Type': 'application/json' },
      body: isGet ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    };
    const res = await fetch(url, init);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      return { ok: false, status: res.status, error: (data && data.error) || 'http_error', data };
    }
    return { ok: true, data };
  }

  // ── Mode toggle ─────────────────────────────────────────────────────
  document.querySelectorAll('.ddz-playmode-btn').forEach(b => {
    b.addEventListener('click', () => {
      if (state.phase !== PHASE.IDLE && state.phase !== PHASE.SETTLEMENT) return;
      document.querySelectorAll('.ddz-playmode-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const m = b.dataset.playmode;
      if (m === 'single') {
        singleSetupEl.hidden = false;
        onlineSetupEl.hidden = true;
        state.mode = 'single';
      } else {
        singleSetupEl.hidden = true;
        onlineSetupEl.hidden = false;
        state.mode = 'online';
        renderResumeOption();
      }
    });
  });

  // ── 联机入口（创建 / 加入 tab） ─────────────────────────────────────
  let onlineTab = 'create';
  document.querySelectorAll('.ddz-online-tab').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ddz-online-tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      onlineTab = b.dataset.tab;
      $('ddzOnlineCode').hidden = onlineTab === 'create';
      $('ddzOnlineConfig').hidden = onlineTab !== 'create';
      $('ddzOnlineSubmit').textContent = onlineTab === 'create' ? '创建房间' : '加入房间';
      $('ddzOnlineHint').textContent = '';
      $('ddzOnlineHint').className = 'ddz-online-hint';
    });
  });
  // AI 难度行只在 aiCount > 0 时显示
  $('cfgAiCount').addEventListener('change', () => {
    const c = parseInt($('cfgAiCount').value, 10) || 0;
    $('cfgAiLevelRow').hidden = c === 0;
  });

  function collectRoomConfig() {
    return {
      aiCount: parseInt($('cfgAiCount').value, 10) || 0,
      aiLevel: $('cfgAiLevel').value || 'normal',
      bidStyle: $('cfgBidStyle').value || 'rob',
      rounds: parseInt($('cfgRounds').value, 10) || 1,
      maxScorePerRound: parseInt($('cfgMaxScore').value, 10) || 0,
      startRule: $('cfgStartRule').value || 'random',
      allowFourTwo: $('cfgAllowFourTwo').value !== 'false',
    };
  }
  function configSummaryHtml(cfg) {
    if (!cfg) return '';
    const parts = [];
    parts.push(`<strong>${cfg.aiCount === 0 ? '3 真人' : (cfg.aiCount === 1 ? '2 真人 + 1 AI' : '1 真人 + 2 AI')}</strong>`);
    if (cfg.aiCount > 0) {
      const lv = ({ easy: '🌱 新手', normal: '🙂 普通', hard: '🔥 高手' })[cfg.aiLevel] || cfg.aiLevel;
      parts.push(`AI ${lv}`);
    }
    parts.push(cfg.bidStyle === 'call' ? '叫分模式' : '抢地主');
    parts.push(`<strong>${cfg.rounds || 1}</strong> 盘`);
    if (cfg.maxScorePerRound > 0) parts.push(`封顶 ×${cfg.maxScorePerRound}`);
    parts.push(cfg.startRule === 'winner' ? '赢家先叫' : '随机先叫');
    if (cfg.allowFourTwo === false) parts.push('禁四带二');
    return parts.join(' <span class="sep">·</span> ');
  }

  function setOnlineHint(text, isError) {
    const el = $('ddzOnlineHint');
    el.textContent = text || '';
    el.className = 'ddz-online-hint' + (isError ? ' error' : '');
  }

  function getDeviceId() {
    if (window.GamesShell && GamesShell.Identity) return GamesShell.Identity.getDeviceId();
    let did = localStorage.getItem('gs.did.v1');
    if (!did) {
      did = 'd-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      try { localStorage.setItem('gs.did.v1', did); } catch {}
    }
    return did;
  }

  function preloadNick() {
    const nickFromIdentity = window.GamesShell && GamesShell.Identity && GamesShell.Identity.getNick();
    if (nickFromIdentity) $('ddzOnlineNick').value = nickFromIdentity;
  }

  $('ddzOnlineSubmit').addEventListener('click', async () => {
    const nick = $('ddzOnlineNick').value.trim();
    if (!nick || nick.length > 12) { setOnlineHint('昵称 1-12 字', true); return; }
    if (window.GamesShell && GamesShell.Identity) GamesShell.Identity.setNick(nick);
    if (onlineTab === 'create') {
      setOnlineHint('创建中…');
      const config = collectRoomConfig();
      const r = await apiCall('create', { body: { nick, deviceId: getDeviceId(), config } });
      if (!r.ok) { setOnlineHint('创建失败：' + (r.error || ''), true); return; }
      enterRoom(r.data);
    } else {
      const code = $('ddzOnlineCode').value.trim();
      if (!/^\d{4}$/.test(code)) { setOnlineHint('请输入 4 位房号', true); return; }
      setOnlineHint('加入中…');
      const r = await apiCall('join', { body: { code, nick, deviceId: getDeviceId() } });
      if (!r.ok) {
        const msg = ({
          'room_not_found': '房间不存在或已过期',
          'room_in_progress': '游戏已开始，无法加入',
          'room_full': '房间已满，换一个房号试试',
          'nick_taken_in_room': '昵称已被占用，换一个试试',
          'invalid_nick': '昵称不合法',
        })[r.error] || ('加入失败：' + r.error);
        setOnlineHint(msg, true);
        return;
      }
      enterRoom(r.data);
    }
  });

  // 设置面板内按回车触发提交
  ['ddzOnlineNick', 'ddzOnlineCode'].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ddzOnlineSubmit').click(); });
  });

  // 重新加入（从 localStorage）
  function renderResumeOption() {
    const sess = loadSession();
    const wrap = $('ddzOnlineResume');
    if (!sess || !sess.code) { wrap.hidden = true; return; }
    wrap.hidden = false;
    $('ddzResumeCode').textContent = sess.code;
  }
  $('ddzResumeBtn').addEventListener('click', async () => {
    const sess = loadSession();
    if (!sess) { renderResumeOption(); return; }
    const nick = ($('ddzOnlineNick').value.trim() || sess.nick || '').slice(0, 12);
    if (!nick) { setOnlineHint('请输入昵称', true); return; }
    setOnlineHint('重新加入中…');
    const r = await apiCall('join', { body: { code: sess.code, nick, deviceId: getDeviceId() } });
    if (!r.ok) {
      setOnlineHint('重连失败：' + r.error, true);
      if (r.error === 'room_not_found' || r.error === 'room_dissolved') clearSession();
      renderResumeOption();
      return;
    }
    enterRoom(r.data);
  });
  $('ddzResumeForget').addEventListener('click', () => { clearSession(); renderResumeOption(); });

  function enterRoom(joinData) {
    const sess = {
      code: joinData.code,
      token: joinData.playerToken,
      playerId: joinData.playerId,
      nick: $('ddzOnlineNick').value.trim(),
      ts: Date.now(),
    };
    saveSession(sess);
    state.mode = 'online';
    state.online = {
      code: sess.code,
      token: sess.token,
      playerId: sess.playerId,
      mySeat: 0,         // will be set on first state apply
      isHost: false,
      lastVersion: 0,
      polling: false,
      players: [],
      doubleDecided: [false, false, false],
      doubleChoice: [null, null, null],
      doubleEndAt: 0,
      turnEndAt: 0,
      lastSrvState: null,
      pollAbort: null,
    };
    setOnlineHint('');
    setupView.hidden = true;
    tableView.hidden = true;        // 联机大厅完全替代牌桌
    lobbyEl.hidden = false;
    $('ddzRoomCode').textContent = sess.code;
    if (window.GamesShell && GamesShell.QR) GamesShell.QR.render($('ddzRoomQr'), location.origin + location.pathname + '?room=' + sess.code);
    startPolling();
  }

  // ── 长轮询循环 ──────────────────────────────────────────────────────
  async function startPolling() {
    if (!state.online || state.online.polling) return;
    state.online.polling = true;
    while (state.online && state.online.polling && state.online.token) {
      const ctrl = new AbortController();
      state.online.pollAbort = ctrl;
      const r = await apiCall('state', {
        qs: { code: state.online.code, token: state.online.token, since: state.online.lastVersion },
        signal: ctrl.signal,
      }).catch(() => ({ ok: false, error: 'aborted' }));
      if (!state.online || !state.online.polling) break;
      if (r.ok && r.data) {
        applyServerState(r.data);
      } else if (r.status === 403 || r.status === 404) {
        // Token失效或房间不存在
        const errMsg = r.error === 'room_not_found' ? '房间已过期' : '会话失效';
        setStatus(errMsg);
        await leaveOnlineRoom(true);
        break;
      } else {
        // 网络抖动 → 退避后重试
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    if (state.online) { state.online.polling = false; state.online.pollAbort = null; }
  }
  function stopPolling() {
    if (state.online) {
      state.online.polling = false;
      if (state.online.pollAbort) try { state.online.pollAbort.abort(); } catch {}
    }
  }

  // ── 服务端 → 本地状态映射 ──────────────────────────────────────────
  function rotateSeat(serverSeat) {
    if (!state.online) return serverSeat;
    return (serverSeat - state.online.mySeat + 3) % 3;
  }

  function applyServerState(srv) {
    if (!srv || !state.online) return;
    state.online.lastVersion = srv.version || 0;
    state.online.players = srv.players || [];
    state.online.hostPlayerId = srv.hostPlayerId;

    // 找自己的 seat
    const me = (srv.players || []).find(p => p.id === state.online.playerId);
    if (me) {
      state.online.mySeat = me.seat - 1;
      state.online.isHost = me.isHost;
    }

    if (srv.state === 'dissolved') {
      alert('房主解散了房间');
      leaveOnlineRoom(true);
      return;
    }

    if (srv.state === 'lobby') {
      state.online.lastSrvState = 'lobby';
      lobbyEl.hidden = false;
      tableView.hidden = true;
      renderLobbyPlayers(srv);
      return;
    }

    if (srv.state === 'playing') {
      // 大厅 → 牌桌切换
      if (state.online.lastSrvState !== 'playing') {
        lobbyEl.hidden = true;
        tableView.hidden = false;
        clearAllPlayed();
        // 隐藏 game-over overlay（如果之前还在）
        gameOverOverlay.classList.remove('show', 'has-spring');
        if (ddzSettleBtn) ddzSettleBtn.setEnabled(false);
        state.runStartedAt = Date.now();
        state.runNonce = (window.GamesShell && GamesShell.Identity.newRunNonce()) || ('r-' + Date.now());
      }
      state.online.lastSrvState = 'playing';

      // phase 映射
      state.phase = srv.phase === 'bidding' ? PHASE.BIDDING :
                    srv.phase === 'doubling' ? PHASE.DOUBLING :
                    srv.phase === 'playing' ? PHASE.PLAYING :
                    srv.phase === 'settlement' ? PHASE.SETTLEMENT : PHASE.IDLE;

      // hand 数据
      if (srv.me && srv.me.hand) state.hands[0] = srv.me.hand.slice();
      // 其他人只有数量（用占位填充）
      for (const p of srv.players) {
        const ds = rotateSeat(p.seat - 1);
        if (ds === 0) continue;
        state.hands[ds] = new Array(p.handCount || 0).fill(0);
      }
      pruneSelectedToHand();

      state.bottom = srv.bottom || [];
      state.bottomRevealed = !!srv.bottomRevealed;
      state.landlordIdx = srv.landlordIdx >= 0 ? rotateSeat(srv.landlordIdx) : -1;
      state.multiplier = srv.multiplier || 1;
      state.bombCount = srv.bombCount || 0;
      state.spring = srv.spring || 0;
      state.landlordPlayCount = srv.landlordPlayCount || 0;
      state.peasantPlayCount = srv.peasantPlayCount || 0;

      // 阶段相关字段：每次 apply 都重置，再按当前 srv.phase 填，避免上一阶段残留
      state.bidActions = [];
      state.bidTurnIdx = -1;
      state.landlordCandidate = -1;
      state.robCount = 0;
      // 同步当前配置 / 累计分 / 轮次（始终）
      state.online.config = srv.config || state.online.config || {};
      state.online.cumulativeScores = srv.cumulativeScores || {};
      state.online.currentRound = srv.currentRound || 1;
      // 明牌：若 server 指明了明牌玩家，把对方手牌摊开
      state.declaredSeat = srv.declaredSeat != null && srv.declaredSeat >= 0 ? rotateSeat(srv.declaredSeat) : -1;
      state.declared = state.declaredSeat >= 0;
      if (srv.declaredHand && state.declaredSeat >= 0) {
        state.hands[state.declaredSeat] = srv.declaredHand.slice();
      }
      if (srv.phase === 'bidding') {
        state.bidActions = (srv.bidActions || []).map(a => ({ seat: rotateSeat(a.seat), action: a.action, score: a.score }));
        state.bidTurnIdx = rotateSeat(srv.bidTurnIdx);
        state.landlordCandidate = srv.landlordCandidate >= 0 ? rotateSeat(srv.landlordCandidate) : -1;
        state.robCount = srv.robCount || 0;
        state.online.bidScore = srv.bidScore || 0;
      }
      // 加倍状态（无论什么 phase，都从 srv 同步，保证 badge 正确）
      {
        const dDecided = [false, false, false];
        const dChoice = [null, null, null];
        for (let s = 0; s < 3; s++) {
          dDecided[rotateSeat(s)] = (srv.doubleDecided || [])[s] || false;
          dChoice[rotateSeat(s)] = (srv.doubleChoice || [])[s] || null;
        }
        state.online.doubleDecided = dDecided;
        state.online.doubleChoice = dChoice;
        if (srv.phase === 'doubling') state.online.doubleEndAt = srv.doubleEndAt || 0;
      }
      // 出牌阶段字段：也每次 apply 都重置（避免下一盘开局看到上盘 lastTrick）
      const prevLastTrick = state.lastTrick;
      const prevPassCount = state.passCount || 0;
      state.turnIdx = -1;
      state.lastTrick = null;
      state.passCount = 0;
      state.online.turnEndAt = 0;
      if (srv.phase === 'playing') {
        state.turnIdx = rotateSeat(srv.turnIdx);
        state.lastTrick = srv.lastTrick
          ? { seat: rotateSeat(srv.lastTrick.seat), pattern: srv.lastTrick.pattern }
          : null;
        state.passCount = srv.passCount || 0;
        state.online.turnEndAt = srv.turnEndAt || 0;
        // 检测「新出牌」：lastTrick 变了 → 触发飞牌 + 微反馈环
        const isNewPlay = state.lastTrick && (
          !prevLastTrick ||
          prevLastTrick.seat !== state.lastTrick.seat ||
          (prevLastTrick.pattern && prevLastTrick.pattern.cards
            ? prevLastTrick.pattern.cards.join(',')
            : '') !== (state.lastTrick.pattern && state.lastTrick.pattern.cards
              ? state.lastTrick.pattern.cards.join(',')
              : '')
        );
        if (isNewPlay) {
          const ptype = state.lastTrick.pattern.type;
          playSfx(ptype === T.BOMB ? 'bomb' :
                  ptype === T.ROCKET ? 'rocket' : 'play');
        } else if (state.passCount > prevPassCount) {
          playSfx('pass');
        }
      }
      if (srv.phase === 'settlement' && srv.result) {
        const r = srv.result;
        state.result = {
          winnerSeat: rotateSeat(r.winnerSeat),
          winnerRole: r.winnerRole,
          multiplier: r.multiplier,
          score: r.score,
        };
        state.spring = r.spring || state.spring;
        state.bombCount = r.bombCount || state.bombCount;
        // 揭示所有手牌
        if (srv.allHands) {
          for (const p of srv.players) {
            const ds = rotateSeat(p.seat - 1);
            state.hands[ds] = (srv.allHands[p.id] || []).slice();
          }
        }
      }

      // 渲染所有
      renderHand();
      renderHandCounts();
      renderRoles();
      // 在联机模式下，设置每家头像 emoji + name 显示真实玩家信息
      applyOnlinePlayerLabels(srv);
      renderBottomPile();
      renderMultiplier();

      // 根据 publicLog 推断每家的 last play 渲染（粗略：只渲染最新一手出牌 / pass）
      // 用 srv.lastTrick + srv.passCount 即可
      // 实际：每次有新动作就根据 publicLog 最新条 push 到对应座位
      renderRecentActionsFromLog(srv);

      if (state.phase === PHASE.BIDDING) {
        renderOnlineBidPanel();
        updateOnlineCountdown();             // 闹钟贴到当前抢地主玩家
      } else if (state.phase === PHASE.DOUBLING) {
        hideAllClocks();                      // 加倍同时决策，不在头像上显示
        renderOnlineDoublePanel();
      } else if (state.phase === PHASE.PLAYING) {
        playActions.hidden = false;
        bidPanel.hidden = true;
        updateOnlineCountdown();
        const meTurn = state.turnIdx === 0;
        if (meTurn) setStatus('轮到你 — 出牌或不出');
        else setStatus(`等待 ${seatLabel(state.turnIdx)} 出牌…`);
        updatePlayBtnState();
      } else if (state.phase === PHASE.SETTLEMENT) {
        playActions.hidden = true;
        bidPanel.hidden = true;
        stopTurnCountdown();
        hideAllClocks();
        showOnlineGameOver();
      }
    }
  }

  // 只渲染"当前 trick"（最近一次未结束的轮次）的牌；轮次结束（lastTrick=null）就清空
  function renderRecentActionsFromLog(srv) {
    // 没有当前 trick 就全清
    if (!srv.lastTrick) {
      clearAllPlayed();
    } else {
      // lastTrick.seat 是这一 trick 的领出者；他的牌一直留在桌面
      const leaderServerSeat = srv.lastTrick.seat;
      const leaderDS = rotateSeat(leaderServerSeat);
      // 先全清，再画当前 trick
      clearAllPlayed();
      renderPlayedAt(leaderDS, srv.lastTrick.pattern);
      // 之后顺时针 passCount 个座位都是 pass
      const passCount = srv.passCount || 0;
      for (let i = 1; i <= passCount; i++) {
        const passServerSeat = (leaderServerSeat + i) % 3;
        renderPlayedAt(rotateSeat(passServerSeat), 'pass');
      }
    }
    // 当前正在思考的对家：显示思考动画
    if (state.phase === PHASE.PLAYING && state.turnIdx !== 0) {
      const el = $('ddzPlayed' + state.turnIdx);
      if (el && !el.children.length) {
        el.className = 'ddz-played';
        el.innerHTML = '<span class="think-tag">思考</span>';
      }
    }
  }

  // ── 大厅渲染 ────────────────────────────────────────────────────────
  function renderLobbyPlayers(srv) {
    const players = srv.players || [];
    const cfg = srv.config || {};
    $('ddzRoomCode').textContent = srv.code;
    // 配置 summary
    const summaryEl = $('ddzConfigSummary');
    if (summaryEl) summaryEl.innerHTML = configSummaryHtml(cfg);
    // 真人需要的人数 = 3 - aiCount
    const requiredHumans = 3 - (cfg.aiCount || 0);
    const humanCount = players.length;
    $('ddzLobbyCount').textContent = `${humanCount}/${requiredHumans}` + (cfg.aiCount > 0 ? ` (+${cfg.aiCount} AI)` : '');
    const ul = $('ddzLobbyPlayers');
    ul.innerHTML = '';
    for (let s = 0; s < requiredHumans; s++) {
      const li = document.createElement('li');
      const p = players[s];
      if (!p) {
        li.className = 'empty';
        li.innerHTML = `<span class="seat">座 ${s + 1}</span><span class="nick">— 等待加入 —</span>`;
      } else {
        const isMe = p.id === state.online.playerId;
        const badges = [];
        if (p.isHost) badges.push('<span class="badge host">房主</span>');
        if (isMe) badges.push('<span class="badge me">我</span>');
        if (!p.online) badges.push('<span class="badge offline">离线</span>');
        li.innerHTML = `<span class="seat">座 ${p.seat}</span><span class="nick">${escHtml(p.nick)}</span>${badges.join('')}`;
        if (state.online.isHost && !isMe) {
          const kickBtn = document.createElement('button');
          kickBtn.className = 'ddz-btn-mini';
          kickBtn.textContent = '踢';
          kickBtn.addEventListener('click', () => sendKick(p.id));
          li.appendChild(kickBtn);
        }
      }
      ul.appendChild(li);
    }
    // AI 占位行
    for (let i = 0; i < (cfg.aiCount || 0); i++) {
      const li = document.createElement('li');
      const seat = requiredHumans + i + 1;
      li.innerHTML = `<span class="seat">座 ${seat}</span><span class="nick">🤖 AI · ${({ easy: '新手', normal: '普通', hard: '高手' })[cfg.aiLevel] || '普通'}</span><span class="badge">AI</span>`;
      ul.appendChild(li);
    }
    const startBtn = $('ddzLobbyStartBtn');
    const ready = humanCount === requiredHumans && state.online.isHost;
    startBtn.disabled = !ready;
    startBtn.textContent = state.online.isHost
      ? (humanCount < requiredHumans ? `开始（需 ${requiredHumans} 人，已 ${humanCount} 人）` : '🎮 开始游戏')
      : '等待房主开始…';
  }

  function setAvatarEmoji(displaySeat, emoji) {
    const av = document.getElementById('ddzAvatar' + displaySeat);
    if (!av) return;
    if (av.firstChild && av.firstChild.nodeType === 3) {
      av.firstChild.textContent = emoji;
    }
  }
  function applyOnlinePlayerLabels(srv) {
    // 把每个 server seat 的 player 信息映射到对应 displaySeat 的头像 + 名字
    for (const p of srv.players || []) {
      const ds = rotateSeat(p.seat - 1);
      if (ds === 0) {
        setAvatarEmoji(0, p.isAi ? '🤖' : '😎');
        // 自家 name 在 renderRoles 里管：保留「我（地主/农民）」
      } else {
        setAvatarEmoji(ds, p.isAi ? '🤖' : '🧑');
        const nameEl = $('ddzName' + ds);
        if (nameEl) {
          const baseName = p.nick;
          const role = (p.seat - 1) === srv.landlordIdx ? '地主' : (srv.landlordIdx >= 0 ? '农民' : '');
          nameEl.textContent = role ? `${baseName}（${role}）` : baseName;
        }
      }
    }
  }

  function escHtml(s) {
    return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  // 复制按钮
  $('ddzCopyCodeBtn').addEventListener('click', () => copyText(state.online && state.online.code));
  $('ddzCopyLinkBtn').addEventListener('click', () => {
    const url = location.origin + location.pathname + '?room=' + (state.online && state.online.code);
    copyText(url);
  });
  function copyText(t) {
    if (!t) return;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => flashStatus('已复制'));
    else flashStatus('请手动复制：' + t);
  }
  function flashStatus(msg) {
    const old = $('ddzOnlineHint').textContent;
    $('ddzOnlineHint').textContent = msg;
    setTimeout(() => { if ($('ddzOnlineHint').textContent === msg) $('ddzOnlineHint').textContent = old; }, 1400);
  }

  $('ddzLobbyStartBtn').addEventListener('click', async () => {
    if (!state.online) return;
    const r = await apiCall('start', { body: { code: state.online.code, token: state.online.token } });
    if (!r.ok) alert('开始失败：' + r.error);
  });
  $('ddzLobbyLeaveBtn').addEventListener('click', () => leaveOnlineRoom(false));

  async function sendKick(targetPid) {
    if (!state.online) return;
    const r = await apiCall('kick', { body: { code: state.online.code, token: state.online.token, targetPid } });
    if (!r.ok) alert('踢人失败：' + r.error);
  }

  async function leaveOnlineRoom(silent) {
    if (state.online) {
      try {
        await apiCall('leave', { body: { code: state.online.code, token: state.online.token } });
      } catch {}
      stopPolling();
    }
    clearSession();
    state.online = null;
    state.mode = 'single';
    document.querySelectorAll('.ddz-playmode-btn').forEach(x => x.classList.toggle('active', x.dataset.playmode === 'single'));
    singleSetupEl.hidden = false;
    onlineSetupEl.hidden = true;
    lobbyEl.hidden = true;
    tableView.hidden = false;
    setupView.hidden = false;
    gameOverOverlay.classList.remove('show', 'has-spring');
    if (!silent) setOnlineHint('已离开房间');
    renderResumeOption();
  }
  window.addEventListener('beforeunload', () => {
    if (state.online && state.online.token) {
      // 用 sendBeacon 让 leave 在页面卸载时也能发出去
      try {
        const body = JSON.stringify({ code: state.online.code, token: state.online.token });
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(`${DDZ_API}?action=leave`, blob);
      } catch {}
    }
  });

  // ── 联机抢地主 / 叫分 面板 ───────────────────────────────────────
  function renderOnlineBidPanel() {
    bidPanel.hidden = false;
    playActions.hidden = true;
    const myTurn = state.bidTurnIdx === 0;
    const cfg = state.online && state.online.config || {};
    const isCallMode = cfg.bidStyle === 'call';
    const isFirst = state.landlordCandidate < 0;

    if (!myTurn) {
      bidTitle.textContent = `等待 ${seatLabel(state.bidTurnIdx)} ${isCallMode ? '叫分' : (isFirst ? '叫地主' : '抢地主')}…`;
      bidButtonsEl.innerHTML = '';
      return;
    }

    if (isCallMode) {
      const cur = state.online.bidScore || 0;
      bidTitle.textContent = cur > 0 ? `当前最高 ${cur} 分，要叫更高吗？` : '叫地主吗？（按底分）';
      const items = [{ label: '不叫', value: 'pass' }];
      for (let n = 1; n <= 3; n++) {
        if (n > cur) items.push({ label: n + ' 分', value: n, primary: n === 3 });
      }
      renderBidButtons(items, async (act) => {
        bidPanel.hidden = true;
        const r = await apiCall('bid', { body: { code: state.online.code, token: state.online.token, action: act } });
        if (!r.ok) setStatus('叫分失败：' + r.error);
      });
    } else {
      bidTitle.textContent = isFirst ? '叫地主吗？' : `已有人叫，要抢吗？（当前倍数 ×${state.multiplier}）`;
      renderBidButtons([
        { label: isFirst ? '叫地主' : '抢地主', value: 'rob', primary: true },
        { label: isFirst ? '不叫' : '不抢', value: 'pass' },
      ], async (act) => {
        bidPanel.hidden = true;
        const r = await apiCall('bid', { body: { code: state.online.code, token: state.online.token, action: act } });
        if (!r.ok) setStatus('叫地主失败：' + r.error);
      });
    }
  }

  // ── 联机加倍面板（同时决策） ───────────────────────────────────────
  let onlineDoubleTimer = null;
  function renderOnlineDoublePanel() {
    bidPanel.hidden = false;
    playActions.hidden = true;
    renderDoublePanelLayout({
      decided: state.online.doubleDecided.slice(),
      choice: state.online.doubleChoice.slice(),
      onChoose: (c) => sendOnlineDouble(c),
    });

    // 倒计时（用 server endAt）
    if (onlineDoubleTimer) clearInterval(onlineDoubleTimer);
    function tick() {
      const left = Math.max(0, (state.online.doubleEndAt || 0) - Date.now());
      const s = Math.ceil(left / 1000);
      const cd = document.getElementById('ddzDoubleCountdown');
      if (cd) cd.textContent = s + 's';
      if (left <= 0) { clearInterval(onlineDoubleTimer); onlineDoubleTimer = null; }
    }
    tick();
    onlineDoubleTimer = setInterval(tick, 250);
  }

  async function sendOnlineDouble(choice) {
    if (!state.online) return;
    state.online.doubleDecided[0] = true;
    state.online.doubleChoice[0] = choice;
    renderOnlineDoublePanel();
    const r = await apiCall('double', { body: { code: state.online.code, token: state.online.token, action: choice } });
    if (!r.ok && r.error !== 'already_decided') alert('加倍失败：' + r.error);
  }

  // ── 联机出牌 / pass ────────────────────────────────────────────────
  async function sendOnlinePlay(cards) {
    const r = await apiCall('play', { body: { code: state.online.code, token: state.online.token, cards } });
    if (!r.ok) {
      const msg = ({
        'invalid_pattern': '牌型不合法',
        'cannot_beat': '压不住上家',
        'not_your_turn': '还没轮到你',
        'card_not_in_hand': '有牌不在手里',
      })[r.error] || ('出牌失败：' + r.error);
      setStatus(msg);
    }
  }
  async function sendOnlinePass() {
    const r = await apiCall('pass', { body: { code: state.online.code, token: state.online.token } });
    if (!r.ok) {
      const msg = ({
        'cannot_pass_first': '首出不能不出',
        'not_your_turn': '还没轮到你',
      })[r.error] || ('不出失败：' + r.error);
      setStatus(msg);
    }
  }

  // ── 联机结算 ────────────────────────────────────────────────────────
  function showOnlineGameOver() {
    if (!state.result) return;
    const playerWon = state.result.winnerSeat === 0;
    const cfg = state.online.config || {};
    const totalRounds = state.result.totalRounds || cfg.rounds || 1;
    const roundN = state.result.round || 1;
    const isLastRound = !!state.result.gameEnded;

    gameOverTitle.textContent = isLastRound
      ? (playerWon ? '🏆 整局结束！你赢了' : '🏁 整局结束')
      : (playerWon ? '🎉 你赢了' : '😢 你输了') + `（${roundN} / ${totalRounds}）`;
    setTimeout(() => playSfx(playerWon ? 'win' : 'lose'), 300);

    const myRole = state.landlordIdx === 0 ? '地主' : '农民';
    const winText = state.result.winnerRole === 'landlord' ? '地主' : '农民';
    const springBadge = state.spring > 0
      ? `<div class="ddz-spring-badge">${state.result.winnerRole === 'landlord' ? '🌸 春天' : '🍁 反春天'} ×2</div>`
      : '';
    const roleMul = state.result.winnerRole === 'landlord' ? 2 : 1;

    let html = springBadge +
      `<div>${winText}获胜 · 倍数 ×${state.result.multiplier} · 你是${myRole}</div>` +
      `<div>本盘积分 <strong>${state.result.score}</strong>（角色加权 ×${roleMul}）</div>`;

    // 累计积分排行（永远显示，最少 1 行）
    const cum = state.online.cumulativeScores || {};
    const players = (state.online.players || []).slice().sort((a, b) => (cum[b.id] || 0) - (cum[a.id] || 0));
    if (players.length > 0) {
      html += '<div style="margin-top:0.6rem; padding:0.5rem 0.7rem; background:rgba(255,255,255,0.05); border:1px solid var(--ddz-frame-2); border-radius:8px;">';
      html += `<div style="font-size:0.85rem; color:var(--ddz-text-on-felt-mute); margin-bottom:0.3rem;">累计积分 · 第 ${roundN} / ${totalRounds} 盘</div>`;
      const medals = ['🥇', '🥈', '🥉'];
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const sc = cum[p.id] || 0;
        const isMe = p.id === state.online.playerId;
        html += `<div style="display:flex; justify-content:space-between; padding:0.18rem 0; ${isMe ? 'color:var(--ddz-accent-strong); font-weight:600;' : ''}">`;
        html += `<span>${medals[i] || ('#' + (i + 1))} ${escHtml(p.nick)}${p.isAi ? ' 🤖' : ''}${isMe ? ' (我)' : ''}</span>`;
        html += `<span>${sc >= 0 ? '+' : ''}${sc} 分</span>`;
        html += '</div>';
      }
      html += '</div>';
    }

    if (!isLastRound) {
      html += state.online.isHost
        ? `<div style="margin-top:0.5rem;font-size:0.82rem;color:var(--ddz-accent-strong);">房主可点「下一盘」</div>`
        : `<div style="margin-top:0.5rem;font-size:0.82rem;opacity:0.7;">等待房主开始下一盘…</div>`;
    }

    gameOverDetail.innerHTML = html;
    gameOverOverlay.classList.toggle('has-spring', state.spring > 0);

    // —— Reveal 阶段（同单机 finishGame）：先翻开手牌 + 大字 + 飘金币，再弹浮层
    revealOpponentHandsForSettlement();
    showSettleBanner(playerWon);
    // 联机也按 pair 计算，但服务器已直接给了 score（我视角的净分）；
    // 视觉上每家飘自己的净增减：地主家 = ±|score|×（若是地主则用 score；若我是农民则反推不准）
    // 折中：用 cumulativeScores 的「本盘增量」如果有；否则用我视角 score 推地主 / 两农民
    showOnlineCoinDeltas(state.result, state.online);
    if (state.spring > 0) spawnSakuraPetals(40);

    setTimeout(() => { gameOverOverlay.classList.add('show'); }, 1800);
    if (ddzSettleBtn) ddzSettleBtn.setEnabled(true);

    // 按钮
    const playAgainBtn = $('ddzPlayAgainBtn');
    const backBtn = $('ddzBackToSetupBtn');
    if (isLastRound) {
      playAgainBtn.textContent = '退出大厅';
      playAgainBtn.onclick = () => { gameOverOverlay.classList.remove('show', 'has-spring'); leaveOnlineRoom(false); };
      backBtn.textContent = '关闭';
      backBtn.onclick = () => { gameOverOverlay.classList.remove('show', 'has-spring'); };
    } else {
      playAgainBtn.textContent = '下一盘';
      playAgainBtn.onclick = async () => {
        if (!state.online.isHost) { alert('只有房主可以开始下一盘'); return; }
        const r = await apiCall('rematch', { body: { code: state.online.code, token: state.online.token } });
        if (!r.ok) alert('下一盘失败：' + r.error);
      };
      backBtn.textContent = '退出';
      backBtn.onclick = () => { gameOverOverlay.classList.remove('show', 'has-spring'); leaveOnlineRoom(false); };
    }

    if (playerWon) tryAutoSubmitOnline();
  }

  function tryAutoSubmitOnline() {
    if (!window.GamesShell || !state.result) return;
    const totalActions = state.landlordPlayCount + state.peasantPlayCount;
    const moves = Math.max(4, Math.min(500, totalActions));
    const durationMs = Math.max(5000, Date.now() - state.runStartedAt);
    let nick = GamesShell.Identity.getNick();
    if (!nick) nick = state.online && (state.online.players.find(p => p.id === state.online.playerId) || {}).nick;
    if (!nick) return;
    const weight = difficultyWeight('online');                // 联机权重 = 3
    const score = Math.min(4096, state.result.score * weight);
    GamesShell.WinsLeaderboard.submit({
      gameId: 'doudizhu-online',
      nick,
      did: GamesShell.Identity.getDeviceId(),
      aiLevel: 'hard',                  // 联机投到 hard 桶（排序优先级最高）
      moves,
      durationMs,
      clientNonce: state.runNonce,
      score,
    }).then(r => {
      if (r && r.ok && ddzWlbOnline) ddzWlbOnline.refresh();
    });
  }

  // ── 联机倒计时（贴在当前出牌玩家头像上）─────────────────────────────
  let onlineTurnTimer = null;
  function updateOnlineCountdown() {
    if (onlineTurnTimer) clearInterval(onlineTurnTimer);
    hideAllClocks();
    // 出牌阶段用 turnIdx，抢地主阶段用 bidTurnIdx
    let seat;
    let endAt;
    if (state.phase === PHASE.PLAYING) {
      seat = state.turnIdx;
      endAt = state.online.turnEndAt;
    } else if (state.phase === PHASE.BIDDING) {
      seat = state.bidTurnIdx;
      endAt = state.online.turnEndAt;       // bidding 也用 turnEndAt（server.deadlineTs）
    } else return;
    const cdEl = clockEl(seat);
    if (!cdEl) return;
    cdEl.hidden = false;
    let lastTickedSec = 99;
    function tick() {
      const left = Math.max(0, (endAt || 0) - Date.now());
      const s = Math.ceil(left / 1000);
      cdEl.textContent = s + 's';
      cdEl.classList.toggle('urgent', s <= 5);
      // 只在自己（seat===0）轮次的最后 3 秒播心跳音
      if (seat === 0 && s !== lastTickedSec && s > 0 && s <= 3) {
        playSfx('tick');
      }
      lastTickedSec = s;
      if (left <= 0) {
        clearInterval(onlineTurnTimer); onlineTurnTimer = null;
        cdEl.classList.remove('urgent');
      }
    }
    tick();
    onlineTurnTimer = setInterval(tick, 250);
  }

  // ── 挂载额外的联机榜（在初始化时一并） ───────────────────────────────
  let ddzWlbOnline = null;
  if (window.GamesShell && GamesShell.WinsLeaderboard) {
    // 找一个挂载点：复用 wlb-mount 下方再加一个
    const onlineMountWrap = document.createElement('div');
    onlineMountWrap.id = 'ddz-wlb-online-mount';
    onlineMountWrap.style.cssText = 'max-width: 600px; margin: 1rem auto 0;';
    const oldMount = $('ddz-wlb-mount');
    if (oldMount && oldMount.parentNode) oldMount.parentNode.insertBefore(onlineMountWrap, oldMount.nextSibling);
    ddzWlbOnline = GamesShell.WinsLeaderboard.mount({
      container: onlineMountWrap,
      gameId: 'doudizhu-online',
      title: '🌐 斗地主 · 联机积分榜',
      unit: '分',
      getCurrentNick: () => GamesShell.Identity.getNick(),
    });
  }

  // ── URL ?room=xxxx 自动加入房间 ────────────────────────────────
  (function autoJoinFromUrl() {
    const m = location.search.match(/[?&]room=(\d{4})/);
    if (!m) return;
    const code = m[1];

    // 切到联机模式的加入 tab，预填房号
    document.querySelector('.ddz-playmode-btn[data-playmode="online"]').click();
    document.querySelector('.ddz-online-tab[data-tab="join"]').click();
    $('ddzOnlineCode').value = code;

    // 如果有已保存的昵称，自动填入并直接加入房间
    const savedNick = (window.GamesShell && GamesShell.Identity && GamesShell.Identity.getNick()) || '';
    if (savedNick) {
      $('ddzOnlineNick').value = savedNick;
      // 延迟一小段确保 DOM 切换完成后再发起加入
      setTimeout(() => { $('ddzOnlineSubmit').click(); }, 200);
    } else {
      // 没有昵称时聚焦输入框，给出清晰提示
      $('ddzOnlineNick').focus();
      $('ddzOnlineNick').placeholder = '取个昵称，自动加入房间';
      setOnlineHint('输入昵称后点"加入"或按回车即可', false);
    }
  })();

  preloadNick();
  renderResumeOption();

  // ============================================================
  // 续局
  // ============================================================
  function ddzSerialize() {
    if (state.phase !== PHASE.PLAYING && state.phase !== PHASE.BIDDING && state.phase !== PHASE.DOUBLING) return null;
    return {
      v: 2,
      phase: state.phase,
      difficulty: state.difficulty,
      hands: state.hands.map(h => h.slice()),
      bottom: state.bottom.slice(),
      bottomRevealed: state.bottomRevealed,
      bottomPlayed: Array.from(state.bottomPlayed || []),
      landlordIdx: state.landlordIdx,
      landlordCandidate: state.landlordCandidate,
      bidStartSeat: state.bidStartSeat,
      bidTurnIdx: state.bidTurnIdx,
      bidActions: state.bidActions.slice(),
      robCount: state.robCount,
      callDecided: (state.callDecided || [false,false,false]).slice(),
      callPassed:  (state.callPassed  || [false,false,false]).slice(),
      robDecided:  (state.robDecided  || [false,false,false]).slice(),
      doubleTurnIdx: state.doubleTurnIdx,
      doubleActions: state.doubleActions.slice(),
      multiplier: state.multiplier,
      bombCount: state.bombCount,
      spring: state.spring,
      landlordPlayCount: state.landlordPlayCount,
      peasantPlayCount: state.peasantPlayCount,
      turnIdx: state.turnIdx,
      lastTrick: state.lastTrick,
      passCount: state.passCount,
      seen: state.seen.slice(),
      aiPerceivedSeen: state.aiPerceivedSeen.map(x => x ? x.slice() : null),
      runStartedAt: state.runStartedAt,
      runNonce: state.runNonce,
    };
  }

  function ddzRestore(saved) {
    Object.assign(state, {
      phase: saved.phase,
      difficulty: saved.difficulty || 'normal',
      hands: saved.hands || [[],[],[]],
      bottom: saved.bottom || [],
      bottomRevealed: !!saved.bottomRevealed,
      bottomPlayed: new Set(saved.bottomPlayed || []),
      landlordIdx: typeof saved.landlordIdx === 'number' ? saved.landlordIdx : -1,
      landlordCandidate: typeof saved.landlordCandidate === 'number' ? saved.landlordCandidate : -1,
      bidStartSeat: saved.bidStartSeat || 0,
      bidTurnIdx: saved.bidTurnIdx || 0,
      bidActions: saved.bidActions || [],
      robCount: saved.robCount || 0,
      callDecided: saved.callDecided || [false,false,false],
      callPassed:  saved.callPassed  || [false,false,false],
      robDecided:  saved.robDecided  || [false,false,false],
      doubleTurnIdx: saved.doubleTurnIdx || 0,
      doubleActions: saved.doubleActions || [],
      multiplier: saved.multiplier || 1,
      bombCount: saved.bombCount || 0,
      spring: saved.spring || 0,
      landlordPlayCount: saved.landlordPlayCount || 0,
      peasantPlayCount: saved.peasantPlayCount || 0,
      turnIdx: saved.turnIdx || 0,
      lastTrick: saved.lastTrick || null,
      passCount: saved.passCount || 0,
      seen: saved.seen || new Array(15).fill(0),
      aiPerceivedSeen: saved.aiPerceivedSeen ||
        [null, new Array(15).fill(0), new Array(15).fill(0)],
      runStartedAt: saved.runStartedAt || Date.now(),
      runNonce: saved.runNonce || (window.GamesShell ? GamesShell.Identity.newRunNonce() : 'r-' + Date.now()),
      selected: new Set(),
      result: null,
      resumed: true,
    });
    document.querySelectorAll('.ddz-mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.diff === state.difficulty);
    });
    setupView.hidden = true;
    tableView.hidden = false;
    clearAllPlayed();
    renderBottomPile();
    renderHand();
    renderHandCounts();
    renderRoles();
    renderMultiplier();
    if (state.lastTrick) renderPlayedAt(state.lastTrick.seat, state.lastTrick.pattern);
    if (state.phase === PHASE.BIDDING) {
      // 把已表态的 AI 玩家头像下贴回 叫/抢/不叫/不抢 tag，避免 clearAllPlayed 把它们吃掉
      for (const a of (state.bidActions || [])) {
        renderBidTagAt(a.seat, a.action, a.phase === 'call');
      }
      nextBidTurn();
    } else if (state.phase === PHASE.DOUBLING) {
      // 加倍是同时阶段，恢复就重新开 5s 决策（已决定的 doubleActions 也清掉）
      state.doubleActions = [];
      enterDoubling();
    } else if (state.phase === PHASE.PLAYING) {
      proceedTurn();
    }
  }

  if (window.GamesShell && GamesShell.SaveState) {
    ddzSave = GamesShell.SaveState.create({
      key: 'tool.doudizhu.savestate.v1',
      ttlMs: 48 * 3600 * 1000,
      serialize: ddzSerialize,
    });
    const peek = ddzSave.peek();
    if (peek && peek.data && peek.data.phase && (peek.data.v == null || peek.data.v >= 2)) {
      const handsTotal = (peek.data.hands || []).reduce((s, h) => s + (h ? h.length : 0), 0);
      const phaseLabel = peek.data.phase === 'bidding' ? '抢地主中' :
                          peek.data.phase === 'doubling' ? '加倍中' : '出牌中';
      GamesShell.SaveState.showResumeModal({
        summaryHtml: `<strong>${difficultyLabel(peek.data.difficulty || 'normal')}</strong> · ${phaseLabel} · 牌桌剩 <strong>${handsTotal}</strong> 张<span class="gs-resume-meta">${peek.agoText}保存</span>`,
        onResume: () => { ddzRestore(peek.data); ddzSave.start(); },
        onDiscard: () => { ddzSave.discard(); ddzSave.start(); },
      });
    } else {
      // 旧版 (v=1) 存档不兼容新流程，丢弃
      if (peek) ddzSave.discard();
      ddzSave.start();
    }
  }
})();
