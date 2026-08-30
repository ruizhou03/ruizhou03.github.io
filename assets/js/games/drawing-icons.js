/* 你画我猜专属「纸墨工坊」图标。原创 SVG，不依赖通用 emoji 替换。 */
(function () {
  'use strict';

  const paths = {
    brand: `<path d="M10 8h25v31H10Z"/><path d="M15 14h14M15 20h10M15 26h7"/><path d="m29 35 11-11 3 3-11 11-5 1Z"/><path class="dgi-fill" d="m31 35 9-9 1 1-9 9-3 1Z"/>`,
    back: `<path d="m28 9-15 15 15 15M14 24h27"/>`,
    create: `<path d="M10 8h25v32H10Z"/><path d="M22 16v15M15 23.5h14"/><path d="m33 34 7-7 3 3-7 7-5 2Z"/>`,
    join: `<path d="M8 8h22v32H8Z"/><path d="M20 24h22m-7-7 7 7-7 7"/><circle class="dgi-fill" cx="25" cy="15" r="1.5"/>`,
    room: `<path d="M7 13h34v23H7Z"/><path d="M14 20h20M14 27h13"/><circle class="dgi-fill" cx="35" cy="31" r="2"/>`,
    players: `<circle cx="18" cy="17" r="6"/><circle cx="33" cy="20" r="5"/><path d="M7 39c1-9 5-13 11-13s10 4 11 13M28 29c7-2 12 2 13 10"/>`,
    timer: `<circle cx="24" cy="26" r="15"/><path d="M24 26V16m0 10 8 5M18 6h12M24 6v5"/>`,
    difficulty: `<path d="m24 7 18 9-18 9L6 16Z"/><path d="m9 24 15 8 15-8M9 32l15 8 15-8"/><path class="dgi-fill" d="m24 10 13 6-13 6-13-6Z"/>`,
    rounds: `<path d="M12 16a15 15 0 0 1 27 3M39 11v8h-8M36 32A15 15 0 0 1 9 29M9 37v-8h8"/>`,
    code: `<path d="M17 8 13 40M33 8l-4 32M8 20h32M6 30h32"/>`,
    chat: `<path d="M7 9h34v24H21L11 41v-8H7Z"/><path d="M15 17h18M15 24h12"/>`,
    rules: `<path d="M7 8h15c4 0 6 2 6 6v27c0-4-2-6-6-6H7ZM41 8H30c-1 0-2 .3-2 1v32c0-4 2-6 6-6h7Z"/>`,
    invite: `<path d="M8 12h32v25H8Z"/><path d="m9 14 15 12 15-12M13 33l8-7m14 7-8-7"/><path class="dgi-fill" d="m11 15 13 10 13-10v19H11Z"/>`,
    send: `<path d="M7 8 42 24 7 40l5-13 18-3-18-3Z"/><path class="dgi-fill" d="m10 12 27 12-27 12 5-9 15-3-15-3Z"/>`,
    copy: `<rect x="15" y="8" width="25" height="29" rx="2"/><path d="M10 14H7v27h24v-4"/>`,
    start: `<circle cx="24" cy="24" r="18"/><path class="dgi-fill" d="m20 15 14 9-14 9Z"/>`,
    brush: `<path d="m10 38 22-22 6 6-22 22H8Z"/><path d="m30 14 5-5 7 7-5 5"/><path d="M8 44c0-6 3-9 8-8 1 5-2 8-8 8Z"/><path class="dgi-fill" d="m13 35 18-18 5 5-19 18Z"/>`,
    eraser: `<path d="m8 31 18-20c2-2 4-2 6 0l9 8c2 2 2 4 0 6L27 41H17Z"/><path d="m20 18 14 13M27 41h14"/>`,
    undo: `<path d="M18 14 8 24l10 10M9 24h19c8 0 12 5 12 13"/>`,
    clear: `<path d="M12 14h24M18 14V9h12v5M15 14l2 27h14l2-27M22 20v14m5-14v14"/>`,
    score: `<path d="M9 40V25h8v15M20 40V15h8v25M31 40V8h8v32M6 40h36"/>`,
    feedback: `<path d="M7 10h34v24H21L11 42v-8H7Z"/><path d="M16 18h16M16 25h10"/>`,
    exit: `<path d="M21 8H9v32h12M27 15l9 9-9 9M16 24h20"/>`,
    settings: `<circle cx="24" cy="24" r="6"/><path d="M24 7v5m0 24v5M7 24h5m24 0h5M12 12l4 4m16 16 4 4M36 12l-4 4M16 32l-4 4"/>`,
  };

  function svg(name, className) {
    const body = paths[name] || paths.brand;
    const classes = ['dgi', className || ''].filter(Boolean).join(' ');
    return `<svg class="${classes}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g>${body}</g></svg>`;
  }

  function hydrate(root) {
    (root || document).querySelectorAll('[data-dg-icon]').forEach((node) => {
      node.innerHTML = svg(node.getAttribute('data-dg-icon'), node.getAttribute('data-dg-icon-class') || '');
    });
  }

  window.GamesShell = window.GamesShell || {};
  window.GamesShell.DrawingIcons = { hydrate, svg };
  hydrate(document);
}());
