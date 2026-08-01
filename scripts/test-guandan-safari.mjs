#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=')];
}));
const baseUrl = args.get('--url') || 'https://ruizhou03.com/toolbox/guandan/';
const marker = args.get('--marker') || '20260801p7c';
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
  const raw = await response.text();
  const payload = (() => {
    try { return JSON.parse(raw); } catch { return {}; }
  })();
  const failed = !response.ok || payload?.value?.error;
  if (failed && !allowError) {
    const message = payload?.value?.message || payload?.message || raw.trim() ||
      `${method} ${path} returned ${response.status}`;
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
  try {
    const id = await find(selector);
    await request(`/session/${sessionId}/element/${id}/click`, {
      method: 'POST',
      body: {},
    });
  } catch (error) {
    throw new Error(`点击 ${selector} 失败：${error.message}`);
  }
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
  await request(`/session/${sessionId}/window/rect`, {
    method: 'POST',
    body: { x: 0, y: 0, width: 1440, height: 900 },
  });

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
  await waitFor(
    `return document.body.classList.contains('gd-game-fullscreen')`,
    'Safari 主运行时尚未完成事件绑定',
  );

  const hasResume = await execute(`
    const el = document.querySelector('#gdResumeDiscard');
    const overlay = el?.closest('#gdResumeOverlay');
    return !!el && !!overlay && !overlay.hidden && overlay.getClientRects().length > 0 &&
      getComputedStyle(overlay).display !== 'none' && getComputedStyle(overlay).visibility !== 'hidden';
  `);
  if (hasResume) await click('#gdResumeDiscard');

  await click('#gdPgoDiff button[data-value="normal"]');
  await click('#gdPgoStart');
  await waitFor(
    `return document.querySelectorAll('#gdHand [role="button"][data-cid]').length === 27`,
    'Safari 开局后没有 27 张手牌',
  );

  const firstCard = '#gdHand [role="button"][data-cid]';
  await sendKey(firstCard, '\uE007');
  const keyboardSelected = await execute(`
    return document.querySelector('#gdHand [role="button"][data-cid]')?.getAttribute('aria-pressed') === 'true';
  `);
  assert.equal(keyboardSelected, true, 'Safari Enter 键没有选中手牌');
  await sendKey(firstCard, '\uE007');

  await click('#gdOrderBtn');
  const orderBefore = await execute(`
    return [...document.querySelectorAll('#gdHand .gd-rank-col')]
      .map((column) => column.querySelector('[role="button"][data-cid]')?.getAttribute('aria-label'));
  `);
  await click('#gdHand .gd-rank-col:first-child [role="button"][data-cid]:last-child');
  await click('#gdOrderRight');
  await waitFor(
    `return /已移动到第 2 列/.test(document.querySelector('#gdLiveRegion')?.textContent || '')`,
    'Safari 调整顺序没有发布移动完成状态',
    2000,
  );
  const orderStatus = await execute(`return document.querySelector('#gdOrderStatus')?.textContent || ''`);
  const orderAfter = await execute(`
    return [...document.querySelectorAll('#gdHand .gd-rank-col')]
      .map((column) => column.querySelector('[role="button"][data-cid]')?.getAttribute('aria-label'));
  `);
  assert.match(orderStatus, /第 2 列/, 'Safari 调整顺序没有移动到第二列');
  assert.notDeepEqual(orderAfter, orderBefore, 'Safari 调整顺序没有真实改变 DOM 牌列顺序');

  await click('#gdBoardBtn');
  await waitFor(
    `return document.activeElement?.getAttribute('aria-label') === '关闭'`,
    'Safari dialog 打开后焦点没有落到关闭按钮',
    2000,
  );
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
  await waitFor(
    `return document.activeElement?.id === 'gdBoardBtn'`,
    'Safari Escape 关闭后焦点没有回到榜单按钮',
    2000,
  );
  const dialogClosed = await execute(`
    return {
      hidden: document.querySelector('#gdBoardModal').hidden,
      active: document.activeElement?.getAttribute('aria-label'),
      activeId: document.activeElement?.id,
      triggerLabel: document.querySelector('#gdBoardBtn')?.getAttribute('aria-label'),
      inertCount: document.querySelectorAll('[inert]').length,
    };
  `);
  assert.equal(dialogClosed.hidden, true);
  assert.equal(dialogClosed.activeId, 'gdBoardBtn');
  assert.equal(dialogClosed.triggerLabel, '榜单');
  assert.equal(dialogClosed.inertCount, 0);

  await click('#gdSettingsBtn');
  await waitFor(
    `return document.activeElement?.id === 'gdPgoClose'`,
    'Safari 设置 dialog 打开后焦点没有落到返回按钮',
    2000,
  );
  await pressKey('\uE00C');
  await waitFor(
    `return document.activeElement?.id === 'gdSettingsBtn'`,
    'Safari 设置 dialog 关闭后焦点没有回到设置按钮',
    2000,
  );
  const settingsDialog = await execute(`return {
    open: document.querySelector('#gdPgo').classList.contains('open'),
    activeId: document.activeElement?.id,
    inertCount: document.querySelectorAll('[inert]').length,
  }`);
  assert.equal(settingsDialog.open, false);
  assert.equal(settingsDialog.inertCount, 0);

  await click('#gdExitBtn');
  await waitFor(
    `return document.activeElement?.id === 'gdConfirmExitCancel'`,
    'Safari 退出确认 dialog 打开后焦点没有落到取消按钮',
    2000,
  );
  await pressKey('\uE00C');
  await waitFor(
    `return document.activeElement?.id === 'gdExitBtn'`,
    'Safari 退出确认 dialog 关闭后焦点没有回到退出按钮',
    2000,
  );
  const exitDialog = await execute(`return {
    hidden: document.querySelector('#gdConfirmExit').hidden,
    activeId: document.activeElement?.id,
    inertCount: document.querySelectorAll('[inert]').length,
  }`);
  assert.equal(exitDialog.hidden, true);
  assert.equal(exitDialog.inertCount, 0);

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
    orderBefore: orderBefore.slice(0, 3),
    orderAfter: orderAfter.slice(0, 3),
    dialogOpen,
    dialogClosed,
    settingsDialog,
    exitDialog,
    layout,
    pendingManual: ['200% zoom', 'VoiceOver', 'offline network transition'],
  }, null, 2));
}

try {
  await run();
} catch (error) {
  console.error(error.message);
  if (driverError.trim()) console.error(driverError.trim());
  if (sessionId) {
    try {
      const screenshot = await request(`/session/${sessionId}/screenshot`);
      await writeFile('/tmp/guandan-safari-failure.png', screenshot, 'base64');
      console.error('失败截图：/tmp/guandan-safari-failure.png');
    } catch {}
  }
  process.exitCode = 1;
} finally {
  if (sessionId) {
    await request(`/session/${sessionId}`, { method: 'DELETE', allowError: true }).catch(() => {});
  }
  if (driver && !driver.killed) driver.kill('SIGTERM');
}
