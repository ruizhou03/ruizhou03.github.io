/* ruizhou03.github.io site service worker — 双层缓存模型
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 两层泾渭分明（2026-07 重构，核心设计）：
 *
 *   Layer 1「离线书架」SAVED_CACHE —— 用户亲手点「保存离线」的文章 / 游戏 / 讲义。
 *     · cache-first：命中即秒开、不等网（飞机上真能用），联网也不偷偷替换。
 *     · 永不自动淘汰。只有用户在「离线内容库」里删除、或点「更新」时才变。
 *     · 「有没有新版」由前端拿 /offline-versions.json 比对判断，不靠 SW 后台重拉。
 *
 *   Layer 0「浏览缓存」PAGE_CACHE / ASSET_CACHE —— 随手浏览留下的临时加速副本。
 *     · HTML network-first（在线永远看最新）、静态资源 stale-while-revalidate。
 *     · 有界：超过条数上限按最早插入淘汰(FIFO)；activate 时按 TTL 清过期。
 *     · 不叫「已离线」、不进内容库、随时可被回收——纯粹是弱网 / 秒回退的兜底。
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 曾经踩过的坑（务必守住）：
 *  1. 部署新版本绝不清空用户已有缓存。别再用 v1/v2 命名空间在 activate 全删。
 *  2. HTML network-first 不能裸 await：弱网「连上了、传一半挂住」会永久转圈、
 *     连缓存都不回退。必须给硬超时 + 有缓存时先给网络几秒、超时吐缓存。
 *  3. 跨域请求一律透传，不缓存（评论 / Waline 反代 / CDN 都靠这条豁免）。
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 消息接口（postMessage，配 MessageChannel 单次问答）：
 *   保存书架：  SAVE_OFFLINE {url|urls, assets?, excludeAssets?, force?} → 进度 + 完成(带字节数)
 *              REMOVE_OFFLINE {urls[]}      从书架删除这些 URL（页面 + 其独占资源）
 *              IS_SAVED_BATCH {urls[]}      这些 URL 哪些在书架里
 *              GET_SAVED_INFO {url}         书架里这份的版本戳 + 缓存时间
 *              CLEAR_SAVED                  清空整个书架
 *   临时缓存：  CLEAR_AMBIENT               清空浏览缓存两层
 *   统计：      GET_CACHE_STATS             书架 / 浏览缓存各自的项数与字节数
 *   —— 以下为旧接口，迁移期保留兼容 ——
 *   PREFETCH_URLS（＝老版「下载离线 / 下载全部」按钮）现在也写进书架：那本就是
 *   用户的显式保存动作，不该被有界临时层的上限淘汰。IS_CACHED* / GET_CACHE_INFO
 *   先查书架再查浏览缓存，让老 UI 的「已离线」标记依旧准确。
 */

// 浏览缓存（临时层，有界）
const PAGE_CACHE  = 'ruizhou03-pages';
const ASSET_CACHE = 'ruizhou03-assets';
// 离线书架（显式保存，永久）
const SAVED_CACHE = 'ruizhou03-saved';
// 更早的历史命名空间，activate 时一次性清理
const LEGACY_PREFIXES = ['zirconeey-'];

// 浏览缓存上限：超过就按最早插入淘汰。图片多的页面一次会塞好几张，
// ASSET 上限给宽些。TTL 只在 activate 时清一次过期项。
const MAX_PAGES  = 60;
const MAX_ASSETS = 400;
const AMBIENT_TTL_MS = 21 * 24 * 60 * 60 * 1000; // 三周没被刷新到的浏览缓存视为过期

self.addEventListener('install', (event) => {
  // 只兜底缓一份首页（进浏览缓存），网络挂掉时给个「回首页」的出口。
  event.waitUntil((async () => {
    try {
      const res = await fetch('/', { cache: 'no-cache' });
      if (res && res.ok) {
        const cache = await caches.open(PAGE_CACHE);
        await cache.put('/', res.clone());
      }
    } catch (_) { /* 装 SW 时离线就跳过 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => LEGACY_PREFIXES.some((p) => n.startsWith(p)))
        .map((n) => caches.delete(n))
    );
    // 书架(SAVED_CACHE)永不在这里动。只清理浏览缓存里的过期项 + 收敛到上限。
    await pruneAmbientByTTL();
    await trimCache(PAGE_CACHE, MAX_PAGES);
    await trimCache(ASSET_CACHE, MAX_ASSETS);
    await self.clients.claim();
  })());
});

// 超过上限：cache.keys() 按插入顺序返回，删最前面（最早）的若干个。
async function trimCache(cacheName, max) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= max) return;
    const overflow = keys.length - max;
    for (let i = 0; i < overflow; i++) await cache.delete(keys[i]);
  } catch (_) {}
}

// 按响应的 date 头清理过期浏览缓存（书架不清）。
async function pruneAmbientByTTL() {
  const now = Date.now();
  for (const name of [PAGE_CACHE, ASSET_CACHE]) {
    try {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      for (const req of keys) {
        const res = await cache.match(req);
        const d = res && res.headers.get('date');
        if (!d) continue;
        const t = Date.parse(d);
        if (!isNaN(t) && now - t > AMBIENT_TTL_MS) await cache.delete(req);
      }
    } catch (_) {}
  }
}

const isHTMLRequest = (req) => {
  if (req.mode === 'navigate') return true;
  if (req.destination === 'document') return true;
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html');
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith(handleFetch(req, url));
});

async function handleFetch(req, url) {
  // 版本清单：前端判断「有没有新版」的真相来源。已保存页被 cache-first 后
  // 无法自证过期，必须靠这个联网拿到的小文件比对——所以它走 network-only，
  // 离线时才回退到上次缓存（给个能用的近似），从不进书架、从不被 cache-first。
  if (url.pathname === '/offline-versions.json') {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) { caches.open(ASSET_CACHE).then((c) => c.put(req, res.clone())).catch(() => {}); return res; }
    } catch (_) {}
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }

  const html = isHTMLRequest(req);

  // ── Layer 1：书架命中 → cache-first，秒开、不联网、不偷偷更新 ──
  // 导航带 query（?room=1234 等）时按无 query 的干净 URL 命中书架副本。
  const saved = await caches.open(SAVED_CACHE);
  let savedHit = await saved.match(req);
  if (!savedHit && html && url.search) savedHit = await saved.match(url.origin + url.pathname);
  if (savedHit) return savedHit;

  // ── Layer 0：浏览缓存 ──
  if (html) return handleHtmlAmbient(req, url);
  return handleAssetAmbient(req);
}

// HTML：network-first，写入有界浏览缓存；离线回退缓存。
async function handleHtmlAmbient(req, url) {
  const cached = await caches.match(req);

  const ctrl = new AbortController();
  const hardStop = setTimeout(() => ctrl.abort(), 20000);
  const netFetch = fetch(req, { cache: 'no-cache', signal: ctrl.signal })
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(PAGE_CACHE).then(async (cache) => {
          await cache.put(req, copy);
          await trimCache(PAGE_CACHE, MAX_PAGES);
        }).catch(() => {});
      }
      return res;
    })
    .finally(() => clearTimeout(hardStop));

  if (cached) {
    // 给网络一个短窗口抢答；超时 / 失败就吐缓存，网络留后台跑完刷新缓存。
    const timeout = new Promise((resolve) => setTimeout(() => resolve('__TIMEOUT__'), 4000));
    const winner = await Promise.race([
      netFetch.then((res) => res || '__ERR__').catch(() => '__ERR__'),
      timeout,
    ]);
    if (winner && typeof winner !== 'string') return winner;
    netFetch.catch(() => {});
    return cached;
  }

  try {
    const res = await netFetch;
    if (res) return res;
  } catch (e) { /* 落到下面的回退 */ }

  // 带 query 的 URL 网络失败时回退到无 query 的缓存副本
  if (url.search) {
    const baseCached = await caches.match(url.origin + url.pathname);
    if (baseCached) return baseCached;
  }

  return new Response(
    '<!doctype html><meta charset="utf-8"><title>离线</title>' +
    '<p style="font-family:serif;text-align:center;margin-top:30vh;color:#666;">' +
    '🥲 这一页还没保存离线，等有网了再来吧。<br>' +
    '或者 <a href="/" style="color:#1e3a5f;">回到首页看看</a>。</p>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// 静态资源：stale-while-revalidate，写入有界浏览缓存。
async function handleAssetAmbient(req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(async (res) => {
    if (res && res.ok && res.type === 'basic') {
      await cache.put(req, res.clone()).catch(() => {});
      await trimCache(ASSET_CACHE, MAX_ASSETS);
    }
    return res;
  }).catch(() => null);
  if (cached) { fetchPromise.catch(() => {}); return cached; }
  const res = await fetchPromise;
  if (res) return res;
  return new Response('', { status: 504 });
}

// 提取 HTML 里的 <img src/srcset> + 同源 CSS / JS / 字体链接
function extractAssetUrls(html, baseUrl) {
  const urls = new Set();
  const reImg    = /<img[^>]+src=["']([^"']+)["']/gi;
  const reSrcset = /<img[^>]+srcset=["']([^"']+)["']/gi;
  const reCss    = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
  const reScript = /<script[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = reImg.exec(html)))    urls.add(m[1]);
  while ((m = reCss.exec(html)))    urls.add(m[1]);
  while ((m = reScript.exec(html))) urls.add(m[1]);
  while ((m = reSrcset.exec(html))) {
    m[1].split(',').forEach((part) => {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    });
  }
  return [...urls].map((u) => {
    try { return new URL(u, baseUrl).toString(); } catch { return null; }
  }).filter(Boolean);
}

// 抓一个页面 + 它引用的同源资源，写进目标 cache。返回抓到的字节数。
async function fetchBundle(rawUrl, opts) {
  const { pageCache, assetCache, excludeAssets, force, onOne, collect } = opts;
  let bytes = 0;
  let absUrl;
  try { absUrl = new URL(rawUrl, self.location.origin).toString(); }
  catch { if (onOne) onOne(rawUrl, false, false); return 0; }

  try {
    if (!force) {
      const existing = await pageCache.match(absUrl);
      if (existing) { if (onOne) onOne(absUrl, true, true); return 0; }
    }
    const res = await fetch(absUrl, { cache: 'no-cache' });
    if (res && res.ok) {
      const buf = await res.clone().arrayBuffer();
      bytes += buf.byteLength;
      await pageCache.put(absUrl, res.clone()).catch(() => {});
      if (collect) collect.add(absUrl);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        const text = await res.clone().text();
        const assetUrls = extractAssetUrls(text, absUrl);
        await Promise.all(assetUrls.map(async (au) => {
          try {
            const auUrl = new URL(au);
            if (auUrl.origin !== self.location.origin) return;
            if (excludeAssets && excludeAssets.test(auUrl.pathname)) return;
            if (!force) { const ex = await assetCache.match(au); if (ex) return; }
            const r = await fetch(au, { cache: 'no-cache' });
            if (r && r.ok) {
              const b = await r.clone().arrayBuffer();
              bytes += b.byteLength;
              await assetCache.put(au, r.clone()).catch(() => {});
              if (collect) collect.add(au);
            }
          } catch {}
        }));
      }
    }
    if (onOne) onOne(absUrl, !!(res && res.ok), false);
  } catch (e) {
    if (onOne) onOne(absUrl, false, false);
  }
  return bytes;
}

async function sumCacheBytes(cacheName) {
  let items = 0, bytes = 0;
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    items = keys.length;
    for (const req of keys) {
      const res = await cache.match(req);
      if (!res) continue;
      const len = res.headers.get('content-length');
      if (len && !isNaN(+len)) { bytes += +len; continue; }
      try { bytes += (await res.clone().arrayBuffer()).byteLength; } catch {}
    }
  } catch (_) {}
  return { items, bytes };
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = (msg) => {
    if (port) { try { port.postMessage(msg); } catch {} }
    else if (event.source) { try { event.source.postMessage(msg); } catch {} }
  };

  // ─────────── 新接口：离线书架 ───────────
  if (data.type === 'SAVE_OFFLINE') {
    const urls = Array.isArray(data.urls) ? data.urls : (data.url ? [data.url] : []);
    const extraAssets = Array.isArray(data.assets) ? data.assets : [];
    const force = !!data.force;
    const silent = !!data.silent;
    let excludeAssets = null;
    if (typeof data.excludeAssets === 'string' && data.excludeAssets) {
      try { excludeAssets = new RegExp(data.excludeAssets); } catch {}
    }
    const savedCache = await caches.open(SAVED_CACHE);
    const total = urls.length;
    let done = 0, bytes = 0;
    // 记下这次实际缓存进书架的所有 URL（页面 + 资源），随 SAVE_DONE 回给客户端，
    // 客户端存进离线索引；日后删除时据此只清该项独占的资源、不误删共享外壳。
    const collect = new Set();

    // manifest 显式列出的额外资源先塞进书架
    if (extraAssets.length) {
      for (const rawUrl of extraAssets) {
        try {
          const absUrl = new URL(rawUrl, self.location.origin).toString();
          if (new URL(absUrl).origin !== self.location.origin) continue;
          if (!force) { const ex = await savedCache.match(absUrl); if (ex) { collect.add(absUrl); continue; } }
          const r = await fetch(absUrl, { cache: 'no-cache' });
          if (r && r.ok) { bytes += (await r.clone().arrayBuffer()).byteLength; await savedCache.put(absUrl, r.clone()).catch(() => {}); collect.add(absUrl); }
        } catch {}
      }
    }

    for (const rawUrl of urls) {
      bytes += await fetchBundle(rawUrl, {
        pageCache: savedCache, assetCache: savedCache, excludeAssets, force, collect,
        onOne: (u, ok, skipped) => {
          done++;
          if (!silent) reply({ type: 'SAVE_PROGRESS', done, total, url: u, ok, skipped });
        }
      });
    }
    reply({ type: 'SAVE_DONE', total, bytes, assets: [...collect] });
    return;
  }

  if (data.type === 'REMOVE_OFFLINE') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const savedCache = await caches.open(SAVED_CACHE);
    let removed = 0;
    await Promise.all(urls.map(async (rawUrl) => {
      try {
        const absUrl = new URL(rawUrl, self.location.origin).toString();
        const ok = await savedCache.delete(absUrl);
        if (ok) removed++;
      } catch {}
    }));
    reply({ type: 'REMOVE_DONE', removed });
    return;
  }

  if (data.type === 'IS_SAVED_BATCH') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const savedCache = await caches.open(SAVED_CACHE);
    const results = await Promise.all(urls.map(async (rawUrl) => {
      let absUrl;
      try { absUrl = new URL(rawUrl, self.location.origin).toString(); }
      catch { return { url: rawUrl, cached: false }; }
      const m = await savedCache.match(absUrl);
      return { url: rawUrl, cached: !!m };
    }));
    reply({ type: 'IS_SAVED_BATCH_RESULT', results, cached: results.filter((r) => r.cached).length, total: urls.length });
    return;
  }

  // 列出书架里所有已保存的「页面」（供前端自愈离线索引：整栏 / 分组 / 任何途径存进
  // 书架、但还没记进 localStorage 账本的项，据此补进「离线内容库」）。
  // 只挑 text/html 的条目（页面），跳过 js/css/图片等资源；元数据从缓存的 HTML 里解析。
  if (data.type === 'LIST_SAVED') {
    const savedCache = await caches.open(SAVED_CACHE);
    const keys = await savedCache.keys();
    const pages = [];
    for (const req of keys) {
      const res = await savedCache.match(req);
      if (!res) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html')) continue;
      let text = '';
      try { text = await res.clone().text(); } catch {}
      const grab = (re) => { const m = text.match(re); return m ? m[1] : null; };
      let title = grab(/<meta\s+name=["']zircon-title["']\s+content=["']([^"']*)["']/i);
      if (!title) title = grab(/<title>([^<]*)<\/title>/i);
      let size = 0;
      const len = res.headers.get('content-length');
      if (len && !isNaN(+len)) size = +len;
      else { try { size = (await res.clone().arrayBuffer()).byteLength; } catch {} }
      pages.push({
        url: req.url,
        title: title || req.url,
        category: grab(/<meta\s+name=["']zircon-category["']\s+content=["']([^"']*)["']/i) || '',
        version: grab(/<meta\s+name=["']zircon-page-version["']\s+content=["']([^"']*)["']/i),
        savedAt: res.headers.get('date') || null,
        size: size
      });
    }
    reply({ type: 'LIST_SAVED_RESULT', pages });
    return;
  }

  if (data.type === 'GET_SAVED_INFO') {
    const url = data.url;
    let absUrl;
    try { absUrl = new URL(url, self.location.origin).toString(); }
    catch { reply({ type: 'SAVED_INFO', url, cached: false }); return; }
    const savedCache = await caches.open(SAVED_CACHE);
    const res = await savedCache.match(absUrl);
    if (!res) { reply({ type: 'SAVED_INFO', url: absUrl, cached: false }); return; }
    let cachedVersion = null;
    try {
      const text = await res.clone().text();
      const m = text.match(/<meta\s+name=["']zircon-page-version["']\s+content=["']([^"']+)["']/i);
      if (m) cachedVersion = m[1];
    } catch {}
    reply({ type: 'SAVED_INFO', url: absUrl, cached: true, cachedVersion, cachedAt: res.headers.get('date') || null });
    return;
  }

  if (data.type === 'CLEAR_SAVED') {
    await caches.delete(SAVED_CACHE);
    reply({ type: 'CLEAR_SAVED_DONE' });
    return;
  }

  if (data.type === 'CLEAR_AMBIENT') {
    await Promise.all([caches.delete(PAGE_CACHE), caches.delete(ASSET_CACHE)]);
    reply({ type: 'CLEAR_AMBIENT_DONE' });
    return;
  }

  if (data.type === 'GET_CACHE_STATS') {
    const [savedS, pageS, assetS] = await Promise.all([
      sumCacheBytes(SAVED_CACHE), sumCacheBytes(PAGE_CACHE), sumCacheBytes(ASSET_CACHE)
    ]);
    reply({
      type: 'CACHE_STATS',
      saved: savedS,
      ambient: { items: pageS.items + assetS.items, bytes: pageS.bytes + assetS.bytes }
    });
    return;
  }

  // ─────────── 旧接口：迁移期兼容 ───────────
  // PREFETCH_URLS = 老版显式下载按钮 → 写进书架（不是有界临时层）。
  if (data.type === 'PREFETCH_URLS') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const extraAssets = Array.isArray(data.assets) ? data.assets : [];
    const silent = !!data.silent;
    const force = !!data.force;
    let excludeAssets = null;
    if (typeof data.excludeAssets === 'string' && data.excludeAssets) {
      try { excludeAssets = new RegExp(data.excludeAssets); } catch {}
    }
    const total = urls.length;
    let done = 0;
    const savedCache = await caches.open(SAVED_CACHE);
    if (extraAssets.length) {
      await Promise.all(extraAssets.map(async (rawUrl) => {
        try {
          const absUrl = new URL(rawUrl, self.location.origin).toString();
          if (new URL(absUrl).origin !== self.location.origin) return;
          if (!force) { const ex = await savedCache.match(absUrl); if (ex) return; }
          const r = await fetch(absUrl, { cache: 'no-cache' });
          if (r && r.ok) await savedCache.put(absUrl, r.clone()).catch(() => {});
        } catch {}
      }));
    }
    for (const rawUrl of urls) {
      await fetchBundle(rawUrl, {
        pageCache: savedCache, assetCache: savedCache, excludeAssets, force,
        onOne: (u, ok, skipped) => {
          done++;
          if (!silent) reply({ type: 'PREFETCH_PROGRESS', done, total, url: u, ok, skipped });
        }
      });
    }
    reply({ type: 'PREFETCH_DONE', total });
    return;
  }

  if (data.type === 'IS_CACHED') {
    const url = data.url;
    let absUrl;
    try { absUrl = new URL(url, self.location.origin).toString(); }
    catch { reply({ type: 'IS_CACHED_RESULT', url, cached: false }); return; }
    const m = await caches.match(absUrl);
    reply({ type: 'IS_CACHED_RESULT', url: absUrl, cached: !!m });
    return;
  }

  if (data.type === 'GET_CACHE_INFO') {
    const url = data.url;
    let absUrl;
    try { absUrl = new URL(url, self.location.origin).toString(); }
    catch { reply({ type: 'CACHE_INFO', url, cached: false }); return; }
    let res = await (await caches.open(SAVED_CACHE)).match(absUrl);
    if (!res) res = await (await caches.open(PAGE_CACHE)).match(absUrl);
    if (!res) { reply({ type: 'CACHE_INFO', url: absUrl, cached: false }); return; }
    let cachedVersion = null;
    try {
      const text = await res.clone().text();
      const m = text.match(/<meta\s+name=["']zircon-page-version["']\s+content=["']([^"']+)["']/i);
      if (m) cachedVersion = m[1];
    } catch {}
    reply({ type: 'CACHE_INFO', url: absUrl, cached: true, cachedVersion, cachedAt: res.headers.get('date') || null });
    return;
  }

  if (data.type === 'IS_CACHED_BATCH') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const pageCache = await caches.open(PAGE_CACHE);
    const savedCache = await caches.open(SAVED_CACHE);
    const results = await Promise.all(urls.map(async (rawUrl) => {
      let absUrl;
      try { absUrl = new URL(rawUrl, self.location.origin).toString(); }
      catch { return { url: rawUrl, cached: false }; }
      const m = (await savedCache.match(absUrl)) || (await pageCache.match(absUrl));
      return { url: rawUrl, cached: !!m };
    }));
    reply({ type: 'IS_CACHED_BATCH_RESULT', results, cached: results.filter((r) => r.cached).length, total: urls.length });
    return;
  }

  if (data.type === 'CLEAR_CACHE') {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => n.startsWith('ruizhou03-') || n.startsWith('zirconeey-'))
           .map((n) => caches.delete(n))
    );
    reply({ type: 'CLEAR_CACHE_DONE' });
  }
});
