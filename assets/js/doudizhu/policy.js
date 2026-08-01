(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DDZPolicy = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CONTRACT_VERSION = 'ddz-ai-policy-1.0.0';
  const STRATEGIES = Object.freeze({
    easy: Object.freeze({
      difficulty: 'easy', engine: 'heuristic', heuristicLevel: 'easy',
      model: null, strategyId: 'ddz-easy-heuristic-v3',
    }),
    normal: Object.freeze({
      difficulty: 'normal', engine: 'heuristic', heuristicLevel: 'hard',
      model: null, strategyId: 'ddz-normal-legacy-hard-v3',
    }),
    hard: Object.freeze({
      difficulty: 'hard', engine: 'douzero', heuristicLevel: 'hard',
      model: 'adp', strategyId: 'ddz-hard-douzero-adp-int16-v1',
    }),
    master: Object.freeze({
      difficulty: 'master', engine: 'douzero', heuristicLevel: 'hard',
      model: 'resnet', strategyId: 'ddz-master-alphadou-resnet-int8-v1',
    }),
  });

  function normalizeDifficulty(value) {
    return Object.prototype.hasOwnProperty.call(STRATEGIES, value) ? value : 'normal';
  }

  function resolve(context, selectedDifficulty) {
    const selected = normalizeDifficulty(selectedDifficulty);
    let difficulty = selected;
    if (context === 'online-hint' || context === 'timeout') difficulty = 'normal';
    return Object.freeze({
      context,
      ...STRATEGIES[difficulty],
      fallback: STRATEGIES.normal,
      selectedDifficulty: selected,
      contractVersion: CONTRACT_VERSION,
    });
  }

  return Object.freeze({
    CONTRACT_VERSION,
    STRATEGIES,
    normalizeDifficulty,
    resolve,
  });
}));
