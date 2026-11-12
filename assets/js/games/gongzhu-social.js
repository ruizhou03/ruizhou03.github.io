/* 拱猪 · 牌桌互动（window.GongzhuSocial）：点别人头像扔道具、顶栏聊天键说一句，大家都看得到。
 * 画法 = 甲·贴纸卡通（2026-11-11 用户挑定）：和联机头像同一种画法（墨点眼 + 白高光 + 腮红），外圈奶油白贴纸描边。
 * 动画 = 温和档；聊天 = 说话人头像旁的气泡，停 3 秒淡出。
 * 本模块只管画和交互，不管网络：牌桌（gongzhu.js）给几个钩子——座位的头像元素、名字、怎么发出去、是不是机器人。
 * 单机：机器人挨了道具，有时回一句、偶尔扔回来（autoBots）；联机里机器人的反应由服务器发（见 backends/urge/api/gongzhu.js emote）。 */
(function () {
  'use strict';

  const PROP_KEYS = ['flower', 'coffee', 'water', 'rooster', 'clap', 'pig'];
  const PROP_NAMES = { flower: '献花', coffee: '咖啡', water: '泼水', rooster: '叫醒', clap: '鼓掌', pig: '送猪' };
  const LINES = ['大家好呀', '这把我不当猪', '猪在谁手里？', '手下留情', '快点出吧，猪都睡着了', '好牌！', '又是我吃红桃……', '运气来了挡不住'];
  const REPLY = {
    flower: ['谢谢老板！', '受宠若惊'], coffee: ['好烫好烫！', '提神了，谢了'], water: ['别泼了！', '我湿透了……'],
    rooster: ['醒了醒了！', '吓我一跳'], clap: ['过奖过奖', '低调低调'], pig: ['这猪我不要！', '猪还给你'],
  };
  const TEXT_MAX = 30;
  const COOLDOWN_MS = 2500;   // 和服务器一致：同一个人 2.5 秒内只能发一次
  const PREF_KEY = 'gz.social.v1';

  /* ───── 道具画（64×64）───── */
  const INK = '#1d1b18', CREAM = '#fffdf6';
  const circ = (cx, cy, r, c) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '"/>';
  const ell = (cx, cy, rx, ry, c, extra) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + c + '"' + (extra || '') + '/>';
  const pth = (d, c) => '<path d="' + d + '" fill="' + c + '"/>';
  const stk = (d, c, w) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const eye = (x, y, r) => circ(x, y, r, INK) + circ((x - r * 0.35).toFixed(2), (y - r * 0.38).toFixed(2), (r * 0.38).toFixed(2), '#fff');
  const blush = (x, y) => ell(x, y, 3.2, 2, '#f08f8f', ' opacity=".7"');
  function flower(cx, cy, ring, r, petal, center) {
    let s = '';
    for (let k = 0; k < 5; k++) {
      const a = (-90 + 72 * k) * Math.PI / 180;
      s += circ((cx + ring * Math.cos(a)).toFixed(2), (cy + ring * Math.sin(a)).toFixed(2), r, petal);
    }
    return s + circ(cx, cy, r * 0.82, center);
  }
  const DRAW = {
    flower: () =>
      pth('M23 31c-9-1-13-7-12-14 7 0 12 6 12 14Z', '#8cbf7f') + pth('M41 31c9-1 13-7 12-14-7 0-12 6-12 14Z', '#8cbf7f') +
      flower(21, 23, 4.6, 4.2, '#f29aa6', '#f8d35e') + flower(43, 23, 4.6, 4.2, '#f5b36b', '#f8d35e') +
      pth('M16 30h32L36 55.5a4 4 0 0 1-8 0Z', '#efd59b') + pth('M32 30h16L36 55.5a4 4 0 0 1-4 3.4Z', '#dfb96f') +
      flower(32, 15, 5, 4.8, '#e3625b', '#f8d35e') + eye(30, 14.6, 1.25) + eye(34, 14.6, 1.25) +
      pth('M32 33.5c-3-5-10-5-9-1 .8 2.6 5 2.6 9 1Zm0 0c3-5 10-5 9-1-.8 2.6-5 2.6-9 1Z', '#b4392c') + circ(32, 33.5, 2.6, '#b4392c') +
      stk('M30.5 35.5l-3 6M33.5 35.5l3 6', '#b4392c', 2.6),
    coffee: () =>
      ell(31, 52, 21, 4.6, '#e3d6c2') + stk('M44.5 30c8.5-1.5 10.5 10.5.5 13', '#5b7fae', 5) +
      pth('M16 26h30v13.5a13 12.5 0 0 1-13 12.5h-4a13 12.5 0 0 1-13-12.5Z', '#5b7fae') +
      ell(31, 26, 15, 4.2, '#86a3c9') + ell(31, 26.2, 12.2, 2.9, '#7a4a2c') +
      stk('M25 19c-3.5-3 3.5-5 0-9.5M36 19c-3.5-3 3.5-5 0-9.5', '#c8bba8', 3) +
      eye(26, 37, 2.4) + eye(36, 37, 2.4) + blush(22.5, 42) + blush(39.5, 42) + stk('M29 41.5q2 2 4 0', INK, 2.2),
    water: () =>
      pth('M24.5 21c-5-3-12-3-15 2.5-2 3.7.6 7 3.6 5.4.4 3.8 4.6 4.8 6.7 1.8 1.8 2.5 5.7 1.4 6-2.2Z', '#a9d8f2') +
      pth('M10 34c-1.6 2.6-1.6 4.2 0 4.8 1.6-.6 1.6-2.2 0-4.8ZM16.5 39c-1.8 3-1.8 4.8 0 5.6 1.8-.8 1.8-2.6 0-5.6ZM8 44c-1.3 2.1-1.3 3.4 0 4 1.3-.6 1.3-1.9 0-4Z', '#7cc0e8') +
      '<g transform="rotate(-35 36 38)">' + stk('M24 22c0-11 24-11 24 0', '#4f86b8', 3) +
      pth('M22 24h28l-3.6 25.5a3.4 3.4 0 0 1-3.4 2.9H29a3.4 3.4 0 0 1-3.4-2.9Z', '#6aa3d4') +
      '<rect x="20" y="20.5" width="32" height="6.5" rx="3.25" fill="#4f86b8"/>' +
      eye(31, 36, 2.3) + eye(41, 36, 2.3) + blush(28, 41) + blush(44, 41) + ell(36, 42.2, 1.8, 2.2, INK) + '</g>',
    rooster: () =>
      pth('M23 41c-11-3-15-14-10-22 2.5 8.5 7 12.5 12 14Z', '#3f5f8f') + pth('M22 44c-12 0-17-9-14-17 3.5 7 8 10 14 10.5Z', '#c9a96e') +
      pth('M23 47c-10 2.5-16-3-15-10 4.5 5 9 6.5 14.5 5.5Z', '#e0534a') + stk('M30 51v6h-3.5M37 51v6h3.5', '#e39a35', 3) +
      ell(34, 40.5, 15, 12, '#f7e3b5') +
      pth('M36 15.5c-1.6-5.4 4.2-6.6 5.4-2.2.6-5.2 6.8-4.4 5.6.8 3.2-2.8 7.2.4 4.2 4.4Z', '#e0534a') + circ(43, 25, 10, '#f7e3b5') +
      pth('M51 20.5l9.5 2.6-8.6 2.4Z', '#f0a93a') + pth('M51 26l7.6 3.2-7.4 1.6Z', '#f0a93a') +
      pth('M51.5 31c2.2 1.5 2.4 5-.4 5.4-2.4-.5-2.2-3.6.4-5.4Z', '#e0534a') +
      pth('M27 39.5c4.5-7 15-7 17.5 1.5-4.5 6.8-13.5 6.8-17.5-1.5Z', '#ecc98a') + eye(45.5, 23, 2.6) + blush(46, 29) +
      stk('M58 12.5l2.5-3.5M61 18.5h2.5M54.5 9l.6-4', '#c9a96e', 2.6),
    clap: () => {
      const g = '<rect x="13" y="20" width="13" height="28" rx="6.5" fill="#f6cda2"/>' +
        ell(25, 39, 3.4, 6.2, '#f6cda2', ' transform="rotate(-14 25 39)"') + stk('M17.5 22.5v6.5M21.5 22.5v6.5', '#e2a979', 2) +
        '<rect x="11.5" y="45" width="16" height="9" rx="3.5" fill="#3f5f8f"/>';
      const r = '<g transform="rotate(24 19 50)">' + g + '</g>';
      return stk('M32 13V6.5M24.5 15l-4-3.6M39.5 15l4-3.6', '#e9b949', 2.8) + stk('M9 24q-4 6-1 12M55 24q4 6 1 12', '#e9b949', 2.4) +
        r + '<g transform="translate(64 0) scale(-1 1)">' + r + '</g>';
    },
    pig: () =>
      stk('M13.5 37c-5-1.6-3.6-7 0-5.4 2.4 1.1.4 4.4-2.6 3.2', '#e993a3', 2.6) +
      '<rect x="17.5" y="45" width="5.5" height="10" rx="2.75" fill="#e993a3"/><rect x="25" y="46" width="5.5" height="10" rx="2.75" fill="#e993a3"/>' +
      '<rect x="33" y="46" width="5.5" height="10" rx="2.75" fill="#e993a3"/><rect x="39.5" y="45" width="5.5" height="10" rx="2.75" fill="#e993a3"/>' +
      ell(30, 40, 17, 12, '#f4b2bd') + '<rect x="24" y="28.2" width="6" height="23.6" fill="#c9a96e"/>' +
      pth('M37 21 38.5 11 46 18.5Z', '#e0889a') + pth('M51 20 55 11 57 21Z', '#e0889a') + circ(46, 30, 11.5, '#f4b2bd') +
      ell(51.5, 34, 6.2, 4.6, '#ec97a6') + ell(49.6, 34, 1.3, 2, '#a94a5e') + ell(53.4, 34, 1.3, 2, '#a94a5e') +
      eye(42.5, 27.5, 2.3) + eye(51, 26.5, 2.3) + blush(39.5, 33.5) +
      pth('M27 28c-4.5-6-11-4.5-9 0 1.2 2.5 5.5 2.4 9 0Zm0 0c4.5-6 11-4.5 9 0-1.2 2.5-5.5 2.4-9 0Z', '#b4392c') + circ(27, 28, 2.6, '#b4392c'),
  };
  const ART = {};
  PROP_KEYS.forEach((k) => {
    const body = DRAW[k]();
    // 贴纸描边：整幅再画一遍，颜色全换成奶油白、描粗垫在底下；再往下垫一层淡淡的影子
    const border = body.replace(/fill="(?!none)[^"]*"/g, 'fill="' + CREAM + '"').replace(/stroke="[^"]*"/g, 'stroke="' + CREAM + '"').replace(/stroke-width="[^"]*"/g, 'stroke-width="7"');
    ART[k] = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<g transform="translate(32 33.6) scale(.86) translate(-32 -32)" opacity=".18"><g stroke="#5a4632" stroke-width="6" stroke-linejoin="round">' + border.split(CREAM).join('#5a4632') + '</g></g>' +
      '<g transform="translate(32 32) scale(.86) translate(-32 -32)"><g stroke="' + CREAM + '" stroke-width="6" stroke-linejoin="round">' + border + '</g>' + body + '</g></svg>';
  });

  const HEART = (c) => '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21s-8-5.1-8-11.1A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9C20 15.9 12 21 12 21Z" fill="' + c + '"/></svg>';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* 文字清理：去掉控制字符 / 双向控制符 / 零宽字符，首尾空白，限 30 个字 */
  function cleanText(raw) {
    const s = String(raw == null ? '' : raw).replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    return [...s].slice(0, TEXT_MAX).join('');
  }

  function readPrefs() { try { return Object.assign({ hide: false }, JSON.parse(localStorage.getItem(PREF_KEY) || 'null') || {}); } catch (_) { return { hide: false }; } }
  function writePrefs(p) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (_) { /* 无痕模式：不存也能用 */ } }

  /* host 钩子（座位 l 是牌桌上的本地座位：0 我 / 1 右 / 2 上 / 3 左）：
   *   root               挂特效层的元素（牌桌 app）
   *   avatar(l)          该座位的头像元素
   *   name(l)            该座位的名字
   *   canSend()          现在能不能发（不在观战、在牌局里）
   *   send(ev)           把我发的这一条交出去（联机发服务器；单机什么也不用做）——画由本模块先画
   *   autoBots()         单机：机器人挨打后由本模块决定回一句 / 扔回来
   *   isBot(l)           这个座位是不是机器人（屏蔽按钮只给真人）
   *   mutable(l)         这个座位能不能屏蔽（联机里的真人）
   *   muted(l) / setMuted(l, on)
   *   sfx(name, delayMs) 播音效
   *   reduce()           减少动画 */
  function create(host) {
    const prefs = readPrefs();
    const layer = document.createElement('div');
    layer.className = 'gz-social';
    layer.setAttribute('aria-hidden', 'true');
    host.root.appendChild(layer);
    let pop = null, popFor = null;
    let lastSend = -1e9;
    let gen = 0;            // clear() 作废还在排队的回应 / 延时
    const bubbles = new Map();

    const reduce = () => !!(host.reduce && host.reduce());
    function center(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
    }
    function mk(cls, html) { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; layer.appendChild(d); return d; }
    const at = (x, y, w, h, extra) => 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - h / 2).toFixed(1) + 'px)' + (extra || '');
    const done = (a, el) => { a.finished.then(() => el && el.remove(), () => el && el.remove()); return a; };
    function later(ms, fn) { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); }

    /* ───── 面板 ───── */
    function closePop() { if (pop) { pop.remove(); pop = null; popFor = null; } }
    document.addEventListener('pointerdown', (e) => {
      if (pop && !pop.contains(e.target) && !(popFor && popFor.contains(e.target))) closePop();
    }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop) closePop(); });
    window.addEventListener('resize', closePop);

    function placePop(p, anchor, side) {
      const a = anchor.getBoundingClientRect(), W = p.offsetWidth, H = p.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
      let x, y;
      if (side === 'below') { x = a.left + a.width / 2 - W / 2; y = a.bottom + 10; }
      else if (side === 'right') { x = a.right + 10; y = a.top + a.height / 2 - H / 2; }
      else if (side === 'left') { x = a.left - 10 - W; y = a.top + a.height / 2 - H / 2; }
      else { x = a.left + a.width / 2 - W / 2; y = a.top - 10 - H; }
      // 放不下就翻到另一边 / 贴边
      if (side === 'right' && x + W > vw - 8) x = a.left - 10 - W;
      if (side === 'left' && x < 8) x = a.right + 10;
      if (side === 'above' && y < 8) y = a.bottom + 10;
      if (side === 'below' && y + H > vh - 8) y = a.top - 10 - H;
      p.style.left = Math.round(Math.max(8, Math.min(vw - W - 8, x))) + 'px';
      p.style.top = Math.round(Math.max(8, Math.min(vh - H - 8, y))) + 'px';
    }
    function cooling() { return Date.now() - lastSend < COOLDOWN_MS; }
    function nudge(el) { el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 }); }

    function openProps(l) {
      const av = host.avatar(l);
      if (!av) return;
      if (pop && popFor === av) { closePop(); return; }
      closePop();
      const p = document.createElement('div');
      p.className = 'gz-social-pop';
      p.setAttribute('role', 'dialog');
      p.setAttribute('aria-label', '扔给 ' + host.name(l));
      const mutable = host.mutable && host.mutable(l), muted = mutable && host.muted(l);
      p.innerHTML = '<div class="gz-sp-title"></div><div class="gz-sp-props">' +
        PROP_KEYS.map((k) => '<button type="button" data-prop="' + k + '"><span class="gz-sp-ic">' + ART[k] + '</span><span class="gz-sp-lb">' + PROP_NAMES[k] + '</span></button>').join('') + '</div>' +
        (mutable ? '<div class="gz-sp-foot"><span>' + (muted ? '已屏蔽他的互动' : '不想看他的互动') + '</span><button type="button" data-mute>' + (muted ? '取消屏蔽' : '屏蔽他') + '</button></div>' : '');
      p.querySelector('.gz-sp-title').textContent = '扔给 ' + host.name(l);
      layer.appendChild(p);
      pop = p; popFor = av;
      placePop(p, av, l === 2 ? 'below' : l === 3 ? 'right' : l === 1 ? 'left' : 'above');
      p.querySelectorAll('[data-prop]').forEach((b) => b.addEventListener('click', () => {
        if (!host.canSend()) { closePop(); return; }
        if (cooling()) { nudge(b); return; }
        lastSend = Date.now();
        closePop();
        const ev = { kind: 'prop', from: 0, to: l, prop: b.dataset.prop };
        play(ev);
        host.send(ev);
      }));
      const mb = p.querySelector('[data-mute]');
      if (mb) mb.addEventListener('click', () => { host.setMuted(l, !muted); closePop(); });
    }

    function openChat(btn) {
      if (pop && popFor === btn) { closePop(); return; }
      closePop();
      const p = document.createElement('div');
      p.className = 'gz-social-pop gz-sp-chat';
      p.setAttribute('role', 'dialog');
      p.setAttribute('aria-label', '说一句');
      p.innerHTML = '<div class="gz-sp-title">说一句（大家都看得到）</div><div class="gz-sp-lines">' +
        LINES.map((t) => '<button type="button"></button>').join('') + '</div>' +
        '<form class="gz-sp-custom"><input type="text" maxlength="' + TEXT_MAX + '" placeholder="自己写一句…" enterkeyhint="send" autocomplete="off"><button type="submit">发送</button></form>' +
        '<label class="gz-sp-hide"><input type="checkbox"' + (prefs.hide ? ' checked' : '') + '><span>不看别人的互动</span></label>';
      p.querySelectorAll('.gz-sp-lines button').forEach((b, i) => { b.textContent = LINES[i]; });
      layer.appendChild(p);
      pop = p; popFor = btn;
      placePop(p, btn, 'below');
      const say = (text, el) => {
        if (!host.canSend()) { closePop(); return; }
        if (cooling()) { nudge(el); return; }
        lastSend = Date.now();
        closePop();
        const ev = { kind: 'chat', from: 0, text };
        play(ev);
        host.send(ev);
      };
      p.querySelectorAll('.gz-sp-lines button').forEach((b) => b.addEventListener('click', () => say(b.textContent, b)));
      const form = p.querySelector('form'), input = form.querySelector('input');
      form.addEventListener('submit', (e) => { e.preventDefault(); const t = cleanText(input.value); if (t) say(t, input); });
      p.querySelector('.gz-sp-hide input').addEventListener('change', (e) => { prefs.hide = !!e.target.checked; writePrefs(prefs); });
    }

    /* ───── 播放（我发的、别人发的、机器人回的都走这里）───── */
    function play(ev, opts) {
      if (!ev) return;
      const mine = ev.from === 0 && !(opts && opts.echo);
      if (!mine) {
        if (prefs.hide) return;
        if (host.muted && host.muted(ev.from)) return;   // 屏蔽了他：他扔的、说的都不画
      }
      const delay = Math.max(0, Math.min(4000, (opts && opts.delay) || 0));
      if (delay) { later(delay, () => play(ev, Object.assign({}, opts, { delay: 0 }))); return; }
      if (ev.kind === 'chat') { const t = cleanText(ev.text); if (t) bubble(ev.from, t); return; }
      if (ev.kind === 'prop' && ART[ev.prop] && ev.to !== ev.from) throwProp(ev);
    }

    /* 气泡：挨着说话人头像，停 3 秒淡出；同一个人再说一句就顶掉上一句 */
    function bubble(l, text) {
      const av = host.avatar(l);
      if (!av) return;
      const old = bubbles.get(l);
      if (old) old.remove();
      const b = mk('gz-sp-bubble');
      b.textContent = text;
      bubbles.set(l, b);
      host.sfx('bubble');
      const c = center(av), vw = window.innerWidth, vh = window.innerHeight;
      // 头像在屏幕上部（对家；竖屏时三家都挤在上面一排）：气泡一律放头像下面，每个最多占三分之一屏宽，免得三家的气泡叠在一起
      const high = l !== 0 && c.y < vh * 0.32;
      if (high) b.style.maxWidth = Math.max(96, Math.min(190, vw / 3 - 8)) + 'px';
      const W = b.offsetWidth, H = b.offsetHeight;
      let x, y, cls;
      if (l === 0) { x = c.x - 18; y = c.y - c.r - 12 - H; cls = 'is-dn'; }
      else if (high) { x = c.x - W / 2; y = c.y + c.r + 12; cls = 'is-up'; }
      else if (l === 3) { x = c.x + c.r + 12; y = c.y - H / 2; cls = 'is-lf'; }
      else { x = c.x - c.r - 12 - W; y = c.y - H / 2; cls = 'is-rt'; }
      const cx = Math.max(6, Math.min(vw - W - 6, x));
      b.classList.add(cls);
      if (cls === 'is-dn' || cls === 'is-up') b.style.setProperty('--tail', Math.max(10, Math.min(W - 22, c.x - cx - 6)) + 'px');
      const a = b.animate(reduce() ? [{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }].map((f) => Object.assign({ transform: 'translate(' + cx + 'px,' + y + 'px)' }, f)) : [
        { transform: 'translate(' + cx + 'px,' + y + 'px) scale(.6)', opacity: 0 },
        { transform: 'translate(' + cx + 'px,' + y + 'px) scale(1.04)', opacity: 1, offset: 0.05 },
        { transform: 'translate(' + cx + 'px,' + y + 'px) scale(1)', opacity: 1, offset: 0.08 },
        { transform: 'translate(' + cx + 'px,' + y + 'px) scale(1)', opacity: 1, offset: 0.9 },
        { transform: 'translate(' + cx + 'px,' + (y - 6) + 'px) scale(1)', opacity: 0 },
      ], { duration: 3400, easing: 'ease-out', fill: 'both' });
      a.finished.then(() => { b.remove(); if (bubbles.get(l) === b) bubbles.delete(l); }, () => b.remove());
    }

    /* ───── 飞行 + 落地 ───── */
    const SPIN = { flower: 25, coffee: 0, water: 0, rooster: 720, clap: 0, pig: 360 };
    function throwProp(ev) {
      const fromEl = host.avatar(ev.from), toEl = host.avatar(ev.to);
      if (!fromEl || !toEl) return;
      const a = center(fromEl), av = toEl, c = center(av);
      const S = Math.round(Math.max(36, Math.min(52, c.r * 2 * 1.15)));
      const k = Math.max(0.75, Math.min(1.1, c.r / 26));     // 头像越小，溅得越近
      const ctx = { c, S, k, av, top: roomy(c, S) };
      const end = landPoint(ev.prop, ctx);
      const el = mk('gz-sp-flyer', ART[ev.prop]);
      el.style.width = el.style.height = S + 'px';
      if (reduce()) {   // 减少动画：不飞，直接在落点淡入淡出
        done(el.animate([{ transform: at(end.x, end.y, S, S), opacity: 0 }, { transform: at(end.x, end.y, S, S), opacity: 1, offset: 0.2 }, { transform: at(end.x, end.y, S, S), opacity: 1, offset: 0.75 }, { transform: at(end.x, end.y, S, S), opacity: 0 }], { duration: 1200, fill: 'both' }), el);
        host.sfx('p' + ev.prop, 0);
        afterLand(ev, 600);
        return;
      }
      const frames = [], N = 18;
      const lift = 90 + Math.hypot(end.x - a.x, end.y - a.y) * 0.18;
      const cx = (a.x + end.x) / 2, cy = Math.min(a.y, end.y) - lift;
      for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const x = u * u * a.x + 2 * u * t * cx + t * t * end.x, y = u * u * a.y + 2 * u * t * cy + t * t * end.y;
        const s = 0.55 + 0.33 * Math.sin(Math.PI * t) + 0.45 * t;
        frames.push({ transform: at(x, y, S, S, ' rotate(' + (SPIN[ev.prop] * t).toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')') });
      }
      host.sfx('whoosh');
      const FLY = 640;
      el.animate(frames, { duration: FLY, easing: 'cubic-bezier(.35,.1,.45,1)', fill: 'forwards' }).finished.then(() => {
        LAND[ev.prop](el, ctx);
        afterLand(ev, 0);
      }, () => el.remove());
      host.sfx('p' + ev.prop, FLY);
    }
    // 单机：我扔给机器人 → 机器人有时回一句（约一半）、偶尔扔回来（约两成）
    function afterLand(ev, extra) {
      if (ev.from !== 0 || !host.autoBots || !host.autoBots() || !host.isBot(ev.to) || prefs.hide) return;
      const r = Math.random();
      if (r < 0.5) later(1100 + extra, () => play({ kind: 'chat', from: ev.to, text: pick(REPLY[ev.prop]) }));
      else if (r < 0.72) later(1300 + extra, () => play({ kind: 'prop', from: ev.to, to: 0, prop: Math.random() < 0.5 ? ev.prop : pick(PROP_KEYS) }));
    }

    // 头顶放得下吗（上家贴着上沿时改在头像右侧）
    function roomy(c, S) { return c.y - c.r - S * 0.95 > 0; }
    function landPoint(k, x) {
      const { c, S } = x;
      if (k === 'coffee' || k === 'water' || k === 'rooster' || k === 'clap') return x.top ? { x: c.x, y: c.y - c.r - S * 0.44 } : { x: c.x + c.r + S * 0.6, y: c.y - 8 };
      if (k === 'pig') return { x: c.x, y: c.y - S * 0.6 };
      return { x: c.x, y: c.y };
    }

    /* 小零件（尺寸都乘 k：头像小就收一点） */
    function particles(x, y, n, colors, o, k) {
      o = Object.assign({ dist: [30, 60], size: [5, 9], grav: 26, dur: 800, shape: 'dot', spread: [0, 360] }, o);
      for (let i = 0; i < n; i++) {
        const s = rnd(o.size[0], o.size[1]) * k, ang = rnd(o.spread[0], o.spread[1]) * Math.PI / 180, d = rnd(o.dist[0], o.dist[1]) * k;
        const p = mk('gz-sp-dot');
        p.style.width = p.style.height = s + 'px';
        p.style.background = colors[i % colors.length];
        if (o.shape === 'petal') p.style.borderRadius = '60% 0 60% 0';
        if (o.shape === 'drop') p.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
        const ex = x + Math.cos(ang) * d, ey = y + Math.sin(ang) * d, r = rnd(-180, 180);
        done(p.animate([
          { transform: at(x, y, s, s, ' scale(.4)'), opacity: 1 },
          { transform: at(x + (ex - x) * 0.8, y + (ey - y) * 0.8, s, s, ' rotate(' + (r * 0.6).toFixed(0) + 'deg)'), opacity: 1, offset: 0.45 },
          { transform: at(ex, ey + o.grav * k, s, s, ' rotate(' + r.toFixed(0) + 'deg) scale(.8)'), opacity: 0 },
        ], { duration: o.dur * rnd(0.85, 1.15), easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' }), p);
      }
    }
    function hearts(x, y, n, color, k) {
      for (let i = 0; i < n; i++) {
        const h = mk('gz-sp-dot', HEART(color)), s = rnd(14, 20) * k, dx = rnd(-26, 26) * k;
        h.style.width = h.style.height = s + 'px';
        done(h.animate([
          { transform: at(x, y, s, s, ' scale(.3)'), opacity: 0 },
          { transform: at(x + dx * 0.4, y - 18 * k, s, s, ' scale(1.1)'), opacity: 1, offset: 0.25 },
          { transform: at(x + dx, y - 62 * k, s, s, ' scale(.9)'), opacity: 0 },
        ], { duration: 1300, delay: i * 180, easing: 'ease-out', fill: 'both' }), h);
      }
    }
    // 头像本身的反应：动的是头像元素（不改它的样式，动画结束就恢复）
    function shake(av, amp, n) {
      const f = [];
      for (let i = 0; i <= n; i++) f.push({ transform: 'translateX(' + (i === n ? 0 : (i % 2 ? -amp : amp) * (1 - i / n)).toFixed(1) + 'px)' });
      av.animate(f, { duration: 70 * n, easing: 'linear' });
    }
    function jump(av) {
      av.animate([{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.06)', offset: 0.3 }, { transform: 'translateY(2px) scale(.97,1.03)', offset: 0.65 }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
    }
    function wobble(av) {
      av.animate([{ transform: 'none' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'none' }], { duration: 620, easing: 'ease-in-out' });
    }
    function tint(c, color, ms) {
      const t = mk('gz-sp-dot'), R = c.r * 2;
      t.style.width = t.style.height = R + 'px';
      t.style.background = color;
      done(t.animate([{ transform: at(c.x, c.y, R, R), opacity: 0.55 }, { transform: at(c.x, c.y, R, R), opacity: 0.45, offset: 0.5 }, { transform: at(c.x, c.y, R, R), opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'both' }), t);
    }
    function glow(c, color) {
      const g = mk('gz-sp-dot'), R = c.r * 2 + 6;
      g.style.width = g.style.height = R + 'px';
      g.style.boxShadow = '0 0 0 3px ' + color;
      done(g.animate([{ transform: at(c.x, c.y, R, R), opacity: 0.9 }, { transform: at(c.x, c.y, R, R, ' scale(1.35)'), opacity: 0 }], { duration: 700, iterations: 2, easing: 'ease-out', fill: 'both' }), g);
    }
    function arcs(x, y, dir, color, times, k) {   // 打鸣声波
      for (let t = 0; t < times; t++) for (let i = 0; i < 2; i++) {
        const s = 26 * k, e = mk('gz-sp-dot', '<svg viewBox="0 0 26 26" width="100%" height="100%"><path d="M8 4q9 9 0 18" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round"/></svg>');
        e.style.width = e.style.height = s + 'px';
        done(e.animate([
          { transform: at(x, y, s, s, ' scale(' + dir + ',1) scale(.5)'), opacity: 0 },
          { transform: at(x + dir * 8 * k, y, s, s, ' scale(' + dir + ',1) scale(.9)'), opacity: 1, offset: 0.3 },
          { transform: at(x + dir * 26 * k, y, s, s, ' scale(' + dir + ',1) scale(1.3)'), opacity: 0 },
        ], { duration: 520, delay: t * 300 + i * 130, easing: 'ease-out', fill: 'both' }), e);
      }
    }
    function sparks(x, y, color, k) {
      for (let i = 0; i < 7; i++) {
        const ang = (-90 + (i - 3) * 30) * Math.PI / 180, l = 12 * k, deg = (i - 3) * 30;
        const s = mk('gz-sp-dot');
        s.style.width = '4px'; s.style.height = l + 'px'; s.style.borderRadius = '2px'; s.style.background = color;
        done(s.animate([
          { transform: at(x + Math.cos(ang) * 10 * k, y + Math.sin(ang) * 10 * k, 4, l, ' rotate(' + deg + 'deg) scaleY(.3)'), opacity: 1 },
          { transform: at(x + Math.cos(ang) * 30 * k, y + Math.sin(ang) * 30 * k, 4, l, ' rotate(' + deg + 'deg) scaleY(1)'), opacity: 0 },
        ], { duration: 380, easing: 'ease-out', fill: 'both' }), s);
      }
    }
    function steam(x, y, k) {
      for (let i = 0; i < 2; i++) {
        const e = mk('gz-sp-dot', '<svg viewBox="0 0 14 30" width="100%" height="100%"><path d="M7 28c-5-5 5-9 0-14s5-9 0-12" fill="none" stroke="#bfb19c" stroke-width="3" stroke-linecap="round"/></svg>');
        const w = 14 * k, h = 30 * k, sx = x + (i ? 9 : -9) * k;
        e.style.width = w + 'px'; e.style.height = h + 'px';
        done(e.animate([
          { transform: at(sx, y, w, h, ' scale(.6)'), opacity: 0 },
          { transform: at(sx, y - 14 * k, w, h), opacity: 0.9, offset: 0.3 },
          { transform: at(sx + 3, y - 40 * k, w, h, ' scale(1.1)'), opacity: 0 },
        ], { duration: 1500, delay: i * 260, easing: 'ease-out', fill: 'both' }), e);
      }
    }
    function drips(x, y, color, k) {
      for (let i = 0; i < 3; i++) {
        const s = 7 * k, d = mk('gz-sp-dot');
        d.style.width = s + 'px'; d.style.height = s * 1.3 + 'px'; d.style.background = color;
        d.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
        const dx = (i - 1) * 14 * k;
        done(d.animate([
          { transform: at(x + dx, y, s, s * 1.3), opacity: 0 },
          { transform: at(x + dx, y + 4, s, s * 1.3), opacity: 1, offset: 0.2 },
          { transform: at(x + dx, y + 34 * k, s, s * 1.3, ' scaleY(1.3)'), opacity: 0 },
        ], { duration: 900, delay: 300 + i * 220, easing: 'ease-in', fill: 'both' }), d);
      }
    }
    function settle(el, frames, opt) { return done(el.animate(frames, Object.assign({ fill: 'forwards' }, opt)), el); }

    /* ───── 六种落地效果 ───── */
    const LAND = {
      flower(el, { c, S, k, av }) {
        settle(el, [{ transform: at(c.x, c.y, S, S, ' rotate(25deg)') }, { transform: at(c.x, c.y, S, S, ' scale(1.25)'), opacity: 1, offset: 0.25 }, { transform: at(c.x, c.y - 6, S, S, ' scale(.9)'), opacity: 0 }], { duration: 520 });
        particles(c.x, c.y - 6, 12, ['#f29aa6', '#f5b36b', '#e3625b', '#f8d35e'], { shape: 'petal', size: [7, 11], dist: [34, 62], grav: 34, dur: 1100 }, k);
        hearts(c.x, c.y - c.r, 2, '#e3625b', k);
        glow(c, '#f29aa6');
        void av;
      },
      coffee(el, x) {
        const { c, S, k, av, top } = x, L = landPoint('coffee', x);
        const px = top ? c.x + 6 * k : L.x - 4, py = top ? c.y - c.r - S * 0.36 : c.y - c.r - 2, R = top ? 115 : -115;
        settle(el, [{ transform: at(L.x, L.y, S, S) }, { transform: at(px, py, S, S, ' rotate(' + (-R / 11).toFixed(1) + 'deg)'), offset: 0.15 },
          { transform: at(px, py, S, S, ' rotate(' + R + 'deg)'), offset: 0.45 }, { transform: at(px, py, S, S, ' rotate(' + R + 'deg)'), opacity: 1, offset: 0.75 },
          { transform: at(px + 10, py - 14, S, S, ' rotate(' + R + 'deg)'), opacity: 0 }], { duration: 1200 });
        later(480, () => {
          particles(c.x - 4, c.y - c.r + 2, 7, ['#7a4a2c', '#8f5a37'], { shape: 'drop', spread: [60, 120], dist: [8, 20], size: [5, 8], grav: 18, dur: 520 }, k);
          const W = c.r * 1.5, H = W / 2;
          const st = mk('gz-sp-dot', '<svg viewBox="0 0 60 30" width="100%" height="100%"><path d="M6 14c0-8 12-10 18-8 6-5 18-3 22 2 8-1 12 6 8 11-2 4-8 4-11 2-1 5-6 6-8 2-3 4-9 4-11 0-5 2-11 1-12-3-4 0-6-3-6-6Z" fill="#7a4a2c"/></svg>');
          st.style.width = W + 'px'; st.style.height = H + 'px'; st.style.borderRadius = '0';
          done(st.animate([{ transform: at(c.x, c.y - c.r * 0.6, W, H, ' scale(.3)'), opacity: 0 }, { transform: at(c.x, c.y - c.r * 0.6, W, H), opacity: 0.9, offset: 0.1 },
            { transform: at(c.x, c.y - c.r * 0.6, W, H), opacity: 0.85, offset: 0.65 }, { transform: at(c.x, c.y - c.r * 0.4, W, H), opacity: 0 }], { duration: 2200, fill: 'both' }), st);
          shake(av, 4, 5);
          steam(c.x, c.y - c.r * 0.7, k);
        });
      },
      water(el, x) {
        const { c, S, k, av, top } = x, L = landPoint('water', x);
        const px = top ? c.x - 14 * k : L.x + 2, py = top ? c.y - c.r - S * 0.44 : c.y - c.r + 2;
        settle(el, [{ transform: at(L.x, L.y, S, S) }, { transform: at(px, py, S, S, ' rotate(20deg)'), offset: 0.2 }, { transform: at(px, py, S, S, ' rotate(-125deg)'), offset: 0.42 },
          { transform: at(px, py, S, S, ' rotate(-125deg)'), opacity: 1, offset: 0.7 }, { transform: at(px + (top ? -12 : 14), py - 16, S, S, ' rotate(-125deg)'), opacity: 0 }], { duration: 1100 });
        later(420, () => {
          const B = 34 * k, blob = mk('gz-sp-dot');
          blob.style.width = blob.style.height = B + 'px'; blob.style.background = '#a9d8f2';
          blob.style.borderRadius = '50% 50% 50% 50% / 40% 40% 60% 60%';
          blob.animate([{ transform: at(c.x - 4, c.y - c.r - 6, B, B, ' scale(.5,.8)') }, { transform: at(c.x, c.y - 4, B, B, ' scale(1.5,.7)'), opacity: 0.9 }], { duration: 170, easing: 'ease-in', fill: 'forwards' })
            .finished.then(() => {
              blob.remove();
              particles(c.x, c.y - 6, 16, ['#a9d8f2', '#7cc0e8', '#cfeaf8'], { shape: 'drop', dist: [30, 66], size: [6, 11], grav: 40, dur: 900 }, k);
              tint(c, '#6aa3d4', 1700);
              shake(av, 6, 8);
              drips(c.x, c.y + c.r - 4, '#7cc0e8', k);
            }, () => blob.remove());
        });
      },
      rooster(el, x) {
        const { c, S, k, av, top } = x, L = landPoint('rooster', x);
        const px = top ? c.x + 2 : L.x, py = top ? c.y - c.r - S * 0.36 : L.y;
        settle(el, [
          { transform: at(L.x, L.y, S, S, ' rotate(720deg)') }, { transform: at(px, py + 4, S, S, ' scale(1.1,.9)'), offset: 0.08 },
          { transform: at(px, py - 4, S, S, ' rotate(-10deg)'), offset: 0.16 }, { transform: at(px, py, S, S, ' rotate(8deg)'), offset: 0.24 },
          { transform: at(px, py - 4, S, S, ' rotate(-10deg)'), offset: 0.32 }, { transform: at(px, py, S, S, ' rotate(8deg)'), offset: 0.40 },
          { transform: at(px, py - 4, S, S, ' rotate(-10deg)'), offset: 0.48 }, { transform: at(px, py, S, S), offset: 0.62, opacity: 1 },
          { transform: at(px + 60 * k, py - 70 * k, S, S, ' rotate(20deg) scale(.7)'), opacity: 0 }], { duration: 1700, easing: 'ease-out' });
        arcs(px + S * 0.44, py - 10 * k, 1, '#c9a96e', 3, k);
        arcs(px - S * 0.44, py - 10 * k, -1, '#c9a96e', 3, k);
        jump(av);
        later(520, () => shake(av, 4, 6));
      },
      clap(el, x) {
        const { c, S, k } = x, L = landPoint('clap', x), f = [{ transform: at(L.x, L.y, S, S) }];
        for (let i = 0; i < 3; i++) {
          f.push({ transform: at(L.x, L.y, S, S, ' scale(1.15,1)'), offset: 0.1 + i * 0.22 });
          f.push({ transform: at(L.x, L.y, S, S, ' scale(.8,1.05)'), offset: 0.19 + i * 0.22 });
        }
        f.push({ transform: at(L.x, L.y, S, S), opacity: 1, offset: 0.82 }, { transform: at(L.x, L.y - 10, S, S), opacity: 0 });
        settle(el, f, { duration: 1300 });
        for (let i = 0; i < 3; i++) later(1300 * (0.19 + i * 0.22), () => sparks(L.x, L.y - S * 0.36, '#e9b949', k));
        glow(c, '#e9b949');
      },
      pig(el, x) {
        // 从头像左边蹦过去拱；左边贴着屏幕边（比如我自己的头像）就从右边来，小猪掉个头
        const { c, S, k, av } = x, L = landPoint('pig', x);
        const d = c.x - c.r - S * 1.1 < 4 ? -1 : 1, f = d < 0 ? ' scale(-1,1)' : '';
        const sx = c.x - d * (c.r + S * 0.6), y = c.y + 8 * k, X = (n) => sx + d * n * k;
        settle(el, [
          { transform: at(L.x, L.y, S, S, ' rotate(' + 360 * d + 'deg)' + f) }, { transform: at(sx, y, S, S, f + ' scale(1.1,.88)'), offset: 0.14 },
          { transform: at(X(8), y - 16 * k, S, S, ' rotate(' + -8 * d + 'deg)' + f), offset: 0.26 }, { transform: at(X(14), y, S, S, f + ' scale(1.08,.9)'), offset: 0.38 },
          { transform: at(X(20), y - 14 * k, S, S, ' rotate(' + -8 * d + 'deg)' + f), offset: 0.5 }, { transform: at(X(26), y, S, S, f), offset: 0.6 },
          { transform: at(X(36), y - 2, S, S, ' rotate(' + 10 * d + 'deg)' + f), offset: 0.66 }, { transform: at(X(26), y, S, S, f), opacity: 1, offset: 0.8 },
          { transform: at(X(18), y + 4, S, S, f + ' scale(.8)'), opacity: 0 }], { duration: 1900, easing: 'ease-out' });
        later(1200, () => { wobble(av); hearts(c.x - 10 * d, c.y - c.r, 3, '#f29aa6', k); });
      },
    };

    function clear() {
      gen++;
      closePop();
      bubbles.clear();
      layer.querySelectorAll('.gz-sp-flyer, .gz-sp-dot, .gz-sp-bubble').forEach((n) => { n.getAnimations().forEach((a) => a.cancel()); n.remove(); });
    }

    return { openProps, openChat, play, clear, close: closePop, isOpen: () => !!pop };
  }

  window.GongzhuSocial = { create, PROP_KEYS, PROP_NAMES, LINES, REPLY, ART, cleanText, TEXT_MAX };
})();
