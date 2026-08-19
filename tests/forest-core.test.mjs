import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

process.env.TZ = 'America/New_York';
const require = createRequire(import.meta.url);
const Core = require('../assets/js/forest/core.js');

test('duration validation rejects stale-display values', () => {
  assert.deepEqual(Core.validateMinutes('', 1, 180), { ok: false, value: null, reason: 'required' });
  assert.equal(Core.validateMinutes(0, 1, 180).reason, 'range');
  assert.equal(Core.validateMinutes(1.5, 1, 180).reason, 'integer');
  assert.equal(Core.validateMinutes(181, 1, 180).reason, 'range');
  assert.deepEqual(Core.validateMinutes('30', 1, 180), { ok: true, value: 30, reason: null });
});

test('flexible focus cannot carry revival or cultivation targets', () => {
  assert.throws(() => Core.createSession({
    now: 1000,
    mode: Core.MODE.FLEXIBLE,
    target: { kind: 'revival', treeId: 'tr-1' },
  }), { code: 'ILLEGAL_MODE_TARGET' });
});

test('paused sessions stay paused across arbitrarily long gaps', () => {
  const session = Core.createSession({ now: 1000, minutes: 30, mode: Core.MODE.SELF });
  const paused = Core.pauseSession(session, 61_000);
  const decision = Core.resumeDecision(paused, 86_461_000);
  assert.equal(decision.action, 'restore-paused');
  assert.equal(decision.elapsedMs, 60_000);
  const resumed = Core.resumePausedSession(paused, 86_461_000);
  assert.equal(resumed.status, Core.STATUS.FOCUS);
  assert.equal(resumed.scheduledEndAt, 86_461_000 + 29 * 60_000);
});

test('strict completion wins when zero occurs inside the 15-second allowance', () => {
  const session = Core.createSession({ now: 0, minutes: 1, mode: Core.MODE.STRICT });
  const hidden = Core.markHidden(session, 55_000);
  const decision = Core.resumeDecision(hidden, 90_000);
  assert.equal(decision.action, 'complete');
  assert.equal(decision.completedAt, 60_000);
});

test('strict focus fails when away threshold occurs before completion', () => {
  const session = Core.createSession({ now: 0, minutes: 30, mode: Core.MODE.STRICT });
  const hidden = Core.markHidden(session, 60_000);
  const decision = Core.resumeDecision(hidden, 76_001);
  assert.equal(decision.action, 'fail-left-page');
  assert.equal(decision.failedAt, 75_000);
  assert.equal(decision.elapsedMs, 75_000);
});

test('strict and flexible recovery honor exact policy boundaries', () => {
  const strict = Core.markHidden(Core.createSession({ now: 0, minutes: 30, mode: Core.MODE.STRICT }), 60_000);
  assert.equal(Core.resumeDecision(strict, 74_999).action, 'resume-running');
  assert.equal(Core.resumeDecision(strict, 75_001).action, 'fail-left-page');
  const flexible = Core.heartbeat(Core.createSession({ now: 0, mode: Core.MODE.FLEXIBLE }), 60_000);
  assert.equal(Core.resumeDecision(flexible, 60_000 + 4 * 60_000 + 59_000).action, 'resume-running');
  assert.equal(Core.resumeDecision(flexible, 60_000 + 5 * 60_000 + 1_000).action, 'reconcile-flexible');
});

test('nullable hidden timestamps do not become the Unix epoch', () => {
  const session = Core.createSession({ now: 1_800_000_000_000, minutes: 30, mode: Core.MODE.STRICT });
  assert.equal(Core.resumeDecision(session, 1_800_000_001_000).action, 'resume-running');
  const visible = Core.markVisible(Core.markHidden(session, 1_800_000_001_000), 1_800_000_002_000);
  assert.equal(visible.hiddenAt, null);
});

test('pause removes a running deadline until the user resumes', () => {
  const session = Core.createSession({ now: 1000, minutes: 30, mode: Core.MODE.SELF });
  const paused = Core.pauseSession(session, 61_000);
  assert.equal(paused.scheduledEndAt, null);
  const resumed = Core.resumePausedSession(paused, 120_000);
  assert.equal(resumed.scheduledEndAt, 120_000 + 29 * 60_000);
});

test('self mode uses wall clock while break completion never auto-starts focus', () => {
  const focus = Core.createSession({ now: 0, minutes: 1, mode: Core.MODE.SELF });
  assert.equal(Core.resumeDecision(focus, 120_000).action, 'complete');
  const rest = Core.createSession({ now: 0, minutes: 5, phase: 'break' });
  assert.equal(Core.resumeDecision(rest, 301_000).action, 'break-complete');
});

test('flexible mode requires reconciliation after a long heartbeat gap', () => {
  const session = Core.createSession({ now: 0, mode: Core.MODE.FLEXIBLE });
  const beat = Core.heartbeat(session, 60_000);
  const decision = Core.resumeDecision(beat, 7 * 60_000);
  assert.equal(decision.action, 'reconcile-flexible');
  assert.equal(decision.stopAt, 60_000);
});

test('focus grace defaults to explicit confirmation while break may auto-start', () => {
  const focusGrace = Core.createGrace({ now: 0, nextPhase: 'focus' });
  const breakGrace = Core.createGrace({ now: 0, nextPhase: 'break' });
  assert.equal(focusGrace.autoStart, false);
  assert.equal(breakGrace.autoStart, true);
  assert.equal(Core.resumeDecision(focusGrace, 10_000).action, 'confirm-next-phase');
});

test('cultivation never makes an existing tree smaller', () => {
  assert.equal(Core.cultivationValue(100, 1), 100);
  assert.equal(Core.cultivationValue(100, 20), 108);
});

test('abandon text and effects share the 59.999 / 60.000 second boundary', () => {
  const early = Core.abandonOutcome({ elapsedMs: 59_999, plannedMinutes: 30 });
  assert.equal(early.createsTree, false);
  assert.match(early.message, /不会留下记录/);
  const recorded = Core.abandonOutcome({ elapsedMs: 60_000, plannedMinutes: 30 });
  assert.equal(recorded.createsTree, true);
  assert.equal(recorded.attemptedMinutes, 1);
  assert.match(recorded.message, /灌溉复活/);
  assert.equal(Core.abandonOutcome({ elapsedMs: 90_000, target: { kind: 'cultivate', treeId: 'tr-1' } }).targetUnchanged, true);
});

test('growth stages are stable and reduced-motion friendly', () => {
  assert.equal(Core.growthStage(0).key, 'sprout');
  assert.equal(Core.growthStage(0.1).key, 'seedling');
  assert.equal(Core.growthStage(0.35).key, 'leaves');
  assert.equal(Core.growthStage(0.65).key, 'branches');
  assert.equal(Core.growthStage(0.9).key, 'almost');
});

test('session history schema carries task, field, tree, outcome and stable timing', () => {
  const row = Core.makeSessionRecord({
    id: 'fr-1', sessionId: 'fs-1', treeId: 'tr-1', fieldId: 'fld-1', task: '写论文',
    minutes: 30, exp: 37.5, startTime: 1000, endTime: 1_801_000, outcome: 'planted', treeType: 'oak',
  });
  assert.equal(row.task, '写论文');
  assert.equal(row.fieldId, 'fld-1');
  assert.equal(row.treeId, 'tr-1');
  assert.equal(row.sessionId, 'fs-1');
  assert.equal(row.outcome, 'planted');
});

test('natural-day buckets respect 23-hour and 25-hour DST days', () => {
  const spring = Core.buildNaturalDayBuckets(5, new Date('2026-03-10T12:00:00-04:00').getTime());
  const springDay = spring.find((bucket) => bucket.key === '2026-03-08');
  assert.equal(springDay.endMs - springDay.startMs, 23 * 60 * 60 * 1000);
  const fall = Core.buildNaturalDayBuckets(5, new Date('2026-11-03T12:00:00-05:00').getTime());
  const fallDay = fall.find((bucket) => bucket.key === '2026-11-01');
  assert.equal(fallDay.endMs - fallDay.startMs, 25 * 60 * 60 * 1000);
});

test('immutable session merge rejects later rewrites while tombstones prevent revival', () => {
  const original = { id: 'fr-1', minutes: 30, endTime: 1000, updatedAt: 1000 };
  const rewritten = { id: 'fr-1', minutes: 999, endTime: 1000, updatedAt: 2000 };
  const merged = Core.mergeImmutableRecords([original], [rewritten], []);
  assert.equal(merged[0].minutes, 30);
  const deleted = Core.mergeImmutableRecords([original], [], [{ id: 'ts-1', entityId: 'fr-1', updatedAt: 3000 }]);
  assert.deepEqual(deleted, []);
});

test('sync tombstones persist while seven-day trash payloads expire', () => {
  const now = 20 * 24 * 60 * 60 * 1000;
  const tombstone = { id: 'tree:tr-1', entityId: 'tr-1', updatedAt: 1 };
  const oldTrash = { id: 'trash-1', entityId: 'tr-1', updatedAt: now - Core.UNDO_RETENTION_MS - 1 };
  const merged = Core.mergeSnapshots(
    Object.assign(Core.emptySnapshot(now), { tombstones: [tombstone], recentDeleted: [oldTrash] }),
    Core.emptySnapshot(now),
    now,
  );
  assert.equal(merged.tombstones.length, 1);
  assert.equal(merged.recentDeleted.length, 0);
});

test('lease epoch and fence token identify the only writer', () => {
  const lease = Core.makeLease({ sessionId: 'fs-1', ownerTabId: 'tab-a', ownerDeviceId: 'dev', now: 1000, epoch: 3, fenceToken: 'f-3' });
  assert.equal(Core.canClaimLease(lease, 'tab-b', 2000), false);
  assert.equal(Core.leaseMatches(lease, { id: 'fs-1', ownerTabId: 'tab-a', leaseEpoch: 3, fenceToken: 'f-3' }), true);
  assert.equal(Core.leaseMatches(lease, { id: 'fs-1', ownerTabId: 'tab-a', leaseEpoch: 2, fenceToken: 'f-2' }), false);
});

test('mobile projection never mutates canonical desktop coordinates', () => {
  const legacy = { row: 2, col: 5, offsetX: 3, offsetY: -2 };
  const projected = Core.projectPosition(legacy, 12, 4);
  assert.deepEqual(projected, { cell: 29, displayRow: 7, displayColumn: 1, offsetX: 3, offsetY: -2 });
  assert.deepEqual(legacy, { row: 2, col: 5, offsetX: 3, offsetY: -2 });
});
