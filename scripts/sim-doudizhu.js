#!/usr/bin/env node
/* sim-doudizhu.js v2 — 斗地主 AI 群体训练 + 锦标赛分级（50 维 paired weights）
 *
 * v2 vs v1 关键差别：
 *   - 权重按 role 拆成 {landlord: w25, farmer: w25}（共 50 维）
 *   - ES fitness 多目标：0.6×(vs center) + 0.4×(avg vs 上 3 个 run 的 final centroid)
 *     → 鼓励 candidate 不只跟 center 比，还能赢 / 区分前面的 run
 *     → 突破"所有强档落到同一个局部最优"的天花板
 *   - ai.js 的 MCTS 已经升级到 2-ply（我打 → 对手压 → 我再应一手）
 *
 * 命令：
 *   node scripts/sim-doudizhu.js sanity [N]
 *   node scripts/sim-doudizhu.js pop-gen [K] [generations] [popSize] [matchesPerEval] [startSigma]
 *   node scripts/sim-doudizhu.js tournament [matchesPerPair]
 *   node scripts/sim-doudizhu.js compare <test.json> [N] [baseline.json]
 *
 * JSON 格式（paired weights）：
 *   { landlord: { counterPredictRate: 0.5, ... }, farmer: { ... } }
 */

'use strict';

const fs = require('fs');
const path = require('path');

const E = require(path.join(__dirname, '..', 'assets', 'js', 'doudizhu', 'engine.js'));
const AI = require(path.join(__dirname, '..', 'assets', 'js', 'doudizhu', 'ai.js'));

// ===========================================================
// 权重定义
// ===========================================================
const DEFAULT_W_FLAT = Object.assign({}, AI._W_BASELINE);
const DEFAULT_W = {
  landlord: Object.assign({}, DEFAULT_W_FLAT),
  farmer:   Object.assign({}, DEFAULT_W_FLAT),
};

const TUNE_KEYS = Object.keys(DEFAULT_W_FLAT);   // 25 个 per role × 2 = 50 实际维度

const PROBABILITY_KEYS = new Set([
  'counterPredictRate', 'peasantCoopRate', 'bombSmartRate',
  'firstPlayLookAhead', 'randomActionRate',
  'randomBombFallbackRate',
]);

// ===========================================================
// 高斯采样 / 扰动
// ===========================================================
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function perturbFlat(center, sigma) {
  const out = {};
  for (const k of TUNE_KEYS) {
    let v = center[k] * (1 + gaussianRandom() * sigma);
    if (PROBABILITY_KEYS.has(k)) v = Math.max(0, Math.min(1, v));
    else if (v < 0.01) v = 0.01;
    out[k] = v;
  }
  return out;
}

function perturbPaired(centerPaired, sigma) {
  return {
    landlord: perturbFlat(centerPaired.landlord, sigma),
    farmer:   perturbFlat(centerPaired.farmer,   sigma),
  };
}

function clonePaired(p) {
  return {
    landlord: Object.assign({}, p.landlord),
    farmer:   Object.assign({}, p.farmer),
  };
}

function meanPaired(arr) {
  const result = { landlord: {}, farmer: {} };
  for (const role of ['landlord', 'farmer']) {
    for (const k of TUNE_KEYS) {
      let sum = 0;
      for (const p of arr) sum += p[role][k];
      let v = sum / arr.length;
      if (PROBABILITY_KEYS.has(k)) v = Math.max(0, Math.min(1, v));
      result[role][k] = v;
    }
  }
  return result;
}

// ===========================================================
// 单局模拟（paired weights）
// ===========================================================
function dealRound(rng) {
  const deck = E.fullDeck();
  const shuffled = E.shuffle(deck.slice(), rng);
  return [
    E.sortHand(shuffled.slice(0, 20)),
    E.sortHand(shuffled.slice(20, 37)),
    E.sortHand(shuffled.slice(37, 54)),
  ];
}

// pairedBySeat[seat] = { landlord: w25, farmer: w25 }；座 0 用 landlord 半边、座 1/2 用 farmer 半边
// tierBySeat[seat] = 'easy'|'normal'|'hard'：决定每座的记牌能力（v3）
function simulateMatch({ pairedBySeat, tierBySeat, rng = Math.random, maxIter = 400 }) {
  const hands = dealRound(rng);
  const handSizes = [hands[0].length, hands[1].length, hands[2].length];
  const seen = new Array(15).fill(0);
  const trickHistory = [];

  // v3: 每座按其 tier 一次性生成 memoryMask（整局稳定）
  const memoryMaskBySeat = {};
  if (tierBySeat) {
    for (let s = 0; s < 3; s++) {
      const tier = tierBySeat[s] || 'hard';
      memoryMaskBySeat[s] = AI.generateMemoryMask(AI.LEVEL_PROFILES[tier]);
    }
  }

  let currentSeat = 0, prev = null, lastTrickSeat = -1, passCount = 0, iter = 0;

  while (iter++ < maxIter) {
    const paired = pairedBySeat[currentSeat];
    const w = (currentSeat === 0) ? paired.landlord : paired.farmer;
    const ctx = {
      myIdx: currentSeat,
      myRole: currentSeat === 0 ? 'landlord' : 'peasant',
      landlordIdx: 0,
      handSizes: handSizes.slice(),
      seen: seen.slice(),
      trickHistory: trickHistory.slice(-10),
      lastTrickSeat,
      memoryMask: memoryMaskBySeat[currentSeat],   // v3: 这座本局的记牌 mask
    };
    const move = AI.chooseMove(hands[currentSeat], prev, ctx, 'hard', w);

    if (move == null) {
      passCount++;
      if (passCount >= 2 && lastTrickSeat >= 0) {
        prev = null; passCount = 0; currentSeat = lastTrickSeat; continue;
      }
      currentSeat = (currentSeat + 1) % 3;
      continue;
    }

    for (const c of move.cards) {
      const idx = hands[currentSeat].indexOf(c);
      if (idx >= 0) hands[currentSeat].splice(idx, 1);
      seen[E.cardWeight(c)]++;
    }
    handSizes[currentSeat] = hands[currentSeat].length;
    trickHistory.push({ seat: currentSeat, pattern: move });
    prev = move; lastTrickSeat = currentSeat; passCount = 0;

    if (handSizes[currentSeat] === 0) {
      return { winner: currentSeat === 0 ? 'landlord' : 'peasant', iter };
    }
    currentSeat = (currentSeat + 1) % 3;
  }
  return { winner: 'timeout', iter };
}

// ===========================================================
// runMatches — paired in, paired out
// ===========================================================
// testTier / baselineTier 默认 'hard' — 训练时各 candidate 用自己的 tier；
// tournament 时跨 tier 对战，每方按自己的 tier 记牌
function runMatches(testPaired, baselinePaired, n, rng = Math.random, testTier = 'hard', baselineTier = 'hard') {
  let testWins = 0, baselineWins = 0, timeoutCount = 0;
  let testLLWins = 0, testLLGames = 0;
  let testPSWins = 0, testPSGames = 0;
  let totalIter = 0;

  for (let i = 0; i < n; i++) {
    const testIsLandlord = (i % 2 === 0);
    const pairedBySeat = testIsLandlord
      ? { 0: testPaired,     1: baselinePaired, 2: baselinePaired }
      : { 0: baselinePaired, 1: testPaired,     2: testPaired };
    const tierBySeat = testIsLandlord
      ? { 0: testTier,     1: baselineTier, 2: baselineTier }
      : { 0: baselineTier, 1: testTier,     2: testTier };
    const { winner, iter } = simulateMatch({ pairedBySeat, tierBySeat, rng });
    totalIter += iter;
    if (winner === 'timeout') { timeoutCount++; continue; }
    const testWon = testIsLandlord ? (winner === 'landlord') : (winner === 'peasant');
    if (testWon) {
      testWins++;
      if (testIsLandlord) testLLWins++; else testPSWins++;
    } else {
      baselineWins++;
    }
    if (testIsLandlord) testLLGames++; else testPSGames++;
  }
  return {
    testWins, baselineWins, n, timeoutCount,
    testLLWins, testLLGames, testPSWins, testPSGames,
    avgIter: totalIter / Math.max(1, n),
  };
}

// ===========================================================
// ES 内核（多目标 fitness）
// ===========================================================
function runES({ startCenter, sigmaInit = 0.25, generations = 4, popSize = 16,
                  matchesPerEval = 50, label = '', priorCentroids = [], tier = 'hard' }) {
  let center = clonePaired(startCenter);
  let sigma = sigmaInit;
  const centroids = [];

  // 多目标权重
  const STRENGTH_WEIGHT = 0.6;
  const DIVERSITY_WEIGHT = 0.4;

  for (let gen = 0; gen < generations; gen++) {
    const pop = [];
    for (let i = 0; i < popSize; i++) pop.push(perturbPaired(center, sigma));

    const results = [];
    const tStart = Date.now();
    for (let i = 0; i < pop.length; i++) {
      // 强度信号：vs 当前 center（双方都用本 tier 记牌）
      const { testWins: vsCenterWins } = runMatches(pop[i], center, matchesPerEval, Math.random, tier, tier);
      const vsCenter = vsCenterWins / matchesPerEval;

      // 多样性信号：vs 同 tier 内上 3 个 run 的 final centroid（如果有）
      let vsDiverse = vsCenter;
      if (priorCentroids.length > 0) {
        const recent = priorCentroids.slice(-3);
        const shortMatches = Math.max(20, Math.floor(matchesPerEval / 4));
        let sum = 0;
        for (const prev of recent) {
          sum += runMatches(pop[i], prev, shortMatches, Math.random, tier, tier).testWins / shortMatches;
        }
        vsDiverse = sum / recent.length;
      }

      const fitness = STRENGTH_WEIGHT * vsCenter + DIVERSITY_WEIGHT * vsDiverse;
      results.push({ cand: pop[i], fitness, vsCenter, vsDiverse });
      process.stdout.write('\r' + label + ' gen ' + gen + ' eval ' + (i + 1) +
        '/' + popSize + ' fit=' + fitness.toFixed(2) +
        ' (str=' + vsCenter.toFixed(2) + ' div=' + vsDiverse.toFixed(2) + ')      ');
    }
    process.stdout.write('\n');

    results.sort((a, b) => b.fitness - a.fitness);
    const muSize = Math.max(2, Math.floor(popSize / 4));
    const top = results.slice(0, muSize);
    center = meanPaired(top.map(r => r.cand));

    sigma *= 0.78;
    const elapsed = ((Date.now() - tStart) / 1000).toFixed(0);
    console.log(label + ' gen ' + gen + ' done (' + elapsed + 's): top fitness [' +
      top.slice(0, 5).map(r => r.fitness.toFixed(2)).join(', ') +
      ']; sigma → ' + sigma.toFixed(3));
    centroids.push({ gen, center: clonePaired(center), topFitness: top[0].fitness });
  }
  return centroids;
}

// ===========================================================
// pop-gen
// ===========================================================
// v3 pop-gen：3 tier × K runs/tier，每 tier 独立训练（自己的记牌限制）
function popGen({ K = 5, generations = 4, popSize = 16, matchesPerEval = 50, startSigma = 0.4 }) {
  const popPath = path.join(__dirname, 'sim-doudizhu-population.json');
  const TIERS = ['easy', 'normal', 'hard'];

  let population = [];
  const doneByTier = { easy: 0, normal: 0, hard: 0 };
  if (fs.existsSync(popPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(popPath, 'utf8'));
      if (Array.isArray(existing) && existing.length > 0 && existing[0].tier && existing[0].weights && existing[0].weights.landlord) {
        population = existing;
        for (const e of existing) {
          if (e.tier && e.runIdx != null) {
            doneByTier[e.tier] = Math.max(doneByTier[e.tier] || 0, e.runIdx + 1);
          }
        }
        console.log('resuming from existing population.json (' + existing.length +
          ' entries, doneByTier=' + JSON.stringify(doneByTier) + ')');
      } else if (Array.isArray(existing) && existing.length > 0) {
        console.log('existing population.json is older format — starting fresh');
        population = [];
      }
    } catch (e) { population = []; }
  }

  console.log('== pop-gen v3 (paired + multi-obj + per-tier memory) ==');
  console.log('K per tier=' + K + ' generations=' + generations + ' popSize=' + popSize +
    ' matchesPerEval=' + matchesPerEval + ' startSigma=' + startSigma);
  console.log('TUNE_KEYS per role (' + TUNE_KEYS.length + '): ' + TUNE_KEYS.length * 2 + ' total dim');

  const overallStart = Date.now();
  for (const tier of TIERS) {
    const startK = doneByTier[tier] || 0;
    console.log('\n=== tier=' + tier + ' (start run ' + startK + ' / ' + K + ') ===');

    // 同 tier 内的历史 centroids 用于多样性信号
    const priorCentroids = [];
    for (const p of population) {
      if (p.tier === tier && p.genSnapshot === (generations - 1) && p.weights && p.weights.landlord) {
        priorCentroids.push(p.weights);
      }
    }

    for (let k = startK; k < K; k++) {
      const startCenter = clonePaired(DEFAULT_W);
      if (k > 0) {
        startCenter.landlord = perturbFlat(DEFAULT_W.landlord, startSigma);
        startCenter.farmer   = perturbFlat(DEFAULT_W.farmer,   startSigma);
      }
      const label = tier + '_run' + k;
      console.log('\n--- ' + label + ' (start sigma=' + startSigma +
        ', priorCentroids=' + priorCentroids.length + ') ---');
      const centroids = runES({
        startCenter, sigmaInit: 0.25, generations, popSize, matchesPerEval,
        label, priorCentroids, tier,
      });
      const snapGens = Array.from(new Set([
        0,
        Math.floor((generations - 1) / 2),
        generations - 1,
      ]));
      for (const g of snapGens) {
        population.push({
          id: tier + '_run' + k + '_gen' + g,
          tier,
          runIdx: k,
          genSnapshot: g,
          startCenter: clonePaired(startCenter),
          weights: clonePaired(centroids[g].center),
        });
      }
      priorCentroids.push(clonePaired(centroids[centroids.length - 1].center));

      fs.writeFileSync(popPath, JSON.stringify(population, null, 2));
      const elapsedMin = ((Date.now() - overallStart) / 1000 / 60).toFixed(1);
      console.log(label + ' saved; pop size = ' + population.length +
        '; elapsed ' + elapsedMin + ' min');
    }
  }
  console.log('\n== pop-gen DONE; ' + population.length + ' candidates → ' + popPath + ' ==');
}

// ===========================================================
// tournament
// ===========================================================
function tournament({ matchesPerPair = 60 }) {
  const popPath = path.join(__dirname, 'sim-doudizhu-population.json');
  const winsPath = path.join(__dirname, 'sim-doudizhu-wins-matrix.json');
  const rankPath = path.join(__dirname, 'sim-doudizhu-ranking.json');

  if (!fs.existsSync(popPath)) {
    console.error('missing ' + popPath + ', run pop-gen first');
    process.exit(1);
  }
  const population = JSON.parse(fs.readFileSync(popPath, 'utf8'));
  if (!population[0] || !population[0].weights || !population[0].weights.landlord) {
    console.error('population.json is v1 flat format — rerun pop-gen first');
    process.exit(1);
  }
  // v3 锚点：每 tier 一个 DEFAULT_W 副本（按各自 tier 记牌）
  const anchors = [
    { id: 'DEFAULT_W_easy',   tier: 'easy',   weights: clonePaired(DEFAULT_W) },
    { id: 'DEFAULT_W_normal', tier: 'normal', weights: clonePaired(DEFAULT_W) },
    { id: 'DEFAULT_W_hard',   tier: 'hard',   weights: clonePaired(DEFAULT_W) },
  ];
  const all = anchors.concat(population.map(p => ({ id: p.id, tier: p.tier || 'hard', weights: p.weights })));
  const N = all.length;
  const numPairs = N * (N - 1) / 2;

  let winsMatrix = {};
  if (fs.existsSync(winsPath)) {
    try {
      winsMatrix = JSON.parse(fs.readFileSync(winsPath, 'utf8'));
      console.log('resuming from existing wins-matrix.json');
    } catch (e) { winsMatrix = {}; }
  }

  const elo = new Map();
  for (const c of all) elo.set(c.id, 1500);

  let donePairs = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = all[i], b = all[j];
      const aWins = (winsMatrix[a.id] || {})[b.id];
      const bWins = (winsMatrix[b.id] || {})[a.id];
      if (typeof aWins === 'number' && typeof bWins === 'number' && (aWins + bWins) > 0) {
        const sa = aWins / (aWins + bWins);
        const ea = 1 / (1 + Math.pow(10, (elo.get(b.id) - elo.get(a.id)) / 400));
        elo.set(a.id, elo.get(a.id) + 24 * (sa - ea));
        elo.set(b.id, elo.get(b.id) + 24 * ((1 - sa) - (1 - ea)));
        donePairs++;
      }
    }
  }

  console.log('== tournament v2 ==');
  console.log('N=' + N + ' pairs=' + numPairs + ' matchesPerPair=' + matchesPerPair +
    ' (resumed ' + donePairs + ' pairs)');

  let pairIdx = donePairs;
  const tStart = Date.now();
  let runSincePair = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = all[i], b = all[j];
      const exA = (winsMatrix[a.id] || {})[b.id];
      const exB = (winsMatrix[b.id] || {})[a.id];
      if (typeof exA === 'number' && typeof exB === 'number' && (exA + exB) > 0) continue;

      const r = runMatches(a.weights, b.weights, matchesPerPair, Math.random, a.tier, b.tier);
      const aWins = r.testWins, bWins = r.baselineWins;
      winsMatrix[a.id] = winsMatrix[a.id] || {};
      winsMatrix[a.id][b.id] = aWins;
      winsMatrix[b.id] = winsMatrix[b.id] || {};
      winsMatrix[b.id][a.id] = bWins;

      const sa = aWins / Math.max(1, aWins + bWins);
      const ea = 1 / (1 + Math.pow(10, (elo.get(b.id) - elo.get(a.id)) / 400));
      elo.set(a.id, elo.get(a.id) + 24 * (sa - ea));
      elo.set(b.id, elo.get(b.id) + 24 * ((1 - sa) - (1 - ea)));

      pairIdx++; runSincePair++;
      const elapsed = (Date.now() - tStart) / 1000;
      const eta = elapsed / Math.max(1, runSincePair) * (numPairs - pairIdx) / 60;
      process.stdout.write('\rpair ' + pairIdx + '/' + numPairs + ' ' +
        a.id + ' vs ' + b.id + ' = ' + aWins + ':' + bWins +
        ' (ETA ' + eta.toFixed(0) + ' min)        ');

      if (pairIdx % 20 === 0) {
        saveTournamentResults(all, elo, winsMatrix, false, rankPath, winsPath);
      }
    }
  }
  process.stdout.write('\n');
  saveTournamentResults(all, elo, winsMatrix, true, rankPath, winsPath);
}

function saveTournamentResults(all, elo, winsMatrix, final, rankPath, winsPath) {
  const ranking = all.map(c => {
    const wins = winsMatrix[c.id] || {};
    let totalWins = 0, totalGames = 0;
    for (const opp of Object.keys(wins)) {
      totalWins += wins[opp];
      totalGames += wins[opp] + ((winsMatrix[opp] || {})[c.id] || 0);
    }
    return {
      id: c.id,
      tier: c.tier || 'hard',
      elo: elo.get(c.id),
      totalWins, totalGames,
      winRate: totalGames > 0 ? totalWins / totalGames : 0,
      weights: c.weights,
    };
  });
  ranking.sort((a, b) => b.elo - a.elo);
  fs.writeFileSync(rankPath, JSON.stringify(ranking, null, 2));
  fs.writeFileSync(winsPath, JSON.stringify(winsMatrix, null, 2));
  if (final) {
    console.log('\n== tournament DONE ==');
    console.log('Top 5: ' + ranking.slice(0, 5).map(r => r.id + '(' + r.elo.toFixed(0) + ')').join(', '));
    console.log('Bot 5: ' + ranking.slice(-5).map(r => r.id + '(' + r.elo.toFixed(0) + ')').join(', '));
    console.log('Elo spread: ' + ranking[0].elo.toFixed(0) + ' to ' + ranking[ranking.length-1].elo.toFixed(0));
  }
}

// ===========================================================
// sanity / compare
// ===========================================================
function sanity(n) {
  const N = n || 60;
  console.log('== sanity: DEFAULT_W vs DEFAULT_W under tier=hard (应 ≈50%, N=' + N + ') ==');
  const r = runMatches(DEFAULT_W, DEFAULT_W, N, Math.random, 'hard', 'hard');
  const rate = r.testWins / r.n;
  const se = Math.sqrt(rate * (1 - rate) / r.n);
  console.log('test wins ' + r.testWins + ' / ' + r.n + '  =  ' + rate.toFixed(3) +
    ' ± ' + (1.96 * se).toFixed(3) + ' (95% CI)');
  console.log('  landlord side wins: ' + r.testLLWins + '/' + r.testLLGames +
    ' = ' + (r.testLLWins / Math.max(1, r.testLLGames)).toFixed(3));
  console.log('  peasant side wins:  ' + r.testPSWins + '/' + r.testPSGames +
    ' = ' + (r.testPSWins / Math.max(1, r.testPSGames)).toFixed(3));
  console.log('  timeouts: ' + r.timeoutCount + '   avg iter/match: ' + r.avgIter.toFixed(0));
}

function compare(testPath, baselinePath, n, testTier, baselineTier) {
  function loadPaired(p) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (raw.landlord && raw.farmer) {
      return {
        landlord: Object.assign({}, DEFAULT_W.landlord, raw.landlord),
        farmer:   Object.assign({}, DEFAULT_W.farmer,   raw.farmer),
      };
    }
    const flat = Object.assign({}, DEFAULT_W_FLAT, raw);
    return { landlord: Object.assign({}, flat), farmer: Object.assign({}, flat) };
  }
  const testW = loadPaired(testPath);
  const baselineW = baselinePath ? loadPaired(baselinePath) : DEFAULT_W;
  const tt = testTier || 'hard';
  const bt = baselineTier || 'hard';
  console.log('compare test=' + testPath + '(' + tt + ') vs ' + (baselinePath || 'DEFAULT_W') + '(' + bt + '), n=' + n);
  const r = runMatches(testW, baselineW, n, Math.random, tt, bt);
  const rate = r.testWins / r.n;
  const se = Math.sqrt(rate * (1 - rate) / r.n);
  console.log('test wins ' + r.testWins + ' / ' + r.n + '  =  ' + rate.toFixed(3) +
    ' ± ' + (1.96 * se).toFixed(3) + ' (95% CI)');
}

// ===========================================================
// CLI
// ===========================================================
const cmd = process.argv[2] || 'sanity';
if (cmd === 'sanity') sanity(parseInt(process.argv[3], 10) || 60);
else if (cmd === 'pop-gen') {
  const K = parseInt(process.argv[3], 10) || 8;
  const generations = parseInt(process.argv[4], 10) || 4;
  const popSize = parseInt(process.argv[5], 10) || 16;
  const matchesPerEval = parseInt(process.argv[6], 10) || 50;
  const startSigma = parseFloat(process.argv[7]) || 0.4;
  popGen({ K, generations, popSize, matchesPerEval, startSigma });
}
else if (cmd === 'tournament') {
  const matchesPerPair = parseInt(process.argv[3], 10) || 60;
  tournament({ matchesPerPair });
}
else if (cmd === 'compare') {
  // compare <test.json> [N] [baseline.json] [testTier] [baselineTier]
  const tp = process.argv[3];
  const n = parseInt(process.argv[4], 10) || 600;
  const bp = process.argv[5];
  const tt = process.argv[6];
  const bt = process.argv[7];
  if (!tp) { console.error('usage: compare <test.json> [N] [baseline.json] [testTier] [baselineTier]'); process.exit(1); }
  compare(tp, bp, n, tt, bt);
}
else {
  console.error('unknown cmd: ' + cmd);
  process.exit(1);
}
