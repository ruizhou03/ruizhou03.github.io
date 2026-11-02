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
    coach: $('gzCoach'), fx: $('gzFx'),
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

  /* 增量更新：已有的小牌节点原样复用，只插入新来的、删掉没了的。
   * slide=true 时用 FLIP：先记下旧位置，改完 DOM 再从旧位置平移回来——
   * 新牌（incoming，先隐身占位）两边的牌在飞牌途中让开一个空位，飞来的牌正好落进去，之后不再收紧。 */
  function renderCaps(box, cards, incoming, ctx, slide) {
    if (!cards.length) { box.innerHTML = ''; return; }
    const hidden = new Set(incoming || []);
    const r = match.round;
    ctx = ctx || (r ? R.scoreCtx(r) : { rules: match.rules, exposed: [] });
    const sc = R.scoreCaptured(cards, ctx);
    let row = box.querySelector('.gz-caps-row');
    if (!row) { row = document.createElement('div'); row.className = 'gz-caps-row'; box.appendChild(row); }
    const old = new Map();
    row.querySelectorAll('.gz-mini').forEach((el) => old.set(+el.dataset.card, el));
    const before = new Map();
    if (slide) for (const [c, el] of old) before.set(c, el.getBoundingClientRect());

    const mini = (c) => {
      let el = old.get(c);
      if (!el) {
        el = buildCard(c);
        el.classList.add('gz-mini');
        if (hidden.has(c)) el.classList.add('incoming');
      }
      el.classList.toggle('is-exposed', ctx.exposed.includes(c));
      old.delete(c);
      return el;
    };
    const want = [];
    if (sc.doubler) { const d = mini(R.DOUBLER); d.classList.add('is-doubler'); want.push(d); }
    if (sc.pig) want.push(mini(R.PIG));
    if (sc.sheep) want.push(mini(R.SHEEP));
    let fan = row.querySelector('.gz-fan');
    if (sc.hearts) {
      if (!fan) { fan = document.createElement('span'); fan.className = 'gz-fan'; }
      fan.classList.toggle('is-all', sc.allHearts);
      const hs = cards.filter(R.isHeart).sort((a, b) => a - b).map(mini);
      hs.forEach((el, k) => { if (fan.children[k] !== el) fan.insertBefore(el, fan.children[k] || null); });
      want.push(fan);
    } else if (fan) { fan.remove(); fan = null; }
    let score = row.querySelector('.gz-cap-score');
    const fresh = !score;
    if (!score) { score = document.createElement('span'); score.className = 'gz-cap-score gz-num'; }
    if (hidden.size && !fresh) score.dataset.next = sc.total;          // 牌在飞：旧分先留着，落地再翻
    else if (fresh && hidden.size) { score.dataset.next = sc.total; score.textContent = ''; score.dataset.v = ''; }
    else rollNumber(score, sc.total);
    want.push(score);
    want.forEach((el, k) => { if (row.children[k] !== el) row.insertBefore(el, row.children[k] || null); });
    for (const el of old.values()) el.remove();   // 新的一局：清掉上局的
    while (row.children.length > want.length) row.lastChild.remove();
    row.classList.toggle('is-slam', sc.grandSlam);
    fitFan(box, row, fan);

    if (!slide || !before.size) return;
    const dur = pace().fly;
    for (const [c, a] of before) {
      const el = row.querySelector('.gz-mini[data-card="' + c + '"]');
      if (!el) continue;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: dur, easing: 'cubic-bezier(.45, 0, .3, 1)' });
    }
  }

  /* 红桃扇的叠放间距：放得下就露 44%，放不下就叠紧一点（最少露 16%），整行永远不折 */
  function fitFan(box, row, fan) {
    if (!fan) return;
    const m = parseFloat(getComputedStyle(box).getPropertyValue('--m')) || 28;
    const n = fan.children.length;
    let others = 0;
    for (const el of row.children) if (el !== fan) others += el.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const avail = box.clientWidth - others - gap * (row.children.length - 1) - 6;
    const step = n > 1 ? Math.max(m * 0.16, Math.min(m * 0.44, (avail - m) / (n - 1))) : 0;
    fan.style.setProperty('--fanstep', step.toFixed(1) + 'px');
  }

  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }

  /* 分数变化：旧数往上翻走、新数从下面翻上来（像翻页计分牌），颜色跟着正负变 */
  function rollNumber(el, n) {
    const prev = el.dataset.v;
    el.dataset.v = n;
    el.classList.toggle('neg', n < 0);
    el.classList.toggle('pos', n > 0 && el.classList.contains('gz-cap-score'));
    if (prev === undefined || prev === '' || +prev === n || reduceMotion()) { el.textContent = signed(n); return; }
    const up = n > +prev;
    el.innerHTML = '<span class="gz-roll ' + (up ? 'up' : 'down') + '"><span class="gz-roll-old">' + signed(+prev) + '</span><span class="gz-roll-new">' + signed(n) + '</span></span>';
    clearTimeout(el._roll);
    el._roll = setTimeout(() => { if (+el.dataset.v === n) el.textContent = signed(n); }, 520);
  }

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

  /* 一轮刚打满、分牌还没飞到：规则引擎已经记进了赢家的吃牌，界面先别画，等飞过去时再「划开插入」 */
  let flying = null;

  function renderSeat(s, incoming, slide) {
    const r = match.round;
    const el = els.seats[s];
    const tot = el.querySelector('.gz-total');
    rollNumber(tot, match.totals[s]);
    tot.classList.toggle('neg', match.totals[s] < 0);
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
          shown.appendChild(m);
        }
      }
    }
    const caps = r ? r.captured[s].filter((c) => !flying || !flying.has(c)) : [];
    renderCaps(el.querySelector('.gz-caps'), caps, incoming, null, slide);
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
      if (c === suggestCard && myTurn) el.classList.add('is-suggest');
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
    if (seat === 0 && match.tutorial) { hideCoach(); clearTimeout(idleTimer); suggestCard = -1; els.play.classList.remove('is-suggest'); }
    busy = true;   // 下一手由 step() 接手，轮到我时它再放开；早放开会让我抢在 step 前出牌、排出两次 step
    if (done) flying = new Set(done.plays.map((p) => p.card).filter(R.isScoring));
    renderTrick(done ? done.plays : null, seat);
    markAce(done ? done.plays : r.trick, seat, card);
    renderSeat(seat);
    renderHand();
    if (!done) { save(); schedule(step, 60); return; }
    // 一墩完成：停一下让人看清，分牌飞进赢家的吃牌区，没分的牌就地淡出
    for (let s = 0; s < 4; s++) els.seats[s].classList.remove('is-turn');
    schedule(() => {
      const ms = Math.max(flyTrick(done.plays, done.winner), playTrickFx(done));
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
    flying = null;
    renderSeat(winner, fresh, true);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flyers = [];
    plays.forEach((p) => {
      const slot = els.slots[p.seat];
      if (!slot.querySelector('.gz-card')) return;
      const a = slot.getBoundingClientRect();
      const scoring = R.isScoring(p.card);
      const fl = buildCard(p.card);
      fl.classList.add('gz-flyer');
      fl.style.cssText += ';left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;--q:' + a.width + 'px';
      fl.style.transitionDuration = (reduce ? 1 : scoring ? pace().fly : pace().fade) + 'ms';
      els.app.appendChild(fl);
      flyers.push({ fl, a, target: scoring ? caps.querySelector('[data-card="' + p.card + '"]') : null });
    });
    els.slots.forEach((slot) => { slot.innerHTML = ''; slot.classList.remove('is-ace'); });
    void els.app.offsetWidth;  // 强制回流：起点样式落定后再设终点，过渡才会跑（不靠 rAF，后台页也稳）
    for (const { fl, a, target } of flyers) {
      if (target) {
        const b = target.getBoundingClientRect();
        fl.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(' + (b.width / a.width) + ',' + (b.height / a.height) + ')';
      } else {
        fl.style.transform = 'scale(0.86)';
        fl.style.opacity = '0';
      }
    }
    const ms = reduce ? 20 : fresh.length ? pace().fly : pace().fade;
    setTimeout(() => {
      flyers.forEach(({ fl }) => fl.remove());
      caps.querySelectorAll('.incoming').forEach((el) => el.classList.remove('incoming'));
      const sc = caps.querySelector('.gz-cap-score');
      if (sc && sc.dataset.next !== undefined) { rollNumber(sc, +sc.dataset.next); delete sc.dataset.next; }
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
    if (match.tutorial) { suggestCard = -1; armIdle(); }
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
      ? '红桃 A −50、K −40、Q −30、J −20，10 到 5 各 −10，4、3、2 记 0 分（但仍算带分数的牌）。'
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
      '<dt>出牌</dt><dd>四人各 13 张。' + lead + '每一轮第一张出的牌决定这一轮的花色：如果你手里有这个花色，就必须出这个花色的牌；没有才可以出任意一张（叫「垫牌」）。出了这一轮花色里最大一张的人赢下这一轮，收走这一轮的牌，下一轮由他先出。</dd>' +
      '<dt>带分数的牌</dt><dd>猪 ♠Q −100；羊 ♦J +100。' + hearts + '</dd>' +
      '<dt>变压器 ♣10</dt><dd>它本身不算分，吃到它，你这一局的分数（不论正负）翻倍' + (rules.doublerAlone === 50 ? '；只吃到它一张、别的带分数的牌都没吃到，算 +50。' : '。') + '</dd>' +
      '<dt>全红</dt><dd>一个人吃齐 13 张红桃，红桃改记 +200。' + pigLine + '</dd>' +
      (rules.expose ? '<dt>亮牌</dt><dd>开打前，♥A、♠Q、♦J、♣10 可以亮给大家看，效果翻倍：亮 ♥A 红桃全部 ×2，亮猪 −200，亮羊 +200，亮变压器 ×4' + (rules.doublerAlone === 50 ? '（单吃 +100）' : '') + '。这个花色第一次被领出的那一轮里，亮出的牌不能出，也不能用它来领这个花色，除非你这个花色只剩它一张；垫牌不受限。</dd>' : '') +
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

  /* ───── 特殊事件动画（牌桌中央，绝对定位、不占布局） ─────
   * 猪：粉色小猪头弹出、左右扭两下，然后朝吃猪的人跑过去；羊：卷毛小羊蹦两下再跑过去；
   * 变压器：圆环里一个 ×2（颜色随分数正负）+ 金星；全红：三处红心烟花接连炸开，再浮出「全红」；
   * 大满贯：金冠落下 + 金色烟花。领出花色的 A 一出：那张牌旁边盖一个小「照单全收」。 */

  const FX_DRIFT = [[0, 90], [120, 0], [0, -90], [-120, 0]];   // 朝各座位跑的方向（我 / 下 / 对 / 上）
  const FX_GAP = 600;
  const FX_DUR = { pig: 1900, sheep: 1900, doubler: 1700, allhearts: 2700, slam: 2600 };
  const DOUBLER_TONE = {
    gold: { ink: '#b8924a', ring: '#c9a96e', sparks: ['#c9a96e', '#dcb86c'] },
    ash: { ink: '#7b756b', ring: '#a39c90', sparks: ['#a39c90', '#8c867b'] },
    navy: { ink: '#3d5878', ring: '#6c84a2', sparks: ['#6c84a2', '#8ea2bb'] },
  };
  const HEART_REDS = ['#b4392c', '#c9473a', '#d65f4f', '#a8322a', '#e07463'];
  const ART = {
    // 坏猪：小恶魔角、倒竖眉、红瞳、斜嘴獠牙
    pig: '<svg viewBox="0 0 140 122" aria-hidden="true">' +
      '<path d="M44 28C37 16 38 5 47 0c-2 10 2 18 9 22Z" fill="#7a1e1a"/><path d="M96 28c7-12 6-23-3-28 2 10-2 18-9 22Z" fill="#7a1e1a"/>' +
      '<path d="M22 44 28 12 52 32Z" fill="#e0889a"/><path d="M118 44 112 12 88 32Z" fill="#e0889a"/>' +
      '<ellipse cx="70" cy="70" rx="53" ry="47" fill="#f2a9b5"/><ellipse cx="40" cy="84" rx="9" ry="5.5" fill="#e98698" opacity=".6"/><ellipse cx="100" cy="84" rx="9" ry="5.5" fill="#e98698" opacity=".6"/>' +
      '<ellipse cx="52" cy="62" rx="9" ry="5.5" fill="#fff"/><ellipse cx="88" cy="62" rx="9" ry="5.5" fill="#fff"/><circle cx="54.5" cy="63" r="3.6" fill="#b4392c"/><circle cx="85.5" cy="63" r="3.6" fill="#b4392c"/>' +
      '<path d="M38 47 61 57M102 47 79 57" stroke="#3a2420" stroke-width="6.5" stroke-linecap="round"/>' +
      // 额头一颗小黑桃（呼应 ♠Q）
      '<path d="M70 27c5 5 10 8.5 10 13 0 3.4-3.2 5.2-6 3.8-1-.5-1.8-1.3-2.4-2.4L73 47h-6l1.4-5.6c-.6 1.1-1.4 1.9-2.4 2.4-2.8 1.4-6-.4-6-3.8 0-4.5 5-8 10-13Z" fill="#1f1c18"/>' +
      '<ellipse cx="70" cy="84" rx="21" ry="14" fill="#ea8f9f"/><ellipse cx="62" cy="84" rx="3.6" ry="5.4" fill="#a94a5e"/><ellipse cx="78" cy="84" rx="3.6" ry="5.4" fill="#a94a5e"/>' +
      '<path d="M50 103q22 10 42-6" stroke="#3a2420" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m80 103 4 8 3-11Z" fill="#fffaf3" stroke="#3a2420" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    // 羊：羊毛先描一圈外轮廓再整块填色（像一整朵云，不是一个个圆），暖米色、腮红，额头一颗小红方块呼应 ♦J
    sheep: (() => {
      const wool = [[34, 42, 16], [52, 28, 17], [72, 28, 17], [88, 43, 16], [93, 63, 15], [78, 80, 16], [42, 80, 16], [27, 63, 15], [60, 86, 15], [60, 52, 30]];
      const tuft = [[50, 37, 9], [70, 37, 9], [60, 31, 10]];
      const circ = (a, attrs) => a.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + attrs + '/>').join('');
      return '<svg viewBox="0 0 120 106" aria-hidden="true">' +
        '<g fill="#e7cfc0">' + circ(wool, ' stroke="#b98f80" stroke-width="5"') + '</g><g fill="#fbefe4">' + circ(wool, '') + '</g>' +
        '<ellipse cx="31" cy="55" rx="12" ry="6" transform="rotate(-24 31 55)" fill="#4b3a34"/><ellipse cx="89" cy="55" rx="12" ry="6" transform="rotate(24 89 55)" fill="#4b3a34"/>' +
        '<ellipse cx="60" cy="61" rx="20" ry="25" fill="#4b3a34"/>' +
        '<g fill="#e7cfc0">' + circ(tuft, ' stroke="#b98f80" stroke-width="4"') + '</g><g fill="#fbefe4">' + circ(tuft, '') + '</g>' +
        '<path d="M60 26 65 33 60 40 55 33Z" fill="#b4392c"/>' +
        '<circle cx="52" cy="59" r="5" fill="#fff"/><circle cx="68" cy="59" r="5" fill="#fff"/><circle cx="53" cy="60" r="2.6" fill="#1d1b18"/><circle cx="69" cy="60" r="2.6" fill="#1d1b18"/>' +
        '<ellipse cx="46" cy="70" rx="4.5" ry="2.8" fill="#d9786c" opacity=".7"/><ellipse cx="74" cy="70" rx="4.5" ry="2.8" fill="#d9786c" opacity=".7"/>' +
        '<path d="M55 75Q60 80 65 75" stroke="#d9b9a6" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
    })(),
    heart: '<svg viewBox="0 0 100 92" aria-hidden="true"><path d="M50 89C20 67 3 51 3 30 3 15 15 4 29 4c9 0 16 5 21 13 5-8 12-13 21-13 14 0 26 11 26 26 0 21-17 37-47 59Z" fill="#b4392c"/>' +
      '<path d="M22 18c-6 2-10 8-10 14" stroke="#e8857a" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/></svg>',
    // 金冠：渐变金、五个尖、珍珠；正中一颗红方块，冠箍上红桃居中、草花左、黑桃右
    crown: '<svg viewBox="0 0 160 124" aria-hidden="true"><defs>' +
      '<linearGradient id="gzCrownG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e2a4"/><stop offset=".55" stop-color="#d9b062"/><stop offset="1" stop-color="#a9823a"/></linearGradient>' +
      '<linearGradient id="gzCrownB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c97c"/><stop offset="1" stop-color="#9c7731"/></linearGradient></defs>' +
      '<path d="M20 94 11 36 47 64 80 16 113 64 149 36 140 94Z" fill="url(#gzCrownG)" stroke="#8a6526" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M26 88 20 50 47 70 80 30 113 70 140 50 134 88Z" fill="none" stroke="#fff4d2" stroke-width="1.5" opacity=".55" stroke-linejoin="round"/>' +
      // 正中一颗红方块（最像宝石）
      '<path d="M80 36 90 52 80 68 70 52Z" fill="#b4392c" stroke="#7a1e1a" stroke-width="1.5"/><path d="M80 40 85 50 80 52Z" fill="#f0a49a" opacity=".8"/>' +
      '<circle cx="11" cy="33" r="6.5" fill="#fffaf0" stroke="#a9823a" stroke-width="2"/><circle cx="80" cy="12" r="7.5" fill="#fffaf0" stroke="#a9823a" stroke-width="2"/><circle cx="149" cy="33" r="6.5" fill="#fffaf0" stroke="#a9823a" stroke-width="2"/>' +
      '<circle cx="47" cy="61" r="3.5" fill="#fffaf0" stroke="#a9823a" stroke-width="1.5"/><circle cx="113" cy="61" r="3.5" fill="#fffaf0" stroke="#a9823a" stroke-width="1.5"/>' +
      '<rect x="16" y="92" width="128" height="22" rx="5" fill="url(#gzCrownB)" stroke="#8a6526" stroke-width="2.5"/><path d="M22 97H138" stroke="#fff4d2" stroke-width="1.5" opacity=".6"/>' +
      // 冠箍：红桃居中，草花在左，黑桃在右
      '<path d="M80 111c-6-4.6-10-8-10-12 0-2.8 2.2-5 4.8-5 2.2 0 4 1.3 5.2 3.2 1.2-1.9 3-3.2 5.2-3.2 2.6 0 4.8 2.2 4.8 5 0 4-4 7.4-10 12Z" fill="#b4392c" stroke="#7a1e1a" stroke-width="1.2"/>' +
      '<g fill="#1f1c18"><circle cx="50" cy="99" r="3.3"/><circle cx="46.4" cy="104" r="3.3"/><circle cx="53.6" cy="104" r="3.3"/><path d="M50 102.5 52.6 110h-5.2Z"/></g>' +
      '<path d="M110 95c3.6 3.6 7.2 6 7.2 9.4 0 2.5-2.3 3.8-4.3 2.8-.7-.4-1.3-1-1.7-1.7L112.2 110h-4.4l1-4.5c-.4.7-1 1.3-1.7 1.7-2 1-4.3-.3-4.3-2.8 0-3.4 3.6-5.8 7.2-9.4Z" fill="#1f1c18"/>' +
      '<g fill="#fffaf0"><circle cx="34" cy="103" r="2.6"/><circle cx="65" cy="103" r="2.6"/><circle cx="95" cy="103" r="2.6"/><circle cx="126" cy="103" r="2.6"/></g></svg>',
  };

  function markAce(plays, seat, card) {
    if (!plays.length || R.rankOf(card) !== 12) return;
    if (R.suitOf(card) !== R.suitOf(plays[0].card)) return;
    els.slots[seat].classList.add('is-ace');
  }

  // 一轮里可能同时有好几件事（猪 + 变压器……）：依次上演。返回整段时长（无事件返回 0）
  function playTrickFx(done) {
    const r = match.round;
    const w = done.winner;
    const cs = done.plays.map((p) => p.card);
    const sc = R.scoreCaptured(r.captured[w], R.scoreCtx(r));
    const list = [];
    const hadAll = r.captured[w].filter(R.isHeart).length === 13 && cs.some(R.isHeart);
    // 动画只写效果 / 分数，不写是谁吃的（飘向谁已经说明了）
    if (sc.grandSlam && hadAll) list.push({ kind: 'slam', word: '大满贯', sub: signed(sc.total) });
    else if (hadAll) list.push({ kind: 'allhearts', word: '全红', sub: signed(sc.heartScore) });
    if (!sc.grandSlam) {
      if (cs.includes(R.PIG)) list.push({ kind: 'pig', sub: signed(sc.pigScore) });
      if (cs.includes(R.SHEEP)) list.push({ kind: 'sheep', sub: signed(sc.sheepScore) });
      // 变压器的颜色看吃到它的人现在的分：正分金色（翻倍是好事）、负分灰色（雪上加霜）、0 分藏青
      if (cs.includes(R.DOUBLER)) list.push({ kind: 'doubler', word: '×' + (R.scoreCtx(r).exposed.includes(R.DOUBLER) ? 4 : 2), sub: '',
        tone: sc.total > 0 ? 'gold' : sc.total < 0 ? 'ash' : 'navy' });
    }
    if (!list.length || reduceMotion()) return 0;
    let end = 0;
    list.forEach((fx, k) => {
      setTimeout(() => playFx(fx, w), k * FX_GAP);
      end = Math.max(end, k * FX_GAP + FX_DUR[fx.kind]);
    });
    return end;
  }

  // 多段关键帧：缓动按段给（Web Animations 的整体 easing 会把整条时间线压歪，停顿变短、淡出提前）
  function animate(el, frames, opts, ease) {
    const e = ease || 'cubic-bezier(.25, .8, .35, 1)';
    return el.animate(frames.map((f) => Object.assign({ easing: e }, f)), Object.assign({ easing: 'linear' }, opts));
  }
  const FT = (x, y, sc, rot) => 'translate(-50%, -50%) translate(' + (x || 0) + 'px,' + (y || 0) + 'px) scale(' + (sc == null ? 1 : sc) + ') rotate(' + (rot || 0) + 'deg)';

  function playFx(fx, w) {
    const [dx, dy] = FX_DRIFT[w];
    const dur = FX_DUR[fx.kind];
    const item = document.createElement('div');
    item.className = 'gz-fxitem kind-' + fx.kind;
    const art = fx.kind === 'pig' || fx.kind === 'sheep' ? ART[fx.kind] : fx.kind === 'slam' ? ART.crown : '';
    const tone = fx.kind === 'doubler' ? DOUBLER_TONE[fx.tone || 'gold'] : null;
    item.innerHTML = (art ? '<div class="gz-fxart">' + art + '</div>' : '') +
      (fx.kind === 'allhearts' ? '<div class="gz-fxheart">' + ART.heart + '<span class="w">' + fx.word + '</span></div>' : '') +
      (fx.kind === 'doubler' ? '<div class="gz-fxcoin" style="--tone:' + tone.ring + ';color:' + tone.ink + '"><span>' + fx.word + '</span></div>' : '') +
      (fx.kind === 'slam' ? '<div class="gz-fxword">大满贯</div>' : '') +
      (fx.sub ? '<div class="gz-fxscore ' + (fx.sub[0] === '−' ? 'neg' : 'pos') + '">' + fx.sub + '</div>' : '');
    els.fx.appendChild(item);
    let frames;
    if (fx.kind === 'pig') {
      // 猪是 ♠Q：四散的全是大大小小、边飞边转的黑桃
      bloom(['♠'], ['#1f1c18', '#3a2420', '#4a3a36', '#7a1e1a'], 180, 190, [16, 82]);
      frames = [
        { transform: FT(0, 0, 0.2), opacity: 0 }, { transform: FT(0, 0, 1.15), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1), offset: 0.26 },
        { transform: FT(-9, 0, 1), offset: 0.34 }, { transform: FT(9, 0, 1), offset: 0.42 }, { transform: FT(-6, 0, 1), offset: 0.5 },
        { transform: FT(4, 0, 1), offset: 0.57 }, { transform: FT(0, 0, 1), opacity: 1, offset: 0.66 }, { transform: FT(dx, dy, 0.42), opacity: 0 },
      ];
    } else if (fx.kind === 'sheep') {
      // 羊是 ♦J：四散的是红方块
      bloom(['♦'], ['#b4392c', '#c9473a', '#d65f4f', '#a8322a'], 180, 190, [16, 76]);
      frames = [
        { transform: FT(0, 0, 0.2), opacity: 0 }, { transform: FT(0, 0, 1.12), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1), offset: 0.26 },
        { transform: FT(0, -22, 1), offset: 0.36 }, { transform: FT(0, 0, 1), offset: 0.46 }, { transform: FT(0, -13, 1), offset: 0.54 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.66 }, { transform: FT(dx, dy, 0.42), opacity: 0 },
      ];
    } else if (fx.kind === 'doubler') {
      frames = [
        { transform: FT(0, 0, 2.2), opacity: 0 }, { transform: FT(0, 0, 0.92), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1.04), offset: 0.24 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.7 }, { transform: FT(dx, dy, 0.5), opacity: 0 },
      ];
      // 变压器是 ♣10：四散的是草花，颜色跟着圆环
      bloom(['♣'], tone.sparks, 120, 160, [16, 66], 0);
    } else if (fx.kind === 'allhearts') {
      // 只用红心：五朵红心烟花接连炸开，中间一颗大红心「怦、怦」跳两下
      burst(-150, -60, 26, ['♥'], HEART_REDS, 0, 135, { glow: 'red', spin: true, size: [20, 78] });
      burst(150, -50, 26, ['♥'], HEART_REDS, 220, 135, { glow: 'red', spin: true, size: [20, 78] });
      burst(-90, 70, 24, ['♥'], HEART_REDS, 440, 120, { glow: 'red', spin: true, size: [20, 78] });
      burst(100, 75, 24, ['♥'], HEART_REDS, 620, 120, { glow: 'red', spin: true, size: [20, 78] });
      burst(0, -10, 40, ['♥'], HEART_REDS, 820, 190, { glow: 'red', spin: true, size: [20, 78] });
      frames = [
        { transform: FT(0, 0, 0), opacity: 0 }, { transform: FT(0, 0, 0), opacity: 0, offset: 0.26 },
        { transform: FT(0, 0, 1.18), opacity: 1, offset: 0.34 }, { transform: FT(0, 0, 0.94), offset: 0.4 },
        { transform: FT(0, 0, 1.1), offset: 0.46 }, { transform: FT(0, 0, 1), offset: 0.53 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.82 }, { transform: FT(dx, dy, 0.5), opacity: 0 },
      ];
    } else {   // slam
      // 大满贯：四种花色混在一起，加几颗金星
      burst(-140, -40, 26, ['♠', '♥', '♦', '♣', '✦'], SUIT_TINT, 250, 140, { spin: true, size: [18, 72] });
      burst(140, -40, 26, ['♣', '♦', '♥', '♠', '✦'], SUIT_TINT, 520, 140, { spin: true, size: [18, 72] });
      burst(0, 20, 36, ['♥', '♠', '♦', '♣', '✦'], SUIT_TINT, 800, 175, { spin: true, size: [18, 82] });
      frames = [
        { transform: FT(0, -120, 1), opacity: 0 }, { transform: FT(0, 6, 1), opacity: 1, offset: 0.14 }, { transform: FT(0, -6, 1), offset: 0.2 },
        { transform: FT(0, 0, 1), offset: 0.26 }, { transform: FT(0, 0, 1), opacity: 1, offset: 0.82 }, { transform: FT(dx, dy, 0.5), opacity: 0 },
      ];
    }
    animate(item, frames, { duration: dur, fill: 'forwards' });
    setTimeout(() => item.remove(), dur + 60);
  }

  // 一朵烟花：n 颗粒子从 (x, y) 炸开，往外飞、再带点下坠淡出
  // 一次「绽放」：主朵 + 一半概率再追一小朵（换个样式、偏开一点），每回都不一样
  function bloom(glyphs, colors, delay, radius, size, y0 = -30) {
    burst(0, y0, 30, glyphs, colors, delay, radius, { glow: 'none', spin: true, size });
    if (Math.random() < 0.5) {
      const side = Math.random() < 0.5 ? -1 : 1;
      burst(side * (60 + Math.random() * 60), -40 + Math.random() * 50, 14, glyphs, colors, delay + 260, radius * 0.6,
        { glow: 'none', spin: true, size: [size[0], size[1] * 0.75] });
    }
  }

  /* opts：glow 'gold' | 'red' | 'none'（中心晕光）；spin 允许旋转；size [最小, 最大] 字号 px。
   * colors 可以是数组（按顺序轮换）或函数 glyph → 颜色。
   * 粒子的姿态：大小拉开（少数很大），大部分接近正放；越大的越正、越稳，只有少数小的会大角度翻飞。 */
  function burst(x, y, n, glyphs, colors, delay, radius, opts) {
    const o = Object.assign({ glow: 'gold', spin: false, size: [15, 28] }, opts);
    if (o.glow !== 'none') {
      const flash = document.createElement('div');
      flash.className = 'gz-flash' + (o.glow === 'red' ? ' red' : '');
      els.fx.appendChild(flash);
      animate(flash, [{ transform: FT(x, y, 0.2), opacity: 0.85 }, { transform: FT(x, y, 1.5), opacity: 0 }],
        { duration: 520, delay, fill: 'both' }, 'ease-out');
      setTimeout(() => flash.remove(), 520 + delay + 60);
    }
    const rnd = (a, b) => a + Math.random() * (b - a);
    // 绽放样式：每次随机一种（一整圈 / 内外两圈 / 螺旋 / 喷泉 / 随意散开），同一种动画每回看起来都不一样
    const pat = o.pattern || ['ring', 'double', 'spiral', 'fountain', 'scatter'][(Math.random() * 5) | 0];
    const turn = Math.random() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const g = glyphs[k % glyphs.length];
      const el = document.createElement('span');
      el.className = 'gz-spark';
      el.textContent = g + '\uFE0E';   // 强制文字样式，♦♥ 不被画成 emoji
      el.style.color = typeof colors === 'function' ? colors(g) : colors[k % colors.length];
      // 大小：约 15% 是大个（区间顶部四分之一），其余偏小到中等
      const big = Math.random() < 0.15;
      const t = big ? rnd(0.75, 1) : Math.pow(Math.random(), 1.6) * 0.7;
      el.style.fontSize = (o.size[0] + t * (o.size[1] - o.size[0])).toFixed(0) + 'px';
      els.fx.appendChild(el);
      let a, d, lag = 0, fall = big ? 26 : 40;
      if (pat === 'ring') { a = turn + (k / n) * Math.PI * 2 + rnd(-0.12, 0.12); d = radius * rnd(0.85, 1.08); }
      else if (pat === 'double') { const inner = k % 2 === 1; a = turn + (k / n) * Math.PI * 2; d = radius * (inner ? rnd(0.42, 0.58) : rnd(0.95, 1.18)); lag = inner ? 0 : 110; }
      else if (pat === 'spiral') { a = turn + (k / n) * Math.PI * 4; d = radius * (0.3 + 0.85 * k / n); lag = k * 16; }
      else if (pat === 'fountain') { a = -Math.PI / 2 + rnd(-1.05, 1.05); d = radius * rnd(0.7, 1.3); lag = rnd(0, 140); fall = big ? 70 : 110; }
      else { a = Math.random() * Math.PI * 2; d = radius * rnd(0.35, 1.2); lag = rnd(0, 170); }
      if (big) d *= 0.85;
      const tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d;
      // 姿态：大个几乎正放、只轻轻晃；七成小个接近正放；三成小个翻飞
      let r0 = 0, r1 = 0;
      if (o.spin) {
        const mode = big ? 'steady' : Math.random() < 0.7 ? 'near' : 'free';
        if (mode === 'steady') { r0 = rnd(-6, 6); r1 = r0 + rnd(-10, 10); }
        else if (mode === 'near') { r0 = rnd(-14, 14); r1 = r0 + rnd(-40, 40); }
        else { r0 = rnd(-40, 40); r1 = r0 + (Math.random() < 0.5 ? -1 : 1) * rnd(150, 320); }
      }
      const pop = big ? 1.12 : 1;
      animate(el, [
        { transform: FT(x, y, 0.3, r0), opacity: 0 },
        { transform: FT(x, y, 0.6, r0), opacity: 1, offset: 0.06 },
        { transform: FT(tx, ty, pop, (r0 + r1) * 0.5), opacity: 1, offset: 0.45 },
        { transform: FT(tx, ty + 6, 1, (r0 + r1) * 0.6), opacity: 1, offset: 0.58, easing: 'ease-in' },   // 飞到最远后开始下坠
        { transform: FT(tx, ty + fall, 0.75, r1), opacity: 0 },
      ], { duration: big ? 1400 : 1250, delay: delay + lag, fill: 'both' }, 'cubic-bezier(.12, .8, .3, 1)');
      setTimeout(() => el.remove(), (big ? 1400 : 1250) + delay + lag + 60);
    }
  }
  // 花色本色：黑桃草花墨黑、红桃方块朱红、星点金色
  const SUIT_TINT = (g) => (g === '♠' || g === '♣' ? '#1f1c18' : g === '♥' || g === '♦' ? '#b4392c' : '#c9a96e');

  // 本机调试：控制台里 __gzDebug.playFx({ kind: 'pig', sub: '下家 −100' }, 1) 单独放一段动画
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__gzDebug = { playFx };

  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ───── 新手教程：固定一副牌 + 三家「导演」出牌 + 按事件讲解（内容在 gongzhu-tutorial.js） ───── */

  let tut = null;   // { coach, saved: 教程前的那一盘（教完放回去）, firstRun }
  let coachNext = null, coachHideTimer = 0;
  let idleTimer = 0, suggestCard = -1;   // 教程里久不出牌：呼吸提示一张牌（或已选好时提示「出牌」）
  const IDLE_MS = 8000;

  function armIdle() {
    clearTimeout(idleTimer);
    clearSuggest();
    if (!match.tutorial) return;
    const my = token;
    idleTimer = setTimeout(() => {
      const r = match.round;
      if (my !== token || !r || busy || r.turn !== 0 || coachNext) return;
      if (selected >= 0) { els.play.classList.add('is-suggest'); return; }
      suggestCard = AI.countingPolicy(r, 0);
      renderHand();
    }, IDLE_MS);
  }
  function clearSuggest() {
    els.play.classList.remove('is-suggest');
    if (suggestCard >= 0) { suggestCard = -1; if (match && match.round) renderHand(); }
  }

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
    clearTimeout(idleTimer);
    suggestCard = -1;
    els.play.classList.remove('is-suggest');
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
      armIdle();
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

  // 讲解里的 {♠Q} 画成嵌在字里的真牌面（跟手牌完全同一套版式，只是缩小）
  const SUIT_OF_CHAR = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
  function cardHtml(c, cls) {
    const el = buildCard(c);
    el.classList.add('gz-handlike', cls);
    return el.outerHTML;
  }
  function inlineCards(text) {
    return text.replace(/\{([♠♥♦♣])([0-9JQKA]+)\}/g, (_, su, rk) => cardHtml(SUIT_OF_CHAR[su] * 13 + R.RANK_LABELS.indexOf(rk), 'gz-inline'));
  }
  // 牌的大小：四门花色各一排真牌 2…A（叠着摆，露出左上角），底下一支从小指到大的箭头
  function rankChart() {
    const rows = [0, 1, 3, 2].map((su) => '<div class="gz-rank-row">' +
      R.RANK_LABELS.map((_, rk) => cardHtml(su * 13 + rk, 'gz-rank-card')).join('') + '</div>').join('');
    return '<div class="gz-ranks">' + rows +
      // 一笔由细到粗、尾巴淡出的金色箭杆，箭头是两道弧
      '<div class="gz-rank-arrow"><span>小</span><svg viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="gzArrowG" x1="0" x2="1"><stop offset="0" stop-color="#c9a96e" stop-opacity="0"/><stop offset=".35" stop-color="#c9a96e" stop-opacity=".7"/><stop offset="1" stop-color="#a8843e"/></linearGradient></defs>' +
      '<path d="M2 8 222 6.4Q228 8 222 9.6Z" fill="url(#gzArrowG)"/><path d="M214 1.5Q224 6 237 8Q224 10 214 14.5Q222 8 214 1.5Z" fill="#a8843e"/></svg><span>大</span></div></div>';
  }

  function showCoach(msg, onNext) {
    const c = els.coach;
    c.querySelector('.gz-coach-text').innerHTML = inlineCards(msg.text);
    const parts = c.querySelector('.gz-coach-parts');
    parts.innerHTML = msg.ranks ? rankChart() : '';
    if (msg.parts) {
      let sum = 0;
      for (const p of msg.parts) {
        sum += p.value;
        const cell = document.createElement('span');
        cell.className = 'gz-part';
        const m = buildCard(p.card);
        m.classList.add('gz-handlike');
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
    // 讲到吃牌区时把那一家的吃牌区点亮：先放大再缩回，然后金边慢慢呼吸
    els.seats.forEach((seat, k) => seat.querySelector('.gz-caps').classList.toggle('is-focus', msg.focus === k));
    // 说（等点继续）居中大字；提示（等我出牌）落在我出牌的位置
    coachNext = onNext || null;
    c.classList.toggle('is-say', !!onNext);
    c.classList.toggle('is-hint', !onNext);
    c.classList.remove('pulse');
    clearTimeout(coachHideTimer);
    if (c.hidden) { c.hidden = false; void c.offsetWidth; }
    c.classList.add('on');
  }
  function hideCoach() {
    coachNext = null;
    els.seats.forEach((seat) => seat.querySelector('.gz-caps').classList.remove('is-focus'));
    const c = els.coach;
    c.classList.remove('on');
    clearTimeout(coachHideTimer);
    coachHideTimer = setTimeout(() => { if (!c.classList.contains('on')) c.hidden = true; }, 240);
  }
  // 点任意处 / 空格 / 回车：往下讲
  function coachAdvance() {
    const f = coachNext;
    if (!f) return false;
    coachNext = null;
    f();
    return true;
  }

  /* ───── 启动 ───── */

  els.play.addEventListener('click', playSelected);
  $('gzRulesBtn').addEventListener('click', showRules);
  $('gzSettingsBtn').addEventListener('click', showSettings);
  $('gzRoundInfo').addEventListener('click', () => { if (!match.tutorial) showTotals(); });
  $('gzSkipTut').addEventListener('click', () => { if (match.tutorial) endTutorial(); });
  // 教程讲解时点牌桌任意处继续（顶栏按钮、弹窗照常）
  els.app.addEventListener('click', (e) => {
    if (!coachNext || e.target.closest('.gz-topbar') || !els.mask.hidden) return;
    coachAdvance();
  });
  els.seats[0].addEventListener('click', (e) => { if (autopilot && e.target.closest('.gz-avatar')) setAutopilot(false); });
  // 点遮罩关闭普通弹窗；结算弹窗必须点按钮继续
  els.mask.addEventListener('click', (e) => { if (e.target === els.mask && match.round) closeDialog(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.mask.hidden && match.round) closeDialog();
    if ((e.key === ' ' || e.key === 'Enter') && els.mask.hidden && coachNext) { e.preventDefault(); coachAdvance(); return; }
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
