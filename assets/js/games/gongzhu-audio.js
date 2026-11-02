/* 拱猪 · 声音（window.GongzhuAudio）
 * 两条轨道，各自开关、记在本机：
 *   音效：全部 Web Audio 现场合成（发牌、落牌、收牌、放牌、翻分、明牌、猪哼、羊叫、变压器、烟花、对撞……），没有素材文件；
 *   音乐：现场生成的小曲——五声音阶拨弦旋律 + 低音 + 木鱼，按「两小节动机 → 重复 → 变化 → 回到动机」写句子，
 *         听着像一支曲子而不是乱弹；默认关（同掼蛋 D1），声音按钮里打开。
 * 特效响的时候音乐自动压低。浏览器要先有一次点按才能出声：第一次点按时才建 AudioContext。
 * 每个音效都是 SFX[name](audio, t, dest)：音频上下文、开始时刻（秒）、接到哪——正式播放接音效总线，
 * 自测时可以接进 OfflineAudioContext 渲染出来量响度。 */
(function () {
  'use strict';
  const KEY = 'gongzhu.audio.v1';
  const hasDom = typeof document !== 'undefined';
  const prefs = (() => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { /* 无痕模式 */ }
    return { sfx: !s || s.sfx !== false, music: !!(s && s.music) };
  })();
  function savePrefs() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) { /* 不存也能用 */ } }

  const MUSIC_LEVEL = 0.18;
  let ctx = null;
  let bus = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
    // 总线后面压一个限幅器：几朵烟花叠在一起也不会爆音
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    const make = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(comp); return g; };
    bus = { sfx: make(0.75), music: make(MUSIC_LEVEL) };
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ───── 积木 ───── */
  const noiseCache = new WeakMap();
  function noise(a) {
    let b = noiseCache.get(a);
    if (b) return b;
    const n = Math.floor(a.sampleRate * 1.5);
    b = a.createBuffer(1, n, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(a, b);
    return b;
  }
  // 一段滤波噪声：纸牌「啪」、风声、烟、爆炸都由它拼出来。to = 滤波频率滑到哪
  function nz(a, dest, t, o) {
    const src = a.createBufferSource();
    src.buffer = noise(a);
    const f = a.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    f.Q.value = o.q == null ? 1 : o.q;
    const g = a.createGain();
    const atk = o.attack || 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.8); src.stop(t + o.dur + 0.05);
  }
  // 一个音：可以滑音（to）、可以颤音（vib = [速度 Hz, 深度 Hz]）
  function tone(a, dest, t, o) {
    const osc = a.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || o.dur));
    if (o.vib) {
      const lfo = a.createOscillator(), depth = a.createGain();
      lfo.frequency.value = o.vib[0]; depth.gain.value = o.vib[1];
      lfo.connect(depth); depth.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + o.dur + 0.05);
    }
    const g = a.createGain();
    const atk = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain, t + atk);
    if (o.hold) g.gain.setValueAtTime(o.gain, t + atk + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let out = g;
    if (o.lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.lpq || 0.7; g.connect(f); out = f; }
    osc.connect(g); out.connect(dest);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  // 拨弦（音乐和几处音效共用）：三角波 + 一点倍频泛音，过一个慢慢合上的低通——像琵琶 / 柳琴那样「叮」一下
  function pluck(a, dest, t, freq, gain, len) {
    const L = len || 1.6;
    const osc = a.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t);
    const over = a.createOscillator(); over.type = 'sine'; over.frequency.setValueAtTime(freq * 2.005, t);
    const og = a.createGain(); og.gain.value = 0.3;
    const f = a.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.min(9000, freq * 7), t); f.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.3), t + L * 0.7);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + L);
    osc.connect(f); over.connect(og); og.connect(f); f.connect(g); g.connect(dest);
    osc.start(t); over.start(t); osc.stop(t + L + 0.05); over.stop(t + L + 0.05);
  }
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ───── 音效 ───── */
  const SFX = {
    // 发牌：一串洗牌的沙沙声
    deal(a, t, d) {
      for (let i = 0; i < 16; i++) nz(a, d, t + i * 0.042 + Math.random() * 0.012, { dur: 0.03, gain: 0.12 + Math.random() * 0.06, freq: 3000 + Math.random() * 1600, q: 1.1 });
    },
    // 落牌：纸面一「啪」+ 桌面低低一「嗒」，每次略有不同
    play(a, t, d) {
      nz(a, d, t, { dur: 0.05 + Math.random() * 0.02, gain: 0.42, freq: 2100 + Math.random() * 900, q: 0.8 });
      tone(a, d, t, { freq: 160, to: 92, dur: 0.08, gain: 0.32 });
    },
    // 点选一张牌：很轻的一「嗒」
    pick(a, t, d) { nz(a, d, t, { dur: 0.025, gain: 0.12, freq: 3800, q: 1.4 }); },
    // 不能出：闷闷一声
    nope(a, t, d) { tone(a, d, t, { freq: 230, to: 170, dur: 0.13, gain: 0.12, type: 'triangle' }); },
    // 轮到我：两个轻音
    turn(a, t, d) {
      pluck(a, d, t, midi(76), 0.12, 0.6);
      pluck(a, d, t + 0.1, midi(79), 0.11, 0.8);
    },
    // 倒计时最后几秒：木鱼「笃」
    tick(a, t, d) { tone(a, d, t, { freq: 1150, to: 900, dur: 0.06, gain: 0.1, type: 'triangle' }); },
    // 明牌：一枚印章按下去
    stamp(a, t, d) {
      tone(a, d, t, { freq: 120, to: 60, dur: 0.16, gain: 0.4 });
      nz(a, d, t, { dur: 0.07, gain: 0.25, type: 'lowpass', freq: 900, q: 0.6 });
      nz(a, d, t + 0.01, { dur: 0.05, gain: 0.08, freq: 3200, q: 1.2 });
    },
    // 收牌：四张牌一拢（纸面擦过）→ 呼地钻进头像
    sweep(a, t, d, ms) {
      const T = (ms || 900) / 1000;
      nz(a, d, t, { dur: 0.09, gain: 0.12, freq: 2600, q: 0.9 });
      nz(a, d, t + T * 0.36, { dur: T * 0.5, gain: 0.2, freq: 700, to: 2600, q: 1.6, attack: T * 0.3 });
    },
    // 头像「咽」一下：卡通的「咕」
    gulp(a, t, d) {
      tone(a, d, t, { freq: 420, to: 150, dur: 0.14, gain: 0.16, type: 'sine', glide: 0.1 });
      tone(a, d, t + 0.02, { freq: 840, to: 300, dur: 0.08, gain: 0.04, type: 'triangle' });
    },
    // 分牌插进吃牌区：轻轻一「嗒」
    tuck(a, t, d) {
      nz(a, d, t, { dur: 0.04, gain: 0.2, freq: 2600, q: 1 });
      tone(a, d, t, { freq: 240, to: 150, dur: 0.06, gain: 0.14 });
    },
    // 翻分：涨分往上一串、扣分往下一串
    up(a, t, d) { [72, 76, 79].forEach((m, i) => pluck(a, d, t + i * 0.07, midi(m), 0.09, 0.7)); },
    down(a, t, d) { [67, 64, 60].forEach((m, i) => pluck(a, d, t + i * 0.08, midi(m), 0.09, 0.7)); },
    // 猪：两声卡通「哼哼」——粗糙的锯齿波过共鸣峰，音高一抖一抖；外加鼻子喷气
    pig(a, t, d) {
      [0, 0.26].forEach((dt, i) => {
        const at = t + dt;
        const osc = a.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(i ? 150 : 132, at); osc.frequency.linearRampToValueAtTime(i ? 118 : 104, at + 0.2);
        const lfo = a.createOscillator(), dep = a.createGain();
        lfo.frequency.value = 34; dep.gain.value = 26; lfo.connect(dep); dep.connect(osc.frequency);
        const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 620; f1.Q.value = 2.6;
        const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1350; f2.Q.value = 4;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.9, at + 0.02);
        g.gain.setValueAtTime(0.9, at + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        const mix = a.createGain(); mix.gain.value = 0.55;
        osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g); g.connect(mix); mix.connect(d);
        osc.start(at); lfo.start(at); osc.stop(at + 0.26); lfo.stop(at + 0.26);
        nz(a, d, at, { dur: 0.12, gain: 0.08, freq: 900, q: 2 });
      });
      // 猪刨地两下
      [0.62, 0.78].forEach((dt) => nz(a, d, t + dt, { dur: 0.06, gain: 0.12, type: 'lowpass', freq: 600, q: 0.7 }));
    },
    // 羊：一声「咩——」（锯齿波 + 两个共鸣峰 + 一抖一抖的音量），然后蹦两下
    sheep(a, t, d) {
      const osc = a.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, t); osc.frequency.linearRampToValueAtTime(390, t + 0.12); osc.frequency.linearRampToValueAtTime(330, t + 0.7);
      const trem = a.createOscillator(), tg = a.createGain();
      trem.frequency.value = 9; tg.gain.value = 0.45;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
      g.gain.setValueAtTime(0.5, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      const am = a.createGain(); am.gain.value = 0.6;
      trem.connect(tg); tg.connect(am.gain);
      const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 900; f1.Q.value = 3.5;
      const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2300; f2.Q.value = 6;
      const f2g = a.createGain(); f2g.gain.value = 0.6;
      osc.connect(f1); osc.connect(f2); f2.connect(f2g); f1.connect(am); f2g.connect(am); am.connect(g); g.connect(d);
      osc.start(t); trem.start(t); osc.stop(t + 0.8); trem.stop(t + 0.8);
      [0.72, 0.98].forEach((dt, i) => tone(a, d, t + dt, { freq: 330 + i * 60, to: 620 + i * 80, dur: 0.12, gain: 0.08, type: 'triangle', glide: 0.08 }));
    },
    // 变压器：金币「叮——叮」，带金属泛音
    doubler(a, t, d) {
      [[1568, 0], [2093, 0.13]].forEach(([f, dt]) => {
        [1, 2.76, 5.4].forEach((k, i) => tone(a, d, t + dt, { freq: f * k, dur: 0.9 - i * 0.25, gain: [0.12, 0.04, 0.02][i], type: i ? 'sine' : 'triangle' }));
      });
      for (let i = 0; i < 6; i++) tone(a, d, t + 0.25 + i * 0.05, { freq: 2600 + Math.random() * 1800, dur: 0.15, gain: 0.025 });
    },
    // 全红：大红心「怦、怦」
    heartbeat(a, t, d) {
      [0, 0.2].forEach((dt, i) => {
        tone(a, d, t + dt, { freq: 78, to: 52, dur: 0.22, gain: i ? 0.45 : 0.55 });
        nz(a, d, t + dt, { dur: 0.06, gain: 0.1, type: 'lowpass', freq: 300, q: 0.7 });
      });
    },
    // 大满贯：金冠落下——一记低鼓 + 五声音阶往上一串、再一个和弦
    slam(a, t, d) {
      tone(a, d, t, { freq: 98, to: 55, dur: 0.5, gain: 0.5 });
      nz(a, d, t, { dur: 0.3, gain: 0.2, type: 'lowpass', freq: 700, q: 0.6 });
      [60, 62, 64, 67, 69, 72, 76, 79].forEach((m, i) => pluck(a, d, t + 0.12 + i * 0.06, midi(m), 0.11, 0.9));
      [72, 76, 79, 84].forEach((m) => pluck(a, d, t + 0.7, midi(m), 0.09, 2.2));
    },
    // 烟花：「嘭」一下，再细碎地噼啪；size 0..1 跟粒子数走
    pop(a, t, d, size) {
      const k = Math.max(0.3, Math.min(1, size == null ? 0.6 : size));
      nz(a, d, t, { dur: 0.09, gain: 0.32 * k, type: 'highpass', freq: 900, q: 0.7 });
      tone(a, d, t, { freq: 520, to: 140, dur: 0.12, gain: 0.18 * k, glide: 0.1 });
      const n = Math.round(4 + 8 * k);
      for (let i = 0; i < n; i++) {
        nz(a, d, t + 0.08 + Math.random() * (0.25 + 0.35 * k), { dur: 0.015 + Math.random() * 0.02, gain: 0.05 + Math.random() * 0.07 * k, freq: 2500 + Math.random() * 4000, q: 2 });
      }
    },
    // 对撞前蓄力冲锋：风声越来越尖
    charge(a, t, d, ms) {
      const T = (ms || 300) / 1000;
      nz(a, d, t, { dur: T + 0.05, gain: 0.32, freq: 400, to: 3200, q: 2.2, attack: T * 0.8 });
      tone(a, d, t, { freq: 180, to: 520, dur: T + 0.04, gain: 0.05, type: 'triangle', attack: T * 0.7 });
    },
    // 撞上：一声闷雷般的「轰」+ 冲击的噪声 + 烟团嘶嘶
    boom(a, t, d, big) {
      const k = big ? 1.25 : 1;
      tone(a, d, t, { freq: 130, to: 34, dur: 1.0 * k, gain: 0.55, glide: 0.6 });
      tone(a, d, t, { freq: 70, to: 30, dur: 1.2 * k, gain: 0.35, type: 'triangle' });
      nz(a, d, t, { dur: 0.7 * k, gain: 0.4, type: 'lowpass', freq: 2200, to: 200, q: 0.5 });
      nz(a, d, t + 0.02, { dur: 0.08, gain: 0.3, type: 'highpass', freq: 2500, q: 0.7 });
      nz(a, d, t + 0.15, { dur: 1.1 * k, gain: 0.06, freq: 1800, to: 900, q: 0.6, attack: 0.25 });   // 烟
    },
    // 爆炸中央冒出巨大的花色：一记锣「咚——」（不和谐泛音，长尾）
    gong(a, t, d, suit) {
      const base = [92, 0, 123, 110][suit] || 98;
      [1, 2.32, 3.85, 5.17].forEach((k, i) => tone(a, d, t, { freq: base * k, to: base * k * 0.985, dur: 1.8 - i * 0.3, gain: [0.32, 0.12, 0.07, 0.04][i], attack: 0.006 }));
      nz(a, d, t, { dur: 0.05, gain: 0.12, type: 'lowpass', freq: 1200, q: 0.7 });
    },
    // 三张一起：大花色炸碎——玻璃般的碎响
    shatter(a, t, d) {
      for (let i = 0; i < 14; i++) tone(a, d, t + Math.random() * 0.25, { freq: 2200 + Math.random() * 3500, dur: 0.08 + Math.random() * 0.15, gain: 0.03 + Math.random() * 0.03, type: 'triangle' });
      nz(a, d, t, { dur: 0.3, gain: 0.12, type: 'highpass', freq: 3500, q: 0.7 });
    },
    // 一局结束：我赢了分 / 扣了分 / 持平
    win(a, t, d) { [67, 72, 76, 79, 84].forEach((m, i) => pluck(a, d, t + i * 0.09, midi(m), 0.1, 1.2)); },
    lose(a, t, d) {
      tone(a, d, t, { freq: midi(67), to: midi(64), dur: 0.35, gain: 0.1, type: 'triangle', glide: 0.3 });
      tone(a, d, t + 0.32, { freq: midi(62), to: midi(55), dur: 0.6, gain: 0.1, type: 'triangle', glide: 0.5 });
    },
    even(a, t, d) { pluck(a, d, t, midi(72), 0.09, 0.8); pluck(a, d, t + 0.12, midi(72), 0.07, 0.8); },
  };

  /* 播一个音效：delay 毫秒后（用音频时钟排，比 setTimeout 准，跟动画对得上）。arg 透传给音效（时长、大小、花色） */
  function sfx(name, delay, arg) {
    if (!prefs.sfx || !SFX[name]) return;
    if (!ctx || ctx.state !== 'running') { if (ctx) ctx.resume(); return; }   // 还没解锁：这一声就算了，不攒着
    if (hasDom && document.hidden) return;
    try { SFX[name](ctx, ctx.currentTime + 0.01 + (delay || 0) / 1000, bus.sfx, arg); } catch (_) { /* 声音坏了也不影响打牌 */ }
  }

  // 大特效时把音乐压低一阵
  function duck(ms) {
    if (!bus || !ctx) return;
    const g = bus.music.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(MUSIC_LEVEL * 0.35, t, 0.06);
    g.setTargetAtTime(MUSIC_LEVEL, t + ms / 1000, 0.4);
  }

  /* ───── 背景音乐：生成式小曲 ─────
   * 92 拍 / 分，四四拍，按八分音符排。和声四小节一轮：C – Am – F – G。
   * 旋律只用五声音阶（宫商角徵羽：C D E G A），强拍落在和弦音上，弱拍一步一步走；
   * 一段八小节 = 动机 A、A 的变化、新动机 B、A 收在主音上；每段换新动机，偶尔插两小节只有低音的「喘口气」。 */
  const BPM = 92, E8 = 60 / BPM / 2;
  const PENTA = [];
  for (let m = 62; m <= 86; m++) if ([0, 2, 4, 7, 9].includes(m % 12)) PENTA.push(m);
  const HARM = [
    { bass: [48, 55], tones: [0, 4, 7] },   // C
    { bass: [45, 52], tones: [9, 0, 4] },   // Am
    { bass: [41, 48], tones: [9, 0] },      // F（旋律不用 F，落在 A / C 上）
    { bass: [43, 50], tones: [7, 2] },      // G（旋律不用 B，落在 G / D 上）
  ];
  const RHYTHMS = [
    [1, 0, 1, 0, 1, 1, 1, 0], [1, 1, 1, 0, 1, 0, 0, 0], [1, 0, 0, 1, 1, 0, 1, 0], [1, 0, 1, 1, 1, 0, 1, 0],
    [1, 0, 0, 0, 1, 1, 1, 1], [1, 1, 0, 1, 1, 0, 0, 0], [1, 0, 1, 0, 1, 0, 0, 0], [0, 0, 1, 1, 1, 0, 1, 0],
  ];
  let music = null;   // { timer, next (音频时刻), step (八分音符序号), section: [{rhythm, notes}] × 8 小节 }
  let echo = null;
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  // 一个两小节的动机：节奏 + 每个音在五声音阶里的位置
  function motif(barIdx, start) {
    const bars = [];
    let idx = start;
    for (let b = 0; b < 2; b++) {
      const h = HARM[(barIdx + b) % 4];
      const rhythm = pick(RHYTHMS);
      const notes = rhythm.map((on, k) => {
        if (!on) return null;
        if (k % 4 === 0) {
          // 强拍：挑离上一个音最近的和弦音
          let best = idx, bd = 99;
          PENTA.forEach((m, i) => { if (h.tones.includes(m % 12) && Math.abs(i - idx) < bd && m >= 64 && m <= 84) { bd = Math.abs(i - idx); best = i; } });
          idx = best;
        } else {
          idx = Math.max(2, Math.min(PENTA.length - 3, idx + pick([-2, -1, -1, 1, 1, 2])));
        }
        return idx;
      });
      bars.push({ rhythm, notes });
    }
    return { bars, end: idx };
  }
  // A 的变化：节奏不动，第二小节后半换几个音
  function vary(m) {
    return m.bars.map((bar, b) => ({ rhythm: bar.rhythm, notes: bar.notes.map((n, k) => (n == null || b === 0 || k < 4 ? n : Math.max(2, Math.min(PENTA.length - 3, n + pick([-1, 1, 0])))) ) }));
  }
  // 收尾：最后一个音落到主音 C 上
  function cadence(bars) {
    const out = bars.map((b) => ({ rhythm: b.rhythm.slice(), notes: b.notes.slice() }));
    const last = out[1];
    let k = last.notes.length - 1;
    while (k > 0 && last.notes[k] == null) k--;
    const cs = PENTA.map((m, i) => [m, i]).filter(([m]) => m % 12 === 0 && m >= 67);
    const prev = last.notes[k] == null ? 8 : last.notes[k];
    last.notes[k] = cs.reduce((a, b) => (Math.abs(b[1] - prev) < Math.abs(a[1] - prev) ? b : a))[1];
    return out;
  }
  function newSection() {
    const A = motif(0, 7 + ((Math.random() * 4) | 0));
    const B = motif(0, A.end);
    const sec = [...A.bars, ...vary(A), ...B.bars, ...cadence(A.bars)];
    // 偶尔先空两小节，只留低音和木鱼
    if (Math.random() < 0.3) return [{ rest: true }, { rest: true }].concat(sec.slice(0, 6));
    return sec;
  }
  function makeEcho(a, dest) {
    const e = a.createDelay(1.0);
    e.delayTime.value = E8 * 3;
    const fb = a.createGain(); fb.gain.value = 0.28;
    const wet = a.createGain(); wet.gain.value = 0.35;
    e.connect(fb); fb.connect(e); e.connect(wet); wet.connect(dest);
    return e;
  }
  // 把乐谱排到 horizon（音频时刻）为止；st = { step, next, section, sectionAt }
  function scheduleMusic(a, mel, wet, st, horizon) {
    while (st.next < horizon) {
      const s = st.step, bar = (s >> 3), k = s & 7;
      if (bar % 8 === 0 && k === 0 && bar !== st.sectionAt) { st.section = newSection(); st.sectionAt = bar; }
      const t = st.next;
      const h = HARM[bar % 4];
      const cur = st.section[bar % 8];
      // 低音：一拍和三拍，根音 / 五音
      if (k === 0) tone(a, mel, t, { freq: midi(h.bass[0]), dur: E8 * 3.6, gain: 0.32, type: 'triangle', lp: 700 });
      if (k === 4) tone(a, mel, t, { freq: midi(h.bass[1]), dur: E8 * 3.2, gain: 0.24, type: 'triangle', lp: 700 });
      // 木鱼：二拍、四拍轻轻一下，偶尔加花
      if (k === 2 || k === 6 || (k === 7 && Math.random() < 0.18)) tone(a, mel, t, { freq: k === 6 ? 980 : 1180, to: 760, dur: 0.07, gain: k === 7 ? 0.05 : 0.08, type: 'triangle' });
      // 沙锤：八分音符，很轻，正拍略重
      nz(a, mel, t, { dur: 0.04, gain: k % 2 ? 0.02 : 0.035, type: 'highpass', freq: 6000, q: 0.7 });
      // 旋律
      if (cur && !cur.rest && cur.rhythm[k]) {
        let len = 1;
        while (k + len < 8 && !cur.rhythm[k + len]) len++;
        const dest = a.createGain(); dest.connect(mel); dest.connect(wet);
        pluck(a, dest, t, midi(PENTA[cur.notes[k]]), k % 4 === 0 ? 0.42 : 0.32, Math.min(1.8, E8 * len + 0.5));
      }
      st.next += E8;
      st.step++;
    }
  }
  function musicTick() {
    if (!music || !ctx) return;
    if (hasDom && document.hidden) { music.next = ctx.currentTime + 0.2; return; }
    if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
    if (!echo) echo = makeEcho(ctx, bus.music);
    scheduleMusic(ctx, bus.music, echo, music, ctx.currentTime + 0.4);
  }
  // 自测 / 试听：离线渲染 sec 秒音乐（音量同正式播放）
  function renderMusic(sec) {
    const a = new OfflineAudioContext(1, Math.ceil(44100 * sec), 44100);
    const mel = a.createGain(); mel.gain.value = MUSIC_LEVEL; mel.connect(a.destination);
    scheduleMusic(a, mel, makeEcho(a, mel), { step: 0, next: 0.05, section: null, sectionAt: -1 }, sec - 2);
    return a.startRendering();
  }
  function startMusic() {
    if (music || !prefs.music || !ensure()) return;
    music = { step: 0, next: ctx.currentTime + 0.15, section: null, sectionAt: -1, timer: setInterval(musicTick, 120) };
    bus.music.gain.cancelScheduledValues(ctx.currentTime);
    bus.music.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.music.gain.exponentialRampToValueAtTime(MUSIC_LEVEL, ctx.currentTime + 1.5);
    musicTick();
  }
  function stopMusic() {
    if (!music) return;
    clearInterval(music.timer);
    music = null;
    if (bus) { const g = bus.music.gain; g.cancelScheduledValues(ctx.currentTime); g.setTargetAtTime(0.0001, ctx.currentTime, 0.15); setTimeout(() => { if (!music && bus) g.value = MUSIC_LEVEL; }, 900); }
  }

  /* ───── 开关 ───── */
  function set(key, on) {
    prefs[key] = !!on;
    savePrefs();
    ensure();
    if (key === 'music') { if (on) startMusic(); else stopMusic(); }
    if (key === 'sfx' && on) sfx('turn');
  }

  // 浏览器要先有一次点按才能出声
  if (hasDom) {
    const unlock = () => {
      if (!prefs.sfx && !prefs.music) return;
      if (!ensure()) return;
      if (prefs.music) startMusic();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  window.GongzhuAudio = { sfx, duck, set, prefs: () => Object.assign({}, prefs), SFX, renderMusic };
})();
