import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('../../toolbox/doudizhu/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../../assets/css/doudizhu.css', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
const offline = fs.readFileSync(new URL('../../assets/js/doudizhu/offline.js', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test('Gate 6 removes forced orientation and keeps portrait gameplay responsive', () => {
  assert.doesNotMatch(page, /ddz-rotate-hint/);
  assert.match(css, /竖屏是真正可玩的紧凑三角桌/);
  assert.match(css, /orientation:\s*portrait[\s\S]*max-width:\s*600px/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /min-height:\s*max\(510px,\s*calc\(100dvh - 55px\)\)/);
});

test('Gate 6 exposes persistent navigation, dialog semantics and live state', () => {
  assert.match(page, /id="ddzExitBtn"[^>]+aria-label="退出斗地主并返回百宝箱"/);
  assert.match(page, /id="ddzTurnAnnounce"[^>]+aria-live="polite"/);
  assert.match(page, /id="ddzA11yLive"[^>]+aria-live="polite"/);
  assert.match(page, /<dialog class="ddz-board-modal" id="ddzBoardModal"[^>]+aria-labelledby=/);
  assert.match(page, /id="ddzGameOverOverlay"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(ui, /dialogFocusable/);
  assert.match(ui, /showModal/);
  assert.match(ui, /event\.key === 'Escape'/);
  assert.match(ui, /restoreDialogFocus/);
  assert.match(ui, /const dialogs = \[ddzBoardModal, gameOverOverlay\]/,
    '斗地主焦点陷阱只能管理自己的对话框');
  assert.doesNotMatch(ui, /querySelectorAll\('\[role="dialog"\]'\)/,
    '不得把站点级搜索或小助手的隐藏 dialog 误判为打开');
});

test('Gate 6 hand uses roving tabindex and named multi-selection', () => {
  assert.match(page, /id="ddzHand"[^>]+role="listbox"[^>]+aria-multiselectable="true"/);
  assert.match(ui, /role', 'option'/);
  assert.match(ui, /aria-label', cardAriaLabel\(c\)/);
  assert.match(ui, /aria-selected/);
  assert.match(ui, /ArrowRight/);
  assert.match(ui, /Home/);
  assert.match(ui, /setRovingCard/);
});

test('Gate 6 meets target-size, focus, reduced-motion and confirmation contracts', () => {
  assert.match(css, /\.ddz-actions \.ddz-btn,[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.ddz-bid-buttons button,[\s\S]*\.ddz-lobby-actions \.ddz-btn \{ min-height:\s*44px; \}/);
  assert.match(css, /@media \(pointer:\s*coarse\)[\s\S]*min-height:\s*44px/);
  assert.match(css, /:focus-visible[\s\S]*outline:\s*3px solid/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(ui, /!REDUCED_MOTION && navigator\.vibrate/);
  assert.match(ui, /确定离开当前房间吗/);
  assert.match(ui, /确定把这位玩家移出房间吗/);
});

test('Gate 6 light and dark table palettes exceed WCAG AA body contrast', () => {
  for (const [foreground, background] of [
    ['#1f2a3d', '#ebe5d3'],
    ['#5d594f', '#ebe5d3'],
    ['#fff8e8', '#29261f'],
    ['#ddd3bf', '#29261f'],
    ['#8b2e2e', '#f5f4f0'],
    ['#1a1a2e', '#f5f4f0'],
  ]) assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background}`);
});

test('Gate 6 offline upgrade replaces a previously saved HTML shell', () => {
  assert.match(offline, /new MessageChannel\(\)/);
  assert.match(offline, /type:\s*'SAVE_OFFLINE'[\s\S]*force:\s*true[\s\S]*silent:\s*true/);
  assert.match(offline, /data\.type !== 'SAVE_DONE'/);
  assert.match(serviceWorker, /DDZ_SAVED_MIGRATION\s*=\s*'\/__zircon_migrations__\/doudizhu-20260801g8c'/);
  assert.match(serviceWorker, /await migrateSavedDoudizhu\(\)/);
  assert.match(serviceWorker, /fetchBundle\('\/toolbox\/doudizhu\/'[\s\S]*force:\s*true/);
});
