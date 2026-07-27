(() => {
  'use strict';

  const enabled = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  function bindSecretChords(actions) {
    if (!enabled) return () => {};
    let buffer = '';
    const handler = event => {
      const tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const key = (event.key || '').toLowerCase();
      if (key.length !== 1 || key < 'a' || key > 'z') return;
      buffer = (buffer + key).slice(-4);
      const action = actions[buffer];
      if (!action) return;
      buffer = '';
      action();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }

  window.GuandanDebug = Object.freeze({ enabled, bindSecretChords });
})();
