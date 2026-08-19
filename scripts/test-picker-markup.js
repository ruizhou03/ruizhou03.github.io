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

console.log(`picker markup: ${ids.length} unique ids and 10 contract checks passed`);
