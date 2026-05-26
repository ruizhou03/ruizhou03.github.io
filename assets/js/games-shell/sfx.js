/* games-shell/sfx.js
 * 共享音效模块：Web Audio API 合成，无需音频资产。
 * 提供 4 种通用音效（move/capture/check/checkmate），按 gs.sfx.v1 开关。
 *
 * 用 GamesShell.Sfx.{ move, capture, check, checkmate, isEnabled, setEnabled, ensureUnlocked }
 *
 * 注意：AudioContext 在用户首次交互前是 suspended 状态。所有播放函数都会
 * 静默 resume()，但首声音可能延迟到首次点击后才能听到 —— 这是浏览器策略，
 * 不是 bug。在游戏入口 attach ensureUnlocked() 到第一次 pointerdown 即可。
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};
  if (GS.Sfx) return;

  const ENABLED_KEY = 'gs.sfx.v1';
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function isEnabled() {
    return localStorage.getItem(ENABLED_KEY) !== '0';
  }
  function setEnabled(on) {
    localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  }

  // Play a single oscillator-tone with attack + exponential decay.
  function tone(freq, duration, opts) {
    const c = getCtx();
    if (!c) return;
    opts = opts || {};
    const type = opts.type || 'sine';
    const gain = opts.gain != null ? opts.gain : 0.14;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const now = c.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function play(fn) {
    if (!isEnabled()) return;
    try { fn(); } catch {}
  }

  GS.Sfx = {
    isEnabled,
    setEnabled,
    ensureUnlocked() { getCtx(); },
    move() {
      play(() => { tone(660, 0.07, { type: 'triangle', gain: 0.10 }); });
    },
    capture() {
      play(() => {
        tone(220, 0.09, { type: 'sawtooth', gain: 0.16 });
        setTimeout(() => tone(160, 0.06, { type: 'sawtooth', gain: 0.10 }), 35);
      });
    },
    check() {
      play(() => {
        tone(880, 0.10, { type: 'square', gain: 0.08 });
        setTimeout(() => tone(660, 0.12, { type: 'square', gain: 0.08 }), 110);
      });
    },
    checkmate() {
      play(() => {
        tone(523, 0.14, { type: 'triangle', gain: 0.14 });
        setTimeout(() => tone(415, 0.14, { type: 'triangle', gain: 0.14 }), 150);
        setTimeout(() => tone(330, 0.30, { type: 'triangle', gain: 0.14 }), 300);
      });
    },
  };
})();
