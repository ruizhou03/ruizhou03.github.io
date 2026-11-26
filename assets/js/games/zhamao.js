/* 猫咪炸毛 · 单机牌桌（我 + 1–4 只机器猫）。规则 zhamao-rules.js，机器人 zhamao-ai.js，牌面 zhamao-art.js，
 * 动画引擎 zhamao-fx.js，教程剧本 zhamao-tutorial.js，声音 zhamao-audio.js。
 * 座位：0 是我（下方），出牌顺序 0 → 1 → 2 …，桌上画成逆时针：1 号在右上，最后一号在左上。
 * 流程：每次改完状态都回到 step()，它看 state.phase 决定等我操作还是让机器人走。
 * 显示和规则分开：改状态前先把「桌上看得到的样子」拍一张（ov），动画按引擎返回的事件一个个播，
 * 播到哪一步 ov 就改到哪一步——牌飞到了，手牌数才加一；炸弹猫塞回去了，牌堆数才加一。全部播完 ov 清空、按真状态重画。 */
(() => {
  'use strict';

  const R = window.ZhamaoRules;
  const T = R.T;   // 多语言：T('键', '简体原文', { 占位 })，见 zhamao-rules.js。站点网页不装语言包时原样返回简体
  const LANG = R.lang();
  const AI = window.ZhamaoAI;
  const HL = window.ZhamaoHlog || null;   // 真人单机对局匿名日志（zhamao-hlog.js，2026-11-19）
  const WAL = window.ZhamaoWallet || null;   // 小鱼干（zhamao-wallet.js，2026-11-22）：单机开局领票、名次定下来就结算
  const ART = window.ZhamaoArt;
  const AV = window.GongzhuAvatars || null;
  const TUT = window.ZhamaoTutorial || null;

  const STORE_KEY = 'zm.game.v1';
  const SETTINGS_KEY = 'zm.settings.v1';
  const TUT_KEY = 'zm.tut.v1';
  const VERSION = 1;

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('zmApp'), table: $('zmTable'), opps: $('zmOpps'), center: $('zmCenter'),
    deck: $('zmDeck'), deckCount: $('zmDeckCount'), kit: $('zmKit'), discard: $('zmDiscard'), stage: $('zmStage'),
    coach: $('zmCoach'), me: $('zmMe'), hint: $('zmHint'), hand: $('zmHand'), fly: $('zmFly'), under: $('zmUnder'),
    drawBtn: $('zmDrawBtn'), playBtn: $('zmPlayBtn'), nopeBtn: $('zmNopeBtn'), cancelBtn: $('zmCancelBtn'),
    cover: $('zmCover'), mask: $('zmDialogMask'), dialog: $('zmDialog'), skipTut: $('zmSkipTut'),
  };
  /* 2026-11-14 用户看过预览后定稿：
   * 甩锅标记 = 扣锅（锅扣在头上写 ×N）；甩锅动画 = 乙（一口大锅在头顶翻个面「哐」地扣下去，×1 一路数到 ×N），甩给对手 / 甩给我都一样
   * 联机改名 / 换头像 = 乙（换牌匾：旧名往上滑走、新名从下面滑上来；新头像从中间晕开盖住旧的）
   * 6–9 人那一排名字按宽度截（8–9 人最多 3 个汉字宽、6–7 人 4 个），不加「…」、轮到谁也不展开全名
   * （代码里还按这几个开关分支走，开关在这里一次定死） */
  /* 入口页（index.html）里写死的简体文案：标了 data-i18n（正文）/ data-i18n-aria（aria-label）/ data-i18n-ph（placeholder）的，
   * 繁体 / 英文界面启动时按语言包换掉；简体一律不动（站点网页和以前一字不差） */
  if (LANG !== 'zh-Hans') document.querySelectorAll('[data-i18n],[data-i18n-aria],[data-i18n-ph]').forEach((el) => {
    if (el.dataset.i18n) el.textContent = T(el.dataset.i18n, el.textContent);
    if (el.dataset.i18nAria) el.setAttribute('aria-label', T(el.dataset.i18nAria, el.getAttribute('aria-label')));
    if (el.dataset.i18nPh) el.setAttribute('placeholder', T(el.dataset.i18nPh, el.getAttribute('placeholder')));
  });
  Object.assign(els.app.dataset, { uivTurns: 'hat', uivAtk: 'b', uivRename: 'slide', uivNames: 'cut' });

  const snd = (name, delay) => { if (window.ZhamaoAudio) window.ZhamaoAudio.sfx(name, delay); };
  const fx = window.ZhamaoFx.create(els.fly, { sound: snd, speed: () => (game && game.turbo ? 5 : 1) });   // 快进时特效减量、清理也按倍速（见 zhamao-fx.js）

  // 节奏（毫秒）：机器人想一下、反应窗、飞牌、停顿
  const PACE = { bot: 760, react: 2800, quiet: 260, botNope: [500, 1100], fly: 460, k: 1 };
  const FAST = { bot: 240, react: 0, quiet: 120, botNope: [200, 300], fly: 260, k: 0.55 };
  const TUT_PACE = { bot: 1050, react: 0, quiet: 500, botNope: [900, 900], fly: 540, k: 1.2 };
  // 联机里真人都出局了、点了桌沿右下角的快进：剩下机器猫的出牌按 5 倍速播完（2026-11-14 用户）
  const TURBO = { bot: 150, react: 0, quiet: 50, botNope: [100, 200], fly: 120, k: 0.2 };
  // 我出局后加速看完：等我那一下炸完、手牌全落进弃牌堆（game.fastOut，animOut 最后才置上）才快起来，别把我自己的出局动画也快进了
  // 联机（2026-11-17 用户）：我出局了但还有别的真人在打——照常速度；真人全出局了才加速（右下角同时出 ⏩）
  // 联机落后了（网卡了一阵，攒了一串没播的动作）：先按快档追上大家，追上了再回原速（2026-11-17）
  const pace = () => (game && game.tutorial ? TUT_PACE : game && game.turbo ? TURBO : game && ((game.fastOut && !mateWatching() && (!game.online || humansOutHere())) || (game.online && online && online.behind)) ? FAST : PACE);
  const ms = (x) => Math.round(x * pace().k);
  /* 加速看完（我出局后的快档 / ⏩ 快进）时，窥探、改命只演「拿起来看一眼、放回去」的动作，不摊开牌面、不等「知道了」——
   * 坐到谁背后观战、他自己打的也一样（2026-11-20 用户：加速时窥探的窗口展开没跟着快）。我自己还活着在打时照常摊给我看 */
  const meLive = () => {
    if (!game || !game.state || game.spectator) return false;
    if (game.online) { const g = G(), st = online && online.st; return !!(g && st && st.mySeat >= 0 && g.st && g.st.alive && g.st.alive[st.mySeat]); }
    return !!game.state.alive[meSeat()];
  };
  const glance = () => { const p = pace(); return (p === FAST || p === TURBO) && !meLive(); };
  // 组队：我出局了但队友还在打——照常速度，坐在队友身后看他的牌（2026-11-15 巡查）
  /* 单机观战 = 真的换到那只机器猫的视角（2026-11-17 用户：「切到对家就直接是对家的视角，我和其他人相对他的位置都跟着变，
   * 和他手机上看到的一模一样，只是没有出牌按钮」）：game.pov = 被看那家原来的座位号；game.state 里所有座位都按他重新编号（他是 0 号、坐在底下），
   * 和联机按 viewBase 转桌是同一个做法。我自己这时坐在 meSeat() */
  const meSeat = () => (game && !game.online && game.pov && game.state ? (game.state.n - game.pov) % game.state.n : 0);
  // 组队：我出局了、队里还有人在打（2026-11-18 起一队可以 2–4 人）——第一个还活着的队友
  const liveMate = () => { const s = game && game.state; if (!s || !R.isTeam || !R.isTeam(s)) return -1; const m = R.matesOf(s, meSeat()).find((k) => s.alive[k]); return m == null ? -1 : m; };
  const mateWatching = () => !!(game && !game.online && game.state && R.isTeam && R.isTeam(game.state) && !game.state.alive[meSeat()] && liveMate() >= 0 && game.state.phase !== 'over');

  const FUR = ['#3a3632', '#4a4540', '#2a2622', '#5c5650'];
  const GOLDS = ['#c9a96e', '#dcb86c', '#e9d46a'];
  const PURPLES = ['#7a5a96', '#9b7cb6', '#c4a8dc'];
  const PINKS = ['#e0566e', '#ef8f9f', '#f4b6c0'];
  const CONFETTI = ['#c8463a', '#c9a96e', '#2f4a6d', '#4f8a5f', '#e0893e', '#7a5a96', '#e0566e'];

  /* ───── 存档 / 设置 ───── */
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式：不存也能玩 */ } }
  const settings = Object.assign({ players: 4, tier: 'normal', turnSec: 20 }, readJSON(SETTINGS_KEY) || {});
  // 2026-11-12 起甩锅默认叠加：老设置里存的「不叠加」是当时的默认值，改成新默认（之后自己再改就记住）
  if (settings.rulesV !== 2 && settings.rulesV !== 3) { settings.rules = Object.assign({}, settings.rules, { stackAttack: true }); settings.rulesV = 2; }
  // 2026-11-13 起「多的逗猫棒全放回」默认开：老设置里存的「最多放回 2 张」是当时的默认值，改成新默认（之后自己再关就记住）
  if (settings.rulesV !== 3) { settings.rules = Object.assign({}, settings.rules, { extraDefuse: 'all' }); settings.rulesV = 3; }
  // 2026-11-25 用户：开关改成「塞回看不出位置」、默认打开（= 规则 insertSeen 默认关）；老设置里存的「看得出」是当时的默认值，改成新默认一次（之后自己再关就记住）
  if (settings.hideInsV !== 1) { settings.rules = Object.assign({}, settings.rules, { insertSeen: false }); settings.hideInsV = 1; }
  settings.rules = R.normalizeRules(settings.rules);
  if (!(settings.players >= R.MIN_PLAYERS && settings.players <= R.MAX_PLAYERS)) settings.players = 4;
  if (AI.TIERS.indexOf(settings.tier) < 0) settings.tier = 'normal';
  const saveSettings = () => writeJSON(SETTINGS_KEY, settings);

  let game = null;      // { state, bots: [{nick, avatar}], tiers: [], tutorial }
  let token = 0;        // 重开 / 退出时作废旧的异步流程
  let busy = true;      // 动画中、机器人思考中：不接我的操作
  let selected = [];    // 我选中的手牌 id
  let mode = null;      // null | 'target'（点一个人）| 'give'（挑一张给人）
  let targetCb = null;
  let reactTimer = null;
  let tut = null;       // 教程控制器（见 zhamao-tutorial.js）
  let ov = null;        // 动画期间桌上显示的样子（见文件头）
  let autopilot = false; // 托管：我的每一步交给机器猫（点自己头像进 / 出；连着两回合超时自动进）
  let timeouts = 0;      // 连着超时几次（我自己动一下就清零）
  let viewSeat = -1;     // 我出局后坐到哪只机器猫背后看它的手牌（-1 = 不看）
  let autoAct = false;   // 这一步是超时 / 托管替我做的（不清零超时次数）
  const handHidden = new Set();   // 手牌里「位置先占好、牌还在路上」的那几张
  /* 已经离手、摆上桌还没真出的牌（先摆上桌再选人 / 联机乐观出牌）：手牌里直接不画、剩下的牌立刻滑过去收拢
   * （2026-11-26 用户：打出对子 / 三张去偷时，手牌原地空着位置僵着等，很怪）。取消 / 没出成 = 位置重新让开、牌飞回来 */
  const handOut = new Set();

  /* 兜底（2026-11-18 用户）：离开超过半小时，这局就算结束了——不再挂小黄点 / 「接着打上一局」、联机也不再自动接回那个房间。
   * 「离开」从最后一次存档算起：每步都存、切后台 / 关页面 / 回主页面也会存一次，所以就是「最后一次还在玩」的时候 */
  const STALE_MS = 30 * 60 * 1000;
  function save() {
    if (!game || game.tutorial || game.online || game.stale) return;
    if (game.state.phase === 'over') { try { localStorage.removeItem(STORE_KEY); } catch (_) { /* 无痕 */ } return; }
    const back = game.pov ? game.state.n - game.pov : 0;   // 观战时桌子是转过的：存回我自己坐在 0 号的样子
    writeJSON(STORE_KEY, { v: VERSION, t: Date.now(), state: rotState(game.state, back), bots: rotSeats(game.bots, back), tiers: rotSeats(game.tiers, back), openKits: game.openKits ? Array.from(game.openKits) : [], hl: game.hl || null, wt: game.wt || null });   // 火眼露在牌堆里的那几只也存上
  }
  function loadSaved() {
    const d = readJSON(STORE_KEY);
    if (!d || d.v !== VERSION || !d.state || d.state.phase === 'over') return null;
    if (!(Date.now() - (d.t || 0) < STALE_MS)) { try { localStorage.removeItem(STORE_KEY); } catch (_) { /* 无痕 */ } return null; }   // 没时间戳的老存档也按过期算
    const s = d.state;
    const total = s.deck.length + s.discard.length + s.removed.length + s.hands.reduce((a, h) => a + h.length, 0) + (s.defuse ? 1 : 0) + (s.rescue ? 1 : 0) + (s.save ? 1 : 0);   // 急救挑对子时那只炸弹猫也算上；组队：等队友救的那只炸弹猫也算上（2026-11-15 漏了它，停在这一步的存档读不回来）
    // 旧存档：加「抽底」前是 64 张、加第二副（6–9 人）前是 68 张、加万能猫前是 135 张。没出现过的牌全收进盒子（removed），照样接着打（那局就没有万能猫）
    if ((total !== R.DECK_SIZE && R.LEGACY_SIZES.indexOf(total) < 0) || !Array.isArray(d.tiers) || d.tiers.length !== s.n) return null;
    s.rules = R.normalizeRules(s.rules);   // 老存档的规则按现在的来（例如甩锅一律叠加）
    if (total !== R.DECK_SIZE) {
      const seen = new Set(s.deck.concat(s.discard, s.removed, ...s.hands, s.defuse ? [s.defuse.card] : [], s.rescue ? [s.rescue.card] : [], s.save ? [s.save.card] : []));
      for (let id = 0; id < R.DECK_SIZE; id++) if (!seen.has(id)) s.removed.push(id);
    }
    return d;
  }

  /* ───── 我的名字和头像（照拱猪）─────
   * 存在本机；名字和站里其他游戏共用（GamesShell.Identity）。没填过名字就随机起一个：一堆猫的品种 + 拱猪那套带烟火气的两字名 */
  const PROFILE_KEY = 'zm.profile.v1';
  const CAT_NICKS = ['三花', '暹罗', '金渐层', '银渐层', '布偶', '橘座', '狸花', '奶牛', '英短', '美短', '缅因', '波斯', '玳瑁', '无毛',
    '折耳', '狮子猫', '德文', '加菲', '豹猫', '孟加拉', '挪威森林', '俄罗斯蓝', '乌云踏雪', '煤球', '雪球', '黑猫警长'];
  const ident = () => (window.GamesShell && window.GamesShell.Identity) || null;
  // 多语言：繁体 / 英文没有拱猪那套两字名，只用语言包里的一串猫名（顿号分隔，下面机器猫名字同理）
  const L_NICKS = LANG === 'zh-Hans' ? null : T('nick.cats', '三花、暹罗、金渐层、银渐层、布偶、橘座、狸花、奶牛、英短、美短、缅因、波斯、玳瑁、无毛、折耳、狮子猫、德文、加菲、豹猫、孟加拉、挪威森林、俄罗斯蓝、乌云踏雪、煤球、雪球、黑猫警长').split('、');
  const randomNick = () => { const pool = L_NICKS || CAT_NICKS.concat(AV ? AV.NICKS : []); return pool[(Math.random() * pool.length) | 0]; };
  function loadProfile() {
    const p = readJSON(PROFILE_KEY) || {};
    const shared = ident() && ident().getNick ? ident().getNick() : null;
    const nick = shared || p.nick || randomNick();
    const avatar = p.avatar && AV && AV.byId[p.avatar] ? p.avatar : (AV ? 'cat' : null);
    if (nick !== p.nick || avatar !== p.avatar) writeJSON(PROFILE_KEY, { nick, avatar });
    return { nick, avatar };
  }
  let profile = loadProfile();
  // 把我的名字 / 头像套到这一局（存档里记的是旧的也换成现在的）
  function applyProfile() {
    if (!game || game.tutorial) return;
    /* 联机里坐到别人背后看时，下面那个座位是被看的人，不是我（2026-11-17 用户：切到贝塔视角再改名，贝塔的名字头像被改了一下又变回去）。
     * 改的永远是我自己那一座；纯观战的人桌上没有自己的座位，等服务器回来就行 */
    const me = !game.online ? meSeat() : online && online.st && online.st.mySeat >= 0 ? locOf(online.st.mySeat) : -1;
    if (me < 0) return;
    const o = game.bots[me];
    game.bots[me] = { nick: profile.nick, avatar: profile.avatar };
    const box = seatEl(me);
    if (els.app.dataset.uivRename && o && box && box.querySelector('.zm-av')) { renameFx(me, o); return; }
    if (box) { box.innerHTML = ''; renderSeat(me); }
  }
  /* 预览（本机对比，未定）：联机时有人改了名字 / 头像，大家看到的那个座位怎么换（data-uiv-rename）
   * 以前：名字直接跳成新的，头像要到下一局才换。
   * flip  翻牌：头像像翻一张牌，翻过去背面就是新头像；名字同时上下翻一下
   * slide 换牌匾：旧名字往上滑走、新名字从下面滑上来；新头像从中间一圈圈晕开盖住旧的
   * ink   墨晕：旧头像和名字晕开淡掉、新的从模糊里显出来，头顶冒一个小签「旧名 → 新名」，告诉大家是谁改了名 */
  function renameFx(seat, old) {
    const box = seatEl(seat), kind = els.app.dataset.uivRename;
    const face = box && box.querySelector('.zm-av-face'), nm = box && box.querySelector('.zm-name');
    if (!face || !nm) return;
    const nickNew = nameOf(seat) || (game.bots[seat] && game.bots[seat].nick) || '';
    const avNew = avatarHtml(seat), avChanged = old.avatar !== (game.bots[seat] && game.bots[seat].avatar), nickChanged = old.nick !== nickNew;
    const half = (el, outKf, inKf, swap, d1, d2) => {
      const a1 = el.animate(outKf, { duration: d1, easing: 'ease-in', fill: 'forwards' });
      let a2 = null;
      a1.finished.then(() => { swap(); a2 = el.animate(inKf, { duration: d2, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }); return a2.finished; })
        .catch(() => swap()).then(() => { a1.cancel(); if (a2) a2.cancel(); });
    };
    const swapFace = () => { face.innerHTML = avNew; };
    const swapName = () => { nm.textContent = nickNew; };
    if (kind === 'flip') {
      if (avChanged) half(face, [{ transform: 'perspective(200px) rotateY(0deg)' }, { transform: 'perspective(200px) rotateY(90deg)' }], [{ transform: 'perspective(200px) rotateY(-90deg)' }, { transform: 'perspective(200px) rotateY(0deg)' }], swapFace, 200, 320);
      else fx.pop(face, { scale: 1.12, dur: 300 });
      if (nickChanged) half(nm, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }], [{ transform: 'rotateX(-90deg)' }, { transform: 'rotateX(0deg)' }], swapName, 180, 300);
      const av = box.querySelector('.zm-av'); const c = fx.center(av.getBoundingClientRect());
      setTimeout(() => fx.burst(c.x, c.y, { n: 10, shapes: ['star', 'dot'], colors: ['#c9a96e', '#e2b85c', '#f3e6c4'], radius: 34, size: [5, 9], life: 600 }), 200);
    } else if (kind === 'slide') {
      if (nickChanged) half(nm, [{ translate: '0 0', opacity: 1 }, { translate: '0 -10px', opacity: 0 }], [{ translate: '0 10px', opacity: 0 }, { translate: '0 0', opacity: 1 }], swapName, 180, 280);
      if (avChanged) {
        const ov = document.createElement('span');
        ov.className = 'zm-av-face zm-av-reveal'; ov.innerHTML = avNew;
        face.parentNode.insertBefore(ov, face.nextSibling);
        ov.animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished.then(() => { swapFace(); ov.remove(); }, () => { swapFace(); ov.remove(); });
      }
    } else {
      const blurOut = [{ filter: 'blur(0) saturate(1)', opacity: 1 }, { filter: 'blur(5px) saturate(0.2)', opacity: 0.15 }];
      const blurIn = [{ filter: 'blur(5px) saturate(0.2)', opacity: 0.15 }, { filter: 'blur(0) saturate(1)', opacity: 1 }];
      if (avChanged) half(face, blurOut, blurIn, swapFace, 300, 420);
      if (nickChanged) {
        half(nm, blurOut, blurIn, swapName, 300, 420);
        const tip = document.createElement('div');
        tip.className = 'zm-rename-tip';
        tip.innerHTML = '<s>' + esc(old.nick) + '</s><i>→</i><b>' + esc(nickNew) + '</b>';
        box.appendChild(tip);
        tip.animate([{ opacity: 0, translate: '-50% 6px' }, { opacity: 1, translate: '-50% 0', offset: 0.12 }, { opacity: 1, translate: '-50% 0', offset: 0.85 }, { opacity: 0, translate: '-50% -6px' }], { duration: 2400, easing: 'ease-out', fill: 'forwards' }).finished.then(() => tip.remove(), () => tip.remove());
      }
    }
  }
  function showProfile() {
    if (!AV) return;
    let pick = profile.avatar;
    openDialog('<h2>' + T('ui.profile.title', '名字和头像') + '</h2><div class="zm-field-label">' + T('ui.profile.nick', '名字（删空 = 随机起一个）') + '</div>' +
      '<input class="zm-input" data-nick maxlength="12" autocomplete="nickname" value="' + esc(profile.nick) + '">' +
      '<div class="zm-field-label">' + T('ui.profile.avatar', '头像') + '</div><div class="zm-av-grid" role="group">' +
      AV.HUMAN.map((a) => '<button type="button" class="zm-av-pick" data-av="' + a.id + '" aria-label="' + esc(a.name) + '" aria-pressed="' + (a.id === pick) + '">' + a.svg + '</button>').join('') +
      '</div><p class="zm-muted zm-err" data-err hidden></p>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>' + T('ui.cancel', '取消') + '</button><button type="button" class="zm-btn zm-btn-primary" data-save data-focus>' + T('ui.save', '保存') + '</button></div>', (d) => {
      const err = d.querySelector('[data-err]'), nickIn = d.querySelector('[data-nick]');
      d.querySelector('[data-cancel]').addEventListener('click', closeDialog);
      d.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => {
        pick = b.dataset.av;
        d.querySelectorAll('[data-av]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        fx.pop(b, { scale: 1.12, dur: 220 });
      }));
      d.querySelector('[data-save]').addEventListener('click', () => {
        const v = nickIn.value.trim();
        if (v && ([...v].length > 12 || /[<>&"'/\\]/.test(v))) { err.textContent = T('ui.profile.bad', '名字最多 12 个字，不能有特殊符号'); err.hidden = false; nickIn.focus(); return; }
        const I = ident();
        if (v) { if (I && I.setNick) I.setNick(v); } else if (I && I.clearNick) I.clearNick();
        profile = { nick: v || randomNick(), avatar: pick };
        writeJSON(PROFILE_KEY, profile);
        closeDialog();
        applyProfile();
        save();
        if (online) onlineAct('profile', { nick: v, avatar: pick });
      });
    });
  }

  /* 机器猫的名字和头像按档从各自的池子里抽（2026-11-13 用户：高手一套名字 + 深色金眼头像、普通希腊字母 + 现在四个、入门零一…零九 + 马卡龙大眼睛；
   * 对局里不再挂档位小签，看名字和头像就知道是哪一档） */
  const L_BOTS = LANG === 'zh-Hans' ? null : {
    hard: T('nick.bot.hard', '天枢、天璇、天玑、天权、玉衡、开阳、摇光、北辰、启明').split('、'),
    normal: T('nick.bot.normal', '阿尔法、贝塔、伽马、德尔塔、泽塔、西塔、卡帕、西格玛、欧米伽').split('、'),
    easy: T('nick.bot.easy', '零一、零二、零三、零四、零五、零六、零七、零八、零九').split('、'),
  };
  function tierPool(tier) {
    const BT = AV && AV.BOT_TIERS && (AV.BOT_TIERS[tier] || AV.BOT_TIERS.normal);
    if (BT) return { nicks: L_BOTS ? (L_BOTS[tier] || L_BOTS.normal) : BT.nicks, faces: BT.faces.map((x) => x.id) };
    return { nicks: L_BOTS ? L_BOTS.normal : AV ? AV.BOT_NICKS : ['阿尔法', '贝塔', '伽马', '德尔塔'], faces: AV ? AV.ROBOT.map((x) => x.id) : [] };
  }
  function drawBots(n, tier) {
    const P = tierPool(tier), names = P.nicks.slice();
    const take = (arr) => arr.length ? arr.splice((Math.random() * arr.length) | 0, 1)[0] : null;
    const out = [{ nick: profile.nick, avatar: profile.avatar }];
    // 每档头像只有四种：人多时用完一轮再来一轮（名字不重）
    let pool = P.faces.slice();
    for (let i = 1; i < n; i++) { if (!pool.length) pool = P.faces.slice(); out.push({ nick: take(names), avatar: pool.length ? take(pool) : null }); }
    return out;
  }
  function avatarHtml(seat) {
    const b = game && game.bots[seat];
    if (b && b.avatar && AV && AV.byId[b.avatar]) {
      const svg = AV.byId[b.avatar].svg;
      // 组队：头像自带的那层圆底换成队色（2026-11-18 用户：队伍看底色，不叠圈）
      if (teamGame()) return svg.replace(/(<circle cx="32" cy="32" r="32" fill=")#[0-9a-fA-F]{3,8}/, '$1' + TEAM_BG[teamIdx(seat)]);
      return svg;
    }
    if (seat === 0) return '<span>' + T('ui.me', '我') + '</span>';
    return '<span>' + esc((b && b.nick || '?').slice(0, 1)) + '</span>';
  }
  const nameOf = (seat) => (game && game.bots[seat] ? game.bots[seat].nick : '');
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }

  /* ───── 牌 ───── */
  // 百变「摸底」生效时，抽底牌换成「抽顶」的牌面（规则上它也改成从最上面摸）
  const fluxNow = () => (game && game.state ? (ov && ov.flux !== undefined ? ov.flux : game.state.flux) : null);
  const topdrawNow = () => fluxNow() === 'bottom';
  // 百变「百搭」（2026-11-26 用户）：所有猫都变成万能猫——猫牌的牌面跟着换成万能猫（像摸底时抽底变抽顶），换走规则再变回来
  const allwildNow = () => fluxNow() === 'allwild';
  /* 2026-11-26 用户：牌在牌堆里还是它本身的样子，进了手才变万能猫——窥探 / 改命看到的、刚摸起来的那张，先亮本身，再翻一下变成万能猫（rawHtml + morphWild）。
   * rawFace 只在 rawHtml 里临时打开 */
  let rawFace = false;
  const viewKind = (k, wild) => (k === R.BOTTOM && topdrawNow() ? 'topdraw' : R.CATS.indexOf(k) >= 0 && (wild || allwildNow()) && !rawFace ? R.WILD : k);
  const willMorph = (id) => id != null && allwildNow() && R.CATS.indexOf(R.KIND_OF[id]) >= 0;   // 百搭：这张从牌堆里拿出来时要不要「变身」
  // 角色「百搭猫」（2026-11-26 用户：和百变「百搭」一样）：这一家手里的猫都是万能猫——手牌区摆的是他的牌时，猫画成万能猫（摸进来时翻一下变身）
  const wildLater = new Set();   // 刚飞进百搭猫手里、还没翻成万能猫的牌
  const handWild = () => { const s = game && game.state; if (!s || !s.roles) return false; const seat = s.alive[0] ? 0 : viewSeat; return seat >= 0 && R.roleOf(s, seat) === 'calico'; };
  // 百搭猫的猫出手：起飞时还是万能猫，半路翻回原来那只猫（桌上 / 弃牌堆照真牌画）
  const leaveWild = (id, o) => (handWild() && R.CATS.indexOf(R.KIND_OF[id]) >= 0 ? Object.assign(o, { back: cardHtml(id, '', '', true), flip: 'up', flipAt: 0.15 }) : o);
  // 我出这组牌算什么（百变「百搭」/ 角色「百搭猫」：任意两只 / 三只 / 五只猫也算）
  const classifyMine = (cards) => (R.classifyFor && game && game.state ? R.classifyFor(game.state, 0, cards) : R.classify(cards));
  // 名字条放不下的长名字（英文）：按字数缩一档 / 两档字号（zhamao.css 末尾「多语言」一段）。简体一律不加，站点和以前一样
  const nmCls = (s) => (LANG === 'zh-Hans' ? '' : String(s).length > 12 ? ' is-xlong' : String(s).length > 8 ? ' is-long' : '');
  function cardHtml(kindOrId, cls, style, wild) {   // wild：猫画成万能猫（百搭猫的手牌）
    const k = typeof kindOrId === 'number' ? R.KIND_OF[kindOrId] : kindOrId;
    const vk = viewKind(k, wild);   // 看起来是哪种（data-k 仍是真牌种，出牌判断不受影响；data-v 是看起来的那种）
    const t = ART.TONE[vk];
    return '<div class="zm-card' + (cls ? ' ' + cls : '') + '" data-k="' + k + '"' + (vk !== k ? ' data-v="' + vk + '"' : '') + (typeof kindOrId === 'number' ? ' data-id="' + kindOrId + '"' : '') +
      ' style="--bg:' + t.bg + ';--band:' + t.band + ';--ink:' + t.ink + (style ? ';' + style : '') + '">' +
      '<div class="zm-art">' + ART.face(vk) + '</div><i class="zm-ic">' + ART.icon(vk) + '</i><b class="zm-nm' + nmCls(R.NAMES[vk] || R.NAMES[k]) + '">' + (vk === 'topdraw' ? T('card.topdraw.name', '抽顶') : R.NAMES[vk]) + '</b></div>';
  }
  function rawHtml(id, cls, style) { rawFace = true; try { return cardHtml(id, cls, style); } finally { rawFace = false; } }
  /* 牌原地翻一下、翻过去那一刻换成现在该有的牌面（百搭：本身那只猫 → 万能猫）。
   * box = 跟着转的那层（手里的牌就是牌本身；飞出来的牌是外框或翻面层——影子在它上面，一起转才不露底板）；转动叠加在原有位移上（composite add），不打断别的动画 */
  function turnFace(box, face, id, delay, t) {
    if (fx.reduce()) { setFace(face, cardHtml(id)); return Promise.resolve(); }
    const a1 = box.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: ms(180), delay: delay || 0, easing: 'ease-in', fill: 'forwards', composite: 'add' });
    return a1.finished.then(() => {
      if (t !== token || !face.isConnected) { a1.cancel(); return null; }
      setFace(face, cardHtml(id));
      const a2 = box.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: ms(200), easing: 'ease-out', composite: 'add' });
      a1.cancel();
      return a2.finished;
    }).catch(() => {});
  }
  // 百搭：亮着本身样子的猫（飞出来的牌节点 / 手里、弹窗里的牌）一张张翻成万能猫
  function morphWild(nodes, ids, t, delay) {
    const jobs = [];
    nodes.forEach((n, i) => {
      if (!n || !willMorph(ids[i])) return;
      const face = n.classList.contains('zm-card') ? n : n.querySelector('.zm-card:not(.is-back)');
      if (!face) return;
      const box = n.classList.contains('zm-card') ? n : (n.querySelector('.zm-flip') || n);
      jobs.push(turnFace(box, face, ids[i], (delay || 0) + jobs.length * ms(90), t));
    });
    if (jobs.length) setTimeout(() => { if (t === token) snd('flip'); }, delay || 0);
    return Promise.all(jobs);
  }
  // 换上 / 换走「摸底」：手里每张抽底翻一下、换成抽顶（或换回来）
  async function flipBottomCards(t, kinds) {
    const cards = Array.from(els.hand.querySelectorAll((kinds || [R.BOTTOM]).map((k) => '.zm-card[data-k="' + k + '"][data-id]').join(', ')));
    if (!cards.length) return;
    snd('flip');
    await Promise.all(cards.map((c, i) => {
      if (fx.reduce()) { c.outerHTML = cardHtml(+c.dataset.id, c.className.replace(/\bzm-card\b/, '').trim(), c.getAttribute('style').split(';').filter((x) => !/^--(bg|band|ink)/.test(x.trim())).join(';'), handWild()); return null; }
      return flipFace(c, t, i * ms(60));
    }));
  }
  // 手里这张牌换上它现在该有的牌面（摸底 / 百搭 / 百搭猫）
  function setFace(c, html) {
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const fresh = tmp.firstChild;
    c.style.setProperty('--bg', fresh.style.getPropertyValue('--bg')); c.style.setProperty('--band', fresh.style.getPropertyValue('--band')); c.style.setProperty('--ink', fresh.style.getPropertyValue('--ink'));
    c.innerHTML = fresh.innerHTML;
    if (fresh.dataset.v) c.dataset.v = fresh.dataset.v; else delete c.dataset.v;
  }
  // 翻一下：转到侧面时换牌面，再转回来
  function flipFace(c, t, delay) {
    const half = { duration: ms(180), delay: delay || 0, easing: 'ease-in', fill: 'forwards' };
    return c.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], half).finished.then(() => {
      if (t !== token) return;
      setFace(c, cardHtml(+c.dataset.id, '', '', handWild()));
      c.getAnimations().forEach((a) => a.cancel());
      return c.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: ms(200), easing: 'ease-out' }).finished;
    }).catch(() => {});
  }
  const backHtml = (cls, style) => '<div class="zm-card is-back' + (cls ? ' ' + cls : '') + '"' + (style ? ' style="' + style + '"' : '') + '>' + ART.BACK + '</div>';
  const pileRot = (id) => ((id * 37) % 13) - 6;
  const U = () => parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 64;
  const POP = () => Math.min(U() * 1.3, 120);   // 弹出来看的牌（窥探 / 改命 / 抽牌 / 捡弃牌 / 点名）统一的大号，和 CSS 的 --pop 一致
  /* 牌面大小（2026-11-26 用户：设置里三档，默认中）：小 = 放大以前的原样；中 = 两者之间；大 = 手牌 1.3 倍、桌上 1.25 倍。写到 CSS 的 --hs / --ts */
  const CARD_SIZES = { s: [1, 1], m: [1.15, 1.12], l: [1.3, 1.25] };
  const cardSize = () => CARD_SIZES[settings.cardSize] || CARD_SIZES.m;   // 没选过 = 中（2026-11-26 用户定默认中）
  function applyCardSize() { const z = cardSize(); els.app.style.setProperty('--hs', z[0]); els.app.style.setProperty('--ts', z[1]); }
  const PU = () => U() * 0.92 * cardSize()[1];     // 牌堆 / 弃牌堆的牌宽（乘牌面大小那档，和 CSS 的 --ts 一致）
  const HU = () => Math.min(U() * cardSize()[0], 120);   // 我的手牌牌宽（乘牌面大小那档，和 CSS 的 --hw 一致）：飞进 / 飞出手牌的牌按这个大小落地
  const SU = () => PU() * 1.15;    // 刚出的牌（压在弃牌堆上）的牌宽

  /* ───── 显示层 ───── */
  function stageIdsOf(s) { return s.phase === 'react' && s.pending ? s.pending.cards.concat(s.pending.nopes.map((x) => x.card)) : []; }
  function liveDisplay() {
    const s = game.state;
    const onStage = stageIdsOf(s);
    return {
      counts: s.hands.map((h) => h.length), hand: game.hideHand ? [] : s.alive[0] ? s.hands[0].slice() : (viewSeat > 0 && s.alive[viewSeat] ? s.hands[viewSeat].slice() : []),
      deckSize: s.deck.length, lifted: s.phase === 'alter' && s.alter ? s.alter.cards.length : 0, kittens: R.kittensInDeck(s),   // 重排时那几张正举在牌堆上方（数字照旧）
      discard: s.discard.filter((id) => onStage.indexOf(id) < 0),
      turn: s.turn, turnsLeft: s.turnsLeft, alive: s.alive.slice(),
      flux: s.flux || null,   // 百变规则牌上现在写的那条（动画播到「换规则」才变）
      topFace: faceTop(s),   // 百变「掀顶」（重排时顶上几张举在空中，牌堆上不再翻着一张）：牌堆顶翻开着的那张（动画里一张张跟着换）
    };
  }
  const D = () => ov || liveDisplay();
  /* 牌堆顶要不要翻着：百变「透视」；或者顶上那张正是「火眼」露着位置的炸弹猫（2026-11-16 用户：它一路被摸到最上面时又盖回去了，前后不一致） */
  const isOpenKit = (st, id) => !!(game && game.openKits && game.openKits.has(id) && st.memo && st.memo[0] && st.memo[0].deck.indexOf(id) >= 0);
  function faceTop(st) {
    if (!st || !st.deck || !st.deck.length || st.phase === 'alter') return null;
    return st.flux === 'peektop' || isOpenKit(st, st.deck[0]) ? st.deck[0] : null;
  }
  function snapshot() { ov = liveDisplay(); return ov; }
  function release() { ov = null; handHidden.clear(); handOut.clear(); wildLater.clear(); }

  /* ───── 尺寸：只算 --u ───── */
  /* 一局里尺寸锁死（2026-11-14 用户：玩着玩着整桌突然变大、顶上名字和箭头挤成一团）：
   * 以前每个 resize 都重算——手机切后台截快照会把网页临时转成横屏、浏览器工具栏伸缩也发 resize，量到的是临时尺寸，回来就一直错着。
   * 现在只在开局 / 进房时算一次；之后只有窗口宽度真变了（转屏，差 40px 以上）且停稳 300ms、页面在前台时才重算。
   * 量的是 offsetWidth / offsetHeight（不含桌子抖动时的 transform） */
  let sizeW = 0, sizeTimer = 0;
  const viewW = () => document.documentElement.clientWidth || innerWidth;
  function recheckSize() {
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(() => {
      if (!game || document.hidden) return;
      // 牌和头像的大小一局里不变；但窗口宽了 / 窄了一点，座位会跟着重新排开——桌沿和名字间的箭头是按座位位置画的，
      // 必须跟着重量重画，不然就是「座位铺满了、桌沿还停在原来那么宽」（2026-11-14 用户在预览里看到桌沿只占半边）
      if (Math.abs(viewW() - sizeW) < 40) { renderDir(); return; }
      solveSize();
      // 转屏（2026-11-15 横屏布局）：有的浏览器 resize 先到、横竖屏那套 CSS 后生效，第一遍量到的是旧布局——停稳后再按最终布局量一遍、重画桌沿和箭头
      setTimeout(() => { if (game && !document.hidden) { solveSize(); } }, 450);
    }, 300);
  }
  const LANDSCAPE_SHORT = window.matchMedia('(orientation: landscape) and (max-height: 540px)');   // 和 CSS 里横屏那段用同一个条件
  function solveSize() {
    sizeW = viewW();
    const W = els.table.offsetWidth - 24, H = els.table.offsetHeight;
    let u;
    if (LANDSCAPE_SHORT.matches) {
      /* 手机横屏（2026-11-15 用户：横屏是必须设计的比例）：顶上一行 = 标题 + 对手 + 工具，底下一行 = 我 + 手牌 + 按钮，中间整块给桌子；
       * 卡牌大小按「底下手牌一行 + 桌子里牌堆那张」两份高度分 */
      const fixed = (40 + 44) + 22 + 26 + 16;   // 顶行（头像 + 名字）+ 手牌上下留白 + 牌堆下的张数 + 边框
      u = Math.min(W / 9, (H - fixed) / 3.7, 76);
      u = Math.max(40, Math.floor(u));
    } else {
      const av = W < 500 ? 46 : 54;
      const fixed = 50 + (av + 50) + 66 + 26 + 40;
      u = Math.min(W / 5.5, (H - fixed) / 3.4, 98);   // 高度那份：手牌 1.82u + 牌堆 1.61u（2026-11-26 放大后，原来 2.7）
      u = Math.max(46, Math.floor(u));
    }
    els.app.style.setProperty('--u', u + 'px');
    layoutHand();
    layoutOpps();
  }

  /* ───── 座位 ───── */
  // 轮到谁（照拱猪）：头像描一圈朱红、外面一道淡光；限时的话外圈一道红环顺时针收走，最后 5 秒头像跳
  const CLOCK_SVG = '<svg class="zm-clock" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" pathLength="100"/></svg>';
  /* 2v2 组队（2026-11-15 用户）：队友（对面那位 = 2 号）的头像放到底下一行——我、摸牌 / 出牌右边那块空位；上面一排只剩两个对手 */
  const teamGame = () => !!(game && game.state && R.isTeam && R.isTeam(game.state));
  /* 2026-11-19 用户：围桌一圈不再只给组队——经典 / 百变 / 角色也一律所有人坐在桌沿（灯带）上，全员推送、不做设置开关。队色（头像底色、彗星跟队变色）仍只在组队里有 */
  const ringGame = () => !!(game && game.state);
  /* 2026-11-15 用户：队友和我出牌顺序挨着（我是他的上家或下家），桌上整圈仍是逆时针：我 → 右 → 上排从右往左 → 左 → 我。
   * 队友是我下家：我在左下、队友在右下；队友是我上家：队友在左下、我在右下（els.app 加 is-mate-left） */
  /* 2026-11-18 起组队一律「围桌一圈」（is-ring）：所有人（包括我）都坐在桌沿上，不再有底下那排的队友座位——mateSeat 只剩老代码兼容（恒为 -1） */
  const mateSeat = () => -1;
  const isMate = (seat) => !!(seat > 0 && teamGame() && R.teamOf(game.state, seat) === R.teamOf(game.state, 0));
  function seatOrder() { const m = mateSeat(), out = []; for (let s = game.state.n - 1; s >= 1; s--) if (s !== m) out.push(s); return out; }
  function seatEl(seat) { return seat === 0 ? els.me : seat === mateSeat() && els.mate ? els.mate : els.opps.querySelector('[data-seat="' + seat + '"]'); }
  const allSeatEls = () => Array.from(els.opps.querySelectorAll('.zm-seat')).concat(els.mate ? [els.mate] : []);   // 对手 + 组队时底下那位队友
  const pickSeatEls = () => allSeatEls().concat([els.me]);   // 选人用：自由甩锅能甩给自己（2026-11-26 用户），自己的头像也要能亮 / 能点
  function avEl(seat) { const s = seatEl(seat); return s && s.querySelector('.zm-av'); }
  /* 游戏框（牌桌的双线裱框，内线缩进 6px）左右能放东西的范围：飞出来的扇面 / 点名牌都别越过内线（2026-11-13 用户：最左 / 最右那家手牌多时扇面出框）。
   * 以前按整个窗口算，手机上贴着边、电脑上桌子居中时更是直接跑到框外 */
  function frameX(pad) { const r = (els.table || els.app).getBoundingClientRect(); const p = 6 + (pad == null ? 8 : pad); return { l: r.left + p, r: r.right - p }; }
  function avPoint(seat) { const a = avEl(seat); return a ? fx.center(a.getBoundingClientRect()) : { x: innerWidth / 2, y: 80 }; }

  function buildSeats() {
    els.opps.innerHTML = '';
    seatOrder().forEach((seat) => {
      const d = document.createElement('section');
      d.className = 'zm-seat';
      d.dataset.seat = seat;
      d.addEventListener('click', () => onSeatTap(seat));
      els.opps.appendChild(d);
    });
    els.me.dataset.seat = 0;
    if (els.mate) { els.mate.remove(); els.mate = null; }
    // 组队：队伍看头像底色（2026-11-18 用户：外圈只管状态）；座位排成围桌一圈
    els.app.classList.toggle('is-team', teamGame());
    els.app.classList.toggle('is-ring', ringGame());
    if (!ringGame()) { els.me.style.removeProperty('left'); els.me.style.removeProperty('top'); els.me.style.removeProperty('bottom'); if (els.me.parentNode) els.me.parentNode.style.removeProperty('padding-left'); els.opps.style.removeProperty('min-height'); }
    renderScore();
    els.app.classList.toggle('is-mate-left', teamGame() && mateSeat() === game.state.n - 1);   // 队友是我上家：他坐左下、我坐右下
    for (let k = 0; k < game.state.n; k++) seatEl(k).dataset.team = teamGame() ? String(teamIdx(k)) : '';
    for (let s = 0; s < game.state.n; s++) seatEl(s).innerHTML = '';
    layoutOpps();
  }
  /* 6–9 人（对手 5–8 家）：还是一排，但排成一道往下弯的弧（两头低、中间高，像围着桌子坐），头像跟着屏幕宽度缩小；
   * 角标（手牌数 / 还要摸几回合）挪到头像右上 / 右下角，免得挤到旁边那家 */
  function layoutOpps() {
    if (ringGame()) { els.opps.classList.remove('is-arc'); renderDir(); return; }
    const m = game && game.state ? game.state.n - 1 : 0;
    const arc = m >= 5;
    els.opps.classList.toggle('is-arc', arc);
    if (!arc) { els.opps.style.removeProperty('--av-o'); els.opps.style.removeProperty('--arc'); renderDir(); return; }
    const W = els.opps.clientWidth || els.table.clientWidth || innerWidth;
    const per = W / m;
    const av = Math.max(30, Math.min(46, Math.floor(per - 16)));
    const A = LANDSCAPE_SHORT.matches ? 0 : Math.round(Math.min(34, av * 0.75));   // 横屏够宽：一排摆平，不往下弯（弯下来会压到桌子）
    els.opps.style.setProperty('--av-o', av + 'px');
    els.opps.style.setProperty('--arc', A + 'px');
    Array.from(els.opps.children).forEach((b, j) => {
      const t = m > 1 ? (j - (m - 1) / 2) / ((m - 1) / 2) : 0;
      b.style.setProperty('--dy', (A * t * t).toFixed(1) + 'px');
    });
    renderDir();
  }
  /* ───── 组队 · 围桌一圈（2026-11-18 用户定）─────
   * 先定桌沿（圆角矩形：顶边在顶栏下面、底边在摸牌 / 出牌那一行上沿），再把人摆上去：
   *   我坐底边靠左（不压拐角）；其余的人按出牌顺序（逆时针：右边从下往上 → 顶边从右往左 → 左边从上往下）在三条直边上均匀排开。
   *   头像一律只落在直边上，离拐角留出余量（2026-11-18 用户：放拐角特别丑）。
   * 摸牌 / 出牌两个键往右让开我的头像。桌沿、彗星、导火索、瞄准线都按这一圈走（rimGeom 的 ring 分支） */
  let ringLay = null;
  const RING_M = 16, RING_R = 26;
  function layoutRing() {
    if (!game || !game.state || !els.table) return;
    const n = game.state.n, tb = els.table.getBoundingClientRect(), W = tb.width;
    const bar = els.table.querySelector('.zm-topbar'), mebar = els.me.parentNode;
    if (!bar || !mebar) return;
    const land = LANDSCAPE_SHORT.matches;
    // 横屏（顶栏 / 我这一行都是 display:contents 摊进整张桌子的网格）：桌沿顶边穿过顶上那一行，底边压在桌子中间那块的下沿
    const hb = land ? (() => { const r = els.opps.getBoundingClientRect(); return { bottom: r.top - 2 }; })() : bar.getBoundingClientRect();
    // 横屏（2026-11-19 用户挑甲）：桌沿顶边整条压到标题 / 工具键那一行下面（顶边那几家头像骑在线上）——以前穿过那一行，左上压着「百变小咪」、右上压着工具键
    const landLow = land ? Math.max(...['.zm-topleft', '.zm-tools'].map((q) => { const e = els.table.querySelector(q); return e ? e.getBoundingClientRect().bottom : 0; })) : 0;
    /* 横屏 7 人起（2026-11-19 用户挑丙）：顶边那一排整个沉到标题行下面，顶边就能用满整个宽度——不然顶边挤 4–6 家只能坐在标题和工具键中间那段，
     * 相邻两家中间露出的灯带只剩二十几像素，指向隔壁那家时那截亮金线看不清。6 人及以下顶边不挤，照旧骑在线上（给桌子中间多留点高度） */
    const sink = land && n - 1 >= 6;
    const mb = land ? els.center.getBoundingClientRect() : mebar.getBoundingClientRect();
    const avMe = parseFloat(getComputedStyle(els.me).getPropertyValue('--av')) || 46;
    const y1 = Math.round((land ? mb.bottom : mb.top) - tb.top + 2);
    const others = n - 1;
    // 头像大小：按三条直边能分到的间距定（侧边上下两家之间还要放名字）；两侧桌沿往里收到头像 + 名字 + 手牌数角标都不出框
    let av = 46, y0 = 0, segs = null, x0 = RING_M, x1 = W - RING_M;
    /* 2026-11-19 经典 / 百变 / 角色也围桌一圈：三条边按长度分人（左右两边人数一样、对称），顶边至少坐 1 家（对手单数）或 2 家（双数）——
     * 不然竖屏 5 人局四家全挤在左右两条边上、顶边空着，像隔着桌子对坐。每条边上的人在这条边上均匀排开。组队不走这个（保持 2026-11-18 定的整圈均分） */
    let sp = null;
    const split = (side, top) => {
      if (teamGame()) return null;
      let s = Math.max(0, Math.min(Math.floor(side / 72), Math.round(others * side / Math.max(1, 2 * side + top))));   // 一条边上每家至少占 72px（头像 + 名字 + 留白），横屏侧边短，坐不下就挪到顶边
      let t = others - 2 * s;
      const tMin = others % 2 ? 1 : Math.min(2, others);
      if (t < tMin) { t = tMin; s = (others - t) / 2; }
      return { s, t };
    };
    for (let it = 0; it < 3; it++) {
      const inset = Math.max(RING_M, Math.round(av / 2 + 20));
      x0 = inset; x1 = W - inset;
      y0 = land ? Math.round(landLow - tb.top + (sink ? av / 2 + 4 : 6)) : Math.round(hb.bottom - tb.top + av / 2 + 8);
      const cm = RING_R + av / 2 + 8;   // 离拐角的余量
      const side = Math.max(0, (y1 - y0) - 2 * cm);
      // 顶边：横屏时顶上那一行左右是比分条和工具键，只在中间那段（.zm-opps 的范围）坐人
      let tR = x1 - cm, tL = x0 + cm;
      if (land && !sink) { const orr = els.opps.getBoundingClientRect(); tR = Math.min(tR, orr.right - tb.left - av / 2 - 4); tL = Math.max(tL, orr.left - tb.left + av / 2 + 4); }
      const top = Math.max(0, tR - tL);
      segs = [
        { len: side, at: (d) => [x1, y1 - cm - d] },        // 右边：从下往上
        { len: top, at: (d) => [tR - d, y0] },              // 顶边：从右往左
        { len: side, at: (d) => [x0, y0 + cm + d] },        // 左边：从上往下
      ];
      sp = split(side, top);
      const L = side * 2 + top, gap = sp ? Math.min(sp.s ? side / sp.s : Infinity, sp.t ? top / sp.t : Infinity) : L / Math.max(1, others);
      const want = Math.max(28, Math.min(land ? 38 : W < 520 ? 44 : 50, Math.floor(gap - 26)));
      if (want === av) break;
      av = want;
    }
    const L = segs.reduce((a, s) => a + s.len, 0), gap = L / Math.max(1, others);
    const pos = {};
    if (sp) {
      const cnt = [sp.s, sp.t, sp.s];
      let k = 1;
      segs.forEach((sg, e) => { for (let i = 0; i < cnt[e]; i++) pos[k++] = sg.at(sg.len * (i + 0.5) / cnt[e]).map(Math.round); });
    }
    for (let k = 1; k <= others && !sp; k++) {
      let d = gap * (k - 0.5);
      for (const sg of segs) { if (d <= sg.len || sg === segs[segs.length - 1]) { pos[k] = sg.at(Math.min(d, sg.len)).map(Math.round); break; } d -= sg.len; }
    }
    const meX = Math.round(x0 + Math.max(RING_R + avMe / 2 + 14, (x1 - x0) * 0.16));
    pos[0] = [meX, y1];
    els.opps.style.setProperty('--av-o', av + 'px');
    els.opps.style.minHeight = Math.round(av + 26) + 'px';   // 给顶边那几家（头像 + 名字）留出高度，桌子中间从它下面开始
    // 摆人：座位盒子（头像 + 名字一列）水平居中、头像中心落在桌沿上
    for (let k = 1; k <= others; k++) {
      const box = seatEl(k);
      if (!box) continue;
      box.style.left = pos[k][0] + 'px';
      box.style.top = Math.round(pos[k][1] - av / 2) + 'px';
    }
    // 我：绝对定位（头像中心压在底边上）。竖屏在 .zm-mebar 里、两颗键往右让开；横屏直接在桌子里，左下那一格留出我的宽度（手牌从我右边开始）
    const op = (els.me.offsetParent || els.table).getBoundingClientRect();
    els.me.style.left = Math.round(meX - avMe / 2 - (op.left - tb.left)) + 'px';
    els.me.style.top = Math.round(y1 - avMe / 2 - (op.top - tb.top)) + 'px';
    els.me.style.bottom = 'auto';
    if (land) { mebar.style.removeProperty('padding-left'); els.table.style.setProperty('--ring-me-w', Math.round(meX + avMe / 2 + 2) + 'px'); }
    else {
      /* 竖屏排法：两颗键往右让开我的头像。2026-11-22 用户（平板横屏）：桌子很宽、键放正中间也碰不到我时就放正中间——
       * 按两颗键最宽时的宽度量，正中间那一段左边离我的头像还有 10px 以上就不让 */
      const padL = Math.round(meX + avMe / 2 + 10 - (op.left - tb.left));
      const bw = 2 * Math.max(96, ...Array.from(mebar.querySelectorAll('.zm-band .zm-btn')).map((b) => b.offsetWidth)) + 12;
      const mw = mebar.getBoundingClientRect().width;
      const wide = window.innerWidth > window.innerHeight;
      if (wide && (mw - bw) / 2 >= padL) mebar.style.removeProperty('padding-left'); else mebar.style.paddingLeft = padL + 'px';
    }
    // 横屏：顶边那几家（头像 + 名字）往下压进了桌子中间那块——牌堆 / 弃牌堆在剩下的高度里居中，别顶到名字
    if (land) { const ct = els.center.getBoundingClientRect().top - tb.top; const pad = Math.max(0, Math.round(y0 + av / 2 + 18 - ct)); els.center.style.paddingTop = pad + 'px'; els.center.style.setProperty('--ctr-pad', pad + 'px'); }
    else { els.center.style.removeProperty('padding-top'); els.center.style.removeProperty('--ctr-pad'); }
    ringLay = { x0, x1, y0, y1, r: RING_R, pos, av, avMe, W };
    if (document.getElementById('zmFlux')) renderFlux(D());   // 百变水印跟着桌沿走
  }
  // 桌沿上从我出发、逆时针走 d 像素到哪（ring 分支：彗星 / 方向箭头用）
  function ringPerim() {
    const g = ringLay; if (!g) return null;
    const { x0, x1, y0, y1, r } = g, me = g.pos[0][0];
    const q = Math.PI * r / 2;
    const parts = [
      [x1 - r - me, (d) => [me + d, y1, 0]],
      [q, (d) => { const a = Math.PI / 2 - d / r; return [x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a), -d / r]; }],
      [y1 - y0 - 2 * r, (d) => [x1, y1 - r - d, -Math.PI / 2]],
      [q, (d) => { const a = -d / r; return [x1 - r + r * Math.cos(a), y0 + r + r * Math.sin(a), -Math.PI / 2 - d / r]; }],
      [x1 - x0 - 2 * r, (d) => [x1 - r - d, y0, Math.PI]],
      [q, (d) => { const a = -Math.PI / 2 - d / r; return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a), Math.PI - d / r]; }],
      [y1 - y0 - 2 * r, (d) => [x0, y0 + r + d, Math.PI / 2]],
      [q, (d) => { const a = Math.PI - d / r; return [x0 + r + r * Math.cos(a), y1 - r + r * Math.sin(a), Math.PI / 2 - d / r]; }],
      [me - x0 - r, (d) => [x0 + r + d, y1, 0]],
    ];
    const total = parts.reduce((a, p) => a + p[0], 0);
    const at = (d) => { d = ((d % total) + total) % total; for (const p of parts) { if (d <= p[0]) return p[1](d); d -= p[0]; } return [me, y1, 0]; };
    // 每个人在这圈上的位置（离起点多远）
    const where = (seat) => { const [px, py] = g.pos[seat]; let best = 0, bd = Infinity; for (let d = 0; d < total; d += 3) { const [x, y] = at(d); const e = (x - px) ** 2 + (y - py) ** 2; if (e < bd) { bd = e; best = d; } } return best; };
    return { total, at, where };
  }
  // 头像底色 = 队色（我这队永远第一种：藏蓝）。四种都避开朱红（轮到谁）/ 金（能指谁）/ 作废紫，2026-11-18 用户挑「中」档深浅
  const TEAM_BG = ['#a9c3e0', '#b2d4b4', '#f0c48f', '#eab3cb'];
  const TEAM_INK = ['#2f5d8a', '#3f7a55', '#c7772e', '#c0648f'];   // 同一色相的深色：彗星、比分条
  /* 队色按「我」那队算（我这队永远蓝）。2026-11-20 用户：我那队全出局、转去看别队的人时，桌子转成他坐底下，
   * 以前按底下那家算，被看的橙队就变成了蓝队。现在按我自己的座位：单机 meSeat()（转桌后我在哪），联机按我坐的座位；纯观战的人没有自己的队，按底下那家 */
  function teamIdx(seat) {
    const s = game.state, TC = R.teamCount(s) || 2;
    const me = !game.online ? meSeat() : online && online.st && online.st.mySeat >= 0 ? locOf(online.st.mySeat) : 0;
    return ((R.teamOf(s, seat) - R.teamOf(s, me)) % TC + TC) % TC;
  }
  // 顶栏左边的比分条（组队时代替「百变小咪」四个字）：每队一组小圆点，出局一个空一个
  function renderScore() {
    const bar = els.table && els.table.querySelector('.zm-topleft');
    if (!bar) return;
    let sc = bar.querySelector('.zm-score');
    if (sc) sc.remove();
    return;   // 2026-11-18 用户：左上角留给招牌，不放比分条（场上谁还活着看头像就行）
    if (!sc) { sc = document.createElement('div'); sc.className = 'zm-score'; sc.setAttribute('aria-label', T('ui.team.left', '各队剩几个人')); bar.appendChild(sc); }
    const s = game.state, d = ov || null, alive = d && d.alive ? d.alive : s.alive, TC = R.teamCount(s);
    const html = Array.from({ length: TC }, (_, ti) => '<span>' + Array.from({ length: s.n }, (_, k) => k).filter((k) => teamIdx(k) === ti).map((k) => '<i class="' + (alive[k] ? '' : 'is-out') + '" style="--tc:' + TEAM_INK[ti] + '"></i>').join('') + '</span>').join('');
    if (sc.innerHTML !== html) sc.innerHTML = html;
  }
  /* 组队围桌一圈的出牌方向（2026-11-18 用户在四版里挑了甲）：不放箭头——大家拉开坐了，方向靠桌沿转圈的彗星（顺着出牌方向走、带着轮到那队的颜色），
   * 轮到谁看头像的红圈。以前那一圈 / 一个箭头在有人出局后会指到空座位上 */
  function ringDir() {
    els.dir.className = 'zm-dir is-ring';
    els.dir.innerHTML = '';
    rimRender();
  }
  /* 出牌方向（2026-11-13 用户挑甲、去掉屏幕两边那两个）：相邻两个对手之间一个淡金小箭头，指向下一个出牌的人；打出「转向」全部掉头。
   * 只有对手 ≥ 2 家才有（两个人玩方向无所谓）。箭头落在两人名字之间的空里（弧形排布时头像小，箭头也跟着小） */
  function dirNow() { return game && game.state && game.state.dir === -1 ? -1 : 1; }
  /* 箭头的流动感（2026-11-13 用户挑定丙 · 三连跑马灯）：每个箭头是三道细箭（›››），三道依次点亮往前跑，箭头之间顺着出牌方向接力；
   * 指向当前出牌的人的那个箭头变朱红（和他头像的红圈呼应），轮到谁红箭头就跟着挪过去 */
  const DIR3_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 5l5 5-5 5"/><path d="M8 5l5 5-5 5"/><path d="M13.5 5l5 5-5 5"/></g></svg>';
  /* 预览（本机对比，未定）：名字按人数分档显示（data-uiv-names="fit"）
   * 2–5 人：先整名显示；放不下先把字缩一档（13 → 11.5 → 10.5px），还放不下才在末尾「…」
   * 6–9 人：桌上只放得下 3–4 个字——不打「…」（省一个字的位置），超出的部分在右边淡出；
   *        轮到谁，谁的名字就展开成一枚小牌子，整名盖在两边上面（他是全桌焦点，盖一下邻座名字可以接受）；点头像也会弹整名 */
  /* 预览 cut（2026-11-14 用户：9 人局名字不要超过 3 个汉字，出牌时也别展开全名）：
   * 6–9 人那一排按「宽度」截——8–9 人最多 3 个汉字宽、6–7 人最多 4 个汉字宽；英文按实际宽度算（3 个汉字宽 ≈ 6 个小写字母），
   * 截掉就截掉，不加「…」、不淡出、不展开；整名放在 title 里（长按 / 悬停能看） */
  const nameCtx = document.createElement('canvas').getContext('2d');
  function cutToWidth(text, font, maxW) {
    nameCtx.font = font;
    const cs = [...text];
    while (cs.length > 1 && nameCtx.measureText(cs.join('')).width > maxW + 0.5) cs.pop();
    return cs.join('');
  }
  function fitNames() {
    const arc = els.opps.classList.contains('is-arc');
    if (els.app.dataset.uivNames === 'cut') {
      const n = game && game.state ? game.state.n : 0, units = n >= 8 ? 3 : 4;
      els.app.querySelectorAll('.zm-seat .zm-name').forEach((nm) => {
        const seat = +nm.closest('.zm-seat').dataset.seat, full = nameOf(seat) || nm.textContent;
        nm.classList.remove('is-long'); nm.style.removeProperty('font-size'); nm.style.removeProperty('max-width');
        if (!arc || !nm.closest('.zm-opps')) { if (nm.textContent !== full) nm.textContent = full; nm.removeAttribute('title'); return; }
        const cs = getComputedStyle(nm), fs = parseFloat(cs.fontSize);
        const shown = cutToWidth(full, cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, units * fs);
        if (nm.textContent !== shown) nm.textContent = shown;
        if (shown !== full) nm.title = full; else nm.removeAttribute('title');
      });
      return;
    }
    const m = Math.max(1, els.opps.children.length);
    const room = Math.floor(Math.min(116, (els.opps.clientWidth || 360) / m - 14));   // 2–5 人：一家能占的宽度（以前一律 84px，4 人局两边其实还空着）
    els.app.querySelectorAll('.zm-seat .zm-name').forEach((nm) => {
      nm.classList.remove('is-long'); nm.style.removeProperty('font-size');
      if (!arc && nm.closest('.zm-opps')) nm.style.maxWidth = room + 'px'; else nm.style.removeProperty('max-width');
      if (nm.scrollWidth <= nm.clientWidth + 1) return;
      if (!arc || !nm.closest('.zm-opps')) {
        const base = parseFloat(getComputedStyle(nm).fontSize);
        for (const fs of [base - 1.5, base - 2.5]) { nm.style.fontSize = fs + 'px'; if (nm.scrollWidth <= nm.clientWidth + 1) return; }
      }
      nm.classList.add('is-long'); nm.dataset.full = nm.textContent;
    });
  }
  function renderDir() {
    if (ringGame() && !tableTurning) layoutRing();   // 围桌一圈：顶栏工具键开局后才露出来（横屏时顶边能坐的范围跟着变），每次都重新量
    if (els.app.dataset.uivNames) fitNames();
    if (!els.dir) { els.dir = document.createElement('div'); els.dir.setAttribute('aria-hidden', 'true'); els.table.appendChild(els.dir); }
    if (ringGame()) { ringDir(); return; }
    els.dir.className = 'zm-dir';
    const n = game && game.state ? game.state.n : 0;
    const pairs = dirPairs();
    if (n < 3 || !els.opps.children.length || !pairs.length) { els.dir.innerHTML = ''; if (n >= 2) rimRender(); return; }
    els.dir.classList.toggle('is-ring', ringGame());
    if (els.dir.children.length !== pairs.length) els.dir.innerHTML = pairs.map(() => '<i>' + DIR3_SVG + '</i>').join('');
    els.dir.style.setProperty('--cyc', Math.max(2.6, (n - 2) * 0.18 + 1.8).toFixed(2) + 's');
    placeDir();
    // 座位刚建好 / 刚排成弧 / 名字刚换时量到的位置可能还是旧的（8 人局箭头全在一条水平线上、两头的座位却已经往下沉了）：
    // 下一帧再量一遍，箭头稳稳落在名字上
    cancelAnimationFrame(dirRaf);
    dirRaf = requestAnimationFrame(() => { dirRaf = requestAnimationFrame(placeDir); });
    dirHot();
  }
  let dirRaf = 0, tableTurning = 0;   // tableTurning：观战换视角、头像正在滑的时候不量箭头 / 桌沿（量到的是半路的位置）
  /* 上面一排里相邻两家（座位号相连）各一个箭头：普通局 = 1→2、2→3……；组队（2026-11-15 改成队友挨着我坐）上排只剩两个对手，中间一个 */
  function dirPairs() {
    const n = game && game.state ? game.state.n : 0, m = mateSeat(), out = [];
    if (ringGame()) {   // 围桌一圈：只在还活着的人之间（2026-11-18 用户：有人出局后箭头指到空座位上）
      const al = (D() || {}).alive || game.state.alive, live = [];
      for (let a = 0; a < n; a++) if (al[a]) live.push(a);
      if (live.length > 1) live.forEach((a, i) => out.push([a, live[(i + 1) % live.length]]));
      return out;
    }
    for (let a = 1; a + 1 < n; a++) if (a !== m && a + 1 !== m) out.push([a, a + 1]);
    return out;
  }
  function placeDir() {
    if (!els.dir || !game || !game.state || tableTurning) return;
    const pairs = dirPairs(), np = pairs.length;
    if (els.dir.children.length !== np) return;
    if (ringGame()) { ringDir(); return; }
    const tb = els.table.getBoundingClientRect(), d = dirNow();
    // 2026-11-13 用户 8 人局：箭头没把名字串起来——以前按两个头像中心往下挪一截，人多头像小时落在名字和「高手」签之间。
    // 现在按名字摆：在两个名字之间的空隙正中、和名字一样高，顺着两个名字的连线歪；空隙窄就缩小
    const nameOf = (seat) => { const se = seatEl(seat); return se && (se.querySelector('.zm-name') || se.querySelector('.zm-av')); };
    Array.from(els.dir.children).forEach((el, k) => {
      const a = nameOf(pairs[k][0]), b = nameOf(pairs[k][1]);
      if (!a || !b) return;
      const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
      const ax = A.left + A.width / 2, ay = A.top + A.height / 2, bx = B.left + B.width / 2, by = B.top + B.height / 2;
      const L = ax < bx ? A : B, Rr = ax < bx ? B : A;
      const gap = Rr.left - L.right;
      const avw = avEl(pairs[k][0]) ? avEl(pairs[k][0]).getBoundingClientRect().width : 40;
      const sz = Math.max(10, Math.min(20, Math.round(avw * 0.46), Math.round(gap - 2)));
      const base = Math.atan2(by - ay, bx - ax);   // 座位号往上走 = 从 k+1 指向 k+2；反过来（d = -1）就掉头
      const j = d === -1 ? np - 1 - k : k;         // 流光的先后：顺着出牌方向排
      const cx = (L.right + Rr.left) / 2, cy = (ay + by) / 2;
      el.style.cssText = 'left:' + (cx - tb.left).toFixed(1) + 'px;top:' + (cy - tb.top).toFixed(1) + 'px;width:' + sz + 'px;height:' + sz + 'px;' +
        'transform:translate(-50%,-50%) rotate(' + (base + (d === -1 ? Math.PI : 0)).toFixed(4) + 'rad);--j:' + j;
      el.dataset.base = base;
    });
    rimRender();
  }
  /* ───── 桌沿（2026-11-13 用户提的想法、看过预览后定稿上线）─────
   * 一条细金线绕牌桌一圈：对手一排下面 → 右边往下 → 我头像上方 → 左边往上，所有人（包括我）都在这一圈上。
   * 平时：淡金线，一点柔光顺着出牌方向慢慢绕。指人时：从出牌人那点起，一截亮金沿桌沿（隔的人少的那边，一样多就顺着出牌方向）长到被指的人，到了那儿亮一圈；
   * 结算后（抽到牌 / 给了牌 / 被作废……）这截从被指的人那头缩回出牌人，淡回平时。 */
  const RIM_STEP = 5;
  function rimGeom() {
    const n = game && game.state ? game.state.n : 0;
    if (n < 2 || !avEl(0)) return null;
    if (ringGame() && ringLay) {
      const { x0, x1, y0, y1, r, pos } = ringLay, me = pos[0][0], f = (v) => v.toFixed(1);
      const d = 'M' + me + ' ' + y1 + 'L' + (x1 - r) + ' ' + y1 + 'Q' + x1 + ' ' + y1 + ' ' + x1 + ' ' + (y1 - r) + 'L' + x1 + ' ' + (y0 + r) + 'Q' + x1 + ' ' + y0 + ' ' + (x1 - r) + ' ' + y0 +
        'L' + (x0 + r) + ' ' + y0 + 'Q' + x0 + ' ' + y0 + ' ' + x0 + ' ' + (y0 + r) + 'L' + x0 + ' ' + (y1 - r) + 'Q' + x0 + ' ' + y1 + ' ' + (x0 + r) + ' ' + y1 + 'Z';
      const keys = [x0, x1, y0, y1].concat(...Object.keys(pos).map((k) => pos[k]));
      return { d, W: ringLay.W, H: els.table.getBoundingClientRect().height, keys, anchor: (seat) => (pos[seat] ? { x: pos[seat][0], y: pos[seat][1] } : { x: me, y: y1 }), ring: true, f };
    }
    for (let i = 1; i < n; i++) if (!seatEl(i)) return null;   // 座位还没建好
    const tb = els.table.getBoundingClientRect(), W = tb.width;
    // 和名字之间留的缝：手机上多留一点（2026-11-13 用户：手机上灯带和名字挨得太紧）
    const gap = W < 520 ? 13 : 9;
    const anchor = (seat) => {
      // 取整：小数点后的抖动不该让整圈重画
      if (seat === 0 || seat === mateSeat()) { const r = avEl(seat).getBoundingClientRect(), hr = els.hand.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2 - tb.left), y: Math.round(Math.min(avEl(0).getBoundingClientRect().top, hr.height ? hr.top + 6 : Infinity) - 9 - tb.top) }; }   // 横屏时我和手牌在同一行：底边落在手牌上沿之上   // 组队：队友在底边上
      // 只量头像 + 名字（2026-11-17 用户：名字下面的「代打 / 掉线 / 托管」小标签只属于头像，不该把这一家的底边拉低、让桌沿歪掉）
      // 按排版位置量（offsetTop / offsetHeight），头像跳一下、放大一下这类动画不算；座位自己的下沉（排成弧）在 r.top 里
      const box = seatEl(seat), r = box.getBoundingClientRect(), nm = box.querySelector('.zm-name'), av = box.querySelector('.zm-av');
      const low = (el) => (el && el.offsetParent === box ? el.offsetTop + el.offsetHeight : null);
      const lows = [low(nm), low(av)].filter((v) => v != null);
      const bottom = lows.length ? r.top + Math.max(...lows) : r.bottom;
      return { x: Math.round(r.left + r.width / 2 - tb.left), y: Math.round(bottom + gap - tb.top) };
    };
    const opp = []; for (let i = 1; i < n; i++) if (i !== mateSeat()) opp.push(anchor(i));   // 顶边只按上面一排拟合
    const me = anchor(0), m = 16, R = 26, yb = me.y;
    /* 顶边：不再硬穿过每家下面的点（手机上最右 / 最左那家比圆角还靠外，线会折回来，接缝不顺）——
     * 用一条抛物线 y = a·x² + b·x + c 拟合各家下面的点，再整条往下挪到不压住任何一家；两个圆角顺着这条线的切线接上去，处处光滑 */
    const fit = (() => {
      const k = opp.length;
      if (!k) return { y: () => 110, dy: () => 0 };
      if (k < 3) { const c = Math.max(...opp.map((p) => p.y)); return { y: () => c, dy: () => 0 }; }
      const cx = W / 2, sx = W / 2, X = opp.map((p) => (p.x - cx) / sx);
      // 最小二乘：解 3×3 正规方程（x 归一化到 [-1, 1]）
      const S = (f) => X.reduce((t, x, i) => t + f(x, opp[i].y), 0);
      const A = [[S((x) => x ** 4), S((x) => x ** 3), S((x) => x * x)], [S((x) => x ** 3), S((x) => x * x), S((x) => x)], [S((x) => x * x), S((x) => x), k]];
      const B = [S((x, y) => x * x * y), S((x, y) => x * y), S((x, y) => y)];
      const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
      const D0 = det(A);
      if (Math.abs(D0) < 1e-9) { const c = Math.max(...opp.map((p) => p.y)); return { y: () => c, dy: () => 0 }; }
      const col = (j) => A.map((row, i) => row.map((v, jj) => (jj === j ? B[i] : v)));
      let qa = det(col(0)) / D0, qb = det(col(1)) / D0, qc = det(col(2)) / D0;
      // 整条往下挪，保证每一家下面都不被压
      const yAt = (x) => { const u = (x - cx) / sx; return qa * u * u + qb * u + qc; };
      const lift = Math.max(0, ...opp.map((p) => p.y - yAt(p.x)));
      qc += lift;
      return { y: (x) => { const u = (x - cx) / sx; return qa * u * u + qb * u + qc; }, dy: (x) => { const u = (x - cx) / sx; return (2 * qa * u + qb) / sx; } };
    })();
    const xR = W - m - R, xL = m + R;
    const yR = fit.y(xR), yL = fit.y(xL);
    const ycR = yR + fit.dy(xR) * (W - m - xR), ycL = yL + fit.dy(xL) * (m - xL);   // 圆角控制点：顶边在端点处的切线和两条竖边的交点
    const f = (v) => v.toFixed(1);
    let d = 'M' + f(me.x) + ' ' + f(yb) + 'L' + f(W - m - R) + ' ' + f(yb) + 'Q' + (W - m) + ' ' + f(yb) + ' ' + (W - m) + ' ' + f(yb - R) +
      'L' + (W - m) + ' ' + f(ycR + R) + 'Q' + (W - m) + ' ' + f(ycR) + ' ' + f(xR) + ' ' + f(yR);
    for (let x = xR - 6; x > xL; x -= 6) d += 'L' + f(x) + ' ' + f(fit.y(x));   // 顶边：每 6px 一个点，看着就是一条顺滑的弧
    d += 'L' + f(xL) + ' ' + f(yL) + 'Q' + m + ' ' + f(ycL) + ' ' + m + ' ' + f(ycL + R) +
      'L' + m + ' ' + f(yb - R) + 'Q' + m + ' ' + f(yb) + ' ' + (m + R) + ' ' + f(yb) + 'Z';
    return { d, W, H: tb.height, keys: [me.x, me.y, W].concat(...opp.map((p) => [p.x, p.y])), anchor: (seat) => (seat === 0 ? me : seat === mateSeat() ? { x: anchor(seat).x, y: yb } : { x: anchor(seat).x, y: fit.y(anchor(seat).x) }) };   // 组队：队友在底边上（以前被投到顶边，指他的连线跑到上面去）
  }
  /* 桌沿只在形状真变了（窗口变了、座位重排了）时才重量重画；以前每次刷新座位都重画、长度一变就让常驻光从头开始绕，
   * 手机上看着就是「卡住、又闪到别处」（2026-11-13 用户）。
   * 常驻光（2026-11-13 用户提议）：三颗彗星（亮头 + 渐淡的尾巴）等距绕桌，花样周期 = 一圈的 1/3，所以永远无缝循环；
   * 形状变了也接着原来的进度走。指人 / 情绪效果出来时它们不停，只是淡下去让位，效果收了再慢慢亮回来——一直在动，没有「衔接」的跳变 */
  const AMB_MS = 3000;   // 每颗走完 1/3 圈的时间（= 一整圈 9 秒）
  function rimRender() {
    let sv = els.table.querySelector(':scope > .zm-rim');
    if (!game || !game.state) { if (sv) sv.remove(); return null; }
    if (tableTurning) return sv;   // 头像还在滑：先留着原来那圈，滑完再重画
    const g = rimGeom();
    if (!g) return sv;
    if (!sv) {
      sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('class', 'zm-rim');
      sv.innerHTML = '<path class="base"/><g class="amb"><path class="tail"/><path class="halo"/><path class="head"/></g><g class="fuse"><path class="trail"/><path class="sglow"/><path class="spark"/></g><g class="links"></g>';
      els.table.insertBefore(sv, els.dir);
    }
    sv._anchor = g.anchor;
    const dir = dirNow();
    // 座位跳一下 / 抖一下、取整翻了 1px 都不算「变了」：各点都在 2px 以内就不重画
    const same = sv._keys && sv._keys.length === g.keys.length && g.keys.every((v, i) => Math.abs(v - sv._keys[i]) <= 2);
    if (same && sv._dir === dir) return sv;
    sv._keys = g.keys;
    sv._d = g.d; sv._dir = dir;
    sv.querySelectorAll('.base, .amb path, .fuse path').forEach((p) => p.setAttribute('d', g.d));
    const base = sv.querySelector('.base'), L = base.getTotalLength();
    const pts = []; for (let l = 0; l < L; l += RIM_STEP) { const q = base.getPointAtLength(l); pts.push({ x: q.x, y: q.y }); }   // 连线时按点在圈上走
    sv._pts = pts;
    buildAmb(sv);
    rimMood(sv, true);
    return sv;
  }
  /* 常驻彗星：尾巴 64px、亮头 16px，头在前进方向那一端。平时三颗；马戏团六颗互相追（2026-11-14 用户：大胆一点，至少五颗）。
   * 每颗走的速度不变（一段 = 一圈的 1/N，时长跟着按比例缩） */
  function ambCount(sv) { return sv.dataset.mood === 'circus' ? 6 : 3; }
  function buildAmb(sv) {
    const L = sv.querySelector('.base').getTotalLength(), N = ambCount(sv), P = L / N, dur = AMB_MS * 3 / N, dir = dirNow();
    const tail = sv.querySelector('.amb .tail'), head = sv.querySelector('.amb .head'), halo = sv.querySelector('.amb .halo');
    tail.style.strokeDasharray = '64 ' + (P - 64).toFixed(2);
    head.style.strokeDasharray = '16 ' + (P - 16).toFixed(2);
    // 亮头的光晕：不用 drop-shadow（2026-11-16 实测：每帧整圈桌沿重做 blur，掉帧多一倍），改成一截更宽更淡的线跟着亮头走，两头各多出 3px
    halo.style.strokeDasharray = '22 ' + (P - 22).toFixed(2);
    const t0 = sv._ambAnims && sv._ambAnims[0] ? (sv._ambAnims[0].currentTime || 0) : 0;
    (sv._ambAnims || []).forEach((an) => an.cancel());
    sv._ambAnims = []; sv._ambN = N;
    if (fx.reduce()) return;
    // 路径本身逆时针（我 → 右 → 上 → 左）；出牌方向 1 = 桌上逆时针 = 顺着路径走（dashoffset 变小），-1 倒着走
    const hOff = dir === 1 ? -48 : 0;
    [[tail, 0], [halo, hOff + 3], [head, hOff]].forEach(([el, off]) => {
      const an = el.animate(dir === 1 ? [{ strokeDashoffset: off }, { strokeDashoffset: off - P }] : [{ strokeDashoffset: off }, { strokeDashoffset: off + P }], { duration: dur, iterations: Infinity, easing: 'linear' });
      an.currentTime = t0 % dur;
      an.playbackRate = (sv._rate || 1) * (sv._moodRate || 1);
      sv._ambAnims.push(an);
    });
  }
  /* 桌沿跟着背景音乐换气氛（2026-11-14 用户：音乐一变氛围就变，平时轮巡的那圈光也要跟着变；音乐变回来，光也变回来）。
   * 跟的是「正在放的那一版」（ZhamaoMusic.state().track，没开音乐时按导演想放的那版），所以和音乐在同一小节换：
   *   甲 chase 猫捉老鼠（平常）：三颗金色彗星顺着出牌方向慢慢绕（原样）
   *   乙 chip 电子炸毛（紧张）：彗星变珊瑚红、绕得快一倍，整圈跟着 160 拍一下一下地「心跳」
   *   丙 circus 疯狂马戏团：彗星淡去，换成一圈跑马灯小灯泡，金 / 樱桃红相间，踩着 176 拍顺着出牌方向一格一格跑 */
  const MOOD_BPM = { chase: 152, chip: 160, circus: 176, funk: 118 };
  /* 丁 funk 导火索放克（一局打完、结算的时候放）：桌沿变成一根慢慢烧的导火索——一颗火星拖着一小截余烬顺着出牌方向爬，
   * 踩在放克那几下切分的底鼓上闪一下、溅几点火花（2026-11-14 用户批） */
  const FUSE_MS = 16000, FUSE_TRAIL = 70;
  function musicMood() {
    const Mz = window.ZhamaoMusic, st = Mz && Mz.state ? Mz.state() : null;
    const id = st && (st.track || st.want);
    return MOOD_BPM[id] ? id : 'chase';
  }
  function rimMood(sv, rebuild) {
    sv = sv || els.table.querySelector(':scope > .zm-rim');
    if (!sv || !sv._d) return;
    const mood = musicMood(), dir = dirNow();
    if (!rebuild && sv.dataset.mood === mood) return;
    sv.dataset.mood = mood;
    els.app.dataset.rimMood = mood;   // 箭头也跟着换情绪（CSS）
    (sv._moodAnims || []).forEach((an) => an.cancel());
    sv._moodAnims = [];
    // 马戏团（用户三版里挑了丙 · 双色彗星）：六颗樱桃红尾巴、金色亮头的彗星互相追，绕得快一点，踩拍鼓一下
    sv._moodRate = mood === 'chip' ? 2.1 : mood === 'circus' ? 1.4 : 1;
    if (sv._ambN !== ambCount(sv)) buildAmb(sv);
    (sv._ambAnims || []).forEach((an) => { const r = (sv._rate || 1) * sv._moodRate; if (an.updatePlaybackRate) an.updatePlaybackRate(r); else an.playbackRate = r; });
    if (mood === 'funk' && !fx.reduce()) {
      const L = sv.querySelector('.base').getTotalLength(), trail = sv.querySelector('.fuse .trail'), spark = sv.querySelector('.fuse .spark'), sglow = sv.querySelector('.fuse .sglow');
      trail.style.strokeDasharray = FUSE_TRAIL + ' ' + (L - FUSE_TRAIL).toFixed(2);
      spark.style.strokeDasharray = '0.01 ' + (L - 0.01).toFixed(2);
      sglow.style.strokeDasharray = '0.01 ' + (L - 0.01).toFixed(2);   // 火星的光晕：一颗更大更淡的圆点跟着走（代替 drop-shadow）
      // 火星在余烬往前走的那一头：方向 1 = 顺着路径（dashoffset 变小），火星在这截的尾端；方向 -1 在开头
      const sOff = dir === 1 ? -FUSE_TRAIL : 0, go = dir === 1 ? -L : L;
      sv._moodAnims.push(trail.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: go }], { duration: FUSE_MS, iterations: Infinity, easing: 'linear' }));
      const sa = spark.animate([{ strokeDashoffset: sOff }, { strokeDashoffset: sOff + go }], { duration: FUSE_MS, iterations: Infinity, easing: 'linear' });
      sv._moodAnims.push(sa);
      const ga = sglow.animate([{ strokeDashoffset: sOff }, { strokeDashoffset: sOff + go }], { duration: FUSE_MS, iterations: Infinity, easing: 'linear' });
      sv._moodAnims.push(ga);
      sv._fuse = { anim: sa, L, sOff, go };
    }
    if (fx.reduce() || sv._synced) return;   // 跟上音乐的鼓点了：心跳 / 跑马灯由 onBeat 一拍一拍地打，不用下面这套自己走的
    const beat = 60000 / MOOD_BPM[mood];
    if (mood === 'chip') {
      sv._moodAnims.push(sv.querySelector('.base').animate([{ strokeWidth: 3.4, opacity: 1 }, { strokeWidth: 1.6, opacity: 0.55, offset: 0.35 }, { strokeWidth: 1.6, opacity: 0.55 }], { duration: beat, iterations: Infinity, easing: 'ease-out' }));
    }
  }
  setInterval(() => { if (game && game.state) rimMood(); }, 400);
  /* 踩鼓点（2026-11-14 用户：光要和音乐节奏一致，最好踩在鼓点上）：每一帧问音乐「现在听到的是哪一版的第几格」，
   * 走到底鼓那一格就让桌沿和箭头动一下。甲只在第 1、3 拍（两下底鼓）轻轻亮；乙每拍一下心跳；丙六颗彗星的亮头每拍鼓一下、箭头强拍点头。
   * 没开音乐 / 静音：没有时钟，就退回 rimMood 里那套自己按拍速走的 */
  const BEAT_STEPS = { chase: [0, 8], chip: [0, 4, 8, 12], circus: [0, 4, 8, 12], funk: [0, 7, 10] };   // 放克：第 1 拍、切分的「7」、第 10 格三下底鼓
  let lastBeatKey = '';
  function beatTick() {
    requestAnimationFrame(beatTick);
    const sv = game && game.state ? els.table.querySelector(':scope > .zm-rim') : null;
    if (!sv) return;
    const Mz = window.ZhamaoMusic, c = !fx.reduce() && Mz && Mz.clock ? Mz.clock() : null;
    let m = null;
    if (c) for (let i = c.marks.length - 1; i >= 0; i--) if (c.marks[i].t <= c.now) { m = c.marks[i]; break; }
    const ok = !!(m && c.now - m.t < 3 && BEAT_STEPS[m.id]);
    if (ok !== !!sv._synced) { sv._synced = ok; rimMood(sv, true); }   // 跟上 / 断了：换另一套
    if (!ok) return;
    const st = (m.st0 + m.st1) / 2, step = Math.floor((c.now - m.t) / st);
    let b = -1; for (const x of BEAT_STEPS[m.id]) if (x <= step) b = x;
    if (b < 0 || step > 15) return;
    const key = m.t.toFixed(3) + ':' + b;
    if (key === lastBeatKey) return;
    lastBeatKey = key;
    if (c.now - (m.t + b * st) > 0.12) return;   // 已经过了这一拍一截（切回前台之类）：不补打
    onBeat(sv, sv.dataset.mood, b, st * 4 * 1000);
  }
  requestAnimationFrame(beatTick);
  function onBeat(sv, mood, b, beatMs) {
    const arrows = els.dir ? els.dir.querySelectorAll('i') : [];
    if (mood === 'chase') {
      // 平常：两颗金彗星的亮头鼓一下、尾巴亮一下，箭头轻轻点一下头
      sv.querySelector('.amb .head').animate([{ strokeWidth: 4.6 }, { strokeWidth: 2.8 }], { duration: beatMs * 0.9, easing: 'ease-out' });
      sv.querySelector('.amb .tail').animate([{ opacity: 0.95 }, { opacity: 0.62 }], { duration: beatMs * 0.9, easing: 'ease-out' });
      arrows.forEach((a) => a.animate([{ scale: '1.42' }, { scale: '1.3' }], { duration: beatMs * 0.7, easing: 'ease-out' }));
    } else if (mood === 'chip') {
      // 紧张：整圈心跳（拍头最粗最亮、很快落下去），箭头跟着跳得更狠
      sv.querySelector('.base').animate([{ strokeWidth: 3.6, opacity: 1 }, { strokeWidth: 1.6, opacity: 0.55 }], { duration: beatMs * 0.85, easing: 'cubic-bezier(.2,.7,.3,1)' });
      arrows.forEach((a) => a.animate([{ scale: '1.55' }, { scale: '1.3' }], { duration: beatMs * 0.8, easing: 'cubic-bezier(.2,.7,.3,1)' }));
    } else if (mood === 'funk') {
      // 导火索：火星一亮、溅几点火花
      const f = sv._fuse;
      if (!f) return;
      sv.querySelector('.fuse .spark').animate([{ strokeWidth: 12 }, { strokeWidth: 5 }], { duration: beatMs * 0.8, easing: 'ease-out' });
      sv.querySelector('.fuse .trail').animate([{ opacity: 1 }, { opacity: 0.7 }], { duration: beatMs * 0.8, easing: 'ease-out' });
      const pr = f.anim.effect.getComputedTiming().progress || 0, off = f.sOff + f.go * pr;
      const q = sv.querySelector('.base').getPointAtLength(((-off % f.L) + f.L) % f.L), r = sv.getBoundingClientRect();
      fx.burst(r.left + q.x, r.top + q.y, { n: b === 0 ? 7 : 4, shapes: ['dot', 'star'], colors: ['#ffd27a', '#ff9a3c', '#fff4c8'], radius: b === 0 ? 26 : 18, size: [3, 7], life: 520, gravity: 30, pattern: 'scatter' });
    } else if (mood === 'circus') {
      // 马戏团：六颗彗星的亮头每拍鼓一下，箭头只在强拍点头（2026-11-14 用户：原来的跑马灯太晃眼）
      sv.querySelector('.amb .head').animate([{ strokeWidth: 4.4 }, { strokeWidth: 2.8 }], { duration: beatMs * 0.85, easing: 'ease-out' });
      if (b === 0 || b === 8) arrows.forEach((a) => a.animate([{ scale: '1.4' }, { scale: '1.3' }], { duration: beatMs * 0.8, easing: 'ease-out' }));
    }
  }
  // 特殊效果占用桌沿时，常驻光淡下去让位（不停）；都结束了再亮回来
  let ambHoldUntil = 0, ambTimer = 0;
  function ambQuiet(ms) {
    const sv = els.table.querySelector(':scope > .zm-rim');
    if (!sv) return;
    ms /= turboK();
    ambHoldUntil = Math.max(ambHoldUntil, performance.now() + ms);
    sv.classList.add('is-busy');
    clearTimeout(ambTimer);
    const check = () => {
      const busy = performance.now() < ambHoldUntil || sv.querySelector('.links g, .fx');
      if (busy) { ambTimer = setTimeout(check, 200); return; }
      sv.classList.remove('is-busy');
    };
    ambTimer = setTimeout(check, Math.max(60, ms));
  }
  function releaseRim(opts) { if (game && game.rimLk) { game.rimLk.remove(opts); game.rimLk = null; } }
  // 桌沿上从 a 走到 b 的那一串点的序号（rimLink 的连线、作废导火索的局部灯带共用）。往哪边走见 rimLink 里的说明
  function rimNear(sv, p) { const pts = sv._pts; let bi = 0, bd = Infinity; pts.forEach((q, i) => { const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (dd < bd) { bd = dd; bi = i; } }); return bi; }
  function rimRoute(sv, a, b, flow) {
    const N = sv._pts.length, ia = rimNear(sv, sv._anchor(a)), ib = rimNear(sv, sv._anchor(b));
    const fwd = (ib - ia + N) % N, back = (ia - ib + N) % N;
    const dir = dirNow();
    const shortWay = fwd <= back ? 1 : -1, clear = Math.min(fwd, back) < Math.max(fwd, back) * 0.7;
    const stepDir = !flow && clear ? shortWay : (dir === -1 ? -1 : 1), cnt = stepDir === 1 ? fwd : back;
    const out = []; for (let k = 0; k <= cnt; k++) out.push((ia + stepDir * k + N) % N);
    return out;
  }
  // flow：甩锅 / 自由甩锅——锅是顺着出牌方向往前传的，连线一律顺着当前方向走（自由甩锅给上家就几乎绕一圈，扫过被跳过的每一家）
  function rimLink(a, b, flow, color) {
    const sv = rimRender();
    if (!sv || !sv._pts || a === b) return null;
    ambQuiet(400);
    const pts = sv._pts;
    const seg = rimRoute(sv, a, b, flow).map((i) => pts[i]);
    /* 往哪边走（2026-11-14 用户两次反馈）：
     * ① 5 人局最右那家甩锅给左下角的我（屏幕上两条路差不多长）：线逆着出牌方向走，应该顺着；
     * ② 9 人局零七（上排偏右）索要我：按「中间隔几个人」挑了往右那边，可我坐在左下角、对手全在上排，
     *    往右要绕右边 + 整条底边，屏幕上反而是长的那条，还逆着出牌方向。
     * 现在按屏幕上实际走的路程挑：一边明显短（比另一边短 30% 以上）就走短的；两边差不超过 30%（对角之类）就顺着出牌方向（2026-11-14 用户定 30%，原来是 25%）。
     * 甩锅 / 索要 / 交换 / 偷 / 点名都按这个。路径上序号变大 = 座位号变大（我 → 1 号 → 2 号 …），所以「顺着出牌方向」= 序号往 dirNow() 那边走 */
    const d = 'M' + seg.map((q) => q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('L');
    // 任何时候桌沿上只有一条指向的光带（2026-11-14 用户：5 倍速时好几条叠在一起打架）：新的一来，旧的马上撤
    sv.querySelectorAll('.links > g').forEach((old) => { if (old._kill) old._kill(); else old.remove(); });
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const end = seg[seg.length - 1];
    if (b === 0) g.classList.add('is-me');
    if (color) g.style.setProperty('--lh', color);   // 连线 = 牌色（2026-11-18；原来冲着我一律红，改成和准星同一个牌色）；被作废变灰见 CSS .is-dull
    g.innerHTML = '<path class="lglow" d="' + d + '"/><path class="lline" d="' + d + '"/><circle class="lhalo" r="8"/><circle class="lhead" r="4"/><circle class="lend" cx="' + end.x.toFixed(1) + '" cy="' + end.y.toFixed(1) + '" r="6"/>';
    sv.querySelector('.links').appendChild(g);
    const paths = g.querySelectorAll('path'), len = Math.max(1, paths[1].getTotalLength()), head = g.querySelector('.lhead'), halo = g.querySelector('.lhalo'), endDot = g.querySelector('.lend');
    paths.forEach((p) => { p.style.strokeDasharray = len + ' ' + (len + 10); p.style.strokeDashoffset = len; });
    const growMs = Math.min(650, 220 + len * 0.9);   // 光带的长 / 收是 requestAnimationFrame 自己算的：tween 里按快进倍数缩
    let raf = 0, grown = false, pending = null, dead = false;
    // 可见的一截 = [lo, hi]（0..1，沿出牌人 → 被指的人）；head 画在 hi 处
    let cur = [0, 0], draf = 0;   // cur：现在露出来的那截；draf：作废之后变灰收回那段动画自己的帧（收的时候先停掉它）
    const bye = () => g.remove();
    const show = (lo, hi) => {
      cur = [lo, hi];
      const q = paths[1].getPointAtLength(len * hi), x = q.x.toFixed(1), y = q.y.toFixed(1); head.setAttribute('cx', x); head.setAttribute('cy', y); halo.setAttribute('cx', x); halo.setAttribute('cy', y);
      const gone = hi - lo < 0.012; head.style.opacity = gone ? 0 : ''; halo.style.opacity = gone ? 0 : '';
      paths.forEach((p) => { p.style.strokeDasharray = Math.max(0.01, len * (hi - lo)).toFixed(1) + ' ' + (len * 2).toFixed(0); p.style.strokeDashoffset = (-len * lo).toFixed(1); });
    };
    const tween = (ms0, fn, done) => {
      const ms = ms0 / turboK(), t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / ms); fn(k); if (k < 1) raf = requestAnimationFrame(step); else if (done) done(); };
      raf = requestAnimationFrame(step);
    };
    const finish = (opts) => {
      cancelAnimationFrame(draf);
      if (!g.isConnected) return;
      endDot.classList.remove('is-on');
      if (fx.reduce()) { bye(); return; }
      if (opts && opts.mode === 'push') {
        // 推过去（甩锅）：尾巴从出牌人这头追到被指的人那头，像锅一路滑到他面前
        endDot.classList.add('is-hit');
        tween(Math.min(620, 260 + len * 0.7), (k) => show(k * k * (3 - 2 * k), 1), bye);
      } else {
        // 缩回（抽到 / 给到 / 换完 / 落空 / 被作废）：头从被指的人那头缩回出牌人；被作废的话整条先变灰、慢慢地蔫回去
        if (opts && opts.dull) g.classList.add('is-dull');
        if (cur[1] - cur[0] < 0.012) { bye(); return; }   // 作废时已经收回去了
        const ms = opts && opts.dull ? Math.min(480, 180 + len * 0.6) : Math.min(480, 180 + len * 0.6), h0 = cur[1], l0 = cur[0];
        tween(ms, (k) => show(l0, l0 + (h0 - l0) * (1 - k * k)), bye);
      }
    };
    if (fx.reduce()) { show(0, 1); grown = true; endDot.classList.add('is-on'); }
    else tween(growMs, (k) => show(0, 1 - Math.pow(1 - k, 3)), () => {
      grown = true; endDot.classList.add('is-on');
      if (pending) { const o = pending; pending = null; setTimeout(() => { if (!dead) finish(o); }, ((o && o.hold) || 220) / turboK()); }
    });
    g._kill = () => { dead = true; pending = null; cancelAnimationFrame(raf); cancelAnimationFrame(draf); bye(); };
    return {
      // 有人作废（单数张）就变灰、再被作废回来就亮回金色（2026-11-13 用户：被作废时灯带用灰色收回来，情绪更到位）
      /* 被作废（2026-11-18 用户定）：伸出去的连线变灰、从被冲着的人那头收回出牌人；再被作废回来就重新伸出去、恢复牌色。
       * 打在作废牌拍到桌上那一下（stageVerdict），单机里没人再表态也照样放完。准星同时变灰停转 */
      setDull(on) {
        if (dead) return;
        on = !!on;
        if (g.classList.contains('is-dull') === on) return;
        if (game && game.arrow && game.arrow.tint) game.arrow.tint(on ? '#a2998b' : null);
        g.classList.toggle('is-dull', on);
        endDot.classList.toggle('is-on', !on);
        cancelAnimationFrame(draf);
        const h0 = cur[1], h1 = on ? 0 : 1;
        if (fx.reduce()) { show(cur[0], h1); return; }
        // 收回和伸出走同一种运动、时间一样长（2026-11-18 用户：加速收回显得仓促）：伸出是先快后慢地长到头，收回就是它倒着放——先慢后快地缩回、收干净
        const D = growMs / turboK(), t0 = performance.now();
        const step = (now) => { if (dead) return; const k = Math.min(1, (now - t0) / D), e = on ? Math.pow(k, 3) : 1 - Math.pow(1 - k, 3); show(cur[0], h0 + (h1 - h0) * e); if (k < 1) draf = requestAnimationFrame(step); };
        draf = requestAnimationFrame(step);
      },
      // 还在长就先长完、停一下再收（2026-11-13 用户：别人甩锅给我，线还没长到我这儿动画就结束了）
      remove(opts) {
        if (dead) return;
        if (!grown) { pending = opts || {}; return; }
        dead = true; cancelAnimationFrame(raf);
        if (opts && opts.hold) setTimeout(() => finish(opts), opts.hold / turboK()); else finish(opts);
      },
    };
  }
  /* ───── 桌沿的情绪 / 进程效果（2026-11-13 用户看过预览后上线）─────
   * 摸到炸弹猫：整圈红光闪三下 + 从他那儿往两边漾开一圈红；逗猫棒救回来：金绿的波纹从他那儿温柔地漾开；炸出局：暗红波纹慢慢漾开、整圈暗一下；
   * 洗牌：一道光绕桌飞转一圈半；转向：一道光倒着扫一圈；作废：紫色小波纹；赢了：金光从赢家绕满一圈、整圈亮两下。
   * 平时：牌堆里炸弹猫越多，桌沿越暖（金 → 橙 → 红）、那点柔光绕得越快 */
  const rimFxOn = () => !fx.reduce() && !(game && game.turbo);   // 快进时桌沿的涟漪 / 闪光 / 绕圈不放（一串串叠起来最卡，2026-11-16）
  function rimLayer(cls) {
    const sv = rimRender();
    if (!sv || !sv._pts) return null;
    ambQuiet(1400);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'fx ' + (cls || ''));
    sv.insertBefore(g, sv.querySelector('.links'));
    return { sv, g };
  }
  /* 光晕：同一条线复制一条更宽、更淡的垫在下面，动画照样放两份（2026-11-16 实测：drop-shadow / blur 在整圈桌沿这么大的 SVG 上
   * 每帧都要重做，彗星那条去掉后 Chrome 掉帧 34→1；涟漪 / 闪光 / 绕圈 / 五色彗星 / 连线也一并换成这招。Safari 里 drop-shadow 本身不贵，
   * 所以只垫一层、别叠多层——多一条动画线在 WebKit 上就多一份主线程开销） */
  function glowTwin(el, extra) {
    // 只垫一层（2026-11-16 三浏览器实测：两层在 Chrome 好、Safari / 微信（WebKit）反而多费；一层两边都最接近「不发光」的开销）
    const c = el.cloneNode(false);
    c.classList.add('glw');
    c.style.strokeWidth = (parseFloat(getComputedStyle(el).strokeWidth) || 4) + (extra || 7) * 0.8;
    el.parentNode.insertBefore(c, el);
    return [c];
  }
  const animTwins = (els, kf, opts) => els.map((x) => x.animate(kf, opts))[els.length - 1];
  function rimFlash(color, times, ms) {
    const L = rimLayer('flash'); if (!L) return;
    L.g.innerHTML = '<path d="' + L.sv.querySelector('.base').getAttribute('d') + '" style="stroke:' + color + ';color:' + color + '"/>';
    const p = L.g.firstChild, f = [];
    for (let i = 0; i < times; i++) f.push({ opacity: 0, offset: i / times }, { opacity: 1, offset: (i + 0.35) / times });
    f.push({ opacity: 0 });
    animTwins([...glowTwin(p, 9), p], f, { duration: ms * times, easing: 'ease-in-out' }).finished.then(() => L.g.remove()).catch(() => L.g.remove());
  }
  function rimRipple(seat, color, ms, width) {
    const L = rimLayer('ripple'); if (!L) return;
    const pts = L.sv._pts, N = pts.length;
    const p0 = L.sv._anchor(seat); let i0 = 0, bd = Infinity;
    pts.forEach((q, i) => { const dd = (q.x - p0.x) ** 2 + (q.y - p0.y) ** 2; if (dd < bd) { bd = dd; i0 = i; } });
    const half = Math.floor(N / 2);
    [1, -1].forEach((dir) => {
      const seg = []; for (let k = 0; k <= half; k++) seg.push(pts[(i0 + dir * k + N) % N]);
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', 'M' + seg.map((q) => q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('L'));
      el.style.stroke = color; el.style.color = color; el.style.strokeWidth = (width || 3.5) + 1;
      L.g.appendChild(el);
      const len = el.getTotalLength(), w = 120;
      el.style.strokeDasharray = w + ' ' + (len + w);
      animTwins([...glowTwin(el, 7), el], [{ strokeDashoffset: w, opacity: 1 }, { strokeDashoffset: -len, opacity: 0.2 }], { duration: ms, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    });
    setTimeout(() => L.g.remove(), (ms + 60) / turboK());
  }
  function rimSwirl(color, laps, ms, reverse) {
    const L = rimLayer('swirl'); if (!L) return;
    L.g.innerHTML = '<path d="' + L.sv.querySelector('.base').getAttribute('d') + '" style="stroke:' + color + '"/>';
    const p = L.g.firstChild, len = p.getTotalLength(), w = 180;
    p.style.color = color;
    p.style.strokeDasharray = w + ' ' + (len - w);
    const a = reverse === -1 ? [{ strokeDashoffset: -len * laps }, { strokeDashoffset: 0 }] : [{ strokeDashoffset: 0 }, { strokeDashoffset: -len * laps }];
    animTwins([...glowTwin(p, 9), p], a, { duration: ms, easing: 'cubic-bezier(.4,0,.3,1)' }).finished.then(() => L.g.remove()).catch(() => L.g.remove());
  }
  function rimFx(e) {
    if (!rimFxOn()) return;
    switch (e.t) {
      case 'boom': break;   // 不在这儿放：摸牌时还没揭晓是不是炸弹猫，要等它炸开那一下（animBoom）再红（2026-11-14 用户：保留悬念）
      case 'defuse': rimRipple(e.seat, '#7fb06a', 1300, 3.5); setTimeout(() => rimRipple(e.seat, '#d9b45a', 1300, 2.5), 180); break;
      case 'out': rimRipple(e.seat, '#7a2a22', 1600, 5); rimDim(1800); break;
      case 'shuffle': rimSwirl('#e6bd62', 1.5, 1300, dirNow()); break;   // 绕桌飞转跟着出牌方向（2026-11-14 用户：转向后洗牌还逆时针转）
      case 'reverse': rimSwirl('#9fc3d6', 1, 1100, e.dir); break;
      case 'flux': rimRipple(e.seat, '#a77bb5', 1100, 3.5); break;   // 换百变规则：梅紫波纹
      case 'nope': break;   // 作废不再在桌沿漾紫波（2026-11-18 用户：多余，往光带某个角涌）
      case 'win': rimSwirl('#f0c862', 1, 1500, dirNow()); rimFlash('#f0c862', 2, 600); break;
      case 'play': if (e.type === 'five') rimRainbow(e.seat); break;   // 五种猫各一张：五色彗星从他那儿绕桌一圈
      case 'pick': rimRipple(e.seat, '#e2b85c', 1000, 3.5); break;     // 从弃牌堆捡到了：金色波纹
    }
  }
  const CAT_HUES = ['#eea25a', '#e58e46', '#3a3530', '#8c7a62', '#7a5644'];   // 橘 / 三花 / 奶牛 / 狸花 / 暹罗
  function rimRainbow(seat) {
    const L = rimLayer('rainbow'); if (!L) return;
    const pts = L.sv._pts, d = L.sv.querySelector('.base').getAttribute('d');
    const p0 = L.sv._anchor(seat); let i0 = 0, bd = Infinity;
    pts.forEach((q, i) => { const dd = (q.x - p0.x) ** 2 + (q.y - p0.y) ** 2; if (dd < bd) { bd = dd; i0 = i; } });
    const start = i0 * RIM_STEP, dir = dirNow();
    CAT_HUES.forEach((c, k) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', d); el.style.stroke = c; el.style.color = c;
      L.g.appendChild(el);
      const len = el.getTotalLength(), w = 34;
      el.style.strokeDasharray = w + ' ' + (len - w);
      const a = -start, b = dir === 1 ? -start - len : -start + len;
      animTwins([...glowTwin(el, 6), el], [{ strokeDashoffset: a, opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.85 }, { strokeDashoffset: b, opacity: 0 }], { duration: 1700, delay: k * 110, easing: 'cubic-bezier(.35,.1,.3,1)', fill: 'both' });
    });
    setTimeout(() => L.g.remove(), (1700 + 5 * 110 + 60) / turboK());
  }
  function rimDim(ms) { const sv = rimRender(); if (!sv) return; sv.animate([{ opacity: 1 }, { opacity: 0.35, offset: 0.3 }, { opacity: 1 }], { duration: ms, easing: 'ease-in-out' }); }
  // 牌堆里炸弹猫的占比 → 桌沿多暖、柔光绕多快
  function rimHeat(p) {
    const sv = els.table.querySelector(':scope > .zm-rim');
    if (!sv) return;
    const h = rimFxOn() ? Math.max(0, Math.min(1, (p - 0.1) / 0.35)) : 0;
    const mix = (a, b) => Math.round(a + (b - a) * h);
    const base = h < 0.5 ? [mix(184, 214), mix(145, 120), mix(74, 50)] : [mix(214, 205), mix(120, 70), mix(50, 52)];
    sv.style.setProperty('--rim-base', 'rgba(' + (h ? base.join(',') : '184,145,74') + ',' + (0.26 + h * 0.2).toFixed(2) + ')');
    sv.style.setProperty('--rim-drift', h ? 'rgba(' + [mix(226, 232), mix(184, 110), mix(92, 70)].join(',') + ',0.65)' : 'rgba(226,184,92,0.55)');
    sv._rate = 1 + h * 1.4;
    (sv._ambAnims || []).forEach((an) => { const r = sv._rate * (sv._moodRate || 1); if (an.updatePlaybackRate) an.updatePlaybackRate(r); else an.playbackRate = r; });
  }
  /* 指向当前出牌的人的那个箭头标红：顺时针（d = 1）是从 t-1 指向 t 的那个（第 t-2 个），反过来是从 t+1 指向 t 的那个（第 t-1 个） */
  function dirHot() {
    if (!els.dir) return;
    const list = els.dir.children, st = game && game.state;
    if (!list.length || !st) return;
    if (ringGame()) {   // 围桌一圈：从轮到的人到下一个出牌的人那一段（按 data-k 认是哪一对）亮朱红
      const t = st.phase === 'over' ? -1 : D().turn, d = dirNow(), pairs = dirPairs();
      Array.from(list).forEach((el) => { const pr = pairs[+el.dataset.k]; const on = t >= 0 && !!pr && (d === -1 ? pr[1] : pr[0]) === t; el.classList.toggle('is-hot', on); el.classList.toggle('is-next', on); });
      return;
    }
    const t = st.phase === 'over' ? -1 : D().turn, d = dirNow(), pairs = dirPairs();
    // 指向当前出牌的人的那个箭头变红：方向 1 指向一对里的后一个，-1 指向前一个
    Array.from(list).forEach((el, i) => el.classList.toggle('is-hot', t >= 0 && !!pairs[i] && (d === -1 ? pairs[i][0] : pairs[i][1]) === t));
    // 围桌一圈（2026-11-18 用户：大家拉开那么远，一圈箭头没必要）：只留轮到的人身边那一个，指向下一个出牌的人
    Array.from(list).forEach((el, i) => el.classList.toggle('is-next', t >= 0 && !!pairs[i] && (d === -1 ? pairs[i][1] : pairs[i][0]) === t));
  }
  /* 打出转向：箭头从出牌人那边起，一个接一个转半圈掉头 */
  async function animReverse(e, t) {
    if (!els.dir || !els.dir.children.length) return;
    snd('flip');
    const list = Array.from(els.dir.children), d = e.dir === -1 ? -1 : 1;
    const pairs = dirPairs(), mid = (k) => (pairs[k] ? (pairs[k][0] + pairs[k][1]) / 2 : k + 1.5);
    const order = e.seat >= 1 && e.seat < game.state.n ? list.map((_, k) => k).sort((x, y) => Math.abs(mid(x) - e.seat) - Math.abs(mid(y) - e.seat)) : list.map((_, k) => k);
    const anims = order.map((k, i) => {
      const el = list[k], to = +el.dataset.base + (d === -1 ? Math.PI : 0), ang = to - Math.PI;   // 从旧方向转半圈到新方向
      if (fx.reduce()) { el.style.transform = 'translate(-50%,-50%) rotate(' + to + 'rad)'; return null; }
      return el.animate([
        { transform: 'translate(-50%,-50%) rotate(' + ang + 'rad) scale(1)', color: '' },
        { transform: 'translate(-50%,-50%) rotate(' + (ang + (to - ang) / 2) + 'rad) scale(1.6)', color: '#b4392c', offset: 0.5 },
        { transform: 'translate(-50%,-50%) rotate(' + to + 'rad) scale(1)' },
      ], { duration: ms(520), delay: i * ms(70), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    });
    await Promise.all(anims);
    if (t !== token) return;
    els.dir.querySelectorAll('i').forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    renderDir();
  }
  function renderSeat(seat) {
    const s = game.state, d = D(), box = seatEl(seat);
    if (!box) return;
    const out = !d.alive[seat];
    const turn = !out && s.phase !== 'over' && d.turn === seat;
    box.classList.toggle('is-out', out);
    box.classList.toggle('is-turn', turn);
    if (turn) dirHot();
    // 结构只建一次：头像 / 名字不重画（动画要拿稳定的元素），只改数字和标记
    if (!box.querySelector('.zm-av')) {
      const tier = seat !== 0 && !game.tutorial ? '<span class="zm-tier"' + (game.tags && game.tags[seat] ? '' : ' hidden') + '></span>' : '';
      box.innerHTML = '<div class="zm-av"><span class="zm-av-face">' + avatarHtml(seat) + '</span>' + CLOCK_SVG + '</div>' +
        '<span class="zm-name">' + esc(nameOf(seat)) + '</span>' + tier;
    }
    const tg = box.querySelector('.zm-tier');
    // 档位不再挂签（看名字 + 头像色系）；只留教程等场合的特别标签
    if (tg) { const txt = (game.tags && game.tags[seat]) || ''; tg.textContent = txt; tg.hidden = !txt; }
    const av = box.querySelector('.zm-av');
    setBadge(av, 'zm-count', !out ? String(d.counts[seat]) : '');   // 2026-11-18 用户：我自己也挂手牌数（右上角小角标）
    const nT = turn && (d.turnsLeft > 1 || game.attackSeat === seat) ? d.turnsLeft : 0;
    const tv = els.app.dataset.uivTurns;   // 预览（本机对比，未定）：hat 扣锅 / ring 红圈分段 / beads 红珠
    if (tv) { setBadge(av, 'zm-turns', ''); setPotMark(av, tv, nT); } else setBadge(av, 'zm-turns', nT ? '×' + nT : '');
    // 角色猫：头像角上一枚圆章（2026-11-26 起在左下角，让开头上扣的锅 ×N），只画这只猫（2026-11-19 用户：斜插小卡缩小后字和名字糊成一团、看不出是哪只猫）；点它 = 展开整张角色卡
    const role = s.roles ? s.roles[seat] : null;
    let rb = av.querySelector('.zm-role');
    if (!role) { if (rb) rb.remove(); }
    else {
      if (!rb || rb.dataset.role !== role) {
        if (rb) rb.remove();
        rb = document.createElement('i'); rb.className = 'zm-role'; rb.dataset.role = role; rb.style.setProperty('--rbg', (ART.ROLE_TONE[role] || ART.ROLE_TONE.fat).bg); rb.innerHTML = ART.roleFace(role); av.appendChild(rb);
        rb.addEventListener('click', (ev) => { ev.stopPropagation(); expandRole(+rb.closest('.zm-seat').dataset.seat); });
      }
      rb.style.visibility = game.roleHide && game.roleHide.has(seat) ? 'hidden' : '';   // 开局抽角色：亮出来之前角上空着
      const info = R.ROLES.find((r) => r.id === role);
      rb.classList.toggle('is-used', !!(info && info.once && s.roleUsed && s.roleUsed[seat]));
      rb.title = info ? info.name + '：' + info.desc : '';
    }
    noHelpChip(seat, av, out);
  }
  /* 组队「别救我」（2026-11-19 用户）：我头像左上角一枚小逗猫棒 = 开关，点一下变灰划红线 = 别救我（再点改回来，活着随时能改）；
   * 同队的人开了，他头像上也挂这枚划线的逗猫棒（只有同队看得到——联机服务器只把同队的发过来，单机机器猫从来不开） */
  function noHelpChip(seat, av, out) {
    const s = game.state;
    const on = !!(s.noHelp && s.noHelp[seat]);
    const show = teamGame() && !out && !game.tutorial && (seat === 0 ? !game.spectator && viewSeat < 0 : on && isMate(seat));
    let nb = av.querySelector('.zm-nohelp');
    if (!show) { if (nb) nb.remove(); return; }
    if (!nb) {
      nb = document.createElement(seat === 0 ? 'button' : 'i');
      nb.className = 'zm-nohelp';
      nb.innerHTML = ART.icon('defuse');
      if (seat === 0) { nb.type = 'button'; nb.addEventListener('click', (ev) => { ev.stopPropagation(); toggleNoHelp(); }); }
      av.appendChild(nb);
    }
    nb.classList.toggle('is-off', on);
    if (seat === 0) { nb.setAttribute('aria-pressed', String(on)); nb.setAttribute('aria-label', on ? T('ui.noHelp.on', '别救我（点一下改回可以救）') : T('ui.noHelp.off', '队友可以救我（点一下改成别救我）')); }
  }
  function toggleNoHelp() {
    const s = game && game.state;
    if (!s || !teamGame() || !s.alive[0] || game.spectator || game.tutorial) return;
    const on = !(s.noHelp && s.noHelp[0]);
    if (!s.noHelp) s.noHelp = Array(s.n).fill(false);
    if (game.online) {
      s.noHelp[0] = on;
      online.nhMine = { on, until: Date.now() + 4000 };   // 服务器回来之前别让旧状态把它翻回去
      NET.act(online.code, online.token, 'move', { d: { type: 'noHelp', on } }).catch(() => { if (online && game && game.state && game.state.noHelp) { online.nhMine = null; game.state.noHelp[0] = !on; renderSeat(0); } });
    } else { R.setNoHelp(s, 0, on); save(); }
    snd(on ? 'untap' : 'tap');
    renderSeat(0);
    const nb = avEl(0) && avEl(0).querySelector('.zm-nohelp');
    if (nb) fx.pop(nb, { scale: 1.3 });
  }
  // 联机：同队的开关没有事件，跟着每份状态同步（我自己刚点的，在服务器回话前以本地为准）
  function syncNoHelp(g) {
    const s = game && game.state;
    if (!s || !g || !g.st || !g.st.noHelp) return;
    const loc = rotArr(g.st.noHelp);
    if (online.nhMine && Date.now() < online.nhMine.until) loc[0] = online.nhMine.on;
    const old = s.noHelp || [];
    s.noHelp = loc;
    for (let k = 0; k < s.n; k++) if (!!old[k] !== !!loc[k]) renderSeat(k);
  }
  /* ───── 角色卡（2026-11-18 用户定甲 · 牌桌同款：墨边 + 画 + 一行技能图示 + 名字条；大卡多一句说明）───── */
  function roleInfo(id) { return R.ROLES.find((r) => r.id === id) || { id, name: '', desc: '' }; }
  function roleCardHtml(id, o) {
    o = o || {};
    const t = ART.ROLE_TONE[id] || ART.ROLE_TONE.fat, info = roleInfo(id);
    return '<div class="zm-rc' + (o.big ? ' is-big' : '') + (o.tiny ? ' is-tiny' : '') + '" data-role="' + id + '" style="--rbg:' + t.bg + ';--rband:' + t.band + (o.w ? ';width:' + o.w + 'px' : '') + '">' +
      '<div class="zm-rc-art">' + ART.roleFace(id) + '</div><div class="zm-rc-gl">' + ART.roleGlyph(id) + '</div>' +
      (o.big ? '<div class="zm-rc-tx">' + esc(info.desc) + '</div>' : '') + '<div class="zm-rc-nm' + nmCls(info.name) + '">' + info.name + '</div></div>';
  }
  const roleBackHtml = (w) => '<div class="zm-rc-back" style="width:' + w + 'px">' + ART.ROLE_BACK + '</div>';
  function roleFlipHtml(id, w, big) {
    return '<div class="zm-rc-flip" style="width:' + w + 'px;height:' + Math.round(w * 1.4) + 'px"><div class="zm-rc-flip-in"><div class="zm-rc-flip-b">' + roleBackHtml(w) + '</div><div class="zm-rc-flip-f">' + roleCardHtml(id, { big, w }) + '</div></div></div>';
  }
  const roleBadge = (seat) => { const a = avEl(seat); return a && a.querySelector('.zm-role'); };
  // 一个元素从 from 矩形「飞」到它自己现在的位置（FLIP）；rot 起始歪多少度
  function flipFrom(el, from, dur, rot, ease) {
    const r = el.getBoundingClientRect();
    if (!from || !r.width || fx.reduce()) return Promise.resolve();
    const dx = from.left + from.width / 2 - (r.left + r.width / 2), dy = from.top + from.height / 2 - (r.top + r.height / 2), k = from.width / r.width;
    return el.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + k.toFixed(3) + ') rotate(' + (rot || 0) + 'deg)' }, { transform: 'none' }],
      { duration: dur, easing: ease || 'cubic-bezier(.3,.8,.3,1)' }).finished.catch(() => {});
  }
  function flipTo(el, to, dur, rot, ref) {
    const r = el.getBoundingClientRect(), rr = ref ? ref.getBoundingClientRect() : r;
    if (!to || !r.width || fx.reduce()) return Promise.resolve();
    // ref：缩放按 ref（里面那张卡）算、落点对准 ref 的中心（el 是卡 + 名签一整块时用）
    const k = to.width / rr.width, ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    const dx = to.left + to.width / 2 - (ox + (rr.left + rr.width / 2 - ox) * k), dy = to.top + to.height / 2 - (oy + (rr.top + rr.height / 2 - oy) * k);
    return el.animate([{ transform: 'none' }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + k.toFixed(3) + ') rotate(' + (rot || 0) + 'deg)' }],
      { duration: dur, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
  }

  /* 点头像角上的小卡 → 小卡从头像飞到桌心放大成整张角色卡，上面挂这人的头像 + 名字；点哪儿都收回去（代替以前那条文字提示） */
  let roleView = null;
  function closeRoleView() {
    const v = roleView;
    if (!v) return;
    roleView = null;
    if (!v.wrap.isConnected) return;
    v.wrap.style.pointerEvents = 'none';
    // 2026-11-19 用户：收的时候名签比卡慢半拍、卡没了名签还挂着 → 名签和卡是一体（整个 .zm-role-it）一起缩回头像，名签同时淡掉
    v.wrap.animate([{ backgroundColor: getComputedStyle(v.wrap).backgroundColor }, { backgroundColor: 'transparent' }], { duration: 300, fill: 'forwards' });
    Promise.all(v.items.map((it) => {
      const b = it.back(), chip = it.it.querySelector('.zm-role-chip');
      if (chip && !fx.reduce()) chip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      return flipTo(it.it, b && b.isConnected ? b.getBoundingClientRect() : null, 340, 0, it.card);
    })).then(() => {
      v.wrap.remove();
      v.items.forEach((it) => { const b = it.back(); if (b) { b.style.visibility = ''; fx.pop(b, { scale: 1.5, dur: 320 }); } });
    });
  }
  function openRoleView(seats, from) {
    if (roleView || !game || !game.state.roles) return;
    const st = game.state, big = seats.length === 1;
    const wrap = document.createElement('div');
    wrap.className = 'zm-role-view' + (big ? '' : ' is-gal');
    const vw = innerWidth, vh = innerHeight, n = seats.length;
    const cols = big ? 1 : vw < 600 ? Math.min(n, n > 4 ? 3 : 2) : Math.min(n, 5);
    const rows = Math.ceil(n / cols);
    const w = Math.round(big ? Math.min(240, vw * 0.58, vh * 0.42) : Math.min(180, (vw - 40) / cols - 14, (vh - 60) / rows / 1.62));
    wrap.style.setProperty('--cols', cols);
    wrap.innerHTML = '<div class="zm-role-view-in">' + seats.map((seat) => '<div class="zm-role-it"><div class="zm-role-chip"><span class="zm-role-chip-av">' + avatarHtml(seat) + '</span><b>' + esc(seat === meSeat() ? T('ui.me', '我') : nameOf(seat)) + '</b></div>' + roleCardHtml(st.roles[seat], { big: true, w }) + '</div>').join('') + '</div>';
    els.fly.appendChild(wrap);
    const items = [...wrap.querySelectorAll('.zm-role-it')].map((it, i) => ({ it, card: it.querySelector('.zm-rc'), back: () => roleBadge(seats[i]) }));
    wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    items.forEach((x, i) => {
      const b = x.back();
      if (b) b.style.visibility = 'hidden';
      x.card.style.opacity = '0';
      setTimeout(() => { x.card.style.opacity = ''; flipFrom(x.card, b ? b.getBoundingClientRect() : null, 420, 0); }, big ? 0 : i * 60);
      const chip = x.it.querySelector('.zm-role-chip');
      if (!fx.reduce()) chip.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: 300 + (big ? 0 : i * 60), fill: 'backwards' });
    });
    snd('tap');
    roleView = { wrap, items };
    wrap.addEventListener('click', (ev) => { ev.stopPropagation(); closeRoleView(); });
  }
  function expandRole(seat) { if (game && game.state.roles && game.state.roles[seat]) openRoleView([seat], 'badge'); }
  /* 本桌图鉴：2026-11-19 用户撤掉桌角那一叠（右上「？」里已经有图鉴）；留个空函数把老节点清掉 */
  function renderRoleFan() { const el = document.getElementById('zmRoleFan'); if (el) el.remove(); }
  /* 预览：甩锅标记的三种新画法（都不往头像外面伸出角标）
   * hat  扣锅：一口倒扣的锅扣在头上（「把锅扣他头上」），锅肚上写 ×N；摸完一回合数字弹一下，全摸完锅被掀飞
   * ring 红圈分段：轮到他的那圈红描边切成 N 段，摸完一回合熄一段，全熄了才算结清
   * beads 红珠：头像描边左上那段串 N 颗朱红小珠（像算盘珠），摸完一回合掉一颗，掉完才算结清 */
  function setPotMark(av, kind, n) {
    let m = av.querySelector('.zm-pm');
    if (m && m.dataset.kind !== kind) { m.remove(); m = null; }
    if (!n) {
      if (!m || m.classList.contains('is-gone')) return;
      m.classList.add('is-gone');
      const out = kind === 'ring' || kind === 'beads' ? [{ opacity: 1 }, { opacity: 0, scale: '1.2' }]
        : kind === 'hat' ? [{ opacity: 1, translate: '0 0', rotate: '0deg' }, { opacity: 1, translate: '4px -10px', rotate: '20deg', offset: 0.4 }, { opacity: 0, translate: '18px -30px', rotate: '70deg' }]
        : [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '-14px 8px', rotate: '-25deg' }];
      const mm = m;
      mm.animate(out, { duration: kind === 'ring' ? 420 : 560, easing: 'cubic-bezier(.4,0,.7,.6)', fill: 'forwards' }).finished.then(() => mm.remove(), () => mm.remove());
      return;
    }
    const fresh = !m || m.classList.contains('is-gone');
    if (fresh) {
      if (m) m.remove();
      m = document.createElement('span');
      m.className = 'zm-pm zm-pm-' + kind; m.dataset.kind = kind;
      av.appendChild(m);
    }
    const prev = +m.dataset.n || 0;
    if (prev === n) return;
    m.dataset.n = n;
    if (kind === 'ring') {
      const total = Math.max(n, +m.dataset.total || 0);
      m.dataset.total = total;
      const gap = total > 1 ? 7 : 0, seg = 100 / total - gap;
      m.innerHTML = '<svg viewBox="0 0 50 50" aria-hidden="true">' + Array.from({ length: total }, (_, k) =>
        '<circle cx="25" cy="25" r="23" pathLength="100" class="' + (k >= n ? 'is-used' : '') + '" style="stroke-dasharray:' + seg.toFixed(2) + ' ' + (100 - seg).toFixed(2) + ';stroke-dashoffset:' + (-(k * 100 / total + gap / 2)).toFixed(2) + '"/>').join('') + '</svg>';
      if (fresh) m.animate([{ opacity: 0, scale: '1.25' }, { opacity: 1, scale: '1' }], { duration: 320, easing: 'ease-out' });
      else { const c = m.querySelectorAll('circle')[n]; if (c) c.animate([{ stroke: 'var(--zm-seal)', strokeWidth: 5 }, { stroke: '#d9cfbf', strokeWidth: 3 }], { duration: 480, easing: 'ease-out' }); }
      return;
    }
    if (kind === 'beads') {
      const have = Array.from(m.querySelectorAll('i:not(.is-gone)'));
      for (let k = have.length; k < Math.min(n, 6); k++) {
        const e = document.createElement('i');
        e.style.setProperty('--a', (-90 - k * 26) + 'deg');
        m.appendChild(e);
        e.animate([{ opacity: 0, scale: '2.2' }, { opacity: 1, scale: '1' }], { duration: 260, delay: (k - have.length) * 80, easing: 'ease-out', fill: 'backwards' });
      }
      for (let k = have.length - 1; k >= n; k--) {
        const e = have[k]; e.classList.add('is-gone');
        e.animate([{ opacity: 1, scale: '1' }, { opacity: 1, scale: '1.6', offset: 0.3 }, { opacity: 0, scale: '0.3' }], { duration: 420, easing: 'ease-in', fill: 'forwards' }).finished.then(() => e.remove(), () => e.remove());
      }
      return;
    }
    const landed = fresh && kind === 'hat' && game && game.hatLand === +(av.closest('.zm-seat') || {}).dataset?.seat;
    if (landed) game.hatLand = -1;
    if (fresh) {
      m.innerHTML = '<i>' + ART.PROPS.pot + '</i><b></b>';
      if (!landed) m.animate(kind === 'hat' ? [{ opacity: 0, translate: '0 -26px', rotate: '-30deg' }, { opacity: 1, translate: '0 2px', rotate: '4deg', offset: 0.75 }, { opacity: 1, translate: '0 0', rotate: '0deg' }]
        : [{ opacity: 0, translate: '10px 6px' }, { opacity: 1, translate: '0 0' }], { duration: 380, easing: 'ease-out' });
    }
    const b = m.querySelector('b');
    b.textContent = '×' + n;
    if (!fresh) fx.pop(b, { scale: 1.45, dur: 320 });
  }
  // 角标：数字变了就弹一下
  function setBadge(av, cls, text) {
    let b = av.querySelector('.' + cls);
    if (!text) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = cls; av.appendChild(b); b.textContent = text; fx.pop(b, { scale: 1.35 }); return; }
    if (b.textContent !== text) {
      b.textContent = text;
      // 机器猫摸牌吞进头像时：数字从下往上翻进来一格（其它时候照旧弹一下）
      if (cls === 'zm-count' && av._roll && !fx.reduce()) b.animate([{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: ms(240), easing: 'cubic-bezier(.3,.8,.4,1)' });
      else fx.pop(b, { scale: 1.3, dur: 300 });
    }
  }
  function renderSeats() {
    for (let i = 0; i < game.state.n; i++) renderSeat(i);
    renderDir();
    if (teamGame()) {
      renderScore();
      // 彗星跟着轮到的那队变色（2026-11-18 用户挑的灯带方案）
      const sv = els.table.querySelector(':scope > .zm-rim'), d = D(), tn = game.state.phase === 'over' ? -1 : d.turn;
      if (sv) { if (tn >= 0) sv.style.setProperty('--team-c', TEAM_INK[teamIdx(tn)]); sv.classList.add('is-teamtint'); }
    }
  }

  /* 组队求救的三句：喊救 / 别救我 / 接着（递逗猫棒）。2026-11-20 用户挑甲：还是字，换成救援那套颜色——
   * 救我 = 朱红、接着 = 暖金（逗猫棒的光，以前是作废的紫色）、别救我 = 灰纸 */
  function rescueBubble(seat, kind) {
    const ms = kind === 'catch' ? 1600 : 2200;
    const text = kind === 'help' ? T('ui.rescue.help', '救我！') : kind === 'catch' ? T('ui.rescue.catch', '接着！') : T('ui.rescue.refuse', '别救我！');
    return bubble(seat, text, { loud: true, ms, cls: 'is-sos-' + kind });
  }
  function bubble(seat, text, o) {
    o = Object.assign({ ms: 1700, loud: false, think: false }, o);
    const box = seatEl(seat);
    if (!box) return null;
    box.querySelectorAll('.zm-bubble').forEach((b) => b.remove());
    const b = document.createElement('span');
    b.className = 'zm-bubble' + (o.loud ? ' is-loud' : '') + (o.alarm ? ' is-alarm' : '') + (o.think ? ' is-think' : '') + (o.cls ? ' ' + o.cls : '');
    if (o.think) b.innerHTML = '<i></i><i></i><i></i>';
    else if (o.icon) { b.classList.add('is-icon'); b.innerHTML = ART.icon(o.icon); }   // 只冒一个牌的图标，不写字
    else b.textContent = text;
    if (!o.sos) b.style.animationDuration = o.ms + 'ms';   // 求救的省略号：冒出来的动画按 CSS 的 0.3 秒走（ms = 60000 时整段淡入会被拉成一分钟，几乎看不见）
    box.appendChild(b);
    // 靠屏幕边的座位（窄屏左右两家）：气泡居中在头像上会出屏——量一下，往里挪回来（2026-11-26，「九命！」在 iPhone SE 右边被切）
    const br = b.getBoundingClientRect(), cx = br.left + br.width / 2, hw = b.offsetWidth / 2, pad = 4;
    const dx = cx - hw < pad ? pad - (cx - hw) : cx + hw > innerWidth - pad ? innerWidth - pad - (cx + hw) : 0;
    if (dx) { b.style.marginLeft = dx.toFixed(1) + 'px'; b.style.setProperty('--tail', Math.max(-(hw - 12), Math.min(hw - 12, -dx)).toFixed(1) + 'px'); }
    if (o.ms < 60000) setTimeout(() => b.remove(), o.ms);
    return b;
  }

  /* ───── 牌堆 / 弃牌堆 ─────
   * 牌堆是真的一摞：剩几张就叠几层「牌边」（奶油色纸边，每张的位置带一点点随机偏差，看着是手码的），最上面一张牌背。
   * 剩得越多越厚、影子越大；摸走一张就真少一层，顶上那张往下落一点。弃牌堆同理，只是歪歪扭扭地堆、上面露几张正面。
   * 两种叠法：乙 = 笔直往上叠、码得乱一点（用户 2026-11-12 选定，默认）；甲 = 斜着往左上叠（侧边、底边露纸边），?zmdeck=a 预览甲 */
  const DECK_LOOKS = { a: { sx: 0.0105, sy: 0.0105, jx: 0.0085, rot: 0 }, b: { sx: 0, sy: 0.0102, jx: 0.019, rot: 0.9 } };
  const DECK_LOOK = DECK_LOOKS[(new URLSearchParams(location.search).get('zmdeck') || '').toLowerCase()] || DECK_LOOKS.b;
  const EDGES = ['#f7f0e1', '#efe6d3', '#f3ebda', '#e8ddc7'];
  const jit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  function sheetXY(i, pu) {
    const L = DECK_LOOK;
    return { x: -i * L.sx * pu + (jit(i, 2) - 0.5) * L.jx * pu, y: -i * L.sy * pu, r: (jit(i, 3) - 0.5) * L.rot };
  }
  function sheetEl(i, pu, x, y, r) {
    const d = document.createElement('i');
    d.className = 'zm-sheet' + (i === 0 ? ' is-floor' : '');
    d.style.background = EDGES[Math.floor(jit(i, 1) * EDGES.length)];
    d.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)' + (r ? ' rotate(' + r.toFixed(2) + 'deg)' : '');
    return d;
  }
  let lastKit = -1, lastDeck = -1, deckPu = 0;
  function renderDeck(n) {
    const stack = els.deck.querySelector('.zm-deck-stack');
    const pu = PU();
    if (pu !== deckPu) { stack.innerHTML = ''; deckPu = pu; }   // 换了尺寸：整摞重码
    let top = stack.querySelector(':scope > .zm-card');   // 只认牌堆本身那张顶牌：透视翻着的那张 / 火眼露出的炸弹猫也是 .zm-card，但套在别的盒子里（以前抓到它们，insertBefore 报错）
    const sheets = stack.querySelectorAll(':scope > .zm-sheet');
    const want = Math.max(0, n - 1);
    for (let i = sheets.length - 1; i >= want; i--) sheets[i].remove();
    for (let i = sheets.length; i < want; i++) { const q = sheetXY(i, pu); stack.insertBefore(sheetEl(i, pu, q.x, q.y, q.r), top); }
    if (!n) { if (top) top.remove(); }
    else {
      if (!top) { stack.insertAdjacentHTML('beforeend', backHtml('is-top')); top = stack.lastElementChild; }
      const i = n - 1, L = DECK_LOOK;
      top.style.transform = 'translate(' + (-i * L.sx * pu).toFixed(2) + 'px,' + (-i * L.sy * pu).toFixed(2) + 'px)';
    }
    els.deck.classList.toggle('is-empty', !n);
    els.deck.style.setProperty('--thick', Math.min(1, n / 50).toFixed(3));
  }
  // 弃牌堆最多叠这么多层纸边（≈ 30 张）就不再变高（2026-11-14 用户：人多打到后面堆得太高，出牌区对不上堆顶）
  const DISCARD_CAP = 26;
  const pileY = (j) => -Math.min(j, DISCARD_CAP + 3) * DECK_LOOK.sy * PU() * 0.8;   // 弃牌堆第 j 层（从底下数）的高度
  /* 弃牌堆（2026-11-18 用户：新牌落下来，底下旧牌之间的交叠会跟着变一点）：以前每张的位置按「离堆顶第几张」算——
   * 顶上 4 张左右错开、整体高度跟着总张数走、第 5 张被压下去时换成另一套歪法的纸边，所以每落一张，旧牌都挪一下。
   * 现在每张只看它自己：第 j 层的高度 pileY(j)、歪多少 pileRot(id)，落下以后再也不变；压到下面变纸边也保持原来的歪法 */
  function renderDiscard(list) {
    const n = list.length, faceFrom = Math.max(0, n - 4), m = Math.min(DISCARD_CAP, faceFrom);
    let h = '';
    for (let j = 0; j < m; j++) {
      const id = list[j];
      h += '<i class="zm-sheet' + (j === 0 ? ' is-floor' : '') + '" style="background:' + EDGES[id % EDGES.length] + ';transform:translate(0px,' + pileY(j).toFixed(2) + 'px) rotate(' + pileRot(id) + 'deg)"></i>';
    }
    for (let j = faceFrom; j < n; j++) h += cardHtml(list[j], '', 'transform:translate(0px,' + pileY(j).toFixed(2) + 'px) rotate(' + pileRot(list[j]) + 'deg)');
    els.discard.innerHTML = h;
  }
  /* ───── 百变规则牌（2026-11-15 用户：用甲的样子、不预告；打「百变」从百变规则堆里抽一条，抽到什么算什么）─────
   * 牌堆下面固定一张横放的牌，标题「百变规则」+ 这条的名字 + 一句话；点它看全部规则。
   * 还没人打过百变时什么都不摆（用户：别写「还没有」，土）——第一次抽到时才翻出来 */
  const FLUX_IC = { nine: 'defuse', peektop: 'future', exact: 'boom', bottom: 'bottom', reverse: 'reverse', mute: 'nope', hot: 'tattack', catsave: 'catsave', allwild: 'wild' };
  const fluxRule = (id) => (R.FLUX_RULES || []).find((r) => r.id === id) || null;
  function fluxHtml(id) {
    const r = fluxRule(id), k = FLUX_IC[r.id];
    return '<span class="tag">' + T('ui.flux.title', '百变规则') + '</span><i class="ic" style="--tone:' + ART.TONE[k].bg + '">' + ART.icon(k) + '</i>' +
      '<span class="txt"><b>' + r.name + '</b><small>' + r.desc + '</small></span>';
  }
  /* 百变规则摆法（2026-11-22 用户在几个方向里挑定「大水印」）：不再在牌堆下面摆一张规则卡——整张桌面（桌沿以内）铺一层淡淡的大水印：
   * 规则图标放大摆在桌心（牌堆后面），下面一行淡色大字写规则名；还没抽到规则时就是百变牌的图标 + 「百变」两个字（和经典模式一眼看得出不同）。
   * 点那行大字 = 看全部规则（不另加问号、小字）。#zmFlux 是这整层（转盘缩进它的正中、烫手的锅从它那儿飞出来） */
  function renderFlux(d) {
    const st = game && game.state, on = !!(st && st.rules && st.rules.mode === 'flux');
    let el = document.getElementById('zmFlux');
    const id = (d && d.flux) || null, r = fluxRule(id);
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'zmFlux'; el.className = 'zm-fluxwm';
      el.setAttribute('aria-hidden', 'true');
      els.table.insertBefore(el, els.table.firstChild);
    }
    const key = r ? r.id : '-';
    if (el.dataset.rule !== key) {
      el.dataset.rule = key;
      const k = r ? FLUX_IC[r.id] : R.FLUX;
      el.innerHTML = '<i class="wm-ic">' + ART.icon(k) + '</i><b class="wm-name">' + (r ? r.name : T('ui.flux.none', '百变')) + '</b>';
    }
    // 摆在桌沿以内（组队 / 经典围桌一圈都有 ringLay）；没有的话按桌子中间那块
    const tb = els.table.getBoundingClientRect();
    let L, T0, W, H;
    if (ringGame() && ringLay) { L = ringLay.x0; T0 = ringLay.y0; W = ringLay.x1 - ringLay.x0; H = ringLay.y1 - ringLay.y0; }
    else { const c = els.center.getBoundingClientRect(); L = c.left - tb.left; T0 = c.top - tb.top; W = c.width; H = c.height; }
    Object.assign(el.style, { left: L + 'px', top: T0 + 'px', width: W + 'px', height: H + 'px' });
    el.style.setProperty('--wm-w', W + 'px'); el.style.setProperty('--wm-h', H + 'px');
    el.classList.toggle('is-wide', W > H * 1.9);
    // 衬底颜色跟着规则换（2026-11-22 用户挑：a 的淡衬底、c 的跟规则换色，不要金边）；还没抽到规则时是淡藕荷
    el.style.setProperty('--wm-tone', r ? ((ART.TONE[FLUX_IC[r.id]] || {}).bg || '#efe3f2') : '#ecdcee');   // 横屏又宽又矮：图标放左边、规则名放右边，牌堆在中间（上下摞着会躲在牌堆后面、压到张数那行）
  }
  // 点桌上那行规则名大字 = 看全部规则（大字在牌桌最底下一层，点击由牌桌接）
  els.table.addEventListener('click', (e) => {
    const nm = document.querySelector('#zmFlux .wm-name');
    if (!nm || e.target.closest('button, a, .zm-card, .zm-seat, .zm-av, .zm-hand, .zm-band, .zm-deck, .zm-discard, .zm-stage-inner, .zm-ff')) return;
    const r = nm.getBoundingClientRect(), pad = 8;
    if (e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) { e.stopPropagation(); showFluxHelp(); }
  }, true);
  function showFluxHelp() {
    const cur = game && game.state ? D().flux : null;
    openDialog('<h2>' + T('ui.flux.title', '百变规则') + '</h2><p>' + T('ui.flux.help', '每打出一张百变，就转一次转盘换规则；同时只生效一条。') + '</p>' +
      '<ul class="zm-flux-list">' + R.FLUX_RULES.map((r) => '<li' + (r.id === cur ? ' class="is-cur"' : '') + '><i class="ic" style="--tone:' + ART.TONE[FLUX_IC[r.id]].bg + '">' + ART.icon(FLUX_IC[r.id]) + '</i><b>' + r.name + '</b><span>' + r.desc + '</span></li>').join('') + '</ul>' +
      '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>' + T('ui.ok', '好') + '</button></div>', (dl) => {
      dl.querySelector('[data-ok]').addEventListener('click', closeDialog);
    });
  }
  /* 换规则（2026-11-15 用户挑乙 · 转盘）：桌子中间弹出八格转盘（每格一条规则的图标 + 名字），转四圈慢慢停下、每过一格「嗒」一声，
   * 指针那格闪三下，转盘缩进牌堆下面的规则位；规则牌翻成新的那条、冒彩色小星星。换上 / 换走「逆行」时出牌方向的小箭头跟着掉头 */
  let wheelSvgCache = '';
  function wheelSvg() {
    if (wheelSvgCache) return wheelSvgCache;
    const rs = R.FLUX_RULES, n = rs.length;
    let s = '<svg viewBox="-115 -115 230 230" aria-hidden="true"><circle r="113" fill="#5b3a8a"/><circle r="109" fill="#e9c86a"/>';
    rs.forEach((r, k) => {
      const a0 = (k / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + (Math.PI * 2) / n;
      const p = (a) => (Math.cos(a) * 104).toFixed(1) + ' ' + (Math.sin(a) * 104).toFixed(1);
      s += '<path class="seg" data-k="' + k + '" d="M0 0L' + p(a0) + 'A104 104 0 0 1 ' + p(a1) + 'Z" fill="' + ART.TONE[FLUX_IC[r.id]].bg + '" stroke="#e9c86a" stroke-width="1.6"/>';   // 每格用这条规则自己的底色（规则数是单数时也不会两格同色挨着）
      const am = (a0 + a1) / 2, x = Math.cos(am) * 70, y = Math.sin(am) * 70;
      s += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ((am * 180) / Math.PI + 90).toFixed(1) + ')"><g transform="translate(-11 -16) scale(.92)">' + ART.icon(FLUX_IC[r.id]).replace('<svg', '<svg width="24" height="24"') + '</g>' +
        '<text y="20" text-anchor="middle" font-size="10" fill="#1d1b18">' + r.name + '</text></g>';
    });
    s += '<circle r="16" fill="#5b3a8a"/><circle r="11" fill="#e9c86a"/></svg>';
    return (wheelSvgCache = s);
  }
  /* 转盘跟着出牌方向转（2026-11-26 用户）：桌上出牌方向 1 = 逆时针，-1 = 顺时针；转盘同向转，换向后也反过来。只改转的方向，转到哪条不变 */
  async function fluxWheel(idx, t, spin) {
    // 横屏人多时桌子中间那块顶上让给了顶边几家（padding-top）：转盘只在剩下的桌面里转，别盖住顶边那几家（2026-11-19）
    const box0 = els.center.getBoundingClientRect(), padT = parseFloat(getComputedStyle(els.center).paddingTop) || 0;
    const box = { left: box0.left, width: box0.width, top: box0.top + padT, height: box0.height - padT };
    const S = LANDSCAPE_SHORT.matches ? Math.round(Math.max(96, Math.min(200, box.width * 0.5, box.height * 0.92))) : Math.round(Math.max(150, Math.min(240, box.width * 0.72, box.height * 0.62)));   // 横屏桌子矮：转盘按桌子高度来，别冒出桌沿
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2 - (padT ? 0 : S * 0.08);
    const wrap = document.createElement('div');
    wrap.className = 'zm-wheel';
    wrap.style.cssText = 'left:' + (cx - S / 2) + 'px;top:' + (cy - S / 2) + 'px;width:' + S + 'px;height:' + S + 'px';
    wrap.innerHTML = '<div class="zm-wheel-disc">' + wheelSvg() + '</div><i class="zm-wheel-ptr"><svg viewBox="0 0 22 26" aria-hidden="true"><path d="M11 25 2 4Q11 -1 20 4Z" fill="#b5432f" stroke="#fffdf8" stroke-width="2" stroke-linejoin="round"/></svg></i>';
    els.fly.appendChild(wrap);
    const disc = wrap.firstChild, n = R.FLUX_RULES.length, seg = 360 / n;
    snd('flip');
    await wrap.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)' }], { duration: ms(380), easing: 'cubic-bezier(.3,.8,.4,1.2)' }).finished.catch(() => {});
    if (t !== token) { wrap.remove(); return; }
    const sd = spin === -1 || spin === 1 ? spin : dirNow();
    const end = sd === 1 ? -(360 * 4 + idx * seg) : 360 * 4 - idx * seg, dur = ms(2600);   // CSS rotate 正 = 顺时针
    if (rimFxOn()) rimSwirl('#a77bb5', 1, dur, sd);
    await new Promise((res) => {
      const t0 = performance.now();
      let last = -1;
      const tickF = (now) => {
        if (t !== token) { res(); return; }
        const k = Math.min(1, (now - t0) / dur), a = end * (1 - Math.pow(1 - k, 4));   // 先快后慢停下
        disc.style.transform = 'rotate(' + a + 'deg)';
        const sgi = Math.floor((Math.abs(a) + seg / 2) / seg);
        if (sgi !== last) { if (last >= 0) snd('tick'); last = sgi; }
        if (k < 1) requestAnimationFrame(tickF); else res();
      };
      requestAnimationFrame(tickF);
    });
    if (t !== token) { wrap.remove(); return; }
    const win = disc.querySelector('.seg[data-k="' + idx + '"]');
    if (win) win.classList.add('is-win');
    snd('ding');
    await wait(ms(800));
    if (t !== token) { wrap.remove(); return; }
    // 缩进牌堆下面的规则位（规则牌还没摆出来时按它会在的位置）
    const el = document.getElementById('zmFlux'), er = el && el.getBoundingClientRect();
    const tx = er ? er.left + er.width / 2 : cx, ty = er ? er.top + er.height / 2 : box.top + box.height / 2 + PU() * 1.11 + 50;
    await wrap.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (tx - cx) + 'px,' + (ty - (cy)) + 'px) scale(.12)', opacity: 0 }], { duration: ms(380), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    wrap.remove();
  }
  async function animFlux(e, t) {
    const prev = ov ? ov.flux : null;
    if (ov) ov.flux = e.rule;
    const idx = Math.max(0, R.FLUX_RULES.findIndex((r) => r.id === e.rule));
    // 打出百变那一刻的方向：换上 / 换走「逆行」时 e.dir 已是掉头后的，要倒回去
    const flip = ((e.prev !== undefined ? e.prev : prev) === 'reverse') !== (e.rule === 'reverse'), spin = e.dir === 1 || e.dir === -1 ? (flip ? -e.dir : e.dir) : dirNow();
    if (!fx.reduce()) await fluxWheel(idx, t, spin);
    if (t !== token) return;
    let el = document.getElementById('zmFlux');
    if (el && !fx.reduce()) await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(220), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});   // 旧水印淡出
    if (t !== token) return;
    renderFlux({ flux: e.rule });
    if ((e.rule === 'bottom') !== (prev === 'bottom')) flipBottomCards(t);   // 摸底：手里的抽底翻成抽顶（换走时翻回来）
    if ((e.rule === 'allwild') !== (prev === 'allwild')) flipBottomCards(t, R.CATS);   // 百搭：手里的猫翻成万能猫（换走时翻回来）
    if (prev === 'exact' && e.rule !== 'exact' && game.openKits && game.openKits.size) await tuckKits(t);   // 火眼换走：露着的炸弹猫收回去
    if (t !== token) return;
    if (ov && (e.rule === 'peektop' || prev === 'peektop' || prev === 'exact')) { ov.topFace = faceTop(game.state); renderPiles(); }   // 掀顶生效：顶上那张翻起来；换走：盖回去
    el = document.getElementById('zmFlux');
    if (!el) return;
    el.getAnimations().forEach((a) => a.cancel());
    if (!fx.reduce()) {
      // 新水印从桌心浮现、轻轻放大到位；规则名那行大字跟着冒一圈小星星
      el.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'scale(1.02)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }], { duration: ms(520), easing: 'cubic-bezier(.3,.8,.4,1.1)' });
      const nm = el.querySelector('.wm-name'), r = (nm || el).getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 12, shapes: ['star'], colors: ['#8e4a9c', '#e2b85c', '#e0893e', '#3f7f86'], radius: 70, size: [6, 14], life: 800 });
    }
    await wait(ms(500));
    if (t !== token) return;
    if ((prev === 'reverse') !== (e.rule === 'reverse')) await animReverse({ seat: e.seat, dir: e.dir }, t);
  }
  /* 火眼被换成别的规则（2026-11-16 用户：换走以后露着的炸弹猫还一直明着）：歪着露出的那几张摆正、塞回原来那层、翻成牌背；
   * 最上面翻着的那张（它刚好到了顶上）也翻回去。之后谁也不再看得到它们在哪（就像没有火眼时一样） */
  async function tuckKits(t) {
    const stack = els.deck.querySelector('.zm-deck-stack');
    const kits = stack ? Array.from(stack.querySelectorAll('.zm-deck-kit .zm-card')) : [];
    const fc = stack && stack.querySelector('.zm-deck-face');
    const faceKit = fc && game.openKits.has(+fc.dataset.id) ? fc : null;
    game.openKits.clear();
    if (game.kitShown) game.kitShown.clear();
    if (game.kitSide) game.kitSide.clear();
    if (fx.reduce() || (!kits.length && !faceKit)) return;
    snd('flip');
    const anims = kits.map((c) => { const sx = c.parentElement && c.parentElement.classList.contains('is-left') ? -1 : 1; return c.animate([{ translate: (24 * sx) + '% 6%', rotate: (7 * sx) + 'deg', opacity: 1 }, { translate: '0 0', rotate: '0deg', opacity: 1, offset: 0.6 }, { translate: '0 0', rotate: '0deg', opacity: 0 }], { duration: ms(460), easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' }).finished.catch(() => {}); });
    if (faceKit && faceKit.firstElementChild) anims.push(faceKit.firstElementChild.animate([{ transform: 'perspective(400px) rotateY(0deg)' }, { transform: 'perspective(400px) rotateY(90deg)' }], { duration: ms(260), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {}));
    await Promise.all(anims);
    if (t !== token) return;
    stack.querySelectorAll('.zm-deck-kit').forEach((k) => k.remove());
  }
  // 百变「九命」：炸了没出局——头像外一圈九颗心转出来、最上面那颗碎掉落下（用掉一条命），头像缓过来，
  // 炸弹猫从他那儿飞回牌堆（缝开在看不出的高度）。2026-11-17 用户：心圈里不要「九命！」字，换成图形；
  // 2026-11-26 用户：在心圈之前先让猫喊——猫叫 + 头上「九命！」气泡（见 animNine）
  function nineLives(seat) {
    const av = seat === 0 ? els.me.querySelector('.zm-av') : avEl(seat);
    const c = av ? fx.center(av.getBoundingClientRect()) : avPoint(seat);
    const u = U(), ar = av ? av.getBoundingClientRect().width / 2 : u * 0.42, sz = Math.max(14, u * 0.24), R = ar + sz * 0.75;
    const box = document.createElement('div');
    box.className = 'zm-nine';
    box.style.cssText = 'position:fixed;left:' + c.x + 'px;top:' + c.y + 'px;width:0;height:0;z-index:45;pointer-events:none';   // 45：压在牌桌动画层（40）上面、弹窗遮罩（50）下面——2026-11-22 用户：以前 70，点开百变规则卡时一圈心浮在卡上
    const hs = [];
    for (let i = 0; i < 9; i++) {
      const a = (-90 + i * 40) * Math.PI / 180, x = Math.cos(a) * R, y = Math.sin(a) * R;
      const h = document.createElement('i');
      h.style.cssText = 'position:absolute;left:' + (-sz / 2) + 'px;top:' + (-sz / 2) + 'px;width:' + sz + 'px;height:' + sz + 'px';
      h.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">' + ART.heart(12, 13, 8, '#e0566e') + '</svg>';
      box.appendChild(h); hs.push({ h, x, y });
      h.animate([{ transform: 'translate(0,0) scale(0)', opacity: 0 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(1.25)', opacity: 1, offset: 0.7 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(1)', opacity: 1 }],
        { duration: ms(360), delay: ms(i * 45), easing: 'cubic-bezier(.2,.8,.4,1)', fill: 'both' });
    }
    els.app.appendChild(box);
    box.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(40deg)' }], { duration: ms(1700), easing: 'ease-out', fill: 'forwards' });
    // 最上面那颗：变灰、裂开、掉下去
    const top = hs[0];
    setTimeout(() => {
      const p = top.h.querySelector('path'); if (p) p.setAttribute('fill', '#9e9586');
      top.h.animate([{ transform: 'translate(' + top.x + 'px,' + top.y + 'px) scale(1)', opacity: 1 }, { transform: 'translate(' + top.x + 'px,' + top.y + 'px) scale(1.3) rotate(-12deg)', opacity: 1, offset: 0.2 },
        { transform: 'translate(' + top.x + 'px,' + (top.y + u * 1.1) + 'px) scale(.7) rotate(40deg)', opacity: 0 }], { duration: ms(650), easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
    }, ms(780));
    setTimeout(() => box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(350), fill: 'forwards' }).finished.then(() => box.remove(), () => box.remove()), ms(1650));
  }
  async function animNine(e, t) {
    if (e.why !== 'save') {   // 急救：前面已经演过「两张合成逗猫棒」
      // 2026-11-26 用户：规则说「大喊九命」，就真喊——先猫叫一声、头上冒「九命！」气泡（头像一抖），再转出爱心把炸弹猫安抚掉
      snd('ninecry');
      bubble(e.seat, T('ui.nine.cry', '九命！'), { loud: true, ms: ms(1900), cls: 'is-nine' });
      fx.shake(avEl(e.seat), { amp: 4, dur: 320 });
      await wait(ms(650));
      if (t !== token) return;
      nineLives(e.seat); snd('ninehearts');
    }
    calmAvatar(e.seat, t, ms(500));
    await wait(ms(500));
    if (t !== token) return;
    if (e.pick) return;   // 2026-11-26 起九命也自己挑位置：这里只演喊九命，塞回去由后面的 insert 事件演（和逗猫棒一样）
    await animInsert({ seat: e.seat, vis: e.vis != null ? e.vis : null }, t);   // 老存档 / 老服务器：随机塞，按大概高度开缝（2026-11-15 用户）
  }
  /* 角色猫技能触发（2026-11-18 用户：第一版「另编一段表演」太牵强）：亮身份 + 规则本来就有的那个动作，一律不出字。
   * 2026-11-26 用户：不用弹整张角色牌，要更简洁好看 → 只动头像角上那枚猫章：猫章弹大一圈、外面一圈角色色的光，
   * 从猫章往外荡两道角色色的圆波；桌沿灯带同时从他那儿漾一道角色色的波纹。
   * 技能分两步的（贪吃猫要两张、截胡猫顺牌）：猫章一直保持放大、光一呼一吸，等这件事做完才缩回（见 game.rolePop）；
   * 贪吃猫猫章旁边挂两颗角色色小圆点，给一张填实一颗 */
  const NOPOP = { back: () => Promise.resolve(), pulse() {}, pip() {} };
  function roleWave(av, rb, band) {
    const a = av.getBoundingClientRect(), b = rb.getBoundingClientRect();
    for (let k = 0; k < 2; k++) {
      const w = document.createElement('i');
      w.className = 'zm-role-wave';
      w.style.cssText = 'left:' + (b.left - a.left + b.width / 2) + 'px;top:' + (b.top - a.top + b.height / 2) + 'px;--glow:' + band + ';--to:' + (a.width * 2.4 / b.width).toFixed(2);
      av.appendChild(w);
      w.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(var(--to))', opacity: 0 }], { duration: ms(900), delay: ms(k * 220), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' }).finished.catch(() => {}).then(() => w.remove());
    }
  }
  async function flashRole(seat, t, hold, o) {
    const rb = roleBadge(seat), av = avEl(seat);
    const st = game && game.state, role = st && st.roles && st.roles[seat];
    if (!rb || !av || !role) return NOPOP;
    o = o || {};
    const tone = ART.ROLE_TONE[role] || ART.ROLE_TONE.fat;
    snd('ding');
    if (rimFxOn()) rimRipple(seat, tone.band, 1100, 3);
    rb.style.setProperty('--glow', tone.band);
    rb.style.visibility = '';
    rb.classList.remove('is-fire');
    void rb.offsetWidth;
    rb.classList.add('is-fire');
    if (!fx.reduce()) roleWave(av, rb, tone.band);
    let pips = null;
    if (o.pips) {
      pips = document.createElement('i');
      pips.className = 'zm-role-pips';
      pips.style.setProperty('--glow', tone.band);
      pips.innerHTML = '<i></i>'.repeat(o.pips);
      av.appendChild(pips);
    }
    await wait(ms(380));
    if (t !== token) { rb.classList.remove('is-fire'); if (pips) pips.remove(); return NOPOP; }
    if (hold) await wait(ms(hold));
    let done = null;
    return {
      pulse() {   // 同一个技能又起作用一次（贪吃猫要第二张）：猫章再弹一下、再荡两道圆波、桌沿再漾一道
        if (done || !rb.isConnected) return;
        snd('ding');
        if (rimFxOn()) rimRipple(seat, tone.band, 1100, 3);
        if (!fx.reduce()) { rb.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(1.85)', offset: 0.4 }, { transform: 'scale(1.35)', offset: 0.75 }, { transform: 'scale(1.45)' }], { duration: ms(480), easing: 'ease-out' }); roleWave(av, rb, tone.band); }
      },
      pip(k) { if (!pips) return; const ps = pips.querySelectorAll('i'); ps.forEach((p, i) => p.classList.toggle('is-on', i < k)); if (ps[k - 1]) fx.pop(ps[k - 1], { scale: 1.9, dur: 300 }); },
      back(bo) {
        if (done) return done;
        if (bo && bo.sad && !fx.reduce() && rb.isConnected) {   // 扑空（截胡猫没牌可顺、贪吃猫只要到一张）：猫章耷拉一下、灰一下再缩回
          done = rb.animate([{ transform: 'scale(1.45)', filter: 'none' }, { transform: 'scale(1.25) translateY(3px) rotate(-14deg)', filter: 'grayscale(.85) brightness(.95)', offset: 0.35 }, { transform: 'scale(1.2) translateY(3px) rotate(-10deg)', filter: 'grayscale(.85) brightness(.95)', offset: 0.7 }, { transform: 'scale(1)', filter: 'none' }], { duration: ms(1000), easing: 'ease-in-out', fill: 'forwards' }).finished.catch(() => {})
            .then(() => { rb.classList.remove('is-fire'); rb.getAnimations().forEach((a) => { if (!a.animationName) a.cancel(); }); });
          if (pips) pips.remove();
          return done;
        }
        if (pips) pips.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(240), fill: 'forwards' }).finished.catch(() => {}).then(() => pips.remove());
        const shrink = fx.reduce() || !rb.isConnected ? Promise.resolve() : rb.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(1)' }], { duration: ms(260), easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
        done = shrink.then(() => { rb.classList.remove('is-fire'); rb.getAnimations().forEach((a) => { if (a.effect && a.effect.getKeyframes && !a.animationName) a.cancel(); }); });
        return done;
      },
    };
  }
  // 还亮着的猫章（两步技能）：这一串事件跟它无关了就收
  function rolePopDone() { const rp = game && game.rolePop; if (!rp) return Promise.resolve(); game.rolePop = null; if (rp.owe) { const o = rp.owe; o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(200), fill: 'forwards' }).finished.catch(() => {}).then(() => o.remove()); } return rp.fl.back(); }
  const rolePopKeeps = (rp, e) => (rp.kind === 'fat' ? (e.t === 'askGive' || e.t === 'give') && e.from === rp.from && e.to === rp.to : rp.kind === 'tabby' ? e.t === 'steal' && e.to === rp.seat : false);
  async function animRole(e, t) {
    if (e.role === 'timid') {
      const fl = await flashRole(e.seat, t);
      if (t !== token) return fl.back();
      // 他在看牌堆顶 3 张：是我就照窥探把三张正面摊给我；是别人就在牌堆上方掀起三张牌背摊一下，再放回去
      if (e.seat === meSeat() && e.cards) await animFuture({ t: 'future', seat: e.seat, cards: e.cards }, t);
      else await liftTop3(Math.min(3, D().deckSize || 3), t);
      return fl.back();
    }
    if (e.role === 'cow') {
      const fl = await flashRole(e.seat, t, 420);
      if (t !== token) return fl.back();
      if (ov && ov.turn === e.seat) { ov.turnsLeft = 1; renderSeat(e.seat); }   // ×N 直接翻成 ×1
      const pm = avEl(e.seat) && avEl(e.seat).querySelector('.zm-pm, .zm-turns');
      if (pm) fx.pop(pm, { scale: 1.7, dur: 360 });
      await wait(ms(520));
      return fl.back();
    }
    if (e.role === 'tabby') {   // 截胡猫：猫章一直亮着；顺走的那一张接着用偷牌同一个飞法（下一个事件 steal），飞完才收
      const fl = await flashRole(e.seat, t, 380);
      if (t !== token) return fl.back();
      if (e.from != null && e.from >= 0) { releaseRim(); game.rimLk = rimLink(e.seat, e.from, false, (ART.ROLE_TONE.tabby || {}).band || '#6a4f86'); }   // 灯带用截胡猫的紫色从它连到被顺的人，牌飞过来时缩回
      game.rolePop = { kind: 'tabby', seat: e.seat, fl };
      return;
    }
    if (e.role === 'shadow') {   // 影子猫：两张偷牌指着它（老客户端 / 老服务器才会真指上）——猫章亮、头像化成影子晃一下，连线黯淡着缩回
      const fl = await flashRole(e.seat, t, 0);
      await shadowDodge(e.seat);
      releaseRim({ dull: true });
      return fl.back();
    }
    const fl = await flashRole(e.seat, t, 600);   // 百搭猫等：只亮猫章
    await fl.back();
  }
  // 影子猫「指不到」：头像淡成一道影子、左右一闪（像身形一晃躲开了），再显回来
  function shadowDodge(seat) {
    const av = avEl(seat);
    if (!av || fx.reduce()) return wait(ms(500));
    return av.animate([
      { transform: 'none', opacity: 1, filter: 'none' },
      { transform: 'translateX(-7px)', opacity: 0.3, filter: 'blur(1.5px) grayscale(.6)', offset: 0.3 },
      { transform: 'translateX(6px)', opacity: 0.25, filter: 'blur(1.5px) grayscale(.6)', offset: 0.55 },
      { transform: 'translateX(-2px)', opacity: 0.6, filter: 'blur(.5px)', offset: 0.8 },
      { transform: 'none', opacity: 1, filter: 'none' },
    ], { duration: ms(760), easing: 'ease-in-out' }).finished.catch(() => {});
  }
  // 牌堆顶 N 张在牌堆上方掀起来摊一下（别人在看，我看不到正面），再放回去
  async function liftTop3(n, t) {
    if (fx.reduce() || !n) { await wait(ms(500)); return; }
    // 按放大前的牌堆大小抬（2026-11-26：牌堆放大后这三张跟着变大、抬得更高，手机横屏顶出屏幕上沿）；抬起后牌顶不出屏
    const bs = U() * 0.92 / PU(), dr = deckTopRect(), u = dr.width * 0.82 * bs, cx = dr.left + dr.width / 2, cy = dr.top + dr.height / 2;
    const up = Math.max(0, Math.min(dr.height * 0.95 * bs, cy - u * 0.7 - 6));
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'zm-lift3';
      d.style.cssText = 'width:' + u + 'px;left:' + (cx - u / 2) + 'px;top:' + (cy - u * 0.7) + 'px';
      d.innerHTML = backHtml();
      els.fly.appendChild(d);
      nodes.push(d);
      const k = i - (n - 1) / 2;
      d.animate([{ transform: 'none' }, { transform: 'translate(' + (k * u * 0.55).toFixed(1) + 'px,' + (-up).toFixed(1) + 'px) rotate(' + (k * 9) + 'deg)' }],
        { duration: ms(360), delay: i * ms(60), easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'forwards' });
    }
    snd('whoosh');
    await wait(ms(360 + 60 * n + 820));
    nodes.forEach((d, i) => d.animate([{ opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: ms(300), delay: (n - 1 - i) * ms(50), easing: 'ease-in', fill: 'forwards', composite: 'replace' }));
    await wait(ms(300 + 50 * n));
    nodes.forEach((d) => d.remove());
    void t;
  }
  /* 组队·求救（2026-11-19 用户改）：前半段永远一个样——被炸的人喊「救我！」，活着的队友（不管几个、不管有没有逗猫棒）头上都冒一个
   * 会动的省略号在想。有人救：他的省略号变成「接着！」，别的队友的省略号收回；没人救（没有 / 不肯 / 到点）：省略号全收回，被炸的人出局。
   * 别人从动画里看不出谁有逗猫棒、谁不肯救 */
  function clearRescueThink(mates, keep) {
    for (const k of mates || []) {
      if (k === keep) continue;
      const box = seatEl(k);
      if (box) box.querySelectorAll('.zm-bubble.is-think').forEach((b) => b.animate([{ opacity: 1, transform: 'translateX(-50%) scale(1)' }, { opacity: 0, transform: 'translateX(-50%) scale(.6)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished.then(() => b.remove(), () => b.remove()));
    }
  }
  async function animAskRescue(e, t) {
    game.rescueAnswered = false;
    // 「别救我」：只有同队知道（联机时对手收到的事件里没有 refused）——他喊「别救我！」，谁都不冒省略号；对手那边照常是喊救、队友想了想
    if (e.refused && (e.for === 0 || isMate(e.for))) {
      rescueBubble(e.for, 'refuse');
      await wait(ms(450));
      return;
    }
    rescueBubble(e.for, 'help');
    // 2026-11-19 用户：喊「救我！」的同一刻，所有活着的队友（包括我自己）一起冒省略号——醒目一点（金边、大一号的点）
    const mates = e.mates || (e.by != null ? [e.by] : []);   // 老服务器只发 by
    mates.forEach((k) => bubble(k, '', { think: true, ms: 60000, cls: 'is-sos', sos: true }));
    await wait(ms(450));
    void t;
  }
  // 没人救：省略号收回，弹窗（到点 / 我点了不救后还开着的）收掉，接着播出局
  async function animNoRescue(e, t) {
    if (game.rescueDlg) { game.rescueDlg = null; closeDialog(); }
    clearRescueThink(e.mates || (e.by != null ? [e.by] : []));
    await wait(ms(260));
    void t;
  }
  // 有人救：别的队友的省略号收回；我也有逗猫棒、弹窗还开着（没点 / 点了但别人先到）→ 弹窗里先演一下「被他抢先救了」再收
  async function rescueResolved(e, t) {
    clearRescueThink(e.mates, e.from);
    const dlg = game.rescueDlg;
    game.rescueDlg = null;
    if (!dlg) return;
    if (e.from === 0) { closeDialog(); return; }
    await dlg.taken(e.from, t);
  }
  /* 组队·救队友（2026-11-18 用户挑了甲「递棒」；2026-11-19 用户：「救！」改成绿色，倒计时时绿色一点点减少、底下是灰色——像生命在流逝，
   * 到点没救 = 没救成。只有手里有逗猫棒的队友才弹这个窗；几个队友同时被问，谁先点「救」用谁的） */
  function rescueTimer(btn, lim, k, act) {
    if (!lim) return;
    const life = btn && btn.querySelector('.zm-life i');
    if (life) btn.lifeAnim = life.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: lim, easing: 'linear', fill: 'forwards' });
    if (lim > 3000) setTimeout(() => { if (k === token && btn.isConnected) btn.classList.add('is-hurry'); }, lim - 3000);
    setTimeout(() => { if (k === token && game && game.rescueDlg && game.state.phase === 'rescue') act(false); }, lim);
  }
  // 逗猫棒和队友之间不画线（2026-11-19 用户在四版里挑了丙：逗猫棒自己往队友那边探身，队友身后一圈金光一起一伏）
  const RESCUE_GAP = '<div class="zm-rescue-gap" aria-hidden="true"></div>';
  function rescueDialog() {
    // 限时和作废一样长（2026-11-19 用户）：单机按出牌限时的 1/4（10 秒局 3 秒、其余 5 秒）；联机按服务器给的
    const s = game.state, f = s.rescue.for, lim = !game || game.tutorial ? 0 : game.online ? onlineRemain() : nopeFullMs(), k = token;
    if (game.rescueDlg && els.dialog.querySelector('[data-rescue]')) return;   // 已经开着
    if (game.rescueAnswered) return;   // 这一回我已经表过态（联机：服务器的新状态还没到）
    // 桌子蒙一层宣纸色，正中左边是炸毛了的队友（头像发抖、背后竖着那只炸弹猫），右边是我那根逗猫棒（金光），中间一道弧线箭头
    openStage('<div class="zm-rescue" data-rescue>' +
        '<div class="zm-rescue-mate"><div class="zm-rescue-kit zm-angry">' + cardHtml('boom') + '</div><div class="zm-rescue-av">' + avatarHtml(f) + '</div><b class="zm-rescue-nm">' + esc(nameOf(f)) + '</b></div>' +
        RESCUE_GAP +
        '<button type="button" class="zm-rescue-wand" data-yes aria-label="' + T('ui.rescue.wand', '用逗猫棒救队友') + '">' + cardHtml(R.DEFUSE) + '</button>' +
      '</div>' +
      '<div class="zm-actions is-center"><button type="button" class="zm-btn" data-no>' + T('ui.rescue.no', '不救') + '</button><button type="button" class="zm-btn zm-btn-life" data-yes data-ok data-focus><span class="zm-life" aria-hidden="true"><i></i></span><b>' + T('ui.rescue.yes', '救！') + '</b></button></div>', (d) => {
      d.classList.add('is-rescue');
      let done = false;
      const box = d.querySelector('[data-rescue]'), okBtn = d.querySelector('[data-ok]');
      const act = (yes) => {
        if (done) return;
        done = true;
        game.rescueAnswered = true;
        if (!yes || !game.online) { game.rescueDlg = null; closeDialog(); apply(0, { type: 'rescue', yes }); return; }
        // 联机：点了「救」先举着逗猫棒等服务器——可能别的队友先到了，那就演「被他抢先」，我的逗猫棒不会白掉
        box.classList.add('is-sent');
        d.querySelectorAll('.zm-btn').forEach((b) => { b.disabled = true; });
        if (okBtn.lifeAnim) okBtn.lifeAnim.pause();
        apply(0, { type: 'rescue', yes: true });
      };
      game.rescueDlg = {
        /* 别的队友先救了（2026-11-19 用户：原来那版太糙）：一段段演——
         * ① 按钮淡出，我的逗猫棒收回去、变灰；② 先救的那位队友的头像在上方「啵」地冒出来；
         * ③ 他的逗猫棒从头像里甩出去，转一圈划弧落到炸弹猫上；④ 落点炸开一圈金光，炸弹猫一下子不抖了、缩回去，队友头像亮金圈；⑤ 整窗淡出 */
        taken: async (from, t) => {
          done = true;
          if (okBtn.lifeAnim) okBtn.lifeAnim.pause();
          d.querySelectorAll('.zm-btn').forEach((b) => { b.disabled = true; });
          const acts = d.querySelector('.zm-actions');
          if (acts) acts.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(220), fill: 'forwards' });
          box.classList.add('is-taken');
          const wand = box.querySelector('.zm-rescue-wand'), kit = box.querySelector('.zm-rescue-kit'), mateAv = box.querySelector('.zm-rescue-av');
          const r0 = box.getBoundingClientRect();
          const rel = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - r0.left, y: r.top + r.height / 2 - r0.top, w: r.width, h: r.height }; };
          const W = rel(wand), K = rel(kit), A = rel(mateAv), rc = A.w / 0.72;
          const at = (x, y, more) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) ' + (more || '');
          const fxEl = (cls, html, x, y) => { const e = document.createElement('div'); e.className = 'zm-rescue-fx ' + cls; e.innerHTML = html || ''; e.style.opacity = '0'; e.style.transform = at(x, y); box.appendChild(e); return e; };
          // ①
          wand.animate([{ transform: 'none', filter: 'grayscale(0)', opacity: 1 }, { transform: 'translate(8px, 16px) rotate(10deg) scale(.9)', filter: 'grayscale(1)', opacity: 0.35 }], { duration: ms(480), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
          // ②
          const P = { x: (W.x + A.x) / 2, y: Math.max(rc * 0.3, Math.min(K.y - K.h * 0.35, W.y - W.h * 0.45)) };
          const av = fxEl('zm-rescue-by', avatarHtml(from), P.x, P.y);
          await wait(ms(140));
          if (t !== token) return;
          await av.animate([{ transform: at(P.x, P.y, 'scale(0)'), opacity: 0 }, { transform: at(P.x, P.y, 'scale(1.2)'), opacity: 1, offset: 0.65 }, { transform: at(P.x, P.y, 'scale(1)'), opacity: 1 }], { duration: ms(340), easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
          if (t !== token) return;
          // ③
          const toss = fxEl('zm-rescue-toss', cardHtml(R.DEFUSE), P.x, P.y);
          const M = { x: (P.x + K.x) / 2, y: Math.min(P.y, K.y) - rc * 0.4 };
          snd('whoosh');
          await toss.animate([
            { transform: at(P.x, P.y, 'rotate(-10deg) scale(.3)'), opacity: 0 },
            { transform: at(P.x, P.y, 'rotate(-40deg) scale(.85)'), opacity: 1, offset: 0.15 },
            { transform: at(M.x, M.y, 'rotate(-220deg) scale(1)'), opacity: 1, offset: 0.55 },
            { transform: at(K.x, K.y, 'rotate(-372deg) scale(.92)'), opacity: 1 },
          ], { duration: ms(620), easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' }).finished.catch(() => {});
          if (t !== token) return;
          // ④
          box.classList.add('is-saved');
          snd('thud');
          const burst = fxEl('zm-rescue-burst', '', K.x, K.y);
          burst.animate([{ transform: at(K.x, K.y, 'scale(.3)'), opacity: 1 }, { transform: at(K.x, K.y, 'scale(2)'), opacity: 0 }], { duration: ms(560), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
          kit.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(.88) rotate(5deg)', filter: 'saturate(.45)', opacity: 0.75 }], { duration: ms(420), easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' });
          mateAv.animate([{ scale: '1' }, { scale: '1.12', offset: 0.4 }, { scale: '1' }], { duration: ms(420), easing: 'ease-out' });
          toss.animate([{ transform: at(K.x, K.y, 'rotate(-372deg) scale(.92)'), opacity: 1 }, { transform: at(K.x, K.y + 8, 'rotate(-372deg) scale(.7)'), opacity: 0 }], { duration: ms(380), delay: ms(300), fill: 'forwards' });
          av.animate([{ transform: at(P.x, P.y, 'scale(1)'), opacity: 1 }, { transform: at(P.x, P.y - 14, 'scale(.9)'), opacity: 0 }], { duration: ms(360), delay: ms(360), fill: 'forwards' });
          await wait(ms(820));
          if (t !== token) return;
          // ⑤
          const fades = [d.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }], { duration: ms(260), easing: 'ease-in', fill: 'forwards' }), els.mask.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(260), easing: 'ease-in', fill: 'forwards' })];
          await fades[0].finished.catch(() => {});
          closeDialog();
          fades.forEach((a) => a.cancel());
        },
      };
      d.querySelectorAll('[data-yes]').forEach((b) => b.addEventListener('click', () => act(true)));
      d.querySelector('[data-no]').addEventListener('click', () => act(false));
      rescueTimer(okBtn, lim, k, act);
    });
  }
  /* 单机：求救这一段谁来动。手里有逗猫棒的机器猫队友「想一想」后去救（离得近的先）；我有逗猫棒就弹窗，可能比机器猫先点；
   * 没人有 / 都不救：等够机器猫想作废的最长时间再判出局——没人有和有人不肯看起来一样 */
  function rescuePhase(H) {
    const s = game.state, key = s.rescue.for + ':' + s.rescue.card + ':' + s.seq;
    const wait0 = R.rescueWaiting(s);
    if (!game.rr || game.rr.key !== key) {
      game.rr = { key, t0: Date.now() };
      const bot = wait0.find((k) => k !== H || autopilot);
      const P = pace();   // 机器猫想救不救的时间和想作废一样（2026-11-19 用户）
      if (bot != null) schedule(P.botNope[0] + Math.random() * (P.botNope[1] - P.botNope[0]), () => {
        if (game.state.phase === 'rescue' && game.rr && game.rr.key === key && R.rescueWaiting(game.state).indexOf(bot) >= 0) apply(bot, decideBot(bot));
      });
    }
    const left = R.rescueWaiting(s);
    if (left.indexOf(H) >= 0 && !autopilot) { busy = false; rescueDialog(); return; }
    if (!left.length) {
      const rr = game.rr;
      if (rr.closing) return;
      rr.closing = true;
      schedule(Math.max(0, rr.t0 + pace().botNope[1] + 150 - Date.now()), () => { if (game.state.phase === 'rescue' && game.rr === rr) apply(-1, { type: 'closeRescue' }); });
    }
  }
  /* 百变「明塞」（2026-11-15 用户挑甲2 · 塞歪了）：被明着塞回去的炸弹猫是一张真牌，夹在它那一层、往右下歪着露出一截（上面几层压着它）。
   * 一直留着：有人摸牌它跟着往上挪；被摸走 / 洗牌 / 改命动过（我的记忆里不再知道它在哪）就收回去。动画中途不重算，播完再摆 */
  // 露着的炸弹猫往哪边歪：第一次露出来时定——离它最近（4 层以内）的那只往哪边，它就往另一边；附近没有就往右。定了不再变
  function kitSideFor(id, pos, list) {
    game.kitSide = game.kitSide || new Map();
    if (game.kitSide.has(id)) return game.kitSide.get(id);
    const st = game.state, others = list || Array.from(game.openKits || []).map((x) => ({ id: x, pos: st.deck.indexOf(x) })).filter((o) => o.pos > 0);
    let near = null;
    for (const o of others) if (o.id !== id && game.kitSide.has(o.id) && Math.abs(o.pos - pos) <= 4 && (!near || Math.abs(o.pos - pos) < Math.abs(near.pos - pos))) near = o;
    const side = near ? -game.kitSide.get(near.id) : 1;
    game.kitSide.set(id, side);
    return side;
  }
  function renderOpenKits() {
    const stack = els.deck.querySelector('.zm-deck-stack');
    if (!stack) return;
    const st = game && game.state;
    const want = [];
    if (st && game.openKits && game.openKits.size && !ov) {
      for (const id of Array.from(game.openKits)) {
        const pos = st.deck.indexOf(id);
        if (pos < 0 || st.memo[0].deck.indexOf(id) < 0) { game.openKits.delete(id); continue; }
        if (pos > 0) want.push({ id, pos });   // 在最上面那张：faceTop 让牌堆顶直接翻成正面，不再另插
      }
    }
    if (ov) return;
    /* 好几只露着时（2026-11-16 用户挑甲 · 两边交替）：每只第一次露出来时定一个方向——离它最近（4 层以内）的那只往哪边，它就往另一边；
     * 附近没有就往右。方向记住不再变（别的那只被摸走，剩下的也不会突然换边） */
    want.sort((a, b) => a.pos - b.pos);
    for (const w of want) kitSideFor(w.id, w.pos, want);
    stack.querySelectorAll('.zm-deck-kit').forEach((k) => {
      if (want.some((w) => +k.dataset.id === w.id && +k.dataset.pos === w.pos)) return;
      // 歪着露出的那只被顶到了最上面：记下它原来往哪边歪，牌堆顶那张正面从这个歪着的样子摆正（见 renderPiles 掀顶那段）
      if (st && st.deck[0] === +k.dataset.id) game.kitToTop = { id: +k.dataset.id, sx: k.classList.contains('is-left') ? -1 : 1 };
      k.remove();
    });
    const sheets = Array.from(stack.querySelectorAll('.zm-sheet')), top = stack.querySelector('.zm-card.is-top');
    const n = sheets.length + (top ? 1 : 0);
    for (const w of want) {
      if (stack.querySelector('.zm-deck-kit[data-id="' + w.id + '"][data-pos="' + w.pos + '"]')) continue;
      const li = n - 1 - w.pos, sh = sheets[li];   // 从下往上数第 li 层
      if (!sh) continue;
      const box = document.createElement('div');
      const left = game.kitSide.get(w.id) === -1;
      box.className = 'zm-deck-kit' + (left ? ' is-left' : ''); box.dataset.id = w.id; box.dataset.pos = w.pos;
      box.style.transform = sh.style.transform;
      box.innerHTML = cardHtml(w.id);
      sh.after(box);
      game.kitShown = game.kitShown || new Set();
      if (game.kitShown.has(w.id)) continue;   // 已经露过的：换层就直接摆过去，不再重演歪出来的那一下
      game.kitShown.add(w.id);
      const sx = left ? -1 : 1;
      if (!fx.reduce()) box.firstElementChild.animate([{ translate: '0 0', rotate: '0deg' }, { translate: (28 * sx) + '% 7%', rotate: (9 * sx) + 'deg', offset: 0.7 }, { translate: (24 * sx) + '% 6%', rotate: (7 * sx) + 'deg' }], { duration: ms(420), easing: 'cubic-bezier(.3,.7,.3,1)' });
    }
  }


  function renderPiles() {
    const s = game.state, d = D();
    renderFlux(d);
    renderRoleFan();
    renderDeck(Math.max(0, d.deckSize - (d.lifted || 0)));
    els.deck.classList.toggle('no-count', !d.deckSize);
    els.deckCount.textContent = d.deckSize;
    if (lastDeck >= 0 && lastDeck !== d.deckSize) fx.pop(els.deckCount, { scale: 1.25, dur: 260 });
    lastDeck = d.deckSize;
    els.kit.innerHTML = (d.kittens || d.deckSize) ? '<span class="sep">/</span>' + ART.icon('boom') + '<span>' + d.kittens + '</span>' : '';
    els.kit.title = T('ui.deck.kittens', '牌堆里还有 {n} 只炸弹猫', { n: d.kittens });
    if (lastKit >= 0 && lastKit !== d.kittens && d.kittens) { fx.pop(els.kit, { scale: 1.5, dur: 420 }); }
    lastKit = d.kittens;
    renderDiscard(d.discard);
    renderOpenKits();
    // 百变「掀顶」：牌堆最上面那张翻开摆着（只在没动画时摆，动画里照常是牌背）
    {
      const stack = els.deck.querySelector('.zm-deck-stack'), top = stack && stack.querySelector('.zm-card.is-top');
      const faceId = d.topFace != null && d.deckSize > 0 && top && !(game.drawLift && game.drawLift.face != null) ? d.topFace : null;   // 联机预掀着翻开的那张：下面先是牌背
      let fc = stack && stack.querySelector('.zm-deck-face');
      if (faceId == null) { if (fc) fc.remove(); }
      else {
        if (!fc || +fc.dataset.id !== faceId) {
          if (fc) fc.remove();
          stack.insertAdjacentHTML('beforeend', '<div class="zm-deck-face" data-id="' + faceId + '">' + cardHtml(faceId) + '</div>');
          fc = stack.lastElementChild;
          // 新翻上来的那张：从牌背翻成正面（2026-11-15 用户：掀顶生效 / 每摸走一张，下一张都要翻起来）
          const quiet = game.faceQuiet === faceId;   // 透视：拿起来又正面放回去的那张，不再演一次翻面
          game.faceQuiet = null;
          /* 火眼露着、歪插在第二张的炸弹猫被顶到最上面（2026-11-22 用户：以前一下子就变正了，像牌多了 / 少了几张）：
           * 它本来就是正面，不再翻；从歪着的样子慢慢推正、落进顶上那一层 */
          const slant = stack.querySelector('.zm-deck-kit[data-id="' + faceId + '"]');
          const kt = slant ? { id: faceId, sx: slant.classList.contains('is-left') ? -1 : 1 } : game.kitToTop && game.kitToTop.id === faceId ? game.kitToTop : null;
          game.kitToTop = null;
          if (slant) slant.remove();
          // 2026-11-22 用户：摸牌和摆正错开——上面那张基本被拿走了（推出去、捏起来那一下之后），炸弹猫才推正；之前保持歪着
          if (kt) { if (!fx.reduce()) fc.firstElementChild.animate([{ translate: (24 * kt.sx) + '% 6%', rotate: (7 * kt.sx) + 'deg' }, { translate: (-3 * kt.sx) + '% -1%', rotate: (-1 * kt.sx) + 'deg', offset: 0.75 }, { translate: '0 0', rotate: '0deg' }], { duration: ms(460), delay: ov ? ms(danger() >= 0.2 ? 820 : 520) : 0, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' }); }
          else if (!fx.reduce() && !quiet) fc.firstElementChild.animate([{ transform: 'perspective(400px) rotateY(90deg)', filter: 'brightness(.8)' }, { transform: 'perspective(400px) rotateY(0deg)', filter: 'none' }], { duration: ms(320), easing: 'cubic-bezier(.3,.7,.3,1)' });
        }
        fc.style.transform = top.style.transform;
      }
    }
    // 2026-11-18 用户：牌堆顶不再因为「我知道它是炸弹猫」发红光——不替玩家记牌（自己塞的位置也一样，忘了就是忘了）
  }
  function deckTopRect() {
    const c = els.deck.querySelector('.zm-deck-stack > .zm-card');
    return c ? c.getBoundingClientRect() : els.deck.getBoundingClientRect();
  }
  // 弃牌堆顶：落牌落在最上面那张的位置（堆高了就落得高一点）
  function discardRect() { return fx.steady(discardRectRaw); }   // 量的是不震时的位置（桌子在震也不会落偏、落下再挪一下）
  // 下一张（前面还有 extra 张在半路）落进弃牌堆后、它在堆顶的确切位置：堆高了一层，落点也跟着高一层（和 renderDiscard 同一个算法）
  function discardSlot(extra) {
    return fx.steady(() => {
      const r = els.discard.getBoundingClientRect(), dy = pileY((D().discard || []).length + (extra || 0));
      return { left: r.left, top: r.top + dy, width: r.width, height: r.height, right: r.right, bottom: r.bottom + dy };
    });
  }
  function discardRectRaw() {
    const cs = els.discard.querySelectorAll('.zm-card');
    if (!cs.length) return els.discard.getBoundingClientRect();
    const r = els.discard.getBoundingClientRect(), dy = parseFloat((cs[cs.length - 1].style.transform.match(/translate\([^,]+,\s*(-?[\d.]+)px/) || [0, 0])[1]) || 0;
    return { left: r.left, top: r.top + dy, width: r.width, height: r.height, right: r.right, bottom: r.bottom + dy };
  }

  /* ───── 手牌：每次重画都用 FLIP 让留下的牌滑到新位置 ───── */
  function renderHand(o) {
    o = o || {};
    const s = game.state;
    const hand = handOut.size ? D().hand.filter((id) => !handOut.has(id)) : D().hand;
    selected = selected.filter((id) => hand.indexOf(id) >= 0);
    /* 问到我要不要作废（2026-11-16 用户：作废牌要默认替我点起来）：每个新的反应窗，手里第一张作废自动抬起；
     * 再点这张抬起的就打出去（2026-11-17 朋友局：都以为再点一下是出牌，结果放下了、时间到了也没作废成），
     * 点上面的紫色「作废」键也一样；不想挡点「不挡 / 不管」 */
    if (s.phase === 'react' && reactOpen && s.pending) {
      const key = (s.pending.by) + ':' + s.pending.cards.join(',') + ':' + s.pending.nopes.length;   // 同一张牌、同一层作废 = 同一个窗
      if (nopeAutoKey !== key) {
        nopeAutoKey = key;
        nopeLift.clear();
        const first = favorAsk() ? null : hand.find((id) => R.KIND_OF[id] === R.NOPE);   // 索要合一：手牌要拿来挑，不替我抬作废
        if (first != null) nopeLift.add(first);
      }
    }
    const prev = new Map();
    if (o.flip !== false) els.hand.querySelectorAll('.zm-card').forEach((c) => prev.set(c.dataset.id, c.getBoundingClientRect()));
    const saving = mode === 'save', okSave = saving ? saveCandidates(hand) : null;
    const combo = selected.length && (saving ? selected.length === 2 && R.savePairOk(hand, selected) : classifyMine(selected) && mode !== 'give');
    const note = !hand.length ? watchNote() : '';
    // 我出局了、还没坐到谁背后：空出来的手牌区摆一排还在场的人的小头像，点谁就坐到谁背后（2026-11-17 用户定丙）
    const pick = !hand.length && outIdle() ? watchPickHtml() : '';
    const hw = handWild();
    els.hand.innerHTML = (note ? '<p class="zm-hand-note">' + esc(note) + '</p>' : '') + pick + hand.map((id) => cardHtml(id,
      (selected.indexOf(id) >= 0 ? 'is-sel' + (combo ? ' is-combo' : '') : (reactOpen && nopeLift.has(id) ? 'is-sel' : '')) + (handHidden.has(id) ? ' is-incoming' : '') +
      (s.phase === 'react' && reactOpen && R.KIND_OF[id] === R.NOPE ? ' is-nope-ready' : '') + (okSave && !okSave.has(id) ? ' is-dim' : ''), '', hw && !wildLater.has(id))).join('');
    els.hand.querySelectorAll('.zm-card').forEach((c) => {
      c.addEventListener('click', (e) => { e.stopPropagation(); onCardTap(+c.dataset.id, c); });
    });
    els.hand.querySelectorAll('[data-watch]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); watchFromOut(+b.dataset.watch); }));
    if (pick) fitWatchRow();
    els.hand.classList.toggle('is-giving', mode === 'give' || favorLook());
    els.hand.classList.toggle('is-saving', saving);
    els.hand.classList.toggle('is-myturn', myTurnToAct() && !mode);
    layoutHand();
    if (LOUPE) { bindLoupe(); els.hand.classList.toggle('is-crowded', handCrowded()); }
    if (prev.size && !fx.reduce()) {
      els.hand.querySelectorAll('.zm-card').forEach((c) => {
        const p = prev.get(c.dataset.id);
        if (!p) return;
        const r = c.getBoundingClientRect();
        const dx = p.left - r.left, dy = p.top - r.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        c.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }, { transform: 'translate(0,0)' }],
          { duration: 300, easing: 'cubic-bezier(.3,.75,.3,1)', composite: 'add' });
      });
    }
  }
  function layoutHand() {
    const cards = els.hand.querySelectorAll('.zm-card');
    if (!cards.length) return;
    const u = cards[0].offsetWidth || HU();   // 手牌比 --u 大（2026-11-26 放大 1.3 倍）：按实际牌宽算重叠
    const W = els.hand.clientWidth - 8;
    const n = cards.length;
    let gap = 6;
    if (n * u + (n - 1) * gap > W) gap = (W - u) / (n - 1) - u;
    cards.forEach((c, i) => { c.style.marginLeft = i === 0 ? '0' : gap.toFixed(1) + 'px'; c.style.zIndex = i; });
  }
  /* ───── 手牌放大镜（2026-11-26 用户要试）─────
   * 手牌一张压一张（名字条被挡住）时就能用，稀疏到每张整张露着时不开：按住手牌左右滑，手指下那张抬起来，
   * 手牌上方冒出一张放大的同一张牌跟着手指走；松手 = 点了这张（和平常点一下一样：抬起 / 放下 / 再点作废就打出）；
   * 滑到手牌上方再松手 = 不算。轻点照旧。2026-11-26 用户试过、默认打开；?loupe=0 关掉（记在本机），?loupe=1 恢复 */
  const LOUPE = (() => { try { if (/[?&]loupe=1\b/.test(location.search)) localStorage.removeItem('zm.loupe'); if (/[?&]loupe=0\b/.test(location.search)) localStorage.setItem('zm.loupe', '0'); return localStorage.getItem('zm.loupe') !== '0'; } catch (_) { return !/[?&]loupe=0\b/.test(location.search); } })();
  let loupe = null;   // { pid, x0, y0, t0, on, id, el, node }
  const handCrowded = () => {
    const cs = els.hand.querySelectorAll('.zm-card');
    if (cs.length < 3) return false;
    return cs[2].getBoundingClientRect().left - cs[1].getBoundingClientRect().left < cs[1].offsetWidth - 2;   // 2026-11-26 用户：只要一张压一张（名字条被挡）就能用；只有牌稀疏、每张整张露着时才关
  };
  function loupeCardAt(x) {
    const cs = Array.from(els.hand.querySelectorAll('.zm-card:not(.is-incoming)'));
    let hit = null;
    for (const c of cs) { const r = c.getBoundingClientRect(); if (x >= r.left) hit = c; }   // 后面的压着前面的：取左边沿在手指左边的最后一张
    return hit || cs[0] || null;
  }
  function loupeShow(x) {
    const c = loupeCardAt(x);
    if (!c) return;
    if (!loupe.node) {
      loupe.node = document.createElement('div');
      loupe.node.className = 'zm-loupe';
      els.app.appendChild(loupe.node);
    }
    if (loupe.el !== c) {
      if (loupe.el) loupe.el.classList.remove('is-scrub');
      c.classList.add('is-scrub');
      loupe.el = c; loupe.id = +c.dataset.id;
      loupe.node.innerHTML = cardHtml(loupe.id, '', '', handWild());
      if (!fx.reduce()) loupe.node.animate([{ transform: 'scale(.92)' }, { transform: 'none' }], { duration: 120, easing: 'ease-out' });
      snd('tick');
    }
    const w = Math.min(HU() * 1.6, 150), h = w * 1.4, hr = els.hand.getBoundingClientRect(), fr = frameX(4);
    const left = Math.max(fr.l, Math.min(fr.r - w, x - w / 2));
    loupe.node.style.cssText = 'left:' + left.toFixed(1) + 'px;top:' + Math.max(8, hr.top - h - 6).toFixed(1) + 'px;--lw:' + w.toFixed(1) + 'px';
    loupe.node.classList.toggle('is-off', loupe.cancel);
  }
  function loupeEnd(commit) {
    if (!loupe) return;
    const L = loupe; loupe = null;
    els.hand.classList.remove('is-scrubbing');
    if (L.el) L.el.classList.remove('is-scrub');
    if (L.node) L.node.remove();
    if (L.on) {
      els.hand.dataset.eatClick = String(performance.now());   // 松手后浏览器还会补一个 click，吃掉
      if (commit && !L.cancel && L.id != null) { const c = handCard(L.id); if (c) onCardTap(L.id, c); }
    }
  }
  function bindLoupe() {
    if (!LOUPE || els.hand.dataset.loupe) return;
    els.hand.dataset.loupe = '1';
    els.hand.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || !game || !handCrowded() || !e.target.closest('.zm-card')) return;
      loupe = { pid: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, cancel: false, id: null, el: null, node: null };
      loupe.timer = setTimeout(() => { if (loupe && !loupe.on) { loupe.on = true; els.hand.classList.add('is-scrubbing'); loupeShow(loupe.x); } }, 260);   // 按住不动也开
      loupe.x = e.clientX;
      try { els.hand.setPointerCapture(e.pointerId); } catch (_) { /* */ }
    });
    els.hand.addEventListener('pointermove', (e) => {
      if (!loupe || e.pointerId !== loupe.pid) return;
      loupe.x = e.clientX;
      if (!loupe.on && Math.abs(e.clientX - loupe.x0) > 6) { loupe.on = true; clearTimeout(loupe.timer); els.hand.classList.add('is-scrubbing'); }
      if (!loupe.on) return;
      loupe.cancel = e.clientY < els.hand.getBoundingClientRect().top - 10;   // 滑出手牌上沿 = 不算
      loupeShow(e.clientX);
    });
    const up = (commit) => (e) => {
      if (!loupe || e.pointerId !== loupe.pid) return;
      clearTimeout(loupe.timer);
      if (!loupe.on) {   // 轻点：按住时手牌抓着指针，浏览器补的 click 落不到牌上——这里按手指位置自己点那张，再吃掉补的 click
        loupe = null;
        els.hand.dataset.eatClick = String(performance.now());
        const hit = commit && document.elementFromPoint(e.clientX, e.clientY);
        const c = hit && hit.closest && hit.closest('.zm-hand .zm-card');
        if (c) onCardTap(+c.dataset.id, c);
        return;
      }
      loupeEnd(commit);
    };
    els.hand.addEventListener('pointerup', up(true));
    els.hand.addEventListener('pointercancel', up(false));
    els.hand.addEventListener('click', (e) => { const t = +els.hand.dataset.eatClick || 0; if (t && performance.now() - t < 400) { e.stopPropagation(); e.preventDefault(); els.hand.dataset.eatClick = ''; } }, true);
  }
  const handCard = (id) => els.hand.querySelector('[data-id="' + id + '"]');
  function handRectOf(id) { const c = handCard(id); return c ? c.getBoundingClientRect() : els.hand.getBoundingClientRect(); }
  // 手牌里给一张要飞进来的牌先占位（看不见），别的牌先滑开；返回占位的矩形
  function reserveHandSlot(id) {
    handHidden.add(id);
    if (ov && ov.hand.indexOf(id) < 0) { ov.hand.push(id); ov.hand = R.sortHand(ov.hand); }
    renderHand();
    return handRectOf(id);
  }
  // landed = 飞过来的那张落地时的位置：手牌这期间要是挪了位（又来了张牌、窗口变了），从落地处滑过去，不再一下跳过去
  function revealHandCard(id, landed) {
    handHidden.delete(id);
    const c = handCard(id);
    if (!c) return;
    c.classList.remove('is-incoming');
    if (fx.reduce()) return;
    // 百搭猫：猫牌飞进手里时还是原样，落稳了翻一下变成万能猫（2026-11-26 用户：摸进来以后都变身为万能猫）
    if (handWild() && R.CATS.indexOf(R.KIND_OF[id]) >= 0) {
      const t = token;
      wildLater.add(id);   // 手牌这期间重画也先画原样
      setFace(c, cardHtml(id));
      setTimeout(() => {
        wildLater.delete(id);
        const c2 = handCard(id);
        if (t === token && c2) { snd('flip'); flipFace(c2, t); }
      }, ms(300));
    }
    const r = c.getBoundingClientRect();
    const dx = landed ? (landed.left + landed.width / 2) - (r.left + r.width / 2) : 0, dy = landed ? (landed.top + landed.height / 2) - (r.top + r.height / 2) : 0;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
      c.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.25,.8,.35,1)', composite: 'add' });
    } else {
      c.animate([{ transform: 'translateY(-8px) scale(1.06)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,.8,.4,1.3)', composite: 'add' });
    }
  }
  // 飞进手里的牌先落到牌槽正上方（整张都在手牌那一排上面），再从上面滑进牌槽——滑的时候已经在手牌那一层里，左右邻牌的前后关系自然
  const aboveSlot = (r) => ({ left: r.left, top: r.top - r.height * 1.05, width: r.width, height: r.height, right: r.right, bottom: r.bottom - r.height * 1.05 });
  function dropFromHand(ids) { if (!ov) return; ov.hand = ov.hand.filter((x) => ids.indexOf(x) < 0); selected = selected.filter((x) => ids.indexOf(x) < 0); }

  /* ───── 按钮带 ───── */
  function myTurnToAct() { const s = game.state; return !busy && !game.spectator && s.phase === 'act' && s.turn === 0 && s.alive[0]; }
  let lastPlayOn = false;
  // 按钮带（正中间）：「出牌」「摸牌」两个键一直在；没选牌 / 选的凑不成能出的 →「出牌」灰着。不写说明字（教程里教）。
  // 别人出牌后我有「不行」：紫色「喵？不行」顶在「出牌」的位置；点人时「摸牌」换成「取消」；别人索要我的牌时「出牌」换成「给牌」
  function renderBand() {
    const s = game.state;
    // 只有真的在问我时才露紫色「作废」（2026-11-14：挑着问里不问我的牌，按钮也会闪一下，看着像设置没生效）
    const canNope = s.phase === 'react' && reactOpen && R.canNope(s, 0) && (askMeNope(s) || !!tut);
    const onlinePass = !!(game.online && s.phase === 'react' && reactOpen);   // 联机：每次出牌都有导火索，没「作废」也能点「取消」提前结束
    els.nopeBtn.hidden = !canNope;
    /* 作废提示（2026-11-15 用户挑「乙1 收敛」，不靠文字）：和我有关（我出的、指着我、甩到我头上；组队算上队友）= 「冲着我」：
     * 作废键实心紫加一圈红、头像红圈（准星本来就有）、桌沿连线变红、嘶一声；别人之间的牌（设置里打开了才会问）= 「收敛」：
     * 作废缩成一枚小圆图标键、主键写「不管」、手里的作废牌不亮不跳 */
    const nopeHot = canNope && !tut && nopeAboutMe(s);
    const nopeQuiet = canNope && !tut && !nopeHot;
    els.app.classList.toggle('is-nope-hot', nopeHot);
    els.app.classList.toggle('is-nope-quiet', nopeQuiet);
    if (nopeHot && !lastNopeHot) snd('hiss');
    lastNopeHot = nopeHot;
    // 被索要、轮到我挑牌（2026-11-15 用户挑「给3」的手牌区、不要文字）：整排手牌抬起描粉边、我的头像粉圈、「给牌」粉色、桌沿那条连线变粉
    const fa = favorAsk();
    const giving = !!(mode === 'give' && s.phase === 'give' && s.give && s.give.from === 0) || favorLook();
    if (giving && !els.app.classList.contains('is-giving')) snd('ask');
    els.app.classList.toggle('is-giving', giving);
    els.app.classList.toggle('is-favor-wait', favorNopeStep());
    els.app.classList.toggle('has-pick', giving && selected.length > 0);   // 挑中了一张：暖光停止呼吸、变淡
    const lk = els.table && els.table.querySelector(':scope > .zm-rim .links');
    if (lk) lk.classList.toggle('is-give', giving);
    els.cancelBtn.hidden = mode !== 'target';
    if (mode !== 'save' && els.playBtn.classList.contains('zm-btn-life')) { els.playBtn.classList.remove('zm-btn-life', 'is-hurry', 'is-save'); els.playBtn.textContent = ''; }
    els.app.classList.toggle('is-saving', mode === 'save');
    els.playBtn.hidden = false; els.drawBtn.hidden = false;
    els.playBtn.disabled = true; els.drawBtn.disabled = true;
    // 贪吃猫要我给第二张：两张之间（第一张还在飞）键上别闪回「出牌」，灰着的「给牌 ×1」等下一张（2026-11-18 巡查）
    const giveNext = s.phase === 'give' && s.give && s.give.from === 0 && mode !== 'give';
    if (mode === 'save') { /* 急救：「合成」键的绿条在下面那段里留着，别每次重画把倒计时洗掉 */ }
    else if (giveNext && R.roleOf(s, s.give.to) === 'fat') els.playBtn.innerHTML = T('ui.btn.give', '给牌') + '<b class="zm-xn">×' + (s.give.left > 1 ? 2 : 1) + '</b>'; else els.playBtn.textContent = giveNext ? T('ui.btn.give', '给牌') : T('ui.btn.play', '出牌');
    els.drawBtn.textContent = T('ui.btn.draw', '摸牌');
    els.drawBtn.classList.remove('is-ready');
    // 结束了也等动画播完（ov 还在 = 桌上还在演）再收键（2026-11-22 用户：最后一炸把整局打完时，game.state 当场就是 over，
    // 两个键一摸牌就没了，牌还没翻开就知道自己挂了）
    if (s.phase === 'over' && !ov) { els.playBtn.hidden = true; els.drawBtn.hidden = true; }
    else if (s.phase === 'over') { /* 灰着等动画 */ }
    else if (game.dealing) { /* 发牌中：两个键都灰着 */ }
    // 摸到炸弹猫、我那一下还没炸完（game.fastOut 在出局动画最后才置上）：两个键照常灰着——2026-11-14 用户：一摸牌键就被收走，
    // 牌还没翻开就知道自己完了。game.state 是结算后的，我一摸它就已经写着出局，所以不能按 alive 直接藏
    else if (!s.alive[0] && !game.fastOut && !game.spectator) { /* 灰着等动画 */ }
    else if (game.spectator || (game.online && !s.alive[0])) { els.playBtn.hidden = true; els.drawBtn.hidden = true; }
    // 我出局后不再有「下一局」直接开（2026-11-14 用户：要么看着打完，要么点桌沿右下角的 ⏩ 快进，看完结算才能开下一局——保持一局完整）
    else if (!s.alive[0]) { els.playBtn.hidden = true; els.drawBtn.hidden = true; }
    else if (autopilot) { els.playBtn.hidden = true; els.drawBtn.disabled = false; els.drawBtn.textContent = T('ui.btn.unauto', '取消托管'); }   // 我出局了：自动接着看他们打完，想走就开下一局
    else if (mode === 'target') { els.drawBtn.hidden = true; }
    else if (mode === 'save') {
      // 急救（2026-11-26 用户）：「合成」键是绿色的命，倒计时时一点点减少、底下是灰色（同救队友）；到点没点 = 自动交最便宜的一对
      // 2026-11-26 用户：「合成」「取消」两个键，排法照作废（取消在左、合成在右）；取消 = 不救，照常炸
      els.drawBtn.disabled = false; els.drawBtn.textContent = T('ui.cancel', '取消');
      if (!els.playBtn.querySelector('.zm-life')) els.playBtn.innerHTML = '<span class="zm-life" aria-hidden="true"><i></i></span><b>' + T('ui.btn.save', '合成') + '</b>';
      els.playBtn.classList.add('zm-btn-life', 'is-save');
      els.playBtn.disabled = !(selected.length === 2 && R.savePairOk(game.state.hands[0], selected));
    }
    else if (mode === 'give') {
      // 胖橘出的索要要给两张：按钮上写第几张（2026-11-15 巡查：以前给完一张又要给，不知道怎么回事）
      const gv = s.give, two = gv && R.roleOf && R.roleOf(s, gv.to) === 'fat';
      if (two) els.playBtn.innerHTML = T('ui.btn.give', '给牌') + '<b class="zm-xn">×' + (gv.left > 1 ? 2 : 1) + '</b>'; else els.playBtn.textContent = T('ui.btn.give', '给牌');
      els.playBtn.disabled = selected.length !== 1;
    }
    else if (fa) { els.drawBtn.hidden = true; els.playBtn.textContent = T('ui.btn.give', '给牌'); els.playBtn.disabled = !(selected.length === 1 && R.KIND_OF[selected[0]] !== R.NOPE); }   // 索要合一：作废 · 给牌 两个键
    else if (canNope || onlinePass) { els.playBtn.hidden = true; els.drawBtn.disabled = false; els.drawBtn.textContent = favorNopeStep() ? T('ui.btn.noNope', '不作废') : T('ui.cancel', '取消'); }
    else if (myTurnToAct()) {
      els.drawBtn.disabled = false;
      els.drawBtn.classList.toggle('is-ready', !selected.length);
      const c = selected.length ? classifyMine(selected) : null;
      els.playBtn.disabled = !(c && (!c.needsTarget || R.validTargets(s, 0, c.type).length));
    }
    // 选中一张要指人的牌（还没点出牌）：能指的人头像先亮一圈淡金圈（2026-11-17 定甲）
    aimHint(mode !== 'target' && !busy && myTurnToAct() && selected.length ? (() => { const c = classifyMine(selected); return c && c.needsTarget ? R.validTargets(s, 0, c.type) : []; })() : []);
    // 「出牌」刚亮起来就弹一下
    const on = !els.playBtn.hidden && !els.playBtn.disabled;
    if (on && !lastPlayOn) fx.pop(els.playBtn, { scale: 1.1, dur: 280 });
    lastPlayOn = on;
    els.hint.textContent = '';
  }
  function aimHint(ts) {
    for (const box of allSeatEls()) {
      const seat = +box.dataset.seat;
      if (seat) box.classList.toggle('is-aim', ts.indexOf(seat) >= 0);
    }
    els.me.classList.toggle('is-aim', ts.indexOf(0) >= 0);   // 自由甩锅：自己也能点
  }
  let lastNopeHot = false;
  // 这张待作废的牌和我有关吗（组队：和队友有关也算）——决定作废键是「冲着我」还是「收敛」
  function nopeAboutMe(s) {
    const p = s.pending;
    if (!p) return false;
    if (aboutSeat(p, 0, s.alive, s.dir)) return true;
    const ms = R.isTeam && R.isTeam(s) ? R.matesOf(s, 0) : [];
    return ms.some((m) => s.alive[m] && aboutSeat(p, m, s.alive, s.dir));
  }
  /* ───── 舞台：刚出的牌摆在桌子正中，导火索烧完前大家决定要不要「不行」 ───── */
  let reactOpen = false;
  /* 作废导火索多长（2026-11-17 用户：单机联机统一）：牌冲着我 = 出牌限时的 1/4（10 秒局 3 秒，20 秒 / 不限时 5 秒），只是问问我 = 2.5 秒（联机 2026-11-21 起改 1.5 秒，见下）。
   * 联机以服务器发来的 reactMs 为准（同一个算法） */
  // 单机（2026-11-19 用户：单机想作废的时间可以短一些——没有网络要等）：冲着我 3 秒（10 秒局 2 秒）、只是问问 1.5 秒；救不救队友跟「冲着我」一样长
  // 联机「只是问问」也改 1.5 秒（2026-11-21 用户：开着「全都问」，每张牌都要等别人这一窗烧完，出牌的人觉得卡）；冲着我的仍按服务器的 reactMs
  const nopeFullMs = () => {
    const t = game && game.online ? (game.reactMsSrv || 0) : 0; if (t) return t;
    const ts = turnSec();
    if (game && !game.online) return ts ? Math.min(3000, Math.max(2000, ts * 150)) : 3000;
    return ts ? Math.min(5000, Math.max(3000, ts * 250)) : 5000;
  };
  const nopeWindowMs = (s) => (nopeAboutMe(s) ? nopeFullMs() : Math.min(1500, nopeFullMs()));
  /* 几乎同时作废（2026-11-17 用户：上家刚作废、我也同时点了作废，别把我算成「作废回去」）：
   * 别人刚出了一张作废、又轮到我表态时，先按住一小会儿再收我的作废。
   * 2026-11-26 用户：每次被作废、作废键冒出来都是灰的，要过半秒到一秒才能点，像 bug——以前按住 0.7 秒、还把键和手里的作废牌调灰。
   * 其实别人那张作废飞过来拍下去（约 0.9 秒）时我的点击本来就不收，「同时点」早被这段动画挡掉了；所以缩成 0.25 秒（比人的反应快，只挡手指带过来的那一下），
   * 也不再调灰——键一出来就是亮的，这 0.25 秒里点了只抖一下 */
  const NOPE_HOLD_MS = 250;
  let nopeHoldUntil = 0, nopeHoldTimer = 0;
  function startNopeHold(s) {
    clearTimeout(nopeHoldTimer);
    nopeHoldUntil = s && s.pending && s.pending.nopes.length && lastActorSeat(s) !== 0 ? performance.now() + NOPE_HOLD_MS : 0;
    els.app.classList.toggle('is-nope-hold', !!nopeHoldUntil);
    if (nopeHoldUntil) nopeHoldTimer = setTimeout(() => { nopeHoldUntil = 0; els.app.classList.remove('is-nope-hold'); }, NOPE_HOLD_MS);
  }
  const nopeHeld = () => nopeHoldUntil && performance.now() < nopeHoldUntil;
  const lastActorSeat = (s) => (s.pending.nopes.length ? s.pending.nopes[s.pending.nopes.length - 1].seat : s.pending.by);
  const nopeLift = new Set();   // 反应窗里点起来的作废（只是抬着，不会打出去）
  /* 索要合一（2026-11-20 用户在动画对比里挑定，单机 + 联机）：别人索要我、我手里有作废——不再先问「作废吗」、点掉再挑牌，合成一步：
   * 一开始就是挑牌的样子（整排手牌抬起描粉边、「给牌」粉色），手里的作废照旧发紫光，作废键也在。点作废牌 / 作废键 = 作废；
   * 挑一张别的牌点「给牌」= 不作废、直接给这张（反应窗一关就飞过去，不再停一下等我挑）。导火索烧完没动 = 照常进挑牌，样子不变 */
  // 已经挑好、等窗口关：样子保持挑牌（粉边、那张抬着），别闪回一下普通手牌
  const favorLook = () => favorAsk() || !!(game && game.favorPre != null && (game.state.phase === 'react' || game.state.phase === 'give'));
  /* 2026-11-22 用户（新玩家看不懂：一上来能点手牌、按钮却是「作废」，几秒后又变「给牌」）：拆回两步，挑了丙——
   * ① 作废：我或队友手里有作废时先过这一步，手牌灰着不能挑，只有「作废 / 不作废」；② 给牌：手牌底下一层粉色暖光一呼一吸，挑中一张后停。
   * favorAsk 留着（联机协议 favorOne 还认），但不再走合一 */
  const FAVOR_MERGE = false;
  // 作废这一步、牌是冲着我来的索要：手牌灰着，「取消」写成「不作废」
  const favorNopeStep = () => { const s = game && game.state, p = s && s.pending; return !!(s && s.phase === 'react' && reactOpen && p && p.type === R.FAVOR && p.target === 0 && !game.tutorial); };
  function favorAsk() {
    if (!FAVOR_MERGE) return false;
    const s = game && game.state, p = s && s.pending;
    // 联机要服务器认「不作废 + 给哪张」一起报（view.favorOne）；老服务器照旧两段
    return !!(game && !game.tutorial && !game.spectator && (!game.online || !!(G() && G().favorOne)) && s.phase === 'react' && reactOpen && p && p.type === R.FAVOR && p.target === 0 && !p.nopes.length && R.canNope(s, 0) && !(R.roleOf && R.roleOf(s, p.by) === 'fat'));
  }
  let nopeAutoKey = '';          // 哪个反应窗已经替我自动抬过作废（同一窗里我放下了就不再抬）
  function targetOf(p) {
    if (p.target >= 0) return p.target;
    if (p.type === R.ATTACK) return R.nextAlive(game.state, p.by);
    return -1;
  }
  // 舞台不加框、不写字：只有放大的牌 + 下面一根导火索。谁出的 = 牌从他头像飞出来 + 他头像亮一圈金光；指了谁 = 那人头像上套一个准星
  function showStage(p, hidden) {
    els.stage.classList.remove('is-cancelled', 'is-out');
    const named = '';   // 点名要：桌上只摆三张猫，点名的那张不再放旁边（2026-11-18 用户）——到结算时在被点名的人旁边走原来那套对话泡动画
    els.stage.innerHTML = '<div class="zm-stage-inner">' +
      '<div class="zm-stage-cards">' + p.cards.map((id, i) => cardHtml(id, hidden ? 'is-incoming' : '', 'transform:rotate(' + ((i - (p.cards.length - 1) / 2) * 5).toFixed(1) + 'deg)')).join('') + named + '<div class="zm-stage-nopes"></div></div>' +
      '<div class="zm-fuse" aria-hidden="true"><i class="rope"></i><i class="spark"></i></div></div>';
    placeStage();
    setActing(p.by);
  }
  // 出的牌直接落在弃牌堆上（稍大一圈），不悬在桌子正中；「不行」的窗口就在弃牌堆上开
  function placeStage() {
    const inner = els.stage.querySelector('.zm-stage-inner');
    if (!inner) return;
    const sr = els.stage.getBoundingClientRect(), dr = discardRect();   // 对准弃牌堆最上面那张（堆高了就跟着高），结算时原地压下去，不再往上跳一截
    inner.style.left = (dr.left + dr.width / 2 - sr.left).toFixed(1) + 'px';
    inner.style.top = (dr.top + dr.height / 2 - sr.top).toFixed(1) + 'px';
  }
  function setActing(seat) {
    document.querySelectorAll('.zm-seat.is-acting').forEach((b) => b.classList.remove('is-acting'));
    const b = seat >= 0 && game ? seatEl(seat) : null;
    if (b) { b.classList.add('is-acting'); fx.pop(b.querySelector('.zm-av'), { scale: 1.12, dur: 300 }); }
  }
  /* 被抽牌 / 被点名要牌的人（2026-11-13 用户：只亮出牌人的头像，人一多看不出在抽谁）：头像一圈金光一明一暗，直到牌拿走 / 落空 */
  function markVictim(seat) {
    document.querySelectorAll('.zm-seat.is-victim').forEach((b) => b.classList.remove('is-victim'));
    const b = seat >= 0 && game ? seatEl(seat) : null;
    if (b) b.classList.add('is-victim');
  }
  // 抽牌前「想一下」多久：只剩一张没得挑，不用红光游走，停一下就抽
  const stealThink = (count) => (count <= 1 ? ms(250) : pace().bot + ms(700));
  // 准星：套在被指的人头像上（代替原来那根长虚线箭头）；颜色 = 牌色（cardHue）
  function aim(seat, color) {
    const box = seatEl(seat), av = box && box.querySelector('.zm-av');
    if (!av) return null;
    const m = document.createElement('i');
    m.className = 'zm-aim';
    m.style.setProperty('--aim', color);
    m.innerHTML = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25"/><path d="M30 1v9M30 50v9M1 30h9M50 30h9"/></svg>';
    av.appendChild(m);
    box.classList.add('is-aimed');
    fx.pop(av, { scale: 1.14, dur: 320 });
    return { remove() { m.remove(); box.classList.remove('is-aimed'); }, tint(c) { m.style.setProperty('--aim', c || color); m.classList.toggle('is-dull', !!c); } };
  }
  const stageCard = (id) => els.stage.querySelector('.zm-stage-cards [data-id="' + id + '"]');
  function stageCardsEl() { return els.stage.querySelector('.zm-stage-cards'); }
  function stageVerdict(count, by) {
    const inner = els.stage.querySelector('.zm-stage-inner');
    if (!inner) return;
    // 不盖「作废 / 生效」章：被作废的那几张变灰，又被顶回来就复原
    const cancelled = count % 2 === 1;
    els.stage.classList.toggle('is-cancelled', cancelled);
    if (game && game.rimLk && game.rimLk.setDull) game.rimLk.setDull(cancelled);
  }
  /* 导火索就是灯带（2026-11-17 用户在三个预览里挑了丙）：每开一轮作废（出牌后、每张作废后），颜色从刚出牌 / 刚出作废的那个人
   * 向两边铺满整圈桌沿（金 = 这张牌现在算数，紫 = 被作废了），再从两头往回烧、缩回这个人；还没烧完，除他以外谁都还能作废。
   * 以前牌堆下那根小绳子不再用（.zm-fuse 留着占位、看不见）；作废键里那条细进度照旧 */
  let fuseSparkTimer = null;
  /* 默认开（2026-11-17 在本机联机里亲眼看过：出牌金色从出牌人铺满整圈再烧回、作废后紫色从作废的人铺开）；
   * 网址带 ?rimfuse=0 关掉、退回牌堆下那根小绳子（记在本机），?rimfuse=1 再打开 */
  const RIM_FUSE = (() => { try { if (/[?&]rimfuse=0\b/.test(location.search)) localStorage.setItem('zm.rimfuse', '0'); if (/[?&]rimfuse=1\b/.test(location.search)) localStorage.removeItem('zm.rimfuse'); return localStorage.getItem('zm.rimfuse') !== '0'; } catch (_) { return !/[?&]rimfuse=0\b/.test(location.search); } })();
  if (RIM_FUSE) els.app.classList.add('is-rimfuse');
  /* totalMs：这一窗一整根有多长（2026-11-20：联机状态一推过来就重画导火索，以前每次都从头起、用剩下的时间跑完整圈——
   * 🚫 一圈圈越跑越快。现在只在新的一窗点一次；万一舞台重画了要补画，就从「已经烧到的地方」接着烧） */
  function fuse(msLeft, totalMs) {
    if (!RIM_FUSE) { ropeFuse(msLeft); return; }
    const ring = els.nopeBtn.querySelector('.zm-nope-ring');
    ring.getAnimations().forEach((a) => a.cancel());
    if (!(msLeft > 0)) { stopCardFuse(); return; }
    const total = totalMs > msLeft ? totalMs : msLeft;
    let clock = null;
    if (isFinite(msLeft)) {
      clock = ring.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: total, easing: 'linear', fill: 'forwards' });
      if (total > msLeft) clock.currentTime = total - msLeft;
    }
    cardFuse(msLeft, total, clock);
  }
  function stopFuse() { stopRope(); stopCardFuse(); }
  /* 导火索：绳子从右往左烧短，火星跟着走、一路冒小火花；最后一秒半变红、闪 */
  function ropeFuse(msLeft) {
    const f = els.stage.querySelector('.zm-fuse');
    if (fuseSparkTimer) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; }
    if (!f) return;
    const rope = f.querySelector('.rope'), spark = f.querySelector('.spark');
    rope.getAnimations().forEach((a) => a.cancel());
    spark.getAnimations().forEach((a) => a.cancel());
    f.classList.remove('is-urgent', 'is-lit');
    const ring = els.nopeBtn.querySelector('.zm-nope-ring');
    ring.getAnimations().forEach((a) => a.cancel());
    if (!(msLeft > 0) || !isFinite(msLeft)) { f.classList.toggle('is-idle', !isFinite(msLeft)); return; }
    f.classList.add('is-lit');
    rope.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: msLeft, easing: 'linear', fill: 'forwards' });
    spark.animate([{ left: '100%' }, { left: '0%' }], { duration: msLeft, easing: 'linear', fill: 'forwards' });
    ring.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: msLeft, easing: 'linear', fill: 'forwards' });
    const t0 = performance.now();
    fuseSparkTimer = setInterval(() => {
      if (!spark.isConnected) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; return; }
      const left = msLeft - (performance.now() - t0);
      if (left < 1500) f.classList.add('is-urgent');
      const r = spark.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 3, shapes: ['dot', 'star'], colors: left < 1500 ? ['#c8463a', '#e9d46a'] : GOLDS, radius: 16, size: [3, 7], life: 420, gravity: 10, pattern: 'fountain' });
    }, 140);
  }
  function stopRope() { if (fuseSparkTimer) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; } const f = els.stage.querySelector('.zm-fuse'); if (f) f.classList.add('is-out'); }
  /* 作废倒计时（2026-11-18 用户挑丙「桌心牌计时」）：桌心那张（那几张）牌外一圈紫色描边——紫 = 作废（作废牌 / 作废键 / 流星都是这个紫），
   * 描边从顶上正中开始顺时针收，收的那头顶着一颗作废图标，收完就不能再作废。桌沿只留「谁冲着谁」那一根牌色连线（rimLink），
   * 没目标的牌桌沿不亮。原来的桌沿导火索 / 内圈紫弧（2026-11-17 丙）撤掉：两根线叠在一起颜色打架，单机里作废了也看不到变紫 */
  const NOPE_PURPLE = '#7a5a96';
  let cfz = null;   // { svg, raf }
  /* 方形导火索：绕着桌心刚出的牌一圈，🚫 是火头。clock = 作废键里那条细进度的动画——两根读同一个钟（以前 🚫 自己按 performance.now 走、
   * 细进度走 WAAPI，两边起点 / 暂停 / 快进不一致就会一快一慢，2026-11-20 用户：「🚫 走得比灯带明显快」）。
   * 舞台的牌还没摆上来（联机状态先到、出牌动画还在飞）：等它摆好再画，不再直接不画——凡是问我作废，一定有这一圈（2026-11-20 用户定） */
  function cardFuse(msLeft, total, clock) {
    stopCardFuse(true);
    total = total > msLeft ? total : msLeft;
    const startAt = performance.now(), endAt = startAt + msLeft;
    const host = els.stage.querySelector('.zm-stage-cards');
    const pad = Math.max(7, U() * 0.12), w = host ? host.offsetWidth + pad * 2 : 0, h = host ? host.offsetHeight + pad * 2 : 0, r = Math.min(16, w * 0.12);
    if (!host || w < 20 || h < 20) {
      if (!isFinite(msLeft) || endAt - performance.now() < 250) return;
      const f0 = { svg: null, raf: 0, retry: 0 }; cfz = f0;
      f0.retry = setTimeout(() => { if (cfz === f0) { cfz = null; const left = endAt - performance.now(); if (left > 250) cardFuse(left, total, clock); } }, 90);
      return;
    }
    const x0 = 2, y0 = 2, x1 = w - 2, y1 = h - 2, cx = w / 2;
    const d = 'M' + cx + ' ' + y0 + 'H' + (x1 - r) + 'Q' + x1 + ' ' + y0 + ' ' + x1 + ' ' + (y0 + r) + 'V' + (y1 - r) + 'Q' + x1 + ' ' + y1 + ' ' + (x1 - r) + ' ' + y1 +
      'H' + (x0 + r) + 'Q' + x0 + ' ' + y1 + ' ' + x0 + ' ' + (y1 - r) + 'V' + (y0 + r) + 'Q' + x0 + ' ' + y0 + ' ' + (x0 + r) + ' ' + y0 + 'Z';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'zm-cfuse'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.style.left = -pad + 'px'; svg.style.top = -pad + 'px';
    // 火头里面再包一层 g：最后一秒「一跳一跳」放大只放大里面这层（放大的中心 = 火头自己）。
    // 以前直接放大外层——外层带着 translate，放大的中心是整圈左上角，火头会被甩到前面去
    svg.innerHTML = '<path class="trk" d="' + d + '"/><path class="bar" d="' + d + '"/><g class="hd"><g class="hd-in"><circle r="9"/><circle class="o" r="4.6"/><path d="M-3.2 -3.2 3.2 3.2"/></g></g>';
    host.appendChild(svg);
    const bar = svg.querySelector('.bar'), hd = svg.querySelector('.hd'), L = bar.getTotalLength();
    bar.style.strokeDasharray = L + ' ' + (L + 4);
    const f = { svg, raf: 0 }; cfz = f;
    const put = (off) => { const q = bar.getPointAtLength(Math.min(L - 0.01, Math.max(0, off))); hd.setAttribute('transform', 'translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ')'); };
    if (!isFinite(msLeft) || fx.reduce()) { bar.style.strokeDashoffset = 0; put(0); if (!isFinite(msLeft)) return; }
    const k0 = 1 - msLeft / total;   // 补画时：已经烧掉的那一截
    // 读钟：作废键那条细进度的动画在走就跟它（同一个钟）；没有 / 被取消了就按时间算
    const progress = () => {
      const ct = clock && clock.playState !== 'idle' ? clock.currentTime : null;
      if (ct != null) return Math.min(1, ct / total);
      return Math.min(1, k0 + (performance.now() - startAt) / total);
    };
    const tick = () => {
      if (cfz !== f || !svg.isConnected) return;
      const k = progress(), off = -L * k;
      bar.style.strokeDashoffset = off.toFixed(1); put(-off);
      svg.classList.toggle('is-urgent', (1 - k) * total < 900);
      if (k < 1) f.raf = requestAnimationFrame(tick); else stopCardFuse();
    };
    tick();
  }
  function stopCardFuse(now) {
    if (!cfz) return;
    const f = cfz; cfz = null;
    cancelAnimationFrame(f.raf);
    if (f.retry) clearTimeout(f.retry);
    if (!f.svg) return;
    if (now || fx.reduce() || !f.svg.isConnected) { f.svg.remove(); return; }
    f.svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => f.svg.remove()).catch(() => f.svg.remove());
  }
  /* 牌色（2026-11-18 用户：不同的牌有自己的颜色，索要 = 粉）：光的颜色 = 这张牌名字条的颜色；猫牌组合（偷 / 点名 / 五种）一律金；
   * 索要用一直以来的那个粉（被索要挑牌时整排手牌描的也是它）。准星、桌沿连线都用它 */
  function cardHue(p) {
    if (p.type === R.FAVOR) return '#e0566e';
    if (p.type === 'pair' || p.type === 'triple' || p.type === 'five') return '#c9a24a';
    const t = ART.TONE[p.type] || (p.cards && p.cards.length ? ART.TONE[R.KIND_OF[p.cards[0]]] : null);
    return t ? t.band : '#c9a96e';
  }
  function clearStage(keepRim) {
    stopFuse();
    if (!keepRim) releaseRim();
    if (!keepRim && game && game.arrow) { game.arrow.remove(); game.arrow = null; }   // 扫完舞台（keepRim）时准星也留着：索要 / 偷 / 点名 / 交换要瞄到真动手（2026-11-15 用户）
    setActing(-1);
    markVictim(-1);
    els.stage.innerHTML = '';
    els.stage.classList.remove('is-cancelled');
  }

  /* ───── 出牌限时（照拱猪）─────
   * 轮到谁，谁头像外一道红环顺时针收走；最后 5 秒头像跳、轮到我时每秒一声。我超时 = 自动摸一张（被蹭牌时 = 机器猫替我挑一张给）。
   * 弹窗 / 菜单开着时停表；教程不计时。设置里可改「不限时」 */
  const HURRY_MS = 5000;
  const clock = { seat: -1, left: 0, at: 0, onTimeout: null, paused: false, t1: 0, t2: 0, tk: 0 };
  const turnSec = () => (game && game.online ? (game.turnSec | 0) : (settings.turnSec | 0));   // 联机按房主定的
  function startClock(seat, onTimeout, totalMs) {
    stopClock();
    if (!game || game.tutorial) return;
    const total = totalMs != null ? totalMs : turnSec() * 1000, el = seatEl(seat);   // 联机传服务器上还剩多久
    if (!(total > 0) || !el) return;
    Object.assign(clock, { seat, left: total, onTimeout, paused: false });
    el.style.setProperty('--turn-ms', total + 'ms');
    el.classList.remove('is-timed', 'is-hurry', 'is-paused');
    void el.offsetWidth;
    el.classList.add('is-timed');
    if (!els.mask.hidden || (menu && !menu.hidden)) pauseClock(); else runClock();
  }
  function runClock() {
    const my = token, seat = clock.seat;
    clock.at = performance.now();
    clock.t1 = setTimeout(() => {
      if (my !== token || clock.seat !== seat) return;
      const el = seatEl(seat);
      if (el) el.classList.add('is-hurry');
      if (seat === 0) { snd('tick'); clearInterval(clock.tk); clock.tk = setInterval(() => { if (my === token && clock.seat === 0 && !clock.paused) snd('tick'); }, 1000); }
    }, Math.max(0, clock.left - HURRY_MS));
    if (clock.onTimeout) clock.t2 = setTimeout(() => { if (my !== token || clock.seat !== seat) return; const f = clock.onTimeout; stopClock(); f(); }, clock.left);
  }
  function pauseClock() {
    if (clock.seat < 0 || clock.paused) return;
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    if (clock.at) clock.left = Math.max(0, clock.left - (performance.now() - clock.at));
    clock.at = 0;
    clock.paused = true;
    const el = seatEl(clock.seat);
    if (el) el.classList.add('is-paused');
  }
  function resumeClock() {
    if (clock.seat < 0 || !clock.paused || !els.mask.hidden) return;
    clock.paused = false;
    const el = seatEl(clock.seat);
    if (el) el.classList.remove('is-paused');
    runClock();
  }
  function stopClock() {
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    if (clock.seat >= 0 && game) { const el = seatEl(clock.seat); if (el) el.classList.remove('is-timed', 'is-hurry', 'is-paused'); }
    Object.assign(clock, { seat: -1, onTimeout: null, paused: false, at: 0 });
  }
  // 超时：先替我摸一张（被蹭牌时机器猫替我挑一张给）；连着第二回合还超时 → 进托管，之后每步按机器猫自己的判断走
  function onMyTimeout() {
    if (!game || busy || game.online) return;   // 联机超时由服务器处理
    const s = game.state;
    if (mode === 'target') cancelTarget();
    selected = [];
    timeouts += 1;
    autoAct = true;
    if (s.phase === 'act' && s.turn === 0) { renderHand(); apply(0, { type: 'draw' }); }
    else if (s.phase === 'give' && s.give.from === 0) { mode = null; renderHand(); apply(0, decideBot(0)); }
    if (timeouts >= 2) setAutopilot(true);   // 第二回合还超时：这一下照样摸，之后进托管
  }
  const myTier = () => settings.tier || 'normal';
  function canAuto() { return !!(game && !game.tutorial && !game.spectator && game.state.alive[0] && game.state.phase !== 'over'); }
  function setAutopilot(on) {
    if (game && game.online) { onlineAuto(!!on); return; }
    on = !!on && canAuto();
    if (autopilot === on) return;
    autopilot = on;
    if (!on) timeouts = 0;
    els.me.classList.toggle('is-auto', on);
    snd(on ? 'tick' : 'tap');
    if (on) {
      if (mode === 'target') cancelTarget();
      selected = []; mode = null;
      if (!els.mask.hidden && (els.dialog.querySelector('[data-range], [data-fan]') || els.dialog.querySelector('.zm-grid') || els.dialog.querySelector('[data-alter]') || els.dialog.querySelector('[data-steal]'))) closeDialog();
      // 正等着我（没在播动画）→ 马上交给机器猫
      if (!busy || game.state.phase === 'react') step();
      else renderBand();
    } else if (!busy) step();
    else renderBand();
  }
  // 托管时轮到我：照机器猫的判断走（不是死摸牌）
  function autoMove() {
    if (game.state.phase === 'steal') { if (game.wander) game.wander.cancel(); game.wander = startWander(game.state.steal.from, game.state.steal.perm.length); }
    schedule(game.state.phase === 'steal' ? stealThink(game.state.steal.perm.length) : pace().bot, () => {
      if (!game) return;
      if (!autopilot) { if (game.wander) { game.wander.cancel(); game.wander = null; } step(); return; }   // 排着的这一步还没走就取消托管了：把操作还给我
      autoAct = true;
      apply(0, AI.decide(game.state, 0, myTier()));
    });
  }

  /* 背景音乐的场景：'menu' 主页 / 设置（丁）| 'game' 一局（甲起，紧张了换乙 / 丙）| 'end' 一局结束淡出。见 zhamao-music.js */
  function bgm(scene) { const A = window.ZhamaoAudio; if (!A) return; A.scene(scene); if (scene !== 'end') A.music(true); }

  // 弹窗限时：单机按设置；联机按服务器上这一步还剩多久
  function dlgLimit() {
    if (!game || game.tutorial) return 0;
    if (game.online) return onlineRemain();
    return turnSec() > 0 ? turnSec() * 1000 : 0;
  }

  /* ───── 流程 ───── */
  const turboK = () => (game && game.turbo ? 5 : 1);
  const wait = (t) => new Promise((r) => setTimeout(r, fx.reduce() ? 1 : t / turboK()));
  function schedule(t, fn) { const k = token; setTimeout(() => { if (k === token) fn(); }, t / turboK()); }
  /* 快进（5 倍速）：动画好多是写死的时长，不走 pace()——快进时桌上新起的动画一律 5 倍速放，已经在放的也跟着提速 */
  const nativeAnimate = Element.prototype.animate;
  Element.prototype.animate = function (k, o) {
    const a = nativeAnimate.call(this, k, o);
    if (game && game.turbo && els.app.contains(this)) { const t = a.effect && a.effect.getTiming(); if (t && t.iterations !== Infinity) a.playbackRate = 5; }
    return a;
  };
  function setTurbo(on) {
    if (!game) return;
    game.turbo = on;
    els.app.getAnimations({ subtree: true }).forEach((a) => { const t = a.effect && a.effect.getTiming(); if (t && t.iterations !== Infinity) a.playbackRate = on ? 5 : 1; });
  }
  function renderAll() { renderSeats(); renderPiles(); renderHand(); renderBand(); refreshTools(); }

  function step() {
    if (!game) return;
    if (game.online) { onlineIdle(); return; }   // 联机：谁走下一步由服务器说了算
    // 观战换人留到这一步之间才转桌（被看的那只出局时动画里点的）；一局打完先转回我自己的座位再结算
    const wantPov = game.state.phase === 'over' ? 0 : game.povWant != null ? game.povWant : game.pov || 0;
    game.povWant = null;
    if (wantPov !== (game.pov || 0)) { switchPov(wantPov); return; }
    const s = game.state;
    const H = game.spectator ? -1 : 0;   // 底下那家是我自己（-1：底下坐的是被看的机器猫，它的每一步都交给机器猫）
    if (game.favorPre != null && s.phase !== 'react' && s.phase !== 'give') { game.favorPre = null; selected = []; }   // 索要合一：索要被别人作废了，挑好的那张作罢
    save();
    clearReactTimer();
    reactOpen = false;
    release();
    renderAll();
    if (tut && !coachQueue) hint('');
    if (s.phase === 'over') { finish(); return; }
    if (!tut && guideGate()) return;   // 实战里的引导：第一次用这个玩法 / 第一次摸到没教过的牌，先讲完再往下走
    if (window.ZhamaoAudio && s.deck.length) window.ZhamaoAudio.danger(R.kittensInDeck(s) / s.deck.length);   // 背景音乐按公开的炸弹猫概率换版
    if (s.deck.length) rimHeat(R.kittensInDeck(s) / s.deck.length);
    if (s.phase === 'act') startClock(s.turn, s.turn === H && !autopilot ? onMyTimeout : null);
    else if (s.phase === 'give' && s.give.from === H && !autopilot) startClock(0, onMyTimeout);
    else stopClock();
    // 托管：轮到我做决定的地方都交给机器猫
    if (autopilot && canAuto() && R.whoActs(s).indexOf(0) >= 0 && s.phase !== 'react') { busy = true; mode = null; renderBand(); autoMove(); return; }
    switch (s.phase) {
      case 'act':
        if (s.turn === H) { busy = false; mode = null; renderHand(); renderBand(); myTurnCue(); idle(); }
        else botAct(s.turn);
        break;
      case 'react': reactPhase(); break;
      case 'give':
        if (s.give.from === H && game.favorPre != null && s.hands[0].indexOf(game.favorPre) >= 0) { const id = game.favorPre; game.favorPre = null; selected = []; apply(0, { type: 'give', card: id }); }   // 索要合一：刚才已经挑好了
        else if (s.give.from === H) { game.favorPre = null; busy = false; mode = 'give'; selected = []; renderHand(); renderBand(); idle(); }
        else schedule(pace().bot, () => apply(s.give.from, decideBot(s.give.from)));
        break;
      case 'pick':
        if (s.pick.by === H) { busy = false; pickDialog(); }
        else schedule(pace().bot, () => apply(s.pick.by, decideBot(s.pick.by)));
        break;
      case 'steal':
        if (s.steal.by === H) { busy = false; stealPicker(); }
        else {
          // 机器猫在挑：红光先在被偷的人的牌上游走，想好了（apply）再落下去
          const by = s.steal.by;
          if (game.wander) game.wander.cancel();
          game.wander = startWander(s.steal.from, s.steal.perm.length);
          schedule(stealThink(s.steal.perm.length), () => apply(by, decideBot(by)));
        }
        break;
      case 'alter':
        if (s.alter.by === H) { busy = false; alterDialog(); }
        else schedule(pace().bot, () => apply(s.alter.by, decideBot(s.alter.by)));
        break;
      case 'rescue': rescuePhase(H); break;
      case 'save':
        if (s.save.by === H) { busy = false; saveStart(dlgLimit()); }
        else schedule(pace().bot, () => apply(s.save.by, decideBot(s.save.by)));
        break;
      case 'defuse':
        if (s.defuse.by === H) {
          if (!s.deck.length && !(tut && tut.allow && !tut.allow({ type: 'insert', pos: 0 }))) { schedule(ms(260), () => apply(0, { type: 'insert', pos: 0 })); break; }
          busy = false; insertDialog();
        }
        else schedule(pace().bot, () => apply(s.defuse.by, decideBot(s.defuse.by)));
        break;
    }
  }
  function idle() { if (tut && tut.idle) tut.idle(game.state); }
  // 轮到我：手牌依次轻轻一跳，「摸牌」键亮起来
  let lastCue = '';
  function myTurnCue() {
    const s = game.state;
    const key = s.seq + ':' + s.turnsLeft;
    if (key === lastCue) return;
    lastCue = key;
    if (fx.reduce()) return;
    els.hand.querySelectorAll('.zm-card').forEach((c, i) => {
      c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.4 }, { transform: 'translateY(0)' }],
        { duration: 360, delay: i * 35, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'add' });
    });
  }

  function decideBot(seat) {
    const s = game.state;
    if (tut && tut.bot) { const d = tut.bot(s, seat); if (d) return d; }
    // 本机演示（__zmDebug.demo('ins…')）：指定机器猫这次把炸弹猫塞到哪
    if (s.phase === 'defuse' && game.forceInsert) { const f = game.forceInsert; game.forceInsert = null; return f.rand ? { type: 'insert', pos: (Math.random() * (s.deck.length + 1)) | 0, rand: true } : { type: 'insert', pos: f.pos === 'end' ? s.deck.length : f.pos === 'mid' ? Math.floor(s.deck.length / 2) : f.pos }; }
    return AI.decide(s, seat, game.tiers[seat] || 'normal');
  }
  function botAct(seat) {
    busy = true;
    schedule(pace().bot, () => apply(seat, decideBot(seat)));   // 停一下再走，不冒省略号（省略号只在改命、求救时出现——用户 2026-11-19）
  }

  /* 把一个决定落到引擎上，然后播动画、回到 step */
  async function apply(seat, d) {
    if (game.online) { if (seat === 0) onlineMove(d); return; }   // 联机：发给服务器，等它把事件推回来再播
    const s = game.state, t = token;
    busy = true;
    stopClock();
    const byAuto = seat === 0 && autoAct;
    if (seat === 0) { if (!autoAct) timeouts = 0; autoAct = false; }
    const rects = captureSources(seat, d);
    snapshot();
    let ev, logged = d;
    try {
      if (d.type === 'draw') ev = R.draw(s, seat);
      else if (d.type === 'play') ev = R.play(s, seat, d.cards, d);
      else if (d.type === 'give') ev = R.give(s, seat, d.card);
      else if (d.type === 'pick') ev = R.pickDiscard(s, seat, d.card);
      else if (d.type === 'insert') ev = R.insertKitten(s, seat, d.pos, !!d.rand);
      else if (d.type === 'save') ev = R.catSave(s, seat, d.cards, !!d.no);
      else if (d.type === 'alter') ev = R.alterTop(s, seat, d.order);
      else if (d.type === 'steal') ev = R.stealPick(s, seat, d.idx);
      else if (d.type === 'rescue') ev = R.rescue(s, seat, !!d.yes);
      else if (d.type === 'closeRescue') ev = R.closeRescue(s);
      else throw new Error('bad move');
    } catch (err) {
      console.error(err, d);
      release();
      if (seat !== 0) { try { snapshot(); ev = R.draw(s, seat); } catch (_) { release(); return; } } else { busy = false; step(); return; }
      logged = { type: 'draw' };
    }
    if (HL) HL.act(game, seat, logged, byAuto || (seat === 0 && autopilot) ? 1 : 0);
    if (WAL) WAL.act(game, seat, logged, byAuto || (seat === 0 && autopilot));
    if (seat === 0) selected = [];
    mode = null;
    game.src = rects;
    renderBand();
    await playEvents(ev, t);
    if (t !== token) return;
    afterEvents(ev);
  }
  // 我出的牌要从手里原位置起飞：改状态（重画）之前先量好
  function captureSources(seat, d) {
    const m = {};
    if (seat !== 0) return m;
    if (d.type === 'play' && game.previewSrc) { const p = game.previewSrc; game.previewSrc = null; return p; }   // 先摆到桌上的那几张：从桌上接着演
    const ids = d.type === 'play' ? d.cards : d.type === 'give' ? [d.card] : [];
    for (const id of ids) { const c = handCard(id); if (c) m[id] = c.getBoundingClientRect(); }
    return m;
  }
  function afterEvents(ev) {
    if (tut && tut.after) {
      const msgs = tut.after(ev, game.state);
      if (tut.done) { showCoach(msgs && msgs.length ? msgs : [T('tut.done', '做到了！')], lessonDone); return; }   // 小关卡：这一关的事做完了
      if (msgs && msgs.length) { showCoach(msgs, step); return; }
    }
    step();
  }

  let evPlaying = 0;   // 正在播一串事件动画（单机观战换人：动画里自动换的留到播完再转桌）
  async function playEvents(ev, t) {
    evPlaying++;
    try {
      for (let i = 0; i < ev.length; i++) {
        if (t !== token) return;
        const e = ev[i], nx = ev[i + 1];
        if (e.t === 'role' && (e.role === 'timid' || e.role === 'cow') && nx && nx.t === 'turn' && nx.attacked && nx.seat === e.seat) {
          await anim(e.role === 'cow' && e.from ? Object.assign({}, nx, { turnsLeft: e.from }) : nx, t, e);
          if (t !== token) return;
          await anim(e, t, ev[i + 2]);
          if (e.role === 'cow' && ov && ov.turn === nx.seat && ov.turnsLeft !== nx.turnsLeft) { ov.turnsLeft = nx.turnsLeft; renderSeat(nx.seat); }
          i++;
          continue;
        }
        // 2026-11-26 用户：联机百变「火眼」别人塞回炸弹猫，整局卡死——某个动画抛错，这串事件就再也播不完、busy / online.playing 一直挂着。
        // 兜底：动画出错只丢掉这一串剩下的动画（状态早已结算好），清掉飞着的牌，照常往下走，桌面按最终状态重画
        try { await anim(e, t, nx); } catch (err) {
          console.error('[zhamao] anim failed, skip rest of group:', e && e.t, err);
          if (t === token) wipeFx();
          return;
        }
      }
    } finally { evPlaying--; }
  }

  /* ───── 事件动画 ───── */
  let lastEv = null;
  async function anim(e, t, next) {
    rimFx(e);
    const prev = lastEv;
    lastEv = e;
    if (game.rolePop && !rolePopKeeps(game.rolePop, e)) rolePopDone();
    if (e.t === 'play') game.nopeSeats = [];
    else if (e.t === 'nope') (game.nopeSeats = game.nopeSeats || []).push(e.seat);
    if (e.t === 'askGive') return animAskGive(e, t, prev);
    if (e.t === 'resolve' && game.state.roles && game.nopeSeats && game.nopeSeats.length) return animResolve(e, t).then(() => tabbyMiss(e, t));
    if (e.t === 'give' && game.rolePop) return animTransfer(e, t, 'give').then(() => fatGave(e, t));
    if (e.t === 'steal' && game.rolePop) return animSteal(e, t).then(() => (t === token ? wait(ms(200)).then(rolePopDone) : null));
    switch (e.t) {
      case 'play': return animPlay(e, t);
      case 'nope': return animNope(e, t);
      case 'resolve': return animResolve(e, t);
      case 'turn': return animTurn(e, t);
      case 'reverse': return animReverse(e, t);
      case 'shuffle': return animShuffle(e, t);
      case 'future': return animFuture(e, t);
      case 'alter': return animAlterLift(e, t);
      case 'altered': return animAltered(e, t);
      case 'askGive': return animAskGive(e, t);
      case 'give': return animTransfer(e, t, 'give');
      case 'steal': return animSteal(e, t);
      case 'swap': return animSwap(e, t);
      case 'take': return animTake(e, t);
      case 'miss': return animMiss(e, t);
      case 'askPick': return;
      case 'pick': return animPick(e, t);
      case 'draw': return animDraw(e, t);
      case 'boom': return animBoom(e, t, next);
      case 'noSave': return;   // 急救点了「取消」：接着照常炸
      case 'save': return;   // 急救：等摸到的人挑对子（头像一直是炸弹猫），挑好了 defuse 事件演合成
      case 'defuse': return animDefuse(e, t);
      case 'insert': if (e.at != null && game && game.state && game.state.flux === 'exact' && e.card != null) (game.openKits = game.openKits || new Set()).add(e.card); return animInsert(e, t);   // 百变「明塞」：塞完那张露一截在牌堆里（renderOpenKits）
      case 'flux': return animFlux(e, t);
      case 'nine': return animNine(e, t);
      case 'askRescue': return animAskRescue(e, t);
      case 'role': return animRole(e, t);
      case 'noRescue': return animNoRescue(e, t);
      case 'out': return animOut(e, t);
      case 'win': return;
    }
  }

  /* 出牌：我出的从手里原位置起飞（手牌随即合拢），机器人出的从头像里背面朝上冒出来、半路翻成正面；
   * 沿弧线落到桌中舞台上，一张张排开，落桌一压；有指定对象就画一道会流动的虚线箭头 */
  async function animPlay(e, t) {
    const s = game.state;
    const p = s.pending || { by: e.seat, type: e.type, cards: e.cards, target: e.target, named: e.named, nopes: [] };
    const src = game.src || {};
    if (e.seat === 0) { dropFromHand(e.cards); e.cards.forEach((id) => handOut.delete(id)); renderHand(); } else { ov.counts[e.seat] -= e.cards.length; renderSeat(e.seat); }
    showStage(p, true);
    snd('whoosh');
    const su = SU(), start = avPoint(e.seat);
    const flights = e.cards.map((id, i) => {
      const target = stageCard(id);
      const to = target.getBoundingClientRect();
      const mine = e.seat === 0 && src[id];
      const rot = (i - (e.cards.length - 1) / 2) * 5;
      // 联机里我出的牌已经先飞上桌摆好了（乐观出牌 / 先摆上桌再选人）：服务器回话后别再从原地「飞」一遍——
      // 以前会带着 90px 的弧线原地蹦一下，看着像动画重播了一次（2026-11-13 用户：牌落定后好像重复了一下、卡一下）
      if (mine && Math.hypot(src[id].left + src[id].width / 2 - (to.left + to.width / 2), src[id].top + src[id].height / 2 - (to.top + to.height / 2)) < 6) {
        target.classList.remove('is-incoming');
        return Promise.resolve();
      }
      const fo = {
        html: cardHtml(id), back: backHtml(), flip: mine ? null : 'up', flipAt: 0.15,
        from: mine ? src[id] : start, to: { x: to.left + to.width / 2, y: to.top + to.height / 2 }, w: su,
        s0: mine ? src[id].width / su : 0.3, s1: 1, r0: mine ? 0 : -18, r1: rot, dur: ms(pace().fly + 80), delay: i * ms(80), lift: mine ? 90 : 50,
      };
      return fx.fly(mine ? leaveWild(id, fo) : fo).then(() => {
        if (t !== token) return;
        target.classList.remove('is-incoming');
        snd('thud');
        if (!fx.reduce()) target.animate([{ transform: 'rotate(' + rot + 'deg) scale(1.05)' }, { transform: 'rotate(' + rot + 'deg) scale(1)' }], { duration: 180, easing: 'ease-out' });
      });
    });
    await Promise.all(flights);
    if (t !== token) return;
    const tg = targetOf(p);
    if (tg >= 0) {
      if (game.arrow) game.arrow.remove();
      game.arrow = aim(tg, cardHue(p));
      releaseRim();
      game.rimLk = rimLink(p.by, tg, p.type === R.ATTACK || p.type === R.TATTACK, cardHue(p));   // 甩锅 / 自由甩锅一律顺着出牌方向连（2026-11-14 用户）；桌沿连线单独记着：等牌真的拿到 / 给到 / 换完才收（不跟准星一起收）；甩锅给下家也连
    }
    if (s.roles && R.roleOf(s, e.seat) === 'calico' && e.cards && !R.classify(e.cards)) {   // 百搭猫：杂猫凑的一对 / 三张——亮牌，告诉大家为什么算数
      const fl = await flashRole(e.seat, t, 520);
      await fl.back();
      if (t !== token) return;
    }
    await mimic(p.cards, t);   // 万能猫顶了谁：演完、停一下再往下走（只有组合里有万能猫时才多这一下）
    if (t !== token) return;
    const named = els.stage.querySelector('.zm-stage-named');
    if (named && !fx.reduce()) named.animate([{ transform: 'scale(.2) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(6deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }

  /* 万能猫上桌：它顶的是哪只猫（对子 / 三张 = 同组里那只真猫；五种各一张 = 缺的那几种按顺序分）。两张都是万能猫就不顶谁 */
  function mimicKinds(cards) {
    const K = R.KIND_OF, kinds = cards.map((id) => K[id]);
    if (!kinds.some((k) => k === R.WILD) || !kinds.every(R.catLike) || allwildNow()) return {};   // 百搭时猫都画成万能猫了，不再变身
    const real = kinds.filter((k) => k !== R.WILD), out = {};
    if (cards.length === 5) {
      const miss = R.CATS.filter((c) => real.indexOf(c) < 0);
      cards.forEach((id) => { if (K[id] === R.WILD) out[id] = miss.shift(); });
    } else if (real.length) cards.forEach((id) => { if (K[id] === R.WILD) out[id] = real[0]; });
    return out;
  }
  /* 万能猫变身（2026-11-13 用户挑定甲）：万能猫的画一道流光扫过、变成它顶的那只猫，名字条照旧五彩、名字换成那只猫。
   * 只在桌上这样，进弃牌堆就还是万能猫 */
  async function mimic(cards, t) {
    const map = mimicKinds(cards);
    const ids = Object.keys(map).map(Number);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], k = map[id], el = stageCard(id);
      if (!k || !el) continue;
      await wait(ms(i ? 140 : 260));
      if (t !== token) return;
      const r = el.getBoundingClientRect();
      const art = el.querySelector('.zm-art');
      const nw = document.createElement('div');
      nw.className = 'zm-art zm-mimic-art';
      nw.style.setProperty('--bg', ART.TONE[k].bg);
      nw.innerHTML = ART.face(k) + '<i class="zm-mimic-sweep"></i>';
      art.after(nw);
      el.classList.add('is-mimic');
      if (!fx.reduce()) nw.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: ms(520), easing: 'cubic-bezier(.5,0,.3,1)', fill: 'both' });
      setTimeout(() => { if (t === token) el.querySelector('.zm-nm').textContent = R.NAMES[k]; }, ms(300));
      snd('ding');
      fx.burst(r.left + r.width / 2, r.top + r.height * 0.4, { n: 10, shapes: ['star', 'dot'], colors: ['#e0893e', '#d4607e', '#8a63a8', '#2f8a83', '#c9a24a'], radius: 46, size: [4, 10], life: 700 });
    }
    if (ids.length) await wait(ms(900));
  }

  /* 不行：出牌人喊一嗓子；牌从高处拍下来压在原来那张上，舞台一震、紫色冲击波；
   * 立刻盖章当前结果（单数=作废、双数=生效），原牌跟着变灰 / 复原 */
  async function animNope(e, t) {
    setActing(e.seat);
    snd('nope');
    bubble(e.seat, '', { icon: 'nope', loud: true, ms: 1400 });
    fx.shake(avEl(e.seat), { amp: 4, dur: 300 });
    const src = e.seat === 0 ? handCard(e.card) : null;
    const from = src ? src.getBoundingClientRect() : avPoint(e.seat);
    if (e.seat === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.seat] -= 1; renderSeat(e.seat); }
    const cards = stageCardsEl();
    const box = cards ? cards.getBoundingClientRect() : els.center.getBoundingClientRect();
    const rot = e.count % 2 ? -4 : 3;   // 叠上去的作废只微微歪一点（2026-11-18 用户：别错开太多）
    // 先把桌上那张作废摆好（藏着）、量它真正落在哪、多大，飞过去就落在那儿（2026-11-18 用户：第二张作废拍下去最后一帧和落脚处对不上）
    const slot = stageNope(e.card, e.count, rot);
    if (slot) slot.style.visibility = 'hidden';
    const sr = slot ? slot.getBoundingClientRect() : box;
    const c = { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 };
    const u = slot ? slot.offsetWidth : U();
    // 先飞到上方举高、放大，再狠狠拍下去
    const node = await fx.fly({
      html: cardHtml(e.card), back: backHtml(), flip: src ? null : 'up', flipAt: 0.1,
      from, to: { x: c.x, y: c.y - u * 0.5 }, w: u, s0: src ? from.width / u : 0.35, s1: 1.45, r0: 0, r1: rot * 2, dur: ms(380), lift: 70, land: false, keep: true,
    });
    if (t !== token) { if (node) node.remove(); return; }
    if (node) {
      const w = u, h = w * 1.4;
      await fx.animate(node, [
        { transform: fx.T(c.x - w / 2, c.y - u * 0.5 - h / 2, 1.45, rot * 2) },
        { transform: fx.T(c.x - w / 2, c.y - h / 2, 0.92, rot), offset: 0.55, easing: 'cubic-bezier(.2,.8,.4,1)' },
        { transform: fx.T(c.x - w / 2, c.y - h / 2, 1, rot) },
      ], { duration: ms(240) }, 'cubic-bezier(.6,0,.9,.5)').finished.catch(() => {});
      node.remove();
    }
    if (slot) slot.style.visibility = '';
    if (t !== token) return;
    // 拍下去
    snd('slam');
    fx.shake(stageCardsEl(), { amp: 7, dur: 320 });
    fx.ring(c.x, c.y, { color: '#7a5a96', size: u * 3.2, width: 5, dur: 520 });
    fx.burst(c.x, c.y, { n: 12, shapes: ['star', 'dot'], colors: PURPLES, radius: u * 1.3, size: [5, 16], life: 760, pattern: 'ring' });
    stageVerdict(e.count, e.seat);
    await wait(ms(260));
  }
  function stageNope(id, count, rot) {
    const box = els.stage.querySelector('.zm-stage-nopes');
    if (!box) return;
    box.insertAdjacentHTML('beforeend', cardHtml(id, '', 'transform:translate(-50%,-50%) rotate(' + rot + 'deg)'));
    return box.lastElementChild;
  }

  /* 结算：被作废——灰掉的牌连同「不行」一起扫进弃牌堆；生效——牌金光一闪，再扫进弃牌堆，接着放效果 */
  async function animResolve(e, t) {
    stopFuse();
    // 准星留到真的动手那一下：索要（对方挑牌）、两张抽牌（我在他扣着的牌里点）、三张点名、交换——各自的动画里再撤（2026-11-14 用户：抽别人牌时对方头上也要有准星）
    if (game.arrow && (e.cancelled || (e.type !== R.FAVOR && e.type !== 'pair' && e.type !== 'triple' && e.type !== R.SWAP))) { game.arrow.remove(); game.arrow = null; }
    if (!e.cancelled && (e.type === R.ATTACK || e.type === R.TATTACK)) { if (game.rimLk) { game.rimLk.remove({ mode: 'push', hold: 450 }); game.rimLk = null; } }   // 甩锅：长完、停一下，再推到他面前
    else if (e.cancelled || (e.type !== R.FAVOR && e.type !== R.SWAP && e.type !== 'pair' && e.type !== 'triple')) releaseRim(e.cancelled ? { dull: true } : null);
    const inner = els.stage.querySelector('.zm-stage-inner');
    const lab = inner && inner.querySelector('.zm-stage-label');
    if (lab && game.lastNopes) lab.textContent = e.cancelled ? T('ui.nope.done', '作废了') : T('ui.nope.stands', '照样生效');
    if (e.cancelled) {
      snd('cancel');
      await wait(ms(560));
    } else {
      if (inner) {
        inner.classList.add('is-go');
        const cs = stageCardsEl();
        if (cs) { const r = cs.getBoundingClientRect(); fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, shapes: ['star'], colors: GOLDS, radius: U() * 1.1, size: [6, 16], life: 700 }); }
        snd('activate');
      }
      await wait(ms(game.lastNopes ? 480 : 140));
    }
    if (t !== token) return;
    await sweepStage(t);
    if (t !== token) return;
    if (!e.cancelled && e.type === R.SKIP) await fxSleep(e.seat, t);
  }
  // 舞台上所有牌（连同「不行」）沿弧线扫进弃牌堆，摆成那堆里各自的角度，一张张落下
  async function sweepStage(t) {
    const cs = Array.from(els.stage.querySelectorAll('.zm-stage-inner .zm-card[data-id]'));
    const inner = els.stage.querySelector('.zm-stage-inner');
    const to = discardRect();
    const pu = PU();
    const items = cs.map((c) => ({ id: +c.dataset.id, r: c.getBoundingClientRect(), gray: els.stage.classList.contains('is-cancelled') }));
    if (inner && !fx.reduce()) inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    cs.forEach((c) => { c.style.visibility = 'hidden'; });
    setTimeout(() => { if (t === token) clearStage(true); }, 170);   // 桌沿连线留着：等牌真的拿到 / 给到再缩回
    snd('sweep');
    await Promise.all(items.map((it, i) => fx.fly({
      html: cardHtml(it.id), from: it.r, to, w: pu, s0: it.r.width / pu, s1: 1, r0: 0, r1: pileRot(it.id),
      dur: ms(220), delay: i * ms(40), lift: 6, cls: it.gray ? 'is-gray' : '',
    }).then(() => {
      if (t !== token || !ov) return;
      ov.discard.push(it.id);
      renderPiles();
    })));
  }

  /* 跳过：头像歪头打盹，三个 Z 一个比一个大地往右上飘，一弯小月亮 */
  async function fxSleep(seat, t) {
    snd('snore');
    const a = avPoint(seat), av = avEl(seat);
    if (av && !fx.reduce()) {
      av.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg) translateY(3px)', offset: 0.3 }, { transform: 'rotate(-10deg) translateY(2px)', offset: 0.75 }, { transform: 'rotate(0)' }],
        { duration: ms(1300), easing: 'ease-in-out', composite: 'add' });
    }
    [16, 22, 30].forEach((sz, i) => fx.float(a.x + 18, a.y - 14, 'z', { dx: 34 + i * 12, dy: -46 - i * 14, size: sz, delay: ms(i * 260), dur: ms(1100), rot: 12, color: '#2f4a6d' }));
    await wait(ms(900));
    void t;
  }

  /* 换人：头像外圈红环亮起、往外荡一圈；被推锅时一口黑锅从上家飞过去砸在头像上，「×2」弹出来 */
  async function animTurn(e, t) {
    const prevTurn = ov ? ov.turn : -1;
    if (e.attacked) {
      await atkPots(prevTurn >= 0 ? prevTurn : R.nextAlive(game.state, e.seat), e.seat, e.turnsLeft, t);
    }
    if (e.hot === 'on' && !fx.reduce()) await hotHatOn(e.seat, e.turnsLeft, t);
    if (e.hot === 'off' && !fx.reduce()) await hotHatOff(e.seat, t);
    if (t !== token) return;
    if (ov) { ov.turn = e.seat; ov.turnsLeft = e.turnsLeft; }
    // 被甩锅的人：轮到他的这几回合里一直挂着 ×N（剩最后一回合也挂着 ×1），轮到别人才摘。
    // 百变「烫手」给的那口锅也一样（2026-11-17 用户：×2 摸了一张锅就没了，应该变 ×1）；烫手被换走、锅摘下来（hot: 'off'）就不挂了
    if (e.hot === 'off') game.attackSeat = -1;
    else if (e.attacked || (e.turnsLeft > 1 && e.seat !== game.attackSeat)) game.attackSeat = e.seat;
    else if (e.seat !== game.attackSeat) game.attackSeat = -1;
    renderSeats();
    const a = avPoint(e.seat);
    fx.ring(a.x, a.y, { color: '#b4392c', size: 110, width: 3, dur: 520 });
    fx.pop(avEl(e.seat), { scale: 1.1, dur: 320 });
    if (e.seat === 0 && game.state.alive[0]) snd('turn');
    await wait(ms(e.attacked ? 260 : 140));
  }
  /* ───── 甩锅动画（2026-11-13 用户从三版里挑了甲·锅叠锅）───── */
  const avR = (seat) => { const a = avEl(seat); return a ? a.getBoundingClientRect().width / 2 : 24; };
  const badgePt = (seat) => { const a = avPoint(seat), r = avR(seat); return { x: a.x + r * 1.2, y: a.y + r * 0.7 }; };
  // 一张写着「×N」的小牌子（印章红）
  function tag(text, cls) {
    const el = document.createElement('div');
    el.className = 'zm-stackcount' + (cls ? ' ' + cls : '');
    el.innerHTML = text;
    els.fly.appendChild(el);
    return el;
  }
  const at2 = (x, y, sc, extra) => 'translate(' + (x).toFixed(1) + 'px,' + (y).toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc + ')' + (extra || '');
  /* 锅叠锅：锅砸中之后，一口口小锅从天上掉下来叠在他身上（几回合就几口，越叠越高），叠完一晃，整摞缩进 ×N 角标 */
  async function atkPots(from, to, n, t) {
    await fxPot(from, to, t);
    if (t !== token || fx.reduce()) return;
    // 预览：标记用「扣锅」时，甩锅动画的收尾也换成把锅扣到头上（data-uiv-atk：a 锅叠锅收成一口 / b 一口大锅扣下来 / c 一口口扣上去）
    const hatMode = els.app.dataset.uivTurns === 'hat' ? (els.app.dataset.uivAtk || 'a') : '';
    if (hatMode === 'b') return atkHatSlam(to, n, t);
    if (hatMode === 'c') return atkHatStack(to, n, t);
    const a = avPoint(to), r = avR(to), up = a.y > innerHeight / 2;   // 我在下面：往上叠；对手在上面：叠在头像下方
    const P = Math.max(18, Math.min(28, r * 0.9)), step = P * 0.48;
    const baseY = up ? a.y - r - P * 0.35 : a.y + r + P * 0.35 + (n - 1) * step;
    const tower = document.createElement('div');
    tower.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;';
    els.fly.appendChild(tower);
    const pots = [];
    for (let i = 0; i < n; i++) {
      if (t !== token) { tower.remove(); return; }
      const p = document.createElement('div');
      p.className = 'zm-prop';
      p.innerHTML = ART.PROPS.pot;
      p.style.width = p.style.height = P + 'px';
      tower.appendChild(p);
      pots.push(p);
      const y = baseY - i * step, rot = (i % 2 ? 6 : -6);
      p.animate([{ transform: fx.T(a.x - P / 2 + (i % 2 ? 3 : -3), y - P / 2 - 90, 0.8, rot * 3), opacity: 0 }, { transform: fx.T(a.x - P / 2, y - P / 2 + 3, 1.05, rot), opacity: 1, offset: 0.75 }, { transform: fx.T(a.x - P / 2, y - P / 2, 1, rot), opacity: 1 }],
        { duration: ms(220), easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
      setTimeout(() => { if (t === token) { snd(i === n - 1 ? 'clang' : 'tick'); fx.shake(seatEl(to), { amp: 2 + i * 0.6, dur: 160 }); } }, ms(170));
      await wait(ms(i < 2 ? 150 : 110));
    }
    await wait(ms(200));
    const lab = tag('<span class="x">×</span><b>' + n + '</b>');
    const lx = a.x + P / 2 + 20, ly = up ? baseY - (n - 1) * step / 2 : baseY - (n - 1) * step / 2;
    lab.animate([{ transform: at2(Math.min(innerWidth - 40, lx), ly, 0.3), opacity: 0 }, { transform: at2(Math.min(innerWidth - 40, lx), ly, 1.15), opacity: 1, offset: 0.6 }, { transform: at2(Math.min(innerWidth - 40, lx), ly, 1), opacity: 1 }], { duration: 260, fill: 'forwards' });
    snd('stamp');
    // 整摞晃两下
    tower.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }], { duration: ms(520), easing: 'ease-in-out' });
    tower.style.transformOrigin = a.x + 'px ' + baseY + 'px';
    await wait(ms(620));
    if (t !== token) { tower.remove(); lab.remove(); return; }
    if (hatMode === 'a') {
      // 整摞飞到头顶、翻过来，叠成一口扣在头上；×N 跟着飞到锅肚上
      const hb = hatBox(to);
      pots.forEach((p, i) => {
        const last = i === pots.length - 1;
        p.animate([{ opacity: 1 }, { transform: 'translate(' + (hb.x - P / 2).toFixed(1) + 'px,' + (hb.y - P / 2).toFixed(1) + 'px) rotate(168deg) scale(' + (hb.w / P).toFixed(3) + ')', opacity: last ? 1 : 0 }],
          { duration: ms(340), delay: (pots.length - 1 - i) * 30, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' });
      });
      lab.animate([{ transform: at2(Math.min(innerWidth - 40, lx), ly, 1), opacity: 1 }, { transform: at2(hb.x, hb.y - hb.w * 0.12, 0.62), opacity: 1 }], { duration: ms(340), easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' });
      await wait(ms(360) + pots.length * 30);
      if (t !== token) { tower.remove(); lab.remove(); return; }
      snd('clang');
      hatImpact(to);
      await wait(ms(160));
      game.hatLand = to;
      tower.remove(); lab.remove();
      return;
    }
    const bp = badgePt(to);
    pots.forEach((p, i) => p.animate([{ opacity: 1 }, { transform: fx.T(bp.x - P / 2, bp.y - P / 2, 0.2, 0), opacity: 0 }], { duration: ms(260), delay: i * 25, easing: 'ease-in', fill: 'forwards' }));
    await lab.animate([{ transform: at2(Math.min(innerWidth - 40, lx), ly, 1), opacity: 1 }, { transform: at2(bp.x, bp.y, 0.3), opacity: 0 }], { duration: ms(300), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    tower.remove(); lab.remove();
  }
  /* ───── 预览：扣锅版甩锅动画（data-uiv-turns="hat" 时才走）───── */
  // 头上那口锅的位置和大小（和 CSS .zm-pm-hat 一致：头像宽的 76%，偏左、往上探 30%）
  /* 头上那口锅最后停在哪（和 CSS 的 .zm-pm-hat 一模一样：left 4% / top -30% / 宽 76%，绕自身 (50%, 70%) 转 -12°）。
   * 2026-11-14 用户：甩锅动画落定的位置和锅最后停的位置差一点。原因：以前按头像当下的屏幕框量，动画开始那一刻头像正在「弹一下」
   * （缩到 42px 左右），量出来的锅偏小偏高；另外 CSS 绕 (50%, 70%) 转、飞的锅绕中心转，中心又差一点点。
   * 现在按排版尺寸（不受动画缩放影响）算，再把转轴的差补上 */
  const HAT_SIN = Math.sin(12 * Math.PI / 180), HAT_COS = Math.cos(12 * Math.PI / 180);
  const hatBox = (seat) => {
    // 位置用头像在屏幕上的中心（「弹一下」是绕中心缩放，中心不动）；大小用排版尺寸（不受缩放影响，也没有取整误差）
    const av = avEl(seat), r = av.getBoundingClientRect(), W = av.offsetWidth, H = av.offsetHeight;
    const L = r.left + r.width / 2 - W / 2, TP = r.top + r.height / 2 - H / 2;
    const w = W * 0.76;
    return { x: L + W * 0.04 + w / 2 - 0.2 * w * HAT_SIN, y: TP - H * 0.30 + w / 2 + 0.2 * w * (1 - HAT_COS), w };
  };
  const hatT = (x, y, w, size, rot, flip) => 'translate(' + (x - size / 2).toFixed(1) + 'px,' + (y - size / 2).toFixed(1) + 'px) rotate(' + rot + 'deg) scale(' + (w / size).toFixed(3) + ',' + ((flip ? -1 : 1) * w / size).toFixed(3) + ')';
  function flyPot(size) { const p = document.createElement('div'); p.className = 'zm-prop zm-prop-hat'; p.innerHTML = ART.PROPS.pot; p.style.width = p.style.height = size + 'px'; els.fly.appendChild(p); return p; }
  function hatLabel(hb) { const el = document.createElement('div'); el.className = 'zm-hat-lab'; el.style.fontSize = Math.max(9, hb.w * 0.36).toFixed(1) + 'px'; els.fly.appendChild(el); return el; }
  function hatImpact(seat) {
    const av = avEl(seat); if (!av) return;
    av.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,0.86)', offset: 0.3 }, { transform: 'scale(0.97,1.04)', offset: 0.65 }, { transform: 'scale(1,1)' }], { duration: ms(360), easing: 'ease-out' });
    fx.shake(seatEl(seat), { amp: 4, dur: 260 });
    const hb = hatBox(seat);
    fx.burst(hb.x, hb.y + hb.w * 0.25, { n: 8, shapes: ['dot', 'star'], colors: ['#c9a96e', '#8a8178', '#e2b85c'], radius: hb.w * 0.9, size: [4, 8], life: 520 });
  }
  // b 一口大锅扣下来：锅在头顶上空翻个面，「哐」地扣下去缩成帽子，×1 ×2 … 一路数到 ×N
  async function atkHatSlam(to, n, t) {
    const hb = hatBox(to), S = Math.max(56, hb.w * 2.2);
    // 在头顶上空翻面：对手在最上面一排时上面没多少地方，别探出屏幕
    const up = Math.max(30, Math.min(84, hb.y - S / 2 - 6));
    const p = flyPot(S);
    p.animate([{ transform: hatT(hb.x, hb.y - up + 10, S * 0.7, S, -20, false), opacity: 0 }, { transform: hatT(hb.x, hb.y - up + 4, S, S, 0, false), opacity: 1, offset: 0.35 },
      { transform: hatT(hb.x, hb.y - up, S, S, 8, true), opacity: 1 }], { duration: ms(380), easing: 'ease-out', fill: 'forwards' });
    await wait(ms(420));
    if (t !== token) { p.remove(); return; }
    await p.animate([{ transform: hatT(hb.x, hb.y - up, S, S, 8, true) }, { transform: hatT(hb.x, hb.y, hb.w, S, -12, true) }], { duration: ms(170), easing: 'cubic-bezier(.6,0,1,.6)', fill: 'forwards' }).finished.catch(() => {});
    if (t !== token) { p.remove(); return; }
    snd('clang'); hatImpact(to);
    const lab = hatLabel(hb);
    for (let i = 1; i <= n; i++) {
      lab.textContent = '×' + i;
      lab.animate([{ transform: at2(hb.x, hb.y - hb.w * 0.12, 1.6), opacity: 0.4 }, { transform: at2(hb.x, hb.y - hb.w * 0.12, 1), opacity: 1 }], { duration: ms(160), easing: 'ease-out', fill: 'forwards' });
      if (i > 1) snd('tick');
      await wait(ms(i === 1 ? 220 : 150));
      if (t !== token) { p.remove(); lab.remove(); return; }
    }
    snd('stamp');
    await wait(ms(260));
    game.hatLand = to;
    p.remove(); lab.remove();
  }
  /* 百变「烫手」（2026-11-16 用户）：抽到烫手时，这口锅从桌上那张百变规则牌里飞出来，在头顶上空翻个面、「哐」地扣到当前那个人头上（×2）；
   * 换成别的规则时，这口锅从他头上掀起来、飞回规则牌里收掉——不再凭空出现 / 凭空消失 */
  const fluxPoint = () => { const el = document.getElementById('zmFlux'), r = (el || els.center).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, el }; };
  async function hotHatOn(to, n, t) {
    const hb = hatBox(to), S = Math.max(56, hb.w * 2.2), f = fluxPoint();
    const up = Math.max(30, Math.min(84, hb.y - S / 2 - 6));
    if (f.el) fx.pop(f.el, { scale: 1.08, dur: 260 });
    fx.burst(f.x, f.y, { n: 10, shapes: ['dot', 'star'], colors: ['#e0893e', '#c8463a', '#f2c14e'], radius: 46, size: [4, 9], life: 520 });
    snd('whoosh');
    const p = flyPot(S);
    await p.animate([
      { transform: hatT(f.x, f.y, S * 0.28, S, 0, false), opacity: 0 },
      { transform: hatT(f.x, f.y - 24, S * 0.55, S, -10, false), opacity: 1, offset: 0.22 },
      { transform: hatT(hb.x, hb.y - up, S, S, 8, true), opacity: 1 },
    ], { duration: ms(560), easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }).finished.catch(() => {});
    if (t !== token) { p.remove(); return; }
    await p.animate([{ transform: hatT(hb.x, hb.y - up, S, S, 8, true) }, { transform: hatT(hb.x, hb.y, hb.w, S, -12, true) }], { duration: ms(170), easing: 'cubic-bezier(.6,0,1,.6)', fill: 'forwards' }).finished.catch(() => {});
    if (t !== token) { p.remove(); return; }
    snd('clang'); hatImpact(to);
    const lab = hatLabel(hb);
    lab.textContent = '×' + n;
    lab.animate([{ transform: at2(hb.x, hb.y - hb.w * 0.12, 1.6), opacity: 0.4 }, { transform: at2(hb.x, hb.y - hb.w * 0.12, 1), opacity: 1 }], { duration: ms(180), easing: 'ease-out', fill: 'forwards' });
    await wait(ms(260));
    game.hatLand = to;   // 头上那口锅直接摆上，不再从天上掉一次
    p.remove(); lab.remove();
  }
  async function hotHatOff(from, t) {
    const av = avEl(from), m = av && av.querySelector('.zm-pm-hat');
    if (!m) return;
    const hb = hatBox(from), S = Math.max(40, hb.w * 1.6), f = fluxPoint();
    m.remove();   // 头上那口换成飞的那口（别再演「被掀飞」那段）
    const p = flyPot(S);
    p.animate([{ transform: hatT(hb.x, hb.y, hb.w, S, -12, true) }], { duration: 1, fill: 'forwards' });
    snd('whoosh');
    await p.animate([
      { transform: hatT(hb.x, hb.y, hb.w, S, -12, true), opacity: 1 },
      { transform: hatT(hb.x + 6, hb.y - 22, hb.w * 1.05, S, 6, true), opacity: 1, offset: 0.25 },
      { transform: hatT(f.x, f.y, S * 0.25, S, 40, false), opacity: 0 },
    ], { duration: ms(560), easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    p.remove();
    if (t !== token) return;
    if (f.el) fx.pop(f.el, { scale: 1.06, dur: 240 });
    fx.burst(f.x, f.y, { n: 8, shapes: ['dot'], colors: ['#a89a8a', '#d9cfbf'], radius: 34, size: [3, 7], life: 420 });
  }
  // c 一口口扣上去：几回合就几口锅倒扣着从天上掉下来，一口叠一口摞在头上，数字跟着涨；叠完「噗」地压成一口
  async function atkHatStack(to, n, t) {
    const hb = hatBox(to), S = hb.w, gap = hb.w * 0.34;
    const pots = [], lab = hatLabel(hb);
    lab.style.opacity = '0';
    for (let i = 0; i < n; i++) {
      const p = flyPot(S), y = hb.y - i * gap, rot = -12 + (i % 2 ? 7 : -5);
      pots.push(p);
      p.animate([{ transform: hatT(hb.x + (i % 2 ? 6 : -6), y - 80, S, S, rot - 25, true), opacity: 0 }, { transform: hatT(hb.x, y + 2, S, S, rot, true), opacity: 1, offset: 0.8 }, { transform: hatT(hb.x, y, S, S, rot, true), opacity: 1 }],
        { duration: ms(240), easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
      await wait(ms(200));
      if (t !== token) { pots.forEach((q) => q.remove()); lab.remove(); return; }
      snd(i === n - 1 ? 'clang' : 'tick');
      fx.shake(seatEl(to), { amp: 2 + i * 0.7, dur: 150 });
      lab.textContent = '×' + (i + 1);
      lab.animate([{ transform: at2(hb.x, y - hb.w * 0.12, 1.5), opacity: 0.3 }, { transform: at2(hb.x, y - hb.w * 0.12, 1), opacity: 1 }], { duration: ms(150), easing: 'ease-out', fill: 'forwards' });
      await wait(ms(i < 2 ? 140 : 100));
    }
    await wait(ms(260));
    if (t !== token) { pots.forEach((q) => q.remove()); lab.remove(); return; }
    // 压扁成一口：上面的往下合并
    pots.forEach((p, i) => { if (i) p.animate([{ opacity: 1 }, { transform: hatT(hb.x, hb.y, S, S, -12, true), opacity: 0 }], { duration: ms(220), delay: (n - 1 - i) * 20, easing: 'ease-in', fill: 'forwards' }); });
    pots[0].animate([{ transform: hatT(hb.x, hb.y, S, S, -12, true) }], { duration: 1, fill: 'forwards' });
    lab.animate([{ opacity: 1 }, { transform: at2(hb.x, hb.y - hb.w * 0.12, 1), opacity: 1 }], { duration: ms(220), easing: 'ease-in', fill: 'forwards' });
    await wait(ms(240));
    snd('stamp'); hatImpact(to);
    await wait(ms(200));
    game.hatLand = to;
    pots.forEach((q) => q.remove()); lab.remove();
  }
  async function fxPot(from, to, t) {
    snd('whoosh');
    const a = avPoint(from), b = avPoint(to);
    const S = 64;
    const pot = document.createElement('div');
    pot.className = 'zm-prop';
    pot.innerHTML = ART.PROPS.pot;
    pot.style.width = pot.style.height = S + 'px';
    els.fly.appendChild(pot);
    const N = 12, frames = [];
    const cx = (a.x + b.x) / 2, cy = Math.max(S * 0.6, Math.min(a.y, b.y) - 90);   // 对手都在上面一排：弧顶别飞出屏幕
    for (let k = 0; k <= N; k++) {
      const tt = k / N, u = 1 - tt;
      const x = u * u * a.x + 2 * u * tt * cx + tt * tt * b.x, y = u * u * a.y + 2 * u * tt * cy + tt * tt * b.y;
      frames.push({ transform: fx.T(x - S / 2, y - S / 2, 0.5 + 0.7 * Math.sin(Math.PI * tt * 0.9), -30 + 400 * tt), offset: 0.8 * tt, easing: 'linear' });
      if (k > 0 && k < N && k % 3 === 0) setTimeout(() => { if (t === token) fx.smoke(x, y, { n: 2, spread: 6, size: [18, 30], rise: 20 }); }, ms(700) * 0.8 * tt);
    }
    frames.push({ transform: fx.T(b.x - S / 2, b.y - S / 2 - 50, 0.9, 400), offset: 0.9, easing: 'ease-out' });
    frames.push({ transform: fx.T(b.x - S / 2 + 30, b.y - S / 2 - 30, 0.6, 470), opacity: 0 });
    const anim = pot.animate(frames, { duration: ms(900), fill: 'both' });
    await wait(ms(900) * 0.8);
    if (t !== token) { pot.remove(); return; }
    // 砸中：头像一压一弹、晃，金星四溅
    snd('clang');
    const av = avEl(to);
    if (av && !fx.reduce()) av.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.18,.78)', offset: 0.25 }, { transform: 'scale(.92,1.1)', offset: 0.55 }, { transform: 'scale(1,1)' }], { duration: 420, easing: 'ease-out', composite: 'add' });
    fx.burst(b.x, b.y - 10, { n: 10, shapes: ['star'], colors: GOLDS.concat(['#c0742e']), radius: 60, size: [8, 20], life: 760 });
    fx.shake(seatEl(to), { amp: 5, dur: 360 });
    await anim.finished.catch(() => {});
    pot.remove();
  }

  /* 洗牌：整摞牌被抄起来——牌堆本身（连同厚度、影子）先藏起，一圈牌背从原处飞出、绕着转一圈再收回来，落地时牌堆重新出现、拍一下。
   * 牌堆剩得少就少转几张 */
  async function animShuffle(e, t) {
    snd('shuffle');
    const r = els.deck.getBoundingClientRect(), c = fx.center(r);
    const pu = PU(), n = Math.max(1, Math.min(9, D().deckSize)), R0 = pu * 1.25;
    els.deck.classList.add('is-shuffling');
    fx.smoke(c.x, c.y + pu * 0.4, { n: 5, spread: pu * 0.6, size: [30, 60], rise: 26, alpha: 0.6 });
    const all = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'zm-flyer';
      el.style.width = pu + 'px'; el.style.height = pu * 1.4 + 'px';
      el.innerHTML = backHtml();
      els.fly.appendChild(el);
      const th0 = (i / n) * Math.PI * 2, frames = [];
      const K = 16;
      for (let k = 0; k <= K; k++) {
        const tt = k / K;
        const rr = R0 * Math.sin(Math.PI * tt) * (0.8 + 0.2 * Math.sin(i * 1.7));
        const th = th0 + tt * Math.PI * 2 * (i % 2 ? 1 : -1);
        const x = c.x + Math.cos(th) * rr, y = c.y + Math.sin(th) * rr * 0.6;
        frames.push({ transform: fx.T(x - pu / 2, y - pu * 0.7, 0.9 + 0.15 * Math.sin(Math.PI * tt), (th * 180 / Math.PI) * 0.25 * (1 - tt) + (i - 4) * 2 * Math.sin(Math.PI * tt)), offset: tt });
      }
      all.push(el.animate(frames, { duration: ms(1050), delay: i * 22, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'both' }).finished.then(() => el.remove(), () => el.remove()));
    }
    await Promise.all(all);
    // 透视：洗完牌顶上换了一张——直接翻开新的那张（以前先摆出洗之前那张，过一会儿才换）
    if (ov && ov.topFace != null) ov.topFace = faceTop(game.state);
    els.deck.classList.remove('is-shuffling');
    if (t !== token) return;
    snd('thud');
    fx.pop(els.deck, { scale: 1.06 });
    renderPiles();
  }

  /* 猫眼偷看：我——顶上三张升起、飞到桌中一张张翻开，下面写着第几张；点「知道了」再翻回去、落回牌堆。
   * 别人——三张牌背朝他那边扇形抬起，上面一只大猫眼眨一眨，再放回去 */
  /* 百变「透视」：牌堆顶那张本来就翻着。被窥探 / 改命拿起来时，它保持正面飞起（不再先变牌背再翻），牌堆上暂时不翻任何一张；
   * 放回去时它正面落回（不翻回牌背），落定后牌堆顶照旧翻着它——不再出现「空中一张、牌堆上又翻着同一张」 */
  function liftTopFace() {
    const f = ov && ov.topFace != null ? ov.topFace : null;
    if (f != null) ov.topFace = null;
    return f;
  }
  function restoreTopFace(f) { if (ov && f != null) { ov.topFace = f; game.faceQuiet = f; } }
  async function animFuture(e, t) {
    snd('peek');
    const r = deckTopRect(), pu = PU();
    const tf = liftTopFace();
    const mateSaw = isMate(e.seat);   // 组队：队友窥探到的三张我也看得到
    if (e.cards && (e.seat === 0 || mateSaw) && !glance()) {
      const u = e.cards.length > 3 ? Math.min(POP(), (els.center.getBoundingClientRect().width - 16) / (e.cards.length * 1.12)) : POP();   // 百变「千里眼」看 5 张：排得下
      if (ov) { ov.lifted = (ov.lifted || 0) + e.cards.length; renderPiles(); }   // 拿起来的几张：牌堆看着薄了，数字不变（牌并没被拿走）
      const open0 = (i) => i === 0 && tf != null && tf === e.cards[0];   // 透视：最上面那张一直是正面
      const box = els.center.getBoundingClientRect(), c = fx.center(box);
      const gap = u * 1.12;
      const spots = e.cards.map((_, i) => ({ x: c.x + (i - (e.cards.length - 1) / 2) * gap, y: c.y - u * 0.1 }));
      const nodes = await Promise.all(e.cards.map((id, i) => fx.fly({
        html: rawHtml(id), back: backHtml(), flip: open0(i) ? null : 'up', flipAt: 0.45, from: r, to: spots[i], w: u, s0: pu / u, s1: 1,
        r0: 0, r1: 0, dur: ms(620), delay: i * ms(170), lift: 70, keep: true,
      }).then((n) => { if (n && R.KIND_OF[id] === R.BOOM && t === token) { snd('gasp'); n.classList.add('zm-angry'); fx.burst(spots[i].x, spots[i].y, { n: 12, shapes: ['fur'], colors: FUR, radius: u * 0.9, size: [8, 18], alignOut: true, life: 700, pattern: 'ring' }); } return n; })));
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
      await morphWild(nodes, e.cards, t, ms(260));   // 百搭：先看清本身是哪只猫，再翻成万能猫
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
      // 标签 + 「知道了」
      const labels = [T('ui.pos.top', '最上面'), ...[2, 3, 4, 5].map((n) => T('ui.pos.nth', '第 {n} 张', { n }))];
      // 自己收起的倒计时（2026-11-14 用户：托管打出窥探后没人点「知道了」，整局卡住）：托管 1.8 秒；联机 4 秒（服务器的出牌限时在走）；
      // 单机有出牌限时就 6 秒；单机不限时、自己在打才等我点
      const peekLimit = mateSaw || game.spectator ? 2800 : autopilot ? 1800 : game.online ? 4000 : turnSec() > 0 ? 6000 : 0;
      const lay = document.createElement('div');
      lay.className = 'zm-peek';
      lay.innerHTML = spots.map((p, i) => '<span class="zm-peek-lab" style="left:' + p.x + 'px;top:' + (p.y + u * 0.78) + 'px">' + labels[i] + '</span>').join('') +
        '<button type="button"' + (game.spectator ? ' hidden' : '') + ' class="zm-btn zm-btn-primary zm-peek-ok' + (peekLimit ? ' zm-timed' : '') + '" style="left:' + c.x + 'px;top:' + (c.y + u * 1.12) + 'px">' + (peekLimit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '') + '<b>' + T('ui.gotit', '知道了') + '</b></button>';
      els.fly.appendChild(lay);
      els.fly.classList.add('is-interactive');
      els.app.classList.add('is-peeking');   // 摊开的三张 + 「知道了」会压到牌堆下面的百变规则牌：看的时候先把规则牌淡掉
      await new Promise((res) => {
        const ok = lay.querySelector('.zm-peek-ok');
        ok.focus({ preventScroll: true });
        ok.addEventListener('click', res, { once: true });
        game.peekDone = res;
        if (peekLimit) {
          const bar = ok.querySelector('.zm-dlg-timer i');
          if (bar) bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: peekLimit, easing: 'linear', fill: 'forwards' });
          setTimeout(res, peekLimit / turboK());
        }
      });
      game.peekDone = null;
      els.fly.classList.remove('is-interactive');
      els.app.classList.remove('is-peeking');
      lay.remove();
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
      // 翻回去、倒着落回牌堆
      await Promise.all(nodes.map((n, i) => {
        if (!n) return null;
        n.remove();
        const id = e.cards[i];
        return fx.fly({ html: cardHtml(id), back: backHtml(), flip: open0(i) ? null : 'down', flipAt: 0.05, from: spots[i], to: deckTopRect(), w: u, s0: 1, s1: pu / u, dur: ms(480), delay: (e.cards.length - 1 - i) * ms(110), lift: 40 });
      }));
      snd('thud');
      if (ov) ov.lifted -= e.cards.length;
      restoreTopFace(tf);
      renderPiles();
      return;
    }
    // 别人在偷看
    const a = avPoint(e.seat), dc = fx.center(r);
    /* 牌永远在牌堆上方扇开（2026-11-17 用户）：朝偷看那家的方向偏，但不往下——坐到别人背后观战时，偷看的人就是下面那家，以前牌扇到牌堆下面去了 */
    const dir = { x: a.x - dc.x, y: -Math.abs(a.y - dc.y) || -1 }, len = Math.hypot(dir.x, dir.y) || 1;
    const k = Math.max(0, Math.min(3, e.count || D().deckSize));   // 牌堆不到三张就只抬起剩下那几张
    const out = [];
    for (let i = 0; i < k; i++) {
      const fan = (i - (k - 1) / 2);
      const to = { x: dc.x + dir.x / len * pu * 0.9 + fan * pu * 0.42, y: dc.y + dir.y / len * pu * 0.9 - Math.abs(fan) * 4 };
      out.push(fx.fly({ html: i === 0 && tf != null ? cardHtml(tf) : backHtml(), from: r, to, w: pu, s0: 1, s1: 0.86, r0: 0, r1: fan * 14, dur: ms(380), delay: i * ms(60), lift: 20, keep: true, land: false }));
    }
    if (ov && k) { ov.lifted = (ov.lifted || 0) + k; renderPiles(); }
    const nodes = await Promise.all(out);
    if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    const eye = document.createElement('div');
    eye.className = 'zm-prop zm-eye';
    eye.innerHTML = ART.PROPS.eye;
    const S = pu * 1.1;
    eye.style.width = eye.style.height = S + 'px';
    const ep = { x: dc.x + dir.x / len * pu * 0.9, y: dc.y + dir.y / len * pu * 0.9 - pu * 1.05 };
    els.fly.appendChild(eye);
    await fx.animate(eye, [
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 0.2, 0), opacity: 0 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1.1, 0), opacity: 1, offset: 0.18 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.3 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1, 0) + ' scaleY(.08)', opacity: 1, offset: 0.42 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.5 },
      { transform: fx.T(ep.x - S / 2 + 6, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.68 },
      { transform: fx.T(ep.x - S / 2 - 6, ep.y - S / 2, 1, 0), opacity: 1, offset: 0.84 },
      { transform: fx.T(ep.x - S / 2, ep.y - S / 2, 0.6, 0), opacity: 0 },
    ], { duration: ms(1250) }).finished.catch(() => {});
    eye.remove();
    await Promise.all(nodes.map((n, i) => {
      if (!n) return null;
      const rr = n.getBoundingClientRect();
      n.remove();
      return fx.fly({ html: i === 0 && tf != null ? cardHtml(tf) : backHtml(), from: rr, to: deckTopRect(), w: pu, s0: 0.86, s1: 1, r0: (i - (k - 1) / 2) * 14, r1: 0, dur: ms(320), delay: i * ms(50), lift: 10 });
    }));
    if (ov && k) ov.lifted -= k;
    restoreTopFace(tf);
    renderPiles();
  }

  /* 被蹭：粉色箭头还在，等他挑一张 */
  async function animAskGive(e, t, prev) {
    if (game.arrow) game.arrow.remove();
    game.arrow = aim(e.from, '#e0566e');
    // 贪吃猫出的索要：第一次问的时候猫章亮起；被要的人头像旁边冒出两张贪吃猫橙色描边的小牌背（= 要你两张），给一张飞走一张；
    // 第二次问（同一张索要的第二张，2026-11-26 用户：以前看不出是角色技能在要第二张；小圆点太隐晦）：猫章再弹一下、剩下那张小牌背跳一下、
    // 桌沿再漾一道，灯带换成贪吃猫的橙色重连
    const st = game.state, rp = game.rolePop;
    if (st.roles && R.roleOf(st, e.to) === 'fat') {
      game.giveTwo = true;
      const band = (ART.ROLE_TONE.fat || {}).band || '#d27a36';
      if (rp && rp.kind === 'fat' && rp.from === e.from && rp.to === e.to) {
        rp.fl.pulse();
        const last = rp.owe && rp.owe.querySelector('i:not(.is-gone)');
        if (last && !fx.reduce()) last.animate([{ transform: 'rotate(' + last.dataset.r + 'deg)' }, { transform: 'rotate(' + last.dataset.r + 'deg) translateY(-6px) scale(1.35)', offset: 0.4 }, { transform: 'rotate(' + last.dataset.r + 'deg)' }], { duration: ms(460), easing: 'ease-out', iterations: 2 });
        releaseRim();
        game.rimLk = rimLink(e.to, e.from, false, band);
        await wait(ms(480));
      } else {
        const fl = await flashRole(e.to, t, 300);
        if (t !== token) return fl.back();
        const av = avEl(e.from);
        let owe = null;
        if (av) {
          owe = document.createElement('span');
          const ar = av.getBoundingClientRect();
          owe.className = 'zm-owe' + (ar.left + ar.width / 2 > innerWidth * 0.6 ? ' is-left' : '');   // 右半边的头像：小牌背摆左边，别出屏
          owe.style.setProperty('--glow', band);
          owe.innerHTML = '<i data-r="-12" style="transform:rotate(-12deg)"></i><i data-r="10" style="transform:rotate(10deg)"></i>';
          av.appendChild(owe);
          if (!fx.reduce()) owe.querySelectorAll('i').forEach((c, k) => c.animate([{ transform: 'rotate(' + c.dataset.r + 'deg) translateY(10px) scale(.3)', opacity: 0 }, { transform: 'rotate(' + c.dataset.r + 'deg) translateY(-3px) scale(1.15)', opacity: 1, offset: 0.65 }, { transform: 'rotate(' + c.dataset.r + 'deg)', opacity: 1 }], { duration: ms(380), delay: ms(k * 120), easing: 'cubic-bezier(.3,.9,.4,1.2)', fill: 'backwards' }));
        }
        game.rolePop = { kind: 'fat', from: e.from, to: e.to, fl, n: 0, owe };
      }
    } else if (!(prev && prev.t === 'give')) game.giveTwo = false;
    await wait(ms(260));
    void t;
  }
  // 贪吃猫：给到一张，小圆点填实一颗；两张都给了（或对方只剩一张、给完就没了）猫章才缩回
  async function fatGave(e, t) {
    const rp = game.rolePop;
    if (t !== token || !rp || rp.kind !== 'fat') return;
    rp.n += 1;
    const c = rp.owe && rp.owe.querySelector('i:not(.is-gone)');
    if (c) { c.classList.add('is-gone'); c.animate([{ opacity: 1, transform: 'rotate(' + c.dataset.r + 'deg)' }, { opacity: 0, transform: 'rotate(' + c.dataset.r + 'deg) translateY(-8px) scale(.4)' }], { duration: ms(220), fill: 'forwards' }); }
    const s = game.state, more = rp.n < 2 && s.phase === 'give' && s.give && s.give.from === e.from && s.give.to === e.to;
    if (!more && rp.n < 2) {   // 对方只剩一张、给完就空了：剩下那张小牌背抖两下散掉，粉色灯带黯淡着缩回，猫章耷拉一下（要不到第二张，有点失落）
      const c2 = rp.owe && rp.owe.querySelector('i:not(.is-gone)');
      await wait(ms(260));
      if (c2 && !fx.reduce()) await c2.animate([{ transform: 'rotate(' + c2.dataset.r + 'deg)', opacity: 1 }, { transform: 'rotate(' + c2.dataset.r + 'deg) translateX(-3px)', offset: 0.2 }, { transform: 'rotate(' + c2.dataset.r + 'deg) translateX(3px)', offset: 0.4 }, { transform: 'rotate(' + c2.dataset.r + 'deg) translateX(-2px)', opacity: 0.8, offset: 0.6 }, { transform: 'rotate(' + c2.dataset.r + 'deg) translateY(6px) scale(.5)', opacity: 0 }], { duration: ms(620), fill: 'forwards' }).finished.catch(() => {});
      if (t !== token || game.rolePop !== rp) return;
      releaseRim({ dull: true });
      game.rolePop = null;
      if (rp.owe) rp.owe.remove();
      await rp.fl.back({ sad: true });
      return;
    }
    if (!more) { await wait(ms(320)); if (game.rolePop === rp) rolePopDone(); }
  }
  /* 截胡猫作废成功、可被作废的那人手里已经没牌（2026-11-26 用户：要表现出想顺没顺到）：猫章亮、紫色灯带照样连过去、
   * 猫爪伸过去扑了个空（在他头像上抓两下、什么都没叼到）缩回来，灯带黯淡着收回，猫章耷拉一下 */
  async function tabbyMiss(e, t) {
    const st = game.state, ns = game.nopeSeats || [], d = D();
    game.nopeSeats = [];
    for (let i = 0; i < ns.length; i++) {
      const nx = ns[i];
      if (R.roleOf(st, nx) !== 'tabby' || t !== token) continue;
      const won = i % 2 === 0 ? e.cancelled : !e.cancelled, victim = i === 0 ? e.seat : ns[i - 1];
      if (!won || victim === nx || victim < 0 || !(d.alive ? d.alive[victim] : true) || (d.counts && d.counts[victim] > 0)) continue;
      const fl = await flashRole(nx, t, 200);
      if (t !== token) return fl.back();
      releaseRim();
      game.rimLk = rimLink(nx, victim, false, (ART.ROLE_TONE.tabby || {}).band || '#6a4f86');
      await wait(ms(420));
      if (t !== token) return fl.back();
      if (!fx.reduce()) {
        const a = avPoint(nx), b = avPoint(victim), S = 54;
        const paw = document.createElement('div');
        paw.className = 'zm-prop zm-paw';
        paw.innerHTML = window.ZhamaoFx.SHAPES.paw;
        paw.style.width = paw.style.height = S + 'px';
        els.fly.appendChild(paw);
        const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
        snd('swipe');
        await fx.animate(paw, [
          { transform: fx.T(a.x - S / 2, a.y - S / 2, 0.3, ang), opacity: 0 },
          { transform: fx.T(a.x - S / 2, a.y - S / 2, 1, ang), opacity: 1, offset: 0.12 },
          { transform: fx.T(b.x - S / 2, b.y - S / 2 - 12, 1.1, ang - 18), opacity: 1, offset: 0.4, easing: 'cubic-bezier(.5,0,.8,.4)' },
          { transform: fx.T(b.x - S / 2 - 8, b.y - S / 2, 1, ang + 22), opacity: 1, offset: 0.52 },
          { transform: fx.T(b.x - S / 2 + 8, b.y - S / 2, 1, ang - 22), opacity: 1, offset: 0.64 },
          { transform: fx.T(b.x - S / 2, b.y - S / 2 + 4, 0.9, ang), opacity: 1, offset: 0.74 },
          { transform: fx.T(a.x - S / 2, a.y - S / 2, 0.5, ang), opacity: 0 },
        ], { duration: ms(1300), easing: 'ease-in-out' }).finished.catch(() => {});
        paw.remove();
      }
      releaseRim({ dull: true });
      await fl.back({ sad: true });
    }
  }


  /* 给 / 偷来的牌在两人之间飞：我参与的那一方看得到正面（从我手里出去的从原位起飞，进我手里的半路翻开）；
   * 「蹭一张」一路冒小心心 */
  async function animTransfer(e, t, kind) {
    seatEl(e.from).querySelectorAll('.zm-bubble').forEach((b) => b.remove());
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    const mine = e.card != null && (e.from === 0 || e.to === 0);
    const src = e.from === 0 ? (game.src && game.src[e.card]) || handRectOf(e.card) : (kind === 'steal' && game.stealFrom) || avPoint(e.from);
    game.stealFrom = null;
    if (game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    if (e.from === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.from] -= 1; renderSeat(e.from); }
    const u = e.from === 0 || e.to === 0 ? HU() : U();
    let to = avPoint(e.to);
    if (e.to === 0) to = aboveSlot(reserveHandSlot(e.card));
    snd(kind === 'give' ? 'give' : 'steal');
    releaseRim();   // 牌开始飞了：桌沿那截从被指的人那头缩回出牌人
    if (kind === 'give' && !fx.reduce()) {
      const a = e.from === 0 ? fx.center(src) : src, b = e.to === 0 ? fx.center(to) : to;
      for (let i = 1; i <= 4; i++) {
        const tt = i / 5;
        setTimeout(() => { if (t === token) fx.float(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt - Math.sin(Math.PI * tt) * 60, 'heart', { dy: -30, size: 14 + i * 2, color: PINKS[i % 3], dur: 800 }); }, ms(520) * tt);
      }
    }
    await fx.fly({
      html: mine ? cardHtml(e.card) : backHtml(), back: backHtml(),
      flip: mine ? (e.from === 0 ? (e.to === 0 ? null : 'down') : 'up') : null, flipAt: e.from === 0 ? 0.5 : 0.2,
      from: src, to, w: u, s0: e.from === 0 ? 1 : 0.4, s1: e.to === 0 ? 1 : 0.4, fadeOut: e.to !== 0,
      dur: ms(600), lift: 80, r0: -8, r1: 0,
    });
    if (t !== token) return;
    if (e.to === 0) revealHandCard(e.card, to); else { ov.counts[e.to] += 1; renderSeat(e.to); fx.pop(avEl(e.to), { scale: 1.15 }); }
    markVictim(-1);
    await wait(ms(220));
  }

  /* ───── 抽牌：一道红光在被抽的人的牌之间游走 ─────
   * 被抽的是我：在我自己的手牌上游走（我看得到被抽走的是哪张）；被抽的是别人：他头像下面摊开一小扇扣着的牌，在上面游走。
   * settle(pick) 随时可以叫——机器猫想好了 / 联机里对方点了 / 超时系统替他点了：再随机跳几下、落到选中那张、亮一下；
   * 选得早就早落（不白等）。这套机制联机直接复用：收到对方的选择就 settle。 */
  /* 偷牌时被偷那家的手牌扇摆哪（2026-11-22 重新统一，规则全文见 docs/puffcat-steal-fan.md）：
   * 扇子永远横着摊（不转 90°——用户：竖着摊太丑），形状就是原来那把（fanGeom，1–9 张一点没变）。
   * 摆法按顺序试，挑第一个「什么都不压、一眼看得出是他的」位置：
   *   ① 他名字正下方（可往桌心那侧错开）；② 头上（用户：放他头像下面，放不下放上面）；③ 头像朝桌心那一侧，再不行另一侧。
   *   原大放不下先试 0.92 / 0.85（每档先把牌叠紧一点），最后才缩到 0.78（再小用户嫌丑）。
   *   牌堆的位置写死，不管偷谁都不挪（用户 2026-11-23：别因为抽了不同的人就让牌堆跟着动）。
   * 「不压」= 摸牌那摞（连牌数那行）、百变规则牌、别人的头像 / 名字 / 角标、我的手牌和按钮、顶栏，以及他自己的头像和名字——
   *   被点中那张会往上冒 16px，冒起来也不能碰到。弃牌堆可以压一点（算软障碍）。
   * 「看得出是他的」= 扇子正中离他比离任何别人都近、且不贴着别人（边上离邻座近不算：顶排人挤时扇子本来就比座位间距宽）。
   * （用户否过「搬到桌心」「整桌蒙遮罩」「竖着摊」，别再往那边改） */
  const FAN_POP = 16;   // 被点中那张往上冒多少（和 CSS .zm-steal-card.is-chosen 一致）
  const FAN_K = [1, 0.92, 0.85, 0.78];
  // 第 off 张牌（off = i − (n−1)/2）的中心相对「中间那张上沿正中」往右 x、往下 y。
  // 9 张以内：横向等距、往下按 |off| 沉（和线上原来那把一模一样）。
  // 10 张起（用户 11-24：牌多了成 V 字、不像弧）：两头下沉改成抛物线 y = D·(off/offMax)²，看着是一条顺的弧；
  //   D = 半宽 × tan(最外那张的角度)，和牌少时那把的弯度差不多，封顶 11px。
  function fanPos(G, off) { return { x: off * G.step, y: G.arc ? G.arc * (off / G.om) * (off / G.om) : Math.abs(off) * G.drop }; }
  function fanGeom(count, w, q) {
    const n = Math.max(1, count);
    // 13 张起牌缝别挤到 3px 以下
    const step = w * Math.max(Math.min(0.5, 2.6 / n), n >= 13 ? 0.15 : 0) * q, ang = Math.min(8, 30 / n) * (0.6 + 0.4 * q), drop = 2.5;
    const om = (n - 1) / 2, arc = n >= 10 ? Math.min(11, om * step * Math.tan(om * ang * Math.PI / 180)) : 0;
    const h = w * 1.4, G = { w, h, step, ang, drop, arc, om };
    let l = 0, r = 0, b = 0;
    for (let i = 0; i < n; i++) {   // 每张牌转完以后的外接框（相对容器原点：中间那张的上沿正中）
      const off = i - om, a = Math.abs(off * ang) * Math.PI / 180, P = fanPos(G, off), cx = P.x, cy = P.y + h / 2;
      const hx = (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), hy = (w / 2) * Math.sin(a) + (h / 2) * Math.cos(a);
      l = Math.min(l, cx - hx); r = Math.max(r, cx + hx); b = Math.max(b, cy + hy);
    }
    G.half = Math.max(-l, r); G.fh = b;
    return G;
  }
  // 扇子里每张牌（摆在 cx / top 时）的外接框；冒起来的样子 = 往上挪 FAN_POP
  function fanRects(G, count, cx, top) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const off = i - (count - 1) / 2, a = Math.abs(off * G.ang) * Math.PI / 180, P = fanPos(G, off), x = cx + P.x, y = top + P.y + G.h / 2;
      const hx = (G.w / 2) * Math.cos(a) + (G.h / 2) * Math.sin(a), hy = (G.w / 2) * Math.sin(a) + (G.h / 2) * Math.cos(a);
      out.push({ l: x - hx, r: x + hx, t: y - hy, b: y + hy });
    }
    return out;
  }
  function fanSpot(seat, count, dbg) {
    const box = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    const join = (rs) => rs.reduce((a, r) => (a ? { l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) } : r), null);
    const okR = (r) => r && r.r - r.l > 1 && r.b - r.t > 1;
    const grow = (r, d) => ({ l: r.l - d, t: r.t - d, r: r.r + d, b: r.b + d });
    // 一个座位看得见的部分：头像、名字、手牌数 / 扣锅 / 档位角标（气泡不算）
    const partsOf = (s) => { const a = s.querySelector('.zm-av'); return [a].concat(Array.from(s.children), a ? Array.from(a.children) : []).filter((e) => e && !e.classList.contains('zm-bubble') && !e.classList.contains('zm-clock')).map(box).filter(okR); };
    const deep = (root) => (root ? join([root].concat(Array.from(root.querySelectorAll('*'))).map(box).filter(okR)) : null);   // 牌堆那摞纸边画在容器外面，按里面每一层的实际范围算
    const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
    const gap = (a, b) => Math.hypot(Math.max(0, b.l - a.r, a.l - b.r), Math.max(0, b.t - a.b, a.t - b.b));
    const se = seatEl(seat), A = box(avEl(seat)), mine = partsOf(se), S = join(mine);
    const others = allSeatEls().concat([els.me]).filter((b) => +b.dataset.seat !== seat && b.querySelector('.zm-av')).map(partsOf).filter((p) => p.length);
    const otherBox = others.map(join);
    // 摸牌那摞先当硬的（实在放不下时可以暂时压住，见下面）；牌数那行永远是硬的；弃牌堆是软的（可以压一点）
    const fluxEl = document.getElementById('zmFlux');
    const pile = [deep(els.deck)].filter(okR);
    const hard = [box(els.table.querySelector('.zm-deck-info') || els.deck)].filter(okR);
    // 百变规则现在是铺满桌面的淡水印（#zmFlux 整层），不算障碍；只有下面那行规则名大字算软的（压一点没关系）
    const soft = [deep(els.discard)].concat(fluxEl ? Array.from(fluxEl.querySelectorAll('.wm-name')).map(box) : []).filter(okR);
    hard.push(...[els.hand, els.drawBtn, els.playBtn, els.table.querySelector('.zm-tools'), els.table.querySelector('.zm-topleft')].filter(Boolean).map(box).filter(okR)
      .concat(others.flat().map((r) => grow(r, 2))));
    const tb = box(els.table), fr = { l: tb.l + 10, r: tb.r - 10, t: tb.t + 8, b: tb.b - 8 };
    // 他坐哪条边：左 / 右边上的人「朝桌心」是横着朝里，顶边的人是往下
    const tcx = (tb.l + tb.r) / 2, acx = (A.l + A.r) / 2, acy = (A.t + A.b) / 2, scx = (S.l + S.r) / 2;
    const side = Math.abs(acx - tcx) > (tb.r - tb.l) * 0.28 ? (acx < tcx ? 1 : -1) : 0;   // 1 = 左边那家（桌心在他右边）
    const tryAt = (ks, pileCost, only, fMax = 9) => {
      let best = null;
      for (const k of ks) for (const q of [1, 0.8]) {
        const G = fanGeom(count, U() * 0.92 * 0.6 * k, q), half = G.half, fh = G.fh;
        const cand = [];
        // ① 名字正下方：顶着名字往下排（留出冒起来的 16px），可往桌心那侧错开
        // 顶边的人最多错开 ¼ 个半宽（用户 11-24：错开半把以上看着就不在他正下方了，宁可压牌堆也要对齐）
        for (const gapY of [FAN_POP + 3, 8, 32, 48, 64, 80]) for (const f of (side ? [0, 0.25, 0.5, 0.75, 1, -0.25, -0.5] : [0, 0.25, -0.25])) {
          const dx = (side ? side : (acx < tcx ? 1 : -1)) * f * half;
          cand.push({ cx: scx + dx, top: S.b + gapY, kind: 'below', f, pen: Math.abs(f) * 40 + Math.max(0, gapY - FAN_POP - 3) * 2 });
        }
        // ② 头上（用户：放他头像下面，放不下放上面）：扇子底离头像（连角标）顶 6px，可左右错开
        for (const f of [0, 0.25, 0.5, -0.25, -0.5]) cand.push({ cx: scx + (side || 1) * f * half, top: S.t - 6 - fh, kind: 'above', f, pen: 60 + Math.abs(f) * 40 });
        // ③ 头像旁边（朝桌心那侧优先）：和头像中线对齐，可上下挪
        for (const dir of [side || 1, -(side || 1)]) for (const f of [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75, 1]) {
          const cx = dir > 0 ? Math.max(A.r, S.r) + 6 + half : Math.min(A.l, S.l) - 6 - half;
          cand.push({ cx, top: acy - fh / 2 + f * fh, kind: dir === side ? 'inward' : 'beside', f, pen: (dir === side ? 110 : 170) + Math.abs(f) * 40 });
        }
        for (const c of cand) {
          if ((only && c.kind !== only) || Math.abs(c.f) > fMax) continue;
          c.cx = Math.min(Math.max(c.cx, fr.l + half), fr.r - half);
          const rs = fanRects(G, count, c.cx, c.top);
          const body = join(rs), up = rs.map((r) => ({ l: r.l, r: r.r, t: r.t - FAN_POP, b: r.b }));   // 连冒起来的那一截一起算
          let bad = 0, softHit = 0, pileHit = 0;
          for (const r of up) {
            for (const o of hard) bad += ov(r, o);
            for (const o of pile) pileHit += ov(r, o);
            for (const o of mine) bad += ov(r, o);
            for (const o of soft) softHit += ov(r, o);
            bad += (r.r - r.l) * (r.b - r.t) - ov(r, fr);   // 出框
          }
          // 看得出是他的：扇子正中离他（头像 + 名字那一团的中心）比离任何别人都近，且不贴着别人（4px 内）。
          // 只是边上离邻座近（顶排人挤、扇子比座位间距宽）不算——正对着他摊开一眼就是他的；但能离远点就离远点（near）
          const own = gap(body, S), fc = [(body.l + body.r) / 2, (body.t + body.b) / 2], cd = (o) => Math.hypot((o.l + o.r) / 2 - fc[0], (o.t + o.b) / 2 - fc[1]);
          const ownC = cd(S), foreign = otherBox.some((o) => cd(o) < ownC + 8 || gap(body, o) < 4), near = otherBox.some((o) => gap(body, o) < own + 4);
          if (pileCost) softHit += pileHit * pileCost / 0.25; else bad += pileHit;
          c.score = (bad > 2 ? 6000 + bad * 4 : 0) + (foreign ? 3000 : 0) + (near ? 150 : 0) + softHit * 0.25 + own * 3 + c.pen + (1 - k) * 2600 + (1 - q) * 500;
          c.G = G; c.k = k; c.q = q; c.body = body; c.bad = bad; c.foreign = foreign; c.pileHit = pileHit;
          if (dbg) dbg.push({ k, q, kind: c.kind, cx: Math.round(c.cx), top: Math.round(c.top), pileHit: Math.round(pileHit), bad: Math.round(bad), soft: Math.round(softHit), d: Math.round(own), foreign, score: Math.round(c.score) });
          if (!best || c.score < best.score) best = c;
        }
        if (best && best.score < 1000 && best.k === k) break;   // 这一档（这么大）已经有好位置了：不再往小里试
      }
      return best;
    };
    const clean = (c) => c && c.score < 1000;
    // 原大 → 0.92 → 0.85 找一个什么都不压的位置
    let best = tryAt([1, 0.92, 0.85]);
    if (clean(best)) return best;
    // 放不下（2026-11-24 用户定甲）：贴着他头像朝桌心摊开（左右两边的人横着朝里，顶边的人往下），原大到 0.85，
    // 暂时压在摸牌那摞上——牌堆不挪，偷完扇子就收。牌数那行、别人的座位照样不压。
    // 压牌堆时扇子要正对着他（用户 11-24：横屏顶边那家扇子往旁边错开，看着没对齐）：顶边的人正下方不错开，左右两边的人上下最多错开 ¼ 个扇高
    const inward = tryAt([1, 0.92, 0.85], 0.04, side ? 'inward' : 'below', side ? 0.25 : 0);
    if (inward && inward.bad <= 2 && !inward.foreign) return inward;
    // 朝桌心那边也被挡死了（极少）：哪儿都试、可以压牌堆，最后才缩到 0.78
    const any = tryAt([1, 0.92, 0.85, 0.78], 0.04);
    return [best, inward, any].filter(Boolean).sort((a, b) => a.score - b.score)[0];
  }
  function startWander(fromSeat, count) {
    let fan = null, cur = -1, timer = 0, done = false;
    markVictim(fromSeat);
    if (fromSeat !== 0 && avEl(fromSeat)) {
      const spot = fanSpot(fromSeat, count), G = spot.G;
      fan = document.createElement('div');
      fan.className = 'zm-steal-fan';
      fan.style.left = spot.cx + 'px';
      fan.style.top = spot.top + 'px';
      for (let i = 0; i < count; i++) {
        const off = i - (count - 1) / 2;
        const c = document.createElement('div');
        c.className = 'zm-steal-card';
        c.style.width = G.w + 'px';
        const P = fanPos(G, off);
        c.style.left = (-G.w / 2 + P.x) + 'px';
        c.style.top = P.y + 'px';
        c.style.rotate = (off * G.ang) + 'deg';
        c.innerHTML = backHtml();
        fan.appendChild(c);
      }
      els.fly.appendChild(fan);
      if (!fx.reduce()) {   // 从他头像那边弹出来
        const a = fx.center(avEl(fromSeat).getBoundingClientRect()), dx = (a.x - spot.cx) * 0.35, dy = (a.y - spot.top - G.fh / 2) * 0.35;
        fan.animate([{ opacity: 0, transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
      }
    }
    const items = () => (fromSeat === 0 ? Array.from(els.hand.querySelectorAll('.zm-card')) : fan ? Array.from(fan.children) : []);
    const mark = (i) => { items().forEach((x, j) => x.classList.toggle('is-wander', j === i)); cur = i; };
    const hop = (sound) => {
      const arr = items();
      if (!arr.length) return;
      let j = (Math.random() * arr.length) | 0;
      if (arr.length > 1 && j === cur) j = (j + 1) % arr.length;
      mark(j);
      if (sound) snd('tick');
    };
    const single = count <= 1;   // 只剩一张（2026-11-13 用户）：不游走，红光直接停在这张上，选中后停一下就抽走
    hop(false);
    if (!single) timer = setInterval(() => hop(false), 190);
    return {
      async settle(pick) {
        if (done) return null;
        clearInterval(timer);
        if (!single) for (const d of [220, 300, 420]) { if (done) return null; hop(true); await wait(ms(d)); }
        if (done) return null;
        const arr = items();
        if (!arr.length) return null;
        const i = Math.max(0, Math.min(arr.length - 1, pick(arr)));
        arr.forEach((x) => x.classList.remove('is-wander'));
        arr[i].classList.add('is-chosen');
        snd('ding');
        if (!fx.reduce()) arr[i].animate([{ scale: '1' }, { scale: '1.08', offset: 0.35 }, { scale: '1' }], { duration: 360, easing: 'ease-out' });
        await wait(ms(single ? 420 : 950));   // 停一下：让人看清抽中的是哪张（只有一张时短一点）
        return arr[i];
      },
      cancel() {
        done = true;
        clearInterval(timer);
        items().forEach((x) => x.classList.remove('is-wander', 'is-chosen'));
        if (fan) fan.remove();
      },
    };
  }
  /* 我来抽：他的手牌扣着摊开（顺序打乱过），点一张；限时到了红光游走几下替我点一张 */
  function stealPicker() {
    const s = game.state, from = s.steal.from, k = s.steal.perm.length;
    const limit = k <= 1 ? 0 : dlgLimit();   // 只剩一张：没得挑，不计时
    markVictim(from);
    // 2026-11-13 用户：不要顶上「抽 某某 一张牌」那行字；倒计时藏进底下的按钮里（按钮本来填满，时间条从右往左一点点退掉）
    openStage(
      // 扣着的牌像捏在手里一样扇形摊开（用户 2026-11-12：别一板一眼排一排）；张数多就收窄每张的角度
      '<div class="zm-steal-pick is-fan" data-steal data-stagger style="--fan-h:' + (k > 7 ? 1.18 : 1.08) + '">' + Array.from({ length: k }, (_, i) => {
        const step = Math.min(13, 78 / Math.max(1, k - 1)), ang = (i - (k - 1) / 2) * step;
        return '<button type="button" data-i="' + i + '" aria-label="' + T('ui.pos.nth', '第 {n} 张', { n: i + 1 }) + '" style="--a:' + ang.toFixed(1) + 'deg;z-index:' + (i + 1) + '">' + backHtml() + '</button>';
      }).join('') + '</div>' +
      (k > 1 ? '<div class="zm-actions is-center"><button type="button" class="zm-btn zm-btn-primary' + (limit ? ' zm-timed' : '') + '" data-rand>' + (limit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '') + '<b>' + T('ui.steal.rand', '抽一张') + '</b></button></div>' : ''), (d) => {
      d.classList.add('is-cards');
      const btns = Array.from(d.querySelectorAll('[data-i]'));
      let done = false, timer = 0, roam = 0;
      const commit = async (i, auto) => {
        if (done || !btns[0].isConnected) return;
        done = true; clearTimeout(timer); clearInterval(roam);
        if (auto) { timeouts += 1; autoAct = true; }
        btns.forEach((b, j) => b.classList.toggle('is-chosen', j === i));
        btns.forEach((b) => b.classList.remove('is-wander'));
        snd('ding');
        await wait(ms(320));
        if (!btns[i].isConnected) return;
        closeDialog();
        apply(0, { type: 'steal', idx: i });
        if (auto && timeouts >= 2) setAutopilot(true);
      };
      btns.forEach((b, i) => b.addEventListener('click', () => commit(i, false)));
      const rb = d.querySelector('[data-rand]');
      if (rb) rb.addEventListener('click', () => commit((Math.random() * k) | 0, false));
      if (k <= 1) { setTimeout(() => commit(0, false), ms(260)); return; }   // 只剩一张：直接选中它、停一下就抽走
      if (limit) {
        const my = token, bar = d.querySelector('.zm-dlg-timer');
        bar.querySelector('i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: limit, easing: 'linear', fill: 'forwards' });
        setTimeout(() => { if (my === token && !done && btns[0].isConnected) bar.classList.add('is-hurry'); }, Math.max(0, limit - HURRY_MS));
        // 时间到：红光在几张之间跳几下，再替我点一张
        timer = setTimeout(() => {
          if (my !== token || done || !btns[0].isConnected) return;
          let c = -1, n = 0;
          roam = setInterval(() => {
            if (done || !btns[0].isConnected) { clearInterval(roam); return; }
            let j = (Math.random() * k) | 0; if (k > 1 && j === c) j = (j + 1) % k; c = j;
            btns.forEach((b, x) => b.classList.toggle('is-wander', x === j));
            snd('tick');
            if (++n >= 5) { clearInterval(roam); commit(j, true); }
          }, 200);
        }, limit);
      }
    });
  }

  /* 交换：两个人的牌在空中交叉着换过去（逗猫棒不动）——一边从上面的弧线走、另一边从下面走；
   * 我参与的话：我换出去的从手牌原位飞走（背面朝上），换来的半路翻开、先落到牌槽上方再滑进去 */
  async function animSwap(e, t) {
    const a = e.a, b = e.b, u = U(), pu = PU();
    // 是谁和谁换：两人头像都亮着（出牌人金光、被换的人一明一暗），停一下再飞牌（2026-11-13 用户：不要连线箭头）
    setActing(a); markVictim(b);
    await wait(ms(300));
    if (t !== token) return;
    snd('swipe');
    const flights = [];
    const pt = (seat) => avPoint(seat);
    const leave = (from, to, n, ids, arc) => {
      if (from === 0 && ids) {
        const rects = ids.map((id) => handRectOf(id));
        dropFromHand(ids);
        renderHand();
        rects.forEach((r, i) => flights.push(fx.fly({ html: backHtml(), from: r, to: pt(to), w: pu, s0: r.width / pu, s1: 0.4, r0: 0, r1: 18, dur: ms(620), delay: i * ms(45), lift: arc, fadeOut: true, land: false })));
      } else {
        for (let i = 0; i < Math.min(n, 6); i++) flights.push(fx.fly({ html: backHtml(), from: pt(from), to: to === 0 ? els.hand.getBoundingClientRect() : pt(to), w: pu, s0: 0.4, s1: to === 0 ? 0.8 : 0.4, r0: -12, r1: 12, dur: ms(620), delay: i * ms(45), lift: arc, fadeIn: true, fadeOut: true, land: false }));
      }
    };
    const arrive = (from, ids, arc) => {   // 换到我手里的（看得到是哪几张）
      ids.forEach((id, i) => {
        const to = aboveSlot(reserveHandSlot(id));
        flights.push(fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'up', flipAt: 0.45, from: pt(from), to, w: u, s0: 0.35, s1: 1, r0: -10, r1: 0, dur: ms(680), delay: ms(120) + i * ms(55), lift: arc })
          .then(() => { if (t === token) revealHandCard(id, to); }));
      });
    };
    if (a === 0) { leave(0, b, e.toB, e.cardsA, 70); if (e.cardsB) arrive(b, e.cardsB, -70); else leave(b, 0, e.toA, null, -70); }
    else if (b === 0) { leave(0, a, e.toA, e.cardsB, -70); if (e.cardsA) arrive(a, e.cardsA, 70); else leave(a, 0, e.toB, null, 70); }
    else { leave(a, b, e.toB, null, 70); leave(b, a, e.toA, null, -70); }
    await Promise.all(flights);
    if (t !== token) return;
    if (ov) {
      ov.counts[a] = ov.counts[a] - e.toB + e.toA;
      ov.counts[b] = ov.counts[b] - e.toA + e.toB;
    }
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }   // 换完才撤准星
    renderSeat(a); renderSeat(b);
    fx.pop(avEl(a), { scale: 1.15 }); fx.pop(avEl(b), { scale: 1.15 });
    snd('thud');
    await wait(ms(260));
    releaseRim();
    markVictim(-1);
  }

  /* 两张一样偷一张：一只大猫爪从他头像上扑过去、扒拉一下，抓着一张牌拖回来 */
  async function animSteal(e, t) {
    let picked = null;
    if (game.wander) {
      const w = game.wander;
      game.wander = null;
      const el = await w.settle((arr) => (e.from === 0 ? Math.max(0, arr.findIndex((c) => +c.dataset.id === e.card)) : (e.idx != null ? e.idx : 0)));
      if (t !== token) { w.cancel(); return; }
      if (el) picked = el.getBoundingClientRect();
      game.wanderDone = w;   // 选中的那张一直亮着，等牌真的飞走时再收
    }
    game.stealFrom = picked;
    const a = avPoint(e.to), b = avPoint(e.from);
    const S = 58;
    const paw = document.createElement('div');
    paw.className = 'zm-prop zm-paw';
    paw.innerHTML = window.ZhamaoFx.SHAPES.paw;
    paw.style.width = paw.style.height = S + 'px';
    els.fly.appendChild(paw);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
    snd('swipe');
    await fx.animate(paw, [
      { transform: fx.T(a.x - S / 2, a.y - S / 2, 0.3, ang), opacity: 0 },
      { transform: fx.T(a.x - S / 2, a.y - S / 2, 1, ang), opacity: 1, offset: 0.15 },
      { transform: fx.T(b.x - S / 2, b.y - S / 2 - 14, 1.15, ang - 20), opacity: 1, offset: 0.6, easing: 'cubic-bezier(.5,0,.8,.4)' },
      { transform: fx.T(b.x - S / 2 + 6, b.y - S / 2, 1, ang + 25), opacity: 1, offset: 0.8 },
      { transform: fx.T(b.x - S / 2, b.y - S / 2, 1, ang), opacity: 1 },
    ], { duration: ms(520) }).finished.catch(() => {});
    if (t !== token) { paw.remove(); return; }
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }   // 准星一直瞄到爪子扒拉到那一下（2026-11-15 用户）
    fx.shake(seatEl(e.from), { amp: 6, dur: 320 });
    fx.burst(b.x, b.y, { n: 8, shapes: ['fur'], colors: ['#b39c7e', '#eea25a', '#8f8a99'], radius: 40, size: [6, 14], life: 600 });
    // 爪子拖着牌回去
    paw.animate([
      { transform: fx.T(b.x - S / 2, b.y - S / 2, 1, ang) },
      { transform: fx.T(a.x - S / 2, a.y - S / 2, 0.6, ang), opacity: 0 },
    ], { duration: ms(600), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }).finished.then(() => paw.remove(), () => paw.remove());
    await animTransfer(e, t, 'steal');
  }

  /* 点名气泡（2026-11-13 用户挑定乙 · 对话泡）：牌右上角一个墨色小对话泡，里面三个点一跳一跳像在翻找；
   * 有 → 泡变金色、里面一个勾；没有 → 泡变朱红、里面一个叉（用户：别写「有 / 没有」，太土） */
  function qGlyph(kind) {
    if (kind === 'ask') return '<i></i><i></i><i></i>';
    const d = kind === 'yes' ? '<path d="M4.6 10.6l3.6 3.6 7.2-7.8"/>' : '<path d="M5.6 5.6l8.8 8.8M14.4 5.6l-8.8 8.8"/>';
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><g class="ink" fill="none" stroke-linecap="round" stroke-linejoin="round">' + d + '</g></svg>';
  }

  /* 三张点名（2026-11-13 用户：太快，牌还没看清就拿过来了）——放慢、分三拍：
   *   ① 点名的那张牌从桌上飞到被点名的人头像旁边（对手在上面就落在头像下方，我在下面就落在头像上方），头顶一个「？」，他的头像亮金光、抖两下像在翻找；
   *   ② 有：这张牌亮金边、蹦一下、冒星星，停一会儿让大家看清是什么；没有：牌左右摇头、打红叉、冒烟；
   *   ③ 有的话：这张牌从那儿飞进出牌人手里（我拿到就落进手牌） */
  async function namedCallout(e, t) {
    markVictim(e.from);
    const av = avEl(e.from), ar = av ? av.getBoundingClientRect() : { left: innerWidth / 2 - 20, top: 80, width: 40, height: 40, bottom: 120 };
    const u = U() * 0.92 * 0.72, h = u * 1.4;   // 小一号（约桌上牌的六成，和被抽牌时摊开的那把差不多大；2026-11-18 用户：原来 --pop 大号、手牌大小都偏大）
    const below = ar.top + ar.height / 2 < innerHeight / 2;
    const se = seatEl(e.from), sb = se ? se.getBoundingClientRect().bottom : ar.bottom + 30;
    const fr = frameX(), x = Math.min(Math.max(ar.left + ar.width / 2 - u / 2, fr.l), fr.r - u - 20);   // 右边多留 20px：右上角的对话泡探出牌外
    const y = below ? Math.max(sb, ar.bottom) + 24 : ar.top - h - 26;   // 落在整个座位（名字、档位签）下方，气泡不压名字
    const el = document.createElement('div');
    el.className = 'zm-flyer zm-callout';
    el.style.width = u + 'px'; el.style.height = h + 'px';
    el.innerHTML = cardHtml(e.named) + '<b class="zm-callout-q">' + qGlyph('ask') + '</b>';
    els.fly.appendChild(el);
    const sn = els.stage.querySelector('.zm-stage-named .zm-card');
    const sr = sn ? sn.getBoundingClientRect() : null;
    const from = sr ? fx.T(sr.left + sr.width / 2 - u / 2, sr.top + sr.height / 2 - h / 2, sr.width / u, 0) : fx.T(x, y + 30, 0.3, 0);
    if (sn) sn.style.visibility = 'hidden';
    snd('whoosh');
    await fx.animate(el, [
      { transform: from, opacity: sr ? 1 : 0 },
      { transform: fx.T(x, y - 10, 1.08, -4), opacity: 1, offset: 0.7 },
      { transform: fx.T(x, y, 1, 0), opacity: 1 },
    ], { duration: ms(620), easing: 'cubic-bezier(.3,.7,.3,1)' }).finished.catch(() => {});
    if (t !== token) { el.remove(); return null; }
    el.style.transform = fx.T(x, y, 1, 0);
    // 他在翻手牌找：头像抖两下
    fx.shake(seatEl(e.from), { amp: 3, dur: 420 });
    await wait(ms(560));
    return { el, x, y, u, h };
  }
  async function animTake(e, t) {
    const c = await namedCallout(e, t);
    if (!c) return;
    const { el, x, y, u, h } = c;
    // ② 有！金边、蹦一下、冒星星，停一会儿
    el.classList.add('is-hit');
    el.querySelector('.zm-callout-q').innerHTML = qGlyph('yes');   // 有：金色泡 + 勾
    snd('ding');
    fx.burst(x + u / 2, y + h / 2, { n: 16, shapes: ['star'], colors: GOLDS, radius: 70, size: [6, 18], life: 900 });
    await fx.animate(el, [{ transform: fx.T(x, y, 1, 0) }, { transform: fx.T(x, y - 8, 1.16, 0), offset: 0.4 }, { transform: fx.T(x, y, 1, 0) }], { duration: ms(420), easing: 'ease-out' }).finished.catch(() => {});
    await wait(ms(700));
    if (t !== token) { el.remove(); return; }
    // ③ 飞进出牌人手里；桌沿那截缩回，出牌人那儿漾开一圈金色（点中了！）
    releaseRim();
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }   // 牌被拿走那一下准星才撤
    if (rimFxOn()) setTimeout(() => rimRipple(e.to, '#e2b85c', 900, 3), 260);
    const src = el.getBoundingClientRect();
    el.remove();
    if (e.from === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[e.from] -= 1; renderSeat(e.from); }
    const to = e.to === 0 ? reserveHandSlot(e.card) : avPoint(e.to);
    snd('steal');
    await fx.fly({ html: cardHtml(e.card), from: src, to, w: u, s0: 1, s1: e.to === 0 ? HU() / u : 0.5, fadeOut: e.to !== 0, dur: ms(820), lift: 90, r0: 0, r1: 0, swell: 0.3 });
    if (t !== token) return;
    if (e.to === 0) revealHandCard(e.card); else { ov.counts[e.to] += 1; renderSeat(e.to); fx.pop(avEl(e.to), { scale: 1.15 }); }
    markVictim(-1);
    await wait(ms(260));
  }
  async function animMiss(e, t) {
    const c = await namedCallout(e, t);
    if (!c) return;
    const { el, x, y, u, h } = c;
    // ② 没有：摇头、打红叉、冒烟；桌沿那截变灰、蔫蔫地缩回（和被作废一样）
    el.classList.add('is-miss');
    releaseRim({ dull: true });
    el.querySelector('.zm-callout-q').innerHTML = qGlyph('no');   // 没有：朱红泡 + 叉
    el.insertAdjacentHTML('beforeend', '<div class="zm-cross" style="animation-delay:.25s">' + ART.PROPS.cross + '</div>');
    snd('miss');
    await fx.animate(el, [
      { transform: fx.T(x, y, 1, 0) },
      { transform: fx.T(x, y, 1, -12), offset: 0.2 },
      { transform: fx.T(x, y, 1, 12), offset: 0.4 },
      { transform: fx.T(x, y, 1, -8), offset: 0.6 },
      { transform: fx.T(x, y, 1, 0), offset: 0.8 },
      { transform: fx.T(x, y, 1, 0) },
    ], { duration: ms(900) }).finished.catch(() => {});
    if (!fx.reduce()) fx.smoke(x + u / 2, y + h / 2, { n: 5, spread: 14, size: [20, 34], rise: 30 });
    await wait(ms(650));
    await fx.animate(el, [{ transform: fx.T(x, y, 1, 0), opacity: 1 }, { transform: fx.T(x, y - 20, 0.8, 0), opacity: 0 }], { duration: ms(360) }).finished.catch(() => {});
    el.remove();
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    markVictim(-1);
    void t;
  }

  /* 五张不同：弃牌堆一下子摊开成扇面，挑中的那张升起、闪金光，飞进他手里 */
  async function animPick(e, t) {
    const r = discardRect(), c = fx.center(r), pu = PU();
    const fan = ov.discard.slice(-6).filter((id) => id !== e.card).slice(-4);
    snd('fan');
    const outs = fan.map((id, i) => fx.fly({ html: cardHtml(id), from: r, to: { x: c.x + (i - (fan.length - 1) / 2) * pu * 0.45, y: c.y - pu * 0.25 }, w: pu, s0: 1, s1: 0.9, r0: pileRot(id), r1: (i - (fan.length - 1) / 2) * 12, dur: ms(300), delay: i * 40, lift: 10, keep: true, land: false }));
    ov.discard = ov.discard.filter((x) => x !== e.card);
    renderPiles();
    const nodes = await Promise.all(outs);
    if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    fx.burst(c.x, c.y - pu * 0.5, { n: 12, shapes: ['star'], colors: GOLDS, radius: pu, size: [6, 16], life: 800 });
    snd('ding');
    const to = e.seat === 0 ? reserveHandSlot(e.card) : avPoint(e.seat);
    const u = e.seat === 0 ? HU() : U();
    const flight = fx.fly({ html: cardHtml(e.card), from: { x: c.x, y: c.y - pu * 0.6 }, to, w: u, s0: pu / u * 1.2, s1: e.seat === 0 ? 1 : 0.45, fadeOut: e.seat !== 0, dur: ms(620), lift: 90, swell: 0.3 });
    nodes.forEach((n, i) => {
      if (!n) return;
      const rr = n.getBoundingClientRect();
      n.remove();
      fx.fly({ html: cardHtml(fan[i]), from: rr, to: r, w: pu, s0: 0.9, s1: 1, r0: (i - (fan.length - 1) / 2) * 12, r1: pileRot(fan[i]), dur: ms(260), delay: i * 30, lift: 6 });
    });
    await flight;
    if (t !== token) return;
    if (e.seat === 0) revealHandCard(e.card); else { ov.counts[e.seat] += 1; renderSeat(e.seat); fx.pop(avEl(e.seat), { scale: 1.15 }); }
    await wait(ms(200));
  }

  /* 摸牌：牌堆顶那张先被捏起来、悬一下（危险时多悬一会儿、心跳），再飞走。
   * 摸到安全牌：给我的半路翻成正面、滑进手里预留的空位；给别人的缩进头像，头像「咽」一下 */
  function danger() {
    const d = D();
    return d.deckSize ? d.kittens / d.deckSize : 0;
  }
  /* 抽底（2026-11-12 用户嫌粗糙，重做）：一只猫爪从牌堆左边伸进来，勾住最底下那张，往外拖——
   * 那张真的在整摞牌下面（放进牌堆那一摞的最底层，上面的牌压着它），牌堆被带得一抬一晃；
   * 拖出来以后才换成桌面上的一张牌、捏起来悬一下（和平常摸牌接上） */
  async function peelBottom(t) {   // 2026-11-19 用户看过四个座位的对比后定：保持原版（爪子从左边伸进来、拖出半张多就起飞），乙「往抽牌人那边拖」已撤回
    const stack = els.deck.querySelector('.zm-deck-stack');
    const floor = stack && (stack.querySelector('.zm-sheet.is-floor') || stack.querySelector(':scope > .zm-card'));
    const pu = PU();
    if (!stack || !floor || fx.reduce()) return peel(t, false);
    const fr = floor.getBoundingClientRect();
    // 火眼露着的炸弹猫正好在最底下（2026-11-16 用户）：爪子拖出来的就是露着的那张（正面），不再另塞一张牌背
    const kitBox = floor.nextElementSibling && floor.nextElementSibling.classList.contains('zm-deck-kit') ? floor.nextElementSibling : null;
    const kitId = kitBox ? +kitBox.dataset.id : null;
    game.peelFace = kitId;
    if (kitBox) kitBox.remove();
    // 1. 最底下塞一张牌背（被上面的纸边压着）
    const wrap = document.createElement('div');
    wrap.innerHTML = kitId != null ? cardHtml(kitId) : backHtml('is-inserting');
    const el = wrap.firstChild;
    el.style.transform = floor.style.transform || '';
    stack.insertBefore(el, stack.firstChild);
    // 2. 猫爪从左边伸到那张牌的左边沿
    const S = pu * 0.62;
    const paw = document.createElement('div');
    paw.className = 'zm-prop zm-paw';
    paw.innerHTML = window.ZhamaoFx.SHAPES.paw;
    paw.style.width = paw.style.height = S + 'px';
    els.fly.appendChild(paw);
    // 爪子从左下方伸到牌堆最下沿的左下角
    // 2026-11-15 用户：抽底动画有点卡、僵——以前三段（伸爪 / 拖出 / 换一张再捏起来悬一下）一段等一段，中途还换了一次元素、角度从 -11° 跳回 -5°。
    // 现在：爪子还没伸到位就开始拖（两段叠着），拖出来直接停在后面飞向手里那一段的起始角度（-5°），不再另捏一张悬着；只有危险时多抖一下
    const ch = pu * 1.4;
    const py = fr.top + ch * 0.86 - S / 2, px0 = fr.left - pu * 1.3, px1 = fr.left - S * 0.3;
    snd('swipe');
    const reach = ms(240);
    fx.animate(paw, [
      { transform: fx.T(px0, py + pu * 0.5, 0.6, 50), opacity: 0 },
      { transform: fx.T(px1, py, 1, 62), opacity: 1 },
    ], { duration: reach }, 'cubic-bezier(.2,.8,.3,1)');
    await wait(reach * 0.7);
    if (t !== token) { paw.remove(); el.remove(); return null; }
    // 3. 勾住往外拖：牌从整摞底下顺滑地滑出来，牌堆被带得轻轻一晃
    ov.deckSize -= 1;
    const ox = -pu * 0.72, oy = pu * 0.5, dur = ms(400);
    const tense = danger() >= 0.2;
    snd('peel');
    if (tense) snd('heartbeat', 80);
    stack.animate([{ translate: '0 0' }, { translate: '1px -2px', offset: 0.4 }, { translate: '0 0' }], { duration: dur, easing: 'ease-out' });
    fx.animate(paw, [{ transform: fx.T(px1, py, 1, 62) }, { transform: fx.T(px1 + ox, py + oy, 1, 58) }], { duration: dur }, 'cubic-bezier(.3,.6,.25,1)');
    await el.animate([{ translate: '0 0', rotate: '0deg' }, { translate: ox + 'px ' + oy + 'px', rotate: '-5deg' }], { duration: dur, easing: 'cubic-bezier(.3,.6,.25,1)', fill: 'forwards' }).finished.catch(() => {});
    if (t !== token) { paw.remove(); el.remove(); return null; }
    const r = el.getBoundingClientRect();
    paw.animate([{ opacity: 1 }, { opacity: 0, transform: fx.T(px1 + ox - pu * 0.4, py + oy + pu * 0.3, 0.6, 50) }], { duration: ms(240), fill: 'forwards' }).finished.then(() => paw.remove(), () => paw.remove());
    if (!tense) { el.remove(); renderPiles(); return r; }
    // 危险时：停在那儿抖两下再飞（和从顶上摸一样的心跳感）
    el.remove();
    renderPiles();
    const node = document.createElement('div');
    node.className = 'zm-flyer';
    node.style.width = pu + 'px'; node.style.height = pu * 1.4 + 'px';
    node.innerHTML = kitId != null ? cardHtml(kitId) : backHtml();
    els.fly.appendChild(node);
    const x = r.left + (r.width - pu) / 2, y = r.top + (r.height - pu * 1.4) / 2;
    await fx.animate(node, [
      { transform: fx.T(x, y, 1, -5) },
      { transform: fx.T(x + 1.5, y - 2, 1.03, -3), offset: 0.33 },
      { transform: fx.T(x - 1.5, y - 1, 1.03, -7), offset: 0.66 },
      { transform: fx.T(x, y, 1, -5) },
    ], { duration: ms(380) }).finished.catch(() => {});
    if (t !== token) { node.remove(); return null; }
    const rr = node.getBoundingClientRect();
    node.remove();
    return rr;
  }
  // 掀牌的姿势：推出一截 → 捏起来悬着（peel 和联机预掀共用）
  const peelFrames = (x, y, dx) => [
    { transform: fx.T(x, y, 1, 0), boxShadow: '0 0 0 rgba(29,27,24,0)', easing: 'cubic-bezier(.3,.6,.4,1)' },
    { transform: fx.T(x + dx, y - 1, 1, 1.5), boxShadow: '0 2px 3px rgba(29,27,24,.2)', offset: 0.55, easing: 'cubic-bezier(.3,.7,.3,1)' },
    { transform: fx.T(x + dx * 1.1, y - 14, 1.05, -4), boxShadow: '0 12px 20px rgba(29,27,24,.26)' },
  ];
  // 联机点「摸牌」：先把顶上那张推出来捏着悬着（等服务器回话），回话后 peel 从这儿接着演
  function prePeel() {
    if (game.drawLift) { game.drawLift.node.remove(); game.drawLift = null; }
    // 百变「摸底」生效时这一摸是从最底下抽（peel 里会走 peelBottom）：不先掀顶上那张，
    // 不然一点就闪一下「从顶上摸」、回话后又换成从底下抽（2026-11-26 用户）
    { const st = game.state; if (st && st.flux === 'bottom' && st.deck && st.deck.length > 1) return; }
    const r = deckTopRect(), pu = PU();
    if (!r || !r.width) return;
    const node = document.createElement('div');
    node.className = 'zm-flyer';
    node.style.width = pu + 'px'; node.style.height = pu * 1.4 + 'px';
    const face = game.state ? faceTop(game.state) : null;
    node.innerHTML = face != null ? cardHtml(face) : backHtml();
    els.fly.appendChild(node);
    snd('peel');
    const anim = node.animate(peelFrames(r.left, r.top, pu * 0.16), { duration: 220, fill: 'forwards' });
    game.drawLift = { node, anim, at: performance.now(), face };
    /* 透视：翻着的那张被掀起来了，下面那张这时还不知道是哪张（服务器回话才告诉）——先露牌背，回话后再翻成正确的那张。
     * 以前牌堆上照旧摆着被掀走的那张，网慢时看着像下面那张和摸走的是同一张、过一会儿才变（2026-11-26 用户） */
    if (face != null) renderPiles();
  }
  async function peel(t, bottom, seat) {
    const lift = game.drawLift; game.drawLift = null;   // 联机：点「摸牌」时已经掀起来悬着的那张——从它现在的位置接着摸
    game.peelFace = null; game.peelS = 1.04; game.peelRot = -5;
    // 牌堆只剩一张时，底和顶是同一张：照从顶上摸来演（2026-11-17 用户：以前从底下抽出来的那一瞬，牌堆上还摆着一张，看着像有两张）
    if (bottom && ov && ov.deckSize > 1) { if (lift) lift.node.remove(); return peelBottom(t); }
    const r = deckTopRect(), pu = PU();
    if (lift && seat === 0 && lift.node.isConnected) {
      // 接着悬着的那张演：牌堆数字这时才减一；紧张时再抖两下（悬着已经等过一会儿了，不再另外停）
      const node = lift.node;
      game.peelFace = lift.face;
      ov.deckSize -= 1;
      ov.topFace = faceTop(game.state);
      renderPiles();
      const tense = danger() >= 0.2;
      if (tense) snd('heartbeat', 0);
      await lift.anim.finished.catch(() => {});
      const x = r.left + pu * 0.16 * 1.1, y = r.top - 14;
      const rest = Math.max(0, ms(tense ? 640 : 300) - (performance.now() - lift.at));
      if (tense || rest > 40) {
        await fx.animate(node, [
          { transform: fx.T(x, y, 1.05, -4) },
          ...(tense ? [{ transform: fx.T(x + 1.5, y - 1, 1.05, -2), offset: 0.4 }, { transform: fx.T(x - 1.5, y, 1.05, -5), offset: 0.75 }] : []),
          { transform: fx.T(x, y, 1.05, -4) },
        ], { duration: Math.max(rest, tense ? 260 : 0) }).finished.catch(() => {});
      }
      if (t !== token) { node.remove(); return null; }
      const rr = node.getBoundingClientRect();
      node.remove();
      return rr;
    }
    if (lift) lift.node.remove();
    const node = document.createElement('div');
    node.className = 'zm-flyer';
    node.style.width = pu + 'px'; node.style.height = pu * 1.4 + 'px';
    const face = ov && ov.topFace != null ? ov.topFace : null;   // 百变「掀顶」：拿走的是那张翻开的明牌
    game.peelFace = face;
    node.innerHTML = face != null ? cardHtml(face) : backHtml();
    els.fly.appendChild(node);
    ov.deckSize -= 1;
    ov.topFace = faceTop(game.state);   // 下一张该翻着就翻起来（透视；或火眼露着的炸弹猫刚好到了最上面）
    renderPiles();
    const tense = danger() >= 0.2;
    snd('peel');
    if (tense) snd('heartbeat', 80);
    const hold = ms(tense ? 640 : 300);
    const x = r.left, y = r.top, dx = pu * 0.16;
    // 先用拇指把顶上那张往外推出一截（下面那张露出来），再捏起来悬一下
    await fx.animate(node, [
      { transform: fx.T(x, y, 1, 0), boxShadow: '0 0 0 rgba(29,27,24,0)', easing: 'cubic-bezier(.3,.6,.4,1)' },
      { transform: fx.T(x + dx, y - 1, 1, 1.5), boxShadow: '0 2px 3px rgba(29,27,24,.2)', offset: 0.3, easing: 'cubic-bezier(.3,.7,.3,1)' },
      { transform: fx.T(x + dx * 1.1, y - 14, 1.05, -4), boxShadow: '0 12px 20px rgba(29,27,24,.26)', offset: 0.55 },
      ...(tense ? [{ transform: fx.T(x + dx * 1.1 + 1.5, y - 15, 1.05, -2), offset: 0.7 }, { transform: fx.T(x + dx * 1.1 - 1.5, y - 14, 1.05, -5), offset: 0.85 }] : []),
      { transform: fx.T(x + dx * 1.1, y - 14, 1.05, -4), boxShadow: '0 12px 20px rgba(29,27,24,.26)' },
    ], { duration: hold }).finished.catch(() => {});
    if (t !== token) { node.remove(); return null; }
    const rr = node.getBoundingClientRect();
    node.remove();
    return rr;
  }
  async function animDraw(e, t) {
    const from = await peel(t, e.bottom, e.seat);
    if (!from) return;
    const u = HU(), pu = PU();
    const open = game.peelFace != null;   // 透视 / 火眼：摸走的本来就是明牌，不用再翻
    game.peelFace = null;
    const ps = game.peelS || 1.04, pr = game.peelRot != null ? game.peelRot : -5;   // 抽底拖出来的那张原样起飞（不放大、角度接上）
    if (e.seat === 0 && e.card != null) {
      const to = aboveSlot(reserveHandSlot(e.card));
      const morph = willMorph(e.card);   // 百搭：摸起来先是本身那只猫，落进手里再翻成万能猫
      const face = morph ? rawHtml(e.card) : cardHtml(e.card);
      await fx.fly(open ? { html: face, from, to, w: u, s0: pu * ps / u, s1: 1, r0: pr, r1: 0, dur: ms(560), lift: 70, swell: 0.18 } : { html: face, back: backHtml(), flip: 'up', flipAt: 0.3, from, to, w: u, s0: pu * ps / u, s1: 1, r0: pr, r1: 0, dur: ms(560), lift: 70, swell: 0.18 });
      if (t !== token) return;
      snd('flip');
      const hc = morph ? handCard(e.card) : null;
      if (hc) setFace(hc, face);
      revealHandCard(e.card, to);
      if (hc) morphWild([hc], [e.card], t, ms(320));
      if (R.KIND_OF[e.card] === R.DEFUSE) { const r = handRectOf(e.card); fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, shapes: ['star'], colors: ['#4f8a5f', '#9bc8a2', '#c9a96e'], radius: u * 0.8, size: [6, 14], life: 700 }); }
    } else {
      /* 2026-11-19 用户定（随抽底乙一起）：以前牌缩小后盖在头像正中、一直是实的，最后一帧突然没了，之后才跳数字、头像才鼓。
       * 现在最后三成路程边缩边淡、被头像吞进去；牌碰到头像那一下头像就鼓，数字跟着往上翻一格 */
      const a = avPoint(e.seat), dur = ms(520);
      const flying = fx.fly({ html: open && e.card != null ? cardHtml(e.card) : backHtml(), from, to: a, w: pu, s0: ps, s1: 0.32, r0: pr, r1: 10, dur, lift: 50, sink: 0.66, land: false });
      await wait(dur * 0.74);
      if (t !== token) return;
      gulp(e.seat);
      await wait(dur * 0.18);
      if (t !== token) return;
      ov.counts[e.seat] += 1;
      const av = avEl(e.seat); if (av) av._roll = true;
      renderSeat(e.seat);
      if (av) av._roll = false;
      await flying;
    }
  }
  function gulp(seat) {
    const av = avEl(seat);
    if (av && !fx.reduce()) av.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.3,.8,.4,1.2)', composite: 'add' });
  }

  /* 炸弹猫！牌捏起来、悬着，然后不往手里飞，直冲桌子正中、越变越大，半路翻开——
   * 桌子一震、红光一闪、一圈黑毛炸开、金色火星、烟，炸弹猫在桌中央气得发抖，摸到它的人吓得一哆嗦 */
  /* 头像变身：摸到炸弹猫的人，头像整个换成那只炸弹猫（发抖、红光一呼一吸、头顶冒火星），桌子中间的动画照常演；
   * 用了逗猫棒：一根逗猫棒从头像背后探出来逗两下，炸弹猫消气、缩回去，头像变回原样；没逗猫棒就跟着出局一起炸掉 */
  function bombAvatar(seat, on) {
    const av = avEl(seat), box = seatEl(seat);
    if (!av || !box) return;
    let o = av.querySelector('.zm-av-bomb');
    if (on) {
      if (o) return;
      o = document.createElement('span');
      o.className = 'zm-av-bomb';
      o.innerHTML = ART.face('boom');
      av.appendChild(o);
      box.classList.add('is-bomb');
      if (!fx.reduce()) o.animate([{ transform: 'scale(.2) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(8deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,.8,.4,1.3)' });
      // 头顶一直冒火星
      av._spark = setInterval(() => {
        if (!o.isConnected) { clearInterval(av._spark); return; }
        const r = av.getBoundingClientRect();
        fx.burst(r.left + r.width * 0.5, r.top + 2, { n: 3, shapes: ['dot', 'star'], colors: ['#e9d46a', '#f28a2e', '#c8463a'], radius: 16, size: [3, 7], life: 420, gravity: -6, pattern: 'fountain' });
      }, 220);
    } else {
      clearInterval(av._spark);
      box.classList.remove('is-bomb');
      if (o) o.remove();
    }
  }
  // 用了逗猫棒：头像里的炸弹猫冒小心心、消气缩回去，头像变回原样（逗猫棒在桌心那幅画里挥，头像这儿不再另外冒一根）
  async function calmAvatar(seat, t, delay) {
    const av = avEl(seat);
    if (!av) return;
    if (fx.reduce()) { bombAvatar(seat, false); return; }
    await wait(delay || 0);
    if (t !== token) return;
    clearInterval(av._spark);
    const r = av.getBoundingClientRect();
    ['heart', 'heart', 'heart'].forEach((sh, i) => fx.float(r.left + r.width * (0.2 + i * 0.3), r.top, sh, { dy: -34, dx: (i - 1) * 6, size: 12 + i * 2, color: PINKS[i % 3], delay: i * 90, dur: 800 }));
    const o = av.querySelector('.zm-av-bomb');
    if (o) await o.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.3 }, { transform: 'scale(.3) rotate(20deg)', opacity: 0 }], { duration: ms(380), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    bombAvatar(seat, false);
    av.animate([{ transform: 'scale(.85)' }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
  }
  function clearBombAvatars() {
    document.querySelectorAll('.zm-av').forEach((av) => { clearInterval(av._spark); });
    document.querySelectorAll('.zm-av-bomb, .zm-av-wand').forEach((x) => x.remove());
    document.querySelectorAll('.zm-seat.is-bomb').forEach((b) => b.classList.remove('is-bomb'));
  }
  /* 摸到炸弹猫（2026-11-12 用户改）：和平常摸牌一样，牌飞进摸到的人的头像（自己也一样飞进自己头像），
   * 一落进去头像立刻变成炸弹猫（发抖、冒火星），头像那儿炸一圈毛、桌子一震；桌子正中不再翻出一张大炸弹猫 */
  async function animBoom(e, t, next) {
    const from = await peel(t, e.bottom, e.seat);
    if (!from) return;
    ov.kittens = Math.max(0, ov.kittens - 1);
    renderPiles();
    const pu = PU(), a = avPoint(e.seat);
    const open = game.peelFace != null; game.peelFace = null;   // 透视 / 火眼：大家早看见是炸弹猫了，飞过去也是正面
    /* 2026-11-17 用户定：出不出局都走同一套——和平常摸牌一样飞进摸到的人的头像（自己也飞进自己头像，不进手牌），一落进去头像变成炸弹猫、炸开；
     * 有逗猫棒：桌心逗猫棒安抚、头像变回原样（animDefuse）；没有：头像再「嘭」一下出局，手牌连同这只炸弹猫一起落进弃牌堆，炸弹猫从头像里飞出、排在最后（animOut） */
    await fx.fly({ html: open ? cardHtml(e.card) : backHtml(), from, to: a, w: pu, s0: game.peelS || 1.04, s1: 0.32, r0: game.peelRot != null ? game.peelRot : -5, r1: 10, dur: ms(480), lift: 50, fadeOut: true, land: false });
    if (t !== token) return;
    game.boomNode = null;
    snd('boom');
    if (rimFxOn()) { rimFlash('#d2483a', 3, 380); rimRipple(e.seat, '#d2483a', 900, 4); }   // 炸开的这一刻桌沿才红：之前所有摸牌都一个样，保留悬念
    bombAvatar(e.seat, true);
    const av = avEl(e.seat), ar = av ? av.getBoundingClientRect() : { width: 54 };
    fx.shake(els.table, { amp: 8, dur: 420, rot: 0.4 });
    fx.flash('rgba(200,70,58,.3)', 0, 700);
    fx.ring(a.x, a.y, { color: '#c8463a', size: ar.width * 2.6, width: 6, dur: 560 });
    fx.burst(a.x, a.y, { n: 18, shapes: ['fur', 'fur', 'spike'], colors: FUR, radius: ar.width * 1.3, size: [8, 20], alignOut: true, life: 800, gravity: 30, pattern: 'ring' });
    fx.burst(a.x, a.y - ar.width * 0.3, { n: 10, shapes: ['star', 'dot'], colors: GOLDS.concat(['#c8463a']), radius: ar.width, size: [5, 13], life: 900, delay: 60 });
    if (av && !fx.reduce()) av.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-10px) scale(1.14)', offset: 0.25 }, { transform: 'translateY(0) scale(1)' }], { duration: 460, easing: 'ease-out', composite: 'add' });
    fx.shake(seatEl(e.seat), { amp: 6, dur: 520, delay: 120 });
    // 急救开着、我还没用过、却凑不出一对（2026-11-26 用户）：不弹挑牌，手牌整排闪一下灰，说明没得救，接着炸
    const st = game.state;
    if (e.seat === 0 && st && st.flux === 'catsave' && !(st.saveUsed && st.saveUsed[0]) && next && next.t !== 'defuse' && next.t !== 'save') await noPairFlash(t);
    await wait(ms(next && (next.t === 'defuse' || next.t === 'save') ? 700 : next && next.t === 'out' ? 820 : 900));
  }

  async function noPairFlash(t) {
    const cards = Array.from(els.hand.querySelectorAll('.zm-card'));
    if (!cards.length || fx.reduce()) return;
    await wait(ms(260));
    if (t !== token) return;
    const d = ms(620);
    cards.forEach((c, i) => c.animate([{ filter: 'none' }, { filter: 'grayscale(1) brightness(.82)', offset: 0.3 }, { filter: 'grayscale(1) brightness(.82)', offset: 0.7 }, { filter: 'none' }], { duration: d, delay: i * 18, easing: 'ease-in-out' }));
    await wait(d);
  }
  // 一张停在 (x, y) 的牌（不在飞）：拿来接着做动画
  function restCard(html, x, y, w) {
    const el = document.createElement('div');
    el.className = 'zm-flyer';
    el.style.width = w + 'px'; el.style.height = (w * 1.4) + 'px'; el.style.borderRadius = (w * 0.09).toFixed(1) + 'px';
    el.style.transform = 'translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - w * 0.7).toFixed(1) + 'px)';
    el.style.boxShadow = '0 6px 16px rgba(29,27,24,.22)';
    el.innerHTML = html;
    els.fly.appendChild(el);
    return el;
  }
  // 同 restCard，但位置写在 left/top 上、transform 只留旋转：这样再动 translate / rotate / scale（单独属性）都绕牌自己的中心，
  // 不会把定位的那段位移也转歪 / 缩掉（restCard 把位置放在 transform 里，单独的 rotate、scale 会作用在它外面）
  function pinCard(html, x, y, w, rot) {
    const el = restCard(html, x, y, w);
    el.style.left = (x - w / 2).toFixed(1) + 'px'; el.style.top = (y - w * 0.7).toFixed(1) + 'px';
    el.style.transform = rot ? 'rotate(' + rot + 'deg)' : '';
    return el;
  }
  function takeDefuseCard(e) {
    const who = e.from != null ? e.from : e.seat;   // 组队：队友出的逗猫棒从队友那儿飞出来
    const src = who === 0 ? handRectOf(e.card) : avPoint(who);
    if (who === 0) { dropFromHand([e.card]); renderHand(); } else { ov.counts[who] -= 1; renderSeat(who); }
    if (e.rescue) rescueBubble(who, 'catch');
    return src;
  }
  async function defuseToDiscard(e, t, from, w) {
    if (t !== token) return;
    await fx.fly({ html: cardHtml(e.card), from, to: discardRect(), w: PU(), s0: w / PU(), s1: 1, r0: 0, r1: pileRot(e.card), dur: ms(360), lift: 30 });
    if (t !== token || !ov) return;
    ov.discard.push(e.card);
    renderPiles();
    snd('thud');
  }
  /* 用逗猫棒拆掉（2026-11-12 用户挑的方案甲「牌化成画」）：逗猫棒那张牌落在桌心不消失，就地「展开」成封面那幅画（牌放大淡出、画从牌那么大长出来，同一个位置），
   * 只有画里这一根逗猫棒在挥（头像那儿不再另外冒一根），画里的炸弹猫消气的同时头像那只也消气；最后画收回成那张牌，牌落进弃牌堆 */
  async function animDefuse(e, t) {
    if (e.extra != null) return animCatSave(e, t);
    if (e.rescue) { await rescueResolved(e, t); if (t !== token) return; }
    const u = U(), c = fx.center(els.center.getBoundingClientRect());
    const src = takeDefuseCard(e);
    const W = u * 1.2;
    const giver = e.from != null ? e.from : e.seat;   // 组队救援：逗猫棒是队友的，从谁手里出就按谁的样子飞
    await fx.fly({ html: cardHtml(e.card), back: backHtml(), flip: giver === 0 ? null : 'up', flipAt: 0.15, from: src, to: c, w: W, s0: giver === 0 ? u / W : 0.35, s1: 1, r0: 0, r1: 0, dur: ms(440), lift: 60 });
    if (t !== token) return;
    const card = restCard(cardHtml(e.card), c.x, c.y, W);
    if (!(await defuseHero(e, t, c, W, card))) return;
    card.remove();
    await defuseToDiscard(e, t, c, W);
  }
  /* 逗猫棒那张牌在桌心「展开」成画、挥逗猫棒让炸弹猫消气、再收回成那张牌（card 留在原处，调用的人自己处理）；返回 false = 中途被打断 */
  async function defuseHero(e, t, c, W, card) {
    const u = U();
    const SW = Math.min(innerWidth * 0.62, u * 3.4), SH = SW * 0.63;
    const scene = document.createElement('div');
    scene.className = 'zm-defuse-scene';
    scene.style.cssText = 'left:' + (c.x - SW / 2).toFixed(1) + 'px;top:' + (c.y - SH / 2).toFixed(1) + 'px;width:' + SW.toFixed(1) + 'px;opacity:0';
    scene.innerHTML = ART.hero();
    els.fly.appendChild(scene);
    snd('defuse');
    const k = W / SW, grow = ms(380);
    const base = card.style.transform;
    card.animate([{ transform: base + ' scale(1)', opacity: 1 }, { transform: base + ' scale(' + (SW / W * 0.7).toFixed(3) + ')', opacity: 0 }], { duration: grow, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    scene.animate([{ transform: 'scale(' + k.toFixed(3) + ')', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: grow, easing: 'cubic-bezier(.3,.8,.4,1.1)', fill: 'forwards' });
    const boom = scene.querySelector('.hero-boom'), wnd = scene.querySelector('.hero-wand');
    const dur = ms(1500);
    calmAvatar(e.seat, t, grow + dur * 0.62);
    if (!fx.reduce()) {
      if (wnd) wnd.animate([{ rotate: '-24deg' }, { rotate: '14deg', offset: 0.18 }, { rotate: '-14deg', offset: 0.36 }, { rotate: '12deg', offset: 0.54 }, { rotate: '-8deg', offset: 0.72 }, { rotate: '5deg', offset: 0.88 }, { rotate: '0deg' }], { duration: dur, delay: grow, easing: 'ease-in-out' });
      if (boom) boom.animate([
        { transform: 'scale(1.12) rotate(-4deg)' }, { transform: 'scale(1.06) rotate(4deg)', offset: 0.15 }, { transform: 'scale(1.08) rotate(-3deg)', offset: 0.3 },
        { transform: 'scale(1.0) rotate(2deg)', offset: 0.5 }, { transform: 'scale(.94) rotate(0deg)', offset: 0.75 }, { transform: 'scale(.92)' },
      ], { duration: dur, delay: grow, easing: 'ease-in-out', fill: 'forwards' });
    }
    fx.ring(c.x, c.y, { color: '#4f8a5f', size: SW * 1.2, width: 5, dur: 900, delay: grow + ms(450) });
    ['heart', 'note', 'heart', 'note', 'heart'].forEach((sh, i) => fx.float(c.x + (i - 2) * SW * 0.13, c.y - SH * 0.3, sh, { dy: -u * 1.1, dx: (i - 2) * 8, size: 16 + (i % 2) * 6, color: sh === 'heart' ? PINKS[i % 3] : '#4f8a5f', delay: grow + ms(250 + i * 160), dur: ms(1100) }));
    await wait(grow + dur);
    if (t !== token) { scene.remove(); card.remove(); return false; }
    // 画收回成那张牌
    const back = ms(320);
    scene.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(' + k.toFixed(3) + ')', opacity: 0 }], { duration: back, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
    await card.animate([{ transform: base + ' scale(' + (SW / W * 0.7).toFixed(3) + ')', opacity: 0 }, { transform: base + ' scale(1)', opacity: 1 }], { duration: back, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished.catch(() => {});
    scene.remove();
    if (t !== token) { card.remove(); return false; }
    return true;
  }
  /* 百变「急救」（2026-11-17 用户）：没逗猫棒、拿一对一样的牌顶——两张牌一左一右飞到桌心，往中间一合、闪一下变成一根逗猫棒，
   * 接着走平常逗猫棒救人那套（展开成画、挥棒消气、收回），最后逗猫棒又分回原来那两张、一起落进弃牌堆（弃牌堆里真的是这两张）。
   * 不再冒「急救！」字——两张合成一根就说明了一切 */
  async function animCatSave(e, t) {
    const u = U(), c = fx.center(els.center.getBoundingClientRect()), W = u * 1.2;
    const mine = e.seat === 0;
    const src2 = mine ? handRectOf(e.extra) : avPoint(e.seat);
    const src1 = takeDefuseCard(e);
    if (mine) { dropFromHand([e.extra]); renderHand(); } else if (ov) { ov.counts[e.seat] -= 1; renderSeat(e.seat); }
    const gap = W * 0.62, PL = { x: c.x - gap, y: c.y }, PR = { x: c.x + gap, y: c.y };
    const flyOpts = (id, from, to, d) => ({ html: cardHtml(id), back: backHtml(), flip: mine ? null : 'up', flipAt: 0.15, from, to, w: W, s0: mine ? u / W : 0.35, s1: 1, r0: 0, r1: d, dur: ms(440), lift: 60 });
    // keep：先落地的那张别消失（以前它落地就删、等另一张那 70ms 桌上空一块，会闪一下）
    const landed = await Promise.all([fx.fly(Object.assign(flyOpts(e.card, src1, PL, -8), { keep: true })), fx.fly(Object.assign(flyOpts(e.extra, src2, PR, 8), { delay: ms(70), keep: true }))]);
    const dropLanded = () => landed.forEach((n) => n && n.remove());
    if (t !== token) { dropLanded(); return; }
    /* 合成（2026-11-26 用户：原来两张一撞、直接换成逗猫棒，太糙）。四拍：
     * ① 共鸣：两张浮起一点、往里歪，牌边亮起绿金光，各自飘出几粒光点汇向中间，中间先亮起一团柔光
     * ② 合拢：两张沿小弧线加速靠拢、转正、收窄，越来越亮，在中间叠成一张
     * ③ 一闪：白金光团炸开 + 一圈光芒转着散开 + 光环 + 火花
     * ④ 现身：逗猫棒从光里侧着转过来（像翻面）、弹一下，一道高光从牌面扫过，身后的绿光慢慢收掉 */
    const lite = fx.reduce();
    const glowEl = (cls, size, bg) => { const g = document.createElement('div'); g.className = 'zm-flyer zm-save-' + cls; g.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + bg + ';left:' + (c.x - size / 2).toFixed(1) + 'px;top:' + (c.y - size / 2).toFixed(1) + 'px;opacity:0'; els.fly.appendChild(g); return g; };
    const aura = glowEl('aura', u * 3, 'radial-gradient(circle, rgba(233,212,106,.55) 0%, rgba(127,176,106,.32) 38%, rgba(127,176,106,0) 70%)');   // 中间那团柔光（垫在牌下面）
    const a = pinCard(cardHtml(e.card), PL.x, PL.y, W), b = pinCard(cardHtml(e.extra), PR.x, PR.y, W);
    a.style.rotate = '-8deg'; b.style.rotate = '8deg';
    dropLanded();
    const GLOW0 = '0 6px 16px rgba(29,27,24,.22), 0 0 0 0 rgba(233,212,106,0)';
    const GLOW1 = '0 8px 20px rgba(29,27,24,.18), 0 0 18px 4px rgba(233,212,106,.85)';
    const GLOW2 = '0 8px 22px rgba(29,27,24,.12), 0 0 30px 10px rgba(255,244,200,.95)';
    // ① 共鸣
    const hum = ms(lite ? 120 : 420);
    snd('whoosh');
    aura.animate([{ opacity: 0, scale: '0.4' }, { opacity: 0.85, scale: '0.8' }], { duration: hum, easing: 'ease-out', fill: 'forwards' });
    [[a, -1], [b, 1]].forEach(([el, sd]) => el.animate([
      { translate: '0 0', rotate: (sd * 8) + 'deg', boxShadow: GLOW0 },
      { translate: (sd * u * 0.06).toFixed(1) + 'px ' + (-u * 0.12).toFixed(1) + 'px', rotate: (-sd * 5) + 'deg', boxShadow: GLOW1 },
    ], { duration: hum, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' }));
    if (!lite) {
      // 光点：从两张牌身上飘出，绕一小段弧汇到中间
      for (let i = 0; i < 10; i++) {
        const sd = i % 2 ? 1 : -1, P0 = sd < 0 ? PL : PR, sz = 5 + (i % 3) * 2;
        const x0 = P0.x + (Math.random() - 0.5) * W * 0.7, y0 = P0.y + (Math.random() - 0.5) * W * 1.1;
        const mx = (x0 + c.x) / 2, my = Math.min(y0, c.y) - u * (0.25 + Math.random() * 0.3);
        const d = document.createElement('div');
        d.className = 'zm-flyer';
        d.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:radial-gradient(circle,#fffbe6 0%,#f3dd78 45%,rgba(127,176,106,0) 75%);opacity:0';
        els.fly.appendChild(d);
        const at = (x, y) => 'translate(' + (x - sz / 2).toFixed(1) + 'px,' + (y - sz / 2).toFixed(1) + 'px)';
        d.animate([{ transform: at(x0, y0) + ' scale(.4)', opacity: 0 }, { transform: at(mx, my) + ' scale(1.2)', opacity: 1, offset: 0.45 }, { transform: at(c.x, c.y) + ' scale(.5)', opacity: 0.2 }],
          { duration: ms(560), delay: ms(40 + i * 34), easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' }).finished.then(() => d.remove(), () => d.remove());
      }
    }
    await wait(hum);
    if (t !== token) { a.remove(); b.remove(); aura.remove(); return; }
    // ② 合拢：沿小弧线（先略往上拱、再落到中间）加速靠拢，转正、收窄、越来越亮
    const slide = ms(lite ? 160 : 340);
    snd('whoosh');
    aura.animate([{ opacity: 0.85, scale: '0.8' }, { opacity: 1, scale: '1.05' }], { duration: slide, easing: 'ease-in', fill: 'forwards' });
    const join = (el, sd) => el.animate([
      { translate: (sd * u * 0.06).toFixed(1) + 'px ' + (-u * 0.12).toFixed(1) + 'px', rotate: (-sd * 5) + 'deg', scale: '1 1', boxShadow: GLOW1, filter: 'brightness(1)' },
      { translate: (-sd * gap * 0.55).toFixed(1) + 'px ' + (-u * 0.2).toFixed(1) + 'px', rotate: (-sd * 3) + 'deg', scale: '0.94 1', boxShadow: GLOW1, filter: 'brightness(1.25)', offset: 0.6 },
      { translate: (-sd * gap).toFixed(1) + 'px ' + (-u * 0.04).toFixed(1) + 'px', rotate: '0deg', scale: '0.82 0.96', boxShadow: GLOW2, filter: 'brightness(2)' },
    ], { duration: slide, easing: 'cubic-bezier(.55,0,.85,.4)', fill: 'forwards' }).finished.catch(() => {});
    await Promise.all([join(a, -1), join(b, 1)]);
    if (t !== token) { a.remove(); b.remove(); aura.remove(); return; }
    // ③ 一闪
    snd('combo');
    const core = glowEl('core', u * 2.2, 'radial-gradient(circle, #fff 0%, rgba(255,248,214,.95) 22%, rgba(243,221,120,.55) 45%, rgba(243,221,120,0) 70%)');
    core.animate([{ opacity: 0, scale: '0.3' }, { opacity: 1, scale: '1', offset: 0.25 }, { opacity: 0, scale: '1.7' }], { duration: ms(560), easing: 'ease-out', fill: 'forwards' }).finished.then(() => core.remove(), () => core.remove());
    if (!lite) {
      const rays = glowEl('rays', u * 3.6, 'repeating-conic-gradient(from 0deg, rgba(255,240,170,.75) 0deg 7deg, rgba(255,240,170,0) 7deg 30deg)');
      rays.style.webkitMaskImage = rays.style.maskImage = 'radial-gradient(circle, #000 18%, rgba(0,0,0,.6) 40%, transparent 68%)';
      rays.animate([{ opacity: 0, scale: '0.3', rotate: '0deg' }, { opacity: 0.9, scale: '0.9', rotate: '25deg', offset: 0.3 }, { opacity: 0, scale: '1.3', rotate: '70deg' }], { duration: ms(820), easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).finished.then(() => rays.remove(), () => rays.remove());
    }
    fx.ring(c.x, c.y, { color: '#f3dd78', size: u * 2.8, width: 5, dur: ms(560) });
    fx.ring(c.x, c.y, { color: '#7fb06a', size: u * 2.0, width: 3, dur: ms(520), delay: ms(90) });
    fx.burst(c.x, c.y, { n: 16, shapes: ['star', 'dot'], colors: ['#4f8a5f', '#7fb06a', '#e9d46a', '#fff4c8'], radius: u * 1.3, size: [5, 13], life: 760, pattern: 'ring' });
    a.remove(); b.remove();
    // ④ 现身：从光里侧着转过来、弹一下，一道高光扫过牌面，身后绿光收掉
    const wand = pinCard(cardHtml(R.DEFUSE), c.x, c.y, W);
    wand.style.overflow = 'hidden';
    const shine = document.createElement('i');
    shine.style.cssText = 'position:absolute;inset:-10% -60%;background:linear-gradient(105deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.75) 50%,rgba(255,255,255,0) 60%);pointer-events:none;translate:-70% 0;z-index:2';
    wand.appendChild(shine);
    const rise = ms(lite ? 200 : 520);
    const show = wand.animate([
      { rotate: 'y 80deg', scale: '0.72', filter: 'brightness(2.4)', boxShadow: GLOW2 },
      { rotate: 'y -12deg', scale: '1.14', filter: 'brightness(1.35)', boxShadow: GLOW1, offset: 0.5 },
      { rotate: 'y 4deg', scale: '0.98', filter: 'brightness(1.08)', offset: 0.78 },
      { rotate: 'y 0deg', scale: '1', filter: 'none', boxShadow: GLOW0 },
    ], { duration: rise, easing: 'cubic-bezier(.25,.8,.35,1)' });
    if (!lite) shine.animate([{ translate: '-70% 0' }, { translate: '70% 0' }], { duration: ms(420), delay: rise * 0.45, easing: 'ease-in-out', fill: 'forwards' });
    aura.animate([{ opacity: 1, scale: '1.05' }, { opacity: 0, scale: '1.4' }], { duration: rise + ms(260), easing: 'ease-out', fill: 'forwards' }).finished.then(() => aura.remove(), () => aura.remove());
    await show.finished.catch(() => {});
    if (!lite) await wait(ms(200));
    shine.remove();
    wand.style.overflow = '';
    if (t !== token) { wand.remove(); return; }
    if (!(await defuseHero(e, t, c, W, wand))) return;
    /* 逗猫棒分回那两张，一起落进弃牌堆（2026-11-26 用户：拆开那段衔接不顺）。和合成那四拍倒着来、而且一口气连下去：
     * ① 侧身：身后绿金光重新亮起，逗猫棒侧过身去（转到侧面、变亮）——以前是整张泛白一闪、啪地换成两张，换牌那一下看得见
     * ② 分身：侧到最窄那一刻换成叠着的两张（同样侧着、同样亮，看不出接缝），一小团光 + 几粒光点
     * ③ 弹开：两张一边转回正面、一边沿小弧往两边上方分开，亮度退回去
     * ④ 归堆：弹到头不再「回弹—停住—再起飞」，从那儿慢起步直接划弧落进弃牌堆（第二张晚一点点），身后光收掉 */
    const lite2 = fx.reduce();
    const aura2 = glowEl('aura', u * 2.6, 'radial-gradient(circle, rgba(233,212,106,.5) 0%, rgba(127,176,106,.28) 38%, rgba(127,176,106,0) 70%)');
    const turn = ms(lite2 ? 100 : 240);
    aura2.animate([{ opacity: 0, scale: '0.6' }, { opacity: 0.9, scale: '1' }], { duration: turn, easing: 'ease-out', fill: 'forwards' });
    snd('whoosh');
    await wand.animate([
      { rotate: 'y 0deg', scale: '1', filter: 'none', boxShadow: GLOW0 },
      { rotate: 'y 86deg', scale: '1.05', filter: 'brightness(1.45)', boxShadow: GLOW1 },
    ], { duration: turn, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' }).finished.catch(() => {});
    wand.remove();
    if (t !== token) { aura2.remove(); return; }
    const a2 = pinCard(cardHtml(e.card), c.x, c.y, W), b2 = pinCard(cardHtml(e.extra), c.x, c.y, W);
    const core2 = glowEl('core', u * 1.5, 'radial-gradient(circle, #fff 0%, rgba(255,248,214,.9) 25%, rgba(243,221,120,.4) 50%, rgba(243,221,120,0) 70%)');
    core2.animate([{ opacity: 0.9, scale: '0.5' }, { opacity: 0, scale: '1.4' }], { duration: ms(420), easing: 'ease-out', fill: 'forwards' }).finished.then(() => core2.remove(), () => core2.remove());
    if (!lite2) fx.burst(c.x, c.y, { n: 10, shapes: ['dot', 'star'], colors: ['#e9d46a', '#fff4c8', '#7fb06a'], radius: u * 0.8, size: [4, 9], life: 520 });
    const spread = ms(lite2 ? 140 : 300), dx = u * 0.55, dy = -u * 0.2;
    const part = (el, sd) => el.animate([
      { translate: '0 0', rotate: 'y ' + (-sd * 86) + 'deg', scale: '1.05', filter: 'brightness(1.45)', boxShadow: GLOW1 },
      { translate: (sd * dx * 0.7).toFixed(1) + 'px ' + (dy * 1.1).toFixed(1) + 'px', rotate: 'z ' + (sd * 6) + 'deg', scale: '1.02', filter: 'brightness(1.12)', boxShadow: GLOW1, offset: 0.55 },
      { translate: (sd * dx).toFixed(1) + 'px ' + dy.toFixed(1) + 'px', rotate: 'z ' + (sd * 8) + 'deg', scale: '1', filter: 'brightness(1)', boxShadow: GLOW0 },
    ], { duration: spread, easing: 'cubic-bezier(.25,.7,.45,1)', fill: 'forwards' }).finished.catch(() => {});
    await Promise.all([part(a2, -1), part(b2, 1)]);
    if (t !== token) { a2.remove(); b2.remove(); aura2.remove(); return; }
    aura2.animate([{ opacity: 0.9, scale: '1' }, { opacity: 0, scale: '1.3' }], { duration: ms(420), easing: 'ease-out', fill: 'forwards' }).finished.then(() => aura2.remove(), () => aura2.remove());
    const to = discardRect();
    // 慢起步（弹开到头时速度是零，接着从零加速，不会一顿一冲）
    const smooth = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    const P1 = { x: c.x - dx, y: c.y + dy }, P2 = { x: c.x + dx, y: c.y + dy };
    const f1 = fx.fly({ html: cardHtml(e.card), from: P1, to, w: PU(), s0: W / PU(), s1: 1, r0: -8, r1: pileRot(e.card), dur: ms(420), lift: u * 0.35, swell: 0.03, easeFn: smooth });
    const f2 = fx.fly({ html: cardHtml(e.extra), from: P2, to, w: PU(), s0: W / PU(), s1: 1, r0: 8, r1: pileRot(e.extra), dur: ms(420), delay: ms(60), lift: u * 0.35, swell: 0.03, easeFn: smooth });
    a2.remove(); b2.remove();
    await Promise.all([f1, f2]);
    if (t !== token || !ov) return;
    ov.discard.push(e.card, e.extra);
    renderPiles();
    snd('thud');
  }
  /* 塞回去：背面的炸弹猫飞回牌堆，牌堆上半截掀开一道口、它滑进去、合上（不论塞在哪动画都一样，不泄露位置） */
  /* 联机塞回牌堆（2026-11-22 用户：单机很顺，联机像不知道往哪塞、卡一下）：点「塞进去」后要等服务器回话才开演，炸弹猫在桌心干等。
   * 现在一点就先飞到牌堆左边（和牌堆同高）悬着，回话后 animInsert 从这儿接着：掀开缝、滑进去 */
  function preInsert() {
    if (fx.reduce() || game.insPre) return;
    if (game.state && game.state.flux === 'exact') return;   // 火眼：正面朝上、按将来歪的方向塞（animInsert 里），不先飞牌背
    const node = game.boomNode, pu = PU(), dr = els.deck.getBoundingClientRect();
    if (!node || !dr.width) return;
    const from = node.getBoundingClientRect();
    node.style.visibility = 'hidden';
    game.insPre = { boom: node, p: fx.fly({ html: backHtml(), from, to: { x: dr.left + dr.width / 2 - pu * 0.95, y: dr.top + dr.height / 2 }, w: pu, s0: from.width / pu, s1: 1, r0: -10, r1: -8, dur: 380, lift: 40, keep: true, land: false }) };
  }
  function dropPreInsert() {
    const pi = game && game.insPre; if (!pi) return;
    game.insPre = null;
    if (pi.boom) pi.boom.style.visibility = '';
    pi.p.then((n) => n && n.remove());
  }
  async function animInsert(e, t) {
    const node = game.boomNode;
    game.boomNode = null;
    const pu = PU();
    const pi = e.seat === 0 ? game.insPre : null;
    game.insPre = null;
    const preNode = pi ? await pi.p : null;
    if (t !== token) { if (preNode) preNode.remove(); return; }
    // 炸弹猫在拆掉它的那个人那儿（头像），从那儿飞回牌堆；联机我自己塞的已经先飞到牌堆左边悬着了，从那儿接着
    const av = avEl(e.seat);
    const from = preNode ? (() => { const r = preNode.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : node ? node.getBoundingClientRect() : av ? av.getBoundingClientRect() : els.center.getBoundingClientRect();
    if (node) node.remove();
    if (preNode) preNode.remove();
    const s0 = preNode ? 1 : from.width / pu, r0 = preNode ? -8 : from.width ? -10 : 0, d1 = ms(preNode ? 220 : 380), lift1 = preNode ? 8 : 40;
    // 掀开的「盖子」= 缝上面那几层；炸弹猫从侧面插进这道缝：真的放进牌堆那一摞里（盖子压在它上面、下半截垫在它下面）。
    // 牌堆每一张都画成一层纸边（DOM 里从底往上）。
    // · 规则「看得出大概位置」（e.vis 有值，2026-11-14 用户，默认开）：缝开在真实高度——放最上就盖在最顶上、放最底就塞到最底下；
    //   自己塞的按自己挑的那张（e.pos），别人那儿按服务器给的粗略高度（最上 / 最底照实，中间取到 1/8），认真看能估出个大概
    // · 规则关着、或点的「随机」（e.vis 为空）：不管实际塞第几张，缝都开在同一个高度，谁也看不出位置
    const stack = els.deck.querySelector('.zm-deck-stack');
    const layers = Array.from(stack.children).filter((c) => c.matches('.zm-sheet, .zm-card')), L0 = layers.length;   // 只算牌堆本身的层（透视翻着的那张、火眼露出的那只不算一层）
    const faceEl = stack.querySelector('.zm-deck-face');
    const mateIns = isMate(e.seat) && e.pos != null && !e.rand, mine = e.seat === 0 || mateIns;
    // 组队（2026-11-18）：队友塞回去的位置我也知道——开缝开在真实那一张（上面），落定后队友报一声塞在第几张
    let above;
    if (e.at != null) above = Math.max(0, Math.min(L0, e.at));   // 百变「明塞」：缝开在真实那一张
    else if (mateIns) above = Math.max(0, Math.min(L0, e.pos));
    // 2026-11-25 用户：「塞回看不出位置」时我自己挑位置塞的，在我屏幕上照实开缝（我知道塞在哪；以前也开统一的缝，和自己选的对不上）。别人看到的照旧是统一的缝
    else if (e.seat === 0 && e.pos != null && !e.rand) above = Math.max(0, Math.min(L0, e.pos));
    else if (e.vis == null) above = L0 - Math.max(1, Math.floor(L0 * 0.55));
    else above = Math.max(0, Math.min(L0, mine && e.pos != null ? e.pos : Math.round(e.vis * L0)));   // 单机里机器猫的事件也带 pos，别人塞的一律只按粗略高度（组队：队友塞的我看得准）
    const lid = layers.slice(L0 - above);
    if (faceEl && lid.length) lid.push(faceEl);   // 透视：翻着的顶牌跟着盖子一起掀
    const atBottom = L0 > 0 && above >= L0;
    const floor = atBottom ? layers[0] : layers[L0 - above - 1];
    const slotR = (floor || els.deck).getBoundingClientRect();   // 缝在哪儿（插完会重画牌堆，先量下来给位置小标签用）
    /* 百变「火眼」（2026-11-22 用户：以前牌背朝上塞进去、塞完再突然歪出来露脸，前后不连贯）：大家都看得见塞在哪，
     * 炸弹猫一路正面朝上——飞到缝旁边（它将来往哪边歪露，就从哪边来），从侧面滑进那一层、直接停在歪着露一截的样子，和之后一直摆着的样子是同一个 */
    const open = e.at != null && !!(game.openKits && game.openKits.has(e.card));
    let grew = false;
    if (open && (above === 0 || !floor)) {
      // 塞在最上面（2026-11-22 用户在甲乙丙里挑甲）：正面朝上直接落到顶上，落下就是牌堆顶那张正面，不再演翻面
      game.faceQuiet = e.card;
      await fx.fly({ html: cardHtml(e.card), from, to: deckTopRect(), w: pu, s0, s1: 1, r0, r1: 0, dur: d1, lift: lift1 });
      if (t !== token) return;
      ov.topFace = faceTop(game.state);
    } else if (open) {
      const sx = kitSideFor(e.card, above) === -1 ? -1 : 1;
      lid.forEach((c) => c.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '6px -16px', rotate: '-8deg', offset: 0.3 }, { translate: '6px -16px', rotate: '-8deg', offset: 0.72 }, { translate: '0 0', rotate: '0deg' }], { duration: ms(900), easing: 'ease-in-out' }));
      const fr = floor.getBoundingClientRect(), off = pu * 1.02;
      const fl = await fx.fly({ html: cardHtml(e.card), from, to: { x: fr.left + fr.width / 2 + sx * off, y: fr.top + fr.height / 2 }, w: pu, s0, s1: 1, r0, r1: 0, dur: d1, lift: lift1, land: false, keep: true });
      if (t !== token) { if (fl) fl.remove(); return; }
      // 牌堆这时才多一层；炸弹猫那层就是它之后一直露着的那层（和 renderOpenKits 同一个摆法：从下往上数第 n-1-pos 层后面）
      ov.deckSize += 1; ov.kittens += 1; grew = true;
      renderPiles();
      const sheets = stack.querySelectorAll(':scope > .zm-sheet'), sh = sheets[sheets.length - above];
      let box = null;
      if (sh) {
        box = document.createElement('div');
        box.className = 'zm-deck-kit' + (sx < 0 ? ' is-left' : ''); box.dataset.id = e.card; box.dataset.pos = above;
        box.style.transform = sh.style.transform;
        box.innerHTML = cardHtml(e.card);
        sh.after(box);
        (game.kitShown = game.kitShown || new Set()).add(e.card);   // 已经歪着露出来了，renderOpenKits 不再重演一次
      }
      if (fl) fl.remove();
      if (box && !fx.reduce()) await box.firstElementChild.animate([{ translate: (sx * off / pu * 100).toFixed(1) + '% 0%', rotate: '0deg' }, { translate: (sx * 30) + '% 7%', rotate: (8 * sx) + 'deg', offset: 0.8 }, { translate: (24 * sx) + '% 6%', rotate: (7 * sx) + 'deg' }], { duration: ms(380), easing: 'cubic-bezier(.3,.7,.3,1)' }).finished.catch(() => {});
    } else if (!floor) {
      await fx.fly({ html: backHtml(), from, to: deckTopRect(), w: pu, s0, s1: 1, r0: preNode ? -8 : 0, r1: 0, dur: d1, lift: lift1 });
    } else {
      lid.forEach((c) => c.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '6px -16px', rotate: '-8deg', offset: 0.3 }, { translate: '6px -16px', rotate: '-8deg', offset: 0.72 }, { translate: '0 0', rotate: '0deg' }], { duration: ms(900), easing: 'ease-in-out' }));
      const fr = floor.getBoundingClientRect(), off = pu * 0.95;
      // 先飞到缝的左边
      await fx.fly({ html: backHtml(), from, to: { x: fr.left + fr.width / 2 - off, y: fr.top + fr.height / 2 - 2 }, w: pu, s0, s1: 1, r0, r1: -8, dur: d1, lift: lift1, land: false });
      if (t !== token) return;
      // 再换成牌堆里的一张，从左边滑进缝里
      const card = document.createElement('div');
      card.innerHTML = backHtml('is-inserting');
      const el = card.firstChild;
      // 塞到最底下：比最底那层再低一层，垫在整摞下面
      el.style.transform = atBottom ? 'translate(' + (DECK_LOOK.sx * pu).toFixed(2) + 'px,' + (DECK_LOOK.sy * pu).toFixed(2) + 'px)' : floor.style.transform || '';
      el.style.filter = 'drop-shadow(0 0 6px rgba(200, 70, 58, 0.55))';
      stack.insertBefore(el, atBottom ? layers[0] : lid[0] || null);
      await el.animate([{ translate: (-off) + 'px -2px', rotate: '-8deg' }, { translate: '0 -2px', rotate: '0deg' }], { duration: ms(300), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});
      el.remove();
    }
    if (t !== token) return;
    snd('insert');
    if (!grew) { ov.deckSize += 1; ov.kittens += 1; }
    renderPiles();
    fx.pop(els.deck, { scale: 1.05 });
    // 组队（2026-11-18 用户：聊天气泡不好看）：队友 / 我自己挑位置塞的，在牌堆旁边那道缝的高度挂一枚小标签，几秒后淡掉。
    // 靠后的说「倒数第几张 / 最后一张」——40 张里说「第 40 张」没参考价值
    if (teamGame() && e.pos != null && !e.rand && (mateIns || e.seat === 0)) insertTag(e.pos, e.size, slotR);
    // 随机塞的（点「随机」/ 到点自动塞）：谁也不知道在哪，挂一枚「随机」（2026-11-18 用户：丁的样子、写「随机」两个字）
    else if (teamGame() && e.rand && (isMate(e.seat) || e.seat === 0)) randTag();
    await wait(ms(260));
  }

  function insertTagText(pos, size) {
    const last = Math.max(0, size - 1), back = last - pos;
    if (pos <= 0) return T('ui.pos.top', '最上面');
    if (back <= 0) return T('ui.pos.last', '最后一张');
    // 倒数只用在最后那一小截（2026-11-18 用户定 15%、最多 5 张）：40 张里放第 21 张说「第 21 张」，第 36 张起才说「倒数第 5 张」；
    // 6 张时只有最后一张说「最后一张」，其余都正着数
    const k = Math.min(5, Math.max(1, Math.floor(size * 0.15)));
    return back < k ? T('ui.pos.fromBottom', '倒数第 {n} 张', { n: back + 1 }) : T('ui.pos.nth', '第 {n} 张', { n: pos + 1 });
  }
  function randTag() { insertTag(0, 0, null, T('ui.random', '随机')); }
  function insertTag(pos, size, slot, text, cls, icon) {
    const dr = els.deck.getBoundingClientRect();
    const tag = document.createElement('span');
    tag.className = 'zm-ins-tag' + (cls ? ' ' + cls : '');
    tag.innerHTML = '<i>' + (icon || ART.icon(R.BOOM)) + '</i>' + (text != null ? text : insertTagText(pos, size));
    // 挂在牌堆正上方、尖角朝下指着牌堆（左右两边手机上会压到侧边的人 / 弃牌堆）；位置靠文字说
    tag.style.left = Math.round(dr.left + dr.width / 2) + 'px';
    tag.style.top = Math.round(dr.top - 12) + 'px';
    void slot;
    els.fly.appendChild(tag);
    const keep = 2800, k = token;
    if (!fx.reduce()) tag.animate([{ opacity: 0, translate: '-50% calc(-100% + 8px)' }, { opacity: 1, translate: '-50% -100%' }], { duration: 220, easing: 'cubic-bezier(.3,.8,.4,1.2)', fill: 'backwards' });
    setTimeout(() => {
      if (!tag.isConnected) return;
      if (fx.reduce() || k !== token) { tag.remove(); return; }
      tag.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.then(() => tag.remove(), () => tag.remove());
    }, keep);
  }
  /* 出局：炸弹猫扑向那个人，大爆炸——更大的红光、黑毛、烟、冲击波；头像变灰冒黑烟，「炸毛」大章砸下来；
   * 他的手牌全翻开、一张张散落进弃牌堆 */
  /* 出局（2026-11-17 用户逐帧看过后定）：
   * ① 头像上那只炸弹猫「嘭」地炸开（头像还是炸弹猫，抖着、冒烟，不立刻变灰）
   * ② 手牌先走：我的从手牌区、别人的从头像里，一张张翻开落进弃牌堆
   * ③ 最后炸弹猫正面朝上、头像那么大，从头像上整个剥下来，落在弃牌堆最上面——它一离开，头像才变灰
   * ④ 整段播完，我自己出局的话手牌区才出那排「看谁」的小头像 */
  async function animOut(e, t) {
    // 最后一个出局（之后只剩赢家）：快进到这儿就停，最后这一炸和结算的聚光灯按原速放——让大家看清冠军是谁（2026-11-14 用户）
    if (ov && ov.alive.filter(Boolean).length <= 2 && game.turbo) { game.turboOff = true; setTurbo(false); }
    else if (ov && ov.alive.filter(Boolean).length <= 2) game.turboOff = true;
    if (window.ZhamaoAudio) window.ZhamaoAudio.knockedOut();
    const node = game.boomNode;   // （旧路径留着兜底：九命 / 急救之类没走到这儿；正常出局时为空）
    game.boomNode = null;
    if (node) node.remove();
    const avNode = e.seat === 0 ? els.me.querySelector('.zm-av') : avEl(e.seat);
    const a = avNode ? fx.center(avNode.getBoundingClientRect()) : avPoint(e.seat);
    const u = U();
    if (t !== token) return;
    snd('kaboom');
    // 2026-11-18 用户：炸开那一下头像就直接变灰；同时他的牌一张接一张翻进弃牌堆，炸弹猫就是这一串里的最后一张
    // （和别的牌同一个起点、同样大小、同样节奏，不再停一下再从头像上单独剥下来）
    bombAvatar(e.seat, false);
    ov.alive[e.seat] = false;
    fx.shake(els.table, { amp: 15, dur: 700, rot: 1 });
    fx.flash('rgba(200,70,58,.55)', 0, 1100);
    fx.ring(a.x, a.y, { color: '#c8463a', size: u * 5, width: 10, dur: 760 });
    fx.ring(a.x, a.y, { color: '#3a3632', size: u * 3.2, width: 6, dur: 640, delay: 120 });
    fx.burst(a.x, a.y, { n: 40, shapes: ['fur', 'fur', 'spike'], colors: FUR, radius: u * 2.6, size: [12, 34], alignOut: true, life: 1200, gravity: 50, pattern: 'ring' });
    fx.burst(a.x, a.y, { n: 20, shapes: ['star', 'dot'], colors: GOLDS.concat(['#c8463a']), radius: u * 2, size: [6, 20], life: 1200, delay: 100 });
    fx.smoke(a.x, a.y, { n: 12, spread: u * 0.8, size: [u * 0.7, u * 1.4], rise: 60, tint: 'dark', delay: 60 });
    fx.shake(seatEl(e.seat), { amp: 7, dur: 700, delay: 40 });
    ov.counts[e.seat] = 0;
    if (ov.turn === e.seat) ov.turn = -1;
    renderSeat(e.seat);
    const cards = e.cards || [];
    const pu = PU();
    const kit = game.state.discard[game.state.discard.length - 1];
    const withKit = kit != null && R.KIND_OF[kit] === R.BOOM && cards.indexOf(kit) < 0;
    const list = cards.filter((id) => id !== kit).concat(withKit ? [kit] : []);
    // 2026-11-18 用户：每张牌轮到它才出现、才起飞（以前先在起点摆着等：别人头像上挂着牌背、我的手牌原地歪着等）；
    // 落点按不震时的位置、按它落下后在堆顶的确切那一层算（以前起飞时量的是震歪的位置，落下后会挪一下）。
    // 炸弹猫绝不进手牌区（用户）：它一直在头像里，最后一个从头像出来（大家早看见了，正面）。
    // 别人出局：所有牌都从他头像里一张接一张冒出来、半路翻开，炸弹猫压轴。
    // 我出局（2026-11-18 用户挑丙）：手牌从手里原位依次飞走，紧接着炸弹猫从头像出来压轴（丁「先吸进头像再吐」没要）
    const mine = e.seat === 0;
    await wait(ms(220));   // 和「嘭」几乎同时：烟还没散，牌就一张张出来
    if (t !== token) return;
    const step = ms(80);
    let inAir = 0;
    await Promise.all(list.map((id, i) => wait(i * step).then(() => {
      if (t !== token) return null;
      let r = null;
      if (mine && id !== kit) { const c = handCard(id); if (c) { r = c.getBoundingClientRect(); c.style.visibility = 'hidden'; } }
      const faceUp = !!r || id === kit || mine;   // 从头像出来的：别人的牌半路翻开；炸弹猫和我自己的牌本来就是明的
      const to = discardSlot(inAir++);
      return fx.fly({
        html: cardHtml(id), back: backHtml(), flip: faceUp ? null : 'up', flipAt: 0.2,
        from: r || a, to, w: pu, s0: r ? r.width / pu : 0.35, s1: 1,
        r0: r ? 0 : (Math.random() - 0.5) * 50, r1: pileRot(id), dur: ms(id === kit ? 560 : 500), lift: r ? 50 + Math.random() * 30 : 60 + Math.random() * 40,
      }).then(() => { inAir--; if (t === token && ov) { ov.discard.push(id); renderPiles(); if (id === kit) snd('thud'); } });
    })));
    if (mine && ov) { ov.hand = []; renderHand({ flip: false }); }
    if (t !== token) return;
    if (!withKit && ov && kit != null && ov.discard[ov.discard.length - 1] !== kit) { ov.discard.push(kit); renderPiles(); }
    if (t !== token) return;
    bombAvatar(e.seat, false);
    ov.alive[e.seat] = false;
    renderSeat(e.seat);
    // 我正坐在他背后看，他也出局了：自动换到下一家还在场的（2026-11-17；以前视角停在空座位上）
    if (e.seat === viewSeat) { const nx = nextWatchable(e.seat, ov.alive); watch(nx > 0 ? nx : viewSeat); }
    if (e.seat === 0) els.app.classList.add('is-spectator');
    await wait(ms(300));
    if (e.seat === 0) {
      game.fastOut = true;
      if (WAL && !game.online) WAL.settle(game);   // 我出局了：名次已定，马上结算（不用等机器猫打完）
      if (mateWatching()) { const lm = liveMate(); if (lm >= 0 && viewSeat !== lm) watch(lm); }
      renderBand();
      renderHand();   // ④ 这时候才出「看谁」的小头像
    }
  }

  /* 「作废只在和我有关时问」（设置里，默认关）：和我有关 = 这张牌是我出的（被人作废了，我可能想作废回去）、
   * 指着我（索要 / 偷牌 / 点名 / 交换 / 自由甩锅）、或者是甩锅而下一家就是我。别的（洗牌、窥探、改命、跳过、抽底、互相甩锅 / 偷牌……）不问，例外见 alwaysAsk */
  function aboutSeat(p, me, alive, dir) {
    if (!p) return true;
    if (p.by === me || p.target === me) return true;
    // 甩锅给「下家」：要按当前出牌方向找（2026-11-15 用户：别人甩锅到我头上却不问我作废——转向 / 逆行以后下家在另一边，以前一律往座位号大的那边数）
    if (p.type === R.ATTACK) { const n = alive.length, d = dir === -1 ? -1 : 1; for (let k = 1; k < n; k++) { const x = (((p.by + d * k) % n) + n) % n; if (alive[x]) return x === me; } }
    return false;
  }
  /* 什么时候问我要不要出「作废」——设置里只剩一个开关（2026-11-26 用户定）：「只在直接和我相关时询问「作废」」，默认打开。
   * 开着（settings.nopeOthers 不是 true）= 只问和我有关的：我出的、指着我的、甩到我头上的（组队时含队友）；关掉 = 谁出牌都问。
   * 以前的细项（挑哪几种也问、牌堆剩两成时全都问）拿掉了。没设过的人（undefined）按新默认「只问和我有关的」；
   * 自己在设置里动过的保留：存的 false = 只问和我有关、true = 全都问 */
  const nopeAskMode = () => (settings.nopeOthers === true ? 'all' : 'mine');
  /* 就算和我无关也照问（2026-11-26 用户定）：五猫捡弃牌（能捡回逗猫棒 / 作废）、百变牌（全桌规则都变）、只剩两个人（对手出的每张牌都冲着我）。
   * 只看牌型和还剩几个人——都是公开信息，联机时「问了我」不泄露任何东西 */
  const alwaysAsk = (p, alive) => p.type === 'five' || p.type === R.FLUX || alive.filter(Boolean).length <= 2;
  function nopeAsks(p, me, alive, dir) {
    return nopeAskMode() === 'all' || !p || aboutSeat(p, me, alive, dir) || alwaysAsk(p, alive);
  }
  // 组队：和队友有关（队友出的、指着队友、甩到队友头上）也算和我有关——帮队友挡一下 / 别挡了队友（2026-11-15 巡查）
  /* 组队：最后出手的是队友（他刚出的牌，或他刚作废回来的）——我再作废就是拆队友的台，不问；只有冲着我来的（指着我 / 甩锅甩到我头上）照问。
   * 2026-11-21 用户联机组队：出牌后要等两秒左右才生效——原来队友出的每张牌，手里有作废的队友都被问一遍「要不要作废」，
   * 服务器要等他点掉或者导火索烧完（3–5 秒）才结算，而出牌的人这边看不到导火索，只觉得卡 */
  const lastBy = (p) => (p.nopes.length ? p.nopes[p.nopes.length - 1].seat : p.by);
  function hitsMe(p, me, alive, dir) {
    if (p.target === me) return true;
    return p.type === R.ATTACK && p.by !== me && aboutSeat({ type: p.type, by: p.by, target: -1 }, me, alive, dir);
  }
  // 「全都问」也照这条：问我要不要作废自己队友的牌没有意义，只会让全桌白等
  const askMeNope = (s) => {
    const p = s.pending, team = R.isTeam && R.isTeam(s) && !!p;
    if (team && lastBy(p) !== 0 && R.teamOf(s, lastBy(p)) === R.teamOf(s, 0)) return hitsMe(p, 0, s.alive, s.dir);
    return nopeAsks(p, 0, s.alive, s.dir) || (team && nopeAskMode() !== 'all' && R.matesOf(s, 0).some((m) => s.alive[m] && aboutSeat(p, m, s.alive, s.dir)));
  };
  /* ───── 反应窗：出完牌大家决定要不要「不行」 ───── */
  function clearReactTimer() { if (reactTimer) { clearTimeout(reactTimer); reactTimer = null; } }
  function reactPhase() {
    const s = game.state, P = pace();
    busy = true;
    game.lastNopes = s.pending.nopes.length;
    if (!els.stage.querySelector('.zm-stage-inner')) { showStage(s.pending, false); if (s.pending.nopes.length) stageVerdict(s.pending.nopes.length); }
    // 机器人：第一个想作废的人，过一会儿出手（我可以抢在前面）
    let botSeat = -1;
    for (const x of R.awaitingReaction(s)) {
      if (x === 0 && !autopilot && !game.spectator) continue;
      let want;
      if (tut && tut.botNope) want = tut.botNope(s, x);
      if (want == null && (Array.isArray(game.forceNope) ? game.forceNope[0] === x : game.forceNope === x) && R.canNope(s, x)) want = true;   // 本机演示：指定这只（这一串）机器猫一定作废（__zmDebug.demo；真作废了才清掉 / 轮到下一个）
      if (want == null) want = R.canNope(s, x) && AI.decide(s, x, game.tiers[x] || 'normal').type === 'nope';
      if (want) { botSeat = x; break; }
    }
    const meCan = !autopilot && !game.spectator && R.canNope(s, 0) && R.awaitingReaction(s).indexOf(0) >= 0 && (askMeNope(s) || !!tut);
    const tutWaitMe = tut && tut.mustNope && tut.mustNope(s);
    const botDelay = botSeat >= 0 ? P.botNope[0] + Math.random() * (P.botNope[1] - P.botNope[0]) : Infinity;
    /* 不问我时（我没作废牌 / 是我自己的牌 / 不该问我）：原来窗口只开 quiet（约 0.26 秒），机器猫要「想」0.5–1 秒才作废，永远赶不上——
     * 单机里只要我不能表态，机器猫就从来不会作废（自上线起的 bug，2026-11-18 查出）。现在有机器猫想作废时，窗口等它想完 */
    const windowMs = meCan ? (tutWaitMe ? Infinity : P === PACE ? nopeWindowMs(s) + (s.pending.nopes.length ? NOPE_HOLD_MS : 0) : P.react || 1400) : botSeat >= 0 ? botDelay : P.quiet;
    const fireAt = Math.min(botDelay, windowMs);
    const now = performance.now();
    game.reactPlan = { botSeat, botAt: now + botDelay, windowEnd: now + windowMs };
    reactOpen = meCan;
    busy = !meCan;
    renderHand({ flip: false });
    renderBand();
    fuse(meCan ? windowMs : 0);
    if (meCan) { startNopeHold(s); snd('ask'); idle(); }
    if (!isFinite(fireAt)) return; // 教程：等我自己点
    const k = token;
    reactTimer = setTimeout(() => {
      if (k !== token || game.state.phase !== 'react') return;
      reactTimer = null;
      if (botSeat >= 0 && botDelay <= windowMs) { if (botSeat === 0) autoAct = true; doNope(botSeat); }
      else closeReact();
    }, fireAt);
  }
  // 我点「取消」：不作废了。还有机器猫打算作废、而且它本来就赶得上 → 等它；否则马上结算，不用等导火索烧完
  function passReact() {
    const s = game.state;
    if (s.phase !== 'react' || !reactOpen) return;
    if (game.online) { clearTimeout(reactAuto); reactOpen = false; renderBand(); renderHand({ flip: false }); snd('untap'); onlineMove({ type: 'pass' }); return; }
    if (tut && tut.mustNope && tut.mustNope(s)) { shake(els.drawBtn); return; }
    clearReactTimer();
    reactOpen = false;
    busy = true;
    stopFuse();
    renderBand();
    renderHand({ flip: false });
    snd('untap');
    const p = game.reactPlan || { botSeat: -1 };
    const k = token;
    if (p.botSeat >= 0 && p.botAt <= p.windowEnd) {
      reactTimer = setTimeout(() => { if (k === token && game.state.phase === 'react') { reactTimer = null; doNope(p.botSeat); } }, Math.max(0, p.botAt - performance.now()));
    } else closeReact();
  }
  async function doNope(seat) {
    if (game && (Array.isArray(game.forceNope) ? game.forceNope[0] === seat : game.forceNope === seat)) { if (Array.isArray(game.forceNope)) { game.forceNope.shift(); if (!game.forceNope.length) game.forceNope = null; } else game.forceNope = null; }
    if (game.online) { if (seat === 0) { reactOpen = false; renderBand(); renderHand({ flip: false }); onlineMove({ type: 'nope' }); } return; }
    clearReactTimer();
    const s = game.state, t = token;
    reactOpen = false;
    busy = true;
    stopFuse();
    snapshot();
    renderBand();
    renderHand({ flip: false });   // 手里「作废」那几张的紫光立刻停
    const ev = R.nope(s, seat);
    if (HL) HL.act(game, seat, { type: 'nope' }, seat === 0 && autopilot ? 1 : 0);
    if (WAL) WAL.act(game, seat, { type: 'nope' }, seat === 0 && autopilot);
    await playEvents(ev, t);
    if (t !== token) return;
    afterEvents(ev);
  }
  async function closeReact() {
    clearReactTimer();
    const s = game.state, t = token;
    reactOpen = false;
    busy = true;
    stopFuse();
    snapshot();
    renderBand();
    renderHand({ flip: false });   // 导火索烧完：紫色按钮、手里「作废」的紫光一起停
    if (HL) HL.close(game);
    for (const x of R.awaitingReaction(s)) R.pass(s, x);
    const ev = R.closeReaction(s);
    await playEvents(ev, t);
    if (t !== token) return;
    afterEvents(ev);
  }

  /* ───── 我的操作 ───── */
  /* ───── 百变「急救」：自己挑一对顶逗猫棒（2026-11-26 用户） ─────
   * 摸到炸弹猫、没逗猫棒、手里凑得出一对：手牌里能凑对的亮着（凑不上的变灰），先替我抬起最便宜的那一对（catPairIds），点别的牌换；
   * 「合成」键是绿色的命、倒计时一点点变灰，点了就演两张合成逗猫棒；到点没点 = 交抬着的那一对（没抬成对就交最便宜的），不会因为超时炸死 */
  function saveCandidates(hand) {
    const ok = new Set();
    for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) if (R.savePairOk(hand, [hand[i], hand[j]])) { ok.add(hand[i]); ok.add(hand[j]); }
    return ok;
  }
  let saveTimer = 0;
  function saveStart(lim) {
    const hand = game.state.hands[0];
    mode = 'save';
    selected = (R.catPairIds(hand) || []).slice();
    clearTimeout(saveTimer);
    renderAll();
    snd('ask');
    const k = token, btn = els.playBtn;
    if (!(lim > 0)) return;
    const life = btn.querySelector('.zm-life i');
    if (life) life.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: lim, easing: 'linear', fill: 'forwards' });
    if (lim > 3000) setTimeout(() => { if (k === token && mode === 'save') btn.classList.add('is-hurry'); }, lim - 3000);
    saveTimer = setTimeout(() => { if (k === token && mode === 'save') saveCommit(true); }, lim);
  }
  function saveTap(id, node) {
    const hand = game.state.hands[0];
    if (!saveCandidates(hand).has(id)) { shake(node); return; }
    const i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1);
    else if (selected.length === 1 && R.savePairOk(hand, [selected[0], id])) selected.push(id);
    else {
      // 换一对：点的这张能和谁凑（优先一样的那张），一起抬起来
      const mate = hand.find((x) => x !== id && R.KIND_OF[x] === R.KIND_OF[id]) ?? hand.find((x) => x !== id && R.savePairOk(hand, [id, x]));
      selected = mate != null ? [id, mate] : [id];
    }
    snd(i >= 0 ? 'untap' : 'tap');
    renderHand({ flip: false });
    renderBand();
    if (selected.length === 2) snd('combo');
  }
  function saveCommit(auto, decline) {
    if (mode !== 'save') return;
    const hand = game.state.hands[0];
    const cards = selected.length === 2 && R.savePairOk(hand, selected) ? selected.slice() : null;
    if (!auto && !decline && !cards) { shake(els.playBtn); return; }
    clearTimeout(saveTimer);
    mode = null;
    if (auto) { timeouts += 1; autoAct = true; }
    const d = decline ? { type: 'save', no: true } : cards ? { type: 'save', cards } : { type: 'save' };
    apply(0, d);
    if (auto && timeouts >= 2) setAutopilot(true);
  }
  function shake(node) { if (!node) return; node.classList.remove('zm-shake'); void node.offsetWidth; node.classList.add('zm-shake'); }
  function onCardTap(id, node) {
    const s = game.state;
    if (!s.alive[0] || game.spectator) return;   // 观战时看到的是别人的牌，点了没用
    if (autopilot) { setAutopilot(false); return; }   // 托管中点手牌 = 收回来自己打
    // 别人出牌后点手里的「作废」= 打出去（问到我时会自动抬一张，所有作废都发紫光）
    // （2026-11-15 以前是一点就打、2026-11-16 改成只抬起 / 放下；2026-11-17 朋友局又反馈「再点一下以为是出牌、结果放下了」，用户定：点抬起的 = 打出）
    // 2026-11-17 拟人模拟截图：手里两张作废时两张都在发紫光上下跳，点没抬起的那张只是换着抬，像没反应——作废牌都一样，问我的时候点哪张都直接打出
    if (s.phase === 'react' && reactOpen && R.KIND_OF[id] === R.NOPE) { if (nopeHeld()) { shake(node); return; } pressNope(); return; }
    nopeLift.clear();
    if (game.favorPre != null) return;   // 索要合一：已经点了给牌，等它飞
    if (favorAsk()) { selected = selected[0] === id ? [] : [id]; snd('tap'); renderHand({ flip: false }); renderBand(); return; }
    if (mode === 'give') { selected = selected[0] === id ? [] : [id]; snd('tap'); renderHand(); renderBand(); return; }
    if (mode === 'save') { saveTap(id, node); return; }
    if (mode === 'target') { cancelTarget(); }
    if (!myTurnToAct()) { shake(node); return; }
    const i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1); else selected.push(id);
    snd(i >= 0 ? 'untap' : 'tap');
    const wasCombo = !!(selected.length > 1 && classifyMine(selected));
    renderHand();
    renderBand();
    if (wasCombo) snd('combo');
  }
  function onDraw() {
    const s = game.state;
    if (autopilot) { setAutopilot(false); return; }
    if (mode === 'save') { saveCommit(false, true); return; }
    if (s.phase === 'react' && reactOpen) { passReact(); return; }
    if (!s.alive[0] && s.phase !== 'over') { return; }   // 出局后「摸牌」那个键已经收起，不能再从这儿直接开下一局   // 联机里出局了不能就地开单机局（还在房间里）
    if (!myTurnToAct()) return;
    if (tut && tut.allow && !tut.allow({ type: 'draw' })) { shake(els.drawBtn); return; }
    selected = [];
    renderHand();
    apply(0, { type: 'draw' });
  }
  function onPlay() {
    const s = game.state;
    if (mode === 'save') { saveCommit(false); return; }
    if (favorAsk()) {   // 索要合一：先记下给哪张，窗口一关直接给
      if (selected.length !== 1) return;
      game.favorPre = selected[0];
      if (game.online) { clearTimeout(reactAuto); reactOpen = false; stopFuse(); renderBand(); renderHand({ flip: false }); snd('untap'); onlineMove({ type: 'pass', give: game.favorPre }); return; }
      passReact(); return;
    }
    if (mode === 'give') {
      if (selected.length !== 1) return;
      if (tut && tut.allow && !tut.allow({ type: 'give', card: selected[0] })) { shake(els.playBtn); return; }
      const id = selected[0];
      apply(0, { type: 'give', card: id });
      return;
    }
    if (!myTurnToAct()) return;
    const cards = selected.slice();
    const c = classifyMine(cards);
    if (!c) return;
    const go = (target, named) => {
      const d = { type: 'play', cards, target, named };
      if (!R.checkPlay(s, 0, cards, d)) { shake(els.playBtn); return; }
      if (tut && tut.allow && !tut.allow(d)) { shake(els.playBtn); renderBand(); return; }
      apply(0, d);
    };
    if (tut && tut.allow && !tut.allow({ type: 'play', cards, preview: true })) { shake(els.playBtn); return; }
    const withName = (target) => { if (c.needsName) nameDialog((k) => go(target, k)); else go(target); };
    if (c.needsTarget) {
      const ts = R.validTargets(s, 0, c.type);
      if (ts.length === 1) withName(ts[0]);
      else previewThenPick(cards, c, ts, withName);
    } else go();
  }
  /* 要指定人的牌：先把牌飞到桌子中间摆好（还没真出），落定以后可选的人头像才一个个亮起来、跳一下，提示去点头像；
   * 点了人才真的出（从桌上这个位置接着演）；「取消」/ 点空白 = 牌飞回手里 */
  let preview = null;
  async function previewThenPick(cards, c, ts, cb) {
    const t = token;
    busy = true;
    const rects = cards.map((id) => handRectOf(id));
    cards.forEach((id) => handOut.add(id));
    selected = [];
    renderHand();   // 剩下的牌滑过去收拢
    showStage({ by: 0, type: c.type, cards, target: -1, named: null, nopes: [] }, true);
    els.stage.classList.add('is-preview');
    preview = { cards };
    snd('whoosh');
    const su = SU();
    await Promise.all(cards.map((id, i) => {
      const target = stageCard(id);
      if (!target) return null;
      const to = target.getBoundingClientRect(), rot = (i - (cards.length - 1) / 2) * 5;
      return fx.fly(leaveWild(id, { html: cardHtml(id), from: rects[i], to: { x: to.left + to.width / 2, y: to.top + to.height / 2 }, w: su, s0: rects[i].width / su, s1: 1, r0: 0, r1: rot, dur: ms(380), delay: i * ms(60), lift: 70 }))
        .then(() => { if (t === token) target.classList.remove('is-incoming'); });
    }));
    if (t !== token || !preview) return;
    snd('thud');
    busy = false;
    const early = preview.tap;   // 牌还在往桌上飞时就点了头像：落定后直接当选了他（见 onSeatTap）
    pickTarget(ts, (seat) => {
      // 记下桌上这几张的位置：真出牌时从这里接着演，不再从手里飞一遍
      const m = {};
      for (const id of cards) { const el = stageCard(id); if (el) m[id] = el.getBoundingClientRect(); }
      game.previewSrc = m;
      preview = null;
      els.stage.classList.remove('is-preview');
      cb(seat);
    });
    if (early != null && ts.indexOf(early) >= 0) onSeatTap(early);
  }
  function endPreview() {   // 不出了：桌上的牌飞回手里原位
    if (!preview) return;
    const cards = preview.cards;
    preview = null;
    game.previewSrc = null;
    const from = {};
    for (const id of cards) { const el = stageCard(id); if (el) from[id] = el.getBoundingClientRect(); }
    clearStage();
    els.stage.classList.remove('is-preview');
    cards.forEach((id) => handOut.delete(id));
    renderHand();   // 别的牌滑开、让出原位，桌上的牌飞回来
    if (fx.reduce()) return;
    for (const id of cards) {
      const c = handCard(id), f = from[id];
      if (!c || !f) continue;
      const r = c.getBoundingClientRect();
      c.animate([{ transform: 'translate(' + (f.left - r.left).toFixed(1) + 'px,' + (f.top - r.top).toFixed(1) + 'px) scale(' + (f.width / r.width).toFixed(3) + ')' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,.8,.4,1)', composite: 'add' });
    }
  }
  function pickTarget(ts, cb) {
    mode = 'target';
    targetCb = cb;
    let k = 0;
    // 一个个亮起来的先后顺着出牌方向（2026-11-14 用户：以前总是从右往左）：座位号变大 = 出牌方向 1 往下传，方向 -1 就倒过来亮
    const n = game.state.n, order = Array.from({ length: n - 1 }, (_, i) => (dirNow() === 1 ? i + 1 : n - 1 - i));
    if (ts.indexOf(0) >= 0) order.push(0);   // 自由甩锅能甩给自己：自己最后亮；别的牌不指自己，自己的头像也不变暗
    for (const seat of order) {
      const b = seatEl(seat), on = ts.indexOf(seat) >= 0;
      b.classList.toggle('is-target', on);
      b.classList.toggle('is-target-off', !on);
      if (on && !fx.reduce()) {   // 一个个亮起来、跳一下，外面荡出一圈金光
        const a = avPoint(seat), d = k++ * 90;
        fx.pop(b.querySelector('.zm-av'), { scale: 1.25, dur: 380, delay: d });
        fx.ring(a.x, a.y, { color: '#c9a96e', size: 120, width: 4, dur: 600, delay: d });
      }
    }
    snd('ask');
    renderBand();
  }
  function cancelTarget() {
    mode = null; targetCb = null;
    pickSeatEls().forEach((b) => b.classList.remove('is-target', 'is-target-off'));
    endPreview();
    renderBand();
  }
  /* 观战：我已经出局（单机）→ 点一只还在场的机器猫，整张桌子转到它的视角（它坐到底下，看到的和它自己看到的一样，只是没有操作键）；
   * 点底下的它 / 点我自己 = 回到我的座位，点别的 = 换人。seat 是现在桌上的座位号。
   * now：我自己点的——正在播的动画直接收掉、马上转；动画里自动换的（被看的那只出局了）等这一串播完再转 */
  function watch(seat, now) {
    if (!game || game.online || !game.state) return;
    const n = game.state.n, cur = game.pov || 0;
    const want = seat === viewSeat || (game.spectator && seat === meSeat()) ? 0 : (seat + cur) % n;
    if (!now && evPlaying) { game.povWant = want; return; }
    if (want === cur) return;
    switchPov(want);
  }
  // 单机局面按座位转一圈：新的 j 号 = 原来的 (j + d) 号（座位号全换、谁先谁后不变，引擎和机器猫照常算）
  const rotSeats = (a, d) => (Array.isArray(a) && d % a.length ? a.map((_, j) => a[(j + d) % a.length]) : a);
  function rotState(s, d) {
    const n = s.n;
    d = ((d % n) + n) % n;
    if (!d) return s;
    const f = (x) => (typeof x === 'number' && x >= 0 ? (x - d + n) % n : x);
    const by = (o, keys) => { if (!o) return o; const c = Object.assign({}, o); keys.forEach((k) => { c[k] = f(c[k]); }); return c; };
    const p = s.pending;
    return Object.assign({}, s, {
      hands: rotSeats(s.hands, d), alive: rotSeats(s.alive, d), outOrder: s.outOrder.map(f),
      turn: f(s.turn), winner: f(s.winner), cowCut: f(s.cowCut), hotGiven: f(s.hotGiven),
      pending: p ? Object.assign(by(p, ['by', 'target']), { nopes: p.nopes.map((x) => Object.assign({}, x, { seat: f(x.seat) })), passed: p.passed.map(f) }) : p,
      give: by(s.give, ['from', 'to']), pick: by(s.pick, ['by']), defuse: by(s.defuse, ['by']), alter: by(s.alter, ['by']), steal: by(s.steal, ['by', 'from']),
      ins: by(s.ins, ['by']), peek: by(s.peek, ['by']), rescue: by(s.rescue, ['by', 'for']),
      nineUsed: rotSeats(s.nineUsed, d), saveUsed: rotSeats(s.saveUsed, d), teams: rotSeats(s.teams, d), noHelp: rotSeats(s.noHelp, d), roles: rotSeats(s.roles, d), roleUsed: rotSeats(s.roleUsed, d),
      memo: rotSeats(s.memo, d).map((m) => Object.assign({}, m, { hands: rotSeats(m.hands, d) })),
    });
  }
  // 转到 k 号（原来的座位号）的视角：和联机换视角一样——正在播的收掉，按现在的局面重摆，每家头像从旧位置滑到新位置，再接着打
  function switchPov(k) {
    const n = game.state.n, cur = game.pov || 0, d = (k - cur + n) % n;
    game.povWant = null;
    if (!d) return;
    const before = spotsBy((l) => (l + cur) % n);
    resetTable();
    game.state = rotState(game.state, d);
    game.bots = rotSeats(game.bots, d);
    game.tiers = rotSeats(game.tiers, d);
    if (game.attackSeat >= 0) game.attackSeat = (game.attackSeat - d + n) % n;
    game.pov = k;
    game.spectator = k !== 0;
    viewSeat = k ? 0 : -1;
    lastCue = '';
    els.app.classList.toggle('is-watching', !!k);
    els.app.classList.toggle('is-spectator', !game.state.alive[meSeat()]);
    els.me.classList.toggle('is-watched', !!k);
    buildSeats();
    renderAll();
    turnTable(before, (l) => (l + k) % n);
    busy = true;
    schedule(fx.reduce() ? 120 : 480, step);   // 桌子转完（滑 0.46 秒）再接着打
  }
  // 我出局了（不是纯观战）、这一局还没完、也还没坐到谁背后
  function outIdle() {
    if (!game || !game.state || game.tutorial || game.dealing || game.state.phase === 'over') return false;
    if (game.online) { const g = G(), st = online && online.st; return !!(g && st && !game.spectator && st.mySeat >= 0 && g.st.alive && !g.st.alive[st.mySeat] && !g.over && !!game.fastOut); }   // fastOut：我那一下出局动画播完了（按快照摆进来时已经置上）
    return !game.state.alive[0] && viewSeat < 0 && !!game.fastOut;   // fastOut：我那一下出局动画播完了
  }
  function watchFromOut(seat) {
    if (!game || !game.state.alive[seat]) return;
    if (game.online) onlineView(srvOf(seat)); else watch(seat, true);
  }
  // 空出来的手牌区：一排还在场的人的小头像（和上面座位同一个左右顺序）
  function watchPickHtml() {
    const s = game.state, out = [];
    /* 2026-11-26 用户：观战时有的机器猫头像在不停轮换。手牌区每走一步整排重画，以前每次都现量头像的屏幕位置排序——
     * 桌子一圈左右两列的人横坐标几乎一样，轮到谁时头像在呼吸 / 抖 / 弹，差那几像素就前后对调，看着像头像在换。
     * 现在量座位（不量正在动的头像）、横坐标按 16px 一档、同档按上下，排好记住；还在场的人变了 / 换视角 / 转屏才重排 */
    const live = []; for (let j = 1; j < s.alive.length; j++) if (s.alive[j] && seatEl(j)) live.push(j);
    const key = (game.pov || 0) + '|' + live.join(',');
    if (!game.watchOrd || game.watchOrd.key !== key) {
      const pos = new Map(live.map((j) => { const r = seatEl(j).getBoundingClientRect(); return [j, [Math.round((r.left + r.width / 2) / 16), r.top + r.height / 2]]; }));
      game.watchOrd = { key, seats: live.slice().sort((a, b) => pos.get(a)[0] - pos.get(b)[0] || pos.get(a)[1] - pos.get(b)[1]) };   // 和上面座位从左到右一个顺序
    }
    const t0 = (performance.now() / 1000) % 2.4;   // 每次重画接着上一拍浮，不从头跳（2.4 秒 = zm-watch-bob 一个来回）
    game.watchOrd.seats.forEach((j, i) => out.push('<button type="button" class="zm-watch-pick" data-watch="' + j + '"><span class="zm-wp-av" style="animation-delay:' + (i * 0.3 - t0).toFixed(2) + 's">' + avatarHtml(j) + '</span></button>'));
    return out.length ? '<div class="zm-watch-row">' + out.join('') + '</div>' : '';
  }
  /* 2026-11-26 用户：9 人局我出局后剩 8 个人，一排 8 颗 48px 头像手机上放不下。
   * 不按屏幕比例写死几套，直接量手牌区这块实际有多宽多高，试 1 / 2 / 3 行，挑头像能最大的那种（一样大就少分行）：
   * 手机竖屏人多 → 两行（8 人 4+4，7 人 4+3 居中）；横屏 / 平板 / 人少 → 一行；再窄再矮也只是头像缩小，不会出屏 */
  function fitWatchRow() {
    const row = els.hand.querySelector('.zm-watch-row');
    if (!row) return;
    const n = row.children.length;
    const W = els.hand.clientWidth - 12, H = els.hand.clientHeight - 12;   // 留出上下浮动 4px + 头像外圈 2px
    if (W <= 0 || H <= 0) return;
    const GX = 0.29, GY = 0.16, MAX = 48;   // 横向间距 ≈ 14/48；两行之间收紧一些
    let best = null;
    for (let r = 1; r <= Math.min(n, 3); r++) {
      const c = Math.ceil(n / r);
      if (r > 1 && Math.ceil(n / (r - 1)) === c) continue;   // 多分一行列数不变 = 白占高度
      const size = Math.min(MAX, W / (c + (c - 1) * GX), H / (r + (r - 1) * GY));
      if (!best || size > best.size + 1) best = { r, c, size };
    }
    const sz = Math.max(20, Math.floor(best.size));
    row.style.setProperty('--wp', sz + 'px');
    row.style.setProperty('--wpx', Math.round(sz * GX) + 'px');
    row.style.setProperty('--wpy', Math.round(sz * GY) + 'px');
    row.style.setProperty('--wpc', best.c);
    row.classList.toggle('is-rows', best.r > 1);
  }
  // 从 seat 往下数，第一家还在场的（不算我自己）；没有 = -1
  function nextWatchable(seat, alive) {
    const n = alive.length;
    for (let k = 1; k < n; k++) { const j = (seat + k) % n; if (j !== 0 && alive[j]) return j; }
    return -1;
  }
  function onSeatTap(seat) {
    if (game && game.online && !game.dealing && (game.spectator || !game.state.alive[0]) && game.state.phase !== 'over') {
      // 房主出局了也得能管人（托管 / 禁言 / 请离）：点真人弹房主菜单（里面有「坐他身后看」）；点机器猫照旧换视角
      const hp = !game.spectator && isHost() && seat > 0 ? playerAt(srvOf(seat)) : null;
      if (hp && !hp.isAi && !hp.left) { hostPersonMenu(hp, { lobby: false, view: game.state.alive[seat] ? () => onlineView(srvOf(seat)) : null }); return; }
      if (seat > 0 && game.state.alive[seat]) onlineView(srvOf(seat));
      return;
    }
    if (game && !game.tutorial && !game.online && !game.dealing && (game.spectator || !game.state.alive[0]) && game.state.phase !== 'over') {
      if (seat > 0 && (game.state.alive[seat] || seat === meSeat())) watch(seat, true);   // 点还在场的换过去；点我自己（已出局）回到我的座位
      return;
    }
    // 2026-11-13 用户：要甩锅给别人，点头像却先弹出了互动表情——点「出牌」后牌要先飞上桌（约 0.4 秒）才开始选人，
    // 这段时间点头像落到了「互动」。现在：牌在飞 / 等选人时点头像 = 记下来，落定后直接选他；选人模式里永远不弹互动
    if (preview && mode !== 'target') { if (seat >= 0) preview.tap = seat; return; }
    // 已经选好了要指人的牌（还没按「出牌」）就点了一个能指的人：当作出给他（和先按出牌再点他一样，牌照样先飞上桌）
    if (mode == null && seat >= 0 && !busy && selected.length && myTurnToAct() && els.mask.hidden) {   // seat 0 = 点自己（只有自由甩锅能指自己）
      const c = classifyMine(selected);
      if (c && c.needsTarget && R.validTargets(game.state, 0, c.type).indexOf(seat) >= 0 && !(tut && tut.allow && !tut.allow({ type: 'play', cards: selected.slice(), preview: true }))) {
        onPlay();
        if (preview) preview.tap = seat; else if (mode === 'target') onSeatTap(seat);
        return;
      }
    }
    if (mode !== 'target') {
      if (social && socialOk() && seat > 0 && els.mask.hidden) { social.openProps(seat); propLabels(); popTail(avEl(seat)); }
      return;
    }
    if (!targetCb) return;
    const b = seatEl(seat);
    if (!b.classList.contains('is-target')) {
      const st = game.state;
      if (st.roles && R.roleOf(st, seat) === 'shadow' && st.alive[seat] && st.hands[seat].length && b.classList.contains('is-target-off')) { flashRole(seat, token, 0).then((fl) => shadowDodge(seat).then(() => fl.back())); return; }   // 影子猫：两张偷牌指不到它——点它 = 它亮一下牌告诉你为什么
      shake(b); return;
    }
    const cb = targetCb;
    mode = null; targetCb = null;
    pickSeatEls().forEach((x) => x.classList.remove('is-target', 'is-target-off'));
    cb(seat);
  }
  function pressNope() {
    const s = game.state;
    if (s.phase !== 'react' || !reactOpen || !R.canNope(s, 0)) return;
    if (nopeHeld()) { shake(els.nopeBtn); return; }
    if (tut && tut.allow && !tut.allow({ type: 'nope' })) { shake(els.nopeBtn); return; }
    doNope(0);
  }


  function wipeFx() {
    roleView = null;
    stopCardFuse(true);
    clearBombAvatars();
    if (game && game.wander) { game.wander.cancel(); game.wander = null; }
    if (game && game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    if (game) { game.alterRow = null; game.insPre = null; game.drawLift = null; }   // 联机预掀 / 预塞的那张在 fly 层里，跟着一起清
    els.fly.innerHTML = '';
    if (els.under) els.under.innerHTML = '';   // 发牌时摆在桌上的炸弹猫
    els.fly.classList.remove('is-interactive');
    if (game) game.boomNode = null;
    if (fuseSparkTimer) { clearInterval(fuseSparkTimer); fuseSparkTimer = null; }
  }

  /* ───── 开局发牌 ─────
   * 牌堆从天而降、洗一下 → 一圈圈发牌（给我的翻开滑进手里，给别人的飞进头像）→ 每人一张逗猫棒（正面、带绿光）
   * → 炸弹猫一只只从上面掉下来、气鼓鼓抖两下、钻进牌堆（计数一只只加上去）→ 再洗一下 → 第一个人的红环亮起。
   * 点一下桌面可以跳过。 */
  async function dealIntro(t) {
    const s = game.state, n = s.n;
    const defOf = s.hands.map((h) => h.find((id) => R.KIND_OF[id] === R.DEFUSE));
    const rest = s.hands.map((h, i) => h.filter((id) => id !== defOf[i]));
    const extraInDeck = s.deck.filter((id) => R.KIND_OF[id] === R.DEFUSE || R.KIND_OF[id] === R.BOOM);
    const kits = extraInDeck.filter((id) => R.KIND_OF[id] === R.BOOM);
    const defs = extraInDeck.filter((id) => R.KIND_OF[id] === R.DEFUSE);
    const dealt = rest.reduce((a, h) => a + h.length, 0);
    ov = { counts: Array(n).fill(0), hand: [], deckSize: s.deck.length + dealt, kittens: kits.length, discard: [], turn: -1, turnsLeft: 1, alive: s.alive.slice() };
    game.dealing = true;
    renderAll();
    await roleDraw(t);   // 角色玩法：发牌前先抽角色（没有角色立刻返回）
    const skipped = () => t !== token || !game.dealing;
    if (skipped()) return;
    // 牌堆落下
    if (!fx.reduce()) {
      els.deck.animate([{ transform: 'translateY(-60px) scale(1.15)', opacity: 0 }, { transform: 'translateY(4px) scale(.98)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' });
    }
    snd('thud', 300);
    await wait(460);
    if (skipped()) return;
    // 先把炸弹猫一只只从牌堆里抽出来、翻开、摆在牌堆上方一排（谁也不拿，等发完牌再塞回去）
    const kf = kits.length > 4 ? 0.6 : 1;   // 人多（炸弹猫多）时一只只摆出来 / 塞回去都快一点，整段发牌别拖太久
    const u0 = U(), pu0 = PU();   // 2026-11-20 用户批准扇形：只在桌心摆、放不下叠成扇形（以前一长排铺满桌宽，人多时挡住两侧靠上的头像）
    const pr = els.deck.parentElement.getBoundingClientRect(), dtop = deckTopRect(), ccr0 = els.center.getBoundingClientRect();
    /* 摆在哪：一律在牌堆（连同弃牌堆）正上方、左右居中（2026-11-20 用户：横屏也要居中，不要挤到牌堆右边）。
     * 上边界 = 头顶那排头像的底；横屏时顶边头像离牌堆很近，牌缩到刚好放得下（大约和竖屏一样大），竖屏空间够就保持原大小、原高度。
     * 左右边界 = 和这一排同高的头像（含名字、手牌数）之间——竖屏时桌心是整宽的，只按桌心量会压住两侧靠上的头像 */
    let ceil = ccr0.top;
    for (const box of allSeatEls()) { const b = box.getBoundingClientRect(); if (b.width && b.bottom <= dtop.top && b.right > pr.left && b.left < pr.right) ceil = Math.max(ceil, b.bottom); }
    /* 炸弹猫按放大前的牌堆牌宽 pk 量、摆（2026-11-26：794edbe 牌堆放大 1.25 倍后还按 pu0 量，牌堆上方「放不下」，
     * 竖屏小屏直接掉进「上面没地方」那支，炸弹猫摆到和牌堆同一行、压在牌堆底下）。从牌堆飞出来时仍从牌堆大小（pu0）缩过去 */
    const pk = U() * 0.92;
    let kw = pk * 0.82, rowY = dtop.top - pk * 0.78, rowMid = pr.left + pr.width / 2;
    if (rowY - kw * 0.7 < ceil + 6) {
      const fit = (dtop.top - ceil - 8) / 1.4;
      // 竖屏一律摆在上面（再挤也只缩小、最小 0.45 张），不退到牌堆两边——竖屏两边太窄，退回去就压在牌堆底下（2026-11-26 用户：炸弹猫摆到牌堆正下方）
      // 稍微挤：缩一点，摆在头像底和牌堆顶正中间
      if (fit >= pk * 0.55 || innerHeight > innerWidth) { kw = Math.max(pk * 0.45, Math.min(kw, fit)); rowY = (ceil + dtop.top) / 2; }
      // 上面根本没地方（手机横屏：牌堆顶都顶到顶边那排头像了）：摆到牌堆两边（见下面 sides）
      else { rowY = pr.top + pr.height / 2; rowMid = ccr0.left + ccr0.width / 2; }
    }
    const noRoomAbove = rowY === pr.top + pr.height / 2;
    const rowH = kw * 1.4;
    const ccr = { left: ccr0.left, right: ccr0.right };
    for (const box of allSeatEls()) {
      const b = box.getBoundingClientRect();
      if (!b.width || b.bottom <= rowY - rowH / 2 + 3 || b.top >= rowY + rowH / 2 - 3) continue;   // 只是擦边（头顶那排头像的底正好贴着这一排）不算
      if (b.left + b.width / 2 < pr.left + pr.width / 2) ccr.left = Math.max(ccr.left, b.right + 4); else ccr.right = Math.min(ccr.right, b.left - 4);
    }
    ccr.width = Math.max(0, ccr.right - ccr.left);
    const availW = Math.max(kw, ccr.width - 12);
    let kGap = kits.length > 1 ? Math.min(kw * 1.12, (availW - kw) / (kits.length - 1)) : 0;
    /* 牌堆两边（2026-11-22 用户：横屏时炸弹猫正正压在牌堆上、洗牌时还被洗的牌盖住，不好看）：
     * 上面放不下时，一半摆在牌堆（连同弃牌堆、张数那行）左边、一半摆在右边，各自叠成一小扇，整体仍然左右对称；
     * 两边都太窄（缩到六成还放不下）才退回原来的横在正中 */
    let sides = null;
    if (noRoomAbove && kits.length) {
      const pb = [els.deck].concat(Array.from(els.table.querySelectorAll('.zm-deck-info'))).map((e) => e.getBoundingClientRect()).filter((r) => r.width)
        .reduce((a, r) => ({ l: Math.min(a.l, r.left), r: Math.max(a.r, r.right) }), { l: 1e9, r: -1e9 });   // 只算看得见的：牌堆 + 张数 + 百变规则卡（发牌时弃牌堆是空的，那块空位不算，不然右边那扇离得远、看着不对称）
      const nl = Math.ceil(kits.length / 2), nr = kits.length - nl;
      const wl = pb.l - 10 - (ccr.left + 6), wr = ccr.right - 6 - (pb.r + 10);
      const room = Math.min(wl, nr ? wr : wl);
      // 一边 nl 张：kw + (nl-1)·gap ≤ room，gap 至少 0.42·kw（叠着也看得清是一只只的炸弹猫）
      const kwFit = Math.min(kw, room / (1 + Math.max(0, nl - 1) * 0.42));
      if (kwFit >= pk * 0.6) {
        kw = kwFit;
        const g = nl > 1 ? Math.min(kw * 1.12, (room - kw) / (nl - 1)) : 0;
        // 两边离牌堆一样远：左边那扇的右缘贴 pb.l − 10，右边那扇的左缘贴 pb.r + 10
        sides = { g, xl: pb.l - 10 - kw / 2 - (nl - 1) * g, xr: pb.r + 10 + kw / 2, nl };
        kGap = g;
      }
    }
    const aside = [];
    for (let i = 0; i < kits.length; i++) {
      if (skipped()) { aside.forEach((x) => x && x.remove()); return; }
      let mid = i - (kits.length - 1) / 2, spot;
      if (sides) {
        const left = i < sides.nl, j = left ? i : i - sides.nl, m = left ? sides.nl : kits.length - sides.nl;
        mid = j - (m - 1) / 2;
        spot = { x: (left ? sides.xl : sides.xr) + j * sides.g, y: rowY + (sides.g < kw ? mid * mid * 1.6 * kw / 47 : 0) };
      } else {
        const half = ((kits.length - 1) * kGap + kw) / 2 + 2;
        const fr = { l: ccr.left + 6, r: ccr.right - 6 }, cx0 = Math.min(Math.max(rowMid, fr.l + half), fr.r - half);
        spot = { x: cx0 + mid * kGap, y: rowY + (kGap < kw ? mid * mid * 1.6 * kw / 47 : 0) };
      }
      const from = deckTopRect();
      ov.deckSize -= 1; ov.kittens -= 1;
      renderPiles();
      snd('hiss', 120);
      // 拿起来翻开、放到桌上（飞的时候在上层）；落定后挪进桌面那层（els.under）：之后发的牌、逗猫棒、洗牌都从它上面过（2026-11-26 用户：像现实里先摆炸弹猫再发牌）
      const node = await fx.fly({ html: cardHtml(kits[i]), back: backHtml(), flip: 'up', flipAt: 0.25, from, to: spot, w: kw, s0: pu0 / kw, s1: 1, r0: 0, r1: kGap < kw ? mid * 5 : (i % 2 ? 6 : -6), dur: 380 * kf, lift: 30, keep: true, land: false });
      if (node) { layOnTable(node); node.classList.add('zm-angry'); }
      aside.push(node);
      fx.burst(spot.x, spot.y, { n: 6, shapes: ['fur'], colors: FUR, radius: kw * 0.7, size: [5, 11], alignOut: true, life: 500, pattern: 'ring' });
      await wait(140 * kf);
    }
    void u0;
    /* 发牌从炸弹猫上面过（2026-11-26 用户：像现实里在摆好的炸弹猫上面发牌，牌要稍微盖住它们）：
     * 炸弹猫摆在牌堆上方一排时，发给别人的牌弧线顶点拱到这一排的下沿（牌的中心比下沿再低一点 → 盖住炸弹猫下半截），
     * 逗猫棒也从这一排的下半截上冒出来；摆在牌堆两边（横屏）时发给左右两家的牌本来就横着从上面过，不用改 */
    const overY = !sides && kits.length ? rowY + rowH / 2 + pu0 * 0.12 : null;
    const arcOver = (a, b) => (overY == null ? 40 : Math.min(220, Math.max(40, (a.y + b.y) / 2 + Math.min(a.y, b.y) - 2 * overY)));   // 二次弧线中点 y = (a+b)/4 + (min−lift)/2 → 让中点落在 overY
    if (skipped()) { aside.forEach((x) => x && x.remove()); return; }
    await animShuffle({ seat: -1 }, t);
    if (skipped()) return;
    // 一圈圈发
    const order = [];
    for (let r = 0, maxLen = Math.max(...rest.map((h) => h.length)); r < maxLen; r++) {
      for (let k = 0; k < n; k++) { const seat = (s.turn + k) % n; if (rest[seat][r] != null) order.push([seat, rest[seat][r]]); }
    }
    const u = HU(), pu = PU();   // 发到我手里的牌按手牌大小落地（2026-11-26 放大）
    const flights = [];
    for (let i = 0; i < order.length; i++) {
      if (skipped()) return;
      const [seat, id] = order[i];
      const from = deckTopRect();
      ov.deckSize -= 1;
      renderPiles();
      snd('deal');
      if (seat === 0) {
        const to = aboveSlot(reserveHandSlot(id));
        flights.push(fx.fly({ html: cardHtml(id), back: backHtml(), flip: 'up', flipAt: 0.35, from, to, w: u, s0: pu / u, s1: 1, r0: -10, r1: 0, dur: 420, lift: 60 }).then(() => { if (!skipped()) revealHandCard(id, to); }));
      } else {
        const to = avPoint(seat);
        flights.push(fx.fly({ html: backHtml(), from, to, w: pu, s0: 1, s1: 0.4, r0: -10, r1: 20, dur: 380, lift: arcOver(fx.center(from), to), fadeOut: true, land: false }).then(() => { if (!skipped()) { ov.counts[seat] += 1; renderSeat(seat); } }));
      }
      await wait(85 * Math.min(1, 20 / order.length));
    }
    await Promise.all(flights);
    if (skipped()) return;
    // 逗猫棒：正面朝上，从牌堆旁边发出去
    const dc = fx.center(els.deck.getBoundingClientRect());
    const dflights = [];
    for (let k = 0; k < n; k++) {
      const seat = (s.turn + k) % n, id = defOf[seat];
      if (id == null) continue;
      const from = { x: dc.x, y: overY != null ? overY - pu * 0.45 : dc.y - pu * 1.2 };   // 炸弹猫摆在上方时：就在那一排下半截上冒出来、压着它们
      snd('ding', k * 110);
      if (seat === 0) {
        const to = reserveHandSlot(id);
        dflights.push(fx.fly({ html: cardHtml(id), from, to, w: u, s0: 0.6, s1: 1, r0: 8, r1: 0, dur: 520, delay: k * 110, lift: 70, fadeIn: true }).then(() => {
          if (skipped()) return;
          revealHandCard(id);
          const r = handRectOf(id);
          fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, shapes: ['star'], colors: ['#4f8a5f', '#9bc8a2', '#c9a96e'], radius: u * 0.8, size: [6, 14], life: 700 });
        }));
      } else {
        dflights.push(fx.fly({ html: cardHtml(id), from, to: avPoint(seat), w: pu, s0: 0.6, s1: 0.45, r0: 8, r1: 0, dur: 480, delay: k * 110, lift: 50, fadeIn: true, fadeOut: true, land: false }).then(() => { if (!skipped()) { ov.counts[seat] += 1; renderSeat(seat); gulp(seat); } }));
      }
    }
    await Promise.all(dflights);
    if (skipped()) return;
    await wait(200);
    // 发完了：摆在一边的炸弹猫一只只钻回牌堆（翻成背面落进去）
    void defs;
    for (let i = 0; i < aside.length; i++) {
      if (skipped()) { aside.forEach((x) => x && x.isConnected && x.remove()); return; }
      const node = aside[i];
      const rr = node ? node.getBoundingClientRect() : deckTopRect();
      if (node) node.remove();
      snd('insert');
      await fx.fly({ html: cardHtml(kits[i]), back: backHtml(), flip: 'down', flipAt: 0.15, from: rr, to: deckTopRect(), w: pu, s0: rr.width / pu, s1: 1, r0: 0, r1: 0, dur: 300 * kf, lift: 16 });
      if (skipped()) { aside.forEach((x) => x && x.isConnected && x.remove()); return; }
      ov.deckSize += 1; ov.kittens += 1;
      renderPiles();
      fx.pop(els.deck, { scale: 1.05 });
    }
    if (skipped()) return;
    await animShuffle({ seat: -1 }, t);
    if (skipped()) return;
    game.dealing = false;
    ov.turn = s.turn;
    renderSeats();
    const a = avPoint(s.turn);
    fx.ring(a.x, a.y, { color: '#b4392c', size: 120, width: 3, dur: 560 });
  }
  // 飞完停住的牌挪进桌面那层：先把动画停在的样子写成内联样式再撤动画，换了父元素也不跳
  function layOnTable(node) {
    if (!els.under || !node.isConnected) return;
    node.getAnimations({ subtree: true }).forEach((a) => { try { a.commitStyles(); } catch (e) { /* 拿不到就算了 */ } a.cancel(); });
    els.under.appendChild(node);
  }
  function skipDeal() {
    if (!game || !game.dealing) return;
    game.dealing = false;
    token++;
    wipeFx();
    // 2026-11-20 修：跳过时牌堆空一会儿——洗牌动画给牌堆加的 is-shuffling、抽角色时藏起来的牌堆 / 弃牌堆，要等那段动画自己放完才撤；现在当场撤掉
    els.deck.classList.remove('is-shuffling');
    els.deck.style.visibility = ''; els.discard.style.visibility = '';
    release();
    renderAll();
    if (game.roleHide) game.roleHide = null;   // 抽角色时点了跳过：直接全亮出来
    renderAll();
    schedule(200, step);
  }
  async function startWithDeal() {
    const t = token;
    busy = true;
    await dealIntro(t);
    if (t !== token) return;
    game.dealing = false;
    release();
    step();
  }
  /* 开局抽角色（2026-11-18 用户；2026-11-19 两轮改；2026-11-26 去掉洗牌、亮相改慢）：桌面蒙一层宣纸色遮罩（同偷牌那层），
   * 焦糖色角色牌（几个人就几张）从桌心直接飞出来摊成扇形，一张张轮流往上冒一下暗示「点一张」，底下「抽一张」按钮带倒计时
   * → 我那张拈起来、飞到桌心凑近放大、慢翻亮相（见下面），剩下的收回桌心一摞 → 缩成头像角上的猫章、遮罩退掉 → 从这摞顶上按座次发给机器猫：
   * 飞到头像朝桌心那一侧翻开亮一下、缩进角上。点桌面空白照旧跳过整段开场 */
  async function roleDraw(t) {
    const g = game, st = g.state;
    // 联机（2026-11-19）也走这一整段：角色服务器发牌时就定了，点哪张都是自己那只（单机也一样）；限时到了自动抽。
    // 纯观战 / 坐在别人身后看：不等人点，很快自动翻开被看的那一家
    if (!st.roles || g.tutorial) return;
    const n = st.n, seats = Array.from({ length: n }, (_, i) => i), me = meSeat();
    game.roleHide = new Set(seats);
    renderSeats(); renderRoleFan();
    const hideEls = [els.deck, els.discard];
    const nodes = [];
    const gone = () => t !== token;
    const cleanup = () => { nodes.forEach((d) => d.remove()); hideEls.forEach((x) => { x.style.visibility = ''; }); };
    if (fx.reduce()) { game.roleHide = null; renderSeats(); return; }
    hideEls.forEach((x) => { x.style.visibility = 'hidden'; });
    try {
      const cr = els.center.getBoundingClientRect(), c = { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 };
      // 牌宽：桌心放得下「两半分开」和扇面就行，越大越清楚（手机 ~80，电脑 ~120）
      const cw = Math.round(Math.max(56, Math.min(124, (cr.width - 24) / (n * 0.6 + 1.1), (cr.width - 24) / 2.6, cr.height * 0.36 / 1.4)));
      const tf = (p) => 'translate(' + (p.x - cw / 2).toFixed(1) + 'px,' + (p.y - cw * 0.7).toFixed(1) + 'px) rotate(' + (p.r || 0) + 'deg) scale(' + (p.s == null ? 1 : p.s) + ')';
      const mv = (d, a, b, dur, ease, delay) => d.animate([{ transform: tf(a) }, { transform: tf(b) }], { duration: dur, easing: ease || 'cubic-bezier(.45,0,.25,1)', delay: delay || 0, fill: 'both' }).finished.catch(() => {});
      const pile = (k, s) => ({ x: c.x - k * 0.8, y: c.y - k * 1.6, r: 0, s });   // 一摞：越上面越往左上错一点，看得出厚度
      let zTop = 1;
      const lift = (d) => { d.style.zIndex = String(5 + (zTop++)); };
      const cards = seats.map(() => { const d = document.createElement('div'); d.className = 'zm-rd'; d.innerHTML = roleBackHtml(cw); els.fly.appendChild(d); nodes.push(d); lift(d); d.style.opacity = '0'; return d; });
      // 2026-11-26 用户：开局那段「劈两半、交替落回」的洗牌多余——去掉。遮罩淡入，牌从桌心一张张直接飞出去摊成扇面（绕扇面下方一点转，左边的压在下面）
      const mask = document.createElement('div');
      mask.className = 'zm-rd-mask';
      els.fly.appendChild(mask); nodes.push(mask);
      mask.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, fill: 'both' });
      const S = 1.18, R = cw * S * 2.6, stepA = Math.min(11, 56 / Math.max(1, n - 1));
      const fanY = c.y - cw * 0.2, pivot = { x: c.x, y: fanY + R };
      const slot = (k) => { const ang = (k - (n - 1) / 2) * stepA, rad = ang * Math.PI / 180; return { x: pivot.x + R * Math.sin(rad), y: pivot.y - R * Math.cos(rad), r: ang, s: S }; };
      const where = cards.map((_, k) => slot(k));
      cards.forEach((d, k) => { d.style.zIndex = String(5 + k); });
      zTop = n + 1;
      snd('whoosh');
      await Promise.all(cards.map((d, k) => d.animate([{ transform: tf({ x: c.x, y: c.y + cw * 0.2, r: 0, s: 0.45 }), opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: tf(where[k]), opacity: 1 }], { duration: 460, delay: k * 70, easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'both' }).finished.catch(() => {})));
      if (gone()) return;
      const left = cards.map((_, i) => i);
      left.forEach((i) => cards[i].classList.add('can-pick'));
      // 底下一颗「抽一张」按钮，按钮本身就是倒计时条（同偷牌）
      const lim = autopilot || g.spectator ? 600 : 8000;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'zm-btn zm-btn-primary zm-timed zm-rd-btn';
      btn.innerHTML = '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span><b>' + T('ui.steal.rand', '抽一张') + '</b>';
      const fanBottom = fanY + cw * S * 0.72 + Math.abs(slot(0).y - fanY) + 18;
      btn.style.cssText = 'left:' + c.x + 'px;top:' + Math.min(innerHeight - 56, fanBottom) + 'px';
      els.fly.appendChild(btn); nodes.push(btn);
      btn.animate([{ opacity: 0, translate: '-50% 8px' }, { opacity: 1, translate: '-50% 0' }], { duration: 260, fill: 'both' });
      btn.querySelector('.zm-dlg-timer i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: lim, easing: 'linear', fill: 'forwards' });
      // 暗示：每隔一会儿，从左到右一张张往上冒一下，像在说「挑一张」
      let wv = 0;
      const wave = () => { left.forEach((i, k) => setTimeout(() => { const el = cards[i]; if (!el.isConnected || !el.classList.contains('can-pick')) return; el.classList.add('is-wave'); setTimeout(() => el.classList.remove('is-wave'), 260); }, k * 110)); };
      const wvStart = setTimeout(() => { wave(); wv = setInterval(wave, 2400); }, 500);
      const mine = await new Promise((res) => {
        const tm = setTimeout(() => res(left[(Math.random() * left.length) | 0]), lim);
        left.forEach((i) => cards[i].addEventListener('click', (ev) => { ev.stopPropagation(); clearTimeout(tm); res(i); }, { once: true }));
        btn.addEventListener('click', (ev) => { ev.stopPropagation(); clearTimeout(tm); res(left[(Math.random() * left.length) | 0]); }, { once: true });
        const chk = setInterval(() => { if (gone()) { clearInterval(chk); clearTimeout(tm); res(-1); } }, 200);
        setTimeout(() => clearInterval(chk), lim + 50);
      });
      clearTimeout(wvStart); clearInterval(wv);
      btn.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      if (gone() || mine < 0) return;
      left.forEach((i) => cards[i].classList.remove('can-pick', 'is-wave'));
      left.splice(left.indexOf(mine), 1);
      // 我的这张（2026-11-26 用户：以前一点就翻、太仓促）：先在扇面里被「拈起来」往上一提 → 别的牌收回桌心一摞 →
      // 背面朝上飞到桌心、一路变大（停在 0.86）→ 再往前凑近放大到整张、轻轻晃两下、背后角色色的光越来越亮 →
      // 慢翻：先转到侧面（一道白光闪过），再翻过来、弹一下 → 光芒 + 星星，亮相
      const myRole = st.roles[me], tone = ART.ROLE_TONE[myRole] || ART.ROLE_TONE.fat;
      const BW = Math.round(Math.max(150, Math.min(230, innerWidth * 0.52, cr.height * 0.82 / 1.4)));
      const big = document.createElement('div');
      big.className = 'zm-rd-big';
      big.style.cssText = 'left:' + (c.x - BW / 2) + 'px;top:' + (c.y - BW * 0.7) + 'px;--glow:' + tone.band;
      big.style.zIndex = '200';   // 永远压在剩下那摞上面（那摞的 z 会随抽牌一路往上加）
      big.innerHTML = '<i class="zm-rd-rays"></i><i class="zm-rd-halo"></i>' + roleFlipHtml(myRole, BW, true);
      const pk = cards[mine], pw = where[mine];
      lift(pk);
      snd('tap');
      await mv(pk, pw, { x: pw.x, y: pw.y - cw * 0.32, r: pw.r * 0.5, s: S * 1.1 }, 220, 'cubic-bezier(.3,.9,.4,1.2)');
      if (gone()) return;
      left.forEach((i, k) => { const to = pile(k, 0.9); cards[i].style.zIndex = String(5 + k); mv(cards[i], where[i], to, 380, null, k * 30); where[i] = to; cards[i].animate([{ opacity: 1 }, { opacity: 0.55 }], { duration: 380, fill: 'forwards' }); });
      zTop = n + 1;
      const from = pk.getBoundingClientRect();
      els.fly.appendChild(big); nodes.push(big);
      pk.remove();
      const NEAR = 0.86;
      {
        const r = big.getBoundingClientRect(), dx = from.left + from.width / 2 - (r.left + r.width / 2), dy = from.top + from.height / 2 - (r.top + r.height / 2), k0 = from.width / r.width;
        snd('whoosh');
        await big.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + k0.toFixed(3) + ') rotate(' + (pw.r * 0.5) + 'deg)' }, { transform: 'scale(' + NEAR + ')' }],
          { duration: 560, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'forwards' }).finished.catch(() => {});
      }
      if (gone()) return;
      // 凑近：0.86 → 1，晃两下（像拿到眼前端详），背后的光慢慢亮起来
      big.classList.add('is-near');
      await big.animate([
        { transform: 'scale(' + NEAR + ')' },
        { transform: 'scale(.95) rotate(-2.2deg)', offset: 0.35 },
        { transform: 'scale(.99) rotate(2deg)', offset: 0.62 },
        { transform: 'scale(1.01) rotate(-1deg)', offset: 0.84 },
        { transform: 'scale(1)' },
      ], { duration: 640, easing: 'ease-in-out', fill: 'forwards' }).finished.catch(() => {});
      if (gone()) return;
      const fin = big.querySelector('.zm-rc-flip-in');
      await fin.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 300, easing: 'cubic-bezier(.55,0,.9,.5)', fill: 'forwards' }).finished.catch(() => {});
      if (gone()) return;
      big.classList.add('is-rays', 'is-flash');
      snd('ding');
      fx.burst(c.x, c.y, { n: 16, shapes: ['star', 'dot'], colors: ['#c9a96e', tone.band, '#fff4d6'], radius: BW * 0.95, size: [5, 13], life: 900 });
      await fin.animate([{ transform: 'rotateY(90deg) scale(1)' }, { transform: 'rotateY(180deg) scale(1.08)', offset: 0.6 }, { transform: 'rotateY(180deg) scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});
      if (gone()) return;
      big.classList.remove('is-flash');
      big.classList.add('is-glow');
      await new Promise((res) => { const tm = setTimeout(res, autopilot ? 900 : 2400); big.style.pointerEvents = 'auto'; big.addEventListener('click', (ev) => { ev.stopPropagation(); clearTimeout(tm); res(); }, { once: true }); mask.addEventListener('click', (ev) => { ev.stopPropagation(); clearTimeout(tm); res(); }, { once: true }); });
      if (gone()) return;
      game.roleHide.delete(me); renderSeats();
      const myB = roleBadge(me); if (myB) myB.style.visibility = 'hidden';
      big.classList.remove('is-rays', 'is-near');
      mask.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: 'forwards' });
      await flipTo(big, myB ? myB.getBoundingClientRect() : null, 520, 0);
      big.remove(); mask.remove();
      if (myB) { myB.style.visibility = ''; fx.pop(myB, { scale: 1.8, dur: 420 }); }
      snd('tap');
      if (gone()) return;
      // 发给机器猫：从这摞顶上一张张飞到头像朝桌心那一侧（不出桌沿），翻开亮一下，缩进角上
      const others = seats.filter((k) => k !== me);
      await Promise.all(others.map(async (seat, k) => {
        await wait(k * 220);
        if (gone()) return;
        const el = cards[left[left.length - 1 - k]];
        lift(el);
        const fr = el.getBoundingClientRect(), a = avEl(seat).getBoundingClientRect();
        const w = Math.round(Math.max(48, Math.min(76, cw * 0.72)));
        const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
        const vx = c.x - ax, vy = c.y - ay, vl = Math.hypot(vx, vy) || 1;
        const off = a.width / 2 + w * 0.95 + 8;
        const x = Math.max(cr.left + w * 0.6, Math.min(cr.right - w * 0.6, ax + vx / vl * off));
        const y = Math.max(cr.top + w * 0.75, Math.min(cr.bottom - w * 0.75, ay + vy / vl * off));
        const box = document.createElement('div');
        box.className = 'zm-rd-small';
        box.style.cssText = 'left:' + (x - w / 2) + 'px;top:' + (y - w * 0.7) + 'px;z-index:' + (200 + k);
        box.innerHTML = roleFlipHtml(st.roles[seat], w, false);
        els.fly.appendChild(box); nodes.push(box);
        el.remove();
        snd('tap');
        await flipFrom(box, fr, 380, 0);
        if (gone()) return;
        await box.querySelector('.zm-rc-flip-in').animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], { duration: 400, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
        await wait(900);
        if (gone()) return;
        game.roleHide.delete(seat); renderSeat(seat);
        const b = roleBadge(seat); if (b) b.style.visibility = 'hidden';
        await flipTo(box, b ? b.getBoundingClientRect() : null, 400, 0);
        box.remove();
        if (b) { b.style.visibility = ''; fx.pop(b, { scale: 1.6, dur: 360 }); }
      }));
      if (gone()) return;
      game.roleHide = null;
      renderSeats();
    } finally {
      cleanup();
      if (gone()) g.roleHide = null;
    }
  }
  /* ───── 弹窗：遮罩淡入、弹窗从下面弹上来 ───── */
  let dialogClose = null;
  /* 局内要我做决定的（偷哪张 / 点名 / 改命 / 从弃牌堆捡 / 炸弹猫塞哪）：不弹框，直接摆在桌子正中，
   * 底下的牌堆、弃牌堆、头像、手牌蒙一层浅浅的宣纸色（和「窥探」摊牌一样）。2026-11-13 用户看过前后对比后定下 */
  function openStage(html, onMount, onClose) {
    openDialog(html, (d) => {
      if (onMount) onMount(d);
      d.classList.add('is-stage'); els.mask.classList.add('is-stage');
    }, onClose);
  }
  function openDialog(html, onMount, onClose) {
    closeMenu();
    pauseClock();
    els.mask.classList.remove('is-stage');
    els.dialog.className = 'zm-dialog';
    els.dialog.innerHTML = html;
    els.mask.hidden = false;
    dialogClose = onClose || null;
    if (onMount) onMount(els.dialog);
    if (!fx.reduce()) {
      els.mask.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
      els.dialog.animate([{ transform: 'translateY(26px) scale(.94)', opacity: 0 }, { transform: 'translateY(-3px) scale(1.01)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.3,.8,.4,1)' });
      els.dialog.querySelectorAll('[data-stagger] > *').forEach((c, i) => c.animate([{ transform: 'translateY(14px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: 120 + i * 40, easing: 'cubic-bezier(.3,.8,.4,1.2)', fill: 'backwards' }));
    }
    const f = els.dialog.querySelector('[data-focus]') || els.dialog.querySelector('button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeDialog() {
    els.mask.hidden = true;
    els.dialog.innerHTML = '';
    resumeClock();
    const cb = dialogClose;
    dialogClose = null;
    return cb;
  }

  function nameDialog(cb) {
    const kinds = R.KINDS.filter((k) => k !== R.BOOM);
    openStage('<h2>' + T('ui.name.title', '点名要哪种牌？') + '</h2><p class="zm-muted">' + T('ui.name.tip', '他手里有，就得给你一张；没有就落空') + '</p>' +
      '<div class="zm-grid" data-stagger>' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '</button>').join('') + '</div>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>' + T('ui.nevermind', '算了') + '</button></div>', (d) => {
      d.classList.add('is-cards');
      d.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { closeDialog(); cb(b.dataset.k); }));
      d.querySelector('[data-cancel]').addEventListener('click', () => { closeDialog(); if (game.previewSrc) { preview = { cards: Object.keys(game.previewSrc).map(Number) }; endPreview(); } renderBand(); });
    });
  }

  /* 改命（原名「重排」，2026-11-12 改名）：最上面（至多）三张正面朝上摆一排，点两张换位置，「好了」放回去；限时到了按现在的顺序放 */
  function alterDialog() {
    const s = game.state;
    let order = s.alter.cards.slice(), sel = -1;
    const limit = dlgLimit();
    snd('peek');
    openStage('<h2>' + T('ui.alter.title', '改命 · 最上面 {n} 张', { n: order.length }) + '</h2>' +
      '<p class="zm-muted zm-alter-tip">' + T('ui.alter.tip', '拖一张插到别处，或点两张互换') + '</p>' +
      '<div class="zm-alter-row"><span class="end">' + T('ui.pos.topShort', '顶') + '</span><div class="zm-alter" data-alter>' + order.map((id, i) => '<button type="button" class="zm-alter-slot" data-i="' + i + '">' + rawHtml(id) + '</button>').join('') + '</div><span class="end">' + T('ui.pos.bottomShort', '底') + '</span></div>' +
      '<div class="zm-actions is-center"><button type="button" class="zm-btn zm-btn-primary' + (limit ? ' zm-timed' : '') + '" data-ok data-focus>' + (limit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '') + '<b>' + T('ui.done', '好了') + '</b></button></div>', (d) => {
      const slots = Array.from(d.querySelectorAll('.zm-alter-slot'));
      const okBtn = d.querySelector('[data-ok]');
      morphWild(slots.map((x) => x.querySelector('.zm-card')), order.slice(), token, ms(420));   // 百搭：先亮本身，再一张张翻成万能猫
      let done = false, timer = 0;
      const commit = () => {
        if (done || !okBtn.isConnected) return;
        if (tut && tut.allow && !tut.allow({ type: 'alter', order: order.slice() })) { shake(okBtn); return; }   // 教程：没按要求排好
        done = true; clearTimeout(timer);
        closeDialog();
        apply(0, { type: 'alter', order: order.slice() });
      };
      // 换两个位置上的牌（带一个小交叉动画）；from 给了就是拖过去的那张从松手处滑进新位置
      const swap = (i, j, dropRect) => {
        const a = slots[i], b = slots[j], ca = a.querySelector('.zm-card'), cb = b.querySelector('.zm-card');
        const ra = dropRect || ca.getBoundingClientRect(), rb = cb.getBoundingClientRect();
        a.insertBefore(cb, a.firstChild); b.insertBefore(ca, b.firstChild);
        [order[i], order[j]] = [order[j], order[i]];
        if (!fx.reduce()) {
          const na = ca.getBoundingClientRect(), nb = cb.getBoundingClientRect();
          ca.animate([{ transform: 'translate(' + (ra.left - na.left) + 'px,' + (ra.top - na.top - (dropRect ? 0 : 14)) + 'px)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
          cb.animate([{ transform: 'translate(' + (rb.left - nb.left) + 'px,14px)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
        }
        slots.forEach((x) => x.classList.remove('is-sel')); sel = -1;
        snd('flip');
      };
      /* 拖：按住一张拖到别处松手 = 把它「插」到那个位置（2026-11-13 用户：把第一张拖到第三张后面，应该是插过去而不是互换）；
       * 拖的时候别的牌实时让位，看得出会插在哪。点：点一张、再点另一张 = 两张互换（照旧）。
       * 位置只看被拖那张牌的中心（不看手指在哪——手指捏在牌边上也算得准）；格子本身不动，动的是格子里的牌 */
      const cardsNow = () => slots.map((x) => x.querySelector('.zm-card'));
      const centers = () => slots.map((x) => { const q = x.getBoundingClientRect(); return q.left + q.width / 2; });
      const insertAt = (i, card) => {
        const r = card.getBoundingClientRect(), cx = r.left + r.width / 2;
        let k = 0;
        centers().forEach((c, j) => { if (j !== i && c < cx) k++; });
        return k;
      };
      // 拖着 i、准备插到 k：别的牌往旁边让一格
      const preview = (i, k, cards) => {
        const cs = centers(), pitch = cs.length > 1 ? cs[1] - cs[0] : 0;
        cards.forEach((c, j) => {
          if (j === i) return;
          let to = j;
          if (i < k && j > i && j <= k) to = j - 1;
          else if (k < i && j >= k && j < i) to = j + 1;
          c.style.transition = 'transform .15s ease';
          c.style.transform = to === j ? '' : 'translateX(' + ((to - j) * pitch).toFixed(1) + 'px)';
        });
      };
      // 真的挪：order 里把 i 拿出来插到 k，牌放进新格子，再从各自原来（看上去）的位置滑过去
      const move = (i, k, dropRect) => {
        const cards = cardsNow();
        const before = cards.map((c, j) => (j === i && dropRect ? dropRect : c.getBoundingClientRect()));
        cards.forEach((c) => { c.style.transition = ''; c.style.transform = ''; c.style.zIndex = ''; });
        const idx = order.map((_, j) => j);
        idx.splice(i, 1); idx.splice(k, 0, i);
        order = idx.map((j) => order[j]);
        idx.forEach((j, pos) => slots[pos].insertBefore(cards[j], slots[pos].firstChild));
        if (!fx.reduce()) cards.forEach((c, j) => {
          const now = c.getBoundingClientRect(), r = before[j];
          if (Math.abs(r.left - now.left) < 1 && Math.abs(r.top - now.top) < 1) return;
          c.animate([{ transform: 'translate(' + (r.left - now.left) + 'px,' + (r.top - now.top) + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,.8,.4,1)' });
        });
        slots.forEach((x) => x.classList.remove('is-sel')); sel = -1;
        snd('flip');
      };
      let drag = null;
      slots.forEach((slot, i) => {
        slot.addEventListener('pointerdown', (ev) => {
          const card = slot.querySelector('.zm-card');
          drag = { i, x0: ev.clientX, y0: ev.clientY, card, moved: false, id: ev.pointerId, k: i };
          try { slot.setPointerCapture(ev.pointerId); } catch (_) { /* */ }
        });
        slot.addEventListener('pointermove', (ev) => {
          if (!drag || drag.i !== i) return;
          const dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
          if (!drag.moved && Math.hypot(dx, dy) < 6) return;
          if (!drag.moved && sel >= 0) { slots.forEach((x) => x.classList.remove('is-sel')); sel = -1; }
          drag.moved = true;
          drag.card.style.transition = '';
          drag.card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.04).toFixed(1) + 'deg) scale(1.06)';
          drag.card.style.zIndex = 5;
          slot.classList.add('is-dragging');
          const k = insertAt(i, drag.card);
          if (k !== drag.k) { drag.k = k; preview(i, k, cardsNow()); snd('tick'); }
        });
        const end = () => {
          if (!drag || drag.i !== i) return;
          const d = drag;
          drag = null;
          slot.classList.remove('is-dragging');
          if (!d.moved) { // 当成一次点击：点两张互换
            if (sel < 0) { sel = i; slot.classList.add('is-sel'); snd('tap'); return; }
            if (sel === i) { slot.classList.remove('is-sel'); sel = -1; snd('untap'); return; }
            swap(sel, i);
            return;
          }
          const dropRect = d.card.getBoundingClientRect();
          const k = insertAt(i, d.card);
          if (k !== i) { move(i, k, dropRect); return; }
          // 放回原位
          cardsNow().forEach((c) => { c.style.transition = ''; c.style.transform = ''; c.style.zIndex = ''; });
          if (!fx.reduce()) { const now = d.card.getBoundingClientRect(); d.card.animate([{ transform: 'translate(' + (dropRect.left - now.left) + 'px,' + (dropRect.top - now.top) + 'px)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' }); }
        };
        slot.addEventListener('pointerup', end);
        slot.addEventListener('pointercancel', end);
      });
      okBtn.addEventListener('click', commit);
      if (limit) {
        const my = token, bar = d.querySelector('.zm-dlg-timer');
        bar.querySelector('i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: limit, easing: 'linear', fill: 'forwards' });
        setTimeout(() => { if (my === token && !done && okBtn.isConnected) bar.classList.add('is-hurry'); }, Math.max(0, limit - HURRY_MS));
        timer = setTimeout(() => { if (my === token && !done && okBtn.isConnected) { timeouts += 1; autoAct = true; commit(); if (timeouts >= 2) setAutopilot(true); } }, limit);
      }
    });
  }
  /* 重排：打出来时顶上几张牌背从牌堆上抬起、在牌堆上方摆一排（牌堆真的少了这几张）；
   * 排好顺序后（我在弹窗里排 / 机器猫在想），这一排在空中互相换位洗两轮，再一张张平着落回牌堆顶。谁排都一样演，看不出顺序 */
  // 队友改命时那一排下面的小标签（最上面 / 第 2 张 / 第 3 张），和窥探摊开时一样
  function alterLabels(spots, pu) {
    els.fly.querySelectorAll('.zm-alter-lab').forEach((n) => n.remove());
    if (!spots) return;
    // 那排牌下面紧挨着牌堆，标签挂在牌的上方；牌小（手机）就只写「顶 / 2 / 3」
    const roomy = pu * 0.86 >= 56;
    const labels = roomy ? [T('ui.pos.top', '最上面'), ...[2, 3, 4, 5].map((n) => T('ui.pos.nth', '第 {n} 张', { n }))] : [T('ui.pos.topShort', '顶'), '2', '3', '4', '5'];
    spots.forEach((p, i) => {
      const s = document.createElement('span');
      s.className = 'zm-peek-lab zm-alter-lab' + (i === 0 ? ' is-top' : '');
      s.textContent = labels[i] || '';
      s.style.left = p.x + 'px'; s.style.top = (p.y - pu * 0.82 * 1.4 / 2 - 24) + 'px';
      els.fly.appendChild(s);
    });
  }
  /* 改命抬起那一排的缩放：按放大前的牌堆牌宽 × 0.82 摆（2026-11-26：794edbe 牌堆放大 1.25 倍后这一排跟着变大，
   * 小屏竖屏顶到上面那排头像、盖住名字） */
  const altS = () => 0.82 * U() * 0.92 / PU();
  async function animAlterLift(e, t) {
    if (game.alterRow) { game.alterRow.forEach((n) => n && n.remove()); game.alterRow = null; }
    const k = e.count || (e.cards ? e.cards.length : 3);
    const r = deckTopRect(), c = fx.center(r), pu = PU();
    snd('peek');
    // 整排浮在牌堆顶上方、和牌堆之间留一道缝（不和牌堆压在一起，看着就是从牌堆里拿出来、举在上面）
    const as = altS();
    const rowY = r.top - pu * 1.4 * as / 2 - 16;
    const spots = Array.from({ length: k }, (_, i) => ({ x: c.x + (i - (k - 1) / 2) * pu * as * 1.1, y: rowY }));
    const tf = liftTopFace();   // 透视：翻着的那张正面抬起来
    game.alterFace = tf;
    // 组队（2026-11-18 用户）：队友改命，那三张我也看得到——抬起来就翻成正面，他怎么排我看着（我不能动）
    const open = isMate(e.seat) && !glance() && e.cards && e.cards.length === k ? e.cards.slice() : null;
    game.alterOpen = open;
    if (ov) { ov.lifted = (ov.lifted || 0) + k; renderPiles(); }
    const nodes = await Promise.all(spots.map((p, i) => fx.fly(open
      ? Object.assign({ html: rawHtml(open[i]), from: deckTopRect(), to: p, w: pu, s0: 1, s1: altS(), r0: 0, r1: 0, dur: ms(420), delay: i * ms(90), lift: 16, keep: true, land: false }, i === 0 && tf != null ? {} : { back: backHtml(), flip: 'up', flipAt: 0.35 })
      : { html: i === 0 && tf != null ? cardHtml(tf) : backHtml(), from: deckTopRect(), to: p, w: pu, s0: 1, s1: altS(), r0: 0, r1: 0, dur: ms(320), delay: i * ms(70), lift: 16, keep: true, land: false })));
    if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    game.alterRow = nodes;
    game.alterSpots = spots;
    if (open) {
      nodes.forEach((n, i) => { if (n && R.KIND_OF[open[i]] === R.BOOM) n.classList.add('zm-angry'); });
      if (open.some((id) => R.KIND_OF[id] === R.BOOM)) snd('gasp');
      alterLabels(spots, pu * as / 0.82);
      morphWild(nodes, open, t, ms(260));
    }
    if (e.seat !== 0) bubble(e.seat, '', { think: true, ms: open ? 2400 : 1400 });
    await wait(ms(160));
  }
  async function animAltered(e, t) {
    const pu = PU();
    let nodes = game.alterRow, spots = game.alterSpots;
    game.alterRow = null;
    if (!nodes || !nodes.length) {   // 那一排没了（暂停过）：再抬一次；快照里本来就没算这几张，抬起时别再减一遍
      const kk = e.count || (e.cards ? e.cards.length : 3);
      await animAlterLift({ seat: e.seat, count: kk }, t);
      if (ov) ov.lifted -= kk;
      nodes = game.alterRow; spots = game.alterSpots; game.alterRow = null;
    }
    if (t !== token || !nodes) { (nodes || []).forEach((n) => n && n.remove()); alterLabels(null); return; }
    const k = nodes.length;
    const open = game.alterOpen;
    game.alterOpen = null;
    if (open && e.cards && open.length === k && e.cards.length === k) {
      // 组队：队友排好了——每张正面滑到它的新位置（我看清他怎么排的），停一下，再扣回牌背落回牌堆
      snd('shuffle');
      const to = open.map((id) => e.cards.indexOf(id));
      nodes = await Promise.all(nodes.map((n, i) => {
        if (!n) return null;
        const rr = n.getBoundingClientRect();
        n.remove();
        const moved = to[i] !== i;
        return fx.fly({ html: cardHtml(open[i]), from: rr, to: spots[to[i]], w: pu, s0: rr.width / pu, s1: altS(), r0: 0, r1: 0, dur: ms(moved ? 460 : 1), lift: moved ? (to[i] > i ? 1 : -1) * pu * 0.32 : 0, keep: true, land: false })
          .then((m) => { if (m && R.KIND_OF[open[i]] === R.BOOM) m.classList.add('zm-angry'); return m; });
      }));
      if (t !== token) { nodes.forEach((n) => n && n.remove()); alterLabels(null); return; }
      await wait(ms(1100));
      alterLabels(null);
      await Promise.all(nodes.map((n, i) => {
        if (!n) return null;
        const rr = n.getBoundingClientRect();
        n.remove();
        return fx.fly({ html: cardHtml(open[i]), back: backHtml(), flip: 'down', flipAt: 0.1, from: rr, to: deckTopRect(), w: pu, s0: rr.width / pu, s1: 1, r0: 0, r1: 0, dur: ms(300), delay: (k - 1 - to[i]) * ms(80), lift: 10 });
      }));
      if (t !== token) return;
      if (ov) ov.lifted -= k;
      if (ov && game.alterFace != null) ov.topFace = faceTop(game.state);
      game.alterFace = null;
      snd('thud');
      renderPiles();
      return;
    }
    snd('shuffle');
    // 两轮：每张飞到另一个位置（错开一点高度、弧线），始终平着、不翻面
    let at = nodes.map((_, i) => i);
    for (let round = 0; round < 2 && k > 1; round++) {
      const next = at.map((p) => (p + 1 + round) % k);
      const face0 = round === 0 ? game.alterFace : null;   // 透视：翻着的那张洗第一轮时先翻成牌背，之后谁也看不出它去了哪
      nodes = await Promise.all(nodes.map((n, i) => {
        if (!n) return null;
        const rr = n.getBoundingClientRect();
        n.remove();
        const open = i === 0 && face0 != null;
        return fx.fly({ html: open ? cardHtml(face0) : backHtml(), back: open ? backHtml() : undefined, flip: open ? 'down' : null, flipAt: 0.05, from: rr, to: spots[next[i]], w: pu, s0: rr.width / pu, s1: altS(), r0: 0, r1: 0, dur: ms(300), lift: (i % 2 ? -1 : 1) * pu * 0.28, keep: true, land: false });
      }));
      at = next;
      if (t !== token) { nodes.forEach((n) => n && n.remove()); return; }
    }
    // 一张张平着落回牌堆顶
    await Promise.all(nodes.map((n, i) => {
      if (!n) return null;
      const rr = n.getBoundingClientRect();
      n.remove();
      return fx.fly({ html: backHtml(), from: rr, to: deckTopRect(), w: pu, s0: rr.width / pu, s1: 1, r0: 0, r1: 0, dur: ms(260), delay: (k - 1 - i) * ms(70), lift: 10 });
    }));
    if (t !== token) return;
    if (ov) ov.lifted -= k;
    // 透视：落定后新的最上面那张翻起来（renderPiles 里换了张就会演翻面）
    if (ov && game.alterFace != null) ov.topFace = faceTop(game.state);
    game.alterFace = null;
    snd('thud');
    renderPiles();
  }
  function pickDialog() {
    const s = game.state;
    const by = {};
    for (const id of s.discard) { const k = R.KIND_OF[id]; if (k !== R.BOOM) (by[k] = by[k] || []).push(id); }
    const kinds = R.KINDS.filter((k) => by[k]);
    // 只列有哪几种（只能拿一张，每种有几张不重要）
    openStage('<h2>' + T('ui.pick.title', '从弃牌堆捡一张') + '</h2>' +
      '<div class="zm-grid" data-stagger>' + kinds.map((k) => '<button type="button" data-k="' + k + '">' + cardHtml(k) + '</button>').join('') + '</div>', (d) => {
      d.classList.add('is-cards');
      d.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
        const id = by[b.dataset.k][by[b.dataset.k].length - 1];
        if (tut && tut.allow && !tut.allow({ type: 'pick', card: id })) { shake(b); return; }
        closeDialog();
        apply(0, { type: 'pick', card: id });
      }));
    });
  }

  /* 塞炸弹猫：一排牌背，炸弹猫插在选定位置；拖滑杆时炸弹猫跟着滑过去（FLIP） */
  /* 塞回去：一排牌背（左 = 牌堆顶、右 = 牌堆底），炸弹猫插进其中一道缝——缝两边的牌往外让开，炸弹猫不压别的牌、也不被压。
   * 拖滑块 / 点三个快捷键选位置，下面一行大字写「第几张」 */
  function insertDialog() {
    const s = game.state;
    const size = s.deck.length;
    let pos = 0;
    // 牌堆有几张就画几张（叠得紧一点），左边几张 = 真的在它上面几张
    const n = size;
    const slotOf = (p) => p;
    let fanHtml = '';
    for (let i = 0; i < n; i++) fanHtml += backHtml();
    snd('ask');
    const limit = size ? dlgLimit() : 0;
    const badge = (p) => (p === 0 ? T('ui.pos.topShort', '顶') : p === size ? T('ui.pos.bottomShort', '底') : String(p + 1));
    // 2026-11-12 用户定稿（甲）：直接在牌堆上按住左右拖炸弹猫（或点哪道缝塞哪），炸弹猫头上小红标写第几张；只留「随机」「塞进去」
    const timerHtml = limit ? '<span class="zm-dlg-timer" aria-hidden="true"><i></i></span>' : '';
    const body = '<h2 class="zm-ins-h">' + T('ui.insert.title', '塞回牌堆') + '</h2>' +
      '<div class="zm-insert-fan is-solo is-drag" data-fan>' + fanHtml + cardHtml('boom', 'is-kit') + '<span class="zm-ins-badge" data-badge>' + badge(0) + '</span>' +
        (size > 1 ? '<span class="zm-ins-end" data-end="top">' + T('ui.pos.topShort', '顶') + '</span><span class="zm-ins-end" data-end="bot">' + T('ui.pos.bottomShort', '底') + '</span>' : '') + '</div>' +
      '<div class="zm-actions is-tight">' + (size ? '<button type="button" class="zm-btn" data-q="rand">' + T('ui.random', '随机') + '</button>' : '') + '<button type="button" class="zm-btn zm-btn-primary' + (limit ? ' zm-timed' : '') + '" data-ok data-focus>' + timerHtml + '<b>' + T('ui.insert.ok', '塞进去') + '</b></button></div>';
    openStage(body, (d) => {
      const range = d.querySelector('[data-range]');
      const fan = d.querySelector('[data-fan]');
      const kit = fan.querySelector('.is-kit');
      const backs = Array.from(fan.querySelectorAll('.zm-card.is-back'));
      // 摆位置：第 k 道缝左边的牌靠左、右边的牌整体右移一个炸弹猫宽，炸弹猫落在缝里（只改 transform，有过渡，看着是牌在让）
      const layout = () => {
        const k = slotOf(pos), W = fan.clientWidth, kw = kit.offsetWidth, cw = backs.length ? backs[0].offsetWidth : 0;
        const step = n > 1 ? Math.max(2.5, Math.min(cw * 0.45, (W - 2 * cw - kw - 12) / Math.max(1, n - 2))) : 0;
        const gap = !n ? kw : (k === 0 || k === n) ? kw + 12 : kw + 12 + (cw - step);
        const total = n ? cw + (n - 1) * step + gap : kw;
        const x0 = Math.max(0, (W - total) / 2);
        backs.forEach((c, i) => { c.style.transform = 'translateX(' + (x0 + i * step + (i >= k ? gap : 0)).toFixed(1) + 'px)'; });
        const kx = k === 0 ? x0 + 6 : x0 + (k - 1) * step + cw + 6;
        kit.style.transform = 'translateX(' + kx.toFixed(1) + 'px) translateY(-10px)';
        const bd = fan.querySelector('[data-badge]');
        if (bd) { bd.textContent = badge(pos); bd.style.transform = 'translateX(' + (kx + kw / 2).toFixed(1) + 'px)'; }
        // 牌堆两头常驻小字「顶 / 底」（2026-11-17：以前只有塞到最右才显示「底」，中间的「20」不知道是从上还是从下数）
        const et = fan.querySelector('[data-end="top"]'), eb = fan.querySelector('[data-end="bot"]');
        if (et) et.style.transform = 'translateX(' + (x0 + cw / 2).toFixed(1) + 'px)';
        if (eb) eb.style.transform = 'translateX(' + (x0 + total - cw / 2).toFixed(1) + 'px)';
        geo = { x0, step, cw, n };
      };
      let geo = null;
      const set = (p) => {
        const prev = slotOf(pos);
        pos = Math.max(0, Math.min(size, p));
        if (range) range.value = pos;
        if (slotOf(pos) !== prev) { fan.classList.add('is-anim'); layout(); snd('tick'); }
      };
      requestAnimationFrame(layout);
      if (range) range.addEventListener('input', () => set(+range.value));
      // 甲：在扇面上按住左右拖（或点一下）＝把炸弹猫挪到手指底下那道缝
      if (fan.classList.contains('is-drag')) {
        const slotAt = (cx) => {
          if (!geo || !n) return 0;
          const x = cx - fan.getBoundingClientRect().left - geo.x0 - geo.cw / 2;
          return Math.round(Math.max(0, Math.min(n, x / Math.max(1, geo.step) + 0.5)));
        };
        let dragging = false;
        fan.addEventListener('pointerdown', (e) => { dragging = true; fan.setPointerCapture(e.pointerId); set(slotAt(e.clientX)); });
        fan.addEventListener('pointermove', (e) => { if (dragging) set(slotAt(e.clientX)); });
        const up = () => { dragging = false; };
        fan.addEventListener('pointerup', up); fan.addEventListener('pointercancel', up);
      }
      // 定下来：三个快捷键点了就直接塞（不用再点「塞进去」）；拖滑块的要点「塞进去」；倒计时到了 = 随机塞
      let done = false, timer = 0, tick = 0;
      const okBtn = d.querySelector('[data-ok]');
      // rand = 点了「随机」或倒计时到了：连自己都不知道塞在哪，动画也不露位置（规则「看得出大概位置」只管自己挑的）
      const commit = (p, rand) => {
        if (done || !okBtn.isConnected) return;   // 弹窗已经被关掉（托管 / 暂停）就不算数
        if (tut && tut.allow && !tut.allow({ type: 'insert', pos: p })) { shake(d.querySelector('[data-ok]')); return; }
        done = true; clearTimeout(timer); clearInterval(tick);
        if (p !== pos && !rand) set(p);
        closeDialog();
        if (game.online) preInsert();
        apply(0, rand ? { type: 'insert', pos: p, rand: true } : { type: 'insert', pos: p });
      };
      d.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        const q = b.dataset.q;
        if (q === 'rand') commit((Math.random() * (size + 1)) | 0, true); else commit(q === 'end' ? size : +q);
      }));
      d.querySelector('[data-ok]').addEventListener('click', () => commit(pos));
      if (limit) {
        const my = token, bar = d.querySelector('.zm-dlg-timer');
        const a = bar.querySelector('i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: limit, easing: 'linear', fill: 'forwards' });
        void a;
        setTimeout(() => {
          if (my !== token || done) return;
          bar.classList.add('is-hurry');
          snd('tick');
          tick = setInterval(() => { if (my !== token || done) { clearInterval(tick); return; } snd('tick'); }, 1000);
        }, Math.max(0, limit - HURRY_MS));
        timer = setTimeout(() => { if (my === token && !done && okBtn.isConnected) { timeouts += 1; autoAct = true; commit((Math.random() * (size + 1)) | 0, true); if (timeouts >= 2) setAutopilot(true); } }, limit);
      }
    });
  }

  /* 2026-11-18 用户：聚光灯那段只有一束光，庆祝不够——聚光灯照旧，上面再叠一套庆祝；三版（礼花炮 / 金星绽放 / 猫咪狂欢）里用户挑了丙：
   * 满屏从上往下飘爪印 / 小心心 / 小鱼 / 星星 / 彩带，赢家脚下喷一捧，其他人的头像也跟着左右晃着欢呼 */
  const PARTY = ['#c8463a', '#e9c46a', '#2f4a6d', '#4f8a5f', '#8e4a9c', '#e58e46', '#f3d9a4'];
  const RIBBON = '<svg viewBox="0 0 24 24"><rect x="8.5" y="2" width="7" height="20" rx="1.6"/></svg>';
  function celParty(pts, winners) {
    const W = innerWidth;
    for (let i = 0; i < 9; i++) {
      const x = W * (0.06 + 0.88 * (i / 8)) + (Math.random() - 0.5) * 30;
      fx.burst(x, -16, { n: 7, shapes: ['paw', 'heart', 'fish', 'star', RIBBON], colors: PARTY, angle: Math.PI / 2, spread: 0.5, radius: innerHeight * (0.45 + Math.random() * 0.35), size: [10, 20], life: 2600, gravity: 160, pattern: 'scatter', delay: 600 + i * 90 + Math.random() * 200 });
    }
    pts.forEach(({ x, y, r }) => fx.burst(x, y, { n: 16, shapes: ['heart', 'paw', 'star'], colors: ['#c8463a', '#e9c46a', '#e58e46', '#f7dfa0'], radius: r * 3, size: [9, 18], life: 1600, gravity: 30, pattern: 'fountain', delay: 750 }));
    // 别人也替赢家高兴：头像左右晃着、往上蹦一下
    const all = game && game.state ? Array.from({ length: game.state.n }, (_, k) => k) : [];
    all.filter((k) => winners.indexOf(k) < 0).forEach((k, i) => { const av = avEl(k); if (av) av.animate([{ transform: 'none' }, { transform: 'translateY(-7px) rotate(-10deg)', offset: 0.25 }, { transform: 'translateY(0) rotate(8deg)', offset: 0.5 }, { transform: 'translateY(-5px) rotate(-6deg)', offset: 0.75 }, { transform: 'none' }], { duration: 900, delay: 800 + i * 90, iterations: 2, easing: 'ease-in-out' }); });
    setTimeout(() => snd('combo'), 700);
    return 2900;
  }
  /* ───── 终局：聚光灯（2026-11-14 用户：给赢家戴皇冠有点土，三版里挑了乙）─────
   * 整桌暗下来，一圈暖光从大往赢家身上收拢，赢家头像浮起来一点，几粒金色微尘慢慢往上飘；上面再叠一场猫咪狂欢（celParty）；放完光圈淡掉，再弹排名 */
  async function celebrate(winner, mates) {
    const t = token, a = avPoint(winner), r = avR(winner), won = mates ? mates.indexOf(0) >= 0 : winner === 0;
    snd(won ? 'win' : 'lose');
    if (fx.reduce()) { await wait(600); return t === token; }
    const winners = mates || [winner];
    const pts = winners.map((k) => Object.assign({ av: avEl(k), r: avR(k) }, avPoint(k)));
    const lift = [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.18)', offset: 0.4 }, { transform: 'translateY(-4px) scale(1.12)' }];
    let dim = null;
    if (mates) {   // 组队：赢的那队两个人一起跳、一起冒金点（不打聚光灯——一束光只能罩一个人）
      pts.forEach(({ av }) => av && av.animate(lift, { duration: 900, delay: 200, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'forwards' }));
    } else {
      dim = document.createElement('div');
      dim.className = 'zm-win-spot';
      dim.style.setProperty('--x', a.x + 'px'); dim.style.setProperty('--y', a.y + 'px'); dim.style.setProperty('--r', (r * 1.45) + 'px');
      els.fly.appendChild(dim);
      dim.animate([{ opacity: 0, transform: 'scale(3.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 750, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });   // 光圈从大往赢家身上收拢
      if (pts[0].av) pts[0].av.animate(lift, { duration: 900, delay: 350, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'forwards' });
    }
    pts.forEach(({ x, y, r: rr }) => { for (let i = 0; i < 3; i++) fx.burst(x, y + rr * 0.6, { n: 6, shapes: ['dot'], colors: ['#f7dfa0', '#e9c46a', '#fff6d8'], radius: rr * 1.4, size: [3, 6], life: 1500, gravity: -45, pattern: 'fountain', spin: false, delay: 450 + i * 280 }); });
    const hold = celParty(pts, winners);
    await wait(Math.max(won ? 1800 : 1500, hold));
    if (dim) dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(() => dim.remove()).catch(() => dim.remove());
    pts.forEach(({ av }) => av && av.getAnimations().forEach((an) => an.cancel()));
    return t === token;
  }
  // 前三名奖章：金 / 银 / 铜（金属渐变圆牌 + 一条小绶带 + 名次数字）
  const MEDALS = [['#fff1bf', '#e5b552', '#9a6a1f', '#c8463a'], ['#ffffff', '#c9ccd2', '#7d838c', '#2f4a6d'], ['#ffd9b8', '#c98a55', '#7c4a22', '#4f8a5f']];
  function medal(i) {
    const [a, b, c, rib] = MEDALS[i], id = 'zmMd' + i;
    return '<svg class="zm-medal" viewBox="0 0 40 44" aria-label="' + T('ui.rank.nth', '第 {n} 名', { n: i + 1 }) + '"><defs><radialGradient id="' + id + '" cx=".35" cy=".3" r=".85">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient></defs>' +
      '<path d="M12 2h7l-4 14h-7z" fill="' + rib + '"/><path d="M28 2h-7l4 14h7z" fill="' + rib + '" opacity=".8"/>' +
      '<circle cx="20" cy="28" r="13" fill="url(#' + id + ')" stroke="' + c + '" stroke-width="1.4"/>' +
      '<circle cx="20" cy="28" r="9.5" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>' +
      '<text x="20" y="32.6" text-anchor="middle" font-family="ZM Num,ZM Serif,Georgia,serif" font-size="13" font-weight="700" fill="' + c + '">' + (i + 1) + '</text></svg>';
  }
  /* 领奖台（2026-11-18 用户挑乙）：前三名站 2-1-3 三级台子（金 / 银 / 铜，台面上刻名次），第四名起在下面排一列；
   * 不写「第几名」「胜利」之类的字——台子高低和颜色已经说明了。items：[{ face, nick, me }]，按名次排好 */
  const POD_COLORS = ['#c9a96e', '#a9adb5', '#c98a55'];
  // 2026-11-26 用户：9 人局榜单太长、底下的小鱼干要滚才看得到——第 4 名往后超过 3 个就排成两列小格（is-grid）
  function podiumHtml(items) {
    const col = (i) => {
      const x = items[i];
      if (!x) return '';
      return '<div class="zm-pod is-p' + (i + 1) + (x.me ? ' is-me' : '') + '" style="--pc:' + POD_COLORS[i] + '">' +
        '<span class="av">' + x.face + '</span><b class="nm">' + esc(x.nick) + (x.me ? '<i class="me">' + T('ui.me', '我') + '</i>' : '') + '</b>' +
        '<span class="blk"><span>' + (i + 1) + '</span></span></div>';
    };
    const rest = items.slice(3);
    return '<h2 class="zm-sr">' + T('ui.rank.title', '排行榜') + '</h2><div class="zm-podium">' + col(1) + col(0) + col(2) + '</div>' +
      (rest.length ? '<ol class="zm-rank zm-rank-rest' + (rest.length >= 4 ? ' is-grid' : '') + '">' + rest.map((x, j) => '<li class="' + (x.me ? 'is-me' : '') + '"><span class="pos">' + (j + 4) + '</span><span class="mini">' + x.face + '</span><span class="nm">' + esc(x.nick) + (x.me ? '<small>' + T('ui.rank.me', '（我）') + '</small>' : '') + '</span></li>').join('') + '</ol>' : '');
  }
  // 台子从底下长出来（三、二、一依次），头像随后落到台上，冠军那一下冒一圈金星
  function animPodium(d) {
    if (fx.reduce()) return;
    const order = ['.is-p3', '.is-p2', '.is-p1'];
    order.forEach((sel, j) => {
      const p = d.querySelector('.zm-pod' + sel);
      if (!p) return;
      const at = 120 + j * 220;
      p.querySelector('.blk').animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.06)', offset: 0.75 }, { transform: 'scaleY(1)' }], { duration: 460, delay: at, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' });
      p.querySelectorAll('.av, .nm').forEach((n) => n.animate([{ transform: 'translateY(-36px)', opacity: 0 }, { transform: 'translateY(4px)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 440, delay: at + 300, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
      if (sel === '.is-p1') setTimeout(() => { const r = p.querySelector('.av').getBoundingClientRect(); if (r.width) fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 14, shapes: ['star', 'dot'], colors: ['#f7dfa0', '#e9c46a', '#fff6d8', '#c9a96e'], radius: r.width * 1.1, size: [5, 13], life: 1100, gravity: 18, pattern: 'ring' }); }, at + 560);
    });
    d.querySelectorAll('.zm-rank-rest li').forEach((li, i) => li.animate([{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: 900 + i * 70, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }
  async function finish() {
    if (HL && !game.tutorial && !game.online) HL.finish(game);
    const wp = WAL && !game.tutorial && !game.online ? WAL.settle(game) : null;
    busy = true;
    bgm('end');
    const s = game.state;
    clearStage();
    renderAll();
    // 组队：赢的那一队（还活着的）都排在最前、都写「胜利」，然后按出局顺序倒着排
    // 组队（2026-11-15 巡查）：赢的那一队两个人都算赢（中途出局的队友也算），不发个人名次 / 奖牌；先列赢的队、再列输的队，队里还在场的排前面
    const team = teamGame();
    const seats = Array.from({ length: s.n }, (_, k) => k);
    const winners = team ? seats.filter((k) => R.teamOf(s, k) === s.winnerTeam).sort((a, b) => (s.alive[b] ? 1 : 0) - (s.alive[a] ? 1 : 0)) : [s.winner];
    const order = team ? winners.concat(seats.filter((k) => winners.indexOf(k) < 0).sort((a, b) => s.outOrder.indexOf(b) - s.outOrder.indexOf(a))) : winners.concat(s.outOrder.slice().reverse());
    const won = team ? R.teamOf(s, 0) === s.winnerTeam : s.winner === 0;
    const ok = await celebrate(s.winner, team ? winners : null);
    if (!ok) return;
    if (game.tutorial && tut && tut.mini) { showCoach(tut.finish ? tut.finish(won) : [], lessonDone); return; }
    if (game.tutorial) {
      markLesson('basic');
      guideReset();   // 刚学完核心：剩下的牌和玩法，实战里第一次碰到都讲一遍
      const msgs = tut && tut.finish ? tut.finish(won) : [];
      showCoach(msgs, () => {
        bgm('menu');
        openDialog('<h2>' + T('tut.end.title', '教程完成') + '</h2><p>' + T('tut.end.body', '来一局真的吧：{n} 人，机器猫{tier}（菜单里的设置可以改）。', { n: settings.players, tier: AI.TIER_NAMES[settings.tier] }) + '</p>' +
          '<div class="zm-actions"><button type="button" class="zm-btn" data-home>' + homeLabel() + '</button><button type="button" class="zm-btn zm-btn-primary" data-go data-focus>' + T('ui.startGame', '开始对局') + '</button></div>', (d) => {
          tagNextPrice(d.querySelector('[data-go]'));
          d.querySelector('[data-go]').addEventListener('click', () => { closeDialog(); payThenPlay(); });
          d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); endTutorial(false); });
        });
      });
      return;
    }
    try { localStorage.removeItem(STORE_KEY); } catch (_) { /* 无痕 */ }
    bgm('menu');   // 结算页算游戏外：接上丁（一局结束时先淡出，皇冠彩纸放完、排行榜出来再起）
    // 组队：赢的队两个人都算赢，不排个人名次——还是一列（赢的队 / 输的队）；其余用领奖台
    if (team) {
      openDialog(teamRankHtml(order, winners.length, won) + (wp ? WAL.slot() : '') +
        '<div class="zm-actions"><button type="button" class="zm-btn" data-home>' + homeLabel() + '</button><button type="button" class="zm-btn zm-btn-primary" data-again data-focus>' + T('ui.again', '再来一局') + '</button></div>', (d) => { soloEndWire(d); if (wp) WAL.fill(d, wp, game); });
      return;
    }
    openDialog(podiumHtml(order.map((seat) => ({ face: avatarHtml(seat), nick: nameOf(seat), me: seat === 0 }))) + (wp ? WAL.slot() : '') +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-home>' + homeLabel() + '</button><button type="button" class="zm-btn zm-btn-primary" data-again data-focus>' + T('ui.again', '再来一局') + '</button></div>', (d) => { d.classList.add('is-podium'); soloEndWire(d); animPodium(d); if (wp) WAL.fill(d, wp, game); });
  }
  function soloEndWire(d) {
    // 再来一局（2026-11-23 用户：以前不管余额够不够直接开，也看不出交没交门票）：够 → 几条小鱼从结算页的余额游进「再来一局」、余额往下滚，再开；不够 → 弹「小鱼干不够了」
    // 2026-11-24 用户：按钮上直接写门票
    if (WAL && WAL.costTag) WAL.costTag(d.querySelector('[data-again]'), WAL.price(settings.tier, curMode(), soloN()));
    d.querySelector('[data-again]').addEventListener('click', (e) => {
      const b = e.currentTarget;
      if (!WAL || !WAL.pay) { closeDialog(); newGame(); return; }
      if (b.dataset.paying) return;
      b.dataset.paying = '1';   // 不用 disabled：按钮一变灰，鱼像游进一个点不动的键（2026-11-23 录屏）
      WAL.pay({ tier: settings.tier, mode: curMode(), n: soloN(), from: (WAL.tableChip && WAL.tableChip()) || d.querySelector('.zmw-bal'), to: b }).then((ok) => { delete b.dataset.paying; if (ok && d.contains(b) && !els.mask.hidden) { closeDialog(); newGame(); } });   // 2026-11-26：门票从左上角常驻的小鱼干游进「再来一局」
    });
    d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); showCover(); });
  }

  // 角色猫：这一桌每个人是哪只猫（小角色卡 + 名字 + 一句技能）；没开局时列出全部 6 只
  function rolesHtml() {
    const st = game && game.state;
    const row = (r, who) => '<li>' + roleCardHtml(r, { w: 54 }) + '<span>' + (who ? '<small>' + who + '</small>' : '') + '<b>' + roleInfo(r).name + '</b>' + esc(roleInfo(r).desc) + '</span></li>';
    if (!st || !st.roles) return (settings.rules || {}).mode === 'roles' ? '<h3>' + T('rules.roles', '角色猫') + '</h3><ul class="zm-role-list">' + R.ROLES.map((r) => row(r.id, '')).join('') + '</ul>' : '';
    return '<h3>' + T('rules.rolesTable', '角色猫（这一桌）') + '</h3><ul class="zm-role-list">' + st.roles.map((r, k) => row(r, esc(k === meSeat() ? T('ui.me', '我') : nameOf(k)))).join('') + '</ul>';
  }
  function rulesHtml() {
    const li = (k, t) => '<li>' + cardHtml(k) + '<b>' + R.NAMES[k] + '</b>　' + t + '</li>';
    const teamRules = ((game && game.state && game.state.rules) || settings.rules || {}).mode === 'team';
    return '<div class="zm-rules"><h2>' + T('rules.title', '怎么玩') + '</h2>' +
      (rolesHtml()) +
      (teamRules ? '<h3>' + T('rules.team', '组队') + '</h3><ul>' + '<li>' + T('rules.team.1', '每队人数一样多（2v2、3v3、4v4，或者三队各 2 人）。所有人围着桌子坐一圈，你在底边靠左；<b>头像底色一样的是一队</b>，你这队是蓝色。左上角的小圆点是每队还剩几个人。') + '</li>' + '<li>' + T('rules.team.2', '出牌顺序沿着桌子逆时针转（打出「转向」就倒过来，桌沿上的小箭头会掉头）；桌沿上转圈的光是现在出牌那队的颜色。开局前可以选同队坐一起，或者随机打乱。') + '</li>' + '<li>' + T('rules.team.3', '下家是队友时，普通「甩锅」和「跳过」都会坑到他——想躲就用「自由甩锅」甩给对手，或者先「转向」。') + '</li>' + '<li>' + T('rules.team.4', '队友谁窥探 / 改命，全队都看得到那几张；队友塞回炸弹猫的位置你也知道。') + '</li>' + '<li>' + T('rules.team.5', '摸到炸弹猫又没有逗猫棒：你喊「救我！」，所有队友一起被问，谁先点「救」就用谁的逗猫棒，你自己把炸弹猫塞回去。没人救就出局。不管队友有没有逗猫棒，大家看到的都一样，对手看不出你们队还剩几根。') + '</li>' + '<li>' + T('rules.team.5b', '不想让队友在你身上耗逗猫棒：点你头像左上角的小逗猫棒，变灰划线就是「别救我」（随时能改回来）。队友头像上也会出现这个记号；真炸了时队友看到你喊「别救我！」、谁都不用想，你直接出局。对手看不到这个记号，炸的时候他们看到的仍是你喊救、没人救成。') + '</li>' + '<li>' + T('rules.team.6', '一队全炸毛出局就淘汰；只剩一队时这队赢——只剩一个人也算赢。') + '</li>' + '</ul>' : '') +
      '<p>' + T('rules.intro', '牌堆里藏着炸弹猫（比人数少一只）。轮到你时，可以出任意多张牌，也可以一张不出，<b>最后摸一张牌结束回合</b>。摸到炸弹猫、手里又没有逗猫棒，就出局。撑到最后的人赢。') + '</p>' +
      '<h3>' + T('rules.deal', '每人开局') + '</h3><ul><li>' + T('rules.deal.1', '4 张随机牌 + 1 张逗猫棒。牌堆下面的数字是剩几张、红色小炸弹猫是里面还有几只。') + '</li></ul>' +
      '<h3>' + T('rules.cards', '牌') + '</h3><ul>' +
      li('boom', T('rules.card.boom', '摸到就炸毛出局，除非有逗猫棒')) +
      li('defuse', (() => { const r = R.normalizeRules((game && game.state && game.state.rules) || settings.rules); return T('rules.card.defuse', '摸到炸弹猫时自动用掉，然后你把炸弹猫塞回牌堆任意位置') + (r.insertSeen ? T('rules.card.defuse.seen', '——大家看得到你塞进去的大概高度（最上 / 最底一眼看得出，中间只能估；不报第几张；点「随机」的看不出）') : T('rules.card.defuse.hidden', '，别人看不出塞在哪')); })()) +
      li('nope', T('rules.card.nope', '作废别人刚出的牌（不管轮没轮到你）。也能作废别人的「作废」，叠了单数张 = 作废。挡不了炸弹猫和逗猫棒')) +
      li('attack', T('rules.card.attack', '结束回合、不摸牌，下家连着摸两回合（被甩锅的人再甩锅：剩下的回合 +2 一起甩走，可以一路越叠越多）')) +
      li('tattack', T('rules.card.tattack', '同甩锅，但可以甩给任意一个人，也可以甩给自己发育（点头像）')) +
      li('skip', T('rules.card.skip', '结束一个回合、不摸牌。被甩锅时只顶掉其中一回合')) +
      li('reverse', T('rules.card.reverse', '出牌方向倒过来（对手之间的小箭头跟着掉头），并像跳过一样结束一个回合、不摸牌。被甩锅时只顶掉其中一回合；两个人玩就等于跳过')) +
      (((game && game.state && game.state.rules) || settings.rules || {}).mode === 'flux' ? li('flux', T('rules.card.flux', '转一次转盘，换上抽到的规则。能被作废')) : '') +
      li('swap', (() => { const r = (game && game.state && game.state.rules) || settings.rules; return T('rules.card.swap', '和指定的一个人整手交换手牌') + (r.swapDefuse ? T('rules.card.swap.wand', '（连逗猫棒一起换）') : T('rules.card.swap.keep', '（各自的逗猫棒不换）')) + (r.swap ? '' : T('rules.card.swap.off', '。设置里开了「有交换牌」才有')); })()) +
      li('favor', T('rules.card.favor', '指定一人，他自己挑一张给你')) +
      li('shuffle', T('rules.card.shuffle', '把牌堆洗乱')) +
      li('future', T('rules.card.future', '看牌堆最上面三张')) +
      li('bottom', T('rules.card.bottom', '这一回合不从顶上摸，改从牌堆最底下摸一张') + (((game && game.state && game.state.rules) || settings.rules || {}).mode === 'flux' ? T('rules.card.bottom.flux', '（摸底规则下变成抽顶，从顶部摸）') : '')) +
      li('alter', T('rules.card.alter', '看牌堆最上面三张，并按你想要的顺序放回去（别人看不到）')) +
      '</ul><h3>' + T('rules.combos', '组合（任何同名牌都算）') + '</h3><ul>' +
      '<li><b>' + T('rules.combo.pair', '两张一样') + '</b>　' + T('rules.combo.pair.d', '指定一人，随机偷他一张') + '</li>' +
      '<li><b>' + T('rules.combo.three', '三张一样') + '</b>　' + T('rules.combo.three.d', '指定一人并点名一种牌，他有就得给你') + '</li>' +
      '<li><b>' + T('rules.combo.five', '五种猫各一张') + '</b>　' + T('rules.combo.five.d', '橘猫、三花、奶牛猫、狸花、暹罗凑齐：从弃牌堆捡任意一张（行动牌、作废不算）') + '</li>' +
      '<li>' + T('rules.combo.cats', '橘猫、三花、奶牛猫、狸花、暹罗本身没用，专门凑组合') + '</li></ul>' +
      '<ul>' + li('wild', T('rules.card.wild', '能顶任何一种猫：和一只猫凑成两张一样 / 三张一样，五种猫缺哪种也能拿它顶；两张万能猫也算一对。单出没用')) + '</ul>' +
      '<h3>' + T('rules.how', '操作') + '</h3><ul><li>' + T('rules.how.1', '点手牌选中（可多选），再点「出牌」；需要指定人时，能选的人头像会亮，点他的头像。') + '</li>' +
      '<li>' + T('rules.how.2', '不想出牌就点「摸牌」结束回合。轮到你时头像外有一圈红环在收，收完还没动就自动替你摸一张（设置里可改成不限时）。') + '</li>' +
      '<li>' + T('rules.how.3b', '别人出了和你有关的牌（指着你的、甩到你头上的，组队时也包括队友），下面那根导火索在烧：你手里有「作废」就会出现紫色按钮，烧完之前点它。点手里的「作废」牌只会抬起来，不会打出去。和你无关的牌默认不问你；想连别人之间的牌也管，就到设置里关掉「只在直接和我相关时询问「作废」」。') + '</li></ul></div>';
  }
  function showRules() {
    // 2026-11-15 用户：窗口别占满全屏；右上角一个叉，点窗外任何地方也能关（遮罩点击认 data-ok）
    openDialog('<button type="button" class="zm-rules-x" data-ok data-focus aria-label="' + T('ui.close', '关闭') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' + rulesHtml(), (d) => {
      d.classList.add('is-rules');
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
    });
  }

  /* 设置分层（2026-11-26 用户定「丙」）：
   *  · 主页 / 局内菜单的「设置」只放跟人走的偏好——牌面大小（带整局缩略预览）、作废提醒一个开关、语言（App 里）、联机时观战者能不能看我的手牌；
   *    局内另外只读列出这一局的规则。放大镜是游戏本身的属性，不给开关。
   *  · 跟这一局走的规则（限时、牌量、交换牌、交换时逗猫棒换不换、炸弹塞回看不看得出）挪到开局：单机开局单、联机房间页各一个白框，
   *    框里右上角「规则 ›」、下面一排小规则牌（改过默认的那张描金边），点开是规则页——白框卡片、行首牌面小图、没有说明文字，
   *    右上角「恢复默认」、没有「好」，一改就存。单机记住上次选的；联机房主改、别人点开只能看 */
  const DECK_OPTS = [['quick', T('ui.set.deck.less', '少')], ['std', T('ui.set.deck.std', '标准')], ['more', T('ui.set.deck.more', '多')]];
  // 界面语言（只有 App 里有：app/i18n.js 装了 PuffcatI18n 才出这一行）。三个选项各用自己的语言写，切换后重载页面（存档在 localStorage，重载后接着打）
  const I18N = window.PuffcatI18n && window.PuffcatI18n.SUPPORTED ? window.PuffcatI18n : null;
  const LANG_OPTS = [['zh-Hans', '简体中文'], ['zh-Hant', '繁體中文'], ['en', 'English']];
  // 规则的默认值（「恢复默认」回到这里；小规则牌和它不一样就描金边）
  const RULE_DEF = { turnSec: 20, deckSize: 'std', swap: false, swapDefuse: false, insertSeen: false };
  /* 规则小图跟着状态变（2026-11-26 用户）：限时 10 秒 / 20 秒 / 不限时 = 钟面上一小块 / 一大块红扇 / ∞；牌量 少 / 标准 / 多 = 2 / 3 / 5 张错开叠着；
   * 交换牌、交换时逗猫棒也换：关着 = 牌面变淡 + 一道红色禁止圈；塞回：看不出 = 角上一只闭着的眼、看得出 = 睁着的眼。
   * ruleIcon(k, r, t) → [底色, svg]；r = 规范化后的规则，t = 限时秒数 */
  const NAVY = '#2f4a6d', SEAL_RED = '#c8463a', CREAM = '#fffaf0';
  const svgWrap = (inner) => '<svg viewBox="0 0 100 100" aria-hidden="true">' + inner + '</svg>';
  function timerSvg(t) {
    let s = '<rect x="42" y="12" width="16" height="9" rx="3" fill="' + NAVY + '"/><circle cx="50" cy="56" r="29" fill="' + CREAM + '" stroke="' + NAVY + '" stroke-width="7"/>';
    if (!t) return svgWrap(s + '<path d="M50 56c-4-6-8-9-12-9a9 9 0 0 0 0 18c4 0 8-3 12-9s8-9 12-9a9 9 0 0 1 0 18c-4 0-8-3-12-9Z" fill="none" stroke="' + SEAL_RED + '" stroke-width="5.5" stroke-linejoin="round"/>');
    const a = (t <= 10 ? 120 : 240) * Math.PI / 180, r = 21, x = 50 + r * Math.sin(a), y = 56 - r * Math.cos(a);
    s += '<path d="M50 56V' + (56 - r) + 'A' + r + ' ' + r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + 'Z" fill="' + SEAL_RED + '" opacity=".85"/>';
    return svgWrap(s + '<circle cx="50" cy="56" r="4" fill="' + NAVY + '"/>');
  }
  function deckSvg(size) {
    const n = size === 'quick' ? 2 : size === 'more' ? 5 : 3, dx = 9, dy = -7, w = 36, h = 50;
    const x0 = 50 - w / 2 - (n - 1) * dx / 2, y0 = 52 - h / 2 - (n - 1) * dy / 2;
    let s = '';
    for (let i = 0; i < n; i++) {
      const top = i === n - 1, x = x0 + i * dx, y = y0 + i * dy;
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w + '" height="' + h + '" rx="6" fill="' + (top ? CREAM : i % 2 ? '#e8d3a8' : '#c9a96e') + '" stroke="' + NAVY + '" stroke-width="' + (top ? 4.5 : 3) + '"/>';
      if (top) s += '<circle cx="' + (x + w / 2).toFixed(1) + '" cy="' + (y + h / 2).toFixed(1) + '" r="7.5" fill="' + NAVY + '"/>';
    }
    return svgWrap(s);
  }
  // 关着：牌面淡下去，盖一道禁止圈
  const offSvg = (face) => svgWrap('<g opacity=".5">' + face.replace('<svg ', '<svg width="100" height="100" ') + '</g><circle cx="50" cy="50" r="36" fill="none" stroke="' + SEAL_RED + '" stroke-width="6"/><path d="M25 75 75 25" stroke="' + SEAL_RED + '" stroke-width="6" stroke-linecap="round"/>');
  // 塞回：角上一只眼（睁 = 大家看得出塞在哪，闭 = 看不出）
  const eyeSvg = (face, open) => svgWrap(face.replace('<svg ', '<svg width="100" height="100" ') + '<circle cx="74" cy="74" r="19" fill="' + CREAM + '" stroke="' + NAVY + '" stroke-width="4"/>' + (open
    ? '<path d="M61 74q13-12 26 0q-13 12-26 0Z" fill="#fff" stroke="' + NAVY + '" stroke-width="3.5" stroke-linejoin="round"/><circle cx="74" cy="74" r="4.5" fill="' + NAVY + '"/>'
    : '<path d="M61 72q13 11 26 0" fill="none" stroke="' + NAVY + '" stroke-width="3.5" stroke-linecap="round"/><path d="M65 77l-2 4M74 79v4.5M83 77l2 4" stroke="' + NAVY + '" stroke-width="3" stroke-linecap="round"/>'));
  function ruleIcon(k, r, t) {
    if (k === 'timer') return ['#e3ecf5', timerSvg(t)];
    if (k === 'deck') return ['#f3e6cf', deckSvg(r.deckSize)];
    if (k === 'swap' || k === 'defuse') { const on = k === 'swap' ? r.swap : r.swapDefuse; return [on ? ART.TONE[k].bg : '#ecebe7', on ? ART.face(k) : offSvg(ART.face(k))]; }
    if (k === 'boom') return [ART.TONE.boom.bg, eyeSvg(ART.face('boom'), !!r.insertSeen)];
    return [ART.TONE[k].bg, ART.face(k)];
  }
  const ruleSig = (k, r, t) => String(k === 'timer' ? t : k === 'deck' ? r.deckSize : k === 'swap' ? r.swap : k === 'defuse' ? r.swapDefuse : k === 'boom' ? r.insertSeen : '');
  const ruleFace = (k, r, t) => {
    const [bg, svg] = ruleIcon(k, r || {}, t);
    return '<i class="zr-mc" data-rface="' + k + '" data-sig="' + ruleSig(k, r || {}, t) + '" style="--bg:' + bg + '" aria-hidden="true">' + svg + '</i>';
  };
  const ruleTs = (ts) => (TURN_OPTS.some(([v]) => v === ts) ? ts : RULE_DEF.turnSec);
  const rulesDefault = (rules, ts) => { const r = R.normalizeRules(rules); return ruleTs(ts) === RULE_DEF.turnSec && ['deckSize', 'swap', 'swapDefuse', 'insertSeen'].every((k) => r[k] === RULE_DEF[k]); };
  const modeName = (m) => (SOLO_MODES.find(([x]) => x === m) || SOLO_MODES[0])[1];
  // 一排小规则牌。open = 整个白框是按钮（右上角「规则 ›」）；否则只读
  function ruleChipsHtml(rules, ts, open) {
    const r = R.normalizeRules(rules), t = ruleTs(ts);
    const chip = (k, label) => '<span class="zr-chip">' + ruleFace(k, r, t) + '<small>' + label + '</small></span>';
    const chips = '<span class="zr-chips">' +
      chip('timer', t ? T('ui.secs', '{n} 秒', { n: t }) : T('ui.set.noLimit', '不限时')) +
      chip('deck', (DECK_OPTS.find(([v]) => v === r.deckSize) || DECK_OPTS[1])[1]) +
      chip('swap', r.swap ? T('ui.rule.swapOn', '有交换') : T('ui.rule.swapOff', '无交换')) +
      chip('boom', r.insertSeen ? T('ui.rule.insSeen', '塞回明') : T('ui.rule.insHid', '塞回暗')) + '</span>';
    return open
      ? '<button type="button" class="zr-box" data-rules-open aria-label="' + T('ui.rules.edit', '规则') + '"><span class="zr-more">' + T('ui.rules.edit', '规则') + '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.2 2.2 8 6l-3.8 3.8"/></svg></span>' + chips + '</button>'
      : '<div class="zr-box is-ro">' + chips + '</div>';
  }
  // 规则页（单机：开局单里滑过去；联机：房间页弹出来）。edit = 能改；不能改的控件灰着
  function rulePageHtml(title, rules, ts, edit) {
    const r = R.normalizeRules(rules), t = ruleTs(ts), dis = edit ? '' : ' disabled';
    const seg = (key, opts, val) => '<div class="zs-seg" data-rseg="' + key + '" role="group">' + opts.map(([v, tx]) => '<button type="button" data-v="' + v + '" aria-pressed="' + (String(v) === String(val)) + '"' + dis + '>' + tx + '</button>').join('') + '</div>';
    const sw = (key, on) => '<button type="button" class="zs-switch" data-rsw="' + key + '" role="switch" aria-checked="' + !!on + '"' + dis + '><i></i></button>';
    const row = (k, name, ctl, dep) => '<div class="zs-row zr-row"' + (dep ? ' data-rdep="' + dep + '"' + (r[dep] ? '' : ' hidden') : '') + '>' + ruleFace(k, r, t) + '<div class="zs-txt"><b>' + name + '</b></div>' + ctl + '</div>';
    return '<div class="zr-head"><button type="button" class="zr-back" data-rules-back aria-label="' + T('ui.back', '返回') + '"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24.5 6.5 13 20l11.5 13.5"/></svg></button><b>' + esc(title) + '</b>' +
      (edit ? '<button type="button" class="zr-reset" data-rules-reset' + (rulesDefault(r, t) ? ' disabled' : '') + '>' + T('ui.rules.reset', '恢复默认') + '</button>' : '<span class="zr-host">' + T('lobby.hostRules', '规则由房主定') + '</span>') + '</div>' +
      '<section class="zs-card zr-card">' +
      row('timer', T('ui.set.timer', '出牌限时'), seg('turnSec', TURN_OPTS, t)) +
      row('deck', T('ui.set.deck', '牌量'), seg('deckSize', DECK_OPTS, r.deckSize)) +
      row('swap', T('ui.set.swap', '有交换牌'), sw('swap', r.swap)) +
      row('defuse', T('ui.set.swapDefuse', '交换时逗猫棒也换'), sw('swapDefuse', r.swapDefuse), 'swap') +
      row('boom', T('ui.set.hideIns2', '炸弹塞回时看不出位置'), sw('hideIns', r.insertSeen === false)) +
      '</section>';
  }
  /* 规则页的点击（事件挂在不换掉的外层上）：o.get() → { rules, ts }；o.set({ turnSec } | { rules: {…} })；o.back()；o.title() */
  function bindRulePage(root, o) {
    root._rp = o;
    if (root._rpBound) return;
    root._rpBound = true;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'), o = root._rp;
      if (!b || b.disabled || !o) return;
      if (b.matches('[data-rules-back]')) { o.back(); return; }
      if (b.matches('[data-rules-reset]')) {
        o.set({ turnSec: RULE_DEF.turnSec });
        o.set({ rules: { deckSize: RULE_DEF.deckSize, swap: RULE_DEF.swap, swapDefuse: RULE_DEF.swapDefuse, insertSeen: RULE_DEF.insertSeen } });
        const cur = o.get();
        root.innerHTML = rulePageHtml(o.title(), cur.rules, cur.ts, true);
        snd('tap');
        return;
      }
      const g = b.closest('[data-rseg]');
      if (g && b.dataset.v != null) {
        g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        fx.pop(b, { scale: 1.06, dur: 200 });
        if (g.dataset.rseg === 'turnSec') o.set({ turnSec: +b.dataset.v });
        else o.set({ rules: { [g.dataset.rseg]: b.dataset.v } });
        snd('tap');
      } else if (b.dataset.rsw) {
        const on = b.getAttribute('aria-checked') !== 'true', k = b.dataset.rsw;
        b.setAttribute('aria-checked', String(on));
        o.set({ rules: k === 'hideIns' ? { insertSeen: !on } : { [k]: on } });
        root.querySelectorAll('[data-rdep="' + k + '"]').forEach((x) => {
          x.hidden = !on;
          if (on && !fx.reduce()) x.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
        });
        snd('tap');
      } else return;
      const cur = o.get(), rb = root.querySelector('[data-rules-reset]');
      if (rb) rb.disabled = rulesDefault(cur.rules, cur.ts);
      const nr = R.normalizeRules(cur.rules), nt = ruleTs(cur.ts);
      root.querySelectorAll('[data-rface]').forEach((el) => {   // 小图跟着换
        const sig = ruleSig(el.dataset.rface, nr, nt);
        if (el.dataset.sig === sig) return;
        const [bg, svg] = ruleIcon(el.dataset.rface, nr, nt);
        el.dataset.sig = sig; el.style.setProperty('--bg', bg); el.innerHTML = svg;
        if (!fx.reduce()) el.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
      });
    });
  }
  // 单机：开局单里的规则（settings.rules / settings.turnSec，存下来下次还是这样）
  const soloRuleIO = (back) => ({
    get: () => ({ rules: settings.rules, ts: settings.turnSec }),
    set: (p) => {
      if (p.turnSec != null) settings.turnSec = p.turnSec;
      if (p.rules) settings.rules = R.normalizeRules(Object.assign({}, settings.rules, p.rules));
      saveSettings(); refreshCover();
    },
    back,
    title: () => modeName(curMode()) + ' · ' + T('ui.rules.edit', '规则'),
  });

  /* 牌面大小的预览（2026-11-26 用户：整桌缩小看不出小有多小、大有多大）：按真打时的实际像素摆——上面牌堆 + 出牌区，下面一手 7 张，
   * 宽度和重叠都照这块屏幕算（同 solveSize / layoutHand）；比设置框宽的部分两边淡出裁掉。点小 / 中 / 大当场变大变小 */
  function baseU() {
    if (game && game.state) return U();   // 对局里：就用桌上现在的
    const W = Math.round(els.app.clientWidth || innerWidth), H = Math.round(els.app.clientHeight || innerHeight);
    const tw = W - 24, th = H - 56;
    if (LANDSCAPE_SHORT.matches) return Math.max(40, Math.floor(Math.min(tw / 9, (th - 130) / 3.7, 76)));
    const av = tw < 500 ? 46 : 54;
    return Math.max(46, Math.floor(Math.min(tw / 5.5, (th - (50 + av + 50 + 66 + 26 + 40)) / 3.4, 98)));
  }
  function sizePreviewHtml(sz) {
    const u = baseU(), dim = (k) => { const z = CARD_SIZES[k] || CARD_SIZES.m; return { hu: Math.min(u * z[0], 120), pu: u * 0.92 * z[1] }; };
    const { hu, pu } = dim(sz), big = dim('l'), f = (x) => x.toFixed(1) + 'px';
    const W = Math.round(els.app.clientWidth || innerWidth);
    // 手牌：横屏手牌一行两边让出头像和按钮；竖屏占满底边
    const hw = LANDSCAPE_SHORT.matches ? W * 0.62 : W - 8, n = 7;
    let gap = 6;
    if (n * hu + (n - 1) * gap > hw) gap = (hw - hu) / (n - 1) - hu;
    const cw = (k, w, extra) => cardHtml(k, '', '--cw:' + f(w) + (extra || ''));
    // 参照尺：小中大三张手牌的虚线框叠在一起（底边对齐），当前这档放一张真牌
    const ruler = '<div class="zs-pv-ruler" style="width:' + f(big.hu) + ';height:' + f(big.hu * 1.4) + '">' +
      ['l', 'm', 's'].map((k) => { const w = dim(k).hu; return '<i class="' + (k === sz ? 'on' : '') + '" style="width:' + f(w) + ';height:' + f(w * 1.4) + '"></i>'; }).join('') +
      cw('defuse', hu, ';position:absolute;left:0;bottom:0') + '</div>';
    const piles = '<div class="zs-pv-piles" style="gap:' + f(pu * 0.5) + '">' + backHtml('', '--cw:' + f(pu) + ';width:' + f(pu)) + cw('skip', pu, ';rotate:4deg') + '</div>';
    const hand = ['defuse', 'nope', 'attack', 'skip', 'favor', 'shuffle', 'future'].map((k, i) => cw(k, hu, ';margin-left:' + (i ? gap.toFixed(1) : 0) + 'px;z-index:' + i)).join('');
    // 高度都按「大」留好，切换时设置窗口不跟着变
    return '<div class="zs-pv-top" style="height:' + f(Math.max(big.hu, big.pu) * 1.4 + 6) + '">' + ruler + piles + '</div>' +
      '<div class="zs-pv-hand" style="height:' + f(big.hu * 1.4) + '">' + hand + '</div>';
  }

  function showSettings(fromCover) {
    const segs = (key, opts, val) => '<div class="zs-seg" data-seg="' + key + '" role="group">' + opts.map(([v, t]) => '<button type="button" data-v="' + v + '" aria-pressed="' + (String(v) === String(val)) + '">' + t + '</button>').join('') + '</div>';
    const sizeNow = CARD_SIZES[settings.cardSize] ? settings.cardSize : 'm';
    const swRow = (face, title, attr, on) => '<div class="zs-row">' + ruleFace(face) + '<div class="zs-txt"><b>' + title + '</b></div><button type="button" class="zs-switch" ' + attr + ' role="switch" aria-checked="' + !!on + '"><i></i></button></div>';
    let html = '<h2>' + T('ui.settings', '设置') + '</h2>' +
      '<section class="zs-card"><div class="zs-line"><span>' + T('ui.set.cardSize', '牌面大小') + '</span>' + segs('cardSize', [['s', T('ui.set.size.s', '小')], ['m', T('ui.set.size.m', '中')], ['l', T('ui.set.size.l', '大')]], sizeNow) + '</div>' +
      '<div class="zs-pv" data-size-prev>' + sizePreviewHtml(sizeNow) + '</div></section>' +
      // 作废提醒（单机联机都有）：开着 = 只问和我有关的（默认）
      '<section class="zs-card">' + swRow('nope', T('ui.set.nopeMine', '只在直接和我相关时询问<span class="zs-nw">「作废」</span>'), 'data-nope-mine', settings.nopeOthers !== true) + '</section>';
    // 联机坐着的人：观战者能不能看我的手牌
    const meP = online && online.st ? online.st.players.find((p) => p.id === online.st.me && !p.left) : null;
    if (meP) html += '<section class="zs-card">' + swRow('future', T('ui.set.reveal', '观战者能看我的手牌'), 'data-online-reveal', meP.showHand) + '</section>';
    if (I18N) html += '<section class="zs-card"><div class="zs-line zs-lang"><span>' + T('ui.set.lang', '语言') + '</span>' + segs('lang', LANG_OPTS, LANG) + '</div></section>';
    // 局内：这一局的规则（只看；要换规则就开新的一局）
    const st = !fromCover && game && !game.tutorial && game.state;
    if (st && st.rules) html += '<div class="zs-cap">' + T('ui.set.tableRules', '这一局的规则') + '</div>' + ruleChipsHtml(st.rules, turnSec(), false);
    html += '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-close data-focus>' + T('ui.ok', '好') + '</button></div>';
    openDialog(html, (d) => {
      d.classList.add('zs', 'zs-b');
      d.querySelectorAll('[data-seg]').forEach((g) => g.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-v]');
        if (!b) return;
        g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        fx.pop(b, { scale: 1.06, dur: 200 });
        const key = g.dataset.seg, v = b.dataset.v;
        if (key === 'cardSize') {   // 牌面大小：马上生效、不用重开；预览跟着换
          settings.cardSize = v; saveSettings(); applyCardSize();
          if (game && game.state) { solveSize(); renderAll(); }
          const pv = d.querySelector('[data-size-prev]');
          if (pv) {   // 新尺寸从旧尺寸长过去，看得出变了多少
            const old = pv.querySelector('.zs-pv-ruler .zm-card'), w0 = old ? old.offsetWidth : 0;
            pv.innerHTML = sizePreviewHtml(v);
            const nw = pv.querySelector('.zs-pv-ruler .zm-card'), w1 = nw ? nw.offsetWidth : 0;
            if (w0 && w1 && !fx.reduce()) pv.querySelectorAll('.zs-pv-ruler > .zm-card, .zs-pv-piles, .zs-pv-hand > *').forEach((el) => el.animate([{ transform: 'scale(' + (w0 / w1).toFixed(3) + ')' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.25,1)' }));
          }
          snd('tap');
          return;
        }
        if (key === 'lang') { if (v !== LANG && I18N) { save(); I18N.setLang(v); } }
      }));
      const nopeSw = d.querySelector('[data-nope-mine]');
      if (nopeSw) nopeSw.addEventListener('click', () => {
        const on = nopeSw.getAttribute('aria-checked') !== 'true';
        nopeSw.setAttribute('aria-checked', String(on));
        settings.nopeOthers = !on;
        saveSettings(); snd('tap');
      });
      d.querySelectorAll('[data-online-reveal]').forEach((b) => b.addEventListener('click', () => {
        const on = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(on));
        snd('tap');
        onlineAct('reveal', { on });
      }));
      d.querySelector('[data-close]').addEventListener('click', closeDialog);
    });
  }
  /* ───── 右上角菜单（照拱猪）─────
   * 每条 = 左边一个线条小图标 + 一行字；按场合换内容：对局里 / 教程里。
   * 「返回百宝奇巧」只给从本站点进来的人（记在这个标签页里，刷新也还在）；单独打开的（分享链接、装到桌面）不占这一条 */
  const FROM_SITE = (() => {
    const K = 'zm-from-site';
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && !ref.pathname.startsWith('/toolbox/puffcat') && !ref.pathname.startsWith('/toolbox/zhamao')) sessionStorage.setItem(K, '1');
      return sessionStorage.getItem(K) === '1';
    } catch (_) { return false; }
  })();
  // 齿轮：8 个齿按角度算出来
  const GEAR = (() => {
    const pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2); };
    let d = '';
    for (let k = 0; k < 8; k++) {
      const c = k * 45;
      d += (k ? 'L' : 'M') + pt(c - 16, 6.6) + 'L' + pt(c - 10, 9.4) + 'L' + pt(c + 10, 9.4) + 'L' + pt(c + 16, 6.6);
    }
    return '<path d="' + d + 'Z"/><circle cx="12" cy="12" r="2.8"/>';
  })();
  /* 「回到主页面」按钮一律带房子图标（2026-11-24 用户：旁边的「再来一局」挂着门票，按钮要统一）——和菜单里那个房子同一个图 */
  const homeLabel = () => '<svg class="zm-btn-ic" viewBox="0 0 24 24" aria-hidden="true">' + MENU_ICONS.cover + '</svg>' + T('ui.home', '回到主页面');
  const MENU_ICONS = {
    feedback: '<path d="M5 9 4 3.5 9 6.5h6L20 3.5 19 9c1.2 1.4 1.8 3 1.8 4.6C20.8 18 16.9 21 12 21s-8.8-3-8.8-7.4C3.2 12 3.8 10.4 5 9Z"/><path d="M9.6 17.2c1.5-1.2 3.3-1.2 4.8 0"/><path d="M9 12.6h.01M15 12.6h.01"/>',
    restart: '<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.6 4.2v4.2h-4.2"/>',
    settings: GEAR,
    rules: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.4a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.4v.5"/><path d="M12 16.6v.1"/>',
    tutorial: '<path d="M12 6.6C10 5 7 4.5 4 5v13.2c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V5c-3-.5-6 0-8 1.6Z"/><path d="M12 6.6v13.2"/>',
    skip: '<path d="M4.5 6.5 11 12l-6.5 5.5Z"/><path d="M12.5 6.5 19 12l-6.5 5.5Z"/>',
    pause: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
    profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    cover: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.5 9.5v10h11v-10"/><path d="M10 19.5v-5h4v5"/>',
    exit: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    invite: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5l1.6-1.6a3.8 3.8 0 0 1 5.4 5.4L16.4 12M13 17.5l-1.6 1.6a3.8 3.8 0 0 1-5.4-5.4L7.6 12"/>',
    leave: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
    chat: '<path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z"/><path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01"/>',
    rank: '<path d="M5 20V11h4v9M10 20V5h4v15M15 20v-6h4v6"/>',
  };
  function menuItems() {
    const exit = FROM_SITE ? [['exit', T('ui.exitSite', '返回百宝奇巧')]] : [];
    if (game && game.tutorial) return [['skip', tut && tut.mini ? T('tut.quitLesson', '退出本关') : T('tut.skip', '跳过教程')], ['rules', T('ui.rules', '规则')], ['line'], ['cover', T('ui.home', '回到主页面')], ...exit];
    /* 2026-11-20 用户定：顶栏只留三格（单机 暂停 · 声音 · 菜单；联机 说一句 · 声音 · 菜单，房主多一颗暂停），其余都进菜单；
     * 菜单不再重复顶栏已有的暂停；分组 = 本局 / 我 / 帮助 / 离开，组间一道线。「重新开一局」→「新的一局」，「这步不对」→「反馈」 */
    const fb = window.ZhamaoFeedback && window.ZhamaoFeedback.inMenu() ? [['feedback', T('ui.menu.feedback', '反馈')]] : [];
    if (online) return [['rank', T('ui.rank.title', '排行榜')], ...fb, ['line'], ['invite', T('ui.menu.invite', '房间号 / 邀请')], ['profile', T('ui.menu.profile', '修改昵称/头像')], ['settings', T('ui.settings', '设置')], ['line'], ['rules', T('ui.rules', '规则')], ['line'], ['leave', T('ui.leaveRoom', '离开房间')]];
    return [
      ['restart', T('ui.menu.newGame', '新的一局')],
      ...fb,
      ...(social && socialOk() ? [['chat', T('ui.chat', '聊天')]] : []),
      ['line'],
      ['profile', T('ui.menu.profile', '修改昵称/头像')],
      ['settings', T('ui.settings', '设置')],
      ['line'],
      ['rules', T('ui.rules', '规则')],
      ['tutorial', T('ui.tutorial', '新手教程')],
      ['line'],
      ['cover', T('ui.home', '回到主页面')],
      ...exit,
    ];
  }
  /* 确认框用游戏自己的弹窗（2026-11-15 巡查：以前用浏览器原生 confirm——样式和别的弹窗不一样，微信里还顶着网址；有的内嵌浏览器直接吞掉，点了没反应） */
  function askConfirm(title, text, okLabel, onOk) {
    openDialog('<h2>' + esc(title) + '</h2>' + (text ? '<p>' + esc(text) + '</p>' : '') +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-no>' + T('ui.cancel', '取消') + '</button><button type="button" class="zm-btn zm-btn-primary" data-yes data-focus>' + esc(okLabel) + '</button></div>', (d) => {
      d.querySelector('[data-no]').addEventListener('click', closeDialog);
      d.querySelector('[data-yes]').addEventListener('click', () => { closeDialog(); onOk(); });
    });
  }
  /* 局中重开（2026-11-24）：说清这局门票不退、新一局还要再交（名次没定的局不结算） */
  function restartNote() {
    const base = T('ui.restart.note', '这一局就放弃了');
    if (!WAL || !game || game.tutorial || game.online) return base;
    const old = game.wt && game.wt.tid && !game.wt.done && !game.wt.est ? game.wt.price : 0, nx = WAL.price(settings.tier, curMode(), soloN());
    return old ? T('ui.restart.paid', '这一局就放弃了，门票 {a} 小鱼干不退；新的一局再交 {b}。', { a: old.toLocaleString('en-US'), b: nx.toLocaleString('en-US') })
      : T('ui.restart.paid2', '这一局就放弃了；新的一局要交门票 {b} 小鱼干。', { b: nx.toLocaleString('en-US') });
  }
  function menuAct(k) {
    closeMenu();
    if (k === 'restart') {
      if (game && !game.dealing && game.state.phase !== 'over') { askConfirm(T('ui.restart.ask', '重新开一局？'), restartNote(), T('ui.restart.ok', '重开'), newGamePaid); return; }
      newGamePaid();
    }
    else if (k === 'settings') showSettings(false);
    else if (k === 'profile') showProfile();
    else if (k === 'rules') showRules();
    else if (k === 'tutorial') startTutorial();
    else if (k === 'skip') skipTutorial();
    else if (k === 'pause') pauseGame();
    else if (k === 'feedback') { if (window.ZhamaoFeedback) window.ZhamaoFeedback.open(); }
    else if (k === 'rank') showRoomRank();
    else if (k === 'chat') { if (social && socialOk()) social.openChat($('zmMenuBtn')); }
    else if (k === 'cover') { if (game && game.tutorial) quitTutorial(); else showCover(); }
    else if (k === 'exit') location.href = '/toolbox/';
    else if (k === 'invite') showInvite();
    else if (k === 'leave') askConfirm(T('ui.leave.ask', '离开房间？'), game && game.online && !game.spectator && game.state && game.state.phase !== 'over' && game.state.alive[0] ? T('ui.leave.note', '这一局交给机器猫替你打完') : '', T('ui.leave.ok', '离开'), () => leaveOnline(true));
  }
  /* 「观战者能看我的手牌」：每人自己定，默认不给看；联机时在「设置」里改，自己的牌一拨就生效（2026-11-13 用户改规则）。
   * 也决定我出局后能不能看机器猫的牌：开局时就开着、这局里一次都没关过，才能看机器猫（中途关过一次，这局就看不到了） */
  function myPlayer() { const st = online && online.st; return st ? st.players.find((p) => p.id === st.me && !p.left) || null : null; }
  let menu = null;
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    $('zmMenuBtn').setAttribute('aria-expanded', 'false');
    resumeClock();
  }
  function toggleMenu(e) {
    if (e) e.stopPropagation();
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'zm-menu';
      menu.setAttribute('role', 'menu');
      menu.hidden = true;
      menu.addEventListener('click', (ev) => { const b = ev.target.closest('[data-m]'); if (b) menuAct(b.dataset.m); });
      menu.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { closeMenu(); $('zmMenuBtn').focus(); return; }
        if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
        ev.preventDefault();
        const bs = Array.from(menu.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
        bs[(i + (ev.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus();
      });
      document.addEventListener('click', (ev) => { if (!ev.target.closest('.zm-menu, #zmMenuBtn')) closeMenu(); });
      els.app.appendChild(menu);
    }
    if (!menu.hidden) { closeMenu(); return; }
    if (soundPanel) soundPanel.hidden = true;
    menu.innerHTML = menuItems().map(([k, t]) => k === 'line' ? '<hr>'
      : '<button type="button" role="menuitem" data-m="' + k + '"><svg class="zm-menu-ic" viewBox="0 0 24 24" aria-hidden="true">' + (MENU_ICONS[k] || '') + '</svg><b>' + esc(t) + '</b></button>').join('');
    menu.hidden = false;
    $('zmMenuBtn').setAttribute('aria-expanded', 'true');
    pauseClock();
    const r = $('zmMenuBtn').getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    menu.style.right = Math.round(Math.max(8, window.innerWidth - r.right)) + 'px';
    if (!fx.reduce()) {
      menu.animate([{ transform: 'translateY(-6px) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
      menu.querySelectorAll('button').forEach((b, i) => b.animate([{ opacity: 0, transform: 'translateX(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: 30 + i * 22, easing: 'ease-out', fill: 'backwards' }));
    }
    const first = menu.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  /* ───── 暂停（照拱猪）─────
   * 单机对局里点顶栏的暂停键，或者切到后台（回个微信）：机器猫不偷跑、导火索不烧，回来点「继续」接着打。
   * 停下来 = 作废所有排着的动画 / 计时，存档；继续 = 按现在的局面重新摆一遍、接着走（和刷新后接存档同一条路） */
  function canPause() {
    return !!(game && !game.tutorial && !game.online && !game.dealing && game.state.phase !== 'over' && els.cover.hidden && !coachQueue);
  }
  /* 暂停页的小咪（只留「打盹」这一张，2026-11-14 用户定）：睡着时头顶 Z z z 一直往上冒。
   * 点它（2026-11-14 用户）：飘着的 Z 像泡泡一样「啵」地破掉，小咪抬头睁眼（不说话），过一会儿眨两下眼，
   * 再慢慢合上眼、头低回去，Z 重新冒出来。头是同一个位置画两张（睁眼 / 闭眼）叠着，眨眼只是切换，不重画整张图 */
  function napArt() {
    const NAVYc = '#2f4a6d', GOLDc = '#c9a96e';
    const head = (eyes) => ART.catHead(40, 62, 0.85, '#b4c5dd', { eyes, mouth: 'none', ear: '#e6c3cf', blushC: '#f4b0b8' });
    const z = '<path d="M-3.5 -4h7l-7 8h7" stroke="' + NAVYc + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="92" rx="34" ry="5" fill="rgba(29,27,24,.08)"/><ellipse cx="50" cy="72" rx="32" ry="18" fill="#9bb0cc"/>' +
      '<path d="M20 74c4 12 30 18 48 10" stroke="#7d93b2" stroke-width="9" stroke-linecap="round" fill="none"/>' +
      '<path d="M72 14a12 12 0 1 0 10 18 9 9 0 1 1 -10 -18Z" fill="' + GOLDc + '"/>' +
      '<g class="zm-nap-head"><g class="zm-nap-open">' + head('open') + '</g><g class="zm-nap-shut">' + head('closed') + '</g></g>' +
      '<g class="zm-nap-z" transform="translate(56 44)">' + [0, 1, 2].map((k) => '<g style="--i:' + k + '">' + z + '</g>').join('') + '</g></svg>';
  }
  // 点一下：Z 泡泡破掉 → 睁眼 → 眨两下 → 犯困合眼 → 头低回去、Z 再冒
  function napWake(cat) {
    const svg = cat.querySelector('svg'), zs = svg && svg.querySelector('.zm-nap-z');
    if (!svg || !zs) return;
    (cat._napT || []).forEach(clearTimeout);
    const NT = cat._napT = [];
    const at = (ms, fn) => NT.push(setTimeout(() => { if (cat.isConnected) fn(); }, ms));
    const still = fx.reduce();
    if (!cat.classList.contains('is-awake')) {
      snd('tap');
      // 还看得见的 Z 原地定住、鼓一下再破：一圈细环往外散，四颗小水点溅开
      Array.from(zs.children).forEach((g) => {
        const op = parseFloat(getComputedStyle(g).opacity) || 0;
        g.getAnimations().forEach((a) => a.pause());
        if (op < 0.12 || still) { g.style.opacity = '0'; return; }
        g.style.opacity = String(op);
        const path = g.querySelector('path');
        path.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 1, offset: 0.45 }, { transform: 'scale(0.2)', opacity: 0 }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
        const NS = 'http://www.w3.org/2000/svg';
        const ring = document.createElementNS(NS, 'circle');
        ring.setAttribute('r', '6'); ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#2f4a6d'); ring.setAttribute('stroke-width', '1.2');
        g.appendChild(ring);
        ring.animate([{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.8, offset: 0.35 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 380, delay: 90, easing: 'ease-out', fill: 'both' });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy], k) => {
          const d = document.createElementNS(NS, 'circle');
          d.setAttribute('r', '1.3'); d.setAttribute('fill', '#2f4a6d');
          g.appendChild(d);
          d.animate([{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(' + dx * 4 + 'px,' + dy * 4 + 'px)', opacity: 0.9, offset: 0.3 }, { transform: 'translate(' + dx * 10 + 'px,' + (dy * 10 + 3) + 'px)', opacity: 0 }], { duration: 420, delay: 110 + k * 15, easing: 'ease-out', fill: 'both' });
        });
      });
      cat.classList.add('is-awake', 'is-up');
      at(130, () => cat.classList.add('is-open'));
    } else {
      // 醒着又点一下：轻轻一缩，眨个眼，重新计时
      if (!still) cat.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.96)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
      cat.classList.remove('is-open'); at(120, () => cat.classList.add('is-open'));
    }
    const blink = (t) => { at(t, () => cat.classList.remove('is-open')); at(t + 130, () => cat.classList.add('is-open')); };
    blink(1400); blink(1700);                                   // 眨两下
    at(3000, () => cat.classList.remove('is-open'));            // 犯困：眼一合
    blink(3000 + 380);                                          // 又勉强睁一下
    at(3800, () => cat.classList.remove('is-open'));            // 真合上了
    at(4200, () => cat.classList.remove('is-up'));              // 头慢慢低回去
    at(4800, () => {                                            // 重新睡着：Z 从头开始冒
      cat.classList.remove('is-awake');
      const fresh = zs.cloneNode(false);
      fresh.innerHTML = Array.from(zs.children).map((g, k) => '<g style="--i:' + k + '">' + g.querySelector('path').outerHTML + '</g>').join('');
      fresh.querySelectorAll('path').forEach((pth) => pth.removeAttribute('style'));
      zs.replaceWith(fresh);
    });
  }
  function pauseGame() {
    if (!canPause() || !els.mask.hidden) return;
    closeMenu();
    if (soundPanel) soundPanel.hidden = true;
    resetTable();
    if (game) game.peekDone = null;
    save();
    busy = true;
    renderAll();
    // 不写「暂停」二字：正中一个大大的暂停图标，左下「主页面」（带小房子，2026-11-15 用户），右下「继续」（带个播放三角）
    openDialog('<button type="button" class="zm-pause-cat" aria-label="' + T('ui.pause.pet', '摸摸小咪') + '">' + napArt() + '</button>' +
      '<div class="zm-pause-ic" aria-label="' + T('ui.pause', '暂停') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><rect x="34" y="28" width="11" height="44" rx="3.5"/><rect x="55" y="28" width="11" height="44" rx="3.5"/></svg></div>' +
      '<div class="zm-pause-actions"><button type="button" class="zm-btn" data-home><svg class="ln" viewBox="0 0 24 24" aria-hidden="true">' + MENU_ICONS.cover + '</svg>' + T('ui.homeShort', '主页面') + '</button>' +
      '<button type="button" class="zm-btn zm-btn-primary" data-go data-focus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>' + T('ui.resume', '继续') + '</button></div>', (d) => {
      d.classList.add('is-pause');
      // 点小咪：Z 泡泡破掉、抬头睁眼，眨两下又睡回去（2026-11-14 用户）
      const cat = d.querySelector('.zm-pause-cat');
      cat.addEventListener('click', () => napWake(cat));
      d.querySelector('[data-go]').addEventListener('click', () => { closeDialog(); renderAll(); schedule(260, step); });
      d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); showCover(); });
    });
  }
  let hiddenAt = 0;
  function markAway() {
    hiddenAt = Date.now();
    if (game && !game.tutorial && !game.online) save();   // 已暂停的局也重存一次，时间戳 = 离开那一刻（发牌中也存：存的是发完的局面，接回来跳过发牌动画）
    if (online && NET) NET.writeSession({ code: online.code, token: online.token });   // 联机：刷新「最后还在」的时间
  }
  window.addEventListener('pagehide', markAway);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) markAway();
    else if (hiddenAt && Date.now() - hiddenAt >= STALE_MS && game && !game.tutorial && !game.online && els.cover.hidden) {
      // 页面一直开着、人走开超过半小时：这局结束，回主页面（不再留「接着打」）
      hiddenAt = 0;
      closeDialog();
      showCover();
      game.stale = true;   // 这局作废：之后还在半路的动画 / 回调都不许再把它存回去
      try { localStorage.removeItem(STORE_KEY); } catch (_) { /* 无痕 */ }
      coverResume();
      return;
    }
    if (document.hidden && canPause() && els.mask.hidden) pauseGame();
    if (!document.hidden) recheckSize();   // 回到前台：万一后台时按临时横屏量过，这里按真实宽度对一遍
  });
  function refreshTools() {
    if (window.ZhamaoFeedback) window.ZhamaoFeedback.sync();
    const pz = $('zmPauseBtn').hidden;
    // 联机：只有房主有暂停键（2026-11-20 用户），一局打完就没了
    $('zmPauseBtn').hidden = !(game && !game.tutorial && els.cover.hidden && (!game.online || (online && isHost() && G() && 'paused' in G() && !G().over && !game.dealing)));
    if (pz !== $('zmPauseBtn').hidden && ringGame() && LANDSCAPE_SHORT.matches) requestAnimationFrame(renderDir);   // 横屏：工具键多了一颗，顶边能坐的范围变了
    $('zmRankBtn').hidden = true;   // 2026-11-20：排行榜 / 规则收进菜单，顶栏只留三格
    $('zmRulesBtn').hidden = true;
    syncSocialUi();
  }

  /* ───── 牌桌互动：点别人头像扔道具、顶栏「说一句」（照拱猪，2026-11-13）─────
   * 面板 / 飞行 / 气泡 / 冷却 / 屏蔽复用拱猪的 gongzhu-social.js；道具画、台词、落地效果在 zhamao-social.js。
   * 单机：机器猫挨了道具有时回一句、偶尔扔回来。联机：要等服务器支持（回过互动序号 fxSeq）才露出来。
   * 教程里不出；观战的人只看不发（点头像仍是换视角）；出牌选目标时点头像照旧是选人 */
  let social = null;
  const mutedIds = new Set();   // 联机里屏蔽了谁（只记在这一次打开的页面里）
  /* 长轮询带回来的互动：第一次只记下序号（不重放进房间前的）；我自己发的本机已经画过了 */
  function onFx(res) {
    const first = online.fxSeq == null;
    if (!first && res.fxSeq <= online.fxSeq) return;
    online.fxSeq = res.fxSeq;
    if (first) { syncSocialUi(); if (inLobby()) renderLobby(online.st); }
    if (first || !social || !Array.isArray(res.fx)) return;
    const mine = online.st ? online.st.mySeat : -1;
    if (inLobby()) {   // 大厅：只有说话
      for (const e of res.fx) if (e && e.t === 'c' && e.from !== mine) social.play({ kind: 'chat', from: lobbyLoc(e.from), text: e.text }, { echo: true, delay: e.delay || 0 });
      return;
    }
    if (!game || !game.online) return;
    for (const e of res.fx) {
      if (!e || (!game.spectator && e.from === mine)) continue;
      const from = locOf(e.from);
      const ev = e.t === 'p' ? { kind: 'prop', from, to: locOf(e.to), prop: e.prop } : { kind: 'chat', from, text: e.text };
      social.play(ev, { echo: true, delay: e.delay || 0 });
    }
  }
  // 大厅里也能「说一句」（只说话，不扔道具）：座位按服务器座位号摆，我当 0 号、别人按座位差算
  const LOBBY_N = 9;
  const inLobby = () => !!(online && online.st && online.st.phase === 'lobby' && lobbyEl && !lobbyEl.hidden);
  const lobbyBase = () => (online && online.st && online.st.mySeat >= 0 ? online.st.mySeat : 0);
  const lobbySrv = (l) => (l + lobbyBase()) % LOBBY_N;
  const lobbyLoc = (srv) => (srv - lobbyBase() + LOBBY_N) % LOBBY_N;
  const lobbyPlayer = (l) => (online && online.st ? online.st.players.find((p) => p.seat === lobbySrv(l) && !p.left) || null : null);
  /* 互动框 / 说一句框像对话气泡一样长一个小尖角，指着点的那个头像 / 说一句键（2026-11-13 用户：框和点的东西之间要有衔接）。
   * 框已经按头像摆好了（gongzhu-social placePop）：看它在头像哪一边，就在那条边上、对着头像中心长尖角 */
  /* 六样互动道具：大字写「是什么意思」，小字写道具名（2026-11-13 用户：有的表情不明所以，点了会怎样也不清楚）；
   * 长按 / 鼠标停在上面有一句「点了会怎样」 */
  const PROP_TIP = {
    fish: [T('prop.fish.verb', '投喂'), T('prop.fish.name', '小鱼干'), T('prop.fish.tip', '扔给 TA 一条小鱼干，TA 会开心地吃掉')],
    yarn: [T('prop.yarn.verb', '逗你玩'), T('prop.yarn.name', '毛线球'), T('prop.yarn.tip', '毛线球在 TA 头上弹三下再滚走')],
    catnip: [T('prop.catnip.verb', '迷晕你'), T('prop.catnip.name', '猫薄荷'), T('prop.catnip.tip', '撒一把猫薄荷，TA 晕乎乎地晃脑袋')],
    spray: [T('prop.spray.verb', '泼冷水'), T('prop.spray.name', '喷水壶'), T('prop.spray.tip', '对着 TA 噗噗喷水，TA 冻得直哆嗦')],
    paw: [T('prop.paw.verb', '夸夸'), T('prop.paw.name', '猫爪拍拍'), T('prop.paw.tip', '两只肉垫给 TA 拍手叫好')],
    boom: [T('prop.boom.verb', '吓一跳'), R.NAMES.boom, T('prop.boom.tip', '一只炸弹猫砸到 TA 头上「嘭」地炸开')],
  };
  function propLabels() {
    const p = els.app.querySelector('.gz-social-pop:not(.gz-sp-chat)');
    if (!p) return;
    p.querySelectorAll('[data-prop]').forEach((b) => {
      const t = PROP_TIP[b.dataset.prop], lb = b.querySelector('.gz-sp-lb');
      if (!t || !lb || b.querySelector('.gz-sp-sub')) return;
      lb.textContent = t[0];
      lb.insertAdjacentHTML('afterend', '<small class="gz-sp-sub">' + t[1] + '</small>');
      b.title = t[2];
      b.setAttribute('aria-label', t[0] + '（' + t[1] + '）：' + t[2]);
    });
  }
  function popTail(anchor) {
    const p = els.app.querySelector('.gz-social-pop');
    if (!p || !anchor) return;
    // 框摆在头像下面时，往下挪到整个座位（名字、档位签）下面，别盖住名字
    const seat = anchor.closest && anchor.closest('.zm-seat');
    if (seat) {
      const r0 = p.getBoundingClientRect(), sr = seat.getBoundingClientRect(), av = anchor.getBoundingClientRect();
      if (r0.top >= av.top + av.height / 2 && sr.bottom + 12 + r0.height < innerHeight - 8) p.style.top = Math.round(sr.bottom + 12) + 'px';
    }
    const pr = p.getBoundingClientRect(), ar = (seat || anchor).getBoundingClientRect();
    const avr = anchor.getBoundingClientRect(), ax = avr.left + avr.width / 2, ay = avr.top + avr.height / 2;
    const side = pr.top >= ar.bottom - 4 ? 'top' : pr.bottom <= ar.top + 4 ? 'bottom' : pr.left >= ar.right - 4 ? 'left' : 'right';
    const off = side === 'top' || side === 'bottom' ? Math.max(20, Math.min(pr.width - 20, ax - pr.left)) : Math.max(20, Math.min(pr.height - 20, ay - pr.top));
    p.dataset.tail = side;
    p.style.setProperty('--tail', off.toFixed(0) + 'px');
  }
  function socialOk() {
    if (inLobby()) return !online.st.spectator && online.st.mySeat >= 0 && online.fxSeq != null;
    if (!game || game.tutorial || !game.state || !els.cover.hidden) return false;
    if (game.online) return !!(online && online.fxSeq != null && !game.spectator);
    return true;
  }
  function syncSocialUi() {
    const ok = !!social && socialOk();
    const btn = $('zmChatBtn');
    if (btn) btn.hidden = !ok || !online;   // 2026-11-20 用户：单机顶栏只留 暂停 · 声音 · 菜单，「说一句」收进菜单
    els.app.classList.toggle('can-social', ok);
    if (!ok && social) social.close();
  }
  function initSocial() {
    if (!window.GongzhuSocial || !window.ZhamaoSocialKit) return;
    const SFX = { whoosh: 'whoosh', bubble: 'tick', pfish: 'ding', pyarn: 'thud', pcatnip: 'tick', pspray: 'untap', ppaw: 'tick', pboom: 'boom' };
    social = GongzhuSocial.create({
      kit: ZhamaoSocialKit,
      root: els.app,
      avatar: (l) => (inLobby() ? lobbyEl.querySelector('.zm-lseat[data-seat="' + lobbySrv(l) + '"] .av') : avEl(l)),
      name: (l) => (inLobby() ? (lobbyPlayer(l) || {}).nick || '' : nameOf(l)),
      canSend: socialOk,
      // 联机：我发的本机先画，同时发给服务器（座位换成服务器座位号）；别人的跟长轮询来（onFx）
      send(ev) {
        if (inLobby() && ev.kind === 'chat') { NET.emote(online.code, online.token, { text: ev.text }).catch((e) => { if (e && e.error === 'muted') toast(T('net.err.muted', '房主把你禁言了')); else if (e && e.status === 429) toast(T('ui.chat.slow', '慢一点，歇一下再发')); }); return; }
        if (!game || !game.online || !online) return;
        const body = ev.kind === 'prop' ? { to: srvOf(ev.to), prop: ev.prop } : { text: ev.text };
        NET.emote(online.code, online.token, body).catch((e) => { if (e && e.error === 'muted') toast(T('net.err.muted', '房主把你禁言了')); else if (e && e.status === 429) toast(T('ui.chat.slow', '慢一点，歇一下再发')); });
      },
      autoBots: () => !!(game && !game.online),
      isBot: (l) => (game && game.online ? !!(playerAt(srvOf(l)) && (playerAt(srvOf(l)).isAi || playerAt(srvOf(l)).left)) : l > 0),
      mutable: (l) => { const p = game && game.online ? playerAt(srvOf(l)) : null; return !!(p && !p.isAi); },
      muted: (l) => { const p = game && game.online ? playerAt(srvOf(l)) : null; return !!(p && mutedIds.has(p.id)); },
      setMuted(l, on) {
        const p = game && game.online ? playerAt(srvOf(l)) : null;
        if (!p) return;
        if (on) mutedIds.add(p.id); else mutedIds.delete(p.id);
        toast(on ? T('ui.mute.on', '已屏蔽{who}的互动', { who: p.nick }) : T('ui.mute.off', '不再屏蔽{who}', { who: p.nick }));
      },
      // 房主点一个真人：底下多一排「托管 / 禁言 / 请离」（2026-11-14 用户）
      extraTitle: () => T('ui.host', '房主'),
      extra: (l) => {
        if (!game || !game.online || !online || !online.st || !isHost() || l === 0 || inLobby()) return [];
        const p = playerAt(srvOf(l));
        if (!p || p.isAi || p.left) return [];
        const g = G(), seat = srvOf(l), auto = !!(g && g.auto && g.auto[seat]), alive = !!(g && !g.over && g.st.alive[seat]);
        const out = [];
        if (alive) out.push({ label: '<span class="zm-ic-only" title="' + (auto ? T('ui.btn.unauto', '取消托管') : T('ui.host.auto', '让他托管')) + '">' + (auto ? HOST_IC.unauto : HOST_IC.auto) + '</span>', on: () => onlineAct('host_auto', { seat, on: !auto }).then((r) => { if (r) toast(auto ? T('ui.host.autoOff', '已取消{who}的托管', { who: p.nick }) : T('ui.host.autoOn', '{who}改由机器猫托管（他点自己头像能收回）', { who: p.nick })); }) });
        out.push({ label: '<span class="zm-ic-only" title="' + (p.muted ? T('ui.host.unmute', '解除禁言') : T('ui.host.mute', '禁言')) + '">' + (p.muted ? HOST_IC.unmute : HOST_IC.mute) + '</span>', on: () => onlineAct('mute', { pid: p.id, on: !p.muted }).then((r) => { if (r) toast(p.muted ? T('ui.host.unmuted', '已解除{who}的禁言', { who: p.nick }) : T('ui.host.muted', '已禁言{who}', { who: p.nick })); }) });
        out.push({ label: '<span class="zm-ic-only" title="' + T('ui.host.kick', '请他离开') + '">' + HOST_IC.kick + '</span>', on: () => askKick(p, true) });
        return out;
      },
      sfx: (name, delay) => { if (SFX[name]) snd(SFX[name], delay); },
      reduce: () => fx.reduce(),
      popSide: (l) => (l === 0 ? 'above' : 'below'),
    });
    $('zmChatBtn').addEventListener('click', (e) => { e.stopPropagation(); if (socialOk()) { social.openChat(e.currentTarget); popTail(e.currentTarget); } });
  }
  let soundPanel = null;
  function refreshSoundBtn() {
    const A = window.ZhamaoAudio, btn = $('zmSoundBtn');
    if (!A) { btn.hidden = true; return; }
    const p = A.prefs(), off = !p.sfx && !p.music;
    btn.classList.toggle('is-off', off);
  }
  function toggleSoundPanel(e) {
    const A = window.ZhamaoAudio;
    if (!A) return;
    if (e) e.stopPropagation();
    if (!soundPanel) {
      soundPanel = document.createElement('div');
      soundPanel.className = 'zm-sound-panel';
      soundPanel.hidden = true;
      soundPanel.innerHTML = [['sfx', T('ui.sound.sfx', '音效')], ['music', T('ui.sound.music', '背景音乐')]].map(([k, t]) => '<label class="zm-sound-row"><input type="checkbox" data-track="' + k + '"><span>' + t + '</span></label>').join('');
      soundPanel.addEventListener('change', (ev) => { const k = ev.target.dataset.track; if (k) { A.set(k, ev.target.checked); refreshSoundBtn(); } });
      document.addEventListener('click', (ev) => { if (soundPanel && !soundPanel.hidden && !ev.target.closest('.zm-sound-panel, #zmSoundBtn')) soundPanel.hidden = true; });
      els.app.appendChild(soundPanel);
    }
    soundPanel.hidden = !soundPanel.hidden;
    if (!soundPanel.hidden) {
      const p = A.prefs();
      soundPanel.querySelectorAll('input').forEach((b) => { b.checked = !!p[b.dataset.track]; });
      const r = $('zmSoundBtn').getBoundingClientRect(), ar = els.app.getBoundingClientRect();
      soundPanel.style.top = Math.round(r.bottom - ar.top + 8) + 'px';
      soundPanel.style.right = Math.round(ar.right - r.right - 60) + 'px';
    }
  }

  /* ───── 教程讲解 ───── */
  let coachQueue = null;
  function inlineCards(text) {
    return esc(text).replace(/【([^】]+)】/g, (m, name) => {
      const k = R.KINDS.find((x) => R.NAMES[x] === name);
      return k ? cardHtml(k) + '<b>' + esc(name) + '</b>' : m;
    });
  }
  /* ───── 实战里的引导（2026-11-22 用户：新手教程只教核心 10 样，其余的在实战里第一次碰到再讲） ─────
   * 第二层（用户挑丙）：没教过的牌第一次进我手里，整张放大亮相 + 一句话，点任意处收起；每种只讲一次。
   *   三张一样 / 五种猫凑齐 / 被甩锅时手里有甩锅，也各讲一次（亮的是凑成的那几张）。
   * 第三层（用户挑乙）：第一次用百变 / 组队 / 角色开局，发完牌用教程同款的讲解说两句，指着眼前的东西。
   * 看过的记在 localStorage（zm.guide.v1）。这个功能上线前就玩过的人一律当看过，不打扰；打完新手教程会清空重记。
   * 单机入口是 step() 里的 guideGate()：有要讲的就先讲（这时不开计时、机器猫也不动），讲完再回 step()。
   * 联机入口是 onlineIdle() 里的 guideOnline()（同日用户：联机也加）：牌局不等人，所以只是盖一层、不拦任何东西——
   *   只在桌上安静时（轮到某个人出牌 / 摸牌）讲；一有事要我表态或挑牌就自己收起来、不算看过，下次安静时再讲。 */
  const GUIDE_KEY = 'zm.guide.v1';
  const GUIDE_CARDS = {
    tattack: () => T('guide.card.tattack', '甩给任意一个人（也可以是自己），他连摸两回合'),
    reverse: () => T('guide.card.reverse', '出牌方向倒过来，你这回合不摸牌'),
    bottom: () => T('guide.card.bottom', '这回合从牌堆最底下摸'),
    alter: () => T('guide.card.alter', '看顶上三张，再按你想要的顺序放回去'),
    shuffle: () => T('guide.card.shuffle', '把牌堆洗乱'),
    wild: () => T('guide.card.wild', '能顶任何一种猫，用来凑对'),
    swap: () => T('guide.card.swap', '和一个人交换全部手牌'),
  };
  const GUIDE_MODES = {
    flux: () => [
      { t: T('guide.mode.flux.1', '这局每人多一张「百变」：打出它，转盘换一条全桌规则。'), focus: ['hand'] },
      { t: T('guide.mode.flux.2', '抽到的规则牌摆在牌堆下面，对所有人都算数。'), focus: ['deck'] },
    ],
    team: () => [
      { t: T('guide.mode.team.1', '头像底色一样的是队友，你这队是蓝色。一队全部出局就输。'), focus: ['opps', 'me'] },
      { t: T('guide.mode.team.2', '队友摸到炸弹猫又没有逗猫棒时，你可以把自己的递给他。'), focus: ['hand'] },
    ],
    roles: () => [
      { t: T('guide.mode.roles.1', '这局每人抽到一只角色猫，技能整局自动生效。'), focus: ['opps', 'me'] },
      { t: T('guide.mode.roles.2', '点头像角上的猫章，看这只猫会什么。'), focus: ['opps', 'me'] },
    ],
  };
  let guideSet = null;
  function guideLoad() {
    if (guideSet) return guideSet;
    let raw = null, old = false;
    try { raw = localStorage.getItem(GUIDE_KEY); old = !!(localStorage.getItem(TUT_KEY) || localStorage.getItem(STORE_KEY) || localStorage.getItem(SETTINGS_KEY)); } catch (_) { old = true; }
    if (raw == null) { guideSet = new Set(old ? ['*'] : []); guideStore(); }   // 第一次见到这个功能：以前玩过的人全当看过
    else { try { guideSet = new Set(JSON.parse(raw)); } catch (_) { guideSet = new Set(['*']); } }
    return guideSet;
  }
  function guideStore() { try { localStorage.setItem(GUIDE_KEY, JSON.stringify([...guideSet])); } catch (_) { /* 无痕 */ } }
  const guideSeen = (key) => { const g = guideLoad(); return g.has('*') || g.has(key); };
  function guideMark(key) { guideLoad().add(key); guideStore(); }
  function guideReset() { guideSet = new Set(); guideStore(); }
  guideLoad();   // 一进页面就定下「是不是老玩家」（新玩家这时什么都还没存）
  // 我手里现在有没有该讲的：{ key, cards: [牌种…], text }
  function guideNext(s) {
    const hand = s.hands[0], cnt = {};
    for (const id of hand) { const k = R.KIND_OF[id]; cnt[k] = (cnt[k] || 0) + 1; }
    const hw = handWild();   // 百搭猫：手里的猫都画成万能猫，讲牌就讲万能猫
    for (const id of hand) { const k = hw && R.CATS.indexOf(R.KIND_OF[id]) >= 0 ? R.WILD : R.KIND_OF[id]; if (GUIDE_CARDS[k] && !guideSeen('card:' + k)) return { key: 'card:' + k, cards: [k], text: GUIDE_CARDS[k]() }; }
    if (!guideSeen('combo:three')) { const k = Object.keys(cnt).find((x) => cnt[x] >= 3 && x !== R.BOOM); if (k) return { key: 'combo:three', cards: [k, k, k], text: T('guide.combo.three', '三张一样一起出：点一个人、说一种牌，他有就得给你') }; }
    if (!guideSeen('combo:five') && R.CATS.every((k) => cnt[k])) return { key: 'combo:five', cards: R.CATS.slice(), text: T('guide.combo.five', '五种猫各一张一起出：从弃牌堆捡一张') };
    if (!guideSeen('tip:stack') && s.phase === 'act' && s.turn === 0 && s.turnsLeft > 1 && (cnt[R.ATTACK] || cnt[R.TATTACK])) return { key: 'tip:stack', cards: [cnt[R.ATTACK] ? R.ATTACK : R.TATTACK], text: T('guide.tip.stack', '被甩锅时再甩出去：没摸的回合加 2，一起甩走') };
    return null;
  }
  function showNewCard(item, done, soft) {
    const k0 = token;
    const v = document.createElement('div');
    v.className = 'zm-newcard' + (item.cards.length > 1 ? ' is-multi' : '');
    v.tabIndex = 0;
    v.innerHTML = '<div class="zm-newcard-cards">' + item.cards.map((k) => cardHtml(k)).join('') + '</div><p>' + esc(item.text) + '</p><span>' + T('tut.tapOn', '点任意处继续') + '</span>';
    if (!soft) { busy = true; stopClock(); }   // 联机（soft）：只盖一层，倒计时和牌局照走
    els.app.appendChild(v);
    snd('ask');
    const close = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!v.isConnected) return;
      v.remove();
      guideMark(item.key);
      if (k0 === token || soft) done();
    };
    v.addEventListener('click', close);
    v.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') close(e); });
    try { v.focus({ preventScroll: true }); } catch (_) { /* 老浏览器 */ }
  }
  function guideOnline() {
    if (!game || !game.online || !game.state || game.tutorial) return;
    const s = game.state, v = els.app.querySelector('.zm-newcard');
    const quiet = s.phase === 'act' && !game.spectator && !game.dealing && !autopilot && !!s.alive[0];
    if (!quiet) {   // 桌上有事了：先收起来，不算看过
      if (v) v.remove();
      if (game.guideCoach) { game.guideCoach = false; if (coachQueue) { coachQueue = null; hideCoach(); } }
      return;
    }
    if (v || coachQueue || !els.mask.hidden) return;
    const mode = s.rules.mode, key = 'mode:' + mode;
    if (GUIDE_MODES[mode] && !guideSeen(key)) {
      game.guideCoach = true;
      showCoach(GUIDE_MODES[mode](), () => { if (game) game.guideCoach = false; guideMark(key); guideOnline(); });
      return;
    }
    const item = guideNext(s);
    if (item) showNewCard(item, guideOnline, true);
  }
  function guideGate() {
    const s = game.state;
    if (game.tutorial || game.online || game.spectator || game.dealing || game.turbo || autopilot || !s.alive[0] || s.phase === 'over' || s.phase === 'save' || coachQueue) return false;   // 急救挑对子时不插引导（炸弹猫正炸着）
    const mode = s.rules.mode, key = 'mode:' + mode;
    if (GUIDE_MODES[mode] && !guideSeen(key)) { stopClock(); showCoach(GUIDE_MODES[mode](), () => { guideMark(key); step(); }); return true; }
    const item = guideNext(s);
    if (item) { showNewCard(item, step); return true; }
    return false;
  }

  function showCoach(msgs, done) {
    coachQueue = { msgs: msgs.slice(), done };
    busy = true;
    nextCoach();
  }
  function nextCoach() {
    if (!coachQueue) return;
    const m = coachQueue.msgs.shift();
    if (m == null) { const d = coachQueue.done; coachQueue = null; hideCoach(); if (d) d(); return; }
    const wasHidden = els.coach.hidden || els.coach.classList.contains('is-hint');
    els.coach.hidden = false;
    els.coach.classList.remove('is-hint');
    els.app.classList.add('is-coaching');   // 讲解（照拱猪）：字摆在正中，别的都蒙一层浅宣纸色
    // 正在讲的东西别蒙住：一句话可以写成 { t, focus: ['hand' | 'deck' | 'stage' | 'opps' | 'me' | 座位号…] }；
    // 桌上刚出的牌（舞台）只要还摆着就一直亮着（「小橘出了【索要】」时得看得见那张索要）
    const text = typeof m === 'string' ? m : m.t;
    setCoachFocus((m && m.focus) || []);
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(text);
    placeCoach();
    if (!fx.reduce()) {
      if (wasHidden) els.coach.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.4,1)' });
      else els.coach.querySelector('.zm-coach-text').animate([{ opacity: 0, translate: '8px 0' }, { opacity: 1, translate: '0 0' }], { duration: 220, easing: 'ease-out' });
    }
  }
  /* 讲解别压在牌堆 / 桌上的牌上（2026-11-14 用户：有时字和底下的东西对比度不够）：牌堆正好在桌心，字摆正中会叠在牌背和
   * 「几张 / 几只」那行数上；被点名讲的牌堆还不蒙灰，更看不清。量一下：牌堆（和舞台上的牌）上面那块空处放得下就放上面，
   * 不然放下面，都放不下才压在正中（那时靠字后面那圈宣纸色晕兜底） */
  function placeCoach() {
    const st = els.coach.style;
    st.top = st.bottom = st.transform = '';
    if (els.coach.hidden || els.coach.classList.contains('is-hint')) return;
    const c = els.center.getBoundingClientRect(), h = els.coach.offsetHeight;
    const obs = [els.deck.parentElement, els.stage.querySelector('.zm-stage-inner')].filter(Boolean).map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0);
    if (!obs.length || !h) return;
    const top = Math.min(...obs.map((r) => r.top)), bot = Math.max(...obs.map((r) => r.bottom)), gap = 14;
    let y = null;
    if (top - c.top >= h + gap * 2) y = (c.top + top) / 2 - h / 2;
    else if (c.bottom - bot >= h + gap * 2) y = (bot + c.bottom) / 2 - h / 2;
    if (y == null) return;
    st.top = Math.round(y - c.top) + 'px'; st.bottom = 'auto'; st.transform = 'translateX(-50%)';
  }
  window.addEventListener('resize', () => { if (coachQueue) placeCoach(); });
  function hint(text) { // 不挡操作的小提示（落在桌子下沿）
    if (!text) { if (!coachQueue) hideCoach(); return; }
    const was = !els.coach.hidden && els.coach.classList.contains('is-hint');
    els.coach.hidden = false;
    els.coach.classList.add('is-hint');
    els.coach.style.top = els.coach.style.bottom = els.coach.style.transform = '';
    els.app.classList.remove('is-coaching');   // 提示（等我操作）不蒙桌子
    els.coach.querySelector('.zm-coach-text').innerHTML = inlineCards(text);
    if (!was && !fx.reduce()) els.coach.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: 'ease-out' });
  }
  function hideCoach() { els.coach.style.top = els.coach.style.bottom = els.coach.style.transform = ''; els.coach.hidden = true; els.coach.classList.remove('is-hint'); els.app.classList.remove('is-coaching'); setCoachFocus([]); }
  function setCoachFocus(list) {
    els.app.querySelectorAll('.is-coach-focus').forEach((x) => x.classList.remove('is-coach-focus'));
    const pick = (f) => (f === 'hand' ? els.hand : f === 'deck' ? els.deck.parentElement : f === 'stage' ? els.stage : f === 'opps' ? els.opps : f === 'me' ? els.me : typeof f === 'number' ? seatEl(f) : null);
    const all = list.slice();
    if (els.stage.querySelector('.zm-stage-inner')) all.push('stage');
    all.forEach((f) => { const el = pick(f); if (el) el.classList.add('is-coach-focus'); });
  }
  document.addEventListener('click', (e) => {
    if (coachQueue && !els.coach.hidden && !els.coach.classList.contains('is-hint') && !e.target.closest('.zm-dialog-mask, .zm-menu, .zm-tools, .zm-peek')) { e.stopPropagation(); nextCoach(); }
  }, true);
  document.addEventListener('keydown', (e) => { if (coachQueue && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); nextCoach(); } });

  function resetTable() {
    if (social) social.clear();
    els.app.classList.remove('is-peeking');
    preview = null;
    if (game) { game.previewSrc = null; game.roleHide = null; }   // 抽角色半路被打断（暂停 / 重开 / 演示）：角色全亮出来
    stopClock();
    closeDialog();
    token++;
    clearReactTimer();
    clearStage();
    wipeFx();
    { const nv = els.app.querySelector('.zm-newcard'); if (nv) nv.remove(); }
    hideCoach();
    coachQueue = null;
    release();
    selected = []; mode = null;
    lastKit = -1; lastDeck = -1; lastCue = '';
  }
  /* 新手教程：教程脚本可以带 mini（不发牌、直接摆好）/ bots（对手）/ done（这一段讲完）——给以后的「一局学会全部」用 */
  const TUT_DONE_KEY = 'zm.tut.done.v1';
  function markLesson(id) {
    try { const d = new Set(JSON.parse(localStorage.getItem(TUT_DONE_KEY) || '[]')); d.add(id); localStorage.setItem(TUT_DONE_KEY, JSON.stringify([...d])); if (id === 'basic') localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
  }
  function lessonDone() {
    const id = game && game.lesson;
    if (id) markLesson(id);
    const L = TUT.LESSONS || [], i = L.findIndex((x) => x.id === id), next = i >= 0 && i + 1 < L.length ? L[i + 1] : null;
    bgm('menu');
    openStage('<h2>' + T('tut.lesson.done', '本关完成') + '</h2>' + (next ? '<p class="zm-muted">' + T('tut.lesson.next', '下一关：{title}', { title: esc(next.title) }) + '</p>' : '<p class="zm-muted">' + T('tut.lesson.all', '全部学完啦') + '</p>') +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-list>' + homeLabel() + '</button>' + (next ? '<button type="button" class="zm-btn zm-btn-primary" data-next data-focus>' + T('tut.lesson.nextBtn', '下一关') + '</button>' : '<button type="button" class="zm-btn zm-btn-primary" data-play data-focus>' + T('ui.startGame', '开始对局') + '</button>') + '</div>', (d) => {
      d.querySelector('[data-list]').addEventListener('click', () => { closeDialog(); leaveLesson(); showCover(); });
      const nb = d.querySelector('[data-next]'); if (nb) nb.addEventListener('click', () => { closeDialog(); startTutorial(next.id); });
      const pb = d.querySelector('[data-play]'); if (pb) { tagNextPrice(pb); pb.addEventListener('click', () => { closeDialog(); payThenPlay(); }); }
    });
  }
  function leaveLesson() { tut = null; els.skipTut.hidden = true; hideCoach(); coachQueue = null; resetTable(); game = null; }
  function startTutorial(id) {
    if (!TUT) return;
    id = id || 'basic';
    resetTable();
    viewSeat = -1; els.app.classList.remove('is-watching', 'is-spectator'); els.me.classList.remove('is-watched');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    const ctl = TUT.create(R, { hint, say: (msgs, then) => showCoach(msgs, then || step) }, id);
    tut = ctl;
    // 老师们的头像和我的撞了就换一个（我的头像也是猫的话，老师换成兔子 / 熊猫……）
    const spare = ['rabbit', 'panda', 'owl', 'bear'].filter((a) => a !== profile.avatar);
    const opp = (ctl.bots || [{ nick: ctl.botName, avatar: ctl.botAvatar }]).map((b, i) => (b.avatar === profile.avatar ? Object.assign({}, b, { avatar: spare[i % spare.length] }) : b));
    game = { state: ctl.state, bots: [{ nick: profile.nick, avatar: profile.avatar }].concat(opp), tiers: [null].concat(opp.map(() => 'normal')), tutorial: true, lesson: id };
    els.cover.hidden = true;
    els.skipTut.hidden = false;
    els.skipTut.textContent = ctl.mini ? T('tut.quitLesson', '退出本关') : T('tut.skip', '跳过教程');
    bgm('game');
    buildSeats();
    solveSize();
    busy = true;
    const t = token;
    if (ctl.mini) {   // 小关卡：不发牌，局面直接摆好就讲
      game.dealing = false;
      release();
      renderAll();
      showCoach(ctl.intro, step);
      return;
    }
    // 教程也先发牌（不能跳），发完再讲
    dealIntro(t).then(() => {
      if (t !== token) return;
      game.dealing = false;
      release();
      renderAll();
      showCoach(ctl.intro, step);
    });
  }
  /* 教程打完进真局（2026-11-24 用户：从教程进局看不出要花小鱼干）：按钮带门票，点了走和「开始」一样的交票（不够弹「小鱼干不够了」），取消就回主页面 */
  function tagNextPrice(btn) { if (WAL && WAL.costTag && btn) WAL.costTag(btn, WAL.price(settings.tier, curMode(), soloN())); }
  function payThenPlay() {
    if (!WAL || !WAL.pay) { endTutorial(true); return; }
    WAL.pay({ tier: settings.tier, mode: curMode(), n: soloN() }).then((ok) => endTutorial(!!ok));
  }
  function endTutorial(toGame) {
    try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
    tut = null;
    els.skipTut.hidden = true;
    hideCoach();
    coachQueue = null;
    if (toGame) newGame(); else showCover();
  }
  // 跳过教程：记下「学过了」，有存档就接着打，没有就开一局
  function skipTutorial() {
    if (tut && tut.mini) { leaveLesson(); showCover(); return; }   // 小段教程：退出回主页
    try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* 无痕 */ }
    tut = null;
    els.skipTut.hidden = true;
    const d = loadSaved();
    if (d) { resumeGame(d); return; }
    if (!WAL || !WAL.pay) { newGame(); return; }
    WAL.pay({ tier: settings.tier, mode: curMode(), n: soloN() }).then((ok) => { if (ok) newGame(); else { resetTable(); game = null; showCover(); } });   // 跳过教程直接开局也要交门票（2026-11-24）
  }
  // 教程打到一半回主菜单：不记「学过了」
  function quitTutorial() { tut = null; els.skipTut.hidden = true; showCover(); }

  /* ───── 开局 / 封面 ───── */
  // 玩家自己点的「重开」：先看小鱼干够不够这局门票（不够弹窗，救济在里面领）——2026-11-23 用户
  function newGamePaid() {
    if (!WAL || !WAL.pay) { newGame(); return; }
    WAL.pay({ tier: settings.tier, mode: curMode(), n: soloN() }).then((ok) => { if (ok) newGame(); });
  }
  function newGame() {
    if (WAL && WAL.cancelFx) WAL.cancelFx();   // 主页面上的小鱼干动画（进账 / 扣票）一律收掉，不带进牌桌
    if (WAL && game) WAL.settle(game);   // 上一局我已经出局、没等打完就开新局：名次已定，先结掉
    resetTable();
    viewSeat = -1; els.app.classList.remove('is-watching', 'is-spectator'); els.me.classList.remove('is-watched');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    tut = null;
    els.skipTut.hidden = true;
    const nr = R.normalizeRules(settings.rules), n = nr.mode === 'team' ? R.teamPlayers(nr) : settings.players;
    const seed = ((Math.random() * 2 ** 31) | 0) || 1;
    const st = R.createGame(n, seed, settings.rules);
    game = { state: st, bots: drawBots(n, settings.tier), tiers: [null].concat(Array(n - 1).fill(settings.tier)), tutorial: false };
    if (WAL && WAL.tableStart) WAL.tableStart(game);
    if (HL) HL.start(game, st, seed);
    if (WAL) {
      // 2026-11-26 用户：开局后（发牌 / 抽角色还没放完）退出再回来，没有「接着打上一局」、门票白扣——以前要等发完牌走第一步才存档。
      // 现在一开局就存；服务器发的门票号回来后再存一次（门票号没存上，接回来这局结算不了）
      const g = game, tp = WAL.start(game, settings.tier);
      if (tp && tp.then) tp.then(() => { if (game === g) save(); });
    }
    save();
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    busy = true;
    bgm('game');
    startWithDeal();
  }
  function resumeGame(d) {
    resetTable();
    viewSeat = -1; els.app.classList.remove('is-watching', 'is-spectator'); els.me.classList.remove('is-watched');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    game = { state: d.state, bots: d.bots, tiers: d.tiers, tutorial: false, fastOut: !d.state.alive[0], openKits: new Set(d.openKits || []), kitShown: new Set(d.openKits || []) };
    if (HL) HL.restore(game, d.hl);
    if (d.wt && d.wt.tid) game.wt = d.wt;   // 这局的小鱼干门票（结算用）
    game.bots[0] = { nick: profile.nick, avatar: profile.avatar };
    els.cover.hidden = true;
    buildSeats();
    solveSize();
    renderAll();
    bgm('game');
    schedule(300, step);
  }
  // 主菜单
  function refreshCover() {
    refreshSolo();
    els.cover.querySelector('[data-cover="exit"]').hidden = !FROM_SITE;
    const sess = NET && NET.readSession(), rb = els.cover.querySelector('[data-cover="resume"]');
    if (rb) {   // 联机设置单：还在某个房间里 →「回到房间 1234」排第一个、朱红；「创建房间」退成普通键
      rb.hidden = !sess;
      rb.querySelector('b').textContent = sess ? T('ui.room.backTo', '回到房间 {code}', { code: sess.code }) : T('ui.room.back', '回到房间');
      els.cover.querySelector('[data-cover="create"]').classList.toggle('is-primary', !sess);
    }
    const ob = els.cover.querySelector('[data-cover="online"]');
    if (ob) ob.hidden = !NET;
    coverResume();
  }
  /* 设置单右上角的收起键（横屏没有往下拖的把手时用）：朱红折号转个向——竖屏朝下、横屏抽屉朝右，跟它收走的方向一致 */
  const BACK_ART = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24.5 6.5 13 20l11.5 13.5" fill="none" stroke="#b4392c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  els.cover.querySelectorAll('.zm-setsheet-x').forEach((b) => { b.innerHTML = BACK_ART; });
  const SOLO_MAX = R.MAX_PLAYERS;   // 9 人（6 人起用两副牌）
  /* 玩法（2026-11-18 用户挑乙「玩法当主角」）：主菜单中间一叠牌左右滑，停在哪张就是哪个玩法——单机开局、联机建房都用它。
   * 不配介绍文字（2026-11-18 用户：一句话介绍有 AI 味，全删）：靠牌面插画 + 名字认，规则看新手教程。[玩法, 名字, 牌面] */
  // 2026-11-22 用户：玩法牌按小鱼干门票由便宜到贵排——经典、百变、角色、组队（角色和组队对调）
  const SOLO_MODES = [
    ['classic', T('mode.classic.name', '经典'), 'boom'],
    ['flux', T('mode.flux.name', '百变'), 'flux'],
    ['roles', T('mode.roles.name', '角色'), 'calico'],
    ['team', T('mode.team.name', '组队'), 'favor'],
  ];
  const miniCard = (k, name) => { const t = ART.TONE[k]; return '<span class="zm-card" data-k="' + k + '" style="--bg:' + t.bg + ';--band:' + t.band + ';--ink:' + t.ink + '"><span class="zm-art">' + ART.face(k) + '</span><b class="zm-nm' + nmCls(name || R.NAMES[k]) + '">' + (name || R.NAMES[k]) + '</b></span>'; };
  const curMode = () => R.normalizeRules(settings.rules).mode;
  const modeIdx = (m) => Math.max(0, SOLO_MODES.findIndex(([x]) => x === (m || curMode())));
  const soloN = () => (curMode() === 'team' ? R.teamPlayers(R.normalizeRules(settings.rules)) : Math.max(R.MIN_PLAYERS, Math.min(SOLO_MAX, settings.players)));   // 组队：人数跟着队形走
  /* 组队的设置（2026-11-18 用户）：队形（每队人数相等）+ 座位（同队坐一起 / 随机打乱）。队友共享情报、救队友、能对队友出牌都是组队自带，不进设置。
   * 队形用彩色小点表示几队几人（点的颜色就是桌上头像底色），不写「3v3」也看得懂 */
  /* 2026-11-19 用户挑「丙」：先选几个人玩、再选怎么分。每队人数相等（「戊」：不做不均等，联机凑不齐就加机器猫），9 人以内一共这 6 种分法；
   * 5、7 人没有等分法，按钮灰着点不了 */
  const TEAM_FORM_UI = ['2v2', '3v3', '4v4', '2v2v2', '2v2v2v2', '3v3v3'];
  const TEAM_NS = [4, 5, 6, 7, 8, 9];
  const formsOf = (n) => TEAM_FORM_UI.filter((f) => R.teamPlayers({ teamForm: f }) === n);
  const nRowHtml = (cur, attrs) => TEAM_NS.map((n) => '<button type="button" data-tn="' + n + '" aria-pressed="' + (n === cur) + '"' + (formsOf(n).length ? attrs : ' class="is-none" disabled') + '>' + n + '</button>').join('');
  const TEAM_PIP = ['#2f5d8a', '#3f7a55', '#c7772e', '#c0648f'];
  const pipHtml = (form) => '<span class="zm-pips">' + R.TEAM_FORMS[form].map((k, t) => '<span>' + ('<i style="background:' + TEAM_PIP[t] + '"></i>').repeat(k) + '</span>').join('') + '</span>';

  function refreshSolo() {
    const n = soloN(), teamOn = curMode() === 'team';
    $('zmSoloNum').innerHTML = n + '<small>' + T('ui.solo.people', '人', { n }) + '</small>';
    const tr = R.normalizeRules(settings.rules), tp = $('zmTeamPick');
    tp.hidden = !teamOn;
    els.cover.querySelector('.zm-solo-step').hidden = teamOn;
    if (teamOn) {
      tp.innerHTML = '<div class="zm-team-row"><small>' + T('ui.team.players', '几个人玩') + '</small><div class="zs-seg zm-team-ns" role="group" aria-label="' + T('ui.team.players', '几个人玩') + '">' + nRowHtml(n, '') + '</div></div>' +
        '<div class="zm-team-row"><small>' + T('ui.team.split', '怎么分') + '</small><div class="zm-team-forms" role="group" aria-label="' + T('ui.team.split', '怎么分') + '">' + formsOf(n).map((f) => '<button type="button" data-form="' + f + '" aria-pressed="' + (tr.teamForm === f) + '" aria-label="' + f + '">' + pipHtml(f) + '</button>').join('') + '</div></div>' +
        '<div class="zs-seg zm-team-seat" role="group" aria-label="' + T('ui.team.seats', '座位') + '">' + [['together', T('ui.team.together', '同队坐一起')], ['random', T('ui.team.shuffle', '随机打乱')]].map(([v, name]) => '<button type="button" data-seat="' + v + '" aria-pressed="' + (tr.teamSeat === v) + '">' + name + '</button>').join('') + '</div>';
    }
    const [minus, plus] = els.cover.querySelectorAll('.zm-solo-step button');
    minus.disabled = teamOn || n <= R.MIN_PLAYERS; plus.disabled = teamOn || n >= SOLO_MAX;
    const faces = AV ? (AV.BOT_TIERS && AV.BOT_TIERS[settings.tier] ? AV.BOT_TIERS[settings.tier].faces : AV.ROBOT) : [];   // 预览选中那一档的头像
    const meFace = profile.avatar && AV && AV.byId[profile.avatar] ? AV.byId[profile.avatar].svg : '<span>' + T('ui.me', '我') + '</span>';
    // 组队：头像按队排、换成队色底（和桌上一样），我这队在最前面
    const tint = (svg, ti) => (teamOn ? svg.replace(/(<circle cx="32" cy="32" r="32" fill=")#[0-9a-fA-F]{3,8}/, '$1' + TEAM_BG[ti]) : svg);
    const form = teamOn ? R.TEAM_FORMS[tr.teamForm] : null, teamOfFace = (i) => { if (!form) return 0; let k = i; for (let t = 0; t < form.length; t++) { if (k < form[t]) return t; k -= form[t]; } return 0; };
    $('zmSoloFaces').innerHTML = '<i class="is-me">' + tint(meFace, 0) + '</i>' + Array.from({ length: n - 1 }, (_, i) => '<i' + (teamOn && teamOfFace(i + 1) !== teamOfFace(i) ? ' class="is-gap"' : '') + '>' + (faces.length ? tint(faces[i % faces.length].svg, teamOfFace(i + 1)) : '') + '</i>').join('');
    // 头像一排排不下就整体缩小（9 人时放不下 9 个 34px 的头像；2026-11-13 用户：别超出宽度）
    const fw = $('zmSoloFaces').clientWidth || 260, lap = 7;
    $('zmSoloFaces').style.setProperty('--fs', Math.min(34, Math.floor((fw + (n - 1) * lap) / n)) + 'px');
    $('zmSoloTier').innerHTML = AI.TIERS.map((t) => '<button type="button" data-tier="' + t + '" aria-pressed="' + (t === settings.tier) + '">' + AI.TIER_NAMES[t] + '</button>').join('');
    if (WAL) WAL.priceTag(els.cover.querySelector('[data-cover="start"]'), settings.tier, curMode(), n);   // 开始键上标这局门票（小鱼干）
    $('zmSoloRules').innerHTML = ruleChipsHtml(settings.rules, settings.turnSec, true);   // 这一局的规则：一排小规则牌，点开是规则页
    refreshDeck();
  }

  /* ───── 玩法牌叠：横向滚动 + 吸附，中间那张最大，两边的缩小、歪一点、淡一点（滚的时候逐帧算） ───── */
  const deckEl = $('zmModeDeck'), track = $('zmModeTrack');
  track.innerHTML = SOLO_MODES.map(([m, name, k]) => '<button type="button" class="zm-mslide" data-mode="' + m + '" aria-label="' + name + '">' + miniCard(k, name) + '</button>').join('');
  $('zmModeDots').innerHTML = SOLO_MODES.map(() => '<i></i>').join('');
  const slides = Array.from(track.children);
  function deckNearest() {
    const c = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = Infinity;
    slides.forEach((sl, i) => { const d = Math.abs(sl.offsetLeft + sl.offsetWidth / 2 - c); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function deckPaint() {
    const c = track.scrollLeft + track.clientWidth / 2;
    slides.forEach((sl) => {
      const d = (sl.offsetLeft + sl.offsetWidth / 2 - c) / (sl.offsetWidth || 1), a = Math.min(1, Math.abs(d)), dc = Math.max(-1.4, Math.min(1.4, d));
      sl.style.transform = 'translateY(' + (a * 16).toFixed(1) + 'px) rotate(' + (dc * 7).toFixed(2) + 'deg) scale(' + (1 - 0.26 * a).toFixed(3) + ')';
      sl.style.opacity = (1 - 0.42 * a).toFixed(3);
      sl.style.zIndex = String(10 - Math.round(Math.abs(d) * 2));
    });
    coverBgPaint(c);
  }
  function refreshDeck() {
    const i = modeIdx();
    Array.from($('zmModeDots').children).forEach((d, j) => d.classList.toggle('is-on', j === i));
    slides.forEach((sl, j) => sl.setAttribute('aria-pressed', String(j === i)));
  }
  function deckTo(i, smooth) {
    const sl = slides[i];
    if (!sl || !track.clientWidth) return;
    track.scrollTo({ left: sl.offsetLeft + sl.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth && !fx.reduce() ? 'smooth' : 'auto' });
    deckPaint();
  }
  let deckRaf = 0, deckSettle = 0;
  track.addEventListener('scroll', () => {
    if (!deckRaf) deckRaf = requestAnimationFrame(() => { deckRaf = 0; deckPaint(); });
    clearTimeout(deckSettle);
    deckSettle = setTimeout(() => {   // 停稳了：停在哪张就换成哪个玩法
      const m = SOLO_MODES[deckNearest()][0];
      if (m === curMode()) return;
      settings.rules = R.normalizeRules(Object.assign({}, settings.rules, { mode: m }));
      saveSettings(); refreshSolo();
      snd('tick');
    }, 120);
  }, { passive: true });
  track.addEventListener('click', (e) => {
    const sl = e.target.closest('.zm-mslide');
    if (!sl) return;
    const i = slides.indexOf(sl);
    if (i !== deckNearest()) { deckTo(i, true); snd('tap'); } else fx.pop(sl.firstElementChild, { scale: 1.05, dur: 220 });
  });
  window.addEventListener('resize', () => { if (!deckEl.hidden) deckTo(modeIdx(), false); });
  const deckSync = () => requestAnimationFrame(() => deckTo(modeIdx(), false));

  /* ───── 设置单（单机 / 联机共用一层遮罩）：竖屏从底下升起；点外面 / 往下拖 / Esc 收起 ─────
   * 横屏（矮）改成从右边滑出的抽屉（2026-11-18 用户在 原地换栏 / 右侧抽屉 / 居中两栏 里挑了抽屉） */
  const sheetMask = $('zmSoloSheet'), sheets = { solo: sheetMask.querySelector('[data-sheet="solo"]'), online: sheetMask.querySelector('[data-sheet="online"]') };
  let sheet = sheets.solo;
  const isLand = () => matchMedia('(orientation: landscape) and (max-height: 540px)').matches;
  // 设置单从哪儿进出：竖屏从底下，横屏抽屉从右边
  const sheetOff = () => (isLand() ? 'translateX(100%)' : 'translateY(100%)');
  /* 2026-11-19 用户：点过单机、收起后再点联机，有时弹出来的还是单机 / 什么都不弹。根子：单机、联机共用一层遮罩，
   * 收起动画（fill: forwards）播的 220 毫秒里点了另一张，旧的收起收尾会把新开的整层藏掉，且只清掉「当前那张」的动画，
   * 另一张身上留着定格在屏外的收起动画，下次打开它滑上来又被拽回去。现在每次开 / 收都带代号：开的时候把两张的残留动画全清掉，
   * 收尾只在期间没人重新打开时才藏遮罩 */
  let sheetGen = 0;
  const clearSheetFx = () => [sheetMask, sheets.solo, sheets.online].forEach((el) => { el.getAnimations().forEach((a) => a.cancel()); el.style.transform = ''; });
  function openSheet(kind) {
    kind = kind || 'solo';
    sheetGen += 1;
    sheetMask._closing = false;
    sheetMask.style.pointerEvents = '';
    clearSheetFx();
    Object.keys(sheets).forEach((k) => { sheets[k].hidden = k !== kind; });
    soloRulePage(false, true);   // 每次打开都从第一页（人数 / 难度）开始
    sheet = sheets[kind];
    sheetMask.dataset.kind = kind;
    coverResume();
    refreshSolo();
    sheetMask.hidden = false;
    refreshSolo();   // 头像那排按显示出来以后的宽度再算一次
    snd('tap');
    if (fx.reduce()) return;
    sheetMask.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    sheet.animate([{ transform: sheetOff() }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.25,1)' });
  }
  function closeSheet() {
    if (sheetMask.hidden || sheetMask._closing) return;
    if (fx.reduce()) { sheetMask.hidden = true; return; }
    sheetMask._closing = true;
    const gen = sheetGen, sh = sheet, now = getComputedStyle(sh).transform;
    sheetMask.style.pointerEvents = 'none';   // 正在收：底下的「单机 / 联机」马上就能点（以前这 0.2 秒点下去会被遮罩吃掉）
    sheetMask.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
    sh.animate([{ transform: now === 'none' ? 'none' : now }, { transform: sheetOff() }], { duration: 220, easing: 'cubic-bezier(.4,0,.8,.4)', fill: 'forwards' }).finished
      .catch(() => {}).then(() => {
        if (gen !== sheetGen) return;   // 收的过程中又打开了（单机 / 联机都算）：别把新开的那张藏掉，残留动画打开时已经清了
        sheetMask.hidden = true; sheetMask._closing = false; sheetMask.style.pointerEvents = ''; clearSheetFx();
      });
  }
  /* 单机开局单 ⇄ 规则页（2026-11-26）：同一张单，内容左右滑着换；quiet = 打开开局单时悄悄复位，不放动画不出声 */
  function soloRulePage(on, quiet) {
    const sec = sheets.solo, pg = $('zmSoloRulePg');
    if (!sec || !pg || (!on && pg.hidden)) return;
    if (on) { pg.innerHTML = rulePageHtml(modeName(curMode()) + ' · ' + T('ui.rules.edit', '规则'), settings.rules, settings.turnSec, true); bindRulePage(pg, soloRuleIO(() => soloRulePage(false))); }
    sec.classList.toggle('is-rulepg', on);
    pg.hidden = !on;
    if (quiet) return;
    snd('tap');
    if (fx.reduce()) return;
    sec.querySelectorAll(on ? '.zr-page' : '.zm-solo-pick, [data-cover="start"]').forEach((el) => el.animate([{ opacity: 0, transform: 'translateX(' + (on ? 28 : -28) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.25,1)' }));
  }
  sheetMask.addEventListener('click', (e) => { if (e.target === sheetMask) closeSheet(); });
  let ghostUntil = 0;   // 甩收设置单后的一小段：主页按钮上冒出来的 click 当成手势的余波吞掉（兜底，见下面 touchend）
  Object.values(sheets).forEach((sh) => {   // 往下拖设置单：跟手，拖过 80px（或甩得快）就收起（横屏抽屉不拖）
    let y0 = null, t0 = 0, dy = 0, dragged = false;
    sh.addEventListener('pointerdown', (e) => { if (e.target.closest('button, input') || sheetOff().indexOf('Y') < 0) return; y0 = e.clientY; t0 = performance.now(); dy = 0; sh.setPointerCapture(e.pointerId); });
    sh.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = 'translateY(' + dy + 'px)'; });
    const end = () => {
      if (y0 == null) return;
      const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
      y0 = null;
      dragged = dy > 4;
      if (dy > 80 || (fast && dy > 24)) { closeSheet(); ghostUntil = performance.now() + 700; }
      else if (dy) sh.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.3,.8,.4,1)' }).finished.catch(() => {}).then(() => { sh.style.transform = ''; });
    };
    sh.addEventListener('pointerup', end); sh.addEventListener('pointercancel', end);
    // iOS（2026-11-19 用户录屏）：往下一甩收起设置单，手指离开后约 0.35 秒 WebKit 还会在抬手的位置补发一次 click——
    // 那时设置单已经滑走，那个位置正好是主页的「单机」键，于是「点联机却弹出单机」。拖过就把这次 touchend 的默认动作取消（不补发 click）
    sh.addEventListener('touchend', (e) => { if (dragged) { dragged = false; e.preventDefault(); } }, { passive: false });
  });

  /* 第一次点「单机」：问不问走新手教程（2026-11-20 用户：原来那个纯文字框不好看，在三版里挑甲）——
   * 插画弹层：上面主页那只炸弹猫 + 挥着的逗猫棒，下面两张「牌」当按钮：直接开（爪印）/ 跟我学（翻开的书，发暖金光），不写说明句 */
  function soloStart() {
    let seen = false;
    try { seen = !!localStorage.getItem(TUT_KEY); } catch (_) { seen = true; }
    if (seen || !TUT) { newGame(); return; }
    const skip = () => { try { localStorage.setItem(TUT_KEY, '1'); } catch (_) { /* */ } newGame(); };
    const book = '<svg viewBox="0 0 24 24" aria-hidden="true">' + MENU_ICONS.tutorial + '</svg>';
    openDialog('<div class="zm-tutask-art">' + ART.hero() + '</div>' +
      '<div class="zm-tutask-cards">' +
        '<button type="button" class="zm-tutask-card" data-skip><span class="pic is-paw"><svg viewBox="0 0 24 24" aria-hidden="true">' + ART.pawPrint() + '</svg></span><b>' + T('tut.first.skipShort', '直接开') + '</b></button>' +
        '<button type="button" class="zm-tutask-card is-go" data-tut data-focus><span class="pic is-book">' + book + '</span><b>' + T('tut.first.goShort', '跟我学') + '</b></button>' +
      '</div>', (d) => {
      d.classList.add('is-tutask');
      d.querySelector('[data-tut]').addEventListener('click', () => startTutorial());
      d.querySelector('[data-skip]').addEventListener('click', skip);
    });
  }
  // 主菜单两步：load（插画 + 大字 + 进度条）→ main（玩法牌 + 单机 / 联机；点了各自升起设置单）
  function coverStep(k) {
    els.cover.querySelectorAll('[data-cover-step]').forEach((x) => { x.hidden = x.dataset.coverStep !== k; });
    coverResume();   // 2026-11-18 用户：首页不放「接着打」药丸，改成单机键小黄点 + 设置单里那张卡
    const wasHidden = deckEl.hidden;
    deckEl.hidden = k === 'load';
    if (wasHidden && !deckEl.hidden) deckSync();
    if (k !== 'main') sheetMask.hidden = true;
  }
  function showCover() {
    if (WAL && game) WAL.settle(game);
    if (WAL) setTimeout(() => WAL.me(), 1200);   // 回主页面：余额可能刚结算完，稍后刷新左上角
    if (game && !game.tutorial) save();   // 发牌 / 抽角色中回主页面也存（2026-11-26），接着打时直接从发完牌开始
    resetTable();
    tut = null;
    els.skipTut.hidden = true;
    if (soundPanel) soundPanel.hidden = true;
    refreshCover();
    els.cover.classList.remove('is-loading');
    coverStep('main');
    sheetMask.hidden = true;
    els.cover.hidden = false;
    deckSync();
    refreshTools();
    bgm('menu');
    coverIntro(false);
  }
  // 主菜单：标题一个字一个字落下来（只在进来那一次）；回主菜单时玩法牌、按钮依次浮上来
  function coverIntro(title) {
    if (fx.reduce()) return;
    const h = els.cover.querySelector('.zm-cover-title');
    if (!h.querySelector('span')) h.innerHTML = Array.from(h.textContent).map((ch) => '<span>' + ch + '</span>').join('');
    if (title) h.querySelectorAll('span').forEach((sp, i) => sp.animate([{ transform: 'translateY(-26px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(4px) rotate(2deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: 120 + i * 90, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
    const items = title ? els.cover.querySelectorAll('.zm-cover-art') : els.cover.querySelectorAll('.zm-mdeck, .zm-cover-btn:not([hidden]), .zm-cover-foot:not([hidden])');
    items.forEach((n, i) => n.animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: i === 0 ? 0 : (title ? 380 : 60) + i * 80, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }
  // 进度条跑完：插画往上淡走，标题从正中滑到顶上（FLIP），玩法牌、单机 / 联机一个个浮上来
  async function coverReveal() {
    const art = els.cover.querySelector('.zm-cover-art'), h = els.cover.querySelector('.zm-cover-title');
    if (!fx.reduce()) await art.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px) scale(.92)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    const r0 = h.getBoundingClientRect();
    els.cover.classList.remove('is-loading');
    coverStep('main');
    art.getAnimations().forEach((a) => a.cancel());
    if (fx.reduce()) return;
    const r1 = h.getBoundingClientRect();
    h.animate([{ transform: 'translate(' + (r0.left - r1.left) + 'px,' + (r0.top - r1.top) + 'px)' }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.3,.8,.3,1)' });
    els.cover.querySelectorAll('.zm-mdeck, [data-cover-step="main"] .zm-cover-btn:not([hidden]), .zm-cover-foot[data-cover-step="main"]').forEach((n, i) => n.animate([{ transform: 'translateY(22px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, delay: 200 + i * 90, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
  }


  /* ───── 主页封面（2026-11-18 第三轮，用户逐项挑定）─────
   * 标题字：四个字各是一张字形 SVG（Noto Serif SC 粗体轮廓，OFL），「小」的竖钩整根换成逗猫棒（顶上拴绳挂羽毛穗、杆尾弯成手柄、握手处两道朱红），
   *         炸弹猫占「咪」的口字旁（用户挑甲）
   * 玩法背景：对角剪影（用户挑乙）——每个玩法一对纯色剪影，大的从左上角探进来、小的从右下角；不铺底色。
   *         四层各对应一个玩法，透明度 = max(0, 1 − |p − i|)，p = 玩法牌滚到第几张（小数，逐帧算），剪影跟着 (i − p) 视差平移——跟手本身就是过渡。
   *         角色用最初那版三花猫剪影（用户：后来重画的都更丑）
   * 接着打上一局：首页不放浮窗（用户挑乙）——单机键角上一颗小黄点（有没打完的局）、联机键同理（还在某个房间里）；
   *         点单机后设置单最上面一张「接着打」卡，下面「或」再新开一局 */
  var coverReady = false, coverLayers = [], coverBgEl = null, coverResCard = null, coverResOr = null;
  /* ── 标题字 ── */
  const GLYPH = {'百':['M53 753H753L822 839Q822 839 835 830Q848 820 868 805Q888 790 910 773Q931 756 949 741Q945 725 920 725H61Z','M700 547H690L746 610L861 519Q857 513 847 508Q837 502 821 499V-44Q821 -48 804 -56Q788 -64 764 -71Q740 -78 719 -78H700Z','M185 547V598L312 547H755V518H304V-41Q304 -48 290 -58Q275 -68 252 -76Q230 -83 204 -83H185Z','M241 33H757V5H241Z','M241 301H757V272H241Z','M415 753H575Q553 714 526 672Q500 629 472 592Q444 554 416 528H394Q398 556 402 596Q407 635 410 677Q414 719 415 753Z'],'变':['M291 327Q334 253 406 200Q477 148 568 114Q659 80 762 60Q866 41 973 33L972 21Q934 11 910 -18Q886 -46 876 -90Q736 -64 620 -16Q503 33 416 114Q330 194 278 318Z','M641 327 716 392 825 289Q819 280 809 277Q799 274 779 273Q662 127 470 35Q279 -57 34 -89L28 -76Q164 -37 286 22Q409 82 504 159Q600 236 655 327Z','M731 327V299H175L166 327Z','M450 377Q449 373 425 364Q401 354 358 354H338V698H450Z','M661 379Q660 376 636 366Q611 356 568 356H548V697H661Z','M403 855Q472 856 512 842Q553 827 571 805Q589 783 588 760Q587 738 572 722Q557 705 533 701Q509 697 481 714Q475 738 461 764Q447 789 430 812Q413 834 396 850Z','M341 566Q337 558 326 554Q316 549 300 553Q247 486 182 439Q116 392 48 364L37 375Q84 417 132 486Q179 555 211 634Z','M820 790Q820 790 832 781Q844 772 862 758Q880 743 900 726Q920 710 936 695Q932 679 909 679H71L63 707H756Z','M685 612Q769 601 820 576Q872 552 897 522Q922 491 926 462Q929 433 916 412Q904 392 880 387Q856 382 826 400Q815 437 791 474Q767 512 736 546Q706 580 677 605Z'],'小':['M663 587Q766 539 829 484Q892 428 922 374Q953 320 957 275Q961 230 946 202Q931 173 902 169Q874 165 839 193Q832 242 813 294Q794 345 768 396Q743 447 713 494Q683 540 652 581Z','M220 600 384 536Q381 528 373 523Q365 518 346 518Q317 455 273 386Q229 316 170 252Q110 187 32 139L24 148Q63 195 94 252Q126 309 150 370Q175 431 192 490Q210 549 220 600Z','M447 835 608 819Q606 809 598 802Q590 794 571 791V61Q571 18 559 -12Q547 -43 510 -62Q473 -81 396 -88Q392 -57 385 -36Q378 -14 361 1Q345 15 319 26Q293 36 243 45V58Q243 58 258 57Q274 56 298 55Q321 54 346 52Q372 51 392 50Q413 49 421 49Q437 49 442 54Q447 59 447 70Z'],'咪':['M373 448H802L862 530Q862 530 873 521Q884 512 901 498Q918 483 936 467Q955 451 970 436Q966 420 942 420H381Z','M712 435Q737 365 780 304Q823 244 876 198Q928 152 984 124L982 113Q914 98 888 10Q814 78 769 184Q724 289 700 431Z','M544 439H682V423Q636 276 534 164Q431 52 271 -21L262 -10Q335 44 390 116Q446 188 484 270Q523 353 544 439Z','M67 722V769L179 722H326V693H175V99Q175 93 162 84Q149 75 128 68Q108 61 84 61H67Z','M252 722H242L294 780L401 696Q397 690 386 684Q375 678 360 675V141Q360 137 344 129Q329 121 308 115Q288 109 269 109H252Z','M118 241H322V212H118Z','M404 760Q467 728 502 691Q536 654 548 618Q561 583 556 554Q552 526 536 510Q519 494 496 495Q473 496 449 520Q452 559 444 600Q436 642 422 682Q409 723 393 755Z','M812 763 961 702Q957 693 946 688Q936 683 920 685Q883 633 840 584Q798 535 754 498L742 506Q752 538 764 580Q777 623 790 671Q802 719 812 763Z','M595 849 745 834Q744 824 736 816Q729 808 708 805V-48Q708 -54 694 -64Q681 -73 660 -80Q638 -88 617 -88H595Z']};
  const INKC = 'currentColor';
  // 炸弹猫（墨色刺球 + 两只大眼 + 腮红），cx/cy/R 都是字形单位（1000 一个字）
  function catGlyph(cx, cy, R) {
    let d = '';
    for (let i = 0; i < 32; i++) { const a = -Math.PI / 2 + i * Math.PI / 16, r = i % 2 ? R * 0.72 : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); }
    const e = R * 0.21;
    return '<g class="tg-cat">' +
      '<path d="' + d + 'Z" fill="' + INKC + '"/>' +
      '<circle cx="' + (cx - R * 0.33) + '" cy="' + (cy - R * 0.02) + '" r="' + e + '" fill="#fff"/><circle cx="' + (cx + R * 0.33) + '" cy="' + (cy - R * 0.02) + '" r="' + e + '" fill="#fff"/>' +
      '<circle cx="' + (cx - R * 0.3) + '" cy="' + (cy - R * 0.05) + '" r="' + e * 0.5 + '" fill="' + INKC + '"/><circle cx="' + (cx + R * 0.36) + '" cy="' + (cy - R * 0.05) + '" r="' + e * 0.5 + '" fill="' + INKC + '"/>' +
      '<ellipse cx="' + (cx - R * 0.52) + '" cy="' + (cy + R * 0.28) + '" rx="' + R * 0.14 + '" ry="' + R * 0.08 + '" fill="#e58e8e"/><ellipse cx="' + (cx + R * 0.52) + '" cy="' + (cy + R * 0.28) + '" rx="' + R * 0.14 + '" ry="' + R * 0.08 + '" fill="#e58e8e"/>' +
      '<path d="M' + (cx + R * 0.55) + ' ' + (cy - R * 1.05) + 'l' + R * 0.1 + ' ' + R * 0.2 + ' ' + R * 0.2 + ' ' + R * 0.05 + '-' + R * 0.17 + ' ' + R * 0.12 + '.03 ' + R * 0.22 + '-' + R * 0.16 + '-' + R * 0.14 + '-' + R * 0.16 + ' ' + R * 0.14 + '.03-' + R * 0.22 + '-' + R * 0.17 + '-' + R * 0.12 + ' ' + R * 0.2 + '-' + R * 0.05 + 'Z" fill="#e9c46a"/></g>';
  }
  // 逗猫棒的绳 + 羽毛穗：从 (x, y) 拴出，绳往 (tx, ty) 甩，穗挂在绳头；整组绕拴绳点轻轻晃
  function wandTassel(x, y, tx, ty, c1x, c1y, s) {
    s = s || 1;
    return '<g class="tg-tassel" style="transform-origin:' + x + 'px ' + y + 'px">' +
      '<path d="M' + x + ' ' + y + 'Q' + c1x + ' ' + c1y + ' ' + tx + ' ' + ty + '" fill="none" stroke="' + INKC + '" stroke-width="26" stroke-linecap="round"/>' +
      '<g transform="translate(' + tx + ' ' + ty + ') scale(' + s + ')">' +
      '<path d="M0 0c-54-16-100 22-90 80 42 0 86-27 90-80Z" fill="#e0566e"/><path d="M0 0c-13 54 13 100 70 96 0-45-27-83-70-96Z" fill="#e9c46a"/>' +
      '<path d="M0 0c-38 45-38 96 0 128 32-45 26-90 0-128Z" fill="#6fa8dc"/><circle r="20" fill="#c8463a"/></g></g>';
  }
  function glyphSvg(ch, drop, extra) {
    const paths = GLYPH[ch].map((d, i) => (drop.indexOf(i) >= 0 ? '' : '<path d="' + d + '"/>')).join('');
    return '<span><svg viewBox="0 0 1000 1000" aria-hidden="true" overflow="visible"><g transform="translate(0 880) scale(1 -1)" fill="currentColor">' + paths + '</g>' + (extra || '') + '</svg></span>';
  }
  // 「小」的竖钩整根换成逗猫棒：顶上圆头拴绳挂穗，往下一根杆，杆尾弯成手柄（就是原来的钩），握手处缠两道朱红
  function wandStroke() {
    return '<g class="tg-wand">' +
      '<path d="M508 150V860Q508 968 404 962Q300 956 262 836" fill="none" stroke="' + INKC + '" stroke-width="100" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="452" y="676" width="112" height="24" rx="8" fill="#c8463a"/><rect x="452" y="728" width="112" height="24" rx="8" fill="#c8463a"/>' +
      '<circle cx="508" cy="118" r="66" fill="' + INKC + '"/>' +
      wandTassel(508, 92, 790, -40, 620, -220, 1.7) + '</g>';
  }
  /* 「百」「变」（2026-11-18 用户逐轮挑定）：
   *   百：顶横右端那个往上翘的凸起换成一只趴着的黑猫——脑袋歪着搁在横的右端、闭眼睡（两道平缓的闭眼线，不画嘴、不画腮红：
   *       笑眼 + ω 嘴 + 腮红用户嫌「猥琐」），一只圆爪子从横前面耷拉下来；身子顺着横往左趴，圆屁股正好压在撇上，
   *       撇就当垂下来的尾巴，尾尖往回勾一小段
   *   变：上面三个点换成星光（顶金、左粉、右青 = 百变牌名字条的颜色），最后那一捺整笔换成往上卷的猫尾巴 */
  const tgStar = (cx, cy, r, c, k) => { const q = r * 0.22; return '<path class="tg-star" style="--d:' + k + 's" d="M' + cx + ' ' + (cy - r) + 'Q' + (cx + q) + ' ' + (cy - q) + ' ' + (cx + r) + ' ' + cy + 'Q' + (cx + q) + ' ' + (cy + q) + ' ' + cx + ' ' + (cy + r) + 'Q' + (cx - q) + ' ' + (cy + q) + ' ' + (cx - r) + ' ' + cy + 'Q' + (cx - q) + ' ' + (cy - q) + ' ' + cx + ' ' + (cy - r) + 'Z" fill="' + c + '"/>'; };
  function baiSleepyCat() {
    const ear = (x1, y1, x2, y2, x3, y3) => '<path d="M' + x1 + ' ' + y1 + 'Q' + x2 + ' ' + y2 + ' ' + x3 + ' ' + y3 + 'Z" stroke="' + INKC + '" stroke-width="22" stroke-linejoin="round"/>';
    return '<g class="tg-nap"><g fill="' + INKC + '">' +
      '<path d="M53 127H880V155H61Z"/>' +   // 顶横（去掉右端凸起，猫头占那儿）
      '<path d="M414 155C392 96 420 44 494 40C556 37 590 64 640 70C690 76 720 52 770 60C790 64 800 90 800 155Z"/>' +   // 身子：圆屁股 → 腰微塌 → 肩膀拱起
      '<rect x="838" y="128" width="60" height="58" rx="30"/>' +   // 耷拉下来的爪子
      '</g>' +
      '<path d="M408 330C394 374 352 390 324 368" fill="none" stroke="' + INKC + '" stroke-width="30" stroke-linecap="round"/>' +   // 撇（尾巴）的尖往回勾
      '<g transform="rotate(10 838 140)"><g fill="' + INKC + '"><ellipse cx="838" cy="74" rx="96" ry="78"/>' + ear(752, 46, 748, -66, 818, 2) + ear(858, 2, 928, -66, 924, 46) + '</g>' +
      '<path d="M770 22Q768 -20 792 4Z" fill="#f2b8c0"/><path d="M906 22Q908 -20 884 4Z" fill="#f2b8c0"/>' +   // 耳内一点粉
      '<path d="M780 84q20 7 40 0M856 84q20 7 40 0" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>' +   // 闭眼
      '<path d="M830 100h16l-8 9Z" fill="#c8463a"/></g></g>';   // 小红鼻子
  }
  function bianStarsTail() {
    return '<path class="tg-tail" d="M300 560C360 720 520 860 760 905C860 924 930 900 948 836C966 770 916 724 866 742C826 756 828 806 862 812" fill="none" stroke="' + INKC + '" stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/>' +
      tgStar(492, 112, 118, '#e9b949', 0) + tgStar(205, 400, 92, '#e0566e', 0.9) + tgStar(805, 392, 86, '#2f8a83', 1.7);
  }
  function coverTitle() {
    const h = els.cover.querySelector('.zm-cover-title');
    // 艺术字是按简体「百变小咪」四个字画的：繁体 / 英文界面不套，直接写语言包里的名字（标题样式见 zhamao.css .zm-cover-title）
    if (LANG !== 'zh-Hans') { const nm = T('game.name', '百变小咪'); h.textContent = nm; const g0 = els.table && els.table.querySelector('.zm-title'); if (g0) g0.textContent = nm; return; }
    h.classList.add('is-glyph');
    h.setAttribute('aria-label', '百变小咪');
    h.innerHTML = glyphSvg('百', [0], baiSleepyCat()) + glyphSvg('变', [0, 5, 6, 8], bianStarsTail()) + glyphSvg('小', [2], wandStroke()) + glyphSvg('咪', [3, 4, 5], catGlyph(226, 450, 205));
    // 游戏里左上角的招牌也用同一套艺术字（2026-11-18 用户），小一号、不动
    const g = els.table && els.table.querySelector('.zm-title');
    if (g) { g.classList.add('is-glyph'); g.setAttribute('aria-label', '百变小咪'); g.innerHTML = h.innerHTML; }
  }
  /* ── 玩法背景 ── */
  const BG_BAND = { classic: '200,70,58', flux: '142,74,156', team: '196,96,122', roles: '176,110,52' };   // 角色：比牌面名字条深一档的焦糖棕（原来的棕在奶油底上太淡，2026-11-18 用户挑戊时看的就是这个色）
  const maskSvg = (svg) => "url('data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, '%27') + "')";
  const maskOf = (k) => maskSvg(ART.face(k).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  const sil100 = (inner, vb) => maskSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 100 100') + '">' + inner + '</svg>');
  // 剪影小件（100 × 100）：实心部分 = 显示，挖空（眼睛 / 耳内）用 SVG 自带的 mask 抠掉
  const star = (cx, cy, n, R, r, rot) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (rot || -90) * Math.PI / 180 + i * Math.PI / n, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } return d + 'Z'; };
  const spk = (cx, cy, r) => 'M' + cx + ' ' + (cy - r) + 'C' + (cx + r * 0.16) + ' ' + (cy - r * 0.16) + ' ' + (cx + r * 0.16) + ' ' + (cy - r * 0.16) + ' ' + (cx + r) + ' ' + cy + 'C' + (cx + r * 0.16) + ' ' + (cy + r * 0.16) + ' ' + (cx + r * 0.16) + ' ' + (cy + r * 0.16) + ' ' + cx + ' ' + (cy + r) + 'C' + (cx - r * 0.16) + ' ' + (cy + r * 0.16) + ' ' + (cx - r * 0.16) + ' ' + (cy + r * 0.16) + ' ' + (cx - r) + ' ' + cy + 'C' + (cx - r * 0.16) + ' ' + (cy - r * 0.16) + ' ' + (cx - r * 0.16) + ' ' + (cy - r * 0.16) + ' ' + cx + ' ' + (cy - r) + 'Z';
  const heartD = (cx, cy, s) => 'M' + cx + ' ' + (cy + 30 * s) + 'C' + (cx - 10 * s) + ' ' + (cy + 22 * s) + ' ' + (cx - 34 * s) + ' ' + (cy + 8 * s) + ' ' + (cx - 34 * s) + ' ' + (cy - 10 * s) + 'C' + (cx - 34 * s) + ' ' + (cy - 26 * s) + ' ' + (cx - 14 * s) + ' ' + (cy - 32 * s) + ' ' + cx + ' ' + (cy - 16 * s) + 'C' + (cx + 14 * s) + ' ' + (cy - 32 * s) + ' ' + (cx + 34 * s) + ' ' + (cy - 26 * s) + ' ' + (cx + 34 * s) + ' ' + (cy - 10 * s) + 'C' + (cx + 34 * s) + ' ' + (cy + 8 * s) + ' ' + (cx + 10 * s) + ' ' + (cy + 22 * s) + ' ' + cx + ' ' + (cy + 30 * s) + 'Z';
  // 圆脸猫头：脸 + 两只耳朵；holes = 眼睛 + 耳内（挖空）
  const catFace = (cx, cy, r, rot, eyes) => {
    const ear = (sx) => 'M' + (cx + sx * r * 0.95) + ' ' + (cy - r * 0.05) + 'L' + (cx + sx * r * 0.8) + ' ' + (cy - r * 1.18) + 'L' + (cx + sx * r * 0.08) + ' ' + (cy - r * 0.72) + 'Z';
    const earIn = (sx) => 'M' + (cx + sx * r * 0.74) + ' ' + (cy - r * 0.42) + 'L' + (cx + sx * r * 0.7) + ' ' + (cy - r * 0.92) + 'L' + (cx + sx * r * 0.36) + ' ' + (cy - r * 0.7) + 'Z';
    const TR = rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '';
    const solid = '<g' + TR + '><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * 0.86) + '"/><path d="' + ear(-1) + ear(1) + '"/></g>';
    const holes = '<g' + TR + '><path d="' + earIn(-1) + earIn(1) + '"/>' + (eyes === 'happy'
      ? '<path d="M' + (cx - r * 0.5) + ' ' + (cy + r * 0.02) + 'q' + (r * 0.17) + ' ' + (-r * 0.26) + ' ' + (r * 0.34) + ' 0M' + (cx + r * 0.16) + ' ' + (cy + r * 0.02) + 'q' + (r * 0.17) + ' ' + (-r * 0.26) + ' ' + (r * 0.34) + ' 0" fill="none" stroke="#000" stroke-width="' + (r * 0.11) + '" stroke-linecap="round"/>'
      : '<circle cx="' + (cx - r * 0.34) + '" cy="' + cy + '" r="' + (r * 0.14) + '"/><circle cx="' + (cx + r * 0.34) + '" cy="' + cy + '" r="' + (r * 0.14) + '"/>') + '</g>';
    return [solid, holes];
  };
  // 拼一张剪影：solid 实心，holes 用 mask 抠掉
  const silCut = (solid, holes, over) => sil100('<defs><mask id="h"><rect x="-50" y="-50" width="200" height="200" fill="#fff"/><g fill="#000">' + (holes || '') + '</g></mask></defs><g mask="url(#h)">' + solid + '</g>' + (over || ''));
  // 对角剪影每个玩法一对（大的左上、小的右下），第三项 = 摆位 [大的 x, y, 转角, 小的 x, y, 转角, 小的镜像]（x/y 是自身宽度的百分比，往屏外推多少）
  const SIL = {
    // 经典：一只刺球炸弹猫（耳朵、挖空的眼睛、头顶一颗火星）；右下一团炸开的爆点
    classic: () => {
      const cat = '<path d="' + star(50, 56, 15, 40, 30) + '"/><path d="M28 30 22 8 42 22ZM72 30 78 8 58 22Z"/>' + '<path d="' + star(80, 14, 6, 10, 4.5) + '"/>';
      const holes = '<circle cx="40" cy="54" r="7.5"/><circle cx="60" cy="54" r="7.5"/><path d="M45 68q5 5 10 0"  fill="none" stroke="#000" stroke-width="3" stroke-linecap="round"/>';
      const pupils = '<circle cx="41.5" cy="55.5" r="3.2"/><circle cx="61.5" cy="55.5" r="3.2"/>';
      return [silCut(cat, holes, pupils), silCut('<path d="' + star(50, 50, 11, 46, 24, -80) + '"/><circle cx="88" cy="16" r="5"/><circle cx="14" cy="84" r="3.5"/>', '<path d="' + star(50, 50, 11, 19, 10, -64) + '"/>'), [-36, -26, -12, 34, 28, 14, 1]];
    },
    // 百变：一根细魔法棒，顶上一颗大星星，划出一道光点弧线，旁边几颗小闪光
    flux: () => [
      sil100('<path d="M12 96 63 37" stroke="#000" stroke-width="5.5" stroke-linecap="round"/><path d="' + star(64, 36, 5, 22, 9.5) + '" stroke="#000" stroke-width="3" stroke-linejoin="round"/>' +
        '<g>' + [[84, 38, 3.4], [90, 48, 3], [93, 58, 2.6], [94, 68, 2.2], [93, 77, 1.8]].map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>').join('') + '</g>' +
        '<path d="' + spk(30, 22, 8) + spk(88, 14, 5.5) + spk(22, 50, 4.5) + '"/>'),
      sil100('<path d="' + spk(48, 50, 44) + spk(86, 14, 11) + spk(16, 86, 7) + '"/>'), [-26, -6, -4, 30, 26, 0, 1]],
    // 组队：两颗猫头互相歪着靠在一起（眯眼笑），中间上方飘一颗心；右下一大一小两颗心
    team: () => {
      const A = catFace(34, 62, 24, -14, 'happy'), B = catFace(66, 58, 22, 12, 'happy');
      return [silCut(A[0] + B[0] + '<path d="' + heartD(50, 20, 0.3) + '"/>', A[1] + B[1]),
        sil100('<path d="' + heartD(44, 56, 1.12) + heartD(84, 18, 0.42) + '"/>'), [-12, -12, -6, 22, 20, 10, 1]];
    },
    // 角色（2026-11-18 用户在十版里挑了戊、再微调）：左上一扇五张角色牌，每张挖空一只不同的猫头（胖脸 / 圆眼 / 眯缝眼尖耳 / 额头条纹 / 斑点），比预览稿再往上一点；
    // 右下保留最初那只三花猫剪影（摆位不变）
    roles: () => [roleFan(), maskOf('calico'), [-12, -15, -8, 38, 30, 16, -1, 0.16, 0.11]],
  };
  // 角色牌扇：直接在 mask 里按层画（每张牌先描一圈黑当缝、再填白，后画的压前面的），猫头画黑 = 挖空、五官画白 = 填回
  function roleFan() {
    const q = (n) => Math.round(n * 100) / 100;
    const ears = (cx, cy, r, w) => { const e = (s) => 'M' + q(cx + s * r * 0.98) + ' ' + q(cy - r * 0.02) + 'L' + q(cx + s * r * 0.82 * w) + ' ' + q(cy - r * 1.2) + 'L' + q(cx + s * r * 0.1) + ' ' + q(cy - r * 0.74) + 'Z'; return e(-1) + e(1); };
    const head = (cx, cy, r, ry, w) => '<ellipse cx="' + q(cx) + '" cy="' + q(cy) + '" rx="' + q(r) + '" ry="' + q(r * ry) + '"/><path d="' + ears(cx, cy, r, w) + '"/>';
    const dots = (cx, cy, r, k) => '<circle cx="' + q(cx - r * 0.36) + '" cy="' + q(cy) + '" r="' + q(r * k) + '"/><circle cx="' + q(cx + r * 0.36) + '" cy="' + q(cy) + '" r="' + q(r * k) + '"/>';
    const ln = (d, w) => '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="' + q(w) + '" stroke-linecap="round"/>';
    const CATS = [
      [(x, y, r) => head(x, y, r * 1.12, 0.76, 1.05), (x, y, r) => dots(x, y, r * 1.1, 0.12)],
      [(x, y, r) => head(x, y, r, 0.86, 1), (x, y, r) => dots(x, y, r, 0.22)],
      [(x, y, r) => head(x, y, r, 0.86, 0.84), (x, y, r) => ln('M' + q(x - r * 0.55) + ' ' + y + 'h' + q(r * 0.36) + 'M' + q(x + r * 0.19) + ' ' + y + 'h' + q(r * 0.36), r * 0.13)],
      [(x, y, r) => head(x, y, r, 0.86, 1), (x, y, r) => dots(x, y, r, 0.13) + ln('M' + q(x - r * 0.22) + ' ' + q(y - r * 0.62) + 'v' + q(r * 0.24) + 'M' + q(x) + ' ' + q(y - r * 0.68) + 'v' + q(r * 0.28) + 'M' + q(x + r * 0.22) + ' ' + q(y - r * 0.62) + 'v' + q(r * 0.24), r * 0.1)],
      [(x, y, r) => head(x, y, r, 0.86, 1), (x, y, r) => dots(x, y, r, 0.13) + '<ellipse cx="' + q(x - r * 0.48) + '" cy="' + q(y - r * 0.42) + '" rx="' + q(r * 0.3) + '" ry="' + q(r * 0.22) + '" fill="none" stroke="#fff" stroke-width="' + q(r * 0.09) + '"/>'],
    ];
    const W = 30, H = 44, px = 50, py = 98, x = px - W / 2, y = 26, fy = y + H * 0.46, r = 8.6;
    const body = [-28, -14, 0, 14, 28].map((ang, i) => '<g transform="rotate(' + ang + ' ' + px + ' ' + py + ')">' +
      '<rect x="' + (x - 2.2) + '" y="' + (y - 2.2) + '" width="' + (W + 4.4) + '" height="' + (H + 4.4) + '" rx="6.5" fill="#000"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '" rx="4.5" fill="#fff"/>' +
      '<g fill="#000">' + CATS[i][0](px, fy, r) + '</g><g fill="#fff">' + CATS[i][1](px, fy, r) + '</g></g>').join('');
    return sil100('<defs><mask id="f" maskUnits="userSpaceOnUse" x="-60" y="-60" width="220" height="220">' + body + '</mask></defs><rect x="-60" y="-60" width="220" height="220" mask="url(#f)"/>');
  }

  function coverBg() {
    if (!coverBgEl) { coverBgEl = document.createElement('div'); coverBgEl.className = 'zm-cover-bg'; coverBgEl.setAttribute('aria-hidden', 'true'); els.cover.prepend(coverBgEl); }
    coverBgEl.innerHTML = SOLO_MODES.map(([m]) => {
      if (!SIL[m]) return '<div class="zm-bgl"></div>';
      const band = BG_BAND[m], pair = SIL[m](), q = pair[2];
      const pose = '--t1x:' + q[0] + '%;--t1y:' + q[1] + '%;--r1:' + q[2] + 'deg;--t2x:' + q[3] + '%;--t2y:' + q[4] + '%;--r2:' + q[5] + 'deg;--f2:' + q[6] + ';' + (q[7] ? '--o1:' + q[7] + ';--o2:' + q[8] + ';' : '');
      const sil = (k, mk) => '<i class="sil ' + k + '" style="' + pose + 'background:rgb(' + band + ');-webkit-mask-image:' + mk + ';mask-image:' + mk + '" data-m="' + mk.slice(5, -2) + '"></i>';   // mk = url('data:…')，data-m 存里面那段给 bakeCoverBg
      return '<div class="zm-bgl">' + sil('s1', pair[0]) + sil('s2', pair[1]) + '</div>';
    }).join('');
    coverLayers = Array.from(coverBgEl.children);
    coverBgPaint();
    bakeCoverBg();
  }
  /* 剪影烤成位图（2026-11-18 用户：开屏切玩法时声音爆一下）。
   * 原来每个剪影是「纯色底 + SVG 遮罩」，WebKit 每次换玩法 / 每帧改位置都要重新栅格化遮罩：Safari（M1）实测第一次滑到某个玩法主线程卡 0.3–0.6 秒，
   * 手机更久；音乐靠主线程提前排音符，一卡就断拍、补排的鼓点硬切进来＝「爆点」。
   * 现在页面一开就把每个剪影按显示尺寸画进一张带颜色的 canvas，摘掉遮罩——之后滑动只是平移一张现成的图，几乎不花主线程。
   * 烤好之前（几十毫秒）先用原来的遮罩顶着，看起来一模一样 */
  function bakeCoverBg() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    coverBgEl.querySelectorAll('.sil').forEach((el) => {
      const src = el.dataset.m;
      if (!src) return;
      const col = el.style.backgroundColor;
      const px = Math.min(1024, Math.round(Math.max(el.offsetWidth, 320) * dpr));
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = px;
        const g = cv.getContext('2d');
        try { g.drawImage(img, 0, 0, px, px); } catch (_) { return; }   // 画不出来就留着遮罩
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = col; g.fillRect(0, 0, px, px);
        cv.className = 'sil-bmp';
        el.style.background = 'none'; el.style.webkitMaskImage = el.style.maskImage = 'none';
        el.appendChild(cv);
      };
      // 2026-11-26 用户：经典 / 角色 / 组队的剪影发虚、只有百变清楚。那三个的 SVG 里用了 <mask> 挖眼睛 / 牌面，
      // Safari 画这种 SVG 时按它自己的 100×100 先栅格化遮罩、再拉大到 canvas 上（百变没有 <mask>，按矢量画所以清楚）。
      // 给根节点写死 width / height = 画布像素，遮罩就按最终尺寸栅格化
      img.src = src.replace('%3Csvg%20', '%3Csvg%20width%3D%22' + px + '%22%20height%3D%22' + px + '%22%20');   // data-m 是 encodeURIComponent 过的
    });
  }
  function coverBgPaint(c) {
    if (!coverReady || !coverLayers.length) return;
    if (c == null) c = track.scrollLeft + track.clientWidth / 2;
    const ctr = slides.map((sl) => sl.offsetLeft + sl.offsetWidth / 2);
    let p = 0;
    if (!track.clientWidth) p = modeIdx();
    else if (c <= ctr[0]) p = 0;
    else if (c >= ctr[ctr.length - 1]) p = ctr.length - 1;
    else for (let i = 0; i < ctr.length - 1; i++) if (c >= ctr[i] && c <= ctr[i + 1]) { p = i + (c - ctr[i]) / ((ctr[i + 1] - ctr[i]) || 1); break; }
    coverLayers.forEach((l, i) => {
      const o = Math.max(0, 1 - Math.abs(p - i)), dd = i - p;
      l.style.opacity = o.toFixed(3);
      l.style.visibility = o > 0 ? '' : 'hidden';   // 完全看不见的层不画
      l.style.setProperty('--px', dd.toFixed(3));
    });
  }
  /* ── 接着打上一局：小黄点 + 设置单里那张卡 ── */
  function coverResume() {
    if (!coverReady) return;
    const saved = loadSaved();
    const ZN = window.ZhamaoNet && window.ZhamaoNet.ENABLED ? window.ZhamaoNet : null;   // NET 在下面才声明，这里初始化时还用不了
    const sess = ZN && ZN.readSession();
    els.cover.querySelector('[data-cover="solo"]').classList.toggle('has-dot', !!saved);
    const ob = els.cover.querySelector('[data-cover="online"]');
    if (ob) ob.classList.toggle('has-dot', !!sess);
    coverResCard.hidden = coverResOr.hidden = !saved;
    sheets.solo.querySelector('[data-cover="start"] b').textContent = saved ? T('ui.newGame', '新开一局') : T('ui.start', '开始');
    if (!saved) return;
    const [, name, k] = SOLO_MODES[modeIdx(R.normalizeRules(saved.state.rules).mode)];
    // 2026-11-18 用户：卡上不写玩法 / 几人 / 牌堆剩几张（多余），左边小牌面就够认出是哪个玩法
    coverResCard.style.setProperty('--tone', ART.TONE[k].bg);
    coverResCard.style.setProperty('--band', ART.TONE[k].band);
    coverResCard.innerHTML = '<span class="cw">' + miniCard(k, name) + '</span><span class="tx"><b>' + T('ui.resumeLast', '接着打上一局') + '</b></span><i class="go" aria-hidden="true"></i>';
  }
  (function coverInit() {
    coverResCard = document.createElement('button');
    coverResCard.type = 'button'; coverResCard.className = 'zm-sheet-resume'; coverResCard.dataset.cover = 'resume-solo'; coverResCard.hidden = true;
    coverResOr = document.createElement('div');
    coverResOr.className = 'zm-on-or'; coverResOr.setAttribute('aria-hidden', 'true'); coverResOr.innerHTML = '<span>' + T('ui.or', '或') + '</span>'; coverResOr.hidden = true;
    sheets.solo.querySelector('.zm-solo-pick').before(coverResCard, coverResOr);   // 2026-11-19 用户：设置单顶上那行玩法牌删了（主页牌叠已经看得出是哪个玩法）
    coverReady = true;
    coverTitle(); coverBg(); coverResume();
  })();

  /* ═════════════ 联机（第二期，2026-11-12）═════════════
   * 服务器权威（backends/urge/lib/zhamao-room.js）：洗牌、校验、机器猫、超时都在服务器。网页只是「看」和「点」：
   *   · 座位旋转：自己永远是 0 号（坐下方），local = (server − base + n) % n；观战的人 base = 他坐在谁身后
   *   · 镜像牌局：game.state 是一份引擎形状的局面，看得见的牌是真的，看不见的（别人的手牌、牌堆）先用还没露面的牌号占着位。
   *     服务器每推来一步（同一个 act 的一组事件），先按事件改镜像（applyNet），再原样播单机那套动画（playEvents）。
   *     需要哪张牌露面时，就把它和占位的那张对调（putInHand / putTop），别人看不见的地方怎么摆都无所谓。
   *   · 一组播完、队列空了：拿镜像和服务器最新快照对一遍（sameAsSnapshot），对不上就按快照重摆（resync），不播动画
   *   · 我的操作（出牌 / 摸牌 / 作废 / 取消 / 给牌 / 塞回……）都发给服务器，等它推回事件再播；自己不先动 */
  const NET = window.ZhamaoNet && window.ZhamaoNet.ENABLED ? window.ZhamaoNet : null;
  let online = null;   // { code, token, st, base, n, matchNo, lastQueued, queue, playing, poll, pendingSrc, skew, inGame }
  const G = () => online && online.st && online.st.game;
  const locOf = (s) => (s == null || s < 0 || !online ? s : (s - online.base + online.n) % online.n);
  const srvOf = (l) => (l == null || l < 0 || !online ? l : (l + online.base) % online.n);
  const playerAt = (srvSeat) => online && online.st ? online.st.players.find((p) => p.seat === srvSeat && !(p.left && online.st.phase === 'lobby')) || null : null;
  const isHost = () => !!(online && online.st && online.st.hostId === online.st.me);
  /* 加机器猫用哪一档：上一次加 / 调过的那档（记在本机，换房间也接着用）；没调过 = 这桌最后一只机器猫的档，再没有就普通 */
  function botLevel(set) {
    const K = 'zm.botLevel';
    if (set) { try { localStorage.setItem(K, set); } catch (_) { /* */ } return set; }
    let v = null;
    try { v = localStorage.getItem(K); } catch (_) { /* */ }
    if (v && AI.TIERS.indexOf(v) >= 0) return v;
    const bots = online && online.st ? (online.st.players || []).filter((x) => x.isAi && !x.left) : [];
    return bots.length && AI.TIERS.indexOf(bots[bots.length - 1].aiLevel) >= 0 ? bots[bots.length - 1].aiLevel : 'normal';
  }
  function onlineRemain() {
    const g = G();
    if (!g || !g.deadline) return 0;
    const graceMs = g.graceMs != null ? g.graceMs : g.st.phase === 'react' ? 1200 : 3000;   // 服务器比网页多等的那一截（服务器发来的；老服务器没发就按以前的值）
    return Math.max(0, g.deadline - graceMs - (Date.now() + online.skew));
  }
  function toast(text) {
    let t = els.app.querySelector('.zm-toast');
    if (!t) { t = document.createElement('div'); t.className = 'zm-toast'; t.setAttribute('role', 'status'); els.app.appendChild(t); }
    t.textContent = text;
    t.classList.remove('is-on'); void t.offsetWidth; t.classList.add('is-on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ───── 镜像牌局 ───── */
  const ALL_IDS = Array.from({ length: R.DECK_SIZE }, (_, i) => i);
  const shuffled = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // o 已经是本地座位：{ n, rules, hand, counts, deckSize, kittens, discard, removed, known:[{pos,id}], handKnown, alive, outOrder, winner,
  //   turn, turnsLeft, phase, pending, give, pick, defuse, alter, steal, startDefuse, hideHand }
  function buildMirror(o) {
    const K = R.KIND_OF, n = o.n;
    const used = new Set(o.hand.concat(o.discard, o.removed, o.known.map((x) => x.id)));
    o.handKnown.forEach((h, i) => { if (i !== 0) h.forEach((id) => used.add(id)); });
    if (o.defuse && o.defuse.card != null) used.add(o.defuse.card);
    if (o.rescue && o.rescue.card != null) used.add(o.rescue.card);   // 组队：正在问队友救不救——那只炸弹猫摸出来了，不在牌堆里
    const fluxOn = !!(o.rules && o.rules.mode === 'flux');   // 经典房间不拿「百变」牌号当占位（服务器那副牌里可能根本没有这些号）
    const pool = shuffled(ALL_IDS.filter((id) => !used.has(id) && (!R.inSecondDeck(id) || R.usesSecondDeck(n)) && (fluxOn || R.KIND_OF[id] !== R.FLUX)));
    const take = (pred) => { const i = pool.findIndex(pred); return i >= 0 ? pool.splice(i, 1)[0] : null; };
    const hands = [];
    for (let i = 0; i < n; i++) {
      if (i === 0 && !o.hideHand) { hands.push(o.hand.slice()); continue; }
      const h = i === 0 ? [] : o.handKnown[i].slice();
      if (o.startDefuse && !h.some((id) => K[id] === R.DEFUSE)) { const d = take((id) => K[id] === R.DEFUSE); if (d != null) h.push(d); }
      while (h.length < o.counts[i]) { const x = take((id) => K[id] !== R.BOOM && K[id] !== R.DEFUSE) ?? take((id) => K[id] !== R.BOOM); if (x == null) break; h.push(x); }
      hands.push(R.sortHand(h));
    }
    const deck = Array(o.deckSize).fill(null);
    for (const k of o.known) if (k.pos < deck.length) deck[k.pos] = k.id;
    let booms = deck.filter((id) => id != null && K[id] === R.BOOM).length;
    const free = shuffled(deck.map((x, i) => (x == null ? i : -1)).filter((i) => i >= 0));
    for (const i of free) {
      let id = null;
      if (booms < o.kittens) { id = take((x) => K[x] === R.BOOM); if (id != null) booms++; }
      if (id == null) id = take((x) => K[x] !== R.BOOM);
      if (id == null) id = take(() => true);
      deck[i] = id;
    }
    const memo = Array.from({ length: n }, () => ({ deck: [], hands: Array.from({ length: n }, () => []) }));
    memo[0].deck = o.known.map((x) => x.id);
    memo[0].hands = o.handKnown.map((h, i) => (i === 0 ? [] : h.slice()));
    const p = o.pending;
    return {
      n, rules: o.rules, rs: (Math.random() * 4294967296) >>> 0 || 1,
      deck, discard: o.discard.slice(), removed: o.removed.slice(), hands, alive: o.alive.slice(), outOrder: o.outOrder.slice(),
      turn: o.turn, turnsLeft: o.turnsLeft, phase: o.phase,
      pending: p ? { by: p.by, type: p.type, cards: p.cards.slice(), target: p.target, named: p.named, nopes: p.nopes.map((x) => ({ seat: x.seat, card: x.card })), passed: [] } : null,
      give: o.give, pick: o.pick, defuse: o.defuse, save: o.save || null,
      alter: o.alter ? { by: o.alter.by, cards: o.alter.cards ? o.alter.cards.slice() : deck.slice(0, o.alter.count) } : null,
      steal: o.steal ? { by: o.steal.by, from: o.steal.from, perm: shuffled(hands[o.steal.from].slice()) } : null,
      winner: o.winner, seq: 0, memo, dir: o.dir === -1 ? -1 : 1,
      teams: o.teams ? o.teams.slice() : null, rescue: o.rescue || null, winnerTeam: o.winnerTeam != null ? o.winnerTeam : -1,
      noHelp: o.noHelp ? o.noHelp.slice() : o.teams ? Array(n).fill(false) : null,
      netBoom: o.rescue && o.rescue.card != null ? o.rescue.card : o.save && o.save.card != null ? o.save.card : null,   // 在「问救不救」时重连：不救出局时这只要进弃牌堆
      // 百变 / 角色猫（2026-11-19 联机）：都是公开的；还没抽到的规则堆不知道（镜像不自己抽规则，全听服务器的 flux 事件）
      flux: o.flux || null, fluxDeck: [], nineUsed: o.nineUsed ? o.nineUsed.slice() : null, saveUsed: o.saveUsed ? o.saveUsed.slice() : null,
      hotGiven: o.hotGiven != null ? o.hotGiven : -1, cowCut: o.cowCut != null ? o.cowCut : -1,
      roles: o.roles ? o.roles.slice() : null, roleUsed: o.roleUsed ? o.roleUsed.slice() : (o.roles ? o.roles.map(() => false) : null),
    };
  }
  // 服务器座位 → 本地座位
  const rotArr = (arr) => { const n = online.n, out = Array(n); for (let s = 0; s < n; s++) out[locOf(s)] = arr[s]; return out; };
  function mirrorFromSnapshot(g) {
    const st = g.st;
    const fixSeat = (x, keys) => { if (!x) return x; const o = Object.assign({}, x); keys.forEach((k) => { if (typeof o[k] === 'number') o[k] = locOf(o[k]); }); return o; };
    return buildMirror({
      n: g.n, rules: g.rules, hand: st.hand, counts: rotArr(st.counts), deckSize: st.deckSize, kittens: st.kittens,
      discard: st.discard, removed: st.removed, known: st.known, handKnown: rotArr(st.handKnown), alive: rotArr(st.alive),
      outOrder: st.outOrder.map(locOf), winner: locOf(st.winner), turn: locOf(st.turn), turnsLeft: st.turnsLeft, phase: st.phase, dir: st.dir,
      pending: st.pending ? Object.assign(fixSeat(st.pending, ['by', 'target']), { nopes: st.pending.nopes.map((x) => ({ seat: locOf(x.seat), card: x.card })) }) : null,
      give: fixSeat(st.give, ['from', 'to']), pick: fixSeat(st.pick, ['by']), defuse: fixSeat(st.defuse, ['by']), save: fixSeat(st.save, ['by']),
      alter: fixSeat(st.alter, ['by']), steal: fixSeat(st.steal, ['by', 'from']),
      teams: st.teams ? rotArr(st.teams) : null, rescue: st.rescue ? Object.assign({ for: locOf(st.rescue.for), card: st.rescue.card, mates: (st.rescue.mates || (st.rescue.by != null ? [st.rescue.by] : [])).map(locOf), wait: g.myCall && st.phase === 'rescue' ? [0] : [] }, st.rescue.refused ? { refused: true } : null) : null, winnerTeam: st.winnerTeam,
      noHelp: st.noHelp ? rotArr(st.noHelp) : null,
      flux: st.flux, nineUsed: st.nineUsed ? rotArr(st.nineUsed) : null, saveUsed: st.saveUsed ? rotArr(st.saveUsed) : null,
      hotGiven: st.hotGiven != null && st.hotGiven >= 0 ? locOf(st.hotGiven) : -1, cowCut: st.cowCut != null && st.cowCut >= 0 ? locOf(st.cowCut) : -1,
      roles: st.roles ? rotArr(st.roles) : null, roleUsed: st.roleUsed ? rotArr(st.roleUsed) : null,
      hideHand: !!game.hideHand,
    });
  }
  function mirrorFromDeal(g, e) {
    const n = g.n;
    return buildMirror({
      // 开局人人张数一样：经典 / 角色 5 张（4 + 逗猫棒），百变多白送一张「百变」= 6 张（看自己的手牌最准；观战没有手牌就按玩法算）
      n, rules: g.rules, hand: e.hand || [], counts: Array(n).fill(e.hand && e.hand.length ? e.hand.length : 5 + (g.rules && g.rules.mode === 'flux' ? 1 : 0)), deckSize: e.deckSize, kittens: e.kittens,
      discard: [], removed: e.removed || [], known: [], handKnown: Array.from({ length: n }, () => []), alive: Array(n).fill(true),
      outOrder: [], winner: -1, turn: e.turn, turnsLeft: 1, phase: 'act', pending: null, give: null, pick: null, defuse: null, alter: null, steal: null,
      startDefuse: true, hideHand: !!game.hideHand, teams: g.st && g.st.teams ? rotArr(g.st.teams) : null,
      // 角色开局就定了、整局不变：快照里的就是发牌那一刻的；百变开局还没有规则，九命 / 急救都没用过
      roles: g.st && g.st.roles ? rotArr(g.st.roles) : null,
      nineUsed: g.rules && g.rules.mode === 'flux' ? Array(n).fill(false) : null,
    });
  }
  const ROT_KEYS = ['seat', 'target', 'from', 'to', 'a', 'b', 'who', 'turn', 'by', 'for'];   // by / for：组队救人（askRescue / noRescue）
  function rotEvent(e) {
    const o = Object.assign({}, e);
    for (const k of ROT_KEYS) if (typeof o[k] === 'number' && o[k] >= 0) o[k] = locOf(o[k]);
    if (Array.isArray(o.mates)) o.mates = o.mates.map(locOf);   // 组队求救：同时被问的几个队友
    return o;
  }
  // 让 id 出现在 seat 手里：和他手里一张「我不知道是什么」的占位牌对调
  function locate(s, id) {
    const d = s.deck.indexOf(id);
    if (d >= 0) return { arr: s.deck, i: d };
    for (const h of s.hands) { const i = h.indexOf(id); if (i >= 0) return { arr: h, i }; }
    return null;
  }
  // keep：这一步一起亮出来的几张（换替身时别把刚放进来的又换出去）
  function putInHand(s, seat, id, keep) {
    const h = s.hands[seat];
    if (h.indexOf(id) >= 0) return;
    const from = locate(s, id);
    const kn = s.memo[0].hands[seat] || [];
    let vi = -1;
    // 0 号座位是我自己的真牌，不能换——除非我在观战、看不到这家的牌（hideHand：那也全是占位）
    const ph = seat !== 0 || !!game.hideHand;
    for (let i = 0; i < h.length; i++) if (ph && kn.indexOf(h[i]) < 0 && R.KIND_OF[h[i]] !== R.BOOM && !(keep && keep.indexOf(h[i]) >= 0)) { vi = i; break; }
    // 都是「我记得他有」的牌：那份记忆过期了（那张早被他私下给出 / 被偷走，我看不到是哪张，服务器那边早忘了）——换掉一张记着的，别从别人手里白扣一张
    if (vi < 0 && ph) for (let i = 0; i < h.length; i++) if (R.KIND_OF[h[i]] !== R.BOOM && !(keep && keep.indexOf(h[i]) >= 0)) { vi = i; const j = kn.indexOf(h[i]); if (j >= 0) kn.splice(j, 1); break; }
    if (vi < 0) { if (from) from.arr.splice(from.i, 1); h.push(id); return; }
    const victim = h[vi];
    h[vi] = id;
    if (from) from.arr[from.i] = victim;
  }
  // 让牌堆顶第 k 张是 id
  function putTop(s, k, id) {
    if (s.deck[k] === id) return;
    const from = locate(s, id);
    // 换出去的那张要进别人手里时不能是炸弹猫（手里不会有炸弹猫，牌堆里的炸弹猫数也会对不上）：先在牌堆里和一张普通占位对调
    if (from && from.arr !== s.deck && R.KIND_OF[s.deck[k]] === R.BOOM) {
      const kn = s.memo[0].deck;
      const ok = (x, i) => R.KIND_OF[x] !== R.BOOM && kn.indexOf(x) < 0 && x !== id;
      let j = s.deck.findIndex((x, i) => i > k && ok(x, i));   // 先往下找：上面几张可能刚摆好
      if (j < 0) j = s.deck.findIndex((x, i) => i !== k && ok(x, i));   // 摸的是最底下那张（抽底）：往上找
      if (j >= 0) { const x = s.deck[k]; s.deck[k] = s.deck[j]; s.deck[j] = x; }
    }
    const victim = s.deck[k];
    if (!from) { s.deck[k] = id; return; }
    s.deck[k] = id;
    from.arr[from.i] = victim;
  }
  // 牌堆顶要是一张不是炸弹猫的（别人摸走了、没炸）：顶上是占位的炸弹猫就和下面一张普通的占位对调
  function topNotBoom(s, at) {
    at = at || 0;
    if (R.KIND_OF[s.deck[at]] !== R.BOOM) return;
    const kn = s.memo[0].deck;
    for (let j = 0; j < s.deck.length; j++) if (j !== at && R.KIND_OF[s.deck[j]] !== R.BOOM && kn.indexOf(s.deck[j]) < 0) { const x = s.deck[at]; s.deck[at] = s.deck[j]; s.deck[j] = x; return; }
  }
  const takeAny = (s, seat, avoid) => { const h = s.hands[seat], kn = s.memo[0].hands[seat] || []; let i = h.findIndex((id) => kn.indexOf(id) < 0 && (!avoid || R.KIND_OF[id] !== avoid)); if (i < 0) i = h.length - 1; return h.splice(i, 1)[0]; };
  const forget = (s, id) => { for (const h of s.memo[0].hands) { const i = h.indexOf(id); if (i >= 0) h.splice(i, 1); } };
  function moveTo(s, to, id) { s.hands[to].push(id); s.hands[to] = R.sortHand(s.hands[to]); }
  // 按一条（已经转成本地座位的）事件改镜像——照着 zhamao-rules.js 里对应的那段写
  function applyNet(s, e) {
    const K = R.KIND_OF;
    switch (e.t) {
      case 'play': {
        for (const id of e.cards) putInHand(s, e.seat, id, e.cards);
        for (const id of e.cards) { const h = s.hands[e.seat]; h.splice(h.indexOf(id), 1); s.discard.push(id); forget(s, id); }
        s.seq += 1;
        s.pending = { by: e.seat, type: e.type, cards: e.cards.slice(), target: e.target, named: e.named, nopes: [], passed: [] };
        s.phase = 'react';
        break;
      }
      case 'nope': {
        putInHand(s, e.seat, e.card);
        const h = s.hands[e.seat]; h.splice(h.indexOf(e.card), 1); s.discard.push(e.card); forget(s, e.card);
        if (s.pending) { s.pending.nopes.push({ seat: e.seat, card: e.card }); s.pending.passed = []; }
        s.seq += 1;
        break;
      }
      case 'resolve': s.pending = null; s.phase = 'act'; break;
      case 'turn': {
        s.turn = e.seat; s.turnsLeft = e.turnsLeft; s.phase = 'act';
        // 扛锅猫 / 烫手的记账跟着 zhamao-rules.js 走（界面不靠它，留着让镜像和服务器的局面一致）
        if (e.hot) s.hotGiven = e.hot === 'on' ? e.seat : -1;
        else if (e.attacked) { s.hotGiven = -1; if (s.cowCut !== e.seat) s.cowCut = -1; }
        else { s.cowCut = -1; s.hotGiven = s.flux === 'hot' ? e.seat : -1; }
        break;
      }
      case 'reverse': s.dir = e.dir === -1 ? -1 : 1; break;
      case 'flux': {
        s.flux = e.rule; s.dir = e.dir === -1 ? -1 : 1;
        // 九命 / 急救：「每人最多一次」按每次转到这条算——转到就重置（同 zhamao-rules.js）
        if (e.rule === 'nine') s.nineUsed = Array(s.n).fill(false);
        if (e.rule === 'catsave') s.saveUsed = Array(s.n).fill(false);
        break;
      }
      case 'role': {
        // 角色猫：胆小猫被甩锅偷看顶上 3 张（是我才有 cards）；扛锅猫这一串只摸 1 张（后面的 turn 事件会带上 turnsLeft）
        if (e.role === 'timid' && e.cards) { e.cards.forEach((id, j) => putTop(s, j, id)); e.cards.forEach((id) => { if (s.memo[0].deck.indexOf(id) < 0) s.memo[0].deck.push(id); }); }
        if (e.role === 'cow') { s.turnsLeft = 1; s.cowCut = e.seat; }
        break;
      }
      case 'shuffle': shuffled(s.deck); s.memo[0].deck = []; break;
      case 'future': case 'alter': {
        const k = e.cards ? e.cards.length : e.count;
        if (e.cards) { e.cards.forEach((id, j) => putTop(s, j, id)); e.cards.forEach((id) => { if (s.memo[0].deck.indexOf(id) < 0) s.memo[0].deck.push(id); }); }
        if (e.t === 'alter') { s.phase = 'alter'; s.alter = { by: e.seat, cards: s.deck.slice(0, k) }; }
        break;
      }
      case 'altered': {
        if (e.cards) e.cards.forEach((id, j) => putTop(s, j, id));
        else s.memo[0].deck = s.memo[0].deck.filter((id) => (s.alter ? s.alter.cards.indexOf(id) < 0 : true));
        s.alter = null; s.phase = 'act';
        break;
      }
      case 'swap': {
        const keepOf = (seat) => s.hands[seat].filter((id) => K[id] === R.DEFUSE);
        let mA, mB;
        if (e.cardsA) { e.cardsA.forEach((id) => putInHand(s, e.a, id, e.cardsA)); mA = e.cardsA.slice(); } else mA = s.hands[e.a].filter((id) => K[id] !== R.DEFUSE).slice(0, e.toB);
        if (e.cardsB) { e.cardsB.forEach((id) => putInHand(s, e.b, id, e.cardsB)); mB = e.cardsB.slice(); } else mB = s.hands[e.b].filter((id) => K[id] !== R.DEFUSE).slice(0, e.toA);
        // 别人的占位手牌可能凑不出这么多「不是逗猫棒」的：从剩下的里补
        while (mA.length < e.toB && s.hands[e.a].length > mA.length) mA.push(s.hands[e.a].find((id) => mA.indexOf(id) < 0));
        while (mB.length < e.toA && s.hands[e.b].length > mB.length) mB.push(s.hands[e.b].find((id) => mB.indexOf(id) < 0));
        const restA = s.hands[e.a].filter((id) => mA.indexOf(id) < 0), restB = s.hands[e.b].filter((id) => mB.indexOf(id) < 0);
        void keepOf;
        s.hands[e.a] = R.sortHand(restA.concat(mB)); s.hands[e.b] = R.sortHand(restB.concat(mA));
        for (const id of mA.concat(mB)) forget(s, id);
        break;
      }
      case 'askGive': s.phase = 'give'; s.give = { from: e.from, to: e.to }; break;
      case 'give': {
        let id = e.card;
        if (id != null) { putInHand(s, e.from, id); const h = s.hands[e.from]; h.splice(h.indexOf(id), 1); } else id = takeAny(s, e.from);
        moveTo(s, e.to, id);
        s.give = null; s.phase = 'act';
        break;
      }
      case 'askSteal': s.phase = 'steal'; s.steal = { by: e.by, from: e.from, perm: shuffled(s.hands[e.from].slice()) }; break;
      case 'steal': {
        let id = e.card;
        if (id != null) { putInHand(s, e.from, id); const h = s.hands[e.from]; h.splice(h.indexOf(id), 1); } else id = takeAny(s, e.from);
        moveTo(s, e.to, id);
        s.steal = null; s.phase = 'act';
        break;
      }
      case 'take': { putInHand(s, e.from, e.card); const h = s.hands[e.from]; h.splice(h.indexOf(e.card), 1); moveTo(s, e.to, e.card); forget(s, e.card); break; }
      case 'miss': break;
      case 'askPick': s.phase = 'pick'; s.pick = { by: e.seat }; break;
      case 'pick': { const i = s.discard.indexOf(e.card); if (i >= 0) s.discard.splice(i, 1); moveTo(s, e.seat, e.card); s.pick = null; s.phase = 'act'; break; }
      case 'draw': {
        const at = e.bottom ? s.deck.length - 1 : 0;
        if (e.card != null) putTop(s, at, e.card); else topNotBoom(s, at);
        const id = e.bottom ? s.deck.pop() : s.deck.shift();
        const kd = s.memo[0].deck.indexOf(id); if (kd >= 0) s.memo[0].deck.splice(kd, 1);
        moveTo(s, e.seat, id);
        if (e.seen && e.seat !== 0 && s.memo[0].hands[e.seat] && s.memo[0].hands[e.seat].indexOf(id) < 0) s.memo[0].hands[e.seat].push(id);   // 百变「掀顶」：摸走的是翻着的那张，大家都知道进了他手里
        s.seq += 1;
        break;
      }
      case 'boom': {
        putTop(s, e.bottom ? s.deck.length - 1 : 0, e.card);
        if (e.bottom) s.deck.pop(); else s.deck.shift();
        const kd = s.memo[0].deck.indexOf(e.card); if (kd >= 0) s.memo[0].deck.splice(kd, 1);
        s.netBoom = e.card;
        s.seq += 1;
        break;
      }
      case 'askRescue': {   // 组队：同时问活着的队友（老服务器只发 by = 一个个问）；等不等我 = 我是不是队友、手里有没有逗猫棒
        const mates = e.mates || (e.by != null ? [e.by] : []);
        s.phase = 'rescue';
        s.rescue = e.refused ? { for: e.for, card: s.netBoom, mates: mates.slice(), wait: [], refused: true } : { for: e.for, card: s.netBoom, mates: mates.slice(), wait: mates.indexOf(0) >= 0 && R.countKind(s.hands[0], R.DEFUSE) > 0 ? [0] : [] };
        break;
      }
      case 'noRescue': break;
      case 'save': s.phase = 'save'; s.save = { by: e.seat, card: e.kitten != null ? e.kitten : s.netBoom }; break;
      case 'noSave': s.save = null; s.seq += 1; break;   // 急救点了「取消」：接着的 askRescue / out 照常   // 急救：摸到炸弹猫的人在挑哪一对
      case 'defuse': {
        const src = e.rescue && e.from != null ? e.from : e.seat;   // 组队救人：逗猫棒是队友出的
        putInHand(s, src, e.card);
        const h = s.hands[src]; h.splice(h.indexOf(e.card), 1); s.discard.push(e.card); forget(s, e.card);
        s.rescue = null; s.save = null;
        // 百变「急救」：另一张也交出去（以前镜像里漏了这张，手牌 / 弃牌堆对不上，联机每次急救都要整桌重同步）
        if (e.extra != null) { putInHand(s, e.seat, e.extra); const h2 = s.hands[e.seat]; h2.splice(h2.indexOf(e.extra), 1); s.discard.push(e.extra); forget(s, e.extra); }
        if (e.save === 'cats') { if (!s.saveUsed) s.saveUsed = Array(s.n).fill(false); s.saveUsed[e.seat] = true; }
        s.phase = 'defuse'; s.defuse = { by: e.seat, card: e.kitten }; s.netBoom = null;
        break;
      }
      case 'nine': {
        // 九命 / 急救：炸弹猫随机塞回牌堆（2026-11-17：镜像以前没这一步，牌堆少一只，联机每次都要整桌重同步）。位置按公开的粗略高度放
        const id = e.card != null ? e.card : s.defuse ? s.defuse.card : s.netBoom;
        // 2026-11-26 起（pick）：喊完九命进入塞回阶段，等他自己挑位置（之后的 insert 事件才放进牌堆）
        if (e.pick) { if (!s.nineUsed) s.nineUsed = Array(s.n).fill(false); s.nineUsed[e.seat] = true; s.phase = 'defuse'; s.defuse = { by: e.seat, card: id }; s.netBoom = null; break; }
        const n = s.deck.length, pos = e.vis == null ? (Math.random() * (n + 1)) | 0 : Math.round(e.vis * n);
        if (id != null) s.deck.splice(Math.max(0, Math.min(n, pos)), 0, id);
        s.memo[0].deck = s.memo[0].deck.filter((x) => x !== id);
        if (e.why !== 'save') { if (!s.nineUsed) s.nineUsed = Array(s.n).fill(false); s.nineUsed[e.seat] = true; }   // 九命这一轮他用过了
        s.defuse = null; s.netBoom = null; s.seq += 1;
        break;
      }
      case 'insert': {
        // 别人塞的：服务器把牌号和位置都藏了（只给他自己），可是是哪只炸弹猫大家早看见了（defuse 事件里的 kitten）；位置随便放
        const id = e.card != null ? e.card : s.defuse ? s.defuse.card : null;
        // 百变「火眼」：服务器给别人的事件去掉了牌号（e.card），可塞的是哪只大家都看见了——补回去，动画要正面朝上画这张牌
        // （2026-11-26 用户：联机火眼别人塞回就卡死——以前 cardHtml(undefined) 抛错，事件队列整个堵死）
        if (e.card == null && e.at != null && id != null) e.card = id;
        const pos = e.pos != null ? e.pos : e.at != null ? e.at : (Math.random() * (s.deck.length + 1)) | 0;
        s.deck.splice(Math.max(0, Math.min(s.deck.length, pos)), 0, id);
        // 随机塞的：我自己（和队友）也不知道在哪；组队：队友挑位置塞的我也知道；百变「火眼」（at）：人人都看见塞在第几张，原先记的也不乱
        if (e.at != null) { if (s.memo[0].deck.indexOf(id) < 0) s.memo[0].deck.push(id); }
        else if (!e.rand && (e.seat === 0 || (e.pos != null && R.isTeam(s) && R.teamOf(s, e.seat) === R.teamOf(s, 0)))) { if (s.memo[0].deck.indexOf(id) < 0) s.memo[0].deck.push(id); } else if (e.seat !== 0) s.memo[0].deck = [];
        s.defuse = null; s.seq += 1;
        break;
      }
      case 'out': {
        const cards = e.cards || [];
        cards.forEach((id) => putInHand(s, e.seat, id, cards));
        s.alive[e.seat] = false; s.outOrder.push(e.seat);
        s.hands[e.seat] = [];
        for (const id of cards) { s.discard.push(id); forget(s, id); }
        if (s.netBoom != null) { s.discard.push(s.netBoom); s.netBoom = null; }
        s.memo[0].hands[e.seat] = [];
        s.turnsLeft = 1;
        break;
      }
      case 'win': s.phase = 'over'; s.winner = e.seat; if (e.team != null) s.winnerTeam = e.team; break;
    }
    // 百变「掀顶」：服务器在每一步最后一条事件上挂着这一步完了牌堆顶是哪张（公开）——镜像把它摆到顶上，牌堆顶就翻对了
    if (e.top != null && s.deck.length) putTop(s, 0, e.top);
  }
  // 镜像和服务器快照对得上吗（只比看得见的东西）
  let driftWhy = '';   // 上一次对不上的是哪一项（只用来打日志，方便查是哪种事件没镜像对）
  function sameAsSnapshot() {
    const g = G(), s = game.state;
    if (!g || !s) return true;
    const st = g.st, sameArr = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const counts = rotArr(st.counts), alive = rotArr(st.alive);
    const bad = (why) => { driftWhy = why; return false; };
    if (s.deck.length !== st.deckSize || R.kittensInDeck(s) !== st.kittens) return bad('deck ' + s.deck.length + '/' + st.deckSize + ' kittens ' + R.kittensInDeck(s) + '/' + st.kittens);
    if (!sameArr(s.hands.map((h) => h.length), counts) || !sameArr(s.alive, alive)) return bad('counts ' + s.hands.map((h) => h.length) + ' / ' + counts);
    if (!sameArr(s.discard, st.discard)) return bad('discard ' + s.discard.length + '/' + st.discard.length);
    if (st.flux !== undefined && (s.flux || null) !== (st.flux || null)) return bad('flux ' + s.flux + '/' + st.flux);   // 百变规则牌对不上
    if (!game.hideHand && !sameArr(R.sortHand(s.hands[0].slice()), R.sortHand(st.hand.slice()))) return bad('hand');
    if (s.phase !== st.phase || (st.phase !== 'over' && (s.turn !== locOf(st.turn) || s.turnsLeft !== st.turnsLeft))) return bad('phase ' + s.phase + '/' + st.phase + ' turn ' + s.turn + '/' + locOf(st.turn) + ' left ' + s.turnsLeft + '/' + st.turnsLeft);
    return true;
  }


  // 我坐在哪一家身后：观战的人 = 他选的那家；出局后换过视角 = 那一家；平常 = 自己的座位
  const viewBase = (st) => (st.spectator ? st.viewSeat : st.viewSeat >= 0 ? st.viewSeat : st.mySeat);
  // 每一家头像现在在哪（key：不随视角变的编号）
  function spotsBy(key) {
    const out = {};
    if (game && game.state) for (let l = 0; l < game.state.n; l++) { const a = avEl(l); if (a) out[key(l)] = fx.center(a.getBoundingClientRect()); }
    return out;
  }
  const seatSpots = () => spotsBy(srvOf);
  /* 换完视角按现在的局面补回那些「挂着」的东西（2026-11-17 用户：要和被看那家屏幕上一模一样）：
   * 出了要指人的牌、还在等作废 → 准星 + 桌沿连线；被索要 → 粉准星 + 连线；在挑偷哪张 → 准星 + 连线；摸到炸弹猫在塞回去 → 头像变炸弹猫 */
  function restoreAim() {
    const s = game && game.state;
    if (!s || game.dealing) return;
    if (game.arrow) { game.arrow.remove(); game.arrow = null; }
    releaseRim();
    if (s.phase === 'react' && s.pending) {
      const p = s.pending, tg = targetOf(p), atk = p.type === R.ATTACK || p.type === R.TATTACK;
      if (tg >= 0) {
        game.arrow = aim(tg, cardHue(p));
        game.rimLk = rimLink(p.by, tg, atk, cardHue(p));
      }
    } else if (s.phase === 'give' && s.give) {
      // 索要 / 偷牌进到「等他挑一张」这一步时，出牌那会儿伸出去的桌沿连线还挂着（等牌飞过来才收）——换视角也得按新座位接着连上
      // （2026-11-26 用户截图：观战时切视角，右边开阳向左边木木子索要，中间那条线没了）
      const fat = s.roles && R.roleOf(s, s.give.to) === 'fat' && s.give.left === 1;
      game.arrow = aim(s.give.from, '#e0566e');
      game.rimLk = rimLink(s.give.to, s.give.from, false, fat ? (ART.ROLE_TONE.fat || {}).band || '#d27a36' : '#e0566e');
    } else if (s.phase === 'steal' && s.steal) {
      game.arrow = aim(s.steal.from, '#c9a96e');
      game.rimLk = rimLink(s.steal.by, s.steal.from, false, '#c9a24a');
    }
    else if (s.phase === 'defuse' && s.defuse) bombAvatar(s.defuse.by, true);
    else if (s.phase === 'save' && s.save) bombAvatar(s.save.by, true);
  }
  /* 换视角的「转桌」（联机 / 单机共用）：每一家的座位从原来的位置滑到新位置（被看的人从上面滑到下面），手牌淡进来；
   * key(本地座位) = 这一家不随视角变的编号（联机 = 服务器座位，单机 = 原来的座位号）。滑完再补上准星 / 桌沿连线 */
  function turnTable(before, key) {
    key = key || srvOf;
    if (fx.reduce() || !game || !game.state) { restoreAim(); return; }
    const slides = [];
    for (let l = 0; l < game.state.n; l++) {
      const box = seatEl(l), a = avEl(l), old = before[key(l)];
      if (!box || !a || !old) continue;
      const now = fx.center(a.getBoundingClientRect());
      const dx = old.x - now.x, dy = old.y - now.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      /* 用单独的 translate 属性滑，叠在座位自己的 transform 上（2026-11-17 用户：换视角时顶上一瞬间变直、过一会儿又拱回来）——
       * 6 人以上对手排成弧，靠的是 .is-arc 座位上的 transform: translateY(--dy)；以前滑动动画也写 transform，把这截下沉整个盖掉，
       * 滑的半秒里整排变平、桌沿也按平的量，滑完才突然弯回去 */
      slides.push(box.animate([{ translate: dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px' }, { translate: '0px 0px' }], { duration: 460, easing: 'cubic-bezier(.3,.75,.3,1)' }).finished.catch(() => {}));
    }
    /* 2026-11-15 朋友局截图：出局后点别人的视角，桌沿弯成一道横贯全桌的大弧、方向箭头歪到一边，过一会儿才好。
     * 原因：头像正从旧位置滑向新位置时，箭头 / 桌沿在下一帧就按头像「此刻」的位置重量了——上排有一家还停在底下，顶边拟合成一条往下兜的抛物线，
     * 又因为「形状没变就不重画」被缓存住，要等别的东西触发重画才恢复。现在滑动期间不量，滑完再按最终位置画一次 */
    if (slides.length) {
      const k = (tableTurning = (tableTurning || 0) + 1);
      Promise.all(slides).then(() => { if (tableTurning === k) { tableTurning = 0; if (game && game.state) { renderDir(); restoreAim(); } } });
    } else restoreAim();
    els.hand.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 160, easing: 'ease-out', fill: 'backwards' });
    snd('flip');
  }
  // 观战时点一家：坐到他身后（出局的人点自己头像回到自己座位）
  function onlineView(srvSeat) {
    if (!online || online.viewing) return;
    online.viewing = true;
    onlineAct('view', { seat: srvSeat }).finally(() => { if (online) online.viewing = false; });
  }
  // 看不到被看那家的手牌时，手牌那一栏写一句为什么
  function watchNote() {
    if (!game || !game.online || !game.spectator || !game.hideHand || !online || !online.st) return '';
    const st = online.st, p = playerAt(online.base);
    if (!p) return '';
    if (!game.state.alive[0]) return '';
    if (!p.isAi && !p.left) return T('ui.watch.noReveal', 'TA 没开「观战者能看我的手牌」');
    if (st.spectator) return T('ui.watch.spectator', '只观战看不到机器猫的牌');
    const me = myPlayer();
    return me && me.showHand ? T('ui.watch.closed', '这局中途关过「观战者能看我的手牌」，看不到机器猫的牌') : T('ui.watch.need', '开局时就开着「观战者能看我的手牌」、中途没关过，才看得到机器猫的牌');
  }

  /* ───── 收到服务器状态 ───── */
  /* 网络一来一回要多久（毫秒；还没量到就按 0.5 秒算）——国内 / 走 VPN 的朋友常常 0.5–1.5 秒（2026-11-14） */
  const netRtt = () => { const r = NET && NET.rtt ? NET.rtt() : null; return r == null ? 500 : r; };
  // rttMs：这份状态是动作请求带回来的，就用这一次实际量到的来回；长轮询回来的用平时估的来回
  function onState(st, rttMs) {
    if (!online || !st) return;
    if (online.st && st.version < online.st.version) return;   // 旧的（长轮询和动作回应赛跑）
    // 服务器时间 = 它发出时的 serverNow + 路上那半程；以前没加这半程，网慢的人看到的倒计时比服务器的晚结束，
    // 最后一刻点的作废 / 出牌到服务器时窗口已经关了（2026-11-14 国内朋友）
    online.skew = st.serverNow + (rttMs != null ? rttMs : netRtt()) / 2 - Date.now();
    const prev = online.st;
    online.st = st;
    if (st.phase === 'lobby') { enterLobby(st, prev); checkShort(st); return; }
    const g = st.game;
    if (!g) return;
    const base = viewBase(st);
    if (!game || !game.online || game.matchNo !== g.matchNo || online.base !== base || online.n !== g.n) {
      // 观战换了一家：桌子转过去（先记下每一家头像现在在哪，重摆之后从旧位置滑到新位置）
      const turning = game && game.online && game.matchNo === g.matchNo && online.n === g.n && online.base !== base ? seatSpots() : null;
      // 一局打完后房主把自己和别人对调：桌子跟着转（我还在下面），排行榜别重新弹
      keepFinish = turning && game.finishShown === g.matchNo ? g.matchNo : -1;
      enterGame(st, !!(prev && (prev.phase === 'lobby' || (prev.game && prev.game.matchNo !== g.matchNo))));   // 房主点「下一局」直接开：也从发牌播起
      if (editing.flip && editing.flip.where === 'table') afterEditRender('table');
      else { if (turning) turnTable(turning); if (editing.on) applyEdit(false); }
      return;
    }
    syncPeople(st);
    syncNoHelp(g);
    syncOnlinePause(g);
    if (editing.on || editing.flip) { renderDir(); afterEditRender('table'); }
    if (editing.on && editing.where === 'table' && !g.over) exitEdit();
    const fresh = g.log.filter((e) => e.n > online.lastQueued);
    if (fresh.length && fresh[0].n !== online.lastQueued + 1 && online.lastQueued < g.seq) { resync(); return; }
    if (!fresh.length) {
      // 房间没变（长轮询 20 秒空回一次 / 有人上线下线）：只更新头像上的「掉线 / 托管」，别动我正在选的牌、正在指的人、抬着的作废——
      // 以前每次都走 onlineIdle，把 mode / selected 清掉（2026-11-16 四人实测：选好要指人的牌、点出牌后牌又回到手里；用户和朋友玩时「作废点不起来」）
      const pg = prev && prev.game;
      const calm = pg && pg.seq === g.seq && pg.myCall === g.myCall && pg.deadline === g.deadline && pg.over === g.over && String(pg.auto) === String(g.auto);
      if (calm) { for (let l = 0; l < online.n; l++) renderSeat(l); return; }   // 观战的人进出 / 有人上下线 / 房主禁言这类：牌局本身没动
      if (!online.playing && !busyLocal()) onlineIdle();
      return;
    }
    online.lastQueued = fresh[fresh.length - 1].n;
    // 我正被问作废、局面已经往前走了（多半是别人先出了作废）：作废键马上收起，等动画播到再重新问我
    if (reactOpen && game.state.phase === 'react') { clearTimeout(reactAuto); reactOpen = false; stopFuse(); renderBand(); renderHand({ flip: false }); }
    earlyPass(g);
    for (const raw of fresh) {
      const e = rotEvent(raw);
      const last = online.queue[online.queue.length - 1];
      if (last && last[0].act === e.act) last.push(e); else online.queue.push([e]);
    }
    pumpQueue();
  }
  const busyLocal = () => !!(game && game.dealing);
  // 名字 / 头像 / 机器猫档位 / 离开代打
  function syncPeople(st) {
    if (!game) return;
    const was = game.bots.slice(), wasPid = (game.pids || []).slice();
    game.pids = [];
    for (let l = 0; l < online.n; l++) {
      const p = playerAt(srvOf(l));
      game.bots[l] = p ? { nick: p.nick, avatar: p.avatar } : { nick: '?', avatar: null };
      game.pids[l] = p ? p.id : null;
      game.tiers[l] = p && p.isAi ? p.aiLevel : null;
      game.tags[l] = p && !p.isAi ? (p.left ? T('ui.tag.covered', '代打') : !p.online ? T('ui.tag.offline', '掉线') : (st.game && st.game.auto[srvOf(l)] ? T('ui.tag.auto', '托管') : '')) : '';
    }
    if (game.state) for (let l = 0; l < online.n; l++) {
      const o = was[l], b = game.bots[l];
      // 座位上换了个人（房主在一局打完后调了座位）：整个座位重画，头像按人从旧位置滑过来（afterEditRender），不当成改名
      if (wasPid.length && wasPid[l] !== game.pids[l]) { const box = seatEl(l); if (box) { box.innerHTML = ''; renderSeat(l); } continue; }
      if (els.app.dataset.uivRename && o && b && o.nick !== '?' && (o.nick !== b.nick || o.avatar !== b.avatar)) { renameFx(l, o); continue; }
      const box = seatEl(l); if (box) { const nm = box.querySelector('.zm-name'); if (nm) nm.textContent = nameOf(l); }
    }
  }
  // fromLobby：在大厅里看着开局的 → 从发牌开始播；中途进来 / 刷新回来的 → 直接按快照摆好
  function enterGame(st, fromLobby) {
    const g = st.game;
    if (editing.on && editing.where === 'lobby') exitEdit();   // 房间页编辑着就开局了：编辑条别留在牌桌上
    resetTable();
    els.cover.hidden = true;
    hideLobby();
    online.base = viewBase(st);
    online.n = g.n;
    online.queue = []; online.playing = false;
    viewSeat = -1; els.app.classList.remove('is-watching');
    autopilot = false; timeouts = 0; els.me.classList.remove('is-auto');
    tut = null;
    // 观战（纯观战，或出局后坐到别人身后）：下面那家是被看的人，我什么也不用做
    const watching = !!st.spectator || (st.mySeat >= 0 && online.base !== st.mySeat);
    game = { online: true, matchNo: g.matchNo, turnSec: g.turnSec, state: null, bots: [], tiers: [], tags: [], tutorial: false, spectator: watching, hideHand: watching && !(g.st.hand && g.st.hand.length) };
    els.app.classList.toggle('is-spectator', watching || !g.st.alive[st.mySeat]);
    els.me.classList.toggle('is-watched', watching);
    if (WAL && WAL.tableStart) WAL.tableStart(game);
    syncPeople(st);
    bgm('game');
    const deal = g.log.find((e) => e.t === 'deal');
    if (fromLobby && deal && !g.over && g.log[0] === deal) {
      // 从头播：按发牌那一刻摆好，发牌动画走一遍，再一步步播到现在
      game.state = mirrorFromDeal(g, rotEvent(deal));
      online.lastQueued = deal.n;
      buildSeats(); solveSize();
      const rest = g.log.filter((e) => e.n > deal.n);
      if (rest.length) { online.lastQueued = rest[rest.length - 1].n; for (const raw of rest) { const e = rotEvent(raw); const last = online.queue[online.queue.length - 1]; if (last && last[0].act === e.act) last.push(e); else online.queue.push([e]); } }
      online.queue.unshift([Object.assign({ t: 'dealIntro' })]);
      pumpQueue();
      return;
    }
    game.state = mirrorFromSnapshot(g);
    if (!game.state.alive[0]) game.fastOut = true;   // 按快照直接摆（进房 / 重摆）时我已经出局：没有出局动画可等
    online.lastQueued = g.seq;
    buildSeats(); solveSize();
    renderAll();
    onlineIdle();
  }
  // 对不上 / 断档：按快照重摆，不播动画
  function resync() {
    const g = G();
    if (!g || !game || !game.online) return;
    token++;
    online.queue = []; online.playing = false; online.behind = false;
    // 发牌动画播到一半被重摆打断：dealIntro 看到 token 变了就提前返回，没人把 dealing 放下——之后 onlineIdle 一直早退，整局卡死（2026-11-14 测出来的）
    game.dealing = false;
    if (game.wander) { game.wander.cancel(); game.wander = null; }
    if (game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    stopClock(); clearReactTimer(); clearStage(); wipeFx();
    if (!els.mask.hidden && !els.dialog.querySelector('.zm-rank')) closeDialog();
    preview = null; mode = null; selected = [];
    game.state = mirrorFromSnapshot(g);
    if (!game.state.alive[0]) game.fastOut = true;   // 按快照直接摆（进房 / 重摆）时我已经出局：没有出局动画可等
    online.lastQueued = g.seq;
    release();
    renderAll();
    onlineIdle(true);
  }

  /* ───── 一组组播 ───── */
  async function pumpQueue() {
    if (!online || online.playing) return;
    online.playing = true;
    const t = token;
    while (online && online.queue.length) {   // 播的时候房间可能没了（被请离 / 房间解散 → online = null）：下一轮先看还在不在
      if (t !== token) { online.playing = false; return; }
      const grp = online.queue.shift();
      // 落后多少：服务器估的「大家应该播完」的时刻（animUntil）已经过去 4 秒以上（正常打四人局实测最多慢 1.9 秒），我还在播 → 落后了，快档追
      { const g = G(); online.behind = !!(g && g.animUntil && Date.now() + (online.skew || 0) > g.animUntil + 4000 && online.queue.length > 0); }
      online.cur = grp.map((e) => e.t).join('+');
      // 播一组出错（镜像 / 动画抛错）：以前 online.playing 永远是 true，之后的事件全堵在队列里，整局卡死。现在按服务器快照重摆接着打
      try { await playGroup(grp, t); } catch (err) {
        console.error('[zhamao] playGroup failed, resync:', online && online.cur, err);
        if (online) { online.playing = false; online.cur = null; }
        if (t === token) resync();
        return;
      }
      if (online) online.cur = null;
    }
    if (!online || t !== token) return;
    online.playing = false;
    online.behind = false;
    onlineIdle();
  }
  async function playGroup(grp, t) {
    const first = grp[0];
    if (first.t === 'dealIntro') {
      busy = true;
      await dealIntro(t);
      if (t !== token) return;
      game.dealing = false;
      release();
      renderAll();
      return;
    }
    if (first.t === 'deal') return;   // 新一局在 enterGame 里处理
    busy = true;
    stopClock();
    clearReactTimer();
    if ((cfz || els.stage.querySelector('.zm-fuse.is-lit')) && first.t !== 'nope') stopFuse();   // 这一轮结算了（不是又来一张作废）：桌沿导火索收掉
    // 机器猫（含替人代打）做的一步：先停一下再播（不冒省略号）；偷牌先让红光在被偷的人牌上游走一会儿
    if (first.t === 'steal' && first.to !== 0) {
      if (!game.wander) { const cnt = game.state.steal ? game.state.steal.perm.length : game.state.hands[first.from].length; game.wander = startWander(first.from, cnt); await wait(stealThink(cnt)); }
    } else if (first.bot && first.who > 0 && !(first.t === 'defuse' && first.rescue)) {   // 机器猫去救人：省略号早就冒着了，服务器也已经等过它想
      if (first.t === 'nope') await wait(500 + Math.random() * 500);
      else await wait(pace().bot);
    }
    if (t !== token) return;
    if (first.t === 'nope') stopFuse();
    if (first.who === 0 && game.preFlyP) { await game.preFlyP; game.preFlyP = null; if (t !== token) return; }
    if (first.who === 0 && game.previewSrc) { game.src = game.previewSrc; game.previewSrc = null; online.pendingSrc = null; }
    else if (first.who === 0) { game.src = online.pendingSrc || {}; online.pendingSrc = null; } else game.src = {};
    if (!els.mask.hidden && els.dialog.querySelector('[data-steal], [data-alter], [data-fan], .zm-grid')) closeDialog();   // 超时被服务器代选了：要我做决定的弹窗收掉
    if (mode === 'target') cancelTarget();
    snapshot();
    for (const e of grp) applyNet(game.state, e);
    if (first.who === 0) selected = [];
    mode = null;
    reactOpen = false;
    renderBand();
    renderHand({ flip: false });
    await playEvents(grp, t);
  }

  /* ───── 停下来等人：轮到谁、我要不要做决定 ───── */
  /* 联机暂停（2026-11-20 用户：只有房主能暂停）：服务器那边所有倒计时停住、谁都不能出牌。这边——
   * 人人都看到和单机一样的暂停页（打盹的小咪 + 大暂停图标），只有房主有「继续」；别人那儿只有「离开房间」，正中下方是房主的小头像（谁停的）。
   * 本地的计时（出牌红环、作废导火索、自动取消）一起停；继续时导火索从停下的地方接着烧，红环按服务器顺延后的时刻重算 */
  const pauseShown = () => !els.mask.hidden && els.dialog.classList.contains('is-online-pause');
  function syncOnlinePause(g) {
    if (!game || !game.online || !g) return;
    const on = !!g.paused && !g.over;
    if (on === !!online.pausedAt) return;
    if (on) {
      online.pausedAt = performance.now();
      clearTimeout(reactAuto);
      pauseClock();
      els.nopeBtn.querySelectorAll('.zm-nope-ring').forEach((r) => r.getAnimations().forEach((a) => a.pause()));   // 方形导火索读的就是这个钟：一起停
      busy = true;
      showOnlinePause();
    } else {
      const d = performance.now() - online.pausedAt;
      online.pausedAt = 0;
      if (online.reactEnd) online.reactEnd.end += d;
      els.nopeBtn.querySelectorAll('.zm-nope-ring').forEach((r) => r.getAnimations().forEach((a) => a.play()));
      if (pauseShown()) closeDialog();
      clock.paused = false;
      if (!online.playing) onlineIdle();
    }
    refreshTools();
  }
  function showOnlinePause() {
    if (!online || !online.pausedAt) return;
    closeMenu();
    if (soundPanel) soundPanel.hidden = true;
    const host = isHost();
    const hp = online.st && (online.st.players || []).find((p) => p.id === online.st.hostId);
    const hostFace = hp ? (hp.avatar && AV && AV.byId[hp.avatar] ? AV.byId[hp.avatar].svg : '<span>' + esc((hp.nick || '?').slice(0, 1)) + '</span>') : '';
    openDialog('<button type="button" class="zm-pause-cat" aria-label="' + T('ui.pause.pet', '摸摸小咪') + '">' + napArt() + '</button>' +
      '<div class="zm-pause-ic" aria-label="' + T('ui.pause', '暂停') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><rect x="34" y="28" width="11" height="44" rx="3.5"/><rect x="55" y="28" width="11" height="44" rx="3.5"/></svg>' +
'</div>' +
      (!host && hostFace ? '<div class="zm-pause-by" title="' + esc(hp.nick || '') + '"><span class="av">' + hostFace + '</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><rect x="8" y="7" width="2.8" height="10" rx="1"/><rect x="13.2" y="7" width="2.8" height="10" rx="1"/></svg></div>' : '') +
      '<div class="zm-pause-actions">' + (host
        ? '<button type="button" class="zm-btn zm-btn-primary" data-go data-focus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>' + T('ui.resume', '继续') + '</button>'
        : '<button type="button" class="zm-btn" data-leave><svg class="ln" viewBox="0 0 24 24" aria-hidden="true">' + MENU_ICONS.leave + '</svg>' + T('ui.leaveRoom', '离开房间') + '</button>') + '</div>', (d) => {
      d.classList.add('is-pause', 'is-online-pause');
      const cat = d.querySelector('.zm-pause-cat');
      cat.addEventListener('click', () => napWake(cat));
      const go = d.querySelector('[data-go]');
      if (go) go.addEventListener('click', () => { go.disabled = true; onlineAct('pause', { on: false }); });
      const lv = d.querySelector('[data-leave]');
      if (lv) lv.addEventListener('click', () => { closeDialog(); leaveOnline(true); });
    });
  }
  function onlineIdle(fromResync) {
    const g = G();
    if (!game || !game.online || !g || online.playing || game.dealing) return;
    if (online.pausedAt && g.paused && !g.over) { if (!pauseShown()) showOnlinePause(); return; }   // 房主暂停中：动画播完也别弹出牌 / 挑牌
    if (game.favorPre != null && game.state.phase !== 'react' && game.state.phase !== 'give') { game.favorPre = null; selected = []; }   // 索要合一：已经给出去了 / 索要被作废了
    if (!fromResync && !sameAsSnapshot()) { console.warn('[zhamao] mirror drifted, resync:', driftWhy, '(seq ' + g.seq + ')'); resync(); return; }
    const s = game.state;
    autopilot = !game.spectator && !!g.auto[online.base];
    els.me.classList.toggle('is-auto', autopilot);
    if (window.ZhamaoAudio && s.deck.length) window.ZhamaoAudio.danger(R.kittensInDeck(s) / s.deck.length);
    if (s.deck.length) rimHeat(R.kittensInDeck(s) / s.deck.length);
    release();
    if (g.over) { renderAll(); onlineFinish(); return; }
    // 我坐在别人背后看，他也出局了：自动换到下一家还在场的（2026-11-17；以前视角停在他的空座位上）
    if (game.spectator && online.st.viewSeat >= 0 && g.st.alive && !g.st.alive[online.base]) {
      // 组队：先坐到自己还活着的队友身后（出局的人能看队友的牌）
      const tm = g.st.teams, mine0 = online.st.mySeat >= 0 ? online.st.mySeat : online.base;
      const pick = tm ? Array.from({ length: online.n - 1 }, (_, k) => (online.base + k + 1) % online.n).find((j) => g.st.alive[j] && tm[j] === tm[mine0]) : undefined;
      if (pick != null) onlineView(pick);
      else for (let k = 1; k < online.n; k++) { const j = (online.base + k) % online.n; if (g.st.alive[j]) { onlineView(j); break; } }
    }
    // 组队：我刚出局（还坐在自己的空座位上）→ 这局第一次自动坐到还活着的队友身后（出局的人能看队友的牌）；之后想换人照常点小头像
    if (!game.spectator && g.st.teams && online.st.mySeat >= 0 && online.base === online.st.mySeat && g.st.alive && !g.st.alive[online.st.mySeat] && game.mateAuto !== g.matchNo) {
      game.mateAuto = g.matchNo;
      const tm = g.st.teams, me0 = online.st.mySeat;
      const pick = Array.from({ length: online.n - 1 }, (_, k) => (me0 + k + 1) % online.n).find((j) => g.st.alive[j] && tm[j] === tm[me0]);
      if (pick != null) onlineView(pick);
    }
    guideOnline();   // 实战里的引导：只盖一层，不拦下面的流程
    const mine = !!g.myCall && !autopilot && !game.spectator;
    const remain = onlineRemain();
    stopClock();
    reactOpen = false;
    busy = true;
    mode = null;
    // 头像上的倒计时红环：现在该谁做决定
    const who = s.phase === 'act' ? s.turn : s.phase === 'give' ? s.give.from : s.phase === 'pick' ? s.pick.by : s.phase === 'steal' ? s.steal.by : s.phase === 'alter' ? s.alter.by : s.phase === 'rescue' && s.rescue ? s.rescue.for : s.phase === 'defuse' ? s.defuse.by : s.phase === 'save' && s.save ? s.save.by : -1;
    if (s.phase === 'react') { renderAll(); onlineReact(g, mine, remain); return; }
    if (g.turnSec && who >= 0 && remain > 0) startClock(who, null, remain);
    if (!mine) {
      renderAll();
      if (s.phase === 'steal' && s.steal.by !== 0 && !game.wander) game.wander = startWander(s.steal.from, s.steal.perm.length);
      return;
    }
    switch (s.phase) {
      case 'act': busy = false; selected = []; renderAll(); myTurnCue(); break;
      case 'give': busy = false; mode = 'give'; selected = []; renderAll(); break;
      case 'pick': busy = false; renderAll(); pickDialog(); break;
      case 'steal': busy = false; renderAll(); stealPicker(); break;
      case 'alter': busy = false; renderAll(); alterDialog(); break;
      case 'defuse': busy = false; renderAll(); insertDialog(); break;
      case 'save': busy = false; saveStart(remain); break;   // 急救：挑一对
      case 'rescue': busy = false; renderAll(); rescueDialog(); break;   // 组队：队友炸毛了，问我救不救
      default: renderAll();
    }
  }
  // 反应窗：每次出牌都烧一根导火索（不管谁有没有作废）；轮到我表态的话，有作废就亮「作废」，没有也能点「取消」提前结束
  /* 2026-11-12 用户实测：没作废也得点「取消」很怪、窥探 / 抽牌要干等导火索。改成：
   *   手里没作废 → 不露「取消」，0.5–1 秒后自动替我表态（不立刻：不然「一出牌窗口就关」等于告诉大家我没作废）；
   *   手里有作废 → 照旧「作废 / 取消」，导火索一烧完就自动算取消（不再干等服务器多留的那 1.2 秒）。 */
  let reactAuto = 0, fuseLater = 0;
  // 一收到「有人出牌、轮到我表态、我手里没作废」就开始计时（和桌上的动画同时走，不等动画播完），0.15–0.4 秒后表态
  // （2026-11-13 用户：牌落定后还要卡一下才出结果——大家这一下表态 + 来回网络常常比出牌动画还长；缩短后多半在牌落定前就表完了，
  //   仍然随机，窗口关得早晚看不出谁有没有作废）
  function earlyPass(g) {
    if (!online || !g || !g.myCall || (game && game.spectator) || g.st.phase !== 'react' || online.passFor === g.seq) return;
    // 组队：和队友有关（队友出的、指着队友、甩到队友头上）也算和我有关，跟单机的 askMeNope 一致（2026-11-19 用户：别人甩锅给我队友，联机不问我作废——这里以前没算队友，先替我点了取消）
    const st = g.st, me = online.base, mates = st.teams ? st.teams.map((t, k) => k).filter((k) => k !== me && st.teams[k] === st.teams[me] && st.alive[k]) : [];
    // 组队：最后出手的是队友 → 只有冲着我来的才问（同 askMeNope）
    const p = st.pending, mateLast = !!(st.teams && p && lastBy(p) !== me && st.teams[lastBy(p)] === st.teams[me]);
    const asked = !p || (mateLast ? hitsMe(p, me, st.alive, st.dir) : nopeAsks(p, me, st.alive, st.dir) || mates.some((m) => aboutSeat(p, m, st.alive, st.dir)));
    if (st.hand.some((id) => R.KIND_OF[id] === R.NOPE) && asked) return;
    online.passFor = g.seq;
    const at = g.seq;
    setTimeout(() => {
      const gg = G();
      if (!online || !gg || gg.seq !== at || !gg.myCall || gg.st.phase !== 'react') return;
      onlineMove({ type: 'pass' }, at);   // 明确对着这一窗（这时 onlineReact 多半还没轮到它，askSeq 还是上一窗的）
    }, 150 + Math.random() * 250);
  }
  function onlineReact(g, mine, remain) {
    const s = game.state;
    if (!els.stage.querySelector('.zm-stage-inner')) { showStage(s.pending, false); if (s.pending.nopes.length) stageVerdict(s.pending.nopes.length); }
    const canN = mine && R.canNope(s, 0) && askMeNope(s);
    // 2026-11-13 用户 8 人局：「问作废的时间太短 / 点了没生效」——服务器按估的动画时长开窗，网页这边动画常常播得更久（人多、手机慢、
    // 前面还排着动画），轮到我表态时导火索只剩一点点、甚至 0（立刻自动取消）。现在问到我时至少给满 1.8 秒；
    // 服务器那边多留的一截（graceMs）兜得住，但也不能超过服务器真正关窗前 0.5 秒（留给网络）
    // 留给网络的那截按这台设备实际的来回算（以前写死 0.5 秒，网慢的人最后一刻点的作废会赶不上）
    const pad = Math.min(2000, Math.max(400, netRtt() + 250));
    /* 2026-11-17 用户朋友局「作废点不上」：以前这里只剩 1.8–2.5 秒，长轮询卡一下（线上实测 2.7–4.4 秒）就只剩零点几秒甚至直接自动取消。
     * 现在从我真正看到这一窗起算：牌冲着我 = 出牌限时的 1/4（服务器发来的 reactMs：10 秒局 3 秒，其余 5 秒），只是问问我 = 1.5 秒（2026-11-21 起，原 2.5 秒）；
     * 服务器那边的窗口不够这么长（我看到得晚）就报到一声（seen），服务器从现在起续一整根。同一窗只算一次起点，状态再推过来也不重新烧 */
    let give = remain;
    if (canN) {
      if (!online.reactEnd || online.reactEnd.seq !== g.seq) {
        game.reactMsSrv = g.reactMs || 0;
        const base = nopeWindowMs(s) + (s.pending.nopes.length ? NOPE_HOLD_MS : 0);
        startNopeHold(s);
        if (g.deadline - (Date.now() + online.skew) - pad < base) {
          NET.act(online.code, online.token, 'move', { d: { type: 'seen' }, at: g.seq }).catch(() => {});
        }
        online.reactEnd = { seq: g.seq, end: performance.now() + base, total: base };
      }
      give = Math.max(0, online.reactEnd.end - performance.now());
    }
    online.askSeq = g.seq;   // 我是对着哪一窗表态的：作废 / 取消都带这个，不带最新收到的（见 onState）
    reactOpen = canN;
    busy = !canN;
    renderHand({ flip: false });
    renderBand();
    // 导火索：只在问到我的时候点（2026-11-20 用户：别人在想要不要作废时不再给我看导火索——看着像在问我，
    // 而且「窗口过了 0.9 秒还开着」等于告诉全桌有人手里有作废）。同一窗只点一次；舞台被重画、那圈没了才补画，从烧到的地方接着烧
    clearTimeout(fuseLater);
    if (canN) {
      if (online.fuseFor !== g.seq || !cfz) { online.fuseFor = g.seq; fuse(give > 0 ? give : 0, online.reactEnd.total); }
    } else { online.fuseFor = g.seq; if (cfz) fuse(0); }   // 没问我 / 我已经表过态：不点、点着的收掉
    clearTimeout(reactAuto);
    if (!mine) return;
    const at = g.seq;
    const autoPass = () => {
      const gg = G();
      if (!online || !gg || gg.seq !== at || !gg.myCall || game.state.phase !== 'react') return;
      reactOpen = false;
      renderBand(); renderHand({ flip: false });
      onlineMove({ type: 'pass' }, at);
    };
    if (canN) { snd('ask'); reactAuto = setTimeout(autoPass, Math.max(0, give)); }
    else earlyPass(g);   // 没作废：收到状态时多半已经排好了，这里兜个底
  }

  /* ───── 我的操作 → 服务器 ───── */
  // 乐观出牌：点了「出牌」牌马上从手里飞上桌（和要指人时先摆上桌那一段一样），同时发请求；服务器回话后从桌上接着演
  async function preFly(cards) {
    const t = token;
    const rects = cards.map((id) => handRectOf(id));
    cards.forEach((id) => handOut.add(id));
    selected = [];
    renderHand();   // 剩下的牌滑过去收拢
    showStage({ by: 0, type: 'x', cards, target: -1, named: null, nopes: [] }, true);
    preview = { cards };
    snd('whoosh');
    const su = SU();
    await Promise.all(cards.map((id, i) => {
      const target = stageCard(id);
      if (!target) return null;
      const to = target.getBoundingClientRect(), rot = (i - (cards.length - 1) / 2) * 5;
      return fx.fly(leaveWild(id, { html: cardHtml(id), from: rects[i], to: { x: to.left + to.width / 2, y: to.top + to.height / 2 }, w: su, s0: rects[i].width / su, s1: 1, r0: 0, r1: rot, dur: ms(340), delay: i * ms(50), lift: 70 }))
        .then(() => { if (t === token) target.classList.remove('is-incoming'); });
    }));
    if (t !== token || !preview) return;
    const m = {};
    for (const id of cards) { const el = stageCard(id); if (el) m[id] = el.getBoundingClientRect(); }
    game.previewSrc = m;
    preview = null;
  }
  async function onlineMove(d, atSeq) {
    if (!online) return;
    const g = G();
    busy = true;
    stopClock();
    if (d.type === 'play' && !game.previewSrc) game.preFlyP = preFly(d.cards);
    /* 摸牌（2026-11-16 用户和国内的朋友：联机摸牌「卡一下」）：服务器一来一回要 0.6–1 秒（国内更久），以前点了只抖一下、等回来才开始摸。
     * 现在一点就把顶上那张掀起来悬着，回来后摸牌动画从悬着的位置接着播（peel 里接手），等待变成动作的一部分 */
    // 2026-11-22 用户：联机摸牌「先错开一点、卡一下、再飞」——以前掀起来的是牌堆上那张的样子，回话后 peel 又从牌堆上重新推一遍（等于退回去重来）。
    // 现在一点就直接演 peel 的前半段（推出一截、捏起来悬着），回话后 peel 从悬着的地方接着演，中间不倒退
    else if (d.type === 'draw' && !fx.reduce()) prePeel();
    if (d.type !== 'pass' && d.type !== 'nope' && !game.preFlyP) online.pendingSrc = captureSources(0, d);
    const slow = d.type === 'pass' ? 0 : setTimeout(() => toast(T('net.slow', '网络有点慢，稍等…')), 1800);
    // 作废 / 取消：带上我看到的那一窗（askSeq）。别人的作废已经到了、动画还没播到时我点的作废，服务器会按「过时」拒掉，
    // 不会被当成「作废回去」（两张作废 = 原牌又生效，违背两个人的本意）
    const at = atSeq != null ? atSeq : (d.type === 'nope' || d.type === 'pass') && online.askSeq != null ? online.askSeq : g ? g.seq : undefined;
    const body = { d: Object.assign({}, d, d.target != null && d.target >= 0 ? { target: srvOf(d.target) } : {}), at };
    mode = null;
    renderBand();
    try {
      const res = await NET.act(online.code, online.token, 'move', body);
      clearTimeout(slow);
      onState(res.state, res._rtt);
    } catch (err) {
      clearTimeout(slow);
      if (game && game.drawLift) { const f = game.drawLift.face; game.drawLift.node.remove(); game.drawLift = null; if (f != null) { game.faceQuiet = f; renderPiles(); } }   // 没摸成：掀起来的那张收掉（透视：放回牌堆顶，不再演翻面）
      dropPreInsert();   // 没塞成：先飞出去的那张收掉、桌心的炸弹猫露回来
      if (d.type === 'pass' && err && err.status === 409) return;   // 窗口已经关了（别人作废 / 已结算）：没关系，等下一份状态
      if (d.type === 'rescue' && err && (err.error === 'stale' || err.error === 'not_your_turn' || err.error === 'not_your_call')) return;   // 别的队友先救了：等事件推过来，弹窗里演「被他抢先」
      if (game && game.preFlyP) { await game.preFlyP; game.preFlyP = null; if (!online) return; preview = { cards: d.cards }; endPreview(); }
      if (!online) return;
      online.pendingSrc = null;
      game.previewSrc = null;
      // 作废没生效要说清楚（2026-11-13 用户：有人点了作废却没生效、也不知道为什么）
      // 作废没打出去（别人先作废了 / 这一轮已经结算）：不弹文字（2026-11-17 用户：文字提示很蠢），手里的作废抖一下表示「没出去、还在手里」；
      // 桌沿的颜色会从先出作废的那个人那儿重新铺开，一看就知道发生了什么
      if (d.type === 'nope' && err && (err.error === 'stale' || err.error === 'no_reaction' || err.error === 'not_your_call')) els.hand.querySelectorAll('.zm-card[data-k="nope"]').forEach((c) => shake(c));
      else if (err && err.error !== 'stale') toast(NET.message(err));
      resync();
    }
  }
  async function onlineAuto(on) {
    if (!online || !game || game.spectator) return;
    snd(on ? 'tick' : 'tap');
    try { const res = await NET.act(online.code, online.token, 'auto', { on }); onState(res.state, res._rtt); } catch (err) { toast(NET.message(err)); }
  }
  async function onlineAct(action, body) {
    if (!online) return null;
    try { const res = await NET.act(online.code, online.token, action, body || {}); if (res && res.state) onState(res.state, res._rtt); return res; }
    catch (err) { if (err && err.error === 'kicked') { leaveOnline(false, T('net.err.kicked', '房主请你离开了房间')); return null; } toast(NET.message(err)); if (err && (err.status === 401 || err.status === 404)) leaveOnline(false, T('net.gone', '房间已经不在了')); return null; }
  }

  /* ───── 一局结束 ───── */
  let keepFinish = -1;
  async function onlineFinish() {
    const g = G();
    if (g && keepFinish === g.matchNo) { game.finishShown = g.matchNo; keepFinish = -1; return; }
    if (!g || game.finishShown === g.matchNo) return;
    game.finishShown = g.matchNo;
    busy = true;
    bgm('end');
    clearStage();
    renderAll();
    const order = (g.ranking || []).map(locOf);
    const ok = await celebrate(order[0], teamGame() ? order.slice(0, g.winners || 1) : null);
    if (!ok || !online || !G() || !G().over) return;
    const host = isHost();
    bgm('menu');   // 结算页算游戏外：接上丁（一局结束时先淡出，皇冠彩纸放完、排行榜出来再起）
    showRanking(order);
  }
  /* 排行榜（一局结束；编辑模式里点「排行榜」也回到这里）。2026-11-14 用户：房主「下一局」= 同样的人、座位、规则直接开打；
   * 「回房间」改规则 / 加减机器猫；⇄ 进编辑模式（长按头像也行）：拖头像换座位、点 × 请离。下面列本房间战绩。
   * 名字按这局打完那一刻记下的（座位调过之后再打开也对得上） */
  // 组队结算（单机 / 联机共用）：赢的那一队都写「胜利」、都挂奖牌，下面一道线隔开输的
  function teamRankHtml(order, w, won) {
    const s = game.state, me = game.spectator ? -1 : 0;
    // 每一队一个名次（2026-11-18 用户：不只第一队有奖牌）：赢的队第 1，其余按「全队出局得越晚越靠前」——order 里输的人本来就是越晚出局越靠前，
    // 按队第一次出现的先后定名次；同一队的人排在一起，队与队之间一道线
    const tr = new Map();
    order.forEach((seat) => { const t = R.teamOf(s, seat); if (!tr.has(t)) tr.set(t, tr.size); });
    void won;
    // 右边写个人名次（2026-11-19 用户）：第几个出局定名次——最后出局的排在活着的人后面，第一个出局的垫底；赢的时候还活着的几个人并列第 1，不分先后
    const prank = (seat) => {
      if (s.alive[seat]) return 1;
      const k = s.outOrder.indexOf(seat);
      return k >= 0 ? s.n - k : order.indexOf(seat) + 1;
    };
    const rows = order.slice().sort((a, b) => tr.get(R.teamOf(s, a)) - tr.get(R.teamOf(s, b)) || prank(a) - prank(b));   // 队内按个人名次排
    return '<h2>' + T('ui.rank.title', '排行榜') + '</h2>' +   // 2026-11-18 用户：标题一律叫「排行榜」，中性（不写「我们队赢了 / 对面那队赢了」）
      '<ol class="zm-rank is-team" data-stagger>' + rows.map((seat, i) => {
        const k = tr.get(R.teamOf(s, seat)), split = i > 0 && k !== tr.get(R.teamOf(s, rows[i - 1]));
        return '<li class="' + (seat === me ? 'is-me' : '') + (split ? ' is-split' : '') + (k ? ' is-lost' : '') + '"><span class="pos">' + (k < MEDALS.length ? medal(k) : '') + '</span><span class="mini">' + avatarHtml(seat) + '</span><span class="nm">' + esc(nameOf(seat)) + (seat === me ? '<small>' + T('ui.rank.me', '（我）') + '</small>' : me === 0 && isMate(seat) ? '<small>' + T('ui.rank.mate', '（队友）') + '</small>' : '') + '</span><span class="tag">' + T('ui.rank.nth', '第 {n} 名', { n: prank(seat) }) + '</span></li>';
      }).join('') + '</ol>';
  }
  function showRanking(order0) {
    const g = G();
    if (!g || !online) return;
    const host = isHost(), st = online.st, rec = st && st.record;
    const lastM = rec && rec.matches && rec.matches[rec.matches.length - 1];
    let rows = null;
    if (rec && lastM === g.matchNo) rows = rec.rows.map((r) => ({ r, k: r.ranks.find((x) => x.m === lastM) })).filter((x) => x.k).sort((a, b) => a.k.r - b.k.r).map((x) => x.r);
    const order = order0 || (g.ranking || []).map(locOf);
    const face = (r) => (r.avatar && AV && AV.byId[r.avatar] ? AV.byId[r.avatar].svg : '<span>' + esc((r.nick || '?').slice(0, 1)) + '</span>');
    const items = rows ? rows.map((r) => ({ me: r.id === st.me && !game.spectator, face: face(r), nick: r.nick }))
      : order.map((seat) => ({ me: seat === 0 && !game.spectator, face: avatarHtml(seat), nick: nameOf(seat) }));
    const teamW = teamGame() ? (g.winners || 1) : 0;   // 组队：赢的那一队都算赢，不上领奖台，用队伍名单
    openDialog((host ? '<button type="button" class="zm-icbtn zm-rank-edit is-corner" data-edit aria-label="' + T('ui.host.edit', '调座位 / 请人离开') + '" title="' + T('ui.host.edit', '调座位 / 请人离开') + '">' + HOST_IC.swap + '</button>' : '') +
      (teamW ? teamRankHtml(order, teamW, !game.spectator && order.slice(0, teamW).indexOf(0) >= 0) : podiumHtml(items)) +
      (WAL && g.pay && !game.spectator && !g.pay.refund ? WAL.slot() : '') +
      recordHtml(st && st.record, 2) +
      (host ? '' : '<p class="zm-muted">' + T('ui.room.waitNext', '等房主开下一局') + (WAL && g.pay && !g.pay.refund && !game.spectator ? T('ui.room.waitNextFee', '（开局时扣门票 {p} 小鱼干）', { p: Number(g.pay.price).toLocaleString('en-US') }) : '') + '</p>') +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-leave>' + T('ui.leaveRoom', '离开房间') + '</button>' + (host ? '<button type="button" class="zm-btn" data-again>' + T('ui.room.backShort', '回房间') + '</button><button type="button" class="zm-btn zm-btn-primary" data-next data-focus>' + T('ui.nextGame', '下一局') + '</button>' : '') + '</div>', (d) => {
      if (!teamW) { d.classList.add('is-podium'); animPodium(d); }
      if (WAL) { const mi = teamW ? -1 : items.findIndex((x) => x.me); WAL.fillOnline(d, !game.spectator && g.pay ? Object.assign({}, g.pay, mi >= 0 ? { rank: mi + 1 } : {}) : null, game); }
      d.querySelector('[data-leave]').addEventListener('click', () => { closeDialog(); leaveOnline(true); });
      const a = d.querySelector('[data-again]');
      if (a) a.addEventListener('click', () => { a.disabled = true; onlineAct('rematch'); });
      const nx = d.querySelector('[data-next]');
      if (nx && WAL && WAL.costTag && g.pay && !g.pay.refund && !game.spectator) WAL.costTag(nx, g.pay.price);   // 2026-11-24 用户：「下一局」也要看得出花多少（同一桌同样的门票）
      if (nx) nx.addEventListener('click', () => { nx.disabled = true; onlineAct('next'); });
      const ed = d.querySelector('[data-edit]');
      if (ed) ed.addEventListener('click', () => { closeDialog(); enterEdit('table'); });
    });
  }
  /* 本房间战绩表（2026-11-14 用户：连着打很多局，按「平均名次」排）：名次 / 名字 / 平均名次 / 赢的局数 / 打的局数 / 最近几局各第几 */
  function recordHtml(rec, minMatches) {
    if (!rec || !rec.rows || !rec.matches || rec.matches.length < (minMatches || 1)) return '';
    // 2026-11-14 用户：一局里赢的只有一个，「赢了几局」没意义——只列平均名次和每一局各第几（从第一局一路排到现在）
    const me = online && online.st ? online.st.me : null;
    const face = (r) => (r.avatar && AV && AV.byId[r.avatar] ? AV.byId[r.avatar].svg : '<span>' + esc((r.nick || '?').slice(0, 1)) + '</span>');
    const ms = rec.matches;
    return '<div class="zm-record"><div class="zm-record-h">' + T('ui.record.title', '本房间战绩 · {n} 局', { n: ms.length }) + '<small>' + T('ui.record.by', '按平均名次') + '</small></div><div class="zm-record-scroll">' +
      '<table><thead><tr><th></th><th class="nm"></th><th>' + T('ui.record.avg', '平均名次') + '</th>' + ms.map((m, i) => '<th class="rk">' + (i + 1) + '</th>').join('') + '</tr></thead><tbody>' +
      rec.rows.map((r, i) => '<tr class="' + (r.id === me ? 'is-me' : '') + '"><td class="pos">' + (i + 1) + '</td><td class="nm"><span class="mini">' + face(r) + '</span><span>' + esc(r.nick) + '</span></td>' +
        '<td class="avg">' + r.avg.toFixed(1) + '</td>' +
        ms.map((m) => { const x = r.ranks.find((k) => k.m === m); return '<td class="rk' + (x && x.r === 1 ? ' is-win' : '') + '">' + (x ? x.r : '–') + '</td>'; }).join('') + '</tr>').join('') +
      '</tbody></table></div></div>';
  }

  /* ───── 进 / 出房间、长轮询 ───── */
  function startOnline(st, token0) {
    if (online && online.poll) online.poll.abort = true;
    online = { code: st.code, token: token0, st: null, base: 0, n: 0, matchNo: 0, lastQueued: 0, queue: [], playing: false, poll: null, pendingSrc: null, skew: 0 };
    if (NET) NET.writeSession({ code: st.code, token: token0 });
    try { const u = new URL(location.href); u.searchParams.set('room', st.code); history.replaceState(null, '', u.toString()); } catch (_) { /* */ }
    onState(st);
    pollLoop();
    if (NET && NET.ping) NET.ping(online.code);
  }
  // 在房间里每 3 秒量一次来回（没出牌的人也有数）：倒计时校准用，也随请求报给服务器；回来的房间进度用来看长轮询有没有卡住
  setInterval(() => {
    if (!online || !NET || !NET.ping || document.hidden) return;
    const o = online;
    NET.ping(o.code).then((r) => { if (online === o && r && r.v != null) pollStalled(r.v); });
    pollStalled(null);
  }, 3000);
  /* 桌沿右下角的小按钮（2026-11-14 用户：牌桌上的编辑面板拿掉，真正要的只有「下一局」，做成音乐里的快进键，别太显眼）：
   * · 真人都出局了（服务器上这局已经算完），网页还在一步步播机器猫出牌 → ⏩ 快进：剩下的按 5 倍速播完（再点一下恢复），
   *   播完照常弹结算——不直接跳过：结果大家都想看一眼，房主一点就把所有人的结尾掐掉不合适。
   *   联机只有房主有这个键，点了服务器记一个开关，所有人一起快（大家看到的进度一样）；单机是我自己出局后自己点
   * · 结算看过了、这局确实结束 → 房主看到 ⏭ 下一局（别人没有） */
  const FF_IC = {
    // 2026-11-23：⏩ 现在是「直接看结果」——图标换成「跳到最后」（两个三角 + 一道竖线）；房主的「下一局」改成一个三角 + 竖线，两个不撞
    ff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5v11L10 12ZM10.5 6.5v11L17 12Z"/><path d="M19 6.5v11" class="bar"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.5v11l8-5.5Z"/><path d="M17.5 6.5v11" class="bar"/></svg>',
  };
  let ffBtn = null;
  // 联机：我这边看到的真人全出局了（网慢、播得落后时，服务器早算完了，但我这边自己还活着——这时加速 / 露快进键都等于剧透）
  function humansOutHere() {
    // 按桌上演到哪算（ov = 这一步动画开演前的样子），不按已经结算好的 game.state：2026-11-22 用户——最后一张炸弹猫还没翻开，右下角就冒快进键，等于告诉我要挂了。
    // 我自己还要等那一下炸完（fastOut）
    if (!(game && game.online && game.state && online && online.st)) return false;
    const al = (ov || game.state).alive, me = online.st.mySeat;
    if (me >= 0 && !game.spectator && online.base === me && !game.fastOut) return false;
    return online.st.players.every((p) => p.isAi || p.left || p.seat == null || !al[locOf(p.seat)]);
  }
  function updateFF() {
    if (!game) { if (ffBtn) { ffBtn.remove(); ffBtn = null; } return; }   // 主页 / 房间页：没有牌局（以前这里会每 0.4 秒报一次错）
    let mode = '';
    if (game && !game.online && !online) {
      // 单机：我出局、自己那下炸完了（fastOut），机器猫还在接着打 → 我自己的 ⏩
      const s = game.state;
      if (!game.tutorial && s && !s.alive[meSeat()] && s.phase !== 'over' && game.fastOut && !game.turboOff) mode = 'ff';
      // 2026-11-22 用户：我出局了就直接 5 倍速播（以前要自己点 ⏩ 才 5 倍）；⏩ 改成「直接看结果」
      if (mode === 'ff' && !game.turbo && !game.autoTurbo) { game.autoTurbo = true; setTurbo(true); }
    } else {
      const g = online && game && game.online ? G() : null;
      // 我这边也得看到真人全出局了才算（网慢、播得落后时，服务器早算完了，但我这边自己还活着——这时快进 / 露键都等于剧透）
      const replaying = !!(g && g.over && game.finishShown !== g.matchNo && (online.playing || online.queue.length) && humansOutHere());
      // 联机（2026-11-14 用户）：只有房主有这个键，房主点了大家一起 5 倍速——所有人看到的进度一样；别人跟着服务器上的开关走
      // 房主刚点、服务器的状态还没回来：先按房主点的算，别一闪又被旧状态拨回去（4 秒没回来就作罢）
      const req = game.turboReq && performance.now() - game.turboReq.at < 4000 && game.turboReq.on !== !!g.turbo ? game.turboReq.on : null;
      // 2026-11-22 用户：真人全出局了，每个人自己这边自动 5 倍速播（不用等房主点）；⏩ 谁都有，点了直接看结果
      void req;
      const want = !!(replaying && !game.turboOff);
      if (!!game.turbo !== want) setTurbo(want);
      const canNext = !!(g && g.over && game.finishShown === g.matchNo && isHost() && !online.playing && !online.queue.length);
      mode = replaying ? 'ff' : canNext ? 'next' : '';
    }
    if (!mode) { if (ffBtn) { ffBtn.remove(); ffBtn = null; } return; }
    if (!ffBtn || !els.center.contains(ffBtn)) {
      if (ffBtn) ffBtn.remove();
      ffBtn = document.createElement('button');
      ffBtn.type = 'button';
      ffBtn.className = 'zm-ff';
      ffBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.currentTarget;
        if (b.dataset.mode === 'ff') {
          b.disabled = true;
          snd('tap');
          jumpToEnd();   // 2026-11-22 用户：⏩ = 直接看结果（剩下的瞬间算完，跳到排行榜）
        } else if (b.dataset.mode === 'next') { b.disabled = true; exitEdit(); onlineAct('next'); }
      });
      els.center.appendChild(ffBtn);
      if (!fx.reduce()) ffBtn.animate([{ opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }], { duration: 260, easing: 'cubic-bezier(.3,.7,.4,1.4)' });
    }
    // 组队围桌一圈（2026-11-18 用户）：桌沿是另算的一圈，不是牌桌中间那块的边——快进键贴着桌沿右下角往里一点放
    if (ringGame() && ringLay) {
      const tb = els.table.getBoundingClientRect(), cb = els.center.getBoundingClientRect(), S = ffBtn.offsetWidth || 34, pad = 10;
      ffBtn.style.right = 'auto'; ffBtn.style.bottom = 'auto';
      ffBtn.style.left = Math.round(ringLay.x1 - pad - S - (cb.left - tb.left)) + 'px';
      ffBtn.style.top = Math.round(ringLay.y1 - pad - S - (cb.top - tb.top)) + 'px';
    } else { ffBtn.style.removeProperty('left'); ffBtn.style.removeProperty('top'); ffBtn.style.removeProperty('right'); ffBtn.style.removeProperty('bottom'); }
    if (ffBtn.dataset.mode !== mode) {
      ffBtn.dataset.mode = mode;
      ffBtn.innerHTML = FF_IC[mode];
      ffBtn.disabled = false;
      const label = mode === 'ff' ? T('ui.ffEnd', '直接看结果') : T('ui.nextGame', '下一局');
      ffBtn.setAttribute('aria-label', label); ffBtn.title = label;
    }
    ffBtn.classList.toggle('is-on', mode === 'ff' && !!game.turbo);
  }

  /* 直接看结果（2026-11-22 用户挑甲）：我的名次已经定了（单机我出局 / 联机真人全出局），剩下的不再一步步播——
   * 单机：照服务器 advance 那一套，让机器猫在后台瞬间打完（日志照记，训练场能重放），然后走正常的结算（转回我的座位、聚光灯、排行榜）；
   * 联机：服务器早就算完了，丢掉还没播的那串事件，按最后的快照重摆，接着就是结算 */
  function jumpToEnd() {
    if (!game) return;
    if (game.online) { const g = G(); if (online && g && g.over) { game.turboOff = true; resync(); } return; }
    const s = game.state;
    if (s.phase === 'over' || s.alive[meSeat()] || game.tutorial) return;
    token++;
    game.dealing = false;
    if (game.wander) { game.wander.cancel(); game.wander = null; }
    if (game.wanderDone) { game.wanderDone.cancel(); game.wanderDone = null; }
    stopClock(); clearReactTimer(); clearStage(); wipeFx();
    if (!els.mask.hidden) closeDialog();
    preview = null; mode = null; selected = [];
    game.turboOff = true;
    setTurbo(false);
    busy = true;
    const t = token, g0 = game;
    // 分片算（每片 ~25 毫秒就让一下浏览器）：高手机器猫一步要算一会儿，手机上一口气算完会卡住画面
    simulateRest(s, () => t === token && game === g0).then((done) => {
      if (!done || t !== token || game !== g0) return;
      release();
      renderAll();
      step();
    });
  }
  async function simulateRest(s, alive) {
    const tierOf = (k) => game.tiers[k] || 'normal';
    const log = (seat, d) => { if (HL) HL.act(game, seat, d, seat >= 0 ? 1 : 0); };
    let slice = performance.now();
    for (let guard = 0; guard < 6000 && s.phase !== 'over'; guard++) {
      if (performance.now() - slice > 25) { await new Promise((r) => setTimeout(r, 0)); if (!alive()) return false; slice = performance.now(); }
      if (s.phase === 'react') {
        let noped = false;
        for (const k of R.awaitingReaction(s)) {
          const d = AI.decide(s, k, tierOf(k));
          if (d && d.type === 'nope' && R.canNope(s, k)) { R.nope(s, k); log(k, { type: 'nope' }); noped = true; break; }
          R.pass(s, k);
        }
        if (noped) continue;
        if (R.reactionDone(s)) { if (HL) HL.close(game); R.closeReaction(s); }
        continue;
      }
      if (s.phase === 'rescue') {
        const wait = R.rescueWaiting(s);
        if (wait.length) {
          const k = wait[0], d = AI.decide(s, k, tierOf(k)), yes = !(d && d.type === 'rescue' && d.yes === false);
          R.rescue(s, k, yes); log(k, { type: 'rescue', yes });
        } else { R.closeRescue(s); log(-1, { type: 'closeRescue' }); }
        continue;
      }
      const seat = R.whoActs(s)[0];
      if (seat == null) break;
      let d = AI.decide(s, seat, tierOf(seat));
      const run = (x) => {
        if (x.type === 'draw') return R.draw(s, seat);
        if (x.type === 'play') return R.play(s, seat, x.cards, x);
        if (x.type === 'give') return R.give(s, seat, x.card);
        if (x.type === 'pick') return R.pickDiscard(s, seat, x.card);
        if (x.type === 'insert') return R.insertKitten(s, seat, x.pos, !!x.rand);
        if (x.type === 'save') return R.catSave(s, seat, x.cards, !!x.no);
        if (x.type === 'alter') return R.alterTop(s, seat, x.order);
        if (x.type === 'steal') return R.stealPick(s, seat, x.idx);
        throw new Error('bad move ' + x.type);
      };
      try { run(d); } catch (_) { d = s.phase === 'act' ? { type: 'draw' } : AI.decide(s, seat, 'normal'); run(d); }
      log(seat, d);
    }
    return s.phase === 'over';
  }
  setInterval(updateFF, 400);
  /* 顶栏「排行榜」（联机里谁都能随时点开）：这局结算过了 → 这局名次 + 本房间战绩；还在打 → 只看本房间战绩 */
  function showRoomRank() {
    if (!online || !online.st) return;
    const g = G();
    if (g && g.over && game && game.finishShown === g.matchNo) { showRanking(); return; }
    const body = recordHtml(online.st.record, 1);
    openDialog('<h2>' + T('ui.rank.title', '排行榜') + '</h2>' + (body || '<p class="zm-muted">' + T('ui.record.empty', '还没打完一局。打完第一局，这里就有每个人的平均名次了。') + '</p>') +
      '<div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>' + T('ui.ok', '好') + '</button></div>', (d) => {
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
    });
  }
  /* 长轮询卡住了怎么办（2026-11-17 用户：国内的朋友那边一卡十来秒，然后一下子跳到最新）：
   * 每条长轮询记下发出的时间；对时的小请求（每 3 秒一次）顺便问服务器房间进度，服务器已经比我新、这条却还挂着 = 卡住了 → 丢掉重发；
   * 挂得比服务器最长等待（20 秒）还久也丢。丢掉的那条卡了多久，下一条报给服务器记日志 */
  const POLL_GIVEUP_MS = 26000, STALL_MIN_MS = 2500;
  function pollStalled(v) {
    const pr = online && online.pollReq;
    if (!pr || pr.ctl.signal.aborted) return;
    const age = performance.now() - pr.t0;
    if ((v != null && v > pr.since && age > STALL_MIN_MS) || age > POLL_GIVEUP_MS) { online.stallMs = age; pr.ctl.abort(); }
  }
  async function pollLoop() {
    const my = { abort: false };
    online.poll = my;
    let fails = 0;
    while (online && online.poll === my && !my.abort) {
      const ctl = new AbortController(), since = online.st ? online.st.version : 0;
      online.pollReq = { ctl, t0: performance.now(), since };
      const stall = online.stallMs || 0;
      online.stallMs = 0;
      try {
        const res = await NET.state(online.code, online.token, since, ctl.signal, online.fxSeq == null ? -1 : online.fxSeq, stall);
        if (my.abort || !online) return;
        fails = 0;
        if (res && res.state) onState(res.state);
        if (res && res.fxSeq != null) onFx(res);
      } catch (err) {
        if (my.abort || !online) return;
        if (ctl.signal.aborted) continue;   // 是我嫌它卡住、自己丢掉的：马上重发，不算失败
        if (err && (err.status === 401 || err.status === 404)) { leaveOnline(false, T('net.gone', '房间已经不在了')); return; }
        if (err && err.error === 'kicked') { leaveOnline(false, T('net.err.kicked', '房主请你离开了房间')); return; }
        fails++;
        if (fails === 2) toast(T('net.reconnect', '连接断了，正在重连…'));
        await new Promise((r) => setTimeout(r, Math.min(8000, 800 * fails)));
      }
    }
  }
  async function leaveOnline(sendLeave, msg) {
    const o = online;
    if (!o) return;
    online = null;
    if (o.poll) o.poll.abort = true;
    if (NET) NET.writeSession(null);
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u.toString()); } catch (_) { /* */ }
    if (sendLeave && NET) NET.act(o.code, o.token, 'leave', {}).catch(() => {});
    game = null;
    els.app.classList.remove('is-spectator');
    // 被动离开（房间没了 / 被请离）：牌桌先别撤，盖一张和暂停页一样的卡片，只留「主页面」一个键，点了才回去（2026-11-17 用户）
    if (msg) { roomGoneDialog(); return; }
    hideLobby();
    showCover();
  }
  function roomGoneDialog() {
    openDialog('<div class="zm-pause-cat zm-gone-art">' + roomGoneArt() + '</div>' +
      '<div class="zm-pause-actions"><button type="button" class="zm-btn zm-btn-primary" data-home data-focus><svg class="ln" viewBox="0 0 24 24" aria-hidden="true">' + MENU_ICONS.cover + '</svg>' + T('ui.homeShort', '主页面') + '</button></div>', (d) => {
      d.classList.add('is-pause', 'is-gone');
      d.querySelector('[data-home]').addEventListener('click', () => { closeDialog(); hideLobby(); showCover(); });
    });
  }
  /* 房间没了的小咪（2026-11-17 用户定丙）：空坐垫 + 一串爪印越走越淡 + 一弯月亮——人都走了 */
  function roomGoneArt() {
    const NAVYc = '#2f4a6d', GOLDc = '#c9a96e';
    const print = (x, y, s, r, o) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + r + ') scale(' + s + ') translate(-12 -12)" fill="' + NAVYc + '" opacity="' + o + '">' + ART.pawPrint() + '</g>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<ellipse cx="34" cy="76" rx="26" ry="11" fill="#e9dcc2"/><ellipse cx="34" cy="74" rx="22" ry="8" fill="#f3e9d6"/><path d="M12 76q22 10 44 0" stroke="' + GOLDc + '" stroke-width="2" fill="none" opacity=".7"/>' +
      print(60, 64, 0.38, 70, 0.85) + print(70, 56, 0.36, 60, 0.65) + print(79, 47, 0.34, 55, 0.45) + print(87, 37, 0.32, 50, 0.28) +
      '<path d="M70 18a10 10 0 1 0 8 15 7.5 7.5 0 1 1 -8 -15Z" fill="' + GOLDc + '" opacity=".9"/></svg>';
  }
  function showInvite() {
    if (!online) return;
    const url = NET.inviteUrl(online.code);
    openDialog('<h2>' + T('ui.room.title', '房间 {code}', { code: esc(online.code) }) + '</h2><p class="zm-muted">' + T('ui.invite.tip', '把链接发给朋友，或者让他扫码；也可以在主页「联机」里输房间号') + '</p>' +
      '<div class="zm-invite-qr" data-qr></div><div class="zm-invite-url">' + esc(url) + '</div>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-copy>' + T('ui.invite.copy', '复制链接') + '</button><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>' + T('ui.ok', '好') + '</button></div>', (d) => {
      const qr = d.querySelector('[data-qr]');
      if (window.GamesShell && GamesShell.QR) { try { GamesShell.QR.render(qr, url, { scale: 4, margin: 2, dark: '#1d1b18', light: '#fbf8f1' }); } catch (_) { qr.remove(); } } else qr.remove();
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
      d.querySelector('[data-copy]').addEventListener('click', async (ev) => {
        const b = ev.currentTarget;
        try { if (navigator.share && /Mobi|Android|iPhone/.test(navigator.userAgent)) { await navigator.share({ title: T('ui.invite.share', '来玩百变小咪'), text: T('ui.room.title', '房间 {code}', { code: online.code }), url }); return; } await navigator.clipboard.writeText(url); b.textContent = T('ui.invite.copied', '复制好了'); } catch (_) { b.textContent = T('ui.invite.longPress', '长按上面的链接复制'); }
      });
    });
  }

  /* 连服务器时盖一层「正在连接」+ 一条假进度条（用户 2026-11-12 的主意）：
   * 匀速 1.2 秒走到 70%；还没好就放慢、再 4 秒走到 90%，然后停着等；一连上就 0.25 秒冲到 100% 收起。
   * 250ms 内就连上的不露（不闪）；盖着的时候底下什么都点不了 */
  let connEl = null, connTimer = 0, connStage = 0;
  function connecting(on, text) {
    clearTimeout(connTimer); clearTimeout(connStage);
    if (!on) {
      if (!connEl || connEl.hidden) return Promise.resolve();
      const bar = connEl.querySelector('.zm-conn-bar i');
      bar.style.transition = 'transform .25s ease-out';
      bar.style.transform = 'scaleX(1)';
      return new Promise((r) => setTimeout(() => { connEl.hidden = true; r(); }, 300));
    }
    connTimer = setTimeout(() => {
      if (!connEl) {
        connEl = document.createElement('div');
        connEl.className = 'zm-connecting';
        connEl.innerHTML = '<div class="zm-conn-box"><div class="zm-conn-paws"><i class="zm-conn-paw">' + ART.icon('orange') + '</i><i class="zm-conn-paw">' + ART.icon('calico') + '</i><i class="zm-conn-paw">' + ART.icon('cow') + '</i></div>' +
          '<b data-t></b><div class="zm-conn-bar" role="progressbar" aria-label="' + T('net.connecting', '连接中') + '"><i></i></div></div>';
        els.app.appendChild(connEl);
      }
      connEl.querySelector('[data-t]').textContent = text || T('net.connectingDots', '正在连接…');
      const bar = connEl.querySelector('.zm-conn-bar i');
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0)';
      connEl.hidden = false;
      void bar.offsetWidth;
      bar.style.transition = 'transform 1.2s linear';
      bar.style.transform = 'scaleX(.7)';
      connStage = setTimeout(() => { bar.style.transition = 'transform 4s cubic-bezier(.2,.6,.4,1)'; bar.style.transform = 'scaleX(.9)'; }, 1200);
    }, 250);
    return Promise.resolve();
  }
  async function withConn(text, fn) {
    connecting(true, text);
    try { const r = await fn(); await connecting(false); return r; } catch (e) { connecting(false); throw e; }
  }

  /* ───── 主页「联机」：建房 / 输房间号加入 ───── */
  /* 点「联机」：和单机一样升起一张设置单。邀请链接带房间号进来：直接填好号、光标落在「加入」上 */
  function showOnlineEntry(code) {
    if (!NET) { toast(T('net.unavailable', '联机暂时用不了')); return; }
    NET.warm();
    els.cover.hidden = false;
    if (els.cover.classList.contains('is-loading')) { els.cover.classList.remove('is-loading'); coverStep('main'); }
    refreshCover();   // 「回到房间」按眼下还在不在房间里重摆
    const input = $('zmJoinCode');
    $('zmOnlineErr').hidden = true;
    joinGone(false);
    input.value = code ? String(code).replace(/\D/g, '').slice(0, 4) : '';
    joinReady();
    sheets.online.querySelectorAll('button').forEach((x) => { x.disabled = false; });
    openSheet('online');
    if (code) setTimeout(() => sheets.online.querySelector('[data-cover="join"]').focus(), 360);
  }
  // 房间号输满 4 位：「加入」变朱红（「创建房间」退成普通键），删掉又换回来
  function joinReady() {
    const ok = /^\d{4}$/.test($('zmJoinCode').value.trim()), sess = NET && NET.readSession();
    sheets.online.querySelector('[data-cover="join"]').classList.toggle('is-primary', ok);
    sheets.online.querySelector('[data-cover="create"]').classList.toggle('is-primary', !ok && !sess);
  }
  /* 房间号不对（不存在 / 已解散，2026-11-19 用户）：不在底下另起一行字，直接在输入的数字上蒙一层，写「房间不存在或已解散」；
   * 一改房间号 / 点回输入框就揭掉 */
  let goneTimer = 0, goneSeq = 0;
  const joinGone = (on, clear) => {
    const g = $('zmJoinGone');
    clearTimeout(goneTimer);
    if (!g || g.hidden === !on) return;
    const seq = ++goneSeq;   // 淡出途中又点了框 / 又报错：旧的那次淡出收尾作废，别把新输的号清掉
    const field = g.parentNode, done = () => { if (seq !== goneSeq) return; g.hidden = true; field.classList.remove('is-gone'); if (clear) { $('zmJoinCode').value = ''; joinReady(); } };
    if (on) {
      g.hidden = false; field.classList.add('is-gone');
      if (!fx.reduce()) g.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.3,.8,.4,1)' });
      goneTimer = setTimeout(() => joinGone(false, true), 2400);   // 2026-11-19 用户：显示一小会儿自己消失，顺手清空房间号
      return;
    }
    if (clear && !fx.reduce()) g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in' }).finished.catch(() => {}).then(done);
    else done();
  };
  function onlineFail(e) {
    const err = $('zmOnlineErr');
    if (e && (e.error === 'room_not_found' || e.status === 404)) {
      err.hidden = true; joinGone(true);
      sheets.online.querySelectorAll('button').forEach((x) => { x.disabled = false; });
      return;
    }
    joinGone(false);
    err.textContent = NET.message(e); err.hidden = false;
    sheets.online.querySelectorAll('button').forEach((x) => { x.disabled = false; });
  }
  const onlineLock = () => sheets.online.querySelectorAll('button').forEach((x) => { x.disabled = true; });
  async function onlineCreate() {
    onlineLock();
    try {
      const res = await withConn(T('net.creating', '正在创建房间…'), () => NET.create(profile.nick, profile.avatar, { rules: settings.rules, turnSec: TURN_OPTS.some(([v]) => v === turnSec()) ? turnSec() : 20 }));
      startOnline(res.state, res.token);
    } catch (e) { onlineFail(e); }
  }
  async function onlineJoin(mode) {
    const c = $('zmJoinCode').value.trim();
    if (!/^\d{4}$/.test(c)) { onlineFail({ error: 'bad_code' }); return; }
    onlineLock();
    try {
      const res = await withConn(T('net.joining', '正在进房间…'), () => NET.join(c, profile.nick, profile.avatar, mode));
      startOnline(res.state, res.token);
      if (res.fellBack) toast(NET.message({ error: res.fellBack }));
    } catch (e) { onlineFail(e); }
  }
  async function resumeOnline(sess) {
    try {
      const res = await withConn(T('net.rejoining', '正在回到房间…'), () => NET.state(sess.code, sess.token, 0));
      if (res && res.state) { startOnline(res.state, sess.token); return true; }
    } catch (err) {
      if (err && (err.status === 401 || err.status === 404)) NET.writeSession(null);
      toast(NET.message(err && (err.status === 401 || err.status === 404) ? { error: 'room_not_found' } : err));
    }
    refreshCover();
    return false;
  }

  /* ───── 大厅 ─────
   * 一排五个座位（空位 / 真人 / 机器猫）+ 规则卡（房主能改，别人只看）+ 房间号；房主点空位加机器猫、点机器猫换档 / 移走，点真人可以请出去 */
  let lobbyEl = null;
  function hideLobby() { if (lobbyEl) lobbyEl.hidden = true; }
  /* 小鱼干（2026-11-23 用户：余额不够不能直接开）：房主点开始时服务器查了每个坐着的人——我不够这局门票，就停在大厅、我这儿弹「小鱼干不够了」
   * （救济 / 签到都在里面）；凑够了点主键告诉服务器（wallet_ok）。我是房主：主键就是「开始」，凑够了直接开。
   * 房主那边，不够的人座位上挂一条灰鱼；一次开局只弹一回（关掉了，房主再点开始会再弹） */
  let shortSeen = 0;
  function checkShort(st) {
    const sh = st.short;
    if (!sh || !WAL || !WAL.topUp || st.spectator || sh.ids.indexOf(st.me) < 0 || shortSeen === sh.at) return;
    shortSeen = sh.at;
    const host = st.hostId === st.me;
    WAL.topUp({ tier: sh.tier, mode: sh.mode, n: sh.n, price: sh.price, okLabel: host ? T('ui.start', '开始') : T('ui.wallet.ready', '好了') }).then((ok) => {
      if (!ok || !online) return;
      onlineAct('wallet_ok').then((r) => { if (host && r && r.state && r.state.phase === 'lobby' && !r.state.short) onlineAct('start'); });
    });
  }
  function enterLobby(st, prev) {
    if (editing.on && editing.where === 'table') exitEdit();
    if (game && game.online) { resetTable(); game = null; }
    if (!els.mask.hidden && els.dialog.querySelector('.zm-rank')) closeDialog();
    els.cover.hidden = true;
    bgm('menu');
    renderLobby(st, prev);
  }
  // 出牌限时（2026-11-13 用户：30 秒太长；5 秒扣掉网络来回和别人的动画只剩三四秒，太紧）：10 / 20 / 不限时
  const TURN_OPTS = [[10, T('ui.secs', '{n} 秒', { n: 10 })], [20, T('ui.secs', '{n} 秒', { n: 20 })], [0, T('ui.set.noLimit', '不限时')]];
  function renderLobby(st) {
    if (!lobbyEl) {
      lobbyEl = document.createElement('div');
      lobbyEl.className = 'zm-lobby';
      els.app.appendChild(lobbyEl);
      lobbyEl.addEventListener('click', onLobbyClick);
      bindEdit(lobbyEl, 'lobby');
    }
    lobbyEl.hidden = false;
    const host = isHost(), me = st.me, cfg = st.config || {};
    const rules = R.normalizeRules(cfg.rules);
    const seated = st.players.filter((p) => !p.left);
    // 最多 9 座：平时摆 5 个，坐满到哪就多露一个空位（第二排），免得一上来 9 个空位一大片
    const teamN = rules.mode === 'team' ? R.teamPlayers(rules) : 0;   // 组队：座位正好是队形的人数（多坐了的另外列出来）
    const shownSeats = teamN ? Math.min(R.MAX_PLAYERS, Math.max(teamN, seated.reduce((m, p) => Math.max(m, p.seat), -1) + 1)) : Math.min(R.MAX_PLAYERS, Math.max(5, seated.reduce((m, p) => Math.max(m, p.seat), -1) + 2));
    const sw = (key, on) => '<button type="button" class="zs-switch" data-rule="' + key + '" role="switch" aria-checked="' + !!on + '"' + (host ? '' : ' disabled') + '><i></i></button>';
    const row = (k, title, note, ctl) => '<div class="zs-row"><i class="zs-ic">' + ART.icon(k) + '</i><div class="zs-txt"><b>' + title + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</div>' + ctl + '</div>';
    const ts = TURN_OPTS.some(([v]) => v === cfg.turnSec) ? cfg.turnSec : 20;
    renderLobbyV2(st, { host, me, cfg, rules, seated, shownSeats, row, sw, ts });
    if (!host && editing.on) exitEdit();
    afterEditRender('lobby');
  }
  /* 大厅（2026-11-13 用户挑定的新版）：
   *  ① 头部和主页一致：小一号的插画 +「百变小咪」，房间号在下面当主角
   *  ② 座位按出牌顺序编号（坐着的人按座位顺序轮流出），自己用朱红描边标出、不再写「（我）」
   *  ③ 大厅里也能「说一句」（右上角聊天键；对局里那一套）
   *  ④「观战者能看我的手牌」挪进右上角菜单的「设置」，房间页只留这一局的事
   *  ⑤ 邀请直接：房间号旁「复制链接」「二维码」，二维码就地展开给旁边的人扫 */
  let lobbyQr = false;
  function renderLobbyV2(st, o) {
    const { host, me, rules, seated, shownSeats, row, sw, ts } = o;
    const order = seated.slice().sort((a, b) => a.seat - b.seat).map((p) => p.seat);
    /* 组队（2026-11-18 联机）：座位按顺序分段就是分队——前 k 个一队、再 k 个一队……；每段一块队色底板，头像底色也换成队色（我那队永远蓝）。
     * 想换队：坐到别的队的空位上（或房主长按拖）；房主多一颗「随机分队」。「随机打乱」的座次开局再洗 */
    const teamOn = rules.mode === 'team', form = teamOn ? R.TEAM_FORMS[rules.teamForm] : null, tsize = form ? form[0] : 0, teamN = form ? form.reduce((a, b) => a + b, 0) : 0;
    const mineSeat = (seated.find((x) => x.id === me) || {}).seat;
    const myBlock = teamOn && mineSeat != null && mineSeat < teamN ? Math.floor(mineSeat / tsize) : 0;
    const relTeam = (seat) => (teamOn && seat < teamN ? (Math.floor(seat / tsize) - myBlock + form.length) % form.length : -1);
    const tint = (svg, seat) => { const k = relTeam(seat); return k >= 0 ? svg.replace(/(<circle cx="32" cy="32" r="32" fill=")#[0-9a-fA-F]{3,8}/, '$1' + TEAM_BG[k]) : svg; };
    const seatHtml = (seat) => {
      const p = seated.find((x) => x.seat === seat);
      if (!p) return '<button type="button" class="zm-lseat is-empty" data-seat="' + seat + '"><span class="av">+</span><b>' + (host ? T('lobby.addBot', '加机器猫') : T('lobby.empty', '空位')) + '</b><small>' + (st.spectator ? T('lobby.sitHere', '坐这里') : host ? '' : T('lobby.moveHere', '换到这')) + '</small></button>';
      const av = p.avatar && AV && AV.byId[p.avatar] ? tint(AV.byId[p.avatar].svg, seat) : '<span>' + esc(p.nick.slice(0, 1)) + '</span>';
      const tag = p.isAi ? AI.TIER_NAMES[p.aiLevel] || AI.TIER_NAMES.normal : p.id === st.hostId ? T('ui.host', '房主') : !p.online ? T('ui.tag.offline', '掉线') : '';
      const short = !p.isAi && st.short && st.short.ids.indexOf(p.id) >= 0;   // 这局门票不够（房主点开始时服务器查的）
      return '<button type="button" class="zm-lseat' + (p.id === me ? ' is-me' : '') + (p.isAi ? ' is-bot' : '') + (short ? ' is-short' : '') + '" data-seat="' + seat + '"><i class="ord">' + (order.indexOf(seat) + 1) + '</i>' + (short && WAL ? '<i class="zm-need">' + WAL.FISH + '</i>' : '') + '<span class="av">' + av + '</span><b>' + esc(p.nick) + '</b><small>' + esc(tag) + '</small></button>';
    };
    const url = NET.inviteUrl(st.code);
    const tools = '<div class="zm-lobby-tools">' + ($('zmChatBtn') && social && socialOk() ? '<button type="button" class="zm-tool" data-l="chat" aria-label="' + T('ui.chat', '聊天') + '">' + $('zmChatBtn').innerHTML + '</button>' : '') +
      '<button type="button" class="zm-tool" data-l="menu" aria-label="' + T('ui.menu', '菜单') + '">' + $('zmMenuBtn').innerHTML + '</button></div>';
    lobbyEl.innerHTML = tools + '<div class="zm-lobby-inner is-v2">' +
      '<div class="zm-lobby-brand"><div class="art">' + ART.hero() + '</div><b>' + T('game.name', '百变小咪') + '</b></div>' +
      '<div class="zm-lobby-code"><div><small>' + T('ui.roomCode', '房间号') + '</small><b>' + esc(st.code) + '</b></div>' +
        '<div class="acts"><button type="button" class="zm-pill" data-l="copy">' + T('ui.invite.copy', '复制链接') + '</button><button type="button" class="zm-pill' + (lobbyQr ? ' is-on' : '') + '" data-l="qr">' + T('lobby.qr', '二维码') + '</button></div></div>' +
      (lobbyQr ? '<div class="zm-lobby-qr" data-qr></div>' : '') +
      (teamOn
        ? '<div class="zm-lobby-seats is-team' + (tsize === 2 ? ' is-pairs' : '') + '">' + form.map((k, b) => '<div class="zm-lteam" style="--k:' + k + ';--tc:' + TEAM_PIP[(b - myBlock + form.length) % form.length] + ';--tbg:' + TEAM_BG[(b - myBlock + form.length) % form.length] + '">' + Array.from({ length: k }, (_, i) => seatHtml(b * tsize + i)).join('') + '</div>').join('') +
          (shownSeats > teamN ? '<div class="zm-lteam is-extra"><small>' + T('lobby.extra', '多出来的（挪进队里才能开始）') + '</small>' + Array.from({ length: shownSeats - teamN }, (_, i) => seatHtml(teamN + i)).join('') + '</div>' : '') + '</div>'
        : '<div class="zm-lobby-seats">' + Array.from({ length: shownSeats }, (_, i) => seatHtml(i)).join('') + '</div>') +
      (st.spectators.length ? '<p class="zm-muted zm-lobby-watch">' + T('lobby.watching', '{n} 个人在观战', { n: st.spectators.length }) + (st.spectator ? T('lobby.inclYou', '（包括你）') : '') + '</p>' : '') +
      recordHtml(st.record, 1) +
      '<section class="zs-card zs-b zm-lobby-rules">' +
      '<div class="zs-line"><span>' + T('ui.set.mode', '玩法') + '</span><div class="zs-seg" role="group">' + SOLO_MODES.map(([v, tx]) => '<button type="button" data-mode="' + v + '" aria-pressed="' + (rules.mode === v) + '"' + (host ? '' : ' disabled') + '>' + tx + '</button>').join('') + '</div></div>' +
      (teamOn ? '<div class="zs-line"><span>' + T('lobby.players', '人数') + '</span><div class="zs-seg" role="group">' + nRowHtml(teamN, host ? '' : ' disabled') + '</div></div>' +
        '<div class="zs-line"><span>' + T('lobby.split', '分法') + '</span><div class="zs-seg" role="group">' + formsOf(teamN).map((f) => '<button type="button" data-form="' + f + '" aria-pressed="' + (rules.teamForm === f) + '"' + (host ? '' : ' disabled') + ' aria-label="' + f + '">' + pipHtml(f) + '</button>').join('') + '</div></div>' +
        '<div class="zs-line"><span>' + T('ui.team.seats', '座位') + '</span><div class="zs-seg" role="group">' + [['together', T('ui.team.together', '同队坐一起')], ['random', T('ui.team.shuffle', '随机打乱')]].map(([v, tx]) => '<button type="button" data-tseat="' + v + '" aria-pressed="' + (rules.teamSeat === v) + '"' + (host ? '' : ' disabled') + '>' + tx + '</button>').join('') + '</div></div>' : '') +
      '</section>' + ruleChipsHtml(rules, ts, true) +   // 规则：和单机开局单同一排小规则牌，点开规则页（房主改，别人只看）
      (host ? '' : '<p class="zm-muted zm-lobby-note">' + T('lobby.hostRules', '规则由房主定') + '</p>') +
      '<div class="zm-lobby-actions"><button type="button" class="zm-btn" data-l="leave">' + T('ui.leaveRoom', '离开房间') + '</button>' +
      (host && teamOn ? '<button type="button" class="zm-btn" data-l="tshuffle">' + T('lobby.shuffleTeams', '随机分队') + '</button>' : '') +
      (host ? (teamOn
        ? (() => { const extra = seated.filter((p) => p.seat >= teamN).length, lack = teamN - seated.filter((p) => p.seat < teamN).length; return '<button type="button" class="zm-btn zm-btn-primary" data-l="start"' + (lack || extra ? ' disabled' : '') + '>' + (lack ? T('lobby.startLack', '开始（还差 {n} 人）', { n: lack }) : extra ? T('lobby.moveExtra', '先把多出来的人挪进队里') : T('lobby.startN', '开始（{n} 人）', { n: teamN })) + '</button>'; })()
        : '<button type="button" class="zm-btn zm-btn-primary" data-l="start"' + (seated.length >= 2 ? '' : ' disabled') + '>' + T('lobby.startN', '开始（{n} 人）', { n: seated.length }) + '</button>')
        : '<span class="zm-lobby-wait">' + T('lobby.waitHost', '等房主开始…') + '</span>') + '</div></div>';
    const qr = lobbyEl.querySelector('[data-qr]');
    if (qr) { if (window.GamesShell && GamesShell.QR) { try { GamesShell.QR.render(qr, url, { scale: 4, margin: 2, dark: '#1d1b18', light: '#fbf8f1' }); } catch (_) { qr.remove(); } } else qr.remove(); }
  }
  /* 房间页的规则页（2026-11-26）：弹出来，房主改了马上发给服务器（照旧走 config）；别人点开同一页、控件灰着只能看 */
  function lobbyRules() {
    if (!online || !online.st) return;
    const host = isHost(), cfg = online.st.config || {};
    const cur = { rules: R.normalizeRules(cfg.rules), ts: ruleTs(cfg.turnSec) };
    const title = () => modeName(cur.rules.mode) + ' · ' + T('ui.rules.edit', '规则');
    openDialog('<div class="zr-dlg" data-rules-root>' + rulePageHtml(title(), cur.rules, cur.ts, host) + '</div>', (d) => {
      d.classList.add('zs', 'zs-b', 'is-rulepg');
      bindRulePage(d.querySelector('[data-rules-root]'), {
        get: () => cur,
        set: (p) => {
          if (!host) return;
          if (p.turnSec != null) { cur.ts = p.turnSec; onlineAct('config', { config: { turnSec: p.turnSec } }); }
          if (p.rules) { cur.rules = R.normalizeRules(Object.assign({}, cur.rules, p.rules)); onlineAct('config', { config: { rules: p.rules } }); }
        },
        back: closeDialog,
        title,
      });
    });
  }
  function onLobbyClick(e) {
    if (!online || !online.st) return;
    const st = online.st, host = isHost();
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.l === 'invite') { showInvite(); return; }
    if (b.dataset.l === 'qr') { lobbyQr = !lobbyQr; renderLobby(st); return; }
    if (b.dataset.l === 'menu') { toggleMenu(e); return; }
    if (b.dataset.l === 'chat') { if (social && socialOk()) { social.openChat(b); popTail(b); } return; }
    if (b.dataset.l === 'copy') {
      const url = NET.inviteUrl(st.code);
      (async () => { try { if (navigator.share && /Mobi|Android|iPhone/.test(navigator.userAgent)) { await navigator.share({ title: T('ui.invite.share', '来玩百变小咪'), text: T('ui.room.title', '房间 {code}', { code: st.code }), url }); return; } await navigator.clipboard.writeText(url); toast(T('ui.invite.copiedLink', '链接复制好了')); } catch (_) { toast(T('ui.invite.noCopy', '复制不了，点「二维码」让朋友扫')); } })();
      return;
    }
    if (b.dataset.l === 'leave') { leaveOnline(true); return; }
    if (b.dataset.l === 'start') { b.disabled = true; onlineAct('start'); return; }
    if (b.matches('[data-rules-open]')) { lobbyRules(); return; }
    if (b.dataset.turn != null) { onlineAct('config', { config: { turnSec: +b.dataset.turn } }); return; }
    if (b.dataset.deck != null) { onlineAct('config', { config: { rules: { deckSize: b.dataset.deck } } }); return; }
    if (b.dataset.mode != null) { onlineAct('config', { config: { rules: { mode: b.dataset.mode } } }); return; }   // 经典 / 百变 / 组队 / 角色（和单机设置单同一排）
    if (b.dataset.form != null) { onlineAct('config', { config: { rules: { teamForm: b.dataset.form } } }); return; }
    if (b.dataset.tn != null) { const f = formsOf(+b.dataset.tn)[0]; if (f && R.teamPlayers(R.normalizeRules(((online.st && online.st.config) || {}).rules)) !== +b.dataset.tn) onlineAct('config', { config: { rules: { teamForm: f } } }); return; }
    if (b.dataset.tseat != null) { onlineAct('config', { config: { rules: { teamSeat: b.dataset.tseat } } }); return; }
    if (b.dataset.l === 'tshuffle') { onlineAct('team_shuffle'); snd('shuffle'); return; }
    if (b.dataset.rule) {
      const k = b.dataset.rule, on = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(on));
      onlineAct('config', { config: { rules: k === 'hideIns' ? { insertSeen: !on } : { [k]: k === 'extraDefuse' ? (on ? 'all' : 'two') : on } } });
      return;
    }
    if (b.dataset.seat == null) return;
    const seat = +b.dataset.seat;
    const p = st.players.find((x) => x.seat === seat && !x.left);
    if (st.spectator) { if (!p || p.isAi) onlineAct('sit', { seat }); return; }
    if (!p) { if (host) onlineAct('add_ai', { seat, level: botLevel() }); else onlineAct('sit', { seat }); return; }   // 新加的机器猫跟上一只同档（2026-11-20 用户：每次都要从普通调到高手太麻烦）
    if (p.id === st.me) { showProfile(); return; }
    if (p.isAi) {
      if (!host) { onlineAct('sit', { seat }); return; }
      openDialog('<h2>' + esc(p.nick) + '</h2><div class="zs-seg" role="group">' + AI.TIERS.map((t) => '<button type="button" data-tier="' + t + '" aria-pressed="' + (t === p.aiLevel) + '">' + AI.TIER_NAMES[t] + '</button>').join('') + '</div>' +
        '<div class="zm-actions"><button type="button" class="zm-btn" data-sit>' + T('lobby.iSitHere', '我坐这里') + '</button><button type="button" class="zm-btn" data-rm>' + T('lobby.remove', '移走') + '</button><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>' + T('ui.ok', '好') + '</button></div>', (d) => {
        d.classList.add('zs');
        d.querySelectorAll('[data-tier]').forEach((x) => x.addEventListener('click', () => { d.querySelectorAll('[data-tier]').forEach((y) => y.setAttribute('aria-pressed', String(y === x))); botLevel(x.dataset.tier); onlineAct('set_ai', { seat, level: x.dataset.tier }); }));
        d.querySelector('[data-rm]').addEventListener('click', () => { closeDialog(); onlineAct('remove_ai', { seat }); });
        d.querySelector('[data-sit]').addEventListener('click', () => { closeDialog(); onlineAct('sit', { seat }); });
        d.querySelector('[data-ok]').addEventListener('click', closeDialog);
      });
      return;
    }
    if (host) hostPersonMenu(p, { lobby: true });   // 换座位：长按进编辑模式拖
  }
  /* 房主操作用图标（2026-11-14 用户：托管 / 禁言 / 请离都用图标，不写字；长按 / 悬停有说明） */
  const HOST_IC = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="8" width="15" height="11" rx="3.5"/><path d="M12 4.5V8M9 13v1.2M15 13v1.2M2.5 13v2.5M21.5 13v2.5"/></svg>',
    unauto: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="8" width="15" height="11" rx="3.5"/><path d="M12 4.5V8M9 13v1.2M15 13v1.2M3 3l18 18"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z"/><path d="M3 3l18 18"/></svg>',
    unmute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z"/><path d="M8.5 11h7"/></svg>',
    kick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M11 12h10M17.5 8.5 21 12l-3.5 3.5"/></svg>',
    view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/></svg>',
  };
  const icBtn = (attr, ic, label) => '<button type="button" class="zm-icbtn" ' + attr + ' aria-label="' + label + '" title="' + label + '">' + ic + '</button>';
  /* 房主点一个真人：托管（牌局里还活着才有）/ 禁言 / 请离，房主出局后还多一个「坐他身后看」。换座位改成长按进编辑模式拖 */
  function hostPersonMenu(p, o) {
    const st = online && online.st;
    if (!st) return;
    const g = st.game, seat = p.seat;
    const inGame = !o.lobby && g && !g.over;
    const auto = inGame && g.auto && g.auto[seat];
    const alive = inGame && g.st && g.st.alive && g.st.alive[seat];
    const status = [!p.online ? T('ui.st.offline', '掉线了') : '', auto ? T('ui.st.auto', '托管中') : '', p.muted ? T('ui.st.muted', '已禁言') : ''].filter(Boolean).join(' · ');
    openDialog('<h2>' + esc(p.nick) + '</h2>' + (status ? '<p class="zm-muted">' + status + '</p>' : '') +
      '<div class="zm-host-icons">' +
      (o.view ? icBtn('data-view', HOST_IC.view, T('ui.host.view', '坐他身后看')) : '') +
      (alive ? icBtn('data-auto', auto ? HOST_IC.unauto : HOST_IC.auto, auto ? T('ui.btn.unauto', '取消托管') : T('ui.host.auto', '让他托管')) : '') +
      icBtn('data-mute', p.muted ? HOST_IC.unmute : HOST_IC.mute, p.muted ? T('ui.host.unmute', '解除禁言') : T('ui.host.mute', '禁言')) +
      icBtn('data-kick', HOST_IC.kick, T('ui.host.kick', '请他离开')) +
      '</div><div class="zm-actions"><button type="button" class="zm-btn zm-btn-primary" data-ok data-focus>' + T('ui.ok', '好') + '</button></div>', (d) => {
      d.querySelector('[data-ok]').addEventListener('click', closeDialog);
      const vb = d.querySelector('[data-view]');
      if (vb) vb.addEventListener('click', () => { closeDialog(); o.view(); });
      const ab = d.querySelector('[data-auto]');
      if (ab) ab.addEventListener('click', () => { closeDialog(); onlineAct('host_auto', { seat, on: !auto }).then((r) => { if (r) toast(auto ? T('ui.host.autoOff', '已取消{who}的托管', { who: p.nick }) : T('ui.host.autoOn', '{who}改由机器猫托管（他点自己头像能收回）', { who: p.nick })); }); });
      d.querySelector('[data-mute]').addEventListener('click', () => { closeDialog(); onlineAct('mute', { pid: p.id, on: !p.muted }).then((r) => { if (r) toast(p.muted ? T('ui.host.unmuted', '已解除{who}的禁言', { who: p.nick }) : T('ui.host.muted', '已禁言{who}', { who: p.nick })); }); });
      d.querySelector('[data-kick]').addEventListener('click', () => askKick(p, inGame));
    });
  }
  function askKick(p, inGame) {
    const bot = p.isAi;
    openDialog('<h2>' + (bot ? T('lobby.removeAsk', '移走{who}？', { who: esc(p.nick) }) : T('lobby.kickAsk', '请{who}离开？', { who: esc(p.nick) })) + '</h2><p class="zm-muted">' + (bot ? T('lobby.removeNote', '这个座位空出来。') : inGame ? T('lobby.kickNoteGame', '这一局他那一座交给机器猫打完，打完就把他移出房间。') : T('lobby.kickNote', '他会被移出房间。')) + '</p>' +
      '<div class="zm-actions"><button type="button" class="zm-btn" data-cancel>' + T('ui.nevermind', '算了') + '</button><button type="button" class="zm-btn zm-btn-primary" data-yes>' + (bot ? T('lobby.remove', '移走') : T('ui.host.kick', '请他离开')) + '</button></div>', (d) => {
      d.querySelector('[data-cancel]').addEventListener('click', closeDialog);
      d.querySelector('[data-yes]').addEventListener('click', () => { closeDialog(); onlineAct(bot ? 'remove_ai' : 'kick', bot ? { seat: p.seat } : { pid: p.id }); });
    });
  }

  /* ───── 房主编辑模式（2026-11-14 用户）─────
   * 房间页任何时候、牌桌上一局打完下一局没开的时候：房主长按任意一个头像 → 所有头像跳一下、轻轻晃，可请离的人右上角出一个 ×；
   * 这时按住头像拖到另一个座位上松手 = 两人对调（空位也能拖过去）；点 × = 请他离开（先确认）；点空白处或「完成」退出。
   * 换座的动画：两个人从各自原来的位置滑到新位置；房主自己被换走时整桌一起转，保持「我」在下面（牌桌上）。
   * 打到一半不能换座（座位连着手牌和出牌顺序），只能点头像托管 / 禁言 / 请离 */
  const editing = { on: false, where: null, flip: null };
  let editSuppressClick = false;
  const editSel = (where) => (where === 'lobby' ? '.zm-lseat' : '.zm-seat');
  const editRoot = (where) => (where === 'lobby' ? lobbyEl : els.table);
  const editTableOk = () => { const g = G(); return !!(online && game && game.online && g && g.over && isHost() && !game.spectator); };
  function editPlayer(el, where) {
    const st = online && online.st;
    if (!st || !el) return null;
    const srv = where === 'lobby' ? +el.dataset.seat : srvOf(+el.dataset.seat);
    return { srv, p: st.players.find((x) => x.seat === srv && !x.left) || null };
  }
  function editRemovable(p, where) { return !!(p && p.id !== online.st.me && (!p.isAi || where === 'lobby')); }
  function enterEdit(where) {
    if (!isHost() || (where === 'table' && !editTableOk())) return;
    editing.on = true; editing.where = where;
    applyEdit(true);
    snd('tap');
  }
  function exitEdit() {
    if (!editing.on) return;
    const root = editRoot(editing.where);
    editing.on = false;
    if (root) { root.classList.remove('is-editing'); root.querySelectorAll('.zm-x').forEach((x) => x.remove()); }
    const bar = els.app.querySelector('.zm-edit-bar'); if (bar) bar.remove();
  }
  function applyEdit(bounce) {
    if (!editing.on) return;
    const where = editing.where, root = editRoot(where);
    if (!root || (where === 'table' && !editTableOk())) { exitEdit(); return; }
    root.classList.add('is-editing');
    const seats = Array.from(root.querySelectorAll(editSel(where)));
    seats.forEach((el, i) => {
      const info = editPlayer(el, where);
      let x = el.querySelector(':scope > .zm-x');
      if (editRemovable(info && info.p, where)) { if (!x) { x = document.createElement('span'); x.className = 'zm-x'; x.setAttribute('role', 'button'); x.setAttribute('aria-label', T('ui.host.kick', '请他离开')); x.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9"/></svg>'; el.appendChild(x); } }
      else if (x) x.remove();
      if (bounce && !fx.reduce()) {
        const av = el.querySelector(where === 'lobby' ? '.av' : '.zm-av') || el;
        av.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-9px) scale(1.06)', offset: 0.4 }, { transform: 'translateY(0)' }], { duration: 360, delay: i * 35, easing: 'cubic-bezier(.3,.7,.4,1.4)' });
      }
    });
    // 2026-11-14 用户：不用教房主怎么调座位，让他自己摸索——牌桌上什么面板都不加（点桌面空处就退出，下一局在桌沿右下角的快进键）；
    // 房间页只留一个「完成」
    if (where === 'table') { const b0 = els.app.querySelector('.zm-edit-bar'); if (b0) b0.remove(); return; }
    let bar = els.app.querySelector('.zm-edit-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'zm-edit-bar';
      els.app.appendChild(bar);
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        e.stopPropagation();
        if (b.dataset.e === 'done') exitEdit();
        else if (b.dataset.e === 'rank') { exitEdit(); showRanking(); }
        else if (b.dataset.e === 'next') { b.disabled = true; exitEdit(); onlineAct('next'); }
      });
    }
    bar.innerHTML = '<button type="button" class="zm-btn zm-btn-primary" data-e="done">' + T('ui.finish', '完成') + '</button>';
  }
  // 换座前记下每个人头像在哪（按人认，不按座位）；新状态画好后从旧位置滑过来
  function spotsByPid(where) {
    const out = {};
    const root = editRoot(where);
    if (!root) return out;
    root.querySelectorAll(editSel(where)).forEach((el) => { const info = editPlayer(el, where); const av = el.querySelector(where === 'lobby' ? '.av' : '.zm-av'); if (info && info.p && av) out[info.p.id] = av.getBoundingClientRect(); });
    return out;
  }
  // elapsed：动画已经播了多久——房间页收到同一份状态会整块重画（动作回应 + 长轮询各来一次），重画后接着刚才的进度播，不从头来
  function flipFrom(before, where, elapsed) {
    const root = editRoot(where);
    if (!root || !before || fx.reduce()) return;
    root.querySelectorAll(editSel(where)).forEach((el) => {
      const info = editPlayer(el, where), av = el.querySelector(where === 'lobby' ? '.av' : '.zm-av');
      const old = info && info.p && before[info.p.id];
      if (!old || !av) return;
      const now = av.getBoundingClientRect();
      const dx = old.left + old.width / 2 - (now.left + now.width / 2), dy = old.top + old.height / 2 - (now.top + now.height / 2);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const sc = old.width / Math.max(1, now.width);
      const an = el.animate([{ transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')', zIndex: 5 }, { transform: 'none', zIndex: 5 }], { duration: 480, easing: 'cubic-bezier(.3,.75,.3,1)' });
      if (elapsed) an.currentTime = elapsed;
    });
    if (!elapsed) snd('flip');
  }
  function editSwap(fromEl, toEl, where) {
    const a = editPlayer(fromEl, where), b = editPlayer(toEl, where);
    if (!a || !b || a.srv === b.srv) return;
    // ready：等服务器真换好了再滑（动作回应回来之前的长轮询还是旧座位，别对着旧座位画）
    const flip = editing.flip = { where, before: spotsByPid(where), ready: false };
    onlineAct('swap_seats', { a: a.srv, b: b.srv }).then((r) => {
      if (!r) { editing.flip = null; return; }
      flip.ready = true;
      if (editing.flip !== flip || !online || !online.st) return;
      if (where === 'lobby') renderLobby(online.st); else afterEditRender('table');   // 牌桌：座位已经按新状态重画好了，直接滑
    });
  }
  // 新状态画完之后调用：补上编辑模式的样子，按人把头像滑到新位置
  function afterEditRender(where) {
    if (editing.on && editing.where === where) applyEdit(false);
    const f = editing.flip;
    if (!f || f.where !== where || !f.ready) return;
    if (!f.t0) { f.t0 = performance.now(); flipFrom(f.before, where, 0); return; }
    const el = performance.now() - f.t0;
    if (el >= 480) { editing.flip = null; return; }
    flipFrom(f.before, where, el);
  }
  function startEditDrag(e, el, where) {
    const info = editPlayer(el, where);
    if (!info || !info.p) return;
    const root = editRoot(where), sel = editSel(where);
    const av = el.querySelector(where === 'lobby' ? '.av' : '.zm-av') || el;
    const x0 = e.clientX, y0 = e.clientY;
    let ghost = null, over = null;
    const mv = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        const r = av.getBoundingClientRect();
        ghost = av.cloneNode(true);
        ghost.classList.add('zm-drag-ghost');
        ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
        els.app.appendChild(ghost);
        el.classList.add('is-dragging');
      }
      const r = ghost.getBoundingClientRect();
      ghost.style.left = (ev.clientX - r.width / 2) + 'px'; ghost.style.top = (ev.clientY - r.height / 2) + 'px';
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const t = hit && hit.closest(sel);
      const tgt = t && root.contains(t) && t !== el ? t : null;
      if (tgt !== over) { if (over) over.classList.remove('is-drop'); over = tgt; if (over) over.classList.add('is-drop'); }
    };
    const up = () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (ghost) { ghost.remove(); el.classList.remove('is-dragging'); editSuppressClick = true; }
      if (over) { over.classList.remove('is-drop'); editSwap(el, over, where); }
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  function bindEdit(root, where) {
    const sel = editSel(where);
    root.addEventListener('pointerdown', (e) => {
      if (!online || !isHost() || e.button > 0) return;
      const el = e.target.closest(sel);
      if (!el || !root.contains(el) || e.target.closest('.zm-x')) return;
      if (where === 'table' && !editTableOk()) return;
      if (editing.on && editing.where === where) { startEditDrag(e, el, where); return; }
      // 长按 0.45 秒进编辑模式（手指没挪）
      const x0 = e.clientX, y0 = e.clientY;
      const timer = setTimeout(() => { done(); editSuppressClick = true; if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) { /* */ } } enterEdit(where); }, 450);
      const mv = (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) done(); };
      const done = () => { clearTimeout(timer); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', done); window.removeEventListener('pointercancel', done); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', done); window.addEventListener('pointercancel', done);
    }, true);
    root.addEventListener('click', (e) => {
      if (editSuppressClick) { editSuppressClick = false; e.stopPropagation(); e.preventDefault(); return; }
      if (!editing.on || editing.where !== where) return;
      const x = e.target.closest('.zm-x');
      if (x) { e.stopPropagation(); const info = editPlayer(x.closest(sel), where); if (info && info.p) askKick(info.p, false); return; }
      if (e.target.closest(sel)) { e.stopPropagation(); return; }   // 编辑模式里点头像不弹别的
      if (e.target.closest('button, .zs-card, input, .zm-edit-bar')) return;   // 房间页的规则开关照常能点
      e.stopPropagation(); exitEdit();
    }, true);
  }
  bindEdit(els.table, 'table');

  /* ───── 绑定 ───── */
  // 长按不选字、不弹系统菜单（微信里会弹「搜一搜 / 翻译」）；输入框照常
  const editable = (t) => t && t.closest && t.closest('input, textarea, [contenteditable="true"]');
  els.app.addEventListener('selectstart', (e) => { if (!editable(e.target)) e.preventDefault(); });
  els.app.addEventListener('contextmenu', (e) => { if (!editable(e.target)) e.preventDefault(); });
  $('zmCoverArt').innerHTML = ART.hero();
  // 彩蛋：鼠标经过（或点一下）封面上的炸弹猫，它就炸两下毛、掉几根毛（平时每隔几秒自己也会抖一下，见 CSS）
  (function heroEgg() {
    const g = $('zmCoverArt').querySelector('.hero-boom');
    if (!g) return;
    let busyEgg = false;
    const poke = () => {
      if (busyEgg || fx.reduce()) return;
      busyEgg = true;
      snd('hiss');
      g.animate([
        { transform: 'scale(1)' }, { transform: 'scale(1.13) rotate(-5deg)', offset: 0.14 }, { transform: 'scale(1.04) rotate(4deg)', offset: 0.3 },
        { transform: 'scale(1.14) rotate(-4deg)', offset: 0.48 }, { transform: 'scale(1.05) rotate(3deg)', offset: 0.66 }, { transform: 'scale(1)' },
      ], { duration: 720, easing: 'ease-out' }).finished.then(() => { busyEgg = false; }, () => { busyEgg = false; });
      const r = g.getBoundingClientRect(), c = fx.center(r);
      fx.burst(c.x, c.y, { n: 10, shapes: ['fur'], colors: FUR, radius: r.width * 0.55, size: [6, 14], alignOut: true, life: 700, gravity: 30, pattern: 'ring', delay: 60 });
    };
    g.style.cursor = 'pointer';
    g.addEventListener('pointerenter', poke);
    g.addEventListener('click', poke);
    // 逗猫棒：鼠标经过（或点一下）就猛挥几下、甩出几颗心
    const h = $('zmCoverArt').querySelector('.hero-wand');
    if (h) {
      let busyH = false;
      const wave = () => {
        if (busyH || fx.reduce()) return;
        busyH = true;
        snd('ding');
        h.animate([{ rotate: '0deg' }, { rotate: '-16deg', offset: 0.2 }, { rotate: '14deg', offset: 0.45 }, { rotate: '-12deg', offset: 0.7 }, { rotate: '0deg' }], { duration: 760, easing: 'ease-in-out', composite: 'add' })
          .finished.then(() => { busyH = false; }, () => { busyH = false; });
        const r = h.getBoundingClientRect();
        ['heart', 'note', 'heart'].forEach((sh, i) => fx.float(r.left + r.width * (0.15 + i * 0.12), r.top + r.height * 0.3, sh, { dy: -40, dx: (i - 1) * 8, size: 14 + i * 3, color: sh === 'heart' ? PINKS[i % 3] : '#4f8a5f', delay: 60 + i * 90, dur: 900 }));
      };
      h.style.cursor = 'pointer';
      h.addEventListener('pointerenter', wave);
      h.addEventListener('click', wave);
    }
    // 炸弹猫头顶一直冒火星（只在主页露着的时候）
    setInterval(() => {
      if (els.cover.hidden || fx.reduce() || document.hidden) return;
      const r = g.getBoundingClientRect();
      if (!r.width) return;
      fx.burst(r.left + r.width * 0.5, r.top + r.height * 0.06, { n: 3, shapes: ['dot', 'star'], colors: ['#e9d46a', '#f28a2e', '#c8463a'], radius: 18, size: [3, 8], life: 480, gravity: -8, pattern: 'fountain' });
    }, 260);
  })();
  els.cover.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cover]');
    if (!b) return;
    const k = b.dataset.cover;
    if (performance.now() < ghostUntil && !b.closest('.zm-setsheet-mask')) { ghostUntil = 0; return; }   // 甩收设置单的余波，不是真点
    // 单机：有上一局 → 先问「接着打 / 开新的一局」；没有就直接选人数
    // 2026-11-13 用户：没有没打完的局 → 点单机直接到选人数（不经过「接着打 / 开新的」那一步）；新手教程 · 设置这时挂在选人数那屏底下
    if (k === 'solo') { openSheet('solo'); return; }
    if (k === 'sheet-close') { closeSheet(); return; }
    if (k === 'start') {
      settings.players = Math.min(SOLO_MAX, settings.players);
      // 小鱼干（2026-11-22 用户）：先在主页面放完扣门票（门票飘到「开始」键上），放完才进牌桌——别让半截动画留在新页面里
      if (WAL && WAL.playTicket) {
        if (b.disabled) return;
        b.disabled = true;
        // 放到一半被打断（点了别的、设置单被收起）：不开局
        WAL.playTicket(settings.tier, curMode(), soloN()).then((ok) => { b.disabled = false; if (ok !== false && !els.cover.hidden && !sheetMask.hidden) soloStart(); });
        return;
      }
      soloStart(); return;
    }
    if (k === 'resume-solo') { const saved = loadSaved(); if (saved) resumeGame(saved); else refreshSolo(); return; }
    if (k === 'online') { showOnlineEntry(); return; }
    if (k === 'create') { onlineCreate(); return; }
    if (k === 'join') { onlineJoin('play'); return; }
    if (k === 'watch') { onlineJoin('watch'); return; }
    if (k === 'resume') { const sess = NET && NET.readSession(); if (sess) resumeOnline(sess); return; }
    if (k === 'tutorial') startTutorial();
    else if (k === 'settings') showSettings(true);
    else if (k === 'exit') location.href = '/toolbox/';
  });
  // 加入房间：只收数字、满 4 位「加入」变朱红、回车 = 加入
  // 点回输入框：揭掉提示，原来的号整段选中——直接打新号就替换掉，不用先删
  // （按回车加入的话光标本来就在框里，不会再触发 focus，所以按下也算）
  const joinRetry = (e) => { if (!$('zmJoinGone').hidden) { joinGone(false); const inp = e.currentTarget; setTimeout(() => inp.select(), 0); } };
  $('zmJoinCode').addEventListener('focus', joinRetry);
  $('zmJoinCode').addEventListener('pointerdown', joinRetry);
  $('zmJoinCode').addEventListener('input', (e) => {
    joinGone(false);
    const inp = e.target;
    inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
    $('zmOnlineErr').hidden = true;
    joinReady();
  });
  $('zmJoinCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') onlineJoin('play'); });
  els.cover.querySelector('.zm-solo-pick').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.matches('[data-rules-open]')) { soloRulePage(true); return; }
    if (b.dataset.n) {
      settings.players = Math.max(R.MIN_PLAYERS, Math.min(SOLO_MAX, settings.players + +b.dataset.n));
      saveSettings(); refreshSolo();
      fx.pop($('zmSoloNum'), { scale: 1.12, dur: 220 });
      const fs = $('zmSoloFaces').children, last = fs[fs.length - 1];
      if (+b.dataset.n > 0 && last) fx.pop(last, { scale: 1.3, dur: 260 });
      snd('tick');
    } else if (b.dataset.tier) {
      settings.tier = b.dataset.tier;
      saveSettings(); refreshSolo();
      snd('tap');
    } else if (b.dataset.form || b.dataset.seat || b.dataset.tn) {   // 组队：人数 / 分法 / 座位（换人数时分法取这个人数的第一种：两队优先）
      const tf = b.dataset.tn ? formsOf(+b.dataset.tn)[0] : b.dataset.form;
      if (b.dataset.tn && R.teamPlayers(R.normalizeRules(settings.rules)) === +b.dataset.tn) return;
      settings.rules = R.normalizeRules(Object.assign({}, settings.rules, tf ? { teamForm: tf } : { teamSeat: b.dataset.seat }));
      if (b.dataset.tn) fx.pop($('zmSoloFaces'), { scale: 1.06, dur: 220 });
      saveSettings(); refreshSolo();
      if (b.dataset.form) fx.pop($('zmSoloFaces'), { scale: 1.06, dur: 220 });
      snd('tick');
    }
  });
  els.me.addEventListener('click', (e) => {
    if (!e.target.closest('.zm-av')) return;
    // 自由甩锅甩给自己（2026-11-26 用户：用来发育）：选人时 / 牌在往桌上飞时 / 选好牌还没按出牌时点自己的头像 = 甩给自己
    if (game && !game.spectator && game.state && game.state.alive[0]) {
      const c = !busy && selected.length && mode == null && myTurnToAct() && els.mask.hidden ? classifyMine(selected) : null;
      if ((mode === 'target' && els.me.classList.contains('is-target')) || (preview && mode !== 'target') || (c && c.needsTarget && R.validTargets(game.state, 0, c.type).indexOf(0) >= 0)) { onSeatTap(0); return; }
    }
    // 出局后在看别人：点下面这个头像回到自己座位
    if (game && game.online && game.spectator && online && online.st && online.st.mySeat >= 0 && online.base !== online.st.mySeat) { onlineView(online.st.mySeat); return; }
    if (game && !game.online && game.spectator) { if (!game.dealing && game.state.phase !== 'over') watch(0, true); return; }
    if (canAuto() && !game.dealing) setAutopilot(!autopilot);
  });
  els.drawBtn.addEventListener('click', onDraw);
  els.playBtn.addEventListener('click', onPlay);
  // 座位滑进弧形（transform 过渡 0.35 秒）结束时再摆一次箭头：开局那一下量到的是滑动前的位置（2026-11-13 8 人局箭头没对上名字）
  els.opps.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform' && e.target.classList && e.target.classList.contains('zm-seat')) placeDir(); });
  els.nopeBtn.addEventListener('click', pressNope);
  els.nopeBtn.insertAdjacentHTML('afterbegin', '<i class="zm-nope-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6 18.4 18.4"/></svg></i>');
  els.nopeBtn.setAttribute('aria-label', R.NAMES.nope);
  els.cancelBtn.addEventListener('click', cancelTarget);
  els.skipTut.addEventListener('click', skipTutorial);
  $('zmPauseBtn').addEventListener('click', () => { if (game && game.online) { if (isHost() && G() && !G().paused) onlineAct('pause', { on: true }); return; } pauseGame(); });
  $('zmRankBtn').addEventListener('click', (e) => { e.stopPropagation(); showRoomRank(); });
  $('zmRulesBtn').addEventListener('click', showRules);
  $('zmMenuBtn').addEventListener('click', toggleMenu);
  $('zmSoundBtn').addEventListener('click', toggleSoundPanel);
  // 联机排行榜也能点外面收起（2026-11-14：排行榜挪到了顶栏，随时能再打开；收起后房主在桌沿右下角点 ⏭ 开下一局）
  // 点窗外关窗只给「看看就走」的窗（规则 / 提示 / 结算）。要我拿主意的（塞炸弹猫 / 改命 / 救队友 / 偷牌 / 点名）点窗外不关——
  // 2026-11-19 用户：手机上塞炸弹猫时点到窗外，窗没了、游戏等不到我塞哪，整局卡死。现在点窗外只晃一下主按钮提醒
  const MUST_ACT = '[data-fan], [data-alter], [data-rescue], [data-steal], [data-range], .zm-grid';
  els.mask.addEventListener('click', (e) => {
    if (e.target !== els.mask) return;
    if (els.dialog.querySelector(MUST_ACT)) { const b = els.dialog.querySelector('.zm-btn-primary'); if (b) shake(b); return; }
    // 结算页（2026-11-22 用户：点了别处整页就关掉、回到刚打完的牌桌，也没有后续提示）：只认那几个键，点别处原地不动、「再来一局 / 下一局」晃一下
    if (!els.dialog.classList.contains('is-pause') && els.dialog.querySelector('[data-again], [data-next], [data-leave]')) { const b = els.dialog.querySelector('.zm-btn-primary') || els.dialog.querySelector('[data-leave]'); if (b) shake(b); return; }
    if (els.dialog.querySelector('[data-ok]') || els.dialog.querySelector('.zm-rank')) { const cb = closeDialog(); if (cb) cb(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheetMask.hidden) { if (!$('zmSoloRulePg').hidden) soloRulePage(false); else closeSheet(); return; }
    if (e.key === 'Escape' && mode === 'target') cancelTarget();
    if ((e.key === 'Escape' || e.key === 'Enter') && game && game.peekDone) game.peekDone();
  });
  // 点空白处：发牌中=跳过发牌；否则取消选牌 / 取消点人
  els.table.addEventListener('click', (e) => {
    if (game && game.dealing && !game.tutorial && !game.online) { skipDeal(); return; }   // 2026-11-20 用户在三版里挑甲：直接切到发完
    if (e.target.closest('.zm-card, .zm-btn, .zm-seat, .zm-tool, .zm-coach')) return;
    if (mode === 'target') { cancelTarget(); return; }
    if (selected.length && mode !== 'give') { selected = []; renderHand(); renderBand(); }
  });
  window.addEventListener('resize', recheckSize);
  window.addEventListener('resize', () => { if (game) { game.watchOrd = null; fitWatchRow(); } });   // 转屏 / 拉窗口：观战小头像跟着重新分行
  if (LANDSCAPE_SHORT.addEventListener) LANDSCAPE_SHORT.addEventListener('change', () => { sizeW = 0; recheckSize(); });   // 横竖屏切换：一定重算（不管宽度差多少）
  refreshSoundBtn();
  initSocial();
  if (WAL) WAL.mountChip(els.cover);   // 主菜单左上角：小鱼干余额，点了去猫咪档案
  if (WAL && WAL.mountTable) WAL.mountTable(els.app.querySelector('.zm-topleft'));   // 牌桌左上角常驻小鱼干（2026-11-26 用户挑方案 A：标题位换成余额，结算加减、扣门票都往这里游）
  if (WAL) WAL.onNoScore = (g) => { if (g === game) toast(T('ui.wallet.noScore', '这局不计小鱼干（门票没扣上）')); };   // 2026-11-24：服务器没发票时不再悄悄白玩
  refreshCover();
  refreshTools();
  // 进来先是主菜单 + 一条进度条（等字体到位，太快也让它走完一程，不闪），跑完换成按钮
  (function boot() {
    applyCardSize();
    coverStep('load');
    els.cover.classList.add('is-loading');   // 加载时插画 + 标题在屏幕正中
    bgm('menu');   // 主页的丁：浏览器要等第一次点按才出声
    coverIntro(true);
    const bar = els.cover.querySelector('.zm-cover-load i');
    let got = 0.12;
    const bump = (to) => { got = Math.max(got, to); bar.style.transform = 'scaleX(' + got.toFixed(3) + ')'; };
    const sleep = (t) => new Promise((r) => setTimeout(r, t));
    const t0 = performance.now();
    bump(0.3);
    // 自带字体（2026-11-26 用户：游戏资产上的字要固定样式）：进度条这段时间里把 ZM Serif 常规 / 粗体、ZM Num 等到位，每到一个进度条往前走一截；
    // 最多等 4 秒，到点照常进游戏（先用系统字体，字体晚到了浏览器自动换上），不会卡在加载页
    const zmFaces = ['400 16px "ZM Serif"', '700 16px "ZM Serif"', '700 16px "ZM Num"'];
    const fontsIn = document.fonts && document.fonts.load
      ? Promise.all(zmFaces.map((f) => document.fonts.load(f, '百变小咪1').catch(() => null).then(() => bump(got + 0.15)))).then(() => document.fonts.ready)
      : Promise.resolve();
    Promise.race([fontsIn, sleep(4000)]).then(async () => {
      bump(0.75);
      await sleep(Math.max(0, 900 - (performance.now() - t0)));
      bump(1);
      await sleep(240);
      if (!els.cover.hidden) coverReveal();
      // 联机：邀请链接 ?room=1234 → 直接弹「加入」；上次的房间还在 → 直接接回去
      const invite = (new URLSearchParams(location.search).get('room') || '').replace(/\D/g, '').slice(0, 4);
      const sess = NET && NET.readSession();
      if (sess && (!invite || invite === sess.code)) { if (await resumeOnline(sess)) return; }
      if (invite && NET && !online) showOnlineEntry(invite);
    });
  })();

  // 本机调试：__zmDebug.demo('boom') 之类，单独放一段动画看效果（见 demo()）
  function demo(name) {
    if (!game) newGame();
    game.hl = null;   // 动过手脚的局不发日志
    const s = game.state;
    resetTable();
    els.app.querySelectorAll('.zm-bubble').forEach((b) => b.remove());   // 被打断的机器猫「想一下」的气泡（它那一步不会再来收）
    game.dealing = false;
    const pool = (k) => R.KIND_OF.map((x, id) => (x === k ? id : -1)).filter((id) => id >= 0 && s.hands.every((h) => h.indexOf(id) < 0) && (s.deck.indexOf(id) >= 0 || s.discard.indexOf(id) >= 0 || s.removed.indexOf(id) >= 0));
    const give = (seat, k) => { const id = pool(k)[0]; if (id == null) return; const src = s.deck.indexOf(id) >= 0 ? s.deck : s.discard.indexOf(id) >= 0 ? s.discard : s.removed; src.splice(src.indexOf(id), 1); s.hands[seat].push(id); s.hands[seat] = R.sortHand(s.hands[seat]); };
    const top = (k) => { const id = s.deck.find((x) => R.KIND_OF[x] === k); s.deck.splice(s.deck.indexOf(id), 1); s.deck.unshift(id); };
    const onTop = (k) => { const id = pool(k)[0]; if (id == null) return; const src = s.deck.indexOf(id) >= 0 ? s.deck : s.discard.indexOf(id) >= 0 ? s.discard : s.removed; src.splice(src.indexOf(id), 1); s.deck.unshift(id); };   // 牌堆里没有这种（小牌堆）也从弃牌 / 没用的牌里拿来放顶上
    s.phase = 'act'; s.pending = null;
    const bot = 1 % s.n;
    const setRole = (seat, id) => { if (!s.roles) { s.roles = Array.from({ length: s.n }, (_, k) => R.ROLES[k % R.ROLES.length].id); s.roleUsed = s.roles.map(() => false); } const k = s.roles.indexOf(id); if (k >= 0) s.roles[k] = s.roles[seat]; s.roles[seat] = id; renderAll(); };
    const plays = {
      boom: () => { top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      // 角色猫技能（2026-11-18 改版：亮牌 + 原动作）：who 那一家换成这只角色再演
      roletimid: () => { const nx = R.nextAlive(s, bot); setRole(nx, 'timid'); plays.attack(); },
      rolecow: () => { const nx = R.nextAlive(s, bot); setRole(nx, 'cow'); plays.attack(); },
      // 角色边界（2026-11-26）：胆小猫牌堆只剩 2 张；贪吃猫索要的人只剩 1 张；截胡猫作废成功但对方已经没牌（扑空）；影子猫被两张偷牌指上
      roletimidlow: () => { const nx = R.nextAlive(s, bot); setRole(nx, 'timid'); s.removed.push(...s.deck.splice(2)); plays.attack(); },
      rolefatone: () => { setRole(0, 'fat'); give(0, R.FAVOR); s.removed.push(...s.hands[bot].splice(1)); s.turn = 0; renderAll(); apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.FAVOR)], target: bot }); },
      roletabbymiss: () => { const o = 2 % s.n; setRole(o, 'tabby'); if (R.countKind(s.hands[o], R.NOPE) === 0) give(o, R.NOPE); s.removed.push(...s.hands[bot].splice(0)); give(bot, R.SKIP); s.turn = bot; game.forceNope = [o]; renderAll(); apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SKIP)] }); },
      rolefat: () => { setRole(bot, 'fat'); plays.favor(); },
      rolefatme: () => { setRole(0, 'fat'); give(0, R.FAVOR); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.FAVOR)], target: bot }); },
      rolecalicome: () => { setRole(0, 'calico'); ['orange', 'cow', 'tabby', 'siamese', 'calico'].forEach((k) => give(0, k)); const ck = R.CATS.find((k) => s.deck.some((x) => R.KIND_OF[x] === k)); if (ck) top(ck); s.turn = 0; release(); renderAll(); },   // 我是百搭猫：手里的猫都画成万能猫，顶上放一张猫，摸进来会翻成万能猫
      rolecalico: () => { setRole(bot, 'calico'); give(bot, 'orange'); give(bot, 'siamese'); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], 'orange'), R.findKind(s.hands[bot], 'siamese')], target: 0 }); },
      roletabby: () => { const o = 2 % s.n; setRole(o, 'tabby'); if (R.countKind(s.hands[o], R.NOPE) === 0) give(o, R.NOPE); give(bot, R.SKIP); s.turn = bot; game.forceNope = [o]; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SKIP)] }); },
      roleshadow: () => { setRole(bot, 'shadow'); give(0, 'cow'); give(0, 'cow'); s.turn = 0; release(); renderAll(); step(); },
      boomme: () => { top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      defuse: () => { if (R.countKind(s.hands[bot], R.DEFUSE) === 0) give(bot, R.DEFUSE); top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      stack5: () => { give(bot, R.ATTACK); s.turn = bot; s.turnsLeft = 3; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      stackme: () => { const b = s.n - 1; give(b, R.ATTACK); s.turn = b; s.turnsLeft = 3; apply(b, { type: 'play', cards: [R.findKind(s.hands[b], R.ATTACK)] }); },
      defuseme: () => { if (R.countKind(s.hands[0], R.DEFUSE) === 0) give(0, R.DEFUSE); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      out: () => { top(R.BOOM); s.turn = bot; s.hands[bot] = s.hands[bot].filter((id) => R.KIND_OF[id] !== R.DEFUSE); apply(bot, { type: 'draw' }); },
      draw: () => { s.turn = 0; apply(0, { type: 'draw' }); },
      attack: () => { give(bot, R.ATTACK); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      // 组队（只在组队局里有意义）：队友摸到炸弹猫、手里没逗猫棒、我有 → 问我救不救；队友窥探 / 改命（我该看得到）；我出局后看队友
      rescue: () => { const m = R.mateOf(s, 0); if (m < 0) return; s.hands[m] = s.hands[m].filter((id) => R.KIND_OF[id] !== R.DEFUSE); if (R.countKind(s.hands[0], R.DEFUSE) === 0) give(0, R.DEFUSE); top(R.BOOM); s.turn = m; apply(m, { type: 'draw' }); },
      rescuenone: () => { const m = R.mateOf(s, 0); if (m < 0) return; for (const k of [0, m]) s.hands[k] = s.hands[k].filter((id) => R.KIND_OF[id] !== R.DEFUSE); top(R.BOOM); s.turn = m; apply(m, { type: 'draw' }); },   // 队友炸了、谁都没逗猫棒 → 照样喊救、省略号，然后出局
      rescuerace: () => { const ms3 = R.matesOf(s, 0); if (ms3.length < 2) return; const f = ms3[0], o = ms3[1]; s.hands[f] = s.hands[f].filter((id) => R.KIND_OF[id] !== R.DEFUSE); if (R.countKind(s.hands[0], R.DEFUSE) === 0) give(0, R.DEFUSE); if (R.countKind(s.hands[o], R.DEFUSE) === 0) give(o, R.DEFUSE); top(R.BOOM); s.turn = f; apply(f, { type: 'draw' }); },   // 3 人一队：我和另一个机器猫队友都有，看它抢先救的样子
      rescueme: () => { const m = R.mateOf(s, 0); if (m < 0) return; s.hands[0] = s.hands[0].filter((id) => R.KIND_OF[id] !== R.DEFUSE); if (R.countKind(s.hands[m], R.DEFUSE) === 0) give(m, R.DEFUSE); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      stealmate: () => { const m = R.mateOf(s, 0); if (m < 0) return; const a = [1, 2, 3].find((k) => k !== m); ['orange', 'calico', 'tabby', 'skip', 'shuffle', 'attack'].forEach((k) => give(m, k)); give(a, 'cow'); give(a, 'cow'); s.turn = a; apply(a, { type: 'play', cards: s.hands[a].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: m }); },
      // 组队：对面只剩最后一个人、他摸到炸弹猫没逗猫棒（队友也都出局了）→ 我们队赢，看结算
      teamwin: () => { const foes = Array.from({ length: s.n }, (_, k) => k).filter((k) => R.teamOf(s, k) !== R.teamOf(s, 0)); const last = foes.pop(); foes.forEach((k) => { s.alive[k] = false; s.outOrder.push(k); s.discard.push(...s.hands[k]); s.hands[k] = []; }); s.hands[last] = s.hands[last].filter((id) => R.KIND_OF[id] !== R.DEFUSE); top(R.BOOM); s.turn = last; release(); renderAll(); apply(last, { type: 'draw' }); },
      futuremate: () => { const m = R.mateOf(s, 0); if (m < 0) return; give(m, R.FUTURE); s.turn = m; apply(m, { type: 'play', cards: [R.findKind(s.hands[m], R.FUTURE)] }); },
      altermate: () => { const m = R.mateOf(s, 0); if (m < 0) return; give(m, R.ALTER); s.turn = m; apply(m, { type: 'play', cards: [R.findKind(s.hands[m], R.ALTER)] }); },
      outme: () => { s.hands[0] = s.hands[0].filter((id) => R.KIND_OF[id] !== R.DEFUSE); const m = R.mateOf(s, 0); if (m >= 0) s.hands[m] = s.hands[m].filter((id) => R.KIND_OF[id] !== R.DEFUSE); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      alterbot: () => { give(bot, R.ALTER); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ALTER)] }); },
      alter: () => { give(0, R.ALTER); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.ALTER)] }); },
      swap: () => { give(0, R.SWAP); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.SWAP)], target: bot }); },
      swapme: () => { give(bot, R.SWAP); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SWAP)], target: 0 }); },
      stack: () => { give(bot, R.ATTACK); s.turn = bot; s.turnsLeft = 2; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      // 机器猫拆了炸弹猫、塞回指定位置（看塞回动画）：最上 / 中间 / 最底 / 随机
      insTop: () => { game.forceInsert = { pos: 0 }; plays.defuse(); },
      insMid: () => { game.forceInsert = { pos: 'mid' }; plays.defuse(); },
      insEnd: () => { game.forceInsert = { pos: 'end' }; plays.defuse(); },
      insRand: () => { game.forceInsert = { rand: true }; plays.defuse(); },
      // 自由甩锅甩给出牌顺序上自己的上家：连线顺着出牌方向几乎绕一圈
      tattackBack: () => { give(bot, R.TATTACK); s.turn = bot; const prev = R.nextAlive(Object.assign({}, s, { dir: -(s.dir || 1) }), bot); apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.TATTACK)], target: prev }); },
      reverse: () => { give(bot, R.REVERSE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.REVERSE)] }); },
      skip: () => { give(bot, R.SKIP); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SKIP)] }); },
      shuffle: () => { give(bot, R.SHUFFLE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.SHUFFLE)] }); },
      future: () => { give(0, R.FUTURE); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.FUTURE)] }); },
      futurebot: () => { give(bot, R.FUTURE); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FUTURE)] }); },
      favor: () => { give(bot, R.FAVOR); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FAVOR)], target: 0 }); },
      bottom: () => { give(0, 'bottom'); s.turn = 0; apply(0, { type: 'play', cards: [s.hands[0].find((id) => R.KIND_OF[id] === 'bottom')] }); },
      bottombot: () => { const k = Number(game.demoSeat) || bot; give(k, 'bottom'); s.turn = k; apply(k, { type: 'play', cards: [s.hands[k].find((id) => R.KIND_OF[id] === 'bottom')] }); },   // 机器猫出抽底（看往他那边拖；game.demoSeat 指定哪一家）
      steal: () => { give(0, 'cow'); give(0, 'cow'); s.turn = 0; apply(0, { type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: bot }); },
      stealme: () => { give(bot, 'cow'); give(bot, 'cow'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: 0 }); },
      stealbot: () => { const o = 2 % s.n; give(bot, 'cow'); give(bot, 'cow'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: o === bot ? 0 : o }); },
      // 抽最左 / 最右那家（手牌一大把）：看扇面出不出框。stealL = 最右那家抽最左那家，stealR 反过来
      stealL: () => { const a = s.n - 1, b = 1; ['orange', 'calico', 'tabby', 'siamese', 'skip', 'shuffle', 'future', 'attack', 'nope', 'favor'].forEach((k) => give(b, k)); give(a, 'cow'); give(a, 'cow'); s.turn = a; apply(a, { type: 'play', cards: s.hands[a].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: b }); },
      stealR: () => { const a = 1, b = s.n - 1; ['orange', 'calico', 'tabby', 'siamese', 'skip', 'shuffle', 'future', 'attack', 'nope', 'favor'].forEach((k) => give(b, k)); give(a, 'cow'); give(a, 'cow'); s.turn = a; apply(a, { type: 'play', cards: s.hands[a].filter((id) => R.KIND_OF[id] === 'cow').slice(0, 2), target: b }); },
      triple: () => { give(bot, 'tabby'); give(bot, 'tabby'); give(bot, 'tabby'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: 0, named: R.DEFUSE }); },
      // 万能猫上桌：狸花 + 万能猫凑对偷机器猫一张；三种猫 + 两张万能猫凑五种各一张
      wildpair: () => { give(0, 'tabby'); give(0, R.WILD); s.turn = 0; apply(0, { type: 'play', cards: [R.findKind(s.hands[0], 'tabby'), R.findKind(s.hands[0], R.WILD)], target: bot }); },
      wildfive: () => { ['orange', 'calico', 'cow', R.WILD, R.WILD].forEach((k) => give(0, k)); s.turn = 0; const w = s.hands[0].filter((id) => R.KIND_OF[id] === R.WILD).slice(0, 2); apply(0, { type: 'play', cards: ['orange', 'calico', 'cow'].map((k) => R.findKind(s.hands[0], k)).concat(w) }); },
      // 我点名要机器猫的「跳过」（他有）/ 机器猫点名要我的「交换」（没开交换牌，一定落空）
      triplehit: () => { give(0, 'tabby'); give(0, 'tabby'); give(0, 'tabby'); give(bot, R.SKIP); s.turn = 0; apply(0, { type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: bot, named: R.SKIP }); },
      // 叠加作废：西家索要东家，东家、西家、东家轮流作废（三张叠起来）；mestack：机器猫索要我，我手里两张作废，它会作废回来一次
      nopestack: () => { const o = 2 % s.n; give(bot, R.FAVOR); [bot, o].forEach((x) => { while (R.countKind(s.hands[x], R.NOPE) < 2) { const n0 = R.countKind(s.hands[x], R.NOPE); give(x, R.NOPE); if (R.countKind(s.hands[x], R.NOPE) === n0) break; } }); s.turn = bot; game.forceNope = [o, bot, o]; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FAVOR)], target: o }); },
      mestack: () => { give(bot, R.FAVOR); if (R.countKind(s.hands[bot], R.NOPE) === 0) give(bot, R.NOPE); s.turn = bot; game.forceNope = [bot]; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.FAVOR)], target: 0 }); },
      skipnoped: () => { give(0, R.SKIP); s.turn = 0; game.forceNope = bot; if (R.countKind(s.hands[bot], R.NOPE) === 0) give(bot, R.NOPE); apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.SKIP)] }); },
      reversenoped: () => { give(0, R.REVERSE); s.turn = 0; game.forceNope = bot; if (R.countKind(s.hands[bot], R.NOPE) === 0) give(bot, R.NOPE); apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.REVERSE)] }); },
      shufflenoped: () => { give(0, R.SHUFFLE); s.turn = 0; game.forceNope = bot; if (R.countKind(s.hands[bot], R.NOPE) === 0) give(bot, R.NOPE); apply(0, { type: 'play', cards: [R.findKind(s.hands[0], R.SHUFFLE)] }); },
      triplemissme: () => { give(0, 'tabby'); give(0, 'tabby'); give(0, 'tabby'); s.turn = 0; apply(0, { type: 'play', cards: s.hands[0].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: bot, named: R.SWAP }); },
      triplemiss: () => { give(bot, 'tabby'); give(bot, 'tabby'); give(bot, 'tabby'); s.turn = bot; apply(bot, { type: 'play', cards: s.hands[bot].filter((id) => R.KIND_OF[id] === 'tabby').slice(0, 3), target: 0, named: R.SWAP }); },
      nope: () => { give(0, R.NOPE); give(bot, R.ATTACK); s.turn = bot; apply(bot, { type: 'play', cards: [R.findKind(s.hands[bot], R.ATTACK)] }); },
      // 百变「急救」：没逗猫棒、手里一对奶牛猫，摸到炸弹猫（我 / 机器猫）；牌堆只剩一张时抽底
      catsave: () => { s.flux = 'catsave'; s.saveUsed = s.hands.map(() => false); s.hands[0] = s.hands[0].filter((id) => R.KIND_OF[id] !== R.DEFUSE); give(0, 'cow'); give(0, 'cow'); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      // 急救挑对子：手里两对（奶牛猫 + 跳过）挑一对；catsavenone：凑不出对，手牌闪灰后出局
      catsave2: () => { s.flux = 'catsave'; s.saveUsed = s.hands.map(() => false); s.hands[0] = s.hands[0].filter((id) => R.KIND_OF[id] !== R.DEFUSE); give(0, 'cow'); give(0, 'cow'); give(0, R.SKIP); give(0, R.SKIP); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      catsavenone: () => { s.flux = 'catsave'; s.saveUsed = s.hands.map(() => false); const h = s.hands[0].filter((id) => R.KIND_OF[id] !== R.DEFUSE), seen = new Set(); s.hands[0] = h.filter((id) => { const k = R.KIND_OF[id]; if (seen.has(k) || k === R.WILD) { s.removed.push(id); return false; } seen.add(k); return true; }); top(R.BOOM); s.turn = 0; apply(0, { type: 'draw' }); },
      catsavebot: () => { s.flux = 'catsave'; s.saveUsed = s.hands.map(() => false); s.hands[bot] = s.hands[bot].filter((id) => R.KIND_OF[id] !== R.DEFUSE); give(bot, 'cow'); give(bot, 'cow'); top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      // 转盘跟着出牌方向（2026-11-26）：fluxccw = 出牌方向 1（桌上逆时针），fluxcw = -1（顺时针）；机器猫打出一张百变
      fluxccw: () => plays.fluxDir(1), fluxcw: () => plays.fluxDir(-1),
      fluxDir: (d) => { s.dir = d; const id = R.KIND_OF.findIndex((k, i) => k === R.FLUX && s.hands.every((h) => h.indexOf(i) < 0)); [s.deck, s.discard, s.removed].forEach((a) => { const j = a.indexOf(id); if (j >= 0) a.splice(j, 1); }); s.hands[bot].push(id); s.turn = bot; renderAll(); apply(bot, { type: 'play', cards: [id] }); },
      // 百搭下从牌堆拿出来的猫（2026-11-26 用户）：先亮本身、再翻成万能猫——窥探 / 摸牌 / 改命
      allwildpeek: () => { s.flux = 'allwild'; ['tabby', R.SKIP, 'orange'].forEach(onTop); plays.future(); },
      allwilddraw: () => { s.flux = 'allwild'; onTop('cow'); plays.draw(); },
      allwildalter: () => { s.flux = 'allwild'; ['siamese', 'calico'].forEach(onTop); plays.alter(); },
      allwild: () => { s.flux = 'allwild'; give(0, 'orange'); give(0, 'cow'); give(0, 'tabby'); s.turn = 0; renderAll(); },   // 百变「百搭」：手里三只不同的猫，自己挑着出
      nine: () => { s.flux = 'nine'; s.nineUsed = s.hands.map(() => false); s.hands[bot] = s.hands[bot].filter((id) => R.KIND_OF[id] !== R.DEFUSE); top(R.BOOM); s.turn = bot; apply(bot, { type: 'draw' }); },
      bottom1: () => { const keep = s.deck.find((id) => R.KIND_OF[id] !== R.BOOM); s.removed.push(...s.deck.filter((id) => id !== keep)); s.deck = [keep]; give(bot, 'bottom'); s.turn = bot; apply(bot, { type: 'play', cards: [s.hands[bot].find((id) => R.KIND_OF[id] === 'bottom')] }); },
      win: () => { for (let i = 1; i < s.n; i++) { s.alive[i] = false; s.outOrder.push(i); s.hands[i] = []; } s.phase = 'over'; s.winner = 0; release(); renderAll(); finish(); },
      deal: () => newGame(),
    };
    release();
    renderAll();
    (plays[name] || plays.draw)();
  }
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).has('zmdemo')) {
    window.__zmDebug = { get game() { return game; }, get online() { return online; }, get busy() { return busy; }, step, newGame, startTutorial, guideReset, guideOnline, demo, R, AI, fx, renderSeat, renderDir, renameFx, avatarHtml, fitNames, rimLink, rimFx, roomGoneDialog, humansOutHere, rimMood: (re) => rimMood(null, re), celebrate, cardFuse, clearStage, flashRole: (seat, hold) => flashRole(seat, token, hold), expandRole, openRoleView, liftTop3: (n) => liftTop3(n, token), startWander, layoutRing, fanSpot, get settings() { return settings; } };
  }
  /* 「这步不对」反馈（zhamao-feedback.js）：打开时像暂停一样停住（不弹暂停页），关掉接着打 */
  function fbHold() {
    if (!canPause() || !els.mask.hidden) return false;
    closeMenu();
    resetTable();
    save();
    busy = true;
    renderAll();
    return true;
  }
  function fbResume() { renderAll(); schedule(260, step); }
  // 联机的「这步不对」：机器猫的动作取自服务器发下来的事件流（不暂停），发事件序号给服务器，由它找回是第几步（2026-11-20）
  const fbOnline = () => (online && online.st && online.st.game && game && game.online ? { log: online.st.game.log || [], me: online.st.mySeat, loc: locOf, over: !!online.st.game.over } : null);
  const fbSend = (n, why) => (online && NET ? NET.act(online.code, online.token, 'fb', { n, why }).catch(() => {}) : null);
  window.ZhamaoTable = { cardHtml, backHtml, rulesHtml, game: () => game, hold: fbHold, resume: fbResume, canPause: () => canPause(), online: fbOnline, sendFb: fbSend };
})();
