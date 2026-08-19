import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/auth/cloud-sync.js', import.meta.url), 'utf8');

function harness(fetchImpl, initial) {
  const values = new Map(Object.entries(initial || {}));
  const events = [];
  let changeHandler = null;
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  const SiteAuth = {
    API_BASE: 'https://example.test/api',
    authedFetch: fetchImpl,
    isLoggedIn: () => true,
    onChange(handler) { changeHandler = handler; },
  };
  const window = {
    SiteAuth,
    addEventListener() {},
    dispatchEvent(event) { events.push(event); },
  };
  const document = { addEventListener() {} };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options && options.detail; } }
  vm.runInNewContext(source, { window, document, SiteAuth, localStorage: storage, CustomEvent, setInterval() { return 1; }, JSON, Object, String, Error });
  return { window, values, events, changeHandler };
}

test('Forest v2 pull preserves local canonical data and stages a remote merge', async () => {
  const remote = JSON.stringify({ schemaVersion: 2, revision: 9, trees: [{ id: 'remote' }] });
  const local = JSON.stringify({ schemaVersion: 2, revision: 4, trees: [{ id: 'local' }] });
  const h = harness(async () => ({ ok: true, json: async () => ({ ok: true, data: { 'tool.forest.v2': remote } }) }), { 'tool.forest.v2': local });
  await h.window.CloudSync.pull();
  assert.equal(h.values.get('tool.forest.v2'), local);
  assert.equal(h.values.get('tool.forest.pendingRemote.v2'), remote);
  const pulled = h.events.find((event) => event.type === 'cloudsync:pulled');
  assert.ok(pulled);
  assert.deepEqual(Array.from(pulled.detail.keys), ['tool.forest.v2']);
});

test('failed push remains dirty and the same payload is retried', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls += 1;
    return calls === 1 ? { ok: false, status: 500 } : { ok: true, status: 200 };
  }, { 'tool.forest.v2': JSON.stringify({ schemaVersion: 2, revision: 1 }) });
  assert.equal(await h.window.CloudSync.push(true), false);
  assert.equal(h.window.CloudSync.getStatus().dirty, true);
  assert.equal(await h.window.CloudSync.push(false), true);
  assert.equal(calls, 2);
  assert.equal(h.window.CloudSync.getStatus().dirty, false);
});

