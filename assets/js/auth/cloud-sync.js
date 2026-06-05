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
  // 需要云同步的纯本地工具 key（联网工具已通过账号身份打通，不在此列）
  var KEYS = [
    'tool.forest.trees.v1', 'tool.forest.fields.v1',
    'tool.forest.active.v1', 'tool.forest.activeField.v1', 'tool.forest.theme.v1',
    'tool.goals.v1',
    'vision.history',
    // 宠物中心：身份(tool.pet-food.deviceId)已由 auth.js 在登录时切成 accountId，这里
    // 再把“宠物数据”随账号同步，本地宠物（如旺仔）就能跨设备出现。只同步状态、不同步
    // deviceId（deviceId 归 auth.js 的身份采用管，重复同步会和它的登出还原打架）。
    'tool.pet-food.v1',
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

  async function pull() {
    try {
      var r = await SiteAuth.authedFetch(API + '?action=kv-get');
      if (!r.ok) return;
      var d = await r.json();
      if (!d || !d.ok || !d.data) return;
      var keys = Object.keys(d.data);
      if (keys.length) {
        keys.forEach(function (k) {
          if (KEYS.indexOf(k) >= 0) {
            try { localStorage.setItem(k, d.data[k]); } catch (e) {}
          }
        });
        lastSent = JSON.stringify(snapshot());
        // 同标签页内 localStorage 改动不会触发 storage 事件，工具页拿不到拉取通知。
        // 主动派发一个事件，让已加载的工具（如宠物中心）合并并重渲染，无需手动刷新。
        try { window.dispatchEvent(new CustomEvent('cloudsync:pulled', { detail: { keys: keys } })); } catch (e) {}
      } else {
        push(true); // 云端为空 → 首次播种本地数据
      }
    } catch (e) {}
  }

  async function push(force) {
    if (!SiteAuth.isLoggedIn()) return;
    var snap = JSON.stringify(snapshot());
    if (!force && snap === lastSent) return; // 无变化不推
    lastSent = snap;
    try {
      await SiteAuth.authedFetch(API + '?action=kv-set', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: JSON.parse(snap) }),
      });
    } catch (e) {}
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
  window.addEventListener('beforeunload', function () { push(); });
  setInterval(function () { push(); }, 30000);
})();
