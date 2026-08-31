(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ForestCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 2;
  const STRICT_AWAY_LIMIT_MS = 15 * 1000;
  const FLEX_RECONCILE_MS = 5 * 60 * 1000;
  const LEASE_MS = 12 * 1000;
  const UNDO_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

  const STATUS = Object.freeze({
    IDLE: 'idle',
    FOCUS: 'focus',
    FLEXIBLE: 'flexible-focus',
    BREAK: 'break',
    PAUSED: 'paused',
    GRACE: 'grace',
    REVIVAL_QUEUED: 'revival-queued',
    CULTIVATE_QUEUED: 'cultivate-queued',
  });

  const MODE = Object.freeze({
    STRICT: 'strict',
    SELF: 'self',
    FLEXIBLE: 'flexible',
  });

  function finiteNumber(value, fallback) {
    if (value === null || value === '' || typeof value === 'undefined') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function randomId(prefix, now, random) {
    const timestamp = finiteNumber(now, Date.now());
    const entropy = typeof random === 'function' ? random() : Math.random();
    return `${prefix}-${timestamp.toString(36)}-${Math.floor(entropy * 0xffffff).toString(36).padStart(4, '0')}`;
  }

  function stableSerialize(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }

  function stableHash(value) {
    const text = typeof value === 'string' ? value : stableSerialize(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function stableId(prefix, value) {
    return `${prefix}-${stableHash(value)}`;
  }

  function validateMinutes(value, min, max) {
    const lower = finiteNumber(min, 1);
    const upper = finiteNumber(max, 180);
    if (value === '' || value === null || typeof value === 'undefined') {
      return { ok: false, value: null, reason: 'required' };
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return { ok: false, value: null, reason: 'number' };
    if (!Number.isInteger(number)) return { ok: false, value: number, reason: 'integer' };
    if (number < lower || number > upper) return { ok: false, value: number, reason: 'range' };
    return { ok: true, value: number, reason: null };
  }

  function normalizeMode(value) {
    if (value === MODE.STRICT || value === MODE.SELF || value === MODE.FLEXIBLE) return value;
    return MODE.SELF;
  }

  function normalizeStatus(value) {
    return Object.values(STATUS).includes(value) ? value : STATUS.IDLE;
  }

  function normalizeTarget(target) {
    if (!target || typeof target !== 'object') return null;
    if (target.kind !== 'revival' && target.kind !== 'cultivate') return null;
    if (!target.treeId) return null;
    return { kind: target.kind, treeId: String(target.treeId) };
  }

  function createSession(options) {
    const input = options || {};
    const now = finiteNumber(input.now, Date.now());
    const phase = input.phase === 'break' ? 'break' : 'focus';
    const mode = phase === 'break' ? MODE.SELF : normalizeMode(input.mode);
    const timingMode = input.timingMode === 'flexible' || mode === MODE.FLEXIBLE ? 'flexible' : 'fixed';
    const focusPolicy = phase === 'break' ? null : input.focusPolicy === MODE.STRICT || mode === MODE.STRICT ? MODE.STRICT : MODE.SELF;
    const minutesResult = validateMinutes(input.minutes, 1, phase === 'break' ? 60 : 180);
    if (timingMode !== 'flexible' && !minutesResult.ok) {
      const error = new Error(`invalid duration: ${minutesResult.reason}`);
      error.code = 'INVALID_DURATION';
      throw error;
    }
    const durationMs = timingMode === 'flexible' ? null : minutesResult.value * 60 * 1000;
    const target = normalizeTarget(input.target);
    if (timingMode === 'flexible' && target) {
      const error = new Error('flexible mode cannot be combined with a tree target');
      error.code = 'ILLEGAL_MODE_TARGET';
      throw error;
    }
    const status = phase === 'break'
      ? STATUS.BREAK
      : timingMode === 'flexible'
        ? STATUS.FLEXIBLE
        : STATUS.FOCUS;
    return {
      id: input.id || randomId('fs', now, input.random),
      status,
      phase,
      mode,
      timingMode,
      focusPolicy,
      startedAt: now,
      runningSince: now,
      elapsedBeforeRunMs: 0,
      durationMs,
      scheduledEndAt: durationMs === null ? null : now + durationMs,
      pausedAt: null,
      hiddenAt: null,
      lastSeenAt: now,
      task: String(input.task || '').trim().slice(0, 60),
      fieldId: input.fieldId ? String(input.fieldId) : null,
      treeType: timingMode === 'flexible' ? 'pine' : String(input.treeType || 'oak'),
      target,
      chainId: input.chainId || null,
      cycleNumber: finiteNumber(input.cycleNumber, null),
      ownerTabId: input.ownerTabId || null,
      ownerDeviceId: input.ownerDeviceId || null,
      createdAt: new Date(now).toISOString(),
      updatedAt: now,
    };
  }

  function elapsedMs(session, now) {
    if (!session) return 0;
    const time = finiteNumber(now, Date.now());
    const base = Math.max(0, finiteNumber(session.elapsedBeforeRunMs, 0));
    if (session.status === STATUS.PAUSED || !Number.isFinite(Number(session.runningSince))) return base;
    return base + Math.max(0, time - Number(session.runningSince));
  }

  function remainingMs(session, now) {
    if (!session || session.durationMs === null) return null;
    return Math.max(0, Number(session.durationMs) - elapsedMs(session, now));
  }

  function pauseSession(session, now) {
    if (!session || session.phase !== 'focus' || session.timingMode === 'flexible' || session.mode === MODE.FLEXIBLE) return session;
    if (session.status === STATUS.PAUSED) return Object.assign({}, session);
    const time = finiteNumber(now, Date.now());
    return Object.assign({}, session, {
      status: STATUS.PAUSED,
      elapsedBeforeRunMs: elapsedMs(session, time),
      runningSince: null,
      scheduledEndAt: null,
      pausedAt: time,
      hiddenAt: null,
      lastSeenAt: time,
      updatedAt: time,
    });
  }

  function resumePausedSession(session, now) {
    if (!session || session.status !== STATUS.PAUSED) return session;
    const time = finiteNumber(now, Date.now());
    return Object.assign({}, session, {
      status: session.phase === 'break'
        ? STATUS.BREAK
        : session.mode === MODE.FLEXIBLE ? STATUS.FLEXIBLE : STATUS.FOCUS,
      runningSince: time,
      pausedAt: null,
      hiddenAt: null,
      lastSeenAt: time,
      scheduledEndAt: session.durationMs === null
        ? null
        : time + Math.max(0, Number(session.durationMs) - finiteNumber(session.elapsedBeforeRunMs, 0)),
      updatedAt: time,
    });
  }

  function markHidden(session, now) {
    if (!session || session.status === STATUS.PAUSED) return session;
    const time = finiteNumber(now, Date.now());
    return Object.assign({}, session, { hiddenAt: time, lastSeenAt: time, updatedAt: time });
  }

  function markVisible(session, now) {
    if (!session) return session;
    const time = finiteNumber(now, Date.now());
    return Object.assign({}, session, { hiddenAt: null, lastSeenAt: time, updatedAt: time });
  }

  function heartbeat(session, now) {
    if (!session) return session;
    const time = finiteNumber(now, Date.now());
    return Object.assign({}, session, { lastSeenAt: time, updatedAt: time });
  }

  function resumeDecision(session, now) {
    if (!session) return { action: 'none', elapsedMs: 0 };
    const time = finiteNumber(now, Date.now());
    const elapsed = elapsedMs(session, time);
    if (session.status === STATUS.PAUSED) {
      return { action: 'restore-paused', elapsedMs: finiteNumber(session.elapsedBeforeRunMs, 0) };
    }
    if (session.status === STATUS.GRACE) {
      return { action: 'confirm-next-phase', nextPhase: session.nextPhase || 'focus' };
    }
    if (session.phase === 'break') {
      return elapsed >= finiteNumber(session.durationMs, Infinity)
        ? { action: 'break-complete', elapsedMs: elapsed }
        : { action: 'resume-running', elapsedMs: elapsed };
    }
    if (session.timingMode === 'flexible' || session.mode === MODE.FLEXIBLE) {
      const gap = Math.max(0, time - finiteNumber(session.lastSeenAt, session.startedAt));
      return gap > FLEX_RECONCILE_MS
        ? { action: 'reconcile-flexible', elapsedMs: elapsed, gapMs: gap, stopAt: session.lastSeenAt }
        : { action: 'resume-running', elapsedMs: elapsed, gapMs: gap };
    }
    if (session.focusPolicy === MODE.STRICT || session.mode === MODE.STRICT) {
      const awayFrom = finiteNumber(session.hiddenAt, session.lastSeenAt);
      const awayMs = Math.max(0, time - awayFrom);
      const completionAt = finiteNumber(session.scheduledEndAt, Infinity);
      // A strict session that naturally reached zero inside the 15-second allowance
      // completes before the away violation can occur. Event ordering must be stable
      // even when the browser wakes long after both deadlines have passed.
      if (completionAt <= awayFrom + STRICT_AWAY_LIMIT_MS && time >= completionAt) {
        return { action: 'complete', elapsedMs: Math.min(elapsed, finiteNumber(session.durationMs, elapsed)), completedAt: completionAt };
      }
      if (awayMs > STRICT_AWAY_LIMIT_MS) {
        const failedAt = awayFrom + STRICT_AWAY_LIMIT_MS;
        return {
          action: 'fail-left-page',
          elapsedMs: Math.min(elapsedMs(session, failedAt), finiteNumber(session.durationMs, Infinity)),
          awayMs,
          failedAt,
        };
      }
    }
    return elapsed >= finiteNumber(session.durationMs, Infinity)
      ? { action: 'complete', elapsedMs: elapsed, completedAt: finiteNumber(session.scheduledEndAt, time) }
      : { action: 'resume-running', elapsedMs: elapsed };
  }

  function createGrace(options) {
    const input = options || {};
    const now = finiteNumber(input.now, Date.now());
    return {
      id: input.id || randomId('fg', now, input.random),
      status: STATUS.GRACE,
      phase: 'grace',
      nextPhase: input.nextPhase === 'break' ? 'break' : 'focus',
      nextStartAt: now + clamp(finiteNumber(input.delayMs, 5000), 0, 60000),
      autoStart: input.nextPhase === 'break' ? input.autoStart !== false : input.autoStart === true,
      chainId: input.chainId || null,
      cycleNumber: finiteNumber(input.cycleNumber, null),
      updatedAt: now,
    };
  }

  function cultivationValue(before, minutes) {
    const oldValue = Math.max(0, finiteNumber(before, 0));
    const added = Math.max(0, finiteNumber(minutes, 0));
    return Math.max(oldValue, Math.round((oldValue + added) * 0.9));
  }

  function abandonOutcome(input) {
    const source = input || {};
    const elapsed = Math.max(0, finiteNumber(source.elapsedMs, 0));
    const target = normalizeTarget(source.target);
    if (source.phase === 'break') return { kind: 'break-ended', createsTree: false, message: '休息提前结束，循环已停止' };
    if (target) {
      return {
        kind: `${target.kind}-interrupted`,
        createsTree: false,
        targetUnchanged: true,
        message: target.kind === 'revival' ? '灌溉中断，枯树保持原状' : '培养中断，目标树保持原状',
      };
    }
    if (elapsed < 60_000) return { kind: 'discarded', createsTree: false, message: '结束本次？未满 1 分钟，不会留下记录。' };
    return {
      kind: 'withered',
      createsTree: true,
      attemptedMinutes: round1(elapsed / 60000),
      message: `结束本次？会留下一棵枯树，之后可用 ${Math.max(1, Math.round(finiteNumber(source.plannedMinutes, elapsed / 60000)))} 分钟专注灌溉复活。`,
    };
  }

  function growthStage(progress) {
    const value = clamp(finiteNumber(progress, 0), 0, 1);
    if (value >= 0.9) return { key: 'almost', label: '将成树', visualProgress: 0.9 };
    if (value >= 0.65) return { key: 'branches', label: '正在展枝', visualProgress: 0.65 };
    if (value >= 0.35) return { key: 'leaves', label: '长出新叶', visualProgress: 0.35 };
    if (value >= 0.1) return { key: 'seedling', label: '长成幼苗', visualProgress: 0.1 };
    return { key: 'sprout', label: '正在发芽', visualProgress: 0.04 };
  }

  function completionView(input) {
    const source = input || {};
    const endedAt = finiteNumber(source.endedAt, Date.now());
    return {
      sessionId: source.sessionId || null,
      treeId: source.treeId || null,
      task: String(source.task || '').trim(),
      fieldId: source.fieldId || null,
      fieldName: source.fieldName || '',
      treeType: source.treeType || 'oak',
      grade: String(source.grade || ''),
      minutes: round1(Math.max(0, finiteNumber(source.minutes, 0))),
      exp: round1(Math.max(0, finiteNumber(source.exp, 0))),
      outcome: source.outcome || 'planted',
      levelBefore: finiteNumber(source.levelBefore, null),
      levelAfter: finiteNumber(source.levelAfter, null),
      endedAt,
      updatedAt: endedAt,
    };
  }

  function scheduledCompletion(session, fallbackNow) {
    if (!session) return finiteNumber(fallbackNow, Date.now());
    return finiteNumber(session.scheduledEndAt, finiteNumber(fallbackNow, Date.now()));
  }

  function makeSessionRecord(input) {
    const source = input || {};
    const now = finiteNumber(source.endTime, Date.now());
    const treeType = String(source.treeType || source.type || 'oak');
    return {
      id: source.id || randomId('fr', now, source.random),
      sessionId: source.sessionId || null,
      treeId: source.treeId || null,
      fieldId: source.fieldId || null,
      task: String(source.task || '').trim().slice(0, 60),
      treeType,
      type: treeType,
      outcome: source.outcome || 'planted',
      minutes: round1(Math.max(0, finiteNumber(source.minutes, 0))),
      exp: round1(Math.max(0, finiteNumber(source.exp, 0))),
      startTime: finiteNumber(source.startTime, now),
      endTime: now,
      createdAt: source.createdAt || new Date(now).toISOString(),
      updatedAt: finiteNumber(source.updatedAt, now),
    };
  }

  function startOfLocalDay(timestamp) {
    const date = new Date(finiteNumber(timestamp, Date.now()));
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function buildNaturalDayBuckets(days, now) {
    const count = clamp(Math.floor(finiteNumber(days, 7)), 1, 366);
    const endDay = startOfLocalDay(now);
    const buckets = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const start = new Date(endDay);
      start.setDate(endDay.getDate() - offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      const month = start.getMonth() + 1;
      const day = start.getDate();
      buckets.push({
        key: `${start.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        label: `${month}/${day}`,
        startMs: start.getTime(),
        endMs: end.getTime(),
        exp: 0,
        count: 0,
        minutes: 0,
      });
    }
    return buckets;
  }

  function bucketSessions(sessions, days, now) {
    const buckets = buildNaturalDayBuckets(days, now);
    (Array.isArray(sessions) ? sessions : []).forEach((session) => {
      const time = finiteNumber(session.endTime, NaN);
      if (!Number.isFinite(time)) return;
      const bucket = buckets.find((item) => time >= item.startMs && time < item.endMs);
      if (!bucket) return;
      bucket.count += 1;
      bucket.exp += Math.max(0, finiteNumber(session.exp, 0));
      bucket.minutes += Math.max(0, finiteNumber(session.minutes, 0));
    });
    return buckets;
  }

  function copy(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function recordTimestamp(record) {
    if (!record || typeof record !== 'object') return 0;
    return finiteNumber(record.updatedAt, finiteNumber(Date.parse(record.createdAt || ''), finiteNumber(record.endTime, 0)));
  }

  function mergeRecords(localRecords, remoteRecords, tombstones) {
    const map = new Map();
    const removed = new Map();
    (Array.isArray(tombstones) ? tombstones : []).forEach((item) => {
      if (item && item.entityId) removed.set(String(item.entityId), Math.max(removed.get(String(item.entityId)) || 0, recordTimestamp(item)));
    });
    [localRecords, remoteRecords].forEach((records) => {
      (Array.isArray(records) ? records : []).forEach((record) => {
        if (!record || !record.id) return;
        const id = String(record.id);
        if ((removed.get(id) || 0) >= recordTimestamp(record)) return;
        const previous = map.get(id);
        if (!previous || recordTimestamp(record) >= recordTimestamp(previous)) map.set(id, copy(record));
      });
    });
    return Array.from(map.values());
  }

  function mergeImmutableRecords(localRecords, remoteRecords, tombstones) {
    const map = new Map();
    const removed = new Map();
    (Array.isArray(tombstones) ? tombstones : []).forEach((item) => {
      if (item && item.entityId) removed.set(String(item.entityId), Math.max(removed.get(String(item.entityId)) || 0, recordTimestamp(item)));
    });
    [localRecords, remoteRecords].forEach((records) => {
      (Array.isArray(records) ? records : []).forEach((record) => {
        if (!record || !record.id) return;
        const id = String(record.id);
        if ((removed.get(id) || 0) >= recordTimestamp(record)) return;
        const previous = map.get(id);
        if (!previous) {
          map.set(id, copy(record));
          return;
        }
        // Session rows are append-only. If the same ID disagrees, keep the
        // earliest authored payload so a later device cannot rewrite history.
        if (recordTimestamp(record) < recordTimestamp(previous)) map.set(id, copy(record));
      });
    });
    return Array.from(map.values());
  }

  function mergeTombstones(localItems, remoteItems) {
    const map = new Map();
    [localItems, remoteItems].forEach((items) => {
      (Array.isArray(items) ? items : []).forEach((item) => {
        if (!item || !item.id) return;
        const previous = map.get(String(item.id));
        if (!previous || recordTimestamp(item) >= recordTimestamp(previous)) map.set(String(item.id), copy(item));
      });
    });
    return Array.from(map.values());
  }

  function emptySnapshot(now) {
    const time = finiteNumber(now, Date.now());
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      updatedAt: time,
      trees: [],
      sessions: [],
      fields: [],
      activeFieldId: null,
      prefs: {
        treeType: 'oak',
        duration: 30,
        breakMin: 5,
        pomodoroOn: false,
        autoStartBreak: true,
        autoStartFocus: false,
        focusMode: MODE.SELF,
        wakeLock: true,
        sound: false,
        vibration: false,
        notifications: false,
      },
      theme: { background: 'auto', timer: 'countdown', visualVersion: 3 },
      active: null,
      activity: null,
      pendingTakeover: null,
      lastCompletion: null,
      tombstones: [],
      recentDeleted: [],
    };
  }

  function normalizeSnapshot(snapshot, now) {
    const base = emptySnapshot(now);
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const result = Object.assign(base, copy(source));
    result.schemaVersion = SCHEMA_VERSION;
    result.revision = Math.max(0, Math.floor(finiteNumber(source.revision, 0)));
    result.updatedAt = finiteNumber(source.updatedAt, finiteNumber(now, Date.now()));
    result.trees = Array.isArray(source.trees) ? copy(source.trees) : [];
    result.sessions = Array.isArray(source.sessions) ? source.sessions.map((session, index) => makeSessionRecord(Object.assign({
      id: session && session.id ? session.id : stableId('fr', [session && session.endTime, session && session.minutes, session && session.exp, session && (session.treeType || session.type), index]),
    }, session || {}))) : [];
    result.fields = Array.isArray(source.fields) ? copy(source.fields) : [];
    result.tombstones = Array.isArray(source.tombstones) ? copy(source.tombstones) : [];
    result.recentDeleted = Array.isArray(source.recentDeleted) ? copy(source.recentDeleted) : [];
    result.prefs = Object.assign({}, base.prefs, source.prefs || {});
    result.prefs.focusMode = normalizeMode(result.prefs.focusMode);
    result.theme = Object.assign({}, base.theme, source.theme || {});
    result.active = source.active && typeof source.active === 'object' ? copy(source.active) : null;
    result.activity = source.activity && typeof source.activity === 'object' ? copy(source.activity) : null;
    result.pendingTakeover = source.pendingTakeover && typeof source.pendingTakeover === 'object' ? copy(source.pendingTakeover) : null;
    result.lastCompletion = source.lastCompletion && typeof source.lastCompletion === 'object' ? copy(source.lastCompletion) : null;
    return result;
  }

  function mergeSnapshots(localSnapshot, remoteSnapshot, now) {
    const time = finiteNumber(now, Date.now());
    const local = normalizeSnapshot(localSnapshot, time);
    const remote = normalizeSnapshot(remoteSnapshot, time);
    const localWins = local.updatedAt >= remote.updatedAt;
    const tombstones = mergeTombstones(local.tombstones, remote.tombstones);
    const allTombstones = tombstones.concat(local.tombstones || [], remote.tombstones || []);
    const merged = emptySnapshot(time);
    merged.revision = Math.max(local.revision, remote.revision) + 1;
    merged.updatedAt = time;
    merged.tombstones = tombstones;
    merged.trees = mergeRecords(local.trees, remote.trees, allTombstones);
    merged.sessions = mergeImmutableRecords(local.sessions, remote.sessions, allTombstones);
    merged.fields = mergeRecords(local.fields, remote.fields, allTombstones);
    merged.prefs = copy((localWins ? local : remote).prefs);
    merged.theme = copy((localWins ? local : remote).theme);
    merged.activeFieldId = (localWins ? local : remote).activeFieldId;
    merged.activity = copy((localWins ? local : remote).activity);
    merged.lastCompletion = copy((recordTimestamp(local.lastCompletion) >= recordTimestamp(remote.lastCompletion) ? local : remote).lastCompletion);
    const localActiveTime = recordTimestamp(local.active);
    const remoteActiveTime = recordTimestamp(remote.active);
    if (local.active && remote.active && String(local.active.id || '') !== String(remote.active.id || '')) {
      merged.active = copy(local.active);
      merged.pendingTakeover = copy(remoteActiveTime >= localActiveTime ? remote.active : remote.pendingTakeover);
    } else {
      merged.active = copy(localActiveTime >= remoteActiveTime ? local.active : remote.active);
      merged.pendingTakeover = copy((localWins ? local : remote).pendingTakeover);
    }
    const cutoff = time - UNDO_RETENTION_MS;
    merged.recentDeleted = mergeTombstones(local.recentDeleted, remote.recentDeleted)
      .filter((item) => recordTimestamp(item) >= cutoff);
    return merged;
  }

  function makeLease(options) {
    const input = options || {};
    const now = finiteNumber(input.now, Date.now());
    return {
      sessionId: String(input.sessionId || ''),
      ownerTabId: String(input.ownerTabId || ''),
      ownerDeviceId: String(input.ownerDeviceId || ''),
      epoch: Math.max(1, Math.floor(finiteNumber(input.epoch, 1))),
      fenceToken: String(input.fenceToken || randomId('ff', now, input.random)),
      leaseUntil: now + clamp(finiteNumber(input.durationMs, LEASE_MS), 1000, 60000),
      updatedAt: now,
    };
  }

  function leaseOwner(lease, now) {
    if (!lease || !lease.ownerTabId) return null;
    return finiteNumber(lease.leaseUntil, 0) > finiteNumber(now, Date.now()) ? lease.ownerTabId : null;
  }

  function canClaimLease(lease, claimant, now) {
    const owner = leaseOwner(lease, now);
    return !owner || owner === claimant;
  }

  function leaseMatches(lease, session) {
    if (!lease || !session) return false;
    return String(lease.sessionId || '') === String(session.id || session.sessionId || '')
      && String(lease.ownerTabId || '') === String(session.ownerTabId || '')
      && String(lease.fenceToken || '') === String(session.fenceToken || '')
      && Number(lease.epoch || 0) === Number(session.leaseEpoch || 0);
  }

  function canonicalPosition(position, columns) {
    const cols = Math.max(1, Math.floor(finiteNumber(columns, 12)));
    const source = position && typeof position === 'object' ? position : {};
    const legacyCell = Math.max(0, Math.floor(finiteNumber(source.row, 0))) * cols
      + Math.max(0, Math.floor(finiteNumber(source.col, finiteNumber(source.column, 0))));
    const cell = Math.max(0, Math.floor(finiteNumber(source.cell, legacyCell)));
    return { row: Math.floor(cell / cols), column: cell % cols, offsetX: finiteNumber(source.offsetX, 0), offsetY: finiteNumber(source.offsetY, 0) };
  }

  function projectPosition(position, canonicalColumns, displayColumns) {
    const source = canonicalPosition(position, canonicalColumns);
    const canonicalCell = source.row * Math.max(1, canonicalColumns) + source.column;
    const cols = Math.max(1, Math.floor(finiteNumber(displayColumns, canonicalColumns)));
    return {
      cell: canonicalCell,
      displayRow: Math.floor(canonicalCell / cols),
      displayColumn: canonicalCell % cols,
      offsetX: source.offsetX,
      offsetY: source.offsetY,
    };
  }

  function consolidateSingleField(fields, trees, fallbackField) {
    const sourceFields = Array.isArray(fields) ? fields : [];
    const sourceTrees = Array.isArray(trees) ? trees : [];
    const fallback = fallbackField && fallbackField.id
      ? copy(fallbackField)
      : { id: stableId('fld', ['single-field']), name: '我的田地', createdAt: new Date(0).toISOString() };
    const primary = copy(sourceFields[0] || fallback);
    const retiredFieldIds = sourceFields.slice(1).map((field) => String(field.id || '')).filter(Boolean);
    let treesChanged = false;
    const nextTrees = sourceTrees.map((tree) => {
      if (tree && tree.fieldId === primary.id) return tree;
      const moved = copy(tree || {});
      moved.fieldId = primary.id;
      delete moved.position;
      delete moved.position3d;
      treesChanged = true;
      return moved;
    });
    return {
      fields: [primary],
      trees: nextTrees,
      activeFieldId: primary.id,
      retiredFieldIds,
      fieldsChanged: sourceFields.length !== 1 || !sourceFields[0] || sourceFields[0].id !== primary.id,
      treesChanged,
    };
  }

  return Object.freeze({
    SCHEMA_VERSION,
    STRICT_AWAY_LIMIT_MS,
    FLEX_RECONCILE_MS,
    LEASE_MS,
    UNDO_RETENTION_MS,
    STATUS,
    MODE,
    validateMinutes,
    normalizeMode,
    normalizeStatus,
    createSession,
    elapsedMs,
    remainingMs,
    pauseSession,
    resumePausedSession,
    markHidden,
    markVisible,
    heartbeat,
    resumeDecision,
    createGrace,
    cultivationValue,
    abandonOutcome,
    growthStage,
    completionView,
    scheduledCompletion,
    makeSessionRecord,
    buildNaturalDayBuckets,
    bucketSessions,
    emptySnapshot,
    normalizeSnapshot,
    mergeRecords,
    mergeImmutableRecords,
    mergeSnapshots,
    makeLease,
    leaseOwner,
    canClaimLease,
    leaseMatches,
    canonicalPosition,
    projectPosition,
    consolidateSingleField,
    randomId,
    stableSerialize,
    stableHash,
    stableId,
  });
});
