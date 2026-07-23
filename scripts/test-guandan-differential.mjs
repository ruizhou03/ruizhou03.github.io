import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const count = Number(args.count || 10000);
const backendRoot = args.backend ? path.resolve(String(args.backend)) : null;
const siteRoot = path.resolve(new URL('..', import.meta.url).pathname);

function loadFrontendRules() {
  const file = path.join(siteRoot, 'assets/js/games/guandan.js');
  const source = fs.readFileSync(file, 'utf8');
  const marker = source.indexOf('//  游戏状态机');
  assert.ok(marker > 0, 'frontend rules marker missing');
  const prefix = source.slice(0, marker);
  const instrumented = prefix +
    "globalThis.__guandanRules = { RULES_VERSION, RANK_LABELS, LEVEL_SEQ, T, isJoker, jokerKind, cardSuit, cardRankIdx, singleWeight, isWild, classify, classifyRaw, beats, isBombType, buildDeck, genMoves };\n})();";
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
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(instrumented, sandbox, { filename: file, timeout: 10000 });
  return sandbox.__guandanRules;
}

const frontend = loadFrontendRules();
const require = createRequire(import.meta.url);
const simulator = require(path.join(siteRoot, 'scripts/sim-guandan.js'));
const engines = { frontend, simulator };
if (backendRoot) {
  const backendRules = await import(pathToFileURL(path.join(backendRoot, 'lib/guandan-rules.js')).href);
  const backendContract = await import(pathToFileURL(path.join(backendRoot, 'lib/guandan-contract.js')).href);
  engines.backend = { ...backendRules, RULES_VERSION: backendContract.RULES_VERSION };
}
const fixturePath = path.join(siteRoot, 'tests/fixtures/guandan-rules-golden.json');
const fixtureBytes = fs.readFileSync(fixturePath);
const fixture = JSON.parse(fixtureBytes);
assert.equal(fixture.rulesVersion, 'gd-huaian-2025-site-v1');
for (const [name, rules] of Object.entries(engines)) {
  assert.equal(rules.RULES_VERSION, fixture.rulesVersion, `${name} rulesVersion drift`);
}

function rngFor(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffledDeck(seed) {
  const rng = rngFor(seed);
  const deck = Array.from({ length: 108 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { deck, rng };
}
function normalizeCombo(combo) {
  if (!combo) return null;
  return {
    type: combo.type,
    len: combo.len,
    key: combo.key,
    bombStrength: combo.bombStrength || 0,
    cards: (combo.cards || []).slice().sort((a, b) => a - b),
  };
}
function normalizeMoves(moves) {
  return moves.map((move) => ({
    combo: normalizeCombo(move.combo),
    cards: move.cards.slice().sort((a, b) => a - b),
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function canonical(value) {
  return JSON.stringify(value);
}

for (const item of fixture.classification) {
  for (const [name, rules] of Object.entries(engines)) {
    const combo = rules.classify(item.cards, item.level, item.context);
    assert.equal(combo && combo.type, item.expectedType,
      `golden fixture ${item.id} failed in ${name}`);
  }
}

const digests = Object.fromEntries(Object.keys(engines).map((name) => [name, crypto.createHash('sha256')]));
for (let seed = 1; seed <= count; seed++) {
  const { deck, rng } = shuffledDeck(seed);
  const level = frontend.LEVEL_SEQ[seed % frontend.LEVEL_SEQ.length];
  const hand = deck.slice(0, 27);
  const leadHand = deck.slice(27, 54);
  const sampleLen = 1 + Math.floor(rng() * 6);
  const sample = deck.slice(54, 54 + sampleLen);

  const authority = engines.backend || frontend;
  const baselineLead = authority.genMoves(leadHand, null, level);
  const prev = baselineLead.length
    ? normalizeCombo(baselineLead[Math.floor(rng() * baselineLead.length)].combo)
    : null;

  const outputs = {};
  for (const [name, rules] of Object.entries(engines)) {
    outputs[name] = {
      classify: normalizeCombo(rules.classify(sample, level)),
      lead: normalizeMoves(rules.genMoves(hand, null, level)),
      follow: normalizeMoves(rules.genMoves(hand, prev, level)),
    };
    digests[name].update(canonical(outputs[name]) + '\n');
  }
  const authorityName = engines.backend ? 'backend' : 'frontend';
  const expected = canonical(outputs[authorityName]);
  for (const name of Object.keys(engines).filter((name) => name !== authorityName)) {
    assert.equal(canonical(outputs[name]), expected,
      `rule divergence seed=${seed} level=${level} implementation=${name}`);
  }
}

const hashes = Object.fromEntries(Object.entries(digests).map(([name, hash]) => [name, hash.digest('hex')]));
const referenceHash = hashes.backend || hashes.frontend;
for (const hash of Object.values(hashes)) assert.equal(hash, referenceHash);
console.log(JSON.stringify({
  ok: true,
  rulesVersion: 'gd-huaian-2025-site-v1',
  trajectories: count,
  sha256: referenceHash,
  fixtureSha256: crypto.createHash('sha256').update(fixtureBytes).digest('hex'),
  implementations: Object.keys(engines),
}, null, 2));
