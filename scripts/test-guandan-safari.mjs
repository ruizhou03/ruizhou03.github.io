#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=')];
}));
const baseUrl = args.get('--url') || 'https://ruizhou03.com/toolbox/guandan/';
const marker = args.get('--marker') || '20260801p7b';
const port = Number(args.get('--port') || 4445);
const webdriverBase = `http://127.0.0.1:${port}`;
const elementKey = 'element-6066-11e4-a52e-4f735466cecf';

let driver;
let sessionId;
let driverError = '';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, { method = 'GET', body, allowError = false } = {}) {
  const response = await fetch(webdriverBase + path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  const failed = !response.ok || payload?.value?.error;
  if (failed && !allowError) {
    const message = payload?.value?.message || `${method} ${path} returned ${response.status}`;
    throw new Error(message);
  }
  return payload?.value;
}

async function waitForDriver() {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      await request('/status');
      return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }
  throw lastError || new Error('safaridriver did not become ready');
}

async function execute(script, args = []) {
  return request(`/session/${sessionId}/execute/sync`, {
    method: 'POST',
    body: { script, args },
  });
}

async function find(selector) {
  const value = await request(`/session/${sessionId}/element`, {
    method: 'POST',
    body: { using: 'css selector', value: selector },
  });
  assert.ok(value?.[elementKey], `Safari 找不到元素：${selector}`);
  return value[elementKey];
}

async function click(selector) {
  const id = await find(selector);
  await request(`/session/${sessionId}/element/${id}/click`, {
    method: 'POST',
    body: {},
  });
}

async function sendKey(selector, key) {
  const id = await find(selector);
  await request(`/session/${sessionId}/element/${id}/value`, {
    method: 'POST',
    body: { text: key, value: [key] },
  });
}

async function pressKey(key) {
  await request(`/session/${sessionId}/actions`, {
    method: 'POST',
    body: {
      actions: [{
        type: 'key',
        id: 'keyboard',
        actions: [
          { type: 'keyDown', value: key },
          { type: 'keyUp', value: key },
        ],
      }],
    },
  });
  await request(`/session/${sessionId}/actions`, { method: 'DELETE' });
}

async function waitFor(predicateScript, message, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await execute(predicateScript)) return;
    await delay(100);
  }
  throw new Error(message);
}

async function run() {
  driver = spawn('/usr/bin/safaridriver', ['-p', String(port)], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  driver.stderr.setEncoding('utf8');
  driver.stderr.on('data', (chunk) => { driverError += chunk; });
  await waitForDriver();

  let session;
  try {
    session = await request('/session', {
      method: 'POST',
      body: { capabilities: { alwaysMatch: { browserName: 'safari' } } },
    });
  } catch (error) {
    if (/Allow remote automation/i.test(error.message)) {
      throw new Error('请先在 Safari → 设置 → 开发者中开启“允许远程自动化”，然后重跑本脚本。');
    }
    throw error;
  }
  sessionId = session.sessionId;
  assert.equal(String(session.capabilities.browserName).toLowerCase(), 'safari');

  const url = new URL(baseUrl);
  url.searchParams.set('release-check', marker);
  await request(`/session/${sessionId}/url`, {
    method: 'POST',
    body: { url: url.href },
  });
  await waitFor(
    `return window.GuandanContract?.releaseMarker === ${JSON.stringify(marker)}`,
    `Safari 未加载 release marker ${marker}`,
  );

  const hasResume = await execute(`
    const el = document.querySelector('#gdResumeDiscard');
    return !!el && !el.closest('#gdResumeOverlay').hidden;
  `);
  if (hasResume) await click('#gdResumeDiscard');

  await click('#gdPgoDiff button[data-value="normal"]');
  await click('#gdPgoStart');
  await waitFor(
    `return document.querySelectorAll('#gdHand button').length === 27`,
    'Safari 开局后没有 27 张手牌',
  );

  const firstCard = '#gdHand button:first-child';
  await sendKey(firstCard, '\uE007');
  const keyboardSelected = await execute(`
    return document.querySelector('#gdHand button:first-child')?.getAttribute('aria-pressed') === 'true';
  `);
  assert.equal(keyboardSelected, true, 'Safari Enter 键没有选中手牌');
  await sendKey(firstCard, '\uE007');

  await click('#gdOrderBtn');
  await click('#gdHand button:nth-child(3)');
  await click('#gdOrderRight');
  const orderStatus = await execute(`return document.querySelector('#gdOrderStatus')?.textContent || ''`);
  assert.match(orderStatus, /已移动到第 \d+ 列/, 'Safari 调整顺序没有真实换列');

  await click('#gdBoardBtn');
  const dialogOpen = await execute(`
    return {
      hidden: document.querySelector('#gdBoardModal').hidden,
      active: document.activeElement?.getAttribute('aria-label'),
      inertCount: document.querySelectorAll('[inert]').length,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  `);
  assert.equal(dialogOpen.hidden, false);
  assert.equal(dialogOpen.active, '关闭');
  assert.ok(dialogOpen.inertCount > 0, 'Safari dialog 打开后背景没有 inert');
  assert.equal(dialogOpen.bodyOverflow, 'hidden');

  await pressKey('\uE00C');
  const dialogClosed = await execute(`
    return {
      hidden: document.querySelector('#gdBoardModal').hidden,
      active: document.activeElement?.getAttribute('aria-label'),
      inertCount: document.querySelectorAll('[inert]').length,
    };
  `);
  assert.equal(dialogClosed.hidden, true);
  assert.equal(dialogClosed.active, '榜单');
  assert.equal(dialogClosed.inertCount, 0);

  const layout = await execute(`
    const names = ['榜单', '关闭音效', '游戏设置', '退出本局'];
    const rects = names.map((name) => {
      const el = [...document.querySelectorAll('button')]
        .find((button) => (button.getAttribute('aria-label') || button.textContent.trim()) === name);
      const rect = el.getBoundingClientRect();
      return { name, x: rect.x, right: rect.right, width: rect.width, height: rect.height };
    });
    return {
      innerWidth,
      innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      toolbarGaps: [rects[1].x - rects[0].right, rects[3].x - rects[2].right],
      rects,
    };
  `);
  assert.equal(layout.horizontalOverflow, false);
  assert.ok(layout.rects.every((rect) => rect.width >= 44 && rect.height >= 44));
  assert.ok(layout.toolbarGaps.every((gap) => gap >= 4));

  console.log(JSON.stringify({
    ok: true,
    browser: session.capabilities.browserVersion,
    platform: session.capabilities.platformName,
    marker,
    handCount: 27,
    keyboardSelected,
    orderStatus,
    dialogOpen,
    dialogClosed,
    layout,
    pendingManual: ['200% zoom', 'VoiceOver', 'offline network transition'],
  }, null, 2));
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  if (driverError.trim()) console.error(driverError.trim());
  process.exitCode = 1;
} finally {
  if (sessionId) {
    await request(`/session/${sessionId}`, { method: 'DELETE', allowError: true }).catch(() => {});
  }
  if (driver && !driver.killed) driver.kill('SIGTERM');
}
