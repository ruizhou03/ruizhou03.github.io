/* 记账·端到端加密云同步（ledger-sync.js）
 * 思路：明文账本 tool.ledger.v1 永远只在本机；这里维护一份「加密镜像」tool.ledger.enc.v1，
 * 由 cloud-sync.js 随账号上传/拉回。后端那段永远是 AES-GCM 密文，站长也读不到。
 *  - 同步密码：PBKDF2(15万次)派生 AES-GCM 密钥；密码只存本机(tool.ledger.syncpass.v1)、绝不上传。
 *  - 合并：拉回后按笔合并（id 并集 + updatedAt 较新者胜），类目/账户/周期按 id 并集保留本机；
 *    settings 各设备独立、不跨设备覆盖。
 *  - 防死循环：每次随机 IV 会让密文必变，故只在「内容签名(canon)」真的变化时才重新加密+推。
 */
(function () {
  'use strict';
  var ENC_KEY = 'tool.ledger.enc.v1';     // 加密镜像（进 cloud-sync KEYS，会同步）
  var PASS_KEY = 'tool.ledger.syncpass.v1'; // 同步密码（只在本机，绝不进 KEYS）

  var key = null, salt = null, unlocked = false;
  var lastSig = null, inflight = false, dirty = false;

  function $(id) { return document.getElementById(id); }
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storedPass() { return ls(PASS_KEY); }
  function hasEncBlob() { return !!ls(ENC_KEY); }
  function loggedIn() { return !!(window.SiteAuth && window.SiteAuth.isLoggedIn()); }

  // ---- 加密原语 ----
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  async function deriveKey(pass, saltU8) {
    var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltU8, iterations: 150000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptSnapshot(snap) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(snap)));
    return { app: 'ruizhou-ledger', enc: true, v: 1, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
  }
  async function decryptBlob(blob, k) {
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, k || key, unb64(blob.data));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  // 内容签名（忽略数组顺序与 settings；只有真内容变了才会变）
  function canon(snap) {
    function byId(a) { return (a || []).slice().sort(function (x, y) { return x.id < y.id ? -1 : (x.id > y.id ? 1 : 0); }); }
    return JSON.stringify({ v: snap.version, t: byId(snap.transactions), c: byId(snap.categories), a: byId(snap.accounts), r: byId(snap.recurring) });
  }

  // ---- 出站：加密 + 写镜像 + 推 ----
  async function syncOut(force) {
    if (!unlocked || !window.LedgerCore) return;
    if (inflight) { dirty = true; return; }
    var snap = window.LedgerCore.getSnapshot();
    var sig = canon(snap);
    if (!force && sig === lastSig) return;
    inflight = true;
    try {
      var blob = await encryptSnapshot(snap);
      var str = JSON.stringify(blob);
      if (str.length > 230 * 1024) { showHint('账本太大，超过云同步体积上限（与森林/目标共用 256KB），本次没上传。可在「备份/导入」做文件备份。'); inflight = false; return; }
      localStorage.setItem(ENC_KEY, str);
      lastSig = sig;
      if (window.CloudSync && window.CloudSync.push) window.CloudSync.push(true);
    } catch (e) { /* 忽略单次失败，下次改动会再试 */ }
    inflight = false;
    if (dirty) { dirty = false; syncOut(); }
  }

  // ---- 入站：解密镜像 + 按笔合并 ----
  async function syncIn() {
    if (!unlocked) { renderStatus(); return; }
    var raw = ls(ENC_KEY); if (!raw) return;
    var blob; try { blob = JSON.parse(raw); } catch (e) { return; }
    try {
      var k = key, s = salt;
      if (blob.salt && (!salt || b64(salt) !== blob.salt)) { s = unb64(blob.salt); k = await deriveKey(storedPass() || '', s); }
      var snap = await decryptBlob(blob, k);
      key = k; salt = s;
      window.LedgerCore.mergeSnapshot(snap);
      lastSig = canon(window.LedgerCore.getSnapshot());
    } catch (e) { /* 解不开（密码不符/损坏）→ 忽略，保留本机 */ }
  }

  // ---- 开启 / 解锁 / 关闭 ----
  async function enable(pass) {
    if (hasEncBlob()) return unlock(pass); // 本机已有镜像（别处建过）→ 当解锁处理
    salt = crypto.getRandomValues(new Uint8Array(16));
    key = await deriveKey(pass, salt);
    unlocked = true; localStorage.setItem(PASS_KEY, pass); lastSig = null;
    await syncOut(true);
  }
  async function unlock(pass) {
    var raw = ls(ENC_KEY);
    if (!raw) return enable(pass);
    var blob = JSON.parse(raw);
    var s = unb64(blob.salt);
    var k = await deriveKey(pass, s);
    var snap = await decryptBlob(blob, k); // 密码错会在这里抛
    key = k; salt = s; unlocked = true; localStorage.setItem(PASS_KEY, pass);
    window.LedgerCore.mergeSnapshot(snap);
    lastSig = canon(window.LedgerCore.getSnapshot());
  }
  function disable() {
    try { localStorage.removeItem(PASS_KEY); } catch (e) {}
    unlocked = false; key = null; salt = null; lastSig = null;
  }

  // ---- UI ----
  function showHint(msg) { var st = $('lg-sync-status'); if (st) st.innerHTML = '<span class="lg-c-warn">' + msg + '</span>'; }
  function renderStatus() {
    var st = $('lg-sync-status'), pass = $('lg-sync-pass'), act = $('lg-sync-action'), off = $('lg-sync-off');
    if (!st) return;
    if (!loggedIn()) {
      st.innerHTML = '登录后可开启<b>端到端加密云同步</b>：数据加密上传、换设备登录+输密码即可同步，站长也读不到。请先在页面右上角登录。';
      if (pass) pass.hidden = true; if (act) act.hidden = true; if (off) off.hidden = true; return;
    }
    if (unlocked) {
      st.innerHTML = '[[zi:check]] 云同步已开启（端到端加密，密码只存本机）。改账会自动加密上传。';
      if (pass) pass.hidden = true; if (act) act.hidden = true; if (off) off.hidden = false; return;
    }
    if (hasEncBlob()) {
      st.innerHTML = '[[zi:cloud]] 云端已有加密账本。输入<b>同步密码</b>在本机解锁并合并。';
      if (pass) { pass.hidden = false; pass.placeholder = '同步密码'; }
      if (act) { act.hidden = false; act.textContent = '解锁并同步'; act.dataset.mode = 'unlock'; }
      if (off) off.hidden = true; return;
    }
    st.innerHTML = '设一个<b>同步密码</b>开启云同步（端到端加密；<b>务必记住，忘了找不回</b>）。';
    if (pass) { pass.hidden = false; pass.placeholder = '设置同步密码'; }
    if (act) { act.hidden = false; act.textContent = '开启云同步'; act.dataset.mode = 'enable'; }
    if (off) off.hidden = true;
  }

  function wireUI() {
    var act = $('lg-sync-action'), off = $('lg-sync-off'), pass = $('lg-sync-pass');
    if (act) act.onclick = async function () {
      var p = (pass && pass.value || '').trim();
      if (!p) { if (pass) pass.focus(); return; }
      if (p.length < 4) { alert('同步密码太短，至少 4 位。'); return; }
      act.disabled = true;
      try {
        if (act.dataset.mode === 'unlock') await unlock(p); else await enable(p);
        if (pass) pass.value = '';
      } catch (e) { alert('密码不对，或解密失败。请检查同步密码。'); }
      act.disabled = false; renderStatus();
    };
    if (off) off.onclick = function () {
      if (confirm('关闭本机的云同步？本地账本保留、云端不动；以后可再输密码重新开启。')) { disable(); renderStatus(); }
    };
  }

  async function onAuth() {
    if (loggedIn() && storedPass() && hasEncBlob() && !unlocked) {
      try { await unlock(storedPass()); } catch (e) { /* 存的密码失效（极少）→ 等用户重输 */ }
    }
    if (!loggedIn()) { unlocked = false; key = null; salt = null; }
    renderStatus();
  }

  function init() {
    wireUI();
    window.addEventListener('ledger:changed', function () { syncOut(); });
    window.addEventListener('cloudsync:pulled', function () { syncIn(); });
    window.addEventListener('storage', function (e) { if (e && e.key === ENC_KEY) syncIn(); });
    if (window.SiteAuth && window.SiteAuth.onChange) window.SiteAuth.onChange(function () { onAuth(); });
    window.LedgerSync = { renderStatus: renderStatus };
    onAuth();
  }

  // 等 SiteAuth / LedgerCore / CloudSync 就位（它们在 default.html 末尾 + 本页脚本里异步加载）
  var tries = 0;
  (function waitReady() {
    if ((window.SiteAuth && window.LedgerCore && window.CloudSync) || tries > 60) { init(); return; }
    tries++; setTimeout(waitReady, 100);
  })();
})();
