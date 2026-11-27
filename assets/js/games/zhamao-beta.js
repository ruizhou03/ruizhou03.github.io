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
    const realBal = () => { const s = W() && W().state ? W().state() : null; return s && s.bal != null ? s.bal : 0; };
    const bal = () => Math.max(0, realBal() + d.delta);
    function book(amt, why) { d.delta += amt; d.log.unshift({ at: Date.now(), amt, why }); d.log = d.log.slice(0, 60); save(); paintBal(); }
    function dayRec() {
      const t = today();
      if (!d.day || d.day.d !== t) { d.day = { d: t, ck: false, rAd: 0, extra: 0, games: 0, win: 0, online: 0, got: {} }; save(); }
      return d.day;
    }

    // 记牌器的图标：一把小算盘（2026-11-27 用户：用窥探的眼睛会让人以为保证开局有一张窥探）
    const CTR_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.2" fill="#fffdf8" stroke="#7a4f2a" stroke-width="1.8"/><path d="M3.9 9.3h16.2M3.9 14.7h16.2" stroke="#7a4f2a" stroke-width="1.1"/><g fill="#b4392c"><circle cx="7.5" cy="6.8" r="1.5"/><circle cx="15.5" cy="6.8" r="1.5"/><circle cx="10.5" cy="12" r="1.5"/></g><g fill="#c9a24a"><circle cx="12" cy="6.8" r="1.5"/><circle cx="14.5" cy="12" r="1.5"/><circle cx="8" cy="17.3" r="1.5"/><circle cx="16.5" cy="17.3" r="1.5"/></g></svg>';
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
      frame: [['none', '无', 0], ['yarn', '毛线', 5000], ['fishbone', '鱼骨', 10000], ['gold', '金边', 20000]],
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
.zb-ctr{position:absolute;left:50%;transform:translateX(-50%);z-index:1;pointer-events:none;display:flex;background:rgba(255,253,248,.92);border:1px solid rgba(29,27,24,.55);border-radius:5px;box-shadow:0 1px 0 rgba(29,27,24,.08);max-width:calc(100% - 12px);overflow:hidden}
.zb-ctr span{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-width:19px;padding:1px 1px 0;font-size:10px;font-weight:700;line-height:1;color:#1d1b18;font-family:'ZM Num','ZM Serif',serif}
.zb-ctr span+span{border-left:1px solid rgba(29,27,24,.14)}
.zb-ctr span svg{width:11px;height:11px}
.zb-ctr span.z{color:#c2bbaf}
.zb-ctr span.z svg{opacity:.3;filter:grayscale(1)}
.zb-x2m{position:absolute;right:-5px;bottom:-3px;z-index:4;font-size:9px;font-weight:700;color:#b4392c;background:#fbf6ec;border:1px solid #b4392c;border-radius:4px;padding:1px 2px;line-height:1;transform:rotate(-10deg);font-family:'ZM Num','ZM Serif',serif;opacity:.9}
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
.zb-frame svg{width:100%;height:100%;overflow:visible}
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
.zb-pshop{display:inline-flex;align-items:center;gap:5px;margin-top:10px;height:34px;padding:0 14px 0 11px;border-radius:17px;border:1.5px solid #1d1b18;background:#b4392c;color:#fffdf8;font:600 14px/1 system-ui,'Noto Sans SC',sans-serif;box-shadow:0 2px 0 #1d1b18;cursor:pointer}
.zb-pshop svg{width:18px;height:18px}
.zb-pshop:active{transform:translateY(2px);box-shadow:none}

.zb-tline{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
.zb-tline .zb-seal{margin:0}
.zb-tline .zb-bal{font-size:14px}
.zb-tline .zb-bal svg{width:22px;height:14px}
.zb-sub{display:block;margin-top:3px;font-size:11.5px;font-weight:400;color:#8a8275}
` + Object.keys(BACK_FILL).filter((k) => k !== 'navy').map((k) => `.zb-back-${k} .zm-card.is-back svg>rect:first-child{fill:${BACK_FILL[k]}}`).join('\n') + '\n' +
      `.zb-back-gilt .zm-card.is-back svg>rect:nth-child(2){stroke:#f3d58a}\n` +
      Object.keys(FELT).filter((k) => FELT[k]).map((k) => `.zb-felt-${k}.zm-app{background-color:${FELT[k]}}\n.zb-felt-${k} .zm-table{${feltStyle(k)}}`).join('\n');
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

    // 道具：存货 + 当天件数
    const ITEMS = [['counterDay', '记牌器（一整天）'], ['counter', '记牌器（一局）'], ['x2', '加倍'], ['role', '挑角色'], ['nope', '作废'], ['swap', '交换']];
    const ITEM_NAME = Object.fromEntries(ITEMS);
    const itemIc = (k) => (k === 'counterDay' || k === 'counter' ? CTR_IC : k === 'x2' ? X2_IC : k === 'role' ? '<span class="rb">' + (ART() ? ART().ROLE_BACK : '') + '</span>' : (ART() ? ART().icon(k) : ''));
    const inv = (k) => ((d.inv || {})[k] | 0);
    function bought(k) { if (!d.bd || d.bd.d !== today()) { d.bd = { d: today(), n: {} }; } return d.bd.n[k] | 0; }
    const priceAt = (k, extra) => (k === 'counterDay' ? BASE.counterDay : nice(BASE[k] * Math.min(3, 1 + 0.2 * (bought(k) + (extra || 0)))));
    const priceFor = (k, q) => { let t = 0; for (let i = 0; i < q; i++) t += priceAt(k, i); return t; };
    function takeBuy(k, q, why) { const p = priceFor(k, q); book(-p, why || ITEM_NAME[k] + (q > 1 ? ' ×' + q : '')); bought(k); d.bd.n[k] = (d.bd.n[k] | 0) + q; save(); return p; }

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

    function shopHtml() {
      let h = '<div class="zb-top"><button type="button" class="zb-x" data-zb="close" aria-label="返回">' + BACK_SVG + '</button><h2>商店</h2>' + balHtml() +
        '<button type="button" class="zb-x zb-book" data-zb="ledger" aria-label="账本">' + BOOK_SVG + '</button></div>' +
        '<div class="zb-tabs"><button type="button" data-zbtab="look" aria-pressed="' + (tab === 'look') + '">外观</button><button type="button" data-zbtab="items" aria-pressed="' + (tab === 'items') + '">道具</button></div><div class="zb-body">';
      if (tab === 'look') {
        h += '<div class="zb-cats">' + Object.keys(CAT).map((cat) => '<button type="button" class="zb-cat" data-zbopen="' + cat + '">' + catCover(cat) + '<b>选购' + CAT_NAME[cat] + '</b></button>').join('') + '</div>';
      } else {
        h += '<div class="zb-grid">' + ITEMS.map(([k, name]) => {
          const day = k === 'counterDay', on = day && counterDayOn(), n = inv(k), p = priceAt(k);
          return '<button type="button" class="zb-it zb-item' + (!on && bal() < p ? ' is-poor' : '') + '" data-zbitem="' + k + '"' + (on ? ' disabled' : '') + '>' + (n ? '<span class="zb-n">' + n + '</span>' : '') +
            '<span class="zb-pv ic">' + itemIc(k) + '</span><b>' + name + '</b>' + (on ? '<i class="ok">今天已开</i>' : '<i>' + FISH() + fmt(p) + '</i>') + '</button>';
        }).join('') + '</div>';
      }
      return h + '</div>';
    }
    // 外观第一层：每类一张大卡，卡面是「现在用着的那款」放在小场景里
    function catCover(cat) {
      const id = d.use[cat];
      if (cat === 'felt') return '<span class="zb-cv" style="' + feltStyle(id === 'paper' ? 'sakura' : id) + '"><span class="zb-cv-card">' + backOf(d.use.back) + '</span><span class="zb-cv-card f">' + (TB() ? TB().cardHtml('skip') : '') + '</span></span>';
      if (cat === 'back') return '<span class="zb-cv" style="' + feltStyle(d.use.felt) + '">' + ['cinnabar', id, 'jade'].map((b, i) => '<span class="zb-cv-card b' + i + '">' + backOf(i === 1 ? id : b) + '</span>').join('') + '</span>';
      if (cat === 'frame') return '<span class="zb-cv" style="' + feltStyle(d.use.felt) + '"><span class="zb-pv av big">' + myFace() + (FRAME_SVG[id === 'none' ? 'gold' : id] || '') + '</span></span>';
      return '<span class="zb-cv" style="' + feltStyle(d.use.felt) + '"><span class="zb-cv-card f">' + (TB() ? TB().cardHtml('nope') : '') + '</span><span class="zb-cv-fx">' + FX_IC[id === 'none' ? 'petals' : id] + '</span></span>';
    }
    function paintShop() {
      if (!shop) return;
      const body = shop.querySelector('.zb-body'), y = body ? body.scrollTop : 0;
      shop.innerHTML = shopHtml(); grabBal(shop);
      const nb = shop.querySelector('.zb-body'); if (nb) nb.scrollTop = y;   // 买完 / 换完停在原地
    }
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
    /* 确认卡：预览 + 名字 + 价钱；道具多一个数量（当天递增价按件加总）。「购买」→ 余额滚下去、鱼游到这件东西上 */
    let buying = false;
    function confirmBuy(o, tile, done) {
      if (buying) return;
      const m = document.createElement('div');
      m.className = 'zb-cf';
      let q = 1;
      const total = () => (o.priceFor ? o.priceFor(q) : o.price);
      const paint = () => {
        const t = total(), ok = bal() >= t;
        m.querySelector('[data-cf="yes"]').innerHTML = '购买 ' + FISH() + fmt(t);
        m.querySelector('[data-cf="yes"]').disabled = !ok;
        const qn = m.querySelector('.zb-q b'); if (qn) qn.textContent = q;
        const mi = m.querySelector('[data-q="-1"]'), pl = m.querySelector('[data-q="1"]');
        if (mi) mi.disabled = q <= 1; if (pl) pl.disabled = q >= 9 || bal() < (o.priceFor ? o.priceFor(q + 1) : 0);
      };
      m.innerHTML = '<div class="zb-cf-in" role="dialog" aria-label="确认购买">' + o.pv + '<b>' + o.name + '</b>' + (o.sub ? '<small>' + o.sub + '</small>' : '') +
        (o.priceFor ? '<div class="zb-q"><button type="button" data-q="-1" aria-label="少一件">−</button><b>1</b><button type="button" data-q="1" aria-label="多一件">+</button></div>' : '') +
        '<div class="zb-cf-btns"><button type="button" class="zb-btn" data-cf="no">取消</button><button type="button" class="zb-btn is-red" data-cf="yes"></button></div></div>';
      (sub || shop).appendChild(m);
      paint();
      requestAnimationFrame(() => m.classList.add('is-on'));
      const close = () => { m.classList.remove('is-on'); setTimeout(() => m.remove(), 200); };
      m.addEventListener('click', (e) => {
        e.stopPropagation();
        const qb = e.target.closest('[data-q]');
        if (qb) { q = Math.max(1, Math.min(9, q + Number(qb.dataset.q))); paint(); return; }
        const b = e.target.closest('[data-cf]');
        if (!b) { if (e.target === m) close(); return; }
        if (b.dataset.cf === 'no') { close(); return; }
        if (buying || b.disabled) return;
        buying = true;
        const host = sub || shop, num = host.querySelector('.zb-top [data-zbbal]'), from = bal(), fx = root.ZhamaoWalletFx;
        close();
        if (num) num.__zbHold = true;
        done(q);
        const to = bal();
        if (num) num.textContent = fmt(from);
        const end = () => { buying = false; if (num) num.__zbHold = false; paintBal(); if (o.after) o.after(); };
        if (fx && num) {
          fx.roll(num, from, to, 520);
          fx.school(FISH(), num, tile, Math.min(5, 2 + q), { spread: 12, gap: 90, dur: 620, lift: -30, size: 24 }).then(end, end);
        } else end();
      });
    }
    function closeShop() { if (!shop) return; closeSub(); shop.classList.remove('is-on'); setTimeout(() => { shop.hidden = true; }, 320); }
    function onShop(e) {
      if (sub && sub.contains(e.target)) return;
      const t = e.target.closest('[data-zbtab]');
      if (t) { tab = t.dataset.zbtab; paintShop(); return; }
      const a = e.target.closest('[data-zb]');
      if (a) {
        const k = a.dataset.zb;
        if (k === 'close') closeShop();
        if (k === 'ledger') openLedger();
        return;
      }
      const op = e.target.closest('[data-zbopen]');
      if (op) { openLook(op.dataset.zbopen); return; }
      const it = e.target.closest('[data-zbitem]');
      if (it && !it.disabled) {
        const k = it.dataset.zbitem;
        if (bal() < priceAt(k)) return;
        const pv = '<span class="zb-pv ic big">' + itemIc(k) + '</span>';
        if (k === 'counterDay') confirmBuy({ pv, name: ITEM_NAME[k], price: BASE.counterDay, after: paintShop }, it, () => { takeBuy(k, 1); d.counterDay = today(); save(); });
        else confirmBuy({ pv, name: ITEM_NAME[k], priceFor: (q) => priceFor(k, q), after: paintShop }, it, (q) => { takeBuy(k, q); d.inv = d.inv || {}; d.inv[k] = inv(k) + q; save(); });
      }
    }

    // ── 二级页（账本 / 外观预览）：从右边滑进来，盖在商店上面 ──
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
      const s0 = sub; sub = null; clearInterval(fxLoop);
      if (now) { s0.remove(); return; }
      s0.classList.remove('is-on'); setTimeout(() => s0.remove(), 300);
      paintShop();
    }
    const subTop = (title) => '<div class="zb-top"><button type="button" class="zb-x" data-zb="back" aria-label="返回">' + BACK_SVG + '</button><h2>' + title + '</h2>' + balHtml() + '</div>';
    function openLedger() {
      const rows = d.log.length ? d.log.slice(0, 40).map((x) => '<div class="zb-row" style="padding:7px 12px"><span class="t">' + x.why + '<small>' + new Date(x.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</small></span><b style="color:' + (x.amt < 0 ? '#b4392c' : '#3f7a52') + '">' + (x.amt < 0 ? '−' : '+') + fmt(x.amt) + '</b></div>').join('') : '<div class="zb-row"><span class="t" style="color:#6a6358">还没有</span></div>';
      openSub(subTop('账本') + '<div class="zb-body">' + rows + '<div class="zb-row" style="margin-top:14px"><span class="t">清空内测账本<small>内测花的、领的全部归零，外观和存货也收回</small></span><button type="button" class="zb-btn" data-zb="reset">清空</button></div></div>', (e) => {
        if (e.target.closest('[data-zb="reset"]')) { const keep = d.pick, tops = d.tops; d = D0(); d.pick = keep; d.tops = tops; save(); applyLook(); openLedger(); }
      });
    }
    // 外观预览页：上面一张真的小牌桌（两只机器猫、牌堆、弃牌堆、我的头像和手牌），下面一排款式，点哪款牌桌当场换上；底下一颗大键 购买 / 使用 / 使用中
    let fxLoop = 0;
    function sceneHtml(look) {
      const a = AVS(), bots = a && a.ROBOT ? a.ROBOT.slice(0, 2).map((x) => x.svg) : ['', ''];
      const card = (k) => (TB() ? TB().cardHtml(k) : '');
      return '<div class="zb-scene" style="' + feltStyle(look.felt) + '">' +
        '<div class="zb-sc-opp l"><span class="zb-face">' + bots[0] + '</span></div><div class="zb-sc-opp r"><span class="zb-face">' + bots[1] + '</span></div>' +
        '<div class="zb-sc-piles"><span class="zb-sc-deck">' + [2, 1, 0].map((i) => '<span style="transform:translate(' + (-i * 1.5) + 'px,' + (-i * 2) + 'px)">' + backOf(look.back) + '</span>').join('') + '</span><span class="zb-sc-disc" data-zbdisc>' + card('nope') + '</span></div>' +
        '<div class="zb-sc-me"><span class="zb-pv av">' + myFace() + (FRAME_SVG[look.frame] || '') + '</span></div>' +
        '<div class="zb-sc-hand">' + ['defuse', 'skip', 'favor', 'shuffle', 'calico'].map((k, i) => '<span style="transform:rotate(' + ((i - 2) * 5) + 'deg) translateY(' + Math.abs(i - 2) * 3 + 'px)">' + card(k) + '</span>').join('') + '</div></div>';
    }
    function openLook(cat) {
      let sel = d.use[cat];
      const look = () => Object.assign({}, d.use, { [cat]: sel });
      const optsHtml = () => CAT[cat].map(([id, name, p]) => {
        const own = d.own[cat].includes(id), use = d.use[cat] === id;
        return '<button type="button" class="zb-opt' + (id === sel ? ' is-sel' : '') + '" data-o="' + id + '">' + previewHtml(cat, id) + '<b>' + name + '</b>' + (use ? '<i class="ok">使用中</i>' : own ? '<i>已拥有</i>' : '<i>' + FISH() + fmt(p) + '</i>') + '</button>';
      }).join('');
      const actHtml = () => {
        const row = CAT[cat].find((x) => x[0] === sel), own = d.own[cat].includes(sel), use = d.use[cat] === sel;
        if (use) return '<button type="button" class="zb-big" disabled>使用中</button>';
        if (own) return '<button type="button" class="zb-big" data-act="use">使用</button>';
        return '<button type="button" class="zb-big is-red" data-act="buy"' + (bal() < row[2] ? ' disabled' : '') + '>购买 ' + FISH() + fmt(row[2]) + '</button>';
      };
      const repaint = (all) => {
        if (!sub) return;
        const sc = sub.querySelector('.zb-scene-wrap');
        if (all) sc.innerHTML = sceneHtml(look());
        else {   // 只换这一类，场景不重建（换桌布有一点过渡）
          const s = sc.querySelector('.zb-scene'), L = look();
          if (cat === 'felt') s.setAttribute('style', feltStyle(L.felt));
          if (cat === 'back') sc.querySelectorAll('.zb-sc-deck>span').forEach((x) => { x.innerHTML = backOf(L.back); });
          if (cat === 'frame') sc.querySelector('.zb-sc-me').innerHTML = '<span class="zb-pv av">' + myFace() + (FRAME_SVG[L.frame] || '') + '</span>';
        }
        const ol = sub.querySelector('.zb-opts'), x = ol.scrollLeft; ol.innerHTML = optsHtml(); ol.scrollLeft = x;
        sub.querySelector('.zb-act').innerHTML = actHtml();
        if (cat === 'fx') playFx();
      };
      const playFx = () => { const el = sub && sub.querySelector('[data-zbdisc]'); if (el && sel !== 'none') burst(sel, el); };
      openSub(subTop(CAT_NAME[cat]) + '<div class="zb-scene-wrap">' + sceneHtml(look()) + '</div><div class="zb-opts">' + optsHtml() + '</div><div class="zb-act">' + actHtml() + '</div>', (e) => {
        const o = e.target.closest('[data-o]');
        if (o) { sel = o.dataset.o; repaint(false); return; }
        if (cat === 'fx' && e.target.closest('.zb-scene')) { playFx(); return; }
        const act = e.target.closest('[data-act]');
        if (!act || act.disabled) return;
        if (act.dataset.act === 'use') { d.use[cat] = sel; save(); applyLook(); repaint(false); return; }
        const row = CAT[cat].find((x) => x[0] === sel), id = sel;
        confirmBuy({ pv: previewHtml(cat, id), name: row[1], sub: CAT_NAME[cat], price: row[2], after: () => repaint(false) }, sub.querySelector('.zb-opt.is-sel') || act, () => { book(-row[2], CAT_NAME[cat] + '「' + row[1] + '」'); d.own[cat].push(id); d.use[cat] = id; save(); applyLook(); });
      });
      if (cat === 'fx') { setTimeout(playFx, 450); fxLoop = setInterval(playFx, 2400); }
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
    function mountProfileShop(b) {
      if (b.querySelector('[data-zbpshop]')) return;
      const host = b.querySelector('.zmp-bal') || b.querySelector('.zmp-card');
      if (!host) return;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'zb-pshop'; btn.dataset.zbpshop = '1'; btn.innerHTML = BAG + '<span>商店</span>';
      btn.addEventListener('click', (e) => { e.stopPropagation(); openShop(); });
      host.appendChild(btn);
    }

    // ── 外观落到牌桌上 ──
    function applyLook() {
      const app = $('zmApp');
      if (!app) return;
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
      if (!counterDayOn()) chips.push(['counter', CTR_IC]);
      if (!team) chips.push(['x2', '<span class="x2">×2</span>']);
      if (ctx.mode === 'roles') chips.push(['role', ART() ? (d.pick.role ? '<span class="rf">' + ART().roleFace(d.pick.role) + '</span>' : '<span class="rb">' + ART().ROLE_BACK + '</span>') : '']);   // 没挑：一张小角色牌背；挑了：那只猫的脸
      if (!team) chips.push(['nope', icon('nope')]);
      if (!team && ctx.rules && ctx.rules.swap) chips.push(['swap', icon('swap')]);
      const label = { counter: '记牌器', x2: '加倍', role: '挑角色', nope: '作废', swap: '交换' };
      // 有存货：角上写剩几件、点亮就用一件；没存货：写当场买的价（同商店当天价）
      row.innerHTML = chips.map(([k, ic]) => { const on = k === 'role' ? !!d.pick.role : !!d.pick[k], n = inv(k); return '<button type="button" class="zb-chip" data-zbp="' + k + '" aria-pressed="' + on + '" aria-label="' + label[k] + '">' + ic + (n ? '<i class="inv">' + n + '</i>' : '<i>' + FISH() + fmt(priceAt(k)) + '</i>') + '</button>'; }).join('');
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
      // 先用存货，没有就按当天价当场买（买的也算进当天件数）
      const buy = (k) => { if (inv(k) > 0) { d.inv[k]--; save(); return true; } if (bal() < priceAt(k)) return false; takeBuy(k, 1, ITEM_NAME[k] + '（开局买）'); return true; };
      const can = (k) => inv(k) > 0 || bal() >= priceAt(k);
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
      if (Object.keys(zb).length) s.zb = zb;
      d.pick = { counter: false, x2: false, role: null, nope: false, swap: false };   // 开局道具一局一买，开局后清掉
      dayRec().games++; save();
    }

    // ── 牌桌上：记牌器、×2 印、头像框、出牌特效、结算翻倍 ──
    const CTR_KINDS = ['defuse', 'nope', 'attack', 'tattack', 'skip', 'reverse', 'bottom', 'favor', 'swap', 'shuffle', 'future', 'alter', 'flux', 'cat'];
    let ctrEl = null, ctrInit = null, ctrGame = null;
    function kindOf(id) { const r = R(), k = r.KIND_OF[id]; return r.CATS.includes(k) || k === r.WILD ? 'cat' : k; }
    function paintCounter(g) {
      const s = g.state;
      if (!s.zb || !s.zb.counter || g.online) { if (ctrEl) { ctrEl.remove(); ctrEl = null; } return; }
      const c = {}, add = (id) => { const k = kindOf(id); c[k] = (c[k] || 0) + 1; };
      s.deck.forEach(add);
      for (let k = 1; k < s.n; k++) if (s.alive[k]) s.hands[k].forEach(add);
      if (ctrGame !== g) { ctrGame = g; ctrInit = {}; const all = s.deck.concat(...s.hands, s.discard); all.forEach((id) => { ctrInit[kindOf(id)] = 1; }); }
      // 2026-11-27 用户：桌心上方一排太丑 → 一张细长纸条，压在我的头像 / 按钮下面、手牌上面（手牌抬起时盖住它）；炸弹猫不列（牌堆旁已经有数）
      const table = $('zmTable'), hand = $('zmHand');
      if (!table || !hand) return;
      if (!ctrEl || !ctrEl.isConnected) { ctrEl = document.createElement('div'); ctrEl.className = 'zb-ctr'; ctrEl.setAttribute('aria-hidden', 'true'); table.appendChild(ctrEl); }
      const tr = table.getBoundingClientRect(), hr = hand.getBoundingClientRect(), card = hand.querySelector('.zm-card');
      const cardTop = card ? Math.min(...[...hand.querySelectorAll('.zm-card:not(.is-sel)')].map((x) => x.getBoundingClientRect().top).concat(hr.bottom)) : hr.top + 16;
      const h = ctrEl.offsetHeight || 30;
      let top = cardTop - h - 3;
      const band = $('zmBand'), br = band && band.getBoundingClientRect();
      if (br && br.bottom < cardTop && br.bottom > top) top = Math.min(br.bottom + 1, cardTop - h + 4);   // 竖屏：别压住摸牌 / 出牌键，挤不下就让手牌顶边盖住一点
      ctrEl.style.top = Math.round(top - tr.top) + 'px';
      const key = JSON.stringify(c);
      if (ctrEl.dataset.k === key) return;
      ctrEl.dataset.k = key;
      ctrEl.innerHTML = CTR_KINDS.filter((k) => ctrInit[k]).map((k) => '<span class="' + (c[k] ? '' : 'z') + '">' + (ART().icon(k === 'cat' ? 'wild' : k) || '') + '<b>' + (c[k] || 0) + '</b></span>').join('');
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
      if (fxLast && fxLast.g === g && now.dc > fxLast.dc && now.h < fxLast.h && d.use.fx !== 'none') setTimeout(() => burst(d.use.fx, $('zmDiscard')), 260);
      fxLast = now;
    }
    function burst(kind, dc) {
      if (!dc || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const r = dc.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
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
        document.body.appendChild(p);
        const x0 = cx - size / 2, y0 = cy - size / 2, x1 = x0 + Math.cos(a) * dist, y1 = y0 + Math.sin(a) * dist + (kind === 'petals' ? 30 : 0);
        const rot = (Math.random() - 0.5) * 360;
        p.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.4) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.6 }, { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(1) rotate(' + rot + 'deg)', opacity: 0 }],
          { duration: kind === 'fish' ? 1300 : 1100 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).finished.then(() => p.remove(), () => p.remove());
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
    const TASKS = [['games', '对战 3 局', 3, 300], ['win', '拿 1 次第一名', 1, 500], ['online', '联机对战 1 局', 1, 500]];   // 2026-11-27 用户：措辞要严谨（「赢一局」有歧义）
    const RELIEF = 2000, EXTRA_MAX = 2;
    /* 2026-11-27 用户第 9 条：任务和签到合成一栏——先签到七格，下面一行行任务。内测这几行直接沿用签到卡里「今日首胜」那种 .zmp-task 行，
     * 插在今日首胜下面（没有就接在七格下面），不再单独开一张卡 */
    function betaCard() {
      const r = dayRec(), ws = W() && W().state ? W().state() || {} : {}, ck = ws.ck === today(), rl = ws.relief || {};
      const ckAmt = ws.ckAmt || 0;
      const used = rl.left != null ? Math.max(0, 2 - rl.left) : 0;
      const fishAmt = (amt) => '<b>' + FISH() + '+' + fmt(amt) + '</b>';
      const line = (name, amt, sub, ready, right) => '<div class="zmp-task' + (ready ? ' is-ready' : '') + '"><span>' + name + fishAmt(amt) + (sub ? '<small class="zb-sub">' + sub + '</small>' : '') + '</span>' + right + '</div>';
      const ad = (k, ok) => (ok ? '<button type="button" data-zbad="' + k + '">▶ 看广告</button>' : '');
      let h = '<div data-zbcard><div class="zb-tline"><span class="zb-seal">内测</span><span class="zb-bal">' + FISH() + '<b data-zbbal>' + fmt(bal()) + '</b></span></div>';
      h += line('签到再领一份', ckAmt || 500, '', ck && !r.ck, r.ck ? '<em>已领</em>' : ck ? ad('ck', true) : '<em>先签到</em>');
      TASKS.forEach(([k, name, goal, amt]) => {
        const v = Math.min(goal, r[k] || 0), got = r.got[k] || 0;
        // 没做完：「去完成」（同今日首胜，点了关档案、打开单机 / 联机设置单），进度写在名字底下
        const right = got === 2 ? '<em>已领</em>' : got === 1 ? ad('t2:' + k, true) : v >= goal ? '<button type="button" data-zbt="' + k + '">领取</button>' : '<button type="button" class="go" data-zbgo="' + (k === 'online' ? 'online' : 'solo') + '">去完成</button>';
        h += line(name, amt, got === 1 ? '看广告再领一份' : v < goal && goal > 1 ? v + ' / ' + goal : '', v >= goal && got < 2, right);
      });
      if (used > r.rAd) h += line('救济翻倍', RELIEF, '今天领过 ' + used + ' 次救济', true, ad('relief', true));
      if (rl.left === 0) h += line('额外救济', RELIEF, '今天 ' + r.extra + ' / ' + EXTRA_MAX, r.extra < EXTRA_MAX, r.extra < EXTRA_MAX ? ad('extra', true) : '<em>明天再来</em>');
      return h + '</div>';
    }
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
      if (b) mountProfileShop(b);
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
