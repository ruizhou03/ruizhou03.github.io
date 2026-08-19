import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/forest/core.js');
const Storage = require('../assets/js/forest/storage.js');

function seededStore(initial, options) {
  const backend = Storage.memoryStorage();
  Object.entries(initial || {}).forEach(([key, value]) => backend.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)));
  let clock = 10_000;
  const store = Storage.createStore(backend, Object.assign({ now: () => clock, random: () => 0.25 }, options || {}));
  return { backend, store, setClock(value) { clock = value; } };
}

test('legacy keys migrate once into an atomic v2 envelope with deterministic session IDs', () => {
  const legacy = {
    [Storage.LEGACY.trees]: [{ id: 'tr-1', type: 'oak', success: true, durationMinutes: 30, endTime: 9000 }],
    [Storage.LEGACY.sessions]: [{ minutes: 30, exp: 30, endTime: 9000, type: 'oak' }],
    [Storage.LEGACY.fields]: [{ id: 'fld-1', name: '论文', createdAt: '2026-01-01T00:00:00Z' }],
    [Storage.LEGACY.activeFieldId]: 'fld-1',
    [Storage.LEGACY.strict]: '1',
  };
  const first = seededStore(legacy);
  const loaded = first.store.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.snapshot.prefs.focusMode, Core.MODE.STRICT);
  assert.match(loaded.snapshot.sessions[0].id, /^fr-[0-9a-f]{8}$/);
  const deterministicId = loaded.snapshot.sessions[0].id;
  const second = seededStore(legacy);
  assert.equal(second.store.load().snapshot.sessions[0].id, deterministicId);
});

test('legacy active data with two special targets is quarantined instead of guessed', () => {
  const fixture = seededStore({
    [Storage.LEGACY.active]: {
      startTime: 1000, duration: 30 * 60_000, treeType: 'oak', lastTick: 2000,
      _meta: { revivalTargetId: 'dead-1', cultivateTargetId: 'alive-1' },
    },
  });
  const loaded = fixture.store.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.snapshot.active.target, null);
  assert.deepEqual(loaded.snapshot.pendingActivityConflict, {
    revivalTargetId: 'dead-1', cultivateTargetId: 'alive-1', detectedAt: 10_000,
  });
});

test('corrupt snapshots are preserved and never overwritten during load', () => {
  const fixture = seededStore({ [Storage.SNAPSHOT_KEY]: '{broken-json' });
  const loaded = fixture.store.load();
  assert.equal(loaded.ok, false);
  assert.equal(fixture.backend.getItem(Storage.SNAPSHOT_KEY), '{broken-json');
  assert.deepEqual(fixture.store.recoverCorruptRaw(), { key: Storage.SNAPSHOT_KEY, raw: '{broken-json' });
});

test('future schema fails closed instead of silently downgrading', () => {
  const fixture = seededStore({ [Storage.SNAPSHOT_KEY]: { schemaVersion: 999, revision: 1 } });
  const loaded = fixture.store.load();
  assert.equal(loaded.ok, false);
  assert.equal(loaded.unsupported, true);
  assert.equal(loaded.error.code, 'UNSUPPORTED_FUTURE_SCHEMA');
});

test('v2 save remains successful when a legacy compatibility mirror fails', () => {
  const base = Storage.memoryStorage();
  const backend = {
    getItem: base.getItem.bind(base),
    removeItem: base.removeItem.bind(base),
    setItem(key, value) {
      if (key === Storage.LEGACY.trees) throw new Error('legacy quota');
      base.setItem(key, value);
    },
  };
  const store = Storage.createStore(backend, { now: () => 1000, random: () => 0.1 });
  const loaded = store.load();
  assert.equal(loaded.ok, true);
  assert.ok(loaded.legacyMirrorError);
  assert.ok(base.getItem(Storage.SNAPSHOT_KEY));
  assert.ok(store.snapshot);
});

test('optimistic revisions merge two writers instead of overwriting unrelated rows', () => {
  const fixture = seededStore();
  const first = fixture.store.load();
  fixture.store.mutate((draft) => { draft.trees.push({ id: 'tr-a', updatedAt: 11_000 }); }, 'tree-a');
  const other = Core.normalizeSnapshot(first.snapshot, 12_000);
  other.sessions.push(Core.makeSessionRecord({ id: 'fr-b', minutes: 30, exp: 30, endTime: 12_000 }));
  const merged = fixture.store.merge(other, 'remote');
  assert.equal(merged.ok, true);
  assert.equal(merged.snapshot.trees.some((tree) => tree.id === 'tr-a'), true);
  assert.equal(merged.snapshot.sessions.some((row) => row.id === 'fr-b'), true);
});

test('export checksum is verified and replace import keeps foreign active pending', () => {
  const fixture = seededStore();
  fixture.store.load();
  fixture.store.mutate((draft) => {
    draft.active = Core.createSession({ id: 'fs-local', now: 1000, minutes: 30, mode: Core.MODE.SELF, ownerDeviceId: 'dev-local' });
  }, 'active');
  const exported = fixture.store.exportData();
  assert.equal(exported.ok, true);
  assert.equal(exported.data.checksum, Core.stableHash(exported.data.snapshot));
  const damaged = structuredClone(exported.data);
  damaged.snapshot.prefs.duration = 99;
  assert.equal(fixture.store.previewImport(damaged).reason, 'checksum-mismatch');

  const foreign = structuredClone(exported.data);
  foreign.snapshot.active = Core.createSession({ id: 'fs-remote', now: 2000, minutes: 30, mode: Core.MODE.SELF, ownerDeviceId: 'dev-remote' });
  foreign.checksum = Core.stableHash(foreign.snapshot);
  const imported = fixture.store.importData(foreign, 'replace');
  assert.equal(imported.ok, true);
  assert.equal(imported.snapshot.active, null);
  assert.equal(imported.snapshot.pendingTakeover.id, 'fs-remote');
  assert.ok(imported.preImportBackup);
});

test('import rejects duplicate IDs and dangling tree fields before writing', () => {
  const fixture = seededStore();
  fixture.store.load();
  assert.equal(fixture.store.previewImport({ schemaVersion: 2, trees: [{ id: 'x' }, { id: 'x' }] }).reason, 'duplicate-or-missing-trees-id');
  assert.equal(fixture.store.previewImport({
    schemaVersion: 2,
    fields: [{ id: 'fld-1' }],
    trees: [{ id: 'tr-1', fieldId: 'missing' }],
  }).reason, 'dangling-tree-field');
});

test('lease takeover increments epoch and changes fence while same owner renewal preserves both', () => {
  const fixture = seededStore();
  const first = fixture.store.claimLease('fs-1', 'tab-a', 'dev-a', false);
  assert.equal(first.ok, true);
  const renewal = fixture.store.renewLease('fs-1', 'tab-a', 'dev-a');
  assert.equal(renewal.lease.epoch, first.lease.epoch);
  assert.equal(renewal.lease.fenceToken, first.lease.fenceToken);
  fixture.setClock(30_000);
  const takeover = fixture.store.claimLease('fs-2', 'tab-b', 'dev-b', false);
  assert.equal(takeover.ok, true);
  assert.equal(takeover.lease.epoch, first.lease.epoch + 1);
  assert.notEqual(takeover.lease.fenceToken, first.lease.fenceToken);
});
