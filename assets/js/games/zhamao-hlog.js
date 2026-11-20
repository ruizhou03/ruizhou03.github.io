/* 百变小咪 · 真人单机对局匿名日志（window.ZhamaoHlog，2026-11-19）
 * 单机打完一局，把「开局种子 + 规则 + 每一步（谁、做了什么、开局后第几毫秒）+ 结果」发给 zircon-urge（/api/zhamao?action=hlog），
 * 用来校准 / 改进机器猫：训练场拿种子和这串动作在规则引擎里重放，还原真人每次做决定时的局面。
 * 不带昵称、头像、账号、设备号；教程 / 联机 / 调试过的局不发；浏览器开了「请勿追踪 / GPC」也不发。
 * 座位号一律按「我坐 0 号」记（出局后换视角观战时桌子会转，记的时候转回来）。 */
(function (root) {
  'use strict';
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const URL = root.ZHAMAO_HLOG_URL || (LOCAL ? 'http://127.0.0.1:8789' : 'https://zircon-urge.fly.dev') + '/api/zhamao?action=hlog';   // ZHAMAO_HLOG_URL：本机验收时指到别的端口
  const MAX_ACTS = 3900;
  const optOut = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || root.doNotTrack === '1';
  const build = (() => {
    const s = document.querySelector('script[src*="zhamao-ai.js"]');
    const m = s && /[?&]v=(\d+)/.exec(s.src);
    return m ? 'b' + m[1] : 'dev';
  })();
  const rid = () => Array.from({ length: 12 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
  const KEYS = ['cards', 'order', 'target', 'card', 'pos', 'idx', 'named'];
  function slim(d) {
    const o = { type: d.type };
    for (const k of KEYS) if (d[k] !== undefined && d[k] !== null) o[k] = Array.isArray(d[k]) ? d[k].slice() : d[k];
    if (d.rand === true) o.rand = true;
    if (d.type === 'rescue') o.yes = !!d.yes;
    return o;
  }
  const real = (game, seat) => { const n = game.state.n; return seat < 0 ? -1 : (seat + (game.pov || 0) + n) % n; };

  function start(game, state, seed) {
    if (optOut()) { game.hl = null; return; }
    game.hl = {
      v: 1, id: rid(), ver: build, at: Date.now(), n: state.n, seed: (seed >>> 0) || 1,
      rules: JSON.parse(JSON.stringify(state.rules || {})), tiers: game.tiers.slice(), human: [0], acts: [], t0: Date.now(),
    };
  }
  function push(game, a) {
    const h = game && game.hl;
    if (!h) return;
    if (h.acts.length >= MAX_ACTS) { game.hl = null; return; }
    h.acts.push(a);
  }
  // flag：1 = 超时 / 托管替我做的（不是真人自己点的）
  function act(game, seat, d, flag) {
    if (!game || !game.hl || !d) return;
    const a = [real(game, seat), Date.now() - game.hl.t0, slim(d)];
    if (flag) a.push(flag);
    push(game, a);
  }
  function close(game) { if (game && game.hl) push(game, [-1, Date.now() - game.hl.t0, { type: 'close' }]); }
  function finish(game) {
    const h = game && game.hl;
    if (!h) return;
    game.hl = null;
    const s = game.state, n = s.n, r = (x) => (x >= 0 ? real(game, x) : -1);
    const body = Object.assign({}, h, { res: { winner: r(s.winner), winnerTeam: s.winnerTeam != null ? s.winnerTeam : -1, outOrder: s.outOrder.map(r) } });
    delete body.t0;
    if (body.acts.length < 2 || body.res.outOrder.length >= n) return;
    try { fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (_) { /* 离线 */ }
  }
  // 「这步不对」反馈（zhamao-feedback.js）：当场发一份打到一半的快照（res.open），这局要是没打完反馈也不丢；打完整局日志里同样带着 fb
  function snapshot(game) {
    const h = game && game.hl;
    if (!h || !h.fb || !h.fb.length) return;
    const s = game.state, r = (x) => (x >= 0 ? real(game, x) : -1);
    const body = Object.assign({}, h, { id: h.id + 'f' + h.fb.length, acts: h.acts.slice(), fb: h.fb.slice(), res: { open: true, winner: -1, winnerTeam: -1, outOrder: s.outOrder.map(r) } });
    delete body.t0;
    try { fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (_) { /* 离线 */ }
  }
  // 接着打上一局：存档里带着这局的日志就接着记（t0 按存档那一刻往后接，中间离开的时间不算）
  function restore(game, saved) {
    const h = saved && saved.v === 1 && Array.isArray(saved.acts) ? saved : null;
    game.hl = h && !optOut() ? Object.assign(h, { t0: Date.now() - (h.acts.length ? h.acts[h.acts.length - 1][1] : 0) }) : null;
  }
  root.ZhamaoHlog = { start, act, close, finish, restore, snapshot };
})(typeof window !== 'undefined' ? window : this);
