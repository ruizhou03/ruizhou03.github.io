/* 百变小咪 · 新手教程（window.ZhamaoTutorial / Node require 共用）
 * 2026-11-22 用户：从头重做。一局排好的牌、三个人（我 → 小橘 → 咪咪老师），只教决定九成出牌的 10 样，全程 11 句话；
 * 其余的牌（自由甩锅 / 转向 / 抽底 / 改命 / 捣乱 / 万能猫 / 三张一样 / 五种猫）和另外三个玩法不在这里教，留到实战里第一次碰到再讲。
 * 默认项：经典玩法、标准牌量、没有交换牌、塞回炸毛猫看得出大概高度、作废只问和我有关的牌。
 *   一 摸牌  ① ② 我摸一张（橘猫）→ 小橘摸 → 老师摸到炸毛猫，逗猫棒自救、塞回最上面 ③
 *   二 躲    ④ 我【窥探】看到顶上是炸毛猫 → ⑤ 出【装睡】→ 小橘摸到、用掉逗猫棒、塞回中间 → 我下一回合摸到【甩锅】
 *   三 互动  小橘对我出【讨要】⑥ → 我【作废】→ ⑦ 两张橘猫偷一张 → ⑧ 出【甩锅】，小橘连摸两回合、第二张是炸毛猫，出局 ⑨
 *   四 收尾  我摸到炸毛猫，逗猫棒自救 ⑩ → 我把它塞到最上面 → 老师摸到出局 ⑪ 我赢
 * 每张牌都在用得上的那一刻才讲；逗猫棒先看别人用、最后自己用（塞回去坑人留给玩家亲手做）；讨要被人用一次就懂，不单讲。
 * 牌桌通过这些钩子调用它：intro / idle / allow / bot / botNope / mustNope / after / finish；
 * 讲解一句可以写成 { t, focus }：focus 里的东西（手牌 / 牌堆 / 某一家）不被蒙住。solve = 测试用的标准走法。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoTutorial = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 座位：0 我 → 1 小橘（我的下家）→ 2 咪咪老师。开局和真的一样：每人 4 张 + 1 根逗猫棒
  const ME = ['defuse', 'nope', 'future', 'skip', 'orange'];
  const XIAOJU = ['defuse', 'favor', 'calico', 'cow', 'siamese'];
  const TEACHER = ['defuse', 'tabby', 'cow', 'siamese', 'calico'];
  /* 牌堆从上到下。前三张：我（橘猫）、小橘（三花）、老师（炸毛猫 → 塞回最上面）。
   * 之后是 狸花 甩锅 暹罗 奶牛猫 狸花 三花 炸毛猫 ……：小橘把第一只塞回第 6 张（INSERT_XIAOJU），
   * 正好是她被甩锅后摸的第二张；第二只轮到我摸，我塞回最上面给老师 */
  const DECK = ['orange', 'calico', 'boom', 'tabby', 'attack', 'siamese', 'cow', 'tabby', 'calico', 'boom', 'cow', 'siamese', 'shuffle'];
  const INSERT_XIAOJU = 5;

  function create(R, ui) {
    const T = R.T || ((k, zh) => zh);   // 多语言：见 zhamao-rules.js 的 T
    const pool = {};
    R.KIND_OF.forEach((k, id) => { (pool[k] = pool[k] || []).push(id); });
    const take = (k) => { const id = pool[k].shift(); if (id == null) throw new Error('tutorial: out of ' + k); return id; };
    const state = R.createGame(3, 1);
    state.hands = [ME, XIAOJU, TEACHER].map((h) => R.sortHand(h.map(take)));
    state.deck = DECK.map(take);
    state.discard = [];
    state.removed = [].concat(...Object.values(pool));
    state.turn = 0; state.turnsLeft = 1; state.phase = 'act';
    state.pending = null; state.alive = [true, true, true]; state.outOrder = []; state.winner = -1; state.ins = null;
    state.memo = [0, 1, 2].map(() => ({ deck: [], hands: [[], [], []] }));

    const K = (id) => R.KIND_OF[id];
    const only = (cards, kind, n) => !!cards && cards.length === n && cards.every((id) => K(id) === kind);
    const find = (s, seat, kind) => s.hands[seat].find((id) => K(id) === kind);
    const has = (ev, t, f) => ev.some((e) => e.t === t && (!f || f(e)));
    /* stage：0 我摸第一张 · 1 等老师摸到炸毛猫塞回 · 2 我窥探 · 3 我装睡 · 4 等一圈、我再摸一张 · 5 小橘讨要、我作废
     * 6 等一圈 · 7 我出一对橘猫 · 8 我点一张偷 · 9 我甩锅 · 10 等小橘出局 · 11 我摸到炸毛猫 · 12 我塞回最上面 · 13 等老师出局 */
    let stage = 0;
    // 等我操作时落在桌子下沿的小提示
    const HINT = {
      0: T('tut2.hint.draw', '点「摸牌」'),
      2: T('tut2.hint.future', '点【窥探】，再点「出牌」'),
      3: T('tut2.hint.skip', '点【装睡】，再点「出牌」'),
      4: T('tut2.hint.draw', '点「摸牌」'),
      5: T('tut2.hint.nope', '点紫色的「作废」'),
      7: T('tut2.hint.pair', '点两张【橘猫】，出牌后点一个人'),
      8: T('tut2.hint.steal', '在扣着的牌里点一张'),
      9: T('tut2.hint.attack', '点【甩锅】，再点「出牌」'),
      11: T('tut2.hint.draw', '点「摸牌」'),
      12: T('tut2.hint.insert', '把炸毛猫放到最上面，点「塞进去」'),
    };

    return {
      state,
      bots: [{ nick: T('tut.bot.xiaoju', '小橘'), avatar: 'fox' }, { nick: T('tut.bot.teacher', '咪咪老师'), avatar: 'cat' }],
      intro: [
        { t: T('tut2.say.1', '牌堆里藏着 2 只【炸毛猫】，摸到就出局，活到最后的人赢。'), focus: ['deck'] },
        { t: T('tut2.say.2', '轮到你了：摸一张牌，回合就结束。'), focus: ['deck', 'me'] },
      ],
      idle() { ui.hint(HINT[stage] || ''); },
      allow(d) {
        switch (stage) {
          case 0: case 4: case 11: return d.type === 'draw';
          case 2: return d.type === 'play' && only(d.cards, 'future', 1);
          case 3: return d.type === 'play' && only(d.cards, 'skip', 1);
          case 5: return d.type === 'nope';
          case 7: return d.type === 'play' && only(d.cards, 'orange', 2);
          case 8: return d.type === 'steal';
          case 9: return d.type === 'play' && only(d.cards, 'attack', 1);
          case 12: return d.type === 'insert' && d.pos === 0;
          default: return false;
        }
      },
      bot(s, seat) {
        if (s.phase === 'defuse') return { type: 'insert', pos: seat === 2 ? 0 : INSERT_XIAOJU };
        if (s.phase !== 'act') return null;
        if (seat === 1 && stage === 5) { const id = find(s, 1, 'favor'); if (id != null) return { type: 'play', cards: [id], target: 0 }; }
        return { type: 'draw' };
      },
      botNope() { return false; },
      mustNope(s) { return stage === 5 && !!s.pending && s.pending.by === 1 && s.pending.nopes.length % 2 === 0; },
      after(ev) {
        if (stage === 0 && has(ev, 'draw', (e) => e.seat === 0)) { stage = 1; return []; }
        if (stage === 1 && has(ev, 'insert')) {
          stage = 2;
          return [{ t: T('tut2.say.3', '【逗猫棒】救了老师。他把炸毛猫塞回去了，看位置就在最上面。'), focus: ['deck', 2] },
            { t: T('tut2.say.4', '不放心就出【窥探】，看最上面三张。'), focus: ['hand'] }];
        }
        if (stage === 2 && has(ev, 'future')) { stage = 3; return [{ t: T('tut2.say.5', '顶上就是炸毛猫。出【装睡】：不摸牌，直接结束回合。'), focus: ['hand'] }]; }
        if (stage === 3 && has(ev, 'resolve', (e) => e.type === 'skip')) { stage = 4; return []; }
        if (stage === 4 && has(ev, 'draw', (e) => e.seat === 0)) { stage = 5; return []; }
        if (stage === 5 && has(ev, 'play', (e) => e.seat === 1)) return [{ t: T('tut2.say.6', '小橘要你送她一张牌。点【作废】，让它不算数。'), focus: [1, 'hand'] }];
        if (stage === 5 && has(ev, 'resolve', (e) => e.cancelled)) { stage = 6; return []; }
        if (stage === 6 && has(ev, 'draw', (e) => e.seat === 2)) { stage = 7; return [{ t: T('tut2.say.7', '两张一样的牌一起出，偷别人一张。'), focus: ['hand'] }]; }
        if (stage === 7 && has(ev, 'askSteal')) { stage = 8; return []; }
        if (stage === 8 && has(ev, 'steal')) { stage = 9; return [{ t: T('tut2.say.8', '出【甩锅】：你不摸，下家连摸两回合。'), focus: ['hand', 1] }]; }
        if (stage === 9 && has(ev, 'turn', (e) => e.attacked)) { stage = 10; return []; }
        if (stage === 10 && has(ev, 'out', (e) => e.seat === 1)) { stage = 11; return [{ t: T('tut2.say.9', '小橘没有逗猫棒了，出局！'), focus: [1] }]; }
        if (stage === 11 && has(ev, 'defuse', (e) => e.seat === 0)) { stage = 12; return [{ t: T('tut2.say.10', '【逗猫棒】救了你。把炸毛猫塞到最上面，下一个摸牌的就是老师。'), focus: ['deck', 2] }]; }
        if (stage === 12 && has(ev, 'insert')) { stage = 13; return []; }
        return [];
      },
      finish(won) {
        return [
          won ? T('tut2.say.11', '你赢了！') : T('tut2.say.lost', '这局没赢，不过该会的都会了。'),
          T('tut2.say.more2', '还有几张牌没见过，实战里第一次摸到会告诉你。'),
        ];
      },
      // 测试用：照着走就能打完
      solve: [
        () => ({ type: 'draw' }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'future')] }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'skip')] }),
        () => ({ type: 'draw' }),
        'nope',
        (s) => ({ type: 'play', cards: s.hands[0].filter((id) => K(id) === 'orange').slice(0, 2), target: 2 }),
        () => ({ type: 'steal', idx: 0 }),
        (s) => ({ type: 'play', cards: [find(s, 0, 'attack')] }),
        () => ({ type: 'draw' }),
        () => ({ type: 'insert', pos: 0 }),
      ],
    };
  }

  return { create };
});
