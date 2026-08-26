import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const CORE_SOURCE = fs.readFileSync(new URL('../assets/js/pinball-core/pinball-core.js', import.meta.url), 'utf8');

class FakeTarget {
  constructor(tagName = 'DIV') {
    this.tagName = tagName;
    this.listeners = new Map();
    this.style = {};
    this.attrs = new Map();
    this.textContent = '';
    this.innerHTML = '';
    this.disabled = false;
    this.isContentEditable = false;
    this.classList = {
      add() {}, remove() {}, toggle() {}, contains() { return false; },
    };
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  emit(type, props = {}) {
    const event = Object.assign({
      type,
      target: this,
      key: '',
      pointerId: 1,
      preventDefault() {},
    }, props);
    for (const fn of this.listeners.get(type) || []) fn(event);
    return event;
  }

  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  closest() { return null; }
  focus() {}
  setPointerCapture() {}
}

function createHarness(config = {}) {
  let wallNow = 100;
  let nextFrame = null;
  const window = new FakeTarget('WINDOW');
  const document = new FakeTarget('DOCUMENT');
  document.hidden = false;
  document.activeElement = new FakeTarget('BODY');

  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 0 });
      return target[prop] || (() => {});
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const canvas = {
    width: 480,
    height: 640,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 480, height: 640 }),
  };
  const localStorage = {
    getItem() { return null; },
    setItem() {},
  };
  const context = vm.createContext({
    window,
    document,
    localStorage,
    performance: { now: () => wallNow },
    requestAnimationFrame(cb) { nextFrame = cb; return 1; },
    console,
    Date,
    Math,
    Set,
    Map,
  });
  window.window = window;
  vm.runInContext(CORE_SOURCE, context, { filename: 'pinball-core.js' });

  const game = window.PinballCore.createGame(Object.assign({
    canvas,
    physics: { gravity: 0, airDrag: 1, substeps: 1, maxSpeed: 2000, ballRadius: 2 },
    drainY: 9999,
  }, config));

  return {
    game,
    window,
    document,
    advance(ms) {
      wallNow += ms;
      const cb = nextFrame;
      assert.equal(typeof cb, 'function', 'requestAnimationFrame callback should exist');
      nextFrame = null;
      cb(wallNow);
    },
  };
}

test('trigger cooldown is isolated per ball during multiball', () => {
  const hits = [];
  const h = createHarness({
    plungerEnabled: false,
    triggers: [{
      id: 'slot', kind: 'rect', x: 0, y: 0, w: 100, h: 100,
      on: 'enter', cooldown: 1000,
      cb: (now, ball) => hits.push(ball.id),
    }],
    hooks: {
      onStart(state, game) {
        game.addBall(20, 20, 1, 0);
        game.addBall(40, 20, 1, 0);
        game.startRun();
      },
    },
  });
  h.advance(16);
  h.advance(16);
  assert.equal(hits.length, 2);
  assert.notEqual(hits[0], hits[1]);
});

test('game timers and elapsed duration freeze while paused', () => {
  let fired = false;
  const h = createHarness({ plungerEnabled: false });
  h.game.startRun();
  h.game.after(1000, () => { fired = true; });
  h.advance(16);
  h.advance(500);
  h.game.togglePause();
  h.advance(5000);
  assert.equal(fired, false);
  const elapsedAtPause = h.game.state.playElapsedMs;
  h.game.togglePause();
  h.advance(501);
  assert.equal(fired, true);
  assert.ok(h.game.state.playElapsedMs - elapsedAtPause < 510);
});

test('releasing a flipper during pause clears the held state', () => {
  const h = createHarness();
  const left = h.game.flippers.find(f => f.side === 'L');
  h.window.emit('keydown', { key: 'a' });
  assert.equal(left.target, left.upAngle);
  h.game.togglePause();
  h.window.emit('keyup', { key: 'a' });
  h.game.togglePause();
  assert.equal(left.target, left.restAngle);
});

test('Space remains available to focused native controls', () => {
  const h = createHarness();
  h.document.activeElement = new FakeTarget('BUTTON');
  let prevented = false;
  h.window.emit('keydown', { key: ' ', preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(h.game.plunger.charging, false);
});

test('starting a fresh game restores mutable physics configuration', () => {
  const h = createHarness();
  h.game.phys.gravity = 1210;
  h.game.startFresh();
  assert.equal(h.game.phys.gravity, 0);
});

test('no-plunger tables drain stationary balls instead of trapping them', () => {
  let drains = 0;
  const h = createHarness({
    plungerEnabled: false,
    hooks: {
      onStart(state, game) {
        game.addBall(200, 200, 0, 0);
        game.startRun();
      },
      onBallDrain() { drains++; },
    },
  });
  h.advance(16);
  h.advance(500);
  h.advance(600);
  assert.equal(drains, 1);
  assert.equal(h.game.state.balls.some(ball => ball.onPlunger), false);
});

test('far-offscreen balls are always removed even outside the normal drain range', () => {
  let drains = 0;
  const h = createHarness({
    plungerEnabled: false,
    designH: 640,
    drainY: 626,
    drainXRange: [100, 442],
    hooks: {
      onStart(state, game) {
        game.addBall(50, 800, 0, 1);
        game.startRun();
      },
      onBallDrain() { drains++; },
    },
  });
  h.advance(16);
  h.advance(16);
  assert.equal(drains, 1);
});
