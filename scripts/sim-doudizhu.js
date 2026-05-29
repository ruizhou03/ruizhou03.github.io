#!/usr/bin/env node
/* sim-doudizhu.js — 斗地主 AI 群体训练 + 锦标赛分级
 *
 * 照搬 sim-guandan.js 的方法论：
 *   pop-gen  K 个独立 ES run × generations × popSize × matchesPerEval
 *            每个 run 保存 3 个快照（gen 0 / mid / final）→ 共 ~3K 候选
 *   tournament  群体内 round-robin × matchesPerPair；Elo + winsMatrix；
 *               读 population.json + DEFAULT_W 锚点
 *
 * 关键约定：
 *   - 直接 require live AI（assets/js/doudizhu/engine.js + ai.js），不重复实现牌型/AI
 *   - sim 内座 0 永远当地主、底分 1（handoff §4 Phase 2 简化）
 *   - 三档训练统一 chooseMove(level='hard')，差异 100% 来自 w（mctsSamples=6）
 *   - runMatches：对半 i%2==0 test 当地主 / i%2==1 test 当农民（两个座都用 test），
 *     吃掉地主-农民角色偏差
 *
 * 续跑：pop-gen 读 population.json 跳过已完成 runIdx；tournament 读 wins-matrix
 *      跳过已完成 pair。每 run / 每 20 pair 增量落盘。
 *
 * 命令：
 *   node scripts/sim-doudizhu.js sanity
 *   node scripts/sim-doudizhu.js pop-gen [K] [generations] [popSize] [matchesPerEval] [startSigma]
 *   node scripts/sim-doudizhu.js tournament [matchesPerPair]
 *   node scripts/sim-doudizhu.js compare <test.json> [N] [baseline.json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const E = require(path.join(__dirname, '..', 'assets', 'js', 'doudizhu', 'engine.js'));
const AI = require(path.join(__dirname, '..', 'assets', 'js', 'doudizhu', 'ai.js'));

// ===========================================================
// 权重定义
// ===========================================================
const DEFAULT_W = Object.assign({}, AI._W_BASELINE);

const TUNE_KEYS = Object.keys(DEFAULT_W);   // 16 个

// [0,1] 域字段（ES 扰动后要 clamp）
const PROBABILITY_KEYS = new Set([
  'counterPredictRate', 'peasantCoopRate', 'bombSmartRate',
  'firstPlayLookAhead', 'randomActionRate',
  'randomBombFallbackRate',
]);

// 整数阈值字段（用作展示；运行时 ai.js 自己 Math.round）
const INTEGER_KEYS = new Set([
  'peasantCoopPassMinHand', 'peasantTopPartnerThresh', 'peasantTopPartnerBombThresh',
  'peasantMaxOnLandlordLowThresh', 'feedPartnerThresh', 'landlordFinishThresh',
  'bombMyHandThresh', 'bombOppMinThresh',
]);

// ===========================================================
// 工具
// ===========================================================
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function perturbWeights(center, sigma) {
  const out = {};
  for (const k of TUNE_KEYS) {
    let v = center[k] * (1 + gaussianRandom() * sigma);
    if (PROBABILITY_KEYS.has(k)) {
      v = Math.max(0, Math.min(1, v));
    } else {
      // 防塌缩到 0（qhsBombBonus=0 会让炸弹完全失效之类）
      if (v < 0.01) v = 0.01;
    }
    out[k] = v;
  }
  return out;
}

// ===========================================================
// 单局模拟
// ===========================================================
// 发牌：54 张 → 17/17/17 + 3 底牌；座 0 永远当地主 = 拿前 17 + 3 = 20 张
function dealRound(rng) {
  const deck = E.fullDeck();
  const shuffled = E.shuffle(deck.slice(), rng);
  return [
    E.sortHand(shuffled.slice(0, 20)),     // 座 0 = 地主，20 张
    E.sortHand(shuffled.slice(20, 37)),    // 座 1 = 农民甲，17 张
    E.sortHand(shuffled.slice(37, 54)),    // 座 2 = 农民乙，17 张
  ];
}

// 跑一局；返回 { winner: 'landlord' | 'peasant' | 'timeout', iter }
function simulateMatch({ weightsBySeat, rng = Math.random, maxIter = 400 }) {
  const hands = dealRound(rng);
  const handSizes = [hands[0].length, hands[1].length, hands[2].length];
  const seen = new Array(15).fill(0);
  const trickHistory = [];

  let currentSeat = 0;           // 地主先出
  let prev = null;                // 当前要压的 pattern（null = 自己领出）
  let lastTrickSeat = -1;         // 最后实际出牌的座
  let passCount = 0;              // 连续过的次数
  let iter = 0;

  while (iter++ < maxIter) {
    const w = weightsBySeat[currentSeat];
    const ctx = {
      myIdx: currentSeat,
      myRole: currentSeat === 0 ? 'landlord' : 'peasant',
      landlordIdx: 0,
      handSizes: handSizes.slice(),
      seen: seen.slice(),
      trickHistory: trickHistory.slice(-10),
      lastTrickSeat,
    };

    // 让 AI 选 move。第 4 参数固定 'hard'（让 chooseMove 走 effectiveSamples=6 lookahead）
    // 第 5 参数 w 是这一座位的训练候选权重
    const move = AI.chooseMove(hands[currentSeat], prev, ctx, 'hard', w);

    if (move == null) {
      // 过
      passCount++;
      if (passCount >= 2 && lastTrickSeat >= 0) {
        // 另外两家都过了 → lastTrickSeat 重新领出，prev=null
        prev = null;
        passCount = 0;
        currentSeat = lastTrickSeat;
        continue;
      }
      currentSeat = (currentSeat + 1) % 3;
      continue;
    }

    // 出牌：从手牌移除 move.cards，更新 seen
    for (const c of move.cards) {
      const idx = hands[currentSeat].indexOf(c);
      if (idx >= 0) hands[currentSeat].splice(idx, 1);
      seen[E.cardWeight(c)]++;
    }
    handSizes[currentSeat] = hands[currentSeat].length;
    trickHistory.push({ seat: currentSeat, pattern: move });
    prev = move;
    lastTrickSeat = currentSeat;
    passCount = 0;

    // 出完了 → 胜负
    if (handSizes[currentSeat] === 0) {
      const winner = (currentSeat === 0) ? 'landlord' : 'peasant';
      return { winner, iter };
    }

    currentSeat = (currentSeat + 1) % 3;
  }

  // 死循环兜底
  return { winner: 'timeout', iter };
}

// ===========================================================
// runMatches — 头对头评估
// ===========================================================
// 每局 i % 2:
//   == 0: test 当地主（座 0），baseline 当农民（座 1+2）
//   == 1: baseline 当地主（座 0），test 当农民（座 1+2）
// test 胜利 = 该局 test 所在阵营赢
function runMatches(weightsTest, weightsBaseline, n, rng = Math.random) {
  let testWins = 0, baselineWins = 0, timeoutCount = 0;
  let testLLWins = 0, testLLGames = 0;
  let testPSWins = 0, testPSGames = 0;
  let totalIter = 0;

  for (let i = 0; i < n; i++) {
    const testIsLandlord = (i % 2 === 0);
    const weightsBySeat = testIsLandlord
      ? { 0: weightsTest,    1: weightsBaseline, 2: weightsBaseline }
      : { 0: weightsBaseline, 1: weightsTest,    2: weightsTest };
    const { winner, iter } = simulateMatch({ weightsBySeat, rng });
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
    testWins, baselineWins, n,
    timeoutCount,
    testLLWins, testLLGames, testPSWins, testPSGames,
    avgIter: totalIter / Math.max(1, n),
  };
}

// ===========================================================
// ES 内核
// ===========================================================
function runES({ startCenter, sigmaInit = 0.25, generations = 4, popSize = 16,
                  matchesPerEval = 50, label = '' }) {
  let center = Object.assign({}, startCenter);
  let sigma = sigmaInit;
  const centroids = [];
  for (let gen = 0; gen < generations; gen++) {
    const pop = [];
    for (let i = 0; i < popSize; i++) pop.push(perturbWeights(center, sigma));

    const results = [];
    const tStart = Date.now();
    for (let i = 0; i < pop.length; i++) {
      const { testWins } = runMatches(pop[i], center, matchesPerEval);
      const rate = testWins / matchesPerEval;
      results.push({ cand: pop[i], rate });
      process.stdout.write('\r' + label + ' gen ' + gen + ' eval ' + (i + 1) +
        '/' + popSize + ' rate=' + rate.toFixed(2) + '         ');
    }
    process.stdout.write('\n');

    results.sort((a, b) => b.rate - a.rate);
    const muSize = Math.max(2, Math.floor(popSize / 4));
    const top = results.slice(0, muSize);
    const newCenter = Object.assign({}, center);
    for (const k of TUNE_KEYS) {
      let sum = 0;
      for (const r of top) sum += r.cand[k];
      newCenter[k] = sum / top.length;
      if (PROBABILITY_KEYS.has(k)) {
        newCenter[k] = Math.max(0, Math.min(1, newCenter[k]));
      }
    }
    sigma *= 0.78;
    const elapsed = ((Date.now() - tStart) / 1000).toFixed(0);
    console.log(label + ' gen ' + gen + ' done (' + elapsed + 's): top rates [' +
      top.slice(0, 5).map(r => r.rate.toFixed(2)).join(', ') +
      ']; sigma → ' + sigma.toFixed(3));
    center = newCenter;
    centroids.push({ gen, center: Object.assign({}, center), topRate: top[0].rate });
  }
  return centroids;
}

// ===========================================================
// pop-gen
// ===========================================================
function popGen({ K = 8, generations = 4, popSize = 16, matchesPerEval = 50, startSigma = 0.4 }) {
  const popPath = path.join(__dirname, 'sim-doudizhu-population.json');

  // 续跑
  let population = [];
  let startK = 0;
  if (fs.existsSync(popPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(popPath, 'utf8'));
      if (Array.isArray(existing) && existing.length > 0) {
        population = existing;
        startK = Math.max(...existing.map(e => e.runIdx || 0)) + 1;
        console.log('resuming from existing population.json (' +
          existing.length + ' entries, next runIdx=' + startK + ')');
      }
    } catch (e) { /* fresh */ }
  }

  console.log('== pop-gen ==');
  console.log('K=' + K + ' generations=' + generations + ' popSize=' + popSize +
    ' matchesPerEval=' + matchesPerEval + ' startSigma=' + startSigma);
  console.log('TUNE_KEYS (' + TUNE_KEYS.length + '): ' + TUNE_KEYS.join(', '));

  const overallStart = Date.now();
  for (let k = startK; k < K; k++) {
    // run k 起点：k=0 用 DEFAULT_W，其余在 DEFAULT_W 上加 startSigma 扰动
    const startCenter = Object.assign({}, DEFAULT_W);
    if (k > 0) {
      for (const key of TUNE_KEYS) {
        let v = DEFAULT_W[key] * (1 + gaussianRandom() * startSigma);
        if (PROBABILITY_KEYS.has(key)) v = Math.max(0, Math.min(1, v));
        else if (v < 0.01) v = 0.01;
        startCenter[key] = v;
      }
    }
    console.log('\n--- run ' + k + ' / ' + K + ' (start sigma=' + startSigma + ') ---');
    const centroids = runES({ startCenter, sigmaInit: 0.25, generations, popSize,
      matchesPerEval, label: 'run' + k });
    const snapGens = Array.from(new Set([
      0,
      Math.floor((generations - 1) / 2),
      generations - 1,
    ]));
    for (const g of snapGens) {
      population.push({
        id: 'run' + k + '_gen' + g,
        runIdx: k,
        genSnapshot: g,
        startCenter: Object.assign({}, startCenter),
        weights: Object.assign({}, centroids[g].center),
      });
    }
    fs.writeFileSync(popPath, JSON.stringify(population, null, 2));
    const elapsedMin = ((Date.now() - overallStart) / 1000 / 60).toFixed(1);
    console.log('run ' + k + ' saved; population size = ' + population.length +
      '; total elapsed ' + elapsedMin + ' min');
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
  const anchors = [
    { id: 'DEFAULT_W', weights: Object.assign({}, DEFAULT_W) },
  ];
  const all = anchors.concat(population.map(p => ({ id: p.id, weights: p.weights })));
  const N = all.length;
  const numPairs = N * (N - 1) / 2;

  // 续跑：读已有 wins-matrix，跳过已记录的 pair
  let winsMatrix = {};
  if (fs.existsSync(winsPath)) {
    try {
      winsMatrix = JSON.parse(fs.readFileSync(winsPath, 'utf8'));
      console.log('resuming from existing wins-matrix.json');
    } catch (e) { winsMatrix = {}; }
  }

  // Elo 重新从 1500 起算（用现存 winsMatrix 重放即可）
  const elo = new Map();
  for (const c of all) elo.set(c.id, 1500);

  // 先重放历史
  let donePairs = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = all[i], b = all[j];
      const aWins = (winsMatrix[a.id] || {})[b.id];
      const bWins = (winsMatrix[b.id] || {})[a.id];
      if (typeof aWins === 'number' && typeof bWins === 'number' && (aWins + bWins) > 0) {
        const sa = aWins / (aWins + bWins);
        const ea = 1 / (1 + Math.pow(10, (elo.get(b.id) - elo.get(a.id)) / 400));
        const K_ELO = 24;
        elo.set(a.id, elo.get(a.id) + K_ELO * (sa - ea));
        elo.set(b.id, elo.get(b.id) + K_ELO * ((1 - sa) - (1 - ea)));
        donePairs++;
      }
    }
  }

  console.log('== tournament ==');
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
      if (typeof exA === 'number' && typeof exB === 'number' && (exA + exB) > 0) {
        continue;
      }
      const r = runMatches(a.weights, b.weights, matchesPerPair);
      const aWins = r.testWins, bWins = r.baselineWins;
      winsMatrix[a.id] = winsMatrix[a.id] || {};
      winsMatrix[a.id][b.id] = aWins;
      winsMatrix[b.id] = winsMatrix[b.id] || {};
      winsMatrix[b.id][a.id] = bWins;

      const sa = aWins / Math.max(1, aWins + bWins);
      const ea = 1 / (1 + Math.pow(10, (elo.get(b.id) - elo.get(a.id)) / 400));
      const K_ELO = 24;
      elo.set(a.id, elo.get(a.id) + K_ELO * (sa - ea));
      elo.set(b.id, elo.get(b.id) + K_ELO * ((1 - sa) - (1 - ea)));

      pairIdx++;
      runSincePair++;
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
      elo: elo.get(c.id),
      totalWins,
      totalGames,
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
  console.log('== sanity: DEFAULT_W vs DEFAULT_W (应 ≈50%, N=' + N + ') ==');
  const r = runMatches(DEFAULT_W, DEFAULT_W, N);
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

function compare(testPath, baselinePath, n) {
  const testW = Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(testPath, 'utf8')));
  const baselineW = baselinePath
    ? Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(baselinePath, 'utf8')))
    : DEFAULT_W;
  console.log('compare test=' + testPath + ' vs ' + (baselinePath || 'DEFAULT_W') + ', n=' + n);
  const r = runMatches(testW, baselineW, n);
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
  const tp = process.argv[3];
  const n = parseInt(process.argv[4], 10) || 600;
  const bp = process.argv[5];
  if (!tp) { console.error('usage: compare <test.json> [N] [baseline.json]'); process.exit(1); }
  compare(tp, bp, n);
}
else {
  console.error('unknown cmd: ' + cmd);
  console.error('usage: sanity | pop-gen [K] [gen] [pop] [matches] [sigma] | tournament [matchesPerPair] | compare <test.json> [N] [baseline.json]');
  process.exit(1);
}
