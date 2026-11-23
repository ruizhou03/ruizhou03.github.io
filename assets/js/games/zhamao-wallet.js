/* 百变小咪 · 小鱼干（window.ZhamaoWallet，2026-11-22）
 * 后端 zircon-urge /api/zmw（lib/zhamao-wallet.js）；规则数值见后端 lib/zhamao-econ.js，下面 E 是同一份表（只用来显示门票），改那边要同步改这里。
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
    state = Object.assign({}, state || {}, { bal: j.bal, t: Date.now() }, j.checkin ? { ck: j.checkin.today ? today() : '' } : {}, j.owner ? { owner: j.owner } : {}, Array.isArray(j.badges) && j.checkin ? { badges: j.badges } : {});
    ls.set(CACHE, JSON.stringify(state));
    listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } });
  }
  const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  async function post(action, body) {
    const b = Object.assign({}, body || {});
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
.zmw-res b{font:700 30px/1 Georgia,"Noto Serif SC",serif;font-variant-numeric:tabular-nums;color:#1d1b18}
.zmw-res b.is-up{color:#3f7a52}.zmw-res b.is-down{color:#b4392c}
.zmw-res .zmw-bal{display:inline-flex;align-items:center;gap:4px;padding:4px 10px 4px 7px;border-radius:999px;background:#ebe5d8;font:600 14px/1 Georgia,serif;color:#6a6358}
.zmw-res .zmw-bal .zmw-fish{width:22px;height:14px}
.zmw-res .zmw-star{display:inline-flex;align-items:center;gap:2px;font:700 14px/1 Georgia,serif;color:#b07420}
.zmw-res .zmw-star svg{width:16px;height:16px}
.zmw-res .zmw-login{cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:999px;border:1.5px solid #b4392c;color:#b4392c;background:#fffdf8;font:600 14px/1 system-ui;text-decoration:none}
.zmw-chip b{transition:color .2s}
.zmw-chip b.is-up{color:#3f7a52}.zmw-chip b.is-down{color:#b4392c}
.zmw-fly{position:fixed;inset:0;pointer-events:none;z-index:90}
.zmw-fly .zmw-chip.is-ghost{position:fixed;margin:0}
.zmw-flyfish{position:fixed;left:0;top:0;width:34px;height:22px;margin:-11px 0 0 -17px}
.zmw-flyfish .zmw-fish{width:34px;height:22px}
.zmw-ticket{position:fixed;left:0;top:0;min-width:52px;height:28px;padding:0 8px;display:grid;place-items:center;border-radius:6px;background:#f0c9bb;border:1.5px solid #1d1b18;color:#1d1b18;font:700 14px/1 Georgia,serif;box-shadow:0 2px 0 #1d1b18}
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
  let shown = null;   // 左上角现在显示的数（动画从这里滚到新余额）
  function paintChip() {
    if (!chip) return;
    const has = state && state.bal != null;
    chip.hidden = !has;
    if (!has) return;
    const b = chip.querySelector('b');
    if (shown == null) { b.textContent = fmt(state.bal); shown = state.bal; }
    else if (chip.offsetParent === null) { /* 封面藏着（在打牌）：等回到主页面露出来再滚 */ }
    else if (!fxOn() || shown === state.bal) { b.textContent = fmt(state.bal); shown = state.bal; }
    else { const from = shown; shown = state.bal; animateIn(from, state.bal); }
    chip.querySelector('.zmw-dot').hidden = !hasNews();
  }

  /* ── 动画（2026-11-22 用户挑甲；先挂开关 ?walletfx=1 给用户预览，挑定再默认打开）──
   * 进账：一串小鱼从屏幕中间飞进左上角，数字滚到新余额（加绿、减红）；扣门票：门票从左上角飞到「开始」键，数字往下滚，同时开局 */
  const FX_KEY = 'zm.walletfx';
  (function () { const m = /[?&]walletfx=([01])\b/.exec(location.search); if (m) ls.set(FX_KEY, m[1]); })();
  const fxOn = () => ls.get(FX_KEY) === '1' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function roll(el, from, to, ms) {
    const t0 = performance.now(), up = to >= from;
    el.classList.add(up ? 'is-up' : 'is-down');
    const tick = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); else setTimeout(() => el.classList.remove('is-up', 'is-down'), 500); };
    requestAnimationFrame(tick);
  }
  function flyLayer() { let l = document.querySelector('.zmw-fly'); if (!l) { l = document.createElement('div'); l.className = 'zmw-fly'; document.body.appendChild(l); } return l; }
  function animateIn(from, to) {
    const b = chip.querySelector('b'), r = chip.getBoundingClientRect();
    if (to < from || !r.width) { roll(b, from, to, 520); return; }
    const layer = flyLayer(), tx = r.left + 22, ty = r.top + r.height / 2, cx = innerWidth / 2, cy = innerHeight * 0.45;
    const N = Math.min(6, 2 + Math.round(Math.log10(Math.max(10, to - from))));
    let landed = 0;
    for (let i = 0; i < N; i++) {
      const f = document.createElement('span');
      f.className = 'zmw-flyfish'; f.innerHTML = FISH;
      layer.appendChild(f);
      const sx = cx + (Math.random() - 0.5) * 80, sy = cy + (Math.random() - 0.5) * 50, mx = (sx + tx) / 2 + (Math.random() - 0.5) * 60, my = Math.min(sy, ty) - 40 - Math.random() * 40;
      f.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.6)', opacity: 0 }, { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translate(' + mx + 'px,' + my + 'px) scale(.9)', offset: 0.55 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.55)', opacity: 1 }],
        { duration: 560, delay: i * 55, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'backwards' }).finished.then(() => {
        f.remove();
        if (++landed === 1) { roll(b, from, to, 480); chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 260 }); }
      }).catch(() => f.remove());
    }
  }
  /* 扣门票：克隆一份左上角的小鱼干（开局后封面就藏了），门票从那里飞到「开始」键，数字往下滚；0.6 秒内淡掉，牌局照常同时开始 */
  function animateTicket(price0, balBefore) {
    if (!fxOn() || !chip || chip.offsetParent === null) return;
    const btn = document.querySelector('[data-cover="start"]'), r = chip.getBoundingClientRect(), br = btn && btn.offsetParent !== null ? btn.getBoundingClientRect() : null;
    if (!r.width || !br) return;
    const layer = flyLayer();
    const ghost = chip.cloneNode(true);
    ghost.classList.add('is-ghost'); ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
    ghost.querySelector('.zmw-dot').hidden = true;
    layer.appendChild(ghost);
    const tk = document.createElement('span');
    tk.className = 'zmw-ticket'; tk.textContent = price0;
    layer.appendChild(tk);
    const sx = r.left + 10, sy = r.top + 6, ex = br.left + br.width / 2 - 26, ey = br.top + br.height / 2 - 14;
    tk.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(-8deg) scale(.7)', opacity: 0 }, { transform: 'translate(' + sx + 'px,' + (sy + 18) + 'px) rotate(-8deg) scale(1)', opacity: 1, offset: 0.18 }, { transform: 'translate(' + ex + 'px,' + ey + 'px) rotate(6deg) scale(1)', opacity: 1, offset: 0.85 }, { transform: 'translate(' + ex + 'px,' + ey + 'px) rotate(6deg) scale(.4)', opacity: 0 }],
      { duration: 600, easing: 'cubic-bezier(.45,0,.4,1)', fill: 'forwards' }).finished.then(() => tk.remove()).catch(() => tk.remove());
    roll(ghost.querySelector('b'), balBefore, Math.max(0, balBefore - price0), 420);
    ghost.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 760, fill: 'forwards' }).finished.then(() => ghost.remove()).catch(() => ghost.remove());
    shown = Math.max(0, balBefore - price0);
  }
  function mountChip(cover) {
    style();
    if (!cover || chip) return;
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'zmw-chip';
    chip.addEventListener('click', openProfile);
    chip.setAttribute('aria-label', T('ui.wallet.title', '小鱼干'));
    chip.innerHTML = FISH + '<b></b><i class="zmw-dot" hidden></i>';
    chip.hidden = true;
    cover.appendChild(chip);
    paintChip();
    listeners.push(paintChip);
    refresh().then(retryPending);
    // 登录 / 登出之后：游客小鱼干并进账号（后端做），左上角跟着刷新
    if (auth() && auth().onChange) auth().onChange(() => { setTimeout(refresh, 300); });
    // 老链接 /toolbox/puffcat/me/ 会跳到 ?me=1：进来直接打开档案（用 replaceState 去掉参数，不留历史）
    if (/[?&]me=1\b/.test(location.search)) {
      try { const u = new URL(location.href); u.searchParams.delete('me'); history.replaceState(history.state, '', u.toString()); } catch (_) { /* */ }
      setTimeout(openProfile, 600);
    }
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
    if (state && state.bal >= price(tier, mode, st.n)) animateTicket(price(tier, mode, st.n), state.bal);
    post('ticket', { n: st.n, mode, tier, gid: game.hl && game.hl.id }).then((r) => {
      if (game.wt !== wt) return;
      if (r.tid) { wt.tid = r.tid; wt.price = r.price; } else wt.short = true;
      if (r.relief) wt.relief = r.relief;
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
      (r.bal != null ? '<span class="zmw-bal">' + FISH + fmt(r.bal) + '</span>' : '') +
      (!loggedIn() ? '<button type="button" class="zmw-login" data-zmw-login>' + T('ui.wallet.login', '登录保存') + '</button>' : '');
    const lg = el.querySelector('[data-zmw-login]');
    if (lg) lg.addEventListener('click', login);
    const b = el.querySelector('b'), sign = d > 0 ? '+' : d < 0 ? '−' : '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !Math.abs(d)) { b.textContent = sign + fmt(d); return; }
    const t0 = performance.now(), dur = 700;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); b.textContent = sign + fmt(Math.abs(d) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  function fill(dialog, p) {
    const el = dialog && dialog.querySelector('[data-zmw-res]');
    if (!el) return;
    if (!p) { el.remove(); return; }
    Promise.resolve(p).then((r) => paintRes(el, r));
  }
  /* 联机：服务器在这局的视图里给了我的 { price, pay, d, refund } */
  function fillOnline(dialog, pay) {
    const el = dialog && dialog.querySelector('[data-zmw-res]');
    if (!el) return;
    if (!pay || pay.refund) { el.remove(); return; }
    // 余额由服务器另外记账：稍等一下再拉一次余额（首胜奖励也在里面）
    setTimeout(() => { refresh().then((j) => paintRes(el, { delta: pay.d, bal: j ? j.bal : null })); }, 900);
  }

  root.ZhamaoWallet = {
    BASE, FISH, price, loggedIn, deviceId,
    state: () => state, onChange: (f) => listeners.push(f),
    me: refresh,
    checkin: () => post('checkin').then((j) => { state = Object.assign({}, state || {}, { ck: today() }); ls.set(CACHE, JSON.stringify(state)); listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } }); return j; }), profile: () => post('profile'), fb: (steps) => post('fb', { steps }).catch(() => null),
    mountChip, priceTag, start, act, settle, slot, fill, fillOnline, openProfile, login, markBadgesSeen, seenBadges, fxOn,
  };
})(window);
