import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Gate 8 exposes the approved Master online tier and final release marker', async () => {
  const page = await read('toolbox/doudizhu/index.html');
  const ui = await read('assets/js/doudizhu/ui.js');
  const offline = JSON.parse(await read('toolbox/doudizhu/offline-assets.json'));
  const evidence = await read('docs/doudizhu-gate8-release.md');
  assert.match(page, /<option value="master">大神<\/option>/);
  assert.doesNotMatch(page, /大神（联机维护中）/);
  assert.match(page, /rules-content\.js\?v=20260801g8c/);
  assert.equal(offline.version, '20260801g8c');
  assert.match(evidence, /6c6d9069511103c70b3e77ffab2da0fefd83eb30/);
  assert.match(evidence, /flyctl releases rollback 149 -a zircon-urge/);
  assert.match(ui, /state\.online\.isHost && state\.result && state\.result\.gameEnded/);
  assert.match(ui, /\{ dissolveOnLeave: true, purgeCompleted: true \}/,
    '最终结算后房主退出必须同步清理房间与 fence');
});
