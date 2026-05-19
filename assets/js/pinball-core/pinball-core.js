/* PinballCore —— 4 张弹珠桌台共享的物理/渲染/输入/games-shell 集成
   用法：PinballCore.createGame(config) 返回 game controller
   config 字段见 README（见 toolbox/pinball/reactor/index.html 注释或本文件底部 docComment）
*/
(function (window) {
  'use strict';

  // ───────── 工具函数 ─────────
  function deg(d) { return d * Math.PI / 180; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function mixHex(hex, target, amt) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const tr = (target >> 16) & 0xff, tg = (target >> 8) & 0xff, tb = target & 0xff;
    return `rgb(${Math.round(r + (tr - r) * amt)}, ${Math.round(g + (tg - g) * amt)}, ${Math.round(b + (tb - b) * amt)})`;
  }
  function lightenHex(h, a) { return mixHex(h, 0xffffff, a); }
  function darkenHex(h, a)  { return mixHex(h, 0x000000, a); }

  function closestPointOnSeg(px, py, ax, ay, bx, by) {
    const ABx = bx - ax, ABy = by - ay;
    const len2 = ABx*ABx + ABy*ABy;
    if (len2 < 1e-6) return { x: ax, y: ay, t: 0 };
    let t = ((px - ax) * ABx + (py - ay) * ABy) / len2;
    t = clamp(t, 0, 1);
    return { x: ax + t * ABx, y: ay + t * ABy, t };
  }

  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

  // ───────── createGame ─────────
  function createGame(cfg) {
    const W = cfg.designW || 480;
    const H = cfg.designH || 640;
    const phys = Object.assign({
      gravity: 1100, airDrag: 0.999, substeps: 8, maxSpeed: 1400, ballRadius: 9,
    }, cfg.physics || {});
    const drainY = cfg.drainY != null ? cfg.drainY : 626;
    const drainRange = cfg.drainXRange || [100, 442];
    const totalBalls = cfg.totalBalls || 1;
    const storeKey = (cfg.store && cfg.store.key) || ('tool.pinball.' + (cfg.id || 'generic') + '.v1');

    // 弹簧默认配置
    const plg = Object.assign({
      x: 458, restY: 600, laneLeft: 442, laneRight: 474,
      maxCharge: 1.0, chargeRate: 1.6, maxVel: 1500, minVel: 520,
    }, cfg.plunger || {});

    // 挡板：把 deg 角统一转成 rad，并准备好 restAngle / upAngle
    const flippers = (cfg.flippers || [
      { pivot: { x: 158, y: 590 }, length: 70, thick: 7, restDeg: 25, upDeg: -32, side: 'L' },
      { pivot: { x: 332, y: 590 }, length: 70, thick: 7, restDeg: 180 - 25, upDeg: 180 - (-32), side: 'R' },
    ]).map(f => ({
      pivot: f.pivot,
      length: f.length || 70,
      thick: f.thick != null ? f.thick : 7,
      speed: f.speed || 28,
      restAngle: deg(f.restDeg),
      upAngle: deg(f.upDeg),
      angle: deg(f.restDeg),
      target: deg(f.restDeg),
      angularVelocity: 0,
      side: f.side,
    }));

    // 持久化
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); }
      catch { return {}; }
    })();

    // ───────── state ─────────
    const hooks = cfg.hooks || {};
    const render = cfg.render || {};
    const hud = cfg.hud || {};
    const shell = cfg.shell || {};

    const state = {
      balls: [],  // 活跃球：{x,y,vx,vy,r,onPlunger,trail,id}
      lives: totalBalls,  // 剩余可用次数（漏光后 -1）
      score: 0,
      best: Number(stored.best) || 0,
      bumperHits: 0,
      combo: 0,
      status: 'idle',  // idle | inplay | gameover | paused
      paused: false,
      startedAt: null,
      runNonce: null,
      lastFrameTime: 0,
      rafId: null,
      popups: [],
      flashTill: 0,
      lastMoveT: 0,
      // 桌台共享扩展：multiplier（combo 倍率，初始 1）
      multiplier: 1,
      // 桌台扩展自由空间
      ext: {},
    };

    // 球工厂
    let _ballIdSeq = 1;
    function makeBall(x, y, vx, vy, onPlunger) {
      return {
        id: _ballIdSeq++, x, y, vx: vx || 0, vy: vy || 0,
        r: phys.ballRadius, onPlunger: !!onPlunger, trail: [],
        // viaLane: true 表示球目前还在"从 plunger 出来到首次离开 lane"的途中。
        // 桌台用它区分"首次发射 / auto-return 重发"（viaLane=true）和
        // "球在场上 ricochet 重新回到 lane"（viaLane=false）。
        viaLane: !!onPlunger,
        // fieldReturn: 球这一"生命"里有没有从场上 ricochet 回到 lane 一次。
        // 通过 lane 视觉 trigger 给 T2 奖励；如果还能落回 plunger 顺利再发射，
        // 进 hooks.onLaunch 的 meta 里就是 true → 桌台给 T3 jackpot。
        // 发射成功后被 reset 回 false。
        fieldReturn: false,
      };
    }
    function spawnBallOnPlunger() {
      const b = makeBall(plg.x, plg.restY, 0, 0, true);
      state.balls.push(b);
      return b;
    }

    const plunger = { charge: 0, charging: false };

    // ───────── 几何材料 ─────────
    // walls/bumpers/pegs/slings/triggers 可以由 cfg 给定，也可以在 startFresh 时由 hooks.onBuild 重建
    const env = {
      walls: [],      // {ax,ay,bx,by, restitution, kick}
      bumpers: [],    // {x,y,r, kick, score, flashTill, hitCount, id, hidden}
      pegs: [],       // {x,y,r,score, flashTill, id}
      slings: [],     // {ax,ay,bx,by, restitution, kick, score, flashTill}
      triggers: [],   // {id, kind:'circle'|'segment'|'rect', enabled, cb, ...geo}
    };
    function rebuildEnv() {
      env.walls   = (cfg.walls   || []).map(w => Object.assign({ restitution: 0.78, kick: 0 }, w));
      env.bumpers = (cfg.bumpers || []).map((b, i) => Object.assign({
        r: 20, kick: 320, score: 100, flashTill: 0, hitCount: 0, id: 'b' + i, hidden: false,
      }, b));
      env.pegs    = (cfg.pegs    || []).map((p, i) => Object.assign({
        r: 5.5, score: 25, flashTill: 0, id: 'p' + i,
      }, p));
      env.slings  = (cfg.slings  || []).map((s, i) => Object.assign({
        restitution: 0.7, kick: 220, score: 25, flashTill: 0, id: 's' + i,
      }, s));
      env.triggers = (cfg.triggers || []).map((t, i) => Object.assign({
        id: t.id || 't' + i, enabled: true,
      }, t));
      if (typeof hooks.onBuild === 'function') hooks.onBuild(env, state, game);
    }

    // ───────── 加分 / popup ─────────
    // opts: { popupScale: 0.5-1.5, popupTtl: ms, noPopup: bool } — 桌台可压小密集区的弹字
    function addScore(amount, x, y, reason, opts) {
      if (!amount) return;
      const final = Math.round(amount * (state.multiplier || 1));
      state.score += final;
      if (state.score > state.best) { state.best = state.score; persist(); }
      const o = opts || {};
      if (x != null && y != null && !o.noPopup) {
        state.popups.push({
          x, y, text: '+' + final, t0: performance.now(),
          scale: o.popupScale, ttl: o.popupTtl,
        });
      }
      if (hooks.onScore) hooks.onScore(final, reason || 'misc', x, y);
    }

    function addPopup(x, y, text, ttl, opts) {
      const o = opts || {};
      state.popups.push({ x, y, text, t0: performance.now(), ttl: ttl || 900, scale: o.scale });
    }

    function persist() {
      try { localStorage.setItem(storeKey, JSON.stringify({ best: state.best })); }
      catch {}
    }

    // ───────── 碰撞 ─────────
    function clampSpeed(b) {
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > phys.maxSpeed) { const k = phys.maxSpeed / sp; b.vx *= k; b.vy *= k; }
    }

    function collideBumper(ball, bumper, now) {
      if (bumper.hidden) return false;
      const dx = ball.x - bumper.x, dy = ball.y - bumper.y;
      const d = Math.hypot(dx, dy);
      const md = ball.r + bumper.r;
      if (d >= md || d < 1e-6) return false;
      const nx = dx / d, ny = dy / d;
      const ov = md - d;
      ball.x += nx * ov; ball.y += ny * ov;
      const vDotN = ball.vx * nx + ball.vy * ny;
      if (vDotN < 0) {
        const r = 0.92;
        ball.vx -= (1 + r) * vDotN * nx;
        ball.vy -= (1 + r) * vDotN * ny;
      }
      ball.vx += nx * bumper.kick;
      ball.vy += ny * bumper.kick;
      bumper.flashTill = now + 180;
      bumper.hitCount++;
      state.bumperHits++;
      state.combo++;
      state.flashTill = now + 100;
      addScore(bumper.score, bumper.x, bumper.y - bumper.r, 'bumper');
      if (hooks.onBumperHit) hooks.onBumperHit(bumper, now, game, ball);
      return true;
    }

    function collidePeg(ball, peg, now) {
      const r = peg.r || 5.5;
      const dx = ball.x - peg.x, dy = ball.y - peg.y;
      const d = Math.hypot(dx, dy);
      const md = ball.r + r;
      if (d >= md || d < 1e-6) return false;
      const nx = dx / d, ny = dy / d;
      const ov = md - d;
      ball.x += nx * ov; ball.y += ny * ov;
      const vDotN = ball.vx * nx + ball.vy * ny;
      if (vDotN < 0) {
        const rs = 0.82;
        ball.vx -= (1 + rs) * vDotN * nx;
        ball.vy -= (1 + rs) * vDotN * ny;
      }
      if (peg.flashTill <= now) {
        peg.flashTill = now + 200;
        addScore(peg.score, peg.x, peg.y - 12, 'peg', {
          popupScale: peg.popupScale, popupTtl: peg.popupTtl, noPopup: peg.noPopup,
        });
        if (hooks.onPegHit) hooks.onPegHit(peg, now, game, ball);
      }
      return true;
    }

    function collideSegment(ball, seg, now, isSling) {
      const cp = closestPointOnSeg(ball.x, ball.y, seg.ax, seg.ay, seg.bx, seg.by);
      const dx = ball.x - cp.x, dy = ball.y - cp.y;
      const d = Math.hypot(dx, dy);
      if (d >= ball.r) return false;
      let nx, ny;
      if (d < 1e-6) {
        const ABx = seg.bx - seg.ax, ABy = seg.by - seg.ay;
        const len = Math.hypot(ABx, ABy) || 1;
        nx = -ABy / len; ny = ABx / len;
      } else { nx = dx / d; ny = dy / d; }
      const ov = ball.r - d;
      ball.x += nx * ov; ball.y += ny * ov;
      const vDotN = ball.vx * nx + ball.vy * ny;
      if (vDotN < 0) {
        const r = seg.restitution != null ? seg.restitution : 0.78;
        ball.vx -= (1 + r) * vDotN * nx;
        ball.vy -= (1 + r) * vDotN * ny;
      }
      if (isSling && seg.kick) {
        ball.vx += nx * seg.kick;
        ball.vy += ny * seg.kick;
        seg.flashTill = now + 110;
        addScore(seg.score || 25, cp.x, cp.y - 14, 'sling');
      }
      if (hooks.onWallHit) hooks.onWallHit(seg, now, game, { nx, ny, isSling });
      return true;
    }

    function collideFlipper(ball, flip) {
      const ax = flip.pivot.x, ay = flip.pivot.y;
      const bx = ax + Math.cos(flip.angle) * flip.length;
      const by = ay + Math.sin(flip.angle) * flip.length;
      const cp = closestPointOnSeg(ball.x, ball.y, ax, ay, bx, by);
      const dx = ball.x - cp.x, dy = ball.y - cp.y;
      const d = Math.hypot(dx, dy);
      const md = ball.r + flip.thick;
      if (d >= md) return false;
      let nx, ny;
      if (d < 1e-6) {
        const ABx = bx - ax, ABy = by - ay;
        const len = Math.hypot(ABx, ABy) || 1;
        nx = -ABy / len; ny = ABx / len;
        if ((flip.side === 'L' && nx < 0) || (flip.side === 'R' && nx > 0)) { nx = -nx; ny = -ny; }
      } else { nx = dx / d; ny = dy / d; }
      const ov = md - d + 0.01;
      ball.x += nx * ov; ball.y += ny * ov;
      const cpDx = cp.x - ax, cpDy = cp.y - ay;
      const omega = flip.angularVelocity;
      const fvx = -cpDy * omega, fvy = cpDx * omega;
      const relVx = ball.vx - fvx, relVy = ball.vy - fvy;
      const relVDotN = relVx * nx + relVy * ny;
      if (relVDotN < 0) {
        const r = 0.55;
        ball.vx -= (1 + r) * relVDotN * nx;
        ball.vy -= (1 + r) * relVDotN * ny;
        if (Math.abs(omega) > 2) {
          ball.vx += fvx * 0.45;
          ball.vy += fvy * 0.45;
        }
      }
      return true;
    }

    // Trigger 检测（圆 / rect / segment）；wasIn 按球分桶，否则 multiball 下会错误抑制其它球
    function checkTriggers(ball, now) {
      env.triggers.forEach(t => {
        if (!t.enabled) return;
        let hit = false;
        if (t.kind === 'circle') {
          if (dist(ball.x, ball.y, t.x, t.y) < (t.r || 12) + ball.r * 0.4) hit = true;
        } else if (t.kind === 'rect') {
          if (ball.x > t.x && ball.x < t.x + t.w && ball.y > t.y && ball.y < t.y + t.h) hit = true;
        } else if (t.kind === 'segment') {
          const cp = closestPointOnSeg(ball.x, ball.y, t.ax, t.ay, t.bx, t.by);
          if (dist(ball.x, ball.y, cp.x, cp.y) < (t.thresh || 8)) hit = true;
        }
        if (!t._inBalls) t._inBalls = new Set();
        if (!hit) { t._inBalls.delete(ball.id); return; }
        const wasIn = t._inBalls.has(ball.id);
        t._inBalls.add(ball.id);
        if (t.on === 'enter' && wasIn) return;
        if (t.cooldownTill && now < t.cooldownTill) return;
        t.cooldownTill = now + (t.cooldown || 0);
        if (t.cb) t.cb(now, ball, game);
        if (t.oneShot) t.enabled = false;
      });
    }

    // ───────── 弹簧 ─────────
    function updatePlunger(dt) {
      if (plunger.charging) {
        plunger.charge = Math.min(plg.maxCharge, plunger.charge + plg.chargeRate * dt);
      }
      if (hud.chargeBar) hud.chargeBar.style.width = (plunger.charge * 100) + '%';
      // 球停在 plunger 上：随蓄力下沉
      state.balls.forEach(b => {
        if (b.onPlunger) {
          b.x = plg.x;
          b.y = plg.restY + plunger.charge * 12;
          b.vx = 0; b.vy = 0;
        }
      });
    }

    function launchPlunger() {
      const b = state.balls.find(b => b.onPlunger);
      if (!b) return;
      if (plunger.charge < 0.05) { plunger.charge = 0; return; }
      const v = plg.minVel + (plg.maxVel - plg.minVel) * plunger.charge;
      b.vy = -v;
      b.vx = 0;
      b.onPlunger = false;
      plunger.charge = 0;
      if (state.status === 'idle') {
        state.status = 'inplay';
        state.startedAt = state.startedAt || Date.now();
        hideOverlay();
      }
      // fieldReturn 不在 launch 时 reset —— 要等球真的跨过 laser、给完 T3 才在 cb 里 reset。
      // 否则蓄力很轻、球根本没到 laser 也"发射成功"就把 fieldReturn 干掉了，等于送 T3。
      if (hooks.onLaunch) hooks.onLaunch(b, game);
    }

    // ───────── 挡板 ─────────
    function updateFlippers(dt) {
      flippers.forEach(f => {
        const old = f.angle;
        const dir = Math.sign(f.target - f.angle);
        if (dir === 0) { f.angularVelocity = 0; return; }
        const next = f.angle + dir * f.speed * dt;
        if ((dir > 0 && next > f.target) || (dir < 0 && next < f.target)) f.angle = f.target;
        else f.angle = next;
        f.angularVelocity = (f.angle - old) / Math.max(dt, 1e-4);
      });
    }

    // ───────── 主循环 ─────────
    function step(now) {
      if (!state.lastFrameTime) state.lastFrameTime = now;
      const rawDt = (now - state.lastFrameTime) / 1000;
      state.lastFrameTime = now;
      const dt = Math.min(rawDt, 0.033);

      if (game) game._tickTimers(now);
      if (!state.paused && state.status !== 'gameover') {
        updatePlunger(dt);
        updatePhysics(dt, now);
        if (hooks.onTick) hooks.onTick(dt, now, game);
      }
      updateHud();
      render_(now);
      state.rafId = requestAnimationFrame(step);
    }

    function updatePhysics(dt, now) {
      // 没在 plunger 上的球都要 step 物理
      const movingBalls = state.balls.filter(b => !b.onPlunger);
      if (movingBalls.length === 0) {
        updateFlippers(dt);  // 即使球在弹簧上，挡板也要响应
        return;
      }
      const subDt = dt / phys.substeps;
      for (let s = 0; s < phys.substeps; s++) {
        updateFlippers(subDt);

        // 重力 + 阻尼对每球
        for (let i = 0; i < state.balls.length; i++) {
          const b = state.balls[i];
          if (b.onPlunger) continue;
          b.vy += phys.gravity * subDt;
          b.vx *= Math.pow(phys.airDrag, subDt * 60);
          b.x += b.vx * subDt;
          b.y += b.vy * subDt;
        }

        // 漏球判定 + 碰撞
        for (let i = state.balls.length - 1; i >= 0; i--) {
          const b = state.balls[i];
          if (b.onPlunger) continue;
          // 漏球
          if (b.y - b.r > drainY && b.x > drainRange[0] && b.x < drainRange[1]) {
            state.balls.splice(i, 1);
            if (hooks.onBallDrain) hooks.onBallDrain(b, now, game);
            continue;
          }
          // 普通碰撞
          env.bumpers.forEach(bp => collideBumper(b, bp, now));
          env.pegs.forEach(pg => collidePeg(b, pg, now));
          env.walls.forEach(w => { if (!w.hidden) collideSegment(b, w, now, false); });
          env.slings.forEach(sg => collideSegment(b, sg, now, true));
          flippers.forEach(f => collideFlipper(b, f));
          checkTriggers(b, now);
          clampSpeed(b);
        }

        // 球-球碰撞（pairwise，等质量弹性碰撞 + 位置补正）
        // multiball 时之前球之间会直接穿过；现按等质量弹性碰撞处理。
        // 5 球时 5C2=10 对，单帧 8 substeps 仍很轻量；
        // ballRadius=9 + maxSpeed/substeps≈2.9px/sub-tick，远小于直径 18 px，不会 tunnel。
        const BB_REST = 0.85;
        const balls = state.balls;
        for (let i = 0; i < balls.length; i++) {
          const a = balls[i];
          if (a.onPlunger) continue;
          for (let j = i + 1; j < balls.length; j++) {
            const c = balls[j];
            if (c.onPlunger) continue;
            const dx = c.x - a.x, dy = c.y - a.y;
            const d2 = dx*dx + dy*dy;
            const md = a.r + c.r;
            if (d2 >= md*md || d2 < 1e-6) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d, ny = dy / d;
            const overlap = (md - d) * 0.5;
            a.x -= nx * overlap; a.y -= ny * overlap;
            c.x += nx * overlap; c.y += ny * overlap;
            const rvx = c.vx - a.vx, rvy = c.vy - a.vy;
            const vDotN = rvx * nx + rvy * ny;
            if (vDotN >= 0) continue;  // 已经在分开，不再施加冲量
            const J = -(1 + BB_REST) * vDotN * 0.5;
            a.vx -= J * nx; a.vy -= J * ny;
            c.vx += J * nx; c.vy += J * ny;
          }
        }
      }

      // 所有活跃球都掉了 → 决定下一步
      if (state.balls.length === 0) {
        onAllBallsDrained(now);
        return;
      }

      // plunger lane 弱发射救援
      // 注意：这条 path 不 reset fieldReturn —— 球在 lane 范围内、向下、慢速时落回弹簧，
      // 视作"自然回轨"，是预期的 T3 触发途径（玩家用低力发射、球自然漏回弹簧再发）。
      state.balls.forEach(b => {
        if (b.onPlunger) return;
        const sp = Math.hypot(b.vx, b.vy);
        if (b.x > plg.laneLeft - 4 && b.x < plg.laneRight + 4 &&
            b.y > 530 && sp < 200 && b.vy > -120) {
          b.x = plg.x; b.y = plg.restY; b.vx = 0; b.vy = 0;
          b.onPlunger = true; b.trail = [];
          plunger.charge = 0;
        }
      });

      // 卡住兜底：速度 < 15 持续 1s → 球真的停了 (挡板平台 / 卡在 bumper 顶 / wedge corner)
      // 这是"不是凭技术回来的"，所以送回弹簧后必须 reset fieldReturn=false，
      // 避免下次发射穿 laser 误给 T3 +3000 大奖。
      // 之前还有一条"位置中心漂移"检测，但高速做对称运动的球 (来回弹) 前半/后半 CoM 一样，
      // 也会被误判 — 撤掉。代价是 bumper 间死循环刷分要靠玩家自己处理或重开新局。
      state.balls.forEach(b => {
        if (b.onPlunger) { b._lastFastT = now; return; }
        const sp = Math.hypot(b.vx, b.vy);
        if (b._lastFastT == null) b._lastFastT = now;
        if (sp > 15) b._lastFastT = now;
        if (now - b._lastFastT > 1000) {
          b._lastFastT = now;
          b.x = plg.x; b.y = plg.restY; b.vx = 0; b.vy = 0;
          b.onPlunger = true; b.trail = [];
          b.fieldReturn = false;
          plunger.charge = 0;
        }
      });

      // viaLane / fieldReturn 状态机：
      // - 球在 plunger 上 → viaLane=true（onPlunger 时不清 fieldReturn）
      // - 球离开 lane 范围 → viaLane=false
      // - 球 viaLane=false 时进 lane 范围 → fieldReturn=true（场上 ricochet 回来）
      // fieldReturn 一旦置 true 就保持，直到下次成功 launch 才 reset
      state.balls.forEach(b => {
        const inLane = b.x >= plg.laneLeft - 10 && b.x <= plg.laneRight + 10;
        if (b.onPlunger) {
          b.viaLane = true;
        } else if (b.viaLane && !inLane) {
          b.viaLane = false;
        } else if (!b.viaLane && inLane) {
          b.fieldReturn = true;
        }
      });

      // 拖尾
      state.balls.forEach(b => {
        if (b.onPlunger) return;
        b.trail.unshift({ x: b.x, y: b.y });
        if (b.trail.length > 4) b.trail.length = 4;
      });

      // popup 过期
      if (state.popups.length) {
        state.popups = state.popups.filter(p => now - p.t0 < (p.ttl || 700));
      }
    }

    function onAllBallsDrained(now) {
      state.combo = 0;
      state.multiplier = 1;
      if (state.lives > 0) {
        state.lives--;
        if (state.lives > 0) {
          spawnBallOnPlunger();
          state.status = 'idle';
        } else {
          gameOver();
        }
      } else {
        gameOver();
      }
      if (hooks.onAfterDrain) hooks.onAfterDrain(now, game);
    }

    function gameOver() {
      state.status = 'gameover';
      // 两行：上行显示得分摘要，下行显示操作提示。中文带破折号的长串单行 540 px 容易折
      showOverlay({
        title: 'Game Over',
        msg: `本局 ${state.score}　·　历史最高 ${state.best}<br><span class="pb-ov-hint">按 空格 / 点「再来一局」</span>`,
        btn: true,
      });
      if (hooks.onGameOver) hooks.onGameOver(state, game);
      pbTryAutoSubmit();
      if (pbSettleBtn) pbSettleBtn.setEnabled(true);
    }

    // ───────── 渲染 ─────────
    function render_(now) {
      const canvas = cfg.canvas;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const tw = Math.max(1, Math.round(rect.width * dpr));
      const th = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw; canvas.height = th;
      }
      const sx = canvas.width / W, sy = canvas.height / H;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);

      // 背景：桌台自己画
      if (render.paintBackground) render.paintBackground(ctx, now, game);
      else {
        ctx.fillStyle = '#1b1b22';
        ctx.fillRect(0, 0, W, H);
      }

      // 中层：桌台自己画（可选）— 在墙之前画特殊机关（reactor core, spinner 等）
      if (render.paintMidLayer) render.paintMidLayer(ctx, now, game);

      // 墙
      ctx.strokeStyle = render.wallColor || '#7c7e8a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      env.walls.forEach(w => {
        if (w.hidden) return;
        ctx.beginPath(); ctx.moveTo(w.ax, w.ay); ctx.lineTo(w.bx, w.by); ctx.stroke();
      });

      // Slings
      env.slings.forEach(sg => drawSling(ctx, sg, now));

      // Pegs
      env.pegs.forEach(p => drawPeg(ctx, p, now));

      // Bumpers
      env.bumpers.forEach(b => {
        if (b.hidden) return;
        drawBumper(ctx, b, now);
      });

      // 弹簧 + 挡板
      drawPlunger(ctx);
      flippers.forEach(f => drawFlipper(ctx, f));

      // 球（多球）
      state.balls.forEach(b => drawBall(ctx, b));

      // 前景：桌台自己画（覆盖在球之上的灯光/特效）
      if (render.paintForeground) render.paintForeground(ctx, now, game);

      // popups —— 默认 scale=1 时复用常量 font string，避免每帧每条 popup 都创建新字符串
      const DEFAULT_FONT = 'bold 18px system-ui, sans-serif';
      state.popups.forEach(p => {
        const ttl = p.ttl || 700;
        const t = (now - p.t0) / ttl;
        if (t < 0 || t >= 1) return;
        const alpha = 1 - t, lift = t * 28;
        const scale = p.scale;
        let fontStr, lineW;
        if (!scale || scale === 1) {
          fontStr = DEFAULT_FONT; lineW = 2;
        } else {
          fontStr = 'bold ' + Math.max(8, Math.round(18 * scale)) + 'px system-ui, sans-serif';
          lineW = Math.max(1, 2 * scale);
        }
        ctx.save();
        ctx.fillStyle = `rgba(245, 230, 196, ${alpha})`;
        ctx.strokeStyle = `rgba(40, 30, 15, ${alpha * 0.9})`;
        ctx.lineWidth = lineW;
        ctx.font = fontStr;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText(p.text, p.x, p.y - lift);
        ctx.fillText(p.text, p.x, p.y - lift);
        ctx.restore();
      });

      // 顶部分数闪光
      if (state.flashTill > now) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawBumper(ctx, b, now) {
      const flash = b.flashTill > now;
      const r = b.r + (flash ? 4 : 0);
      const base = b.color || '#b89460';
      if (flash) { ctx.shadowColor = b.flashColor || '#f5e6c4'; ctx.shadowBlur = 22; }
      const grd = ctx.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, r);
      if (flash) {
        grd.addColorStop(0, '#fff8e0');
        grd.addColorStop(0.5, b.flashColor || '#f5e6c4');
        grd.addColorStop(1, base);
      } else {
        grd.addColorStop(0, lightenHex(base, 0.55));
        grd.addColorStop(0.55, base);
        grd.addColorStop(1, darkenHex(base, 0.55));
      }
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 248, 224, 0.45)';
      ctx.beginPath();
      ctx.arc(b.x - r * 0.32, b.y - r * 0.32, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = flash ? '#fff8e0' : 'rgba(245, 230, 196, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    }

    function drawPeg(ctx, p, now) {
      const flash = p.flashTill > now;
      const r = (p.r || 5.5) + 1 + (flash ? 1.5 : 0);
      if (flash) { ctx.shadowColor = '#f5e6c4'; ctx.shadowBlur = 12; }
      const grd = ctx.createRadialGradient(p.x - 1.2, p.y - 1.2, 0.5, p.x, p.y, r);
      if (flash) {
        grd.addColorStop(0, '#fff8e0');
        grd.addColorStop(0.6, '#d4b478');
        grd.addColorStop(1, '#8a7040');
      } else {
        grd.addColorStop(0, '#a4a7b1');
        grd.addColorStop(0.7, '#7c7e8a');
        grd.addColorStop(1, '#3a3c44');
      }
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(245, 230, 196, 0.45)';
      ctx.beginPath();
      ctx.arc(p.x - 1.2, p.y - 1.2, 1.4, 0, Math.PI * 2); ctx.fill();
    }

    function drawSling(ctx, sg, now) {
      // 三角形顶点：取 (ax,ay) 与 (bx,by) 作为斜边，apex 沿法向偏 22 px
      // apex 必须落在"线的 back-wall 一侧"——也就是远离桌中央那一侧。
      // 否则视觉三角形会画到中央那一侧，球从中央飞来穿过整个三角形才在线上反弹，
      // 看起来像"穿模"。
      // 因为 L/R sling 两边的 (ax,ay)→(bx,by) 走向相反，自然 perp 也朝相反方向，
      // 直接用同一公式即可，不需要再为 R side 翻号。
      const midx = (sg.ax + sg.bx) / 2, midy = (sg.ay + sg.by) / 2;
      const dxx = sg.bx - sg.ax, dyy = sg.by - sg.ay;
      const len = Math.hypot(dxx, dyy) || 1;
      const tipX = midx + (-dyy / len) * 22;
      const tipY = midy + (dxx / len) * 22;
      const flash = sg.flashTill > now;
      const color = sg.color || '#c9a961';
      if (flash) { ctx.shadowColor = color; ctx.shadowBlur = 16; }
      ctx.fillStyle = sg.colorFill || color;
      ctx.beginPath();
      ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.lineTo(tipX, tipY); ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = sg.strokeColor || 'rgba(245, 230, 196, 0.50)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sg.ax, sg.ay); ctx.lineTo(sg.bx, sg.by); ctx.stroke();
    }

    function drawFlipper(ctx, f) {
      const ax = f.pivot.x, ay = f.pivot.y;
      const bx = ax + Math.cos(f.angle) * f.length;
      const by = ay + Math.sin(f.angle) * f.length;
      ctx.strokeStyle = f.color || '#6e2424';
      ctx.lineWidth = f.thick * 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = 'rgba(245, 230, 196, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      // 之前在 pivot 上叠一颗 4px 深灰 + 1.6px 金色圆点想模拟"铆钉"，但配合
      // 14px 圆形 cap 一起看像一颗 3D 小金属球粘在 flipper 末端，反而很突兀。
      // 删掉，只留下 line 自己的圆形 cap 作为 pivot 视觉锚。
    }

    function drawPlunger(ctx) {
      const x = plg.x;
      const baseY = 620;
      const top = plg.restY + 12 + plunger.charge * 14;
      ctx.fillStyle = '#444';
      ctx.fillRect(x - 14, baseY - 4, 28, 6);
      ctx.strokeStyle = '#8a8a8a';
      ctx.lineWidth = 2;
      const segs = 4;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const y = top + (baseY - 4 - top) * t;
        const sx2 = x + (i % 2 === 0 ? -8 : 8);
        if (i === 0) ctx.moveTo(sx2, y); else ctx.lineTo(sx2, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#9aa3b2';
      ctx.fillRect(x - 12, top - 4, 24, 4);

      // 多球队列指示：当前 plunger 位置上 ≥ 2 颗球时，左侧画 ×N 角标
      // (multiball 后多颗球被送回 plunger 会叠在一起看不出来)
      const onP = state.balls.reduce((n, b) => n + (b.onPlunger ? 1 : 0), 0);
      if (onP >= 2) {
        const cx = x - 22, cy = plg.restY - 14;
        ctx.fillStyle = '#f5e6c4';
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(40,30,15,0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#1a1208';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×' + onP, cx, cy);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
    }

    function drawBall(ctx, b) {
      b.trail.forEach((t, i) => {
        const a = (1 - i / b.trail.length) * 0.35;
        ctx.fillStyle = `rgba(245, 230, 196, ${a})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.r * (1 - i * 0.15), 0, Math.PI * 2); ctx.fill();
      });
      const bg = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, b.r);
      bg.addColorStop(0, '#fbf6e8');
      bg.addColorStop(0.6, '#ddd5c1');
      bg.addColorStop(1, '#7d7765');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }

    // ───────── HUD ─────────
    const hudCache = { score: -1, best: -1 };
    function updateHud() {
      if (hud.score && state.score !== hudCache.score) {
        hud.score.textContent = state.score;
        if (state.score > hudCache.score && hudCache.score >= 0) {
          hud.score.classList.remove('bump');
          void hud.score.offsetWidth;
          hud.score.classList.add('bump');
        }
        hudCache.score = state.score;
      }
      if (hud.best && state.best !== hudCache.best) {
        hud.best.textContent = state.best;
        if (state.best > hudCache.best && hudCache.best >= 0) {
          hud.best.classList.remove('bump');
          void hud.best.offsetWidth;
          hud.best.classList.add('bump');
        }
        hudCache.best = state.best;
      }
    }

    function showOverlay({ title, msg, btn }) {
      if (!hud.overlay) return;
      if (hud.overlayTitle) hud.overlayTitle.textContent = title;
      // msg 走 innerHTML：调用方可用 <br> 显式换行（gameOver 拼了"本局 / 历史 / 按空格"3 段，单行容易折）
      if (hud.overlayMsg) hud.overlayMsg.innerHTML = msg;
      if (hud.overlayBtn) hud.overlayBtn.style.display = btn ? 'inline-block' : 'none';
      hud.overlay.classList.add('show');
    }
    function hideOverlay() {
      if (!hud.overlay) return;
      hud.overlay.classList.remove('show');
      hud.overlay.classList.remove('pb-overlay--pause');
    }

    function setGoal(text) {
      if (hud.goalBar) hud.goalBar.innerHTML = text;
    }

    function togglePause() {
      if (state.status === 'gameover') return;
      state.paused = !state.paused;
      if (hud.pauseBtn) hud.pauseBtn.textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
      if (state.paused) {
        showOverlay({ title: '暂停中', msg: '按 P 或继续按钮恢复', btn: false });
        if (hud.overlay) hud.overlay.classList.add('pb-overlay--pause');
      } else {
        hideOverlay();
      }
    }

    function startFresh() {
      state.balls = [];
      state.lives = totalBalls;
      state.score = 0;
      state.bumperHits = 0;
      state.combo = 0;
      state.multiplier = 1;
      state.popups = [];
      state.ext = {};
      state.status = 'idle';
      state.paused = false;
      state.startedAt = null;
      state.runNonce = (window.GamesShell && GamesShell.Identity.newRunNonce()) || ('r-' + Date.now());
      plunger.charge = 0; plunger.charging = false;
      flippers.forEach(f => { f.angle = f.restAngle; f.target = f.restAngle; f.angularVelocity = 0; });
      rebuildEnv();
      spawnBallOnPlunger();
      pbPendingSubmit = false; pbLastRankInfo = null;
      pbSetRank('hidden');
      if (pbNickPrompt) pbNickPrompt.hide();
      if (pbSettleBtn) pbSettleBtn.setEnabled(false);
      if (hud.pauseBtn) hud.pauseBtn.textContent = '⏸ 暂停';
      hideOverlay();
      if (hooks.onStart) hooks.onStart(state, game);
      updateHud();
    }

    // ───────── 输入 ─────────
    const flipHold = { L: { kbd: false, touch: false }, R: { kbd: false, touch: false } };
    function setFlipper(side, source, on) {
      if (state.status === 'gameover' || state.paused) return;
      flipHold[side][source] = on;
      const f = flippers.find(fl => fl.side === side);
      if (!f) return;
      const held = flipHold[side].kbd || flipHold[side].touch;
      f.target = held ? f.upAngle : f.restAngle;
    }
    function setPlunger(on) {
      if (state.status === 'gameover' || state.paused) return;
      const onP = state.balls.some(b => b.onPlunger);
      if (!onP) { plunger.charging = false; return; }
      if (on) plunger.charging = true;
      else { plunger.charging = false; launchPlunger(); }
    }

    const PB_KEYS = new Set(['arrowleft', 'arrowright', 'a', 'd', ' ', 'p', 'r']);
    function isFormFocused() {
      const ae = document.activeElement;
      if (!ae) return false;
      const tag = ae.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae.isContentEditable;
    }
    const keysDown = new Set();
    window.addEventListener('keydown', (e) => {
      if (isFormFocused()) return;
      const k = e.key.toLowerCase();
      if (!PB_KEYS.has(k)) return;
      e.preventDefault();
      if (keysDown.has(k)) return;
      keysDown.add(k);
      if (k === 'arrowleft' || k === 'a') setFlipper('L', 'kbd', true);
      else if (k === 'arrowright' || k === 'd') setFlipper('R', 'kbd', true);
      else if (k === ' ') {
        if (state.status === 'gameover') startFresh();
        setPlunger(true);
      } else if (k === 'p') togglePause();
      else if (k === 'r') startFresh();
    }, { capture: true });
    window.addEventListener('keyup', (e) => {
      if (isFormFocused()) return;
      const k = e.key.toLowerCase();
      if (!PB_KEYS.has(k)) return;
      e.preventDefault();
      keysDown.delete(k);
      if (k === 'arrowleft' || k === 'a') setFlipper('L', 'kbd', false);
      else if (k === 'arrowright' || k === 'd') setFlipper('R', 'kbd', false);
      else if (k === ' ') setPlunger(false);
    }, { capture: true });

    function bindHoldButton(el, onDown, onUp) {
      if (!el) return;
      let active = false;
      let pid = null;
      const start = (e) => {
        if (active) return;
        active = true; pid = e.pointerId;
        // 指针捕获：手机上手指按住 flipper 后即使滑出按钮范围，
        // 事件仍归这个按钮 —— 不会再像以前那样手指一抖 flipper 就松开
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        el.classList.add('active'); onDown(); e.preventDefault();
      };
      const end = (e) => {
        if (!active) return;
        if (e && pid != null && e.pointerId != null && e.pointerId !== pid) return;
        active = false; pid = null;
        el.classList.remove('active'); onUp(); if (e) e.preventDefault();
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('lostpointercapture', end);
      // 不再绑定 pointerleave —— 改用指针捕获，避免手指轻微移动就误松手
      el.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
      // 长按 flipper 时手机会弹出系统选择/快捷菜单，挡住操作，禁掉
      el.addEventListener('contextmenu', e => e.preventDefault());
    }
    bindHoldButton(hud.flipLBtn, () => setFlipper('L', 'touch', true), () => setFlipper('L', 'touch', false));
    bindHoldButton(hud.flipRBtn, () => setFlipper('R', 'touch', true), () => setFlipper('R', 'touch', false));
    bindHoldButton(hud.plungerBtn, () => setPlunger(true), () => setPlunger(false));
    if (hud.pauseBtn) hud.pauseBtn.addEventListener('click', togglePause);
    if (hud.newBtn) hud.newBtn.addEventListener('click', startFresh);
    if (hud.overlayBtn) hud.overlayBtn.addEventListener('click', startFresh);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.status === 'inplay' && !state.paused) togglePause();
    });

    // ───────── games-shell ─────────
    let pbLbWidget = null, pbNickPrompt = null, pbSettleBtn = null;
    let pbPendingSubmit = false, pbLastRankInfo = null;
    const $pbRankRow = shell.rankRow || null;

    function pbSetRank(name, data) {
      if (!$pbRankRow) return;
      if (name === 'hidden') {
        $pbRankRow.classList.remove('show', 'loading', 'failed');
        $pbRankRow.innerHTML = '';
        pbLastRankInfo = null; return;
      }
      $pbRankRow.classList.add('show');
      $pbRankRow.classList.remove('loading', 'failed');
      if (name === 'loading') { $pbRankRow.classList.add('loading'); $pbRankRow.textContent = '排名上传中…'; pbLastRankInfo = {}; }
      else if (name === 'failed') { $pbRankRow.classList.add('failed'); $pbRankRow.textContent = '排行榜暂时不可用（不影响游戏）'; pbLastRankInfo = { failed: true }; }
      else if (name === 'pending') { $pbRankRow.classList.add('failed'); $pbRankRow.textContent = '想上排行榜？看下面的昵称表单 ↓'; pbLastRankInfo = { pending: true }; }
      else if (name === 'success' && data && data.rank && data.total) {
        $pbRankRow.innerHTML = '';
        $pbRankRow.append(
          document.createTextNode('第 '),
          Object.assign(document.createElement('strong'), { textContent: String(data.rank) }),
          document.createTextNode(' 名 · 共 '),
          Object.assign(document.createElement('strong'), { textContent: String(data.total) }),
          document.createTextNode(' 位玩家'),
        );
        pbLastRankInfo = { rank: data.rank, total: data.total };
      }
    }

    async function pbSubmitWithNick(nick) {
      if (!nick || pbPendingSubmit || state.score <= 0 || !shell.gameId) return;
      pbPendingSubmit = true; pbSetRank('loading');
      const r = await GamesShell.Leaderboard.submit({
        gameId: shell.gameId,
        nick, score: state.score,
        durationMs: Math.max(3000, Date.now() - (state.startedAt || Date.now())),
        clientNonce: state.runNonce,
        did: GamesShell.Identity.getDeviceId(),
        extra: Object.assign({ bumperHits: state.bumperHits }, (shell.extraSubmit && shell.extraSubmit(state, game)) || {}),
      });
      if (r && r.ok) { pbSetRank('success', { rank: r.rank, total: r.total }); if (pbLbWidget) pbLbWidget.refresh(); return; }
      pbPendingSubmit = false;
      if (r && r.reason === 'nick_taken') {
        GamesShell.Identity.clearNick();
        alert('「' + nick + '」已被别的玩家占用，请换一个昵称');
        pbSetRank('pending'); if (pbNickPrompt) { pbNickPrompt.refresh(); pbNickPrompt.show(); } return;
      }
      pbSetRank('failed');
      if (r && r.reason) console.warn('[pinball] submit rejected:', r.reason);
    }

    function pbTryAutoSubmit() {
      if (!window.GamesShell || !shell.gameId) return;
      if (state.score <= 0) { pbSetRank('hidden'); return; }
      const nick = GamesShell.Identity.getNick();
      if (nick) pbSubmitWithNick(nick);
      else { pbSetRank('pending'); pbNickPrompt && pbNickPrompt.show(); }
    }

    function initShell() {
      if (!window.GamesShell || !shell.gameId) return;
      pbLbWidget = GamesShell.Leaderboard.mount({
        container: shell.lbMount,
        gameId: shell.gameId,
        title: shell.lbTitle || ('🏆 ' + (shell.title || '弹珠机') + ' 排行榜'),
        scoreFormatter: v => Number(v).toLocaleString(),
        getCurrentNick: () => GamesShell.Identity.getNick(),
      });
      if (shell.commentsMount) {
        GamesShell.Comments.mount({
          container: shell.commentsMount,
          path: shell.commentsPath,
          title: shell.commentsTitle || '💬 玩家交流',
          intro: shell.commentsIntro || '聊聊你的心得 ~',
          placeholder: shell.commentsPlaceholder || '聊聊心得 ~',
        });
      }
      pbNickPrompt = GamesShell.NickPrompt.mount({
        container: shell.nickMount,
        prompt: '想上排行榜？起个昵称吧',
        onSubmit: nick => pbSubmitWithNick(nick),
        onSkip: () => pbSetRank('hidden'),
      });
      if (GamesShell.Settlement && shell.settleBtnMount) {
        pbSettleBtn = GamesShell.Settlement.mountButton({
          container: shell.settleBtnMount,
          gameId: shell.gameId,
          getOpts: () => ({
            kind: 'single',
            gameId: shell.gameId,
            title: shell.title || '弹珠机',
            emoji: shell.emoji || '🎱',
            nick: GamesShell.Identity.getNick(),
            score: state.score,
            scoreLabel: '本 局 得 分',
            scoreFormatter: v => Number(v).toLocaleString(),
            rankInfo: pbLastRankInfo || {},
            stats: (shell.statsBuilder && shell.statsBuilder(state, game)) || [
              { label: '撞柱次数', value: state.bumperHits },
              { label: '历史最高', value: Number(state.best || 0).toLocaleString() },
            ],
            paintBoard: (ctx, x, y, w, h) => {
              if (shell.paintBoardSnapshot) shell.paintBoardSnapshot(ctx, x, y, w, h, game);
              else paintDefaultSnapshot(ctx, x, y, w, h);
            },
            boardAspect: W / H,
            watermark: shell.watermark || 'zirconeey.github.io/toolbox/pinball',
          }),
          startDisabled: true,
        });
      }
    }

    function paintDefaultSnapshot(ctx, x, y, w, h) {
      const sx = w / W, sy = h / H;
      ctx.save();
      ctx.translate(x, y); ctx.scale(sx, sy);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2c2540'); g.addColorStop(1, '#181828');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      env.walls.forEach(w => { ctx.beginPath(); ctx.moveTo(w.ax, w.ay); ctx.lineTo(w.bx, w.by); ctx.stroke(); });
      env.bumpers.forEach(b => {
        ctx.fillStyle = b.color || '#3a6ea5';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      });
      flippers.forEach(f => drawFlipper(ctx, { pivot: f.pivot, angle: f.restAngle, length: f.length, thick: f.thick, side: f.side, color: f.color }));
      ctx.restore();
    }

    // ───────── game controller 暴露 ─────────
    const game = {
      W, H, state, env, flippers, plunger, plg, phys,
      cfg,
      addBall(x, y, vx, vy) {
        const b = makeBall(x, y, vx, vy, false);
        state.balls.push(b);
        return b;
      },
      removeBall(id) {
        const i = state.balls.findIndex(b => b.id === id);
        if (i >= 0) state.balls.splice(i, 1);
      },
      addScore, addPopup, persist,
      setGoal,
      startFresh, togglePause,
      // 状态机辅助
      setMultiplier(m) { state.multiplier = m; },
      // 桌台用：定时器（基于 performance.now）
      timers: [],
      after(ms, cb) {
        const due = performance.now() + ms;
        this.timers.push({ due, cb });
      },
      _tickTimers(now) {
        for (let i = this.timers.length - 1; i >= 0; i--) {
          if (now >= this.timers[i].due) { const fn = this.timers[i].cb; this.timers.splice(i, 1); try { fn(); } catch (e) { console.error(e); } }
        }
      },
      // 让 hooks 能拿到 helpers
      utils: { deg, clamp, mixHex, lightenHex, darkenHex, closestPointOnSeg, dist },
    };

    // 初始化
    rebuildEnv();
    initShell();
    startFresh();
    state.rafId = requestAnimationFrame(step);

    return game;
  }

  // 导出
  window.PinballCore = {
    createGame,
    utils: { deg, clamp, mixHex, lightenHex, darkenHex, closestPointOnSeg, dist },
  };

})(window);
