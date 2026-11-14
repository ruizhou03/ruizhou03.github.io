/* 猫咪炸毛联机 · 网络层（window.ZhamaoNet，无 DOM）——照 gongzhu-net.js
 * 后端：zircon-urge.fly.dev/api/zhamao（服务器权威，见 backends/urge/api/zhamao.js + lib/zhamao-room.js）。
 * 本机调试（localhost / 127.0.0.1 打开页面）默认连本机内存服务器 127.0.0.1:8789（npm run dev:zhamao-memory）。
 * 当前房间的 { code, token } 存在 localStorage，刷新页面 / 断线回来接着打。 */
(function () {
  'use strict';
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const BASE = LOCAL ? 'http://127.0.0.1:8789/api/zhamao' : 'https://zircon-urge.fly.dev/api/zhamao';
  const SESSION_KEY = 'zhamao.online.v1';
  // 后端（fly 上的 /api/zhamao）部署好之前，线上先不露联机入口：本机调试、或网址带 ?zmonline=1 才开
  const LIVE = true;   // 2026-11-12 后端已部署
  const ENABLED = LIVE || LOCAL || /[?&]zmonline=1\b/.test(location.search);

  const ERRORS = {
    room_not_found: '房间不存在或已经解散',
    room_full: '房间已满（座位都是真人）',
    room_in_progress: '这一局已经开始了',
    wait_game_end: '这一局还在打，先观战，下一局就能坐下',
    nick_taken_in_room: '这个名字房间里已经有人用了，换一个试试',
    bad_nick: '名字 1–12 个字，不能有特殊符号',
    bad_code: '房间号是 4 位数字',
    need_two: '至少两个人（可以加机器猫）才能开始',
    seat_taken: '这个座位已经有人了',
    bad_avatar: '这个头像不能用',
    host_only: '只有房主能这么做',
    host_must_sit: '房主不能去观战',
    room_busy: '房间有点忙，再试一次',
    not_your_turn: '还没轮到你',
    not_your_call: '这一下不用你表态',
    illegal_move: '这一步现在不能这么走',
    stale: '慢了一步，局面已经变了',
    on_auto: '托管中，先点自己头像收回来',
    spectators_full: '观战的人太多了，过一会儿再来',
    not_in_room: '你现在在观战，下一局坐下才能打',
    game_not_over: '这一局还没打完',
    you_are_out: '你已经出局了',
  };
  function message(err) {
    if (!err) return '网络出了点问题，再试一次';
    return ERRORS[err.error] || (err.status === 429 ? '操作太快了，歇一下再试' : '网络出了点问题，再试一次');
  }

  /* 网络快慢（2026-11-14 国内朋友：作废常常来不及点）：量每个动作请求一来一回要多久（长轮询会挂着等，不算），
   * 取最近几次里偏小的那个当「这台设备到服务器的来回」——网页用它校准倒计时，也随请求报给服务器，服务器按它给慢的人多留一截 */
  const rttSamples = [];
  function noteRtt(ms) {
    if (!(ms > 0) || ms > 15000) return;
    rttSamples.push(ms); if (rttSamples.length > 8) rttSamples.shift();
  }
  function rtt() {
    if (!rttSamples.length) return null;
    const s = rttSamples.slice().sort((x, y) => x - y);
    return Math.round(s[Math.floor((s.length - 1) / 3)]);   // 偏小的三分位：偶尔一次卡顿不把估计拉高，网真慢了几次之后才跟上
  }
  async function request(method, action, { code, token, body, query, signal, timed } = {}) {
    const r = rtt();
    const q = new URLSearchParams(Object.assign({ action }, code ? { code } : {}, query || {}, r != null ? { rtt: String(r) } : {}));
    const t0 = performance.now();
    const res = await fetch(BASE + '?' + q.toString(), {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: method === 'POST' ? JSON.stringify(Object.assign({ code }, body || {})) : undefined,
      signal,
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* 空响应 */ }
    if (timed) {
      const ms = performance.now() - t0;
      noteRtt(ms);
      if (json && typeof json === 'object') Object.defineProperty(json, '_rtt', { value: ms, enumerable: false });
    }
    if (!res.ok) {
      const e = new Error((json && json.error) || 'http_' + res.status);
      e.status = res.status;
      e.error = json && json.error;
      throw e;
    }
    return json;
  }

  function readSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; } }
  function writeSession(s) {
    try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (_) { /* 无痕模式：刷新后就接不回了 */ }
  }

  function deviceId() {
    if (window.GamesShell && GamesShell.Identity && GamesShell.Identity.getDeviceId) return GamesShell.Identity.getDeviceId();
    let did = null;
    try { did = localStorage.getItem('gs.did.v1'); } catch (_) { /* ignore */ }
    if (!did) {
      did = 'd-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      try { localStorage.setItem('gs.did.v1', did); } catch (_) { /* ignore */ }
    }
    return did;
  }

  function inviteUrl(code) {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('room', code);
    return u.toString();
  }

  window.ZhamaoNet = {
    BASE, ENABLED, message, readSession, writeSession, deviceId, inviteUrl,
    create: (nick, avatar, config) => request('POST', 'create', { body: { nick, avatar, deviceId: deviceId(), config } }),
    // mode：'play' 想坐下（坐不下服务器就让我先观战，回应里 fellBack 写原因）；'watch' 只观战
    join: (code, nick, avatar, mode) => request('POST', 'join', { body: { code, nick, avatar, deviceId: deviceId(), mode: mode || 'play' } }),
    act: (code, token, action, body) => request('POST', action, { code, token, body, timed: true }),
    rtt,
    // 量一下来回：最便宜的请求（不碰数据库），一局里每隔一阵发一次，没出牌的人也有来回可量
    ping: () => { const t0 = performance.now(); return fetch(BASE + '?action=state&code=0', { method: 'GET', cache: 'no-store' }).then(() => { noteRtt(performance.now() - t0); }, () => {}); },
    // 叫醒服务器：fly 上没人用会休眠，第一下要 2–3 秒。点开「联机」就先发一个最便宜的请求（不碰数据库），等真建房时它多半醒了
    warm: () => fetch(BASE + '?action=state&code=0', { method: 'GET', cache: 'no-store' }).catch(() => {}),
    // fx：牌桌互动的序号（-1 = 刚进来，只要序号）；带上它，有新互动时长轮询也会立刻回来（回应里 fx / fxSeq，房间没变时不带 state）
    state: (code, token, since, signal, fx) => request('GET', 'state', { code, token, query: Object.assign({ since: String(since || 0) }, fx != null ? { fx: String(fx) } : {}), signal }),
    emote: (code, token, body) => request('POST', 'emote', { code, token, body }),
  };
})();
