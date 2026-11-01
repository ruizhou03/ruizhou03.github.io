/* 拱猪 · 出牌 AI（浏览器 window.GongzhuAI / Node require 共用，无 DOM）
 *
 * 所有策略的签名都是 policy(r, seat, rng) → card：
 *   r 是 GongzhuRules.createRound 的局面。策略只许读自己的手牌 r.hands[seat]
 *   和公开信息（trick / history / captured / voids / played），不许偷看别家手牌；
 *   搜索类策略（PIMC / ISMCTS）自己按公开信息随机「猜」别家手牌再模拟。
 *
 * 候选策略（~/gongzhu-rl 里复式循环赛排名后，按名次选为入门 / 普通 / 高手）：
 *   random   随机合法牌（基线）
 *   basic    规则启发式：按牌面估分，能躲就躲、没门先垫猪和大红桃
 *   counting 启发式 + 记牌：边际计分、断门跟踪、拱猪、抢羊、拦全红
 *   pimc     完美信息蒙特卡洛：猜 N 副手牌 × 每个候选牌用 counting 打完，取平均分最高
 *   ismcts   信息集蒙特卡洛树搜索（单观察者 SO-ISMCTS）
 *   mlp      自博弈 DMC 训练出的 Q(s,a) 小网络（权重另行加载）
 *
 * 规则开关（r.rules）和亮牌（r.exposed）都在局面里：计分一律走 R.scoreCtx(r)，
 * 搜索类直接按规则推演；亮牌决策另有 makeExposer（开局前、出第一张牌之前调用）。
 */
(function (root, factory) {
  const rules = (typeof module === 'object' && module.exports)
    ? require('./gongzhu-rules.js')
    : root.GongzhuRules;
  const api = factory(rules);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GongzhuAI = api;
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  const { suitOf, rankOf, isHeart, PIG, SHEEP, DOUBLER, SPADE, HEART, DIAMOND } = R;

  /* ───── 公共小工具 ───── */

  function pick(arr, rng) { return arr[(rng() * arr.length) | 0]; }
  function maxBy(arr, f) { let b = arr[0], bv = f(b); for (let i = 1; i < arr.length; i++) { const v = f(arr[i]); if (v > bv) { bv = v; b = arr[i]; } } return b; }
  function minBy(arr, f) { return maxBy(arr, (x) => -f(x)); }

  /* 当前墩：领出花色、目前最大的牌、谁领先 */
  function trickState(r) {
    if (!r.trick.length) return null;
    const lead = suitOf(r.trick[0].card);
    let top = r.trick[0];
    for (const p of r.trick) if (suitOf(p.card) === lead && rankOf(p.card) > rankOf(top.card)) top = p;
    return { lead, topRank: rankOf(top.card), topSeat: top.seat, left: 3 - r.trick.length };
  }

  /* seat 视角下还没露面的牌（不在自己手里、也没打出） */
  function unseenOf(r, seat) {
    const mine = new Array(52).fill(false);
    for (const c of r.hands[seat]) mine[c] = true;
    const out = [];
    for (let c = 0; c < 52; c++) if (!mine[c] && !r.played[c]) out.push(c);
    return out;
  }

  /* 吃下 cards 之后 seat 的分数变化（只看当前已知，含变压器 / 全红修正） */
  function marginal(r, seat, cards) {
    const ctx = R.scoreCtx(r);
    const before = R.scoreCaptured(r.captured[seat], ctx).total;
    const after = R.scoreCaptured(r.captured[seat].concat(cards.filter(R.isScoring)), ctx).total;
    return after - before;
  }

  /* ───── random ───── */

  function randomPolicy(r, seat, rng) {
    return pick(R.legalFor(r, seat), rng);
  }

  /* ───── basic：只看牌面，不记牌 ───── */

  function basicPolicy(r, seat) {
    const hand = r.hands[seat];
    const legal = R.legalFor(r, seat);
    if (legal.length === 1) return legal[0];
    const t = trickState(r);

    if (!t) {
      // 领出：避开红桃、猪、羊，出最小的牌
      const safe = legal.filter((c) => !isHeart(c) && c !== PIG && c !== SHEEP);
      return minBy(safe.length ? safe : legal, rankOf);
    }

    const following = suitOf(legal[0]) === t.lead && hand.some((c) => suitOf(c) === t.lead);
    if (!following) {
      // 垫牌：猪 > 大红桃 > ♠A/♠K > 最大的牌（羊留着）
      if (legal.includes(PIG)) return PIG;
      const hearts = legal.filter(isHeart);
      if (hearts.length) return maxBy(hearts, rankOf);
      const bigSpade = legal.filter((c) => suitOf(c) === SPADE && rankOf(c) > 10);
      if (bigSpade.length) return maxBy(bigSpade, rankOf);
      const rest = legal.filter((c) => c !== SHEEP);
      return maxBy(rest.length ? rest : legal, rankOf);
    }

    const pts = r.trick.reduce((s, p) => s + R.rawValue(p.card, r.rules), 0);
    const below = legal.filter((c) => rankOf(c) < t.topRank);
    if (pts > 0) {
      const above = legal.filter((c) => rankOf(c) > t.topRank && c !== PIG);
      if (above.length) return maxBy(above, rankOf);
    }
    if (below.length) return maxBy(below, rankOf);
    const noPig = legal.filter((c) => c !== PIG);
    return t.left === 0 ? maxBy(noPig.length ? noPig : legal, rankOf) : minBy(noPig.length ? noPig : legal, rankOf);
  }

  /* ───── counting：边际计分 + 记牌 ───── */

  function countingPolicy(r, seat) {
    const hand = r.hands[seat];
    const legal = R.legalFor(r, seat);
    if (legal.length === 1) return legal[0];
    const unseen = unseenOf(r, seat);
    const unseenSet = new Array(52).fill(false);
    for (const c of unseen) unseenSet[c] = true;
    const pigOut = !unseenSet[PIG] && !hand.includes(PIG);
    const iHavePig = hand.includes(PIG);
    const sheepUnseen = unseenSet[SHEEP];
    const higherUnseen = (c) => { let n = 0; for (let k = rankOf(c) + 1; k < 13; k++) if (unseenSet[suitOf(c) * 13 + k]) n++; return n; };
    const others = [1, 2, 3].map((d) => (seat + d) % 4);
    const moonThreat = moonThreatOf(r, seat);
    const t = trickState(r);

    if (!t) return countingLead(r, seat, legal, { unseenSet, pigOut, iHavePig, sheepUnseen, higherUnseen, others, moonThreat });

    const following = hand.some((c) => suitOf(c) === t.lead);
    const trickCards = r.trick.map((p) => p.card);

    if (!following) {
      // 垫牌：赢家一定不是我。把坏牌塞给别人。
      const winner = t.topSeat;
      const helpMoon = moonThreat === winner;
      if (legal.includes(PIG) && !helpMoon) return PIG;
      const hearts = legal.filter(isHeart);
      if (hearts.length && !helpMoon) return maxBy(hearts, rankOf);
      if (legal.includes(DOUBLER)) {
        const sctx = R.scoreCtx(r);
        const theirs = R.scoreCaptured(r.captured[winner].concat(trickCards.filter(R.isScoring)), sctx).total;
        const mine = R.scoreCaptured(r.captured[seat], sctx).total;
        if (theirs < 0 || mine < 0) return DOUBLER;
      }
      // 猪还没出：♠A ♠K 是祸根，先扔
      if (!pigOut && !iHavePig) {
        const bigSpade = legal.filter((c) => suitOf(c) === SPADE && rankOf(c) > 10);
        if (bigSpade.length) return maxBy(bigSpade, rankOf);
      }
      // 其余：扔「最可能赢墩」的大牌，优先短门（造断门），羊留着
      const pool = legal.filter((c) => c !== SHEEP && !(c === DOUBLER));
      const cand = pool.length ? pool : legal;
      return maxBy(cand, (c) => rankOf(c) * 4 - higherUnseen(c) * 6 - suitLen(hand, suitOf(c)));
    }

    // 跟牌
    const winners = legal.filter((c) => rankOf(c) > t.topRank);
    const losers = legal.filter((c) => rankOf(c) < t.topRank);
    const last = t.left === 0;
    // 我赢下这墩、并且后面的人可能垫进来的坏牌
    const valueIfWin = (c) => {
      let v = marginal(r, seat, trickCards.concat([c]));
      if (!last) {
        // 后面断门的人可能垫猪 / 红桃
        const behind = [];
        for (let d = 1; d <= t.left; d++) behind.push((seat + d) % 4);
        const voidBehind = behind.some((s) => r.voids[s][t.lead]);
        if (voidBehind) {
          if (unseenSet[PIG]) v -= 60;
          v -= 15;
        }
        // 领先牌后面还有更大的没露面：未必赢得住
      }
      return v;
    };

    // 想吃：有羊或者要拦全红
    const wantWin = (c) => valueIfWin(c) > 0 || (moonThreat >= 0 && moonThreat !== seat && trickCards.some(isHeart) && valueIfWin(c) > -60);
    if (winners.length) {
      const good = winners.filter((c) => c !== PIG && wantWin(c));
      if (good.length) {
        if (last) return minBy(good, rankOf);
        // 不是最后：出最大的，争取拿住
        return maxBy(good, rankOf);
      }
    }
    // 不想吃：出能输的最大一张
    if (losers.length) {
      // 猪：赢家已是 ♠K/♠A，正好垫给他
      if (losers.includes(PIG)) return PIG;
      return maxBy(losers, rankOf);
    }
    // 只能压过：最后一手随便出最大的（顺便甩大牌），猪绝不自己吃
    const noPig = winners.filter((c) => c !== PIG);
    const cand = noPig.length ? noPig : winners;
    if (last) return maxBy(cand, rankOf);
    // 不是最后：黑桃且猪未出时，出能被别人压过的最小牌；其余甩最大
    if (t.lead === SPADE && !pigOut) return minBy(cand, rankOf);
    return maxBy(cand, (c) => rankOf(c));
  }

  function suitLen(hand, s) { let n = 0; for (const c of hand) if (suitOf(c) === s) n++; return n; }

  /* 有人在冲全红：吃进的红桃全是他一人、已经 ≥ 7 张 → 返回座位，否则 -1 */
  function moonThreatOf(r) {
    let holder = -1, n = 0;
    for (let s = 0; s < 4; s++) {
      const h = r.captured[s].filter(isHeart).length;
      if (h > 0) { if (holder >= 0) return -1; holder = s; n = h; }
    }
    return n >= 7 ? holder : -1;
  }

  function countingLead(r, seat, legal, ctx) {
    const hand = r.hands[seat];
    const { unseenSet, pigOut, iHavePig, higherUnseen, others } = ctx;
    const risk = (c) => {
      const s = suitOf(c);
      const hi = higherUnseen(c);
      let unseenInSuit = 0;
      for (let k = 0; k < 13; k++) if (unseenSet[s * 13 + k]) unseenInSuit++;
      const voidOthers = others.filter((o) => r.voids[o][s]).length;
      // 估一个「我赢下这墩」的概率
      let pWin = hi === 0 ? 1 : hi === 1 ? 0.35 : hi === 2 ? 0.15 : 0.04;
      if (unseenInSuit === 0) pWin = 1;
      // 赢下之后的损失：自己这张 + 别人可能垫进来的
      let loss = 0;
      if (isHeart(c)) loss += -R.heartValue(c, r.rules) + 10;
      if (voidOthers > 0 || unseenInSuit < 3) {
        if (unseenSet[PIG]) loss += 100 * (voidOthers > 0 ? 0.6 : 0.2);
        loss += 25 * voidOthers;
      }
      let r0 = pWin * loss;
      if (c === PIG) r0 += 400;                     // 自己领猪：基本等于自杀
      if (s === SPADE && !pigOut && !iHavePig) {
        if (rankOf(c) < 10) r0 -= 25;                // 拱猪：小黑桃逼猪
        else r0 += 120;                              // ♠K ♠A 领出容易吃到猪
      }
      if (s === SPADE && iHavePig && c !== PIG) r0 += 30; // 有猪别自己开黑桃
      if (c === SHEEP) r0 += pWin === 1 ? -60 : 80; // 羊：稳赢就领，否则别送
      if (s === DIAMOND && ctx.sheepUnseen && hi === 0 && c !== SHEEP) r0 -= 10; // 最大方块领出可能逼出羊
      if (s === HEART) r0 += 8;
      // 短门优先打光（造断门方便垫牌）
      r0 += suitLen(hand, s) * 1.5;
      return r0 + rankOf(c) * 0.5;
    };
    return minBy(legal, risk);
  }

  /* ───── 搜索：按公开信息猜别家手牌 ───── */

  /* 把 seat 看不到的牌随机分给另外三家，满足张数与已知断门；别人亮出还没打的牌一定在他手里。
   * 返回新局面（自己的手牌不变）。 */
  function determinize(r, seat, rng) {
    const fixed = [[], [], [], []];
    for (const [c, o] of r.exposed) if (o !== seat && !r.played[c]) fixed[o].push(c);
    const unseen = fixed.some((f) => f.length) ? unseenOf(r, seat).filter((c) => R.exposedOwner(r, c) < 0 || r.played[c]) : unseenOf(r, seat);
    const need = [0, 0, 0, 0];
    for (let s = 0; s < 4; s++) if (s !== seat) need[s] = r.hands[s].length - fixed[s].length;
    for (let attempt = 0; attempt < 30; attempt++) {
      const cards = unseen.slice();
      for (let i = cards.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp; }
      // 约束最多的牌先放（能接它的人最少）
      const elig = (c) => { const out = []; for (let s = 0; s < 4; s++) if (s !== seat && !r.voids[s][suitOf(c)]) out.push(s); return out; };
      cards.sort((a, b) => elig(a).length - elig(b).length);
      const left = need.slice();
      const hands = [[], [], [], []];
      let ok = true;
      for (const c of cards) {
        const e = elig(c).filter((s) => left[s] > 0);
        if (!e.length) { ok = false; break; }
        // 按剩余容量加权，避免把小容量的人塞满
        let tot = 0; for (const s of e) tot += left[s];
        let x = rng() * tot, chosen = e[e.length - 1];
        for (const s of e) { x -= left[s]; if (x < 0) { chosen = s; break; } }
        hands[chosen].push(c); left[chosen]--;
      }
      if (!ok) continue;
      const d = R.cloneRound(r);
      for (let s = 0; s < 4; s++) if (s !== seat) d.hands[s] = fixed[s].concat(hands[s]);
      return d;
    }
    // 实在凑不出（理论上不会）：忽略断门硬分
    const d = R.cloneRound(r);
    const cards = unseen.slice();
    for (let s = 0; s < 4; s++) if (s !== seat) d.hands[s] = fixed[s].concat(cards.splice(0, need[s]));
    return d;
  }

  /* ───── 亮牌决策 ─────
   * 手里每张可亮的牌依次试：猜 samples 副别家手牌，同一副牌用 counting 打两遍（亮 / 不亮，counting 不用随机数，
   * 两遍只差在亮没亮），比相对分；平均多赚 margin 分以上才亮。前面的人亮了什么已在 r.exposed 里。 */
  function makeExposer(opts) {
    const samples = (opts && opts.samples) || 40;
    const margin = (opts && opts.margin) || 5;
    return function exposer(r, seat, rng) {
      if (!r.rules.expose) return [];
      const mine = R.EXPOSABLE.filter((c) => r.hands[seat].includes(c) && R.exposedOwner(r, c) < 0);
      const chosen = [];
      for (const c of mine) {
        let gain = 0;
        for (let k = 0; k < samples; k++) {
          const d0 = determinize(r, seat, rng);
          const base = d0.exposed.concat(chosen.map((x) => [x, seat]));
          const yes = R.cloneRound(d0); yes.exposed = base.concat([[c, seat]]);
          const no = R.cloneRound(d0); no.exposed = base;
          gain += utility(rollout(yes, countingPolicy, rng), seat, true) - utility(rollout(no, countingPolicy, rng), seat, true);
        }
        if (gain / samples > margin) chosen.push(c);
      }
      return chosen;
    };
  }
  function neverExpose() { return []; }

  function rollout(d, policy, rng) {
    while (!R.isRoundOver(d)) R.playCard(d, d.turn, policy(d, d.turn, rng));
    return R.roundScores(d);
  }

  /* 搜索的目标：自己的分 − 另三家平均（相对分；同时惩罚「把猪送给领先者」之外的无谓失分） */
  function utility(scores, seat, rel) {
    if (!rel) return scores[seat];
    let o = 0; for (let s = 0; s < 4; s++) if (s !== seat) o += scores[s];
    return scores[seat] - o / 3;
  }

  function makePimc(opts) {
    const samples = (opts && opts.samples) || 40;
    const inner = (opts && opts.rollout) || countingPolicy;
    const rel = !!(opts && opts.relative);
    return function pimcPolicy(r, seat, rng) {
      const legal = R.legalFor(r, seat);
      if (legal.length === 1) return legal[0];
      const sum = new Array(legal.length).fill(0);
      for (let k = 0; k < samples; k++) {
        const d0 = determinize(r, seat, rng);
        for (let i = 0; i < legal.length; i++) {
          const d = R.cloneRound(d0);
          R.playCard(d, seat, legal[i]);
          sum[i] += utility(rollout(d, inner, rng), seat, rel);
        }
      }
      let best = 0; for (let i = 1; i < legal.length; i++) if (sum[i] > sum[best]) best = i;
      return legal[best];
    };
  }

  /* SO-ISMCTS：每次迭代重新猜一副牌，树按「出了哪张牌」分叉，四家共用一棵树 */
  function makeIsmcts(opts) {
    const iters = (opts && opts.iterations) || 1500;
    const C = (opts && opts.c) || 0.7;
    const inner = (opts && opts.rollout) || basicPolicy;
    const SCALE = 200;
    function node(parent, card, mover) { return { parent, card, mover, kids: [], n: 0, avail: 0, w: 0 }; }
    return function ismctsPolicy(r, seat, rng) {
      const legal = R.legalFor(r, seat);
      if (legal.length === 1) return legal[0];
      const rootN = node(null, -1, -1);
      for (let it = 0; it < iters; it++) {
        const d = determinize(r, seat, rng);
        let n = rootN;
        // 选择 / 扩展
        while (!R.isRoundOver(d)) {
          const moves = R.legalFor(d, d.turn);
          const untried = moves.filter((c) => !n.kids.some((k) => k.card === c));
          for (const k of n.kids) if (moves.includes(k.card)) k.avail++;
          if (untried.length) {
            const c = pick(untried, rng);
            const kid = node(n, c, d.turn);
            kid.avail = 1;
            n.kids.push(kid);
            R.playCard(d, d.turn, c);
            n = kid;
            break;
          }
          let best = null, bv = -Infinity;
          for (const k of n.kids) {
            if (!moves.includes(k.card)) continue;
            const v = k.w / k.n + C * Math.sqrt(Math.log(k.avail) / k.n);
            if (v > bv) { bv = v; best = k; }
          }
          R.playCard(d, d.turn, best.card);
          n = best;
        }
        const scores = rollout(d, inner, rng);
        for (let x = n; x && x.parent; x = x.parent) { x.n++; x.w += utility(scores, x.mover, true) / SCALE; }
        rootN.n++;
      }
      const best = maxBy(rootN.kids, (k) => k.n);
      return best.card;
    };
  }

  /* ───── MLP：DMC 自博弈训练的 Q(s,a) ───── */

  /* 特征：稀疏二值，返回激活的下标数组（第一层直接按列累加，训练和推理共用）
   *   [0,52)     我的手牌
   *   [52,104)   已打出的牌（含当前墩）
   *   [104,156)  当前墩里别人出的牌
   *   [156,220)  4 家（按相对座位）吃进的 16 张分牌
   *   [220,232)  另 3 家（相对座位）× 4 花色 已断门
   *   [232,236)  我在本墩的出牌位次
   *   [236,240)  本墩目前领先者的相对座位（领出时全 0）
   *   [240,292)  这次要出的牌
   *   [292,296)  这张牌：会赢下本墩（就目前而言）/ 是领出 / 垫牌 / 跟牌
   *   [296,312)  亮出的牌（♥A ♠Q ♦J ♣10）× 亮牌人相对座位
   *   [312,314)  红桃计分：按牌面 / 经典
   *   [314,318)  全红时的猪：slam / hearts / manjuan / swap
   *   318        单吃变压器记 +50（否则记 0）
   * 老权重输入维度更小：mlpForward 自动忽略超出输入维度的特征。
   */
  const FEAT_DIM = 319;
  const PIG_MODES = ['slam', 'hearts', 'manjuan', 'swap'];
  const SCORING_LIST = [...Array.from({ length: 13 }, (_, i) => 13 + i), PIG, SHEEP, DOUBLER];
  const SCORING_IDX = new Array(52).fill(-1);
  SCORING_LIST.forEach((c, i) => { SCORING_IDX[c] = i; });

  function baseFeatures(r, seat) {
    const f = [];
    for (const c of r.hands[seat]) f.push(c);
    for (let c = 0; c < 52; c++) if (r.played[c]) f.push(52 + c);
    for (const p of r.trick) f.push(104 + p.card);
    for (let d = 0; d < 4; d++) {
      const s = (seat + d) % 4;
      for (const c of r.captured[s]) f.push(156 + d * 16 + SCORING_IDX[c]);
    }
    for (let d = 1; d < 4; d++) {
      const s = (seat + d) % 4;
      for (let su = 0; su < 4; su++) if (r.voids[s][su]) f.push(220 + (d - 1) * 4 + su);
    }
    f.push(232 + r.trick.length);
    for (const [c, o] of r.exposed) f.push(296 + R.EXPOSABLE.indexOf(c) * 4 + ((o - seat + 4) % 4));
    f.push(r.rules.hearts === 'classic' ? 313 : 312);
    f.push(314 + Math.max(0, PIG_MODES.indexOf(r.rules.allHeartsPig)));
    if (r.rules.doublerAlone === 50) f.push(318);
    const t = trickState(r);
    if (t) f.push(236 + ((t.topSeat - seat + 4) % 4));
    return { f, t };
  }

  function actionFeatures(base, t, hand, card) {
    const f = base.slice();
    f.push(240 + card);
    if (!t) f.push(293);
    else if (suitOf(card) !== t.lead) f.push(294);
    else { f.push(295); if (rankOf(card) > t.topRank) f.push(292); }
    return f;
  }

  /* net = { sizes:[FEAT_DIM,h1,h2,1], W:[Float32Array...], b:[...] }，W[l] 行主序 out×in */
  function mlpForward(net, feats) {
    const [, h1] = net.sizes;
    const W0 = net.W[0], b0 = net.b[0];
    const a1 = new Float32Array(h1);
    const inDim = net.sizes[0];
    for (let j = 0; j < h1; j++) {
      let s = b0[j];
      const row = j * inDim;
      for (let k = 0; k < feats.length; k++) if (feats[k] < inDim) s += W0[row + feats[k]];
      a1[j] = s > 0 ? s : 0;
    }
    let a = a1;
    for (let l = 1; l < net.W.length; l++) {
      const out = net.sizes[l + 1], inn = net.sizes[l];
      const W = net.W[l], b = net.b[l];
      const z = new Float32Array(out);
      for (let j = 0; j < out; j++) {
        let s = b[j];
        const row = j * inn;
        for (let k = 0; k < inn; k++) s += W[row + k] * a[k];
        z[j] = (l < net.W.length - 1) ? (s > 0 ? s : 0) : s;
      }
      a = z;
    }
    return a[0];
  }

  function makeMlp(net, opts) {
    const eps = (opts && opts.epsilon) || 0;
    return function mlpPolicy(r, seat, rng) {
      const legal = R.legalFor(r, seat);
      if (legal.length === 1) return legal[0];
      if (eps > 0 && rng() < eps) return pick(legal, rng);
      const { f, t } = baseFeatures(r, seat);
      let best = legal[0], bv = -Infinity;
      for (const c of legal) {
        const v = mlpForward(net, actionFeatures(f, t, r.hands[seat], c));
        if (v > bv) { bv = v; best = c; }
      }
      return best;
    };
  }

  /* 权重序列化：{ sizes, data: base64(Float32 W0,b0,W1,b1,...) }
   * 或网页用的压缩版 { sizes, fmt:'i8', w: base64(Int8 各层权重), s: base64(Float32 每行缩放), b: base64(Float32 偏置) } */
  function b64bytes(str) {
    return typeof atob === 'function'
      ? Uint8Array.from(atob(str), (ch) => ch.charCodeAt(0))
      : new Uint8Array(Buffer.from(str, 'base64'));
  }
  function b64f32(str) { const u = b64bytes(str); return new Float32Array(u.buffer, u.byteOffset, u.byteLength / 4); }
  function loadNet(json) {
    const W = [], b = [];
    const L = json.sizes.length - 1;
    if (json.fmt === 'i8') {
      const wu = b64bytes(json.w), w8 = new Int8Array(wu.buffer, wu.byteOffset, wu.byteLength);
      const sc = b64f32(json.s), bs = b64f32(json.b);
      let o = 0, so = 0, bo = 0;
      for (let l = 0; l < L; l++) {
        const inn = json.sizes[l], out = json.sizes[l + 1];
        const m = new Float32Array(inn * out);
        for (let j = 0; j < out; j++) { const k = sc[so + j]; for (let i = 0; i < inn; i++) m[j * inn + i] = w8[o + j * inn + i] * k; }
        o += inn * out; so += out;
        W.push(m); b.push(bs.slice(bo, bo + out)); bo += out;
      }
      return { sizes: json.sizes, W, b };
    }
    const all = b64f32(json.data);
    let o = 0;
    for (let l = 0; l < L; l++) {
      const n = json.sizes[l] * json.sizes[l + 1];
      W.push(all.slice(o, o + n)); o += n;
      b.push(all.slice(o, o + json.sizes[l + 1])); o += json.sizes[l + 1];
    }
    return { sizes: json.sizes, W, b };
  }

  /* 三档难度 ← ~/gongzhu-rl 复式循环赛排名（见 RESULTS.md r6，默认规则含亮牌）：
   *   入门 = basic 规则启发式（末位）；普通 = DMC 自博弈训练的网络 dmc-f（认得规则开关和亮牌，权重在 gongzhu-dmc.js，未加载时退回 counting）；
   *   高手 = ISMCTS（第 1，正面对打赢网络 48 分 / 局） */
  const TIERS = {
    easy: () => basicPolicy,
    normal: () => {
      const w = typeof self !== 'undefined' ? self.GONGZHU_DMC : (typeof globalThis !== 'undefined' ? globalThis.GONGZHU_DMC : null);
      return w ? makeMlp(loadNet(w)) : countingPolicy;
    },
    hard: () => makeIsmcts({ iterations: 3000 }),
  };
  const tierCache = {};
  function policyForTier(tier) {
    return tierCache[tier] || (tierCache[tier] = (TIERS[tier] || TIERS.normal)());
  }
  /* 亮牌：入门不亮；普通 / 高手按模拟比较，高手猜得更多 */
  const EXPOSERS = {
    easy: () => neverExpose,
    normal: () => makeExposer({ samples: 30 }),
    hard: () => makeExposer({ samples: 300 }),
  };
  const exposerCache = {};
  function exposerForTier(tier) {
    return exposerCache[tier] || (exposerCache[tier] = (EXPOSERS[tier] || EXPOSERS.normal)());
  }

  return {
    TIERS, policyForTier, EXPOSERS, exposerForTier, makeExposer, neverExpose,
    trickState, unseenOf, marginal, moonThreatOf, determinize, rollout, utility,
    randomPolicy, basicPolicy, countingPolicy, makePimc, makeIsmcts,
    FEAT_DIM, baseFeatures, actionFeatures, mlpForward, makeMlp, loadNet,
  };
});
