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

test('online gameplay commands use one idempotent envelope and signed settlement fields', async () => {
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  assert.match(
    ui,
    /async function onlineCommand\(action, payload\)[\s\S]*?commandId: newOnlineCommandId\(\)[\s\S]*?expectedVersion: state\.online\.lastVersion/,
  );
  assert.match(
    ui,
    /result\.error === 'timeout' \|\| result\.error === 'network_error'[\s\S]*?apiCall\(action, \{ token: state\.online\.token, body \}\)/,
  );
  for (const action of ['start', 'bid', 'double', 'play', 'pass', 'rematch']) {
    assert.match(ui, new RegExp(`onlineCommand\\('${action}'`));
  }
  assert.doesNotMatch(ui, /apiCall\('(start|bid|double|play|pass|rematch)'/);
  assert.match(ui, /state\.result\.roundDeltasByPlayer \|\| state\.result\.deltasByPlayer/);
});

test('online turn rendering restores the human play controls', async () => {
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  assert.match(
    ui,
    /state\.phase === PHASE\.PLAYING[\s\S]*?const meTurn = state\.turnIdx === 0;[\s\S]*?playBtn\.hidden = !meTurn;[\s\S]*?hintBtn\.hidden = !meTurn;[\s\S]*?updatePlayBtnState\(\);[\s\S]*?refreshNoPlayState\(\);/,
  );
});

test('online rematch clears settlement UI on every client', async () => {
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  assert.match(
    ui,
    /state\.online\.lastSrvState = 'playing';[\s\S]*?srv\.phase !== 'settlement'[\s\S]*?gameOverOverlay\.classList\.remove\('show', 'has-spring'\)/,
  );
});
