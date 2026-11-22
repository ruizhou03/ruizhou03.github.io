/* 百变小咪 · 「这步不对」反馈（window.ZhamaoFeedback，2026-11-19 用户挑定「甲：顶栏按钮 + 底部横条」）
 * 单机局：顶栏一颗皱眉猫按钮（手机竖屏顶栏挤，收进右上角菜单）。点开 = 像暂停一样停住，底下滑出最近 8 步机器猫的动作
 * （取自本局日志 game.hl.acts，精确到第几步），点一步、可选个理由、发送；关掉接着打。
 * 反馈记进日志 game.hl.fb（[第几步, 理由, 开局后毫秒]），当场先发一份「打到一半」的快照（防这局没打完就丢了），打完整局再随日志发一次。
 * 联机（2026-11-20 起）：不暂停；动作取自服务器发下来的事件流，发事件序号给服务器（action=fb），由它对应到第几步、随整局日志存。教程局不出现。 */
(function (root) {
  'use strict';
  const R = root.ZhamaoRules;
  const T = R && R.T ? R.T : (k, s) => s;
  const TB = () => root.ZhamaoTable || {};
  const gameOf = () => (TB().game ? TB().game() : null);
  const NARROW = root.matchMedia ? root.matchMedia('(max-width: 520px)') : { matches: false };
  const MAX = 8;
  const REASONS = [['swap', '乱换乱给'], ['boom', '明知有炸还摸'], ['insert', '炸弹塞错'], ['other', '其他']];
  const CSS = `
.zmfb-tool[hidden]{display:none}
.zmfb-mask{position:fixed;inset:0;z-index:80;background:rgba(29,27,24,.28);display:flex;align-items:flex-end;justify-content:center}
.zmfb-sheet{background:var(--zm-paper,#f3eee3);border:1px solid var(--zm-ink,#1d1b18);border-bottom:0;border-radius:18px 18px 0 0;width:min(760px,100%);box-sizing:border-box;padding:14px 14px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -6px 24px rgba(0,0,0,.12)}
.zmfb-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;font:600 16px/1.2 "Noto Serif SC",serif;color:var(--zm-ink,#1d1b18)}
.zmfb-paused{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--zm-wash,#ebe5d8);color:var(--zm-ink-mute,#6a6358)}
.zmfb-x{margin-left:auto;width:32px;height:32px;border-radius:50%;border:1px solid var(--zm-ink-faint,#aaa294);background:none;cursor:pointer;color:var(--zm-ink-mute,#6a6358);display:inline-flex;align-items:center;justify-content:center;padding:0}
.zmfb-x svg{width:14px;height:14px;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round}
.zmfb-strip{display:flex;gap:10px;overflow-x:auto;padding:8px 2px 8px 8px;scroll-snap-type:x mandatory;scrollbar-width:none}
.zmfb-strip::-webkit-scrollbar{display:none}
.zmfb-mv{--u:30px;flex:0 0 auto;scroll-snap-align:end;display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--zm-wash,#ebe5d8);border-radius:14px;background:var(--zm-card,#fffdf8);cursor:pointer;position:relative;color:inherit;font:inherit}
.zmfb-mv.is-on{border-color:var(--zm-seal,#b4392c);box-shadow:0 0 0 2px rgba(180,57,44,.25)}
.zmfb-av{width:34px;height:34px;border-radius:50%;overflow:hidden;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:var(--zm-wash,#ebe5d8);font-size:13px}
.zmfb-av svg{width:100%;height:100%}
.zmfb-av.is-sm{width:26px;height:26px}
.zmfb-mv .zm-card{width:var(--u);height:calc(var(--u)*1.4);font-size:7px;flex:0 0 auto;margin:0;pointer-events:none}
.zmfb-mv .zm-card .zm-nm{display:none}
.zmfb-cards{display:flex;gap:2px}
.zmfb-arrow{color:var(--zm-ink-faint,#aaa294);font-size:14px}
.zmfb-pos{font:600 12px/1 system-ui;color:var(--zm-seal,#b4392c);background:#fbeee9;border-radius:8px;padding:3px 6px}
.zmfb-n{position:absolute;top:-7px;left:-7px;min-width:18px;height:18px;border-radius:9px;background:var(--zm-ink,#1d1b18);color:var(--zm-paper,#f3eee3);font:600 10px/18px system-ui;text-align:center}
.zmfb-why{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;opacity:.35;pointer-events:none;transition:opacity .15s}
.zmfb-why.is-ready{opacity:1;pointer-events:auto}
.zmfb-why button{border:1px solid var(--zm-ink,#1d1b18);background:var(--zm-paper,#f3eee3);border-radius:999px;padding:7px 12px;font:14px/1 system-ui;cursor:pointer;color:var(--zm-ink,#1d1b18)}
.zmfb-why button.is-on{background:var(--zm-ink,#1d1b18);color:var(--zm-paper,#f3eee3)}
.zmfb-why .zmfb-send{margin-left:auto;background:var(--zm-seal,#b4392c);color:var(--zm-seal-ink,#fbf6ec);border-color:var(--zm-seal,#b4392c);min-width:64px}
.zmfb-why .zmfb-send svg{width:16px;height:16px;stroke:currentColor;stroke-width:2.2;fill:none;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px}
`;
  const FACE = '<path d="M5 9 4 3.5 9 6.5h6L20 3.5 19 9c1.2 1.4 1.8 3 1.8 4.6C20.8 18 16.9 21 12 21s-8.8-3-8.8-7.4C3.2 12 3.8 10.4 5 9Z"/><circle class="dot" cx="9" cy="12.6" r="1.1"/><circle class="dot" cx="15" cy="12.6" r="1.1"/><path d="M9.6 17.2c1.5-1.2 3.3-1.2 4.8 0"/>';
  const PAUSE = '<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true"><rect x="2" y="1.5" width="2.6" height="9" rx="1" fill="currentColor"/><rect x="7.4" y="1.5" width="2.6" height="9" rx="1" fill="currentColor"/></svg>';
  const X = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12"/></svg>';
  const TICK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5"/></svg>';
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  let ONLINE = null;   // 打开时如果是联机局：{ log, me, loc }（事件里的座位是服务器座位，loc 换成网页上的位置）
  function avatar(seat, sm) {
    const g = gameOf(), n = g ? g.state.n : 1, disp = ONLINE ? ONLINE.loc(seat) : ((seat - ((g && g.pov) || 0)) % n + n) % n;
    const el = document.querySelector(disp === 0 ? '.zm-seat-me .zm-av-face' : '.zm-seat[data-seat="' + disp + '"] .zm-av-face');
    return '<span class="zmfb-av' + (sm ? ' is-sm' : '') + '">' + (el ? el.innerHTML : '') + '</span>';
  }
  const card = (k) => (TB().cardHtml ? TB().cardHtml(k) : '');
  const back = () => (TB().backHtml ? TB().backHtml() : '');
  function moveHtml(a, i, num) {
    const seat = a[0], d = a[2];
    let mid = '';
    if (d.type === 'play') mid = '<span class="zmfb-cards">' + d.cards.map(card).join('') + '</span>' + (d.target >= 0 ? '<span class="zmfb-arrow">→</span>' + avatar(d.target, true) : '');
    else if (d.type === 'insert') mid = '<span class="zmfb-cards">' + card(R.BOOM) + '</span><span class="zmfb-pos">' + (d.rand ? '?' : '#' + (d.pos + 1)) + '</span>';
    else if ((d.type === 'give' || d.type === 'pick') && d.card != null) mid = '<span class="zmfb-cards">' + card(d.card) + '</span>';
    else if (d.type === 'alter') mid = '<span class="zmfb-cards">' + (d.order && d.order.length ? d.order.map(card).join('') : card(R.ALTER)) + '</span>';
    else if (d.type === 'nope') mid = '<span class="zmfb-cards">' + card(R.NOPE) + '</span>';
    else if (d.type === 'rescue') mid = '<span class="zmfb-cards">' + card(R.DEFUSE) + '</span>';
    else mid = '<span class="zmfb-cards">' + back() + '</span>';   // 摸牌 / 偷牌（看不到是哪张）
    return '<button type="button" class="zmfb-mv" data-i="' + i + '"><span class="zmfb-n">' + num + '</span>' + avatar(seat) + mid + '</button>';
  }
  // 最近几步机器猫自己做的（真人 / 反应窗收口不算）
  function recent(max) {
    const g = gameOf();
    if (!g || !g.hl) return [];
    const h = g.hl, out = [];
    for (let i = h.acts.length - 1; i >= 0 && out.length < max; i--) {
      const a = h.acts[i];
      if (a[0] < 0 || h.human.indexOf(a[0]) >= 0 || a[2].type === 'pass') continue;
      out.push([a, i]);
    }
    return out.reverse();
  }
  // 联机：从服务器发下来的事件流里挑机器猫（含托管）做的动作，一步取它的第一条事件；序号 n 发给服务器去对应第几步
  const ON_TYPES = { play: 1, draw: 1, insert: 1, nope: 1, give: 1, pick: 1, steal: 1, alter: 1 };
  function recentOnline(max) {
    const O = TB().online && TB().online();
    if (!O) return [];
    const firsts = new Map();
    for (const e of O.log) if (e && e.act != null && !firsts.has(e.act)) firsts.set(e.act, e);
    const out = [];
    for (const e of firsts.values()) {
      if (!e.bot || !(e.who >= 0) || e.who === O.me || !ON_TYPES[e.t]) continue;
      const d = e.t === 'play' ? { type: 'play', cards: e.cards || [], target: e.target } : e.t === 'insert' ? { type: 'insert', pos: e.pos, rand: e.pos == null } : { type: e.t, card: e.card };
      out.push([[e.who, 0, d], e.n]);
    }
    return out.slice(-max);
  }
  function available() {
    const g = gameOf();
    if (g && g.online) { const O = TB().online && TB().online(); return !!(O && !O.over && O.me >= 0); }
    return !!(g && g.hl && !g.tutorial && g.state && g.state.phase !== 'over' && TB().canPause && TB().canPause());
  }
  const inMenu = () => available();   // 2026-11-20 用户：顶栏只留三格，「反馈」一律在菜单里
  let btn = null, sheet = null;
  function sync() { if (btn) btn.hidden = true; }
  function close() {
    if (!sheet) return;
    sheet.remove(); sheet = null;
    document.removeEventListener('keydown', onKey, true);
    if (!ONLINE && TB().resume) TB().resume();   // 联机不暂停，也就不用接着
    ONLINE = null;
  }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
  function open() {
    if (sheet || !available()) return;
    const g0 = gameOf(), online = !!(g0 && g0.online);
    ONLINE = online ? TB().online() : null;
    const items = online ? recentOnline(MAX) : recent(MAX);
    if (!items.length) { ONLINE = null; return; }   // 机器猫还没走过：没东西可挑
    if (!online && (!TB().hold || !TB().hold())) return;   // 单机：像暂停一样停住；联机别人还在打，不停
    const n = items.length;
    const mask = document.createElement('div');
    mask.className = 'zmfb-mask';
    mask.innerHTML = '<div class="zmfb-sheet" role="dialog" aria-modal="true" aria-label="' + esc(T('fb.title', '哪一步不对？')) + '"><div class="zmfb-head">' + esc(T('fb.title', '哪一步不对？')) +
      (online ? '' : '<span class="zmfb-paused" aria-hidden="true">' + PAUSE + '</span>') + '<button type="button" class="zmfb-x" aria-label="' + esc(T('ui.close', '关闭')) + '">' + X + '</button></div>' +
      '<div class="zmfb-strip">' + items.map(([a, i], k) => moveHtml(a, i, n - k)).join('') + '</div>' +
      '<div class="zmfb-why">' + REASONS.map(([id, zh]) => '<button type="button" data-why="' + id + '">' + esc(T('fb.why.' + id, zh)) + '</button>').join('') +
      '<button type="button" class="zmfb-send" data-send>' + esc(T('fb.send', '发送')) + '</button></div></div>';
    document.body.appendChild(mask);
    sheet = mask;
    document.addEventListener('keydown', onKey, true);
    const st = mask.querySelector('.zmfb-strip'); st.scrollLeft = st.scrollWidth;
    let pick = -1, why = null, sent = false;
    mask.addEventListener('click', (e) => {
      if (e.target === mask || e.target.closest('.zmfb-x')) { close(); return; }
      const mv = e.target.closest('.zmfb-mv'), w = e.target.closest('[data-why]');
      if (mv) { pick = +mv.dataset.i; mask.querySelectorAll('.zmfb-mv').forEach((x) => x.classList.toggle('is-on', x === mv)); mask.querySelector('.zmfb-why').classList.add('is-ready'); }
      if (w) { why = w.dataset.why; mask.querySelectorAll('[data-why]').forEach((x) => x.classList.toggle('is-on', x === w)); }
      const s = e.target.closest('[data-send]');
      if (s && pick >= 0 && !sent) {
        sent = true;
        const g = gameOf();
        if (online) { if (TB().sendFb) TB().sendFb(pick, why || 'other'); }
        else if (g && g.hl) {
          (g.hl.fb = g.hl.fb || []).push([pick, why || 'other', Math.max(0, Date.now() - (g.hl.t0 || Date.now()))]);
          if (root.ZhamaoHlog && root.ZhamaoHlog.snapshot) root.ZhamaoHlog.snapshot(g);
        }
        if (root.ZhamaoWallet) root.ZhamaoWallet.fb(1);   // 小鱼干：每标一步 +5，每天最多 4 步（2026-11-22）
        s.innerHTML = TICK;
        setTimeout(close, 450);
      }
    });
  }
  function mount() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const tools = document.querySelector('.zm-tools'), rules = document.getElementById('zmRulesBtn');
    if (tools) {
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'zm-tool zmfb-tool'; btn.id = 'zmFeedbackBtn'; btn.hidden = true;
      btn.setAttribute('aria-label', T('fb.btn', '这步不对'));
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + FACE + '</svg>';
      tools.insertBefore(btn, rules || null);
      btn.addEventListener('click', open);
    }
    if (NARROW.addEventListener) NARROW.addEventListener('change', sync);
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  root.ZhamaoFeedback = { open, close, sync, inMenu, available, recent };
})(typeof window !== 'undefined' ? window : this);
