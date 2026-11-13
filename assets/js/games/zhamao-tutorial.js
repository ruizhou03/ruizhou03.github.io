/* 百变小咪 · 新手教程（window.ZhamaoTutorial / Node require 共用）
 * 2026-11-13 用户：不要关卡列表，设计完整的一局，打完就把所有东西都学会。
 * 三个人（我 / 咪咪老师 / 小橘），牌提前排好，每一步只放行剧本里的那个操作（allow），对手按剧本走（bot），讲解在事件之后弹（after）：
 *   ① 看懂牌堆 → 摸一张（安全）              ② 小橘出【索要】→ 我用【作废】挡掉
 *   ③ 我【窥探】：顶上是炸毛猫 → 出【跳过】    ④ 老师摸到炸毛猫，【逗猫棒】自救、偷偷塞回去（示范）
 *   ⑤ 小橘【甩锅】给我 ×2 → 我两张一样偷小橘一张、三张一样点名要老师的逗猫棒，再【甩锅】给老师 2+2=4（叠加）
 *   ⑥ 老师【自由甩锅】点我 4+2=6 → 我【抽底】从底下摸、再连摸四张，凑齐五种猫捡回弃牌堆里老师的【自由甩锅】，点小橘（她摸 2 回合）
 *   ⑦ 小橘摸到炸毛猫出局 → 我【改命】把炸毛猫排在老师那一张 → 老师出局，我赢；收尾一句带过【洗牌】和【交换牌】
 * 牌桌通过这些钩子调用它：intro / idle / allow / bot / botNope / mustNope / after / finish；
 * 讲解一句可以写成 { t, focus }：focus 里的东西（手牌 / 牌堆 / 某一家）不被蒙住。solve = 测试用的标准走法。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoTutorial = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ME = ['defuse', 'nope', 'future', 'skip', 'bottom', 'cow', 'cow', 'tabby', 'tabby', 'tabby'];
  const TEACHER = ['defuse', 'defuse', 'tattack', 'siamese'];
  const XIAOJU = ['favor', 'attack', 'orange', 'orange'];
  // 牌堆从上到下。第一只炸毛猫先被老师摸到、塞回第 5 张；我连摸四张后它到顶，小橘摸到出局；第二只留给最后的改命
  const DECK = ['attack', 'cow', 'orange', 'boom', 'calico', 'siamese', 'tabby', 'cow', 'orange', 'calico', 'boom', 'siamese', 'tabby', 'cow', 'alter'];
  const INSERT_AT = 4;

  function create(R, ui) {
    const pool = {};
    R.KIND_OF.forEach((k, id) => { (pool[k] = pool[k] || []).push(id); });   // 两副牌的号都可以用（教程要的猫多），没用到的全收进盒子
    const take = (k) => { const id = pool[k].shift(); if (id == null) throw new Error('tutorial: out of ' + k); return id; };
    const state = R.createGame(3, 1);
    state.hands = [ME, TEACHER, XIAOJU].map((h) => R.sortHand(h.map(take)));
    state.deck = DECK.map(take);
    state.discard = [];
    state.removed = [].concat(...Object.values(pool));
    state.turn = 0; state.turnsLeft = 1; state.phase = 'act';
    state.pending = null; state.alive = [true, true, true]; state.outOrder = []; state.winner = -1; state.ins = null;
    state.memo = [0, 1, 2].map(() => ({ deck: [], hands: [[], [], []] }));

    const K = (id) => R.KIND_OF[id];
    const only = (cards, kind, n) => !!cards && cards.length === n && cards.every((id) => K(id) === kind);
    const find = (s, seat, kind) => s.hands[seat].find((id) => K(id) === kind);
    let stage = 0, draws = 0;
    // 每一步要我做的事（等我操作时落在下沿的小提示）
    const HINT = {
      0: '点「摸牌」',
      1: '点紫色的「作废」',
      2: '点选【窥探】，再点「出牌」',
      3: '点选【跳过】，再点「出牌」',
      5: '点选两张【奶牛猫】，出牌后点小橘',
      6: '在小橘扣着的牌里点一张',
      7: '点选三张【狸花】，出牌后点咪咪老师，点名要【逗猫棒】',
      9: '点选【甩锅】，再点「出牌」',
      20: '点选【抽底】，再点「出牌」',
      11: '点「摸牌」（还要连摸几张）',
      12: '点选五种不同的猫，再点「出牌」',
      13: '在弃牌堆里点【自由甩锅】',
      14: '点选【自由甩锅】，出牌后点小橘',
      16: '点选【改命】，再点「出牌」',
      17: '把炸毛猫拖到第二张，点「好了」',
      18: '点「摸牌」',
    };
    const has = (ev, t, f) => ev.some((e) => e.t === t && (!f || f(e)));

    return {
      state,
      bots: [{ nick: '咪咪老师', avatar: 'cat' }, { nick: '小橘', avatar: 'fox' }],
      intro: [
        '欢迎来到百变小咪！牌堆里藏着【炸毛猫】，谁摸到谁就炸毛出局，撑到最后的人赢。',
        { t: '轮到你时，可以出牌，也可以一张不出——但最后都要摸一张牌，回合才算结束。', focus: ['hand'] },
        { t: '牌堆下面那行数字：左边是还剩几张牌，右边是里面还有几只炸毛猫。现在十几张里只有两只，放心摸。', focus: ['deck'] },
        { t: '你手里有一张【逗猫棒】：万一摸到炸毛猫，它会自动救你一命。', focus: ['hand'] },
      ],
      idle() { ui.hint(HINT[stage] || ''); },
      allow(d) {
        switch (stage) {
          case 0: return d.type === 'draw';
          case 1: return d.type === 'nope';
          case 2: return d.type === 'play' && only(d.cards, 'future', 1);
          case 3: return d.type === 'play' && only(d.cards, 'skip', 1);
          case 5: return d.type === 'play' && only(d.cards, 'cow', 2) && (d.preview || d.target === 2);
          case 6: return d.type === 'steal';
          case 7: return d.type === 'play' && only(d.cards, 'tabby', 3) && (d.preview || (d.target === 1 && (d.named == null || d.named === R.DEFUSE)));
          case 9: return d.type === 'play' && only(d.cards, 'attack', 1);
          case 20: return d.type === 'play' && only(d.cards, 'bottom', 1);
          case 11: return d.type === 'draw';
          case 12: return d.type === 'play' && !!d.cards && d.cards.length === 5;
          case 13: return d.type === 'pick' && K(d.card) === R.TATTACK;
          case 14: return d.type === 'play' && only(d.cards, 'tattack', 1) && (d.preview || d.target === 2);
          case 16: return d.type === 'play' && only(d.cards, 'alter', 1);
          case 17: return d.type === 'alter' && !!d.order && K(d.order[1]) === R.BOOM;
          case 18: return d.type === 'draw';
          default: return false;
        }
      },
      bot(s, seat) {
        if (s.phase === 'defuse') return { type: 'insert', pos: INSERT_AT };
        if (s.phase !== 'act') return null;
        if (seat === 2 && stage === 1) { const id = find(s, 2, 'favor'); if (id != null) return { type: 'play', cards: [id], target: 0 }; }
        if (seat === 2 && stage === 4) { const id = find(s, 2, 'attack'); if (id != null) return { type: 'play', cards: [id] }; }
        if (seat === 1 && stage === 10) { const id = find(s, 1, 'tattack'); if (id != null) return { type: 'play', cards: [id], target: 0 }; }
        return { type: 'draw' };
      },
      botNope() { return false; },
      mustNope(s) { return stage === 1 && s.pending && s.pending.by === 2 && s.pending.nopes.length % 2 === 0; },
      after(ev) {
        if (stage === 0 && has(ev, 'draw', (e) => e.seat === 0)) {
          stage = 1;
          return [{ t: '摸到一张【甩锅】，安全！先留着，待会儿有大用。你的回合结束，轮到咪咪老师，然后是小橘。', focus: ['hand'] }];
        }
        if (stage === 1 && has(ev, 'play', (e) => e.seat === 2)) {
          return [{ t: '小橘出了【索要】：你得自己挑一张牌送给她。', focus: [2] },
            { t: '别急——你手里有【作废】。别人刚出牌时，不管轮没轮到你，都能用它把那张牌作废。', focus: ['hand'] }];
        }
        if (stage === 1 && has(ev, 'resolve', (e) => e.cancelled)) { stage = 2; return ['作废成功，她的【索要】白出了！']; }
        if (stage === 2 && has(ev, 'draw', (e) => e.seat === 2)) {
          return [{ t: '又轮到你。牌堆最上面会不会就是炸毛猫？用【窥探】可以偷看最上面三张，别人看不到。', focus: ['hand'] }];
        }
        if (stage === 2 && has(ev, 'future')) {
          stage = 3;
          return ['最上面那张就是【炸毛猫】！这回合要是摸牌就完了。', { t: '出【跳过】：直接结束这个回合，而且不用摸牌。', focus: ['hand'] }];
        }
        if (stage === 3 && has(ev, 'resolve', (e) => e.type === 'skip')) { stage = 4; return ['躲过去了！轮到咪咪老师——他不知道最上面是什么。']; }
        if (stage === 4 && has(ev, 'defuse')) {
          return [{ t: '他摸到了炸毛猫！好在手里有【逗猫棒】，自动用掉救了自己。', focus: [1] },
            '用了逗猫棒的人，要把炸毛猫偷偷塞回牌堆——塞在第几张只有他自己知道。'];
        }
        if (stage === 4 && has(ev, 'insert')) return [{ t: '塞好了。炸毛猫可能在最上面，也可能藏得很深……', focus: ['deck'] }];
        if (stage === 4 && has(ev, 'turn', (e) => e.attacked)) {
          stage = 5;
          return [{ t: '小橘出了【甩锅】：她不用摸牌，你要连着摸两回合（头像旁的 ×2）。', focus: [2, 'me'] },
            { t: '别急着摸，先用好手里的牌。两张一样的牌（比如两张【奶牛猫】）可以偷别人一张：她的牌打乱扣着摆开，你自己点一张。', focus: ['hand'] }];
        }
        if (stage === 5 && has(ev, 'askSteal')) { stage = 6; return []; }
        if (stage === 6 && has(ev, 'steal')) {
          stage = 7;
          return [{ t: '偷到一张【橘猫】。', focus: ['hand'] },
            { t: '三张一样的牌更厉害：指定一个人，再点名要一种牌——他有就必须给你。老师手里还剩一张【逗猫棒】，把它要过来！', focus: ['hand', 1] }];
        }
        if (stage === 7 && has(ev, 'take')) {
          stage = 9;
          return [{ t: '老师的逗猫棒归你了，他现在摸到炸毛猫就没救了。', focus: ['hand'] },
            { t: '你还有 2 回合要摸——先别摸。出【甩锅】：被甩锅的人再甩锅，剩下的回合 +2 一起甩走，老师要连摸 2 + 2 = 4 回合！', focus: ['hand', 'me'] }];
        }
        if (stage === 9 && has(ev, 'turn', (e) => e.attacked)) { stage = 10; return [{ t: '老师 ×4！甩锅可以一路越叠越多。', focus: [1] }]; }
        if (stage === 10 && has(ev, 'turn', (e) => e.attacked && e.seat === 0)) {
          stage = 20;
          return [{ t: '老师出了【自由甩锅】：不用甩给下家，想甩给谁就甩给谁——他点了你。4 + 2 = 6，你要连摸 6 回合！', focus: ['me'] },
            { t: '老师刚把炸毛猫塞回了牌堆，看不出塞在哪——保险起见，第一张用【抽底】从牌堆最底下摸。', focus: ['hand', 'deck'] }];
        }
        if (stage === 20 && has(ev, 'draw', (e) => e.seat === 0 && e.bottom)) {
          stage = 11;
          return [{ t: '从底下摸到【改命】，安全！这算一回合，还剩 5 回合。', focus: ['hand', 'me'] },
            { t: '你手里有两张【逗猫棒】，不怕。再连摸四张。', focus: ['hand'] }];
        }
        if (stage === 11 && has(ev, 'draw', (e) => e.seat === 0 && !e.bottom)) {
          draws += 1;
          if (draws >= 4) {
            stage = 12;
            return [{ t: '四张都安全，还剩 1 回合。看看手里：橘猫、三花、奶牛猫、狸花、暹罗——五种猫凑齐了！', focus: ['hand'] },
              '五种猫各一张一起出：可以从弃牌堆里挑一张拿回手里。'];
          }
          return [];
        }
        if (stage === 12 && has(ev, 'askPick')) { stage = 13; return ['弃牌堆里有老师刚用过的【自由甩锅】，把它捡回来。']; }
        if (stage === 13 && has(ev, 'pick')) { stage = 14; return [{ t: '捡回来了！最后这一回合也别摸——用它点小橘，让她连摸两回合。', focus: ['hand', 2] }]; }
        if (stage === 14 && has(ev, 'turn', (e) => e.attacked)) { stage = 15; return []; }
        if (stage === 15 && has(ev, 'out', (e) => e.seat === 2)) {
          stage = 16;
          return ['小橘一摸就是那只被塞回去的炸毛猫，她没有逗猫棒——炸毛出局！',
            { t: '牌堆里还有最后一只炸毛猫。【改命】：看最上面三张，并按你的意思重新排好顺序。', focus: ['hand', 'deck'] }];
        }
        if (stage === 16 && has(ev, 'alter')) {
          stage = 17;
          return ['第三张就是炸毛猫。现在只剩你和老师：你摸第一张，老师摸第二张——把炸毛猫挪到第二张，正好轮到他。拖一张插到别处，点两张是互换。'];
        }
        if (stage === 17 && has(ev, 'altered')) { stage = 18; return ['排好了。摸走第一张，下一张就归老师。']; }
        return [];
      },
      finish(won) {
        return [
          won ? '老师摸到炸毛猫，又没有逗猫棒——炸毛出局，你赢了！' : '这局没赢，不过你已经都学会了。',
          { t: '还有一张【洗牌】：顶上太危险、又没别的躲法时，把牌堆洗乱，炸毛猫就不知道跑哪去了。', focus: ['deck'] },
          '设置里开了「有交换牌」，还能和人整手交换手牌（各自的逗猫棒不换）。规则随时点右上角的问号看。',
        ];
      },
      // 测试用：照着走就能打完
      solve: [
        () => ({ type: 'draw' }), 'nope',
        (s) => ({ type: 'play', cards: [find(s, 0, 'future')] }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'skip')] }),
        (s) => ({ type: 'play', cards: s.hands[0].filter((id) => K(id) === 'cow').slice(0, 2), target: 2 }),
        () => ({ type: 'steal', idx: 0 }),
        (s) => ({ type: 'play', cards: s.hands[0].filter((id) => K(id) === 'tabby').slice(0, 3), target: 1, named: R.DEFUSE }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'attack')] }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'bottom')] }),
        () => ({ type: 'draw' }), () => ({ type: 'draw' }), () => ({ type: 'draw' }), () => ({ type: 'draw' }),
        (s) => ({ type: 'play', cards: R.CATS.map((k) => find(s, 0, k)) }),
        (s) => ({ type: 'pick', card: s.discard.find((id) => K(id) === R.TATTACK) }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'tattack')], target: 2 }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'alter')] }),
        (s) => ({ type: 'alter', order: [s.alter.cards[0], s.alter.cards[2], s.alter.cards[1]] }),
        () => ({ type: 'draw' }),
      ],
    };
  }

  return { create };
});
