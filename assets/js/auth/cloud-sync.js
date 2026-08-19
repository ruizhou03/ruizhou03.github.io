/* CloudSync —— 纯本地工具的账号云同步（Phase 5b）。
 * 登录后把一组 localStorage key 的快照同步到后端（/api/me kv），换设备登录拉回。
 * 不需要改各工具：靠下面的 KEYS 注册表按 key 名统一搬运。
 *
 * 策略：登录时 PULL（账号云端为准；云端为空则把本地播种上去）；之后本地变化 PUSH
 * （同标签页定时兜底 + 跨标签 storage 事件 + 离开页面时）。个人工具，末次写入为准。
 */
(function () {
  'use strict';
  if (!window.SiteAuth) return;

  var API = SiteAuth.API_BASE + '/me';
  var FOREST_V2_KEY = 'tool.forest.v2';
  var FOREST_PENDING_REMOTE_KEY = 'tool.forest.pendingRemote.v2';
  // 需要云同步的纯本地工具 key（联网工具已通过账号身份打通，不在此列）
  var KEYS = [
    'tool.forest.trees.v1', 'tool.forest.fields.v1',
    'tool.forest.active.v1', 'tool.forest.activeField.v1', 'tool.forest.theme.v1',
    // Forest v2 canonical envelope。pull 时若本机已有不同快照，不直接覆盖；先放 pending，
    // 等 Forest 页面加载 core 后按 ID/tombstone 合并。
    FOREST_V2_KEY,
    'tool.goals.v1',
    'vision.history',
    // 宠物中心：身份(tool.pet-food.deviceId)已由 auth.js 在登录时切成 accountId，这里
    // 再把“宠物数据”随账号同步，本地宠物（如旺仔）就能跨设备出现。只同步状态、不同步
    // deviceId（deviceId 归 auth.js 的身份采用管，重复同步会和它的登出还原打架）。
    'tool.pet-food.v1',
    // 记账：只同步“加密镜像”（端到端加密，由 ledger-sync.js 维护）。明文 tool.ledger.v1
    // 永远只在本机、绝不进此列表——后端那段永远是密文，站长也读不到。
    'tool.ledger.enc.v1',
  ];

  function snapshot() {
    var o = {};
    KEYS.forEach(function (k) {
      var v;
      try { v = localStorage.getItem(k); } catch (e) { v = null; }
      if (v != null) o[k] = v;
    });
    return o;
  }

  var lastSent = '';
  var dirty = true;
  var lastError = null;

  function emitStatus(status, detail) {
    try { window.dispatchEvent(new CustomEvent('cloudsync:status', { detail: Object.assign({ status: status, dirty: dirty }, detail || {}) })); } catch (e) {}
  }

  async function pull() {
    try {
      var r = await SiteAuth.authedFetch(API + '?action=kv-get');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      if (!d || !d.ok || !d.data) throw new Error('Invalid cloud snapshot');
      var keys = Object.keys(d.data);
      if (keys.length) {
        var previous = {};
        keys.forEach(function (k) {
          if (KEYS.indexOf(k) >= 0) {
            try {
              previous[k] = localStorage.getItem(k);
              if (k === FOREST_V2_KEY && previous[k] && previous[k] !== d.data[k]) {
                localStorage.setItem(FOREST_PENDING_REMOTE_KEY, d.data[k]);
              } else {
                localStorage.setItem(k, d.data[k]);
              }
            } catch (e) {}
          }
        });
        dirty = false;
        lastError = null;
        // 同标签页内 localStorage 改动不会触发 storage 事件，工具页拿不到拉取通知。
        // 主动派发一个事件，让已加载的工具（如宠物中心）合并并重渲染，无需手动刷新。
        try { window.dispatchEvent(new CustomEvent('cloudsync:pulled', { detail: { keys: keys, previous: previous, forestPendingKey: FOREST_PENDING_REMOTE_KEY } })); } catch (e) {}
        emitStatus('pulled', { keys: keys });
      } else {
        await push(true); // 云端为空 → 首次播种本地数据
      }
      return true;
    } catch (e) {
      lastError = e;
      dirty = true;
      emitStatus('error', { message: String(e && e.message || e) });
      return false;
    }
  }

  async function push(force) {
    if (!SiteAuth.isLoggedIn()) return;
    var snap = JSON.stringify(snapshot());
    if (!force && !dirty && snap === lastSent) return; // 无变化且上次已成功才不推
    dirty = true;
    emitStatus('syncing');
    try {
      var response = await SiteAuth.authedFetch(API + '?action=kv-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: JSON.parse(snap) }),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      lastSent = snap;
      dirty = false;
      lastError = null;
      emitStatus('synced');
      return true;
    } catch (e) {
      lastError = e;
      dirty = true;
      emitStatus('error', { message: String(e && e.message || e) });
      return false;
    }
  }

  // 登录态变化：刚登录 → 拉取
  var wasIn = false;
  SiteAuth.onChange(function (u) {
    var isIn = !!u;
    if (isIn && !wasIn) pull();
    if (!isIn) lastSent = '';
    wasIn = isIn;
  });

  // 跨标签页改动 → 推；离开页面 → 推；同标签页改动靠 30s 定时兜底
  window.addEventListener('storage', function (e) {
    if (e && KEYS.indexOf(e.key) >= 0) push();
  });
  window.addEventListener('pagehide', function () { push(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) push(); });
  setInterval(function () { push(); }, 30000);

  // 暴露给工具：写完同步 key 后可立刻推一次（不必等 30s 兜底）。记账加密同步用。
  window.CloudSync = {
    push: push,
    pull: pull,
    getStatus: function () { return { dirty: dirty, lastError: lastError ? String(lastError.message || lastError) : null }; },
  };
})();
