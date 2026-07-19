/* ruizhou03.github.io 统一离线客户端 —— 与双层 SW 打交道的唯一前端入口。
 *
 * 两层心智模型（跟 sw.js 对齐）：
 *   · 离线书架：用户亲手「保存离线」的文章/游戏。本模块负责保存、更新、删除、
 *     判断有没有新版，并把每项的元数据（标题/栏目/大小/版本/资源清单）记在
 *     localStorage 索引里，供「离线内容库」页面渲染。
 *   · 浏览缓存：SW 自己管的有界临时层，本模块只在内容库里显示它的占用、给个「清空」。
 *
 * 「有没有新版」判断：拉一次 /offline-versions.json（联网真相，SW 对它 network-only），
 * 跟保存时记下的版本号比对。游戏版本=代码哈希、文章版本=updated|date。
 *
 * 对外：window.ZirconOffline
 */
(function () {
  'use strict';
  var W = window;
  if (W.ZirconOffline) return;

  // ───────────────────────── 纯工具（可离线单测） ─────────────────────────
  // URL 归一：只留 path，去掉 query/hash；非文件路径补尾斜杠，让「保存键 / 版本清单键 /
  // 浏览器导航键」三者对齐（否则 /notes/x 与 /notes/x/ 会各存一份、离线命不中）。
  function normUrl(u) {
    if (!u) return u;
    try { var a = new URL(u, W.location.origin); u = a.pathname; } catch (e) { u = String(u).split('#')[0].split('?')[0]; }
    if (u.length > 1) {
      var last = u.split('/').pop();
      if (last.indexOf('.') === -1 && u.charAt(u.length - 1) !== '/') u += '/';
    }
    return u;
  }

  function fmtBytes(n) {
    n = +n || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  // 有没有新版：两个版本号都在、且不相等，才算「有更新」。缺任一个一律当「没更新」，
  // 宁可漏报也不误报（避免版本清单临时拉不到时把所有东西标成有更新）。
  function versionsDiffer(saved, live) {
    if (!saved || !live) return false;
    return String(saved) !== String(live);
  }

  // 从一批已保存项里，算出「删掉 target 后，哪些资源没有别的项再用到」→ 可安全清除。
  function orphanAssets(target, otherItems) {
    var used = {};
    otherItems.forEach(function (it) {
      (it.assets || []).forEach(function (a) { used[normUrl(a)] = 1; });
    });
    var out = [];
    (target.assets || []).forEach(function (a) {
      var k = normUrl(a);
      if (!used[k]) out.push(a);
    });
    return out;
  }

  // ───────────────────────── 事件总线 ─────────────────────────
  var handlers = {};
  function on(ev, cb) { (handlers[ev] = handlers[ev] || []).push(cb); }
  function emit(ev, payload) { (handlers[ev] || []).forEach(function (cb) { try { cb(payload); } catch (e) {} }); }

  // ───────────────────────── localStorage 索引 ─────────────────────────
  var KEY = 'zircon.offline.v1';
  function readIndex() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { items: {} }; }
    catch (e) { return { items: {} }; }
  }
  function writeIndex(ix) { try { localStorage.setItem(KEY, JSON.stringify(ix)); } catch (e) {} }
  var index = {
    all: function () { return readIndex().items; },
    list: function () { var it = readIndex().items; return Object.keys(it).map(function (k) { return it[k]; }); },
    get: function (url) { return readIndex().items[normUrl(url)]; },
    put: function (item) { var ix = readIndex(); item.url = normUrl(item.url); ix.items[item.url] = item; writeIndex(ix); emit('change'); },
    remove: function (url) { var ix = readIndex(); delete ix.items[normUrl(url)]; writeIndex(ix); emit('change'); }
  };

  // ───────────────────────── Service Worker 通道 ─────────────────────────
  var isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(W.location.hostname) !== -1;
  var _readyPromise = null;
  function ready() {
    if (_readyPromise) return _readyPromise;
    _readyPromise = (async function () {
      if (!('serviceWorker' in navigator)) return null;
      try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); }
      catch (e) { return null; }
      var reg = await navigator.serviceWorker.ready;
      if (!reg.active) {
        await new Promise(function (r) {
          var t = setTimeout(r, 1500);
          navigator.serviceWorker.addEventListener('controllerchange', function () { clearTimeout(t); r(); }, { once: true });
        });
      }
      return reg;
    })();
    return _readyPromise;
  }

  // 单次问答
  async function ask(payload, timeoutMs) {
    var reg = await ready();
    if (!reg || !reg.active) return null;
    return new Promise(function (res) {
      var ch = new MessageChannel(), done = false;
      var t = setTimeout(function () { if (!done) { done = true; res(null); } }, timeoutMs || 8000);
      ch.port1.onmessage = function (e) { if (done) return; done = true; clearTimeout(t); res(e.data || null); };
      reg.active.postMessage(payload, [ch.port2]);
    });
  }

  // 流式问答（保存/更新带进度），resolve 于 doneType。
  async function askStream(payload, doneType, onMsg) {
    var reg = await ready();
    if (!reg || !reg.active) return null;
    return new Promise(function (res) {
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) {
        var d = e.data || {};
        if (onMsg) onMsg(d);
        if (d.type === doneType) res(d);
      };
      reg.active.postMessage(payload, [ch.port2]);
    });
  }

  // ───────────────────────── 版本清单（联网真相，内存缓存 60s） ─────────────────────────
  var _lv = null, _lvAt = 0, _lvInflight = null;
  async function liveVersions(force) {
    if (!force && _lv && (Date.now() - _lvAt < 60000)) return _lv;
    if (_lvInflight) return _lvInflight;
    _lvInflight = (async function () {
      try {
        var r = await fetch('/offline-versions.json', { cache: 'no-store' });
        if (r && r.ok) {
          var raw = await r.json(), norm = {};
          Object.keys(raw).forEach(function (k) { norm[normUrl(k)] = raw[k]; });
          _lv = norm; _lvAt = Date.now();
        }
      } catch (e) {}
      _lvInflight = null;
      return _lv || {};
    })();
    return _lvInflight;
  }

  // ───────────────────────── 保存 / 更新 / 删除 ─────────────────────────
  // item: {url, title, category, kind, assets?}  onProgress(done,total)
  async function save(item, opts) {
    opts = opts || {};
    var url = normUrl(item.url);
    var lv = await liveVersions();
    var done = await askStream(
      { type: 'SAVE_OFFLINE', url: url, assets: item.assets || [], force: !!opts.force },
      'SAVE_DONE',
      function (d) { if (d.type === 'SAVE_PROGRESS' && opts.onProgress) opts.onProgress(d.done, d.total); }
    );
    if (!done) return null;
    // 合并已有元数据：更新（force）时保留首次保存记下的标题/栏目/类型，只刷新版本/大小/资源。
    var existing = index.get(url) || {};
    index.put({
      url: url,
      title: item.title || existing.title || url,
      category: item.category || existing.category || '其他',
      kind: item.kind || existing.kind || 'article',
      savedAt: Date.now(),
      version: (lv[url] != null ? lv[url] : (item.version != null ? item.version : existing.version)) || null,
      size: done.bytes || existing.size || 0,
      assets: (done.assets && done.assets.length) ? done.assets : (existing.assets || [])
    });
    return done;
  }

  async function update(item, opts) {
    opts = opts || {};
    opts.force = true;
    return save(item, opts);
  }

  async function remove(url) {
    url = normUrl(url);
    var it = index.get(url);
    if (!it) { await ask({ type: 'REMOVE_OFFLINE', urls: [url] }); return; }
    var others = index.list().filter(function (x) { return normUrl(x.url) !== url; });
    var toDelete = [url].concat(orphanAssets(it, others));
    await ask({ type: 'REMOVE_OFFLINE', urls: toDelete });
    index.remove(url);
  }

  // 返回 {url: true} 标出有新版的已保存项
  async function checkUpdates() {
    var lv = await liveVersions();
    var out = {};
    index.list().forEach(function (it) {
      if (versionsDiffer(it.version, lv[normUrl(it.url)])) out[normUrl(it.url)] = true;
    });
    return out;
  }

  async function stats() { return ask({ type: 'GET_CACHE_STATS' }, 15000); }
  async function clearAmbient() { var r = await ask({ type: 'CLEAR_AMBIENT' }); emit('change'); return r; }
  async function clearSaved() {
    var r = await ask({ type: 'CLEAR_SAVED' });
    var ix = readIndex(); ix.items = {}; writeIndex(ix); emit('change');
    return r;
  }

  // ───────────────────────── SVG 图标（手绘矢量，无 emoji） ─────────────────────────
  var PATHS = {
    download: '<path d="M12 3.5V14"/><path d="M7.5 10l4.5 4.5L16.5 10"/><path d="M5 19h14"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 6.5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v3.4h-3.4"/>',
    spinner: '<path d="M12 3a9 9 0 1 0 9 9"/>',
    trash: '<path d="M5 7h14M10 4.5h4M6.5 7l.9 12.5h9.2L17.5 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function icon(name, extraClass) {
    return '<svg class="zoff-ic ' + (name === 'spinner' ? 'zoff-spin ' : '') + (extraClass || '') +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (PATHS[name] || '') + '</svg>';
  }

  // ───────────────────────── 注入样式（一次） ─────────────────────────
  var _stylesDone = false;
  function injectStyles() {
    if (_stylesDone || typeof document === 'undefined') return;
    _stylesDone = true;
    var css =
      '.zoff-ic{width:1.02em;height:1.02em;display:inline-block;flex:none;vertical-align:-.14em}' +
      '.zoff-spin{animation:zoff-spin .9s linear infinite;transform-origin:center}' +
      '@keyframes zoff-spin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){.zoff-spin{animation:none}}' +
      /* 文章工具栏那颗统一按钮的三态配色 */
      '#offline-toggle .tool-icon svg{width:1em;height:1em}' +
      '#offline-toggle.zoff-saved{color:#5d8a6b}' +
      '#offline-toggle.zoff-update{color:#b0862f}' +
      /* 方案 A：文章头内联「有新版，点此更新」 */
      '.zoff-notice{display:inline-flex;align-items:center;gap:.32rem;font-family:var(--font-body,inherit);' +
      'font-size:.82rem;color:#b0862f;background:transparent;border:0;padding:0;cursor:pointer;text-transform:none;' +
      'font-variant:normal;letter-spacing:0;border-bottom:1px solid rgba(176,134,47,.45)}' +
      '.zoff-notice:hover{border-bottom-color:#b0862f}' +
      '.zoff-notice .zoff-ic{width:.86em;height:.86em}' +
      '.zoff-ok{display:inline-flex;align-items:center;gap:.28rem;color:#5d8a6b;font-variant:normal;letter-spacing:0}' +
      '.zoff-ok .zoff-ic{width:.82em;height:.82em}' +
      '.zoff-sep{opacity:.45;margin:0 .4rem;font-variant:normal}';
    var st = document.createElement('style');
    st.setAttribute('data-zoff', '');
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ───────────────────────── 统一按钮（文章 / 游戏单页） ─────────────────────────
  // btn 需带 data-offline-url / data-offline-title / data-offline-category / data-offline-kind
  function itemFromEl(el) {
    var assets = [];
    try { assets = JSON.parse(el.getAttribute('data-offline-assets') || '[]'); } catch (e) {}
    return {
      url: el.getAttribute('data-offline-url') || W.location.pathname,
      title: el.getAttribute('data-offline-title') || document.title,
      category: el.getAttribute('data-offline-category') || '其他',
      kind: el.getAttribute('data-offline-kind') || 'article',
      assets: assets
    };
  }

  function paintButton(btn, state) {
    var iconEl = btn.querySelector('.tool-icon');
    var labelEl = btn.querySelector('.tool-label');
    btn.classList.remove('zoff-saved', 'zoff-update', 'zoff-busy');
    var map = {
      idle:   { ic: 'download', tx: '保存离线', title: '把这篇存到本地，飞机 / 没网时也能看' },
      saved:  { ic: 'check',    tx: '已离线',   title: '已保存离线 · 再点一下可移除', cls: 'zoff-saved' },
      update: { ic: 'refresh',  tx: '有更新',   title: '有新版，点一下更新到最新', cls: 'zoff-update' },
      busy:   { ic: 'spinner',  tx: '保存中…',  title: '正在保存，别关页面', cls: 'zoff-busy' }
    };
    var s = map[state] || map.idle;
    if (iconEl) iconEl.innerHTML = icon(s.ic);
    if (labelEl) labelEl.textContent = s.tx;
    btn.title = s.title;
    if (s.cls) btn.classList.add(s.cls);
  }

  async function wireButton(btn) {
    if (!btn || btn.__zoffWired) return;
    btn.__zoffWired = true;
    if (isLocal || !('serviceWorker' in navigator)) { btn.style.display = 'none'; return; }
    injectStyles();
    var item = itemFromEl(btn);
    var url = normUrl(item.url);

    async function refresh() {
      var saved = !!index.get(url);
      if (!saved) { paintButton(btn, 'idle'); return; }
      var lv = await liveVersions();
      var it = index.get(url);
      paintButton(btn, versionsDiffer(it && it.version, lv[url]) ? 'update' : 'saved');
    }

    btn.addEventListener('click', async function () {
      if (btn.classList.contains('zoff-busy')) return;
      var saved = !!index.get(url);
      var isUpdate = btn.classList.contains('zoff-update');
      if (saved && !isUpdate) {           // 已离线 → 再点移除（保存/取消保存的开关）
        await remove(url);
        await refresh();
        emit('change');
        return;
      }
      paintButton(btn, 'busy');
      var labelEl = btn.querySelector('.tool-label');
      await (isUpdate ? update : save)(item, {
        force: isUpdate,
        onProgress: function (d, t) { if (labelEl) labelEl.textContent = (isUpdate ? '更新中… ' : '保存中… ') + d + '/' + t; }
      });
      await refresh();
      await paintNotice();  // 更新后把文章头通知收起来
      emit('change');
    });

    on('change', refresh);
    await refresh();
  }

  // ───────────────────────── 方案 A：文章头内联通知 ─────────────────────────
  // 容器 #offline-article-notice，data-offline-url 指向本页。已离线且最新→「已离线」；
  // 有新版→「· 有新版，点此更新」；未保存→空。
  var _noticeEl = null, _noticeItem = null;
  async function paintNotice() {
    if (!_noticeEl) return;
    var url = normUrl(_noticeItem.url);
    var it = index.get(url);
    if (!it) { _noticeEl.innerHTML = ''; return; }  // 没保存 → 文章头不出现任何东西
    var sep = '<span class="zoff-sep">·</span>';
    var lv = await liveVersions();
    var html = sep + '<span class="zoff-ok">' + icon('check') + '已离线</span>';
    var stale = versionsDiffer(it.version, lv[url]);
    if (stale) html += sep + '<button type="button" class="zoff-notice">' + icon('refresh') + '有新版，点此更新</button>';
    _noticeEl.innerHTML = html;
    var b = _noticeEl.querySelector('.zoff-notice');
    if (b) b.addEventListener('click', async function () {
      b.innerHTML = icon('spinner') + '更新中…';
      await update(_noticeItem, { force: true });
      emit('change');
      await paintNotice();
    });
  }
  async function wireArticleNotice(el) {
    if (!el || isLocal) return;
    injectStyles();
    _noticeEl = el;
    _noticeItem = {
      url: el.getAttribute('data-offline-url') || W.location.pathname,
      title: el.getAttribute('data-offline-title') || document.title,
      category: el.getAttribute('data-offline-category') || '其他',
      kind: el.getAttribute('data-offline-kind') || 'article'
    };
    on('change', paintNotice);
    await paintNotice();
  }

  // ───────────────────────── 页脚离线状态点 ─────────────────────────
  async function initFooterDot(dot) {
    if (!dot) return;
    if (isLocal || !('serviceWorker' in navigator)) { dot.style.display = 'none'; return; }
    async function paint() {
      var url = normUrl(W.location.pathname);
      var it = index.get(url);
      if (!it) { dot.style.background = '#cbd5e1'; dot.title = '这一页未离线'; return; }
      var lv = await liveVersions();
      if (versionsDiffer(it.version, lv[url])) { dot.style.background = '#b0862f'; dot.title = '这一页已离线，但有新版可更新'; }
      else { dot.style.background = '#5d8a6b'; dot.title = '这一页已离线（最新）'; }
    }
    on('change', paint);
    await paint();
  }

  // ───────────────────────── 自动初始化 ─────────────────────────
  function boot() {
    if (isLocal) {
      // 本地预览：卸掉 SW + 清缓存，保证「本地即时预览」不被离线缓存干扰
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      }
      if (W.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
      return;
    }
    ready();  // 注册 SW
    var dot = document.getElementById('offline-status-dot'); if (dot) initFooterDot(dot);
    var btn = document.getElementById('offline-toggle'); if (btn) wireButton(btn);
    var notice = document.getElementById('offline-article-notice'); if (notice) wireArticleNotice(notice);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  // ───────────────────────── 导出 ─────────────────────────
  W.ZirconOffline = {
    normUrl: normUrl, fmtBytes: fmtBytes, versionsDiffer: versionsDiffer, orphanAssets: orphanAssets,
    ready: ready, ask: ask, liveVersions: liveVersions,
    index: index, save: save, update: update, remove: remove,
    checkUpdates: checkUpdates, stats: stats, clearAmbient: clearAmbient, clearSaved: clearSaved,
    icon: icon, injectStyles: injectStyles,
    wireButton: wireButton, wireArticleNotice: wireArticleNotice, initFooterDot: initFooterDot,
    on: on, emit: emit
  };
})();
