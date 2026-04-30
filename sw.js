/* Zirconeey site service worker
 * 策略：
 *  - 同源 HTML：network-first，更新缓存；离线时返回缓存
 *  - 同源静态资源（图、CSS、JS、字体）：cache-first
 *  - 跨域：透传，不缓存
 *  - 手动批量预取：通过 postMessage('PREFETCH_URLS') 触发
 *  - 查询是否已缓存：postMessage('IS_CACHED')
 */

const VERSION = 'v2';
const SHELL_CACHE = `zirconeey-shell-${VERSION}`;
const PAGE_CACHE  = `zirconeey-pages-${VERSION}`;
const ASSET_CACHE = `zirconeey-assets-${VERSION}`;

const SHELL_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => ![SHELL_CACHE, PAGE_CACHE, ASSET_CACHE].includes(n))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

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
  // 跳过 Waline / 评论 / waline 反代等动态接口（目前都是跨域，已被上面过滤）

  if (isHTMLRequest(req)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const copy = res.clone();
          const cache = await caches.open(PAGE_CACHE);
          cache.put(req, copy).catch(() => {});
        }
        return res;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        const home = await caches.match('/');
        return home || new Response('离线状态：这一页还没缓存过 🥲', {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        const cache = await caches.open(ASSET_CACHE);
        cache.put(req, copy).catch(() => {});
      }
      return res;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});

// 提取 HTML 里的 <img src> / 同源 CSS 链接 / <link rel=stylesheet>
function extractAssetUrls(html, baseUrl) {
  const urls = new Set();
  const reImg = /<img[^>]+src=["']([^"']+)["']/gi;
  const reSrcset = /<img[^>]+srcset=["']([^"']+)["']/gi;
  const reCss = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = reImg.exec(html))) urls.add(m[1]);
  while ((m = reCss.exec(html))) urls.add(m[1]);
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

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = (msg) => {
    if (port) { try { port.postMessage(msg); } catch {} }
    else if (event.source) { try { event.source.postMessage(msg); } catch {} }
  };

  if (data.type === 'PREFETCH_URLS') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const total = urls.length;
    let done = 0;
    const pageCache = await caches.open(PAGE_CACHE);
    const assetCache = await caches.open(ASSET_CACHE);

    for (const rawUrl of urls) {
      let absUrl;
      try { absUrl = new URL(rawUrl, self.location.origin).toString(); }
      catch { done++; reply({ type: 'PREFETCH_PROGRESS', done, total, url: rawUrl, ok: false }); continue; }

      try {
        const res = await fetch(absUrl, { cache: 'reload' });
        if (res && res.ok) {
          await pageCache.put(absUrl, res.clone()).catch(() => {});
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('text/html')) {
            const text = await res.clone().text();
            const assetUrls = extractAssetUrls(text, absUrl);
            await Promise.all(assetUrls.map(async (au) => {
              try {
                if (new URL(au).origin !== self.location.origin) return;
                const existing = await assetCache.match(au);
                if (existing) return;
                const r = await fetch(au, { cache: 'reload' });
                if (r && r.ok) await assetCache.put(au, r.clone()).catch(() => {});
              } catch {}
            }));
          }
        }
        done++;
        reply({ type: 'PREFETCH_PROGRESS', done, total, url: absUrl, ok: !!(res && res.ok) });
      } catch (e) {
        done++;
        reply({ type: 'PREFETCH_PROGRESS', done, total, url: absUrl, ok: false });
      }
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

  if (data.type === 'CLEAR_CACHE') {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('zirconeey-')).map((n) => caches.delete(n)));
    reply({ type: 'CLEAR_CACHE_DONE' });
  }
});
