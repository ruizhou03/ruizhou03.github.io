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
  // 我出局后加速看完：等我那一下炸完、手牌全落进弃牌堆（game.fastOut，animOut 最后才置上）才快起来，别把我自己的出局动画也快进了
  const pace = () => (game && game.tutorial ? TUT_PACE : game && game.fastOut ? FAST : PACE);
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
  // 2026-11-12 起甩锅默认叠加：老设置里存的「不叠加」是当时的默认值，改成新默认（之后自己再改就记住）
  if (settings.rulesV !== 2 && settings.rulesV !== 3) { settings.rules = Object.assign({}, settings.rules, { stackAttack: true }); settings.rulesV = 2; }
  // 2026-11-13 起「多的逗猫棒全放回」默认开（官方规则）：老设置里存的「最多放回 2 张」是当时的默认值，改成新默认（之后自己再关就记住）
  if (settings.rulesV !== 3) { settings.rules = Object.assign({}, settings.rules, { extraDefuse: 'all' }); settings.rulesV = 3; }
  settings.rules = R.normalizeRules(settings.rules);
  if (!(settings.players >= R.MIN_PLAYERS && settings.players <= R.MAX_PLAYERS)) settings.players = 4;
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
  let autopilot = false; // 托管：我的每一步交给机器猫（点自己头像进 / 出；连着两回合超时自动进）
  let timeouts = 0;      // 连着超时几次（我自己动一下就清零）
  let viewSeat = -1;     // 我出局后坐到哪只机器猫背后看它的手牌（-1 = 不看）
  let autoAct = false;   // 这一步是超时 / 托管替我做的（不清零超时次数）
  const handHidden = new Set();   // 手牌里「位置先占好、牌还在路上」的那几张

  function save() {
    if (!game || game.tutorial || game.online) return;
    if (game.state.phase === 'over') { localStorage.removeItem(STORE_KEY); return; }
    writeJSON(STORE_KEY, { v: VERSION, state: game.state, bots: game.bots, tiers: game.tiers });
  }
  function loadSaved() {
    const d = readJSON(STORE_KEY);
    if (!d || d.v !== VERSION || !d.state || d.state.phase === 'over') return null;
    const s = d.state;
    const total = s.deck.length + s.discard.length + s.removed.length + s.hands.reduce((a, h) => a + h.length, 0) + (s.defuse ? 1 : 0);
    // 旧存档：加「抽底」前是 64 张、加第二副（6–9 人）前是 68 张、加万能猫前是 135 张。没出现过的牌全收进盒子（removed），照样接着打（那局就没有万能猫）
    if ((total !== R.DECK_SIZE && R.LEGACY_SIZES.indexOf(total) < 0) || !Array.isArray(d.tiers) || d.tiers.length !== s.n) return null;
    s.rules = R.normalizeRules(s.rules);   // 老存档的规则按现在的来（例如甩锅一律叠加）
    if (total !== R.DECK_SIZE) {
      const seen = new Set(s.deck.concat(s.discard, s.removed, ...s.hands, s.defuse ? [s.defuse.card] : []));
      for (let id = 0; id < R.DECK_SIZE; id++) if (!seen.has(id)) s.removed.push(id);
    }
    return d;
  }

  /* ───── 我的名字和头像（照拱猪）─────
   * 存在本机；名字和站里其他游戏共用（GamesShell.Identity）。没填过名字就随机起一个：一堆猫的品种 + 拱猪那套带烟火气的两字名 */
  const PROFILE_KEY = 'zm.profile.v1';
  const CAT_NICKS = ['三花', '暹罗', '金渐层', '银渐层', '布偶', '橘座', '狸花', '奶牛', '英短', '美短', '缅因', '波斯', '玳瑁', '无毛',
    '折耳', '狮子猫', '德文', '加菲', '豹猫', '孟加拉', '挪威森林', '俄罗斯蓝', '乌云踏雪', '煤球', '雪球', '黑猫警长'];
  const ident = () => (window.GamesShell && window.GamesShell.Identity) || null;
  const randomNick = () => { const pool = CAT_NICKS.concat(AV ? AV.NICKS : []); return pool[(Math.random() * pool.length) | 0]; };
  function loadProfile() {
    const p = readJSON(PROFILE_KEY) || {};
    const shared = ident() && ident().getNick ? ident().getNick() : null;
    const nick = shared || p.nick || randomNick();
    const avatar = p.avatar && AV && AV.byId[p.avatar] ? p.avatar : (AV ? 'cat' : null);
    if (nick !== p.nick || avatar !== p.avatar) writeJSON(PROFILE_KEY, { nick, avatar });
    return { nick, avatar };
  }
  let profile = loadProfile();
  // 把我的名字 / 头像套到这一局（存档里记的是旧的也换成现在的）
  function applyProfile() {
    if (!game || game.tutorial) return;
    game.bots[0] = { nick: profile.nick, avatar: profile.avatar };
    if (els.me) { els.me.innerHTML = ''; renderSeat(0); }
  }
  function showProfile() {
    if (!AV) return;
    let pick = profile.avatar;
    openDialog('<h2>名字和头像</h2><div class="zm-field-label">名字（删空 = 随机起一个）</div>' +
      '<input class="zm-input" data-nick maxlength="12" autocomplete="nickname" value="' + esc(profile.nick) + '">' +
      '<div class="zm-field-label">头像</div><div class="zm-av-grid" role="group">' +
      AV.HUMAN.map((a) => '<button type="button" class="zm-av-pick" data-av="' + a.id + '" aria-label="' + esc(a.name) + '" aria-pressed="' + (a.id === pick) + '">' + a.svg + '</button>').join('') +
      '</div><p class="zm-muted zm-err" data-err hidden></p>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>取消</button><button type="button" class="zm-btn zm-btn-primary" data-save data-focus>保存</button></div>', (d) => {
      const err = d.querySelector('[data-err]'), nickIn = d.querySelector('[data-nick]');
      d.querySelector('[data-cancel]').addEventListener('click', closeDialog);
      d.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => {
        pick = b.dataset.av;
        d.querySelectorAll('[data-av]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        fx.pop(b, { scale: 1.12, dur: 220 });
      }));
      d.querySelector('[data-save]').addEventListener('click', () => {
        const v = nickIn.value.trim();
        if (v && ([...v].length > 12 || /[<>&"'/\\]/.test(v))) { err.textContent = '名字最多 12 个字，不能有特殊符号'; err.hidden = false; nickIn.focus(); return; }
        const I = ident();
        if (v) { if (I && I.setNick) I.setNick(v); } else if (I && I.clearNick) I.clearNick();
        profile = { nick: v || randomNick(), avatar: pick };
        writeJSON(PROFILE_KEY, profile);
        closeDialog();
        applyProfile();
        save();
        if (online) onlineAct('profile', { nick: v, avatar: pick });
      });
    });
  }

  function drawBots(n) {
    const names = AV ? AV.BOT_NICKS.slice() : ['阿尔法', '贝塔', '伽马', '德尔塔'];
    const faces = AV ? AV.ROBOT.map((x) => x.id) : [];
    const take = (arr) => arr.length ? arr.splice((Math.random() * arr.length) | 0, 1)[0] : null;
    const out = [{ nick: profile.nick, avatar: profile.avatar }];
    // 机器猫头像只有几种：人多时用完一轮再来一轮（名字不重）
    let pool = faces.slice();
    for (let i = 1; i < n; i++) { if (!pool.length) pool = faces.slice(); out.push({ nick: take(names), avatar: pool.length ? take(pool) : null }); }
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
  const POP = () => Math.min(U() * 1.3, 120);   // 弹出来看的牌（窥探 / 改命 / 抽牌 / 捡弃牌 / 点名）统一的大号，和 CSS 的 --pop 一致
  const PU = () => U() * 0.92;     // 牌堆 / 弃牌堆的牌宽
  const SU = () => PU() * 1.15;    // 刚出的牌（压在弃牌堆上）的牌宽

  /* ───── 显示层 ───── */
  function stageIdsOf(s) { return s.phase === 'react' && s.pending ? s.pending.cards.concat(s.pending.nopes.map((x) => x.card)) : []; }
  function liveDisplay() {
    const s = game.state;
    const onStage = stageIdsOf(s);
    return {
      counts: s.hands.map((h) => h.length), hand: game.hideHand ? [] : s.alive[0] ? s.hands[0].slice() : (viewSeat > 0 && s.alive[viewSeat] ? s.hands[viewSeat].slice() : []),
      deckSize: s.deck.length, lifted: s.phase === 'alter' && s.alter ? s.alter.cards.length : 0, kittens: R.kittensInDeck(s),   // 重排时那几张正举在牌堆上方（数字照旧）
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
    layoutOpps();
  }

  /* ───── 座位 ───── */
  // 轮到谁（照拱猪）：头像描一圈朱红、外面一道淡光；限时的话外圈一道红环顺时针收走，最后 5 秒头像跳
  const CLOCK_SVG = '<svg class="zm-clock" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" pathLength="100"/></svg>';
  function seatOrder() { const out = []; for (let s = game.state.n - 1; s >= 1; s--) out.push(s); return out; }
  function seatEl(seat) { return seat === 0 ? els.me : els.opps.querySelector('[data-seat="' + seat + '"]'); }
  function avEl(seat) { const s = seatEl(seat); return s && s.querySelector('.zm-av'); }
  /* 游戏框（牌桌的双线裱框，内线缩进 6px）左右能放东西的范围：飞出来的扇面 / 点名牌都别越过内线（2026-11-13 用户：最左 / 最右那家手牌多时扇面出框）。
   * 以前按整个窗口算，手机上贴着边、电脑上桌子居中时更是直接跑到框外 */
  function frameX(pad) { const r = (els.table || els.app).getBoundingClientRect(); const p = 6 + (pad == null ? 8 : pad); return { l: r.left + p, r: r.right - p }; }
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
    layoutOpps();
  }
  /* 6–9 人（对手 5–8 家）：还是一排，但排成一道往下弯的弧（两头低、中间高，像围着桌子坐），头像跟着屏幕宽度缩小；
   * 角标（手牌数 / 还要摸几回合）挪到头像右上 / 右下角，免得挤到旁边那家 */
  function layoutOpps() {
    const m = game && game.state ? game.state.n - 1 : 0;
    const arc = m >= 5;
    els.opps.classList.toggle('is-arc', arc);
    if (!arc) { els.opps.style.removeProperty('--av-o'); els.opps.style.removeProperty('--arc'); renderDir(); return; }
    const W = els.opps.clientWidth || els.table.clientWidth || innerWidth;
    const per = W / m;
    const av = Math.max(30, Math.min(46, Math.floor(per - 16)));
    const A = Math.round(Math.min(34, av * 0.75));
    els.opps.style.setProperty('--av-o', av + 'px');
    els.opps.style.setProperty('--arc', A + 'px');
    Array.from(els.opps.children).forEach((b, j) => {
      const t = m > 1 ? (j - (m - 1) / 2) / ((m - 1) / 2) : 0;
      b.style.setProperty('--dy', (A * t * t).toFixed(1) + 'px');
    });
    renderDir();
  }
  /* 出牌方向（2026-11-13 用户挑甲、去掉屏幕两边那两个）：相邻两个对手之间一个淡金小箭头，指向下一个出牌的人；打出「转向」全部掉头。
   * 只有对手 ≥ 2 家才有（两个人玩方向无所谓）。箭头落在两人名字之间的空里（弧形排布时头像小，箭头也跟着小） */
  function dirNow() { return game && game.state && game.state.dir === -1 ? -1 : 1; }
  /* 箭头的流动感（2026-11-13 用户挑定丙 · 三连跑马灯）：每个箭头是三道细箭（›››），三道依次点亮往前跑，箭头之间顺着出牌方向接力；
   * 指向当前出牌的人的那个箭头变朱红（和他头像的红圈呼应），轮到谁红箭头就跟着挪过去 */
  const DIR3_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5l5 5-5 5"/><path d="M8 5l5 5-5 5"/><path d="M13.5 5l5 5-5 5"/></g></svg>';
  function renderDir() {
    if (!els.dir) { els.dir = document.createElement('div'); els.dir.setAttribute('aria-hidden', 'true'); els.table.appendChild(els.dir); }
    els.dir.className = 'zm-dir';
    const n = game && game.state ? game.state.n : 0;
    if (n < 3 || !els.opps.children.length) { els.dir.innerHTML = ''; return; }
    if (els.dir.children.length !== n - 2) els.dir.innerHTML = Array.from({ length: n - 2 }, () => '<i>' + DIR3_SVG + '</i>').join('');
    els.dir.style.setProperty('--cyc', Math.max(2.6, (n - 2) * 0.18 + 1.8).toFixed(2) + 's');
    placeDir();
    // 座位刚建好 / 刚排成弧 / 名字刚换时量到的位置可能还是旧的（8 人局箭头全在一条水平线上、两头的座位却已经往下沉了）：
    // 下一帧再量一遍，箭头稳稳落在名字上
    cancelAnimationFrame(dirRaf);
    dirRaf = requestAnimationFrame(() => { dirRaf = requestAnimationFrame(placeDir); });
    dirHot();
  }
  let dirRaf = 0;
  function placeDir() {
    if (!els.dir || !game || !game.state) return;
    const n = game.state.n;
    if (els.dir.children.length !== n - 2) return;
    const tb = els.table.getBoundingClientRect(), d = dirNow();
    // 2026-11-13 用户 8 人局：箭头没把名字串起来——以前按两个头像中心往下挪一截，人多头像小时落在名字和「高手」签之间。
    // 现在按名字摆：在两个名字之间的空隙正中、和名字一样高，顺着两个名字的连线歪；空隙窄就缩小
    const nameOf = (seat) => { const se = seatEl(seat); return se && (se.querySelector('.zm-name') || se.querySelector('.zm-av')); };
    Array.from(els.dir.children).forEach((el, k) => {
      const a = nameOf(k + 1), b = nameOf(k + 2);
      if (!a || !b) return;
      const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
      const ax = A.left + A.width / 2, ay = A.top + A.height / 2, bx = B.left + B.width / 2, by = B.top + B.height / 2;
      const L = ax < bx ? A : B, Rr = ax < bx ? B : A;
      const gap = Rr.left - L.right;
      const avw = avEl(k + 1) ? avEl(k + 1).getBoundingClientRect().width : 40;
      const sz = Math.max(10, Math.min(20, Math.round(avw * 0.46), Math.round(gap - 2)));
      const base = Math.atan2(by - ay, bx - ax);   // 座位号往上走 = 从 k+1 指向 k+2；反过来（d = -1）就掉头
      const j = d === -1 ? n - 3 - k : k;          // 流光的先后：顺着出牌方向排
      const cx = (L.right + Rr.left) / 2, cy = (ay + by) / 2;
      el.style.cssText = 'left:' + (cx - tb.left).toFixed(1) + 'px;top:' + (cy - tb.top).toFixed(1) + 'px;width:' + sz + 'px;height:' + sz + 'px;' +
        'transform:translate(-50%,-50%) rotate(' + (base + (d === -1 ? Math.PI : 0)).toFixed(4) + 'rad);--j:' + j;
      el.dataset.base = base;
    });
    rimRender();
  }
  /* ───── 预览中 · 桌沿（#zmApp data-uiv-rim="1"，2026-11-13 用户提的想法）─────
   * 一条细金线绕牌桌一圈：对手一排下面 → 右边往下 → 我头像上方 → 左边往上，所有人（包括我）都在这一圈上。
   * 平时：淡金线，一点柔光顺着出牌方向慢慢绕。指人时：从出牌人那点起，一截亮金沿桌沿（走近的那边）长到被指的人，到了那儿亮一圈；
   * 结算后（抽到牌 / 给了牌 / 被作废……）这截从被指的人那头缩回出牌人，淡回平时。 */
  const RIM_STEP = 5;
  function rimGeom() {
    const n = game && game.state ? game.state.n : 0;
    if (n < 2 || !avEl(0)) return null;
    for (let i = 1; i < n; i++) if (!seatEl(i)) return null;   // 座位还没建好
    const tb = els.table.getBoundingClientRect(), W = tb.width;
    const anchor = (seat) => {
      if (seat === 0) { const r = avEl(0).getBoundingClientRect(); return { x: r.left + r.width / 2 - tb.left, y: r.top - 9 - tb.top }; }
      const r = seatEl(seat).getBoundingClientRect(); return { x: r.left + r.width / 2 - tb.left, y: r.bottom + 6 - tb.top };
    };
    const opp = []; for (let i = 1; i < n; i++) opp.push(anchor(i));
    opp.sort((a, b) => b.x - a.x);   // 右 → 左
    const me = anchor(0), m = 16, R = 26, yb = me.y;
    const top = opp.length ? opp : [{ x: W / 2, y: 120 }];
    const yR = top[0].y, yL = top[top.length - 1].y;
    // 一圈：我 → 右下角 → 右边往上 → 沿对手一排（右→左）→ 左边往下 → 左下角 → 回到我
    let d = 'M' + me.x.toFixed(1) + ' ' + yb.toFixed(1) + 'L' + (W - m - R).toFixed(1) + ' ' + yb.toFixed(1) + 'Q' + (W - m) + ' ' + yb.toFixed(1) + ' ' + (W - m) + ' ' + (yb - R).toFixed(1) +
      'L' + (W - m) + ' ' + (yR + R).toFixed(1) + 'Q' + (W - m) + ' ' + yR.toFixed(1) + ' ' + (W - m - R).toFixed(1) + ' ' + yR.toFixed(1);
    let prev = { x: W - m - R, y: yR };
    for (let i = 0; i < top.length; i++) { const c = top[i], mid = { x: (prev.x + c.x) / 2, y: (prev.y + c.y) / 2 }; d += 'Q' + prev.x.toFixed(1) + ' ' + prev.y.toFixed(1) + ' ' + mid.x.toFixed(1) + ' ' + mid.y.toFixed(1); prev = c; }
    d += 'Q' + prev.x.toFixed(1) + ' ' + prev.y.toFixed(1) + ' ' + ((prev.x + m + R) / 2).toFixed(1) + ' ' + ((prev.y + yL) / 2).toFixed(1) + 'L' + (m + R) + ' ' + yL.toFixed(1) +
      'Q' + m + ' ' + yL.toFixed(1) + ' ' + m + ' ' + (yL + R).toFixed(1) + 'L' + m + ' ' + (yb - R).toFixed(1) + 'Q' + m + ' ' + yb.toFixed(1) + ' ' + (m + R) + ' ' + yb.toFixed(1) + 'Z';
    return { d, W, H: tb.height, anchor };
  }
  function rimRender() {
    let sv = els.table.querySelector(':scope > .zm-rim');
    if (els.app.dataset.uivRim !== '1' || !game || !game.state) { if (sv) sv.remove(); return null; }
    const g = rimGeom();
    if (!g) return null;
    if (!sv) {
      sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('class', 'zm-rim');
      sv.innerHTML = '<path class="base"/><path class="drift"/><g class="links"></g>';
      els.table.insertBefore(sv, els.dir);
    }
    sv.querySelectorAll(':scope > path').forEach((p) => p.setAttribute('d', g.d));
    const base = sv.querySelector('.base'), L = base.getTotalLength();
    // 采样成一串点（每 5px 一个），连线时按点在圈上走
    const pts = []; for (let l = 0; l < L; l += RIM_STEP) { const q = base.getPointAtLength(l); pts.push({ x: q.x, y: q.y }); }
    sv._pts = pts; sv._anchor = g.anchor;
    const drift = sv.querySelector('.drift'), dir = dirNow();
    if (!drift._anim || Math.abs(drift._L - L) > 2 || drift._dir !== dir) {
      if (drift._anim) drift._anim.cancel();
      drift._L = L; drift._dir = dir;
      drift.style.strokeDasharray = '60 ' + Math.ceil(L);
      // 路径本身是逆时针（我 → 右 → 上 → 左），出牌方向 1 = 座位号往上走 = 桌上逆时针，所以 dir 1 顺着路径走、-1 倒着走
      drift._anim = fx.reduce() ? null : drift.animate(dir === 1 ? [{ strokeDashoffset: 0 }, { strokeDashoffset: -L }] : [{ strokeDashoffset: -L }, { strokeDashoffset: 0 }], { duration: 9000, iterations: Infinity, easing: 'linear' });
    }
    return sv;
  }
  function releaseRim() { if (game && game.rimLk) { game.rimLk.remove(); game.rimLk = null; } }
  function rimLink(a, b) {
    const sv = rimRender();
    if (!sv || a === b) return null;
    const pts = sv._pts, N = pts.length;
    const near = (p) => { let bi = 0, bd = Infinity; pts.forEach((q, i) => { const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (dd < bd) { bd = dd; bi = i; } }); return bi; };
    const ia = near(sv._anchor(a)), ib = near(sv._anchor(b));
    const fwd = (ib - ia + N) % N, back = (ia - ib + N) % N;
    const stepDir = fwd <= back ? 1 : -1, cnt = Math.min(fwd, back);
    const seg = []; for (let k = 0; k <= cnt; k++) seg.push(pts[(ia + stepDir * k + N) % N]);
    const d = 'M' + seg.map((q) => q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('L');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const end = seg[seg.length - 1];
    g.innerHTML = '<path class="lglow" d="' + d + '"/><path class="lline" d="' + d + '"/><circle class="lhead" r="4"/><circle class="lend" cx="' + end.x.toFixed(1) + '" cy="' + end.y.toFixed(1) + '" r="6"/>';
    sv.querySelector('.links').appendChild(g);
    const paths = g.querySelectorAll('path'), len = paths[1].getTotalLength(), head = g.querySelector('.lhead'), endDot = g.querySelector('.lend');
    paths.forEach((p) => { p.style.strokeDasharray = len + ' ' + (len + 10); p.style.strokeDashoffset = len; });
    const grow = Math.min(650, 220 + len * 0.9);
    const anims = [];
    let raf = 0, t0 = performance.now(), mode = 'grow', from = 0;
    const place = (frac) => { const q = paths[1].getPointAtLength(len * frac); head.setAttribute('cx', q.x.toFixed(1)); head.setAttribute('cy', q.y.toFixed(1)); paths.forEach((p) => { p.style.strokeDashoffset = (len * (1 - frac)).toFixed(1); }); };
    const loop = (now) => {
      const k = Math.min(1, (now - t0) / (mode === 'grow' ? grow : Math.min(480, 180 + len * 0.6)));
      const e = mode === 'grow' ? 1 - Math.pow(1 - k, 3) : k * k;
      place(mode === 'grow' ? e : from * (1 - e));
      if (k < 1) raf = requestAnimationFrame(loop);
      else if (mode === 'grow') { endDot.classList.add('is-on'); }
      else g.remove();
    };
    if (fx.reduce()) { place(1); endDot.classList.add('is-on'); } else raf = requestAnimationFrame(loop);
    return {
      remove() {   // 从被指的人那头缩回出牌人
        cancelAnimationFrame(raf);
        endDot.classList.remove('is-on');
        if (fx.reduce()) { g.remove(); return; }
        const cur = 1 - parseFloat(paths[1].style.strokeDashoffset || 0) / len;
        mode = 'back'; from = cur; t0 = performance.now(); raf = requestAnimationFrame(loop);
        void anims;
      },
    };
  }
  /* 指向当前出牌的人的那个箭头标红：顺时针（d = 1）是从 t-1 指向 t 的那个（第 t-2 个），反过来是从 t+1 指向 t 的那个（第 t-1 个） */
  function dirHot() {
    if (!els.dir) return;
    const list = els.dir.children, st = game && game.state;
    if (!list.length || !st) return;
    const t = st.phase === 'over' ? -1 : D().turn, d = dirNow();
    const k = t < 0 ? -1 : d === -1 ? t - 1 : t - 2;
    Array.from(list).forEach((el, i) => el.classList.toggle('is-hot', i === k));
  }
  /* 打出转向：箭头从出牌人那边起，一个接一个转半圈掉头 */
  async function animReverse(e, t) {
    if (!els.dir || !els.dir.children.length) return;
    snd('flip');
    const list = Array.from(els.dir.children), d = e.dir === -1 ? -1 : 1;
    const order = e.seat >= 1 && e.seat <= list.length ? list.map((_, k) => k).sort((x, y) => Math.abs(x + 1.5 - e.seat) - Math.abs(y + 1.5 - e.seat)) : list.map((_, k) => k);
    const anims = order.map((k, i) => {
      const el = list[k], to = +el.dataset.base + (d === -1 ? Math.PI : 0), ang = to - Math.PI;   // 从旧方向转半圈到新方向
      if (fx.reduce()) { el.style.transform = 'translate(-50%,-50%) rotate(' + to + 'rad)'; return null; }
      return el.animate([
        { transform: 'translate(-50%,-50%) rotate(' + ang + 'rad) scale(1)', color: '' },
        { transform: 'translate(-50%,-50%) rotate(' + (ang + (to - ang) / 2) + 'rad) scale(1.6)', color: '#b4392c', offset: 0.5 },
        { transform: 'translate(-50%,-50%) rotate(' + to + 'rad) scale(1)' },
      ], { duration: ms(520), delay: i * ms(70), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    });
    await Promise.all(anims);
    if (t !== token) return;
    els.dir.querySelectorAll('i').forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    renderDir();
  }
  function renderSeat(seat) {
    const s = game.state, d = D(), box = seatEl(seat);
    if (!box) return;
    const out = !d.alive[seat];
    const turn = !out && s.phase !== 'over' && d.turn === seat;
    box.classList.toggle('is-out', out);
    box.classList.toggle('is-turn', turn);
    if (turn) dirHot();
    // 结构只建一次：头像 / 名字不重画（动画要拿稳定的元素），只改数字和标记
    if (!box.querySelector('.zm-av')) {
      const tier = seat !== 0 && !game.tutorial ? '<span class="zm-tier"' + (game.tiers[seat] || (game.tags && game.tags[seat]) ? '' : ' hidden') + '></span>' : '';
      box.innerHTML = '<div class="zm-av"><span class="zm-av-face">' + avatarHtml(seat) + '</span>' + CLOCK_SVG + '</div>' +
        '<span class="zm-name">' + esc(nameOf(seat)) + '</span>' + tier;
    }
    const tg = box.querySelector('.zm-tier');
    if (tg) { const txt = (game.tags && game.tags[seat]) || (game.tiers[seat] ? AI.TIER_NAMES[game.tiers[seat]] : ''); tg.textContent = txt; tg.hidden = !txt; }
    const av = box.querySelector('.zm-av');
    setBadge(av, 'zm-count', seat !== 0 && !out ? String(d.counts[seat]) : '');
    setBadge(av, 'zm-turns', turn && (d.turnsLeft > 1 || game.attackSeat === seat) ? '×' + d.turnsLeft : '');
  }
  // 角标：数字变了就弹一下
  function setBadge(av, cls, text) {
    let b = av.querySelector('.' + cls);
    if (!text) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = cls; av.appendChild(b); b.textContent = text; fx.pop(b, { scale: 1.35 }); return; }
    if (b.textContent !== text) { b.textContent = text; fx.pop(b, { scale: 1.3, dur: 300 }); }
  }
  function renderSeats() { for (let i = 0; i < game.state.n; i++) renderSeat(i); renderDir(); }

  function bubble(seat, text, o) {
    o = Object.assign({ ms: 1700, loud: false, think: false }, o);
    const box = seatEl(seat);
    if (!box) return null;
    box.querySelectorAll('.zm-bubble').forEach((b) => b.remove());
    const b = document.createElement('span');
    b.className = 'zm-bubble' + (o.loud ? ' is-loud' : '') + (o.alarm ? ' is-alarm' : '') + (o.think ? ' is-think' : '');
    if (o.think) b.innerHTML = '<i></i><i></i><i></i>';
    else if (o.icon) { b.classList.add('is-icon'); b.innerHTML = ART.icon(o.icon); }   // 只冒一个牌的图标，不写字
    else b.textContent = text;
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
    renderDeck(Math.max(0, d.deckSize - (d.lifted || 0)));
    els.deck.classList.toggle('no-count', !d.deckSize);
    els.deckCount.textContent = d.deckSize;
    if (lastDeck >= 0 && lastDeck !== d.deckSize) fx.pop(els.deckCount, { scale: 1.25, dur: 260 });
    lastDeck = d.deckSize;
    els.kit.innerHTML = (d.kittens || d.deckSize) ? '<span class="sep">/</span>' + ART.icon('boom') + '<span>' + d.kittens + '</span>' : '';
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
    const note = !hand.length ? watchNote() : '';
    els.hand.innerHTML = (note ? '<p class="zm-hand-note">' + esc(note) + '</p>' : '') + hand.map((id) => cardHtml(id,
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
  // landed = 飞过来的那张落地时的位置：手牌这期间要是挪了位（又来了张牌、窗口变了），从落地处滑过去，不再一下跳过去
  function revealHandCard(id, landed) {
    handHidden.delete(id);
    const c = handCard(id);
    if (!c) return;
    c.classList.remove('is-incoming');
    if (fx.reduce()) return;
    const r = c.getBoundingClientRect();
    const dx = landed ? (landed.left + landed.width / 2) - (r.left + r.width / 2) : 0, dy = landed ? (landed.top + landed.height / 2) - (r.top + r.height / 2) : 0;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
      c.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.25,.8,.35,1)', composite: 'add' });
    } else {
      c.animate([{ transform: 'translateY(-8px) scale(1.06)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,.8,.4,1.3)', composite: 'add' });
    }
  }
  // 飞进手里的牌先落到牌槽正上方（整张都在手牌那一排上面），再从上面滑进牌槽——滑的时候已经在手牌那一层里，左右邻牌的前后关系自然
  const aboveSlot = (r) => ({ left: r.left, top: r.top - r.height * 1.05, width: r.width, height: r.height, right: r.right, bottom: r.bottom - r.height * 1.05 });
  function dropFromHand(ids) { if (!ov) return; ov.hand = ov.hand.filter((x) => ids.indexOf(x) < 0); selected = selected.filter((x) => ids.indexOf(x) < 0); }

  /* ───── 按钮带 ───── */
  function myTurnToAct() { const s = game.state; return !busy && s.phase === 'act' && s.turn === 0 && s.alive[0]; }
  let lastPlayOn = false;
  // 按钮带（正中间）：「出牌」「摸牌」两个键一直在；没选牌 / 选的凑不成能出的 →「出牌」灰着。不写说明字（教程里教）。
  // 别人出牌后我有「不行」：紫色「喵？不行」顶在「出牌」的位置；点人时「摸牌」换成「取消」；别人索要我的牌时「出牌」换成「给牌」
  function renderBand() {
    const s = game.state;
    const canNope = s.phase === 'react' && reactOpen && R.canNope(s, 0);
    const onlinePass = !!(game.online && s.phase === 'react' && reactOpen);   // 联机：每次出牌都有导火索，没「作废」也能点「取消」提前结束
    els.nopeBtn.hidden = !canNope;
    els.cancelBtn.hidden = mode !== 'target';
    els.playBtn.hidden = false; els.drawBtn.hidden = false;
    els.playBtn.disabled = true; els.drawBtn.disabled = true;
    els.playBtn.textContent = '出牌'; els.drawBtn.textContent = '摸牌';
    els.drawBtn.classList.remove('is-ready');
    if (s.phase === 'over') { els.playBtn.hidden = true; els.drawBtn.hidden = true; }
    else if (game.dealing) { /* 发牌中：两个键都灰着 */ }
    else if (game.online && (!s.alive[0] || game.spectator)) { els.playBtn.hidden = true; els.drawBtn.hidden = true; }
    else if (!s.alive[0] && !game.fastOut) { els.playBtn.hidden = true; els.drawBtn.hidden = true; }   // 炸毛的动画还没播完：先别露「下一局」（不然一摸牌就知道自己出局了）
    else if (!s.alive[0]) { els.playBtn.hidden = true; els.drawBtn.disabled = false; els.drawBtn.textContent = '下一局'; }
    else if (autopilot) { els.playBtn.hidden = true; els.drawBtn.disabled = false; els.drawBtn.textContent = '取消托管'; }   // 我出局了：自动接着看他们打完，想走就开下一局
    else if (mode === 'target') { els.drawBtn.hidden = true; }
    else if (mode === 'give') { els.playBtn.textContent = '给牌'; els.playBtn.disabled = selected.length !== 1; }
    else if (canNope || onlinePass) { els.playBtn.hidden = true; els.drawBtn.disabled = false; els.drawBtn.textContent = '取消'; }
    else if (myTurnToAct()) {
      els.drawBtn.disabled = false;
      els.drawBtn.classList.toggle('is-ready', !selected.length);
      const c = selected.length ? R.classify(selected) : null;
      els.playBtn.disabled = !(c && (!c.needsTarget || R.validTargets(s, 0, c.type).length));
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
    const named = p.type === 'triple' && p.named ? '<div class="zm-stage-named">' + cardHtml(p.named) + '</div>' : '';   // 先摆上桌、还没点名时没有这张
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
  /* 被抽牌 / 被点名要牌的人（2026-11-13 用户：只亮出牌人的头像，人一多看不出在抽谁）：头像一圈金光一明一暗，直到牌拿走 / 落空 */
  function markVictim(seat) {
    document.querySelectorAll('.zm-seat.is-victim').forEach((b) => b.classList.remove('is-victim'));
    const b = seat >= 0 && game ? seatEl(seat) : null;
    if (b) b.classList.add('is-victim');
  }
  // 抽牌前「想一下」多久：只剩一张没得挑，不用红光游走，停一下就抽
  const stealThink = (count) => (count <= 1 ? ms(250) : pace().bot + ms(700));
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
    // 不盖「作废 / 生效」章：被作废的那几张变灰，又被顶回来就复原
    const cancelled = count % 2 === 1;
    els.stage.classList.toggle('is-cancelled', cancelled);
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
  function clearStage(keepRim) {
    stopFuse();
    if (!keepRim) releaseRim();
    if (game && game.arrow) { game.arrow.remove(); game.arrow = null; }
    setActing(-1);
    markVictim(-1);
    els.stage.innerHTML = '';
    els.stage.classList.remove('is-cancelled');
  }

  /* ───── 出牌限时（照拱猪）─────
   * 轮到谁，谁头像外一道红环顺时针收走；最后 5 秒头像跳、轮到我时每秒一声。我超时 = 自动摸一张（被蹭牌时 = 机器猫替我挑一张给）。
   * 弹窗 / 菜单开着时停表；教程不计时。设置里可改「不限时」 */
  const HURRY_MS = 5000;
  const clock = { seat: -1, left: 0, at: 0, onTimeout: null, paused: false, t1: 0, t2: 0, tk: 0 };
  const turnSec = () => (game && game.online ? (game.turnSec | 0) : (settings.turnSec | 0));   // 联机按房主定的
  function startClock(seat, onTimeout, totalMs) {
    stopClock();
    if (!game || game.tutorial) return;
    const total = totalMs != null ? totalMs : turnSec() * 1000, el = seatEl(seat);   // 联机传服务器上还剩多久
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
  // 超时：先替我摸一张（被蹭牌时机器猫替我挑一张给）；连着第二回合还超时 → 进托管，之后每步按机器猫自己的判断走
  function onMyTimeout() {
    if (!game || busy || game.online) return;   // 联机超时由服务器处理
    const s = game.state;
    if (mode === 'target') cancelTarget();
    selected = [];
    timeouts += 1;
    autoAct = true;
    if (s.phase === 'act' && s.turn === 0) { renderHand(); apply(0, { type: 'draw' }); }
    else if (s.phase === 'give' && s.give.from === 0) { mode = null; renderHand(); apply(0, decideBot(0)); }
    if (timeouts >= 2) setAutopilot(true);   // 第二回合还超时：这一下照样摸，之后进托管
  }
  const myTier = () => settings.tier || 'normal';
  function canAuto() { return !!(game && !game.tutorial && !game.spectator && game.state.alive[0] && game.state.phase !== 'over'); }
  function setAutopilot(on) {
    if (game && game.online) { onlineAuto(!!on); return; }
    on = !!on && canAuto();
    if (autopilot === on) return;
    autopilot = on;
    if (!on) timeouts = 0;
    els.me.classList.toggle('is-auto', on);
    snd(on ? 'tick' : 'tap');
    if (on) {
      if (mode === 'target') cancelTarget();
      selected = []; mode = null;
      if (!els.mask.hidden && (els.dialog.querySelector('[data-range]') || els.dialog.querySelector('.zm-grid') || els.dialog.querySelector('[data-alter]') || els.dialog.querySelector('[data-steal]'))) closeDialog();
      // 正等着我（没在播动画）→ 马上交给机器猫
      if (!busy || game.state.phase === 'react') step();
      else renderBand();
    } else if (!busy) step();
    else renderBand();
  }
  // 托管时轮到我：照机器猫的判断走（不是死摸牌）
  function autoMove() {
    if (game.state.phase === 'steal') { if (game.wander) game.wander.cancel(); game.wander = startWander(game.state.steal.from, game.state.steal.perm.length); }
    schedule(game.state.phase === 'steal' ? stealThink(game.state.steal.perm.length) : pace().bot, () => {
      if (!game) return;
      if (!autopilot) { if (game.wander) { game.wander.cancel(); game.wander = null; } step(); return; }   // 排着的这一步还没走就取消托管了：把操作还给我
      autoAct = true;
      apply(0, AI.decide(game.state, 0, myTier()));
    });
  }

  /* 背景音乐的场景：'menu' 主页 / 设置（丁）| 'game' 一局（甲起，紧张了换乙 / 丙）| 'end' 一局结束淡出。见 zhamao-music.js */
  function bgm(scene) { const A = window.ZhamaoAudio; if (!A) return; A.scene(scene); if (scene !== 'end') A.music(true); }

  // 弹窗限时：单机按设置；联机按服务器上这一步还剩多久
  function dlgLimit() {
    if (!game || game.tutorial) return 0;
    if (game.online) return onlineRemain();
    return turnSec() > 0 ? turnSec() * 1000 : 0;
  }

  /* ───── 流程 ───── */
  const wait = (t) => new Promise((r) => setTimeout(r, fx.reduce() ? 1 : t));
  function schedule(t, fn) { const k = token; setTimeout(() => { if (k === token) fn(); }, t); }
  function renderAll() { renderSeats(); renderPiles(); renderHand(); renderBand(); refreshTools(); }

  function step() {
    if (!game) return;
    if (game.online) { onlineIdle(); return; }   // 联机：谁走下一步由服务器说了算
    const s = game.state;
    save();
    clearReactTimer();
    reactOpen = false;
    release();
    renderAll();
    if (tut && !coachQueue) hint('');
    if (s.phase === 'over') { finish(); return; }
    if (window.ZhamaoAudio && s.deck.length) window.ZhamaoAudio.danger(R.kittensInDeck(s) / s.deck.length);   // 背景音乐按公开的炸毛猫概率换版
    if (s.phase === 'act') startClock(s.turn, s.turn === 0 && !autopilot ? onMyTimeout : null);
    else if (s.phase === 'give' && s.give.from === 0 && !autopilot) startClock(0, onMyTimeout);
    else stopClock();
    // 托管：轮到我做决定的地方都交给机器猫
    if (autopilot && canAuto() && R.whoActs(s).indexOf(0) >= 0 && s.phase !== 'react') { busy = true; mode = null; renderBand(); autoMove(); return; }
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
      case 'steal':
        if (s.steal.by === 0) { busy = false; stealPicker(); }
        else {
          // 机器猫在挑：红光先在被偷的人的牌上游走，想好了（apply）再落下去
          const by = s.steal.by;
          if (game.wander) game.wander.cancel();
          game.wander = startWander(s.steal.from, s.steal.perm.length);
          schedule(stealThink(s.steal.perm.length), () => apply(by, decideBot(by)));
        }
        break;
      case 'alter':
        if (s.alter.by === 0) { busy = false; alterDialog(); }
        else schedule(pace().bot, () => apply(s.alter.by, decideBot(s.alter.by)));
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
    if (game.online) { if (seat === 0) onlineMove(d); return; }   // 联机：发给服务器，等它把事件推回来再播
    const s = game.state, t = token;
    busy = true;
    stopClock();
    if (seat === 0) { if (!autoAct) timeouts = 0; autoAct = false; }
    const rects = captureSources(seat, d);
    snapshot();
    let ev;
    try {
      if (d.type === 'draw') ev = R.draw(s, seat);
      else if (d.type === 'play') ev = R.play(s, seat, d.cards, d);
      else if (d.type === 'give') ev = R.give(s, seat, d.card);
      else if (d.type === 'pick') ev = R.pickDiscard(s, seat, d.card);
      else if (d.type === 'insert') ev = R.insertKitten(s, seat, d.pos);
      else if (d.type === 'alter') ev = R.alterTop(s, seat, d.order);
      else if (d.type === 'steal') ev = R.stealPick(s, seat, d.idx);
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
    if (d.type === 'play' && game.previewSrc) { const p = game.previewSrc; game.previewSrc = null; return p; }   // 先摆到桌上的那几张：从桌上接着演
    const ids = d.type === 'play' ? d.cards : d.type === 'give' ? [d.card] : [];
    for (const id of ids) { const c = handCard(id); if (c) m[id] = c.getBoundingClientRect(); }
    return m;
  }
  function afterEvents(ev) {
    if (tut && tut.after) {
      const msgs = tut.after(ev, game.state);
      if (tut.done) { showCoach(msgs && msgs.length ? msgs : ['做到了！'], lessonDone); return; }   // 小关卡：这一关的事做完了
      if (msgs && msgs.length) { showCoach(msgs, step); return; }
    }
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
      case 'reverse': return animReverse(e, t);
      case 'shuffle': return animShuffle(e, t);
      case 'future': return animFuture(e, t);
      case 'alter': return animAlterLift(e, t);
      case 'altered': return animAltered(e, t);
      case 'askGive': return animAskGive(e, t);
      case 'give': return animTransfer(e, t, 'give');
      case 'steal': return animSteal(e, t);
      case 'swap': return animSwap(e, t);
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
      // 联机里我出的牌已经先飞上桌摆好了（乐观出牌 / 先摆上桌再选人）：服务器回话后别再从原地「飞」一遍——
      // 以前会带着 90px 的弧线原地蹦一下，看着像动画重播了一次（2026-11-13 用户：牌落定后好像重复了一下、卡一下）
      if (mine && Math.hypot(src[id].left + src[id].width / 2 - (to.left + to.width / 2), src[id].top + src[id].height / 2 - (to.top + to.height / 2)) < 6) {
        target.classList.remove('is-incoming');
        return Promise.resolve();
      }
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
    if (tg >= 0) {
      game.arrow = aim(tg, p.type === R.FAVOR ? '#e0566e' : p.type === R.ATTACK || p.type === R.TATTACK ? '#c0742e' : p.type === R.SWAP ? '#2f8a83' : '#c9a96e');
      releaseRim();
      if (p.type !== R.ATTACK) game.rimLk = rimLink(p.by, tg);   // 桌沿连线单独记着：等牌真的拿到 / 给到 / 换完才缩回（不跟准星一起收）
    }
    await mimic(p.cards, t);   // 万能猫顶了谁：演完、停一下再往下走（只有组合里有万能猫时才多这一下）
    if (t !== token) return;
    const named = els.stage.querySelector('.zm-stage-named');
    if (named && !fx.reduce()) named.animate([{ transform: 'scale(.2) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }

  /* 万能猫上桌：它顶的是哪只猫（对子 / 三张 = 同组里那只真猫；五种各一张 = 缺的那几种按顺序分）。两张都是万能猫就不顶谁 */
  function mimicKinds(cards) {
    const K = R.KIND_OF, kinds = cards.map((id) => K[id]);
    if (!kinds.some((k) => k === R.WILD) || !kinds.every(R.catLike)) return {};
    const real = kinds.filter((k) => k !== R.WILD), out = {};
    if (cards.length === 5) {
      const miss = R.CATS.filter((c) => real.indexOf(c) < 0);
      cards.forEach((id) => { if (K[id] === R.WILD) out[id] = miss.shift(); });
    } else if (real.length) cards.forEach((id) => { if (K[id] === R.WILD) out[id] = real[0]; });
    return out;
  }
  /* 万能猫变身（2026-11-13 用户挑定甲）：万能猫的画一道流光扫过、变成它顶的那只猫，名字条照旧五彩、名字换成那只猫。
   * 只在桌上这样，进弃牌堆就还是万能猫 */
  async function mimic(cards, t) {
    const map = mimicKinds(cards);
    const ids = Object.keys(map).map(Number);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], k = map[id], el = stageCard(id);
      if (!k || !el) continue;
      await wait(ms(i ? 140 : 260));
      if (t !== token) return;
      const r = el.getBoundingClientRect();
      const art = el.querySelector('.zm-art');
      const nw = document.createElement('div');
      nw.className = 'zm-art zm-mimic-art';
      nw.style.setProperty('--bg', ART.TONE[k].bg);
      nw.innerHTML = ART.face(k) + '<i class="zm-mimic-sweep"></i>';
      art.after(nw);
      el.classList.add('is-mimic');
      if (!fx.reduce()) nw.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: ms(520), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
      setTimeout(() => { if (t === token) el.querySelector('.zm-nm').textContent = R.NAMES[k]; }, ms(300));
      snd('ding');
      fx.burst(r.left + r.width / 2, r.top + r.height * 0.4, { n: 10, shapes: ['star', 'dot'], colors: ['#e0893e', '#d4607e', '#8a63a8', '#2f8a83', '#c9a24a'], radius: 46, size: [4, 10], life: 700 });
    }
    if (ids.length) await wait(ms(900));
  }

  /* 不行：出牌人喊一嗓子；牌从高处拍下来压在原来那张上，舞台一震、紫色冲击波；
   * 立刻盖章当前结果（单数=作废、双数=生效），原牌跟着变灰 / 复原 */
  async function animNope(e, t) {
    setActing(e.seat);
    snd('nope');
    bubble(e.seat, '', { icon: 'nope', loud: true, ms: 1400 });
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
    if (e.cancelled || (e.type !== R.FAVOR && e.type !== R.SWAP && e.type !== 'pair' && e.type !== 'triple')) releaseRim();
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
    setTimeout(() => { if (t === token) clearStage(true); }, 170);   // 桌沿连线留着：等牌真的拿到 / 给到再缩回
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
      await atkPots(prevTurn >= 0 ? prevTurn : R.nextAlive(game.state, e.seat), e.seat, e.turnsLeft, t);
    }
    if (ov) { ov.turn = e.seat; ov.turnsLeft = e.turnsLeft; }
    // 被甩锅的人：轮到他的这几回合里一直挂着 ×N（剩最后一回合也挂着 ×1），轮到别人才摘
    if (e.attacked) game.attackSeat = e.seat; else if (e.seat !== game.attackSeat) game.attackSeat = -1;
    renderSeats();
    const a = avPoint(e.seat);
    fx.ring(a.x, a.y, { color: '#b4392c', size: 110, width: 3, dur: 520 });
    fx.pop(avEl(e.seat), { scale: 1.1, dur: 320 });
    if (e.seat === 0 && game.state.alive[0]) snd('turn');
    await wait(ms(e.attacked ? 260 : 140));
  }
  /* ───── 甩锅动画（2026-11-13 用户从三版里挑了甲·锅叠锅）───── */
  const avR = (seat) => { const a = avEl(seat); return a ? a.getBoundingClientRect().width / 2 : 24; };
  const badgePt = (seat) => { const a = avPoint(seat), r = avR(seat); return { x: a.x + r * 1.2, y: a.y + r * 0.7 }; };
  // 一张写着「×N」的小牌子（印章红）
  function tag(text, cls) {
    const el = document.createElement('div');
    el.className = 'zm-stackcount' + (cls ? ' ' + cls : '');
    el.innerHTML = text;
    els.fly.appendChild(el);
    return el;
  }
  const at2 = (x, y, sc, extra) => 'translate(' + (x).toFixed(1) + 'px,' + (y).toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc + ')' + (extra || '');
  /* 锅叠锅：锅砸中之后，一口口小锅从天上掉下来叠在他身上（几回合就几口，越叠越高），叠完一晃，整摞缩进 ×N 角标 */
  async function atkPots(from, to, n, t) {
    await fxPot(from, to, t);
    if (t !== token || fx.reduce()) return;
    const a = avPoint(to), r = avR(to), up = a.y > innerHeight / 2;   // 我在下面：往上叠；对手在上面：叠在头像下方
    const P = Math.max(18, Math.min(28, r * 0.9)), step = P * 0.48;
    const baseY = up ? a.y - r - P * 0.35 : a.y + r + P * 0.35 + (n - 1) * step;
    const tower = document.createElement('div');
    tower.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;';
    els.fly.appendChild(tower);
    const pots = [];
    for (let i = 0; i < n; i++) {
      if (t !== token) { tower.remove(); return; }
      const p = document.createElement('div');
      p.className = 'zm-prop';
      p.innerHTML = ART.PROPS.pot;
      p.style.width = p.style.height = P + 'px';
      tower.appendChild(p);
      pots.push(p);
      const y = baseY - i * step, rot = (i % 2 ? 6 : -6);
      p.animate([{ transform: fx.T(a.x - P / 2 + (i % 2 ? 3 : -3), y - P / 2 - 90, 0.8, rot * 3), opacity: 0 }, { transform: fx.T(a.x - P / 2, y - P / 2 + 3, 1.05, rot), opacity: 1, offset: 0.75 }, { transform: fx.T(a.x - P / 2, y - P / 2, 1, rot), opacity: 1 }],
        { duration: ms(220), easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
      setTimeout(() => { if (t === token) { snd(i === n - 1 ? 'clang' : 'tick'); fx.shake(seatEl(to), { amp: 2 + i * 0.6, dur: 160 }); } }, ms(170));
      await wait(ms(i < 2 ? 150 : 110));
    }
    await wait(ms(200));
    const lab = tag('<span class="x">×</span><b>' + n + '</b>');
    const lx = a.x + P / 2 + 20, ly = up ? baseY - (n - 1) * step / 2 : baseY - (n - 1) * step / 2;
    lab.animate([{ transform: at2(Math.min(innerWidth - 40, lx), ly, 0.3), opacity: 0 }, { transform: at2(Math.min(innerWidth - 40, lx), ly, 1.15), opacity: 1, offset: 0.6 }, { transform: at2(Math.min(innerWidth - 40, lx), ly, 1), opacity: 1 }], { duration: 260, fill: 'forwards' });
    snd('stamp');
    // 整摞晃两下
    tower.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }], { duration: ms(520), easing: 'ease-in-out' });
    tower.style.transformOrigin = a.x + 'px ' + baseY + 'px';
    await wait(ms(620));
    if (t !== token) { tower.remove(); lab.remove(); return; }
    const bp = badgePt(to);
    pots.forEach((p, i) => p.animate([{ opacity: 1 }, { transform: fx.T(bp.x - P / 2, bp.y - P / 2, 0.2, 0), opacity: 0 }], { duration: ms(260), delay: i * 25, easing: 'ease-in', fill: 'forwards' }));
    await lab.animate([{ transform: at2(Math.min(innerWidth - 40, lx), ly, 1), opacity: 1 }, { transform: at2(bp.x, bp.y, 0.3), opacity: 0 }], { duration: ms(300), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    tower.remove(); lab.remove();
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
    const cx = (a.x + b.x) / 2, cy = Math.max(S * 0.6, Math.min(a.y, b.y) - 90);   // 对手都在上面一排：弧顶别飞出屏幕
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

  /* 洗牌：整摞牌被抄起来——牌堆本身（连同厚度、影子）先藏起，一圈牌背从原处飞出、绕着转一圈再收回来，落地时牌堆重新出现、拍一下。
   * 牌堆剩得少就少转几张 */
  async function animShuffle(e, t) {
    snd('shuffle');
    const r = els.deck.getBoundingClientRect(), c = fx.center(r);
    const pu = PU(), n = Math.max(1, Math.min(9, D().deckSize)), R0 = pu * 1.25;
    els.deck.classList.add('is-shuffling');
    fx.smoke(c.x, c.y + pu * 0.4, { n: 5, spread: pu * 0.6, size: [30, 60], rise: 26, alpha: 0.6 });
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
      const u = POP();
      if (ov) { ov.lifted = (ov.lifted || 0) + e.cards.length; renderPiles(); }   // 拿起来的几张：牌堆看着薄了，数字不变（牌并没被拿走）
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
        if (game.online) setTimeout(res, 4000);   // 联机：服务器的出牌限时在走，看 4 秒自己收起
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
      if (ov) ov.lifted -= e.cards.length;
      renderPiles();
      return;
    }
    // 别人在偷看
    const a = avPoint(e.seat), dc = fx.center(r);
    const dir = { x: a.x - dc.x, y: a.y - dc.y }, len = Math.hypot(dir.x, dir.y) || 1;
    const k = Math.max(0, Math.min(3, e.count || D().deckSize));   // 牌堆不到三张就只抬起剩下那几张
    const out = [];
    for (let i = 0; i < k; i++) {
      const fan = (i - (k - 1) / 2);
      const to = { x: dc.x + dir.x / len * pu * 0.9 + fan * pu * 0.42, y: dc.y + dir.y / len * pu * 0.9 - Math.abs(fan) * 4 };
      out.push(fx.fly({ html: backHtml(), from: r, to, w: pu, s0: 1, s1: 0.86, r0: 0, r1: fan * 14, dur: ms(380), delay: i * 60, lift: 20, keep: true, land: false }));
    }
    if (ov && k) { ov.lifted = (ov.lifted || 0) + k; renderPiles(); }
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
    if (ov && k) ov.lifted -= k;
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
    const src = e.from === 0 ? (game.src && game.src[e.card]) || handRectOf(e.card) : (kind === 'steal' && game.stealFrom) || avPoint(e.from);
    game.stealFrom = null;
    if (game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    if (e.from === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.from] -= 1; renderSeat(e.from); }
    const u = U();
    let to = avPoint(e.to);
    if (e.to === 0) to = aboveSlot(reserveHandSlot(e.card));
    snd(kind === 'give' ? 'give' : 'steal');
    releaseRim();   // 牌开始飞了：桌沿那截从被指的人那头缩回出牌人
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
    if (e.to === 0) revealHandCard(e.card, to); else { ov.counts[e.to] += 1; renderSeat(e.to); fx.pop(avEl(e.to), { scale: 1.15 }); }
    markVictim(-1);
    await wait(ms(220));
  }

  /* ───── 抽牌：一道红光在被抽的人的牌之间游走 ─────
   * 被抽的是我：在我自己的手牌上游走（我看得到被抽走的是哪张）；被抽的是别人：他头像下面摊开一小扇扣着的牌，在上面游走。
   * settle(pick) 随时可以叫——机器猫想好了 / 联机里对方点了 / 超时系统替他点了：再随机跳几下、落到选中那张、亮一下；
   * 选得早就早落（不白等）。这套机制联机直接复用：收到对方的选择就 settle。 */
  function startWander(fromSeat, count) {
    let fan = null, cur = -1, timer = 0, done = false;
    markVictim(fromSeat);
    if (fromSeat !== 0) {
      const av = avEl(fromSeat), ar = av ? av.getBoundingClientRect() : { left: innerWidth / 2, top: 60, width: 40, height: 40 };
      const w = PU() * 0.6;
      fan = document.createElement('div');
      fan.className = 'zm-steal-fan';
      // 扇面中心对着他的头像，但最左 / 最右那家的扇面别伸出屏幕：整把往里挪
      // 最外面那张：中心偏出 (count-1)/2 个间距，再按它歪的角度算出旋转后的半宽（牌高 1.4 倍宽），外加红光描边
      const step = w * Math.min(0.5, 2.6 / Math.max(1, count)), th = ((count - 1) / 2) * Math.min(8, 30 / Math.max(1, count)) * Math.PI / 180;
      const half = ((count - 1) / 2) * step + (w / 2) * Math.cos(th) + (w * 0.7) * Math.sin(th) + 6;
      const fr = frameX(), cx = Math.min(Math.max(ar.left + ar.width / 2, fr.l + half), fr.r - half);
      fan.style.left = cx + 'px';
      const se = seatEl(fromSeat), sb = se ? se.getBoundingClientRect().bottom : ar.top + ar.height + 30;
      fan.style.top = (Math.max(sb, ar.top + ar.height) + 16) + 'px';   // 落在整个座位（名字、档位签）下方，不压字
      for (let i = 0; i < count; i++) {
        const off = i - (count - 1) / 2;
        const c = document.createElement('div');
        c.className = 'zm-steal-card';
        c.style.width = w + 'px';
        c.style.left = (-w / 2 + off * w * Math.min(0.5, 2.6 / Math.max(1, count))) + 'px';
        c.style.top = (Math.abs(off) * 2.5) + 'px';
        c.style.rotate = (off * Math.min(8, 30 / Math.max(1, count))) + 'deg';
        c.innerHTML = backHtml();
        fan.appendChild(c);
      }
      els.fly.appendChild(fan);
      if (!fx.reduce()) fan.animate([{ opacity: 0, transform: 'translateY(-14px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,.8,.4,1)' });
    }
    const items = () => (fromSeat === 0 ? Array.from(els.hand.querySelectorAll('.zm-card')) : fan ? Array.from(fan.children) : []);
    const mark = (i) => { items().forEach((x, j) => x.classList.toggle('is-wander', j === i)); cur = i; };
    const hop = (sound) => {
      const arr = items();
      if (!arr.length) return;
      let j = (Math.random() * arr.length) | 0;
      if (arr.length > 1 && j === cur) j = (j + 1) % arr.length;
      mark(j);
      if (sound) snd('tick');
    };
    const single = count <= 1;   // 只剩一张（2026-11-13 用户）：不游走，红光直接停在这张上，选中后停一下就抽走
    hop(false);
    if (!single) timer = setInterval(() => hop(false), 190);
    return {
      async settle(pick) {
        if (done) return null;
        clearInterval(timer);
        if (!single) for (const d of [220, 300, 420]) { if (done) return null; hop(true); await wait(ms(d)); }
        if (done) return null;
        const arr = items();
        if (!arr.length) return null;
        const i = Math.max(0, Math.min(arr.length - 1, pick(arr)));
        arr.forEach((x) => x.classList.remove('is-wander'));
        arr[i].classList.add('is-chosen');
        snd('ding');
        if (!fx.reduce()) arr[i].animate([{ scale: '1' }, { scale: '1.08', offset: 0.35 }, { scale: '1' }], { duration: 360, easing: 'ease-out' });
        await wait(ms(single ? 420 : 950));   // 停一下：让人看清抽中的是哪张（只有一张时短一点）
        return arr[i];
      },
      cancel() {
        done = true;
        clearInterval(timer);
        items().forEach((x) => x.classList.remove('is-wander', 'is-chosen'));
        if (fan) fan.remove();
      },
    };
  }
  /* 我来抽：他的手牌扣着摊开（顺序打乱过），点一张；限时到了红光游走几下替我点一张 */
  function stealPicker() {
    const s = game.state, from = s.steal.from, k = s.steal.perm.length;
    const limit = k <= 1 ? 0 : dlgLimit();   // 只剩一张：没得挑，不计时
    markVictim(from);
    // 2026-11-13 用户：不要顶上「抽 某某 一张牌」那行字；倒计时藏进底下的按钮里（按钮本来填满，时间条从右往左一点点退掉）
    openStage(
      // 扣着的牌像捏在手里一样扇形摊开（用户 2026-11-12：别一板一眼排一排）；张数多就收窄每张的角度
      '<div class="zm-steal-pick is-fan" data-steal data-stagger style="--fan-h:' + (k > 7 ? 1.18 : 1.08) + '">' + Array.from({ length: k }, (_, i) => {
        const step = Math.min(13, 78 / Math.max(1, k - 1)), ang = (i - (k - 1) / 2) * step;
        return '<button type="button" data-i="' + i + '" aria-label="第 ' + (i + 1) + ' 张" style="--a:' + ang.toFixed(1) + 'deg;z-index:' + (i + 1) + '">' + backHtml() + '</button>';
      }).join('') + '</div>' +
      (k > 1 ? '<div class="zm-actions is-center"><button type="button" class="zm-btn zm-btn-primary' + (limit ? ' zm-timed' : '') + '" data-rand>' + (limit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '') + '<b>随手抽一张</b></button></div>' : ''), (d) => {
      d.classList.add('is-cards');
      const btns = Array.from(d.querySelectorAll('[data-i]'));
      let done = false, timer = 0, roam = 0;
      const commit = async (i, auto) => {
        if (done || !btns[0].isConnected) return;
        done = true; clearTimeout(timer); clearInterval(roam);
        if (auto) { timeouts += 1; autoAct = true; }
        btns.forEach((b, j) => b.classList.toggle('is-chosen', j === i));
        btns.forEach((b) => b.classList.remove('is-wander'));
        snd('ding');
        await wait(ms(320));
        if (!btns[i].isConnected) return;
        closeDialog();
        apply(0, { type: 'steal', idx: i });
        if (auto && timeouts >= 2) setAutopilot(true);
      };
      btns.forEach((b, i) => b.addEventListener('click', () => commit(i, false)));
      const rb = d.querySelector('[data-rand]');
      if (rb) rb.addEventListener('click', () => commit((Math.random() * k) | 0, false));
      if (k <= 1) { setTimeout(() => commit(0, false), ms(260)); return; }   // 只剩一张：直接选中它、停一下就抽走
      if (limit) {
        const my = token, bar = d.querySelector('.zm-dlg-timer');
        bar.querySelector('i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: limit, easing: 'linear', fill: 'forwards' });
        setTimeout(() => { if (my === token && !done && btns[0].isConnected) bar.classList.add('is-hurry'); }, Math.max(0, limit - HURRY_MS));
        // 时间到：红光在几张之间跳几下，再替我点一张
        timer = setTimeout(() => {
          if (my !== token || done || !btns[0].isConnected) return;
          let c = -1, n = 0;
          roam = setInterval(() => {
            if (done || !btns[0].isConnected) { clearInterval(roam); return; }
            let j = (Math.random() * k) | 0; if (k > 1 && j === c) j = (j + 1) % k; c = j;
            btns.forEach((b, x) => b.classList.toggle('is-wander', x === j));
            snd('tick');
            if (++n >= 5) { clearInterval(roam); commit(j, true); }
          }, 200);
        }, limit);
      }
    });
  }

  /* 交换：两个人的牌在空中交叉着换过去（逗猫棒不动）——一边从上面的弧线走、另一边从下面走；
   * 我参与的话：我换出去的从手牌原位飞走（背面朝上），换来的半路翻开、先落到牌槽上方再滑进去 */
  async function animSwap(e, t) {
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    const a = e.a, b = e.b, u = U(), pu = PU();
    // 是谁和谁换：两人头像都亮着（出牌人金光、被换的人一明一暗），停一下再飞牌（2026-11-13 用户：不要连线箭头）
    setActing(a); markVictim(b);
    await wait(ms(300));
    if (t !== token) return;
    snd('swipe');
    const flights = [];
    const pt = (seat) => avPoint(seat);
    const leave = (from, to, n, ids, arc) => {
      if (from === 0 && ids) {
        const rects = ids.map((id) => handRectOf(id));
        dropFromHand(ids);
        renderHand();
        rects.forEach((r, i) => flights.push(fx.fly({ html: backHtml(), from: r, to: pt(to), w: pu, s0: r.width / pu, s1: 0.4, r0: 0, r1: 18, dur: ms(620), delay: i * ms(45), lift: arc, fadeOut: true, land: false })));
      } else {
        for (let i = 0; i < Math.min(n, 6); i++) flights.push(fx.fly({ html: backHtml(), from: pt(from), to: to === 0 ? els.hand.getBoundingClientRect() : pt(to), w: pu, s0: 0.4, s1: to === 0 ? 0.8 : 0.4, r0: -12, r1: 12, dur: ms(620), delay: i * ms(45), lift: arc, fadeIn: true, fadeOut: true, land: false }));
      }
    };
    const arrive = (from, ids, arc) => {   // 换到我手里的（看得到是哪几张）
      ids.forEach((id, i) => {
        const to = aboveSlot(reserveHandSlot(id));
        flights.push(fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'up', flipAt: 0.45, from: pt(from), to, w: u, s0: 0.35, s1: 1, r0: -10, r1: 0, dur: ms(680), delay: ms(120) + i * ms(55), lift: arc })
          .then(() => { if (t === token) revealHandCard(id, to); }));
      });
    };
    if (a === 0) { leave(0, b, e.toB, e.cardsA, 70); if (e.cardsB) arrive(b, e.cardsB, -70); else leave(b, 0, e.toA, null, -70); }
    else if (b === 0) { leave(0, a, e.toA, e.cardsB, -70); if (e.cardsA) arrive(a, e.cardsA, 70); else leave(a, 0, e.toB, null, 70); }
    else { leave(a, b, e.toB, null, 70); leave(b, a, e.toA, null, -70); }
    await Promise.all(flights);
    if (t !== token) return;
    if (ov) {
      ov.counts[a] = ov.counts[a] - e.toB + e.toA;
      ov.counts[b] = ov.counts[b] - e.toA + e.toB;
    }
    renderSeat(a); renderSeat(b);
    fx.pop(avEl(a), { scale: 1.15 }); fx.pop(avEl(b), { scale: 1.15 });
    snd('thud');
    await wait(ms(260));
    releaseRim();
    markVictim(-1);
  }

  /* 两张一样偷一张：一只大猫爪从他头像上扑过去、扒拉一下，抓着一张牌拖回来 */
  async function animSteal(e, t) {
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    let picked = null;
    if (game.wander) {
      const w = game.wander;
      game.wander = null;
      const el = await w.settle((arr) => (e.from === 0 ? Math.max(0, arr.findIndex((c) => +c.dataset.id === e.card)) : (e.idx != null ? e.idx : 0)));
      if (t !== token) { w.cancel(); return; }
      if (el) picked = el.getBoundingClientRect();
      game.wanderDone = w;   // 选中的那张一直亮着，等牌真的飞走时再收
    }
    game.stealFrom = picked;
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
  }

  /* 点名气泡（2026-11-13 用户挑定乙 · 对话泡）：牌右上角一个墨色小对话泡，里面三个点一跳一跳像在翻找；
   * 有 → 泡变金色、里面一个勾；没有 → 泡变朱红、里面一个叉（用户：别写「有 / 没有」，太土） */
  function qGlyph(kind) {
    if (kind === 'ask') return '<i></i><i></i><i></i>';
    const d = kind === 'yes' ? '<path d="M4.6 10.6l3.6 3.6 7.2-7.8"/>' : '<path d="M5.6 5.6l8.8 8.8M14.4 5.6l-8.8 8.8"/>';
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><g class="ink" fill="none" stroke-linecap="round" stroke-linejoin="round">' + d + '</g></svg>';
  }

  /* 三张点名（2026-11-13 用户：太快，牌还没看清就拿过来了）——放慢、分三拍：
   *   ① 点名的那张牌从桌上飞到被点名的人头像旁边（对手在上面就落在头像下方，我在下面就落在头像上方），头顶一个「？」，他的头像亮金光、抖两下像在翻找；
   *   ② 有：这张牌亮金边、蹦一下、冒星星，停一会儿让大家看清是什么；没有：牌左右摇头、打红叉、冒烟；
   *   ③ 有的话：这张牌从那儿飞进出牌人手里（我拿到就落进手牌） */
  async function namedCallout(e, t) {
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    markVictim(e.from);
    const av = avEl(e.from), ar = av ? av.getBoundingClientRect() : { left: innerWidth / 2 - 20, top: 80, width: 40, height: 40, bottom: 120 };
    const u = POP(), h = u * 1.4;   // 和别的弹出来看的牌一样大（--pop）
    const below = ar.top + ar.height / 2 < innerHeight / 2;
    const se = seatEl(e.from), sb = se ? se.getBoundingClientRect().bottom : ar.bottom + 30;
    const fr = frameX(), x = Math.min(Math.max(ar.left + ar.width / 2 - u / 2, fr.l), fr.r - u - 20);   // 右边多留 20px：右上角的对话泡探出牌外
    const y = below ? Math.max(sb, ar.bottom) + 24 : ar.top - h - 26;   // 落在整个座位（名字、档位签）下方，气泡不压名字
    const el = document.createElement('div');
    el.className = 'zm-flyer zm-callout';
    el.style.width = u + 'px'; el.style.height = h + 'px';
    el.innerHTML = cardHtml(e.named) + '<b class="zm-callout-q">' + qGlyph('ask') + '</b>';
    els.fly.appendChild(el);
    const sn = els.stage.querySelector('.zm-stage-named .zm-card');
    const sr = sn ? sn.getBoundingClientRect() : null;
    const from = sr ? fx.T(sr.left + sr.width / 2 - u / 2, sr.top + sr.height / 2 - h / 2, sr.width / u, 0) : fx.T(x, y + 30, 0.3, 0);
    if (sn) sn.style.visibility = 'hidden';
    snd('whoosh');
    await fx.animate(el, [
      { transform: from, opacity: sr ? 1 : 0 },
      { transform: fx.T(x, y - 10, 1.08, -4), opacity: 1, offset: 0.7 },
      { transform: fx.T(x, y, 1, 0), opacity: 1 },
    ], { duration: ms(620), easing: 'cubic-bezier(.3,.7,.3,1)' }).finished.catch(() => {});
    if (t !== token) { el.remove(); return null; }
    el.style.transform = fx.T(x, y, 1, 0);
    // 他在翻手牌找：头像抖两下
    fx.shake(seatEl(e.from), { amp: 3, dur: 420 });
    await wait(ms(560));
    return { el, x, y, u, h };
  }
  async function animTake(e, t) {
    const c = await namedCallout(e, t);
    if (!c) return;
    const { el, x, y, u, h } = c;
    // ② 有！金边、蹦一下、冒星星，停一会儿
    el.classList.add('is-hit');
    el.querySelector('.zm-callout-q').innerHTML = qGlyph('yes');   // 有：金色泡 + 勾
    snd('ding');
    fx.burst(x + u / 2, y + h / 2, { n: 16, shapes: ['star'], colors: GOLDS, radius: 70, size: [6, 18], life: 900 });
    await fx.animate(el, [{ transform: fx.T(x, y, 1, 0) }, { transform: fx.T(x, y - 8, 1.16, 0), offset: 0.4 }, { transform: fx.T(x, y, 1, 0) }], { duration: ms(420), easing: 'ease-out' }).finished.catch(() => {});
    await wait(ms(700));
    if (t !== token) { el.remove(); return; }
    // ③ 飞进出牌人手里
    releaseRim();
    const src = el.getBoundingClientRect();
    el.remove();
    if (e.from === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.from] -= 1; renderSeat(e.from); }
    const to = e.to === 0 ? reserveHandSlot(e.card) : avPoint(e.to);
    snd('steal');
    await fx.fly({ html: cardHtml(e.card), from: src, to, w: u, s0: 1, s1: e.to === 0 ? U() / u : 0.5, fadeOut: e.to !== 0, dur: ms(820), lift: 90, r0: 0, r1: 0, swell: 0.3 });
    if (t !== token) return;
    if (e.to === 0) revealHandCard(e.card); else { ov.counts[e.to] += 1; renderSeat(e.to); fx.pop(avEl(e.to), { scale: 1.15 }); }
    markVictim(-1);
    await wait(ms(260));
  }
  async function animMiss(e, t) {
    const c = await namedCallout(e, t);
    if (!c) return;
    const { el, x, y, u, h } = c;
    // ② 没有：摇头、打红叉、冒烟
    el.classList.add('is-miss');
    releaseRim();
    el.querySelector('.zm-callout-q').innerHTML = qGlyph('no');   // 没有：朱红泡 + 叉
    el.insertAdjacentHTML('beforeend', '<div class="zm-cross" style="animation-delay:.25s">' + ART.PROPS.cross + '</div>');
    snd('miss');
    await fx.animate(el, [
      { transform: fx.T(x, y, 1, 0) },
      { transform: fx.T(x, y, 1, -12), offset: 0.2 },
      { transform: fx.T(x, y, 1, 12), offset: 0.4 },
      { transform: fx.T(x, y, 1, -8), offset: 0.6 },
      { transform: fx.T(x, y, 1, 0), offset: 0.8 },
      { transform: fx.T(x, y, 1, 0) },
    ], { duration: ms(900) }).finished.catch(() => {});
    if (!fx.reduce()) fx.smoke(x + u / 2, y + h / 2, { n: 5, spread: 14, size: [20, 34], rise: 30 });
    await wait(ms(650));
    await fx.animate(el, [{ transform: fx.T(x, y, 1, 0), opacity: 1 }, { transform: fx.T(x, y - 20, 0.8, 0), opacity: 0 }], { duration: ms(360) }).finished.catch(() => {});
    el.remove();
    markVictim(-1);
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
    await wait(ms(200));
  }

  /* 摸牌：牌堆顶那张先被捏起来、悬一下（危险时多悬一会儿、心跳），再飞走。
   * 摸到安全牌：给我的半路翻成正面、滑进手里预留的空位；给别人的缩进头像，头像「咽」一下 */
  function danger() {
    const d = D();
    return d.deckSize ? d.kittens / d.deckSize : 0;
  }
  /* 抽底（2026-11-12 用户嫌粗糙，重做）：一只猫爪从牌堆左边伸进来，勾住最底下那张，往外拖——
   * 那张真的在整摞牌下面（放进牌堆那一摞的最底层，上面的牌压着它），牌堆被带得一抬一晃；
   * 拖出来以后才换成桌面上的一张牌、捏起来悬一下（和平常摸牌接上） */
  async function peelBottom(t) {
    const stack = els.deck.querySelector('.zm-deck-stack');
    const floor = stack && (stack.querySelector('.zm-sheet.is-floor') || stack.querySelector('.zm-card'));
    const pu = PU();
    if (!stack || !floor || fx.reduce()) return peel(t, false);
    const fr = floor.getBoundingClientRect();
    // 1. 最底下塞一张牌背（被上面的纸边压着）
    const wrap = document.createElement('div');
    wrap.innerHTML = backHtml('is-inserting');
    const el = wrap.firstChild;
    el.style.transform = floor.style.transform || '';
    stack.insertBefore(el, stack.firstChild);
    // 2. 猫爪从左边伸到那张牌的左边沿
    const S = pu * 0.62;
    const paw = document.createElement('div');
    paw.className = 'zm-prop zm-paw';
    paw.innerHTML = window.ZhamaoFx.SHAPES.paw;
    paw.style.width = paw.style.height = S + 'px';
    els.fly.appendChild(paw);
    // 爪子从左下方伸到牌堆最下沿的左下角
    const ch = pu * 1.4;
    const py = fr.top + ch * 0.86 - S / 2, px0 = fr.left - pu * 1.3, px1 = fr.left - S * 0.3;
    snd('swipe');
    await fx.animate(paw, [
      { transform: fx.T(px0, py + pu * 0.5, 0.6, 50), opacity: 0 },
      { transform: fx.T(px1, py, 1, 62), opacity: 1, easing: 'cubic-bezier(.2,.8,.3,1)' },
    ], { duration: ms(300) }).finished.catch(() => {});
    if (t !== token) { paw.remove(); el.remove(); return null; }
    // 3. 勾住往外拖：牌从整摞底下滑出来，牌堆被带得一抬一晃
    ov.deckSize -= 1;
    const ox = -pu * 0.78, oy = pu * 0.62, dur = ms(480);   // 往左下方滑出来，上半截一直压在牌堆底下
    const tense = danger() >= 0.2;
    snd('peel');
    if (tense) snd('heartbeat', 80);
    stack.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '2px -4px', rotate: '1.2deg', offset: 0.35 }, { translate: '0 -1px', rotate: '-0.6deg', offset: 0.7 }, { translate: '0 0', rotate: '0deg' }], { duration: dur, easing: 'ease-out' });
    fx.animate(paw, [{ transform: fx.T(px1, py, 1, 62) }, { transform: fx.T(px1 + ox, py + oy, 1, 56) }], { duration: dur }, 'cubic-bezier(.45,0,.3,1)');
    await el.animate([{ translate: '0 0', rotate: '0deg' }, { translate: (ox * 0.25) + 'px ' + (oy * 0.2) + 'px', rotate: '-3deg', offset: 0.3 }, { translate: ox + 'px ' + oy + 'px', rotate: '-11deg' }], { duration: dur, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    if (t !== token) { paw.remove(); el.remove(); return null; }
    const r = el.getBoundingClientRect();
    el.remove();
    renderPiles();
    paw.animate([{ opacity: 1 }, { opacity: 0, transform: fx.T(px1 + ox - pu * 0.4, py + oy + pu * 0.3, 0.6, 50) }], { duration: ms(260), fill: 'forwards' }).finished.then(() => paw.remove(), () => paw.remove());
    // 4. 换成桌面上的一张，捏起来悬一下（和平常摸牌一样，危险时多抖两下）
    const node = document.createElement('div');
    node.className = 'zm-flyer';
    node.style.width = pu + 'px'; node.style.height = pu * 1.4 + 'px';
    node.innerHTML = backHtml();
    els.fly.appendChild(node);
    const x = r.left + (r.width - pu) / 2, y = r.top + (r.height - pu * 1.4) / 2;   // 旋转过的牌：用外框中心对齐
    await fx.animate(node, [
      { transform: fx.T(x, y, 1, -11), boxShadow: '0 2px 3px rgba(29,27,24,.2)' },
      { transform: fx.T(x - 4, y - 16, 1.05, -5), boxShadow: '0 12px 20px rgba(29,27,24,.26)', offset: 0.5 },
      ...(tense ? [{ transform: fx.T(x - 2.5, y - 17, 1.05, -3), offset: 0.7 }, { transform: fx.T(x - 5.5, y - 16, 1.05, -6), offset: 0.85 }] : []),
      { transform: fx.T(x - 4, y - 16, 1.05, -5), boxShadow: '0 12px 20px rgba(29,27,24,.26)' },
    ], { duration: ms(tense ? 520 : 240) }).finished.catch(() => {});
    if (t !== token) { node.remove(); return null; }
    const rr = node.getBoundingClientRect();
    node.remove();
    return rr;
  }
  async function peel(t, bottom) {
    if (bottom) return peelBottom(t);
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
    const from = await peel(t, e.bottom);
    if (!from) return;
    const u = U(), pu = PU();
    if (e.seat === 0 && e.card != null) {
      const to = aboveSlot(reserveHandSlot(e.card));
      await fx.fly({ html: cardHtml(e.card), back: backHtml(), flip: 'up', flipAt: 0.3, from, to, w: u, s0: pu * 1.04 / u, s1: 1, r0: -5, r1: 0, dur: ms(560), lift: 70, swell: 0.18 });
      if (t !== token) return;
      snd('flip');
      revealHandCard(e.card, to);
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
  /* 头像变身：摸到炸毛猫的人，头像整个换成那只炸毛猫（发抖、红光一呼一吸、头顶冒火星），桌子中间的动画照常演；
   * 用了逗猫棒：一根逗猫棒从头像背后探出来逗两下，炸毛猫消气、缩回去，头像变回原样；没逗猫棒就跟着出局一起炸掉 */
  function bombAvatar(seat, on) {
    const av = avEl(seat), box = seatEl(seat);
    if (!av || !box) return;
    let o = av.querySelector('.zm-av-bomb');
    if (on) {
      if (o) return;
      o = document.createElement('span');
      o.className = 'zm-av-bomb';
      o.innerHTML = ART.face('boom');
      av.appendChild(o);
      box.classList.add('is-bomb');
      if (!fx.reduce()) o.animate([{ transform: 'scale(.2) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(8deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,.8,.4,1.3)' });
      // 头顶一直冒火星
      av._spark = setInterval(() => {
        if (!o.isConnected) { clearInterval(av._spark); return; }
        const r = av.getBoundingClientRect();
        fx.burst(r.left + r.width * 0.5, r.top + 2, { n: 3, shapes: ['dot', 'star'], colors: ['#e9d46a', '#f28a2e', '#c8463a'], radius: 16, size: [3, 7], life: 420, gravity: -6, pattern: 'fountain' });
      }, 220);
    } else {
      clearInterval(av._spark);
      box.classList.remove('is-bomb');
      if (o) o.remove();
    }
  }
  // 用了逗猫棒：头像里的炸毛猫冒小心心、消气缩回去，头像变回原样（逗猫棒在桌心那幅画里挥，头像这儿不再另外冒一根）
  async function calmAvatar(seat, t, delay) {
    const av = avEl(seat);
    if (!av) return;
    if (fx.reduce()) { bombAvatar(seat, false); return; }
    await wait(delay || 0);
    if (t !== token) return;
    clearInterval(av._spark);
    const r = av.getBoundingClientRect();
    ['heart', 'heart', 'heart'].forEach((sh, i) => fx.float(r.left + r.width * (0.2 + i * 0.3), r.top, sh, { dy: -34, dx: (i - 1) * 6, size: 12 + i * 2, color: PINKS[i % 3], delay: i * 90, dur: 800 }));
    const o = av.querySelector('.zm-av-bomb');
    if (o) await o.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.3 }, { transform: 'scale(.3) rotate(20deg)', opacity: 0 }], { duration: ms(380), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    bombAvatar(seat, false);
    av.animate([{ transform: 'scale(.85)' }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
  }
  function clearBombAvatars() {
    document.querySelectorAll('.zm-av').forEach((av) => { clearInterval(av._spark); });
    document.querySelectorAll('.zm-av-bomb, .zm-av-wand').forEach((x) => x.remove());
    document.querySelectorAll('.zm-seat.is-bomb').forEach((b) => b.classList.remove('is-bomb'));
  }
  /* 摸到炸毛猫（2026-11-12 用户改）：和平常摸牌一样，牌飞进摸到的人的头像（自己也一样飞进自己头像），
   * 一落进去头像立刻变成炸毛猫（发抖、冒火星），头像那儿炸一圈毛、桌子一震；桌子正中不再翻出一张大炸毛猫 */
  async function animBoom(e, t, next) {
    const from = await peel(t, e.bottom);
    if (!from) return;
    ov.kittens = Math.max(0, ov.kittens - 1);
    renderPiles();
    const pu = PU(), a = avPoint(e.seat);
    await fx.fly({ html: backHtml(), from, to: a, w: pu, s0: 1.04, s1: 0.32, r0: -5, r1: 10, dur: ms(480), lift: 50, fadeOut: true, land: false });
    if (t !== token) return;
    game.boomNode = null;
    snd('boom');
    bombAvatar(e.seat, true);
    const av = avEl(e.seat), ar = av ? av.getBoundingClientRect() : { width: 54 };
    fx.shake(els.table, { amp: 8, dur: 420, rot: 0.4 });
    fx.flash('rgba(200,70,58,.3)', 0, 700);
    fx.ring(a.x, a.y, { color: '#c8463a', size: ar.width * 2.6, width: 6, dur: 560 });
    fx.burst(a.x, a.y, { n: 18, shapes: ['fur', 'fur', 'spike'], colors: FUR, radius: ar.width * 1.3, size: [8, 20], alignOut: true, life: 800, gravity: 30, pattern: 'ring' });
    fx.burst(a.x, a.y - ar.width * 0.3, { n: 10, shapes: ['star', 'dot'], colors: GOLDS.concat(['#c8463a']), radius: ar.width, size: [5, 13], life: 900, delay: 60 });
    if (av && !fx.reduce()) av.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-10px) scale(1.14)', offset: 0.25 }, { transform: 'translateY(0) scale(1)' }], { duration: 460, easing: 'ease-out', composite: 'add' });
    fx.shake(seatEl(e.seat), { amp: 6, dur: 520, delay: 120 });
    await wait(ms(next && next.t === 'defuse' ? 700 : 900));
  }

  // 一张停在 (x, y) 的牌（不在飞）：拿来接着做动画
  function restCard(html, x, y, w) {
    const el = document.createElement('div');
    el.className = 'zm-flyer';
    el.style.width = w + 'px'; el.style.height = (w * 1.4) + 'px'; el.style.borderRadius = (w * 0.09).toFixed(1) + 'px';
    el.style.transform = 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - w * 0.7).toFixed(1) + 'px)';
    el.style.boxShadow = '0 6px 16px rgba(29,27,24,.22)';
    el.innerHTML = html;
    els.fly.appendChild(el);
    return el;
  }
  function takeDefuseCard(e) {
    const src = e.seat === 0 ? handRectOf(e.card) : avPoint(e.seat);
    if (e.seat === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.seat] -= 1; renderSeat(e.seat); }
    return src;
  }
  async function defuseToDiscard(e, t, from, w) {
    if (t !== token) return;
    await fx.fly({ html: cardHtml(e.card), from, to: discardRect(), w: PU(), s0: w / PU(), s1: 1, r0: 0, r1: pileRot(e.card), dur: ms(360), lift: 30 });
    if (t !== token || !ov) return;
    ov.discard.push(e.card);
    renderPiles();
    snd('thud');
  }
  /* 用逗猫棒拆掉（2026-11-12 用户挑的方案甲「牌化成画」）：逗猫棒那张牌落在桌心不消失，就地「展开」成封面那幅画（牌放大淡出、画从牌那么大长出来，同一个位置），
   * 只有画里这一根逗猫棒在挥（头像那儿不再另外冒一根），画里的炸毛猫消气的同时头像那只也消气；最后画收回成那张牌，牌落进弃牌堆 */
  async function animDefuse(e, t) {
    const u = U(), c = fx.center(els.center.getBoundingClientRect());
    const src = takeDefuseCard(e);
    const W = u * 1.2;
    await fx.fly({ html: cardHtml(e.card), back: backHtml(), flip: e.seat === 0 ? null : 'up', flipAt: 0.15, from: src, to: c, w: W, s0: e.seat === 0 ? u / W : 0.35, s1: 1, r0: 0, r1: 0, dur: ms(440), lift: 60 });
    if (t !== token) return;
    const card = restCard(cardHtml(e.card), c.x, c.y, W);
    const SW = Math.min(innerWidth * 0.62, u * 3.4), SH = SW * 0.63;
    const scene = document.createElement('div');
    scene.className = 'zm-defuse-scene';
    scene.style.cssText = 'left:' + (c.x - SW / 2).toFixed(1) + 'px;top:' + (c.y - SH / 2).toFixed(1) + 'px;width:' + SW.toFixed(1) + 'px;opacity:0';
    scene.innerHTML = ART.hero();
    els.fly.appendChild(scene);
    snd('defuse');
    const k = W / SW, grow = ms(380);
    const base = card.style.transform;
    card.animate([{ transform: base + ' scale(1)', opacity: 1 }, { transform: base + ' scale(' + (SW / W * 0.7).toFixed(3) + ')', opacity: 0 }], { duration: grow, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    scene.animate([{ transform: 'scale(' + k.toFixed(3) + ')', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: grow, easing: 'cubic-bezier(.3,.8,.4,1.1)', fill: 'forwards' });
    const boom = scene.querySelector('.hero-boom'), wnd = scene.querySelector('.hero-wand');
    const dur = ms(1500);
    calmAvatar(e.seat, t, grow + dur * 0.62);
    if (!fx.reduce()) {
      if (wnd) wnd.animate([{ rotate: '-24deg' }, { rotate: '14deg', offset: 0.18 }, { rotate: '-14deg', offset: 0.36 }, { rotate: '12deg', offset: 0.54 }, { rotate: '-8deg', offset: 0.72 }, { rotate: '5deg', offset: 0.88 }, { rotate: '0deg' }], { duration: dur, delay: grow, easing: 'ease-in-out' });
      if (boom) boom.animate([
        { transform: 'scale(1.12) rotate(-4deg)' }, { transform: 'scale(1.06) rotate(4deg)', offset: 0.15 }, { transform: 'scale(1.08) rotate(-3deg)', offset: 0.3 },
        { transform: 'scale(1.0) rotate(2deg)', offset: 0.5 }, { transform: 'scale(.94) rotate(0deg)', offset: 0.75 }, { transform: 'scale(.92)' },
      ], { duration: dur, delay: grow, easing: 'ease-in-out', fill: 'forwards' });
    }
    fx.ring(c.x, c.y, { color: '#4f8a5f', size: SW * 1.2, width: 5, dur: 900, delay: grow + ms(450) });
    ['heart', 'note', 'heart', 'note', 'heart'].forEach((sh, i) => fx.float(c.x + (i - 2) * SW * 0.13, c.y - SH * 0.3, sh, { dy: -u * 1.1, dx: (i - 2) * 8, size: 16 + (i % 2) * 6, color: sh === 'heart' ? PINKS[i % 3] : '#4f8a5f', delay: grow + ms(250 + i * 160), dur: ms(1100) }));
    await wait(grow + dur);
    if (t !== token) { scene.remove(); card.remove(); return; }
    // 画收回成那张牌
    const back = ms(320);
    scene.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(' + k.toFixed(3) + ')', opacity: 0 }], { duration: back, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
    await card.animate([{ transform: base + ' scale(' + (SW / W * 0.7).toFixed(3) + ')', opacity: 0 }, { transform: base + ' scale(1)', opacity: 1 }], { duration: back, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished.catch(() => {});
    scene.remove(); card.remove();
    await defuseToDiscard(e, t, c, W);
  }
  /* 塞回去：背面的炸毛猫飞回牌堆，牌堆上半截掀开一道口、它滑进去、合上（不论塞在哪动画都一样，不泄露位置） */
  async function animInsert(e, t) {
    const node = game.boomNode;
    game.boomNode = null;
    const pu = PU();
    // 炸毛猫在拆掉它的那个人那儿（头像），从那儿飞回牌堆
    const av = avEl(e.seat);
    const from = node ? node.getBoundingClientRect() : av ? av.getBoundingClientRect() : els.center.getBoundingClientRect();
    if (node) node.remove();
    // 掀开的「盖子」= 顶上那张 + 上面将近一半的纸边；炸毛猫从侧面插进这道缝：真的放进牌堆那一摞里（盖子压在它上面、下半截垫在它下面）。
    // 不管实际塞第几张，缝都开在同一个高度，别人从动画看不出位置
    const stack = els.deck.querySelector('.zm-deck-stack');
    const layers = Array.from(stack.children);
    const split = Math.max(1, Math.floor(layers.length * 0.55));
    const lid = layers.slice(split), floor = layers[split - 1] || layers[0];
    if (!floor) {
      await fx.fly({ html: backHtml(), from, to: deckTopRect(), w: pu, s0: from.width / pu, s1: 1, r0: 0, r1: 0, dur: ms(380), lift: 40 });
    } else {
      lid.forEach((c) => c.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '6px -16px', rotate: '-8deg', offset: 0.3 }, { translate: '6px -16px', rotate: '-8deg', offset: 0.72 }, { translate: '0 0', rotate: '0deg' }], { duration: ms(900), easing: 'ease-in-out' }));
      const fr = floor.getBoundingClientRect(), off = pu * 0.95;
      // 先飞到缝的左边
      await fx.fly({ html: backHtml(), from, to: { x: fr.left + fr.width / 2 - off, y: fr.top + fr.height / 2 - 2 }, w: pu, s0: from.width / pu, s1: 1, r0: from.width ? -10 : 0, r1: -8, dur: ms(380), lift: 40, land: false });
      if (t !== token) return;
      // 再换成牌堆里的一张，从左边滑进缝里
      const card = document.createElement('div');
      card.innerHTML = backHtml('is-inserting');
      const el = card.firstChild;
      el.style.transform = floor.style.transform || '';
      el.style.filter = 'drop-shadow(0 0 6px rgba(200, 70, 58, 0.55))';
      stack.insertBefore(el, lid[0] || null);
      await el.animate([{ translate: (-off) + 'px -2px', rotate: '-8deg' }, { translate: '0 -2px', rotate: '0deg' }], { duration: ms(300), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});
      el.remove();
    }
    if (t !== token) return;
    snd('insert');
    ov.deckSize += 1;
    ov.kittens += 1;
    renderPiles();
    fx.pop(els.deck, { scale: 1.05 });
    await wait(ms(260));
  }

  /* 出局：炸毛猫扑向那个人，大爆炸——更大的红光、黑毛、烟、冲击波；头像变灰冒黑烟，「炸毛」大章砸下来；
   * 他的手牌全翻开、一张张散落进弃牌堆 */
  async function animOut(e, t) {
    if (window.ZhamaoAudio) window.ZhamaoAudio.knockedOut();
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
    bombAvatar(e.seat, false);
    fx.shake(els.table, { amp: 15, dur: 700, rot: 1 });
    fx.flash('rgba(200,70,58,.55)', 0, 1100);
    fx.ring(a.x, a.y, { color: '#c8463a', size: u * 5, width: 10, dur: 760 });
    fx.ring(a.x, a.y, { color: '#3a3632', size: u * 3.2, width: 6, dur: 640, delay: 120 });
    fx.burst(a.x, a.y, { n: 40, shapes: ['fur', 'fur', 'spike'], colors: FUR, radius: u * 2.6, size: [12, 34], alignOut: true, life: 1200, gravity: 50, pattern: 'ring' });
    fx.burst(a.x, a.y, { n: 20, shapes: ['star', 'dot'], colors: GOLDS.concat(['#c8463a']), radius: u * 2, size: [6, 20], life: 1200, delay: 100 });
    fx.smoke(a.x, a.y, { n: 12, spread: u * 0.8, size: [u * 0.7, u * 1.4], rise: 60, tint: 'dark', delay: 60 });
    ov.alive[e.seat] = false;
    ov.counts[e.seat] = 0;
    if (e.seat === viewSeat) watch(viewSeat);
    if (e.seat === 0) els.app.classList.add('is-spectator');
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
    if (e.seat === 0) { game.fastOut = true; renderBand(); }
  }

  /* 「作废只在和我有关时问」（设置里，默认关）：和我有关 = 这张牌是我出的（被人作废了，我可能想作废回去）、
   * 指着我（索要 / 偷牌 / 点名 / 交换 / 自由甩锅）、或者是甩锅而下一家就是我。别的（洗牌、窥探、改命、跳过、抽底、互相甩锅 / 偷牌……）一律不问 */
  function aboutSeat(p, me, alive) {
    if (!p) return true;
    if (p.by === me || p.target === me) return true;
    if (p.type === R.ATTACK) { const n = alive.length; for (let k = 1; k < n; k++) { const x = (p.by + k) % n; if (alive[x]) return x === me; } }
    return false;
  }
  const askMeNope = (s) => !settings.nopeMine || aboutSeat(s.pending, 0, s.alive);

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
      if (x === 0 && !autopilot) continue;
      let want;
      if (tut && tut.botNope) want = tut.botNope(s, x);
      if (want == null) want = R.canNope(s, x) && AI.decide(s, x, game.tiers[x] || 'normal').type === 'nope';
      if (want) { botSeat = x; break; }
    }
    const meCan = !autopilot && R.canNope(s, 0) && R.awaitingReaction(s).indexOf(0) >= 0 && (askMeNope(s) || !!tut);
    const tutWaitMe = tut && tut.mustNope && tut.mustNope(s);
    const botDelay = botSeat >= 0 ? P.botNope[0] + Math.random() * (P.botNope[1] - P.botNope[0]) : Infinity;
    const windowMs = meCan ? (tutWaitMe ? Infinity : P.react || 1400) : P.quiet;
    const fireAt = Math.min(botDelay, windowMs);
    const now = performance.now();
    game.reactPlan = { botSeat, botAt: now + botDelay, windowEnd: now + windowMs };
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
      if (botSeat >= 0 && botDelay <= windowMs) { if (botSeat === 0) autoAct = true; doNope(botSeat); }
      else closeReact();
    }, fireAt);
  }
  // 我点「取消」：不作废了。还有机器猫打算作废、而且它本来就赶得上 → 等它；否则马上结算，不用等导火索烧完
  function passReact() {
    const s = game.state;
    if (s.phase !== 'react' || !reactOpen) return;
    if (game.online) { clearTimeout(reactAuto); reactOpen = false; renderBand(); renderHand({ flip: false }); snd('untap'); onlineMove({ type: 'pass' }); return; }
    if (tut && tut.mustNope && tut.mustNope(s)) { shake(els.drawBtn); return; }
    clearReactTimer();
    reactOpen = false;
    busy = true;
    stopFuse();
    renderBand();
    renderHand({ flip: false });
    snd('untap');
    const p = game.reactPlan || { botSeat: -1 };
    const k = token;
    if (p.botSeat >= 0 && p.botAt <= p.windowEnd) {
      reactTimer = setTimeout(() => { if (k === token && game.state.phase === 'react') { reactTimer = null; doNope(p.botSeat); } }, Math.max(0, p.botAt - performance.now()));
    } else closeReact();
  }
  async function doNope(seat) {
    if (game.online) { if (seat === 0) { reactOpen = false; renderBand(); renderHand({ flip: false }); onlineMove({ type: 'nope' }); } return; }
    clearReactTimer();
    const s = game.state, t = token;
    reactOpen = false;
    busy = true;
    stopFuse();
    snapshot();
    renderBand();
    renderHand({ flip: false });   // 手里「作废」那几张的紫光立刻停
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
    stopFuse();
    snapshot();
    renderBand();
    renderHand({ flip: false });   // 导火索烧完：紫色按钮、手里「作废」的紫光一起停
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
    if (!s.alive[0]) return;   // 观战时看到的是别人的牌，点了没用
    if (autopilot) { setAutopilot(false); return; }   // 托管中点手牌 = 收回来自己打
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
    if (autopilot) { setAutopilot(false); return; }
    if (s.phase === 'react' && reactOpen) { passReact(); return; }
    if (!s.alive[0] && s.phase !== 'over') { if (game.fastOut) newGame(); return; }
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
      const ts = R.validTargets(s, 0, c.type);
      if (ts.length === 1) withName(ts[0]);
      else previewThenPick(cards, c, ts, withName);
    } else go();
  }
  /* 要指定人的牌：先把牌飞到桌子中间摆好（还没真出），落定以后可选的人头像才一个个亮起来、跳一下，提示去点头像；
   * 点了人才真的出（从桌上这个位置接着演）；「取消」/ 点空白 = 牌飞回手里 */
  let preview = null;
  async function previewThenPick(cards, c, ts, cb) {
    const t = token;
    busy = true;
    const rects = cards.map((id) => handRectOf(id));
    cards.forEach((id) => handHidden.add(id));
    selected = [];
    renderHand({ flip: false });
    showStage({ by: 0, type: c.type, cards, target: -1, named: null, nopes: [] }, true);
    els.stage.classList.add('is-preview');
    preview = { cards };
    snd('whoosh');
    const su = SU();
    await Promise.all(cards.map((id, i) => {
      const target = stageCard(id);
      if (!target) return null;
      const to = target.getBoundingClientRect(), rot = (i - (cards.length - 1) / 2) * 5;
      return fx.fly({ html: cardHtml(id), from: rects[i], to: { x: to.left + to.width / 2, y: to.top + to.height / 2 }, w: su, s0: rects[i].width / su, s1: 1, r0: 0, r1: rot, dur: ms(380), delay: i * ms(60), lift: 70 })
        .then(() => { if (t === token) target.classList.remove('is-incoming'); });
    }));
    if (t !== token || !preview) return;
    snd('thud');
    busy = false;
    const early = preview.tap;   // 牌还在往桌上飞时就点了头像：落定后直接当选了他（见 onSeatTap）
    pickTarget(ts, (seat) => {
      // 记下桌上这几张的位置：真出牌时从这里接着演，不再从手里飞一遍
      const m = {};
      for (const id of cards) { const el = stageCard(id); if (el) m[id] = el.getBoundingClientRect(); }
      game.previewSrc = m;
      preview = null;
      els.stage.classList.remove('is-preview');
      cb(seat);
    });
    if (early != null && ts.indexOf(early) >= 0) onSeatTap(early);
  }
  function endPreview() {   // 不出了：桌上的牌飞回手里原位
    if (!preview) return;
    const cards = preview.cards;
    preview = null;
    game.previewSrc = null;
    const from = {};
    for (const id of cards) { const el = stageCard(id); if (el) from[id] = el.getBoundingClientRect(); }
    clearStage();
    els.stage.classList.remove('is-preview');
    cards.forEach((id) => handHidden.delete(id));
    renderHand({ flip: false });
    if (fx.reduce()) return;
    for (const id of cards) {
      const c = handCard(id), f = from[id];
      if (!c || !f) continue;
      const r = c.getBoundingClientRect();
      c.animate([{ transform: 'translate(' + (f.left - r.left).toFixed(1) + 'px,' + (f.top - r.top).toFixed(1) + 'px) scale(' + (f.width / r.width).toFixed(3) + ')' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,.8,.4,1)', composite: 'add' });
    }
  }
  function pickTarget(ts, cb) {
    mode = 'target';
    targetCb = cb;
    let k = 0;
    for (let seat = 1; seat < game.state.n; seat++) {
      const b = seatEl(seat), on = ts.indexOf(seat) >= 0;
      b.classList.toggle('is-target', on);
      b.classList.toggle('is-target-off', !on);
      if (on && !fx.reduce()) {   // 一个个亮起来、跳一下，外面荡出一圈金光
        const a = avPoint(seat), d = k++ * 90;
        fx.pop(b.querySelector('.zm-av'), { scale: 1.25, dur: 380, delay: d });
        fx.ring(a.x, a.y, { color: '#c9a96e', size: 120, width: 4, dur: 600, delay: d });
      }
    }
    snd('ask');
    renderBand();
  }
  function cancelTarget() {
    mode = null; targetCb = null;
    els.opps.querySelectorAll('.zm-seat').forEach((b) => b.classList.remove('is-target', 'is-target-off'));
    endPreview();
    renderBand();
  }
  // 观战：我已经出局（单机）→ 点一只还在场的机器猫，坐到它背后看它的手牌；再点一下 / 点别的就换
  function watch(seat) {
    viewSeat = viewSeat === seat ? -1 : seat;
    els.opps.querySelectorAll('.zm-seat').forEach((b) => b.classList.toggle('is-watched', +b.dataset.seat === viewSeat));
    els.app.classList.toggle('is-watching', viewSeat > 0);
    snd(viewSeat > 0 ? 'flip' : 'untap');
    if (ov) ov.hand = viewSeat > 0 ? game.state.hands[viewSeat].slice() : [];
    renderHand();
  }
  function onSeatTap(seat) {
    if (game && game.online && !game.dealing && (game.spectator || !game.state.alive[0]) && game.state.phase !== 'over') {
      if (seat > 0 && game.state.alive[seat]) onlineView(srvOf(seat));
      return;
    }
    if (game && !game.tutorial && !game.online && !game.state.alive[0] && game.state.phase !== 'over' && seat > 0) {
      if (game.state.alive[seat]) watch(seat);
      return;
    }
    // 2026-11-13 用户：要甩锅给别人，点头像却先弹出了互动表情——点「出牌」后牌要先飞上桌（约 0.4 秒）才开始选人，
    // 这段时间点头像落到了「互动」。现在：牌在飞 / 等选人时点头像 = 记下来，落定后直接选他；选人模式里永远不弹互动
    if (preview && mode !== 'target') { if (seat > 0) preview.tap = seat; return; }
    // 已经选好了要指人的牌（还没按「出牌」）就点了一个能指的人：当作出给他（和先按出牌再点他一样，牌照样先飞上桌）
    if (mode == null && seat > 0 && !busy && selected.length && myTurnToAct() && els.mask.hidden) {
      const c = R.classify(selected);
      if (c && c.needsTarget && R.validTargets(game.state, 0, c.type).indexOf(seat) >= 0 && !(tut && tut.allow && !tut.allow({ type: 'play', cards: selected.slice(), preview: true }))) {
        onPlay();
        if (preview) preview.tap = seat; else if (mode === 'target') onSeatTap(seat);
        return;
      }
    }
    if (mode !== 'target') {
      if (social && socialOk() && seat > 0 && els.mask.hidden) { social.openProps(seat); popTail(avEl(seat)); }
      return;
    }
    if (!targetCb) return;
    const b = seatEl(seat);
    if (!b.classList.contains('is-target')) { shake(b); return; }
    const cb = targetCb;
    mode = null; targetCb = null;
    els.opps.querySelectorAll('.zm-seat').forEach((x) => x.classList.remove('is-target', 'is-target-off'));
    cb(seat);
  }
  function pressNope() {
    const s = game.state;
    if (s.phase !== 'react' || !reactOpen || !R.canNope(s, 0)) return;
    if (tut && tut.allow && !tut.allow({ type: 'nope' })) { shake(els.nopeBtn); return; }
    doNope(0);
  }


  function wipeFx() {
    clearBombAvatars();
    if (game && game.wander) { game.wander.cancel(); game.wander = null; }
    if (game && game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    if (game) game.alterRow = null;
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
    ov = { counts: Array(n).fill(0), hand: [], deckSize: s.deck.length + dealt, kittens: kits.length, discard: [], turn: -1, turnsLeft: 1, alive: s.alive.slice() };
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
    // 先把炸毛猫一只只从牌堆里抽出来、翻开、摆在牌堆上方一排（谁也不拿，等发完牌再塞回去）
    const kf = kits.length > 4 ? 0.6 : 1;   // 人多（炸毛猫多）时一只只摆出来 / 塞回去都快一点，整段发牌别拖太久
    const u0 = U(), pu0 = PU(), kw = Math.min(pu0 * 0.82, (frameX().r - frameX().l) / (kits.length * 1.12));   // 人多（炸毛猫多）时排得下
    const pr = els.deck.parentElement.getBoundingClientRect(), dtop = deckTopRect();
    const aside = [];
    for (let i = 0; i < kits.length; i++) {
      if (skipped()) { aside.forEach((x) => x && x.remove()); return; }
      const half = kits.length * kw * 0.56 + 4, fr = frameX(), cx0 = Math.min(Math.max(pr.left + pr.width / 2, fr.l + half), fr.r - half);
      const spot = { x: cx0 + (i - (kits.length - 1) / 2) * kw * 1.12, y: dtop.top - pu0 * 0.78 };
      const from = deckTopRect();
      ov.deckSize -= 1; ov.kittens -= 1;
      renderPiles();
      snd('hiss', 120);
      const node = await fx.fly({ html: cardHtml(kits[i]), back: backHtml(), flip: 'up', flipAt: 0.25, from, to: spot, w: kw, s0: pu0 / kw, s1: 1, r0: 0, r1: (i % 2 ? 6 : -6), dur: 380 * kf, lift: 30, keep: true, land: false });
      if (node) node.classList.add('zm-angry');
      aside.push(node);
      fx.burst(spot.x, spot.y, { n: 6, shapes: ['fur'], colors: FUR, radius: kw * 0.7, size: [5, 11], alignOut: true, life: 500, pattern: 'ring' });
      await wait(140 * kf);
    }
    void u0;
    if (skipped()) { aside.forEach((x) => x && x.remove()); return; }
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
        const to = aboveSlot(reserveHandSlot(id));
        flights.push(fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'up', flipAt: 0.35, from, to, w: u, s0: pu / u, s1: 1, r0: -10, r1: 0, dur: 420, lift: 60 }).then(() => { if (!skipped()) revealHandCard(id, to); }));
      } else {
        flights.push(fx.fly({ html: backHtml(), from, to: avPoint(seat), w: pu, s0: 1, s1: 0.4, r0: -10, r1: 20, dur: 380, lift: 40, fadeOut: true, land: false }).then(() => { if (!skipped()) { ov.counts[seat] += 1; renderSeat(seat); } }));
      }
      await wait(85 * Math.min(1, 20 / order.length));
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
    // 发完了：摆在一边的炸毛猫一只只钻回牌堆（翻成背面落进去）
    void defs;
    for (let i = 0; i < aside.length; i++) {
      if (skipped()) { aside.forEach((x) => x && x.isConnected && x.remove()); return; }
      const node = aside[i];
      const rr = node ? node.getBoundingClientRect() : deckTopRect();
      if (node) node.remove();
      snd('insert');
      await fx.fly({ html: cardHtml(kits[i]), back: backHtml(), flip: 'down', flipAt: 0.15, from: rr, to: deckTopRect(), w: pu, s0: rr.width / pu, s1: 1, r0: 0, r1: 0, dur: 300 * kf, lift: 16 });
      if (skipped()) { aside.forEach((x) => x && x.isConnected && x.remove()); return; }
      ov.deckSize += 1; ov.kittens += 1;
      renderPiles();
      fx.pop(els.deck, { scale: 1.05 });
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
  /* 局内要我做决定的（偷哪张 / 点名 / 改命 / 从弃牌堆捡 / 炸毛猫塞哪）：不弹框，直接摆在桌子正中，
   * 底下的牌堆、弃牌堆、头像、手牌蒙一层浅浅的宣纸色（和「窥探」摊牌一样）。2026-11-13 用户看过前后对比后定下 */
  function openStage(html, onMount, onClose) {
    openDialog(html, (d) => {
      if (onMount) onMount(d);
      d.classList.add('is-stage'); els.mask.classList.add('is-stage');
    }, onClose);
  }
  function openDialog(html, onMount, onClose) {
    closeMenu();
    pauseClock();
    els.mask.classList.remove('is-stage');
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
    openStage('<h2>点名要哪种牌？</h2><p class="zm-muted">他手里有，就得给你一张；没有就落空</p>' +
      '<div class="zm-grid" data-stagger>' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '</button>').join('') + '</div>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>算了</button></div>', (d) => {
      d.classList.add('is-cards');
      d.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { closeDialog(); cb(b.dataset.k); }));
      d.querySelector('[data-cancel]').addEventListener('click', () => { closeDialog(); if (game.previewSrc) { preview = { cards: Object.keys(game.previewSrc).map(Number) }; endPreview(); } renderBand(); });
    });
  }

  /* 改命（原名「重排」，2026-11-12 改名）：最上面（至多）三张正面朝上摆一排，点两张换位置，「好了」放回去；限时到了按现在的顺序放 */
  function alterDialog() {
    const s = game.state;
    let order = s.alter.cards.slice(), sel = -1;
    const limit = dlgLimit();
    snd('peek');
    openStage('<h2>改命 · 最上面 ' + order.length + ' 张</h2>' +
      '<p class="zm-muted zm-alter-tip">拖一张插到别处，或点两张互换</p>' +
      '<div class="zm-alter-row"><span class="end">顶</span><div class="zm-alter" data-alter>' + order.map((id, i) => '<button type="button" class="zm-alter-slot" data-i="' + i + '">' + cardHtml(id) + '</button>').join('') + '</div><span class="end">底</span></div>' +
      '<div class="zm-actions is-center"><button type="button" class="zm-btn zm-btn-primary' + (limit ? ' zm-timed' : '') + '" data-ok data-focus>' + (limit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '') + '<b>好了</b></button></div>', (d) => {
      const slots = Array.from(d.querySelectorAll('.zm-alter-slot'));
      const okBtn = d.querySelector('[data-ok]');
      let done = false, timer = 0;
      const commit = () => {
        if (done || !okBtn.isConnected) return;
        if (tut && tut.allow && !tut.allow({ type: 'alter', order: order.slice() })) { shake(okBtn); return; }   // 教程：没按要求排好
        done = true; clearTimeout(timer);
        closeDialog();
        apply(0, { type: 'alter', order: order.slice() });
      };
      // 换两个位置上的牌（带一个小交叉动画）；from 给了就是拖过去的那张从松手处滑进新位置
      const swap = (i, j, dropRect) => {
        const a = slots[i], b = slots[j], ca = a.querySelector('.zm-card'), cb = b.querySelector('.zm-card');
        const ra = dropRect || ca.getBoundingClientRect(), rb = cb.getBoundingClientRect();
        a.insertBefore(cb, a.firstChild); b.insertBefore(ca, b.firstChild);
        [order[i], order[j]] = [order[j], order[i]];
        if (!fx.reduce()) {
          const na = ca.getBoundingClientRect(), nb = cb.getBoundingClientRect();
          ca.animate([{ transform: 'translate(' + (ra.left - na.left) + 'px,' + (ra.top - na.top - (dropRect ? 0 : 14)) + 'px)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
          cb.animate([{ transform: 'translate(' + (rb.left - nb.left) + 'px,14px)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
        }
        slots.forEach((x) => x.classList.remove('is-sel')); sel = -1;
        snd('flip');
      };
      /* 拖：按住一张拖到别处松手 = 把它「插」到那个位置（2026-11-13 用户：把第一张拖到第三张后面，应该是插过去而不是互换）；
       * 拖的时候别的牌实时让位，看得出会插在哪。点：点一张、再点另一张 = 两张互换（照旧）。
       * 位置只看被拖那张牌的中心（不看手指在哪——手指捏在牌边上也算得准）；格子本身不动，动的是格子里的牌 */
      const cardsNow = () => slots.map((x) => x.querySelector('.zm-card'));
      const centers = () => slots.map((x) => { const q = x.getBoundingClientRect(); return q.left + q.width / 2; });
      const insertAt = (i, card) => {
        const r = card.getBoundingClientRect(), cx = r.left + r.width / 2;
        let k = 0;
        centers().forEach((c, j) => { if (j !== i && c < cx) k++; });
        return k;
      };
      // 拖着 i、准备插到 k：别的牌往旁边让一格
      const preview = (i, k, cards) => {
        const cs = centers(), pitch = cs.length > 1 ? cs[1] - cs[0] : 0;
        cards.forEach((c, j) => {
          if (j === i) return;
          let to = j;
          if (i < k && j > i && j <= k) to = j - 1;
          else if (k < i && j >= k && j < i) to = j + 1;
          c.style.transition = 'transform .15s ease';
          c.style.transform = to === j ? '' : 'translateX(' + ((to - j) * pitch).toFixed(1) + 'px)';
        });
      };
      // 真的挪：order 里把 i 拿出来插到 k，牌放进新格子，再从各自原来（看上去）的位置滑过去
      const move = (i, k, dropRect) => {
        const cards = cardsNow();
        const before = cards.map((c, j) => (j === i && dropRect ? dropRect : c.getBoundingClientRect()));
        cards.forEach((c) => { c.style.transition = ''; c.style.transform = ''; c.style.zIndex = ''; });
        const idx = order.map((_, j) => j);
        idx.splice(i, 1); idx.splice(k, 0, i);
        order = idx.map((j) => order[j]);
        idx.forEach((j, pos) => slots[pos].insertBefore(cards[j], slots[pos].firstChild));
        if (!fx.reduce()) cards.forEach((c, j) => {
          const now = c.getBoundingClientRect(), r = before[j];
          if (Math.abs(r.left - now.left) < 1 && Math.abs(r.top - now.top) < 1) return;
          c.animate([{ transform: 'translate(' + (r.left - now.left) + 'px,' + (r.top - now.top) + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,.8,.4,1)' });
        });
        slots.forEach((x) => x.classList.remove('is-sel')); sel = -1;
        snd('flip');
      };
      let drag = null;
      slots.forEach((slot, i) => {
        slot.addEventListener('pointerdown', (ev) => {
          const card = slot.querySelector('.zm-card');
          drag = { i, x0: ev.clientX, y0: ev.clientY, card, moved: false, id: ev.pointerId, k: i };
          try { slot.setPointerCapture(ev.pointerId); } catch (_) { /* */ }
        });
        slot.addEventListener('pointermove', (ev) => {
          if (!drag || drag.i !== i) return;
          const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
          if (!drag.moved && Math.hypot(dx, dy) < 6) return;
          if (!drag.moved && sel >= 0) { slots.forEach((x) => x.classList.remove('is-sel')); sel = -1; }
          drag.moved = true;
          drag.card.style.transition = '';
          drag.card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.04).toFixed(1) + 'deg) scale(1.06)';
          drag.card.style.zIndex = 5;
          slot.classList.add('is-dragging');
          const k = insertAt(i, drag.card);
          if (k !== drag.k) { drag.k = k; preview(i, k, cardsNow()); snd('tick'); }
        });
        const end = () => {
          if (!drag || drag.i !== i) return;
          const d = drag;
          drag = null;
          slot.classList.remove('is-dragging');
          if (!d.moved) { // 当成一次点击：点两张互换
            if (sel < 0) { sel = i; slot.classList.add('is-sel'); snd('tap'); return; }
            if (sel === i) { slot.classList.remove('is-sel'); sel = -1; snd('untap'); return; }
            swap(sel, i);
            return;
          }
          const dropRect = d.card.getBoundingClientRect();
          const k = insertAt(i, d.card);
          if (k !== i) { move(i, k, dropRect); return; }
          // 放回原位
          cardsNow().forEach((c) => { c.style.transition = ''; c.style.transform = ''; c.style.zIndex = ''; });
          if (!fx.reduce()) { const now = d.card.getBoundingClientRect(); d.card.animate([{ transform: 'translate(' + (dropRect.left - now.left) + 'px,' + (dropRect.top - now.top) + 'px)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' }); }
        };
        slot.addEventListener('pointerup', end);
        slot.addEventListener('pointercancel', end);
      });
      okBtn.addEventListener('click', commit);
      if (limit) {
        const my = token, bar = d.querySelector('.zm-dlg-timer');
        bar.querySelector('i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: limit, easing: 'linear', fill: 'forwards' });
        setTimeout(() => { if (my === token && !done && okBtn.isConnected) bar.classList.add('is-hurry'); }, Math.max(0, limit - HURRY_MS));
        timer = setTimeout(() => { if (my === token && !done && okBtn.isConnected) { timeouts += 1; autoAct = true; commit(); if (timeouts >= 2) setAutopilot(true); } }, limit);
      }
    });
  }
  /* 重排：打出来时顶上几张牌背从牌堆上抬起、在牌堆上方摆一排（牌堆真的少了这几张）；
   * 排好顺序后（我在弹窗里排 / 机器猫在想），这一排在空中互相换位洗两轮，再一张张平着落回牌堆顶。谁排都一样演，看不出顺序 */
  async function animAlterLift(e, t) {
    if (game.alterRow) { game.alterRow.forEach((n) => n && n.remove()); game.alterRow = null; }
    const k = e.count || (e.cards ? e.cards.length : 3);
    const r = deckTopRect(), c = fx.center(r), pu = PU();
    snd('peek');
    // 整排浮在牌堆顶上方、和牌堆之间留一道缝（不和牌堆压在一起，看着就是从牌堆里拿出来、举在上面）
    const rowY = r.top - pu * 1.4 * 0.82 / 2 - 16;
    const spots = Array.from({ length: k }, (_, i) => ({ x: c.x + (i - (k - 1) / 2) * pu * 0.9, y: rowY }));
    if (ov) { ov.lifted = (ov.lifted || 0) + k; renderPiles(); }
    const nodes = await Promise.all(spots.map((p, i) => fx.fly({ html: backHtml(), from: deckTopRect(), to: p, w: pu, s0: 1, s1: 0.82, r0: 0, r1: 0, dur: ms(320), delay: i * ms(70), lift: 16, keep: true, land: false })));
    if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    game.alterRow = nodes;
    game.alterSpots = spots;
    if (e.seat !== 0) bubble(e.seat, '', { think: true, ms: 1400 });
    await wait(ms(160));
  }
  async function animAltered(e, t) {
    const pu = PU();
    let nodes = game.alterRow, spots = game.alterSpots;
    game.alterRow = null;
    if (!nodes || !nodes.length) {   // 那一排没了（暂停过）：再抬一次；快照里本来就没算这几张，抬起时别再减一遍
      const kk = e.count || (e.cards ? e.cards.length : 3);
      await animAlterLift({ seat: e.seat, count: kk }, t);
      if (ov) ov.lifted -= kk;
      nodes = game.alterRow; spots = game.alterSpots; game.alterRow = null;
    }
    if (t !== token || !nodes) { (nodes || []).forEach((n) => n && n.remove()); return; }
    const k = nodes.length;
    snd('shuffle');
    // 两轮：每张飞到另一个位置（错开一点高度、弧线），始终平着、不翻面
    let at = nodes.map((_, i) => i);
    for (let round = 0; round < 2 && k > 1; round++) {
      const next = at.map((p) => (p + 1 + round) % k);
      nodes = await Promise.all(nodes.map((n, i) => {
        if (!n) return null;
        const rr = n.getBoundingClientRect();
        n.remove();
        return fx.fly({ html: backHtml(), from: rr, to: spots[next[i]], w: pu, s0: rr.width / pu, s1: 0.82, r0: 0, r1: 0, dur: ms(300), lift: (i % 2 ? -1 : 1) * pu * 0.28, keep: true, land: false });
      }));
      at = next;
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    }
    // 一张张平着落回牌堆顶
    await Promise.all(nodes.map((n, i) => {
      if (!n) return null;
      const rr = n.getBoundingClientRect();
      n.remove();
      return fx.fly({ html: backHtml(), from: rr, to: deckTopRect(), w: pu, s0: rr.width / pu, s1: 1, r0: 0, r1: 0, dur: ms(260), delay: (k - 1 - i) * ms(70), lift: 10 });
    }));
    if (t !== token) return;
    if (ov) ov.lifted -= k;
    snd('thud');
    renderPiles();
  }
  function pickDialog() {
    const s = game.state;
    const by = {};
    for (const id of s.discard) { const k = R.KIND_OF[id]; if (k !== R.BOOM) (by[k] = by[k] || []).push(id); }
    const kinds = R.KINDS.filter((k) => by[k]);
    // 只列有哪几种（只能拿一张，每种有几张不重要）
    openStage('<h2>从弃牌堆捡一张</h2>' +
      '<div class="zm-grid" data-stagger>' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '</button>').join('') + '</div>', (d) => {
      d.classList.add('is-cards');
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
    // 牌堆有几张就画几张（叠得紧一点），左边几张 = 真的在它上面几张
    const n = size;
    const slotOf = (p) => p;
    let fanHtml = '';
    for (let i = 0; i < n; i++) fanHtml += backHtml();
    snd('ask');
    const limit = size ? dlgLimit() : 0;
    const badge = (p) => (p === 0 ? '顶' : p === size ? '底' : String(p + 1));
    // 2026-11-12 用户定稿（甲）：直接在牌堆上按住左右拖炸毛猫（或点哪道缝塞哪），炸毛猫头上小红标写第几张；只留「随机」「塞进去」
    const timerHtml = limit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '';
    const body = '<h2 class="zm-ins-h">塞回牌堆</h2>' +
      '<div class="zm-insert-fan is-solo is-drag" data-fan>' + fanHtml + cardHtml('boom', 'is-kit') + '<span class="zm-ins-badge" data-badge>' + badge(0) + '</span></div>' +
      '<div class="zm-actions is-tight">' + (size ? '<button type="button" class="zm-btn" data-q="rand">随机</button>' : '') + '<button type="button" class="zm-btn zm-btn-primary' + (limit ? ' zm-timed' : '') + '" data-ok data-focus>' + timerHtml + '<b>塞进去</b></button></div>';
    openStage(body, (d) => {
      const range = d.querySelector('[data-range]');
      const fan = d.querySelector('[data-fan]');
      const kit = fan.querySelector('.is-kit');
      const backs = Array.from(fan.querySelectorAll('.zm-card.is-back'));
      // 摆位置：第 k 道缝左边的牌靠左、右边的牌整体右移一个炸毛猫宽，炸毛猫落在缝里（只改 transform，有过渡，看着是牌在让）
      const layout = () => {
        const k = slotOf(pos), W = fan.clientWidth, kw = kit.offsetWidth, cw = backs.length ? backs[0].offsetWidth : 0;
        const step = n > 1 ? Math.max(2.5, Math.min(cw * 0.45, (W - 2 * cw - kw - 12) / Math.max(1, n - 2))) : 0;
        const gap = !n ? kw : (k === 0 || k === n) ? kw + 12 : kw + 12 + (cw - step);
        const total = n ? cw + (n - 1) * step + gap : kw;
        const x0 = Math.max(0, (W - total) / 2);
        backs.forEach((c, i) => { c.style.transform = 'translateX(' + (x0 + i * step + (i >= k ? gap : 0)).toFixed(1) + 'px)'; });
        const kx = k === 0 ? x0 + 6 : x0 + (k - 1) * step + cw + 6;
        kit.style.transform = 'translateX(' + kx.toFixed(1) + 'px) translateY(-10px)';
        const bd = fan.querySelector('[data-badge]');
        if (bd) { bd.textContent = badge(pos); bd.style.transform = 'translateX(' + (kx + kw / 2).toFixed(1) + 'px)'; }
        geo = { x0, step, cw, n };
      };
      let geo = null;
      const set = (p) => {
        const prev = slotOf(pos);
        pos = Math.max(0, Math.min(size, p));
        if (range) range.value = pos;
        if (slotOf(pos) !== prev) { fan.classList.add('is-anim'); layout(); snd('tick'); }
      };
      requestAnimationFrame(layout);
      if (range) range.addEventListener('input', () => set(+range.value));
      // 甲：在扇面上按住左右拖（或点一下）＝把炸毛猫挪到手指底下那道缝
      if (fan.classList.contains('is-drag')) {
        const slotAt = (cx) => {
          if (!geo || !n) return 0;
          const x = cx - fan.getBoundingClientRect().left - geo.x0 - geo.cw / 2;
          return Math.round(Math.max(0, Math.min(n, x / Math.max(1, geo.step) + 0.5)));
        };
        let dragging = false;
        fan.addEventListener('pointerdown', (e) => { dragging = true; fan.setPointerCapture(e.pointerId); set(slotAt(e.clientX)); });
        fan.addEventListener('pointermove', (e) => { if (dragging) set(slotAt(e.clientX)); });
        const up = () => { dragging = false; };
        fan.addEventListener('pointerup', up); fan.addEventListener('pointercancel', up);
      }
      // 定下来：三个快捷键点了就直接塞（不用再点「塞进去」）；拖滑块的要点「塞进去」；倒计时到了 = 随机塞
      let done = false, timer = 0, tick = 0;
      const okBtn = d.querySelector('[data-ok]');
      const commit = (p) => {
        if (done || !okBtn.isConnected) return;   // 弹窗已经被关掉（托管 / 暂停）就不算数
        if (tut && tut.allow && !tut.allow({ type: 'insert', pos: p })) { shake(d.querySelector('[data-ok]')); return; }
        done = true; clearTimeout(timer); clearInterval(tick);
        if (p !== pos) set(p);
        closeDialog();
        apply(0, { type: 'insert', pos: p });
      };
      d.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        const q = b.dataset.q;
        commit(q === 'end' ? size : q === 'rand' ? (Math.random() * (size + 1)) | 0 : +q);
      }));
      d.querySelector('[data-ok]').addEventListener('click', () => commit(pos));
      if (limit) {
        const my = token, bar = d.querySelector('.zm-dlg-timer');
        const a = bar.querySelector('i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: limit, easing: 'linear', fill: 'forwards' });
        void a;
        setTimeout(() => {
          if (my !== token || done) return;
          bar.classList.add('is-hurry');
          snd('tick');
          tick = setInterval(() => { if (my !== token || done) { clearInterval(tick); return; } snd('tick'); }, 1000);
        }, Math.max(0, limit - HURRY_MS));
        timer = setTimeout(() => { if (my === token && !done && okBtn.isConnected) { timeouts += 1; autoAct = true; commit((Math.random() * (size + 1)) | 0); if (timeouts >= 2) setAutopilot(true); } }, limit);
      }
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
  // 前三名奖章：金 / 银 / 铜（金属渐变圆牌 + 一条小绶带 + 名次数字）
  const MEDALS = [['#fff1bf', '#e5b552', '#9a6a1f', '#c8463a'], ['#ffffff', '#c9ccd2', '#7d838c', '#2f4a6d'], ['#ffd9b8', '#c98a55', '#7c4a22', '#4f8a5f']];
  function medal(i) {
    const [a, b, c, rib] = MEDALS[i], id = 'zmMd' + i;
    return '<svg class="zm-medal" viewBox="0 0 40 44" aria-label="第 ' + (i + 1) + ' 名"><defs><radialGradient id="' + id + '" cx=".35" cy=".3" r=".85">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient></defs>' +
      '<path d="M12 2h7l-4 14h-7z" fill="' + rib + '"/><path d="M28 2h-7l4 14h7z" fill="' + rib + '" opacity=".8"/>' +
      '<circle cx="20" cy="28" r="13" fill="url(#' + id + ')" stroke="' + c + '" stroke-width="1.4"/>' +
      '<circle cx="20" cy="28" r="9.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>' +
      '<text x="20" y="32.6" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="' + c + '">' + (i + 1) + '</text></svg>';
  }
  async function finish() {
    busy = true;
    bgm('end');
    const s = game.state;
    clearStage();
    renderAll();
    const order = [s.winner].concat(s.outOrder.slice().reverse());
    const won = s.winner === 0;
    const ok = await celebrate(s.winner);
    if (!ok) return;
    if (game.tutorial && tut && tut.mini) { showCoach(tut.finish ? tut.finish(won) : [], lessonDone); return; }
    if (game.tutorial) {
      markLesson('basic');
      const msgs = tut && tut.finish ? tut.finish(won) : [];
      showCoach(msgs, () => {
        bgm('menu');
        openDialog('<h2>教程完成</h2><p>来一局真的吧：' + settings.players + ' 人，机器猫' + AI.TIER_NAMES[settings.tier] + '（菜单里的设置可以改）。</p>' +
          '<div class="zm-actions"><button type="button" class="zm-btn" data-home>回到主页面</button><button type="button" class="zm-btn zm-btn-primary" data-go data-focus>开始对局</button></div>', (d) => {
          d.querySelector('[data-go]').addEventListener('click', () => { closeDialog(); endTutorial(true); });
          d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); endTutorial(false); });
        });
      });
      return;
    }
    localStorage.removeItem(STORE_KEY);
    bgm('menu');   // 结算页算游戏外：接上丁（一局结束时先淡出，皇冠彩纸放完、排行榜出来再起）
    openDialog('<h2>排行榜</h2>' +
      '<ol class="zm-rank" data-stagger>' + order.map((seat, i) => '<li class="' + (seat === 0 ? 'is-me' : '') + '"><span class="pos">' + (i < 3 ? medal(i) : i + 1) + '</span><span class="mini">' + avatarHtml(seat) + '</span><span class="nm">' + esc(nameOf(seat)) + (seat === 0 ? '<small>（我）</small>' : '') + '</span><span class="tag">' + (i === 0 ? '胜利' : '第 ' + (i + 1) + ' 名') + '</span></li>').join('') + '</ol>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-home>回到主页面</button><button type="button" class="zm-btn zm-btn-primary" data-again data-focus>再来一局</button></div>', (d) => {
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
      li('nope', '作废别人刚出的牌（不管轮没轮到你）。也能作废别人的「作废」，叠了单数张 = 作废。挡不了炸毛猫和逗猫棒') +
      li('attack', '结束回合、不摸牌，下家连着摸两回合（被甩锅的人再甩锅：剩下的回合 +2 一起甩走，可以一路越叠越多）') +
      li('tattack', '同甩锅，但可以甩给任意一个人（点他的头像）') +
      li('skip', '结束一个回合、不摸牌。被甩锅时只顶掉其中一回合') +
      li('reverse', '出牌方向倒过来（对手之间的小箭头跟着掉头），并像跳过一样结束一个回合、不摸牌。被甩锅时只顶掉其中一回合；两个人玩就等于跳过') +
      li('swap', (() => { const r = (game && game.state && game.state.rules) || settings.rules; return '和指定的一个人整手交换手牌' + (r.swapDefuse ? '（连逗猫棒一起换）' : '（各自的逗猫棒不换）') + (r.swap ? '' : '。设置里开了「有交换牌」才有'); })()) +
      li('favor', '指定一人，他自己挑一张给你') +
      li('shuffle', '把牌堆洗乱') +
      li('future', '看牌堆最上面三张') +
      li('bottom', '这一回合不从顶上摸，改从牌堆最底下摸一张') +
      li('alter', '看牌堆最上面三张，并按你想要的顺序放回去（别人看不到）') +
      '</ul><h3>组合（任何同名牌都算）</h3><ul>' +
      '<li><b>两张一样</b>　指定一人，随机偷他一张</li>' +
      '<li><b>三张一样</b>　指定一人并点名一种牌，他有就得给你</li>' +
      '<li><b>五种猫各一张</b>　橘猫、三花、奶牛猫、狸花、暹罗凑齐：从弃牌堆捡任意一张（行动牌、作废不算）</li>' +
      '<li>橘猫、三花、奶牛猫、狸花、暹罗本身没用，专门凑组合</li></ul>' +
      '<ul>' + li('wild', '能顶任何一种猫：和一只猫凑成两张一样 / 三张一样，五种猫缺哪种也能拿它顶；两张万能猫也算一对。单出没用') + '</ul>' +
      '<h3>操作</h3><ul><li>点手牌选中（可多选），再点「出牌」；需要指定人时，能选的人头像会亮，点他的头像。</li>' +
      '<li>不想出牌就点「摸牌」结束回合。轮到你时头像外有一圈红环在收，收完还没动就自动替你摸一张（设置里可改成不限时）。</li>' +
      '<li>别人出的牌落在弃牌堆上时，下面那根导火索在烧：你手里有「作废」就会出现紫色按钮，烧完之前点它。</li></ul></div>';
  }
  function showRules() {
    openDialog(rulesHtml() + '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>好</button></div>', (d) => {
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
    });
  }

  /* 设置（2026-11-12 用户定稿「卡片 + 开关」，参考拱猪）：上面一张卡放人数 / 机器猫 / 限时，下面「玩法」卡每条一个牌面小图标 + 开关。
   * 和拱猪一样点了立刻生效、存下来，不再有「取消 / 保存」；规则从下一局起生效，局中改了规则「重开一局」变红 */
  const DECK_OPTS = [['quick', '快局'], ['std', '标准'], ['more', '多']];
  function showSettings(fromCover) {
    const segs = (key, opts, val) => '<div class="zs-seg" data-seg="' + key + '" role="group">' + opts.map(([v, t]) => '<button type="button" data-v="' + v + '" aria-pressed="' + (String(v) === String(val)) + '">' + t + '</button>').join('') + '</div>';
    const sw = (key, on) => '<button type="button" class="zs-switch" data-sw="' + key + '" role="switch" aria-checked="' + !!on + '"><i></i></button>';
    const tier = segs('tier', AI.TIERS.map((t) => [t, AI.TIER_NAMES[t]]), settings.tier);
    const secs = segs('turnSec', [[10, '10 秒'], [20, '20 秒'], [0, '不限时']], turnSec());
    const rulesBefore = JSON.stringify(settings.rules);
    const row = (k, title, note, ctl) => '<div class="zs-row"><i class="zs-ic">' + ART.icon(k) + '</i><div class="zs-txt"><b>' + title + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</div>' + ctl + '</div>';
    let html = '<h2>设置</h2>' +
      '<section class="zs-card">' +
      '<div class="zs-line"><span>机器猫</span>' + tier + '</div>' +
      '<div class="zs-line"><span>出牌限时</span>' + secs + '</div></section>' +
      '<div class="zs-cap">玩法</div><section class="zs-card">' +
      // 牌量（2026-11-13 用户：牌太多、炸毛猫太稀）：标准 ≈ 官方密度（默认）/ 快局更短 / 多 = 以前的整副
      '<div class="zs-line"><span>牌量</span>' + segs('deckSize', DECK_OPTS, R.normalizeRules(settings.rules).deckSize) + '</div>' +
      row('swap', '有交换牌', '', sw('swap', settings.rules.swap)) +
      // 交换连逗猫棒一起换（2026-11-13 用户：以前玩的是整副手牌全换）；没开交换牌时这行藏着
      row('defuse', '交换时逗猫棒也换', '', sw('swapDefuse', settings.rules.swapDefuse)).replace('<div class="zs-row"', '<div class="zs-row" data-dep="swap"' + (settings.rules.swap ? '' : ' hidden')) +
      '</section>';
    const pref = '<div class="zs-cap">操作</div><section class="zs-card">' +
      row('nope', '「作废」只在和我有关时询问', '', '<button type="button" class="zs-switch" data-pref="nopeMine" role="switch" aria-checked="' + !!settings.nopeMine + '"><i></i></button>') +
      '</section>';
    // 联机：机器猫 / 规则由房主定，这里只有自己的操作偏好
    // 联机：机器猫 / 规则由房主定，这里只有自己的偏好——「作废」怎么问、观战的人能不能看我的手牌（坐着的人才有）
    const meP = online && online.st ? online.st.players.find((p) => p.id === online.st.me && !p.left) : null;
    const revealRow = meP ? row('future', '观战者能看我的手牌', '即时生效；开局就开着、中途没关过，出局后才能看机器猫的牌', '<button type="button" class="zs-switch" data-online-reveal role="switch" aria-checked="' + !!meP.showHand + '"><i></i></button>') : '';
    if (online) html = '<h2>设置</h2>' + pref.replace('</section>', revealRow + '</section>');
    else html += pref;
    html += '<p class="zs-note" data-rule-note hidden>规则从下一局起生效</p><div class="zm-actions">' +
      (fromCover || !game || game.tutorial || online ? '' : '<button type="button" class="zm-btn" data-restart>重开一局</button>') +
      '<button type="button" class="zm-btn zm-btn-primary" data-close data-focus>好</button></div>';
    openDialog(html, (d) => {
      d.classList.add('zs', 'zs-b');
      const persist = () => { settings.rules = R.normalizeRules(settings.rules); saveSettings(); refreshCover(); syncNote(); };
      const syncNote = () => {
        const differs = !fromCover && game && !game.tutorial && JSON.stringify(settings.rules) !== rulesBefore;
        d.querySelector('[data-rule-note]').hidden = !differs;
        const rb = d.querySelector('[data-restart]');
        if (rb) rb.classList.toggle('zm-btn-primary', !!differs);
      };
      d.querySelectorAll('[data-seg]').forEach((g) => g.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-v]');
        if (!b) return;
        g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        fx.pop(b, { scale: 1.06, dur: 200 });
        const key = g.dataset.seg, v = b.dataset.v;
        if (key === 'players') settings.players = +v;
        else if (key === 'tier') settings.tier = v;
        else if (key === 'turnSec') settings.turnSec = +v;
        else if (key === 'stackAttack' || key === 'swap' || key === 'swapDefuse') settings.rules[key] = v === 'true';
        else settings.rules[key] = v;
        persist();
      }));
      d.querySelectorAll('[data-online-reveal]').forEach((b) => b.addEventListener('click', () => {
        const on = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(on));
        snd('tap');
        onlineAct('reveal', { on });
      }));
      d.querySelectorAll('[data-pref]').forEach((b) => b.addEventListener('click', () => {
        const on = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(on));
        settings[b.dataset.pref] = on;
        saveSettings();
        snd('tap');
      }));
      d.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
        const on = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(on));
        const k = b.dataset.sw;
        settings.rules[k] = k === 'extraDefuse' ? (on ? 'all' : 'two') : on;
        d.querySelectorAll('[data-dep="' + k + '"]').forEach((x) => { x.hidden = !on; });
        snd('tap');
        persist();
      }));
      d.querySelector('[data-close]').addEventListener('click', closeDialog);
      const rb = d.querySelector('[data-restart]');
      if (rb) rb.addEventListener('click', () => { closeDialog(); newGame(); });
      syncNote();
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
    profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    cover: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.5 9.5v10h11v-10"/><path d="M10 19.5v-5h4v5"/>',
    exit: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    invite: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5l1.6-1.6a3.8 3.8 0 0 1 5.4 5.4L16.4 12M13 17.5l-1.6 1.6a3.8 3.8 0 0 1-5.4-5.4L7.6 12"/>',
    leave: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
  };
  function menuItems() {
    const exit = FROM_SITE ? [['exit', '返回百宝奇巧']] : [];
    if (game && game.tutorial) return [['skip', tut && tut.mini ? '退出本关' : '跳过教程'], ['rules', '规则'], ['line'], ['cover', '回到主菜单'], ...exit];
    if (online) return [['invite', '房间号 / 邀请'], ['profile', '改名字 / 头像'], ['settings', '设置'], ['rules', '规则'], ['line'], ['leave', '离开房间']];
    return [
      ...(canPause() ? [['pause', '暂停']] : []),
      ['restart', '重新开一局'],
      ['profile', '改名字 / 头像'],
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
    else if (k === 'profile') showProfile();
    else if (k === 'rules') showRules();
    else if (k === 'tutorial') startTutorial();
    else if (k === 'skip') skipTutorial();
    else if (k === 'pause') pauseGame();
    else if (k === 'cover') { if (game && game.tutorial) quitTutorial(); else showCover(); }
    else if (k === 'exit') location.href = '/toolbox/';
    else if (k === 'invite') showInvite();
    else if (k === 'leave') { if (confirm(game && game.online && !game.over && game.state.alive[0] ? '离开房间？这一局交给机器猫替你打完' : '离开房间？')) leaveOnline(true); }
  }
  /* 「观战者能看我的手牌」：每人自己定，默认不给看；联机时在「设置」里改，自己的牌一拨就生效（2026-11-13 用户改规则）。
   * 也决定我出局后能不能看机器猫的牌：开局时就开着、这局里一次都没关过，才能看机器猫（中途关过一次，这局就看不到了） */
  function myPlayer() { const st = online && online.st; return st ? st.players.find((p) => p.id === st.me && !p.left) || null : null; }
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
    return !!(game && !game.tutorial && !game.online && !game.dealing && game.state.phase !== 'over' && els.cover.hidden && !coachQueue);
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
    // 不写「暂停」二字：正中一个大大的暂停图标，左下「回到主页面」，右下「继续」（带个播放三角）
    openDialog('<div class="zm-pause-cat" aria-hidden="true">' + ART.face(R.SKIP) + '</div><p class="zm-pause-say">小咪打个盹…</p>' +
      '<div class="zm-pause-ic" aria-label="暂停"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><rect x="34" y="28" width="11" height="44" rx="3.5"/><rect x="55" y="28" width="11" height="44" rx="3.5"/></svg></div>' +
      '<div class="zm-pause-actions"><button type="button" class="zm-btn" data-home>回到主页面</button>' +
      '<button type="button" class="zm-btn zm-btn-primary" data-go data-focus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>继续</button></div>', (d) => {
      d.classList.add('is-pause');
      d.querySelector('[data-go]').addEventListener('click', () => { closeDialog(); renderAll(); schedule(260, step); });
      d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); showCover(); });
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && canPause() && els.mask.hidden) pauseGame();
  });
  function refreshTools() {
    $('zmPauseBtn').hidden = !(game && !game.tutorial && !game.online && els.cover.hidden);
    syncSocialUi();
  }

  /* ───── 牌桌互动：点别人头像扔道具、顶栏「说一句」（照拱猪，2026-11-13）─────
   * 面板 / 飞行 / 气泡 / 冷却 / 屏蔽复用拱猪的 gongzhu-social.js；道具画、台词、落地效果在 zhamao-social.js。
   * 单机：机器猫挨了道具有时回一句、偶尔扔回来。联机：要等服务器支持（回过互动序号 fxSeq）才露出来。
   * 教程里不出；观战的人只看不发（点头像仍是换视角）；出牌选目标时点头像照旧是选人 */
  let social = null;
  const mutedIds = new Set();   // 联机里屏蔽了谁（只记在这一次打开的页面里）
  /* 长轮询带回来的互动：第一次只记下序号（不重放进房间前的）；我自己发的本机已经画过了 */
  function onFx(res) {
    const first = online.fxSeq == null;
    if (!first && res.fxSeq <= online.fxSeq) return;
    online.fxSeq = res.fxSeq;
    if (first) { syncSocialUi(); if (inLobby()) renderLobby(online.st); }
    if (first || !social || !Array.isArray(res.fx)) return;
    const mine = online.st ? online.st.mySeat : -1;
    if (inLobby()) {   // 大厅：只有说话
      for (const e of res.fx) if (e && e.t === 'c' && e.from !== mine) social.play({ kind: 'chat', from: lobbyLoc(e.from), text: e.text }, { echo: true, delay: e.delay || 0 });
      return;
    }
    if (!game || !game.online) return;
    for (const e of res.fx) {
      if (!e || (!game.spectator && e.from === mine)) continue;
      const from = locOf(e.from);
      const ev = e.t === 'p' ? { kind: 'prop', from, to: locOf(e.to), prop: e.prop } : { kind: 'chat', from, text: e.text };
      social.play(ev, { echo: true, delay: e.delay || 0 });
    }
  }
  // 大厅里也能「说一句」（只说话，不扔道具）：座位按服务器座位号摆，我当 0 号、别人按座位差算
  const LOBBY_N = 9;
  const inLobby = () => !!(online && online.st && online.st.phase === 'lobby' && lobbyEl && !lobbyEl.hidden);
  const lobbyBase = () => (online && online.st && online.st.mySeat >= 0 ? online.st.mySeat : 0);
  const lobbySrv = (l) => (l + lobbyBase()) % LOBBY_N;
  const lobbyLoc = (srv) => (srv - lobbyBase() + LOBBY_N) % LOBBY_N;
  const lobbyPlayer = (l) => (online && online.st ? online.st.players.find((p) => p.seat === lobbySrv(l) && !p.left) || null : null);
  /* 互动框 / 说一句框像对话气泡一样长一个小尖角，指着点的那个头像 / 说一句键（2026-11-13 用户：框和点的东西之间要有衔接）。
   * 框已经按头像摆好了（gongzhu-social placePop）：看它在头像哪一边，就在那条边上、对着头像中心长尖角 */
  function popTail(anchor) {
    const p = els.app.querySelector('.gz-social-pop');
    if (!p || !anchor) return;
    // 框摆在头像下面时，往下挪到整个座位（名字、档位签）下面，别盖住名字
    const seat = anchor.closest && anchor.closest('.zm-seat');
    if (seat) {
      const r0 = p.getBoundingClientRect(), sr = seat.getBoundingClientRect(), av = anchor.getBoundingClientRect();
      if (r0.top >= av.top + av.height / 2 && sr.bottom + 12 + r0.height < innerHeight - 8) p.style.top = Math.round(sr.bottom + 12) + 'px';
    }
    const pr = p.getBoundingClientRect(), ar = (seat || anchor).getBoundingClientRect();
    const avr = anchor.getBoundingClientRect(), ax = avr.left + avr.width / 2, ay = avr.top + avr.height / 2;
    const side = pr.top >= ar.bottom - 4 ? 'top' : pr.bottom <= ar.top + 4 ? 'bottom' : pr.left >= ar.right - 4 ? 'left' : 'right';
    const off = side === 'top' || side === 'bottom' ? Math.max(20, Math.min(pr.width - 20, ax - pr.left)) : Math.max(20, Math.min(pr.height - 20, ay - pr.top));
    p.dataset.tail = side;
    p.style.setProperty('--tail', off.toFixed(0) + 'px');
  }
  function socialOk() {
    if (inLobby()) return !online.st.spectator && online.st.mySeat >= 0 && online.fxSeq != null;
    if (!game || game.tutorial || !game.state || !els.cover.hidden) return false;
    if (game.online) return !!(online && online.fxSeq != null && !game.spectator);
    return true;
  }
  function syncSocialUi() {
    const ok = !!social && socialOk();
    const btn = $('zmChatBtn');
    if (btn) btn.hidden = !ok;
    els.app.classList.toggle('can-social', ok);
    if (!ok && social) social.close();
  }
  function initSocial() {
    if (!window.GongzhuSocial || !window.ZhamaoSocialKit) return;
    const SFX = { whoosh: 'whoosh', bubble: 'tick', pfish: 'ding', pyarn: 'thud', pcatnip: 'tick', pspray: 'untap', ppaw: 'tick', pboom: 'boom' };
    social = GongzhuSocial.create({
      kit: ZhamaoSocialKit,
      root: els.app,
      avatar: (l) => (inLobby() ? lobbyEl.querySelector('.zm-lseat[data-seat="' + lobbySrv(l) + '"] .av') : avEl(l)),
      name: (l) => (inLobby() ? (lobbyPlayer(l) || {}).nick || '' : nameOf(l)),
      canSend: socialOk,
      // 联机：我发的本机先画，同时发给服务器（座位换成服务器座位号）；别人的跟长轮询来（onFx）
      send(ev) {
        if (inLobby() && ev.kind === 'chat') { NET.emote(online.code, online.token, { text: ev.text }).catch((e) => { if (e && e.status === 429) toast('慢一点，歇一下再发'); }); return; }
        if (!game || !game.online || !online) return;
        const body = ev.kind === 'prop' ? { to: srvOf(ev.to), prop: ev.prop } : { text: ev.text };
        NET.emote(online.code, online.token, body).catch((e) => { if (e && e.status === 429) toast('慢一点，歇一下再发'); });
      },
      autoBots: () => !!(game && !game.online),
      isBot: (l) => (game && game.online ? !!(playerAt(srvOf(l)) && (playerAt(srvOf(l)).isAi || playerAt(srvOf(l)).left)) : l > 0),
      mutable: (l) => { const p = game && game.online ? playerAt(srvOf(l)) : null; return !!(p && !p.isAi); },
      muted: (l) => { const p = game && game.online ? playerAt(srvOf(l)) : null; return !!(p && mutedIds.has(p.id)); },
      setMuted(l, on) {
        const p = game && game.online ? playerAt(srvOf(l)) : null;
        if (!p) return;
        if (on) mutedIds.add(p.id); else mutedIds.delete(p.id);
        toast(on ? '已屏蔽' + p.nick + '的互动' : '不再屏蔽' + p.nick);
      },
      sfx: (name, delay) => { if (SFX[name]) snd(SFX[name], delay); },
      reduce: () => fx.reduce(),
      popSide: (l) => (l === 0 ? 'above' : 'below'),
    });
    $('zmChatBtn').addEventListener('click', (e) => { e.stopPropagation(); if (socialOk()) { social.openChat(e.currentTarget); popTail(e.currentTarget); } });
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
    els.app.classList.add('is-coaching');   // 讲解（照拱猪）：字摆在正中，别的都蒙一层浅宣纸色
    // 正在讲的东西别蒙住：一句话可以写成 { t, focus: ['hand' | 'deck' | 'stage' | 'opps' | 'me' | 座位号…] }；
    // 桌上刚出的牌（舞台）只要还摆着就一直亮着（「老师出了【索要】」时得看得见那张索要）
    const text = typeof m === 'string' ? m : m.t;
    setCoachFocus((m && m.focus) || []);
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(text);
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
    els.app.classList.remove('is-coaching');   // 提示（等我操作）不蒙桌子
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(text);
    if (!was && !fx.reduce()) els.coach.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: 'ease-out' });
  }
  function hideCoach() { els.coach.hidden = true; els.coach.classList.remove('is-hint'); els.app.classList.remove('is-coaching'); setCoachFocus([]); }
  function setCoachFocus(list) {
    els.app.querySelectorAll('.is-coach-focus').forEach((x) => x.classList.remove('is-coach-focus'));
    const pick = (f) => (f === 'hand' ? els.hand : f === 'deck' ? els.deck.parentElement : f === 'stage' ? els.stage : f === 'opps' ? els.opps : f === 'me' ? els.me : typeof f === 'number' ? seatEl(f) : null);
    const all = list.slice();
    if (els.stage.querySelector('.zm-stage-inner')) all.push('stage');
    all.forEach((f) => { const el = pick(f); if (el) el.classList.add('is-coach-focus'); });
  }
  document.addEventListener('click', (e) => {
    if (coachQueue && !els.coach.hidden && !els.coach.classList.contains('is-hint') && !e.target.closest('.zm-dialog-mask, .zm-menu, .zm-tools, .zm-peek')) { e.stopPropagation(); nextCoach(); }
  }, true);
  document.addEventListener('keydown', (e) => { if (coachQueue && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nextCoach(); } });

  function resetTable() {
    if (social) social.clear();
    preview = null;
    if (game) game.previewSrc = null;
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
  /* 新手教程：教程脚本可以带 mini（不发牌、直接摆好）/ bots（对手）/ done（这一段讲完）——给以后的「一局学会全部」用 */
  const TUT_DONE_KEY = 'zm.tut.done.v1';
  function markLesson(id) {
    try { const d = new Set(JSON.parse(localStorage.getItem(TUT_DONE_KEY) || '[]')); d.add(id); localStorage.setItem(TUT_DONE_KEY, JSON.stringify([...d])); if (id === 'basic') localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
  }
  function lessonDone() {
    const id = game && game.lesson;
    if (id) markLesson(id);
    const L = TUT.LESSONS || [], i = L.findIndex((x) => x.id === id), next = i >= 0 && i + 1 < L.length ? L[i + 1] : null;
    bgm('menu');
    openStage('<h2>本关完成</h2>' + (next ? '<p class="zm-muted">下一关：' + esc(next.title) + '</p>' : '<p class="zm-muted">全部学完啦</p>') +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-list>回到主页面</button>' + (next ? '<button type="button" class="zm-btn zm-btn-primary" data-next data-focus>下一关</button>' : '<button type="button" class="zm-btn zm-btn-primary" data-play data-focus>开始对局</button>') + '</div>', (d) => {
      d.querySelector('[data-list]').addEventListener('click', () => { closeDialog(); leaveLesson(); showCover(); });
      const nb = d.querySelector('[data-next]'); if (nb) nb.addEventListener('click', () => { closeDialog(); startTutorial(next.id); });
      const pb = d.querySelector('[data-play]'); if (pb) pb.addEventListener('click', () => { closeDialog(); endTutorial(true); });
    });
  }
  function leaveLesson() { tut = null; els.skipTut.hidden = true; hideCoach(); coachQueue = null; resetTable(); game = null; }
  function startTutorial(id) {
    if (!TUT) return;
    id = id || 'basic';
    resetTable();
    viewSeat = -1; els.app.classList.remove('is-watching', 'is-spectator');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    const ctl = TUT.create(R, { hint, say: (msgs, then) => showCoach(msgs, then || step) }, id);
    tut = ctl;
    // 老师们的头像和我的撞了就换一个（我的头像也是猫的话，老师换成兔子 / 熊猫……）
    const spare = ['rabbit', 'panda', 'owl', 'bear'].filter((a) => a !== profile.avatar);
    const opp = (ctl.bots || [{ nick: ctl.botName, avatar: ctl.botAvatar }]).map((b, i) => (b.avatar === profile.avatar ? Object.assign({}, b, { avatar: spare[i % spare.length] }) : b));
    game = { state: ctl.state, bots: [{ nick: profile.nick, avatar: profile.avatar }].concat(opp), tiers: [null].concat(opp.map(() => 'normal')), tutorial: true, lesson: id };
    els.cover.hidden = true;
    els.skipTut.hidden = false;
    els.skipTut.textContent = ctl.mini ? '退出本关' : '跳过教程';
    bgm('game');
    buildSeats();
    solveSize();
    busy = true;
    const t = token;
    if (ctl.mini) {   // 小关卡：不发牌，局面直接摆好就讲
      game.dealing = false;
      release();
      renderAll();
      showCoach(ctl.intro, step);
      return;
    }
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
    if (tut && tut.mini) { leaveLesson(); showCover(); return; }   // 小段教程：退出回主页
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
    viewSeat = -1; els.app.classList.remove('is-watching', 'is-spectator');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    tut = null;
    els.skipTut.hidden = true;
    const n = settings.players;
    const st = R.createGame(n, (Math.random() * 2 ** 31) | 0, settings.rules);
    game = { state: st, bots: drawBots(n), tiers: [null].concat(Array(n - 1).fill(settings.tier)), tutorial: false };
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    busy = true;
    bgm('game');
    startWithDeal();
  }
  function resumeGame(d) {
    resetTable();
    viewSeat = -1; els.app.classList.remove('is-watching', 'is-spectator');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    game = { state: d.state, bots: d.bots, tiers: d.tiers, tutorial: false, fastOut: !d.state.alive[0] };
    game.bots[0] = { nick: profile.nick, avatar: profile.avatar };
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    renderAll();
    bgm('game');
    schedule(300, step);
  }
  // 主菜单上直接挑几个人（2–5，含你）；有存档时默认亮存档的人数、写「接着打上一局」，换个人数就是新开一局
  function refreshCover() {
    $('zmCoverSolo').textContent = '';   // 单机键下面不写说明（用户：已经很直接了）
    refreshSolo();
    let seen = true;
    try { seen = !!localStorage.getItem(TUT_KEY); } catch (_) { /* 无痕 */ }
    void seen;
    els.cover.querySelector('[data-cover="exit"]').hidden = !FROM_SITE;
    const sess = NET && NET.readSession(), rb = els.cover.querySelector('[data-cover="resume"]');
    if (rb) {   // 联机那一层：还在某个房间里 →「回到房间 1234」排第一个、朱红；「创建房间」退成普通键
      rb.hidden = !sess;
      rb.querySelector('b').textContent = sess ? '回到房间 ' + sess.code : '回到房间';
      els.cover.querySelector('[data-cover="create"]').classList.toggle('is-primary', !sess);
    }
    const ob = els.cover.querySelector('[data-cover="online"]');
    if (ob) ob.hidden = !NET;
  }
  /* 点「单机」之后那一屏（2026-11-12 用户挑的方案甲）：− 人数 +、下面一排头像（我 + 几只机器猫）、机器猫难度、开始；
   * 有上一局存档：最上面单独一行「接着打上一局」（以前是点单机直接接着打，想开新局得先点人数，不直观） */
  /* 二级菜单（单机 / 联机）左边一窄列放返回箭头（2026-11-13 用户挑：乙·朱红折号，去掉底下的圆，折号本身朱红、瘦长一些） */
  const BACK_ART = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24.5 6.5 13 20l11.5 13.5" fill="none" stroke="#b4392c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  els.cover.querySelectorAll('.zm-solo-back').forEach((b) => { b.innerHTML = BACK_ART; });
  let coverFrom = 'main';   // 选人数那一屏「‹ 返回」回哪：有上一局时回「接着打 / 开新的」那一步
  const SOLO_MAX = R.MAX_PLAYERS;   // 9 人（6 人起用两副牌）
  function refreshSolo() {
    const n = Math.max(R.MIN_PLAYERS, Math.min(SOLO_MAX, settings.players));
    $('zmSoloNum').innerHTML = n + '<small>人</small>';
    const [minus, plus] = els.cover.querySelectorAll('.zm-solo-step button');
    minus.disabled = n <= R.MIN_PLAYERS; plus.disabled = n >= SOLO_MAX;
    const faces = AV ? AV.ROBOT : [];
    const meFace = profile.avatar && AV && AV.byId[profile.avatar] ? AV.byId[profile.avatar].svg : '<span>我</span>';
    $('zmSoloFaces').innerHTML = '<i class="is-me">' + meFace + '</i>' + Array.from({ length: n - 1 }, (_, i) => '<i>' + (faces.length ? faces[i % faces.length].svg : '') + '</i>').join('');
    // 头像一排排不下就整体缩小（9 人时人数卡里放不下 9 个 34px 的头像；2026-11-13 用户：别超出宽度）；「你 + 几只机器猫」那行说明去掉
    const fw = $('zmSoloFaces').clientWidth || 200, lap = 7;
    $('zmSoloFaces').style.setProperty('--fs', Math.min(34, Math.floor((fw + (n - 1) * lap) / n)) + 'px');
    $('zmSoloTier').innerHTML = AI.TIERS.map((t) => '<button type="button" data-tier="' + t + '" aria-pressed="' + (t === settings.tier) + '">' + AI.TIER_NAMES[t] + '</button>').join('');
    const saved = loadSaved(), rb = els.cover.querySelector('[data-cover="resume-solo"]');
    // 单机菜单：有上一局才露「接着打上一局」（红键）；没有就「开始新的一局」当红键
    rb.hidden = !saved;
    els.cover.querySelector('[data-cover="fresh"]').classList.toggle('is-primary', !saved);
  }
  function soloStart() {
    let seen = false;
    try { seen = !!localStorage.getItem(TUT_KEY); } catch (_) { seen = true; }
    if (!seen && TUT) {
      openDialog('<h2>第一次玩？</h2><p>先花两分钟走一遍新手教程，跟着做就会了。</p><div class="zm-actions"><button type="button" class="zm-btn" data-skip>直接开始</button><button type="button" class="zm-btn zm-btn-primary" data-tut data-focus>看教程</button></div>', (d) => {
        d.querySelector('[data-tut]').addEventListener('click', () => startTutorial());
        d.querySelector('[data-skip]').addEventListener('click', () => { try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* */ } newGame(); });
      });
    } else newGame();
  }
  // 主菜单两步：先是一条进度条，跑完换成按钮
  const soloFoot = (on) => { const f = els.cover.querySelector('[data-cover-step="solo"] .zm-cover-foot'); if (f) f.hidden = !on; };
  function coverStep(k) {
    els.cover.querySelectorAll('[data-cover-step]').forEach((x) => { x.hidden = x.dataset.coverStep !== k; });
  }
  function showCover() {
    if (game && !game.tutorial && !game.dealing) save();
    resetTable();
    tut = null;
    els.skipTut.hidden = true;
    if (soundPanel) soundPanel.hidden = true;
    refreshCover();
    coverStep('main');
    els.cover.classList.remove('is-loading');
    els.cover.hidden = false;
    refreshTools();
    bgm('menu');
    coverIntro(false);
  }
  // 主菜单：标题一个字一个字落下来，按钮依次浮上来（只在进来那一次落字，回主菜单时只浮按钮）
  function coverIntro(title) {
    if (fx.reduce()) return;
    const h = els.cover.querySelector('.zm-cover-title');
    if (!h.querySelector('span')) h.innerHTML = Array.from(h.textContent).map((ch) => '<span>' + ch + '</span>').join('');
    if (title) h.querySelectorAll('span').forEach((sp, i) => sp.animate([{ transform: 'translateY(-26px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(4px) rotate(2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: 120 + i * 90, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
    const items = title ? els.cover.querySelectorAll('.zm-cover-art') : els.cover.querySelectorAll('.zm-cover-art, .zm-cover-btn:not([hidden]), .zm-cover-foot:not([hidden])');
    items.forEach((n, i) => n.animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: i === 0 ? 0 : (title ? 380 : 60) + i * 80, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }
  // 进度条跑完：按钮一个个浮上来
  // 进度条跑完：插画和标题往上滑到位，单机 / 联机跟着一个个浮上来
  function coverReveal() {
    coverStep('main');
    els.cover.classList.remove('is-loading');
    if (fx.reduce()) return;
    els.cover.querySelectorAll('[data-cover-step="main"] .zm-cover-btn:not([hidden]), .zm-cover-foot[data-cover-step="main"]:not([hidden])').forEach((n, i) => n.animate([{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 260 + i * 90, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }

  /* ═════════════ 联机（第二期，2026-11-12）═════════════
   * 服务器权威（backends/urge/lib/zhamao-room.js）：洗牌、校验、机器猫、超时都在服务器。网页只是「看」和「点」：
   *   · 座位旋转：自己永远是 0 号（坐下方），local = (server − base + n) % n；观战的人 base = 他坐在谁身后
   *   · 镜像牌局：game.state 是一份引擎形状的局面，看得见的牌是真的，看不见的（别人的手牌、牌堆）先用还没露面的牌号占着位。
   *     服务器每推来一步（同一个 act 的一组事件），先按事件改镜像（applyNet），再原样播单机那套动画（playEvents）。
   *     需要哪张牌露面时，就把它和占位的那张对调（putInHand / putTop），别人看不见的地方怎么摆都无所谓。
   *   · 一组播完、队列空了：拿镜像和服务器最新快照对一遍（sameAsSnapshot），对不上就按快照重摆（resync），不播动画
   *   · 我的操作（出牌 / 摸牌 / 作废 / 取消 / 给牌 / 塞回……）都发给服务器，等它推回事件再播；自己不先动 */
  const NET = window.ZhamaoNet && window.ZhamaoNet.ENABLED ? window.ZhamaoNet : null;
  let online = null;   // { code, token, st, base, n, matchNo, lastQueued, queue, playing, poll, pendingSrc, skew, inGame }
  const G = () => online && online.st && online.st.game;
  const locOf = (s) => (s == null || s < 0 || !online ? s : (s - online.base + online.n) % online.n);
  const srvOf = (l) => (l == null || l < 0 || !online ? l : (l + online.base) % online.n);
  const playerAt = (srvSeat) => online && online.st ? online.st.players.find((p) => p.seat === srvSeat && !(p.left && online.st.phase === 'lobby')) || null : null;
  const isHost = () => !!(online && online.st && online.st.hostId === online.st.me);
  function onlineRemain() {
    const g = G();
    if (!g || !g.deadline) return 0;
    const graceMs = g.graceMs != null ? g.graceMs : g.st.phase === 'react' ? 1200 : 3000;   // 服务器比网页多等的那一截（服务器发来的；老服务器没发就按以前的值）
    return Math.max(0, g.deadline - graceMs - (Date.now() + online.skew));
  }
  function toast(text) {
    let t = els.app.querySelector('.zm-toast');
    if (!t) { t = document.createElement('div'); t.className = 'zm-toast'; t.setAttribute('role', 'status'); els.app.appendChild(t); }
    t.textContent = text;
    t.classList.remove('is-on'); void t.offsetWidth; t.classList.add('is-on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ───── 镜像牌局 ───── */
  const ALL_IDS = Array.from({ length: R.DECK_SIZE }, (_, i) => i);
  const shuffled = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // o 已经是本地座位：{ n, rules, hand, counts, deckSize, kittens, discard, removed, known:[{pos,id}], handKnown, alive, outOrder, winner,
  //   turn, turnsLeft, phase, pending, give, pick, defuse, alter, steal, startDefuse, hideHand }
  function buildMirror(o) {
    const K = R.KIND_OF, n = o.n;
    const used = new Set(o.hand.concat(o.discard, o.removed, o.known.map((x) => x.id)));
    o.handKnown.forEach((h, i) => { if (i !== 0) h.forEach((id) => used.add(id)); });
    if (o.defuse && o.defuse.card != null) used.add(o.defuse.card);
    const pool = shuffled(ALL_IDS.filter((id) => !used.has(id) && (!R.inSecondDeck(id) || R.usesSecondDeck(n))));
    const take = (pred) => { const i = pool.findIndex(pred); return i >= 0 ? pool.splice(i, 1)[0] : null; };
    const hands = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 && !o.hideHand) { hands.push(o.hand.slice()); continue; }
      const h = i === 0 ? [] : o.handKnown[i].slice();
      if (o.startDefuse && !h.some((id) => K[id] === R.DEFUSE)) { const d = take((id) => K[id] === R.DEFUSE); if (d != null) h.push(d); }
      while (h.length < o.counts[i]) { const x = take((id) => K[id] !== R.BOOM && K[id] !== R.DEFUSE) ?? take((id) => K[id] !== R.BOOM); if (x == null) break; h.push(x); }
      hands.push(R.sortHand(h));
    }
    const deck = Array(o.deckSize).fill(null);
    for (const k of o.known) if (k.pos < deck.length) deck[k.pos] = k.id;
    let booms = deck.filter((id) => id != null && K[id] === R.BOOM).length;
    const free = shuffled(deck.map((x, i) => (x == null ? i : -1)).filter((i) => i >= 0));
    for (const i of free) {
      let id = null;
      if (booms < o.kittens) { id = take((x) => K[x] === R.BOOM); if (id != null) booms++; }
      if (id == null) id = take((x) => K[x] !== R.BOOM);
      if (id == null) id = take(() => true);
      deck[i] = id;
    }
    const memo = Array.from({ length: n }, () => ({ deck: [], hands: Array.from({ length: n }, () => []) }));
    memo[0].deck = o.known.map((x) => x.id);
    memo[0].hands = o.handKnown.map((h, i) => (i === 0 ? [] : h.slice()));
    const p = o.pending;
    return {
      n, rules: o.rules, rs: (Math.random() * 4294967296) >>> 0 || 1,
      deck, discard: o.discard.slice(), removed: o.removed.slice(), hands, alive: o.alive.slice(), outOrder: o.outOrder.slice(),
      turn: o.turn, turnsLeft: o.turnsLeft, phase: o.phase,
      pending: p ? { by: p.by, type: p.type, cards: p.cards.slice(), target: p.target, named: p.named, nopes: p.nopes.map((x) => ({ seat: x.seat, card: x.card })), passed: [] } : null,
      give: o.give, pick: o.pick, defuse: o.defuse,
      alter: o.alter ? { by: o.alter.by, cards: o.alter.cards ? o.alter.cards.slice() : deck.slice(0, o.alter.count) } : null,
      steal: o.steal ? { by: o.steal.by, from: o.steal.from, perm: shuffled(hands[o.steal.from].slice()) } : null,
      winner: o.winner, seq: 0, memo, dir: o.dir === -1 ? -1 : 1,
    };
  }
  // 服务器座位 → 本地座位
  const rotArr = (arr) => { const n = online.n, out = Array(n); for (let s = 0; s < n; s++) out[locOf(s)] = arr[s]; return out; };
  function mirrorFromSnapshot(g) {
    const st = g.st;
    const fixSeat = (x, keys) => { if (!x) return x; const o = Object.assign({}, x); keys.forEach((k) => { if (typeof o[k] === 'number') o[k] = locOf(o[k]); }); return o; };
    return buildMirror({
      n: g.n, rules: g.rules, hand: st.hand, counts: rotArr(st.counts), deckSize: st.deckSize, kittens: st.kittens,
      discard: st.discard, removed: st.removed, known: st.known, handKnown: rotArr(st.handKnown), alive: rotArr(st.alive),
      outOrder: st.outOrder.map(locOf), winner: locOf(st.winner), turn: locOf(st.turn), turnsLeft: st.turnsLeft, phase: st.phase, dir: st.dir,
      pending: st.pending ? Object.assign(fixSeat(st.pending, ['by', 'target']), { nopes: st.pending.nopes.map((x) => ({ seat: locOf(x.seat), card: x.card })) }) : null,
      give: fixSeat(st.give, ['from', 'to']), pick: fixSeat(st.pick, ['by']), defuse: fixSeat(st.defuse, ['by']),
      alter: fixSeat(st.alter, ['by']), steal: fixSeat(st.steal, ['by', 'from']),
      hideHand: !!game.hideHand,
    });
  }
  function mirrorFromDeal(g, e) {
    const n = g.n;
    return buildMirror({
      n, rules: g.rules, hand: e.hand || [], counts: Array(n).fill(5), deckSize: e.deckSize, kittens: e.kittens,
      discard: [], removed: e.removed || [], known: [], handKnown: Array.from({ length: n }, () => []), alive: Array(n).fill(true),
      outOrder: [], winner: -1, turn: e.turn, turnsLeft: 1, phase: 'act', pending: null, give: null, pick: null, defuse: null, alter: null, steal: null,
      startDefuse: true, hideHand: !!game.hideHand,
    });
  }
  const ROT_KEYS = ['seat', 'target', 'from', 'to', 'a', 'b', 'who', 'turn'];
  function rotEvent(e) {
    const o = Object.assign({}, e);
    for (const k of ROT_KEYS) if (typeof o[k] === 'number' && o[k] >= 0) o[k] = locOf(o[k]);
    return o;
  }
  // 让 id 出现在 seat 手里：和他手里一张「我不知道是什么」的占位牌对调
  function locate(s, id) {
    const d = s.deck.indexOf(id);
    if (d >= 0) return { arr: s.deck, i: d };
    for (const h of s.hands) { const i = h.indexOf(id); if (i >= 0) return { arr: h, i }; }
    return null;
  }
  // keep：这一步一起亮出来的几张（换替身时别把刚放进来的又换出去）
  function putInHand(s, seat, id, keep) {
    const h = s.hands[seat];
    if (h.indexOf(id) >= 0) return;
    const from = locate(s, id);
    const kn = s.memo[0].hands[seat] || [];
    let vi = -1;
    for (let i = 0; i < h.length; i++) if (seat !== 0 && kn.indexOf(h[i]) < 0 && R.KIND_OF[h[i]] !== R.BOOM && !(keep && keep.indexOf(h[i]) >= 0)) { vi = i; break; }
    if (vi < 0) { if (from) from.arr.splice(from.i, 1); h.push(id); return; }
    const victim = h[vi];
    h[vi] = id;
    if (from) from.arr[from.i] = victim;
  }
  // 让牌堆顶第 k 张是 id
  function putTop(s, k, id) {
    if (s.deck[k] === id) return;
    const from = locate(s, id);
    // 换出去的那张要进别人手里时不能是炸毛猫（手里不会有炸毛猫，牌堆里的炸毛猫数也会对不上）：先在牌堆里和一张普通占位对调
    if (from && from.arr !== s.deck && R.KIND_OF[s.deck[k]] === R.BOOM) {
      const kn = s.memo[0].deck;
      const ok = (x, i) => R.KIND_OF[x] !== R.BOOM && kn.indexOf(x) < 0 && x !== id;
      let j = s.deck.findIndex((x, i) => i > k && ok(x, i));   // 先往下找：上面几张可能刚摆好
      if (j < 0) j = s.deck.findIndex((x, i) => i !== k && ok(x, i));   // 摸的是最底下那张（抽底）：往上找
      if (j >= 0) { const x = s.deck[k]; s.deck[k] = s.deck[j]; s.deck[j] = x; }
    }
    const victim = s.deck[k];
    if (!from) { s.deck[k] = id; return; }
    s.deck[k] = id;
    from.arr[from.i] = victim;
  }
  // 牌堆顶要是一张不是炸毛猫的（别人摸走了、没炸）：顶上是占位的炸毛猫就和下面一张普通的占位对调
  function topNotBoom(s, at) {
    at = at || 0;
    if (R.KIND_OF[s.deck[at]] !== R.BOOM) return;
    const kn = s.memo[0].deck;
    for (let j = 0; j < s.deck.length; j++) if (j !== at && R.KIND_OF[s.deck[j]] !== R.BOOM && kn.indexOf(s.deck[j]) < 0) { const x = s.deck[at]; s.deck[at] = s.deck[j]; s.deck[j] = x; return; }
  }
  const takeAny = (s, seat, avoid) => { const h = s.hands[seat], kn = s.memo[0].hands[seat] || []; let i = h.findIndex((id) => kn.indexOf(id) < 0 && (!avoid || R.KIND_OF[id] !== avoid)); if (i < 0) i = h.length - 1; return h.splice(i, 1)[0]; };
  const forget = (s, id) => { for (const h of s.memo[0].hands) { const i = h.indexOf(id); if (i >= 0) h.splice(i, 1); } };
  function moveTo(s, to, id) { s.hands[to].push(id); s.hands[to] = R.sortHand(s.hands[to]); }
  // 按一条（已经转成本地座位的）事件改镜像——照着 zhamao-rules.js 里对应的那段写
  function applyNet(s, e) {
    const K = R.KIND_OF;
    switch (e.t) {
      case 'play': {
        for (const id of e.cards) putInHand(s, e.seat, id, e.cards);
        for (const id of e.cards) { const h = s.hands[e.seat]; h.splice(h.indexOf(id), 1); s.discard.push(id); forget(s, id); }
        s.seq += 1;
        s.pending = { by: e.seat, type: e.type, cards: e.cards.slice(), target: e.target, named: e.named, nopes: [], passed: [] };
        s.phase = 'react';
        break;
      }
      case 'nope': {
        putInHand(s, e.seat, e.card);
        const h = s.hands[e.seat]; h.splice(h.indexOf(e.card), 1); s.discard.push(e.card); forget(s, e.card);
        if (s.pending) { s.pending.nopes.push({ seat: e.seat, card: e.card }); s.pending.passed = []; }
        s.seq += 1;
        break;
      }
      case 'resolve': s.pending = null; s.phase = 'act'; break;
      case 'turn': s.turn = e.seat; s.turnsLeft = e.turnsLeft; s.phase = 'act'; break;
      case 'reverse': s.dir = e.dir === -1 ? -1 : 1; break;
      case 'shuffle': shuffled(s.deck); s.memo[0].deck = []; break;
      case 'future': case 'alter': {
        const k = e.cards ? e.cards.length : e.count;
        if (e.cards) { e.cards.forEach((id, j) => putTop(s, j, id)); e.cards.forEach((id) => { if (s.memo[0].deck.indexOf(id) < 0) s.memo[0].deck.push(id); }); }
        if (e.t === 'alter') { s.phase = 'alter'; s.alter = { by: e.seat, cards: s.deck.slice(0, k) }; }
        break;
      }
      case 'altered': {
        if (e.cards) e.cards.forEach((id, j) => putTop(s, j, id));
        else s.memo[0].deck = s.memo[0].deck.filter((id) => (s.alter ? s.alter.cards.indexOf(id) < 0 : true));
        s.alter = null; s.phase = 'act';
        break;
      }
      case 'swap': {
        const keepOf = (seat) => s.hands[seat].filter((id) => K[id] === R.DEFUSE);
        let mA, mB;
        if (e.cardsA) { e.cardsA.forEach((id) => putInHand(s, e.a, id, e.cardsA)); mA = e.cardsA.slice(); } else mA = s.hands[e.a].filter((id) => K[id] !== R.DEFUSE).slice(0, e.toB);
        if (e.cardsB) { e.cardsB.forEach((id) => putInHand(s, e.b, id, e.cardsB)); mB = e.cardsB.slice(); } else mB = s.hands[e.b].filter((id) => K[id] !== R.DEFUSE).slice(0, e.toA);
        // 别人的占位手牌可能凑不出这么多「不是逗猫棒」的：从剩下的里补
        while (mA.length < e.toB && s.hands[e.a].length > mA.length) mA.push(s.hands[e.a].find((id) => mA.indexOf(id) < 0));
        while (mB.length < e.toA && s.hands[e.b].length > mB.length) mB.push(s.hands[e.b].find((id) => mB.indexOf(id) < 0));
        const restA = s.hands[e.a].filter((id) => mA.indexOf(id) < 0), restB = s.hands[e.b].filter((id) => mB.indexOf(id) < 0);
        void keepOf;
        s.hands[e.a] = R.sortHand(restA.concat(mB)); s.hands[e.b] = R.sortHand(restB.concat(mA));
        for (const id of mA.concat(mB)) forget(s, id);
        break;
      }
      case 'askGive': s.phase = 'give'; s.give = { from: e.from, to: e.to }; break;
      case 'give': {
        let id = e.card;
        if (id != null) { putInHand(s, e.from, id); const h = s.hands[e.from]; h.splice(h.indexOf(id), 1); } else id = takeAny(s, e.from);
        moveTo(s, e.to, id);
        s.give = null; s.phase = 'act';
        break;
      }
      case 'askSteal': s.phase = 'steal'; s.steal = { by: e.by, from: e.from, perm: shuffled(s.hands[e.from].slice()) }; break;
      case 'steal': {
        let id = e.card;
        if (id != null) { putInHand(s, e.from, id); const h = s.hands[e.from]; h.splice(h.indexOf(id), 1); } else id = takeAny(s, e.from);
        moveTo(s, e.to, id);
        s.steal = null; s.phase = 'act';
        break;
      }
      case 'take': { putInHand(s, e.from, e.card); const h = s.hands[e.from]; h.splice(h.indexOf(e.card), 1); moveTo(s, e.to, e.card); forget(s, e.card); break; }
      case 'miss': break;
      case 'askPick': s.phase = 'pick'; s.pick = { by: e.seat }; break;
      case 'pick': { const i = s.discard.indexOf(e.card); if (i >= 0) s.discard.splice(i, 1); moveTo(s, e.seat, e.card); s.pick = null; s.phase = 'act'; break; }
      case 'draw': {
        const at = e.bottom ? s.deck.length - 1 : 0;
        if (e.card != null) putTop(s, at, e.card); else topNotBoom(s, at);
        const id = e.bottom ? s.deck.pop() : s.deck.shift();
        const kd = s.memo[0].deck.indexOf(id); if (kd >= 0) s.memo[0].deck.splice(kd, 1);
        moveTo(s, e.seat, id);
        s.seq += 1;
        break;
      }
      case 'boom': {
        putTop(s, e.bottom ? s.deck.length - 1 : 0, e.card);
        if (e.bottom) s.deck.pop(); else s.deck.shift();
        const kd = s.memo[0].deck.indexOf(e.card); if (kd >= 0) s.memo[0].deck.splice(kd, 1);
        s.netBoom = e.card;
        s.seq += 1;
        break;
      }
      case 'defuse': {
        putInHand(s, e.seat, e.card);
        const h = s.hands[e.seat]; h.splice(h.indexOf(e.card), 1); s.discard.push(e.card); forget(s, e.card);
        s.phase = 'defuse'; s.defuse = { by: e.seat, card: e.kitten }; s.netBoom = null;
        break;
      }
      case 'insert': {
        // 别人塞的：服务器把牌号和位置都藏了（只给他自己），可是是哪只炸毛猫大家早看见了（defuse 事件里的 kitten）；位置随便放
        const id = e.card != null ? e.card : s.defuse ? s.defuse.card : null;
        const pos = e.pos != null ? e.pos : (Math.random() * (s.deck.length + 1)) | 0;
        s.deck.splice(pos, 0, id);
        if (e.seat === 0) { if (s.memo[0].deck.indexOf(id) < 0) s.memo[0].deck.push(id); } else s.memo[0].deck = [];
        s.defuse = null; s.seq += 1;
        break;
      }
      case 'out': {
        const cards = e.cards || [];
        cards.forEach((id) => putInHand(s, e.seat, id, cards));
        s.alive[e.seat] = false; s.outOrder.push(e.seat);
        s.hands[e.seat] = [];
        for (const id of cards) { s.discard.push(id); forget(s, id); }
        if (s.netBoom != null) { s.discard.push(s.netBoom); s.netBoom = null; }
        s.memo[0].hands[e.seat] = [];
        s.turnsLeft = 1;
        break;
      }
      case 'win': s.phase = 'over'; s.winner = e.seat; break;
    }
  }
  // 镜像和服务器快照对得上吗（只比看得见的东西）
  function sameAsSnapshot() {
    const g = G(), s = game.state;
    if (!g || !s) return true;
    const st = g.st, sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const counts = rotArr(st.counts), alive = rotArr(st.alive);
    if (s.deck.length !== st.deckSize || R.kittensInDeck(s) !== st.kittens) return false;
    if (!sameArr(s.hands.map((h) => h.length), counts) || !sameArr(s.alive, alive)) return false;
    if (!sameArr(s.discard, st.discard)) return false;
    if (!game.hideHand && !sameArr(R.sortHand(s.hands[0].slice()), R.sortHand(st.hand.slice()))) return false;
    if (s.phase !== st.phase || (st.phase !== 'over' && (s.turn !== locOf(st.turn) || s.turnsLeft !== st.turnsLeft))) return false;
    return true;
  }

  // 我坐在哪一家身后：观战的人 = 他选的那家；出局后换过视角 = 那一家；平常 = 自己的座位
  const viewBase = (st) => (st.spectator ? st.viewSeat : st.viewSeat >= 0 ? st.viewSeat : st.mySeat);
  function seatSpots() {
    const out = {};
    for (let l = 0; l < online.n; l++) { const a = avEl(l); if (a) out[srvOf(l)] = fx.center(a.getBoundingClientRect()); }
    return out;
  }
  // 换视角的「转桌」：每一家的座位从原来的位置滑到新位置（被看的人从上面滑到下面），手牌淡进来
  function turnTable(before) {
    if (fx.reduce() || !game || !game.state) return;
    for (let l = 0; l < online.n; l++) {
      const box = seatEl(l), a = avEl(l), old = before[srvOf(l)];
      if (!box || !a || !old) continue;
      const now = fx.center(a.getBoundingClientRect());
      const dx = old.x - now.x, dy = old.y - now.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      box.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }, { transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.3,.75,.3,1)' });
    }
    els.hand.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 160, easing: 'ease-out', fill: 'backwards' });
    snd('flip');
  }
  // 观战时点一家：坐到他身后（出局的人点自己头像回到自己座位）
  function onlineView(srvSeat) {
    if (!online || online.viewing) return;
    online.viewing = true;
    onlineAct('view', { seat: srvSeat }).finally(() => { if (online) online.viewing = false; });
  }
  // 看不到被看那家的手牌时，手牌那一栏写一句为什么
  function watchNote() {
    if (!game || !game.online || !game.spectator || !game.hideHand || !online || !online.st) return '';
    const st = online.st, p = playerAt(online.base);
    if (!p) return '';
    if (!game.state.alive[0]) return '';
    if (!p.isAi && !p.left) return 'TA 没开「观战者能看我的手牌」';
    if (st.spectator) return '只观战看不到机器猫的牌';
    const me = myPlayer();
    return me && me.showHand ? '这局中途关过「观战者能看我的手牌」，看不到机器猫的牌' : '开局时就开着「观战者能看我的手牌」、中途没关过，才看得到机器猫的牌';
  }

  /* ───── 收到服务器状态 ───── */
  function onState(st) {
    if (!online || !st) return;
    if (online.st && st.version < online.st.version) return;   // 旧的（长轮询和动作回应赛跑）
    online.skew = st.serverNow - Date.now();
    const prev = online.st;
    online.st = st;
    if (st.phase === 'lobby') { enterLobby(st, prev); return; }
    const g = st.game;
    if (!g) return;
    const base = viewBase(st);
    if (!game || !game.online || game.matchNo !== g.matchNo || online.base !== base || online.n !== g.n) {
      // 观战换了一家：桌子转过去（先记下每一家头像现在在哪，重摆之后从旧位置滑到新位置）
      const turning = game && game.online && game.matchNo === g.matchNo && online.n === g.n && online.base !== base ? seatSpots() : null;
      enterGame(st, !!(prev && prev.phase === 'lobby'));
      if (turning) turnTable(turning);
      return;
    }
    syncPeople(st);
    const fresh = g.log.filter((e) => e.n > online.lastQueued);
    if (fresh.length && fresh[0].n !== online.lastQueued + 1 && online.lastQueued < g.seq) { resync(); return; }
    if (!fresh.length) { if (!online.playing && !busyLocal()) onlineIdle(); return; }
    online.lastQueued = fresh[fresh.length - 1].n;
    earlyPass(g);
    for (const raw of fresh) {
      const e = rotEvent(raw);
      const last = online.queue[online.queue.length - 1];
      if (last && last[0].act === e.act) last.push(e); else online.queue.push([e]);
    }
    pumpQueue();
  }
  const busyLocal = () => !!(game && game.dealing);
  // 名字 / 头像 / 机器猫档位 / 离开代打
  function syncPeople(st) {
    if (!game) return;
    for (let l = 0; l < online.n; l++) {
      const p = playerAt(srvOf(l));
      game.bots[l] = p ? { nick: p.nick, avatar: p.avatar } : { nick: '?', avatar: null };
      game.tiers[l] = p && p.isAi ? p.aiLevel : null;
      game.tags[l] = p && !p.isAi ? (p.left ? '代打' : !p.online ? '掉线' : (st.game && st.game.auto[srvOf(l)] ? '托管' : '')) : '';
    }
    if (game.state) for (let l = 0; l < online.n; l++) { const box = seatEl(l); if (box) { const nm = box.querySelector('.zm-name'); if (nm) nm.textContent = nameOf(l); } }
  }
  // fromLobby：在大厅里看着开局的 → 从发牌开始播；中途进来 / 刷新回来的 → 直接按快照摆好
  function enterGame(st, fromLobby) {
    const g = st.game;
    resetTable();
    els.cover.hidden = true;
    hideLobby();
    online.base = viewBase(st);
    online.n = g.n;
    online.queue = []; online.playing = false;
    viewSeat = -1; els.app.classList.remove('is-watching');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    tut = null;
    // 观战（纯观战，或出局后坐到别人身后）：下面那家是被看的人，我什么也不用做
    const watching = !!st.spectator || (st.mySeat >= 0 && online.base !== st.mySeat);
    game = { online: true, matchNo: g.matchNo, turnSec: g.turnSec, state: null, bots: [], tiers: [], tags: [], tutorial: false, spectator: watching, hideHand: watching && !(g.st.hand && g.st.hand.length) };
    els.app.classList.toggle('is-spectator', watching || !g.st.alive[st.mySeat]);
    els.me.classList.toggle('is-watched', watching);
    syncPeople(st);
    bgm('game');
    const deal = g.log.find((e) => e.t === 'deal');
    if (fromLobby && deal && !g.over && g.log[0] === deal) {
      // 从头播：按发牌那一刻摆好，发牌动画走一遍，再一步步播到现在
      game.state = mirrorFromDeal(g, rotEvent(deal));
      online.lastQueued = deal.n;
      buildSeats(); solveSize();
      const rest = g.log.filter((e) => e.n > deal.n);
      if (rest.length) { online.lastQueued = rest[rest.length - 1].n; for (const raw of rest) { const e = rotEvent(raw); const last = online.queue[online.queue.length - 1]; if (last && last[0].act === e.act) last.push(e); else online.queue.push([e]); } }
      online.queue.unshift([Object.assign({ t: 'dealIntro' })]);
      pumpQueue();
      return;
    }
    game.state = mirrorFromSnapshot(g);
    online.lastQueued = g.seq;
    buildSeats(); solveSize();
    renderAll();
    onlineIdle();
  }
  // 对不上 / 断档：按快照重摆，不播动画
  function resync() {
    const g = G();
    if (!g || !game || !game.online) return;
    token++;
    online.queue = []; online.playing = false;
    if (game.wander) { game.wander.cancel(); game.wander = null; }
    if (game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    stopClock(); clearReactTimer(); clearStage(); wipeFx();
    if (!els.mask.hidden && !els.dialog.querySelector('.zm-rank')) closeDialog();
    preview = null; mode = null; selected = [];
    game.state = mirrorFromSnapshot(g);
    online.lastQueued = g.seq;
    release();
    renderAll();
    onlineIdle(true);
  }

  /* ───── 一组组播 ───── */
  async function pumpQueue() {
    if (!online || online.playing) return;
    online.playing = true;
    const t = token;
    while (online.queue.length) {
      if (t !== token || !online) { if (online) online.playing = false; return; }
      const grp = online.queue.shift();
      online.cur = grp.map((e) => e.t).join('+');
      await playGroup(grp, t);
      if (online) online.cur = null;
    }
    if (!online || t !== token) return;
    online.playing = false;
    onlineIdle();
  }
  async function playGroup(grp, t) {
    const first = grp[0];
    if (first.t === 'dealIntro') {
      busy = true;
      await dealIntro(t);
      if (t !== token) return;
      game.dealing = false;
      release();
      renderAll();
      return;
    }
    if (first.t === 'deal') return;   // 新一局在 enterGame 里处理
    busy = true;
    stopClock();
    clearReactTimer();
    if (els.stage.querySelector('.zm-fuse.is-lit') && first.t !== 'nope') stopFuse();
    // 机器猫（含替人代打）做的一步：先「想一下」再播；偷牌先让红光在被偷的人牌上游走一会儿
    if (first.t === 'steal' && first.to !== 0) {
      if (!game.wander) { const cnt = game.state.steal ? game.state.steal.perm.length : game.state.hands[first.from].length; game.wander = startWander(first.from, cnt); await wait(stealThink(cnt)); }
    } else if (first.bot && first.who > 0) {
      if (first.t === 'nope') await wait(500 + Math.random() * 500);
      else { const b = bubble(first.who, '', { think: true, ms: 60000 }); await wait(pace().bot); if (b) b.remove(); }
    }
    if (t !== token) return;
    if (first.t === 'nope') stopFuse();
    if (first.who === 0 && game.preFlyP) { await game.preFlyP; game.preFlyP = null; if (t !== token) return; }
    if (first.who === 0 && game.previewSrc) { game.src = game.previewSrc; game.previewSrc = null; online.pendingSrc = null; }
    else if (first.who === 0) { game.src = online.pendingSrc || {}; online.pendingSrc = null; } else game.src = {};
    if (!els.mask.hidden && els.dialog.querySelector('[data-steal], [data-alter], [data-fan], .zm-grid')) closeDialog();   // 超时被服务器代选了：要我做决定的弹窗收掉
    if (mode === 'target') cancelTarget();
    snapshot();
    for (const e of grp) applyNet(game.state, e);
    if (first.who === 0) selected = [];
    mode = null;
    reactOpen = false;
    renderBand();
    renderHand({ flip: false });
    await playEvents(grp, t);
  }

  /* ───── 停下来等人：轮到谁、我要不要做决定 ───── */
  function onlineIdle(fromResync) {
    const g = G();
    if (!game || !game.online || !g || online.playing || game.dealing) return;
    if (!fromResync && !sameAsSnapshot()) { console.warn('[zhamao] mirror drifted, resync'); resync(); return; }
    const s = game.state;
    autopilot = !game.spectator && !!g.auto[online.base];
    els.me.classList.toggle('is-auto', autopilot);
    if (window.ZhamaoAudio && s.deck.length) window.ZhamaoAudio.danger(R.kittensInDeck(s) / s.deck.length);
    release();
    if (g.over) { renderAll(); onlineFinish(); return; }
    const mine = !!g.myCall && !autopilot && !game.spectator;
    const remain = onlineRemain();
    stopClock();
    reactOpen = false;
    busy = true;
    mode = null;
    // 头像上的倒计时红环：现在该谁做决定
    const who = s.phase === 'act' ? s.turn : s.phase === 'give' ? s.give.from : s.phase === 'pick' ? s.pick.by : s.phase === 'steal' ? s.steal.by : s.phase === 'alter' ? s.alter.by : s.phase === 'defuse' ? s.defuse.by : -1;
    if (s.phase === 'react') { renderAll(); onlineReact(g, mine, remain); return; }
    if (g.turnSec && who >= 0 && remain > 0) startClock(who, null, remain);
    if (!mine) {
      renderAll();
      if (s.phase === 'steal' && s.steal.by !== 0 && !game.wander) game.wander = startWander(s.steal.from, s.steal.perm.length);
      return;
    }
    switch (s.phase) {
      case 'act': busy = false; selected = []; renderAll(); myTurnCue(); break;
      case 'give': busy = false; mode = 'give'; selected = []; renderAll(); break;
      case 'pick': busy = false; renderAll(); pickDialog(); break;
      case 'steal': busy = false; renderAll(); stealPicker(); break;
      case 'alter': busy = false; renderAll(); alterDialog(); break;
      case 'defuse': busy = false; renderAll(); insertDialog(); break;
      default: renderAll();
    }
  }
  // 反应窗：每次出牌都烧一根导火索（不管谁有没有作废）；轮到我表态的话，有作废就亮「作废」，没有也能点「取消」提前结束
  /* 2026-11-12 用户实测：没作废也得点「取消」很怪、窥探 / 抽牌要干等导火索。改成：
   *   手里没作废 → 不露「取消」，0.5–1 秒后自动替我表态（不立刻：不然「一出牌窗口就关」等于告诉大家我没作废）；
   *   手里有作废 → 照旧「作废 / 取消」，导火索一烧完就自动算取消（不再干等服务器多留的那 1.2 秒）。 */
  let reactAuto = 0, fuseLater = 0;
  // 一收到「有人出牌、轮到我表态、我手里没作废」就开始计时（和桌上的动画同时走，不等动画播完），0.15–0.4 秒后表态
  // （2026-11-13 用户：牌落定后还要卡一下才出结果——大家这一下表态 + 来回网络常常比出牌动画还长；缩短后多半在牌落定前就表完了，
  //   仍然随机，窗口关得早晚看不出谁有没有作废）
  function earlyPass(g) {
    if (!online || !g || !g.myCall || (game && game.spectator) || g.st.phase !== 'react' || online.passFor === g.seq) return;
    if (g.st.hand.some((id) => R.KIND_OF[id] === R.NOPE) && (!settings.nopeMine || aboutSeat(g.st.pending, online.base, g.st.alive))) return;
    online.passFor = g.seq;
    const at = g.seq;
    setTimeout(() => {
      const gg = G();
      if (!online || !gg || gg.seq !== at || !gg.myCall || gg.st.phase !== 'react') return;
      onlineMove({ type: 'pass' });
    }, 150 + Math.random() * 250);
  }
  function onlineReact(g, mine, remain) {
    const s = game.state;
    if (!els.stage.querySelector('.zm-stage-inner')) { showStage(s.pending, false); if (s.pending.nopes.length) stageVerdict(s.pending.nopes.length); }
    const canN = mine && R.canNope(s, 0) && askMeNope(s);
    // 2026-11-13 用户 8 人局：「问作废的时间太短 / 点了没生效」——服务器按估的动画时长开窗，网页这边动画常常播得更久（人多、手机慢、
    // 前面还排着动画），轮到我表态时导火索只剩一点点、甚至 0（立刻自动取消）。现在问到我时至少给满 1.8 秒；
    // 服务器那边多留的一截（graceMs）兜得住，但也不能超过服务器真正关窗前 0.5 秒（留给网络）
    const give = canN ? Math.max(0, Math.min(Math.max(remain, 1800), g.deadline - (Date.now() + online.skew) - 500)) : remain;
    reactOpen = canN;
    busy = !canN;
    renderHand({ flip: false });
    renderBand();
    // 导火索：问到我才马上点着；没问我的话先不露，过 0.9 秒窗口还开着（有人在想要不要作废）才点着剩下那段——
    // 大家都自动跳过时（没作废 / 开了「只在和我有关时询问」）窗口 0.3–0.7 秒就关，导火索根本不出现
    clearTimeout(fuseLater);
    if (canN) fuse(give > 0 ? give : 0);
    else if (online.fuseFor !== g.seq) {
      online.fuseFor = g.seq;
      fuse(0);
      const at = g.seq, end = performance.now() + Math.max(0, remain);
      fuseLater = setTimeout(() => {
        const gg = G();
        if (!online || !gg || gg.seq !== at || game.state.phase !== 'react' || reactOpen) return;
        const left = end - performance.now();
        if (left > 300) fuse(left);
      }, 900);
    }
    clearTimeout(reactAuto);
    if (!mine) return;
    const at = g.seq;
    const autoPass = () => {
      const gg = G();
      if (!online || !gg || gg.seq !== at || !gg.myCall || game.state.phase !== 'react') return;
      reactOpen = false;
      renderBand(); renderHand({ flip: false });
      onlineMove({ type: 'pass' });
    };
    if (canN) { snd('ask'); reactAuto = setTimeout(autoPass, Math.max(0, give)); }
    else earlyPass(g);   // 没作废：收到状态时多半已经排好了，这里兜个底
  }

  /* ───── 我的操作 → 服务器 ───── */
  // 乐观出牌：点了「出牌」牌马上从手里飞上桌（和要指人时先摆上桌那一段一样），同时发请求；服务器回话后从桌上接着演
  async function preFly(cards) {
    const t = token;
    const rects = cards.map((id) => handRectOf(id));
    cards.forEach((id) => handHidden.add(id));
    selected = [];
    renderHand({ flip: false });
    showStage({ by: 0, type: 'x', cards, target: -1, named: null, nopes: [] }, true);
    preview = { cards };
    snd('whoosh');
    const su = SU();
    await Promise.all(cards.map((id, i) => {
      const target = stageCard(id);
      if (!target) return null;
      const to = target.getBoundingClientRect(), rot = (i - (cards.length - 1) / 2) * 5;
      return fx.fly({ html: cardHtml(id), from: rects[i], to: { x: to.left + to.width / 2, y: to.top + to.height / 2 }, w: su, s0: rects[i].width / su, s1: 1, r0: 0, r1: rot, dur: ms(340), delay: i * ms(50), lift: 70 })
        .then(() => { if (t === token) target.classList.remove('is-incoming'); });
    }));
    if (t !== token || !preview) return;
    const m = {};
    for (const id of cards) { const el = stageCard(id); if (el) m[id] = el.getBoundingClientRect(); }
    game.previewSrc = m;
    preview = null;
  }
  async function onlineMove(d) {
    if (!online) return;
    const g = G();
    busy = true;
    stopClock();
    if (d.type === 'play' && !game.previewSrc) game.preFlyP = preFly(d.cards);
    else if (d.type === 'draw' && !fx.reduce()) { const top = els.deck.querySelector('.zm-deck-stack .zm-card'); if (top) top.animate([{ translate: '0 0' }, { translate: '0 -10px' }, { translate: '0 0' }], { duration: 320, easing: 'ease-out', composite: 'add' }); }
    if (d.type !== 'pass' && d.type !== 'nope' && !game.preFlyP) online.pendingSrc = captureSources(0, d);
    const slow = d.type === 'pass' ? 0 : setTimeout(() => toast('网络有点慢，稍等…'), 1800);
    const body = { d: Object.assign({}, d, d.target != null && d.target >= 0 ? { target: srvOf(d.target) } : {}), at: g ? g.seq : undefined };
    mode = null;
    renderBand();
    try {
      const res = await NET.act(online.code, online.token, 'move', body);
      clearTimeout(slow);
      onState(res.state);
    } catch (err) {
      clearTimeout(slow);
      if (d.type === 'pass' && err && err.status === 409) return;   // 窗口已经关了（别人作废 / 已结算）：没关系，等下一份状态
      if (game && game.preFlyP) { await game.preFlyP; game.preFlyP = null; if (!online) return; preview = { cards: d.cards }; endPreview(); }
      if (!online) return;
      online.pendingSrc = null;
      game.previewSrc = null;
      // 作废没生效要说清楚（2026-11-13 用户：有人点了作废却没生效、也不知道为什么）
      if (d.type === 'nope' && err && err.error === 'stale') toast('有人抢先出了作废，看一眼桌上再决定');
      else if (d.type === 'nope' && err && (err.error === 'no_reaction' || err.error === 'not_your_call')) toast('晚了一步，这张牌已经结算了');
      else if (err && err.error !== 'stale') toast(NET.message(err));
      resync();
    }
  }
  async function onlineAuto(on) {
    if (!online || !game || game.spectator) return;
    snd(on ? 'tick' : 'tap');
    try { const res = await NET.act(online.code, online.token, 'auto', { on }); onState(res.state); } catch (err) { toast(NET.message(err)); }
  }
  async function onlineAct(action, body) {
    if (!online) return null;
    try { const res = await NET.act(online.code, online.token, action, body || {}); if (res && res.state) onState(res.state); return res; }
    catch (err) { toast(NET.message(err)); if (err && (err.status === 401 || err.status === 404)) leaveOnline(false, '房间已经不在了'); return null; }
  }

  /* ───── 一局结束 ───── */
  async function onlineFinish() {
    const g = G();
    if (!g || game.finishShown === g.matchNo) return;
    game.finishShown = g.matchNo;
    busy = true;
    bgm('end');
    clearStage();
    renderAll();
    const order = (g.ranking || []).map(locOf);
    const ok = await celebrate(order[0]);
    if (!ok || !online || !G() || !G().over) return;
    const host = isHost();
    bgm('menu');   // 结算页算游戏外：接上丁（一局结束时先淡出，皇冠彩纸放完、排行榜出来再起）
    openDialog('<h2>排行榜</h2>' +
      '<ol class="zm-rank" data-stagger>' + order.map((seat, i) => '<li class="' + (seat === 0 && !game.spectator ? 'is-me' : '') + '"><span class="pos">' + (i < 3 ? medal(i) : i + 1) + '</span><span class="mini">' + avatarHtml(seat) + '</span><span class="nm">' + esc(nameOf(seat)) + (seat === 0 && !game.spectator ? '<small>（我）</small>' : '') + '</span><span class="tag">' + (i === 0 ? '胜利' : '第 ' + (i + 1) + ' 名') + '</span></li>').join('') + '</ol>' +
      (host ? '' : '<p class="zm-muted">等房主开下一局</p>') +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-leave>离开房间</button>' + (host ? '<button type="button" class="zm-btn zm-btn-primary" data-again data-focus>再来一局</button>' : '') + '</div>', (d) => {
      d.querySelector('[data-leave]').addEventListener('click', () => { closeDialog(); leaveOnline(true); });
      const a = d.querySelector('[data-again]');
      if (a) a.addEventListener('click', () => { a.disabled = true; onlineAct('rematch'); });
    });
  }

  /* ───── 进 / 出房间、长轮询 ───── */
  function startOnline(st, token0) {
    if (online && online.poll) online.poll.abort = true;
    online = { code: st.code, token: token0, st: null, base: 0, n: 0, matchNo: 0, lastQueued: 0, queue: [], playing: false, poll: null, pendingSrc: null, skew: 0 };
    if (NET) NET.writeSession({ code: st.code, token: token0 });
    try { const u = new URL(location.href); u.searchParams.set('room', st.code); history.replaceState(null, '', u.toString()); } catch (_) { /* */ }
    onState(st);
    pollLoop();
  }
  async function pollLoop() {
    const my = { abort: false };
    online.poll = my;
    let fails = 0;
    while (online && online.poll === my && !my.abort) {
      try {
        const res = await NET.state(online.code, online.token, online.st ? online.st.version : 0, undefined, online.fxSeq == null ? -1 : online.fxSeq);
        if (my.abort || !online) return;
        fails = 0;
        if (res && res.state) onState(res.state);
        if (res && res.fxSeq != null) onFx(res);
      } catch (err) {
        if (my.abort || !online) return;
        if (err && (err.status === 401 || err.status === 404)) { leaveOnline(false, '房间已经不在了'); return; }
        fails++;
        if (fails === 2) toast('连接断了，正在重连…');
        await new Promise((r) => setTimeout(r, Math.min(8000, 800 * fails)));
      }
    }
  }
  async function leaveOnline(sendLeave, msg) {
    const o = online;
    if (!o) return;
    online = null;
    if (o.poll) o.poll.abort = true;
    if (NET) NET.writeSession(null);
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u.toString()); } catch (_) { /* */ }
    if (sendLeave && NET) NET.act(o.code, o.token, 'leave', {}).catch(() => {});
    hideLobby();
    game = null;
    els.app.classList.remove('is-spectator');
    showCover();
    if (msg) toast(msg);
  }
  function showInvite() {
    if (!online) return;
    const url = NET.inviteUrl(online.code);
    openDialog('<h2>房间 ' + esc(online.code) + '</h2><p class="zm-muted">把链接发给朋友，或者让他扫码；也可以在主页「联机」里输房间号</p>' +
      '<div class="zm-invite-qr" data-qr></div><div class="zm-invite-url">' + esc(url) + '</div>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-copy>复制链接</button><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>好</button></div>', (d) => {
      const qr = d.querySelector('[data-qr]');
      if (window.GamesShell && GamesShell.QR) { try { GamesShell.QR.render(qr, url, { scale: 4, margin: 2, dark: '#1d1b18', light: '#fbf8f1' }); } catch (_) { qr.remove(); } } else qr.remove();
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
      d.querySelector('[data-copy]').addEventListener('click', async (ev) => {
        const b = ev.currentTarget;
        try { if (navigator.share && /Mobi|Android|iPhone/.test(navigator.userAgent)) { await navigator.share({ title: '来玩百变小咪', text: '房间 ' + online.code, url }); return; } await navigator.clipboard.writeText(url); b.textContent = '复制好了'; } catch (_) { b.textContent = '长按上面的链接复制'; }
      });
    });
  }

  /* 连服务器时盖一层「正在连接」+ 一条假进度条（用户 2026-11-12 的主意）：
   * 匀速 1.2 秒走到 70%；还没好就放慢、再 4 秒走到 90%，然后停着等；一连上就 0.25 秒冲到 100% 收起。
   * 250ms 内就连上的不露（不闪）；盖着的时候底下什么都点不了 */
  let connEl = null, connTimer = 0, connStage = 0;
  function connecting(on, text) {
    clearTimeout(connTimer); clearTimeout(connStage);
    if (!on) {
      if (!connEl || connEl.hidden) return Promise.resolve();
      const bar = connEl.querySelector('.zm-conn-bar i');
      bar.style.transition = 'transform .25s ease-out';
      bar.style.transform = 'scaleX(1)';
      return new Promise((r) => setTimeout(() => { connEl.hidden = true; r(); }, 300));
    }
    connTimer = setTimeout(() => {
      if (!connEl) {
        connEl = document.createElement('div');
        connEl.className = 'zm-connecting';
        connEl.innerHTML = '<div class="zm-conn-box"><div class="zm-conn-paws"><i class="zm-conn-paw">' + ART.icon('orange') + '</i><i class="zm-conn-paw">' + ART.icon('calico') + '</i><i class="zm-conn-paw">' + ART.icon('cow') + '</i></div>' +
          '<b data-t></b><div class="zm-conn-bar" role="progressbar" aria-label="连接中"><i></i></div></div>';
        els.app.appendChild(connEl);
      }
      connEl.querySelector('[data-t]').textContent = text || '正在连接…';
      const bar = connEl.querySelector('.zm-conn-bar i');
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0)';
      connEl.hidden = false;
      void bar.offsetWidth;
      bar.style.transition = 'transform 1.2s linear';
      bar.style.transform = 'scaleX(.7)';
      connStage = setTimeout(() => { bar.style.transition = 'transform 4s cubic-bezier(.2,.6,.4,1)'; bar.style.transform = 'scaleX(.9)'; }, 1200);
    }, 250);
    return Promise.resolve();
  }
  async function withConn(text, fn) {
    connecting(true, text);
    try { const r = await fn(); await connecting(false); return r; } catch (e) { connecting(false); throw e; }
  }

  /* ───── 主页「联机」：建房 / 输房间号加入 ───── */
  /* 点「联机」：主菜单换成联机那一步（和单机一样，不弹框）。邀请链接带房间号进来：直接摆好「加入房间」那一行、填好号 */
  function showOnlineEntry(code) {
    if (!NET) { toast('联机暂时用不了'); return; }
    NET.warm();
    els.cover.hidden = false;
    const join = els.cover.querySelector('.zm-join'), open = els.cover.querySelector('[data-cover="join-open"]'), input = $('zmJoinCode');
    $('zmOnlineErr').hidden = true;
    input.value = code ? String(code).replace(/\D/g, '').slice(0, 4) : '';
    setJoinMode(!!code);
    els.cover.querySelectorAll('[data-cover-step="online"] button').forEach((x) => { x.disabled = false; });
    coverStep('online');
  }
  // 联机这一步的两种样子：选「创建 / 加入」，或者已经点了加入（只剩输房间号 + 观战 / 加入）
  function setJoinMode(on) {
    els.cover.querySelector('.zm-join').hidden = !on;
    els.cover.querySelector('[data-cover="join-open"]').hidden = on;
    els.cover.querySelector('[data-cover="create"]').hidden = on;
    const rb = els.cover.querySelector('[data-cover="resume"]');
    if (on) rb.hidden = true; else { const sess = NET && NET.readSession(); rb.hidden = !sess; }
    $('zmOnlineErr').hidden = true;
  }
  function onlineFail(e) {
    const err = $('zmOnlineErr');
    err.textContent = NET.message(e); err.hidden = false;
    els.cover.querySelectorAll('[data-cover-step="online"] button').forEach((x) => { x.disabled = false; });
  }
  const onlineLock = () => els.cover.querySelectorAll('[data-cover-step="online"] button').forEach((x) => { x.disabled = true; });
  async function onlineCreate() {
    onlineLock();
    try {
      const res = await withConn('正在创建房间…', () => NET.create(profile.nick, profile.avatar, { rules: settings.rules, turnSec: TURN_OPTS.some(([v]) => v === turnSec()) ? turnSec() : 20 }));
      startOnline(res.state, res.token);
    } catch (e) { onlineFail(e); }
  }
  async function onlineJoin(mode) {
    const c = $('zmJoinCode').value.trim();
    if (!/^\d{4}$/.test(c)) { onlineFail({ error: 'bad_code' }); return; }
    onlineLock();
    try {
      const res = await withConn('正在进房间…', () => NET.join(c, profile.nick, profile.avatar, mode));
      startOnline(res.state, res.token);
      if (res.fellBack) toast(NET.message({ error: res.fellBack }));
    } catch (e) { onlineFail(e); }
  }
  async function resumeOnline(sess) {
    try {
      const res = await withConn('正在回到房间…', () => NET.state(sess.code, sess.token, 0));
      if (res && res.state) { startOnline(res.state, sess.token); return true; }
    } catch (err) {
      if (err && (err.status === 401 || err.status === 404)) NET.writeSession(null);
      toast(NET.message(err && (err.status === 401 || err.status === 404) ? { error: 'room_not_found' } : err));
    }
    refreshCover();
    return false;
  }

  /* ───── 大厅 ─────
   * 一排五个座位（空位 / 真人 / 机器猫）+ 规则卡（房主能改，别人只看）+ 房间号；房主点空位加机器猫、点机器猫换档 / 移走，点真人可以请出去 */
  let lobbyEl = null;
  function hideLobby() { if (lobbyEl) lobbyEl.hidden = true; }
  function enterLobby(st, prev) {
    if (game && game.online) { resetTable(); game = null; }
    if (!els.mask.hidden && els.dialog.querySelector('.zm-rank')) closeDialog();
    els.cover.hidden = true;
    bgm('menu');
    renderLobby(st, prev);
  }
  // 出牌限时（2026-11-13 用户：30 秒太长；5 秒扣掉网络来回和别人的动画只剩三四秒，太紧）：10 / 20 / 不限时
  const TURN_OPTS = [[10, '10 秒'], [20, '20 秒'], [0, '不限时']];
  function renderLobby(st) {
    if (!lobbyEl) {
      lobbyEl = document.createElement('div');
      lobbyEl.className = 'zm-lobby';
      els.app.appendChild(lobbyEl);
      lobbyEl.addEventListener('click', onLobbyClick);
    }
    lobbyEl.hidden = false;
    const host = isHost(), me = st.me, cfg = st.config || {};
    const rules = R.normalizeRules(cfg.rules);
    const seated = st.players.filter((p) => !p.left);
    // 最多 9 座：平时摆 5 个，坐满到哪就多露一个空位（第二排），免得一上来 9 个空位一大片
    const shownSeats = Math.min(R.MAX_PLAYERS, Math.max(5, seated.reduce((m, p) => Math.max(m, p.seat), -1) + 2));
    const sw = (key, on) => '<button type="button" class="zs-switch" data-rule="' + key + '" role="switch" aria-checked="' + !!on + '"' + (host ? '' : ' disabled') + '><i></i></button>';
    const row = (k, title, note, ctl) => '<div class="zs-row"><i class="zs-ic">' + ART.icon(k) + '</i><div class="zs-txt"><b>' + title + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</div>' + ctl + '</div>';
    const ts = TURN_OPTS.some(([v]) => v === cfg.turnSec) ? cfg.turnSec : 20;
    renderLobbyV2(st, { host, me, cfg, rules, seated, shownSeats, row, sw, ts });
  }
  /* 大厅（2026-11-13 用户挑定的新版）：
   *  ① 头部和主页一致：小一号的插画 +「百变小咪」，房间号在下面当主角
   *  ② 座位按出牌顺序编号（坐着的人按座位顺序轮流出），自己用朱红描边标出、不再写「（我）」
   *  ③ 大厅里也能「说一句」（右上角聊天键；对局里那一套）
   *  ④「观战者能看我的手牌」挪进右上角菜单的「设置」，房间页只留这一局的事
   *  ⑤ 邀请直接：房间号旁「复制链接」「二维码」，二维码就地展开给旁边的人扫 */
  let lobbyQr = false;
  function renderLobbyV2(st, o) {
    const { host, me, rules, seated, shownSeats, row, sw, ts } = o;
    const order = seated.slice().sort((a, b) => a.seat - b.seat).map((p) => p.seat);
    const seatHtml = (seat) => {
      const p = seated.find((x) => x.seat === seat);
      if (!p) return '<button type="button" class="zm-lseat is-empty" data-seat="' + seat + '"><span class="av">+</span><b>' + (host ? '加机器猫' : '空位') + '</b><small>' + (st.spectator ? '坐这里' : host ? '' : '换到这') + '</small></button>';
      const av = p.avatar && AV && AV.byId[p.avatar] ? AV.byId[p.avatar].svg : '<span>' + esc(p.nick.slice(0, 1)) + '</span>';
      const tag = p.isAi ? AI.TIER_NAMES[p.aiLevel] || '普通' : p.id === st.hostId ? '房主' : !p.online ? '掉线' : '';
      return '<button type="button" class="zm-lseat' + (p.id === me ? ' is-me' : '') + (p.isAi ? ' is-bot' : '') + '" data-seat="' + seat + '"><i class="ord">' + (order.indexOf(seat) + 1) + '</i><span class="av">' + av + '</span><b>' + esc(p.nick) + '</b><small>' + esc(tag) + '</small></button>';
    };
    const url = NET.inviteUrl(st.code);
    const tools = '<div class="zm-lobby-tools">' + ($('zmChatBtn') && social && socialOk() ? '<button type="button" class="zm-tool" data-l="chat" aria-label="说一句">' + $('zmChatBtn').innerHTML + '</button>' : '') +
      '<button type="button" class="zm-tool" data-l="menu" aria-label="菜单">' + $('zmMenuBtn').innerHTML + '</button></div>';
    lobbyEl.innerHTML = tools + '<div class="zm-lobby-inner is-v2">' +
      '<div class="zm-lobby-brand"><div class="art">' + ART.hero() + '</div><b>百变小咪</b></div>' +
      '<div class="zm-lobby-code"><div><small>房间号</small><b>' + esc(st.code) + '</b></div>' +
        '<div class="acts"><button type="button" class="zm-pill" data-l="copy">复制链接</button><button type="button" class="zm-pill' + (lobbyQr ? ' is-on' : '') + '" data-l="qr">二维码</button></div></div>' +
      (lobbyQr ? '<div class="zm-lobby-qr" data-qr></div>' : '') +
      '<div class="zm-lobby-seats">' + Array.from({ length: shownSeats }, (_, i) => seatHtml(i)).join('') + '</div>' +
      (st.spectators.length ? '<p class="zm-muted zm-lobby-watch">' + st.spectators.length + ' 个人在观战' + (st.spectator ? '（包括你）' : '') + '</p>' : '') +
      '<section class="zs-card zs-b zm-lobby-rules"><div class="zs-line"><span>出牌限时</span><div class="zs-seg" role="group">' +
      TURN_OPTS.map(([v, t]) => '<button type="button" data-turn="' + v + '" aria-pressed="' + (v === ts) + '"' + (host ? '' : ' disabled') + '>' + t + '</button>').join('') + '</div></div>' +
      '<div class="zs-line"><span>牌量</span><div class="zs-seg" role="group">' +
      DECK_OPTS.map(([v, t]) => '<button type="button" data-deck="' + v + '" aria-pressed="' + (v === rules.deckSize) + '"' + (host ? '' : ' disabled') + '>' + t + '</button>').join('') + '</div></div>' +
      row('swap', '有交换牌', '', sw('swap', rules.swap)) +
      (rules.swap ? row('defuse', '交换时逗猫棒也换', '', sw('swapDefuse', rules.swapDefuse)) : '') +
      '</section>' + (host ? '' : '<p class="zm-muted zm-lobby-note">规则由房主定</p>') +
      '<div class="zm-lobby-actions"><button type="button" class="zm-btn" data-l="leave">离开房间</button>' +
      (host ? '<button type="button" class="zm-btn zm-btn-primary" data-l="start"' + (seated.length >= 2 ? '' : ' disabled') + '>开始（' + seated.length + ' 人）</button>'
        : '<span class="zm-lobby-wait">等房主开始…</span>') + '</div></div>';
    const qr = lobbyEl.querySelector('[data-qr]');
    if (qr) { if (window.GamesShell && GamesShell.QR) { try { GamesShell.QR.render(qr, url, { scale: 4, margin: 2, dark: '#1d1b18', light: '#fbf8f1' }); } catch (_) { qr.remove(); } } else qr.remove(); }
  }
  function onLobbyClick(e) {
    if (!online || !online.st) return;
    const st = online.st, host = isHost();
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.l === 'invite') { showInvite(); return; }
    if (b.dataset.l === 'qr') { lobbyQr = !lobbyQr; renderLobby(st); return; }
    if (b.dataset.l === 'menu') { toggleMenu(e); return; }
    if (b.dataset.l === 'chat') { if (social && socialOk()) { social.openChat(b); popTail(b); } return; }
    if (b.dataset.l === 'copy') {
      const url = NET.inviteUrl(st.code);
      (async () => { try { if (navigator.share && /Mobi|Android|iPhone/.test(navigator.userAgent)) { await navigator.share({ title: '来玩百变小咪', text: '房间 ' + st.code, url }); return; } await navigator.clipboard.writeText(url); toast('链接复制好了'); } catch (_) { toast('复制不了，点「二维码」让朋友扫'); } })();
      return;
    }
    if (b.dataset.l === 'leave') { leaveOnline(true); return; }
    if (b.dataset.l === 'start') { b.disabled = true; onlineAct('start'); return; }
    if (b.dataset.turn != null) { onlineAct('config', { config: { turnSec: +b.dataset.turn } }); return; }
    if (b.dataset.deck != null) { onlineAct('config', { config: { rules: { deckSize: b.dataset.deck } } }); return; }
    if (b.dataset.rule) {
      const k = b.dataset.rule, on = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(on));
      onlineAct('config', { config: { rules: { [k]: k === 'extraDefuse' ? (on ? 'all' : 'two') : on } } });
      return;
    }
    if (b.dataset.seat == null) return;
    const seat = +b.dataset.seat;
    const p = st.players.find((x) => x.seat === seat && !x.left);
    if (st.spectator) { if (!p || p.isAi) onlineAct('sit', { seat }); return; }
    if (!p) { if (host) onlineAct('add_ai', { seat, level: 'normal' }); else onlineAct('sit', { seat }); return; }
    if (p.id === st.me) { showProfile(); return; }
    if (p.isAi) {
      if (!host) { onlineAct('sit', { seat }); return; }
      openDialog('<h2>' + esc(p.nick) + '</h2><div class="zs-seg" role="group">' + AI.TIERS.map((t) => '<button type="button" data-tier="' + t + '" aria-pressed="' + (t === p.aiLevel) + '">' + AI.TIER_NAMES[t] + '</button>').join('') + '</div>' +
        '<div class="zm-actions"><button type="button" class="zm-btn" data-sit>我坐这里</button><button type="button" class="zm-btn" data-rm>移走</button><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>好</button></div>', (d) => {
        d.classList.add('zs');
        d.querySelectorAll('[data-tier]').forEach((x) => x.addEventListener('click', () => { d.querySelectorAll('[data-tier]').forEach((y) => y.setAttribute('aria-pressed', String(y === x))); onlineAct('set_ai', { seat, level: x.dataset.tier }); }));
        d.querySelector('[data-rm]').addEventListener('click', () => { closeDialog(); onlineAct('remove_ai', { seat }); });
        d.querySelector('[data-sit]').addEventListener('click', () => { closeDialog(); onlineAct('sit', { seat }); });
        d.querySelector('[data-ok]').addEventListener('click', closeDialog);
      });
      return;
    }
    if (host) {
      openDialog('<h2>' + esc(p.nick) + '</h2><p class="zm-muted">请他离开这个房间？</p><div class="zm-actions"><button type="button" class="zm-btn" data-cancel>算了</button><button type="button" class="zm-btn zm-btn-primary" data-kick>请他离开</button></div>', (d) => {
        d.querySelector('[data-cancel]').addEventListener('click', closeDialog);
        d.querySelector('[data-kick]').addEventListener('click', () => { closeDialog(); onlineAct('kick', { pid: p.id }); });
      });
    }
  }

  /* ───── 绑定 ───── */
  // 长按不选字、不弹系统菜单（微信里会弹「搜一搜 / 翻译」）；输入框照常
  const editable = (t) => t && t.closest && t.closest('input, textarea, [contenteditable="true"]');
  els.app.addEventListener('selectstart', (e) => { if (!editable(e.target)) e.preventDefault(); });
  els.app.addEventListener('contextmenu', (e) => { if (!editable(e.target)) e.preventDefault(); });
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
    // 逗猫棒：鼠标经过（或点一下）就猛挥几下、甩出几颗心
    const h = $('zmCoverArt').querySelector('.hero-wand');
    if (h) {
      let busyH = false;
      const wave = () => {
        if (busyH || fx.reduce()) return;
        busyH = true;
        snd('ding');
        h.animate([{ rotate: '0deg' }, { rotate: '-16deg', offset: 0.2 }, { rotate: '14deg', offset: 0.45 }, { rotate: '-12deg', offset: 0.7 }, { rotate: '0deg' }], { duration: 760, easing: 'ease-in-out', composite: 'add' })
          .finished.then(() => { busyH = false; }, () => { busyH = false; });
        const r = h.getBoundingClientRect();
        ['heart', 'note', 'heart'].forEach((sh, i) => fx.float(r.left + r.width * (0.15 + i * 0.12), r.top + r.height * 0.3, sh, { dy: -40, dx: (i - 1) * 8, size: 14 + i * 3, color: sh === 'heart' ? PINKS[i % 3] : '#4f8a5f', delay: 60 + i * 90, dur: 900 }));
      };
      h.style.cursor = 'pointer';
      h.addEventListener('pointerenter', wave);
      h.addEventListener('click', wave);
    }
    // 炸毛猫头顶一直冒火星（只在主页露着的时候）
    setInterval(() => {
      if (els.cover.hidden || fx.reduce() || document.hidden) return;
      const r = g.getBoundingClientRect();
      if (!r.width) return;
      fx.burst(r.left + r.width * 0.5, r.top + r.height * 0.06, { n: 3, shapes: ['dot', 'star'], colors: ['#e9d46a', '#f28a2e', '#c8463a'], radius: 18, size: [3, 8], life: 480, gravity: -8, pattern: 'fountain' });
    }, 260);
  })();
  els.cover.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cover]');
    if (!b) return;
    const k = b.dataset.cover;
    // 单机：有上一局 → 先问「接着打 / 开新的一局」；没有就直接选人数
    // 2026-11-13 用户：没有没打完的局 → 点单机直接到选人数（不经过「接着打 / 开新的」那一步）；新手教程 · 设置这时挂在选人数那屏底下
    if (k === 'solo') { refreshSolo(); const saved = !!loadSaved(); coverFrom = saved ? 'again' : 'main'; coverStep(saved ? 'again' : 'solo'); soloFoot(!saved); snd('tap'); return; }
    if (k === 'fresh') { refreshSolo(); coverStep('solo'); soloFoot(false); snd('tap'); return; }
    if (k === 'back' && !els.cover.querySelector('.zm-join').hidden && !els.cover.querySelector('[data-cover-step="online"]').hidden) { setJoinMode(false); return; }
    if (k === 'back') { const step = els.cover.querySelector('[data-cover-step="solo"]:not([hidden])') && coverFrom === 'again' ? 'again' : 'main'; coverStep(step); if (step === 'main') coverFrom = 'main'; return; }
    if (k === 'start') { settings.players = Math.min(SOLO_MAX, settings.players); soloStart(); return; }
    if (k === 'resume-solo') { const saved = loadSaved(); if (saved) resumeGame(saved); else refreshSolo(); return; }
    if (k === 'online') { showOnlineEntry(); return; }
    if (k === 'create') { onlineCreate(); return; }
    if (k === 'join-open') { setJoinMode(true); setTimeout(() => $('zmJoinCode').focus(), 30); return; }
    if (k === 'join') { onlineJoin('play'); return; }
    if (k === 'watch') { onlineJoin('watch'); return; }
    if (k === 'resume') { const sess = NET && NET.readSession(); if (sess) resumeOnline(sess); return; }
    if (k === 'tutorial') startTutorial();
    else if (k === 'settings') showSettings(true);
    else if (k === 'exit') location.href = '/toolbox/';
  });
  // 加入房间：只收数字、满 4 位才露「只观战」、回车 = 加入
  $('zmJoinCode').addEventListener('input', (e) => {
    const inp = e.target;
    inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
    $('zmOnlineErr').hidden = true;
  });
  $('zmJoinCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') onlineJoin('play'); });
  els.cover.querySelector('.zm-solo-pick').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.n) {
      settings.players = Math.max(R.MIN_PLAYERS, Math.min(SOLO_MAX, settings.players + +b.dataset.n));
      saveSettings(); refreshSolo();
      fx.pop($('zmSoloNum'), { scale: 1.12, dur: 220 });
      const fs = $('zmSoloFaces').children, last = fs[fs.length - 1];
      if (+b.dataset.n > 0 && last) fx.pop(last, { scale: 1.3, dur: 260 });
      snd('tick');
    } else if (b.dataset.tier) {
      settings.tier = b.dataset.tier;
      saveSettings(); refreshSolo();
      snd('tap');
    }
  });
  els.me.addEventListener('click', (e) => {
    if (!e.target.closest('.zm-av')) return;
    // 出局后在看别人：点下面这个头像回到自己座位
    if (game && game.online && game.spectator && online && online.st && online.st.mySeat >= 0 && online.base !== online.st.mySeat) { onlineView(online.st.mySeat); return; }
    if (canAuto() && !game.dealing) setAutopilot(!autopilot);
  });
  els.drawBtn.addEventListener('click', onDraw);
  els.playBtn.addEventListener('click', onPlay);
  // 座位滑进弧形（transform 过渡 0.35 秒）结束时再摆一次箭头：开局那一下量到的是滑动前的位置（2026-11-13 8 人局箭头没对上名字）
  els.opps.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform' && e.target.classList && e.target.classList.contains('zm-seat')) placeDir(); });
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
    if (game && game.dealing && !game.tutorial && !game.online) { skipDeal(); return; }
    if (e.target.closest('.zm-card, .zm-btn, .zm-seat, .zm-tool, .zm-coach')) return;
    if (mode === 'target') { cancelTarget(); return; }
    if (selected.length && mode !== 'give') { selected = []; renderHand(); renderBand(); }
  });
  window.addEventListener('resize', () => { if (game) solveSize(); });
  refreshSoundBtn();
  initSocial();
  refreshCover();
  refreshTools();
  // 进来先是主菜单 + 一条进度条（等字体到位，太快也让它走完一程，不闪），跑完换成按钮
  (function boot() {
    coverStep('load');
    els.cover.classList.add('is-loading');   // 加载时插画 + 标题在屏幕正中
    bgm('menu');   // 主页的丁：浏览器要等第一次点按才出声
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
      // 联机：邀请链接 ?room=1234 → 直接弹「加入」；上次的房间还在 → 直接接回去
      const invite = (new URLSearchParams(location.search).get('room') || '').replace(/\D/g, '').slice(0, 4);
      const sess = NET && NET.readSession();
      if (sess && (!invite || invite === sess.code)) { if (await resumeOnline(sess)) return; }
      if (invite && NET && !online) showOnlineEntry(invite);
    });
  })();

  // 本机调试：__zmDebug.demo('boom') 之类，单独放一段动画看效果（见 demo()）
  function demo(name) {
    if (!game) newGame();
    const s = game.state;
    resetTable();
    game.dealing = false;
    const pool = (k) => R.KIND_OF.map((x, id) => (x === k ? id : -1)).filter((id) => id >= 0 && s.hands.every((h) => h.indexOf(id) < 0) && (s.deck.indexOf(id) >= 0 || s.discard.indexOf(id) >= 0 || s.removed.indexOf(id) >= 0));
    const give = (seat, k) => { const id = pool(k)[0]; if (id == null) return; const src = s.deck.indexOf(id) >= 0 ? s.deck : s.discard.indexOf(id) >= 0 ? s.discard : s.removed; src.splice(src.indexOf(id), 1); s.hands[seat].push(id); s.hands[seat] = R.sortHand(s.hands[seat]); };
    const top = (k) => { const id = s.deck.find((x) => R.KIND_OF[x] === k); s.deck.splice(s.deck.indexOf(id), 1); s.deck.unshift(id); };
    s.phase = 'act'; s.pending = null;
    const bot = 1 % s.n;
    const plays = {
      boom: () => { top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      boomme: () => { top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      defuse: () => { if (R.countKind(s.hands[bot], R.DEFUSE) === 0) give(bot, R.DEFUSE); top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      stack5: () => { give(bot, R.ATTACK); s.turn = bot; s.turnsLeft = 3; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      stackme: () => { const b = s.n - 1; give(b, R.ATTACK); s.turn = b; s.turnsLeft = 3; apply(b, { type: 'play', cards: [R.findKind(s.hands[b], R.ATTACK)] }); },
      defuseme: () => { if (R.countKind(s.hands[0], R.DEFUSE) === 0) give(0, R.DEFUSE); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      out: () => { top(R.BOOM); s.turn = bot; s.hands[bot] = s.hands[bot].filter((id) => R.KIND_OF[id] !== R.DEFUSE); apply(bot, { type: 'draw' }); },
      draw: () => { s.turn = 0; apply(0, { type: 'draw' }); },
      attack: () => { give(bot, R.ATTACK); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      alterbot: () => { give(bot, R.ALTER); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ALTER)] }); },
      alter: () => { give(0, R.ALTER); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.ALTER)] }); },
      swap: () => { give(0, R.SWAP); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.SWAP)], target: bot }); },
      swapme: () => { give(bot, R.SWAP); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SWAP)], target: 0 }); },
      stack: () => { give(bot, R.ATTACK); s.turn = bot; s.turnsLeft = 2; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      reverse: () => { give(bot, R.REVERSE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.REVERSE)] }); },
      skip: () => { give(bot, R.SKIP); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SKIP)] }); },
      shuffle: () => { give(bot, R.SHUFFLE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SHUFFLE)] }); },
      future: () => { give(0, R.FUTURE); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.FUTURE)] }); },
      futurebot: () => { give(bot, R.FUTURE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FUTURE)] }); },
      favor: () => { give(bot, R.FAVOR); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FAVOR)], target: 0 }); },
      bottom: () => { give(0, 'bottom'); s.turn = 0; apply(0, { type: 'play', cards: [s.hands[0].find((id) => R.KIND_OF[id] === 'bottom')] }); },
      steal: () => { give(0, 'cow'); give(0, 'cow'); s.turn = 0; apply(0, { type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: bot }); },
      stealme: () => { give(bot, 'cow'); give(bot, 'cow'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: 0 }); },
      stealbot: () => { const o = 2 % s.n; give(bot, 'cow'); give(bot, 'cow'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: o === bot ? 0 : o }); },
      // 抽最左 / 最右那家（手牌一大把）：看扇面出不出框。stealL = 最右那家抽最左那家，stealR 反过来
      stealL: () => { const a = s.n - 1, b = 1; ['orange', 'calico', 'tabby', 'siamese', 'skip', 'shuffle', 'future', 'attack', 'nope', 'favor'].forEach((k) => give(b, k)); give(a, 'cow'); give(a, 'cow'); s.turn = a; apply(a, { type: 'play', cards: s.hands[a].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: b }); },
      stealR: () => { const a = 1, b = s.n - 1; ['orange', 'calico', 'tabby', 'siamese', 'skip', 'shuffle', 'future', 'attack', 'nope', 'favor'].forEach((k) => give(b, k)); give(a, 'cow'); give(a, 'cow'); s.turn = a; apply(a, { type: 'play', cards: s.hands[a].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: b }); },
      triple: () => { give(bot, 'tabby'); give(bot, 'tabby'); give(bot, 'tabby'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: 0, named: R.DEFUSE }); },
      // 万能猫上桌：狸花 + 万能猫凑对偷机器猫一张；三种猫 + 两张万能猫凑五种各一张
      wildpair: () => { give(0, 'tabby'); give(0, R.WILD); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], 'tabby'), R.findKind(s.hands[0], R.WILD)], target: bot }); },
      wildfive: () => { ['orange', 'calico', 'cow', R.WILD, R.WILD].forEach((k) => give(0, k)); s.turn = 0; const w = s.hands[0].filter((id) => R.KIND_OF[id] === R.WILD).slice(0, 2); apply(0, { type: 'play', cards: ['orange', 'calico', 'cow'].map((k) => R.findKind(s.hands[0], k)).concat(w) }); },
      // 我点名要机器猫的「跳过」（他有）/ 机器猫点名要我的「交换」（没开交换牌，一定落空）
      triplehit: () => { give(0, 'tabby'); give(0, 'tabby'); give(0, 'tabby'); give(bot, R.SKIP); s.turn = 0; apply(0, { type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: bot, named: R.SKIP }); },
      triplemiss: () => { give(bot, 'tabby'); give(bot, 'tabby'); give(bot, 'tabby'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: 0, named: R.SWAP }); },
      nope: () => { give(0, R.NOPE); give(bot, R.ATTACK); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      win: () => { for (let i = 1; i < s.n; i++) { s.alive[i] = false; s.outOrder.push(i); s.hands[i] = []; } s.phase = 'over'; s.winner = 0; release(); renderAll(); finish(); },
      deal: () => newGame(),
    };
    release();
    renderAll();
    (plays[name] || plays.draw)();
  }
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).has('zmdemo')) {
    window.__zmDebug = { get game() { return game; }, get online() { return online; }, get busy() { return busy; }, step, newGame, startTutorial, demo, R, AI, fx };
  }
  window.ZhamaoTable = { cardHtml, backHtml, rulesHtml };
})();
