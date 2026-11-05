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

  const SOLO_NAMES = ['我', '下家', '对家', '上家'];
  const SOLO_AVATARS = ['我', '下', '对', '上'];
  let NAMES = SOLO_NAMES.slice();       // 联机时换成三家的昵称（我永远在下方）
  let AVATARS = SOLO_AVATARS.slice();
  const TIER_LABELS = { easy: '入门', normal: '普通', hard: '高手' };
  const TIER_ORDER = ['easy', 'normal', 'hard'];
  const TURN_SEC_OPTS = { 20: '20 秒', 0: '不限时' };
  const HURRY_MS = 5000;   // 最后 5 秒头像开始跳
  const SUIT_NAMES = ['黑桃', '红桃', '方块', '梅花'];

  // trickShow：一墩打满停多久；fly：分牌飞进吃牌区；fade：没分的牌就地淡出
  // roundEnd：最后一张分牌落进吃牌区后，等本局分数完（最长约 0.9 秒）再结这一局
  const PACE = { aiMin: 520, trickShow: 600, fly: 420, fade: 260, roundEnd: 1000 };
  // 本机调试：?gzauto=1 让「我」也由 AI 代打并加速，用来一口气验到结算 / 一盘结束
  const AUTO = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('gzauto') === '1';
  if (AUTO) Object.assign(PACE, { aiMin: 30, trickShow: 120, fly: 200, fade: 120, roundEnd: 60 });
  const SETTLE_HOLD = AUTO ? 60 : 1700;   // 累计分在桌上数完（最长约 0.9 秒）后再停一会儿，才弹结算页
  // 教程放慢：机器人出牌、收墩都留足时间看清
  const TUT_PACE = { aiMin: 950, trickShow: 1100, fly: 520, fade: 320, roundEnd: 1000 };
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

  /* ───── 声音（见 gongzhu-audio.js）：没加载上就静悄悄地打 ───── */
  const snd = (name, delay, arg) => { if (window.GongzhuAudio) window.GongzhuAudio.sfx(name, delay, arg); };
  // 轮到我：同一手只响一次（联机里一份快照会反复触发 onlineIdle）
  let turnDing = '';
  function dingMyTurn() {
    const r = match.round;
    const key = match.roundNo + ':' + (r ? r.trickNo * 4 + r.trick.length : -1) + ':' + (match.exposing.length ? 'x' : 'p');
    if (key === turnDing) return;
    turnDing = key;
    snd('turn');
  }

  /* 声音按钮：点开一个小面板，音效 / 背景音乐各一个开关（记在本机） */
  const SOUND_TRACKS = [['sfx', '音效'], ['music', '背景音乐']];
  let soundPanel = null;
  function refreshSoundBtn() {
    const A = window.GongzhuAudio, btn = $('gzSoundBtn');
    if (!btn) return;
    if (!A) { btn.hidden = true; return; }
    const p = A.prefs(), off = !p.sfx && !p.music;
    btn.classList.toggle('is-off', off);
    btn.setAttribute('aria-label', '声音' + (off ? '（已关）' : ''));
    btn.setAttribute('aria-expanded', soundPanel && !soundPanel.hidden ? 'true' : 'false');
  }
  function toggleSoundPanel(e) {
    const A = window.GongzhuAudio;
    if (!A) return;
    if (e) e.stopPropagation();
    if (!soundPanel) {
      soundPanel = document.createElement('div');
      soundPanel.className = 'gz-sound-panel';
      soundPanel.setAttribute('role', 'group');
      soundPanel.setAttribute('aria-label', '声音');
      soundPanel.hidden = true;
      soundPanel.innerHTML = SOUND_TRACKS.map(([k, t]) => '<label class="gz-sound-row"><input type="checkbox" data-track="' + k + '"><span>' + t + '</span></label>').join('');
      soundPanel.addEventListener('change', (ev) => { const k = ev.target.dataset.track; if (k) { A.set(k, ev.target.checked); refreshSoundBtn(); } });
      soundPanel.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { soundPanel.hidden = true; refreshSoundBtn(); $('gzSoundBtn').focus(); } });
      document.addEventListener('click', (ev) => {
        if (!soundPanel.hidden && !ev.target.closest('.gz-sound-panel, #gzSoundBtn')) { soundPanel.hidden = true; refreshSoundBtn(); }
      });
      els.app.appendChild(soundPanel);
    }
    soundPanel.hidden = !soundPanel.hidden;
    if (!soundPanel.hidden) {
      const p = A.prefs();
      soundPanel.querySelectorAll('input').forEach((box) => { box.checked = !!p[box.dataset.track]; });
      const r = $('gzSoundBtn').getBoundingClientRect();
      soundPanel.style.top = Math.round(r.bottom + 8) + 'px';
      soundPanel.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - 168, r.left + r.width / 2 - 80))) + 'px';
    }
    refreshSoundBtn();
  }

  function faceHtml(v) {
    const s = String(v || '');
    return s.startsWith('svg:') && window.GongzhuAvatars ? GongzhuAvatars.svg(s.slice(4)) : esc(s);
  }

  /* ───── 存档 ───── */

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式等：不存也能玩 */ } }

  const settings = Object.assign({ tier: 'normal', turnSec: 20 }, readJSON(SETTINGS_KEY) || {});
  settings.rules = R.normalizeRules(settings.rules);

  let match = null;     // { rules, totals, roundNo, pigTaker, seed, round, exposing, last, over }
  let selected = -1;
  let exposePick = [];  // 明牌环节里我点选要明的牌
  let exposeHeld = [];  // 我已经点了「明牌」、还在等别家决定（或等服务器）的那几张：这期间照样按明牌的样子画
  let busy = false;     // 动画 / AI 思考中，屏蔽我的操作
  let token = 0;        // 重开时作废旧的定时回调
  let autopilot = false;  // 托管：连续两次超时自动打开，点手牌 / 头像取消
  let timeouts = 0;       // 连续超时次数，我自己出一张就清零

  function newMatch() {
    // 规则在开盘时定下，中途改设置从下一盘起生效
    match = { rules: R.normalizeRules(settings.rules), totals: [0, 0, 0, 0], roundNo: 0, pigTaker: -1, seed: (Math.random() * 2 ** 31) | 0, round: null, exposing: [], last: null, over: false };
  }
  function save() { if (!match.tutorial && !match.online && !match.demo) writeJSON(STORE_KEY, { v: VERSION, match }); }

  /* ───── 卡面（四象限，参数逐字取自掼蛋 / 斗地主定稿） ───── */

  const SVG_SUITS = {
    1: { t: 'translate(500 500) scale(0.80349) translate(-715.0 -1473.5)', d: 'M714 2046 658 1955Q540 1762 352 1581Q241 1473 196.5 1387.0Q152 1301 152 1195Q152 1075 235.0 988.0Q318 901 432 901Q590 901 716 1141Q850 906 1009 906Q1125 906 1201.5 992.0Q1278 1078 1278 1210Q1278 1299 1241.5 1387.5Q1205 1476 1146 1528L1067 1599Q960 1696 857 1848L803 1928Q790 1947 714 2046Z' },
    2: { t: 'translate(500 500) scale(0.80349) translate(-616.0 -1475.5)', d: 'M1057 1475 617 2044 175 1479 616 907Z' },
  };
  /* ♠ ♣ 以前是文字字符：苹果上用 Apple Symbols 画，安卓上却会变成 emoji。这里把 Apple Symbols 的原字形（2048 单位一个字宽）
   * 直接画成矢量，并按文字排版的同一套几何摆放：宽 = 字的步进宽度，高 1em，基线落在 line-height:1 时文字基线的位置
   * （(2048 − 上伸 1365 − 下伸 512) / 2 + 1365 = 1450.5）。在苹果上与原来的文字逐像素重合，在任何系统上都长一个样。 */
  const GLYPH_SUITS = {
    0: { adv: 1248, d: 'M679 -334 652 -335Q652 -199 664 -133.5Q676 -68 713 1H534Q572 -42 588 -102.5Q604 -163 604 -266L606 -333H574Q548 -260 492.5 -211.5Q437 -163 380 -163Q295 -163 233 -235Q171 -307 171 -406Q171 -545 306 -704Q326 -729 361 -773Q401 -821 416 -839Q548 -1000 619 -1142Q649 -1095 659 -1080L717 -997L786 -898Q844 -817 908 -745Q1082 -553 1082 -407Q1082 -309 1022.5 -238Q963 -167 881 -167Q810 -167 763.5 -205.5Q717 -244 679 -334Z' },
    3: { adv: 1420, d: 'M789 0 615 1Q660 -71 674.5 -134Q689 -197 689 -322Q629 -225 570.5 -185Q512 -145 431 -145Q327 -145 254 -218Q181 -291 181 -396Q181 -513 268 -586Q355 -659 494 -659L552 -658Q461 -793 461 -894Q461 -998 534.5 -1071Q608 -1144 713 -1144Q820 -1144 894.5 -1070.5Q969 -997 969 -891Q969 -795 867 -658Q919 -661 936 -661Q1067 -661 1152 -587Q1237 -513 1237 -399Q1237 -297 1162 -220Q1087 -143 988 -143Q903 -143 843 -185.5Q783 -228 728 -328Q728 -205 739.5 -143Q751 -81 789 0Z' },
  };
  function suitSVG(suit) {
    const g = GLYPH_SUITS[suit];
    if (g) return '<svg class="suit-svg" style="width:' + (g.adv / 2048).toFixed(4) + 'em" viewBox="0 -1450.5 ' + g.adv + ' 2048" aria-hidden="true"><path d="' + g.d + '"/></svg>';
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
    el.className = 'gz-card ' + (suit === 1 || suit === 2 ? 'suit-red' : 'suit-black') + (rank === 'J' ? ' rank-j' : '') + (R.isHeart(c) ? ' is-heart' : '');
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
    // 特色牌面：猪 / 羊画成动画里那只，变压器写「×2」（颜色跟着持有人这一局的分数走）；角上的 Q♠ / J♦ / 10♣ 不变。
    // 明出来（.is-exposed）：猪淡红底、羊淡金底，变压器写 ×4——见 gongzhu.css「明牌牌面」。
    // 默认就是画的（教程里也一样）；设置里可以换回普通牌面
    if ((c === R.PIG || c === R.SHEEP || c === R.DOUBLER) && settings.artFaces !== false) {
      el.classList.add('has-art');
      const f = document.createElement('span');
      f.className = 'gz-face';
      f.innerHTML = c === R.PIG ? ART.pig : c === R.SHEEP ? ART.sheep : DOUBLER_FACE;
      el.appendChild(f);
    } else if (c === R.HEART_ACE && settings.artFaces !== false) {
      // ♥A 平时就是普通牌面；明出来（红桃全部翻倍）时换成一颗写着 ×2 的大红心（CSS 切换）
      el.classList.add('has-ha');
      const f = document.createElement('span');
      f.className = 'gz-face gz-face-ha';
      f.innerHTML = HEART_ACE_FACE;
      el.appendChild(f);
    }
    return el;
  }
  const HEART_ACE_FACE = '<svg viewBox="0 0 100 92" aria-hidden="true">' +
    '<path d="M50 89C20 67 3 51 3 30 3 15 15 4 29 4c9 0 16 5 21 13 5-8 12-13 21-13 14 0 26 11 26 26 0 21-17 37-47 59Z" fill="#b4392c"/>' +
    '<path d="M50 89C20 67 3 51 3 30 3 15 15 4 29 4c9 0 16 5 21 13 5-8 12-13 21-13 14 0 26 11 26 26 0 21-17 37-47 59Z" fill="none" stroke="#e9c97a" stroke-width="3" transform="translate(9 7.5) scale(.82)"/>' +
    '<text x="50" y="55" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="34" fill="#fbefe4">×2</text></svg>';
  const DOUBLER_FACE = '<svg class="gz-dbl" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" stroke-width="5"/>' +
    '<circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".55"/>' +
    '<text class="x2" x="50" y="64" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="40" fill="currentColor">×2</text>' +
    '<text class="x4" x="50" y="64" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="40" fill="currentColor">×4</text></svg>';   // 明出来的变压器显示 ×4（CSS 切换）
  // 变压器的颜色：持有人这一局（不算变压器）的分数为正金色、为负灰色、零分藏蓝——和 ×2 动画同一套
  function dblTone(cards, ctx) {
    const v = R.scoreCaptured(cards.filter((x) => x !== R.DOUBLER), ctx).total;
    return v > 0 ? 'gold' : v < 0 ? 'ash' : 'navy';
  }

  /* 明出来的牌（见 gongzhu.css「明牌牌面」） */
  function isExposedCard(c) { const r = match && match.round; return !!r && R.exposedOwner(r, c) >= 0; }

  /* ───── 尺寸：只算 --u ───── */

  // 正在输入（昵称 / 房号）：手机键盘弹起会把窗口压矮，这时不量——否则会误弹「把手机横过来」盖住输入框
  function typing() {
    const a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  }
  function solveSize() {
    if (typing()) return;
    const w = els.table.clientWidth - 20;
    const h = window.innerHeight;
    const portrait = h > window.innerWidth;
    // 竖屏手牌叠得紧一点，换更大的牌面
    const byW = w / (12 * (portrait ? 0.5 : 0.6) + 1 + 0.5);
    const byH = portrait ? h / 8.4 : h / 6.6;
    let u = Math.max(38, Math.min(78, byW, byH));
    els.app.style.setProperty('--u', u.toFixed(1) + 'px');
    // 按公式算出来还放不下（各种奇怪的窗口比例）：牌面一档档缩小再试；缩到底还放不下，就请对方转屏 / 调窗口
    for (let k = 0; k < 16 && !tableFits() && u > 30; k++) {
      u = Math.max(30, u * 0.93);
      els.app.style.setProperty('--u', u.toFixed(1) + 'px');
    }
    showFitHint(!tableFits());
  }
  function tableFits() {
    const t = els.table;
    if (t.scrollHeight > t.clientHeight + 2 || t.scrollWidth > t.clientWidth + 2) return false;
    if (window.innerWidth < 300 || window.innerHeight < 260) return false;
    // 中间出牌区至少要竖着放得下两张牌（我和对家的出牌）、横着放得下三张
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 56;
    const c = els.center.getBoundingClientRect();
    return c.height >= u * 1.44 * 2 && c.width >= u * 3.4;
  }
  // 放不下时盖一层提示（不硬挤着显示），计时也先停住；放得下了自动收起
  function showFitHint(on) {
    const el = $('gzFit');
    if (!el || el.hidden === !on) return;
    el.hidden = !on;
    if (on) {
      const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const wide = window.innerWidth > window.innerHeight;
      el.querySelector('.gz-fit-text').textContent = wide
        ? (touch ? '屏幕太矮，放不下牌桌。把手机竖过来试试。' : '窗口太矮了，放不下牌桌。把窗口拉高一些。')
        : (touch ? '屏幕太窄，放不下牌桌。把手机横过来试试。' : '窗口太窄了，放不下牌桌。把窗口拉宽一些。');
      el.classList.toggle('to-portrait', wide);
      if (match) pauseClock();
    } else if (match && els.mask.hidden) resumeClock();
  }

  /* ───── 吃牌区：真牌面小牌，固定顺序 变压器 · 猪 · 羊 · 红桃扇，末尾是本局分 ─────
   * 顺序固定、不随吃进先后变：一眼能比较四家。变压器打头，像算式前面的系数「2 ×」；
   * 红桃扇放最后，张数再多也只往后长，前面几张的位置不动。
   * 红桃按点数叠成扇形，只露左上角；吃齐 13 张（全红 / 大满贯）本局分变金色。 */

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
    // 本局分紧跟在牌后面：牌让开空位时它也跟着一起滑（和最后一张牌的距离不变），新牌插好之后才翻数
    const score0 = slide ? row.querySelector('.gz-cap-score') : null;
    const scoreBefore = score0 ? score0.getBoundingClientRect() : null;

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
      fan.querySelectorAll('.gz-fan-br').forEach((x) => x.remove());   // 两行红桃的断行点：先拿掉，fitFan 再按需要放
      // 全红也照样一张张排开（放不下时由 fitFan 换行 / 拆两行，不收成一叠：用户要看得见 13 张）
      const hs = cards.filter(R.isHeart).sort((a, b) => a - b).map(mini);
      hs.forEach((el, k) => { if (fan.children[k] !== el) fan.insertBefore(el, fan.children[k] || null); });
      while (fan.children.length > hs.length) fan.lastChild.remove();
      want.push(fan);
    } else if (fan) { fan.remove(); fan = null; }
    let score = row.querySelector('.gz-cap-score');
    const fresh = !score;
    if (!score) { score = document.createElement('span'); score.className = 'gz-cap-score gz-num'; }
    score.dataset.gold = sc.allHearts || sc.grandSlam ? '1' : '';   // 全红 / 大满贯：分数翻完变金色（不再给牌描金框）
    if (hidden.size && !fresh) score.dataset.next = sc.total;          // 牌在飞：旧分先留着，落地再翻
    else if (fresh && hidden.size) { score.dataset.next = sc.total; score.textContent = ''; score.dataset.v = ''; }
    else rollNumber(score, sc.total);
    want.push(score);
    want.forEach((el, k) => { if (row.children[k] !== el) row.insertBefore(el, row.children[k] || null); });
    for (const el of old.values()) el.remove();   // 新的一局：清掉上局的
    while (row.children.length > want.length) row.lastChild.remove();
    fitFan(box, row, fan);

    if (!slide) return;
    const dur = pace().fly;
    if (scoreBefore && score === score0 && score.isConnected) {
      const b = score.getBoundingClientRect();
      const dx = scoreBefore.left - b.left, dy = scoreBefore.top - b.top;
      // 用独立的 translate 属性，不跟数字翻动时的 transform: scale 打架
      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
        score.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0px 0px' }], { duration: dur, easing: 'cubic-bezier(.45, 0, .3, 1)' });
      }
    }
    if (!before.size) return;
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
  /* 座位窄（左右两家；竖屏时顶上三家）的吃牌区留了两排高：红桃挤得看不清（每张露不到 30%）就整扇挪到第二排，
   * 第二排独占整行宽度。换排不改吃牌区高度，不挤动布局。
   * 我自己那排（出牌键在正中）：挤了就挪到更宽的地方——竖屏整排吃牌区另起一行、占满整宽；
   * 横屏没有多余的高度，就把红桃扇连同本局分挪到出牌键右边那半边（变压器 / 猪 / 羊留在头像旁）。 */
  function fitFan(box, row, fan) {
    row.classList.remove('is-wrapped', 'score-down');
    box.classList.remove('is-tall');
    const mine = box.parentElement === els.seats[0];
    if (mine) {
      els.table.classList.remove('is-me-spill');
      if (fan) fan.style.marginLeft = '';
    }
    const cs = getComputedStyle(box);
    const rows = parseInt(cs.getPropertyValue('--caps-rows'), 10) || 1;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const score = row.querySelector('.gz-cap-score');
    // 量宽度要连外边距（本局分左边有 3px）
    const outer = (el) => { const st = getComputedStyle(el); return el.getBoundingClientRect().width + (parseFloat(st.marginLeft) || 0) + (parseFloat(st.marginRight) || 0); };
    const scoreW = score ? outer(score) : 0;
    // 第一行（变压器 / 猪 / 羊 + 本局分）有多宽
    let specW = 0, specN = 0;
    for (const el of row.children) if (el !== fan && el !== score) { specW += outer(el); specN++; }
    const line1W = specW + scoreW + gap * Math.max(0, specN + (score ? 1 : 0) - 1);
    const W = box.clientWidth - 10;   // 留出行内边距和小牌的影子
    if (!fan) {
      // 没有红桃，但三张特殊牌 + 本局分一行放不下：窄座位把分挪到第二行；我自己那排（竖屏）整排另起一行
      if (line1W > W && mine) els.table.classList.add('is-me-spill');
      else if (rows > 1 && score && line1W > W) row.classList.add('is-wrapped', 'score-down');
      return;
    }
    // --m 是 clamp() 表达式，parseFloat 读不出来：直接量一张小牌的实际宽度
    const first = fan.querySelector('.gz-mini');
    const m = (first && first.getBoundingClientRect().width) || 28;
    fan.querySelectorAll('.gz-fan-br').forEach((x) => x.remove());
    const n = fan.children.length;
    let split = false;
    const fanAvail = () => {
      let others = 0;
      for (const el of row.children) if (el !== fan) others += outer(el);
      return box.clientWidth - others - gap * (row.children.length - 1) - 10;
    };
    const tight = (w) => (n > 1 ? (w - m) / (n - 1) < m * 0.44 : w < m);
    let avail = fanAvail();
    if (mine && tight(avail)) {
      els.table.classList.add('is-me-spill');
      if (getComputedStyle(els.seats[0]).display === 'grid') avail = fanAvail();   // 竖屏：另起一行，宽度变成整排
      else {
        const band = els.play.parentElement.getBoundingClientRect();
        const start = band.right + 12;
        fan.style.marginLeft = Math.max(0, start - fan.getBoundingClientRect().left) + 'px';
        const score = row.querySelector('.gz-cap-score');
        avail = box.getBoundingClientRect().right - start - (score ? score.getBoundingClientRect().width + gap : 0) - 6;
      }
    } else if (rows > 1 && tight(avail)) {
      row.classList.add('is-wrapped');
      avail = W;
      // 第一行连本局分也放不下：分跟到第二行、排在红桃后面
      if (score && line1W > W) { row.classList.add('score-down'); avail = W - outer(score) - gap; }   // 挪下来的分字号小一点，重新量
      // 第二行还是挤（每张露不到 32%）：红桃再拆成上下两行（吃牌区临时长高一行）
      if (n >= 6 && (avail - m) / (n - 1) < m * 0.32) {
        const k = Math.ceil(n / 2);
        split = true;
        const st = Math.max(m * 0.16, Math.min(m * 0.44, (avail - 4 - m) / (k - 1)));   // −4：扇子宽度里那 4px（见下）
        const br = document.createElement('i');
        br.className = 'gz-fan-br';
        fan.insertBefore(br, fan.children[k]);
        fan.style.width = (m + (k - 1) * st + 4).toFixed(1) + 'px';   // 扇子自身左右各 1px 内边距（border-box），再留 2px 舍入余量，否则第一行最后一张会被挤到第三行
        fan.style.setProperty('--fanstep', st.toFixed(1) + 'px');
      }
    }
    box.classList.toggle('is-tall', split);
    fan.classList.toggle('is-split', split);
    if (split) return;
    fan.style.width = '';
    const step = n > 1 ? Math.max(m * 0.16, Math.min(m * 0.44, (avail - m) / (n - 1))) : 0;
    fan.style.setProperty('--fanstep', step.toFixed(1) + 'px');
  }

  // 红桃扇是不是被挤得露不到 44%（看不清点数）了
  function fanSqueezed(box) {
    const fan = box.querySelector('.gz-fan');
    const first = fan && fan.querySelector('.gz-mini');
    if (!first || fan.children.length < 2) return false;
    const step = parseFloat(fan.style.getPropertyValue('--fanstep')) || 0;
    return step < first.getBoundingClientRect().width * 0.44 - 0.5;
  }

  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }

  /* 分数变化：从旧值一路数到新值（变化越大数得越久，最长约 0.9 秒），数的时候数字放大、涨分闪墨绿扣分闪朱红，数完回原样。
   * 用 setInterval 而不是 rAF：后台页也能数到终点。 */
  function rollNumber(el, n) {
    const prev = el.dataset.v;
    el.dataset.v = n;
    clearInterval(el._roll);
    const settle = () => {
      el.textContent = signed(n);
      el.classList.toggle('neg', n < 0);
      el.classList.toggle('pos', n > 0 && el.classList.contains('gz-cap-score'));
      el.classList.toggle('is-gold', el.dataset.gold === '1');
      el.classList.remove('is-rolling', 'up', 'down');
    };
    if (prev === undefined || prev === '' || +prev === n || reduceMotion()) { settle(); return; }
    const from = +prev, dur = Math.min(900, 320 + Math.abs(n - from) * 3);
    const t0 = performance.now();
    el.classList.add('is-rolling', n > from ? 'up' : 'down');
    el._roll = setInterval(() => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      if (t >= 1) { clearInterval(el._roll); settle(); return; }
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = signed(Math.round(from + (n - from) * e));
    }, 30);
  }

  /* ───── 座位：结构只建一次，之后只更新内容（飞牌动画要拿稳定的落点） ───── */

  // 头像外圈的倒计时环：轮到谁谁亮，环随时间收走
  const CLOCK_SVG = '<svg class="gz-clock" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" pathLength="100"/></svg>';

  function buildSeats() {
    els.seats.forEach((el, s) => {
      el.innerHTML =
        '<div class="gz-who"><span class="gz-avatar"><span class="gz-av-face" data-v="' + esc(AVATARS[s]) + '">' + faceHtml(AVATARS[s]) + '</span>' + CLOCK_SVG + '</span>' +
        '<span class="gz-name-line"><span class="gz-name">' + esc(NAMES[s]) + '</span><span class="gz-total gz-num"></span></span></div>' +
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
    const tone = r ? dblTone(r.captured[s], R.scoreCtx(r)) : 'navy';
    el.dataset.dbl = tone;
    els.slots[s].dataset.dbl = tone;
    if (s === 0) els.hand.dataset.dbl = tone;
    const caps = r ? r.captured[s].filter((c) => !flying || !flying.has(c)) : [];
    renderCaps(el.querySelector('.gz-caps'), caps, incoming, null, slide);
    el.classList.toggle('is-turn', turnSeat() === s);
  }

  /* 现在轮到谁：亮牌环节是正在决定亮不亮的人，打牌时是该出牌的人 */
  function turnSeat() {
    const r = match.round;
    if (!r || R.isRoundOver(r)) return -1;
    // 亮牌阶段：只有我自己（手里有可亮牌、还没决定时）亮起，别家一律不显示
    if (match.exposing.length) return match.exposing.includes(0) && !busy ? 0 : -1;
    return r.turn;
  }
  function exposingMe() { return !!(match.round && match.exposing.includes(0)); }

  /* 明了 ♥A（这一局红桃全部翻倍）：牌桌上所有红桃都垫一层淡红底（见 gongzhu.css「明牌牌面」）。
   * 打牌时看这一局的明牌；一局结束、结算页还开着时看刚结束那局的。 */
  function syncHeartsX2() {
    const r = match && match.round;
    const ex = r ? r.exposed.map((e) => e[0]) : (match && match.last && match.last.ctx && match.last.ctx.exposed) || [];
    els.app.classList.toggle('is-hx2', ex.includes(R.HEART_ACE));
  }

  function renderSeats() {
    syncHeartsX2();
    for (let s = 0; s < 4; s++) renderSeat(s);
    if (match.online && match.lobby) return;
    els.roundNo.textContent = match.tutorial ? '新手教程' : '第 ' + match.roundNo + (match.rules.end === 'rounds10' ? ' / 10' : '') + ' 局';
  }

  /* 这一轮打什么花色：首家出牌后，桌子正中淡淡浮出一个大花色（压在牌下面），一轮结束放特效 / 收牌前就淡掉，
   * 不跟着牌一起收走——它不是牌，收进头像反倒像被谁吃了。 */
  // 四种花色字形的「墨量」差得很多（同字号下 ♥ 的面积约是 ♠ 的 3.9 倍，♦ 2.4 倍，♣ 1.2 倍），重心也高低不一：
  // 按实测墨量把面积拉齐、按墨的重心挪回正中——四个花色看起来一样大、都在桌子正中。[缩放, 下移 em]
  const LEAD_FIT = { 0: [1.3, 0.068], 1: [0.664, 0.067], 2: [0.836, 0.002], 3: [1.185, 0.072] };
  function showLead(suit) {
    let el = els.center.querySelector('.gz-lead');
    if (!el) { el = document.createElement('div'); el.className = 'gz-lead'; el.setAttribute('aria-hidden', 'true'); els.center.prepend(el); }
    if (suit < 0) { el.classList.remove('on'); return; }
    if (el.dataset.suit !== String(suit)) {
      // 换花色：先瞬间藏起来再浮出，不让上一轮的花色变形成这一轮的
      el.classList.remove('on');
      el.dataset.suit = suit;
      el.classList.toggle('red', suit === 1 || suit === 2);
      el.innerHTML = suitSVG(suit);
      el.style.setProperty('--ls', LEAD_FIT[suit][0]);
      el.style.setProperty('--ldy', LEAD_FIT[suit][1] + 'em');
      void el.offsetWidth;
    }
    el.classList.add('on');
  }

  /* plays 缺省为当前墩；一墩刚打完时 r.trick 已清空，传入完成的那一墩继续展示 */
  function renderTrick(plays, enteringSeat) {
    const r = match.round;
    els.slots.forEach((slot) => { slot.innerHTML = ''; });
    plays = plays || (r ? r.trick : []);
    showLead(plays.length ? R.suitOf(plays[0].card) : -1);
    if (!plays.length) return;
    const lead = R.suitOf(plays[0].card);
    let top = plays[0];
    for (const p of plays) if (R.suitOf(p.card) === lead && R.rankOf(p.card) > R.rankOf(top.card)) top = p;
    plays.forEach((p) => {
      const card = buildCard(p.card);
      if (isExposedCard(p.card)) card.classList.add('is-exposed');   // 明出来的牌打到桌上也还是明牌的样子（变压器 ×4）
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
      if (isExposedCard(c) || (exposing && exposePick.includes(c)) || exposeHeld.includes(c)) el.classList.add('is-exposed');
      if (c === suggestCard && myTurn) el.classList.add('is-suggest');
      if (exposing ? exposePick.includes(c) : c === selected) { el.classList.add('selected'); el.setAttribute('aria-selected', 'true'); }
      el.addEventListener('click', () => onCardTap(c, el));
      els.hand.appendChild(el);
      x += step;
    });
    if (exposing) { els.play.disabled = false; els.play.textContent = exposePick.length ? '明牌' : '不明牌'; return; }
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
    // 亮牌：手里有可亮牌的人同时决定，最后一起亮出（不再一家一家轮着问——谁头上转倒计时就等于告诉大家他有特殊牌）
    match.exposing = match.rules.expose
      ? [0, 1, 2, 3].filter((s) => R.EXPOSABLE.some((c) => hands[s].includes(c)))
      : [];
    selected = -1;
    exposePick = [];
    exposeHeld = [];
    save();
    renderAll();
    snd('deal');
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
    if (match && match.online) { onlineStep(); return; }   // 联机：不跑 AI，按服务器发来的事件一条条播
    const r = match.round;
    if (!r) return;
    if (R.isRoundOver(r)) { schedule(finishRound, pace().roundEnd); return; }
    if (match.tutorial) { tutStep(); return; }
    if (match.exposing.length) { exposeStep(); return; }
    renderSeats();
    if (r.turn === 0 && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyTimeout); dingMyTurn(); return; }
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

  /* 机器人在后台同时想好（谁也看不到谁在想），我有可亮牌就等我选，选完一起亮出。
   * 这样亮牌阶段的长短、谁头上有倒计时，都跟别家手里有没有特殊牌无关。 */
  let exposeWait = null;   // { bots: Promise<[seat, cards][]> }
  function exposeStep() {
    const r = match.round;
    const bots = match.exposing.filter((s) => s !== 0);
    exposeWait = { bots: Promise.all(bots.map((s) => chooseExpose(r, s, seatTier(s)).then((cards) => [s, cards]))) };
    const meIn = match.exposing.includes(0);
    renderSeats();
    if (meIn && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyExposeTimeout); dingMyTurn(); return; }
    busy = true;
    renderHand();
    if (meIn) chooseExpose(r, 0, takeoverTier(botTiers())).then(guard((cards) => applyExpose(0, cards)));
    else finishExpose([]);
  }

  // 我选好了（或超时由机器人替我选）
  function applyExpose(seat, cards) {
    stopClock();
    busy = true;
    exposePick = [];
    if (seat === 0) exposeHeld = cards.slice();
    renderSeats();
    renderHand();
    finishExpose(cards);
  }

  function finishExpose(mine) {
    const w = exposeWait;
    if (!w) return;
    w.bots.then(guard((list) => {
      if (exposeWait !== w) return;
      const r = match.round;
      const all = list.concat([[0, mine]]);
      for (let d = 0; d < 4; d++) {
        const s = (r.leader + d) % 4;
        const e = all.find((x) => x[0] === s);
        if (e) for (const c of e[1]) if (r.hands[s].includes(c)) R.expose(r, s, c);
      }
      match.exposing = [];
      exposeWait = null;
      exposeHeld = [];
      renderSeats();
      renderHand();
      r.exposed.forEach((_, i) => snd('stamp', i * 160));
      save();
      schedule(step, r.exposed.length ? 700 : 120);
    }));
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
    snd('play');
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
    // 教程：牌还在桌上时先讲这一轮（桌上的牌调暗，讲解里把四家的牌排出来），讲完再收牌结算，结算后再讲分数
    const talk = match.tutorial ? tut.coach.afterTrick(done, r) : { before: [], after: [] };
    const settle = () => {
      showLead(-1);
      // 先在桌子中间放完猪 / 羊 / 变压器等特效（四张牌还在桌上、调暗），再把四张牌一起收走、分牌放进吃牌区
      const fxMs = playTrickFx(done, planTrickFx(done));
      if (fxMs) els.center.classList.add('is-fxing');
      schedule(() => {
        els.center.classList.remove('is-fxing');
        const ms = flyTrick(done.plays, done.winner);
        schedule(() => {
          save();
          if (match.tutorial) coachSay(talk.after, step);
          else step();
        }, ms + 40);
      }, fxMs ? Math.max(0, fxMs - 150) : 0);
    };
    schedule(() => {
      if (!talk.before.length) { settle(); return; }
      els.center.classList.add('is-review');
      coachSay(talk.before, () => { els.center.classList.remove('is-review'); settle(); });
    }, pace().trickShow);
  }

  /* 一轮结束（猪 / 羊 / 变压器等特效已经先在桌子中间放完）：
   * ① 收：四张牌先往赢的那张牌那边一拢，再一起滑进赢家的头像，头像「咽」一下——一眼看清谁赢、下一轮谁先出；
   * ② 放：赢家吃牌区给新来的分牌让出空位（后面的牌和本局分一起滑开），分牌从头像那边出来、
   *    先到空位正上方，再从上往下放进去；全部放好才翻分。返回总时长。 */
  function flyTrick(plays, winner) {
    const seatEl = els.seats[winner];
    const caps = seatEl.querySelector('.gz-caps');
    const fresh = plays.map((p) => p.card).filter(R.isScoring);
    const reduce = reduceMotion();
    const avatar = seatEl.querySelector('.gz-avatar');
    const av = avatar.getBoundingClientRect();
    const ws = els.slots[winner].getBoundingClientRect();
    const GATHER = 0.55;   // 往赢牌那边拢多少（0 不动，1 叠到赢牌上）
    const sweepMs = reduce ? 1 : Math.round(pace().fly * 1.6);
    const flyers = [];
    plays.forEach((p) => {
      const slot = els.slots[p.seat];
      if (!slot.querySelector('.gz-card')) return;
      const a = slot.getBoundingClientRect();
      const fl = buildCard(p.card);
      fl.classList.add('gz-flyer');
      if (isExposedCard(p.card)) fl.classList.add('is-exposed');
      fl.style.cssText += ';left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;--q:' + a.width + 'px';
      els.app.appendChild(fl);
      flyers.push({ fl, a });
    });
    els.slots.forEach((slot) => { slot.innerHTML = ''; slot.classList.remove('is-ace'); });
    for (const { fl, a } of flyers) {
      const dx = av.left + av.width / 2 - a.left - a.width / 2, dy = av.top + av.height / 2 - a.top - a.height / 2;
      const gx = (ws.left + ws.width / 2 - a.left - a.width / 2) * GATHER, gy = (ws.top + ws.height / 2 - a.top - a.height / 2) * GATHER;
      fl.style.transition = 'none';
      animate(fl, [
        { transform: 'none', opacity: 1 },
        { transform: 'translate(' + gx + 'px,' + gy + 'px) scale(0.94)', opacity: 1, offset: 0.27 },
        { transform: 'translate(' + gx + 'px,' + gy + 'px) scale(0.94)', opacity: 1, offset: 0.36 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.16)', opacity: 0.15, easing: 'cubic-bezier(.5, 0, .75, 0)' },
      ], { duration: sweepMs, fill: 'forwards' }, 'cubic-bezier(.3, 0, .3, 1)');
    }
    if (flyers.length) { snd('sweep', 0, sweepMs); snd('gulp', sweepMs * 0.8); }
    // 赢家的头像「咽」一下：牌钻进去的那一刻鼓一下再回原样
    if (flyers.length && !reduce) {
      avatar.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.45 }, { transform: 'scale(1)' }],
        { duration: 340, delay: sweepMs * 0.82, easing: 'cubic-bezier(.3, .8, .4, 1.2)' });
    }
    const STAGGER = 140;
    const ONE = Math.round(pace().fly * 2);
    const placeMs = fresh.length && !reduce ? ONE + STAGGER * (fresh.length - 1) : 0;
    setTimeout(() => {
      flyers.forEach(({ fl }) => fl.remove());
      flying = null;
      renderSeat(winner, fresh, true);   // 让出空位：后面的牌和本局分一起滑开
      if (!fresh.length) return;
      const done = () => { caps.querySelectorAll('.incoming').forEach((el) => el.classList.remove('incoming')); rollCapsScore(caps); };
      if (reduce) { done(); return; }
      const ar = avatar.getBoundingClientRect();
      // 放牌：像是把牌从自己那儿拿出来、放到桌上——
      // 从头像里小小地冒出来（略歪）→ 沿一道弧线滑到空位上方 → 停一下摆正 → 往下一落、落桌轻轻一压；
      // 拿在手里时影子大，放下时影子收紧
      const LIFT = '0 10px 18px rgba(20, 18, 15, 0.28)', REST = '0 1px 2px rgba(20, 18, 15, 0.16)';
      // 层次：浮在最上层的替身只负责「从头像飞到空位上方」；在空位上方那一刻交给吃牌区里的真牌，
      // 由真牌自己落下去——它在红桃扇里的前后顺序是对的（压在左边那张上、被右边那张压着），像真的插进去
      const HAND_OFF = 0.66;
      let landed = 0;
      fresh.forEach((c, i) => {
        const target = caps.querySelector('.gz-mini[data-card="' + c + '"]');
        if (!target) return;
        const b = target.getBoundingClientRect();
        const fl = buildCard(c);
        fl.classList.add('gz-flyer', 'gz-mini');
        if (target.classList.contains('is-exposed')) fl.classList.add('is-exposed');
        fl.style.cssText += ';left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;--q:' + b.width + 'px';
        els.app.appendChild(fl);
        const fx = ar.left + ar.width / 2 - b.left - b.width / 2, fy = ar.top + ar.height / 2 - b.top - b.height / 2;
        const hover = -b.height * 1.08;   // 悬停在整排牌的正上方、不跟任何一张重叠——交接时上下层不会跳
        const T = (x, y, sc, rot) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc + ') rotate(' + rot + 'deg)';
        // 从头像里一路走到空位上方：一条连续的二次贝塞尔弧（控制点在两端中点再往上提），整段先快后慢——哪个座位出发都顺；
        // 一出头像就淡入、由小变大、由歪摆正
        const cx = fx / 2, cy = Math.min(fy, hover) - b.height * 0.5;
        const ease = (t) => 1 - Math.pow(1 - t, 2.2);
        const N = 9, arc = [];
        for (let k = 0; k <= N; k++) {
          const t = ease(k / N), u = 1 - t;
          arc.push({
            transform: T(u * u * fx + 2 * u * t * cx, u * u * fy + 2 * u * t * cy + t * t * hover, (0.3 + 0.76 * t).toFixed(3), (-10 + 8 * t).toFixed(1)),
            opacity: k === 0 ? 0 : 1, boxShadow: LIFT, offset: 0.62 * (k / N), easing: 'linear',
          });
        }
        animate(fl, [
          ...arc,
          { transform: T(0, hover, 1.06, 0), opacity: 1, offset: HAND_OFF },
          { transform: T(0, hover, 1.06, 0), opacity: 0, offset: HAND_OFF },
          { transform: T(0, hover, 1.06, 0), opacity: 0 },
        ], { duration: ONE, delay: i * STAGGER, fill: 'both' });
        // 真牌：交接之前不显示，交接那一刻出现在同一位置，往下一落、落桌轻轻一压
        target.classList.remove('incoming');
        animate(target, [
          { transform: T(0, hover, 1.06, 0), opacity: 0, boxShadow: LIFT },
          { transform: T(0, hover, 1.06, 0), opacity: 0, boxShadow: LIFT, offset: HAND_OFF },
          { transform: T(0, hover, 1.06, 0), opacity: 1, boxShadow: LIFT, offset: HAND_OFF, easing: 'cubic-bezier(.55, 0, .9, .4)' },
          { transform: T(0, 0, 0.96, 0), opacity: 1, boxShadow: REST, offset: 0.86, easing: 'cubic-bezier(.3, .7, .35, 1)' },
          { transform: T(0, 0, 1, 0), opacity: 1, boxShadow: REST },
        ], { duration: ONE, delay: i * STAGGER, fill: 'backwards' });
        snd('tuck', i * STAGGER + ONE * 0.86);
        // 每拿出一张，头像轻轻一动
        avatar.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.4 }, { transform: 'scale(1)' }],
          { duration: 240, delay: i * STAGGER, easing: 'ease-out' });
        setTimeout(() => {
          fl.remove();
          if (++landed === fresh.length) rollCapsScore(caps);   // 全部放好才翻分
        }, ONE + i * STAGGER);
      });
      setTimeout(done, placeMs + 40);   // 兜底：万一哪张没找到落点，也把分翻了
    }, sweepMs);
    return sweepMs + placeMs;
  }

  function rollCapsScore(caps) {
    const sc = caps.querySelector('.gz-cap-score');
    if (sc && sc.dataset.next !== undefined) {
      const from = +(sc.dataset.v || 0), to = +sc.dataset.next;
      if (to !== from) snd(to > from ? 'up' : 'down');
      rollNumber(sc, to); delete sc.dataset.next;
    }
  }

  /* ───── 出牌倒计时与托管 ─────
   * 轮到谁，谁的头像外圈亮起一道红环并随时间收走；最后 5 秒头像轻跳。
   * 我超时：由场上最强的那档机器人替我出这一张；连续两次超时转成托管，点手牌或头像收回。
   * 弹窗开着时计时暂停。 */

  const clock = { seat: -1, left: 0, at: 0, onTimeout: null, paused: false, t1: 0, t2: 0, tk: 0 };

  function startClock(seat, onTimeout, totalMs) {
    stopClock();
    if (match.tutorial) return;   // 教程不计时
    const total = totalMs != null ? Math.round(totalMs) : (settings.turnSec | 0) * 1000;
    if (!(total > 0)) return;
    Object.assign(clock, { seat, left: total, onTimeout, paused: false });
    const el = els.seats[seat];
    el.style.setProperty('--turn-ms', total + 'ms');
    el.classList.remove('is-timed', 'is-hurry', 'is-paused');
    void el.offsetWidth;   // 同一座位连着两回合也要从满环重新开始
    el.classList.add('is-timed');
    if (!els.mask.hidden && !match.online) pauseClock();
    else runClock();
  }
  function runClock() {
    const my = token, seat = clock.seat;
    clock.at = performance.now();
    clock.t1 = setTimeout(() => {
      if (my !== token) return;
      els.seats[seat].classList.add('is-hurry');
      // 最后几秒轮到的是我：每秒一声木鱼
      if (seat === 0) { snd('tick'); clearInterval(clock.tk); clock.tk = setInterval(() => { if (my === token && clock.seat === 0 && !clock.paused) snd('tick'); }, 1000); }
    }, Math.max(0, clock.left - HURRY_MS));
    if (clock.onTimeout) clock.t2 = setTimeout(() => { if (my !== token) return; const f = clock.onTimeout; stopClock(); f(); }, clock.left);
  }
  function pauseClock() {
    if (clock.seat < 0 || clock.paused || (match && match.online)) return;   // 联机的钟以服务器为准，弹窗开着也照走
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
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
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
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
    els.seats[0].setAttribute('aria-label', NAMES[0] + (on ? '（托管中，点头像或手牌收回）' : ''));
    const r = match && match.round;
    // 收回托管时正轮到我、机器人还没动手：直接把这一手交还给我
    if (!on && r && turnSeat() === 0 && !busy) { stopClock(); step(); }
  }

  // 手动托管时正轮到我（出牌或决定明牌）、钟在走：马上交给机器人，不用等超时
  function takeOverNow() {
    const r = match.round;
    if (!r || busy) return;
    const tier = takeoverTier(botTiers());
    if (exposingMe()) {
      stopClock(); busy = true; exposePick = []; renderHand();
      chooseExpose(r, 0, tier).then(guard((cards) => schedule(() => applyExpose(0, cards), 0)));
    } else if (turnSeat() === 0 && !R.isRoundOver(r) && !match.exposing.length) {
      stopClock(); busy = true; selected = -1; renderHand();
      chooseAi(r, 0, tier).then(guard((card) => schedule(() => commit(0, card), 0)));
    }
  }

  function onCardTap(c, el) {
    if (match.online && onlineAuto()) { onlineAct('auto', { on: false }); return; }
    if (autopilot) { setAutopilot(false); return; }
    if (match.tutorial) { suggestCard = -1; armIdle(); }
    if (exposingMe()) {
      if (busy) return;
      if (!R.EXPOSABLE.includes(c)) { shake(el); return; }
      exposePick = exposePick.includes(c) ? exposePick.filter((x) => x !== c) : exposePick.concat([c]);
      snd('pick');
      renderHand();
      return;
    }
    const r = match.round;
    if (busy || !r || R.isRoundOver(r) || r.turn !== 0) return;
    if (!R.legalFor(r, 0).includes(c)) { shake(el); return; }
    if (selected === c) { playSelected(); return; }
    selected = c;
    snd('pick');
    renderHand();
  }

  // 不能出：抖一下，亮着的那些就是能出的
  function shake(el) {
    snd('nope');
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
    if (match.online) { onlinePlaySelected(); return; }
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
    settleOnTable(() => { roundEndSound(scores[0]); showSettlement(); });
  }

  /* 一局打完不急着弹结算：牌桌保持最后的样子（吃牌区都还在），四家头像下的累计分一起数到新值，
   * 数完再停一下，才出结算页。调用时最后一轮的本局分应该已经翻完（step 到这里前已等了 pace().roundEnd）。 */
  function settleOnTable(then) {
    for (let s = 0; s < 4; s++) {
      els.seats[s].classList.remove('is-turn');
      const tot = els.seats[s].querySelector('.gz-total');
      rollNumber(tot, match.totals[s]);
      tot.classList.toggle('neg', match.totals[s] < 0);
    }
    renderHand();   // 手牌已空：出牌键收起
    schedule(then, reduceMotion() ? 300 : SETTLE_HOLD);
  }

  function roundEndSound(mine) { snd(mine > 0 ? 'win' : mine < 0 ? 'lose' : 'even'); }

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

  // 正文里的 ♠♥♦♣ 后面补一个「按文字显示」的变体选择符，免得安卓把它们画成彩色 emoji
  function textSuits(html) { return String(html).replace(/([♠♥♦♣])(?!\uFE0E)/g, '$1\uFE0E'); }
  /* 弹窗统一三段：标题钉在顶上、最后一排按钮钉在底下，只有中间内容滚动；打开时从内容的最上面看起。
   * 点弹窗外面 / Esc = 点它的「好 / 取消 / 知道了」（[data-close]）；没有这个键的（结算、第一次来问要不要学）必须点按钮选 */
  function openDialog(html, onMount) {
    const d = els.dialog;
    d.innerHTML = textSuits(html);
    const head = d.firstElementChild && d.firstElementChild.tagName === 'H2' ? d.firstElementChild : null;
    const foot = [...d.children].reverse().find((x) => x.classList.contains('gz-actions')) || null;
    const body = document.createElement('div');
    body.className = 'gz-dialog-body';
    [...d.children].forEach((x) => { if (x !== head && x !== foot) body.appendChild(x); });
    d.insertBefore(body, foot);
    if (foot) foot.classList.add('gz-dialog-foot');
    els.mask.hidden = false;
    pauseClock();
    if (onMount) onMount(d);
    body.scrollTop = 0;
    d.classList.toggle('is-scroll', body.scrollHeight > body.clientHeight + 1);
    const first = d.querySelector('[data-autofocus]') || d.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  function closeDialog() { els.mask.hidden = true; els.dialog.innerHTML = ''; resumeClock(); }
  function dismissDialog() {
    if (els.mask.hidden) return;
    const close = els.dialog.querySelector('[data-close]');
    if (close) close.click();
  }

  /* 结算：每家一行 = 名字 · 吃牌（同一套小牌陈列） · 本局 · 累计；不写算式文字 */
  function showSettlement() {
    const last = match.last;
    if (!match.round) syncHeartsX2();
    const losers = match.online ? match.losers || [] : match.over ? R.matchLosers(match.totals) : [];
    const cls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
    // 自己永远在最上面；其余三家按分从高到低（整盘结束按累计，平时按本局），同分按出牌顺序（下家 → 对家 → 上家）
    const key = (s) => (match.over ? match.totals[s] : last.scores[s]);
    const order = [0].concat([1, 2, 3].sort((a, b) => key(b) - key(a) || a - b));
    const mine = key(0);
    const rows = order.map((s) =>
      '<div class="gz-res-row' + (s === 0 ? ' me is-' + (mine > 0 ? 'up' : mine < 0 ? 'down' : 'even') : '') + (losers.includes(s) ? ' loser' : '') + '" data-seat="' + s + '">' +
      '<span class="gz-res-name">' + esc(NAMES[s]) + (losers.includes(s) ? '<span class="gz-pig-badge">猪</span>' : '') + '</span>' +
      '<span class="gz-res-caps gz-caps"></span>' +
      '<span class="gz-res-n gz-num ' + cls(last.scores[s]) + '">' + signed(last.scores[s]) + '</span>' +
      '<span class="gz-res-n gz-res-tot gz-num ' + cls(match.totals[s]) + '">' + signed(match.totals[s]) + '</span></div>').join('');
    const title = match.tutorial ? '教程完成' : match.over
      ? (losers.length ? losers.map((s) => (s === 0 ? '你' : esc(NAMES[s]))).join('、') + (losers.length > 1 ? '都' : '') + '当了猪' : '这一盘结束')
      : '第 ' + last.roundNo + ' 局';
    openDialog(
      '<h2>' + title + '</h2>' +
      '<div class="gz-res"><div class="gz-res-row gz-res-head"><span></span><span></span><span class="gz-res-n">本局</span><span class="gz-res-n">累计</span></div>' + rows + '</div>' +
      '<div class="gz-actions">' +
      (match.online ? onlineSettleActions()
        : match.tutorial ? '<button type="button" class="gz-btn gz-btn-primary" data-act="tut-done" data-autofocus>开始第一盘</button>'
        : match.over ? '<button type="button" class="gz-btn gz-btn-primary" data-act="again" data-autofocus>再来一盘</button>'
        : '<button type="button" class="gz-btn gz-btn-primary" data-act="next" data-autofocus>下一局</button>') +
      '</div>',
      (d) => {
        // 默认一行：名字 · 吃牌 · 本局 · 累计。谁的牌在这一行里挤得看不清，谁就换成「名字和分数一行、吃牌放下一行」，
        // 下一行还放不下就把红桃扇再挪到第三行；放得下的人照旧一行，不硬撑开
        d.querySelectorAll('.gz-res-row[data-seat]').forEach((row) => {
          const box = row.querySelector('.gz-res-caps');
          row.dataset.dbl = dblTone(last.captured[+row.dataset.seat], last.ctx);
          const draw = () => {
            renderCaps(box, last.captured[+row.dataset.seat], null, last.ctx);
            const sc = box.querySelector('.gz-cap-score');
            if (sc) sc.remove();
          };
          draw();
          if (fanSqueezed(box)) { row.classList.add('is-stack'); draw(); }
        });
        if (match.online) { bindOnlineSettle(d); return; }
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
    const rows = [0, 1, 2, 3].map((s) => '<tr class="' + (s === 0 ? 'me' : '') + '"><td>' + esc(NAMES[s]) + '</td><td class="n ' +
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
      (rules.expose ? '<dt>明牌</dt><dd>开打前，♥A、♠Q、♦J、♣10 可以明出来给大家看，效果翻倍：明 ♥A 红桃全部 ×2，明猪 −200，明羊 +200，明变压器 ×4' + (rules.doublerAlone === 50 ? '（单吃 +100）' : '') + '。这个花色第一次被领出的那一轮里，明出的牌不能出，也不能用它来领这个花色，除非你这个花色只剩它一张；垫牌不受限。</dd>' : '') +
      '<dt>一盘</dt><dd>' + end + '分最低的人当猪，并列都是。</dd></dl>';
  }
  // 规则里点名的牌（♠2、猪 ♠Q、羊 ♦J、变压器 ♣10、♥A）直接画成小牌，和新手教程里一样
  function rulesWithCards(rules) {
    return inlineCards(rulesHtml(rules).replace(/([♠♥♦♣])(10|[2-9JQKA])/g, '{$1$2}'));
  }

  function showRules() {
    openDialog('<h2>拱猪规则</h2>' + rulesWithCards(match.rules) +
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
    ['expose', '明牌', [[true, '可以明牌'], [false, '不明牌']]],
    ['end', '一盘结束', [['lose1000', '有人到 −1000'], ['pm1000', '有人到 ±1000'], ['rounds10', '打满 10 局'], ['none', '不设终点']]],
  ];

  function restartMatch() {
    if (!confirm('放弃这一盘，从 0 分重新开始？')) return;
    stopClock(); closeDialog(); token++; busy = false; setAutopilot(false); newMatch(); startRound();
  }

  /* ───── 右上角菜单 ─────
   * 顶栏只留三个键：声音、规则、菜单。能做的事都收进菜单、写成字，每条下面一行小字说清会怎样，前面一个线条小图标；
   * 按场合换内容：单机 / 联机房间里 / 教程里。比分不进菜单：每家头像旁边就写着累计分。 */
  let menuPanel = null;
  // 「返回百宝奇巧」只给从本站点进来的人（记在这个标签页里，刷新也还在）；
  // 单独打开的（分享链接、微信里点开、装到桌面）只是来玩这个游戏，菜单里不占这一条
  const FROM_SITE = (() => {
    const K = 'gz-from-site';
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && !ref.pathname.startsWith('/toolbox/gongzhu')) sessionStorage.setItem(K, '1');
      return sessionStorage.getItem(K) === '1';
    } catch (_) { return false; }
  })();
  // 齿轮：8 个齿按角度算出来，免得手抄一长串路径
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
    online: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c.5-3.3 2.6-5.2 5.5-5.2s5 1.9 5.5 5.2"/><circle cx="16.8" cy="9.3" r="2.4"/><path d="M15.8 14.3c2.6-.2 4.4 1.5 4.8 4.4"/>',
    settings: GEAR,
    tutorial: '<path d="M12 6.6C10 5 7 4.5 4 5v13.2c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V5c-3-.5-6 0-8 1.6Z"/><path d="M12 6.6v13.2"/>',
    skip: '<path d="M4.5 6.5 11 12l-6.5 5.5Z"/><path d="M12.5 6.5 19 12l-6.5 5.5Z"/>',
    exit: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    room: '<path d="M10.2 13.8a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.1-1.1"/>',
    roomrules: '<path d="M4 7h9M17 7h3M4 17h4M12 17h8"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    leave: '<path d="M13.5 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
    'settings-art': '<rect x="5.5" y="3.5" width="13" height="17" rx="2"/><path d="M12 9.2c1.4 1.4 2.8 2.3 2.8 3.6 0 1-.9 1.5-1.7 1.1L13.6 16h-3.2l.5-2.1c-.8.4-1.7-.1-1.7-1.1 0-1.3 1.4-2.2 2.8-3.6Z"/>',
  };
  function menuItems() {
    const exit = FROM_SITE ? [['line'], ['exit', '返回百宝奇巧', match && match.online ? '不会退出房间，回来接着打' : match && match.tutorial ? '教程下次还能从规则里打开' : '进度自动保存，回来接着打']] : [];
    const art = settings.artFaces !== false;
    const artItem = ['settings-art', art ? '牌面：卡通' : '牌面：普通',
      art ? '♠Q、♦J、♣10 画成猪、羊、×2；点一下换回普通牌面' : '猪、羊、变压器是普通牌面；点一下换成卡通画'];
    if (match && match.tutorial) {
      return [['skip', '跳过教程', '直接开始打'], ...exit];
    }
    if (match && match.online && online) {
      const inGame = !match.lobby;
      return [
        ['head', '房间 ' + online.code],
        ['room', '邀请朋友', '点一下复制邀请链接，发给朋友'],
        ['roomrules', isHost() && match.lobby ? '自定义规则' : '房间规则', isHost() && match.lobby ? '改了会通知房间里的其他人' : '这个房间按什么规则打'],
        ['leave', '离开房间', inGame ? '你的座位交给机器人接着打，回到单机' : '回到单机'],
        ['line'],
        artItem,
        ...exit,
      ];
    }
    return [
      ['head', '这一盘'],
      ['restart', '重新开始一盘', '分数清零，从第 1 局打起'],
      ['line'],
      ...(NET ? [['online', '加入 / 创建房间', '和朋友联机：输房号加入，或开一个房间发链接']] : []),
      ['settings', '设置', 'AI 水平、出牌限时、牌面、玩法变体'],
      ['tutorial', '新手教程', '跟着打一局，边打边讲'],
      ...exit,
    ];
  }
  function menuAct(k) {
    closeMenu();
    if (k === 'restart') restartMatch();
    else if (k === 'online') showOnlineEntry('');
    else if (k === 'settings') showSettings();
    else if (k === 'tutorial') startTutorial();
    else if (k === 'skip') endTutorial();
    else if (k === 'room') copyText(NET.inviteUrl(online.code), '邀请链接已复制，发给朋友就能进房间');
    else if (k === 'roomrules') showRoomRules('view');
    else if (k === 'leave') {
      if (!confirm(match.lobby ? '离开房间？' : '离开房间？你的座位会交给机器人接着打。')) return;
      leaveOnline(null, true);
    } else if (k === 'settings-art') {
      settings.artFaces = settings.artFaces === false;
      writeJSON(SETTINGS_KEY, settings);
      document.querySelectorAll('.gz-seat .gz-caps').forEach((x) => { x.innerHTML = ''; });
      renderAll();
      toast(settings.artFaces ? '换成卡通牌面了' : '换成普通牌面了');
    } else if (k === 'exit') location.href = '/toolbox/';
  }
  function closeMenu() {
    if (!menuPanel || menuPanel.hidden) return;
    menuPanel.hidden = true;
    $('gzMenuBtn').setAttribute('aria-expanded', 'false');
    if (els.mask.hidden) resumeClock();
  }
  function toggleMenu(e) {
    if (e) e.stopPropagation();
    if (!menuPanel) {
      menuPanel = document.createElement('div');
      menuPanel.className = 'gz-menu';
      menuPanel.setAttribute('role', 'menu');
      menuPanel.hidden = true;
      menuPanel.addEventListener('click', (ev) => { const b = ev.target.closest('[data-menu]'); if (b) menuAct(b.dataset.menu); });
      menuPanel.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { closeMenu(); $('gzMenuBtn').focus(); } });
      document.addEventListener('click', (ev) => { if (!ev.target.closest('.gz-menu, #gzMenuBtn')) closeMenu(); });
      els.app.appendChild(menuPanel);
    }
    if (!menuPanel.hidden) { closeMenu(); return; }
    if (soundPanel) soundPanel.hidden = true;
    menuPanel.innerHTML = textSuits(menuItems().map(([k, t, sub]) =>
      k === 'line' ? '<hr>' : k === 'head' ? '<div class="gz-menu-head">' + esc(t) + '</div>'
        : '<button type="button" role="menuitem" data-menu="' + k + '">' +
          '<svg class="gz-menu-ic" viewBox="0 0 24 24" aria-hidden="true">' + (MENU_ICONS[k] || '') + '</svg>' +
          '<b>' + esc(t) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>').join(''));
    menuPanel.hidden = false;
    $('gzMenuBtn').setAttribute('aria-expanded', 'true');
    pauseClock();   // 翻菜单时不计时（同弹窗）
    const r = $('gzMenuBtn').getBoundingClientRect();
    menuPanel.style.top = Math.round(r.bottom + 8) + 'px';
    menuPanel.style.right = Math.round(Math.max(8, window.innerWidth - r.right)) + 'px';
    const first = menuPanel.querySelector('button');
    if (first) first.focus();
  }

  function showSettings() {
    if (match && match.online) { showRoomDialog(); return; }
    const seg = Object.keys(TIER_LABELS).map((k) => '<button type="button" data-tier="' + k + '" aria-pressed="' + (settings.tier === k) + '">' + TIER_LABELS[k] + '</button>').join('');
    const secs = [20, 0].map((k) => '<button type="button" data-sec="' + k + '" aria-pressed="' + ((settings.turnSec | 0) === k) + '">' + TURN_SEC_OPTS[k] + '</button>').join('');
    openDialog(
      '<h2>设置</h2><div class="gz-field-label">AI 水平</div><div class="gz-seg" role="group">' + seg + '</div>' +
      '<div class="gz-field-label">出牌限时</div><div class="gz-seg" role="group">' + secs + '</div>' +
      '<div class="gz-field-label">猪、羊、变压器的牌面</div><div class="gz-seg" role="group">' +
        [[true, '画成猪羊和 ×2'], [false, '普通牌面']].map(([v, t]) => '<button type="button" data-art="' + v + '" aria-pressed="' + ((settings.artFaces !== false) === v) + '">' + t + '</button>').join('') + '</div>' +
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
        d.querySelectorAll('[data-art]').forEach((b) => b.addEventListener('click', () => {
          settings.artFaces = b.dataset.art === 'true';
          writeJSON(SETTINGS_KEY, settings);
          d.querySelectorAll('[data-art]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          // 牌面是按张建出来的：把手牌、桌上和吃牌区都重画一遍（吃牌区的小牌是复用的，先清掉）
          document.querySelectorAll('.gz-seat .gz-caps').forEach((x) => { x.innerHTML = ''; });
          renderAll();
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
        d.querySelector('[data-act="restart"]').addEventListener('click', restartMatch);
      });
  }

  /* ───── 特殊事件动画（牌桌中央，绝对定位、不占布局） ─────
   * 猪：粉色小猪头弹出、左右扭两下，然后朝吃猪的人跑过去；羊：卷毛小羊蹦两下再跑过去；
   * 变压器：圆环里一个 ×2（颜色随分数正负）+ 金星；全红：三处红心烟花接连炸开，再浮出「全红」；
   * 大满贯：金冠落下 + 金色烟花。领出花色的 A 一出：那张牌旁边盖一个小「照单全收」。 */

  const FX_DRIFT = [[0, 90], [120, 0], [0, -90], [-120, 0]];   // 朝各座位跑的方向（我 / 下 / 对 / 上）
  const FX_GAP = 600;
  const FX_DUR = { pig: 1900, sheep: 1900, doubler: 1700, allhearts: 2700, slam: 2600, clash: 2900 };
  const DOUBLER_TONE = {
    gold: { ink: '#b8924a', ring: '#c9a96e', sparks: ['#c9a96e', '#dcb86c'] },
    ash: { ink: '#7b756b', ring: '#a39c90', sparks: ['#a39c90', '#8c867b'] },
    navy: { ink: '#3d5878', ring: '#6c84a2', sparks: ['#6c84a2', '#8ea2bb'] },
  };
  const HEART_REDS = ['#b4392c', '#c9473a', '#d65f4f', '#a8322a', '#e07463'];
  const ART = {
    // 坏猪：小恶魔角、倒竖眉、红瞳、斜嘴獠牙
    pig: '<svg viewBox="0 0 140 122" aria-hidden="true">' +
      '<path d="M44 28C37 16 38 5 47 0c-2 10 2 18 9 22Z" style="fill:var(--pg-horn,#7a1e1a)"/><path d="M96 28c7-12 6-23-3-28 2 10-2 18-9 22Z" style="fill:var(--pg-horn,#7a1e1a)"/>' +
      '<path d="M22 44 28 12 52 32Z" style="fill:var(--pg-ear,#e0889a)"/><path d="M118 44 112 12 88 32Z" style="fill:var(--pg-ear,#e0889a)"/>' +
      '<ellipse cx="70" cy="70" rx="53" ry="47" style="fill:var(--pg-skin,#f2a9b5)"/><ellipse cx="40" cy="84" rx="9" ry="5.5" style="fill:var(--pg-cheek,#e98698)" opacity=".6"/><ellipse cx="100" cy="84" rx="9" ry="5.5" style="fill:var(--pg-cheek,#e98698)" opacity=".6"/>' +
      '<ellipse cx="52" cy="62" rx="9" ry="5.5" fill="#fff"/><ellipse cx="88" cy="62" rx="9" ry="5.5" fill="#fff"/><circle cx="54.5" cy="63" r="3.6" style="fill:var(--pg-eye,#b4392c)"/><circle cx="85.5" cy="63" r="3.6" style="fill:var(--pg-eye,#b4392c)"/>' +
      '<path d="M38 47 61 57M102 47 79 57" style="stroke:var(--pg-line,#3a2420)" stroke-width="6.5" stroke-linecap="round"/>' +
      // 额头一颗小黑桃（呼应 ♠Q）
      '<path d="M70 27c5 5 10 8.5 10 13 0 3.4-3.2 5.2-6 3.8-1-.5-1.8-1.3-2.4-2.4L73 47h-6l1.4-5.6c-.6 1.1-1.4 1.9-2.4 2.4-2.8 1.4-6-.4-6-3.8 0-4.5 5-8 10-13Z" style="fill:var(--pg-spade,#1f1c18)"/>' +
      '<ellipse cx="70" cy="84" rx="21" ry="14" style="fill:var(--pg-snout,#ea8f9f)"/><ellipse cx="62" cy="84" rx="3.6" ry="5.4" style="fill:var(--pg-nose,#a94a5e)"/><ellipse cx="78" cy="84" rx="3.6" ry="5.4" style="fill:var(--pg-nose,#a94a5e)"/>' +
      '<path d="M50 103q22 10 42-6" style="stroke:var(--pg-line,#3a2420)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m80 103 4 8 3-11Z" fill="#fffaf3" style="stroke:var(--pg-line,#3a2420)" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    // 羊：羊毛先描一圈外轮廓再整块填色（像一整朵云，不是一个个圆），暖米色、腮红，额头一颗小红方块呼应 ♦J
    sheep: (() => {
      const wool = [[34, 42, 16], [52, 28, 17], [72, 28, 17], [88, 43, 16], [93, 63, 15], [78, 80, 16], [42, 80, 16], [27, 63, 15], [60, 86, 15], [60, 52, 30]];
      const tuft = [[50, 37, 9], [70, 37, 9], [60, 31, 10]];
      const circ = (a, attrs) => a.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + attrs + '/>').join('');
      return '<svg viewBox="0 0 120 106" aria-hidden="true">' +
        '<g style="fill:var(--sh-edge,#e7cfc0);stroke:var(--sh-line,#b98f80)">' + circ(wool, ' stroke-width="5"') + '</g><g style="fill:var(--sh-wool,#fbefe4)">' + circ(wool, '') + '</g>' +
        '<ellipse cx="31" cy="55" rx="12" ry="6" transform="rotate(-24 31 55)" fill="#4b3a34"/><ellipse cx="89" cy="55" rx="12" ry="6" transform="rotate(24 89 55)" fill="#4b3a34"/>' +
        '<ellipse cx="60" cy="61" rx="20" ry="25" fill="#4b3a34"/>' +
        '<g style="fill:var(--sh-edge,#e7cfc0);stroke:var(--sh-line,#b98f80)">' + circ(tuft, ' stroke-width="4"') + '</g><g style="fill:var(--sh-wool,#fbefe4)">' + circ(tuft, '') + '</g>' +
        '<path d="M60 26 65 33 60 40 55 33Z" style="fill:var(--sh-gem,#b4392c)"/>' +
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
  function planTrickFx(done) {
    const r = match.round;
    const w = done.winner;
    const cs = done.plays.map((p) => p.card);
    const sc = R.scoreCaptured(r.captured[w], R.scoreCtx(r));
    const list = [];
    const hadAll = r.captured[w].filter(R.isHeart).length === 13 && cs.some(R.isHeart);
    // 大满贯要吃齐全部 16 张分牌：凑齐的必然是最后一张分牌所在的这一轮——不管这一轮里有没有红桃
    // （原来只认「这轮有红桃」：先吃齐红桃、最后才吃到猪 / 羊 / 变压器时，大满贯和那张牌的动画都不放）
    const slamNow = sc.grandSlam && cs.some(R.isScoring);
    // 动画只写效果 / 分数，不写是谁吃的（飘向谁已经说明了）
    if (slamNow) list.push({ kind: 'slam', word: '大满贯', sub: signed(sc.total) });
    else if (hadAll) list.push({ kind: 'allhearts', word: '全红', sub: signed(sc.heartScore) });
    if (!slamNow) {
      // 变压器的颜色看吃到它的人现在的分：正分金色（翻倍是好事）、负分灰色（雪上加霜）、0 分藏青
      const dbl = { word: '×' + (R.scoreCtx(r).exposed.includes(R.DOUBLER) ? 4 : 2), tone: sc.total > 0 ? 'gold' : sc.total < 0 ? 'ash' : 'navy' };
      const specials = [R.SHEEP, R.PIG, R.DOUBLER].filter((c) => cs.includes(c));
      if (specials.length >= 2) {
        // 猪 / 羊 / 变压器有两张以上同一轮被吃：不各放各的，改成对撞（见 playClash）；三张一起是三角对撞，烟花更大
        list.push({ kind: 'clash', cards: specials, dur: specials.length === 3 ? 3500 : FX_DUR.clash,
          pigSub: signed(sc.pigScore), sheepSub: signed(sc.sheepScore), dbl });
      } else {
        if (cs.includes(R.PIG)) list.push({ kind: 'pig', card: R.PIG, sub: signed(sc.pigScore) });
        if (cs.includes(R.SHEEP)) list.push({ kind: 'sheep', card: R.SHEEP, sub: signed(sc.sheepScore) });
        if (cs.includes(R.DOUBLER)) list.push({ kind: 'doubler', card: R.DOUBLER, word: dbl.word, sub: '', tone: dbl.tone });
      }
    }
    return reduceMotion() ? [] : list;
  }

  function playTrickFx(done, list) {
    const w = done.winner;
    if (!list.length) return 0;
    if (window.GongzhuAudio) window.GongzhuAudio.duck(list.reduce((m, fx, k) => Math.max(m, k * FX_GAP + (fx.dur || FX_DUR[fx.kind])), 0));
    let end = 0;
    list.forEach((fx, k) => {
      setTimeout(() => playFx(fx, w), k * FX_GAP);
      end = Math.max(end, k * FX_GAP + (fx.dur || FX_DUR[fx.kind]));
    });
    return end;
  }

  // 多段关键帧：缓动按段给（Web Animations 的整体 easing 会把整条时间线压歪，停顿变短、淡出提前）
  function animate(el, frames, opts, ease) {
    const e = ease || 'cubic-bezier(.25, .8, .35, 1)';
    return el.animate(frames.map((f) => Object.assign({ easing: e }, f)), Object.assign({ easing: 'linear' }, opts));
  }
  const FT = (x, y, sc, rot) => 'translate(-50%, -50%) translate(' + (x || 0) + 'px,' + (y || 0) + 'px) scale(' + (sc == null ? 1 : sc) + ') rotate(' + (rot || 0) + 'deg)';

  /* 对撞：猪 / 羊 / 变压器有两张以上同一轮被吃。
   * 两张：一左一右（羊 + 猪：羊左猪右；羊 / 猪 + 变压器：羊或猪在左、×2 在右）；三张：正三角，羊左上、猪右上、×2 在下。
   * 各自亮相（羊蹦两下、猪刨两下地、×2 一鼓一鼓），往后一缩，一起冲向中间撞上——白光一闪、一团烟把它们吞掉，
   * 接着用参与者的花色放烟花（羊 ♦、猪 ♠、变压器 ♣；三张一起再加金星、多放两轮），不写字；
   * 最后这几张牌在吃到的人的吃牌区翻出来。 */
  function playClash(fx, w) {
    const dur = fx.dur || FX_DUR.clash;
    const three = fx.cards.length === 3;
    const pos = three
      ? { [R.SHEEP]: [-140, -80], [R.PIG]: [140, -80], [R.DOUBLER]: [0, 150] }
      : (() => { const [l, r] = fx.cards; return { [l]: [-170, 0], [r]: [170, 0] }; })();
    const tag = (v) => '<div class="gz-fxscore ' + (v[0] === '−' ? 'neg' : 'pos') + '">' + v + '</div>';
    const IN = 'cubic-bezier(.55, 0, .9, .45)';   // 冲锋：越跑越快
    const OUT = 'cubic-bezier(.25, .8, .35, 1)';
    const actors = fx.cards.map((c) => {
      const el = document.createElement('div');
      if (c === R.DOUBLER) {
        const tone = DOUBLER_TONE[fx.dbl.tone || 'gold'];
        el.className = 'gz-fxitem kind-doubler is-duel';
        el.innerHTML = '<div class="gz-fxcoin" style="--tone:' + tone.ring + ';color:' + tone.ink + '"><span>' + fx.dbl.word + '</span></div>';
      } else {
        const pig = c === R.PIG;
        el.className = 'gz-fxitem kind-' + (pig ? 'pig' : 'sheep') + ' is-duel';
        el.innerHTML = '<div class="gz-fxart">' + ART[pig ? 'pig' : 'sheep'] + '</div>' + tag(pig ? fx.pigSub : fx.sheepSub);
      }
      els.fx.appendChild(el);
      const [x, y] = pos[c];
      const len = Math.hypot(x, y) || 1, ux = x / len, uy = y / len;   // 从中间指向它的方向
      const at = (k, sc, rot) => FT(x * k, y * k, sc, rot);
      const lean = (ux || uy) * 8;
      // 亮相后的小动作：羊蹦、猪刨地、×2 一鼓一鼓
      const idle = c === R.SHEEP
        ? [{ transform: FT(x, y - 22, 1), offset: 0.19 }, { transform: at(1, 1), offset: 0.24 }, { transform: FT(x, y - 12, 1), offset: 0.28 }]
        : c === R.PIG
          ? [{ transform: FT(x - 9, y, 1, -4), offset: 0.18 }, { transform: FT(x + 9, y, 1, 3), offset: 0.23 }, { transform: FT(x - 4, y, 1, -2), offset: 0.28 }]
          : [{ transform: at(1, 1.14), offset: 0.18 }, { transform: at(1, 0.96), offset: 0.23 }, { transform: at(1, 1.08), offset: 0.28 }];
      const frames = [
        { transform: at(1.25, 0.2), opacity: 0 },
        { transform: at(1, 1.08), opacity: 1, offset: 0.08 },
        { transform: at(1, 1), offset: 0.13 },
        ...idle,
        { transform: FT(x + ux * 20, y + uy * 20, 0.96, -lean), offset: 0.33 },   // 往后一缩，蓄力
        { transform: at(0.22, 1.06, lean), offset: 0.43 },
        { transform: at(0.17, 0.86), opacity: 1, offset: 0.46 },
        { transform: at(0.15, 0.4), opacity: 0, offset: 0.54 },
        { transform: at(0.15, 0.4), opacity: 0 },
      ].map((f, i, all) => Object.assign({ easing: all[i + 1] && all[i + 1].offset === 0.43 ? IN : OUT }, f));
      el.animate(frames, { duration: dur, fill: 'forwards', easing: 'linear' });
      const label = el.querySelector('.gz-fxscore');
      if (label) label.animate([{ opacity: 1 }, { opacity: 1, offset: 0.27 }, { opacity: 0, offset: 0.33 }, { opacity: 0 }], { duration: dur, fill: 'forwards' });
      return el;
    });

    const hit = Math.round(dur * 0.44);
    // 声音：各自亮相时叫一声（羊咩、猪哼、×2 叮）→ 蓄力冲锋的风声 → 撞上「轰」
    fx.cards.forEach((c, i) => snd(c === R.SHEEP ? 'sheep' : c === R.PIG ? 'pig' : 'doubler', 60 + i * 140));
    snd('charge', dur * 0.33, dur * 0.11);
    snd('boom', hit, three);
    const glyphs = fx.cards.map((c) => (c === R.SHEEP ? '♦' : c === R.PIG ? '♠' : '♣'));
    const tint = (g) => (g === '♣' ? DOUBLER_TONE[fx.dbl.tone || 'gold'].ink : SUIT_TINT(g));
    // 撞上：白光 + 参与者的花色四溅
    burst(0, -18, three ? 56 : 44, glyphs, tint, hit, three ? 220 : 190, { glow: 'gold', spin: true, size: [16, three ? 80 : 72] });
    // 一团烟：一圈圈灰白的云团鼓起来、往上飘散
    for (let k = 0; k < (three ? 15 : 11); k++) {
      const puff = document.createElement('div');
      puff.className = 'gz-smoke';
      const a = Math.random() * Math.PI * 2, d = Math.random() * (three ? 60 : 46);
      const x = Math.cos(a) * d, y = -18 + Math.sin(a) * d * 0.7;
      const size = 70 + Math.random() * (three ? 90 : 70);
      puff.style.width = puff.style.height = size.toFixed(0) + 'px';
      els.fx.appendChild(puff);
      const life = 1100 + Math.random() * 500, delay = hit + Math.random() * 160;
      puff.animate([
        { transform: FT(x, y, 0.25), opacity: 0 },
        { transform: FT(x * 1.2, y - 6, 1), opacity: 0.85, offset: 0.22 },
        { transform: FT(x * 1.7, y - 40, 1.7), opacity: 0 },
      ], { duration: life, delay, fill: 'both', easing: 'cubic-bezier(.2, .7, .3, 1)' });
      setTimeout(() => puff.remove(), delay + life + 60);
    }
    // 爆炸中央浮出巨大的花色：猪 ♠、羊 ♦（变压器只是倍数，两张时不单独出大花色）；
    // 猪羊对撞两个依次冒出、再一起淡掉；三张一起是三个大花色在三角位置接连冒出，各自炸碎成一把同花色的碎片
    const giants = three ? [[R.SHEEP, -70, -55], [R.PIG, 70, -55], [R.DOUBLER, 0, 55]]
      : fx.cards.filter((c) => c !== R.DOUBLER).map((c, i, all) => [c, all.length > 1 ? (i ? 46 : -46) : 0, -18]);
    giants.forEach(([c, gx, gy], i) => {
      const suit = c === R.SHEEP ? 2 : c === R.PIG ? 0 : 3;
      const g = document.createElement('div');
      g.className = 'gz-giant';
      g.style.color = c === R.DOUBLER ? DOUBLER_TONE[fx.dbl.tone || 'gold'].ink : suit === 2 ? '#b4392c' : '#1f1c18';
      g.style.fontSize = (three ? 200 : 260) + 'px';
      g.innerHTML = suitSVG(suit);
      els.fx.appendChild(g);
      const delay = hit + 90 + i * (three ? 260 : 380);
      const life = three ? 1200 - i * 120 : 1500;
      snd('gong', delay + life * 0.08, suit);
      if (three) snd('shatter', delay + life * 0.62);
      animate(g, three ? [
        { transform: FT(gx, gy, 0.15, -12), opacity: 0 },
        { transform: FT(gx, gy, 1.22, 4), opacity: 1, offset: 0.2 },
        { transform: FT(gx, gy, 1, 0), opacity: 1, offset: 0.34 },
        { transform: FT(gx, gy, 1.04, 0), opacity: 1, offset: 0.62 },
        { transform: FT(gx, gy, 1.55, 0), opacity: 0 },
      ] : [
        { transform: FT(gx, gy, 0.15, -10), opacity: 0 },
        { transform: FT(gx, gy, 1.2, 3), opacity: 1, offset: 0.16 },
        { transform: FT(gx, gy, 1, 0), opacity: 1, offset: 0.28 },
        { transform: FT(gx, gy, 1.03, 0), opacity: 0.95, offset: 0.66 },
        { transform: FT(gx, gy, 1.28, 0), opacity: 0 },
      ], { duration: life, delay, fill: 'both' });   // 缓动逐段给（整体 easing 会把停留段压没）
      // 三张一起：大花色在淡出的那一刻炸碎成一把同花色碎片
      if (three) burst(gx, gy, 30, [['♠', '♥', '♦', '♣'][suit]], tint, delay + life * 0.62, 200, { glow: 'none', spin: true, size: [18, 84] });
      setTimeout(() => g.remove(), delay + life + 60);
    });
    // 撞完的烟花：两侧、上方接连再炸几朵；三张一起再多两轮、加金星
    const more = three ? glyphs.concat(['✦']) : glyphs;
    const tint2 = (g) => (g === '✦' ? '#c9a96e' : tint(g));
    burst(-120, -50, 24, more, tint2, hit + 260, 130, { glow: 'none', spin: true, size: [16, 64] });
    burst(125, -40, 24, more, tint2, hit + 480, 130, { glow: 'none', spin: true, size: [16, 64] });
    burst(0, -90, 30, more, tint2, hit + 700, 160, { glow: 'gold', spin: true, size: [16, 72] });
    if (three) {
      burst(-90, 70, 26, more, tint2, hit + 900, 140, { glow: 'none', spin: true, size: [16, 70] });
      burst(95, 75, 26, more, tint2, hit + 1080, 140, { glow: 'none', spin: true, size: [16, 70] });
      burst(0, -10, 44, more, tint2, hit + 1280, 210, { glow: 'gold', spin: true, size: [18, 86] });
    }
    setTimeout(() => {
      actors.forEach((el) => el.remove());
    }, dur);
  }

  function playFx(fx, w) {
    if (fx.kind === 'clash') { playClash(fx, w); return; }
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
    // 声音跟着动作：猪抖身子时哼两声再刨地、羊一出场就咩、变压器落定时叮、全红大红心跳时怦怦、金冠落下时奏一串
    ({ pig: () => snd('pig', 250), sheep: () => snd('sheep', 120), doubler: () => snd('doubler', 180),
      allhearts: () => snd('heartbeat', dur * 0.33), slam: () => snd('slam', dur * 0.13) })[fx.kind]();

    // 最后一段：缩成牌那么大、飞进吃牌区；落地瞬间淡掉，换成真牌翻出来
    // 收尾：特效就地缩小淡出、略朝吃到的人那边飘一点（牌随后再整轮收过去）
    const LAND = [{ transform: FT(dx * 0.3, dy * 0.3, 0.6), opacity: 0 }];
    let frames;
    if (fx.kind === 'pig') {
      // 猪是 ♠Q：四散的全是大大小小、边飞边转的黑桃
      bloom(['♠'], ['#1f1c18', '#3a2420', '#4a3a36', '#7a1e1a'], 180, 190, [16, 82]);
      frames = [
        { transform: FT(0, 0, 0.2), opacity: 0 }, { transform: FT(0, 0, 1.15), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1), offset: 0.26 },
        { transform: FT(-9, 0, 1), offset: 0.34 }, { transform: FT(9, 0, 1), offset: 0.42 }, { transform: FT(-6, 0, 1), offset: 0.5 },
        { transform: FT(4, 0, 1), offset: 0.57 }, { transform: FT(0, 0, 1), opacity: 1, offset: 0.66 }, ...LAND
      ];
    } else if (fx.kind === 'sheep') {
      // 羊是 ♦J：四散的是红方块
      bloom(['♦'], ['#b4392c', '#c9473a', '#d65f4f', '#a8322a'], 180, 190, [16, 76]);
      frames = [
        { transform: FT(0, 0, 0.2), opacity: 0 }, { transform: FT(0, 0, 1.12), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1), offset: 0.26 },
        { transform: FT(0, -22, 1), offset: 0.36 }, { transform: FT(0, 0, 1), offset: 0.46 }, { transform: FT(0, -13, 1), offset: 0.54 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.66 }, ...LAND
      ];
    } else if (fx.kind === 'doubler') {
      frames = [
        { transform: FT(0, 0, 2.2), opacity: 0 }, { transform: FT(0, 0, 0.92), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1.04), offset: 0.24 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.7 }, ...LAND
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
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.82 }, ...LAND
      ];
    } else {   // slam
      // 大满贯：四种花色混在一起，加几颗金星
      burst(-140, -40, 26, ['♠', '♥', '♦', '♣', '✦'], SUIT_TINT, 250, 140, { spin: true, size: [18, 72] });
      burst(140, -40, 26, ['♣', '♦', '♥', '♠', '✦'], SUIT_TINT, 520, 140, { spin: true, size: [18, 72] });
      burst(0, 20, 36, ['♥', '♠', '♦', '♣', '✦'], SUIT_TINT, 800, 175, { spin: true, size: [18, 82] });
      frames = [
        { transform: FT(0, -120, 1), opacity: 0 }, { transform: FT(0, 6, 1), opacity: 1, offset: 0.14 }, { transform: FT(0, -6, 1), offset: 0.2 },
        { transform: FT(0, 0, 1), offset: 0.26 }, { transform: FT(0, 0, 1), opacity: 1, offset: 0.82 }, ...LAND
      ];
    }
    animate(item, frames, { duration: dur, fill: 'forwards' });
    // 分数大字在起飞前先淡掉，只让插画飞过去
    const label = item.querySelector('.gz-fxscore');
    if (label) {
      const holdEnd = frames[frames.length - 2].offset || 0.66;
      animate(label, [{ opacity: 1 }, { opacity: 1, offset: holdEnd }, { opacity: 0, offset: Math.min(0.95, holdEnd + 0.08) }, { opacity: 0 }], { duration: dur, fill: 'forwards' }, 'ease-out');
    }
    setTimeout(() => item.remove(), dur);
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
    snd('pop', delay, n / 44);   // 每朵烟花「嘭」一下，跟着粒子数大小
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
      // 四种花色用和牌面同一套矢量（各系统长一个样，安卓也不会变 emoji）；其余字符照常
      if (g in SUIT_OF_CHAR) el.innerHTML = suitSVG(SUIT_OF_CHAR[g]); else el.textContent = g + '\uFE0E';
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
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__gzDebug = { playFx, match: () => match, render: () => renderAll(), step: () => step(),
 solveSize: () => { solveSize(); if (match) renderHand(); }, showCoach: (m) => showCoach(m, () => hideCoach()) };

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
  // 一笔由细到粗、尾巴淡出的金色箭杆，箭头是两道弧
  const ARROW = '<div class="gz-rank-arrow"><span>小</span><svg viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="gzArrowG" x1="0" x2="1"><stop offset="0" stop-color="#c9a96e" stop-opacity="0"/><stop offset=".35" stop-color="#c9a96e" stop-opacity=".7"/><stop offset="1" stop-color="#a8843e"/></linearGradient></defs>' +
    '<path d="M2 8 222 6.4Q228 8 222 9.6Z" fill="url(#gzArrowG)"/><path d="M214 1.5Q224 6 237 8Q224 10 214 14.5Q222 8 214 1.5Z" fill="#a8843e"/></svg><span>大</span></div>';
  // 牌的大小：每种花色各一排真牌 2…A，底下一支从小指到大的箭头
  function rankChart() {
    const rows = [0, 1, 3, 2].map((su) => '<div class="gz-rank-row">' +
      R.RANK_LABELS.map((_, rk) => cardHtml(su * 13 + rk, 'gz-rank-card')).join('') + '</div>').join('');
    return '<div class="gz-ranks">' + rows + ARROW + '</div>';
  }

  // 这一轮四家出的牌：按出牌顺序排开，下面写是谁；首出、垫牌、最大的那张各有标记
  function trickRow(t, mark) {
    const lead = R.suitOf(t.plays[0].card);
    return '<div class="gz-trickrow">' + t.plays.map((p, k) => {
      const tag = mark && p.seat === t.winner ? '最大' : k === 0 ? '首出' : R.suitOf(p.card) !== lead ? '垫牌' : '';
      const cls = (mark && p.seat === t.winner ? ' is-win' : '') + (R.suitOf(p.card) !== lead ? ' is-off' : '');
      return '<span class="gz-tr-cell' + cls + '">' + cardHtml(p.card, 'gz-tr-card') +
        '<span class="gz-tr-name">' + (p.seat === 0 ? '你' : NAMES[p.seat]) + '</span><span class="gz-tr-tag">' + tag + '</span></span>';
    }).join('') + '</div>';
  }
  // 红桃扣分：2…A 一排，每张下面写扣几分，底下一支从小到大的箭头
  function heartChart() {
    const cells = R.RANK_LABELS.map((_, rk) => {
      const c = R.HEART * 13 + rk;
      return '<span class="gz-hc-cell">' + cardHtml(c, 'gz-rank-card') + '<span class="gz-num neg">' + signed(R.heartValue(c, match.rules)) + '</span></span>';
    }).join('');
    return '<div class="gz-ranks"><div class="gz-rank-row gz-hc-row">' + cells + '</div>' + ARROW + '</div>';
  }
  // 全红：13 张红桃、每张下面写扣几分；一道黑线从左往右把负分全部划掉，然后浮出一个大大的 +200
  function allHeartsRow() {
    const cells = R.RANK_LABELS.map((_, rk) => {
      const c = R.HEART * 13 + rk;
      return '<span class="gz-hc-cell">' + cardHtml(c, 'gz-rank-card') + '<span class="gz-num neg">' + signed(R.heartValue(c, match.rules)) + '</span></span>';
    }).join('');
    return '<div class="gz-allhearts"><div class="gz-rank-row gz-hc-row">' + cells + '<span class="gz-strike" aria-hidden="true"></span></div>' +
      '<span class="gz-ah-total gz-num">+200</span></div>';
  }

  function showCoach(msg, onNext) {
    const c = els.coach;
    c.querySelector('.gz-coach-text').innerHTML = textSuits(inlineCards(msg.text));
    const parts = c.querySelector('.gz-coach-parts');
    parts.innerHTML = msg.ranks ? rankChart() : msg.trick ? trickRow(msg.trick, msg.mark) : msg.heartChart ? heartChart() : msg.allHearts ? allHeartsRow() : '';
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

  /* ───── 联机 ─────
   * 服务器说了算（backends/urge/api/gongzhu.js）：发牌、校验、机器人、超时代打都在服务器上。
   * 这边只做三件事：长轮询拿房间视图；把视图里的事件日志（发牌 / 亮牌 / 出牌 / 收牌 / 结算）按顺序播成和单机一样的动画；
   * 把我的操作（出牌 / 亮牌 / 下一局 / 大厅设置）发出去。
   * 座位换算：服务器座位 0..3 → 我这边的位置（我永远在下方 0，下家 1、对家 2、上家 3）。
   * 别家的手牌只知道张数：镜像局面里用 HIDDEN 占位，亮出的牌按真牌放进去；轮到他出某张时把一个占位换成那张再交给规则引擎。
   * 播完事件后和快照对一遍（手牌 / 轮到谁 / 第几轮），对不上就按快照直接重画——断线、漏消息都靠这个自愈。 */

  const NET = window.GongzhuNet || null;
  let online = null;   // { code, token, st, mySeat, applied, queue, pending, idle, inGame, readySent, skew, stopped }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
  const srv = (l) => (l + online.mySeat) % 4;
  const loc = (s) => (s - online.mySeat + 4) % 4;
  const rot = (arr) => [0, 1, 2, 3].map((l) => arr[srv(l)]);
  function playerAt(s) { return online && online.st ? online.st.players.find((p) => p.seat === s) || null : null; }
  function isHost() { return !!(online && online.st && online.st.hostId === online.st.me); }
  function onlineAuto() { const g = online && online.st && online.st.game; return !!(g && g.auto[online.mySeat]); }
  /* 头像：联机里每人有服务器分的矢量头像（见 gongzhu-avatars.js），记作 'svg:<编号>'；
   * 单机的「我 / 上 / 对 / 下」、老房间没头像的人仍是一个字 */
  function avatarOf(p) {
    if (!p) return '+';
    if (p.avatar && window.GongzhuAvatars && GongzhuAvatars.byId[p.avatar]) return 'svg:' + p.avatar;
    return [...String(p.nick)][0] || '?';
  }
  function seatIsBot(l) {
    const p = playerAt(srv(l));
    const g = online.st.game;
    return !p || p.isAi || p.left || !!(g && g.auto[srv(l)]);
  }

  function toast(text) {
    let el = $('gzToast');
    if (!el) { el = document.createElement('div'); el.id = 'gzToast'; el.className = 'gz-toast'; el.setAttribute('role', 'status'); els.app.appendChild(el); }
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* 进入联机：先停掉单机这一盘（存档还在，离开房间时接着打） */
  function startOnline(st, tok, joined) {
    if (match && !match.online && !match.tutorial) save();
    token++;
    stopClock(); hideCoach(); closeDialog();
    setAutopilot(false);
    online = { code: st.code, token: tok, st: null, mySeat: st.mySeat, applied: 0, queue: [], pending: -1, idle: true, inGame: false, readySent: false, skew: 0, stopped: false, joinRules: !!joined, seenCfg: null, sheetBase: null, base: null, ops: [], pumping: false };
    NET.writeSession({ code: st.code, token: tok });
    try { const u = new URL(location.href); u.searchParams.set('room', st.code); history.replaceState(null, '', u); } catch (_) { /* ignore */ }
    els.app.classList.add('is-online');
    onState(st);
    pollLoop(online);
  }

  function leaveOnline(msg, sendLeave) {
    const my = online;
    if (!my) return;
    if (sendLeave) NET.act(my.code, my.token, 'leave', {}).catch(() => {});
    my.stopped = true;
    online = null;
    NET.writeSession(null);
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u); } catch (_) { /* ignore */ }
    token++;
    stopClock(); closeDialog();
    busy = false; selected = -1; exposePick = []; flying = null;
    els.app.classList.remove('is-online', 'is-lobby');
    $('gzLobby').hidden = true;
    NAMES = SOLO_NAMES.slice();
    AVATARS = SOLO_AVATARS.slice();
    buildSeats();
    resumeSolo(true);
    if (msg) toast(msg);
  }

  async function pollLoop(my) {
    let fails = 0;
    while (online === my && !my.stopped) {
      try {
        const res = await NET.state(my.code, my.token, my.st ? my.st.version : 0);
        fails = 0;
        if (online !== my) return;
        onState(res.state);
      } catch (e) {
        if (online !== my) return;
        if (e.status === 401 || e.status === 404) { leaveOnline('房间已经解散了'); return; }
        fails++;
        if (fails === 3) toast('网络不太稳，正在重连…');
        await new Promise((r) => setTimeout(r, Math.min(8000, 800 * fails)));
      }
    }
  }

  async function onlineAct(action, body) {
    const my = online;
    if (!my) return null;
    try {
      const res = await NET.act(my.code, my.token, action, body || {});
      if (online === my && res && res.state) onState(res.state);
      return res;
    } catch (e) {
      if (online !== my) return null;
      toast(NET.message(e));
      if (e.status === 401 || e.status === 404) { leaveOnline(); return null; }
      if (my.pending >= 0) my.pending = -1;
      if (action === 'expose') { my.exposeSent = null; exposeHeld = []; }   // 没送到：让我重新表态
      if (my.inGame && my.st && my.st.game) resync();
      return null;
    }
  }

  /* 收到一份房间视图（长轮询或自己动作的回应） */
  function onState(st) {
    if (!online || !st || st.code !== online.code) return;
    if (online.st && st.version < online.st.version) return;   // 迟到的旧视图
    online.base = st;
    online.st = st.phase === 'lobby' ? withOps(st) : st;
    online.skew = st.serverNow - Date.now();
    const me = st.players.find((p) => p.id === st.me);
    if (!me || me.left || st.mySeat < 0) { leaveOnline('你已经不在这个房间里了'); return; }
    online.mySeat = st.mySeat;
    NAMES = [0, 1, 2, 3].map((l) => (l === 0 ? '我' : (playerAt(srv(l)) || { nick: '空位' }).nick));
    AVATARS = [0, 1, 2, 3].map((l) => avatarOf(l === 0 ? me : playerAt(srv(l))));
    if (st.phase === 'lobby') { renderLobby(); return; }
    online.joinRules = false;
    const gv = st.game;
    if (!online.inGame || !match || !match.online || match.lobby || match.matchNo !== gv.matchNo) { enterGameView(); resync(); return; }
    const last = online.queue.length ? online.queue[online.queue.length - 1].n : online.applied;
    if (gv.seq < online.applied) { resync(); return; }
    const fresh = gv.log.filter((e) => e.n > last);
    if (fresh.length && fresh[0].n !== last + 1) { resync(); return; }
    online.queue.push(...fresh);
    renderOnlineBadges();
    if (online.idle) onlineStep();
    updateSettleWaiting();
  }

  function enterGameView() {
    online.inGame = true;
    if (els.dialog.querySelector('[data-sheet="rules"]')) closeDialog();
    els.app.classList.remove('is-lobby');
    $('gzLobby').hidden = true;
    buildSeats();
  }

  /* 按快照直接画出当前局面（不播动画）：刚进来、断线回来、或者播完对不上时 */
  function resync() {
    const gv = online.st.game;
    token++;
    stopClock();
    flying = null; busy = true; selected = -1; exposePick = [];
    if (online.exposeSent !== exposeKey(gv)) exposeHeld = [];
    online.queue = []; online.applied = gv.seq; online.pending = -1;
    const ended = gv.phase === 'round_end' || gv.phase === 'match_end';
    match = {
      online: true, matchNo: gv.matchNo, rules: gv.rules, totals: rot(gv.totals), roundNo: gv.roundNo,
      round: ended || !gv.round ? null : mirrorFromSnapshot(gv), exposing: [],
      last: gv.last ? { roundNo: gv.last.roundNo, scores: rot(gv.last.scores), captured: rot(gv.last.captured), ctx: gv.last.ctx } : null,
      over: gv.phase === 'match_end', losers: (gv.losers || []).map(loc), tutorial: false,
    };
    closeDialog();
    renderAll();
    renderOnlineBadges();
    if (ended && match.last) { online.readySent = !!(gv.ready && gv.ready[online.mySeat]); showSettlement(); }
    onlineIdle();
  }

  /* 别家没亮的手牌用占位 HIDDEN 顶着（只用来数张数）。占位必须不属于任何花色：
   * 早先用 -1，可 suitOf(-1) 算出来是 0（♠）——♠ 领出时别家垫牌，规则引擎以为他手里还有 ♠、判「必须跟牌」，
   * 这一手就对不上、整桌按快照重画（这一轮的收牌动画直接跳过，看着像牌被别人吃了）。 */
  const HIDDEN = 52;

  function mirrorFromSnapshot(gv) {
    const v = gv.round;
    const exposed = v.exposed.map(([c, s]) => [c, loc(s)]);
    const hands = [0, 1, 2, 3].map((l) => {
      if (l === 0) return v.hand.slice();
      const known = exposed.filter(([c, o]) => o === l && !v.played[c]).map(([c]) => c);
      return known.concat(new Array(Math.max(0, v.counts[srv(l)] - known.length)).fill(HIDDEN));
    });
    const r = R.createRound(hands, loc(v.leader), v.mustLead, gv.rules);
    Object.assign(r, {
      exposed, led: v.led.slice(), firstOfSuit: v.firstOfSuit, turn: loc(v.turn), trickNo: v.trickNo,
      trick: v.trick.map((p) => ({ seat: loc(p.seat), card: p.card })),
      captured: rot(v.captured).map((c) => c.slice()),
      history: v.history.map((h) => ({ leader: loc(h.leader), winner: loc(h.winner), plays: h.plays.map((p) => ({ seat: loc(p.seat), card: p.card })) })),
      voids: rot(v.voids).map((x) => x.slice()),
      pigTaker: v.pigTaker < 0 ? -1 : loc(v.pigTaker),
      played: v.played.slice(),
    });
    return r;
  }

  /* 别家打出某张牌之前：把一个占位换成这张牌，规则引擎才认 */
  function ensureCard(r, l, c) {
    if (l === 0) return;
    const h = r.hands[l];
    if (h.includes(c)) return;
    const i = h.indexOf(HIDDEN);
    if (i >= 0) h[i] = c; else h.push(c);
  }

  function sameAsSnapshot(r, gv) {
    const v = gv.round;
    if (!v) return true;
    const a = r.hands[0].slice().sort((x, y) => x - y).join();
    const b = v.hand.slice().sort((x, y) => x - y).join();
    return a === b && r.trickNo === v.trickNo && r.trick.length === v.trick.length && r.turn === loc(v.turn);
  }

  // 一条事件出错就整体按快照重画，不让一处对不上卡死整桌
  function safely(fn) { return () => { try { fn(); } catch (e) { console.warn('[gongzhu] 联机事件对不上，按快照重画', e); resync(); } }; }

  function onlineStep() {
    if (!online || !match || !match.online || match.lobby) return;
    const ev = online.queue.shift();
    if (!ev) { onlineIdle(); return; }
    online.idle = false;
    online.applied = ev.n;
    stopClock();
    safely(() => {
      const r = match.round;
      if (ev.t === 'deal') {
        closeDialog();
        const gv = online.st.game;
        const blank = () => new Array(13).fill(HIDDEN);
        match.roundNo = ev.roundNo; match.over = false; match.losers = [];
        match.round = R.createRound([gv.dealt.slice(), blank(), blank(), blank()], loc(ev.leader), ev.mustLead, match.rules);
        match.exposing = [];
        selected = -1; exposePick = []; exposeHeld = []; busy = true; online.readySent = false;
        renderAll();
        snd('deal');
        schedule(step, 450);
        return;
      }
      if (!r) { resync(); return; }
      if (ev.t === 'expose') {
        for (const [c, s] of ev.exposed) { const l = loc(s); ensureCard(r, l, c); R.expose(r, l, c); }
        match.exposing = []; exposeHeld = [];
        renderSeats(); renderHand();
        ev.exposed.forEach((_, i) => snd('stamp', i * 160));
        schedule(step, 900);
        return;
      }
      if (ev.t === 'play') {
        const l = loc(ev.seat);
        if (l === 0 && online.pending === ev.card) { online.pending = -1; schedule(step, 0); return; }   // 我刚出的，已经先播过了
        if (l === 0) { online.pending = -1; selected = -1; }
        ensureCard(r, l, ev.card);
        schedule(safely(() => commit(l, ev.card)), l === 0 ? 0 : seatIsBot(l) ? pace().aiMin : 160);
        return;
      }
      if (ev.t === 'round') {
        const gv = online.st.game;
        match.totals = rot(ev.totals);
        match.last = { roundNo: ev.roundNo, captured: r.captured.map((c) => c.slice()), scores: rot(ev.scores), ctx: R.scoreCtx(r) };
        match.round = null;
        match.over = gv.phase === 'match_end' && gv.roundNo === ev.roundNo;
        match.losers = match.over ? (gv.losers || []).map(loc) : [];
        online.readySent = false;
        renderOnlineBadges();
        // 和单机一样：等最后一轮的本局分翻完，再在桌上把累计分数完，停一下才出结算页
        schedule(() => settleOnTable(() => { roundEndSound(match.last.scores[0]); showSettlement(); step(); }), pace().roundEnd);
        return;
      }
      schedule(step, 0);   // trick：收牌动画在第四张牌的 commit 里已经播了
    })();
  }

  /* 事件播完了：按快照决定现在能不能动、钟走给谁 */
  function onlineIdle() {
    online.idle = true;
    const gv = online.st && online.st.game;
    if (!gv || !match || !match.online) return;
    if (gv.phase === 'match_end' && !match.over && !match.round) {   // 「不设终点」被房主叫停
      match.over = true;
      match.losers = (gv.losers || []).map(loc);
      if (!els.mask.hidden) showSettlement();
    }
    if (online.pending >= 0) { busy = true; renderHand(); return; }   // 等服务器确认我刚出的牌
    const r = match.round;
    if (!r) { updateSettleWaiting(); return; }
    if (!sameAsSnapshot(r, gv)) { resync(); return; }
    if (gv.phase === 'expose') {
      // 每个真人都要表态（没有可明的牌也点一下「不明牌」），亮牌阶段长短才不会泄露谁有特殊牌
      // 我已经点过（请求还在路上）：服务器在收到之前发出的快照仍写着「没表态」，不能凭它再把按钮弹出来
      const mine = !!(gv.expose && !gv.expose.decided) && online.exposeSent !== exposeKey(gv);
      match.exposing = mine ? [0] : [];
      busy = !mine;
      renderSeats(); renderHand();
      if (mine) { startClock(0, null, remainMs(gv)); dingMyTurn(); }
      return;
    }
    match.exposing = [];
    if (gv.phase !== 'playing') return;
    busy = !(r.turn === 0 && gv.legal.length > 0);
    renderSeats(); renderHand();
    startClock(r.turn, null, remainMs(gv));
    if (!busy) dingMyTurn();
  }
  function exposeKey(gv) { return gv.matchNo + ':' + gv.roundNo; }
  // 倒计时还剩多久：服务器的截止时刻（出牌时它比我这边多等 3 秒，先让我自己的钟走完）
  function remainMs(gv) {
    if (!gv.deadline) return 0;
    const left = gv.deadline - (Date.now() + online.skew) - (gv.phase === 'playing' ? 3000 : 0);
    return Math.min(Math.max(left, 0), Math.max(gv.turnSec, 15) * 1000);
  }

  function onlinePlaySelected() {
    if (exposingMe()) {
      if (busy) return;
      const cards = exposePick.slice();
      busy = true; match.exposing = []; exposePick = []; exposeHeld = cards.slice();
      online.exposeSent = exposeKey(online.st.game);
      stopClock(); renderHand();
      onlineAct('expose', { cards });
      return;
    }
    const r = match.round;
    if (busy || !r || r.turn !== 0 || selected < 0 || !R.legalFor(r, 0).includes(selected)) return;
    const card = selected;
    busy = true;
    online.idle = false;
    online.pending = card;
    commit(0, card);   // 先在本地打出去（不等网络），服务器确认后那条出牌事件就跳过
    onlineAct('play', { card });
  }

  /* 牌桌上的名字 / 头像 / 状态小签：掉线、已离开（机器人代打）；托管是头像右下角的小机器人 */
  function renderOnlineBadges() {
    if (!online || !online.inGame) return;
    const g = online.st.game;
    for (let l = 0; l < 4; l++) {
      const p = playerAt(srv(l));
      const el = els.seats[l];
      const name = el.querySelector('.gz-name');
      if (name && name.textContent !== NAMES[l]) name.textContent = NAMES[l];
      const face = el.querySelector('.gz-av-face');
      if (face && face.dataset.v !== AVATARS[l]) { face.innerHTML = faceHtml(AVATARS[l]); face.dataset.v = AVATARS[l]; }
      const line = el.querySelector('.gz-name-line');
      let tag = line && line.querySelector('.gz-tag');
      // 托管不写字：和我自己托管一样，头像右下角挂一枚小机器人
      const auto = !!(p && !p.left && g && g.auto[p.seat]);
      // 机器人不再把档位写进名字：名字旁边一个小签写「入门 / 普通 / 高手」
      const text = !p ? '' : p.left ? '已离开' : auto ? '' : p.isAi ? TIER_LABELS[p.aiLevel] || '' : !p.online ? '掉线' : '';
      if (line && !tag && text) { tag = document.createElement('span'); tag.className = 'gz-tag'; line.appendChild(tag); }
      if (tag) { tag.textContent = text; tag.hidden = !text; tag.classList.toggle('is-level', !!(p && p.isAi && !p.left)); }
      el.classList.toggle('is-auto', auto);
      if (l > 0) { if (auto) el.setAttribute('aria-label', NAMES[l] + '（托管中）'); else el.removeAttribute('aria-label'); }
    }
  }

  /* ───── 联机 · 结算页 ───── */

  function onlineSettleActions() {
    if (match.over) {
      return isHost() ? '<button type="button" class="gz-btn gz-btn-primary" data-act="rematch" data-autofocus>回到房间</button>'
        : '<span class="gz-wait" data-wait>等房主回到房间…</span>';
    }
    return (isHost() && match.rules.end === 'none' ? '<button type="button" class="gz-btn" data-act="end-match">结束这一盘</button>' : '') +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="ready" data-autofocus' + (online.readySent ? ' disabled' : '') + '>' +
      (online.readySent ? waitingText() : '下一局') + '</button>';
  }
  function waitingText() {
    const g = online.st.game;
    if (!g || !g.ready) return '等其他人…';
    const names = [0, 1, 2, 3].filter((s) => !g.ready[s]).map((s) => (playerAt(s) || { nick: '' }).nick).filter(Boolean);
    return names.length ? '等' + names.join('、') + '…' : '马上开始…';
  }
  function bindOnlineSettle(d) {
    d.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'ready') { online.readySent = true; b.disabled = true; b.textContent = waitingText(); onlineAct('ready'); }
      if (act === 'end-match') { if (confirm('现在结束这一盘？按累计分排名，不评猪。')) onlineAct('end_match'); }
      if (act === 'rematch') onlineAct('rematch');
    }));
  }
  function updateSettleWaiting() {
    if (!online || els.mask.hidden) return;
    const b = els.dialog.querySelector('[data-act="ready"]');
    if (b && online.readySent) b.textContent = waitingText();
    if (match && match.over && !els.dialog.querySelector('[data-act="rematch"], [data-wait]') && els.dialog.querySelector('.gz-res')) showSettlement();
  }

  /* ───── 联机 · 大厅（就用牌桌本身：四个座位在原位，中间是房号 / 邀请 / 规则 / 开始） ───── */

  let lobbyQrCode = '';
  function renderLobby() {
    const st = online.st;
    if (online.inGame) { online.inGame = false; token++; stopClock(); closeDialog(); }
    match = { online: true, lobby: true, rules: st.config.rules, totals: [0, 0, 0, 0], roundNo: 0, round: null, exposing: [], last: null, over: false, losers: [] };
    busy = true; selected = -1; flying = null;
    els.app.classList.add('is-online', 'is-lobby');
    els.hand.innerHTML = '';
    els.slots.forEach((x) => { x.innerHTML = ''; });
    els.play.disabled = true;
    els.roundNo.textContent = '房间 ' + st.code;
    const host = isHost();
    for (let l = 0; l < 4; l++) {
      const p = playerAt(srv(l));
      const el = els.seats[l];
      el.classList.remove('is-turn', 'is-timed', 'is-hurry', 'is-auto');
      el.innerHTML = p
        ? '<button type="button" class="gz-lobby-seat' + (p.pending ? ' is-pending' : '') + '" data-lseat="' + l + '"' + (l === 0 ? ' disabled' : '') + '>' +
          '<span class="gz-avatar' + (p.isAi ? ' is-bot' : '') + '"><span class="gz-av-face">' + faceHtml(avatarOf(p)) + '</span></span>' +
          '<span class="gz-lobby-name">' + esc(p.nick) + (l === 0 ? '（我）' : '') + '</span>' +
          (p.id === st.hostId ? '<span class="gz-tag is-host">房主</span>' : '') +
          (p.isAi ? '<span class="gz-tag is-level">' + (TIER_LABELS[p.aiLevel] || '') + '</span>' : '') +
          (!p.isAi && !p.online ? '<span class="gz-tag">掉线</span>' : '') + '</button>'
        : '<button type="button" class="gz-lobby-seat is-empty" data-lseat="' + l + '">' +
          '<span class="gz-avatar"><span class="gz-av-face">+</span></span><span class="gz-lobby-name">空位</span>' +
          '<span class="gz-lobby-hint">' + (host ? '加机器人' : '坐这里') + '</span></button>';
    }
    const box = $('gzLobby');
    box.hidden = false;
    box.querySelector('.gz-lobby-code b').textContent = st.code;
    const qr = box.querySelector('.gz-lobby-qr');
    if (lobbyQrCode !== st.code && window.GamesShell && GamesShell.QR) {
      lobbyQrCode = st.code;
      GamesShell.QR.render(qr, NET.inviteUrl(st.code), { scale: 3, margin: 2, dark: '#1d1b18', light: '#fbf8f1' });
    }
    box.querySelector('[data-lb="rules"]').textContent = host ? '自定义规则' : '查看规则';
    const missing = 4 - st.players.length;
    const start = box.querySelector('[data-lb="start"]');
    start.hidden = !host;
    start.disabled = missing > 0;
    box.querySelector('.gz-lobby-wait').textContent = host
      ? (missing > 0 ? '还差 ' + missing + ' 人，空位可以加机器人' : '人齐了，可以开始')
      : '等房主开始';
    guestRulesCheck(st);
  }

  /* ───── 大厅里房主的机器人操作：先画上去，再排队慢慢发 ─────
   * 加 / 移除 / 换档机器人只有房主能做，结果房主自己说了算，所以点了就直接画出来（乐观更新），不等服务器那一两秒。
   * 规矩：
   *  · 操作按点的顺序排队，一次只发一条，上一条回来了才发下一条——服务器看到的顺序和房主点的一模一样；
   *  · 画面 = 服务器最新视图 + 队列里还没确认的操作（withOps），轮询中途送来的旧视图不会把刚加的机器人「闪掉」；
   *  · 还没发出去的「加」被「移除」：两条互相抵消，都不发；还没发出去的「加」被换档：直接改那条「加」的档位；
   *  · 某条被服务器拒了（比如那个空位刚好有人坐进来）：提示一下，丢掉它和后面同一座位的操作，画面回到服务器的样子；
   *  · 「开始」也排进这条队，等前面的机器人都确认了才发，不会因为人还没凑齐被拒。 */
  function withOps(st) {
    const ops = online && online.ops;
    if (!ops || !ops.length) return st;
    let players = st.players.slice();
    for (const { action, body } of ops) {
      if (action === 'add_ai' && !players.some((p) => p.seat === body.seat)) {
        players.push({ id: 'pending_' + body.seat, nick: '机器人', seat: body.seat, isAi: true, aiLevel: body.level, online: true, avatar: 'bot-navy', pending: true });
      } else if (action === 'remove_ai') {
        players = players.filter((p) => !(p.seat === body.seat && p.isAi));
      } else if (action === 'set_ai') {
        players = players.map((p) => (p.seat === body.seat && p.isAi ? Object.assign({}, p, { aiLevel: body.level }) : p));
      }
    }
    return Object.assign({}, st, { players });
  }
  function redrawLobby() {
    if (!online || !online.base || online.base.phase !== 'lobby') return;
    online.st = withOps(online.base);
    renderLobby();
  }
  function lobbyOp(action, body) {
    const my = online;
    if (!my) return;
    body = Object.assign({}, body || {});
    const unsent = (a, seat) => my.ops.findIndex((o) => !o.sent && o.action === a && o.body.seat === seat);
    if (action === 'remove_ai' && unsent('add_ai', body.seat) >= 0) {
      my.ops = my.ops.filter((o) => o.sent || o.body.seat !== body.seat);
      redrawLobby();
      return;
    }
    if (action === 'set_ai') {
      const i = unsent('add_ai', body.seat);
      if (i >= 0) { my.ops[i].body.level = body.level; redrawLobby(); return; }
    }
    if (action === 'start' && my.ops.some((o) => o.action === 'start')) return;
    my.ops.push({ action, body, sent: false });
    redrawLobby();
    pumpOps(my);
  }
  async function pumpOps(my) {
    if (my.pumping) return;
    my.pumping = true;
    while (online === my && my.ops.length) {
      const op = my.ops[0];
      op.sent = true;
      const res = await onlineAct(op.action, op.body);
      if (online !== my) break;
      my.ops.shift();
      if (!res) my.ops = my.ops.filter((o) => o.action !== 'start' && (op.body.seat == null || o.body.seat !== op.body.seat));
      redrawLobby();
    }
    my.pumping = false;
  }

  function showSeatMenu(l) {
    const s = srv(l);
    const p = playerAt(s);
    const host = isHost();
    let body = '';
    const acts = [];
    if (!p) {
      if (host) body += '<div class="gz-field-label">加一个机器人</div><div class="gz-seg" role="group">' +
        TIER_ORDER.map((k) => '<button type="button" data-ai="' + k + '">' + TIER_LABELS[k] + '</button>').join('') + '</div>';
      acts.push('<button type="button" class="gz-btn" data-seat-act="sit">我坐这里</button>');
    } else if (p.isAi) {
      if (host) {
        body += '<div class="gz-field-label">机器人水平</div><div class="gz-seg" role="group">' +
          TIER_ORDER.map((k) => '<button type="button" data-set-ai="' + k + '" aria-pressed="' + (p.aiLevel === k) + '">' + TIER_LABELS[k] + '</button>').join('') + '</div>';
        acts.push('<button type="button" class="gz-btn" data-seat-act="remove">移除机器人</button>');
      }
      acts.push('<button type="button" class="gz-btn" data-seat-act="sit">和它换座</button>');
    } else if (host) {
      acts.push('<button type="button" class="gz-btn" data-seat-act="kick">请' + esc(p.nick) + '离开</button>');
    }
    if (!body && !acts.length) return;
    openDialog('<h2>' + (p ? esc(p.nick) : '空位') + '</h2>' + body +
      '<div class="gz-actions">' + acts.join('') + '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('[data-ai]').forEach((b) => b.addEventListener('click', () => { closeDialog(); lobbyOp('add_ai', { seat: s, level: b.dataset.ai }); }));
        d.querySelectorAll('[data-set-ai]').forEach((b) => b.addEventListener('click', () => {
          d.querySelectorAll('[data-set-ai]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          lobbyOp('set_ai', { seat: s, level: b.dataset.setAi });
        }));
        d.querySelectorAll('[data-seat-act]').forEach((b) => b.addEventListener('click', () => {
          closeDialog();
          const a = b.dataset.seatAct;
          if (a === 'sit') lobbyOp('sit', { seat: s });   // 也排队：和刚加、还没确认的机器人换座，得等它先落座
          if (a === 'remove') lobbyOp('remove_ai', { seat: s });
          if (a === 'kick') lobbyOp('kick', { pid: p.id });
        }));
      });
  }

  // 剪贴板接口用不了（部分微信内置浏览器）：退回老办法 execCommand；再不行才弹框让人手动复制
  async function copyText(text, done) {
    try { await navigator.clipboard.writeText(text); toast(done); return; } catch (_) { /* 往下试 */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
    ta.remove();
    if (ok) toast(done); else prompt('复制下面这段发给朋友：', text);
  }

  /* 房间设置：邀请、看 / 改规则、离开房间 */
  function showRoomDialog() {
    const st = online.st;
    const editable = st.phase === 'lobby' && isHost();
    openDialog('<h2>房间 ' + st.code + '</h2>' +
      '<div class="gz-actions gz-actions-start"><button type="button" class="gz-btn" data-act="copy-link">复制邀请链接</button>' +
      '<button type="button" class="gz-btn" data-act="copy-code">复制房号</button>' +
      '<button type="button" class="gz-btn" data-act="rules">' + (editable ? '自定义规则' : '查看规则') + '</button></div>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="leave">离开房间</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="copy-link"]').addEventListener('click', () => copyText(NET.inviteUrl(st.code), '邀请链接已复制'));
        d.querySelector('[data-act="copy-code"]').addEventListener('click', () => copyText(st.code, '房号已复制'));
        d.querySelector('[data-act="rules"]').addEventListener('click', () => showRoomRules('view'));
        d.querySelector('[data-act="leave"]').addEventListener('click', () => {
          const inGame = st.phase !== 'lobby';
          if (!confirm(inGame ? '离开房间？你的座位会交给机器人接着打。' : '离开房间？')) return;
          leaveOnline(null, true);
        });
      });
  }

  /* 房间规则：大厅里不再摆规则，全收在这一页。
   * 房主（大厅里）= 编辑，攒好一次「保存」才发出去（其他人只收到一次通知）；
   * 其他人 / 开局后 = 只读清单。kind：view 自己点开 · join 刚进房间 · changed 房主改了规则（改过的几行标出来）。
   * 不搞全体同意：不同意就在这一页「退出房间」。 */
  const ROOM_RULE_ROWS = [['turnSec', '出牌限时', [[20, '20 秒'], [30, '30 秒'], [0, '不限时']]]].concat(RULE_UI);
  const cfgVal = (cfg, k) => (k === 'turnSec' ? cfg.turnSec | 0 : cfg.rules[k]);
  const cfgText = (cfg, k, opts) => { const o = opts.find(([v]) => v === cfgVal(cfg, k)); return o ? o[1] : String(cfgVal(cfg, k)); };
  const cfgKey = (cfg) => JSON.stringify(ROOM_RULE_ROWS.map(([k]) => cfgVal(cfg, k)));

  function showRoomRules(kind, base) {
    const st = online.st;
    const cfg = st.config;
    if (st.phase === 'lobby' && isHost()) { editRoomRules(); return; }
    online.sheetBase = base || null;
    const rows = ROOM_RULE_ROWS.map(([k, label, opts]) => {
      const changed = base && cfgVal(base, k) !== cfgVal(cfg, k);
      return '<div class="gz-rl-row' + (changed ? ' is-changed' : '') + '"><span class="gz-rl-k">' + label + '</span>' +
        '<span class="gz-rl-v">' + esc(cfgText(cfg, k, opts)) + (changed ? '<small>原来：' + esc(cfgText(base, k, opts)) + '</small>' : '') + '</span></div>';
    }).join('');
    const title = kind === 'changed' ? '房主改了规则' : '房间 ' + st.code + ' 的规则';
    const asking = kind === 'join' || kind === 'changed';
    openDialog('<h2>' + title + '</h2><div class="gz-rulelist" data-sheet="rules" data-kind="' + kind + '">' + rows + '</div>' +
      (st.phase === 'lobby' ? '<p class="gz-note">只有房主可以改规则</p>' : '') +
      '<div class="gz-actions">' + (asking ? '<button type="button" class="gz-btn" data-act="leave">退出房间</button>' : '') +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>' + (kind === 'join' ? '继续' : '好') + '</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', () => { online.sheetBase = null; closeDialog(); });
        const lv = d.querySelector('[data-act="leave"]');
        if (lv) lv.addEventListener('click', () => leaveOnline(null, true));
      });
  }

  function editRoomRules() {
    const st = online.st;
    const draft = { turnSec: st.config.turnSec | 0, rules: Object.assign({}, st.config.rules) };
    const others = st.players.some((p) => !p.isAi && p.id !== st.me && !p.left);
    openDialog('<h2>自定义规则</h2>' +
      ROOM_RULE_ROWS.map(([k, label, opts]) => '<div class="gz-field-label">' + label + '</div><div class="gz-seg' + (opts.length > 3 ? ' is-4' : '') + '" role="group">' +
        opts.map(([v, t], i) => '<button type="button" data-rk="' + k + '" data-ri="' + i + '" aria-pressed="' + (cfgVal(draft, k) === v) + '">' + t + '</button>').join('') + '</div>').join('') +
      (others ? '<p class="gz-note">保存后，房间里的其他人会看到改了哪几条</p>' : '') +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="save" data-autofocus>保存</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('[data-rk]').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.rk;
          const v = ROOM_RULE_ROWS.find((x) => x[0] === k)[2][+b.dataset.ri][0];
          if (k === 'turnSec') draft.turnSec = v; else draft.rules[k] = v;
          d.querySelectorAll('[data-rk="' + k + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        d.querySelector('[data-act="save"]').addEventListener('click', () => {
          closeDialog();
          const cur = online.st.config;
          const config = {};
          if (draft.turnSec !== (cur.turnSec | 0)) config.turnSec = draft.turnSec;
          const rules = {};
          RULE_UI.forEach(([k]) => { if (draft.rules[k] !== cur.rules[k]) rules[k] = draft.rules[k]; });
          if (Object.keys(rules).length) config.rules = rules;
          if (Object.keys(config).length) onlineAct('config', { config });
        });
      });
  }

  /* 不是房主：刚进房间先看一眼规则；之后房主每改一次，弹一次「改了哪几条」 */
  function guestRulesCheck(st) {
    if (isHost()) { online.seenCfg = st.config; return; }
    if (online.joinRules) { online.joinRules = false; online.seenCfg = st.config; showRoomRules('join'); return; }
    if (!online.seenCfg) { online.seenCfg = st.config; return; }
    if (cfgKey(online.seenCfg) === cfgKey(st.config)) return;
    const open = els.dialog.querySelector('[data-sheet="rules"]');
    const base = open && online.sheetBase ? online.sheetBase : online.seenCfg;
    online.seenCfg = st.config;
    showRoomRules(open && open.dataset.kind === 'join' ? 'join' : 'changed', base);
  }

  /* 入口：起个昵称，创建房间或输房号加入 */
  function showOnlineEntry(code) {
    if (!NET) return;
    if (match && match.tutorial) { toast('先打完或跳过教程，再开联机'); return; }
    const ident = window.GamesShell && GamesShell.Identity;
    const nick = (ident && ident.getNick && ident.getNick()) || '';
    openDialog('<h2>联机对局</h2>' +
      '<div class="gz-field-label">你的昵称</div><input class="gz-input" data-nick maxlength="12" autocomplete="nickname" value="' + esc(nick) + '" placeholder="可以不填，随机起一个">' +
      '<div class="gz-field-label">' + (code ? '朋友邀请你加入房间' : '加入朋友的房间') + '</div>' +
      '<div class="gz-join-row"><input class="gz-input" data-code inputmode="numeric" maxlength="4" placeholder="4 位房号" value="' + esc(code || '') + '">' +
      '<button type="button" class="gz-btn' + (code ? ' gz-btn-primary' : '') + '" data-act="join"' + (code ? ' data-autofocus' : '') + '>加入</button></div>' +
      '<p class="gz-note gz-err" data-err hidden></p>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
      '<button type="button" class="gz-btn' + (code ? '' : ' gz-btn-primary') + '" data-act="create"' + (code ? '' : ' data-autofocus') + '>创建新房间</button></div>',
      (d) => {
        const err = d.querySelector('[data-err]');
        const nickIn = d.querySelector('[data-nick]');
        const codeIn = d.querySelector('[data-code]');
        const fail = (text) => { err.textContent = text; err.hidden = false; d.querySelectorAll('[data-act]').forEach((b) => { b.disabled = false; }); };
        const takeNick = () => {
          const v = nickIn.value.trim();
          if (!v) return '';   // 不填：服务器从昵称库里随机起一个
          if ([...v].length > 12 || /[<>&"'/\\]/.test(v)) { fail('昵称最多 12 个字，不能有特殊符号'); nickIn.focus(); return null; }
          if (ident && ident.setNick) ident.setNick(v);
          return v;
        };
        const go = async (fn, joined) => {
          err.hidden = true;
          d.querySelectorAll('[data-act]').forEach((b) => { b.disabled = true; });
          try {
            const res = await fn();
            startOnline(res.state, res.token, joined);
          } catch (e) { fail(NET.message(e)); }
        };
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="create"]').addEventListener('click', () => {
          const v = takeNick();
          if (v !== null) go(() => NET.create(v, { rules: settings.rules, turnSec: settings.turnSec | 0 }));
        });
        const join = () => {
          const v = takeNick();
          if (v === null) return;
          const c = codeIn.value.trim();
          if (!/^\d{4}$/.test(c)) { fail('房号是 4 位数字'); codeIn.focus(); return; }
          go(() => NET.join(c, v), true);
        };
        d.querySelector('[data-act="join"]').addEventListener('click', join);
        codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); join(); } });
        if (!nick) setTimeout(() => nickIn.focus(), 0);
      });
  }

  // 刷新 / 重新打开页面：上次的房间还在就接回去
  async function resumeOnline(sess) {
    try {
      const res = await NET.state(sess.code, sess.token, 0);
      startOnline(res.state, sess.token);
      return true;
    } catch (_) {
      NET.writeSession(null);
      return false;
    }
  }


  /* ───── 启动 ───── */

  els.play.addEventListener('click', playSelected);
  $('gzRulesBtn').addEventListener('click', showRules);
  $('gzSoundBtn').addEventListener('click', toggleSoundPanel);
  refreshSoundBtn();
  $('gzRoundInfo').addEventListener('click', () => { if (!match.tutorial) showTotals(); });
  $('gzSkipTut').addEventListener('click', () => { if (match.tutorial) endTutorial(); });
  // 教程讲解时点牌桌任意处继续（顶栏按钮、弹窗照常）
  els.app.addEventListener('click', (e) => {
    if (!coachNext || e.target.closest('.gz-topbar') || !els.mask.hidden) return;
    coachAdvance();
  });
  // 点自己的头像：进入托管（机器人替我打）；托管中再点一下收回。教程、动画预览、大厅里不管
  els.seats[0].addEventListener('click', (e) => {
    if (!e.target.closest('.gz-avatar') || !match || match.tutorial || match.demo || match.lobby || AUTO) return;
    if (match.online) {
      if (!online || !online.inGame || !match.round) return;
      const on = !onlineAuto();
      onlineAct('auto', { on });
      if (on) toast('托管中：机器人替你出牌。点头像或手牌收回');
      return;
    }
    if (autopilot) { setAutopilot(false); return; }
    if (!match.round) return;
    setAutopilot(true);
    takeOverNow();
    toast('托管中：机器人替你出牌。点头像或手牌收回');
  });
  // 点弹窗外面关掉（见 openDialog）
  els.mask.addEventListener('click', (e) => { if (e.target === els.mask) dismissDialog(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.mask.hidden) dismissDialog();
    if ((e.key === ' ' || e.key === 'Enter') && els.mask.hidden && coachNext) { e.preventDefault(); coachAdvance(); return; }
    if (e.key === 'Enter' && els.mask.hidden) playSelected();
  });
  // 窗口变了：防抖后重算尺寸（用 setTimeout 不用 rAF，后台页也会重算）
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      solveSize(); if (match) renderHand();
      // 转屏时浏览器的布局常常晚一拍才稳定，过一会儿再量一次
      resizeTimer = setTimeout(() => { solveSize(); if (match) renderHand(); }, 320);
    }, 80);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  // 输完收起键盘：补量一次（输入时跳过了）
  document.addEventListener('focusout', () => { if (!typing()) onResize(); });

  /* 单机：接着上次的存档打；没有存档就开一盘（第一次来先问要不要学）。quiet = 从联机房间回来，不再问教程 */
  // 存档自检：任何一张牌在手牌 / 吃牌 / 桌上出现两次，就是坏档（旧版本留下的或被改过），直接作废重开
  function saneMatch(m) {
    const ok = (lists) => { const all = lists.flat(); return all.every((c) => Number.isInteger(c) && c >= 0 && c < 52) && new Set(all).size === all.length; };
    const r = m.round;
    if (r && !ok([...r.hands, ...r.captured, r.trick.map((p) => p.card)])) return false;
    if (m.last && !ok(m.last.captured)) return false;
    return true;
  }
  function resumeSolo(quiet) {
  const saved = readJSON(STORE_KEY);
  if (saved && saved.match && !saneMatch(saved.match)) saved.match = null;
  if (saved && saved.v === VERSION && saved.match && !saved.match.over) {
    match = saved.match;
    match.rules = R.normalizeRules(match.rules);
    renderAll();
    if (match.round) step();
    else if (match.last) showSettlement();
    else startRound();
  } else if (!quiet && !readJSON(TUT_KEY) && !AUTO) {
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
  }

  $('gzMenuBtn').addEventListener('click', toggleMenu);
  // 大厅：点座位（空位加机器人 / 坐过去，机器人换档，房主请人离开）；中间面板的几个按钮
  els.table.addEventListener('click', (e) => {
    const seat = e.target.closest('[data-lseat]');
    if (seat && online && match && match.lobby) { showSeatMenu(+seat.dataset.lseat); return; }
    const lb = e.target.closest('[data-lb]');
    if (!lb || !online) return;
    const act = lb.dataset.lb;
    if (act === 'copy-link') copyText(NET.inviteUrl(online.code), '邀请链接已复制');
    if (act === 'copy-code') copyText(online.code, '房号已复制');
    if (act === 'rules') showRoomRules('view');
    if (act === 'start') lobbyOp('start');
    if (act === 'leave' && confirm('离开房间？')) leaveOnline(null, true);
  });

  /* ───── 动画预览：?fxdemo=sweep|eat|clash|sheepdbl|pigdbl|triple ─────
   * 在真牌桌上反复放「一轮结束」那一下（走的就是正式出牌时的同一套收牌 / 特效代码），不动存档。 */
  const DEMOS = {
    sweep: ['没分的一轮', [1, 4, 7, 11]],            // ♠3 ♠6 ♠9 ♠K：全钻进赢家头像
    eat: ['有分的一轮', [42, 46, 18, 50]],           // ♣5 ♣9 ♥7(垫) ♣K：红桃插进吃牌区，其余进头像
    insert: ['插进红桃扇', [42, 46, 18, 50], [13, 15, 20, 22]],   // 赢家已有 ♥2 ♥4 ♥9 ♥J，♥7 要插到中间
    clash: ['猪羊对撞', [27, 35, 10, 38]],           // ♦3 ♦J ♠Q(垫) ♦A
    sheepdbl: ['羊 × 变压器', [28, 35, 47, 38]],     // ♦4 ♦J ♣10(垫) ♦A
    pigdbl: ['猪 × 变压器', [1, 10, 47, 12]],        // ♠3 ♠Q ♣10(垫) ♠A
    triple: ['猪羊变压器三角对撞', [27, 35, 10, 47, 38]],   // ♦3 ♦J ♠Q ♣10 ♦A（取后四张）
  };
  function startDemo(kind) {
    const demo = DEMOS[kind] ? kind : 'sweep';
    match = { demo: true, rules: R.normalizeRules({}), totals: [0, 0, 0, 0], roundNo: 1, pigTaker: -1, seed: 1, round: null, exposing: [], last: null, over: false };
    match.round = R.createRound(R.deal(R.makeRng(7)), 0, -1, match.rules);
    busy = true;
    renderAll();
    const bar = document.createElement('div');
    bar.className = 'gz-demo';
    bar.innerHTML = '<b>动画预览</b>' + Object.keys(DEMOS).map((k) => '<a href="?fxdemo=' + k + '"' + (k === demo ? ' aria-current="true"' : '') + '>' + DEMOS[k][0] + '</a>').join('') +
      '<a href="' + location.pathname + '">回到牌桌</a>';
    els.table.appendChild(bar);
    let k = 0;
    const loop = () => {
      const r = match.round;
      const cards = DEMOS[demo][1].slice(-4);
      const leader = k++ % 4;
      const plays = cards.map((c, i) => ({ seat: (leader + i) % 4, card: c }));
      const w = R.trickWinner(plays);
      const pre = DEMOS[demo][2] || [];
      r.captured = [[], [], [], []];
      r.captured[w] = pre.slice();
      r.exposed = [];
      flying = null;
      renderSeats();
      renderTrick(plays);
      schedule(() => {
        r.captured[w] = pre.concat(cards.filter(R.isScoring));
        const done = { winner: w, plays };
        flying = new Set(cards.filter(R.isScoring));
        showLead(-1);
        const fxMs = playTrickFx(done, planTrickFx(done));
        if (fxMs) els.center.classList.add('is-fxing');
        schedule(() => {
          els.center.classList.remove('is-fxing');
          schedule(loop, flyTrick(plays, w) + 1500);
        }, fxMs ? Math.max(0, fxMs - 150) : 0);
      }, 1100);
    };
    schedule(loop, 500);
  }

  buildSeats();
  solveSize();
  const demoParam = new URLSearchParams(location.search).get('fxdemo');
  if (demoParam) { startDemo(demoParam); return; }
  const roomParam = (new URLSearchParams(location.search).get('room') || '').trim();
  const sess = NET && NET.readSession();
  if (sess && (!roomParam || roomParam === sess.code)) {
    // 上次在联机房间里：先接回去；接不回（房间散了）再回到单机
    resumeOnline(sess).then((ok) => { if (!ok) { resumeSolo(!!roomParam); if (/^\d{4}$/.test(roomParam)) showOnlineEntry(roomParam); } });
  } else {
    if (sess) NET.writeSession(null);
    resumeSolo(/^\d{4}$/.test(roomParam));
    if (NET && /^\d{4}$/.test(roomParam)) showOnlineEntry(roomParam);
  }
})();
