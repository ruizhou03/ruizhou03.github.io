import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Gate 7 leaderboard is four-level, weighted, and online read-only', async () => {
  const leaderboard = await read('assets/js/games-shell/wins-leaderboard.js');
  const ui = await read('assets/js/doudizhu/ui.js');
  assert.match(leaderboard, /levels: \['master', 'hard', 'normal', 'easy'\]|\['master', 'hard', 'normal', 'easy'\]/);
  assert.match(leaderboard, /score: payload\.score/);
  assert.match(ui, /gameId: 'doudizhu-online'/);
  assert.match(ui, /levels: \['master', 'hard', 'normal', 'easy'\]/);
  assert.doesNotMatch(ui, /tryAutoSubmitOnline/);
  assert.doesNotMatch(ui, /WinsLeaderboard\.submit\(\{[\s\S]{0,200}gameId: 'doudizhu-online'/);
  assert.doesNotMatch(ui, /pairText/);
});

test('Gate 7 rules, discovery metadata and install assets are complete', async () => {
  const page = await read('toolbox/doudizhu/index.html');
  const rules = await read('assets/js/doudizhu/rules-content.js');
  const toolbox = await read('_data/toolbox.yml');
  const manifest = JSON.parse(await read('toolbox/doudizhu/manifest.json'));
  assert.match(page, /description: "免费斗地主/);
  assert.match(page, /image: \/assets\/images\/doudizhu-og\.png/);
  assert.match(page, /manifest: \/toolbox\/doudizhu\/manifest\.json/);
  assert.match(page, /id="ddzRulesContent"/);
  assert.match(rules, /ddz-rules-cn-2026-08-v1/);
  assert.match(rules, /结算框只显示每名玩家本盘净分/);
  assert.match(toolbox, /四档 AI · 三人真联机/);
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const path of [
    'assets/images/doudizhu-og.png',
    'assets/icons/doudizhu-icon-512.png',
    'assets/icons/doudizhu-icon-maskable-512.png',
    'assets/icons/doudizhu-apple-touch-icon.png',
  ]) assert.ok((await stat(new URL(`../../${path}`, import.meta.url))).size > 1000, path);
});

test('Gate 7 model provenance and offline bundle remain reproducible', async () => {
  const notice = await read('assets/js/doudizhu/THIRD_PARTY_MODELS.md');
  const build = await read('tools/doudizhu/MODEL_BUILD.md');
  const modelManifest = JSON.parse(await read('assets/js/doudizhu/model-manifest.json'));
  const offline = JSON.parse(await read('toolbox/doudizhu/offline-assets.json'));
  assert.match(notice, /license/i);
  assert.match(build, /sha-?256/i);
  assert.ok(Object.keys(modelManifest).length > 0);
  assert.equal(offline.version, '20260801g7a');
  assert.ok(offline.core.some(asset => asset.url.includes('rules-content.js?v=20260801g7a')));
});
