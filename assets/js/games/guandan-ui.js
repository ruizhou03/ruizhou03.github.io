(() => {
  'use strict';

  const focusableSelector = [
    'button:not([disabled]):not([hidden])',
    'a[href]',
    'input:not([disabled]):not([hidden])',
    'select:not([disabled]):not([hidden])',
    'textarea:not([disabled]):not([hidden])',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function createDialogController() {
    let activeDialog = null;
    let activeClose = null;
    let returnFocus = null;
    let inerted = new Map();

    function deactivate(dialog) {
      if (!dialog || activeDialog !== dialog) return;
      for (const [node, wasInert] of inerted) node.inert = wasInert;
      inerted = new Map();
      activeDialog = null;
      activeClose = null;
      const target = returnFocus;
      returnFocus = null;
      if (target && target.isConnected) target.focus({ preventScroll: true });
    }

    function activate(dialog, close, preferredFocus) {
      if (!dialog) return;
      if (activeDialog && activeDialog !== dialog) deactivate(activeDialog);
      returnFocus = document.activeElement;
      activeDialog = dialog;
      activeClose = close || null;
      inerted = new Map();
      let node = dialog;
      while (node && node.parentElement) {
        const parent = node.parentElement;
        for (const sibling of parent.children) {
          if (sibling === node || inerted.has(sibling)) continue;
          inerted.set(sibling, !!sibling.inert);
          sibling.inert = true;
        }
        node = parent;
        if (node.classList && node.classList.contains('guandan-wrap')) break;
      }
      const target = (preferredFocus && dialog.querySelector(preferredFocus))
        || dialog.querySelector(focusableSelector);
      if (target) requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }

    document.addEventListener('keydown', event => {
      if (!activeDialog) return;
      if (event.key === 'Escape' && activeClose) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activeClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [...activeDialog.querySelectorAll(focusableSelector)]
        .filter(element => !element.hidden && element.getClientRects().length);
      if (!focusables.length) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }, true);

    return Object.freeze({ activate, deactivate });
  }

  window.GuandanUI = Object.freeze({ createDialogController });
})();
