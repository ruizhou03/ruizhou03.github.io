(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DDZStorage = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SCHEMA_VERSION = 3;
  const SINGLE_KEY = 'tool.doudizhu.savestate.v1';
  const ONLINE_KEY = 'tool.doudizhu.online.session.v1';
  const PHASES = new Set(['bidding', 'doubling', 'playing']);
  const DIFFICULTIES = new Set(['easy', 'normal', 'hard', 'master']);

  function isCard(value) {
    return Number.isInteger(value) && value >= 0 && value < 54;
  }

  function cardArray(value, max) {
    return Array.isArray(value) && value.length <= max && value.every(isCard) &&
      new Set(value).size === value.length;
  }

  function migrateSingle(input) {
    if (!input || typeof input !== 'object' || input.mode === 'online') return null;
    const saved = JSON.parse(JSON.stringify(input));
    if (saved.v == null || saved.v === 1 || saved.v === 2) saved.v = SCHEMA_VERSION;
    if (saved.v !== SCHEMA_VERSION || !PHASES.has(saved.phase)) return null;
    if (!DIFFICULTIES.has(saved.difficulty)) saved.difficulty = 'normal';
    if (!Array.isArray(saved.hands) || saved.hands.length !== 3 ||
        !saved.hands.every(hand => cardArray(hand, 20))) return null;
    if (!cardArray(saved.bottom || [], 3)) return null;
    if (!Array.isArray(saved.netPlayed) || saved.netPlayed.length !== 3 ||
        !saved.netPlayed.every(cards => cardArray(cards, 20))) return null;
    const liveAndPlayed = saved.hands.flat().concat(saved.netPlayed.flat());
    if (new Set(liveAndPlayed).size !== liveAndPlayed.length) return null;
    const bottom = saved.bottom || [];
    const landlord = Number.isInteger(saved.landlordIdx) ? saved.landlordIdx : -1;
    if (landlord < 0) {
      if (liveAndPlayed.length + bottom.length !== 54 ||
          bottom.some(card => liveAndPlayed.includes(card))) return null;
    } else {
      if (liveAndPlayed.length !== 54 ||
          bottom.some(card => !saved.hands[landlord].includes(card) &&
            !(saved.netPlayed[landlord] || []).includes(card))) return null;
    }
    if (!Number.isInteger(saved.turnIdx) || saved.turnIdx < 0 || saved.turnIdx > 2) saved.turnIdx = 0;
    if (!Number.isInteger(saved.gameEpoch) || saved.gameEpoch < 1) saved.gameEpoch = 1;
    if (!Number.isInteger(saved.revision) || saved.revision < 0) saved.revision = (saved.netSeq || []).length;
    return saved;
  }

  return Object.freeze({
    SCHEMA_VERSION,
    SINGLE_KEY,
    ONLINE_KEY,
    migrateSingle,
  });
});
