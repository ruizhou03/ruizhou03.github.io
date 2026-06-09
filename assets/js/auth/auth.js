/* SiteAuth —— 全站统一账号前端模块。
 * 挂在 window.SiteAuth，所有页面（博客 + 百宝箱）共用一个登录态。
 * token 存 localStorage，登录后所有受保护请求用 authedFetch 自动带 Authorization。
 * 与小游戏的 gs.did.v1 / 文末点赞的 rxn-uid 解耦：登录后调 claim 把这台设备的
 * 历史数据认领到账号名下（首次登录自动认领）。
 */
(function () {
  'use strict';

  var API = 'https://zircon-urge.fly.dev/api';
  var K_TOKEN = 'site.auth.token.v1';
  var K_USER = 'site.auth.user.v1';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var listeners = [];
  function emit() {
    var u = SiteAuth.getUser();
    listeners.forEach(function (cb) { try { cb(u); } catch (e) {} });
  }

  function setSession(token, user) {
    if (token) lsSet(K_TOKEN, token);
    if (user) lsSet(K_USER, JSON.stringify(user));
    emit();
  }

  function clearSession() {
    lsDel(K_TOKEN);
    lsDel(K_USER);
    restoreAnonIdentity();   // 还原匿名身份（登出/登录态失效时）
    emit();
  }

  // 取本机各处历史身份，登录后上报认领
  function deviceIdentity() {
    return {
      did: lsGet('gs.did.v1') || '',
      rxnUid: lsGet('rxn-uid') || '',
    };
  }

  // ── 身份采用（Phase 5：百宝箱打通）──
  // 登录后把各处"设备身份"统一切成账号身份(accountId)，于是所有按设备 id 存的工具
  // 自动按账号存、跨设备同步；登出时还原匿名身份。覆盖三套独立的设备 id：
  //   gs.did.v1            —— 20+ games-shell 小游戏（排行榜/续局/对战）
  //   tool.pet-food.deviceId —— 宠物中心
  //   rxn-uid              —— 文末表情点赞
  // gs.nick.v1（昵称）单独切成账号昵称。
  var ADOPT_FLAG = 'gs.id.adopted.v1';
  var DEVICE_KEYS = [
    { key: 'gs.did.v1', bak: 'gs.did.anon.v1' },
    { key: 'tool.pet-food.deviceId', bak: 'pf.deviceId.anon.v1' },
    { key: 'rxn-uid', bak: 'rxn-uid.anon.v1' },
  ];
  function adoptAccountIdentity(user) {
    if (!user || !user.accountId) return;
    var acc = user.accountId;
    // 逐个 key 独立备份：仅当"该 key 还没备份过"且"当前值不是账号 id"时才备份当前值，
    // 再覆盖为 accountId。这样即使后来往列表里新增 key（如 pet-food），也不会无备份覆盖。
    DEVICE_KEYS.forEach(function (m) {
      var cur = lsGet(m.key);
      if (lsGet(m.bak) === null && cur !== acc) lsSet(m.bak, cur || ''); // 空串=原本无
      lsSet(m.key, acc);
    });
    if (lsGet('gs.nick.anon.v1') === null && lsGet('gs.nick.v1') !== (user.nick || '')) {
      lsSet('gs.nick.anon.v1', lsGet('gs.nick.v1') || '');
    }
    if (user.nick) lsSet('gs.nick.v1', user.nick);
    lsSet(ADOPT_FLAG, '1');
  }
  function restoreAnonIdentity() {
    if (lsGet(ADOPT_FLAG) !== '1') return;
    DEVICE_KEYS.forEach(function (m) {
      var v = lsGet(m.bak);
      if (v) lsSet(m.key, v); else lsDel(m.key);   // 原本无 → 删除让其重新生成
      lsDel(m.bak);
    });
    var n = lsGet('gs.nick.anon.v1');
    if (n) lsSet('gs.nick.v1', n); else lsDel('gs.nick.v1');
    lsDel('gs.nick.anon.v1'); lsDel(ADOPT_FLAG);
  }

  async function post(path, body, withAuth) {
    var headers = { 'Content-Type': 'application/json' };
    if (withAuth) {
      var t = SiteAuth.getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
    }
    var did = lsGet('gs.did.v1');
    if (did) headers['X-Device-Id'] = did;
    var res = await fetch(API + path, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body || {}),
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data: data || {} };
  }

  // 登录/注册成功后：存 session + 认领本机设备数据（失败不阻塞登录）
  async function afterAuth(r) {
    if (!r.ok || !r.data.token) {
      return { ok: false, error: (r.data && r.data.error) || 'auth_failed', status: r.status };
    }
    setSession(r.data.token, r.data.user);
    // 认领是 best-effort，不该挡在登录关键路径上：fire-and-forget，让弹窗能立刻关。
    // 必须在 adopt 之前发起——post() 同步读取匿名 gs.did.v1 作 X-Device-Id（在首个 await 前），
    // 之后再 adopt 覆写成 accountId，已发出的请求头不受影响。
    try {
      var ident = deviceIdentity();   // 用当前(匿名)did 上报认领，须在采用前
      if (ident.did || ident.rxnUid) post('/auth?action=claim', ident, true).catch(function () {});
    } catch (e) {}
    adoptAccountIdentity(r.data.user);  // 切成账号身份（联网工具跨设备同步）
    return { ok: true, user: r.data.user };
  }

  var SiteAuth = {
    getToken: function () { return lsGet(K_TOKEN); },
    getUser: function () {
      var raw = lsGet(K_USER);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    isLoggedIn: function () { return !!SiteAuth.getToken(); },

    onChange: function (cb) {
      if (typeof cb === 'function') {
        listeners.push(cb);
        try { cb(SiteAuth.getUser()); } catch (e) {}
      }
      return function () { listeners = listeners.filter(function (f) { return f !== cb; }); };
    },

    register: async function (email, password, nick) {
      var r = await post('/auth?action=register', { email: email, password: password, nick: nick });
      return afterAuth(r);
    },

    login: async function (email, password) {
      var r = await post('/auth?action=login', { email: email, password: password });
      return afterAuth(r);
    },

    // 用 Google ID token 登录/注册（前端由 Google Identity Services 拿到 credential）
    loginWithGoogle: async function (idToken) {
      var r = await post('/auth?action=google', { idToken: idToken });
      return afterAuth(r);
    },

    logout: function () { clearSession(); },

    // 校验本地 token 是否仍有效；无效则登出。返回最新 user 或 null。
    refresh: async function () {
      var t = SiteAuth.getToken();
      if (!t) return null;
      try {
        var res = await fetch(API + '/auth?action=me', {
          headers: { 'Authorization': 'Bearer ' + t },
        });
        if (res.status === 401) { clearSession(); return null; }
        var data = await res.json();
        if (data && data.user) { setSession(null, data.user); return data.user; }
      } catch (e) {}
      return SiteAuth.getUser();
    },

    // 受保护请求统一入口：自动带 Authorization + X-Device-Id；401 时登出。
    authedFetch: async function (url, opts) {
      opts = opts || {};
      var headers = Object.assign({}, opts.headers || {});
      var t = SiteAuth.getToken();
      if (t) headers['Authorization'] = 'Bearer ' + t;
      var did = lsGet('gs.did.v1');
      if (did && !headers['X-Device-Id']) headers['X-Device-Id'] = did;
      opts.headers = headers;
      var full = url.indexOf('http') === 0 ? url : (API.replace(/\/api$/, '') + url);
      var res = await fetch(full, opts);
      if (res.status === 401) clearSession();
      return res;
    },

    API_BASE: API,
  };

  window.SiteAuth = SiteAuth;

  // 启动时：已登录则确保账号身份生效（幂等），再后台静默校验 token
  if (SiteAuth.isLoggedIn()) {
    adoptAccountIdentity(SiteAuth.getUser());
    setTimeout(function () { SiteAuth.refresh(); }, 300);
  }
})();
