#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=')];
}));
const marker = args.get('--marker') || '20260801p7j';
const browserName = args.get('--browser') || 'safari';
const browserLabel = browserName === 'firefox' ? 'Firefox' : 'Safari';
const driverPath = args.get('--driver') || (browserName === 'firefox'
  ? 'geckodriver'
  : '/usr/bin/safaridriver');
const browserBinary = args.get('--browser-binary');
const port = Number(args.get('--port') || 4445);
const windowWidth = Number(args.get('--width') || 1440);
const windowHeight = Number(args.get('--height') || 900);
const expectCompact = args.has('--expect-compact');
const checkReveal = args.has('--check-reveal');
const checkOffline = args.has('--check-offline');
const checkA11y = args.has('--check-a11y');
const zoomPercent = Number(args.get('--zoom') || 100);
const offlineDir = args.get('--offline-dir');
const offlinePort = Number(args.get('--offline-port') || 4191);
const baseUrl = args.get('--url') || (offlineDir
  ? `http://127.0.0.1:${offlinePort}/toolbox/guandan/`
  : 'https://ruizhou03.com/toolbox/guandan/');
const screenshotPath = args.get('--screenshot');
const webdriverBase = `http://127.0.0.1:${port}`;
const elementKey = 'element-6066-11e4-a52e-4f735466cecf';

let driver;
let sourceServer;
let sessionId;
let driverError = '';
let sourceError = '';

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

async function waitForSource(url) {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw lastError || new Error('offline source server did not become ready');
}

async function stopSourceServer() {
  if (!sourceServer || sourceServer.exitCode !== null) return;
  const exited = new Promise((resolve) => sourceServer.once('exit', resolve));
  sourceServer.kill('SIGTERM');
  await Promise.race([exited, delay(3000)]);
  if (sourceServer.exitCode === null) {
    sourceServer.kill('SIGKILL');
    await Promise.race([exited, delay(1000)]);
  }
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
  assert.ok(value?.[elementKey], `${browserLabel} 找不到元素：${selector}`);
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
  assert.ok(['safari', 'firefox'].includes(browserName), '--browser 只支持 safari 或 firefox');
  assert.ok([100, 200].includes(zoomPercent), '--zoom 只支持 100 或 200');
  if (browserName === 'firefox') {
    assert.ok(browserBinary, 'Firefox 验收必须提供 --browser-binary=<Firefox 可执行文件>');
  }
  assert.ok(!checkA11y || !checkOffline, '--check-a11y 与 --check-offline 请分两次运行');
  if (offlineDir) {
    sourceServer = spawn('/usr/bin/python3', [
      '-m', 'http.server', String(offlinePort), '--bind', '127.0.0.1', '--directory', offlineDir,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    sourceServer.stderr.setEncoding('utf8');
    sourceServer.stderr.on('data', (chunk) => { sourceError += chunk; });
    await waitForSource(baseUrl);
  }
  if (checkOffline) {
    assert.ok(offlineDir, '--check-offline 必须同时提供 --offline-dir=<Jekyll 构建目录>');
  }

  const driverArgs = browserName === 'firefox'
    ? ['--port', String(port), '--log', 'error', '--allow-system-access']
    : ['-p', String(port)];
  driver = spawn(driverPath, driverArgs, {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  driver.stderr.setEncoding('utf8');
  driver.stderr.on('data', (chunk) => { driverError += chunk; });
  await waitForDriver();

  let session;
  try {
    const alwaysMatch = { browserName };
    if (browserName === 'firefox') {
      alwaysMatch['moz:firefoxOptions'] = {
        binary: browserBinary,
        prefs: {
          'browser.shell.checkDefaultBrowser': false,
          'browser.startup.homepage_override.mstone': 'ignore',
          'datareporting.policy.dataSubmissionEnabled': false,
          'toolkit.telemetry.reportingpolicy.firstRun': false,
        },
      };
    }
    session = await request('/session', {
      method: 'POST',
      body: { capabilities: { alwaysMatch } },
    });
  } catch (error) {
    if (/Allow remote automation/i.test(error.message)) {
      throw new Error('请先在 Safari → 设置 → 开发者中开启“允许远程自动化”，然后重跑本脚本。');
    }
    throw error;
  }
  sessionId = session.sessionId;
  assert.equal(String(session.capabilities.browserName).toLowerCase(), browserName);
  await request(`/session/${sessionId}/window/rect`, {
    method: 'POST',
    body: { x: 0, y: 0, width: windowWidth, height: windowHeight },
  });

  const url = new URL(baseUrl);
  url.searchParams.set('release-check', marker);
  if (checkOffline) url.searchParams.set('pwa-test', '1');
  await request(`/session/${sessionId}/url`, {
    method: 'POST',
    body: { url: url.href },
  });
  await waitFor(
    `return window.GuandanContract?.releaseMarker === ${JSON.stringify(marker)}`,
    `${browserLabel} 未加载 release marker ${marker}`,
  );
  await waitFor(
    `return document.body.classList.contains('gd-game-fullscreen')`,
    browserLabel + ' 主运行时尚未完成事件绑定',
  );

  let zoom = null;
  if (zoomPercent === 200) {
    const before = await execute(`return {
      innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio
    }`);
    assert.equal(browserName, 'firefox', '--zoom=200 当前只由 Firefox UI 自动化支持');
    // Firefox 138+ 要求 --allow-system-access 才能进入 chrome context。FullZoom 是
    // Firefox 浏览器前端本身的页面缩放实现，不是缩小 WebDriver 窗口的替代模拟。
    await request(`/session/${sessionId}/moz/context`, {
      method: 'POST',
      body: { context: 'chrome' },
    });
    await execute('FullZoom.setZoom(2.0); return true;');
    await request(`/session/${sessionId}/moz/context`, {
      method: 'POST',
      body: { context: 'content' },
    });
    await waitFor(
      `return innerWidth <= ${Math.floor(windowWidth * 0.58)}`,
      browserLabel + ' 没有进入 200% 页面缩放',
      5000,
    );
    const after = await execute(`return {
      innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio
    }`);
    zoom = { percent: zoomPercent, before, after };
  }

  const hasResume = await execute(`
    const el = document.querySelector('#gdResumeDiscard');
    const overlay = el?.closest('#gdResumeOverlay');
    return !!el && !!overlay && !overlay.hidden && overlay.getClientRects().length > 0 &&
      getComputedStyle(overlay).display !== 'none' && getComputedStyle(overlay).visibility !== 'hidden';
  `);
  if (hasResume) await click('#gdResumeDiscard');

  const readSegmentSelections = () => execute(`return [
    ['gdPgoPlayMode', 'selected'],
    ['gdPgoDiff', 'selected'],
    ['gdPgoCardSize', 'selected'],
    ['gdPgoTeamTrib', 'selected'],
    ['gdPgoScoreCap', 'selected'],
    ['gdPgoTurnSec', 'selected'],
    ['gdOnlineTabs', 'active'],
  ].map(([id, selectedClass]) => {
    const group = document.getElementById(id);
    const buttons = [...group.querySelectorAll('button')];
    return {
      id,
      label: group.getAttribute('aria-label'),
      pressed: buttons.filter(button => button.getAttribute('aria-pressed') === 'true').length,
      visual: buttons.filter(button => button.classList.contains(selectedClass)).length,
      synchronized: buttons.every(button =>
        (button.getAttribute('aria-pressed') === 'true') === button.classList.contains(selectedClass)),
    };
  })`);
  let segmentSelections = await readSegmentSelections();
  assert.ok(segmentSelections.every(group => group.label && group.pressed === 1 &&
    group.visual === 1 && group.synchronized),
  `${browserLabel} 设置分段按钮必须公开唯一且与视觉一致的 pressed 状态`);

  await click('#gdPgoDiff button[data-value="easy"]');
  await waitFor(`return document.querySelector('#gdPgoDiff [data-value="easy"]')?.getAttribute('aria-pressed') === 'true'`,
    `${browserLabel} 切换难度后没有更新 pressed 状态`, 2000);
  await click('#gdPgoDiff button[data-value="normal"]');
  await click('#gdPgoPlayMode button[data-playmode="online"]');
  await waitFor(`return document.querySelector('#gdPgoPlayMode [data-playmode="online"]')?.getAttribute('aria-pressed') === 'true' &&
    document.querySelector('#gdOnlineSetup')?.hidden === false`,
  `${browserLabel} 切换联机模式后没有更新 pressed 状态`, 2000);
  await click('#gdOnlineTabs button[data-tab="join"]');
  await waitFor(`return document.querySelector('#gdOnlineTabs [data-tab="join"]')?.getAttribute('aria-pressed') === 'true'`,
    `${browserLabel} 切换加入房间后没有更新 pressed 状态`, 2000);
  await click('#gdOnlineTabs button[data-tab="create"]');
  await click('#gdPgoPlayMode button[data-playmode="single"]');
  segmentSelections = await readSegmentSelections();
  assert.ok(segmentSelections.every(group => group.label && group.pressed === 1 &&
    group.visual === 1 && group.synchronized),
  `${browserLabel} 分段按钮往返切换后 pressed 状态与视觉不一致`);

  if (checkOffline) {
    await click('#gdOfflineCacheBtn');
    await waitFor(
      `return /当前档位基础资源已校验并缓存/.test(document.querySelector('#gdHardOfflineStatus')?.textContent || '')`,
      `${browserLabel} 普通档离线资源没有完成 hash 校验缓存`,
      30000,
    );
  }

  await click('#gdPgoDiff button[data-value="normal"]');
  await click('#gdPgoStart');
  await waitFor(
    `return document.querySelectorAll('#gdHand [role="button"][data-cid]').length === 27`,
    `${browserLabel} 开局后没有 27 张手牌`,
  );

  const avatarIcons = await execute(`return [1, 2, 3].map((seat) => {
    const avatar = document.querySelector('#gdAv' + seat);
    return {
      seat,
      iconHosts: avatar?.querySelectorAll('.gd-avatar-icon').length || 0,
      icons: avatar?.querySelectorAll('.gd-avatar-icon .zi-icon').length || 0,
      markerText: avatar?.textContent.includes('[[zi:') || false,
    };
  })`);
  assert.ok(avatarIcons.every((avatar) => avatar.iconHosts === 1 && avatar.icons === 1 && !avatar.markerText),
    `${browserLabel} 每个 AI 座位必须且只能渲染一个机器人图标`);

  const firstCard = '#gdHand [role="button"][data-cid]';
  await execute(`document.querySelector(${JSON.stringify(firstCard)})?.focus()`);
  await pressKey('\uE007');
  await waitFor(
    `return /已选中/.test(document.querySelector('#gdLiveRegion')?.textContent || '')`,
    `${browserLabel} 键盘选牌没有发布可听读的选中状态`,
    2000,
  );
  const keyboardSelected = await execute(`
    return document.querySelector('#gdHand [role="button"][data-cid]')?.getAttribute('aria-pressed') === 'true';
  `);
  assert.equal(keyboardSelected, true, `${browserLabel} Enter 键没有选中手牌`);
  const selectedAnnouncement = await execute(`return document.querySelector('#gdLiveRegion')?.textContent || ''`);
  await pressKey('\uE007');

  await click('#gdOrderBtn');
  const orderBefore = await execute(`
    return [...document.querySelectorAll('#gdHand .gd-rank-col')]
      .map((column) => column.querySelector('[role="button"][data-cid]')?.getAttribute('aria-label'));
  `);
  await click('#gdHand .gd-rank-col:first-child [role="button"][data-cid]:last-child');
  await click('#gdOrderRight');
  await waitFor(
    `return /已移动到第 2 列/.test(document.querySelector('#gdLiveRegion')?.textContent || '')`,
    `${browserLabel} 调整顺序没有发布移动完成状态`,
    2000,
  );
  const orderStatus = await execute(`return document.querySelector('#gdOrderStatus')?.textContent || ''`);
  const orderAfter = await execute(`
    return [...document.querySelectorAll('#gdHand .gd-rank-col')]
      .map((column) => column.querySelector('[role="button"][data-cid]')?.getAttribute('aria-label'));
  `);
  assert.match(orderStatus, /第 2 列/, `${browserLabel} 调整顺序没有移动到第二列`);
  assert.notDeepEqual(orderAfter, orderBefore, `${browserLabel} 调整顺序没有真实改变 DOM 牌列顺序`);

  await click('#gdBoardBtn');
  await waitFor(
    `return document.activeElement?.getAttribute('aria-label') === '关闭'`,
    `${browserLabel} dialog 打开后焦点没有落到关闭按钮`,
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
  assert.ok(dialogOpen.inertCount > 0, `${browserLabel} dialog 打开后背景没有 inert`);
  assert.equal(dialogOpen.bodyOverflow, 'hidden');

  await pressKey('\uE00C');
  await waitFor(
    `return document.activeElement?.id === 'gdBoardBtn'`,
    `${browserLabel} Escape 关闭后焦点没有回到榜单按钮`,
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
    `${browserLabel} 设置 dialog 打开后焦点没有落到返回按钮`,
    2000,
  );
  await pressKey('\uE00C');
  await waitFor(
    `return document.activeElement?.id === 'gdSettingsBtn'`,
    `${browserLabel} 设置 dialog 关闭后焦点没有回到设置按钮`,
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
    `${browserLabel} 退出确认 dialog 打开后焦点没有落到取消按钮`,
    2000,
  );
  await pressKey('\uE00C');
  await waitFor(
    `return document.activeElement?.id === 'gdExitBtn'`,
    `${browserLabel} 退出确认 dialog 关闭后焦点没有回到退出按钮`,
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
    const orderedToolbar = rects.slice().sort((a, b) => a.x - b.x);
    return {
      innerWidth,
      innerHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      compact: {
        headerHidden: getComputedStyle(document.querySelector('.guandan-wrap header h1')).display === 'none',
        oneClickSortHidden: getComputedStyle(document.querySelector('#gdSortBtn')).display === 'none',
        cardWidth: document.querySelector('#gdHand .gd-card')?.getBoundingClientRect().width || 0,
        tableBottom: document.querySelector('#gdTable').getBoundingClientRect().bottom,
        handBottom: document.querySelector('#gdHand').getBoundingClientRect().bottom,
      },
      toolbarGaps: orderedToolbar.slice(1).map((rect, index) => rect.x - orderedToolbar[index].right),
      rects,
    };
  `);
  assert.equal(layout.horizontalOverflow, false);
  assert.ok(layout.rects.every((rect) => rect.width >= 44 && rect.height >= 44));
  assert.ok(layout.toolbarGaps.every((gap) => gap >= 4));
  if (expectCompact) {
    assert.equal(layout.compact.headerHidden, true, '紧凑布局必须隐藏占高的桌面标题');
    assert.equal(layout.compact.oneClickSortHidden, true, '紧凑布局必须移除重复的一键理牌按钮');
    assert.ok(layout.compact.cardWidth >= 44, '紧凑布局牌面不能缩到无法辨认');
    assert.ok(layout.compact.tableBottom <= layout.innerHeight + 1, '紧凑牌桌不得被视口底部裁断');
    assert.ok(layout.compact.handBottom <= layout.innerHeight + 1, '紧凑手牌不得被视口底部裁断');
  }

  let reveal = null;
  if (checkReveal) {
    const debugEnabled = await execute('return window.GuandanDebug?.enabled === true;');
    assert.equal(debugEnabled, true,
      `${browserLabel} 局终展开回归只能在 localhost/127.0.0.1 的隔离测试站运行`);
    for (const key of ['d', 'b', 'u', 'g']) await pressKey(key);
    await waitFor(`return !!document.querySelector('#gdDbgRevealBtn')`, `${browserLabel} 本地调试台没有打开`, 2000);
    await execute(`document.querySelector('#gdDbgRevealBtn').click()`);
    for (const key of ['d', 'b', 'u', 'g']) await pressKey(key);
    await waitFor(`return !document.querySelector('#gdDbgPanel')`, `${browserLabel} 本地调试台没有收起`, 2000);
    const compactGallery = layout.innerWidth <= 700 || layout.innerHeight <= 400;
    await waitFor(
      compactGallery
        ? `return !document.querySelector('#gdRevealGallery').hidden &&
            document.querySelectorAll('#gdRevealGallery .gd-reveal-gallery-seat').length >= 3`
        : `return document.querySelectorAll('.gd-side > .gd-played.gd-revealing, .gd-center > .gd-played.gd-revealing').length === 3`,
      `${browserLabel} 局终剩余手牌没有进入专用展开槽`,
      2000,
    );
    if (compactGallery) {
      reveal = await execute(`
        const gallery = document.querySelector('#gdRevealGallery');
        const galleryRect = gallery.getBoundingClientRect();
        return [...gallery.querySelectorAll('.gd-reveal-gallery-seat')].map((section, index, all) => {
          const slot = section.querySelector('.gd-played');
          const rows = [...slot.querySelectorAll('.gd-reveal-row')];
          const cards = [...slot.querySelectorAll('.gd-reveal-row .gd-card')];
          const sectionRect = section.getBoundingClientRect();
          const cardRects = cards.map((card) => card.getBoundingClientRect());
          const left = Math.min(...cardRects.map((rect) => rect.left));
          const right = Math.max(...cardRects.map((rect) => rect.right));
          const top = Math.min(...cardRects.map((rect) => rect.top));
          const bottom = Math.max(...cardRects.map((rect) => rect.bottom));
          const rowWidths = rows.map((row) => {
            const rects = [...row.children].map((card) => card.getBoundingClientRect());
            return Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left));
          });
          return {
            label: section.querySelector('.gd-reveal-gallery-label')?.textContent || '',
            cards: cards.length,
            rows: rows.length,
            maxWidth: parseFloat(getComputedStyle(slot).getPropertyValue('--gd-reveal-max-w')),
            rowWidths,
            containedHorizontally: left >= sectionRect.left - 1 && right <= sectionRect.right + 1,
            containedVertically: top >= galleryRect.top - 1 && bottom <= galleryRect.bottom + 1,
            separatedFromNext: !all[index + 1] || sectionRect.right <= all[index + 1].getBoundingClientRect().left + 1,
          };
        });
      `);
      const expectedRows = reveal.length >= 4 ? 4 : 3;
      assert.ok(reveal.length >= 3, browserLabel + ' 紧凑摊牌画廊必须覆盖所有未出完玩家');
      assert.ok(reveal.every((item) => item.cards >= 20),
        browserLabel + ' 紧凑摊牌必须使用长手牌回归场景：' + JSON.stringify(reveal));
      assert.ok(reveal.every((item) => item.rows === expectedRows),
        browserLabel + ' 紧凑摊牌行数必须按玩家数自适应');
      assert.ok(reveal.every((item) => item.containedHorizontally && item.containedVertically && item.separatedFromNext),
        browserLabel + ' 紧凑摊牌不得裁切或覆盖相邻玩家：' + JSON.stringify(reveal));
      assert.ok(reveal.every((item) => item.rowWidths.every((width) => width <= item.maxWidth + 1)),
        browserLabel + ' 紧凑摊牌行不得超过玩家列宽：' + JSON.stringify(reveal));
    } else reveal = await execute(`return [1, 2, 3].map((seat) => {
      const slot = document.querySelector('#gdPlay' + seat);
      const rows = [...slot.querySelectorAll('.gd-reveal-row')];
      const cards = [...slot.querySelectorAll('.gd-reveal-row .gd-card')];
      const slotRect = slot.getBoundingClientRect();
      const cardRects = cards.map((card) => card.getBoundingClientRect());
      const top = Math.min(...cardRects.map((rect) => rect.top));
      const bottom = Math.max(...cardRects.map((rect) => rect.bottom));
      const rowWidths = rows.map((row) => {
        const rects = [...row.children].map((card) => card.getBoundingClientRect());
        return Math.max(...rects.map((rect) => rect.right)) - Math.min(...rects.map((rect) => rect.left));
      });
      return {
        seat,
        cards: cards.length,
        rows: rows.length,
        overflow: getComputedStyle(slot).overflow,
        slotHeight: slotRect.height,
        cardsTop: top,
        cardsBottom: bottom,
        containedVertically: top >= slotRect.top - 1 && bottom <= slotRect.bottom + 1,
        maxWidth: parseFloat(getComputedStyle(slot).getPropertyValue('--gd-reveal-max-w')),
        rowWidths,
      };
    })`);
    if (!compactGallery) {
      assert.ok(reveal.every((item) => item.cards >= 20),
        browserLabel + ' 局终长手牌回归必须让每个 AI 座位至少保留 20 张测试牌');
      assert.ok(reveal.every((item) => item.rows === 2), browserLabel + ' 局终摊牌行数必须匹配当前视口');
      assert.ok(reveal.every((item) => item.overflow === 'visible' && item.containedVertically),
        browserLabel + ' 局终摊牌不得被固定高度出牌槽裁断');
      assert.ok(reveal.every((item) => item.rowWidths.every((width) => width <= item.maxWidth + 1)),
        browserLabel + ' 局终摊牌不得超出为各座分配的横向区域：' + JSON.stringify(reveal));
    }
  }

  let a11y = null;
  if (checkA11y) {
    for (const key of ['t', 'e', 's', 't']) await pressKey(key);
    await waitFor(`return !!document.querySelector('#gdTestPanel')`, `${browserLabel} 无障碍测试台没有打开`, 2000);
    const timer = await execute(`
      const clock = document.querySelector('#gdSelfClock');
      return {
        hidden: clock.hidden,
        role: clock.getAttribute('role'),
        live: clock.getAttribute('aria-live'),
        atomic: clock.getAttribute('aria-atomic'),
        label: clock.getAttribute('aria-label'),
      };
    `);
    assert.equal(timer.hidden, false, `${browserLabel} 测试回合没有显示玩家倒计时`);
    assert.equal(timer.role, 'timer', '玩家倒计时必须向辅助技术公开为 timer');
    assert.equal(timer.live, 'off', '逐秒倒计时不得每秒打断读屏');
    assert.equal(timer.atomic, 'true');
    assert.match(timer.label, /你的出牌倒计时，剩余\d+秒/);

    await click('#gdAutopilotBtn');
    await waitFor(
      `return document.querySelector('#gdAutopilotBtn')?.getAttribute('aria-pressed') === 'true' &&
        /托管已开启/.test(document.querySelector('#gdLiveRegion')?.textContent || '')`,
      `${browserLabel} 托管开启后没有公开 pressed 状态和可听读提示`,
      2000,
    );
    const autopilotOn = await execute(`return {
      pressed: document.querySelector('#gdAutopilotBtn')?.getAttribute('aria-pressed'),
      label: document.querySelector('#gdAutopilotBtn')?.getAttribute('aria-label'),
      live: document.querySelector('#gdLiveRegion')?.textContent || '',
    }`);
    assert.match(autopilotOn.label, /托管已开启/);
    assert.match(autopilotOn.live, /托管已开启/);
    await click('#gdAutopilotBtn');
    await waitFor(
      `return document.querySelector('#gdAutopilotBtn')?.getAttribute('aria-pressed') === 'false'`,
      `${browserLabel} 托管取消后没有公开 pressed 状态`,
      2000,
    );
    const autopilotOff = await execute(`return {
      pressed: document.querySelector('#gdAutopilotBtn')?.getAttribute('aria-pressed'),
      label: document.querySelector('#gdAutopilotBtn')?.getAttribute('aria-label'),
    }`);
    assert.match(autopilotOff.label, /托管未开启/);

    await execute(`
      [...document.querySelectorAll('#gdTestPanel button')]
        .find((button) => button.textContent.trim() === '结算面板')?.click();
    `);
    await waitFor(
      `return document.querySelector('#gdRoundOverlay')?.classList.contains('open') &&
        /本小局我方获胜/.test(document.querySelector('#gdLiveRegion')?.textContent || '')`,
      `${browserLabel} 小局结算没有发布可听读结果`,
      2000,
    );
    const settlement = await execute(`return {
      dialog: document.querySelector('#gdRoundOverlay')?.getAttribute('role'),
      labelledBy: document.querySelector('#gdRoundOverlay')?.getAttribute('aria-labelledby'),
      title: document.querySelector('#gdRoundTitle')?.textContent || '',
      live: document.querySelector('#gdLiveRegion')?.textContent || '',
      focus: document.activeElement?.id || '',
    }`);
    assert.equal(settlement.dialog, 'dialog');
    assert.equal(settlement.labelledBy, 'gdRoundTitle');
    assert.equal(settlement.title, '本小局我方获胜');
    assert.match(settlement.live, /本小局我方获胜.*你头游.*升到3级/);
    assert.equal(settlement.focus, 'gdRoundNext');
    a11y = { timer, autopilotOn, autopilotOff, settlement };
  }

  let offline = null;
  if (checkOffline) {
    const serviceWorker = await execute(`return {
      controlled: !!navigator.serviceWorker?.controller,
      scriptURL: navigator.serviceWorker?.controller?.scriptURL || '',
    }`);
    assert.equal(serviceWorker.controlled, true,
      browserLabel + ' 离线承诺前当前页面必须已被 Service Worker 接管');
    await stopSourceServer();
    let sourceDown = false;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await fetch(baseUrl, { cache: 'no-store', signal: AbortSignal.timeout(500) });
      } catch (_) {
        sourceDown = true;
        break;
      }
      await delay(100);
    }
    assert.equal(sourceDown, true, `${browserLabel} 离线回归前本机源站仍可连接`);

    if (browserName === 'firefox') {
      const previousTimeOrigin = await execute('return performance.timeOrigin;');
      await execute('location.reload(); return true;');
      await waitFor(
        `return performance.timeOrigin !== ${previousTimeOrigin} && document.readyState === 'complete' &&
          !!document.querySelector('#gdPgoStart')`,
        'Firefox 断源后没有完成新的 Service Worker 文档导航',
      );
    } else await request(`/session/${sessionId}/refresh`, { method: 'POST', body: {} });
    await waitFor(
      `return window.GuandanContract?.releaseMarker === ${JSON.stringify(marker)}`,
      `${browserLabel} 断源后没有从 Service Worker 重载 release marker`,
    );
    await waitFor(
      `return document.body.classList.contains('gd-game-fullscreen')`,
      `${browserLabel} 断源后主运行时没有恢复`,
    );
    const hasOfflineResume = await execute(`
      const el = document.querySelector('#gdResumeDiscard');
      const overlay = el?.closest('#gdResumeOverlay');
      return !!el && !!overlay && !overlay.hidden && overlay.getClientRects().length > 0 &&
        getComputedStyle(overlay).display !== 'none' && getComputedStyle(overlay).visibility !== 'hidden';
    `);
    if (hasOfflineResume) await click('#gdResumeDiscard');
    await click('#gdPgoDiff button[data-value="normal"]');
    await click('#gdPgoStart');
    await waitFor(
      `return document.querySelectorAll('#gdHand [role="button"][data-cid]').length === 27`,
      `${browserLabel} 断源重载后普通档没有开出 27 张牌`,
    );
    const normalHandCount = await execute(
      `return document.querySelectorAll('#gdHand [role="button"][data-cid]').length`,
    );

    await click('#gdExitBtn');
    await waitFor(
      `return document.querySelector('#gdConfirmExit')?.hidden === false`,
      `${browserLabel} 离线牌局没有打开退出确认`,
      2000,
    );
    await click('#gdConfirmExitOk');
    await waitFor(
      `return document.querySelector('#gdPgo')?.classList.contains('open') === true`,
      `${browserLabel} 离线牌局退出后没有返回设置页`,
      2000,
    );
    await click('#gdPgoDiff button[data-value="hard"]');
    await waitFor(
      `return /完成前不承诺离线/.test(document.querySelector('#gdHardOfflineStatus')?.textContent || '')`,
      `${browserLabel} 未缓存高手模型时错误承诺离线`,
      2000,
    );
    const hardStatus = await execute(
      `return document.querySelector('#gdHardOfflineStatus')?.textContent || ''`,
    );
    await click('#gdPgoStart');
    await waitFor(
      `return /下载失败/.test(document.querySelector('#gdPgoStart')?.textContent || '')`,
      `${browserLabel} 断源时高手档没有保持模型下载阻断`,
      15000,
    );
    const hardButton = await execute(`return document.querySelector('#gdPgoStart')?.textContent || ''`);
    const hardHandCount = await execute(
      `return document.querySelectorAll('#gdHand [role="button"][data-cid]').length`,
    );
    assert.equal(hardHandCount, 0, `${browserLabel} 高手模型不可用时不得静默降级并发牌`);
    offline = { serviceWorker, sourceDown, normalHandCount, hardStatus, hardButton, hardHandCount };
  }

  if (screenshotPath) {
    const screenshot = await request(`/session/${sessionId}/screenshot`);
    await writeFile(screenshotPath, screenshot, 'base64');
  }

  console.log(JSON.stringify({
    ok: true,
    browser: session.capabilities.browserVersion,
    platform: session.capabilities.platformName,
    marker,
    browserName,
    segmentSelections,
    window: { width: windowWidth, height: windowHeight, expectCompact, zoomPercent },
    zoom,
    handCount: 27,
    avatarIcons,
    keyboardSelected,
    selectedAnnouncement,
    orderStatus,
    orderBefore: orderBefore.slice(0, 3),
    orderAfter: orderAfter.slice(0, 3),
    dialogOpen,
    dialogClosed,
    settingsDialog,
    exitDialog,
    layout,
    reveal,
    a11y,
    offline,
    checkedThisRun: { a11y: checkA11y, offline: checkOffline, reveal: checkReveal },
    pendingManual: browserName === 'safari' ? ['VoiceOver'] : [],
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
      const failurePath = `/tmp/guandan-${browserName}-failure.png`;
      await writeFile(failurePath, screenshot, 'base64');
      console.error('失败截图：' + failurePath);
    } catch {}
  }
  process.exitCode = 1;
} finally {
  if (sessionId) {
    await request(`/session/${sessionId}`, { method: 'DELETE', allowError: true }).catch(() => {});
  }
  await stopSourceServer();
  if (sourceError.trim() && process.exitCode) console.error(sourceError.trim());
  if (driver && !driver.killed) driver.kill('SIGTERM');
}
