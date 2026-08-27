#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const Core = require('../assets/js/games/picker-core.js');

function option(text, weight, locked = false) {
  return { text, weight, locked };
}

const thirds = Core.displayPercentages([
  option('甲', 1), option('乙', 1), option('丙', 1)
]);
assert.equal(thirds.reduce((sum, value) => sum + value, 0), 100);
assert.deepEqual(thirds.slice().sort((a, b) => b - a), [34, 33, 33]);

const locked = [option('甲', 40, true), option('乙', 30), option('丙', 30)];
Core.rebalance(locked, 1, 45);
const lockedPercents = Core.percentages(locked);
assert.ok(Math.abs(lockedPercents[0] - 40) < 0.001);
assert.ok(Math.abs(lockedPercents[1] - 45) < 0.001);
assert.ok(Math.abs(lockedPercents[2] - 15) < 0.001);

const weighted = [option('小', 10), option('大', 90)];
assert.equal(Core.weightedChoice(weighted, () => 0.05), 0);
assert.equal(Core.weightedChoice(weighted, () => 0.95), 1);

const values = [0.01, 0.99, 0.2];
let cursor = 0;
const sample = Core.weightedSampleWithoutReplacement(
  [option('甲', 1), option('乙', 1), option('丙', 1)],
  3,
  () => values[cursor++ % values.length]
);
assert.equal(new Set(sample).size, 2);
assert.deepEqual(sample.slice().sort(), [0, 2]);

const tournamentValues = [0.1, 0.9, 0.1, 0.9];
cursor = 0;
const tournament = Core.runTournament(weighted.map(item => ({ ...item, weight: 1 })), 4, () => tournamentValues[cursor++]);
assert.deepEqual(tournament.counts, [2, 2]);
assert.equal(tournament.winnerIndex, null);
assert.deepEqual(tournament.tiedIndices, [0, 1]);

const bulk = Core.parseBulk(' 火锅 \n烧烤\n火锅\n\n寿司');
assert.deepEqual(bulk.names, ['火锅', '烧烤', '寿司']);
assert.equal(bulk.duplicates, 1);

const config = {
  options: [option('A, B: C', 35), option('中文 & emoji 🐈', 65)],
  weighted: true,
  mode: 'multiple',
  count: 2,
  rounds: 9
};
const encoded = Core.encodeConfig(config);
const decoded = Core.decodeHash(encoded);
assert.equal(decoded.options[0].text, 'A, B: C');
assert.equal(decoded.options[1].text, '中文 & emoji 🐈');
assert.equal(decoded.mode, 'multiple');
assert.equal(decoded.count, 1);

const cappedConfig = Core.normalizeConfig({
  options: [option('甲', 1), option('乙', 1), option('丙', 1)],
  mode: 'multiple',
  count: 99
});
assert.equal(cappedConfig.count, 2);
assert.equal(Core.normalizeConfig({ options: [option('甲', 1), option('乙', 1)], mode: 'tournament', rounds: 1 }).rounds, 1);

const legacy = Core.decodeHash('#options=' + encodeURIComponent('甲') + ':50,' + encodeURIComponent('乙') + ':50&draws=5');
assert.equal(legacy.mode, 'tournament');
assert.equal(legacy.rounds, 5);

assert.equal(Core.contrastText('#b89252'), '#1a1a2e');
assert.equal(Core.contrastText('#1e3a5f'), '#ffffff');

console.log('picker core: 20 assertions passed');
