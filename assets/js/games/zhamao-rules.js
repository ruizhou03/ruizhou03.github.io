/* 猫咪炸毛 · 纯规则模块（浏览器 window.ZhamaoRules / Node require 共用，无 DOM）
 *
 * 玩法机制参考公开规则（摸到「炸」的出局、拆除后塞回牌堆、跳过 / 甩给下家 / 洗牌 / 看未来 / 索要 / 否决、
 * 两张同样的偷一张），牌名、形象全部是我们自己的（2026-11-11 用户定：原创猫咪主题，基础版全套 + 三种组合）。
 *
 * 一副 56 张（2–5 人）：
 *   炸毛猫 ×4    摸到就炸毛出局，除非手里有逗猫棒
 *   逗猫棒 ×6    摸到炸毛猫时自动打出，把炸毛猫偷偷塞回牌堆任意位置
 *   喵？不行 ×5  作废别人刚出的牌（也能作废「不行」，叠来叠去，单数张=作废）。不能挡炸毛猫 / 逗猫棒
 *   攻击 ×4      结束自己的回合、不摸牌，下家连着摸两回合
 *   跳过 ×4      结束一个回合、不摸牌（被攻击时只顶掉其中一回合）
 *   索要 ×4      指定一人，他自己挑一张给你
 *   洗牌 ×4      把牌堆洗乱
 *   窥探 ×5      看牌堆最上面三张（不改顺序、别人看不到）
 *   橘猫 / 三花 / 奶牛 / 狸花 / 暹罗 各 ×4   本身没用，凑组合
 * 组合（任何同名牌都算，炸毛猫除外）：
 *   两张同样   指定一人，从他手里随机抽一张
 *   三张同样   指定一人并点名一种牌，他有就得给你一张，没有就落空
 *   五张各不同 从弃牌堆里挑任意一张（炸毛猫除外）
 * 开局：抽出炸毛猫和逗猫棒，余下洗匀每人发 4 张，再每人发 1 张逗猫棒；
 *       放回「人数 −1」张炸毛猫，再把剩下的逗猫棒全放回（官方规则），洗匀；
 *       多出来的收进盒子（state.removed），这局不用。
 * 回合：可以出任意多张 / 组合（每出一次都留一个「不行」反应窗），最后摸一张牌结束回合。
 *       甩锅叠加（RULES.stackAttack）：默认开 = 被甩锅的人再甩锅，剩下的回合 +2 一起甩走（可以一路越叠越多）；关 = 下家仍只摸两回合。
 *   指定甩锅 ×3  同甩锅，但甩给任意一个还在场的人（不一定是下家）
 *   交换（可选，RULES.swap，默认关）  和指定的一个人整手交换——各自的逗猫棒默认不换（RULES.swapDefuse 开了就连逗猫棒一起换）。整副里有 3 张，开局只放 min(3, 人数−1) 张进来
 *     （2 人 1 张、3 人 2 张、4–5 人 3 张：人越多、每人摸到的机会越被摊薄，所以随人数加；但封顶 3 张，免得满桌一直换手），其余收进盒子
 * 只剩一人没炸毛时他赢。
 *
 * 牌编码：card = 0..DECK_SIZE-1 的整数 id，KIND_OF[id] 是牌种（字符串）。牌堆 deck[0] 是最上面那张。
 * 座位 0..n-1，出牌顺序 seat → 下一个还没出局的人（UI 负责画成逆时针）。
 *
 * 状态机（state.phase）：
 *   'act'    轮到 state.turn 出牌或摸牌
 *   'react'  有人刚出了牌（state.pending），等大家决定要不要「不行」：nope() / pass()，全部表态后 closeReaction()
 *   'give'   被「蹭一张」的人挑一张给出：give()
 *   'pick'   五种猫各一张：出牌人从弃牌堆挑一张：pickDiscard()
 *   'steal'  两张一样：出牌人从对方扣着的手牌里点一张（顺序打乱过，看不出是哪张）：stealPick()
 *   'alter'  「重排」：出牌人把牌堆最上面（至多）三张按自己想要的顺序放回去：alterTop()
 *   'defuse' 刚用逗猫棒拆了炸毛猫，把它塞回去：insertKitten()
 *   'over'   结束，state.winner
 * 每个改状态的函数都返回事件数组（UI 播动画 / 服务器转发）。带 priv 字段的事件只有 priv 里列的座位能看到全部内容，
 * redactEvents(events, seat) 给别人去掉 card / cards / pos。
 *
 * 知识（state.memo[seat]，给机器人用，规则本身不依赖）：
 *   deck  该座位确切知道位置的牌 id 集合（看未来 / 自己塞回的炸毛猫）；别人塞炸毛猫或洗牌后作废
 *   hands 该座位知道「别人手里有」的牌 id（被蹭走 / 偷走 / 点名要走 / 弃牌堆捡走 / 从自己知道的牌堆顶摸走）
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoRules = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOOM = 'boom', DEFUSE = 'defuse', NOPE = 'nope', ATTACK = 'attack', TATTACK = 'tattack', SKIP = 'skip', BOTTOM = 'bottom',
    FAVOR = 'favor', SHUFFLE = 'shuffle', FUTURE = 'future', ALTER = 'alter', SWAP = 'swap', WILD = 'wild', REVERSE = 'reverse', FLUX = 'flux';
  const CATS = Object.freeze(['orange', 'calico', 'cow', 'tabby', 'siamese']);
  const ACTIONS = Object.freeze([ATTACK, TATTACK, SKIP, REVERSE, BOTTOM, FAVOR, SHUFFLE, FUTURE, ALTER, SWAP, FLUX]);
  const COUNTS = Object.freeze({
    boom: 4, defuse: 6, nope: 5, attack: 4, tattack: 3, skip: 4, favor: 4, shuffle: 4, future: 4, alter: 3, swap: 3, bottom: 4,
    orange: 4, calico: 4, cow: 4, tabby: 4, siamese: 4, wild: 4, reverse: 4, flux: 10,
  });
  const KINDS = Object.freeze(Object.keys(COUNTS));
  const NAMES = Object.freeze({
    boom: '炸毛猫', defuse: '逗猫棒', nope: '作废', attack: '甩锅', tattack: '自由甩锅', skip: '跳过', bottom: '抽底', favor: '索要',
    shuffle: '洗牌', future: '窥探', alter: '改命', swap: '交换', orange: '橘猫', calico: '三花', cow: '奶牛猫', tabby: '狸花', siamese: '暹罗', wild: '万能猫', reverse: '转向', flux: '百变',
  });
  /* 第二副牌（2026-11-12 起最多 9 人）：6 人以上开局把它也洗进来——炸毛猫最多 8 只、逗猫棒最多 11 根，功能牌和猫牌也多一倍；
   * 5 人及以下它一开局就整副收进盒子。牌号接在第一副后面（0..67 不变，旧存档 / 联机局照常） */
  const COUNTS2 = Object.freeze({
    boom: 4, defuse: 5, nope: 5, attack: 4, tattack: 3, skip: 4, favor: 4, shuffle: 4, future: 4, alter: 3, swap: 3, bottom: 4,
    orange: 4, calico: 4, cow: 4, tabby: 4, siamese: 4, wild: 4, reverse: 4, flux: 10,
  });
  /* 2026-11-13 加万能猫（每副 4 张）：为了旧存档 / 联机局的牌号不变，它们的牌号接在最后——135..138 属第一副、139..142 属第二副。
   * 所以「是哪一副的牌」不能再拿 id < 68 判断，用 DECK_OF[id]（1 | 2）/ inSecondDeck(id) */
  /* 同一天又加转向（每副 4 张）：接在万能猫后面——143..146 第一副、147..150 第二副（万能猫的牌号不变） */
  /* 2026-11-15 又加「百变」（只在百变模式里用）：接在转向后面——每副 10 张，151..160 第一副、161..170 第二副（开局每人发一张，所以要多） */
  const LATE = [WILD, REVERSE, FLUX];   // 后加的牌种：牌号排在两副老牌之后，按这个顺序一种种往后接
  const KIND_OF = [], DECK_OF = [];
  for (const k of KINDS) if (LATE.indexOf(k) < 0) for (let i = 0; i < COUNTS[k]; i++) { KIND_OF.push(k); DECK_OF.push(1); }
  for (const k of KINDS) if (LATE.indexOf(k) < 0) for (let i = 0; i < (COUNTS2[k] || 0); i++) { KIND_OF.push(k); DECK_OF.push(2); }
  for (const k of LATE) {
    for (let i = 0; i < COUNTS[k]; i++) { KIND_OF.push(k); DECK_OF.push(1); }
    for (let i = 0; i < (COUNTS2[k] || 0); i++) { KIND_OF.push(k); DECK_OF.push(2); }
  }
  Object.freeze(KIND_OF); Object.freeze(DECK_OF);
  const BASE_SIZE = KINDS.reduce((t, k) => t + COUNTS[k], 0);   // 76：第一副的张数（含 3 张交换、4 张抽底、4 张万能猫、4 张转向）
  const DECK_SIZE = KIND_OF.length;                              // 151：两副的牌号总数
  const LEGACY_SIZES = Object.freeze([159, 151, 143, 135, 68, 64]);   // 以前的存档：百变每副 4 张时 / 加百变前 / 加转向前 / 加万能猫前两副 / 一副 / 一副没抽底
  const inSecondDeck = (id) => DECK_OF[id] === 2;
  const MIN_PLAYERS = 2, MAX_PLAYERS = 9, TWO_DECKS_FROM = 6;
  const usesSecondDeck = (n) => n >= TWO_DECKS_FROM;

  const RULE_OPTIONS = Object.freeze({
    stackAttack: [true],   // 2026-11-13 用户：甩锅次数永远累加——不再是可选项，老存档 / 老房间读进来也一律按叠加
    extraDefuse: ['all'],   // 2026-11-13 用户：开关拿掉，固定「剩下的逗猫棒全放回」（官方规则）；老存档 / 老房间读进来也按这个
    swap: [false, true],
    swapDefuse: [false, true],   // 2026-11-13 用户：交换要不要连逗猫棒一起换（以前玩的是整副手牌全换）；默认不换，开房的人 / 单机自己选
    deckSize: ['std', 'quick', 'more'],   // 牌量（2026-11-13 用户：牌太多、炸毛猫太稀）：标准 ≈ 官方密度 / 快局更短 / 多 = 以前的整副（两副）
    insertSeen: [true, false],
    mode: ['classic', 'flux', 'team', 'roles'],   // roles = 角色猫（2026-11-15）   // team = 2v2 组队（2026-11-15，只能 4 人：0、2 一队，1、3 一队）   // 2026-11-15：经典 / 百变（牌堆里加「百变」牌，打出就从百变规则堆里抽一条换上）   // 塞回炸毛猫看得出大概位置（2026-11-14 用户，默认开）：动画插在真实高度，像线下一样最上 / 最底一眼看得出、中间只能估；不报第几张。选「随机」的照旧看不出
  });
  // 2026-11-13 起「多的逗猫棒全放回」默认开（官方规则：每人先发 1 根逗猫棒，剩下的全洗回牌堆）
  const DEFAULT_RULES = Object.freeze({ stackAttack: true, extraDefuse: 'all', swap: false, swapDefuse: false, deckSize: 'std', insertSeen: true, mode: 'classic' });
  /* 百变规则（2026-11-15 用户：不预告，打「百变」就抽一条，抽到什么算什么；桌上固定一张「百变规则」牌）。
   * id 进状态 s.flux；desc 是桌上规则牌 / 说明里的一句话 */
  // 2026-11-15 用户：不叠锅 / 暗塞 / 千里眼 / 慷慨太弱、感觉不到 → 换成 九命 / 掀顶 / 烫手 / 双猫急救
  // 2026-11-15 用户定的名字和说法（掀顶→透视、明塞→火眼、静音→静默、双猫急救→急救）；id 不变（老存档照常）
  const FLUX_RULES = Object.freeze([
    { id: 'nine', name: '九命', desc: '摸到炸毛猫时若无逗猫棒，大喊「九命」并存活，炸毛猫随机放回牌堆。每人最多生效一次' },
    { id: 'peektop', name: '透视', desc: '牌堆第一张牌对所有人可见' },
    { id: 'exact', name: '火眼', desc: '炸毛猫塞回的位置对所有人可见' },
    { id: 'bottom', name: '摸底', desc: '摸牌改从牌堆底部摸' },
    { id: 'hot', name: '烫手', desc: '每个普通回合都要摸两次（被甩锅的次数不变）' },
    { id: 'mute', name: '静默', desc: '不能打「作废」' },
    { id: 'catsave', name: '急救', desc: '摸到炸毛猫时若无逗猫棒，可打出两张相同的牌代替，炸毛猫随机放回牌堆。每人最多生效一次' },
  ]);
  /* 2026-11-15 用户：删掉无关痛痒的——逆行（和「转向」牌重复）拿掉；静音（玩家对战里挺有用）、双猫急救（改成任意一对一样的牌都行，功能牌也算）留着。
   * 逆行的代码留着：老存档里正生效的照常结算 */
  const FLUX_IDS = FLUX_RULES.map((r) => r.id);
  /* 角色猫（2026-11-15 用户同意提案：技能全部自动触发、不加按钮）。开局每人随机一只，大家都看得到 */
  // 2026-11-15 用户：技能要简单直接、一句话一个效果，不靠打补丁平衡；哪个方向平衡不了就换方向
  const ROLES = Object.freeze([
    { id: 'timid', name: '胆小猫', desc: '被甩锅时，先偷看牌堆顶 3 张', once: false },
    { id: 'fat', name: '胖橘', desc: '出「索要」时，对方要给两张', once: false },
    { id: 'shadow', name: '黑猫', desc: '两张偷牌对他无效', once: false },
    { id: 'cow', name: '奶牛猫', desc: '被甩锅时只摸 1 张', once: false },
    { id: 'calico', name: '三花', desc: '任意两只猫算一对，任意三只算三张', once: false },
    { id: 'tabby', name: '狸花', desc: '作废成功，顺手叼走对方一张牌', once: false },
  ]);
  const ROLE_IDS = ROLES.map((r) => r.id);
  const roleOf = (s, seat) => (s.roles ? s.roles[seat] : null);
  const roleReady = (s, seat, id) => roleOf(s, seat) === id && s.roleUsed && !s.roleUsed[seat];
  // 生效规则 = 基本规则 + 百变那条叠上去（机器猫的 view.rules 给的就是这个）
  function rulesOf(s) {
    const r = Object.assign({}, s.rules);
    if (s.flux === 'exact') r.insertSeen = 'exact';
    return r;
  }
  const swapsInPlay = (n) => Math.min(usesSecondDeck(n) ? 6 : 3, n - 1);
  /* 牌量（2026-11-13 用户）：以前 5 人及以下整副 63 张普通牌、6 人起两副 126 张，牌堆是官方的 2–7 倍，炸毛猫只占 4–8%。
   * 「标准」「快局」按人数定这一局用多少张普通牌（不算炸毛猫 / 逗猫棒 / 交换）：63 × 人数系数 × 档位系数，人数系数 = 人数 / 5，夹在 0.8–1.8；
   * 减的时候分三档：猫牌（含万能猫）砍得最多，转向 / 抽底 / 改命 / 洗牌 / 窥探次之，作废 / 跳过 / 甩锅 / 索要 / 自由甩锅基本保住；
   * 牌堆里多放的逗猫棒也跟着收（「多」照旧全放回）。炸毛猫永远 人数 − 1 */
  const DECK_FACTOR = { std: 0.7, quick: 0.5 };
  const KEEP = { nope: 1, skip: 1, attack: 1, favor: 1, tattack: 1, shuffle: 0.75, future: 0.75, alter: 0.75, bottom: 0.75, reverse: 0.75 };   // 其余（猫 / 万能猫）0.55
  const MIN_KEEP = { nope: 2, skip: 2, attack: 2, favor: 1, tattack: 1, wild: 1 };   // 猫每种至少 2 张（凑得出对子），其余至少 1 张
  function deckQuota(n, size, avail) {
    const f = DECK_FACTOR[size];
    if (!f) return null;
    const target = Math.round(63 * Math.max(0.8, Math.min(1.8, n / 5)) * f);
    const kinds = Object.keys(avail).filter((k) => avail[k] > 0);
    const w = (k) => avail[k] * (KEEP[k] || 0.55);
    const minOf = (k) => Math.min(avail[k], MIN_KEEP[k] || (isCat(k) ? 2 : 1));
    // 按权重分，四舍五入用最大余数法；不少于下限、不多于手上有的
    let sc = target / kinds.reduce((t, k) => t + w(k), 0);
    let q = {};
    for (let it = 0; it < 30; it++) {
      const raw = kinds.map((k) => [k, Math.max(minOf(k), Math.min(avail[k], w(k) * sc))]);
      const base = raw.map(([k, v]) => [k, Math.floor(v), v - Math.floor(v)]);
      let left = target - base.reduce((t, x) => t + x[1], 0);
      base.sort((a, b) => b[2] - a[2]);
      q = {};
      for (const [k, v] of base) { q[k] = v; }
      for (const x of base) { if (left <= 0) break; if (q[x[0]] < avail[x[0]]) { q[x[0]]++; left--; } }
      const sum = Object.values(q).reduce((t, v) => t + v, 0);
      if (Math.abs(sum - target) <= 1) break;
      sc *= target / Math.max(1, sum);
    }
    return q;
  }
  function normalizeRules(r) {
    const out = {};
    for (const k of Object.keys(DEFAULT_RULES)) {
      const v = r && r[k];
      out[k] = RULE_OPTIONS[k].indexOf(v) >= 0 ? v : DEFAULT_RULES[k];
    }
    return out;
  }

  const kindOf = (id) => KIND_OF[id];
  const isCat = (k) => CATS.indexOf(k) >= 0;
  const catLike = (k) => k === WILD || isCat(k);   // 能当猫用：五种猫 + 万能猫
  const cardName = (id) => NAMES[KIND_OF[id]];

  /* ───── 随机数：状态里只存一个整数 rs，可序列化（服务器 / 克隆都方便） ───── */
  function rand(state) {
    state.rs = (state.rs + 0x6D2B79F5) >>> 0;
    let t = state.rs;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffleIn(state, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rand(state) * (i + 1)) | 0;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* 手牌排序：逗猫棒、不行、行动牌、猫，同种挨着 */
  const ORDER = [DEFUSE, NOPE, ATTACK, TATTACK, SKIP, REVERSE, BOTTOM, FAVOR, SWAP, SHUFFLE, FUTURE, ALTER, FLUX].concat(CATS, [WILD, BOOM]);
  function sortHand(hand) {
    return hand.slice().sort((a, b) => (ORDER.indexOf(KIND_OF[a]) - ORDER.indexOf(KIND_OF[b])) || (a - b));
  }

  function newMemo(n) {
    const m = [];
    for (let s = 0; s < n; s++) m.push({ deck: [], hands: Array.from({ length: n }, () => []) });
    return m;
  }

  /* ───── 开局 ───── */
  function createGame(n, seed, rules) {
    if (!(n >= MIN_PLAYERS && n <= MAX_PLAYERS)) throw new Error('bad player count');
    rules = normalizeRules(rules);
    if (rules.mode === 'team' && n !== 4) rules = Object.assign({}, rules, { mode: 'classic' });   // 组队只有 4 人局
    const state = {
      n, rules, rs: (seed >>> 0) || 1,
      deck: [], discard: [], removed: [], hands: [], alive: [], outOrder: [],
      turn: 0, turnsLeft: 1, phase: 'act', pending: null, give: null, pick: null, defuse: null, alter: null, steal: null,
      winner: -1, seq: 0, memo: newMemo(n), ins: null, peek: null,
      flux: null, fluxDeck: [], rescue: null, winnerTeam: -1, roles: null, roleUsed: null, cowCut: -1, hotGiven: -1,   // 百变模式：现在生效的那条百变规则（null = 还没有）、还没抽到的规则（洗好的，从末尾抽）
      dir: 1,   // 出牌方向：1 = 座位号往上走（桌上画成逆时针），-1 = 打过单数张转向后反过来
    };
    const booms = [], defuses = [], rest = [], swaps = [], unused = [], fluxes = [];
    const two = usesSecondDeck(n);   // 5 人及以下只用第一副
    for (let id = 0; id < DECK_SIZE; id++) {
      if (inSecondDeck(id) && !two) { unused.push(id); continue; }
      const k = KIND_OF[id];
      if (k === FLUX) { if (rules.mode === 'flux') fluxes.push(id); else unused.push(id); continue; }   // 百变牌只在百变模式里用，不进牌量配额
      if (k === BOOM) booms.push(id); else if (k === DEFUSE) defuses.push(id); else if (k === SWAP) swaps.push(id); else rest.push(id);
    }
    // 牌量：标准 / 快局按配额每种留前几张，其余收进盒子
    const avail = {};
    for (const id of rest) avail[KIND_OF[id]] = (avail[KIND_OF[id]] || 0) + 1;
    const quota = deckQuota(n, rules.deckSize, avail);
    if (quota) {
      const seen = {};
      const keep = [];
      for (const id of rest) { const k = KIND_OF[id]; seen[k] = (seen[k] || 0) + 1; if (seen[k] <= quota[k]) keep.push(id); else unused.push(id); }
      rest.length = 0; rest.push(...keep);
    }
    const nSwaps = quota ? Math.min(swapsInPlay(n), Math.max(1, Math.round((n - 1) / 2))) : swapsInPlay(n);
    const swapIn = rules.swap ? swaps.slice(0, nSwaps) : [];
    rest.push(...swapIn);
    // 百变（2026-11-15 用户：它只是抽奖、本身不如跳过好用，开局人人白送一张，牌堆里也多放）：
    // 开局每人额外一张（不占那 4 张）；牌堆里标准 / 快局按人数放 2–7 张（4 人 3 张），「多」把剩下的都放
    const handFlux = rules.mode === 'flux' ? fluxes.splice(0, n) : [];
    const nFlux = quota ? Math.max(2, Math.min(7, Math.round(n * 0.8))) : fluxes.length;
    rest.push(...fluxes.slice(0, nFlux));
    unused.push(...fluxes.slice(nFlux));
    if (rules.mode === 'flux') { state.fluxDeck = shuffleIn(state, FLUX_IDS.slice()); state.nineUsed = Array.from({ length: n }, () => false); }
    shuffleIn(state, rest);
    // 角色猫：每人随机一只（人多于 6 时会有重复）；胖橘多发一张
    if (rules.mode === 'roles') {
      const bag = [];
      while (bag.length < n) bag.push(...shuffleIn(state, ROLE_IDS.slice()));
      state.roles = bag.slice(0, n);
      state.roleUsed = Array.from({ length: n }, () => false);
    }
    for (let s = 0; s < n; s++) {
      const extra = 0;
      const bonus = [];
      state.hands.push(sortHand(rest.splice(0, 4 + extra).concat(defuses.shift(), handFlux.length ? [handFlux[s]] : [], bonus)));
      state.alive.push(true);
    }
    shuffleIn(state, booms);
    let extra = rules.extraDefuse === 'all' ? defuses.length : Math.min(2, defuses.length);
    if (quota) extra = Math.min(extra, Math.max(1, Math.round((n - 1) * 0.6)));   // 牌堆变小了，多放的逗猫棒也跟着收
    state.deck = shuffleIn(state, rest.concat(booms.slice(0, n - 1), defuses.slice(0, extra)));
    state.removed = booms.slice(n - 1).concat(defuses.slice(extra), swaps.slice(swapIn.length), unused); // 这局不用的，收进盒子

    state.turn = (rand(state) * n) | 0;
    turnStarts(state, null);
    return state;
  }

  function cloneGame(s) {
    return {
      n: s.n, rules: s.rules, rs: s.rs,
      deck: s.deck.slice(), discard: s.discard.slice(), removed: s.removed.slice(), hands: s.hands.map((h) => h.slice()),
      alive: s.alive.slice(), outOrder: s.outOrder.slice(),
      turn: s.turn, turnsLeft: s.turnsLeft, phase: s.phase,
      pending: s.pending && Object.assign({}, s.pending, { cards: s.pending.cards.slice(), nopes: s.pending.nopes.slice(), passed: s.pending.passed.slice() }),
      give: s.give && Object.assign({}, s.give), pick: s.pick && Object.assign({}, s.pick), defuse: s.defuse && Object.assign({}, s.defuse),
      alter: s.alter && { by: s.alter.by, cards: s.alter.cards.slice() },
      steal: s.steal && { by: s.steal.by, from: s.steal.from, perm: s.steal.perm.slice() },
      winner: s.winner, seq: s.seq, ins: s.ins ? Object.assign({}, s.ins) : null, peek: s.peek ? Object.assign({}, s.peek) : null, dir: s.dir || 1,
      flux: s.flux || null, fluxDeck: (s.fluxDeck || []).slice(), nineUsed: s.nineUsed ? s.nineUsed.slice() : null, saveUsed: s.saveUsed ? s.saveUsed.slice() : null,
      rescue: s.rescue ? Object.assign({}, s.rescue) : null, winnerTeam: s.winnerTeam != null ? s.winnerTeam : -1,
      roles: s.roles ? s.roles.slice() : null, roleUsed: s.roleUsed ? s.roleUsed.slice() : null, cowCut: s.cowCut != null ? s.cowCut : -1, hotGiven: s.hotGiven != null ? s.hotGiven : -1,
      memo: s.memo.map((m) => ({ deck: m.deck.slice(), hands: m.hands.map((h) => h.slice()) })),
    };
  }

  /* ───── 查询 ───── */
  // 2v2 组队：对面坐的是队友（0、2 一队，1、3 一队）
  const isTeam = (s) => !!(s.rules && s.rules.mode === 'team' && s.n === 4);
  const mateOf = (s, seat) => (isTeam(s) ? (seat + 2) % 4 : -1);
  const teamOf = (seat) => seat % 2;
  const aliveCount = (s) => s.alive.reduce((a, b) => a + (b ? 1 : 0), 0);
  // 按当前方向的下一个还在场的人（老存档没有 dir：按 1）
  function nextAlive(s, seat) {
    const d = s.dir === -1 ? -1 : 1;
    for (let i = 1; i <= s.n; i++) { const t = (((seat + d * i) % s.n) + s.n) % s.n; if (s.alive[t]) return t; }
    return seat;
  }
  const countKind = (hand, k) => hand.reduce((a, id) => a + (KIND_OF[id] === k ? 1 : 0), 0);
  const findKind = (hand, k) => hand.find((id) => KIND_OF[id] === k);
  // 百变「双猫急救」用的一对（2026-11-15 用户：任意一对一样的牌都行，功能牌也算）：先交最不值钱的——
  // 一样的猫 → 真猫 + 万能猫 → 两张万能猫 → 功能牌（洗牌 / 抽底 / 窥探 … 由便宜到金贵）
  const PAIR_ORDER = [SHUFFLE, BOTTOM, FUTURE, REVERSE, ALTER, FAVOR, SKIP, SWAP, FLUX, ATTACK, TATTACK, NOPE];
  function catPairIds(hand) {
    const by = {};
    for (const id of hand) { const k = KIND_OF[id]; (by[k] = by[k] || []).push(id); }
    for (const k of CATS) if ((by[k] || []).length >= 2) return by[k].slice(0, 2);
    for (const k of CATS) if ((by[k] || []).length && (by[WILD] || []).length) return [by[k][0], by[WILD][0]];
    if ((by[WILD] || []).length >= 2) return by[WILD].slice(0, 2);
    for (const k of PAIR_ORDER) if ((by[k] || []).length >= 2) return by[k].slice(0, 2);
    return null;
  }
  const kittensInDeck = (s) => s.deck.reduce((a, id) => a + (KIND_OF[id] === BOOM ? 1 : 0), 0);

  /* 一组牌是什么：返回 { type, needsTarget, needsName } 或 null（不能出）
   * type：五种行动牌名 | 'pair' | 'triple' | 'five' */
  function classify(cards) {
    if (!cards || !cards.length) return null;
    if (new Set(cards).size !== cards.length) return null;
    const kinds = cards.map((id) => KIND_OF[id]);
    if (kinds.indexOf(BOOM) >= 0) return null;
    if (cards.length === 1) {
      const k = kinds[0];
      if (ACTIONS.indexOf(k) < 0) return null;
      return { type: k, needsTarget: k === FAVOR || k === TATTACK || k === SWAP, needsName: false };
    }
    // 一样的牌，或者猫凑猫：万能猫能顶任何一种猫（两张万能猫也算一对）
    const real = kinds.filter((k) => k !== WILD);
    const same = kinds.every((k) => k === kinds[0]) || (kinds.every(catLike) && new Set(real).size <= 1);
    if (cards.length === 2 && same) return { type: 'pair', needsTarget: true, needsName: false };
    if (cards.length === 3 && same) return { type: 'triple', needsTarget: true, needsName: true };
    // 五张：五种猫各一张（橘猫 / 三花 / 奶牛猫 / 狸花 / 暹罗），缺哪种都能拿万能猫顶；行动牌、「作废」都不算
    if (cards.length === 5 && kinds.every(catLike) && new Set(real).size === real.length) return { type: 'five', needsTarget: false, needsName: false };
    return null;
  }

  /* 能被指定的人：还在场、不是自己、手里有牌（指定甩锅不看手牌：在场的人都能甩） */
  function validTargets(s, seat, type) {
    const out = [];
    for (let t = 0; t < s.n; t++) if (t !== seat && s.alive[t] && (type === TATTACK || type === SWAP || s.hands[t].length > 0)) out.push(t);
    return out;
  }

  /* 出牌前的完整合法性检查；ok 时返回 classify 结果 */
  function checkPlay(s, seat, cards, opts) {
    opts = opts || {};
    if (s.phase !== 'act' || s.turn !== seat) return null;
    const hand = s.hands[seat];
    if (!cards.every((id) => hand.indexOf(id) >= 0)) return null;
    let c = classify(cards);
    // 角色猫「三花」：任意两只猫（含万能猫）也算一对
    if (!c && roleOf(s, seat) === 'calico' && (cards.length === 2 || cards.length === 3) && new Set(cards).size === cards.length && cards.every((id) => catLike(KIND_OF[id]))) c = cards.length === 2 ? { type: 'pair', needsTarget: true, needsName: false } : { type: 'triple', needsTarget: true, needsName: true };
    if (!c) return null;
    if (c.needsTarget && validTargets(s, seat, c.type).indexOf(opts.target) < 0) return null;
    if (c.needsName && (KINDS.indexOf(opts.named) < 0 || opts.named === BOOM)) return null;
    // 五张各不同：弃牌堆空着也能出（出完这五张自己就在弃牌堆里了，可以捡回其中一张）
    return c;
  }

  /* ───── 知识维护 ───── */
  function forgetCard(s, id) { // 牌离开手牌进弃牌堆 / 出局：所有人关于它在谁手里的记忆作废
    for (const m of s.memo) for (const h of m.hands) { const i = h.indexOf(id); if (i >= 0) h.splice(i, 1); }
  }
  function learnHand(s, knower, holder, id) {
    const h = s.memo[knower].hands[holder];
    if (knower !== holder && h.indexOf(id) < 0) h.push(id);
  }
  function moveCard(s, from, to, id, witnesses) { // witnesses: 'all' | 座位数组（知道是哪张的人）
    const i = s.hands[from].indexOf(id);
    s.hands[from].splice(i, 1);
    s.hands[to].push(id);
    s.hands[to] = sortHand(s.hands[to]);
    forgetCard(s, id);
    for (let k = 0; k < s.n; k++) if (witnesses === 'all' || witnesses.indexOf(k) >= 0) learnHand(s, k, to, id);
  }

  /* 角色猫「胆小猫」：第一次轮到他时自动偷看牌堆顶 1 张（ev 为空 = 开局，那时不发事件，只记在他的记忆里） */
  function turnStarts(s, ev) {
    const seat = s.turn;
    if (true) return;   // 2026-11-15 胆小猫改成「被甩锅时偷看 2 张」，开局 / 第一次轮到不再偷看
    s.roleUsed[seat] = true;
    const top = s.deck[0], m = s.memo[seat].deck;
    if (m.indexOf(top) < 0) m.push(top);
    if (ev) ev.push({ t: 'role', seat, role: 'timid', cards: [top], priv: [seat] });
  }

  /* ───── 回合推进 ───── */
  function endOneTurn(s, ev) {
    s.turnsLeft -= 1;
    if (s.turnsLeft <= 0) {
      s.cowCut = -1;   // 奶牛猫这一串甩锅结束了
      s.turn = nextAlive(s, s.turn);
      s.turnsLeft = s.flux === 'hot' ? 2 : 1;   // 百变「烫手」：每人的回合都摸两张
      s.hotGiven = s.flux === 'hot' ? s.turn : -1;
      s.phase = 'act';
      ev.push({ t: 'turn', seat: s.turn, turnsLeft: s.turnsLeft });
      turnStarts(s, ev);
      return;
    }
    s.phase = 'act';
    ev.push({ t: 'turn', seat: s.turn, turnsLeft: s.turnsLeft });
  }

  /* ───── 出牌（进入反应窗） ───── */
  function play(s, seat, cards, opts) {
    opts = opts || {};
    const c = checkPlay(s, seat, cards, opts);
    if (!c) throw new Error('illegal play');
    if (s.peek && s.peek.by === seat && s.peek.act == null && s.peek.top === 0 && [ATTACK, TATTACK, SKIP, REVERSE, BOTTOM].indexOf(c.type) >= 0) s.peek.act = 'dodge';   // 看过顶上、接着就躲（大家都看得到）
    for (const id of cards) { s.hands[seat].splice(s.hands[seat].indexOf(id), 1); s.discard.push(id); forgetCard(s, id); }
    s.seq += 1;
    s.pending = {
      by: seat, type: c.type, cards: cards.slice(),
      target: c.needsTarget ? opts.target : -1, named: c.needsName ? opts.named : null,
      nopes: [], passed: [],
    };
    s.phase = 'react';
    return [{ t: 'play', seat, cards: cards.slice(), type: c.type, target: s.pending.target, named: s.pending.named }];
  }

  /* 反应窗：谁还要表态（最后出牌 / 出「不行」的人自己不用） */
  function lastActor(s) { const p = s.pending; return p.nopes.length ? p.nopes[p.nopes.length - 1].seat : p.by; }
  function awaitingReaction(s) {
    if (s.phase !== 'react') return [];
    if (s.flux === 'mute' || s.pending.locked) return [];   // 百变「静音」：谁都不能作废，反应窗直接关；狸花锁死的也一样
    const last = lastActor(s), out = [];
    for (let t = 0; t < s.n; t++) if (s.alive[t] && t !== last && s.pending.passed.indexOf(t) < 0) out.push(t);
    return out;
  }
  function canNope(s, seat) {
    return s.phase === 'react' && s.flux !== 'mute' && !s.pending.locked && s.alive[seat] && seat !== lastActor(s) && countKind(s.hands[seat], NOPE) > 0;
  }
  function nope(s, seat) {
    if (!canNope(s, seat)) throw new Error('illegal nope');
    const id = findKind(s.hands[seat], NOPE);
    s.hands[seat].splice(s.hands[seat].indexOf(id), 1);
    s.discard.push(id);
    forgetCard(s, id);
    s.pending.nopes.push({ seat, card: id });
    s.pending.passed = [];
    s.seq += 1;
    const ev = [{ t: 'nope', seat, card: id, count: s.pending.nopes.length }];
    return ev;
  }
  function pass(s, seat) {
    if (s.phase !== 'react') return [];
    if (s.pending.passed.indexOf(seat) < 0) s.pending.passed.push(seat);
    return [];
  }
  const reactionDone = (s) => s.phase === 'react' && awaitingReaction(s).length === 0;
  const isCancelled = (s) => s.phase === 'react' && s.pending.nopes.length % 2 === 1;

  /* 反应窗关闭：结算（被作废就什么都不发生，牌照样进弃牌堆） */
  function closeReaction(s) {
    if (s.phase !== 'react') throw new Error('no reaction');
    const p = s.pending, ev = [];
    const cancelled = p.nopes.length % 2 === 1;
    s.pending = null;
    s.phase = 'act';
    ev.push({ t: 'resolve', seat: p.by, type: p.type, cancelled, target: p.target, named: p.named });
    // 角色猫「狸花」：作废成功（这张作废最后算数了）就顺手叼走被他作废的那个人一张随机的牌
    if (s.roles) p.nopes.forEach((nx, i) => {
      if (roleOf(s, nx.seat) !== 'tabby') return;
      const won = i % 2 === 0 ? cancelled : !cancelled;   // 第 1、3… 张作废是挡原牌的；第 2、4… 张是挡别人的作废
      const victim = i === 0 ? p.by : p.nopes[i - 1].seat;
      if (!won || victim === nx.seat || !s.alive[victim] || !s.hands[victim].length) return;
      const pick = s.hands[victim][(rand(s) * s.hands[victim].length) | 0];
      moveCard(s, victim, nx.seat, pick, [nx.seat, victim]);
      ev.push({ t: 'role', seat: nx.seat, role: 'tabby', from: victim });
      ev.push({ t: 'steal', from: victim, to: nx.seat, card: pick, idx: 0, priv: [nx.seat, victim], role: 'tabby' });
    });
    if (cancelled) return ev;
    const me = p.by;
    // 角色猫「黑猫」：第一次被索要 / 偷 / 点名——溜走了，什么都不发生
    if (p.type === 'pair' && p.target >= 0 && roleOf(s, p.target) === 'shadow') {   // 黑猫：两张偷牌整局都扑空
      ev.push({ t: 'role', seat: p.target, role: 'shadow', by: me });
      return ev;
    }
    switch (p.type) {
      case SKIP:
        endOneTurn(s, ev);
        break;
      case REVERSE:
        // 转向：出牌方向反过来，然后像「跳过」一样结束一个回合、不摸牌（被甩锅时只顶掉其中一回合；两个人玩就等于跳过）
        s.dir = s.dir === -1 ? 1 : -1;
        ev.push({ t: 'reverse', seat: me, dir: s.dir });
        endOneTurn(s, ev);
        break;
      case BOTTOM:
        // 抽底：这一回合不从顶上摸，改从牌堆最底下摸一张（摸完照常结束这一回合；摸到炸毛猫照样炸）
        if (s.deck.length) ev.push(...takeCard(s, me, s.flux !== 'bottom'));   // 百变「摸底」生效时反过来：抽底变「抽顶」，从最上面摸（2026-11-15 用户）
        break;
      case ATTACK:
      case TATTACK: {
        const left = s.turnsLeft;
        const next = p.type === TATTACK && s.alive[p.target] && p.target !== me ? p.target : nextAlive(s, me);
        s.turn = next;
        // 被甩锅的人再甩：剩下的回合 +2 一起甩走。奶牛猫把 2 减成 1 以后再甩，下家照样是 1 + 2 = 3（2026-11-15 用户：减的那一张跟着传下去）
        const viaCow = left === 1 && s.cowCut === me;
        const chained = (left > 1 && s.hotGiven !== me) || viaCow;   // 烫手给的两次不算被甩锅（2026-11-15 用户：烫手只管普通回合）
        s.turnsLeft = s.rules.stackAttack && chained ? left + 2 : 2;
        s.cowCut = -1; s.hotGiven = -1;   // 被甩锅的回合数不算烫手给的
        if (roleOf(s, next) === 'timid' && s.deck.length) { const top = s.deck.slice(0, 3), m = s.memo[next].deck; for (const id of top) if (m.indexOf(id) < 0) m.push(id); ev.push({ t: 'role', seat: next, role: 'timid', cards: top, priv: [next] }); }   // 角色猫「胆小猫」：被甩锅先偷看 2 张
        if (roleOf(s, next) === 'cow' && s.turnsLeft > 1) { s.turnsLeft = 1; s.cowCut = next; ev.push({ t: 'role', seat: next, role: 'cow' }); }   // 角色猫「奶牛猫」：每次被甩锅少摸 1 张
        ev.push({ t: 'turn', seat: next, turnsLeft: s.turnsLeft, attacked: true });
        if (next !== me) turnStarts(s, ev);
        break;
      }
      case SHUFFLE:
        shuffleIn(s, s.deck);
        s.ins = null;
        s.peek = null;
        for (const m of s.memo) m.deck = [];
        ev.push({ t: 'shuffle', seat: me });
        break;
      case FUTURE: {
        const top = s.deck.slice(0, 3);
        const mate = mateOf(s, me), who = mate >= 0 ? [me, mate] : [me];   // 组队：队友也看得到
        for (const k of who) { const m = s.memo[k].deck; for (const id of top) if (m.indexOf(id) < 0) m.push(id); }
        ev.push({ t: 'future', seat: me, cards: top, priv: who });
        s.peek = { by: me, kind: 'future', top: 0, act: null };
        break;
      }
      case ALTER: {
        const top = s.deck.slice(0, 3);
        const mate = mateOf(s, me), who = mate >= 0 ? [me, mate] : [me];
        for (const k of who) { const m = s.memo[k].deck; for (const id of top) if (m.indexOf(id) < 0) m.push(id); }
        if (top.length >= 2) {
          s.phase = 'alter';
          s.alter = { by: me, cards: top.slice() };
          ev.push({ t: 'alter', seat: me, cards: top, priv: who });
        } else {
          ev.push({ t: 'future', seat: me, cards: top, priv: who }); // 只剩一张：没得排，等于偷看
        }
        break;
      }
      case SWAP: {
        // 整手交换，逗猫棒默认各自留着（规则 swapDefuse 开了就连逗猫棒一起换）；两人都看得到对方换过来的是哪些，别人只知道换了几张、以前记得的全作废
        const a = me, b = p.target;
        if (!s.alive[b]) break;
        const stays = (id) => KIND_OF[id] === DEFUSE && !(s.rules && s.rules.swapDefuse);
        const keepA = s.hands[a].filter(stays), keepB = s.hands[b].filter(stays);
        const moveA = s.hands[a].filter((id) => !stays(id)), moveB = s.hands[b].filter((id) => !stays(id));
        for (const id of moveA.concat(moveB)) forgetCard(s, id);
        s.hands[a] = sortHand(keepA.concat(moveB));
        s.hands[b] = sortHand(keepB.concat(moveA));
        for (const id of moveA) learnHand(s, a, b, id);
        for (const id of moveB) learnHand(s, b, a, id);
        ev.push({ t: 'swap', a, b, toB: moveA.length, toA: moveB.length, cardsA: moveA, cardsB: moveB, priv: [a, b] });
        break;
      }
      case FAVOR:
        if (s.hands[p.target].length) {
          s.phase = 'give';
          s.give = { from: p.target, to: me, left: roleOf(s, me) === 'fat' ? 2 : 1 };
          ev.push({ t: 'askGive', from: p.target, to: me });
        }
        break;
      case FLUX: {
        // 百变：从百变规则堆里抽一条换上（抽完了：除了现在这条，其余洗回去）；「逆行」换上 / 换走时各转一次方向
        if (!s.fluxDeck || !s.fluxDeck.length) s.fluxDeck = shuffleIn(s, FLUX_IDS.filter((id) => id !== s.flux));
        const prev = s.flux || null, rule = s.fluxDeck.pop();
        s.flux = rule;
        if ((prev === 'reverse') !== (rule === 'reverse')) s.dir = s.dir === -1 ? 1 : -1;
        // 九命 / 急救：「每人最多一次」按每次转到这条算（2026-11-15 用户）——转到就重置
        if (rule === 'nine') s.nineUsed = Array.from({ length: s.n }, () => false);
        if (rule === 'catsave') s.saveUsed = Array.from({ length: s.n }, () => false);
        ev.push({ t: 'flux', seat: me, rule, prev, dir: s.dir });
        // 烫手立刻生效、双向都算（用户 2026-11-15）：转到烫手，这个回合马上要摸两次；烫手时把它换走，这回合多出来的那一次也没了
        if (rule === 'hot' && prev !== 'hot' && s.turnsLeft === 1 && s.cowCut !== me) { s.turnsLeft = 2; s.hotGiven = me; ev.push({ t: 'turn', seat: me, turnsLeft: 2 }); }
        else if (prev === 'hot' && rule !== 'hot' && s.hotGiven === me && s.turnsLeft > 1) { s.turnsLeft -= 1; s.hotGiven = -1; ev.push({ t: 'turn', seat: me, turnsLeft: s.turnsLeft }); }
        break;
      }
      case 'pair': {
        // 不再随机抽：对方的手牌打乱顺序扣着摆出来，出牌人自己点一张（stealPick）
        const h = s.hands[p.target];
        if (h.length) {
          s.phase = 'steal';
          s.steal = { by: me, from: p.target, perm: shuffleIn(s, h.slice()) };
          ev.push({ t: 'askSteal', by: me, from: p.target, count: h.length });
        }
        break;
      }
      case 'triple': {
        const id = findKind(s.hands[p.target], p.named);
        if (id != null) {
          moveCard(s, p.target, me, id, 'all');
          ev.push({ t: 'take', from: p.target, to: me, card: id, named: p.named });
        } else {
          ev.push({ t: 'miss', from: p.target, to: me, named: p.named });
        }
        break;
      }
      case 'five':
        if (s.discard.some((id) => KIND_OF[id] !== BOOM)) {
          s.phase = 'pick';
          s.pick = { by: me };
          ev.push({ t: 'askPick', seat: me });
        }
        break;
    }
    return ev;
  }

  function give(s, seat, id) {
    if (s.phase !== 'give' || s.give.from !== seat || s.hands[seat].indexOf(id) < 0) throw new Error('illegal give');
    const to = s.give.to;
    moveCard(s, seat, to, id, [seat, to]);
    // 角色猫「胖橘」：他出的索要，对方要给两张——给完第一张接着再挑一张
    if (s.give.left > 1 && s.hands[seat].length) { s.give.left -= 1; return [{ t: 'give', from: seat, to, card: id, priv: [seat, to] }, { t: 'askGive', from: seat, to }]; }
    s.give = null;
    s.phase = 'act';
    return [{ t: 'give', from: seat, to, card: id, priv: [seat, to] }];   // 胖橘被索要不补牌（2026-11-15 平衡：索要本来就由他自己挑）
  }

  function pickDiscard(s, seat, id) {
    if (s.phase !== 'pick' || s.pick.by !== seat) throw new Error('illegal pick');
    const i = s.discard.indexOf(id);
    if (i < 0 || KIND_OF[id] === BOOM) throw new Error('illegal pick');
    s.discard.splice(i, 1);
    s.hands[seat].push(id);
    s.hands[seat] = sortHand(s.hands[seat]);
    for (let k = 0; k < s.n; k++) learnHand(s, k, seat, id);
    s.pick = null;
    s.phase = 'act';
    return [{ t: 'pick', seat, card: id }];
  }

  /* 两张一样偷牌：点对方扣着的第 idx 张（perm 是开局就打乱好的顺序，idx 公开、是哪张只有两个人知道） */
  function stealPick(s, seat, idx) {
    if (s.phase !== 'steal' || s.steal.by !== seat) throw new Error('illegal steal');
    const perm = s.steal.perm;
    if (!(idx >= 0 && idx < perm.length) || (idx | 0) !== idx) throw new Error('illegal steal index');
    const from = s.steal.from, id = perm[idx];
    moveCard(s, from, seat, id, [seat, from]);
    s.steal = null;
    s.phase = 'act';
    const ev = [{ t: 'steal', from, to: seat, card: id, idx, priv: [seat, from] }];
    return ev;
  }

  /* 「重排」：按 order（就是 s.alter.cards 换个顺序）放回牌堆顶；别人之前知道的这几张的位置作废 */
  function alterTop(s, seat, order) {
    if (s.phase !== 'alter' || s.alter.by !== seat) throw new Error('illegal alter');
    const cards = s.alter.cards;
    if (!Array.isArray(order) || order.length !== cards.length || order.some((id) => cards.indexOf(id) < 0) || new Set(order).size !== order.length) throw new Error('illegal alter order');
    s.deck.splice(0, order.length, ...order);
    const mate = mateOf(s, seat);
    for (let k = 0; k < s.n; k++) if (k !== seat && k !== mate) s.memo[k].deck = s.memo[k].deck.filter((id) => cards.indexOf(id) < 0);
    if (s.ins && s.ins.seen) s.ins.seen = null;   // 改命动过顶上几张：大家看到它塞在最上 / 最底的那点信息不准了
    s.alter = null;
    s.phase = 'act';
    s.peek = { by: seat, kind: 'alter', top: 0, act: null };
    return [{ t: 'altered', seat, cards: order.slice(), priv: mate >= 0 ? [seat, mate] : [seat] }];
  }

  /* ───── 摸牌（结束一个回合） ───── */
  function draw(s, seat) {
    if (s.phase !== 'act' || s.turn !== seat) throw new Error('illegal draw');
    return takeCard(s, seat, s.flux === 'bottom');   // 百变「摸底」：结束回合从最底下摸
  }
  // 摸一张（bottom = 从最底下摸，抽底用）：事件带 bottom 标记，动画从牌堆底下抽
  function takeCard(s, seat, bottom) {
    if (s.peek && !bottom) { if (s.peek.by === seat && s.peek.act == null && s.peek.top === 0) s.peek.act = 'draw'; s.peek.top += 1; }
    const id = bottom ? s.deck.pop() : s.deck.shift();
    const B = bottom ? { bottom: true } : null;
    s.seq += 1;
    if (s.ins) { if (bottom) s.ins.bot += 1; else s.ins.top += 1; }
    const ev = [];
    const topSeen = s.flux === 'peektop' && !bottom;   // 百变「掀顶」：顶上那张人人看得见，谁摸走了大家都知道
    for (let k = 0; k < s.n; k++) { // 知道牌堆顶是哪张的人，也就知道它进了谁手里
      const d = s.memo[k].deck, i = d.indexOf(id);
      if (i >= 0) d.splice(i, 1);
      if ((i >= 0 || topSeen) && KIND_OF[id] !== BOOM) learnHand(s, k, seat, id);
    }
    if (KIND_OF[id] !== BOOM) {
      s.hands[seat].push(id);
      s.hands[seat] = sortHand(s.hands[seat]);
      ev.push(Object.assign({ t: 'draw', seat, card: id, priv: [seat] }, B));
      endOneTurn(s, ev);
      return ev;
    }
    ev.push(Object.assign({ t: 'boom', seat, card: id }, B));
    s.ins = null;
    const def = findKind(s.hands[seat], DEFUSE);
    if (def != null) {
      s.hands[seat].splice(s.hands[seat].indexOf(def), 1);
      s.discard.push(def);
      forgetCard(s, def);
      s.phase = 'defuse';
      s.defuse = { by: seat, card: id };
      ev.push({ t: 'defuse', seat, card: def, kitten: id });
      return ev;
    }
    // 百变「双猫急救」：没逗猫棒，交出一对一样的猫牌（万能猫能顶）当逗猫棒用，照样塞回去
    // 急救（用户 2026-11-15）：交出一对相同的牌，炸毛猫随机放回牌堆；每人最多一次
    const pair = s.flux === 'catsave' && !(s.saveUsed && s.saveUsed[seat]) ? catPairIds(s.hands[seat]) : null;
    if (pair) {
      if (!s.saveUsed) s.saveUsed = Array.from({ length: s.n }, () => false);
      s.saveUsed[seat] = true;
      for (const c of pair) { s.hands[seat].splice(s.hands[seat].indexOf(c), 1); s.discard.push(c); forgetCard(s, c); }
      ev.push({ t: 'defuse', seat, card: pair[0], extra: pair[1], kitten: id, save: 'cats' });
      ev.push(...reinsertRandom(s, seat, id, 'save'));
      endOneTurn(s, ev);
      return ev;
    }
    // 百变「九命」：每人一局一次，不出局；炸毛猫随机塞回牌堆（谁也不知道在哪），这一回合照常结束
    if (s.flux === 'nine' && s.nineUsed && !s.nineUsed[seat]) {
      s.nineUsed[seat] = true;
      ev.push(...reinsertRandom(s, seat, id, 'nine'));
      endOneTurn(s, ev);
      return ev;
    }
    // 组队：队友手里有逗猫棒 → 停下来问队友要不要救（救了：队友的逗猫棒用掉，被救的人自己塞回去）
    const mate = mateOf(s, seat);
    if (mate >= 0 && s.alive[mate] && findKind(s.hands[mate], DEFUSE) != null) {
      s.phase = 'rescue';
      s.rescue = { by: mate, for: seat, card: id };
      ev.push({ t: 'askRescue', by: mate, for: seat });
      return ev;
    }
    return eliminate(s, seat, id, ev);
  }
  /* 九命 / 急救：炸毛猫随机塞回牌堆（谁也不挑位置）。动画按真实高度开缝（2026-11-15 用户），所以和「看得出大概位置」一样公开一个粗略高度 vis，机器猫也按它估 */
  function reinsertRandom(s, seat, id, why) {
    const pos = (rand(s) * (s.deck.length + 1)) | 0;
    s.deck.splice(pos, 0, id);
    for (let k = 0; k < s.n; k++) s.memo[k].deck = s.memo[k].deck.filter((x) => x !== id);
    const last = s.deck.length - 1;
    const vis = pos <= 0 ? 0 : pos >= last ? 1 : Math.min(7 / 8, Math.max(1 / 8, Math.round((pos / Math.max(1, last)) * 8) / 8));
    s.ins = { by: seat, size: s.deck.length, top: 0, bot: 0, vis, seen: vis === 0 ? 'top' : vis === 1 ? 'bottom' : null, card: vis === 0 || vis === 1 ? id : null };
    s.peek = null;
    s.seq += 1;
    return [{ t: 'nine', seat, card: id, size: s.deck.length, vis, why }];
  }
  // 炸毛出局：手牌连同炸毛猫全进弃牌堆，剩下的回合作废
  function eliminate(s, seat, id, ev) {
    s.alive[seat] = false;
    s.outOrder.push(seat);
    const hand = s.hands[seat];
    s.hands[seat] = [];
    for (const c of hand) { s.discard.push(c); forgetCard(s, c); }
    s.discard.push(id);
    for (const m of s.memo) m.hands[seat] = [];
    ev.push({ t: 'out', seat, cards: hand });
    const teams = isTeam(s) ? new Set(s.alive.map((a, k) => (a ? teamOf(k) : -1)).filter((x) => x >= 0)) : null;
    if (teams ? teams.size <= 1 : aliveCount(s) <= 1) {
      s.phase = 'over';
      s.winner = s.alive.indexOf(true);
      if (teams) s.winnerTeam = teamOf(s.winner);   // 组队：剩下的那一队赢（只剩一人也算）
      ev.push({ t: 'win', seat: s.winner, team: teams ? s.winnerTeam : undefined });
      return ev;
    }
    s.turn = nextAlive(s, seat);
    s.turnsLeft = s.flux === 'hot' ? 2 : 1;
    s.hotGiven = s.flux === 'hot' ? s.turn : -1;
    s.phase = 'act';
    ev.push({ t: 'turn', seat: s.turn, turnsLeft: s.turnsLeft });
    turnStarts(s, ev);
    return ev;
  }

  /* 组队：队友决定救不救（yes = 交出自己的逗猫棒） */
  function rescue(s, seat, yes) {
    if (s.phase !== 'rescue' || s.rescue.by !== seat) throw new Error('illegal rescue');
    const r = s.rescue, ev = [];
    s.rescue = null;
    s.seq += 1;
    const def = yes ? findKind(s.hands[seat], DEFUSE) : null;
    if (def == null) { ev.push({ t: 'noRescue', by: seat, for: r.for }); return eliminate(s, r.for, r.card, ev); }
    s.hands[seat].splice(s.hands[seat].indexOf(def), 1);
    s.discard.push(def);
    forgetCard(s, def);
    s.phase = 'defuse';
    s.defuse = { by: r.for, card: r.card };
    ev.push({ t: 'defuse', seat: r.for, card: def, kitten: r.card, from: seat, rescue: true });
    return ev;
  }

  /* pos：0 = 最上面，deck.length = 最底下；rand = 玩家点的「随机」（或倒计时到了随机塞），连他自己都不知道在哪 */
  function insertKitten(s, seat, pos, rand) {
    if (s.phase !== 'defuse' || s.defuse.by !== seat) throw new Error('illegal insert');
    pos = Math.max(0, Math.min(s.deck.length, pos | 0));
    const id = s.defuse.card;
    s.deck.splice(pos, 0, id);
    for (let k = 0; k < s.n; k++) if (k !== seat) s.memo[k].deck = []; // 别人不知道塞在哪，原先记的位置全乱了
    if (s.memo[seat].deck.indexOf(id) < 0) s.memo[seat].deck.push(id);
    s.defuse = null;
    // 规则「看得出大概位置」：动画插在牌堆的真实高度，所有人都看得到——但只发一个粗略的高度 vis（0 = 最上、1 = 最底、中间取到 1/8），
    // 不发第几张：懂技术的人抓网络数据，拿到的也只和肉眼看到的一样多
    let vis = null;
    const R0 = rulesOf(s);
    if (!rand && R0.insertSeen !== false) {
      const last = s.deck.length - 1;
      vis = pos <= 0 ? 0 : pos >= last ? 1 : Math.min(7 / 8, Math.max(1 / 8, Math.round((pos / last) * 8) / 8));
    }
    // seen：别人「看得出」它在最上 / 最底（中间的看不准，不算知道）；之后从那头摸走一张、洗牌、改命、再塞一只就作废
    // vis 也放进公开历史：动画里人人看得到的那个粗略高度，机器猫也按它估（2026-11-14 重训）
    s.ins = { by: seat, size: s.deck.length, top: 0, bot: 0, vis, seen: vis === 0 ? 'top' : vis === 1 ? 'bottom' : null, card: vis === 0 || vis === 1 ? id : null };
    s.seq += 1;
    s.peek = null;
    const ev = [{ t: 'insert', seat, card: id, pos, size: s.deck.length, vis, priv: [seat] }];
    // 百变「明塞」：人人知道塞在第几张（自己点「随机」的除外）——等于所有人都记住了这张牌在牌堆里的位置
    if (!rand && R0.insertSeen === 'exact') {
      for (let k = 0; k < s.n; k++) if (s.memo[k].deck.indexOf(id) < 0) s.memo[k].deck.push(id);
      ev[0].at = pos;
    }
    endOneTurn(s, ev);
    return ev;
  }

  /* 现在该谁做决定（反应窗返回还没表态的所有人） */
  function whoActs(s) {
    switch (s.phase) {
      case 'act': return [s.turn];
      case 'react': return awaitingReaction(s);
      case 'give': return [s.give.from];
      case 'pick': return [s.pick.by];
      case 'defuse': return [s.defuse.by];
      case 'alter': return [s.alter.by];
      case 'steal': return [s.steal.by];
      case 'rescue': return [s.rescue.by];
      default: return [];
    }
  }

  /* 给某个座位看的公开信息 + 他自己的私有知识（机器人只能用这个） */
  function view(s, seat) {
    const memo = s.memo[seat];
    const known = [];
    for (const id of memo.deck) { const pos = s.deck.indexOf(id); if (pos >= 0) known.push({ pos, id }); }
    if (s.flux === 'peektop' && s.deck.length && !known.some((x) => x.pos === 0)) known.push({ pos: 0, id: s.deck[0] });   // 百变「掀顶」
    known.sort((a, b) => a.pos - b.pos);
    return {
      me: seat, n: s.n, rules: rulesOf(s), flux: s.flux || null, nineUsed: s.nineUsed ? s.nineUsed.slice() : null,
      roles: s.roles ? s.roles.slice() : null, roleUsed: s.roleUsed ? s.roleUsed.slice() : null,
      mate: mateOf(s, seat), rescue: s.rescue ? { by: s.rescue.by, for: s.rescue.for } : null, winnerTeam: s.winnerTeam != null ? s.winnerTeam : -1,
      hand: s.hands[seat].slice(),
      counts: s.hands.map((h) => h.length),
      alive: s.alive.slice(),
      deckSize: s.deck.length,
      kittens: kittensInDeck(s),
      discard: s.discard.slice(),
      known,
      handKnown: memo.hands.map((h) => h.slice()),
      turn: s.turn, turnsLeft: s.turnsLeft, phase: s.phase, dir: s.dir === -1 ? -1 : 1,
      pending: s.pending && { by: s.pending.by, type: s.pending.type, target: s.pending.target, named: s.pending.named, nopes: s.pending.nopes.length, cards: s.pending.cards.slice() },
      give: s.give, pick: s.pick,
      defuse: s.defuse && (s.defuse.by === seat ? { by: seat, card: s.defuse.card } : { by: s.defuse.by }),
      alter: s.alter && (s.alter.by === seat ? { by: seat, cards: s.alter.cards.slice() } : { by: s.alter.by }),
      steal: s.steal && { by: s.steal.by, from: s.steal.from, count: s.steal.perm.length },
      peek: s.peek ? Object.assign({}, s.peek) : null, // 公开：最近谁窥探 / 改命过顶上三张、之后从顶上摸走了几张、他自己接着是躲了（dodge）还是摸了（draw）
      ins: s.ins ? Object.assign({}, s.ins) : null, // 公开：最近一次塞回炸毛猫的人、塞完后牌堆张数、之后从顶 / 底各摸走几张
      removed: s.removed.slice(), // 收进盒子的牌种是公开的（多余的炸毛猫 / 逗猫棒）
    };
  }

  /* 事件去敏：priv 不含 seat 的，去掉具体是哪张 / 位置 */
  function redactEvents(events, seat) {
    return events.map((e) => {
      if (!e.priv || e.priv.indexOf(seat) >= 0) { const o = Object.assign({}, e); delete o.priv; return o; }
      const o = Object.assign({}, e);
      delete o.priv; delete o.card; delete o.cards; delete o.pos; delete o.cardsA; delete o.cardsB;
      if (e.t === 'future' || e.t === 'alter' || e.t === 'altered') o.count = e.cards.length;
      return o;
    });
  }

  return {
    BOOM, DEFUSE, NOPE, ATTACK, TATTACK, SKIP, BOTTOM, FAVOR, SHUFFLE, FUTURE, ALTER, SWAP, WILD, REVERSE, FLUX, FLUX_RULES, rulesOf, catPairIds, isTeam, mateOf, teamOf, rescue, ROLES, roleOf, CATS, ACTIONS, COUNTS, KINDS, NAMES, KIND_OF, DECK_SIZE,
    MIN_PLAYERS, MAX_PLAYERS, TWO_DECKS_FROM, BASE_SIZE, DECK_OF, LEGACY_SIZES, inSecondDeck, usesSecondDeck, RULE_OPTIONS, DEFAULT_RULES, normalizeRules, swapsInPlay, deckQuota,
    kindOf, isCat, catLike, cardName, sortHand, rand, shuffleIn,
    createGame, cloneGame, aliveCount, nextAlive, countKind, findKind, kittensInDeck,
    classify, validTargets, checkPlay, play, awaitingReaction, canNope, nope, pass, reactionDone, isCancelled, closeReaction,
    give, pickDiscard, alterTop, stealPick, draw, insertKitten, whoActs, view, redactEvents,
  };
});
