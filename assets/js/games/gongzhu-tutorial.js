/* 拱猪 · 新手教程（浏览器 window.GongzhuTutorial / Node require 共用，无 DOM）
 *
 * 一局打完就教会：固定发好的一副牌 + 三家机器人的「导演」出牌规则 + 按事件触发的讲解。
 * 新手每一步都可以出任何合法牌；不管怎么出，导演都能把剧本演完（tests/gongzhu-tutorial.test.js 穷举验证）：
 *   第 1 墩 ♠2 先出，上家 ♠A 吃（跟牌、A 最大）；第 2 墩上家领草花（必须跟）；
 *   第 3 墩上家领方块，新手唯一的方块 ♦J 吃下 → 羊 +100；
 *   之后顺序随新手的出法变化，但一定都会发生：
 *     新手亲手打出猪、被下家 ♠K 吃走（−100；对家领小黑桃逼猪 = 拱猪）；
 *     下家的 ♣10 落到新手手里 → 变压器把 +100 翻成 +200；
 *     对家吃红桃（按牌面扣分）；新手没方块时连续垫牌、垫出去的红桃也归对家；
 *     最后对家收齐 13 张红桃 → 全红 +200。
 *   终局：我 +200 / 下家 −100 / 对家 +200 / 上家 0。
 * 教学规则 = 默认规则（按牌面、大满贯才变正、变压器单吃 0），教程里不亮牌、不计时。
 */
(function (root, factory) {
  const rules = (typeof module === 'object' && module.exports)
    ? require('./gongzhu-rules.js')
    : root.GongzhuRules;
  const api = factory(rules);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GongzhuTutorial = api;
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  const { suitOf, rankOf, PIG, SHEEP, DOUBLER, SPADE, HEART, DIAMOND, CLUB } = R;
  const SUITS = { '♠': SPADE, '♥': HEART, '♦': DIAMOND, '♣': CLUB };
  const card = (t) => SUITS[t[0]] * 13 + R.RANK_LABELS.indexOf(t.slice(1));
  const cards = (s) => s.trim().split(/\s+/).map(card);

  // 座位 0 我 / 1 下家 / 2 对家 / 3 上家
  const HANDS = [
    cards('♠2 ♠Q ♦J ♣K ♣Q ♥2 ♥3 ♥4 ♥5 ♥6 ♥7 ♥8 ♥9'),
    cards('♠3 ♠6 ♠K ♣3 ♣4 ♣5 ♣10 ♦3 ♦5 ♦6 ♦7 ♦8 ♦9'),
    cards('♠4 ♠5 ♣2 ♦4 ♦10 ♦Q ♦K ♦A ♥10 ♥J ♥Q ♥K ♥A'),
    cards('♠A ♠7 ♠8 ♠9 ♠10 ♠J ♣A ♣6 ♣7 ♣8 ♣9 ♣J ♦2'),
  ];
  const RULES = Object.freeze(Object.assign({}, R.DEFAULT_RULES, { expose: false }));
  const K_SPADE = card('♠K');

  function createRound() {
    return R.createRound(HANDS, 0, R.SPADE_TWO, RULES);
  }

  /* ───── 导演：三家机器人的出牌 ───── */

  const lo = (a) => a.reduce((x, y) => (rankOf(y) < rankOf(x) ? y : x));
  const hi = (a) => a.reduce((x, y) => (rankOf(y) > rankOf(x) ? y : x));
  const of = (a, s) => a.filter((x) => suitOf(x) === s);

  function director(r, s) {
    const legal = R.legalFor(r, s), hand = r.hands[s];
    const lead = R.leadSuitOf(r);
    const pigMine = r.hands[0].includes(PIG), dblOut = r.played[DOUBLER];
    const has = (x) => legal.includes(x);
    // 垫牌：不垫红桃（红桃只能落进对家的墩）、不垫 ♠K / ♣10（剧本要用）
    const safeDiscard = () => {
      const pool = legal.filter((x) => !R.isHeart(x) && x !== K_SPADE && x !== DOUBLER);
      return lo(pool.length ? pool : legal);
    };

    if (s === 3) { // 上家：♠A 吃第一墩，领 ♣A、领小方块；之后只出小牌
      if (lead < 0) {
        if (r.trickNo === 1 && has(card('♣A'))) return card('♣A');
        if (r.trickNo === 2 && of(legal, DIAMOND).length) return lo(of(legal, DIAMOND));
        return safeDiscard();
      }
      if (lead === SPADE && r.trickNo === 0 && has(card('♠A'))) return card('♠A');
      return of(legal, lead).length ? lo(of(legal, lead)) : safeDiscard();
    }

    if (s === 1) { // 下家：♠K 专门吃猪，♣10 专门送给新手
      if (lead < 0) {
        if (!dblOut && has(DOUBLER)) return DOUBLER;
        if (of(legal, DIAMOND).length) return lo(of(legal, DIAMOND));
        return safeDiscard();
      }
      if (lead === SPADE) {
        const pigComing = r.trick.some((p) => p.card === PIG) || (pigMine && !r.trick.some((p) => p.seat === 0));
        if (pigComing && has(K_SPADE)) return K_SPADE;
        const rest = legal.filter((x) => x !== K_SPADE);
        return lo(rest.length ? rest : legal);
      }
      if (lead === CLUB && !dblOut && has(DOUBLER)) {
        // 新手已经压在最大、或者还没出（他的草花比别人的都大）
        const mine = r.trick.find((p) => p.seat === 0);
        const top = Math.max(...r.trick.filter((p) => suitOf(p.card) === CLUB).map((p) => rankOf(p.card)));
        if (!mine || rankOf(mine.card) === top) return DOUBLER;
      }
      if (of(legal, lead).length) {
        const rest = legal.filter((x) => x !== DOUBLER && x !== K_SPADE);
        return lo(rest.length ? rest : legal);
      }
      return safeDiscard();
    }

    // 对家：收下全部红桃；猪还在新手手里就先领小黑桃「拱猪」
    if (lead < 0) {
      if (pigMine && of(hand, SPADE).length) return lo(of(hand, SPADE));
      if (r.hands[0].some(R.isHeart) && of(hand, DIAMOND).length) return hi(of(hand, DIAMOND));
      if (of(hand, HEART).length) return hi(of(hand, HEART));
      return lo(legal);
    }
    if (lead === HEART && of(legal, HEART).length) {
      const top = Math.max(...r.trick.filter((p) => suitOf(p.card) === HEART).map((p) => rankOf(p.card)));
      const over = of(legal, HEART).filter((x) => rankOf(x) > top);
      return over.length ? lo(over) : hi(of(legal, HEART));
    }
    if (lead === DIAMOND && of(legal, DIAMOND).length) return r.trickNo === 2 ? lo(of(legal, DIAMOND)) : hi(of(legal, DIAMOND));
    if (of(legal, lead).length) return lo(of(legal, lead));
    const nonHeart = legal.filter((x) => !R.isHeart(x));
    if (!pigMine && of(nonHeart, SPADE).length) return lo(of(nonHeart, SPADE));
    const keepSpade = nonHeart.filter((x) => suitOf(x) !== SPADE);   // 猪还在新手手里：留着黑桃去拱猪
    if (keepSpade.length) return lo(keepSpade);
    return lo(nonHeart.length ? nonHeart : legal);
  }

  /* ───── 讲解：按事件触发，每种只讲一次 ─────
   * 文字里的牌用 {♥10} 这种记号，界面把它画成小牌。 */

  const NAMES = ['你', '下家', '对家', '上家'];
  const label = (c) => '{' + R.cardLabel(c) + '}';

  function createCoach() {
    const seen = new Set();
    const once = (k) => (seen.has(k) ? false : (seen.add(k), true));

    /* 轮到新手出牌前：返回提示（不需要点「继续」，出牌就是回应） */
    function hint(r) {
      const lead = R.leadSuitOf(r);
      const hand = r.hands[0];
      if (r.trickNo === 0 && lead < 0) return '你手里有 ' + label(R.SPADE_TWO) + '，第一局由你先出，第一张必须是它。已经帮你选好了，点「出牌」。';
      // 每次轮到新手领出都说一句，免得他愣着等别人出
      if (lead < 0) return once('lead') ? '上一轮是你赢的，这一轮由你先出，手里哪张都可以。' : '这一轮由你先出。';
      const follow = of(hand, lead).length > 0;
      if (!follow) {
        const suit = ['黑桃', '红桃', '方块', '草花'][lead];
        return once('discard') ? '这一轮领出的是' + suit + '，你已经没有' + suit + '了——这时可以出任意一张，叫「垫牌」。' : null;
      }
      if (lead === SPADE && hand.includes(PIG) && of(hand, SPADE).length === 1 && once('forced-pig')) {
        return NAMES[r.trick[0].seat] + '领出了黑桃。你只剩 ' + label(PIG) + ' 这一张黑桃，只能把它打出去。';
      }
      if (once('follow-' + lead)) {
        const suit = ['黑桃', '红桃', '方块', '草花'][lead];
        if (of(hand, lead).length === 1) return NAMES[r.trick[0].seat] + '领出了' + suit + '。你只有一张' + suit + '，就只能出它。';
        return NAMES[r.trick[0].seat] + '领出了' + suit + '。你手里有' + suit + '，就必须出' + suit + '，出哪张由你挑。';
      }
      return null;
    }

    /* 一墩打完：返回要依次讲的几段（每段点「继续」），可带 parts 让界面画红桃明细 */
    function afterTrick(done, r) {
      const out = [];
      const plays = done.plays, w = done.winner;
      const cs = plays.map((p) => p.card);
      const leadSuit = suitOf(cs[0]);
      const meCard = plays.find((p) => p.seat === 0).card;
      if (r.trickNo === 1) {
        out.push({ text: '其他三家也都出了黑桃：第一张出的是什么花色，如果你手里有这个花色，就必须出这个花色的牌。' });
        out.push({ text: '每门花色都是 2 最小、A 最大：', ranks: true });
        out.push({ text: '这一轮的花色是黑桃（由第一张出的牌决定）。谁出了这一轮花色里最大的一张，谁就赢下这一轮，下一轮由他先出。这一轮是上家的 ' + label(card('♠A')) + '。' });
        return out;
      }
      if (r.trickNo === 2) {
        out.push({ text: '这一轮的花色是草花，上家的 ' + label(card('♣A')) + ' 最大，这一轮仍由他赢。这一轮的牌都不计分。一局里只有少数几张牌带分，它们出现时会逐一为你介绍。' });
        return out;
      }
      if (suitOf(meCard) !== leadSuit && once('discard-after')) {
        out.push({ text: '垫出去的牌再大也不算：只比这一轮的花色（' + ['黑桃', '红桃', '方块', '草花'][leadSuit] + '），其中最大的一张赢下这一轮。' });
      }
      if (cs.includes(SHEEP) && w === 0) {
        // 先把「吃」讲清楚（拱猪本来的叫法），同时把我的吃牌区点亮
        out.push({ text: '这一轮的花色是方块，你的 ' + label(SHEEP) + ' 最大，这一轮你赢。赢下一轮，就收下这一轮的牌；其中带分数的牌会摆在你的头像旁边，计入你这一局的分数，拱猪里管这叫「吃」。', focus: 0 });
        out.push({ text: label(SHEEP) + ' 叫「羊」，吃到它，这一局 +100。', focus: 0 });
      }
      if (cs.includes(PIG)) {
        const gong = r.history[r.history.length - 1].leader !== 0;
        out.push({ text: label(PIG) + ' 叫「猪」，谁吃到它 −100。' + NAMES[w] + '的 ' + label(K_SPADE) + ' 赢下这一轮，你打出的猪归了他。' + (gong ? '对家用小黑桃把猪逼出来，这就叫「拱猪」。' : '') });
      }
      if (cs.includes(DOUBLER) && w === 0) {
        const ctx = R.scoreCtx(r);
        const after = R.scoreCaptured(r.captured[0], ctx).total;
        const before = R.scoreCaptured(r.captured[0].filter((c) => c !== DOUBLER), ctx).total;
        out.push({ text: label(DOUBLER) + ' 叫「变压器」：它本身不算分，但谁吃到它，这一局的总分就翻倍。你这一局的分数从 ' +
          (before > 0 ? '+' : '') + before + ' 翻成了 ' + (after > 0 ? '+' : '') + after + '。' });
      }
      const hearts = cs.filter(R.isHeart);
      const dHearts = r.captured[2].filter(R.isHeart);
      if (hearts.length && w === 2) {
        if (dHearts.length === 13) {
          out.push({ text: '对家吃齐了全部 13 张红桃——这叫「全红」：红桃不再扣分，一共 +200。你垫给他的红桃，反倒帮他凑齐了。' });
        } else if (once('hearts')) {
          out.push({
            text: '对家吃到了红桃。红桃按牌面扣分，J −11、Q −12、K −13，A 只扣 1：',
            parts: hearts.slice().sort((a, b) => rankOf(b) - rankOf(a)).map((c) => ({ card: c, value: R.heartValue(c, RULES) })),
          });
        } else if (suitOf(meCard) === HEART && leadSuit !== HEART && once('heart-dump')) {
          out.push({ text: '你垫的红桃也算对家的：他又扣了 ' + (-R.heartValue(meCard, RULES)) + ' 分。' });
        }
      }
      return out;
    }

    return { hint, afterTrick };
  }

  return { HANDS, RULES, createRound, director, createCoach, card, cards };
});
