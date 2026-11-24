/* 拱猪 · 桌沿灯带 + 大厅重做 —— 预览（2026-11-23，待用户挑；?gzrim=<灯带 a|b|c><大厅 1|2>，例如 a1、c2；只写字母 = 大厅 1）
 * 只在 ?gzrim= 时由 gongzhu.js 加载（见那边 GZRIM / loadRimPv），不带参数的页面根本不加载这个文件。
 *
 * 灯带画在桌面（中间出牌区）的边上：四家坐在桌边外面，谁的回合就亮他面前那一段——像真的牌桌，人围着桌子坐，不骑在线上
 * （骑线的话竖屏三家名字、分数、牌背会被线穿过去，左右两家还会落到拐角上）。
 *   a 金线：一圈淡金细线；轮到谁，他面前那段变亮金、外面垫一层淡光；限时的话这段从两头往中间收，最后几秒变印泥红
 *   b 墨线：一圈墨色细线（和裱框同一种线）；轮到谁那段变粗、变印泥红；不垫光，最安静
 *   c 灯珠：一圈小灯珠；轮到谁他面前那几颗亮成金色；限时的话从两头一颗一颗熄
 *   d / e 金线串座（2026-11-23 用户：线把人串起来，但人不坐拐角、拐角要圆）：画法同 a，线穿过四家头像——
 *     上家坐左边、对家坐上边、下家坐右边、我坐底边；d 拐角半径 30，e 拐角取到不压人的最大值（「出牌」往右让一点，桌子更圆）
 *     左右两家吃到的牌折成一行小计（猪 / 羊 / 变压器 + 红桃几张 + 本局分），点开看全部；出牌区正菱形，排在别家名字 / 吃牌区下面
 *   f 三家在上（2026-11-24 对比用）：竖屏三家照旧坐上面一排、吃牌完整陈列，线从三家头像穿过；横屏同 d
 * 三版共用的状态：
 *   托管 = 那段冷灰蓝；掉线 = 那段断开（虚）；快输了（累计到 −700 以下、规则是输到 −1000 收盘）= 那段常驻一点暖红
 *   吃猪 = 他那段闪两下红；吃羊 = 闪金；变压器 = 按它的颜色闪；全红 = 一道红光从他那儿绕桌一圈；大满贯 = 金光绕两圈
 *   暂停 = 整圈变淡、所有光停住
 * 大厅：空座位 = 灯带上一个缺口；有人坐下那段就亮；四个人齐了，一道光绕一圈、整圈连起来。
 *   1 门牌：房号大字正中，下面一根金线，再下面一个不起眼的「复制邀请链接」；底下离开 / 开始
 *   2 名帖：房号印在一张双线框的小帖子上，复制键是帖子右下角一颗小图标；底下离开 / 开始
 * 大厅不再写「还差 1 人 / 人齐了」——看灯带缺不缺口就知道；只有观战的人还留一句。
 * 本房间战绩：已正式上线为「排行榜」（gongzhu-host-pv.js，战绩三），这里不再管。 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  const DOT_GAP = 13;

  function create(cfg, A) {
    const root = A.els.app;
    // d = 金线串座：画法同 a，但线穿过四家头像中心（人坐在线上、三家落在桌角），座位排法见 css「d 金线串座」
    const on = cfg.rim === 'd' || cfg.rim === 'e' || cfg.rim === 'f';
    root.classList.add('gzr', 'gzr-' + (on ? 'a' : cfg.rim), 'gzr-lobby-' + cfg.lobby);
    if (on) root.classList.add('gzr-on', 'gzr-' + cfg.rim);
    const table = A.els.table;
    const dots = cfg.rim === 'c';
    let sv = null, geo = null, lastKey = '', lobbyFull = false;
    const seatMode = ['', '', '', ''];
    const timers = [null, null, null, null];   // 每家的倒计时：{ total, start, paused, left }

    function build() {
      sv = document.createElementNS(NS, 'svg');
      sv.setAttribute('class', 'gzr-rim');
      sv.setAttribute('aria-hidden', 'true');
      sv.innerHTML = '<path class="gzr-base"/><g class="gzr-dots"></g><g class="gzr-segs"></g><g class="gzr-fx"></g>';
      table.insertBefore(sv, table.firstChild);
      const segs = sv.querySelector('.gzr-segs');
      for (let s = 0; s < 4; s++) {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'gzr-seg');
        g.dataset.s = s;
        g.innerHTML = '<path class="gzr-erase"/><path class="gzr-halo"/><path class="gzr-line"/>';
        segs.appendChild(g);
      }
    }

    /* 桌面 = 中间出牌区（#gzCenter）往里缩一点的圆角矩形；每家的锚点 = 他头像中心投到最近那条边上，再躲开拐角 */
    function rrect(x0, y0, x1, y1, R) {
      return 'M' + (x0 + R) + ' ' + y0 + 'H' + (x1 - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + x1 + ' ' + (y0 + R) +
        'V' + (y1 - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (x1 - R) + ' ' + y1 +
        'H' + (x0 + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + x0 + ' ' + (y1 - R) +
        'V' + (y0 + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (x0 + R) + ' ' + y0 + 'Z';
    }
    /* d：桌沿 = 穿过四家头像中心的圆角矩形（最左 / 最右 / 最上 / 最下那几个头像定四条边），拐角半径 = 头像半径，
     * 坐在拐角上的人正好把圆角盖住；每家的锚点 = 路径上离他头像中心最近的那一点，不躲拐角 */
    function measureOn() {
      const tb = table.getBoundingClientRect();
      const pts = A.els.seats.map((el) => {
        const r = el.querySelector('.gz-avatar') && el.querySelector('.gz-avatar').getBoundingClientRect();
        return r && r.width ? { cx: r.left + r.width / 2 - tb.left, cy: r.top + r.height / 2 - tb.top, r: r.width / 2 } : null;
      });
      const others = [1, 2, 3].map((s) => pts[s]).filter(Boolean);
      if (others.length < 1 || !pts[0]) return null;
      const av = Math.max(...pts.filter(Boolean).map((p) => p.r));
      const s0 = A.els.seats[0].getBoundingClientRect().left - tb.left;
      // 三家都在上面那一排（f 竖屏）：左右两条边贴着桌框走，上沿穿过三家；否则左右两条边穿过上家 / 下家
      const topThree = others.length === 3 && others.every((p) => Math.abs(p.cy - pts[2].cy) < 6);
      const x0 = topThree ? s0 + 12 : Math.min(...others.map((p) => p.cx));
      const x1 = topThree ? tb.width - (s0 + 12) : Math.max(...others.map((p) => p.cx));
      const y0 = Math.min(...others.map((p) => p.cy)), y1 = pts[0].cy;
      if (x1 - x0 < 60 || y1 - y0 < 60) return null;
      // 拐角半径：不能压到人——坐竖边的人离上下两条边、坐横边的人离左右两条边都要留出头像 + 6px；我不算（我按半径往右挪）
      let Rmax = Math.min((x1 - x0) / 2, (y1 - y0) / 2) - 2;
      others.forEach((p) => {
        if (Math.abs(p.cx - x0) < 3 || Math.abs(p.cx - x1) < 3) Rmax = Math.min(Rmax, Math.min(p.cy - y0, y1 - p.cy) - p.r - 6);
        else Rmax = Math.min(Rmax, Math.min(p.cx - x0, x1 - p.cx) - p.r - 6);
      });
      // 我坐底边、在左下拐角和「出牌」键之间：拐角越圆我越往右，不能撞上「出牌」那一格（按键那格的中线往左 68px 算；明牌时两个键另往右让）
      const portrait = matchMedia('(max-aspect-ratio: 1/1)').matches;
      const bandMid = tb.width / 2 + (cfg.rim === 'e' && portrait ? 56 : 0);
      Rmax = Math.min(Rmax, bandMid - 68 - x0 - 2 * av - 10);
      const R = Math.max(Math.min(av, 14), cfg.rim === 'e' ? Rmax : Math.min(30, Rmax));
      const meX = Math.round(x0 + R + 10 - s0);
      if (root.style.getPropertyValue('--gzr-me-x') !== meX + 'px') root.style.setProperty('--gzr-me-x', meX + 'px');
      const d = rrect(x0, y0, x1, y1, R);
      const base = sv.querySelector('.gzr-base');
      base.setAttribute('d', d);
      const L = base.getTotalLength();
      const N = 480, samp = [];
      for (let i = 0; i < N; i++) { const pt = base.getPointAtLength(i * L / N); samp.push([pt.x, pt.y, i * L / N]); }
      const seats = pts.map((p) => {
        if (!p) return null;
        let best = samp[0], bd = Infinity;
        for (const q of samp) { const dd = (q[0] - p.cx) ** 2 + (q[1] - p.cy) ** 2; if (dd < bd) { bd = dd; best = q; } }
        return { a: best[2], h: Math.min(64, L / 10), cx: p.cx, cy: p.cy };
      });
      diamond(x0, y0, x1, y1, tb);
      return { d, L, seats, key: 'on|' + [x0, y0, x1, y1, R].map(Math.round).join() + '|' + seats.map((p) => p ? Math.round(p.a) : '-').join() };
    }

    /* 出牌区摆成正菱形（2026-11-23 用户：方方正正，左右两张别压得太低）：
     * 菱形中心 = 这一圈桌沿的正中（不是中间那一格的正中——竖屏上面整排是对家，那一格偏下）；
     * 上下两张离中心 D、左右两张也离中心 D（横屏太矮放不下，左右至少错开一张牌宽，别叠到上下那两张） */
    function diamond(x0, y0, x1, y1, tb) {
      const ce = A.$('gzCenter'), sl = ce && ce.querySelector('.gz-slot');
      if (!ce || !sl) return;
      const cr = ce.getBoundingClientRect(), sr = sl.getBoundingClientRect();
      const tu = sr.width, th = sr.height;
      if (!tu || !th || !cr.height) return;
      // 上面不能压到别家的名字 / 牌背 / 吃牌区：凡是伸进菱形那几列、又在这一格上半截的，菱形都从它们下面开始
      const want = th * 1.3, need = want + th / 2 + 4;
      const cx = (x0 + x1) / 2 - (cr.left - tb.left);
      const spanL = cr.left + cx - want - tu / 2 - 4, spanR = cr.left + cx + want + tu / 2 + 4;
      let top = 0;
      [1, 2, 3].forEach((k) => A.els.seats[k].querySelectorAll('.gz-name-line, .gz-hold, .gz-caps, .gzr-tally').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (!r.height || getComputedStyle(e).display === 'none' || r.right < spanL || r.left > spanR) return;
        if (r.bottom - cr.top < cr.height * 0.6) top = Math.max(top, r.bottom - cr.top + 8);
      }));
      const H = cr.height - top;
      let cy = (y0 + y1) / 2 - (cr.top - tb.top);
      cy = H >= 2 * need ? Math.min(Math.max(cy, top + need), cr.height - need) : top + H / 2;
      const dv = Math.max(th * 0.55, Math.min(want, cy - top - th / 2 - 4, cr.height - cy - th / 2 - 4));
      const dh = Math.max(dv, tu + 10);
      const set = (k, v) => { const x = Math.round(v) + 'px'; if (ce.style.getPropertyValue(k) !== x) ce.style.setProperty(k, x); };
      set('--gzr-cx', cx); set('--gzr-cy', cy); set('--gzr-dv', dv); set('--gzr-dh', dh);
    }

    function measure() {
      if (on) return measureOn();
      const tb = table.getBoundingClientRect();
      const cr = A.$('gzCenter').getBoundingClientRect();
      if (!cr.width || !cr.height) return null;
      const pad = 4;
      const x0 = cr.left - tb.left + pad, y0 = cr.top - tb.top + pad;
      const x1 = cr.right - tb.left - pad, y1 = cr.bottom - tb.top - pad;
      const w = x1 - x0, h = y1 - y0;
      const R = Math.max(10, Math.min(26, w / 8, h / 8));
      const ew = w - 2 * R, eh = h - 2 * R, q = Math.PI * R / 2;
      const L = 2 * ew + 2 * eh + 4 * q;
      const d = rrect(x0, y0, x1, y1, R);
      // 每条边的起点（沿路径的长度）
      const off = { top: 0, right: ew + q, bottom: ew + eh + 2 * q, left: 2 * ew + eh + 3 * q };
      const seats = [];
      for (let s = 0; s < 4; s++) {
        const av = A.els.seats[s].querySelector('.gz-avatar');
        const r = av && av.getBoundingClientRect();
        if (!r || !r.width) { seats.push(null); continue; }
        const cx = r.left + r.width / 2 - tb.left, cy = r.top + r.height / 2 - tb.top;
        // 离哪条边最近（点到线段的距离）
        const cand = [
          ['top', Math.hypot(Math.max(x0 - cx, 0, cx - x1), cy - y0)],
          ['bottom', Math.hypot(Math.max(x0 - cx, 0, cx - x1), cy - y1)],
          ['left', Math.hypot(cx - x0, Math.max(y0 - cy, 0, cy - y1))],
          ['right', Math.hypot(cx - x1, Math.max(y0 - cy, 0, cy - y1))],
        ].sort((a, b) => a[1] - b[1]);
        seats.push({ edge: cand[0][0], cx, cy });
      }
      // 同一条边上有几家：段长按人数分
      const count = {};
      seats.forEach((p) => { if (p) count[p.edge] = (count[p.edge] || 0) + 1; });
      seats.forEach((p) => {
        if (!p) return;
        const horiz = p.edge === 'top' || p.edge === 'bottom';
        const len = horiz ? ew : eh;
        const hl = Math.max(14, Math.min(dots ? 60 : 72, len / (2 * count[p.edge]) - 10));
        let t = horiz ? p.cx - (x0 + R) : p.cy - (y0 + R);   // 沿这条边、从左 / 上量
        t = Math.min(Math.max(t, hl), len - hl);
        // 底边、左边在路径上是倒着走的
        const along = p.edge === 'top' || p.edge === 'right' ? t : len - t;
        p.a = off[p.edge] + along;
        p.h = hl;
      });
      return { d, L, seats, key: [x0, y0, x1, y1].map(Math.round).join() + '|' + seats.map((p) => p ? Math.round(p.a) : '-').join() };
    }

    function layout() {
      if (!sv) build();
      const g = measure();
      if (!g) return;
      if (g.key === lastKey) return;
      lastKey = g.key;
      geo = g;
      sv.querySelectorAll('path').forEach((p) => p.setAttribute('d', g.d));
      sv.querySelectorAll('.gzr-seg').forEach((el) => {
        const p = g.seats[+el.dataset.s];
        el.style.display = p ? '' : 'none';
        if (p) el.querySelectorAll('path').forEach((x) => dashSeg(x, p.a, p.h));
      });
      if (dots) {
        const base = sv.querySelector('.gzr-base');
        const box = sv.querySelector('.gzr-dots');
        const n = Math.max(12, Math.round(g.L / DOT_GAP));
        let html = '';
        for (let i = 0; i < n; i++) {
          const l = i * g.L / n, pt = base.getPointAtLength(l);
          html += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="2.2" data-l="' + l.toFixed(1) + '"/>';
        }
        box.innerHTML = html;
      }
      paint();
    }
    function dashSeg(p, a, h) {
      p.style.strokeDasharray = (2 * h) + ' ' + (geo.L - 2 * h);
      p.style.strokeDashoffset = String(-(a - h));
    }

    /* ───── 状态 ───── */
    function info(l) {
      const o = A.online();
      const m = A.match();
      if (!m) return { mode: '' };
      if (o && o.st) {
        const p = A.playerAt(A.srv(l));
        if (m.lobby) return { mode: p ? 'filled' : 'empty' };
        const g = o.st.game;
        if (p && !p.left && g && g.auto && g.auto[p.seat]) return { mode: 'auto' };
        if (p && !p.isAi && !p.online && !p.left) return { mode: 'offline' };
      }
      const seat = A.els.seats[l];
      if (seat.classList.contains('is-turn') || seat.classList.contains('is-timed')) return { mode: seat.classList.contains('is-hurry') ? 'hurry' : 'turn' };
      if (seat.classList.contains('is-auto')) return { mode: 'auto' };
      const end = m.rules && m.rules.end;
      if ((end === 'lose1000' || end === 'pm1000') && m.totals && m.totals[l] <= -700) return { mode: 'danger' };
      return { mode: '' };
    }

    function paint() {
      if (!sv || !geo) return;
      const m = A.match();
      const lobby = !!(m && m.lobby);
      root.classList.toggle('gzr-in-lobby', lobby);
      const modes = [0, 1, 2, 3].map((l) => info(l).mode);
      for (let l = 0; l < 4; l++) {
        const el = sv.querySelector('.gzr-seg[data-s="' + l + '"]');
        if (seatMode[l] !== modes[l]) {
          el.setAttribute('class', 'gzr-seg' + (modes[l] ? ' is-' + modes[l] : ''));
          seatMode[l] = modes[l];
        }
        const seat = A.els.seats[l];
        const timed = (modes[l] === 'turn' || modes[l] === 'hurry') && seat.classList.contains('is-timed');
        if (timed && !timers[l]) startTimer(l, seat);
        else if (!timed && timers[l]) stopTimer(l);
        if (timers[l]) timers[l].setPaused(seat.classList.contains('is-paused') || root.classList.contains('gzh-paused'));
      }
      const full = lobby && modes.every((x) => x === 'filled');
      if (full && !lobbyFull) sweep(geo.seats[0] ? geo.seats[0].a : 0, 'gold', 1);
      lobbyFull = full;
      sv.classList.toggle('is-full', full);
      sv.classList.toggle('is-paused', root.classList.contains('gzh-paused'));
      if (dots) paintDots(modes);
    }

    /* 倒计时：这段从两头往中间收（金线 / 墨线用 WAAPI 改虚线长度；灯珠按剩下的比例一颗颗熄） */
    function startTimer(l, seat) {
      const total = parseFloat(getComputedStyle(seat).getPropertyValue('--turn-ms')) || 20000;
      const p = geo.seats[l];
      const t = { total, start: performance.now(), anims: [], frac: 1, paused: false, pausedAt: 0 };
      if (!dots && p) {
        const line = sv.querySelector('.gzr-seg[data-s="' + l + '"]');
        line.querySelectorAll('.gzr-line, .gzr-halo').forEach((x) => {
          t.anims.push(x.animate([
            { strokeDasharray: (2 * p.h) + ' ' + (geo.L - 2 * p.h), strokeDashoffset: String(-(p.a - p.h)) },
            { strokeDasharray: '0 ' + geo.L, strokeDashoffset: String(-p.a) },
          ], { duration: total, easing: 'linear', fill: 'forwards' }));
        });
      } else {
        t.tick = setInterval(() => {
          if (t.paused) return;
          t.frac = Math.max(0, 1 - (performance.now() - t.start) / t.total);
          paintDots(seatMode);
        }, 120);
      }
      t.setPaused = (on) => {
        if (on === t.paused) return;
        t.paused = on;
        t.anims.forEach((a) => (on ? a.pause() : a.play()));
        if (on) t.pausedAt = performance.now(); else t.start += performance.now() - t.pausedAt;
      };
      timers[l] = t;
    }
    function stopTimer(l) {
      const t = timers[l];
      timers[l] = null;
      if (!t) return;
      t.anims.forEach((a) => a.cancel());
      if (t.tick) clearInterval(t.tick);
      if (dots) paintDots(seatMode);
    }

    function paintDots(modes) {
      const box = sv.querySelector('.gzr-dots');
      for (const c of box.children) {
        const l = +c.dataset.l;
        let cls = '';
        for (let s = 0; s < 4; s++) {
          const p = geo.seats[s];
          if (!p || !modes[s]) continue;
          let dl = Math.abs(l - p.a); dl = Math.min(dl, geo.L - dl);
          const t = timers[s];
          const reach = p.h * (t ? t.frac : 1);
          if (dl <= reach + 0.5) { cls = 'is-' + modes[s]; break; }
        }
        if (c.getAttribute('class') !== cls) c.setAttribute('class', cls);
      }
    }

    /* ───── 大事件 ───── */
    function flash(l, tone, times) {
      const p = geo && geo.seats[l];
      if (!p) return;
      const fx = document.createElementNS(NS, 'path');
      fx.setAttribute('d', geo.d);
      fx.setAttribute('class', 'gzr-flash tone-' + tone);
      const h = p.h + 10;
      fx.style.strokeDasharray = (2 * h) + ' ' + (geo.L - 2 * h);
      fx.style.strokeDashoffset = String(-(p.a - h));
      sv.querySelector('.gzr-fx').appendChild(fx);
      const frames = [];
      for (let i = 0; i < times; i++) frames.push({ opacity: 0 }, { opacity: 1 }, { opacity: 0.15 });
      frames.push({ opacity: 0 });
      fx.animate(frames, { duration: 520 * times, easing: 'ease-out' }).onfinish = () => fx.remove();
    }
    // 一道光从 a 出发顺着出牌方向（逆时针 = 路径倒着走）绕桌 laps 圈
    function sweep(a, tone, laps) {
      if (!geo) return;
      const fx = document.createElementNS(NS, 'path');
      fx.setAttribute('d', geo.d);
      fx.setAttribute('class', 'gzr-sweep tone-' + tone);
      const len = Math.min(140, geo.L / 5);
      fx.style.strokeDasharray = len + ' ' + (geo.L - len);
      sv.querySelector('.gzr-fx').appendChild(fx);
      const from = -(a - len / 2);
      fx.animate([
        { strokeDashoffset: String(from), opacity: 0 },
        { strokeDashoffset: String(from + geo.L * 0.06), opacity: 1, offset: 0.06 },
        { strokeDashoffset: String(from + geo.L * laps * 0.94), opacity: 1, offset: 0.94 },
        { strokeDashoffset: String(from + geo.L * laps), opacity: 0 },
      ], { duration: 1500 * laps, easing: 'cubic-bezier(.45,.05,.35,1)' }).onfinish = () => fx.remove();
    }
    function fx(list, w) {
      if (!geo) return;
      const p = geo.seats[w];
      let t = 0;
      for (const f of list) {
        const run = (k) => {
          if (k === 'pig') flash(w, 'red', 2);
          else if (k === 'sheep') flash(w, 'gold', 2);
          else if (k === 'doubler') flash(w, 'ink', 2);
          else if (k === 'allhearts') sweep(p ? p.a : 0, 'red', 1);
          else if (k === 'slam') sweep(p ? p.a : 0, 'gold', 2);
        };
        if (f.kind === 'clash') f.cards.forEach((c, i) => setTimeout(() => run(c === 47 ? 'doubler' : c === 35 ? 'sheep' : 'pig'), t + i * 450));
        else if (f.kind === 'combo') { setTimeout(() => run(f.all.kind), t); setTimeout(() => run(f.spec.kind === 'clash' ? 'pig' : f.spec.kind), t + 1400); }
        else setTimeout(() => run(f.kind), t);
        t += 900;
      }
    }

    /* ───── 大厅 ───── */
    function lobby(st) {
      const box = A.$('gzLobby');
      if (!box) return;
      const copy = box.querySelector('[data-lb="copy-link"]');
      if (copy && !copy.dataset.gzr) {
        copy.dataset.gzr = '1';
        if (cfg.lobby === '2') {
          copy.innerHTML = LINK;
          copy.setAttribute('aria-label', '复制邀请链接');
          copy.className = 'gzr-copy-icon';
          box.querySelector('.gz-lobby-code').appendChild(copy);
        } else {
          copy.innerHTML = LINK + '<span>复制邀请链接</span>';
          copy.className = 'gzr-copy';
        }
      }
      const code = box.querySelector('.gz-lobby-code');
      if (code && !code.dataset.gzr) {
        code.dataset.gzr = '1';
        const lab = code.querySelector('span');
        if (lab) lab.textContent = '房间';
      }
      // 大厅不写「还差几人 / 人齐了 / 等房主开始」：灯带看得出来；观战的人留着那句
      const wait = box.querySelector('.gz-lobby-wait');
      if (wait) wait.hidden = !(st && A.online() && A.online().watching);
      requestAnimationFrame(() => { lastKey = ''; layout(); });
    }

    /* 左右两家吃到的牌折叠成一行小计（乙 d / e 竖屏、所有串座版横屏）——猪 / 羊 / 变压器照原样小牌、红桃只写几张、本局分；点小计在旁边摊开全部。
     * 原来的吃牌区（.gz-caps）照常由 gongzhu.js 画，只是竖屏藏起来，摊开时直接把它亮出来 */
    const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.7 1.2 5.3 3.2 1.6-2 3.1-3.2 5.3-3.2 3.7 0 5.8 3.9 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>';
    function tally(k) {
      const seat = A.els.seats[k];
      const caps = seat.querySelector(':scope > .gz-caps');
      if (!caps) return;
      let t = seat.querySelector(':scope > .gzr-tally');
      if (!t) {
        t = document.createElement('button');
        t.type = 'button';
        t.className = 'gzr-tally';
        t.setAttribute('aria-label', '吃到的牌');
        t.addEventListener('click', (e) => { e.stopPropagation(); const open = !seat.classList.contains('gzr-caps-open'); closeCaps(); seat.classList.toggle('gzr-caps-open', open); });
        caps.before(t);
      }
      const cards = [...caps.querySelectorAll('.gz-card[data-card]')];
      const ids = cards.map((c) => +c.dataset.card);
      const sc = caps.querySelector('.gz-cap-score');
      const key = ids.join() + '|' + (sc ? sc.className + sc.textContent : '');
      if (t.dataset.k === key) return;
      t.dataset.k = key;
      t.hidden = !ids.length;
      if (!ids.length) seat.classList.remove('gzr-caps-open');
      const hearts = ids.filter((c) => c >= 13 && c <= 25).length;
      const sp = cards.filter((c) => [10, 35, 47].includes(+c.dataset.card)).map((c) => { const x = c.cloneNode(true); x.classList.remove('in', 'incoming', 'is-focus'); return x.outerHTML; });
      const tone = sc ? (sc.classList.contains('pos') ? ' pos' : sc.classList.contains('neg') ? ' neg' : sc.classList.contains('gold') ? ' gold' : '') : '';
      t.innerHTML = sp.join('') + (hearts ? '<span class="gzr-tally-h">' + HEART + hearts + '</span>' : '') + (sc && /[1-9]/.test(sc.textContent) ? '<b class="gzr-tally-s' + tone + '">' + sc.textContent.trim() + '</b>' : '');
      // 摊开层：特殊牌一排、红桃按点数叠成一把扇、右边本局分
      let pop = seat.querySelector(':scope > .gzr-tally-pop');
      if (!pop) { pop = document.createElement('div'); pop.className = 'gzr-tally-pop'; t.after(pop); }
      const clone = (c) => { const x = c.cloneNode(true); x.classList.remove('in', 'incoming', 'is-focus'); return x.outerHTML; };
      const hs = cards.filter((c) => +c.dataset.card >= 13 && +c.dataset.card <= 25).sort((a, b) => a.dataset.card - b.dataset.card);
      const others = cards.filter((c) => !(+c.dataset.card >= 13 && +c.dataset.card <= 25));
      pop.innerHTML = (others.length ? '<div class="gzr-pop-row">' + others.map(clone).join('') + '</div>' : '') +
        (hs.length ? '<div class="gzr-pop-row gzr-pop-fan">' + hs.map(clone).join('') + '</div>' : '') +
        (sc && /[1-9]/.test(sc.textContent) ? '<b class="gzr-tally-s' + tone + '">' + sc.textContent.trim() + '</b>' : '');
    }
    function closeCaps() { [1, 3].forEach((k) => A.els.seats[k].classList.remove('gzr-caps-open')); }
    if (on) {
      document.addEventListener('click', closeCaps);
      [1, 3].forEach((k) => {
        tally(k);
        new MutationObserver(() => tally(k)).observe(A.els.seats[k], { childList: true, subtree: true, characterData: true });
      });
    }

    const ro = new ResizeObserver(() => layout());
    ro.observe(table);
    if (on) A.els.seats.forEach((el) => ro.observe(el));   // 串座：线跟着头像走，座位一变就重量
    // 保险：字体到位后、以及每两秒都重量一次（头像挪了但座位尺寸没变时 ResizeObserver 不报；量一次很便宜，没变就什么都不做）
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout());
    setInterval(() => { if (!document.hidden) layout(); }, 2000);
    const mo = new MutationObserver(() => paint());
    A.els.seats.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['class'] }));
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });

    return {
      sync() { layout(); paint(); },
      lobby,
      fx,
    };
  }

  window.GongzhuRimPv = { create };
})();
