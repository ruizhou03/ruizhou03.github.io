'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '..', 'assets/js/games/guandan.js');
const source = fs.readFileSync(file, 'utf8');
const runtimeModules = [
  'guandan-contract.js',
  'guandan-storage.js',
  'guandan-net.js',
  'guandan-audio.js',
  'guandan-rules.js',
  'guandan-engine.js',
].map(name => fs.readFileSync(path.join(__dirname, '..', 'assets/js/games', name), 'utf8'));
const marker = source.indexOf('//  游戏状态机');
if (marker < 0) throw new Error('guandan_authoritative_rules_marker');
const prefix = source.slice(0, marker);
const instrumented = prefix +
  "globalThis.__guandanRules = { RULES_VERSION, RANK_LABELS, LEVEL_SEQ, T, isJoker, jokerKind, cardSuit, cardRankIdx, singleWeight, isWild, classify, classifyRaw, beats, isBombType, buildDeck, genMoves, decompose };\n})();";
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  document: { getElementById() { return null; } },
  localStorage: { getItem() { return null; }, setItem() {} },
  window: {},
  setTimeout() { return 0; },
  clearTimeout() {},
  Math,
  Map,
  Set,
  GuandanUI: { createDialogController() { return { activate() {}, deactivate() {} }; } },
  GuandanDebug: { bindSecretChords() {} },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const moduleSource of runtimeModules) {
  vm.runInContext(moduleSource, sandbox, { timeout: 10000 });
}
vm.runInContext(instrumented, sandbox, { filename: file, timeout: 10000 });
module.exports = Object.freeze(sandbox.__guandanRules);
