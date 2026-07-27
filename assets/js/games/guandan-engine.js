(() => {
  'use strict';

  const PHASE = Object.freeze({
    IDLE: 'idle',
    TRIBUTE: 'tribute',
    PLAYING: 'playing',
    ROUND_END: 'round_end',
    MATCH_END: 'match_end',
  });
  const NAV_VIEW = Object.freeze({
    SETUP: 'setup',
    LOBBY: 'lobby',
    PLAYING: 'playing',
    TRIBUTE: 'tribute',
    SETTLEMENT: 'settlement',
  });

  function teamOf(seat) {
    return seat % 2 === 0 ? 0 : 1;
  }

  function createNavigationController() {
    const state = { current: NAV_VIEW.SETUP };
    function set(view) {
      if (!Object.values(NAV_VIEW).includes(view)) {
        throw new Error('invalid_guandan_nav_view:' + view);
      }
      state.current = view;
      document.body.dataset.guandanView = view;
      const wrapper = document.querySelector('.guandan-wrap');
      if (wrapper) {
        for (const name of Object.values(NAV_VIEW)) wrapper.classList.remove(`gd-view-${name}`);
        wrapper.classList.add(`gd-view-${view}`);
      }
    }
    return Object.freeze({ state, set });
  }

  window.GuandanEngine = Object.freeze({
    PHASE,
    NAV_VIEW,
    teamOf,
    createNavigationController,
  });
})();
