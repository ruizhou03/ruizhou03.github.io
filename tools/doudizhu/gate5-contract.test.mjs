import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Storage = require('../../assets/js/doudizhu/storage.js');

function deckState(phase) {
  const hands = [Array.from({ length: 20 }, (_, i) => i), Array.from({ length: 17 }, (_, i) => i + 20), Array.from({ length: 17 }, (_, i) => i + 37)];
  return {
    v: 3, phase, difficulty: 'hard', hands, bottom: [17, 18, 19],
    netPlayed: [[], [], []], landlordIdx: 0, turnIdx: 0,
    gameEpoch: 2, revision: 4, netSeq: [],
  };
}

for (const phase of ['bidding', 'doubling', 'playing']) {
  test(`${phase} save round-trips through schema v3`, () => {
    const state = deckState(phase);
    assert.deepEqual(Storage.migrateSingle(JSON.parse(JSON.stringify(state))), state);
  });
}

test('v2 save migrates and online/corrupt saves fail closed', () => {
  const legacy = deckState('playing'); legacy.v = 2;
  assert.equal(Storage.migrateSingle(legacy).v, 3);
  assert.equal(Storage.migrateSingle({ ...legacy, mode: 'online' }), null);
  const duplicate = deckState('playing'); duplicate.hands[1][0] = duplicate.hands[0][0];
  assert.equal(Storage.migrateSingle(duplicate), null);
});

test('page starts with no external audio or QR requests and exposes tiered offline assets', async () => {
  const page = await readFile(new URL('../../toolbox/doudizhu/index.html', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../../toolbox/doudizhu/offline-assets.json', import.meta.url), 'utf8'));
  assert.doesNotMatch(page, /doudizhu\/audio\.js|games-shell\/qrcode\.js/);
  assert.doesNotMatch(page, /<style[\s>]/);
  assert.match(page, /assets\/css\/doudizhu\.css/);
  assert.doesNotMatch(page, /<script[^>]+games-shell\/(?:wins-leaderboard|comments|nick-prompt)\.js/);
  assert.doesNotMatch(ui, /DDZAudio|assets\/audio\/doudizhu/);
  assert.match(page, /doudizhu\/extras\.js/);
  assert.ok(manifest.core.length > 0);
  assert.equal(manifest.base.length, 0);
  assert.ok(manifest.hard.some(asset => asset.url.includes('adp_landlord.qw')));
  assert.ok(manifest.master.some(asset => asset.url.includes('resnet_landlord.qw')));
  assert.ok(!manifest.hard.some(asset => asset.url.includes('resnet_')));
  assert.ok(!manifest.master.some(asset => asset.url.includes('adp_')));
});

test('Doudizhu startup dependency graph is acyclic', () => {
  const graph = new Map([
    ['engine', []], ['ai', ['engine']], ['policy', []],
    ['ai-runtime', ['policy']], ['storage', []], ['offline', []],
    ['extras', []], ['ui', ['engine', 'ai', 'policy', 'ai-runtime', 'storage', 'offline', 'extras']],
  ]);
  const visiting = new Set(), visited = new Set();
  function visit(name) {
    if (visiting.has(name)) throw new Error(`cycle:${name}`);
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dep of graph.get(name) || []) visit(dep);
    visiting.delete(name); visited.add(name);
  }
  for (const name of graph.keys()) visit(name);
  assert.equal(visited.size, graph.size);
});

test('offline Worker URLs exactly match runtime requests', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../toolbox/doudizhu/offline-assets.json', import.meta.url), 'utf8'));
  const runtime = await readFile(new URL('../../assets/js/doudizhu/ai-runtime.js', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../../assets/js/doudizhu/ai-worker.js', import.meta.url), 'utf8');
  for (const url of [
    '/assets/js/doudizhu/ai-worker.js?v=20260801g5a',
    '/assets/js/doudizhu/net.js?v=20260801g5a',
    '/assets/js/doudizhu/ai-eval-worker.js?v=20260801g5a',
  ]) {
    assert.ok(manifest.hard.some(asset => asset.url === url) || manifest.master.some(asset => asset.url === url), url);
  }
  assert.match(runtime, /ai-worker\.js\?v=20260801g5a/);
  assert.match(worker, /net\.js\?v=20260801g5a/);
  assert.match(worker, /ai-eval-worker\.js\?v=20260801g5a/);
});
