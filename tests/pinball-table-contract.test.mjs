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
const THREE_BALL_TABLES = TABLES.slice(0, 3);

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
  assert.match(source, /formula\.join\(' × '\)/);
  assert.match(source, /popupText/);
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
    assert.match(html, /<canvas[^>]+tabindex="0"[^>]+role="img"[^>]+aria-label=/, `${path} canvas semantics`);
    assert.match(html, /id="pbFlipL"[^>]+aria-label="左挡板"/, `${path} left flipper name`);
    assert.match(html, /id="pbFlipR"[^>]+aria-label="右挡板"/, `${path} right flipper name`);
    assert.match(html, /id="pbOverlay"[^>]+aria-live="assertive"/, `${path} overlay live region`);
  }
});

test('traditional tables use three balls with a visible lives HUD and first-run onboarding', () => {
  for (const path of THREE_BALL_TABLES) {
    const source = read(path);
    assert.match(source, /id="pbLives"/, `${path} lives HUD`);
    assert.match(source, /totalBalls:\s*3/, `${path} three-ball config`);
    assert.match(source, /onboarding:\s*\{/, `${path} onboarding config`);
    assert.match(source, /每局 3 球/, `${path} visible rules`);
    assert.match(source, /7 秒/, `${path} Ball Save disclosure`);
  }
  assert.match(read('toolbox/pinball/pachinko/index.html'), /onboarding:\s*\{/);
});

test('large awards no longer emit stale duplicate base-score messages', () => {
  for (const path of TABLES) {
    const source = read(path);
    assert.doesNotMatch(source, /GRAND \+3000|JACKPOT \+3000|LASER \+1000|DATA STREAM \+1000/);
  }
});

test('compact layouts dock controls while the table is visible', () => {
  const css = read('assets/css/pinball-core.css');
  assert.match(css, /\.pb-controls\.pb-controls-docked/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /grid-template-columns:\s*0\.7fr 1fr 1\.4fr 1fr 0\.7fr/);
});

test('all tables expose offline feedback, Nudge, half-screen controls, and coach UI', () => {
  for (const path of TABLES) {
    const source = read(path);
    assert.match(source, /games-shell\/sfx\.js/, `${path} SFX module`);
    assert.match(source, /id="pbSoundBtn"/, `${path} sound toggle`);
    assert.match(source, /id="pbHapticBtn"/, `${path} haptic toggle`);
    assert.match(source, /id="pbMotionBtn"/, `${path} motion toggle`);
    assert.match(source, /id="pbNudgeL"/, `${path} left nudge`);
    assert.match(source, /id="pbNudgeR"/, `${path} right nudge`);
    assert.match(source, /id="pbCoach"/, `${path} coach region`);
  }
  assert.match(read('toolbox/pinball/pachinko/index.html'), /ballSaveMs:\s*0/);
  assert.match(read('toolbox/pinball/rain/index.html'), /tiltAutoResetMs:\s*3000/);
});

test('shared SFX module provides pinball-specific synthesized feedback', () => {
  const sfx = read('assets/js/games-shell/sfx.js');
  for (const name of ['pinballFlipper', 'pinballBumper', 'pinballLaunch', 'pinballJackpot',
    'pinballMultiball', 'pinballDrain', 'pinballSave', 'pinballNudge', 'pinballTilt']) {
    assert.match(sfx, new RegExp(`${name}\\(\\)`), name);
  }
});

test('three-ball balance assists are explicit and testable', () => {
  assert.match(read('toolbox/pinball/index.html'), /ENERGY_MAX:\s*4/);
  const temple = read('toolbox/pinball/temple/index.html');
  assert.match(temple, /CHEST_HITS_REQUIRED\s*=\s*2/);
  assert.match(temple, /missingChest/);
  const cyber = read('toolbox/pinball/cyber/index.html');
  assert.match(cyber, /mercyHackUsed/);
  assert.match(cyber, /NEXT BALL HACK/);
});
