/* 炸弹猫 · 内测（2026-11-27 用户：小鱼干要有花的地方；先只让自己的手机看到）
 *
 * 开关：用专用链接 ?zmbeta=<钥匙> 打开一次，本机 localStorage 记住（代码里只放钥匙的 SHA-256，别人找不到入口）；?zmbeta=off 关掉。
 * 没开的设备上：这个文件什么都不做，页面和以前一模一样。
 *
 * 内测里有：
 *   商店（主页底部「商店」）：道具（记牌器一天）+ 外观（桌布 / 牌背 / 头像框 / 出牌特效，买了永久）
 *   单机设置单里一排开局道具：记牌器（这局）、加倍（只对自己）、挑角色（角色玩法）、保证拿作废 / 交换（不卖逗猫棒）
 *   档案里一张「内测」卡：签到看广告再领一份、救济看广告翻倍、救济用完看广告再领、每日任务
 *   广告是假的：ZhamaoAds.rewarded(slot) 弹 5 秒全屏占位，接口照微信激励视频（onClose 回 isEnded）
 *
 * 记账：内测里花的 / 看广告领的小鱼干只记在本机（zm.beta.data.v1 的 delta），真实余额（服务器）一分不动；
 * 商店和档案内测卡里显示「真实余额 + 内测变动」。定稿后再接后端真扣。
 * 牌桌上不出说明文字（用户设计原则）：记牌器只有小图标 + 数字，加倍只有一枚 ×2 小印。
 */
(function (root) {
  'use strict';
  const HASH = '13cea08f0768ef6396ac20aafa48118a19a835b7a0bbcfb989d25c7037c124dc';
  const FLAG = 'zm.beta.v1', DATA = 'zm.beta.data.v1';
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* 无痕 */ } }, del: (k) => { try { localStorage.removeItem(k); } catch (_) { /* */ } } };

  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  async function gate() {
    let q;
    try { q = new URLSearchParams(location.search); } catch (_) { return; }
    const k = q.get('zmbeta');
    if (k == null) return;
    if (k === 'off') ls.del(FLAG);
    else { try { if ((await sha(k)) === HASH) ls.set(FLAG, '1'); } catch (_) { /* 不是 https：认不了 */ } }
    q.delete('zmbeta');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (_) { /* */ }
  }

  gate().then(() => { if (ls.get(FLAG) === '1') boot(); });

  function boot() {
    const W = () => root.ZhamaoWallet || null, R = () => root.ZhamaoRules || null, ART = () => root.ZhamaoArt || null, TB = () => root.ZhamaoTable || null;
    const FISH = () => (W() ? W().FISH : '🐟');
    const fmt = (x) => Math.round(Math.abs(x)).toLocaleString('en-US');
    const nice = (x) => (x <= 0 ? 0 : Math.round(x / 100) * 100);
    const today = () => (W() && W().today ? W().today() : new Date().toISOString().slice(0, 10));
    const $ = (id) => document.getElementById(id);

    // ── 本机账本 ──
    const D0 = () => ({ delta: 0, log: [], own: { felt: ['paper'], back: ['navy'], frame: ['none'], fx: ['none'] }, use: { felt: 'paper', back: 'navy', frame: 'none', fx: 'none' }, counterDay: '', pick: { counter: false, x2: false, role: null, nope: false, swap: false }, day: null });
    let d = (() => { try { return Object.assign(D0(), JSON.parse(ls.get(DATA)) || {}); } catch (_) { return D0(); } })();
    const save = () => ls.set(DATA, JSON.stringify(d));
    const realBal = () => { const s = W() && W().state ? W().state() : null; return s && s.bal != null ? s.bal : 0; };
    const bal = () => Math.max(0, realBal() + d.delta);
    function book(amt, why) { d.delta += amt; d.log.unshift({ at: Date.now(), amt, why }); d.log = d.log.slice(0, 60); save(); paintBal(); }
    function dayRec() {
      const t = today();
      if (!d.day || d.day.d !== t) { d.day = { d: t, ck: false, rAd: 0, extra: 0, games: 0, win: 0, online: 0, got: {} }; save(); }
      return d.day;
    }

    // ── 价格（2026-11-27 用户定）──
    // 门票的锚一律指顶格那张：高手 6–9 人 600。记牌器一天 = 5 张顶格门票，一局 = 1 张；加倍 = 本场门票；挑角色 = 本场门票 1.5 倍
    const TOP = 600;
    const ticket = (o) => (W() && W().price ? W().price(o.tier, o.mode === 'team' ? 'team' : o.mode, o.n) : 200);
    // 保证拿作废 / 交换：按模拟（shop-sim）多赢的期望定价——单机里一局多赢的期望（份数）× 一份，再加两成，至少一张本场门票
    const GAIN = { nope: { 2: 0.06, 4: 0.06, 6: 0.06, 9: 0.06 }, swap: { 2: 0.06, 4: 0.06, 6: 0.06, 9: 0.06 } };
    const UNIT = { easy: [500, 600, 800, 900, 1100, 1200, 1400, 1500], normal: [1000, 1200, 1500, 1800, 2100, 2400, 2700, 3000], hard: [2000, 2400, 3000, 3600, 4200, 4800, 5400, 6000] };
    function gainOf(kind, n) { const t = GAIN[kind]; const ks = Object.keys(t).map(Number); let best = ks[0]; ks.forEach((k) => { if (Math.abs(k - n) < Math.abs(best - n)) best = k; }); return t[best]; }
    const PRICES = {
      counterDay: () => TOP * 5,
      counter: () => TOP,
      x2: (o) => ticket(o),
      role: (o) => nice(ticket(o) * 1.5),
      nope: (o) => Math.max(ticket(o), Math.ceil(gainOf('nope', o.n) * (UNIT[o.tier] || UNIT.normal)[o.n - 2] * 1.2 / 100) * 100),
      swap: (o) => Math.max(ticket(o), Math.ceil(gainOf('swap', o.n) * (UNIT[o.tier] || UNIT.normal)[o.n - 2] * 1.2 / 100) * 100),
    };
    const counterDayOn = () => d.counterDay === today();

    // ── 外观目录 ──
    const CAT = {
      felt: [['paper', '宣纸', 0], ['celadon', '青瓷', 10000], ['sakura', '樱粉', 10000], ['bamboo', '竹影', 20000], ['indigo', '扎染', 30000]],
      back: [['navy', '藏青', 0], ['cinnabar', '朱砂', 10000], ['jade', '墨绿', 10000], ['wisteria', '紫藤', 20000], ['gilt', '鎏金', 30000]],
      frame: [['none', '无', 0], ['yarn', '毛线', 5000], ['fishbone', '鱼骨', 10000], ['gold', '金边', 20000]],
      fx: [['none', '无', 0], ['petals', '落樱', 30000], ['fish', '鱼群', 40000], ['sparks', '金粉', 50000]],
    };
    const CAT_NAME = { felt: '桌布', back: '牌背', frame: '头像框', fx: '出牌特效' };
    const BACK_FILL = { navy: '#2f4a6d', cinnabar: '#a63a2e', jade: '#2f5e4a', wisteria: '#6b4f8e', gilt: '#8a6a2a' };
    const FELT = {
      paper: '', celadon: '#e3ebe2', sakura: '#f6e6e4', bamboo: '#e6ecdc', indigo: '#e2e7ef',
    };
    const FELT_PAT = {
      bamboo: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M10 0v60M40 0v60' stroke='%2384a06c' stroke-opacity='.12' stroke-width='5'/%3E%3Cpath d='M7 20h6M37 44h6' stroke='%2384a06c' stroke-opacity='.18' stroke-width='2'/%3E%3C/svg%3E\")",
      indigo: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='9' fill='none' stroke='%232f4a6d' stroke-opacity='.10' stroke-width='3'/%3E%3Ccircle cx='0' cy='0' r='5' fill='%232f4a6d' fill-opacity='.07'/%3E%3Ccircle cx='48' cy='48' r='5' fill='%232f4a6d' fill-opacity='.07'/%3E%3C/svg%3E\")",
      sakura: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Cg fill='%23d98a8a' fill-opacity='.13'%3E%3Ccircle cx='15' cy='18' r='3'/%3E%3Ccircle cx='52' cy='50' r='2.4'/%3E%3C/g%3E%3C/svg%3E\")",
    };
    const FRAME_SVG = {
      yarn: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="none" stroke="#c0648f" stroke-width="3.2" stroke-dasharray="5 3.4" stroke-linecap="round"/><circle cx="54" cy="12" r="5" fill="#c0648f"/><path d="M50.5 9.5l7 5M51 14.6l6-6" stroke="#fbf6ec" stroke-width="1"/></svg>',
      fishbone: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="none" stroke="#8b8478" stroke-width="2"/>' + Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, x1 = 32 + Math.cos(a) * 27, y1 = 32 + Math.sin(a) * 27, x2 = 32 + Math.cos(a) * 32.5, y2 = 32 + Math.sin(a) * 32.5; return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="#8b8478" stroke-width="2" stroke-linecap="round"/>'; }).join('') + '</svg>',
      gold: '<svg viewBox="0 0 64 64"><defs><linearGradient id="zbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#f0cf7a"/></linearGradient></defs><circle cx="32" cy="32" r="30.2" fill="none" stroke="url(#zbg)" stroke-width="3.6"/><circle cx="32" cy="32" r="27.4" fill="none" stroke="#c9a24a" stroke-width=".8" opacity=".7"/><path d="M32 -1.2l2.6 4.6-2.6 2-2.6-2z" fill="#c9a24a"/></svg>',
    };

    // ── 样式 ──
    const css = `
.zb-shop,.zb-ad{position:fixed;inset:0;z-index:2147483000;font-family:'ZM Serif','Songti SC','Noto Serif SC',serif;color:#1d1b18}
.zb-shop{background:#f3eee3;display:flex;flex-direction:column;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);transform:translateY(100%);transition:transform .32s cubic-bezier(.2,.8,.25,1)}
.zb-shop.is-on{transform:none}
.zb-top{display:flex;align-items:center;gap:8px;height:52px;padding:0 10px;border-bottom:1px solid rgba(29,27,24,.18)}
.zb-top h2{margin:0;font-size:18px;letter-spacing:.1em;flex:1}
.zb-x{width:40px;height:40px;border-radius:50%;border:1px solid #1d1b18;background:#f3eee3;display:inline-flex;align-items:center;justify-content:center;padding:0}
.zb-x svg{width:20px;height:20px}
.zb-bal{display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:17px}
.zb-bal svg{width:26px;height:16px}
.zb-seal{display:inline-block;font-size:10px;line-height:1;padding:3px 4px;border:1px solid #b4392c;color:#b4392c;border-radius:3px;letter-spacing:.1em;margin-left:4px;font-weight:700}
.zb-tabs{display:flex;gap:6px;padding:10px 12px 4px}
.zb-tabs button{flex:1;height:36px;border:1px solid #1d1b18;background:#fffdf8;border-radius:18px;font:inherit;font-size:15px}
.zb-tabs button[aria-pressed=true]{background:#1d1b18;color:#fbf6ec}
.zb-body{flex:1;overflow:auto;padding:6px 12px 24px;-webkit-overflow-scrolling:touch}
.zb-sec{margin:12px 0 6px;font-size:13px;color:#6a6358;letter-spacing:.1em}
.zb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}
.zb-it{position:relative;border:1px solid #1d1b18;background:#fffdf8;border-radius:10px;padding:8px 6px 7px;display:flex;flex-direction:column;align-items:center;gap:5px;font:inherit;color:inherit}
.zb-it.is-use{box-shadow:0 0 0 2px #b4392c}
.zb-it b{font-size:14px}
.zb-it i{font-style:normal;font-size:12.5px;display:inline-flex;align-items:center;gap:2px;color:#1d1b18}
.zb-it i svg{width:18px;height:11px}
.zb-it i.ok{color:#3f7a52}
.zb-it.is-poor i{color:#aaa294}
.zb-pv{width:64px;height:64px;border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.zb-pv .zm-card{width:44px!important;position:static}
.zb-pv.av{border-radius:50%;width:56px;height:56px;background:#ebe5d8;box-shadow:0 0 0 1.5px #1d1b18;overflow:visible}
.zb-pv.av svg{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px)}
.zb-row{display:flex;align-items:center;gap:10px;border:1px solid #1d1b18;background:#fffdf8;border-radius:10px;padding:10px 12px;margin-bottom:8px}
.zb-row .t{flex:1;font-size:14.5px}
.zb-row .t small{display:block;color:#6a6358;font-size:12px;margin-top:2px}
.zb-btn{height:34px;padding:0 14px;border-radius:17px;border:1px solid #1d1b18;background:#fffdf8;font:inherit;font-size:14px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;color:#1d1b18}
.zb-btn svg{width:18px;height:11px}
.zb-btn.is-red{background:#b4392c;border-color:#b4392c;color:#fbf6ec}
.zb-btn[disabled]{opacity:.45}
.zb-ad{background:rgba(10,10,12,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#f3eee3}
.zb-ad .box{width:min(78vw,320px);aspect-ratio:9/14;border-radius:16px;background:repeating-linear-gradient(45deg,#2a2a30 0 14px,#323239 14px 28px);display:flex;align-items:center;justify-content:center;font-size:15px;letter-spacing:.3em;color:#9a978f}
.zb-ad .cnt{position:absolute;top:calc(env(safe-area-inset-top) + 16px);right:16px;min-width:64px;height:32px;border-radius:16px;border:1px solid rgba(243,238,227,.5);display:flex;align-items:center;justify-content:center;font-size:14px;padding:0 12px;background:none;color:inherit;font-family:inherit}
.zb-items{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:8px}
.zb-chip{height:34px;padding:0 10px 0 6px;border:1px solid #1d1b18;border-radius:17px;background:#fffdf8;display:inline-flex;align-items:center;gap:4px;font:inherit;font-size:13px;color:#1d1b18}
.zb-chip>svg,.zb-chip .gl svg{width:20px;height:20px}
.zb-chip i{font-style:normal;display:inline-flex;align-items:center;gap:1px;color:#6a6358;font-size:12px}
.zb-chip i svg{width:16px;height:10px}
.zb-chip[aria-pressed=true]{background:#1d1b18;color:#fbf6ec;border-color:#1d1b18}
.zb-chip[aria-pressed=true] i{color:#e3c98a}
.zb-chip[disabled]{opacity:.4}
.zb-chip .x2{font-weight:700;font-size:13px;width:20px;text-align:center;color:#b4392c}
.zb-chip[aria-pressed=true] .x2{color:#e3c98a}
.zb-chip .gl{display:inline-flex}
.zb-pick{position:fixed;inset:0;z-index:2147483001;background:rgba(29,27,24,.55);display:flex;align-items:center;justify-content:center}
.zb-pick-in{display:grid;grid-template-columns:repeat(3,auto);gap:12px;padding:16px;background:#f3eee3;border-radius:14px;border:1px solid #1d1b18}
.zb-pick-in button{border:0;background:none;padding:0;border-radius:9px}
.zb-pick-in button[aria-pressed=true]{box-shadow:0 0 0 3px #b4392c}
.zb-ctr{position:absolute;left:0;right:0;top:2px;display:flex;flex-wrap:wrap;justify-content:center;gap:3px 4px;z-index:3;pointer-events:none;padding:0 4px}
.zb-ctr span{display:flex;align-items:center;gap:1px;font-size:11px;font-weight:700;line-height:1;background:rgba(255,253,248,.85);border:1px solid rgba(29,27,24,.2);border-radius:8px;padding:1px 4px 1px 1px;font-family:'ZM Num','ZM Serif',serif}
.zb-ctr span svg{width:14px;height:14px}
.zb-ctr span.z{opacity:.3}
.zb-x2m{position:absolute;right:-8px;bottom:-6px;z-index:4;font-size:11px;font-weight:700;color:#fbf6ec;background:#b4392c;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.5px #fbf6ec;transform:rotate(-12deg);font-family:'ZM Num','ZM Serif',serif}
.zb-x2s{display:inline-flex;align-items:center;justify-content:center;margin-left:6px;font-size:12px;font-weight:700;color:#fbf6ec;background:#b4392c;border-radius:50%;width:24px;height:24px;transform:rotate(-12deg);vertical-align:middle}
.zb-frame{position:absolute;inset:-6px;pointer-events:none;z-index:2}
.zb-frame svg{width:100%;height:100%;overflow:visible}
.zb-fxp{position:fixed;left:0;top:0;pointer-events:none;z-index:2147482000;will-change:transform,opacity}
.zb-card{border:1px solid #1d1b18;background:#fffdf8;border-radius:12px;padding:12px;margin-bottom:10px}
.zb-card .h{display:flex;align-items:center;justify-content:space-between;font-weight:700;margin-bottom:8px}
.zb-card .zb-row{margin-bottom:6px;padding:8px 10px}
.zb-tk{height:6px;border-radius:3px;background:#ebe5d8;margin-top:5px;overflow:hidden}
.zb-tk i{display:block;height:100%;background:#3f7a52}
` + Object.keys(BACK_FILL).filter((k) => k !== 'navy').map((k) => `.zb-back-${k} .zm-card.is-back svg>rect:first-child{fill:${BACK_FILL[k]}}`).join('\n') + '\n' +
      `.zb-back-gilt .zm-card.is-back svg>rect:nth-child(2){stroke:#f3d58a}\n` +
      Object.keys(FELT).filter((k) => FELT[k]).map((k) => `.zb-felt-${k} .zm-table,.zb-felt-${k}.zm-app{background-color:${FELT[k]}}` + (FELT_PAT[k] ? `\n.zb-felt-${k} .zm-table{background-image:${FELT_PAT[k]}}` : '')).join('\n');
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    // ── 假广告（接口照微信激励视频：show() 之后 onClose({ isEnded })；以后换真的只改这里）──
    const AD_SEC = 5;
    function rewarded(slot) {
      return new Promise((resolve) => {
        const m = document.createElement('div');
        m.className = 'zb-ad'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', '广告');
        m.dataset.slot = slot;
        m.innerHTML = '<div class="box">广告位</div><button type="button" class="cnt">' + AD_SEC + '</button>';
        document.body.appendChild(m);
        const cnt = m.querySelector('.cnt');
        let left = AD_SEC;
        const iv = setInterval(() => { left--; cnt.textContent = left > 0 ? String(left) : '领取'; if (left <= 0) clearInterval(iv); }, 1000);
        cnt.addEventListener('click', () => { clearInterval(iv); m.remove(); resolve({ isEnded: left <= 0 }); });
      });
    }
    root.ZhamaoAds = { rewarded };
    const adThen = (slot, fn) => rewarded(slot).then((r) => { if (r.isEnded) fn(); });

    // ── 商店 ──
    const BACK_SVG = '<svg viewBox="0 0 40 40"><path d="M24.5 6.5 13 20l11.5 13.5" fill="none" stroke="#b4392c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    let shop = null, tab = 'look';
    let balEls = [];
    function paintBal() { balEls = balEls.filter((e) => e.isConnected); balEls.forEach((e) => { e.textContent = fmt(bal()); }); }
    const balHtml = () => '<span class="zb-bal">' + FISH() + '<b data-zbbal>' + fmt(bal()) + '</b></span><span class="zb-seal">内测</span>';
    function grabBal(el) { el.querySelectorAll('[data-zbbal]').forEach((e) => balEls.push(e)); }
    function previewHtml(cat, id) {
      if (cat === 'felt') return '<span class="zb-pv" style="background-color:' + (FELT[id] || '#f3eee3') + ';' + (FELT_PAT[id] ? 'background-image:' + FELT_PAT[id] + ';' : '') + 'box-shadow:inset 0 0 0 1px rgba(29,27,24,.25)"></span>';
      if (cat === 'back') return '<span class="zb-pv zb-back-' + id + '">' + (TB() ? TB().backHtml() : '') + '</span>';
      if (cat === 'frame') return '<span class="zb-pv av">' + avFace() + (FRAME_SVG[id] || '') + '</span>';
      const glyph = { none: '', petals: '🌸', fish: FISH(), sparks: '✨' }[id];
      return '<span class="zb-pv" style="background:#ebe5d8;font-size:30px">' + (id === 'fish' ? '<span style="width:44px;display:inline-flex">' + glyph + '</span>' : glyph) + '</span>';
    }
    function avFace() { const a = document.querySelector('#zmMe .zm-av-face'); return a ? '<span style="width:100%;height:100%;border-radius:50%;overflow:hidden;display:flex">' + a.innerHTML + '</span>' : ''; }
    function shopHtml() {
      let h = '<div class="zb-top"><button type="button" class="zb-x" data-zb="close" aria-label="返回">' + BACK_SVG + '</button><h2>商店</h2>' + balHtml() + '</div>' +
        '<div class="zb-tabs"><button type="button" data-zbtab="look" aria-pressed="' + (tab === 'look') + '">外观</button><button type="button" data-zbtab="items" aria-pressed="' + (tab === 'items') + '">道具</button></div><div class="zb-body">';
      if (tab === 'look') {
        Object.keys(CAT).forEach((cat) => {
          h += '<div class="zb-sec">' + CAT_NAME[cat] + '</div><div class="zb-grid">' + CAT[cat].map(([id, name, p]) => {
            const own = d.own[cat].includes(id), use = d.use[cat] === id;
            const tag = use ? '<i class="ok">使用中</i>' : own ? '<i>使用</i>' : '<i>' + FISH() + fmt(p) + '</i>';
            return '<button type="button" class="zb-it' + (use ? ' is-use' : '') + (!own && bal() < p ? ' is-poor' : '') + '" data-zbcat="' + cat + '" data-zbid="' + id + '">' + previewHtml(cat, id) + '<b>' + name + '</b>' + tag + '</button>';
          }).join('') + '</div>';
        });
      } else {
        h += '<div class="zb-row"><span class="t">记牌器 · 今天一整天<small>单机牌局里，牌堆旁一列小图标显示还没出现的牌各有几张</small></span>' +
          (counterDayOn() ? '<span class="zb-btn" style="border-color:#3f7a52;color:#3f7a52">今天已开</span>' : '<button type="button" class="zb-btn is-red" data-zb="counterDay"' + (bal() < PRICES.counterDay() ? ' disabled' : '') + '>' + FISH() + fmt(PRICES.counterDay()) + '</button>') + '</div>';
        h += '<div class="zb-sec">开局道具</div><div class="zb-row"><span class="t">在单机设置单里选，开局时扣<small>记牌器（这一局）、加倍（只对自己，输赢都翻倍）、挑角色（角色玩法）、保证拿一张作废 / 交换（手牌张数不变，随机换掉一张非逗猫棒的牌）</small></span></div>';
        h += '<div class="zb-sec">内测账本</div>' + (d.log.length ? d.log.slice(0, 20).map((x) => '<div class="zb-row" style="padding:7px 12px"><span class="t">' + x.why + '<small>' + new Date(x.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</small></span><b style="color:' + (x.amt < 0 ? '#b4392c' : '#3f7a52') + '">' + (x.amt < 0 ? '−' : '+') + fmt(x.amt) + '</b></div>').join('') : '<div class="zb-row"><span class="t" style="color:#6a6358">还没有</span></div>') +
          '<div class="zb-row"><span class="t">清空内测账本<small>内测花的、领的全部归零，外观也收回</small></span><button type="button" class="zb-btn" data-zb="reset">清空</button></div>';
      }
      return h + '</div>';
    }
    function paintShop() { if (!shop) return; shop.innerHTML = shopHtml(); grabBal(shop); }
    function openShop() {
      if (!shop) {
        shop = document.createElement('section');
        shop.className = 'zb-shop'; shop.setAttribute('role', 'dialog'); shop.setAttribute('aria-label', '商店');
        document.body.appendChild(shop);
        shop.addEventListener('click', onShop);
      }
      paintShop();
      shop.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => shop.classList.add('is-on')));
    }
    function closeShop() { if (!shop) return; shop.classList.remove('is-on'); setTimeout(() => { shop.hidden = true; }, 320); }
    function onShop(e) {
      const t = e.target.closest('[data-zbtab]');
      if (t) { tab = t.dataset.zbtab; paintShop(); return; }
      const a = e.target.closest('[data-zb]');
      if (a) {
        const k = a.dataset.zb;
        if (k === 'close') closeShop();
        if (k === 'counterDay' && bal() >= PRICES.counterDay()) { book(-PRICES.counterDay(), '记牌器（一天）'); d.counterDay = today(); save(); paintShop(); }
        if (k === 'reset') { const keep = d.pick; d = D0(); d.pick = keep; save(); applyLook(); paintShop(); }
        return;
      }
      const it = e.target.closest('[data-zbcat]');
      if (it) {
        const cat = it.dataset.zbcat, id = it.dataset.zbid, row = CAT[cat].find((x) => x[0] === id);
        if (!d.own[cat].includes(id)) { if (bal() < row[2]) return; book(-row[2], CAT_NAME[cat] + '「' + row[1] + '」'); d.own[cat].push(id); }
        d.use[cat] = id; save(); applyLook(); paintShop();
      }
    }

    // 主页底部加一个「商店」
    function mountCover() {
      const foot = document.querySelector('.zm-cover-foot');
      if (!foot || foot.querySelector('[data-zbshop]')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'zm-cover-link'; b.dataset.zbshop = '1'; b.textContent = '商店';
      b.addEventListener('click', (e) => { e.stopPropagation(); openShop(); });
      foot.insertBefore(b, foot.firstChild);
    }

    // ── 外观落到牌桌上 ──
    function applyLook() {
      const app = $('zmApp');
      if (!app) return;
      [...app.classList].filter((c) => /^zb-(felt|back)-/.test(c)).forEach((c) => app.classList.remove(c));
      if (d.use.felt !== 'paper') app.classList.add('zb-felt-' + d.use.felt);
      if (d.use.back !== 'navy') { app.classList.add('zb-back-' + d.use.back); document.body.classList.add('zb-back-' + d.use.back); }
      [...document.body.classList].filter((c) => /^zb-back-/.test(c) && c !== 'zb-back-' + d.use.back).forEach((c) => document.body.classList.remove(c));
    }
    function paintFrame() {
      const av = document.querySelector('#zmMe .zm-av');
      if (!av) return;
      let f = av.querySelector('.zb-frame');
      const want = d.use.frame !== 'none' ? d.use.frame : '';
      if (!want) { if (f) f.remove(); return; }
      if (f && f.dataset.k === want) return;
      if (!f) { f = document.createElement('span'); f.className = 'zb-frame'; av.appendChild(f); }
      f.dataset.k = want; f.innerHTML = FRAME_SVG[want];
    }

    // ── 单机设置单：开局道具 ──
    let soloCtx = null;
    const ROLE_IDS = () => (R() && R().ROLES ? R().ROLES.map((r) => r.id) : []);
    function solo(ctx) {
      soloCtx = ctx;
      const pick = document.querySelector('.zm-solo-pick');
      if (!pick) return;
      let row = pick.querySelector('.zb-items');
      if (!row) { row = document.createElement('div'); row.className = 'zb-items'; pick.appendChild(row); row.addEventListener('click', onChip); }
      const team = ctx.mode === 'team';
      const icon = (k) => (ART() && ART().icon ? ART().icon(k) : '');
      const chips = [];
      if (!counterDayOn()) chips.push(['counter', icon('future'), PRICES.counter(ctx)]);
      if (!team) chips.push(['x2', '<span class="x2">×2</span>', PRICES.x2(ctx)]);
      if (ctx.mode === 'roles') chips.push(['role', d.pick.role && ART() ? '<span class="gl">' + ART().roleGlyph(d.pick.role) + '</span>' : (ART() ? '<span class="gl">' + ART().roleGlyph('calico') + '</span>' : ''), PRICES.role(ctx)]);
      if (!team) chips.push(['nope', icon('nope'), PRICES.nope(ctx)]);
      if (!team && ctx.rules && ctx.rules.swap) chips.push(['swap', icon('swap'), PRICES.swap(ctx)]);
      const label = { counter: '记牌器', x2: '加倍', role: '挑角色', nope: '作废', swap: '交换' };
      row.innerHTML = chips.map(([k, ic, p]) => { const on = k === 'role' ? !!d.pick.role : !!d.pick[k]; return '<button type="button" class="zb-chip" data-zbp="' + k + '" aria-pressed="' + on + '" aria-label="' + label[k] + '">' + ic + '<i>' + FISH() + fmt(p) + '</i></button>'; }).join('');
    }
    function onChip(e) {
      const b = e.target.closest('[data-zbp]');
      if (!b) return;
      e.stopPropagation();
      const k = b.dataset.zbp;
      if (k === 'role') { if (d.pick.role) { d.pick.role = null; save(); solo(soloCtx); } else rolePicker(); return; }
      d.pick[k] = !d.pick[k]; save(); solo(soloCtx);
    }
    function rolePicker() {
      const m = document.createElement('div');
      m.className = 'zb-pick';
      const html = TB() && TB().roleCardHtml ? (id) => TB().roleCardHtml(id, { w: 84 }) : (id) => id;
      m.innerHTML = '<div class="zb-pick-in">' + ROLE_IDS().map((id) => '<button type="button" data-r="' + id + '" aria-pressed="' + (d.pick.role === id) + '">' + html(id) + '</button>').join('') + '</div>';
      m.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.target.closest('[data-r]');
        if (b) { d.pick.role = b.dataset.r; save(); }
        m.remove(); if (soloCtx) solo(soloCtx);
      });
      document.body.appendChild(m);
    }

    // ── 开局：扣道具、改牌 ──
    function guarantee(s, kind, keep) {   // 同 shop-sim/sim.js：牌堆里随机一张这种牌进手，手里随机一张（非逗猫棒 / 百变 / 同种）洗回牌堆，手牌张数不变
      const r = R(), di = s.deck.map((id, i) => [id, i]).filter(([id]) => r.KIND_OF[id] === kind);
      const h = s.hands[0], hi = h.map((id, i) => [id, i]).filter(([id]) => ![r.DEFUSE, r.FLUX, kind].concat(keep || []).includes(r.KIND_OF[id]));   // keep：这局已经保证拿到的别再换走
      if (!di.length || !hi.length) return false;
      const [dId, dIdx] = di[(Math.random() * di.length) | 0], [hId, hIdx] = hi[(Math.random() * hi.length) | 0];
      h[hIdx] = dId; s.deck[dIdx] = hId;
      for (let i = s.deck.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [s.deck[i], s.deck[j]] = [s.deck[j], s.deck[i]]; }
      return true;
    }
    function onDeal(game, ctx) {
      if (!game || game.tutorial || game.online) return;
      const s = game.state, o = { tier: ctx.tier, mode: ctx.mode, n: s.n, rules: s.rules };
      const zb = {};
      const buy = (k, why) => { const p = PRICES[k](o); if (bal() < p) return false; book(-p, why); return true; };
      if (counterDayOn()) zb.counter = true;
      else if (d.pick.counter && buy('counter', '记牌器（一局）')) zb.counter = true;
      if (o.mode !== 'team') {
        if (d.pick.x2 && buy('x2', '加倍')) zb.x2 = true;
        if (o.mode === 'roles' && d.pick.role && s.roles && buy('role', '挑角色')) { s.roles[0] = d.pick.role; zb.role = d.pick.role; }
        if (d.pick.nope && bal() >= PRICES.nope(o) && guarantee(s, R().NOPE)) { book(-PRICES.nope(o), '开局拿作废'); zb.nope = true; }
        if (d.pick.swap && s.rules.swap && bal() >= PRICES.swap(o) && guarantee(s, R().SWAP, zb.nope ? [R().NOPE] : [])) { book(-PRICES.swap(o), '开局拿交换'); zb.swap = true; }
        if ((zb.nope || zb.swap) && R().sortHand) s.hands[0] = R().sortHand(s.hands[0]);
      }
      if (zb.role || zb.nope || zb.swap) game.hl = null;   // 改过发牌：这局的录像按种子重放会对不上，不收
      if (Object.keys(zb).length) s.zb = zb;
      d.pick = { counter: false, x2: false, role: null, nope: false, swap: false };   // 开局道具一局一买，开局后清掉
      dayRec().games++; save();
    }

    // ── 牌桌上：记牌器、×2 印、头像框、出牌特效、结算翻倍 ──
    const CTR_KINDS = ['boom', 'defuse', 'nope', 'attack', 'tattack', 'skip', 'reverse', 'bottom', 'favor', 'swap', 'shuffle', 'future', 'alter', 'flux', 'cat'];
    let ctrEl = null, ctrInit = null, ctrGame = null;
    function kindOf(id) { const r = R(), k = r.KIND_OF[id]; return r.CATS.includes(k) || k === r.WILD ? 'cat' : k; }
    function paintCounter(g) {
      const s = g.state;
      if (!s.zb || !s.zb.counter || g.online) { if (ctrEl) { ctrEl.remove(); ctrEl = null; } return; }
      const c = {}, add = (id) => { const k = kindOf(id); c[k] = (c[k] || 0) + 1; };
      s.deck.forEach(add);
      for (let k = 1; k < s.n; k++) if (s.alive[k]) s.hands[k].forEach(add);
      if (ctrGame !== g) { ctrGame = g; ctrInit = {}; const all = s.deck.concat(...s.hands, s.discard); all.forEach((id) => { ctrInit[kindOf(id)] = 1; }); }
      const center = $('zmCenter');
      if (!center) return;
      if (!ctrEl || !ctrEl.isConnected) { ctrEl = document.createElement('div'); ctrEl.className = 'zb-ctr'; ctrEl.setAttribute('aria-hidden', 'true'); center.appendChild(ctrEl); }
      const key = JSON.stringify(c);
      if (ctrEl.dataset.k === key) return;
      ctrEl.dataset.k = key;
      ctrEl.innerHTML = CTR_KINDS.filter((k) => ctrInit[k]).map((k) => '<span class="' + (c[k] ? '' : 'z') + '">' + (ART().icon(k === 'cat' ? 'wild' : k) || '') + (c[k] || 0) + '</span>').join('');
    }
    function paintX2(g) {
      const av = document.querySelector('#zmMe .zm-av');
      if (!av) return;
      let m = av.querySelector('.zb-x2m');
      const on = !!(g && g.state.zb && g.state.zb.x2 && !g.online);
      if (!on) { if (m) m.remove(); return; }
      if (!m) { m = document.createElement('span'); m.className = 'zb-x2m'; m.textContent = '×2'; m.setAttribute('aria-hidden', 'true'); av.appendChild(m); }
    }
    // 结算：加倍 = 再记一份名次结算（扣的也翻倍），封顶同真实规则（赢不超过余额、扣到 0 为止）
    function settleX2(g) {
      const s = g.state;
      if (!s.zb || !s.zb.x2 || s.zb.x2done || !g.wt) return;
      const r = g.wt.done || g.wt.est;
      const line = document.querySelector('#zmDialog .zmw-ln.is-main b');
      if (!r || r.pay == null || !line) return;
      if (!g.wt.done && !(g.wt.__zbT)) { g.wt.__zbT = Date.now(); return; }
      if (!g.wt.done && Date.now() - g.wt.__zbT < 3000) return;
      s.zb.x2done = true;
      let x = r.pay;
      if (x > 0) x = Math.min(x, bal()); else if (x < 0) x = -Math.min(-x, bal());
      if (x) book(x, '加倍（' + (x > 0 ? '多赢' : '多扣') + '）');
      if (!line.parentNode.querySelector('.zb-x2s')) { const sp = document.createElement('span'); sp.className = 'zb-x2s'; sp.textContent = '×2'; line.parentNode.insertBefore(sp, line.nextSibling); }
    }
    // 每日任务：开局计数在 onDeal；赢、联机在这里看
    const seen = new WeakSet();
    function taskWatch(g) {
      if (!g || seen.has(g) || g.tutorial) return;
      const s = g.state;
      if (g.online && !seen.has(g)) { if (s && s.phase && s.phase !== 'lobby') { seen.add(g); dayRec().online++; save(); } return; }
      if (s.phase === 'over') { seen.add(g); if (s.winner === 0) { dayRec().win++; save(); } }
    }
    // 出牌特效：我手牌少了、弃牌堆多了 = 我出了牌
    let fxLast = null;
    function fxWatch(g) {
      const s = g.state;
      if (!s || !s.hands || !s.discard) return;
      const now = { g, h: s.hands[0] ? s.hands[0].length : 0, dc: s.discard.length };
      if (fxLast && fxLast.g === g && now.dc > fxLast.dc && now.h < fxLast.h && d.use.fx !== 'none') setTimeout(() => burst(d.use.fx), 260);
      fxLast = now;
    }
    function burst(kind) {
      const dc = $('zmDiscard');
      if (!dc || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = dc.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const N = kind === 'fish' ? 5 : 12;
      for (let i = 0; i < N; i++) {
        const p = document.createElement('div');
        p.className = 'zb-fxp';
        const a = (i / N) * Math.PI * 2 + Math.random() * 0.5, dist = r.width * (0.7 + Math.random() * 0.6);
        let html, size;
        if (kind === 'petals') { size = 12 + Math.random() * 6; html = '<svg viewBox="0 0 20 20" width="' + size + '"><path d="M10 2c3 3 4 7 0 16C6 9 7 5 10 2Z" fill="#f2a7b5" opacity=".9"/></svg>'; }
        else if (kind === 'sparks') { size = 6 + Math.random() * 6; html = '<svg viewBox="0 0 10 10" width="' + size + '"><path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill="#e3b64a"/></svg>'; }
        else { size = 26; html = '<span style="display:inline-flex;width:' + size + 'px">' + FISH() + '</span>'; }
        p.innerHTML = html;
        document.body.appendChild(p);
        const x0 = cx - size / 2, y0 = cy - size / 2, x1 = x0 + Math.cos(a) * dist, y1 = y0 + Math.sin(a) * dist + (kind === 'petals' ? 30 : 0);
        const rot = (Math.random() - 0.5) * 360;
        p.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.4) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(1) rotate(' + rot + 'deg)', opacity: 0 }],
          { duration: kind === 'fish' ? 900 : 760 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).finished.then(() => p.remove(), () => p.remove());
      }
    }
    setInterval(() => {
      mountCover();
      paintFrame();
      const g = TB() && TB().game ? TB().game() : null;
      if (!g || !g.state) { if (ctrEl) { ctrEl.remove(); ctrEl = null; } return; }
      try { paintCounter(g); paintX2(g); settleX2(g); taskWatch(g); fxWatch(g); } catch (_) { /* 内测：别让它拖垮牌局 */ }
    }, 150);
    applyLook();

    // ── 档案里的「内测」卡：广告翻倍、额外救济、每日任务 ──
    const TASKS = [['games', '打 3 局', 3, 300], ['win', '赢 1 局', 1, 500], ['online', '联机打 1 局', 1, 500]];
    const RELIEF = 2000, EXTRA_MAX = 2;
    function betaCard() {
      const r = dayRec(), ws = W() && W().state ? W().state() || {} : {}, ck = ws.ck === today(), rl = ws.relief || {};
      const ckAmt = ws.ckAmt || 0;
      const used = rl.left != null ? Math.max(0, 2 - rl.left) : 0;
      const row = (t, btn) => '<div class="zb-row"><span class="t">' + t + '</span>' + btn + '</div>';
      const adBtn = (k, amt, ok) => '<button type="button" class="zb-btn is-red" data-zbad="' + k + '"' + (ok ? '' : ' disabled') + '>▶ ' + FISH() + '+' + fmt(amt) + '</button>';
      let h = '<div class="zb-card" data-zbcard><div class="h"><span class="zb-seal" style="margin:0">内测</span><span class="zb-bal">' + FISH() + '<b data-zbbal>' + fmt(bal()) + '</b></span></div>';
      h += row('签到看广告，再领一份<small>' + (ck ? '今天已签到' : '先签到') + '</small>', r.ck ? '<span class="zb-btn">已领</span>' : adBtn('ck', ckAmt || 500, ck));
      h += row('救济看广告翻倍<small>今天领了 ' + used + ' 次救济，已翻倍 ' + r.rAd + ' 次</small>', adBtn('relief', RELIEF, used > r.rAd));
      h += row('救济用完了，看广告再领<small>每天最多 ' + EXTRA_MAX + ' 次，今天 ' + r.extra + ' 次</small>', adBtn('extra', RELIEF, rl.left === 0 && r.extra < EXTRA_MAX));
      h += '<div class="zb-sec" style="margin-top:10px">每日任务</div>';
      TASKS.forEach(([k, name, goal, amt]) => {
        const v = Math.min(goal, r[k] || 0), got = r.got[k] || 0;
        const btn = got === 2 ? '<span class="zb-btn">已领</span>' : got === 1 ? adBtn('t2:' + k, amt, true) : '<button type="button" class="zb-btn' + (v >= goal ? ' is-red' : '') + '" data-zbt="' + k + '"' + (v >= goal ? '' : ' disabled') + '>' + FISH() + '+' + fmt(amt) + '</button>';
        h += '<div class="zb-row"><span class="t">' + name + '<small>' + v + ' / ' + goal + (got === 1 ? '，看广告再领一份' : '') + '</small><span class="zb-tk"><i style="width:' + (v / goal * 100) + '%"></i></span></span>' + btn + '</div>';
      });
      return h + '</div>';
    }
    function mountCard(bodyEl) {
      const grid = bodyEl.querySelector('.zmp-grid');
      if (!grid) return;
      const old = bodyEl.querySelector('[data-zbcard]');
      const wrap = document.createElement('div'); wrap.innerHTML = betaCard();
      const card = wrap.firstChild;
      if (old) old.replaceWith(card); else grid.parentNode.insertBefore(card, grid);
      grabBal(card);
      card.addEventListener('click', (e) => {
        const a = e.target.closest('[data-zbad]'), t = e.target.closest('[data-zbt]');
        const r = dayRec();
        if (t && !t.disabled) { const k = t.dataset.zbt, row = TASKS.find((x) => x[0] === k); r.got[k] = 1; save(); book(row[3], '每日任务「' + row[1] + '」'); mountCard(bodyEl); return; }
        if (!a || a.disabled) return;
        const k = a.dataset.zbad;
        if (k === 'ck') adThen('checkin', () => { const ws = W().state() || {}; r.ck = true; save(); book(ws.ckAmt || 500, '签到·看广告'); mountCard(bodyEl); });
        if (k === 'relief') adThen('relief', () => { r.rAd++; save(); book(RELIEF, '救济·看广告翻倍'); mountCard(bodyEl); });
        if (k === 'extra') adThen('relief-extra', () => { r.extra++; save(); book(RELIEF, '额外救济·看广告'); mountCard(bodyEl); });
        if (k.startsWith('t2:')) { const kk = k.slice(3), row = TASKS.find((x) => x[0] === kk); adThen('task', () => { r.got[kk] = 2; save(); book(row[3], '每日任务·看广告'); mountCard(bodyEl); }); }
      });
    }
    // 档案每次重画 body：看到签到卡就把内测卡插在前面
    new MutationObserver(() => {
      const b = document.querySelector('.zmp .zmp-body');
      if (b && b.querySelector('.zmp-grid') && !b.querySelector('[data-zbcard]')) {
        // 签到额：今天这格（已签的最后一格 / 正要签的那格）的数，看广告再领同样一份
        const days = [...b.querySelectorAll('.zmp-day')], cur = days.filter((x) => x.classList.contains('is-done')).pop();
        const ws = W() && W().state ? W().state() : null;
        if (ws && cur) ws.ckAmt = Number((cur.getAttribute('aria-label') || '').split(' ').pop()) || 500;
        mountCard(b);
      }
    }).observe(document.body, { childList: true, subtree: true });

    root.ZhamaoBeta = { on: true, solo, onDeal, openShop, rewarded, bal, data: () => d };
  }
})(window);
