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
assert.ok(html.indexOf('/assets/js/games/picker-core.js') < html.indexOf('/assets/js/games/picker.js'), 'core script must load before UI script');

function pngSize(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

assert.deepEqual(pngSize(path.join(root, 'assets/icons/picker-icon-192.png')), [192, 192]);
assert.deepEqual(pngSize(path.join(root, 'assets/images/picker-og.png')), [1200, 630]);

const uiSource = fs.readFileSync(path.join(root, 'assets/js/games/picker.js'), 'utf8');
for (const line of uiSource.split('\n').filter(line => line.includes('lastResultText ='))) {
  assert.ok(!line.includes('[[zi:'), 'copied result text must not contain icon markers');
}

console.log(`picker markup: ${ids.length} unique ids and 16 contract checks passed`);
