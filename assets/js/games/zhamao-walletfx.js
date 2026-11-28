/* 百变小咪 · 小鱼干动画（window.ZhamaoWalletFx，2026-11-22 第二轮）
 * 用户：鱼不能直勾勾地走直线，要灵动；开局得先放完扣票再进牌桌，不能有东西卡在新页面里；签到要马上有反应、鱼飞进档案里的余额。
 * 所以这里是一个小引擎：
 *   - 一个时钟驱动所有动画（平时跟 requestAnimationFrame 走；预览录屏时可以切成手动时钟一帧帧拨，见 manual / setTime）
 *   - 鱼：沿一条弯的贝塞尔曲线游（每条往不同一侧拱）+ 一路左右摆尾、身子跟着前进方向转，起跳弹一下、落点缩进去
 *   - 门票：从小鱼干里弹出来，像纸片一样边飘边晃落到「开始」键上，盖下去
 *   - 数字：从旧数滚到新数，加绿、减红
 *   - cancelAll：换页面（开局、开档案、关档案）时一次收干净，不留半截动画
 * 都在一层 position:fixed 的 .zmwfx 里，pointer-events:none，不挡任何点击。系统开了「减少动态效果」就直接跳到结果。 */
(function (root) {
  'use strict';
  let manual = false, mt = 0, speed = 1, raf = 0;
  const jobs = new Set();
  const now = () => (manual ? mt : performance.now());
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function stepJob(j, t) {
    const k = Math.max(0, Math.min(1, (t - j.t0) / j.dur));
    if (t < j.t0) return;
    if (!j.begun) { j.begun = true; if (j.begin) j.begin(); }
    j.frame(k);
    if (k >= 1) { jobs.delete(j); j.resolve(); }
  }
  function loop() {
    raf = 0;
    if (manual) return;
    const t = now();
    for (const j of Array.from(jobs)) stepJob(j, t);
    if (jobs.size) raf = requestAnimationFrame(loop);
  }
  /* 一段动画：dur 毫秒，frame(k) 每帧拿到 0..1；delay 毫秒后开始。返回 Promise（放完 / 被收掉都会 resolve） */
  function tween(dur, frame, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const j = { t0: now() + (opts.delay || 0) / speed, dur: Math.max(1, dur / speed), frame, begin: opts.begin, resolve, begun: false };
      jobs.add(j);
      if (manual) stepJob(j, mt);
      else if (!raf) raf = requestAnimationFrame(loop);
    });
  }
  function cancelAll() {
    for (const j of Array.from(jobs)) { jobs.delete(j); j.resolve(); }
    const l = document.querySelector('.zmwfx');
    if (l) l.innerHTML = '';
  }
  // 预览 / 录屏用：手动时钟
  function setManual(on) { manual = !!on; mt = performance.now(); if (!on && jobs.size && !raf) raf = requestAnimationFrame(loop); }
  function setTime(ms) { mt = ms; for (const j of Array.from(jobs)) stepJob(j, mt); }
  function advance(ms) { setTime(mt + ms); }

  // ── 工具 ──
  const ease = {
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  };
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function bez(p0, p1, p2, p3, u) {
    const a = 1 - u;
    return { x: a * a * a * p0.x + 3 * a * a * u * p1.x + 3 * a * u * u * p2.x + u * u * u * p3.x, y: a * a * a * p0.y + 3 * a * a * u * p1.y + 3 * a * u * u * p2.y + u * u * u * p3.y };
  }
  function layer() {
    let l = document.querySelector('.zmwfx');
    if (!l) {
      l = document.createElement('div');
      l.className = 'zmwfx';
      l.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:130;overflow:hidden';   // 压在所有弹层上面（「不够了」弹窗 120、档案 70、结算 50）——2026-11-23 录屏：95 时鱼在弹窗底下游
      document.body.appendChild(l);
    }
    return l;
  }
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const fmt = (x) => Math.round(Math.abs(x)).toLocaleString('en-US');

  /* 数字滚动：el 从 from 滚到 to（加绿、减红，放完回原色） */
  function roll(el, from, to, dur, opts) {
    if (!el) return Promise.resolve();
    const fmtFn = (opts && opts.fmt) || fmt;
    if (reduce()) { el.textContent = fmtFn(to); return Promise.resolve(); }
    const cls = to >= from ? 'zmwfx-up' : 'zmwfx-down';
    // 同一个数字上新滚的接管旧的（2026-11-23 录屏：救济进账和扣门票两段同时滚一个数，来回打架）
    const tok = {}; el.__zmwRoll = tok;
    el.classList.remove('zmwfx-up', 'zmwfx-down');
    el.classList.add(cls);
    return tween(dur, (k) => { if (el.__zmwRoll === tok) el.textContent = fmtFn(from + (to - from) * ease.outCubic(k)); }, opts).then(() => {
      if (el.__zmwRoll !== tok) return;
      el.textContent = fmtFn(to);
      setTimeout(() => el.classList.remove(cls), manual ? 0 : 420 / speed);
    });
  }

  /* 一条鱼从 a 游到 b（屏幕坐标）。side = ±1 往哪边拱；返回落地时 resolve 的 Promise */
  function fish(svg, a, b, opts) {
    opts = opts || {};
    const el = document.createElement('span');
    const size = opts.size || 30;
    el.style.cssText = 'position:fixed;left:0;top:0;width:' + size + 'px;height:' + Math.round(size * 0.64) + 'px;margin:' + -Math.round(size * 0.32) + 'px 0 0 ' + -Math.round(size / 2) + 'px;opacity:0;will-change:transform';
    el.innerHTML = svg;
    const s = el.firstElementChild; if (s) { s.style.width = '100%'; s.style.height = '100%'; s.style.display = 'block'; }
    layer().appendChild(el);
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    // 弧往屏幕里面拱（2026-11-22 录屏发现：往外拱的那条会游出屏幕左边），每条拱的大小不一样，一群鱼像扇子一样散开又收拢
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, W0 = innerWidth, H0 = innerHeight;
    if (nx * (W0 / 2 - mid.x) + ny * (H0 / 2 - mid.y) < 0) { nx = -nx; ny = -ny; }
    const bulge = len * (opts.bulge != null ? opts.bulge : 0.12 + rnd() * 0.3);
    const lift = opts.lift != null ? opts.lift : -40;
    const clamp = (p) => ({ x: Math.max(18, Math.min(W0 - 18, p.x)), y: Math.max(18, Math.min(H0 - 18, p.y)) });
    const p1 = clamp({ x: a.x + dx * 0.25 + nx * bulge, y: a.y + dy * 0.25 + ny * bulge + lift });
    const p2 = clamp({ x: a.x + dx * 0.75 + nx * bulge * 0.7, y: a.y + dy * 0.75 + ny * bulge * 0.7 });
    // 朝向一趟只定一次（往右游就整条翻过来脸朝右），之后只在 ±45° 里仰头低头——不会半路突然翻面（2026-11-23 真渲染录屏：±70° 往上游时几乎竖着，像在爬不像在游）
    const faceRight = Math.abs(dx) > 4 ? dx > 0 : nx > 0;
    const wig = 6 + rnd() * 5, wigHz = 2.2 + rnd() * 0.8, swish = 12, swishHz = 5 + rnd() * 2;
    const pop = 0.14;   // 前 14%：原地「啵」地冒出来
    let last = a, relHead = 0;
    return tween(opts.dur || 760, (k) => {
      let p, sc, op = 1, ang = 0;
      if (k < pop) {
        const q = k / pop;
        p = { x: a.x, y: a.y - 8 * Math.sin(q * Math.PI) };
        sc = 0.4 + 0.75 * ease.outBack(q); op = Math.min(1, q * 2);
        ang = Math.sin(q * Math.PI * 4) * 12;
      } else {
        const q = (k - pop) / (1 - pop), u = ease.inOutSine(q);
        const c = bez(a, p1, p2, b, u);
        const w = Math.sin(q * Math.PI * 2 * wigHz) * wig * (1 - q);   // 一路左右摆着游，越近越稳
        p = { x: c.x + nx * w, y: c.y + ny * w };
        const vx = p.x - last.x, vy = p.y - last.y;
        if (Math.abs(vx) + Math.abs(vy) > 0.01) {
          let head = Math.atan2(vy, vx) * 180 / Math.PI;           // 朝右为 0
          if (!faceRight) head = ((head + 360) % 360) - 180;         // 朝左为 0
          if (head > 180) head -= 360; if (head < -180) head += 360;
          relHead = Math.max(-45, Math.min(45, head));
        }
        ang = relHead + Math.sin(q * Math.PI * 2 * swishHz) * swish * (1 - q * 0.6);
        sc = q > 0.82 ? 1 - (q - 0.82) / 0.18 * 0.55 : 1;
        op = q > 0.9 ? 1 - (q - 0.9) / 0.1 : 1;
      }
      last = p;
      // 鱼图是脸朝左画的：往右游的整条左右翻过来（先翻再转）。两种朝向下，转角都 = 相对朝向的航向角（屏幕坐标顺时针为正）
      const rot = ang;
      el.style.opacity = op.toFixed(3);
      el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + (faceRight ? -sc : sc).toFixed(3) + ',' + sc.toFixed(3) + ')';
    }, { delay: opts.delay }).then(() => el.remove());
  }

  /* 一串鱼从 from（点 / 元素）游进 to（元素），第一条到了 onLand()（数字开始滚、目标弹一下） */
  function school(svg, from, toEl, n, opts) {
    opts = opts || {};
    if (reduce() || !toEl) { if (opts.onLand) opts.onLand(); return Promise.resolve(); }
    const tr = toEl.getBoundingClientRect(), b = opts.toPoint || { x: tr.left + Math.min(22, tr.width / 2), y: tr.top + tr.height / 2 };
    const a0 = from.getBoundingClientRect ? center(from.getBoundingClientRect()) : from;
    let landed = false;
    const all = [];
    for (let i = 0; i < n; i++) {
      const a = { x: a0.x + (rnd() - 0.5) * (opts.spread || 60), y: a0.y + (rnd() - 0.5) * (opts.spread || 60) * 0.5 };
      all.push(fish(svg, a, b, { delay: i * (opts.gap || 80), bulge: 0.1 + (i / Math.max(1, n - 1)) * 0.3, dur: (opts.dur || 760) + rnd() * 120, size: opts.size, lift: opts.lift }).then(() => {
        if (!landed) { landed = true; if (opts.onLand) opts.onLand(); }
        if (!opts.noBump) bump(toEl);
      }));
    }
    return Promise.all(all);
  }
  function bump(el) {
    if (!el || reduce()) return;
    // 小东西（左上角余额）弹得明显；整行宽的按钮（「开始」）只轻轻一顿——2026-11-23 录屏：12% 撑得比底下的单子还宽
    const amp = el.getBoundingClientRect().width > 160 ? 0.03 : 0.12;
    tween(240, (k) => { el.style.transform = 'scale(' + (1 + amp * Math.sin(k * Math.PI)).toFixed(3) + ')'; }).then(() => { el.style.transform = ''; });
  }

  root.ZhamaoWalletFx = { tween, roll, fish, school, bump, cancelAll, setManual, setTime, advance, setSpeed: (x) => { speed = Math.max(0.05, x || 1); }, speed: () => speed, busy: () => jobs.size > 0, reduce };
})(window);
