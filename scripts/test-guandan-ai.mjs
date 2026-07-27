import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = require(path.join(root, 'assets/js/games/guandan-ai-contract.js'));
const dmc = require(path.join(root, 'assets/js/games/guandan-dmc.js'));
const model = readFileSync(path.join(root, 'assets/js/games/guandan-dmc.bin'));
const fixture = JSON.parse(readFileSync(
  path.join(root, 'tests/fixtures/guandan-ai-golden.json'),
  'utf8',
));
const simulator = require(path.join(root, 'scripts/sim-guandan.js'));

assert.equal(createHash('sha256').update(model).digest('hex'), contract.modelSha256);
assert.equal(fixture.modelSha256, contract.modelSha256);
assert.equal(fixture.aiContractVersion, contract.version);
assert.equal(fixture.strategyId, contract.strategies.hard.id);
assert.equal(
  createHash('sha256').update(JSON.stringify(contract.heuristicWeights)).digest('hex'),
  contract.heuristicWeightsSha256,
);
const modelBuffer = model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength);
dmc.loadWeights(modelBuffer);
assert.equal(dmc.ready(), true);
assert.deepEqual(Array.from(dmc._card2array([-1])), new Array(54).fill(-1));
assert.equal(simulator.LEGACY_STRENGTH_RESULTS_VALID, false);

for (const item of fixture.cases) {
  const hands = [[], [], [], []];
  hands[item.input.seat] = item.input.hand.slice();
  const input = { ...item.input, hands };
  const moves = item.moves.map(move => ({
    cards: move.cards.slice(),
    combo: { ...move, cards: move.cards.slice() },
  }));
  const debug = [];
  const choice = dmc.choose(input, moves, item.leading, debug);
  assert.equal(debug.length, item.scores.length, item.id);
  debug.forEach((candidate, index) => {
    assert.ok(Math.abs(candidate.score - item.scores[index]) < 1e-6, `${item.id}:${index}`);
  });
  assert.deepEqual(choice ? choice.cards : null, item.choice, item.id);
}

const source = readFileSync(path.join(root, 'assets/js/games/guandan.js'), 'utf8');
assert.match(source, /new Worker\('\/assets\/js\/games\/guandan-dmc-worker\.js/);
assert.doesNotMatch(source, /function showPgo\(\)[\s\S]{0,300}ensureDMC\(\)/);
assert.match(source, /state\.aiLevel === 'hard'\) ensureDMC\(\)/);
assert.match(source, /matchAiLevel:\s*state\.matchAiLevel/);
assert.match(source, /AI_STRATEGIES\[state\.matchAiLevel\]/);
assert.match(source, /AI_STRATEGIES\[snap\.matchAiLevel\]/);
assert.match(source, /state\.matchAiLevel\s*=\s*serverDifficulty/);
assert.match(source, /\(snap\.matchAiLevel \|\| snap\.aiLevel\) === 'hard'/);
assert.match(source, /if \(state\.phase === PHASE\.IDLE\) \{\s*state\.activeStrategyId/);
assert.match(
  source,
  /\(state\.phase === PHASE\.IDLE \? state\.aiLevel : state\.matchAiLevel\) === 'hard'/,
);

console.log(JSON.stringify({
  ok: true,
  cases: fixture.cases.length,
  modelSha256: contract.modelSha256,
  strategies: Object.fromEntries(
    Object.entries(contract.strategies).map(([difficulty, strategy]) => [difficulty, strategy.id]),
  ),
}));
