/* 猫咪炸毛 · 单机牌桌（我 + 1–4 只机器猫）。规则 zhamao-rules.js，机器人 zhamao-ai.js，牌面 zhamao-art.js，
 * 教程剧本 zhamao-tutorial.js，声音 zhamao-audio.js。
 * 座位：0 是我（下方），出牌顺序 0 → 1 → 2 …，桌上画成逆时针：1 号在右上，最后一号在左上。
 * 流程：每次改完状态都回到 step()，它看 state.phase 决定等我操作还是让机器人走；动画按引擎返回的事件逐个播。 */
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

  // 节奏（毫秒）：机器人想一下、反应窗、飞牌
  const PACE = { bot: 820, react: 3600, quiet: 650, botNope: [650, 1500], fly: 380, hold: 700 };
  const FAST = { bot: 260, react: 0, quiet: 200, botNope: [200, 300], fly: 220, hold: 250 };
  const TUT_PACE = { bot: 1100, react: 0, quiet: 800, botNope: [900, 900], fly: 460, hold: 1000 };
  const pace = () => (game && game.tutorial ? TUT_PACE : game && !game.state.alive[0] ? FAST : PACE);

  const ACTION_LABEL = {
    attack: '推锅', skip: '装睡', favor: '蹭一张', shuffle: '打翻纸箱', future: '猫眼偷看',
    pair: '偷一张', triple: '点名要', five: '捡一张',
  };
  const ACTION_DESC = {
    attack: '不摸牌，下家连摸两回合', skip: '这回合不摸牌', favor: '指定一人给你一张', shuffle: '洗乱牌堆',
    future: '偷看牌堆最上面三张', pair: '两张一样：随机偷一张', triple: '三张一样：点名要一种牌', five: '五张不同：从弃牌堆捡一张',
  };

  /* ───── 存档 / 设置 ───── */
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式：不存也能玩 */ } }
  const settings = Object.assign({ players: 4, tier: 'normal' }, readJSON(SETTINGS_KEY) || {});
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

  function save() {
    if (!game || game.tutorial) return;
    if (game.state.phase === 'over') { localStorage.removeItem(STORE_KEY); return; }
    writeJSON(STORE_KEY, { v: VERSION, state: game.state, bots: game.bots, tiers: game.tiers });
  }
  function loadSaved() {
    const d = readJSON(STORE_KEY);
    if (!d || d.v !== VERSION || !d.state || d.state.phase === 'over') return null;
    const s = d.state;
    // 粗查一下：牌数守恒、人数对得上，不对就当没有
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
  const backHtml = (cls) => '<div class="zm-card is-back' + (cls ? ' ' + cls : '') + '">' + ART.BACK + '</div>';
  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }

  /* ───── 尺寸：只算 --u ───── */
  function solveSize() {
    const tb = els.table.getBoundingClientRect();
    const W = tb.width - 24, H = tb.height;
    const av = W < 500 ? 46 : 54;
    const fixed = 50 + (av + 50) + 66 + 26 + 40;
    let u = Math.min(W / 5.4, (H - fixed) / 2.7, 98);
    u = Math.max(46, Math.floor(u));
    els.app.style.setProperty('--u', u + 'px');
    layoutHand();
  }

  /* ───── 座位 ───── */
  function seatOrder() { // 对手从左到右：最后一号 … 1 号
    const out = [];
    for (let s = game.state.n - 1; s >= 1; s--) out.push(s);
    return out;
  }
  function seatEl(seat) { return seat === 0 ? els.me : els.opps.querySelector('[data-seat="' + seat + '"]'); }
  function avEl(seat) { const s = seatEl(seat); return s && s.querySelector('.zm-av'); }

  function buildSeats() {
    els.opps.innerHTML = '';
    const order = seatOrder(), mid = (order.length - 1) / 2;
    order.forEach((seat, i) => {
      const d = document.createElement('section');
      d.className = 'zm-seat';
      d.dataset.seat = seat;
      const off = mid > 0 ? Math.pow(Math.abs(i - mid) / mid, 2) * 22 : 0;
      d.style.transform = 'translateY(' + off.toFixed(1) + 'px)';
      d.addEventListener('click', () => onSeatTap(seat));
      els.opps.appendChild(d);
    });
    els.me.dataset.seat = 0;
  }
  function renderSeat(seat) {
    const s = game.state, box = seatEl(seat);
    if (!box) return;
    const out = !s.alive[seat];
    const turn = !out && s.phase !== 'over' && R.whoActs(s).indexOf(seat) >= 0 && s.phase !== 'react';
    box.classList.toggle('is-out', out);
    box.classList.toggle('is-turn', turn);
    const tier = seat !== 0 && game.tiers[seat] && !game.tutorial ? '<span class="zm-tier">' + AI.TIER_NAMES[game.tiers[seat]] + '</span>' : '';
    const turns = !out && s.turn === seat && s.turnsLeft > 1 && s.phase !== 'over' ? '<span class="zm-turns" title="还要摸几回合">×' + s.turnsLeft + '</span>' : '';
    const count = seat !== 0 && !out ? '<span class="zm-count">' + s.hands[seat].length + '</span>' : '';
    box.innerHTML = '<div class="zm-av">' + avatarHtml(seat) + count + turns + '</div>' +
      '<span class="zm-name">' + esc(nameOf(seat)) + '</span>' + tier +
      (out ? '<span class="zm-out-stamp">炸毛</span>' : '');
  }
  function renderSeats() { for (let i = 0; i < game.state.n; i++) renderSeat(i); }

  function bubble(seat, text, ms) {
    const box = seatEl(seat);
    if (!box) return;
    const b = document.createElement('span');
    b.className = 'zm-bubble';
    b.textContent = text;
    if (ms) b.style.animationDuration = ms + 'ms';
    box.appendChild(b);
    setTimeout(() => b.remove(), ms || 1700);
  }

  /* ───── 牌堆 / 弃牌堆 ───── */
  function renderPiles() {
    const s = game.state;
    const stack = els.deck.querySelector('.zm-deck-stack');
    const n = Math.min(4, s.deck.length + (s.phase === 'defuse' ? 0 : 0));
    let h = '';
    for (let i = 0; i < n; i++) h += backHtml().replace('class="zm-card is-back"', 'class="zm-card is-back" style="transform:translate(' + (-i * 1.5) + 'px,' + (-i * 1.5) + 'px)"');
    stack.innerHTML = h;
    els.deckCount.textContent = s.deck.length;
    const k = R.kittensInDeck(s);
    els.kit.innerHTML = k ? ART.icon('boom') + '×' + k : '';
    els.kit.title = '牌堆里还有 ' + k + ' 只炸毛猫';
    // 反应窗里，刚出的牌和「不行」还摆在桌子中间，弃牌堆先不画它们
    const onStage = s.phase === 'react' && s.pending ? s.pending.cards.concat(s.pending.nopes.map((x) => x.card)) : [];
    const top = s.discard.filter((id) => onStage.indexOf(id) < 0).slice(-3);
    els.discard.innerHTML = top.map((id, i) => {
      const r = ((id * 37) % 13) - 6;
      return cardHtml(id, '', 'transform:rotate(' + r + 'deg) translate(' + ((i - top.length + 1) * 2) + 'px,0)');
    }).join('');
    const known = s.memo[0].deck.length > 0 && s.deck.indexOf(s.memo[0].deck[0]) === 0;
    els.deck.classList.toggle('is-hot', known && R.KIND_OF[s.deck[0]] === R.BOOM && s.alive[0]);
  }

  /* ───── 手牌 ───── */
  let handIds = [];
  function renderHand(newIds) {
    const s = game.state;
    const hand = s.alive[0] ? s.hands[0] : [];
    selected = selected.filter((id) => hand.indexOf(id) >= 0);
    handIds = hand.slice();
    els.hand.innerHTML = hand.map((id) => cardHtml(id, (selected.indexOf(id) >= 0 ? 'is-sel' : '') + (newIds && newIds.indexOf(id) >= 0 ? ' is-new' : ''))).join('');
    els.hand.querySelectorAll('.zm-card').forEach((c) => {
      c.addEventListener('click', (e) => { e.stopPropagation(); onCardTap(+c.dataset.id, c); });
    });
    els.hand.classList.toggle('is-giving', mode === 'give');
    layoutHand();
  }
  function layoutHand() {
    const cards = els.hand.querySelectorAll('.zm-card');
    if (!cards.length) return;
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
    const W = els.hand.clientWidth - 8;
    const n = cards.length;
    let gap = 6;
    if (n * u + (n - 1) * gap > W) gap = (W - u) / (n - 1) - u;
    cards.forEach((c, i) => { c.style.marginLeft = i === 0 ? '0' : gap.toFixed(1) + 'px'; c.style.zIndex = i; });
  }

  /* ───── 按钮带 ───── */
  function myTurnToAct() { const s = game.state; return !busy && s.phase === 'act' && s.turn === 0 && s.alive[0]; }
  function renderBand() {
    const s = game.state;
    els.nopeBtn.hidden = !(s.phase === 'react' && reactOpen && R.canNope(s, 0));
    els.cancelBtn.hidden = mode !== 'target';
    let hint = '';
    els.playBtn.hidden = true;
    els.drawBtn.hidden = false;
    els.drawBtn.disabled = true;
    els.drawBtn.textContent = '摸牌';
    if (s.phase === 'over') {
      els.drawBtn.hidden = true;
    } else if (!s.alive[0]) {
      hint = '你炸毛了，看看谁能撑到最后';
      els.drawBtn.hidden = false; els.drawBtn.disabled = false; els.drawBtn.textContent = '直接看结果';
    } else if (mode === 'target') {
      hint = '点一个人';
      els.drawBtn.hidden = true;
    } else if (mode === 'give') {
      hint = '挑一张给 ' + nameOf(s.give.to);
      els.drawBtn.hidden = true;
      els.playBtn.hidden = false;
      els.playBtn.textContent = '给他';
      els.playBtn.disabled = selected.length !== 1;
    } else if (s.phase === 'react' && !els.nopeBtn.hidden) {
      hint = s.pending.by === 0 && s.pending.nopes.length % 2 ? '你的牌被作废了，要顶回去吗？' : '要作废它吗？';
      els.drawBtn.hidden = true;
    } else if (myTurnToAct()) {
      els.drawBtn.disabled = false;
      const c = selected.length ? R.classify(selected) : null;
      if (selected.length && c) {
        els.playBtn.hidden = false;
        els.playBtn.disabled = false;
        els.playBtn.textContent = ACTION_LABEL[c.type];
        hint = ACTION_DESC[c.type];
        if (c.needsTarget && !R.validTargets(s, 0).length) { els.playBtn.disabled = true; hint = '没人手里有牌'; }
      } else if (selected.length) {
        hint = selectionHint(selected);
      } else {
        hint = s.turnsLeft > 1 ? '这回合要摸 ' + s.turnsLeft + ' 次' : '出牌，或者摸一张结束回合';
      }
    } else if (s.phase !== 'over') {
      const who = R.whoActs(s)[0];
      if (s.phase === 'act' && who !== 0) hint = nameOf(who) + (s.turnsLeft > 1 ? '（还要摸 ' + s.turnsLeft + ' 次）' : '');
    }
    els.hint.textContent = hint;
  }
  function selectionHint(sel) {
    const kinds = sel.map((id) => R.KIND_OF[id]);
    if (sel.length === 1) {
      if (kinds[0] === R.DEFUSE) return '逗猫棒摸到炸毛猫时自动用';
      if (kinds[0] === R.NOPE) return '「不行」在别人出牌时用';
      return '单张猫牌没用，两张一样能偷牌';
    }
    return '这几张凑不成组合';
  }

  /* ───── 舞台：刚出的牌 ───── */
  let reactOpen = false;
  function showStage(p) {
    const s = game.state;
    const who = '<span class="mini">' + avatarHtml(p.by) + '</span>' + esc(nameOf(p.by)) +
      (p.target >= 0 ? '<span class="arrow">→</span><span class="mini">' + avatarHtml(p.target) + '</span>' + esc(nameOf(p.target)) : '');
    const sub = p.type === 'triple' ? '点名要：' + R.NAMES[p.named] : p.type === R.ATTACK ? '下家连摸两回合' : ACTION_DESC[p.type] || '';
    els.stage.classList.remove('is-cancelled');
    els.stage.innerHTML = '<div class="zm-stage-inner"><div class="zm-stage-who">' + who + '</div>' +
      '<div class="zm-stage-cards">' + p.cards.map((id) => cardHtml(id)).join('') + '<div class="zm-stage-nopes"></div></div>' +
      '<div class="zm-stage-label">' + ACTION_LABEL[p.type] + '</div><div class="zm-stage-sub">' + esc(sub) + '</div>' +
      '<div class="zm-react-bar"><i></i></div></div>';
    void s;
  }
  function stageCardsEl() { return els.stage.querySelector('.zm-stage-cards'); }
  function stageNope(id, count) {
    const box = els.stage.querySelector('.zm-stage-nopes');
    if (!box) return;
    const r = (count % 2 ? -1 : 1) * (8 + count * 3);
    box.insertAdjacentHTML('beforeend', cardHtml(id, '', 'transform:translate(-50%,-50%) rotate(' + r + 'deg)'));
    const lab = els.stage.querySelector('.zm-stage-label');
    if (lab) lab.textContent = count % 2 ? '被作废了？' : '不行的不行：照样生效？';
  }
  function stamp(text, ok) {
    const inner = els.stage.querySelector('.zm-stage-inner');
    if (!inner) return;
    const sp = document.createElement('span');
    sp.className = 'zm-stamp' + (ok ? ' is-ok' : '');
    sp.textContent = text;
    inner.appendChild(sp);
  }
  function reactBar(ms) {
    const i = els.stage.querySelector('.zm-react-bar i');
    if (!i) return;
    i.getAnimations().forEach((a) => a.cancel());
    if (ms > 0) i.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    else i.style.transform = 'scaleX(0)';
    const ring = els.nopeBtn.querySelector('.zm-nope-ring');
    ring.getAnimations().forEach((a) => a.cancel());
    if (ms > 0) ring.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
  }
  function clearStage() { els.stage.innerHTML = ''; els.stage.classList.remove('is-cancelled'); }

  /* ───── 飞牌 ───── */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function rectOf(node) { return node.getBoundingClientRect(); }
  function centerOf(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function seatRect(seat) {
    if (seat === 0) return rectOf(els.hand);
    const a = avEl(seat);
    return a ? rectOf(a) : rectOf(els.opps);
  }
  /* html：飞的那张牌；from/to：矩形；w0/w1：起止宽度 */
  function fly(html, from, to, opts) {
    opts = opts || {};
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
    const w0 = opts.w0 || u, w1 = opts.w1 || u;
    const node = el(html);
    node.style.width = w0 + 'px';
    els.fly.appendChild(node);
    const a = centerOf(from), b = centerOf(to);
    const h0 = w0 * 1.4;
    const x0 = a.x - w0 / 2, y0 = a.y - h0 / 2;
    const sc = w1 / w0;
    const dx = b.x - a.x, dy = b.y - a.y;
    const rot = opts.rot || 0;
    const anim = node.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1) rotate(0deg)', opacity: opts.fadeIn ? 0 : 1 },
      { transform: 'translate(' + (x0 + dx) + 'px,' + (y0 + dy) + 'px) scale(' + sc + ') rotate(' + rot + 'deg)', opacity: opts.fadeOut ? 0 : 1 },
    ], { duration: opts.dur || pace().fly, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    return anim.finished.then(() => { if (!opts.keep) node.remove(); return node; }, () => { node.remove(); });
  }
  const isMine = (e) => e.priv ? e.priv.indexOf(0) >= 0 : true;

  /* ───── 流程 ───── */
  function schedule(ms, fn) {
    const t = token;
    setTimeout(() => { if (t === token) fn(); }, ms);
  }
  function renderAll(newIds) { renderSeats(); renderPiles(); renderHand(newIds); renderBand(); }

  function step() {
    if (!game) return;
    const s = game.state;
    save();
    clearReactTimer();
    reactOpen = false;
    renderAll();
    if (tut && !coachQueue) hint('');
    if (s.phase === 'over') { finish(); return; }
    if (tut && tut.beforeStep && tut.beforeStep(s, coachThen)) return;
    switch (s.phase) {
      case 'act':
        if (s.turn === 0) { busy = false; mode = null; renderBand(); idle(); }
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
        if (s.defuse.by === 0) { busy = false; insertDialog(); }
        else schedule(pace().bot, () => apply(s.defuse.by, decideBot(s.defuse.by)));
        break;
    }
  }
  function idle() { if (tut && tut.idle) tut.idle(game.state); }
  function coachThen(msgs, then) { showCoach(msgs, then || step); }

  function decideBot(seat) {
    const s = game.state;
    if (tut && tut.bot) { const d = tut.bot(s, seat); if (d) return d; }
    return AI.decide(s, seat, game.tiers[seat] || 'normal');
  }
  function botAct(seat) {
    busy = true;
    schedule(pace().bot, () => apply(seat, decideBot(seat)));
  }

  /* 把一个决定落到引擎上，然后播动画、回到 step */
  async function apply(seat, d) {
    const s = game.state, t = token;
    busy = true;
    selected = [];
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
      if (seat !== 0) { try { ev = R.draw(s, seat); } catch (_) { return; } } else { busy = false; step(); return; }
    }
    mode = null;
    renderBand();
    await playEvents(ev, t);
    if (t !== token) return;
    if (tut && tut.after) { const msgs = tut.after(ev, game.state); if (msgs && msgs.length) { showCoach(msgs, step); return; } }
    step();
  }

  async function playEvents(ev, t) {
    for (const e of ev) {
      if (t !== token) return;
      await anim(e, t);
    }
  }

  async function anim(e, t) {
    const s = game.state, P = pace();
    switch (e.t) {
      case 'play': {
        snd('play');
        const p = s.pending || { by: e.seat, type: e.type, cards: e.cards, target: e.target, named: e.named, nopes: [] };
        // 从出牌人飞到桌中
        const from = seatRect(e.seat);
        const handEls = e.seat === 0 ? e.cards.map((id) => els.hand.querySelector('[data-id="' + id + '"]')).filter(Boolean) : [];
        handEls.forEach((h) => { h.style.visibility = 'hidden'; });
        const to = rectOf(els.center);
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        await Promise.all(e.cards.map((id, i) => fly(cardHtml(id), handEls[i] ? rectOf(handEls[i]) : from, to, { w0: e.seat === 0 ? u : u * 0.5, w1: u * 1.15, rot: (i - (e.cards.length - 1) / 2) * 6 })));
        if (t !== token) return;
        showStage(p);
        renderSeat(e.seat);
        if (e.seat === 0) renderHand();
        return;
      }
      case 'nope': {
        snd('nope');
        bubble(e.seat, '喵？不行！', 1400);
        const handEl = e.seat === 0 ? els.hand.querySelector('[data-id="' + e.card + '"]') : null;
        if (handEl) handEl.style.visibility = 'hidden';
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        const target = stageCardsEl() ? rectOf(stageCardsEl()) : rectOf(els.center);
        await fly(cardHtml(e.card), handEl ? rectOf(handEl) : seatRect(e.seat), target, { w0: e.seat === 0 ? u : u * 0.5, w1: u, rot: e.count % 2 ? -10 : 10 });
        if (t !== token) return;
        stageNope(e.card, e.count);
        renderSeat(e.seat);
        if (e.seat === 0) renderHand();
        return;
      }
      case 'resolve': {
        const lab = els.stage.querySelector('.zm-stage-label');
        if (lab && game.lastNopes) lab.textContent = e.cancelled ? '作废了' : '照样生效';
        if (e.cancelled) { els.stage.classList.add('is-cancelled'); stamp('作废'); snd('cancel'); }
        else if (game.lastNopes) stamp('照样生效', true);
        await wait(e.cancelled || game.lastNopes ? P.hold : P.hold * 0.45);
        if (t !== token) return;
        // 舞台上的牌收进弃牌堆
        const cs = els.stage.querySelectorAll('.zm-stage-inner .zm-card');
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        const to = rectOf(els.discard);
        const flights = [];
        cs.forEach((c) => { flights.push(fly(cardHtml(+c.dataset.id), rectOf(c), to, { w0: c.getBoundingClientRect().width, w1: u * 0.92, dur: 260 })); });
        clearStage();
        await Promise.all(flights);
        renderPiles();
        if (!e.cancelled) effectHint(e);
        return;
      }
      case 'turn': {
        renderSeats();
        if (e.attacked) { bubble(e.seat, '要摸 ' + e.turnsLeft + ' 次！', 1600); snd('attack'); await wait(P.hold * 0.6); }
        else if (e.seat === 0 && s.alive[0]) snd('turn');
        return;
      }
      case 'shuffle': {
        snd('shuffle');
        els.deck.classList.add('is-shuffling');
        await wait(1000);
        els.deck.classList.remove('is-shuffling');
        renderPiles();
        return;
      }
      case 'future': {
        if (isMine(e) && e.cards) { await futureDialog(e.cards); }
        else { bubble(e.seat, '偷看了 ' + (e.count || 3) + ' 张', 1500); await wait(P.hold); }
        return;
      }
      case 'askGive': return;
      case 'askPick': return;
      case 'give':
      case 'steal': {
        snd('steal');
        const mine = isMine(e) && e.card != null;
        const fromEl = e.from === 0 ? els.hand.querySelector('[data-id="' + e.card + '"]') : null;
        if (fromEl) fromEl.style.visibility = 'hidden';
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        await fly(mine ? cardHtml(e.card) : backHtml(), fromEl ? rectOf(fromEl) : seatRect(e.from), seatRect(e.to), { w0: e.from === 0 ? u : u * 0.55, w1: e.to === 0 ? u : u * 0.55, dur: P.fly * 1.4 });
        if (t !== token) return;
        if (e.to === 0) { renderHand([e.card]); }
        if (e.from === 0) renderHand();
        renderSeats();
        if (e.to === 0 && e.card != null) bubble(0, '拿到「' + R.NAMES[R.KIND_OF[e.card]] + '」', 1600);
        if (e.from === 0 && e.card != null && e.t === 'steal') bubble(0, '被偷走「' + R.NAMES[R.KIND_OF[e.card]] + '」', 1600);
        await wait(P.hold * 0.4);
        return;
      }
      case 'take': {
        snd('steal');
        const fromEl = e.from === 0 ? els.hand.querySelector('[data-id="' + e.card + '"]') : null;
        if (fromEl) fromEl.style.visibility = 'hidden';
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        await fly(cardHtml(e.card), fromEl ? rectOf(fromEl) : seatRect(e.from), seatRect(e.to), { w0: e.from === 0 ? u : u * 0.6, w1: e.to === 0 ? u : u * 0.6, dur: P.fly * 1.4 });
        if (t !== token) return;
        renderHand(e.to === 0 ? [e.card] : null);
        renderSeats();
        bubble(e.to, '要到了「' + R.NAMES[e.named] + '」', 1600);
        await wait(P.hold * 0.4);
        return;
      }
      case 'miss': {
        bubble(e.from, '没有' + R.NAMES[e.named], 1600);
        snd('miss');
        await wait(P.hold);
        return;
      }
      case 'pick': {
        snd('steal');
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        renderPiles();
        await fly(cardHtml(e.card), rectOf(els.discard), seatRect(e.seat), { w0: u * 0.92, w1: e.seat === 0 ? u : u * 0.6, dur: P.fly * 1.4 });
        if (t !== token) return;
        renderHand(e.seat === 0 ? [e.card] : null);
        renderSeats();
        bubble(e.seat, '捡回「' + R.NAMES[R.KIND_OF[e.card]] + '」', 1600);
        await wait(P.hold * 0.4);
        return;
      }
      case 'draw': {
        snd('draw');
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        renderPiles();
        const mine = e.seat === 0 && e.card != null;
        await fly(backHtml(), rectOf(els.deck), seatRect(e.seat), { w0: u * 0.92, w1: e.seat === 0 ? u : u * 0.55 });
        if (t !== token) return;
        if (mine) renderHand([e.card]);
        renderSeats();
        return;
      }
      case 'boom': {
        snd('boom');
        renderPiles();
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        const node = await fly(cardHtml(e.card), rectOf(els.deck), rectOf(els.center), { w0: u * 0.92, w1: u * 1.7, keep: true, dur: 300 });
        if (t !== token) { if (node) node.remove(); return; }
        const flash = document.createElement('div');
        flash.className = 'zm-flash';
        els.app.appendChild(flash);
        setTimeout(() => flash.remove(), 950);
        if (node) { // 在落点上原地一放一抖（飞牌动画的 transform 还 fill 着，抖动接在它后面）
          const base = getComputedStyle(node).transform;
          node.animate([
            { transform: base + ' scale(.55) rotate(-18deg)' }, { transform: base + ' scale(1.12) rotate(7deg)' },
            { transform: base + ' rotate(-4deg)' }, { transform: base + ' rotate(2deg)' }, { transform: base },
          ], { duration: 700, easing: 'ease-out', fill: 'forwards' });
        }
        bubble(e.seat, '炸毛了！', 1500);
        game.boomNode = node;
        await wait(P.hold * 1.3);
        return;
      }
      case 'defuse': {
        snd('defuse');
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        const handEl = e.seat === 0 ? els.hand.querySelector('[data-id="' + e.card + '"]') : null;
        if (handEl) handEl.style.visibility = 'hidden';
        await fly(cardHtml(e.card), handEl ? rectOf(handEl) : seatRect(e.seat), rectOf(els.center), { w0: e.seat === 0 ? u : u * 0.55, w1: u * 1.3, rot: 14, dur: P.fly * 1.2, keep: false });
        if (t !== token) return;
        bubble(e.seat, '用逗猫棒哄好了', 1600);
        await wait(P.hold);
        if (game.boomNode) { game.boomNode.remove(); game.boomNode = null; }
        renderHand();
        renderSeats();
        renderPiles();
        return;
      }
      case 'insert': {
        const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
        if (game.boomNode) { game.boomNode.remove(); game.boomNode = null; }
        await fly(backHtml(), rectOf(els.center), rectOf(els.deck), { w0: u * 1.2, w1: u * 0.92, dur: P.fly * 1.3 });
        if (t !== token) return;
        snd('insert');
        if (e.seat !== 0) bubble(e.seat, '偷偷塞回去了', 1500);
        renderPiles();
        return;
      }
      case 'out': {
        snd('out');
        if (game.boomNode) { game.boomNode.remove(); game.boomNode = null; }
        renderSeats();
        renderPiles();
        if (e.seat === 0) { renderHand(); }
        await wait(P.hold);
        return;
      }
      case 'win': return;
    }
  }
  function effectHint(e) {
    if (e.type === R.SKIP) bubble(e.seat, '装睡中…Zz', 1500);
    if (e.type === R.SHUFFLE) bubble(e.seat, '打翻了纸箱', 1300);
  }

  /* ───── 反应窗：出完牌大家决定要不要「不行」 ───── */
  function clearReactTimer() { if (reactTimer) { clearTimeout(reactTimer); reactTimer = null; } }
  function reactPhase() {
    const s = game.state, P = pace();
    busy = true;
    game.lastNopes = s.pending.nopes.length;
    if (!els.stage.querySelector('.zm-stage-inner')) showStage(s.pending);
    // 机器人：第一个想作废的人，过一会儿出手（我可以抢在前面）
    let botSeat = -1;
    for (const t of R.awaitingReaction(s)) {
      if (t === 0) continue;
      let want;
      if (tut && tut.botNope) want = tut.botNope(s, t);
      if (want == null) want = R.canNope(s, t) && AI.decide(s, t, game.tiers[t] || 'normal').type === 'nope';
      if (want) { botSeat = t; break; }
    }
    const meCan = R.canNope(s, 0) && R.awaitingReaction(s).indexOf(0) >= 0;
    const tutWaitMe = tut && tut.mustNope && tut.mustNope(s);
    const botDelay = botSeat >= 0 ? P.botNope[0] + Math.random() * (P.botNope[1] - P.botNope[0]) : Infinity;
    let windowMs = meCan ? (tutWaitMe ? Infinity : P.react || 1400) : P.quiet;
    const fireAt = Math.min(botDelay, windowMs);
    reactOpen = meCan;
    busy = !meCan;
    renderBand();
    reactBar(meCan && isFinite(windowMs) ? windowMs : 0);
    if (meCan) { snd('ask'); idle(); }
    if (!isFinite(fireAt)) return; // 教程：等我自己点
    const t = token;
    reactTimer = setTimeout(() => {
      if (t !== token || game.state.phase !== 'react') return;
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
    renderBand();
    const ev = R.nope(s, seat);
    await playEvents(ev, t);
    if (t !== token) return;
    if (tut && tut.after) { const msgs = tut.after(ev, game.state); if (msgs && msgs.length) { showCoach(msgs, step); return; } }
    step();
  }
  async function closeReact() {
    clearReactTimer();
    const s = game.state, t = token;
    reactOpen = false;
    busy = true;
    renderBand();
    for (const x of R.awaitingReaction(s)) R.pass(s, x);
    const ev = R.closeReaction(s);
    await playEvents(ev, t);
    if (t !== token) return;
    if (tut && tut.after) { const msgs = tut.after(ev, game.state); if (msgs && msgs.length) { showCoach(msgs, step); return; } }
    step();
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
    snd('tap');
    renderHand();
    renderBand();
  }
  function onDraw() {
    const s = game.state;
    if (!s.alive[0] && s.phase !== 'over') { skipToEnd(); return; }
    if (!myTurnToAct()) return;
    if (tut && tut.allow && !tut.allow({ type: 'draw' })) { shake(els.drawBtn); return; }
    selected = [];
    apply(0, { type: 'draw' });
  }
  function onPlay() {
    const s = game.state;
    if (mode === 'give') {
      if (selected.length !== 1) return;
      if (tut && tut.allow && !tut.allow({ type: 'give', card: selected[0] })) { shake(els.playBtn); return; }
      const id = selected[0];
      mode = null;
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

  /* ───── 弹窗 ───── */
  let dialogClose = null;
  function openDialog(html, onMount, onClose) {
    els.dialog.innerHTML = html;
    els.mask.hidden = false;
    dialogClose = onClose || null;
    if (onMount) onMount(els.dialog);
    const f = els.dialog.querySelector('[data-focus]') || els.dialog.querySelector('button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeDialog() {
    els.mask.hidden = true;
    els.dialog.innerHTML = '';
    const cb = dialogClose;
    dialogClose = null;
    return cb;
  }

  function futureDialog(cards) {
    return new Promise((resolve) => {
      const labels = ['最上面', '第 2 张', '第 3 张'];
      snd('peek');
      openDialog('<h2>猫眼偷看</h2><p class="zm-muted">牌堆最上面' + (cards.length < 3 ? '只剩 ' + cards.length + ' 张' : '三张') + '，从左到右是接下来摸到的顺序（别人看不到）</p>' +
        '<div class="zm-future">' + cards.map((id, i) => '<figure>' + cardHtml(id) + '<figcaption>' + labels[i] + '</figcaption></figure>').join('') + '</div>' +
        '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>知道了</button></div>', (d) => {
        d.querySelector('[data-ok]').addEventListener('click', () => { closeDialog(); resolve(); });
      }, resolve);
    });
  }

  function nameDialog(cb) {
    const kinds = R.KINDS.filter((k) => k !== R.BOOM);
    openDialog('<h2>点名要哪种牌？</h2><p class="zm-muted">他手里有，就得给你一张；没有就落空</p>' +
      '<div class="zm-grid">' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '</button>').join('') + '</div>' +
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
      '<div class="zm-grid">' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '<span>×' + by[k].length + '</span></button>').join('') + '</div>', (d) => {
      d.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
        const id = by[b.dataset.k][by[b.dataset.k].length - 1];
        if (tut && tut.allow && !tut.allow({ type: 'pick', card: id })) { shake(b); return; }
        closeDialog();
        apply(0, { type: 'pick', card: id });
      }));
    });
  }

  function insertDialog() {
    const s = game.state;
    const size = s.deck.length;
    let pos = 0;
    const label = (p) => (size === 0 ? '牌堆空了，放回去' : p === 0 ? '最上面（下一张就是它）' : p === size ? '最底下' : '从上往下第 ' + (p + 1) + ' 张');
    const row = (p) => {
      const show = Math.min(size, 7);
      let h = '';
      const before = Math.min(p, 3), after = Math.min(size - p, show - before);
      for (let i = 0; i < before; i++) h += backHtml();
      if (p > 3) h = backHtml() + '<span class="more">…</span>' + backHtml() + backHtml();
      h += cardHtml('boom', 'is-kit');
      for (let i = 0; i < after; i++) h += backHtml();
      if (size - p > after) h += '<span class="more">+' + (size - p - after) + '</span>';
      return h;
    };
    snd('defuse');
    openDialog('<h2>把炸毛猫塞回牌堆</h2><p class="zm-muted">牌堆还有 ' + size + ' 张，你选个位置偷偷塞进去（别人看不到）。塞在最上面，下一个摸牌的人就倒霉了</p>' +
      '<div class="zm-insert-row" data-row>' + row(0) + '</div><div class="zm-insert-label" data-lab>' + label(0) + '</div>' +
      '<input class="zm-range" type="range" min="0" max="' + size + '" step="1" value="0" data-range aria-label="塞在第几张">' +
      '<div class="zm-quick"><button type="button" class="zm-btn" data-q="0">最上面</button><button type="button" class="zm-btn" data-q="1">第 2 张</button>' +
      '<button type="button" class="zm-btn" data-q="mid">中间</button><button type="button" class="zm-btn" data-q="end">最底下</button><button type="button" class="zm-btn" data-q="rand">随机</button></div>' +
      '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>塞进去</button></div>', (d) => {
      const range = d.querySelector('[data-range]');
      const set = (p) => { pos = Math.max(0, Math.min(size, p)); range.value = pos; d.querySelector('[data-row]').innerHTML = row(pos); d.querySelector('[data-lab]').textContent = label(pos); };
      range.addEventListener('input', () => set(+range.value));
      d.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        const q = b.dataset.q;
        set(q === 'mid' ? Math.floor(size / 2) : q === 'end' ? size : q === 'rand' ? (Math.random() * (size + 1)) | 0 : +q);
      }));
      d.querySelector('[data-ok]').addEventListener('click', () => {
        if (tut && tut.allow && !tut.allow({ type: 'insert', pos })) { shake(d.querySelector('[data-ok]')); return; }
        closeDialog();
        apply(0, { type: 'insert', pos });
      });
    });
  }

  function finish() {
    busy = true;
    const s = game.state;
    clearStage();
    renderAll();
    const order = [s.winner].concat(s.outOrder.slice().reverse());
    const won = s.winner === 0;
    snd(won ? 'win' : 'lose');
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
    const tags = (i) => (i === 0 ? '撑到最后' : '第 ' + (i + 1) + ' 名');
    openDialog('<h2>' + (won ? '你撑到了最后！' : nameOf(s.winner) + ' 撑到了最后') + '</h2>' +
      '<ol class="zm-rank">' + order.map((seat, i) => '<li class="' + (seat === 0 ? 'is-me' : '') + '"><span class="pos">' + (i + 1) + '</span><span class="mini">' + avatarHtml(seat) + '</span><span class="nm">' + esc(nameOf(seat)) + '</span><span class="tag">' + (i === 0 ? '赢' : i === order.length - 1 ? '最先炸毛' : tags(i)) + '</span></li>').join('') + '</ol>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-home>回封面</button><button type="button" class="zm-btn zm-btn-primary" data-again data-focus>再来一局</button></div>', (d) => {
      d.querySelector('[data-again]').addEventListener('click', () => { closeDialog(); newGame(); });
      d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); showCover(); });
    });
  }

  function rulesHtml() {
    const li = (k, t) => '<li>' + cardHtml(k) + '<b>' + R.NAMES[k] + '</b>　' + t + '</li>';
    return '<div class="zm-rules"><h2>怎么玩</h2>' +
      '<p>牌堆里藏着炸毛猫（比人数少一只）。轮到你时，可以出任意多张牌，也可以一张不出，<b>最后摸一张牌结束回合</b>。摸到炸毛猫、手里又没有逗猫棒，就出局。撑到最后的人赢。</p>' +
      '<h3>每人开局</h3><ul><li>4 张随机牌 + 1 张逗猫棒。牌堆右下角数字是剩几张、红色小炸毛猫是里面还有几只。</li></ul>' +
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
      '<h3>操作</h3><ul><li>点手牌选中（可多选），按钮会显示这几张能干什么；需要指定人时再点他的头像。</li>' +
      '<li>别人出牌后桌子中间会停一下：你手里有「喵？不行」就会出现紫色按钮，倒计时内点它作废。</li></ul></div>';
  }
  function showRules() {
    openDialog(rulesHtml() + '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>好</button></div>', (d) => {
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
    });
  }

  function showSettings(fromCover) {
    const draft = { players: settings.players, tier: settings.tier, rules: Object.assign({}, settings.rules) };
    const seg = (key, opts, val) => '<div class="zm-seg" data-seg="' + key + '">' + opts.map(([v, t]) => '<button type="button" data-v="' + v + '" class="' + (String(v) === String(val) ? 'is-on' : '') + '">' + t + '</button>').join('') + '</div>';
    openDialog('<h2>设置</h2><div class="zm-set">' +
      '<div class="zm-set-row"><span>几个人玩（含你）</span>' + seg('players', [[2, '2 人'], [3, '3 人'], [4, '4 人'], [5, '5 人']], draft.players) + '</div>' +
      '<div class="zm-set-row"><span>机器猫水平</span>' + seg('tier', AI.TIERS.map((t) => [t, AI.TIER_NAMES[t]]), draft.tier) + '</div>' +
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
        const key = g.dataset.seg, v = b.dataset.v;
        if (key === 'players') draft.players = +v;
        else if (key === 'tier') draft.tier = v;
        else if (key === 'stackAttack') draft.rules.stackAttack = v === 'true';
        else draft.rules[key] = v;
      }));
      const commit = () => { Object.assign(settings, draft); settings.rules = R.normalizeRules(draft.rules); saveSettings(); refreshCover(); };
      d.querySelector('[data-cancel]').addEventListener('click', closeDialog);
      d.querySelector('[data-save]').addEventListener('click', () => { commit(); closeDialog(); });
      const sn = d.querySelector('[data-savenew]');
      if (sn) sn.addEventListener('click', () => { commit(); closeDialog(); newGame(); });
    });
  }

  /* ───── 菜单 / 声音 ───── */
  let menu = null;
  function toggleMenu(e) {
    if (e) e.stopPropagation();
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'zm-menu';
      menu.setAttribute('role', 'menu');
      menu.hidden = true;
      menu.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-m]');
        if (!b) return;
        menu.hidden = true;
        const k = b.dataset.m;
        if (k === 'restart') newGame();
        else if (k === 'settings') showSettings(false);
        else if (k === 'tutorial') startTutorial();
        else if (k === 'cover') showCover();
        else if (k === 'exit') location.href = '/toolbox/';
      });
      document.addEventListener('click', (ev) => { if (menu && !menu.hidden && !ev.target.closest('.zm-menu, #zmMenuBtn')) menu.hidden = true; });
      els.app.appendChild(menu);
    }
    const inTut = game && game.tutorial;
    menu.innerHTML = (inTut ? '<button type="button" data-m="cover">退出教程</button>' :
      '<button type="button" data-m="restart">重新开一局</button><button type="button" data-m="settings">设置</button><button type="button" data-m="tutorial">新手教程</button><button type="button" data-m="cover">回封面</button>') +
      '<hr><button type="button" data-m="exit">返回百宝奇巧</button>';
    menu.hidden = !menu.hidden;
    if (!menu.hidden) {
      const r = $('zmMenuBtn').getBoundingClientRect(), ar = els.app.getBoundingClientRect();
      menu.style.top = Math.round(r.bottom - ar.top + 8) + 'px';
      menu.style.right = Math.round(ar.right - r.right) + 'px';
    }
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
    els.coach.hidden = false;
    els.coach.classList.remove('is-hint');
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(m);
  }
  function hint(text) { // 不挡操作的小提示（落在桌子下沿）
    if (!text) { if (!coachQueue) hideCoach(); return; }
    els.coach.hidden = false;
    els.coach.classList.add('is-hint');
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(text);
  }
  function hideCoach() { els.coach.hidden = true; els.coach.classList.remove('is-hint'); }
  document.addEventListener('click', (e) => {
    if (coachQueue && !els.coach.hidden && !els.coach.classList.contains('is-hint') && !e.target.closest('.zm-dialog-mask, .zm-menu, .zm-tools')) { e.stopPropagation(); nextCoach(); }
  }, true);
  document.addEventListener('keydown', (e) => { if (coachQueue && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nextCoach(); } });

  function startTutorial() {
    if (!TUT) return;
    closeDialog();
    token++;
    clearReactTimer();
    clearStage();
    hideCoach();
    coachQueue = null;
    const ctl = TUT.create(R, { hint, say: (msgs, then) => showCoach(msgs, then || step) });
    tut = ctl;
    game = { state: ctl.state, bots: [{ nick: '我', avatar: null }, { nick: ctl.botName, avatar: ctl.botAvatar }], tiers: [null, 'normal'], tutorial: true };
    els.cover.hidden = true;
    els.skipTut.hidden = false;
    buildSeats();
    solveSize();
    busy = true;
    renderAll();
    showCoach(ctl.intro, step);
  }
  function endTutorial(toGame) {
    try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
    tut = null;
    els.skipTut.hidden = true;
    hideCoach();
    coachQueue = null;
    if (toGame) newGame(); else showCover();
  }

  /* ───── 开局 / 封面 ───── */
  function newGame() {
    closeDialog();
    token++;
    clearReactTimer();
    clearStage();
    hideCoach();
    tut = null;
    els.skipTut.hidden = true;
    const n = settings.players;
    const st = R.createGame(n, (Math.random() * 2 ** 31) | 0, settings.rules);
    game = { state: st, bots: drawBots(n), tiers: [null].concat(Array(n - 1).fill(settings.tier)), tutorial: false };
    els.cover.hidden = true;
    selected = []; mode = null;
    buildSeats();
    solveSize();
    busy = true;
    renderAll();
    schedule(400, step);
    if (window.ZhamaoAudio) window.ZhamaoAudio.music(true);
  }
  function resumeGame(d) {
    token++;
    game = { state: d.state, bots: d.bots, tiers: d.tiers, tutorial: false };
    // 反应窗里存的档：重新开窗
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    renderAll();
    schedule(300, step);
  }
  function refreshCover() {
    $('zmCoverSolo').textContent = settings.players + ' 人 · 机器猫' + AI.TIER_NAMES[settings.tier];
    const saved = loadSaved();
    els.cover.querySelector('[data-cover="resume"]').hidden = !saved;
  }
  function showCover() {
    token++;
    clearReactTimer();
    closeDialog();
    hideCoach();
    coachQueue = null;
    tut = null;
    els.skipTut.hidden = true;
    if (game && !game.tutorial) save();
    refreshCover();
    els.cover.hidden = false;
  }

  /* ───── 绑定 ───── */
  $('zmCoverArt').innerHTML = ART.hero();
  els.cover.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cover]');
    if (!b) return;
    const k = b.dataset.cover;
    if (k === 'solo') {
      let seen = false;
      try { seen = !!localStorage.getItem(TUT_KEY); } catch (_) { seen = true; }
      if (!seen && TUT) {
        openDialog('<h2>第一次玩？</h2><p>先花两分钟走一遍新手教程，跟着做就会了。</p><div class="zm-actions"><button type="button" class="zm-btn" data-skip>直接开始</button><button type="button" class="zm-btn zm-btn-primary" data-tut data-focus>看教程</button></div>', (d) => {
          d.querySelector('[data-tut]').addEventListener('click', () => startTutorial());
          d.querySelector('[data-skip]').addEventListener('click', () => { try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* */ } newGame(); });
        });
      } else newGame();
    } else if (k === 'resume') { const d = loadSaved(); if (d) resumeGame(d); else newGame(); }
    else if (k === 'tutorial') startTutorial();
    else if (k === 'settings') showSettings(true);
  });
  els.drawBtn.addEventListener('click', onDraw);
  els.playBtn.addEventListener('click', onPlay);
  els.nopeBtn.addEventListener('click', pressNope);
  els.cancelBtn.addEventListener('click', cancelTarget);
  els.skipTut.addEventListener('click', () => endTutorial(false));
  $('zmRulesBtn').addEventListener('click', showRules);
  $('zmMenuBtn').addEventListener('click', toggleMenu);
  $('zmSoundBtn').addEventListener('click', toggleSoundPanel);
  els.mask.addEventListener('click', (e) => { if (e.target === els.mask && els.dialog.querySelector('[data-ok]') && !els.dialog.querySelector('[data-range]')) { const cb = closeDialog(); if (cb) cb(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode === 'target') cancelTarget();
  });
  // 点空白处取消选牌 / 取消点人
  els.table.addEventListener('click', (e) => {
    if (e.target.closest('.zm-card, .zm-btn, .zm-seat, .zm-tool, .zm-coach')) return;
    if (mode === 'target') { cancelTarget(); return; }
    if (selected.length && mode !== 'give') { selected = []; renderHand(); renderBand(); }
  });
  window.addEventListener('resize', () => { if (game) solveSize(); });
  refreshSoundBtn();
  refreshCover();

  // 本机调试
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.__zmDebug = { get game() { return game; }, step, newGame, startTutorial, R, AI };
  }
  window.ZhamaoTable = { cardHtml, backHtml, rulesHtml };
})();
