(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GuandanAIContract = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var modelSha256 = 'ca389e89e8db98d9968705b0e4495620e025c852cf4db4b4c2e66b086ae03da5';
  var heuristicWeights = Object.freeze({
    normal: Object.freeze({
      passBase: -4.658, passPartnerWin: 13.685, passPartnerLow: 4,
      playFollowActive: 2.125, playFinish: 51,
      playFinishPartnerWin: 35, playPartnerWinPenalty: -19.305,
      playLeadLength: 0.35, playFollowLength: -0.12,
      breakMult: 1.316, wildCost: 7, jokerCost: 5,
      bombBase4: 6.8, bombPerExtra: 4,
      bombLeadMult: 1, bombLeadLateBonus: 0.6,
      bombFollowMult: 0.6, bombFollowOppLow: 1.3, bombFollowOppMed: 0.3,
      groupBombBase: 14, groupBombPerExtra: 8,
      handLenPenalty: 0.325, lookaheadDepth: 2,
    }),
    easy: Object.freeze({
      passBase: -4.135, passPartnerWin: 11.089, passPartnerLow: 4,
      playFollowActive: 2.255, playFinish: 27.101,
      playFinishPartnerWin: 35, playPartnerWinPenalty: -23.474,
      playLeadLength: 0.35, playFollowLength: -0.12,
      breakMult: 1.285, wildCost: 7, jokerCost: 5,
      bombBase4: 8.420, bombPerExtra: 4,
      bombLeadMult: 1, bombLeadLateBonus: 0.6,
      bombFollowMult: 0.6, bombFollowOppLow: 1.3, bombFollowOppMed: 0.3,
      groupBombBase: 14, groupBombPerExtra: 8,
      handLenPenalty: 0.319, lookaheadDepth: 2,
    }),
  });
  var strategies = Object.freeze({
    easy: Object.freeze({
      id: 'gd-heuristic-run12-gen6-v1',
      engine: 'heuristic-belief-rollout-v1',
      weightsId: 'run12_gen6',
    }),
    normal: Object.freeze({
      id: 'gd-heuristic-coord-best-v1',
      engine: 'heuristic-belief-rollout-v1',
      weightsId: 'coord-best',
    }),
    hard: Object.freeze({
      id: 'gd-danzero-' + modelSha256.slice(0, 12) + '-v1',
      engine: 'danzero-dmc',
      modelId: 'danzero-dmc-567x512x5-int8-v1',
      modelSha256: modelSha256,
    }),
  });
  return Object.freeze({
    version: 'gd-ai-contract-v1',
    modelSha256: modelSha256,
    heuristicWeightsSha256: '2b8c62ec5b1e08049804a194eb6b28e4b73ef45e1bb0c279666379a973c85edf',
    heuristicWeights: heuristicWeights,
    strategies: strategies,
    strategyForDifficulty: function (difficulty) {
      return strategies[difficulty] || strategies.normal;
    },
  });
}));
