/* 百变小咪 · 勋章图（2026-11-26 用户：勋章太简陋，要高级一点）
 * 一枚勋章 = 金属外圈（铜 / 银 / 金，带细齿）+ 珐琅底（每个系列一种颜色，放射细纹）+ 同金属的浮雕图案。
 * 铜：素圈；银：多一圈连珠；金：连珠 + 底下一枝月桂。没拿到：整枚压成米色盲压（只有凹凸，不上色）。
 * svg(series, tier, opts)：tier 0 = 没拿到，1 铜 2 银 3 金；opts.prog（0–1）在外面画一圈细进度（朝下一档）。
 * 纯画图，不碰规则。规则（门槛 / 奖励）在后端 lib/zhamao-econ.js BADGES。 */
(function (root) {
  'use strict';
  const METAL = {
    1: ['#f4c79c', '#c4804a', '#6e3d1c'],   // 铜：亮 / 中 / 暗
    2: ['#ffffff', '#b8c0c9', '#5f6873'],   // 银
    3: ['#fff3b8', '#e2ac36', '#7d5208'],   // 金
  };
  const BLIND = ['#f6f1e7', '#ddd4c3', '#b3a893'];   // 没拿到：盲压
  // 系列：珐琅色（亮 / 暗）、图案
  const ENAMEL = {
    streak: ['#4f9a68', '#1f4d31'],
    games: ['#a15db0', '#4b2155'],
    hard: ['#d65a4c', '#6e1d16'],
    nine: ['#4a4540', '#12100e'],   // 黑漆
    big: ['#2f8f98', '#103f45'],
    bug: ['#46689a', '#16263f'],
    modes: ['#7d8f3c', '#33401a'],
    online: ['#c0517d', '#5a1934'],
  };
  // 图案画在 100×100 里，中心约 (50,47)，半径 ≤ 22。p = 金属色，e = 珐琅暗色（叠牌时挡住后面）
  const S = (p) => 'fill="none" stroke="' + p + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  const CAT = (cx, cy, r, p) => '<path d="M' + (cx - r) + ' ' + (cy + r * 0.2) + 'Q' + (cx - r) + ' ' + (cy + r) + ' ' + cx + ' ' + (cy + r) + 'Q' + (cx + r) + ' ' + (cy + r) + ' ' + (cx + r) + ' ' + (cy + r * 0.2) + 'L' + (cx + r * 0.95) + ' ' + (cy - r * 1.05) + 'L' + (cx + r * 0.3) + ' ' + (cy - r * 0.55) + 'Q' + cx + ' ' + (cy - r * 0.65) + ' ' + (cx - r * 0.3) + ' ' + (cy - r * 0.55) + 'L' + (cx - r * 0.95) + ' ' + (cy - r * 1.05) + 'Z" fill="' + p + '"/>';
  const GLYPH = {
    // 签到：日历一页 + 勾
    streak: (p) => '<rect x="29" y="31" width="42" height="36" rx="6" ' + S(p) + '/><path d="M29 42.5h42M39 25v10M61 25v10M40 55l6.5 6.5L60 49" ' + S(p) + '/>',
    // 对局：三张扇开的牌
    games: (p, e) => [-20, 20, 0].map((a) => '<rect x="38" y="27" width="24" height="34" rx="4" transform="rotate(' + a + ' 50 72)" fill="' + e + '" stroke="' + p + '" stroke-width="4.2"/>').join('') + '<path d="M50 35.5l3 6.2 6.8.9-5 4.7 1.2 6.7-6-3.2-6 3.2 1.2-6.7-5-4.7 6.8-.9Z" fill="' + p + '"/>',
    // 高手：王冠
    hard: (p) => '<path d="M27 62l-2.5-26 13 12L50 27l12.5 21 13-12L73 62Z" fill="' + p + '"/><rect x="27" y="65" width="46" height="6" rx="3" fill="' + p + '"/><circle cx="24.5" cy="34" r="3.6" fill="' + p + '"/><circle cx="50" cy="25" r="3.6" fill="' + p + '"/><circle cx="75.5" cy="34" r="3.6" fill="' + p + '"/>',
    // 九人桌：圆桌 + 九个座
    nine: (p) => '<circle cx="50" cy="48" r="11" ' + S(p) + '/>' + Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 9; return '<circle cx="' + (50 + Math.cos(a) * 22).toFixed(1) + '" cy="' + (48 + Math.sin(a) * 22).toFixed(1) + '" r="' + (i ? 3.6 : 5) + '" fill="' + p + '"/>'; }).join(''),
    // 一局赚：小鱼干
    big: (p, e) => '<path d="M23 48c7-10 19-13 29-10 5 1.5 9 5 11 10-2 5-6 8.5-11 10-10 3-22 0-29-10Z" fill="' + p + '"/><path d="M62 48l11-9v18Z" fill="' + p + '"/><circle cx="33" cy="46" r="2.6" fill="' + e + '"/><path d="M42 41c2 4 2 10 0 14M49 40c2 5 2 11 0 16" fill="none" stroke="' + e + '" stroke-width="2.2" stroke-linecap="round"/>',
    // 捉虫：小虫
    bug: (p) => '<ellipse cx="50" cy="52" rx="11" ry="14" fill="' + p + '"/><circle cx="50" cy="34" r="6.5" fill="' + p + '"/><path d="M39 46l-9-5M61 46l9-5M39 56l-10 3M61 56l10 3M38 64l-6 6M62 64l6 6M46 29l-4-6M54 29l4-6" ' + S(p).replace('5"', '3.6"') + '/>',
    // 四方：四叶草（四个玩法都赢过）
    modes: (p) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([x, y]) => '<circle cx="' + (50 + x * 10) + '" cy="' + (45 + y * 10) + '" r="10" fill="' + p + '"/>').join('') + '<path d="M52 56q4 9 12 13" ' + S(p).replace('5"', '4"') + '/>',
    // 联机：两只猫头
    online: (p, e) => CAT(37, 53, 11, p) + '<g stroke="' + e + '" stroke-width="3.2" paint-order="stroke">' + CAT(59, 49, 13.5, p) + '</g>' +
      '<g fill="' + e + '"><ellipse cx="33" cy="54" rx="1.6" ry="2.2"/><ellipse cx="41" cy="54" rx="1.6" ry="2.2"/><ellipse cx="54" cy="50" rx="1.9" ry="2.6"/><ellipse cx="64" cy="50" rx="1.9" ry="2.6"/></g>',
  };
  let uid = 0;
  function svg(series, tier, opts) {
    const o = opts || {}, id = 'zmd' + (++uid);
    const t = tier | 0, M = t ? METAL[t] : BLIND, E = t ? ENAMEL[series] || ENAMEL.games : [BLIND[0], BLIND[1]];
    const metal = 'url(#' + id + 'm)', relief = 'url(#' + id + 'r)';
    let s = '<svg viewBox="0 0 100 100" class="zmd t' + t + '" aria-hidden="true"><defs>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + M[0] + '"/><stop offset=".45" stop-color="' + M[1] + '"/><stop offset=".7" stop-color="' + M[0] + '"/><stop offset="1" stop-color="' + M[2] + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (t ? M[0] : '#ebe3d4') + '"/><stop offset="1" stop-color="' + (t ? M[1] : '#d2c7b3') + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'e" cx=".42" cy=".36" r=".75"><stop offset="0" stop-color="' + E[0] + '"/><stop offset="1" stop-color="' + E[1] + '"/></radialGradient>' +
      '<clipPath id="' + id + 'c"><circle cx="50" cy="50" r="36.5"/></clipPath></defs>';
    if (o.prog != null) {   // 朝下一档的进度：外面一圈细弧
      const L = 2 * Math.PI * 48.6, k = Math.max(0, Math.min(1, o.prog));
      s += '<circle cx="50" cy="50" r="48.6" fill="none" stroke="rgba(29,27,24,.1)" stroke-width="2.2"/>';
      if (k > 0) s += '<circle cx="50" cy="50" r="48.6" fill="none" stroke="' + (METAL[Math.min(3, t + 1)][1]) + '" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="' + (L * k).toFixed(1) + ' ' + L.toFixed(1) + '" transform="rotate(-90 50 50)"/>';
    }
    // 外圈 + 细齿
    s += '<circle cx="50" cy="50" r="45.5" fill="' + metal + '" stroke="' + (t ? '#1d1b18' : '#b3a893') + '" stroke-width="' + (t ? 1.6 : 1.2) + '"/>' +
      '<circle cx="50" cy="50" r="43" fill="none" stroke="' + M[2] + '" stroke-opacity="' + (t ? .55 : .35) + '" stroke-width="2.4" stroke-dasharray="1 1.7"/>' +
      '<circle cx="50" cy="50" r="39.5" fill="' + M[2] + '" fill-opacity="' + (t ? .9 : .5) + '"/>' +
      '<circle cx="50" cy="50" r="38" fill="' + metal + '"/>' +
      '<circle cx="50" cy="50" r="36.5" fill="url(#' + id + 'e)"/>';
    // 放射细纹 + 高光
    s += '<g clip-path="url(#' + id + 'c)">';
    let rays = '';
    for (let i = 0; i < 48; i++) { const a = i * Math.PI / 24; rays += 'M' + (50 + Math.cos(a) * 9).toFixed(1) + ' ' + (50 + Math.sin(a) * 9).toFixed(1) + 'L' + (50 + Math.cos(a) * 37).toFixed(1) + ' ' + (50 + Math.sin(a) * 37).toFixed(1); }
    s += '<path d="' + rays + '" stroke="#fff" stroke-opacity="' + (t ? .07 : .25) + '" stroke-width=".8"/>';
    if (t) s += '<ellipse cx="38" cy="26" rx="30" ry="15" fill="#fff" fill-opacity=".13" transform="rotate(-28 38 26)"/>';
    s += '</g>';
    // 银：连珠；金：连珠 + 月桂
    if (t >= 2 || (!t && o.ghostTier >= 2)) {
      for (let i = 0; i < 36; i++) { const a = i * Math.PI / 18; s += '<circle cx="' + (50 + Math.cos(a) * 33.2).toFixed(2) + '" cy="' + (50 + Math.sin(a) * 33.2).toFixed(2) + '" r=".95" fill="' + (t ? M[0] : BLIND[2]) + '" fill-opacity="' + (t ? .85 : .5) + '"/>'; }
    }
    // 图案：先压一层暗影，再盖金属（浮雕）
    const g = GLYPH[series] || GLYPH.games, eDark = t ? E[1] : BLIND[1];
    s += '<g transform="translate(50 50) scale(.92) translate(-50 -50)">' +
      '<g transform="translate(0 1.8)" opacity="' + (t ? .45 : .7) + '">' + g(t ? '#0d0b09' : '#fffaf0', t ? '#0d0b09' : '#fffaf0') + '</g>' +
      (t ? '' : '<g transform="translate(0 -1.2)" opacity=".55">' + g(BLIND[2], BLIND[2]) + '</g>') +
      g(t ? relief : BLIND[1], eDark) + '</g>';
    if (t === 3) {   // 金：底部一枝月桂，压在外圈上
      let lf = '';
      for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 4; i++) {
        const a = Math.PI / 2 + side * (0.22 + i * 0.2), x = 50 + Math.cos(a) * 43.5, y = 50 + Math.sin(a) * 43.5, rot = (a * 180 / Math.PI) + (side > 0 ? 50 : -50) + 90;
        lf += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="2.1" ry="4.6" transform="rotate(' + rot.toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
      }
      s += '<g fill="' + metal + '" stroke="#5b3b06" stroke-width=".8">' + lf + '</g><circle cx="50" cy="93.6" r="2.6" fill="' + M[0] + '" stroke="#5b3b06" stroke-width=".8"/>';
    }
    return s + '</svg>';
  }
  /* 系列 × 铜银金（2026-11-26 用户定全套；名字用户嫌原来的土，重拟成四字）。
   * id 同后端 lib/zhamao-econ.js BADGES（铜档沿用老 id：已经拿到的不动）；门槛 / 奖励也是后端的副本，只用来显示 */
  const SERIES = [
    ['streak', '签到', [['streak7', '七日不辍', '连续签到 7 天', 7, 5000], ['streak30', '满月之约', '连续签到 30 天', 30, 20000], ['streak100', '百日如一', '连续签到 100 天', 100, 50000]]],
    ['games', '对局', [['games100', '身经百战', '打满 100 局', 100, 10000], ['games500', '久经沙场', '打满 500 局', 500, 20000], ['games2000', '千锤百炼', '打满 2,000 局', 2000, 50000]]],
    ['hard', '高手', [['hard10', '初露锋芒', '对高手机器猫拿 10 次第一', 10, 10000], ['hard50', '技压群猫', '对高手机器猫拿 50 次第一', 50, 20000], ['hard200', '独孤求败', '对高手机器猫拿 200 次第一', 200, 50000]]],
    ['nine', '九人桌', [['nine1', '九席夺魁', '9 人局拿第一（组队算队伍赢）', 1, 10000], ['nine10', '十度称王', '9 人局拿 10 次第一', 10, 20000], ['nine50', '九桌霸主', '9 人局拿 50 次第一', 50, 50000]]],
    ['big', '大赚', [['big1000', '小有斩获', '一局净赚 1,000 以上', 1000, 10000], ['big2000', '满载而归', '一局净赚 2,000 以上', 2000, 20000], ['big3000', '富甲一方', '一局净赚 3,000 以上', 3000, 50000]]],
    ['bug', '捉虫', [['bug10', '眼明爪快', '「这步不对」标满 10 步', 10, 5000], ['bug50', '明察秋毫', '「这步不对」标满 50 步', 50, 20000], ['bug200', '百虫克星', '「这步不对」标满 200 步', 200, 50000]]],
    ['modes', '全能', [['modes2', '触类旁通', '赢过 2 种玩法', 2, 5000], ['modes4', '面面俱到', '经典、百变、角色、组队都赢过', 4, 20000], ['modes20', '样样精通', '四种玩法各赢 20 局', 4, 50000]]],
    ['online', '联机', [['online1', '旗开得胜', '联机拿一次第一', 1, 5000], ['online20', '声名鹊起', '联机拿 20 次第一', 20, 20000], ['online100', '名震江湖', '联机拿 100 次第一', 100, 50000]]],
  ];
  const BY_ID = {};
  SERIES.forEach(([sid, sname, tiers]) => tiers.forEach(([id, name, how, goal, reward], i) => { BY_ID[id] = { id, series: sid, seriesName: sname, tier: i + 1, name, how, goal, reward }; }));
  const meta = (id) => BY_ID[id] || null;
  const of = (id) => { const m = BY_ID[id]; return m ? svg(m.series, m.tier) : ''; };
  root.ZhamaoMedals = { svg, of, meta, SERIES, METAL, ENAMEL, total: Object.keys(BY_ID).length };
})(typeof window !== 'undefined' ? window : globalThis);
