(function (global) {
  'use strict';

  const VERSION = 2;
  const DEFAULT_API_BASE = 'https://zircon-urge.fly.dev/api/draw';
  const localHost = global.location && (global.location.hostname === 'localhost' || /^127\.0\.0\.\d+$/.test(global.location.hostname));
  const localCandidate = localHost ? new URLSearchParams(global.location.search).get('drawApi') : '';
  const LOCAL_API_OVERRIDE = localCandidate && /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/draw$/.test(localCandidate)
    ? localCandidate
    : '';

  function newRequestId(action) {
    const random = global.crypto && global.crypto.getRandomValues
      ? Array.from(global.crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join('')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return `draw:${action}:${Date.now().toString(36)}:${random}`;
  }

  function apiBase() {
    if (global.DRAW_API_BASE) return String(global.DRAW_API_BASE);
    if (LOCAL_API_OVERRIDE) return LOCAL_API_OVERRIDE;
    return DEFAULT_API_BASE;
  }

  async function sleep(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function request(method, action, options) {
    const opts = options || {};
    const url = new URL(apiBase());
    url.searchParams.set('action', action);
    for (const [key, value] of Object.entries(opts.query || {})) {
      if (value != null) url.searchParams.set(key, String(value));
    }
    const headers = { 'Content-Type': 'application/json' };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    const fetchOptions = { method, headers };
    if (method === 'POST') fetchOptions.body = JSON.stringify(opts.body || {});

    const attempts = method === 'POST' ? 2 : 1;
    const timeoutMs = method === 'POST' ? 8000 : 12000;
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
        clearTimeout(timer);
        let data = {};
        try { data = await response.json(); } catch {}
        if (response.ok) return data;
        const error = Object.assign(new Error(data.error || `http_${response.status}`), {
          status: response.status,
          data,
        });
        if (response.status >= 400 && response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } catch (error) {
        clearTimeout(timer);
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) throw error;
        lastError = error;
      }
      if (attempt < attempts - 1) await sleep(400 * (attempt + 1));
    }
    if (lastError && lastError.status) throw lastError;
    const timedOut = lastError && lastError.name === 'AbortError';
    throw Object.assign(new Error(timedOut ? 'timeout' : 'network_error'), {
      network: true,
      timeout: !!timedOut,
      original: lastError,
    });
  }

  global.DrawingProtocol = Object.freeze({ VERSION, apiBase, newRequestId, request });
})(window);
