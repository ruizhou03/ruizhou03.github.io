/* 拱猪联机 · 网络层（window.GongzhuNet，无 DOM）
 * 后端：zircon-urge.fly.dev/api/gongzhu（服务器权威，见 backends/urge/api/gongzhu.js）。
 * 本机调试（localhost / 127.0.0.1 打开页面）默认连本机内存服务器 127.0.0.1:8788（npm run dev:gongzhu-memory）。
 * 当前房间的 { code, token } 存在 localStorage，刷新页面 / 断线回来接着打。 */
(function () {
  'use strict';
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const BASE = LOCAL ? 'http://127.0.0.1:8788/api/gongzhu' : 'https://zircon-urge.fly.dev/api/gongzhu';
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
  };
  function message(err) {
    if (!err) return '网络出了点问题，再试一次';
    return ERRORS[err.error] || (err.status === 429 ? '操作太快了，歇一下再试' : '网络出了点问题，再试一次');
  }

  async function request(method, action, { code, token, body, query, signal } = {}) {
    const q = new URLSearchParams(Object.assign({ action }, code ? { code } : {}, query || {}));
    const res = await fetch(BASE + '?' + q.toString(), {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: method === 'POST' ? JSON.stringify(Object.assign({ code }, body || {})) : undefined,
      signal,
    });
    let json = null;
    try { json = await res.json(); } catch (_) { /* 空响应 */ }
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
    act: (code, token, action, body) => request('POST', action, { code, token, body }),
    state: (code, token, since, signal) => request('GET', 'state', { code, token, query: { since: String(since || 0) }, signal }),
  };
})();
