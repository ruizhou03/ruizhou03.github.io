/* Zirconeey site service worker
 *
 * 关键约束（曾经踩过的坑）：
 *  1. 部署新版本绝对不能清空用户已有缓存。之前用 v1/v2/v3/v4 命名空间，
 *     activate 阶段把不在白名单里的全删掉，结果用户上飞机前的"全站离线"
 *     一遇到我推新版就归零。永远不要再这样。
 *  2. cache-first 会让 CSS/JS 卡死在旧版本，stale-while-revalidate 是底线。
 *  3. 跨域请求一律透传，不缓存（评论 / Waline 反代 / CDN 都靠这条豁免）。
 *
 * 策略：
 *  - 同源 HTML：network-first，更新缓存；离线时回缓存
 *  - 同源静态资源：stale-while-revalidate
 *  - 自动后台预缓存：访问任意页面后由前端在 idle 时分批 postMessage('PREFETCH_URLS')
 *  - 手动批量：listing 页 / 文章页的下载按钮也走同一个 PREFETCH_URLS
 *  - 查询缓存状态：postMessage('IS_CACHED' / 'IS_CACHED_BATCH')
 */

// 缓存名故意不带版本号——同一个 cache 一直滚动用，靠 SWR 自然刷新内容。
// 旧版本残留（v1/v2/v3/v4 命名空间）做一次性清理。
const PAGE_CACHE  = 'zirconeey-pages';
const ASSET_CACHE = 'zirconeey-assets';
const LEGACY_PREFIXES = ['zirconeey-shell-', 'zirconeey-pages-v', 'zirconeey-assets-v'];

self.addEventListener('install', (event) => {
  // 不预取任何东西。SW 安装要快，全站预缓存交给前端 idle 调度。
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => LEGACY_PREFIXES.some((p) => n.startsWith(p)))
        .map((n) => caches.delete(n))
    );
    // 注意：除了上面这批历史命名空间，其它一律不删。即使将来此文件再迭代，
    // PAGE_CACHE / ASSET_CACHE 保持不变，用户的离线副本就一直在。
    await self.clients.claim();
  })());
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
        // 仅当同一 URL 自己有离线副本时才返回 —— 永远不要把 / 的缓存当成其它 URL 的响应，
        // 否则浏览器地址栏和页面内容会脱节（曾导致 /toolbox/2048/ 渲染成首页）
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>离线</title>' +
          '<p style="font-family:serif;text-align:center;margin-top:30vh;color:#666;">' +
          '🥲 这一页还没缓存过，等有网了再来吧。</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // stale-while-revalidate：有缓存立即返回，同时后台拉新版本写回缓存。
  // 下一次访问就能拿到刚部署的更新，不需要 Cmd+Shift+R。
  event.respondWith((async () => {
    const cache = await caches.open(ASSET_CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    }).catch(() => null);
    if (cached) {
      fetchPromise.catch(() => {});
      return cached;
    }
    const res = await fetchPromise;
    if (res) return res;
    return new Response('', { status: 504 });
  })());
});

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

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  const reply = (msg) => {
    if (port) { try { port.postMessage(msg); } catch {} }
    else if (event.source) { try { event.source.postMessage(msg); } catch {} }
  };

  if (data.type === 'PREFETCH_URLS') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const extraAssets = Array.isArray(data.assets) ? data.assets : [];
    // silent=true 时不发 PREFETCH_PROGRESS，只发最终 PREFETCH_DONE。
    // idle 后台批量预取走这条，避免无脑刷消息。
    const silent = !!data.silent;
    // 自动预取要跳过 /files/ 下的大照片（150+ MB）；手动"下载文章配图"按钮则不传，全要。
    let excludeAssets = null;
    if (typeof data.excludeAssets === 'string' && data.excludeAssets) {
      try { excludeAssets = new RegExp(data.excludeAssets); } catch {}
    }
    const total = urls.length;
    let done = 0;
    const pageCache = await caches.open(PAGE_CACHE);
    const assetCache = await caches.open(ASSET_CACHE);

    // 先把 manifest 显式列出的资源（非 HTML）批量塞进 asset cache
    if (extraAssets.length) {
      await Promise.all(extraAssets.map(async (rawUrl) => {
        try {
          const absUrl = new URL(rawUrl, self.location.origin).toString();
          if (new URL(absUrl).origin !== self.location.origin) return;
          const existing = await assetCache.match(absUrl);
          if (existing) return;
          const r = await fetch(absUrl, { cache: 'no-cache' });
          if (r && r.ok) await assetCache.put(absUrl, r.clone()).catch(() => {});
        } catch {}
      }));
    }

    for (const rawUrl of urls) {
      let absUrl;
      try { absUrl = new URL(rawUrl, self.location.origin).toString(); }
      catch {
        done++;
        if (!silent) reply({ type: 'PREFETCH_PROGRESS', done, total, url: rawUrl, ok: false });
        continue;
      }

      try {
        // 已经缓存过的就跳过，省流量。SWR 会保证它最终被刷新。
        const existing = await pageCache.match(absUrl);
        if (existing) {
          done++;
          if (!silent) reply({ type: 'PREFETCH_PROGRESS', done, total, url: absUrl, ok: true, skipped: true });
          continue;
        }
        const res = await fetch(absUrl, { cache: 'no-cache' });
        if (res && res.ok) {
          await pageCache.put(absUrl, res.clone()).catch(() => {});
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('text/html')) {
            const text = await res.clone().text();
            const assetUrls = extractAssetUrls(text, absUrl);
            await Promise.all(assetUrls.map(async (au) => {
              try {
                const auUrl = new URL(au);
                if (auUrl.origin !== self.location.origin) return;
                if (excludeAssets && excludeAssets.test(auUrl.pathname)) return;
                const existing = await assetCache.match(au);
                if (existing) return;
                const r = await fetch(au, { cache: 'no-cache' });
                if (r && r.ok) await assetCache.put(au, r.clone()).catch(() => {});
              } catch {}
            }));
          }
        }
        done++;
        if (!silent) reply({ type: 'PREFETCH_PROGRESS', done, total, url: absUrl, ok: !!(res && res.ok) });
      } catch (e) {
        done++;
        if (!silent) reply({ type: 'PREFETCH_PROGRESS', done, total, url: absUrl, ok: false });
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

  // 单 URL 详情：是否缓存 + 缓存里嵌入的版本戳 + Response.Date。
  // 用于文章/页面的"已离线·最新 / 旧版"徽标。
  if (data.type === 'GET_CACHE_INFO') {
    const url = data.url;
    let absUrl;
    try { absUrl = new URL(url, self.location.origin).toString(); }
    catch { reply({ type: 'CACHE_INFO', url, cached: false }); return; }
    const cache = await caches.open(PAGE_CACHE);
    const res = await cache.match(absUrl);
    if (!res) { reply({ type: 'CACHE_INFO', url: absUrl, cached: false }); return; }
    let cachedVersion = null;
    try {
      const text = await res.clone().text();
      const m = text.match(/<meta\s+name=["']zircon-page-version["']\s+content=["']([^"']+)["']/i);
      if (m) cachedVersion = m[1];
    } catch {}
    reply({
      type: 'CACHE_INFO',
      url: absUrl,
      cached: true,
      cachedVersion,
      cachedAt: res.headers.get('date') || null
    });
    return;
  }

  if (data.type === 'IS_CACHED_BATCH') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    const pageCache = await caches.open(PAGE_CACHE);
    const results = await Promise.all(urls.map(async (rawUrl) => {
      let absUrl;
      try { absUrl = new URL(rawUrl, self.location.origin).toString(); }
      catch { return { url: rawUrl, cached: false }; }
      const m = await pageCache.match(absUrl);
      return { url: rawUrl, cached: !!m };
    }));
    const cached = results.filter((r) => r.cached).length;
    reply({
      type: 'IS_CACHED_BATCH_RESULT',
      results,
      cached,
      total: urls.length
    });
    return;
  }

  if (data.type === 'CLEAR_CACHE') {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('zirconeey-')).map((n) => caches.delete(n)));
    reply({ type: 'CLEAR_CACHE_DONE' });
  }
});
