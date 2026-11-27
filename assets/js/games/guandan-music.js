/* 掼蛋 · 背景音乐（window.GuandanMusic）
 * 2026-11-27 用户：照炸弹猫的做法，要一小段有记忆点的 motif。第一版（民乐）听完被否：不用刻意中国风，要像炸弹猫那样有冲击力、
 * 耳目一新；茶馆底下那层拨弦琶音「瘪」、断断续续还抢戏；炸场翻高八度那段音色单薄。第二版整个重写（下面这版）。
 * 之后试过 D 大调（像儿歌）、布鲁斯怪音（太怪）都被否；用户从四段方向短样里挑回这一版的影子 + 干净放克（「明显比其他三个更好」）。
 * 等桌只改后半段：原来 B 段换铜管吹短促连音、听着「一抓一抓」，现在颤音琴一直唱、闷音小号轻轻叠上，律动照旧（别改得太静）。
 *
 * 影子（D 小调两小节）：「咚——咚——咚嗒嗒嗒」3+3+2 的切分节奏（像把牌往桌上一掼），三个音一路往上冲到 A，
 * 打个转往下走；第二小节同一个节奏落到属和弦上、停在半空。整首 16 小节，A 段：影子 / 答句（高一级再来一遍）/ 影子 / 收尾，
 * B 段：同音连打的「副歌」两句 + 换尾巴再来 + 最后一小节全队齐奏三下（又是 3+3+2）掼回开头。三版共用这套旋律和和弦，换版不断。
 *   等桌  108 拍  牌桌外（开始页、房间、结算）：颤音琴从头唱到尾、B 段闷音小号轻轻叠上，电钢琴整小节垫和弦、低音提琴走步、刷子 + 响指，慵懒摇摆
 *   开打  132 拍  一局里常驻：铜管齐奏（叠低八度更厚）+ 清音吉他，切分低音跟着 3+3+2，军鼓 / 拍手、反拍和弦切音
 *   炸场  156 拍  有人出炸弹：厚锯齿主奏 + 铜管，四拍底鼓、反拍开镲、十六分芯片琶音、低音一拍一泵；放满一圈没人再炸就回「开打」
 * 什么时候换哪版见下面「导演」一节（2026-11-27 按真实对局重做）。
 * 全部 Web Audio 现场合成，没有素材文件。GuandanAudio 建好上下文后接到它的音乐总线上。 */
(function (root) {
  'use strict';
  /* ───── 音名 ───── */
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    const midi = (+m[3] + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const up = (n, k) => freq(n) * Math.pow(2, k / 12);

  /* ───── 旋律（16 分音符一格；一句两小节 32 格）───── */
  // 影子：咚——咚——咚 嗒嗒嗒（3+3+2），D F A 往上冲、打个转下来；第二小节同一个节奏落在 A 和弦上，停在 E 上没说完
  const MOTIF = [[0,3,'D5'],[3,3,'F5'],[6,2,'A5'],[8,1,'G5'],[9,1,'A5'],[10,2,'G5'],[12,2,'F5'],[14,2,'E5'],
    [16,3,'E5'],[19,3,'C#5'],[22,2,'A4'],[24,1,'B4'],[25,1,'C#5'],[26,2,'D5'],[28,4,'E5']];
  // 答句：同一句高一级（Bb → C），冲到 A 上
  const ANSWER = [[0,3,'D5'],[3,3,'F5'],[6,2,'Bb5'],[8,1,'A5'],[9,1,'Bb5'],[10,2,'A5'],[12,2,'G5'],[14,2,'F5'],
    [16,3,'G5'],[19,3,'E5'],[22,2,'C5'],[24,1,'E5'],[25,1,'F5'],[26,2,'G5'],[28,4,'A5']];
  // 收尾：Gm 上再来一次，往下落进 A，留个钩子给 B 段
  const ENDING = [[0,3,'D5'],[3,3,'G5'],[6,2,'Bb5'],[8,1,'A5'],[9,1,'G5'],[10,2,'F5'],[12,2,'E5'],[14,2,'C#5'],
    [16,3,'E5'],[19,3,'C#5'],[22,2,'A4'],[24,2,'E5'],[26,2,'C#5'],[28,4,'A4']];
  // B 段「副歌」：同音连打两下 + 往下走，两句一问一答
  const B1 = [[0,1,'A5'],[2,1,'A5'],[4,2,'G5'],[6,2,'F5'],[8,1,'C6'],[10,1,'A5'],[12,4,'G5'],
    [16,1,'G5'],[18,1,'G5'],[20,2,'F5'],[22,2,'E5'],[24,1,'C5'],[26,1,'E5'],[28,4,'G5']];
  const B2 = [[0,1,'F5'],[2,1,'F5'],[4,2,'E5'],[6,2,'D5'],[8,1,'A5'],[10,1,'F5'],[12,4,'E5'],
    [16,1,'E5'],[17,1,'F5'],[18,1,'E5'],[19,1,'D5'],[20,2,'C#5'],[22,2,'E5'],[24,8,'A5']];
  // 第三句：副歌换个尾巴（往上翻到 C6 再下来），不再整句翻高八度（第一版那样太单薄）
  const B3 = [[0,1,'A5'],[2,1,'A5'],[4,2,'G5'],[6,2,'F5'],[8,1,'C6'],[10,1,'A5'],[12,4,'G5'],
    [16,1,'G5'],[18,1,'A5'],[20,2,'C6'],[22,2,'A5'],[24,2,'G5'],[26,2,'F5'],[28,4,'E5']];
  // 爬回去 + 全队齐奏：咚——咚——咚（3+3+2）掼回开头
  const B4 = [[0,1,'Bb4'],[1,1,'D5'],[2,1,'F5'],[3,1,'Bb5'],[4,4,'Bb5'],[8,1,'A5'],[9,1,'G5'],[10,1,'F5'],[11,1,'E5'],[12,4,'F5'],
    [16,2,'A4'],[19,2,'A4'],[22,2,'C#5'],[24,1,'E5'],[25,1,'G5'],[26,2,'A5']];
  function song() { return [MOTIF, ANSWER, MOTIF, ENDING, B1, B2, B3, B4]; }
  // 和弦（根音 + 排好声部的和弦音，全放在旋律下面、和弦之间走最近的音，垫着不抢戏）
  const CH = {
    Dm: ['D', ['F3','A3','D4']], A: ['A', ['E3','A3','C#4']], Bb: ['Bb', ['F3','Bb3','D4']], C: ['C', ['E3','G3','C4']],
    Gm: ['G', ['D3','G3','Bb3']], F: ['F', ['F3','A3','C4']],
  };
  const PROG = ['Dm','A','Bb','C','Dm','A','Gm','A',   'F','C','Dm','A','F','C','Bb','A'];
  const BASSN = { D: 'D2', A: 'A1', Bb: 'Bb1', C: 'C2', G: 'G1', F: 'F1' };
  // 齐奏小节（B4 第二小节）：全队跟着旋律的三下砸，其余停
  const HIT_BAR = 15, HITS = [0, 3, 6];

  /* ───── 合成器 ───── */
  let ac = null, master = null, fxDelay, fxVerb, noiseBuf = null, OUT = null;
  function attach(ctx, dest, level) {
    if (ac && ac !== ctx) { Object.keys(BUS).forEach((k) => delete BUS[k]); Object.keys(KS).forEach((k) => delete KS[k]); P.cur = null; P.bar = 0; P.nextT = 0; }
    ac = ctx; noiseBuf = null; VOICES.length = 0;
    master = ac.createGain(); master.gain.value = level == null ? 1 : level;
    master.connect(dest);
    const d = ac.createDelay(1); d.delayTime.value = 0.33; const fb = ac.createGain(); fb.gain.value = 0.27; const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2600;
    d.connect(dl); dl.connect(fb); fb.connect(d); dl.connect(master);
    fxDelay = ac.createGain(); fxDelay.gain.value = 0.2; fxDelay.connect(d);
    const conv = ac.createConvolver(); const len = Math.floor(ac.sampleRate * 1.5); const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    conv.buffer = ir; fxVerb = ac.createGain(); fxVerb.gain.value = 0.22; fxVerb.connect(conv); conv.connect(master);
    return master;
  }
  function noise() { if (noiseBuf) return noiseBuf; const n = ac.sampleRate; noiseBuf = ac.createBuffer(1, n, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
  // 每个音放完就从总线上拔掉（炸弹猫 2026-11-19 的教训：iPhone 上旧节点越积越多会断音）
  const VOICES = [];
  function out(g, send, pan) {
    let tail = g;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); tail = p; }
    tail.connect(OUT || master);
    const v = [g, tail];
    if (send && send.delay) { const s = ac.createGain(); s.gain.value = send.delay; tail.connect(s); s.connect(fxDelay); v.push(s); }
    if (send && send.verb) { const s = ac.createGain(); s.gain.value = send.verb; tail.connect(s); s.connect(fxVerb); v.push(s); }
    VOICES.push({ end: ac.currentTime + 12, v });
  }
  function sweep() {
    if (!ac) return;
    const now = ac.currentTime;
    let i = 0;
    while (i < VOICES.length && VOICES[i].end <= now) { VOICES[i].v.forEach((n) => { try { n.disconnect(); } catch (_) { /* */ } }); i++; }
    if (i) VOICES.splice(0, i);
  }
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), Math.max(t + a + d, end));
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + a + d, end) + rel);
  }
  function osc(type, f, t, end, detune) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.start(t); o.stop(end + 0.6); return o; }
  function vibrato(param, t, rate, depth, delay, len) { const l = ac.createOscillator(); l.frequency.value = rate; const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(depth, t + delay + 0.2); l.connect(g); g.connect(param); l.start(t); l.stop(t + (len || 4)); }

  // Karplus-Strong 弦（清音电吉他用）：弦长取整再用 playbackRate 调回准音
  const KS = {};
  function ks(f) {
    const sr = ac.sampleRate, N = Math.ceil(sr / f), key = 'g' + N, rate = f * (N + 0.5) / sr;
    if (KS[key]) return { buf: KS[key], rate };
    const len = Math.floor(sr * 1.2), b = ac.createBuffer(1, len, sr), d = b.getChannelData(0);
    let lp = 0, mean = 0;
    for (let i = 0; i <= N; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.6; d[i] = lp; mean += lp; }
    mean /= N + 1; for (let i = 0; i <= N; i++) d[i] -= mean;
    for (let i = N + 1; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - N] + d[i - N - 1]);
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i]));
    if (pk > 0) for (let i = 0; i < len; i++) d[i] /= pk;
    KS[key] = b;
    return { buf: b, rate };
  }

  const INST = {
    // 铜管：三层锯齿 + 滤波器「哇」地打开；高音自动收一点亮度，不刺耳
    brass(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.5; const top = Math.min(3400, f * 5); lp.frequency.setValueAtTime(top * 0.18, t); lp.frequency.exponentialRampToValueAtTime(top, t + 0.05); lp.frequency.exponentialRampToValueAtTime(top * 0.45, t + 0.3); const g = ac.createGain(); env(g, t, 0.018, 0.12 * v, 0.12, 0.62, 0.06, t + dur); [-7, 0, 7].forEach((dt) => osc('sawtooth', f, t, t + dur, dt).connect(lp)); lp.connect(g); out(g, { delay: 0.18, verb: 0.25 }, 0.12); },
    // 闷音小号：滤波压得低、带一点颤，柔和地叠在颤音琴上
    mute(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'bandpass'; lp.Q.value = 1.6; lp.frequency.setValueAtTime(Math.min(2400, f * 2.2), t); lp.frequency.exponentialRampToValueAtTime(Math.min(1800, f * 1.6), t + 0.2); const g = ac.createGain(); env(g, t, 0.03, 0.2 * v, 0.1, 0.7, 0.1, t + dur); [-5, 5].forEach((dt) => { const o = osc('sawtooth', f, t, t + dur, dt); vibrato(o.detune, t, 5.2, 14, 0.2, dur + 1); o.connect(lp); }); lp.connect(g); out(g, { delay: 0.22, verb: 0.35 }, 0.15); },
    brassLow(t, f, dur, v = 1) { INST.brass(t, f / 2, dur, 0.55 * v); },
    // 厚锯齿主奏（炸场）：五层错开一点的锯齿 + 低八度方波垫底，亮度随音高收
    saw(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5; const top = Math.min(5200, f * 6); lp.frequency.setValueAtTime(top, t); lp.frequency.exponentialRampToValueAtTime(top * 0.55, t + 0.25); const g = ac.createGain(); env(g, t, 0.008, 0.085 * v, 0.1, 0.75, 0.07, t + dur * 0.95); [-16, -7, 0, 7, 16].forEach((dt) => { const o = osc('sawtooth', f, t, t + dur, dt); vibrato(o.detune, t, 5.5, 12, 0.18, dur + 1); o.connect(lp); }); const sub = ac.createGain(); sub.gain.value = 0.5; osc('square', f / 2, t, t + dur).connect(sub); sub.connect(lp); lp.connect(g); out(g, { delay: 0.3, verb: 0.2 }, -0.08); },
    // 颤音琴：正弦 + 金属泛音，整体轻轻颤
    vibe(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.003, 0.38 * v, Math.min(1.4, 0.35 + dur), 0.001, 0.2, t); const trem = ac.createGain(); trem.gain.value = 0.85; const l = ac.createOscillator(); l.frequency.value = 5; const lg = ac.createGain(); lg.gain.value = 0.15; l.connect(lg); lg.connect(trem.gain); l.start(t); l.stop(t + 2); osc('sine', f, t, t + 1.8).connect(trem); const g2 = ac.createGain(); env(g2, t, 0.002, 0.06 * v, 0.15, 0.001, 0.05, t); osc('sine', f * 4, t, t + 0.3).connect(g2); g2.connect(trem); trem.connect(g); out(g, { verb: 0.45, delay: 0.15 }, 0.1); },
    // 清音电吉他：拨弦模型，跟铜管同奏，给个「颗粒」
    gtr(t, f, dur, v = 1) { const { buf, rate } = ks(f); const s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; const g = ac.createGain(); const d = Math.min(dur, 0.8); g.gain.setValueAtTime(0.22 * v, t); g.gain.setValueAtTime(0.22 * v, t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12); s.connect(lp); lp.connect(g); s.start(t); s.stop(t + d + 0.2); out(g, { verb: 0.25, delay: 0.12 }, -0.3); },
    // 低音
    upright(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.004, 0.24 * v, 0.3, 0.25, 0.06, t + dur * 0.8); osc('triangle', f, t, t + dur).connect(g); const g2 = ac.createGain(); g2.gain.value = 0.25; osc('sine', f * 2, t, t + dur).connect(g2); g2.connect(g); out(g, { verb: 0.1 }); },
    synthBass(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(240, t + 0.16); const g = ac.createGain(); env(g, t, 0.004, 0.16 * v, 0.1, 0.6, 0.03, t + dur * 0.85); osc('sawtooth', f, t, t + dur).connect(lp); osc('square', f / 2, t, t + dur).connect(lp); lp.connect(g); out(g); },
    slap(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(320, t + 0.09); const g = ac.createGain(); env(g, t, 0.002, 0.18 * v, 0.12, 0.35, 0.03, t + dur * 0.7); osc('square', f, t, t + dur).connect(lp); lp.connect(g); const sub = ac.createGain(); env(sub, t, 0.004, 0.15 * v, 0.2, 0.4, 0.04, t + dur * 0.7); osc('sine', f, t, t + dur).connect(sub); sub.connect(g); out(g); },
    // 和弦
    // 电钢琴：FM 小钟声，整小节连着垫（取代第一版「瘪」的拨弦琶音）
    rhodes(t, fs, dur, v = 1) { fs.forEach((f, i) => { const car = ac.createOscillator(); car.frequency.value = f; const mod = ac.createOscillator(); mod.frequency.value = f; const mg = ac.createGain(); mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.6); mod.connect(mg); mg.connect(car.frequency); const g = ac.createGain(); g.gain.value = 0.0001; env(g, t + i * 0.012, 0.006, 0.06 * v, 0.9, 0.35, 0.35, t + dur); car.connect(g); car.start(t); car.stop(t + dur + 0.9); mod.start(t); mod.stop(t + dur + 0.9); out(g, { verb: 0.35 }, i === 0 ? -0.25 : i === 2 ? 0.25 : 0); }); },
    pad(t, fs, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000; const g = ac.createGain(); env(g, t, 0.25, 0.03 * v, 0.3, 0.8, 0.4, t + dur); fs.forEach((f) => [-10, 10].forEach((dt) => osc('sawtooth', f, t, t + dur, dt).connect(lp))); lp.connect(g); out(g, { verb: 0.5 }); },
    stab(t, fs, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; const g = ac.createGain(); env(g, t, 0.003, 0.07 * v, 0.1, 0.001, 0.03, t); fs.forEach((f) => { osc('triangle', f, t, t + 0.25).connect(lp); osc('sawtooth', f, t, t + 0.25, 6).connect(lp); }); lp.connect(g); out(g, { verb: 0.3 }, -0.2); },
    arp(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.002, 0.03 * v, 0.06, 0.001, 0.02, t); osc('square', f, t, t + 0.12).connect(g); out(g, { delay: 0.3 }, 0.3); },
  };
  // 鼓
  const DR = {
    kick(t, v = 1) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); const g = ac.createGain(); env(g, t, 0.002, 0.9 * v, 0.16, 0.001, 0.04, t); o.connect(g); out(g); o.start(t); o.stop(t + 0.35); },
    snare(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; const g = ac.createGain(); env(g, t, 0.002, 0.33 * v, 0.14, 0.001, 0.03, t); src.connect(hp); hp.connect(g); out(g, { verb: 0.3 }); src.start(t); src.stop(t + 0.25); const o = ac.createOscillator(); o.frequency.setValueAtTime(200, t); const g2 = ac.createGain(); env(g2, t, 0.002, 0.25 * v, 0.07, 0.001, 0.02, t); o.connect(g2); out(g2); o.start(t); o.stop(t + 0.15); },
    clap(t, v = 1) { for (let i = 0; i < 3; i++) { const tt = t + i * 0.011; const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.9; const g = ac.createGain(); env(g, tt, 0.001, 0.3 * v, i === 2 ? 0.13 : 0.02, 0.001, 0.02, tt); src.connect(bp); bp.connect(g); out(g, { verb: 0.35 }); src.start(tt); src.stop(tt + 0.2); } },
    rim(t, v = 1) { const o = ac.createOscillator(); o.frequency.value = 1700; const g = ac.createGain(); env(g, t, 0.001, 0.12 * v, 0.03, 0.001, 0.01, t); o.connect(g); const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; const g2 = ac.createGain(); env(g2, t, 0.001, 0.1 * v, 0.03, 0.001, 0.01, t); src.connect(bp); bp.connect(g2); g2.connect(g); out(g, { verb: 0.35 }); o.start(t); o.stop(t + 0.08); src.start(t); src.stop(t + 0.08); },
    hat(t, v = 1, open) { const src = ac.createBufferSource(); src.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000; const g = ac.createGain(); env(g, t, 0.001, 0.11 * v, open ? 0.22 : 0.035, 0.001, 0.02, t); src.connect(hp); hp.connect(g); out(g, null, 0.2); src.start(t, Math.random() * 0.5); src.stop(t + 0.3); },
    snap(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 2.5; const g = ac.createGain(); env(g, t, 0.001, 0.28 * v, 0.03, 0.001, 0.02, t); src.connect(bp); bp.connect(g); out(g, { verb: 0.5 }, 0.3); src.start(t, Math.random() * 0.5); src.stop(t + 0.1); },
    brush(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5000; bp.Q.value = 0.7; const g = ac.createGain(); env(g, t, 0.01, 0.06 * v, 0.09, 0.001, 0.03, t); src.connect(bp); bp.connect(g); out(g, null, -0.2); src.start(t, Math.random() * 0.5); src.stop(t + 0.2); },
    crash(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; const g = ac.createGain(); env(g, t, 0.002, 0.15 * v, 1.2, 0.001, 0.2, t); src.connect(hp); hp.connect(g); out(g, { verb: 0.4 }); src.start(t); src.stop(t + 1.6); },
    tom(t, f, v = 1) { const o = ac.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.2); const g = ac.createGain(); env(g, t, 0.002, 0.4 * v, 0.2, 0.001, 0.03, t); o.connect(g); out(g, { verb: 0.3 }); o.start(t); o.stop(t + 0.3); },
    riser(t, dur, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05); src.connect(bp); bp.connect(g); out(g, { verb: 0.3 }); src.start(t); src.stop(t + dur + 0.1); },
    fall(t, dur, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.setValueAtTime(5000, t); bp.frequency.exponentialRampToValueAtTime(350, t + dur); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * v, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(bp); bp.connect(g); out(g, { verb: 0.4 }); src.start(t); src.stop(t + dur + 0.1); },
    boom(t, v = 1) { DR.kick(t, 1.2 * v); const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6); const g = ac.createGain(); env(g, t, 0.003, 0.6 * v, 0.6, 0.001, 0.1, t); o.connect(g); out(g, { verb: 0.5 }); o.start(t); o.stop(t + 0.9); DR.crash(t, 0.8 * v); },
  };

  /* ───── 三个版本 ─────
   * 每版：bpm、swing、lead（A 段）/ leadB（B 段）主奏、bass/drums/comp 伴奏写法。HIT_BAR 那一小节各声部只跟着三下齐奏 */
  const VERSIONS = [
    { id: 'lounge', name: '等桌', tag: '108 拍 · 慵懒摇摆', desc: '牌桌外：颤音琴从头唱到尾，B 段闷音小号轻轻叠上；电钢琴整小节垫和弦，低音提琴走步，刷子 + 边击 + 响指，摇摆着等人。',
      bpm: 108, swing: 0.2, lead: ['vibe'], leadB: ['vibe', 'mute'],
      bass(bar, ch, add) { const r = BASSN[ch[0]]; if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 2, 'upright', up(r, 12))); return; } [[0, 12], [4, 19], [8, 24], [12, 22]].forEach(([s, k]) => add(s, 3, 'upright', up(r, k))); },
      drums(bar, sec, add) { if (bar === HIT_BAR) { HITS.forEach((s) => { add(s, 'kick', 0.7); add(s, 'rim', 0.8); }); add(12, 'tom', 170, 0.5); add(14, 'tom', 130, 0.5); return; } add(0, 'kick', 0.55); add(10, 'kick', 0.4); add(4, 'rim', 0.8); add(12, 'rim', 0.8); add(4, 'snap', 0.7); add(12, 'snap', 0.7); for (let s = 0; s < 16; s += 2) add(s, 'brush', s % 4 ? 0.8 : 1.1); [6, 14].forEach((s) => add(s + 1, 'hat', 0.35)); },
      comp(bar, ch, add) { if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 2, 'rhodes', ch[1].map(freq), 1)); return; } add(0, 14, 'rhodes', ch[1].map(freq), 1); add(11, 4, 'rhodes', ch[1].map(freq), 0.45); },
      extra(bar, add) { if (bar === 0) add(0, 'crash', 0.4); } },
    { id: 'play', name: '开打', tag: '132 拍 · 铜管切分', desc: '一局里：铜管齐奏影子（叠低八度更厚）+ 清音吉他同奏，低音跟着 3+3+2 切分，军鼓 + 拍手打二四拍，反拍和弦切音，电钢琴轻垫。',
      bpm: 132, swing: 0, lead: ['brass', 'brassLow', 'gtr'],
      bass(bar, ch, add) { const r = BASSN[ch[0]]; if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 2, 'slap', up(r, 12))); return; } [[0, 2, 12], [3, 2, 12], [6, 1, 24], [8, 2, 12], [10, 1, 19], [12, 2, 12], [14, 1, 22]].forEach(([s, l, k]) => add(s, l, 'slap', up(r, k))); },
      drums(bar, sec, add) { if (bar === HIT_BAR) { HITS.forEach((s) => { add(s, 'kick', 1.1); add(s, 'crash', 0.6); }); [10, 11, 12, 13, 14, 15].forEach((s, i) => add(s, 'snare', 0.35 + i * 0.1)); return; } add(0, 'kick'); add(6, 'kick', 0.8); add(8, 'kick', 0.7); add(4, 'snare'); add(12, 'snare'); add(12, 'clap', 0.6); for (let s = 0; s < 16; s++) add(s, 'hat', s % 2 ? 0.3 : 0.6); if (bar % 4 === 3) [13, 14, 15].forEach((s, i) => add(s, 'tom', 220 - i * 40, 0.8)); },
      comp(bar, ch, add) { if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 1, 'stab', ch[1].map((n) => freq(n) * 2), 1.1)); return; } [2, 6, 10, 14].forEach((s) => add(s, 1, 'stab', ch[1].map((n) => freq(n) * 2), 0.75)); add(0, 16, 'rhodes', ch[1].map(freq), 0.45); },
      extra(bar, add) { if (bar === 0 || bar === 8) add(0, 'crash', 0.7); } },
    { id: 'bomb', name: '炸场', tag: '156 拍 · 电子冲击', desc: '有人出炸弹：厚锯齿主奏 + 铜管，四拍底鼓、拍手、反拍开镲，十六分芯片琶音在上面闪，低音一拍一泵；最后一小节噪音蓄力，三下齐奏砸回开头。',
      bpm: 156, swing: 0, lead: ['saw', 'brass'],
      bass(bar, ch, add) { const r = BASSN[ch[0]]; if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 2, 'synthBass', up(r, 12), 1.2)); return; } for (let s = 0; s < 16; s += 2) add(s, 2, 'synthBass', s % 4 === 2 ? up(r, 24) : up(r, 12)); },
      drums(bar, sec, add) { if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 'boom', 0.8)); add(8, 'riser', 0.5); return; } [0, 4, 8, 12].forEach((s) => add(s, 'kick')); add(4, 'clap'); add(12, 'clap'); [2, 6, 10, 14].forEach((s) => add(s, 'hat', 0.9, true)); [1, 3, 5, 7, 9, 11, 13, 15].forEach((s) => add(s, 'hat', 0.4)); },
      comp(bar, ch, add) { if (bar === HIT_BAR) return; const notes = ch[1].map((n) => freq(n) * 4); for (let s = 0; s < 16; s++) add(s, 1, 'arp', notes[s % 3] * (s % 6 >= 3 ? 2 : 1), 0.9); add(0, 16, 'pad', ch[1].map((n) => freq(n) * 2), 0.8); },
      extra(bar, add) { if (bar === 0 || bar === 8) add(0, 'crash'); } },
  ];

  /* ───── 编排：把一版展开成一圈 256 格的事件表 ───── */
  function build(v) {
    const ev = [];
    const phrases = song(v);
    const sw = (s) => s + ((Math.floor(s) % 2 === 1) ? v.swing : 0);
    for (let p = 0; p < 8; p++) {
      const base = p * 32;
      const lead = (p >= 4 && v.leadB) ? v.leadB : v.lead;
      for (const [s, l, n] of phrases[p]) {
        const f = freq(n), at = base + s;
        lead.forEach((ins, li) => ev.push({ s: sw(at), fn: (t, st) => INST[ins](t, f, l * st, li ? 0.85 : 1) }));
      }
    }
    for (let bar = 0; bar < 16; bar++) {
      const ch = CH[PROG[bar]], b0 = bar * 16;
      v.bass(bar, ch, (s, l, ins, f, vv) => ev.push({ s: sw(b0 + s), fn: (t, st) => INST[ins](t, f, l * st, vv || 1) }));
      v.drums(bar, bar < 8 ? 'A' : 'B', (s, d, a1, a2) => ev.push({ s: sw(b0 + s), fn: (t, st) => (d === 'riser' ? DR.riser(t, (a1 || 1) * 16 * st) : d === 'tom' ? DR.tom(t, a1, a2 == null ? 1 : a2) : DR[d](t, a1 == null ? 1 : a1, a2)) }));
      v.comp(bar, ch, (s, l, ins, f, vv) => ev.push({ s: sw(b0 + s), fn: (t, st) => INST[ins](t, f, l * st, vv || 1) }));
      v.extra(bar, (s, d, a1) => ev.push({ s: b0 + s, fn: (t) => DR[d](t, a1 == null ? 1 : a1) }));
    }
    ev.sort((a, b) => a.s - b.s);
    return ev;
  }

  const BY_ID = {}; VERSIONS.forEach((v) => { BY_ID[v.id] = v; });
  const BARS = {};
  function barsOf(id) {
    if (BARS[id]) return BARS[id];
    const bars = Array.from({ length: 16 }, () => []);
    for (const e of build(BY_ID[id])) {
      let b = Math.floor(e.s / 16);
      const rel = e.s - b * 16;
      b = ((b % 16) + 16) % 16;
      bars[b].push({ rel, fn: e.fn });
    }
    BARS[id] = bars;
    return bars;
  }
  const stepSec = (id) => 60 / BY_ID[id].bpm / 4;
  const BUS = {};
  function busFor(id) {
    if (!BUS[id]) { BUS[id] = ac.createGain(); BUS[id].gain.value = 0.0001; BUS[id].connect(master); }
    return BUS[id];
  }
  function setBus(id, t, v) { const g = busFor(id).gain; g.cancelScheduledValues(t); g.setValueAtTime(v, t); }
  function rampBus(id, t0, t1, from, to) { const g = busFor(id).gain; g.cancelScheduledValues(t0); g.setValueAtTime(from, t0); g.linearRampToValueAtTime(to, t1); }
  // 等功率交叉淡变
  function fadeBus(id, t0, dur, from, to, rising) {
    const g = busFor(id).gain, N = 32, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i / (N - 1); const k = rising ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); curve[i] = Math.max(0.0001, from + (to - from) * (rising ? k : 1 - k)); }
    g.cancelScheduledValues(t0);
    try { g.setValueCurveAtTime(curve, t0, dur); } catch (_) { g.setValueAtTime(from, t0); g.linearRampToValueAtTime(to, t0 + dur); }
  }
  /* 排一小节。st0 → st1：这一小节里每格的时长从 st0 线性变到 st1（变身小节里换速度用）。返回这一小节有多长 */
  function scheduleBar(id, bar, t0, st0, st1) {
    st0 = st0 || stepSec(id); st1 = st1 || st0;
    const k = (st1 - st0) / 32;
    const at = (rel) => t0 + st0 * rel + k * rel * rel;
    OUT = busFor(id);
    try {
      for (const e of barsOf(id)[bar]) {
        const t = at(e.rel);
        if (t >= ac.currentTime - 0.01) e.fn(Math.max(t, ac.currentTime), st0 + (st1 - st0) * Math.max(0, e.rel) / 16);
      }
    } finally { OUT = null; }
    return at(16) - t0;
  }

  /* ───── 导演：现在该放哪一版 ─────
   * 2026-11-27 跑了 8 局真实对局（AI 托管、正常节奏）看换版：一副牌约 2 分多钟，炸弹 2–6 个、多半挤在后半副；
   * 以前「一出炸弹就换炸场、放一圈回开打」，结果一副牌里来回换四五次、四成到六成时间在炸场，炸场不稀罕了；
   * 局间结算 → 进贡只有几秒，却先硬切到等桌、再硬切回开打。照炸弹猫的经验改：
   *  - 换版跟「这一副打到哪儿了」走，不跟单个事件走（炸弹猫按牌堆里炸弹猫的占比分档，不按谁抽到什么）。
   *    一副牌分两段：开局 → 开打；进入残局（有人报牌剩 10 张以内，或这副第二个炸弹）→ 炸场，一直放到这副打完。
   *    炸场连放两圈（约 50 秒）没有新动静，回开打歇一歇（炸弹猫：乙放满两圈降到丙）；再炸 / 再报牌又上去。
   *  - 单个炸弹只「踩一下」：在音乐的下一拍砸一声镲 + 底鼓（跟着节拍走，不打乱），不换版。
   *  - 只按全桌都看得见的信息（报牌、出了炸弹），不泄露谁手里有什么。
   *  - 换版都在乐句边界、用变身小节过渡（进炸场 = 两小节一句的句尾、变一小节 + 往上扫频；回开打 / 回等桌 = 一段的段尾、两小节 + 往下扫频）。
   *    只有进 / 出牌桌（开始页、房间 ↔ 一局）马上换。
   *  - 一盘里局与局之间（结算 → 进贡 → 下一副）不回等桌，只把炸场落回开打；整盘打完才回等桌。 */
  const D = { scene: 'off', mode: null, bombs: 0, quietBars: 0 };
  function setScene(scene) {
    if (scene === D.scene) return;
    const prev = D.scene;
    D.scene = scene;
    if (scene === 'menu') { D.mode = 'menu'; P.cut = true; }
    else if (scene === 'game' || scene === 'between') {
      if (prev !== 'game' && prev !== 'between') { D.mode = 'play'; P.cut = true; }   // 从牌桌外进来：马上换
      else if (scene === 'between' && D.mode === 'bomb') D.mode = 'play';             // 一副打完：炸场在段尾落回开打
    } else D.mode = null;
    kick();
  }
  const inHand = () => D.scene === 'game';
  function climax() { if (!inHand()) return; D.quietBars = 0; if (D.mode !== 'bomb') { D.mode = 'bomb'; kick(); } }
  // 新的一副牌发下来
  function onHandStart() { D.bombs = 0; D.quietBars = 0; if (D.scene !== 'menu' && D.mode === 'bomb') D.mode = 'play'; }
  // 有人出炸弹：踩一下；这副第二个炸弹起进残局
  function onBomb(tier) { if (!inHand()) return; D.bombs++; accent(tier >= 3 ? 1.2 : 1); if (D.bombs >= 2) climax(); else if (D.mode === 'bomb') D.quietBars = 0; }
  // 有人报牌剩几张（公开信息）：10 张以内进残局
  function onLeft(n) { if (n <= 10) climax(); }
  // 头游：踩一下
  function onFirstOut() { if (inHand()) accent(1); }
  // 整盘打完：回等桌（段尾慢慢变过去）
  function onMatchEnd() { if (D.scene === 'off') return; D.scene = 'between'; D.mode = 'menu'; kick(); }
  function onBar(id) { if (D.mode === 'bomb' && id === 'bomb' && ++D.quietBars >= 32) D.mode = 'play'; }
  const TRACK = { menu: 'lounge', play: 'play', bomb: 'bomb' };
  const target = () => (D.mode ? TRACK[D.mode] : null);

  /* 节拍时钟：每排一小节记一笔「哪一版、几点开始、每格多长」，「踩一下」对到下一拍 */
  const MARKS = [];
  function mark(id, t, st) { MARKS.push({ id, t, st }); if (MARKS.length > 12) MARKS.shift(); }
  function accent(v) {
    if (!ac || !P.on || !P.cur || ac.state !== 'running') return;
    const now = ac.currentTime + 0.03;
    let m = null; for (const x of MARKS) if (x.t <= now) m = x;
    if (!m) return;
    const beat = 4 * m.st, t = m.t + Math.ceil((now - m.t) / beat) * beat;
    OUT = busFor(m.id); DR.crash(t, 0.75 * v); DR.kick(t, 1.1 * v); OUT = null;
  }

  /* ───── 播放器：提前 1.2 秒一小节一小节排 ───── */
  const P = { on: false, cur: null, bar: 0, nextT: 0, timer: null, stopAt: 0, cut: false };
  const LEVELS = { lounge: 1.25, play: 1, bomb: 0.85 };
  const bridgeLen = (want) => (want === 'bomb' ? 1 : 2);
  // 进炸场：两小节一句的句尾（别踩在齐奏小节上）；回开打 / 等桌：一段的段尾
  const bridgeOk = (bar, want) => (want === 'bomb' ? bar % 2 === 1 && bar !== HIT_BAR : bar % 4 === 2);
  function pump() {
    sweep();
    if (!ac || !P.on || ac.state !== 'running') return;
    if (P.nextT < ac.currentTime) P.nextT = ac.currentTime + 0.06;
    if (P.cut) {
      P.cut = false;
      const want = target();
      if (want && P.cur && want !== P.cur) {
        const t = ac.currentTime;
        rampBus(P.cur, t, t + 0.45, busFor(P.cur).gain.value, 0.0001);
        P.cur = want; P.bar = 0; P.nextT = t + 0.12;
        setBus(want, P.nextT, LEVELS[want]);
        MARKS.length = 0;
        OUT = busFor(want); DR.crash(P.nextT, 0.7); DR.kick(P.nextT, 1); OUT = null;
      }
    }
    while (P.nextT < ac.currentTime + 1.2) {
      const want = target();
      if (!want && !P.cur) return;
      if (want && !P.cur) { P.cur = want; P.bar = 0; setBus(want, P.nextT, LEVELS[want]); }
      else if (!want) { fadeOut(); return; }
      else if (want !== P.cur && bridgeOk(P.bar, want)) {
        const from = P.cur, t0 = P.nextT, sa = stepSec(from), sb = stepSec(want), n = bridgeLen(want);
        let t = t0;
        for (let k = 0; k < n; k++) {
          const st0 = sa + (sb - sa) * k / n, st1 = sa + (sb - sa) * (k + 1) / n;
          scheduleBar(from, P.bar, t, st0, st1);
          mark(want, t, (st0 + st1) / 2);
          t += scheduleBar(want, P.bar, t, st0, st1);
          if (k < n - 1) P.bar = (P.bar + 1) % 16;
        }
        const dur = t - t0;
        fadeBus(from, t0, dur, LEVELS[from], 0.0001, false);
        fadeBus(want, t0, dur * 0.9, 0.0001, LEVELS[want], true);
        OUT = busFor(want);
        if (sb < sa) { DR.riser(t0 + dur * 0.35, dur * 0.65, 0.55); DR.crash(t0 + dur, 0.8); }
        else DR.fall(t0 + dur * 0.2, dur * 0.8, 0.5);
        OUT = null;
        P.cur = want; onBar(want);
        P.nextT = t; P.bar = (P.bar + 1) % 16;
        continue;
      }
      mark(P.cur, P.nextT, stepSec(P.cur));
      P.nextT += scheduleBar(P.cur, P.bar, P.nextT);
      onBar(P.cur);
      P.bar = (P.bar + 1) % 16;
    }
  }
  function fadeOut() {
    if (!P.cur) return;
    const t = ac.currentTime, g = busFor(P.cur).gain;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + 1.4);
    P.cur = null; P.bar = 0; P.stopAt = t + 1.5;
  }
  let LEVEL = 1;
  function kick() {
    if (!ac || !P.on) return;
    if (target() && !P.cur) {
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(LEVEL, t);
      P.nextT = Math.max(t + 0.08, P.stopAt > t ? P.stopAt : 0);
    }
    pump();
  }
  function start() {
    if (!ac) return;
    P.on = true;
    if (!P.timer) P.timer = setInterval(pump, 120);
    kick();
  }
  function stop() {
    P.on = false;
    if (P.timer) { clearInterval(P.timer); P.timer = null; }
    if (ac && master) { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0.0001, t + 0.25); }
    P.cur = null; P.bar = 0; P.stopAt = ac ? ac.currentTime + 0.3 : 0;
  }
  function connect(ctx, dest, level) { LEVEL = level == null ? 1 : level; return attach(ctx, dest, LEVEL); }

  root.GuandanMusic = {
    connect, start, stop, setScene, onBomb, onLeft, onFirstOut, onHandStart, onMatchEnd,
    playing: () => P.on,
    state: () => ({ scene: D.scene, mode: D.mode, track: P.cur, want: target(), bar: P.bar, bombs: D.bombs, quietBars: D.quietBars }),
    VERSIONS, MOTIF, INST, DR, freq, build, barsOf, scheduleBar, stepSec,
    _level: (id, t, v) => setBus(id, t, v),   // 离线自测 / 试听用：直接把某一版的通道开到某个音量
  };
})(typeof self !== 'undefined' ? self : this);
