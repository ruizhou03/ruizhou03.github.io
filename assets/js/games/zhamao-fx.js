/* 猫咪炸毛 · 动画引擎（window.ZhamaoFx）
 * 牌桌所有「动起来」的东西都走这里，坐标一律是视口坐标（getBoundingClientRect），画在固定定位的 .zm-fly 层上。
 * 手法照拱猪：多段关键帧逐段给缓动（整体 easing 会把停顿压没）、牌沿二次贝塞尔弧线飞、
 * 飞的过程中可以 3D 翻面、落地轻轻一压；粒子每次随机换一种绽放样式；烟团鼓起来往上散。
 *   fx.fly({ html, back, from, to, w, s0, s1, lift, r0, r1, flip, dur, delay, keep, ease, shadow })
 *   fx.burst(x, y, { n, shapes, colors, radius, size, delay, life, gravity, pattern, spin })
 *   fx.smoke(x, y, { n, spread, size, delay, tint })
 *   fx.ring(x, y, { color, size, width, delay, dur })   冲击波圆环
 *   fx.flash(color, delay)                               全屏一闪
 *   fx.shake(el, { amp, dur, delay })                    抖一下（震屏 / 头像吓一跳）
 *   fx.pop(el, { scale, dur, delay })                    弹一下
 *   fx.float(x, y, html, { dx, dy, dur, delay, size, rot }) 飘一个东西（Zz、问号、音符…）
 *   fx.arrow(a, b, { color })                            一道会自己画出来的虚线弧箭头，返回 remove()
 *   fx.SHAPES                                            粒子形状（爪印 / 炸毛 / 心 / 星 / 羽毛 / 音符…） */
(function () {
  'use strict';

  const reduce = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

  /* 粒子形状：24×24，填 currentColor */
  const SHAPES = {
    // 爪印（和牌背、猫牌角标同一个形状，见 zhamao-art.js pawPrint）
    paw: '<svg viewBox="0 0 24 24"><path d="M12 12.4C14.9 12.4 17.4 14.3 18.3 16.9C18.9 18.7 17.9 20.6 16.1 20.9C14.9 21.1 13.9 20.5 12 20.5C10.1 20.5 9.1 21.1 7.9 20.9C6.1 20.6 5.1 18.7 5.7 16.9C6.6 14.3 9.1 12.4 12 12.4Z"/><ellipse cx="4.7" cy="10.6" rx="2.05" ry="2.65" transform="rotate(-28 4.7 10.6)"/><ellipse cx="8.9" cy="6.4" rx="2.2" ry="2.85" transform="rotate(-9 8.9 6.4)"/><ellipse cx="15.1" cy="6.4" rx="2.2" ry="2.85" transform="rotate(9 15.1 6.4)"/><ellipse cx="19.3" cy="10.6" rx="2.05" ry="2.65" transform="rotate(28 19.3 10.6)"/></svg>',
    fur: '<svg viewBox="0 0 24 24"><path d="M12 1c1.6 5 4.6 9 4 14-.4 4-2.4 7-4 8-1.6-1-3.6-4-4-8-.6-5 2.4-9 4-14Z"/></svg>',
    spike: '<svg viewBox="0 0 24 24"><path d="M12 0 16 24H8Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21.5C5 16.6 1.5 12.9 1.5 8.4 1.5 5.1 4 2.6 7.1 2.6c2 0 3.7 1 4.9 2.8 1.2-1.8 2.9-2.8 4.9-2.8 3.1 0 5.6 2.5 5.6 5.8 0 4.5-3.5 8.2-10.5 13.1Z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 0c1.1 6.6 4.3 9.8 12 12-7.7 2.2-10.9 5.4-12 12-1.1-6.6-4.3-9.8-12-12 7.7-2.2 10.9-5.4 12-12Z"/></svg>',
    dot: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>',
    feather: '<svg viewBox="0 0 24 24"><path d="M19 2C10 3 4 9 4 18l-2 4 3-2c9 0 15-6 16-15-3 1-5 3-7 5 1-3 3-6 5-8Z"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M9 3v12.3A3.6 3.6 0 1 0 11 18.5V8l9-2v7.3a3.6 3.6 0 1 0 2 3.2V1Z"/></svg>',
    fish: '<svg viewBox="0 0 24 24"><path d="M2 12c4-6 11-7 16-2l4-4v12l-4-4c-5 5-12 4-16-2Z"/><circle cx="7" cy="11" r="1.4" fill="#fff"/></svg>',
    z: '<svg viewBox="0 0 24 24"><path d="M4 4h16v3L9 18h11v3H4v-3L15 7H4Z"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="3"/></svg>',
  };

  /* 粒子画在一张 canvas 上（2026-11-16 iPhone 实测：一次炸开十几二十个 SVG 小元素、各占一个 GPU 图层，那一下会顿 100ms 以上）。
   * 形状照 SHAPES 的 24×24 SVG 转成 Path2D（只转一次），轨迹 / 缩放 / 旋转 / 透明度 / 每段缓动跟原来的关键帧一模一样 */
  const PATHS = new Map();
  function shapePaths(svg) {
    if (PATHS.has(svg)) return PATHS.get(svg);
    const t = document.createElement('template');
    t.innerHTML = svg;
    const out = [], root = t.content.firstElementChild;
    for (const el of root ? root.children : []) {
      const n = (a) => parseFloat(el.getAttribute(a)) || 0, tag = el.tagName.toLowerCase();
      let p = null;
      if (tag === 'path') p = new Path2D(el.getAttribute('d'));
      else if (tag === 'ellipse') { const m = /rotate\(([-\d.]+)/.exec(el.getAttribute('transform') || ''); p = new Path2D(); p.ellipse(n('cx'), n('cy'), n('rx'), n('ry'), m ? (+m[1]) * Math.PI / 180 : 0, 0, Math.PI * 2); }
      else if (tag === 'circle') { p = new Path2D(); p.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2); }
      else if (tag === 'rect') { p = new Path2D(); if (p.roundRect) p.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx')); else p.rect(n('x'), n('y'), n('width'), n('height')); }
      if (p) out.push({ p, fill: el.getAttribute('fill') });
    }
    PATHS.set(svg, out);
    return out;
  }
  // cubic-bezier(x1,y1,x2,y2) 求值（和 CSS 一样：先由 x 解出参数 t，再取 y）
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-4) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 20; i++) { const v = X(t); if (Math.abs(v - x) < 1e-4) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  }
  const EASE_SPARK = bezier(0.12, 0.8, 0.3, 1), EASE_IN = bezier(0.42, 0, 1, 1);

  function create(layer, opts) {
    opts = opts || {};
    const snd = opts.sound || (() => {});
    /* 快进（2026-11-16 用户：5 倍速快进到结束时一卡一卡的）：粒子 / 烟 / 圆环 / 闪光的动画本身跟着 5 倍速放完了，
     * 可删掉它们的定时器还按原速等 1–1.5 秒——看不见的元素一层层堆在动画层上，新的又不停冒。
     * 现在 speed() > 1（快进）时：清理定时器也按倍速；粒子只放四分之一；烟、全屏闪光、整块震动直接不放（最费的几样） */
    const speed = opts.speed || (() => 1);
    const lite = () => speed() > 1;
    const later = (fn, ms) => setTimeout(fn, ms / speed());

    function animate(el, frames, o, ease) {
      const e = ease || 'cubic-bezier(.25, .8, .35, 1)';
      return el.animate(frames.map((f) => Object.assign({ easing: e }, f)), Object.assign({ easing: 'linear', fill: 'both' }, o));
    }
    // behind=true：垫在动画层最底下（主角牌后面），烟、闪光、碎毛从牌背后冒出来，不挡住牌面
    function node(cls, html, behind) {
      const d = document.createElement('div');
      d.className = cls;
      if (html != null) d.innerHTML = html;
      if (behind) layer.insertBefore(d, layer.firstChild); else layer.appendChild(d);
      return d;
    }
    const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const T = (x, y, s, r, extra) => 'translate(' + f1(x) + 'px,' + f1(y) + 'px) scale(' + (+s).toFixed(3) + ') rotate(' + f1(r) + 'deg)' + (extra || '');

    /* 飞一张牌。from / to 是矩形或 {x, y}；w = 牌在终点的宽（px），s0/s1 = 起止缩放（相对 w）。
     * 路线是二次贝塞尔：控制点在两端中点再往上提 lift（默认按距离算）。
     * flip: 'up' 背面朝上飞、途中翻成正面；'down' 正面翻成背面；null 不翻。
     * 落地：最后 14% 时间里先压到 0.96 再回 1（像拍在桌上）；land:false 关掉。
     * 返回 Promise<flyer 元素>（keep 为真时不自动删）。 */
    function fly(o) {
      const a = o.from.width != null ? center(o.from) : o.from;
      const b = o.to.width != null ? center(o.to) : o.to;
      const w = o.w, h = w * 1.4;
      const dur = reduce() ? 1 : (o.dur || 420);
      const el = node('zm-flyer' + (o.cls ? ' ' + o.cls : ''));
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      el.style.borderRadius = (w * 0.09).toFixed(1) + 'px';
      const front = o.html || '', back = o.back || '';
      if (o.flip) {
        el.innerHTML = '<div class="zm-flip"><div class="zm-side zm-side-front">' + front + '</div><div class="zm-side zm-side-back">' + back + '</div></div>';
      } else {
        el.innerHTML = o.faceDown ? back : front;
      }
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const lift = o.lift != null ? o.lift : Math.min(140, dist * 0.32);
      const cx = (a.x + b.x) / 2 + (o.bend || 0), cy = Math.min(a.y, b.y) - lift;
      const s0 = o.s0 != null ? o.s0 : 1, s1 = o.s1 != null ? o.s1 : 1;
      const r0 = o.r0 || 0, r1 = o.r1 || 0;
      const N = 12, frames = [];
      const land = o.land !== false;
      const travel = land ? 0.86 : 1;
      const eT = o.easeFn || ((t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2) * 0.35 + (1 - Math.pow(1 - t, 3)) * 0.65);
      for (let k = 0; k <= N; k++) {
        const t = eT(k / N), u = 1 - t;
        const x = u * u * a.x + 2 * u * t * cx + t * t * b.x;
        const y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
        const arcLift = Math.sin(Math.PI * (k / N));
        const s = s0 + (s1 - s0) * t + (o.swell != null ? o.swell : 0.08) * arcLift;
        frames.push({
          transform: T(x - w / 2, y - h / 2, s, r0 + (r1 - r0) * t),
          boxShadow: o.shadow === false ? 'none' : '0 ' + f1(3 + 16 * arcLift) + 'px ' + f1(6 + 22 * arcLift) + 'px rgba(29,27,24,' + (0.14 + 0.14 * arcLift).toFixed(2) + ')',
          opacity: k === 0 && o.fadeIn ? 0 : 1,
          offset: travel * (k / N), easing: 'linear',
        });
      }
      if (land) {
        frames.push({ transform: T(b.x - w / 2, b.y - h / 2, s1 * 0.95, r1), boxShadow: '0 1px 2px rgba(29,27,24,.16)', opacity: 1, offset: 0.93, easing: 'cubic-bezier(.3,.7,.4,1)' });
      }
      frames.push({ transform: T(b.x - w / 2, b.y - h / 2, s1, r1), boxShadow: o.shadow === false ? 'none' : '0 1px 2px rgba(29,27,24,.16)', opacity: o.fadeOut ? 0 : 1 });
      const anim = el.animate(frames, { duration: dur, delay: o.delay || 0, fill: 'both', easing: 'linear' });
      if (o.flip) {
        const inner = el.firstChild;
        const fromDeg = o.flip === 'up' ? 180 : 0, toDeg = o.flip === 'up' ? 0 : 180;
        const at0 = o.flipAt != null ? o.flipAt : 0.25, at1 = Math.min(0.86, at0 + 0.4);
        inner.animate([
          { transform: 'rotateY(' + fromDeg + 'deg)', offset: 0 },
          { transform: 'rotateY(' + fromDeg + 'deg)', offset: at0 },
          { transform: 'rotateY(' + toDeg + 'deg)', offset: at1, easing: 'cubic-bezier(.4,0,.2,1)' },
          { transform: 'rotateY(' + toDeg + 'deg)', offset: 1 },
        ].map((x, i, all) => (i < all.length - 1 && all[i + 1].easing ? Object.assign({}, x, { easing: all[i + 1].easing }) : x)),
        { duration: dur, delay: o.delay || 0, fill: 'both' });
      }
      return anim.finished.then(() => { if (!o.keep) el.remove(); return el; }, () => { el.remove(); return null; });
    }

    // 粒子画布：有粒子才显示、才跑 rAF；时间按 speed()（快进 5 倍）走
    let cv = null, cx2 = null, parts = [], clk = 0, lastT = 0, raf = 0;
    function canvas() {
      if (!cv) {
        cv = document.createElement('canvas');
        cv.className = 'zm-spark-cv';
        cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:1;display:none';
        layer.appendChild(cv);
        cx2 = cv.getContext('2d');
      }
      if (!cv.isConnected) layer.appendChild(cv);
      return cv;
    }
    function tick(now) {
      raf = 0;
      clk += Math.min(100, now - lastT) * speed(); lastT = now;
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight;
      const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      const g = cx2;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, pw, ph);
      parts = parts.filter((q) => clk < q.t0 + q.dur);
      for (const q of parts) {
        const pr = (clk - q.t0) / q.dur;
        if (pr <= 0) continue;   // 还在延迟里：第一帧本来就是透明的
        const K = q.k; let i = 0;
        while (i < K.length - 2 && pr > K[i + 1].o) i++;
        const a = K[i], b = K[i + 1], u = (b.o > a.o) ? Math.min(1, Math.max(0, (pr - a.o) / (b.o - a.o))) : 1, e = a.ease(u);
        const L = (m) => a[m] + (b[m] - a[m]) * e;
        const op = L('a'); if (op <= 0.003) continue;
        const sc = L('s') * q.sz / 24, rot = L('r') * Math.PI / 180;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.translate(L('x'), L('y')); g.rotate(rot); g.scale(sc, sc); g.translate(-12, -12);
        g.globalAlpha = Math.min(1, op);
        for (const sp of q.paths) { g.fillStyle = sp.fill || q.color; g.fill(sp.p); }
      }
      g.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(tick);
      else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
    }
    function addParts(list) {
      canvas();
      cv.style.display = '';
      parts.push(...list);
      if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
    }

    /* 粒子绽放。shapes：SHAPES 的键或 svg 字符串数组；colors：颜色数组。
     * 样式每次随机：一整圈 / 内外两圈 / 螺旋 / 喷泉 / 随意散开；少数大个、大个更稳，小的会翻飞 */
    function burst(x, y, o) {
      o = Object.assign({ n: 18, shapes: ['star'], colors: ['#c9a96e'], radius: 110, size: [8, 26], delay: 0, life: 1100, gravity: 40, spin: true }, o);
      if (reduce()) return;
      if (lite()) o.n = Math.max(2, Math.ceil(o.n / 4));
      const pat = o.pattern || ['ring', 'double', 'spiral', 'fountain', 'scatter'][(Math.random() * 5) | 0];
      const turn = Math.random() * Math.PI * 2;
      const list = [];
      for (let k = 0; k < o.n; k++) {
        const sh = o.shapes[k % o.shapes.length];
        const color = o.colors[k % o.colors.length];
        const big = Math.random() < 0.15;
        const t = big ? rnd(0.75, 1) : Math.pow(Math.random(), 1.6) * 0.7;
        const sz = o.size[0] + t * (o.size[1] - o.size[0]);
        el.style.width = el.style.height = sz.toFixed(0) + 'px';
        let a, d, lag = 0, fall = big ? o.gravity * 0.6 : o.gravity;
        if (pat === 'ring') { a = turn + (k / o.n) * Math.PI * 2 + rnd(-0.12, 0.12); d = o.radius * rnd(0.85, 1.08); }
        else if (pat === 'double') { const inner = k % 2 === 1; a = turn + (k / o.n) * Math.PI * 2; d = o.radius * (inner ? rnd(0.42, 0.58) : rnd(0.95, 1.18)); lag = inner ? 0 : 100; }
        else if (pat === 'spiral') { a = turn + (k / o.n) * Math.PI * 4; d = o.radius * (0.3 + 0.85 * k / o.n); lag = k * 14; }
        else if (pat === 'fountain') { a = -Math.PI / 2 + rnd(-1.05, 1.05); d = o.radius * rnd(0.7, 1.3); lag = rnd(0, 130); fall = o.gravity * 2.4; }
        else { a = Math.random() * Math.PI * 2; d = o.radius * rnd(0.35, 1.2); lag = rnd(0, 160); }
        if (o.angle != null) { a = o.angle + rnd(-o.spread || -0.6, o.spread || 0.6); }
        const tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d;
        let r0 = 0, r1 = 0;
        if (o.spin) {
          if (o.alignOut) { r0 = r1 = (a * 180 / Math.PI) + 90; }
          else {
            const mode = big ? 'steady' : Math.random() < 0.7 ? 'near' : 'free';
            if (mode === 'steady') { r0 = rnd(-6, 6); r1 = r0 + rnd(-12, 12); }
            else if (mode === 'near') { r0 = rnd(-18, 18); r1 = r0 + rnd(-50, 50); }
            else { r0 = rnd(-40, 40); r1 = r0 + (Math.random() < 0.5 ? -1 : 1) * rnd(150, 320); }
          }
        }
        const life = (big ? 1.15 : 1) * o.life;
        const E = EASE_SPARK;
        list.push({ paths: shapePaths(SHAPES[sh] || sh), color, sz, t0: clk + o.delay + lag, dur: life, k: [
          { o: 0, x: x, y: y, s: 0.3, r: r0, a: 0, ease: E },
          { o: 0.06, x: x, y: y, s: 0.7, r: r0, a: 1, ease: E },
          { o: 0.45, x: tx, y: ty, s: big ? 1.1 : 1, r: (r0 + r1) * 0.5, a: 1, ease: E },
          { o: 0.58, x: tx, y: ty + 6, s: 1, r: (r0 + r1) * 0.6, a: 1, ease: EASE_IN },
          { o: 1, x: tx, y: ty + fall, s: 0.7, r: r1, a: 0, ease: E },
        ] });
      }
      if (list.length) addParts(list);
    }

    function smoke(x, y, o) {
      o = Object.assign({ n: 10, spread: 50, size: [60, 130], delay: 0, tint: 'cream', rise: 46, behind: false, alpha: 0.9 }, o);
      if (reduce() || lite()) return;
      for (let k = 0; k < o.n; k++) {
        const el = node('zm-smoke' + (o.tint === 'dark' ? ' is-dark' : ''), null, o.behind);
        const a = Math.random() * Math.PI * 2, d = Math.random() * o.spread;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7;
        const size = rnd(o.size[0], o.size[1]);
        el.style.width = el.style.height = size.toFixed(0) + 'px';
        const life = rnd(1000, 1500), delay = o.delay + Math.random() * 160;
        const h = size / 2;
        el.animate([
          { transform: T(px - h, py - h, 0.25, 0), opacity: 0 },
          { transform: T(x + (px - x) * 1.25 - h, py - 6 - h, 1, 0), opacity: o.alpha, offset: 0.22 },
          { transform: T(x + (px - x) * 1.8 - h, py - o.rise - h, 1.7, 0), opacity: 0 },
        ], { duration: life, delay, fill: 'both', easing: 'cubic-bezier(.2,.7,.3,1)' });
        later(() => el.remove(), delay + life + 60);
      }
    }

    function ring(x, y, o) {
      o = Object.assign({ color: '#c9a96e', size: 220, width: 6, delay: 0, dur: 620, behind: false }, o);
      if (reduce()) return;
      const el = node('zm-ring', null, o.behind);
      el.style.borderColor = o.color;
      el.style.borderWidth = o.width + 'px';
      const s = o.size;
      el.style.width = el.style.height = s + 'px';
      animate(el, [
        { transform: T(x - s / 2, y - s / 2, 0.1, 0), opacity: 0.95 },
        { transform: T(x - s / 2, y - s / 2, 1, 0), opacity: 0 },
      ], { duration: o.dur, delay: o.delay }, 'cubic-bezier(.15,.7,.3,1)');
      later(() => el.remove(), o.delay + o.dur + 60);
    }

    function flash(color, delay, dur) {
      if (reduce() || lite()) return;
      const el = node('zm-screenflash', null, true);
      el.style.background = 'radial-gradient(circle at 50% 46%, ' + color + ', rgba(0,0,0,0) 62%)';
      animate(el, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0 }], { duration: dur || 900, delay: delay || 0 }, 'ease-out');
      setTimeout(() => el.remove(), (delay || 0) + (dur || 900) + 60);
    }

    function shake(el, o) {
      if (!el || reduce() || lite()) return;
      o = Object.assign({ amp: 6, dur: 420, delay: 0, rot: 0 }, o);
      const fr = [];
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const k = 1 - i / n;
        const dx = i === n ? 0 : (i % 2 ? -1 : 1) * o.amp * k * rnd(0.6, 1);
        const dy = i === n ? 0 : rnd(-0.5, 0.5) * o.amp * k;
        fr.push({ transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px) rotate(' + f1((i % 2 ? -1 : 1) * o.rot * k) + 'deg)' });
      }
      el.animate(fr, { duration: o.dur, delay: o.delay, easing: 'linear', composite: 'add' });
    }

    function pop(el, o) {
      if (!el || reduce()) return;
      o = Object.assign({ scale: 1.18, dur: 360, delay: 0 }, o);
      el.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + o.scale + ')', offset: 0.4 }, { transform: 'scale(1)' }],
        { duration: o.dur, delay: o.delay, easing: 'cubic-bezier(.3,.8,.4,1.2)', composite: 'add' });
    }

    function float(x, y, html, o) {
      o = Object.assign({ dx: 0, dy: -60, dur: 1200, delay: 0, size: 26, rot: 0, color: '#2f4a6d', s0: 0.4, s1: 1.1 }, o);
      if (reduce()) return Promise.resolve();
      const el = node('zm-floater', SHAPES[html] || html);
      el.style.width = el.style.height = o.size + 'px';
      el.style.color = o.color;
      const h = o.size / 2;
      const a = animate(el, [
        { transform: T(x - h, y - h, o.s0, -o.rot), opacity: 0 },
        { transform: T(x + o.dx * 0.25 - h, y + o.dy * 0.25 - h, 1, 0), opacity: 1, offset: 0.2 },
        { transform: T(x + o.dx * 0.8 - h, y + o.dy * 0.8 - h, o.s1, o.rot), opacity: 1, offset: 0.75 },
        { transform: T(x + o.dx - h, y + o.dy - h, o.s1 * 1.05, o.rot), opacity: 0 },
      ], { duration: o.dur, delay: o.delay }, 'cubic-bezier(.3,.7,.4,1)');
      return a.finished.then(() => el.remove(), () => el.remove());
    }

    /* 从 a 指向 b 的虚线弧箭头，画出来的过程有动画；返回 { remove } */
    function arrow(a, b, o) {
      o = Object.assign({ color: '#c9a96e', bend: -0.28 }, o);
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'zm-arrow');
      svg.setAttribute('width', window.innerWidth);
      svg.setAttribute('height', window.innerHeight);
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      // 两端各缩进一点，别戳进头像里
      const pad = o.pad || 34;
      const ax = a.x + dx / len * pad, ay = a.y + dy / len * pad, bx = b.x - dx / len * (pad + 4), by = b.y - dy / len * (pad + 4);
      const mx = (ax + bx) / 2 - dy * o.bend, my = (ay + by) / 2 + dx * o.bend;
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M' + f1(ax) + ' ' + f1(ay) + 'Q' + f1(mx) + ' ' + f1(my) + ' ' + f1(bx) + ' ' + f1(by));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', o.color);
      path.setAttribute('stroke-width', '4');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-dasharray', '2 10');
      svg.appendChild(path);
      // 箭头：沿切线方向的一个小三角
      const tx = bx - mx, ty = by - my, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const head = document.createElementNS(svgNS, 'path');
      const hx = bx + ux * 6, hy = by + uy * 6;
      head.setAttribute('d', 'M' + f1(hx) + ' ' + f1(hy) + 'L' + f1(hx - ux * 14 - uy * 8) + ' ' + f1(hy - uy * 14 + ux * 8) + 'L' + f1(hx - ux * 14 + uy * 8) + ' ' + f1(hy - uy * 14 - ux * 8) + 'Z');
      head.setAttribute('fill', o.color);
      svg.appendChild(head);
      layer.appendChild(svg);
      if (!reduce()) {
        const L = path.getTotalLength();
        path.animate([{ strokeDashoffset: L, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1)' });
        // 虚线一直往前流，像在「指」
        path.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -24 }], { duration: 700, iterations: Infinity, delay: 380 });
        head.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, delay: 300, fill: 'both' });
        head.style.transformOrigin = f1(hx) + 'px ' + f1(hy) + 'px';
      }
      return {
        remove() {
          if (!svg.isConnected) return;
          svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => svg.remove(), () => svg.remove());
        },
      };
    }

    function clear() { layer.querySelectorAll('.zm-spark, .zm-smoke, .zm-ring, .zm-floater, .zm-arrow, .zm-screenflash').forEach((n) => n.remove()); parts = []; }

    return { animate, fly, burst, smoke, ring, flash, shake, pop, float, arrow, clear, center, T, reduce, snd };
  }

  window.ZhamaoFx = { create, SHAPES };
})();
