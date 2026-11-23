/* 拱猪 · 战绩（window.GongzhuStats；Node 下 require 得到纯函数部分，测试在 tests/gongzhu-stats.test.js）
 *
 * 2026-11-22 定：战绩先只存本机（不上传、不接小鱼干、不做排行榜）。单机、联机都记；教程 / 动画演示 / 观战不记。
 *
 * 记录方式：gongzhu.js 在「一局结束」（单机 finishRound、联机 round 事件、联机快照恢复到局终）和「联机叫停」处调 note(snap)。
 *   每局先把「我」这一局的情况记进 live（按局号去重，重复调用无害），这样中途刷新不丢；
 *   snap.over（一盘结束）时把 live 落成 games 里的一条，并把这一盘的 id 记进 done，防止快照重放时再记一次。
 *   中途放弃（重开一盘、离开房间）的盘不落成一条，只把 abandoned 加一：
 *     · 同一槽位（单机 / 联机各一个）来了新一盘的 id，而旧 live 里已经记了至少一局 → 旧的算放弃；
 *     · 打开战绩时 reconcile：单机 live 和存档里那一盘（gz.match.v1 的 seed）对不上，或联机 live 超过 12 小时没动 → 算放弃。
 *
 * ── 数据格式 gz.stats.v1 ──
 * { v: 1,
 *   games: [Game]          // 最早的在前，最多 CAP（500）条；更早的折叠进 fold
 *   fold: Agg | null       // 折叠掉的老盘的汇总（就是汇总器 step() 的中间状态，所以名次 / 连续不当猪 / 徽章都接得上）
 *   abandoned: n           // 中途放弃的盘数
 *   live: { solo: Live|null, net: Live|null }
 *   done: { id: 落成时间 } // 最近落成过的盘（去重用，只留 24 小时 / 60 条） }
 * Live = { id, t0, at, r: { 局号: Round } }
 * Round = { s: 我这局得分, ah: 全红 0/1, gs: 大满贯 0/1, pig: 吃到猪 0/1, sh: 收到羊 0/1, dbl: 吃到变压器 0/1, au: 这局托管过 0/1 }
 * Game = {
 *   t: 结束时间(ms), m: 's' 单机 | 'n' 联机,
 *   tiers: 单机三家机器人档位 ['easy'|'normal'|'hard' ×3]，联机 null,
 *   rules: { end, hearts, allHeartsPig, expose, doublerAlone, leader, spadeTwoFirst }（规则全集就 7 个开关，整份存下）,
 *   tot: 四家累计分（[0] 是我）, rank: 我的名次 1..4, pig: 我当猪, stop: 「不设终点」被叫停（不计名次 / 当猪统计）,
 *   n: 这一盘打了几局, seen: 其中有明细的局数（联机中途加入、没看着打的局没有明细）,
 *   ah, gs, eatPig, sheep, dbl: 我全红 / 大满贯 / 吃到猪 / 收到羊 / 吃到变压器的局数, auto: 我托管过的局数 }
 *
 * 名次的并列规则（与盘终结算页一致）：按累计分「同分同名次」——名次 = 1 + 累计分严格高于我的人数，
 * 所以并列第一是两个 1、下一位是 3（1、1、3、4）。当猪 = 累计分最低（并列最低都当猪；联机以服务器给的 losers 为准）。
 * 叫停的盘名次照记（给最近十盘看），但不进名次分布、平均名次、当猪率和「连续不当猪」。 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./gongzhu-rules.js') : root.GongzhuRules);
  if (isNode) module.exports = api;
  else root.GongzhuStats = Object.assign(root.GongzhuStats || {}, api, api.browser(root));
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  const VER = 1;
  const KEY = 'gz.stats.v1';
  const CAP = 500;
  const NET_STALE = 12 * 3600e3;
  const TIERS = ['easy', 'normal', 'hard'];
  const RULE_KEYS = ['end', 'hearts', 'allHeartsPig', 'expose', 'doublerAlone', 'leader', 'spadeTwoFirst'];

  /* 徽章：顺序就是展示顺序。test(g, a) 在汇总器按时间顺序逐盘走的时候判定，第一次满足记下那一盘的时间 */
  const BADGES = [
    { id: 'first', name: '初登场', how: '打完第一盘', test: () => true },
    { id: 'top', name: '头名', how: '一盘拿第一', test: (g) => !g.stop && g.rank === 1 },
    { id: 'ah', name: '全红', how: '一局收齐十三张红桃', test: (g) => g.ah > 0 },
    { id: 'gs', name: '大满贯', how: '一局红桃、猪、羊、变压器全收', test: (g) => g.gs > 0 },
    { id: 'five', name: '五连不当猪', how: '连续五盘不当猪', test: (g, a) => a.streak.best >= 5 },
    { id: 'clean', name: '片猪不沾', how: '一整盘（至少三局）没吃过猪', test: (g) => !g.stop && g.n >= 3 && g.seen === g.n && g.eatPig === 0 },
    { id: 'hard', name: '胜高手', how: '对三位高手拿第一', test: (g) => !g.stop && g.rank === 1 && !!g.tiers && g.tiers.every((t) => t === 'hard') },
    { id: 'ten', name: '十盘', how: '打完十盘', test: (g, a) => a.games >= 10 },
  ];

  function empty() { return { v: VER, games: [], fold: null, abandoned: 0, live: { solo: null, net: null }, done: {} }; }

  function normalize(x) {
    if (!x || x.v !== VER || !Array.isArray(x.games)) return empty();
    const s = Object.assign(empty(), x);
    s.live = Object.assign({ solo: null, net: null }, x.live || {});
    s.done = x.done && typeof x.done === 'object' ? x.done : {};
    s.abandoned = x.abandoned | 0;
    return s;
  }

  function roundOf(last) {
    const mine = (last.captured && last.captured[0]) || [];
    const sc = R.scoreCaptured(mine, last.ctx || {});
    return {
      s: (last.scores && last.scores[0]) | 0,
      ah: sc.allHearts ? 1 : 0, gs: sc.grandSlam ? 1 : 0,
      pig: sc.pig ? 1 : 0, sh: sc.sheep ? 1 : 0, dbl: sc.doubler ? 1 : 0, au: 0,
    };
  }
  function pickRules(rules) {
    const n = R.normalizeRules(rules), out = {};
    for (const k of RULE_KEYS) out[k] = n[k];
    return out;
  }
  function liveRounds(live) { return live ? Object.keys(live.r).length : 0; }

  /* 一局结束 / 一盘结束都调这个（纯函数式：就地改 store 并返回它）。
   * snap = { mode: 'solo'|'net', id, rules, totals[4], last: { roundNo, captured[4][], scores[4], ctx } | null,
   *          over, losers: 联机服务器给的当猪座位（已转成「我 = 0」）| null, tiers: 单机三家档位 | null, auto: 这一局我托管过 } */
  function note(store, snap, now) {
    now = now || Date.now();
    if (!snap || !snap.id) return store;
    if (store.done[snap.id]) return store;   // 这一盘已经落成过（联机快照重放）
    const slot = snap.mode === 'net' ? 'net' : 'solo';
    let live = store.live[slot];
    if (live && live.id !== snap.id) {
      if (liveRounds(live)) store.abandoned++;
      live = null;
    }
    if (!live) live = store.live[slot] = { id: snap.id, t0: now, at: now, r: {} };
    live.at = now;
    const L = snap.last;
    if (L && L.captured && L.roundNo != null) {
      const k = String(L.roundNo);
      if (!live.r[k]) live.r[k] = roundOf(L);
      if (snap.auto) live.r[k].au = 1;
    }
    if (snap.over) finish(store, slot, snap, now);
    return store;
  }

  function finish(store, slot, snap, now) {
    const live = store.live[slot];
    store.live[slot] = null;
    if (!liveRounds(live)) return;   // 一局都没看着打（比如进房时这一盘已经结束）：不记
    const tot = snap.totals.slice(0, 4).map((x) => x | 0);
    const rules = pickRules(snap.rules);
    const stop = rules.end === 'none';   // 「不设终点」不会自己结束，结束了就是被叫停
    const losers = stop ? [] : Array.isArray(snap.losers) ? snap.losers : R.matchLosers(tot);
    const rs = Object.values(live.r);
    const sum = (k) => rs.reduce((a, r) => a + (r[k] | 0), 0);
    const n = Math.max(snap.last && snap.last.roundNo | 0, ...Object.keys(live.r).map(Number));
    store.games.push({
      t: now, m: slot === 'net' ? 'n' : 's',
      tiers: slot === 'solo' && Array.isArray(snap.tiers) ? snap.tiers.slice(0, 3) : null,
      rules, tot,
      rank: 1 + tot.filter((x) => x > tot[0]).length,
      pig: losers.includes(0), stop,
      n, seen: rs.length,
      ah: sum('ah'), gs: sum('gs'), eatPig: sum('pig'), sheep: sum('sh'), dbl: sum('dbl'), auto: sum('au'),
    });
    store.done[snap.id] = now;
    const ids = Object.keys(store.done).filter((id) => now - store.done[id] < 24 * 3600e3).sort((a, b) => store.done[b] - store.done[a]).slice(0, 60);
    store.done = Object.fromEntries(ids.map((id) => [id, store.done[id]]));
    if (store.games.length > CAP) {
      const old = store.games.splice(0, store.games.length - CAP);
      store.fold = old.reduce(step, store.fold ? clone(store.fold) : emptyAgg());
    }
  }

  /* 打开战绩时对一遍账：存档里已经不是这一盘了（重开 / 存档没了）→ 单机 live 算放弃；联机 live 太久没动 → 算放弃 */
  function reconcile(store, soloSeedId, now) {
    now = now || Date.now();
    const s = store.live.solo;
    if (s && s.id !== soloSeedId) { if (liveRounds(s)) store.abandoned++; store.live.solo = null; }
    const n = store.live.net;
    if (n && now - (n.at || n.t0 || 0) > NET_STALE) { if (liveRounds(n)) store.abandoned++; store.live.net = null; }
    return store;
  }

  /* ───── 汇总器（纯函数） ───── */

  function emptyAgg() {
    return {
      games: 0, rounds: 0, seen: 0, stops: 0, ranked: 0, dist: [0, 0, 0, 0], rankSum: 0, pigs: 0,
      streak: { cur: 0, best: 0 }, tiers: {},
      ah: 0, gs: 0, eatPig: 0, sheep: 0, dbl: 0, auto: 0, badges: {},
    };
  }
  function clone(a) { return JSON.parse(JSON.stringify(a)); }
  function tierKey(g) {
    if (g.m === 'n') return 'net';
    const t = g.tiers || [];
    return t.length && t.every((x) => x === t[0]) && TIERS.includes(t[0]) ? t[0] : 'mix';
  }
  function step(a, g) {
    a.games++; a.rounds += g.n | 0; a.seen += g.seen | 0;
    for (const k of ['ah', 'gs', 'eatPig', 'sheep', 'dbl', 'auto']) a[k] += g[k] | 0;
    if (g.stop) a.stops++;
    else {
      a.ranked++; a.dist[g.rank - 1]++; a.rankSum += g.rank;
      if (g.pig) { a.pigs++; a.streak.cur = 0; } else { a.streak.cur++; a.streak.best = Math.max(a.streak.best, a.streak.cur); }
      const k = tierKey(g), T = a.tiers[k] || (a.tiers[k] = { n: 0, rankSum: 0, pigs: 0, dist: [0, 0, 0, 0] });
      T.n++; T.rankSum += g.rank; T.pigs += g.pig ? 1 : 0; T.dist[g.rank - 1]++;
    }
    for (const b of BADGES) if (!a.badges[b.id] && b.test(g, a)) a.badges[b.id] = g.t;
    return a;
  }
  const ratio = (x, n) => (n ? x / n : null);

  function summarize(store) {
    store = normalize(store);
    const a = store.games.reduce(step, store.fold ? clone(store.fold) : emptyAgg());
    const order = ['easy', 'normal', 'hard', 'mix', 'net'];
    return {
      games: a.games, rounds: a.rounds, ranked: a.ranked, stops: a.stops, abandoned: store.abandoned,
      dist: a.dist.slice(),
      avgRank: ratio(a.rankSum, a.ranked),
      pigs: a.pigs, pigRate: ratio(a.pigs, a.ranked),
      avgRounds: ratio(a.rounds, a.games),
      streakBest: a.streak.best, streakCur: a.streak.cur,
      tiers: order.filter((k) => a.tiers[k]).map((k) => {
        const T = a.tiers[k];
        return { key: k, n: T.n, avgRank: T.rankSum / T.n, pigRate: T.pigs / T.n, dist: T.dist.slice() };
      }),
      recent: store.games.slice(-10),
      counts: { ah: a.ah, gs: a.gs, eatPig: a.eatPig, sheep: a.sheep, dbl: a.dbl, auto: a.auto, seen: a.seen },
      badges: BADGES.map((b) => ({ id: b.id, name: b.name, how: b.how, got: a.badges[b.id] || 0 })),
      live: !!(store.live.solo || store.live.net),
    };
  }

  /* ───── 演示数据（?demo=1）：固定种子，40 盘，各档位都有，夹一盘联机叫停 ───── */
  function demoStore(count, seed, now) {
    count = count || 40; now = now || Date.UTC(2026, 10, 22, 12);
    let x = (seed || 387) >>> 0;   // 387：挑了一个最近十盘名次有起有落的种子
    const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
    const s = empty();
    const pickTier = (i) => (i < 12 ? 'easy' : i < 28 ? 'normal' : 'hard');
    for (let i = 0; i < count; i++) {
      const net = i % 9 === 7, stop = i === 30;
      const tier = pickTier(i), mixed = i % 11 === 5;
      const skill = net ? 0.45 : tier === 'easy' ? 0.62 : tier === 'normal' ? 0.48 : 0.36;
      const u = rnd();
      let rank = u < skill * 0.55 ? 1 : u < skill ? 2 : u < 0.45 + skill * 0.5 ? 3 : 4;
      if (rank === 1 && tier === 'hard' && !net && !mixed) rank = 2;   // 演示里留几枚没拿到的徽章（胜高手 / 大满贯）
      const n = 5 + Math.floor(rnd() * 9);
      const meTot = rank === 1 ? 120 + Math.round(rnd() * 300) : rank === 2 ? -150 + Math.round(rnd() * 200) : rank === 3 ? -500 + Math.round(rnd() * 250) : -1000 - Math.round(rnd() * 160);
      const others = [480 - Math.round(rnd() * 200), -300 + Math.round(rnd() * 200), -1050 + Math.round(rnd() * 40)];
      const tot = [meTot].concat(others).map((v) => Math.round(v / 5) * 5);
      tot[0] = meTot;   // 名次以 rank 为准（演示不追求四家分一致）
      const eatPig = rank === 4 ? 2 + Math.floor(rnd() * 3) : Math.floor(rnd() * (rank === 1 ? 1.4 : 3));
      s.games.push({
        t: now - (count - i) * 86400e3 * 0.7 - Math.round(rnd() * 3600e3 * 5),
        m: net ? 'n' : 's', tiers: net ? null : mixed ? ['hard', 'normal', 'easy'] : [tier, tier, tier],
        rules: pickRules(stop ? { end: 'none' } : i % 13 === 3 ? { end: 'rounds10' } : {}),
        tot, rank, pig: !stop && rank === 4, stop,
        n, seen: n, ah: i === 9 || i === 33 ? 1 : 0, gs: 0,
        eatPig, sheep: Math.floor(rnd() * 3), dbl: Math.floor(rnd() * 2), auto: i % 6 === 0 ? 1 : 0,
      });
    }
    s.abandoned = 3;
    return s;
  }

  /* ───── 浏览器部分：localStorage 读写、给 gongzhu.js 的 note、open() ───── */
  function browser(root) {
    if (typeof root.localStorage === 'undefined' && typeof root.document === 'undefined') return {};
    const qs = new URLSearchParams(root.location ? root.location.search : '');
    const PV = /^[abc]$/.test(qs.get('gzstats') || '') ? qs.get('gzstats') : null;   // 战绩页三版预览，用户挑定前线上不露入口
    const DEMO = !!PV && qs.get('demo') === '1';
    const read = () => { try { return normalize(JSON.parse(root.localStorage.getItem(KEY) || 'null')); } catch (_) { return empty(); } };
    const write = (s) => { try { root.localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* 无痕模式：不记也能玩 */ } };
    function soloId() {
      try { const sv = JSON.parse(root.localStorage.getItem('gz.match.v1') || 'null'); return sv && sv.match && sv.match.seed != null ? 's:' + sv.match.seed : null; } catch (_) { return null; }
    }
    const B = {
      KEY,
      variant: PV,
      picked: false,   // 用户还没在三版里挑定：菜单可以据此先不露「战绩」入口
      note(snap) { const s = read(); note(s, snap); write(s); },
      load() { const s = read(); reconcile(s, soloId()); write(s); return s; },
      data() { return DEMO ? demoStore() : B.load(); },
      summary() { return summarize(B.data()); },
      open(opts) {
        const UI = root.GongzhuStatsUI;
        if (!UI) return;
        const v = (opts && opts.variant) || B.variant || 'a';
        const store = opts && opts.empty ? empty() : B.data();
        UI.open(v, summarize(store), store, B);
      },
      close() { if (root.GongzhuStatsUI) root.GongzhuStatsUI.close(); },
    };
    if (PV && root.document) {
      const go = () => setTimeout(() => B.open({ empty: qs.get('empty') === '1' }), 300);
      if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', go); else go();
    }
    return B;
  }

  return { VER, CAP, BADGES, empty, normalize, note, reconcile, summarize, step, emptyAgg, tierKey, demoStore, browser };
});
