(function (root, factory) {
  const api = factory(root && root.ForestCore);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ForestStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Core) {
  'use strict';

  if (!Core && typeof require === 'function') Core = require('./core.js');
  if (!Core) throw new Error('ForestCore is required before ForestStorage');

  const SNAPSHOT_KEY = 'tool.forest.v2';
  const LEASE_KEY = 'tool.forest.lease.v2';
  const DEVICE_KEY = 'tool.forest.device.v2';
  const LEGACY = Object.freeze({
    trees: 'tool.forest.trees.v1',
    sessions: 'tool.forest.sessions.v1',
    fields: 'tool.forest.fields.v1',
    activeFieldId: 'tool.forest.activeField.v1',
    prefs: 'tool.forest.prefs.v1',
    theme: 'tool.forest.theme.v1',
    active: 'tool.forest.active.v1',
    strict: 'tool.forest.strict.v1',
  });

  function memoryStorage() {
    const values = new Map();
    return {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); },
      key(index) { return Array.from(values.keys())[index] || null; },
      get length() { return values.size; },
    };
  }

  function createStore(storage, options) {
    const backend = storage || memoryStorage();
    const config = Object.assign({ mirrorLegacy: true, now: () => Date.now(), random: Math.random }, options || {});
    let cached = null;
    let lastError = null;
    let corrupt = null;
    const listeners = new Set();

    function emit(detail) {
      listeners.forEach((listener) => {
        try { listener(detail); } catch (_) {}
      });
    }

    function readRaw(key) {
      try {
        return { ok: true, value: backend.getItem(key) };
      } catch (error) {
        lastError = { operation: 'read', key, error };
        return { ok: false, error };
      }
    }

    function parseRaw(raw, key) {
      if (raw === null || raw === '') return { ok: true, value: null };
      try {
        return { ok: true, value: JSON.parse(raw) };
      } catch (error) {
        corrupt = { key, raw, error };
        lastError = { operation: 'parse', key, error };
        return { ok: false, error, raw };
      }
    }

    function readJson(key) {
      const raw = readRaw(key);
      if (!raw.ok) return raw;
      return parseRaw(raw.value, key);
    }

    function readLegacyArray(key) {
      const parsed = readJson(key);
      return parsed.ok && Array.isArray(parsed.value) ? parsed.value : [];
    }

    function readLegacyObject(key) {
      const parsed = readJson(key);
      return parsed.ok && parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value) ? parsed.value : null;
    }

    function ensureFields(snapshot, now) {
      if (snapshot.fields.length) {
        const valid = snapshot.fields.some((field) => field.id === snapshot.activeFieldId);
        if (!valid) snapshot.activeFieldId = snapshot.fields[0].id;
        return snapshot;
      }
      const id = Core.randomId('fld', now, config.random);
      snapshot.fields = [{ id, name: '我的田地', createdAt: new Date(now).toISOString(), updatedAt: now }];
      snapshot.activeFieldId = id;
      snapshot.trees.forEach((tree) => {
        if (!tree.fieldId) tree.fieldId = id;
      });
      return snapshot;
    }

    function migrateLegacy() {
      const now = config.now();
      const snapshot = Core.emptySnapshot(now);
      snapshot.trees = readLegacyArray(LEGACY.trees).map((tree) => {
        const item = Object.assign({}, tree);
        if (!item.updatedAt) item.updatedAt = Number(item.endTime) || now;
        return item;
      });
      snapshot.sessions = readLegacyArray(LEGACY.sessions).map((session, index) => Core.makeSessionRecord({
        id: session.id || Core.stableId('fr', [session.endTime, session.minutes, session.exp, session.type, index]),
        sessionId: session.sessionId,
        treeId: session.treeId,
        fieldId: session.fieldId,
        task: session.task,
        treeType: session.treeType || session.type,
        outcome: session.outcome || 'planted',
        minutes: session.minutes,
        exp: session.exp,
        startTime: session.startTime || (Number(session.endTime) - Number(session.minutes || 0) * 60000),
        endTime: session.endTime,
        updatedAt: session.updatedAt || session.endTime,
      }));
      snapshot.fields = readLegacyArray(LEGACY.fields).map((field) => Object.assign({ updatedAt: Date.parse(field.createdAt || '') || now }, field));
      const activeField = readRaw(LEGACY.activeFieldId);
      snapshot.activeFieldId = activeField.ok ? activeField.value : null;
      const prefs = readLegacyObject(LEGACY.prefs) || {};
      const strictRaw = readRaw(LEGACY.strict);
      snapshot.prefs = Object.assign(snapshot.prefs, prefs, {
        focusMode: strictRaw.ok && strictRaw.value === '1' ? Core.MODE.STRICT : Core.MODE.SELF,
      });
      snapshot.theme = Object.assign(snapshot.theme, readLegacyObject(LEGACY.theme) || {});
      const active = readLegacyObject(LEGACY.active);
      if (active) {
        const mode = active.flexible ? Core.MODE.FLEXIBLE : snapshot.prefs.focusMode;
        const durationMs = active.duration === null ? null : Number(active.duration);
        const legacyMeta = active._meta || {};
        const conflictingTargets = !!(legacyMeta.revivalTargetId && legacyMeta.cultivateTargetId);
        if (conflictingTargets) snapshot.pendingActivityConflict = {
          revivalTargetId: legacyMeta.revivalTargetId,
          cultivateTargetId: legacyMeta.cultivateTargetId,
          detectedAt: now,
        };
        snapshot.active = {
          id: active.id || Core.randomId('fs', active.startTime || now, config.random),
          status: active.paused ? Core.STATUS.PAUSED : active.isBreak ? Core.STATUS.BREAK : active.flexible ? Core.STATUS.FLEXIBLE : Core.STATUS.FOCUS,
          phase: active.isBreak ? 'break' : 'focus',
          mode,
          timingMode: active.flexible ? 'flexible' : 'fixed',
          focusPolicy: active.isBreak ? null : mode === Core.MODE.STRICT ? Core.MODE.STRICT : Core.MODE.SELF,
          startedAt: Number(active.startTime) || now,
          runningSince: active.paused ? null : Number(active.startTime) || now,
          elapsedBeforeRunMs: active.paused
            ? Math.max(0, Number(active.pausedAt || active.lastTick || now) - Number(active.startTime || now))
            : 0,
          durationMs,
          scheduledEndAt: active.paused || durationMs === null ? null : Number(active.startTime || now) + durationMs,
          pausedAt: active.paused ? Number(active.pausedAt || active.lastTick || now) : null,
          hiddenAt: null,
          lastSeenAt: Number(active.lastTick || active.startTime || now),
          task: active.task || '',
          fieldId: active.fieldId || snapshot.activeFieldId,
          treeType: active.treeType || 'oak',
          target: conflictingTargets ? null : legacyMeta.revivalTargetId
            ? { kind: 'revival', treeId: legacyMeta.revivalTargetId }
            : legacyMeta.cultivateTargetId
              ? { kind: 'cultivate', treeId: legacyMeta.cultivateTargetId }
              : null,
          chainId: active._meta && active._meta.currentChainId || null,
          cycleNumber: active._meta && active._meta.cycleCount || null,
          ownerTabId: active._tabId || null,
          ownerDeviceId: null,
          createdAt: new Date(Number(active.startTime) || now).toISOString(),
          updatedAt: Number(active.lastTick || now),
        };
      }
      ensureFields(snapshot, now);
      snapshot.trees.forEach((tree) => {
        if (!tree.fieldId) tree.fieldId = snapshot.activeFieldId;
      });
      snapshot.sessions.forEach((session) => {
        if (!session.fieldId) session.fieldId = snapshot.activeFieldId;
      });
      snapshot.revision = 1;
      snapshot.updatedAt = now;
      return Core.normalizeSnapshot(snapshot, now);
    }

    function load() {
      const parsed = readJson(SNAPSHOT_KEY);
      if (!parsed.ok) return { ok: false, error: lastError, corrupt, snapshot: cached };
      if (parsed.value) {
        if (Number(parsed.value.schemaVersion || 0) > Core.SCHEMA_VERSION) {
          lastError = { operation: 'schema', key: SNAPSHOT_KEY, code: 'UNSUPPORTED_FUTURE_SCHEMA', found: parsed.value.schemaVersion };
          return { ok: false, unsupported: true, error: lastError, snapshot: cached };
        }
        cached = ensureFields(Core.normalizeSnapshot(parsed.value, config.now()), config.now());
        return { ok: true, snapshot: cached, migrated: false };
      }
      cached = migrateLegacy();
      const result = save(cached, { reason: 'legacy-migration', expectedRevision: null });
      return Object.assign({}, result, { migrated: true });
    }

    function legacyActive(snapshot) {
      const session = snapshot.active;
      if (!session) return null;
      return {
        id: session.id,
        startTime: session.runningSince || session.startedAt,
        duration: session.durationMs,
        task: session.task,
        treeType: session.treeType,
        isBreak: session.phase === 'break',
        flexible: session.mode === Core.MODE.FLEXIBLE,
        lastTick: session.lastSeenAt,
        paused: session.status === Core.STATUS.PAUSED,
        pausedAt: session.pausedAt,
        _tabId: session.ownerTabId,
        _meta: {
          pomodoroOn: snapshot.prefs.pomodoroOn,
          cycleCount: session.cycleNumber || 0,
          currentChainId: session.chainId,
          revivalTargetId: session.target && session.target.kind === 'revival' ? session.target.treeId : null,
          cultivateTargetId: session.target && session.target.kind === 'cultivate' ? session.target.treeId : null,
          breakMin: snapshot.prefs.breakMin,
        },
      };
    }

    function writeLegacy(snapshot) {
      if (!config.mirrorLegacy) return;
      backend.setItem(LEGACY.trees, JSON.stringify(snapshot.trees));
      backend.setItem(LEGACY.sessions, JSON.stringify(snapshot.sessions));
      backend.setItem(LEGACY.fields, JSON.stringify(snapshot.fields));
      if (snapshot.activeFieldId) backend.setItem(LEGACY.activeFieldId, snapshot.activeFieldId);
      else backend.removeItem(LEGACY.activeFieldId);
      backend.setItem(LEGACY.prefs, JSON.stringify(Object.assign({}, snapshot.prefs, {
        flexible: snapshot.prefs.focusMode === Core.MODE.FLEXIBLE,
      })));
      backend.setItem(LEGACY.theme, JSON.stringify(snapshot.theme));
      backend.setItem(LEGACY.strict, snapshot.prefs.focusMode === Core.MODE.STRICT ? '1' : '0');
      const active = legacyActive(snapshot);
      if (active) backend.setItem(LEGACY.active, JSON.stringify(active));
      else backend.removeItem(LEGACY.active);
    }

    function save(snapshot, meta) {
      const now = config.now();
      const input = Core.normalizeSnapshot(snapshot, now);
      const current = readJson(SNAPSHOT_KEY);
      if (!current.ok) {
        return { ok: false, error: lastError, corrupt, snapshot: cached };
      }
      const currentRevision = current.value ? Number(current.value.revision || 0) : 0;
      const expected = meta && Object.prototype.hasOwnProperty.call(meta, 'expectedRevision') ? meta.expectedRevision : null;
      if (expected !== null && expected !== currentRevision) {
        return { ok: false, conflict: true, current: Core.normalizeSnapshot(current.value, now), snapshot: cached };
      }
      input.revision = Math.max(currentRevision, Number(input.revision || 0)) + 1;
      input.updatedAt = now;
      try {
        backend.setItem(SNAPSHOT_KEY, JSON.stringify(input));
        cached = input;
        lastError = null;
        let legacyMirrorError = null;
        try { writeLegacy(input); }
        catch (error) { legacyMirrorError = { operation: 'legacy-mirror', error }; }
        emit({ type: 'saved', reason: meta && meta.reason || 'save', snapshot: cached });
        return { ok: true, snapshot: cached, legacyMirrorError };
      } catch (error) {
        lastError = { operation: 'write', key: SNAPSHOT_KEY, error };
        emit({ type: 'error', error: lastError, snapshot: cached });
        return { ok: false, error: lastError, snapshot: cached };
      }
    }

    function mutate(mutator, reason) {
      if (!cached) {
        const loaded = load();
        if (!loaded.ok) return loaded;
      }
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const before = Core.normalizeSnapshot(cached, config.now());
        const draft = Core.normalizeSnapshot(before, config.now());
        const returned = mutator(draft);
        const next = Core.normalizeSnapshot(returned || draft, config.now());
        const result = save(next, { reason: reason || 'mutate', expectedRevision: before.revision });
        if (result.ok || !result.conflict) return result;
        cached = Core.mergeSnapshots(next, result.current, config.now());
      }
      return { ok: false, conflict: true, snapshot: cached };
    }

    function merge(remoteSnapshot, reason) {
      if (!cached) {
        const loaded = load();
        if (!loaded.ok) return loaded;
      }
      const merged = Core.mergeSnapshots(cached, remoteSnapshot, config.now());
      return save(merged, { reason: reason || 'merge', expectedRevision: null });
    }

    function exportData() {
      if (!cached) {
        const loaded = load();
        if (!loaded.ok) return loaded;
      }
      const data = {
        format: 'ruizhou-forest-backup',
        exportedAt: new Date(config.now()).toISOString(),
        schemaVersion: Core.SCHEMA_VERSION,
        snapshot: Core.normalizeSnapshot(cached, config.now()),
      };
      data.checksum = Core.stableHash(data.snapshot);
      return { ok: true, data, json: JSON.stringify(data, null, 2) };
    }

    function previewImport(value) {
      let parsed = value;
      try {
        if (typeof value === 'string') parsed = JSON.parse(value);
      } catch (error) {
        return { ok: false, reason: 'invalid-json', error };
      }
      const candidate = parsed && parsed.format === 'ruizhou-forest-backup' ? parsed.snapshot : parsed;
      if (!candidate || typeof candidate !== 'object') return { ok: false, reason: 'invalid-shape' };
      if (Number(candidate.schemaVersion || 0) > Core.SCHEMA_VERSION) return { ok: false, reason: 'future-schema' };
      for (const key of ['trees', 'sessions', 'fields']) {
        if (candidate[key] !== undefined && !Array.isArray(candidate[key])) return { ok: false, reason: `invalid-${key}` };
        const ids = new Set();
        for (const item of candidate[key] || []) {
          if (!item || !item.id || ids.has(String(item.id))) return { ok: false, reason: `duplicate-or-missing-${key}-id` };
          ids.add(String(item.id));
        }
      }
      const fieldIds = new Set((candidate.fields || []).map((field) => String(field.id)));
      if (fieldIds.size && (candidate.trees || []).some((tree) => tree.fieldId && !fieldIds.has(String(tree.fieldId)))) {
        return { ok: false, reason: 'dangling-tree-field' };
      }
      if (parsed && parsed.format === 'ruizhou-forest-backup' && parsed.checksum) {
        const actual = Core.stableHash(candidate);
        if (actual !== parsed.checksum) return { ok: false, reason: 'checksum-mismatch', expected: parsed.checksum, actual };
      }
      const incoming = Core.normalizeSnapshot(candidate, config.now());
      if (!cached) {
        const loaded = load();
        if (!loaded.ok) return loaded;
      }
      const merged = Core.mergeSnapshots(cached, incoming, config.now());
      return {
        ok: true,
        incoming,
        merged,
        diff: {
          trees: incoming.trees.length - cached.trees.length,
          sessions: incoming.sessions.length - cached.sessions.length,
          fields: incoming.fields.length - cached.fields.length,
        },
      };
    }

    function importData(value, strategy) {
      const preview = previewImport(value);
      if (!preview.ok) return preview;
      const backup = exportData();
      const next = strategy === 'replace'
        ? Object.assign({}, preview.incoming, { active: null, pendingTakeover: preview.incoming.active || null })
        : preview.merged;
      const saved = save(next, { reason: `import-${strategy === 'replace' ? 'replace' : 'merge'}`, expectedRevision: null });
      return Object.assign({}, saved, { preImportBackup: backup.ok ? backup : null });
    }

    function getDeviceId() {
      const current = readRaw(DEVICE_KEY);
      if (current.ok && current.value) return current.value;
      const id = Core.randomId('fd', config.now(), config.random);
      try { backend.setItem(DEVICE_KEY, id); } catch (_) {}
      return id;
    }

    function readLease() {
      const parsed = readJson(LEASE_KEY);
      return parsed.ok && parsed.value && typeof parsed.value === 'object' ? parsed.value : null;
    }

    function claimLease(sessionId, ownerTabId, ownerDeviceId, force) {
      const now = config.now();
      const current = readLease();
      if (!force && !Core.canClaimLease(current, ownerTabId, now)) {
        return { ok: false, owner: current };
      }
      const sameOwner = current && current.sessionId === String(sessionId || '') && current.ownerTabId === String(ownerTabId || '');
      const lease = Core.makeLease({
        sessionId,
        ownerTabId,
        ownerDeviceId,
        now,
        epoch: sameOwner ? Number(current.epoch || 1) : Number(current && current.epoch || 0) + 1,
        fenceToken: sameOwner ? current.fenceToken : null,
        random: config.random,
      });
      try {
        backend.setItem(LEASE_KEY, JSON.stringify(lease));
        const verify = readLease();
        if (!verify || verify.ownerTabId !== ownerTabId || verify.sessionId !== String(sessionId || '')) {
          return { ok: false, owner: verify };
        }
        return { ok: true, lease: verify };
      } catch (error) {
        lastError = { operation: 'lease-write', key: LEASE_KEY, error };
        return { ok: false, error: lastError };
      }
    }

    function renewLease(sessionId, ownerTabId, ownerDeviceId) {
      const current = readLease();
      const now = config.now();
      if (!current || current.sessionId !== String(sessionId || '') || current.ownerTabId !== String(ownerTabId || '')) {
        return { ok: false, owner: current };
      }
      return claimLease(sessionId, ownerTabId, ownerDeviceId, true);
    }

    function releaseLease(sessionId, ownerTabId) {
      const current = readLease();
      if (!current) return { ok: true };
      if (current.sessionId !== String(sessionId || '') || current.ownerTabId !== String(ownerTabId || '')) {
        return { ok: false, owner: current };
      }
      try { backend.removeItem(LEASE_KEY); return { ok: true }; }
      catch (error) { return { ok: false, error }; }
    }

    function recoverCorruptRaw() {
      return corrupt ? { key: corrupt.key, raw: corrupt.raw } : null;
    }

    function subscribe(listener) {
      listeners.add(listener);
      return function unsubscribe() { listeners.delete(listener); };
    }

    return Object.freeze({
      load,
      save,
      mutate,
      merge,
      exportData,
      previewImport,
      importData,
      getDeviceId,
      readLease,
      claimLease,
      renewLease,
      releaseLease,
      recoverCorruptRaw,
      subscribe,
      get snapshot() { return cached; },
      get lastError() { return lastError; },
    });
  }

  return Object.freeze({ SNAPSHOT_KEY, LEASE_KEY, DEVICE_KEY, LEGACY, createStore, memoryStorage });
});
