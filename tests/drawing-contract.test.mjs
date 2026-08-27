import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const protocolSource = readFileSync(new URL('../assets/js/drawing/protocol.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../assets/js/drawing/drawing.js', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../toolbox/drawing/index.html', import.meta.url), 'utf8');

test('drawing scripts remain valid JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(protocolSource));
  assert.doesNotThrow(() => new vm.Script(clientSource));
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

test('forms, status surfaces, modal, chat, and canvas expose explicit semantics', () => {
  assert.doesNotMatch(clientSource, /\[\[zi:/);
  assert.match(clientSource, /role: 'status'.*'aria-live': 'polite'/s);
  assert.match(clientSource, /role: 'dialog'.*'aria-modal': 'true'/s);
  assert.match(clientSource, /role: 'log'.*'aria-live': 'polite'/s);
  assert.match(clientSource, /role: 'img'.*'aria-label'/s);
  assert.match(clientSource, /el\('label', \{ class: 'dg-label', for: id \}, label\)/);
  for (const id of ['dg-create-nick', 'dg-create-difficulty', 'dg-create-seconds', 'dg-create-rounds', 'dg-create-code', 'dg-join-code', 'dg-join-nick']) {
    assert.match(clientSource, new RegExp(`id: '${id}'`));
  }
});

test('mobile controls and warning colors meet the intended interaction contract', () => {
  assert.match(pageSource, /\.dg-toolbar \.swatch\{width:40px;height:40px\}/);
  assert.match(pageSource, /\.dg-btn\.tiny\{min-height:40px\}/);
  assert.match(pageSource, /\.dg-chat-input\{grid-area:input;position:sticky/);
  assert.match(pageSource, /countdown\.warn\{color:#1c1205;background:var\(--dg-gold\)\}/);
  assert.match(pageSource, /prefers-reduced-motion:reduce/);
  assert.match(pageSource, /assets\/js\/drawing\/protocol\.js/);
});

test('immersive shell removes the blog chrome and lazy-loads feedback', () => {
  assert.match(pageSource, /body_class: drawing-immersive/);
  assert.match(pageSource, /body\.drawing-immersive > nav, body\.drawing-immersive > footer/);
  assert.match(pageSource, /body\.drawing-immersive > main \{ width:100%; max-width:none; min-height:100dvh; margin:0; padding:0; \}/);
  assert.match(pageSource, /class="dg-appbar"/);
  assert.match(pageSource, /class="dg-feedback-layer"/);
  assert.match(clientSource, /function mountFeedbackComments\(\)/);
  assert.match(clientSource, /mountFeedbackComments\(\);/);
  assert.match(clientSource, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
});
