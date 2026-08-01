(function () {
  'use strict';
  const VERSION = '20260801g7a';
  const SOURCES = [
    '/assets/js/games-shell/wins-leaderboard.js',
    '/assets/js/games-shell/comments.js',
    '/assets/js/games-shell/nick-prompt.js',
  ];
  let pending = null;

  function load(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-ddz-extra="${src}"]`);
      if (existing) {
        if (existing.dataset.ready === '1') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }
      const script = document.createElement('script');
      script.src = `${src}?v=${VERSION}`;
      script.async = true;
      script.dataset.ddzExtra = src;
      script.addEventListener('load', () => { script.dataset.ready = '1'; resolve(); }, { once: true });
      script.addEventListener('error', () => reject(new Error(`extra_load_failed:${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function ensure() {
    if (!pending) pending = Promise.all(SOURCES.map(load)).catch(error => { pending = null; throw error; });
    return pending;
  }

  window.DDZExtras = Object.freeze({ ensure });
})();
