/* 百变小咪 · 小鱼干（window.ZhamaoWallet，2026-11-22）
 * 后端 zircon-urge /api/zmw（lib/zhamao-wallet.js）；规则数值见后端 lib/zhamao-econ.js，下面的门票表 / payout 是同一份（显示门票、结算页当场算余额），改那边要同步改这里。
 * 开局前先看余额够不够这局门票：不够弹「小鱼干不够了」（救济、签到在弹窗里自己点，2026-11-23 用户），服务器那边也不再悄悄补。
 * 身份：站点登录了 = 账号钱包（带 Authorization）；没登录 = 这台设备的游客钱包（X-Device-Id = gs.did.v1）。
 *       登录后每次请求带上这台设备原来的游客设备号（gs.did.anon.v1），后端把游客攒的小鱼干并进账号。
 * 单机：开局领票（扣门票）→ 我的名次一定下来（我出局 / 打完）就结算；联机由服务器结算，结算页读服务器给的 pay。
 * 这里还管：主菜单左上角的小鱼干（点了打开游戏里的猫咪档案面板 zhamao-profile.js，不跳页）、单机设置单「开始」键上的门票、结算页的 ±小鱼干。
 * ⚠️ 全程不跳页、不压浏览器历史：微信 / iOS 浏览器一有历史就会在屏幕最下面冒出前进后退条。 */
(function (root) {
  'use strict';
  const R = root.ZhamaoRules;
  const T = R && R.T ? R.T : (k, s) => s;
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const BASE = root.ZHAMAO_WALLET_URL || (LOCAL ? 'http://127.0.0.1:8789' : 'https://zircon-urge.fly.dev') + '/api/zmw';
  const CACHE = 'zm.wallet.v1';

  // ── 规则表（同 lib/zhamao-econ.js）──
  // 门票：[2–3 人, 4–5 人, 6–7 人, 8–9 人]，玩法由便宜到贵（2026-11-22 第二版，×10 整数）
  const PRICE = {
    classic: { easy: [100, 150, 200, 250], normal: [200, 300, 400, 500], hard: [500, 800, 1000, 1200] },
    flux: { easy: [150, 200, 250, 300], normal: [250, 400, 500, 600], hard: [600, 1000, 1200, 1500] },
    roles: { easy: [150, 200, 250, 300], normal: [250, 400, 500, 600], hard: [600, 1000, 1200, 1500] },
    team: { easy: [200, 250, 300, 400], normal: [400, 450, 600, 750], hard: [1000, 1200, 1500, 1800] },
  };
  const price = (tier, mode, n) => ((PRICE[mode] || PRICE.classic)[tier] || PRICE.classic.normal)[n <= 3 ? 0 : n <= 5 ? 1 : n <= 7 ? 2 : 3];
  /* 这局拿回多少（同 lib/zhamao-econ.js payout，一字不差）：结算页一出来就用它当场算好余额，不等服务器（2026-11-23 用户：排行榜出来那一下就要结算） */
  const RANK_MULT = {
    2: [1.71, 0.25], 3: [1.75, 1.00, 0.25], 4: [1.81, 1.16, 0.82, 0.25], 5: [1.88, 1.21, 1.00, 0.74, 0.25],
    6: [1.95, 1.22, 1.08, 0.91, 0.70, 0.25], 7: [2.03, 1.22, 1.12, 1.00, 0.86, 0.68, 0.25],
    8: [2.11, 1.20, 1.13, 1.05, 0.95, 0.84, 0.68, 0.25], 9: [2.18, 1.17, 1.12, 1.06, 1.00, 0.92, 0.83, 0.70, 0.25],
  };
  const TIER_K = { easy: 0.93, normal: 1, hard: 1.03 };
  const nice = (x) => (x <= 0 ? 0 : x < 100 ? Math.round(x / 10) * 10 : x < 1000 ? Math.round(x / 50) * 50 : Math.round(x / 100) * 100);
  function payout(o) {
    const n = Math.max(2, Math.min(9, Number.isInteger(o.n) ? o.n : 4)), tier = TIER_K[o.tier] ? o.tier : 'normal';
    const p = price(tier, PRICE[o.mode] ? o.mode : 'classic', n);
    let m;
    if (o.team) { const w = Math.max(1, Math.min(n - 1, o.team.winners || 1)); m = o.team.won ? (n * 0.97 - 0.3 * (n - w)) / w : 0.3; }
    else m = (RANK_MULT[n][Math.max(1, Math.min(n, o.rank | 0)) - 1] || 0) * TIER_K[tier];
    let pay = p * m;
    const a = Number(o.autoShare) || 0;
    if (a > 0.7) pay = 0; else if (a > 0.3) pay *= 0.5;
    return nice(pay);
  }

  // ── 身份 / 请求 ──
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* 无痕 */ } },
  };
  const auth = () => root.SiteAuth || null;
  const loggedIn = () => !!(auth() && auth().getToken && auth().getToken());
  function deviceId() {
    let did = ls.get('gs.did.v1');
    if (!did) { did = 'd-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36); ls.set('gs.did.v1', did); }
    return did;
  }
  let state = (() => { try { return JSON.parse(ls.get(CACHE)) || null; } catch (_) { return null; } })();
  const listeners = [];
  function remember(j) {
    if (!j || j.bal == null) return;
    state = Object.assign({}, state || {}, { bal: j.bal, t: Date.now() }, j.checkin ? { ck: j.checkin.today ? today() : '', next: j.checkin.next } : {}, j.relief ? { relief: j.relief } : {}, j.winToday != null ? { winToday: !!j.winToday } : {}, j.owner ? { owner: j.owner } : {}, Array.isArray(j.badges) && j.checkin ? { badges: j.badges } : {});
    ls.set(CACHE, JSON.stringify(state));
    listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } });
  }
  // 手机上的日历日（2026-11-23 用户：签到按用户当地日期算，不按北京时间；服务器只认「世界上某个时区此刻的日期」）
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  async function post(action, body) {
    const b = Object.assign({ day: today() }, body || {});
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    let res;
    if (loggedIn()) {
      const g = ls.get('gs.did.anon.v1');
      if (g) b.guest = g;
      opts.body = JSON.stringify(b);
      res = await auth().authedFetch(BASE + '?action=' + action, opts);
    } else {
      opts.headers['X-Device-Id'] = deviceId();
      opts.body = JSON.stringify(b);
      res = await fetch(BASE + '?action=' + action, opts);
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j.error || 'http_' + res.status); e.status = res.status; throw e; }
    remember(j);
    return j;
  }

  // ── 画 ──
  const FISH = '<svg class="zmw-fish" viewBox="0 0 32 20" aria-hidden="true"><path d="M3 10c4-6 11-8 17-6 3 1 5 3 6 6-1 3-3 5-6 6-6 2-13 0-17-6Z" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.6" stroke-linejoin="round"/><path d="M25 10l5-5v10Z" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 6.5c1.6 2 1.6 5 0 7" fill="none" stroke="#1d1b18" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="9" r="1.2" fill="#1d1b18"/></svg>';
  const fmt = (x) => Math.round(Math.abs(x)).toLocaleString('en-US');
  const CSS = `
.zmw-fish{width:1.6em;height:1em;flex:none;vertical-align:-.12em}
.zmw-chip{cursor:pointer;font-family:inherit;position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);left:calc(env(safe-area-inset-left,0px) + 12px);z-index:5;display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 9px;border:1.5px solid #1d1b18;border-radius:999px;background:#fffdf8;color:#1d1b18;text-decoration:none;font:700 15px/1 Georgia,"Noto Serif SC",serif;box-shadow:0 2px 0 #1d1b18;-webkit-tap-highlight-color:transparent}
.zmw-chip:active{transform:translateY(2px);box-shadow:none}
.zmw-chip[hidden]{display:none}
.zmw-chip .zmw-dot{position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:#e9b949;border:2px solid #fffdf8}
.zmw-chip .zmw-dot[hidden]{display:none}
[data-cover="start"]{position:relative}
.zmw-cost{position:absolute;right:14px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;gap:3px;padding:3px 9px 3px 6px;border-radius:999px;background:rgba(255,253,248,.2);font:600 14px/1.2 Georgia,serif;pointer-events:none}
.zmw-cost .zmw-fish{width:1.5em}
.zmw-res{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;margin:12px auto 2px;min-height:40px}
.zmw-res .zmw-fish{width:40px;height:26px}
.zmw-res>b{font:700 30px/1 Georgia,"Noto Serif SC",serif;font-variant-numeric:tabular-nums;color:#1d1b18}
.zmw-res>b.is-up{color:#3f7a52}.zmw-res>b.is-down{color:#b4392c}
.zmw-res .zmw-bal b{font:inherit}
.zmw-res .zmw-bal{display:inline-flex;align-items:center;gap:4px;padding:4px 10px 4px 7px;border-radius:999px;background:#ebe5d8;font:600 14px/1 Georgia,serif;color:#6a6358}
.zmw-res .zmw-bal .zmw-fish{width:22px;height:14px}
.zmw-res .zmw-star{display:inline-flex;align-items:center;gap:2px;font:700 14px/1 Georgia,serif;color:#b07420}
.zmw-res .zmw-star svg{width:16px;height:16px}
.zmw-chip b{transition:color .2s}
.zmwfx-up{color:#3f7a52!important}.zmwfx-down{color:#b4392c!important}
/* 小鱼干不够（2026-11-23 用户：余额不够不能直接开，弹窗说清楚，救济在弹窗里自己点） */
.zmw-short-mask{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:20px;background:rgba(29,27,24,.42);-webkit-tap-highlight-color:transparent}
.zmw-short{box-sizing:border-box;width:min(300px,100%);padding:22px 20px 18px;border:1.5px solid #1d1b18;border-radius:18px;background:#fffdf8;box-shadow:0 4px 0 #1d1b18;color:#1d1b18;text-align:center;font-family:Georgia,"Noto Serif SC",serif}
.zmw-short .zmw-big{width:64px;height:40px;display:block;margin:0 auto 6px;transform:rotate(-14deg)}
.zmw-short h3{margin:0 0 14px;font:700 19px/1.2 Georgia,"Noto Serif SC",serif}
.zmw-short .zmw-row{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 0 18px}
.zmw-short .zmw-pill{display:inline-flex;align-items:center;gap:5px;padding:6px 12px 6px 9px;border-radius:999px;background:#ebe5d8;font:700 18px/1 Georgia,serif;font-variant-numeric:tabular-nums}
.zmw-short .zmw-pill .zmw-fish{width:26px;height:16px}
.zmw-short .zmw-pill.is-price{background:#f0c9bb}
.zmw-short .zmw-row i{font-style:normal;color:#8a8275;font:600 18px/1 Georgia,serif}
.zmw-short *{box-sizing:border-box}
.zmw-short .zmw-acts{display:flex;flex-direction:column;gap:8px}
.zmw-short button{cursor:pointer;font:600 16px/1 system-ui,"Noto Sans SC",sans-serif;padding:13px 14px;border-radius:12px;border:1.5px solid #1d1b18;background:#fffdf8;color:#1d1b18;box-shadow:0 2px 0 #1d1b18;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.zmw-short button .zmw-fish{width:24px;height:15px}
.zmw-short button.is-main{background:#b4392c;border-color:#1d1b18;color:#fffdf8}
.zmw-short button.is-plain{border-color:transparent;box-shadow:none;color:#6a6358;padding:9px}
.zmw-short button:disabled{opacity:.55}
.zmw-short button:active{transform:translateY(2px);box-shadow:none}
.zmw-short .zmw-tasks{margin:0 0 4px;border:1.5px solid #1d1b18;border-radius:12px;overflow:hidden;text-align:left}
.zmw-short .zmw-tasks p{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0;padding:9px 10px 9px 14px;min-height:50px;border-top:1px solid rgba(29,27,24,.12);font:600 15px/1.2 system-ui,"Noto Sans SC",sans-serif}
.zmw-short .zmw-tasks p:first-child{border-top:0}
.zmw-short .zmw-tasks button{padding:8px 14px;border-radius:999px;font-size:14px;background:#b4392c;color:#fffdf8;box-shadow:0 2px 0 #1d1b18}
.zmw-short .zmw-tasks em{font-style:normal;font:500 14px/1 system-ui,"Noto Sans SC",sans-serif;color:#8a8275;padding:8px 4px}
.zmw-chip b.is-up{color:#3f7a52}.zmw-chip b.is-down{color:#b4392c}
.zmw-res .zmw-wait{width:42px;height:6px;border-radius:3px;background:linear-gradient(90deg,#ebe5d8,#d9cfbd,#ebe5d8);background-size:200% 100%;animation:zmwWait 1s linear infinite}
@keyframes zmwWait{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.zmw-res .zmw-wait{animation:none}}
`;
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" fill="#e9b949" stroke="#b07420" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  let styled = false;
  function style() {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── 主菜单左上角的小鱼干 ──
  let chip = null;
  /* 小黄点（2026-11-22 用户挑甲）：只在「有东西可以领 / 可以看」时亮——今天还没签到，或者有拿到了还没看过的徽章。余额变了不亮点，靠数字滚动 */
  const seenBadges = () => { try { return JSON.parse(ls.get('zm.badges.seen')) || []; } catch (_) { return []; } };
  function markBadgesSeen(ids) { ls.set('zm.badges.seen', JSON.stringify(Array.from(new Set(seenBadges().concat(ids || []))))); paintChip(); }
  const hasNews = () => !!state && (state.ck !== today() || (state.badges || []).some((b) => seenBadges().indexOf(b) < 0));
  let shortOpen = false;   // 「不够了」弹窗开着：鱼游进弹窗里的余额，后面左上角那个不跟着放
  let shown = null;   // 左上角现在显示的数（动画从这里滚到新余额）
  const FX = () => root.ZhamaoWalletFx || null;
  const profileOpen = () => !!(root.ZhamaoProfile && root.ZhamaoProfile.isOpen && root.ZhamaoProfile.isOpen());
  function paintChip() {
    if (!chip) return;
    const has = state && state.bal != null;
    chip.hidden = !has;
    if (!has) return;
    const b = chip.querySelector('b');
    if (shortOpen && shown != null) { /* 「不够了」弹窗开着：后面这个先不动，关窗时对齐（录屏：弹窗里鱼还没游到，后面已经先跳成新数） */ }
    else if (shown == null) { b.textContent = fmt(state.bal); shown = state.bal; }
    else if (chip.offsetParent === null) { /* 封面藏着（在打牌）：等回到主页面露出来再滚 */ }
    else if (profileOpen() || shortOpen || !fxOn() || !FX() || shown === state.bal) { b.textContent = fmt(state.bal); shown = state.bal; }   // 档案开着：鱼飞进档案里的余额，后面这个不动
    else { const from = shown; shown = state.bal; animateIn(from, state.bal); }
    chip.querySelector('.zmw-dot').hidden = !hasNews();
  }

  /* ── 动画（2026-11-22 用户挑甲，第二轮重做：zhamao-walletfx.js；2026-11-23 用户看过录屏后默认打开，?walletfx=0 关、=1 再开；系统「减少动态效果」也关）──
   * 进账：回到主页面时一串小鱼从下面弯弯地游进左上角，数字滚到新余额（加绿、减红）
   * 扣门票：点「开始」→ 门票从左上角小鱼干里抽出来、飘落到「开始」键上（数字同时往下滚）→ 放完才进牌桌（不留半截动画在牌桌上） */
  const FX_KEY = 'zm.walletfx';
  (function () { const m = /[?&]walletfx=([01])\b/.exec(location.search); if (m) ls.set(FX_KEY, m[1]); })();
  const fxOn = () => ls.get(FX_KEY) !== '0' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animateIn(from, to) {
    const b = chip.querySelector('b'), fx = FX();
    if (to < from) { fx.roll(b, from, to, 560); return; }
    const n = Math.min(6, 2 + Math.round(Math.log10(Math.max(10, to - from))));
    fx.school(FISH, { x: innerWidth / 2, y: innerHeight * 0.72 }, chip, n, { spread: 90, gap: 90, dur: 820, lift: -60, onLand: () => fx.roll(b, from, to, 560) });
  }
  /* 交门票（2026-11-23 用户：门票不要「鱼 + 数字」的标签飘下来，就是鱼游下来）：
   * 几条小鱼从余额（主页面左上角 / 结算页的余额）游进要按的那个键（「开始」/「再来一局」），余额同时往下滚，放完才 resolve——调用方这时才真正开局。
   * 余额不够：先弹「小鱼干不够了」（救济、签到都在里面自己点），凑够了点「开始」才往下走；关掉 = 不开（resolve false）。
   * 不知道余额（连不上服务器）/ 没开动画：直接 resolve true（照旧开局，服务器那边不够就不计分） */
  let fxGen = 0;   // 每收一次动画 +1：放到一半被收掉的扣票，不能再接着开局
  function pay(o) {
    const p = price(o.tier, o.mode, o.n);
    if (state && state.bal != null && state.bal < p) return shortDialog(o, p).then((ok) => (ok ? fishPay(p, o.from, o.to) : false));
    return fishPay(p, o.from, o.to);
  }
  function fishPay(p, from, to) {
    const fx = FX();
    if (!fx || !fxOn() || !from || !to || from.offsetParent === null || !state || state.bal == null) return Promise.resolve(true);
    cancelFx();
    const gen = fxGen, b = from.querySelector('b') || from;
    const bal = from === chip ? (shown != null ? shown : state.bal) : (Number(String(b.textContent).replace(/[^\d]/g, '')) || state.bal);   // 结算页：从它上面显示的数往下滚
    if (from === chip) shown = bal - p;
    fx.roll(b, bal, bal - p, 520, { delay: 120 });
    const n = Math.min(5, 2 + Math.round(Math.log10(Math.max(10, p)) - 1));
    return fx.school(FISH, from, to, n, { spread: 14, gap: 70, dur: 700, lift: 30, size: 28, toPoint: center(to) }).then(() => gen === fxGen);
  }
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  // 旧名字（zhamao.js 的「开始」键还在用）
  function playTicket(tier, mode, n) { return pay({ tier, mode, n, from: chip, to: document.querySelector('[data-cover="start"]') }); }

  /* 小鱼干不够了：余额 / 门票并排，下面一张今天的任务单（2026-11-23 用户定：只列主流的三项，不写给多少）——
   *   领取救济（第一次亏空 +3,000，之后每天三次 +1,000）/ 每日签到 / 对局获胜（每天第一次赢）
   *   没做的右边「前往」：救济、签到当场领（鱼游进上面的余额）；对局获胜 = 关掉弹窗回去开一局；做过的写「已完成」。
   * 领完够了，主键变成「开始」。字尽量少 */
  function shortDialog(o, p) {
    style();
    shortOpen = true;
    return new Promise((resolve) => {
      const mask = document.createElement('div');
      mask.className = 'zmw-short-mask';
      mask.innerHTML = '<div class="zmw-short" role="dialog" aria-modal="true"><svg class="zmw-big" viewBox="0 0 32 20" aria-hidden="true">' + FISH.replace(/^<svg[^>]*>/, '').replace('</svg>', '') + '</svg>' +
        '<h3>' + T('ui.wallet.short', '小鱼干不够了') + '</h3>' +
        '<div class="zmw-row"><span class="zmw-pill" data-bal>' + FISH + '<b>' + fmt(state.bal) + '</b></span><i>/</i><span class="zmw-pill is-price">' + FISH + fmt(p) + '</span></div>' +
        '<div class="zmw-acts"></div></div>';
      document.body.appendChild(mask);
      const acts = mask.querySelector('.zmw-acts'), balEl = mask.querySelector('[data-bal]');
      let done = false;
      const end = (ok) => { if (done) return; done = true; shortOpen = false; mask.remove(); if (chip && state) { shown = state.bal; chip.querySelector('b').textContent = fmt(state.bal); } resolve(ok); };
      mask.addEventListener('click', (e) => { if (e.target === mask) end(false); });
      const btn = (cls, html, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html; b.addEventListener('click', () => fn(b)); acts.appendChild(b); return b; };
      // 拿到小鱼干（点下去就放，不等服务器——知道能领多少）：鱼从按钮游进上面的余额、数字滚上去；服务器回来且动画放完再按服务器的余额重摆按钮
      let busy = 0;
      const claim = (b, amt, req) => {
        b.disabled = true;
        busy++;
        const from = state.bal, fx = FX(), numEl = balEl.querySelector('b');
        const anim = fx && fxOn()
          ? fx.school(FISH, b, balEl, Math.min(4, 2 + Math.round(Math.log10(amt) - 1)), { spread: 16, gap: 80, dur: 640, lift: -40, size: 26, onLand: () => fx.roll(numEl, from, from + amt, 480) })
          : Promise.resolve().then(() => { numEl.textContent = fmt(from + amt); });
        const settle = (v) => { busy--; numEl.__zmwRoll = {}; numEl.textContent = fmt(v); draw(); };   // 收掉还在滚的那段，再摆服务器的数（录屏：滚到 1,990 被晚到的一帧盖住）
        Promise.all([req(), anim]).then(([j]) => settle(j.bal)).catch(() => settle(state.bal));   // 没领成：数字摆回去
      };
      function draw() {
        acts.innerHTML = '';
        const bal = state.bal, rl = state.relief || {};
        mask.querySelector('h3').hidden = bal >= p;   // 凑够了：标题收起，只剩数字和「开始」
        if (bal >= p) { const go = btn('is-main', o.okLabel || T('ui.start', '开始'), () => end(true)); go.focus(); btn('is-plain', T('ui.cancel', '取消'), () => end(false)); return; }
        const list = document.createElement('div');
        list.className = 'zmw-tasks';
        acts.appendChild(list);
        const task = (name, isDone, go) => {
          const row = document.createElement('p');
          row.innerHTML = '<span>' + name + '</span>';
          if (isDone) row.insertAdjacentHTML('beforeend', '<em>' + T('ui.wallet.done', '已完成') + '</em>');
          else { const b = document.createElement('button'); b.type = 'button'; b.textContent = T('ui.wallet.go', '前往'); b.addEventListener('click', () => go(b)); row.appendChild(b); }
          list.appendChild(row);
        };
        const amt = rl.first ? 3000 : 1000;
        task(T('ui.wallet.relief', '领取救济'), !(rl.first || rl.left > 0), (b) => claim(b, amt, () => post('relief', { n: o.n, mode: o.mode, tier: o.tier })));
        task(T('ui.wallet.checkin', '每日签到'), state.ck === today(), (b) => claim(b, state.next || 100, () => api.checkin()));
        task(T('ui.wallet.win', '对局获胜'), !!state.winToday, () => end(false));
        btn('is-plain', T('ui.ok', '知道了'), () => end(false));
      }
      draw();
      refresh().then(() => { if (!done && !busy) draw(); });   // 任务单以服务器为准（今天赢过没有、救济还剩几次）
    });
  }
  /* 联机（2026-11-23）：房主点开始、服务器说我不够这局门票 → 同一个弹窗（救济 / 签到），凑够了点主键 resolve true。
   * 门票以服务器给的为准（o.price）；先拉一次余额（本机记的可能是旧的） */
  function topUp(o) {
    if (shortOpen) return Promise.resolve(false);
    return refresh().then(() => {
      if (!state || state.bal == null) return true;
      return shortDialog(o, o.price != null ? o.price : price(o.tier, o.mode, o.n));
    });
  }
  function cancelFx() { fxGen++; if (FX()) FX().cancelAll(); }
  function canPay(tier, mode, n) { return !(state && state.bal != null && state.bal < price(tier, mode, n)); }
  function mountChip(cover) {
    style();
    if (!cover || chip) return;
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'zmw-chip';
    chip.addEventListener('click', openProfile);
    chip.addEventListener('pointerdown', () => { profile().catch(() => null); });   // 按下就去拿，松手打开时已经在路上
    chip.setAttribute('aria-label', T('ui.wallet.title', '小鱼干'));
    chip.innerHTML = FISH + '<b></b><i class="zmw-dot" hidden></i>';
    chip.hidden = true;
    cover.appendChild(chip);
    // 封面一藏起来（开局 / 进联机 / 进教程，不管从哪儿走的）：小鱼干的动画一律当场收掉，不带到下一页
    if (root.MutationObserver) new MutationObserver(() => { if (cover.hidden) cancelFx(); }).observe(cover, { attributes: true, attributeFilter: ['hidden'] });
    paintChip();
    listeners.push(paintChip);
    refresh().then(retryPending).then(() => { if (!profileCached()) setTimeout(() => profile().catch(() => null), 2500); });
    // 登录 / 登出之后：游客小鱼干并进账号（后端做），左上角跟着刷新
    if (auth() && auth().onChange) auth().onChange(() => { setTimeout(refresh, 300); });
    // 老链接 /toolbox/puffcat/me/ 会跳到 ?me=1：进来直接打开档案（用 replaceState 去掉参数，不留历史）
    if (/[?&]me=1\b/.test(location.search)) {
      try { const u = new URL(location.href); u.searchParams.delete('me'); history.replaceState(history.state, '', u.toString()); } catch (_) { /* */ }
      setTimeout(openProfile, 600);
    }
  }
  /* 猫咪档案的数据（2026-11-23 用户：点开档案要等两秒）：
   *  ① 每次拿到都存一份在本机（按是谁存：换了账号 / 游客不混用），下次一点开先摆上次的，服务器回来再换成新的；
   *  ② 手指一按下左上角小鱼干就先去拿（松手时请求已经在路上了）；1.5 秒内的重复请求共用同一个；
   *  ③ 本机还没存过（第一次玩）：主页面摆好后闲下来先拿一份 */
  const PROF = 'zm.wprof.v1';
  const who = () => { if (!loggedIn()) return 'd:' + deviceId(); const u = auth().getUser ? auth().getUser() : null; return 'a:' + ((u && (u.id || u.accountId)) || ''); };
  let profP = null, profAt = 0;
  function profile(fresh) {
    if (!fresh && profP && Date.now() - profAt < 1500) return profP;
    profAt = Date.now();
    const me = who();
    profP = post('profile').then((p) => { try { ls.set(PROF, JSON.stringify({ who: me, t: Date.now(), p })); } catch (_) { /* 存不下就算了 */ } return p; });
    profP.catch(() => { profP = null; });
    return profP;
  }
  function profileCached() {
    try {
      const c = JSON.parse(ls.get(PROF));
      if (!c || !c.p || c.who !== who()) return null;
      if (state && state.bal != null) c.p.bal = state.bal;   // 余额以左上角为准（存档之后可能又打了几局）
      return c.p;
    } catch (_) { return null; }
  }
  function openProfile() { if (root.ZhamaoProfile) root.ZhamaoProfile.open(); }
  function login() { if (auth() && auth().openLogin) auth().openLogin(); else openProfile(); }
  function refresh() { return post('me').catch(() => null); }

  // ── 单机设置单：「开始」键上标这局门票 ──
  function priceTag(btn, tier, mode, n) {
    if (!btn) return;
    style();
    let tag = btn.querySelector('.zmw-cost');
    if (!tag) { tag = document.createElement('span'); tag.className = 'zmw-cost'; btn.appendChild(tag); }
    tag.innerHTML = FISH + price(tier, mode, n);
  }

  // ── 没结算成的单机局（网断了）：存在本机，下次打开游戏补上 ──
  const PEND = 'zm.wallet.pending';
  const pendList = () => { try { return JSON.parse(ls.get(PEND)) || []; } catch (_) { return []; } };
  function keepPending(body) { const l = pendList().filter((x) => x.tid !== body.tid); l.push(Object.assign({ t: Date.now() }, body)); ls.set(PEND, JSON.stringify(l.slice(-10))); }
  function dropPending(tid) { ls.set(PEND, JSON.stringify(pendList().filter((x) => x.tid !== tid))); }
  function retryPending() {
    const l = pendList().filter((x) => Date.now() - (x.t || 0) < 11 * 3600e3);
    ls.set(PEND, JSON.stringify(l));
    l.reduce((p, x) => p.then(() => { const b = Object.assign({}, x); delete b.t; return post('settle', b).then(() => dropPending(x.tid)).catch((e) => { if (e.status === 409 || e.status === 403) dropPending(x.tid); }); }), Promise.resolve());
  }

  // ── 单机：开局领票、记我的步数、结算 ──
  const pending = new WeakMap();
  function start(game, tier) {
    if (!game || game.tutorial || game.online) return;
    const st = game.state, mode = R.normalizeRules(st.rules).mode;
    const wt = game.wt = { n: st.n, mode, tier, all: 0, auto: 0 };
    post('ticket', { n: st.n, mode, tier, gid: game.hl && game.hl.id }).then((r) => {
      if (game.wt !== wt) return;
      if (r.tid) { wt.tid = r.tid; wt.price = r.price; wt.bal0 = r.bal; } else wt.short = true;
    }).catch(() => { if (game.wt === wt) wt.off = true; });
  }
  function act(game, seat, d, byAuto) {
    const wt = game && game.wt;
    if (!wt || seat !== 0 || game.pov || !d || d.type === 'pass') return;
    wt.all += 1;
    if (byAuto) wt.auto += 1;
  }
  const meOf = (game) => (game.pov ? (game.state.n - game.pov) % game.state.n : 0);
  /* 我的名次定下来了就结算（重复调用拿到同一个结果）；还定不下来 / 没票 → null */
  function settle(game) {
    if (!game || game.tutorial || game.online || !game.wt) return null;
    if (pending.has(game)) return pending.get(game);
    const wt = game.wt;
    if (wt.done) return Promise.resolve(wt.done);
    if (!wt.tid) return null;
    const s = game.state, n = s.n, me = meOf(game);
    let body;
    if (R.isTeam && R.isTeam(s)) {
      if (s.phase !== 'over') return null;
      const mine = R.teamOf(s, me);
      body = { tid: wt.tid, team: true, won: mine === s.winnerTeam, winners: Array.from({ length: n }, (_, k) => k).filter((k) => R.teamOf(s, k) === s.winnerTeam).length };
    } else {
      let rank = 0;
      if (s.phase === 'over' && s.winner === me) rank = 1;
      else if (!s.alive[me]) { const k = s.outOrder.indexOf(me); if (k >= 0) rank = n - k; }
      if (!rank) return null;
      body = { tid: wt.tid, rank };
    }
    body.autoShare = wt.all ? wt.auto / wt.all : 0;
    // 当场估好（同服务器的算法）：结算页一出来就有数，服务器回来再对一下（首胜奖励只有服务器知道）
    const pay = payout({ tier: wt.tier, mode: wt.mode, n, rank: body.rank, team: body.team ? { won: body.won, winners: body.winners } : null, autoShare: body.autoShare });
    wt.est = { delta: pay - wt.price, pay, price: wt.price, firstWin: 0, bal: (wt.bal0 != null ? wt.bal0 : state ? state.bal : 0) + pay, est: true };
    if (state) state = Object.assign({}, state, { bal: wt.est.bal });   // 本机先记上（「再来一局」够不够按这个算），服务器回来会覆盖
    const p = post('settle', body).then((r) => { wt.done = { delta: r.delta, pay: r.pay, price: wt.price, firstWin: r.firstWin || 0, bal: r.bal }; dropPending(wt.tid); return wt.done; })
      .catch((e) => {
        if (e.status === 409 || e.status === 403) { wt.done = { gone: true }; dropPending(wt.tid); return null; }
        keepPending(body);   // 网断了 / 服务器没回：记下来，下次打开游戏再补结算（票在服务器上留 12 小时）
        pending.delete(game);
        return null;
      });
    pending.set(game, p);
    return p;
  }

  // ── 结算页 ──
  function slot() { style(); return '<div class="zmw-res" data-zmw-res><span class="zmw-wait"></span></div>'; }
  function paintRes(el, r) {
    if (!el) return;
    if (!r || r.gone || r.delta == null) { el.remove(); return; }
    const d = r.delta - (r.firstWin || 0), cls = d > 0 ? 'is-up' : d < 0 ? 'is-down' : '';   // 大字 = 这局本身（拿回 − 门票）；首胜奖励单独挂星星
    el.innerHTML = FISH + '<b class="' + cls + '">' + (d > 0 ? '+' : d < 0 ? '−' : '') + '0</b>' +
      (r.firstWin ? '<span class="zmw-star">' + STAR + '+' + r.firstWin + '</span>' : '') +
      (r.bal != null ? '<span class="zmw-bal">' + FISH + '<b>' + fmt(r.bal) + '</b></span>' : '');   // 「登录保存」只在猫咪档案里提（2026-11-23 用户：排行榜里放着丑）
    const b = el.querySelector(':scope > b'), sign = d > 0 ? '+' : d < 0 ? '−' : '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Math.abs(d)) { b.textContent = sign + fmt(d); return; }
    const t0 = performance.now(), dur = 700;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); b.textContent = sign + fmt(Math.abs(d) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function fill(dialog, p, game) {
    const el = dialog && dialog.querySelector('[data-zmw-res]');
    if (!el) return;
    if (!p) { el.remove(); return; }
    const est = game && game.wt && game.wt.done ? game.wt.done : game && game.wt && game.wt.est;
    if (est) paintRes(el, est);
    Promise.resolve(p).then((r) => {
      if (!est) { paintRes(el, r); return; }
      if (!r) return;   // 网断了：留着估的数（下次打开游戏补结算）
      if (r.delta - (r.firstWin || 0) !== est.delta - (est.firstWin || 0)) { paintRes(el, r); return; }
      // 和估的一样：只把首胜星星补上、余额对成服务器的
      if (r.firstWin && !el.querySelector('.zmw-star')) { const st = document.createElement('span'); st.className = 'zmw-star'; st.innerHTML = STAR + '+' + r.firstWin; el.querySelector('b').after(st); }
      const bl = el.querySelector('.zmw-bal'); if (bl && r.bal != null) bl.innerHTML = FISH + '<b>' + fmt(r.bal) + '</b>';
    });
  }
  /* 联机：服务器在这局的视图里给了我的 { price, pay, d, refund } */
  function fillOnline(dialog, pay) {
    const el = dialog && dialog.querySelector('[data-zmw-res]');
    if (!el) return;
    if (!pay || pay.refund) { el.remove(); return; }
    // 余额由服务器另外记账：稍等一下再拉一次余额（首胜奖励也在里面）
    // 2026-11-23：先用本机余额 + 这局输赢当场摆出来，服务器那边记完账再对一下
    if (state && state.bal != null) paintRes(el, { delta: pay.d, bal: state.bal + pay.d });
    setTimeout(() => { refresh().then((j) => { const bl = el.querySelector('.zmw-bal'); if (j && bl) bl.innerHTML = FISH + '<b>' + fmt(j.bal) + '</b>'; else if (j && !bl) paintRes(el, { delta: pay.d, bal: j.bal }); }); }, 900);
  }

  const api = root.ZhamaoWallet = {
    BASE, FISH, price, loggedIn, deviceId,
    state: () => state, onChange: (f) => listeners.push(f),
    me: refresh,
    checkin: () => post('checkin').then((j) => { state = Object.assign({}, state || {}, { ck: today() }); ls.set(CACHE, JSON.stringify(state)); listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } }); return j; }), profile, profileCached, fb: (steps) => post('fb', { steps }).catch(() => null),
    mountChip, priceTag, start, act, settle, slot, fill, fillOnline, openProfile, login, markBadgesSeen, seenBadges, fxOn, playTicket, pay, canPay, cancelFx, payout, topUp,
    __demo: { setShown: (x) => { shown = x; if (chip) chip.querySelector('b').textContent = fmt(x); }, repaint: () => paintChip() },
  };
})(window);
