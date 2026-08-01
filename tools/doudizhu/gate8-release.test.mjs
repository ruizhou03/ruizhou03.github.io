import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Gate 8 exposes the approved Master online tier and final release marker', async () => {
  const page = await read('toolbox/doudizhu/index.html');
  const offline = JSON.parse(await read('toolbox/doudizhu/offline-assets.json'));
  assert.match(page, /<option value="master">大神<\/option>/);
  assert.doesNotMatch(page, /大神（联机维护中）/);
  assert.match(page, /rules-content\.js\?v=20260801g8a/);
  assert.equal(offline.version, '20260801g8a');
});
