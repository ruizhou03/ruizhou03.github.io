/* 拱猪联机 · 网络层（window.GongzhuNet，无 DOM）
 * 后端：zircon-urge.fly.dev/api/gongzhu（服务器权威，见 backends/urge/api/gongzhu.js）。
 * 本机调试（localhost / 127.0.0.1 打开页面）默认连本机内存服务器 127.0.0.1:8788（npm run dev:gongzhu-memory）。
 * 当前房间的 { code, token } 存在 localStorage，刷新页面 / 断线回来接着打。 */
(function () {
  'use strict';
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  // 本机调试可以换端口（几个会话各开一个内存服务器时）：localStorage 'gongzhu.devPort' = 端口号
  const DEV_PORT = (() => { try { return /^\d{4,5}$/.test(localStorage.getItem('gongzhu.devPort') || '') ? localStorage.getItem('gongzhu.devPort') : '8788'; } catch (_) { return '8788'; } })();
  const BASE = LOCAL ? 'http://127.0.0.1:' + DEV_PORT + '/api/gongzhu' : 'https://zircon-urge.fly.dev/api/gongzhu';
  const SESSION_KEY = 'gongzhu.online.v1';

  const ERRORS = {
    room_not_found: '房间不存在或已经解散',
    room_full: '房间已满，换一个房号试试',
    room_in_progress: '游戏已经开始了',
    wait_round_end: '这一局还在打，打完这一局就能进',
    nick_taken_in_room: '这个昵称房间里已经有人用了，换一个试试',
    bad_nick: '昵称 1–12 个字，不能有特殊符号',
    bad_code: '房号是 4 位数字',
    seats_not_full: '四个座位都坐满（可以加机器人）才能开始',
    seat_taken: '这个座位已经有人了',
    bad_avatar: '这个头像不能用',
    host_only: '只有房主能这么做',
    room_busy: '房间有点忙，再试一次',
    not_your_turn: '还没轮到你',
    illegal_card: '这张牌现在不能出',
    spectators_full: '观战的人太多了，过一会儿再来',
    not_in_room: '你现在在观战，坐下才能打',
    not_spectator: '坐下了就不能换视角了',
    kicked: '房主请你离开了房间，过一会儿才能再坐下',
    muted: '房主把你禁言了',
    paused: '房主暂停了',
    no_player_there: '那个座位上已经没人了',
    match_not_over: '这一盘还没打完',
    no_game: '这一盘已经结束了',
  };
  function message(err) {
    if (!err) return '网络出了点问题，再试一次';
    return ERRORS[err.error] || (err.status === 429 ? '操作太快了，歇一下再试' : '网络出了点问题，再试一次');
  }

  /* 网络快慢（2026-11-22 照百变小咪）：量动作请求和 ping 一来一回要多久（长轮询会挂着等，不算），
   * 取最近几次里偏小的三分位当「这台设备到服务器的来回」，随每个请求报给服务器（?rtt=），服务器按它给出牌截止时刻留宽限（game.grace）。
   * 老后端不认 rtt 参数，照旧 */
  const rttSamples = [];
  function noteRtt(ms) {
    if (!(ms > 0) || ms > 15000) return;
    rttSamples.push(ms); if (rttSamples.length > 8) rttSamples.shift();
  }
  function rtt() {
    if (!rttSamples.length) return null;
    const s = rttSamples.slice().sort((x, y) => x - y);
    return Math.round(s[Math.floor((s.length - 1) / 3)]);
  }
  async function request(method, action, { code, token, body, query, signal, timed } = {}) {
    const r = rtt();
    const q = new URLSearchParams(Object.assign({ action }, code ? { code } : {}, query || {}, r != null && token ? { rtt: String(r) } : {}));
    const t0 = performance.now();
    const res = await fetch(BASE + '?' + q.toString(), {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: method === 'POST' ? JSON.stringify(Object.assign({ code }, body || {})) : undefined,
      signal,
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* 空响应 */ }
    if (timed && res.ok) noteRtt(performance.now() - t0);
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

  window.GongzhuNet = {
    BASE, message, readSession, writeSession, deviceId, inviteUrl,
    create: (nick, config) => request('POST', 'create', { body: { nick, deviceId: deviceId(), config } }),
    // mode：'play' 想坐下（坐不下服务器就让我先观战，回应里 fellBack 写原因）；'watch' 只观战
    join: (code, nick, mode) => request('POST', 'join', { body: { code, nick, deviceId: deviceId(), mode: mode || 'play' } }),
    act: (code, token, action, body) => request('POST', action, { code, token, body, timed: true }),
    // 盘终房主直接再来一盘（= 回到房间 + 开始，座位和机器人不变；2026-11-22 新后端才有）。结算页的按钮等版式挑定后再接：onlineAct('again')
    again: (code, token) => request('POST', 'again', { code, token, timed: true }),
    rtt,
    /* 连接探测：最便宜的一问（不限流、不碰数据库），回 { serverNow, v: 房间进度 }。顺便量一次来回。
     * 老后端没有 ping（回 400）：返回 null，调用方当没这回事 */
    // 回 false = 后端不认 ping（老版本，400），别再问了；null = 这一次没问到（断网 / 超时）
    // 不带任何自定义请求头（简单请求）：不触发跨域预检，量到的就是一个来回
    ping: async (code) => {
      const t0 = performance.now();
      try {
        const res = await fetch(BASE + '?' + new URLSearchParams(Object.assign({ action: 'ping' }, code ? { code } : {})), { cache: 'no-store' });
        if (res.status === 400) return false;
        if (!res.ok) return null;
        const j = await res.json();
        if (!j || !j.serverNow) return false;
        noteRtt(performance.now() - t0);
        return j;
      } catch (_) { return null; }
    },
    // fx：牌桌互动（道具 / 说一句）的序号；带上它，有新互动时长轮询也会立刻回来（回应里 fx / fxSeq，房间没变时不带 state）
    // 叫醒服务器：fly 机器没人用时会停掉，冷启动 2–3 秒；点开「联机」就先随便敲一下门，等真建房 / 进房时它已经醒了
    warm: () => fetch(BASE + '?action=state&code=0', { method: 'GET', cache: 'no-store' }).catch(() => {}),
    // stall：上一条长轮询卡住、被我丢掉了，卡了多少毫秒（服务器记日志）
    state: (code, token, since, signal, fx, stall) => request('GET', 'state', { code, token, query: Object.assign({ since: String(since || 0) }, fx == null ? {} : { fx: String(fx) }, stall > 0 ? { stall: String(Math.round(stall)) } : {}), signal }),
  };
})();
