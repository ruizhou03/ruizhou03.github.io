/* 百变小咪 · 小鱼干（window.ZhamaoWallet，2026-11-22）
 * 后端 zircon-urge /api/zmw（lib/zhamao-wallet.js）；规则数值见后端 lib/zhamao-econ.js，下面的门票表 / payout 是同一份（显示门票、结算页当场算余额），改那边要同步改这里。
 * 开局前先看余额够不够这局门票：不够弹「小鱼干不够了」（救济、签到在弹窗里自己点，2026-11-23 用户），服务器那边也不再悄悄补。
 * 身份：站点登录了 = 账号钱包（带 Authorization）；没登录 = 这台设备的游客钱包（X-Device-Id = gs.did.v1）。
 *       登录后每次请求带上这台设备原来的游客设备号（gs.did.anon.v1），后端把游客攒的小鱼干并进账号。
 * 单机：开局领票（扣门票）→ 我的名次一定下来（我出局 / 打完）就结算；联机由服务器结算，结算页读服务器给的 pay。
 * 这里还管：主菜单左上角的小鱼干（点了打开游戏里的猫咪档案面板 zhamao-profile.js，不跳页）、单机设置单「开始」键上的门票、结算页的 ±小鱼干。
 * ⚠️ 全程不跳页、不压浏览器历史：微信 / iOS 浏览器一有历史就会在屏幕最下面冒出前进后退条。 */
(function (root) {
  'use strict';
  const R = root.ZhamaoRules;
  const T = R && R.T ? R.T : (k, s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, x) => (x in v ? v[x] : m)) : s);
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const BASE = root.ZHAMAO_WALLET_URL || (LOCAL ? 'http://127.0.0.1:8789' : 'https://zircon-urge.fly.dev') + '/api/zmw';
  const CACHE = 'zm.wallet.v1';

  // ── 规则表（同 lib/zhamao-econ.js）──
  // 门票：[2–3 人, 4–5 人, 6–7 人, 8–9 人]，玩法由便宜到贵（2026-11-22 第二版；2026-11-26 一律整百：150→200、250→300、450→500、750→800）
  const PRICE = {
    // 2026-11-26 用户定「两步走」：经典 / 百变 / 角色的门票只是入场费（各玩法一样），输赢在结算（UNIT）里；组队还是老算法
    classic: { easy: [100, 100, 200, 200], normal: [200, 200, 300, 300], hard: [400, 400, 600, 600] },
    flux: { easy: [100, 100, 200, 200], normal: [200, 200, 300, 300], hard: [400, 400, 600, 600] },
    roles: { easy: [100, 100, 200, 200], normal: [200, 200, 300, 300], hard: [400, 400, 600, 600] },
    team: { easy: [200, 300, 300, 400], normal: [400, 500, 600, 800], hard: [1000, 1200, 1500, 1800] },
  };
  const price = (tier, mode, n) => ((PRICE[mode] || PRICE.classic)[tier] || PRICE.classic.normal)[n <= 3 ? 0 : n <= 5 ? 1 : n <= 7 ? 2 : 3];
  /* 这局拿回多少（同 lib/zhamao-econ.js payout，一字不差）：结算页一出来就用它当场算好余额，不等服务器（2026-11-23 用户：排行榜出来那一下就要结算） */
  const RANK_MULT = {   // 2026-11-25 用户挑乙：第二名 1.5、最后一名 0.4、第一名 2.0 + 0.15 ×（人数 − 1）
    2: [2.15, 0.60], 3: [2.30, 1.50, 0.40],
    4: [2.45, 1.50, 0.75, 0.40], 5: [2.60, 1.50, 1.12, 0.75, 0.40],
    6: [2.75, 1.50, 1.25, 1.00, 0.75, 0.40], 7: [2.90, 1.50, 1.31, 1.12, 0.94, 0.75, 0.40],
    8: [3.05, 1.50, 1.35, 1.20, 1.05, 0.90, 0.75, 0.40], 9: [3.20, 1.50, 1.38, 1.25, 1.12, 1.00, 0.88, 0.75, 0.40],
  };
  const TIER_K = { easy: 0.93, normal: 1, hard: 1.03 };
  const nice = (x) => (x <= 0 ? 0 : Math.round(x / 100) * 100);   // 同后端：一律到百（2026-11-26 用户：收和发都是 100 的整数倍）
  /* 组队（2026-11-26 用户挑方案乙）：队伍那份 = 赢队基础倍率 + 每多活一个队友 0.25（全队同拿）/ 输的队按队伍名次；
   * 个人那份 = 单人同名次倍率 × 0.7；两份取高，再乘整体系数（按「实力相当、随机出局」模拟 30 万局校准，人均仍拿回 1.25 倍门票）。
   * 键 = 每队人数 x 队数：[赢队基础倍率, 整体系数] */
  const TEAM_B = { '2x2': [1.82, 0.94], '3x2': [1.78, 0.93], '4x2': [1.75, 0.91], '2x3': [2.35, 0.94], '2x4': [2.86, 0.94], '3x3': [2.33, 0.93] };
  const TEAM_LOSE = { 2: [0.6], 3: [0.9, 0.45], 4: [1.0, 0.7, 0.4] };   // 第 2 / 3 / 4 名队
  const TEAM_SURV = 0.25, TEAM_SOLO = 0.7;
  const clampI = (x, lo, hi) => Math.max(lo, Math.min(hi, Number.isInteger(x) ? x : lo));
  function teamParts(n, t) {
    const w = Math.max(1, Math.min(n - 1, t.winners || 1)), T = Math.round(n / w), cfg = TEAM_B[w + 'x' + T];
    if (!cfg || t.trank == null) return { m: t.won ? (n * 1.25 - 0.6 * (n - w)) / w : 0.6, floor: false };   // 老客户端没报名次：旧算法
    const tm = t.won ? cfg[0] + TEAM_SURV * (clampI(t.surv, 1, w) - 1) : TEAM_LOSE[T][clampI(t.trank, 2, T) - 2];
    const pm = TEAM_SOLO * RANK_MULT[n][clampI(t.prank, 1, n) - 1];
    return { m: cfg[1] * Math.max(tm, pm), floor: pm > tm };
  }
  /* 两步走的结算（2026-11-26 用户定，同 lib/zhamao-econ.js）：门票开局扣；结算以中位为界、能加能扣，名次越靠两头差得越多。
   * 一份 = UNIT（按档位 × 人数档）；名次份数 w = ±(离中位距离 / 最远距离)^1.2（第一 +1、最后 −1、奇数人中位 0）。
   * 托管 / 中途离开只砍赢的、亏的照付；赢不超过买票前的余额、扣到 0 为止（封顶在 settle 里按余额做，这里不管） */
  // 一份按人数逐个定（2026-11-26 用户：人越多第一名一定赢得越多），下标 = 人数 − 2
  const UNIT = { easy: [500, 600, 800, 900, 1100, 1200, 1400, 1500], normal: [1000, 1200, 1500, 1800, 2100, 2400, 2700, 3000], hard: [2000, 2400, 3000, 3600, 4200, 4800, 5400, 6000] };
  function rankW(n, rank) { const d = (n + 1) / 2 - rank, D = (n - 1) / 2; return Math.sign(d) * Math.pow(Math.abs(d) / D, 1.2); }
  function payout(o) {
    const n = Math.max(2, Math.min(9, Number.isInteger(o.n) ? o.n : 4)), tier = TIER_K[o.tier] ? o.tier : 'normal';
    const p = price(tier, PRICE[o.mode] ? o.mode : 'classic', n);
    const a = Number(o.autoShare) || 0;
    if (!o.team) {
      const w = rankW(n, Math.max(1, Math.min(n, o.rank | 0)));
      let v = Math.sign(w) * nice(UNIT[tier][n - 2] * Math.abs(w));
      if (v > 0) { if (o.left || a > 0.7) v = 0; else if (a > 0.3) v = nice(v / 2); }
      return v;
    }
    let pay = p * teamParts(n, o.team).m;
    if (a > 0.7) pay = 0; else if (a > 0.3) pay *= 0.5;
    return nice(pay);
  }

  // ── 身份 / 请求 ──
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* 无痕 */ } },
  };
  const auth = () => root.SiteAuth || null;
  const loggedIn = () => !!(auth() && auth().getToken && auth().getToken());
  function deviceId() {
    let did = ls.get('gs.did.v1');
    if (!did) { did = 'd-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36); ls.set('gs.did.v1', did); }
    return did;
  }
  /* 这份钱包是谁的：'a:账号' / 'd:设备号'。本机存的余额 / 档案都按它分开（2026-11-26 事故：登录后先摆了游客那份 6,000，像是账号被清空） */
  const who = () => { if (!loggedIn()) return 'd:' + deviceId(); const u = auth().getUser ? auth().getUser() : null; return 'a:' + ((u && (u.id || u.accountId)) || ''); };
  let state = (() => { try { const c = JSON.parse(ls.get(CACHE)) || null; return c && c.who === who() ? c : null; } catch (_) { return null; } })();
  /* 显示的余额 = 服务器余额 + 内测在本机记的加减（zhamao-beta.js 的 ZhamaoProfileBalAdj，和档案第一格同一个数）。
   * 2026-11-27 用户：进局扣了门票 / 道具钱，左上角还是旧数——内测道具钱只记在本机，左上角以前只摆服务器的数 */
  const adj = () => { try { return root.ZhamaoProfileBalAdj ? Number(root.ZhamaoProfileBalAdj()) || 0 : 0; } catch (_) { return 0; } };
  const vb = () => Math.max(0, state.bal + adj());
  let syncing = false;   // 刚换了身份、服务器的余额还没回来：左上角显示加载，不摆旧数
  let quiet = false;     // 这次更新是「和服务器对一下」，不是真的进账：数字直接摆，不游鱼
  const listeners = [];
  function remember(j) {
    if (!j || j.bal == null) return;
    state = Object.assign({}, state || {}, { bal: j.bal, t: Date.now(), who: who() }, j.checkin ? { ck: j.checkin.today ? today() : '', next: j.checkin.next } : {}, j.relief ? { relief: j.relief } : {}, j.winToday != null ? { winToday: !!j.winToday } : {}, j.owner ? { owner: j.owner } : {}, j.tasks && typeof j.tasks === 'object' ? { tasks: j.tasks, tasksDay: today() } : {}, Array.isArray(j.badges) && j.checkin ? { badges: j.badges } : {}, j.firstWin && typeof j.firstWin === 'object' ? { fw: j.firstWin } : j.fwReady ? { fw: Object.assign({}, (state && state.fw) || {}, { ready: true, done: true }) } : {});
    ls.set(CACHE, JSON.stringify(state));
    listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } });
  }
  // 手机上的日历日（2026-11-23 用户：签到按用户当地日期算，不按北京时间；服务器只认「世界上某个时区此刻的日期」）
  // 2026-11-26 用户：新的一天从凌晨 4 点算（按手机当地时间）——4 点以前还算昨天。后端同规则（lib/zhamao-econ.js）
  const DAY_CUT = 4 * 3600e3;
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dayAt = (t) => ymd(new Date((t == null ? Date.now() : t) - DAY_CUT));
  const today = () => dayAt();
  /* 几个请求同时在路上（开局：买道具几笔 + 门票）时，回来的先后不一定：只有最后发出的那个请求回来的余额才摆上去，
   * 早发的晚回来就不改余额（不然左上角会先跳回中间某一步的数再落下来——2026-11-27 用户：扣完又弹一下） */
  let postSeq = 0, lastOk = 0;
  async function post(action, body, sync) {
    const mySeq = ++postSeq;
    const b = Object.assign({ day: today(), tz: new Date().getTimezoneOffset() }, body || {});   // tz：服务器记下手机时区，联机结算时也按当地日期算首胜（2026-11-24）
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
    let res;
    const me = who();
    if (loggedIn()) {
      // 游客号：登录后备份在 gs.did.anon.v1；刚登录那一刻还没备份，gs.did.v1 里还是游客号（不是账号号 a_…）——也带上，后端先并游客钱包再干别的
      const cur = ls.get('gs.did.v1'), g = ls.get('gs.did.anon.v1') || (cur && !/^a_/.test(cur) ? cur : '');
      if (g) b.guest = g;
      opts.body = JSON.stringify(b);
      res = await auth().authedFetch(BASE + '?action=' + action, opts);
    } else {
      opts.headers['X-Device-Id'] = deviceId();
      opts.body = JSON.stringify(b);
      res = await fetch(BASE + '?action=' + action, opts);
    }
    const j = await res.json().catch(() => ({}));
    lastOk = Date.now();
    if (!res.ok) { const e = new Error(j.error || 'http_' + res.status); e.status = res.status; throw e; }
    if (me !== who()) { const e = new Error('who_changed'); e.status = 0; throw e; }   // 半路登录 / 登出了：这份是旧身份的，不摆
    quiet = !!sync;
    try { remember(mySeq === postSeq || !state || state.bal == null ? j : Object.assign({}, j, { bal: state.bal })); } finally { quiet = false; }
    return j;
  }

  // ── 画 ──
  const FISH = '<svg class="zmw-fish" viewBox="0 0 32 20" aria-hidden="true"><path d="M3 10c4-6 11-8 17-6 3 1 5 3 6 6-1 3-3 5-6 6-6 2-13 0-17-6Z" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.6" stroke-linejoin="round"/><path d="M25 10l5-5v10Z" fill="#e3a83f" stroke="#1d1b18" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 6.5c1.6 2 1.6 5 0 7" fill="none" stroke="#1d1b18" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="9" r="1.2" fill="#1d1b18"/></svg>';
  const fmt = (x) => Math.round(Math.abs(x)).toLocaleString('en-US');
  const CSS = `
.zmw-fish{width:1.6em;height:1em;flex:none;vertical-align:-.12em}
.zmw-chip{cursor:pointer;font-family:inherit;position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);left:calc(env(safe-area-inset-left,0px) + 12px);z-index:5;display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 9px;border:1.5px solid #1d1b18;border-radius:999px;background:#fffdf8;color:#1d1b18;text-decoration:none;font:700 15px/1 ZM Num,ZM Serif,Georgia,"Noto Serif SC",serif;box-shadow:0 2px 0 #1d1b18;-webkit-tap-highlight-color:transparent}
.zmw-chip:active{transform:translateY(2px);box-shadow:none}
.zmw-chip.is-load b::after{content:'···';display:inline-block;min-width:2.2em;opacity:.45;animation:zmwLoad 1s ease-in-out infinite alternate}
@keyframes zmwLoad{to{opacity:.15}}
.zmw-chip[hidden]{display:none}
.zmw-chip .zmw-dot{position:absolute;top:-3px;right:-3px;width:11px;height:11px;border-radius:50%;background:#e9b949;border:2px solid #fffdf8}
.zmw-chip .zmw-dot[hidden]{display:none}
[data-cover="start"]{position:relative}
.zmw-cost{position:absolute;right:14px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;gap:3px;padding:3px 9px 3px 6px;border-radius:999px;background:rgba(255,253,248,.2);font:600 14px/1.2 ZM Num,ZM Serif,Georgia,serif;pointer-events:none}
.zmw-cost .zmw-fish{width:1.5em}
.zmw-res{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;margin:12px auto 2px;min-height:40px}
.zmw-res .zmw-fish{width:40px;height:26px}
.zmw-res>b{font:700 30px/1 ZM Num,ZM Serif,Georgia,"Noto Serif SC",serif;font-variant-numeric:tabular-nums;color:#1d1b18}
.zmw-res>b.is-up{color:#3f7a52}.zmw-res>b.is-down{color:#b4392c}
.zmw-res .zmw-bal b{font:inherit}
.zmw-res .zmw-bal{display:inline-flex;align-items:center;gap:4px;padding:4px 10px 4px 7px;border-radius:999px;background:#ebe5d8;font:600 14px/1 ZM Num,ZM Serif,Georgia,serif;color:#6a6358}
.zmw-res .zmw-bal .zmw-fish{width:22px;height:14px}
/* 结算页一笔一笔写清楚（2026-11-26 用户：小鱼干后面一颗星 +1000 看不懂）：这局 / 今日首胜 / 解锁勋章各占一行，余额看左上角 */
.zmw-res.is-lines{display:flex;flex-direction:column;align-items:stretch;gap:7px;margin:14px 0 2px;padding-top:12px;border-top:1px solid rgba(29,27,24,.14);min-height:0}
.zmw-ln{display:flex;align-items:center;justify-content:space-between;gap:10px;font:600 15px/1.25 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;color:#6a6358;text-align:left}
.zmw-ln>span{display:inline-flex;align-items:center;gap:6px;min-width:0}
.zmw-ln>b{flex:none;display:inline-flex;align-items:center;gap:6px;font:700 17px/1 ZM Num,ZM Serif,Georgia,"Noto Serif SC",serif;font-variant-numeric:tabular-nums;color:#6a6358}
.zmw-ln>b i{font-style:normal}
.zmw-ln>b .zmw-fish{width:34px;height:21px}
.zmw-ln>b.is-up{color:#3f7a52}.zmw-ln>b.is-down{color:#b4392c}
.zmw-ln.is-main{color:#1d1b18;font-size:16px}
.zmw-ln.is-main>b{font-size:26px}
.zmw-bot{position:relative;align-self:flex-start;margin:-6px 0 0 -3px;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:transparent;color:#8a8275;filter:drop-shadow(0 0 1px #fffdf8) drop-shadow(0 0 1px #fffdf8);display:inline-grid;place-items:center;cursor:pointer;-webkit-tap-highlight-color:transparent}
.zmw-bot svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.zmw-bot>em{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;padding:5px 9px;border-radius:8px;background:#1d1b18;color:#fffdf8;font:500 12px/1.2 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;font-style:normal;opacity:0;pointer-events:none;transition:opacity .18s}
.zmw-bot.is-open>em{opacity:1}
.zmw-res.is-lines .zmw-note{text-align:left}
/* 牌桌左上角常驻小鱼干（2026-11-26 用户挑方案 A：标题位换成小鱼干，和主页面同一个位置） */
.zmw-tchip{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px 0 9px;box-sizing:border-box;border:1px solid #1d1b18;border-radius:999px;background:#fffdf8;font:700 15px/1 ZM Num,ZM Serif,Georgia,"Noto Serif SC",serif;font-variant-numeric:tabular-nums;color:#1d1b18;box-shadow:0 2px 0 #1d1b18;white-space:nowrap;transform-origin:20% 50%}
.zmw-tchip[hidden]{display:none}
.zmw-tchip .zmw-fish{width:24px;height:15px}
.zmw-tchip b{transition:color .2s}
.zm-topleft.has-zmw .zm-title{display:none}
.zmw-tchip.is-lift{position:relative;z-index:60}
.zmw-tchip.is-fb{position:relative;z-index:90}
.zmw-fbrw{display:inline-flex;align-items:center;gap:5px;padding:6px 12px 6px 9px;border-radius:999px;background:#fffdf8;border:1px solid rgba(29,27,24,.18);color:#3f7a52;font:700 16px/1 ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums;transition:opacity .4s;white-space:nowrap}
.zmw-fbrw .zmw-fish{width:24px;height:15px}
.zmw-fbrw .zmw-tick{width:15px;height:15px}
.zmw-fbrw.is-spent{opacity:.6}
.zm-dialog-mask.is-wal{padding-top:58px}
@media (max-width:480px),(max-height:480px){.zmw-tchip{height:30px;font-size:14px;padding:0 10px 0 8px}.zmw-tchip .zmw-fish{width:21px;height:13px}.zm-dialog-mask.is-wal{padding-top:50px}}
/* 解锁勋章：整页压一层深色蒙版（2026-11-26 用户） */
.zmw-bdg{position:absolute;inset:0;z-index:58;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow:hidden;text-align:center;color:#fffdf8;background:rgba(24,22,19,.9);-webkit-tap-highlight-color:transparent}
.zmw-bdg .kick{font:700 14px/1 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;letter-spacing:.32em;text-indent:.32em;color:#e9b949;margin-bottom:8px}
.zmw-bdg .art{position:relative;width:min(200px,44vmin);height:min(200px,44vmin);display:grid;place-items:center;flex:none}
.zmw-bdg .rays{position:absolute;inset:-22%;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(233,185,73,.3) 0 9deg,transparent 9deg 24deg);-webkit-mask:radial-gradient(circle,#000 22%,transparent 68%);mask:radial-gradient(circle,#000 22%,transparent 68%);animation:zmwSpin 14s linear infinite}
@keyframes zmwSpin{to{transform:rotate(360deg)}}
.zmw-bdg .art svg{position:relative;width:74%;height:74%;filter:drop-shadow(0 8px 10px rgba(0,0,0,.5))}
.zmw-bdg .steps{order:-1;display:flex;gap:10px;margin-bottom:4px}
.zmw-bdg .steps svg{width:34px;height:34px;display:block;opacity:.45}
.zmw-bdg .steps .had svg{opacity:.7}.zmw-bdg .steps .cur svg{opacity:1}
.zmw-bdg .txt{display:contents}.zmw-bdg .kick{order:-2}
.zmw-bdg h3{margin:4px 0 4px;color:#fffdf8;font:700 26px/1.2 ZM Serif,Georgia,"Noto Serif SC",serif;letter-spacing:.06em}
.zmw-bdg .how{font:500 14.5px/1.4 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;color:rgba(255,253,248,.72);margin-bottom:14px}
.zmw-bdg .rw{display:inline-flex;align-items:center;gap:6px;padding:8px 16px 8px 12px;border-radius:999px;background:#fffdf8;color:#3f7a52;font:700 22px/1 ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums;margin-bottom:22px;transition:opacity .4s}
.zmw-bdg .rw .zmw-fish{width:32px;height:20px}
.zmw-bdg .rw.is-spent{opacity:.6}
.zmw-bdg{cursor:pointer;outline:none}
.zmw-bdg .tap{font:500 13px/1 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;color:rgba(255,253,248,.5);letter-spacing:.06em}
.zmw-bdg .rw .zmw-tick{width:20px;height:20px}
.zmw-bdg .cf{position:absolute;left:50%;top:40%;width:8px;height:14px;border-radius:2px;opacity:0;animation:zmwCf 1.5s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes zmwCf{0%{opacity:1;transform:translate(0,0) rotate(0)}70%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r))}}
@media (max-height:480px){.zmw-bdg{flex-direction:row;column-gap:28px}.zmw-bdg .txt{display:flex;flex-direction:column;align-items:center}.zmw-bdg .kick{order:0}.zmw-bdg .rw{margin-bottom:16px}.zmw-bdg .art{width:min(170px,50vh);height:min(170px,50vh)}}
@media (prefers-reduced-motion:reduce){.zmw-bdg .rays,.zmw-bdg .cf{animation:none}.zmw-bdg .cf{display:none}}
.zmw-chip b{transition:color .2s}
.zmwfx-up{color:#3f7a52!important}.zmwfx-down{color:#b4392c!important}
/* 小鱼干不够（2026-11-23 用户：余额不够不能直接开，弹窗说清楚，救济在弹窗里自己点） */
.zmw-short-mask{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:20px;background:rgba(29,27,24,.42);-webkit-tap-highlight-color:transparent}
.zmw-short{box-sizing:border-box;width:min(300px,100%);padding:22px 20px 18px;border:1.5px solid #1d1b18;border-radius:18px;background:#fffdf8;box-shadow:0 4px 0 #1d1b18;color:#1d1b18;text-align:center;font-family:ZM Num,ZM Serif,Georgia,"Noto Serif SC",serif}
.zmw-short .zmw-big{width:64px;height:40px;display:block;margin:0 auto 6px;transform:rotate(-14deg)}
.zmw-short h3{margin:0 0 14px;font:700 19px/1.2 ZM Num,ZM Serif,Georgia,"Noto Serif SC",serif}
.zmw-short .zmw-row{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 0 18px}
.zmw-short .zmw-pill{display:inline-flex;align-items:center;gap:5px;padding:6px 12px 6px 9px;border-radius:999px;background:#ebe5d8;font:700 18px/1 ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums}
.zmw-short .zmw-pill .zmw-fish{width:26px;height:16px}
.zmw-short .zmw-pill.is-price{background:#f0c9bb}
.zmw-short .zmw-row i{font-style:normal;color:#8a8275;font:600 18px/1 ZM Num,ZM Serif,Georgia,serif}
.zmw-short *{box-sizing:border-box}
.zmw-short .zmw-acts{display:flex;flex-direction:column;gap:8px}
.zmw-short button{cursor:pointer;font:600 16px/1 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;padding:13px 14px;border-radius:12px;border:1.5px solid #1d1b18;background:#fffdf8;color:#1d1b18;box-shadow:0 2px 0 #1d1b18;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.zmw-short button .zmw-fish{width:24px;height:15px}
.zmw-short button.is-main{background:#b4392c;border-color:#1d1b18;color:#fffdf8}
.zmw-short button.is-plain{border-color:transparent;box-shadow:none;color:#6a6358;padding:9px}
.zmw-short button:disabled{opacity:.55}
.zmw-short button:active{transform:translateY(2px);box-shadow:none}
.zmw-short .zmw-tasks{margin:0 0 4px;border:1.5px solid #1d1b18;border-radius:12px;overflow:hidden;text-align:left}
.zmw-short .zmw-tasks p{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0;padding:9px 10px 9px 14px;min-height:50px;border-top:1px solid rgba(29,27,24,.12);font:600 15px/1.2 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif}
.zmw-short .zmw-tasks p:first-child{border-top:0}
.zmw-short .zmw-tasks button{padding:8px 14px;border-radius:999px;font-size:14px;background:#b4392c;color:#fffdf8;box-shadow:0 2px 0 #1d1b18}
.zmw-short .zmw-tasks em{font-style:normal;font:500 14px/1 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;color:#8a8275;padding:8px 4px}
.zmw-tag{display:inline-flex;align-items:center;gap:2px;margin-left:6px;padding:2px 8px 2px 5px;border-radius:999px;background:rgba(255,253,248,.22);font:600 .86em/1.2 ZM Num,ZM Serif,Georgia,serif;font-variant-numeric:tabular-nums;vertical-align:middle}
.zm-btn:not(.zm-btn-primary) .zmw-tag{background:#ebe5d8}
.zmw-tag .zmw-fish{width:1.4em;height:.9em}
.zmw-res .zmw-note{flex-basis:100%;text-align:center;font:500 13px/1.3 ZM Serif,'Songti SC','STSong','Noto Serif SC',serif;color:#8a8275}
.zmw-chip b.is-up{color:#3f7a52}.zmw-chip b.is-down{color:#b4392c}
.zmw-res .zmw-wait{width:42px;height:6px;border-radius:3px;background:linear-gradient(90deg,#ebe5d8,#d9cfbd,#ebe5d8);background-size:200% 100%;animation:zmwWait 1s linear infinite}
@keyframes zmwWait{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.zmw-res .zmw-wait{animation:none}}
`;
  let styled = false;
  function style() {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── 主菜单左上角的小鱼干 ──
  let chip = null, coverEl = null;
  /* 小黄点（2026-11-22 用户挑甲）：只在「有东西可以领 / 可以看」时亮——今天还没签到，或者有拿到了还没看过的徽章。余额变了不亮点，靠数字滚动 */
  const seenBadges = () => { try { return JSON.parse(ls.get('zm.badges.seen')) || []; } catch (_) { return []; } };
  function markBadgesSeen(ids) { ls.set('zm.badges.seen', JSON.stringify(Array.from(new Set(seenBadges().concat(ids || []))))); paintChip(); }
  const hasNews = () => !!state && (state.ck !== today() || !!(state.fw && state.fw.ready) || (state.badges || []).some((b) => seenBadges().indexOf(b) < 0));   // 2026-11-26：今日首胜待领也亮
  let shortOpen = false;   // 「不够了」弹窗开着：鱼游进弹窗里的余额，后面左上角那个不跟着放
  let shown = null;   // 左上角现在显示的数（动画从这里滚到新余额）
  const FX = () => root.ZhamaoWalletFx || null;
  const profileOpen = () => !!(root.ZhamaoProfile && root.ZhamaoProfile.isOpen && root.ZhamaoProfile.isOpen());
  function paintChip() {
    if (!chip) return;
    const has = state && state.bal != null;
    chip.hidden = !has && !syncing;
    chip.classList.toggle('is-load', !has);
    if (!has) { chip.querySelector('b').textContent = ''; chip.querySelector('.zmw-dot').hidden = true; shown = null; return; }   // 加载中：只有鱼 + 三个点，不摆错的数
    const b = chip.querySelector('b');
    if (quiet && !(shortOpen && shown != null)) { b.textContent = fmt(vb()); shown = vb(); }   // 和服务器对数（打开游戏、登录、关档案）：直接摆，不游鱼——2026-11-26 用户：打开游戏莫名其妙有加减
    else if (shortOpen && shown != null) { /* 「不够了」弹窗开着：后面这个先不动，关窗时对齐（录屏：弹窗里鱼还没游到，后面已经先跳成新数） */ }
    else if (shown == null) { b.textContent = fmt(vb()); shown = vb(); }
    else if (chip.offsetParent === null) { /* 封面藏着（在打牌）：等回到主页面露出来再滚 */ }
    else if (profileOpen() || shortOpen || !fxOn() || !FX() || shown === vb()) { b.textContent = fmt(vb()); shown = vb(); }   // 档案开着：鱼飞进档案里的余额，后面这个不动
    else { const from = shown; shown = vb(); animateIn(from, vb()); }
    chip.querySelector('.zmw-dot').hidden = !hasNews();
  }

  /* ── 动画（2026-11-22 用户挑甲，第二轮重做：zhamao-walletfx.js；2026-11-23 用户看过录屏后默认打开，?walletfx=0 关、=1 再开；系统「减少动态效果」也关）──
   * 进账：回到主页面时一串小鱼从下面弯弯地游进左上角，数字滚到新余额（加绿、减红）
   * 扣门票：点「开始」→ 门票从左上角小鱼干里抽出来、飘落到「开始」键上（数字同时往下滚）→ 放完才进牌桌（不留半截动画在牌桌上） */
  const FX_KEY = 'zm.walletfx';
  (function () { const m = /[?&]walletfx=([01])\b/.exec(location.search); if (m) ls.set(FX_KEY, m[1]); })();
  const fxOn = () => ls.get(FX_KEY) !== '0' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animateIn(from, to) {
    const b = chip.querySelector('b'), fx = FX();
    if (to < from) { fx.roll(b, from, to, 560); return; }
    const n = Math.min(6, 2 + Math.round(Math.log10(Math.max(10, to - from))));
    fx.school(FISH, { x: innerWidth / 2, y: innerHeight * 0.72 }, chip, n, { spread: 90, gap: 90, dur: 820, lift: -60, onLand: () => fx.roll(b, from, to, 560) });
  }
  /* 交门票（2026-11-23 用户：门票不要「鱼 + 数字」的标签飘下来，就是鱼游下来）：
   * 几条小鱼从余额（主页面左上角 / 结算页的余额）游进要按的那个键（「开始」/「再来一局」），余额同时往下滚，放完才 resolve——调用方这时才真正开局。
   * 余额不够：先弹「小鱼干不够了」（救济、签到都在里面自己点），凑够了点「开始」才往下走；关掉 = 不开（resolve false）。
   * 不知道余额（连不上服务器）/ 没开动画：直接 resolve true（照旧开局，服务器那边不够就不计分） */
  let fxGen = 0;   // 每收一次动画 +1：放到一半被收掉的扣票，不能再接着开局
  /* 开局道具（内测 zhamao-beta.js pickCost）：点「开始」那一下门票和挑着的道具一起往下滚（2026-11-27 用户：以前只先扣门票，进局一会儿才扣道具钱）。
   * 道具钱真正记账还是开局时（beta onDeal），这里只让显示的数一步到位；门票本机先记上 */
  const extraOf = (o) => { try { return root.ZhamaoBeta && root.ZhamaoBeta.pickCost ? Math.max(0, root.ZhamaoBeta.pickCost(o) || 0) : 0; } catch (_) { return 0; } };
  function pay(o) {
    const p = price(o.tier, o.mode, o.n);
    if (state && state.bal != null && vb() < p) return shortDialog(o, p).then((ok) => (ok ? fishPay(p, o.from, o.to, extraOf(o)) : false));
    return fishPay(p, o.from, o.to, extraOf(o));
  }
  function fishPay(p, from, to, extra) {
    extra = extra || 0;
    const fx = FX();
    if (!fx || !fxOn() || !from || !to || from.offsetParent === null || !state || state.bal == null) return Promise.resolve(true);
    cancelFx();
    const gen = fxGen, b = from.querySelector('b') || from;
    const bal = from === chip ? (shown != null ? shown : vb()) : (Number(String(b.textContent).replace(/[^\d]/g, '')) || vb());   // 结算页：从它上面显示的数往下滚
    if (from === chip) shown = bal - p - extra;
    if (from === tchip) { tGen++; tShown = bal - p - extra; held = false; }
    // 本机先记上（主页面「开始」和牌桌「再来一局」都是）：进牌桌时左上角就是扣完票的数，不等服务器的门票回来（2026-11-27 用户：进局余额没马上变）
    if (state && (from === chip || from === tchip)) state = Object.assign({}, state, { bal: state.bal - p });   // 本机先记上：开新局时左上角别先弹回旧数再被门票扣下来   // 牌桌左上角（结算页「再来一局」）：还没放完的进账一律收掉，从现在显示的数往下扣
    fx.roll(b, bal, bal - p - extra, 520, { delay: 120 });
    const n = Math.min(5, 2 + Math.round(Math.log10(Math.max(10, p + extra)) - 1));
    return fx.school(FISH, from, to, n, { spread: 14, gap: 70, dur: 700, lift: 30, size: 28, toPoint: center(to) }).then(() => gen === fxGen);
  }
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  // 旧名字（zhamao.js 的「开始」键还在用）
  function playTicket(tier, mode, n, rules) { return pay({ tier, mode, n, rules, from: chip, to: document.querySelector('[data-cover="start"]') }); }

  /* 小鱼干不够了：余额 / 门票并排，下面一张今天的任务单（2026-11-23 用户定：只列主流的三项，不写给多少）——
   *   领取救济（第一次亏空 +3,000，之后每天三次 +1,000）/ 每日签到 / 对局获胜（每天第一次赢）
   *   没做的右边「前往」：救济、签到当场领（鱼游进上面的余额）；对局获胜 = 关掉弹窗回去开一局；做过的写「已完成」。
   * 领完够了，主键变成「开始」。字尽量少 */
  function shortDialog(o, p) {
    style();
    shortOpen = true;
    return new Promise((resolve) => {
      const mask = document.createElement('div');
      mask.className = 'zmw-short-mask';
      mask.innerHTML = '<div class="zmw-short" role="dialog" aria-modal="true"><svg class="zmw-big" viewBox="0 0 32 20" aria-hidden="true">' + FISH.replace(/^<svg[^>]*>/, '').replace('</svg>', '') + '</svg>' +
        '<h3>' + T('ui.wallet.short', '小鱼干不够了') + '</h3>' +
        '<div class="zmw-row"><span class="zmw-pill" data-bal>' + FISH + '<b>' + fmt(vb()) + '</b></span><i>/</i><span class="zmw-pill is-price">' + FISH + fmt(p) + '</span></div>' +
        '<div class="zmw-acts"></div></div>';
      document.body.appendChild(mask);
      const acts = mask.querySelector('.zmw-acts'), balEl = mask.querySelector('[data-bal]');
      let done = false;
      const end = (ok) => { if (done) return; done = true; shortOpen = false; mask.remove(); if (chip && state) { shown = vb(); chip.querySelector('b').textContent = fmt(vb()); } resolve(ok); };
      mask.addEventListener('click', (e) => { if (e.target === mask) end(false); });
      const btn = (cls, html, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html; b.addEventListener('click', () => fn(b)); acts.appendChild(b); return b; };
      // 拿到小鱼干（点下去就放，不等服务器——知道能领多少）：鱼从按钮游进上面的余额、数字滚上去；服务器回来且动画放完再按服务器的余额重摆按钮
      let busy = 0;
      const claim = (b, amt, req) => {
        b.disabled = true;
        busy++;
        const from = vb(), fx = FX(), numEl = balEl.querySelector('b');
        const anim = fx && fxOn()
          ? fx.school(FISH, b, balEl, Math.min(4, 2 + Math.round(Math.log10(amt) - 1)), { spread: 16, gap: 80, dur: 640, lift: -40, size: 26, onLand: () => fx.roll(numEl, from, from + amt, 480) })
          : Promise.resolve().then(() => { numEl.textContent = fmt(from + amt); });
        const settle = (v) => { busy--; numEl.__zmwRoll = {}; numEl.textContent = fmt(v); draw(); };   // 收掉还在滚的那段，再摆服务器的数（录屏：滚到 1,990 被晚到的一帧盖住）
        Promise.all([req(), anim]).then(() => settle(vb())).catch(() => settle(vb()));   // 没领成：数字摆回去
      };
      function draw() {
        acts.innerHTML = '';
        const bal = vb(), rl = state.relief || {};
        mask.querySelector('h3').hidden = bal >= p;   // 凑够了：标题收起，只剩数字和「开始」
        if (bal >= p) { const go = btn('is-main', o.okLabel || T('ui.start', '开始'), () => end(true)); go.focus(); btn('is-plain', T('ui.cancel', '取消'), () => end(false)); return; }
        const list = document.createElement('div');
        list.className = 'zmw-tasks';
        acts.appendChild(list);
        const task = (name, isDone, go) => {
          const row = document.createElement('p');
          row.innerHTML = '<span>' + name + '</span>';
          if (isDone) row.insertAdjacentHTML('beforeend', '<em>' + T('ui.wallet.done', '已完成') + '</em>');
          else { const b = document.createElement('button'); b.type = 'button'; b.textContent = T('ui.wallet.go', '前往'); b.addEventListener('click', () => go(b)); row.appendChild(b); }
          list.appendChild(row);
        };
        const amt = rl.amount || (rl.first ? 5000 : 2000);   // 后端下发下一次能领多少（2026-11-26 起：第一次亏空 5,000、之后救济 2,000，每天 2 次）
        task(T('ui.wallet.relief', '领取救济'), !(rl.first || rl.left > 0), (b) => claim(b, amt, () => post('relief', { n: o.n, mode: o.mode, tier: o.tier })));
        task(T('ui.wallet.checkin', '每日签到'), state.ck === today(), (b) => claim(b, state.next || 100, () => api.checkin()));
        if (state.fw && state.fw.ready) task(T('ui.wallet.win', '对局获胜'), false, (b) => claim(b, state.fw.amount || 1000, () => claimFirstWin()));   // 赢过、首胜奖励还没领：当场领
        else task(T('ui.wallet.win', '对局获胜'), !!state.winToday, () => end(false));
        btn('is-plain', T('ui.ok', '知道了'), () => end(false));
      }
      draw();
      refresh().then(() => { if (!done && !busy) draw(); });   // 任务单以服务器为准（今天赢过没有、救济还剩几次）
    });
  }
  /* 联机（2026-11-23）：房主点开始、服务器说我不够这局门票 → 同一个弹窗（救济 / 签到），凑够了点主键 resolve true。
   * 门票以服务器给的为准（o.price）；先拉一次余额（本机记的可能是旧的） */
  function topUp(o) {
    if (shortOpen) return Promise.resolve(false);
    return refresh().then(() => {
      if (!state || state.bal == null) return true;
      return shortDialog(o, o.price != null ? o.price : price(o.tier, o.mode, o.n));
    });
  }
  /* 领今日首胜（2026-11-26：首胜不在结算里发，档案 / 「不够了」弹窗里自己领） */
  /* 2026-11-26 用户：点了领取要当场变「已领」——本机先记成领过（左上角小黄点、档案缓存跟着变），服务器没领成再按服务器的摆回去 */
  function claimFirstWin() {
    const prev = state && state.fw;
    if (state) { state = Object.assign({}, state, { fw: Object.assign({}, prev || {}, { ready: false, done: true }), t: Date.now() }); ls.set(CACHE, JSON.stringify(state)); listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } }); }
    return post('firstwin').catch((e) => { refresh(); throw e; });
  }
  /* 「这步不对」奖励（2026-11-26 用户：点了发送，两秒后数字才莫名其妙加上去）：
   * 本机按服务器同一套规则（每标一步 +100、每天最多 4 步，按手机当地日期）先算这一步给不给；给就在反馈页上冒一颗「+100」胶囊，
   * 鱼当场从它游进左上角、数字滚上去，放完再关页。服务器回来以它为准（顺手校正）；请求失败就按服务器的余额摆回去。
   * 返回动画放完的 Promise（不给鱼就立刻好） */
  const FB_EACH = 100, FB_MAX = 4, FBK = 'zm.wfb.v1';
  function fbUsed() {
    let n = 0;
    try { const o = JSON.parse(ls.get(FBK)); if (o && o.d === today()) n = o.n | 0; } catch (_) { /* */ }
    try { const c = JSON.parse(ls.get(PROF)); if (c && c.p && c.who === who() && c.p.fbToday != null && c.t && dayAt(c.t) === today()) n = Math.max(n, c.p.fbToday | 0); } catch (_) { /* */ }
    return n;
  }
  function fbAward(host, before) {
    const used = fbUsed();
    ls.set(FBK, JSON.stringify({ d: today(), n: used + 1 }));
    const amt = used < FB_MAX && state && state.bal != null ? FB_EACH : 0;
    let anim = Promise.resolve();
    if (amt) {
      style();
      let rw = null;
      if (host) {
        rw = document.createElement('span');
        rw.className = 'zmw-fbrw';
        rw.innerHTML = FISH + '+' + fmt(amt);
        host.insertBefore(rw, before && before.parentNode === host ? before : null);
        if (FX() && !FX().reduce()) rw.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
      }
      if (tchip) tchip.classList.add('is-fb');
      // 胶囊亮一下再游（不然一冒出来鱼就飞走，看不清拿了多少）
      anim = tAdd(rw, amt, tGen, rw && FX() && fxOn() ? 320 : 0, true).then(() => {
        if (rw && rw.isConnected) { rw.classList.add('is-spent'); rw.insertAdjacentHTML('afterbegin', TICK); }
        return wait(rw && rw.isConnected && FX() && fxOn() ? 380 : 0);
      }).then(() => { if (tchip) tchip.classList.remove('is-fb'); });
      // 本机先记上（tAdd 一调用就把左上角的目标数挪到新余额，这里通知别处时左上角不会再滚一遍）
      state = Object.assign({}, state, { bal: state.bal + amt, t: Date.now() });
      ls.set(CACHE, JSON.stringify(state));
      listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } });
    }
    post('fb', { steps: 1 }).then((j) => {
      try { const c = JSON.parse(ls.get(PROF)); if (c && c.p && c.who === who()) { c.p.fbToday = Math.min(FB_MAX, used + 1); c.p.fbTotal = (c.p.fbTotal | 0) + 1; if (j && j.bal != null) c.p.bal = j.bal; ls.set(PROF, JSON.stringify(c)); } } catch (_) { /* */ }
    }).catch(() => { if (amt) refresh(); });
    return anim;
  }
  function cancelFx() { fxGen++; if (FX()) FX().cancelAll(); }
  /* 内测记账（2026-11-27 用户：内测花的 / 领的小鱼干直接记在服务器真余额上，只记一个余额）：后端 action=beta，只认站长账号，key 幂等。
   * 本机先记上（左上角当场滚、档案第一格跟着变），服务器不认（余额不够 / 网断）就按服务器的数摆回去 */
  function beta(amt, why, key) {
    return optimistic('beta', { amt: Math.round(amt), why: String(why || '').slice(0, 24), key: key || 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }, amt);
  }
  /* 开局道具 / 每日任务（2026-11-28 用户：对所有玩家开放）：后端 action=item（op buy / back / x2，价钱服务器定）、action=task。
   * amt = 本机估的加减，先摆上去；服务器回来的余额为准（不一样就按服务器的数摆），没记上就摆回去 */
  const itemKey = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function item(op, body, amt) { return optimistic('item', Object.assign({ op }, body || {}), amt || 0); }
  function task(id, amt) { return optimistic('task', { id }, amt || 0); }
  function optimistic(action, body, amt) {
    if (!amt || !state || state.bal == null) return post(action, body);   // 还没拿到余额：不先摆，直接记（服务器回来的余额照样摆上）
    const prof = (x) => { try { if (root.ZhamaoProfile && root.ZhamaoProfile.bump) root.ZhamaoProfile.bump(x); const c = JSON.parse(ls.get(PROF)); if (c && c.p && c.who === who() && c.p.bal != null) { c.p.bal += x; ls.set(PROF, JSON.stringify(c)); } } catch (_) { /* */ } };
    state = Object.assign({}, state, { bal: state.bal + amt });
    ls.set(CACHE, JSON.stringify(state));
    listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } });
    prof(amt);
    return post(action, body)
      .then((j) => { const got = j ? (j.d != null ? j.d : j.awarded) : null; if (got != null && got !== amt) prof(got - amt); return j; }, (e) => { prof(-amt); if (state && state.bal != null) state = Object.assign({}, state, { bal: state.bal - amt }); quiet = true; try { listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } }); } finally { quiet = false; } refresh(); throw e; });
  }
  function canPay(tier, mode, n) { return !(state && state.bal != null && vb() < price(tier, mode, n)); }
  function mountChip(cover) {
    style();
    if (!cover || chip) return;
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'zmw-chip';
    chip.addEventListener('click', openProfile);
    chip.addEventListener('pointerdown', () => { profile().catch(() => null); });   // 按下就去拿，松手打开时已经在路上
    chip.setAttribute('aria-label', T('ui.wallet.title', '小鱼干'));
    chip.innerHTML = FISH + '<b></b><i class="zmw-dot" hidden></i>';
    chip.hidden = true;
    cover.appendChild(chip);
    // 封面一藏起来（开局 / 进联机 / 进教程，不管从哪儿走的）：小鱼干的动画一律当场收掉，不带到下一页
    // 回到主页面（2026-11-26 用户：打完牌回主页面，鱼数突然往上涨）：这局的加减牌桌左上角已经放过了，主页面这个直接摆成现在的数，不再游一遍
    if (root.MutationObserver) new MutationObserver(() => { if (cover.hidden) cancelFx(); else if (chip && state && state.bal != null) { shown = vb(); chip.querySelector('b').textContent = fmt(vb()); } }).observe(cover, { attributes: true, attributeFilter: ['hidden'] });
    coverEl = cover;
    if (!state) syncing = true;   // 本机没有这个身份的余额：先显示加载，不摆别人的数
    paintChip();
    listeners.push(paintChip);
    // 档案数据闲下来先拿一份：本机没存过、存的不是今天的、或存了超过一分钟（2026-11-26 用户：进档案要已经是好的）
    // 进游戏（加载条那会儿）：档案存的不是今天（凌晨 4 点换日）/ 超过一分钟 → 直接拉整份档案（里面就有余额），不然只对一下余额
    (profStale() ? profile(true).catch(() => null) : refresh()).then(() => { if (syncing && syncP === first) { syncing = false; paintChip(); } }).then(retryPending);
    // 切回来（锁屏 / 切 App 回来）且在主页面：档案旧了再拉一次。不轮询，打牌时不拉
    document.addEventListener('visibilitychange', () => { if (!document.hidden && coverEl && !coverEl.hidden && profStale()) profile(true).catch(() => null); });
    // 登录 / 登出之后：游客小鱼干并进账号（后端做），左上角跟着刷新
    // 换了身份（登录 / 登出 / 换账号）：旧身份那份余额当场收掉、左上角显示加载，等服务器（并完游客钱包）回来再摆——宁可转圈，不摆错的数
    if (auth() && auth().onChange) { let was = who(); auth().onChange(() => { const now = who(); if (now !== was) { was = now; switched(); } }); }
    // 老链接 /toolbox/puffcat/me/ 会跳到 ?me=1：进来直接打开档案（用 replaceState 去掉参数，不留历史）
    if (/[?&]me=1\b/.test(location.search)) {
      try { const u = new URL(location.href); u.searchParams.delete('me'); history.replaceState(history.state, '', u.toString()); } catch (_) { /* */ }
      setTimeout(openProfile, 600);
    }
  }
  /* 猫咪档案的数据（2026-11-23 用户：点开档案要等两秒）：
   *  ① 每次拿到都存一份在本机（按是谁存：换了账号 / 游客不混用），下次一点开先摆上次的，服务器回来再换成新的；
   *  ② 手指一按下左上角小鱼干就先去拿（松手时请求已经在路上了）；1.5 秒内的重复请求共用同一个；
   *  ③ 本机还没存过（第一次玩）：主页面摆好后闲下来先拿一份 */
  const PROF = 'zm.wprof.v1';
  let profP = null, profAt = 0, profBusy = 0, settledAt = 0;
  function profile(fresh) {
    if (!fresh && profP && Date.now() - profAt < 1500) return profP;
    profAt = Date.now();
    const me = who();
    profBusy++;
    profP = post('profile', null, true).then((p) => { try { ls.set(PROF, JSON.stringify({ who: me, t: Date.now(), p })); } catch (_) { /* 存不下就算了 */ } return p; });
    profP.catch(() => { profP = null; }).then(() => { profBusy--; });
    return profP;
  }
  const prevDay = (day) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() - 1); return ymd(d); };
  function profStale() {
    try { const c = JSON.parse(ls.get(PROF)); return !c || !c.p || c.who !== who() || !c.t || dayAt(c.t) !== today() || Date.now() - c.t > 60e3; } catch (_) { return true; }
  }
  /* 存的那份是昨天（或更早）拿的（2026-11-26 用户：新的一天进档案，签到要两三秒才能点）：
   * 按服务器同一套规则在本机先翻到今天——昨天签过连签接着算、断了归零；今日首胜「已领」清掉（待领的那份还在）。
   * 左上角那份（state）比存档新时，以它为准：今天已经签过 / 首胜刚领过 */
  /* 回主页面时档案还没更新完（2026-11-26 用户：排行榜那会儿来不及的话，回主页面跑一条和开场一样的进度条，后台拉完才跑满）：
   * 档案正在拉 / 存的是这局结算之前的 / 不是今天的 → 返回「拉完」的 Promise（最多等 5 秒）；已经是新的 → null（不跑进度条） */
  function profileWait() {
    let c = null;
    try { c = JSON.parse(ls.get(PROF)); } catch (_) { /* */ }
    const old = !c || !c.p || c.who !== who() || !c.t || dayAt(c.t) !== today() || c.t < settledAt;
    if (!profBusy && !old) return null;
    const p = profBusy && profP ? profP : profile(true);
    return Promise.race([p.catch(() => null), new Promise((r) => setTimeout(r, 5000))]);
  }
  function rollDay(p, t) {
    const now = today(), then = t ? dayAt(t) : now;
    if (then < now) {
      if (p.checkin) {
        const keep = p.checkin.today && then === prevDay(now), streak = keep ? p.checkin.streak : 0, cyc = p.checkin.cycle || [];
        p.checkin = Object.assign({}, p.checkin, { today: false, streak, next: cyc.length ? cyc[streak % cyc.length] : p.checkin.next });
      }
      if (p.firstWin) p.firstWin = Object.assign({}, p.firstWin, { done: false });
      p.winToday = false;
      p.today = now;
    }
    if (state && p.checkin && state.ck === now && !p.checkin.today) { p.checkin = Object.assign({}, p.checkin, { today: true, streak: p.checkin.streak + 1 }); p.ckDays = (p.ckDays || []).concat(now); }
    if (state && state.fw && state.t && state.t > (t || 0) && dayAt(state.t) === now) p.firstWin = Object.assign({}, p.firstWin || {}, state.fw);
    return p;
  }
  function profileCached() {
    try {
      const c = JSON.parse(ls.get(PROF));
      if (!c || !c.p || c.who !== who()) return null;
      if (state && state.bal != null) c.p.bal = state.bal;   // 余额以左上角为准（存档之后可能又打了几局）
      return rollDay(c.p, c.t);
    } catch (_) { return null; }
  }
  const first = Promise.resolve();
  let syncP = first;
  function switched() {
    state = null; shown = null; profP = null; syncing = true;
    ls.set(CACHE, 'null');
    listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } });
    const p = syncP = post('me', null, true).catch(() => null).then(() => { if (syncP === p) { syncing = false; paintChip(); } });
    return p;
  }
  /* 档案等这个：刚登录时先让「并游客钱包」那次请求回来，再拉档案（不然档案会先摆一份还没并的） */
  const synced = () => syncP;
  function openProfile() { if (root.ZhamaoProfile) root.ZhamaoProfile.open(); }
  function login() { if (auth() && auth().openLogin) auth().openLogin(); else openProfile(); }
  /* 和服务器对一下余额（不是进账）：回来的数直接摆，左上角不游鱼、不滚 */
  function refresh() {
    return post('me', null, true).catch(() => null);
  }
  /* 打开单机设置单时（2026-11-27 用户：钱不够不能开，但检查不能拖慢开局）：服务器一分钟没说过话就先对一下余额——
   * 一来「开始」时本机拿来判够不够的余额是新的；二来服务器（fly 闲置会睡，第一次叫醒要好几秒）趁玩家挑人数时就醒了，点「开始」那张门票一下就回 */
  function warm() { if (Date.now() - lastOk > 60e3) refresh().then(retryPending); }

  // ── 单机设置单：「开始」键上标这局门票 ──
  function priceTag(btn, tier, mode, n) {
    if (!btn) return;
    style();
    let tag = btn.querySelector('.zmw-cost');
    if (!tag) { tag = document.createElement('span'); tag.className = 'zmw-cost'; btn.appendChild(tag); }
    tag.innerHTML = FISH + price(tier, mode, n);
  }

  /* 会扣小鱼干的按钮一律带价格（2026-11-24 用户：教程进局、结算页「再来一局」、联机「下一局」都看不出要花鱼）：
   * 按钮文字后面挂一颗「鱼 + 门票」的小标签 */
  const tagHtml = (p) => '<span class="zmw-tag">' + FISH + fmt(p) + '</span>';
  function costTag(btn, p) {
    if (!btn || p == null) return;
    style();
    const old = btn.querySelector('.zmw-tag'); if (old) old.remove();
    btn.insertAdjacentHTML('beforeend', tagHtml(p));
    btn.setAttribute('aria-label', btn.textContent.replace(/[\d,]+$/, '').trim() + '，门票 ' + p + ' 小鱼干');
  }

  // ── 没结算成的单机局（网断了）：存在本机，下次打开游戏补上 ──
  const PEND = 'zm.wallet.pending';
  const pendList = () => { try { return JSON.parse(ls.get(PEND)) || []; } catch (_) { return []; } };
  const pkey = (x) => x.tid || (x.need && x.need.gid) || '';
  function keepPending(body) { const l = pendList().filter((x) => pkey(x) !== pkey(body)); l.push(Object.assign({ t: Date.now() }, body)); ls.set(PEND, JSON.stringify(l.slice(-10))); }
  function dropPending(key) { ls.set(PEND, JSON.stringify(pendList().filter((x) => pkey(x) !== key))); }
  /* 补结算。门票一直没扣上（整局都连不上服务器）的那种（need）：先扣票（同一个局号，服务器认得、不会扣两次），再结算——
   * 开了的局一定扣票、一定兑现（2026-11-27 用户）。服务器说余额不够扣票：这局作废（不扣也不发） */
  function retryPending() {
    const l = pendList().filter((x) => Date.now() - (x.t || 0) < 11 * 3600e3);
    ls.set(PEND, JSON.stringify(l));
    l.reduce((p, x) => p.then(() => {
      const b = Object.assign({}, x), key = pkey(x);
      delete b.t; delete b.need;
      const tk = x.need && !x.tid ? post('ticket', x.need, true).then((r) => { if (!r.tid) { dropPending(key); return false; } b.tid = r.tid; return true; }) : Promise.resolve(true);
      return tk.then((ok) => (ok ? post('settle', b, true).then(() => dropPending(key)) : null)).catch((e) => { if (e.status === 409 || e.status === 403 || e.status === 422) dropPending(key); });
    }), Promise.resolve());
  }

  // ── 单机：开局领票、记我的步数、结算 ──
  const pending = new WeakMap();
  function start(game, tier) {
    if (!game || game.tutorial || game.online) return;
    const st = game.state, mode = R.normalizeRules(st.rules).mode;
    // gid = 这局的局号：服务器按它认票，同一局重发几次也只扣一张（2026-11-27）
    const gid = String((game.hl && game.hl.id) || 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 32);
    const wt = game.wt = { n: st.n, mode, tier, all: 0, auto: 0, gid };
    return askTicket(game, wt);   // 返回：票回来后让牌桌再存一次档（门票号要跟着存档走）
  }
  /* 要门票（2026-11-27 用户：钱不够不能开、开了一定扣上票；但不能为了等票卡住开局）：
   * 开局不等它（发牌 / 抽角色本来就要几秒），后台要；服务器说余额不够 → 牌桌那边收掉这局、回主页面（onNoScore 看 wt.short）；
   * 连不上 / 服务器出错 → 隔 2、5、10、20 秒再要（同一个局号，不会扣两张）；一直要不到 → 记 need，结算时连票带结算排队，下次连上先扣票再结算 */
  const TK_GAP = [2000, 5000, 10000, 20000];
  function askTicket(game, wt, i) {
    i = i || 0;
    const p = post('ticket', { n: wt.n, mode: wt.mode, tier: wt.tier, gid: wt.gid }).then((r) => {
      if (wt.tid) return null;
      if (r.tid) { wt.tid = r.tid; wt.price = r.price; wt.bal0 = r.bal; wt.need = false; return null; }
      wt.short = true; noScore(game);
      return null;
    }, (e) => {
      if (wt.tid || wt.short) return null;
      if (e && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) { wt.off = true; noScore(game); return null; }   // 服务器不认（登录失效之类）：这局不计
      wt.need = true;
      if (i >= TK_GAP.length || game.wt !== wt || wt.done) return null;
      return new Promise((r) => setTimeout(r, TK_GAP[i])).then(() => (game.wt === wt && !wt.tid && !wt.short ? askTicket(game, wt, i + 1) : null));
    });
    if (!i) Object.defineProperty(wt, 'tp', { value: p, configurable: true, writable: true });   // 结算时还没回来就等它（不进存档）
    return p;
  }
  // 接着打上一局：存档里这局还没拿到票（开局时没连上）→ 接着要
  function resume(game) {
    const wt = game && game.wt;
    if (wt && !wt.tid && !wt.short && !wt.off && wt.gid) askTicket(game, wt);
  }
  /* 服务器没发票（余额对不上 / 连不上）：这局照样能打，但不计小鱼干——说一声，不再悄悄白玩（2026-11-24） */
  function noScore(game) {
    if (game && game.wt) game.wt.noScore = true;
    if (typeof api.onNoScore === 'function') { try { api.onNoScore(game); } catch (_) { /* */ } }
  }
  function act(game, seat, d, byAuto) {
    const wt = game && game.wt;
    if (!wt || seat !== 0 || game.pov || !d || d.type === 'pass') return;
    wt.all += 1;
    if (byAuto) wt.auto += 1;
  }
  const meOf = (game) => (game.pov ? (game.state.n - game.pov) % game.state.n : 0);
  /* 我的名次定下来了就结算（重复调用拿到同一个结果）；还定不下来 / 没票 → null */
  function settle(game) {
    if (!game || game.tutorial || game.online || !game.wt) return null;
    if (pending.has(game)) return pending.get(game);
    const wt = game.wt;
    if (wt.done) return Promise.resolve(wt.done);
    if (!wt.tid && (wt.short || wt.off || !wt.gid)) return null;
    const s = game.state, n = s.n, me = meOf(game);
    let body;
    if (R.isTeam && R.isTeam(s)) {
      if (s.phase !== 'over') return null;
      const mine = R.teamOf(s, me), seats = Array.from({ length: n }, (_, k) => k);
      // 队伍名次：赢的队第 1，输的队按「全队最后一人出局得越晚越靠前」（同排行榜 teamRankHtml）；个人名次：活着 = 1，否则 n − 第几个出局
      const lastOut = (t) => Math.max(...seats.filter((k) => R.teamOf(s, k) === t).map((k) => s.outOrder.indexOf(k)));
      const losers = [...new Set(seats.map((k) => R.teamOf(s, k)))].filter((t) => t !== s.winnerTeam).sort((a, b) => lastOut(b) - lastOut(a));
      const ko = s.outOrder.indexOf(me);
      body = { team: true, won: mine === s.winnerTeam, winners: seats.filter((k) => R.teamOf(s, k) === s.winnerTeam).length,
        trank: mine === s.winnerTeam ? 1 : losers.indexOf(mine) + 2, surv: seats.filter((k) => R.teamOf(s, k) === s.winnerTeam && s.alive[k]).length,
        prank: s.alive[me] || ko < 0 ? 1 : n - ko };
    } else {
      let rank = 0;
      if (s.phase === 'over' && s.winner === me) rank = 1;
      else if (!s.alive[me]) { const k = s.outOrder.indexOf(me); if (k >= 0) rank = n - k; }
      if (!rank) return null;
      body = { rank };
    }
    body.autoShare = wt.all ? wt.auto / wt.all : 0;
    // 当场估好（同服务器的算法）：结算页一出来就有数，服务器回来再对一下（首胜奖励只有服务器知道）
    const pay0 = payout({ tier: wt.tier, mode: wt.mode, n, rank: body.rank, team: body.team ? body : null, autoShare: body.autoShare });
    const floor = body.team ? (teamParts(n, body).floor ? body.prank : 0) : 0;   // 这局按个人名次保底结算：结算页说一句
    wt.rank = body.team ? (body.won ? 1 : body.trank) : body.rank;   // 结算页那一行写「第 N 名」
    const b0 = wt.bal0 != null ? wt.bal0 : state ? state.bal : 0;   // 买完票的余额
    const pr = wt.price != null ? wt.price : price(wt.tier, wt.mode, n);   // 票还没回来：按价目表
    let pay = pay0;
    if (pay > 0) pay = Math.min(pay, b0 + pr);   // 赢不超过买票前的余额（一局最多翻倍）
    else if (pay < 0) pay = -Math.min(-pay, Math.max(0, b0));   // 扣到 0 为止
    wt.est = { delta: pay - pr, pay, price: pr, firstWin: 0, bal: b0 + pay, est: true, auto: body.autoShare, floor };
    holdT();   // 牌桌左上角先停在结算前的数：等结算页一笔一笔游进去（服务器回来的余额不能先跳上去）
    if (state) state = Object.assign({}, state, { bal: wt.est.bal });   // 本机先记上（「再来一局」够不够按这个算），服务器回来会覆盖
    // 票还在路上（服务器刚醒 / 网慢）：等它回来再结算；一直没要到 → 连票带结算排队（need），下次连上先扣票再结算
    const p = (wt.tid ? Promise.resolve() : wt.tp || Promise.resolve()).then(() => {
      if (!wt.tid) {
        if (wt.need && !wt.short && !wt.off) keepPending(Object.assign({ need: { n, mode: wt.mode, tier: wt.tier, gid: wt.gid } }, body));
        pending.delete(game);
        return null;
      }
      body.tid = wt.tid;
      return post('settle', body, true).then((r) => { wt.done = { delta: r.delta, pay: r.pay, price: wt.price, firstWin: r.firstWin || 0, badges: Array.isArray(r.badges) ? r.badges : [], bal: r.bal, auto: body.autoShare, floor }; dropPending(wt.tid); return wt.done; })
        .catch((e) => {
          if (e.status === 409 || e.status === 403) { wt.done = { gone: true }; dropPending(wt.tid); return null; }
          keepPending(body);   // 网断了 / 服务器没回：记下来，下次打开游戏再补结算（票在服务器上留 12 小时）
          pending.delete(game);
          return null;
        });
    });
    pending.set(game, p);
    return p;
  }

  // ── 结算页 ──
  function slot() { style(); return '<div class="zmw-res" data-zmw-res><span class="zmw-wait"></span></div>'; }
  /* 托管替我走的比例：超过三成奖励减半、超过七成不发奖（规则同后端 AUTO_HALF / AUTO_ZERO）——2026-11-24 实测：托管拿第 1 却 −1,000，没一个字说明 */
  /* 2026-11-26 用户：底下不要文字说明，名次右上角挂一个小机器人标就够；点它才冒一句（不点完全没字） */
  const BOT_IC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="8" width="15" height="11" rx="3.5"/><path d="M12 4.5V8M9 13v1.2M15 13v1.2M2.5 13v2.5M21.5 13v2.5"/></svg>';
  function autoBadge(a) {
    a = Number(a) || 0;
    if (a <= 0.3) return '';
    const tip = a > 0.7 ? T('ui.wallet.autoZeroTip', '托管超过七成：赢的不发') : T('ui.wallet.autoHalfTip', '托管超过三成：赢的减半');
    return '<button type="button" class="zmw-bot" aria-label="' + tip + '">' + BOT_IC + '<em>' + tip + '</em></button>';
  }
  /* 组队输了、但个人撑到很后面：按个人名次保底（2026-11-26 方案乙）——说一句，不然看不懂为什么输了还没怎么扣 */
  function floorNote(k) { return k ? '<span class="zmw-note">' + T('ui.wallet.teamFloor', '你个人第 {k} 名，按个人名次保底结算', { k }) + '</span>' : ''; }
  /* ── 结算页（2026-11-26 用户：小鱼干后面一颗星 +1000 看不懂；勋章的 1 万悄悄进了余额；结算尽量少字）──
   * 结算窗只算这一局：底下一行「第 N 名  🐟 +奖励」——名次直接给的奖励（门票开局时已经从左上角扣过，这里不提、不算净赚）。
   * 余额看牌桌左上角常驻的小鱼干：奖励从这一行游进去、那边数字滚上去。
   * 今日首胜不在这里（去档案领）。排行榜一出来就放这局的奖励；新拿到的勋章（服务器回来才知道）等奖励放完再整页弹出（badgeShow，奖励当场游进左上角），点任意处回到排行榜 */
  const TICK = '<svg class="zmw-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#3f7a52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // 勋章名字 / 奖励 / 图：zhamao-medals.js（8 个系列 × 铜银金，同后端 lib/zhamao-econ.js BADGES）
  const MD = () => root.ZhamaoMedals || null;
  const BMETA = (id) => (MD() ? MD().meta(id) : null);
  const PF = () => root.ZhamaoProfile || null;
  const bSvg = (id) => (MD() ? MD().of(id) : '');
  const wait = (ms) => new Promise((r) => setTimeout(r, FX() && FX().reduce() ? 0 : ms));
  function payOf(r) { return r.pay != null ? r.pay : (r.delta || 0) + (r.price || 0) - (r.firstWin || 0); }   // 2026-11-26 起结算能为负（扣钱）
  const sgn = (v) => (v < 0 ? '−' : '+');
  function paintPay(el, r, label, quiet) {
    const inl = el.classList.contains('is-inline');   // 揉进排行榜里（2026-11-27）：不写「第 N 名」，机器人标挂到我头像右上角
    el.classList.add(inl ? 'is-in' : 'is-lines');
    const pay = payOf(r);
    const botTo = inl ? (el.closest('.zm-dialog') || document).querySelector('[data-zmw-bot]') : null;
    if (botTo) botTo.innerHTML = autoBadge(r.auto);
    el.innerHTML = '<div class="zmw-ln is-main">' + (inl ? '' : '<span>' + label + autoBadge(r.auto) + '</span>') + '<b class="' + (pay > 0 ? 'is-up' : pay < 0 ? 'is-down' : '') + '">' + FISH + '<i>' + sgn(pay) + (quiet ? fmt(pay) : '0') + '</i></b></div>' + (inl ? '' : floorNote(r.floor));
    const bot = (botTo || el).querySelector('.zmw-bot');
    if (bot) bot.addEventListener('click', (e) => { e.stopPropagation(); bot.classList.toggle('is-open'); clearTimeout(bot.__t); if (bot.classList.contains('is-open')) bot.__t = setTimeout(() => bot.classList.remove('is-open'), 2600); });
  }
  function countUp(el, pay) {
    const i = el.querySelector('.zmw-ln b i');
    if (!i || !pay || (FX() && FX().reduce())) { if (i) i.textContent = sgn(pay) + fmt(pay); return; }
    const t0 = performance.now(), dur = 700;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); if (i.isConnected) i.textContent = sgn(pay) + fmt(pay * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const rankLabel = (k) => (k ? T('ui.wallet.rankN', '第 {n} 名', { n: k }) : T('ui.wallet.rankPay', '名次奖励'));

  /* 一局只放一次：重新打开排行榜就照最后的样子摆，不再游一遍 */
  function settleSeq(game, el, label, base, r0, later) {
    const seq = game.wSeq || (game.wSeq = {});
    liftT(true);
    if (seq.r) { paintPay(el, seq.r, label, true); return; }
    holdT();
    if (base != null) setT(Math.max(0, base + adj()));   // base 是服务器余额：摆的时候也算上内测的本机加减
    const gen = tGen;
    paintPay(el, r0, label);
    seq.r = r0;
    const line = el.querySelector('.zmw-ln');
    // 2026-11-26 用户：排行榜一出来小鱼干就要动（以前先等服务器最多 1.6 秒 + 再等 1.1 秒，进排行榜两秒多才加）。
    // 现在当场按本机估的数（单机同服务器算法 / 联机服务器已经在这局视图里给了）放：这一行数字往上数、鱼同时游向左上角、左上角跟着滚。
    // 服务器回来如果数不一样：放完这笔后这一行改成服务器的数，左上角在 releaseT 里滚到服务器余额。
    // 新勋章只有服务器知道：等这局的奖励放完再整页弹（排队，不会叠在一起）
    const amt0 = payOf(r0);
    countUp(el, amt0);
    tQ = tQ.then(() => tAdd(line && line.isConnected ? line.querySelector('b') : el, amt0, gen, 0, true, true));
    const finish = (r) => {
      if (gen !== tGen) return;
      if (r) {
        seq.r = r;
        if (payOf(r) !== amt0) tQ = tQ.then(() => { if (gen === tGen && el.isConnected) paintPay(el, r, label, true); });
      }
      const bs = ((r && r.badges) || []).filter((id) => BMETA(id));
      bs.forEach((id) => { tQ = tQ.then(() => (gen === tGen ? wait(300).then(() => badgeShow(id, gen)) : null)); });
      tQ = tQ.then(() => { if (gen === tGen) releaseT(); });
      // 看排行榜这会儿（2026-11-26 用户：最可能接着点回主页面 / 进档案）：后台把档案拉一份新的，进档案时流水不再跳
      settledAt = Date.now();
      setTimeout(() => profile(true).catch(() => null), 300);
    };
    Promise.resolve(later()).then(finish, () => finish(null));
  }
  function fill(dialog, p, game) {
    const el = dialog && dialog.querySelector('[data-zmw-res]');
    if (!el) return;
    if (!p) { el.remove(); return; }
    const wt = (game && game.wt) || {};
    const est = wt.done || wt.est;
    settleSeq(game, el, rankLabel(wt.rank), wt.bal0, est || { pay: 0 }, () => Promise.resolve(p).then((r) => (r && !r.gone && r.delta != null ? r : null)));
  }
  /* 联机：服务器在这局的视图里给了我的 { price, pay, d, refund, rank? }；勋章另外记账——等一下再拉一次（me），跟开局时记下的比 */
  function fillOnline(dialog, pay, game) {
    const el = dialog && dialog.querySelector('[data-zmw-res]');
    if (!el) return;
    if (!pay || pay.refund || !game) { el.remove(); return; }
    const r0 = { pay: pay.pay != null ? pay.pay : pay.d + (pay.price || 0), auto: pay.auto };
    settleSeq(game, el, rankLabel(pay.rank), null, r0, () => wait(900).then(refresh).then((j) => {
      if (!j || !state) return r0;
      const had = game.wBadges || [], fresh = (state.badges || []).filter((b) => had.indexOf(b) < 0);
      game.wBadges = (state.badges || []).slice();
      return Object.assign({}, r0, { badges: fresh });
    }));
  }

  // ── 牌桌左上角常驻小鱼干（2026-11-26 用户挑方案 A）──
  // 一直显示余额；结算时余额不跟着服务器跳，停在结算前（holdT），一笔一笔游进来（tAdd 排队），放完再对一次（releaseT）
  let tchip = null, tTop = null, tShown = null, held = false, tGen = 0, tQ = Promise.resolve();
  function mountTable(topleft) {
    style();
    if (!topleft || tchip) return;
    tTop = topleft;
    tchip = document.createElement('span');
    tchip.className = 'zmw-tchip';
    tchip.setAttribute('role', 'img');
    tchip.innerHTML = FISH + '<b></b>';
    topleft.insertBefore(tchip, topleft.firstChild);
    paintT();
    listeners.push(paintT);
  }
  function setT(v) {
    tShown = v;
    if (!tchip) return;
    const b = tchip.querySelector('b'); b.__zmwRoll = {}; b.textContent = fmt(v);
    tchip.setAttribute('aria-label', T('ui.wallet.title', '小鱼干') + ' ' + fmt(v));
  }
  function paintT() {
    if (!tchip) return;
    const has = !!(state && state.bal != null);
    tchip.hidden = !has;
    tTop.classList.toggle('has-zmw', has);
    if (!has || held || tShown === vb()) return;
    if (quiet) { setT(vb()); return; }   // 和服务器对数：直接摆
    // 平时（打着牌、联机开局扣门票）余额变了：数字滚过去（加绿、减红），不跳
    const fx = FX(), from = tShown;
    if (from != null && fx && fxOn() && tchip.offsetParent !== null) { tShown = vb(); fx.roll(tchip.querySelector('b'), from, vb(), 520).then(() => { if (!held && tShown === vb()) setT(vb()); }); }
    else setT(vb());
  }
  function holdT() { if (!held) { held = true; if (tShown == null && state && state.bal != null) tShown = vb(); } }
  function releaseT() {
    held = false;
    if (!state || state.bal == null) return;
    shown = vb(); if (chip) chip.querySelector('b').textContent = fmt(vb());   // 主页面那个不再重放一遍进账
    if (tchip && tShown !== vb()) {
      const fx = FX(), b = tchip.querySelector('b'), from = tShown;
      tShown = vb();
      if (fx && fxOn() && tchip.offsetParent !== null && from != null) fx.roll(b, from, vb(), 420).then(() => { if (!held) setT(vb()); }); else setT(vb());
    }
  }
  /* 一笔进账 / 出账（排队）：amt > 0 鱼从 from 游进左上角，< 0 从左上角游到 from；数字跟着滚 */
  function tAdd(from, amt, gen, delay, now, rollNow) {
    const step = () => new Promise((res) => {
      if (gen !== tGen || !amt) { res(); return; }
      const fx = FX(), b = tchip && tchip.querySelector('b'), a = tShown != null ? tShown : (state && state.bal != null ? vb() : 0), z = a + amt;
      tShown = z;
      const done = () => { if (gen === tGen) setT(z); res(); };
      if (!tchip || !fx || !fxOn() || tchip.offsetParent === null || !from || !from.isConnected) { done(); return; }
      const n = Math.min(6, 2 + Math.round(Math.log10(Math.max(10, Math.abs(amt))) - 1));
      setTimeout(() => {
        if (gen !== tGen) { res(); return; }
        const o = { spread: 24, gap: 80, dur: 760, lift: -50, size: 26 };
        const go = amt > 0
          ? (rollNow && fx.roll(b, a, z, 1000), fx.school(FISH, from, tchip, n, Object.assign(o, rollNow ? {} : { onLand: () => fx.roll(b, a, z, 600) })))
          : (fx.roll(b, a, z, 1000), fx.school(FISH, tchip, from, n, Object.assign(o, { lift: 30, toPoint: center(from) })));
        go.then(() => setTimeout(done, 260));
      }, delay || 0);
    });
    const p = now ? step() : (tQ = tQ.then(step));
    return p;
  }
  /* 联机「再来一局 / 准备」（2026-11-27 用户：点了当场扣门票，没开成退回）：on = 几条鱼从左上角游进按钮、数字往下滚；
   * off = 从按钮游回左上角、数字往上滚。服务器那边同时扣 / 退，回来后 refresh 对数（一样就不动） */
  function holdFx(btn, p, on) {
    const from = tchip && tchip.offsetParent !== null ? tchip : null;
    if (!p || !from || !btn || !state || state.bal == null) return Promise.resolve();
    if (on) return vb() < p ? Promise.resolve() : fishPay(p, from, btn).then(() => {});
    const fx = FX();
    cancelFx();
    const b = from.querySelector('b'), a = tShown != null ? tShown : vb(), z = a + p;
    tGen++; tShown = z; held = false; state = Object.assign({}, state, { bal: state.bal + p });
    if (!fx || !fxOn()) { setT(z); return Promise.resolve(); }
    fx.roll(b, a, z, 700);
    return fx.school(FISH, btn, from, 3, { spread: 14, gap: 70, dur: 700, lift: -40, size: 26 }).then(() => { if (tShown === z) setT(z); });
  }
  /* 换一局 / 回房间：上一局没放完的一律收掉，左上角对成现在的余额；记下开局时的勋章、今天赢没赢过（联机结算时比对） */
  function tableStart(game) {
    tGen++; tQ = Promise.resolve(); held = false;
    const ov = document.querySelector('.zmw-bdg'); if (ov) ov.remove();
    liftT(false);
    if (game) { game.wBadges = state && state.badges ? state.badges.slice() : []; game.wWin = state && state.winToday != null ? !!state.winToday : null; }
    if (game && !game.online && state && state.bal != null) setT(vb());   // 单机：门票在主页面已经扣着放过了，进牌桌直接摆扣完的数（2026-11-27 用户：进局余额没马上变）
    paintT();
    if (game && game.online) setTimeout(() => { if (!held) refresh(); }, 1500);   // 联机门票在服务器上扣：拉一次，左上角对上
  }
  /* 结算页开着：左上角小鱼干浮在蒙版上面（排行榜往下让一点），关掉就落回去 */
  let liftObs = null;
  function liftT(on) {
    if (!tchip) return;
    const mask = document.getElementById('zmDialogMask');
    tchip.classList.toggle('is-lift', !!on);
    if (mask) mask.classList.toggle('is-wal', !!on);
    if (on && mask && root.MutationObserver && !liftObs) {
      liftObs = new MutationObserver(() => { if (mask.hidden) { liftObs.disconnect(); liftObs = null; liftT(false); } });
      liftObs.observe(mask, { attributes: true, attributeFilter: ['hidden'] });
    }
  }

  /* 解锁勋章（2026-11-26 用户）：整页压一层深色蒙版，中间勋章（光芒 + 彩纸）、名字、怎么拿到的、奖励；
   * 奖励的鱼当场从奖励那颗胶囊游进左上角。「查看」= 打开档案里这枚勋章；「关闭」= 回到排行榜。关掉才放下一枚 */
  function badgeShow(id, gen) {
    style();
    const app = document.getElementById('zmApp') || document.body;
    const md = BMETA(id) || { name: id, reward: 0, tier: 1, how: '' }, meta = [md.name, md.reward];
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'zmw-bdg';
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', T('ui.wallet.badgeGot', '解锁勋章') + ' ' + meta[0]);
      const cols = ['#e9b949', '#c8463a', '#3f7a52', '#2f4a6d', '#fffdf8', '#e58e46'];
      let cf = '';
      for (let i = 0; i < 28; i++) { const a = (i * 137.5) * Math.PI / 180, d = 110 + ((i * 53) % 110); cf += '<i class="cf" style="background:' + cols[i % 6] + ';--x:' + Math.round(Math.cos(a) * d) + 'px;--y:' + Math.round(Math.sin(a) * d * 0.9 + 40) + 'px;--r:' + ((i * 97) % 540) + 'deg;animation-delay:' + (180 + (i % 5) * 30) + 'ms"></i>'; }
      const how = md.how;
      // 铜 → 银 → 金：上面三颗小勋章，这次拿到的那颗亮起（2026-11-26 勋章改版）
      const steps = MD() && md.series ? '<div class="steps">' + [1, 2, 3].map((t) => '<span class="' + (t < md.tier ? 'had' : t === md.tier ? 'cur' : '') + '">' + MD().svg(md.series, t <= md.tier ? t : 0) + '</span>').join('') + '</div>' : '';
      m.innerHTML = cf + steps + '<div class="art"><div class="rays"></div>' + bSvg(id) + '</div>' +
        '<div class="txt"><div class="kick">' + (md.tier > 1 ? T('ui.wallet.badgeUp', '勋章升级') : T('ui.wallet.badgeGot', '解锁勋章')) + '</div><h3>' + meta[0] + '</h3>' + (how ? '<div class="how">' + how + '</div>' : '') +
        '<div class="rw">' + FISH + '+' + fmt(meta[1]) + '</div>' +
        '<div class="tap">' + T('tut.tapOn', '点任意处继续') + '</div></div>';
      app.appendChild(m);
      const art = m.querySelector('.art svg'), rw = m.querySelector('.rw');
      if (!(FX() && FX().reduce())) {
        m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
        if (art) art.animate([{ transform: 'scale(.2) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.12) rotate(6deg)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.3,.8,.4,1)' });
        m.querySelectorAll('.steps .cur svg').forEach((n) => n.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 520, easing: 'ease-out', fill: 'backwards' }));
        m.querySelector('.txt').animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 260, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' });
      }
      if (root.ZhamaoAudio && root.ZhamaoAudio.sfx) { try { root.ZhamaoAudio.sfx('win'); } catch (_) { /* */ } }
      let closed = false;
      // 奖励的鱼游进左上角；游完那颗胶囊变淡、前面打个勾（2026-11-26 用户：留着，看得清拿了多少）
      wait(700).then(() => (closed ? null : tAdd(rw, meta[1], gen, 0, true))).then(() => { rw.classList.add('is-spent'); rw.insertAdjacentHTML('afterbegin', TICK); });
      const t0 = Date.now();
      const end = () => {
        if (closed || Date.now() - t0 < 600) return;   // 刚弹出来那一下的误触不算
        closed = true;
        markBadgesSeen([id]);
        const out = () => { m.remove(); resolve(); };
        if (FX() && FX().reduce()) out(); else m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).onfinish = out;
      };
      // 2026-11-26 用户：不要「查看」「关闭」——点任意处继续，回到排行榜（勋章在档案里随时能看）
      m.addEventListener('click', end);
      m.tabIndex = -1; m.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') end(); });
      setTimeout(() => m.focus({ preventScroll: true }), 50);
    });
  }

  const api = root.ZhamaoWallet = {
    BASE, FISH, price, loggedIn, deviceId,
    state: () => state, onChange: (f) => listeners.push(f),
    me: refresh,
    checkin: () => post('checkin').then((j) => { state = Object.assign({}, state || {}, { ck: today() }); ls.set(CACHE, JSON.stringify(state)); listeners.forEach((f) => { try { f(state); } catch (_) { /* */ } }); return j; }), profile, profileCached, profileWait, synced, who, today, fb: (steps) => post('fb', { steps }).catch(() => null), fbAward,
    ledger: (offset) => post('ledger', { offset }), costTag, tagHtml, onNoScore: null, warm, resume,
    beta, item, task, itemKey,
    nudge: (q) => { quiet = !!q; try { paintChip(); paintT(); } finally { quiet = false; } },   // 内测本机加减变了：左上角跟着滚（q = 直接摆）
    mountChip, mountTable, tableStart, holdFx, refresh, tableChip: () => tchip, badgeShow, claimFirstWin, priceTag, start, act, settle, slot, fill, fillOnline, openProfile, login, markBadgesSeen, seenBadges, fxOn, playTicket, pay, canPay, cancelFx, payout, topUp,
    __demo: { setShown: (x) => { shown = x; if (chip) chip.querySelector('b').textContent = fmt(x); }, repaint: () => paintChip() },
  };
})(window);
