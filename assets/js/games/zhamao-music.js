/* 猫咪炸毛 · 背景音乐（window.ZhamaoMusic）—— 2026-11-12 用户在试听页里挑定
 *
 * 四版编曲都从同一段「影子」长出来（A 小调两小节：往上一路琶音 → 「炸毛」似的半音抖动 → 落回主音），
 * 共用同一套 16 小节和弦进行（A 段影子 / 答句 / 影子 / 收尾 + B 段碎片接龙），所以中途换版接着当前小节往下走，和声不断。
 *   丁 funk   118 拍  游戏外：主页、设置、建房、等人
 *   甲 chase  152 拍  开局常驻
 *   乙 chip   160 拍  「进入紧急状态」：炸毛猫概率第一次到 25%，或危险又升一档（25 → 40 → 60%）
 *   丙 circus 176 拍  紧急之后的常态：概率掉回 15% 以下 / 有人炸出局 / 乙连续放满两圈（约 50 秒）；一局里不再回甲
 * 换版不硬切（用户 2026-11-12 嫌突兀）：只在乐句边界换（进乙 = 两小节一句的句尾，其余 = 四小节一段的段尾），
 * 换之前那一小节是「变身小节」——新旧两版同时奏同一小节（旋律和弦本来就一样），旧版淡出、新版淡入，
 * 速度在这一小节里从旧速平滑滑到新速；往紧张走垫一道往上的扫频、新句第一拍砸镲，往放松走垫往下的扫频。
 * 只按公开信息判断（牌堆里还剩几只炸毛猫 ÷ 牌堆张数、有没有人炸出局）：联机时大家坐在一起，
 * 要是按「我偷看到顶上是炸毛猫」换歌，等于把私密信息放给全桌听。
 * 合成器全是 Web Audio 现场合成，没有素材文件。ZhamaoAudio 建好 AudioContext 后 attach 到它的音乐总线上。 */
(function (root) {
  'use strict';
  /* ───── 音名 ───── */
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    const midi = (+m[3] + 1) * 12 + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const up = (n, k) => { const f = freq(n) * Math.pow(2, k / 12); return f; };

  /* ───── 旋律（以 16 分音符为一格；两小节 32 格）───── */
  const MOTIF = [[0,2,'A4'],[2,2,'C5'],[4,2,'E5'],[6,3,'A5'],[10,1,'G5'],[11,1,'E5'],[12,1,'D#5'],[13,3,'E5'],[16,2,'C5'],[20,2,'A4'],[24,1,'E4'],[25,1,'G4'],[26,6,'A4']];
  const ANSWER = [[0,2,'F4'],[2,2,'A4'],[4,2,'C5'],[6,3,'F5'],[10,1,'E5'],[11,1,'C5'],[12,1,'B4'],[13,3,'C5'],[16,2,'B4'],[20,2,'G#4'],[24,1,'E4'],[25,1,'G#4'],[26,6,'B4']];
  const ENDING = [[0,2,'A4'],[2,2,'C5'],[4,2,'E5'],[6,2,'A5'],[8,2,'C6'],[10,1,'B5'],[11,1,'A5'],[12,1,'G#5'],[13,3,'A5'],[16,1,'E5'],[17,1,'C5'],[18,1,'A4'],[19,1,'E4'],[20,4,'A4']];
  const B1 = [[0,1,'C5'],[1,1,'A4'],[2,1,'G#4'],[3,1,'A4'],[4,2,'C5'],[6,2,'F5'],[8,1,'D5'],[9,1,'B4'],[10,1,'A#4'],[11,1,'B4'],[12,2,'D5'],[14,2,'G5'],[16,1,'E5'],[17,1,'D5'],[18,1,'C5'],[19,1,'B4'],[20,2,'A4'],[22,2,'B4'],[24,4,'D5'],[28,4,'G4']];
  const B2 = [[0,1,'B4'],[1,1,'G4'],[2,1,'F#4'],[3,1,'G4'],[4,2,'B4'],[6,2,'E5'],[8,1,'G5'],[9,1,'E5'],[10,1,'D#5'],[11,1,'E5'],[12,4,'B5'],[16,1,'A5'],[17,1,'E5'],[18,1,'C5'],[19,1,'A4'],[20,2,'C5'],[22,2,'E5'],[24,8,'A5']];
  const B4 = [[0,1,'E4'],[1,1,'F4'],[2,1,'F#4'],[3,1,'G4'],[4,1,'G#4'],[5,1,'A4'],[6,1,'A#4'],[7,1,'B4'],[8,1,'C5'],[9,1,'C#5'],[10,1,'D5'],[11,1,'D#5'],[12,4,'E5'],[16,1,'E5'],[20,1,'E5'],[24,1,'E5'],[26,1,'G#5'],[28,4,'B5']];
  const octUp = (ph, pick) => ph.map((x, i) => (pick(i, x) ? [x[0], x[1], name12(x[2], 12)] : x));
  function name12(n, k) { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); return m[1] + (m[2] || '') + (+m[3] + k / 12); }
  // 16 小节：A（影子 / 答句 / 影子 / 收尾）+ B（碎片接龙 ×2 + 半音爬升）
  function song(v) {
    const B3 = v.crazyB3 ? octUp(B1, (i) => i % 4 === 3 || i === 5 || i === 11) : B1;
    return [MOTIF, ANSWER, v.motifVar ? v.motifVar(MOTIF) : MOTIF, ENDING, B1, B2, B3, B4];
  }
  // 每小节的和弦（根音 + 和弦音）
  const CH = { Am: ['A', ['A3','C4','E4']], F: ['F', ['F3','A3','C4']], E: ['E', ['E3','G#3','B3']], G: ['G', ['G3','B3','D4']], Em: ['E', ['E3','G3','B3']] };
  const PROG = ['Am','Am','F','E','Am','Am','F','E',   'F','G','Em','Am','F','G','E','E'];
  const BASSN = { A: 'A1', F: 'F1', E: 'E1', G: 'G1' };

  /* ───── 合成器 ───── */
  let ac = null, master = null, fxDelay, fxVerb, noiseBuf = null, OUT = null;   // OUT：正在排的这一版自己的音量通道（换版时两版各自淡入淡出）
  /* 接到一个 AudioContext 的某个节点上（游戏里是 ZhamaoAudio 的音乐总线；离线自测可以接 OfflineAudioContext） */
  function attach(ctx, dest, level) {
    ac = ctx; noiseBuf = null;
    master = ac.createGain(); master.gain.value = level == null ? 1 : level;
    master.connect(dest);
    // 回声
    const d = ac.createDelay(1); d.delayTime.value = 0.3; const fb = ac.createGain(); fb.gain.value = 0.28; const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2600;
    d.connect(dl); dl.connect(fb); fb.connect(d); dl.connect(master);
    fxDelay = ac.createGain(); fxDelay.gain.value = 0.2; fxDelay.connect(d);
    // 小房间混响
    const conv = ac.createConvolver(); const len = Math.floor(ac.sampleRate * 1.4); const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    conv.buffer = ir; fxVerb = ac.createGain(); fxVerb.gain.value = 0.22; fxVerb.connect(conv); conv.connect(master);
    return master;
  }
  function noise() { if (noiseBuf) return noiseBuf; const n = ac.sampleRate; noiseBuf = ac.createBuffer(1, n, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
  function out(g, send) { g.connect(OUT || master); if (send && send.delay) { const s = ac.createGain(); s.gain.value = send.delay; g.connect(s); s.connect(fxDelay); } if (send && send.verb) { const s = ac.createGain(); s.gain.value = send.verb; g.connect(s); s.connect(fxVerb); } }
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), Math.max(t + a + d, end));
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + a + d, end) + rel);
  }
  function osc(type, f, t, end, detune) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune; o.start(t); o.stop(end + 0.6); return o; }
  function vibrato(o, t, rate, cents) { const l = ac.createOscillator(); l.frequency.value = rate; const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cents, t + 0.18); l.connect(g); g.connect(o.detune); l.start(t); l.stop(t + 4); }

  const INST = {
    xylo(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.003, 0.22 * v, 0.25, 0.001, 0.05, t); osc('sine', f, t, t + 0.4).connect(g); const g2 = ac.createGain(); env(g2, t, 0.002, 0.06 * v, 0.06, 0.001, 0.02, t); osc('sine', f * 3.98, t, t + 0.1).connect(g2); g2.connect(g); out(g, { verb: 0.5 }); },
    clar(t, f, dur, v = 1) { const o = osc('square', f, t, t + dur); vibrato(o, t, 5.4, 14); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 1.2; const g = ac.createGain(); env(g, t, 0.02, 0.07 * v, 0.1, 0.8, 0.06, t + dur); o.connect(lp); lp.connect(g); out(g, { delay: 0.25, verb: 0.3 }); },
    chip(t, f, dur, v = 1) { const o = osc('square', f, t, t + dur); vibrato(o, t, 6, 18); const g = ac.createGain(); env(g, t, 0.004, 0.07 * v, 0.08, 0.7, 0.04, t + dur * 0.92); o.connect(g); const o2 = osc('square', f * 2, t, t + dur, 7); const g2 = ac.createGain(); env(g2, t, 0.004, 0.022 * v, 0.06, 0.5, 0.03, t + dur * 0.9); o2.connect(g2); g2.connect(g); out(g, { delay: 0.35, verb: 0.15 }); },
    accordion(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.03, 0.06 * v, 0.08, 0.85, 0.06, t + dur); const trem = ac.createGain(); trem.gain.value = 1; const lfo = ac.createOscillator(); lfo.frequency.value = 6.5; const lg = ac.createGain(); lg.gain.value = 0.25; lfo.connect(lg); lg.connect(trem.gain); lfo.start(t); lfo.stop(t + dur + 0.4); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; [-9, 9].forEach((dt) => osc('sawtooth', f, t, t + dur, dt).connect(lp)); lp.connect(trem); trem.connect(g); out(g, { verb: 0.35 }); },
    brass(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(3200, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1300, t + 0.25); const g = ac.createGain(); env(g, t, 0.02, 0.07 * v, 0.12, 0.6, 0.05, t + dur); [-6, 6].forEach((dt) => osc('sawtooth', f, t, t + dur, dt).connect(lp)); lp.connect(g); out(g, { delay: 0.2, verb: 0.25 }); },
    glock(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.002, 0.08 * v, 0.6, 0.001, 0.1, t); osc('sine', f * 2, t, t + 0.8).connect(g); out(g, { verb: 0.6, delay: 0.2 }); },
    piano(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.004, 0.2 * v, 0.5, 0.25, 0.25, t + dur); osc('triangle', f, t, t + dur).connect(g); const g2 = ac.createGain(); env(g2, t, 0.003, 0.05 * v, 0.2, 0.1, 0.1, t + dur); osc('sine', f * 2, t, t + dur).connect(g2); g2.connect(g); out(g, { verb: 0.4 }); },
    // 低音
    pizz(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.003, 0.32 * v, 0.18, 0.001, 0.04, t); osc('triangle', f, t, t + 0.3).connect(g); out(g); },
    synthBass(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.16); const g = ac.createGain(); env(g, t, 0.004, 0.2 * v, 0.1, 0.6, 0.03, t + dur * 0.85); osc('sawtooth', f, t, t + dur).connect(lp); osc('square', f / 2, t, t + dur).connect(lp); lp.connect(g); out(g); },
    tuba(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.02, 0.3 * v, 0.12, 0.3, 0.05, t + dur * 0.6); osc('triangle', f, t, t + dur).connect(g); const g2 = ac.createGain(); g2.gain.value = 0.4; osc('sine', f * 2, t, t + dur).connect(g2); g2.connect(g); out(g); },
    slap(t, f, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(320, t + 0.09); const g = ac.createGain(); env(g, t, 0.002, 0.24 * v, 0.12, 0.35, 0.03, t + dur * 0.7); osc('square', f, t, t + dur).connect(lp); lp.connect(g); const sub = ac.createGain(); env(sub, t, 0.004, 0.2 * v, 0.2, 0.4, 0.04, t + dur * 0.7); osc('sine', f, t, t + dur).connect(sub); sub.connect(g); out(g); },
    // 和弦
    pad(t, fs, dur, v = 1) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; const g = ac.createGain(); env(g, t, 0.25, 0.035 * v, 0.3, 0.8, 0.4, t + dur); fs.forEach((f) => [-10, 10].forEach((dt) => osc('sawtooth', f, t, t + dur, dt).connect(lp))); lp.connect(g); out(g, { verb: 0.5 }); },
    stab(t, fs, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.003, 0.05 * v, 0.1, 0.001, 0.03, t); fs.forEach((f) => osc('triangle', f, t, t + 0.25).connect(g)); out(g, { verb: 0.3 }); },
    arp(t, f, dur, v = 1) { const g = ac.createGain(); env(g, t, 0.002, 0.035 * v, 0.06, 0.001, 0.02, t); osc('square', f, t, t + 0.12).connect(g); out(g, { delay: 0.3 }); },
    scratch(t, fs, dur, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 2; const g = ac.createGain(); env(g, t, 0.002, 0.08 * v, 0.04, 0.001, 0.01, t); src.connect(bp); bp.connect(g); src.start(t); src.stop(t + 0.1); fs.forEach((f) => { const o = osc('triangle', f * 2, t, t + 0.08); const gg = ac.createGain(); env(gg, t, 0.002, 0.03 * v, 0.05, 0.001, 0.01, t); o.connect(gg); gg.connect(g); }); out(g); },
  };
  // 鼓
  const DR = {
    kick(t, v = 1) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); const g = ac.createGain(); env(g, t, 0.002, 0.9 * v, 0.16, 0.001, 0.04, t); o.connect(g); out(g); o.start(t); o.stop(t + 0.35); },
    snare(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; const g = ac.createGain(); env(g, t, 0.002, 0.35 * v, 0.14, 0.001, 0.03, t); src.connect(hp); hp.connect(g); out(g, { verb: 0.3 }); src.start(t); src.stop(t + 0.25); const o = ac.createOscillator(); o.frequency.setValueAtTime(200, t); const g2 = ac.createGain(); env(g2, t, 0.002, 0.25 * v, 0.07, 0.001, 0.02, t); o.connect(g2); out(g2); o.start(t); o.stop(t + 0.15); },
    clap(t, v = 1) { for (let i = 0; i < 3; i++) { const tt = t + i * 0.011; const src = ac.createBufferSource(); src.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 0.9; const g = ac.createGain(); env(g, tt, 0.001, 0.32 * v, i === 2 ? 0.13 : 0.02, 0.001, 0.02, tt); src.connect(bp); bp.connect(g); out(g, { verb: 0.35 }); src.start(tt); src.stop(tt + 0.2); } },
    hat(t, v = 1, open) { const src = ac.createBufferSource(); src.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000; const g = ac.createGain(); env(g, t, 0.001, 0.12 * v, open ? 0.22 : 0.035, 0.001, 0.02, t); src.connect(hp); hp.connect(g); out(g); src.start(t); src.stop(t + 0.3); },
    crash(t, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000; const g = ac.createGain(); env(g, t, 0.002, 0.16 * v, 1.2, 0.001, 0.2, t); src.connect(hp); hp.connect(g); out(g, { verb: 0.4 }); src.start(t); src.stop(t + 1.6); },
    block(t, v = 1) { const o = ac.createOscillator(); o.frequency.value = 1050; const g = ac.createGain(); env(g, t, 0.001, 0.18 * v, 0.05, 0.001, 0.01, t); o.connect(g); out(g, { verb: 0.3 }); o.start(t); o.stop(t + 0.1); },
    tom(t, f, v = 1) { const o = ac.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.2); const g = ac.createGain(); env(g, t, 0.002, 0.4 * v, 0.2, 0.001, 0.03, t); o.connect(g); out(g, { verb: 0.3 }); o.start(t); o.stop(t + 0.3); },
    riser(t, dur, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + dur); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05); src.connect(bp); bp.connect(g); out(g, { verb: 0.3 }); src.start(t); src.stop(t + dur + 0.1); },
    fall(t, dur, v = 1) { const src = ac.createBufferSource(); src.buffer = noise(); src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5; bp.frequency.setValueAtTime(5000, t); bp.frequency.exponentialRampToValueAtTime(350, t + dur); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07 * v, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(bp); bp.connect(g); out(g, { verb: 0.4 }); src.start(t); src.stop(t + dur + 0.1); },
    boom(t, v = 1) { DR.kick(t, 1.2 * v); const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.6); const g = ac.createGain(); env(g, t, 0.003, 0.6 * v, 0.6, 0.001, 0.1, t); o.connect(g); out(g, { verb: 0.5 }); o.start(t); o.stop(t + 0.9); DR.crash(t, 0.8 * v); },
    meow(t, v = 1) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(820, t + 0.12); o.frequency.exponentialRampToValueAtTime(480, t + 0.4); const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1600, t + 0.15); f1.frequency.linearRampToValueAtTime(800, t + 0.4); const g = ac.createGain(); env(g, t, 0.03, 0.22 * v, 0.2, 0.5, 0.1, t + 0.3); o.connect(f1); f1.connect(g); out(g, { verb: 0.4 }); o.start(t); o.stop(t + 0.6); },
  };

  /* ───── 四个版本 ─────
   * 每版：bpm、swing（0–0.33）、lead 主奏乐器、bass/drums/comp 伴奏写法、对影子的小改动 */
  const VERSIONS = [
    { id: 'chase', name: '甲 · 猫捉老鼠', tag: '152 拍 · 卡通追逐', desc: '木琴 + 单簧管一起唱影子，拨弦低音一步一步追，小军鼓滚奏、木鱼点缀；B 段一声「喵」开场。俏皮、跑动感强。',
      bpm: 152, swing: 0, lead: ['xylo', 'clar'], motifVar: null, crazyB3: false,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; [0, 4, 8, 12].forEach((s, i) => add(s, 3, 'pizz', i % 2 ? up(r, 7 + 12) : up(r, 12))); },
      drums(bar, sec, add) { add(0, 'kick'); add(8, 'kick'); add(4, 'snare'); add(12, 'snare'); for (let s = 0; s < 16; s += 2) add(s, 'hat', 0.7); if (bar % 4 === 3) [12, 13, 14, 15].forEach((s) => add(s, 'snare', 0.5)); if (bar % 2) add(14, 'block'); },
      comp(bar, ch, add) { [2, 6, 10, 14].forEach((s) => add(s, 1, 'stab', ch[1].map((n) => freq(n) * 2), 0.7)); },
      extra(bar, add) { if (bar === 8) add(0, 'meow'); if (bar === 0) add(0, 'crash'); } },
    { id: 'chip', name: '乙 · 电子炸毛', tag: '160 拍 · 芯片电子', desc: '方波主奏带颤音、上方叠一层十六分音符琶音；四拍底鼓、拍手、反拍开镲，低音一拍一下「泵」起来；B 段第三句整体高八度、最后一句半音爬升 + 噪音蓄力，回到 A 时砸下去。最刺激的一版。',
      bpm: 160, swing: 0, lead: ['chip'], motifVar: null, crazyB3: true,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; for (let s = 0; s < 16; s += 2) add(s, 2, 'synthBass', s % 4 === 2 ? up(r, 24) : up(r, 12)); },
      drums(bar, sec, add) { [0, 4, 8, 12].forEach((s) => add(s, 'kick')); add(4, 'clap'); add(12, 'clap'); [2, 6, 10, 14].forEach((s) => add(s, 'hat', 0.9, true)); [1, 3, 5, 7, 9, 11, 13, 15].forEach((s) => add(s, 'hat', 0.4)); if (bar === 15) add(0, 'riser', 2); },
      comp(bar, ch, add) { const notes = ch[1].map((n) => freq(n) * 4); for (let s = 0; s < 16; s++) add(s, 1, 'arp', notes[s % 3] * (s % 6 >= 3 ? 2 : 1), 0.9); add(0, 16, 'pad', ch[1].map((n) => freq(n) * 2), 0.8); },
      extra(bar, add) { if (bar === 0) add(0, 'crash'); if (bar === 8) add(0, 'crash'); } },
    { id: 'circus', name: '丙 · 疯狂马戏团', tag: '176 拍 · 嘭恰嘭恰', desc: '手风琴似的主奏 + 钟琴叠高八度，每个长音前加一下装饰音；大号「嘭」、和弦「恰」交替；镲片一下下炸开。B 段旋律八度乱跳、半音一路冲上去，最疯的一版。',
      bpm: 176, swing: 0, lead: ['accordion', 'glock'], grace: true, motifVar: null, crazyB3: true,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; add(0, 3, 'tuba', up(r, 12)); add(8, 3, 'tuba', up(r, 19)); },
      drums(bar, sec, add) { add(0, 'kick'); add(8, 'kick'); [4, 12].forEach((s) => add(s, 'snare', 0.6)); if (bar % 2 === 0) add(0, 'crash', 0.6); if (bar % 4 === 3) [8, 10, 12, 14].forEach((s, i) => add(s, 'tom', 140 + i * 30)); },
      comp(bar, ch, add) { [4, 12].forEach((s) => add(s, 2, 'stab', ch[1].map((n) => freq(n) * 2), 1)); },
      extra(bar, add) { } },
    { id: 'funk', name: '丁 · 导火索放克', tag: '118 拍 · 摇摆律动', desc: '铜管短促地吹影子（几个音提前半拍、更俏皮），拍击低音满地跑、扫弦「刺啦」点在反拍，踩镲像滴答的定时器；B 段末尾半音往上爬、一声「嘭」全停，再从头。最有张力的一版。',
      bpm: 118, swing: 0.22, lead: ['brass'], motifVar: (ph) => ph.map((x) => ((x[0] === 6 || x[0] === 26) ? [x[0] - 1, x[1] + 1, x[2]] : x)), crazyB3: false,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; [[0, 2, 12], [3, 1, 12], [6, 1, 24], [8, 2, 12], [10, 1, 19], [11, 1, 22], [14, 2, 12]].forEach(([s, l, k]) => add(s, l, 'slap', up(r, k))); },
      drums(bar, sec, add) { add(0, 'kick'); add(7, 'kick', 0.7); add(10, 'kick'); add(4, 'snare'); add(12, 'snare'); for (let s = 0; s < 16; s++) add(s, 'hat', s % 2 ? 0.35 : 0.6); if (bar === 15) { add(8, 'riser', 1); } },
      comp(bar, ch, add) { [2, 6, 10, 15].forEach((s) => add(s, 1, 'scratch', ch[1].map(freq), 0.9)); },
      extra(bar, add) { if (bar === 15) add(14, 'boom'); if (bar === 0) add(0, 'crash', 0.7); } },
  ];

  /* ───── 编排：把一版展开成一圈 256 格的事件表 ───── */
  function build(v) {
    const ev = [];   // { s: 格（可带小数）, fn: (t, stepSec) => void }
    const phrases = song(v);
    const sw = (s) => s + ((Math.floor(s) % 2 === 1) ? v.swing : 0);
    for (let p = 0; p < 8; p++) {
      const base = p * 32;
      for (const [s, l, n] of phrases[p]) {
        const f = freq(n);
        const at = base + s;
        v.lead.forEach((ins, li) => ev.push({ s: sw(at), fn: (t, st) => INST[ins](t, li ? f * (ins === 'glock' ? 1 : 1) : f, l * st, li ? 0.8 : 1) }));
        if (v.grace && l >= 2) ev.push({ s: sw(at) - 0.35, fn: (t, st) => INST[v.lead[0]](t, f * Math.pow(2, 2 / 12), 0.3 * st, 0.6) });
      }
    }
    for (let bar = 0; bar < 16; bar++) {
      const ch = CH[PROG[bar]], b0 = bar * 16;
      v.bass(bar, ch, (s, l, ins, f, vv) => ev.push({ s: sw(b0 + s), fn: (t, st) => INST[ins](t, f, l * st, vv || 1) }));
      v.drums(bar, bar < 8 ? 'A' : 'B', (s, d, a1, a2) => ev.push({ s: sw(b0 + s), fn: (t, st) => (d === 'riser' ? DR.riser(t, (a1 || 1) * 16 * st) : d === 'tom' ? DR.tom(t, a1) : DR[d](t, a1 == null ? 1 : a1, a2)) }));
      v.comp(bar, ch, (s, l, ins, f, vv) => ev.push({ s: sw(b0 + s), fn: (t, st) => INST[ins](t, f, l * st, vv || 1) }));
      v.extra(bar, (s, d, a1) => ev.push({ s: b0 + s, fn: (t) => DR[d](t, a1 == null ? 1 : a1) }));
    }
    ev.sort((a, b) => a.s - b.s);
    return ev;
  }
  // 只放影子：钢琴音色、两遍
  const MOTIF_V = { id: 'motif', bpm: 140, build() { const ev = []; for (let r = 0; r < 2; r++) for (const [s, l, n] of MOTIF) ev.push({ s: r * 32 + s, fn: (t, st) => INST.piano(t, freq(n), l * st) }); return ev; }, steps: 64 };


  const BY_ID = {}; VERSIONS.forEach((v) => { BY_ID[v.id] = v; });

  /* ───── 编排：每版按小节切好（16 小节一圈），播放时一小节一小节往前排 ───── */
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
  // 每版自己一条音量通道，换版时两条各自淡入淡出
  const BUS = {};
  function busFor(id) {
    if (!BUS[id]) { BUS[id] = ac.createGain(); BUS[id].gain.value = 0.0001; BUS[id].connect(master); }
    return BUS[id];
  }
  function setBus(id, t, v) { const g = busFor(id).gain; g.cancelScheduledValues(t); g.setValueAtTime(v, t); }
  function rampBus(id, t0, t1, from, to) {
    const g = busFor(id).gain;
    g.cancelScheduledValues(t0); g.setValueAtTime(from, t0); g.linearRampToValueAtTime(to, t1);
  }
  // 等功率交叉淡变：直线淡变两版交接的中间总音量会塌一截（听着像「空了一下」），用 sin / cos 曲线就不会
  function fadeBus(id, t0, dur, from, to, rising) {
    const g = busFor(id).gain, N = 32, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i / (N - 1); const k = rising ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); curve[i] = Math.max(0.0001, from + (to - from) * (rising ? k : 1 - k)); }
    g.cancelScheduledValues(t0);
    try { g.setValueCurveAtTime(curve, t0, dur); } catch (_) { g.setValueAtTime(from, t0); g.linearRampToValueAtTime(to, t0 + dur); }
  }
  /* 排一小节。st0 → st1：这一小节里每格的时长从 st0 线性变到 st1（变身小节里换速度用）；平时两个一样。返回这一小节有多长 */
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
  const D = { scene: 'off', mode: null, announced: 0, urgentBars: 0, p: 0 };
  const tierOf = (p) => (p >= 0.6 ? 3 : p >= 0.4 ? 2 : p >= 0.25 ? 1 : 0);
  function setScene(scene) {
    if (scene === D.scene && scene !== 'game') return;
    if ((scene === 'game' || scene === 'menu') && scene !== D.scene) P.cut = true;   // 进 / 出一局：马上换，不等乐句（用户嫌开局等太久）
    D.scene = scene;
    if (scene === 'menu') D.mode = 'menu';
    else if (scene === 'game') { D.mode = 'calm'; D.announced = 0; D.urgentBars = 0; D.p = 0; }
    else D.mode = null;
    kick();
  }
  function setDanger(p) {
    if (D.scene !== 'game' || !(p >= 0)) return;
    D.p = p;
    const tier = tierOf(p);
    if (p < 0.15) {
      D.announced = 0;
      if (D.mode === 'urgent') D.mode = 'sustain';
      return;
    }
    if (tier > D.announced) {   // 第一次到 25%，或又升了一档：宣告紧急
      D.announced = tier;
      D.mode = 'urgent';
      D.urgentBars = 0;
    }
  }
  // 有人炸出局：紧急状态告一段落 → 丙（之后要再升一档才回乙）
  function onOut() {
    if (D.scene !== 'game') return;
    if (D.mode === 'urgent') D.mode = 'sustain';
    D.announced = Math.max(D.announced, tierOf(D.p));
  }
  function onBar(id) {
    if (D.mode === 'urgent' && id === 'chip' && ++D.urgentBars >= 32) D.mode = 'sustain';   // 乙连续两圈还没变化：降到丙，别一直绷着
  }
  const TRACK = { menu: 'funk', calm: 'chase', urgent: 'chip', sustain: 'circus' };
  const target = () => (D.mode ? TRACK[D.mode] : null);

  /* ───── 播放器：提前 0.5 秒一小节一小节排；换版要等到乐句边界，用一个「变身小节」过渡 ───── */
  const P = { on: false, cur: null, bar: 0, nextT: 0, timer: null, stopAt: 0, cut: false };
  const LEVELS = { funk: 1, chase: 1, chip: 0.85, circus: 0.9 };
  // 变身从哪一小节开始：进乙（紧张）= 句尾那一小节、变一小节；往放松走 = 一段的最后两小节、慢慢变两小节。做完新版正好从一句的开头进来
  const bridgeLen = (want) => (want === 'chip' ? 1 : 2);
  const bridgeOk = (bar, want) => (want === 'chip' ? bar % 2 === 1 : bar % 4 === 2);
  function pump() {
    if (!ac || !P.on) return;
    if (ac.state !== 'running') return;
    if (P.nextT < ac.currentTime) P.nextT = ac.currentTime + 0.06;   // 掉帧 / 切回前台：别补排一堆过期的小节
    // 场景切换（主页 ↔ 一局）：旧的半秒内淡掉，新的马上从第 1 小节起，第一拍砸一下
    if (P.cut) {
      P.cut = false;
      const want = target();
      if (want && P.cur && want !== P.cur) {
        const t = ac.currentTime;
        rampBus(P.cur, t, t + 0.45, busFor(P.cur).gain.value, 0.0001);
        P.cur = want; P.bar = 0; P.nextT = t + 0.12;
        setBus(want, P.nextT, LEVELS[want]);
        OUT = busFor(want); DR.crash(P.nextT, 0.8); DR.kick(P.nextT, 1); OUT = null;
      }
    }
    while (P.nextT < ac.currentTime + 0.5) {
      const want = target();
      if (!want && !P.cur) return;
      if (want && !P.cur) {
        // 从静音起：从第 1 小节开始
        P.cur = want; P.bar = 0;
        setBus(want, P.nextT, LEVELS[want]);
      } else if (!want) { fadeOut(); return; }
      else if (want !== P.cur && bridgeOk(P.bar, want)) {
        // 变身：新旧两版同奏这一（两）小节，等功率交叉淡变 + 速度一格格平滑滑过去
        const from = P.cur, t0 = P.nextT, sa = stepSec(from), sb = stepSec(want), n = bridgeLen(want);
        let t = t0;
        for (let k = 0; k < n; k++) {
          const st0 = sa + (sb - sa) * k / n, st1 = sa + (sb - sa) * (k + 1) / n;
          scheduleBar(from, P.bar, t, st0, st1);
          const d = scheduleBar(want, P.bar, t, st0, st1);
          t += d;
          if (k < n - 1) { P.bar = (P.bar + 1) % 16; }
        }
        const dur = t - t0;
        fadeBus(from, t0, dur, LEVELS[from], 0.0001, false);
        fadeBus(want, t0, dur * 0.9, 0.0001, LEVELS[want], true);
        OUT = busFor(want);
        if (sb < sa) { DR.riser(t0 + dur * 0.35, dur * 0.65, 0.55); if (want === 'chip') DR.crash(t0 + dur, 0.8); }
        else DR.fall(t0 + dur * 0.2, dur * 0.8, 0.5);
        OUT = null;
        P.cur = want;
        onBar(want);
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
  function kick() {
    if (!ac || !P.on) return;
    if (target() && !P.cur) {
      // 从静音起：等上一段淡完，再从第 1 小节开始
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(LEVEL, t);
      P.nextT = Math.max(t + 0.08, P.stopAt > t ? P.stopAt : 0);
    }
    pump();
  }
  let LEVEL = 1;
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

  root.ZhamaoMusic = {
    connect, start, stop, setScene, setDanger, onOut,
    state: () => ({ scene: D.scene, mode: D.mode, track: P.cur, want: target(), announced: D.announced, urgentBars: D.urgentBars, p: D.p, bar: P.bar }),
    VERSIONS, MOTIF, INST, freq, build, barsOf, scheduleBar, stepSec,
    _attach: attach,
  };
})(typeof self !== 'undefined' ? self : this);
