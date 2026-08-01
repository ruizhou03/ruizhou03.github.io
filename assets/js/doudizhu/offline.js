(function () {
  'use strict';
  const MANIFEST_URL = '/toolbox/doudizhu/offline-assets.json';
  const SAVED_CACHE = 'ruizhou03-saved';

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function verifiedResponse(asset) {
    let response = await caches.match(asset.url);
    if (!response) response = await fetch(asset.url, { cache: 'no-store' });
    if (!response || !response.ok) throw new Error('offline_asset_unavailable');
    let digest = hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()));
    if (digest !== asset.sha256) {
      response = await fetch(asset.url, { cache: 'reload' });
      if (!response.ok) throw new Error('offline_asset_unavailable');
      digest = hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()));
    }
    if (digest !== asset.sha256) throw new Error('offline_asset_hash_mismatch');
    return response;
  }

  async function cacheTier(tier, onProgress) {
    if (!('caches' in window) || !crypto.subtle) throw new Error('offline_cache_unavailable');
    const manifestResponse = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error('offline_manifest_unavailable');
    const manifest = await manifestResponse.clone().json();
    if (!manifest || !Array.isArray(manifest.core) || !Array.isArray(manifest[tier])) {
      throw new Error('offline_manifest_invalid');
    }
    const assets = manifest.core.concat(manifest[tier]);
    const cache = await caches.open(SAVED_CACHE);
    for (let i = 0; i < assets.length; i++) {
      if (onProgress) onProgress(i + 1, assets.length);
      await cache.put(assets[i].url, (await verifiedResponse(assets[i])).clone());
    }
    await cache.put(MANIFEST_URL, manifestResponse.clone());
    const page = await fetch('/toolbox/doudizhu/', { cache: 'no-store' });
    if (!page.ok) throw new Error('offline_page_unavailable');
    await cache.put('/toolbox/doudizhu/', page.clone());
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SAVE_OFFLINE',
        url: '/toolbox/doudizhu/',
        assets: assets.map(asset => asset.url),
      });
    }
    return { tier, bytes: assets.reduce((sum, asset) => sum + (asset.bytes || 0), 0) };
  }

  function selectedTier() {
    const selected = document.querySelector('.ddz-mode-tab.active[data-diff]');
    const difficulty = selected ? selected.dataset.diff : 'normal';
    return difficulty === 'hard' ? 'hard' : difficulty === 'master' ? 'master' : 'base';
  }

  function mount() {
    const button = document.getElementById('ddzOfflineCacheBtn');
    const status = document.getElementById('ddzOfflineStatus');
    if (!button || !status) return;
    button.addEventListener('click', async () => {
      const tier = selectedTier();
      button.disabled = true;
      try {
        const result = await cacheTier(tier, (done, total) => {
          status.textContent = `正在校验并缓存 ${done}/${total}…`;
        });
        const label = tier === 'base' ? '基础版' : tier === 'hard' ? '高手版' : '大神版';
        status.textContent = `${label}已校验并缓存，可离线使用。`;
        try { localStorage.setItem(`tool.doudizhu.offline.${tier}.v1`, String(result.bytes)); } catch {}
      } catch (error) {
        status.textContent = '离线包未完成；当前档位联网可用，断网时会明确降级。';
      } finally {
        button.disabled = false;
      }
    });
  }

  window.DDZOffline = Object.freeze({ cacheTier, mount });
  mount();
})();
