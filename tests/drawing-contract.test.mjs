import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const protocolSource = readFileSync(new URL('../assets/js/drawing/protocol.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../assets/js/drawing/drawing.js', import.meta.url), 'utf8');
const iconSource = readFileSync(new URL('../assets/js/games/drawing-icons.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../toolbox/drawing/index.html', import.meta.url), 'utf8');

test('drawing scripts remain valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(protocolSource));
  assert.doesNotThrow(() => new vm.Script(clientSource));
  assert.doesNotThrow(() => new vm.Script(iconSource));
});

test('protocol keeps credentials in bearer headers and reuses the same serialized POST body', () => {
  assert.match(protocolSource, /const LOCAL_API_OVERRIDE = localCandidate/);
  assert.match(protocolSource, /headers\.Authorization = `Bearer \$\{opts\.token\}`/);
  assert.doesNotMatch(protocolSource, /searchParams\.set\(['"]token/);
  assert.match(protocolSource, /fetchOptions\.body = JSON\.stringify\(opts\.body \|\| \{\}\)/);
  assert.match(protocolSource, /for \(let attempt = 0; attempt < attempts; attempt\+\+\)/);
  assert.doesNotMatch(clientSource, /playerToken|draw:session\.v1'\)/);
});

test('all mutations carry protocol and replay identity through one ordered queue', () => {
  assert.match(clientSource, /mutationChain\.catch\(\(\) => \{\}\)\.then\(run\)/);
  assert.match(clientSource, /requestId = opts\.requestId \|\| state\.uncertainMutations\.get\(replayKey\) \|\| Protocol\.newRequestId\(action\)/);
  assert.match(clientSource, /state\.uncertainMutations\.get\(replayKey\)/);
  assert.match(clientSource, /state\.uncertainMutations\.delete\(replayKey\)/);
  assert.match(clientSource, /enqueueMutation\('stroke'.*expectedVersion: false/);
  assert.match(clientSource, /enqueueMutation\('clear'.*roundId/);
  assert.match(clientSource, /enqueueMutation\('undo'.*roundId/);
  assert.match(clientSource, /Date\.now\(\) - strokeStartedAt >= 250/);
});

test('state polling preserves private credentials, resumes securely, and uses server time', () => {
  assert.match(clientSource, /token: state\.session\.accessToken/);
  assert.match(clientSource, /resumeSecret: session\.resumeSecret/);
  assert.match(clientSource, /state\.serverOffsetMs = r\.serverTs - Date\.now\(\)/);
  assert.match(clientSource, /document\.hidden\) await sleep\(6000\)/);
});

test('stroke-only updates avoid whole-view replacement and drafts survive structural renders', () => {
  assert.match(clientSource, /signature === state\.lastUiSignature.*redrawCanvas\(\)/s);
  assert.match(clientSource, /const draft = previousInput \? previousInput\.value : ''/);
  assert.match(clientSource, /input\.value = draft/);
  assert.match(clientSource, /state\.currentStroke.*state\.deferredRender = true/s);
});

test('round settings are per player and rematch preserves the room', () => {
  assert.match(clientSource, /roundsPerPlayer: 1/);
  assert.match(clientSource, /每人作画次数/);
  assert.doesNotMatch(clientSource, /totalRounds/);
  assert.match(clientSource, /enqueueMutation\('rematch'\)/);
  const rematchBody = clientSource.match(/async function doRematch\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
  assert.doesNotMatch(rematchBody, /dissolve|saveSession\(null\)/);
});

test('approved room flow uses four words, bounded refreshes, automatic hints, and live round deltas', () => {
  assert.match(clientSource, /enqueueMutation\('refreshwords'.*wordChoiceSetId/s);
  assert.match(clientSource, /wordRefreshesLeft/);
  assert.match(clientSource, /wordChoiceSetId/);
  assert.match(clientSource, /wordHint\.revealed/);
  assert.match(clientSource, /wordHint\.category/);
  assert.match(clientSource, /roundDelta/);
  assert.match(clientSource, /roundStatus/);
  assert.match(clientSource, /rank/);
  assert.match(clientSource, /【提示：\$\{round\.wordHint\.category\}】/);
});

test('forms, status surfaces, modal, chat, and canvas expose explicit semantics', () => {
  assert.doesNotMatch(clientSource, /\[\[zi:/);
  assert.match(pageSource, /id="dg-top-status" role="status" aria-live="polite"/);
  assert.match(clientSource, /role: 'dialog'.*'aria-modal': 'true'/s);
  assert.match(clientSource, /role: 'log'.*'aria-live': 'polite'/s);
  assert.match(clientSource, /role: 'img'.*'aria-label'/s);
  assert.match(clientSource, /el\('label', \{ class: 'dg-label', for: id \}, label\)/);
  for (const id of ['dg-create-nick', 'dg-create-difficulty', 'dg-create-seconds', 'dg-create-rounds', 'dg-create-code', 'dg-join-code', 'dg-join-nick']) {
    assert.match(clientSource, new RegExp(`id: '${id}'`));
  }
  assert.match(clientSource, /k === 'disabled' \|\| k === 'checked' \|\| k === 'selected'[\s\S]*?node\.setAttribute\(k, ''\)/);
});

test('mobile controls and warning colors meet the intended interaction contract', () => {
  assert.match(pageSource, /\.dg-toolbar \.swatch\{width:30px;height:30px/);
  assert.match(pageSource, /\.dg-thickness input[\s\S]*?accent-color:var\(--dg-accent\)/);
  assert.match(pageSource, /\.dg-color-picker[\s\S]*?conic-gradient/);
  assert.match(pageSource, /\.dg-btn\{min-height:44px/);
  assert.match(pageSource, /\.dg-mobile-tabs\{position:fixed/);
  assert.match(pageSource, /countdown\.warn\{background:var\(--dg-gold\)/);
  assert.match(pageSource, /prefers-reduced-motion:reduce/);
  assert.match(pageSource, /assets\/js\/drawing\/protocol\.js/);
});

test('immersive shell removes the blog chrome and lazy-loads feedback', () => {
  assert.match(pageSource, /minimal_app_shell: true/);
  assert.match(pageSource, /body_class: drawing-workshop/);
  assert.match(pageSource, /body\.drawing-workshop>nav,body\.drawing-workshop>footer/);
  assert.match(pageSource, /body\.drawing-workshop>main\{width:100%;max-width:none;min-height:100dvh;margin:0;padding:0\}/);
  assert.match(pageSource, /class="dg-top"/);
  assert.match(pageSource, /class="dg-stage-shell"/);
  assert.match(pageSource, /class="dg-side-shell"/);
  assert.match(pageSource, /class="dg-feedback-layer"/);
  assert.match(pageSource, /assets\/js\/games\/drawing-icons\.js/);
  assert.match(iconSource, /DrawingIcons = \{ hydrate, svg \}/);
  assert.equal(existsSync(new URL('../assets/images/drawing/atelier-a-v1.webp', import.meta.url)), true);
  assert.match(pageSource, /atelier-a-v1\.webp/);
  assert.doesNotMatch(pageSource, /games-shell\/qrcode\.js/);
  assert.match(clientSource, /function mountFeedbackComments\(\)/);
  assert.match(clientSource, /mountFeedbackComments\(\);/);
  assert.match(clientSource, /function renderSideShell\(route\)/);
  assert.match(clientSource, /function setMobilePanel\(panel\)/);
  assert.match(clientSource, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
});

test('approved A-style UI removes redundant copy and exposes the requested controls and ranking', () => {
  for (const redundant of ['猜到就直接发送', '林夏的画笔', '实时画布 · 笔画已同步', '新玩家会出现在这里']) {
    assert.doesNotMatch(clientSource, new RegExp(redundant));
  }
  assert.match(clientSource, /等待新玩家/);
  assert.match(clientSource, /type: 'range'/);
  assert.match(clientSource, /type: 'color'/);
  assert.match(clientSource, /aria-label': '橡皮擦'/);
  assert.match(clientSource, /aria-label': '撤销'/);
  assert.match(clientSource, /aria-label': '清空画板'/);
  assert.match(clientSource, /dg-podium/);
});
