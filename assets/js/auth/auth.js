/* SiteAuth —— 全站统一账号前端模块。
 * 挂在 window.SiteAuth，所有页面（博客 + 百宝箱）共用一个登录态。
 * 新账号由邮件验证码或已验签的 Google 身份创建；本站不再接受或保存登录密码。
 * 短期 access token 与一次性 refresh token 暂存 localStorage；登录后所有受保护请求
 * 用 authedFetch 自动带 Authorization，并在 access 过期时轮换 refresh token。
 * 与小游戏的 gs.did.v1 / 文末点赞的 rxn-uid 解耦：登录后调 claim 把这台设备的
 * 历史数据认领到账号名下（首次登录自动认领）。
 */
(function () {
  'use strict';

  var API = 'https://zircon-urge.fly.dev/api';
  var K_TOKEN = 'site.auth.token.v1';
  var K_REFRESH = 'site.auth.refresh.v1';
  var K_USER = 'site.auth.user.v1';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var listeners = [];
  function emit() {
    var u = SiteAuth.getUser();
    listeners.forEach(function (cb) { try { cb(u); } catch (e) {} });
  }

  function setSession(token, user, refreshToken) {
    if (token) lsSet(K_TOKEN, token);
    if (refreshToken) lsSet(K_REFRESH, refreshToken);
    else if (refreshToken === '') lsDel(K_REFRESH);
    if (user) lsSet(K_USER, JSON.stringify(user));
    emit();
  }

  function clearSession() {
    lsDel(K_TOKEN);
    lsDel(K_REFRESH);
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

  // 向 /me 复核某张 token 是否真的失效。仅当明确收到 401 才算失效（返回 true）；
  // 网络错误 / 其它状态一律当作"仍然有效"（返回 false），避免误登出。
  async function tokenRevokedLive(token) {
    if (!token) return false;
    try {
      var res = await fetch(API + '/auth?action=me', { headers: { 'Authorization': 'Bearer ' + token } });
      return res.status === 401;
    } catch (e) { return false; }
  }

  // 同一页面只允许一个 refresh 请求在飞；跨标签页时再比较 localStorage 中的
  // refresh token，避免另一个标签已经轮换成功后，本标签的重放 401 误清新会话。
  var refreshPromise = null;
  async function rotateAccessToken() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async function () {
      var attempted = lsGet(K_REFRESH);
      if (!attempted) return { ok: false, definitive: false };
      try {
        var res = await fetch(API + '/auth?action=refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: attempted }),
        });
        var data = null;
        try { data = await res.json(); } catch (e) {}
        if (res.ok && data && data.token && data.refreshToken && data.user) {
          setSession(data.token, data.user, data.refreshToken);
          return { ok: true, token: data.token };
        }
        if (res.status === 401) {
          var currentRefresh = lsGet(K_REFRESH);
          if (currentRefresh && currentRefresh !== attempted && SiteAuth.getToken()) {
            return { ok: true, token: SiteAuth.getToken() };
          }
          clearSession();
          return { ok: false, definitive: true };
        }
      } catch (e) {}
      return { ok: false, definitive: false };
    })();
    try { return await refreshPromise; }
    finally { refreshPromise = null; }
  }

  async function post(path, body, withAuth) {
    var did = lsGet('gs.did.v1');
    async function send(token) {
      var headers = { 'Content-Type': 'application/json' };
      if (withAuth && token) headers['Authorization'] = 'Bearer ' + token;
      if (did) headers['X-Device-Id'] = did;
      return fetch(API + path, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body || {}),
      });
    }
    var t = withAuth ? SiteAuth.getToken() : '';
    var res = await send(t);
    if (withAuth && res.status === 401 && lsGet(K_REFRESH)) {
      var rotated = await rotateAccessToken();
      if (rotated.ok) res = await send(rotated.token);
    }
    var data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data: data || {} };
  }

  // 登录/验证成功后：存 session + 认领本机设备数据（失败不阻塞登录）
  async function afterAuth(r) {
    if (!r.ok || !r.data.token) {
      return { ok: false, error: (r.data && r.data.error) || 'auth_failed', status: r.status };
    }
    setSession(r.data.token, r.data.user, r.data.refreshToken || '');
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
    getRefreshToken: function () { return lsGet(K_REFRESH); },
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

    requestEmailCode: async function (email) {
      var r = await post('/auth?action=request-email-code', { email: email });
      if (!r.ok) return { ok: false, error: (r.data && r.data.error) || 'failed', status: r.status };
      return { ok: true };
    },

    verifyEmailCode: async function (email, code) {
      var r = await post('/auth?action=verify-email-code', { email: email, code: code });
      return afterAuth(r);
    },

    // 用 Google ID token 登录，或在首次验证时创建账号。
    loginWithGoogle: async function (idToken) {
      var r = await post('/auth?action=google', { idToken: idToken });
      return afterAuth(r);
    },

    // 已验证邮箱的账号可以再关联同名 Google 身份；后端按稳定 sub 绑定。
    linkGoogle: async function (idToken) {
      var r = await post('/auth?action=link-google', { idToken: idToken }, true);
      return afterAuth(r);
    },

    logout: async function () {
      try { if (SiteAuth.getToken()) await post('/auth?action=logout', {}, true); }
      catch (e) {}
      clearSession();
      return { ok: true };
    },

    // 更新资料：{ nick?, bio?, avatar? }。成功后刷新本地 user 缓存 + 同步昵称到小游戏身份，
    // 触发 onChange 让导航头像/账号页即时重渲染。
    updateProfile: async function (fields) {
      var r = await post('/auth?action=profile', fields || {}, true);
      if (!r.ok || !r.data || !r.data.user) {
        return { ok: false, error: (r.data && r.data.error) || 'update_failed' };
      }
      setSession(null, r.data.user);
      if (r.data.user.nick) lsSet('gs.nick.v1', r.data.user.nick);
      return { ok: true, user: r.data.user };
    },

    // 邮件订阅与账号注册分离：两个 Topic 默认关闭，只在用户主动操作后更新。
    getSubscriptions: async function () {
      var res = await SiteAuth.authedFetch(API + '/subscriptions?action=me');
      var data = null; try { data = await res.json(); } catch (e) {}
      if (!res.ok || !data || !data.preferences) {
        return { ok: false, error: (data && data.error) || 'load_failed' };
      }
      return { ok: true, preferences: data.preferences };
    },

    updateSubscriptions: async function (fields) {
      var r = await post('/subscriptions?action=update', fields || {}, true);
      if (!r.ok || !r.data || !r.data.preferences) {
        return { ok: false, error: (r.data && r.data.error) || 'update_failed' };
      }
      return { ok: true, preferences: r.data.preferences, pending: r.status === 202 };
    },

    // 导出当前账号的全部数据（返回对象，由调用方生成下载）。
    exportData: async function () {
      var res = await SiteAuth.authedFetch(API + '/me?action=export');
      if (!res.ok) return { ok: false };
      var d = null; try { d = await res.json(); } catch (e) {}
      return d && d.ok ? { ok: true, data: d.data } : { ok: false };
    },

    // 注销账号：成功后清本地登录态（触发 onChange → 回到游客态）。
    deleteAccount: async function () {
      var r = await post('/auth?action=delete', {}, true);
      if (!r.ok) return { ok: false, error: (r.data && r.data.error) || 'failed' };
      clearSession();
      return { ok: true };
    },

    // 每日签到（+2；服务端每天只给一次）。本机按日期去重，避免每次访问都打接口。
    checkin: async function () {
      if (!SiteAuth.isLoggedIn()) return { ok: false };
      var today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      if (lsGet('site.auth.checkin.v1') === today) return { ok: true, skipped: true };
      var r = await post('/points?action=checkin', {}, true);
      if (r.ok && r.data) {
        lsSet('site.auth.checkin.v1', today);
        var u = SiteAuth.getUser();
        if (u) { u.points = r.data.points; u.level = r.data.level; setSession(null, u); }  // 更新等级 → onChange
      }
      return r;
    },

    // 分享加分（+3，≤15/日）。调用方负责实际的复制/分享动作。
    share: async function (postId) {
      if (!SiteAuth.isLoggedIn()) return { ok: false };
      var r = await post('/points?action=share', { post: postId || '' }, true);
      if (r.ok && r.data) {
        var u = SiteAuth.getUser();
        if (u) { u.points = r.data.points; u.level = r.data.level; setSession(null, u); }
      }
      return r;
    },

    // 校验本地 access token；过期时先轮换一次性 refresh token，再重试 /me。
    refresh: async function () {
      var t = SiteAuth.getToken();
      if (!t) return null;
      try {
        async function currentUser(token) {
          return fetch(API + '/auth?action=me', {
            headers: { 'Authorization': 'Bearer ' + token },
          });
        }
        var res = await currentUser(t);
        if (res.status === 401 && lsGet(K_REFRESH)) {
          var rotated = await rotateAccessToken();
          if (rotated.ok) res = await currentUser(rotated.token);
          else if (rotated.definitive) return null;
          else return SiteAuth.getUser();
        }
        if (res.status === 401) { clearSession(); return null; }
        var data = await res.json();
        if (data && data.user) { setSession(null, data.user); return data.user; }
      } catch (e) {}
      return SiteAuth.getUser();
    },

    // 受保护请求统一入口：自动带 Authorization + X-Device-Id；401 时先刷新并重试一次。
    authedFetch: async function (url, opts) {
      opts = opts || {};
      var did = lsGet('gs.did.v1');
      var full = url.indexOf('http') === 0 ? url : (API.replace(/\/api$/, '') + url);
      async function send(token) {
        var requestOpts = Object.assign({}, opts);
        var headers = Object.assign({}, opts.headers || {});
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (did && !headers['X-Device-Id']) headers['X-Device-Id'] = did;
        requestOpts.headers = headers;
        return fetch(full, requestOpts);
      }
      var t = SiteAuth.getToken();
      var res = await send(t);
      if (res.status === 401 && t && lsGet(K_REFRESH)) {
        var rotated = await rotateAccessToken();
        if (rotated.ok) return send(rotated.token);
        if (rotated.definitive) return res;
      }
      // 兼容切换前签发、没有 refresh token 的旧登录态：只在 /me 明确确认失效后清除。
      if (res.status === 401 && t && !lsGet(K_REFRESH) && await tokenRevokedLive(t)) clearSession();
      return res;
    },

    API_BASE: API,
  };

  window.SiteAuth = SiteAuth;

  // 启动时：已登录则确保账号身份生效（幂等），再后台静默校验 token
  if (SiteAuth.isLoggedIn()) {
    adoptAccountIdentity(SiteAuth.getUser());
    setTimeout(function () {
      SiteAuth.refresh().then(function () { if (SiteAuth.checkin) SiteAuth.checkin(); });
    }, 300);
  }
})();
