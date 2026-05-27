/* doudizhu/audio.js
 *
 * BGM + SFX 控制器。完全静态 — 不依赖 Suno API，所有音频文件靠 manifest 列出，
 * 用户用 Suno 网页生成 / 别处下载，按 manifest 的 file 字段放进 assets/audio/doudizhu/
 * 即可，本模块加载时按 manifest 试 fetch；缺文件 → 静默跳过，不弹错。
 *
 * 暴露在 window.DDZAudio：
 *   await DDZAudio.init({ mutedGetter })   // 等 manifest + 全部音频加载（缺的不算错）
 *   DDZAudio.unlockOnGesture()             // 用户首次点击后唤起 AudioContext（iOS / Chrome 自动播放限制）
 *   DDZAudio.playBgm('default'|'tense')    // 切换 BGM，自动 600ms 交叉淡入
 *   DDZAudio.stopBgm()                     // 全淡出
 *   DDZAudio.playSfx('bomb'|'rocket'|...)  // 一次性音效
 *   DDZAudio.setMuted(bool)                // 静音/恢复
 *
 * UI 端只调 playBgm / playSfx；具体什么时刻调由 ui.js 触发器决定。
 */
(() => {
  const MANIFEST_URL = '/assets/audio/doudizhu/manifest.json';
  const AUDIO_DIR = '/assets/audio/doudizhu/';
  const CROSSFADE_MS = 600;

  let ctx = null;
  let masterGain = null;
  let muted = false;
  let mutedGetter = null;       // 外部全站静音开关；如果传了，每次播放都会 query 一次
  let manifest = null;
  const bgmBuffers = new Map();  // id → { buffer, volume, loop }
  const sfxBuffers = new Map();
  let currentBgm = null;         // { id, source, gain }
  let unlocked = false;

  function getCtx() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('[DDZAudio] AudioContext init failed:', e);
      ctx = null;
    }
    return ctx;
  }

  function isMuted() {
    if (muted) return true;
    if (typeof mutedGetter === 'function') {
      try { return !!mutedGetter(); } catch { return false; }
    }
    return false;
  }

  // 单次 fetch + decode；找不到文件 → null（静默）
  async function loadBuffer(file) {
    const url = AUDIO_DIR + file;
    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const c = getCtx();
      if (!c) return null;
      return await new Promise((resolve, reject) =>
        c.decodeAudioData(arr.slice(0), resolve, reject)
      );
    } catch {
      // 文件不存在 / 解码失败 → 安静失败，不打扰用户
      return null;
    }
  }

  async function init(opts) {
    opts = opts || {};
    mutedGetter = opts.mutedGetter || null;
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!res.ok) return;
      manifest = await res.json();
    } catch {
      return;       // 没 manifest = 音频系统不工作，UI 不受影响
    }
    // 并发加载所有音频；缺的不影响其他
    const tasks = [];
    for (const m of (manifest.bgm || [])) {
      tasks.push(loadBuffer(m.file).then(buf => {
        if (buf) bgmBuffers.set(m.id, { buffer: buf, volume: m.volume ?? 0.45, loop: m.loop !== false });
      }));
    }
    for (const m of (manifest.sfx || [])) {
      tasks.push(loadBuffer(m.file).then(buf => {
        if (buf) sfxBuffers.set(m.id, { buffer: buf, volume: m.volume ?? 0.7 });
      }));
    }
    await Promise.all(tasks);
  }

  // 首次用户手势后调一次：iOS Safari / Chrome 都要求 AudioContext.resume() 在 user gesture 里发生
  function unlockOnGesture() {
    if (unlocked) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    unlocked = true;
  }

  function playBgm(id) {
    if (!unlocked) return;       // 还没解锁就别响
    if (isMuted()) {
      // 静音状态下也记下"想播什么"，恢复后立刻接上
      currentBgm = { id, source: null, gain: null, pending: true };
      return;
    }
    if (currentBgm && currentBgm.id === id && !currentBgm.pending) return;
    const entry = bgmBuffers.get(id);
    if (!entry) {
      // 文件没就位 — 静默跳过（不打扰玩家）
      currentBgm = { id, source: null, gain: null, missing: true };
      return;
    }
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;

    // 新 BGM
    const newSource = c.createBufferSource();
    newSource.buffer = entry.buffer;
    newSource.loop = entry.loop;
    const newGain = c.createGain();
    newGain.gain.setValueAtTime(0, now);
    newGain.gain.linearRampToValueAtTime(entry.volume, now + CROSSFADE_MS / 1000);
    newSource.connect(newGain).connect(masterGain);
    newSource.start(now);

    // 老 BGM 交叉淡出
    if (currentBgm && currentBgm.source && currentBgm.gain) {
      const oldSource = currentBgm.source;
      const oldGain = currentBgm.gain;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_MS / 1000);
      setTimeout(() => { try { oldSource.stop(); } catch {} }, CROSSFADE_MS + 80);
    }

    currentBgm = { id, source: newSource, gain: newGain };
  }

  function stopBgm() {
    if (!currentBgm || !currentBgm.source) {
      currentBgm = null;
      return;
    }
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime;
    const oldSource = currentBgm.source;
    const oldGain = currentBgm.gain;
    oldGain.gain.cancelScheduledValues(now);
    oldGain.gain.setValueAtTime(oldGain.gain.value, now);
    oldGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_MS / 1000);
    setTimeout(() => { try { oldSource.stop(); } catch {} }, CROSSFADE_MS + 80);
    currentBgm = null;
  }

  function playSfx(id) {
    if (!unlocked) return;
    if (isMuted()) return;
    const entry = sfxBuffers.get(id);
    if (!entry) return;          // 文件没就位 → 安静失败
    const c = getCtx();
    if (!c) return;
    const source = c.createBufferSource();
    source.buffer = entry.buffer;
    const gain = c.createGain();
    gain.gain.value = entry.volume;
    source.connect(gain).connect(masterGain);
    source.start();
  }

  function setMuted(m) {
    muted = !!m;
    if (muted) {
      // 静音 → 拉到 0，保留 currentBgm 的 source 以便恢复时继续
      if (masterGain) masterGain.gain.linearRampToValueAtTime(0, getCtx().currentTime + 0.1);
    } else {
      if (masterGain) masterGain.gain.linearRampToValueAtTime(1, getCtx().currentTime + 0.15);
      // 如果 mute 期间想播某首但被拦了，现在补播
      if (currentBgm && currentBgm.pending) {
        const id = currentBgm.id;
        currentBgm = null;
        playBgm(id);
      }
    }
  }

  window.DDZAudio = {
    init,
    unlockOnGesture,
    playBgm,
    stopBgm,
    playSfx,
    setMuted,
    // 暴露内部状态便于调试
    _state: () => ({
      unlocked,
      muted: isMuted(),
      currentBgm: currentBgm && currentBgm.id,
      bgmLoaded: Array.from(bgmBuffers.keys()),
      sfxLoaded: Array.from(sfxBuffers.keys()),
    }),
  };
})();
