/* 拱猪 · 单机牌桌（我 + 3 家 AI）。规则在 gongzhu-rules.js，AI 在 gongzhu-ai.js。
 * 座位：0 我（下方）→ 1 下家（右）→ 2 对家（上）→ 3 上家（左），出牌按逆时针。
 * 界面尽量不用文字提示：轮到谁看头像描边，能出哪张看手牌亮暗，吃了什么看吃牌区的真牌面。 */
(() => {
  'use strict';

  const R = window.GongzhuRules;
  const AI = window.GongzhuAI;
  const T = window.GongzhuTutorial;
  const TUT_KEY = 'gz.tut.v1';
  const STORE_KEY = 'gz.match.v1';
  const SETTINGS_KEY = 'gz.settings.v1';
  const VERSION = '20261101d';   // 加了规则开关和亮牌，局面结构变了，旧存档作废

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
  // 教程放慢：机器人出牌、收墩都留足时间看清
  const TUT_PACE = { aiMin: 950, trickShow: 1100, fly: 520, fade: 320, roundEnd: 500 };
  const pace = () => (match && match.tutorial ? TUT_PACE : PACE);

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('gzApp'), table: $('gzTable'), center: $('gzCenter'),
    hand: $('gzHand'), play: $('gzPlayBtn'),
    roundNo: $('gzRoundNo'),
    mask: $('gzDialogMask'), dialog: $('gzDialog'),
    coach: $('gzCoach'),
    seats: [0, 1, 2, 3].map((s) => $('gzSeat' + s)),
    slots: [0, 1, 2, 3].map((s) => document.querySelector('.gz-slot-' + s)),
  };

  /* ───── 存档 ───── */

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式等：不存也能玩 */ } }

  const settings = Object.assign({ tier: 'normal', turnSec: 20 }, readJSON(SETTINGS_KEY) || {});
  settings.rules = R.normalizeRules(settings.rules);

  let match = null;     // { rules, totals, roundNo, pigTaker, seed, round, exposing, last, over }
  let selected = -1;
  let exposePick = [];  // 亮牌环节里我点选要亮的牌
  let busy = false;     // 动画 / AI 思考中，屏蔽我的操作
  let token = 0;        // 重开时作废旧的定时回调
  let autopilot = false;  // 托管：连续两次超时自动打开，点手牌 / 头像取消
  let timeouts = 0;       // 连续超时次数，我自己出一张就清零

  function newMatch() {
    // 规则在开盘时定下，中途改设置从下一盘起生效
    match = { rules: R.normalizeRules(settings.rules), totals: [0, 0, 0, 0], roundNo: 0, pigTaker: -1, seed: (Math.random() * 2 ** 31) | 0, round: null, exposing: [], last: null, over: false };
  }
  function save() { if (!match.tutorial) writeJSON(STORE_KEY, { v: VERSION, match }); }

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

  /* 亮出的牌：右上角盖一枚朱红小印 */
  function isExposedCard(c) { const r = match && match.round; return !!r && R.exposedOwner(r, c) >= 0; }

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

  function renderCaps(box, cards, incoming, ctx) {
    box.innerHTML = '';
    if (!cards.length) return;
    const hidden = new Set(incoming || []);
    const r = match.round;
    ctx = ctx || (r ? R.scoreCtx(r) : { rules: match.rules, exposed: [] });
    const sc = R.scoreCaptured(cards, ctx);
    const mini = (c) => {
      const el = buildCard(c);
      el.classList.add('gz-mini');
      if (ctx.exposed.includes(c)) el.classList.add('is-exposed');
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
        (s === 0 ? '' : '<div class="gz-hold"><span class="gz-backs" aria-hidden="true"></span><span class="gz-shown"></span></div>') +
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
    // 别家亮出、还在手里的牌：牌背旁边摊开给大家看
    const shown = el.querySelector('.gz-shown');
    if (shown) {
      const want = r ? r.exposed.filter(([c, o]) => o === s && r.hands[s].includes(c)).map(([c]) => c) : [];
      const have = [...shown.children].map((x) => +x.dataset.card);
      if (want.join() !== have.join()) {
        shown.innerHTML = '';
        for (const c of want) {
          const m = buildCard(c);
          m.classList.add('gz-mini', 'is-exposed');
          if (!have.includes(c)) m.classList.add('landed');
          shown.appendChild(m);
        }
      }
    }
    renderCaps(el.querySelector('.gz-caps'), r ? r.captured[s] : [], incoming);
    el.classList.toggle('is-turn', turnSeat() === s);
  }

  /* 现在轮到谁：亮牌环节是正在决定亮不亮的人，打牌时是该出牌的人 */
  function turnSeat() {
    const r = match.round;
    if (!r || R.isRoundOver(r)) return -1;
    return match.exposing.length ? match.exposing[0] : r.turn;
  }
  function exposingMe() { return match.round && match.exposing.length && match.exposing[0] === 0; }

  function renderSeats() {
    for (let s = 0; s < 4; s++) renderSeat(s);
    els.roundNo.textContent = match.tutorial ? '新手教程' : '第 ' + match.roundNo + (match.rules.end === 'rounds10' ? ' / 10' : '') + ' 局';
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
    const exposing = exposingMe() && !busy;
    const myTurn = !exposing && !match.exposing.length && !R.isRoundOver(r) && r.turn === 0 && !busy;
    // 亮牌环节：能亮的那几张亮着，点一下盖印 / 再点取消
    const legal = exposing ? R.EXPOSABLE.filter((c) => hand.includes(c)) : myTurn ? R.legalFor(r, 0) : hand;
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 56;
    const W = els.hand.clientWidth;
    const n = hand.length;
    let gaps = 0;
    for (let i = 1; i < n; i++) if (R.suitOf(hand[i]) !== R.suitOf(hand[i - 1])) gaps++;
    const gapW = u * 0.22;
    const step = n > 1 ? Math.min(u * 0.62, (W - u - gaps * gapW) / (n - 1)) : 0;
    const total = u + step * (n - 1) + gaps * gapW;
    let x = Math.max(0, (W - total) / 2);
    els.hand.classList.toggle('my-turn', myTurn || exposing);
    // 只剩一张能出（比如开局的 ♠2）就直接替我选好
    if (myTurn && legal.length === 1 && selected < 0) selected = legal[0];
    hand.forEach((c, i) => {
      if (i > 0 && R.suitOf(c) !== R.suitOf(hand[i - 1])) x += gapW;
      const el = buildCard(c);
      el.style.left = x.toFixed(1) + 'px';
      el.style.zIndex = String(i + 1);
      el.setAttribute('role', 'option');
      el.setAttribute('aria-label', cardName(c));
      if ((myTurn || exposing) && !legal.includes(c)) { el.classList.add('is-illegal'); el.setAttribute('aria-disabled', 'true'); }
      if (isExposedCard(c) || (exposing && exposePick.includes(c))) el.classList.add('is-exposed');
      if (exposing ? exposePick.includes(c) : c === selected) { el.classList.add('selected'); el.setAttribute('aria-selected', 'true'); }
      el.addEventListener('click', () => onCardTap(c, el));
      els.hand.appendChild(el);
      x += step;
    });
    if (exposing) { els.play.disabled = false; els.play.textContent = exposePick.length ? '亮牌' : '不亮'; return; }
    els.play.textContent = '出牌';
    els.play.disabled = !(myTurn && selected >= 0 && legal.includes(selected));
  }

  function renderAll() { renderSeats(); renderTrick(); renderHand(); }

  /* ───── 流程 ───── */

  function startRound() {
    match.roundNo++;
    const rng = R.makeRng((match.seed + match.roundNo * 7919) >>> 0);
    const hands = R.deal(rng);
    const st = R.roundStart(match.rules, hands, match.roundNo === 1, match.pigTaker);
    match.round = R.createRound(hands, st.leader, st.mustLead, match.rules);
    // 亮牌：从先出的人起依次决定；手里没有可亮牌的人直接跳过
    match.exposing = match.rules.expose
      ? [0, 1, 2, 3].map((d) => (st.leader + d) % 4).filter((s) => R.EXPOSABLE.some((c) => hands[s].includes(c)))
      : [];
    selected = -1;
    exposePick = [];
    save();
    renderAll();
    schedule(step, 450);
  }

  function schedule(fn, ms) {
    const my = token;
    setTimeout(() => { if (my === token) fn(); }, ms);
  }
  // AI 结果是异步回来的：发请求时就记下 token，回来时已经重开 / 进了教程就丢掉
  function guard(fn) {
    const my = token;
    return (x) => { if (my === token) fn(x); };
  }

  function step() {
    const r = match.round;
    if (!r) return;
    if (R.isRoundOver(r)) { schedule(finishRound, pace().roundEnd); return; }
    if (match.tutorial) { tutStep(); return; }
    if (match.exposing.length) { exposeStep(); return; }
    renderSeats();
    if (r.turn === 0 && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyTimeout); return; }
    busy = true;
    renderHand();
    const started = performance.now();
    const seat = r.turn;
    if (seat !== 0) startClock(seat, null);
    chooseAi(r, seat, seat === 0 ? takeoverTier(botTiers()) : seatTier(seat)).then(guard((card) => {
      const wait = Math.max(0, pace().aiMin - (performance.now() - started));
      schedule(() => commit(seat, card), wait);
    }));
  }

  /* ───── 亮牌环节 ───── */

  function exposeStep() {
    const r = match.round;
    const seat = match.exposing[0];
    renderSeats();
    if (seat === 0 && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyExposeTimeout); return; }
    busy = true;
    renderHand();
    const started = performance.now();
    if (seat !== 0) startClock(seat, null);
    chooseExpose(r, seat, seat === 0 ? takeoverTier(botTiers()) : seatTier(seat)).then(guard((cards) => {
      const wait = Math.max(0, pace().aiMin - (performance.now() - started));
      schedule(() => applyExpose(seat, cards), wait);
    }));
  }

  function applyExpose(seat, cards) {
    const r = match.round;
    stopClock();
    for (const c of cards) R.expose(r, seat, c);
    match.exposing.shift();
    exposePick = [];
    busy = true;
    renderSeat(seat);
    renderHand();
    save();
    schedule(step, cards.length ? 520 : 120);
  }

  function onMyExposeTimeout() {
    if (!exposingMe() || busy) return;
    timeouts++;
    if (timeouts >= 2) setAutopilot(true);
    busy = true;
    exposePick = [];
    renderHand();
    chooseExpose(match.round, 0, takeoverTier(botTiers())).then(guard((cards) => schedule(() => applyExpose(0, cards), 0)));
  }

  function commit(seat, card) {
    const r = match.round;
    stopClock();
    const done = R.playCard(r, seat, card);
    if (seat === 0) selected = -1;
    if (seat === 0 && match.tutorial) hideCoach();
    busy = true;   // 下一手由 step() 接手，轮到我时它再放开；早放开会让我抢在 step 前出牌、排出两次 step
    renderTrick(done ? done.plays : null, seat);
    renderSeat(seat);
    renderHand();
    if (!done) { save(); schedule(step, 60); return; }
    // 一墩完成：停一下让人看清，分牌飞进赢家的吃牌区，没分的牌就地淡出
    for (let s = 0; s < 4; s++) els.seats[s].classList.remove('is-turn');
    schedule(() => {
      const ms = flyTrick(done.plays, done.winner);
      schedule(() => {
        save();
        if (match.tutorial) coachSay(tut.coach.afterTrick(done, r), step);
        else step();
      }, ms + 40);
    }, pace().trickShow);
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
      fl.style.transitionDuration = (reduce ? 1 : scoring ? pace().fly : pace().fade) + 'ms';
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
    const ms = reduce ? 20 : fresh.length ? pace().fly : pace().fade;
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
    if (match.tutorial) return;   // 教程不计时
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
    if (!r || turnSeat() !== 0 || busy) return;
    timeouts++;
    if (timeouts >= 2) setAutopilot(true);
    busy = true;
    selected = -1;
    renderHand();
    chooseAi(r, 0, takeoverTier(botTiers())).then(guard((card) => schedule(() => commit(0, card), 0)));
  }

  function setAutopilot(on) {
    if (autopilot === on) return;
    autopilot = on;
    if (!on) timeouts = 0;
    els.seats[0].classList.toggle('is-auto', on);
    els.seats[0].setAttribute('aria-label', NAMES[0] + (on ? '（托管中，点手牌收回）' : ''));
    const r = match && match.round;
    // 收回托管时正轮到我、机器人还没动手：直接把这一手交还给我
    if (!on && r && turnSeat() === 0 && !busy) { stopClock(); step(); }
  }

  function onCardTap(c, el) {
    if (autopilot) { setAutopilot(false); return; }
    if (exposingMe()) {
      if (busy) return;
      if (!R.EXPOSABLE.includes(c)) { shake(el); return; }
      exposePick = exposePick.includes(c) ? exposePick.filter((x) => x !== c) : exposePick.concat([c]);
      renderHand();
      return;
    }
    const r = match.round;
    if (busy || !r || R.isRoundOver(r) || r.turn !== 0) return;
    if (!R.legalFor(r, 0).includes(c)) { shake(el); return; }
    if (selected === c) { playSelected(); return; }
    selected = c;
    renderHand();
  }

  // 不能出：抖一下，亮着的那些就是能出的
  function shake(el) {
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
    if (match.tutorial && !els.coach.hidden) {   // 教程里点错：提示框也跟着闪一下，再看一遍
      els.coach.classList.remove('pulse');
      void els.coach.offsetWidth;
      els.coach.classList.add('pulse');
    }
  }

  function playSelected() {
    if (exposingMe()) {
      if (busy) return;
      busy = true;
      timeouts = 0;
      applyExpose(0, exposePick.slice());
      return;
    }
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
    match.pigTaker = r.pigTaker;
    match.last = { roundNo: match.roundNo, captured: r.captured.map((c) => c.slice()), scores, ctx: R.scoreCtx(r) };
    match.round = null;
    match.over = R.isMatchOver(match.totals, match.rules, match.roundNo);
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
      worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
      worker.onerror = () => { workerOk = false; worker = null; for (const [, p] of pending) p({}); pending.clear(); };
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
      pending.set(id, ({ card }) => resolve(card >= 0 && R.legalFor(r, seat).includes(card) ? card : chooseLocal(r, seat, tier)));
      w.postMessage({ id, round: r, seat, tier, seed: (Math.random() * 2 ** 31) | 0 });
    });
  }
  function exposeLocal(r, seat, tier) {
    return AI.exposerForTier(tier)(r, seat, R.makeRng((Math.random() * 2 ** 31) | 0));
  }
  function chooseExpose(r, seat, tier) {
    const ok = (cards) => Array.isArray(cards) && cards.every((c) => R.EXPOSABLE.includes(c) && r.hands[seat].includes(c));
    const w = getWorker();
    if (!w) return Promise.resolve(exposeLocal(r, seat, tier));
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, ({ cards }) => resolve(ok(cards) ? cards : exposeLocal(r, seat, tier)));
      w.postMessage({ id, kind: 'expose', round: r, seat, tier, seed: (Math.random() * 2 ** 31) | 0 });
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
    const losers = match.over ? R.matchLosers(match.totals) : [];
    const cls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
    const rows = [0, 1, 2, 3].map((s) =>
      '<div class="gz-res-row' + (s === 0 ? ' me' : '') + (losers.includes(s) ? ' loser' : '') + '" data-seat="' + s + '">' +
      '<span class="gz-res-name">' + NAMES[s] + (losers.includes(s) ? '<span class="gz-pig-badge">猪</span>' : '') + '</span>' +
      '<span class="gz-res-caps gz-caps"></span>' +
      '<span class="gz-res-n gz-num ' + cls(last.scores[s]) + '">' + signed(last.scores[s]) + '</span>' +
      '<span class="gz-res-n gz-res-tot gz-num ' + cls(match.totals[s]) + '">' + signed(match.totals[s]) + '</span></div>').join('');
    const title = match.tutorial ? '教程完成' : match.over
      ? losers.map((s) => (s === 0 ? '你' : NAMES[s])).join('、') + (losers.length > 1 ? '都' : '') + '当了猪'
      : '第 ' + last.roundNo + ' 局';
    openDialog(
      '<h2>' + title + '</h2>' +
      '<div class="gz-res"><div class="gz-res-row gz-res-head"><span></span><span></span><span class="gz-res-n">本局</span><span class="gz-res-n">累计</span></div>' + rows + '</div>' +
      '<div class="gz-actions">' +
      (match.tutorial ? '<button type="button" class="gz-btn gz-btn-primary" data-act="tut-done" data-autofocus>开始第一盘</button>'
        : match.over ? '<button type="button" class="gz-btn gz-btn-primary" data-act="again" data-autofocus>再来一盘</button>'
        : '<button type="button" class="gz-btn gz-btn-primary" data-act="next" data-autofocus>下一局</button>') +
      '</div>',
      (d) => {
        d.querySelectorAll('.gz-res-row[data-seat]').forEach((row) => {
          const box = row.querySelector('.gz-res-caps');
          renderCaps(box, last.captured[+row.dataset.seat], null, last.ctx);
          const sc = box.querySelector('.gz-cap-score');
          if (sc) sc.remove();
        });
        d.querySelector('[data-act]').addEventListener('click', (e) => {
          closeDialog();
          if (e.currentTarget.dataset.act === 'tut-done') { endTutorial(); return; }
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

  /* 规则说明跟着本盘的规则开关走 */
  function rulesHtml(rules) {
    const lead = rules.leader === 'spade2'
      ? '每局都由有 ♠2 的人先出' + (rules.spadeTwoFirst ? '，第一张必须打 ♠2' : '') + '。'
      : '第一局有 ♠2 的人先出' + (rules.spadeTwoFirst ? '，第一张必须打 ♠2' : '') + '；之后由上局吃到猪的人先出，领什么都行。';
    const hearts = rules.hearts === 'classic'
      ? '红桃 A −50、K −40、Q −30、J −20，10 到 5 各 −10，4、3、2 记 0 分（但也算分牌）。'
      : '红桃按牌面扣分：2 到 10 扣对应点数，J −11、Q −12、K −13，A 只扣 1 分。';
    const pigLine = {
      slam: '猪羊照常；红桃、猪、羊、变压器全吃齐是大满贯，猪也变正，共 +800。',
      hearts: '这时谁吃了猪，猪也变 +100；全吃齐是大满贯，共 +800。',
      manjuan: '红桃、猪、羊都吃齐（猪羊满圈），猪也变 +100；再加变压器是大满贯，共 +800。',
      swap: '这一局所有人的猪羊互换：吃猪 +100、吃羊 −100（猪羊变色）；全吃齐的大满贯不换，共 +800。',
    }[rules.allHeartsPig];
    const end = {
      lose1000: '有人累计到 −1000，这一盘结束。',
      pm1000: '有人累计到 −1000 或 +1000，这一盘结束。',
      rounds10: '打满 10 局，这一盘结束。',
      none: '不设终点，一直累计下去。',
    }[rules.end];
    return '<dl class="gz-rules">' +
      '<dt>出牌</dt><dd>四人各 13 张。' + lead + '有领出的花色就必须跟，没有可以垫任意一张。领出花色里最大的牌吃下这一墩，下一墩由他先出。</dd>' +
      '<dt>分牌</dt><dd>猪 ♠Q −100；羊 ♦J +100。' + hearts + '</dd>' +
      '<dt>变压器 ♣10</dt><dd>它本身不算分，吃到它，你这一局的分数（不论正负）翻倍' + (rules.doublerAlone === 50 ? '；只吃到它一张、别的分牌都没吃到，算 +50。' : '。') + '</dd>' +
      '<dt>全红</dt><dd>一个人吃齐 13 张红桃，红桃改记 +200。' + pigLine + '</dd>' +
      (rules.expose ? '<dt>亮牌</dt><dd>开打前，♥A、♠Q、♦J、♣10 可以亮给大家看，效果翻倍：亮 ♥A 红桃全部 ×2，亮猪 −200，亮羊 +200，亮变压器 ×4' + (rules.doublerAlone === 50 ? '（单吃 +100）' : '') + '。亮出的牌在这门第一次被领出的那一墩里不能出，也不能拿它领这门，除非这门只剩它一张；垫牌不受限。</dd>' : '') +
      '<dt>一盘</dt><dd>' + end + '分最低的人当猪，并列都是。</dd></dl>';
  }

  function showRules() {
    openDialog('<h2>拱猪规则</h2>' + rulesHtml(match.rules) +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="tutorial">新手教程</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>知道了</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="tutorial"]').addEventListener('click', () => { closeDialog(); startTutorial(); });
      });
  }

  /* 设置里的规则开关：[键, 标题, [[值, 选项文字], ...]] */
  const RULE_UI = [
    ['spadeTwoFirst', '♠2 先出时', [[true, '第一张必须 ♠2'], [false, '随便出']]],
    ['leader', '每局谁先出', [['spade2', '有 ♠2 的人'], ['pig', '上局吃猪的人']]],
    ['hearts', '红桃计分', [['face', '按牌面'], ['classic', '经典 A −50']]],
    ['allHeartsPig', '全红时的猪', [['slam', '大满贯才变正'], ['hearts', '全红就变正'], ['manjuan', '猪羊满圈'], ['swap', '猪羊变色']]],
    ['doublerAlone', '单吃变压器', [[0, '不加分'], [50, '+50']]],
    ['expose', '亮牌', [[true, '可以亮'], [false, '不亮']]],
    ['end', '一盘结束', [['lose1000', '有人到 −1000'], ['pm1000', '有人到 ±1000'], ['rounds10', '打满 10 局'], ['none', '不设终点']]],
  ];

  function showSettings() {
    const seg = Object.keys(TIER_LABELS).map((k) => '<button type="button" data-tier="' + k + '" aria-pressed="' + (settings.tier === k) + '">' + TIER_LABELS[k] + '</button>').join('');
    const secs = [20, 0].map((k) => '<button type="button" data-sec="' + k + '" aria-pressed="' + ((settings.turnSec | 0) === k) + '">' + TURN_SEC_OPTS[k] + '</button>').join('');
    openDialog(
      '<h2>设置</h2><div class="gz-field-label">AI 水平</div><div class="gz-seg" role="group">' + seg + '</div>' +
      '<div class="gz-field-label">出牌限时</div><div class="gz-seg" role="group">' + secs + '</div>' +
      // 规则开关收在「玩法变体」里，默认折叠：新手先学一套完整规则，变体以后自己发现
      '<details class="gz-variants"' + (JSON.stringify(settings.rules) !== JSON.stringify(R.normalizeRules({})) ? ' open' : '') + '><summary>玩法变体</summary>' +
      RULE_UI.map(([k, label, opts]) => '<div class="gz-field-label">' + label + '</div><div class="gz-seg' + (opts.length > 2 ? ' is-4' : '') + '" role="group">' +
        opts.map(([v, t]) => '<button type="button" data-rule="' + k + '" data-val="' + v + '" aria-pressed="' + (settings.rules[k] === v) + '">' + t + '</button>').join('') +
        '</div>').join('') +
      '<p class="gz-note" data-rule-note hidden>规则改动从下一盘起生效。</p></details>' +
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
        const syncNote = () => {
          const differs = JSON.stringify(settings.rules) !== JSON.stringify(match.rules);
          d.querySelector('[data-rule-note]').hidden = !differs;
          d.querySelector('[data-act="restart"]').classList.toggle('gz-btn-primary', differs);
        };
        d.querySelectorAll('[data-rule]').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.rule;
          const opt = RULE_UI.find((x) => x[0] === k)[2].find(([v]) => String(v) === b.dataset.val);
          settings.rules = R.normalizeRules(Object.assign({}, settings.rules, { [k]: opt[0] }));
          writeJSON(SETTINGS_KEY, settings);
          d.querySelectorAll('[data-rule="' + k + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          syncNote();
        }));
        syncNote();
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="restart"]').addEventListener('click', () => {
          if (!confirm('放弃这一盘，从 0 分重新开始？')) return;
          stopClock(); closeDialog(); token++; busy = false; setAutopilot(false); newMatch(); startRound();
        });
      });
  }

  /* ───── 新手教程：固定一副牌 + 三家「导演」出牌 + 按事件讲解（内容在 gongzhu-tutorial.js） ───── */

  let tut = null;   // { coach, saved: 教程前的那一盘（教完放回去）, firstRun }

  function startTutorial(firstRun) {
    token++;
    stopClock();
    setAutopilot(false);
    tut = { coach: T.createCoach(), saved: match && !match.tutorial ? match : (tut && tut.saved), firstRun: !!firstRun };
    match = { tutorial: true, rules: T.RULES, totals: [0, 0, 0, 0], roundNo: 1, pigTaker: -1, seed: 0, round: T.createRound(), exposing: [], last: null, over: false };
    selected = -1;
    busy = true;
    els.table.classList.add('is-tutorial');
    hideCoach();
    renderAll();
    schedule(step, 500);
  }

  function endTutorial() {
    token++;
    writeJSON(TUT_KEY, 1);
    els.table.classList.remove('is-tutorial');
    hideCoach();
    const back = tut && tut.saved;
    if (tut && tut.firstRun) { settings.tier = 'easy'; writeJSON(SETTINGS_KEY, settings); }   // 第一次学完：先跟「入门」打
    tut = null;
    busy = false;
    selected = -1;
    if (back && !back.over && (back.round || back.last)) {
      match = back;
      renderAll();
      if (match.round) step();
      else showSettlement();
      return;
    }
    newMatch();
    startRound();
  }

  function tutStep() {
    const r = match.round;
    renderSeats();
    if (r.turn === 0) {
      busy = false;
      renderHand();
      const h = tut.coach.hint(r);
      if (h) showCoach({ text: h }, null);
      return;
    }
    busy = true;
    renderHand();
    const seat = r.turn;
    schedule(() => commit(seat, T.director(r, seat)), pace().aiMin);
  }

  // 讲解一段段地说，每段点「继续」；说完回到 done
  function coachSay(msgs, done) {
    if (!msgs.length) { hideCoach(); done(); return; }
    showCoach(msgs[0], () => coachSay(msgs.slice(1), done));
  }

  function inlineCards(text) {
    return text.replace(/\{([♠♥♦♣])([0-9JQKA]+)\}/g, (_, su, rk) =>
      '<span class="gz-ic ' + (su === '♥' || su === '♦' ? 'suit-red' : 'suit-black') + '">' + su + rk + '</span>');
  }

  function showCoach(msg, onNext) {
    const c = els.coach;
    c.querySelector('.gz-coach-text').innerHTML = inlineCards(msg.text);
    const parts = c.querySelector('.gz-coach-parts');
    parts.innerHTML = '';
    if (msg.parts) {
      let sum = 0;
      for (const p of msg.parts) {
        sum += p.value;
        const cell = document.createElement('span');
        cell.className = 'gz-part';
        const m = buildCard(p.card);
        m.classList.add('gz-mini');
        const v = document.createElement('span');
        v.className = 'gz-num neg';
        v.textContent = signed(p.value);
        cell.append(m, v);
        parts.appendChild(cell);
      }
      const eq = document.createElement('span');
      eq.className = 'gz-part-sum gz-num neg';
      eq.textContent = '= ' + signed(sum);
      parts.appendChild(eq);
    }
    const next = c.querySelector('[data-coach="next"]');
    next.hidden = !onNext;
    next.onclick = onNext ? () => { next.onclick = null; onNext(); } : null;
    c.hidden = false;
    c.classList.remove('pulse');
    if (onNext) next.focus({ preventScroll: true });
  }
  function hideCoach() { els.coach.hidden = true; }

  /* ───── 启动 ───── */

  els.play.addEventListener('click', playSelected);
  $('gzRulesBtn').addEventListener('click', showRules);
  $('gzSettingsBtn').addEventListener('click', showSettings);
  $('gzRoundInfo').addEventListener('click', () => { if (!match.tutorial) showTotals(); });
  els.coach.querySelector('[data-coach="skip"]').addEventListener('click', endTutorial);
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
    match.rules = R.normalizeRules(match.rules);
    renderAll();
    if (match.round) step();
    else if (match.last) showSettlement();
    else startRound();
  } else if (!readJSON(TUT_KEY) && !AUTO) {
    // 第一次来：问一句要不要先学
    newMatch();
    renderAll();
    openDialog('<h2>第一次玩拱猪？</h2><p>跟着打一局，边打边学，几分钟就会。</p>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="skip">直接开打</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="learn" data-autofocus>先学一局</button></div>',
      (d) => {
        d.querySelector('[data-act="learn"]').addEventListener('click', () => { closeDialog(); match = null; startTutorial(true); });
        d.querySelector('[data-act="skip"]').addEventListener('click', () => { closeDialog(); writeJSON(TUT_KEY, 1); startRound(); });
      });
  } else {
    newMatch();
    startRound();
  }
})();
