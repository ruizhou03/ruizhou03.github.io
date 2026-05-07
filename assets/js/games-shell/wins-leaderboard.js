/* games-shell/wins-leaderboard.js
 * 对弈类游戏专用排行榜（chess / gomoku / xiangqi / doudizhu）。
 * 每条记录展示 easy / medium / hard 三档积分，按"高难度优先"排序。
 *
 * 默认每局 +1 胜（"胜"为单位）；可在 mount 时传 unit:'分' 切换文案，
 * 同时 submit 时传 score 作为本局得分（默认 1）。
 *
 *   const wlb = GamesShell.WinsLeaderboard.mount({
 *     container: document.getElementById('wlb-mount'),
 *     gameId: 'chess',
 *     title: '🏆 国际象棋 战绩榜',
 *     unit: '胜',                   // 可选：'胜' | '分' | …
 *     getCurrentNick: () => GamesShell.Identity.getNick(),
 *   });
 *
 *   await GamesShell.WinsLeaderboard.submit({
 *     gameId: 'chess', nick, did, aiLevel: 'medium',
 *     moves: 38, durationMs: 312000, clientNonce,
 *     score: 1,                     // 可选：本局得分（默认 1，整数 1-1024）
 *   });
 *   wlb.refresh();
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};
  const API_BASE = 'https://zircon-urge.vercel.app/api/wins';
  const ENABLED = true;
  const MEDALS = ['🥇', '🥈', '🥉'];
  const TOP_LIMIT = 5;
  const PAGE_SIZE = 10;
  const REFRESH_INTERVAL_MS = 60_000;
  const FETCH_TIMEOUT_MS = 5_000;
  const FETCH_DEDUP_MS = 10_000;

  function relTime(ts) {
    if (!ts || !Number.isFinite(ts)) return '';
    const dt = (Date.now() - ts) / 1000;
    if (dt < 60) return '刚刚';
    if (dt < 3600) return `${Math.floor(dt / 60)} 分钟前`;
    if (dt < 86400) return `${Math.floor(dt / 3600)} 小时前`;
    if (dt < 30 * 86400) return `${Math.floor(dt / 86400)} 天前`;
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function callBackend(url, opts, timeoutMs) {
    if (!ENABLED) return { ok: false, error: 'disabled' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal, cache: 'no-store' }));
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) return { ok: false, status: res.status, data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    } finally { clearTimeout(timer); }
  }

  function renderSkeleton(c, opts) {
    c.classList.add('gs-leaderboard');
    c.innerHTML = `
      <div class="gs-lb-header">
        <h3>${opts.title || '🏆 战绩榜'} <span class="gs-lb-total"></span></h3>
        <button type="button" class="gs-lb-refresh" title="刷新">↻</button>
      </div>
      <div class="gs-lb-mine">
        <span class="gs-lb-mine-label">还没赢过 — 来一局看看 ~</span>
      </div>
      <ol class="gs-lb-list gs-wlb-list"><li class="gs-lb-empty">榜单加载中…</li></ol>
      <div class="gs-lb-controls">
        <button type="button" class="gs-lb-expand">展开完整榜 ↓</button>
        <div class="gs-lb-pager" style="display: none;">
          <button type="button" class="gs-lb-pgbtn gs-lb-prev">‹ 上一页</button>
          <span class="gs-lb-pginfo">1 / 1</span>
          <button type="button" class="gs-lb-pgbtn gs-lb-next">下一页 ›</button>
        </div>
      </div>
      <div class="gs-lb-footer"></div>
    `;
    return {
      panel: c,
      list: c.querySelector('.gs-lb-list'),
      total: c.querySelector('.gs-lb-total'),
      refreshBtn: c.querySelector('.gs-lb-refresh'),
      mine: c.querySelector('.gs-lb-mine'),
      expand: c.querySelector('.gs-lb-expand'),
      pager: c.querySelector('.gs-lb-pager'),
      prev: c.querySelector('.gs-lb-prev'),
      next: c.querySelector('.gs-lb-next'),
      pginfo: c.querySelector('.gs-lb-pginfo'),
      footer: c.querySelector('.gs-lb-footer'),
    };
  }

  function mount(opts) {
    if (!opts || !opts.container || !opts.gameId) {
      throw new Error('WinsLeaderboard.mount: container, gameId required');
    }
    const ui = renderSkeleton(opts.container, opts);
    const getNick = opts.getCurrentNick || (() => null);
    const unit = opts.unit || '胜';
    const state = { lastFetch: 0, inflight: false, expanded: false, page: 1, mineLast: null };

    function renderEntries(entries, total, currentNick) {
      ui.list.innerHTML = '';
      if (!entries || !entries.length) {
        const li = document.createElement('li');
        li.className = 'gs-lb-empty';
        li.textContent = '榜单还空着，第一个上榜的就是你 ~';
        ui.list.appendChild(li);
        ui.total.textContent = '';
        return;
      }
      entries.forEach(e => {
        const li = document.createElement('li');
        li.className = 'gs-wlb-row';
        if (currentNick && e.nick === currentNick) li.classList.add('gs-is-self');
        const rk = document.createElement('span');
        rk.className = 'gs-lb-rank';
        rk.textContent = e.rank <= 3 ? MEDALS[e.rank - 1] : '#' + e.rank;
        const nk = document.createElement('span');
        nk.className = 'gs-lb-nick';
        nk.textContent = e.nick;
        nk.title = e.nick;
        const wins = document.createElement('span');
        wins.className = 'gs-lb-score gs-wlb-tally';
        // 显示三档：H / M / E（hard 优先因为它对排序最关键）
        wins.innerHTML = `<span title="hard">H${e.hard}</span> · <span title="normal">N${e.normal}</span> · <span title="easy">E${e.easy}</span>`;
        const tm = document.createElement('span');
        tm.className = 'gs-lb-time';
        const total = e.easy + e.normal + e.hard;
        tm.textContent = `共 ${total} ${unit}${e.ts ? ' · ' + relTime(e.ts) : ''}`;
        li.append(rk, nk, wins, tm);
        ui.list.appendChild(li);
      });
      ui.total.textContent = `共 ${total} 位玩家`;
    }

    function updatePagerUI(total) {
      if (!state.expanded) {
        ui.pager.style.display = 'none';
        ui.expand.textContent = '展开完整榜 ↓';
        return;
      }
      const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
      if (state.page > totalPages) state.page = totalPages;
      ui.pager.style.display = '';
      ui.expand.textContent = '收起 ↑';
      ui.pginfo.textContent = `${state.page} / ${totalPages}`;
      ui.prev.disabled = state.page <= 1;
      ui.next.disabled = state.page >= totalPages;
    }

    async function loadTop(force) {
      if (state.inflight) return;
      if (!force && Date.now() - state.lastFetch < FETCH_DEDUP_MS) return;
      state.inflight = true;
      ui.refreshBtn.classList.add('gs-spinning');
      const limit = state.expanded ? PAGE_SIZE : TOP_LIMIT;
      const offset = state.expanded ? (state.page - 1) * PAGE_SIZE : 0;
      const url = `${API_BASE}?action=top&game=${encodeURIComponent(opts.gameId)}&limit=${limit}&offset=${offset}`;
      const r = await callBackend(url);
      ui.refreshBtn.classList.remove('gs-spinning');
      state.inflight = false;
      if (r.ok && r.data && Array.isArray(r.data.entries)) {
        state.lastFetch = Date.now();
        renderEntries(r.data.entries, r.data.total, getNick());
        ui.footer.textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        updatePagerUI(r.data.total);
      } else {
        if (!state.lastFetch) {
          ui.list.innerHTML = '';
          const li = document.createElement('li');
          li.className = 'gs-lb-empty';
          li.textContent = '榜单暂时拉不到，稍后再试';
          ui.list.appendChild(li);
        }
        ui.footer.textContent = '更新失败，下次再试';
      }
    }

    function renderMine(data) {
      ui.mine.innerHTML = '';
      if (!data || !data.exists) {
        const span = document.createElement('span');
        span.className = 'gs-lb-mine-label';
        span.textContent = '还没赢过 — 来一局看看 ~';
        ui.mine.appendChild(span);
        return;
      }
      const lbl = document.createElement('span');
      lbl.className = 'gs-lb-mine-label';
      lbl.textContent = '我的战绩';
      const line = document.createElement('span');
      line.className = 'gs-lb-mine-line';
      line.innerHTML = `<strong>H${data.hard}</strong> · <strong>N${data.normal}</strong> · <strong>E${data.easy}</strong> · 第 <strong>${data.rank}</strong> / 共 ${data.totalPlayers || 0} 人`;
      ui.mine.append(lbl, line);
      if (data.bestNick || data.plays || data.lastTs) {
        const meta = document.createElement('span');
        meta.className = 'gs-lb-mine-meta';
        const parts = [];
        if (data.bestNick) parts.push('昵称 ' + data.bestNick);
        if (data.plays) parts.push('赢了 ' + data.plays + ' 局');
        if (data.lastTs) parts.push(relTime(data.lastTs));
        meta.textContent = parts.join(' · ');
        ui.mine.appendChild(meta);
      }
    }

    async function loadMine() {
      const did = GS.Identity && GS.Identity.getDeviceId();
      if (!did) return;
      const url = `${API_BASE}?action=mine&game=${encodeURIComponent(opts.gameId)}&did=${encodeURIComponent(did)}`;
      const r = await callBackend(url);
      if (!r.ok || !r.data) {
        if (!state.mineLast) renderMine(null);
        return;
      }
      state.mineLast = r.data;
      renderMine(r.data);
    }

    ui.expand.addEventListener('click', () => { state.expanded = !state.expanded; state.page = 1; loadTop(true); });
    ui.prev.addEventListener('click', () => { if (state.page > 1) { state.page--; loadTop(true); } });
    ui.next.addEventListener('click', () => { state.page++; loadTop(true); });
    ui.refreshBtn.addEventListener('click', () => { loadTop(true); loadMine(); });

    loadTop(true); loadMine();
    const intervalId = setInterval(() => { loadTop(false); loadMine(); }, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { loadTop(false); loadMine(); }
    });

    return { refresh: () => { loadTop(true); loadMine(); }, destroy: () => clearInterval(intervalId) };
  }

  // ── 未提交自动续传（同 leaderboard.js 的逻辑，独立队列 key）──────────
  const PENDING_KEY = 'gs.wins.pending.v1';
  const PENDING_TTL_MS = 24 * 3600 * 1000;
  const PENDING_MAX = 10;

  function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); }
    catch { return []; }
  }
  function writePending(arr) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr.slice(-PENDING_MAX))); } catch {}
  }
  function enqueuePending(payload) {
    const list = readPending();
    if (!list.some(p => p.clientNonce === payload.clientNonce)) {
      list.push(Object.assign({ _enqAt: Date.now() }, payload));
      writePending(list);
    }
  }
  function dequeuePending(nonce) {
    const list = readPending();
    writePending(list.filter(p => p.clientNonce !== nonce));
  }

  async function callSubmit(payload) {
    return await callBackend(`${API_BASE}?action=submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: payload.gameId,
        nick: payload.nick,
        did: payload.did,
        aiLevel: payload.aiLevel,
        moves: payload.moves,
        durationMs: payload.durationMs,
        clientNonce: payload.clientNonce,
      }),
    }, 8000);
  }

  async function submit(payload) {
    if (!ENABLED) return { ok: false, error: 'disabled' };
    if (!payload || !payload.gameId || !payload.nick || !payload.aiLevel) {
      return { ok: false, error: 'bad_payload' };
    }
    enqueuePending(payload);
    const r = await callSubmit(payload);
    if (r.ok && r.data && (r.data.ok || r.data.duplicate)) {
      dequeuePending(payload.clientNonce);
      return r.data;
    }
    if (r.status && r.status >= 400 && r.status < 500) {
      dequeuePending(payload.clientNonce);
      return r.data || { ok: false, error: 'http_error', status: r.status };
    }
    return r.data || { ok: false, error: r.error || 'http_error' };
  }

  async function flushPending() {
    const list = readPending();
    if (!list.length) return;
    const fresh = list.filter(p => Date.now() - (p._enqAt || 0) < PENDING_TTL_MS);
    if (fresh.length !== list.length) writePending(fresh);
    for (const p of fresh) {
      try {
        const r = await callSubmit(p);
        if (r.ok && r.data && (r.data.ok || r.data.duplicate)) dequeuePending(p.clientNonce);
        else if (r.status && r.status >= 400 && r.status < 500) dequeuePending(p.clientNonce);
      } catch {}
    }
  }

  if (typeof window !== 'undefined') {
    setTimeout(() => { try { flushPending(); } catch (e) { console.warn('[gs:wins] flush', e); } }, 1500);
  }

  GS.WinsLeaderboard = { mount, submit, flushPending, _api: API_BASE };
})();
