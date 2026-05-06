/* games-shell/save-state.js
 * 通用 48h 续局管理器。
 *
 *   const save = GamesShell.SaveState.create({
 *     key: 'tool.2048.savestate.v1',
 *     ttlMs: 48 * 3600 * 1000,
 *     serialize: () => ({ board: state.board, score: state.score, ... }),
 *     onAutoSave: data => { ... 可选钩子，每次写盘前调用 ... },
 *   });
 *
 *   // 进入页面时检查存档
 *   const peek = save.peek();
 *   if (peek) {
 *     GamesShell.SaveState.showResumeModal({
 *       summaryHtml: `<strong>${peek.score}</strong> 分<span class="gs-resume-meta">${peek.agoText}保存</span>`,
 *       onResume: () => { restoreFrom(peek.data); save.start(); },
 *       onDiscard: () => { save.discard(); newGame(); save.start(); },
 *       // settle 按钮可选；不传则不显示
 *       onSettle: peek.data.score > 0 ? () => { restoreAndSettle(peek.data); save.discard(); } : null,
 *     });
 *   } else {
 *     newGame();
 *     save.start();
 *   }
 *
 *   // 关键时机调 save.tick() —— 每次玩家操作后；或者依赖默认的 5s + visibility + beforeunload
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};
  const DEFAULT_TTL = 48 * 3600 * 1000;
  const DEFAULT_INTERVAL = 5_000;

  function ago(ms) {
    if (ms < 60_000) return '刚刚';
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} 分钟前`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} 小时前`;
    return `${Math.floor(ms / 86_400_000)} 天前`;
  }

  function create(opts) {
    if (!opts || !opts.key || typeof opts.serialize !== 'function') {
      throw new Error('GamesShell.SaveState.create: key and serialize required');
    }
    const key = opts.key;
    const ttl = opts.ttlMs || DEFAULT_TTL;
    const interval = opts.intervalMs || DEFAULT_INTERVAL;
    let timerId = null;
    let started = false;

    function readRaw() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch { return null; }
    }

    // 返回 { data, savedAt, agoMs, agoText } 或 null
    function peek() {
      const raw = readRaw();
      if (!raw || typeof raw !== 'object') return null;
      const savedAt = Number(raw.savedAt) || 0;
      if (!savedAt) return null;
      const agoMs = Date.now() - savedAt;
      if (agoMs > ttl || agoMs < 0) {
        try { localStorage.removeItem(key); } catch {}
        return null;
      }
      return { data: raw.data, savedAt, agoMs, agoText: ago(agoMs) };
    }

    function tick() {
      try {
        const data = opts.serialize();
        if (data == null) return;
        const wrapped = { v: 1, savedAt: Date.now(), data };
        if (typeof opts.onAutoSave === 'function') {
          try { opts.onAutoSave(wrapped); } catch {}
        }
        localStorage.setItem(key, JSON.stringify(wrapped));
      } catch (e) {
        // localStorage 满 / 用户禁用——静默
      }
    }

    function discard() {
      try { localStorage.removeItem(key); } catch {}
    }

    function onVis() { if (document.visibilityState === 'hidden') tick(); }
    function onUnload() { tick(); }

    function start() {
      if (started) return;
      started = true;
      timerId = setInterval(tick, interval);
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('beforeunload', onUnload);
    }
    function stop() {
      if (!started) return;
      started = false;
      if (timerId) clearInterval(timerId);
      timerId = null;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onUnload);
    }

    return { peek, tick, discard, start, stop };
  }

  // ============ 续局浮层 ============
  // opts: {
  //   summaryHtml | summaryText  -> 卡片中段说明
  //   continueLabel? = '▶ 继续上次'
  //   discardLabel? = '🗑 丢掉重新开始'
  //   settleLabel?  = '🏁 直接结算'   (传了 onSettle 才显示)
  //   onResume, onDiscard, onSettle
  //   icon? = '👋'
  //   title? = '上次还没玩完'
  // }
  function showResumeModal(opts) {
    const old = document.getElementById('gs-resume-overlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'gs-resume-overlay';
    overlay.className = 'gs-resume-overlay';
    const card = document.createElement('div');
    card.className = 'gs-resume-card';
    const icon = document.createElement('div');
    icon.className = 'gs-resume-icon';
    icon.textContent = opts.icon || '👋';
    card.appendChild(icon);
    const h = document.createElement('h2');
    h.textContent = opts.title || '上次还没玩完';
    card.appendChild(h);
    const summary = document.createElement('div');
    summary.className = 'gs-resume-summary';
    if (opts.summaryHtml) summary.innerHTML = opts.summaryHtml;
    else if (opts.summaryText) summary.textContent = opts.summaryText;
    card.appendChild(summary);

    function close() { overlay.classList.remove('gs-open'); setTimeout(() => overlay.remove(), 300); }

    const btnContinue = document.createElement('button');
    btnContinue.type = 'button';
    btnContinue.className = 'gs-resume-primary';
    btnContinue.textContent = opts.continueLabel || '▶ 继续上次';
    btnContinue.addEventListener('click', () => {
      close();
      try { opts.onResume && opts.onResume(); } catch (e) { console.error('[games-shell:save] onResume', e); }
    });
    card.appendChild(btnContinue);

    if (typeof opts.onSettle === 'function') {
      const btnSettle = document.createElement('button');
      btnSettle.type = 'button';
      btnSettle.className = 'gs-resume-secondary';
      btnSettle.textContent = opts.settleLabel || '🏁 直接结算';
      btnSettle.addEventListener('click', () => {
        close();
        try { opts.onSettle(); } catch (e) { console.error('[games-shell:save] onSettle', e); }
      });
      card.appendChild(btnSettle);
    }

    const btnDiscard = document.createElement('button');
    btnDiscard.type = 'button';
    btnDiscard.className = 'gs-resume-discard';
    btnDiscard.textContent = opts.discardLabel || '🗑 丢掉重新开始';
    btnDiscard.addEventListener('click', () => {
      close();
      try { opts.onDiscard && opts.onDiscard(); } catch (e) { console.error('[games-shell:save] onDiscard', e); }
    });
    card.appendChild(btnDiscard);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    // 触发 transition
    requestAnimationFrame(() => overlay.classList.add('gs-open'));
  }

  GS.SaveState = { create, showResumeModal, _ago: ago };
})();
