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
    emit();
  }

  // 取本机各处历史身份，登录后上报认领
  function deviceIdentity() {
    return {
      did: lsGet('gs.did.v1') || '',
      rxnUid: lsGet('rxn-uid') || '',
    };
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
    try {
      var ident = deviceIdentity();
      if (ident.did || ident.rxnUid) await post('/auth?action=claim', ident, true);
    } catch (e) {}
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

  // 启动时后台静默校验一次 token（不阻塞渲染）
  if (SiteAuth.isLoggedIn()) {
    setTimeout(function () { SiteAuth.refresh(); }, 300);
  }
})();
