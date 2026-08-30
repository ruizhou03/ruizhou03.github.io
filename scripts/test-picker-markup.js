#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, '_site/toolbox/picker/index.html');
assert.ok(fs.existsSync(htmlPath), 'run Jekyll build before this test');
const html = fs.readFileSync(htmlPath, 'utf8');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML ids must be unique');

for (const [, target] of html.matchAll(/\sfor="([^"]+)"/g)) {
  assert.ok(ids.includes(target), `label target #${target} must exist`);
}
for (const [, targets] of html.matchAll(/\saria-controls="([^"]+)"/g)) {
  for (const target of targets.split(/\s+/)) assert.ok(ids.includes(target), `aria-controls target #${target} must exist`);
}

assert.ok(html.includes('免费在线随机转盘'), 'picker-specific meta description must be rendered');
assert.ok(html.includes('https://ruizhou03.com/assets/images/picker-og.png'), 'picker-specific OG image must be rendered');
assert.ok(html.includes('<body class="is-toolbox picker-page-body">'), 'picker body class must widen the outer site canvas');
assert.ok(html.includes('<div class="picker-workspace">'), 'picker workspace must not be a nested main element');
assert.ok(!html.includes('<main class="picker-workspace">'), 'nested main would reapply global layout spacing');
const editorPosition = html.indexOf('class="picker-panel picker-editor"');
const drawPosition = html.indexOf('class="picker-panel picker-draw"');
const modePosition = html.indexOf('class="picker-panel picker-mode-panel"');
assert.ok(editorPosition > 0 && editorPosition < modePosition && modePosition < drawPosition, 'reading order must render as 01 options, 02 mode, 03 result');
assert.ok(html.indexOf('id="spin-btn"') > modePosition && html.indexOf('id="spin-btn"') < drawPosition, 'primary draw action must live in the mode column');
assert.ok(html.includes('id="result-placeholder"'), 'result column must reserve a non-overlay result slot');
assert.ok(!html.includes('关闭时每个选项机会相同'), 'custom weight switch must not include redundant helper copy');
assert.ok(html.includes('class="picker-round-custom"'), 'custom round count must keep its unit inside one control');
assert.ok(html.includes('class="picker-weight-control"'), 'custom weight switch must be directly accessible');
assert.ok(!html.includes('id="advanced-settings"'), 'custom weight switch must not be nested behind advanced settings');
assert.ok(html.includes('id="bulk-panel" role="dialog"'), 'bulk paste must use dialog semantics');
assert.ok(html.includes('id="bulk-close-btn" aria-label="关闭批量粘贴"'), 'bulk paste dialog must expose an explicit close button');
assert.ok(html.includes('id="mobile-weight-toggle"') && html.includes('aria-expanded="false"'), 'mobile picker must expose a collapsed advanced-weight control');
assert.ok(!html.includes('id="mode-probability-copy"'), 'mode column must not repeat immutable probability text');
assert.ok(!html.includes('id="probability-label"'), 'result column must not repeat immutable probability text');
const coreScriptPosition = html.indexOf('/assets/js/games/picker-core.js');
const cardScriptPosition = html.indexOf('/assets/js/games/picker-result-card.js');
const uiScriptPosition = html.indexOf('/assets/js/games/picker.js');
assert.ok(coreScriptPosition < cardScriptPosition && cardScriptPosition < uiScriptPosition, 'core and result-card scripts must load before UI script');

function pngSize(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

assert.deepEqual(pngSize(path.join(root, 'assets/icons/picker-icon-192.png')), [192, 192]);
assert.deepEqual(pngSize(path.join(root, 'assets/images/picker-og.png')), [1200, 630]);

const uiSource = fs.readFileSync(path.join(root, 'assets/js/games/picker.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'assets/css/picker.css'), 'utf8');
const cCssSource = fs.readFileSync(path.join(root, 'assets/css/picker-c-preview.css'), 'utf8');
assert.ok(!cssSource.includes('.picker-page::before'), 'result column must not include a decorative background 03');
assert.ok(html.includes('id="profiles-trigger"') && html.includes('id="history-trigger"'), 'archive and history must use explicit header triggers');
assert.ok(html.includes('id="library-flyout"') && html.includes('id="library-search"'), 'library popover must include its own search field');
assert.match(cCssSource, /H1 library direction:[\s\S]*\.picker-library-flyout\{height:min\(520px/, 'H1 library popover must use the approved comfortable height');
assert.match(cCssSource, /\.picker-profile-list,\.picker-history-list\{grid-auto-rows:minmax\(68px,auto\)/, 'H1 library rows must remain 68px tall');
assert.match(cCssSource, /Final interaction polish\.[\s\S]*\.picker-c-page \.picker-wheel\{border:0\}/, 'wheel must not regain the redundant outer border');
assert.match(cCssSource, /Give the manifesto[\s\S]*min-height:132px;flex:0 0 132px;margin-bottom:12px/, 'manifesto must reserve enough space above the mode heading');
assert.match(cCssSource, /Anchor bulk paste[\s\S]*\.picker-c-page \.picker-editor\{position:relative\}/, 'bulk paste must anchor to the editor column');
assert.match(cCssSource, /\.picker-c-page \.picker-bulk::after\{/, 'bulk paste dialog must retain its anchored caret');
assert.ok(uiSource.includes("openLibrary('profiles'") && uiSource.includes("openLibrary('history'"), 'both triggers must open the shared anchored popover');
assert.ok(uiSource.includes("document.addEventListener('pointerdown'"), 'clicking outside must close the library popover');
assert.ok(uiSource.includes('!el.bulkPanel.contains(event.target)') && uiSource.includes('closeBulkPanel()'), 'clicking outside must close the bulk paste dialog');
assert.ok(uiSource.includes('el.metricSwitch.hidden = !hasVotes'), 'vote metric switch must stay hidden until a tournament result exists');
assert.ok(uiSource.includes('state.mobileWeightsExpanded') && uiSource.includes("'加权设置'"), 'mobile picker must default to compact equal weights');
assert.ok(uiSource.includes('mobileOptionDensity') && uiSource.includes("state.mobileLayout ? '+ 添加'"), 'mobile option density and compact add label must be maintained');
assert.ok(uiSource.includes("Core.equalize(state.options)") && uiSource.includes('已恢复等概率并收起加权设置'), 'closing mobile weights must restore equal probabilities');
assert.ok(uiSource.includes('function routineToast(message)') && uiSource.includes("routineToast('已删除“'"), 'mobile routine actions must avoid redundant toast feedback');
assert.ok(uiSource.includes("window.matchMedia('(max-width: 720px)')") && uiSource.includes('el.draw.scrollIntoView'), 'mobile draw must bring the wheel into view');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*grid-template-areas:"draw" "editor" "mode"/, 'final mobile canvas must integrate wheel, options, and mode controls in one screen');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*body\.picker-page-body\{overflow:hidden/, 'final mobile canvas must remain a single-screen app');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*\.picker-c-page \.picker-draw\{[\s\S]*background:#fff8d9/, 'mobile wheel stage must share the unified cream canvas');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*\.picker-c-page \.picker-result-placeholder\{display:none\}/, 'mobile idle wheel must not reserve explanatory copy');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*\.picker-c-page \.picker-weight-control,[\s\S]*position:absolute/, 'mobile equal-weight action must live beside the options heading');
assert.match(cCssSource, /data-mobile-weights="collapsed"[\s\S]*\.picker-wheel-wrap/, 'compact equal-weight mode must return space to the wheel');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*#bulk-toggle-btn\{display:none\}/, 'mobile lightweight mode must omit bulk paste');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*#add-btn\{[\s\S]*position:absolute/, 'mobile add action must live beside the options heading');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*#add-btn\{[\s\S]*display:grid!important;[\s\S]*place-items:center/, 'mobile add glyph must stay optically centered');
assert.match(cCssSource, /--picker-mobile-options-title-center:24px[\s\S]*top:var\(--picker-mobile-options-title-center\)/, 'mobile title actions must share one vertical center line');
assert.match(cCssSource, /data-mobile-option-density="large"[\s\S]*top:-90px/, 'large mobile lists must reclaim unused wheel-stage space');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*\.picker-library-flyout\{[\s\S]*position:fixed/, 'mobile archive and history must use a compact bottom sheet');
assert.match(cCssSource, /Mobile integrated canvas:[\s\S]*grid-template-rows:minmax\(200px,1fr\) 146px auto/, 'mobile weight expansion must not resize the wheel or mode regions');
assert.ok(uiSource.includes('skipAll: true') && uiSource.includes('已跳至最终结果'), 'tournament skip must jump to the final result');
assert.ok(html.includes('id="rounds-custom" min="1"'), 'tournament custom rounds must allow one round');
for (const line of uiSource.split('\n').filter(line => line.includes('lastResultText ='))) {
  assert.ok(!line.includes('[[zi:'), 'copied result text must not contain icon markers');
}

console.log(`picker markup: ${ids.length} unique ids and 29 contract checks passed`);
