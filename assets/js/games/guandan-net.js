(() => {
  'use strict';

  const contract = window.GuandanContract;
  if (!contract) throw new Error('guandan_contract_missing');

  function requestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return 'gd_' + window.crypto.randomUUID().replace(/-/g, '');
    }
    const bytes = new Uint8Array(18);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(bytes);
      return 'gd_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    return 'gd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
  }

  async function api(action, options = {}) {
    const method = options.method || (options.body === undefined ? 'GET' : 'POST');
    const url = contract.apiUrl + '?action=' + encodeURIComponent(action) +
      (options.qs ? '&' + new URLSearchParams(options.qs).toString() : '');
    const headers = {};
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.token) headers.Authorization = 'Bearer ' + options.token;
    // 超时（2026-11-27，照炸弹猫）：国内网络常有「发出去就没回音」的请求，浏览器自己要等一两分钟才报错。
    // 给每个请求一个上限，到点主动掐掉，回 { error: 'timeout' }，由调用方用同一个 requestId 重发（服务器认得、不会做两次）。
    let timer = null, timedOut = false, signal = options.signal;
    if (options.timeoutMs && typeof AbortController !== 'undefined') {
      const ctl = new AbortController();
      if (options.signal) {
        if (options.signal.aborted) ctl.abort();
        else options.signal.addEventListener('abort', () => ctl.abort(), { once: true });
      }
      timer = setTimeout(() => { timedOut = true; ctl.abort(); }, options.timeoutMs);
      signal = ctl.signal;
    }
    const t0 = now();
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      let data = null;
      try { data = await response.json(); } catch (_) {}
      if (timer) clearTimeout(timer);
      if (!options.long) noteRtt(now() - t0);
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: (data && data.error) || 'http_error',
          data,
        };
      }
      return { ok: true, data };
    } catch (error) {
      if (timer) clearTimeout(timer);
      return { ok: false, status: 0, error: timedOut ? 'timeout' : 'network', err: String(error) };
    }
  }

  // 网络一来一回要多久：最近几次短请求的平滑值（毫秒，还没量到回 null）
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());
  let rttEst = null;
  function noteRtt(ms) {
    if (!(ms >= 0) || ms > 30000) return;
    rttEst = rttEst == null ? ms : rttEst * 0.7 + ms * 0.3;
  }
  // 最便宜的请求：只问房间版本号（不进锁）。房间里每 3 秒一次：量来回 + 看推送有没有卡住
  async function ping(code) {
    const r = await api('ping', { qs: code ? { code } : undefined, timeoutMs: 6000 });
    return r.ok ? r.data : null;
  }

  window.GuandanNet = Object.freeze({ api, requestId, ping, rtt: () => (rttEst == null ? null : Math.round(rttEst)) });
})();
