#!/usr/bin/env node
// 斗地主 self-play 工具
// 用法: node tools/doudizhu/self_play.mjs [N=1000] [matchups=all|brief]
//
// 跑 4 档 AI 互相对打，统计每个组合 (landlord_level, peasants_level) 的胜率。
// 直接调 engine.js + ai.js（无 UI 开销），N=10000 时全 16 组 25-30 秒跑完。
//
// 输出：胜率矩阵 + 各档"综合实力"打分（用来调 ai.js 里 LEVEL_PROFILES）。

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// 脚本所在: <repo>/tools/doudizhu/self_play.mjs → repo 根 = ../../
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const E = require(path.join(ROOT, 'assets/js/doudizhu/engine.js'));
const AI = require(path.join(ROOT, 'assets/js/doudizhu/ai.js'));
const T = E.TYPES;

// ============================================================
// 复刻 index.html 里的 perceiveWeight —— AI 的"记牌噪声"
// 这层是主程序维护的，self-play 必须自己来
// ============================================================
function perceiveWeight(perceived, w, level) {
  if (level === 'easy') return;
  if (level === 'master') { perceived[w]++; return; }
  if (level === 'normal') {
    if (w >= 12 && Math.random() > 0.15) perceived[w]++;
    return;
  }
  // hard
  let missChance;
  if (w >= 13) missChance = 0.05;
  else if (w === 12) missChance = 0.07;
  else if (w >= 10) missChance = 0.12;
  else if (w >= 8) missChance = 0.18;
  else missChance = 0.25;
  if (Math.random() > missChance) perceived[w]++;
}

// ============================================================
// 单局模拟：地主固定在 seat 0（绕过 bidding 随机性，公平测试出牌能力）
// 返回 'landlord' | 'peasant'（哪个角色赢了）
// ============================================================
function runOneGame(landlordLevel, peasantLevel) {
  const d = E.deal();
  const hands = [d.hands[0].slice(), d.hands[1].slice(), d.hands[2].slice()];
  const bottom = d.bottom.slice();
  const landlordIdx = 0;

  // 地主拿底牌
  hands[landlordIdx] = hands[landlordIdx].concat(bottom);

  // 每个 AI 的"记忆"数组（底牌公开揭示，AI 都看得到）
  const levels = [landlordLevel, peasantLevel, peasantLevel];
  const perceived = [new Array(15).fill(0), new Array(15).fill(0), new Array(15).fill(0)];
  for (let s = 0; s < 3; s++) {
    for (const c of bottom) perceiveWeight(perceived[s], E.cardWeight(c), levels[s]);
  }

  // 出牌循环
  let turn = landlordIdx;
  let lastTrick = null;
  let passCount = 0;
  let safety = 300;
  while (safety-- > 0) {
    if (hands[turn].length === 0) {
      return (turn === landlordIdx) ? 'landlord' : 'peasant';
    }
    const prev = (lastTrick && lastTrick.seat !== turn) ? lastTrick.pattern : null;
    const ctx = {
      myIdx: turn,
      myRole: turn === landlordIdx ? 'landlord' : 'peasant',
      landlordIdx,
      handSizes: hands.map(h => h.length),
      seen: perceived[turn].slice(),
      trickHistory: [],
      lastTrickSeat: lastTrick ? lastTrick.seat : -1,
    };
    let play = AI.chooseMove(hands[turn], prev, ctx, levels[turn]);

    if (!play) {
      if (!prev) {
        // 首出不能 pass，强制出最小单牌
        const smallest = hands[turn].reduce(
          (b, c) => E.cardWeight(c) < E.cardWeight(b) ? c : b, hands[turn][0]);
        play = { type: T.SINGLE, weight: E.cardWeight(smallest), cards: [smallest] };
      } else {
        passCount++;
        if (passCount >= 2) { lastTrick = null; passCount = 0; }
        turn = (turn + 1) % 3;
        continue;
      }
    }

    hands[turn] = E.removeCards(hands[turn], play.cards);
    lastTrick = { seat: turn, pattern: play };
    passCount = 0;

    // 全员更新感知
    for (let s = 0; s < 3; s++) {
      for (const c of play.cards) perceiveWeight(perceived[s], E.cardWeight(c), levels[s]);
    }

    turn = (turn + 1) % 3;
  }
  return null;   // 不应到达
}

// ============================================================
// 运行一组对局
// ============================================================
function runMatchup(landlordLevel, peasantLevel, n) {
  let ll = 0, pp = 0, abort = 0;
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const r = runOneGame(landlordLevel, peasantLevel);
    if (r === 'landlord') ll++;
    else if (r === 'peasant') pp++;
    else abort++;
  }
  const elapsed = (Date.now() - t0) / 1000;
  const total = ll + pp;
  return {
    landlordLevel, peasantLevel,
    landlordWins: ll, peasantWins: pp, abort, total,
    landlordWinRate: total > 0 ? ll / total : 0,
    elapsed,
  };
}

// ============================================================
// 主入口
// ============================================================
const N = Number(process.argv[2] || 1000);
const mode = process.argv[3] || 'all';

const TIERS = ['easy', 'normal', 'hard', 'master'];
let matchups;
if (mode === 'brief') {
  // 关键诊断：only 同级 + 高级 vs 低级
  matchups = [
    ['easy', 'easy'], ['normal', 'normal'], ['hard', 'hard'], ['master', 'master'],
    ['hard', 'normal'], ['normal', 'hard'],
    ['master', 'hard'], ['hard', 'master'],
    ['master', 'easy'], ['easy', 'master'],
  ];
} else {
  // 全 4×4 = 16 组
  matchups = [];
  for (const ll of TIERS) for (const pp of TIERS) matchups.push([ll, pp]);
}

console.log(`斗地主 self-play  ─  N=${N} 局每组 × ${matchups.length} 组 = ${N * matchups.length} 局`);
console.log('─'.repeat(78));
console.log('地主 AI  | 农民 AI  | 总局数 | 地主胜 | 地主胜率 | 农民胜率 | 耗时(s)');
console.log('─'.repeat(78));

const results = [];
const wallStart = Date.now();
for (const [ll, pp] of matchups) {
  const r = runMatchup(ll, pp, N);
  results.push(r);
  const llPct = (r.landlordWinRate * 100).toFixed(1);
  const ppPct = ((1 - r.landlordWinRate) * 100).toFixed(1);
  console.log(`${ll.padEnd(8)} | ${pp.padEnd(8)} | ${String(r.total).padStart(5)}  | ${String(r.landlordWins).padStart(5)}  | ${llPct.padStart(5)}%  | ${ppPct.padStart(5)}%  | ${r.elapsed.toFixed(1)}`);
}
const wallElapsed = (Date.now() - wallStart) / 1000;
console.log('─'.repeat(78));
console.log(`总耗时: ${wallElapsed.toFixed(1)}s  (${(matchups.length * N / wallElapsed).toFixed(0)} 局/秒平均)`);

// ============================================================
// 二级分析：每个档位作为地主 / 农民 的总胜率
// ============================================================
console.log('\n=== 按 AI 档位汇总（横看 = 作为地主，竖看 = 作为农民）===');
console.log('\n地主胜率矩阵（行=地主档位，列=两农民档位）：');
console.log('         | ' + TIERS.map(t => t.padStart(7)).join(' | '));
console.log('─'.repeat(48));
for (const ll of TIERS) {
  const row = TIERS.map(pp => {
    const r = results.find(x => x.landlordLevel === ll && x.peasantLevel === pp);
    return r ? `${(r.landlordWinRate * 100).toFixed(1)}%`.padStart(7) : '   -   ';
  });
  console.log(`${ll.padEnd(8)} | ${row.join(' | ')}`);
}

console.log('\n按"档位强度"折算（数字越大越强）：');
const tierStrength = {};
for (const tier of TIERS) {
  // 强度 = 当我作为地主时的平均胜率 + (1 - 当我作为农民时对手地主的平均胜率)
  let asLandlord = 0, asPeasant = 0, c1 = 0, c2 = 0;
  for (const r of results) {
    if (r.landlordLevel === tier) { asLandlord += r.landlordWinRate; c1++; }
    if (r.peasantLevel === tier) { asPeasant += (1 - r.landlordWinRate); c2++; }
  }
  tierStrength[tier] = {
    asLandlord: asLandlord / c1,
    asPeasant: asPeasant / c2,
    avg: (asLandlord / c1 + asPeasant / c2) / 2,
  };
}
console.log('档位     | 当地主平均胜率 | 当农民平均胜率 | 综合实力');
console.log('─'.repeat(58));
for (const tier of TIERS) {
  const s = tierStrength[tier];
  console.log(`${tier.padEnd(8)} | ${(s.asLandlord * 100).toFixed(1).padStart(8)}%     | ${(s.asPeasant * 100).toFixed(1).padStart(8)}%     | ${(s.avg * 100).toFixed(1).padStart(6)}%`);
}

console.log('\n注：地主固定坐 seat 0（绕过 bidding 随机性，公平对比）');
console.log('  斗地主原本就是不对称游戏，3 vs 1 让农民有结构性优势，所以地主胜率普遍偏低');
