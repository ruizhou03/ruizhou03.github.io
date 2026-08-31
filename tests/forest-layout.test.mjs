import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Layout = require('../assets/js/forest/layout.js');

test('world depth projects farther trees smaller and behind nearer trees', () => {
  const far = Layout.projectToAsset('forest', { u: 0.5, v: 0.15, seed: 1 });
  const near = Layout.projectToAsset('forest', { u: 0.5, v: 0.85, seed: 2 });
  assert.ok(far.y < near.y);
  assert.ok(far.scale < near.scale);
  assert.ok(far.zIndex < near.zIndex);
});

test('canonical positions are real x/y/z world coordinates with a soil plane', () => {
  const legacy = Layout.normalizeWorldPosition({ u: 0.75, v: 0.4, seed: 7 });
  assert.equal(legacy.version, 2);
  assert.equal(legacy.x, 0.5);
  assert.equal(legacy.y, 0);
  assert.equal(legacy.z, 0.4);
  const ground = Layout.projectToAsset('forest', { x: 0, y: 0, z: 0.6, seed: 1 });
  const lifted = Layout.projectToAsset('forest', { x: 0, y: 0.2, z: 0.6, seed: 1 });
  assert.equal(ground.y, ground.groundY);
  assert.ok(lifted.y < lifted.groundY);
  assert.equal(Layout.normalizeWorldPosition({ x: -0.2, y: 0, z: 0.8 }).u, 0.4);
});

test('cover-aware projection and inverse projection round-trip across viewports', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 768, height: 900 }]) {
    const source = { u: 0.63, v: 0.72, seed: 77 };
    const screen = Layout.projectToViewport('forest', source, viewport);
    const roundTrip = Layout.inverseFromViewport('forest', screen, viewport, 77);
    assert.ok(Math.abs(roundTrip.u - source.u) < 0.002);
    assert.ok(Math.abs(roundTrip.v - source.v) < 0.002);
  }
});

test('camera scale shrinks billboard geometry on a narrow field without changing world coordinates', () => {
  const tree = { id: 'responsive', type: 'oak', tier: 4, assetWidth: 180, assetHeight: 180, position3d: { x: 0.2, y: 0, z: 0.65, seed: 3 } };
  const desktop = Layout.screenEnvelope('forest', tree, { width: 1154, height: 580 });
  const mobile = Layout.screenEnvelope('forest', tree, { width: 324, height: 182 });
  assert.ok(mobile.width < desktop.width * 0.5);
  assert.ok(mobile.cameraScale < desktop.cameraScale);
  const [mobileRow] = Layout.layoutTrees([tree], { scene: 'forest', viewport: { width: 324, height: 182 } });
  assert.deepEqual([mobileRow.position.x, mobileRow.position.y, mobileRow.position.z], [0.2, 0, 0.65]);
});

test('root footprints are a hard world-space constraint', () => {
  const a = Layout.footprint('oak', 3, { u: 0.5, v: 0.5 });
  const touching = Layout.footprint('sakura', 3, { u: 0.54, v: 0.5 });
  const separate = Layout.footprint('sakura', 3, { u: 0.72, v: 0.5 });
  assert.equal(Layout.footprintsOverlap(a, touching), true);
  assert.equal(Layout.footprintsOverlap(a, separate), false);
});

test('the legal planting surface is the inset soil ellipse, not the planter rectangle', () => {
  assert.equal(Layout.soilBoundary({ x: 0, y: 0, z: 0.68 }, 'oak', 3, 1, 'forest').legal, true);
  assert.equal(Layout.soilBoundary({ x: 0, y: 0, z: 0.99 }, 'oak', 3, 1, 'forest').legal, false);
  assert.equal(Layout.soilBoundary({ x: 0.82, y: 0, z: 0.82 }, 'palm', 4, 1, 'forest').legal, false);
  const front = Layout.projectToAsset('forest', { x: 0, y: 0, z: 0.9 });
  assert.ok(front.groundY < 0.77);
});

test('deterministic allocation returns the same legal position for the same tree id', () => {
  const occupied = [
    { id: 'a', type: 'oak', tier: 3, position3d: { u: 0.4, v: 0.45, seed: 1 } },
    { id: 'b', type: 'palm', tier: 2, position3d: { u: 0.65, v: 0.55, seed: 2 } },
  ];
  const tree = { id: 'new-tree', type: 'sakura', tier: 3 };
  const first = Layout.allocatePosition(tree, occupied, { scene: 'forest' });
  const second = Layout.allocatePosition(tree, occupied, { scene: 'forest' });
  assert.deepEqual(first, second);
  assert.equal(Layout.rootClearance(first, occupied, tree.type, tree.tier).legal, true);
});

test('screen-space canopy overlap is soft across depth and hard at the same depth', () => {
  const existing = [{ id: 'oak-a', type: 'oak', tier: 4, assetWidth: 220, assetHeight: 220, position3d: { u: 0.5, v: 0.5, seed: 1 } }];
  const sameDepth = Layout.canopyConflict({ id: 'oak-b', type: 'oak', tier: 4, assetWidth: 220, assetHeight: 220, position3d: { u: 0.51, v: 0.51, seed: 2 } }, existing, { scene: 'forest', viewport: { width: 1440, height: 900 } });
  const depthSeparated = Layout.canopyConflict({ id: 'oak-c', type: 'oak', tier: 4, assetWidth: 220, assetHeight: 220, position3d: { u: 0.58, v: 0.72, seed: 3 } }, existing, { scene: 'forest', viewport: { width: 1440, height: 900 } });
  assert.equal(sameDepth.hard, true);
  assert.equal(depthSeparated.hard, false);
  assert.ok(depthSeparated.maxOverlap > 0.5);
  assert.ok(depthSeparated.penalty < depthSeparated.maxOverlap);
});

test('legacy cell migration preserves records and produces stable 3d positions', () => {
  const trees = [
    { id: 't1', type: 'oak', tier: 2, task: '写论文', endTime: 1000, position: { cell: 0 } },
    { id: 't2', type: 'sakura', tier: 2, task: '读论文', endTime: 2000, position: { row: 0, col: 1 } },
    { id: 't3', type: 'palm', tier: 3, task: '做数据', endTime: 3000, position: { row: 1, col: 0 } },
    { id: 't4', type: 'cactus', tier: 1, task: '写邮件', endTime: 4000, position: { row: 1, col: 1 } },
  ];
  const migrated = Layout.migrateLegacyPositions(trees, 12, { scene: 'forest' });
  assert.deepEqual(migrated.map((tree) => tree.id), ['t1', 't2', 't3', 't4']);
  migrated.forEach((tree) => assert.equal(Layout.isWorldPosition(tree.position3d), true));
  assert.ok(migrated[0].position3d.v < migrated[2].position3d.v + 0.08);
  assert.ok(migrated[3].position3d.v > migrated[0].position3d.v + 0.15);
  assert.ok(migrated.every((tree) => tree.position3d.v > 0.05 && tree.position3d.v < 0.95));
  assert.deepEqual(migrated.map((tree) => [tree.task, tree.endTime]), [['写论文', 1000], ['读论文', 2000], ['做数据', 3000], ['写邮件', 4000]]);
  assert.deepEqual(Layout.migrateLegacyPositions(migrated, 12, { scene: 'forest' }).map((tree) => tree.position3d), migrated.map((tree) => tree.position3d));
  assert.equal(trees[0].position3d, undefined);
});

test('legacy grid migration preserves left-to-right and back-to-front relationships', () => {
  const trees = [
    { id: 'back-left', type: 'cactus', tier: 1, position: { row: 0, col: 1 } },
    { id: 'back-right', type: 'cactus', tier: 1, position: { cell: 10 } },
    { id: 'front-left', type: 'cactus', tier: 1, position: { row: 3, col: 1 } },
    { id: 'front-right', type: 'cactus', tier: 1, position: { row: 3, column: 10 } },
  ];
  const migrated = Layout.migrateLegacyPositions(trees, 12, { scene: 'forest' });
  const positions = Object.fromEntries(migrated.map((tree) => [tree.id, tree.position3d]));
  assert.ok(positions['back-left'].u < positions['back-right'].u);
  assert.ok(positions['front-left'].u < positions['front-right'].u);
  assert.ok(positions['back-left'].v < positions['front-left'].v);
  assert.ok(positions['back-right'].v < positions['front-right'].v);
  assert.equal(Layout.readLegacyCell({ cell: 25 }, 12).row, 2);
  assert.equal(Layout.readLegacyCell({ row: 2, col: 1 }, 12).column, 1);
});

test('version 1 u/v positions upgrade in place to version 2 x/y/z without moving', () => {
  const original = [{ id: 'v1-tree', type: 'oak', task: '保留我', position3d: { version: 1, u: 0.2, v: 0.7, seed: 19 } }];
  const [migrated] = Layout.migrateLegacyPositions(original, 12, { scene: 'forest' });
  assert.equal(migrated.position3d.version, 2);
  assert.equal(migrated.position3d.x, -0.6);
  assert.equal(migrated.position3d.y, 0);
  assert.equal(migrated.position3d.z, 0.7);
  assert.equal(migrated.position3d.u, 0.2);
  assert.equal(migrated.position3d.v, 0.7);
  assert.equal(migrated.task, '保留我');
});

test('an existing position on the stone rim is deterministically reconciled onto soil', () => {
  const original = [{ id: 'rim-tree', type: 'palm', tier: 4, position3d: { version: 2, x: 0.82, y: 0, z: 0.88, seed: 31 } }];
  const first = Layout.migrateLegacyPositions(original, 12, { scene: 'forest' });
  const second = Layout.migrateLegacyPositions(original, 12, { scene: 'forest' });
  assert.equal(Layout.soilBoundary(first[0].position3d, 'palm', 4, 1, 'forest').legal, true);
  assert.deepEqual(first[0].position3d, second[0].position3d);
});

test('layout uses painter order and keeps root projection independent from growth scale', () => {
  const trees = [
    { id: 'near', type: 'oak', tier: 4, position3d: { u: 0.5, v: 0.8, seed: 2 } },
    { id: 'far', type: 'oak', tier: 1, position3d: { u: 0.5, v: 0.2, seed: 1 } },
  ];
  const rows = Layout.layoutTrees(trees, { scene: 'forest', viewport: { width: 1440, height: 900 } });
  assert.deepEqual(rows.map((row) => row.id), ['far', 'near']);
  assert.equal(Layout.growthScale(0) < Layout.growthScale(0.5), true);
  assert.equal(Layout.growthScale(0.5) < Layout.growthScale(1), true);
  const root = Layout.projectToViewport('focusDay', { u: 0.5, v: 0.6, seed: 1 }, { width: 1440, height: 900 });
  assert.equal(root.x, Layout.projectToViewport('focusDay', { u: 0.5, v: 0.6, seed: 1 }, { width: 1440, height: 900 }).x);
});

test('density policy allocates 100 trees without root collisions in bounded time', () => {
  const count = 100;
  const profile = Layout.densityProfile(count);
  const trees = [];
  // 使用本进程 CPU 时间，避免 node --test 并行跑其他文件时把调度等待误算成布局耗时。
  const started = process.cpuUsage();
  for (let index = 0; index < count; index += 1) {
    const tree = {
      id: `density-${index}`,
      type: ['oak', 'sakura', 'palm', 'cactus'][index % 4],
      tier: 1 + (index % 4),
      densityScale: profile.footprintScale,
      assetWidth: profile.assetBase,
      assetHeight: profile.assetBase,
    };
    tree.position3d = Layout.allocatePosition(tree, trees, { scene: 'forest', viewport: { width: 1440, height: 900 }, attempts: 420 });
    assert.equal(Layout.soilBoundary(tree.position3d, tree.type, tree.tier, profile.footprintScale, 'forest').legal, true);
    trees.push(tree);
  }
  for (let i = 0; i < trees.length; i += 1) {
    for (let j = i + 1; j < trees.length; j += 1) {
      const a = Layout.footprint(trees[i].type, trees[i].tier, trees[i].position3d, profile.footprintScale);
      const b = Layout.footprint(trees[j].type, trees[j].tier, trees[j].position3d, profile.footprintScale);
      assert.equal(Layout.footprintsOverlap(a, b, 0.008), false, `${trees[i].id} overlaps ${trees[j].id}`);
    }
  }
  const cpu = process.cpuUsage(started);
  assert.ok((cpu.user + cpu.system) / 1000 < 1500);
});
