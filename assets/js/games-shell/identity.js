/* games-shell/identity.js
 * 玩家身份：跨游戏共享一个 nick + did。
 * - nick：用户起的昵称，3-12 codepoint，前后端一致校验
 * - did：每台设备一次性生成的 UUID-like，用于跨昵称追踪"我的最高"
 *
 * 用 GamesShell.Identity.{ getNick, setNick, validateNick, getDeviceId }
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};

  const NICK_KEY = 'gs.nick.v1';
  const DEVICE_KEY = 'gs.did.v1';
  const NICK_MIN_CP = 2;
  const NICK_MAX_CP = 12;
  // 拒：HTML 危险字符、控制字符、零宽 / 双向控制字符（与后端正则一致）
  const NICK_REJECT_RE = /[<>&"'\/\\\x00-\x1F​-‏﻿‪-‮]/;

  function cpLen(s) { return [...s].length; }

  function validateNick(raw) {
    if (typeof raw !== 'string') return { ok: false, reason: '昵称无效' };
    const nick = raw.trim();
    if (!nick) return { ok: false, reason: '昵称不能为空' };
    if (NICK_REJECT_RE.test(nick)) return { ok: false, reason: '昵称含非法字符' };
    const len = cpLen(nick);
    if (len < NICK_MIN_CP) return { ok: false, reason: `昵称至少 ${NICK_MIN_CP} 字` };
    if (len > NICK_MAX_CP) return { ok: false, reason: `昵称最多 ${NICK_MAX_CP} 字` };
    return { ok: true, nick };
  }

  function getNick() {
    try { return localStorage.getItem(NICK_KEY) || null; } catch { return null; }
  }
  function setNick(nick) {
    const v = validateNick(nick);
    if (!v.ok) return v;
    try { localStorage.setItem(NICK_KEY, v.nick); } catch {}
    return { ok: true, nick: v.nick };
  }
  function clearNick() {
    try { localStorage.removeItem(NICK_KEY); } catch {}
  }

  function generateUuid() {
    // 不依赖 crypto.randomUUID（Safari < 15.4 没有）
    if (window.crypto && crypto.randomUUID) {
      try { return crypto.randomUUID(); } catch {}
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getDeviceId() {
    try {
      let id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = generateUuid();
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch { return null; }
  }

  function generateRandomNick() {
    const adj = ['迷糊', '勤奋', '佛系', '内卷', '秃头', '咕咕', '红温', '摆烂', '神秘', '通宵', '元气', '咸鱼'];
    const noun = ['玩家', '同学', '同事', '研究员', '科学家', '调参侠', '画图人', '炼丹师', '咖啡党', '植物'];
    const a = adj[Math.floor(Math.random() * adj.length)];
    const b = noun[Math.floor(Math.random() * noun.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    return `${a}${b}${num}`;
  }

  // 生成一次 run 的 nonce —— 让后端做幂等（同一 nonce 24h 不重复入榜）
  function newRunNonce() {
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  GS.Identity = {
    getNick, setNick, clearNick, validateNick,
    getDeviceId,
    generateRandomNick,
    newRunNonce,
  };
})();
