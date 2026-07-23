import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const E = require('../../assets/js/doudizhu/engine.js');
const { registerCoreContractTests } = require('./core-contract.cjs');

registerCoreContractTests(E, {
  enginePath: new URL('../../assets/js/doudizhu/engine.js', import.meta.url),
  manifestPath: new URL('./core-manifest.json', import.meta.url),
});

test('settlement controls have one event-binding path and status is visible', async () => {
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../../toolbox/doudizhu/index.html', import.meta.url), 'utf8');
  assert.equal((ui.match(/ddzPlayAgainBtn'\)\.addEventListener/g) || []).length, 1);
  assert.equal((ui.match(/ddzBackToSetupBtn'\)\.addEventListener/g) || []).length, 1);
  assert.doesNotMatch(ui, /playAgainBtn\.onclick|backBtn\.onclick/);
  assert.match(page, /id="ddzStatusMsg"[^>]*role="status"[^>]*aria-live="polite"/);
});

test('browser play and pass mutations route through canonical applyAction', async () => {
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /function applyCoreAction\(command\)[\s\S]*?E\.applyAction\(coreState,/);
  assert.match(ui, /function commitPlay\(seat, pattern\)[\s\S]*?applyCoreAction\(\{ type: 'play'/);
  assert.match(ui, /function commitPass\(seat\)[\s\S]*?applyCoreAction\(\{ type: 'pass'/);
  assert.doesNotMatch(ui, /state\.hands\[seat\]\s*=\s*validated\.remaining/);
});
