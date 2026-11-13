/* 猫咪炸毛 · 声音（window.ZhamaoAudio）
 * 两条轨道，各自开关、记在本机（zhamao.audio.v1）：
 *   音效：全部 Web Audio 现场合成（出牌、摸牌、喵、炸毛、哄好、洗牌……），没有素材文件；
 *   音乐：四版编曲 + 按牌局换版（见 zhamao-music.js），默认开，第一次点按页面后响起。
 * 浏览器要先有一次点按才能出声：第一次点按时才建 AudioContext，iPhone 上顺手放一段空白声解锁。
 * 每个音效都是 SFX[name](audio, t, dest)，可以接进 OfflineAudioContext 离线渲染自测。 */
(function () {
  'use strict';
  const KEY = 'zhamao.audio.v1';
  const hasDom = typeof document !== 'undefined';
  const prefs = (() => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { /* 无痕 */ }
    return { sfx: !s || s.sfx !== false, music: !s || s.music !== false };
  })();
  const savePrefs = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) { /* */ } };

  let ctx = null, bus = null;
  const MUSIC_LEVEL = 0.32;  // 音乐总线（编曲内部的混音在 zhamao-music.js；和试听页的听感对齐，再比音效低一点）
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try { ctx = window.__zmCtx || new (window.AudioContext || window.webkitAudioContext)(); window.__zmCtx = ctx; } catch (_) { return null; }   // 页面开头那段可能已经建好、解锁了
    // 音效、音乐各走各的压缩器：以前共用一个，底鼓 / 音效一响整首音乐跟着被压扁（用户 2026-11-12 嫌对局里音乐「闷」）
    const compOf = (th, ratio) => { const c = ctx.createDynamicsCompressor(); c.threshold.value = th; c.knee.value = 6; c.ratio.value = ratio; c.attack.value = 0.004; c.release.value = 0.2; c.connect(ctx.destination); return c; };
    const sfxComp = compOf(-10, 8), musicComp = compOf(-14, 6);
    const make = (v, to) => { const g = ctx.createGain(); g.gain.value = v; g.connect(to); return g; };
    bus = { sfx: make(0.7, sfxComp), music: make(MUSIC_LEVEL, musicComp) };
    return ctx;
  }

  /* ───── 积木 ───── */
  const noiseCache = new WeakMap();
  function noise(a) {
    let b = noiseCache.get(a);
    if (b) return b;
    const n = Math.floor(a.sampleRate * 1.2);
    b = a.createBuffer(1, n, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(a, b);
    return b;
  }
  function nz(a, dest, t, o) {
    const src = a.createBufferSource(); src.buffer = noise(a);
    const f = a.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    f.Q.value = o.q == null ? 1 : o.q;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + o.dur + 0.05);
  }
  function tone(a, dest, t, o) {
    const osc = a.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || o.dur));
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  /* 合成一声「喵」：带共振峰的锯齿，音高先升后降 */
  function meow(a, dest, t, o) {
    o = o || {};
    const base = o.f || 520, dur = o.dur || 0.42, gain = o.gain || 0.22;
    const osc = a.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * 0.8, t);
    osc.frequency.linearRampToValueAtTime(base * 1.25, t + dur * 0.35);
    osc.frequency.exponentialRampToValueAtTime(base * (o.end || 0.7), t + dur);
    const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6;
    f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(1500, t + dur * 0.4); f1.frequency.linearRampToValueAtTime(900, t + dur);
    const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 8;
    f2.frequency.setValueAtTime(2400, t); f2.frequency.linearRampToValueAtTime(3000, t + dur * 0.4);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.05);
    g.gain.setValueAtTime(gain, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = a.createGain(); g2.gain.value = 0.5;
    osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  const card = (a, d, t, g) => nz(a, d, t, { freq: 2600, to: 1200, q: 0.9, gain: g || 0.35, dur: 0.07 });

  const SFX = {
    tap: (a, t, d) => tone(a, d, t, { f: 880, gain: 0.08, dur: 0.06, type: 'triangle' }),
    play: (a, t, d) => { card(a, d, t, 0.4); tone(a, d, t + 0.01, { f: 330, to: 220, gain: 0.12, dur: 0.12, type: 'triangle' }); },
    draw: (a, t, d) => { nz(a, d, t, { freq: 1800, to: 3200, q: 0.8, gain: 0.25, dur: 0.12 }); },
    turn: (a, t, d) => { tone(a, d, t, { f: 988, gain: 0.1, dur: 0.18 }); tone(a, d, t + 0.09, { f: 1319, gain: 0.08, dur: 0.24 }); },
    ask: (a, t, d) => { tone(a, d, t, { f: 660, to: 880, gain: 0.08, dur: 0.16, type: 'triangle' }); },
    nope: (a, t, d) => { meow(a, d, t, { f: 600, dur: 0.36, end: 0.55, gain: 0.24 }); card(a, d, t + 0.02, 0.3); },
    cancel: (a, t, d) => { tone(a, d, t, { f: 300, to: 180, gain: 0.16, dur: 0.22, type: 'square' }); nz(a, d, t, { freq: 600, q: 2, gain: 0.12, dur: 0.12 }); },
    attack: (a, t, d) => { nz(a, d, t, { freq: 400, to: 1400, q: 1.2, gain: 0.3, dur: 0.28 }); tone(a, d, t + 0.18, { f: 196, gain: 0.25, dur: 0.35, type: 'triangle' }); },
    shuffle: (a, t, d) => { for (let i = 0; i < 8; i++) card(a, d, t + i * 0.055 + Math.random() * 0.02, 0.18); },
    peek: (a, t, d) => { tone(a, d, t, { f: 1046, gain: 0.07, dur: 0.3 }); tone(a, d, t + 0.08, { f: 1568, gain: 0.05, dur: 0.4 }); },
    steal: (a, t, d) => { nz(a, d, t, { freq: 3000, to: 900, q: 1, gain: 0.22, dur: 0.18 }); tone(a, d, t + 0.05, { f: 740, to: 1100, gain: 0.06, dur: 0.12, type: 'triangle' }); },
    miss: (a, t, d) => { tone(a, d, t, { f: 392, gain: 0.12, dur: 0.16, type: 'triangle' }); tone(a, d, t + 0.16, { f: 311, gain: 0.12, dur: 0.3, type: 'triangle' }); },
    boom: (a, t, d) => {
      nz(a, d, t, { type: 'lowpass', freq: 1800, to: 120, q: 0.7, gain: 0.9, dur: 0.7 });
      tone(a, d, t, { f: 110, to: 40, gain: 0.6, dur: 0.6 });
      // 炸毛的「嘶——」
      nz(a, d, t + 0.05, { type: 'highpass', freq: 3500, q: 0.5, gain: 0.22, dur: 0.6, attack: 0.04 });
    },
    defuse: (a, t, d) => { meow(a, d, t, { f: 760, dur: 0.32, end: 1.0, gain: 0.18 }); tone(a, d, t + 0.25, { f: 1175, gain: 0.07, dur: 0.25 }); tone(a, d, t + 0.33, { f: 1568, gain: 0.06, dur: 0.3 }); },
    insert: (a, t, d) => { card(a, d, t, 0.3); card(a, d, t + 0.07, 0.2); },
    out: (a, t, d) => { meow(a, d, t, { f: 420, dur: 0.6, end: 0.45, gain: 0.22 }); },
    // ── 动画配套的音效 ──
    untap: (a, t, d) => tone(a, d, t, { f: 660, gain: 0.06, dur: 0.05, type: 'triangle' }),
    combo: (a, t, d) => { tone(a, d, t, { f: 988, gain: 0.07, dur: 0.12, type: 'triangle' }); tone(a, d, t + 0.06, { f: 1319, gain: 0.07, dur: 0.18, type: 'triangle' }); },
    whoosh: (a, t, d) => nz(a, d, t, { freq: 700, to: 2600, q: 0.8, gain: 0.16, dur: 0.24, attack: 0.05 }),
    thud: (a, t, d) => { nz(a, d, t, { type: 'lowpass', freq: 900, to: 200, q: 0.7, gain: 0.35, dur: 0.1 }); card(a, d, t, 0.22); },
    slam: (a, t, d) => { nz(a, d, t, { type: 'lowpass', freq: 1400, to: 120, q: 0.8, gain: 0.6, dur: 0.22 }); tone(a, d, t, { f: 140, to: 60, gain: 0.35, dur: 0.22 }); },
    stamp: (a, t, d) => { nz(a, d, t, { type: 'lowpass', freq: 1000, to: 300, q: 1, gain: 0.4, dur: 0.12 }); tone(a, d, t, { f: 220, to: 120, gain: 0.18, dur: 0.12, type: 'triangle' }); },
    activate: (a, t, d) => { [784, 988, 1175].forEach((f, i) => tone(a, d, t + i * 0.05, { f, gain: 0.06, dur: 0.25, type: 'triangle' })); },
    sweep: (a, t, d) => nz(a, d, t, { freq: 3000, to: 800, q: 0.7, gain: 0.14, dur: 0.3, attack: 0.04 }),
    snore: (a, t, d) => { nz(a, d, t, { freq: 300, to: 500, q: 3, gain: 0.18, dur: 0.6, attack: 0.25 }); tone(a, d, t + 0.7, { f: 880, to: 1320, gain: 0.05, dur: 0.25 }); },
    clang: (a, t, d) => { [523, 1046, 1568, 2093].forEach((f, i) => tone(a, d, t, { f: f * 1.01, gain: 0.12 / (i + 1), dur: 0.8 - i * 0.12, type: 'sine' })); nz(a, d, t, { freq: 4000, q: 1, gain: 0.25, dur: 0.06 }); },
    gasp: (a, t, d) => { tone(a, d, t, { f: 440, to: 220, gain: 0.12, dur: 0.3, type: 'triangle' }); },
    peel: (a, t, d) => nz(a, d, t, { freq: 4000, to: 2000, q: 1.2, gain: 0.12, dur: 0.08 }),
    heartbeat: (a, t, d) => { [0, 0.18].forEach((dt) => tone(a, d, t + dt, { f: 70, to: 45, gain: 0.5, dur: 0.14 })); },
    flip: (a, t, d) => { card(a, d, t, 0.25); tone(a, d, t + 0.02, { f: 1200, to: 1600, gain: 0.04, dur: 0.06, type: 'triangle' }); },
    give: (a, t, d) => { tone(a, d, t, { f: 784, gain: 0.07, dur: 0.2, type: 'triangle' }); tone(a, d, t + 0.1, { f: 1046, gain: 0.07, dur: 0.3, type: 'triangle' }); },
    swipe: (a, t, d) => { nz(a, d, t, { freq: 1200, to: 5000, q: 1.5, gain: 0.25, dur: 0.16, attack: 0.02 }); meow(a, d, t + 0.05, { f: 700, dur: 0.18, end: 1.1, gain: 0.08 }); },
    ding: (a, t, d) => { tone(a, d, t, { f: 1568, gain: 0.1, dur: 0.5 }); tone(a, d, t, { f: 2093, gain: 0.05, dur: 0.4 }); },
    fan: (a, t, d) => { for (let i = 0; i < 4; i++) card(a, d, t + i * 0.035, 0.15); },
    hiss: (a, t, d) => nz(a, d, t, { type: 'highpass', freq: 3200, q: 0.5, gain: 0.16, dur: 0.4, attack: 0.03 }),
    deal: (a, t, d) => card(a, d, t, 0.2),
    tick: (a, t, d) => tone(a, d, t, { f: 1800, gain: 0.04, dur: 0.03, type: 'square' }),
    kaboom: (a, t, d) => {
      nz(a, d, t, { type: 'lowpass', freq: 2200, to: 80, q: 0.7, gain: 1, dur: 1.1 });
      tone(a, d, t, { f: 90, to: 30, gain: 0.7, dur: 0.9 });
      nz(a, d, t + 0.1, { type: 'highpass', freq: 3000, q: 0.5, gain: 0.25, dur: 0.9, attack: 0.05 });
      meow(a, d, t + 0.25, { f: 380, dur: 0.7, end: 0.4, gain: 0.18 });
    },
    win: (a, t, d) => { [523, 659, 784, 1046].forEach((f, i) => tone(a, d, t + i * 0.11, { f, gain: 0.12, dur: 0.35, type: 'triangle' })); },
    lose: (a, t, d) => { [440, 392, 349, 262].forEach((f, i) => tone(a, d, t + i * 0.16, { f, gain: 0.11, dur: 0.4, type: 'triangle' })); },
  };

  function sfx(name, delay) {
    if (!prefs.sfx || !SFX[name]) return;
    const a = ensure();
    if (!a) return;
    try { SFX[name](a, a.currentTime + (delay || 0) / 1000 + 0.005, bus.sfx); } catch (_) { /* 某些浏览器不支持的节点就算了 */ }
    if (DUCK[name]) duck(DUCK[name]);
  }
  // 只有大动静才把音乐压一下（压到七成）；以前每个音效都压到一半以下，点牌、飞牌、每秒的倒计时滴答一直在压，音乐听着发闷
  const DUCK = { boom: 1400, kaboom: 1600, defuse: 700, nope: 500 };
  function duck(ms) {
    if (!ctx || !bus) return;
    const g = bus.music.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_LEVEL * 0.7, t, 0.04);
    g.setTargetAtTime(MUSIC_LEVEL, t + ms / 1000, 0.3);
  }

  /* ───── 音乐：交给 zhamao-music.js（四版编曲 + 什么时候换哪版）；这里只管开关和总线 ───── */
  const M = () => (typeof window !== 'undefined' && window.ZhamaoMusic) || null;
  let wantMusic = false, attached = false;
  function startMusic() {
    if (!prefs.music || !wantMusic || !M()) return;
    const a = ensure();
    if (!a || a.state !== 'running') return;
    if (!attached) { M().connect(a, bus.music, 1); attached = true; }
    M().start();
  }
  function stopMusic() { if (M() && attached) M().stop(); }
  function music(on) {
    wantMusic = !!on;
    if (!wantMusic) { stopMusic(); return; }
    if (ctx && ctx.state === 'suspended') ctx.resume().then(startMusic, () => {}); else startMusic();
  }
  // 场景：'menu'（主页 / 设置 / 大厅，丁）| 'game'（一局开始，甲起）| 'end'（一局结束，淡出）
  function scene(name) { if (M()) M().setScene(name); }
  // 炸毛猫概率（公开信息：牌堆里的炸毛猫数 ÷ 牌堆张数）；有人炸出局
  function danger(p) { if (M()) M().setDanger(p); }
  function knockedOut() { if (M()) M().onOut(); }

  function set(key, on) {
    prefs[key] = !!on;
    savePrefs();
    if (key === 'music') { if (on) { wantMusic = true; startMusic(); } else stopMusic(); }
  }

  // 页面开头那段代码解锁成功（或微信自动解锁）时叫这里：马上接着放
  if (hasDom) window.__zmAudioReady = () => { if (wantMusic && prefs.music) startMusic(); };
  if (hasDom && window.__zmCtx && window.__zmCtx.state === 'running') setTimeout(() => { if (wantMusic && prefs.music) startMusic(); }, 0);

  // 第一次点按：建上下文、iPhone 放空白声解锁，然后按需起音乐
  if (hasDom) {
    const unlock = () => {
      const a = ensure();
      if (!a) return;
      try {
        // 和拱猪一样用「环境音」：跟着静音键走（静音时不出声），也不会上灵动岛 / 锁屏的播放控件
        if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient';
        const b = a.createBuffer(1, 1, 22050), src = a.createBufferSource();
        src.buffer = b; src.connect(a.destination); src.start(0);
      } catch (_) { /* */ }
      const go = () => { if (a.state === 'running') startMusic(); };
      if (a.state === 'suspended') a.resume().then(go, () => {}); else go();
    };
    /* 2026-11-13 用户：侧滑返回滑到一半，同时响两股音乐（这一页的局内音乐 + 上一页的主菜单音乐）。
     * 原因：上一页如果也是本游戏（比如从「返回百宝奇巧」出去又点回来），侧滑时浏览器把它从缓存里「复活」预览，
     * 它收到 visibilitychange（变可见）就自己接着放了。改成：离开的这一页（pagehide）立刻停声；
     * 从缓存复活的那一页（pageshow.persisted）先不出声，等用户真的点一下才恢复（unlock 里会重新起音乐） */
    let dormant = false;
    const wake = () => { if (dormant) { dormant = false; } unlock(); };
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, wake, { passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) { ctx.suspend(); return; }
      if (dormant) return;
      ctx.resume().then(() => { if (!dormant && !document.hidden && wantMusic && prefs.music) startMusic(); });
    });
    window.addEventListener('pagehide', () => { if (ctx) ctx.suspend(); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) { dormant = true; if (ctx) ctx.suspend(); } });
  }

  window.ZhamaoAudio = { sfx, set, music, scene, danger, knockedOut, prefs: () => Object.assign({}, prefs), SFX };
})();
