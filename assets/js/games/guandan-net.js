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
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      let data = null;
      try { data = await response.json(); } catch (_) {}
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
      return { ok: false, status: 0, error: 'network', err: String(error) };
    }
  }

  window.GuandanNet = Object.freeze({ api, requestId });
})();
