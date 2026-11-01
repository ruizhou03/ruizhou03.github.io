/* 拱猪 AI 后台线程：搜索类 AI 每步几十毫秒，放这里免得卡住动画。
 * 消息 { id, round, seat, tier, seed } → { id, card } */
importScripts('/assets/js/games/gongzhu-rules.js' + self.location.search, '/assets/js/games/gongzhu-ai.js' + self.location.search);

let netLoaded = false;
self.onmessage = function (e) {
  const { id, round, seat, tier, seed } = e.data;
  if (tier === 'normal' && !netLoaded) {
    try { importScripts('/assets/js/games/gongzhu-dmc.js' + self.location.search); } catch (_) { /* 退回 counting */ }
    netLoaded = true;
  }
  const rng = GongzhuRules.makeRng(seed);
  const card = GongzhuAI.policyForTier(tier)(round, seat, rng);
  self.postMessage({ id, card });
};
