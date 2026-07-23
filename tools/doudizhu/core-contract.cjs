'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');

function registerCoreContractTests(E, {
  enginePath,
  manifestPath,
  referenceCommit = '718a5c920bf3361e34178a38f3b80458e176b351',
} = {}) {
  function actionKeyFromCards(cards) {
    return cards.map(E.cardWeight).sort((a, b) => a - b).join(',');
  }

  // Independent rank-level port of kwai/DouZero's move_generator.py.
  function douzeroReferenceMoves(hand) {
    const counts = new Map();
    for (const card of hand) {
      const w = E.cardWeight(card);
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    const weights = Array.from(counts.keys()).sort((a, b) => a - b);
    const moves = new Set();
    const add = ranks => moves.add(ranks.slice().sort((a, b) => a - b).join(','));
    const chooseUnique = (items, count) => {
      const result = [];
      const seen = new Set();
      function visit(start, chosen) {
        if (chosen.length === count) {
          const key = chosen.slice().sort((a, b) => a - b).join(',');
          if (!seen.has(key)) { seen.add(key); result.push(chosen.slice()); }
          return;
        }
        for (let i = start; i <= items.length - (count - chosen.length); i++) {
          chosen.push(items[i]);
          visit(i + 1, chosen);
          chosen.pop();
        }
      }
      visit(0, []);
      return result;
    };
    const serials = (eligible, minLength, repeat) => {
      const eligibleSet = new Set(eligible);
      const out = [];
      for (let length = minLength; length <= 12; length++) {
        for (let start = 0; start + length - 1 < 12; start++) {
          if (!Array.from({ length }, (_, i) => start + i).every(w => eligibleSet.has(w))) continue;
          out.push(Array.from({ length }, (_, i) => Array(repeat).fill(start + i)).flat());
        }
      }
      return out;
    };

    for (const w of weights) {
      add([w]);
      if (counts.get(w) >= 2) add([w, w]);
      if (counts.get(w) >= 3) add([w, w, w]);
      if (counts.get(w) === 4) add([w, w, w, w]);
    }
    if (counts.has(13) && counts.has(14)) add([13, 14]);

    const triples = weights.filter(w => counts.get(w) >= 3);
    const pairs = weights.filter(w => counts.get(w) >= 2);
    for (const triple of triples) {
      for (const single of weights) if (single !== triple) add([triple, triple, triple, single]);
      for (const pair of pairs) if (pair !== triple) add([triple, triple, triple, pair, pair]);
    }

    for (const move of serials(weights, 5, 1)) add(move);
    for (const move of serials(pairs, 3, 2)) add(move);
    const serialTriples = serials(triples, 2, 3);
    for (const plane of serialTriples) {
      add(plane);
      const planeSet = new Set(plane);
      const remaining = [];
      for (const w of weights) {
        if (!planeSet.has(w)) for (let i = 0; i < counts.get(w); i++) remaining.push(w);
      }
      const length = planeSet.size;
      for (const wings of chooseUnique(remaining, length)) add(plane.concat(wings));
      const pairCandidates = pairs.filter(w => !planeSet.has(w));
      for (const wings of chooseUnique(pairCandidates, length)) {
        add(plane.concat(wings.flatMap(w => [w, w])));
      }
    }

    for (const bomb of weights.filter(w => counts.get(w) === 4)) {
      const remaining = [];
      for (const w of weights) {
        if (w !== bomb) for (let i = 0; i < counts.get(w); i++) remaining.push(w);
      }
      for (const wings of chooseUnique(remaining, 2)) add([bomb, bomb, bomb, bomb].concat(wings));
      const pairCandidates = pairs.filter(w => w !== bomb);
      for (const wings of chooseUnique(pairCandidates, 2)) {
        add([bomb, bomb, bomb, bomb].concat(wings.flatMap(w => [w, w])));
      }
    }
    return moves;
  }

  function seededHands(count, size = 17) {
    let seed = 0x5eed1234;
    const next = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const hands = [];
    for (let state = 0; state < count; state++) {
      const deck = E.fullDeck();
      for (let i = deck.length - 1; i > 0; i--) {
        const j = next() % (i + 1);
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      hands.push(deck.slice(0, state % 5 === 0 ? 20 : size));
    }
    return hands;
  }

  test('core manifest pins version, source and exact bytes', () => {
    if (!enginePath || !manifestPath) return;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const digest = createHash('sha256').update(readFileSync(enginePath)).digest('hex');
    assert.equal(E.CORE_VERSION, manifest.coreVersion);
    assert.equal(digest, manifest.sha256);
    assert.equal(manifest.douzeroReferenceCommit, referenceCommit);
  });

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

  test('room rule can remove every four-with-two action from enumeration', () => {
    const hand = [0, 1, 2, 3, 4, 5, 8, 9, 12, 16];
    const enabled = E.enumerateBeats(hand, null);
    const disabled = E.enumerateBeats(hand, null, { allowFourTwo: false });
    assert.ok(enabled.some(p => p.type === E.TYPES.FOUR_TWO || p.type === E.TYPES.FOUR_TWO_PAIR));
    assert.ok(disabled.every(p => p.type !== E.TYPES.FOUR_TWO && p.type !== E.TYPES.FOUR_TWO_PAIR));
  });

  test('10,000 fixed states have zero DouZero action-set drift', () => {
    const count = Number(process.env.DDZ_DIFF_STATES || 10_000);
    for (const [index, hand] of seededHands(count).entries()) {
      const expected = Array.from(douzeroReferenceMoves(hand)).sort();
      const actual = E.enumerateBeats(hand, null).map(p => actionKeyFromCards(p.cards)).sort();
      assert.deepEqual(actual, expected, `action drift at fixed state ${index}`);
    }
  });

  test('100,000 fixed states preserve subset and round-trip invariants', () => {
    const count = Number(process.env.DDZ_INVARIANT_STATES || 100_000);
    for (const [index, hand] of seededHands(count).entries()) {
      const handSet = new Set(hand);
      const seen = new Set();
      for (const pattern of E.enumerateBeats(hand, null)) {
        if (pattern.cards.some(card => !handSet.has(card))) {
          assert.fail(`non-subset action at fixed state ${index}`);
        }
        if (new Set(pattern.cards).size !== pattern.cards.length) {
          assert.fail(`duplicate physical card at fixed state ${index}`);
        }
        const reparsed = E.parsePattern(pattern.cards);
        if (!reparsed || actionKeyFromCards(reparsed.cards) !== actionKeyFromCards(pattern.cards)) {
          assert.fail(`round-trip failure at fixed state ${index}`);
        }
        const key = actionKeyFromCards(pattern.cards);
        if (seen.has(key)) assert.fail(`duplicate semantic action at fixed state ${index}`);
        seen.add(key);
      }
    }
  });

  test('canonical applyAction is atomic and conserves all 54 physical cards', () => {
    const pristine = {
      gameEpoch: 7,
      revision: 11,
      phase: 'playing',
      turnIdx: 0,
      hands: [[0], [1], [2]],
      playedCards: [],
      lastTrick: null,
      passCount: 0,
    };
    assert.throws(() => E.applyAction(pristine, {
      gameEpoch: 6, expectedRevision: 11, seat: 0, type: 'play', cards: [0],
    }), /stale_epoch/);
    assert.throws(() => E.applyAction(pristine, {
      gameEpoch: 7, expectedRevision: 10, seat: 0, type: 'play', cards: [0],
    }), /stale_revision/);
    assert.deepEqual(pristine.hands, [[0], [1], [2]], 'rejected commands must not mutate state');

    let seed = 0x54c0ffee;
    const rng = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0x100000000;
    };
    for (let game = 0; game < 1_000; game++) {
      const { hands, bottom } = E.deal(rng);
      const landlord = game % 3;
      hands[landlord].push(...bottom);
      let state = {
        gameEpoch: game + 1,
        revision: 0,
        phase: 'playing',
        turnIdx: landlord,
        hands,
        playedCards: [],
        lastTrick: null,
        passCount: 0,
      };
      let safety = 500;
      while (state.phase === 'playing' && safety-- > 0) {
        const seat = state.turnIdx;
        const prev = state.lastTrick && state.lastTrick.seat !== seat
          ? state.lastTrick.pattern
          : null;
        const action = E.enumerateBeats(state.hands[seat], prev)[0];
        state = E.applyAction(state, {
          gameEpoch: state.gameEpoch,
          expectedRevision: state.revision,
          seat,
          type: action ? 'play' : 'pass',
          cards: action ? action.cards : undefined,
        });
        const physical = state.hands.flat().concat(state.playedCards);
        assert.equal(physical.length, 54, `card count drift in game ${game}`);
        assert.equal(new Set(physical).size, 54, `duplicate/lost card in game ${game}`);
      }
      assert.equal(state.phase, 'settlement', `game ${game} did not finish`);
    }
  });
}

module.exports = { registerCoreContractTests };
