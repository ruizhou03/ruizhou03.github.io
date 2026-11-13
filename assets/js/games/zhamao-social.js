/* 百变小咪 · 牌桌互动的「道具包」（window.ZhamaoSocialKit）——画法、台词、落地效果；
 * 面板 / 气泡 / 飞行 / 冷却 / 屏蔽都复用拱猪的 gongzhu-social.js（GongzhuSocial.create(host)，host.kit = 这个）。
 * 道具画 = 甲·贴纸卡通（2026-11-13 用户挑定）：和拱猪道具同一种画法（墨点眼 + 白高光 + 腮红，奶油白贴纸边）。 */
(function () {
  'use strict';
  const GS = window.GongzhuSocial;
  if (!GS) return;

  const KEYS = ['fish', 'yarn', 'catnip', 'spray', 'paw', 'boom'];
  const NAMES = { fish: '小鱼干', yarn: '毛线球', catnip: '猫薄荷', spray: '喷水壶', paw: '猫爪拍拍', boom: '炸毛猫' };
  const LINES = ['大家好呀', '手下留情', '别甩给我！', '牌堆顶有猫，我闻到了', '谁塞的猫？站出来', '好险好险', '我有逗猫棒，不怕', '这把稳了'];
  const REPLY = {
    fish: ['谢谢小鱼干！', '好香好香'], yarn: ['别闹，我在想牌', '毛线缠住了……'], catnip: ['有点晕乎乎……', '再来一点'],
    spray: ['别喷了！', '猫最怕水啊！'], paw: ['过奖过奖', '击个掌'], boom: ['吓死我了！', '这只送还给你'],
  };
  const SPIN = { fish: 30, yarn: 540, catnip: 0, spray: 0, paw: 0, boom: 360 };

  /* ───── 画（64×64）───── */
  const INK = '#1d1b18';
  const circ = (cx, cy, r, c) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '"/>';
  const ell = (cx, cy, rx, ry, c, ex) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '"' + (ex || '') + '/>';
  const pth = (d, c) => '<path d="' + d + '" fill="' + c + '"/>';
  const stk = (d, c, w) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const eye = (x, y, r) => circ(x, y, r, INK) + circ((x - r * 0.35).toFixed(2), (y - r * 0.38).toFixed(2), (r * 0.38).toFixed(2), '#fff');
  const blush = (x, y) => ell(x, y, 3.2, 2, '#f08f8f', ' opacity=".7"');
  const smile = (x, y) => stk('M' + (x - 2) + ' ' + y + 'q2 2 4 0', INK, 2);
  const pawPad = (x, y, r) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ')">' + ell(0, 4, 9, 8, '#f6e3cf') + ell(0, 6, 4.6, 3.8, '#f2a0ad') +
    [[-6.5, -4.5], [-2.2, -8], [2.4, -8], [6.6, -4.5]].map(([a, b]) => circ(a, b, 2.6, '#f6e3cf') + circ(a, b, 1.4, '#f2a0ad')).join('') + '</g>';
  const DRAW = {
    fish: () => pth('M8 33c6-10 18-15 30-14 8 .6 13 4 16 8l6-7c1 6 1 13 0 19l-6-6c-3 5-9 8-17 8C24 41 13 39 8 33Z', '#e9b35c') +
      pth('M10 33c8 5 19 7 29 6.4 7-.4 12-3.3 15-7.4-3 6-9 9.6-16 10C26 42.6 16 40 10 33Z', '#c98b3a') +
      stk('M27 23.5v14M33 22.5v15M39 23.5v13', '#c98b3a', 2) + pth('M30 20c2-5 7-6 10-4-3 1-5 3-6 5Z', '#d79a45') +
      eye(16, 30, 2.4) + blush(18.5, 35) + stk('M10 34q2 1.2 4 .2', INK, 1.8),
    yarn: () => stk('M44 47c6 4 10 2 12-2s-1-8 3-9', '#d9647a', 2.8) + circ(30, 33, 18, '#ef8a9c') +
      stk('M14 30c6-6 18-9 30-5M13 37c8-7 22-9 33-4M18 46c6-8 18-13 28-10M22 17c6 6 9 18 6 30M33 15c5 8 6 20 1 33', '#d9647a', 2.4) +
      eye(25, 33, 2.4) + eye(36, 33, 2.4) + blush(21, 38.5) + blush(40, 38.5) + smile(30.5, 38),
    catnip: () => stk('M32 56V28', '#5f8f4e', 3) +
      pth('M32 40c-12 2-20-5-21-13 9-1 18 3 21 13Z', '#86bd6f') + pth('M32 36c12 1 19-7 19-15-9 0-17 5-19 15Z', '#86bd6f') +
      pth('M32 30c-7-6-7-16 0-22 7 6 7 16 0 22Z', '#9ccc84') + stk('M32 28V12', '#5f8f4e', 1.6) +
      eye(28.5, 19, 1.9) + eye(35.5, 19, 1.9) + blush(26, 23.5) + blush(38, 23.5) +
      stk('M12 12l2 4M10 15h4M51 9l1.6 3.6M50 12.5h3.6M54 45l1.5 3M53 47h3', '#c9a96e', 2),
    spray: () => pth('M20 30h20l2 22a4 4 0 0 1-4 4.4H22a4 4 0 0 1-4-4.4Z', '#6aa3d4') +
      '<rect x="21" y="22" width="18" height="9" rx="2.5" fill="#4f86b8"/>' + pth('M24 22l-1-8h18l6 5-8 3Z', '#4f86b8') +
      pth('M30 26l-4 9h3l3-8Z', '#3f6f9e') + pth('M47 19h4v3h-4Z', '#3f6f9e') +
      circ(55, 16, 1.8, '#9fd0ef') + circ(58, 21, 1.6, '#9fd0ef') + circ(56, 26, 1.4, '#9fd0ef') + circ(60, 13, 1.2, '#9fd0ef') +
      eye(26, 42, 2.3) + eye(34, 42, 2.3) + blush(23, 47) + blush(37, 47) + smile(30, 46.5),
    paw: () => stk('M32 10v-5M25 12l-3-4M39 12l3-4', '#e9b949', 2.6) + pawPad(20, 36, 28) + pawPad(44, 36, -28) +
      stk('M8 26q-3 5 0 10M56 26q3 5 0 10', '#e9b949', 2.2),
    // 炸毛猫：直接用牌面那只（zhamao-art.js），套进 64 格
    boom: () => (window.ZhamaoArt ? window.ZhamaoArt.face('boom').replace('<svg ', '<svg x="3" y="3" width="58" height="58" ') : circ(32, 32, 20, '#3a3632')),
  };
  const ART = {};
  KEYS.forEach((k) => { ART[k] = GS.sticker(DRAW[k]()); });

  // 落点：喷水壶 / 猫爪 / 猫薄荷悬在头像旁——对手都在上面一排、头顶紧挨着工具栏，所以对手悬在头像下面，我（下面）悬在头像上面；别的砸在头像上
  const above = (c) => c.y > window.innerHeight * 0.5;
  function landPoint(k, x) {
    const { c, S } = x;
    if (k === 'spray' || k === 'paw' || k === 'catnip') return above(c) ? { x: c.x, y: c.y - c.r - S * 0.5 } : { x: c.x, y: c.y + c.r + S * 0.5 };
    return { x: c.x, y: c.y };
  }

  /* ───── 六种落地效果（H = gongzhu-social 的小零件）───── */
  function land(H) {
    const { at, settle, later, particles, hearts, shake, jump, wobble, tint, glow, sparks, drips, mk, done, rnd } = H;
    return {
      // 小鱼干：落在头像上，被「一口吃掉」（放大一下缩进头像），冒小心心、碎屑，头像开心地跳一下
      fish(el, { c, S, k, av }) {
        settle(el, [{ transform: at(c.x, c.y, S, S, ' rotate(30deg)') }, { transform: at(c.x, c.y - 4, S, S, ' scale(1.2)'), opacity: 1, offset: 0.3 },
          { transform: at(c.x, c.y + 2, S, S, ' scale(.25)'), opacity: 0 }], { duration: 620, easing: 'ease-in' });
        later(360, () => {
          particles(c.x, c.y - 4, 8, ['#e9b35c', '#c98b3a', '#f6e3cf'], { size: [4, 7], dist: [18, 36], grav: 20, dur: 650 }, k);
          hearts(c.x, c.y - c.r, 2, '#e3625b', k);
          jump(av);
        });
        glow(c, '#e9b35c');
      },
      // 毛线球：在头上弹三下、越弹越低，然后滚下去、线头拖着；头像被晃得左右摇
      yarn(el, { c, S, k, av }) {
        const y0 = c.y - c.r * 0.2, f = [{ transform: at(c.x, y0, S, S) }];
        [26, 14, 6].forEach((h, i) => {
          f.push({ transform: at(c.x + (i + 1) * 4 * k, y0 - h * k, S, S, ' rotate(' + (i + 1) * 40 + 'deg)'), offset: 0.08 + i * 0.2 });
          f.push({ transform: at(c.x + (i + 1) * 6 * k, y0, S, S, ' scale(1.08,.9) rotate(' + (i + 1) * 60 + 'deg)'), offset: 0.18 + i * 0.2 });
        });
        f.push({ transform: at(c.x + c.r + S * 0.6, c.y + c.r * 0.9, S, S, ' rotate(300deg) scale(.85)'), opacity: 1, offset: 0.85 }, { transform: at(c.x + c.r + S, c.y + c.r * 1.1, S, S, ' rotate(360deg) scale(.7)'), opacity: 0 });
        settle(el, f, { duration: 1500, easing: 'ease-out' });
        wobble(av);
        later(500, () => wobble(av));
      },
      // 猫薄荷：悬在头顶晃，撒下叶子和金色小星星，头像晕乎乎地左右摇两轮
      catnip(el, x) {
        const { c, S, k, av } = x, L = landPoint('catnip', x);
        settle(el, [{ transform: at(L.x, L.y, S, S) }, { transform: at(L.x, L.y, S, S, ' rotate(-12deg)'), offset: 0.2 }, { transform: at(L.x, L.y, S, S, ' rotate(10deg)'), offset: 0.4 },
          { transform: at(L.x, L.y, S, S, ' rotate(-8deg)'), offset: 0.6 }, { transform: at(L.x, L.y, S, S), opacity: 1, offset: 0.78 }, { transform: at(L.x, L.y - 12, S, S), opacity: 0 }], { duration: 1500 });
        particles(c.x, c.y - c.r, 9, ['#86bd6f', '#9ccc84', '#5f8f4e'], { shape: 'petal', spread: [40, 140], size: [6, 10], dist: [18, 44], grav: 30, dur: 1200 }, k);
        later(250, () => particles(c.x, c.y - c.r * 0.4, 7, ['#e9b949', '#c9a96e'], { size: [4, 7], dist: [24, 46], grav: -6, dur: 1000 }, k));
        wobble(av);
        later(650, () => wobble(av));
      },
      // 喷水壶：在头顶 / 旁边歪过来「噗噗噗」喷三下，水雾扑到头像上，头像发抖、泛蓝、往下滴水
      spray(el, x) {
        const { c, S, k, av } = x, L = landPoint('spray', x), top = above(c);
        const tilt = top ? 28 : -150;   // 在头像下面就倒过来，壶嘴朝上喷
        settle(el, [{ transform: at(L.x, L.y, S, S) }, { transform: at(L.x, L.y, S, S, ' rotate(' + tilt + 'deg)'), offset: 0.15 },
          { transform: at(L.x, L.y, S, S, ' rotate(' + tilt + 'deg) scale(.92)'), offset: 0.3 }, { transform: at(L.x, L.y, S, S, ' rotate(' + tilt + 'deg)'), offset: 0.42 },
          { transform: at(L.x, L.y, S, S, ' rotate(' + tilt + 'deg) scale(.92)'), offset: 0.54 }, { transform: at(L.x, L.y, S, S, ' rotate(' + tilt + 'deg)'), opacity: 1, offset: 0.8 },
          { transform: at(L.x + 10, L.y + (top ? -14 : 14), S, S, ' rotate(' + tilt + 'deg)'), opacity: 0 }], { duration: 1400 });
        for (let i = 0; i < 3; i++) {
          later(260 + i * 240, () => {
            // 一团小水珠从壶嘴飞向头像
            for (let j = 0; j < 6; j++) {
              const s = rnd(4, 7) * k, d = mk('gz-sp-dot');
              d.style.width = d.style.height = s + 'px'; d.style.background = j % 2 ? '#a9d8f2' : '#7cc0e8';
              const sx = L.x, sy = L.y + (top ? S * 0.3 : -S * 0.3), ex = c.x + rnd(-c.r * 0.6, c.r * 0.6), ey = c.y + rnd(-c.r * 0.6, c.r * 0.4);
              done(d.animate([{ transform: at(sx, sy, s, s), opacity: 0.9 }, { transform: at(ex, ey, s, s, ' scale(1.3)'), opacity: 0 }], { duration: 360, delay: j * 25, easing: 'ease-in', fill: 'both' }), d);
            }
          });
        }
        later(560, () => { tint(c, '#6aa3d4', 1500); shake(av, 5, 8); drips(c.x, c.y + c.r - 4, '#7cc0e8', k); });
      },
      // 猫爪拍拍：两只肉垫在头顶拍三下，每拍一下溅一圈金光
      paw(el, x) {
        const { c, S, k } = x, L = landPoint('paw', x), f = [{ transform: at(L.x, L.y, S, S) }];
        for (let i = 0; i < 3; i++) {
          f.push({ transform: at(L.x, L.y, S, S, ' scale(1.15,1)'), offset: 0.1 + i * 0.22 });
          f.push({ transform: at(L.x, L.y, S, S, ' scale(.8,1.05)'), offset: 0.19 + i * 0.22 });
        }
        f.push({ transform: at(L.x, L.y, S, S), opacity: 1, offset: 0.82 }, { transform: at(L.x, L.y - 10, S, S), opacity: 0 });
        settle(el, f, { duration: 1300 });
        for (let i = 0; i < 3; i++) later(1300 * (0.19 + i * 0.22), () => sparks(L.x, L.y - S * 0.36, '#e9b949', k));
        glow(c, '#e9b949');
      },
      // 炸毛猫：砸在头像上「嘭」地炸开一圈黑毛，头像吓得一跳、狂抖
      boom(el, { c, S, k, av }) {
        settle(el, [{ transform: at(c.x, c.y, S, S, ' rotate(360deg)') }, { transform: at(c.x, c.y, S, S, ' scale(1.35)'), opacity: 1, offset: 0.25 },
          { transform: at(c.x, c.y, S, S, ' scale(1.2) rotate(-8deg)'), offset: 0.45 }, { transform: at(c.x, c.y, S, S, ' scale(1.25) rotate(8deg)'), opacity: 1, offset: 0.65 },
          { transform: at(c.x, c.y - 8, S, S, ' scale(.6)'), opacity: 0 }], { duration: 1000 });
        later(180, () => {
          particles(c.x, c.y, 14, ['#3a3632', '#1d1b18', '#5a524a'], { shape: 'petal', size: [6, 11], dist: [30, 60], grav: 18, dur: 800 }, k);
          particles(c.x, c.y - c.r * 0.3, 6, ['#e9d46a', '#f28a2e'], { size: [4, 7], dist: [20, 44], grav: -4, dur: 700 }, k);
          jump(av);
          later(260, () => shake(av, 6, 10));
        });
      },
    };
  }

  window.ZhamaoSocialKit = { keys: KEYS, names: NAMES, lines: LINES, reply: REPLY, art: ART, spin: SPIN, landPoint, land, prefKey: 'zm.social.v1' };
})();
