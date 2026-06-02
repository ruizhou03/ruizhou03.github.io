/* 付费墙前端 —— 账号无关的"兑换码即凭证"。
 *
 * 流程：
 *   1. 读 #paywall 上的 slug；从 localStorage 取已有 unlock token。
 *   2. 调 /api/paid?action=status 看本读者是否已解锁；已解锁 → 直接取正文注入、藏卡片。
 *   3. 未解锁 → 显示卡片（买断/会员去爱发电；输码解锁）。
 *   4. 输码 → /api/redeem → 存 token → 取正文注入。
 *
 * 凭证存 localStorage 'pw.token.v1'，一个 token 累加多篇买断 + 会员到期日。
 * 后端没部署 / 网络挂时优雅降级：卡片照常显示，解锁会给出错误提示。
 */
(function () {
  'use strict';

  var API = 'https://zircon-urge.fly.dev/api';
  var K_TOKEN = 'pw.token.v1';

  var el = document.getElementById('paywall');
  if (!el) return;
  var slug = el.getAttribute('data-slug') || '';
  if (!slug) return;

  var out = document.getElementById('pw-unlocked');
  var msgEl = document.getElementById('pw-msg');
  var codeInput = document.getElementById('pw-code');
  var redeemBtn = document.getElementById('pw-redeem-btn');
  var acctNote = document.getElementById('pw-account-note');

  function getToken() { try { return localStorage.getItem(K_TOKEN) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(K_TOKEN, t); } catch (e) {} }

  // 全站账号（SiteAuth）：登录后买断/会员跟着账号走，换设备也能取回。可能尚未加载。
  function authToken() {
    try { return (window.SiteAuth && window.SiteAuth.isLoggedIn()) ? window.SiteAuth.getToken() : ''; }
    catch (e) { return ''; }
  }
  function isLoggedIn() { return !!authToken(); }

  function setMsg(text, kind) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.className = 'pw-msg' + (kind ? ' ' + kind : '');
  }

  function tokenHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h['X-Unlock-Token'] = t;
    var a = authToken();
    if (a) h['Authorization'] = 'Bearer ' + a;
    return h;
  }

  // 后端在登录态下会回传账号的"规范 token"，本机采纳它，多设备收敛到同一凭证。
  function adoptToken(t) {
    if (t && t !== getToken()) setToken(t);
  }

  // 卡片上的小字：登录后买断会绑账号、可跨设备；未登录给个温和提示。
  function renderAcctNote() {
    if (!acctNote) return;
    if (isLoggedIn()) {
      acctNote.textContent = '✓ 已登录，购买将绑定到你的账号，换设备 / 清缓存都能看。';
      acctNote.className = 'pw-account-note ok';
    } else {
      acctNote.textContent = '提示：先登录再购买，解锁可在任意设备同步；不登录也能用，但仅限本设备。';
      acctNote.className = 'pw-account-note';
    }
    acctNote.hidden = false;
  }

  // 渲染锁定正文并注入；隐藏付费墙卡片。
  function inject(data) {
    if (!out) return;
    var html = '';
    if (data.format === 'html') {
      html = data.body || '';
    } else {
      // markdown：等 marked 就绪（defer 加载，可能还没到）
      if (window.marked && typeof window.marked.parse === 'function') {
        html = window.marked.parse(data.body || '');
      } else {
        // marked 还没加载好 → 退化为保留换行的纯文本，避免一片空白
        html = '<p>' + (data.body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      }
    }
    out.innerHTML = html;
    out.hidden = false;
    out.classList.add('pw-reveal');
    el.style.display = 'none';

    // KaTeX 重渲染（注入的内容里可能有 $...$）
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(out, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  function fetchContent() {
    return fetch(API + '/paid?action=content&slug=' + encodeURIComponent(slug), {
      headers: tokenHeaders()
    }).then(function (r) {
      if (r.status === 402) return { _err: 'not_entitled' };
      if (!r.ok) return { _err: 'fetch_failed_' + r.status };
      return r.json();
    }).then(function (d) { if (d && d.token) adoptToken(d.token); return d; });
  }

  // 登录读者：把本地匿名 token 认领到账号，并取回账号规范 token（跨设备漫游）。
  // 仅在"已登录且本地有凭证可认领"时调用——没本地凭证时交给 status 走账号即可，
  // 避免给每个登录访客都凭空铸一个空 token。
  function claimToAccount() {
    var a = authToken();
    if (!a || !getToken()) return Promise.resolve();
    return fetch(API + '/paid?action=bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + a },
      body: JSON.stringify({ token: getToken() || undefined })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.token) adoptToken(d.token); })
      .catch(function () {});
  }

  // 启动：若已解锁则直接展开
  function init() {
    // 既没本地凭证、也没登录 → 不必问后端，直接显示卡片
    if (!getToken() && !isLoggedIn()) return;
    // 登录态先认领/取回账号规范 token，再查状态
    claimToAccount().then(function () {
      return fetch(API + '/paid?action=status&slug=' + encodeURIComponent(slug), {
        headers: tokenHeaders()
      });
    }).then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (s) {
        if (!s) return;
        if (s.token) adoptToken(s.token);
        if (s.entitled) {
          return fetchContent().then(function (d) { if (d && !d._err) inject(d); });
        }
      }).catch(function () { /* 后端不可达 → 卡片照常显示 */ });
  }

  // 兑换
  function doRedeem() {
    var code = (codeInput && codeInput.value || '').trim().toUpperCase();
    if (!code) { setMsg('请输入兑换码', 'err'); return; }
    redeemBtn.disabled = true;
    setMsg('解锁中…', '');
    var rHeaders = { 'Content-Type': 'application/json' };
    var a = authToken();
    if (a) rHeaders['Authorization'] = 'Bearer ' + a; // 登录态：解锁绑到账号
    fetch(API + '/redeem', {
      method: 'POST',
      headers: rHeaders,
      body: JSON.stringify({ code: code, token: getToken() || undefined })
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (res) {
      var d = res.data || {};
      if (res.status === 200 && d.ok) {
        setToken(d.token);
        setMsg('解锁成功，正在展开全文…', 'ok');
        return fetchContent().then(function (c) {
          if (c && !c._err) inject(c);
          else setMsg('解锁成功，但取正文失败，请刷新页面重试。', 'err');
        });
      }
      var map = {
        invalid_code: '兑换码无效，请检查是否输错。',
        code_exhausted: '这张兑换码已经用过了。',
        code_required: '请输入兑换码。',
        slow_down: '操作太频繁，请稍后再试。'
      };
      setMsg(map[d.error] || ('解锁失败（' + (d.error || res.status) + '）'), 'err');
    }).catch(function () {
      setMsg('网络错误，请稍后再试。', 'err');
    }).finally(function () {
      if (redeemBtn) redeemBtn.disabled = false;
    });
  }

  if (redeemBtn) redeemBtn.addEventListener('click', doRedeem);
  if (codeInput) codeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); doRedeem(); }
  });

  // 启动 + 登录态变化（用户在本页登录/登出）→ 刷新提示，并在仍未解锁时用当前身份尝试展开。
  function boot() {
    renderAcctNote();
    if (out.hidden) init();
  }
  try {
    if (window.SiteAuth && typeof window.SiteAuth.onChange === 'function') {
      // onChange 订阅时会立即用当前登录态回调一次，等同首次 boot；之后每次变化再触发。
      window.SiteAuth.onChange(function () { boot(); });
    } else {
      boot();
    }
  } catch (e) { boot(); }
})();
