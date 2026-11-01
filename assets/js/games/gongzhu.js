/* 拱猪 · 单机牌桌（我 + 3 家 AI）。规则在 gongzhu-rules.js，AI 在 gongzhu-ai.js。
 * 座位：0 我（下方）→ 1 下家（右）→ 2 对家（上）→ 3 上家（左），出牌按逆时针。 */
(() => {
  'use strict';

  const R = window.GongzhuRules;
  const AI = window.GongzhuAI;
  const STORE_KEY = 'gz.match.v1';
  const SETTINGS_KEY = 'gz.settings.v1';
  const VERSION = '20261101a';

  const NAMES = ['我', '下家', '对家', '上家'];
  const AVATARS = ['我', '下', '对', '上'];
  const TIER_LABELS = { easy: '入门', normal: '普通', hard: '高手' };
  const SUIT_NAMES = ['黑桃', '红桃', '方块', '梅花'];

  const PACE = { aiMin: 520, trickShow: 950, collect: 380, roundEnd: 650 };
  // 本机调试：?gzauto=1 让「我」也由 AI 代打并加速，用来一口气验到结算 / 一盘结束
  const AUTO = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('gzauto') === '1';
  if (AUTO) Object.assign(PACE, { aiMin: 30, trickShow: 80, collect: 40, roundEnd: 60 });

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('gzApp'), table: $('gzTable'), center: $('gzCenter'), hint: $('gzHint'),
    hand: $('gzHand'), play: $('gzPlayBtn'),
    roundNo: $('gzRoundNo'), roundSub: $('gzRoundSub'),
    mask: $('gzDialogMask'), dialog: $('gzDialog'),
    seats: [0, 1, 2, 3].map((s) => $('gzSeat' + s)),
    slots: [0, 1, 2, 3].map((s) => document.querySelector('.gz-slot-' + s)),
  };

  /* ───── 存档 ───── */

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式等：不存也能玩 */ } }

  const settings = Object.assign({ tier: 'normal' }, readJSON(SETTINGS_KEY) || {});

  let match = null;     // { totals, roundNo, nextLeader, seed, round, rounds:[{scores}] , over }
  let selected = -1;
  let busy = false;     // 动画 / AI 思考中，屏蔽我的操作
  let token = 0;        // 重开时作废旧的定时回调

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
  const TAGS = { [R.PIG]: ['猪', ''], [R.SHEEP]: ['羊', 'sheep'], [R.DOUBLER]: ['变', 'dbl'] };

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
    const tag = TAGS[c] ? '<span class="gz-tag ' + TAGS[c][1] + '">' + TAGS[c][0] + '</span>' : '';
    el.innerHTML = '<span class="q q-tl">' + rank + '</span><span class="q q-tr">' + sv + '</span>' +
      '<span class="q q-bl">' + sv + '</span><span class="bigsuit">' + sv + '</span>' + tag;
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

  /* ───── 渲染 ───── */

  function capturedChips(cards) {
    const sc = R.scoreCaptured(cards);
    const chips = [];
    if (sc.pig) chips.push('<span class="gz-chip pig">猪</span>');
    if (sc.sheep) chips.push('<span class="gz-chip sheep">羊</span>');
    if (sc.doubler) chips.push('<span class="gz-chip dbl">变×2</span>');
    if (sc.hearts) chips.push('<span class="gz-chip heart">♥<span class="gz-num">' + sc.hearts + '</span>张</span>');
    if (cards.length) {
      const cls = sc.total < 0 ? 'neg' : sc.total > 0 ? 'pos' : '';
      chips.push('<span class="gz-chip total ' + cls + '"><span class="gz-num">' + signed(sc.total) + '</span></span>');
    }
    return chips.join('');
  }

  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }

  function renderSeats() {
    const r = match.round;
    for (let s = 0; s < 4; s++) {
      const el = els.seats[s];
      const left = r ? r.hands[s].length : 0;
      const backs = s === 0 ? '' : '<span class="gz-backs" aria-hidden="true">' + '<span class="gz-back"></span>'.repeat(Math.min(left, 13)) + '</span>';
      el.innerHTML =
        '<div class="gz-who"><span class="gz-avatar">' + AVATARS[s] + '</span>' +
        '<span class="gz-name-line"><span class="gz-name">' + NAMES[s] + '</span>' +
        '<span class="gz-sub">累计 <span class="gz-num">' + signed(match.totals[s]) + '</span>' + (s === 0 ? '' : ' · 剩 <span class="gz-num">' + left + '</span>') + '</span></span></div>' +
        backs +
        '<div class="gz-caps">' + (r ? capturedChips(r.captured[s]) : '') + '</div>';
      el.classList.toggle('is-turn', !!r && !R.isRoundOver(r) && r.turn === s);
      el.setAttribute('aria-label', NAMES[s]);
    }
    els.roundNo.textContent = '第 ' + match.roundNo + ' 局';
    const lo = Math.min.apply(null, match.totals);
    els.roundSub.textContent = TIER_LABELS[settings.tier] + ' AI · 最低 ' + signed(lo) + ' / −1000';
  }

  /* plays 缺省为当前墩；一墩刚打完时 r.trick 已清空，传入完成的那一墩继续展示 */
  function renderTrick(plays) {
    const r = match.round;
    els.slots.forEach((slot) => { slot.innerHTML = ''; });
    if (!r && !plays) return;
    plays = plays || r.trick;
    if (!plays.length) return;
    const lead = R.suitOf(plays[0].card);
    let top = plays[0];
    for (const p of plays) if (R.suitOf(p.card) === lead && R.rankOf(p.card) > R.rankOf(top.card)) top = p;
    plays.forEach((p, i) => {
      const card = buildCard(p.card);
      if (p === top && plays.length > 1) card.classList.add('is-top');
      if (i === 0) {
        const mark = document.createElement('span');
        mark.className = 'gz-lead-mark';
        mark.textContent = '领出';
        els.slots[p.seat].appendChild(mark);
      }
      els.slots[p.seat].appendChild(card);
    });
  }

  function renderHand() {
    const r = match.round;
    els.hand.innerHTML = '';
    if (!r) return;
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
    hand.forEach((c, i) => {
      if (i > 0 && R.suitOf(c) !== R.suitOf(hand[i - 1])) x += gapW;
      const el = buildCard(c);
      el.style.left = x.toFixed(1) + 'px';
      el.style.zIndex = String(i + 1);
      el.setAttribute('role', 'option');
      el.setAttribute('aria-label', cardName(c));
      const ok = legal.includes(c);
      if (myTurn && !ok) el.classList.add('is-illegal');
      if (c === selected) { el.classList.add('selected'); el.setAttribute('aria-selected', 'true'); }
      el.addEventListener('click', () => onCardTap(c));
      els.hand.appendChild(el);
      x += step;
    });
    els.play.disabled = !(myTurn && selected >= 0 && legal.includes(selected));
  }

  function renderHint() {
    const r = match.round;
    let text = '';
    if (r && !R.isRoundOver(r) && r.turn === 0 && !busy) {
      const lead = R.leadSuitOf(r);
      if (lead < 0) text = r.trickNo === 0 && match.roundNo === 1 ? '你有 ♠2，由你领出' : '轮到你领出';
      else if (r.hands[0].some((c) => R.suitOf(c) === lead)) text = '';
      else text = '没有' + SUIT_NAMES[lead] + '，可以垫任意一张';
    }
    els.hint.textContent = text;
  }

  function renderAll() { renderSeats(); renderTrick(); renderHand(); renderHint(); }

  /* ───── 流程 ───── */

  function startRound() {
    match.roundNo++;
    const rng = R.makeRng((match.seed + match.roundNo * 7919) >>> 0);
    const hands = R.deal(rng);
    const leader = match.nextLeader >= 0 ? match.nextLeader : R.firstLeader(hands);
    match.round = R.createRound(hands, leader);
    selected = -1;
    save();
    renderAll();
    if (match.roundNo > 1) {
      els.hint.textContent = leader === 0 ? '上局你吃了猪，由你先出' : NAMES[leader] + '上局吃了猪，由' + NAMES[leader] + '先出';
    }
    schedule(step, match.roundNo > 1 ? 700 : 300);
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
    if (r.turn === 0 && !AUTO) { busy = false; renderHand(); renderHint(); return; }
    busy = true;
    renderHand();
    const started = performance.now();
    const seat = r.turn;
    chooseAi(r, seat).then((card) => {
      const wait = Math.max(0, PACE.aiMin - (performance.now() - started));
      schedule(() => commit(seat, card), wait);
    });
  }

  function commit(seat, card) {
    const r = match.round;
    const done = R.playCard(r, seat, card);
    if (seat === 0) selected = -1;
    busy = !!done || r.turn !== 0;
    renderTrick(done ? done.plays : null);
    const slotCard = els.slots[seat].querySelector('.gz-card');
    if (slotCard) slotCard.classList.add('in');
    renderSeats();
    renderHand();
    renderHint();
    if (!done) { save(); schedule(step, 60); return; }
    // 一墩完成：停一下让人看清，再收向赢家
    busy = true;
    renderHand();
    els.hint.textContent = '';
    schedule(() => {
      els.center.classList.add('collect', 'collect-' + done.winner);
      schedule(() => {
        els.center.classList.remove('collect', 'collect-0', 'collect-1', 'collect-2', 'collect-3');
        renderTrick();
        renderSeats();
        save();
        step();
      }, PACE.collect);
    }, PACE.trickShow);
  }

  function onCardTap(c) {
    const r = match.round;
    if (busy || !r || R.isRoundOver(r) || r.turn !== 0) return;
    const legal = R.legalFor(r, 0);
    if (!legal.includes(c)) {
      els.hint.textContent = '有' + SUIT_NAMES[R.leadSuitOf(r)] + '必须跟' + SUIT_NAMES[R.leadSuitOf(r)];
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
  function chooseLocal(r, seat) {
    return AI.policyForTier(settings.tier)(r, seat, R.makeRng((Math.random() * 2 ** 31) | 0));
  }
  function chooseAi(r, seat) {
    const w = getWorker();
    if (!w) return Promise.resolve(chooseLocal(r, seat));
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, (card) => resolve(card >= 0 && r.hands[seat].includes(card) ? card : chooseLocal(r, seat)));
      w.postMessage({ id, round: r, seat, tier: settings.tier, seed: (Math.random() * 2 ** 31) | 0 });
    });
  }

  /* ───── 弹窗 ───── */

  function openDialog(html, onMount) {
    els.dialog.innerHTML = html;
    els.mask.hidden = false;
    if (onMount) onMount(els.dialog);
    const first = els.dialog.querySelector('[data-autofocus]') || els.dialog.querySelector('button');
    if (first) first.focus();
  }
  function closeDialog() { els.mask.hidden = true; els.dialog.innerHTML = ''; }

  function howText(cards) {
    const sc = R.scoreCaptured(cards);
    if (!cards.length) return '没吃分牌';
    if (sc.doublerAlone) return '只吃到变压器 +50';
    const parts = [];
    if (sc.hearts) parts.push(sc.allHearts ? '全红 +200' : '红桃 ' + sc.hearts + ' 张 ' + signed(sc.heartScore));
    if (sc.pig) parts.push((sc.grandSlam ? '猪（大满贯变正）' : '猪 ') + signed(sc.pigScore));
    if (sc.sheep) parts.push('羊 +100');
    let s = parts.join('，');
    if (sc.doubler) s = '（' + s + '）× 2 变压器';
    if (sc.grandSlam) s = '大满贯！' + s;
    return s;
  }

  function showSettlement() {
    const last = match.last;
    const loser = match.over ? R.matchLoser(match.totals) : -1;
    const order = [0, 1, 2, 3];
    const rows = order.map((s) => {
      const sc = last.scores[s];
      const tot = match.totals[s];
      return '<tr class="' + (s === 0 ? 'me' : '') + '"><td>' + NAMES[s] + (s === loser ? '<span class="gz-pig-badge">猪</span>' : '') +
        '<span class="how">' + howText(last.captured[s]) + '</span></td>' +
        '<td class="n ' + (sc < 0 ? 'neg' : sc > 0 ? 'pos' : '') + '">' + signed(sc) + '</td>' +
        '<td class="n ' + (tot < 0 ? 'neg' : tot > 0 ? 'pos' : '') + '">' + signed(tot) + '</td></tr>';
    }).join('');
    let title = '第 ' + last.roundNo + ' 局结算';
    let lead = '';
    if (match.over) {
      title = loser === 0 ? '你当了猪' : NAMES[loser] + '当了猪';
      const best = order.slice().sort((a, b) => match.totals[b] - match.totals[a])[0];
      lead = '<p>' + NAMES[loser] + '累计到 ' + signed(match.totals[loser]) + '，本盘结束。' +
        (best === 0 ? '你分数最高，赢了这一盘。' : NAMES[best] + '分数最高。') + '</p>';
    }
    openDialog(
      '<h2>' + title + '</h2>' + lead +
      '<table class="gz-score-table"><thead><tr><th></th><th style="text-align:right">本局</th><th style="text-align:right">累计</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="gz-actions">' +
      (match.over ? '<button type="button" class="gz-btn gz-btn-primary" data-act="again" data-autofocus>再来一盘</button>'
        : '<button type="button" class="gz-btn gz-btn-primary" data-act="next" data-autofocus>下一局</button>') +
      '</div>',
      (d) => {
        d.querySelector('[data-act]').addEventListener('click', (e) => {
          closeDialog();
          if (e.currentTarget.dataset.act === 'again') { token++; newMatch(); }
          startRound();
        });
      }
    );
  }

  function showTotals() {
    if (match.last && !match.round) { showSettlement(); return; }
    const rows = [0, 1, 2, 3].map((s) => '<tr class="' + (s === 0 ? 'me' : '') + '"><td>' + NAMES[s] + '</td><td class="n ' +
      (match.totals[s] < 0 ? 'neg' : match.totals[s] > 0 ? 'pos' : '') + '">' + signed(match.totals[s]) + '</td></tr>').join('');
    openDialog('<h2>累计分</h2><p>打到有人累计 −1000 分，这一盘结束，分最低的人当猪。</p>' +
      '<table class="gz-score-table"><tbody>' + rows + '</tbody></table>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close data-autofocus>好</button></div>',
      (d) => d.querySelector('[data-close]').addEventListener('click', closeDialog));
  }

  function showRules() {
    openDialog(
      '<h2>拱猪规则</h2><dl class="gz-rules">' +
      '<dt>出牌</dt><dd>四人各 13 张。第一局有 ♠2 的人先出，之后由上局吃到猪的人先出。有领出的花色就必须跟，没有可以垫任意一张。领出花色里最大的牌吃下这一墩，下一墩由他先出。</dd>' +
      '<dt>分牌</dt><dd>猪 ♠Q −100；羊 ♦J +100。红桃 A −50、K −40、Q −30、J −20、10 到 5 各 −10、4 3 2 不扣分，13 张合计 −200。</dd>' +
      '<dt>变压器 ♣10</dt><dd>吃到它，你这一局的分数（不论正负）翻倍；只吃到它一张、别的分牌都没吃到，算 +50。</dd>' +
      '<dt>全红</dt><dd>一个人吃齐 13 张红桃，红桃改记 +200。再吃齐猪、羊、变压器就是大满贯，猪也变正，共 +800。</dd>' +
      '<dt>一盘</dt><dd>有人累计到 −1000 分，这一盘结束，他就是猪。</dd>' +
      '</dl><div class="gz-actions"><button type="button" class="gz-btn" data-close data-autofocus>知道了</button></div>',
      (d) => d.querySelector('[data-close]').addEventListener('click', closeDialog));
  }

  function showSettings() {
    const seg = Object.keys(TIER_LABELS).map((k) => '<button type="button" data-tier="' + k + '" aria-pressed="' + (settings.tier === k) + '">' + TIER_LABELS[k] + '</button>').join('');
    openDialog(
      '<h2>设置</h2><div class="gz-field-label">AI 水平</div><div class="gz-seg" role="group">' + seg + '</div>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="restart">重开一盘</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => {
          settings.tier = b.dataset.tier;
          writeJSON(SETTINGS_KEY, settings);
          d.querySelectorAll('[data-tier]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          renderSeats();
        }));
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="restart"]').addEventListener('click', () => {
          if (!confirm('放弃这一盘，从 0 分重新开始？')) return;
          closeDialog(); token++; busy = false; newMatch(); startRound();
        });
      });
  }

  /* ───── 启动 ───── */

  els.play.addEventListener('click', playSelected);
  $('gzRulesBtn').addEventListener('click', showRules);
  $('gzSettingsBtn').addEventListener('click', showSettings);
  $('gzRoundInfo').addEventListener('click', showTotals);
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
