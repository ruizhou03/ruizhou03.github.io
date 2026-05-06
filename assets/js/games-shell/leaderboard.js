/* games-shell/leaderboard.js
 * 通用排行榜组件。挂在 window.GamesShell.Leaderboard 上。
 *
 * 用法（在游戏 index.html 末尾）:
 *
 *   const lb = GamesShell.Leaderboard.mount({
 *     container: document.getElementById('lb-mount'),  // 一个空 <div>
 *     gameId: '2048',
 *     title: '🏆 排行榜',
 *     scoreFormatter: v => v.toLocaleString(),  // 可选
 *     scoreAsc: false,                           // 默认 false（高分在前）；扫雷设 true
 *     getCurrentNick: () => GamesShell.Identity.getNick(),
 *   });
 *
 *   // 游戏结束后:
 *   const r = await GamesShell.Leaderboard.submit({
 *     gameId: '2048', nick, score,
 *     durationMs, clientNonce, did, extra: { boardSize: 4 },
 *   });
 *   if (r.ok) lb.refresh();
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};

  // 后端基址。灭火开关：把 ENABLED 改成 false，前端立即降级到纯本地。
  const API_BASE = 'https://zircon-urge.vercel.app/api/lb';
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
      const res = await fetch(url, Object.assign({}, opts || {}, {
        signal: ctrl.signal,
        cache: 'no-store',
      }));
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) return { ok: false, status: res.status, data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    } finally {
      clearTimeout(timer);
    }
  }

  // 渲染骨架到 container。返回 { panel, list, total, refresh, mine, footer, ... } DOM 引用
  function renderSkeleton(container, opts) {
    container.classList.add('gs-leaderboard');
    container.innerHTML = `
      <div class="gs-lb-header">
        <h3>${opts.title || '🏆 排行榜'} <span class="gs-lb-total"></span></h3>
        <button type="button" class="gs-lb-refresh" title="刷新榜单">↻</button>
      </div>
      <div class="gs-lb-mine">
        <span class="gs-lb-mine-label">${opts.emptyMineText || '还没玩过 — 来一局看看你的排名 ~'}</span>
      </div>
      <ol class="gs-lb-list"><li class="gs-lb-empty">榜单加载中…</li></ol>
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
      panel: container,
      list: container.querySelector('.gs-lb-list'),
      total: container.querySelector('.gs-lb-total'),
      refreshBtn: container.querySelector('.gs-lb-refresh'),
      mine: container.querySelector('.gs-lb-mine'),
      expand: container.querySelector('.gs-lb-expand'),
      pager: container.querySelector('.gs-lb-pager'),
      prev: container.querySelector('.gs-lb-prev'),
      next: container.querySelector('.gs-lb-next'),
      pginfo: container.querySelector('.gs-lb-pginfo'),
      footer: container.querySelector('.gs-lb-footer'),
    };
  }

  function mount(opts) {
    if (!opts || !opts.container || !opts.gameId) {
      throw new Error('GamesShell.Leaderboard.mount: container and gameId required');
    }
    const ui = renderSkeleton(opts.container, opts);
    const fmt = opts.scoreFormatter || (v => String(v));
    const getNick = opts.getCurrentNick || (() => null);
    // 可选：getSplit() —> 'easy' / '4' 等。每个 split 是独立排行榜。
    const getSplit = typeof opts.getSplit === 'function' ? opts.getSplit : null;

    const state = {
      lastFetch: 0,
      inflight: false,
      expanded: false,
      page: 1,
      lastTotal: 0,
      mineLast: null,
      currentSplit: getSplit ? getSplit() : null,
    };

    function splitParam() {
      if (!getSplit) return '';
      const v = getSplit();
      return v != null ? `&split=${encodeURIComponent(v)}` : '';
    }

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
        if (currentNick && e.nick === currentNick) li.classList.add('gs-is-self');
        const rk = document.createElement('span');
        rk.className = 'gs-lb-rank';
        rk.textContent = e.rank <= 3 ? MEDALS[e.rank - 1] : '#' + e.rank;
        const nk = document.createElement('span');
        nk.className = 'gs-lb-nick';
        nk.textContent = e.nick;       // textContent — XSS-safe
        nk.title = e.nick;
        const sc = document.createElement('span');
        sc.className = 'gs-lb-score';
        sc.textContent = fmt(e.score);
        const tm = document.createElement('span');
        tm.className = 'gs-lb-time';
        tm.textContent = relTime(e.ts);
        li.append(rk, nk, sc, tm);
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
      const url = `${API_BASE}?action=top&game=${encodeURIComponent(opts.gameId)}${splitParam()}&limit=${limit}&offset=${offset}`;
      const r = await callBackend(url);
      ui.refreshBtn.classList.remove('gs-spinning');
      state.inflight = false;
      if (r.ok && r.data && Array.isArray(r.data.entries)) {
        state.lastFetch = Date.now();
        state.lastTotal = r.data.total || 0;
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
        span.textContent = (data && data.plays > 0)
          ? '上次成绩还没上传成功 ~'
          : (opts.emptyMineText || '还没玩过 — 来一局看看你的排名 ~');
        ui.mine.appendChild(span);
        return;
      }
      const lbl = document.createElement('span');
      lbl.className = 'gs-lb-mine-label';
      lbl.textContent = opts.mineLabel || '我的最高';
      const line = document.createElement('span');
      line.className = 'gs-lb-mine-line';
      const sc = document.createElement('strong');
      sc.textContent = fmt(data.bestScore);
      line.appendChild(sc);
      line.appendChild(document.createTextNode(' · 第 '));
      const rk = document.createElement('strong');
      rk.textContent = String(data.rank);
      line.appendChild(rk);
      line.appendChild(document.createTextNode(' 名 / 共 ' + (data.total || 0) + ' 人'));
      ui.mine.append(lbl, line);
      if (data.bestNick || data.plays || data.bestTs) {
        const meta = document.createElement('span');
        meta.className = 'gs-lb-mine-meta';
        const parts = [];
        if (data.bestNick) parts.push('昵称 ' + data.bestNick);
        if (data.plays) parts.push('玩了 ' + data.plays + ' 局');
        if (data.bestTs) parts.push(relTime(data.bestTs));
        meta.textContent = parts.join(' · ');
        ui.mine.appendChild(meta);
      }
    }

    async function loadMine() {
      const did = GS.Identity && GS.Identity.getDeviceId();
      if (!did) return;
      const url = `${API_BASE}?action=mine&game=${encodeURIComponent(opts.gameId)}${splitParam()}&did=${encodeURIComponent(did)}`;
      const r = await callBackend(url);
      if (!r.ok || !r.data) {
        if (!state.mineLast) renderMine(null);
        return;
      }
      state.mineLast = r.data;
      renderMine(r.data);
    }

    ui.expand.addEventListener('click', () => {
      state.expanded = !state.expanded;
      state.page = 1;
      loadTop(true);
    });
    ui.prev.addEventListener('click', () => {
      if (state.page > 1) { state.page--; loadTop(true); }
    });
    ui.next.addEventListener('click', () => {
      state.page++; loadTop(true);
    });
    ui.refreshBtn.addEventListener('click', () => { loadTop(true); loadMine(); });

    // 初次拉一次
    loadTop(true);
    loadMine();
    // 每 60s 刷新
    const intervalId = setInterval(() => { loadTop(false); loadMine(); }, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadTop(false);
        loadMine();
      }
    });

    // 标题改 / split 切换时调，强制重拉
    function setTitle(t) {
      const h = ui.panel.querySelector('.gs-lb-header h3');
      if (!h) return;
      const totalSpan = h.querySelector('.gs-lb-total');
      h.textContent = t + ' ';
      if (totalSpan) h.appendChild(totalSpan);
    }

    function onSplitChange() {
      // 切换 split 后排行榜内容完全不一样，重置分页 + 强制刷新
      state.expanded = false;
      state.page = 1;
      state.mineLast = null;
      state.lastFetch = 0;
      loadTop(true);
      loadMine();
    }

    return {
      refresh: () => { loadTop(true); loadMine(); },
      destroy: () => clearInterval(intervalId),
      setTitle,
      onSplitChange,
    };
  }

  // ── 未提交自动续传 ───────────────────────────────────────
  // 关 tab / 网断 / 后端冷启动失败 → 把 payload 留在 localStorage，
  // 下次访问站点（任何带 leaderboard.js 的页面）init 时 auto-flush。
  // 后端 nonce 24h 幂等，重试不会重复入榜。
  const PENDING_KEY = 'gs.lb.pending.v1';
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
        score: payload.score,
        durationMs: payload.durationMs,
        clientNonce: payload.clientNonce,
        did: payload.did,
        extra: payload.extra || {},
      }),
    }, 8000);
  }

  // 提交分数。payload: { gameId, nick, score, durationMs, clientNonce, did, extra }
  async function submit(payload) {
    if (!ENABLED) return { ok: false, error: 'disabled' };
    if (!payload || !payload.gameId || !payload.nick || typeof payload.score !== 'number') {
      return { ok: false, error: 'bad_payload' };
    }
    enqueuePending(payload);                       // 先入队再发，保证至少能续传
    const r = await callSubmit(payload);
    if (r.ok && r.data && (r.data.ok || r.data.duplicate)) {
      dequeuePending(payload.clientNonce);
      return r.data;
    }
    // 4xx/422（数据本身不合法）→ 重试也没用，dequeue
    if (r.status && r.status >= 400 && r.status < 500) {
      dequeuePending(payload.clientNonce);
      return r.data || { ok: false, error: 'http_error', status: r.status };
    }
    // 5xx / 网络错 → 留在队列等下次
    return r.data || { ok: false, error: r.error || 'http_error' };
  }

  // 模块加载时触发，一次性扫队列重试。后台进行，不影响 UI。
  async function flushPending() {
    const list = readPending();
    if (!list.length) return;
    // 过期的（> 24h）直接丢，因为 nonce 也过期了，重试一定 422
    const fresh = list.filter(p => Date.now() - (p._enqAt || 0) < PENDING_TTL_MS);
    if (fresh.length !== list.length) writePending(fresh);
    for (const p of fresh) {
      try {
        const r = await callSubmit(p);
        if (r.ok && r.data && (r.data.ok || r.data.duplicate)) {
          dequeuePending(p.clientNonce);
        } else if (r.status && r.status >= 400 && r.status < 500) {
          dequeuePending(p.clientNonce);
        }
      } catch {}
    }
  }

  // 自动续传一次（轻微延迟，让页面其他东西先加载）
  if (typeof window !== 'undefined') {
    setTimeout(() => { try { flushPending(); } catch (e) { console.warn('[gs:lb] flush', e); } }, 1500);
  }

  GS.Leaderboard = { mount, submit, relTime, flushPending, _api: API_BASE };
})();
