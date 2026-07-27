(() => {
  'use strict';

  function getStore() {
    try { return window.localStorage; } catch (_) { return null; }
  }

  function readText(key) {
    const store = getStore();
    if (!store) return null;
    try { return store.getItem(key); } catch (_) { return null; }
  }

  function writeText(key, value) {
    const store = getStore();
    if (!store) return false;
    try {
      store.setItem(key, String(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readJson(key, fallback = null) {
    const raw = readText(key);
    if (raw == null || raw === '') return fallback;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    try { return writeText(key, JSON.stringify(value)); } catch (_) { return false; }
  }

  function remove(key) {
    const store = getStore();
    if (!store) return false;
    try {
      store.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  window.GuandanStorage = Object.freeze({
    readText,
    writeText,
    readJson,
    writeJson,
    remove,
  });
})();
