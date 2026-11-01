/* 拱猪 · 单机牌桌（我 + 3 家 AI）。规则在 gongzhu-rules.js，AI 在 gongzhu-ai.js。
 * 座位：0 我（下方）→ 1 下家（右）→ 2 对家（上）→ 3 上家（左），出牌按逆时针。
 * 界面尽量不用文字提示：轮到谁看头像描边，能出哪张看手牌亮暗，吃了什么看吃牌区的真牌面。 */
(() => {
  'use strict';

  const R = window.GongzhuRules;
  const AI = window.GongzhuAI;
  const STORE_KEY = 'gz.match.v1';
  const SETTINGS_KEY = 'gz.settings.v1';
  const VERSION = '20261101b';   // 规则改过（红桃按牌面、首手 ♠2），旧存档作废

  const NAMES = ['我', '下家', '对家', '上家'];
  const AVATARS = ['我', '下', '对', '上'];
  const TIER_LABELS = { easy: '入门', normal: '普通', hard: '高手' };
  const TIER_ORDER = ['easy', 'normal', 'hard'];
  const TURN_SEC_OPTS = { 20: '20 秒', 0: '不限时' };
  const HURRY_MS = 5000;   // 最后 5 秒头像开始跳
  const SUIT_NAMES = ['黑桃', '红桃', '方块', '梅花'];

  // trickShow：一墩打满停多久；fly：分牌飞进吃牌区；fade：没分的牌就地淡出
  const PACE = { aiMin: 520, trickShow: 600, fly: 420, fade: 260, roundEnd: 700 };
  // 本机调试：?gzauto=1 让「我」也由 AI 代打并加速，用来一口气验到结算 / 一盘结束
  const AUTO = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('gzauto') === '1';
  if (AUTO) Object.assign(PACE, { aiMin: 30, trickShow: 120, fly: 200, fade: 120, roundEnd: 60 });

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('gzApp'), table: $('gzTable'), center: $('gzCenter'),
    hand: $('gzHand'), play: $('gzPlayBtn'),
    roundNo: $('gzRoundNo'),
    mask: $('gzDialogMask'), dialog: $('gzDialog'),
    seats: [0, 1, 2, 3].map((s) => $('gzSeat' + s)),
    slots: [0, 1, 2, 3].map((s) => document.querySelector('.gz-slot-' + s)),
  };

  /* ───── 存档 ───── */

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式等：不存也能玩 */ } }

  const settings = Object.assign({ tier: 'normal', turnSec: 20 }, readJSON(SETTINGS_KEY) || {});

  let match = null;     // { totals, roundNo, nextLeader, seed, round, last, over }
  let selected = -1;
  let busy = false;     // 动画 / AI 思考中，屏蔽我的操作
  let token = 0;        // 重开时作废旧的定时回调
  let autopilot = false;  // 托管：连续两次超时自动打开，点手牌 / 头像取消
  let timeouts = 0;       // 连续超时次数，我自己出一张就清零

  function newMatch() {
    match = { totals: [0, 0, 0, 0], roundNo: 0, nextLeader: -1, seed: (Math.random() * 2 ** 31) | 0, round: null, last: null, over: false };
  }
  function save() { writeJSON(STORE_KEY, { v: VERSION, match }); }

  /* ───── 卡面（四象限，参数逐字取自掼蛋 / 斗地主定稿） ───── */

  const SVG_SUITS = {
    1: { t: 'translate(500 500) scale(0.80349) translate(-715.0 -1473.5)', d: 'M714 2046 658 1955Q540 1762 352 1581Q241 1473 196.5 1387.0Q152 1301 152 1195Q152 1075 235.0 988.0Q318 901 432 901Q590 901 716 1141Q850 906 1009 906Q1125 906 1201.5 992.0Q1278 1078 1278 1210Q1278 1299 1241.5 1387.5Q1205 1476 1146 1528L1067 1599Q960 1696 857 1848L803 1928Q790 1947 714 2046Z' },
    2: { t: 'translate(500 500) scale(0.80349) translate(-616.0 -1475.5)', d: 'M1057 1475 617 2044 175 1479 616 907Z' },
  };
  const SUIT_CHARS = { 0: '♠', 3: '♣' };
  function suitSVG(suit) {
    if (SUIT_CHARS[suit]) return SUIT_CHARS[suit];
    const s = SVG_SUITS[suit];
    return '<svg class="suit-svg" viewBox="0 0 1000 1000" aria-hidden="true"><g transform="' + s.t + '"><path d="' + s.d + '"/></g></svg>';
  }
  const SUITP = {
    0: { tr: 0.335, bl: 0.34, big: 1.13, br: -0.08, bb: -0.045, op: 1, bigH: 1.13, brH: -0.125, bbH: -0.135, opH: 1, trY: 0.02, blY: -0.175 },
    1: { tr: 0.19, bl: 0.2, big: 0.6, br: 0.17, bb: 0.245, op: 1, bigH: 0.6, brH: 0.09, bbH: 0.2, opH: 1, trY: 0, blY: -0.2 },
    2: { tr: 0.22, bl: 0.22, big: 0.74, br: 0.115, bb: 0.19, op: 0.9, bigH: 0.68, brH: 0.075, bbH: 0.175, opH: 0.9, trY: 0, blY: -0.2 },
    3: { tr: 0.325, bl: 0.34, big: 1.04, br: -0.04, bb: -0.015, op: 0.9, bigH: 0.99, brH: -0.055, bbH: -0.065, opH: 1, trY: 0, blY: -0.17 },
  };
  const SUIT_TRY_ALL = 0.02, SUIT_BLY_ALL = -0.2;

  function cardName(c) { return SUIT_NAMES[R.suitOf(c)] + R.RANK_LABELS[R.rankOf(c)]; }

  function buildCard(c) {
    const suit = R.suitOf(c);
    const rank = R.RANK_LABELS[R.rankOf(c)];
    const el = document.createElement('span');
    el.className = 'gz-card ' + (suit === 1 || suit === 2 ? 'suit-red' : 'suit-black') + (rank === 'J' ? ' rank-j' : '');
    el.dataset.card = c;
    const p = SUITP[suit];
    const st = el.style;
    st.setProperty('--gz-tr', p.tr); st.setProperty('--gz-bl', p.bl);
    st.setProperty('--gz-big', p.big); st.setProperty('--gz-br', p.br); st.setProperty('--gz-bb', p.bb); st.setProperty('--gz-op', p.op);
    st.setProperty('--gz-bigH', p.bigH); st.setProperty('--gz-brH', p.brH); st.setProperty('--gz-bbH', p.bbH); st.setProperty('--gz-opH', p.opH);
    st.setProperty('--gz-try', SUIT_TRY_ALL + (p.trY || 0)); st.setProperty('--gz-bly', SUIT_BLY_ALL + (p.blY || 0));
    const sv = suitSVG(suit);
    el.innerHTML = '<span class="q q-tl">' + rank + '</span><span class="q q-tr">' + sv + '</span>' +
      '<span class="q q-bl">' + sv + '</span><span class="bigsuit">' + sv + '</span>';
    return el;
  }

  /* ───── 尺寸：只算 --u ───── */

  function solveSize() {
    const w = els.table.clientWidth - 20;
    const h = window.innerHeight;
    const portrait = h > window.innerWidth;
    // 竖屏手牌叠得紧一点，换更大的牌面
    const byW = w / (12 * (portrait ? 0.5 : 0.6) + 1 + 0.5);
    const byH = portrait ? h / 8.4 : h / 6.6;
    const u = Math.max(38, Math.min(78, byW, byH));
    els.app.style.setProperty('--u', u.toFixed(1) + 'px');
  }

  /* ───── 吃牌区：真牌面小牌，固定顺序 变压器 · 猪 · 羊 · 红桃扇，末尾是本局分 ─────
   * 顺序固定、不随吃进先后变：一眼能比较四家。变压器打头，像算式前面的系数「2 ×」；
   * 红桃扇放最后，张数再多也只往后长，前面几张的位置不动。
   * 红桃按点数叠成扇形，只露左上角；吃齐 13 张描金边（全红）。 */

  function renderCaps(box, cards, incoming) {
    box.innerHTML = '';
    if (!cards.length) return;
    const hidden = new Set(incoming || []);
    const sc = R.scoreCaptured(cards);
    const mini = (c) => {
      const el = buildCard(c);
      el.classList.add('gz-mini');
      if (hidden.has(c)) el.classList.add('incoming');
      return el;
    };
    const row = document.createElement('div');
    row.className = 'gz-caps-row' + (sc.grandSlam ? ' is-slam' : '');
    if (sc.doubler) {
      const d = mini(R.DOUBLER);
      d.classList.add('is-doubler');
      row.appendChild(d);
    }
    if (sc.pig) row.appendChild(mini(R.PIG));
    if (sc.sheep) row.appendChild(mini(R.SHEEP));
    if (sc.hearts) {
      const fan = document.createElement('span');
      fan.className = 'gz-fan' + (sc.allHearts ? ' is-all' : '');
      cards.filter(R.isHeart).sort((a, b) => a - b).forEach((c) => fan.appendChild(mini(c)));
      row.appendChild(fan);
    }
    const score = document.createElement('span');
    score.className = 'gz-cap-score gz-num ' + (sc.total < 0 ? 'neg' : sc.total > 0 ? 'pos' : '');
    score.textContent = signed(sc.total);
    if (hidden.size) score.classList.add('incoming');
    row.appendChild(score);
    box.appendChild(row);
  }

  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }

  /* ───── 座位：结构只建一次，之后只更新内容（飞牌动画要拿稳定的落点） ───── */

  // 头像外圈的倒计时环：轮到谁谁亮，环随时间收走
  const CLOCK_SVG = '<svg class="gz-clock" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" pathLength="100"/></svg>';

  function buildSeats() {
    els.seats.forEach((el, s) => {
      el.innerHTML =
        '<div class="gz-who"><span class="gz-avatar">' + AVATARS[s] + CLOCK_SVG + '</span>' +
        '<span class="gz-name-line"><span class="gz-name">' + NAMES[s] + '</span><span class="gz-total gz-num"></span></span></div>' +
        (s === 0 ? '' : '<span class="gz-backs" aria-hidden="true"></span>') +
        '<div class="gz-caps"></div>';
      el.setAttribute('aria-label', NAMES[s]);
    });
  }

  function renderSeat(s, incoming) {
    const r = match.round;
    const el = els.seats[s];
    const tot = el.querySelector('.gz-total');
    tot.textContent = signed(match.totals[s]);
    tot.className = 'gz-total gz-num' + (match.totals[s] < 0 ? ' neg' : '');
    const backs = el.querySelector('.gz-backs');
    if (backs) {
      const left = r ? r.hands[s].length : 0;
      if (backs.childElementCount !== left) backs.innerHTML = '<span class="gz-back"></span>'.repeat(left);
    }
    renderCaps(el.querySelector('.gz-caps'), r ? r.captured[s] : [], incoming);
    el.classList.toggle('is-turn', !!r && !R.isRoundOver(r) && r.turn === s);
  }

  function renderSeats() {
    for (let s = 0; s < 4; s++) renderSeat(s);
    els.roundNo.textContent = '第 ' + match.roundNo + ' 局';
  }

  /* plays 缺省为当前墩；一墩刚打完时 r.trick 已清空，传入完成的那一墩继续展示 */
  function renderTrick(plays, enteringSeat) {
    const r = match.round;
    els.slots.forEach((slot) => { slot.innerHTML = ''; });
    plays = plays || (r ? r.trick : []);
    if (!plays.length) return;
    const lead = R.suitOf(plays[0].card);
    let top = plays[0];
    for (const p of plays) if (R.suitOf(p.card) === lead && R.rankOf(p.card) > R.rankOf(top.card)) top = p;
    plays.forEach((p) => {
      const card = buildCard(p.card);
      if (p === top && plays.length > 1) card.classList.add('is-top');
      if (p.seat === enteringSeat) card.classList.add('in');
      els.slots[p.seat].appendChild(card);
    });
  }

  function renderHand() {
    const r = match.round;
    els.hand.innerHTML = '';
    if (!r) { els.play.disabled = true; return; }
    const hand = r.hands[0].slice();
    R.sortHand(hand);
    const myTurn = !R.isRoundOver(r) && r.turn === 0 && !busy;
    const legal = myTurn ? R.legalFor(r, 0) : hand;
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 56;
    const W = els.hand.clientWidth;
    const n = hand.length;
    let gaps = 0;
    for (let i = 1; i < n; i++) if (R.suitOf(hand[i]) !== R.suitOf(hand[i - 1])) gaps++;
    const gapW = u * 0.22;
    const step = n > 1 ? Math.min(u * 0.62, (W - u - gaps * gapW) / (n - 1)) : 0;
    const total = u + step * (n - 1) + gaps * gapW;
    let x = Math.max(0, (W - total) / 2);
    els.hand.classList.toggle('my-turn', myTurn);
    // 只剩一张能出（比如开局的 ♠2）就直接替我选好
    if (myTurn && legal.length === 1 && selected < 0) selected = legal[0];
    hand.forEach((c, i) => {
      if (i > 0 && R.suitOf(c) !== R.suitOf(hand[i - 1])) x += gapW;
      const el = buildCard(c);
      el.style.left = x.toFixed(1) + 'px';
      el.style.zIndex = String(i + 1);
      el.setAttribute('role', 'option');
      el.setAttribute('aria-label', cardName(c));
      if (myTurn && !legal.includes(c)) { el.classList.add('is-illegal'); el.setAttribute('aria-disabled', 'true'); }
      if (c === selected) { el.classList.add('selected'); el.setAttribute('aria-selected', 'true'); }
      el.addEventListener('click', () => onCardTap(c, el));
      els.hand.appendChild(el);
      x += step;
    });
    els.play.disabled = !(myTurn && selected >= 0 && legal.includes(selected));
  }

  function renderAll() { renderSeats(); renderTrick(); renderHand(); }

  /* ───── 流程 ───── */

  function startRound() {
    match.roundNo++;
    const rng = R.makeRng((match.seed + match.roundNo * 7919) >>> 0);
    const hands = R.deal(rng);
    const first = match.nextLeader < 0;
    const leader = first ? R.firstLeader(hands) : match.nextLeader;
    match.round = R.createRound(hands, leader, first ? R.SPADE_TWO : -1);
    selected = -1;
    save();
    renderAll();
    schedule(step, 450);
  }

  function schedule(fn, ms) {
    const my = token;
    setTimeout(() => { if (my === token) fn(); }, ms);
  }

  function step() {
    const r = match.round;
    if (!r) return;
    if (R.isRoundOver(r)) { schedule(finishRound, PACE.roundEnd); return; }
    renderSeats();
    if (r.turn === 0 && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyTimeout); return; }
    busy = true;
    renderHand();
    const started = performance.now();
    const seat = r.turn;
    if (seat !== 0) startClock(seat, null);
    chooseAi(r, seat, seat === 0 ? takeoverTier(botTiers()) : seatTier(seat)).then((card) => {
      const wait = Math.max(0, PACE.aiMin - (performance.now() - started));
      schedule(() => commit(seat, card), wait);
    });
  }

  function commit(seat, card) {
    const r = match.round;
    stopClock();
    const done = R.playCard(r, seat, card);
    if (seat === 0) selected = -1;
    busy = !!done || r.turn !== 0;
    renderTrick(done ? done.plays : null, seat);
    renderSeat(seat);
    renderHand();
    if (!done) { save(); schedule(step, 60); return; }
    // 一墩完成：停一下让人看清，分牌飞进赢家的吃牌区，没分的牌就地淡出
    for (let s = 0; s < 4; s++) els.seats[s].classList.remove('is-turn');
    schedule(() => {
      const ms = flyTrick(done.plays, done.winner);
      schedule(() => { save(); step(); }, ms + 40);
    }, PACE.trickShow);
  }

  /* 吃进来的牌只有分牌会留在吃牌区，所以只有它们飞过去：缩成小牌落到自己的位置。
   * 没分的牌不往谁身上收（收过去什么也没留下反而怪），就在桌上淡出。
   * 赢家头像同时亮起（他领下一墩），谁吃的这一墩一眼可见。返回动画时长。 */
  function flyTrick(plays, winner) {
    const seatEl = els.seats[winner];
    const caps = seatEl.querySelector('.gz-caps');
    const fresh = plays.map((p) => p.card).filter(R.isScoring);
    renderSeat(winner, fresh);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flyers = [];
    plays.forEach((p) => {
      const slot = els.slots[p.seat];
      if (!slot.querySelector('.gz-card')) return;
      const a = slot.getBoundingClientRect();
      const rot = getComputedStyle(slot).getPropertyValue('--rot').trim() || '0deg';
      const scoring = R.isScoring(p.card);
      const fl = buildCard(p.card);
      fl.classList.add('gz-flyer');
      fl.style.cssText += ';left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;--q:' + a.width + 'px';
      fl.style.transform = 'rotate(' + rot + ')';
      fl.style.transitionDuration = (reduce ? 1 : scoring ? PACE.fly : PACE.fade) + 'ms';
      els.app.appendChild(fl);
      flyers.push({ fl, a, rot, target: scoring ? caps.querySelector('[data-card="' + p.card + '"]') : null });
    });
    els.slots.forEach((slot) => { slot.innerHTML = ''; });
    void els.app.offsetWidth;  // 强制回流：起点样式落定后再设终点，过渡才会跑（不靠 rAF，后台页也稳）
    for (const { fl, a, rot, target } of flyers) {
      if (target) {
        const b = target.getBoundingClientRect();
        fl.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(' + (b.width / a.width) + ',' + (b.height / a.height) + ')';
      } else {
        fl.style.transform = 'rotate(' + rot + ') scale(0.86)';
        fl.style.opacity = '0';
      }
    }
    const ms = reduce ? 20 : fresh.length ? PACE.fly : PACE.fade;
    setTimeout(() => {
      flyers.forEach(({ fl }) => fl.remove());
      caps.querySelectorAll('.incoming').forEach((el) => { el.classList.remove('incoming'); el.classList.add('landed'); });
    }, ms);
    return ms;
  }

  /* ───── 出牌倒计时与托管 ─────
   * 轮到谁，谁的头像外圈亮起一道红环并随时间收走；最后 5 秒头像轻跳。
   * 我超时：由场上最强的那档机器人替我出这一张；连续两次超时转成托管，点手牌或头像收回。
   * 弹窗开着时计时暂停。 */

  const clock = { seat: -1, left: 0, at: 0, onTimeout: null, paused: false, t1: 0, t2: 0 };

  function startClock(seat, onTimeout) {
    stopClock();
    const total = (settings.turnSec | 0) * 1000;
    if (!total) return;
    Object.assign(clock, { seat, left: total, onTimeout, paused: false });
    const el = els.seats[seat];
    el.style.setProperty('--turn-ms', total + 'ms');
    el.classList.remove('is-timed', 'is-hurry', 'is-paused');
    void el.offsetWidth;   // 同一座位连着两回合也要从满环重新开始
    el.classList.add('is-timed');
    if (!els.mask.hidden) pauseClock();
    else runClock();
  }
  function runClock() {
    const my = token, seat = clock.seat;
    clock.at = performance.now();
    clock.t1 = setTimeout(() => { if (my === token) els.seats[seat].classList.add('is-hurry'); }, Math.max(0, clock.left - HURRY_MS));
    if (clock.onTimeout) clock.t2 = setTimeout(() => { if (my !== token) return; const f = clock.onTimeout; stopClock(); f(); }, clock.left);
  }
  function pauseClock() {
    if (clock.seat < 0 || clock.paused) return;
    clearTimeout(clock.t1); clearTimeout(clock.t2);
    if (clock.at) clock.left = Math.max(0, clock.left - (performance.now() - clock.at));
    clock.at = 0;
    clock.paused = true;
    els.seats[clock.seat].classList.add('is-paused');
  }
  function resumeClock() {
    if (clock.seat < 0 || !clock.paused) return;
    clock.paused = false;
    els.seats[clock.seat].classList.remove('is-paused');
    runClock();
  }
  function stopClock() {
    clearTimeout(clock.t1); clearTimeout(clock.t2);
    if (clock.seat >= 0) els.seats[clock.seat].classList.remove('is-timed', 'is-hurry', 'is-paused');
    Object.assign(clock, { seat: -1, onTimeout: null, paused: false, at: 0 });
  }

  // 单机三家机器人同一档；联机时真人座位返回 null
  function seatTier(seat) { return seat === 0 ? null : settings.tier; }
  function botTiers() { return [1, 2, 3].map(seatTier).filter(Boolean); }
  // 替人出牌的机器人：取场上机器人里最强的一档；场上没有机器人就按「普通」
  function takeoverTier(tiers) {
    let best = -1;
    for (const t of tiers) best = Math.max(best, TIER_ORDER.indexOf(t));
    return best < 0 ? 'normal' : TIER_ORDER[best];
  }

  function onMyTimeout() {
    const r = match.round;
    if (!r || R.isRoundOver(r) || r.turn !== 0 || busy) return;
    timeouts++;
    if (timeouts >= 2) setAutopilot(true);
    busy = true;
    selected = -1;
    renderHand();
    chooseAi(r, 0, takeoverTier(botTiers())).then((card) => schedule(() => commit(0, card), 0));
  }

  function setAutopilot(on) {
    if (autopilot === on) return;
    autopilot = on;
    if (!on) timeouts = 0;
    els.seats[0].classList.toggle('is-auto', on);
    els.seats[0].setAttribute('aria-label', NAMES[0] + (on ? '（托管中，点手牌收回）' : ''));
    const r = match && match.round;
    // 收回托管时正轮到我、机器人还没动手：直接把这一手交还给我
    if (!on && r && !R.isRoundOver(r) && r.turn === 0 && !busy) { stopClock(); step(); }
  }

  function onCardTap(c, el) {
    if (autopilot) { setAutopilot(false); return; }
    const r = match.round;
    if (busy || !r || R.isRoundOver(r) || r.turn !== 0) return;
    if (!R.legalFor(r, 0).includes(c)) {
      // 不能出：抖一下，亮着的那些就是能出的
      el.classList.remove('nope');
      void el.offsetWidth;
      el.classList.add('nope');
      return;
    }
    if (selected === c) { playSelected(); return; }
    selected = c;
    renderHand();
  }

  function playSelected() {
    const r = match.round;
    if (busy || !r || r.turn !== 0 || selected < 0) return;
    if (!R.legalFor(r, 0).includes(selected)) return;
    busy = true;
    timeouts = 0;
    commit(0, selected);
  }

  function finishRound() {
    const r = match.round;
    const scores = R.roundScores(r);
    for (let s = 0; s < 4; s++) match.totals[s] += scores[s];
    match.nextLeader = r.pigTaker;
    match.last = { roundNo: match.roundNo, captured: r.captured.map((c) => c.slice()), scores };
    match.round = null;
    match.over = R.isMatchOver(match.totals);
    save();
    renderAll();
    showSettlement();
  }

  /* ───── AI 调度：优先后台线程，失败就在主线程算 ───── */

  let worker = null, workerOk = true, reqId = 0;
  const pending = new Map();
  function getWorker() {
    if (!workerOk || typeof Worker === 'undefined') return null;
    if (worker) return worker;
    try {
      worker = new Worker('/assets/js/games/gongzhu-ai-worker.js?v=' + (window.GZ_BUILD || VERSION));
      worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data.card); } };
      worker.onerror = () => { workerOk = false; worker = null; for (const [, p] of pending) p(-1); pending.clear(); };
    } catch (_) { workerOk = false; worker = null; }
    return worker;
  }
  function chooseLocal(r, seat, tier) {
    return AI.policyForTier(tier)(r, seat, R.makeRng((Math.random() * 2 ** 31) | 0));
  }
  function chooseAi(r, seat, tier) {
    const w = getWorker();
    if (!w) return Promise.resolve(chooseLocal(r, seat, tier));
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, (card) => resolve(card >= 0 && R.legalFor(r, seat).includes(card) ? card : chooseLocal(r, seat, tier)));
      w.postMessage({ id, round: r, seat, tier, seed: (Math.random() * 2 ** 31) | 0 });
    });
  }

  /* ───── 弹窗 ───── */

  function openDialog(html, onMount) {
    els.dialog.innerHTML = html;
    els.mask.hidden = false;
    pauseClock();
    if (onMount) onMount(els.dialog);
    const first = els.dialog.querySelector('[data-autofocus]') || els.dialog.querySelector('button');
    if (first) first.focus();
  }
  function closeDialog() { els.mask.hidden = true; els.dialog.innerHTML = ''; resumeClock(); }

  /* 结算：每家一行 = 名字 · 吃牌（同一套小牌陈列） · 本局 · 累计；不写算式文字 */
  function showSettlement() {
    const last = match.last;
    const loser = match.over ? R.matchLoser(match.totals) : -1;
    const cls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
    const rows = [0, 1, 2, 3].map((s) =>
      '<div class="gz-res-row' + (s === 0 ? ' me' : '') + (s === loser ? ' loser' : '') + '" data-seat="' + s + '">' +
      '<span class="gz-res-name">' + NAMES[s] + (s === loser ? '<span class="gz-pig-badge">猪</span>' : '') + '</span>' +
      '<span class="gz-res-caps gz-caps"></span>' +
      '<span class="gz-res-n gz-num ' + cls(last.scores[s]) + '">' + signed(last.scores[s]) + '</span>' +
      '<span class="gz-res-n gz-res-tot gz-num ' + cls(match.totals[s]) + '">' + signed(match.totals[s]) + '</span></div>').join('');
    const title = match.over ? (loser === 0 ? '你当了猪' : NAMES[loser] + '当了猪') : '第 ' + last.roundNo + ' 局';
    openDialog(
      '<h2>' + title + '</h2>' +
      '<div class="gz-res"><div class="gz-res-row gz-res-head"><span></span><span></span><span class="gz-res-n">本局</span><span class="gz-res-n">累计</span></div>' + rows + '</div>' +
      '<div class="gz-actions">' +
      (match.over ? '<button type="button" class="gz-btn gz-btn-primary" data-act="again" data-autofocus>再来一盘</button>'
        : '<button type="button" class="gz-btn gz-btn-primary" data-act="next" data-autofocus>下一局</button>') +
      '</div>',
      (d) => {
        d.querySelectorAll('.gz-res-row[data-seat]').forEach((row) => {
          const box = row.querySelector('.gz-res-caps');
          renderCaps(box, last.captured[+row.dataset.seat]);
          const sc = box.querySelector('.gz-cap-score');
          if (sc) sc.remove();
        });
        d.querySelector('[data-act]').addEventListener('click', (e) => {
          closeDialog();
          if (e.currentTarget.dataset.act === 'again') { token++; setAutopilot(false); newMatch(); }
          startRound();
        });
      }
    );
  }

  function showTotals() {
    if (match.last && !match.round) { showSettlement(); return; }
    const rows = [0, 1, 2, 3].map((s) => '<tr class="' + (s === 0 ? 'me' : '') + '"><td>' + NAMES[s] + '</td><td class="n ' +
      (match.totals[s] < 0 ? 'neg' : match.totals[s] > 0 ? 'pos' : '') + '">' + signed(match.totals[s]) + '</td></tr>').join('');
    openDialog('<h2>累计</h2>' +
      '<table class="gz-score-table"><tbody>' + rows + '</tbody></table>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close data-autofocus>好</button></div>',
      (d) => d.querySelector('[data-close]').addEventListener('click', closeDialog));
  }

  function showRules() {
    openDialog(
      '<h2>拱猪规则</h2><dl class="gz-rules">' +
      '<dt>出牌</dt><dd>四人各 13 张。第一局有 ♠2 的人先出，第一张必须打 ♠2；之后由上局吃到猪的人先出。有领出的花色就必须跟，没有可以垫任意一张。领出花色里最大的牌吃下这一墩，下一墩由他先出。</dd>' +
      '<dt>分牌</dt><dd>猪 ♠Q −100；羊 ♦J +100。红桃按牌面扣分：2 到 10 扣对应点数，J −11、Q −12、K −13，A 只扣 1 分。</dd>' +
      '<dt>变压器 ♣10</dt><dd>吃到它，你这一局的分数（不论正负）翻倍；只吃到它一张、别的分牌都没吃到，算 +50。</dd>' +
      '<dt>全红</dt><dd>一个人吃齐 13 张红桃，红桃改记 +200。再吃齐猪、羊、变压器就是大满贯，猪也变正，共 +800。</dd>' +
      '<dt>一盘</dt><dd>有人累计到 −1000 分，这一盘结束，他就是猪。</dd>' +
      '</dl><div class="gz-actions"><button type="button" class="gz-btn" data-close data-autofocus>知道了</button></div>',
      (d) => d.querySelector('[data-close]').addEventListener('click', closeDialog));
  }

  function showSettings() {
    const seg = Object.keys(TIER_LABELS).map((k) => '<button type="button" data-tier="' + k + '" aria-pressed="' + (settings.tier === k) + '">' + TIER_LABELS[k] + '</button>').join('');
    const secs = [20, 0].map((k) => '<button type="button" data-sec="' + k + '" aria-pressed="' + ((settings.turnSec | 0) === k) + '">' + TURN_SEC_OPTS[k] + '</button>').join('');
    openDialog(
      '<h2>设置</h2><div class="gz-field-label">AI 水平</div><div class="gz-seg" role="group">' + seg + '</div>' +
      '<div class="gz-field-label">出牌限时</div><div class="gz-seg" role="group">' + secs + '</div>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="restart">重开一盘</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => {
          settings.tier = b.dataset.tier;
          writeJSON(SETTINGS_KEY, settings);
          d.querySelectorAll('[data-tier]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        d.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => {
          settings.turnSec = +b.dataset.sec;
          writeJSON(SETTINGS_KEY, settings);
          d.querySelectorAll('[data-sec]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          // 改了限时：当前这一手按新设置重新计
          if (clock.seat >= 0) { const seat = clock.seat, f = clock.onTimeout; startClock(seat, f); }
        }));
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="restart"]').addEventListener('click', () => {
          if (!confirm('放弃这一盘，从 0 分重新开始？')) return;
          stopClock(); closeDialog(); token++; busy = false; setAutopilot(false); newMatch(); startRound();
        });
      });
  }

  /* ───── 启动 ───── */

  els.play.addEventListener('click', playSelected);
  $('gzRulesBtn').addEventListener('click', showRules);
  $('gzSettingsBtn').addEventListener('click', showSettings);
  $('gzRoundInfo').addEventListener('click', showTotals);
  els.seats[0].addEventListener('click', (e) => { if (autopilot && e.target.closest('.gz-avatar')) setAutopilot(false); });
  // 点遮罩关闭普通弹窗；结算弹窗必须点按钮继续
  els.mask.addEventListener('click', (e) => { if (e.target === els.mask && match.round) closeDialog(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.mask.hidden && match.round) closeDialog();
    if (e.key === 'Enter' && els.mask.hidden) playSelected();
  });
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => { solveSize(); renderHand(); });
  });

  buildSeats();
  solveSize();
  const saved = readJSON(STORE_KEY);
  if (saved && saved.v === VERSION && saved.match && !saved.match.over) {
    match = saved.match;
    renderAll();
    if (match.round) step();
    else if (match.last) showSettlement();
    else startRound();
  } else {
    newMatch();
    startRound();
  }
})();
