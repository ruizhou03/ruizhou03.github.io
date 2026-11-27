/* 百变小咪 · 机器人（浏览器 window.ZhamaoAI / Node require 共用，无 DOM）
 *
 * 机器人只能看 R.view(state, seat)：自己的手牌、公开信息、自己亲眼看到的（窥探 / 自己塞回的炸弹猫 / 被蹭走偷走的牌）。
 * 决策点：act（出什么 / 摸牌）、react（要不要作废）、give（被索要时给哪张）、pick（五张各不同捡哪张）、
 *         insert（炸弹猫塞哪）、alter（改命怎么排）、steal（偷哪张——扣着的牌没信息，随便点）。
 *
 * 三档（2026-11-15 第二次重训，详见 ~/zhamao-rl/REPORT.md「看动作 / 连摸 / 塞猫 / 交换时机」一节）：
 *   easy   入门：和普通同一套牌值，但不太会防守——顶上危险也很少窥探 / 躲，被甩锅多半硬摸；也不会下面那四招
 *   normal 普通：算牌堆顶是炸弹猫的概率（公开的塞猫历史 + 粗略高度 vis 一起估那只猫在哪），
 *          危险就窥探 / 躲 / 甩锅，知道顶上是炸弹猫就躲；没逗猫棒时想办法偷。另外四招（2026-11-15 用户提的）：
 *          · 看别人的动作：窥探 / 改命后紧接着躲 → 顶上多半是炸弹猫；改命后自己摸了 → 第二张多半是（规则公开记 peek）
 *          · 被甩锅要连摸几张：按「这几张里有炸弹猫」的合起来的概率决定先窥探 / 改命（lookMulti）
 *          · 自己还要摸几张时拆了炸弹猫：塞在自己那几张之后（insSmart），别塞回自己要摸的范围里
 *          · 交换看时机：牌堆用掉一半以前不换（swapPhase）
 *          牌值和阈值全部自博弈调出来（3–8 人局；对手桌混了现普通 / 入门 / 小推演量高手，防止只对一种打法过拟合）
 *   hard   高手：以「普通」为底，出牌和塞炸弹猫用 PIMC——按自己知道的信息随机补全别人手牌和牌堆，
 *          每个候选在同一批假想局面里用「普通」打到底；出牌比普通的选择好出 ANCHOR 才换
 *
 * 经典模式（2026-11-18 起）：普通出牌换成 zhamao-brain.js 的神经网络（上面那套规则仍管窥探 / 改命时机和出牌以外的所有决定），
 * 高手的锚点也换成网络的选择（推演时别人仍按上面那套规则打）。见 brainAct。
 * 组队 / 百变（2026-11-19 起）：同样的用法，各换一个认得队友 / 百变规则的网络（zhamao-brain-team.js / -flux.js）；角色猫同理换认得每人角色的 zhamao-brain-roles.js。
 *
 * 两套参数：规则的 view 里有 ins 字段（公开塞猫历史）用 P_HIST，没有用 P_BASE（两套都是调出来的，互相不通用）。
 *
 * 百变模式（2026-11-17 夜训，~/zhamao-rl/REPORT-flux.md）：普通 / 高手另用一套 P_HIST + FX_N——会看当前百变规则决定换不换
 * （火眼、静默且手里有作废时换；没规则 / 透视 / 急救 / 九命时留着）、摸底时塞猫顶底对调等；入门照旧。只在 mode === 'flux' 时走，
 * 经典 / 组队 / 角色猫逐局不变。
 */
(function (root, factory) {
  const api = factory(root.ZhamaoRules || (typeof require === 'function' ? require('./zhamao-rules.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoAI = api;
})(typeof self !== 'undefined' ? self : this, function zhamaoAI(R, FXO) {
  'use strict';

  const K = R.KIND_OF;
  const TIERS = Object.freeze(['easy', 'normal', 'hard']);
  const TIER_NAMES = Object.freeze({ easy: R.T('tier.easy.name', '入门'), normal: R.T('tier.normal.name', '普通'), hard: R.T('tier.hard.name', '高手') });

  /* ───── 调参结果（交叉熵搜索 + 自博弈，详见 ~/zhamao-rl/REPORT.md） ─────
   * v*        牌「留着有多值钱」（给牌 / 捡牌 / 交换 / 三张点名用），逗猫棒固定 100
   * look*     顶上是炸弹猫的概率 ≥ 它就窥探 / 改命（Def = 手里有逗猫棒，No = 没有）
   * dodge*    概率 ≥ 它就甩锅 / 跳过 / 抽底躲开
   * multiAtk  被甩锅（还要摸 ≥2 回合）时概率 ≥ 它就把锅甩出去
   * insTop    （普通）塞回炸弹猫时放最上面的概率，否则放第 1..insSpread 位
   * nopeBackP 我的躲闪牌被作废时，顶上危险 ≥ 它就再作废回去
   * bottomDef 有逗猫棒、底牌未知时也用抽底躲
   * histW / histTop  估计别人刚塞回的炸弹猫：信这条历史的权重 / 认为他塞在最上面的概率
   * shuffleAt 顶上危险 ≥ 它、又没别的躲法时洗牌 */
  const P_BASE = Object.freeze({
    vNope: 20.094, vTattack: 40.692, vAttack: 23.992, vSwap: 8.596, vSkip: 12.89, vBottom: 25.25, vAlter: 41.225, vFuture: 18.315,
    vShuffle: 26.922, vFavor: 16.236, vCatPair: 6.397, vCatSingle: 3.559,
    lookDef: 0.539, lookNo: 0.005, dodgeDef: 0.844, dodgeNo: 0.021, multiAtk: 0.047,
    insTop: 0.986, insSpread: 2, nopeBackP: 0.751, bottomDef: 0, histW: 0, histTop: 0, shuffleAt: 2,
    swapMargin: 20, swapUnk: 12,
  });
  const P_HIST = Object.freeze({
    vNope: 5.173868606282884, vTattack: 54.81251435426122, vAttack: 32.25433573800855, vSwap: 1.6378944775114421, vSkip: 26.390046944865855, vBottom: 34.74888220637459, vAlter: 44.095831358754346, vFuture: 35.57359491155989, vShuffle: 31.353431727146518, vFavor: 50.35570038735816, vCatPair: 11.353744369645538, vCatSingle: 7.431878472971573, lookDef: 0.7139460282283023, lookNo: 0.0752337634387242, dodgeDef: 0.5181769074015586, dodgeNo: 0.23920113740200882, multiAtk: 0.012377850538347163, insTop: 0.02492938216246054, insSpread: 1, nopeBackP: 0.4270700936922569, bottomDef: 1, vReverse: 21.31434164164689, vWild: 26.35809716610347, revFirst: 0, swapUnk: 27.96817849532888, swapMargin: 52.889793295711826, swapKnown: 0, histW: 0.9735790210284175, histTop: 0.9423860296710509, visW: 0.8451744270857915, shuffleAt: 0.3809381978339131, insSmart: 1, insOffset: 0.7931641120482025, lookMulti: 0.09776146289812056, swapPhase: 0.4464807106202662, sigFutDodge: 0.6179664537693169, sigAltDodge: 0.5769204278246585, sigAltDraw: 0.3841732271713346,
  });

  /* 入门（2026-11-14 重训起）= 新普通的牌值，但不太会防守：顶上危险也很少窥探 / 躲，被甩锅多半硬摸（look / dodge / multiAtk 调高）。
   * 普通对它：3 / 4 / 6 / 8 人胜率 +10.1 / +4.4 / +5.6 / +4.5 个百分点；高手对普通 +10.8 / +8.5 / +6.1 / +4.1——三档间距均匀（2026-11-15） */
  const P_OLD = Object.freeze({
    vNope: 5.173868606282884, vTattack: 54.81251435426122, vAttack: 32.25433573800855, vSwap: 1.6378944775114421, vSkip: 26.390046944865855, vBottom: 34.74888220637459, vAlter: 44.095831358754346, vFuture: 35.57359491155989, vShuffle: 31.353431727146518, vFavor: 50.35570038735816, vCatPair: 11.353744369645538, vCatSingle: 7.431878472971573, lookDef: 0.95, lookNo: 0.5, dodgeDef: 0.98, dodgeNo: 0.6, multiAtk: 0.6, insTop: 0.02492938216246054, insSpread: 1, nopeBackP: 0.4270700936922569, bottomDef: 1, vReverse: 21.31434164164689, vWild: 26.35809716610347, revFirst: 0, swapUnk: 27.96817849532888, swapMargin: 52.889793295711826, swapKnown: 0, histW: 0.9735790210284175, histTop: 0.9423860296710509, visW: 0.8451744270857915, shuffleAt: 0.3809381978339131, insSmart: 0, insOffset: 0.7931641120482025, sigFutDodge: 0, sigAltDodge: 0, sigAltDraw: 0,
  });

  /* 百变模式（2026-11-16 夜训，详见 ~/zhamao-rl/REPORT-flux.md）：mode === 'flux' 时普通 / 高手换用 P_HIST + FX_N、入门用 P_OLD + FX_E，
   * 别的模式完全不走这里（逐局一致）。FX_DEF = 加这些判断之前的行为（训练场用来对照）。
   * fK_*      当前这条百变规则「留着」对我的好处（越低越想打百变换掉；none = 还没有规则）
   * fMuteNope 静默时手里有作废、fCount 手里每多一张百变、fRisk 顶上危险、fHot 烫手且这回合还要摸 ≥2 张、fSave 没逗猫棒时九命 / 急救还能救我（加到「留着」上）
   * fPlayAt   上面加起来 > 它就先打一张百变
   * fBotFlux  摸底时也按上面的算（原来摸底时只在底牌是炸弹猫、别的躲法都没有时才打）
   * fBotMargin 摸底时顶上比底下安全多少就抽「顶」；fBotMirror 摸底时塞炸弹猫按顶 / 底对调
   * fExP / fExDepth 火眼时（位置人人看得见）以 fExP 的概率塞在第 fExDepth 张
   * fAhead   顶上已知安全、这回合还要摸 ≥2 张：第二张危险 ≥ dodge 阈值就先甩锅
   * fMuteNopeV 静默时作废的牌值（给牌 / 捡牌 / 交换用）
   * fHotMulti 烫手（只摸 2 张、没被甩锅）时用它代替 multiAtk */
  const FX_DEF = Object.freeze({
    fx: 1, fK_none: 0, fK_nine: 0, fK_peektop: 0, fK_exact: 0, fK_bottom: 0, fK_hot: 0, fK_mute: 0, fK_catsave: 0,
    fMuteNope: 10, fCount: 10, fRisk: 0, fHot: 0, fSave: 0, fPlayAt: 5, fBotFlux: 0, fBotMargin: 0.08, fBotMirror: 0, fExP: 0, fExDepth: 0, fAhead: 0, fMuteNopeV: null, fHotMulti: null,
  });
  /* 调出来的（2026-11-17 凌晨，交叉熵 30 代 × 32 个候选，百变 3–6 人桌，对手 = 现普通 / 现入门 + 1/4 对自己；选第 13 代）。
   * 大意：没有规则 / 透视 / 急救 / 九命时留着不换；火眼、静默且手里有作废时换；顶上越危险越不换（换了也躲不掉）；
   * 百变牌本身不值钱（vFlux≈3，能给就给）；摸底时塞炸弹猫顶底对调；有逗猫棒时更少躲、被甩锅时更晚甩 */
  const FX_TUNED = Object.freeze({ fK_none: 15.7457, fK_nine: 6.6918, fK_peektop: 18.3012, fK_exact: -13.0072, fK_bottom: 0.6604, fK_hot: 2.22, fK_mute: -0.5201, fK_catsave: 15.0365, fMuteNope: 14.0158, fCount: 0.1795, fRisk: -10.1096, fHot: -0.0925, fSave: 2.6106, fBotFlux: 0, fBotMargin: 0.1702, fBotMirror: 1, fExP: 0.2108, fExDepth: 1.6106, fAhead: 0, fMuteNopeV: 3.8601, fHotMulti: 0.461, vFlux: 3.2768, lookDef: 0.8636, lookNo: 0.0585, dodgeDef: 0.9015, dodgeNo: 0.2566, multiAtk: 0.2736, shuffleAt: 0.3619 });
  const FX_N = Object.freeze(Object.assign({}, FX_DEF, FX_TUNED, (FXO && FXO.normal) || {}));
  const FX_E = Object.freeze(Object.assign({}, FX_DEF, (FXO && FXO.easy) || {}));

  const has = (v, k) => R.countKind(v.hand, k) > 0;
  const isFlux = (v) => !!(v.rules && v.rules.mode === 'flux');
  const D0 = new Map();   // 每种人数 / 规则开局牌堆有多少张（交换看时机用）
  const deck0 = (v) => { const k = v.n + ':' + JSON.stringify(v.rules || {}); if (!D0.has(k)) D0.set(k, R.createGame(v.n, 1, v.rules).deck.length); return D0.get(k); };
  const one = (v, k) => R.findKind(v.hand, k);
  const pickRand = (arr, rng) => arr[(rng() * arr.length) | 0];
  function nextAliveV(v, seat) {   // 按当前出牌方向（转向以后反过来）
    const d = v.dir === -1 ? -1 : 1;
    for (let i = 1; i <= v.n; i++) { const t = (((seat + d * i) % v.n) + v.n) % v.n; if (v.alive[t]) return t; }
    return seat;
  }
  // 组队：下一个摸牌的是我队友（2026-11-15 队友改成挨着坐）——甩锅 / 跳过 / 把炸弹猫放顶上都会坑到他
  // 2026-11-18 起一队可以 2–4 人：队友是一组（view.mates，老 view 只有 mate）
  const matesV = (v) => v.mates || (v.mate >= 0 ? [v.mate] : []);
  const isMateV = (v, t) => matesV(v).indexOf(t) >= 0;
  const teamV = (v) => matesV(v).length > 0;
  const mateNext = (v) => { const nx = nextAliveV(v, v.me); return nx !== v.me && isMateV(v, nx); };
  // 三队以上：哪队活着的人多，就是领先的那队——指定甩锅优先冲他们
  function teamLead(v, t) {
    if (!v.teams || !teamV(v)) return 0;
    const alive = {}; v.teams.forEach((tm, k) => { if (v.alive[k]) alive[tm] = (alive[tm] || 0) + 1; });
    const live = Object.keys(alive);
    if (live.length < 3) return 0;
    return (alive[v.teams[t]] || 0) - Math.min(...live.map((k) => alive[k]));
  }
  // 跳过一回合用的牌：跳过优先，没有就拿转向顶（转向也是结束一回合不摸牌，顺带把方向反过来）
  const skipId = (v) => { const a = one(v, R.SKIP); return a != null ? a : one(v, R.REVERSE); };
  function targets(v) {
    const out = [];
    for (let t = 0; t < v.n; t++) if (t !== v.me && !isMateV(v, t) && v.alive[t] && v.counts[t] > 0) out.push(t);   // 组队：不偷 / 不要队友的
    return out;
  }
  /* 偷谁：知道他手里有逗猫棒的优先，其次手牌最多的 */
  function richest(v, wantKind) {
    let best = -1, score = -1;
    for (const t of targets(v)) {
      const knows = wantKind ? v.handKnown[t].some((id) => K[id] === wantKind) : false;
      const sc = v.counts[t] + (knows ? 100 : 0);
      if (sc > score) { score = sc; best = t; }
    }
    return best;
  }
  // 索要找谁：角色猫「黑猫」第一次被索要会溜走——没用过的黑猫先不找
  function favorTarget(v, pair) {
    let best = -1, score = -1;
    for (const t of targets(v)) {
      if (pair && v.roles && v.roles[t] === 'shadow') continue;   // 黑猫：两张偷牌对他整局扑空（索要照常）
      const sc = v.counts[t] + (v.handKnown[t].some((id) => K[id] === R.DEFUSE) ? 100 : 0);
      if (sc > score) { score = sc; best = t; }
    }
    return best;
  }
  /* 两张偷牌的目标：首选 t；角色猫「影子猫」两张偷牌指不到（规则 validTargets 不收），换成能指的人里最好的，没有返回 -1。
   * 2026-11-19 修：以前「走投无路随便凑一对」和「摸底时凑猫对」直接指 t，偶尔指到影子猫 → 不合法、被兜底改成摸牌 */
  function pairTarget(v, t) {
    return v.roles && v.roles[t] === 'shadow' ? favorTarget(v, true) : t;
  }
  /* 指定甩锅甩给谁：手牌最少的（最可能没有逗猫棒 / 作废），知道他有逗猫棒的往后排 */
  function victim(v) {
    let best = -1, score = Infinity;
    for (let t = 0; t < v.n; t++) {
      if (t === v.me || isMateV(v, t) || !v.alive[t]) continue;   // 组队：不甩给队友
      const knowsDef = v.handKnown[t].some((id) => K[id] === R.DEFUSE);
      const sc = v.counts[t] + (knowsDef ? 50 : 0) - 1.5 * teamLead(v, t);
      if (sc < score) { score = sc; best = t; }
    }
    return best;
  }
  function playMove(cards, target, named) {
    const m = { type: 'play', cards };
    if (target != null && target >= 0) m.target = target;
    if (named) m.named = named;
    return m;
  }
  const DRAW = Object.freeze({ type: 'draw' });
  function pairsOf(v) {
    const by = {};
    for (const id of v.hand) { const k = K[id]; (by[k] = by[k] || []).push(id); }
    return by;
  }
  // 所有猫都是万能猫：百变规则「百搭」，或角色「百搭猫」（2026-11-26 用户改成和百搭一样：手里的猫都是万能猫）
  const anyCat = (v) => (v.roles && v.roles[v.me] === 'calico') || v.flux === 'allwild';
  // 五种猫各一张（规则只认猫）：每种挑一张，缺的拿万能猫顶；顶不上就凑不成
  function fiveCats(v) {
    if (anyCat(v)) { const cs = v.hand.filter((id) => R.catLike(K[id])); return cs.length >= 5 ? cs.slice(0, 5) : null; }   // 百变「百搭」/ 角色「百搭猫」：任意五只猫
    const picks = [], wild = v.hand.filter((id) => K[id] === R.WILD);
    for (const k of R.CATS) {
      let id = one(v, k);
      if (id == null) id = wild.shift();
      if (id == null) return null;
      picks.push(id);
    }
    return picks;
  }
  // 猫种 k 凑 n 张：先用真猫，不够拿万能猫补；一张真猫都没有就不凑（两张以上万能猫自己就是一样的牌，走 by.wild）
  function catSet(by, k, n) {
    const real = by[k] || [], wild = by[R.WILD] || [];
    if (!real.length || real.length + wild.length < n) return null;
    return real.slice(0, n).concat(wild.slice(0, Math.max(0, n - real.length)));
  }
  // 一对猫：纯的优先，其次真猫 + 万能猫，最后两张万能猫
  function catPair(by) {
    for (const k of R.CATS) if ((by[k] || []).length >= 2) return by[k].slice(0, 2);
    for (const k of R.CATS) { const c = catSet(by, k, 2); if (c) return c; }
    return (by[R.WILD] || []).length >= 2 ? by[R.WILD].slice(0, 2) : null;
  }
  function bottomInfo(v) {
    const b = v.known.find((x) => x.pos === v.deckSize - 1);
    if (b) return { known: true, boom: K[b.id] === R.BOOM };
    return { known: false, boom: false };
  }
  // 摸到炸弹猫能不能活：有逗猫棒；或百变「九命」这条命还没用；或百变「双猫急救」手里有一对猫
  const saveOk = (v) => has(v, R.DEFUSE) || (v.flux === 'nine' && !!v.nineUsed && !v.nineUsed[v.me]) || (v.flux === 'catsave' && !!R.catPairIds(v.hand));
  const bottomOk = (v) => has(v, R.BOTTOM) && v.deckSize > 1 && !bottomInfo(v).boom;



  /* ───── 普通（一套参数一个实例） ───── */
  function makeNormal(P) {
    const VALUE = { defuse: 100, nope: P.vNope, tattack: P.vTattack, attack: P.vAttack, swap: P.vSwap, skip: P.vSkip, reverse: P.vReverse != null ? P.vReverse : P.vSkip, bottom: P.vBottom, alter: P.vAlter, future: P.vFuture, shuffle: P.vShuffle, favor: P.vFavor, flux: P.vFlux != null ? P.vFlux : 18 };
    const skipIdP = (v) => { if (!P.revFirst) return skipId(v); const a = one(v, R.REVERSE); return a != null ? a : one(v, R.SKIP); };   // 先用跳过还是转向（调参项）
    function cardValueV(v, id) {   // 百变「静默」时作废不能打：按 fMuteNopeV 估（其余同 cardValue）
      if (P.fx && P.fMuteNopeV != null && v.flux === 'mute' && K[id] === R.NOPE) return P.fMuteNopeV;
      if (anyCat(v) && R.catLike(K[id])) return v.hand.filter((x) => R.catLike(K[x])).length >= 2 ? P.vCatPair : P.vCatSingle;   // 百变「百搭」/ 百搭猫：杂猫也成对
      return cardValue(v.hand, id);
    }
    function cardValue(hand, id) {
      const k = K[id];
      if (VALUE[k] != null) return VALUE[k];
      if (k === R.WILD) return P.vWild != null ? P.vWild : P.vCatPair;   // 万能猫跟哪只猫都能凑对
      return R.countKind(hand, k) + R.countKind(hand, R.WILD) >= 2 ? P.vCatPair : P.vCatSingle; // 猫：成对才有用
    }

    /* 牌堆前 m 个位置各是炸弹猫的概率 */
    function kittenBelief(v, m) {
      const size = v.deckSize, out = new Array(Math.min(m, size)).fill(0);
      const knownAt = new Map(v.known.map((x) => [x.pos, x.id]));
      const knownBooms = v.known.filter((x) => K[x.id] === R.BOOM).length;
      const unk = Math.max(0, v.kittens - knownBooms);
      const slots = size - v.known.length;
      // 公开历史：别人最近塞回去的那只（我不知道位置）。先验：最上面 histTop，第 1..3 位分一半剩下的，其余位置均分另一半；
      // 塞完后从顶上摸走 top 张、从底下摸走 bot 张都没炸 → 它不在那些位置
      let hist = null;
      if (P.histW > 0 && v.ins && v.ins.by !== v.me && unk > 0) {
        const d = v.ins.top || 0, db = v.ins.bot || 0;
        if (d + db <= v.ins.size) {
          const S = v.ins.size, w = new Array(S).fill(0);
          const rest = Math.max(0, S - 4);
          for (let p = 0; p < S; p++) {
            if (p === 0) w[p] = P.histTop;
            else if (p <= 3) w[p] = (1 - P.histTop) * 0.5 / Math.min(3, S - 1);
            else w[p] = (1 - P.histTop) * 0.5 / rest;
          }
          // 规则「看得出大概位置」：公开的粗略高度 vis（0 最上 / 1 最底 / 中间取到 1/8）把可能的位置圈出来（权重 visW 是调出来的）
          if (P.visW > 0 && v.ins.vis != null) {
            const last = S - 1, visOf = (p) => (p <= 0 ? 0 : p >= last ? 1 : Math.min(7 / 8, Math.max(1 / 8, Math.round((p / last) * 8) / 8)));
            let n1 = 0; for (let p = 0; p < S; p++) if (visOf(p) === v.ins.vis) n1++;
            if (n1) for (let p = 0; p < S; p++) w[p] = (1 - P.visW) * w[p] + P.visW * (visOf(p) === v.ins.vis ? 1 / n1 : 0);
          }
          let tot = 0;
          const cur = new Array(size).fill(0);
          for (let p = d; p < S - db; p++) { const q = p - d; if (q < size && !knownAt.has(q)) { cur[q] = w[p]; tot += w[p]; } }
          if (tot > 0) { for (let q = 0; q < size; q++) cur[q] /= tot; hist = cur; }
        }
      }
      for (let i = 0; i < out.length; i++) {
        if (knownAt.has(i)) { out[i] = K[knownAt.get(i)] === R.BOOM ? 1 : 0; continue; }
        if (hist) {
          const uniRest = slots > 1 ? (unk - 1) / (slots - 1) : 0;
          const ph = P.histW * hist[i] + (1 - P.histW) * (slots > 0 ? 1 / slots : 0);
          out[i] = Math.min(1, ph + (1 - ph) * uniRest);
        } else out[i] = slots > 0 ? unk / slots : 1;
      }
      // 看别人的动作猜（2026-11-14 用户）：窥探后接着躲 → 顶上多半是炸弹猫；改命后接着躲 → 同上；改命后自己摸了 → 他多半把炸弹猫排在第二张留给下家
      const pk = v.peek;
      if (pk && pk.by !== v.me && pk.act) {
        const sig = pk.act === 'dodge' ? { o: 0, w: pk.kind === 'future' ? (P.sigFutDodge || 0) : (P.sigAltDodge || 0) } : pk.kind === 'alter' ? { o: 1, w: P.sigAltDraw || 0 } : null;
        if (sig && sig.w > 0) { const i2 = sig.o - pk.top; if (i2 >= 0 && i2 < out.length && !knownAt.has(i2)) out[i2] = out[i2] + sig.w * (1 - out[i2]); }
      }
      return out;
    }
    function topInfo(v) {
      const top = v.known.find((x) => x.pos === 0);
      if (top) return { known: true, boom: K[top.id] === R.BOOM, p: K[top.id] === R.BOOM ? 1 : 0 };
      if (v.deckSize <= 0) return { known: false, boom: false, p: 1 };
      const b = kittenBelief(v, 1);
      return { known: false, boom: false, p: b.length ? b[0] : 1 };
    }

    /* 交换：逗猫棒默认不跟着换，所以只比「能换走的牌」——换过来的不知道的牌按 swapUnk 估值，至少多出 swapMargin 才换。
     * 规则 swapDefuse 开着时逗猫棒也换：我的逗猫棒算进「换走的」（按满分 30 计，舍不得），对方的牌全算未知 */
    function swapMove(v) {
      if (!has(v, R.SWAP)) return null;
      if (P.swapPhase != null && v.deckSize > P.swapPhase * deck0(v)) return null;   // 牌堆还剩很多时先不换（早换没意义，牌还会变）
      const sid = one(v, R.SWAP);
      const all = !!(v.rules && v.rules.swapDefuse);
      const mine = v.hand.filter((id) => id !== sid && (all || K[id] !== R.DEFUSE));
      const myVal = mine.reduce((a, id) => a + Math.min(30, cardValue(v.hand, id)), 0);
      let best = -1, bestGain = -Infinity;
      for (let t = 0; t < v.n; t++) {
        if (t === v.me || isMateV(v, t) || !v.alive[t]) continue;   // 组队：不和队友换
        const knownDef = all ? 0 : v.handKnown[t].filter((id) => K[id] === R.DEFUSE).length;
        const theirs = Math.max(0, v.counts[t] - knownDef);
        let gain = theirs * P.swapUnk - myVal;
        if (P.swapKnown) { const kn = v.handKnown[t].filter((id) => all || K[id] !== R.DEFUSE); gain = kn.reduce((a, id) => a + Math.min(30, cardValue(v.hand, id)), 0) + Math.max(0, theirs - kn.length) * P.swapUnk - myVal; }
        if (gain > bestGain) { bestGain = gain; best = t; }
      }
      return best >= 0 && bestGain >= P.swapMargin ? playMove([sid], best) : null;
    }
    // 甩锅（普通或指定）：有普通的先用普通，留着指定的
    function attackMove(v) {
      if (mateNext(v)) { if (has(v, R.TATTACK)) { const t = victim(v); if (t >= 0) return playMove([one(v, R.TATTACK)], t); } return null; }   // 普通甩锅会甩给队友：只用指定甩锅甩给对手
      if (has(v, R.ATTACK)) return playMove([one(v, R.ATTACK)]);
      if (has(v, R.TATTACK)) { const t = victim(v); if (t >= 0) return playMove([one(v, R.TATTACK)], t); }
      return null;
    }

    /* 自由甩锅甩给自己发育（2026-11-26 用户）：只在稳赚时用——这回合只摸一张、顶上两张都看过不是炸弹猫，
     * 而且第二张值得（逗猫棒 / 作废 / 自由甩锅这类比这张自由甩锅还值钱的牌）。角色奶牛猫被甩锅只摸一张，甩自己白搭 */
    function selfFeed(v) {
      if (!has(v, R.TATTACK) || v.turnsLeft !== 1 || v.deckSize < 3 || v.flux === 'hot' || v.flux === 'bottom') return null;
      if (v.roles && v.roles[v.me] === 'cow') return null;
      const k0 = v.known.find((x) => x.pos === 0), k1 = v.known.find((x) => x.pos === 1);
      if (!k0 || !k1 || K[k0.id] === R.BOOM || K[k1.id] === R.BOOM) return null;
      const tid = one(v, R.TATTACK);
      if (cardValueV(v, k1.id) < cardValueV(v, tid)) return null;
      return playMove([tid], v.me);
    }
    function stealMove(v, by, ts, desperate) {
      if (!ts.length) return null;
      const t = richest(v, R.DEFUSE);
      for (const k of Object.keys(by)) {
        if (k === R.DEFUSE || k === R.NOPE) continue;
        if (by[k].length >= 3 && (desperate || R.catLike(k) || VALUE[k] <= 15)) return playMove(by[k].slice(0, 3), t, R.DEFUSE);
      }
      for (const k of R.CATS) { const c = catSet(by, k, 3); if (c) return playMove(c, t, R.DEFUSE); }   // 拿万能猫凑三张
      if (anyCat(v)) { const cs = v.hand.filter((id) => R.catLike(K[id])); if (cs.length >= 3) return playMove(cs.slice(0, 3), t, R.DEFUSE); }   // 角色猫「三花」：任意三只猫点名要逗猫棒
      if (desperate || v.discard.some((id) => K[id] === R.DEFUSE)) {
        const five = fiveCats(v);
        if (five && v.discard.some((id) => K[id] === R.DEFUSE)) return playMove(five);
      }
      let pr = catPair(by);
      if (!pr && anyCat(v)) { const cs = v.hand.filter((id) => R.catLike(K[id])); if (cs.length >= 2) pr = cs.slice(0, 2); }   // 角色猫「三花」：任意两只猫
      const pt = pairTarget(v, t);   // 两张偷牌指不到影子猫：换个能指的人，没有就不出对子
      if (pr && pt >= 0) return playMove(pr, pt);
      if (has(v, R.FAVOR)) return playMove([one(v, R.FAVOR)], t);
      if (desperate && pt >= 0) for (const k of Object.keys(by)) if (k !== R.DEFUSE && by[k].length >= 2) return playMove(by[k].slice(0, 2), pt);
      return null;
    }

    /* 百变「摸底」生效时：结束回合摸的是最底下那张——危险看底牌；窥探 / 改命 / 抽底都管不到底下，只剩躲、洗、换规则 */
    function actBottom(v) {
      const b = bottomInfo(v), def = saveOk(v), by = pairsOf(v), ts = targets(v);
      const flux = one(v, R.FLUX);
      // 「摸底」时抽底变「抽顶」（从最上面摸）：底下是炸弹猫、或者顶上明显比底下安全，就用它
      if (has(v, R.BOTTOM) && v.deckSize > 1) {
        const top = topInfo(v), botP = b.known ? (b.boom ? 1 : 0) : (() => { const bl = kittenBelief(v, v.deckSize); return bl.length ? bl[bl.length - 1] : 0; })();
        if (!(top.known && top.boom) && (top.known ? 0 : top.p) + (P.fx ? P.fBotMargin : 0.08) < botP) return playMove([one(v, R.BOTTOM)]);
      }
      if (b.known && b.boom) {
        const am = attackMove(v); if (am) return am;
        if (skipIdP(v) != null) return playMove([skipIdP(v)]);
        if (has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
        if (flux != null) return playMove([flux]);   // 换条规则碰碰运气（出百变不结束回合）
        if (def) return DRAW;
        const steal = stealMove(v, by, ts, true); if (steal) return steal;
        return DRAW;
      }
      if (b.known) return DRAW;
      if (!def) { const steal = stealMove(v, by, ts, false); if (steal) return steal; }
      const bel = kittenBelief(v, v.deckSize), risk = bel.length ? bel[bel.length - 1] : 0;
      const dodgeAt = def ? P.dodgeDef : P.dodgeNo;
      if (risk >= dodgeAt) { const am = attackMove(v); if (am) return am; if (skipIdP(v) != null) return playMove([skipIdP(v)]); }
      if (risk >= P.shuffleAt && has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
      const sw = swapMove(v); if (sw) return sw;
      if (def && has(v, R.FAVOR) && ts.length) return playMove([one(v, R.FAVOR)], richest(v, R.DEFUSE));
      for (const k of R.CATS) if ((by[k] || []).length >= 2 && ts.length) { const pt = pairTarget(v, richest(v, R.DEFUSE)); if (pt >= 0) return playMove(by[k].slice(0, 2), pt); }
      return DRAW;
    }
    /* 百变（P.fx）：这条规则对我多不利 → 要不要先打一张百变换掉（打百变不结束回合） */
    function fluxWant(v) {
      const nF = R.countKind(v.hand, R.FLUX);
      if (!nF) return false;
      const keep = P['fK_' + (v.flux || 'none')] || 0;
      let sc = -keep + P.fCount * (nF - 1);
      if (v.flux === 'mute' && has(v, R.NOPE)) sc += P.fMuteNope;
      if (v.flux === 'hot' && v.turnsLeft >= 2) sc += P.fHot;
      if ((v.flux === 'nine' || v.flux === 'catsave') && !has(v, R.DEFUSE) && saveOk(v)) sc -= P.fSave;
      if (P.fRisk) { const tp = topInfo(v); sc += P.fRisk * (tp.known ? (tp.boom ? 1 : 0) : tp.p); }
      return sc > P.fPlayAt;
    }
    function act(v) {
      if (P.fx && v.flux !== 'bottom' && fluxWant(v)) return playMove([one(v, R.FLUX)]);
      if (P.fx && P.fBotFlux && v.flux === 'bottom' && fluxWant(v)) return playMove([one(v, R.FLUX)]);   // 摸底时原来不主动换（fBotFlux 打开才按上面的算）
      if (v.flux === 'bottom') return actBottom(v);
      // 百变：「静音」时手里的作废全成了废牌 → 先打百变把规则换掉；手里攒了两张以上百变也先打一张
      const fx = one(v, R.FLUX);
      if (!P.fx && fx != null && ((v.flux === 'mute' && has(v, R.NOPE)) || R.countKind(v.hand, R.FLUX) >= 2)) return playMove([fx]);
      const top = topInfo(v);
      const def = saveOk(v);
      const by = pairsOf(v);
      const ts = targets(v);

      if (top.known && top.boom) {
        const am = attackMove(v);
        if (am) return am;
        if (mateNext(v)) {   // 组队、下家是队友：跳过会把炸弹猫留给他——转向（掉头后下家是对手）/ 抽底 / 改命 / 洗牌都比跳过好
          if (has(v, R.REVERSE)) return playMove([one(v, R.REVERSE)]);
          if (bottomOk(v)) return playMove([one(v, R.BOTTOM)]);
          if (has(v, R.ALTER) && v.deckSize > 1) return playMove([one(v, R.ALTER)]);
          if (has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
          if (def) return DRAW;
        }
        if (skipIdP(v) != null) return playMove([skipIdP(v)]);
        if (bottomOk(v)) return playMove([one(v, R.BOTTOM)]);   // 顶上是炸弹猫：从底下摸
        if (has(v, R.ALTER) && v.deckSize > 1) return playMove([one(v, R.ALTER)]);   // 把顶上的炸弹猫往下塞
        if (has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
        if (fx != null) return playMove([fx]);   // 百变：没别的办法时换条规则碰碰运气（可能抽到「摸底」）
        if (def) return DRAW;
        const steal = stealMove(v, by, ts, true);
        if (steal) return steal;
        return DRAW;
      }
      if (top.known && P.fx && P.fAhead && v.turnsLeft >= 2 && v.deckSize > 1) {
        // 百变（透视 / 火眼常见）：顶上安全但这回合还要摸第二张——第二张危险就先把锅甩出去
        const b2 = kittenBelief(v, 2);
        if (b2.length > 1 && b2[1] >= (saveOk(v) ? P.dodgeDef : P.dodgeNo)) { const am = attackMove(v); if (am) return am; }
      }
      if (top.known) { const sm = selfFeed(v); return sm || DRAW; } // 顶上是安全牌，放心摸（顶上两张都知道是好牌：自由甩锅甩给自己多摸一张）

      // 没逗猫棒：先想办法弄一张
      if (!def) {
        const steal = stealMove(v, by, ts, false);
        if (steal) return steal;
      }
      const risk = top.p;
      const lookAt = def ? P.lookDef : P.lookNo;
      const dodgeAt = def ? P.dodgeDef : P.dodgeNo;
      if (risk >= lookAt && has(v, R.FUTURE) && v.deckSize > 1) return playMove([one(v, R.FUTURE)]);
      if (risk >= lookAt && has(v, R.ALTER) && v.deckSize > 1) return playMove([one(v, R.ALTER)]);
      if (P.lookMulti != null && v.turnsLeft >= 2 && v.deckSize > 1 && (has(v, R.FUTURE) || has(v, R.ALTER))) {
        // 要连着摸好几张：按「接下来这几张里有炸弹猫」的概率决定先看一眼 / 改命，看完按已知的安全牌连着摸
        const mK = Math.min(v.turnsLeft, 3, v.deckSize), kn = new Set(v.known.map((x) => x.pos));
        let allKnown = true; for (let i = 0; i < mK; i++) if (!kn.has(i)) allKnown = false;
        if (!allKnown) {
        const b = kittenBelief(v, mK); const riskK = 1 - b.reduce((a, p) => a * (1 - p), 1);
        if (riskK >= P.lookMulti) return playMove([one(v, has(v, R.FUTURE) ? R.FUTURE : R.ALTER)]);
        }
      }
      const mAtk = P.fx && P.fHotMulti != null && v.flux === 'hot' && v.turnsLeft === 2 ? P.fHotMulti : P.multiAtk;
      if (v.turnsLeft >= 2 && risk >= mAtk) { const am = attackMove(v); if (am) return am; }
      if (risk >= dodgeAt) {
        const am = attackMove(v);
        if (am) return am;
        if (skipIdP(v) != null) return playMove([skipIdP(v)]);
        if (bottomOk(v) && (bottomInfo(v).known || !def || P.bottomDef)) return playMove([one(v, R.BOTTOM)]);
      }
      if (risk >= P.shuffleAt && has(v, R.SHUFFLE)) return playMove([one(v, R.SHUFFLE)]);
      const sw = swapMove(v);
      if (sw) return sw;
      // 闲着的索要 / 成对的猫：拿去偷一张
      if (def && has(v, R.FAVOR) && ts.length) { const ft = favorTarget(v); if (ft >= 0) return playMove([one(v, R.FAVOR)], ft); }
      for (const k of R.CATS) if ((by[k] || []).length >= 2 && ts.length) { const pt = favorTarget(v, true); if (pt >= 0) return playMove(by[k].slice(0, 2), pt); }
      return DRAW;
    }

    /* 作废：pending 当前生效（nopes 偶数）且冲我来 → 作废它；我出的牌被作废了且这张很要紧 → 再顶回去 */
    function againstMe(v) {
      const p = v.pending;
      if (!p) return false;
      // 组队：冲着队友来的也挡（甩锅给他 / 指定他 / 偷他）；队友自己出的不挡
      if (teamV(v) && !isMateV(v, p.by) && p.by !== v.me) {
        if (p.type === R.ATTACK && isMateV(v, nextAliveV(v, p.by))) return true;
        if ((p.type === R.TATTACK || p.type === R.FAVOR || p.type === 'pair' || p.type === 'triple') && isMateV(v, p.target) && v.alive[p.target]) return true;
      }
      if (p.by === v.me || isMateV(v, p.by)) return false;   // 我自己出的（自由甩锅甩给自己发育）不挡
      if (p.type === R.ATTACK) return nextAliveV(v, p.by) === v.me;
      if (p.type === R.TATTACK) return p.target === v.me;
      if (p.type === R.SWAP) return p.target === v.me && v.hand.filter((id) => K[id] !== R.DEFUSE).length >= Math.max(0, v.counts[p.by] - 1);   // 他那手比我还少才挡
      if (p.type === R.FAVOR || p.type === 'pair' || p.type === 'triple') return p.target === v.me;
      return false;
    }
    function react(v, rng, tier) {
      const p = v.pending;
      if (!p || !has(v, R.NOPE)) return false;
      const live = p.nopes % 2 === 0;
      if (live && againstMe(v)) {
        if (p.type === 'triple' && p.named !== R.DEFUSE && R.countKind(v.hand, p.named) === 0) return false; // 他要的我本来就没有
        if (p.type === R.FAVOR && v.counts[v.me] <= 1 && !has(v, R.DEFUSE)) return false;
        return tier === 'easy' ? rng() < 0.4 : true;
      }
      if (!live && p.by === v.me && tier !== 'easy' && !(p.type === R.TATTACK && p.target === v.me)) {   // 甩给自己发育的被作废了：不用再顶回去
        const top = topInfo(v);
        if ((p.type === R.ATTACK || p.type === R.TATTACK || p.type === R.SKIP || p.type === R.REVERSE || p.type === R.BOTTOM || p.type === R.SHUFFLE) && (top.boom || top.p >= P.nopeBackP)) return true;
        if ((p.type === 'pair' || p.type === 'triple' || p.type === R.FAVOR || p.type === 'five') && !has(v, R.DEFUSE)) return true;
      }
      return false;
    }

    function give(v, tier, rng) {
      const hand = v.hand;
      // 组队：是队友找我要（等于传牌）——挑最有用的给他；逗猫棒只在我有两根以上时才给（最后一根自己留着保命）
      if (v.give && isMateV(v, v.give.to)) {
        const nDef = hand.filter((id) => K[id] === R.DEFUSE).length;
        const pool = hand.filter((id) => K[id] !== R.DEFUSE || nDef >= 2);
        const src = pool.length ? pool : hand;
        if (nDef >= 2) return src.find((id) => K[id] === R.DEFUSE);
        return src.slice().sort((a, b) => (P.fx || anyCat(v) ? cardValueV(v, b) - cardValueV(v, a) : cardValue(hand, b) - cardValue(hand, a)))[0];
      }
      if (tier === 'easy') { const non = hand.filter((id) => K[id] !== R.DEFUSE); return pickRand(non.length ? non : hand, rng); }
      if (P.fx || anyCat(v)) return hand.slice().sort((a, b) => cardValueV(v, a) - cardValueV(v, b))[0];
      return hand.slice().sort((a, b) => cardValue(hand, a) - cardValue(hand, b))[0];
    }
    function pick(v, tier, rng) {
      const cands = v.discard.filter((id) => K[id] !== R.BOOM);
      if (tier === 'easy') return pickRand(cands, rng);
      const hand = v.hand;
      if (P.fx || anyCat(v)) return cands.slice().sort((a, b) => cardValueV(v, b) - cardValueV(v, a))[0];
      return cands.slice().sort((a, b) => cardValue(hand, b) - cardValue(hand, a))[0];
    }
    /* 改命：顶上有炸弹猫——这回合躲得掉（甩锅 / 跳过 / 抽底）就把它放最上面留给下一个人；
     * 躲不掉就先放够我这几回合要摸的安全牌，炸弹猫紧跟在后面留给下家 */
    function alter(v, tier, rng) {
      const cards = (v.alter && v.alter.cards) || [];
      if (tier === 'easy') return R.shuffleIn({ rs: (rng() * 4294967296) >>> 0 }, cards.slice());
      const booms = cards.filter((id) => K[id] === R.BOOM), safe = cards.filter((id) => K[id] !== R.BOOM);
      if (!booms.length) return cards.slice();
      const canDodge = has(v, R.ATTACK) || has(v, R.TATTACK) || has(v, R.SKIP) || has(v, R.REVERSE) || has(v, R.BOTTOM);
      const mn = mateNext(v) ? 1 : 0;   // 组队、下家是队友：多垫一张安全牌给他，炸弹猫留给后面的对手
      if (canDodge) return safe.slice(0, mn).concat(booms, safe.slice(mn));
      const k = Math.min(v.turnsLeft + mn, safe.length);
      return safe.slice(0, k).concat(booms, safe.slice(k));
    }
    function insert(v, tier, rng) {
      if (P.fx && P.fBotMirror && v.flux === 'bottom') return v.deckSize - insert0(v, tier, rng);   // 摸底：从底下摸，位置顶底对调
      if (P.fx && P.fExP > 0 && v.flux === 'exact' && v.turnsLeft <= 1 && rng() < P.fExP) return Math.min(v.deckSize, Math.round(P.fExDepth));
      return insert0(v, tier, rng);
    }
    function insert0(v, tier, rng) {
      const size = v.deckSize; // 塞之前牌堆的张数：pos 0..size
      if (tier === 'easy') return (rng() * (size + 1)) | 0;
      // （试过组队下家是队友时往下挪一张：4000 局反而少赢 6%，不挪）
      if (v.turnsLeft > 1 && P.insSmart) return Math.min(size, (v.turnsLeft - 1) + Math.round(P.insOffset || 0));   // 自己还要摸几张：塞在我这几张之后（正好留给后面的人）
      if (v.turnsLeft > 1) return Math.min(size, 2 + ((rng() * Math.max(1, size - 1)) | 0)); // 自己还要摸，别塞顶上
      if (rng() < P.insTop) return 0;
      return Math.min(size, 1 + ((rng() * P.insSpread) | 0));
    }
    return { P, cardValue, kittenBelief, topInfo, act, react, give, pick, alter, insert };
  }
  const NB = makeNormal(P_BASE), NH = makeNormal(P_HIST), NO = makeNormal(P_OLD);
  const NF = makeNormal(Object.assign({}, P_HIST, FX_N)), NFE = makeNormal(Object.assign({}, P_OLD, FX_E));   // 百变模式专用
  const pol = (v) => (isFlux(v) ? NF : v.ins !== undefined ? NH : NB);   // 规则公开塞猫历史就用对应那套
  const polT = (v, tier) => (tier === 'easy' ? (isFlux(v) ? NFE : NO) : pol(v));   // 入门 = 原来的普通

  /* ───── PIMC（高手） ───── */
  const BUDGET = (FXO && FXO.budget) || 900, MIN_S = 16, MAX_S = 80, INSERT_S = 40, ANCHOR = 0.05;   // 2026-11-14 重训：门槛 0.2 → 0.05（底子换成新普通后，敢改主意反而更强）
  const ALL_IDS = Array.from({ length: R.DECK_SIZE }, (_, i) => i);

  /* 按 v 补全一个完整局面（别人手牌 + 牌堆未知位置随机；别人刚塞回的炸弹猫按信念放），phase 取 v 当前的 */
  function determinize(v, seed) {
    const N = pol(v);
    const st = { rs: (seed >>> 0) || 1 };
    const used = new Set(v.hand.concat(v.discard, v.removed));
    if (v.defuse && v.defuse.card != null) used.add(v.defuse.card);
    for (const x of v.known) used.add(x.id);
    v.handKnown.forEach((ids) => ids.forEach((id) => used.add(id)));
    if (v.alter && v.alter.cards) v.alter.cards.forEach((id) => used.add(id));
    const pool = ALL_IDS.filter((id) => !used.has(id));
    const kits = pool.filter((id) => K[id] === R.BOOM);
    const others = R.shuffleIn(st, pool.filter((id) => K[id] !== R.BOOM));
    const hands = [];
    for (let s = 0; s < v.n; s++) {
      if (s === v.me) { hands.push(v.hand.slice()); continue; }
      const h = v.handKnown[s].slice();
      while (h.length < v.counts[s]) h.push(others.pop());
      hands.push(R.sortHand(h));
    }
    const slots = v.deckSize;
    const deck = new Array(slots).fill(-1);
    for (const x of v.known) deck[x.pos] = x.id;
    if (v.alter && v.alter.cards) v.alter.cards.forEach((id, i) => { deck[i] = id; });
    const kitList = kits.slice();
    if (N.P.histW > 0 && v.ins && v.ins.by !== v.me && kitList.length) {
      const b = N.kittenBelief(v, slots);
      const uni = kitList.length / Math.max(1, slots - v.known.length);
      const excess = b.map((p, i) => (deck[i] < 0 ? Math.max(0, p - uni) : 0));
      const tot = excess.reduce((a, b2) => a + b2, 0);
      if (tot > 0 && R.rand(st) < Math.min(1, tot)) {
        let r = R.rand(st) * tot, pos = 0;
        for (; pos < slots; pos++) { r -= excess[pos]; if (r <= 0) break; }
        if (pos < slots && deck[pos] < 0) deck[pos] = kitList.pop();
      }
    }
    const fill = R.shuffleIn(st, others.concat(kitList));
    for (let i = 0; i < slots; i++) if (deck[i] < 0) deck[i] = fill.pop();
    const memo = [];
    for (let s = 0; s < v.n; s++) memo.push({ deck: [], hands: Array.from({ length: v.n }, () => []) });
    memo[v.me].deck = v.known.map((x) => x.id).concat(v.alter && v.alter.cards ? v.alter.cards : []);
    memo[v.me].hands = v.handKnown.map((h) => h.slice());
    const s = {
      n: v.n, rules: v.rules, rs: (seed * 2654435761) >>> 0 || 7,
      deck, discard: v.discard.slice(), removed: v.removed.slice(), hands,
      alive: v.alive.slice(), outOrder: [],
      turn: v.turn, turnsLeft: v.turnsLeft, phase: 'act',
      pending: null, give: null, pick: null, defuse: null, alter: null, steal: null,
      winner: -1, seq: 0, memo,
      // 2026-11-15：以前这里没带方向 / 百变规则 / 角色 / 组队座次——高手的假想局里转向没转、规则没生效、队友认错人（组队改成挨着坐后高手胜率从 66% 掉到 43%）
      dir: v.dir === -1 ? -1 : 1, flux: v.flux || null, fluxDeck: [], nineUsed: v.nineUsed ? v.nineUsed.slice() : null,
      roles: v.roles ? v.roles.slice() : null, roleUsed: v.roleUsed ? v.roleUsed.slice() : null, cowCut: -1, hotGiven: -1,
      teams: v.teams ? v.teams.slice() : null, rescue: null, winnerTeam: -1,
    };
    if (v.ins !== undefined) s.ins = v.ins && Object.assign({}, v.ins);
    if (v.peek !== undefined) s.peek = v.peek && Object.assign({}, v.peek);
    if (v.phase === 'defuse') { s.phase = 'defuse'; s.defuse = { by: v.me, card: v.defuse.card }; }
    if (v.phase === 'save' && v.save) { s.phase = 'save'; s.save = { by: v.save.by, card: v.save.card }; }
    if (v.phase === 'react' && v.pending) {
      s.phase = 'react';
      s.pending = { by: v.pending.by, type: v.pending.type, cards: v.pending.cards.slice(), target: v.pending.target, named: v.pending.named,
        nopes: Array.from({ length: v.pending.nopes }, () => ({ seat: -1, card: -1 })), passed: [] };
    }
    if (v.phase === 'alter') { s.phase = 'alter'; s.alter = { by: v.me, cards: v.alter.cards.slice() }; }
    if (v.phase === 'give') { s.phase = 'give'; s.give = Object.assign({}, v.give); }
    return s;
  }

  /* 让局面推进一步（模拟里所有人都按「普通」；tierOf 只为兼容旧接口保留，easy 的座位按入门） */
  function stepWith(s, tierOf, rng) {
    const tier = (seat) => (tierOf && tierOf(seat) === 'easy' ? 'easy' : 'normal');
    switch (s.phase) {
      case 'act': {
        const me = s.turn, v = R.view(s, me);
        const m = polT(v, tier(me)).act(v);
        if (m.type === 'play' && R.checkPlay(s, me, m.cards, m)) R.play(s, me, m.cards, m); else R.draw(s, me);
        return;
      }
      case 'react': {
        for (const t of R.awaitingReaction(s)) {
          if (R.canNope(s, t)) { const v = R.view(s, t); if (polT(v, tier(t)).react(v, rng, 'normal')) { R.nope(s, t); return; } }
          R.pass(s, t);
        }
        R.closeReaction(s);
        return;
      }
      case 'give': { const f = s.give.from, v = R.view(s, f); R.give(s, f, polT(v, tier(f)).give(v, 'normal', rng)); return; }
      case 'pick': { const b = s.pick.by, v = R.view(s, b); R.pickDiscard(s, b, polT(v, tier(b)).pick(v, 'normal', rng)); return; }
      case 'defuse': { const b = s.defuse.by, v = R.view(s, b); R.insertKitten(s, b, polT(v, tier(b)).insert(v, 'normal', rng)); return; }
      case 'save': R.catSave(s, s.save.by); return;   // 急救：自动挑最便宜的一对
      case 'alter': { const b = s.alter.by, v = R.view(s, b); R.alterTop(s, b, polT(v, tier(b)).alter(v, 'normal', rng)); return; }
      case 'steal': { const b = s.steal.by; R.stealPick(s, b, (rng() * s.steal.perm.length) | 0); return; }
      case 'rescue': { const w = R.rescueWaiting(s); if (w.length) R.rescue(s, w[0], true); else R.closeRescue(s); return; }   // 组队：有逗猫棒的队友总是救（离得近的先）
    }
  }
  // 名次分：赢 1，第 i 个出局 i/(n-1)（算上模拟开始前已经出局的人）
  function scoreOf(s, me, deadBefore) {
    // 组队：看哪队赢；同样是赢 / 输再分细一点（赢时我方还剩几个、输时拉下了几个对手），分数没那么吵
    if (R.isTeam && R.isTeam(s)) {
      if (s.phase !== 'over') return s.alive[me] ? 0.6 : 0.4;
      const my = R.teamOf(s, me);
      let mine = 0, theirs = 0;
      for (let k = 0; k < s.n; k++) if (s.alive[k]) { if (R.teamOf(s, k) === my) mine++; } else if (R.teamOf(s, k) !== my) theirs++;
      return my === s.winnerTeam ? 0.8 + 0.1 * mine : 0.15 * theirs;
    }
    if (s.winner === me) return 1;
    const i = s.outOrder.indexOf(me);
    if (i < 0) return 0.5;
    return (i + deadBefore) / (s.n - 1);
  }

  /* 每个候选都在同一批假想局面里、用同一串随机数打到底（复式比较），返回名次分合计 */
  function evaluate(v, applyFn, cands, samples, rng) {
    const scores = cands.map(() => 0);
    const deadBefore = v.alive.filter((a) => !a).length;
    for (let i = 0; i < samples; i++) {
      const seed = (rng() * 4294967296) >>> 0;
      const base = determinize(v, seed);
      cands.forEach((c, ci) => {
        const s = R.cloneGame(base);
        if (base.ins !== undefined) s.ins = base.ins && Object.assign({}, base.ins);
        s.rs = (seed ^ 0x9e3779b9) >>> 0;
        const rr = () => R.rand(s);
        try { applyFn(s, c, rr); } catch (e) { scores[ci] += -1; return; }
        let guard = 0;
        const team = R.isTeam && R.isTeam(s);   // 组队：我出局了队伍还没输，接着打到分出胜负
        while (s.phase !== 'over' && (team || s.alive[v.me]) && guard++ < 3000) stepWith(s, null, rr);
        scores[ci] += (s.phase === 'over' || !s.alive[v.me]) ? scoreOf(s, v.me, deadBefore) : 0.5;
      });
    }
    return scores;
  }
  const argmax = (a) => { let bi = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[bi] + 1e-9) bi = i; return bi; };

  function actCandidates(v) {
    const out = [DRAW], by = pairsOf(v), ts = targets(v);
    const ps = v.roles ? ts.filter((t) => v.roles[t] !== 'shadow') : ts;   // 角色猫「影子猫」：两张偷牌指不到它（三张点名照常）
    for (const k of R.ACTIONS) {
      const id = one(v, k);
      if (id == null) continue;
      if (k === R.FAVOR) { for (const t of ts) out.push(playMove([id], t)); }
      else if (k === R.TATTACK || k === R.SWAP) { for (let t = 0; t < v.n; t++) if (t !== v.me && v.alive[t]) out.push(playMove([id], t)); }
      else if (k !== R.FUTURE && k !== R.ALTER) out.push(playMove([id])); // 窥探 / 改命照普通的时机出
    }
    for (const k of Object.keys(by)) {
      if (k === R.DEFUSE) continue;
      if (by[k].length >= 2 && (R.catLike(k) || by[k].length >= 3)) for (const t of ps) out.push(playMove(by[k].slice(0, 2), t));
      if (by[k].length >= 3) for (const t of ts) out.push(playMove(by[k].slice(0, 3), t, R.DEFUSE));
    }
    if (by[R.WILD]) for (const k of R.CATS) {   // 真猫 + 万能猫凑的对子 / 三张（纯的上面已经有了）
      const real = (by[k] || []).length;
      const c2 = real < 2 && catSet(by, k, 2), c3 = real < 3 && catSet(by, k, 3);
      if (c2) for (const t of ps) out.push(playMove(c2, t));
      if (c3) for (const t of ts) out.push(playMove(c3, t, R.DEFUSE));
    }
    if (anyCat(v)) {   // 角色猫「百搭猫」/ 百变「百搭」：不同的猫也能凑对 / 凑三张——拿凑不成对的单张猫来凑
      const singles = R.CATS.filter((k) => (by[k] || []).length === 1).map((k) => by[k][0]);
      for (let i = 0; i < singles.length; i++) for (let j = i + 1; j < singles.length; j++) for (const t of ps) out.push(playMove([singles[i], singles[j]], t));
      if (singles.length >= 3) for (const t of ts) out.push(playMove(singles.slice(0, 3), t, R.DEFUSE));
    }
    const five = fiveCats(v);
    if (five) out.push(playMove(five));
    return out;
  }
  const moveKey = (m) => m.type + ':' + (m.cards || []).map((id) => K[id]).sort().join(',') + ':' + (m.target == null ? '' : m.target) + ':' + (m.named || '');

  /* 组队（2026-11-15 实测，高手队 vs 普通队，每组 480–2000 局）：只有输赢、分数很吵，PIMC 怎么调（样本 ×2/×3、平滑分、名次分、复核、改门槛）
   * 都停在赢 52–57%（普通参数在组队里重新交叉熵调参也没有更好的）。所以组队里：平静的回合直接照普通走（危险 < 0.35 时多想无益），
   * 危险时才算；第一轮挑出的「最好」再用一批新假想局和普通的选择复核一遍；塞炸弹猫用普通的规则（搜索在组队里没增益）。
   * 结果：2000 局 55.3% ±2.2（和原来一样强），每步平均 47ms（原来 200ms） */
  const TEAM_CALM = 0.35, TEAM_SCREEN = 0.05, TEAM_VERIFY = 150, TEAM_ANCHOR = 0.04;
  /* ───── 经典模式的「直觉」网络（2026-11-18 夜训，~/zhamao-rl/dmc/REPORT.md；用户选甲：普通 = 网络，高手 = 网络 + 推演） ─────
   * 只在经典模式（不是百变 / 组队 / 角色猫）、且 zhamao-brain.js 在场时用；出牌这一步给每个候选打分取最高，
   * 窥探 / 改命的时机仍照原普通。特征必须和训练场 feat.js（FEAT_VER 1）逐位一致——改这里要重训。
   * 对一桌原普通：3 / 4 / 5 人胜率 45.7 / 37.9 / 31.7%（原高手 43.2 / 34.7 / 25.5）；对一桌原高手打平；每步约 0.15 ms */
  const loadBrain = (g, file) => {
    if (typeof self !== 'undefined' && self[g]) return self[g];
    if (typeof require === 'function') { try { return require(file); } catch (_) { return null; } }
    return null;
  };
  /* 2026-11-21 经典（开不开交换）都换成共用网络 S3（zhamao-brain-swap.js），高手直接用网络、不再推演；e（zhamao-brain.js）退役。
   * 站点实测 vs 原线上（e + 推演），默认规则：高手 3 / 4 / 5 人胜率 44.7 / 31.3 / 23.2%（均等 33.3 / 25 / 20），普通打平；
   * 不推演时 S3 vs e 37.2 / 27.3 / 20.5%，S3 vs p 打平。涨分主要来自去掉推演（推演会把强网络的选择拉回平均）。
   * 2026-11-22 文件里换成 S4（S3 续练一整夜，经典 / 组队加权）。站点实测 vs S3（高手，300 组）：经典默认 3 / 4 / 5 人 35.0 / 27.0 / 20.5%，
   * 经典开交换 34.6 / 26.8 / 19.3%，组队开交换 2v2 / 3v3 / 2v2v2 / 4v4 54.5 / 50.3 / 36.0 / 52.0%，百变开交换 32.3 / 26.8 / 21.8% —— 小幅但一致地赢。
   * 2026-11-23 文件里换成 S5（S4 续练一整夜，学习目标改成 TD(λ=0.7)）。站点实测 vs S4（高手，400 组）：经典默认 34.4 / 25.4 / 20.8%，
   * 经典开交换 34.8 / 25.3 / 19.5%，组队开交换 49.8 / 50.6 / 32.3 / 53.5%，百变开交换 37.2 / 26.3 / 20.9% —— 没有一项输，百变开交换涨得最多。 */
  const BRAIN = loadBrain('ZhamaoBrainSwap', './zhamao-brain-swap.js');
  /* 组队 / 百变各一个网络（2026-11-19 夜训，REPORT 第六阶段）：输入 210 = 经典 v2 的 190 + 20 维 X（组队 10 + 百变 10，见 brainX）。
   * 组队 t2.json 整队 vs 普通队 2v2 / 3v3 / 2v2v2 / 4v4 胜率 56.6 / 65.8 / 47.0 / 69.3%（原高手队 54.0 / 54.2 / 37.3 / 55.2）；
   * 百变 f.json vs 一桌普通 3 / 4 / 5 人名次分 0.656 / 0.625 / 0.604（原高手 0.567 / 0.564 / 0.539）。
   * 2026-11-20 夜训（REPORT 第八阶段）换上 t4.json / f2.json（250 维、带对手池加练）：t4 整队 vs t2 老四种队形打平，2v2v2v2 / 3v3v3 各多赢约 3 个点；f2 vs f 名次分 +~1%。
   * 角色猫 r.json（2026-11-19，250 维 = 210 + 角色 40：自己 / 下家们的角色、出牌目标的角色）：高手 vs 一桌原普通 2-6 人名次分
   * 0.785 / 0.677 / 0.640 / 0.636 / 0.641；普通（30% 网络）0.585 / 0.547 / 0.545 / 0.525 / 0.532。 */
  const X3_DIM = 210;
  const BRAIN_T = (() => { const b = loadBrain('ZhamaoBrainTeam', './zhamao-brain-team.js'); return b && (b.DIM === X3_DIM || b.DIM === 250) ? b : null; })();   // 2026-11-20 起 t4 是 250 维（角色那 40 列在组队里恒为 0）
  const BRAIN_F = (() => { const b = loadBrain('ZhamaoBrainFlux', './zhamao-brain-flux.js'); return b && (b.DIM === X3_DIM || b.DIM === 250) ? b : null; })();   // 2026-11-20 起 f2 是 250 维
  /* 组队·开了交换的局（2026-11-20 下午，REPORT 第十阶段）：t5.json = t4 加练可选规则（交换 / 交换连逗猫棒 / 塞回看不出位置 / 牌量按真人开房比例抽），
   * 输入多 3 个规则位（brainX 的 o+19 / o+57 / o+58；老网络这几列权重全 0，填了也不变）。整队 vs t4：交换+连逗猫棒 2v2 / 3v3 / 2v2v2 / 4v4 胜率
   * 53.8 / 56.4 / 39.7 / 55.4%（均等 50 / 50 / 33.3 / 50）；不开交换时 2v2v2、4v4 略输 2–3 个点 → 只在开了交换的局用它，默认规则仍用 t4。
   * 2026-11-20 傍晚换成 t5p（REPORT 10.4）：续练到 12M，且对队友甩锅 / 交换 / 塞猫扣 0.05 分（真人反馈：机器猫坑队友）。坑队友比例 2.94% → 0.88%；
   * 整队 vs t4 开交换 53.8 / 58.5 / 41.3 / 56.7%（t5 是 53.8 / 56.4 / 39.7 / 55.4%） */
  /* 百变·开了交换的局（2026-11-20 傍晚，REPORT 10.3）：f3.json = f2 加练可选规则。vs f2 开交换+连逗猫棒 3/4/5/6 人胜率 34.8 / 33.1 / 25.9 / 23.6%
   * （均等 33.3 / 25 / 20 / 16.7）；不开交换时 3、5 人略掉 ~2 个点 → 只在开了交换的百变局用它，默认规则仍用 f2。
   * 2026-11-21 组队 t5p / 百变 f3 都换成共用网络 S3（REPORT 第十三阶段）：一个 250→384→192→1 的网络练所有模式（先蒸馏各专用网络，再混合自博弈，
   * 含可选规则与坑队友扣分）。站点实测 vs 线上（开交换+连逗猫棒，高手）：组队整队 2v2 / 3v3 / 2v2v2 / 4v4 胜率 55.2 / 62.3 / 38.4 / 60.3%，
   * 百变 3 / 4 / 5 人 35.0 / 27.1 / 22.7%（均等 33.3 / 25 / 20）。默认规则 S3 与 t4 / f2 / p 打平，所以默认规则仍用专用网络。 */
  const BRAIN_SW = BRAIN && BRAIN.DIM === 250 ? BRAIN : null;
  /* 经典·开了交换的局也用 S3。站点实测 vs 线上（e，高手 = 网络当锚点 + 推演）：普通 3 / 4 / 5 人胜率 37.8 / 27.1 / 23.5%；
   * 高手若照经典走法加推演只打平（33.5 / 25.3 / 20.2%），直接用网络出反而 40.0 / 29.8 / 23.1% → 开交换的经典高手不推演，和组队 / 百变一样。
   * 同日默认规则的经典局也换成 S3（见上面 BRAIN）。 */
  const BRAIN_TS = BRAIN_SW, BRAIN_FS = BRAIN_SW;
  /* 角色猫网络（2026-11-19，REPORT 第七阶段）：输入 250 = 210 + 40 维角色（我的角色、下家 1..4 的角色、模式位、出牌目标的角色，见 brainX） */
  const X4_DIM = 250;
  const BRAIN_R = (() => { const b = loadBrain('ZhamaoBrainRoles', './zhamao-brain-roles.js'); return b && b.DIM === X4_DIM ? b : null; })();
  const ROLE_IDS = ['timid', 'fat', 'shadow', 'cow', 'calico', 'tabby'];
  const brainOf = (v) => {
    if (v.roles) return BRAIN_R;
    if (teamV(v)) return (v.rules && v.rules.swap && BRAIN_TS) || BRAIN_T;
    if (isFlux(v)) return (v.rules && v.rules.swap && BRAIN_FS) || BRAIN_F;
    return (!v.rules || !v.rules.mode || v.rules.mode === 'classic') ? BRAIN : null;
  };
  const useBrain = (v) => !!brainOf(v);
  const KI = {}; R.KINDS.forEach((k, i) => { KI[k] = i; });
  const NK = R.KINDS.length;   // 20
  function bNext(v, step) {   // 按出牌方向第 step 个活着的对手（-1 = 没那么多）
    let s = v.me, c = 0;
    for (let g = 0; g < v.n * 2; g++) { s = (s + (v.dir || 1) + v.n) % v.n; if (s === v.me) continue; if (v.alive[s]) { c++; if (c === step) return s; } }
    return -1;
  }
  function bKnown(v, seat, kind) { const h = v.handKnown && v.handKnown[seat]; if (!h) return 0; let c = 0; for (const id of h) if (K[id] === kind) c++; return c; }
  const S_DIM = 86, A_DIM = 34, V1_DIM = S_DIM + A_DIM, H_DIM = 31;
  /* v2（2026-11-18 晚，REPORT 第五阶段）：输入 190 = v1 120 + 历史 31 + 塞猫动作 10 + 作废动作 29（作废这块线上不用，留 0）。
   * 网络也管塞炸弹猫的位置（brainInsert）。对一桌 v1 网络名次分 3/4/5 人 0.563/0.529/0.510，对一桌原普通 0.654/0.634/0.628（v1 0.606/0.615/0.618） */
  const V2_DIM = V1_DIM + H_DIM + 10 + 29;   // 190
  const isV2 = (B) => !!B && B.DIM >= V2_DIM;
  const BRAIN_V2 = isV2(BRAIN);
  const FLUX_IDS = ['nine', 'peektop', 'exact', 'bottom', 'hot', 'mute', 'catsave'];
  function brainX(v, f, o) {   // v3 的 X 20 维，必须和训练场 feat.js xState 逐位一致（出牌目标是队友 o+8、塞的猫会被队友摸到 o+9 由候选填）
    const mates = matesV(v);
    if (mates.length) {
      for (let j = 1; j <= 4; j++) { const s = bNext(v, j); if (s >= 0 && mates.indexOf(s) >= 0) f[o + j - 1] = 1; }
      let am = 0, ae = 0, mh = 0; const teams = new Set();
      for (let s = 0; s < v.n; s++) { if (!v.alive[s]) continue; if (v.teams) teams.add(v.teams[s]); if (s === v.me) continue; if (mates.indexOf(s) >= 0) { am++; mh += v.counts[s]; } else ae++; }
      f[o + 4] = am / 3; f[o + 5] = ae / 6; f[o + 6] = teams.size / 4; f[o + 7] = Math.min(20, mh) / 20;
    }
    if (v.flux) { const i = FLUX_IDS.indexOf(v.flux); if (i >= 0) f[o + 10 + i] = 1; }
    if (isFlux(v)) { f[o + 17] = 1; f[o + 18] = v.nineUsed && v.nineUsed[v.me] ? 1 : 0; }
    if (v.rules) {   // 可选规则位（feat.js v4 xState，2026-11-20）：o+19 交换在局、o+57 交换连逗猫棒、o+58 塞回看不出位置
      if (v.rules.swap) f[o + 19] = 1;
      if (f.length >= X4_DIM) { if (v.rules.swap && v.rules.swapDefuse) f[o + 57] = 1; if (v.rules.insertSeen === false) f[o + 58] = 1; }
    }
    if (v.roles && f.length >= X4_DIM) {   // 角色猫（feat.js v4）：o+20 我的角色、o+26.. 下家 1..4 的角色、o+50 模式位；o+51.. 出牌目标的角色由候选填
      const r = ROLE_IDS.indexOf(v.roles[v.me]); if (r >= 0) f[o + 20 + r] = 1;
      for (let j = 1; j <= 4; j++) { const s = bNext(v, j); if (s >= 0) { const q = ROLE_IDS.indexOf(v.roles[s]); if (q >= 0) f[o + 26 + (j - 1) * 6 + q] = 1; } }
      f[o + 50] = 1;
    }
  }
  const TOTAL = {}; for (let id = 0; id < K.length; id++) TOTAL[K[id]] = (TOTAL[K[id]] || 0) + 1;   // 171 张全在局里（用不上的在盒子 removed 里）
  function bRel(v, seat) { if (seat === v.me) return 0; for (let j = 1; j <= 4; j++) if (bNext(v, j) === seat) return j; return 5; }
  function bHiddenEst(v, kind) {   // 已知的 + 没露面的按「未知位置」（别人没看清的手牌 + 牌堆未知位置）平摊
    let seen = 0;
    for (const id of v.discard) if (K[id] === kind) seen++;
    for (const id of v.removed) if (K[id] === kind) seen++;
    for (const id of v.hand) if (K[id] === kind) seen++;
    for (const x of v.known) if (K[x.id] === kind) seen++;
    let unk = Math.max(0, v.deckSize - v.known.length);
    const hk = (s) => (v.handKnown && v.handKnown[s]) || [];
    for (let s = 0; s < v.n; s++) { if (s === v.me) continue; seen += bKnown(v, s, kind); unk += Math.max(0, v.counts[s] - hk(s).length); }
    const unacc = Math.max(0, (TOTAL[kind] || 0) - seen);
    return (s) => bKnown(v, s, kind) + (unk ? unacc * Math.max(0, v.counts[s] - hk(s).length) / unk : 0);
  }
  function brainHist(v, f, o) {   // 必须和训练场 feat.js histFeat 逐位一致
    const pk = v.peek;
    if (pk) {
      f[o + bRel(v, pk.by)] = 1; o += 6;
      f[o + (pk.kind === 'alter' ? 1 : 0)] = 1; o += 2;
      f[o++] = Math.min(3, pk.top || 0) / 3;
      f[o + (pk.act === 'dodge' ? 1 : pk.act === 'draw' ? 2 : 0)] = 1; o += 3;
    } else o += 12;
    const ins = v.ins;
    if (ins) {
      f[o + bRel(v, ins.by)] = 1; o += 6;
      f[o++] = Math.min(30, ins.size || 0) / 30;
      f[o++] = Math.min(4, ins.top || 0) / 4; f[o++] = Math.min(4, ins.bot || 0) / 4;
      f[o + (ins.seen === 'top' ? 0 : 1)] = ins.seen ? 1 : 0; o += 2;
    } else o += 11;
    const dE = bHiddenEst(v, R.DEFUSE), nE = bHiddenEst(v, R.NOPE);
    for (let j = 1; j <= 4; j++) { const s = bNext(v, j); if (s >= 0) { f[o] = Math.min(2, dE(s)) / 2; f[o + 1] = Math.min(2, nE(s)) / 2; } o += 2; }
  }
  function brainState(v) {
    const B = brainOf(v);
    const f = new Float32Array(isV2(B) ? B.DIM : V1_DIM); let o = 0;
    const alive = v.alive.filter(Boolean).length;
    f[o + Math.min(5, Math.max(0, alive - 2))] = 1; o += 5;
    f[o++] = v.n / 8;
    for (const id of v.hand) f[o + KI[K[id]]] += 1 / 3; o += NK;
    f[o++] = v.hand.length / 10;
    f[o++] = v.deckSize / 30; f[o++] = (v.kittens || 0) / 4; f[o++] = v.deckSize ? Math.min(1, (v.kittens || 0) / v.deckSize) : 1;
    let kb = []; try { kb = pol(v).kittenBelief(v, 4); } catch (_) { kb = []; }
    for (let i = 0; i < 4; i++) f[o + i] = kb[i] != null ? kb[i] : 0; o += 4;
    for (let i = 0; i < 4; i++) { const k = v.known.find((x) => x.pos === i); if (k) f[o + i * 2 + (K[k.id] === R.BOOM ? 0 : 1)] = 1; } o += 8;
    { const b = v.known.find((x) => x.pos === v.deckSize - 1); if (b) f[o + (K[b.id] === R.BOOM ? 0 : 1)] = 1; } o += 2;
    f[o + Math.min(3, Math.max(0, (v.turnsLeft || 1) - 1))] = 1; o += 4;
    for (let j = 1; j <= 4; j++) {
      const s = bNext(v, j);
      if (s >= 0) { f[o] = 1; f[o + 1] = v.counts[s] / 10; f[o + 2] = bKnown(v, s, R.DEFUSE) / 2; f[o + 3] = bKnown(v, s, R.NOPE) / 2; }
      o += 4;
    }
    for (const id of v.discard) f[o + KI[K[id]]] += 1 / Math.max(1, R.COUNTS[K[id]]); o += NK;
    f[o++] = v.dir === -1 ? 1 : 0;
    f[o++] = v.flux ? 1 : 0;
    if (isV2(B)) brainHist(v, f, V1_DIM);
    if (B && B.DIM >= X3_DIM) brainX(v, f, V2_DIM);
    return f;
  }
  function brainVec(v, sf, m) {
    const f = sf.slice(); let o = S_DIM;
    if (f.length >= X3_DIM && m.target != null && isMateV(v, m.target)) f[V2_DIM + 8] = 1;
    if (f.length >= X4_DIM && m.target != null && v.roles) { const q = ROLE_IDS.indexOf(v.roles[m.target]); if (q >= 0) f[V2_DIM + 51 + q] = 1; }
    if (m.type === 'draw') f[o] = 1;
    else {
      const n = m.cards.length;
      f[o + (n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4)] = 1; o += 5;
      for (const id of m.cards) f[o + KI[K[id]]] += 1 / 3; o += NK;
      if (m.target != null) {
        let rel = -1; for (let j = 1; j <= 4; j++) if (bNext(v, j) === m.target) { rel = j - 1; break; }
        f[o + (rel < 0 ? 4 : rel)] = 1; o += 5;
        f[o++] = v.counts[m.target] / 10; f[o++] = bKnown(v, m.target, R.DEFUSE) / 2; f[o++] = bKnown(v, m.target, R.NOPE) / 2;
      } else o += 8;
      f[o++] = m.named === R.DEFUSE ? 1 : 0;
    }
    return f;
  }
  const brainScore = (v, sf, m) => brainOf(v).score(brainVec(v, sf, m));
  /* 普通只有一部分出牌步数用网络、其余照原规则（2026-11-18 用户：普通调弱到入门和高手中间）。
   * 全用网络时普通和高手一样强（练不出更强的高手：更大网络 / 接着练 / 推演里对手也用网络都只和它打平），档位拉不开 */
  const NORMAL_BRAIN_P = (FXO && FXO.brainP != null) ? FXO.brainP : 0.3;
  const isPeekMove = (m) => m.type === 'play' && m.cards.length === 1 && (K[m.cards[0]] === R.FUTURE || K[m.cards[0]] === R.ALTER);
  function brainAct(v) {
    const nm = pol(v).act(v);
    if (isPeekMove(nm)) return nm;
    const cands = actCandidates(v);
    if (!cands.some((c) => moveKey(c) === moveKey(nm))) cands.push(nm);
    if (cands.length === 1) return cands[0];
    const sf = brainState(v);
    let bi = 0, bv = -Infinity;
    for (let i = 0; i < cands.length; i++) { const q = brainScore(v, sf, cands[i]); if (q > bv) { bv = q; bi = i; } }
    return cands[bi];
  }
  // v2：塞炸弹猫的位置也让网络挑（pos = 塞之前牌堆的第几张，0 = 顶）。和训练场 feat.js insFeat / game.js netInsert 一致
  function brainInsert(v, rng) {
    const size = v.deckSize, rem = Math.max(0, (v.turnsLeft || 1) - 1);
    const cands = Array.from(new Set([0, 1, 2, 3, 4, 5, 6, rem, rem + 1, rem + 2, rem + 3, Math.floor(size / 2), size].filter((p) => p >= 0 && p <= size))).sort((a, b) => a - b);
    if (cands.length === 1) return cands[0];
    const B = brainOf(v), sf = brainState(v);
    let bi = 0, bv = -Infinity; const qs = [];
    for (let i = 0; i < cands.length; i++) {
      const q = B.score(insVec(v, sf, cands[i])); qs.push(q); if (q > bv) { bv = q; bi = i; }
    }
    /* 2026-11-25 塞猫带随机（用户：机器猫老塞第二张，被摸透了）：分数和最高分差不多的位置按 exp(分差 / INS_TEMP) 抽。
     * 研究版实测（推演老师 + 温度 0.02）对 S5 名次分 0.504，不掉分。
   * 2026-11-26 用户要去套路：温度 0.02 → 0.035，高手塞顶 42% → 34%（经典 6400 局名次分 0.494 vs 对照 0.496）；0.05 塞顶 31% 但掉 0.7 个点 */
    if (rng && INS_TEMP > 0) {
      const w = qs.map((q) => Math.exp((q - bv) / INS_TEMP)), tot = w.reduce((a, b) => a + b, 0);
      let r = rng() * tot; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return cands[i]; }
    }
    return cands[bi];
  }
  function insVec(v, sf, pos) {
    const size = v.deckSize, rem = Math.max(0, (v.turnsLeft || 1) - 1), others = v.alive.filter((a, i) => a && i !== v.me).length || 1;
    const f = sf.slice(); let o = V1_DIM + H_DIM;
    f[o++] = 1;
    f[o++] = Math.min(30, pos) / 30; f[o++] = pos === 0 ? 1 : 0; f[o++] = pos >= size ? 1 : 0;
    let who;   // 粗估会被谁摸到：我先摸 rem 张，之后活着的人按顺序各摸一张
    if (pos < rem) who = 0; else { const k = (pos - rem) % (others + 1); who = k === others ? 0 : Math.min(5, k + 1); }
    f[o + who] = 1;
    if (f.length >= X3_DIM && pos >= rem) {   // 组队：这只猫粗估会被队友摸到（同 feat.js xIns）
      const order = []; for (let j = 1; j <= 5; j++) { const s = bNext(v, j); if (s < 0) break; order.push(s); }
      const k = (pos - rem) % (others + 1);
      if (k < others && order[k] != null && isMateV(v, order[k])) f[V2_DIM + 9] = 1;
    }
    return f;
  }
  const NORMAL_INS = (FXO && FXO.brainIns) || 'all';    // 普通塞猫：p = 和出牌同一比例用网络 / all / none（实测用）
  const HARD_INS = (FXO && FXO.hardIns) || 'brain';
  const INS_TEMP = FXO && FXO.insTemp != null ? FXO.insTemp : 0.035;   // 塞猫随机的温度（0 = 永远挑最高分）
  const ALTER_S = FXO && FXO.alterS != null ? FXO.alterS : 40;   // 高手改命每种排法推演几局（0 = 照规则）   // 高手塞猫：brain = 网络 / pimc = 原来的推演（实测用）
  const FLUX_INS_MAX_N = (FXO && FXO.fluxInsN) || 5;   // 百变几人起塞猫不交给网络（实测用）
  /* 组队 / 百变高手 = 只用网络（brain），不再接推演（pimc）：站点代码实测（2026-11-19）整队 vs 原普通队 2v2 / 3v3 / 2v2v2 / 4v4
   * 只用网络 66.7 / 72.3 / 51.8 / 74.5%，网络 + 推演 63.3 / 67.9 / 52.2 / 75.4%（原高手 51.7 / 54.2 / 36.7 / 57.1）；
   * 百变 vs 一桌原普通名次分 3 / 4 / 5 人 只用网络 0.670 / 0.662 / 0.625，网络 + 推演 0.635 / 0.624 / 0.602（原高手 0.562 / 0.572 / 0.520）。
   * 不比推演差还快得多。普通 = 30% 步数用网络（同经典）：整队 vs 原普通 54.8 / 55.8 / 42.7 / 57.8%，百变 0.567 / 0.548 / 0.542，
   * 约等于原高手；新高手 vs 新普通 61.3 / 65.2 / 46.7 / 67.2%、百变 0.636 / 0.610 / 0.592，入门 < 普通 < 高手间距和经典相仿 */
  const TF_HARD = (FXO && FXO.tfHard) || 'brain';     // pimc = 网络锚点 + 推演（同经典，实测用）

  function hardAct(v, rng) {
    const N = pol(v);
    const nm = useBrain(v) ? brainAct(v) : N.act(v);   // 有网络的模式：锚点换成网络的选择
    if (TF_HARD === 'brain' && useBrain(v)) return nm;   // 有网络就直接用网络出（2026-11-21 起经典也一样）；没网络才走规则锚点 + 推演
    if (nm.type === 'play' && nm.cards.length === 1 && (K[nm.cards[0]] === R.FUTURE || K[nm.cards[0]] === R.ALTER)) return nm;
    if (teamV(v)) { const tp = N.topInfo(v); if (!(tp.known && tp.boom) && tp.p < TEAM_CALM) return nm; }
    const cands = actCandidates(v);
    if (cands.length === 1) return DRAW;
    // 总模拟次数封顶（候选多时每个少模拟几次），最坏一步也不卡住动画
    const samples = Math.max(MIN_S, Math.min(MAX_S, Math.floor(BUDGET / cands.length)));
    // 普通的选择也在候选里（找不到就补进去）；别的候选平均名次分要高出 ANCHOR 才换
    let ai = cands.findIndex((c) => moveKey(c) === moveKey(nm));
    if (ai < 0) { cands.push(nm); ai = cands.length - 1; }
    const applyAct = (s, m, rr) => {
      if (m.type === 'draw') { R.draw(s, v.me); return; }
      R.play(s, v.me, m.cards, m);
      let g = 0;
      while (s.phase === 'react' && g++ < 20) stepWith(s, null, rr); // 反应窗按普通处理
    };
    const scores = evaluate(v, applyAct, cands, samples, rng);
    const bi = argmax(scores);
    if (!teamV(v)) return scores[bi] - scores[ai] < ANCHOR * samples ? cands[ai] : cands[bi];
    if (bi === ai || scores[bi] - scores[ai] < TEAM_SCREEN * samples) return cands[ai];
    const two = evaluate(v, applyAct, [cands[ai], cands[bi]], TEAM_VERIFY, rng);   // 复核：新假想局里还赢普通的选择才换
    return two[1] - two[0] >= TEAM_ANCHOR * TEAM_VERIFY ? cands[bi] : cands[ai];
  }

  function hardInsert(v, rng) {
    const size = v.deckSize;
    const rem = Math.max(0, v.turnsLeft - 1);   // 自己还要摸的张数：塞在这之后也是候选
    const cands = Array.from(new Set([0, 1, 2, 3, rem, rem + 1, rem + 2, Math.floor(size / 2), size].filter((p) => p <= size)));
    const scores = evaluate(v, (s, pos) => R.insertKitten(s, v.me, pos), cands, INSERT_S, rng);
    return cands[argmax(scores)];
  }

  /* ───── 对外 ───── */
  function actFor(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'hard') return hardAct(v, rng);
    if (tier === 'normal' && useBrain(v) && rng() < NORMAL_BRAIN_P) return brainAct(v);   // 普通 = 一部分步数用网络（调到入门和高手正中间）
    return polT(v, tier).act(v);
  }
  // 各档内部的细节判断一律按「普通」的走法（原来入门那套随手乱出的已经不用了）
  /* 2026-11-26 高手作废别人的逃跑 / 甩锅牌（用户：机器猫从来不作废别人的跳过、洗牌这类牌）：
   * 别人（组队里是对手）出跳过 / 转向 / 抽底 / 洗牌 / 甩锅（不冲我来的）、我手里有作废时，作废和不作废在同一批假想局里各打到底，
   * 作废的平均名次分高出 ESC_ANCHOR 才作废——不写死什么时候废，由推演算。
   * 研究版实测（经典 4 人，一座位对 3 个线上高手，各 6400 局）：名次分 0.499 vs 对照 0.499，约每 11 局作废一次；门槛 0.05 时废得多但掉 0.7 个点 */
  const ESC_S = (FXO && FXO.escS != null) ? FXO.escS : 40, ESC_ANCHOR = 0.1;
  const ESC_T = new Set([R.SKIP, R.REVERSE, R.BOTTOM, R.SHUFFLE, R.ATTACK, R.TATTACK].filter(Boolean));
  function escWindow(v) {
    const p = v.pending;
    if (!p || !has(v, R.NOPE) || p.nopes % 2 !== 0 || p.by === v.me || !ESC_T.has(p.type)) return false;
    if (teamV(v) && isMateV(v, p.by)) return false;
    if (p.type === R.ATTACK && nextAliveV(v, p.by) === v.me) return false;   // 冲我来的照旧按规则挡
    if (p.type === R.TATTACK && p.target === v.me) return false;
    return true;
  }
  function hardEscNope(v, rng) {
    const ap = (s, nope, rr) => { if (nope) R.nope(s, v.me); else R.pass(s, v.me); let g = 0; while (s.phase === 'react' && g++ < 30) stepWith(s, null, rr); };
    const sc = evaluate(v, ap, [false, true], ESC_S, rng);
    return sc[1] - sc[0] > ESC_ANCHOR * ESC_S;
  }
  function reactFor(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'hard' && ESC_S > 0 && escWindow(v)) return hardEscNope(v, rng);
    return polT(v, tier).react(v, rng, 'normal');
  }
  function insertFor(v, tier, rng) {
    rng = rng || Math.random;
    if (isV2(brainOf(v)) && !(isFlux(v) && v.n >= FLUX_INS_MAX_N)) {   // 塞猫跟出牌配套交给网络（v2 出牌是和网络塞猫一起练的，配原规则塞猫反而掉分）；百变 5 人以上网络塞猫反而略差
      if (tier === 'hard' && HARD_INS === 'brain') return brainInsert(v, rng);
      if (tier === 'normal' && (NORMAL_INS === 'all' || (NORMAL_INS === 'p' && rng() < NORMAL_BRAIN_P))) return brainInsert(v, rng);
    }
    if (tier === 'hard' && !teamV(v)) return hardInsert(v, rng);   // 组队塞猫按普通的（搜索没增益，见 hardAct 上面）
    return polT(v, tier).insert(v, 'normal', rng);
  }
  function chooseGive(v, tier, rng) { return polT(v, tier).give(v, 'normal', rng || Math.random); }
  function choosePick(v, tier, rng) { return polT(v, tier).pick(v, 'normal', rng || Math.random); }
  /* 2026-11-25 高手改命用推演排（用户：猫放第一张再打跳过不理性，人会把猫放第二 / 三张、自己摸一张安全的）：
   * 顶上几张的每种排法都在同一批假想局面里打到底比名次分。研究版实测对 S5 名次分 0.504 / 开交换 0.514 / 组队胜率 50.7%，
   * 猫放顶从 47% 降到 17%，多数放第 2、3 张后自己摸 */
  function perms(a) { if (a.length <= 1) return [a.slice()]; const out = []; a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach((p) => out.push([x].concat(p)))); return out; }
  function hardAlter(v, rng) {
    const cands = perms(v.alter.cards);
    if (cands.length === 1) return cands[0];
    const scores = evaluate(v, (s, o) => R.alterTop(s, v.me, o), cands, ALTER_S, rng);
    return cands[argmax(scores)];
  }
  function chooseAlter(v, tier, rng) {
    rng = rng || Math.random;
    if (tier === 'hard' && ALTER_S > 0 && v.alter && v.alter.cards && v.alter.cards.length > 1) return hardAlter(v, rng);
    return polT(v, tier).alter(v, 'normal', rng);
  }
  function cardValue(hand, id) { return NB.cardValue(hand, id); }
  function topInfo(v) { return pol(v).topInfo(v); }

  /* 规则「塞回看得出大概位置」：别人塞在最上 / 最底的那只炸弹猫，机器猫和真人一样看在眼里（中间的看不准，不算知道）；
   * 那头被摸走过一张 / 洗牌 / 改命之后就不准了（ins.seen 由规则引擎清掉，top / bot 计数非 0 也不算） */
  function withSeen(v) {
    const ins = v.ins;
    if (!ins || !ins.seen || ins.card == null || ins.by === v.me || !v.deckSize) return v;
    const pos = ins.seen === 'top' ? (ins.top === 0 ? 0 : -1) : (ins.bot === 0 ? v.deckSize - 1 : -1);
    if (pos < 0 || v.known.some((k) => k.id === ins.card || k.pos === pos)) return v;
    v.known = v.known.concat([{ pos, id: ins.card }]).sort((a, b) => a.pos - b.pos);
    return v;
  }
  /* 铁律一「必死不摸」（2026-11-24 用户定）：这一摸一定是炸弹猫（我看过 / 大家看见塞在那头 / 牌堆全是猫）、
   * 手里没逗猫棒、也没有别的救命办法（九命没用过 / 急救手里有一对 / 组队还有活着的队友都不算必死），
   * 而手里有能躲的牌——就把「摸牌」从候选里去掉，在剩下的动作里挑（有网络就按网络打分，没有就按固定顺序）。
   * 能躲的：甩锅 / 自由甩锅 / 跳过 / 转向，牌堆不全是猫时还有洗牌 / 改命 / 摸底（底下那张没看到是猫）；
   * 一张也没有时，退一步用能拿到牌的（索要 / 交换 / 两张三张五张）去碰运气摸个逗猫棒。不改网络，只是过滤。
   * 对打 60 局经典 4 人高手：这种局面下原来 6.9% 直接摸，百变约 15%。 */
  const ESCAPE_KINDS = [R.TATTACK, R.ATTACK, R.SKIP, R.REVERSE, R.BOTTOM, R.SHUFFLE, R.ALTER];
  function doomedDraw(v) {
    if (!v.deckSize || has(v, R.DEFUSE)) return false;
    if (teamV(v) && matesV(v).some((m) => v.alive[m])) return false;   // 组队：队友可能救我
    if (v.flux === 'nine' && v.nineUsed && !v.nineUsed[v.me]) return false;
    if (v.flux === 'catsave' && R.catPairIds(v.hand)) return false;   // 急救用没用过 view 里看不到，有对子就当还能救
    if ((v.kittens || 0) >= v.deckSize) return true;
    const pos = v.flux === 'bottom' ? v.deckSize - 1 : 0;
    const k = v.known.find((x) => x.pos === pos);
    return !!(k && K[k.id] === R.BOOM);
  }
  function escapeUseful(v, kind) {
    const allBoom = (v.kittens || 0) >= v.deckSize;
    if (kind === R.SHUFFLE || kind === R.ALTER) return !allBoom;
    if (kind === R.BOTTOM) {
      if (allBoom || v.flux === 'bottom') return false;
      const b = v.known.find((x) => x.pos === v.deckSize - 1);
      return !(b && K[b.id] === R.BOOM);
    }
    return true;
  }
  function guardDoom(state, seat, v, d) {
    if (!d || d.type !== 'draw' || !doomedDraw(v)) return d;
    const legal = (m) => m.type === 'play' && !!R.checkPlay(state, seat, m.cards, m);
    const kindOf = (m) => (m.cards.length === 1 ? K[m.cards[0]] : null);
    const notMate = (m) => !(m.target != null && isMateV(v, m.target));
    const cands = actCandidates(v).filter((m) => legal(m) && notMate(m));
    const esc = cands.filter((m) => { const k = kindOf(m); return k && ESCAPE_KINDS.indexOf(k) >= 0 && escapeUseful(v, k); });
    // 改命不在 actCandidates 里（平时照普通的时机出），这里补上
    if (has(v, R.ALTER) && escapeUseful(v, R.ALTER)) { const m = playMove([one(v, R.ALTER)]); if (legal(m)) esc.push(m); }
    // 交换只有连逗猫棒一起换、对方手里有牌时才可能换来救命的逗猫棒；否则换了也白换（2026-11-25 用户见过必死局面 10 张换 2 张）
    const swapHelps = (m) => !!(v.rules && v.rules.swapDefuse) && v.counts[m.target] > 0;
    const gain = cands.filter((m) => { const k = kindOf(m); return k === R.FAVOR || (k === R.SWAP && swapHelps(m)) || m.cards.length >= 2; });
    const pool = esc.length ? esc : gain;
    if (!pool.length) return d;
    if (useBrain(v)) {
      const sf = brainState(v);
      let best = pool[0], bs = -Infinity;
      for (const m of pool) { const sc = brainScore(v, sf, m); if (sc > bs) { bs = sc; best = m; } }
      return best;
    }
    for (const k of ESCAPE_KINDS) { const m = pool.find((x) => kindOf(x) === k); if (m) return m; }
    return pool[0];
  }
  /* 铁律「不拿大手换小手」（用户 2026-11-25 反馈：手里 10 张去换只有 2 张的人）：交换时我换出去的牌比对方换过来的
   * 多 3 张以上，就把这一步拿掉，在剩下的动作里挑（有网络按网络打分，没有就摸牌）。例外：连逗猫棒一起换、
   * 对方身上看得见的逗猫棒比我多（换过来能救命）。实测高手在角色猫模式里约 15% 的交换是这种，经典 / 百变 / 组队几乎没有。 */
  /* 2026-11-27 用户：自己 3 张换给 0 张的人，纯亏。门槛 3 → 1：换出去的比换回来的多就挡（连逗猫棒换、对方逗猫棒更多时仍放行）。
   * 角色猫模式的网络（r）没练过交换，原来四成交换是「多换少」、3.7% 换给没牌的人；挡掉后角色局名次分 0.498 → 0.524，经典 / 百变持平（各 1600 局） */
  const SWAP_GAP = 1;
  function swapMovable(v, t, sid) {   // [我换出去几张, 对方换过来几张]（逗猫棒不跟着换时各自留下）
    const all = !!(v.rules && v.rules.swapDefuse);
    const mine = v.hand.filter((id) => id !== sid && (all || K[id] !== R.DEFUSE)).length;
    const theirs = Math.max(0, v.counts[t] - (all ? 0 : v.handKnown[t].filter((id) => K[id] === R.DEFUSE).length));
    return [mine, theirs];
  }
  function badSwap(v, m) {
    if (!m || m.type !== 'play' || m.cards.length !== 1 || K[m.cards[0]] !== R.SWAP || m.target == null) return false;
    const [mine, theirs] = swapMovable(v, m.target, m.cards[0]);
    if (mine < theirs + SWAP_GAP) return false;
    if (v.rules && v.rules.swapDefuse) {
      const myDef = v.hand.filter((id) => K[id] === R.DEFUSE).length, thDef = v.handKnown[m.target].filter((id) => K[id] === R.DEFUSE).length;
      if (thDef > myDef) return false;
    }
    return true;
  }
  /* 2026-11-26 用户：机器猫有时连着打两张洗牌，中间没看牌，第二张没有任何用。
   * 弃牌堆最上面是洗牌 = 上一张打出的就是洗牌、之后没人看过 / 塞过牌，牌堆对谁都还是乱的，再洗一次白费一张牌 */
  /* 2026-11-27 用户：洗完牌紧接着打抽底，没有任何期望收益——洗过之后底牌和顶牌一样是乱的，抽底只是白扔一张牌（等于直接摸）。
   * 弃牌堆最上面是洗牌 = 之后没人看过 / 塞过牌。百变「摸底」时本来就摸底，不管 */
  function badBottom(v, m) {
    if (!m || m.type !== 'play' || m.cards.length !== 1 || K[m.cards[0]] !== R.BOTTOM || v.flux === 'bottom') return false;
    const top = v.discard.length ? v.discard[v.discard.length - 1] : null;
    return top != null && K[top] === R.SHUFFLE;
  }
  function badShuffle(v, m) {
    if (!m || m.type !== 'play' || m.cards.length !== 1 || K[m.cards[0]] !== R.SHUFFLE) return false;
    const top = v.discard.length ? v.discard[v.discard.length - 1] : null;
    return top != null && K[top] === R.SHUFFLE;
  }
  /* 2026-11-26 用户：百变「透视」顶上明摆着是逗猫棒，机器猫还打转向。顶上那张确定安全（透视 / 看过 / 别人塞回看得见）时，
   * 跳过 / 转向 / 抽底 / 洗牌都是白扔一张牌（先摸安全的这张再说）。甩锅不挡（把回合压给下家本身有用）；百变「摸底」时摸的是底，不管顶。
   * 网络在开交换 / 3 人局约 2% 会这么打；百变 6400 局名次分 0.495 vs 0.495 */
  const SAFE_WASTE = new Set([R.SKIP, R.REVERSE, R.BOTTOM, R.SHUFFLE].filter(Boolean));
  function badSafeEscape(v, m) {
    if (!m || m.type !== 'play' || m.cards.length !== 1 || !SAFE_WASTE.has(K[m.cards[0]]) || v.flux === 'bottom' || !v.deckSize) return false;
    const k0 = v.known.find((x) => x.pos === 0);
    return !!k0 && K[k0.id] !== R.BOOM;
  }
  function guardSwap(state, seat, v, d) {
    const bad = (m) => badSwap(v, m) || badShuffle(v, m) || badBottom(v, m) || badSafeEscape(v, m);
    if (!bad(d)) return d;
    const legal = (m) => m.type !== 'play' || !!R.checkPlay(state, seat, m.cards, m);
    const pool = actCandidates(v).filter((m) => legal(m) && !bad(m));
    if (useBrain(v) && pool.length) {
      const sf = brainState(v);
      let best = pool[0], bs = -Infinity;
      for (const m of pool) { const sc = brainScore(v, sf, m); if (sc > bs) { bs = sc; best = m; } }
      return best;
    }
    return DRAW;
  }
  /* 铁律「多次锅别硬摸」（2026-11-26 用户：被甩锅要连摸几张时，机器猫不把这几张当整体看）：
   * 头上还要摸 ≥2 张、手里没逗猫棒（九命 / 急救 / 组队都不算有救），接下来要摸的这几张合起来是炸弹猫的概率 ≥ MULTI_RISK，
   * 手里却攥着甩锅 / 指定甩锅还选了摸牌——改成甩锅（有网络按网络挑甩给谁）。逐局看到过「4 次锅、每张看着 10–15%、合起来近一半会炸还连摸」。
   * 经典 4 / 5 人对线上高手：门槛 30 / 45 / 60% 名次分都和对照一样（0.496 / 0.505），每 2000 局只改到几步，属于挡掉不像人的操作 */
  const MULTI_RISK = 0.45;
  function guardMulti(state, seat, v, d) {
    if (!d || d.type !== 'draw' || (v.turnsLeft || 1) < 2 || !v.deckSize || v.flux === 'bottom') return d;
    if (saveOk(v) || (teamV(v) && matesV(v).some((m) => v.alive[m]))) return d;
    if (!has(v, R.ATTACK) && !has(v, R.TATTACK)) return d;
    const T = Math.min(v.turnsLeft, v.deckSize);
    let b = []; try { b = pol(v).kittenBelief(v, T); } catch (_) { return d; }
    const risk = 1 - b.reduce((a, p) => a * (1 - p), 1);
    if (risk < MULTI_RISK) return d;
    const legal = (m) => !!R.checkPlay(state, seat, m.cards, m);
    const pool = [];
    if (has(v, R.ATTACK)) pool.push(playMove([one(v, R.ATTACK)]));
    if (has(v, R.TATTACK)) for (let t = 0; t < v.n; t++) if (t !== v.me && v.alive[t]) pool.push(playMove([one(v, R.TATTACK)], t));
    const ok = pool.filter(legal);
    if (!ok.length) return d;
    if (useBrain(v)) {
      const sf = brainState(v);
      let best = ok[0], bs = -Infinity;
      for (const m of ok) { const sc = brainScore(v, sf, m); if (sc > bs) { bs = sc; best = m; } }
      return best;
    }
    return ok[0];
  }
  /* 一步到位：给定 state 和座位，按档位产出该座位此刻的决定（UI / 服务器用） */
  function decide(state, seat, tier, rng) {
    rng = rng || Math.random;
    const v = withSeen(R.view(state, seat));
    switch (state.phase) {
      case 'act': return guardMulti(state, seat, v, guardDoom(state, seat, v, guardSwap(state, seat, v, actFor(v, tier, rng))));
      case 'react': return { type: reactFor(v, tier, rng) ? 'nope' : 'pass' };
      case 'give': return { type: 'give', card: chooseGive(v, tier, rng) };
      case 'pick': return { type: 'pick', card: choosePick(v, tier, rng) };
      case 'defuse': return { type: 'insert', pos: insertFor(v, tier, rng) };
      case 'save': return { type: 'save' };   // 急救：交最便宜的一对（规则里不给牌 = catPairIds）
      case 'alter': return { type: 'alter', order: chooseAlter(v, tier, rng) };
      case 'steal': return { type: 'steal', idx: (rng() * v.steal.count) | 0 };   // 扣着的牌没信息，随便点
      case 'rescue': return { type: 'rescue', yes: true };   // 组队：队友炸了、我有逗猫棒——救
      default: return null;
    }
  }

  return {
    TIERS, TIER_NAMES, cardValue, topInfo, determinize, decide,
    actFor, reactFor, insertFor, chooseGive, choosePick, chooseAlter, stepWith,
    withFlux: (o) => zhamaoAI(R, o),
    _brain: { state: brainState, insert: brainInsert, v2: BRAIN_V2, vec: brainVec, insVec, of: brainOf },   // 训练场对位验证用   // 训练场：换一套百变参数造一个新实例（{ normal, easy, budget }）
    hasBrain: !!BRAIN,
  };
});
