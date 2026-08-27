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
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      toggle: (name, force) => {
        const on = force === undefined ? !this.classes.has(name) : !!force;
        if (on) this.classes.add(name); else this.classes.delete(name);
        return on;
      },
      contains: name => this.classes.has(name),
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
  const canvas = Object.assign(new FakeTarget('CANVAS'), {
    width: 480,
    height: 640,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 480, bottom: 640, width: 480, height: 640 }),
  });
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, String(value)); },
  };
  const context = vm.createContext({
    window,
    document,
    localStorage,
    performance: { now: () => wallNow },
    requestAnimationFrame(cb) { nextFrame = cb; return 1; },
    cancelAnimationFrame() { nextFrame = null; },
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
    canvas,
    window,
    document,
    storage,
    hasPendingFrame() { return typeof nextFrame === 'function'; },
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
  h.advance(17);
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

test('labeled score popups show one multiplier-aware settlement formula', () => {
  const h = createHarness();
  h.game.setMultiplier(2);
  const awarded = h.game.addScore(100, 20, 20, 'jackpot', { label: 'JACKPOT' });
  assert.equal(awarded, 200);
  assert.equal(h.game.state.popups.at(-1).text, 'JACKPOT  100 × 2 = +200');
});

test('lives HUD starts at configured total and updates on drain', () => {
  const lives = new FakeTarget();
  const h = createHarness({ totalBalls: 3, hud: { lives } });
  assert.equal(lives.textContent, 3);
  h.game.state.balls[0].x = 200;
  h.game.state.balls[0].y = 10050;
  h.game.state.balls[0].onPlunger = false;
  h.advance(0);
  h.advance(17);
  assert.equal(h.game.state.lives, 2);
  assert.equal(lives.textContent, 2);
});

test('onboarding is shown once and persisted locally', () => {
  const overlay = new FakeTarget();
  const overlayTitle = new FakeTarget();
  const overlayMsg = new FakeTarget();
  const overlayBtn = new FakeTarget('BUTTON');
  const h = createHarness({
    id: 'intro-test',
    onboarding: { title: '怎么玩', msg: '三球一局' },
    hud: { overlay, overlayTitle, overlayMsg, overlayBtn },
  });
  assert.equal(overlay.classList.contains('show'), true);
  assert.equal(overlayBtn.textContent, '知道了，开始');
  overlayBtn.emit('click');
  assert.equal(overlay.classList.contains('show'), false);
  assert.equal(h.storage.get('tool.pinball.onboarding.v1.intro-test'), '1');
  h.game.startFresh();
  assert.equal(overlay.classList.contains('show'), false);
});

test('paused and game-over states stop scheduling animation frames', () => {
  const h = createHarness();
  assert.equal(h.hasPendingFrame(), true);
  h.game.togglePause();
  h.advance(16);
  assert.equal(h.hasPendingFrame(), false);
  h.game.togglePause();
  assert.equal(h.hasPendingFrame(), true);
});

test('page lifecycle stops rendering and resumes after bfcache restore', () => {
  const h = createHarness();
  h.window.emit('pagehide');
  assert.equal(h.game.state.destroyed, true);
  assert.equal(h.hasPendingFrame(), false);
  h.window.emit('pageshow');
  assert.equal(h.game.state.destroyed, false);
  assert.equal(h.hasPendingFrame(), true);
});

function simulateOneSecondAtFps(fps) {
  let ball;
  const h = createHarness({
    plungerEnabled: false,
    physics: {
      gravity: 600, airDrag: 1, substeps: 1, maxSpeed: 5000, ballRadius: 2,
      fixedStep: 1 / 60, maxFrameDt: 0.1, maxCatchUpSteps: 6,
    },
    hooks: {
      onStart(state, game) {
        ball = game.addBall(100, 100, 100, 0);
        game.startRun();
      },
    },
  });
  h.advance(0);
  for (let i = 0; i < fps; i++) h.advance(1000 / fps);
  return { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
}

test('fixed timestep produces the same physics at 30, 60, and 120 FPS', () => {
  const at30 = simulateOneSecondAtFps(30);
  const at60 = simulateOneSecondAtFps(60);
  const at120 = simulateOneSecondAtFps(120);
  for (const key of ['x', 'y', 'vx', 'vy']) {
    assert.ok(Math.abs(at30[key] - at60[key]) < 1e-7, `${key}: 30 vs 60`);
    assert.ok(Math.abs(at120[key] - at60[key]) < 1e-7, `${key}: 120 vs 60`);
  }
});

test('Ball Save restores the same ball without consuming a life', () => {
  const h = createHarness({ totalBalls: 3, ballSaveMs: 7000, turnDelayMs: 100 });
  const ball = h.game.state.balls[0];
  ball.onPlunger = false;
  ball.x = 200;
  ball.y = 10050;
  h.game.state.status = 'inplay';
  h.game.state.ballSaveArmed = false;
  h.game.state.ballSaveUntil = 7000;
  h.advance(0);
  h.advance(17);
  assert.equal(h.game.state.lives, 3);
  assert.equal(h.game.state.status, 'betweenballs');
  assert.equal(h.game.state.ballSaveUsedThisTurn, true);
  h.advance(600);
  assert.equal(h.game.state.status, 'idle');
  assert.equal(h.game.state.balls.length, 1);
  assert.equal(h.game.state.balls[0].onPlunger, true);
});

test('a real drain consumes a life and queues the next ball', () => {
  const h = createHarness({ totalBalls: 3, ballSaveMs: 0, turnDelayMs: 100 });
  const ball = h.game.state.balls[0];
  ball.onPlunger = false;
  ball.x = 200;
  ball.y = 10050;
  h.game.state.status = 'inplay';
  h.advance(0);
  h.advance(17);
  assert.equal(h.game.state.lives, 2);
  assert.equal(h.game.state.status, 'betweenballs');
  h.advance(100);
  assert.equal(h.game.state.status, 'idle');
});

test('third nudge within two seconds triggers TILT and suppresses scoring', () => {
  const h = createHarness();
  const ball = h.game.state.balls[0];
  ball.onPlunger = false;
  ball.x = 200;
  ball.y = 300;
  h.game.state.status = 'inplay';
  assert.equal(h.game.nudge(-1), true);
  assert.equal(h.game.nudge(1), true);
  assert.equal(h.game.nudge(-1), false);
  assert.equal(h.game.state.tilted, true);
  assert.equal(h.game.addScore(100, 20, 20, 'bumper'), 0);
});

test('continuous tables can use a timed TILT penalty', () => {
  const h = createHarness({ tiltAutoResetMs: 100 });
  h.game.state.status = 'inplay';
  h.game.nudge(-1); h.game.nudge(1); h.game.nudge(-1);
  assert.equal(h.game.state.tilted, true);
  h.advance(0);
  h.advance(100);
  assert.equal(h.game.state.tilted, false);
});

test('canvas left and right halves control their matching flippers', () => {
  const h = createHarness();
  const left = h.game.flippers.find(f => f.side === 'L');
  const right = h.game.flippers.find(f => f.side === 'R');
  h.canvas.emit('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 50 });
  assert.equal(left.target, left.upAngle);
  h.canvas.emit('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 50 });
  assert.equal(left.target, left.restAngle);
  h.canvas.emit('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 430 });
  assert.equal(right.target, right.upAngle);
});

test('low-motion preference is persistent and exposed to the renderer', () => {
  const motionBtn = new FakeTarget('BUTTON');
  const h = createHarness({ hud: { motionBtn } });
  assert.equal(h.game.lowMotionEnabled(), false);
  motionBtn.emit('click');
  assert.equal(h.game.lowMotionEnabled(), true);
  assert.equal(h.storage.get('tool.pinball.lowMotion.v1'), '1');
  assert.equal(motionBtn.getAttribute('aria-pressed'), 'true');
});

test('high-frequency feedback is throttled even at clock zero', () => {
  const h = createHarness();
  let sounds = 0;
  h.window.GamesShell = { Sfx: { pinballBumper() { sounds++; } } };
  h.game.feedback('bumper');
  h.game.feedback('bumper');
  assert.equal(sounds, 1);
});

test('contextual coach messages are one-shot and pause-aware', () => {
  const coach = new FakeTarget();
  const h = createHarness({ hud: { coach } });
  assert.equal(h.game.showCoach('orbit', '左侧轨道补充能量'), true);
  assert.equal(coach.textContent, '左侧轨道补充能量');
  assert.equal(coach.classList.contains('show'), true);
  assert.equal(h.game.showCoach('orbit', '不应重复'), false);
  h.advance(0);
  h.advance(4200);
  assert.equal(coach.classList.contains('show'), false);
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
  h.advance(500);
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
  h.advance(0);
  h.advance(17);
  assert.equal(drains, 1);
  assert.equal(h.hasPendingFrame(), false);
});
