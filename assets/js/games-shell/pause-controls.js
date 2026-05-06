/* games-shell/pause-controls.js
 * 暂停 + 重新开始按钮的轻量包装。
 *
 *   const pause = GamesShell.PauseControls.attachPause({
 *     button: document.getElementById('pauseBtn'),
 *     isLocked: () => isOver,         // 游戏已结束就不让暂停
 *     onPause: () => { ... },         // 切到暂停时调一次
 *     onResume: () => { ... },        // 切回运行时调一次
 *   });
 *   pause.set(true);  // 程序化暂停（如打开设置面板）
 *   pause.set(false); // 恢复
 *   pause.is();       // 返回当前状态
 *
 *   GamesShell.PauseControls.attachRestart({
 *     button: document.getElementById('restartBtn'),
 *     hasUnsavedProgress: () => score > 0 && !isOver,
 *     confirmMessage: '放弃当前局，重新开始？',
 *     onRestart: () => doRestart(),
 *   });
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};

  const PAUSE_LABEL = '⏸ 暂停';
  const RESUME_LABEL = '▶ 继续';

  function attachPause(opts) {
    if (!opts || !opts.button) throw new Error('attachPause: button required');
    const btn = opts.button;
    const labelPause = opts.labelPause || PAUSE_LABEL;
    const labelResume = opts.labelResume || RESUME_LABEL;
    let paused = false;

    function paint() { btn.textContent = paused ? labelResume : labelPause; }
    function set(next, opts2) {
      next = !!next;
      if (next === paused) return;
      paused = next;
      paint();
      if (opts2 && opts2.silent) return;
      if (paused) opts.onPause && opts.onPause();
      else opts.onResume && opts.onResume();
    }

    btn.addEventListener('click', () => {
      if (typeof opts.isLocked === 'function' && opts.isLocked()) return;
      set(!paused);
    });
    paint();

    return { set, is: () => paused, toggle: () => set(!paused) };
  }

  function attachRestart(opts) {
    if (!opts || !opts.button) throw new Error('attachRestart: button required');
    const btn = opts.button;
    btn.addEventListener('click', () => {
      if (typeof opts.hasUnsavedProgress === 'function' && opts.hasUnsavedProgress()) {
        const msg = opts.confirmMessage || '放弃当前局，重新开始？';
        if (!confirm(msg)) return;
      }
      try { opts.onRestart && opts.onRestart(); }
      catch (e) { console.error('[games-shell:pause] restart', e); }
    });
  }

  GS.PauseControls = { attachPause, attachRestart };
})();
