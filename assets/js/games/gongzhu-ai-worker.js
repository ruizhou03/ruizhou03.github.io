/* 拱猪 AI 后台线程：搜索类 AI 每步几十毫秒，放这里免得卡住动画。
 * 出牌 { id, round, seat, tier, seed } → { id, card }
 * 亮牌 { id, kind: 'expose', round, seat, tier, seed } → { id, cards } */
importScripts('/assets/js/games/gongzhu-rules.js' + self.location.search, '/assets/js/games/gongzhu-ai.js' + self.location.search);

let netLoaded = false;
self.onmessage = function (e) {
  const { id, kind, round, seat, tier, seed } = e.data;
  if (tier === 'normal' && !netLoaded) {
    try { importScripts('/assets/js/games/gongzhu-dmc.js' + self.location.search); } catch (_) { /* 退回 counting */ }
    netLoaded = true;
  }
  const rng = GongzhuRules.makeRng(seed);
  if (kind === 'expose') { self.postMessage({ id, cards: GongzhuAI.exposerForTier(tier)(round, seat, rng) }); return; }
  const card = GongzhuAI.policyForTier(tier)(round, seat, rng);
  self.postMessage({ id, card });
};
