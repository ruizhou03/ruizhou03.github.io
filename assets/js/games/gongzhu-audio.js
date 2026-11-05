/* 拱猪 · 声音（window.GongzhuAudio）
 * 两条轨道，各自开关、记在本机：
 *   音效：全部 Web Audio 现场合成（发牌、落牌、收牌、放牌、翻分、明牌、猪哼、羊叫、变压器、烟花、对撞……），没有素材文件；
 *   音乐：一支固定的原创小曲（十六小节、主题反复出现、首尾相接无缝循环），三遍一轮琵琶 / 笛子 / 古筝轮流奏主旋律，
 *         默认开（第一次点按页面后响起），声音按钮里可以关。
 * 特效响的时候音乐自动压低。浏览器要先有一次点按才能出声：第一次点按时才建 AudioContext（iPhone 的坑见文末 unlock）。
 * 每个音效都是 SFX[name](audio, t, dest)：音频上下文、开始时刻（秒）、接到哪——正式播放接音效总线，
 * 自测时可以接进 OfflineAudioContext 渲染出来量响度。 */
(function () {
  'use strict';
  const KEY = 'gongzhu.audio.v1';
  const hasDom = typeof document !== 'undefined';
  const prefs = (() => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { /* 无痕模式 */ }
    return { sfx: !s || s.sfx !== false, music: !s || s.music !== false };
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

  /* ───── 背景音乐：一支有记性的小曲 ─────
   * 固定旋律（原创），C 宫五声，126 拍：十六小节 A A' B A''，开头两小节的「主题」出现三次，听两遍就记得住。
   * B 段（9–12）从低处起、切分着往上走，和 A 段的平均八分音符拉开。
   * 第十六小节停在 G 上、直接接回第一小节的 G，循环处没有空拍。
   * 编配（用户从多版试听里挑定「丁3 丙」）：三遍一轮，每遍换人吹主旋律，第二、三遍连一遍里面也分段交接——
   *   第一遍 琵琶 / 琵琶 / 琵琶，第二遍 琵琶 / 笛子 / 古筝，第三遍 古筝 / 琵琶 / 笛子（A 段 / B 段 / 最后四小节）。
   *   笛子不吹主旋律的段落就在上方拉长音衬托；乐句末尾用主题头三个音应一句；每段开头前古筝往上一刮。
   *   底下：低音「咚—嗒」、弱拍短和弦、小鼓一三拍、小镲 + 拍手二四拍、每四小节末一记鼓花（木鱼像节拍器，用户要求去掉）。 */
  const BPM = 126, E8 = 60 / BPM / 2;
  // 每小节 8 个八分音符：音名 = 起音，'-' = 延续，'.' = 休止
  const TUNE = [
    'G4 G4 A4 G4 E4 - D4 -',   // 1  主题
    'E4 G4 A4 C5 A4 - G4 -',   // 2
    'C5 C5 D5 C5 A4 G4 E4 G4', // 3
    'A4 - G4 E4 D4 - - -',     // 4  半终止
    'G4 G4 A4 G4 E4 - D4 -',   // 5  主题
    'E4 G4 A4 C5 A4 - G4 -',   // 6
    'C5 C5 D5 E5 D5 C5 A4 G4', // 7
    'A4 - C5 - C5 - - -',      // 8  落主音
    'A4 - C5 - D5 - . C5',     // 9  B 段：从低处起、长短错开的切分
    'D5 - - E5 G5 - E5 -',     // 10
    'D5 C5 A4 C5 D5 - . .',    // 11
    'G4 - A4 - C5 - D5 -',     // 12 一级一级往上，把人送回主题
    'G4 G4 A4 G4 E4 - D4 -',   // 13 主题
    'E4 G4 A4 C5 A4 - G4 -',   // 14
    'C5 C5 D5 E5 D5 C5 A4 G4', // 15
    'A4 - C5 - D5 - G4 -',     // 16 停在 G 上，接回第 1 小节的 G
  ].map((bar) => bar.split(' '));
  /* 三遍一轮：lead = [A 段, B 段, 最后四小节] 谁奏主旋律（pipa 琵琶 / dizi 笛子 / zheng 古筝）；
   * counter = 哪几段笛子拉长音衬托（笛子自己主奏时不拉，免得两支笛子打架）；answer = 乐句末尾谁应答；
   * pipaDouble = 笛子主奏时琵琶轻轻弹着旋律垫节奏 */
  const PASSES = [
    { lead: ['pipa', 'pipa', 'pipa'], counter: ['A', 'B', 'A2'], answer: 'dizi' },
    { lead: ['pipa', 'dizi', 'zheng'], counter: ['A', 'A2'], answer: 'dizi' },
    { lead: ['zheng', 'pipa', 'dizi'], counter: ['A', 'B'], answer: 'pipa', pipaDouble: true },
  ];
  // 笛子长音衬托：每小节两个半小节长音，取和弦里的音、放在旋律上方
  const COUNTER = { C: [76, 79], Am: [76, 72], F: [81, 77], G: [79, 74] };
  // 每小节的和弦：[低音根音, 五音, 中音区和弦]
  const CH = { C: [36, 43, [60, 64, 67]], Am: [33, 40, [57, 60, 64]], F: [29, 36, [57, 60, 65]], G: [31, 38, [55, 59, 62]] };
  const CHORDS = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C', 'Am', 'G', 'F', 'G', 'C', 'Am', 'F', 'G'];
  // 应答：乐句末尾的长音里，用主题头三个音高八度应一句（「问—答」，越听越熟）
  const ECHO = {
    3: '. . . . G5 A5 G5 -',
    7: '. . . . G5 - A5 G5',
  };
  const HOOK_BARS = [0, 4, 12];   // 主题小节：第二遍起头一个音上点一声铃
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const toMidi = (n) => 12 * (+n.slice(1) + 1) + NOTE[n[0]];
  const PENTA = [55, 57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];
  // 和声：在五声音阶里往下数两级（大致低三度）
  const below = (m) => { const k = PENTA.indexOf(m); return k >= 2 ? PENTA[k - 2] : m - 5; };
  let echo = null;
  function makeEcho(a, dest) {
    const e = a.createDelay(1.0);
    e.delayTime.value = E8 * 3;
    const fb = a.createGain(); fb.gain.value = 0.22;
    const wet = a.createGain(); wet.gain.value = 0.28;
    e.connect(fb); fb.connect(e); e.connect(wet); wet.connect(dest);
    return e;
  }
  // 琵琶味拨弦：比 pluck 亮一点（锯齿 + 三角），起音更脆
  function pipa(a, dest, t, freq, gain, len) {
    const L = len || 0.5;
    const o1 = a.createOscillator(); o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq, t);
    const o2 = a.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq, t);
    const g1 = a.createGain(); g1.gain.value = 0.35;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(Math.min(9000, freq * 9), t); f.frequency.exponentialRampToValueAtTime(Math.max(500, freq * 1.6), t + L * 0.6);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + L);
    o1.connect(g1); g1.connect(f); o2.connect(f); f.connect(g); g.connect(dest);
    o1.start(t); o2.start(t); o1.stop(t + L + 0.05); o2.stop(t + L + 0.05);
  }
  /* 笛子：音一直吹到下一个音，相连的音之间带一点滑音（from = 上一个音的频率），颤音晚一点才起、慢慢变深；
   * 正弦 + 一点三角 + 一路的气声 */
  function dizi(a, dest, t, freq, from, len, gain) {
    const end = t + len;
    const o1 = a.createOscillator(), o2 = a.createOscillator();
    o1.type = 'sine'; o2.type = 'triangle';
    for (const o of [o1, o2]) {
      o.frequency.setValueAtTime(from || freq, t);
      if (from && Math.abs(from - freq) > 0.5) o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    }
    const lfo = a.createOscillator(), dep = a.createGain();
    lfo.frequency.value = 5.4;
    dep.gain.setValueAtTime(0, t); dep.gain.linearRampToValueAtTime(freq * 0.009, t + Math.min(len, 0.4));
    lfo.connect(dep); dep.connect(o1.frequency); dep.connect(o2.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.05);
    g.gain.linearRampToValueAtTime(gain * 1.06, t + Math.max(0.06, len * 0.5));
    g.gain.setValueAtTime(gain * 1.06, Math.max(t + 0.07, end - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.07);
    const m2 = a.createGain(); m2.gain.value = 0.12;
    o1.connect(g); o2.connect(m2); m2.connect(g); g.connect(dest);
    nz(a, dest, t, { dur: len + 0.05, gain: gain * 0.07, freq: freq * 2, q: 2, attack: 0.04 });
    for (const o of [o1, o2, lfo]) { o.start(t); o.stop(end + 0.1); }
  }
  // 古筝：拨弦起音带一点「按音」往上滑，余音长（比琵琶圆、比琵琶长）
  function zheng(a, dest, t, freq, gain, len) {
    const L = Math.max(0.9, len || 1.2);
    const o1 = a.createOscillator(); o1.type = 'triangle';
    const o2 = a.createOscillator(); o2.type = 'sawtooth';
    for (const o of [o1, o2]) { o.frequency.setValueAtTime(freq * 0.985, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.035); }
    const m2 = a.createGain(); m2.gain.value = 0.18;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(Math.min(8000, freq * 6), t); f.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.4), t + L * 0.8);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(gain * 0.35, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + L);
    o1.connect(f); o2.connect(m2); m2.connect(f); f.connect(g); g.connect(dest);
    for (const o of [o1, o2]) { o.start(t); o.stop(t + L + 0.05); }
  }
  // 把乐谱排到 horizon（音频时刻）为止；st = { step, next }，step 一直往上数，取模就是循环（循环处不停顿）
  function scheduleMusic(a, mel, wet, st, horizon) {
    st.prev = st.prev || {};
    while (st.next < horizon) {
      const s = st.step, barAll = s >> 3, k = s & 7, bar = barAll % 16, pass = (barAll / 16) | 0;
      const t = st.next;
      const ch = CH[CHORDS[bar]];
      // 低音「咚—嗒」：一拍根音、三拍五音
      if (k === 0) tone(a, mel, t, { freq: midi(ch[0] + 12), dur: E8 * 1.8, gain: 0.34, type: 'triangle', lp: 900 });
      if (k === 4) tone(a, mel, t, { freq: midi(ch[1] + 12), dur: E8 * 1.8, gain: 0.28, type: 'triangle', lp: 900 });
      // 弱拍垫一个短和弦
      if (k === 2 || k === 6) ch[2].forEach((m) => pluck(a, mel, t, midi(m), 0.07, 0.28));
      // 锣鼓点：小鼓一、三拍，小镲 + 拍手二、四拍；每四小节末尾来一记鼓花
      if (k === 0 || k === 4) { tone(a, mel, t, { freq: 190, to: 95, dur: 0.16, gain: k ? 0.18 : 0.24 }); nz(a, mel, t, { dur: 0.05, gain: 0.05, type: 'lowpass', freq: 1200, q: 0.7 }); }
      if (k === 2 || k === 6) {
        nz(a, mel, t, { dur: 0.12, gain: 0.05, freq: 6000, q: 1.2 });
        nz(a, mel, t, { dur: 0.08, gain: 0.09, freq: 1700, q: 1.4 });
        nz(a, mel, t + 0.012, { dur: 0.06, gain: 0.06, freq: 2300, q: 1.6 });
      }
      if (bar % 4 === 3 && k >= 5) tone(a, mel, t, { freq: 230 - (k - 5) * 25, to: 110, dur: 0.12, gain: 0.16 });
      // 这一遍、这一段的编配
      const arr = PASSES[pass % PASSES.length];
      const sec = bar < 8 ? 0 : bar < 12 ? 1 : 2;
      const lead = arr.lead[sec];
      const flute = (f, len, gain, voice) => {   // 笛子长音：和上一个音首尾相接就滑过去
        const p = st.prev[voice];
        const from = p && Math.abs(p.end - t) < 0.02 ? p.f : 0;
        const dest = a.createGain(); dest.connect(mel); dest.connect(wet);
        dizi(a, dest, t, f, from, len, gain);
        st.prev[voice] = { f, end: t + len };
      };
      // 主旋律
      const note = TUNE[bar][k];
      if (note !== '-' && note !== '.') {
        let len = 1;
        while (k + len < 8 && TUNE[bar][k + len] === '-') len++;
        const m = toMidi(note), f = midi(m), dur = E8 * len;
        const dest = a.createGain(); dest.connect(mel); dest.connect(wet);
        if (lead === 'pipa') {
          // 长音用轮指：一串十六分音符的快速重拨，越来越轻
          if (len >= 3) for (let r = 0; r < len * 2; r++) pipa(a, dest, t + r * E8 / 2, f, 0.3 * Math.pow(0.86, r), E8 * 0.7);
          else pipa(a, dest, t, f, k % 4 === 0 ? 0.34 : 0.28, dur + 0.25);
        } else if (lead === 'zheng') {
          // 长音用摇指：比琵琶的轮指轻、更连（音量比琵琶略收，三遍听着一样响）
          if (len >= 3) for (let r = 0; r < len * 2; r++) zheng(a, dest, t + r * E8 / 2, f, 0.19 * Math.pow(0.9, r), E8 * 1.2);
          else zheng(a, dest, t, f, k % 4 === 0 ? 0.24 : 0.2, dur + 0.6);
        } else {
          flute(f, dur, 0.13, 'lead');
          if (arr.pipaDouble) pipa(a, dest, t, f, 0.12, Math.min(dur, E8 * 2) + 0.2);
        }
        // 第二遍：低三度和声（笛子主奏时不加，免得乱）；第二遍起主题小节头一个音上点一声铃
        if (pass % 2 === 1 && lead !== 'dizi') pluck(a, dest, t, midi(below(m)), 0.1, dur + 0.3);
        if (pass > 0 && k === 0 && HOOK_BARS.includes(bar)) tone(a, mel, t, { freq: f * 2, dur: 0.9, gain: 0.045, type: 'sine' });
      }
      // 古筝刮奏：每段开头前的最后半拍，一串五声音阶快速往上一刮
      if (k === 7 && (bar === 7 || bar === 15)) {
        [62, 64, 67, 69, 72, 74, 76, 79].forEach((m, i) => pluck(a, mel, t + i * E8 / 9, midi(m), 0.07 + i * 0.006, 0.9));
      }
      // 笛子长音衬托（半小节一个音）
      if (arr.counter.includes(['A', 'B', 'A2'][sec]) && (k === 0 || k === 4)) flute(midi(COUNTER[CHORDS[bar]][k ? 1 : 0]), E8 * 4, 0.06, 'counter');
      // 乐句末尾的应答（主题头三个音）
      const echoBar = ECHO[bar];
      if (echoBar) {
        const toks = echoBar.split(' ');
        const ev = toks[k];
        if (ev && ev !== '.' && ev !== '-') {
          let len = 1;
          while (k + len < 8 && toks[k + len] === '-') len++;
          if (arr.answer === 'pipa') {
            const d2 = a.createGain(); d2.connect(mel); d2.connect(wet);
            pipa(a, d2, t, midi(toMidi(ev)), 0.22, E8 * len + 0.25);
          } else flute(midi(toMidi(ev)), E8 * len + 0.05, 0.14, 'answer');
        }
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
    scheduleMusic(a, mel, makeEcho(a, mel), { step: 0, next: 0.05 }, sec - 2);
    return a.startRendering();
  }
  let music = null;   // 正在放：{ step, next, timer, prev }
  function startMusic() {
    if (music || !prefs.music || !ensure()) return;
    if (ctx.state !== 'running') return;   // 还没解锁：等下一次点按（unlock 会再来叫）
    music = { step: 0, next: ctx.currentTime + 0.15, timer: setInterval(musicTick, 120) };
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
    const a = ensure();
    const after = (fn) => { if (!a) return; if (a.state === 'running') fn(); else a.resume().then(fn, () => {}); };
    if (key === 'music') { if (on) after(startMusic); else stopMusic(); }
    if (key === 'sfx' && on) after(() => sfx('turn'));
  }

  /* 浏览器要先有一次点按才能出声。坑（iPhone / iPad 上的所有浏览器，包括微信、谷歌 App 里的）：
   *   ① 手指按下（pointerdown / touchstart）不算数，要等抬起（touchend）或 click 才准出声；
   *   ② 光 resume() 不一定醒，要在这一下里放一个空白的极短声音；
   *   ③ 声明成「环境音」（ambient）：和手机游戏的通行做法一样，跟着侧面静音开关走、不打断别的 App 正在放的音乐，
   *      灵动岛 / 锁屏上也不会冒出「正在播放」的喇叭。（以前声明成「播放」类，静音开关打开也出声，但灵动岛上总挂着喇叭）
   * 所以每次点按都试一次，直到音频真的跑起来（切到后台回来被系统挂起了，下一次点按也会再叫醒）。 */
  if (hasDom) {
    const unlock = () => {
      if (!prefs.sfx && !prefs.music) return;
      try { if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient'; } catch (_) { /* 老系统没有 */ }
      if (ctx && ctx.state === 'running') { if (prefs.music && !music) startMusic(); return; }
      const a = ensure();
      if (!a) return;
      try {
        const src = a.createBufferSource();
        src.buffer = a.createBuffer(1, 1, a.sampleRate);
        src.connect(a.destination);
        src.start(0);
      } catch (_) { /* ignore */ }
      const go = () => { if (a.state === 'running' && prefs.music) startMusic(); };
      if (a.state === 'running') go();
      else if (a.resume) a.resume().then(go, () => {});
    };
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  }

  window.GongzhuAudio = { sfx, duck, set, prefs: () => Object.assign({}, prefs), SFX, renderMusic };
})();
