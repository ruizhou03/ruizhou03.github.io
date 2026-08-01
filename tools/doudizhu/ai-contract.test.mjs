import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const Policy = require('../../assets/js/doudizhu/policy.js');
const E = require('../../assets/js/doudizhu/engine.js');
const AI = require('../../assets/js/doudizhu/ai.js');

test('central policy resolver pins every context and difficulty', () => {
  assert.equal(Policy.CONTRACT_VERSION, 'ddz-ai-policy-1.0.0');
  assert.deepEqual(
    Object.fromEntries(Object.entries(Policy.STRATEGIES).map(([key, value]) => [
      key, [value.engine, value.model, value.heuristicLevel],
    ])),
    {
      easy: ['heuristic', null, 'easy'],
      normal: ['heuristic', null, 'hard'],
      hard: ['douzero', 'adp', 'hard'],
      master: ['douzero', 'resnet', 'hard'],
    },
  );
  for (const difficulty of Object.keys(Policy.STRATEGIES)) {
    assert.equal(Policy.resolve('opponent', difficulty).difficulty, difficulty);
    assert.equal(Policy.resolve('hint', difficulty).difficulty, difficulty);
    assert.equal(Policy.resolve('autopilot', difficulty).difficulty, difficulty);
    assert.equal(Policy.resolve('online-ai', difficulty).difficulty, difficulty);
    assert.equal(Policy.resolve('online-hint', difficulty).difficulty, 'normal');
    assert.equal(Policy.resolve('timeout', difficulty).difficulty, 'normal');
  }
});

test('browser dispatches neural work only through a cancellable Worker', async () => {
  const page = await readFile(new URL('../../toolbox/doudizhu/index.html', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../../assets/js/doudizhu/ai-runtime.js', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../../assets/js/doudizhu/ai-worker.js', import.meta.url), 'utf8');
  const evaluator = await readFile(new URL('../../assets/js/doudizhu/ai-eval-worker.js', import.meta.url), 'utf8');
  assert.match(page, /doudizhu\/policy\.js/);
  assert.match(page, /doudizhu\/ai-runtime\.js/);
  assert.doesNotMatch(page, /<script[^>]+doudizhu\/net\.js/);
  assert.match(runtime, /new Worker\(WORKER_URL\)/);
  assert.match(runtime, /current\.terminate\(\)/);
  assert.match(runtime, /localhost\|127\\\.0\\\.0\\\.1/);
  assert.match(runtime, /testFault: localTestFault\(\)/);
  assert.match(ui, /AI_WORKER\.choose\(\{/);
  assert.doesNotMatch(ui, /window\.DDZNet|\bNET\.choose|\bNET\.ensureModel/);
  assert.match(worker, /gameEpoch: message\.gameEpoch/);
  assert.match(worker, /turnRevision: message\.turnRevision/);
  assert.match(worker, /DDZEngine\.validatePlay/);
  assert.match(worker, /model_http_404:test/);
  assert.match(worker, /model_size_17:test/);
  assert.match(worker, /model_output_invalid:non_finite_test/);
  assert.match(worker, /evaluators = \[new Worker\(EVALUATOR_URL\), new Worker\(EVALUATOR_URL\)\]/);
  assert.match(worker, /Promise\.all\(candidates\.map/);
  assert.match(evaluator, /DDZNet\._scoreActions/);
});

test('model supply-chain manifest pins exact bytes, hashes, source and license', async () => {
  const base = new URL('../../assets/js/doudizhu/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('model-manifest.json', base), 'utf8'));
  assert.equal(manifest.manifestVersion, 'ddz-models-1.0.0');
  assert.equal(manifest.models.adp.source.commit, '718a5c920bf3361e34178a38f3b80458e176b351');
  assert.equal(manifest.models.adp.source.license, 'Apache-2.0');
  assert.equal(manifest.models.resnet.source.commit, '13e740c08c3b653c2bef6ca345fc8fa6adc7d362');
  assert.equal(manifest.models.resnet.source.license, 'GPL-3.0-only');
  assert.match(
    await readFile(new URL('licenses/DouZero-APACHE-2.0.txt', base), 'utf8'),
    /Apache License[\s\S]*Version 2\.0/,
  );
  assert.match(
    await readFile(new URL('licenses/AlphaDou-GPL-3.0.txt', base), 'utf8'),
    /GNU GENERAL PUBLIC LICENSE[\s\S]*Version 3/,
  );
  for (const [model, spec] of Object.entries(manifest.models)) {
    let total = 0;
    for (const [position, artifacts] of Object.entries(spec.artifacts)) {
      for (const [extension, expected] of Object.entries(artifacts)) {
        const file = new URL(`weights/${model}_${position}.${extension}`, base);
        const info = await stat(file);
        const bytes = await readFile(file);
        assert.equal(info.size, expected.bytes, file.pathname);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, file.pathname);
        total += expected.bytes;
      }
    }
    assert.equal(total, spec.expectedBytes, model);
  }
});

test('MCTS sampling assigns revealed bottom cards exactly once', () => {
  let seed = 0x44aa5511;
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const dealt = E.deal(rng);
  const hands = dealt.hands.map(hand => hand.slice());
  hands[0].push(...dealt.bottom);
  const seen = new Array(15).fill(0);
  for (const card of dealt.bottom) seen[E.cardWeight(card)]++;
  const knownCardsBySeat = [dealt.bottom.slice(), [], []];
  for (const seat of [0, 1, 2]) {
    const sampled = AI._sampleOpponentHandsWeights({
      myIdx: seat,
      handSizes: hands.map(hand => hand.length),
      seen,
      knownCardsBySeat,
    }, hands[seat]);
    assert.ok(sampled, `seat ${seat}`);
    for (const other of [0, 1, 2].filter(value => value !== seat)) {
      assert.equal(sampled[other].length, hands[other].length);
    }
    if (seat !== 0) {
      const landlordRanks = sampled[0].slice();
      for (const card of dealt.bottom) {
        const rank = E.cardWeight(card);
        const index = landlordRanks.indexOf(rank);
        assert.ok(index >= 0, `bottom rank ${rank} fixed to landlord for seat ${seat}`);
        landlordRanks.splice(index, 1);
      }
    }
    const combined = hands[seat].map(E.cardWeight);
    for (const other of Object.keys(sampled)) combined.push(...sampled[other]);
    const counts = new Array(15).fill(0);
    for (const rank of combined) counts[rank]++;
    assert.deepEqual(counts, [4,4,4,4,4,4,4,4,4,4,4,4,4,1,1]);
  }
});
