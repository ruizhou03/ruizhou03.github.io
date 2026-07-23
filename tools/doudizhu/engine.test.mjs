import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const E = require('../../assets/js/doudizhu/engine.js');

test('physical card ids are unique and invalid plays fail closed', () => {
  assert.equal(E.parsePattern([52, 52]), null);
  assert.equal(E.parsePattern([-1]), null);
  assert.equal(E.parsePattern([54]), null);
  assert.throws(() => E.removeCards([0], [0, 1]), /card_not_in_hand/);
  assert.equal(E.validatePlay([0], [0, 1], null), null);
  assert.deepEqual(E.validatePlay([0, 1], [0], null)?.remaining, [1]);
});

test('plane wings never manufacture a second joker', () => {
  const hand = [8, 9, 10, 12, 13, 14, 52];
  const prev = E.parsePattern([0, 1, 2, 4, 5, 6, 16, 20]);
  for (const pattern of E.enumerateBeats(hand, prev)) {
    assert.equal(new Set(pattern.cards).size, pattern.cards.length);
    assert.ok(E.validatePlay(hand, pattern.cards, prev));
  }
});

test('enumerated lead actions are physical subsets', () => {
  for (let iteration = 0; iteration < 500; iteration++) {
    const { hands } = E.deal();
    for (const hand of hands) {
      for (const pattern of E.enumerateBeats(hand, null)) {
        assert.equal(new Set(pattern.cards).size, pattern.cards.length);
        assert.ok(E.validatePlay(hand, pattern.cards, null));
      }
    }
  }
});

test('settlement controls have one event-binding path and status is visible', async () => {
  const ui = await readFile(new URL('../../assets/js/doudizhu/ui.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../../toolbox/doudizhu/index.html', import.meta.url), 'utf8');
  assert.equal((ui.match(/ddzPlayAgainBtn'\)\.addEventListener/g) || []).length, 1);
  assert.equal((ui.match(/ddzBackToSetupBtn'\)\.addEventListener/g) || []).length, 1);
  assert.doesNotMatch(ui, /playAgainBtn\.onclick|backBtn\.onclick/);
  assert.match(page, /id="ddzStatusMsg"[^>]*role="status"[^>]*aria-live="polite"/);
});
