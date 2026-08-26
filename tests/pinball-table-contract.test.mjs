import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url);
const TABLES = [
  'toolbox/pinball/index.html',
  'toolbox/pinball/temple/index.html',
  'toolbox/pinball/cyber/index.html',
  'toolbox/pinball/pachinko/index.html',
  'toolbox/pinball/rain/index.html',
];

function read(path) {
  return fs.readFileSync(new URL(path, ROOT), 'utf8');
}

function inlineScript(html) {
  const matches = [...html.matchAll(/<script>\s*([\s\S]*?)\s*<\/script>/g)];
  assert.ok(matches.length > 0, 'table should contain an inline game script');
  return matches.at(-1)[1];
}

test('all live table scripts parse and use the pause-aware game clock', () => {
  for (const path of TABLES) {
    const html = read(path);
    const script = inlineScript(html);
    execFileSync(process.execPath, ['--check', '-'], { input: script });
    assert.doesNotMatch(script, /performance\.now\(\)/, `${path} bypasses the game clock`);
  }
});

test('Temple opens the cloned environment walls, not only source config objects', () => {
  const source = read('toolbox/pinball/temple/index.html');
  assert.match(source, /game\.env\.walls\.forEach/);
  assert.match(source, /setHiddenDoors\(true\)/);
  assert.match(source, /setHiddenDoors\(false\)/);
});

test('Rain has an explicit start lifecycle and no hidden plunger rescue', () => {
  const source = read('toolbox/pinball/rain/index.html');
  assert.match(source, /plungerEnabled:\s*false/);
  assert.match(source, /game\.startRun\(\)/);
  assert.match(source, /btnText:\s*'开始'/);
  assert.match(source, /MAX_ACTIVE_BALLS\s*=\s*12/);
  assert.match(source, /state\.endAt\s*=\s*game\.now\(\)\s*\+\s*GAME_LEN_MS/);
});

test('Pachinko keeps launch multipliers per ball and resets JKPT streak on a miss', () => {
  const source = read('toolbox/pinball/pachinko/index.html');
  assert.match(source, /ball\.launchMult\s*=\s*lane\.mult/);
  assert.match(source, /const ballMult = Number\(ball\.launchMult\) \|\| 1/);
  assert.match(source, /else \{\s*state\.jackpotStreak = 0;/);
  const laneReturnStart = source.indexOf('function onPachinkoLaneReturn');
  const t3Start = source.indexOf("if (tier === 'T3')", laneReturnStart);
  const t3End = source.indexOf("} else if (tier === 'T2')", t3Start);
  const t3Block = source.slice(t3Start, t3End);
  assert.doesNotMatch(t3Block, /jackpotStreak/);
});

test('Reactor drop targets participate in physics substeps', () => {
  const source = read('toolbox/pinball/index.html');
  assert.match(source, /onSubstep:\s*\(dt, now, g\)\s*=>\s*tickDropTargets/);
});

test('Cyber and Temple settlement statistics preserve maxima and totals', () => {
  const cyber = read('toolbox/pinball/cyber/index.html');
  assert.match(cyber, /maxComboLevel/);
  assert.match(cyber, /maxCombo:\s*state\.maxComboLevel/);
  const temple = read('toolbox/pinball/temple/index.html');
  assert.match(temple, /spinnerTotalHits/);
  assert.match(temple, /spinnerMaxStreak/);
  assert.match(temple, /spinner ×8/);
});

test('all live tables expose named controls and Canvas fallback semantics', () => {
  for (const path of TABLES) {
    const html = read(path);
    assert.match(html, /<canvas[^>]+role="img"[^>]+aria-label=/, `${path} canvas semantics`);
    assert.match(html, /id="pbFlipL"[^>]+aria-label="左挡板"/, `${path} left flipper name`);
    assert.match(html, /id="pbFlipR"[^>]+aria-label="右挡板"/, `${path} right flipper name`);
    assert.match(html, /id="pbOverlay"[^>]+aria-live="assertive"/, `${path} overlay live region`);
  }
});
