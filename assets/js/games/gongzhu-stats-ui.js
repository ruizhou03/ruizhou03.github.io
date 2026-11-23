/* 拱猪 · 战绩页（window.GongzhuStatsUI，2026-11-22 三版预览中：?gzstats=a|b|c，&demo=1 用 40 盘演示数据，&empty=1 看空状态）
 * 和百变小咪的猫咪档案一样是游戏页里的一层面板：从右边滑进来盖住牌桌，左上角折号退回；不碰浏览器历史（不 pushState、不跳页）。
 *   甲 · 档案卡：照百变小咪档案页的做法——圆环、横条、最近对局小块、徽章格，换成拱猪的内容和墨园配色
 *   乙 · 账簿：宣纸底的流水为主，上方一行克制的汇总，徽章像盖在页边的朱印
 *   丙 · 一屏卡：名次四格、当猪率、最近十盘一排小点、徽章一行，一屏看完
 * 数据只来自 GongzhuStats.summary / store（本机），不上传。数字一律等宽。 */
(function (root) {
  'use strict';

  const ART = () => (root.GongzhuStats && root.GongzhuStats.art ? root.GongzhuStats.art() : {});
  const AV = () => root.GongzhuAvatars || null;
  // 数字：站点的 Cormorant Garamond（游戏页本身没加载它，退到 Georgia 会是高低不齐的旧式数字），用私有字族名加载，免得改到牌桌上的数字
  const NUM = "'GzsNum','Cormorant Garamond',Georgia,serif";
  const C = { paper: '#f3eee3', card: '#fffdf8', ink: '#1d1b18', mute: '#6a6358', faint: '#aaa294', wash: '#ebe5d8', line: '#d9cfbd', navy: '#2f4a6d', gold: '#c9a96e', seal: '#b4392c' };
  // 名次的颜色：头名暖金、第二藏蓝、第三淡墨、第四墨；当猪一律朱红（并列当猪可能是第三名）
  const RANK_C = ['#c9a96e', '#2f4a6d', '#a39b8e', '#1d1b18'];
  const MEDAL = [['#f6e3a8', '#c9a96e', '#8a6a2c'], ['#f4f4f2', '#b4b7bc', '#6f747b'], ['#f2c9a2', '#c98a55', '#7c4a22']];

  const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '');
  const fix1 = (x) => (x == null ? '—' : x.toFixed(1));
  const signed = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x);
  const md = (t) => { const d = new Date(t); return (d.getMonth() + 1) + '·' + d.getDate(); };
  const ymd = (t) => { const d = new Date(t); return d.getFullYear() + '·' + (d.getMonth() + 1) + '·' + d.getDate(); };
  const dotC = (g) => (g.pig ? C.seal : RANK_C[g.rank - 1]);

  /* ───── 图形件 ───── */
  function medal(i, n) {
    if (i > 2) return '<svg viewBox="0 0 28 34" class="gzs-medal" aria-hidden="true"><circle cx="14" cy="21" r="11" fill="#e3ddd0" stroke="#a39b8e" stroke-width="1.4"/>' + (n != null ? '<text x="14" y="25.5" text-anchor="middle" font-size="12" font-weight="700" fill="#6a6358" font-family="Georgia,serif">' + n + '</text>' : '') + '</svg>';
    const [a, b, c] = MEDAL[i];
    return '<svg viewBox="0 0 28 34" class="gzs-medal" aria-hidden="true"><path d="M8 1h6l-3 11H5z" fill="#b4392c"/><path d="M20 1h-6l3 11h6z" fill="#8f2c22"/>' +
      '<circle cx="14" cy="21" r="11" fill="' + b + '" stroke="' + c + '" stroke-width="1.4"/><circle cx="14" cy="21" r="7.4" fill="none" stroke="' + a + '" stroke-width="1.6"/></svg>';
  }
  const rankIcon = (i) => (i === 3 ? '<span class="gzs-pigi">' + (ART().pig || '') + '</span>' : medal(i));
  function face(tier) {
    const A = AV();
    if (!A || !A.BOT_TIERS) return '';
    if (tier === 'net') return '<span class="gzs-face is-net">' + [A.HUMAN[1], A.HUMAN[4]].map((h) => '<i>' + (h ? h.svg : '') + '</i>').join('') + '</span>';
    if (tier === 'mix') return '<span class="gzs-face is-mix">' + ['easy', 'normal', 'hard'].map((t) => '<i>' + A.BOT_TIERS[t].faces[0].svg + '</i>').join('') + '</span>';
    const f = A.BOT_TIERS[tier] && A.BOT_TIERS[tier].faces[0];
    return '<span class="gzs-face"><i>' + (f ? f.svg : '') + '</i></span>';
  }
  const TIER_NAME = { easy: '入门', normal: '普通', hard: '高手', mix: '混搭', net: '联机' };

  // 徽章图案：自绘扁平矢量（奶油底 + 墨 / 金 / 朱），没拿到的整枚褪成灰
  function badgeArt(id) {
    const A = ART();
    const g = (inner, vb) => '<svg viewBox="' + (vb || '0 0 48 48') + '" aria-hidden="true">' + inner + '</svg>';
    switch (id) {
      case 'first': return g('<rect x="9" y="11" width="18" height="26" rx="3" transform="rotate(-12 18 24)" fill="#fffdf8" stroke="#1d1b18" stroke-width="2.2"/><rect x="21" y="10" width="18" height="26" rx="3" transform="rotate(10 30 23)" fill="#2f4a6d" stroke="#1d1b18" stroke-width="2.2"/><rect x="25" y="15" width="10" height="16" rx="1.6" transform="rotate(10 30 23)" fill="none" stroke="#c9a96e" stroke-width="1.6"/>');
      case 'top': return '<span class="gzs-art">' + (A.crown || '') + '</span>';
      case 'ah': return '<span class="gzs-art">' + (A.heart || '') + '</span>';
      case 'gs': return g('<circle cx="24" cy="24" r="19" fill="none" stroke="#c9a96e" stroke-width="3"/><path d="M24 36c-8-6-13-10-13-15.5a6.4 6.4 0 0 1 13-2.2 6.4 6.4 0 0 1 13 2.2C37 26 32 30 24 36z" fill="#b4392c"/><path d="M24 4.5l1.6 3.6 3.9.3-3 2.5.9 3.8-3.4-2.1-3.4 2.1.9-3.8-3-2.5 3.9-.3z" fill="#c9a96e"/>');
      case 'five': return g([0, 1, 2, 3, 4].map((i) => '<rect x="' + (6 + i * 7.6) + '" y="' + (34 - i * 5.4) + '" width="5.6" height="' + (8 + i * 5.4) + '" rx="2" fill="' + (i === 4 ? '#c9a96e' : '#2f4a6d') + '"/>').join('') + '<path d="M5 44h38" stroke="#1d1b18" stroke-width="2.4" stroke-linecap="round"/>');
      case 'clean': return '<span class="gzs-art gzs-clean">' + (A.pig || '') + '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="#2f4a6d" stroke-width="3.4"/><path d="M9 9l30 30" stroke="#2f4a6d" stroke-width="3.4" stroke-linecap="round"/></svg></span>';
      case 'hard': { const Av = AV(); const f = Av && Av.BOT_TIERS ? Av.BOT_TIERS.hard.faces[0].svg : ''; return '<span class="gzs-art gzs-hard"><i>' + f + '</i><b>' + (A.crown || '') + '</b></span>'; }
      case 'ten': return g('<rect x="7" y="7" width="34" height="34" rx="5" fill="#b4392c"/><rect x="10.5" y="10.5" width="27" height="27" rx="3" fill="none" stroke="#fbf6ec" stroke-width="1.6"/><path d="M24 14v20M14 24h20" stroke="#fbf6ec" stroke-width="3.6" stroke-linecap="round"/>');
    }
    return '';
  }
  // 圆环：当猪率（朱红弧，中间一只小猪）
  function ring(frac, inner, color, size) {
    const r = 40, L = 2 * Math.PI * r, f = frac == null ? 0 : Math.max(0, Math.min(1, frac));
    return '<svg viewBox="0 0 100 100" class="gzs-ring" style="width:' + (size || 96) + 'px" aria-hidden="true"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="#ebe5d8" stroke-width="10"/>' +
      (f > 0 ? '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + (color || C.seal) + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (f * L).toFixed(1) + ' ' + L.toFixed(1) + '" transform="rotate(-90 50 50)"/>' : '') +
      '<foreignObject x="24" y="24" width="52" height="52"><div xmlns="http://www.w3.org/1999/xhtml" class="gzs-ring-in"' + (frac == null ? ' style="filter:grayscale(1);opacity:.35"' : '') + '>' + (inner || '') + '</div></foreignObject></svg>';
  }
  // 一条四段的名次条（头名 / 二 / 三 / 第四），宽度按盘数
  function stack(dist, pigCount) {
    const n = dist.reduce((a, b) => a + b, 0);
    if (!n) return '<span class="gzs-stack is-empty"></span>';
    return '<span class="gzs-stack">' + dist.map((x, i) => (x ? '<i style="flex:' + x + ';background:' + (i === 3 ? C.seal : RANK_C[i]) + '"></i>' : '')).join('') + '</span>';
  }

  /* ───── 公共的样式 ───── */
  const CSS = `
@font-face{font-family:'GzsNum';font-weight:700;font-display:swap;src:url(/assets/fonts/cormorant-garamond/cormorant-garamond-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'GzsNum';font-weight:600;font-display:swap;src:url(/assets/fonts/cormorant-garamond/cormorant-garamond-latin-600-normal.woff2) format('woff2')}
.gzs{position:fixed;inset:0;z-index:80;background:${C.paper};color:${C.ink};display:flex;flex-direction:column;font-family:'Songti SC','STSong','Noto Serif SC','Noto Serif CJK SC','Source Han Serif SC','SimSun','PingFang SC',serif;-webkit-user-select:none;user-select:none;font-feature-settings:"tnum","lnum";transform:translateX(100%);transition:transform .32s cubic-bezier(.3,.8,.3,1)}
.gzs.is-on{transform:none}
@media(prefers-reduced-motion:reduce){.gzs{transition:none}}
.gzs *{box-sizing:border-box;min-width:0}
.gzs,.gzs *,.gzs-pop{font-variant-numeric:lining-nums tabular-nums!important}
.gzs svg{display:block}
.gzs .n,.gzs-n{font-family:${NUM};font-weight:700;font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum","lnum"}
.gzs-top{flex:none;display:flex;align-items:center;gap:4px;padding:calc(env(safe-area-inset-top,0px) + 8px) 14px 4px calc(env(safe-area-inset-left,0px) + 8px)}
.gzs-x{width:44px;height:44px;border:0;background:none;padding:0;cursor:pointer;display:grid;place-items:center;border-radius:50%;color:${C.ink}}
.gzs-x svg{width:28px;height:28px}
.gzs-x:active svg{transform:scale(.92)}
.gzs-top h2{margin:0;font-size:21px;font-weight:700;letter-spacing:.12em}
.gzs-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:4px 14px calc(env(safe-area-inset-bottom,0px) + 28px)}
.gzs-medal{width:22px;height:27px;flex:none}
.gzs-pigi{display:inline-block;width:24px;flex:none}
.gzs-pigi svg,.gzs-art svg{width:100%;height:auto}
.gzs-face{display:inline-flex;flex:none}
.gzs-face i{display:block;width:30px;height:30px;border-radius:50%;overflow:hidden;background:${C.wash};border:1.5px solid ${C.ink}}
.gzs-face i svg{width:100%;height:100%}
.gzs-face.is-mix i,.gzs-face.is-net i{width:22px;height:22px}
.gzs-face.is-mix i+i,.gzs-face.is-net i+i{margin-left:-8px}
.gzs-stack{display:flex;gap:2px;height:12px;border-radius:6px;overflow:hidden;background:${C.wash}}
.gzs-stack i{display:block;height:100%}
.gzs-ring{height:auto}
.gzs-ring-in{width:52px;height:52px;display:grid;place-items:center}
.gzs-ring-in svg{width:40px;height:auto}
.gzs-art{display:block;width:100%}
.gzs-clean{position:relative}
.gzs-clean>svg:first-child{position:absolute;left:16%;top:20%;width:68%!important}
.gzs-hard{position:relative;display:block}
.gzs-hard i{display:block;width:76%;margin:20% auto 0;border-radius:50%;overflow:hidden;border:2px solid ${C.ink};background:${C.wash}}
.gzs-hard i svg{width:100%;height:auto}
.gzs-hard b{position:absolute;left:24%;top:-4%;width:52%}
.gzs-badge{position:relative;border:0;background:none;padding:0;cursor:pointer;color:inherit;font:inherit;display:flex;flex-direction:column;align-items:center;gap:5px}
.gzs-badge .ic{width:100%;aspect-ratio:1;display:grid;place-items:center}
.gzs-badge .ic>*{width:100%}
.gzs-badge.is-off .ic{filter:grayscale(1);opacity:.28}
.gzs-pop{position:fixed;z-index:81;max-width:220px;padding:9px 12px;border-radius:12px;background:${C.ink};color:${C.paper};font-size:13px;line-height:1.45;pointer-events:none;box-shadow:0 6px 18px rgba(29,27,24,.25)}
.gzs-pop b{display:block;font-size:14px}
.gzs-pop .d{color:${C.gold}}
`;

  /* ───── 甲 · 档案卡 ───── */
  const CSS_A = `
.gzs-a .gzs-in{max-width:780px;margin:0 auto}
.gzs-a .card{background:${C.card};border:1.5px solid ${C.ink};border-radius:18px;padding:14px;box-shadow:0 3px 0 ${C.ink}}
.gzs-a .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.gzs-a .wide{grid-column:1/-1}
@media(max-width:620px){.gzs-a .grid{grid-template-columns:minmax(0,1fr)}}
.gzs-a .h{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;font-size:15px;font-weight:700}
.gzs-a .hero{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:6px;align-items:center;background:#f8f4ea;padding:10px 14px}
.gzs-a .big{display:flex;flex-direction:column;align-items:flex-start;gap:3px}
.gzs-a .big .n{font-size:clamp(28px,8vw,40px);line-height:.9}
.gzs-a .big small{display:flex;align-items:center;gap:4px;color:${C.mute};font-size:12px;white-space:nowrap}
.gzs-a .big small svg{width:15px;height:15px}
.gzs-a .pr{display:flex;align-items:center;gap:4px}
.gzs-a .pr .n{font-size:20px;color:${C.seal}}
.gzs-a .pr .n small{font-size:13px}
.gzs-a .bars{display:grid;gap:9px}
.gzs-a .bar{display:grid;grid-template-columns:28px minmax(0,1fr) 2.4em;gap:8px;align-items:center}
.gzs-a .bar .t{height:14px;border-radius:7px;background:${C.wash};overflow:hidden}
.gzs-a .bar .t i{display:block;height:100%;border-radius:7px}
.gzs-a .bar .n{text-align:right;font-size:17px}
.gzs-a .tier{display:grid;grid-template-columns:auto minmax(0,1fr) 3.2em;gap:10px;align-items:center;padding:6px 0}
.gzs-a .tier+.tier{border-top:1px dashed ${C.line}}
.gzs-a .tier .n{text-align:right;font-size:19px}
.gzs-a .tier .n small{display:block;font-size:12px;color:${C.mute};font-weight:600}
.gzs-a .tier .k{display:flex;align-items:center;gap:6px;min-width:6.4em;white-space:nowrap}
.gzs-a .tier .k b{font-size:13px;font-weight:600;color:${C.mute}}
.gzs-a .recs{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px}
.gzs-a .rec{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 2px 6px;border-radius:12px;background:${C.paper};border:1.5px solid ${C.line}}
.gzs-a .rec{display:block;padding:0;background:none;border:0;border-radius:0}
.gzs-a .rec .rk{width:min(30px,7.4vw);height:min(30px,7.4vw);border-radius:50%;display:grid;place-items:center;font:700 16px/1 ${NUM};color:#fff}
.gzs-a .rec.is-stop .rk{background:none!important;border:2px dashed ${C.faint};color:${C.mute}}
.gzs-a .rec .pg{position:absolute;right:-5px;top:-7px;width:24px}
.gzs-a .rec .pg svg{width:100%;height:auto}
.gzs-a .rec small{font:600 12px/1 ${NUM};color:${C.mute};font-variant-numeric:tabular-nums}
.gzs-a .badges{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px}
@media(max-width:620px){.gzs-a .badges{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 10px}.gzs-a .gzs-badge .ic{width:min(100%,64px);padding:8px}}
.gzs-a .gzs-badge .ic{border-radius:50%;background:${C.paper};border:1.5px solid ${C.line};padding:9px}
.gzs-a .gzs-badge.is-on .ic{border-color:${C.gold};background:#fbf3df}
.gzs-a .gzs-badge small{font-size:12px;color:${C.mute};white-space:nowrap}
.gzs-a .chips{display:flex;flex-wrap:wrap;gap:8px}
.gzs-a .chip{display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:${C.paper};border:1.5px solid ${C.line}}
.gzs-a .chip svg{width:18px;height:18px}
.gzs-a .chip .n{font-size:19px}
.gzs-a .empty{display:grid;justify-items:center;gap:10px;padding:18px 0 6px;color:${C.mute}}
.gzs-a .empty svg{width:120px;height:auto}
`;
  const ICON = {
    deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="5" width="11" height="15" rx="2"/><path d="M8 3h9a2 2 0 0 1 2 2v13"/></svg>',
    round: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    streak: '<svg viewBox="0 0 24 24" fill="none" stroke="#2f4a6d" stroke-width="2" stroke-linecap="round"><path d="M4 18l5-5 4 3 7-8"/><path d="M15 8h5v5"/></svg>',
    quit: '<svg viewBox="0 0 24 24" fill="none" stroke="#6a6358" stroke-width="1.8" stroke-linecap="round"><path d="M13.5 4h-7A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/></svg>',
    avg: '<svg viewBox="0 0 24 24" fill="none" stroke="#c9a96e" stroke-width="2" stroke-linecap="round"><path d="M5 19V9M12 19V5M19 19v-7"/></svg>',
  };
  const EMPTY_ART = '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="30" y="22" width="52" height="74" rx="7" transform="rotate(-10 56 59)" fill="#fffdf8" stroke="#1d1b18" stroke-width="2.4"/><rect x="62" y="16" width="52" height="74" rx="7" transform="rotate(8 88 53)" fill="#2f4a6d" stroke="#1d1b18" stroke-width="2.4"/><rect x="71" y="27" width="34" height="52" rx="3" transform="rotate(8 88 53)" fill="none" stroke="#c9a96e" stroke-width="2"/><circle cx="128" cy="86" r="5" fill="#c9a96e"/><circle cx="140" cy="70" r="3" fill="#b4392c"/><circle cx="22" cy="92" r="3.5" fill="#ebe5d8"/></svg>';

  function viewA(S) {
    const has = S.games > 0;
    const dmax = Math.max(1, ...S.dist);
    const hero = '<div class="card hero">' +
      '<div class="big"><span class="n">' + S.games + '</span><small>' + ICON.deck + '盘</small></div>' +
      '<div class="big"><span class="n">' + S.rounds + '</span><small>' + ICON.round + '局</small></div>' +
      '<div class="big"><span class="n"' + (S.avgRank == null ? ' style="color:' + C.line + '"' : '') + '>' + fix1(S.avgRank) + '</span><small>' + ICON.avg + '平均名次</small></div>' +
      '<div class="pr">' + ring(S.pigRate, ART().pig, C.seal, 64) + '<span class="n"' + (S.pigRate == null ? ' style="color:' + C.line + '"' : '') + '>' + pct(S.pigRate) + (S.pigRate == null ? '' : '<small>%</small>') + '</span></div></div>';
    if (!has) {
      return hero + '<div class="grid"><div class="card wide"><div class="empty">' + EMPTY_ART + '<span>打完一盘，这里就有了</span></div></div>' +
        '<div class="card wide"><div class="badges">' + badgesHtml(S) + '</div></div></div>';
    }
    const ranks = '<div class="card wide"><div class="h">名次</div><div class="bars">' + S.dist.map((x, i) =>
      '<div class="bar">' + rankIcon(i) + '<span class="t"><i style="width:' + (x / dmax * 100).toFixed(1) + '%;background:' + (i === 3 ? C.seal : RANK_C[i]) + '"></i></span><span class="n">' + x + '</span></div>').join('') + '</div></div>';
    const recs = '<div class="card wide"><div class="h">最近十盘</div><div class="recs">' + S.recent.slice().reverse().map((g) =>
      '<div class="rec' + (g.stop ? ' is-stop' : '') + '"><span class="rk" style="background:' + dotC(g) + '">' + g.rank + '</span></div>').join('') + '</div></div>';
    return hero + '<div class="grid">' + ranks + recs + '<div class="card wide"><div class="h">徽章</div><div class="badges">' + badgesHtml(S) + '</div></div></div>';
  }
  function badgesHtml(S, cls) {
    return S.badges.map((b) => '<button type="button" class="gzs-badge ' + (b.got ? 'is-on' : 'is-off') + (cls ? ' ' + cls : '') + '" data-b="' + b.id + '"><span class="ic">' + badgeArt(b.id) + '</span>' + (cls === 'bare' ? '' : '<small>' + b.name + '</small>') + '</button>').join('');
  }

  /* ───── 乙 · 账簿 ───── */
  const CSS_B = `
.gzs-b{background:#f6f0e2}
.gzs-b .gzs-in{max-width:860px;margin:0 auto;position:relative}
.gzs-b .book{position:relative;background:#fbf7ee;border:1px solid #d8ccb4;border-radius:4px;padding:18px 18px 22px;box-shadow:0 1px 0 #e9dfcb,0 10px 24px -18px rgba(60,40,20,.35)}
.gzs-b .book:before{content:"";position:absolute;top:0;bottom:0;left:12px;border-left:1.5px solid rgba(180,57,44,.35)}
.gzs-b .sum{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 18px;padding:2px 0 12px 14px;border-bottom:1.5px solid ${C.ink}}
.gzs-b .sum span{display:inline-flex;align-items:baseline;gap:5px;color:${C.mute};font-size:13px}
.gzs-b .sum .n{font-size:24px;color:${C.ink}}
.gzs-b .sum .is-pig .n{color:${C.seal}}
.gzs-b .dist{display:flex;align-items:center;gap:10px;padding:10px 0 4px 14px}
.gzs-b .dist .gzs-stack{flex:1;height:6px;border-radius:3px}
.gzs-b .dist .lg{display:flex;gap:8px;font:600 12px ${NUM};color:${C.mute}}
.gzs-b .dist .lg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:3px}
.gzs-b table{width:100%;border-collapse:collapse;margin-top:8px;font-variant-numeric:tabular-nums}
.gzs-b th{font-size:12px;font-weight:600;color:${C.mute};text-align:left;padding:8px 6px;border-bottom:1px solid #d8ccb4}
.gzs-b td{padding:9px 6px;border-bottom:1px solid #ebe2cf;font-size:15px;vertical-align:middle}
.gzs-b td:first-child,.gzs-b th:first-child{padding-left:14px}
.gzs-b td.n,.gzs-b th.r{text-align:right}
.gzs-b td.d{font:600 15px ${NUM};color:${C.mute};white-space:nowrap}
.gzs-b td.o .gzs-face i{width:22px;height:22px;border-width:1px}
.gzs-b td.o .gzs-face.is-mix i,.gzs-b td.o .gzs-face.is-net i{width:18px;height:18px}
.gzs-b td.me{font-size:18px}
.gzs-b td.me.neg{color:${C.seal}}
.gzs-b td.k{width:44px;text-align:center}
.gzs-b td.k .rk{display:inline-block;font:700 19px/1 ${NUM}}
.gzs-b td.k .seal{display:inline-grid;place-items:center;width:30px;height:30px;border:2px solid ${C.seal};border-radius:4px;transform:rotate(-8deg);background:rgba(180,57,44,.06)}
.gzs-b td.k .seal svg{width:22px;height:auto}
.gzs-b tr.is-stop td{color:${C.faint}}
.gzs-b td.x{width:1%;white-space:nowrap;font-size:12px;color:${C.mute}}
.gzs-b td.x span{display:inline-flex;align-items:center;gap:2px;margin-left:6px}
.gzs-b td.x svg{width:15px;height:auto}
.gzs-b .more{display:block;margin:12px auto 0;border:1px solid #d8ccb4;background:none;border-radius:999px;padding:7px 18px;font:inherit;font-size:13px;color:${C.mute};cursor:pointer}
.gzs-b .tiers{margin-top:22px}
.gzs-b .tiers td{font-size:14px}
.gzs-b .tiers .gzs-face i{width:24px;height:24px;border-width:1px}
.gzs-b .seals{position:absolute;top:-8px;right:-6px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:2px;width:190px;pointer-events:none}
.gzs-b .seals .gzs-badge{pointer-events:auto}
.gzs-b .sl{width:38px;height:38px;display:grid;place-items:center;border-radius:5px;font-size:14px;font-weight:700;line-height:1.05;letter-spacing:.06em;writing-mode:vertical-rl;text-orientation:upright;transform:rotate(var(--r,0deg))}
.gzs-b .is-on .sl{background:${C.seal};color:#fbf6ec;box-shadow:inset 0 0 0 2px #b4392c,inset 0 0 0 3.5px #fbf6ec}
.gzs-b .is-off .sl{border:1.5px dashed #cbbfa6;color:#c4b9a3}
.gzs-b .gzs-badge.is-off .ic{filter:none;opacity:1}
@media(min-width:1000px){.gzs-b .seals{position:fixed;top:90px;right:calc(50% - 430px - 104px);width:92px;flex-direction:column;flex-wrap:nowrap;align-items:center;gap:8px}.gzs-b .sl{width:50px;height:50px;font-size:16px}}
@media(max-width:999px){.gzs-b .book{margin-top:58px}.gzs-b .seals{top:-52px;right:0;left:0;width:auto;justify-content:flex-end;flex-wrap:nowrap;gap:3px}}
@media(max-width:520px){.gzs-b td.x{display:none}.gzs-b th.x{display:none}.gzs-b .book{padding:14px 10px 18px}}
.gzs-b .blank td{height:40px}
.gzs-b .hint{padding:14px 0 2px 14px;color:${C.mute};font-size:13px}
`;
  const SEAL_TXT = { first: '初局', top: '头名', ah: '全红', gs: '满贯', five: '五连', clean: '无猪', hard: '胜强', ten: '十盘' };
  function viewB(S, store) {
    const games = store.games.slice().reverse();
    const PAGE = 30;
    const rot = [-6, 4, -3, 7, -5, 3, -7, 5];
    const seals = '<div class="seals">' + S.badges.map((b, i) => '<button type="button" class="gzs-badge ' + (b.got ? 'is-on' : 'is-off') + '" data-b="' + b.id + '"><span class="sl" style="--r:' + rot[i] + 'deg">' + SEAL_TXT[b.id] + '</span></button>').join('') + '</div>';
    const sum = '<div class="sum"><span><b class="n">' + S.games + '</b>盘</span><span><b class="n">' + S.rounds + '</b>局</span>' +
      '<span>平均名次<b class="n">' + fix1(S.avgRank) + '</b></span><span class="is-pig">当猪<b class="n">' + pct(S.pigRate) + '</b>' + (S.pigRate == null ? '' : '%') + '</span>' +
      (S.streakBest ? '<span>最长连续不当猪<b class="n">' + S.streakBest + '</b>盘</span>' : '') + '</div>';
    const dist = S.ranked ? '<div class="dist">' + stack(S.dist) + '<span class="lg">' + S.dist.map((x, i) => '<span><i style="background:' + (i === 3 ? C.seal : RANK_C[i]) + '"></i>' + x + '</span>').join('') + '</span></div>' : '';
    const ico = (k, n) => (n ? '<span>' + (ART()[k] || '') + (n > 1 ? '<b class="gzs-n">' + n + '</b>' : '') + '</span>' : '');
    const row = (g) => '<tr class="' + (g.stop ? 'is-stop' : '') + '"><td class="d">' + md(g.t) + '</td><td class="o">' + face(g.m === 'n' ? 'net' : (g.tiers && g.tiers.every((t) => t === g.tiers[0]) ? g.tiers[0] : 'mix')) + '</td>' +
      '<td class="n gzs-n">' + g.n + '</td><td class="n me gzs-n' + (g.tot[0] < 0 ? ' neg' : '') + '">' + signed(g.tot[0]) + '</td>' +
      '<td class="x">' + ico('heart', g.ah) + ico('pig', g.eatPig) + ico('sheep', g.sheep) + '</td>' +
      '<td class="k">' + (g.pig ? '<span class="seal">' + (ART().pig || '') + '</span>' : '<span class="rk" style="color:' + (g.stop ? C.faint : RANK_C[g.rank - 1]) + '">' + (g.stop ? '—' : g.rank) + '</span>') + '</td></tr>';
    const head = '<tr><th>日期</th><th>对手</th><th class="r">局</th><th class="r">累计</th><th class="x"></th><th class="r" style="text-align:center">名次</th></tr>';
    const body = games.length ? games.slice(0, PAGE).map(row).join('') : '<tr class="blank"><td colspan="6"></td></tr><tr class="blank"><td colspan="6"></td></tr><tr class="blank"><td colspan="6"></td></tr>';
    const tiers = S.tiers.length ? '<table class="tiers"><tr><th>对手</th><th class="r">盘</th><th class="r">平均名次</th><th class="r">当猪</th></tr>' + S.tiers.map((t) =>
      '<tr><td>' + face(t.key) + '</td><td class="n gzs-n">' + t.n + '</td><td class="n gzs-n">' + fix1(t.avgRank) + '</td><td class="n gzs-n">' + pct(t.pigRate) + '%</td></tr>').join('') + '</table>' : '';
    const html = '<div class="gzs-in">' + seals + '<div class="book">' + sum + dist + '<table class="led"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>' +
      (games.length > PAGE ? '<button type="button" class="more" data-more>更早 ' + (games.length - PAGE) + ' 盘</button>' : '') +
      (games.length ? '' : '<div class="hint">第一盘的分数会记在这一页</div>') + tiers + '</div></div>';
    return { html, more: (el) => { el.querySelector('.led tbody').insertAdjacentHTML('beforeend', games.slice(PAGE).map(row).join('')); } };
  }

  /* ───── 丙 · 一屏卡 ───── */
  const CSS_C = `
.gzs-c .gzs-body{display:flex;align-items:center;justify-content:center}
.gzs-c .one{width:100%;max-width:400px;display:grid;gap:16px;padding:6px 0 10px}
.gzs-c .cells{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.gzs-c .cell{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px 10px;border-radius:16px;background:${C.card};border:1.5px solid ${C.line}}
.gzs-c .cell .n{font-size:30px;line-height:1}
.gzs-c .cell .gzs-medal{width:24px;height:30px}
.gzs-c .cell .gzs-pigi{width:30px;height:30px;display:grid;place-items:center}
.gzs-c .cell.is-zero .n{color:${C.faint}}
.gzs-c .pig{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:14px;padding:12px 16px;border-radius:18px;background:${C.card};border:1.5px solid ${C.line}}
.gzs-c .pig .n{font-size:56px;line-height:.9;color:${C.seal}}
.gzs-c .pig .n small{font-size:24px}
.gzs-c .pig .meta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;color:${C.mute};font-size:13px}
.gzs-c .pig .meta .gzs-n{font-size:17px;color:${C.ink}}
.gzs-c .dots{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px;padding:14px 12px;border-radius:18px;background:${C.card};border:1.5px solid ${C.line}}
.gzs-c .dot{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font:700 13px/1 ${NUM};color:#fff}
.gzs-c .dot.is-stop{background:none!important;border:2px dashed ${C.faint};color:${C.faint}}
.gzs-c .dot.is-none{background:none;border:1.5px solid ${C.line}}
.gzs-c .bdg{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}
.gzs-c .bdg .ic{padding:2px}
.gzs-c .foot{display:flex;justify-content:center;gap:16px;color:${C.mute};font-size:13px}
.gzs-c .foot .gzs-n{font-size:17px;color:${C.ink};margin-right:3px}
`;
  function viewC(S) {
    const recent = S.recent.slice(-10);
    const dots = [];
    for (let i = 0; i < 10; i++) {
      const g = recent[i];
      dots.push(g ? '<span class="dot' + (g.stop ? ' is-stop' : '') + '" style="background:' + dotC(g) + '">' + g.rank + '</span>' : '<span class="dot is-none"></span>');
    }
    return '<div class="one">' +
      '<div class="cells">' + S.dist.map((x, i) => '<div class="cell' + (x ? '' : ' is-zero') + '">' + rankIcon(i) + '<span class="n">' + x + '</span></div>').join('') + '</div>' +
      '<div class="pig">' + ring(S.pigRate, ART().pig, C.seal, 84) + '<div class="meta"><span class="n"' + (S.pigRate == null ? ' style="color:' + C.line + '"' : '') + '>' + pct(S.pigRate) + (S.pigRate == null ? '' : '<small>%</small>') + '</span></div></div>' +
      '<div class="dots">' + dots.join('') + '</div>' +
      '<div class="bdg">' + badgesHtml(S, 'bare') + '</div>' +
      '<div class="foot"><span><b class="gzs-n">' + S.games + '</b>盘</span><span><b class="gzs-n">' + S.rounds + '</b>局</span>' + (S.ranked ? '<span>平均名次 <b class="gzs-n">' + fix1(S.avgRank) + '</b></span>' : '') + '</div>' +
      '</div>';
  }

  /* ───── 外壳 ───── */
  let el = null, pop = null, keyH = null;
  function ensureCss() {
    if (document.getElementById('gzsCss')) return;
    const st = document.createElement('style');
    st.id = 'gzsCss';
    st.textContent = CSS + CSS_A + CSS_B + CSS_C;
    document.head.appendChild(st);
  }
  function hidePop() { if (pop) { pop.remove(); pop = null; } }
  function showPop(btn, S) {
    hidePop();
    const b = S.badges.find((x) => x.id === btn.dataset.b);
    if (!b) return;
    pop = document.createElement('div');
    pop.className = 'gzs-pop';
    pop.innerHTML = '<b>' + b.name + '</b>' + b.how + (b.got ? '<div class="d gzs-n">' + ymd(b.got) + '</div>' : '');
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    pop.style.top = (r.top - h - 8 > 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
  }
  function close() {
    hidePop();
    if (!el) return;
    const e = el; el = null;
    e.classList.remove('is-on');
    setTimeout(() => e.remove(), 340);
    if (keyH) { document.removeEventListener('keydown', keyH); keyH = null; }
  }
  function open(variant, S, store) {
    ensureCss();
    if (el) el.remove();
    const v = /^[abc]$/.test(variant) ? variant : 'a';
    el = document.createElement('section');
    el.className = 'gzs gzs-' + v;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '战绩');
    const b = v === 'b' ? viewB(S, store) : null;
    const body = v === 'a' ? '<div class="gzs-in">' + viewA(S) + '</div>' : v === 'b' ? b.html : viewC(S);
    el.innerHTML = '<div class="gzs-top"><button type="button" class="gzs-x" data-close aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><h2>战绩</h2></div>' +
      '<div class="gzs-body">' + body + '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-close]')) { close(); return; }
      const bd = t.closest('.gzs-badge');
      if (bd) { if (pop && pop.dataset.for === bd.dataset.b) hidePop(); else { showPop(bd, S); pop.dataset.for = bd.dataset.b; } return; }
      if (t.closest('[data-more]') && b) { b.more(el); t.closest('[data-more]').remove(); return; }
      hidePop();
    });
    el.querySelector('.gzs-body').addEventListener('scroll', hidePop, { passive: true });
    keyH = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', keyH);
    // 页面在后台（rAF 不走）时直接就位，不等滑入动画
    if (document.hidden || /[?&]still=1/.test(location.search)) {   // still=1：截图用，不放滑入动画
 el.style.transition = 'none'; el.classList.add('is-on'); }
    else requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add('is-on')));
    el.querySelector('[data-close]').focus({ preventScroll: true });
  }

  root.GongzhuStatsUI = { open, close, isOpen: () => !!el };
})(window);
