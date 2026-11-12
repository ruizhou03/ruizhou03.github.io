/* 猫咪炸毛 · 单机牌桌（我 + 1–4 只机器猫）。规则 zhamao-rules.js，机器人 zhamao-ai.js，牌面 zhamao-art.js，
 * 动画引擎 zhamao-fx.js，教程剧本 zhamao-tutorial.js，声音 zhamao-audio.js。
 * 座位：0 是我（下方），出牌顺序 0 → 1 → 2 …，桌上画成逆时针：1 号在右上，最后一号在左上。
 * 流程：每次改完状态都回到 step()，它看 state.phase 决定等我操作还是让机器人走。
 * 显示和规则分开：改状态前先把「桌上看得到的样子」拍一张（ov），动画按引擎返回的事件一个个播，
 * 播到哪一步 ov 就改到哪一步——牌飞到了，手牌数才加一；炸毛猫塞回去了，牌堆数才加一。全部播完 ov 清空、按真状态重画。 */
(() => {
  'use strict';

  const R = window.ZhamaoRules;
  const AI = window.ZhamaoAI;
  const ART = window.ZhamaoArt;
  const AV = window.GongzhuAvatars || null;
  const TUT = window.ZhamaoTutorial || null;

  const STORE_KEY = 'zm.game.v1';
  const SETTINGS_KEY = 'zm.settings.v1';
  const TUT_KEY = 'zm.tut.v1';
  const VERSION = 1;

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('zmApp'), table: $('zmTable'), opps: $('zmOpps'), center: $('zmCenter'),
    deck: $('zmDeck'), deckCount: $('zmDeckCount'), kit: $('zmKit'), discard: $('zmDiscard'), stage: $('zmStage'),
    coach: $('zmCoach'), me: $('zmMe'), hint: $('zmHint'), hand: $('zmHand'), fly: $('zmFly'),
    drawBtn: $('zmDrawBtn'), playBtn: $('zmPlayBtn'), nopeBtn: $('zmNopeBtn'), cancelBtn: $('zmCancelBtn'),
    cover: $('zmCover'), mask: $('zmDialogMask'), dialog: $('zmDialog'), skipTut: $('zmSkipTut'),
  };

  const snd = (name, delay) => { if (window.ZhamaoAudio) window.ZhamaoAudio.sfx(name, delay); };
  const fx = window.ZhamaoFx.create(els.fly, { sound: snd });

  // 节奏（毫秒）：机器人想一下、反应窗、飞牌、停顿
  const PACE = { bot: 760, react: 2800, quiet: 260, botNope: [500, 1100], fly: 460, k: 1 };
  const FAST = { bot: 240, react: 0, quiet: 120, botNope: [200, 300], fly: 260, k: 0.55 };
  const TUT_PACE = { bot: 1050, react: 0, quiet: 500, botNope: [900, 900], fly: 540, k: 1.2 };
  const pace = () => (game && game.tutorial ? TUT_PACE : game && !game.state.alive[0] ? FAST : PACE);
  const ms = (x) => Math.round(x * pace().k);

  const FUR = ['#3a3632', '#4a4540', '#2a2622', '#5c5650'];
  const GOLDS = ['#c9a96e', '#dcb86c', '#e9d46a'];
  const PURPLES = ['#7a5a96', '#9b7cb6', '#c4a8dc'];
  const PINKS = ['#e0566e', '#ef8f9f', '#f4b6c0'];
  const CONFETTI = ['#c8463a', '#c9a96e', '#2f4a6d', '#4f8a5f', '#e0893e', '#7a5a96', '#e0566e'];

  /* ───── 存档 / 设置 ───── */
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式：不存也能玩 */ } }
  const settings = Object.assign({ players: 4, tier: 'normal', turnSec: 20 }, readJSON(SETTINGS_KEY) || {});
  settings.rules = R.normalizeRules(settings.rules);
  if (!(settings.players >= 2 && settings.players <= 5)) settings.players = 4;
  if (AI.TIERS.indexOf(settings.tier) < 0) settings.tier = 'normal';
  const saveSettings = () => writeJSON(SETTINGS_KEY, settings);

  let game = null;      // { state, bots: [{nick, avatar}], tiers: [], tutorial }
  let token = 0;        // 重开 / 退出时作废旧的异步流程
  let busy = true;      // 动画中、机器人思考中：不接我的操作
  let selected = [];    // 我选中的手牌 id
  let mode = null;      // null | 'target'（点一个人）| 'give'（挑一张给人）
  let targetCb = null;
  let reactTimer = null;
  let tut = null;       // 教程控制器（见 zhamao-tutorial.js）
  let ov = null;        // 动画期间桌上显示的样子（见文件头）
  const handHidden = new Set();   // 手牌里「位置先占好、牌还在路上」的那几张

  function save() {
    if (!game || game.tutorial) return;
    if (game.state.phase === 'over') { localStorage.removeItem(STORE_KEY); return; }
    writeJSON(STORE_KEY, { v: VERSION, state: game.state, bots: game.bots, tiers: game.tiers });
  }
  function loadSaved() {
    const d = readJSON(STORE_KEY);
    if (!d || d.v !== VERSION || !d.state || d.state.phase === 'over') return null;
    const s = d.state;
    const total = s.deck.length + s.discard.length + s.removed.length + s.hands.reduce((a, h) => a + h.length, 0) + (s.defuse ? 1 : 0);
    if (total !== R.DECK_SIZE || !Array.isArray(d.tiers) || d.tiers.length !== s.n) return null;
    return d;
  }

  function drawBots(n) {
    const names = AV ? AV.BOT_NICKS.slice() : ['阿尔法', '贝塔', '伽马', '德尔塔'];
    const faces = AV ? AV.ROBOT.map((x) => x.id) : [];
    const take = (arr) => arr.length ? arr.splice((Math.random() * arr.length) | 0, 1)[0] : null;
    const out = [{ nick: '我', avatar: null }];
    for (let i = 1; i < n; i++) out.push({ nick: take(names), avatar: faces.length ? take(faces) : null });
    return out;
  }
  function avatarHtml(seat) {
    const b = game && game.bots[seat];
    if (b && b.avatar && AV && AV.byId[b.avatar]) return AV.byId[b.avatar].svg;
    if (seat === 0) return '<span>我</span>';
    return '<span>' + esc((b && b.nick || '?').slice(0, 1)) + '</span>';
  }
  const nameOf = (seat) => (game && game.bots[seat] ? game.bots[seat].nick : '');
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }

  /* ───── 牌 ───── */
  function cardHtml(kindOrId, cls, style) {
    const k = typeof kindOrId === 'number' ? R.KIND_OF[kindOrId] : kindOrId;
    const t = ART.TONE[k];
    return '<div class="zm-card' + (cls ? ' ' + cls : '') + '" data-k="' + k + '"' + (typeof kindOrId === 'number' ? ' data-id="' + kindOrId + '"' : '') +
      ' style="--bg:' + t.bg + ';--band:' + t.band + ';--ink:' + t.ink + (style ? ';' + style : '') + '">' +
      '<div class="zm-art">' + ART.face(k) + '</div><i class="zm-ic">' + ART.icon(k) + '</i><b class="zm-nm">' + R.NAMES[k] + '</b></div>';
  }
  const backHtml = (cls, style) => '<div class="zm-card is-back' + (cls ? ' ' + cls : '') + '"' + (style ? ' style="' + style + '"' : '') + '>' + ART.BACK + '</div>';
  const pileRot = (id) => ((id * 37) % 13) - 6;
  const U = () => parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
  const PU = () => U() * 0.92;     // 牌堆 / 弃牌堆的牌宽
  const SU = () => PU() * 1.15;    // 刚出的牌（压在弃牌堆上）的牌宽

  /* ───── 显示层 ───── */
  function stageIdsOf(s) { return s.phase === 'react' && s.pending ? s.pending.cards.concat(s.pending.nopes.map((x) => x.card)) : []; }
  function liveDisplay() {
    const s = game.state;
    const onStage = stageIdsOf(s);
    return {
      counts: s.hands.map((h) => h.length), hand: s.alive[0] ? s.hands[0].slice() : [],
      deckSize: s.deck.length, kittens: R.kittensInDeck(s),
      discard: s.discard.filter((id) => onStage.indexOf(id) < 0),
      turn: s.turn, turnsLeft: s.turnsLeft, alive: s.alive.slice(),
    };
  }
  const D = () => ov || liveDisplay();
  function snapshot() { ov = liveDisplay(); return ov; }
  function release() { ov = null; handHidden.clear(); }

  /* ───── 尺寸：只算 --u ───── */
  function solveSize() {
    const tb = els.table.getBoundingClientRect();
    const W = tb.width - 24, H = tb.height;
    const av = W < 500 ? 46 : 54;
    const fixed = 50 + (av + 50) + 66 + 26 + 40;
    let u = Math.min(W / 5.5, (H - fixed) / 2.7, 98);
    u = Math.max(46, Math.floor(u));
    els.app.style.setProperty('--u', u + 'px');
    layoutHand();
  }

  /* ───── 座位 ───── */
  // 轮到谁（照拱猪）：头像描一圈朱红、外面一道淡光；限时的话外圈一道红环顺时针收走，最后 5 秒头像跳
  const CLOCK_SVG = '<svg class="zm-clock" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" pathLength="100"/></svg>';
  function seatOrder() { const out = []; for (let s = game.state.n - 1; s >= 1; s--) out.push(s); return out; }
  function seatEl(seat) { return seat === 0 ? els.me : els.opps.querySelector('[data-seat="' + seat + '"]'); }
  function avEl(seat) { const s = seatEl(seat); return s && s.querySelector('.zm-av'); }
  function avPoint(seat) { const a = avEl(seat); return a ? fx.center(a.getBoundingClientRect()) : { x: innerWidth / 2, y: 80 }; }

  function buildSeats() {
    els.opps.innerHTML = '';
    seatOrder().forEach((seat) => {
      const d = document.createElement('section');
      d.className = 'zm-seat';
      d.dataset.seat = seat;
      d.addEventListener('click', () => onSeatTap(seat));
      els.opps.appendChild(d);
    });
    els.me.dataset.seat = 0;
    for (let s = 0; s < game.state.n; s++) seatEl(s).innerHTML = '';
  }
  function renderSeat(seat) {
    const s = game.state, d = D(), box = seatEl(seat);
    if (!box) return;
    const out = !d.alive[seat];
    const turn = !out && s.phase !== 'over' && d.turn === seat;
    box.classList.toggle('is-out', out);
    box.classList.toggle('is-turn', turn);
    // 结构只建一次：头像 / 名字不重画（动画要拿稳定的元素），只改数字和标记
    if (!box.querySelector('.zm-av')) {
      const tier = seat !== 0 && game.tiers[seat] && !game.tutorial ? '<span class="zm-tier">' + AI.TIER_NAMES[game.tiers[seat]] + '</span>' : '';
      box.innerHTML = '<div class="zm-av"><span class="zm-av-face">' + avatarHtml(seat) + '</span>' + CLOCK_SVG + '</div>' +
        '<span class="zm-name">' + esc(nameOf(seat)) + '</span>' + tier;
    }
    const av = box.querySelector('.zm-av');
    setBadge(av, 'zm-count', seat !== 0 && !out ? String(d.counts[seat]) : '');
    setBadge(av, 'zm-turns', turn && d.turnsLeft > 1 ? '×' + d.turnsLeft : '');
  }
  // 角标：数字变了就弹一下
  function setBadge(av, cls, text) {
    let b = av.querySelector('.' + cls);
    if (!text) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = cls; av.appendChild(b); b.textContent = text; fx.pop(b, { scale: 1.35 }); return; }
    if (b.textContent !== text) { b.textContent = text; fx.pop(b, { scale: 1.3, dur: 300 }); }
  }
  function renderSeats() { for (let i = 0; i < game.state.n; i++) renderSeat(i); }

  function bubble(seat, text, o) {
    o = Object.assign({ ms: 1700, loud: false, think: false }, o);
    const box = seatEl(seat);
    if (!box) return null;
    box.querySelectorAll('.zm-bubble').forEach((b) => b.remove());
    const b = document.createElement('span');
    b.className = 'zm-bubble' + (o.loud ? ' is-loud' : '') + (o.alarm ? ' is-alarm' : '') + (o.think ? ' is-think' : '');
    if (o.think) b.innerHTML = '<i></i><i></i><i></i>'; else b.textContent = text;
    b.style.animationDuration = o.ms + 'ms';
    box.appendChild(b);
    if (o.ms < 60000) setTimeout(() => b.remove(), o.ms);
    return b;
  }

  /* ───── 牌堆 / 弃牌堆 ─────
   * 牌堆是真的一摞：剩几张就叠几层「牌边」（奶油色纸边，每张的位置带一点点随机偏差，看着是手码的），最上面一张牌背。
   * 剩得越多越厚、影子越大；摸走一张就真少一层，顶上那张往下落一点。弃牌堆同理，只是歪歪扭扭地堆、上面露几张正面。
   * 两种叠法：乙 = 笔直往上叠、码得乱一点（用户 2026-11-12 选定，默认）；甲 = 斜着往左上叠（侧边、底边露纸边），?zmdeck=a 预览甲 */
  const DECK_LOOKS = { a: { sx: 0.0105, sy: 0.0105, jx: 0.0085, rot: 0 }, b: { sx: 0, sy: 0.0102, jx: 0.019, rot: 0.9 } };
  const DECK_LOOK = DECK_LOOKS[(new URLSearchParams(location.search).get('zmdeck') || '').toLowerCase()] || DECK_LOOKS.b;
  const EDGES = ['#f7f0e1', '#efe6d3', '#f3ebda', '#e8ddc7'];
  const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  function sheetXY(i, pu) {
    const L = DECK_LOOK;
    return { x: -i * L.sx * pu + (jit(i, 2) - 0.5) * L.jx * pu, y: -i * L.sy * pu, r: (jit(i, 3) - 0.5) * L.rot };
  }
  function sheetEl(i, pu, x, y, r) {
    const d = document.createElement('i');
    d.className = 'zm-sheet' + (i === 0 ? ' is-floor' : '');
    d.style.background = EDGES[Math.floor(jit(i, 1) * EDGES.length)];
    d.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)' + (r ? ' rotate(' + r.toFixed(2) + 'deg)' : '');
    return d;
  }
  let lastKit = -1, lastDeck = -1, deckPu = 0;
  function renderDeck(n) {
    const stack = els.deck.querySelector('.zm-deck-stack');
    const pu = PU();
    if (pu !== deckPu) { stack.innerHTML = ''; deckPu = pu; }   // 换了尺寸：整摞重码
    let top = stack.querySelector('.zm-card');
    const sheets = stack.querySelectorAll('.zm-sheet');
    const want = Math.max(0, n - 1);
    for (let i = sheets.length - 1; i >= want; i--) sheets[i].remove();
    for (let i = sheets.length; i < want; i++) { const q = sheetXY(i, pu); stack.insertBefore(sheetEl(i, pu, q.x, q.y, q.r), top); }
    if (!n) { if (top) top.remove(); }
    else {
      if (!top) { stack.insertAdjacentHTML('beforeend', backHtml('is-top')); top = stack.lastElementChild; }
      const i = n - 1, L = DECK_LOOK;
      top.style.transform = 'translate(' + (-i * L.sx * pu).toFixed(2) + 'px,' + (-i * L.sy * pu).toFixed(2) + 'px)';
    }
    els.deck.classList.toggle('is-empty', !n);
    els.deck.style.setProperty('--thick', Math.min(1, n / 50).toFixed(3));
  }
  function renderDiscard(list) {
    const pu = PU(), faces = list.slice(-4), m = Math.max(0, list.length - faces.length);
    const sy = DECK_LOOK.sy * pu * 0.8;
    let h = '';
    // 底下歪歪扭扭的纸边（每张随它自己的 id 定歪多少，不会每次重画都乱跳）
    for (let j = 0; j < m; j++) {
      const id = list[j];
      h += '<i class="zm-sheet' + (j === 0 ? ' is-floor' : '') + '" style="background:' + EDGES[id % EDGES.length] + ';transform:translate(' + ((jit(id, 5) - 0.5) * pu * 0.07).toFixed(2) + 'px,' + (-j * sy).toFixed(2) + 'px) rotate(' + ((jit(id, 6) - 0.5) * 7).toFixed(2) + 'deg)"></i>';
    }
    h += faces.map((id, i) => cardHtml(id, '', 'transform:translate(' + ((i - faces.length + 1) * 1.5).toFixed(1) + 'px,' + (-m * sy).toFixed(2) + 'px) rotate(' + pileRot(id) + 'deg)')).join('');
    els.discard.innerHTML = h;
  }
  function renderPiles() {
    const s = game.state, d = D();
    renderDeck(Math.max(0, d.deckSize));
    els.deckCount.textContent = d.deckSize;
    if (lastDeck >= 0 && lastDeck !== d.deckSize) fx.pop(els.deckCount, { scale: 1.25, dur: 260 });
    lastDeck = d.deckSize;
    els.kit.innerHTML = d.kittens ? ART.icon('boom') + '×' + d.kittens : '';
    els.kit.title = '牌堆里还有 ' + d.kittens + ' 只炸毛猫';
    if (lastKit >= 0 && lastKit !== d.kittens && d.kittens) { fx.pop(els.kit, { scale: 1.5, dur: 420 }); }
    lastKit = d.kittens;
    renderDiscard(d.discard);
    // 我知道顶上是炸毛猫：牌堆顶那张抖、发红光
    const known = !ov && s.alive[0] && s.memo[0].deck.length > 0 && R.KIND_OF[s.deck[0]] === R.BOOM && s.memo[0].deck.indexOf(s.deck[0]) >= 0;
    els.deck.classList.toggle('is-hot', known);
  }
  function deckTopRect() {
    const c = els.deck.querySelector('.zm-deck-stack .zm-card');
    return c ? c.getBoundingClientRect() : els.deck.getBoundingClientRect();
  }
  // 弃牌堆顶：落牌落在最上面那张的位置（堆高了就落得高一点）
  function discardRect() {
    const cs = els.discard.querySelectorAll('.zm-card');
    if (!cs.length) return els.discard.getBoundingClientRect();
    const r = els.discard.getBoundingClientRect(), dy = parseFloat((cs[cs.length - 1].style.transform.match(/translate\([^,]+,\s*(-?[\d.]+)px/) || [0, 0])[1]) || 0;
    return { left: r.left, top: r.top + dy, width: r.width, height: r.height, right: r.right, bottom: r.bottom + dy };
  }

  /* ───── 手牌：每次重画都用 FLIP 让留下的牌滑到新位置 ───── */
  function renderHand(o) {
    o = o || {};
    const s = game.state;
    const hand = D().hand;
    selected = selected.filter((id) => hand.indexOf(id) >= 0);
    const prev = new Map();
    if (o.flip !== false) els.hand.querySelectorAll('.zm-card').forEach((c) => prev.set(c.dataset.id, c.getBoundingClientRect()));
    const combo = selected.length && R.classify(selected) && mode !== 'give';
    els.hand.innerHTML = hand.map((id) => cardHtml(id,
      (selected.indexOf(id) >= 0 ? 'is-sel' + (combo ? ' is-combo' : '') : '') + (handHidden.has(id) ? ' is-incoming' : '') +
      (s.phase === 'react' && reactOpen && R.KIND_OF[id] === R.NOPE ? ' is-nope-ready' : ''))).join('');
    els.hand.querySelectorAll('.zm-card').forEach((c) => {
      c.addEventListener('click', (e) => { e.stopPropagation(); onCardTap(+c.dataset.id, c); });
    });
    els.hand.classList.toggle('is-giving', mode === 'give');
    els.hand.classList.toggle('is-myturn', myTurnToAct() && !mode);
    layoutHand();
    if (prev.size && !fx.reduce()) {
      els.hand.querySelectorAll('.zm-card').forEach((c) => {
        const p = prev.get(c.dataset.id);
        if (!p) return;
        const r = c.getBoundingClientRect();
        const dx = p.left - r.left, dy = p.top - r.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        c.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }, { transform: 'translate(0,0)' }],
          { duration: 300, easing: 'cubic-bezier(.3,.75,.3,1)', composite: 'add' });
      });
    }
  }
  function layoutHand() {
    const cards = els.hand.querySelectorAll('.zm-card');
    if (!cards.length) return;
    const u = U();
    const W = els.hand.clientWidth - 8;
    const n = cards.length;
    let gap = 6;
    if (n * u + (n - 1) * gap > W) gap = (W - u) / (n - 1) - u;
    cards.forEach((c, i) => { c.style.marginLeft = i === 0 ? '0' : gap.toFixed(1) + 'px'; c.style.zIndex = i; });
  }
  const handCard = (id) => els.hand.querySelector('[data-id="' + id + '"]');
  function handRectOf(id) { const c = handCard(id); return c ? c.getBoundingClientRect() : els.hand.getBoundingClientRect(); }
  // 手牌里给一张要飞进来的牌先占位（看不见），别的牌先滑开；返回占位的矩形
  function reserveHandSlot(id) {
    handHidden.add(id);
    if (ov && ov.hand.indexOf(id) < 0) { ov.hand.push(id); ov.hand = R.sortHand(ov.hand); }
    renderHand();
    return handRectOf(id);
  }
  function revealHandCard(id) {
    handHidden.delete(id);
    const c = handCard(id);
    if (!c) return;
    c.classList.remove('is-incoming');
    if (!fx.reduce()) c.animate([{ transform: 'translateY(-8px) scale(1.06)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,.8,.4,1.3)', composite: 'add' });
  }
  function dropFromHand(ids) { if (!ov) return; ov.hand = ov.hand.filter((x) => ids.indexOf(x) < 0); selected = selected.filter((x) => ids.indexOf(x) < 0); }

  /* ───── 按钮带 ───── */
  function myTurnToAct() { const s = game.state; return !busy && s.phase === 'act' && s.turn === 0 && s.alive[0]; }
  let lastPlayOn = false;
  // 按钮带（正中间）：「出牌」「摸牌」两个键一直在；没选牌 / 选的凑不成能出的 →「出牌」灰着。不写说明字（教程里教）。
  // 别人出牌后我有「不行」：紫色「喵？不行」顶在「出牌」的位置；点人时「摸牌」换成「取消」；别人蹭我牌时「出牌」换成「给他」
  function renderBand() {
    const s = game.state;
    const canNope = s.phase === 'react' && reactOpen && R.canNope(s, 0);
    els.nopeBtn.hidden = !canNope;
    els.cancelBtn.hidden = mode !== 'target';
    els.playBtn.hidden = false; els.drawBtn.hidden = false;
    els.playBtn.disabled = true; els.drawBtn.disabled = true;
    els.playBtn.textContent = '出牌'; els.drawBtn.textContent = '摸牌';
    els.drawBtn.classList.remove('is-ready');
    if (s.phase === 'over') { els.playBtn.hidden = true; els.drawBtn.hidden = true; }
    else if (game.dealing) { /* 发牌中：两个键都灰着 */ }
    else if (!s.alive[0]) { els.playBtn.hidden = true; els.drawBtn.disabled = false; els.drawBtn.textContent = '直接看结果'; }
    else if (mode === 'target') { els.drawBtn.hidden = true; }
    else if (mode === 'give') { els.playBtn.textContent = '给他'; els.playBtn.disabled = selected.length !== 1; }
    else if (canNope) { els.playBtn.hidden = true; }
    else if (myTurnToAct()) {
      els.drawBtn.disabled = false;
      els.drawBtn.classList.toggle('is-ready', !selected.length);
      const c = selected.length ? R.classify(selected) : null;
      els.playBtn.disabled = !(c && (!c.needsTarget || R.validTargets(s, 0).length));
    }
    // 「出牌」刚亮起来就弹一下
    const on = !els.playBtn.hidden && !els.playBtn.disabled;
    if (on && !lastPlayOn) fx.pop(els.playBtn, { scale: 1.1, dur: 280 });
    lastPlayOn = on;
    els.hint.textContent = '';
  }
  /* ───── 舞台：刚出的牌摆在桌子正中，导火索烧完前大家决定要不要「不行」 ───── */
  let reactOpen = false;
  function targetOf(p) {
    if (p.target >= 0) return p.target;
    if (p.type === R.ATTACK) return R.nextAlive(game.state, p.by);
    return -1;
  }
  // 舞台不加框、不写字：只有放大的牌 + 下面一根导火索。谁出的 = 牌从他头像飞出来 + 他头像亮一圈金光；指了谁 = 那人头像上套一个准星
  function showStage(p, hidden) {
    els.stage.classList.remove('is-cancelled', 'is-out');
    const named = p.type === 'triple' ? '<div class="zm-stage-named">' + cardHtml(p.named) + '</div>' : '';
    els.stage.innerHTML = '<div class="zm-stage-inner">' +
      '<div class="zm-stage-cards">' + p.cards.map((id, i) => cardHtml(id, hidden ? 'is-incoming' : '', 'transform:rotate(' + ((i - (p.cards.length - 1) / 2) * 5).toFixed(1) + 'deg)')).join('') + named + '<div class="zm-stage-nopes"></div></div>' +
      '<div class="zm-fuse" aria-hidden="true"><i class="rope"></i><i class="spark"></i></div></div>';
    placeStage();
    setActing(p.by);
  }
  // 出的牌直接落在弃牌堆上（稍大一圈），不悬在桌子正中；「不行」的窗口就在弃牌堆上开
  function placeStage() {
    const inner = els.stage.querySelector('.zm-stage-inner');
    if (!inner) return;
    const sr = els.stage.getBoundingClientRect(), dr = els.discard.getBoundingClientRect();
    inner.style.left = (dr.left + dr.width / 2 - sr.left).toFixed(1) + 'px';
    inner.style.top = (dr.top + dr.height / 2 - sr.top).toFixed(1) + 'px';
  }
  function setActing(seat) {
    document.querySelectorAll('.zm-seat.is-acting').forEach((b) => b.classList.remove('is-acting'));
    const b = seat >= 0 && game ? seatEl(seat) : null;
    if (b) { b.classList.add('is-acting'); fx.pop(b.querySelector('.zm-av'), { scale: 1.12, dur: 300 }); }
  }
  // 准星：套在被指的人头像上（代替原来那根长虚线箭头）；颜色按牌：蹭一张粉、推锅橙、偷 / 点名金
  function aim(seat, color) {
    const box = seatEl(seat), av = box && box.querySelector('.zm-av');
    if (!av) return null;
    const m = document.createElement('i');
    m.className = 'zm-aim';
    m.style.setProperty('--aim', color);
    m.innerHTML = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25"/><path d="M30 1v9M30 50v9M1 30h9M50 30h9"/></svg>';
    av.appendChild(m);
    box.classList.add('is-aimed');
    fx.pop(av, { scale: 1.14, dur: 320 });
    return { remove() { m.remove(); box.classList.remove('is-aimed'); } };
  }
  const stageCard = (id) => els.stage.querySelector('.zm-stage-cards [data-id="' + id + '"]');
  function stageCardsEl() { return els.stage.querySelector('.zm-stage-cards'); }
  function stageVerdict(count) {
    const inner = els.stage.querySelector('.zm-stage-inner');
    if (!inner) return;
    const old = inner.querySelector('.zm-stamp');
    if (old) { old.classList.add('is-leaving'); setTimeout(() => old.remove(), 240); }
    const cancelled = count % 2 === 1;
    els.stage.classList.toggle('is-cancelled', cancelled);
    const sp = document.createElement('span');
    sp.className = 'zm-stamp' + (cancelled ? '' : ' is-ok');
    sp.textContent = cancelled ? '作废' : '生效';
    inner.appendChild(sp);
    snd('stamp');
  }
  /* 导火索：绳子从右往左烧短，火星跟着走、一路冒小火花；最后一秒半变红、闪 */
  let fuseSparkTimer = null;
  function fuse(msLeft) {
    const f = els.stage.querySelector('.zm-fuse');
    if (fuseSparkTimer) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; }
    if (!f) return;
    const rope = f.querySelector('.rope'), spark = f.querySelector('.spark');
    rope.getAnimations().forEach((a) => a.cancel());
    spark.getAnimations().forEach((a) => a.cancel());
    f.classList.remove('is-urgent', 'is-lit');
    const ring = els.nopeBtn.querySelector('.zm-nope-ring');
    ring.getAnimations().forEach((a) => a.cancel());
    if (!(msLeft > 0) || !isFinite(msLeft)) { f.classList.toggle('is-idle', !isFinite(msLeft)); return; }
    f.classList.add('is-lit');
    rope.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: msLeft, easing: 'linear', fill: 'forwards' });
    spark.animate([{ left: '100%' }, { left: '0%' }], { duration: msLeft, easing: 'linear', fill: 'forwards' });
    ring.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: msLeft, easing: 'linear', fill: 'forwards' });
    const t0 = performance.now();
    fuseSparkTimer = setInterval(() => {
      if (!spark.isConnected) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; return; }
      const left = msLeft - (performance.now() - t0);
      if (left < 1500) f.classList.add('is-urgent');
      const r = spark.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 3, shapes: ['dot', 'star'], colors: left < 1500 ? ['#c8463a', '#e9d46a'] : GOLDS, radius: 16, size: [3, 7], life: 420, gravity: 10, pattern: 'fountain' });
    }, 140);
  }
  function stopFuse() { if (fuseSparkTimer) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; } const f = els.stage.querySelector('.zm-fuse'); if (f) f.classList.add('is-out'); }
  function clearStage() {
    stopFuse();
    if (game && game.arrow) { game.arrow.remove(); game.arrow = null; }
    setActing(-1);
    els.stage.innerHTML = '';
    els.stage.classList.remove('is-cancelled');
  }

  /* ───── 出牌限时（照拱猪）─────
   * 轮到谁，谁头像外一道红环顺时针收走；最后 5 秒头像跳、轮到我时每秒一声。我超时 = 自动摸一张（被蹭牌时 = 机器猫替我挑一张给）。
   * 弹窗 / 菜单开着时停表；教程不计时。设置里可改「不限时」 */
  const HURRY_MS = 5000;
  const clock = { seat: -1, left: 0, at: 0, onTimeout: null, paused: false, t1: 0, t2: 0, tk: 0 };
  const turnSec = () => (settings.turnSec | 0);
  function startClock(seat, onTimeout) {
    stopClock();
    if (!game || game.tutorial) return;
    const total = turnSec() * 1000, el = seatEl(seat);
    if (!(total > 0) || !el) return;
    Object.assign(clock, { seat, left: total, onTimeout, paused: false });
    el.style.setProperty('--turn-ms', total + 'ms');
    el.classList.remove('is-timed', 'is-hurry', 'is-paused');
    void el.offsetWidth;
    el.classList.add('is-timed');
    if (!els.mask.hidden || (menu && !menu.hidden)) pauseClock(); else runClock();
  }
  function runClock() {
    const my = token, seat = clock.seat;
    clock.at = performance.now();
    clock.t1 = setTimeout(() => {
      if (my !== token || clock.seat !== seat) return;
      const el = seatEl(seat);
      if (el) el.classList.add('is-hurry');
      if (seat === 0) { snd('tick'); clearInterval(clock.tk); clock.tk = setInterval(() => { if (my === token && clock.seat === 0 && !clock.paused) snd('tick'); }, 1000); }
    }, Math.max(0, clock.left - HURRY_MS));
    if (clock.onTimeout) clock.t2 = setTimeout(() => { if (my !== token || clock.seat !== seat) return; const f = clock.onTimeout; stopClock(); f(); }, clock.left);
  }
  function pauseClock() {
    if (clock.seat < 0 || clock.paused) return;
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    if (clock.at) clock.left = Math.max(0, clock.left - (performance.now() - clock.at));
    clock.at = 0;
    clock.paused = true;
    const el = seatEl(clock.seat);
    if (el) el.classList.add('is-paused');
  }
  function resumeClock() {
    if (clock.seat < 0 || !clock.paused || !els.mask.hidden) return;
    clock.paused = false;
    const el = seatEl(clock.seat);
    if (el) el.classList.remove('is-paused');
    runClock();
  }
  function stopClock() {
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    if (clock.seat >= 0 && game) { const el = seatEl(clock.seat); if (el) el.classList.remove('is-timed', 'is-hurry', 'is-paused'); }
    Object.assign(clock, { seat: -1, onTimeout: null, paused: false, at: 0 });
  }
  function onMyTimeout() {
    if (!game || busy) return;
    const s = game.state;
    if (mode === 'target') cancelTarget();
    selected = [];
    if (s.phase === 'act' && s.turn === 0) { renderHand(); apply(0, { type: 'draw' }); }
    else if (s.phase === 'give' && s.give.from === 0) { mode = null; renderHand(); apply(0, decideBot(0)); }
  }

  /* ───── 流程 ───── */
  const wait = (t) => new Promise((r) => setTimeout(r, fx.reduce() ? 1 : t));
  function schedule(t, fn) { const k = token; setTimeout(() => { if (k === token) fn(); }, t); }
  function renderAll() { renderSeats(); renderPiles(); renderHand(); renderBand(); refreshTools(); }

  function step() {
    if (!game) return;
    const s = game.state;
    save();
    clearReactTimer();
    reactOpen = false;
    release();
    renderAll();
    if (tut && !coachQueue) hint('');
    if (s.phase === 'over') { finish(); return; }
    if (s.phase === 'act') startClock(s.turn, s.turn === 0 ? onMyTimeout : null);
    else if (s.phase === 'give' && s.give.from === 0) startClock(0, onMyTimeout);
    else stopClock();
    switch (s.phase) {
      case 'act':
        if (s.turn === 0) { busy = false; mode = null; renderHand(); renderBand(); myTurnCue(); idle(); }
        else botAct(s.turn);
        break;
      case 'react': reactPhase(); break;
      case 'give':
        if (s.give.from === 0) { busy = false; mode = 'give'; selected = []; renderHand(); renderBand(); idle(); }
        else schedule(pace().bot, () => apply(s.give.from, decideBot(s.give.from)));
        break;
      case 'pick':
        if (s.pick.by === 0) { busy = false; pickDialog(); }
        else schedule(pace().bot, () => apply(s.pick.by, decideBot(s.pick.by)));
        break;
      case 'defuse':
        if (s.defuse.by === 0) {
          if (!s.deck.length && !(tut && tut.allow && !tut.allow({ type: 'insert', pos: 0 }))) { schedule(ms(260), () => apply(0, { type: 'insert', pos: 0 })); break; }
          busy = false; insertDialog();
        }
        else schedule(pace().bot, () => apply(s.defuse.by, decideBot(s.defuse.by)));
        break;
    }
  }
  function idle() { if (tut && tut.idle) tut.idle(game.state); }
  // 轮到我：手牌依次轻轻一跳，「摸牌」键亮起来
  let lastCue = '';
  function myTurnCue() {
    const s = game.state;
    const key = s.seq + ':' + s.turnsLeft;
    if (key === lastCue) return;
    lastCue = key;
    if (fx.reduce()) return;
    els.hand.querySelectorAll('.zm-card').forEach((c, i) => {
      c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.4 }, { transform: 'translateY(0)' }],
        { duration: 360, delay: i * 35, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' });
    });
  }

  function decideBot(seat) {
    const s = game.state;
    if (tut && tut.bot) { const d = tut.bot(s, seat); if (d) return d; }
    return AI.decide(s, seat, game.tiers[seat] || 'normal');
  }
  function botAct(seat) {
    busy = true;
    const b = bubble(seat, '', { think: true, ms: 60000 });
    schedule(pace().bot, () => { if (b) b.remove(); apply(seat, decideBot(seat)); });
  }

  /* 把一个决定落到引擎上，然后播动画、回到 step */
  async function apply(seat, d) {
    const s = game.state, t = token;
    busy = true;
    stopClock();
    const rects = captureSources(seat, d);
    snapshot();
    let ev;
    try {
      if (d.type === 'draw') ev = R.draw(s, seat);
      else if (d.type === 'play') ev = R.play(s, seat, d.cards, d);
      else if (d.type === 'give') ev = R.give(s, seat, d.card);
      else if (d.type === 'pick') ev = R.pickDiscard(s, seat, d.card);
      else if (d.type === 'insert') ev = R.insertKitten(s, seat, d.pos);
      else throw new Error('bad move');
    } catch (err) {
      console.error(err, d);
      release();
      if (seat !== 0) { try { snapshot(); ev = R.draw(s, seat); } catch (_) { release(); return; } } else { busy = false; step(); return; }
    }
    if (seat === 0) selected = [];
    mode = null;
    game.src = rects;
    renderBand();
    await playEvents(ev, t);
    if (t !== token) return;
    afterEvents(ev);
  }
  // 我出的牌要从手里原位置起飞：改状态（重画）之前先量好
  function captureSources(seat, d) {
    const m = {};
    if (seat !== 0) return m;
    const ids = d.type === 'play' ? d.cards : d.type === 'give' ? [d.card] : [];
    for (const id of ids) { const c = handCard(id); if (c) m[id] = c.getBoundingClientRect(); }
    return m;
  }
  function afterEvents(ev) {
    if (tut && tut.after) { const msgs = tut.after(ev, game.state); if (msgs && msgs.length) { showCoach(msgs, step); return; } }
    step();
  }

  async function playEvents(ev, t) {
    for (let i = 0; i < ev.length; i++) {
      if (t !== token) return;
      await anim(ev[i], t, ev[i + 1]);
    }
  }

  /* ───── 事件动画 ───── */
  async function anim(e, t, next) {
    switch (e.t) {
      case 'play': return animPlay(e, t);
      case 'nope': return animNope(e, t);
      case 'resolve': return animResolve(e, t);
      case 'turn': return animTurn(e, t);
      case 'shuffle': return animShuffle(e, t);
      case 'future': return animFuture(e, t);
      case 'askGive': return animAskGive(e, t);
      case 'give': return animTransfer(e, t, 'give');
      case 'steal': return animSteal(e, t);
      case 'take': return animTake(e, t);
      case 'miss': return animMiss(e, t);
      case 'askPick': return;
      case 'pick': return animPick(e, t);
      case 'draw': return animDraw(e, t);
      case 'boom': return animBoom(e, t, next);
      case 'defuse': return animDefuse(e, t);
      case 'insert': return animInsert(e, t);
      case 'out': return animOut(e, t);
      case 'win': return;
    }
  }

  /* 出牌：我出的从手里原位置起飞（手牌随即合拢），机器人出的从头像里背面朝上冒出来、半路翻成正面；
   * 沿弧线落到桌中舞台上，一张张排开，落桌一压；有指定对象就画一道会流动的虚线箭头 */
  async function animPlay(e, t) {
    const s = game.state;
    const p = s.pending || { by: e.seat, type: e.type, cards: e.cards, target: e.target, named: e.named, nopes: [] };
    const src = game.src || {};
    if (e.seat === 0) { dropFromHand(e.cards); renderHand(); } else { ov.counts[e.seat] -= e.cards.length; renderSeat(e.seat); }
    showStage(p, true);
    snd('whoosh');
    const su = SU(), start = avPoint(e.seat);
    const flights = e.cards.map((id, i) => {
      const target = stageCard(id);
      const to = target.getBoundingClientRect();
      const mine = e.seat === 0 && src[id];
      const rot = (i - (e.cards.length - 1) / 2) * 5;
      return fx.fly({
        html: cardHtml(id), back: backHtml(), flip: mine ? null : 'up', flipAt: 0.15,
        from: mine ? src[id] : start, to: { x: to.left + to.width / 2, y: to.top + to.height / 2 }, w: su,
        s0: mine ? src[id].width / su : 0.3, s1: 1, r0: mine ? 0 : -18, r1: rot, dur: ms(pace().fly + 80), delay: i * ms(80), lift: mine ? 90 : 50,
      }).then(() => {
        if (t !== token) return;
        target.classList.remove('is-incoming');
        snd('thud');
        if (!fx.reduce()) target.animate([{ transform: 'rotate(' + rot + 'deg) scale(1.05)' }, { transform: 'rotate(' + rot + 'deg) scale(1)' }], { duration: 180, easing: 'ease-out' });
      });
    });
    await Promise.all(flights);
    if (t !== token) return;
    const tg = targetOf(p);
    if (tg >= 0) game.arrow = aim(tg, p.type === R.FAVOR ? '#e0566e' : p.type === R.ATTACK ? '#c0742e' : '#c9a96e');
    const named = els.stage.querySelector('.zm-stage-named');
    if (named && !fx.reduce()) named.animate([{ transform: 'scale(.2) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }

  /* 不行：出牌人喊一嗓子；牌从高处拍下来压在原来那张上，舞台一震、紫色冲击波；
   * 立刻盖章当前结果（单数=作废、双数=生效），原牌跟着变灰 / 复原 */
  async function animNope(e, t) {
    setActing(e.seat);
    snd('nope');
    bubble(e.seat, '喵？不行！', { loud: true, ms: 1500 });
    fx.shake(avEl(e.seat), { amp: 4, dur: 300 });
    const src = e.seat === 0 ? handCard(e.card) : null;
    const from = src ? src.getBoundingClientRect() : avPoint(e.seat);
    if (e.seat === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.seat] -= 1; renderSeat(e.seat); }
    const cards = stageCardsEl();
    const box = cards ? cards.getBoundingClientRect() : els.center.getBoundingClientRect();
    const c = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const rot = e.count % 2 ? -11 : 9;
    const u = U();
    // 先飞到上方举高、放大，再狠狠拍下去
    const node = await fx.fly({
      html: cardHtml(e.card), back: backHtml(), flip: src ? null : 'up', flipAt: 0.1,
      from, to: { x: c.x, y: c.y - u * 0.5 }, w: u, s0: src ? 1 : 0.35, s1: 1.45, r0: 0, r1: rot * 2, dur: ms(380), lift: 70, land: false, keep: true,
    });
    if (t !== token) { if (node) node.remove(); return; }
    if (node) {
      const w = u, h = w * 1.4;
      await fx.animate(node, [
        { transform: fx.T(c.x - w / 2, c.y - u * 0.5 - h / 2, 1.45, rot * 2) },
        { transform: fx.T(c.x - w / 2, c.y - h / 2, 0.92, rot), offset: 0.55, easing: 'cubic-bezier(.2,.8,.4,1)' },
        { transform: fx.T(c.x - w / 2, c.y - h / 2, 1, rot) },
      ], { duration: ms(240) }, 'cubic-bezier(.6,0,.9,.5)').finished.catch(() => {});
      node.remove();
    }
    if (t !== token) return;
    // 拍下去
    snd('slam');
    fx.shake(stageCardsEl(), { amp: 7, dur: 320 });
    fx.ring(c.x, c.y, { color: '#7a5a96', size: u * 3.2, width: 5, dur: 520 });
    fx.burst(c.x, c.y, { n: 12, shapes: ['star', 'dot'], colors: PURPLES, radius: u * 1.3, size: [5, 16], life: 760, pattern: 'ring' });
    stageNope(e.card, e.count, rot);
    stageVerdict(e.count);
    await wait(ms(260));
  }
  function stageNope(id, count, rot) {
    const box = els.stage.querySelector('.zm-stage-nopes');
    if (!box) return;
    box.insertAdjacentHTML('beforeend', cardHtml(id, '', 'transform:translate(-50%,-50%) rotate(' + rot + 'deg)'));
  }

  /* 结算：被作废——灰掉的牌连同「不行」一起扫进弃牌堆；生效——牌金光一闪，再扫进弃牌堆，接着放效果 */
  async function animResolve(e, t) {
    stopFuse();
    if (game.arrow && (e.cancelled || (e.type !== R.FAVOR))) { game.arrow.remove(); game.arrow = null; }
    const inner = els.stage.querySelector('.zm-stage-inner');
    const lab = inner && inner.querySelector('.zm-stage-label');
    if (lab && game.lastNopes) lab.textContent = e.cancelled ? '作废了' : '照样生效';
    if (e.cancelled) {
      snd('cancel');
      await wait(ms(560));
    } else {
      if (inner) {
        inner.classList.add('is-go');
        const cs = stageCardsEl();
        if (cs) { const r = cs.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, shapes: ['star'], colors: GOLDS, radius: U() * 1.1, size: [6, 16], life: 700 }); }
        snd('activate');
      }
      await wait(ms(game.lastNopes ? 480 : 140));
    }
    if (t !== token) return;
    await sweepStage(t);
    if (t !== token) return;
    if (!e.cancelled && e.type === R.SKIP) await fxSleep(e.seat, t);
  }
  // 舞台上所有牌（连同「不行」）沿弧线扫进弃牌堆，摆成那堆里各自的角度，一张张落下
  async function sweepStage(t) {
    const cs = Array.from(els.stage.querySelectorAll('.zm-stage-inner .zm-card[data-id]'));
    const inner = els.stage.querySelector('.zm-stage-inner');
    const to = discardRect();
    const pu = PU();
    const items = cs.map((c) => ({ id: +c.dataset.id, r: c.getBoundingClientRect(), gray: els.stage.classList.contains('is-cancelled') }));
    if (inner && !fx.reduce()) inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    cs.forEach((c) => { c.style.visibility = 'hidden'; });
    setTimeout(() => { if (t === token) clearStage(); }, 170);
    snd('sweep');
    await Promise.all(items.map((it, i) => fx.fly({
      html: cardHtml(it.id), from: it.r, to, w: pu, s0: it.r.width / pu, s1: 1, r0: 0, r1: pileRot(it.id),
      dur: ms(220), delay: i * ms(40), lift: 6, cls: it.gray ? 'is-gray' : '',
    }).then(() => {
      if (t !== token || !ov) return;
      ov.discard.push(it.id);
      renderPiles();
    })));
  }

  /* 装睡：头像歪头打盹，三个 Z 一个比一个大地往右上飘，一弯小月亮 */
  async function fxSleep(seat, t) {
    snd('snore');
    const a = avPoint(seat), av = avEl(seat);
    if (av && !fx.reduce()) {
      av.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg) translateY(3px)', offset: 0.3 }, { transform: 'rotate(-10deg) translateY(2px)', offset: 0.75 }, { transform: 'rotate(0)' }],
        { duration: ms(1300), easing: 'ease-in-out', composite: 'add' });
    }
    [16, 22, 30].forEach((sz, i) => fx.float(a.x + 18, a.y - 14, 'z', { dx: 34 + i * 12, dy: -46 - i * 14, size: sz, delay: ms(i * 260), dur: ms(1100), rot: 12, color: '#2f4a6d' }));
    await wait(ms(900));
    void t;
  }

  /* 换人：头像外圈红环亮起、往外荡一圈；被推锅时一口黑锅从上家飞过去砸在头像上，「×2」弹出来 */
  async function animTurn(e, t) {
    const prevTurn = ov ? ov.turn : -1;
    if (e.attacked) {
      await fxPot(prevTurn >= 0 ? prevTurn : R.nextAlive(game.state, e.seat), e.seat, t);
      if (t !== token) return;
    }
    if (ov) { ov.turn = e.seat; ov.turnsLeft = e.turnsLeft; }
    renderSeats();
    const a = avPoint(e.seat);
    fx.ring(a.x, a.y, { color: '#b4392c', size: 110, width: 3, dur: 520 });
    fx.pop(avEl(e.seat), { scale: 1.1, dur: 320 });
    if (e.seat === 0 && game.state.alive[0]) snd('turn');
    await wait(ms(e.attacked ? 260 : 140));
  }
  async function fxPot(from, to, t) {
    snd('whoosh');
    const a = avPoint(from), b = avPoint(to);
    const S = 64;
    const pot = document.createElement('div');
    pot.className = 'zm-prop';
    pot.innerHTML = ART.PROPS.pot;
    pot.style.width = pot.style.height = S + 'px';
    els.fly.appendChild(pot);
    const N = 12, frames = [];
    const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 90;
    for (let k = 0; k <= N; k++) {
      const tt = k / N, u = 1 - tt;
      const x = u * u * a.x + 2 * u * tt * cx + tt * tt * b.x, y = u * u * a.y + 2 * u * tt * cy + tt * tt * b.y;
      frames.push({ transform: fx.T(x - S / 2, y - S / 2, 0.5 + 0.7 * Math.sin(Math.PI * tt * 0.9), -30 + 400 * tt), offset: 0.8 * tt, easing: 'linear' });
      if (k > 0 && k < N && k % 3 === 0) setTimeout(() => { if (t === token) fx.smoke(x, y, { n: 2, spread: 6, size: [18, 30], rise: 20 }); }, ms(700) * 0.8 * tt);
    }
    frames.push({ transform: fx.T(b.x - S / 2, b.y - S / 2 - 50, 0.9, 400), offset: 0.9, easing: 'ease-out' });
    frames.push({ transform: fx.T(b.x - S / 2 + 30, b.y - S / 2 - 30, 0.6, 470), opacity: 0 });
    const anim = pot.animate(frames, { duration: ms(900), fill: 'both' });
    await wait(ms(900) * 0.8);
    if (t !== token) { pot.remove(); return; }
    // 砸中：头像一压一弹、晃，金星四溅
    snd('clang');
    const av = avEl(to);
    if (av && !fx.reduce()) av.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.18,.78)', offset: 0.25 }, { transform: 'scale(.92,1.1)', offset: 0.55 }, { transform: 'scale(1,1)' }], { duration: 420, easing: 'ease-out', composite: 'add' });
    fx.burst(b.x, b.y - 10, { n: 10, shapes: ['star'], colors: GOLDS.concat(['#c0742e']), radius: 60, size: [8, 20], life: 760 });
    fx.shake(seatEl(to), { amp: 5, dur: 360 });
    await anim.finished.catch(() => {});
    pot.remove();
  }

  /* 打翻纸箱：牌堆里飞出一圈牌背，绕着牌堆转一圈再收回去，扬起一点灰 */
  async function animShuffle(e, t) {
    snd('shuffle');
    bubble(e.seat, '哗啦——', { ms: 1200 });
    const r = els.deck.getBoundingClientRect(), c = fx.center(r);
    const pu = PU(), n = 9, R0 = pu * 1.25;
    els.deck.classList.add('is-shuffling');
    fx.smoke(c.x, c.y + pu * 0.4, { n: 5, spread: pu * 0.6, size: [30, 60], rise: 26 });
    const all = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'zm-flyer';
      el.style.width = pu + 'px'; el.style.height = pu * 1.4 + 'px';
      el.innerHTML = backHtml();
      els.fly.appendChild(el);
      const th0 = (i / n) * Math.PI * 2, frames = [];
      const K = 16;
      for (let k = 0; k <= K; k++) {
        const tt = k / K;
        const rr = R0 * Math.sin(Math.PI * tt) * (0.8 + 0.2 * Math.sin(i * 1.7));
        const th = th0 + tt * Math.PI * 2 * (i % 2 ? 1 : -1);
        const x = c.x + Math.cos(th) * rr, y = c.y + Math.sin(th) * rr * 0.6;
        frames.push({ transform: fx.T(x - pu / 2, y - pu * 0.7, 0.9 + 0.15 * Math.sin(Math.PI * tt), (th * 180 / Math.PI) * 0.25 * (1 - tt) + (i - 4) * 2 * Math.sin(Math.PI * tt)), offset: tt });
      }
      all.push(el.animate(frames, { duration: ms(1050), delay: i * 22, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'both' }).finished.then(() => el.remove(), () => el.remove()));
    }
    await Promise.all(all);
    els.deck.classList.remove('is-shuffling');
    if (t !== token) return;
    snd('thud');
    fx.pop(els.deck, { scale: 1.06 });
    renderPiles();
  }

  /* 猫眼偷看：我——顶上三张升起、飞到桌中一张张翻开，下面写着第几张；点「知道了」再翻回去、落回牌堆。
   * 别人——三张牌背朝他那边扇形抬起，上面一只大猫眼眨一眨，再放回去 */
  async function animFuture(e, t) {
    snd('peek');
    const r = deckTopRect(), pu = PU();
    if (e.cards && e.seat === 0) {
      const u = U() * 1.3;
      const box = els.center.getBoundingClientRect(), c = fx.center(box);
      const gap = u * 1.12;
      const spots = e.cards.map((_, i) => ({ x: c.x + (i - (e.cards.length - 1) / 2) * gap, y: c.y - u * 0.1 }));
      const nodes = await Promise.all(e.cards.map((id, i) => fx.fly({
        html: cardHtml(id), back: backHtml(), flip: 'up', flipAt: 0.45, from: r, to: spots[i], w: u, s0: pu / u, s1: 1,
        r0: 0, r1: 0, dur: ms(620), delay: i * ms(170), lift: 70, keep: true,
      }).then((n) => { if (n && R.KIND_OF[id] === R.BOOM && t === token) { snd('gasp'); n.classList.add('zm-angry'); fx.burst(spots[i].x, spots[i].y, { n: 12, shapes: ['fur'], colors: FUR, radius: u * 0.9, size: [8, 18], alignOut: true, life: 700, pattern: 'ring' }); } return n; })));
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
      // 标签 + 「知道了」
      const labels = ['最上面', '第 2 张', '第 3 张'];
      const lay = document.createElement('div');
      lay.className = 'zm-peek';
      lay.innerHTML = spots.map((p, i) => '<span class="zm-peek-lab" style="left:' + p.x + 'px;top:' + (p.y + u * 0.78) + 'px">' + labels[i] + '</span>').join('') +
        '<button type="button" class="zm-btn zm-btn-primary zm-peek-ok" style="left:' + c.x + 'px;top:' + (c.y + u * 1.12) + 'px">知道了</button>';
      els.fly.appendChild(lay);
      els.fly.classList.add('is-interactive');
      await new Promise((res) => {
        const ok = lay.querySelector('.zm-peek-ok');
        ok.focus({ preventScroll: true });
        ok.addEventListener('click', res, { once: true });
        game.peekDone = res;
      });
      game.peekDone = null;
      els.fly.classList.remove('is-interactive');
      lay.remove();
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
      // 翻回去、倒着落回牌堆
      await Promise.all(nodes.map((n, i) => {
        if (!n) return null;
        n.remove();
        const id = e.cards[i];
        return fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'down', flipAt: 0.05, from: spots[i], to: deckTopRect(), w: u, s0: 1, s1: pu / u, dur: ms(480), delay: (e.cards.length - 1 - i) * ms(110), lift: 40 });
      }));
      snd('thud');
      renderPiles();
      return;
    }
    // 别人在偷看
    const a = avPoint(e.seat), dc = fx.center(r);
    const dir = { x: a.x - dc.x, y: a.y - dc.y }, len = Math.hypot(dir.x, dir.y) || 1;
    const k = e.count || 3;
    const out = [];
    for (let i = 0; i < k; i++) {
      const fan = (i - (k - 1) / 2);
      const to = { x: dc.x + dir.x / len * pu * 0.9 + fan * pu * 0.42, y: dc.y + dir.y / len * pu * 0.9 - Math.abs(fan) * 4 };
      out.push(fx.fly({ html: backHtml(), from: r, to, w: pu, s0: 1, s1: 0.86, r0: 0, r1: fan * 14, dur: ms(380), delay: i * 60, lift: 20, keep: true, land: false }));
    }
    const nodes = await Promise.all(out);
    if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    const eye = document.createElement('div');
    eye.className = 'zm-prop zm-eye';
    eye.innerHTML = ART.PROPS.eye;
    const S = pu * 1.1;
    eye.style.width = eye.style.height = S + 'px';
    const ep = { x: dc.x + dir.x / len * pu * 0.9, y: dc.y + dir.y / len * pu * 0.9 - pu * 1.05 };
    els.fly.appendChild(eye);
    await fx.animate(eye, [
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 0.2, 0), opacity: 0 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1.1, 0), opacity: 1, offset: 0.18 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.3 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1, 0) + ' scaleY(.08)', opacity: 1, offset: 0.42 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.5 },
      { transform: fx.T(ep.x - S / 2 + 6, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.68 },
      { transform: fx.T(ep.x - S / 2 - 6, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.84 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 0.6, 0), opacity: 0 },
    ], { duration: ms(1250) }).finished.catch(() => {});
    eye.remove();
    await Promise.all(nodes.map((n, i) => {
      if (!n) return null;
      const rr = n.getBoundingClientRect();
      n.remove();
      return fx.fly({ html: backHtml(), from: rr, to: deckTopRect(), w: pu, s0: 0.86, s1: 1, r0: (i - (k - 1) / 2) * 14, r1: 0, dur: ms(320), delay: i * 50, lift: 10 });
    }));
    renderPiles();
  }

  /* 被蹭：粉色箭头还在，他头顶冒「…」在挑 */
  async function animAskGive(e, t) {
    if (game.arrow) game.arrow.remove();
    game.arrow = aim(e.from, '#e0566e');
    if (e.from !== 0) bubble(e.from, '', { think: true, ms: 60000 });
    await wait(ms(260));
    void t;
  }

  /* 给 / 偷来的牌在两人之间飞：我参与的那一方看得到正面（从我手里出去的从原位起飞，进我手里的半路翻开）；
   * 「蹭一张」一路冒小心心 */
  async function animTransfer(e, t, kind) {
    seatEl(e.from).querySelectorAll('.zm-bubble').forEach((b) => b.remove());
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    const mine = e.card != null && (e.from === 0 || e.to === 0);
    const src = e.from === 0 ? (game.src && game.src[e.card]) || handRectOf(e.card) : avPoint(e.from);
    if (e.from === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.from] -= 1; renderSeat(e.from); }
    const u = U();
    let to = avPoint(e.to);
    if (e.to === 0) to = reserveHandSlot(e.card);
    snd(kind === 'give' ? 'give' : 'steal');
    if (kind === 'give' && !fx.reduce()) {
      const a = e.from === 0 ? fx.center(src) : src, b = e.to === 0 ? fx.center(to) : to;
      for (let i = 1; i <= 4; i++) {
        const tt = i / 5;
        setTimeout(() => { if (t === token) fx.float(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt - Math.sin(Math.PI * tt) * 60, 'heart', { dy: -30, size: 14 + i * 2, color: PINKS[i % 3], dur: 800 }); }, ms(520) * tt);
      }
    }
    await fx.fly({
      html: mine ? cardHtml(e.card) : backHtml(), back: backHtml(),
      flip: mine ? (e.from === 0 ? (e.to === 0 ? null : 'down') : 'up') : null, flipAt: e.from === 0 ? 0.5 : 0.2,
      from: src, to, w: u, s0: e.from === 0 ? 1 : 0.4, s1: e.to === 0 ? 1 : 0.4, fadeOut: e.to !== 0,
      dur: ms(600), lift: 80, r0: -8, r1: 0,
    });
    if (t !== token) return;
    if (e.to === 0) revealHandCard(e.card); else { ov.counts[e.to] += 1; renderSeat(e.to); fx.pop(avEl(e.to), { scale: 1.15 }); }
    if (e.to === 0 && e.card != null) bubble(0, '拿到「' + R.NAMES[R.KIND_OF[e.card]] + '」', { ms: 1500 });
    await wait(ms(220));
  }

  /* 两张一样偷一张：一只大猫爪从他头像上扑过去、扒拉一下，抓着一张牌拖回来 */
  async function animSteal(e, t) {
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    const a = avPoint(e.to), b = avPoint(e.from);
    const S = 58;
    const paw = document.createElement('div');
    paw.className = 'zm-prop zm-paw';
    paw.innerHTML = window.ZhamaoFx.SHAPES.paw;
    paw.style.width = paw.style.height = S + 'px';
    els.fly.appendChild(paw);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
    snd('swipe');
    await fx.animate(paw, [
      { transform: fx.T(a.x - S / 2, a.y - S / 2, 0.3, ang), opacity: 0 },
      { transform: fx.T(a.x - S / 2, a.y - S / 2, 1, ang), opacity: 1, offset: 0.15 },
      { transform: fx.T(b.x - S / 2, b.y - S / 2 - 14, 1.15, ang - 20), opacity: 1, offset: 0.6, easing: 'cubic-bezier(.5,0,.8,.4)' },
      { transform: fx.T(b.x - S / 2 + 6, b.y - S / 2, 1, ang + 25), opacity: 1, offset: 0.8 },
      { transform: fx.T(b.x - S / 2, b.y - S / 2, 1, ang), opacity: 1 },
    ], { duration: ms(520) }).finished.catch(() => {});
    if (t !== token) { paw.remove(); return; }
    fx.shake(seatEl(e.from), { amp: 6, dur: 320 });
    fx.burst(b.x, b.y, { n: 8, shapes: ['fur'], colors: ['#b39c7e', '#eea25a', '#8f8a99'], radius: 40, size: [6, 14], life: 600 });
    // 爪子拖着牌回去
    paw.animate([
      { transform: fx.T(b.x - S / 2, b.y - S / 2, 1, ang) },
      { transform: fx.T(a.x - S / 2, a.y - S / 2, 0.6, ang), opacity: 0 },
    ], { duration: ms(600), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }).finished.then(() => paw.remove(), () => paw.remove());
    await animTransfer(e, t, 'steal');
    if (e.from === 0 && e.card != null) bubble(0, '被偷走「' + R.NAMES[R.KIND_OF[e.card]] + '」', { ms: 1600 });
  }

  /* 三张点名：点中——那张牌亮着金光从他手里跳出来，正面朝上飞过去；落空——点名的牌晃晃脑袋、打个红叉、冒烟 */
  async function animTake(e, t) {
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    const b = avPoint(e.from);
    snd('ding');
    fx.burst(b.x, b.y, { n: 14, shapes: ['star'], colors: GOLDS, radius: 60, size: [6, 18], life: 800 });
    const src = e.from === 0 ? handRectOf(e.card) : b;
    if (e.from === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.from] -= 1; renderSeat(e.from); }
    const u = U();
    const to = e.to === 0 ? reserveHandSlot(e.card) : avPoint(e.to);
    await fx.fly({ html: cardHtml(e.card), from: src, to, w: u, s0: e.from === 0 ? 1 : 0.5, s1: e.to === 0 ? 1 : 0.5, fadeOut: e.to !== 0, dur: ms(680), lift: 110, r0: -14, r1: 0, swell: 0.5 });
    if (t !== token) return;
    if (e.to === 0) revealHandCard(e.card); else { ov.counts[e.to] += 1; renderSeat(e.to); fx.pop(avEl(e.to), { scale: 1.15 }); }
    bubble(e.to, '要到了「' + R.NAMES[e.named] + '」', { ms: 1500 });
    await wait(ms(260));
  }
  async function animMiss(e, t) {
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    const b = avPoint(e.from), u = U() * 0.8;
    const el = document.createElement('div');
    el.className = 'zm-flyer';
    el.style.width = u + 'px'; el.style.height = u * 1.4 + 'px';
    el.innerHTML = cardHtml(e.named) + '<div class="zm-cross">' + ART.PROPS.cross + '</div>';
    els.fly.appendChild(el);
    const x = b.x - u / 2, y = b.y - u * 1.6;
    bubble(e.from, '没有' + R.NAMES[e.named], { ms: 1600 });
    await fx.animate(el, [
      { transform: fx.T(x, y + 20, 0.3, 0), opacity: 0 },
      { transform: fx.T(x, y, 1.05, 0), opacity: 1, offset: 0.16 },
      { transform: fx.T(x, y, 1, -12), opacity: 1, offset: 0.28 },
      { transform: fx.T(x, y, 1, 12), opacity: 1, offset: 0.4 },
      { transform: fx.T(x, y, 1, -8), opacity: 1, offset: 0.5 },
      { transform: fx.T(x, y, 1, 0), opacity: 1, offset: 0.6 },
      { transform: fx.T(x, y, 1, 0), opacity: 1, offset: 0.82 },
      { transform: fx.T(x, y - 20, 0.8, 0), opacity: 0 },
    ], { duration: ms(1300) }).finished.catch(() => {});
    el.remove();
    void t;
  }

  /* 五张不同：弃牌堆一下子摊开成扇面，挑中的那张升起、闪金光，飞进他手里 */
  async function animPick(e, t) {
    const r = discardRect(), c = fx.center(r), pu = PU();
    const fan = ov.discard.slice(-6).filter((id) => id !== e.card).slice(-4);
    snd('fan');
    const outs = fan.map((id, i) => fx.fly({ html: cardHtml(id), from: r, to: { x: c.x + (i - (fan.length - 1) / 2) * pu * 0.45, y: c.y - pu * 0.25 }, w: pu, s0: 1, s1: 0.9, r0: pileRot(id), r1: (i - (fan.length - 1) / 2) * 12, dur: ms(300), delay: i * 40, lift: 10, keep: true, land: false }));
    ov.discard = ov.discard.filter((x) => x !== e.card);
    renderPiles();
    const nodes = await Promise.all(outs);
    if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    fx.burst(c.x, c.y - pu * 0.5, { n: 12, shapes: ['star'], colors: GOLDS, radius: pu, size: [6, 16], life: 800 });
    snd('ding');
    const to = e.seat === 0 ? reserveHandSlot(e.card) : avPoint(e.seat);
    const u = U();
    const flight = fx.fly({ html: cardHtml(e.card), from: { x: c.x, y: c.y - pu * 0.6 }, to, w: u, s0: pu / u * 1.2, s1: e.seat === 0 ? 1 : 0.45, fadeOut: e.seat !== 0, dur: ms(620), lift: 90, swell: 0.3 });
    nodes.forEach((n, i) => {
      if (!n) return;
      const rr = n.getBoundingClientRect();
      n.remove();
      fx.fly({ html: cardHtml(fan[i]), from: rr, to: r, w: pu, s0: 0.9, s1: 1, r0: (i - (fan.length - 1) / 2) * 12, r1: pileRot(fan[i]), dur: ms(260), delay: i * 30, lift: 6 });
    });
    await flight;
    if (t !== token) return;
    if (e.seat === 0) revealHandCard(e.card); else { ov.counts[e.seat] += 1; renderSeat(e.seat); fx.pop(avEl(e.seat), { scale: 1.15 }); }
    bubble(e.seat, '捡回「' + R.NAMES[R.KIND_OF[e.card]] + '」', { ms: 1500 });
    await wait(ms(200));
  }

  /* 摸牌：牌堆顶那张先被捏起来、悬一下（危险时多悬一会儿、心跳），再飞走。
   * 摸到安全牌：给我的半路翻成正面、滑进手里预留的空位；给别人的缩进头像，头像「咽」一下 */
  function danger() {
    const d = D();
    return d.deckSize ? d.kittens / d.deckSize : 0;
  }
  async function peel(t) {
    const r = deckTopRect(), pu = PU();
    const node = document.createElement('div');
    node.className = 'zm-flyer';
    node.style.width = pu + 'px'; node.style.height = pu * 1.4 + 'px';
    node.innerHTML = backHtml();
    els.fly.appendChild(node);
    ov.deckSize -= 1;
    renderPiles();
    const tense = danger() >= 0.2;
    snd('peel');
    if (tense) snd('heartbeat', 80);
    const hold = ms(tense ? 640 : 300);
    const x = r.left, y = r.top, dx = pu * 0.16;
    // 先用拇指把顶上那张往外推出一截（下面那张露出来），再捏起来悬一下
    await fx.animate(node, [
      { transform: fx.T(x, y, 1, 0), boxShadow: '0 0 0 rgba(29,27,24,0)', easing: 'cubic-bezier(.3,.6,.4,1)' },
      { transform: fx.T(x + dx, y - 1, 1, 1.5), boxShadow: '0 2px 3px rgba(29,27,24,.2)', offset: 0.3, easing: 'cubic-bezier(.3,.7,.3,1)' },
      { transform: fx.T(x + dx * 1.1, y - 14, 1.05, -4), boxShadow: '0 12px 20px rgba(29,27,24,.26)', offset: 0.55 },
      ...(tense ? [{ transform: fx.T(x + dx * 1.1 + 1.5, y - 15, 1.05, -2), offset: 0.7 }, { transform: fx.T(x + dx * 1.1 - 1.5, y - 14, 1.05, -5), offset: 0.85 }] : []),
      { transform: fx.T(x + dx * 1.1, y - 14, 1.05, -4), boxShadow: '0 12px 20px rgba(29,27,24,.26)' },
    ], { duration: hold }).finished.catch(() => {});
    if (t !== token) { node.remove(); return null; }
    const rr = node.getBoundingClientRect();
    node.remove();
    return rr;
  }
  async function animDraw(e, t) {
    const from = await peel(t);
    if (!from) return;
    const u = U(), pu = PU();
    if (e.seat === 0 && e.card != null) {
      const to = reserveHandSlot(e.card);
      await fx.fly({ html: cardHtml(e.card), back: backHtml(), flip: 'up', flipAt: 0.3, from, to, w: u, s0: pu * 1.04 / u, s1: 1, r0: -5, r1: 0, dur: ms(560), lift: 70, swell: 0.18 });
      if (t !== token) return;
      snd('flip');
      revealHandCard(e.card);
      if (R.KIND_OF[e.card] === R.DEFUSE) { const r = handRectOf(e.card); fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, shapes: ['star'], colors: ['#4f8a5f', '#9bc8a2', '#c9a96e'], radius: u * 0.8, size: [6, 14], life: 700 }); }
    } else {
      const a = avPoint(e.seat);
      await fx.fly({ html: backHtml(), from, to: a, w: pu, s0: 1.04, s1: 0.32, r0: -5, r1: 10, dur: ms(480), lift: 50, fadeOut: true, land: false });
      if (t !== token) return;
      ov.counts[e.seat] += 1;
      renderSeat(e.seat);
      gulp(e.seat);
    }
  }
  function gulp(seat) {
    const av = avEl(seat);
    if (av && !fx.reduce()) av.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.3,.8,.4,1.2)', composite: 'add' });
  }

  /* 炸毛猫！牌捏起来、悬着，然后不往手里飞，直冲桌子正中、越变越大，半路翻开——
   * 桌子一震、红光一闪、一圈黑毛炸开、金色火星、烟，炸毛猫在桌中央气得发抖，摸到它的人吓得一哆嗦 */
  async function animBoom(e, t, next) {
    const from = await peel(t);
    if (!from) return;
    ov.kittens = Math.max(0, ov.kittens - 1);
    renderPiles();
    const u = U();
    const box = els.center.getBoundingClientRect(), c = fx.center(box);
    const W = u * 1.55;
    // 先往上一窜（越窜越大）、半路翻开，再重重落到桌子正中
    const node = await fx.fly({ html: cardHtml(e.card), back: backHtml(), flip: 'up', flipAt: 0.3, from, to: c, w: W, s0: PU() / W, s1: 1, r0: -5, r1: -4, dur: ms(620), lift: u * 1.7, swell: 0.25, keep: true, land: false });
    if (t !== token) { if (node) node.remove(); return; }
    game.boomNode = node;
    // 炸！
    snd('boom');
    fx.shake(els.table, { amp: 11, dur: 520, rot: 0.6 });
    fx.flash('rgba(200,70,58,.42)', 0, 900);
    fx.ring(c.x, c.y, { color: '#c8463a', size: W * 3.4, width: 8, dur: 640, behind: true });
    fx.burst(c.x, c.y, { n: 30, shapes: ['fur', 'fur', 'spike'], colors: FUR, radius: W * 1.5, size: [10, 30], alignOut: true, spin: true, life: 1000, gravity: 30, pattern: 'ring', behind: true });
    fx.burst(c.x, c.y - W * 0.3, { n: 16, shapes: ['star', 'dot'], colors: GOLDS.concat(['#c8463a']), radius: W * 1.2, size: [6, 18], life: 1100, delay: 80 });
    // 烟从牌的四周往外冒（垫在牌后面），不挡住刚翻开的炸毛猫
    fx.smoke(c.x, c.y + W * 0.2, { n: 8, spread: W * 0.9, size: [W * 0.5, W * 0.9], rise: 40, delay: 60, behind: true, alpha: 0.75 });
    if (node && !fx.reduce()) {
      const base = getComputedStyle(node).transform;
      node.animate([
        { transform: base + ' scale(.7) rotate(-14deg)' }, { transform: base + ' scale(1.18) rotate(8deg)', offset: 0.35 },
        { transform: base + ' scale(.96) rotate(-4deg)', offset: 0.65 }, { transform: base },
      ], { duration: 520, easing: 'ease-out' }).finished.then(() => { if (node.isConnected) node.classList.add('zm-angry'); }, () => {});
    }
    // 摸到的人吓一跳
    const av = avEl(e.seat);
    if (av && !fx.reduce()) av.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12px) scale(1.12)', offset: 0.25 }, { transform: 'translateY(0) scale(1)' }], { duration: 460, easing: 'ease-out', composite: 'add' });
    fx.shake(seatEl(e.seat), { amp: 6, dur: 520, delay: 120 });
    bubble(e.seat, e.seat === 0 ? '啊啊啊！' : '炸毛了！', { loud: true, alarm: true, ms: 1500 });
    await wait(ms(next && next.t === 'defuse' ? 900 : 1100));
  }

  /* 逗猫棒：从摸到的人那儿飞到炸毛猫头顶，左右来回逗；炸毛猫慢慢消气、缩小，冒小心心和音符，
   * 绿光一圈；然后逗猫棒落进弃牌堆，炸毛猫翻成背面等着被塞回去 */
  async function animDefuse(e, t) {
    const node = game.boomNode;
    const u = U();
    const box = els.center.getBoundingClientRect(), c = fx.center(box);
    const src = e.seat === 0 ? handRectOf(e.card) : avPoint(e.seat);
    if (e.seat === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.seat] -= 1; renderSeat(e.seat); }
    const W = u * 1.2, top = { x: c.x + u * 0.4, y: c.y - u * 1.05 };
    const wand = await fx.fly({ html: cardHtml(e.card), back: backHtml(), flip: e.seat === 0 ? null : 'up', flipAt: 0.15, from: src, to: top, w: W, s0: e.seat === 0 ? u / W : 0.35, s1: 1, r0: 0, r1: 18, dur: ms(520), lift: 60, keep: true, land: false });
    if (t !== token) { if (wand) wand.remove(); return; }
    snd('defuse');
    const x = top.x - W / 2, y = top.y - W * 0.7;
    if (wand) {
      fx.animate(wand, [
        { transform: fx.T(x, y, 1, 18) }, { transform: fx.T(x - 14, y + 4, 1, -22), offset: 0.2 }, { transform: fx.T(x + 10, y, 1, 20), offset: 0.4 },
        { transform: fx.T(x - 10, y + 4, 1, -18), offset: 0.6 }, { transform: fx.T(x + 6, y, 1, 12), offset: 0.8 }, { transform: fx.T(x, y, 1, 0) },
      ], { duration: ms(1100) }, 'ease-in-out');
    }
    if (node) {
      node.classList.remove('zm-angry');
      const base = getComputedStyle(node).transform;
      node.animate([{ transform: base }, { transform: base + ' scale(.8) rotate(4deg)' }], { duration: ms(1000), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    }
    fx.ring(c.x, c.y, { color: '#4f8a5f', size: u * 3, width: 5, dur: 800, delay: 200 });
    ['heart', 'note', 'heart', 'note', 'heart'].forEach((sh, i) => fx.float(c.x + (i - 2) * u * 0.35, c.y - u * 0.2, sh, { dy: -u * 1.1, dx: (i - 2) * 8, size: 16 + (i % 2) * 6, color: sh === 'heart' ? PINKS[i % 3] : '#4f8a5f', delay: ms(200 + i * 140), dur: ms(1100) }));
    bubble(e.seat, '哄好了～', { ms: 1500 });
    await wait(ms(1100));
    if (t !== token) { if (wand) wand.remove(); return; }
    // 逗猫棒落进弃牌堆
    if (wand) {
      const rr = wand.getBoundingClientRect();
      wand.remove();
      fx.fly({ html: cardHtml(e.card), from: rr, to: discardRect(), w: PU(), s0: rr.width / PU() * 0.75, s1: 1, r0: 0, r1: pileRot(e.card), dur: ms(380), lift: 40 }).then(() => {
        if (t !== token || !ov) return;
        ov.discard.push(e.card);
        renderPiles();
      });
    }
    // 炸毛猫翻成背面
    if (node) {
      const inner = node.querySelector('.zm-flip');
      if (inner) await inner.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], { duration: ms(360), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    }
    snd('flip');
    // 翻好之后挪到牌堆左边、缩成牌堆大小、歪一点等着被塞回去（不再盖在桌子正中）
    if (node && t === token) {
      const dr = els.deck.getBoundingClientRect(), pu = PU();
      const w = node.offsetWidth || pu, h = node.offsetHeight || pu * 1.4;
      const tx = dr.left - pu * 0.8, ty = dr.top + dr.height / 2;
      const from = getComputedStyle(node).transform;
      const to = fx.T(tx - w / 2, ty - h / 2, pu / w, -10);
      node.animate([{ transform: from }, { transform: to }], { duration: ms(360), easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'forwards' });
      node.style.transform = to;
      node.style.filter = 'drop-shadow(0 0 7px rgba(200, 70, 58, 0.6))';   // 背面朝上也认得出是那只炸毛猫
      await wait(ms(380));
    } else await wait(ms(160));
  }

  /* 塞回去：背面的炸毛猫飞回牌堆，牌堆上半截掀开一道口、它滑进去、合上（不论塞在哪动画都一样，不泄露位置） */
  async function animInsert(e, t) {
    const node = game.boomNode;
    game.boomNode = null;
    const pu = PU();
    const from = node ? node.getBoundingClientRect() : els.center.getBoundingClientRect();
    if (node) node.remove();
    // 掀开的「盖子」= 顶上那张 + 上面将近一半的纸边，一起翘起来（每次掀开的厚度都差不多，看不出塞在哪）
    const layers = Array.from(els.deck.querySelectorAll('.zm-deck-stack > *'));
    const lid = layers.slice(Math.max(1, Math.floor(layers.length * 0.55)));
    lid.forEach((c) => c.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '7px -18px', rotate: '-9deg', offset: 0.35 }, { translate: '7px -18px', rotate: '-9deg', offset: 0.7 }, { translate: '0 0', rotate: '0deg' }], { duration: ms(760), easing: 'ease-in-out' }));
    const r = els.deck.getBoundingClientRect(), c = fx.center(r);
    await fx.fly({ html: backHtml(), from, to: { x: c.x - pu * 0.6, y: c.y - pu * 0.05 }, w: pu, s0: from.width / pu, s1: 1, r0: 180, r1: -10, dur: ms(420), lift: 50, land: false, keep: false });
    if (t !== token) return;
    await fx.fly({ html: backHtml(), from: { x: c.x - pu * 0.6, y: c.y - pu * 0.05 }, to: { x: c.x, y: c.y - 4 }, w: pu, s0: 1, s1: 1, r0: -10, r1: 0, dur: ms(240), lift: 0, land: false, shadow: false });
    if (t !== token) return;
    snd('insert');
    ov.deckSize += 1;
    ov.kittens += 1;
    renderPiles();
    fx.pop(els.deck, { scale: 1.05 });
    if (e.seat === 0 && e.pos != null) bubble(0, e.pos === 0 ? '塞在最上面' : '塞在第 ' + (e.pos + 1) + ' 张', { ms: 1400 });
    else bubble(e.seat, '偷偷塞回去了', { ms: 1400 });
    await wait(ms(260));
  }

  /* 出局：炸毛猫扑向那个人，大爆炸——更大的红光、黑毛、烟、冲击波；头像变灰冒黑烟，「炸毛」大章砸下来；
   * 他的手牌全翻开、一张张散落进弃牌堆 */
  async function animOut(e, t) {
    const node = game.boomNode;
    game.boomNode = null;
    const a = e.seat === 0 ? fx.center(els.me.querySelector('.zm-av').getBoundingClientRect()) : avPoint(e.seat);
    const u = U();
    if (node) {
      node.classList.remove('zm-angry');
      const rr = node.getBoundingClientRect();
      node.remove();
      await fx.fly({ html: cardHtml(R.KIND_OF.indexOf(R.BOOM)), from: rr, to: a, w: u * 1.55, s0: 1, s1: 0.5, r0: -4, r1: 20, dur: ms(380), lift: 30, land: false, fadeOut: true });
    }
    if (t !== token) return;
    snd('kaboom');
    fx.shake(els.table, { amp: 15, dur: 700, rot: 1 });
    fx.flash('rgba(200,70,58,.55)', 0, 1100);
    fx.ring(a.x, a.y, { color: '#c8463a', size: u * 5, width: 10, dur: 760 });
    fx.ring(a.x, a.y, { color: '#3a3632', size: u * 3.2, width: 6, dur: 640, delay: 120 });
    fx.burst(a.x, a.y, { n: 40, shapes: ['fur', 'fur', 'spike'], colors: FUR, radius: u * 2.6, size: [12, 34], alignOut: true, life: 1200, gravity: 50, pattern: 'ring' });
    fx.burst(a.x, a.y, { n: 20, shapes: ['star', 'dot'], colors: GOLDS.concat(['#c8463a']), radius: u * 2, size: [6, 20], life: 1200, delay: 100 });
    fx.smoke(a.x, a.y, { n: 12, spread: u * 0.8, size: [u * 0.7, u * 1.4], rise: 60, tint: 'dark', delay: 60 });
    ov.alive[e.seat] = false;
    ov.counts[e.seat] = 0;
    if (ov.turn === e.seat) ov.turn = -1;
    renderSeat(e.seat);
    await wait(ms(520));
    if (t !== token) return;
    // 手牌散落进弃牌堆（翻开给大家看）
    const cards = e.cards || [];
    const srcRects = e.seat === 0 ? cards.map((id) => handRectOf(id)) : null;
    if (e.seat === 0) { ov.hand = []; renderHand({ flip: false }); }
    const to = discardRect(), pu = PU();
    await Promise.all(cards.map((id, i) => fx.fly({
      html: cardHtml(id), back: backHtml(), flip: e.seat === 0 ? null : 'up', flipAt: 0.2,
      from: srcRects ? srcRects[i] : a, to, w: pu, s0: srcRects ? srcRects[i].width / pu : 0.35, s1: 1, r0: (Math.random() - 0.5) * 60, r1: pileRot(id),
      dur: ms(520), delay: i * ms(70), lift: 60 + Math.random() * 50,
    }).then(() => { if (t === token && ov) { ov.discard.push(id); renderPiles(); } })));
    if (t !== token) return;
    // 炸毛猫最后也落在弃牌堆最上面
    const kit = game.state.discard[game.state.discard.length - 1];
    if (ov && kit != null) { ov.discard.push(kit); renderPiles(); }
    await wait(ms(300));
  }

  /* ───── 反应窗：出完牌大家决定要不要「不行」 ───── */
  function clearReactTimer() { if (reactTimer) { clearTimeout(reactTimer); reactTimer = null; } }
  function reactPhase() {
    const s = game.state, P = pace();
    busy = true;
    game.lastNopes = s.pending.nopes.length;
    if (!els.stage.querySelector('.zm-stage-inner')) { showStage(s.pending, false); if (s.pending.nopes.length) stageVerdict(s.pending.nopes.length); }
    // 机器人：第一个想作废的人，过一会儿出手（我可以抢在前面）
    let botSeat = -1;
    for (const x of R.awaitingReaction(s)) {
      if (x === 0) continue;
      let want;
      if (tut && tut.botNope) want = tut.botNope(s, x);
      if (want == null) want = R.canNope(s, x) && AI.decide(s, x, game.tiers[x] || 'normal').type === 'nope';
      if (want) { botSeat = x; break; }
    }
    const meCan = R.canNope(s, 0) && R.awaitingReaction(s).indexOf(0) >= 0;
    const tutWaitMe = tut && tut.mustNope && tut.mustNope(s);
    const botDelay = botSeat >= 0 ? P.botNope[0] + Math.random() * (P.botNope[1] - P.botNope[0]) : Infinity;
    const windowMs = meCan ? (tutWaitMe ? Infinity : P.react || 1400) : P.quiet;
    const fireAt = Math.min(botDelay, windowMs);
    reactOpen = meCan;
    busy = !meCan;
    renderHand({ flip: false });
    renderBand();
    fuse(meCan ? windowMs : 0);
    if (meCan) { snd('ask'); idle(); }
    if (!isFinite(fireAt)) return; // 教程：等我自己点
    const k = token;
    reactTimer = setTimeout(() => {
      if (k !== token || game.state.phase !== 'react') return;
      reactTimer = null;
      if (botSeat >= 0 && botDelay <= windowMs) doNope(botSeat);
      else closeReact();
    }, fireAt);
  }
  async function doNope(seat) {
    clearReactTimer();
    const s = game.state, t = token;
    reactOpen = false;
    busy = true;
    stopFuse();
    snapshot();
    renderBand();
    const ev = R.nope(s, seat);
    await playEvents(ev, t);
    if (t !== token) return;
    afterEvents(ev);
  }
  async function closeReact() {
    clearReactTimer();
    const s = game.state, t = token;
    reactOpen = false;
    busy = true;
    snapshot();
    renderBand();
    for (const x of R.awaitingReaction(s)) R.pass(s, x);
    const ev = R.closeReaction(s);
    await playEvents(ev, t);
    if (t !== token) return;
    afterEvents(ev);
  }

  /* ───── 我的操作 ───── */
  function shake(node) { if (!node) return; node.classList.remove('zm-shake'); void node.offsetWidth; node.classList.add('zm-shake'); }
  function onCardTap(id, node) {
    const s = game.state;
    if (s.phase === 'react' && reactOpen && R.KIND_OF[id] === R.NOPE) { pressNope(); return; }
    if (mode === 'give') { selected = selected[0] === id ? [] : [id]; snd('tap'); renderHand(); renderBand(); return; }
    if (mode === 'target') { cancelTarget(); }
    if (!myTurnToAct()) { shake(node); return; }
    const i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1); else selected.push(id);
    snd(i >= 0 ? 'untap' : 'tap');
    const wasCombo = !!(selected.length > 1 && R.classify(selected));
    renderHand();
    renderBand();
    if (wasCombo) snd('combo');
  }
  function onDraw() {
    const s = game.state;
    if (!s.alive[0] && s.phase !== 'over') { skipToEnd(); return; }
    if (!myTurnToAct()) return;
    if (tut && tut.allow && !tut.allow({ type: 'draw' })) { shake(els.drawBtn); return; }
    selected = [];
    renderHand();
    apply(0, { type: 'draw' });
  }
  function onPlay() {
    const s = game.state;
    if (mode === 'give') {
      if (selected.length !== 1) return;
      if (tut && tut.allow && !tut.allow({ type: 'give', card: selected[0] })) { shake(els.playBtn); return; }
      const id = selected[0];
      apply(0, { type: 'give', card: id });
      return;
    }
    if (!myTurnToAct()) return;
    const cards = selected.slice();
    const c = R.classify(cards);
    if (!c) return;
    const go = (target, named) => {
      const d = { type: 'play', cards, target, named };
      if (!R.checkPlay(s, 0, cards, d)) { shake(els.playBtn); return; }
      if (tut && tut.allow && !tut.allow(d)) { shake(els.playBtn); renderBand(); return; }
      apply(0, d);
    };
    if (tut && tut.allow && !tut.allow({ type: 'play', cards, preview: true })) { shake(els.playBtn); return; }
    const withName = (target) => { if (c.needsName) nameDialog((k) => go(target, k)); else go(target); };
    if (c.needsTarget) {
      const ts = R.validTargets(s, 0);
      if (ts.length === 1) withName(ts[0]);
      else pickTarget(ts, withName);
    } else go();
  }
  function pickTarget(ts, cb) {
    mode = 'target';
    targetCb = cb;
    for (let seat = 1; seat < game.state.n; seat++) {
      const b = seatEl(seat);
      b.classList.toggle('is-target', ts.indexOf(seat) >= 0);
      b.classList.toggle('is-target-off', ts.indexOf(seat) < 0);
    }
    renderBand();
  }
  function cancelTarget() {
    mode = null; targetCb = null;
    els.opps.querySelectorAll('.zm-seat').forEach((b) => b.classList.remove('is-target', 'is-target-off'));
    renderBand();
  }
  function onSeatTap(seat) {
    if (mode !== 'target' || !targetCb) return;
    const b = seatEl(seat);
    if (!b.classList.contains('is-target')) { shake(b); return; }
    const cb = targetCb;
    cancelTarget();
    cb(seat);
  }
  function pressNope() {
    const s = game.state;
    if (s.phase !== 'react' || !reactOpen || !R.canNope(s, 0)) return;
    if (tut && tut.allow && !tut.allow({ type: 'nope' })) { shake(els.nopeBtn); return; }
    doNope(0);
  }

  /* 我已经炸了：剩下的机器人一口气打完 */
  function skipToEnd() {
    token++;
    const s = game.state;
    let guard = 0;
    clearStage();
    wipeFx();
    while (s.phase !== 'over' && guard++ < 4000) {
      if (s.phase === 'react') { AI.stepWith(s, (x) => game.tiers[x] || 'normal', Math.random); continue; }
      const seat = R.whoActs(s)[0];
      const d = AI.decide(s, seat, seat === 0 ? 'normal' : game.tiers[seat] || 'normal');
      if (d.type === 'draw') R.draw(s, seat);
      else if (d.type === 'play') R.play(s, seat, d.cards, d);
      else if (d.type === 'give') R.give(s, seat, d.card);
      else if (d.type === 'pick') R.pickDiscard(s, seat, d.card);
      else if (d.type === 'insert') R.insertKitten(s, seat, d.pos);
    }
    step();
  }
  function wipeFx() {
    els.fly.innerHTML = '';
    els.fly.classList.remove('is-interactive');
    if (game) game.boomNode = null;
    if (fuseSparkTimer) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; }
  }

  /* ───── 开局发牌 ─────
   * 牌堆从天而降、洗一下 → 一圈圈发牌（给我的翻开滑进手里，给别人的飞进头像）→ 每人一张逗猫棒（正面、带绿光）
   * → 炸毛猫一只只从上面掉下来、气鼓鼓抖两下、钻进牌堆（计数一只只加上去）→ 再洗一下 → 第一个人的红环亮起。
   * 点一下桌面可以跳过。 */
  async function dealIntro(t) {
    const s = game.state, n = s.n;
    const defOf = s.hands.map((h) => h.find((id) => R.KIND_OF[id] === R.DEFUSE));
    const rest = s.hands.map((h, i) => h.filter((id) => id !== defOf[i]));
    const extraInDeck = s.deck.filter((id) => R.KIND_OF[id] === R.DEFUSE || R.KIND_OF[id] === R.BOOM);
    const kits = extraInDeck.filter((id) => R.KIND_OF[id] === R.BOOM);
    const defs = extraInDeck.filter((id) => R.KIND_OF[id] === R.DEFUSE);
    const dealt = rest.reduce((a, h) => a + h.length, 0);
    ov = { counts: Array(n).fill(0), hand: [], deckSize: s.deck.length - kits.length + dealt, kittens: 0, discard: [], turn: -1, turnsLeft: 1, alive: s.alive.slice() };
    game.dealing = true;
    renderAll();
    const skipped = () => t !== token || !game.dealing;
    // 牌堆落下
    if (!fx.reduce()) {
      els.deck.animate([{ transform: 'translateY(-60px) scale(1.15)', opacity: 0 }, { transform: 'translateY(4px) scale(.98)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' });
    }
    snd('thud', 300);
    await wait(460);
    if (skipped()) return;
    await animShuffle({ seat: -1 }, t);
    if (skipped()) return;
    // 一圈圈发
    const order = [];
    for (let r = 0, maxLen = Math.max(...rest.map((h) => h.length)); r < maxLen; r++) {
      for (let k = 0; k < n; k++) { const seat = (s.turn + k) % n; if (rest[seat][r] != null) order.push([seat, rest[seat][r]]); }
    }
    const u = U(), pu = PU();
    const flights = [];
    for (let i = 0; i < order.length; i++) {
      if (skipped()) return;
      const [seat, id] = order[i];
      const from = deckTopRect();
      ov.deckSize -= 1;
      renderPiles();
      snd('deal');
      if (seat === 0) {
        const to = reserveHandSlot(id);
        flights.push(fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'up', flipAt: 0.35, from, to, w: u, s0: pu / u, s1: 1, r0: -10, r1: 0, dur: 420, lift: 60 }).then(() => { if (!skipped()) revealHandCard(id); }));
      } else {
        flights.push(fx.fly({ html: backHtml(), from, to: avPoint(seat), w: pu, s0: 1, s1: 0.4, r0: -10, r1: 20, dur: 380, lift: 40, fadeOut: true, land: false }).then(() => { if (!skipped()) { ov.counts[seat] += 1; renderSeat(seat); } }));
      }
      await wait(85);
    }
    await Promise.all(flights);
    if (skipped()) return;
    // 逗猫棒：正面朝上，从牌堆旁边发出去
    const dc = fx.center(els.deck.getBoundingClientRect());
    const dflights = [];
    for (let k = 0; k < n; k++) {
      const seat = (s.turn + k) % n, id = defOf[seat];
      if (id == null) continue;
      const from = { x: dc.x, y: dc.y - pu * 1.2 };
      snd('ding', k * 110);
      if (seat === 0) {
        const to = reserveHandSlot(id);
        dflights.push(fx.fly({ html: cardHtml(id), from, to, w: u, s0: 0.6, s1: 1, r0: 8, r1: 0, dur: 520, delay: k * 110, lift: 70, fadeIn: true }).then(() => {
          if (skipped()) return;
          revealHandCard(id);
          const r = handRectOf(id);
          fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, shapes: ['star'], colors: ['#4f8a5f', '#9bc8a2', '#c9a96e'], radius: u * 0.8, size: [6, 14], life: 700 });
        }));
      } else {
        dflights.push(fx.fly({ html: cardHtml(id), from, to: avPoint(seat), w: pu, s0: 0.6, s1: 0.45, r0: 8, r1: 0, dur: 480, delay: k * 110, lift: 50, fadeIn: true, fadeOut: true, land: false }).then(() => { if (!skipped()) { ov.counts[seat] += 1; renderSeat(seat); gulp(seat); } }));
      }
    }
    await Promise.all(dflights);
    if (skipped()) return;
    await wait(200);
    // 炸毛猫一只只从牌堆正上方冒出来、气鼓鼓抖两下、钻进牌堆（多出来的逗猫棒一开始就在牌堆里，不单独演）
    void defs;
    const drops = kits;
    for (let i = 0; i < drops.length; i++) {
      if (skipped()) return;
      const id = drops[i], isKit = R.KIND_OF[id] === R.BOOM;
      const W = u * (isKit ? 1.15 : 0.95);
      const hover = { x: dc.x + (i - (drops.length - 1) / 2) * u * 0.55, y: dc.y - pu * 0.55 };
      const node = await fx.fly({ html: cardHtml(id), from: { x: hover.x, y: hover.y - 60 }, to: hover, w: W, s0: 0.7, s1: 1, r0: -20, r1: (i % 2 ? 6 : -6), dur: 360, lift: 0, keep: true, fadeIn: true, land: false });
      if (skipped()) { if (node) node.remove(); return; }
      if (isKit) {
        snd('hiss');
        if (node) node.classList.add('zm-angry');
        fx.burst(hover.x, hover.y, { n: 8, shapes: ['fur'], colors: FUR, radius: W * 0.8, size: [6, 14], alignOut: true, life: 600, pattern: 'ring' });
      }
      await wait(isKit ? 360 : 160);
      if (skipped()) { if (node) node.remove(); return; }
      const rr = node ? node.getBoundingClientRect() : null;
      if (node) node.remove();
      await fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'down', flipAt: 0.1, from: rr || hover, to: deckTopRect(), w: pu, s0: W / pu, s1: 1, r0: 0, r1: 0, dur: 300, lift: 20 });
      if (skipped()) return;
      snd('insert');
      ov.deckSize += 1;
      if (isKit) ov.kittens += 1;
      renderPiles();
      fx.pop(els.deck, { scale: 1.06 });
    }
    if (skipped()) return;
    await animShuffle({ seat: -1 }, t);
    if (skipped()) return;
    game.dealing = false;
    ov.turn = s.turn;
    renderSeats();
    const a = avPoint(s.turn);
    fx.ring(a.x, a.y, { color: '#b4392c', size: 120, width: 3, dur: 560 });
  }
  function skipDeal() {
    if (!game || !game.dealing) return;
    game.dealing = false;
    token++;
    wipeFx();
    release();
    renderAll();
    schedule(200, step);
  }
  async function startWithDeal() {
    const t = token;
    busy = true;
    await dealIntro(t);
    if (t !== token) return;
    game.dealing = false;
    release();
    step();
  }

  /* ───── 弹窗：遮罩淡入、弹窗从下面弹上来 ───── */
  let dialogClose = null;
  function openDialog(html, onMount, onClose) {
    closeMenu();
    pauseClock();
    els.dialog.className = 'zm-dialog';
    els.dialog.innerHTML = html;
    els.mask.hidden = false;
    dialogClose = onClose || null;
    if (onMount) onMount(els.dialog);
    if (!fx.reduce()) {
      els.mask.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
      els.dialog.animate([{ transform: 'translateY(26px) scale(.94)', opacity: 0 }, { transform: 'translateY(-3px) scale(1.01)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.3,.8,.4,1)' });
      els.dialog.querySelectorAll('[data-stagger] > *').forEach((c, i) => c.animate([{ transform: 'translateY(14px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: 120 + i * 40, easing: 'cubic-bezier(.3,.8,.4,1.2)', fill: 'backwards' }));
    }
    const f = els.dialog.querySelector('[data-focus]') || els.dialog.querySelector('button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeDialog() {
    els.mask.hidden = true;
    els.dialog.innerHTML = '';
    resumeClock();
    const cb = dialogClose;
    dialogClose = null;
    return cb;
  }

  function nameDialog(cb) {
    const kinds = R.KINDS.filter((k) => k !== R.BOOM);
    openDialog('<h2>点名要哪种牌？</h2><p class="zm-muted">他手里有，就得给你一张；没有就落空</p>' +
      '<div class="zm-grid" data-stagger>' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '</button>').join('') + '</div>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>算了</button></div>', (d) => {
      d.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { closeDialog(); cb(b.dataset.k); }));
      d.querySelector('[data-cancel]').addEventListener('click', () => { closeDialog(); renderBand(); });
    });
  }

  function pickDialog() {
    const s = game.state;
    const by = {};
    for (const id of s.discard) { const k = R.KIND_OF[id]; if (k !== R.BOOM) (by[k] = by[k] || []).push(id); }
    const kinds = R.KINDS.filter((k) => by[k]);
    openDialog('<h2>从弃牌堆捡一张</h2><p class="zm-muted">五张不同的牌换一张想要的</p>' +
      '<div class="zm-grid" data-stagger>' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '<span>×' + by[k].length + '</span></button>').join('') + '</div>', (d) => {
      d.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
        const id = by[b.dataset.k][by[b.dataset.k].length - 1];
        if (tut && tut.allow && !tut.allow({ type: 'pick', card: id })) { shake(b); return; }
        closeDialog();
        apply(0, { type: 'pick', card: id });
      }));
    });
  }

  /* 塞炸毛猫：一排牌背，炸毛猫插在选定位置；拖滑杆时炸毛猫跟着滑过去（FLIP） */
  /* 塞回去：一排牌背（左 = 牌堆顶、右 = 牌堆底），炸毛猫插进其中一道缝——缝两边的牌往外让开，炸毛猫不压别的牌、也不被压。
   * 拖滑块 / 点三个快捷键选位置，下面一行大字写「第几张」 */
  function insertDialog() {
    const s = game.state;
    const size = s.deck.length;
    let pos = 0;
    const label = (p) => (size === 0 ? '牌堆空了，直接放回去' : p === 0 ? '最上面（下一张就是它）' : p === size ? '最底下' : '从上往下第 ' + (p + 1) + ' 张');
    // 牌堆有几张就画几张（叠得紧一点），左边几张 = 真的在它上面几张
    const n = size;
    const slotOf = (p) => p;
    let fanHtml = '';
    for (let i = 0; i < n; i++) fanHtml += backHtml();
    snd('ask');
    openDialog('<h2>把炸毛猫塞回牌堆</h2>' +
      '<div class="zm-insert-row"><span class="end">顶</span><div class="zm-insert-fan" data-fan>' + fanHtml + cardHtml('boom', 'is-kit') + '</div><span class="end">底</span></div>' +
      '<div class="zm-insert-label" data-lab>' + label(0) + '</div>' +
      (size ? '<input class="zm-range" type="range" min="0" max="' + size + '" step="1" value="0" data-range aria-label="塞在第几张">' +
      '<div class="zm-quick"><button type="button" class="zm-btn" data-q="0">最上面</button><button type="button" class="zm-btn" data-q="rand">随机</button><button type="button" class="zm-btn" data-q="end">最底下</button></div>' : '') +
      '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>塞进去</button></div>', (d) => {
      const range = d.querySelector('[data-range]');
      const fan = d.querySelector('[data-fan]');
      const kit = fan.querySelector('.is-kit');
      const backs = Array.from(fan.querySelectorAll('.zm-card.is-back'));
      // 摆位置：第 k 道缝左边的牌靠左、右边的牌整体右移一个炸毛猫宽，炸毛猫落在缝里（只改 transform，有过渡，看着是牌在让）
      const layout = () => {
        const k = slotOf(pos), W = fan.clientWidth, kw = kit.offsetWidth, cw = backs.length ? backs[0].offsetWidth : 0;
        const step = n > 1 ? Math.max(2.5, Math.min(cw * 0.45, (W - 2 * cw - kw - 12) / Math.max(1, n - 2))) : 0;
        const gap = n ? kw + 12 + (cw - step) : kw;
        const total = n ? cw + (n - 1) * step + gap : kw;
        const x0 = Math.max(0, (W - total) / 2);
        backs.forEach((c, i) => { c.style.transform = 'translateX(' + (x0 + i * step + (i >= k ? gap : 0)).toFixed(1) + 'px)'; });
        const kx = k === 0 ? x0 + 6 : x0 + (k - 1) * step + cw + 6;
        kit.style.transform = 'translateX(' + kx.toFixed(1) + 'px) translateY(-10px)';
      };
      const set = (p) => {
        const prev = slotOf(pos);
        pos = Math.max(0, Math.min(size, p));
        if (range) range.value = pos;
        d.querySelector('[data-lab]').textContent = label(pos);
        if (slotOf(pos) !== prev) { fan.classList.add('is-anim'); layout(); snd('tick'); }
      };
      requestAnimationFrame(layout);
      if (range) range.addEventListener('input', () => set(+range.value));
      d.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        const q = b.dataset.q;
        set(q === 'end' ? size : q === 'rand' ? (Math.random() * (size + 1)) | 0 : +q);
      }));
      d.querySelector('[data-ok]').addEventListener('click', () => {
        if (tut && tut.allow && !tut.allow({ type: 'insert', pos })) { shake(d.querySelector('[data-ok]')); return; }
        closeDialog();
        apply(0, { type: 'insert', pos });
      });
    });
  }

  /* ───── 终局：赢家头顶落下一顶皇冠、满桌撒爪印 / 小鱼 / 星星彩纸，再弹排名 ───── */
  async function celebrate(winner) {
    const t = token;
    const a = avPoint(winner);
    const won = winner === 0;
    snd(won ? 'win' : 'lose');
    const crown = document.createElement('div');
    crown.className = 'zm-prop zm-crown';
    crown.innerHTML = ART.PROPS.crown;
    const S = 64;
    crown.style.width = crown.style.height = S + 'px';
    els.fly.appendChild(crown);
    fx.animate(crown, [
      { transform: fx.T(a.x - S / 2, a.y - S / 2 - 160, 0.6, -30), opacity: 0 },
      { transform: fx.T(a.x - S / 2, a.y - S / 2 - 38, 1.15, 8), opacity: 1, offset: 0.55, easing: 'cubic-bezier(.3,.8,.4,1)' },
      { transform: fx.T(a.x - S / 2, a.y - S / 2 - 46, 1, -4), opacity: 1, offset: 0.75 },
      { transform: fx.T(a.x - S / 2, a.y - S / 2 - 42, 1, 0), opacity: 1 },
    ], { duration: 900 });
    fx.ring(a.x, a.y, { color: '#c9a96e', size: 180, width: 6, dur: 800, delay: 450 });
    fx.burst(a.x, a.y - S * 0.75, { n: 10, shapes: ['star'], colors: ['#fff6d8', '#f3d27f', '#e2b45a'], radius: S * 0.9, size: [5, 12], life: 900, delay: 500 });
    fx.pop(avEl(winner), { scale: 1.25, dur: 500, delay: 450 });
    const W = innerWidth;
    for (let i = 0; i < 6; i++) {
      fx.burst(W * (0.12 + 0.76 * (i / 5)), innerHeight * 0.18, { n: won ? 22 : 12, shapes: ['paw', 'star', 'heart', 'fish', 'dot'], colors: CONFETTI, radius: 120, size: [10, 24], life: 1800, gravity: innerHeight * 0.45, pattern: 'fountain', delay: 300 + i * 160 });
    }
    await wait(won ? 1700 : 1300);
    if (t !== token) return false;
    return true;
  }
  async function finish() {
    busy = true;
    const s = game.state;
    clearStage();
    renderAll();
    const order = [s.winner].concat(s.outOrder.slice().reverse());
    const won = s.winner === 0;
    const ok = await celebrate(s.winner);
    if (!ok) return;
    if (game.tutorial) {
      const msgs = tut && tut.finish ? tut.finish(won) : [];
      showCoach(msgs, () => {
        openDialog('<h2>教程完成</h2><p>来一局真的吧：' + settings.players + ' 人，机器猫' + AI.TIER_NAMES[settings.tier] + '（菜单里的设置可以改）。</p>' +
          '<div class="zm-actions"><button type="button" class="zm-btn" data-home>回封面</button><button type="button" class="zm-btn zm-btn-primary" data-go data-focus>开始对局</button></div>', (d) => {
          d.querySelector('[data-go]').addEventListener('click', () => { closeDialog(); endTutorial(true); });
          d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); endTutorial(false); });
        });
      });
      return;
    }
    localStorage.removeItem(STORE_KEY);
    openDialog('<h2>' + (won ? '你撑到了最后！' : esc(nameOf(s.winner)) + ' 撑到了最后') + '</h2>' +
      '<ol class="zm-rank" data-stagger>' + order.map((seat, i) => '<li class="' + (seat === 0 ? 'is-me' : '') + '"><span class="pos">' + (i + 1) + '</span><span class="mini">' + avatarHtml(seat) + '</span><span class="nm">' + esc(nameOf(seat)) + '</span><span class="tag">' + (i === 0 ? '胜利' : '第 ' + (i + 1) + ' 名') + '</span></li>').join('') + '</ol>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-home>回封面</button><button type="button" class="zm-btn zm-btn-primary" data-again data-focus>再来一局</button></div>', (d) => {
      d.querySelector('[data-again]').addEventListener('click', () => { closeDialog(); newGame(); });
      d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); showCover(); });
    });
  }

  function rulesHtml() {
    const li = (k, t) => '<li>' + cardHtml(k) + '<b>' + R.NAMES[k] + '</b>　' + t + '</li>';
    return '<div class="zm-rules"><h2>怎么玩</h2>' +
      '<p>牌堆里藏着炸毛猫（比人数少一只）。轮到你时，可以出任意多张牌，也可以一张不出，<b>最后摸一张牌结束回合</b>。摸到炸毛猫、手里又没有逗猫棒，就出局。撑到最后的人赢。</p>' +
      '<h3>每人开局</h3><ul><li>4 张随机牌 + 1 张逗猫棒。牌堆下面的数字是剩几张、红色小炸毛猫是里面还有几只。</li></ul>' +
      '<h3>牌</h3><ul>' +
      li('boom', '摸到就炸毛出局，除非有逗猫棒') +
      li('defuse', '摸到炸毛猫时自动用掉，然后你把炸毛猫偷偷塞回牌堆任意位置') +
      li('nope', '作废别人刚出的牌（不管轮没轮到你）。也能作废「不行」，单数张=作废。挡不了炸毛猫和逗猫棒') +
      li('attack', '结束回合、不摸牌，下家连着摸两回合' + (settings.rules.stackAttack ? '（被推锅的人再推锅：剩下的回合 +2 一起推走）' : '（被推锅的人再推锅，下家也还是两回合）')) +
      li('skip', '结束一个回合、不摸牌。被推锅时只顶掉其中一回合') +
      li('favor', '指定一人，他自己挑一张给你') +
      li('shuffle', '把牌堆洗乱') +
      li('future', '偷看牌堆最上面三张') +
      '</ul><h3>组合（任何同名牌都算）</h3><ul>' +
      '<li><b>两张一样</b>　指定一人，随机偷他一张</li>' +
      '<li><b>三张一样</b>　指定一人并点名一种牌，他有就得给你</li>' +
      '<li><b>五张各不同</b>　从弃牌堆捡任意一张</li>' +
      '<li>橘猫、三花、奶牛猫、狸花、暹罗本身没用，专门凑组合</li></ul>' +
      '<h3>操作</h3><ul><li>点手牌选中（可多选），再点「出牌」；需要指定人时，能选的人头像会亮，点他的头像。</li>' +
      '<li>不想出牌就点「摸牌」结束回合。轮到你时头像外有一圈红环在收，收完还没动就自动替你摸一张（设置里可改成不限时）。</li>' +
      '<li>别人出牌后桌子中间那根导火索在烧：你手里有「喵？不行」就会出现紫色按钮，烧完之前点它作废。</li></ul></div>';
  }
  function showRules() {
    openDialog(rulesHtml() + '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>好</button></div>', (d) => {
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
    });
  }

  function showSettings(fromCover) {
    const draft = { players: settings.players, tier: settings.tier, turnSec: turnSec(), rules: Object.assign({}, settings.rules) };
    const seg = (key, opts, val) => '<div class="zm-seg" data-seg="' + key + '">' + opts.map(([v, t]) => '<button type="button" data-v="' + v + '" class="' + (String(v) === String(val) ? 'is-on' : '') + '">' + t + '</button>').join('') + '</div>';
    openDialog('<h2>设置</h2><div class="zm-set">' +
      '<div class="zm-set-row"><span>几个人玩（含你）</span>' + seg('players', [[2, '2 人'], [3, '3 人'], [4, '4 人'], [5, '5 人']], draft.players) + '</div>' +
      '<div class="zm-set-row"><span>机器猫水平</span>' + seg('tier', AI.TIERS.map((t) => [t, AI.TIER_NAMES[t]]), draft.tier) + '</div>' +
      '<div class="zm-set-row"><span>出牌限时</span>' + seg('turnSec', [[20, '20 秒'], [0, '不限时']], draft.turnSec) + '</div>' +
      '<div class="zm-set-row"><span>推锅叠加（被推锅的人再推锅，剩下的回合 +2 一起推走）</span>' + seg('stackAttack', [[false, '不叠加（原版）'], [true, '叠加']], draft.rules.stackAttack) + '</div>' +
      '<div class="zm-set-row"><span>多出来的逗猫棒</span>' + seg('extraDefuse', [['two', '最多放回 2 张'], ['all', '全部放回']], draft.rules.extraDefuse) + '</div>' +
      '</div><p class="zm-muted" style="margin-top:12px">改了从下一局开始生效</p>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>取消</button>' +
      (fromCover ? '' : '<button type="button" class="zm-btn" data-savenew>保存并重开</button>') +
      '<button type="button" class="zm-btn zm-btn-primary" data-save data-focus>保存</button></div>', (d) => {
      d.querySelectorAll('[data-seg]').forEach((g) => g.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-v]');
        if (!b) return;
        g.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b));
        fx.pop(b, { scale: 1.08, dur: 220 });
        const key = g.dataset.seg, v = b.dataset.v;
        if (key === 'players') draft.players = +v;
        else if (key === 'tier') draft.tier = v;
        else if (key === 'turnSec') draft.turnSec = +v;
        else if (key === 'stackAttack') draft.rules.stackAttack = v === 'true';
        else draft.rules[key] = v;
      }));
      const commit = () => { const changed = draft.players !== settings.players; Object.assign(settings, draft); settings.rules = R.normalizeRules(draft.rules); saveSettings(); if (changed) coverPick = settings.players; refreshCover(); };
      d.querySelector('[data-cancel]').addEventListener('click', closeDialog);
      d.querySelector('[data-save]').addEventListener('click', () => { commit(); closeDialog(); });
      const sn = d.querySelector('[data-savenew]');
      if (sn) sn.addEventListener('click', () => { commit(); closeDialog(); newGame(); });
    });
  }

  /* ───── 右上角菜单（照拱猪）─────
   * 每条 = 左边一个线条小图标 + 一行字；按场合换内容：对局里 / 教程里。
   * 「返回百宝奇巧」只给从本站点进来的人（记在这个标签页里，刷新也还在）；单独打开的（分享链接、装到桌面）不占这一条 */
  const FROM_SITE = (() => {
    const K = 'zm-from-site';
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && !ref.pathname.startsWith('/toolbox/puffcat') && !ref.pathname.startsWith('/toolbox/zhamao')) sessionStorage.setItem(K, '1');
      return sessionStorage.getItem(K) === '1';
    } catch (_) { return false; }
  })();
  // 齿轮：8 个齿按角度算出来
  const GEAR = (() => {
    const pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2); };
    let d = '';
    for (let k = 0; k < 8; k++) {
      const c = k * 45;
      d += (k ? 'L' : 'M') + pt(c - 16, 6.6) + 'L' + pt(c - 10, 9.4) + 'L' + pt(c + 10, 9.4) + 'L' + pt(c + 16, 6.6);
    }
    return '<path d="' + d + 'Z"/><circle cx="12" cy="12" r="2.8"/>';
  })();
  const MENU_ICONS = {
    restart: '<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.6 4.2v4.2h-4.2"/>',
    settings: GEAR,
    rules: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.4a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.4v.5"/><path d="M12 16.6v.1"/>',
    tutorial: '<path d="M12 6.6C10 5 7 4.5 4 5v13.2c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V5c-3-.5-6 0-8 1.6Z"/><path d="M12 6.6v13.2"/>',
    skip: '<path d="M4.5 6.5 11 12l-6.5 5.5Z"/><path d="M12.5 6.5 19 12l-6.5 5.5Z"/>',
    pause: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
    cover: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.5 9.5v10h11v-10"/><path d="M10 19.5v-5h4v5"/>',
    exit: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  };
  function menuItems() {
    const exit = FROM_SITE ? [['exit', '返回百宝奇巧']] : [];
    if (game && game.tutorial) return [['skip', '跳过教程'], ['rules', '规则'], ['line'], ['cover', '回到主菜单'], ...exit];
    return [
      ...(canPause() ? [['pause', '暂停']] : []),
      ['restart', '重新开一局'],
      ['settings', '设置'],
      ['rules', '规则'],
      ['tutorial', '新手教程'],
      ['line'],
      ['cover', '回到主菜单'],
      ...exit,
    ];
  }
  function menuAct(k) {
    closeMenu();
    if (k === 'restart') {
      if (game && !game.dealing && game.state.phase !== 'over' && !confirm('放弃这一局，重新开一局？')) return;
      newGame();
    }
    else if (k === 'settings') showSettings(false);
    else if (k === 'rules') showRules();
    else if (k === 'tutorial') startTutorial();
    else if (k === 'skip') skipTutorial();
    else if (k === 'pause') pauseGame();
    else if (k === 'cover') { if (game && game.tutorial) quitTutorial(); else showCover(); }
    else if (k === 'exit') location.href = '/toolbox/';
  }
  let menu = null;
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    $('zmMenuBtn').setAttribute('aria-expanded', 'false');
    resumeClock();
  }
  function toggleMenu(e) {
    if (e) e.stopPropagation();
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'zm-menu';
      menu.setAttribute('role', 'menu');
      menu.hidden = true;
      menu.addEventListener('click', (ev) => { const b = ev.target.closest('[data-m]'); if (b) menuAct(b.dataset.m); });
      menu.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { closeMenu(); $('zmMenuBtn').focus(); return; }
        if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
        ev.preventDefault();
        const bs = Array.from(menu.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
        bs[(i + (ev.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
      });
      document.addEventListener('click', (ev) => { if (!ev.target.closest('.zm-menu, #zmMenuBtn')) closeMenu(); });
      els.app.appendChild(menu);
    }
    if (!menu.hidden) { closeMenu(); return; }
    if (soundPanel) soundPanel.hidden = true;
    menu.innerHTML = menuItems().map(([k, t]) => k === 'line' ? '<hr>'
      : '<button type="button" role="menuitem" data-m="' + k + '"><svg class="zm-menu-ic" viewBox="0 0 24 24" aria-hidden="true">' + (MENU_ICONS[k] || '') + '</svg><b>' + esc(t) + '</b></button>').join('');
    menu.hidden = false;
    $('zmMenuBtn').setAttribute('aria-expanded', 'true');
    pauseClock();
    const r = $('zmMenuBtn').getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    menu.style.right = Math.round(Math.max(8, window.innerWidth - r.right)) + 'px';
    if (!fx.reduce()) {
      menu.animate([{ transform: 'translateY(-6px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
      menu.querySelectorAll('button').forEach((b, i) => b.animate([{ opacity: 0, transform: 'translateX(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: 30 + i * 22, easing: 'ease-out', fill: 'backwards' }));
    }
    const first = menu.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  /* ───── 暂停（照拱猪）─────
   * 单机对局里点顶栏的暂停键，或者切到后台（回个微信）：机器猫不偷跑、导火索不烧，回来点「继续」接着打。
   * 停下来 = 作废所有排着的动画 / 计时，存档；继续 = 按现在的局面重新摆一遍、接着走（和刷新后接存档同一条路） */
  function canPause() {
    return !!(game && !game.tutorial && !game.dealing && game.state.phase !== 'over' && els.cover.hidden && !coachQueue);
  }
  function pauseGame() {
    if (!canPause() || !els.mask.hidden) return;
    closeMenu();
    if (soundPanel) soundPanel.hidden = true;
    resetTable();
    if (game) game.peekDone = null;
    save();
    busy = true;
    renderAll();
    openDialog('<h2>暂停</h2><div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-go data-focus>继续</button>' +
      '<button type="button" class="zm-btn" data-home>回到主菜单</button></div>', (d) => {
      d.classList.add('is-pause');
      d.querySelector('[data-go]').addEventListener('click', () => { closeDialog(); renderAll(); schedule(260, step); });
      d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); showCover(); });
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && canPause() && els.mask.hidden) pauseGame();
  });
  function refreshTools() {
    $('zmPauseBtn').hidden = !(game && !game.tutorial && els.cover.hidden);
  }
  let soundPanel = null;
  function refreshSoundBtn() {
    const A = window.ZhamaoAudio, btn = $('zmSoundBtn');
    if (!A) { btn.hidden = true; return; }
    const p = A.prefs(), off = !p.sfx && !p.music;
    btn.classList.toggle('is-off', off);
  }
  function toggleSoundPanel(e) {
    const A = window.ZhamaoAudio;
    if (!A) return;
    if (e) e.stopPropagation();
    if (!soundPanel) {
      soundPanel = document.createElement('div');
      soundPanel.className = 'zm-sound-panel';
      soundPanel.hidden = true;
      soundPanel.innerHTML = [['sfx', '音效'], ['music', '背景音乐']].map(([k, t]) => '<label class="zm-sound-row"><input type="checkbox" data-track="' + k + '"><span>' + t + '</span></label>').join('');
      soundPanel.addEventListener('change', (ev) => { const k = ev.target.dataset.track; if (k) { A.set(k, ev.target.checked); refreshSoundBtn(); } });
      document.addEventListener('click', (ev) => { if (soundPanel && !soundPanel.hidden && !ev.target.closest('.zm-sound-panel, #zmSoundBtn')) soundPanel.hidden = true; });
      els.app.appendChild(soundPanel);
    }
    soundPanel.hidden = !soundPanel.hidden;
    if (!soundPanel.hidden) {
      const p = A.prefs();
      soundPanel.querySelectorAll('input').forEach((b) => { b.checked = !!p[b.dataset.track]; });
      const r = $('zmSoundBtn').getBoundingClientRect(), ar = els.app.getBoundingClientRect();
      soundPanel.style.top = Math.round(r.bottom - ar.top + 8) + 'px';
      soundPanel.style.right = Math.round(ar.right - r.right - 60) + 'px';
    }
  }

  /* ───── 教程讲解 ───── */
  let coachQueue = null;
  function inlineCards(text) {
    return esc(text).replace(/【([^】]+)】/g, (m, name) => {
      const k = R.KINDS.find((x) => R.NAMES[x] === name);
      return k ? cardHtml(k) + '<b>' + esc(name) + '</b>' : m;
    });
  }
  function showCoach(msgs, done) {
    coachQueue = { msgs: msgs.slice(), done };
    busy = true;
    nextCoach();
  }
  function nextCoach() {
    if (!coachQueue) return;
    const m = coachQueue.msgs.shift();
    if (m == null) { const d = coachQueue.done; coachQueue = null; hideCoach(); if (d) d(); return; }
    const wasHidden = els.coach.hidden || els.coach.classList.contains('is-hint');
    els.coach.hidden = false;
    els.coach.classList.remove('is-hint');
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(m);
    if (!fx.reduce()) {
      if (wasHidden) els.coach.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
      else els.coach.querySelector('.zm-coach-text').animate([{ opacity: 0, translate: '8px 0' }, { opacity: 1, translate: '0 0' }], { duration: 220, easing: 'ease-out' });
    }
  }
  function hint(text) { // 不挡操作的小提示（落在桌子下沿）
    if (!text) { if (!coachQueue) hideCoach(); return; }
    const was = !els.coach.hidden && els.coach.classList.contains('is-hint');
    els.coach.hidden = false;
    els.coach.classList.add('is-hint');
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(text);
    if (!was && !fx.reduce()) els.coach.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: 'ease-out' });
  }
  function hideCoach() { els.coach.hidden = true; els.coach.classList.remove('is-hint'); }
  document.addEventListener('click', (e) => {
    if (coachQueue && !els.coach.hidden && !els.coach.classList.contains('is-hint') && !e.target.closest('.zm-dialog-mask, .zm-menu, .zm-tools, .zm-peek')) { e.stopPropagation(); nextCoach(); }
  }, true);
  document.addEventListener('keydown', (e) => { if (coachQueue && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nextCoach(); } });

  function resetTable() {
    stopClock();
    closeDialog();
    token++;
    clearReactTimer();
    clearStage();
    wipeFx();
    hideCoach();
    coachQueue = null;
    release();
    selected = []; mode = null;
    lastKit = -1; lastDeck = -1; lastCue = '';
  }
  function startTutorial() {
    if (!TUT) return;
    resetTable();
    const ctl = TUT.create(R, { hint, say: (msgs, then) => showCoach(msgs, then || step) });
    tut = ctl;
    game = { state: ctl.state, bots: [{ nick: '我', avatar: null }, { nick: ctl.botName, avatar: ctl.botAvatar }], tiers: [null, 'normal'], tutorial: true };
    els.cover.hidden = true;
    els.skipTut.hidden = false;
    buildSeats();
    solveSize();
    busy = true;
    const t = token;
    // 教程也先发牌（不能跳），发完再讲
    dealIntro(t).then(() => {
      if (t !== token) return;
      game.dealing = false;
      release();
      renderAll();
      showCoach(ctl.intro, step);
    });
  }
  function endTutorial(toGame) {
    try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
    tut = null;
    els.skipTut.hidden = true;
    hideCoach();
    coachQueue = null;
    if (toGame) newGame(); else showCover();
  }
  // 跳过教程：记下「学过了」，有存档就接着打，没有就开一局
  function skipTutorial() {
    try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
    tut = null;
    els.skipTut.hidden = true;
    const d = loadSaved();
    if (d) resumeGame(d); else newGame();
  }
  // 教程打到一半回主菜单：不记「学过了」
  function quitTutorial() { tut = null; els.skipTut.hidden = true; showCover(); }

  /* ───── 开局 / 封面 ───── */
  function newGame() {
    resetTable();
    tut = null;
    els.skipTut.hidden = true;
    const n = settings.players;
    const st = R.createGame(n, (Math.random() * 2 ** 31) | 0, settings.rules);
    game = { state: st, bots: drawBots(n), tiers: [null].concat(Array(n - 1).fill(settings.tier)), tutorial: false };
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    busy = true;
    if (window.ZhamaoAudio) window.ZhamaoAudio.music(true);
    startWithDeal();
  }
  function resumeGame(d) {
    resetTable();
    game = { state: d.state, bots: d.bots, tiers: d.tiers, tutorial: false };
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    renderAll();
    if (window.ZhamaoAudio) window.ZhamaoAudio.music(true);
    schedule(300, step);
  }
  // 主菜单上直接挑几个人（2–5，含你）；有存档时默认亮存档的人数、写「接着打上一局」，换个人数就是新开一局
  let coverPick = null;
  function refreshCover() {
    const saved = loadSaved();
    const resume = saved && (coverPick == null || coverPick === saved.state.n);
    const n = resume ? saved.state.n : (coverPick || settings.players);
    $('zmCoverSolo').textContent = resume ? '接着打上一局' : '新开一局 · 机器猫' + AI.TIER_NAMES[settings.tier];
    $('zmCoverSeats').querySelectorAll('[data-n]').forEach((b) => { const on = +b.dataset.n === n; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    let seen = true;
    try { seen = !!localStorage.getItem(TUT_KEY); } catch (_) { /* 无痕 */ }
    els.cover.querySelector('[data-cover="tutorial"]').textContent = seen ? '新手教程' : '第一次玩？先学一局';
    els.cover.querySelector('[data-cover="exit"]').hidden = !FROM_SITE;
  }
  // 主菜单两步：先是一条进度条，跑完换成按钮
  function coverStep(k) {
    els.cover.querySelectorAll('[data-cover-step]').forEach((x) => { x.hidden = x.dataset.coverStep !== k; });
  }
  function showCover() {
    if (game && !game.tutorial && !game.dealing) save();
    resetTable();
    tut = null;
    els.skipTut.hidden = true;
    if (soundPanel) soundPanel.hidden = true;
    coverPick = null;
    refreshCover();
    coverStep('main');
    els.cover.hidden = false;
    refreshTools();
    coverIntro(false);
  }
  // 主菜单：标题一个字一个字落下来，按钮依次浮上来（只在进来那一次落字，回主菜单时只浮按钮）
  function coverIntro(title) {
    if (fx.reduce()) return;
    const h = els.cover.querySelector('.zm-cover-title');
    if (!h.querySelector('span')) h.innerHTML = Array.from(h.textContent).map((ch) => '<span>' + ch + '</span>').join('');
    if (title) h.querySelectorAll('span').forEach((sp, i) => sp.animate([{ transform: 'translateY(-26px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(4px) rotate(2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: 120 + i * 90, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
    const items = title ? els.cover.querySelectorAll('.zm-cover-art, .zm-cover-sub') : els.cover.querySelectorAll('.zm-cover-art, .zm-cover-sub, .zm-cover-btn:not([hidden]), .zm-cover-foot:not([hidden])');
    items.forEach((n, i) => n.animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: i === 0 ? 0 : (title ? 380 : 60) + i * 80, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }
  // 进度条跑完：按钮一个个浮上来
  function coverReveal() {
    coverStep('main');
    if (fx.reduce()) return;
    els.cover.querySelectorAll('.zm-cover-btn:not([hidden]), .zm-cover-foot:not([hidden])').forEach((n, i) => n.animate([{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: i * 90, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }

  /* ───── 绑定 ───── */
  $('zmCoverArt').innerHTML = ART.hero();
  // 彩蛋：鼠标经过（或点一下）封面上的炸毛猫，它就炸两下毛、掉几根毛（平时每隔几秒自己也会抖一下，见 CSS）
  (function heroEgg() {
    const g = $('zmCoverArt').querySelector('.hero-boom');
    if (!g) return;
    let busyEgg = false;
    const poke = () => {
      if (busyEgg || fx.reduce()) return;
      busyEgg = true;
      snd('hiss');
      g.animate([
        { transform: 'scale(1)' }, { transform: 'scale(1.13) rotate(-5deg)', offset: 0.14 }, { transform: 'scale(1.04) rotate(4deg)', offset: 0.3 },
        { transform: 'scale(1.14) rotate(-4deg)', offset: 0.48 }, { transform: 'scale(1.05) rotate(3deg)', offset: 0.66 }, { transform: 'scale(1)' },
      ], { duration: 720, easing: 'ease-out' }).finished.then(() => { busyEgg = false; }, () => { busyEgg = false; });
      const r = g.getBoundingClientRect(), c = fx.center(r);
      fx.burst(c.x, c.y, { n: 10, shapes: ['fur'], colors: FUR, radius: r.width * 0.55, size: [6, 14], alignOut: true, life: 700, gravity: 30, pattern: 'ring', delay: 60 });
    };
    g.style.cursor = 'pointer';
    g.addEventListener('pointerenter', poke);
    g.addEventListener('click', poke);
  })();
  els.cover.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cover]');
    if (!b) return;
    const k = b.dataset.cover;
    if (k === 'solo') {
      const saved = loadSaved();
      if (saved && (coverPick == null || coverPick === saved.state.n)) { resumeGame(saved); return; }
      let seen = false;
      try { seen = !!localStorage.getItem(TUT_KEY); } catch (_) { seen = true; }
      if (!seen && TUT) {
        openDialog('<h2>第一次玩？</h2><p>先花两分钟走一遍新手教程，跟着做就会了。</p><div class="zm-actions"><button type="button" class="zm-btn" data-skip>直接开始</button><button type="button" class="zm-btn zm-btn-primary" data-tut data-focus>看教程</button></div>', (d) => {
          d.querySelector('[data-tut]').addEventListener('click', () => startTutorial());
          d.querySelector('[data-skip]').addEventListener('click', () => { try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* */ } newGame(); });
        });
      } else newGame();
      return;
    }
    if (k === 'tutorial') startTutorial();
    else if (k === 'settings') showSettings(true);
    else if (k === 'exit') location.href = '/toolbox/';
  });
  $('zmCoverSeats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (!b) return;
    coverPick = +b.dataset.n;
    settings.players = coverPick;
    saveSettings();
    refreshCover();
    fx.pop(b, { scale: 1.1, dur: 220 });
    snd('tick');
  });
  els.drawBtn.addEventListener('click', onDraw);
  els.playBtn.addEventListener('click', onPlay);
  els.nopeBtn.addEventListener('click', pressNope);
  els.cancelBtn.addEventListener('click', cancelTarget);
  els.skipTut.addEventListener('click', skipTutorial);
  $('zmPauseBtn').addEventListener('click', pauseGame);
  $('zmRulesBtn').addEventListener('click', showRules);
  $('zmMenuBtn').addEventListener('click', toggleMenu);
  $('zmSoundBtn').addEventListener('click', toggleSoundPanel);
  els.mask.addEventListener('click', (e) => { if (e.target === els.mask && els.dialog.querySelector('[data-ok]') && !els.dialog.querySelector('[data-range]')) { const cb = closeDialog(); if (cb) cb(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode === 'target') cancelTarget();
    if ((e.key === 'Escape' || e.key === 'Enter') && game && game.peekDone) game.peekDone();
  });
  // 点空白处：发牌中=跳过发牌；否则取消选牌 / 取消点人
  els.table.addEventListener('click', (e) => {
    if (game && game.dealing && !game.tutorial) { skipDeal(); return; }
    if (e.target.closest('.zm-card, .zm-btn, .zm-seat, .zm-tool, .zm-coach')) return;
    if (mode === 'target') { cancelTarget(); return; }
    if (selected.length && mode !== 'give') { selected = []; renderHand(); renderBand(); }
  });
  window.addEventListener('resize', () => { if (game) solveSize(); });
  refreshSoundBtn();
  refreshCover();
  refreshTools();
  // 进来先是主菜单 + 一条进度条（等字体到位，太快也让它走完一程，不闪），跑完换成按钮
  (function boot() {
    coverStep('load');
    coverIntro(true);
    const bar = els.cover.querySelector('.zm-cover-load i');
    let got = 0.12;
    const bump = (to) => { got = Math.max(got, to); bar.style.transform = 'scaleX(' + got.toFixed(3) + ')'; };
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    const t0 = performance.now();
    bump(0.3);
    (document.fonts ? Promise.race([document.fonts.ready, sleep(1500)]) : Promise.resolve()).then(async () => {
      bump(0.75);
      await sleep(Math.max(0, 900 - (performance.now() - t0)));
      bump(1);
      await sleep(240);
      if (!els.cover.hidden) coverReveal();
    });
  })();

  // 本机调试：__zmDebug.demo('boom') 之类，单独放一段动画看效果（见 demo()）
  function demo(name) {
    if (!game) newGame();
    const s = game.state;
    resetTable();
    game.dealing = false;
    const pool = (k) => R.KIND_OF.map((x, id) => (x === k ? id : -1)).filter((id) => id >= 0 && s.hands.every((h) => h.indexOf(id) < 0) && s.deck.indexOf(id) >= 0);
    const give = (seat, k) => { const id = pool(k)[0]; if (id == null) return; s.deck.splice(s.deck.indexOf(id), 1); s.hands[seat].push(id); s.hands[seat] = R.sortHand(s.hands[seat]); };
    const top = (k) => { const id = s.deck.find((x) => R.KIND_OF[x] === k); s.deck.splice(s.deck.indexOf(id), 1); s.deck.unshift(id); };
    s.phase = 'act'; s.pending = null;
    const bot = 1 % s.n;
    const plays = {
      boom: () => { top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      boomme: () => { top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      out: () => { top(R.BOOM); s.turn = bot; s.hands[bot] = s.hands[bot].filter((id) => R.KIND_OF[id] !== R.DEFUSE); apply(bot, { type: 'draw' }); },
      draw: () => { s.turn = 0; apply(0, { type: 'draw' }); },
      attack: () => { give(bot, R.ATTACK); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      skip: () => { give(bot, R.SKIP); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SKIP)] }); },
      shuffle: () => { give(bot, R.SHUFFLE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SHUFFLE)] }); },
      future: () => { give(0, R.FUTURE); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.FUTURE)] }); },
      futurebot: () => { give(bot, R.FUTURE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FUTURE)] }); },
      favor: () => { give(bot, R.FAVOR); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FAVOR)], target: 0 }); },
      steal: () => { give(0, 'cow'); give(0, 'cow'); s.turn = 0; apply(0, { type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: bot }); },
      triple: () => { give(bot, 'tabby'); give(bot, 'tabby'); give(bot, 'tabby'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: 0, named: R.DEFUSE }); },
      nope: () => { give(0, R.NOPE); give(bot, R.ATTACK); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      win: () => { for (let i = 1; i < s.n; i++) { s.alive[i] = false; s.outOrder.push(i); s.hands[i] = []; } s.phase = 'over'; s.winner = 0; release(); renderAll(); finish(); },
      deal: () => newGame(),
    };
    release();
    renderAll();
    (plays[name] || plays.draw)();
  }
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).has('zmdemo')) {
    window.__zmDebug = { get game() { return game; }, step, newGame, startTutorial, demo, R, AI, fx };
  }
  window.ZhamaoTable = { cardHtml, backHtml, rulesHtml };
})();
