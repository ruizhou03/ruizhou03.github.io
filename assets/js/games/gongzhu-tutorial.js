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
    cards('♠4 ♠5 ♣2 ♣6 ♦4 ♦Q ♦K ♦A ♥10 ♥J ♥Q ♥K ♥A'),
    cards('♠A ♠7 ♠8 ♠9 ♠10 ♠J ♣A ♦10 ♣7 ♣8 ♣9 ♣J ♦2'),
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
        // 只在新手一定赢下这一轮时才把 ♣10 交出去：他已出的草花比 ♣10 大且领先，或者还没出、手里草花都比 ♣10 和已出的大
        const mine = r.trick.find((p) => p.seat === 0);
        const clubs = r.trick.filter((p) => suitOf(p.card) === CLUB).map((p) => rankOf(p.card));
        const top = Math.max(rankOf(DOUBLER), ...clubs);
        const meWins = mine ? suitOf(mine.card) === CLUB && rankOf(mine.card) >= top
          : of(r.hands[0], CLUB).length > 0 && of(r.hands[0], CLUB).every((c) => rankOf(c) > top);
        if (meWins) return DOUBLER;
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
        if (!once('discard')) return null;
        return seen.has('discard-taught')
          ? '这一轮的花色是' + suit + '，你已经没有' + suit + '了，可以垫任意一张。'
          : '这一轮的花色是' + suit + '，你已经没有' + suit + '了——这时可以出任意一张，叫「垫牌」。';
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

    /* 一轮打满：返回 { before, after } 两组讲解（每段点「继续」）。
     *   before：牌还摆在桌上、还没收走时讲——这一轮的花色、谁最大、谁赢（trick 让界面把四家出的牌排出来，mark 标出最大的一张）；
     *   after：收牌结算之后讲——分数怎么变（focus 点亮某家的吃牌区，parts / heartChart / allHearts 画红桃示意）。 */
    const SUIT_CN = ['黑桃', '红桃', '方块', '草花'];
    function afterTrick(done, r) {
      const before = [], after = [];
      const plays = done.plays, w = done.winner;
      const cs = plays.map((p) => p.card);
      const leadSuit = suitOf(cs[0]);
      const suit = SUIT_CN[leadSuit];
      const top = plays.find((p) => p.seat === w).card;
      const leader = plays[0].seat;
      const who = (s) => (s === 0 ? '你' : NAMES[s]);
      const meCard = plays.find((p) => p.seat === 0).card;
      const trick = { plays, winner: w };
      if (r.trickNo === 1) {
        before.push({ text: '这一轮第一张牌是你出的 ' + label(R.SPADE_TWO) + '，所以这一轮的花色是黑桃。其他人手里有黑桃，就必须出黑桃。', trick });
        before.push({ text: '每种花色都是 2 最小、A 最大：', ranks: true });
        before.push({ text: '比较这一轮的黑桃：上家的 ' + label(top) + ' 最大，所以上家赢下这一轮，收走这一轮的所有牌；下一轮由他第一个出牌。', trick, mark: true });
        return { before, after };
      }
      if (r.trickNo === 2) {
        before.push({ text: '这一轮上家先出 ' + label(cs[0]) + '，花色是草花。草花里 ' + label(top) + ' 最大，还是上家赢。这一轮的牌都不带分数；一局里只有少数几张牌带分数，它们出现时会逐一为你介绍。', trick, mark: true });
        return { before, after };
      }
      const discard = suitOf(meCard) !== leadSuit;
      // 别人先于新手垫了牌：就在这一刻把「垫牌」讲清楚（新手自己第一次垫时就不再重复）
      const otherDisc = plays.filter((p) => p.seat !== 0 && suitOf(p.card) !== leadSuit);
      if (otherDisc.length && !discard && !seen.has('discard-taught')) {
        seen.add('discard-taught');
        const names = otherDisc.map((p) => NAMES[p.seat]).join('和');
        before.push({ text: '这一轮的花色是' + suit + '。' + names + '手里已经没有' + suit + '，' + (otherDisc.length > 1 ? '各' : '') + '出了一张别的牌，这叫「垫牌」：手里没有这一轮的花色时，可以出任意一张。垫的牌不参与比较，' +
          suit + '里最大的是 ' + label(top) + '，' + who(w) + '赢下这一轮。', trick, mark: true });
      }
      const hearts = cs.filter(R.isHeart);
      const dHearts = r.captured[2].filter(R.isHeart);
      const allHearts = hearts.length && w === 2 && dHearts.length === 13;
      const firstHearts = hearts.length && w === 2 && !allHearts && !seen.has('hearts');
      // 这一轮的红桃归对家：扣多少、他这一局的红桃累计到多少（每一轮都讲，重复也没关系）
      const heartLine = () => {
        const sum = hearts.reduce((a, c) => a + R.heartValue(c, RULES), 0);
        const tot = dHearts.reduce((a, c) => a + R.heartValue(c, RULES), 0);
        return '这一轮的红桃 ' + hearts.slice().sort((a, b) => rankOf(a) - rankOf(b)).map(label).join(' ') + ' 都归他，共扣 ' + (-sum) + ' 分，他的红桃累计扣到 −' + (-tot) + ' 分。';
      };
      // 新手每次垫牌都讲一遍这一轮怎么结算；第一次多讲一句「垫的牌不参与比较」
      if (discard) {
        const first = !seen.has('discard-after');
        seen.add('discard-after');
        seen.add('discard-taught');
        let t = '这一轮的花色是' + suit + '。你已经没有' + suit + '，垫了 ' + label(meCard) + '。' +
          (first ? '垫的牌不论多大都不参与比较：' : '') + suit + '里最大的是 ' + label(top) + '，' + who(w) + '赢下这一轮，收下这一轮的所有牌。';
        if (hearts.length && w === 2 && !allHearts && !firstHearts) t += heartLine();
        before.push({ text: t, trick, mark: true });
      } else if (hearts.length && w === 2 && !allHearts && !firstHearts && leadSuit === HEART) {
        // 对家领红桃、新手跟红桃的那几轮，也每轮讲一遍
        before.push({ text: who(leader) + '先出 ' + label(cs[0]) + '，这一轮的花色是红桃' + (leader === 0 ? '。' : '，你有红桃就必须跟。') +
          '红桃里最大的是 ' + label(top) + '，' + who(w) + '赢下这一轮。' + heartLine(), trick, mark: true });
      }
      if (cs.includes(SHEEP) && w === 0) {
        before.push({ text: '这一轮' + who(leader) + '先出，花色是方块。你的 ' + label(SHEEP) + ' 是方块里最大的，这一轮你赢，收下这一轮的所有牌。', trick, mark: true });
        after.push({ text: '收下的牌里，带分数的会摆在你的头像旁边，计入你这一局的分数。' + label(SHEEP) + ' 叫「羊」，收下它就叫「吃羊」，这一局 +100。', focus: 0 });
      }
      if (cs.includes(PIG)) {
        const gong = leader !== 0;
        before.push({ text: label(PIG) + ' 叫「猪」，谁收下它，这一局 −100。这一轮的花色是黑桃，' + who(w) + '的 ' + label(top) + ' 最大，你打出的猪归了他，这就叫他「吃猪」。' +
          (gong ? '对家先出小黑桃，把你手里的猪逼了出来，这就叫「拱猪」。' : ''), trick, mark: true });
      }
      if (cs.includes(DOUBLER) && w === 0) {
        // 先讲清变压器是什么、收下它会怎样，再结算放 ×2 动画——不然分数突然翻倍会让人发蒙
        const ctx = R.scoreCtx(r);
        const aft = R.scoreCaptured(r.captured[0], ctx).total;
        const bef = R.scoreCaptured(r.captured[0].filter((c) => c !== DOUBLER), ctx).total;
        const sg = (n) => (n > 0 ? '+' : '') + n;
        before.push({ text: '这一轮的花色是草花，你的 ' + label(top) + ' 最大，这一轮你赢，收下这一轮的所有牌。', trick, mark: true });
        before.push({ text: '这一轮里有 ' + label(DOUBLER) + '，它叫「变压器」：它本身不带分数，但谁收下它，这一局的总分就翻倍。你这一局现在是 ' +
          sg(bef) + ' 分，收下它就变成 ' + sg(aft) + '。', trick, mark: true });
        after.push({ text: '翻倍了：你这一局的分数从 ' + sg(bef) + ' 变成了 ' + sg(aft) + '。', focus: 0 });
      }
      // 红桃：先在牌还没收走时讲清怎么扣、这一轮扣多少，再让红桃飞去对家
      if (hearts.length && w === 2) {
        if (allHearts) {
          before.push({ text: '对家又赢下这一轮，这一下他收齐了全部 13 张红桃，这叫「全红」：红桃不再扣分，反而一共 +200。你垫给他的红桃，最后反倒帮他凑齐了。', allHearts: true });
        } else if (firstHearts) {
          seen.add('hearts');
          before.push({ text: '对家赢下这一轮，收下的牌里有红桃。每张红桃都要扣分，扣多少看牌面：', heartChart: true });
          before.push({
            text: '所以这一轮对家要扣：',
            parts: hearts.slice().sort((a, b) => rankOf(b) - rankOf(a)).map((c) => ({ card: c, value: R.heartValue(c, RULES) })),
          });
        }
      }
      return { before, after };
    }

    return { hint, afterTrick };
  }

  /* ───── 进阶教程 · 明牌（用户 2026-11-05 过目定稿的剧本） ─────
   * 四家各拿一张能明的牌：我 ♥A、下家猪 ♠Q、对家羊 ♦J（他唯一的方块）、上家变压器 ♣10，开打前四家一起明。
   * 前六墩把明牌的规矩一条条演一遍，之后剩下的牌自动快速打完：
   *   墩1 我 ♠2 → 下家有黑桃却出不了明出的猪（首轮限制）→ 上家 ♠A 吃
   *   墩2 上家领 ♥2（红桃首轮）→ 我的明 ♥A 变灰、出别的红桃 → 对家 ♥K 收下红桃（明 ♥A：扣分 ×2）
   *   墩3 对家领小草花 → 上家的明 ♣10 出不了、只能 ♣2 → 我 ♣K / ♣A 吃
   *   墩4 引导出 ♦A → 对家只剩 ♦J 一张方块，明出的牌也得出（「只剩一张除外」）→ 我吃羊 +200
   *   墩5 引导出剩下那张草花 → 上家只剩 ♣10 → 我吃变压器 ×4：+200 × 4 = +800
   *   墩6 引导出 ♠4 → 下家出猪、上家 ♠K 吃：−200
   * 我在第 2、3 墩可以自由出（共 8 种走法，tests/gongzhu-tutorial.test.js 穷举验证都按剧本走）；第 4–6 墩只能出指定的那张。 */
  const ADV_HANDS = [
    cards('♠2 ♠4 ♥3 ♥5 ♥7 ♥9 ♥A ♦2 ♦3 ♦4 ♦A ♣K ♣A'),
    cards('♠5 ♠6 ♠Q ♥4 ♥6 ♥8 ♦6 ♦8 ♦10 ♣4 ♣6 ♣8 ♣Q'),
    cards('♠3 ♠7 ♠8 ♥10 ♥J ♥Q ♥K ♦J ♣3 ♣5 ♣7 ♣9 ♣J'),
    cards('♠9 ♠10 ♠J ♠K ♠A ♥2 ♦5 ♦7 ♦9 ♦Q ♦K ♣2 ♣10'),
  ];
  const ADV_RULES = Object.freeze(Object.assign({}, R.DEFAULT_RULES, { expose: true }));
  const ADV_EXPOSE = [[1, [PIG]], [2, [SHEEP]], [3, [DOUBLER]]];   // 三家机器人明的牌
  const ADV_SCRIPTED = 6;   // 前几墩照剧本讲，之后快进

  function advRound() { return R.createRound(ADV_HANDS, 0, R.SPADE_TWO, ADV_RULES); }

  // 引导：这几墩我只能出这一张（界面上其余变灰），-1 = 不限
  function advGuide(r) {
    if (r.turn !== 0 || r.trick.length) return -1;
    if (r.trickNo === 3) return card('♦A');
    if (r.trickNo === 4) { const c = of(r.hands[0], CLUB); return c.length ? c[0] : -1; }
    if (r.trickNo === 5) return card('♠4');
    return -1;
  }

  function advDirector(r, s) {
    const legal = R.legalFor(r, s);
    const lead = R.leadSuitOf(r), t = r.trickNo;
    const pick = (c) => (legal.includes(c) ? c : -1);
    const quiet = () => { const q = legal.filter((x) => !R.isScoring(x)); return lo(q.length ? q : legal); };
    if (lead < 0) {
      if (s === 3 && t === 1 && pick(card('♥2')) >= 0) return card('♥2');
      if (s === 2 && t === 2 && of(legal, CLUB).length) return lo(of(legal, CLUB));
      return quiet();
    }
    if (s === 3 && t === 0 && pick(card('♠A')) >= 0) return card('♠A');
    if (s === 2 && t === 1 && pick(card('♥K')) >= 0) return card('♥K');
    if (s === 1 && t === 5 && pick(PIG) >= 0) return PIG;
    if (s === 3 && t === 5 && pick(card('♠K')) >= 0) return card('♠K');
    const f = of(legal, lead);
    return f.length ? lo(f) : quiet();
  }

  function createAdvCoach() {
    const seen = new Set();
    const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
    const who = (s) => (s === 0 ? '你' : NAMES[s]);
    const sg = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

    // 开局：明牌这一步讲什么（intro 等点继续；pick 是之后贴在出牌处的提示）
    const intro = [{ text: '这一局开打前多了一步：明牌。' + label(R.HEART_ACE) + '、猪 ' + label(PIG) + '、羊 ' + label(SHEEP) + '、变压器 ' + label(DOUBLER) +
      ' 这四张，开打前可以亮出来给大家看，亮了效果翻倍。' }];
    const pick = '你手里有 ' + label(R.HEART_ACE) + '。点一下它，再点「明牌」。';
    const afterExpose = [
      { text: '四家都明了牌：你明了 ' + label(R.HEART_ACE) + '，下家明了猪，对家明了羊，上家明了变压器。明出的牌摆在各家旁边，大家都看得见。' },
      { text: '效果翻倍：明 ' + label(R.HEART_ACE) + '，这一局每张红桃的分都 ×2；明猪 −200；明羊 +200；明变压器 ×4。' },
    ];

    function hint(r) {
      const lead = R.leadSuitOf(r), t = r.trickNo;
      if (t === 0 && lead < 0) return '你有 ' + label(R.SPADE_TWO) + '，由你先出，已经帮你选好了，点「出牌」。';
      if (t === 1 && lead === HEART && once('h1')) return '上家领出了红桃，这是红桃第一次被领出。你的 ' + label(R.HEART_ACE) + ' 是明出来的，这一轮不能出它（它变灰了），出别的红桃。';
      if (t === 2 && lead === CLUB && once('h2')) return '对家领出了草花。你的草花最大，出哪张都能赢下这一轮。';
      if (t === 3) return '对家明了羊 ' + label(SHEEP) + '，而且他只剩这一张方块。出 ' + label(card('♦A')) + '，看看会怎样。';
      if (t === 4) { const c = of(r.hands[0], CLUB)[0]; return '再出草花 ' + label(c) + '：上家手里只剩明出来的变压器了。'; }
      if (t === 5) return '出 ' + label(card('♠4')) + '。黑桃已经领出过一次，下家这回可以出猪了。';
      return null;
    }

    function afterTrick(done, r) {
      const before = [], after = [];
      const t = r.trickNo, w = done.winner, plays = done.plays;
      const trick = { plays, winner: w };
      const ctx = R.scoreCtx(r);
      const cardOf = (s) => plays.find((p) => p.seat === s).card;
      if (t === 1) {
        before.push({ text: '这一轮的花色是黑桃。下家手里有明出的猪 ' + label(PIG) + '，却没出它——明出来的牌，在它那个花色第一次被领出的那一轮里不能出；手里这门只剩它一张时除外。', trick, mark: true });
      } else if (t === 2) {
        const hearts = plays.map((p) => p.card).filter(R.isHeart);
        const base = hearts.reduce((a, c) => a + R.heartValue(c, ADV_RULES), 0);
        before.push({ text: who(w) + '的 ' + label(cardOf(w)) + ' 最大，收下这一轮的红桃。', trick, mark: true });
        after.push({ text: '你明了 ' + label(R.HEART_ACE) + '，这一局每张红桃的扣分都翻倍：这一轮' + who(w) + '扣 ' + (-base * 2) + ' 分（不明是 ' + (-base) + '）。', focus: w });
      } else if (t === 3) {
        before.push({ text: '上家明了变压器 ' + label(DOUBLER) + '，这是草花第一次被领出，他也不能出它，只能出 ' + label(cardOf(3)) + '。' + who(w) + '的 ' + label(cardOf(w)) + ' 最大。', trick, mark: true });
      } else if (t === 4) {
        before.push({ text: '方块第一次被领出，可对家只剩 ' + label(SHEEP) + ' 这一张方块——这就是刚才说的「除外」：只能打出来。' + who(w) + '的 ' + label(cardOf(w)) + ' 最大。', trick, mark: true });
        if (w === 0) after.push({ text: '你吃到明出来的羊：+200（不明是 +100）。', focus: 0 });
      } else if (t === 5) {
        before.push({ text: '草花已经领出过，限制没了；上家只剩 ' + label(DOUBLER) + '，只能打出来，' + who(w) + '又赢了。', trick, mark: true });
        if (w === 0) {
          const sc = R.scoreCaptured(r.captured[0], ctx);
          const base = sc.heartScore + sc.pigScore + sc.sheepScore;
          after.push({ text: '你收下明出来的变压器：这一局的分 ×4（不明是 ×2）。你这一局：' + sg(base) + ' × 4 = ' + sg(sc.total) + '。', focus: 0 });
        }
      } else if (t === 6) {
        before.push({ text: '下家打出了明出来的猪，' + who(w) + '的 ' + label(cardOf(w)) + ' 最大。', trick, mark: true });
        after.push({ text: who(w) + '吃到明出来的猪：−200（不明是 −100）。', focus: w });
        after.push({ text: '明牌的规矩就这些。剩下 ' + (13 - t) + ' 墩帮你快速打完。' });
      }
      return { before, after };
    }

    return { intro, pick, afterExpose, hint, afterTrick };
  }

  const ADV_TIP = '明牌就是加码：明了好牌（羊），自己吃到更赚；明了坏牌（猪、' + label(R.HEART_ACE) + '）是向大家示威——可要是最后落到自己手里，扣得也更多。';

  const advanced = {
    HANDS: ADV_HANDS, RULES: ADV_RULES, EXPOSE: ADV_EXPOSE, SCRIPTED: ADV_SCRIPTED, TIP: ADV_TIP,
    createRound: advRound, director: advDirector, guide: advGuide, createCoach: createAdvCoach,
  };

  return { HANDS, RULES, createRound, director, createCoach, card, cards, advanced };
});
