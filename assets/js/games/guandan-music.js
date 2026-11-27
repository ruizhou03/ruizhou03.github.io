/* 掼蛋 · 背景音乐（window.GuandanMusic）
 * 2026-11-27 用户：照炸弹猫的做法，要一小段有记忆点的 motif。一天里改了四版：
 *   一版民乐被否（不要刻意中国风、要冲击力）；二版 D 小调 3+3+2 影子，用户觉得节奏不错；三版转 D 大调，听着像《欢乐颂》/ 儿歌，
 *   等桌又改得太平静。四版照炸弹猫的经验重写——炸弹猫抓耳在于：小调琶音一下跳满八度、半音「抖一下」的怪音（D#→E）、
 *   和声里带调外音（E 大三和弦），每版一个鲜明的曲风对一种情绪、各有一两样招牌声音，主页那版是放克，不是安静的。
 *
 * 影子（D 混合利底亚 + 布鲁斯，两小节）：保留用户认可的「咚——咚——咚嗒嗒嗒」3+3+2 节奏；
 *   咚 D → 咚 A（跳五度）→ 咚 C（降七级，一听就不是儿歌）→ 嗒嗒往下 → F→F#「布鲁斯三音」抖一下滑上去 → 当！A 停住；
 *   第二小节落到 C 和弦（bVII，摇滚 / 放克的味道），同样 Eb→E 抖一下。答句在 G 上翻到 D6，A#→B 半音抖（同炸弹猫的 D#→E）。
 * 和声：A 段 D7–C–G–D / D7–C–G–A7；B 段 Em7–A7 来回（放克 vamp，绷着）→ G–A7 → 借来的 Bb（用户点名喜欢的离调）→ A7 上全队齐奏三下砸回开头。
 *   等桌  112 拍  牌桌外：爵士放克——闷音小号吹影子（颤音琴高八度叠一层），切分的克拉维琴切和弦、拍击贝斯、响指 + 摇摆踩镲。有律动、有点「导火索」的张力，不催人
 *   开打  140 拍  一局里：斯卡（ska）大乐队——铜管齐奏（叠低八度），吉他 / 和弦在每个反拍「嚓」一下切，走步低音、军鼓；影子停在长音上，铜管「嗒、嗒」应两声
 *   炸场  160 拍  有人出炸弹：电子——厚锯齿主奏 + 铜管，四拍底鼓、反拍开镲、十六分芯片琶音、低音一拍一泵；放满一圈没人再炸就回「开打」
 * 进 / 出一局马上换；炸弹进「炸场」在下一小节就变身；回「开打」等到一段的段尾、两小节慢慢变回去（同 zhamao-music.js）。
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
  // 影子：咚 D —— 咚 A —— 咚 C，嗒嗒往下，F→F# 抖一下，当！A；第二小节落在 C 上，Eb→E 再抖一下
  const MOTIF = [[0,3,'D5'],[3,3,'A5'],[6,2,'C6'],[8,1,'B5'],[9,1,'A5'],[10,1,'F5'],[11,1,'F#5'],[12,4,'A5'],
    [16,3,'G5'],[19,3,'E5'],[22,2,'C5'],[24,1,'D5'],[25,1,'Eb5'],[26,2,'E5'],[28,4,'G5']];
  // 答句：同样的节奏在 G 上一路翻到 D6，A#→B 半音抖；第二小节回到 D
  const ANSWER = [[0,3,'B4'],[3,3,'G5'],[6,2,'D6'],[8,1,'C6'],[9,1,'B5'],[10,1,'A#5'],[11,1,'B5'],[12,4,'D6'],
    [16,3,'A5'],[19,3,'F#5'],[22,2,'D5'],[24,1,'E5'],[25,1,'F5'],[26,2,'F#5'],[28,4,'A5']];
  // 收尾：G 上再冲一次，落到 A7 上、往上扫到 A 停住，钩着 B 段
  const ENDING = [[0,3,'D5'],[3,3,'G5'],[6,2,'B5'],[8,1,'A5'],[9,1,'B5'],[10,1,'C6'],[11,1,'B5'],[12,4,'G5'],
    [16,3,'E5'],[19,3,'G5'],[22,2,'C#6'],[24,1,'B5'],[25,1,'A5'],[26,1,'G5'],[27,1,'E5'],[28,4,'A5']];
  // B 段：Em7–A7 来回的放克短句，句中留空让鼓和和弦接话
  const B1 = [[0,1,'E5'],[1,1,'G5'],[2,2,'B5'],[6,1,'A5'],[7,1,'B5'],[8,2,'D6'],[10,2,'B5'],[12,4,'A5'],
    [16,1,'C#5'],[17,1,'E5'],[18,2,'G5'],[22,1,'F#5'],[23,1,'G5'],[24,2,'A5'],[26,2,'G5'],[28,4,'E5']];
  const B2 = [[0,1,'E5'],[1,1,'G5'],[2,2,'B5'],[6,1,'A5'],[7,1,'B5'],[8,2,'D6'],[10,2,'B5'],[12,4,'A5'],
    [16,1,'C#5'],[17,1,'E5'],[18,2,'G5'],[22,1,'A5'],[23,1,'Bb5'],[24,8,'B5']];
  // 第三句：G 上同样 3+3+2，往上推到 A7 的高音 E
  const B3 = [[0,3,'B5'],[3,3,'G5'],[6,2,'D5'],[8,1,'E5'],[9,1,'G5'],[10,2,'A5'],[12,4,'B5'],
    [16,3,'C#6'],[19,3,'A5'],[22,2,'E5'],[24,1,'G5'],[25,1,'A5'],[26,2,'C#6'],[28,4,'E6']];
  // 爬回去：借来的 Bb 大三和弦（离调最提神——用户 2026-11-27 点名喜欢这里），再落到 A7 上全队齐奏：咚——咚——咚（3+3+2）掼回开头
  const B4 = [[0,1,'Bb4'],[1,1,'D5'],[2,1,'F5'],[3,1,'A5'],[4,4,'Bb5'],[8,1,'A5'],[9,1,'G5'],[10,1,'F5'],[11,1,'E5'],[12,4,'F5'],
    [16,2,'A4'],[19,2,'A4'],[22,2,'C#5'],[24,1,'E5'],[25,1,'G5'],[26,2,'A5']];
  function song() { return [MOTIF, ANSWER, MOTIF, ENDING, B1, B2, B3, B4]; }
  // 和弦（根音 + 排好声部的和弦音，全放在旋律下面、和弦之间走最近的音）
  const CH = {
    D7: ['D', ['F#3','A3','C4']], C: ['C', ['E3','G3','C4']], G: ['G', ['D3','G3','B3']], D: ['D', ['F#3','A3','D4']],
    A7: ['A', ['E3','G3','C#4']], Em7: ['E', ['D3','G3','B3']], Bb: ['Bb', ['F3','Bb3','D4']],
  };
  const PROG = ['D7','C','G','D','D7','C','G','A7',   'Em7','A7','Em7','A7','G','A7','Bb','A7'];
  const BASSN = { D: 'D2', C: 'C2', G: 'G1', A: 'A1', E: 'E2', Bb: 'Bb1' };
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
    // 闷音小号：同一副铜管、滤波压得低，带一点颤
    mute(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'bandpass'; lp.Q.value = 1.6; lp.frequency.setValueAtTime(Math.min(2400, f * 2.2), t); lp.frequency.exponentialRampToValueAtTime(Math.min(1800, f * 1.6), t + 0.2); const g = ac.createGain(); env(g, t, 0.015, 0.32 * v, 0.1, 0.65, 0.07, t + dur); [-5, 5].forEach((dt) => { const o = osc('sawtooth', f, t, t + dur, dt); vibrato(o.detune, t, 5.2, 14, 0.2, dur + 1); o.connect(lp); }); lp.connect(g); out(g, { delay: 0.22, verb: 0.3 }, 0.1); },
    vibeHi(t, f, dur, v = 1) { INST.vibe(t, f * 2, dur, 0.3 * v); },
    // 克拉维琴：短促、带「哇」的切音和弦
    clav(t, fs, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.002, 0.16 * v, 0.07, 0.25, 0.03, t + Math.min(dur, 0.12)); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(2600, t); bp.frequency.exponentialRampToValueAtTime(900, t + 0.1); fs.forEach((f) => { osc('square', f * 2, t, t + 0.3).connect(bp); osc('sawtooth', f * 4, t, t + 0.3, 4).connect(bp); }); bp.connect(g); out(g, { verb: 0.15 }, -0.35); },
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
    snap(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 2.5; const g = ac.createGain(); env(g, t, 0.001, 0.32 * v, 0.03, 0.001, 0.02, t); src.connect(bp); bp.connect(g); out(g, { verb: 0.5 }, 0.3); src.start(t, Math.random() * 0.5); src.stop(t + 0.1); },
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
    { id: 'lounge', name: '等桌', tag: '112 拍 · 爵士放克', desc: '牌桌外：闷音小号吹影子、颤音琴高八度轻轻叠着；克拉维琴切分着切和弦，拍击贝斯满地跑，响指打二四拍，摇摆踩镲。有律动、带点张力，但不催人。',
      bpm: 112, swing: 0.2, lead: ['mute', 'vibeHi'],
      bass(bar, ch, add) { const r = BASSN[ch[0]]; if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 2, 'slap', up(r, 12), 0.8)); return; } [[0, 2, 12], [3, 1, 12], [6, 1, 24], [8, 2, 12], [10, 1, 19], [11, 1, 22], [14, 2, 12]].forEach(([s, l, k]) => add(s, l, 'slap', up(r, k), 0.75)); },
      drums(bar, sec, add) { if (bar === HIT_BAR) { HITS.forEach((s) => { add(s, 'kick', 0.8); add(s, 'snap', 0.9); }); return; } add(0, 'kick', 0.7); add(7, 'kick', 0.45); add(10, 'kick', 0.6); add(4, 'snap'); add(12, 'snap'); add(12, 'rim', 0.5); for (let s = 0; s < 16; s++) add(s, 'hat', s % 2 ? 0.25 : 0.5); if (bar % 4 === 3) add(14, 'hat', 0.6, true); },
      comp(bar, ch, add) { const fs = ch[1].map(freq); if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 1, 'clav', fs, 1.2)); return; } [2, 5, 10, 13].forEach((s) => add(s, 1, 'clav', fs, s === 2 || s === 10 ? 1 : 0.7)); add(0, 16, 'rhodes', fs, 0.5); },
      extra(bar, add) { if (bar === 0) add(0, 'crash', 0.5); } },
    { id: 'play', name: '开打', tag: '140 拍 · 斯卡大乐队', desc: '一局里：铜管齐奏影子（叠低八度更厚）+ 清音吉他同奏；吉他和和弦在每个反拍「嚓」一下切（斯卡），走步低音、军鼓打二四拍；影子停在长音上，铜管「嗒、嗒」应两声。',
      bpm: 140, swing: 0, lead: ['brass', 'brassLow', 'gtr'],
      bass(bar, ch, add) { const r = BASSN[ch[0]]; if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 2, 'slap', up(r, 12))); return; } [[0, 12], [4, 19], [8, 24], [12, 22]].forEach(([s, k]) => add(s, 3, 'upright', up(r, k), 1.05)); },
      drums(bar, sec, add) { if (bar === HIT_BAR) { HITS.forEach((s) => { add(s, 'kick', 1.1); add(s, 'crash', 0.6); }); [10, 11, 12, 13, 14, 15].forEach((s, i) => add(s, 'snare', 0.35 + i * 0.1)); return; } add(0, 'kick'); add(8, 'kick', 0.8); add(4, 'snare'); add(12, 'snare'); for (let s = 0; s < 16; s += 2) add(s, 'hat', 0.55); if (bar % 4 === 3) [13, 14, 15].forEach((s, i) => add(s, 'tom', 220 - i * 40, 0.8)); },
      comp(bar, ch, add) { const fs2 = ch[1].map((n) => freq(n) * 2); if (bar === HIT_BAR) { HITS.forEach((s) => add(s, 1, 'stab', fs2, 1.1)); return; } [2, 6, 10, 14].forEach((s) => { add(s, 1, 'stab', fs2, 1.2); add(s, 1, 'clav', ch[1].map(freq), 1); }); if (bar === 1 || bar === 3 || bar === 5) [13, 14].forEach((st) => add(st, 1, 'stab', fs2, 1.3)); },
      extra(bar, add) { if (bar === 0 || bar === 8) add(0, 'crash', 0.7); if (bar === 1 || bar === 3 || bar === 5) { add(13, 'snare', 0.7); add(14, 'snare', 0.9); } } },
    { id: 'bomb', name: '炸场', tag: '160 拍 · 电子冲击', desc: '有人出炸弹：厚锯齿主奏 + 铜管，四拍底鼓、拍手、反拍开镲，十六分芯片琶音在上面闪，低音一拍一泵；最后一小节噪音蓄力，三下齐奏砸回开头。',
      bpm: 160, swing: 0, lead: ['saw', 'brass'],
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
      const ph = phrases[p];
      for (let i = 0; i < ph.length; i++) {
        const [s, l0, n] = ph[i];
        // 连起来唱：B 段每个音一直拖到下一个音（最长两拍），不再一下一下地点
        const l = (p >= 4 && v.legatoB) ? Math.min(8, (i + 1 < ph.length ? ph[i + 1][0] : 32) - s) : l0;
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

  /* ───── 导演：现在该放哪一版 ───── */
  const D = { scene: 'off', mode: null, bombBars: 0 };
  function setScene(scene) {
    if (scene === D.scene) return;
    const wasGame = D.scene === 'game';
    D.scene = scene;
    if (scene === 'menu') D.mode = 'menu';
    else if (scene === 'game') { if (!wasGame) D.mode = 'play'; }
    else D.mode = null;
    P.cut = true;   // 进 / 出一局：马上换，不等乐句
    kick();
  }
  // 有人出炸弹：进「炸场」；已经在炸场里就从头再计一圈
  function onBomb() {
    if (D.scene !== 'game') return;
    D.mode = 'bomb'; D.bombBars = 0;
    kick();
  }
  function onBar(id) { if (D.mode === 'bomb' && id === 'bomb' && ++D.bombBars >= 16) D.mode = 'play'; }
  const TRACK = { menu: 'lounge', play: 'play', bomb: 'bomb' };
  const target = () => (D.mode ? TRACK[D.mode] : null);

  /* ───── 播放器：提前 1.2 秒一小节一小节排 ───── */
  const P = { on: false, cur: null, bar: 0, nextT: 0, timer: null, stopAt: 0, cut: false };
  const LEVELS = { lounge: 1.1, play: 1, bomb: 0.85 };
  const bridgeLen = (want) => (want === 'bomb' ? 1 : 2);
  // 进炸场：哪一小节都行（但别踩在齐奏小节上）；回开打：一段的段尾
  const bridgeOk = (bar, want) => (want === 'bomb' ? bar !== HIT_BAR : bar % 4 === 2);
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
    connect, start, stop, setScene, onBomb,
    playing: () => P.on,
    state: () => ({ scene: D.scene, mode: D.mode, track: P.cur, want: target(), bar: P.bar, bombBars: D.bombBars }),
    VERSIONS, MOTIF, INST, DR, freq, build, barsOf, scheduleBar, stepSec,
    _level: (id, t, v) => setBus(id, t, v),   // 离线自测 / 试听用：直接把某一版的通道开到某个音量
  };
})(typeof self !== 'undefined' ? self : this);
