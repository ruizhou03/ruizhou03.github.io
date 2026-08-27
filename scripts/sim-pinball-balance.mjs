#!/usr/bin/env node
// Deterministic, offline pinball soak/balance smoke. It loads the real Core and
// each real table script in a DOM/canvas VM, then drives a simple bottom-save bot.
// No games-shell modules are loaded, so this never reads or writes a leaderboard.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const CORE_SOURCE = fs.readFileSync(new URL('assets/js/pinball-core/pinball-core.js', ROOT), 'utf8');
const TABLES = [
  { id: 'reactor', path: 'toolbox/pinball/index.html', maxSeconds: 220 },
  { id: 'temple', path: 'toolbox/pinball/temple/index.html', maxSeconds: 220 },
  { id: 'cyber', path: 'toolbox/pinball/cyber/index.html', maxSeconds: 220 },
  { id: 'pachinko', path: 'toolbox/pinball/pachinko/index.html', maxSeconds: 220 },
  { id: 'rain', path: 'toolbox/pinball/rain/index.html', maxSeconds: 100 },
];

const runsArg = process.argv.find(arg => arg.startsWith('--runs='));
const RUNS = Math.max(1, Math.min(30, Number(runsArg?.split('=')[1]) || 6));

function inlineGameScript(path) {
  const html = fs.readFileSync(new URL(path, ROOT), 'utf8');
  const scripts = [...html.matchAll(/<script>\s*([\s\S]*?)\s*<\/script>/g)];
  assert.ok(scripts.length, `${path}: inline game script missing`);
  return scripts.at(-1)[1];
}

function seededRandom(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

class FakeElement {
  constructor(tagName = 'DIV') {
    this.tagName = tagName;
    this.listeners = new Map();
    this.style = {};
    this.attrs = new Map();
    this.classes = new Set();
    this.textContent = '';
    this.innerHTML = '';
    this.disabled = false;
    this.isContentEditable = false;
    this.offsetWidth = 100;
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
      toggle: (name, force) => {
        const on = force === undefined ? !this.classes.has(name) : !!force;
        if (on) this.classes.add(name); else this.classes.delete(name);
        return on;
      },
    };
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  emit(type, props = {}) {
    const e = Object.assign({
      type, target: this, key: '', pointerId: 1, pointerType: 'mouse', button: 0,
      clientX: 0, preventDefault() {},
    }, props);
    for (const fn of this.listeners.get(type) || []) fn(e);
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  closest() { return null; }
  focus() {}
  setPointerCapture() {}
}

function makeRuntime(table, seed) {
  let wallNow = 100;
  let nextFrame = null;
  let capturedGame = null;
  const rand = seededRandom(seed);
  const elements = new Map();
  const window = new FakeElement('WINDOW');
  const document = new FakeElement('DOCUMENT');
  document.hidden = false;
  document.documentElement = { clientHeight: 720 };
  document.activeElement = new FakeElement('BODY');

  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 0 });
      return target[prop] || (() => {});
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const canvas = Object.assign(new FakeElement('CANVAS'), {
    width: 480, height: 640,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 480, bottom: 640, width: 480, height: 640 }),
  });
  elements.set('pbCanvas', canvas);
  document.getElementById = id => {
    if (!elements.has(id)) elements.set(id, new FakeElement(id.includes('Btn') ? 'BUTTON' : 'DIV'));
    return elements.get(id);
  };

  const storage = new Map();
  const math = Object.create(Math);
  math.random = rand;
  const context = vm.createContext({
    window, document,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    navigator: { vibrate() {} },
    performance: { now: () => wallNow },
    requestAnimationFrame(cb) { nextFrame = cb; return 1; },
    cancelAnimationFrame() { nextFrame = null; },
    setTimeout() { return 1; }, clearTimeout() {},
    console, Date, Math: math, Set, Map,
  });
  window.window = window;
  window.innerHeight = 720;
  window.devicePixelRatio = 1;
  vm.runInContext(CORE_SOURCE, context, { filename: 'pinball-core.js' });
  const createGame = window.PinballCore.createGame;
  window.PinballCore.createGame = cfg => {
    capturedGame = createGame(cfg);
    return capturedGame;
  };
  context.PinballCore = window.PinballCore;
  vm.runInContext(inlineGameScript(table.path), context, { filename: table.path });
  assert.ok(capturedGame, `${table.id}: game not captured`);

  function advance(ms) {
    if (typeof nextFrame !== 'function') return false;
    wallNow += ms;
    const cb = nextFrame;
    nextFrame = null;
    cb(wallNow);
    return true;
  }
  function key(type, value) {
    window.emit(type, { key: value });
  }
  return { game: capturedGame, elements, advance, key, now: () => wallNow };
}

function drive(table, seed) {
  const rt = makeRuntime(table, seed);
  const { game } = rt;
  const overlayBtn = rt.elements.get('pbOvBtn');
  // Dismiss first-run onboarding or start Rain. Rain needs one click; other tables only dismiss.
  if (overlayBtn?.classList || overlayBtn) overlayBtn.emit('click');

  let leftHeld = false;
  let rightHeld = false;
  let chargeFrames = 0;
  let chargeTargetFrames = 20;
  let lastForcedDrainAt = 0;
  const frameMs = 1000 / 30;
  const maxFrames = table.maxSeconds * 30;
  rt.advance(0);

  for (let frame = 0; frame < maxFrames && game.state.status !== 'gameover'; frame++) {
    const onPlunger = game.state.balls.some(ball => ball.onPlunger);
    if (onPlunger && !game.plunger.charging) {
      rt.key('keydown', ' ');
      chargeFrames = 0;
      chargeTargetFrames = 17 + (seed + frame) % 4;
    }
    if (game.plunger.charging) {
      chargeFrames++;
      if (chargeFrames >= chargeTargetFrames) rt.key('keyup', ' ');
    }

    // Deterministic session cap: the bot is intentionally mediocre, but a lucky
    // orbit can otherwise run forever. Force a drain only after a long ball so
    // every soak covers Ball Save, turn transitions, LAST BALL, and Game Over.
    const forceAfter = table.id === 'pachinko' ? 16000 : 45000;
    if (table.id !== 'rain' && game.state.status === 'inplay' &&
        game.state.playElapsedMs - lastForcedDrainAt >= forceAfter) {
      game.state.balls.forEach(ball => {
        ball.onPlunger = false;
        ball.x = 220;
        ball.y = 900;
      });
      lastForcedDrainAt = game.state.playElapsedMs;
    }

    const dangerous = game.state.balls.filter(ball => !ball.onPlunger && ball.y > 475);
    const wantLeft = dangerous.some(ball => ball.x < game.W / 2 + 25);
    const wantRight = dangerous.some(ball => ball.x >= game.W / 2 - 25);
    if (wantLeft !== leftHeld) { rt.key(wantLeft ? 'keydown' : 'keyup', 'a'); leftHeld = wantLeft; }
    if (wantRight !== rightHeld) { rt.key(wantRight ? 'keydown' : 'keyup', 'd'); rightHeld = wantRight; }
    rt.advance(frameMs);
  }
  if (leftHeld) rt.key('keyup', 'a');
  if (rightHeld) rt.key('keyup', 'd');

  let extra = {};
  try { extra = game.cfg.shell?.extraSubmit?.(game.state, game) || {}; } catch {}
  return {
    score: game.state.score,
    status: game.state.status,
    durationMs: Math.round(game.state.playElapsedMs),
    extra,
  };
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function modeCount(tableId, extra) {
  if (tableId === 'reactor') return Number(extra.reactorActivations) || 0;
  if (tableId === 'temple') return Number(extra.templeActivations) || 0;
  if (tableId === 'cyber') return Number(extra.hacks) || 0;
  if (tableId === 'pachinko') return Number(extra.multiballsStarted) || 0;
  return Number(extra.jackpotHits) || 0;
}

function progressCount(tableId, extra) {
  if (tableId === 'reactor') return Number(extra.energy) || 0;
  if (tableId === 'temple') return Number(extra.chestsOpen) || 0;
  if (tableId === 'cyber') return Number(extra.lettersLit) || 0;
  return Number(extra.jackpotHits) || 0;
}

const output = {};
for (const [tableIndex, table] of TABLES.entries()) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(drive(table, 0x9e3779b9 ^ (tableIndex * 1009 + i * 7919)));
  assert.ok(runs.every(run => run.status === 'gameover'), `${table.id}: soak did not settle`);
  assert.ok(runs.every(run => run.score >= 0 && run.score <= 5_000_000), `${table.id}: score outside backend envelope`);
  const summary = {
    runs: RUNS,
    scoreMin: Math.min(...runs.map(run => run.score)),
    scoreMedian: median(runs.map(run => run.score)),
    scoreMax: Math.max(...runs.map(run => run.score)),
    zeroScoreRuns: runs.filter(run => run.score === 0).length,
    durationMedianMs: median(runs.map(run => run.durationMs)),
    modeActivationRate: runs.filter(run => modeCount(table.id, run.extra) > 0).length / RUNS,
    progressMedian: median(runs.map(run => progressCount(table.id, run.extra))),
    sampleExtra: runs.at(-1).extra,
  };
  output[table.id] = summary;
  if (RUNS >= 4) {
    const minActivation = { reactor: 0.25, temple: 0.5, cyber: 0.25, pachinko: 0.25, rain: 1 }[table.id];
    assert.ok(summary.modeActivationRate >= minActivation,
      `${table.id}: mode activation ${summary.modeActivationRate} below ${minActivation}`);
    assert.ok(summary.scoreMax < 1_000_000, `${table.id}: automatic run indicates runaway scoring`);
    if (table.id === 'rain') {
      assert.ok(summary.durationMedianMs >= 60_000 && summary.durationMedianMs <= 75_000,
        'rain: settlement duration drifted outside 60-75 seconds');
    }
  }
}

console.log(JSON.stringify(output, null, 2));
