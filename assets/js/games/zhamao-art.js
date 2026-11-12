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
    skip:    { bg: '#dfe7f3', band: '#2f4a6d', ink: '#f6f9ff' },
    favor:   { bg: '#f8e1e4', band: '#c4607a', ink: '#fff8f9' },
    shuffle: { bg: '#efe6d2', band: '#8a6a3e', ink: '#fffaf0' },
    future:  { bg: '#e2eeee', band: '#3f7f86', ink: '#f7ffff' },
    orange:  { bg: '#fbf4e6', band: '#e0893e', ink: '#fffaf0' },
    calico:  { bg: '#fbf4e6', band: '#b98a5a', ink: '#fffaf0' },
    cow:     { bg: '#fbf4e6', band: '#3a3632', ink: '#fffaf0' },
    tabby:   { bg: '#fbf4e6', band: '#8c7a62', ink: '#fffaf0' },
    siamese: { bg: '#fbf4e6', band: '#6b4a3a', ink: '#fffaf0' },
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
    // 喵？不行：猫举起一只爪子「停」，头顶一个问号
    let svg = ground();
    svg += body(50, 78, 23, 15, '#8f8a99');
    svg += catHead(50, 50, 1, '#a9a3b3', { ear: '#e6b5c4', eyes: 'side', mouth: 'flat', patch: line('M-4 -17v5M0 -18v6M4 -17v5', 2.6, '#8f8a99') });
    svg += '<path d="M76 84c2-14 2-26-2-36" stroke="#a9a3b3" stroke-width="9" stroke-linecap="round" fill="none"/>';
    svg += '<g transform="translate(73 40) rotate(-10)"><ellipse cx="0" cy="0" rx="11" ry="12" fill="#a9a3b3"/><ellipse cx="0" cy="2.5" rx="5" ry="4.4" fill="#f4b6c0"/>' +
      '<circle cx="-5.6" cy="-5" r="2.2" fill="#f4b6c0"/><circle cx="-1.8" cy="-7.4" r="2.2" fill="#f4b6c0"/><circle cx="2.2" cy="-7.4" r="2.2" fill="#f4b6c0"/><circle cx="5.8" cy="-5" r="2.2" fill="#f4b6c0"/></g>';
    svg += '<path d="M84 6c0-6 10-6 10 0 0 4-5 4-5 9" stroke="#7a5a96" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="89" cy="21" r="2.6" fill="#7a5a96"/>';
    return svg;
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
    // 装睡：蜷成一团的猫，尾巴盖着脸，头顶「Z z」和一弯月亮
    let svg = ground();
    svg += '<ellipse cx="50" cy="72" rx="32" ry="18" fill="#9bb0cc"/>';
    svg += '<path d="M20 74c4 12 30 18 48 10" stroke="#7d93b2" stroke-width="9" stroke-linecap="round" fill="none"/>';
    svg += catHead(40, 62, 0.85, '#b4c5dd', { eyes: 'closed', mouth: 'none', ear: '#e6c3cf', blushC: '#f4b0b8' });
    svg += '<path d="M66 18a12 12 0 1 0 10 18 9 9 0 1 1 -10 -18Z" fill="' + GOLD + '"/>';
    svg += '<path d="M60 34h8l-8 9h8" stroke="' + NAVY + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    svg += '<path d="M73 46h5l-5 6h5" stroke="' + NAVY + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return svg;
  }
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
  function futureArt() {
    // 猫眼偷看：纸箱上挖了个洞，一只大猫眼往外看；三张牌背在前面排开
    let svg = ground();
    svg += '<rect x="14" y="20" width="72" height="50" rx="6" fill="#dcb27c"/><rect x="14" y="20" width="72" height="9" rx="4" fill="#c99a62"/>';
    svg += '<ellipse cx="50" cy="46" rx="22" ry="14" fill="#3c3530"/>';
    svg += '<ellipse cx="50" cy="46" rx="16" ry="11" fill="#e9d46a"/><ellipse cx="50" cy="46" rx="4" ry="10" fill="' + INK + '"/><circle cx="45" cy="41" r="2.6" fill="#fff"/>';
    for (let i = 0; i < 3; i++) svg += '<g transform="translate(' + (32 + i * 18) + ' 80) rotate(' + ((i - 1) * 8) + ')"><rect x="-8" y="-11" width="16" height="22" rx="3" fill="' + NAVY + '"/><rect x="-5" y="-8" width="10" height="16" rx="2" fill="none" stroke="' + GOLD + '" stroke-width="1.8"/></g>';
    return svg;
  }

  const FACE = {
    boom: boomArt, defuse: defuseArt, nope: nopeArt, attack: attackArt, skip: skipArt, favor: favorArt, shuffle: shuffleArt, future: futureArt,
    orange: () => breedCat('orange'), calico: () => breedCat('calico'), cow: () => breedCat('cow'), tabby: () => breedCat('tabby'), siamese: () => breedCat('siamese'),
  };
  const cache = {};
  function face(kind) {
    if (!cache[kind]) cache[kind] = '<svg viewBox="0 0 100 100" aria-hidden="true">' + FACE[kind]() + '</svg>';
    return cache[kind];
  }

  /* ───── 角标（24×24），同名牌一样 ───── */
  const ICON = {
    boom: () => { let d = ''; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 6 : 10; d += (i ? 'L' : 'M') + f(12 + Math.cos(a) * r) + ' ' + f(12 + Math.sin(a) * r); } return '<path d="' + d + 'Z" fill="#3a3632"/><circle cx="9.5" cy="11" r="1.6" fill="#fff"/><circle cx="14.5" cy="11" r="1.6" fill="#fff"/>'; },
    defuse: () => line('M18 21 12 6', 2.4, '#8a6a3e') + '<path d="M12 6c-4-1-7 2-6 6 3 0 6-2 6-6Z" fill="#e0566e"/><path d="M12 6c-1 4 1 7 5 7 0-3-2-6-5-7Z" fill="' + GOLD + '"/>',
    nope: () => '<circle cx="12" cy="12" r="9" fill="none" stroke="#7a5a96" stroke-width="2.6"/>' + line('M6 18 18 6', 2.6, '#7a5a96'),
    attack: () => '<path d="M3 10h16c0 6-3 9-8 9s-8-3-8-9Z" fill="#3a3632"/><rect x="2" y="8" width="18" height="3" rx="1.5" fill="#56504a"/>' + line('M21 14h2', 2.2, '#c0742e'),
    skip: () => '<path d="M15 3a8 8 0 1 0 6 12 6 6 0 1 1 -6 -12Z" fill="' + GOLD + '"/>' + '<path d="M5 6h4l-4 5h4" stroke="' + NAVY + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    favor: () => heart(12, 13, 7, '#e0566e'),
    shuffle: () => '<path d="M4 9h14v11H4Z" fill="#c99a62"/><path d="M4 9l-2-3h14l2 3Z" fill="#dcb27c"/>' + line('M7 4l3 2M16 2l-1 3', 2, '#8a6a3e'),
    future: () => '<ellipse cx="12" cy="12" rx="10" ry="6.5" fill="#3c3530"/><ellipse cx="12" cy="12" rx="7" ry="5" fill="#e9d46a"/><ellipse cx="12" cy="12" rx="1.8" ry="4.4" fill="' + INK + '"/>',
  };
  for (const k of Object.keys(BREED)) {
    const b = BREED[k];
    ICON[k] = ((bb, kk) => () => {
      const pad = kk === 'cow' || kk === 'siamese' ? '#f4b6c0' : '#f4b6c0';
      const c = kk === 'calico' ? '#e58e46' : kk === 'cow' ? '#2a2622' : kk === 'siamese' ? '#5a3e30' : bb.fur;
      return '<ellipse cx="12" cy="14.5" rx="6" ry="5" fill="' + c + '"/><ellipse cx="12" cy="15.5" rx="2.6" ry="2.1" fill="' + pad + '"/>' +
        '<circle cx="5.6" cy="9" r="2.4" fill="' + c + '"/><circle cx="9.6" cy="5.6" r="2.4" fill="' + c + '"/><circle cx="14.4" cy="5.6" r="2.4" fill="' + c + '"/><circle cx="18.4" cy="9" r="2.4" fill="' + c + '"/>';
    })(b, k);
  }
  const icache = {};
  function icon(kind) {
    if (!icache[kind]) icache[kind] = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[kind]() + '</svg>';
    return icache[kind];
  }

  /* 牌背：藏蓝底 + 金色内框 + 中间一个小猫爪 */
  const BACK = '<svg viewBox="0 0 100 140" aria-hidden="true"><rect width="100" height="140" rx="10" fill="' + NAVY + '"/>' +
    '<rect x="8" y="8" width="84" height="124" rx="6" fill="none" stroke="' + GOLD + '" stroke-width="2.6"/>' +
    paw(50, 70, 2.2, GOLD, NAVY) + '</svg>';

  /* 封面：一只炸毛猫 + 一只橘猫举着逗猫棒。各自包一层 <g class>，CSS 让它们待机时动（炸毛猫一鼓一鼓、偶尔一抖，
   * 橘猫上下晃） */
  function hero() {
    const boom = boomArt();
    const def = defuseArt();
    return '<svg viewBox="0 0 200 120" aria-hidden="true">' +
      '<g transform="translate(0 10)"><g class="hero-boom">' + boom + '</g></g>' +
      '<g transform="translate(100 10)"><g class="hero-def">' + def + '</g></g></svg>';
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
    crown: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M12 76 6 30l24 20 20-34 20 34 24-20-6 46Z" fill="' + GOLD + '" stroke="#a9823a" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="10" y="72" width="80" height="14" rx="5" fill="#b8924a"/><circle cx="6" cy="28" r="5" fill="#fffaf0"/><circle cx="50" cy="14" r="6" fill="#fffaf0"/><circle cx="94" cy="28" r="5" fill="#fffaf0"/>' +
      '<path d="M50 40l7 11-7 11-7-11Z" fill="' + RED + '"/>' + '</svg>',
    cross: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 20 80 80M80 20 20 80" stroke="' + RED + '" stroke-width="14" stroke-linecap="round"/></svg>',
  };

  return { TONE, face, icon, BACK, hero, heart, paw, catHead, PROPS };
});
