/* 猫咪炸毛 · 新手教程（window.ZhamaoTutorial / Node require 共用）
 * 固定一副牌、两人局（我 vs 咪咪老师），剧本一步一步来：
 *   ① 摸一张（安全）→ ② 老师出「索要」，我用「作废」挡掉 → ③ 我「偷看」，看到顶上是炸毛猫
 *   → ④ 出「跳过」躲过去 → ⑤ 老师摸到炸毛猫，用逗猫棒救了自己、偷偷塞回最上面
 *   → ⑥ 我两张橘猫偷他一张（只剩「甩锅」）→ ⑦ 出「甩锅」，老师连摸两次，摸到炸毛猫出局，我赢。
 * 每一步只放行剧本里的那个操作（allow），机器人按剧本走（bot / botNope），讲解在事件之后弹（after）。
 * 牌桌通过这些钩子调用它：intro / idle / allow / bot / botNope / mustNope / after / finish。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoTutorial = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ME_HAND = ['defuse', 'future', 'skip', 'nope', 'orange', 'orange'];
  const BOT_HAND = ['favor', 'defuse'];
  const DECK = ['calico', 'attack', 'boom', 'tabby', 'cow', 'siamese', 'shuffle', 'calico', 'future', 'cow'];

  function create(R, ui) {
    // 搭局面：按牌种从整副牌里挑 id，剩下的收进盒子
    const pool = {};
    R.KIND_OF.forEach((k, id) => { (pool[k] = pool[k] || []).push(id); });
    const take = (k) => pool[k].shift();
    const state = R.createGame(2, 1);
    state.hands = [R.sortHand(ME_HAND.map(take)), R.sortHand(BOT_HAND.map(take))];
    state.deck = DECK.map(take);
    state.discard = [];
    state.removed = [].concat(...Object.values(pool));
    state.turn = 0; state.turnsLeft = 1; state.phase = 'act';
    state.memo = [0, 1].map(() => ({ deck: [], hands: [[], []] }));

    let stage = 0;
    let favorPlayed = false;
    const kindsOf = (cards) => cards.map((id) => R.KIND_OF[id]);
    const only = (cards, kind, n) => cards.length === n && kindsOf(cards).every((k) => k === kind);

    const HINTS = {
      0: '点右下角「摸牌」：摸一张牌，结束这个回合',
      1: '点紫色的「作废」按钮，让他的【索要】白出',
      2: '先点选【偷看】，再点「出牌」',
      3: '点选【跳过】，再点「出牌」',
      5: '点选两张【橘猫】，再点「出牌」',
      6: '点选【甩锅】，再点「出牌」',
    };

    return {
      state,
      botName: '咪咪老师',
      botAvatar: 'cat',
      intro: [
        '欢迎来到猫咪炸毛！牌堆里藏着【炸毛猫】，谁摸到谁就炸毛出局，撑到最后的人赢。',
        '轮到你时，可以出牌，也可以一张不出——但最后都要摸一张牌，回合才算结束。',
        '你开局手里有一张【逗猫棒】：万一摸到炸毛猫，它会自动救你一命。',
      ],
      idle() { ui.hint(HINTS[stage] || ''); },
      allow(d) {
        switch (stage) {
          case 0: return d.type === 'draw';
          case 1: return d.type === 'nope';
          case 2: return d.type === 'play' && only(d.cards, 'future', 1);
          case 3: return d.type === 'play' && only(d.cards, 'skip', 1);
          case 5: return d.type === 'play' && only(d.cards, 'orange', 2);
          case 6: return d.type === 'play' && only(d.cards, 'attack', 1);
          default: return false;
        }
      },
      bot(s, seat) {
        if (s.phase === 'defuse') return { type: 'insert', pos: 0 };
        if (s.phase === 'act' && seat === 1) {
          if (stage === 1 && !favorPlayed) {
            const fav = s.hands[1].find((id) => R.KIND_OF[id] === 'favor');
            if (fav != null) { favorPlayed = true; return { type: 'play', cards: [fav], target: 0 }; }
          }
          return { type: 'draw' };
        }
        return null;
      },
      botNope() { return false; },
      mustNope(s) { return stage === 1 && s.pending && s.pending.by === 1 && s.pending.nopes.length % 2 === 0; },
      after(ev, s) {
        const has = (t, f) => ev.some((e) => e.t === t && (!f || f(e)));
        ui.hint('');
        if (stage === 0 && has('draw', (e) => e.seat === 0)) {
          stage = 1;
          return ['摸到一张【三花】，安全！你的回合结束，轮到咪咪老师。'];
        }
        if (stage === 1 && has('play', (e) => e.seat === 1)) {
          return ['老师出了【索要】：你得自己挑一张牌送给他。',
            '别急——你手里有【作废】。别人刚出牌时，不管轮没轮到你，都能用它把那张牌作废。'];
        }
        if (stage === 1 && has('resolve', (e) => e.cancelled)) {
          stage = 2;
          return ['作废成功，他的【索要】白出了！'];
        }
        if (stage === 2 && has('draw', (e) => e.seat === 1)) {
          return ['他摸了一张牌，又轮到你。',
            '牌堆最上面会不会就是炸毛猫？用【偷看】可以偷看最上面三张，别人看不到。'];
        }
        if (stage === 2 && has('future')) {
          stage = 3;
          return ['最上面那张就是【炸毛猫】！这回合要是摸牌就完了。',
            '出【跳过】：直接结束这个回合，而且不用摸牌。'];
        }
        if (stage === 3 && has('resolve', (e) => e.type === 'skip')) {
          stage = 4;
          return ['躲过去了！现在轮到咪咪老师——他不知道最上面是什么。'];
        }
        if (stage === 4 && has('defuse')) {
          return ['他摸到了炸毛猫！不过手里有【逗猫棒】，自动用掉救了自己。',
            '用了逗猫棒的人，要把炸毛猫偷偷塞回牌堆——塞在哪儿只有他自己知道。'];
        }
        if (stage === 4 && has('insert')) {
          stage = 5;
          return ['塞好了。炸毛猫可能就在最上面，也可能藏得很深……',
            '他已经没有逗猫棒了。你手里有两张【橘猫】：两张一样的牌，可以随机偷别人一张。'];
        }
        if (stage === 5 && has('steal')) {
          stage = 6;
          return ['偷到一张【甩锅】！',
            '现在摸牌有点悬——他很可能把炸毛猫塞在了最上面。',
            '出【甩锅】：你不用摸牌，还要咪咪老师连着摸两回合。'];
        }
        if (stage === 6 && has('resolve', (e) => e.type === 'attack')) {
          stage = 7;
          return [];
        }
        void s;
        return [];
      },
      finish(won) {
        return [
          won ? '他摸到了炸毛猫，又没有逗猫棒——炸毛出局，你赢了！' : '这局没赢，不过你已经会玩啦。',
          '记住：你要是摸到炸毛猫，手里的【逗猫棒】会自动救你，然后由你挑位置把炸毛猫塞回去。',
          '还有两个组合：三张一样可以点名要一种牌；五张各不相同可以从弃牌堆捡一张。规则随时点右上角的问号看。',
        ];
      },
    };
  }

  return { create };
});
