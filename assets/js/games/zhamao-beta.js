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
    const top = q.get('zbtop');
    if (top != null && ls.get(FLAG) === '1') {   // 测试设备补鱼（2026-11-27 用户：测试账号鱼花完了让我补）：?zbtop=<数>-<号>，同一个号只认一次；只记本机内测账
      const [amt, id] = top.split('-'); const n = Math.round(Number(amt) || 0);
      try { const dd = JSON.parse(ls.get(DATA) || '{}'); dd.tops = dd.tops || []; if (n > 0 && n <= 10000000 && id && !dd.tops.includes(id)) { dd.tops.push(id); dd.delta = (dd.delta || 0) + n; dd.log = [{ at: Date.now(), amt: n, why: '补鱼（内测）' }].concat(dd.log || []).slice(0, 60); ls.set(DATA, JSON.stringify(dd)); } } catch (_) { /* */ }
      q.delete('zbtop');
      try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (_) { /* */ }
    }
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
    const FRAMES_NOW = ['none', 'fishbone', 'bell', 'qinghua', 'ears'];   // 下架的头像框：用着的退回「无」
    if (d.own && d.own.frame) d.own.frame = d.own.frame.filter((x) => FRAMES_NOW.includes(x));
    if (d.use && !FRAMES_NOW.includes(d.use.frame)) d.use.frame = 'none';
    const realBal = () => { const s = W() && W().state ? W().state() : null; return s && s.bal != null ? s.bal : 0; };
    const bal = () => Math.max(0, realBal() + d.delta);
    function book(amt, why) { d.delta += amt; d.log.unshift({ at: Date.now(), amt, why }); d.log = d.log.slice(0, 60); save(); paintBal(); }
    function dayRec() {
      const t = today();
      if (!d.day || d.day.d !== t) { d.day = { d: t, ck: false, rAd: 0, extra: 0, games: 0, win: 0, online: 0, got: {} }; save(); }
      return d.day;
    }

    // 记牌器的图标：一把小算盘（2026-11-27 用户：用窥探的眼睛会让人以为保证开局有一张窥探）
    // 2026-11-27 第四轮：算盘也不好认（用户自己都要想一下）→ 一张牌上画「正」字计数，中国人一看就知道是在数东西
    const CTR_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="2.5" width="15" height="19" rx="2.2" fill="#fffdf8" stroke="#1d1b18" stroke-width="1.5"/><g stroke="#b4392c" stroke-width="1.7" stroke-linecap="round"><path d="M8.2 7h7.6M12 7v10.3M12 11.8h3.2M8.8 11.2v6.1M7.6 17.3h8.8"/></g></svg>';
    // ── 价格（2026-11-27 用户定）──
    // 门票的锚一律指顶格那张：高手 6–9 人 600（用户 2026-11-27）。道具能囤，所以不按本场门票定价，一律按顶格：
    // 记牌器一局 / 加倍 / 作废 / 交换 = 1 张，挑角色 = 1.5 张，记牌器一整天 = 5 张。当天同一样越买越贵（见 priceAt）
    // 模拟（/mnt/project-files/shop-sim/res.jsonl，高手机器猫当玩家 2500 局一格）：开局保证拿作废多赢的期望 ≈ 0（±0.02 份），交换 2 人 +0.14 份、4–9 人 ≤ +0.03 份；
    // 挑最强角色（截胡 / 影子）+0.05–0.08 份——一份最多 6,000（高手 9 人），多赢 ≤ 500，都低于这里的价，单机刷不了鱼
    const TOP = 600;
    const BASE = { counterDay: TOP * 5, counter: TOP, x2: TOP, role: nice(TOP * 1.5), nope: TOP, swap: TOP };
    const counterDayOn = () => d.counterDay === today();

    // ── 外观目录 ──
    const CAT = {
      felt: [['paper', '宣纸', 0], ['celadon', '青瓷', 10000], ['sakura', '樱粉', 10000], ['bamboo', '竹影', 20000], ['indigo', '扎染', 30000]],
      back: [['navy', '藏青', 0], ['cinnabar', '朱砂', 10000], ['jade', '墨绿', 10000], ['wisteria', '紫藤', 20000], ['gilt', '鎏金', 30000]],
      frame: [['none', '无', 0], ['fishbone', '鱼骨', 10000], ['bell', '铃铛', 20000], ['qinghua', '青花', 20000], ['ears', '猫耳', 30000]],   // 2026-11-27 用户从 10 款里留这 4 款
      fx: [['none', '无', 0], ['petals', '落樱', 30000], ['fish', '鱼群', 40000], ['sparks', '金粉', 50000]],
    };
    const CAT_NAME = { felt: '桌布', back: '牌背', frame: '头像框', fx: '出牌特效' };
    const BACK_FILL = { navy: '#2f4a6d', cinnabar: '#a63a2e', jade: '#2f5e4a', wisteria: '#6b4f8e', gilt: '#8a6a2a' };
    // 桌布（2026-11-27 用户：太素，看不出用起来多好看）：底色 + 一层纹样 + 四周一圈暗角；纹样都很淡，牌和字照样清楚
    const svgUrl = (x) => 'url("data:image/svg+xml,' + encodeURIComponent(x) + '")';
    const sakuraFlower = (x, y, r, rot, o) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')" opacity="' + o + '">' + [0, 72, 144, 216, 288].map((a) => '<ellipse cx="0" cy="' + (-r * 0.55) + '" rx="' + (r * 0.36) + '" ry="' + (r * 0.55) + '" fill="#e48fa0" transform="rotate(' + a + ')"/>').join('') + '<circle r="' + (r * 0.18) + '" fill="#d9a441"/></g>';
    const FELT = { paper: '', celadon: '#dbe7df', sakura: '#f8e5e3', bamboo: '#e2ead6', indigo: '#dde4ef' };
    const FELT_PAT = {
      celadon: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><g fill="none" stroke="#5f8a76" stroke-opacity=".22" stroke-width="1"><path d="M0 34 L22 40 L41 28 L66 37 L84 22 L110 30 L140 26"/><path d="M22 40 L26 66 L12 92 L18 120 L8 140"/><path d="M66 37 L72 61 L58 84 L70 108 L64 140"/><path d="M110 30 L106 58 L124 80 L116 104 L128 140"/><path d="M26 66 L48 72 L72 61 L96 70 L106 58"/><path d="M12 92 L36 98 L58 84"/><path d="M70 108 L92 114 L116 104"/><path d="M84 22 L80 0 M41 28 L46 0 M140 82 L124 80 M0 98 L12 92"/></g></svg>'),
      sakura: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' + sakuraFlower(28, 34, 13, 10, 0.32) + sakuraFlower(112, 58, 9, 40, 0.25) + sakuraFlower(70, 126, 11, 70, 0.28) + sakuraFlower(146, 140, 7, 20, 0.2) + '<g fill="#e48fa0" opacity=".22"><ellipse cx="62" cy="76" rx="3" ry="5" transform="rotate(30 62 76)"/><ellipse cx="132" cy="102" rx="2.6" ry="4.4" transform="rotate(-20 132 102)"/><ellipse cx="18" cy="118" rx="2.6" ry="4.2" transform="rotate(60 18 118)"/></g></svg>'),
      bamboo: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="200"><g fill="#6f8f57" fill-opacity=".14"><rect x="22" y="0" width="9" height="200" rx="3"/><rect x="118" y="0" width="7" height="200" rx="3"/></g><g stroke="#6f8f57" stroke-opacity=".22" stroke-width="2"><path d="M20 52h13M20 128h13M116 86h11M116 168h11"/></g><g fill="#6f8f57" fill-opacity=".16"><path d="M31 52c18-6 30-2 40 8-16 2-28-1-40-8z"/><path d="M31 56c14 6 22 16 24 30-12-6-20-16-24-30z"/><path d="M118 86c-18-8-32-6-44 2 16 4 30 4 44-2z"/><path d="M125 168c16-10 30-10 42-4-14 6-28 8-42 4z"/><path d="M125 172c10 8 14 18 12 30-8-8-12-18-12-30z"/></g></svg>'),
      indigo: svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><g fill="none" stroke="#2f4a6d"><path d="M48 18 L78 48 L48 78 L18 48 Z" stroke-opacity=".16" stroke-width="5"/><path d="M48 32 L64 48 L48 64 L32 48 Z" stroke-opacity=".12" stroke-width="3"/></g><circle cx="48" cy="48" r="3" fill="#2f4a6d" fill-opacity=".16"/><g fill="#2f4a6d" fill-opacity=".09"><circle cx="0" cy="0" r="9"/><circle cx="96" cy="0" r="9"/><circle cx="0" cy="96" r="9"/><circle cx="96" cy="96" r="9"/></g></svg>'),
    };
    const VIGNETTE = 'radial-gradient(120% 90% at 50% 45%, rgba(255,255,255,0) 55%, rgba(29,27,24,.07) 100%)';
    function feltStyle(id) {
      const bg = FELT[id] || '#f3eee3', pat = FELT_PAT[id];
      return 'background-color:' + bg + ';background-image:' + VIGNETTE + (pat ? ',' + pat : '') + ';background-size:100% 100%' + (pat ? ',auto' : '');
    }
    /* 头像框（2026-11-27 用户：做得粗糙，要更精致、更多款）。viewBox 64，头像圆边大约在半径 26，框画在 26–33 这一圈，猫耳 / 铃铛可以探出去 */
    const P = (deg, r) => [32 + Math.cos((deg * Math.PI) / 180) * r, 32 + Math.sin((deg * Math.PI) / 180) * r].map((v) => +v.toFixed(2));
    const around = (n, r, off, fn) => Array.from({ length: n }, (_, i) => { const a = off + (360 / n) * i, [x, y] = P(a, r); return fn(x, y, a, i); }).join('');
    const FRAME_SVG = {
      fishbone: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29.8" fill="none" stroke="#7d7466" stroke-width="2"/>' + around(26, 0, -90, (_x, _y, a, i) => { if (i < 2 || i > 24) return ''; const [x1, y1] = P(a, 27), [x2, y2] = P(a, 32.8); return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="#7d7466" stroke-width="1.4" stroke-linecap="round"/>'; }) +
        '<path d="M25 2.2c3.5-2.6 10.5-2.6 14 0l-1.3 4.6c-3.6 1.6-7.8 1.6-11.4 0z" fill="#efe8dc" stroke="#7d7466" stroke-width="1.3" stroke-linejoin="round"/><circle cx="35" cy="4" r="1.2" fill="#1d1b18"/><path d="M29 2.8v3.4" stroke="#7d7466" stroke-width=".9"/></svg>',
      bell: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29.8" fill="none" stroke="#b4392c" stroke-width="4.2"/><circle cx="32" cy="32" r="29.8" fill="none" stroke="#f0b8a8" stroke-width=".7" stroke-dasharray="2 2"/>' +
        '<g transform="translate(0 -3)"><path d="M28 60.6h8l-1 3h-6z" fill="#8a6a2a"/><circle cx="32" cy="64.5" r="5.2" fill="#e3b64a" stroke="#8a6a2a" stroke-width="1"/><path d="M27.4 63.6h9.2" stroke="#8a6a2a" stroke-width=".9"/><circle cx="32" cy="66.3" r="1.1" fill="#5a4318"/><path d="M32 66.3v2.6" stroke="#5a4318" stroke-width=".9"/><circle cx="30" cy="62.6" r="1" fill="#fff6d8" opacity=".9"/></g></svg>',
      qinghua: '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29.6" fill="none" stroke="#fbfaf5" stroke-width="5.6"/><circle cx="32" cy="32" r="32.2" fill="none" stroke="#2b4f8c" stroke-width="1.1"/><circle cx="32" cy="32" r="27" fill="none" stroke="#2b4f8c" stroke-width="1.1"/>' +
        around(12, 29.6, -90, (x, y, a) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + (a + 90) + ')"><path d="M-3.4 .8c0-2.2 1.6-3 2.8-2.2 1 .7.6 2-.4 1.8" fill="none" stroke="#2b4f8c" stroke-width="1" stroke-linecap="round"/><path d="M3.4 .8c0-2.2-1.6-3-2.8-2.2-1 .7-.6 2 .4 1.8" fill="none" stroke="#2b4f8c" stroke-width="1" stroke-linecap="round"/><circle cy="1.2" r=".7" fill="#4a72b0"/></g>') + '</svg>',
      ears: '<svg viewBox="0 0 64 64"><path d="M9.5 14.5 6 -3.5 24 4.5Z" fill="#2b2723" stroke="#2b2723" stroke-width="2" stroke-linejoin="round"/><path d="M10.8 10.8 9.4 1.2 18.6 5.4Z" fill="#f2a7b5"/><path d="M54.5 14.5 58 -3.5 40 4.5Z" fill="#2b2723" stroke="#2b2723" stroke-width="2" stroke-linejoin="round"/><path d="M53.2 10.8 54.6 1.2 45.4 5.4Z" fill="#f2a7b5"/>' +
        '<circle cx="32" cy="32" r="29.8" fill="none" stroke="#2b2723" stroke-width="3.2"/><g stroke="#2b2723" stroke-width="1" stroke-linecap="round"><path d="M-1.5 36l6-1M-1 41l5.6-.2M65.5 36l-6-1M65 41l-5.6-.2"/></g></svg>',
    };

    // ── 样式 ──
    const css = `
.zb-shop,.zb-ad{position:fixed;inset:0;z-index:2147483000;font-family:'ZM Serif','Songti SC','Noto Serif SC',serif;color:#1d1b18}
.zb-shop{background:#f3eee3;display:flex;flex-direction:column;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);transform:translateY(100%);transition:transform .32s cubic-bezier(.2,.8,.25,1)}
.zb-shop.is-on{transform:none}
.zb-top{display:flex;align-items:center;gap:8px;height:52px;padding:0 10px;border-bottom:1px solid rgba(29,27,24,.18)}
.zb-top h2{margin:0;font-size:18px;letter-spacing:.1em;flex:1;color:#1d1b18}
.zb-sub .zb-bal,.zb-shop .zb-bal{color:#1d1b18}
.zb-opt .zb-pv,.zb-it .zb-pv,.zb-cf-in .zb-pv{background-size:100% 100%,64px 64px!important}
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
.zb-chip .rf{width:26px;height:26px;border-radius:50%;overflow:hidden;display:inline-flex;background:#fffdf8;box-shadow:0 0 0 1px rgba(29,27,24,.3)}
.zb-chip .rf svg{width:100%;height:100%}
.zb-chip .rb{width:17px;display:inline-flex}
.zb-chip .rb svg{width:100%;height:auto}
.zb-pick{position:fixed;inset:0;z-index:2147483001;background:rgba(29,27,24,.55);display:flex;align-items:center;justify-content:center}
.zb-pick-in{display:grid;grid-template-columns:repeat(3,auto);gap:12px;padding:16px;background:#f3eee3;border-radius:14px;border:1px solid #1d1b18}
.zb-pick-in button{border:0;background:none;padding:0;border-radius:9px}
.zb-pick-in button[aria-pressed=true]{box-shadow:0 0 0 3px #b4392c}
.zb-ctrb{position:absolute;right:calc(100% + 9px);bottom:1px;width:24px;height:24px;padding:0;border:0;border-radius:5px;background:#b4392c;box-shadow:0 1px 0 rgba(29,27,24,.35),inset 0 0 0 1.5px rgba(251,246,236,.55);transform:rotate(-6deg);cursor:pointer;display:grid;place-items:center;pointer-events:auto;-webkit-tap-highlight-color:transparent}
.zb-ctrb svg{width:17px;height:17px;display:block}
.zb-ctrb:active{transform:rotate(-6deg) scale(.92)}
.zb-ctrb::after{content:'';position:absolute;inset:-10px}
.zb-ctrp{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(243,238,227,.5);-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px);animation:zb-fade .18s ease both}
.zb-ctrp-in{display:grid;grid-template-columns:repeat(5,auto);gap:10px 8px;padding:14px 14px 12px;background:#fffdf8;border:1.5px solid #1d1b18;border-radius:14px;box-shadow:0 10px 26px rgba(20,18,15,.2);max-width:calc(100vw - 28px);position:relative}
.zb-ctrp-in::before{content:'';position:absolute;left:-6px;top:-6px;width:22px;height:22px;border-radius:5px;background:#b4392c url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cg stroke='%23fbf6ec' stroke-width='2' stroke-linecap='round' fill='none'%3E%3Cpath d='M5 5.2h10M10 5.2v9.6M10 9.8h4M6 9.2v5.6M4.2 14.8h11.6'/%3E%3C/g%3E%3C/svg%3E") center/15px no-repeat;transform:rotate(-6deg);box-shadow:0 1px 0 rgba(29,27,24,.3)}
.zb-ctrp-in span{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;width:44px}
.zb-ctrp-in i{display:grid;place-items:center;width:38px;aspect-ratio:100/130;border-radius:7px;background:var(--bg);border:1.5px solid #fff;box-shadow:0 1px 3px rgba(29,27,24,.24)}
.zb-ctrp-in i svg{width:84%;height:auto}
.zb-ctrp-in b{position:absolute;right:-1px;top:34px;min-width:19px;height:19px;padding:0 4px;border-radius:10px;background:#1d1b18;color:#fbf6ec;font:700 12px/19px 'ZM Num','ZM Serif',serif;text-align:center;box-shadow:0 0 0 1.5px #fffdf8}
.zb-ctrp-in small{font-size:11px;line-height:1;color:#6a6358;white-space:nowrap}
.zb-ctrp-in span.z i{opacity:.35;filter:grayscale(1)}
.zb-ctrp-in span.z b{background:#d9d2c5;color:#8a8274}
.zb-ctrp-in span.z small{color:#b4ab9c}
@keyframes zb-fade{from{opacity:0}to{opacity:1}}
.zb-cnt-br .zm-seat-me .zm-count{top:auto!important;bottom:-7px!important;right:-9px!important;left:auto!important}
.zb-cnt-br .zm-seat-me .zm-turns{left:calc(100% + 14px)!important}
.zb-x2m{position:absolute;right:-14px;bottom:24px;z-index:4;font-size:9px;font-weight:700;color:#b4392c;background:#fbf6ec;border:1px solid #b4392c;border-radius:4px;padding:1px 2px;line-height:1;transform:rotate(-10deg);font-family:'ZM Num','ZM Serif',serif;opacity:.9}
.zb-cf{position:absolute;inset:0;z-index:5;background:rgba(29,27,24,0);display:flex;align-items:center;justify-content:center;transition:background .2s}
.zb-cf.is-on{background:rgba(29,27,24,.45)}
.zb-cf-in{width:min(80vw,300px);background:#f3eee3;border:1px solid #1d1b18;border-radius:14px;padding:20px 16px 16px;display:flex;flex-direction:column;align-items:center;gap:6px;transform:scale(.92);opacity:0;transition:transform .2s cubic-bezier(.2,.8,.25,1),opacity .2s}
.zb-cf.is-on .zb-cf-in{transform:none;opacity:1}
.zb-cf-in .zb-pv{width:96px;height:96px}
.zb-cf-in .zb-pv .zm-card{width:62px!important}
.zb-cf-in .zb-pv.av{width:80px;height:80px}
.zb-cf-in b{font-size:18px;margin-top:6px}
.zb-cf-in small{color:#6a6358;font-size:13px}
.zb-cf-btns{display:flex;gap:10px;margin-top:12px}
.zb-cf-btns .zb-btn{height:40px;padding:0 18px;font-size:15px}

.zb-x2s{display:inline-flex;align-items:center;justify-content:center;margin-left:6px;font-size:12px;font-weight:700;color:#fbf6ec;background:#b4392c;border-radius:50%;width:24px;height:24px;transform:rotate(-12deg);vertical-align:middle}
.zb-frame{position:absolute;inset:-6px;pointer-events:none;z-index:2}
.zb-frame svg{width:100%;height:100%;overflow:visible!important;border-radius:0!important}
.zb-pv.av>svg{overflow:visible;border-radius:0}
.zb-fxp{position:fixed;left:0;top:0;pointer-events:none;z-index:2147483500;will-change:transform,opacity}
.zb-card{border:1px solid #1d1b18;background:#fffdf8;border-radius:12px;padding:12px;margin-bottom:10px}
.zb-card .h{display:flex;align-items:center;justify-content:space-between;font-weight:700;margin-bottom:8px}
.zb-card .zb-row{margin-bottom:6px;padding:8px 10px}
.zb-tk{height:6px;border-radius:3px;background:#ebe5d8;margin-top:5px;overflow:hidden}
.zb-tk i{display:block;height:100%;background:#3f7a52}
.zb-top .zb-bal{margin-left:auto}
.zb-book{margin-left:8px;width:36px;height:36px}
.zb-book svg{width:20px;height:20px}
.zb-it{padding:16px 6px 12px;gap:7px}
.zb-pv.av{margin-top:6px}
.zb-pv.ic{background:#f3eee3;border-radius:14px}
.zb-pv.ic svg{width:40px;height:40px}
.zb-pv.ic .rb{width:30px;display:inline-flex}
.zb-pv.ic .rb svg{width:100%;height:auto}
.zb-pv.ic.big{width:96px;height:96px}
.zb-pv.ic.big svg{width:58px;height:58px}
.zb-pv.ic.big .rb{width:44px}
.zb-pv.fx{background:#ebe5d8}
.zb-pv.fx svg{width:42px;height:42px}
.zb-n{position:absolute;top:6px;right:6px;min-width:22px;height:22px;border-radius:11px;background:#1d1b18;color:#fbf6ec;font:700 12px/22px 'ZM Num',Georgia,serif;padding:0 6px}
.zb-face{display:flex;width:100%;height:100%;border-radius:50%;overflow:hidden}
.zb-face svg{width:100%;height:100%}
.zb-cats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px}
.zb-cat{border:1px solid #1d1b18;background:#fffdf8;border-radius:14px;padding:8px 8px 12px;display:flex;flex-direction:column;align-items:stretch;gap:10px;font:inherit;color:#1d1b18}
.zb-cat b{font-size:15px;letter-spacing:.06em}
.zb-cv{position:relative;height:118px;border-radius:9px;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:inset 0 0 0 1px rgba(29,27,24,.15)}
.zb-cv-card{width:46px;display:inline-flex;transform:rotate(-6deg)}
.zb-cv-card .zm-card{width:46px!important;position:static}
.zb-cv-card.f{transform:rotate(5deg)}
.zb-cv-card.b0{transform:rotate(-12deg) translateX(10px)}
.zb-cv-card.b1{transform:translateY(-4px);z-index:1}
.zb-cv-card.b2{transform:rotate(12deg) translateX(-10px)}
.zb-cv-fx{position:absolute;right:16px;top:12px;width:40px;height:40px}
.zb-pv.av.big{width:70px;height:70px}
.zb-sub{position:absolute;inset:0;background:#f3eee3;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.8,.25,1);z-index:3;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.zb-sub.is-on{transform:none}
.zb-scene-wrap{padding:12px 12px 0}
.zb-scene{position:relative;height:min(46vh,340px);border-radius:12px;border:1px solid #1d1b18;outline:1px solid rgba(29,27,24,.3);outline-offset:-5px;overflow:hidden;transition:background-color .35s}
.zb-sc-opp{position:absolute;top:8%;width:46px;height:46px;border-radius:50%;box-shadow:0 0 0 1.5px #1d1b18;background:#ebe5d8}
.zb-sc-opp.l{left:20%}.zb-sc-opp.r{right:20%}
.zb-sc-piles{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);display:flex;gap:22px}
.zb-sc-deck{position:relative;width:52px;height:73px}
.zb-sc-deck>span{position:absolute;inset:0;display:block}
.zb-sc-deck .zm-card,.zb-sc-disc .zm-card{width:52px!important;position:static}
.zb-sc-disc{width:52px;display:block;transform:rotate(7deg)}
.zb-sc-me{position:absolute;left:9%;bottom:30%}
.zb-sc-me .zb-pv.av{width:50px;height:50px;margin:0}
.zb-sc-hand{position:absolute;left:0;right:0;bottom:-14px;display:flex;justify-content:center}
.zb-sc-hand>span{width:58px;margin:0 -7px;transform-origin:50% 120%;display:block}
.zb-sc-hand .zm-card{width:58px!important;position:static}
.zb-opts{display:flex;gap:10px;overflow-x:auto;padding:14px 12px 6px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.zb-opts::-webkit-scrollbar{display:none}
.zb-opt{flex:none;width:92px;border:1px solid #1d1b18;background:#fffdf8;border-radius:12px;padding:12px 4px 9px;display:flex;flex-direction:column;align-items:center;gap:6px;font:inherit;color:#1d1b18}
.zb-opt .zb-pv{width:56px;height:56px}
.zb-opt .zb-pv .zm-card{width:38px!important}
.zb-opt .zb-pv.av{width:48px;height:48px;margin-top:4px}
.zb-opt b{font-size:14px}
.zb-opt i{font-style:normal;font-size:12px;display:inline-flex;align-items:center;gap:2px}
.zb-opt i svg{width:16px;height:10px}
.zb-opt i.ok{color:#3f7a52}
.zb-opt.is-sel{box-shadow:0 0 0 2.5px #b4392c}
.zb-act{padding:10px 16px 16px;margin-top:auto}
.zb-big{width:100%;height:52px;border-radius:26px;border:1px solid #1d1b18;background:#fffdf8;font:inherit;font-size:17px;letter-spacing:.08em;display:flex;align-items:center;justify-content:center;gap:4px;color:#1d1b18}
.zb-big svg{width:24px;height:15px}
.zb-big.is-red{background:#b4392c;border-color:#b4392c;color:#fbf6ec}
.zb-big[disabled]{opacity:.55}
.zb-q{display:flex;align-items:center;gap:16px;margin-top:8px}
.zb-q button{width:34px;height:34px;border-radius:50%;border:1px solid #1d1b18;background:#fffdf8;font:inherit;font-size:18px;line-height:1;color:#1d1b18}
.zb-q button[disabled]{opacity:.35}
.zb-q b{min-width:22px;text-align:center;font-size:20px;margin:0!important;font-family:'ZM Num',Georgia,serif}
.zb-chip i.inv{min-width:18px;height:18px;border-radius:9px;background:#3f7a52;color:#fbf6ec;justify-content:center;font-weight:700;font-size:11px;padding:0 5px}
.zb-pshop{display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 14px 0 11px;border-radius:18px;border:1.5px solid #1d1b18;background:#b4392c;color:#fffdf8;font:700 14px/1 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;box-shadow:0 2px 0 #1d1b18;cursor:pointer}
.zb-pshop svg{width:18px;height:18px}
.zb-pshop:active{transform:translateY(2px);box-shadow:none}

.zb-ckpop{position:fixed;z-index:90}
.zb-ck-fish svg{width:64px;height:40px}
.zb-ck-amt{font:700 26px/1.2 'ZM Num',Georgia,serif;color:#b4392c;margin-top:2px}
.zb-ck-btns{display:flex;gap:10px;justify-content:center;margin-top:14px}
.zb-ck-btns .zb-btn{height:40px;font-size:15px;padding:0 16px}
.zb-tline{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.zb-tline .zb-seal{margin:0}
.zb-tline .zb-bal{font-size:14px}
.zb-tline .zb-bal svg{width:22px;height:14px}
.zb-sub{display:block;margin-top:3px;font-size:11.5px;font-weight:400;color:#8a8275}
.zb-shop{display:flex;flex-direction:column}
.zb-shop .zb-scene-wrap{padding:10px 12px 0;flex:1;min-height:0;display:flex}
.zb-scene-if{position:absolute;left:0;top:0;border:0;transform-origin:0 0;pointer-events:none;opacity:0;transition:opacity .45s;background:transparent}
.zb-scene.is-live .zb-scene-if{opacity:1}
/* 嵌在商店里的那局（?zmshow=1）：没有按钮、顶栏，只看牌局 */
.zm-app.is-show .zm-band,.zm-app.is-show .zm-topbar,.zm-app.is-show .zm-cover{visibility:hidden!important}
/* 11-27 用户：预览里没有摸牌 / 出牌键，头像和手牌之间空太宽 → 那一行（我的头像 + 按钮带）收窄；行数不变，只改高度 */
.zm-app.is-show .zm-table{grid-template-rows:46px auto minmax(0,1fr) 34px auto!important}
.zb-shop .zb-scene{--zm-ink:#1d1b18;--zm-card:#fffdf8;--u:60px;flex:1;height:auto;min-height:300px;max-height:560px;position:relative;border-radius:14px;border:1px solid #1d1b18;outline:none;overflow:hidden;transition:background-color .35s;background-color:#f3eee3}
.zb-shop .zb-tabs{padding:12px 12px 0}
.zb-shop .zb-tabs button{position:relative;font-size:14px;height:34px;color:#1d1b18}
.zb-shop .zb-tabs button[aria-pressed=true]{color:#fbf6ec}
.zb-tabs .dot{position:absolute;top:4px;right:9px;width:6px;height:6px;border-radius:50%;background:#b4392c}
.zb-shop .zb-opts{padding:12px 12px 4px}
.zb-opt{position:relative;justify-content:flex-start}
.zb-opt.is-own b{margin-bottom:2px}
.zb-on{position:absolute;z-index:3;top:6px;right:6px;width:18px;height:18px;border-radius:50%;background:#b4392c;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fffdf8}
.zb-on svg{width:13px;height:13px}
.zb-big.is-idle{visibility:hidden}
.zb-it2 small{font-size:10.5px!important;letter-spacing:-.02em}
.zb-shop .zb-act{padding:8px 16px calc(12px + env(safe-area-inset-bottom));margin-top:0}
.zb-cf-list{width:100%;display:flex;flex-direction:column;gap:8px}
.zb-cf-row{display:flex;align-items:center;gap:10px}
.zb-cf-row .zb-pv{width:44px;height:44px;flex:none}
.zb-cf-row .zb-pv .zm-card{width:30px!important}
.zb-cf-row .zb-pv.av{width:38px;height:38px;margin:0 3px}
.zb-cf-row .zb-pv.fx svg{width:30px;height:30px}
.zb-cf-row span{flex:1;display:flex;flex-direction:column}
.zb-cf-row span b{font-size:15px;margin:0}
.zb-cf-row span small{font-size:12px}
.zb-cf-row>i{font-style:normal;font-size:13px;display:inline-flex;align-items:center;gap:2px}
.zb-cf-row>i svg{width:16px;height:10px}
.zb-items.zr-box{display:block;margin-top:10px;padding:9px 10px 13px}
.zb-ih{display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px;font-size:13px;line-height:18px}
.zb-ih b{font-weight:700;color:#1d1b18;letter-spacing:.04em}
.zb-ih em{font-style:normal;color:#8a8274;display:inline-flex;align-items:center;gap:2px}
.zb-ih em.on{color:#b4392c;font-family:'ZM Num','ZM Serif',serif}
.zb-ih em svg{width:15px;height:9px}
.zb-dress{padding:9px 10px 11px!important}
.zb-dr-h{font-size:14px;margin:0 2px 8px}
.zb-dr-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.zb-dr-c,.zb-dr-o{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:none;padding:4px 0 2px;border-radius:10px;font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.zb-dr-c small,.zb-dr-o small{font-size:11.5px;color:#6a6358;white-space:nowrap}
.zb-dr-c[aria-pressed=true]{background:rgba(29,27,24,.06)}
.zb-dr-c[aria-pressed=true] small{color:#1d1b18;font-weight:700}
.zb-dr-pv{width:52px;height:52px;display:grid;place-items:center}
.zb-dr-pv>.zb-pv{transform:scale(.72);flex:none}
.zb-dr-pv>.zb-pv.av{transform:scale(.62);margin:0}
.zb-dr-pv>i{font-style:normal;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:1.5px dashed rgba(29,27,24,.3)}
.zb-dr-pv>i svg{width:24px;height:15px}
.zb-dr-opts{display:flex;gap:4px;overflow-x:auto;margin-top:8px;padding:8px 2px 2px;border-top:1px solid rgba(29,27,24,.12);scrollbar-width:none}
.zb-dr-opts::-webkit-scrollbar{display:none}
.zb-dr-o{flex:none;width:64px}
.zb-dr-o .zb-on{top:0;right:4px;transform:scale(.8)}
.zb-dr-shop small{color:#b4392c}
.zb-items.is-lock{opacity:.55;pointer-events:none}
.zb-items .zr-chips{justify-content:space-around}
.zb-it2{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;flex:1;max-width:72px;border:0;background:none;padding:0;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;cursor:pointer}
.zb-it2 .zr-mc{transition:box-shadow .2s,transform .2s}
.zb-it2 .zr-mc>svg{width:78%}
.zb-it2 .zr-mc .rb,.zb-it2 .zr-mc .rf{display:flex;width:100%;height:100%}
.zb-it2 .zr-mc .rb svg,.zb-it2 .zr-mc .rf svg{width:100%;height:100%}
.zb-it2 small{font-size:11.5px;color:#6a6358;white-space:nowrap}
.zb-it2 .pr{align-self:stretch;border-top:1px solid rgba(29,27,24,.13);padding-top:4px;display:inline-flex;align-items:center;justify-content:center;gap:1px;font-size:11.5px;color:#6a6358;white-space:nowrap;font-family:'ZM Num','ZM Serif',serif}
.zb-it2 .pr svg{width:15px;height:9px}
.zb-it2[aria-pressed=true] .zr-mc{box-shadow:0 0 0 2px #b4392c,0 2px 5px rgba(29,27,24,.25);transform:translateY(-2px)}
.zb-it2[aria-pressed=true] small{color:#1d1b18;font-weight:700}
.zb-it2[aria-pressed=true] .pr{color:#b4392c;border-top-color:rgba(180,57,44,.35)}
` + Object.keys(BACK_FILL).filter((k) => k !== 'navy').map((k) => `.zb-back-${k} .zm-card.is-back svg>rect:first-child{fill:${BACK_FILL[k]}}`).join('\n') + '\n' +
      `.zb-back-gilt .zm-card.is-back svg>rect:nth-child(2){stroke:#f3d58a}\n` +
      Object.keys(FELT).filter((k) => FELT[k]).map((k) => `.zb-felt-${k}.zm-app{${feltStyle(k)}}`).join('\n');
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
    /* 2026-11-27 用户第三轮：
     *   道具可以囤：商店里买多少都行，同一样东西当天越买越贵（第 k 件 = 原价 ×(1 + 0.2(k−1))，最多 3 倍，取整百）；开局单里先用存货，没存货也能当场买（同一个价、同样算进当天的件数）。
     *   价格不再跟着本场门票走（能囤就不能按场定价），一律按顶格门票：记牌器一局 / 加倍 / 作废 / 交换 600，挑角色 900（1.5 张），记牌器一整天 3,000（一天一次，不涨）。
     *   账本挪到右上角小本子里，主页面不放；开局道具不写说明。
     *   外观：第一层四张大卡（选购桌布 / 牌背 / 头像框 / 出牌特效），点进去是一张真的小牌桌，点不同的款当场换上去看（头像框套的是你自己的头像，出牌特效会在弃牌堆上放）。
     *   买完停在原地（不重画整页、不跳回顶上）；按钮叫「购买」 */
    const BACK_SVG = '<svg viewBox="0 0 40 40"><path d="M24.5 6.5 13 20l11.5 13.5" fill="none" stroke="#b4392c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const BOOK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#1d1b18" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11.5"/><path d="M9 8.5h6M9 11.5h4"/></svg>';
    const X2_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="#fbf6ec" stroke="#b4392c" stroke-width="1.8" transform="rotate(-8 12 12)"/><text x="12" y="16.2" text-anchor="middle" font-size="10" font-weight="700" fill="#b4392c" font-family="Georgia,serif" transform="rotate(-8 12 12)">×2</text></svg>';
    let shop = null, tab = 'look', sub = null;
    let balEls = [];
    function paintBal() { balEls = balEls.filter((e) => e.isConnected); balEls.forEach((e) => { if (!e.__zbHold) e.textContent = fmt(bal()); }); }
    const balHtml = () => '<span class="zb-bal">' + FISH() + '<b data-zbbal>' + fmt(bal()) + '</b></span><span class="zb-seal">内测</span>';
    function grabBal(el) { el.querySelectorAll('[data-zbbal]').forEach((e) => balEls.push(e)); }

    // 道具（2026-11-27 用户第四轮：商店不卖道具、不囤，只在单机开局当场买，一局一件，不涨价）
    const ITEM_NAME = { counter: '记牌器', x2: '加倍', role: '挑角色', nope: '必有作废', swap: '必有交换' };
    // 记牌器：一局 600，当天花满 3,000（= 原来「一整天」的价）后当天剩下的局都免费
    function ctrSpent() { if (!d.ctr || d.ctr.d !== today()) d.ctr = { d: today(), n: 0 }; return d.ctr.n; }
    const priceAt = (k) => (k === 'counter' ? (counterDayOn() ? 0 : Math.min(BASE.counter, BASE.counterDay - ctrSpent())) : BASE[k]);
    function takeBuy(k, why) {
      const p = priceAt(k);
      if (p > 0) book(-p, why || ITEM_NAME[k]);
      if (k === 'counter') { ctrSpent(); d.ctr.n += p; if (d.ctr.n >= BASE.counterDay) d.counterDay = today(); save(); }
      return p;
    }
    if (d.inv || d.bd) {   // 第三轮囤的道具按原价退回（第四轮商店不卖道具了）
      let t = 0; Object.keys(d.inv || {}).forEach((k) => { t += (d.inv[k] | 0) * (BASE[k] || 0); });
      delete d.inv; delete d.bd;
      if (t > 0) book(t, '道具存货退回'); else save();
    }

    function previewHtml(cat, id) {
      if (cat === 'felt') return '<span class="zb-pv" style="' + feltStyle(id) + ';box-shadow:inset 0 0 0 1px rgba(29,27,24,.22)"></span>';
      if (cat === 'back') return '<span class="zb-pv">' + backOf(id) + '</span>';
      if (cat === 'frame') return '<span class="zb-pv av">' + myFace() + (FRAME_SVG[id] || '') + '</span>';
      return '<span class="zb-pv fx">' + FX_IC[id] + '</span>';
    }
    const FX_IC = {
      none: '<svg viewBox="0 0 40 40"><path d="M12 28 28 12" stroke="#aaa294" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="11" fill="none" stroke="#aaa294" stroke-width="2"/></svg>',
      petals: '<svg viewBox="0 0 40 40">' + [0, 72, 144, 216, 288].map((a) => '<ellipse cx="20" cy="12" rx="5" ry="8" fill="#f2a7b5" transform="rotate(' + a + ' 20 20)"/>').join('') + '<circle cx="20" cy="20" r="3" fill="#e3b64a"/></svg>',
      fish: '<svg viewBox="0 0 40 40"><g transform="translate(5 10) scale(.9)">' + '<path d="M3 10c4-6 11-8 17-6 3 1 5 3 6 6-1 3-3 5-6 6-6 2-13 0-17-6Z" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.6"/><path d="M25 10l5-5v10Z" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.6"/><circle cx="7" cy="9" r="1.2" fill="#1d1b18"/></g><circle cx="33" cy="9" r="2" fill="#9cc6e0"/><circle cx="36" cy="15" r="1.3" fill="#9cc6e0"/></svg>',
      sparks: '<svg viewBox="0 0 40 40"><path d="M20 4l3 11 11 3-11 3-3 11-3-11-11-3 11-3z" fill="#e3b64a"/><path d="M32 26l1.2 4 4 1.2-4 1.2L32 36l-1.2-3.6-4-1.2 4-1.2z" fill="#e3b64a" opacity=".8"/></svg>',
    };
    function backOf(id) {   // 牌背预览：直接把底色写进这张的 svg，不靠外层 class
      let h = TB() ? TB().backHtml() : '';
      h = h.replace(/(<rect[^>]*?fill=")[^"]*/, '$1' + (BACK_FILL[id] || BACK_FILL.navy));
      if (id === 'gilt') { let i = 0; h = h.replace(/<rect[^>]*>/g, (r) => (++i === 2 ? r.replace(/stroke="[^"]*"/, 'stroke="#f3d58a"') : r)); }
      return h;
    }
    const AVS = () => root.GongzhuAvatars || null;
    function myFace() {
      const p = TB() && TB().profile ? TB().profile() : null, a = AVS();
      const svg = p && p.avatar && a && a.byId[p.avatar] ? a.byId[p.avatar].svg : (a ? a.svg('cat') : '');
      return '<span class="zb-face">' + svg + '</span>';
    }

    /* 商店（2026-11-27 用户第四轮）：一进来就是一局自动在打的牌桌（机器猫出牌、摸牌，我出牌放特效），
     * 下面四个页签（桌布 / 牌背 / 头像框 / 出牌特效）挑款，几样组合起来一起看、一起买；不再有第一层菜单，不卖道具 */
    const CATS_ORDER = ['felt', 'back', 'frame', 'fx'];
    let sel = null, scene = null;
    const owns = (cat, id) => d.own[cat].includes(id);
    const priceOf = (cat, id) => (CAT[cat].find((x) => x[0] === id) || [0, 0, 0])[2];
    const nameOf = (cat, id) => (CAT[cat].find((x) => x[0] === id) || [0, ''])[1];
    const toBuy = () => CATS_ORDER.filter((c) => !owns(c, sel[c]));
    /* 款式格（2026-11-27 用户：「使用中」「已拥有」几个字笨拙，没买的也别灰得像售罄）：
     *   没买：底下写价钱；已拥有：不写字；正用着：右上角一枚小红印（勾）；选中看的这款：红框 */
    const USE_MARK = '<span class="zb-on" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M4 8.4l2.6 2.6L12 5.4" fill="none" stroke="#fffdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    function optsHtml() {
      return CAT[tab].map(([id, name, p]) => {
        const own = owns(tab, id), use = d.use[tab] === id;
        return '<button type="button" class="zb-opt' + (id === sel[tab] ? ' is-sel' : '') + (own ? ' is-own' : '') + '" data-o="' + id + '" aria-label="' + name + (use ? '（正在用）' : own ? '' : '（' + fmt(p) + '）') + '">' + (use ? USE_MARK : '') + previewHtml(tab, id) + '<b>' + name + '</b>' + (own ? '' : '<i>' + FISH() + fmt(p) + '</i>') + '</button>';
      }).join('');
    }
    function actHtml() {
      const nb = toBuy();
      if (nb.length) { const t = nb.reduce((s, c) => s + priceOf(c, sel[c]), 0); return '<button type="button" class="zb-big is-red" data-act="buy"' + (bal() < t ? ' disabled' : '') + '>购买' + (nb.length > 1 ? ' ' + nb.length + ' 件' : '') + ' ' + FISH() + fmt(t) + '</button>'; }
      return '<button type="button" class="zb-big is-idle" disabled aria-hidden="true"></button>';   // 已经是这一身：按钮收起（留着位置不跳）
    }
    function shopHtml() {
      return '<div class="zb-top"><button type="button" class="zb-x" data-zb="close" aria-label="返回">' + BACK_SVG + '</button><h2>商店</h2>' + balHtml() +
        '<button type="button" class="zb-x zb-book" data-zb="ledger" aria-label="账本">' + BOOK_SVG + '</button></div>' +
        '<div class="zb-scene-wrap"><div class="zb-scene"></div></div>' +
        '<div class="zb-tabs">' + CATS_ORDER.map((c) => '<button type="button" data-zbtab="' + c + '" aria-pressed="' + (tab === c) + '">' + CAT_NAME[c] + (!owns(c, sel[c]) ? '<i class="dot"></i>' : '') + '</button>').join('') + '</div>' +
        '<div class="zb-opts">' + optsHtml() + '</div><div class="zb-act">' + actHtml() + '</div>';
    }
    function paintShop(keepScroll) {   // 只换页签 / 款式 / 按钮，牌桌那局接着打
      if (!shop) return;
      shop.querySelectorAll('[data-zbtab]').forEach((b) => { const c = b.dataset.zbtab; b.setAttribute('aria-pressed', String(tab === c)); b.innerHTML = CAT_NAME[c] + (!owns(c, sel[c]) ? '<i class="dot"></i>' : ''); });
      const ol = shop.querySelector('.zb-opts'), x = ol.scrollLeft; ol.innerHTML = optsHtml(); ol.scrollLeft = keepScroll ? x : 0;
      shop.querySelector('.zb-act').innerHTML = actHtml();
      if (scene) scene.look(sel);
    }
    function openShop() {
      sel = Object.assign({}, d.use); tab = 'felt';
      if (!shop) {
        shop = document.createElement('section');
        shop.className = 'zb-shop'; shop.setAttribute('role', 'dialog'); shop.setAttribute('aria-label', '商店');
        document.body.appendChild(shop);
        shop.addEventListener('click', onShop);
      }
      shop.innerHTML = shopHtml(); grabBal(shop);
      shop.hidden = false;
      if (scene) scene.stop();
      scene = liveScene(shop.querySelector('.zb-scene'), sel);
      requestAnimationFrame(() => requestAnimationFrame(() => shop.classList.add('is-on')));
    }
    /* 确认卡：要买的几样一行一行列出来 + 合计。「购买」→ 余额滚下去、鱼游到牌桌上 */
    let buying = false;
    function confirmBuy(o, tile, done) {
      if (buying) return;
      const m = document.createElement('div');
      m.className = 'zb-cf';
      m.innerHTML = '<div class="zb-cf-in" role="dialog" aria-label="确认购买">' + o.body +
        '<div class="zb-cf-btns"><button type="button" class="zb-btn" data-cf="no">取消</button><button type="button" class="zb-btn is-red" data-cf="yes"' + (bal() < o.price ? ' disabled' : '') + '>购买 ' + FISH() + fmt(o.price) + '</button></div></div>';
      (sub || shop).appendChild(m);
      requestAnimationFrame(() => m.classList.add('is-on'));
      const close = () => { m.classList.remove('is-on'); setTimeout(() => m.remove(), 200); };
      m.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.target.closest('[data-cf]');
        if (!b) { if (e.target === m) close(); return; }
        if (b.dataset.cf === 'no') { close(); return; }
        if (buying || b.disabled) return;
        buying = true;
        const host = sub || shop, num = host.querySelector('.zb-top [data-zbbal]'), from = bal(), fx = root.ZhamaoWalletFx;
        close();
        if (num) num.__zbHold = true;
        done();
        const to = bal();
        if (num) num.textContent = fmt(from);
        const end = () => { buying = false; if (num) num.__zbHold = false; paintBal(); if (o.after) o.after(); };
        if (fx && num) {
          fx.roll(num, from, to, 520);
          fx.school(FISH(), num, tile, 4, { spread: 12, gap: 90, dur: 620, lift: -30, size: 24 }).then(end, end);
        } else end();
      });
    }
    function closeShop() { if (!shop) return; closeSub(true); shop.classList.remove('is-on'); if (scene) { scene.stop(); scene = null; } setTimeout(() => { shop.hidden = true; }, 320); }
    function onShop(e) {
      if (sub && sub.contains(e.target)) return;
      const t = e.target.closest('[data-zbtab]');
      if (t) { tab = t.dataset.zbtab; paintShop(false); return; }
      const a = e.target.closest('[data-zb]');
      if (a) { if (a.dataset.zb === 'close') closeShop(); if (a.dataset.zb === 'ledger') openLedger(); return; }
      const o = e.target.closest('[data-o]');
      if (o) {
        sel[tab] = o.dataset.o;
        /* 11-27 用户：对局中退到商店换了装扮，回牌桌还是原样 → 点一款已经有的 = 当场换上（不用再按「使用」）；没买的只在上面那局里预览 */
        if (owns(tab, sel[tab]) && d.use[tab] !== sel[tab]) { d.use[tab] = sel[tab]; save(); applyLook(); }
        paintShop(true); if (tab === 'fx' && scene) scene.poke(); return;
      }
      const act = e.target.closest('[data-act]');
      if (!act || act.disabled) return;
      if (act.dataset.act === 'use') { Object.assign(d.use, sel); save(); applyLook(); paintShop(true); return; }
      const nb = toBuy(), total = nb.reduce((s, c) => s + priceOf(c, sel[c]), 0);
      const body = '<div class="zb-cf-list">' + nb.map((c) => '<div class="zb-cf-row">' + previewHtml(c, sel[c]) + '<span><b>' + nameOf(c, sel[c]) + '</b><small>' + CAT_NAME[c] + '</small></span><i>' + FISH() + fmt(priceOf(c, sel[c])) + '</i></div>').join('') + '</div>';
      const pick = Object.assign({}, sel);
      confirmBuy({ body, price: total, after: () => paintShop(true) }, shop.querySelector('.zb-scene'), () => {
        nb.forEach((c) => { book(-priceOf(c, pick[c]), CAT_NAME[c] + '「' + nameOf(c, pick[c]) + '」'); if (!owns(c, pick[c])) d.own[c].push(pick[c]); });
        Object.assign(d.use, pick); save(); applyLook();
      });
    }

    /* ── 商店顶上那局（11-27 第六轮，用户：以前是摆出来的假局，和真对局有明显失真 → 换成真对局）──
     * 把游戏页本身用 ?zmshow=1 嵌进来：3 人普通经典局，我也交给机器猫，打完接着开下一局（zhamao.js 里 SHOW 那几处）。
     * 小窗按 390 宽的手机来排版、整体缩小塞进框里，底边对齐（手牌一定露全，顶栏被裁掉）；不接点按。
     * 换款：postMessage 把这一身发进去，小窗里的内测脚本当场换上；挑出牌特效时在弃牌堆上先放一下 */
    function liveScene(el, look0) {
      let look = Object.assign({}, look0), ready = false;
      const f = document.createElement('iframe');
      f.className = 'zb-scene-if'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.title = '对局预览';
      f.src = location.pathname.replace(/[^/]*$/, '') + '?zmshow=1';
      el.innerHTML = ''; el.appendChild(f);
      const send = (m) => { try { f.contentWindow.postMessage(Object.assign({ zbShow: 1 }, m), location.origin); } catch (_) { /* */ } };
      const fit = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        const IW = 390, k = w / IW, IH = Math.max(Math.round(h / k) + 52, IW);   // 多出顶栏那 52 从上面裁掉；至少是方的：一定按竖屏排（横屏那套布局在矮窗里会切过去）
        f.style.width = IW + 'px'; f.style.height = IH + 'px';
        f.style.transform = 'translateY(' + Math.round(h - IH * k) + 'px) scale(' + k + ')';
      };
      fit();
      const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
      if (ro) ro.observe(el);
      const onMsg = (e) => { if (e.source === f.contentWindow && e.data && e.data.zbShowReady) { ready = true; send({ look }); el.classList.add('is-live'); } };
      window.addEventListener('message', onMsg);
      return {
        look(L) { look = Object.assign({}, L); if (ready) send({ look }); },
        poke() { if (ready) send({ look, poke: 1 }); },
        stop() { window.removeEventListener('message', onMsg); if (ro) ro.disconnect(); f.src = 'about:blank'; f.remove(); },
      };
    }

    // ── 二级页（账本）：从右边滑进来，盖在商店上面 ──
    function openSub(html, onClick) {
      closeSub(true);
      sub = document.createElement('section');
      sub.className = 'zb-sub';
      sub.innerHTML = html;
      shop.appendChild(sub);
      grabBal(sub);
      sub.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('[data-zb="back"]')) { closeSub(); return; } onClick(e); });
      requestAnimationFrame(() => requestAnimationFrame(() => sub && sub.classList.add('is-on')));
    }
    function closeSub(now) {
      if (!sub) return;
      const s0 = sub; sub = null;
      if (now) { s0.remove(); return; }
      s0.classList.remove('is-on'); setTimeout(() => s0.remove(), 300);
      paintShop(true);
    }
    const subTop = (title) => '<div class="zb-top"><button type="button" class="zb-x" data-zb="back" aria-label="返回">' + BACK_SVG + '</button><h2>' + title + '</h2>' + balHtml() + '</div>';
    function openLedger() {
      const rows = d.log.length ? d.log.slice(0, 40).map((x) => '<div class="zb-row" style="padding:7px 12px"><span class="t">' + x.why + '<small>' + new Date(x.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</small></span><b style="color:' + (x.amt < 0 ? '#b4392c' : '#3f7a52') + '">' + (x.amt < 0 ? '−' : '+') + fmt(x.amt) + '</b></div>').join('') : '<div class="zb-row"><span class="t" style="color:#6a6358">还没有</span></div>';
      openSub(subTop('账本') + '<div class="zb-body">' + rows + '<div class="zb-row" style="margin-top:14px"><span class="t">清空内测账本<small>内测花的、领的全部归零，外观也收回</small></span><button type="button" class="zb-btn" data-zb="reset">清空</button></div></div>', (e) => {
        if (e.target.closest('[data-zb="reset"]')) { const keep = d.pick, tops = d.tops; d = D0(); d.pick = keep; d.tops = tops; save(); applyLook(); sel = Object.assign({}, d.use); openLedger(); }
      });
    }
    // 主页底部加一个「商店」；猫咪档案余额旁边也放一个（2026-11-27 用户：入口太隐晦）
    function mountCover() {
      const foot = document.querySelector('.zm-cover-foot');
      if (!foot || foot.querySelector('[data-zbshop]')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'zm-cover-link'; b.dataset.zbshop = '1'; b.textContent = '商店';
      b.addEventListener('click', (e) => { e.stopPropagation(); openShop(); });
      foot.insertBefore(b, foot.firstChild);
    }
    const BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M5 8.5h14l-1.2 11a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/></svg>';
    function mountProfileShop() {   // 2026-11-27 用户：放猫咪档案右上角（档案顶栏留了 .zmp-topr 空位），不放第一格里
      const host = document.querySelector('.zmp .zmp-topr');
      if (!host || host.querySelector('[data-zbpshop]')) return;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'zb-pshop'; btn.dataset.zbpshop = '1'; btn.innerHTML = BAG + '<span>商店</span>';
      btn.addEventListener('click', (e) => { e.stopPropagation(); openShop(); });
      host.appendChild(btn);
    }

    // ── 外观落到牌桌上 ──
    function applyLook() {
      const app = $('zmApp');
      if (!app) return;
      app.classList.add('zb-cnt-br');   // 2026-11-27：头像框的头饰（猫耳等）占头像正上方，我自己的手牌数挪到右下角
      [...app.classList].filter((c) => /^zb-(felt|back)-/.test(c)).forEach((c) => app.classList.remove(c));
      if (d.use.felt !== 'paper') app.classList.add('zb-felt-' + d.use.felt);
      if (d.use.back !== 'navy') app.classList.add('zb-back-' + d.use.back);   // 只挂在牌桌根上：商店预览不在它里面，不会被染成同一种颜色（2026-11-27 用户截图：牌背几格全变紫）
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
    /* 2026-11-27 用户第四轮：和上面规则那格同一个样子——一格一张小牌（图标）、底下名字、一条浅浅的分割线、再底下价钱；
     * 点亮 = 这局开局当场买（钱在开局时才扣）。不再有存货角标 */
    let soloCtx = null;
    const ROLE_IDS = () => (R() && R().ROLES ? R().ROLES.map((r) => r.id) : []);
    const ITEM_BG = { counter: '#f3e6cf', x2: '#f6e0da', role: '#efe3d0', nope: '#e9e2f0', swap: '#dcebea' };
    function chipsFor(ctx) {
      const team = ctx.mode === 'team';
      const icon = (k) => (ART() && ART().icon ? ART().icon(k) : '');
      const chips = [['counter', CTR_IC]];
      if (!team) chips.push(['x2', X2_IC]);
      if (ctx.online) return chips;   // 联机只开记牌器、加倍
      if (ctx.mode === 'roles') chips.push(['role', ART() ? (d.pick.role ? '<span class="rf">' + ART().roleFace(d.pick.role) + '</span>' : '<span class="rb">' + ART().ROLE_BACK + '</span>') : '']);   // 没挑：一张小角色牌背；挑了：那只猫的脸
      if (!team) chips.push(['nope', icon('nope')]);
      if (!team && ctx.rules && ctx.rules.swap) chips.push(['swap', icon('swap')]);
      return chips;
    }
    /* 11-27 第六轮（用户：玩家不知道这些能点起来带进这局；内容偏上、下面空得多）：
     * 顶上一行和规则格（左「游戏规则」右「设置规则 ›」）同一个样子——左边「开局道具」，右边「点选使用」；挑了以后换成「合计 🐟N」（11-27 用户：右上角要简洁、正式） */
    function boxHtml(chips, pk, attr) {
      let cost = 0;
      chips.forEach(([k]) => { if (!(k === 'counter' && counterDayOn()) && (k === 'role' ? !!pk.role : !!pk[k])) cost += priceAt(k); });
      return '<span class="zb-ih"><b>开局道具</b>' + (cost ? '<em class="on">合计 ' + FISH() + fmt(cost) + '</em>' : '<em>点选使用</em>') + '</span>' +
        '<span class="zr-chips">' + chips.map(([k, ic]) => {
        const free = k === 'counter' && counterDayOn(), on = free || (k === 'role' ? !!pk.role : !!pk[k]), p = priceAt(k);
        return '<button type="button" class="zb-it2" ' + attr + '="' + k + '" aria-pressed="' + on + '"' + (free ? ' data-free="1"' : '') + '><i class="zr-mc" style="--bg:' + ITEM_BG[k] + '" aria-hidden="true">' + ic + '</i><small>' + ITEM_NAME[k] + '</small>' +
          '<span class="pr">' + (free ? '今日畅用' : FISH() + fmt(p)) + '</span></button>';
      }).join('') + '</span>';
    }
    function solo(ctx) {
      soloCtx = ctx;
      const pick = document.querySelector('.zm-solo-pick');
      if (!pick) return;
      let row = pick.querySelector('.zb-items');
      if (!row) { row = document.createElement('div'); row.className = 'zb-items zr-box is-ro'; pick.appendChild(row); row.addEventListener('click', onChip); }
      const html = boxHtml(chipsFor(ctx), d.pick, 'data-zbp');
      if (row.__h !== html) { row.innerHTML = html; row.__h = html; }
    }
    function onChip(e) {
      const b = e.target.closest('[data-zbp]');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.free) return;
      const k = b.dataset.zbp;
      if (k === 'role') { if (d.pick.role) { d.pick.role = null; save(); repaintPicks(); } else rolePicker(); return; }
      d.pick[k] = !d.pick[k]; save(); repaintPicks();
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
        m.remove(); repaintPicks();
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
      if (root.ZM_SHOW) return;
      if (!game || game.tutorial || game.online) return;
      const s = game.state, o = { tier: ctx.tier, mode: ctx.mode, n: s.n, rules: s.rules };
      const zb = {};
      // 当场买：钱在这时才扣（2026-11-27 第四轮：不再有存货）
      const buy = (k) => { if (bal() < priceAt(k)) return false; takeBuy(k, ITEM_NAME[k]); return true; };
      const can = (k) => bal() >= priceAt(k);
      if (counterDayOn()) zb.counter = true;
      else if (d.pick.counter && buy('counter')) zb.counter = true;
      if (o.mode !== 'team') {
        if (d.pick.x2 && buy('x2')) zb.x2 = true;
        if (o.mode === 'roles' && d.pick.role && s.roles && buy('role')) { s.roles[0] = d.pick.role; zb.role = d.pick.role; }
        if (d.pick.nope && can('nope') && guarantee(s, R().NOPE)) { buy('nope'); zb.nope = true; }
        if (d.pick.swap && s.rules.swap && can('swap') && guarantee(s, R().SWAP, zb.nope ? [R().NOPE] : [])) { buy('swap'); zb.swap = true; }
        if ((zb.nope || zb.swap) && R().sortHand) s.hands[0] = R().sortHand(s.hands[0]);
      }
      if (zb.role || zb.nope || zb.swap) game.hl = null;   // 改过发牌：这局的录像按种子重放会对不上，不收
      if (Object.keys(zb).length) { s.zb = zb; game.zb = zb; }
      d.pick = { counter: false, x2: false, role: null, nope: false, swap: false };   // 开局道具一局一买，开局后清掉
      dayRec().games++; save();
    }

    // ── 牌桌上：记牌器、×2 印、头像框、出牌特效、结算翻倍 ──
    const CTR_KINDS = ['defuse', 'nope', 'attack', 'tattack', 'skip', 'reverse', 'bottom', 'favor', 'swap', 'shuffle', 'future', 'alter', 'flux', 'cat'];
    let ctrEl = null, ctrInit = null, ctrGame = null;
    function kindOf(id) { const r = R(), k = r.KIND_OF[id]; return r.CATS.includes(k) || k === r.WILD ? 'cat' : k; }
    /* 记牌器（11-27 第六轮，用户：手牌上面那条纸条难看、发牌时上下乱跳）→ 牌堆左边一枚「正」字小红章，位置跟着牌堆、不随手牌动；
     * 点开一张面板：每种牌一张小牌，角上是还在牌堆 + 别人手里的张数，打光的那种变灰。点面板任意处关。只有买的人看得到 */
    const CTR_SEAL = '<svg viewBox="0 0 20 20" aria-hidden="true"><g stroke="#fbf6ec" stroke-width="2" stroke-linecap="round" fill="none"><path d="M5 5.2h10M10 5.2v9.6M10 9.8h4M6 9.2v5.6M4.2 14.8h11.6"/></g></svg>';
    let ctrPanel = null, ctrNow = {};
    function ctrHtml() {
      const r = R(), tone = ART() && ART().TONE;
      return CTR_KINDS.filter((k) => ctrInit[k]).map((k) => {
        const ic = k === 'cat' ? 'wild' : k, n = ctrNow[k] || 0;
        return '<span class="' + (n ? '' : 'z') + '"><i style="--bg:' + ((tone && tone[ic] && tone[ic].bg) || '#f3eee3') + '">' + (ART().icon(ic) || '') + '</i><b>' + n + '</b><small>' + (k === 'cat' ? '猫牌' : (r.NAMES[k] || '')) + '</small></span>';
      }).join('');
    }
    /* 11-27 用户：面板开、关要有动画 → 从「正」字章那里长出来（缩放 + 淡入），关的时候缩回章里 */
    function ctrOrigin(inEl) {
      const st = ctrEl && ctrEl.isConnected ? ctrEl.getBoundingClientRect() : null, r = inEl.getBoundingClientRect();
      return st && r.width ? (st.left + st.width / 2 - r.left) + 'px ' + (st.top + st.height / 2 - r.top) + 'px' : '50% 50%';
    }
    function closeCtr(now) {
      if (!ctrPanel) return;
      const p = ctrPanel; ctrPanel = null;
      const inEl = p.firstChild;
      if (now === true || !inEl || !p.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { p.remove(); return; }
      inEl.style.transformOrigin = ctrOrigin(inEl);
      inEl.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.12)', opacity: 0 }], { duration: 200, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards' });
      p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished.then(() => p.remove(), () => p.remove());
    }
    function openCtr() {
      closeCtr(true);
      ctrPanel = document.createElement('div'); ctrPanel.className = 'zb-ctrp';
      ctrPanel.innerHTML = '<div class="zb-ctrp-in">' + ctrHtml() + '</div>';
      ctrPanel.addEventListener('click', (e) => { e.stopPropagation(); closeCtr(); });
      ($('zmApp') || document.body).appendChild(ctrPanel);
      const inEl = ctrPanel.firstChild;
      if (inEl.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        inEl.style.transformOrigin = ctrOrigin(inEl);
        inEl.animate([{ transform: 'scale(.12)', opacity: 0 }, { transform: 'scale(1.03)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
        inEl.querySelectorAll('span').forEach((c, i) => c.animate([{ transform: 'translateY(6px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, delay: 90 + i * 18, easing: 'ease-out', fill: 'backwards' }));
      }
    }
    function paintCounter(g) {
      const s = g.state;
      const zb = zbOf(g);
      if (!zb || !zb.counter || g.spectator || s.phase === 'over') { if (ctrEl) { ctrEl.remove(); ctrEl = null; } closeCtr(); return; }
      const c = {}, add = (id) => { const k = kindOf(id); c[k] = (c[k] || 0) + 1; };
      s.deck.forEach(add);
      for (let k = 1; k < s.n; k++) if (s.alive[k]) s.hands[k].forEach(add);
      if (ctrGame !== g) { ctrGame = g; ctrInit = {}; const all = s.deck.concat(...s.hands, s.discard); all.forEach((id) => { ctrInit[kindOf(id)] = 1; }); }
      ctrNow = c;
      const deck = $('zmDeck');
      if (!deck) return;
      if (!ctrEl || !ctrEl.isConnected || ctrEl.parentNode !== deck) {
        if (ctrEl) ctrEl.remove();
        ctrEl = document.createElement('button'); ctrEl.type = 'button'; ctrEl.className = 'zb-ctrb'; ctrEl.setAttribute('aria-label', '记牌器'); ctrEl.innerHTML = CTR_SEAL;
        ctrEl.addEventListener('click', (e) => { e.stopPropagation(); openCtr(); });
        deck.appendChild(ctrEl);
      }
      if (ctrPanel) { const key = JSON.stringify(c); if (ctrPanel.dataset.k !== key) { ctrPanel.dataset.k = key; ctrPanel.firstChild.innerHTML = ctrHtml(); } }
    }
    /* 加倍的 ×2 小印（2026-11-27 用户：一直贴着头像丑）：只在开局盖一下章、两秒多后淡掉；整局不再挂着，结算那行照旧标 ×2 */
    const x2Shown = new WeakSet();
    function paintX2(g) {
      const zb = zbOf(g), on = !!(zb && zb.x2);
      if (!on || x2Shown.has(g)) return;
      const av = document.querySelector('#zmMe .zm-av');
      if (!av || !document.querySelector('#zmHand .zm-card') || document.querySelector('.zm-role-it, .zm-rd')) return;   // 等发完牌、抽完角色再盖章
      x2Shown.add(g);
      const m = document.createElement('span'); m.className = 'zb-x2m'; m.textContent = '×2'; m.setAttribute('aria-hidden', 'true'); av.appendChild(m);
      m.animate([{ transform: 'rotate(-10deg) scale(2.4)', opacity: 0 }, { transform: 'rotate(-10deg) scale(.9)', opacity: 1, offset: 0.12 }, { transform: 'rotate(-10deg) scale(1)', opacity: 1, offset: 0.2 }, { transform: 'rotate(-10deg) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'rotate(-10deg) scale(1)', opacity: 0 }],
        { duration: 2800, easing: 'ease-out', fill: 'forwards' }).finished.then(() => m.remove(), () => m.remove());
    }
    // 结算：加倍 = 再记一份名次结算（扣的也翻倍），封顶同真实规则（赢不超过余额、扣到 0 为止）
    /* 结算：加倍 = 名次结算再记一份（扣的也翻倍），封顶同真实规则（赢不超过余额、扣到 0 为止）。
     * 联机（2026-11-27 用户同意）：多赢的那份系统出、多亏的那份系统收，别人的结算一分不动；别人看不到我加没加倍 */
    function settleX2(g) {
      const zb = zbOf(g);
      if (!zb || !zb.x2 || zb.x2done) return;
      const line = document.querySelector('#zmDialog .zmw-ln.is-main b');
      const solo = g.wt && (g.wt.done || g.wt.est), r = solo || (g.wSeq && g.wSeq.r);
      if (!r || !line) return;
      const pay = r.pay != null ? r.pay : (r.delta || 0) + (r.price || 0) - (r.firstWin || 0);
      const final = g.wt ? !!g.wt.done : false;
      if (!final && !zb.__t) { zb.__t = Date.now(); return; }   // 先按估的数，等服务器回来（最多 3 秒）
      if (!final && Date.now() - zb.__t < 3000) return;
      zb.x2done = true; if (g.online) { d.onl = Object.assign({}, d.onl, { done: true }); save(); }
      let x = pay;
      if (x > 0) x = Math.min(x, bal()); else if (x < 0) x = -Math.min(-x, bal());
      if (x) book(x, '加倍（' + (x > 0 ? '多赢' : '多扣') + '）' + (g.online ? '·联机' : ''));
      if (!line.parentNode.querySelector('.zb-x2s')) { const sp = document.createElement('span'); sp.className = 'zb-x2s'; sp.textContent = '×2'; line.parentNode.insertBefore(sp, line.nextSibling); }
    }
    const zbOf = (g) => g.zb || (g.state && g.state.zb) || null;
    /* 联机开局（2026-11-27 用户同意：联机只开记牌器和加倍，作废 / 交换 / 挑角色不开——会改发牌、影响别人）：
     * 房间页底下一格开局道具，开局那一刻当场买。刷新 / 断线回来同一局不重复扣：按「这局刚发的手牌」认是不是新的一局 */
    function onlineStart(g) {
      if (!g.online || g.spectator || g.zb !== undefined) return;
      const s = g.state;
      if (!s || !s.hands || !s.hands[0] || !s.discard) return;
      const fresh = s.discard.length === 0, key = (g.matchNo || 0) + ':' + s.hands[0].slice().sort((a, b) => a - b).join(',');
      if (!fresh) { g.zb = d.onl && d.onl.m === g.matchNo && Date.now() - d.onl.at < 3 * 3600e3 && !d.onl.done ? d.onl.zb : null; return; }
      if (d.onl && d.onl.key === key) { g.zb = d.onl.done ? null : d.onl.zb; return; }
      const zb = {};
      if (counterDayOn()) zb.counter = true;
      else if (d.opick && d.opick.counter && bal() >= priceAt('counter')) { takeBuy('counter', '记牌器（联机）'); zb.counter = true; }
      const team = s.teams && s.teams.length;
      if (!team && d.opick && d.opick.x2 && bal() >= priceAt('x2')) { takeBuy('x2', '加倍（联机）'); zb.x2 = true; }
      g.zb = Object.keys(zb).length ? zb : null;
      d.onl = { key, m: g.matchNo, at: Date.now(), zb: g.zb };
      if (d.opick) d.opick = { counter: false, x2: false };   // 一局一买
      save();
    }
    /* 开局道具格放在哪（2026-11-27 用户：联机没有单机那张开局单；排行榜点「再来一局 / 下一局」直接开，也没地方买）：
     *   单机：开局单 + 单机结算页（「再来一局」上面）
     *   联机：房间页（「离开房间 / 开始」上面）+ 联机排行榜（房主「下一局」、客人「等房主开下一局」上面）
     * 都是选好、开局那一刻当场扣 */
    function mountBox(host, before, ctx, pk, attr, onClick) {
      let row = host.querySelector(':scope > .zb-items');
      const html = boxHtml(chipsFor(ctx), pk, attr);
      /* 「全员准备」线程（11-27）会在按钮行前面放一排准备条 .zm-readyrow：道具格要在它上面；我准备好了（按钮行或我的座位挂 is-ready）道具格就锁住 */
      const rr = before && before.previousElementSibling && before.previousElementSibling.classList.contains('zm-readyrow') ? before.previousElementSibling : null;
      if (rr) before = rr;
      if (!row) { row = document.createElement('div'); row.className = 'zb-items zr-box is-ro'; row.addEventListener('click', onClick); }
      if (row.nextElementSibling !== before) host.insertBefore(row, before);
      const lock = !!host.querySelector(':scope > .zm-lobby-actions.is-ready, :scope > .zm-actions.is-ready');
      row.classList.toggle('is-lock', lock);
      if (row.__h === html) return;
      row.innerHTML = html; row.__h = html;
    }
    function onOnlineChip(e) { const b = e.target.closest('[data-zbo]'); if (!b || b.dataset.free || b.closest('.is-lock')) return; e.stopPropagation(); d.opick = d.opick || {}; d.opick[b.dataset.zbo] = !d.opick[b.dataset.zbo]; save(); repaintPicks(); }
    function repaintPicks() {
      if (soloCtx && document.querySelector('.zm-solo-pick .zb-items')) solo(soloCtx);
      d.opick = d.opick || { counter: false, x2: false };
      const inner = document.querySelector('.zm-lobby:not([hidden]) .zm-lobby-inner');
      if (inner && inner.querySelector('.zm-lseat.is-me')) {
        const acts = inner.querySelector('.zm-lobby-actions');
        if (acts) mountBox(inner, acts, { online: true, mode: inner.querySelector('.zm-lobby-seats.is-team') ? 'team' : '' }, d.opick, 'data-zbo', onOnlineChip);
      }
      const dlg = document.querySelector('#zmDialog'), acts = dlg && dlg.querySelector('.zm-actions');
      if (!acts || dlg.closest('[hidden]')) return;
      const g = TB() && TB().game ? TB().game() : null;
      if (!g || g.tutorial || g.spectator) return;
      const rules = (g.state && g.state.rules) || {};
      if (g.online && acts.querySelector('[data-leave]')) mountBox(acts.parentNode, acts, { online: true, mode: g.state && g.state.teams ? 'team' : rules.mode }, d.opick, 'data-zbo', onOnlineChip);
      else if (!g.online && acts.querySelector('[data-again]')) mountBox(acts.parentNode, acts, { mode: rules.mode, rules }, d.pick, 'data-zbp', onChip);
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
      if (fxLast && fxLast.g === g && now.dc > fxLast.dc && now.h < fxLast.h && d.use.fx !== 'none') setTimeout(() => burst(d.use.fx, $('zmDiscard')), 260);
      fxLast = now;
    }
    function burst(kind, dc, host) {   // host：放在这个框里（商店那局的牌桌），坐标相对它、飞出框就裁掉
      if (!dc || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = dc.getBoundingClientRect(), o = host ? host.getBoundingClientRect() : { left: 0, top: 0 }, cx = r.left - o.left + r.width / 2, cy = r.top - o.top + r.height / 2;
      const N = kind === 'fish' ? 6 : 16;
      for (let i = 0; i < N; i++) {
        const p = document.createElement('div');
        p.className = 'zb-fxp';
        const a = (i / N) * Math.PI * 2 + Math.random() * 0.5, dist = Math.max(60, r.width) * (0.9 + Math.random() * 0.8);
        let html, size;
        if (kind === 'petals') { size = 16 + Math.random() * 10; html = '<svg viewBox="0 0 20 20" width="' + size + '"><path d="M10 1.5c3.4 3 4.6 7.6 0 17C5.4 9.1 6.6 4.5 10 1.5Z" fill="' + (i % 3 ? '#ec97aa' : '#f6c1cc') + '"/><path d="M10 4v11" stroke="#d9768d" stroke-width=".7" opacity=".6"/></svg>'; }
        else if (kind === 'sparks') { size = 10 + Math.random() * 10; html = '<svg viewBox="0 0 10 10" width="' + size + '"><path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill="#e3b64a"/></svg>'; }
        else { size = 30; html = '<span style="display:inline-flex;width:' + size + 'px">' + FISH() + '</span>'; }
        p.innerHTML = html;
        if (host) p.style.position = 'absolute';
        (host || document.body).appendChild(p);
        const x0 = cx - size / 2, y0 = cy - size / 2, x1 = x0 + Math.cos(a) * dist, y1 = y0 + Math.sin(a) * dist + (kind === 'petals' ? 30 : 0);
        const rot = (Math.random() - 0.5) * 360;
        p.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.4) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.6 }, { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(1) rotate(' + rot + 'deg)', opacity: 0 }],
          { duration: kind === 'fish' ? 1300 : 1100 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).finished.then(() => p.remove(), () => p.remove());
      }
    }
    /* 设置里的「装扮」卡（11-27 用户：装扮不只在商店里能换，常规设置里也要能改；对局里也允许，只列已有的款、不放去商店）：
     * 插在「作废」开关那张卡下面。一排四格是正在用的那一身；点一格展开这一类已有的款式，点一下当场换上 */
    let dressCat = null;
    function dressHtml(inGame) {
      const head = '<div class="zb-dr-h"><b>装扮</b></div><div class="zb-dr-row">' + CATS_ORDER.map((c) => '<button type="button" class="zb-dr-c" data-drc="' + c + '" aria-pressed="' + (dressCat === c) + '"><span class="zb-dr-pv">' + previewHtml(c, d.use[c]) + '</span><small>' + CAT_NAME[c] + '</small></button>').join('') + '</div>';
      if (!dressCat) return head;
      const c = dressCat;
      const opts = CAT[c].filter(([id]) => owns(c, id)).map(([id, name]) => '<button type="button" class="zb-dr-o" data-dro="' + id + '" aria-pressed="' + (d.use[c] === id) + '">' + (d.use[c] === id ? USE_MARK : '') + '<span class="zb-dr-pv">' + previewHtml(c, id) + '</span><small>' + name + '</small></button>').join('');
      const more = inGame ? '' : '<button type="button" class="zb-dr-o zb-dr-shop" data-drshop="1"><span class="zb-dr-pv"><i>' + FISH() + '</i></span><small>去商店 ›</small></button>';
      return head + '<div class="zb-dr-opts">' + opts + more + '</div>';
    }
    function mountDress() {
      const dl = $('zmDialog');
      if (!dl || !dl.classList.contains('zs') || dl.closest('[hidden]')) { dressCat = null; return; }
      if (dl.querySelector('.zb-dress')) return;
      const nope = dl.querySelector('[data-nope-mine]'), after = nope && nope.closest('.zs-card');
      if (!after) return;
      const cv = $('zmCover'), g = TB() && TB().game ? TB().game() : null;
      const inGame = !!(cv && cv.hidden && g && g.state && g.state.phase !== 'over');
      const sec = document.createElement('section');
      sec.className = 'zs-card zb-dress';
      const paint = () => { sec.innerHTML = dressHtml(inGame); };
      paint();
      sec.addEventListener('click', (e) => {
        e.stopPropagation();
        const c = e.target.closest('[data-drc]');
        if (c) { dressCat = dressCat === c.dataset.drc ? null : c.dataset.drc; paint(); return; }
        const o = e.target.closest('[data-dro]');
        if (o && dressCat) { d.use[dressCat] = o.dataset.dro; save(); applyLook(); paintFrame(); paint(); return; }
        if (e.target.closest('[data-drshop]')) openShop();
      });
      after.after(sec);
    }
    /* 嵌在商店里的那局（?zmshow=1，见 zhamao.js 的 SHOW）：只管换装扮和出牌特效；装扮听外面商店发进来的，不碰账本 */
    const SHOW = !!root.ZM_SHOW;
    if (SHOW) {
      const app = $('zmApp'); if (app) app.classList.add('is-show');
      window.addEventListener('message', (e) => {
        if (e.source !== window.parent || e.origin !== location.origin || !e.data || !e.data.zbShow) return;
        if (e.data.look) { d.use = Object.assign({}, d.use, e.data.look); applyLook(); paintFrame(); }
        if (e.data.poke && d.use.fx !== 'none') burst(d.use.fx, $('zmDiscard'));
      });
      try { window.parent.postMessage({ zbShowReady: 1 }, location.origin); } catch (_) { /* */ }
    }
    setInterval(() => {
      if (SHOW) { paintFrame(); const g = TB() && TB().game ? TB().game() : null; if (g && g.state) try { fxWatch(g); } catch (_) { /* */ } return; }
      mountCover();
      try { repaintPicks(); mountDress(); } catch (_) { /* */ }
      paintFrame();
      const g = TB() && TB().game ? TB().game() : null;
      if (!g || !g.state) { if (ctrEl) { ctrEl.remove(); ctrEl = null; } closeCtr(); return; }
      try { onlineStart(g); paintCounter(g); paintX2(g); settleX2(g); taskWatch(g); fxWatch(g); } catch (_) { /* 内测：别让它拖垮牌局 */ }
    }, 150);
    applyLook();

    // ── 档案里的「内测」卡：广告翻倍、额外救济、每日任务 ──
    const TASKS = [['games', '对战 3 局', 3, 300], ['win', '拿 1 次第一名', 1, 500], ['online', '联机对战 1 局', 1, 500]];   // 2026-11-27 用户：措辞要严谨（「赢一局」有歧义）
    const RELIEF = 2000, EXTRA_MAX = 2;
    /* 2026-11-27 用户第 9 条：任务和签到合成一栏——先签到七格，下面一行行任务。内测这几行直接沿用签到卡里「今日首胜」那种 .zmp-task 行，
     * 插在今日首胜下面（没有就接在七格下面），不再单独开一张卡 */
    function betaCard() {
      const r = dayRec(), ws = W() && W().state ? W().state() || {} : {}, ck = ws.ck === today(), rl = ws.relief || {};
      const used = rl.left != null ? Math.max(0, 2 - rl.left) : 0;
      const fishAmt = (amt) => '<b>' + FISH() + '+' + fmt(amt) + '</b>';
      const line = (name, amt, sub, ready, right) => '<div class="zmp-task' + (ready ? ' is-ready' : '') + '"><span>' + name + fishAmt(amt) + (sub ? '<small class="zb-sub">' + sub + '</small>' : '') + '</span>' + right + '</div>';
      const ad = (k, ok) => (ok ? '<button type="button" data-zbad="' + k + '">▶ 看广告</button>' : '');
      let h = '<div data-zbcard>';   // 2026-11-27 用户：任务 / 内测右边不要单独一行小计，加的鱼直接算进档案第一格的总额（ZhamaoProfileBalAdj）
      TASKS.forEach(([k, name, goal, amt]) => {
        const v = Math.min(goal, r[k] || 0), got = r.got[k] || 0;
        // 没做完：「去完成」（同今日首胜，点了关档案、打开单机 / 联机设置单），进度写在名字底下
        const right = got === 2 ? '<em>已领取</em>' : got === 1 ? ad('t2:' + k, true) : v >= goal ? '<button type="button" data-zbt="' + k + '">领取</button>' : '<button type="button" class="go" data-zbgo="' + (k === 'online' ? 'online' : 'solo') + '">去完成</button>';
        // 2026-11-27 用户：一局没做只写名字；做了一部分名字后面加（1/3）；做完不写 3/3，按钮直接变「领取」
        h += line(name + (v > 0 && v < goal ? '（' + v + '/' + goal + '）' : ''), amt, got === 1 ? '看广告再领一份' : '', v >= goal && got < 2, right);
      });
      if (used > r.rAd) h += line('救济翻倍', RELIEF, '今天领过 ' + used + ' 次救济', true, ad('relief', true));
      if (rl.left === 0) h += line('额外救济', RELIEF, '今天 ' + r.extra + ' / ' + EXTRA_MAX, r.extra < EXTRA_MAX, r.extra < EXTRA_MAX ? ad('extra', true) : '<em>明天再来</em>');
      return h + '</div>';
    }
    /* 领到的鱼游进档案的总额（2026-11-27 用户：看完广告回来要有反应——按钮已经变「已领取」，鱼从那一行游进余额；余额滑出屏幕就进顶栏的小鱼干） */
    root.ZhamaoProfileBalAdj = () => d.delta;
    const fishIn = (src, amt) => { if (root.ZhamaoProfile && root.ZhamaoProfile.addFish) root.ZhamaoProfile.addFish(src, amt); };
    const rowAt = (bodyEl, i) => { const rows = bodyEl.querySelectorAll('[data-zbcard] .zmp-task'); return rows[Math.min(i, rows.length - 1)] || bodyEl.querySelector('[data-zbcard]'); };
    function mountCard(bodyEl) {
      const week = bodyEl.querySelector('.zmp-week');
      const cardEl = week && week.closest('.zmp-card');
      if (!cardEl) return;
      const old = bodyEl.querySelector('[data-zbcard]');
      const wrap = document.createElement('div'); wrap.innerHTML = betaCard();
      const card = wrap.firstChild;
      if (old) old.replaceWith(card);
      else { const fw = cardEl.querySelector('.zmp-task'), after = fw || week; after.parentNode.insertBefore(card, after.nextSibling); }
      grabBal(card);
      card.addEventListener('click', (e) => {
        const go = e.target.closest('[data-zbgo]');
        if (go) { if (root.ZhamaoProfile) root.ZhamaoProfile.close(); const k = go.dataset.zbgo; setTimeout(() => { const b = document.querySelector('.zm-cover:not([hidden]) [data-cover="' + k + '"]'); if (b) b.click(); }, 350); return; }
        const a = e.target.closest('[data-zbad]'), t = e.target.closest('[data-zbt]');
        const r = dayRec(), row0 = (a || t) && (a || t).closest('.zmp-task'), idx = row0 ? [...card.querySelectorAll('.zmp-task')].indexOf(row0) : 0;
        const gain = (amt, why) => { book(amt, why); mountCard(bodyEl); fishIn(rowAt(bodyEl, idx), amt); };
        if (t && !t.disabled) { const k = t.dataset.zbt, row = TASKS.find((x) => x[0] === k); r.got[k] = 1; save(); gain(row[3], '每日任务「' + row[1] + '」'); return; }
        if (!a || a.disabled) return;
        const k = a.dataset.zbad;
        if (k === 'relief') adThen('relief', () => { r.rAd++; save(); gain(RELIEF, '救济·看广告翻倍'); });
        if (k === 'extra') adThen('relief-extra', () => { r.extra++; save(); gain(RELIEF, '额外救济·看广告'); });
        if (k.startsWith('t2:')) { const kk = k.slice(3), row = TASKS.find((x) => x[0] === kk); adThen('task', () => { r.got[kk] = 2; save(); gain(row[3], '每日任务·看广告'); }); }
      });
    }
    /* 签到成功弹窗（2026-11-27 用户）：「签到成功 +N」，两个键「知道了」/「看广告领翻倍」；关掉就当天没有第二次机会。
     * 档案那边签成功、鱼游完会调 ZhamaoAfterCheckin(amt) */
    root.ZhamaoAfterCheckin = (amt) => {
      const r = dayRec(), host = document.querySelector('.zmp');
      if (!host || r.ck) return;
      r.ck = 'seen'; save();   // 弹过一次就算：关了不再给
      const m = document.createElement('div');
      m.className = 'zmp-bmask zb-ckpop';
      m.innerHTML = '<div class="zmp-bcard" role="dialog" aria-label="签到成功"><div class="zb-ck-fish">' + FISH() + '</div><h3>签到成功</h3><div class="zb-ck-amt">+' + fmt(amt) + '</div>' +
        '<div class="zb-ck-btns"><button type="button" class="zb-btn" data-ck="no">知道了</button><button type="button" class="zb-btn is-red" data-ck="ad">▶ 看广告领翻倍</button></div></div>';
      host.appendChild(m);
      const close = () => m.remove();
      m.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.target.closest('[data-ck]');
        if (!b) { if (e.target === m) close(); return; }
        close();
        if (b.dataset.ck === 'ad') adThen('checkin', () => { book(amt, '签到·看广告翻倍'); dayRec().ck = true; save(); const days = [...document.querySelectorAll('.zmp .zmp-day.is-done')]; fishIn(days[days.length - 1], amt); });
      });
    };

    // 档案每次重画 body：看到签到卡就把内测卡插在前面
    new MutationObserver(() => {
      const b = document.querySelector('.zmp .zmp-body');
      mountProfileShop();
      if (b && b.querySelector('.zmp-week') && !b.querySelector('[data-zbcard]')) {
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
