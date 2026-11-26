'use strict';
/* 百变小咪自带字体查漏字：游戏代码里出现的每个字都要在 assets/fonts/zhamao/charset.txt 里（= 已截进 zm-serif-*.woff2）。
 * 失败 = 有人加了新字（改牌名、加按钮、加台词……）没重跑字体脚本，新字会退回系统字体、和别的字长得不一样。
 * 修法：python3 scripts/zhamao-fonts.py  （见脚本开头说明） */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// 和 scripts/zhamao-fonts.py 的 SOURCES 保持一致
const SOURCES = fs.readdirSync(path.join(ROOT, 'assets/js/games')).filter((f) => /^zhamao.*\.js$/.test(f)).sort().map((f) => 'assets/js/games/' + f)
  .concat(['assets/js/games/gongzhu-avatars.js', 'assets/js/games/gongzhu-social.js', 'assets/js/games/games-fx.js',
    'assets/js/games-shell/identity.js', 'assets/js/auth/auth.js', '_includes/auth.html',
    'assets/css/zhamao.css', 'toolbox/puffcat/index.html']);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

test('游戏里用到的字都截进了自带字体', () => {
  const have = new Set(fs.readFileSync(path.join(ROOT, 'assets/fonts/zhamao/charset.txt'), 'utf8'));
  const missing = {};
  for (const f of SOURCES) {
    for (const ch of strip(fs.readFileSync(path.join(ROOT, f), 'utf8'))) {
      if (ch.codePointAt(0) > 127 && !/\s/.test(ch) && !have.has(ch)) (missing[ch] = missing[ch] || new Set()).add(f);
    }
  }
  const list = Object.keys(missing).map((ch) => ch + '（' + [...missing[ch]].join('、') + '）');
  assert.equal(list.length, 0, '自带字体缺字，跑 python3 scripts/zhamao-fonts.py 重截：\n' + list.join('\n'));
});

test('字体文件都在', () => {
  for (const f of ['zm-serif-400.woff2', 'zm-serif-700.woff2', 'zm-num-700.woff2']) {
    assert.ok(fs.statSync(path.join(ROOT, 'assets/fonts/zhamao', f)).size > 1000, f);
  }
});
