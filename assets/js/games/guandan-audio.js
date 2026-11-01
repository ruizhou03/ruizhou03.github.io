(() => {
  'use strict';

  // 掼蛋声音（规格 4.3）：音效 / 报牌语音 / 背景音乐三条轨道，各自独立开关，记在本机。
  // - 音效：Web Audio 现场合成（落牌、叩桌、洗牌、炸弹分档、轮到我、倒计时、结算），无素材文件；
  // - 语音：一张语音精灵图 /assets/audio/guandan-voice.mp3（周睿本人录音，逐条挑选），首次需要时才加载；
  // - 音乐：现场生成的五声音阶拨弦，安静、不重复；默认关闭（D1）。
  // 语音播放时音乐自动压低一半，同一时刻只播一条语音，新的打断旧的。
  const contract = window.GuandanContract;
  const storage = window.GuandanStorage;
  const mutedKey = contract.storageKeys.muted;
  const prefsKey = contract.storageKeys.audio;
  const hasDom = typeof document !== 'undefined' && typeof document.addEventListener === 'function';

  const legacyMuted = storage.readText(mutedKey) === '1';
  const stored = storage.readJson(prefsKey, null);
  const prefs = {
    sfx: stored ? stored.sfx !== false : !legacyMuted,
    voice: stored ? stored.voice !== false : !legacyMuted,
    music: stored ? stored.music === true : false,
    musicHinted: !!(stored && stored.musicHinted),
  };
  function savePrefs() { storage.writeJson(prefsKey, prefs); }

  let context = null;
  let bus = null;
  function ensureContext() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    try { context = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
    const master = context.createGain();
    master.connect(context.destination);
    const make = value => { const g = context.createGain(); g.gain.value = value; g.connect(master); return g; };
    bus = { sfx: make(0.7), voice: make(0.85), music: make(0.16) };
    if (context.state === 'suspended') context.resume();
    return context;
  }

  // ---------- 音效 ----------
  let noiseBuffer = null;
  function noise(audio) {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(audio.sampleRate * 0.5);
    noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }
  function sfxReady() {
    if (!prefs.sfx) return null;
    return ensureContext();
  }
  // 一段滤波噪声：落牌的「啪」、叩桌、洗牌都由它拼出来
  function burst(audio, at, { dur, gain, type = 'bandpass', freq = 2400, q = 0.9 }) {
    const src = audio.createBufferSource();
    src.buffer = noise(audio);
    const filter = audio.createBiquadFilter();
    filter.type = type; filter.frequency.value = freq; filter.Q.value = q;
    const env = audio.createGain();
    env.gain.setValueAtTime(gain, at);
    env.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    src.connect(filter); filter.connect(env); env.connect(bus.sfx);
    src.start(at, Math.random() * 0.3); src.stop(at + dur + 0.02);
  }
  function tone(audio, at, { freq, dur, gain, type = 'sine', to = null, dest = null }) {
    const osc = audio.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
    const env = audio.createGain();
    env.gain.setValueAtTime(0.0008, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    osc.connect(env); env.connect(dest || bus.sfx);
    osc.start(at); osc.stop(at + dur + 0.02);
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
  const effects = Object.freeze({
    // 落牌：纸面高频一「啪」+ 桌面低频一「嗒」，每次略有变化
    play() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      burst(a, t, { dur: 0.05 + Math.random() * 0.02, gain: 0.5, freq: 2200 + Math.random() * 900, q: 0.8 });
      tone(a, t, { freq: 150, to: 90, dur: 0.07, gain: 0.35 });
    },
    // 不出：轻叩桌面两下
    pass() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      burst(a, t, { dur: 0.05, gain: 0.25, type: 'lowpass', freq: 700, q: 0.7 });
      tone(a, t, { freq: 210, to: 160, dur: 0.06, gain: 0.18 });
      burst(a, t + 0.11, { dur: 0.04, gain: 0.18, type: 'lowpass', freq: 650, q: 0.7 });
    },
    // 发牌：一串洗牌的沙沙声
    deal() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      for (let i = 0; i < 14; i++) {
        burst(a, t + i * 0.045 + Math.random() * 0.015, { dur: 0.03, gain: 0.16 + Math.random() * 0.08, freq: 3200 + Math.random() * 1500, q: 1.2 });
      }
    },
    // 炸弹：低频轰鸣，档位越高越长越响；同花顺 / 天王炸加一记金属泛音
    bomb(tier = 1) {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      const k = Math.min(7, Math.max(1, tier));
      const dur = 0.35 + k * 0.08;
      tone(a, t, { freq: 110, to: 38, dur, gain: 0.28 + k * 0.05, type: 'sine' });
      tone(a, t, { freq: 75, to: 30, dur: dur * 1.1, gain: 0.12 + k * 0.03, type: 'triangle' });
      burst(a, t, { dur: dur * 0.8, gain: 0.25 + k * 0.04, type: 'lowpass', freq: 900 + k * 120, q: 0.6 });
      if (k >= 4) burst(a, t + 0.12, { dur: dur * 0.6, gain: 0.12 + k * 0.02, type: 'lowpass', freq: 500, q: 0.5 });
      if (k === 3 || k === 7) {
        [1318.51, 1975.53, 2637.02].forEach((f, i) => tone(a, t + 0.05 + i * 0.07, { freq: f, dur: 0.9, gain: 0.07, type: 'triangle' }));
      }
    },
    // 轮到我：两个轻音
    turn() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      tone(a, t, { freq: 659.25, dur: 0.18, gain: 0.09 });
      tone(a, t + 0.11, { freq: 783.99, dur: 0.24, gain: 0.08 });
    },
    // 倒计时最后 5 秒：木鱼般的短促一声
    tick() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      tone(a, t, { freq: 1180, dur: 0.05, gain: 0.08, type: 'triangle' });
    },
    // 强行出不合法的牌
    error() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      tone(a, t, { freq: 240, to: 180, dur: 0.12, gain: 0.08, type: 'triangle' });
    },
    win() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      [0, 2, 4, 5].forEach((n, i) => tone(a, t + i * 0.12, { freq: PENTA[n], dur: 0.5, gain: 0.1, type: 'triangle' }));
    },
    lose() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      [4, 2, 1].forEach((n, i) => tone(a, t + i * 0.18, { freq: PENTA[n] / 2, dur: 0.6, gain: 0.09, type: 'triangle' }));
    },
    levelUp() {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      [0, 1, 2, 3, 4].forEach((n, i) => tone(a, t + i * 0.07, { freq: PENTA[n], dur: 0.35, gain: 0.08, type: 'triangle' }));
    },
    matchEnd(win) {
      const a = sfxReady(); if (!a) return;
      const t = a.currentTime;
      const seq = win ? [0, 2, 4, 5, 7] : [5, 4, 2, 1, 0];
      seq.forEach((n, i) => tone(a, t + i * 0.16, { freq: win ? PENTA[n] : PENTA[n] / 2, dur: 0.7, gain: 0.1, type: 'triangle' }));
    },
  });

  // ---------- 报牌语音 ----------
  // 精灵图里每条语音的 [起点秒, 时长秒]，由 scripts/build-guandan-voice.mjs 生成后写进这里。
  const VOICE_URL = '/assets/audio/guandan-voice.mp3?v=' + contract.releaseMarker;
  const VOICE_MAP = /* VOICE_MAP_START */ {"b-10":[0,0.759],"b-4":[0.909,0.592],"b-5":[1.651,0.67],"b-6":[2.471,0.678],"b-7":[3.298,0.72],"b-8":[4.168,0.649],"b-9":[4.967,0.692],"b-joker":[5.809,0.809],"c-pair-str":[6.767,0.75],"c-str-flush":[7.667,0.854],"c-straight":[8.67,0.746],"c-triple-pair":[9.566,0.83],"c-triple-str":[10.546,0.684],"e-first":[11.381,0.653],"e-jiefeng":[12.183,0.731],"e-kanggong":[13.065,0.577],"left-10":[13.792,2.7],"left-2":[16.642,2.741],"left-5":[19.533,2.502],"p-10":[22.185,0.611],"p-2":[22.946,0.614],"p-3":[23.71,0.602],"p-4":[24.462,0.72],"p-5":[25.331,0.702],"p-6":[26.183,0.584],"p-7":[26.917,0.587],"p-8":[27.655,0.626],"p-9":[28.431,0.603],"p-A":[29.184,0.605],"p-BJ":[29.938,0.865],"p-J":[30.953,0.624],"p-K":[31.727,0.569],"p-Q":[32.446,0.664],"p-SJ":[33.26,0.756],"pass-1":[34.166,0.455],"pass-1b":[34.771,0.47],"pass-2":[35.39,0.402],"pass-2b":[35.943,0.417],"pass-3":[36.509,0.783],"pass-3b":[37.443,0.732],"s-10":[38.325,0.575],"s-2":[39.05,0.44],"s-3":[39.64,0.495],"s-4":[40.285,0.642],"s-5":[41.077,0.562],"s-6":[41.788,0.487],"s-7":[42.426,0.505],"s-8":[43.081,0.451],"s-9":[43.682,0.643],"s-A":[44.476,0.473],"s-BJ":[45.098,0.692],"s-J":[45.94,0.456],"s-K":[46.546,0.472],"s-Q":[47.168,0.475],"s-SJ":[47.793,0.716],"t-10":[48.658,0.856],"t-2":[49.664,0.859],"t-3":[50.672,0.841],"t-4":[51.664,0.814],"t-5":[52.627,0.87],"t-6":[53.647,0.753],"t-7":[54.55,0.838],"t-8":[55.538,0.907],"t-9":[56.596,0.925],"t-A":[57.671,0.838],"t-J":[58.659,0.819],"t-K":[59.628,0.815],"t-Q":[60.593,0.814]} /* VOICE_MAP_END */;
  let voiceBuffer = null;
  let voiceLoading = null;
  let voiceNodes = [];
  let voiceEndAt = 0;        // 已排上的语音最晚播到哪一刻（AudioContext 时间）
  let priorityUntil = 0;     // 排队播的提醒（报牌、头游）播完前，普通报牌让路
  function loadVoice() {
    if (voiceBuffer || voiceLoading) return voiceLoading;
    const audio = ensureContext();
    if (!audio || typeof fetch !== 'function' || !Object.keys(VOICE_MAP).length) return null;
    voiceLoading = fetch(VOICE_URL)
      .then(r => { if (!r.ok) throw new Error('voice_fetch_' + r.status); return r.arrayBuffer(); })
      .then(bytes => new Promise((resolve, reject) => audio.decodeAudioData(bytes, resolve, reject)))
      .then(buffer => { voiceBuffer = buffer; return buffer; })
      .catch(() => { voiceLoading = null; return null; });
    return voiceLoading;
  }
  // voice(id)：普通报牌，打断上一条立刻播；voice(id, { queue: true })：提醒类，接在正在播的那条后面，
  // 播完之前来的普通报牌直接跳过（牌面上看得到），免得一句「我就剩五张牌了」被下一家的「过」截断。
  function voice(id, opts) {
    if (!prefs.voice || !id || !VOICE_MAP[id]) return;
    const audio = ensureContext();
    if (!audio) return;
    if (!voiceBuffer) { loadVoice(); return; }   // 第一次只触发加载，不补播过期的报牌
    const [start, dur] = VOICE_MAP[id];
    const now = audio.currentTime;
    const queue = !!(opts && opts.queue);
    if (!queue && now < priorityUntil) return;
    if (!queue) {
      for (const n of voiceNodes) { try { n.stop(); } catch (_) {} }
      voiceNodes = [];
    }
    const at = queue ? Math.max(now, voiceEndAt) : now;
    const src = audio.createBufferSource();
    src.buffer = voiceBuffer;
    src.connect(bus.voice);
    // +0.08 s：mp3 编码器前置延迟可能让整段后移几十毫秒，多留一点免得切掉尾音（条间有 0.15 s 静音）
    src.start(at, start, dur + 0.08);
    src.onended = () => { voiceNodes = voiceNodes.filter(n => n !== src); };
    voiceNodes.push(src);
    voiceEndAt = at + dur + 0.08;
    if (queue) priorityUntil = voiceEndAt;
    duckMusic(voiceEndAt - now);
  }

  // ---------- 背景音乐：五声音阶拨弦，随机慢行 ----------
  const SCALE = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88];
  let musicTimer = null;
  let musicIdx = 5;
  let echo = null;
  function pluck(audio, at, freq, gain) {
    const osc = audio.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, at);
    const over = audio.createOscillator();
    over.type = 'sine';
    over.frequency.setValueAtTime(freq * 2.01, at);
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.setValueAtTime(2400, at); filter.frequency.exponentialRampToValueAtTime(600, at + 1.8);
    const env = audio.createGain();
    env.gain.setValueAtTime(0.0008, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0008, at + 2.6);
    const overEnv = audio.createGain();
    overEnv.gain.value = 0.25;
    osc.connect(filter); over.connect(overEnv); overEnv.connect(filter);
    filter.connect(env); env.connect(bus.music); env.connect(echo);
    osc.start(at); over.start(at); osc.stop(at + 2.7); over.stop(at + 2.7);
  }
  function ensureEcho(audio) {
    if (echo) return;
    echo = audio.createDelay(1.0);
    echo.delayTime.value = 0.42;
    const fb = audio.createGain();
    fb.gain.value = 0.32;
    const wet = audio.createGain();
    wet.gain.value = 0.45;
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(bus.music);
  }
  function musicStep() {
    musicTimer = null;
    if (!prefs.music || !context) return;
    const hidden = hasDom && document.hidden;
    if (!hidden) {
      const t = context.currentTime + 0.02;
      musicIdx = Math.max(0, Math.min(SCALE.length - 1, musicIdx + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      pluck(context, t, SCALE[musicIdx], 0.5);
      if (Math.random() < 0.22) pluck(context, t + 0.02, SCALE[Math.max(0, musicIdx - 3)], 0.3);
    }
    const rest = Math.random() < 0.14 ? 3200 : 900 + Math.random() * 1300;
    musicTimer = setTimeout(musicStep, rest);
  }
  function startMusic() {
    if (musicTimer || !prefs.music) return;
    const audio = ensureContext();
    if (!audio) return;
    ensureEcho(audio);
    musicTimer = setTimeout(musicStep, 300);
  }
  function stopMusic() {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  function duckMusic(seconds) {
    if (!bus || !context) return;
    const g = bus.music.gain;
    const t = context.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.08, t, 0.05);
    g.setTargetAtTime(0.16, t + seconds, 0.25);
  }

  // ---------- 声音按钮与三轨开关 ----------
  const LABELS = { sfx: '音效', voice: '报牌语音', music: '背景音乐' };
  let panel = null;
  function allOff() { return !prefs.sfx && !prefs.voice && !prefs.music; }
  function refreshButton() {
    if (!hasDom) return;
    const button = document.getElementById('gdMuteBtn');
    if (button) {
      button.textContent = '[[zi:volume]]';
      button.setAttribute('aria-pressed', allOff() ? 'true' : 'false');
      button.setAttribute('aria-label', '声音设置' + (allOff() ? '（已全部关闭）' : ''));
      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', panel && !panel.hidden ? 'true' : 'false');
      button.classList.toggle('is-off', allOff());
      if (window.ZirconIcons) window.ZirconIcons.hydrate(button);
    }
    if (panel) {
      for (const key of Object.keys(LABELS)) {
        const box = panel.querySelector('input[data-track="' + key + '"]');
        if (box) box.checked = !!prefs[key];
      }
    }
  }
  function setTrack(key, on) {
    prefs[key] = !!on;
    if (key === 'music') prefs.musicHinted = true;
    savePrefs();
    storage.writeText(mutedKey, allOff() ? '1' : '0');
    if (key === 'music') { if (on) startMusic(); else stopMusic(); }
    if (key === 'voice' && on) loadVoice();
    refreshButton();
  }
  function buildPanel() {
    if (panel || !hasDom) return panel;
    const button = document.getElementById('gdMuteBtn');
    if (!button || !button.parentNode) return null;
    panel = document.createElement('div');
    panel.className = 'gd-sound-panel';
    panel.id = 'gdSoundPanel';
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '声音');
    panel.hidden = true;
    for (const key of Object.keys(LABELS)) {
      const row = document.createElement('label');
      row.className = 'gd-sound-row';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.track = key;
      box.checked = !!prefs[key];
      box.addEventListener('change', () => setTrack(key, box.checked));
      const text = document.createElement('span');
      text.textContent = LABELS[key];
      row.append(box, text);
      panel.append(row);
    }
    button.parentNode.insertBefore(panel, button.nextSibling);
    document.addEventListener('click', e => {
      if (!panel.hidden && !e.target.closest('#gdSoundPanel, #gdMuteBtn')) closePanel();
    });
    panel.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); closePanel(); button.focus(); }
    });
    return panel;
  }
  // 贴着声音按钮下方展开，不出屏。按钮会随开始页 / 牌桌、宽版 / 矮版换位置，
  // 所以面板打开期间每 300ms 跟一次按钮。
  let followTimer = null;
  function placePanel() {
    const button = document.getElementById('gdMuteBtn');
    if (!button || !panel) return;
    const r = button.getBoundingClientRect();
    const w = panel.offsetWidth || 160;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    panel.style.top = Math.round(r.bottom + 6) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    clearInterval(followTimer);
    followTimer = null;
    refreshButton();
  }
  // 点声音按钮：展开 / 收起三轨开关（原来是一键静音）
  function toggle() {
    ensureContext();
    buildPanel();
    if (!panel) return allOff();
    if (panel.hidden) {
      panel.hidden = false;
      placePanel();
      clearInterval(followTimer);
      followTimer = setInterval(placePanel, 300);
    } else {
      closePanel();
    }
    refreshButton();
    if (!panel.hidden) { const first = panel.querySelector('input'); if (first) first.focus(); }
    return allOff();
  }

  // 浏览器要求先有用户手势才能出声：第一次点按时启动上下文、预载语音、按偏好开音乐
  if (hasDom) {
    const unlock = () => {
      ensureContext();
      if (prefs.voice) loadVoice();
      if (prefs.music) startMusic();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  }

  window.GuandanAudio = Object.freeze({
    effects,
    voice,
    toggle,
    refreshButton,
    isMuted: allOff,
    prefs: () => Object.assign({}, prefs),
    markMusicHinted() { prefs.musicHinted = true; savePrefs(); },
  });
  refreshButton();
})();
