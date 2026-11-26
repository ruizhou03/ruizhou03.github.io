/* 猫咪炸毛 · 牌面插画（window.ZhamaoArt / Node require 共用：只拼 SVG 字符串，不碰 DOM）
 * 全部自绘扁平矢量，不用 emoji、不画细线、无渐变；配色锚站点的藏蓝 / 暖金 / 奶油，和拱猪头像同一套画法
 * （墨点眼睛 + 左上白高光、一对腮红、分两三层上色）。
 *   ART.face(kind)  牌面中间的大插画，viewBox 0 0 100 100
 *   ART.icon(kind)  角上的小标（同名牌标一样，凑组合靠它认），viewBox 0 0 24 24
 *   ART.TONE[kind]  牌底色 / 名字条颜色 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ZhamaoArt = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const INK = '#1d1b18', CREAM = '#fffaf0', NAVY = '#2f4a6d', GOLD = '#c9a96e', RED = '#c8463a', PINK = '#f2a0a0';

  /* 牌底：bg 牌心底色，band 名字条底色，ink 名字颜色 */
  const TONE = {
    boom:    { bg: '#f7d9cf', band: '#c8463a', ink: '#fff7ef' },
    defuse:  { bg: '#dcebd9', band: '#4f8a5f', ink: '#fbfff8' },
    nope:    { bg: '#ece1f2', band: '#7a5a96', ink: '#fdf9ff' },
    attack:  { bg: '#f6e2c8', band: '#c0742e', ink: '#fffaf2' },
    tattack: { bg: '#ecd3c4', band: '#7c3a22', ink: '#fff6ef' },   // 自由甩锅：比甩锅的亮橙深一大截（深锈红），一眼分得开
    skip:    { bg: '#dfe7f3', band: '#2f4a6d', ink: '#f6f9ff' },
    bottom:  { bg: '#f1e4ee', band: '#8a4f7a', ink: '#fff7fb' },
    favor:   { bg: '#f8e1e4', band: '#c4607a', ink: '#fff8f9' },
    shuffle: { bg: '#efe6d2', band: '#8a6a3e', ink: '#fffaf0' },
    future:  { bg: '#e2eeee', band: '#3f7f86', ink: '#f7ffff' },
    alter:   { bg: '#e6e8f4', band: '#4f5d9a', ink: '#f7f8ff' },
    swap:    { bg: '#dfefec', band: '#2f8a83', ink: '#f4fffd' },
    orange:  { bg: '#fbf4e6', band: '#e0893e', ink: '#fffaf0' },
    calico:  { bg: '#fbf4e6', band: '#b98a5a', ink: '#fffaf0' },
    cow:     { bg: '#fbf4e6', band: '#3a3632', ink: '#fffaf0' },
    tabby:   { bg: '#fbf4e6', band: '#8c7a62', ink: '#fffaf0' },
    siamese: { bg: '#fbf4e6', band: '#6b4a3a', ink: '#fffaf0' },
    wild:    { bg: '#fbf1dc', band: '#b08a3e', ink: '#fffaf0' },   // 万能猫：暖金名字条（实际名字条是五彩渐变，见 zhamao.css）
    reverse: { bg: '#dcebf2', band: '#1f7a9c', ink: '#f4fbff' },   // 转向：天青
    flux:    { bg: '#f1e4f3', band: '#8e4a9c', ink: '#fdf7ff' },
    catsave: { bg: '#e1eaf5', band: '#c8463a', ink: '#fffaf0' },   // 百变规则「急救」：淡蓝衬底（转盘格 / 水印），和百搭的奶油色分开
    topdraw: { bg: '#f1e4ee', band: '#8a4f7a', ink: '#fff7fb' },   // 抽顶（百变「摸底」时抽底变成它）：和抽底同一套颜色   // 百变：梅紫（2026-11-15 工作稿，牌面待用户挑）
  };

  /* ───── 积木 ───── */
  const f = (n) => Math.round(n * 100) / 100;
  const eye = (x, y, r) => { r = r || 3.4; return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + INK + '"/><circle cx="' + f(x - r * 0.35) + '" cy="' + f(y - r * 0.38) + '" r="' + f(r * 0.36) + '" fill="#fff"/>'; };
  const blush = (cx, y, dx, c) => '<ellipse cx="' + f(cx - dx) + '" cy="' + f(y) + '" rx="4.2" ry="2.5" fill="' + (c || PINK) + '" opacity=".8"/><ellipse cx="' + f(cx + dx) + '" cy="' + f(y) + '" rx="4.2" ry="2.5" fill="' + (c || PINK) + '" opacity=".8"/>';
  const line = (d, w, c) => '<path d="' + d + '" stroke="' + (c || INK) + '" stroke-width="' + (w || 2.8) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  const blob = (d, c) => '<path d="' + d + '" fill="' + c + '" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>';
  const nose = (cx, y) => '<path d="M' + f(cx - 2.2) + ' ' + f(y) + 'h4.4l-2.2 2.6Z" fill="#e06d78" stroke="#e06d78" stroke-width="1.6" stroke-linejoin="round"/>';
  const mouth = (cx, y) => line('M' + f(cx - 4) + ' ' + f(y) + 'q2 2.2 4 0q2 2.2 4 0', 2.4);

  /* 一颗猫头：cx,cy 头中心，s 缩放（1 ≈ 宽 48），fur 主毛色，o 选项：
   * ear 耳内色、patch 额外斑块 svg（坐标按 s=1、中心 0,0 画）、eyes 'open'|'closed'|'wide'|'heart'、mouth 'smile'|'o'|'flat'|'none'、muzzle 嘴套颜色 */
  function catHead(cx, cy, s, fur, o) {
    o = o || {};
    const ear = o.ear || '#f6b9a6';
    const earC = o.earFur || fur;
    let g = '<g transform="translate(' + f(cx) + ' ' + f(cy) + ') scale(' + f(s) + ')">';
    g += blob('M-22 -4 -18 -27 -5 -15Z', earC) + blob('M22 -4 18 -27 5 -15Z', earC);
    g += blob('M-18 -8 -16 -21 -9 -14Z', ear) + blob('M18 -8 16 -21 9 -14Z', ear);
    g += '<ellipse cx="0" cy="2" rx="24" ry="20" fill="' + fur + '"/>';
    if (o.patch) g += o.patch;
    if (o.muzzle) g += '<ellipse cx="-5.5" cy="9" rx="6.5" ry="5" fill="' + o.muzzle + '"/><ellipse cx="5.5" cy="9" rx="6.5" ry="5" fill="' + o.muzzle + '"/>';
    const ey = -1, dx = 9;
    const eyes = o.eyes || 'open';
    if (eyes === 'closed') g += line('M' + (-dx - 4) + ' ' + ey + 'q4 3.5 8 0', 2.6) + line('M' + (dx - 4) + ' ' + ey + 'q4 3.5 8 0', 2.6);
    else if (eyes === 'happy') g += line('M' + (-dx - 4) + ' ' + (ey + 1.5) + 'q4 -4.5 8 0', 2.6) + line('M' + (dx - 4) + ' ' + (ey + 1.5) + 'q4 -4.5 8 0', 2.6);
    else if (eyes === 'wide') g += '<circle cx="' + (-dx) + '" cy="' + ey + '" r="6.2" fill="#fff"/><circle cx="' + dx + '" cy="' + ey + '" r="6.2" fill="#fff"/>' + eye(-dx, ey, 3) + eye(dx, ey, 3);
    else if (eyes === 'heart') g += heart(-dx, ey, 5.2, '#e0566e') + heart(dx, ey, 5.2, '#e0566e');
    else if (eyes === 'side') g += '<ellipse cx="' + (-dx) + '" cy="' + ey + '" rx="5.4" ry="4.6" fill="#fff"/><ellipse cx="' + dx + '" cy="' + ey + '" rx="5.4" ry="4.6" fill="#fff"/>' + eye(-dx + 2.2, ey, 2.8) + eye(dx + 2.2, ey, 2.8);
    else g += eye(-dx, ey, o.eyeR || 3.6) + eye(dx, ey, o.eyeR || 3.6);
    g += nose(0, 5);
    const m = o.mouth || 'smile';
    if (m === 'smile') g += mouth(0, 9.5);
    else if (m === 'o') g += '<ellipse cx="0" cy="12" rx="3" ry="3.6" fill="' + INK + '"/><ellipse cx="0" cy="13.2" rx="1.8" ry="1.6" fill="#e06d78"/>';
    else if (m === 'flat') g += line('M-3.5 10.5h7', 2.4);
    else if (m === 'grr') g += '<path d="M-6 10q6 -3 12 0q-6 7 -12 0Z" fill="' + INK + '"/>' + '<path d="M-4 10.2l1 2.2 1-2.2M2 10.2l1 2.2 1-2.2" fill="#fff"/>';
    if (o.blush !== false) g += blush(0, 7, 15, o.blushC);
    g += '</g>';
    return g;
  }
  function heart(x, y, r, c) {
    return '<path d="M' + f(x) + ' ' + f(y + r * 0.9) + 'C' + f(x - r * 1.6) + ' ' + f(y - r * 0.1) + ' ' + f(x - r * 0.9) + ' ' + f(y - r * 1.2) + ' ' + f(x) + ' ' + f(y - r * 0.45) +
      'C' + f(x + r * 0.9) + ' ' + f(y - r * 1.2) + ' ' + f(x + r * 1.6) + ' ' + f(y - r * 0.1) + ' ' + f(x) + ' ' + f(y + r * 0.9) + 'Z" fill="' + c + '"/>';
  }
  function paw(x, y, s, c, pad) {
    pad = pad || '#f4b6c0';
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(s) + ')"><ellipse cx="0" cy="0" rx="8" ry="7" fill="' + c + '"/>' +
      '<ellipse cx="0" cy="1.5" rx="3.4" ry="2.8" fill="' + pad + '"/><circle cx="-3.6" cy="-3" r="1.5" fill="' + pad + '"/><circle cx="0" cy="-4.2" r="1.5" fill="' + pad + '"/><circle cx="3.6" cy="-3" r="1.5" fill="' + pad + '"/></g>';
  }
  /* 爪印（2026-11-12 用户定稿甲）：三瓣掌垫 + 四颗分开、微微外撇的趾豆，单色；24×24 里画。牌背、猫牌角标、偷牌大爪、彩纸都用它 */
  function pawPrint(c) { const F = c ? ' fill="' + c + '"' : ''; return '<path d="M12 12.4C14.9 12.4 17.4 14.3 18.3 16.9C18.9 18.7 17.9 20.6 16.1 20.9C14.9 21.1 13.9 20.5 12 20.5C10.1 20.5 9.1 21.1 7.9 20.9C6.1 20.6 5.1 18.7 5.7 16.9C6.6 14.3 9.1 12.4 12 12.4Z"' + F + '/>' + '<ellipse cx="4.7" cy="10.6" rx="2.05" ry="2.65" transform="rotate(-28 4.7 10.6)"' + F + '/><ellipse cx="8.9" cy="6.4" rx="2.2" ry="2.85" transform="rotate(-9 8.9 6.4)"' + F + '/><ellipse cx="15.1" cy="6.4" rx="2.2" ry="2.85" transform="rotate(9 15.1 6.4)"' + F + '/><ellipse cx="19.3" cy="10.6" rx="2.05" ry="2.65" transform="rotate(28 19.3 10.6)"' + F + '/>'; }
  /* 猫身子（坐姿的一团），在头下面 */
  const body = (cx, y, w, h, c) => '<ellipse cx="' + f(cx) + '" cy="' + f(y) + '" rx="' + f(w) + '" ry="' + f(h) + '" fill="' + c + '"/>';
  const ground = (c) => '<ellipse cx="50" cy="92" rx="34" ry="5" fill="' + (c || 'rgba(29,27,24,.08)') + '"/>';
  const card = (x, y, r, c) => '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + r + ')"><rect x="-7" y="-10" width="14" height="20" rx="3" fill="' + CREAM + '" stroke="' + (c || NAVY) + '" stroke-width="2.4"/><path d="M-2.5 -3.5h5M-2.5 0.5h5M-2.5 4.5h3" stroke="' + (c || NAVY) + '" stroke-width="1.8" stroke-linecap="round"/></g>';

  /* ───── 五种猫（没有字的牌） ───── */
  const BREED = {
    orange: { fur: '#eea25a', dark: '#d27a36', light: '#fff4e3',
      patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#d27a36') + line('M-23 0h5M-23 5h5M23 0h-5M23 5h-5', 2.6, '#d27a36'), muzzle: '#fff4e3' },
    calico: { fur: '#fff6ea', dark: '#e58e46', light: '#fff6ea', ear: '#f6b9a6', earFur: '#fff6ea',
      patch: '<path d="M-24 -2c-1-10 6-17 14-18 3 4 1 12-5 15-3 2-7 3-9 3Z" fill="#e58e46"/><path d="M24 2c0-9-5-16-12-18-3 5 0 11 4 14 3 2 6 3 8 4Z" fill="#3c3530"/>', muzzle: null },
    cow: { fur: '#fffdf8', dark: '#2a2622', light: '#fffdf8', earFur: '#2a2622', ear: '#f6b9a6',
      patch: '<path d="M-24 2c-1-11 4-19 13-21 3 6 2 14-3 17-4 3-8 4-10 4Z" fill="#2a2622"/><ellipse cx="13" cy="-10" rx="6" ry="4.5" fill="#2a2622"/>', muzzle: null },
    tabby: { fur: '#b39c7e', dark: '#7c6a54', light: '#efe3cf',
      patch: line('M-6 -16l3 4 3-4 3 4 3-4', 2.6, '#6e5c48') + line('M-23 -1h6M-23 5h6M23 -1h-6M23 5h-6', 2.6, '#6e5c48'), muzzle: '#efe3cf' },
    siamese: { fur: '#f3e3c8', dark: '#5a3e30', light: '#f3e3c8', earFur: '#5a3e30', ear: '#a87c66',
      patch: '<ellipse cx="0" cy="8" rx="13" ry="10" fill="#7a5644"/>', muzzle: null, eyeBlue: true },
  };
  function breedCat(k, o) {
    const b = BREED[k];
    o = o || {};
    let svg = ground();
    // 尾巴
    svg += line('M70 84c12-2 16-14 10-24', 7, b.dark === '#2a2622' ? '#2a2622' : b.dark);
    svg += body(50, 76, 24, 17, b.fur);
    if (k === 'cow') svg += '<ellipse cx="60" cy="72" rx="8" ry="6" fill="#2a2622"/>';
    if (k === 'calico') svg += '<ellipse cx="38" cy="74" rx="8" ry="6" fill="#e58e46"/><ellipse cx="62" cy="80" rx="6" ry="5" fill="#3c3530"/>';
    if (k === 'orange' || k === 'tabby') svg += line('M42 66v6M50 65v7M58 66v6', 2.6, b.dark);
    if (k === 'siamese') svg += '<ellipse cx="50" cy="87" rx="16" ry="5" fill="#5a3e30"/>';
    svg += '<ellipse cx="43" cy="89" rx="6" ry="4" fill="' + (k === 'siamese' ? '#5a3e30' : b.light) + '"/><ellipse cx="57" cy="89" rx="6" ry="4" fill="' + (k === 'siamese' ? '#5a3e30' : b.light) + '"/>';
    svg += catHead(50, 42, 1.05, b.fur, { ear: b.ear, earFur: b.earFur, patch: b.patch, muzzle: b.muzzle, eyes: o.eyes });
    if (b.eyeBlue && !o.eyes) svg += '<circle cx="40.55" cy="40.95" r="2.2" fill="#6fa8dc"/><circle cx="59.45" cy="40.95" r="2.2" fill="#6fa8dc"/>' + eye(40.55, 40.95, 1.4) + eye(59.45, 40.95, 1.4);
    return svg;
  }

  /* ───── 行动牌 ───── */
  function boomArt() {
    // 炸毛：一团炸开的刺毛 + 瞪圆的眼 + 头顶冒火星
    let spikes = '';
    const n = 18, cx = 50, cy = 54;
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 27 : 38 + (i % 4 === 0 ? 3 : 0);
      d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r * 0.95);
    }
    spikes += '<path d="' + d + 'Z" fill="#3a3632" stroke="#3a3632" stroke-width="3" stroke-linejoin="round"/>';
    let svg = ground();
    svg += spikes;
    svg += catHead(50, 56, 0.95, '#4a4540', { ear: '#e88a8a', eyes: 'wide', mouth: 'grr', blushC: '#e86a6a' });
    // 火星
    svg += '<path d="M50 4l3 7 7-2-4 6 6 4-8 1 1 7-5-5-5 5 1-7-8-1 6-4-4-6 7 2Z" fill="' + GOLD + '" stroke="' + GOLD + '" stroke-width="2" stroke-linejoin="round"/>';
    svg += '<circle cx="50" cy="13" r="3" fill="' + RED + '"/>';
    svg += '<circle cx="22" cy="20" r="3" fill="' + GOLD + '"/><circle cx="80" cy="24" r="2.4" fill="' + RED + '"/><circle cx="84" cy="12" r="1.8" fill="' + GOLD + '"/>';
    return svg;
  }
  function defuseArt() {
    // 逗猫棒：一根杆子挑着一串羽毛，猫咪伸爪子去够、乐开花
    let svg = ground();
    svg += line('M84 90 60 24', 4.2, '#8a6a3e');
    svg += line('M60 24c-6-8-14-8-18-2', 2.6, NAVY);
    svg += '<path d="M42 22c-8-2-14 4-12 12 6 0 12-4 12-12Z" fill="#e0566e"/><path d="M42 22c-2 8 2 14 10 14 0-6-4-12-10-14Z" fill="' + GOLD + '"/><path d="M42 22c-6 6-6 14 0 18 4-6 3-13 0-18Z" fill="#6fa8dc"/>';
    svg += body(36, 80, 20, 13, '#eea25a');
    svg += catHead(36, 58, 0.82, '#eea25a', { eyes: 'happy', mouth: 'o', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#d27a36'), muzzle: '#fff4e3' });
    svg += '<path d="M50 70c4-8 6-16 8-24" stroke="#eea25a" stroke-width="8" stroke-linecap="round" fill="none"/>';
    svg += paw(58, 44, 0.7, '#eea25a');
    return svg;
  }
  function nopeArt() {
    // 作废：一只灰紫色的猫两只前爪举起来、掌心朝外喊「停」，身后一个大大的禁止圈
    let svg = ground();
    svg += '<circle cx="50" cy="48" r="36" fill="none" stroke="#c4a8dc" stroke-width="7"/><path d="M25 23 75 73" stroke="#c4a8dc" stroke-width="7" stroke-linecap="round"/>';
    svg += body(50, 80, 19, 12, '#8f8a99');
    // 两条胳膊（从身子两侧斜着往上）+ 掌心朝外的爪子
    svg += '<path d="M38 76 27 58M62 76 73 58" stroke="#a9a3b3" stroke-width="9" stroke-linecap="round"/>';
    svg += paw(26, 54, 1.25, '#a9a3b3') + paw(74, 54, 1.25, '#a9a3b3');
    svg += catHead(50, 50, 0.86, '#a9a3b3', { ear: '#e6b5c4', eyes: 'open', mouth: 'flat', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#8f8a99') });
    return svg;
  }

  // 指定甩锅：同一只扛锅的猫，锅上方多一个红色准星（甩给指定的人）
  function tattackArt() {
    const base = attackArt();
    const sight = '<g transform="translate(74 22)"><circle r="13" fill="rgba(255,250,242,.85)" stroke="#7c3a22" stroke-width="3.2"/><circle r="4" fill="#7c3a22"/>' +
      '<path d="M0 -19v8M0 11v8M-19 0h8M11 0h8" stroke="#7c3a22" stroke-width="3.2" stroke-linecap="round"/></g>';
    return base + sight;
  }
  function attackArt() {
    // 推锅：猫两只爪子推着一口大黑锅往右滑，锅上冒着「热气」
    let svg = ground();
    svg += '<g transform="translate(66 64)"><ellipse cx="0" cy="12" rx="22" ry="6" fill="rgba(29,27,24,.12)"/>' +
      '<path d="M-20 -6h40c0 14-8 20-20 20s-20-6-20-20Z" fill="#3a3632"/><rect x="-23" y="-10" width="46" height="6" rx="3" fill="#56504a"/>' +
      '<rect x="22" y="-9" width="10" height="4" rx="2" fill="#8a6a3e"/>' + line('M-8 -16q3 -5 0 -10M2 -16q3 -5 0 -10M12 -16q3 -5 0 -10', 2.6, '#aaa294') + '</g>';
    svg += body(30, 76, 18, 14, '#f0c27a');
    svg += catHead(28, 52, 0.82, '#f0c27a', { eyes: 'closed', mouth: 'grr', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#d89a4a'), muzzle: '#fff4e3' });
    svg += '<path d="M38 70h10" stroke="#f0c27a" stroke-width="8" stroke-linecap="round"/>' + paw(48, 69, 0.55, '#f0c27a');
    svg += line('M10 60h-6M12 70h-8M10 80h-6', 2.6, '#c0742e');
    return svg;
  }
  function skipArt() {
    // 跳过：蜷成一团的猫，尾巴盖着脸，头顶「Z z」和一弯月亮
    let svg = ground();
    svg += '<ellipse cx="50" cy="72" rx="32" ry="18" fill="#9bb0cc"/>';
    svg += '<path d="M20 74c4 12 30 18 48 10" stroke="#7d93b2" stroke-width="9" stroke-linecap="round" fill="none"/>';
    svg += catHead(40, 62, 0.85, '#b4c5dd', { eyes: 'closed', mouth: 'none', ear: '#e6c3cf', blushC: '#f4b0b8' });
    svg += '<path d="M66 18a12 12 0 1 0 10 18 9 9 0 1 1 -10 -18Z" fill="' + GOLD + '"/>';
    svg += '<path d="M60 34h8l-8 9h8" stroke="' + NAVY + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    svg += '<path d="M73 46h5l-5 6h5" stroke="' + NAVY + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return svg;
  }
  function bottomArt() {
    // 抽底：一摞牌背，一只猫趴着，伸爪子从最底下抽出一张；下面一道往外拐的箭头
    let svg = ground();
    for (let i = 0; i < 6; i++) svg += '<g transform="translate(' + f(64 + (i % 2 ? 1 : -1) * 0.8) + ' ' + f(70 - i * 6) + ')"><rect x="-15" y="-20" width="30" height="40" rx="5" fill="' + NAVY + '" stroke="' + CREAM + '" stroke-width="2.2"/><rect x="-10" y="-15" width="20" height="30" rx="3" fill="none" stroke="' + GOLD + '" stroke-width="1.6"/></g>';
    // 被抽出来的那张：从最底下斜着滑出来
    svg += '<g transform="translate(40 84) rotate(-14)"><rect x="-15" y="-20" width="30" height="40" rx="5" fill="' + NAVY + '" stroke="' + CREAM + '" stroke-width="2.2"/><rect x="-10" y="-15" width="20" height="30" rx="3" fill="none" stroke="' + GOLD + '" stroke-width="1.6"/></g>';
    svg += '<path d="M60 92c-10 6-26 6-36-2" stroke="#8a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M20 84l2 10 9-3Z" fill="#8a4f7a"/>';
    svg += catHead(24, 52, 0.62, '#eea25a', { eyes: 'wide', mouth: 'o', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#d27a36'), muzzle: '#fff4e3' });
    svg += '<path d="M30 64c4 8 8 12 12 14" stroke="#eea25a" stroke-width="8" stroke-linecap="round" fill="none"/>';
    svg += paw(44, 78, 0.6, '#eea25a');
    return svg;
  }
  /* 抽顶（2026-11-15 用户：百变「摸底」生效时手里的抽底变成「抽顶」）。三个候选，用户挑了乙（抽底的镜像），甲 / 丙留着备查 */
  const backCard = (x, y, rot) => '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ')"><rect x="-15" y="-20" width="30" height="40" rx="5" fill="' + NAVY + '" stroke="' + CREAM + '" stroke-width="2.2"/><rect x="-10" y="-15" width="20" height="30" rx="3" fill="none" stroke="' + GOLD + '" stroke-width="1.6"/></g>';
  const TOPDRAW = {
    // 甲：猫站在一摞牌顶上，两只爪子把最上面那张举过头顶
    a: () => { let svg = ground(); for (let i = 0; i < 6; i++) svg += backCard(50 + (i % 2 ? 0.8 : -0.8), 80 - i * 5.4, 0); svg += backCard(50, 14, -6);
      svg += catHead(50, 40, 0.58, '#eea25a', { eyes: 'happy', mouth: 'o', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#d27a36'), muzzle: '#fff4e3' });
      svg += line('M41 34 44 24', 6, '#eea25a') + line('M59 34 56 24', 6, '#eea25a') + paw(44, 24, 0.42, '#eea25a') + paw(56, 24, 0.42, '#eea25a');
      svg += '<path d="M78 66c6-12 6-26-2-38" stroke="#8a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M71 30l7-8 3 10Z" fill="#8a4f7a"/>'; return svg; },
    // 乙：和抽底一个构图、上下反过来：猫趴在一边，伸爪子把最上面那张斜着拖下来；一道往上拐的箭头
    b: () => { let svg = ground(); for (let i = 0; i < 6; i++) svg += backCard(64 + (i % 2 ? 0.8 : -0.8), 86 - i * 6, 0); svg += backCard(42, 30, 14);
      svg += '<path d="M60 22c-10-7-26-6-34 3" stroke="#8a4f7a" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M22 30l1-11 9 4Z" fill="#8a4f7a"/>';
      svg += catHead(24, 66, 0.62, '#eea25a', { eyes: 'wide', mouth: 'o', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#d27a36'), muzzle: '#fff4e3' });
      svg += '<path d="M32 56c4-10 8-16 12-20" stroke="#eea25a" stroke-width="8" stroke-linecap="round" fill="none"/>' + paw(45, 36, 0.6, '#eea25a'); return svg; },
    // 丙：就是抽底那幅画倒过来（字面意思的「反过来」），右上角一个转圈小箭头
    c: () => '<g transform="translate(50 50) rotate(180) translate(-50 -50)">' + bottomArt() + '</g>' +
      '<path d="M86 22a8 8 0 1 0 -4 9" stroke="#8a4f7a" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M78 33l5 -5 2 6Z" fill="#8a4f7a"/>',
  };
  const TOPDRAW_LOOK = 'b';
  const topdrawArt = () => TOPDRAW[TOPDRAW_LOOK]();

  function favorArt() {
    // 蹭一张：猫咪眯眼蹭过来，捧着一张牌，冒小心心
    let svg = ground();
    svg += body(50, 78, 22, 15, '#f3d2c4');
    svg += catHead(46, 50, 1, '#f6dfd3', { eyes: 'heart', mouth: 'smile', ear: '#f2a8b4', blushC: '#ef8f9f' });
    svg += card(70, 72, 12, '#c4607a');
    svg += paw(62, 80, 0.55, '#f6dfd3') + paw(77, 80, 0.55, '#f6dfd3');
    svg += heart(78, 22, 5, '#e0566e') + heart(88, 34, 3.4, '#ef8f9f') + heart(20, 26, 3.6, '#ef8f9f');
    return svg;
  }
  function shuffleArt() {
    // 打翻纸箱：倒扣歪掉的纸箱，牌撒了一地，一只猫从箱里探出半个头
    let svg = ground();
    svg += '<g transform="translate(52 66) rotate(-14)"><path d="M-30 -18h56v36h-56Z" fill="#c99a62"/><path d="M-30 -18l-8 -8h56l8 8Z" fill="#dcb27c"/><path d="M26 -18l10 -12v30l-10 18Z" fill="#a97c48"/>' +
      '<rect x="-30" y="-2" width="56" height="5" fill="#a97c48"/></g>';
    svg += catHead(30, 46, 0.62, '#3c3530', { eyes: 'wide', mouth: 'o', ear: '#e58e8e' });
    svg += card(78, 30, 24) + card(16, 80, -30, '#c0742e') + card(84, 84, 40, '#3f7f86') + card(64, 18, -18, '#c4607a');
    return svg;
  }
  // 重排：三张牌背扇开，一只猫爪按着中间那张，上面一道弯弯的「换位」双箭头
  // 交换：左右两小扇手牌，上面一道弧箭头从左到右、下面一道从右到左
  function swapArt() {
    let svg = ground();
    const fan = (cx, flip) => { let g = ''; for (let i = 0; i < 3; i++) g += '<g transform="translate(' + (cx + (i - 1) * 7 * flip) + ' 58) rotate(' + ((i - 1) * 12 * flip) + ')"><rect x="-9" y="-13" width="18" height="26" rx="3" fill="' + (i === 2 ? CREAM : NAVY) + '" stroke="' + NAVY + '" stroke-width="1.6"/>' + (i === 2 ? '' : '<rect x="-6" y="-10" width="12" height="20" rx="2" fill="none" stroke="' + GOLD + '" stroke-width="1.5"/>') + '</g>'; return g; };
    svg += fan(28, 1) + fan(72, -1);
    svg += '<path d="M28 34Q50 16 72 34" fill="none" stroke="#2f8a83" stroke-width="4" stroke-linecap="round"/><path d="M0 0-8-4.5V4.5Z" fill="#2f8a83" transform="translate(73.5 35.5) rotate(42)"/>';
    svg += '<path d="M72 82Q50 98 28 82" fill="none" stroke="#2f8a83" stroke-width="4" stroke-linecap="round"/><path d="M0 0-8-4.5V4.5Z" fill="#2f8a83" transform="translate(26.5 80.5) rotate(222)"/>';
    return svg;
  }
  function alterArt() {
    // 重排：三张牌背笔直排一排，上面一道对称的弧形双向箭头（两头各一个规整的三角箭头）
    let svg = ground();
    for (let i = 0; i < 3; i++) svg += '<g transform="translate(' + (26 + i * 24) + ' 64)"><rect x="-10" y="-14" width="20" height="28" rx="3.5" fill="' + NAVY + '"/><rect x="-6.8" y="-10.8" width="13.6" height="21.6" rx="2.2" fill="none" stroke="' + GOLD + '" stroke-width="1.8"/></g>';
    svg += '<path d="M28 40Q50 14 72 40" fill="none" stroke="#4f5d9a" stroke-width="4.2" stroke-linecap="round"/>';
    svg += '<path d="M0 0-9-5V5Z" fill="#4f5d9a" transform="translate(74 42.5) rotate(50)"/>';
    svg += '<path d="M0 0-9-5V5Z" fill="#4f5d9a" transform="translate(26 42.5) rotate(130)"/>';
    return svg;
  }

  function futureArt() {
    // 猫眼偷看：纸箱上挖了个洞，一只大猫眼往外看；三张牌背在前面排开
    let svg = ground();
    svg += '<rect x="14" y="20" width="72" height="50" rx="6" fill="#dcb27c"/><rect x="14" y="20" width="72" height="9" rx="4" fill="#c99a62"/>';
    svg += '<ellipse cx="50" cy="46" rx="22" ry="14" fill="#3c3530"/>';
    svg += '<ellipse cx="50" cy="46" rx="16" ry="11" fill="#e9d46a"/><ellipse cx="50" cy="46" rx="4" ry="10" fill="' + INK + '"/><circle cx="45" cy="41" r="2.6" fill="#fff"/>';
    for (let i = 0; i < 3; i++) svg += '<g transform="translate(' + (32 + i * 18) + ' 80) rotate(' + ((i - 1) * 8) + ')"><rect x="-8" y="-11" width="16" height="22" rx="3" fill="' + NAVY + '"/><rect x="-5" y="-8" width="10" height="16" rx="2" fill="none" stroke="' + GOLD + '" stroke-width="1.8"/></g>';
    return svg;
  }

  /* 万能猫（2026-11-13 用户从甲乙丙里挑定乙·变身猫）：金色小猫挥星星棒，身边飘五种猫的小爪印——想当哪只就当哪只 */
  const star = (x, y, r, c, rot) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5 + (rot || 0); const rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr); } return '<path d="' + d + 'Z" fill="' + c + '" stroke="' + c + '" stroke-width="1.2" stroke-linejoin="round"/>'; };
  function wildArt() {
    const fur = '#e7c27a', dark = '#b8914a';
    let svg = ground();
    svg += line('M70 84c12-2 16-14 10-24', 7, dark);
    svg += body(50, 76, 24, 17, fur);
    svg += '<ellipse cx="43" cy="89" rx="6" ry="4" fill="#fff4e3"/><ellipse cx="57" cy="89" rx="6" ry="4" fill="#fff4e3"/>';
    svg += catHead(50, 44, 1.0, fur, { muzzle: '#fff4e3', eyes: 'happy', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, dark) });
    svg += line('M66 72 80 40', 3.4, NAVY) + star(81, 36, 8, GOLD, 0.15);
    for (const [c, x, y] of [['#eea25a', 14, 26], ['#e58e46', 12, 50], ['#2a2622', 22, 66], ['#8c7a62', 86, 62], ['#5a3e30', 90, 16]]) svg += '<g transform="translate(' + (x - 5) + ' ' + (y - 5) + ') scale(.42)">' + pawPrint(c) + '</g>';
    return svg;
  }

  /* 转向（2026-11-13）：一只蓝灰小猫扭头往回看，身后一大圈首尾相接的两道弧形箭头——方向倒过来 */
  function reverseArt() {
    const C = '#1f7a9c';
    let svg = ground();
    const arrow = (d, tip, rot) => line(d, 5, C) + '<path d="M0 0-7-4.5V4.5Z" fill="' + C + '" stroke="' + C + '" stroke-width="2" stroke-linejoin="round" transform="translate(' + tip + ') rotate(' + rot + ')"/>';
    // 上面一道从右往左、下面一道从左往右，围成一圈
    svg += arrow('M80 40A32 30 0 0 0 26 26', '22 30', 132) + arrow('M20 64A32 30 0 0 0 74 78', '78 74', -48);
    svg += line('M66 84c10-1 14-10 9-18', 6, '#7d93b2');
    svg += body(50, 74, 20, 14, '#9bb0cc');
    svg += catHead(50, 46, 0.86, '#b4c5dd', { eyes: 'side', ear: '#e6c3cf', blushC: '#f4b0b8' });
    svg += '<ellipse cx="44" cy="86" rx="5" ry="3.4" fill="#e4ebf4"/><ellipse cx="56" cy="86" rx="5" ry="3.4" fill="#e4ebf4"/>';
    return svg;
  }

  // 百变（2026-11-15 用户挑甲 1 · 魔法棒）：不戴帽子、耳朵全露出来（用户：猫耳朵最有灵魂，别挡）；爪子侧举一根金头木杆、顶上五角星的魔法棒，
  // 头顶一道金色星点弧线撒过去。牌框的五彩描边、斜光、深紫金字名字条在 zhamao.css
  const spark = (x, y, r, c) => '<path d="M' + x + ' ' + f(y - r) + 'Q' + f(x + r * 0.18) + ' ' + f(y - r * 0.18) + ' ' + f(x + r) + ' ' + y + 'Q' + f(x + r * 0.18) + ' ' + f(y + r * 0.18) + ' ' + x + ' ' + f(y + r) + 'Q' + f(x - r * 0.18) + ' ' + f(y + r * 0.18) + ' ' + f(x - r) + ' ' + y + 'Q' + f(x - r * 0.18) + ' ' + f(y - r * 0.18) + ' ' + x + ' ' + f(y - r) + 'Z" fill="' + c + '"/>';
  function star5(x, y, R, r, c, st) {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr); }
    return '<path d="' + d + 'Z" fill="' + c + '"' + (st ? ' stroke="' + st + '" stroke-width="1.3" stroke-linejoin="round"' : '') + '/>';
  }
  function fluxArt() {
    let svg = ground();
    svg += line('M66 84c10-1 14-10 9-18', 6, '#b79ac0');
    svg += body(50, 74, 20, 14, '#cdb4d6');
    svg += catHead(50, 50, 0.82, '#dcc8e4', { eyes: 'side', ear: '#efc7d6', blushC: '#f4b0b8' });
    svg += '<ellipse cx="44" cy="86" rx="5" ry="3.4" fill="#f1e8f4"/><ellipse cx="56" cy="86" rx="5" ry="3.4" fill="#f1e8f4"/>';
    // 魔法棒：木杆 + 握手那截金色 + 顶上金色五角星
    svg += line('M66 72 84 40', 3.4, '#6b4a2e') + line('M66 72 70.5 64', 3.4, '#e9c86a') + star5(85.5, 37.5, 8.5, 3.6, '#f6dc8c', '#c9a24a');
    svg += paw(66, 72, 0.62, '#dcc8e4');
    // 头顶一道星点弧线（圆头短线 = 一颗颗金点），撒下几颗彩色小星
    svg += '<path d="M80 30Q60 6 30 18" stroke="#e9c86a" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="0.1 4.2"/>';
    svg += spark(30, 18, 4.5, '#d4607e') + spark(44, 10, 3.4, '#2f8a83') + spark(62, 9, 3, '#e0893e') + spark(16, 40, 4, '#8a63a8') + spark(14, 62, 3, GOLD);
    return svg;
  }

  const FACE = {
    boom: boomArt, defuse: defuseArt, nope: nopeArt, attack: attackArt, tattack: tattackArt, skip: skipArt, bottom: bottomArt, favor: favorArt, shuffle: shuffleArt, future: futureArt, alter: alterArt, swap: swapArt,
    orange: () => breedCat('orange'), calico: () => breedCat('calico'), cow: () => breedCat('cow'), tabby: () => breedCat('tabby'), siamese: () => breedCat('siamese'), wild: wildArt, reverse: reverseArt, flux: fluxArt, topdraw: topdrawArt,
  };
  const cache = {};
  function topdrawFace(v) { return '<svg viewBox="0 0 100 100" aria-hidden="true">' + TOPDRAW[v]() + '</svg>'; }
  function face(kind) {
    if (!cache[kind]) cache[kind] = '<svg viewBox="0 0 100 100" aria-hidden="true">' + FACE[kind]() + '</svg>';
    return cache[kind];
  }

  /* ───── 角标（24×24），同名牌一样 ───── */
  const ICON = {
    boom: () => { let d = ''; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 6 : 10; d += (i ? 'L' : 'M') + f(12 + Math.cos(a) * r) + ' ' + f(12 + Math.sin(a) * r); } return '<path d="' + d + 'Z" fill="#3a3632"/><circle cx="9.5" cy="11" r="1.6" fill="#fff"/><circle cx="14.5" cy="11" r="1.6" fill="#fff"/>'; },
    defuse: () => line('M18 21 12 6', 2.4, '#8a6a3e') + '<path d="M12 6c-4-1-7 2-6 6 3 0 6-2 6-6Z" fill="#e0566e"/><path d="M12 6c-1 4 1 7 5 7 0-3-2-6-5-7Z" fill="' + GOLD + '"/>',
    nope: () => '<circle cx="12" cy="12" r="9" fill="none" stroke="#7a5a96" stroke-width="2.6"/>' + line('M5.6 5.6 18.4 18.4', 2.6, '#7a5a96'),
    attack: () => '<path d="M3 10h16c0 6-3 9-8 9s-8-3-8-9Z" fill="#3a3632"/><rect x="2" y="8" width="18" height="3" rx="1.5" fill="#56504a"/>' + line('M21 14h2', 2.2, '#c0742e'),
    tattack: () => '<path d="M3 12h13c0 5-2.6 8-6.5 8S3 17 3 12Z" fill="#3a3632"/><rect x="2" y="10" width="15" height="2.6" rx="1.3" fill="#56504a"/><circle cx="18" cy="6" r="4.2" fill="none" stroke="#7c3a22" stroke-width="1.8"/><circle cx="18" cy="6" r="1.3" fill="#7c3a22"/>',
    skip: () => '<path d="M15 3a8 8 0 1 0 6 12 6 6 0 1 1 -6 -12Z" fill="' + GOLD + '"/>' + '<path d="M5 6h4l-4 5h4" stroke="' + NAVY + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    favor: () => heart(12, 13, 7, '#e0566e'),
    bottom: () => '<rect x="7" y="2.5" width="11" height="4" rx="1.4" fill="' + NAVY + '"/><rect x="7" y="7.5" width="11" height="4" rx="1.4" fill="' + NAVY + '"/><rect x="2.5" y="14" width="11" height="4" rx="1.4" fill="#8a4f7a" transform="rotate(-10 8 16)"/>' + line('M17 15.5c0 4-3 6-7 6.2', 2, '#8a4f7a') + '<path d="M8 21.7l3.4-2.4.2 4.1Z" fill="#8a4f7a"/>',
    shuffle: () => '<path d="M4 9h14v11H4Z" fill="#c99a62"/><path d="M4 9l-2-3h14l2 3Z" fill="#dcb27c"/>' + line('M7 4l3 2M16 2l-1 3', 2, '#8a6a3e'),
    future: () => '<ellipse cx="12" cy="12" rx="10" ry="6.5" fill="#3c3530"/><ellipse cx="12" cy="12" rx="7" ry="5" fill="#e9d46a"/><ellipse cx="12" cy="12" rx="1.8" ry="4.4" fill="' + INK + '"/>',
    alter: () => '<rect x="3" y="12" width="7.5" height="10" rx="1.6" fill="' + NAVY + '"/><rect x="13.5" y="12" width="7.5" height="10" rx="1.6" fill="' + NAVY + '"/><path d="M6.5 9Q12 2.5 17.5 9" fill="none" stroke="#4f5d9a" stroke-width="2" stroke-linecap="round"/><path d="M0 0-3.4-2V2Z" fill="#4f5d9a" transform="translate(18 9.6) rotate(50)"/><path d="M0 0-3.4-2V2Z" fill="#4f5d9a" transform="translate(6 9.6) rotate(130)"/>',
    swap: () => '<path d="M4 8h13" stroke="#2f8a83" stroke-width="2.4" stroke-linecap="round"/><path d="M20 8l-4.4-3v6z" fill="#2f8a83"/><path d="M20 16H7" stroke="#2f8a83" stroke-width="2.4" stroke-linecap="round"/><path d="M4 16l4.4-3v6z" fill="#2f8a83"/>',
  };
  for (const k of Object.keys(BREED)) {
    const b = BREED[k];
    ICON[k] = ((bb, kk) => () => {
      const c = kk === 'calico' ? '#e58e46' : kk === 'cow' ? '#2a2622' : kk === 'siamese' ? '#5a3e30' : bb.fur;
      return pawPrint(c);
    })(b, k);
  }
  // 万能猫角标：五色爪印（掌垫暖金，四颗趾豆橘 / 黑 / 狸花棕 / 暹罗深）
  ICON.wild = () => '<path d="M12 12.4C14.9 12.4 17.4 14.3 18.3 16.9C18.9 18.7 17.9 20.6 16.1 20.9C14.9 21.1 13.9 20.5 12 20.5C10.1 20.5 9.1 21.1 7.9 20.9C6.1 20.6 5.1 18.7 5.7 16.9C6.6 14.3 9.1 12.4 12 12.4Z" fill="#c9a24a"/>' +
    [[4.7, 10.6, -28, 2.05, 2.65, '#eea25a'], [8.9, 6.4, -9, 2.2, 2.85, '#2a2622'], [15.1, 6.4, 9, 2.2, 2.85, '#8c7a62'], [19.3, 10.6, 28, 2.05, 2.65, '#5a3e30']]
      .map(([x, y, r, rx, ry, c]) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + r + ' ' + x + ' ' + y + ')" fill="' + c + '"/>').join('');
  // 转向角标：两道弧形箭头首尾相接围成一圈
  ICON.reverse = () => '<path d="M19.5 9.5A8 8 0 0 0 5.6 7" fill="none" stroke="#1f7a9c" stroke-width="2.4" stroke-linecap="round"/><path d="M0 0-4-2.6V2.6Z" fill="#1f7a9c" transform="translate(4.6 8.4) rotate(130)"/>' +
    '<path d="M4.5 14.5A8 8 0 0 0 18.4 17" fill="none" stroke="#1f7a9c" stroke-width="2.4" stroke-linecap="round"/><path d="M0 0-4-2.6V2.6Z" fill="#1f7a9c" transform="translate(19.4 15.6) rotate(-50)"/>';
  // 百变规则「急救」（交出一对一样的牌顶逗猫棒）的标：两张扇开的牌 + 一枚红十字急救章。
  // 2026-11-26 用户：原来借三花的橘爪印，和「百搭」（万能猫五色爪印）太像——百搭留爪印，急救换成这个
  ICON.catsave = () => '<rect x="2.6" y="5.2" width="9.6" height="13.6" rx="1.8" fill="#fffaf0" stroke="' + NAVY + '" stroke-width="1.5" transform="rotate(-14 7.4 12)"/>' +
    '<rect x="8.4" y="4.2" width="9.6" height="13.6" rx="1.8" fill="#fffaf0" stroke="' + NAVY + '" stroke-width="1.5" transform="rotate(8 13.2 11)"/>' +
    '<circle cx="16.8" cy="16.8" r="5.6" fill="' + RED + '" stroke="#fffaf0" stroke-width="1.2"/>' +
    '<path d="M16.8 13.6v6.4M13.6 16.8h6.4" stroke="#fffaf0" stroke-width="2.2" stroke-linecap="round"/>';
  // 抽顶角标：抽底角标上下翻过来
  ICON.topdraw = () => '<g transform="translate(0 24) scale(1 -1)">' + ICON.bottom() + '</g>';
  // 百变角标：一颗梅紫四角星 + 一颗小金星
  ICON.flux = () => spark(10.5, 12.5, 8.5, '#8e4a9c') + spark(19, 5.5, 4, GOLD);
  const icache = {};
  function icon(kind) {
    if (!icache[kind]) icache[kind] = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[kind]() + '</svg>';
    return icache[kind];
  }

  /* 牌背：藏蓝底 + 金色内框 + 中间一个金色爪印 */
  const BACK = '<svg viewBox="0 0 100 140" aria-hidden="true"><rect width="100" height="140" rx="10" fill="' + NAVY + '"/>' +
    '<rect x="8" y="8" width="84" height="124" rx="6" fill="none" stroke="' + GOLD + '" stroke-width="2.6"/>' +
    '<g transform="translate(50 70) scale(2.3) translate(-12 -14)">' + pawPrint(GOLD) + '</g></svg>';

  /* 封面：一只炸毛猫 + 一只橘猫举着逗猫棒。各自包一层 <g class>，CSS 让它们待机时动（炸毛猫一鼓一鼓、偶尔一抖，
   * 橘猫上下晃） */
  /* 一根长长的逗猫棒（不带猫）：把手在右下 (96,98)，杆子斜着伸到左上 (40,12)，杆头一根绳吊着一串羽毛。
   * .wand-stick 整根绕把手摆，.wand-tail 绳 + 羽毛绕杆头再荡一荡 */
  function wandInner() {
    return '<g class="wand-stick">' +
      '<path d="M96 98 40 12" stroke="#6f5330" stroke-width="5.2" stroke-linecap="round"/><path d="M96 98 40 12" stroke="#a07a48" stroke-width="2.6" stroke-linecap="round"/>' +
      '<rect x="88" y="84" width="9" height="16" rx="3" fill="#c0742e" transform="rotate(-33 92 92)"/>' +
      '<g class="wand-tail"><path d="M40 12c-10-4-20 2-22 14" fill="none" stroke="' + NAVY + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<g transform="translate(18 30)"><path d="M0 0c-9-3-16 4-14 13 7 0 14-4 14-13Z" fill="#e0566e"/><path d="M0 0c-2 9 2 16 11 15 0-7-4-13-11-15Z" fill="' + GOLD + '"/>' +
      '<path d="M0 0c-6 7-6 15 0 20 5-7 4-14 0-20Z" fill="#6fa8dc"/><circle cx="0" cy="0" r="3" fill="#c8463a"/></g></g></g>';
  }
  function wand() { return '<svg class="zm-wand" viewBox="0 0 100 100" aria-hidden="true" overflow="visible">' + wandInner() + '</svg>'; }

  /* 主页插画：只有一只随时要炸的炸毛猫 + 一根在它头顶不停挥的逗猫棒 */
  function hero() {
    const boom = boomArt();
    return '<svg viewBox="0 -6 200 126" aria-hidden="true" overflow="visible">' +
      '<g transform="translate(30 14)"><g class="hero-boom">' + boom + '</g></g>' +
      '<g transform="translate(83 -8) scale(.95)"><g class="hero-wand">' + wandInner() + '</g></g></svg>';
  }

  /* 道具（特效用）：推锅的锅、偷看的大猫眼、赢家的皇冠、落空的红叉。viewBox 都是 0 0 100 100 */
  const PROPS = {
    pot: '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="86" rx="34" ry="6" fill="rgba(29,27,24,.14)"/>' +
      '<path d="M10 40h80c0 28-16 42-40 42S10 68 10 40Z" fill="#3a3632"/><path d="M18 46h64c-2 20-14 30-32 30S20 66 18 46Z" fill="#4a4540"/>' +
      '<rect x="4" y="32" width="92" height="12" rx="6" fill="#5c5650"/><rect x="88" y="34" width="12" height="8" rx="4" fill="#8a6a3e"/><rect x="0" y="34" width="12" height="8" rx="4" fill="#8a6a3e"/>' +
      '<path d="M28 52c4-3 8-3 12 0" stroke="#6e675f" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    eye: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M4 50C18 26 34 16 50 16s32 10 46 34C82 74 66 84 50 84S18 74 4 50Z" fill="#3c3530"/>' +
      '<ellipse cx="50" cy="50" rx="30" ry="27" fill="#e9d46a"/><ellipse class="pupil" cx="50" cy="50" rx="8" ry="24" fill="' + INK + '"/>' +
      '<circle cx="40" cy="38" r="6" fill="#fff"/><circle cx="58" cy="62" r="3" fill="#fff" opacity=".7"/></svg>',
    // 皇冠：金属渐变（亮金→古铜）、三颗珍珠尖、正中一颗切面红宝石、冠箍上一红两蓝、一道高光
    crown: '<svg viewBox="0 0 120 100" aria-hidden="true"><defs>' +
      '<linearGradient id="zmCrG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf0c4"/><stop offset=".42" stop-color="#e6b85c"/><stop offset="1" stop-color="#9a6a24"/></linearGradient>' +
      '<linearGradient id="zmCrB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc8e"/><stop offset=".55" stop-color="#c58f3a"/><stop offset="1" stop-color="#7a5119"/></linearGradient>' +
      '<radialGradient id="zmCrP" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f1e8d6"/><stop offset="1" stop-color="#bfae8f"/></radialGradient>' +
      '<radialGradient id="zmCrR" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffb3a3"/><stop offset=".45" stop-color="#d23a2f"/><stop offset="1" stop-color="#6e1410"/></radialGradient>' +
      '<radialGradient id="zmCrS" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#b9cdf0"/><stop offset=".45" stop-color="#34558a"/><stop offset="1" stop-color="#16274a"/></radialGradient>' +
      '</defs>' +
      '<path d="M17 74 10 31l25 21 25-34 25 34 25-21-7 43Z" fill="url(#zmCrG)" stroke="#6f4a17" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M21 68 16 41l20 17M60 24l-16 22" fill="none" stroke="rgba(255,250,230,.65)" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M60 35l8 11-8 12-8-12Z" fill="url(#zmCrR)" stroke="#5a100c" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M52 46h16M60 35v23" stroke="rgba(255,220,210,.45)" stroke-width="1"/>' +
      '<rect x="14" y="70" width="92" height="18" rx="4" fill="url(#zmCrB)" stroke="#6f4a17" stroke-width="2.2"/>' +
      '<path d="M18 74.5h84" stroke="rgba(255,244,210,.7)" stroke-width="1.6" stroke-linecap="round"/><path d="M18 84h84" stroke="rgba(90,58,16,.35)" stroke-width="1.2"/>' +
      '<circle cx="35" cy="79" r="4.6" fill="url(#zmCrS)" stroke="#132140" stroke-width="1"/><circle cx="85" cy="79" r="4.6" fill="url(#zmCrS)" stroke="#132140" stroke-width="1"/>' +
      '<ellipse cx="60" cy="79" rx="6.5" ry="5.2" fill="url(#zmCrR)" stroke="#5a100c" stroke-width="1"/>' +
      '<circle cx="33.6" cy="77.4" r="1.3" fill="#fff" opacity=".85"/><circle cx="83.6" cy="77.4" r="1.3" fill="#fff" opacity=".85"/><circle cx="58" cy="77" r="1.5" fill="#fff" opacity=".85"/>' +
      '<circle cx="10" cy="29" r="5.8" fill="url(#zmCrP)" stroke="#9c8a6a" stroke-width="1"/><circle cx="60" cy="16" r="6.8" fill="url(#zmCrP)" stroke="#9c8a6a" stroke-width="1"/><circle cx="110" cy="29" r="5.8" fill="url(#zmCrP)" stroke="#9c8a6a" stroke-width="1"/>' +
      '</svg>',
    cross: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 20 80 80M80 20 20 80" stroke="' + RED + '" stroke-width="14" stroke-linecap="round"/></svg>',
  };


  /* ───── 角色猫（2026-11-18 用户定：卡片甲 · 牌桌同款；贪吃猫 = 捧碗、截胡猫 = 禁止光环）─────
   * 每只角色是「一只带道具的猫」，和五种猫牌的坐姿猫一眼分开。roleFace(id) 100×100；roleGlyph(id) 一行小图示（代替说明文字） */
  const RE = (cx, cy, rx, ry, c) => '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="' + c + '"/>';
  const rGround = () => RE(50, 93, 34, 4.5, 'rgba(29,27,24,.09)');
  const rStripes = (c) => line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, c) + line('M-23 0h5M-23 5h5M23 0h-5M23 5h-5', 2.6, c);
  function rSit(o) {
    let s = rGround() + line(o.tailD || 'M70 84c12-2 16-14 10-24', 7, o.tail);
    s += RE(50, 76, 24, 17, o.fur) + (o.bodyX || '');
    return s + RE(43, 89, 6, 4, o.foot || o.fur) + RE(57, 89, 6, 4, o.foot || o.fur);
  }
  const NOPE_C = '#7a5a96';
  const banSign = (cx, cy, r, w, fill) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + (fill || 'none') + '" stroke="' + NOPE_C + '" stroke-width="' + w + '"/><path d="M' + f(cx - r * 0.7) + ' ' + f(cy - r * 0.7) + 'L' + f(cx + r * 0.7) + ' ' + f(cy + r * 0.7) + '" stroke="' + NOPE_C + '" stroke-width="' + w + '" stroke-linecap="round"/>';
  const ROLE_ART = {
    // 胆小猫：缩在纸箱里只露半张脸 + 两只爪，冒一滴汗
    timid() {
      const fur = '#c9d3e2';
      let s = rGround() + '<path d="M20 58h60l-5-7H25Z" fill="#a97b45"/>';
      s += catHead(50, 50, 0.95, fur, { eyes: 'wide', ear: '#e6c3cf', mouth: 'none', blushC: '#f4b0b8' });
      s += '<rect x="16" y="58" width="68" height="34" rx="3" fill="#d9ad6e"/>' + blob('M16 58 5 47l13-4 7 9Z', '#e7c18a') + blob('M84 58l11-11-13-4-7 9Z', '#e7c18a');
      s += '<g transform="translate(41 67) scale(.75)" fill="#b98a4e">' + pawPrint() + '</g>';
      s += RE(37, 58, 6.5, 4.6, fur) + RE(63, 58, 6.5, 4.6, fur) + line('M35 57.5v2.6M39 57.5v2.6M61 57.5v2.6M65 57.5v2.6', 1.8, '#9aa7ba');
      s += '<path d="M76 22c3 5 5 8 5 10a5 5 0 0 1-10 0c0-2 2-5 5-10Z" fill="#8fb4e0"/>' + line('M17 30q-3 4 0 8M11 28q-4 6 0 12', 2.4, '#9aa7ba');
      return s;
    },
    // 贪吃猫：两只爪捧着一只红碗，碗里两条鱼，舔舌头
    fat() {
      const fur = '#eea25a', dark = '#d27a36', light = '#fff4e3';
      const fish = (x, y, r, sc, c) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ') scale(' + sc + ')">' + RE(0, 0, 10, 5, c) + '<path d="M8.5 0l7.5-5.5v11Z" fill="' + c + '"/><path d="M-3 -4.6q2 4.6 0 9.2" stroke="rgba(255,255,255,.55)" stroke-width="1.6" fill="none"/><circle cx="-5.6" cy="-1.2" r="1.5" fill="' + INK + '"/></g>';
      let s = rSit({ fur, tail: dark, foot: light, bodyX: RE(50, 79, 14, 10, light) + line('M38 66v5M62 66v5', 2.6, dark) });
      s += catHead(50, 40, 1.05, fur, { eyes: 'happy', mouth: 'none', patch: rStripes(dark), muzzle: light });
      s += '<path d="M46.8 50.6h6.4v2.6a3.2 3.2 0 0 1-6.4 0Z" fill="#e06d78"/>';
      s += fish(31, 62, -62, 0.95, '#6fa6c0') + fish(69, 62, -118, 0.95, '#5f97b3');
      s += '<path d="M22 72h56c0 13-12 21-28 21S22 85 22 72Z" fill="#c8463a"/>' + RE(50, 72, 28, 5.5, '#e0604f') + RE(50, 72.5, 23, 3.4, '#8a2e24');
      s += '<g transform="translate(43.5 76) scale(.55)" fill="#fbe1d6">' + pawPrint() + '</g>';
      return s + RE(24, 73, 6.5, 5.5, fur) + RE(76, 73, 6.5, 5.5, fur);
    },
    // 影子猫：月牙下的黑猫，只看得清一对黄眼睛
    shadow() {
      const fur = '#2f2b28';
      let s = '<path d="M76 10a15 15 0 1 0 0 30a12 12 0 1 1 0-30Z" fill="#e3c27a"/><circle cx="20" cy="18" r="1.8" fill="#e3c27a"/><circle cx="28" cy="10" r="1.2" fill="#e3c27a"/>';
      s += rSit({ fur, tail: '#1f1c1a', foot: '#3d3834', tailD: 'M70 86c14 0 18-16 8-26' });
      s += catHead(50, 42, 1.05, fur, { eyes: 'wide', ear: '#6b5a55', blushC: '#8a5a5a', mouth: 'smile' }).replace(/stroke="#1d1b18" stroke-width="2.4"/g, 'stroke="#8a7f74" stroke-width="2.4"');
      for (const x of [40.55, 59.45]) s += RE(x, 40.95, 6.6, 6.8, '#f2d45c') + RE(x, 40.95, 1.7, 5, INK) + '<circle cx="' + f(x - 2.4) + '" cy="38.4" r="1.4" fill="#fff"/>';
      return s;
    },
    // 扛锅猫：奶牛花色，头上倒扣一口锅，一脸无所谓
    cow() {
      const fur = '#fffdf8', blk = '#2a2622';
      let s = rSit({ fur, tail: blk, bodyX: RE(61, 72, 8, 6, blk) });
      s += catHead(50, 46, 1.0, fur, { earFur: blk, ear: '#f6b9a6', eyes: 'closed', mouth: 'smile', patch: '<path d="M-24 2c-1-11 4-19 13-21 3 6 2 14-3 17-4 3-8 4-10 4Z" fill="' + blk + '"/><ellipse cx="13" cy="-10" rx="6" ry="4.5" fill="' + blk + '"/>' });
      s += '<path d="M25 30h50c0-13-11-21-25-21S25 17 25 30Z" fill="#3a3632"/><path d="M33 22c3-5 8-7 13-7" stroke="#6e675f" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
      return s + '<rect x="20" y="28" width="60" height="7" rx="3.5" fill="#5c5650"/><rect x="13" y="29" width="9" height="5" rx="2.5" fill="#8a6a3e"/><rect x="78" y="29" width="9" height="5" rx="2.5" fill="#8a6a3e"/>';
    },
    // 百搭猫：三花抱着一块拼布，爪里捏针
    calico() {
      const fur = '#fff6ea';
      let s = '<g transform="translate(25 60) rotate(-9)"><rect x="-15" y="-15" width="15" height="15" fill="#e58e46"/><rect x="0" y="-15" width="15" height="15" fill="#fff6ea"/><rect x="-15" y="0" width="15" height="15" fill="#3c3530"/><rect x="0" y="0" width="15" height="15" fill="#f0b9a8"/>' +
        '<rect x="-15" y="-15" width="30" height="30" rx="2" fill="none" stroke="' + GOLD + '" stroke-width="1.8" stroke-dasharray="3 2.4"/><path d="M0 -15v30M-15 0h30" stroke="' + GOLD + '" stroke-width="1.8" stroke-dasharray="3 2.4"/></g>';
      s += line('M81 53C94 72 70 99 30 74', 2.2, '#c8463a');
      s += '<g transform="translate(8 0)">' + rSit({ fur, tail: '#e58e46', bodyX: RE(38, 74, 8, 6, '#e58e46') + RE(62, 80, 6, 5, '#3c3530') });
      s += catHead(50, 42, 1.05, fur, { ear: '#f6b9a6', earFur: fur, eyes: 'happy', patch: '<path d="M-24 -2c-1-10 6-17 14-18 3 4 1 12-5 15-3 2-7 3-9 3Z" fill="#e58e46"/><path d="M24 2c0-9-5-16-12-18-3 5 0 11 4 14 3 2 6 3 8 4Z" fill="#3c3530"/>' }) + '</g>';
      return s + line('M66 70 82 52', 3, '#9aa3ad') + '<circle cx="81" cy="53" r="1.6" fill="none" stroke="#9aa3ad" stroke-width="1.4"/>' + RE(64, 72, 6, 5, fur);
    },
    // 截胡猫：身后一圈大大的禁止符号，举起一只爪掌心朝外——「停！」
    tabby() {
      const fur = '#b39c7e', dark = '#6e5c48';
      let s = '<circle cx="50" cy="44" r="36" fill="#ece1f2"/>' + banSign(50, 44, 36, 6);
      s += rSit({ fur, tail: dark, tailD: 'M70 84c14-4 14-22 6-30', bodyX: line('M42 66v6M50 65v7M58 66v6', 2.6, dark) });
      s += catHead(50, 42, 1.05, fur, { eyes: 'open', mouth: 'flat', muzzle: '#efe3cf', patch: line('M-6 -16l3 4 3-4 3 4 3-4', 2.6, dark) + line('M-23 -1h6M-23 5h6M23 -1h-6M23 5h-6', 2.6, dark) });
      return s + line('M66 72q10-8 10-20', 9, fur) + paw(76, 46, 1.05, fur, '#f4b6c0');
    },
  };
  // 角色牌的颜色：bg 画底，band 名字条
  const ROLE_TONE = {
    timid: { bg: '#e3e9f2', band: '#5d7394' }, fat: { bg: '#fbe6cf', band: '#d27a36' }, shadow: { bg: '#dfdde9', band: '#3b3550' },
    cow: { bg: '#efe8da', band: '#8a6a3e' }, calico: { bg: '#f8e4e2', band: '#b0566a' }, tabby: { bg: '#ebe3ef', band: '#6a4f86' },
  };
  const rcache = {};
  function roleFace(id) { if (!rcache[id]) rcache[id] = '<svg viewBox="0 0 100 100" aria-hidden="true">' + (ROLE_ART[id] || ROLE_ART.fat)() + '</svg>'; return rcache[id]; }
  // 技能小图示：一行图标（甩锅 → 猫眼 + 三张 ……），高 24
  const gIc = (k, x) => '<svg x="' + x + '" y="0" width="24" height="24" viewBox="0 0 24 24">' + ICON[k]() + '</svg>';
  const gBack = (x, y, r) => '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + (r || 0) + ')"><rect x="-6" y="-8.5" width="12" height="17" rx="2.2" fill="' + NAVY + '" stroke="' + GOLD + '" stroke-width="1.2"/></g>';
  const gArrow = (x) => '<path d="M' + x + ' 12h9" stroke="#8a7f74" stroke-width="2.2" stroke-linecap="round"/><path d="M' + (x + 12) + ' 12l-4.5-3.4v6.8Z" fill="#8a7f74"/>';
  const GLYPH = {
    timid: () => [92, gIc('attack', 0) + gArrow(27) + gIc('future', 42) + gBack(72, 13, -14) + gBack(79, 12, 0) + gBack(86, 13, 14)],
    fat: () => [94, gIc('favor', 0) + gArrow(27) + gBack(52, 12, -8) + gBack(62, 12, 8) + '<text x="74" y="17" font-size="12" font-weight="700" fill="#d27a36" font-family="Georgia,serif">×2</text>'],
    shadow: () => [82, gIc('orange', 0) + gIc('orange', 18) + gArrow(44) + '<circle cx="70" cy="12" r="9.5" fill="none" stroke="#c8463a" stroke-width="2.4"/><path d="M63.3 5.3l13.4 13.4" stroke="#c8463a" stroke-width="2.4" stroke-linecap="round"/>'],
    cow: () => [86, gIc('attack', 0) + gIc('attack', 20) + gArrow(47) + gIc('attack', 62)],
    calico: () => [100, gIc('orange', 0) + gIc('cow', 20) + '<path d="M48 9.5h9M48 14.5h9" stroke="#8a7f74" stroke-width="2.2" stroke-linecap="round"/>' + gIc('orange', 62) + gIc('orange', 80)],
    tabby: () => [72, gIc('nope', 0) + gArrow(27) + gBack(52, 12, -10) + '<path d="M62 12h8M66 8v8" stroke="#6a4f86" stroke-width="2.4" stroke-linecap="round"/>'],
  };
  const gcache = {};
  function roleGlyph(id) { if (!gcache[id]) { const g = (GLYPH[id] || GLYPH.fat)(); gcache[id] = '<svg viewBox="0 0 ' + g[0] + ' 24" aria-hidden="true">' + g[1] + '</svg>'; } return gcache[id]; }
  // 角色牌背：焦糖棕 + 金框 + 中间一颗金色猫头（和藏蓝的游戏牌背分开）
  const ROLE_BACK = '<svg viewBox="0 0 100 140" aria-hidden="true"><rect width="100" height="140" rx="9" fill="#7a4f2a"/><rect x="7" y="7" width="86" height="126" rx="6" fill="none" stroke="' + GOLD + '" stroke-width="2.4"/><rect x="12" y="12" width="76" height="116" rx="4" fill="none" stroke="' + GOLD + '" stroke-width="1" opacity=".55"/>' +
    '<circle cx="50" cy="70" r="27" fill="#8e6036"/>' + catHead(50, 74, 0.82, GOLD, { ear: '#e3cf9f', eyes: 'closed', mouth: 'none', blush: false }) + '</svg>';

  return { TONE, face, icon, BACK, hero, wand, heart, paw, pawPrint, catHead, PROPS, topdrawFace, ROLE_TONE, roleFace, roleGlyph, ROLE_BACK };
});
