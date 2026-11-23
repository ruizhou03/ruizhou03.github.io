/* 百变小咪 · 猫咪档案（window.ZhamaoProfile，2026-11-22）
 * 用户：档案要内嵌在游戏里，不能跳到网站的个人页（像进了另一个系统）。所以这是游戏页里的一层面板：
 * 从右边滑进来盖住游戏，左上角折号退回。⚠️ 不碰浏览器历史（不 pushState、不跳页）：微信 / iOS 浏览器一有历史记录，
 * 屏幕最下面就会冒出一条前进后退的左右箭头条（2026-11-22 用户：很丑）。
 * 内容（2026-11-22 用户挑定第二轮「甲」四块）：头像 + 一排徽章（点开看怎么拿、进度、奖励）+ 余额；签到七格 + 近四周活跃；玩法胜率环；最近对局；
 * 流水折叠，标题旁一条余额走势细线。
 * 数据走 ZhamaoWallet.profile()（zircon-urge /api/zmw?action=profile）。登录用站点的登录弹层（游戏页里也挂了 auth.html），不离开游戏。 */
(function (root) {
  'use strict';
  const W = () => root.ZhamaoWallet || null;
  const AV = () => root.GongzhuAvatars || null;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (x) => Math.round(Math.abs(x || 0)).toLocaleString('en-US');
  const sign = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + fmt(x);
  const MODES = [['classic', '经典', '#c8463a'], ['flux', '百变', '#8e4a9c'], ['roles', '角色', '#e58e46'], ['team', '组队', '#2f4a6d']];   // 由便宜到贵，和主菜单玩法牌一个顺序
  const MODE_C = Object.fromEntries(MODES.map(([k, , c]) => [k, c]));

  const CSS = `
.zmp-ring svg{max-width:80px}
.zmp{position:fixed;inset:0;z-index:70;background:#f3eee3;color:#1d1b18;display:flex;flex-direction:column;font-family:'Songti SC','STSong','Noto Serif SC','Noto Serif CJK SC','Source Han Serif SC','PingFang SC',serif;-webkit-user-select:none;user-select:none;transform:translateX(100%);transition:transform .32s cubic-bezier(.3,.8,.3,1)}
.zmp.is-on{transform:none}
.zmp[hidden]{display:none}
@media(prefers-reduced-motion:reduce){.zmp{transition:none}}
.zmp *{box-sizing:border-box;min-width:0}
.zmp-top{flex:none;display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top,0px) + 8px) 14px 6px calc(env(safe-area-inset-left,0px) + 8px)}
.zmp-x{width:44px;height:44px;border:0;background:none;padding:0;cursor:pointer;display:grid;place-items:center;border-radius:50%}
.zmp-x svg{width:30px;height:30px}
.zmp-x:active svg{transform:scale(.92)}
.zmp-top h2{margin:0;font-size:22px;font-weight:900;letter-spacing:.04em}
.zmp-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:4px 14px calc(env(safe-area-inset-bottom,0px) + 24px)}
.zmp-in{max-width:760px;margin:0 auto}
.zmp-card{background:#fffdf8;border:1.5px solid #1d1b18;border-radius:18px;padding:14px;box-shadow:0 3px 0 #1d1b18}
.zmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}
.zmp-grid .wide{grid-column:1/-1}
@media(max-width:620px){.zmp-grid{grid-template-columns:minmax(0,1fr)}}
.zmp-hero{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;background:#f8f4ea}
.zmp-av{width:60px;height:60px;border-radius:50%;overflow:hidden;border:2px solid #1d1b18;background:#ebe5d8;display:grid;place-items:center;font-size:22px;font-weight:900}
.zmp-av svg{width:100%;height:100%;display:block}
.zmp-nick{font-size:19px;font-weight:900;line-height:1.2}
.zmp-who{display:flex;align-items:center;gap:6px;margin-top:5px;font:600 13px/1 system-ui,sans-serif;color:#6a6358}
.zmp-who .ok{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#3f7a52}
.zmp-who .ok svg{width:11px;height:11px}
.zmp-login{border:1.5px solid #b4392c;color:#b4392c;background:#fffdf8;border-radius:999px;padding:7px 15px;font:700 14px/1 system-ui,sans-serif;cursor:pointer}
.zmp-bal{text-align:right}
.zmp-bal .n b{font:inherit;display:inline-block}
.zmp-bal .n{display:inline-flex;align-items:center;gap:8px;font:900 clamp(30px,8vw,42px)/1 Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-bal .zmw-fish{width:46px;height:29px}
.zmp-bal .sub{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;font:700 13px/1 Georgia,serif;color:#6a6358}
.zmp-bal .up{color:#3f7a52}.zmp-bal .dn{color:#b4392c}
@media(max-width:480px){.zmp-hero{grid-template-columns:auto minmax(0,1fr)}.zmp-bal{grid-column:1/-1;text-align:left}.zmp-bal .sub{justify-content:flex-start}}
.zmp-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700}
.zmp-h small{font:600 12px system-ui,sans-serif;color:#6a6358}
.zmp-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.zmp-day{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0 7px;border:1.5px solid #d9cfbd;border-radius:14px;background:#f3eee3;font:700 13px/1 Georgia,serif;color:#6a6358;cursor:default}
.zmp-day .zmw-fish{width:26px;height:16px;opacity:.35}
.zmp-day.is-done{background:#1d1b18;border-color:#1d1b18;color:#f3eee3}
.zmp-day.is-done .zmw-fish{opacity:1}
.zmp-day.is-now{border-color:#b4392c;color:#b4392c;background:#fffdf8;cursor:pointer;box-shadow:0 0 0 3px rgba(180,57,44,.18)}
.zmp-day.is-now .zmw-fish{opacity:1}
.zmp-day.is-big{background-image:radial-gradient(circle at 50% 30%,rgba(227,168,63,.28),transparent 70%)}
@media(prefers-reduced-motion:no-preference){.zmp-day.is-now{animation:zmpPulse 1.6s ease-in-out infinite}@keyframes zmpPulse{50%{box-shadow:0 0 0 7px rgba(180,57,44,.08)}}}
.zmp-spark{position:relative;height:118px}
.zmp-spark svg{position:absolute;inset:0;width:100%;height:100%}
.zmp-heat{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,minmax(0,1fr));gap:3px}
.zmp-heat i{aspect-ratio:1;border-radius:3px;background:#ebe5d8}
.zmp-heat i.l1{background:#f0c9bb}.zmp-heat i.l2{background:#dc8b76}.zmp-heat i.l3{background:#c4553f}.zmp-heat i.l4{background:#b4392c}.zmp-heat i.fut{background:transparent}
.zmp-rings{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;text-align:center}
.zmp-ring svg{width:100%;max-width:88px;height:auto}
.zmp-ring b{display:block;font-size:14px}
.zmp-ring small{color:#6a6358;font:700 12px Georgia,serif}
.zmp-bars{display:grid;gap:10px}
.zmp-bar{display:grid;grid-template-columns:3em minmax(0,1fr) 3.2em;gap:8px;align-items:center;font-size:14px}
.zmp-bar .t{height:14px;border-radius:7px;background:#ebe5d8;overflow:hidden}
.zmp-bar .t i{display:block;height:100%;border-radius:7px;background:#1d1b18}
.zmp-bar span:last-child{text-align:right;font:700 14px Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-recs{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:8px}
.zmp-rec{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px 7px;border-radius:14px;background:#f3eee3;border:1.5px solid #d9cfbd}
.zmp-rec .m{position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%}
.zmp-rec .rk{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:700 14px/1 Georgia,serif;background:#ebe5d8;color:#6a6358}
.zmp-rec .rk.g1{background:#e9c46a;color:#6b4a12}.zmp-rec .rk.g2{background:#cfd3d9;color:#4b5058}.zmp-rec .rk.g3{background:#d9a477;color:#5e3517}
.zmp-rec .rk svg{width:18px;height:18px}
.zmp-rec .d{font:700 13px/1 Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-rec .d.up{color:#3f7a52}.zmp-rec .d.dn{color:#b4392c}
.zmp-rec .nn{font:600 11px/1 system-ui,sans-serif;color:#6a6358}
.zmp-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font:12px system-ui,sans-serif;color:#6a6358}
.zmp-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
.zmp-badges{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;text-align:center}
@media(max-width:520px){.zmp-badges{grid-template-columns:repeat(3,minmax(0,1fr))}}
.zmp-badge svg{width:50px;height:50px}
.zmp-badge small{display:block;font:600 12px/1.25 system-ui,sans-serif;color:#6a6358;margin-top:2px}
.zmp-badge.off svg{filter:grayscale(1);opacity:.28}
.zmp details{margin-top:14px}
.zmp summary{cursor:pointer;font-size:15px;font-weight:700;padding:6px 0}
.zmp-led{list-style:none;margin:6px 0 0;padding:0}
.zmp-led li{display:grid;grid-template-columns:28px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed #d9cfbd;font-size:14px}
.zmp-led .ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#ebe5d8}
.zmp-led .ic svg{width:15px;height:15px}
.zmp-led time{color:#6a6358;font:12px system-ui,sans-serif;white-space:nowrap}
.zmp-led b{font:700 14px Georgia,serif;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;min-width:3.5em}
.zmp-led b.up{color:#3f7a52}.zmp-led b.dn{color:#b4392c}
.zmp-empty{color:#6a6358;font:14px system-ui,sans-serif;text-align:center;padding:12px 0}
.zmp-wait{width:56px;height:8px;margin:40px auto;border-radius:4px;background:linear-gradient(90deg,#ebe5d8,#d9cfbd,#ebe5d8);background-size:200% 100%;animation:zmpWait 1s linear infinite}
@keyframes zmpWait{to{background-position:-200% 0}}
.zmp-bdg{display:flex;gap:5px;margin-top:6px;flex-wrap:wrap}
.zmp-bdg button{width:26px;height:26px;padding:0;border:0;background:none;cursor:pointer;border-radius:50%}
.zmp-bdg button svg{width:26px;height:26px;display:block}
.zmp-bdg button.off svg{filter:grayscale(1);opacity:.3}
.zmp-hero2{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;background:#f8f4ea}
.zmp-hero2 .zmp-bal{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left}
.zmp-hero2 .zmp-bal .sub{margin:0}
.zmp-act{display:grid;grid-template-columns:repeat(28,minmax(0,1fr));gap:2px;margin-top:8px}
.zmp-act i{aspect-ratio:1;border-radius:2px;background:#ebe5d8}
.zmp-act i.l1{background:#f0c9bb}.zmp-act i.l2{background:#dc8b76}.zmp-act i.l3{background:#c4553f}.zmp-act i.l4{background:#b4392c}
.zmp-ledsum{display:flex;align-items:center;gap:10px}
.zmp-ledsum .sp{flex:1;height:28px;min-width:60px}
.zmp-ledsum .sp svg{width:100%;height:100%;display:block}
.zmp details.zmp-card{margin-top:12px}
.zmp-bmask{position:absolute;inset:0;z-index:2;background:rgba(29,27,24,.28);display:flex;align-items:center;justify-content:center;padding:20px}
.zmp-bcard{width:min(320px,100%);background:#fffdf8;border:1.5px solid #1d1b18;border-radius:18px;box-shadow:0 3px 0 #1d1b18;padding:18px 16px 16px;text-align:center}
.zmp-bcard .big svg{width:76px;height:76px}
.zmp-bcard.off .big svg{filter:grayscale(1);opacity:.35}
.zmp-bcard h3{margin:6px 0 2px;font-size:19px}
.zmp-bcard .how{font:15px/1.4 system-ui,sans-serif;color:#1d1b18}
.zmp-bcard .pg{height:10px;border-radius:5px;background:#ebe5d8;overflow:hidden;margin:12px 0 4px}
.zmp-bcard .pg i{display:block;height:100%;background:#3f7a52;border-radius:5px}
.zmp-bcard .pn{font:700 13px Georgia,serif;color:#6a6358}
.zmp-bcard .rw{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:5px 14px;border-radius:999px;background:#f3eee3;font:700 16px Georgia,serif}
.zmp-bcard .rw .zmw-fish{width:28px;height:18px}
.zmp-bcard .rw.got{background:#e3f0e6;color:#3f7a52}
/* 站点登录弹层（auth.html）在游戏页里没有站点的颜色变量：给它一套游戏的 */
#sa-overlay{--color-bg:#fffdf8;--color-bg-warm:#f3eee3;--color-border:#d9cfbd;--color-muted:#6a6358;--color-light:#8a8274;--color-ink:#1d1b18;--color-text:#1d1b18;--color-highlight:#b4392c;--color-accent:#b4392c;--font-display:'Songti SC','Noto Serif SC',serif;font-family:system-ui,-apple-system,'PingFang SC',sans-serif}
`;
  const BACK = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24.5 6.5 13 20l11.5 13.5" fill="none" stroke="#b4392c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 18 4.5 7l5 5L12 5l2.5 7 5-5L21 18Z" fill="#6b4a12"/></svg>';
  const TICK = '<svg viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const IC = {
    newbie: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="2" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.5"/><path d="M12 9v11M4 13h16" stroke="#1d1b18" stroke-width="1.5"/><path d="M12 9c-3-4-7-2-4 0M12 9c3-4 7-2 4 0" fill="none" stroke="#b4392c" stroke-width="1.6"/></svg>',
    checkin: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" fill="#fffdf8" stroke="#1d1b18" stroke-width="1.5"/><path d="M4 10h16M9 3v4M15 3v4" stroke="#1d1b18" stroke-width="1.5"/><path d="M9 15l2 2 4-4" fill="none" stroke="#3f7a52" stroke-width="1.8"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2Z" fill="#f0c9bb" stroke="#1d1b18" stroke-width="1.5"/><path d="M14 6v12" stroke="#1d1b18" stroke-dasharray="2 2"/></svg>',
    win: '<svg viewBox="0 0 24 24"><path d="M7 4h10v4a5 5 0 0 1-10 0Z" fill="#e9c46a" stroke="#1d1b18" stroke-width="1.5"/><path d="M12 13v4M8 20h8" stroke="#1d1b18" stroke-width="1.5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.2 1.2 6L12 16.6l-5.3 2.9 1.2-6L3.4 9.3l6-.7Z" fill="#e9b949" stroke="#b07420" stroke-width="1.3"/></svg>',
    relief: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="#dc8b76" stroke="#1d1b18" stroke-width="1.5"/></svg>',
    feedback: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#fffdf8" stroke="#1d1b18" stroke-width="1.5"/><path d="M9 10h.01M15 10h.01M9 15.5c2-1.4 4-1.4 6 0" stroke="#1d1b18" stroke-width="1.8" stroke-linecap="round"/></svg>',
    merge: '<svg viewBox="0 0 24 24"><path d="M6 4v6a6 6 0 0 0 6 6h6M14 12l4 4-4 4" fill="none" stroke="#1d1b18" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const LED = { newbie: 'newbie', checkin: 'checkin', ticket: 'ticket', win: 'win', online: 'win', firstwin: 'star', broke1: 'relief', relief: 'relief', feedback: 'feedback', badge: 'star', penalty: 'ticket', merge: 'merge', merged: 'merge', opened: 'merge' };
  const LED_NAME = { newbie: '新手礼包', checkin: '签到', ticket: '门票', win: '名次奖励', online: '联机奖励', firstwin: '今日首胜', broke1: '第一次亏空', relief: '救济', feedback: '这步不对', badge: '徽章奖励', penalty: '中途离开', merge: '游客小鱼干并入', merged: '并入账号', opened: '账号钱包' };
  // 徽章（规则在后端 lib/zhamao-econ.js BADGES，服务器判断、拿到时自动发奖励）：怎么拿 + 图
  const BADGE_ART = {
    streak7: ['连续签到 7 天', '#3f7a52', '<path d="M32 12l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z"/>'],
    bug10: ['「这步不对」标满 10 步', '#2f4a6d', '<ellipse cx="32" cy="36" rx="10" ry="13"/><path d="M32 23v26M22 30l-7-4M42 30l7-4M22 40l-7 3M42 40l7 3M27 20l-4-6M37 20l4-6" stroke="#fffdf8" stroke-width="3" fill="none" stroke-linecap="round"/>'],
    games100: ['打满 100 局', '#8e4a9c', '<text x="32" y="41" text-anchor="middle" font-size="20" font-weight="700" font-family="Georgia,serif" fill="#fffdf8">100</text>'],
    hard10: ['对高手机器猫拿 10 次第一', '#c8463a', '<path d="M18 44l3-22 8 9 3-12 3 12 8-9 3 22Z"/>'],
    nine1: ['9 人局拿第一（组队算队伍赢）', '#e58e46', '<text x="32" y="43" text-anchor="middle" font-size="24" font-weight="700" font-family="Georgia,serif" fill="#fffdf8">9</text>'],
    big1000: ['一局净赚 1,000 以上', '#b07420', '<path d="M14 32c6-9 17-12 26-9 4 1 7 4 9 9-2 5-5 8-9 9-9 3-20 0-26-9Z M47 32l8-7v14Z" fill="#fffdf8"/>'],
  };
  const badgeSvg = (id) => { const a = BADGE_ART[id] || ['', '#999', '']; return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="' + a[1] + '" stroke="#1d1b18" stroke-width="2.5"/><g fill="#fffdf8">' + a[2] + '</g></svg>'; };

  function myFace() {
    let p = null; try { p = JSON.parse(localStorage.getItem('zm.profile.v1')); } catch (_) { /* */ }
    const u = root.SiteAuth && root.SiteAuth.getUser ? root.SiteAuth.getUser() : null;
    const nick = (p && p.nick) || (u && u.nick) || '我';
    const av = AV();
    const svg = p && p.avatar && av && av.byId[p.avatar] ? av.byId[p.avatar].svg : '';
    return { nick, face: svg || esc(nick.slice(0, 1)) };
  }
  function ring(w, g, color) {
    const r = 30, c = 2 * Math.PI * r, k = g ? w / g : 0;
    return '<svg viewBox="0 0 80 80" role="img" aria-label="胜率 ' + Math.round(k * 100) + '%"><circle cx="40" cy="40" r="' + r + '" fill="none" stroke="#ebe5d8" stroke-width="10"/>' +
      (g ? '<circle cx="40" cy="40" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * k).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 40 40)"/>' : '') +
      '<text x="40" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="700" fill="#1d1b18">' + (g ? Math.round(k * 100) + '%' : '–') + '</text></svg>';
  }
  // 近四周活跃：28 格，最左是 27 天前，最右是今天
  function actHtml(heat) {
    const now = new Date(Date.now() + 8 * 3600e3), day0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    let out = '';
    for (let i = 27; i >= 0; i--) {
      const d = new Date(day0 - i * 86400e3).toISOString().slice(0, 10), n = heat[d] || 0;
      out += '<i class="' + (n >= 12 ? 'l4' : n >= 6 ? 'l3' : n >= 3 ? 'l2' : n ? 'l1' : '') + '"></i>';
    }
    return out;
  }
  // 流水标题旁的余额走势细线（老到新）
  function sparkSvg(ledger, W0, H) {
    const pts = ledger.slice().reverse().map((x) => Number(x.bal) || 0);
    if (pts.length < 2) return '';
    const max = Math.max(...pts, 1), min = Math.min(...pts), pad = 3, w = W0 - pad * 2, h = H - pad * 2;
    const X = (i) => pad + (i / (pts.length - 1)) * w, Y = (v) => pad + h - ((v - min) / (max - min || 1)) * h;
    const line = pts.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
    return '<svg viewBox="0 0 ' + W0 + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + line + '" fill="none" stroke="#1d1b18" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="' + X(pts.length - 1).toFixed(1) + '" cy="' + Y(pts[pts.length - 1]).toFixed(1) + '" r="3.5" fill="#b4392c"/></svg>';
  }

  function html(p) {
    const me = myFace(), FISH = W().FISH, cyc = p.checkin.cycle;
    const k0 = p.checkin.today ? p.checkin.streak - 1 : p.checkin.streak, round0 = k0 - (((k0 % 7) + 7) % 7);
    const week = cyc.map((amt, i) => {
      const n = round0 + i, done = n < p.checkin.streak, now = !p.checkin.today && n === p.checkin.streak;
      return '<button type="button" class="zmp-day' + (done ? ' is-done' : '') + (now ? ' is-now' : '') + (i === 6 ? ' is-big' : '') + '"' + (now ? ' data-ck' : ' disabled') + ' aria-label="第 ' + (i + 1) + ' 天 ' + amt + '">' + FISH + amt + '</button>';
    }).join('');
    const wk = p.records.filter((r) => Date.now() - r.at < 7 * 86400e3).reduce((a, r) => a + (r.d || 0), 0);
    const recs = p.records.slice(0, 20).map((r) => {
      const rk = r.mode === 'team' ? (r.won ? '<span class="rk g1">' + CROWN + '</span>' : '<span class="rk">–</span>') : '<span class="rk' + (r.rank <= 3 ? ' g' + r.rank : '') + '">' + r.rank + '</span>';
      return '<div class="zmp-rec"><i class="m" style="background:' + (MODE_C[r.mode] || '#999') + '"></i>' + rk + '<span class="d ' + (r.d > 0 ? 'up' : r.d < 0 ? 'dn' : '') + '">' + sign(r.d) + '</span><span class="nn">' + r.n + (r.src === 'online' ? ' · 联' : '') + '</span></div>';
    }).join('');
    const led = p.ledger.map((x) => '<li><span class="ic">' + (IC[LED[x.why]] || IC.ticket) + '</span><span>' + (LED_NAME[x.why] || esc(x.why)) + '</span><time>' + new Date(x.at).toLocaleDateString() + '</time><b class="' + (x.d > 0 ? 'up' : x.d < 0 ? 'dn' : '') + '">' + sign(x.d) + '</b></li>').join('');
    const badges = (p.badgeList || []).map((b) => '<button type="button" class="' + (b.got ? '' : 'off') + '" data-badge="' + b.id + '" aria-label="' + esc(b.name) + '">' + badgeSvg(b.id) + '</button>').join('');
    return '<div class="zmp-in">' +
      '<div class="zmp-card zmp-hero2"><div class="zmp-av">' + me.face + '</div><div><div class="zmp-nick">' + esc(me.nick) + '</div><div class="zmp-who">' +
        (p.owner === 'account' ? '<span class="ok">' + TICK + '</span>已登录' : '<button type="button" class="zmp-login" data-login>登录</button>') + '</div>' +
        '<div class="zmp-bdg">' + badges + '</div></div>' +
        '<div class="zmp-bal"><span class="n">' + FISH + '<b data-num>' + fmt(p.bal) + '</b></span><div class="sub"><span class="' + (wk >= 0 ? 'up' : 'dn') + '">本周 ' + sign(wk) + '</span><span>' + (p.games || 0) + ' 局</span></div></div></div>' +
      '<div class="zmp-grid">' +
        '<div class="zmp-card wide"><div class="zmp-h">签到<small>连签 ' + p.checkin.streak + ' 天</small></div><div class="zmp-week">' + week + '</div><div class="zmp-act" aria-label="近四周活跃">' + actHtml(p.heat) + '</div></div>' +
        '<div class="zmp-card wide"><div class="zmp-h">玩法胜率</div><div class="zmp-rings">' + MODES.map(([k, name, c]) => '<div class="zmp-ring">' + ring(p.modes[k].w, p.modes[k].g, c) + '<b>' + name + '</b><small>' + p.modes[k].g + ' 局</small></div>').join('') + '</div></div>' +
        '<div class="zmp-card wide"><div class="zmp-h">最近对局</div>' + (recs ? '<div class="zmp-recs">' + recs + '</div><div class="zmp-legend">' + MODES.map(([, name, c]) => '<span><i style="background:' + c + '"></i>' + name + '</span>').join('') + '</div>' : '<div class="zmp-empty">还没打过</div>') + '</div>' +
      '</div>' +
      (led ? '<details class="zmp-card"><summary class="zmp-ledsum"><span>流水</span><span class="sp" data-spark></span></summary><ul class="zmp-led">' + led + '</ul></details>' : '') + '</div>';
  }
  // 点徽章：小卡（怎么拿、进度、奖励）。点哪儿都收起
  function badgeCard(b) {
    const m = document.createElement('div');
    m.className = 'zmp-bmask';
    const pct = Math.round((Math.min(b.progress, b.goal) / b.goal) * 100);
    m.innerHTML = '<div class="zmp-bcard' + (b.got ? '' : ' off') + '" role="dialog" aria-label="' + esc(b.name) + '"><div class="big">' + badgeSvg(b.id) + '</div><h3>' + esc(b.name) + '</h3><div class="how">' + esc((BADGE_ART[b.id] || [''])[0]) + '</div>' +
      (b.goal > 1 ? '<div class="pg"><i style="width:' + pct + '%"></i></div><div class="pn">' + fmt(b.progress) + ' / ' + fmt(b.goal) + '</div>' : '') +
      '<div class="rw' + (b.got ? ' got' : '') + '">' + W().FISH + '+' + fmt(b.reward) + (b.got ? ' ' + TICK.replace('#fff', '#3f7a52') : '') + '</div></div>';
    m.addEventListener('click', () => m.remove());
    el.appendChild(m);
  }

  // ── 面板 ──
  let el = null, body = null, spark = null, last = null;
  function build() {
    if (el) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('section');
    el.className = 'zmp'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '猫咪档案');
    el.innerHTML = '<div class="zmp-top"><button type="button" class="zmp-x" aria-label="返回">' + BACK + '</button><h2>猫咪档案</h2></div><div class="zmp-body"></div>';
    document.body.appendChild(el);
    body = el.querySelector('.zmp-body');
    el.querySelector('.zmp-x').addEventListener('click', close);
    body.addEventListener('click', (e) => {
      const bd = e.target.closest('[data-badge]');
      if (bd && last) { const b = (last.badgeList || []).find((x) => x.id === bd.dataset.badge); if (b) badgeCard(b); return; }
      const ck = e.target.closest('[data-ck]');
      if (ck) { checkinNow(ck); return; }
      if (e.target.closest('[data-login]')) login();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen() && !document.querySelector('#sa-overlay.open')) close(); });
    if (root.SiteAuth && root.SiteAuth.onChange) root.SiteAuth.onChange(() => { if (isOpen()) load(); });
  }
  const isOpen = () => !!(el && !el.hidden);
  function load() {
    if (!W()) return;
    W().profile().then((p) => {
      last = p;
      body.innerHTML = html(p);
      // 打开档案就算看过了：拿到的徽章不再让左上角亮小黄点
      if (W().markBadgesSeen) W().markBadgesSeen((p.badgeList || []).filter((b) => b.got).map((b) => b.id));
      spark = body.querySelector('[data-spark]');
      const draw = () => { if (spark && spark.isConnected) spark.innerHTML = sparkSvg(p.ledger, Math.max(60, spark.clientWidth), spark.clientHeight || 28); };
      if (spark) { draw(); if (root.ResizeObserver) new ResizeObserver(draw).observe(spark); }
    }).catch(() => { body.innerHTML = '<div class="zmp-in zmp-card zmp-empty">连不上服务器，稍后再试</div>'; });
  }
  /* 签到（2026-11-22 用户：点了要马上有反应，鱼要飞进档案里的余额，不是飞去后面的左上角）：
   * 点下去这格当场变成「已签」，连签数 +1，余额从格子里游出几条鱼进到上面的大数字、数字滚上去；同时发给服务器，
   * 服务器回来且动画放完再按服务器的数据重摆一遍；失败就按服务器的样子摆回去 */
  function checkinNow(ck) {
    if (!last || ck.dataset.busy) return;
    ck.dataset.busy = '1';
    ck.disabled = true;
    const amt = Number(ck.getAttribute('aria-label').split(' ').pop()) || 0, from = last.bal, to = from + amt;
    ck.classList.remove('is-now'); ck.classList.add('is-done');
    const sk = body.querySelector('.zmp-h small'); if (sk) sk.textContent = '连签 ' + (last.checkin.streak + 1) + ' 天';
    const num = body.querySelector('[data-num]'), fx = root.ZhamaoWalletFx;
    let anim;
    if (fx && W().fxOn && W().fxOn()) anim = fx.school(W().FISH, ck, num.parentNode, Math.min(4, 2 + Math.round(amt / 100)), { spread: 16, gap: 90, dur: 700, lift: -50, size: 26, onLand: () => fx.roll(num, from, to, 520) });
    else if (fx) anim = fx.roll(num, from, to, 420);
    else { num.textContent = fmt(to); anim = Promise.resolve(); }
    last.bal = to;
    W().checkin().then(() => anim).then(() => setTimeout(load, 350)).catch(() => load());
  }
  function login() {
    if (root.SiteAuth && root.SiteAuth.openLogin) root.SiteAuth.openLogin();
  }
  function open() {
    build();
    if (root.ZhamaoWalletFx) root.ZhamaoWalletFx.cancelAll();   // 左上角还在放的进账动画收掉（档案盖上来了）
    body.innerHTML = '<div class="zmp-wait"></div>';
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-on')));
    load();
  }
  function hide() {
    if (!el || el.hidden) return;
    if (root.ZhamaoWalletFx) root.ZhamaoWalletFx.cancelAll();
    el.classList.remove('is-on');
    const done = () => { el.hidden = true; };
    const bm = el.querySelector('.zmp-bmask'); if (bm) bm.remove();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 320);
    if (W()) W().me();
  }
  function close() { hide(); }

  root.ZhamaoProfile = { open, close, login, isOpen };
})(window);
