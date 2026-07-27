(() => {
  'use strict';

  const mutedKey = window.GuandanContract.storageKeys.muted;
  const storage = window.GuandanStorage;
  let context = null;
  let muted = storage.readText(mutedKey) === '1';

  function ensureContext() {
    if (context) return context;
    try { context = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function refreshButton() {
    const button = document.getElementById('gdMuteBtn');
    if (button) {
      button.textContent = '[[zi:volume]]';
      button.setAttribute('aria-pressed', muted ? 'true' : 'false');
      button.setAttribute('aria-label', muted ? '开启音效' : '关闭音效');
    }
  }

  function toggle() {
    muted = !muted;
    storage.writeText(mutedKey, muted ? '1' : '0');
    refreshButton();
    return muted;
  }

  function beep(freq, duration = 0.08, type = 'sine', volume = 0.12) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    const time = audio.currentTime;
    const oscillator = audio.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, time);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.01);
  }

  function noise(duration = 0.06, volume = 0.08) {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    const time = audio.currentTime;
    const length = duration * audio.sampleRate;
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index++) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    const filter = audio.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, time);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start(time);
    source.stop(time + duration + 0.01);
  }

  function sequence(notes, duration, type, volume, gap) {
    let delay = 0;
    for (const frequency of notes) {
      setTimeout(() => beep(frequency, duration, type, volume), delay);
      delay += gap;
    }
  }

  function bomb() {
    if (muted) return;
    const audio = ensureContext();
    if (!audio) return;
    const time = audio.currentTime;
    for (let index = 0; index < 3; index++) {
      const oscillator = audio.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(50 + index * 10, time + index * 0.06);
      oscillator.frequency.exponentialRampToValueAtTime(30, time + index * 0.06 + 0.15);
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.18, time + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.06 + 0.2);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(time + index * 0.06);
      oscillator.stop(time + index * 0.06 + 0.2);
    }
    beep(1200, 0.1, 'square', 0.1);
    setTimeout(() => beep(800, 0.06, 'square', 0.06), 50);
    noise(0.1, 0.12);
  }

  const effects = Object.freeze({
    play() { beep(660, 0.07, 'square', 0.08); noise(0.04, 0.05); },
    bomb,
    pass() { beep(300, 0.05, 'triangle', 0.06); },
    deal() { sequence([440, 554, 659, 880], 0.1, 'sine', 0.07, 60); },
    win() { sequence([523, 659, 784, 1047], 0.18, 'triangle', 0.1, 120); },
    lose() {
      beep(330, 0.2, 'triangle', 0.08);
      setTimeout(() => beep(262, 0.3, 'triangle', 0.08), 200);
    },
    tick() { beep(1000, 0.03, 'square', 0.06); },
    matchEnd(win) {
      sequence(
        win ? [523, 659, 784, 1047, 1319] : [440, 349, 330, 262],
        win ? 0.2 : 0.25,
        'triangle',
        win ? 0.12 : 0.1,
        win ? 150 : 200,
      );
    },
  });

  window.GuandanAudio = Object.freeze({
    effects,
    toggle,
    refreshButton,
    isMuted: () => muted,
  });
  refreshButton();
})();
