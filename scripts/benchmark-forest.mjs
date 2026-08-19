#!/usr/bin/env node
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const Core = require('../assets/js/forest/core.js');
const sizes = [500, 2000];

for (const size of sizes) {
  const trees = Array.from({ length: size }, (_, index) => ({
    id: `tr-${index}`, fieldId: 'fld-1', type: 'oak', success: true,
    position: { cell: index, col: index % 12, row: Math.floor(index / 12) },
    durationMinutes: 30, endTime: 1000 + index, updatedAt: 1000 + index,
  }));
  const local = Object.assign(Core.emptySnapshot(10_000), { fields: [{ id: 'fld-1', name: '基线', updatedAt: 1 }], activeFieldId: 'fld-1', trees });
  const remote = Object.assign(Core.emptySnapshot(20_000), { fields: [{ id: 'fld-1', name: '基线', updatedAt: 1 }], activeFieldId: 'fld-1', trees: trees.slice().reverse() });
  const projectStart = performance.now();
  for (let repeat = 0; repeat < 10; repeat += 1) trees.forEach((tree) => Core.projectPosition(tree.position, 12, repeat % 2 ? 4 : 10));
  const projectMs = performance.now() - projectStart;
  const mergeStart = performance.now();
  const merged = Core.mergeSnapshots(local, remote, 30_000);
  const mergeMs = performance.now() - mergeStart;
  console.log(JSON.stringify({ trees: size, project10xMs: Number(projectMs.toFixed(2)), mergeMs: Number(mergeMs.toFixed(2)), mergedTrees: merged.trees.length }));
}

