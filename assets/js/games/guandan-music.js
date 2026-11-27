/* 掼蛋 · 背景音乐（window.GuandanMusic）—— 2026-11-27 用户：照炸弹猫的做法，要一小段有记忆点的 motif，旋律、编曲都要记得住。
 *
 * 三版编曲都从同一句「影子」长出来（D 宫五声，两小节）：「嘀嗒当」一个十六分音符的回音转 → 一路走到长音，
 * 第二小节同一个转身往下落回。三版共用同一套 16 小节和弦（A 段：影子 / 答句 / 影子 / 收尾；B 段：抒情两句 + 回头 + 一路爬回去），
 * 所以中途换版接着当前小节往下走，和声不断（和 zhamao-music.js 同一套办法）。
 *   茶馆  96 拍  牌桌外：开始页、房间、结算——古筝拨弦 + 刮奏，笛子在 B 段接过旋律，梆子轻轻点拍
 *   开打 128 拍  一局里常驻——琵琶领奏（长音用轮指）、笛子高八度叠一层，大阮跑低音，堂鼓、梆子、小镲；每段开头一声小锣「呛」
 *   炸场 152 拍  有人出炸弹后切过来——唢呐领奏 + 琵琶，大鼓四拍、铙钹砸反拍；放满一圈没人再炸就回「开打」
 * 进 / 出一局马上换；炸弹进「炸场」在下一小节就变身；回「开打」等到一段的段尾、两小节慢慢变回去。
 * 全部 Web Audio 现场合成（拨弦乐器用 Karplus-Strong 弦模型），没有素材文件。GuandanAudio 建好上下文后接到它的音乐总线上。 */
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
  function shift(n, oct) { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); return m[1] + (m[2] || '') + (+m[3] + oct); }

  /* ───── 旋律（16 分音符一格；一句两小节 32 格）───── */
  // 影子：嘀嗒当 · 当 当 · 当 当 当——（往上走到 F#），第二小节同一个转身落回 A
  const MOTIF = [[0,1,'D5'],[1,1,'E5'],[2,2,'D5'],[4,2,'B4'],[6,2,'A4'],[8,2,'D5'],[10,2,'E5'],[12,4,'F#5'],
    [16,1,'E5'],[17,1,'F#5'],[18,2,'E5'],[20,2,'D5'],[22,2,'B4'],[24,8,'A4']];
  // 答句：同一个转身，从高处起
  const ANSWER = [[0,1,'F#5'],[1,1,'A5'],[2,2,'F#5'],[4,2,'E5'],[6,2,'D5'],[8,2,'B4'],[10,2,'D5'],[12,4,'E5'],
    [16,1,'D5'],[17,1,'E5'],[18,2,'D5'],[20,2,'B4'],[22,2,'A4'],[24,2,'B4'],[26,6,'D5']];
  // 收尾：转身往上冲到 G，再落回主音
  const ENDING = [[0,1,'D5'],[1,1,'E5'],[2,2,'D5'],[4,2,'B4'],[6,1,'A4'],[7,1,'B4'],[8,2,'D5'],[10,2,'G5'],[12,4,'E5'],
    [16,1,'E5'],[17,1,'F#5'],[18,2,'E5'],[20,1,'D5'],[21,1,'B4'],[22,2,'A4'],[24,1,'B4'],[25,1,'A4'],[26,6,'D5']];
  // B 段：长音抒情两句
  const B1 = [[0,3,'B4'],[3,1,'D5'],[4,4,'F#5'],[8,2,'E5'],[10,2,'D5'],[12,4,'B4'],
    [16,3,'A4'],[19,1,'B4'],[20,4,'D5'],[24,2,'B4'],[26,2,'A4'],[28,4,'G4']];
  const B2 = [[0,3,'A4'],[3,1,'D5'],[4,4,'F#5'],[8,2,'A5'],[10,2,'F#5'],[12,4,'E5'],
    [16,1,'D5'],[17,1,'E5'],[18,2,'D5'],[20,2,'F#5'],[22,2,'E5'],[24,8,'A4']];
  // 爬回去：一口气跑上 A5，「当、当、当」三下停住，让给鼓
  const B4 = [[0,1,'D4'],[1,1,'E4'],[2,1,'F#4'],[3,1,'A4'],[4,1,'B4'],[5,1,'D5'],[6,1,'E5'],[7,1,'F#5'],[8,2,'A5'],[10,2,'F#5'],[12,4,'A5'],
    [16,1,'E5'],[17,1,'F#5'],[18,2,'E5'],[20,2,'A5'],[22,2,'A5'],[24,2,'A5']];
  const octUp = (ph) => ph.map((x) => [x[0], x[1], shift(x[2], 1)]);
  function song(v) {
    return [MOTIF, ANSWER, v.motifVar ? v.motifVar(MOTIF) : MOTIF, ENDING, B1, B2, v.b3Up ? octUp(B1) : B1, B4];
  }
  // 每小节的和弦（根音 + 和弦音）
  const CH = { D: ['D', ['D4','F#4','A4']], A: ['A', ['A3','C#4','E4']], Bm: ['B', ['B3','D4','F#4']], G: ['G', ['G3','B3','D4']] };
  const PROG = ['D','A','Bm','D','D','A','G','D',   'Bm','G','D','A','Bm','G','D','A'];
  const BASSN = { D: 'D2', A: 'A1', B: 'B1', G: 'G1' };
  const PENTA = ['D','E','F#','A','B'];

  /* ───── 合成器 ───── */
  let ac = null, master = null, fxDelay, fxVerb, noiseBuf = null, OUT = null;
  function attach(ctx, dest, level) {
    if (ac && ac !== ctx) { Object.keys(BUS).forEach((k) => delete BUS[k]); Object.keys(KS).forEach((k) => delete KS[k]); P.cur = null; P.bar = 0; P.nextT = 0; }
    ac = ctx; noiseBuf = null; VOICES.length = 0;
    master = ac.createGain(); master.gain.value = level == null ? 1 : level;
    master.connect(dest);
    // 回声（笛子、唢呐用）
    const d = ac.createDelay(1); d.delayTime.value = 0.36; const fb = ac.createGain(); fb.gain.value = 0.26; const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2800;
    d.connect(dl); dl.connect(fb); fb.connect(d); dl.connect(master);
    fxDelay = ac.createGain(); fxDelay.gain.value = 0.2; fxDelay.connect(d);
    // 厅堂混响（比炸弹猫的长一点，像在茶馆里）
    const conv = ac.createConvolver(); const len = Math.floor(ac.sampleRate * 1.9); const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    conv.buffer = ir; fxVerb = ac.createGain(); fxVerb.gain.value = 0.24; fxVerb.connect(conv); conv.connect(master);
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

  /* Karplus-Strong 弦：一小段噪声在「弦长」那么长的延迟里来回走、每走一圈抹平一点。每个音高、每种乐器算一次存起来。
   * 弦长只能取整数个采样，取大一点再用 playbackRate 调回准音（高音也不跑调）；playbackRate 顺带用来做滑音、揉弦 */
  const KS = {};
  const KS_KIND = {
    pipa:  { dur: 1.3, decay: 0.9965, bright: 0.85 },
    zheng: { dur: 2.4, decay: 0.9985, bright: 0.5 },
    ruan:  { dur: 2.0, decay: 0.9975, bright: 0.35 },
  };
  function ks(f, kind) {
    const sr = ac.sampleRate, N = Math.ceil(sr / f), key = kind + N;
    const rate = f * (N + 0.5) / sr;
    if (KS[key]) return { buf: KS[key], rate };
    const k = KS_KIND[kind], len = Math.floor(sr * k.dur), b = ac.createBuffer(1, len, sr), d = b.getChannelData(0);
    let lp = 0, mean = 0;
    for (let i = 0; i <= N; i++) { lp += ((Math.random() * 2 - 1) - lp) * k.bright; d[i] = lp; mean += lp; }
    mean /= N + 1; for (let i = 0; i <= N; i++) d[i] -= mean;
    for (let i = N + 1; i < len; i++) d[i] = k.decay * 0.5 * (d[i - N] + d[i - N - 1]);
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i]));
    if (pk > 0) for (let i = 0; i < len; i++) d[i] /= pk;
    KS[key] = b;
    return { buf: b, rate };
  }
  // 拨一下弦。opt.slide：从低一个全音滑上来；opt.vib：长音揉弦
  function pluck(kind, t, f, dur, v, opt) {
    opt = opt || {};
    const { buf, rate } = ks(f, kind);
    const src = ac.createBufferSource(); src.buffer = buf;
    if (opt.slide) { src.playbackRate.setValueAtTime(rate * Math.pow(2, -2 / 12), t); src.playbackRate.exponentialRampToValueAtTime(rate, t + 0.09); }
    else src.playbackRate.setValueAtTime(rate, t);
    if (opt.vib) { const l = ac.createOscillator(); l.frequency.value = 5.2; const lg = ac.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.22); lg.gain.linearRampToValueAtTime(rate * 0.012, t + 0.4); l.connect(lg); lg.connect(src.playbackRate); l.start(t); l.stop(t + dur + 1); }
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opt.lp || 5000; lp.Q.value = 0.5;
    const g = ac.createGain();
    const ring = opt.ring == null ? 0.25 : opt.ring;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + Math.max(0.02, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, dur) + ring);
    src.connect(lp); lp.connect(g);
    src.start(t); src.stop(t + dur + ring + 0.05);
    return g;
  }
  // 拨片 / 指甲碰弦那一下的「嗒」
  function pick(t, v, f0) { const s = ac.createBufferSource(); s.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 || 3500; bp.Q.value = 1.2; const g = ac.createGain(); env(g, t, 0.001, v, 0.015, 0.001, 0.01, t); s.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.05); return g; }

  const INST = {
    // 琵琶：亮、短，带一下拨片声
    pipa(t, f, dur, v = 1) { const g = pluck('pipa', t, f, Math.min(dur, 0.9), 0.26 * v, { lp: 6500, ring: 0.18 }); const pk = pick(t, 0.05 * v, 4200); pk.connect(g); const pe = ac.createBiquadFilter(); pe.type = 'peaking'; pe.frequency.value = 1100; pe.gain.value = 5; pe.Q.value = 1.4; g.connect(pe); out(pe, { verb: 0.3 }, -0.2); },
    // 古筝：暖、余音长，长音揉弦，三拍的音从下面滑上来
    zheng(t, f, dur, v = 1) { const g = pluck('zheng', t, f, dur, 0.24 * v, { lp: 4200, ring: 0.7, vib: dur > 0.5 }); out(g, { verb: 0.45 }, 0.15); },
    zhengSlide(t, f, dur, v = 1) { const g = pluck('zheng', t, f, dur, 0.24 * v, { lp: 4200, ring: 0.7, vib: dur > 0.5, slide: true }); out(g, { verb: 0.45 }, 0.15); },
    zhengSoft(t, f, dur, v = 1) { const g = pluck('zheng', t, f, dur, 0.11 * v, { lp: 2600, ring: 0.5 }); out(g, { verb: 0.5 }, -0.3); },
    // 大阮：低音拨弦
    ruan(t, f, dur, v = 1) { const g = pluck('ruan', t, f, dur, 0.5 * v, { lp: 1400, ring: 0.12 }); out(g, { verb: 0.1 }); },
    // 笛子：正弦 + 一点三角波泛音 + 气声，起音略往上找音，长音后半段颤
    dizi(t, f, dur, v = 1) {
      const o = osc('sine', f, t, t + dur); const o2 = osc('triangle', f * 2, t, t + dur);
      o.frequency.setValueAtTime(f * 0.985, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      vibrato(o.detune, t, 5.6, 22, Math.min(0.25, dur * 0.4), dur + 1); vibrato(o2.detune, t, 5.6, 22, Math.min(0.25, dur * 0.4), dur + 1);
      const g = ac.createGain(); env(g, t, 0.035, 0.085 * v, 0.1, 0.8, 0.09, t + dur);
      const g2 = ac.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g); o.connect(g);
      const br = ac.createBufferSource(); br.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(9000, f * 2.5); bp.Q.value = 1.5; const bg = ac.createGain(); env(bg, t, 0.02, 0.03 * v, 0.06, 0.35, 0.05, t + dur); br.connect(bp); bp.connect(bg); bg.connect(g); br.start(t, Math.random() * 0.5); br.stop(t + dur + 0.2);
      out(g, { delay: 0.22, verb: 0.4 }, 0.25);
    },
    // 唢呐：两层锯齿过两个共振峰，鼻音重、亮；起音从下面挑上来，颤得宽
    suona(t, f, dur, v = 1) {
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4800;
      const f1 = ac.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = 1250; f1.gain.value = 10; f1.Q.value = 2;
      const f2 = ac.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 2900; f2.gain.value = 7; f2.Q.value = 2.5;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      [-5, 5].forEach((dt) => { const o = osc('sawtooth', f, t, t + dur, dt); o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); vibrato(o.detune, t, 6.2, 30, Math.min(0.2, dur * 0.4), dur + 1); o.connect(hp); });
      hp.connect(f1); f1.connect(f2); f2.connect(lp);
      const g = ac.createGain(); env(g, t, 0.025, 0.045 * v, 0.08, 0.8, 0.06, t + dur); lp.connect(g);
      out(g, { delay: 0.18, verb: 0.3 }, 0.1);
    },
    // 古筝刮奏：一把五声音阶从低往上扫
    gliss(t, f0, dur, v = 1) {
      const notes = []; for (let o = 4; o <= 5; o++) PENTA.forEach((n) => notes.push(n + o)); notes.push('D6');
      notes.forEach((n, i) => { const tt = t + i * (dur / notes.length); const g = pluck('zheng', tt, freq(n), 0.25, 0.07 * v * (0.6 + i / notes.length), { lp: 4500, ring: 0.8 }); out(g, { verb: 0.6 }, -0.1 + i * 0.03); });
    },
    // 琵琶扫弦和弦
    strum(t, fs, dur, v = 1) { fs.forEach((f, i) => { const g = pluck('pipa', t + i * 0.012, f, 0.12, 0.09 * v, { lp: 5000, ring: 0.1 }); out(g, { verb: 0.25 }, -0.35); }); },
  };
  // 打击乐
  const DR = {
    // 堂鼓：低、圆，带一下鼓皮声
    tanggu(t, v = 1) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(135, t); o.frequency.exponentialRampToValueAtTime(68, t + 0.18); const g = ac.createGain(); env(g, t, 0.002, 0.75 * v, 0.24, 0.001, 0.05, t); o.connect(g); o.start(t); o.stop(t + 0.4); const s = ac.createBufferSource(); s.buffer = noise(); const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const sg = ac.createGain(); env(sg, t, 0.001, 0.18 * v, 0.04, 0.001, 0.02, t); s.connect(lp); lp.connect(sg); sg.connect(g); s.start(t); s.stop(t + 0.1); out(g, { verb: 0.25 }); },
    // 大鼓：更低、更重
    dagu(t, v = 1) { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.22); const g = ac.createGain(); env(g, t, 0.002, 0.95 * v, 0.3, 0.001, 0.06, t); o.connect(g); o.start(t); o.stop(t + 0.5); out(g, { verb: 0.2 }); },
    // 梆子：清脆的木头声
    bangzi(t, v = 1) { const g = ac.createGain(); env(g, t, 0.001, 0.2 * v, 0.045, 0.001, 0.01, t); osc('sine', 1480, t, t + 0.08).connect(g); const g2 = ac.createGain(); g2.gain.value = 0.35; osc('sine', 2960 * 1.07, t, t + 0.05).connect(g2); g2.connect(g); out(g, { verb: 0.3 }, 0.35); },
    // 小镲：短促的「嚓」
    cha(t, v = 1) { const s = ac.createBufferSource(); s.buffer = noise(); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5500; const bp = ac.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 7200; bp.gain.value = 6; const g = ac.createGain(); env(g, t, 0.001, 0.13 * v, 0.09, 0.001, 0.03, t); s.connect(hp); hp.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + 0.2); out(g, { verb: 0.2 }, -0.25); },
    // 铙钹：比小镲大、余音长
    nao(t, v = 1) { const s = ac.createBufferSource(); s.buffer = noise(); const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.6; const g = ac.createGain(); env(g, t, 0.002, 0.2 * v, 0.5, 0.001, 0.15, t); s.connect(bp); bp.connect(g); s.start(t, Math.random() * 0.3); s.stop(t + 0.8); out(g, { verb: 0.35 }, 0.2); },
    // 小锣「呛」：音高往上挑
    luo(t, v = 1) { const g = ac.createGain(); env(g, t, 0.002, 0.13 * v, 0.9, 0.001, 0.2, t); [[1, 1], [1.48, 0.4], [2.03, 0.2]].forEach(([r, a]) => { const o = ac.createOscillator(); o.frequency.setValueAtTime(560 * r, t); o.frequency.exponentialRampToValueAtTime(690 * r, t + 0.35); const og = ac.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.2); }); DR.cha(t, 0.6 * v); out(g, { verb: 0.4 }, 0.15); },
    // 大锣：低、长，往下沉
    gong(t, v = 1) { const g = ac.createGain(); env(g, t, 0.01, 0.22 * v, 2.4, 0.001, 0.3, t); [[1, 1], [2.1, 0.35], [3.3, 0.18]].forEach(([r, a]) => { const o = ac.createOscillator(); o.frequency.setValueAtTime(150 * r, t); o.frequency.exponentialRampToValueAtTime(128 * r, t + 1.5); const og = ac.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + 3); }); const s = ac.createBufferSource(); s.buffer = noise(); const lp = ac.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 900; lp.Q.value = 0.7; const sg = ac.createGain(); env(sg, t, 0.005, 0.12 * v, 0.6, 0.001, 0.2, t); s.connect(lp); lp.connect(sg); sg.connect(g); s.start(t); s.stop(t + 1); out(g, { verb: 0.5 }); },
    // 鼓边滚奏（往回爬时用）
    roll(t, dur, v = 1) { const n = Math.max(4, Math.round(dur / 0.045)); for (let i = 0; i < n; i++) DR.tanggu(t + i * dur / n, v * (0.35 + 0.65 * i / n)); },
  };

  /* ───── 三个版本 ───── */
  const VERSIONS = [
    { id: 'teahouse', name: '茶馆', tag: '96 拍 · 古筝 + 笛子', desc: '牌桌外：古筝拨影子（长音揉弦、三拍的音滑上来），每段开头一把刮奏；B 段笛子接过旋律，梆子轻点二、四拍。',
      bpm: 96, swing: 0.1, lead: ['zheng'], leadB: ['dizi'], b3Up: false,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; add(0, 6, 'ruan', freq(r) * 2, 0.8); add(8, 6, 'ruan', up(r, 19), 0.6); },
      drums(bar, sec, add) { add(4, 'bangzi', 0.55); add(12, 'bangzi', 0.55); if (bar % 2 === 0) add(0, 'tanggu', 0.35); if (bar === 15) add(12, 'roll', 4, 0.4); },
      comp(bar, ch, add) { const ns = ch[1].map(freq); [0, 2, 4, 6, 8, 10, 12, 14].forEach((s, i) => add(s, 2, 'zhengSoft', ns[[0, 1, 2, 1][i % 4]] * (i % 4 === 2 ? 2 : 1), 0.9)); },
      extra(bar, add) { if (bar % 4 === 0) add(-2, 'gliss', 0.5, 1); if (bar === 0) add(0, 'gong', 0.5); } },
    { id: 'play', name: '开打', tag: '128 拍 · 琵琶 + 笛子', desc: '一局里：琵琶领奏（长音轮指）、笛子高八度叠一层；大阮跑低音，堂鼓「咚——咚咚」，梆子走八分、小镲点反拍；每段开头一声小锣「呛」。',
      bpm: 128, swing: 0, lead: ['pipa', 'diziHi'], trem: true, b3Up: false,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; [[0, 3, 12], [3, 1, 12], [6, 2, 19], [8, 3, 12], [11, 1, 24], [14, 2, 19]].forEach(([s, l, k]) => add(s, l, 'ruan', up(r, k))); },
      drums(bar, sec, add) { add(0, 'tanggu'); add(6, 'tanggu', 0.6); add(8, 'tanggu', 0.85); add(4, 'cha'); add(12, 'cha'); for (let s = 0; s < 16; s += 2) add(s, 'bangzi', s % 4 ? 0.45 : 0.7); if (bar % 4 === 3 && bar !== 15) [12, 13, 14, 15].forEach((s, i) => add(s, 'tanggu', 0.4 + i * 0.12)); if (bar === 15) add(8, 'roll', 8, 0.7); },
      comp(bar, ch, add) { [2, 10].forEach((s) => add(s, 1, 'strum', ch[1].map((n) => freq(n) * 2), 0.8)); },
      extra(bar, add) { if (bar % 8 === 0) add(0, 'luo', 1); if (bar === 15) add(14, 'luo', 0.8); } },
    { id: 'bomb', name: '炸场', tag: '152 拍 · 唢呐 + 锣鼓', desc: '有人出炸弹：唢呐吹影子、琵琶垫底；大鼓四拍、铙钹砸二四拍、梆子走十六分；B 段第三句整体高八度，最后鼓滚上去、大锣一砸再从头。',
      bpm: 152, swing: 0, lead: ['suona', 'pipa'], trem: true, b3Up: true,
      bass(bar, ch, add) { const r = BASSN[ch[0]]; for (let s = 0; s < 16; s += 2) add(s, 2, 'ruan', s % 4 === 2 ? up(r, 24) : up(r, 12), 0.9); },
      drums(bar, sec, add) { [0, 4, 8, 12].forEach((s) => add(s, 'dagu')); add(4, 'nao', 0.8); add(12, 'nao', 0.8); [2, 6, 10, 14].forEach((s) => add(s, 'cha', 0.8)); for (let s = 0; s < 16; s++) add(s, 'bangzi', s % 2 ? 0.25 : 0.4); if (bar === 15) add(8, 'roll', 8, 0.9); },
      comp(bar, ch, add) { [0, 6, 10].forEach((s) => add(s, 1, 'strum', ch[1].map((n) => freq(n) * 2), 1)); },
      extra(bar, add) { if (bar === 0 || bar === 8) add(0, 'gong', 0.8); if (bar % 4 === 0 && bar % 8) add(0, 'luo', 0.9); } },
  ];
  INST.diziHi = (t, f, dur, v) => INST.dizi(t, f * 2, dur, (v || 1) * 0.55);

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
        lead.forEach((ins, li) => {
          const vv = li ? 0.8 : 1;
          // 琵琶长音：轮指（32 分音符反复弹）
          if (ins === 'pipa' && v.trem && l >= 4) { for (let k = 0; k < l * 2 - 1; k++) ev.push({ s: sw(at) + k / 2, fn: (t, st) => INST.pipa(t, f, st * 0.6, vv * (k ? (k % 2 ? 0.5 : 0.62) : 1)) }); return; }
          // 古筝：三拍长的音从下面滑上来
          const name = (ins === 'zheng' && l === 3) ? 'zhengSlide' : ins;
          ev.push({ s: sw(at), fn: (t, st) => INST[name](t, f, l * st, vv) });
        });
      }
    }
    for (let bar = 0; bar < 16; bar++) {
      const ch = CH[PROG[bar]], b0 = bar * 16;
      v.bass(bar, ch, (s, l, ins, f, vv) => ev.push({ s: sw(b0 + s), fn: (t, st) => INST[ins](t, f, l * st, vv || 1) }));
      v.drums(bar, bar < 8 ? 'A' : 'B', (s, d, a1, a2) => ev.push({ s: sw(b0 + s), fn: (t, st) => (d === 'roll' ? DR.roll(t, a1 * st, a2 == null ? 1 : a2) : DR[d](t, a1 == null ? 1 : a1)) }));
      v.comp(bar, ch, (s, l, ins, f, vv) => ev.push({ s: sw(b0 + s), fn: (t, st) => INST[ins](t, f, l * st, vv || 1) }));
      v.extra(bar, (s, d, a1, a2) => ev.push({ s: b0 + s, fn: (t, st) => (d === 'gliss' ? INST.gliss(t, 0, a1, a2) : DR[d](t, a1 == null ? 1 : a1)) }));
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
  function fadeBus(id, t0, dur, from, to, rising) {
    const g = busFor(id).gain, N = 32, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i / (N - 1); const k = rising ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2); curve[i] = Math.max(0.0001, from + (to - from) * (rising ? k : 1 - k)); }
    g.cancelScheduledValues(t0);
    try { g.setValueCurveAtTime(curve, t0, dur); } catch (_) { g.setValueAtTime(from, t0); g.linearRampToValueAtTime(to, t0 + dur); }
  }
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
  const TRACK = { menu: 'teahouse', play: 'play', bomb: 'bomb' };
  const target = () => (D.mode ? TRACK[D.mode] : null);

  /* ───── 播放器：提前 1.2 秒一小节一小节排 ───── */
  const P = { on: false, cur: null, bar: 0, nextT: 0, timer: null, stopAt: 0, cut: false };
  const LEVELS = { teahouse: 1.5, play: 0.9, bomb: 0.8 };   // 茶馆本身轻，抬一点和开打听着差不多响
  const bridgeLen = (want) => (want === 'bomb' ? 1 : 2);
  const bridgeOk = (bar, want) => (want === 'bomb' ? true : bar % 4 === 2);
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
        OUT = busFor(want); DR.luo(P.nextT, 0.9); OUT = null;
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
        if (want === 'bomb') { DR.roll(t0 + dur * 0.5, dur * 0.5, 0.8); DR.gong(t0 + dur, 0.9); }
        else DR.luo(t0 + dur, 0.7);
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
    _level: (id, t, v) => setBus(id, t, v),   // 离线自测 / 试听页用：直接把某一版的通道开到某个音量
  };
})(typeof self !== 'undefined' ? self : this);
