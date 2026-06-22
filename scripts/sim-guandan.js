#!/usr/bin/env node
'use strict';

/*
 * 掼蛋 self-play 模拟 + AI 权重调参（coordinate descent）
 *
 * 用法：
 *   node scripts/sim-guandan.js sanity              # 跑 20 局 baseline vs baseline，看胜率应该 ~50%
 *   node scripts/sim-guandan.js tune [N]            # 跑权重调优（N = 每个 trial 的 match 数，默认 60）
 *   node scripts/sim-guandan.js show <weights.json> # 显示给定权重和默认权重的对比
 *
 * 调参原理：每个权重在当前值附近取 -25%/-10%/+10%/+25% 四档，分别让"试验队"用
 * 改后权重 vs "基线队"用默认权重各跑 N 局，挑胜率最高的当新值；遍历所有权重 2 轮。
 */

// ===========================================================
// 引擎（纯函数，从 assets/js/games/guandan.js 抄过来）
// ===========================================================

const RANK_LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const LEVEL_SEQ = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function isJoker(c) { const m = c % 54; return m === 52 || m === 53; }
function jokerKind(c) { return (c % 54) === 53 ? 'big' : 'small'; }
function cardSuit(c) { return Math.floor((c % 54) / 13); }
function cardRankIdx(c) { return (c % 54) % 13; }

function singleWeight(c, level) {
  if (isJoker(c)) return jokerKind(c) === 'big' ? 17 : 16;
  const r = cardRankIdx(c);
  if (RANK_LABELS[r] === level) return 15;
  return r + 2;
}

function isWild(c, level) {
  if (isJoker(c)) return false;
  return cardSuit(c) === 1 && RANK_LABELS[cardRankIdx(c)] === level;
}

const T = {
  SINGLE: 'single', PAIR: 'pair', TRIPLE: 'triple',
  TRIPLE_PAIR: 'triple_pair', PAIR_STR: 'pair_str', TRIPLE_STR: 'triple_str',
  STRAIGHT: 'straight', BOMB: 'bomb', STR_FLUSH: 'str_flush', JOKER_BOMB: 'joker_bomb',
};

function bombStrengthN(n, rankW) {
  if (n === 4) return 100 + rankW;
  if (n === 5) return 200 + rankW;
  return (n - 1) * 100 + rankW;
}
const STR_FLUSH_STRENGTH_BASE = 300;

function rankIdxWeight(r, level) {
  const label = RANK_LABELS[r];
  if (label === level) return 15;
  return r + 2;
}

function tally(cards, level) {
  const counts = new Map();
  let wild = 0;
  const bigJ = [], smallJ = [];
  const normals = [];
  for (const c of cards) {
    if (isJoker(c)) { (jokerKind(c) === 'big' ? bigJ : smallJ).push(c); continue; }
    if (isWild(c, level)) { wild++; continue; }
    const r = cardRankIdx(c);
    counts.set(r, (counts.get(r) || 0) + 1);
    normals.push(c);
  }
  return { counts, wild, bigJ, smallJ, normals };
}

function classifyRaw(cards, level) {
  if (!cards || !cards.length) return null;
  const n = cards.length;
  const tg = tally(cards, level);
  const { counts, wild } = tg;
  const totalJ = tg.bigJ.length + tg.smallJ.length;
  const distinct = [...counts.keys()];
  if (n === 4 && totalJ === 4) return { type: T.JOKER_BOMB, len: 4, key: 99999, bombStrength: 99999, cards };
  if (totalJ > 0) {
    if (tg.normals.length === 0 && wild === 0) {
      if (n === 1) return { type: T.SINGLE, len: 1, key: singleWeight(cards[0], level), bombStrength: 0, cards };
      const allBig = tg.smallJ.length === 0;
      const allSmall = tg.bigJ.length === 0;
      if (allBig || allSmall) {
        const rw = allBig ? 17 : 16;
        if (n === 2) return { type: T.PAIR, len: 2, key: rw, bombStrength: 0, cards };
        if (n === 3) return { type: T.TRIPLE, len: 3, key: rw, bombStrength: 0, cards };
        if (n >= 4) return { type: T.BOMB, len: n, key: bombStrengthN(n, rw), bombStrength: bombStrengthN(n, rw), cards };
      }
      return null;
    }
    return null;
  }
  if (n === 1) return { type: T.SINGLE, len: 1, key: singleWeight(cards[0], level), bombStrength: 0, cards };
  if (n === 2) {
    if (distinct.length <= 1) {
      const r = distinct.length === 1 ? distinct[0] : null;
      if (r == null) return { type: T.PAIR, len: 2, key: 15, bombStrength: 0, cards };
      if ((counts.get(r) + wild) === 2) return { type: T.PAIR, len: 2, key: rankIdxWeight(r, level), bombStrength: 0, cards };
    }
    return null;
  }
  if (n === 3) {
    if (distinct.length <= 1) {
      const r = distinct.length === 1 ? distinct[0] : null;
      if (r == null) return null;
      if ((counts.get(r) + wild) === 3) return { type: T.TRIPLE, len: 3, key: rankIdxWeight(r, level), bombStrength: 0, cards };
    }
    return null;
  }
  if (n >= 4) {
    if (distinct.length <= 1) {
      const r = distinct.length === 1 ? distinct[0] : null;
      if (r != null && (counts.get(r) + wild) === n) {
        const rw = rankIdxWeight(r, level);
        return { type: T.BOMB, len: n, key: bombStrengthN(n, rw), bombStrength: bombStrengthN(n, rw), cards };
      }
    }
  }
  if (n === 5) {
    const tp = tryTriplePair(tg, level);
    if (tp) { tp.cards = cards; return tp; }
    const sf = tryStraightFlush(cards, tg, level);
    if (sf) { sf.cards = cards; return sf; }
    const st = tryStraight(tg, level, 5);
    if (st) { st.cards = cards; return st; }
    return null;
  }
  if (n === 6) {
    const ps = tryPairStraight(tg, level, 3);
    if (ps) { ps.cards = cards; return ps; }
    const ts = tryTripleStraight(tg, level, 2);
    if (ts) { ts.cards = cards; return ts; }
    return null;
  }
  return null;
}

function classify(cards, level) {
  const cb = classifyRaw(cards, level);
  if (cb && !cb.cards) cb.cards = cards.slice();
  return cb;
}

function tryTriplePair(tg, level) {
  const { counts, wild } = tg;
  const ranks = [...counts.keys()];
  let best = null;
  for (const ra of ranks) {
    const needA = 3 - counts.get(ra);
    if (needA < 0 || needA > wild) continue;
    const remW = wild - needA;
    for (const rb of ranks) {
      if (rb === ra) continue;
      const needB = 2 - counts.get(rb);
      if (needB < 0 || needB > remW) continue;
      if (counts.get(ra) + counts.get(rb) + (3 - counts.get(ra)) + (2 - counts.get(rb)) !== 5) continue;
      const key = rankIdxWeight(ra, level);
      if (!best || key > best.key) best = { type: T.TRIPLE_PAIR, len: 5, key, bombStrength: 0 };
    }
    if (remW >= 2 && counts.get(ra) + needA === 3) {
      const key = rankIdxWeight(ra, level);
      if (!best || key > best.key) best = { type: T.TRIPLE_PAIR, len: 5, key, bombStrength: 0 };
    }
  }
  return best;
}

function tryStraight(tg, level, len) {
  const { counts, wild } = tg;
  const pointHas = new Set();
  for (const [r] of counts) pointHas.add(r + 2);
  const hasAceLow = pointHas.has(14);
  let best = null;
  for (let s = 1; s + len - 1 <= 14; s++) {
    let needWild = 0, ok = true;
    for (let k = 0; k < len; k++) {
      const p = s + k;
      const present = (p === 1) ? hasAceLow : pointHas.has(p);
      if (!present) { needWild++; if (needWild > wild) { ok = false; break; } }
    }
    if (!ok || needWild !== wild) continue;
    const key = s + len - 1;
    if (!best || key > best.key) best = { type: T.STRAIGHT, len, key, bombStrength: 0 };
  }
  return best;
}

function tryStraightFlush(cards, tg, level) {
  const { wild } = tg;
  const bySuit = [new Set(), new Set(), new Set(), new Set()];
  for (const c of cards) {
    if (isJoker(c)) return null;
    if (isWild(c, level)) continue;
    bySuit[cardSuit(c)].add(cardRankIdx(c) + 2);
  }
  let best = null;
  for (let su = 0; su < 4; su++) {
    const pts = bySuit[su];
    if (pts.size + wild < 5) continue;
    const aceLow = pts.has(14);
    for (let s = 1; s + 4 <= 14; s++) {
      let needWild = 0, ok = true;
      for (let k = 0; k < 5; k++) {
        const p = s + k;
        const present = (p === 1) ? aceLow : pts.has(p);
        if (!present) { needWild++; if (needWild > wild) { ok = false; break; } }
      }
      if (!ok || needWild !== wild) continue;
      const top = s + 4;
      const strength = STR_FLUSH_STRENGTH_BASE + top;
      if (!best || strength > best.bombStrength) best = { type: T.STR_FLUSH, len: 5, key: strength, bombStrength: strength };
    }
  }
  return best;
}

function tryPairStraight(tg, level, groups) {
  const { counts, wild } = tg;
  const pointCnt = new Map();
  for (const [r, c] of counts) pointCnt.set(r + 2, c);
  const hasAceLow = pointCnt.has(14);
  let best = null;
  for (let s = 1; s + groups - 1 <= 14; s++) {
    let needWild = 0, ok = true;
    for (let k = 0; k < groups; k++) {
      const p = s + k;
      const have = (p === 1) ? (hasAceLow ? pointCnt.get(14) : 0) : (pointCnt.get(p) || 0);
      if (have > 2) { ok = false; break; }
      needWild += 2 - Math.min(2, have);
      if (needWild > wild) { ok = false; break; }
    }
    if (!ok || needWild !== wild) continue;
    const key = s + groups - 1;
    if (!best || key > best.key) best = { type: T.PAIR_STR, len: groups * 2, key, bombStrength: 0 };
  }
  return best;
}

function tryTripleStraight(tg, level, groups) {
  const { counts, wild } = tg;
  const pointCnt = new Map();
  for (const [r, c] of counts) pointCnt.set(r + 2, c);
  const hasAceLow = pointCnt.has(14);
  let best = null;
  for (let s = 1; s + groups - 1 <= 14; s++) {
    let needWild = 0, ok = true;
    for (let k = 0; k < groups; k++) {
      const p = s + k;
      const have = (p === 1) ? (hasAceLow ? pointCnt.get(14) : 0) : (pointCnt.get(p) || 0);
      if (have > 3) { ok = false; break; }
      needWild += 3 - Math.min(3, have);
      if (needWild > wild) { ok = false; break; }
    }
    if (!ok || needWild !== wild) continue;
    const key = s + groups - 1;
    if (!best || key > best.key) best = { type: T.TRIPLE_STR, len: groups * 3, key, bombStrength: 0 };
  }
  return best;
}

function isBombType(t) {
  return t === T.BOMB || t === T.STR_FLUSH || t === T.JOKER_BOMB;
}

function beats(cand, prev) {
  if (!cand) return false;
  if (!prev) return true;
  const cb = isBombType(cand.type), pb = isBombType(prev.type);
  if (cb && !pb) return true;
  if (!cb && pb) return false;
  if (cb && pb) return cand.bombStrength > prev.bombStrength;
  if (cand.type !== prev.type) return false;
  if (cand.len !== prev.len) return false;
  return cand.key > prev.key;
}

function buildDeck() {
  const d = [];
  for (let deck = 0; deck < 2; deck++) {
    for (let s = 0; s < 4; s++)
      for (let r = 0; r < 13; r++) d.push(deck * 54 + s * 13 + r);
    d.push(deck * 54 + 52);
    d.push(deck * 54 + 53);
  }
  return d;
}
function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// decompose: 把手牌拆成不重叠的最优 group set
function decompose(hand, level) {
  const cards = hand.slice();
  const groups = [];
  const jb = cards.filter(isJoker);
  if (jb.length === 4) {
    groups.push({ type: T.JOKER_BOMB, cards: jb.slice() });
    for (const c of jb) cards.splice(cards.indexOf(c), 1);
  }
  function buildCnt(list) {
    const m = new Map();
    for (const c of list) {
      if (isJoker(c) || isWild(c, level)) continue;
      const r = cardRankIdx(c);
      if (!m.has(r)) m.set(r, []);
      m.get(r).push(c);
    }
    return m;
  }
  let wilds = cards.filter(c => isWild(c, level));
  let jokers = cards.filter(isJoker);
  let cnt = buildCnt(cards);
  function take(r, k) {
    const arr = cnt.get(r);
    const out = arr.splice(0, k);
    if (!arr.length) cnt.delete(r);
    return out;
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const [r, arr] of [...cnt.entries()]) {
      if (arr.length >= 4) { groups.push({ type: T.BOMB, cards: take(r, arr.length) }); changed = true; }
    }
  }
  function pointMap() {
    const pm = new Map();
    for (const [r, arr] of cnt) pm.set(r + 2, arr.length);
    return pm;
  }
  function pullStraight() {
    const pm = pointMap();
    const aceLow = pm.has(14);
    for (let s = 10; s >= 1; s--) {
      if (s + 4 > 14) continue;
      let need = 0; const pts = [];
      for (let k = 0; k < 5; k++) {
        const p = s + k;
        const has = (p === 1) ? aceLow : (pm.get(p) > 0);
        if (has) pts.push(p === 1 ? 14 : p);
        else { need++; pts.push(p === 1 ? 14 : p); }
      }
      if (need <= wilds.length) {
        const used = [];
        for (const p of pts) {
          const ri = p - 2;
          if (cnt.has(ri) && cnt.get(ri).length) used.push(take(ri, 1)[0]);
          else used.push(wilds.shift());
        }
        return used;
      }
    }
    return null;
  }
  let st;
  while ((st = pullStraight())) groups.push({ type: T.STRAIGHT, cards: st });
  function pullTripleStraight() {
    const ranks = [...cnt.keys()].sort((a, b) => a - b);
    for (let i = 0; i + 1 < ranks.length; i++) {
      const r1 = ranks[i], r2 = ranks[i + 1];
      if (r2 - r1 !== 1) continue;
      if ((cnt.get(r1) || []).length >= 3 && (cnt.get(r2) || []).length >= 3) return [...take(r1, 3), ...take(r2, 3)];
    }
    return null;
  }
  let ts; while ((ts = pullTripleStraight())) groups.push({ type: T.TRIPLE_STR, cards: ts });
  function pullPairStraight() {
    const ranks = [...cnt.keys()].sort((a, b) => a - b);
    for (let i = 0; i + 2 < ranks.length; i++) {
      const r1 = ranks[i], r2 = ranks[i + 1], r3 = ranks[i + 2];
      if (r2 - r1 !== 1 || r3 - r2 !== 1) continue;
      if ((cnt.get(r1) || []).length >= 2 && (cnt.get(r2) || []).length >= 2 && (cnt.get(r3) || []).length >= 2)
        return [...take(r1, 2), ...take(r2, 2), ...take(r3, 2)];
    }
    return null;
  }
  let ps; while ((ps = pullPairStraight())) groups.push({ type: T.PAIR_STR, cards: ps });
  for (const [r] of [...cnt.entries()]) {
    while (cnt.has(r) && cnt.get(r).length >= 3) groups.push({ type: T.TRIPLE, cards: take(r, 3) });
  }
  for (const [r] of [...cnt.entries()]) {
    while (cnt.has(r) && cnt.get(r).length >= 2) groups.push({ type: T.PAIR, cards: take(r, 2) });
  }
  while (true) {
    const tIdx = groups.findIndex(g => g.type === T.TRIPLE);
    const pIdx = groups.findIndex(g => g.type === T.PAIR);
    if (tIdx < 0 || pIdx < 0) break;
    const t = groups[tIdx], p = groups[pIdx];
    const merged = { type: T.TRIPLE_PAIR, cards: [...t.cards, ...p.cards] };
    const remove = [tIdx, pIdx].sort((a, b) => b - a);
    for (const i of remove) groups.splice(i, 1);
    groups.push(merged);
  }
  let singles = [];
  for (const [, arr] of cnt) for (const c of arr) singles.push(c);
  singles.sort((a, b) => singleWeight(a, level) - singleWeight(b, level));
  while (wilds.length && singles.length) {
    const big = singles.pop();
    groups.push({ type: T.PAIR, cards: [big, wilds.shift()] });
  }
  for (const w of wilds) groups.push({ type: T.SINGLE, cards: [w] });
  const jb2 = jokers.slice();
  while (jb2.length >= 2) groups.push({ type: T.PAIR, cards: [jb2.shift(), jb2.shift()] });
  for (const j of jb2) groups.push({ type: T.SINGLE, cards: [j] });
  for (const c of singles) groups.push({ type: T.SINGLE, cards: [c] });
  return groups;
}

// genMoves: 列出所有能压 prev 的候选（prev=null → 所有合法首攻）
function genMoves(hand, prev, level) {
  const res = [];
  const seenKey = new Set();
  function consider(cards) {
    if (!cards || !cards.length) return;
    const cb = classify(cards, level);
    if (!cb) return;
    if (prev && !beats(cb, prev)) return;
    const k = cb.type + ':' + cb.len + ':' + cb.key + ':' + cards.slice().sort((a,b)=>a-b).join(',');
    if (seenKey.has(k)) return;
    seenKey.add(k);
    res.push({ combo: cb, cards: cards.slice() });
  }
  const wilds = hand.filter(c => isWild(c, level));
  const jokers = hand.filter(isJoker);
  const byRank = new Map();
  for (const c of hand) {
    if (isJoker(c) || isWild(c, level)) continue;
    const r = cardRankIdx(c);
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r).push(c);
  }
  const ranks = [...byRank.keys()];
  if (!prev || prev.type === T.SINGLE) {
    for (const c of hand) if (!isWild(c, level)) consider([c]);
    for (const w of wilds) consider([w]);
  }
  if (!prev || prev.type === T.PAIR) {
    for (const r of ranks) {
      const a = byRank.get(r);
      if (a.length >= 2) consider([a[0], a[1]]);
      else if (a.length === 1 && wilds.length >= 1) consider([a[0], wilds[0]]);
    }
    const bigs = jokers.filter(c => jokerKind(c) === 'big');
    const smalls = jokers.filter(c => jokerKind(c) === 'small');
    if (bigs.length >= 2) consider([bigs[0], bigs[1]]);
    if (smalls.length >= 2) consider([smalls[0], smalls[1]]);
    if (wilds.length >= 2) consider([wilds[0], wilds[1]]);
  }
  if (!prev || prev.type === T.TRIPLE) {
    for (const r of ranks) {
      const a = byRank.get(r);
      if (a.length >= 3) consider([a[0], a[1], a[2]]);
      else if (a.length === 2 && wilds.length >= 1) consider([a[0], a[1], wilds[0]]);
      else if (a.length === 1 && wilds.length >= 2) consider([a[0], wilds[0], wilds[1]]);
    }
  }
  if (!prev || prev.type === T.TRIPLE_PAIR) {
    for (const r of ranks) {
      const a = byRank.get(r);
      let triple = null;
      if (a.length >= 3) triple = [a[0], a[1], a[2]];
      else if (a.length === 2 && wilds.length >= 1) triple = [a[0], a[1], wilds[0]];
      if (!triple) continue;
      const remW = wilds.filter(w => !triple.includes(w));
      for (const r2 of ranks) {
        if (r2 === r) continue;
        const b = byRank.get(r2);
        if (b.length >= 2) consider([...triple, b[0], b[1]]);
        else if (b.length === 1 && remW.length >= 1) consider([...triple, b[0], remW[0]]);
      }
    }
  }
  // Bombs (all sizes)
  for (const r of ranks) {
    const a = byRank.get(r);
    if (a.length >= 4) {
      for (let n = 4; n <= a.length; n++) consider(a.slice(0, n));
    }
    // BOMB with wild
    if (a.length >= 3 && wilds.length >= 1) consider([...a.slice(0, 3), wilds[0]]);
  }
  // Joker bomb
  if (jokers.length === 4) consider(jokers.slice());
  // Straights (5 cards continuous)
  genSeq(5, 1, T.STRAIGHT, hand, prev, level, ranks, byRank, wilds, consider);
  genSeq(3, 2, T.PAIR_STR, hand, prev, level, ranks, byRank, wilds, consider);
  genSeq(2, 3, T.TRIPLE_STR, hand, prev, level, ranks, byRank, wilds, consider);
  return res;
}
function genSeq(groups, per, type, hand, prev, level, ranks, byRank, wilds, consider) {
  if (prev && prev.type !== type) return;
  const pointCards = new Map();
  for (const r of ranks) pointCards.set(r + 2, byRank.get(r).slice());
  for (let s = 1; s + groups - 1 <= 14; s++) {
    let need = 0;
    const pick = [];
    let okShape = true;
    for (let k = 0; k < groups; k++) {
      const p = s + k;
      const realPt = (p === 1) ? 14 : p;
      const avail = pointCards.get(realPt) || [];
      if (avail.length >= per) pick.push(avail.slice(0, per));
      else { const miss = per - avail.length; need += miss; pick.push({ real: avail.slice(), miss }); }
    }
    if (need > wilds.length) continue;
    const cards = [];
    let wi = 0;
    for (const grp of pick) {
      if (Array.isArray(grp)) cards.push(...grp);
      else { cards.push(...grp.real); for (let m = 0; m < grp.miss; m++) cards.push(wilds[wi++]); }
    }
    consider(cards);
  }
}

function moveBreakCost(move, hand, level) {
  const used = new Map();
  for (const c of move.cards) {
    if (isJoker(c) || isWild(c, level)) continue;
    const r = cardRankIdx(c);
    used.set(r, (used.get(r) || 0) + 1);
  }
  const handCnt = new Map();
  for (const c of hand) {
    if (isJoker(c) || isWild(c, level)) continue;
    const r = cardRankIdx(c);
    handCnt.set(r, (handCnt.get(r) || 0) + 1);
  }
  let cost = 0;
  for (const [r, u] of used) {
    const total = handCnt.get(r) || 0;
    const remain = total - u;
    if (remain > 0) cost += remain;
  }
  return cost;
}

// ===========================================================
// AI 决策（参数化）
// ===========================================================

// 默认权重 = 当前 guandan.js 用的那一组
const DEFAULT_W = {
  passBase: -3,
  passPartnerWin: 14,
  passPartnerLow: 4,
  playFollowActive: 2.5,
  playFinish: 60,
  playFinishPartnerWin: 35,
  playPartnerWinPenalty: -22,
  playLeadLength: 0.35,
  playFollowLength: -0.12,
  breakMult: 1.5,
  wildCost: 7,
  jokerCost: 5,
  bombBase4: 8,
  bombPerExtra: 4,
  bombLeadMult: 1.0,
  bombLeadLateBonus: 0.6,
  bombFollowMult: 0.6,
  bombFollowOppLow: 1.3,
  bombFollowOppMed: 0.3,
  groupBombBase: 14,
  groupBombPerExtra: 8,
  handLenPenalty: 0.45,
  lookaheadDepth: 2,   // depth=1 完爆 greedy；depth=2 又比 depth=1 +9%；depth=3 不显著
};

function groupValue(g, level, w) {
  if (!g || !g.cards || !g.cards.length) return 0;
  const len = g.cards.length;
  const maxRankW = Math.max(...g.cards.map(c => singleWeight(c, level)));
  switch (g.type) {
    case T.JOKER_BOMB: return 60;
    case T.STR_FLUSH:  return 35;
    case T.BOMB:       return w.groupBombBase + (len - 4) * w.groupBombPerExtra + maxRankW * 0.05;
    case T.TRIPLE_STR: return 12;
    case T.PAIR_STR:   return 10;
    case T.STRAIGHT:   return 8;
    case T.TRIPLE_PAIR:return 7;
    case T.TRIPLE:     return 4;
    case T.PAIR:       return 3;
    case T.SINGLE:
      if (maxRankW >= 16) return 4;
      if (maxRankW >= 15) return 2.5;
      if (maxRankW >= 14) return 1;
      return -0.5;
  }
  return 0;
}

function evaluateHand(hand, level, w) {
  if (!hand || !hand.length) return 100;
  const groups = decompose(hand, level);
  let v = 0;
  for (const g of groups) v += groupValue(g, level, w);
  v -= w.handLenPenalty * hand.length;
  return v;
}

function moveUtility(move, hand, prev, leading, level, ctx, w, lvl, rng) {
  if (move.pass) {
    if (leading) return -Infinity;
    let u = w.passBase;
    if (ctx.partnerWinning) u += w.passPartnerWin;
    if (ctx.partnerWinning && ctx.partnerCount <= 3 && !ctx.partnerOut) u += w.passPartnerLow;
    return u;
  }
  const combo = move.combo;
  const isBomb = isBombType(combo.type);
  const cardSet = new Set(move.cards);
  const handAfter = hand.filter(c => !cardSet.has(c));
  const before = evaluateHand(hand, level, w);
  const after = evaluateHand(handAfter, level, w);
  let u = after - before;
  if (handAfter.length === 0) u += w.playFinish;
  if (leading) u += move.cards.length * w.playLeadLength;
  else {
    u += w.playFollowActive;
    u += move.cards.length * w.playFollowLength;
  }
  u -= moveBreakCost(move, hand, level) * w.breakMult;
  const wildUsed = move.cards.filter(c => isWild(c, level)).length;
  u -= wildUsed * w.wildCost;
  const jokerUsed = move.cards.filter(isJoker).length;
  u -= jokerUsed * w.jokerCost;
  if (isBomb) {
    const bombBase = (combo.type === T.JOKER_BOMB) ? 30
                   : (combo.type === T.STR_FLUSH) ? 16
                   : (w.bombBase4 + (combo.len - 4) * w.bombPerExtra);
    if (leading) {
      u -= bombBase * w.bombLeadMult;
      if (hand.length <= 5) u += bombBase * w.bombLeadLateBonus;
    } else {
      u -= bombBase * w.bombFollowMult;
      if (ctx.opponentMin <= 3) u += bombBase * w.bombFollowOppLow;
      else if (ctx.opponentMin <= 5) u += bombBase * w.bombFollowOppMed;
    }
  }
  if (!leading && ctx.partnerWinning) {
    if (handAfter.length === 0) u += w.playFinishPartnerWin;
    else u += w.playPartnerWinPenalty;
  }
  // 噪声
  if (lvl === 'easy') u += (rng() - 0.5) * 3;
  else if (lvl === 'normal') u += (rng() - 0.5) * 0.8;
  return u;
}

function chooseAIMove(seat, hand, prev, leading, level, state, w, lvl, rng) {
  if ((w.lookaheadDepth | 0) > 0) {
    return chooseAIMoveLookahead(seat, hand, prev, leading, level, state, w, lvl, rng);
  }
  return chooseAIMoveGreedy(seat, hand, prev, leading, level, state, w, lvl, rng);
}

function chooseAIMoveGreedy(seat, hand, prev, leading, level, state, w, lvl, rng) {
  const partner = (seat + 2) % 4;
  const myTeam = seat % 2;
  const oppSeats = [0,1,2,3].filter(s => (s % 2) !== myTeam && !state.out.includes(s));
  const opponentMin = oppSeats.length ? Math.min(...oppSeats.map(s => state.hands[s].length)) : 99;
  const ctx = {
    partner,
    partnerWinning: state.trick && state.trick.bestSeat === partner && !state.out.includes(partner),
    partnerCount: state.out.includes(partner) ? 0 : state.hands[partner].length,
    partnerOut: state.out.includes(partner),
    opponentMin,
    myCount: state.hands[seat].length,
  };
  const moves = genMoves(hand, prev, level);
  if (leading && !moves.length) {
    const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
    return classify([c], level);
  }
  let bestU = -Infinity, bestMove = null;
  for (const m of moves) {
    const u = moveUtility(m, hand, prev, leading, level, ctx, w, lvl, rng);
    if (u > bestU) { bestU = u; bestMove = m; }
  }
  if (!leading) {
    const passU = moveUtility({ pass: true }, hand, prev, leading, level, ctx, w, lvl, rng);
    if (passU > bestU) { bestU = passU; bestMove = null; }
  }
  return bestMove ? bestMove.combo : null;
}

// ---- 1-step lookahead ----
// 对每个候选 m：暂时应用 m，再让下一个 alive 座（greedy）选择回应，最后用
// teamValueAt 评估"我方剩余手牌效率 - 对方剩余手牌效率"，argmax 决定。
// depth>=2 时，模拟更多 ply（按 turn 顺序往下走 depth 步）。
function cloneStateMin(state) {
  return {
    hands: state.hands.map(h => h.slice()),
    out: state.out.slice(),
    turn: state.turn,
    trick: state.trick ? { ...state.trick } : null,
    lastPlay: state.lastPlay.slice(),
  };
}
function applyDecision(state, seat, decision) {
  if (!decision) {
    state.lastPlay[seat] = 'pass';
    state.trick.passes++;
    return;
  }
  for (const c of decision.cards) {
    const i = state.hands[seat].indexOf(c);
    if (i >= 0) state.hands[seat].splice(i, 1);
  }
  state.lastPlay[seat] = decision;
  state.trick.best = decision;
  state.trick.bestSeat = seat;
  state.trick.passes = 0;
  if (state.hands[seat].length === 0 && !state.out.includes(seat)) state.out.push(seat);
}
function nextSeatLookahead(state, seat) {
  const alive = [0,1,2,3].filter(s => !state.out.includes(s));
  if (state.trick.bestSeat >= 0 && state.trick.passes >= alive.length - 1 && alive.length >= 1) {
    // trick 结束 → bestSeat 领出（如果 out 则队友/下一活）
    let next = state.trick.bestSeat;
    if (state.out.includes(next)) {
      const partner = (next + 2) % 4;
      if (!state.out.includes(partner)) next = partner;
      else {
        let s = next;
        for (let i = 0; i < 4; i++) {
          s = (s + 1) % 4;
          if (!state.out.includes(s)) { next = s; break; }
        }
      }
    }
    return { seat: next, trickReset: true };
  }
  let s = seat;
  for (let i = 0; i < 4; i++) {
    s = (s + 1) % 4;
    if (!state.out.includes(s)) return { seat: s, trickReset: false };
  }
  return { seat, trickReset: false };
}
// 终值 = 我方"进度"减对方进度。进度 = 已出牌张数 + eff（小幅，让组织好的手有奖励）
// 关键：不能只看 evaluateHand 差，否则 AI 会拼命留牌（手里多 = eff 大但永远不出）
function teamValueAt(state, level, w, myTeam) {
  let myCnt = 0, oppCnt = 0, myEff = 0, oppEff = 0;
  for (let s = 0; s < 4; s++) {
    const len = state.hands[s].length;
    const isMy = s % 2 === myTeam;
    if (state.out.includes(s)) {
      // 出完了 → 巨大 bonus
      if (isMy) myEff += 50; else oppEff += 50;
    } else {
      const eff = evaluateHand(state.hands[s], level, w);
      if (isMy) { myCnt += len; myEff += eff; }
      else { oppCnt += len; oppEff += eff; }
    }
  }
  // 进度差是主导（每少出 1 张 = -1.5），eff 是辅助（每点组织性 = +0.2）
  return 1.5 * (oppCnt - myCnt) + 0.2 * (myEff - oppEff);
}
function chooseAIMoveLookahead(seat, hand, prev, leading, level, state, w, lvl, rng) {
  const depth = w.lookaheadDepth | 0;
  const myTeam = seat % 2;
  const moves = genMoves(hand, prev, level);
  if (leading && !moves.length) {
    const c = hand.slice().sort((a, b) => singleWeight(a, level) - singleWeight(b, level))[0];
    return classify([c], level);
  }
  // 也算 greedy utility 作为 tiebreaker / 即时性奖励（防纯 lookahead 忽视一手出完）
  const greedyU = new Map();
  const partner = (seat + 2) % 4;
  const oppSeats = [0,1,2,3].filter(s => (s % 2) !== myTeam && !state.out.includes(s));
  const opponentMin = oppSeats.length ? Math.min(...oppSeats.map(s => state.hands[s].length)) : 99;
  const ctx = {
    partner,
    partnerWinning: state.trick && state.trick.bestSeat === partner && !state.out.includes(partner),
    partnerCount: state.out.includes(partner) ? 0 : state.hands[partner].length,
    partnerOut: state.out.includes(partner),
    opponentMin,
    myCount: state.hands[seat].length,
  };
  for (const m of moves) greedyU.set(m, moveUtility(m, hand, prev, leading, level, ctx, w, lvl, () => 0.5));
  const passUGreedy = leading ? -Infinity : moveUtility({ pass: true }, hand, prev, leading, level, ctx, w, lvl, () => 0.5);

  function rolloutValue(initialState, initialSeat, initialDecision, plies) {
    const s = cloneStateMin(initialState);
    applyDecision(s, initialSeat, initialDecision);
    // 若我已出完且 round 结束 → 直接评估
    if (didRoundEnd(s)) return teamValueAt(s, level, w, myTeam);
    let curSeat = initialSeat;
    for (let p = 0; p < plies; p++) {
      const { seat: nextSeat, trickReset } = nextSeatLookahead(s, curSeat);
      if (trickReset) {
        s.lastPlay = [null, null, null, null];
        s.trick = { lead: nextSeat, best: null, bestSeat: -1, passes: 0 };
      }
      curSeat = nextSeat;
      const prev2 = (s.trick.best && s.trick.bestSeat !== curSeat) ? s.trick.best : null;
      const leading2 = !prev2;
      // 用 greedy 模拟其他人决策（避免无限递归）
      const tmpW = { ...w, lookaheadDepth: 0 };
      const dec = chooseAIMoveGreedy(curSeat, s.hands[curSeat], prev2, leading2, level, s, tmpW, lvl, () => 0.5);
      applyDecision(s, curSeat, dec);
      if (didRoundEnd(s)) break;
    }
    return teamValueAt(s, level, w, myTeam);
  }

  let bestU = -Infinity, bestMove = null;
  for (const m of moves) {
    const lookV = rolloutValue(state, seat, m, depth);
    // 综合：lookahead 价值 + λ·greedy 即时分（λ 调权）
    const blendU = lookV + 0.35 * (greedyU.get(m) || 0);
    if (blendU > bestU) { bestU = blendU; bestMove = m; }
  }
  if (!leading) {
    const lookVPass = rolloutValue(state, seat, null, depth);
    const blendPass = lookVPass + 0.35 * passUGreedy;
    if (blendPass > bestU) { bestU = blendPass; bestMove = null; }
  }
  return bestMove ? bestMove.combo : null;
}

// ===========================================================
// 进贡 / 还贡
// ===========================================================
function pickTributeCard(hand, level) {
  let best = null, bw = -1;
  for (const c of hand) {
    if (isWild(c, level)) continue;
    const w = singleWeight(c, level);
    if (w > bw) { bw = w; best = c; }
  }
  if (best == null) best = hand[0];
  return best;
}
function pickReturnCard(hand, level) {
  const LOW = new Set(['2','3','4','5','6','7','8','9','10']);
  let best = null, bw = 1e9;
  for (const c of hand) {
    if (isJoker(c)) continue;
    if (!LOW.has(RANK_LABELS[cardRankIdx(c)])) continue;
    const w = singleWeight(c, level);
    if (w < bw) { bw = w; best = c; }
  }
  if (best == null) {
    for (const c of hand) {
      if (isJoker(c)) continue;
      const w = singleWeight(c, level);
      if (w < bw) { bw = w; best = c; }
    }
  }
  if (best == null) best = hand[0];
  return best;
}
// 双下进贡：3+4 同队 → 各上贡最大非红心级牌，1+2 还 ≤10。损方双大王 → 抗贡免贡。
// 返回 newLeader（头游进贡的人领出下一圈；非双下 / 抗贡 → ranking[0] 领出）
function handleTribute(hands, ranking, level) {
  const [first, second, third, fourth] = ranking;
  const winTeam = first % 2;
  const doubleDown = (third % 2) === (fourth % 2) && (third % 2) !== winTeam;
  if (!doubleDown) return { newLeader: first };
  let bigJokers = 0;
  for (const s of [third, fourth]) for (const c of hands[s]) if (isJoker(c) && jokerKind(c) === 'big') bigJokers++;
  if (bigJokers >= 2) return { newLeader: first };
  const fourthCard = pickTributeCard(hands[fourth], level);
  const thirdCard = pickTributeCard(hands[third], level);
  const fw = singleWeight(fourthCard, level);
  const tw = singleWeight(thirdCard, level);
  let bigGiver, bigCard, smallGiver, smallCard;
  if (fw >= tw) { bigGiver = fourth; bigCard = fourthCard; smallGiver = third; smallCard = thirdCard; }
  else { bigGiver = third; bigCard = thirdCard; smallGiver = fourth; smallCard = fourthCard; }
  const pairs = [
    { giver: bigGiver, receiver: first, tributeCard: bigCard },
    { giver: smallGiver, receiver: second, tributeCard: smallCard },
  ];
  for (const pair of pairs) {
    const idx = hands[pair.giver].indexOf(pair.tributeCard);
    if (idx >= 0) hands[pair.giver].splice(idx, 1);
    hands[pair.receiver].push(pair.tributeCard);
    const returnCard = pickReturnCard(hands[pair.receiver], level);
    const idx2 = hands[pair.receiver].indexOf(returnCard);
    if (idx2 >= 0) hands[pair.receiver].splice(idx2, 1);
    hands[pair.giver].push(returnCard);
  }
  return { newLeader: bigGiver };
}

// ===========================================================
// 单局（一小局）模拟
// ===========================================================
function simulateRound({ weightsByTeam, level = '2', firstLeader = 0, hands = null, rng = Math.random, collect = null }) {
  if (!hands) {
    const deck = shuffle(buildDeck(), rng);
    hands = [[], [], [], []];
    for (let i = 0; i < 108; i++) hands[i % 4].push(deck[i]);
  }
  const state = {
    hands,
    out: [],
    turn: firstLeader,
    trick: { lead: firstLeader, best: null, bestSeat: -1, passes: 0 },
    lastPlay: [null, null, null, null],
  };
  const TEAM = c => c % 2;
  const maxIters = 600;   // 安全闸
  let iter = 0;
  while (state.out.length < 3 && iter++ < maxIters) {
    const seat = state.turn;
    if (state.out.includes(seat)) {
      state.turn = nextAlive(state, seat);
      continue;
    }
    const team = TEAM(seat);
    const lvl = 'normal';   // sim 默认 normal
    const trick = state.trick;
    const prev = (trick.best && trick.bestSeat !== seat) ? trick.best : null;
    const leading = !prev;
    const decision = chooseAIMove(seat, state.hands[seat], prev, leading, level, state, weightsByTeam[team], lvl, rng);
    if (collect && collect[team]) _recMove(collect[team], decision, leading);
    if (!decision) {
      // pass
      state.lastPlay[seat] = 'pass';
      state.trick.passes++;
    } else {
      // play
      for (const c of decision.cards) {
        const i = state.hands[seat].indexOf(c);
        if (i >= 0) state.hands[seat].splice(i, 1);
      }
      state.lastPlay[seat] = decision;
      state.trick.best = decision;
      state.trick.bestSeat = seat;
      state.trick.passes = 0;
      if (state.hands[seat].length === 0 && !state.out.includes(seat)) state.out.push(seat);
    }
    // 检查回合是否结束
    if (didRoundEnd(state)) break;
    // 检查 trick 是否结束
    const alive = [0,1,2,3].filter(s => !state.out.includes(s));
    if (state.trick.bestSeat >= 0 && state.trick.passes >= alive.length - 1 && alive.length >= 1) {
      let nextLeader = state.trick.bestSeat;
      if (state.out.includes(nextLeader)) {
        const partner = (nextLeader + 2) % 4;
        if (!state.out.includes(partner)) nextLeader = partner;
        else nextLeader = nextAlive(state, nextLeader);
      }
      state.lastPlay = [null, null, null, null];
      state.trick = { lead: nextLeader, best: null, bestSeat: -1, passes: 0 };
      state.turn = nextLeader;
      continue;
    }
    state.turn = nextAlive(state, seat);
    if (state.lastPlay[state.turn] === 'pass') state.lastPlay[state.turn] = null;
  }
  // round end: rank order
  const ranking = state.out.slice();
  if (ranking.length < 4) {
    const rest = [0,1,2,3].filter(s => !ranking.includes(s));
    rest.sort((a, b) => state.hands[a].length - state.hands[b].length);
    for (const s of rest) ranking.push(s);
  }
  return { ranking, iter };
}
function nextAlive(state, seat) {
  let s = seat;
  for (let i = 0; i < 4; i++) {
    s = (s + 1) % 4;
    if (!state.out.includes(s)) return s;
  }
  return seat;
}
function didRoundEnd(state) {
  if (state.out.length >= 3) return true;
  const t0 = state.out.filter(s => s % 2 === 0).length;
  const t1 = state.out.filter(s => s % 2 === 1).length;
  return t0 === 2 || t1 === 2;
}

// ===========================================================
// 整副 match：含 tribute + 升级动态，打到一方过 A 为止
// ===========================================================
function simulateMatch({ weightsByTeam, rng = Math.random, maxRounds = 25, collect = null }) {
  const levels = [0, 0];
  let actingTeam = 0;
  let lastRanking = null;
  let firstLeader = Math.floor(rng() * 4);
  let totalIter = 0;
  for (let round = 0; round < maxRounds; round++) {
    const level = LEVEL_SEQ[levels[actingTeam]];
    // Deal
    const deck = shuffle(buildDeck(), rng);
    const hands = [[], [], [], []];
    for (let i = 0; i < 108; i++) hands[i % 4].push(deck[i]);
    // Tribute（非首局）
    if (lastRanking) {
      const { newLeader } = handleTribute(hands, lastRanking, level);
      firstLeader = newLeader;
    }
    // Play
    const { ranking, iter } = simulateRound({ weightsByTeam, level, firstLeader, hands, rng, collect });
    totalIter += iter;
    lastRanking = ranking;
    const first = ranking[0];
    const winTeam = first % 2;
    const partner = (first + 2) % 4;
    const partnerPos = ranking.indexOf(partner);
    const advance = (partnerPos === 1) ? 3 : (partnerPos === 2) ? 2 : 1;
    const beforeIdx = levels[winTeam];
    const wasAtA = LEVEL_SEQ[beforeIdx] === 'A';
    if (wasAtA) {
      // 打过 A → 整副结束
      return { winner: winTeam, rounds: round + 1, totalIter };
    }
    levels[winTeam] = Math.min(LEVEL_SEQ.length - 1, beforeIdx + advance);
    actingTeam = winTeam;
    firstLeader = first;
  }
  // 超时（应该极少）→ level 高者赢
  return { winner: levels[0] >= levels[1] ? 0 : 1, rounds: maxRounds, timeout: true, totalIter };
}

// 比较 test vs baseline weights：跑 n 场整副 match，统计 test 队胜场
function runMatches(weightsTest, weightsBaseline, n, rng = Math.random, collect = null) {
  let testWins = 0, baselineWins = 0, totalRounds = 0, totalIter = 0;
  for (let i = 0; i < n; i++) {
    const swap = i % 2 === 1;
    const weightsByTeam = swap
      ? { 0: weightsBaseline, 1: weightsTest }
      : { 0: weightsTest, 1: weightsBaseline };
    // 出牌分布收集：把 test/baseline 的累加器按本场 swap 映射到队 0/1（与 weightsByTeam 一致）
    const roundCollect = collect
      ? (swap ? { 0: collect.baseline, 1: collect.test } : { 0: collect.test, 1: collect.baseline })
      : null;
    const { winner, rounds, totalIter: iters } = simulateMatch({ weightsByTeam, rng, collect: roundCollect });
    totalRounds += rounds;
    totalIter += iters;
    const testTeam = swap ? 1 : 0;
    if (winner === testTeam) testWins++;
    else baselineWins++;
  }
  return { testWins, baselineWins, n, avgRounds: totalRounds / n, avgIter: totalIter / Math.max(1, totalRounds) };
}

// ===========================================================
// 回归对比（regress）：固定种子下让「候选 AI」vs「基线 AI」对打 N 副，
// 报胜率 ± 95%CI + 退化判定 + 双方出牌风格对比。固定种子 → 可复现、改前改后可对拍。
// ===========================================================
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function _newStats() { return { turns: 0, plays: 0, passes: 0, cards: 0, bombs: 0, leads: 0, follows: 0, byType: {} }; }
function _recMove(s, decision, leading) {
  s.turns++;
  if (!decision) { s.passes++; return; }
  s.plays++;
  s.cards += decision.cards.length;
  s.byType[decision.type] = (s.byType[decision.type] || 0) + 1;
  if (isBombType(decision.type)) s.bombs++;
  if (leading) s.leads++; else s.follows++;
}
const _TYPE_NAME = {
  single: '单张', pair: '对子', triple: '三张', triple_pair: '三带二', pair_str: '三连对',
  triple_str: '钢板', straight: '顺子', bomb: '炸弹', str_flush: '同花顺', joker_bomb: '天王炸',
};
function _printDist(a, b) {
  const pct = (x, tot) => (tot ? (100 * x / tot).toFixed(1) : '0.0') + '%';
  const per = (x, tot) => tot ? (x / tot).toFixed(2) : '0.00';
  const row = (label, av, bv) => console.log('  ' + label + '\t' + av + '\t' + bv);
  console.log('  指标\t候选\t基线');
  row('pass率(占回合)', pct(a.passes, a.turns), pct(b.passes, b.turns));
  row('均牌数/出牌 ', per(a.cards, a.plays), per(b.cards, b.plays));
  row('炸弹率(占出牌)', pct(a.bombs, a.plays), pct(b.bombs, b.plays));
  for (const t of Object.keys(_TYPE_NAME)) {
    const av = a.byType[t] || 0, bv = b.byType[t] || 0;
    if (av === 0 && bv === 0) continue;
    row(_TYPE_NAME[t] + '(占出牌)', pct(av, a.plays), pct(bv, b.plays));
  }
}
function regress({ candW, baselineW, n, seed, candLabel, baselineLabel }) {
  const rng = makeRng(seed);
  const collect = { test: _newStats(), baseline: _newStats() };
  console.log('=== regress：候选 (' + candLabel + ') vs 基线 (' + baselineLabel + ') ===');
  console.log('N=' + n + ' 副 · seed=' + seed + '（固定种子→同一批牌局，可复现）');
  const t0 = Date.now();
  const r = runMatches(candW, baselineW, n, rng, collect);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const rate = r.testWins / r.n;
  const ci = 1.96 * Math.sqrt(rate * (1 - rate) / r.n);
  let verdict;
  if (rate - ci > 0.5) verdict = '✅ 候选显著更强（95%CI 下界 > 50%）';
  else if (rate + ci < 0.5) verdict = '🔴 退化：候选显著更弱（95%CI 上界 < 50%）';
  else verdict = '⚪ 无显著差异（95%CI 跨过 50%，要更确信就加大 N）';
  console.log('\n胜率（候选 vs 基线）：' + (rate * 100).toFixed(1) + '% ± ' + (ci * 100).toFixed(1) + '%   ' + verdict);
  console.log('候选胜 ' + r.testWins + ' / ' + r.n + ' · 平均 ' + r.avgRounds.toFixed(1) + ' 小局/副 · 用时 ' + secs + 's');
  console.log('\n出牌风格对比：');
  _printDist(collect.test, collect.baseline);
  return { rate, ci, collect };
}

// ===========================================================
// Coordinate descent 调参
// ===========================================================
const TUNE_KEYS = [
  'passBase', 'passPartnerWin', 'playFollowActive', 'playFinish',
  'playPartnerWinPenalty', 'breakMult', 'bombBase4', 'handLenPenalty',
];
const DELTAS = [-0.35, -0.15, 0, 0.15, 0.35];   // 相对当前值的乘性扰动

function tune({ matchesPerTrial = 60, iterations = 2 }) {
  let current = { ...DEFAULT_W };
  console.log('== baseline weights ==');
  console.log(JSON.stringify(current, null, 2));
  for (let it = 0; it < iterations; it++) {
    console.log('\n=== iteration ' + (it + 1) + ' ===');
    for (const key of TUNE_KEYS) {
      const base = current[key];
      let bestVal = base;
      let bestRate = -1;
      const results = [];
      for (const delta of DELTAS) {
        const tryVal = (delta === 0) ? base : base * (1 + delta);
        const tryW = { ...current, [key]: tryVal };
        const { testWins, baselineWins } = runMatches(tryW, current, matchesPerTrial);
        const rate = testWins / (testWins + baselineWins);
        results.push({ delta, val: tryVal.toFixed(3), rate: rate.toFixed(3) });
        if (rate > bestRate) { bestRate = rate; bestVal = tryVal; }
      }
      // 显示这一轮
      const line = key.padEnd(24) + ' base=' + base.toFixed(3) + '  ' +
        results.map(r => (r.delta === 0 ? '·' : (r.delta > 0 ? '+' : '')) + (r.delta * 100).toFixed(0) + '%:' + r.rate).join('  ') +
        '  → ' + bestVal.toFixed(3) + (Math.abs(bestVal - base) > 1e-9 ? ' (changed)' : '');
      console.log(line);
      current[key] = bestVal;
    }
  }
  console.log('\n== best weights ==');
  console.log(JSON.stringify(current, null, 2));
  // 最终评估 vs baseline
  console.log('\n== final showdown vs baseline ==');
  const final = runMatches(current, DEFAULT_W, matchesPerTrial * 6);
  const rate = final.testWins / final.n;
  const se = Math.sqrt(rate * (1 - rate) / final.n);
  console.log('test wins ' + final.testWins + ' / ' + final.n + '  =  ' + rate.toFixed(3) +
    ' ± ' + (1.96 * se).toFixed(3) + ' (95% CI)' +
    '  · avg rounds/match ' + final.avgRounds.toFixed(1) +
    '  · avg iter/round ' + final.avgIter.toFixed(0));
  // 写到 scripts/sim-guandan-best.json
  const fs = require('fs');
  fs.writeFileSync('scripts/sim-guandan-best.json', JSON.stringify(current, null, 2));
  console.log('\nwritten to scripts/sim-guandan-best.json');
}

// ===========================================================
// (μ/μ, λ)-ES：每代采样 popSize 个候选，取前 25% 求平均作为新中心，sigma 几何衰减
// 优点：捕捉权重间交互（coord descent 漏掉的）；
// 缺点：每代 popSize 个 eval × matches，时间 ∝ popSize·gen·matches
// ===========================================================
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
// 内核：跑一个 ES，返回每代结束后的 centroid 数组（含 gen 0..generations-1）
function runES({ startCenter, sigmaInit = 0.25, generations = 5, popSize = 20, matchesPerEval = 60, label = '' }) {
  const keys = TUNE_KEYS;
  let center = { ...startCenter };
  let sigma = sigmaInit;
  const centroids = [];   // [{ gen, center, topRate }]
  for (let gen = 0; gen < generations; gen++) {
    const pop = [];
    for (let i = 0; i < popSize; i++) {
      const cand = { ...center };
      for (const k of keys) cand[k] = center[k] * (1 + gaussianRandom() * sigma);
      pop.push(cand);
    }
    const results = [];
    const tStart = Date.now();
    for (let i = 0; i < pop.length; i++) {
      const { testWins } = runMatches(pop[i], center, matchesPerEval);
      const rate = testWins / matchesPerEval;
      results.push({ cand: pop[i], rate });
      process.stdout.write('\r' + label + ' gen ' + gen + ' eval ' + (i + 1) + '/' + popSize + ' rate=' + rate.toFixed(2) + '   ');
    }
    process.stdout.write('\n');
    const elapsed = ((Date.now() - tStart) / 1000).toFixed(0);
    results.sort((a, b) => b.rate - a.rate);
    const muSize = Math.max(2, Math.floor(popSize / 4));
    const top = results.slice(0, muSize);
    const newCenter = { ...center };
    for (const k of keys) {
      let sum = 0;
      for (const r of top) sum += r.cand[k];
      newCenter[k] = sum / top.length;
    }
    sigma *= 0.78;
    console.log(label + ' gen ' + gen + ' done (' + elapsed + 's): top rates [' +
      top.slice(0, 5).map(r => r.rate.toFixed(2)).join(', ') + ']; sigma → ' + sigma.toFixed(3));
    center = newCenter;
    centroids.push({ gen, center: { ...center }, topRate: top[0].rate });
  }
  return centroids;
}

function esTune({ generations = 6, popSize = 24, matchesPerEval = 80, sigmaInit = 0.25, startWeights = null }) {
  const startCenter = startWeights ? { ...DEFAULT_W, ...startWeights } : { ...DEFAULT_W };
  console.log('== ES tune start ==');
  console.log('center: ' + JSON.stringify(Object.fromEntries(TUNE_KEYS.map(k => [k, startCenter[k]]))));
  console.log('popSize=' + popSize + ' generations=' + generations + ' matchesPerEval=' + matchesPerEval);
  const centroids = runES({ startCenter, sigmaInit, generations, popSize, matchesPerEval });
  const center = centroids[centroids.length - 1].center;
  console.log('\n== ES best weights ==');
  console.log(JSON.stringify(center, null, 2));
  console.log('\n== final showdown vs DEFAULT_W ==');
  const final = runMatches(center, DEFAULT_W, matchesPerEval * 4);
  const rate = final.testWins / final.n;
  const se = Math.sqrt(rate * (1 - rate) / final.n);
  console.log('test wins ' + final.testWins + ' / ' + final.n + '  =  ' + rate.toFixed(3) +
    ' ± ' + (1.96 * se).toFixed(3) + ' (95% CI)' +
    '  · avg rounds/match ' + final.avgRounds.toFixed(1));
  require('fs').writeFileSync('scripts/sim-guandan-es-best.json', JSON.stringify(center, null, 2));
  console.log('written to scripts/sim-guandan-es-best.json');
}

// ===========================================================
// pop-gen：K 个独立 ES run，每个用不同起点 + 不同种子，每个 run 保存 3 个快照
// 输出 scripts/sim-guandan-population.json（增量写入：每个 run 完成立即落盘）
// ===========================================================
function popGen({ K = 10, generations = 4, popSize = 16, matchesPerEval = 50, startSigma = 0.4 }) {
  const fs = require('fs');
  const popPath = 'scripts/sim-guandan-population.json';
  // 续跑支持：如果文件存在且是 array，从已有进度继续
  let population = [];
  let startK = 0;
  if (fs.existsSync(popPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(popPath, 'utf8'));
      if (Array.isArray(existing) && existing.length > 0) {
        population = existing;
        startK = Math.max(...existing.map(e => e.runIdx || 0)) + 1;
        console.log('resuming from existing population.json (' + existing.length + ' entries, next runIdx=' + startK + ')');
      }
    } catch (e) { /* fresh start */ }
  }
  console.log('== pop-gen ==');
  console.log('K=' + K + ' generations=' + generations + ' popSize=' + popSize + ' matchesPerEval=' + matchesPerEval + ' startSigma=' + startSigma);
  console.log('est ' + (K * generations * popSize * matchesPerEval * 0.4 / 3600).toFixed(1) + 'h total');

  const overallStart = Date.now();
  for (let k = startK; k < K; k++) {
    // run k 的起点：k=0 用 DEFAULT_W，其余在 DEFAULT_W 上加扰动
    const startCenter = { ...DEFAULT_W };
    if (k > 0) {
      for (const key of TUNE_KEYS) {
        startCenter[key] = DEFAULT_W[key] * (1 + gaussianRandom() * startSigma);
      }
    }
    console.log('\n--- run ' + k + ' / ' + K + ' (start sigma=' + startSigma + ') ---');
    const centroids = runES({ startCenter, sigmaInit: 0.25, generations, popSize, matchesPerEval, label: 'run' + k });
    // 保存 3 个快照：早期（弱）/ 中期 / 末期（强）。startSigma=0.4 起点本身就分散，
    // 早期 snapshot 接近于"未充分训练的偏弱模型"，是 easy 难度的天然候选源。
    const snapGens = [...new Set([
      0,                                  // 早期：刚跑完第 1 代，仍受起点扰动影响
      Math.floor((generations - 1) / 2),  // 中期：半训练
      generations - 1,                    // 末期：收敛
    ])];
    for (const g of snapGens) {
      population.push({
        id: 'run' + k + '_gen' + g,
        runIdx: k,
        genSnapshot: g,
        startCenter: { ...startCenter },
        weights: { ...centroids[g].center },
      });
    }
    // 增量落盘
    fs.writeFileSync(popPath, JSON.stringify(population, null, 2));
    const elapsed = ((Date.now() - overallStart) / 1000 / 60).toFixed(1);
    console.log('run ' + k + ' saved; population size = ' + population.length + '; total elapsed ' + elapsed + ' min');
  }
  console.log('\n== pop-gen DONE; ' + population.length + ' candidates written to ' + popPath + ' ==');
}

// ===========================================================
// tournament：群体内 round-robin，统计 Elo 排名
// ===========================================================
function tournament({ matchesPerPair = 60 }) {
  const fs = require('fs');
  const popPath = 'scripts/sim-guandan-population.json';
  if (!fs.existsSync(popPath)) {
    console.error('missing ' + popPath + ', run pop-gen first');
    process.exit(1);
  }
  const population = JSON.parse(fs.readFileSync(popPath, 'utf8'));
  // 加入两个锚点：DEFAULT_W 和 coord-best
  const anchors = [
    { id: 'DEFAULT_W', weights: { ...DEFAULT_W } },
  ];
  const coordPath = 'scripts/sim-guandan-best.json';
  if (fs.existsSync(coordPath)) {
    anchors.push({ id: 'coord-best', weights: JSON.parse(fs.readFileSync(coordPath, 'utf8')) });
  }
  const all = anchors.concat(population.map(p => ({ id: p.id, weights: p.weights })));
  const N = all.length;
  const numPairs = N * (N - 1) / 2;
  console.log('== tournament ==');
  console.log('N=' + N + ' pairs=' + numPairs + ' matchesPerPair=' + matchesPerPair);
  console.log('est ' + (numPairs * matchesPerPair * 0.4 / 3600).toFixed(1) + 'h total');

  // Elo 初始 1500
  const elo = new Map();
  for (const c of all) elo.set(c.id, 1500);
  const winsMatrix = {};  // winsMatrix[a][b] = wins of a vs b

  let pairIdx = 0;
  const tStart = Date.now();
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = all[i], b = all[j];
      const r = runMatches(a.weights, b.weights, matchesPerPair);
      const aWins = r.testWins;
      const bWins = r.baselineWins;
      winsMatrix[a.id] = winsMatrix[a.id] || {};
      winsMatrix[a.id][b.id] = aWins;
      winsMatrix[b.id] = winsMatrix[b.id] || {};
      winsMatrix[b.id][a.id] = bWins;
      // Elo 更新（一次性按总胜率）
      const sa = aWins / (aWins + bWins);
      const ea = 1 / (1 + Math.pow(10, (elo.get(b.id) - elo.get(a.id)) / 400));
      const K_ELO = 24;
      elo.set(a.id, elo.get(a.id) + K_ELO * (sa - ea));
      elo.set(b.id, elo.get(b.id) + K_ELO * ((1 - sa) - (1 - ea)));
      pairIdx++;
      const elapsed = (Date.now() - tStart) / 1000;
      const eta = elapsed / pairIdx * (numPairs - pairIdx) / 60;
      process.stdout.write('\rpair ' + pairIdx + '/' + numPairs + ' ' + a.id + ' vs ' + b.id +
        ' = ' + aWins + ':' + bWins + ' (ETA ' + eta.toFixed(0) + ' min)        ');
      // 增量保存
      if (pairIdx % 20 === 0) {
        saveTournamentResults(all, elo, winsMatrix, false);
      }
    }
  }
  process.stdout.write('\n');
  saveTournamentResults(all, elo, winsMatrix, true);
}
function saveTournamentResults(all, elo, winsMatrix, final) {
  const fs = require('fs');
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
  fs.writeFileSync('scripts/sim-guandan-ranking.json', JSON.stringify(ranking, null, 2));
  fs.writeFileSync('scripts/sim-guandan-wins-matrix.json', JSON.stringify(winsMatrix, null, 2));
  if (final) {
    console.log('\n== tournament DONE ==');
    console.log('Top 5: ' + ranking.slice(0, 5).map(r => r.id + '(' + r.elo.toFixed(0) + ')').join(', '));
    console.log('Bot 5: ' + ranking.slice(-5).map(r => r.id + '(' + r.elo.toFixed(0) + ')').join(', '));
    console.log('Elo spread: ' + ranking[0].elo.toFixed(0) + ' to ' + ranking[ranking.length-1].elo.toFixed(0));
  }
}

function sanity() {
  console.log('== sanity check: baseline vs baseline (should be ~50%) ==');
  const r = runMatches(DEFAULT_W, DEFAULT_W, 40);
  console.log('test wins ' + r.testWins + ' / ' + r.n + '  =  ' + (r.testWins / r.n).toFixed(3) +
    '  · avg rounds/match ' + r.avgRounds.toFixed(1) +
    '  · avg iter/round ' + r.avgIter.toFixed(0));
}

// ===========================================================
// 作为库被 require 时导出纯引擎函数（给 RL 环境 / Python 移植做 parity oracle 用）
// 不影响直接 `node sim-guandan.js <cmd>` 运行（下面 CLI 用 require.main 守卫）
// ===========================================================
module.exports = {
  RANK_LABELS, LEVEL_SEQ,
  isJoker, jokerKind, cardSuit, cardRankIdx, singleWeight, isWild,
  buildDeck, shuffle, tally,
  classify, classifyRaw, beats, isBombType,
  genMoves, decompose, DEFAULT_W,
  evaluateHand, groupValue, moveUtility,
  chooseAIMove, chooseAIMoveGreedy, chooseAIMoveLookahead,
  pickTributeCard, pickReturnCard, handleTribute,
  simulateRound, simulateMatch, runMatches,
  makeRng, regress,
};

// ===========================================================
// CLI（仅在直接 `node sim-guandan.js ...` 运行时执行）
// ===========================================================
if (require.main === module) {
const cmd = process.argv[2] || 'sanity';
if (cmd === 'sanity') sanity();
else if (cmd === 'tune') tune({ matchesPerTrial: parseInt(process.argv[3], 10) || 60, iterations: 2 });
else if (cmd === 'es-tune') {
  // es-tune [generations] [popSize] [matchesPerEval] [start.json]
  const generations = parseInt(process.argv[3], 10) || 6;
  const popSize = parseInt(process.argv[4], 10) || 24;
  const matchesPerEval = parseInt(process.argv[5], 10) || 80;
  const startPath = process.argv[6];
  const startWeights = startPath ? JSON.parse(require('fs').readFileSync(startPath, 'utf8')) : null;
  esTune({ generations, popSize, matchesPerEval, startWeights });
}
else if (cmd === 'pop-gen') {
  // pop-gen [K] [generations] [popSize] [matchesPerEval] [startSigma]
  const K = parseInt(process.argv[3], 10) || 10;
  const generations = parseInt(process.argv[4], 10) || 4;
  const popSize = parseInt(process.argv[5], 10) || 16;
  const matchesPerEval = parseInt(process.argv[6], 10) || 50;
  const startSigma = parseFloat(process.argv[7]) || 0.4;
  popGen({ K, generations, popSize, matchesPerEval, startSigma });
}
else if (cmd === 'tournament') {
  // tournament [matchesPerPair]
  const matchesPerPair = parseInt(process.argv[3], 10) || 60;
  tournament({ matchesPerPair });
}
else if (cmd === 'compare') {
  // compare <test-weights.json> [N] [baseline-weights.json]
  const fs = require('fs');
  const path = process.argv[3];
  const n = parseInt(process.argv[4], 10) || 600;
  const baselinePath = process.argv[5];
  const testW = Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(path, 'utf8')));
  const baselineW = baselinePath
    ? Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(baselinePath, 'utf8')))
    : DEFAULT_W;
  console.log('compare test (' + path + ') vs ' + (baselinePath || 'DEFAULT_W') + ', n=' + n);
  const r = runMatches(testW, baselineW, n);
  const rate = r.testWins / r.n;
  const se = Math.sqrt(rate * (1 - rate) / r.n);
  console.log('test wins ' + r.testWins + ' / ' + r.n + '  =  ' + rate.toFixed(3) +
    ' ± ' + (1.96 * se).toFixed(3) + ' (95% CI)' +
    '  · avg rounds/match ' + r.avgRounds.toFixed(1) +
    '  · avg iter/round ' + r.avgIter.toFixed(0));
}
else if (cmd === 'regress') {
  // regress <candidate.json> [N=400] [baseline.json|DEFAULT_W] [seed=20260622]
  // 固定种子让候选 vs 基线在同一批牌局对打，报胜率±CI + 退化判定 + 出牌风格对比（可复现，改前改后对拍）
  const fs = require('fs');
  const path = process.argv[3];
  if (!path) { console.error('usage: node sim-guandan.js regress <candidate.json> [N=400] [baseline.json|DEFAULT_W] [seed=20260622]'); process.exit(1); }
  const n = parseInt(process.argv[4], 10) || 400;
  const baselineArg = process.argv[5];
  const seed = process.argv[6] != null ? (parseInt(process.argv[6], 10) || 1) : 20260622;
  const candW = Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(path, 'utf8')));
  const useBaseFile = baselineArg && baselineArg !== 'DEFAULT_W';
  const baselineW = useBaseFile ? Object.assign({}, DEFAULT_W, JSON.parse(fs.readFileSync(baselineArg, 'utf8'))) : DEFAULT_W;
  regress({ candW, baselineW, n, seed, candLabel: path, baselineLabel: useBaseFile ? baselineArg : 'DEFAULT_W' });
}
else { console.error('unknown cmd: ' + cmd); process.exit(1); }
}
