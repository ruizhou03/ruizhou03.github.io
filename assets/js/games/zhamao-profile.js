/* 百变小咪 · 猫咪档案（window.ZhamaoProfile，2026-11-22）
 * 用户：档案要内嵌在游戏里，不能跳到网站的个人页（像进了另一个系统）。所以这是游戏页里的一层面板：
 * 从右边滑进来盖住游戏，左上角折号退回。⚠️ 不碰浏览器历史（不 pushState、不跳页）：微信 / iOS 浏览器一有历史记录，
 * 屏幕最下面就会冒出一条前进后退的左右箭头条（2026-11-22 用户：很丑）。
 * 内容（2026-11-22 用户挑定第二轮「甲」四块）：头像 + 一排徽章（点开看怎么拿、进度、奖励）+ 余额；签到七格 + 近四周活跃；玩法胜率环（2026-11-23 用户：「最近对局」拿掉，只留看得出东西的图）；
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

  const CSS = `
.zmp-ring svg{max-width:80px}
.zmp{position:fixed;inset:0;z-index:70;background:#f3eee3;color:#1d1b18;display:flex;flex-direction:column;font-family:ZM Serif,'Songti SC','STSong','Noto Serif SC','Noto Serif CJK SC','Source Han Serif SC','PingFang SC',serif;-webkit-user-select:none;user-select:none;transform:translateX(100%);transition:transform .32s cubic-bezier(.3,.8,.3,1)}
.zmp.is-on{transform:none}
.zmp[hidden]{display:none}
@media(prefers-reduced-motion:reduce){.zmp{transition:none}}
.zmp *{box-sizing:border-box;min-width:0}
.zmp-top{flex:none;display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top,0px) + 8px) 14px 6px calc(env(safe-area-inset-left,0px) + 8px)}
.zmp-x{width:44px;height:44px;border:0;background:none;padding:0;cursor:pointer;display:grid;place-items:center;border-radius:50%}
.zmp-x svg{width:30px;height:30px}
.zmp-x:active svg{transform:scale(.92)}
.zmp-topr{margin-left:auto;display:flex;align-items:center;gap:8px;padding-right:env(safe-area-inset-right,0px)}
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
.zmp-login{border:1.5px solid #b4392c;color:#b4392c;background:#fffdf8;border-radius:999px;padding:7px 15px;font:700 14px/1 system-ui,sans-serif;cursor:pointer}
.zmp-bal{text-align:right}
.zmp-bal .n b{font:inherit;display:inline-block}
.zmp-bal .n{display:inline-flex;align-items:center;gap:8px;font:900 clamp(30px,8vw,42px)/1 ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-bal .zmw-fish{width:46px;height:29px}
.zmp-bal .sub{display:flex;gap:10px;justify-content:flex-end;margin-top:6px;font:700 13px/1 ZM Num,ZM Serif,Georgia,serif;color:#6a6358}
.zmp-bal .up{color:#3f7a52}.zmp-bal .dn{color:#b4392c}
@media(max-width:480px){.zmp-hero{grid-template-columns:auto minmax(0,1fr)}.zmp-bal{grid-column:1/-1;text-align:left}.zmp-bal .sub{justify-content:flex-start}}
.zmp-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px;font-size:15px;font-weight:700}
.zmp-h small{font:600 12px system-ui,sans-serif;color:#6a6358}
.zmp-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.zmp-day{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0 7px;border:1.5px solid #d9cfbd;border-radius:14px;background:#f3eee3;font:700 13px/1 ZM Num,ZM Serif,Georgia,serif;color:#6a6358;cursor:default}
.zmp-day .zmw-fish{width:26px;height:16px;opacity:.35}
.zmp-day.is-done{background:#1d1b18;border-color:#1d1b18;color:#f3eee3}
.zmp-day.is-done .zmw-fish{opacity:1}
.zmp-day.is-now{border-color:#b4392c;color:#b4392c;background:#fffdf8;cursor:pointer;box-shadow:0 0 0 3px rgba(180,57,44,.18)}
.zmp-day.is-now .zmw-fish{opacity:1}
.zmp-task{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 10px 9px 12px;border:1.5px solid #d9cfbd;border-radius:14px;background:#f3eee3;font:600 14px/1.2 system-ui,"Noto Sans SC",sans-serif;color:#6a6358}
.zmp-task b{display:inline-flex;align-items:center;gap:4px;margin-left:8px;font:700 14px/1 ZM Num,ZM Serif,Georgia,serif;color:#6a6358}
.zmp-task b .zmw-fish{width:22px;height:14px}
.zmp-task.is-ready{border-color:#b4392c;background:#fffdf8;color:#1d1b18;box-shadow:0 0 0 3px rgba(180,57,44,.12)}
.zmp-task.is-ready b{color:#3f7a52}
.zmp-task button{cursor:pointer;flex:none;padding:8px 16px;border-radius:999px;border:1.5px solid #1d1b18;background:#b4392c;color:#fffdf8;font:600 14px/1 system-ui,"Noto Sans SC",sans-serif;box-shadow:0 2px 0 #1d1b18}
.zmp-task button.go{background:#fffdf8;color:#1d1b18}
.zmp-task button:active{transform:translateY(2px);box-shadow:none}
.zmp-task em{font-style:normal;font-size:13px;color:#8a8275}
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
.zmp-ring small{color:#6a6358;font:700 12px ZM Num,ZM Serif,Georgia,serif}
.zmp-bars{display:grid;gap:10px}
.zmp-bar{display:grid;grid-template-columns:3em minmax(0,1fr) 3.2em;gap:8px;align-items:center;font-size:14px}
.zmp-bar .t{height:14px;border-radius:7px;background:#ebe5d8;overflow:hidden}
.zmp-bar .t i{display:block;height:100%;border-radius:7px;background:#1d1b18}
.zmp-bar span:last-child{text-align:right;font:700 14px ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-recs{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:8px}
.zmp-rec{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px 7px;border-radius:14px;background:#f3eee3;border:1.5px solid #d9cfbd}
.zmp-rec .m{position:absolute;top:6px;left:6px;width:8px;height:8px;border-radius:50%}
.zmp-rec .rk{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:700 14px/1 ZM Num,ZM Serif,Georgia,serif;background:#ebe5d8;color:#6a6358}
.zmp-rec .rk.g1{background:#e9c46a;color:#6b4a12}.zmp-rec .rk.g2{background:#cfd3d9;color:#4b5058}.zmp-rec .rk.g3{background:#d9a477;color:#5e3517}
.zmp-rec .rk svg{width:18px;height:18px}
.zmp-rec .d{font:700 13px/1 ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-rec .d.up{color:#3f7a52}.zmp-rec .d.dn{color:#b4392c}
.zmp-rec .nn{font:600 11px/1 system-ui,sans-serif;color:#6a6358}
.zmp-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font:12px system-ui,sans-serif;color:#6a6358}
.zmp-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px}
.zmp details{margin-top:14px}
.zmp summary{cursor:pointer;font-size:15px;font-weight:700;padding:6px 0}
.zmp-led{list-style:none;margin:6px 0 0;padding:0}
.zmp-led li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px dashed #d9cfbd;font-size:14px}
.zmp-led .ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#ebe5d8}
.zmp-led .ic svg{width:15px;height:15px}
.zmp-led time{color:#6a6358;font:12px system-ui,sans-serif;white-space:nowrap}
.zmp-led b{font:700 14px ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;min-width:3.5em}
.zmp-led b.up{color:#3f7a52}.zmp-led b.dn{color:#b4392c}
.zmp-empty{color:#6a6358;font:14px system-ui,sans-serif;text-align:center;padding:12px 0}
.zmp-wait{width:56px;height:8px;margin:40px auto;border-radius:4px;background:linear-gradient(90deg,#ebe5d8,#d9cfbd,#ebe5d8);background-size:200% 100%;animation:zmpWait 1s linear infinite}
@keyframes zmpWait{to{background-position:-200% 0}}
.zmp-act{display:grid;grid-template-columns:repeat(28,minmax(0,1fr));gap:2px;margin-top:8px}
.zmp-act i{position:relative;aspect-ratio:1;border-radius:3px;background:#ebe5d8}
.zmp-act i.ck{background:#1d1b18}
.zmp-act i.now{box-shadow:0 0 0 1.5px #b4392c}
.zmp-lf{display:flex;gap:6px;margin:8px 0 2px}
.zmp-lf button{border:1.5px solid #d9cfbd;background:#f3eee3;color:#6a6358;border-radius:999px;padding:6px 13px;font:600 13px/1 system-ui,sans-serif;cursor:pointer}
.zmp-lf button.on{border-color:#1d1b18;background:#1d1b18;color:#f3eee3}
.zmp-lday{display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 0;padding-bottom:4px;border-bottom:1.5px solid #1d1b18;font:700 13px/1.2 system-ui,sans-serif;color:#1d1b18}
.zmp-lday b{font:700 13px ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums}
.zmp-lday b.up{color:#3f7a52}.zmp-lday b.dn{color:#b4392c}
.zmp-led li.g{cursor:pointer}
.zmp-led .nm small{display:block;margin-top:2px;font:12px/1.2 system-ui,sans-serif;color:#6a6358}
.zmp-led .nm small.warn{color:#b4392c}
.zmp-led li .parts{grid-column:2/-1;display:none;font:12px/1.6 system-ui,sans-serif;color:#6a6358}
.zmp-led li.open .parts{display:block}
.zmp-led li .parts span{display:flex;justify-content:space-between}
.zmp-led li .parts em{font-style:normal}
.zmp-led li .parts b{font:600 12px ZM Num,ZM Serif,Georgia,serif;min-width:0;color:#6a6358}
.zmp-lmore{display:block;width:100%;margin-top:10px;padding:10px;border:1.5px dashed #d9cfbd;border-radius:12px;background:none;color:#6a6358;font:600 14px/1 system-ui,sans-serif;cursor:pointer}
.zmp-ledsum{display:flex;align-items:center;gap:10px}
.zmp-ledsum .sp{flex:1;height:28px;min-width:60px}
.zmp-ledsum .sp svg{width:100%;height:100%;display:block}
.zmp details.zmp-card{margin-top:12px}
.zmp-bmask{position:absolute;inset:0;z-index:2;background:rgba(29,27,24,.28);display:flex;align-items:center;justify-content:center;padding:20px}
.zmp-bcard{width:min(320px,100%);background:#fffdf8;border:1.5px solid #1d1b18;border-radius:18px;box-shadow:0 3px 0 #1d1b18;padding:18px 16px 16px;text-align:center}
.zmp-bcard .big svg{width:120px;height:120px;filter:drop-shadow(0 4px 6px rgba(29,27,24,.18))}
.zmp-bcard h3{margin:4px 0 2px;font-size:21px;letter-spacing:.04em}
.zmp-bcard .how{font:14px/1.4 system-ui,sans-serif;color:#6a6358}
.zmp-bcard .lad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:14px}
.zmp-bcard .lad div{border:1.5px solid #d9cfbd;border-radius:12px;padding:8px 2px 7px;background:#f3eee3;color:#a69c8a;display:flex;flex-direction:column;align-items:center;gap:3px}
.zmp-bcard .lad svg{width:38px;height:38px;display:block}
.zmp-bcard .lad span{font:700 12.5px/1.2 ZM Serif,Georgia,serif}
.zmp-bcard .lad i{display:inline-flex;align-items:center;gap:3px;font:700 12px/1 ZM Num,ZM Serif,Georgia,serif;font-style:normal;color:#6a6358;min-height:16px}
.zmp-bcard .lad i .zmw-fish{width:18px;height:11px}
.zmp-bcard .lad i svg{width:16px;height:16px}
.zmp-bcard .lad .got{background:#fffdf8;border-color:#1d1b18;color:#1d1b18}
.zmp-bcard .lad .now{background:#fffdf8;border-color:#b4392c;color:#1d1b18}
.zmp-bcard .lad .now i{color:#3f7a52}
.zmp-bcard .pg{height:6px;border-radius:3px;background:#ebe5d8;overflow:hidden;margin:12px 6px 4px}
.zmp-bcard .pg i{display:block;height:100%;border-radius:3px}
.zmp-bcard .pn{font:700 13px ZM Num,ZM Serif,Georgia,serif;color:#6a6358}
.zmp-medals{margin-top:12px}
.zmp-h2{margin:16px 0 0;padding-top:12px;border-top:1px dashed #d9cfbd}
.zmp-h2+.zmp-task{margin-top:8px}
.zmp-wall{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 6px;text-align:center}
.zmp-wall button{border:0;background:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;color:#1d1b18;-webkit-tap-highlight-color:transparent}
.zmp-wall svg{width:min(68px,100%);height:auto;aspect-ratio:1;display:block;transition:transform .15s}
.zmp-wall button:active svg{transform:scale(.94)}
.zmp-wall b{font:700 12.5px/1.2 ZM Serif,Georgia,serif;white-space:nowrap}
.zmp-wall .off b{color:#a69c8a}
@media(min-width:621px){.zmp-wall{grid-template-columns:repeat(8,minmax(0,1fr))}}
/* 第一格（2026-11-27 第四版，用户：左半列太空、要想好 8 枚勋章全齐怎么排）：上半「身份」整行——头像在左，右边自上而下 名字 / 勋章（一行排到 8 枚，像一摞硬币微微叠着）/ 余额；
 * 下半虚线隔开，四个玩法胜率环一排。宽屏（≥620）身份在左、四个环在右 */
.zmp-hero3{display:flex;flex-direction:column;gap:14px;background:#f8f4ea}
.zmp-id{display:flex;align-items:center;gap:14px;min-width:0}
.zmp-id .zmp-av{flex:none;width:84px;height:84px;padding:0;border:2px solid #1d1b18;background:#ebe5d8;cursor:pointer;transition:transform .12s;-webkit-tap-highlight-color:transparent}
.zmp-id .zmp-av:active{transform:scale(.95)}
.zmp-id .info{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.zmp-id .zmp-nick{display:inline-flex;align-items:center;gap:5px;max-width:100%;border:0;background:none;padding:0;margin:0;color:inherit;cursor:pointer;white-space:nowrap;font-family:inherit;font-size:20px;font-weight:900;line-height:1.2;-webkit-tap-highlight-color:transparent}
.zmp-id .zmp-nick span{overflow:hidden;text-overflow:ellipsis}
.zmp-id .zmp-nick svg{flex:none;width:14px;height:14px;opacity:.45}
.zmp-tops{display:flex;padding-left:2px}
.zmp-tops button{position:relative;flex:none;width:30px;height:30px;padding:0;margin-left:-6px;border:0;background:#f8f4ea;cursor:pointer;border-radius:50%;box-shadow:0 0 0 2px #f8f4ea;-webkit-tap-highlight-color:transparent}
.zmp-tops button:first-child{margin-left:0}
.zmp-tops svg{width:30px;height:30px;display:block}
.zmp-hero3 .zmp-bal{text-align:left;margin-top:2px}
.zmp-hero3 .zmp-bal .n{font-size:clamp(26px,7.6vw,38px);gap:6px}
.zmp-hero3 .zmp-bal .zmw-fish{width:38px;height:24px}
.zmp-hero3 .zmp-rings{grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding-top:12px;border-top:1px dashed #d9cfbd}
.zmp-hero3 .zmp-ring svg{width:min(66px,100%);max-width:none;display:block;margin:0 auto}
.zmp-hero3 .zmp-ring b{margin-top:3px;font-size:13px;white-space:nowrap}
.zmp-hero3 .zmp-ring b small{margin-left:2px;font-size:10.5px}
@media(max-width:374px){.zmp-id{gap:10px}.zmp-id .zmp-av{width:64px;height:64px}.zmp-id .zmp-nick{font-size:17px}.zmp-tops svg,.zmp-tops button{width:25px;height:25px}.zmp-hero3 .zmp-bal .n{font-size:24px;gap:4px}.zmp-hero3 .zmp-bal .zmw-fish{width:32px;height:20px}.zmp-hero3 .zmp-ring b{font-size:11.5px}.zmp-hero3 .zmp-ring b small{font-size:9.5px;margin-left:1px}}
@media(min-width:620px){.zmp-hero3{flex-direction:row;align-items:center;gap:18px}.zmp-id{flex:1}.zmp-hero3 .zmp-rings{flex:none;grid-template-columns:repeat(4,84px);padding:0 0 0 18px;border-top:0;border-left:1px dashed #d9cfbd}.zmp-hero3 .zmp-ring svg{width:76px}}
.zmp-ed{width:min(360px,100%);background:#fffdf8;border:1.5px solid #1d1b18;border-radius:18px;box-shadow:0 3px 0 #1d1b18;padding:16px}
.zmp-ed .top{display:flex;align-items:center;gap:12px}
.zmp-ed .top .zmp-av{flex:none}
.zmp-ed input{flex:1;min-width:0;height:44px;padding:0 12px;border:1.5px solid #d9cfbd;border-radius:12px;background:#f8f4ea;color:#1d1b18;font:700 18px/1 ZM Serif,'Songti SC',serif;outline:none;-webkit-user-select:text;user-select:text}
.zmp-ed input:focus{border-color:#1d1b18}
.zmp-ed .avs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:14px}
.zmp-ed .avs button{aspect-ratio:1;padding:0;border:2px solid transparent;border-radius:50%;background:none;cursor:pointer;overflow:hidden;-webkit-tap-highlight-color:transparent}
.zmp-ed .avs button svg{width:100%;height:100%;display:block}
.zmp-ed .avs button.on{border-color:#b4392c;box-shadow:0 0 0 2px #fffdf8,0 0 0 4px rgba(180,57,44,.35)}
.zmp-ed .err{margin:10px 0 0;color:#b4392c;font:13px/1.4 system-ui,sans-serif}
.zmp-ed .act{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.zmp-ed .act button{padding:10px 20px;border-radius:999px;border:1.5px solid #1d1b18;background:#fffdf8;color:#1d1b18;font:600 15px/1 system-ui,"Noto Sans SC",sans-serif;cursor:pointer;box-shadow:0 2px 0 #1d1b18}
.zmp-ed .act button.go{background:#b4392c;color:#fffdf8}
.zmp-ed .act button:active{transform:translateY(2px);box-shadow:none}
/* 站点登录弹层（auth.html）在游戏页里没有站点的颜色变量：给它一套游戏的 */
#sa-overlay{--color-bg:#fffdf8;--color-bg-warm:#f3eee3;--color-border:#d9cfbd;--color-muted:#6a6358;--color-light:#8a8274;--color-ink:#1d1b18;--color-text:#1d1b18;--color-highlight:#b4392c;--color-accent:#b4392c;--font-display:ZM Serif,'Songti SC','Noto Serif SC',serif;font-family:system-ui,-apple-system,'PingFang SC',sans-serif}
`;
  const BACK = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24.5 6.5 13 20l11.5 13.5" fill="none" stroke="#b4392c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PEN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.6 2.6l2.8 2.8-7.7 7.7-3.4.6.6-3.4z" fill="none" stroke="#1d1b18" stroke-width="1.5" stroke-linejoin="round"/></svg>';
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
  const LED = { newbie: 'newbie', checkin: 'checkin', ticket: 'ticket', win: 'win', online: 'win', firstwin: 'star', broke1: 'relief', relief: 'relief', feedback: 'feedback', badge: 'star', penalty: 'ticket', refund: 'ticket', merge: 'merge', merged: 'merge', opened: 'merge' };
  const LED_NAME = { newbie: '新手礼包', checkin: '签到', ticket: '门票', win: '名次结算', online: '联机结算', firstwin: '今日首胜', broke1: '第一次亏空', relief: '救济', feedback: '这步不对', badge: '徽章奖励', penalty: '中途离开', refund: '门票退回', merge: '游客小鱼干并入', merged: '并入账号', opened: '账号钱包' };
  // 勋章（规则在后端 lib/zhamao-econ.js BADGES，服务器判断、拿到时自动发奖励）。2026-11-26 改版：8 个系列 × 铜银金，图和名字在 zhamao-medals.js
  const MD = () => root.ZhamaoMedals;
  const badgeSvg = (id) => (MD() ? MD().of(id) : '');
  const badgeHow = (id) => { const m = MD() && MD().meta(id); return m ? m.how : ''; };
  // 服务器给的 badgeList（每档一条：id / got / progress / goal / reward）→ 按系列：拿到的最高档、朝下一档的进度
  function seriesState(list) {
    const by = {}; (list || []).forEach((b) => { by[b.id] = b; });
    return (MD() ? MD().SERIES : []).map(([sid, sname, tiers]) => {
      let tier = 0;
      tiers.forEach(([id], i) => { if (by[id] && by[id].got) tier = i + 1; });
      const nx = tier < 3 ? tiers[tier] : null, nb = nx ? by[nx[0]] : null;
      const goal = nb ? nb.goal || nx[3] : 0, prog = nb ? Math.min(nb.progress || 0, goal) : 0;
      return { sid, sname, tier, tiers: tiers.map(([id, name, how, g, rw]) => ({ id, name, how, goal: (by[id] && by[id].goal) || g, reward: (by[id] && by[id].reward) || rw, got: !!(by[id] && by[id].got) })), prog, goal, k: goal ? prog / goal : 1 };
    });
  }
  const medal = (st) => (MD() ? MD().svg(st.sid, st.tier, st.tier < 3 ? { prog: st.k } : null) : '');

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
      '<text x="40" y="45" text-anchor="middle" font-family="ZM Num,ZM Serif,Georgia,serif" font-size="16" font-weight="700" fill="#1d1b18">' + (g ? Math.round(k * 100) + '%' : '–') + '</text></svg>';
  }
  /* 近四周（2026-11-24 用户：签了三天，底下格子只亮一个——以前这排是「每天打了几局」，看着像签到）：
   * 28 格 = 28 天（当地日期，最右是今天），签到过的那天涂黑。只表示签到（用户：标对局很 misleading，红点和图例都拿掉） */
  const localToday = () => W().today();   // 凌晨 4 点换日（2026-11-26 用户）
  function actHtml(p) {
    const ck = new Set(p.ckDays || []), day0 = Date.parse((p.today || localToday()) + 'T00:00:00Z');
    let out = '';
    for (let i = 27; i >= 0; i--) {
      const d = new Date(day0 - i * 86400e3).toISOString().slice(0, 10);
      out += '<i class="' + (ck.has(d) ? 'ck' : '') + (i === 0 ? ' now' : '') + '" title="' + d.slice(5).replace('-', '/') + (ck.has(d) ? ' 签到' : '') + '"></i>';
    }
    return out;
  }

  /* ── 流水（2026-11-24 用户：点开一股脑全列出来不理性）──
   * 按天分组（标题右边是当天净变化）；一局的门票 / 名次奖励 / 首胜 / 离开罚票合成一行（点开看明细）；先列 20 行，「更多」每次再加 20 行，
   * 本机拿到的不够了再向服务器要下一页；上面三个筛选：全部 / 对局 / 福利 */
  const TIER_NAME = { easy: '入门', normal: '普通', hard: '高手' };
  const MODE_NAME = { classic: '经典', flux: '百变', roles: '角色', team: '组队' };
  const GAME_WHY = new Set(['ticket', 'win', 'online', 'penalty']);
  function ledItems(ledger) {
    const items = [], byG = new Map(), open = [];   // open：老流水没有对局号，按「门票之后第一笔同玩法同人数同档位的结果」配对
    const sig = (x) => (x.mode || '') + '|' + (x.n || '') + '|' + (x.tier || '');
    const asc = ledger.slice().sort((a, b) => (a.at || 0) - (b.at || 0));
    let lastGame = null;
    for (const x of asc) {
      let it = null;
      if (x.g && byG.has(x.g)) it = byG.get(x.g);
      else if (x.why === 'ticket' || (x.g && GAME_WHY.has(x.why))) { it = { game: true, parts: [] }; if (x.g) byG.set(x.g, it); else open.push(it); items.push(it); }
      else if (!x.g && (x.why === 'win' || x.why === 'online')) { const k = open.findIndex((o) => sig(o.parts[0]) === sig(x)); if (k >= 0) { it = open[k]; open.splice(k, 1); } }
      else if (!x.g && x.why === 'firstwin' && lastGame && Math.abs((x.at || 0) - (lastGame.at || 0)) < 10000) it = lastGame;
      else if (!x.g && x.why === 'penalty') it = items.slice().reverse().find((o) => o.game && o.parts[0] && o.parts[0].mode === x.mode && o.parts[0].n === x.n) || null;
      if (!it) { items.push({ game: false, parts: [x], at: x.at }); continue; }
      it.parts.push(x); it.at = x.at;
      if (x.why === 'win' || x.why === 'online') { it.res = x; lastGame = it; }
    }
    for (const it of items) { it.d = it.parts.reduce((a, x) => a + (Number(x.d) || 0), 0); if (it.game) it.head = it.parts.find((x) => x.why === 'ticket') || it.parts[0]; }
    return items.sort((a, b) => (b.at || 0) - (a.at || 0));
  }
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function dayTitle(k) {
    if (k === localToday()) return '今天';
    if (k === dayKey(Date.now() - 86400e3)) return '昨天';
    const d = new Date(k + 'T12:00:00');
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + '日一二三四五六'[d.getDay()];
  }
  function gameLine(it) {
    const h = it.head || {}, r = it.res;
    const name = (MODE_NAME[h.mode] || '对局') + (h.n ? ' · ' + h.n + ' 人' : '') + (TIER_NAME[h.tier] ? ' · ' + TIER_NAME[h.tier] : '') + (h.src === 'online' ? ' · 联机' : '');
    let sub = '', warn = false;
    if (!r) { sub = it.parts.some((x) => x.why === 'penalty') ? '中途离开' : '没打完，门票不退'; warn = true; }
    else {
      sub = r.left ? '中途离开' : h.mode === 'team' || r.rank == null ? (r.won ? '赢了' : '输了') : '第 ' + r.rank + ' 名';
      if (r.auto > 0.7) { sub += ' · 托管七成以上，不发奖'; warn = true; } else if (r.auto > 0.3) { sub += ' · 托管三成以上，奖励减半'; warn = true; }
    }
    const NAMES = { ticket: '门票', win: '名次结算', online: '名次结算', firstwin: '今日首胜', penalty: '中途离开罚票' };
    const parts = it.parts.filter((x) => x.d || x.why === 'ticket').map((x) => '<span><em>' + (NAMES[x.why] || LED_NAME[x.why] || esc(x.why)) + '</em><b>' + sign(x.d) + '</b></span>').join('');
    return '<li class="g" data-lg><span class="ic">' + (r && r.won ? IC.win : IC.ticket) + '</span><span class="nm">' + name + '<small' + (warn ? ' class="warn"' : '') + '>' + sub + '</small></span><b class="' + (it.d > 0 ? 'up' : it.d < 0 ? 'dn' : '') + '">' + sign(it.d) + '</b><div class="parts">' + parts + '</div></li>';
  }
  function oneLine(x) {
    const extra = x.why === 'checkin' && x.day ? '连签第 ' + x.day + ' 天' : x.why === 'badge' && x.badge && badgeHow(x.badge) ? (MD().meta(x.badge).name + ' · ' + badgeHow(x.badge)) : x.why === 'feedback' && x.steps ? x.steps + ' 步' : '';
    return '<li><span class="ic">' + (IC[LED[x.why]] || IC.ticket) + '</span><span class="nm">' + (LED_NAME[x.why] || esc(x.why)) + (extra ? '<small>' + esc(extra) + '</small>' : '') + '</span><b class="' + (x.d > 0 ? 'up' : x.d < 0 ? 'dn' : '') + '">' + sign(x.d) + '</b></li>';
  }
  const LED_STEP = 20;
  let led = { all: [], more: false, filter: 'all', show: LED_STEP, busy: false, open: false };
  const ledList = () => ledItems(led.all).filter((it) => led.filter === 'all' || (led.filter === 'game') === it.game);
  function ledHtml() {
    const items = ledList(), shown = items.slice(0, led.show), days = new Map();
    for (const it of items) { const k = dayKey(it.at); days.set(k, (days.get(k) || 0) + it.d); }
    let out = '', cur = '';
    for (const it of shown) {
      const k = dayKey(it.at);
      if (k !== cur) { if (cur) out += '</ul>'; cur = k; const n = days.get(k); out += '<div class="zmp-lday">' + dayTitle(k) + '<b class="' + (n > 0 ? 'up' : n < 0 ? 'dn' : '') + '">' + sign(n) + '</b></div><ul class="zmp-led">'; }
      out += it.game ? gameLine(it) : oneLine(it.parts[0]);
    }
    if (cur) out += '</ul>';
    if (!shown.length) out = '<div class="zmp-empty">' + (led.filter === 'game' ? '还没有对局' : led.filter === 'perk' ? '还没有福利' : '还没有流水') + '</div>';
    const canMore = items.length > led.show || led.more;
    const chip = (k, t) => '<button type="button" data-lf="' + k + '"' + (led.filter === k ? ' class="on"' : '') + '>' + t + '</button>';
    return '<div class="zmp-lf">' + chip('all', '全部') + chip('game', '对局') + chip('perk', '福利') + '</div>' + out +
      (canMore ? '<button type="button" class="zmp-lmore" data-lmore>' + (led.busy ? '…' : '更多') + '</button>' : '');
  }
  function paintLed() { const box = body && body.querySelector('[data-led]'); if (box) box.innerHTML = ledHtml(); }
  function moreLed() {
    led.show += LED_STEP;
    if (ledList().length >= led.show || !led.more || led.busy || !W().ledger) { paintLed(); return; }
    led.busy = true; paintLed();
    W().ledger(led.all.length).then((r) => {
      const seen = new Set(led.all.map((x) => x.at + x.why + x.d));
      led.all = led.all.concat((r.ledger || []).filter((x) => !seen.has(x.at + x.why + x.d)));
      led.more = !!r.more;
    }).catch(() => { /* 连不上：先这样 */ }).then(() => { led.busy = false; paintLed(); });
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
    const hasLed = !!(p.ledger && p.ledger.length);
    // 名字下面：拿到的最高几枚（档高的在前，最多 4 枚）；下面单独一张「勋章」卡放全部系列
    const ss = seriesState(p.badgeList), nGot = (p.badgeList || []).filter((b) => b.got).length;
    const wall = ss.length ? '<div class="zmp-card zmp-medals"><div class="zmp-h">勋章<small>' + nGot + ' / ' + MD().total + '</small></div><div class="zmp-wall">' +
      ss.map((x) => '<button type="button" data-ser="' + x.sid + '"' + (x.tier ? '' : ' class="off"') + '>' + medal(x) + '<b>' + esc(x.tier ? x.tiers[x.tier - 1].name : x.sname) + '</b></button>').join('') + '</div></div>' : '';
    // 第一格（2026-11-27 用户）：已登录不再挂绿勾（没登录才有「登录保存」）；名字下放每个系列拿到的最高档（档高在前，最多 8 枚一行）；
    // 玩法胜率并进这一格（排法见 CSS .zmp-hero3）；点头像 / 名字改名换头像
    const tops = ss.filter((x) => x.tier).sort((x, y) => y.tier - x.tier).map((x) => '<button type="button" data-ser="' + x.sid + '" aria-label="' + esc(x.tiers[x.tier - 1].name) + '">' + MD().svg(x.sid, x.tier) + '</button>').join('');
    const rings = '<div class="zmp-rings">' + MODES.map(([k, name, c]) => '<div class="zmp-ring">' + ring(p.modes[k].w, p.modes[k].g, c) + '<b>' + name + '<small>' + p.modes[k].g + '局</small></b></div>').join('') + '</div>';
    return '<div class="zmp-in">' +
      '<div class="zmp-card zmp-hero3"><div class="zmp-id"><button type="button" class="zmp-av" data-edit aria-label="改头像">' + me.face + '</button><div class="info">' +
        '<button type="button" class="zmp-nick" data-edit aria-label="改名字"><span>' + esc(me.nick) + '</span>' + PEN + '</button>' +
        (tops ? '<div class="zmp-tops">' + tops + '</div>' : '') +
        '<div class="zmp-bal"><span class="n">' + FISH + '<b data-num>' + fmt(p.bal) + '</b></span></div>' +   // 2026-11-26 用户：余额旁边不要「近 7 天对局」和「多少局」
        (p.owner === 'account' ? '' : '<button type="button" class="zmp-login" data-login>登录保存</button>') +
        '</div></div>' + rings + '</div>' +
      wall +
      '<div class="zmp-grid">' +
        '<div class="zmp-card wide"><div class="zmp-h">签到<small>连签 ' + p.checkin.streak + ' 天</small></div><div class="zmp-week">' + week + '</div><div class="zmp-act" aria-label="近四周签到">' + actHtml(p) + '</div>' +
          (p.firstWin ? '<div class="zmp-h zmp-h2">今日任务</div>' + fwHtml(p) : '') + '</div>' +   // 2026-11-27 用户：任务不算签到，下面单起小标题；28 格挪到七格正下方
      '</div>' +
      (hasLed ? '<details class="zmp-card"' + (led.open ? ' open' : '') + '><summary class="zmp-ledsum"><span>流水</span><span class="sp" data-spark></span></summary><div data-led>' + ledHtml() + '</div></details>' : '') + '</div>';
  }
  // 点勋章：小卡——当前这档的大图、名字；铜银金三格（拿到的亮、正在冲的描红）；朝下一档的进度和奖励。点哪儿都收起
  function badgeCard(sid) {
    const x = seriesState(last && last.badgeList).find((y) => y.sid === sid);
    if (!x) return;
    const cur = x.tier ? x.tiers[x.tier - 1] : null, nx = x.tier < 3 ? x.tiers[x.tier] : null, FISH = W().FISH;
    const m = document.createElement('div');
    m.className = 'zmp-bmask';
    const lad = x.tiers.map((t, i) => '<div class="' + (t.got ? 'got' : i === x.tier ? 'now' : '') + '">' + MD().svg(x.sid, t.got ? i + 1 : 0) + '<span>' + esc(t.name) + '</span><i>' + (t.got ? TICK.replace('#fff', '#3f7a52') : FISH + fmt(t.reward)) + '</i></div>').join('');
    m.innerHTML = '<div class="zmp-bcard" role="dialog" aria-label="' + esc(cur ? cur.name : x.sname) + '"><div class="big">' + medal(x) + '</div><h3>' + esc(cur ? cur.name : x.sname) + '</h3><div class="how">' + esc((cur || nx).how) + '</div>' +
      '<div class="lad">' + lad + '</div>' +
      (nx && nx.goal > 1 ? '<div class="pg"><i style="width:' + Math.round(x.k * 100) + '%;background:' + MD().METAL[x.tier + 1][1] + '"></i></div><div class="pn">' + fmt(x.prog) + ' / ' + fmt(nx.goal) + '</div>' : '') + '</div>';
    m.addEventListener('click', () => m.remove());
    el.appendChild(m);
  }

  /* 点自己的头像 / 名字（2026-11-27 用户）：就地弹一张小卡改名换头像，存的路子和牌桌菜单「修改昵称/头像」同一个（ZhamaoTable.setProfile） */
  function editMe() {
    const T = root.ZhamaoTable, av = AV();
    if (!T || !T.setProfile || !av || !av.HUMAN) return;
    const cur = T.profile ? T.profile() : null;
    let pick = (cur && cur.avatar) || 'cat';
    const m = document.createElement('div');
    m.className = 'zmp-bmask';
    const face = (id) => (av.byId[id] ? av.byId[id].svg : '');
    m.innerHTML = '<div class="zmp-ed" role="dialog" aria-label="改名字和头像"><div class="top"><span class="zmp-av" data-face>' + face(pick) + '</span>' +
      '<input data-nick maxlength="12" autocomplete="nickname" aria-label="名字" placeholder="删空就随机起一个" value="' + esc(cur ? cur.nick : myFace().nick) + '"></div>' +
      '<div class="avs" role="group" aria-label="头像">' + av.HUMAN.map((a) => '<button type="button" data-av="' + a.id + '" aria-label="' + esc(a.name) + '"' + (a.id === pick ? ' class="on"' : '') + '>' + a.svg + '</button>').join('') + '</div>' +
      '<p class="err" data-err hidden></p><div class="act"><button type="button" data-no>取消</button><button type="button" class="go" data-ok>保存</button></div></div>';
    const card = m.firstChild, inp = card.querySelector('[data-nick]'), err = card.querySelector('[data-err]');
    const shut = () => m.remove();
    m.addEventListener('click', (e) => {
      if (!card.contains(e.target)) { shut(); return; }
      const b = e.target.closest('[data-av]');
      if (b) { pick = b.dataset.av; card.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('on', x === b)); card.querySelector('[data-face]').innerHTML = face(pick); return; }
      if (e.target.closest('[data-no]')) { shut(); return; }
      if (e.target.closest('[data-ok]')) {
        const bad = T.setProfile(inp.value, pick);
        if (bad) { err.textContent = bad; err.hidden = false; inp.focus(); return; }
        shut();
        const me = myFace(), h = body && body.querySelector('.zmp-id');
        if (h) { h.querySelector('.zmp-av').innerHTML = me.face; h.querySelector('.zmp-nick span').textContent = me.nick; }
      }
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') card.querySelector('[data-ok]').click(); });
    el.appendChild(m);
  }

  // ── 面板 ──
  let el = null, body = null, spark = null, last = null, lastKey = '';
  function build() {
    if (el) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('section');
    el.className = 'zmp'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '猫咪档案');
    el.innerHTML = '<div class="zmp-top"><button type="button" class="zmp-x" aria-label="返回">' + BACK + '</button><h2>猫咪档案</h2><span class="zmp-topr" data-topr></span></div><div class="zmp-body"></div>';
    document.body.appendChild(el);
    body = el.querySelector('.zmp-body');
    el.querySelector('.zmp-x').addEventListener('click', close);
    body.addEventListener('click', (e) => {
      const bd = e.target.closest('[data-ser]');
      if (bd && last) { badgeCard(bd.dataset.ser); return; }
      const lf = e.target.closest('[data-lf]');
      if (lf) { led.filter = lf.dataset.lf; led.show = LED_STEP; paintLed(); return; }
      if (e.target.closest('[data-lmore]')) { moreLed(); return; }
      const lg = e.target.closest('[data-lg]');
      if (lg) { lg.classList.toggle('open'); return; }
      const fwb = e.target.closest('[data-fw]');
      if (fwb) { claimFw(fwb); return; }
      const ck = e.target.closest('[data-ck]');
      if (ck) { checkinNow(ck); return; }
      if (e.target.closest('[data-login]')) { login(); return; }
      if (e.target.closest('[data-edit]')) { editMe(); return; }
      if (e.target.closest('[data-go]')) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !isOpen() || document.querySelector('#sa-overlay.open')) return; const bm = el.querySelector('.zmp-bmask'); if (bm) bm.remove(); else close(); });
    // 登录 / 登出（2026-11-26 事故：在档案里点「登录保存」，档案先摆了一份 6,000、流水全空的，像账号被清空）：
    // 换了身份就先收掉旧那份、转圈，等钱包那边并完游客钱包再拉档案
    let was = W() && W().who ? W().who() : '';
    if (root.SiteAuth && root.SiteAuth.onChange) root.SiteAuth.onChange(() => {
      const now = W() && W().who ? W().who() : '';
      const changed = now !== was; was = now;
      if (!isOpen()) return;
      if (!changed) { load(true); return; }
      last = null; led = { all: [], more: false, filter: 'all', show: LED_STEP, busy: false, open: false };
      body.innerHTML = '<div class="zmp-wait"></div>';
      Promise.resolve(W().synced ? W().synced() : null).then(() => { if (isOpen()) load(true); });
    });
  }
  const isOpen = () => !!(el && !el.hidden);
  function load(force) {
    if (!W()) return;
    W().profile(force).then((p) => {
      if (!force && body.querySelector('[data-busy]')) return;   // 正在签到的动画：签到那边放完会自己再拉
      if (last && JSON.stringify(p) === lastKey) return;   // 和摆着的（后台预取的那份）一样：不重摆，流水不跳
      render(p);
    }).catch((e) => { if (e && e.message === 'who_changed') return; if (!last) body.innerHTML = '<div class="zmp-in zmp-card zmp-empty">连不上服务器，稍后再试</div>'; });
  }
  function render(p) {
    {
      last = p; lastKey = JSON.stringify(p);
      const keep = led.all.length > (p.ledger || []).length && led.all[0] && p.ledger && p.ledger[0] && led.all[0].at === p.ledger[0].at;   // 翻过页、又没有新流水：留着翻到的
      if (!keep) led = Object.assign({}, led, { all: (p.ledger || []).slice(), more: !!p.ledgerMore });
      body.innerHTML = html(p);
      const dt = body.querySelector('details.zmp-card'); if (dt) dt.addEventListener('toggle', () => { led.open = dt.open; });
      // 打开档案就算看过了：拿到的徽章不再让左上角亮小黄点
      if (W().markBadgesSeen) W().markBadgesSeen((p.badgeList || []).filter((b) => b.got).map((b) => b.id));
      spark = body.querySelector('[data-spark]');
      const draw = () => { if (spark && spark.isConnected) spark.innerHTML = sparkSvg(p.ledger, Math.max(60, spark.clientWidth), spark.clientHeight || 28); };
      if (spark) { draw(); if (root.ResizeObserver) new ResizeObserver(draw).observe(spark); }
    }
  }
  /* 今日首胜（2026-11-26 用户：不在结算里发，像签到一样在档案里自己领）：签到那张卡里一行，
   * 赢了还没领 = 红框 +「领取」；领过 = 已领；今天还没赢 = 灰字「赢一局就有」 */
  function fwHtml(p) {
    const f = p.firstWin;
    if (!f) return '';
    const st = f.ready ? '<button type="button" data-fw>领取</button>' : f.done ? '<em>已领</em>' : '<button type="button" class="go" data-go>去完成</button>';   // 2026-11-27 用户：「赢一局就有」不对，改「去完成」（点了回主页面开局）
    return '<div class="zmp-task' + (f.ready ? ' is-ready' : '') + '"><span>今日首胜<b>' + W().FISH + '+' + fmt(f.amount || 1000) + '</b></span>' + st + '</div>';
  }
  /* 2026-11-26 用户：点了领取，按钮要当场变「已领」（以前等服务器回来要好几秒，中间还能一直点）。
   * 点下去：这一行马上换成「已领」、鱼游进余额；服务器回来再按服务器的重摆；没领成就摆回「领取」、余额退回去 */
  let fwBusy = false;
  function claimFw(btn) {
    if (!last || fwBusy || !last.firstWin || !last.firstWin.ready) return;
    fwBusy = true;
    const prev = last.firstWin, amt = prev.amount || 1000, from = last.bal, to = from + amt;
    const row = btn.closest('.zmp-task');
    const num = body.querySelector('[data-num]'), fx = root.ZhamaoWalletFx;
    let anim;
    if (fx && W().fxOn && W().fxOn()) anim = fx.school(W().FISH, btn, num.parentNode, 3, { spread: 16, gap: 90, dur: 700, lift: -50, size: 26, onLand: () => fx.roll(num, from, to, 520) });
    else { num.textContent = fmt(to); anim = Promise.resolve(); }
    last.bal = to;
    last.firstWin = Object.assign({}, prev, { ready: false, done: true });
    if (row) { row.classList.remove('is-ready'); row.dataset.busy = '1'; btn.outerHTML = '<em>已领</em>'; }   // data-busy：领的路上别被晚到的旧档案盖回「领取」
    const done = () => { fwBusy = false; if (row) delete row.dataset.busy; };
    W().claimFirstWin().then(() => anim).then(() => { done(); setTimeout(() => load(true), 350); })
      .catch(() => { done(); if (last) { last.firstWin = prev; last.bal = from; render(last); } load(true); });
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
    // 签成功、鱼游完：交给 root.ZhamaoAfterCheckin(amt)（2026-11-27 用户：签到成功弹窗「知道了 / 看广告领翻倍」，关了就没有第二次机会；弹窗由内测 zhamao-beta.js 挂这个钩子）
    W().checkin().then(() => anim).then(() => { setTimeout(() => load(true), 350); if (typeof root.ZhamaoAfterCheckin === 'function') { try { root.ZhamaoAfterCheckin(amt); } catch (_) { /* 内测钩子出错不影响签到 */ } } }).catch(() => load(true));
  }
  function login() {
    if (root.SiteAuth && root.SiteAuth.openLogin) root.SiteAuth.openLogin();
  }
  function open() {
    build();
    if (root.ZhamaoWalletFx) root.ZhamaoWalletFx.cancelAll();   // 左上角还在放的进账动画收掉（档案盖上来了）
    last = null;
    led = { all: [], more: false, filter: 'all', show: LED_STEP, busy: false, open: false };
    const cached = W() && W().profileCached ? W().profileCached() : null;   // 先摆上次存的，服务器回来再换（2026-11-23 用户：等两秒太久）
    if (cached) render(cached); else body.innerHTML = '<div class="zmp-wait"></div>';
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

  root.ZhamaoProfile = { open, close, login, isOpen, badgeSvg: (id) => badgeSvg(id), badgeHow };   // 「解锁勋章」整页弹窗借用勋章图和说明（zhamao-wallet.js badgeShow）
})(window);
