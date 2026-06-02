/* 付费墙前端 —— 站内扫码收银，付完自动解锁，无需手输码。
 *
 * 流程：
 *   1. 读 #paywall 上的 slug/column；从 localStorage 取已有 unlock token。
 *   2. 调 /api/paid?action=status 看本读者是否已解锁；已解锁 → 直接取正文注入、藏卡片。
 *   3. 未解锁 → 显示卡片三档（单篇/整栏/会员）。点档位 → 弹收银浮层扫码。
 *   4. /api/pay?action=create 建单拿扫码 → 轮询 status → 付款成功后端把权益记到本 token →
 *      自动取正文展开、收起浮层。兑换码入口保留为次要（礼品/补发）。
 *
 * 凭证存 localStorage 'pw.token.v1'；登录后绑账号可跨设备。
 * 后端没部署 / 网络挂时优雅降级：卡片照常显示。
 */
(function () {
  'use strict';

  var API = 'https://zircon-urge.fly.dev/api';
  var K_TOKEN = 'pw.token.v1';

  var el = document.getElementById('paywall');
  if (!el) return;
  var slug = el.getAttribute('data-slug') || '';
  if (!slug) return;
  var column = el.getAttribute('data-column') || '';

  var out = document.getElementById('pw-unlocked');
  var msgEl = document.getElementById('pw-msg');
  var codeInput = document.getElementById('pw-code');
  var redeemBtn = document.getElementById('pw-redeem-btn');
  var acctNote = document.getElementById('pw-account-note');

  // 收银浮层元素
  var coEl = document.getElementById('pw-checkout');
  var coTitle = document.getElementById('pw-checkout-title');
  var coAmount = document.getElementById('pw-checkout-amount');
  var coQr = document.getElementById('pw-checkout-qr');
  var coTip = document.getElementById('pw-checkout-tip');
  var coStatus = document.getElementById('pw-checkout-status');
  var coStatusText = document.getElementById('pw-checkout-statustext');
  var coClose = document.getElementById('pw-checkout-close');
  var coMask = document.getElementById('pw-checkout-mask');

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

  // ── 扫码收银 ────────────────────────────────────────────────
  var pollTimer = null;
  var curOrder = '';

  function authHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var a = authToken();
    if (a) h['Authorization'] = 'Bearer ' + a;
    return h;
  }

  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function closeCheckout() {
    stopPoll();
    curOrder = '';
    if (coEl) coEl.hidden = true;
  }

  function setCoStatus(text, ok) {
    if (coStatusText) coStatusText.textContent = text || '';
    if (coStatus) coStatus.className = 'pw-checkout-status' + (ok ? ' ok' : '');
  }

  // 付款成功：取正文、展开、收起浮层。无论取正文成功与否都不能卡死——
  // 权益已记在 token 上，最差也能靠刷新页面(init 会自动解锁)兜底。
  function onPaid(token) {
    if (token) adoptToken(token);
    setCoStatus('✓ 支付成功，正在解锁…', true);
    fetchContent().then(function (d) {
      if (d && !d._err) { inject(d); closeCheckout(); }
      else { setCoStatus('✓ 支付成功，正在载入全文…', true); setTimeout(function () { location.reload(); }, 800); }
    }).catch(function () {
      // fetch 直接 reject(网络/CORS) → 别静默卡死，刷新页面让 init 解锁
      setCoStatus('✓ 支付成功，正在载入全文…', true);
      setTimeout(function () { location.reload(); }, 800);
    });
  }

  function pollStatus() {
    if (!curOrder) return;
    fetch(API + '/pay?action=status&orderId=' + encodeURIComponent(curOrder))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) {
        if (s && s.status === 'paid') { stopPoll(); onPaid(s.token); }
      }).catch(function () {});
  }

  function openCheckout(tier) {
    if (!coEl) return;
    // 重置浮层
    coEl.hidden = false;
    coAmount.textContent = '';
    coQr.innerHTML = '';
    coTip.textContent = '请用微信 / 支付宝扫码支付';
    setCoStatus('正在生成支付码…', false);

    fetch(API + '/pay?action=create', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        tier: tier, slug: slug, column: column,
        token: getToken() || undefined,
        returnUrl: location.href
      })
    }).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).then(function (res) {
      var d = res.data || {};
      if (res.status !== 200 || !d.orderId) {
        setCoStatus('下单失败（' + (d.error || res.status) + '），请稍后再试。', false);
        return;
      }
      adoptToken(d.token);          // 采纳订单 token，跳回/留存都对得上
      curOrder = d.orderId;
      if (coTitle) coTitle.textContent = d.title || '扫码支付';
      if (coAmount) coAmount.textContent = '¥' + d.amount;

      if (d.qrImage) {
        coQr.innerHTML = '<img src="' + d.qrImage + '" alt="支付二维码">';
        // 手机端：原生码不便自扫，给个"在本机打开支付"
        if (d.payUrl) coTip.innerHTML = '请扫码支付，或 <a href="' + d.payUrl + '" target="_blank" rel="noopener">在本机打开支付</a>';
      } else if (d.mock) {
        // 联调用假支付源：给个"模拟支付"按钮
        coTip.textContent = '【测试支付源】真实支付码接上虎皮椒后出现';
        coQr.innerHTML = '<a class="pw-pay-link" href="' + d.payUrl + '" target="_blank" rel="noopener">点我模拟支付成功</a>';
      } else if (d.payUrl) {
        coQr.innerHTML = '<a class="pw-pay-link" href="' + d.payUrl + '" target="_blank" rel="noopener">前往支付</a>';
      }
      setCoStatus('等待支付…', false);
      stopPoll();
      pollTimer = setInterval(pollStatus, 1500);
      pollStatus();
    }).catch(function () {
      setCoStatus('网络错误，请稍后再试。', false);
    });
  }

  // 三档按钮 → 起收银
  var tierBtns = el.querySelectorAll('.pw-options .pw-btn[data-tier]');
  Array.prototype.forEach.call(tierBtns, function (b) {
    b.addEventListener('click', function () { openCheckout(b.getAttribute('data-tier')); });
  });
  if (coClose) coClose.addEventListener('click', closeCheckout);
  if (coMask) coMask.addEventListener('click', closeCheckout);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && coEl && !coEl.hidden) closeCheckout();
  });

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
