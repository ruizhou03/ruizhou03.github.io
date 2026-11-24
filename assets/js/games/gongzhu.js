/* 拱猪 · 单机牌桌（我 + 3 家 AI）。规则在 gongzhu-rules.js，AI 在 gongzhu-ai.js。
 * 座位：0 我（下方）→ 1 下家（右）→ 2 对家（上）→ 3 上家（左），出牌按逆时针。
 * 界面尽量不用文字提示：轮到谁看头像描边，能出哪张看手牌亮暗，吃了什么看吃牌区的真牌面。 */
(() => {
  'use strict';

  const R = window.GongzhuRules;
  const AI = window.GongzhuAI;
  const T = window.GongzhuTutorial;
  const TUT_KEY = 'gz.tut.v1';
  const ADV_KEY = 'gz.tutadv.v1';        // 学过进阶教程（明牌）
  const EXPOSE_TIP_KEY = 'gz.exposetip.v1';   // 正式对局里第一次碰到明牌的小提示，出过一次就不再出
  const STORE_KEY = 'gz.match.v1';
  const CAPS_KEY = 'gz.roundcaps.v1';   // 联机「每局得分」里各家吃了什么（见 keepRoundCaps）
  const SETTINGS_KEY = 'gz.settings.v1';
  const VERSION = '20261101d';   // 加了规则开关和亮牌，局面结构变了，旧存档作废

  const SOLO_NAMES = ['我', '下家', '对家', '上家'];
  const SOLO_AVATARS = ['我', '下', '对', '上'];
  let NAMES = SOLO_NAMES.slice();       // 联机时换成三家的昵称（我永远在下方）
  let AVATARS = SOLO_AVATARS.slice();
  const TIER_LABELS = { easy: '入门', normal: '普通', hard: '高手' };
  const TIER_ORDER = ['easy', 'normal', 'hard'];
  const TURN_SEC_OPTS = { 20: '20 秒', 0: '不限时' };
  const HURRY_MS = 5000;   // 最后 5 秒头像开始跳
  const SUIT_NAMES = ['黑桃', '红桃', '方块', '梅花'];

  // trickShow：一墩打满停多久；fly：分牌飞进吃牌区；fade：没分的牌就地淡出
  // roundEnd：最后一张分牌落进吃牌区后，等本局分数完（最长约 0.9 秒）再结这一局
  const PACE = { aiMin: 400, trickShow: 450, fly: 320, fade: 200, roundEnd: 800 };   // 2026-11-09 整体快约四分之一（一墩约 2.6 秒）
  // 本机调试：?gzauto=1 让「我」也由 AI 代打并加速，用来一口气验到结算 / 一盘结束
  const AUTO = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('gzauto') === '1';
  /* 盘终收尾预览（待用户挑）：?gzpv=final-a 领奖台 / final-b 墨园榜单 / final-c 原表加奖章；进页面读一次，不带参数 = 现状 */
  const GZPV = (() => { const v = new URLSearchParams(location.search).get('gzpv') || ''; return /^final-([abc]|b[123]|b3[a-d]|b3a[12])$/.test(v) ? v : ''; })();
  const ROLL = GZPV.startsWith('final-b3');
  // 甲（素绢灰青）里猪印放哪：final-b3a1 盖在分数左边 / final-b3a2 头像直接换成猪（final-b3a 原样：印压在头像角上）
  const SEAL_AT = ROLL ? GZPV.slice(9) : '';   // 乙三宣纸卷及它的几套配色（final-b3a～b3d 只换颜色和装裱，结构相同）
  /* 房主管人 / 暂停 / 本房间战绩（画法全在 gongzhu-host-pv.js，这里只留挂钩）：
   * 用户 2026-11-23 定 = 房主那一排甲（三颗图标）+ 暂停一（顶栏键 + 罩桌）+ 战绩三（排行榜：大厅右上角标签 / 局中菜单，按累计分），不带参数就是这一套。
   * 还能拿 ?gzhost=<a|b|c><1|2><1|2|3> 看别的版本对比；暂停卡样式另用 ?gzpause=（见 gongzhu-host-pv.js） */
  const GZHOST = (() => {
    const m = /^([abc])([12])?([123])?$/.exec(new URLSearchParams(location.search).get('gzhost') || '');
    if (!m) return { row: 'a', pause: '1', rec: '3' };
    const d = { a: '11', b: '22', c: '12' }[m[1]];
    return { row: m[1], pause: m[2] || d[0], rec: m[3] || d[1] };
  })();
  let hostPv = null;
  /* 桌沿金线 + 大厅名帖（画法全在 gongzhu-rim-pv.js）：2026-11-24 用户定 = f（三家在上、小圆角金线穿过四家头像、正菱形出牌区）+ 名帖大厅，不带参数就是这一套。
   * 还能拿 ?gzrim=<a|b|c|d|e|f><1|2> 看别的版本对比；?gzrim=0 = 改版前的牌桌（没有金线） */
  const GZRIM = (() => {
    const q = new URLSearchParams(location.search).get('gzrim');
    if (q === '0') return null;
    const m = /^([abcdef])([12])?$/.exec(q || '');
    return m ? { rim: m[1], lobby: m[2] || '1' } : { rim: 'f', lobby: '2' };
  })();
  let rimPv = null;
  /* 局中菜单 / 顶栏 / 暂停页 / 单机身份预览（待用户挑）：?gzmenu=menu-a|b|c, bar-a|b, pause-a|b, me-a|b，逗号分隔可组合；进页面读一次，不带参数 = 现状 */
  const MENU_PV = (() => {
    const set = new Set((new URLSearchParams(location.search).get('gzmenu') || '').split(',').map((x) => x.trim()));
    const one = (keys) => keys.find((k) => set.has(k)) || '';
    return { menu: one(['menu-a', 'menu-b', 'menu-c']), bar: one(['bar-a', 'bar-b']), pause: one(['pause-a', 'pause-b']), me: one(['me-a', 'me-b']) };
  })();
  /* 新手教程 / 实战引导 / 首次二选一预览（待用户挑；2026-11-22 对照百变小咪审查 D5 + A8）：?gztut=a|b 选剧本，
   * 可以用逗号接 guide-a|guide-b（实战引导的呈现：桌中放大亮相 / 原位发光加小气泡）、first-a|first-b（第一次点单机的二选一）、
   * reset（清掉看过的引导和二选一，从头再看一遍）。例：?gztut=b,guide-b,first-a。不带参数 = 现状（旧教程、旧的明牌小提示） */
  const GZTUT_PV = (() => {
    const toks = (new URLSearchParams(location.search).get('gztut') || '').split(',').map((x) => x.trim()).filter(Boolean);
    if (!toks.length) return null;
    const v = { script: 'a', guide: 'a', first: 'a', reset: false };
    for (const t of toks) {
      if (/^[ab]$/.test(t)) v.script = t;
      else if (/^guide-[ab]$/.test(t)) v.guide = t.slice(6);
      else if (/^first-[ab]$/.test(t)) v.first = t.slice(6);
      else if (t === 'reset') v.reset = true;
    }
    return v;
  })();
  const GUIDE_KEY = 'gz.guide.v1';          // 实战引导看过哪几样（预览中，见 guideShow）
  const FIRST_PV_KEY = 'gz.firstask.pv';    // 首次二选一预览：问过了（预览不动 gz.tut.v1）
  let guideSet = null, guideCur = null;
  if (GZTUT_PV && GZTUT_PV.reset) { try { localStorage.removeItem(GUIDE_KEY); localStorage.removeItem(FIRST_PV_KEY); } catch (_) { /* 无痕 */ } }
  /* 出牌预览（待用户挑，2026-11-22）：?gzplay=fly-a,one-b,exp-c ——逗号分隔、三组任意组合，不带 = 现状（见「出牌预览」一节）。
   *   fly-a 直线 / b 弧线 / c 弧线 + 落定转正压一下 / d 丙 + 别家翻面   牌怎么到出牌位（另带手牌滑动合拢）
   *   one-a 现状 / b 出牌键亮起等点 / c 隔一拍自动出                     只剩一张能出时（三版都另带：最后一轮自动出、点空白取消、先选好）
   *   exp-a 「不明牌」放主键上方 / b 两键等宽并排 / c 主键角上小键          明牌阶段的按钮 */
  const GZPLAY = (() => {
    const o = { fly: '', one: '', exp: '' };
    for (const x of (new URLSearchParams(location.search).get('gzplay') || '').split(',')) {
      const m = /^(fly|one|exp)-([a-d])$/.exec(x.trim());
      if (m && (m[1] === 'fly' || m[2] !== 'd')) o[m[1]] = m[2];
    }
    return o;
  })();
  if (AUTO) Object.assign(PACE, { aiMin: 30, trickShow: 120, fly: 200, fade: 120, roundEnd: 60 });
  const SETTLE_HOLD = AUTO ? 60 : 1700;   // 累计分在桌上数完（最长约 0.9 秒）后再停一会儿，才弹结算页
  // 教程放慢：机器人出牌、收墩都留足时间看清
  const TUT_PACE = { aiMin: 950, trickShow: 1100, fly: 520, fade: 320, roundEnd: 1000 };
  const FAST_PACE = { aiMin: 140, trickShow: 320, fly: 300, fade: 160, roundEnd: 400 };   // 进阶教程讲完后快进剩下的牌
  const pace = () => (match && match.tutorial ? (tut && tut.fast ? FAST_PACE : TUT_PACE) : PACE);

  const $ = (id) => document.getElementById(id);
  const els = {
    app: $('gzApp'), table: $('gzTable'), center: $('gzCenter'),
    hand: $('gzHand'), play: $('gzPlayBtn'), noExpose: $('gzNoExposeBtn'),
    roundNo: $('gzRoundNo'),
    mask: $('gzDialogMask'), dialog: $('gzDialog'),
    coach: $('gzCoach'), fx: $('gzFx'),
    seats: [0, 1, 2, 3].map((s) => $('gzSeat' + s)),
    slots: [0, 1, 2, 3].map((s) => document.querySelector('.gz-slot-' + s)),
  };

  /* ───── 声音（见 gongzhu-audio.js）：没加载上就静悄悄地打 ───── */
  const snd = (name, delay, arg) => { if (window.GongzhuAudio) window.GongzhuAudio.sfx(name, delay, arg); };
  let social = null;   // 牌桌互动（扔道具 / 说一句，见 gongzhu-social.js 和下面「牌桌互动」）
  // 轮到我：同一手只响一次（联机里一份快照会反复触发 onlineIdle）
  let turnDing = '';
  function dingMyTurn() {
    const r = match.round;
    const key = match.roundNo + ':' + (r ? r.trickNo * 4 + r.trick.length : -1) + ':' + (match.exposing.length ? 'x' : 'p');
    if (key === turnDing) return;
    turnDing = key;
    snd('turn');
  }

  /* 声音按钮：点开一个小面板，音效 / 背景音乐各一个开关（记在本机） */
  const SOUND_TRACKS = [['sfx', '音效'], ['music', '背景音乐']];
  let soundPanel = null;
  function refreshSoundBtn() {
    const A = window.GongzhuAudio, btn = $('gzSoundBtn');
    if (!btn) return;
    if (!A) { btn.hidden = true; return; }
    const p = A.prefs(), off = !p.sfx && !p.music;
    btn.classList.toggle('is-off', off);
    btn.setAttribute('aria-label', '声音' + (off ? '（已关）' : ''));
    btn.setAttribute('aria-expanded', soundPanel && !soundPanel.hidden ? 'true' : 'false');
  }
  function toggleSoundPanel(e) {
    const A = window.GongzhuAudio;
    if (!A) return;
    if (e) e.stopPropagation();
    if (!soundPanel) {
      soundPanel = document.createElement('div');
      soundPanel.className = 'gz-sound-panel';
      soundPanel.setAttribute('role', 'group');
      soundPanel.setAttribute('aria-label', '声音');
      soundPanel.hidden = true;
      soundPanel.innerHTML = SOUND_TRACKS.map(([k, t]) => '<label class="gz-sound-row"><input type="checkbox" data-track="' + k + '"><span>' + t + '</span></label>').join('');
      soundPanel.addEventListener('change', (ev) => { const k = ev.target.dataset.track; if (k) { A.set(k, ev.target.checked); refreshSoundBtn(); } });
      soundPanel.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { soundPanel.hidden = true; refreshSoundBtn(); $('gzSoundBtn').focus(); } });
      document.addEventListener('click', (ev) => {
        if (!soundPanel.hidden && !ev.target.closest('.gz-sound-panel, #gzSoundBtn')) { soundPanel.hidden = true; refreshSoundBtn(); }
      });
      els.app.appendChild(soundPanel);
    }
    soundPanel.hidden = !soundPanel.hidden;
    if (!soundPanel.hidden) {
      const p = A.prefs();
      soundPanel.querySelectorAll('input').forEach((box) => { box.checked = !!p[box.dataset.track]; });
      const r = $('gzSoundBtn').getBoundingClientRect();
      soundPanel.style.top = Math.round(r.bottom + 8) + 'px';
      soundPanel.style.left = Math.round(Math.max(8, Math.min(window.innerWidth - 168, r.left + r.width / 2 - 80))) + 'px';
    }
    refreshSoundBtn();
  }

  function faceHtml(v) {
    const s = String(v || '');
    return s.startsWith('svg:') && window.GongzhuAvatars ? GongzhuAvatars.svg(s.slice(4)) : esc(s);
  }

  /* ───── 存档 ───── */

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* 无痕模式等：不存也能玩 */ } }

  const settings = Object.assign({ tier: 'normal', turnSec: 20 }, readJSON(SETTINGS_KEY) || {});
  settings.rules = R.normalizeRules(settings.rules);
  delete settings.artFaces;   // 猪羊 ×2 的卡通牌面是游戏特色，不再给切换（老设置里存的「普通牌面」作废）

  let match = null;     // { rules, totals, roundNo, pigTaker, seed, round, exposing, last, over }
  let selected = -1;
  let exposePick = [];  // 明牌环节里我点选要明的牌
  /* 显示层：规则引擎（match.round）一步到位，画面跟着动画一步步追上来——动画还没播到的那部分记在这里，画面一律照它画，
   * 动画播到哪就放掉哪一项。（原来是 flying / dealing / exposeHeld 三个散落的临时标记）
   *   deal   发牌中：{ have: 每家已经到手几张, mine: 我已经到手的牌, skip }
   *   trick  一轮刚打满、还在桌上放特效 / 收牌：{ match, done, talk, hold: 还没放进吃牌区的分牌, onTable: 四张牌还摆在桌上,
   *          lead: 桌心还亮着领出花色, fxing: 特效正放着（桌上的牌调暗）, replay: 暂停打断了，继续时从头重放 }
   *   held   我已经点了「明牌」、还在等别家决定（或等服务器）的那几张：这期间照样按明牌的样子画 */
  const ov = { deal: null, trick: null, held: [] };
  const landing = new Set();   // 出牌预览（?gzplay=fly-*）：正飞向出牌位的牌，桌上那张先占位不显示（见 flyIn）
  const one = { key: '', noSel: '' };   // 出牌预览（?gzplay=one-*）：已排了自动出牌的那一手 / 我点空白放下了的那一手（见 oneHook）
  // 这一轮还没收完的那份显示（只认当前这一盘的；换了一盘就当没有）
  const liveTrick = () => (ov.trick && ov.trick.match === match ? ov.trick : null);
  const heldCap = (c) => { const t = liveTrick(); return !!(t && t.hold.has(c)); };
  let busy = false;     // 动画 / AI 思考中，屏蔽我的操作
  let token = 0;        // 重开时作废旧的定时回调
  let autopilot = false;  // 托管：连续两次超时自动打开，点手牌 / 头像取消
  let timeouts = 0;       // 连续超时次数，我自己出一张就清零

  function newMatch() {
    // 规则在开盘时定下，中途改设置从下一盘起生效
    match = { rules: R.normalizeRules(settings.rules), totals: [0, 0, 0, 0], roundNo: 0, pigTaker: -1, seed: (Math.random() * 2 ** 31) | 0, round: null, exposing: [], last: null, over: false, bots: drawBots() };
    applySoloIdentity();
  }

  /* 单机的三家机器人：每一盘开局按当前 AI 水平抽签起名字、分头像（同百变小咪：高手北斗星名 + 深色金眼、普通希腊字母、
   * 入门零一…零九 + 马卡龙大眼睛，看名字和头像就知道是哪一档），记进存档，下次进来还是这三位（老存档里抽好的名字不动）。
   * 名字下面一枚小签写方位（下家 / 对家 / 上家），免得分不清谁坐哪。教程里仍叫「上家 / 对家 / 下家」——讲解词里就是这么称呼的 */
  const SOLO_DIRS = ['', '下家', '对家', '上家'];
  function tierPool(tier) {
    const A = window.GongzhuAvatars;
    const BT = A.BOT_TIERS && (A.BOT_TIERS[tier] || A.BOT_TIERS.normal);
    return BT ? { nicks: BT.nicks, faces: BT.faces.map((x) => x.id) } : { nicks: A.BOT_NICKS, faces: A.ROBOT.map((x) => x.id) };
  }
  function drawBots(tier) {
    const A = window.GongzhuAvatars;
    if (!A) return null;
    const P = tierPool(tier || settings.tier), names = P.nicks.slice(), faces = P.faces.slice();
    const take = (arr) => arr.splice((Math.random() * arr.length) | 0, 1)[0];
    return [1, 2, 3].map(() => ({ nick: take(names), avatar: take(faces) }));
  }
  // 局中换了 AI 水平：三家按新档位重新起名、换头像，就地改座位上的名字和头像（不重建座位，手里的牌和吃牌不动）
  function renameSoloBots() {
    const bots = soloBots(), fresh = drawBots(settings.tier);
    if (!bots || !fresh) return;
    bots.splice(0, bots.length, ...fresh);
    NAMES = [soloMe().nick].concat(bots.map((x) => x.nick));
    AVATARS = [soloMe().face].concat(bots.map((x) => 'svg:' + x.avatar));
    els.seats.forEach((el, s) => {
      if (!s) return;
      const n = el.querySelector('.gz-name'), f = el.querySelector('.gz-av-face');
      if (n) n.textContent = NAMES[s];
      if (f) { f.dataset.v = AVATARS[s]; f.innerHTML = faceHtml(AVATARS[s]); }
      el.setAttribute('aria-label', NAMES[s]);
    });
  }
  function soloBots() { return match && !match.online && !match.tutorial && !match.demo && match.bots ? match.bots : null; }
  function applySoloIdentity() {
    const b = soloBots();
    const me = soloMe();
    NAMES = b ? [me.nick].concat(b.map((x) => x.nick)) : SOLO_NAMES.slice();
    AVATARS = b ? [me.face].concat(b.map((x) => 'svg:' + x.avatar)) : SOLO_AVATARS.slice();
    $('gzPauseBtn').hidden = !b;   // 暂停键只给单机：联机要照顾别人，教程不计时
    syncBarPv();
    buildSeats();
  }
  function save() { if (!match.tutorial && !match.online && !match.demo) writeJSON(STORE_KEY, { v: VERSION, match }); }
  /* 单机身份（预览 ?gzmenu=me-a|me-b）：单机也用联机那套名字和矢量头像，名字和联机共用 GamesShell.Identity，头像记在本机；
   * 没设过就随机起一个（同百变小咪）。不带预览参数时仍是一个「我」字 */
  const PROFILE_KEY = 'gz.profile.v1';
  function soloProfile() {
    const A = window.GongzhuAvatars, ident = window.GamesShell && GamesShell.Identity;
    const p = readJSON(PROFILE_KEY) || {};
    const shared = ident && ident.getNick ? ident.getNick() : null;
    const nick = shared || p.nick || (A ? A.randomNick() : '我');
    const avatar = p.avatar && A && A.byId[p.avatar] ? p.avatar : A ? A.randomHuman() : null;
    if (nick !== p.nick || avatar !== p.avatar) writeJSON(PROFILE_KEY, { nick, avatar });
    return { nick, avatar };
  }
  function soloMe() {
    if (!MENU_PV.me || !window.GongzhuAvatars) return { nick: '我', face: '我' };
    const p = soloProfile();
    return { nick: p.nick, face: p.avatar ? 'svg:' + p.avatar : '我' };
  }
  // 改完名字 / 头像：就地换掉我这一座的名字和头像（不重建座位）
  function refreshSoloMe() {
    if (!soloBots()) return;
    const me = soloMe(), el = els.seats[0];
    NAMES[0] = me.nick; AVATARS[0] = me.face;
    const n = el.querySelector('.gz-name'), f = el.querySelector('.gz-av-face');
    if (n) n.textContent = me.nick;
    if (f) { f.dataset.v = me.face; f.innerHTML = faceHtml(me.face); }
    el.setAttribute('aria-label', me.nick);
  }
  function showSoloProfile() {
    const A = window.GongzhuAvatars;
    if (!A) return;
    const prof = soloProfile();
    let pick = prof.avatar;
    openDialog('<h2>名字和头像</h2><div class="gz-field-label">名字（删空 = 随机起一个）</div>' +
      '<input class="gz-input" data-nick maxlength="12" autocomplete="nickname" value="' + esc(prof.nick) + '">' +
      '<div class="gz-field-label">头像</div><div class="gz-av-grid" role="group">' +
      A.HUMAN.map((a) => '<button type="button" class="gz-av-pick" data-av="' + a.id + '" aria-label="' + esc(a.name) + '" aria-pressed="' + (a.id === pick) + '">' + a.svg + '</button>').join('') +
      '</div><p class="gz-note gz-err" data-err hidden></p>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="save" data-autofocus>保存</button></div>',
      (d) => {
        const err = d.querySelector('[data-err]'), nickIn = d.querySelector('[data-nick]');
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => {
          pick = b.dataset.av;
          d.querySelectorAll('[data-av]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        d.querySelector('[data-act="save"]').addEventListener('click', () => {
          const v = nickIn.value.trim();
          if (v && ([...v].length > 12 || /[<>&"'/\\]/.test(v))) { err.textContent = '名字最多 12 个字，不能有特殊符号'; err.hidden = false; nickIn.focus(); return; }
          const ident = window.GamesShell && GamesShell.Identity;
          if (v) { if (ident && ident.setNick) ident.setNick(v); } else if (ident && ident.clearNick) ident.clearNick();
          writeJSON(PROFILE_KEY, { nick: v || A.randomNick(), avatar: pick });
          closeDialog();
          refreshSoloMe();
        });
      });
  }
  /* 顶栏预览（?gzmenu=bar-a|bar-b）：甲 单机只留 暂停 · 声音 · 菜单（规则、说一句进菜单；联机 说一句 · 声音 · 菜单）；
   * 乙 单机 暂停 · 声音 · 规则 · 菜单（只把说一句收进菜单）。联机两版都把说一句留在顶栏 */
  const rulesInMenu = () => MENU_PV.bar === 'bar-a';
  const chatInMenu = () => !!MENU_PV.bar && !(match && match.online);
  function syncBarPv() {
    if (MENU_PV.me) els.app.classList.add('gzm-' + MENU_PV.me);
    if (!MENU_PV.bar) return;
    $('gzRulesBtn').hidden = rulesInMenu();
    els.app.classList.add('gzm-' + MENU_PV.bar);
  }
  syncBarPv();   // 一进页面就定下顶栏（直接进联机房间时不经过单机那条路）


  /* ───── 卡面（四象限，参数逐字取自掼蛋 / 斗地主定稿） ───── */

  const SVG_SUITS = {
    1: { t: 'translate(500 500) scale(0.80349) translate(-715.0 -1473.5)', d: 'M714 2046 658 1955Q540 1762 352 1581Q241 1473 196.5 1387.0Q152 1301 152 1195Q152 1075 235.0 988.0Q318 901 432 901Q590 901 716 1141Q850 906 1009 906Q1125 906 1201.5 992.0Q1278 1078 1278 1210Q1278 1299 1241.5 1387.5Q1205 1476 1146 1528L1067 1599Q960 1696 857 1848L803 1928Q790 1947 714 2046Z' },
    2: { t: 'translate(500 500) scale(0.80349) translate(-616.0 -1475.5)', d: 'M1057 1475 617 2044 175 1479 616 907Z' },
  };
  /* ♠ ♣ 以前是文字字符：苹果上用 Apple Symbols 画，安卓上却会变成 emoji。这里把 Apple Symbols 的原字形（2048 单位一个字宽）
   * 直接画成矢量，并按文字排版的同一套几何摆放：宽 = 字的步进宽度，高 1em，基线落在 line-height:1 时文字基线的位置
   * （(2048 − 上伸 1365 − 下伸 512) / 2 + 1365 = 1450.5）。在苹果上与原来的文字逐像素重合，在任何系统上都长一个样。 */
  const GLYPH_SUITS = {
    0: { adv: 1248, d: 'M679 -334 652 -335Q652 -199 664 -133.5Q676 -68 713 1H534Q572 -42 588 -102.5Q604 -163 604 -266L606 -333H574Q548 -260 492.5 -211.5Q437 -163 380 -163Q295 -163 233 -235Q171 -307 171 -406Q171 -545 306 -704Q326 -729 361 -773Q401 -821 416 -839Q548 -1000 619 -1142Q649 -1095 659 -1080L717 -997L786 -898Q844 -817 908 -745Q1082 -553 1082 -407Q1082 -309 1022.5 -238Q963 -167 881 -167Q810 -167 763.5 -205.5Q717 -244 679 -334Z' },
    3: { adv: 1420, d: 'M789 0 615 1Q660 -71 674.5 -134Q689 -197 689 -322Q629 -225 570.5 -185Q512 -145 431 -145Q327 -145 254 -218Q181 -291 181 -396Q181 -513 268 -586Q355 -659 494 -659L552 -658Q461 -793 461 -894Q461 -998 534.5 -1071Q608 -1144 713 -1144Q820 -1144 894.5 -1070.5Q969 -997 969 -891Q969 -795 867 -658Q919 -661 936 -661Q1067 -661 1152 -587Q1237 -513 1237 -399Q1237 -297 1162 -220Q1087 -143 988 -143Q903 -143 843 -185.5Q783 -228 728 -328Q728 -205 739.5 -143Q751 -81 789 0Z' },
  };
  function suitSVG(suit) {
    const g = GLYPH_SUITS[suit];
    if (g) return '<svg class="suit-svg" style="width:' + (g.adv / 2048).toFixed(4) + 'em" viewBox="0 -1450.5 ' + g.adv + ' 2048" aria-hidden="true"><path d="' + g.d + '"/></svg>';
    const s = SVG_SUITS[suit];
    return '<svg class="suit-svg" viewBox="0 0 1000 1000" aria-hidden="true"><g transform="' + s.t + '"><path d="' + s.d + '"/></g></svg>';
  }
  const SUITP = {
    0: { tr: 0.335, bl: 0.34, big: 1.13, br: -0.08, bb: -0.045, op: 1, bigH: 1.13, brH: -0.125, bbH: -0.135, opH: 1, trY: 0.02, blY: -0.175 },
    1: { tr: 0.19, bl: 0.2, big: 0.6, br: 0.17, bb: 0.245, op: 1, bigH: 0.6, brH: 0.09, bbH: 0.2, opH: 1, trY: 0, blY: -0.2 },
    2: { tr: 0.22, bl: 0.22, big: 0.74, br: 0.115, bb: 0.19, op: 0.9, bigH: 0.68, brH: 0.075, bbH: 0.175, opH: 0.9, trY: 0, blY: -0.2 },
    3: { tr: 0.325, bl: 0.34, big: 1.04, br: -0.04, bb: -0.015, op: 0.9, bigH: 0.99, brH: -0.055, bbH: -0.065, opH: 1, trY: 0, blY: -0.17 },
  };
  const SUIT_TRY_ALL = 0.02, SUIT_BLY_ALL = -0.2;

  function cardName(c) { return SUIT_NAMES[R.suitOf(c)] + R.RANK_LABELS[R.rankOf(c)]; }

  function buildCard(c) {
    const suit = R.suitOf(c);
    const rank = R.RANK_LABELS[R.rankOf(c)];
    const el = document.createElement('span');
    el.className = 'gz-card ' + (suit === 1 || suit === 2 ? 'suit-red' : 'suit-black') + (rank === 'J' ? ' rank-j' : '') + (R.isHeart(c) ? ' is-heart' : '');
    el.dataset.card = c;
    const p = SUITP[suit];
    const st = el.style;
    st.setProperty('--gz-tr', p.tr); st.setProperty('--gz-bl', p.bl);
    st.setProperty('--gz-big', p.big); st.setProperty('--gz-br', p.br); st.setProperty('--gz-bb', p.bb); st.setProperty('--gz-op', p.op);
    st.setProperty('--gz-bigH', p.bigH); st.setProperty('--gz-brH', p.brH); st.setProperty('--gz-bbH', p.bbH); st.setProperty('--gz-opH', p.opH);
    st.setProperty('--gz-try', SUIT_TRY_ALL + (p.trY || 0)); st.setProperty('--gz-bly', SUIT_BLY_ALL + (p.blY || 0));
    const sv = suitSVG(suit);
    el.innerHTML = '<span class="q q-tl">' + rank + '</span><span class="q q-tr">' + sv + '</span>' +
      '<span class="q q-bl">' + sv + '</span><span class="bigsuit">' + sv + '</span>';
    // 特色牌面：猪 / 羊画成动画里那只，变压器写「×2」（颜色跟着持有人这一局的分数走）；角上的 Q♠ / J♦ / 10♣ 不变。
    // 明出来（.is-exposed）：猪淡红底、羊淡金底，变压器写 ×4——见 gongzhu.css「明牌牌面」。
    // 默认就是画的（教程里也一样）；设置里可以换回普通牌面
    if (c === R.PIG || c === R.SHEEP || c === R.DOUBLER) {
      el.classList.add('has-art');
      const f = document.createElement('span');
      f.className = 'gz-face';
      f.innerHTML = c === R.PIG ? ART.pig : c === R.SHEEP ? ART.sheep : DOUBLER_FACE;
      el.appendChild(f);
    } else if (c === R.HEART_ACE) {
      // ♥A 平时就是普通牌面；明出来（红桃全部翻倍）时换成一颗写着 ×2 的大红心（CSS 切换）
      el.classList.add('has-ha');
      const f = document.createElement('span');
      f.className = 'gz-face gz-face-ha';
      f.innerHTML = HEART_ACE_FACE;
      el.appendChild(f);
    }
    return el;
  }
  const HEART_ACE_FACE = '<svg viewBox="0 0 100 92" aria-hidden="true">' +
    '<path d="M50 89C20 67 3 51 3 30 3 15 15 4 29 4c9 0 16 5 21 13 5-8 12-13 21-13 14 0 26 11 26 26 0 21-17 37-47 59Z" fill="#b4392c"/>' +
    '<path d="M50 89C20 67 3 51 3 30 3 15 15 4 29 4c9 0 16 5 21 13 5-8 12-13 21-13 14 0 26 11 26 26 0 21-17 37-47 59Z" fill="none" stroke="#e9c97a" stroke-width="3" transform="translate(9 7.5) scale(.82)"/>' +
    '<text x="50" y="55" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="34" fill="#fbefe4">×2</text></svg>';
  const DOUBLER_FACE = '<svg class="gz-dbl" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" stroke-width="5"/>' +
    '<circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".55"/>' +
    '<text class="x2" x="50" y="64" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="40" fill="currentColor">×2</text>' +
    '<text class="x4" x="50" y="64" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="40" fill="currentColor">×4</text></svg>';   // 明出来的变压器显示 ×4（CSS 切换）
  // 变压器的颜色：持有人这一局（不算变压器）的分数为正金色、为负灰色、零分藏蓝——和 ×2 动画同一套
  function dblTone(cards, ctx) {
    const v = R.scoreCaptured(cards.filter((x) => x !== R.DOUBLER), ctx).total;
    return v > 0 ? 'gold' : v < 0 ? 'ash' : 'navy';
  }

  /* 明出来的牌（见 gongzhu.css「明牌牌面」） */
  function isExposedCard(c) { const r = match && match.round; return !!r && R.exposedOwner(r, c) >= 0; }

  /* ───── 尺寸：只算 --u ───── */

  // 正在输入（昵称 / 房号）：手机键盘弹起会把窗口压矮，这时不量——否则会误弹「把手机横过来」盖住输入框
  function typing() {
    const a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  }
  let sizeW = 0;   // 上次量尺寸时的窗口宽度（牌局里宽度变化不到 40px 不重算，见 onResize）
  function solveSize() {
    if (typing()) return;
    sizeW = document.documentElement.clientWidth || window.innerWidth;
    const w = els.table.clientWidth - 20;
    const h = window.innerHeight;
    const portrait = h > window.innerWidth;
    // 竖屏手牌叠得紧一点，换更大的牌面
    const byW = w / (12 * (portrait ? 0.5 : 0.6) + 1 + 0.5);
    const byH = portrait ? h / 8.4 : h / 6.6;
    let u = Math.max(38, Math.min(78, byW, byH));
    els.app.style.setProperty('--u', u.toFixed(1) + 'px');
    // 按公式算出来还放不下（各种奇怪的窗口比例）：牌面一档档缩小再试；缩到底还放不下，就请对方转屏 / 调窗口
    for (let k = 0; k < 16 && !tableFits() && u > 30; k++) {
      u = Math.max(30, u * 0.93);
      els.app.style.setProperty('--u', u.toFixed(1) + 'px');
    }
    showFitHint(!tableFits());
  }
  function tableFits() {
    const t = els.table;
    if (t.scrollHeight > t.clientHeight + 2 || t.scrollWidth > t.clientWidth + 2) return false;
    if (window.innerWidth < 300 || window.innerHeight < 260) return false;
    // 中间出牌区至少要竖着放得下两张牌（我和对家的出牌）、横着放得下三张
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 56;
    const c = els.center.getBoundingClientRect();
    return c.height >= u * 1.44 * 2 && c.width >= u * 3.4;
  }
  /* 放不下时盖一层提示（不硬挤着显示）；放得下了自动收起。
   * 单机一局正打着：整局停下（机器人、动画、钟都停，同切后台暂停走的 freezeSolo），提示收起后从 playSolo 原样接着打；
   * 联机 / 教程只停我的钟（联机的钟以服务器为准） */
  let fitFrozen = false;
  function showFitHint(on) {
    const el = $('gzFit');
    if (!el || el.hidden === !on) return;
    el.hidden = !on;
    if (on) {
      const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const wide = window.innerWidth > window.innerHeight;
      el.querySelector('.gz-fit-text').textContent = wide
        ? (touch ? '屏幕太矮，放不下牌桌。把手机竖过来试试。' : '窗口太矮了，放不下牌桌。把窗口拉高一些。')
        : (touch ? '屏幕太窄，放不下牌桌。把手机横过来试试。' : '窗口太窄了，放不下牌桌。把窗口拉宽一些。');
      el.classList.toggle('to-portrait', wide);
      if (match && !AUTO && !coverOn && soloBots() && match.round && els.mask.hidden) {
        closeMenu();
        if (soundPanel) soundPanel.hidden = true;
        freezeSolo();
        fitFrozen = true;
      } else if (match) pauseClock();
    } else if (fitFrozen) {
      fitFrozen = false;
      // 这期间切过后台（弹了「暂停」）或回了主菜单：交给那边的「继续」
      if (!coverOn && els.mask.hidden && soloBots()) playSolo(match);
    } else if (match && els.mask.hidden) resumeClock();
  }

  /* ───── 吃牌区：真牌面小牌，固定顺序 变压器 · 猪 · 羊 · 红桃扇，末尾是本局分 ─────
   * 顺序固定、不随吃进先后变：一眼能比较四家。变压器打头，像算式前面的系数「2 ×」；
   * 红桃扇放最后，张数再多也只往后长，前面几张的位置不动。
   * 红桃按点数叠成扇形，只露左上角；吃齐 13 张（全红 / 大满贯）本局分变金色。 */

  /* 增量更新：已有的小牌节点原样复用，只插入新来的、删掉没了的。
   * slide=true 时用 FLIP：先记下旧位置，改完 DOM 再从旧位置平移回来——
   * 新牌（incoming，先隐身占位）两边的牌在飞牌途中让开一个空位，飞来的牌正好落进去，之后不再收紧。 */
  function renderCaps(box, cards, incoming, ctx, slide) {
    if (!cards.length) { box.innerHTML = ''; return; }
    const hidden = new Set(incoming || []);
    const r = match.round;
    ctx = ctx || (r ? R.scoreCtx(r) : { rules: match.rules, exposed: [] });
    const sc = R.scoreCaptured(cards, ctx);
    let row = box.querySelector('.gz-caps-row');
    if (!row) { row = document.createElement('div'); row.className = 'gz-caps-row'; box.appendChild(row); }
    const old = new Map();
    row.querySelectorAll('.gz-mini').forEach((el) => old.set(+el.dataset.card, el));
    const before = new Map();
    if (slide) for (const [c, el] of old) before.set(c, el.getBoundingClientRect());
    // 本局分紧跟在牌后面：牌让开空位时它也跟着一起滑（和最后一张牌的距离不变），新牌插好之后才翻数
    const score0 = slide ? row.querySelector('.gz-cap-score') : null;
    const scoreBefore = score0 ? score0.getBoundingClientRect() : null;

    const mini = (c) => {
      let el = old.get(c);
      if (!el) {
        el = buildCard(c);
        el.classList.add('gz-mini');
        if (hidden.has(c)) el.classList.add('incoming');
      }
      el.classList.toggle('is-exposed', ctx.exposed.includes(c));
      old.delete(c);
      return el;
    };
    const want = [];
    if (sc.doubler) { const d = mini(R.DOUBLER); d.classList.add('is-doubler'); want.push(d); }
    if (sc.pig) want.push(mini(R.PIG));
    if (sc.sheep) want.push(mini(R.SHEEP));
    let fan = row.querySelector('.gz-fan');
    if (sc.hearts) {
      if (!fan) { fan = document.createElement('span'); fan.className = 'gz-fan'; }
      fan.querySelectorAll('.gz-fan-br').forEach((x) => x.remove());   // 两行红桃的断行点：先拿掉，fitFan 再按需要放
      // 全红也照样一张张排开（放不下时由 fitFan 换行 / 拆两行，不收成一叠：用户要看得见 13 张）
      const hs = cards.filter(R.isHeart).sort((a, b) => a - b).map(mini);
      hs.forEach((el, k) => { if (fan.children[k] !== el) fan.insertBefore(el, fan.children[k] || null); });
      while (fan.children.length > hs.length) fan.lastChild.remove();
      want.push(fan);
    } else if (fan) { fan.remove(); fan = null; }
    let score = row.querySelector('.gz-cap-score');
    const fresh = !score;
    if (!score) { score = document.createElement('span'); score.className = 'gz-cap-score gz-num'; }
    score.dataset.gold = sc.allHearts || sc.grandSlam ? '1' : '';   // 全红 / 大满贯：分数翻完变金色（不再给牌描金框）
    if (hidden.size && !fresh) score.dataset.next = sc.total;          // 牌在飞：旧分先留着，落地再翻
    else if (fresh && hidden.size) { score.dataset.next = sc.total; score.textContent = ''; score.dataset.v = ''; }
    else rollNumber(score, sc.total);
    want.push(score);
    want.forEach((el, k) => { if (row.children[k] !== el) row.insertBefore(el, row.children[k] || null); });
    for (const el of old.values()) el.remove();   // 新的一局：清掉上局的
    while (row.children.length > want.length) row.lastChild.remove();
    fitFan(box, row, fan);

    if (!slide) return;
    const dur = pace().fly;
    if (scoreBefore && score === score0 && score.isConnected) {
      const b = score.getBoundingClientRect();
      const dx = scoreBefore.left - b.left, dy = scoreBefore.top - b.top;
      // 用独立的 translate 属性，不跟数字翻动时的 transform: scale 打架
      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
        score.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0px 0px' }], { duration: dur, easing: 'cubic-bezier(.45, 0, .3, 1)' });
      }
    }
    if (!before.size) return;
    for (const [c, a] of before) {
      const el = row.querySelector('.gz-mini[data-card="' + c + '"]');
      if (!el) continue;
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
        { duration: dur, easing: 'cubic-bezier(.45, 0, .3, 1)' });
    }
  }

  /* 红桃扇的叠放间距：放得下就露 44%，放不下就叠紧一点（最少露 16%），整行永远不折 */
  /* 座位窄（左右两家；竖屏时顶上三家）的吃牌区留了两排高：红桃挤得看不清（每张露不到 30%）就整扇挪到第二排，
   * 第二排独占整行宽度。换排不改吃牌区高度，不挤动布局。
   * 我自己那排（出牌键在正中）：挤了就挪到更宽的地方——竖屏整排吃牌区另起一行、占满整宽；
   * 横屏没有多余的高度，就把红桃扇连同本局分挪到出牌键右边那半边（变压器 / 猪 / 羊留在头像旁）。 */
  function fitFan(box, row, fan) {
    row.classList.remove('is-wrapped', 'score-down');
    box.classList.remove('is-tall');
    const mine = box.parentElement === els.seats[0];
    if (mine) {
      els.table.classList.remove('is-me-spill');
      if (fan) fan.style.marginLeft = '';
    }
    const cs = getComputedStyle(box);
    const rows = parseInt(cs.getPropertyValue('--caps-rows'), 10) || 1;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const score = row.querySelector('.gz-cap-score');
    // 量宽度要连外边距（本局分左边有 3px）
    const outer = (el) => { const st = getComputedStyle(el); return el.getBoundingClientRect().width + (parseFloat(st.marginLeft) || 0) + (parseFloat(st.marginRight) || 0); };
    const scoreW = score ? outer(score) : 0;
    // 第一行（变压器 / 猪 / 羊 + 本局分）有多宽
    let specW = 0, specN = 0;
    for (const el of row.children) if (el !== fan && el !== score) { specW += outer(el); specN++; }
    const line1W = specW + scoreW + gap * Math.max(0, specN + (score ? 1 : 0) - 1);
    const W = box.clientWidth - 10;   // 留出行内边距和小牌的影子
    if (!fan) {
      // 没有红桃，但三张特殊牌 + 本局分一行放不下：窄座位把分挪到第二行；我自己那排（竖屏）整排另起一行
      if (line1W > W && mine) els.table.classList.add('is-me-spill');
      else if (rows > 1 && score && line1W > W) row.classList.add('is-wrapped', 'score-down');
      return;
    }
    // --m 是 clamp() 表达式，parseFloat 读不出来：直接量一张小牌的实际宽度
    const first = fan.querySelector('.gz-mini');
    const m = (first && first.getBoundingClientRect().width) || 28;
    fan.querySelectorAll('.gz-fan-br').forEach((x) => x.remove());
    const n = fan.children.length;
    let split = false;
    const fanAvail = () => {
      let others = 0;
      for (const el of row.children) if (el !== fan) others += outer(el);
      return box.clientWidth - others - gap * (row.children.length - 1) - 10;
    };
    const tight = (w) => (n > 1 ? (w - m) / (n - 1) < m * 0.44 : w < m);
    let avail = fanAvail();
    if (mine && tight(avail)) {
      els.table.classList.add('is-me-spill');
      if (getComputedStyle(els.seats[0]).display === 'grid') avail = fanAvail();   // 竖屏：另起一行，宽度变成整排
      else {
        const band = els.play.parentElement.getBoundingClientRect();
        const start = band.right + 12;
        fan.style.marginLeft = Math.max(0, start - fan.getBoundingClientRect().left) + 'px';
        const score = row.querySelector('.gz-cap-score');
        avail = box.getBoundingClientRect().right - start - (score ? score.getBoundingClientRect().width + gap : 0) - 6;
      }
    } else if (rows > 1 && tight(avail)) {
      row.classList.add('is-wrapped');
      avail = W;
      // 第一行连本局分也放不下：分跟到第二行、排在红桃后面
      if (score && line1W > W) { row.classList.add('score-down'); avail = W - outer(score) - gap; }   // 挪下来的分字号小一点，重新量
      // 第二行还是挤（每张露不到 32%）：红桃再拆成上下两行（吃牌区临时长高一行）
      if (n >= 6 && (avail - m) / (n - 1) < m * 0.32) {
        const k = Math.ceil(n / 2);
        split = true;
        const st = Math.max(m * 0.16, Math.min(m * 0.44, (avail - 4 - m) / (k - 1)));   // −4：扇子宽度里那 4px（见下）
        const br = document.createElement('i');
        br.className = 'gz-fan-br';
        fan.insertBefore(br, fan.children[k]);
        fan.style.width = (m + (k - 1) * st + 4).toFixed(1) + 'px';   // 扇子自身左右各 1px 内边距（border-box），再留 2px 舍入余量，否则第一行最后一张会被挤到第三行
        fan.style.setProperty('--fanstep', st.toFixed(1) + 'px');
      }
    }
    box.classList.toggle('is-tall', split);
    fan.classList.toggle('is-split', split);
    if (split) return;
    fan.style.width = '';
    const step = n > 1 ? Math.max(m * 0.16, Math.min(m * 0.44, (avail - m) / (n - 1))) : 0;
    fan.style.setProperty('--fanstep', step.toFixed(1) + 'px');
  }

  // 窗口变了：四家吃牌区按现在的宽度重排（红桃扇间距、换排、我那排挪位都是按像素算的）
  function refitCaps() {
    els.seats.forEach((el) => {
      const box = el.querySelector('.gz-caps'), row = box && box.querySelector('.gz-caps-row');
      if (row) fitFan(box, row, row.querySelector('.gz-fan'));
    });
  }

  // 红桃扇是不是被挤得露不到 44%（看不清点数）了
  function fanSqueezed(box) {
    const fan = box.querySelector('.gz-fan');
    const first = fan && fan.querySelector('.gz-mini');
    if (!first || fan.children.length < 2) return false;
    const step = parseFloat(fan.style.getPropertyValue('--fanstep')) || 0;
    return step < first.getBoundingClientRect().width * 0.44 - 0.5;
  }

  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }

  /* 分数变化：从旧值一路数到新值（变化越大数得越久，最长约 0.9 秒），数的时候数字放大、涨分闪墨绿扣分闪朱红，数完回原样。
   * 用 setInterval 而不是 rAF：后台页也能数到终点。 */
  function rollNumber(el, n) {
    const prev = el.dataset.v;
    el.dataset.v = n;
    clearInterval(el._roll);
    const settle = () => {
      el.textContent = signed(n);
      el.classList.toggle('neg', n < 0);
      el.classList.toggle('pos', n > 0 && el.classList.contains('gz-cap-score'));
      el.classList.toggle('is-gold', el.dataset.gold === '1');
      el.classList.remove('is-rolling', 'up', 'down');
    };
    if (prev === undefined || prev === '' || +prev === n || reduceMotion()) { settle(); return; }
    const from = +prev, dur = Math.min(900, 320 + Math.abs(n - from) * 3);
    const t0 = performance.now();
    el.classList.add('is-rolling', n > from ? 'up' : 'down');
    el._roll = setInterval(() => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      if (t >= 1) { clearInterval(el._roll); settle(); return; }
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = signed(Math.round(from + (n - from) * e));
    }, 30);
  }

  /* ───── 座位：结构只建一次，之后只更新内容（飞牌动画要拿稳定的落点） ───── */

  // 头像外圈的倒计时环：轮到谁谁亮，环随时间收走
  const CLOCK_SVG = '<svg class="gz-clock" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" pathLength="100"/></svg>';

  function buildSeats() {
    els.seats.forEach((el, s) => {
      el.innerHTML =
        '<div class="gz-who"><span class="gz-avatar"><span class="gz-av-face" data-v="' + esc(AVATARS[s]) + '">' + faceHtml(AVATARS[s]) + '</span>' + CLOCK_SVG + '</span>' +
        '<span class="gz-name-line"><span class="gz-name">' + esc(NAMES[s]) + '</span><span class="gz-total gz-num"></span>' +
        (s > 0 && !online && soloBots() ? '<span class="gz-tag is-dir">' + SOLO_DIRS[s] + '</span>' : '') +
        (s === 0 && !online && soloBots() && MENU_PV.me === 'me-a' ? '<span class="gz-tag is-dir is-me">我</span>' : '') + '</span></div>' +
        (s === 0 ? '' : '<div class="gz-hold"><span class="gz-backs" aria-hidden="true"></span><span class="gz-shown"></span></div>') +
        '<div class="gz-caps"></div>';
      el.setAttribute('aria-label', NAMES[s]);
    });
  }

  /* 一轮刚打满、分牌还没飞到：规则引擎已经记进了赢家的吃牌，界面先别画（显示层 ov.trick.hold），等飞过去时再「划开插入」 */

  function renderSeat(s, incoming, slide) {
    const r = match.round;
    const el = els.seats[s];
    const tot = el.querySelector('.gz-total');
    rollNumber(tot, match.totals[s]);
    tot.classList.toggle('neg', match.totals[s] < 0);
    const backs = el.querySelector('.gz-backs');
    if (backs) {
      const left = ov.deal ? ov.deal.have[s] : r ? r.hands[s].length : 0;
      if (backs.childElementCount !== left) backs.innerHTML = '<span class="gz-back"></span>'.repeat(left);
    }
    // 别家亮出、还在手里的牌：牌背旁边摊开给大家看
    const shown = el.querySelector('.gz-shown');
    if (shown) {
      const want = r ? r.exposed.filter(([c, o]) => o === s && r.hands[s].includes(c)).map(([c]) => c) : [];
      const have = [...shown.children].map((x) => +x.dataset.card);
      if (want.join() !== have.join()) {
        shown.innerHTML = '';
        for (const c of want) {
          const m = buildCard(c);
          m.classList.add('gz-mini', 'is-exposed');
          shown.appendChild(m);
        }
      }
    }
    const tone = r ? dblTone(r.captured[s], R.scoreCtx(r)) : 'navy';
    el.dataset.dbl = tone;
    els.slots[s].dataset.dbl = tone;
    if (s === 0) els.hand.dataset.dbl = tone;
    const caps = r ? r.captured[s].filter((c) => !heldCap(c)) : [];
    renderCaps(el.querySelector('.gz-caps'), caps, incoming, null, slide);
    el.classList.toggle('is-turn', turnSeat() === s);
  }

  /* 现在轮到谁：亮牌环节是正在决定亮不亮的人，打牌时是该出牌的人 */
  function turnSeat() {
    const r = match.round;
    if (!r || R.isRoundOver(r)) return -1;
    // 亮牌阶段：只有我自己（手里有可亮牌、还没决定时）亮起，别家一律不显示
    if (match.exposing.length) return match.exposing.includes(0) && !busy ? 0 : -1;
    return r.turn;
  }
  function exposingMe() { return !!(match.round && match.exposing.includes(0)); }
  function myLegal(r) {
    const g = match.tutorial && tut && tut.adv ? T.advanced.guide(r) : -1;
    return g >= 0 ? [g] : R.legalFor(r, 0);
  }

  /* 明了 ♥A（这一局红桃全部翻倍）：牌桌上所有红桃都垫一层淡红底（见 gongzhu.css「明牌牌面」）。
   * 打牌时看这一局的明牌；一局结束、结算页还开着时看刚结束那局的。 */
  // 我点选了 ♥A、或已经明出去还在等别家 / 服务器：先按明了算，和 ♥A 自己的明牌底色同一刻变
  function syncHeartsX2() {
    const r = match && match.round;
    const ex = r ? r.exposed.map((e) => e[0]).concat(ov.held, exposingMe() ? exposePick : [])
      : (match && match.last && match.last.ctx && match.last.ctx.exposed) || [];
    els.app.classList.toggle('is-hx2', ex.includes(R.HEART_ACE));
  }

  function renderSeats() {
    syncSocialUi();
    syncHeartsX2();
    for (let s = 0; s < 4; s++) renderSeat(s);
    if (rimPv) rimPv.sync();
    if (match.online && match.lobby) return;
    els.roundNo.textContent = match.tutorial ? (match.adv ? '进阶教程' : '新手教程') : '第 ' + match.roundNo + (match.rules.end === 'rounds10' ? ' / 10' : '') + ' 局';
  }

  /* 这一轮打什么花色：首家出牌后，桌子正中淡淡浮出一个大花色（压在牌下面），一轮结束放特效 / 收牌前就淡掉，
   * 不跟着牌一起收走——它不是牌，收进头像反倒像被谁吃了。 */
  // 四种花色字形的「墨量」差得很多（同字号下 ♥ 的面积约是 ♠ 的 3.9 倍，♦ 2.4 倍，♣ 1.2 倍），重心也高低不一：
  // 按实测墨量把面积拉齐、按墨的重心挪回正中——四个花色看起来一样大、都在桌子正中。[缩放, 下移 em]
  const LEAD_FIT = { 0: [1.3, 0.068], 1: [0.664, 0.067], 2: [0.836, 0.002], 3: [1.185, 0.072] };
  function showLead(suit) {
    let el = els.center.querySelector('.gz-lead');
    if (!el) { el = document.createElement('div'); el.className = 'gz-lead'; el.setAttribute('aria-hidden', 'true'); els.center.prepend(el); }
    if (suit < 0) { el.classList.remove('on'); return; }
    if (el.dataset.suit !== String(suit)) {
      // 换花色：先瞬间藏起来再浮出，不让上一轮的花色变形成这一轮的
      el.classList.remove('on');
      el.dataset.suit = suit;
      el.classList.toggle('red', suit === 1 || suit === 2);
      el.innerHTML = suitSVG(suit);
      el.style.setProperty('--ls', LEAD_FIT[suit][0]);
      el.style.setProperty('--ldy', LEAD_FIT[suit][1] + 'em');
      void el.offsetWidth;
    }
    el.classList.add('on');
  }

  /* plays 缺省为当前墩；一墩刚打完时 r.trick 已清空，传入完成的那一墩继续展示 */
  function renderTrick(plays, enteringSeat) {
    const r = match.round;
    els.slots.forEach((slot) => { slot.innerHTML = ''; });
    const t = liveTrick();
    const fromOv = !plays && !!t;
    plays = plays || (t ? (t.onTable ? t.done.plays : []) : r ? r.trick : []);
    showLead(plays.length && (!fromOv || t.lead) ? R.suitOf(plays[0].card) : -1);
    setFxing(!!(t && t.fxing));
    if (!plays.length) return;
    const lead = R.suitOf(plays[0].card);
    let top = plays[0];
    for (const p of plays) if (R.suitOf(p.card) === lead && R.rankOf(p.card) > R.rankOf(top.card)) top = p;
    plays.forEach((p) => {
      const card = buildCard(p.card);
      if (isExposedCard(p.card)) card.classList.add('is-exposed');   // 明出来的牌打到桌上也还是明牌的样子（变压器 ×4）
      if (p === top && plays.length > 1) card.classList.add('is-top');
      if (landing.has(p.card)) card.classList.add('gz-landing');   // 出牌预览：还在飞的那张先占位不显示
      else if (p.seat === enteringSeat) card.classList.add('in');
      els.slots[p.seat].appendChild(card);
    });
  }

  function renderHand() {
    const r = match.round;
    const was = GZPLAY.fly && !ov.deal ? handRects() : null;   // 出牌预览：记下每张牌现在在哪，重画后从原处滑过去（FLIP）
    els.hand.innerHTML = '';
    if (!r) { els.play.disabled = true; return; }
    if (watching()) { renderWatchHand(r); return; }
    const hand = ov.deal ? r.hands[0].filter((c) => ov.deal.mine.includes(c)) : r.hands[0].slice();
    R.sortHand(hand);
    const exposing = exposingMe() && !busy;
    const myTurn = !exposing && !match.exposing.length && !R.isRoundOver(r) && r.turn === 0 && !busy;
    // 亮牌环节：能亮的那几张亮着，点一下盖印 / 再点取消
    const legal = exposing ? R.EXPOSABLE.filter((c) => hand.includes(c)) : myTurn ? myLegal(r) : hand;
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 56;
    const W = els.hand.clientWidth;
    const n = hand.length;
    let gaps = 0;
    for (let i = 1; i < n; i++) if (R.suitOf(hand[i]) !== R.suitOf(hand[i - 1])) gaps++;
    const gapW = u * 0.22;
    const step = n > 1 ? Math.min(u * 0.62, (W - u - gaps * gapW) / (n - 1)) : 0;
    const total = u + step * (n - 1) + gaps * gapW;
    let x = Math.max(0, (W - total) / 2);
    els.hand.classList.toggle('my-turn', myTurn || exposing);
    // 只剩一张能出（比如开局的 ♠2）就直接替我选好
    if (myTurn && legal.length === 1 && selected < 0 && !(GZPLAY.one && one.noSel === turnKey())) selected = legal[0];
    if (GZPLAY.one && myTurn && selected >= 0 && !legal.includes(selected)) selected = -1;   // 先选好的那张轮到我时不能出：放下
    hand.forEach((c, i) => {
      if (i > 0 && R.suitOf(c) !== R.suitOf(hand[i - 1])) x += gapW;
      const el = buildCard(c);
      el.style.left = x.toFixed(1) + 'px';
      el.style.zIndex = String(i + 1);
      el.setAttribute('role', 'option');
      el.setAttribute('aria-label', cardName(c));
      if ((myTurn || exposing) && !legal.includes(c)) { el.classList.add('is-illegal'); el.setAttribute('aria-disabled', 'true'); }
      if (isExposedCard(c) || (exposing && exposePick.includes(c)) || ov.held.includes(c)) el.classList.add('is-exposed');
      if (c === suggestCard && myTurn) el.classList.add('is-suggest');
      if (exposing ? exposePick.includes(c) : c === selected) { el.classList.add('selected'); el.setAttribute('aria-selected', 'true'); }
      el.addEventListener('click', () => onCardTap(c, el));
      els.hand.appendChild(el);
      x += step;
    });
    syncHeartsX2();
    if (was) flipHand(was);
    els.noExpose.hidden = !exposing || !!match.tutorial;   // 进阶教程里这一步要明牌
    if (!exposing) hideExposeTip();
    if (GZPLAY.exp) expBand(exposing, legal.length > 0);
    if (exposing && GZPLAY.exp) { els.play.textContent = '明牌'; els.play.disabled = !exposePick.length; els.play.hidden = !legal.length; return; }
    if (exposing) {
      // 两个键分开：「不明牌」随时能点；「明牌」要先在手牌里点选（再点一下取消），选了几张写在键上
      els.play.textContent = exposePick.length ? '明牌 ' + exposePick.length + ' 张' : '明牌';
      els.play.disabled = !exposePick.length;
      els.play.hidden = !legal.length;   // 手里没有能明的牌（联机也要表个态）：只留「不明牌」
      return;
    }
    els.play.hidden = false;
    els.play.textContent = '出牌';
    els.play.disabled = !(myTurn && selected >= 0 && legal.includes(selected));
    if (GZPLAY.one) oneHook(r, myTurn, legal, hand.length);
  }

  /* 观战：下面这一家的手牌只画牌背（亮出来的牌照常翻开），和别家一样只看得到张数 */
  function renderWatchHand(r) {
    const known = r.hands[0].filter((c) => c !== HIDDEN);
    R.sortHand(known);
    const cards = known.concat(r.hands[0].filter((c) => c === HIDDEN));
    const u = parseFloat(getComputedStyle(els.app).getPropertyValue('--u')) || 56;
    const W = els.hand.clientWidth;
    const n = cards.length;
    const step = n > 1 ? Math.min(u * 0.62, (W - u) / (n - 1)) : 0;
    let x = Math.max(0, (W - (u + step * (n - 1))) / 2);
    els.hand.classList.remove('my-turn');
    cards.forEach((c, i) => {
      let el;
      if (c === HIDDEN) { el = document.createElement('span'); el.className = 'gz-card gz-card-back'; }
      else { el = buildCard(c); if (isExposedCard(c)) el.classList.add('is-exposed'); }
      el.style.left = x.toFixed(1) + 'px';
      el.style.zIndex = String(i + 1);
      el.setAttribute('aria-hidden', 'true');
      els.hand.appendChild(el);
      x += step;
    });
    syncHeartsX2();
    els.noExpose.hidden = true;
    els.play.disabled = true;
  }

  function renderAll() { renderSeats(); renderTrick(); renderHand(); }

  /* ───── 流程 ───── */

  function startRound() {
    match.roundNo++;
    const rng = R.makeRng((match.seed + match.roundNo * 7919) >>> 0);
    const hands = R.deal(rng);
    const st = R.roundStart(match.rules, hands, match.roundNo === 1, match.pigTaker);
    match.round = R.createRound(hands, st.leader, st.mustLead, match.rules);
    // 亮牌：手里有可亮牌的人同时决定，最后一起亮出（不再一家一家轮着问——谁头上转倒计时就等于告诉大家他有特殊牌）
    match.exposing = match.rules.expose
      ? [0, 1, 2, 3].filter((s) => R.EXPOSABLE.some((c) => hands[s].includes(c)))
      : [];
    selected = -1;
    exposePick = [];
    ov.held = [];
    save();
    if (DEAL_FX && !match.tutorial) { dealIntro().then(guard(() => step())); return; }
    renderAll();
    snd('deal');
    schedule(step, 450);
  }

  /* ───── 开局发牌动画（2026-11-12，照百变小咪的做法；用户试了甲乙丙三种洗法，选定乙「鸽尾洗」）─────
   * 牌堆是真的一摞：52 张每张一层奶油色纸边（位置带一点点随机偏差，看着是手码的），最上面一张牌背；影子长在最底下那层上。
   * 落下后鸽尾洗：整摞分成左右两半（各带各的厚度和影子）往两边一掰，两边交替往中间落、中间那摞一层层长高，拍齐。
   * 然后从下家开始一圈圈发，拿一张牌堆就真少一层：别家的飞到头像（头像旁的牌背一张张多起来），
   * 我的飞进手里（落地就翻开、按花色排好）。点一下桌面直接发完。?gzdeal=0 关掉（排查用），?fxdemo=deal 循环看。 */
  const DEAL_FX = new URLSearchParams(location.search).get('gzdeal') !== '0';
  // 发牌中的显示记在 ov.deal：{ have: 每家已经到手几张, mine: 我已经到手的牌, skip }

  /* 一摞牌（发牌 / 洗牌用）：fixed 定位在 (x, y) 为中心，n 张就 n 层纸边 + 顶上一张牌背；整摞是一个元素，挪它就连厚度带影子一起挪 */
  const PILE_EDGES = ['#f7f0e1', '#efe6d3', '#f3ebda', '#e8ddc7'];
  const pileJit = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  function makePile(x, y, w, h, n) {
    const el = document.createElement('span');
    el.className = 'gz-pile';
    el.style.cssText = 'left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px';
    el.innerHTML = '<b class="gz-pile-top"></b>';
    el._w = w;
    els.app.appendChild(el);
    setPile(el, n);
    return el;
  }
  const pileStep = (w) => w * 0.0102;   // 每张牌多高（同百变小咪「乙」：笔直往上叠）
  function setPile(el, n) {
    const w = el._w, top = el.lastElementChild;
    let sheets = el.querySelectorAll('.gz-sheet');
    const want = Math.max(0, n - 1);
    for (let i = sheets.length - 1; i >= want; i--) sheets[i].remove();
    for (let i = sheets.length; i < want; i++) {
      const d = document.createElement('i');
      d.className = 'gz-sheet' + (i === 0 ? ' is-floor' : '');
      d.style.background = PILE_EDGES[Math.floor(pileJit(i, 1) * PILE_EDGES.length)];
      d.style.transform = 'translate(' + ((pileJit(i, 2) - 0.5) * 0.019 * w).toFixed(2) + 'px,' + (-i * pileStep(w)).toFixed(2) + 'px) rotate(' + ((pileJit(i, 3) - 0.5) * 0.9).toFixed(2) + 'deg)';
      el.insertBefore(d, top);
    }
    el._n = n;
    top.hidden = !n;
    top.classList.toggle('is-floor', n === 1);
    top.style.transform = 'translateY(' + (-Math.max(0, n - 1) * pileStep(w)).toFixed(2) + 'px)';
  }
  // 一摞顶上那张牌在屏幕上的中心
  // （按整摞的框算、再往上抬它的厚度：空摞的顶牌是藏着的，量不到位置）
  function pileTop(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 - Math.max(0, (el._n || 0) - 1) * pileStep(el._w) }; }

  async function dealIntro() {
    const r = match.round;
    if (!r) return;
    const my = token;
    const D = ov.deal = { have: [0, 0, 0, 0], mine: [], skip: false };
    const alive = () => my === token && ov.deal === D && !D.skip;
    const done = () => { if (ov.deal === D) ov.deal = null; };
    busy = true;
    renderAll();
    const reduce = reduceMotion();
    const cs = getComputedStyle(els.app);
    const u = parseFloat(cs.getPropertyValue('--u')) || 56, h = parseFloat(cs.getPropertyValue('--h')) || u * 1.4;
    const c = els.center.getBoundingClientRect();
    const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    const w = u * 0.86, hh = h * 0.86;
    const total = r.hands.reduce((a, x) => a + x.length, 0);
    const sleep = (ms) => new Promise((res) => setTimeout(res, reduce ? 0 : ms));
    const anim = (el, kf, o) => el.animate(kf, o).finished.catch(() => {});
    const mkBack = () => { const el = document.createElement('span'); el.className = 'gz-deal-card'; el.style.cssText = 'left:0;top:0;width:' + w + 'px;height:' + hh + 'px'; els.app.appendChild(el); return el; };
    const at = (p, extra) => 'translate(' + (p.x - w / 2).toFixed(1) + 'px,' + (p.y - hh / 2).toFixed(1) + 'px)' + (extra || '');
    const deck = makePile(cx, cy, w, hh, total);
    const cleanup = () => { els.app.querySelectorAll('.gz-pile, .gz-deal-card').forEach((x) => x.remove()); };
    if (!reduce) {
      // 牌堆落下
      await anim(deck, [{ transform: 'translateY(-50px) scale(1.15)', opacity: 0 }, { transform: 'translateY(3px) scale(.98)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,.7,.4,1)' });
      if (alive()) await shuffleRiffle();
    }
    // 鸽尾洗——整摞分成左右两半（各带各的厚度和影子）往两边一掰，两边交替往中间落，中间那摞一层层长高，最后拍齐
    async function shuffleRiffle() {
      const half = Math.ceil(total / 2), dx = w * 0.66;
      const L = makePile(cx, cy, w, hh, half), Rt = makePile(cx, cy, w, hh, total - half);
      deck.style.visibility = 'hidden';
      setPile(deck, 0);
      snd('deal');
      await Promise.all([
        anim(L, [{ transform: 'none' }, { transform: 'translate(' + (-dx) + 'px,4px) rotate(-9deg)' }], { duration: 240, easing: 'ease-out', fill: 'forwards' }),
        anim(Rt, [{ transform: 'none' }, { transform: 'translate(' + dx + 'px,4px) rotate(9deg)' }], { duration: 240, easing: 'ease-out', fill: 'forwards' }),
      ]);
      deck.style.visibility = '';
      const drops = [];
      let k = 0;
      while ((L._n || Rt._n) && alive()) {
        const src = (k % 2 === 0 && L._n) || !Rt._n ? L : Rt, take = Math.min(src._n, 1 + (k % 3 === 1 ? 1 : 0) + (pileJit(k, 5) > 0.6 ? 1 : 0));
        const from = pileTop(src);
        setPile(src, src._n - take);
        const fl = mkBack(), land = pileTop(deck), tilt = src === L ? -9 : 9;
        if (k % 3 === 0) snd('deal');
        drops.push(anim(fl, [
          { transform: at(from, ' rotate(' + tilt + 'deg)') },
          { transform: at({ x: (from.x + land.x) / 2, y: Math.min(from.y, land.y) - hh * 0.12 }, ' rotate(' + (tilt / 2) + 'deg)'), offset: 0.5 },
          { transform: at({ x: land.x, y: land.y - take * pileStep(w) }) },
        ], { duration: 150, easing: 'ease-in', fill: 'forwards' }).then(() => { fl.remove(); setPile(deck, deck._n + take); }));
        k++;
        await sleep(34);
      }
      await Promise.all(drops);
      L.remove(); Rt.remove();
      setPile(deck, total);
      snd('deal');
      await anim(deck, [{ transform: 'scaleX(1.05) translateY(-2px)' }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
    }
    if (!(my === token && ov.deal === D)) { cleanup(); done(); return; }
    const target = (s) => {
      if (s === 0) { const hr = els.hand.getBoundingClientRect(); return { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 }; }
      const av = els.seats[s].querySelector('.gz-avatar').getBoundingClientRect();
      return { x: av.left + av.width / 2, y: av.top + av.height / 2 };
    };
    const order = [];   // 一圈一圈：下家、对家、上家、我；续局时手里可能已经不足 13 张
    for (let k = 0; k < 13; k++) for (let d = 1; d <= 4; d++) { const s = d % 4; if (k < r.hands[s].length) order.push([s, r.hands[s][k]]); }
    const flights = [];
    for (let i = 0; i < order.length; i++) {
      if (!alive()) break;
      const [s, card] = order[i];
      const land = () => { if (ov.deal !== D) return; if (s === 0) { D.mine.push(card); renderHand(); } else { D.have[s]++; renderSeat(s); } };
      if (reduce) { land(); continue; }
      const from = pileTop(deck), t = target(s);
      setPile(deck, deck._n - 1);
      const fl = mkBack();
      const rot = ((i * 37) % 30 - 15), sc = s === 0 ? 1 : 0.45;
      if (i % 2 === 0) snd('deal');
      // 拿起来先抬一点（离桌、变大一丁点），再落到那一家
      flights.push(fl.animate([
        { transform: at(from), opacity: 1 },
        { transform: at({ x: from.x + (t.x - from.x) * 0.35, y: from.y + (t.y - from.y) * 0.35 - hh * 0.18 }, ' rotate(' + (rot * 0.5) + 'deg) scale(' + (1.08 - (1 - sc) * 0.3).toFixed(3) + ')'), opacity: 1, offset: 0.35 },
        { transform: at(t, ' rotate(' + rot + 'deg) scale(' + sc + ')'), opacity: s === 0 ? 1 : 0.6 },
      ], { duration: 280, easing: 'cubic-bezier(.3,.6,.35,1)', fill: 'forwards' }).finished.then(() => { fl.remove(); land(); }, () => fl.remove()));
      await sleep(38);
    }
    await Promise.all(flights);
    cleanup();
    done();
    if (my !== token) return;
    renderAll();
  }
  function skipDeal() { if (ov.deal) ov.deal.skip = true; }

  // 排着的回调都记账：清场时一把清掉（光换 token 只是让它们到点不干活）
  const fxTimers = new Set();
  function schedule(fn, ms) {
    const my = token;
    const id = setTimeout(() => { fxTimers.delete(id); if (my === token) fn(); }, ms);
    fxTimers.add(id);
    return id;
  }
  // 特效的善后（到点把放完的元素拿掉）：不认 token——拿掉一个已经放完的元素什么时候都无害；记账是为了清场时一起清
  function after(fn, ms) {
    const id = setTimeout(() => { fxTimers.delete(id); fn(); }, ms);
    fxTimers.add(id);
    return id;
  }

  /* 统一清场：重开 / 进出教程 / 联机重新同步 / 暂停都走这里。作废所有排着的回调、掐掉排在音频时钟上的音效、
   * 清空动画层（特效、飞着的牌、发牌的牌堆）、撤掉临时样式、放掉显示层；画面按状态重画由调用方接着做。
   * keepTrick（暂停）：这一轮没收完的那份显示留着，继续时从桌上四张牌重放特效和收牌（见 step） */
  function clearScene(keepTrick) {
    token++;
    fxTimers.forEach((id) => clearTimeout(id));
    fxTimers.clear();
    if (window.GongzhuAudio && window.GongzhuAudio.hush) window.GongzhuAudio.hush();
    fxLayers.forEach((l) => { l._gfx.clear(); if (l !== els.fx) fxLayers.delete(l); });
    els.fx.innerHTML = '';
    els.app.querySelectorAll('.gz-flyer, .gz-pile, .gz-deal-card').forEach((x) => x.remove());
    // 头像咽一下、分牌落进吃牌区这些挂在真元素上的动画：直接停在终点
    els.seats.forEach((el) => el.querySelectorAll('.gz-avatar, .gz-caps .gz-mini').forEach((x) => x.getAnimations().forEach((a) => a.cancel())));
    els.center.classList.remove('is-fxing', 'is-review');
    guideHide(false);
    landing.clear(); one.key = '';   // 出牌预览：在飞的牌、排着的自动出牌一起作废（飞的那张替身是 .gz-flyer，上面已经拿掉）
    els.app.querySelectorAll('.gz-landing').forEach((x) => x.classList.remove('gz-landing'));
    ov.deal = null;
    const t = keepTrick ? liveTrick() : null;
    if (t) Object.assign(t, { onTable: true, lead: true, fxing: false, replay: true });
    ov.trick = t;
  }
  // 桌上这一轮的牌调暗（特效正在桌心放）：跟着显示层走，清场 / 重画时不会残留
  function setFxing(on) {
    const t = liveTrick();
    if (t) t.fxing = on;
    els.center.classList.toggle('is-fxing', on);
    if (GZTUT_PV) {   // 教程预览：桌心放印章时实战引导先收起（不算看过），放完再补出来
      if (on) guideHide(false);
      else setTimeout(guideCheck, 0);
    }
  }
  // AI 结果是异步回来的：发请求时就记下 token，回来时已经重开 / 进了教程就丢掉
  function guard(fn) {
    const my = token;
    return (x) => { if (my === token) fn(x); };
  }

  function step() {
    if (match && match.online) { onlineStep(); return; }   // 联机：不跑 AI，按服务器发来的事件一条条播
    const r = match.round;
    if (!r) return;
    // 一轮结束的流程被暂停打断：四张牌摆回桌上，停一下，从头重放特效和收牌
    const rt = liveTrick();
    if (rt && rt.replay) { rt.replay = false; busy = true; renderAll(); schedule(settleTrick, pace().trickShow); return; }
    if (R.isRoundOver(r)) { schedule(finishRound, pace().roundEnd); return; }
    if (match.tutorial) { tutStep(); return; }
    guideCheck();
    if (match.exposing.length) { exposeStep(); return; }
    renderSeats();
    if (r.turn === 0 && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyTimeout); dingMyTurn(); return; }
    busy = true;
    renderHand();
    const started = performance.now();
    const seat = r.turn;
    if (seat !== 0) startClock(seat, null);
    chooseAi(r, seat, seat === 0 ? takeoverTier(botTiers()) : seatTier(seat)).then(guard((card) => {
      const wait = Math.max(0, pace().aiMin - (performance.now() - started));
      schedule(() => commit(seat, card), wait);
    }));
  }

  /* ───── 亮牌环节 ───── */

  /* 机器人在后台同时想好（谁也看不到谁在想），我有可亮牌就等我选，选完一起亮出。
   * 这样亮牌阶段的长短、谁头上有倒计时，都跟别家手里有没有特殊牌无关。 */
  let exposeWait = null;   // { bots: Promise<[seat, cards][]> }
  function exposeStep() {
    const r = match.round;
    const bots = match.exposing.filter((s) => s !== 0);
    exposeWait = { bots: Promise.all(bots.map((s) => chooseExpose(r, s, seatTier(s)).then((cards) => [s, cards]))) };
    const meIn = match.exposing.includes(0);
    renderSeats();
    if (meIn && !AUTO && !autopilot) { busy = false; renderHand(); startClock(0, onMyExposeTimeout, EXPOSE_MS); dingMyTurn(); maybeExposeTip(); return; }
    busy = true;
    renderHand();
    if (meIn) chooseExpose(r, 0, takeoverTier(botTiers())).then(guard((cards) => applyExpose(0, cards)));
    else finishExpose([]);
  }

  // 我选好了（或超时由机器人替我选）
  function applyExpose(seat, cards) {
    stopClock();
    busy = true;
    exposePick = [];
    if (seat === 0) ov.held = cards.slice();
    renderSeats();
    renderHand();
    finishExpose(cards);
  }

  function finishExpose(mine) {
    const w = exposeWait;
    if (!w) return;
    w.bots.then(guard((list) => {
      if (exposeWait !== w) return;
      const r = match.round;
      const all = list.concat([[0, mine]]);
      for (let d = 0; d < 4; d++) {
        const s = (r.leader + d) % 4;
        const e = all.find((x) => x[0] === s);
        if (e) for (const c of e[1]) if (r.hands[s].includes(c)) R.expose(r, s, c);
      }
      match.exposing = [];
      exposeWait = null;
      ov.held = [];
      renderSeats();
      renderHand();
      r.exposed.forEach((_, i) => snd('stamp', i * 160));
      save();
      schedule(step, r.exposed.length ? 700 : 120);
    }));
  }

  // 明牌倒计时到了：算不明牌（和联机服务器一样），不让机器人替我选、也不算超时次数
  function onMyExposeTimeout() {
    if (!exposingMe() || busy) return;
    busy = true;
    exposePick = [];
    applyExpose(0, []);
  }

  /* 正式对局里第一次碰到明牌、手里真有能明的牌、还没学过进阶教程：桌子中间出一次小提示「第一次碰到明牌？」，
   * 单机可以直接去学进阶教程（学完回来接着这一局），联机给看规则（直接翻到「明牌」）。出过一次就不再出，不挡出牌 */
  let exposeTip = null;
  function maybeExposeTip() {
    if (match.tutorial || AUTO || GZTUT_PV || readJSON(ADV_KEY) || readJSON(EXPOSE_TIP_KEY)) return;   // 预览里换成实战引导（guideCheck）
    if (!match.round || !R.EXPOSABLE.some((c) => match.round.hands[0].includes(c))) return;
    writeJSON(EXPOSE_TIP_KEY, 1);
    if (!exposeTip) {
      exposeTip = document.createElement('div');
      exposeTip.className = 'gz-tip';
      els.center.appendChild(exposeTip);
      exposeTip.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tip]');
        if (!b) return;
        hideExposeTip();
        if (b.dataset.tip === 'learn') { if (match.online) showRules(); else startTutorial(false, 'adv'); }
      });
    }
    exposeTip.innerHTML = '<span>第一次碰到明牌？</span><button type="button" class="gz-btn" data-tip="learn">' + (match.online ? '看看规则' : '看看怎么玩') + '</button>' +
      '<button type="button" class="gz-btn" data-tip="ok">知道了</button>';
    exposeTip.hidden = false;
  }
  function hideExposeTip() { if (exposeTip) exposeTip.hidden = true; }

  // 明牌阶段的倒计时（不限时也有）：转在我自己头像上，和出牌一样；联机按服务器的截止时间
  const EXPOSE_MS = 15000;

  function commit(seat, card) {
    const r = match.round;
    const src = playFrom(seat, card);   // 出牌预览（?gzplay=fly-*）：起点——我的从手里原位，别家的从头像；不带参数为 null
    stopClock();
    const done = R.playCard(r, seat, card);
    snd('play');
    if (seat === 0) selected = -1;
    if (seat === 0 && match.tutorial) { hideCoach(); clearTimeout(idleTimer); suggestCard = -1; els.play.classList.remove('is-suggest'); }
    busy = true;   // 下一手由 step() 接手，轮到我时它再放开；早放开会让我抢在 step 前出牌、排出两次 step
    if (done) ov.trick = { match, done, talk: null, hold: new Set(done.plays.map((p) => p.card).filter(R.isScoring)), onTable: true, lead: true, fxing: false, replay: false };
    renderTrick(done ? done.plays : null, seat);
    if (src) flyIn(seat, card, src);
    markAce(done ? done.plays : r.trick, seat, card);
    renderSeat(seat);
    renderHand();
    if (!done) { save(); schedule(step, 60); return; }
    // 一墩完成：停一下让人看清，分牌飞进赢家的吃牌区，没分的牌就地淡出
    for (let s = 0; s < 4; s++) els.seats[s].classList.remove('is-turn');
    // 教程：牌还在桌上时先讲这一轮（桌上的牌调暗，讲解里把四家的牌排出来），讲完再收牌结算，结算后再讲分数
    const talk = ov.trick.talk = match.tutorial ? tut.coach.afterTrick(done, r) : { before: [], after: [] };
    schedule(() => {
      if (!talk.before.length) { settleTrick(); return; }
      els.center.classList.add('is-review');
      coachSay(talk.before, () => { els.center.classList.remove('is-review'); settleTrick(); });
    }, pace().trickShow);
  }

  // 一轮打满后的收尾：先在桌子中间放完猪 / 羊 / 变压器等特效（四张牌还在桌上、调暗），再把四张牌一起收走、分牌放进吃牌区
  function settleTrick() {
    const t = liveTrick();
    if (!t) return;
    const { done, talk } = t;
    t.lead = false;
    showLead(-1);
    const fxMs = playTrickFx(done, planTrickFx(done));
    if (fxMs) setFxing(true);
    schedule(() => {
      setFxing(false);
      const ms = flyTrick(done.plays, done.winner);
      schedule(() => {
        save();
        if (match.tutorial) coachSay(talk.after, step);
        else step();
      }, ms + 40);
    }, fxMs ? Math.max(0, fxMs - 150) : 0);
  }

  /* 一轮结束（猪 / 羊 / 变压器等特效已经先在桌子中间放完）：
   * ① 收：四张牌先往赢的那张牌那边一拢，再一起滑进赢家的头像，头像「咽」一下——一眼看清谁赢、下一轮谁先出；
   * ② 放：赢家吃牌区给新来的分牌让出空位（后面的牌和本局分一起滑开），分牌从头像那边出来、
   *    先到空位正上方，再从上往下放进去；全部放好才翻分。返回总时长。 */
  function flyTrick(plays, winner) {
    const seatEl = els.seats[winner];
    const caps = seatEl.querySelector('.gz-caps');
    const fresh = plays.map((p) => p.card).filter(R.isScoring);
    const reduce = reduceMotion();
    const avatar = seatEl.querySelector('.gz-avatar');
    const av = avatar.getBoundingClientRect();
    const ws = els.slots[winner].getBoundingClientRect();
    const GATHER = 0.55;   // 往赢牌那边拢多少（0 不动，1 叠到赢牌上）
    const sweepMs = reduce ? 1 : Math.round(pace().fly * 1.6);
    const flyers = [];
    plays.forEach((p) => {
      const slot = els.slots[p.seat];
      if (!slot.querySelector('.gz-card')) return;
      const a = slot.getBoundingClientRect();
      const fl = buildCard(p.card);
      fl.classList.add('gz-flyer');
      if (isExposedCard(p.card)) fl.classList.add('is-exposed');
      fl.style.cssText += ';left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px;--q:' + a.width + 'px';
      els.app.appendChild(fl);
      flyers.push({ fl, a });
    });
    els.slots.forEach((slot) => { slot.innerHTML = ''; slot.classList.remove('is-ace'); });
    if (liveTrick()) ov.trick.onTable = false;
    for (const { fl, a } of flyers) {
      const dx = av.left + av.width / 2 - a.left - a.width / 2, dy = av.top + av.height / 2 - a.top - a.height / 2;
      const gx = (ws.left + ws.width / 2 - a.left - a.width / 2) * GATHER, gy = (ws.top + ws.height / 2 - a.top - a.height / 2) * GATHER;
      fl.style.transition = 'none';
      animate(fl, [
        { transform: 'none', opacity: 1 },
        { transform: 'translate(' + gx + 'px,' + gy + 'px) scale(0.94)', opacity: 1, offset: 0.27 },
        { transform: 'translate(' + gx + 'px,' + gy + 'px) scale(0.94)', opacity: 1, offset: 0.36 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.16)', opacity: 0.15, easing: 'cubic-bezier(.5, 0, .75, 0)' },
      ], { duration: sweepMs, fill: 'forwards' }, 'cubic-bezier(.3, 0, .3, 1)');
    }
    if (flyers.length) { snd('sweep', 0, sweepMs); snd('gulp', sweepMs * 0.8); }
    // 赢家的头像「咽」一下：牌钻进去的那一刻鼓一下再回原样
    if (flyers.length && !reduce) {
      avatar.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.45 }, { transform: 'scale(1)' }],
        { duration: 340, delay: sweepMs * 0.82, easing: 'cubic-bezier(.3, .8, .4, 1.2)' });
    }
    const STAGGER = match && match.tutorial ? 140 : 110;
    const ONE = Math.round(pace().fly * 2);
    const placeMs = fresh.length && !reduce ? ONE + STAGGER * (fresh.length - 1) : 0;
    schedule(() => {
      flyers.forEach(({ fl }) => fl.remove());
      if (liveTrick()) ov.trick = null;   // 显示层放掉：分牌这才进吃牌区
      renderSeat(winner, fresh, true);   // 让出空位：后面的牌和本局分一起滑开
      if (!fresh.length) return;
      const done = () => { caps.querySelectorAll('.incoming').forEach((el) => el.classList.remove('incoming')); rollCapsScore(caps); };
      if (reduce) { done(); return; }
      const ar = avatar.getBoundingClientRect();
      // 放牌：像是把牌从自己那儿拿出来、放到桌上——
      // 从头像里小小地冒出来（略歪）→ 沿一道弧线滑到空位上方 → 停一下摆正 → 往下一落、落桌轻轻一压；
      // 拿在手里时影子大，放下时影子收紧
      const LIFT = '0 10px 18px rgba(20, 18, 15, 0.28)', REST = '0 1px 2px rgba(20, 18, 15, 0.16)';
      // 层次：浮在最上层的替身只负责「从头像飞到空位上方」；在空位上方那一刻交给吃牌区里的真牌，
      // 由真牌自己落下去——它在红桃扇里的前后顺序是对的（压在左边那张上、被右边那张压着），像真的插进去
      const HAND_OFF = 0.66;
      let landed = 0;
      fresh.forEach((c, i) => {
        const target = caps.querySelector('.gz-mini[data-card="' + c + '"]');
        if (!target) return;
        const b = target.getBoundingClientRect();
        const fl = buildCard(c);
        fl.classList.add('gz-flyer', 'gz-mini');
        if (target.classList.contains('is-exposed')) fl.classList.add('is-exposed');
        fl.style.cssText += ';left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;--q:' + b.width + 'px';
        els.app.appendChild(fl);
        const fx = ar.left + ar.width / 2 - b.left - b.width / 2, fy = ar.top + ar.height / 2 - b.top - b.height / 2;
        const hover = -b.height * 1.08;   // 悬停在整排牌的正上方、不跟任何一张重叠——交接时上下层不会跳
        const T = (x, y, sc, rot) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc + ') rotate(' + rot + 'deg)';
        // 从头像里一路走到空位上方：一条连续的二次贝塞尔弧（控制点在两端中点再往上提），整段先快后慢——哪个座位出发都顺；
        // 一出头像就淡入、由小变大、由歪摆正
        const cx = fx / 2, cy = Math.min(fy, hover) - b.height * 0.5;
        const ease = (t) => 1 - Math.pow(1 - t, 2.2);
        const N = 9, arc = [];
        for (let k = 0; k <= N; k++) {
          const t = ease(k / N), u = 1 - t;
          arc.push({
            transform: T(u * u * fx + 2 * u * t * cx, u * u * fy + 2 * u * t * cy + t * t * hover, (0.3 + 0.76 * t).toFixed(3), (-10 + 8 * t).toFixed(1)),
            opacity: k === 0 ? 0 : 1, boxShadow: LIFT, offset: 0.62 * (k / N), easing: 'linear',
          });
        }
        animate(fl, [
          ...arc,
          { transform: T(0, hover, 1.06, 0), opacity: 1, offset: HAND_OFF },
          { transform: T(0, hover, 1.06, 0), opacity: 0, offset: HAND_OFF },
          { transform: T(0, hover, 1.06, 0), opacity: 0 },
        ], { duration: ONE, delay: i * STAGGER, fill: 'both' });
        // 真牌：交接之前不显示，交接那一刻出现在同一位置，往下一落、落桌轻轻一压
        target.classList.remove('incoming');
        animate(target, [
          { transform: T(0, hover, 1.06, 0), opacity: 0, boxShadow: LIFT },
          { transform: T(0, hover, 1.06, 0), opacity: 0, boxShadow: LIFT, offset: HAND_OFF },
          { transform: T(0, hover, 1.06, 0), opacity: 1, boxShadow: LIFT, offset: HAND_OFF, easing: 'cubic-bezier(.55, 0, .9, .4)' },
          { transform: T(0, 0, 0.96, 0), opacity: 1, boxShadow: REST, offset: 0.86, easing: 'cubic-bezier(.3, .7, .35, 1)' },
          { transform: T(0, 0, 1, 0), opacity: 1, boxShadow: REST },
        ], { duration: ONE, delay: i * STAGGER, fill: 'backwards' });
        snd('tuck', i * STAGGER + ONE * 0.86);
        // 每拿出一张，头像轻轻一动
        avatar.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.4 }, { transform: 'scale(1)' }],
          { duration: 240, delay: i * STAGGER, easing: 'ease-out' });
        schedule(() => {
          fl.remove();
          if (++landed === fresh.length) rollCapsScore(caps);   // 全部放好才翻分
        }, ONE + i * STAGGER);
      });
      schedule(done, placeMs + 40);   // 兜底：万一哪张没找到落点，也把分翻了
    }, sweepMs);
    return sweepMs + placeMs;
  }

  function rollCapsScore(caps) {
    const sc = caps.querySelector('.gz-cap-score');
    if (sc && sc.dataset.next !== undefined) {
      const from = +(sc.dataset.v || 0), to = +sc.dataset.next;
      if (to !== from) snd(to > from ? 'up' : 'down');
      rollNumber(sc, to); delete sc.dataset.next;
    }
  }

  /* ───── 出牌倒计时与托管 ─────
   * 轮到谁，谁的头像外圈亮起一道红环并随时间收走；最后 5 秒头像轻跳。
   * 我超时：由场上最强的那档机器人替我出这一张；连续两次超时转成托管，点手牌或头像收回。
   * 弹窗开着时计时暂停。 */

  const clock = { seat: -1, left: 0, at: 0, onTimeout: null, paused: false, t1: 0, t2: 0, tk: 0 };

  function startClock(seat, onTimeout, totalMs) {
    stopClock();
    if (match.tutorial) return;   // 教程不计时
    const total = totalMs != null ? Math.round(totalMs) : turnSec() * 1000;
    if (!(total > 0)) return;
    Object.assign(clock, { seat, left: total, onTimeout, paused: false });
    const el = els.seats[seat];
    el.style.setProperty('--turn-ms', total + 'ms');
    el.classList.remove('is-timed', 'is-hurry', 'is-paused');
    void el.offsetWidth;   // 同一座位连着两回合也要从满环重新开始
    el.classList.add('is-timed');
    if (!els.mask.hidden && !match.online) pauseClock();
    else runClock();
  }
  function runClock() {
    const my = token, seat = clock.seat;
    clock.at = performance.now();
    clock.t1 = setTimeout(() => {
      if (my !== token) return;
      els.seats[seat].classList.add('is-hurry');
      // 最后几秒轮到的是我：每秒一声木鱼
      if (seat === 0) { snd('tick'); clearInterval(clock.tk); clock.tk = setInterval(() => { if (my === token && clock.seat === 0 && !clock.paused) snd('tick'); }, 1000); }
    }, Math.max(0, clock.left - HURRY_MS));
    if (clock.onTimeout) clock.t2 = setTimeout(() => { if (my !== token) return; const f = clock.onTimeout; stopClock(); f(); }, clock.left);
  }
  function pauseClock() {
    if (clock.seat < 0 || clock.paused || (match && match.online)) return;   // 联机的钟以服务器为准，弹窗开着也照走
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    if (clock.at) clock.left = Math.max(0, clock.left - (performance.now() - clock.at));
    clock.at = 0;
    clock.paused = true;
    els.seats[clock.seat].classList.add('is-paused');
  }
  function resumeClock() {
    if (clock.seat < 0 || !clock.paused) return;
    clock.paused = false;
    els.seats[clock.seat].classList.remove('is-paused');
    runClock();
  }
  // 联机房主暂停：钟停住（pauseClock 联机不停，这里专门停）
  function holdClock() {
    if (clock.seat < 0) return;
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    clock.paused = true;
    els.seats[clock.seat].classList.add('is-paused');
  }
  function stopClock() {
    clearTimeout(clock.t1); clearTimeout(clock.t2); clearInterval(clock.tk);
    if (clock.seat >= 0) els.seats[clock.seat].classList.remove('is-timed', 'is-hurry', 'is-paused');
    Object.assign(clock, { seat: -1, onTimeout: null, paused: false, at: 0 });
  }

  // 单机三家机器人同一档；联机时真人座位返回 null
  function seatTier(seat) {
    if (seat === 0) return null;
    const b = soloBots();
    return (b && b[seat - 1] && b[seat - 1].tier) || settings.tier;
  }
  function turnSec() { return match && match.turnSec != null ? match.turnSec | 0 : settings.turnSec | 0; }
  function botTiers() { return [1, 2, 3].map(seatTier).filter(Boolean); }
  // 替人出牌的机器人：取场上机器人里最强的一档；场上没有机器人就按「普通」
  function takeoverTier(tiers) {
    let best = -1;
    for (const t of tiers) best = Math.max(best, TIER_ORDER.indexOf(t));
    return best < 0 ? 'normal' : TIER_ORDER[best];
  }

  function onMyTimeout() {
    const r = match.round;
    if (!r || turnSeat() !== 0 || busy) return;
    timeouts++;
    if (timeouts >= 2) setAutopilot(true);
    busy = true;
    selected = -1;
    renderHand();
    chooseAi(r, 0, takeoverTier(botTiers())).then(guard((card) => schedule(() => commit(0, card), 0)));
  }

  function setAutopilot(on) {
    if (autopilot === on) return;
    autopilot = on;
    if (on) statsAuto = true;
    if (!on) timeouts = 0;
    els.seats[0].classList.toggle('is-auto', on);
    els.seats[0].setAttribute('aria-label', NAMES[0] + (on ? '（托管中，点头像或手牌收回）' : ''));
    const r = match && match.round;
    // 收回托管时正轮到我、机器人还没动手：直接把这一手交还给我
    if (!on && r && turnSeat() === 0 && !busy) { stopClock(); step(); }
  }

  /* ───── 战绩（gongzhu-stats.js）：一局结束记一笔，一盘结束落成一条；教程 / 演示 / 大厅 / 观战不记 ───── */
  let statsAuto = false;   // 这一局里我托管过（联机的托管在服务器上：局终时看 onlineAuto()，局中自己点开的也记一笔；服务器因超时开、局终前又关掉的漏记）
  function statsNote() {
    const S = window.GongzhuStats;
    if (!S || !S.note || !match || match.tutorial || match.demo || match.lobby || watching()) return;
    try {
      S.note({
        mode: match.online ? 'net' : 'solo', id: match.online ? netStatsId() : 's:' + match.seed,
        rules: match.rules, totals: match.totals.slice(), last: match.last, over: !!match.over,
        losers: match.online ? match.losers || [] : null, tiers: match.online ? null : botTiers(), auto: statsAuto || autopilot || (!!match.online && onlineAuto()),
      });
    } catch (_) { /* 战绩记不上不影响打牌 */ }
    statsAuto = autopilot;
  }
  // 联机一盘的 id：房号 + 盘号还不够（「回到房间」后服务器盘号从 1 重数），再拼上第 1 局的四家得分当指纹——一盘里固定不变、刷新也拿得到
  function netStatsId() {
    const g = online && online.st && online.st.game, h0 = g && g.history && g.history[0];
    return 'n:' + (online && online.code) + ':' + match.matchNo + (h0 && h0.scores ? ':' + h0.scores.join('.') : '');
  }
  if (window.GongzhuStats) window.GongzhuStats.art = () => ART;   // 战绩页借牌桌上的猪 / 羊 / 红桃 / 皇冠

  // 手动托管时正轮到我（出牌或决定明牌）、钟在走：马上交给机器人，不用等超时
  function takeOverNow() {
    const r = match.round;
    if (!r || busy) return;
    const tier = takeoverTier(botTiers());
    if (exposingMe()) {
      stopClock(); busy = true; exposePick = []; renderHand();
      chooseExpose(r, 0, tier).then(guard((cards) => schedule(() => applyExpose(0, cards), 0)));
    } else if (turnSeat() === 0 && !R.isRoundOver(r) && !match.exposing.length) {
      stopClock(); busy = true; selected = -1; renderHand();
      chooseAi(r, 0, tier).then(guard((card) => schedule(() => commit(0, card), 0)));
    }
  }

  function onCardTap(c, el) {
    if (match.online && onlineAuto()) { onlineAct('auto', { on: false }); return; }
    if (autopilot) { setAutopilot(false); return; }
    if (match.tutorial) { suggestCard = -1; armIdle(); }
    if (exposingMe()) {
      if (busy) return;
      if (!R.EXPOSABLE.includes(c)) { shake(el); return; }
      exposePick = exposePick.includes(c) ? exposePick.filter((x) => x !== c) : exposePick.concat([c]);
      snd('pick');
      renderHand();
      renderSeats();   // ♥A 点上 / 取消：桌上所有红桃一起变色
      return;
    }
    const r = match.round;
    if (preSelect(c, r)) return;   // 出牌预览（?gzplay=one-*）：别人出牌时先抬起一张
    if (busy || !r || R.isRoundOver(r) || r.turn !== 0) return;
    if (!myLegal(r).includes(c)) { shake(el); return; }
    if (selected === c) { playSelected(); return; }
    selected = c;
    snd('pick');
    renderHand();
  }

  // 不能出：抖一下，亮着的那些就是能出的
  function shake(el) {
    snd('nope');
    el.classList.remove('nope');
    void el.offsetWidth;
    el.classList.add('nope');
    if (match.tutorial && !els.coach.hidden) {   // 教程里点错：提示框也跟着闪一下，再看一遍
      els.coach.classList.remove('pulse');
      void els.coach.offsetWidth;
      els.coach.classList.add('pulse');
    }
  }

  function playSelected() {
    if (match.online) { onlinePlaySelected(); return; }
    if (exposingMe()) {
      if (busy || !exposePick.length) return;   // 「明牌」要先选牌；不明走「不明牌」键
      busy = true;
      timeouts = 0;
      applyExpose(0, exposePick.slice());
      return;
    }
    const r = match.round;
    if (busy || !r || r.turn !== 0 || selected < 0) return;
    if (!myLegal(r).includes(selected)) return;
    busy = true;
    timeouts = 0;
    commit(0, selected);
  }

  /* ───── 出牌预览（?gzplay=…，待用户挑；不带参数这一节什么都不做）─────
   * fly：牌从哪儿来——我的从手里原位、别家的从头像，落到出牌位（端正）。真牌先在出牌位占好位置不显示，替身飞到、交给真牌。
   *      时长都比一轮里等的时间短（AI 至少 400ms、一轮打满停 450ms），不拖慢一轮。手牌另外改成 FLIP：重画前量每张牌在哪，
   *      重画后从原处滑过去——选中抬起有过渡、出掉一张其余的滑着合拢。替身是 .gz-flyer，clearScene 一并拿掉。
   * one：只剩一张能出时 甲 现状（替我选好、等我点）/ 乙 另外出牌键呼吸亮起 / 丙 隔一拍自动打出；三版都带：
   *      最后一轮只剩一张自动出、点牌桌空白放下选中的牌、别人出牌时先抬起一张（轮到我时不能出就放下，能出也不替我出）。
   * exp：明牌阶段两颗键怎么摆（主键位置、大小始终和「出牌」一样）：甲「不明牌」在主键正上方 / 乙 两键等宽并排占原来那一格 /
   *      丙「不明牌」做成主键右上角的小签。 */
  if (GZPLAY.exp) els.app.classList.add('gzx-exp-' + GZPLAY.exp);
  if (GZPLAY.fly) els.app.classList.add('gzx-fly-' + GZPLAY.fly);

  function playFrom(seat, card) {
    if (!GZPLAY.fly || reduceMotion() || !match || match.lobby) return null;
    const h = seat === 0 && !watching() ? els.hand.querySelector('.gz-card[data-card="' + card + '"]') : null;
    const av = els.seats[seat] && els.seats[seat].querySelector('.gz-avatar');
    const el = h || av;
    if (!el) return null;
    landing.add(card);
    return { r: el.getBoundingClientRect(), hand: !!h };
  }
  const FLY_MS = { a: 200, b: 250, c: 300, d: 320 };
  const FLY_TILT = [-6, 11, -9, -11];   // 丙丁：出手时略歪（按座位方向），落定时转正
  function flyIn(seat, card, src) {
    const slot = els.slots[seat];
    const target = slot.querySelector('.gz-card[data-card="' + card + '"]');
    if (!target) { landing.delete(card); return; }
    const b = target.getBoundingClientRect(), a = src.r, v = GZPLAY.fly;
    const back = v === 'd' && !src.hand;
    const dur = Math.max(120, Math.min(FLY_MS[v], pace().trickShow - 40));
    const fl = buildCard(card);
    fl.classList.add('gz-flyer', 'gz-pfly');
    if (target.classList.contains('is-exposed')) fl.classList.add('is-exposed');
    fl.style.cssText += ';left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;--q:' + b.width + 'px';
    let bk = null;
    if (back) { bk = document.createElement('span'); bk.className = 'gz-pfly-back'; fl.appendChild(bk); }
    els.app.appendChild(fl);
    const dx = a.left + a.width / 2 - b.left - b.width / 2, dy = a.top + a.height / 2 - b.top - b.height / 2;
    const s0 = src.hand ? a.width / b.width : Math.min(0.62, a.width / b.width);
    const c = els.center.getBoundingClientRect();
    const toC = { x: c.left + c.width / 2 - b.left - b.width / 2, y: c.top + c.height / 2 - b.top - b.height / 2 };
    const f = flyFrames(v, seat, dx, dy, s0, !src.hand, back, toC);
    fl.animate(f.frames, { duration: dur, fill: 'both', easing: 'linear' });
    if (bk) bk.animate([{ opacity: 1 }, { opacity: 1, offset: f.flipAt }, { opacity: 0, offset: f.flipAt }, { opacity: 0 }], { duration: dur, fill: 'both' });
    after(() => {
      fl.remove();
      landing.delete(card);
      const t = els.slots[seat].querySelector('.gz-card[data-card="' + card + '"]');
      if (t) t.classList.remove('gz-landing');
    }, dur);
  }
  // 飞行关键帧：坐标相对终点（出牌位）；甲 直线减速 / 乙 二次贝塞尔弧线、途中略鼓起 / 丙 弧线 + 歪着出手、落定转正、落桌一压 / 丁 丙 + 背面朝上飞、半路翻开
  function flyFrames(v, seat, dx, dy, s0, fadeIn, back, toC) {
    const N = 10, frames = [];
    const arcV = v !== 'a', settle = v === 'c' || v === 'd';
    const lift = arcV ? Math.min(70, Math.hypot(dx, dy) * 0.28) : 0;
    // 从下面 / 旁边出手：往上抛一道弧；从上面下来（竖屏的三家）：不先往上蹿，往桌子中间那边弯
    let cx = dx / 2, cy = Math.min(dy, 0) - lift;
    if (dy < -12 && toC) {
      const L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      const sg = nx * (toC.x - dx / 2) + ny * (toC.y - dy / 2) >= 0 ? 1 : -1;
      cx = dx / 2 + nx * lift * 0.8 * sg; cy = dy / 2 + ny * lift * 0.8 * sg;
    }
    const rot0 = settle ? FLY_TILT[seat] : 0;
    const travel = settle ? 0.78 : 1;
    const ease = (t) => 1 - Math.pow(1 - t, arcV ? 2.4 : 3);
    const SH = (k) => '0 ' + (2 + 12 * k).toFixed(1) + 'px ' + (6 + 16 * k).toFixed(1) + 'px rgba(20, 18, 15, ' + (0.16 + 0.12 * k).toFixed(3) + ')';
    const T = (x, y, r, sx, sy) => 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + r.toFixed(2) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    for (let k = 0; k <= N; k++) {
      const p = k / N, t = ease(p), u = 1 - t, arc = Math.sin(Math.PI * p);
      const x = arcV ? u * u * dx + 2 * u * t * cx : dx * u;
      const y = arcV ? u * u * dy + 2 * u * t * cy : dy * u;
      const s = s0 + ((settle ? 1.05 : 1) - s0) * t + (arcV ? 0.07 * arc : 0);
      // 从头像出来：一出手就歪着、慢慢回正一些；从手里出来：起手端正，半空里歪过去——落桌那一下才转正
      const r = !settle ? 0 : fadeIn ? rot0 * (1 - 0.75 * t) : rot0 * Math.sin(Math.PI * 0.8 * t);
      const sx = back ? s * Math.abs(Math.cos(Math.PI * Math.min(1, Math.max(0, (p - 0.25) / 0.5)))) : s;
      frames.push({ transform: T(x, y, r, sx, s), boxShadow: SH(arcV ? (settle ? Math.max(arc, 0.7 * t) : arc) : 0), opacity: k === 0 && fadeIn ? 0 : 1, offset: travel * p });
    }
    if (settle) {
      frames.push({ transform: T(0, 0, -0.08 * rot0, 0.96, 0.96), boxShadow: SH(0), opacity: 1, offset: 0.9, easing: 'cubic-bezier(.3, .7, .4, 1)' });
      frames.push({ transform: T(0, 0, 0, 1, 1), boxShadow: SH(0), opacity: 1, offset: 1 });
      frames[frames.length - 3].easing = 'cubic-bezier(.55, 0, .9, .4)';
    }
    return { frames, flipAt: travel * 0.5 };
  }

  // 手牌 FLIP：重画前每张牌在屏幕上的位置（含抬起）；重画后从那儿滑到新位置。独立的 translate 属性，不和抬起用的 transform 打架
  const CAN_TRANSLATE = !!(window.CSS && CSS.supports && CSS.supports('translate', '1px'));
  function handRects() {
    const m = new Map();
    if (!CAN_TRANSLATE || reduceMotion()) return m;
    els.hand.querySelectorAll('.gz-card[data-card]').forEach((el) => m.set(el.dataset.card, el.getBoundingClientRect()));
    return m;
  }
  function flipHand(was) {
    if (!was.size) return;
    els.hand.querySelectorAll('.gz-card[data-card]').forEach((el) => {
      const a = was.get(el.dataset.card);
      if (!a) return;
      const b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate([{ translate: dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px' }, { translate: '0px 0px' }],
        { duration: Math.abs(dx) >= 0.5 ? 240 : 150, easing: 'cubic-bezier(.25, .8, .35, 1)' });
    });
  }

  // 这一手是谁的哪一手：同一手里重画多少次都是同一个键（联机加上第几盘）
  function turnKey() {
    const r = match && match.round;
    if (!r) return '';
    const g = match.online && online && online.st && online.st.game;
    return (g ? g.matchNo : 's') + ':' + match.roundNo + ':' + r.hands[0].length;
  }
  function oneHook(r, myTurn, legal, n) {
    const ready = myTurn && legal.length === 1 && selected === legal[0] && !match.tutorial;
    els.play.classList.toggle('gz-ready', GZPLAY.one === 'b' && ready);
    if (!ready || watching() || !(GZPLAY.one === 'c' || n === 1)) return;
    const key = turnKey();
    if (one.key === key) return;
    one.key = key;
    const card = legal[0];
    schedule(() => {
      const rr = match.round;
      if (one.key !== key || busy || !rr || rr.turn !== 0 || selected !== card || turnKey() !== key) return;
      playSelected();
    }, GZPLAY.one === 'c' ? 560 : 380);
  }
  // 别人出牌（或这一轮还在收）时点手牌：先抬起 / 放下，不出
  function preSelect(c, r) {
    if (!GZPLAY.one || !r || match.tutorial || ov.deal || R.isRoundOver(r) || match.exposing.length || watching()) return false;
    if (r.turn === 0 && !busy) return false;
    if (autopilot || !r.hands[0].includes(c)) return false;
    selected = selected === c ? -1 : c;
    snd('pick');
    renderHand();
    return true;
  }
  // 点牌桌空白处：放下选中的牌（这一手里就不再替我选上）
  els.table.addEventListener('click', (e) => {
    if (!GZPLAY.one || !match || !match.round || match.tutorial || selected < 0 || ov.deal || exposingMe()) return;
    if (e.target.closest('.gz-card, button, a, input, select, .gz-avatar, .gz-coach, .gz-lobby, .gz-tip, .gz-demo')) return;
    selected = -1;
    one.noSel = turnKey();
    renderHand();
  });
  function expBand(exposing, hasLegal) {
    els.play.parentElement.classList.toggle('is-exp2', exposing && hasLegal && !match.tutorial);
  }
  /* ?fxdemo=play（配 &gzplay=…）：不用真打就能看——一局接一局自己打（不出结算页），「我」由脚本替手点
   * （点选 → 停一下 → 再点打出；只剩一张能出时让 one-* 自己处理；别人出牌时偶尔先抬起一张；有明牌就点一张再按明牌 / 不明牌）。
   * 走的是正式出牌的同一套代码，不动存档 */
  function startPlayDemo() {
    const rules = R.normalizeRules({});
    match = { demo: 'play', rules, totals: [0, 0, 0, 0], roundNo: 0, pigTaker: -1, seed: 1, round: null, exposing: [], last: null, over: false };
    let seed = 11, lead = 0, nExp = 0, preKey = '';
    const fresh = () => {
      clearScene(); stopClock();
      let hands;
      for (;;) {
        hands = R.deal(R.makeRng(seed++));   // 整副牌（只发几张 AI 会算错别家的牌）
        if (R.EXPOSABLE.some((c) => hands[0].includes(c))) break;   // 每局我都有能明的牌：明牌阶段的按钮也看得到
      }
      match.roundNo++;
      match.round = R.createRound(hands, lead, -1, rules);
      lead = (lead + 1) % 4;
      match.exposing = [0, 1, 2, 3].filter((s) => R.EXPOSABLE.some((c) => hands[s].includes(c)));
      selected = -1; exposePick = []; ov.held = []; busy = true;
      renderAll();
      schedule(step, 600);
    };
    const bar = document.createElement('div');
    bar.className = 'gz-demo gz-demo-play';
    const opt = (k, labels) => '<select data-k="' + k + '" aria-label="' + k + '">' + Object.keys(labels).map((x) =>
      '<option value="' + x + '"' + (GZPLAY[k] === x ? ' selected' : '') + '>' + labels[x] + '</option>').join('') + '</select>';
    const q = () => ['fly', 'one', 'exp'].map((k) => (GZPLAY[k] ? k + '-' + GZPLAY[k] : '')).filter(Boolean).join(',');
    bar.innerHTML = '<b>出牌预览</b>' +
      opt('fly', { '': '飞·现状', a: '飞·甲 直线', b: '飞·乙 弧线', c: '飞·丙 转正', d: '飞·丁 翻面' }) +
      opt('one', { '': '一张·现状', a: '一张·甲', b: '一张·乙 亮键', c: '一张·丙 自动' }) +
      opt('exp', { '': '明牌·现状', a: '明牌·甲', b: '明牌·乙', c: '明牌·丙' }) +
      '<a href="' + location.pathname + (q() ? '?gzplay=' + q() : '') + '">去牌桌</a>';
    bar.addEventListener('click', (e) => e.stopPropagation());
    bar.addEventListener('change', () => {
      const v = [...bar.querySelectorAll('[data-k]')].filter((x) => x.value).map((x) => x.dataset.k + '-' + x.value).join(',');
      location.search = '?fxdemo=play' + (v ? '&gzplay=' + v : '');
    });
    document.body.appendChild(bar);
    let acting = false, restartAt = 0;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const handEl = (c) => els.hand.querySelector('.gz-card[data-card="' + c + '"]');
    const tap = (c) => { const el = handEl(c); if (el) onCardTap(c, el); };
    const act = async (fn) => { acting = true; const my = token; try { await fn(() => my === token); } finally { acting = false; } };
    setInterval(() => {
      if (!match || match.demo !== 'play' || acting || !els.mask.hidden) return;
      const r = match.round;
      if (!r) return;
      if (R.isRoundOver(r)) {
        if (els.app.querySelector('.gz-flyer') || liveTrick()) { restartAt = 0; return; }
        if (!restartAt) restartAt = performance.now() + 500;
        else if (performance.now() > restartAt) { restartAt = 0; fresh(); }
        return;
      }
      if (exposingMe() && !busy) {
        act(async (ok) => {
          await wait(500); if (!ok()) return;
          tap(R.EXPOSABLE.find((c) => r.hands[0].includes(c)));
          await wait(1400); if (!ok() || !exposingMe() || busy) return;
          (nExp++ % 2 ? els.noExpose : els.play).click();
        });
        return;
      }
      if (match.exposing.length) return;
      // 别人出牌时：每轮在我前一家出牌时先抬起一张（演示「先选好」）
      if (GZPLAY.one && r.turn === 3 && r.trick.length && selected < 0 && preKey !== turnKey()) {
        preKey = turnKey();
        const c = R.legalFor(r, 0).find((x) => r.hands[0].includes(x));
        if (c != null) tap(c);
        return;
      }
      if (r.turn !== 0 || busy) return;
      act(async (ok) => {
        const legal = myLegal(r);
        if (GZPLAY.one && legal.length === 1 && (GZPLAY.one === 'c' || r.hands[0].length === 1)) { await wait(1200); return; }   // 让 one-* 自己出
        await wait(380); if (!ok() || busy || r.turn !== 0) return;
        if (!(selected >= 0 && legal.includes(selected))) tap(chooseLocal(r, 0, 'normal'));
        await wait(520); if (!ok() || busy || r.turn !== 0) return;
        if (selected >= 0) tap(selected);
      });
    }, 120);
    fresh();
  }

  function finishRound() {
    const r = match.round;
    const scores = R.roundScores(r);
    for (let s = 0; s < 4; s++) match.totals[s] += scores[s];
    match.pigTaker = r.pigTaker;
    match.last = { roundNo: match.roundNo, captured: r.captured.map((c) => c.slice()), scores, ctx: R.scoreCtx(r) };
    match.history = (match.history || []).concat([match.last]);   // 每局得分：这一盘每一局的分和各家吃了什么
    match.round = null;
    match.over = R.isMatchOver(match.totals, match.rules, match.roundNo);
    save();
    statsNote();
    settleOnTable(() => { if (match.over) matchEndSound(); else roundEndSound(scores[0]); showSettlement(); });
  }

  /* 一局打完不急着弹结算：牌桌保持最后的样子（吃牌区都还在），四家头像下的累计分一起数到新值，
   * 数完再停一下，才出结算页。调用时最后一轮的本局分应该已经翻完（step 到这里前已等了 pace().roundEnd）。 */
  function settleOnTable(then) {
    for (let s = 0; s < 4; s++) {
      els.seats[s].classList.remove('is-turn');
      const tot = els.seats[s].querySelector('.gz-total');
      rollNumber(tot, match.totals[s]);
      tot.classList.toggle('neg', match.totals[s] < 0);
    }
    renderHand();   // 手牌已空：出牌键收起
    schedule(then, reduceMotion() ? 300 : SETTLE_HOLD);
  }

  function roundEndSound(mine) { snd(mine > 0 ? 'win' : mine < 0 ? 'lose' : 'even'); }
  /* 一盘结束按这一盘的名次放（不看最后一局）：累计分并列最高 = 赢，并列最低 = 输（规则里并列最低都当猪；
   * 「不设终点」被叫停不评猪，垫底也放输），中间两名 = 平；四家同分 = 平。观战没有「我」，放平 */
  function matchOutcome() {
    if (match.online && watching()) return 'even';
    const t = match.totals, hi = Math.max(...t), lo = Math.min(...t);
    if (hi === lo) return 'even';
    return t[0] === hi ? 'win' : t[0] === lo ? 'lose' : 'even';
  }
  function matchEndSound() { const o = matchOutcome(); if (GZPV === 'final-c') snd('finale', 0, o); else snd(o); }

  /* ───── AI 调度：优先后台线程，失败就在主线程算 ───── */

  let worker = null, workerOk = true, reqId = 0;
  const pending = new Map();
  function getWorker() {
    if (!workerOk || typeof Worker === 'undefined') return null;
    if (worker) return worker;
    try {
      worker = new Worker('/assets/js/games/gongzhu-ai-worker.js?v=' + (window.GZ_BUILD || VERSION));
      worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
      worker.onerror = () => { workerOk = false; worker = null; for (const [, p] of pending) p({}); pending.clear(); };
    } catch (_) { workerOk = false; worker = null; }
    return worker;
  }
  function chooseLocal(r, seat, tier) {
    return AI.policyForTier(tier)(r, seat, R.makeRng((Math.random() * 2 ** 31) | 0));
  }
  function chooseAi(r, seat, tier) {
    const w = getWorker();
    if (!w) return Promise.resolve(chooseLocal(r, seat, tier));
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, ({ card }) => resolve(card >= 0 && R.legalFor(r, seat).includes(card) ? card : chooseLocal(r, seat, tier)));
      w.postMessage({ id, round: r, seat, tier, seed: (Math.random() * 2 ** 31) | 0 });
    });
  }
  function exposeLocal(r, seat, tier) {
    return AI.exposerForTier(tier)(r, seat, R.makeRng((Math.random() * 2 ** 31) | 0));
  }
  function chooseExpose(r, seat, tier) {
    const ok = (cards) => Array.isArray(cards) && cards.every((c) => R.EXPOSABLE.includes(c) && r.hands[seat].includes(c));
    const w = getWorker();
    if (!w) return Promise.resolve(exposeLocal(r, seat, tier));
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, ({ cards }) => resolve(ok(cards) ? cards : exposeLocal(r, seat, tier)));
      w.postMessage({ id, kind: 'expose', round: r, seat, tier, seed: (Math.random() * 2 ** 31) | 0 });
    });
  }

  /* ───── 弹窗 ───── */

  // 正文里的 ♠♥♦♣ 后面补一个「按文字显示」的变体选择符，免得安卓把它们画成彩色 emoji
  function textSuits(html) { return String(html).replace(/([♠♥♦♣])(?!\uFE0E)/g, '$1\uFE0E'); }
  /* 弹窗统一三段：标题钉在顶上、最后一排按钮钉在底下，只有中间内容滚动；打开时从内容的最上面看起。
   * 点弹窗外面 / Esc = 点它的「好 / 取消 / 知道了」（[data-close]）；没有这个键的（结算）必须点按钮选。
   * 叠在弹窗上面的确认框 / 小窗另走一层（askConfirm / subBox） */
  function openDialog(html, onMount) {
    const d = els.dialog;
    d.className = 'gz-dialog';   // 上一个弹窗加的样式（暂停页等）不带过来
    d.innerHTML = textSuits(html);
    const head = d.firstElementChild && d.firstElementChild.tagName === 'H2' ? d.firstElementChild : null;
    const foot = [...d.children].reverse().find((x) => x.classList.contains('gz-actions')) || null;
    const body = document.createElement('div');
    body.className = 'gz-dialog-body';
    [...d.children].forEach((x) => { if (x !== head && x !== foot) body.appendChild(x); });
    d.insertBefore(body, foot);
    if (foot) foot.classList.add('gz-dialog-foot');
    els.mask.hidden = false;
    pauseClock();
    if (guideCur) guideHide(false);   // 弹窗 = 要我表态：实战引导先收起、不算看过
    if (onMount) onMount(d);
    body.scrollTop = 0;
    d.classList.toggle('is-scroll', body.scrollHeight > body.clientHeight + 1);
    const first = d.querySelector('[data-autofocus]') || d.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  function closeDialog() {
    // 输入框还拿着焦点 / 选区就被整个拿掉：微信会把「搜一搜 / 复制」留在屏幕上，先收掉
    const a = document.activeElement;
    if (a && els.dialog.contains(a) && a.blur) a.blur();
    clearSelection();
    closeSub(); els.mask.hidden = true; els.dialog.innerHTML = ''; resumeClock();
  }
  function dismissDialog() {
    if (els.mask.hidden) return;
    const close = els.dialog.querySelector('[data-close]');
    if (close) close.click();
  }

  /* 结算：每家一行 = 名字 · 吃牌（同一套小牌陈列） · 本局 · 累计；不写算式文字 */
  function showSettlement() {
    const last = match.last;
    if (!match.round) syncHeartsX2();
    if (match.over && !match.tutorial && GZPV && GZPV !== 'final-c') { showFinal(); return; }
    const losers = match.online || match.losers ? match.losers || [] : match.over ? R.matchLosers(match.totals) : [];   // 演示「叫停」时 losers = []
    const cls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
    // 自己永远在最上面；其余三家按分从高到低（整盘结束按累计，平时按本局），同分按出牌顺序（下家 → 对家 → 上家）
    const key = (s) => (match.over ? match.totals[s] : last.scores[s]);
    const order = [0].concat([1, 2, 3].sort((a, b) => key(b) - key(a) || a - b));
    const mine = key(0);
    const meRow = (s) => s === 0 && !watching();   // 观战时 0 号座是被看的那家，不是「我」
    const rows = order.map((s) =>
      '<div class="gz-res-row' + (meRow(s) ? ' me is-' + (mine > 0 ? 'up' : mine < 0 ? 'down' : 'even') : '') + (losers.includes(s) ? ' loser' : '') + '" data-seat="' + s + '">' +
      '<span class="gz-res-name">' + esc(NAMES[s]) + (losers.includes(s) ? '<span class="gz-pig-badge">猪</span>' : '') + '</span>' +
      '<span class="gz-res-caps gz-caps"></span>' +
      '<span class="gz-res-n gz-num ' + cls(last.scores[s]) + '">' + signed(last.scores[s]) + '</span>' +
      '<span class="gz-res-n gz-res-tot gz-num ' + cls(match.totals[s]) + '">' + signed(match.totals[s]) + '</span></div>').join('');
    const title = match.tutorial ? (match.adv ? '进阶教程完成' : '恭喜，学会了基本玩法') : match.over ? finalTitle(losers) : '第 ' + last.roundNo + ' 局';
    openDialog(
      '<h2>' + title + '</h2>' +
      '<div class="gz-res"><div class="gz-res-row gz-res-head"><span></span><span></span><span class="gz-res-n">本局</span><span class="gz-res-n">累计</span></div>' + rows + '</div>' +
      (match.tutorial && match.adv ? '<p class="gz-tut-tip">' + inlineCards(T.advanced.TIP) + '</p>' : '') +
      '<div class="gz-actions">' + settleActions() + '</div>',
      (d) => {
        // 默认一行：名字 · 吃牌 · 本局 · 累计。谁的牌在这一行里挤得看不清，谁就换成「名字和分数一行、吃牌放下一行」，
        // 下一行还放不下就把红桃扇再挪到第三行；放得下的人照旧一行，不硬撑开
        d.querySelectorAll('.gz-res-row[data-seat]').forEach((row) => {
          const box = row.querySelector('.gz-res-caps');
          row.dataset.dbl = dblTone(last.captured[+row.dataset.seat], last.ctx);
          const draw = () => {
            renderCaps(box, last.captured[+row.dataset.seat], null, last.ctx);
            const sc = box.querySelector('.gz-cap-score');
            if (sc) sc.remove();
          };
          draw();
          if (fanSqueezed(box)) { row.classList.add('is-stack'); draw(); }
        });
        if (match.over && GZPV === 'final-c' && !match.tutorial) finalMarks(d, losers);
        bindSettle(d);
        if (GZTUT_PV && (!match.tutorial || (tut && tut.short)) && !match.online && !match.demo && !AUTO && !guideSeen('settle')) {
          after(() => { if (!els.mask.hidden && d.querySelector('.gz-res')) guideShow({ key: 'settle', text: '每一行是一家：吃到的分牌、这一局的分、累计的分。', at: 'settle' }); }, 350);
        }
      }
    );
  }
  function finalTitle(losers) {
    return losers.length ? losers.map((s) => (s === 0 && !watching() ? '你' : esc(NAMES[s]))).join('、') + (losers.length > 1 ? '都' : '') + '当了猪' : '这一盘结束';
  }
  function settleActions() {
    return match.online ? onlineSettleActions()
      : match.tutorial && match.adv ? '<button type="button" class="gz-btn gz-btn-primary" data-act="tut-done" data-autofocus>开始对局</button>'
      : match.tutorial ? '<button type="button" class="gz-btn" data-act="tut-adv">进阶教程：明牌</button>' +
        '<button type="button" class="gz-btn gz-btn-primary" data-act="tut-done" data-autofocus>开始第一盘</button>'
      : match.over ? '<button type="button" class="gz-btn" data-act="home">回到主页面</button><button type="button" class="gz-btn gz-btn-primary" data-act="again" data-autofocus>再来一盘</button>'
      : '<button type="button" class="gz-btn gz-btn-primary" data-act="next" data-autofocus>下一局</button>';
  }
  function bindSettle(d) {
    if (match.online) { bindOnlineSettle(d); return; }
    d.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
      if (match.demo && finDemoReplay) { finDemoReplay(); return; }   // 盘终演示：按钮只是重播
      closeDialog();
      if (e.currentTarget.dataset.act === 'tut-adv') { finishBasicTutorial(); startTutorial(false, 'adv'); return; }
      if (e.currentTarget.dataset.act === 'tut-done') { endTutorial(); return; }
      if (e.currentTarget.dataset.act === 'home') { leaveFinishedSolo(); return; }
      if (e.currentTarget.dataset.act === 'again') { token++; setAutopilot(false); newMatch(); }
      startRound();
    }));
  }

  /* ───── 盘终收尾（预览中，?gzpv= 挑版本；见 GZPV） ─────
   * 每局结束仍是上面那张结算表；一盘打完改走这里：名次一眼看清、当猪的人头上落一只猪、最后才露出按钮。
   * 入场动画都在弹窗里（Web Animations + 少量定时音效），不超过 3 秒；放的时候点哪里都直接跳到最后的样子。
   * 名次按累计分「同分同名次」（1、1、3、4）；规则里并列最低都当猪；「不设终点」被房主叫停不评猪（losers 为空）。 */
  let finIntro = null;   // 入场动画放着时 = 跳过函数
  let finDemoReplay = null;
  function finalData() {
    const t = match.totals;
    const losers = match.online || match.losers ? match.losers || [] : R.matchLosers(t);
    const me = watching() ? -1 : 0;
    const order = [0, 1, 2, 3].sort((a, b) => t[b] - t[a] || a - b);
    const rank = (s) => 1 + t.filter((x) => x > t[s]).length;
    // 这一盘各家吃过几次猪 / 羊（联机里没看着打完的局没有明细：缺一局就不显示，免得少算）
    const hist = roundHistory();
    const full = hist.length > 0 && hist.every((h) => h.captured);
    const tally = [0, 1, 2, 3].map((s) => (full ? {
      pig: hist.filter((h) => h.captured[s].includes(R.PIG)).length,
      sheep: hist.filter((h) => h.captured[s].includes(R.SHEEP)).length,
    } : null));
    return { t, losers, me, order, rank, tally };
  }
  const MEDAL_C = [['#f6e3a8', '#c9a96e', '#8a6a2c'], ['#f4f4f2', '#b4b7bc', '#6f747b'], ['#f2c9a2', '#c98a55', '#7c4a22']];
  // 奖章：金 / 银 / 铜，不刻数字（颜色已经说明了）
  function medalSvg(i) {
    const [a, b, c] = MEDAL_C[i];
    return '<svg class="gz-medal" data-k="' + i + '" viewBox="0 0 28 34" aria-hidden="true"><path d="M8 1h6l-3 11H5z" fill="#b4392c"/><path d="M20 1h-6l3 11h6z" fill="#8f2c22"/>' +
      '<circle cx="14" cy="21" r="11" fill="' + b + '" stroke="' + c + '" stroke-width="1.4"/><circle cx="14" cy="21" r="7.4" fill="none" stroke="' + a + '" stroke-width="1.6"/>' +
      '<path d="M9.5 16.5a6.5 6.5 0 0 1 6-2.8" stroke="' + a + '" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/></svg>';
  }
  function pigOn(cls) { return '<span class="gz-fin-pig ' + (cls || '') + '" aria-hidden="true">' + ART.pig + '<i class="gz-fin-dust"></i><i class="gz-fin-dust"></i></span>'; }
  function tallyHtml(x) {
    if (!x) return '';
    const one = (k, n) => (n ? '<span class="gz-fin-tl is-' + k + '"><i>' + ART[k] + '</i>' + (n > 1 ? '<b class="gz-num">×' + n + '</b>' : '') + '</span>' : '');
    return one('pig', x.pig) + one('sheep', x.sheep);
  }
  // 乙一～乙三的猪 / 羊次数：用牌桌上同一套小牌面（Q♠ 猪、J♦ 羊），两次以上旁边写 ×n
  function cardTally(x) {
    if (!x) return '';
    const one = (c, k, n) => {
      if (!n) return '';
      const el = buildCard(c);
      el.classList.add('gz-mini');
      return '<span class="gz-fin-ct is-' + k + '">' + el.outerHTML + (n > 1 ? '<b class="gz-num">×' + n + '</b>' : '') + '</span>';
    };
    return one(R.PIG, 'pig', x.pig) + one(R.SHEEP, 'sheep', x.sheep);
  }
  // 乙三：猪盖成一枚朱印（方印里是同一只猪）
  function sealOn() { return '<span class="gz-fin-pig gz-fin-seal" aria-hidden="true"><span class="gz-seal-in">' + ART.pig + '</span><i class="gz-fin-dust"></i><i class="gz-fin-dust"></i></span>'; }
  // 猪从上面掉下来、落在头像上（压扁一下再弹回），落地「哼」一声、扬两团灰
  function dropPig(pig, at, stamp) {
    if (stamp) {   // 乙：像盖章——猪从大往下一按，落定略歪
      pig.animate([
        { transform: 'scale(2.6) rotate(-24deg)', opacity: 0, easing: 'ease-out' },
        { transform: 'scale(2.2) rotate(-20deg)', opacity: 1, offset: 0.25, easing: 'cubic-bezier(.55,0,.9,.5)' },
        { transform: 'scale(.86, .8) rotate(-6deg)', opacity: 1, offset: 0.72, easing: 'cubic-bezier(.3,.9,.4,1)' },
        { transform: 'rotate(-8deg)', opacity: 1 },
      ], { duration: 560, delay: at, fill: 'both' });
      pig.querySelectorAll('.gz-fin-dust').forEach((d, i) => d.animate([{ transform: 'translateX(0) scale(.3)', opacity: 0.9 }, { transform: 'translateX(' + (i ? 18 : -18) + 'px) scale(1.3)', opacity: 0 }],
        { duration: 420, delay: at + 400, easing: 'ease-out', fill: 'forwards' }));
      return at + 400;
    }
    // 从所在那一块的上沿外面掉进来（甲：台下那一片；丙：那一行；它们裁掉上沿以外的部分）——不从别人头上穿过去
    const box = pig.closest('.gz-fin-under, .gz-res-row, .gz-dialog-body');
    const pr = pig.getBoundingClientRect();
    const fall = Math.max(150, Math.round(pr.bottom - (box ? box.getBoundingClientRect().top : pr.top - 150)));
    const from = 'translateY(' + (-fall) + 'px) rotate(-18deg)';
    pig.animate([
      { transform: from, opacity: 1, easing: 'cubic-bezier(.55,0,.9,.5)' },
      { transform: 'translateY(0) rotate(4deg) scale(1.08, .82)', opacity: 1, offset: 0.62, easing: 'cubic-bezier(.3,.9,.4,1)' },
      { transform: 'translateY(-10px) rotate(-6deg)', opacity: 1, offset: 0.8 },
      { transform: 'none', opacity: 1 },
    ], { duration: 640, delay: at, fill: 'backwards' });
    pig.querySelectorAll('.gz-fin-dust').forEach((d, i) => d.animate([{ transform: 'translateX(0) scale(.3)', opacity: 0.9 }, { transform: 'translateX(' + (i ? 18 : -18) + 'px) scale(1.3)', opacity: 0 }],
      { duration: 420, delay: at + 390, easing: 'ease-out', fill: 'forwards' }));
    return at + 400;   // 落地的时刻
  }
  /* 放入场：anims 已在 d 里建好（带 delay）；ms 后收尾；sounds = [[时刻, 名字, 参数]] 用定时器排，跳过时一起取消 */
  function runFinIntro(d, ms, sounds) {
    const foot = d.querySelector('.gz-dialog-foot');
    if (foot) foot.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: Math.max(0, ms - 260), easing: 'ease-out', fill: 'backwards' });
    if (reduceMotion()) { d.getAnimations({ subtree: true }).forEach((a) => { try { a.finish(); } catch (_) { /* */ } }); return; }
    match.finShown = true;
    d.classList.add('is-intro');
    const ids = sounds.map(([at, name, arg]) => setTimeout(() => snd(name, 0, arg), at));
    let tid = 0;
    const done = () => {
      if (finIntro !== skip) return;
      finIntro = null; clearTimeout(tid); ids.forEach(clearTimeout);
      d.classList.remove('is-intro');
      const body = d.querySelector('.gz-dialog-body');   // 入场时位移过的元素可能让 openDialog 误判成要滚动，放完重算一次
      if (body) d.classList.toggle('is-scroll', body.scrollHeight > body.clientHeight + 1);
      const b = d.querySelector('[data-autofocus]') || d.querySelector('button');
      if (b) b.focus({ preventScroll: true });
    };
    const skip = () => { d.getAnimations({ subtree: true }).forEach((a) => { try { a.finish(); } catch (_) { /* */ } }); done(); };
    finIntro = skip;
    tid = setTimeout(done, ms);
    d.addEventListener('click', (e) => { if (finIntro === skip) { e.stopPropagation(); e.preventDefault(); skip(); } }, true);
  }
  function showFinal() {
    const { t, losers, me, order, rank, tally } = finalData();
    const intro = !match.finShown;   // 联机里等房主时会重画，只有第一次放入场
    const face = (s) => '<span class="gz-fin-face">' + faceHtml(AVATARS[s]) + '</span>';
    const nm = (s) => '<b class="gz-fin-nm">' + esc(NAMES[s]) + (s === me && NAMES[s] !== '我' ? '<i class="gz-fin-me">我</i>' : '') + '</b>';
    const tot = (s) => '<span class="gz-fin-tot gz-num' + (t[s] < 0 ? ' neg' : t[s] > 0 ? ' pos' : '') + '">' + signed(t[s]) + '</span>';
    const pig = (s) => (losers.includes(s) ? pigOn() : '');
    let body;
    if (GZPV === 'final-a') {
      // 甲 · 领奖台：不当猪的前三位上 2-1-3 的台子（同分同高），其余（猪 / 叫停时的第四名）站在台下
      const up = order.filter((s) => !losers.includes(s)).slice(0, 3);
      const down = order.filter((s) => !up.includes(s));
      const col = (i) => {
        const s = up[i];
        if (s == null) return '<div class="gz-pod is-empty"></div>';
        const k = Math.min(3, rank(s));
        return '<div class="gz-pod is-p' + k + (s === me ? ' is-me' : '') + '" data-seat="' + s + '"><span class="gz-fin-av">' + face(s) + '</span>' + nm(s) + tot(s) + '<span class="gz-pod-blk"></span></div>';
      };
      body = '<div class="gz-fin gz-fin-a"><div class="gz-podium">' + col(1) + col(0) + col(2) + '</div>' +
        (down.length ? '<div class="gz-fin-under">' + down.map((s) => '<div class="gz-fin-low' + (s === me ? ' is-me' : '') + (losers.includes(s) ? ' is-pig' : '') + '" data-seat="' + s + '">' +
          '<span class="gz-fin-av">' + face(s) + pig(s) + '</span>' + nm(s) + tot(s) + '</div>').join('') + '</div>' : '') + '</div>';
    } else if (GZPV === 'final-b1') {
      // 乙一 · 红榜：一块朱红榜板，四张宣纸帖子按名次一张张贴上去；猪盖在垫底那张帖子的头像上
      body = '<div class="gz-fin gz-fin-b1"><div class="gz-hb"><i class="gz-hb-knot is-l"></i><i class="gz-hb-knot is-r"></i>' +
        order.map((s, i) => '<div class="gz-slip' + (s === me ? ' is-me' : '') + (rank(s) === 1 && !losers.includes(s) ? ' is-top' : '') + (losers.includes(s) ? ' is-pig' : '') + '" style="--tilt:' + [-0.6, 0.5, -0.4, 0.7][i] + 'deg" data-seat="' + s + '">' +
          '<span class="gz-fin-av">' + face(s) + pig(s) + '</span><span class="gz-slip-mid">' + nm(s) + '<span class="gz-fin-tally">' + cardTally(tally[s]) + '</span></span>' + tot(s) + '</div>').join('') +
        '</div></div>';
    } else if (GZPV === 'final-b2') {
      // 乙二 · 经折册页：靛蓝封皮夹着四折宣纸，一折一位、从左到右按名次；翻开后名字竖排，猪盖在最后一折的头像上
      body = '<div class="gz-fin gz-fin-b2"><div class="gz-fold">' +
        order.map((s) => '<div class="gz-leaf' + (s === me ? ' is-me' : '') + (rank(s) === 1 && !losers.includes(s) ? ' is-top' : '') + (losers.includes(s) ? ' is-pig' : '') + '" data-seat="' + s + '">' +
          '<span class="gz-fin-av">' + face(s) + pig(s) + '</span>' + nm(s) + '<span class="gz-fin-tally">' + cardTally(tally[s]) + '</span>' + tot(s) + '</div>').join('') +
        '</div></div>';
    } else if (ROLL) {
      // 乙三 · 宣纸卷（精修）：黑漆细轴、金色轴头，纸从上往下展开；第一名那行大一号；猪是一枚朱印，按在垫底那行的头像角上
      body = '<div class="gz-fin gz-fin-b3"><div class="gz-roll"><i class="gz-axis"></i><div class="gz-roll-mount"><div class="gz-roll-paper">' +
        order.map((s) => '<div class="gz-roll-row' + (s === me ? ' is-me' : '') + (rank(s) === 1 && !losers.includes(s) ? ' is-top' : '') + (losers.includes(s) ? ' is-pig' : '') + '" data-seat="' + s + '">' +
          '<span class="gz-fin-av">' + face(s) + (losers.includes(s) ? (SEAL_AT === '2' ? '<span class="gz-fin-pigface" aria-hidden="true">' + ART.pig + '</span>' : SEAL_AT === '1' ? '' : sealOn()) : '') + '</span>' +
          '<span class="gz-slip-mid">' + nm(s) + '<span class="gz-fin-tally">' + cardTally(tally[s]) + '</span></span>' +
          (SEAL_AT === '1' ? '<span class="gz-roll-score">' + (losers.includes(s) ? sealOn() : '') + tot(s) + '</span>' : tot(s)) + '</div>').join('') +
        '</div></div><i class="gz-axis is-bot"></i></div></div>';
    } else {
      // 乙 · 墨园榜单：一卷纸从上往下展开，四行按累计分排；猪盖在垫底那一行的头像上，像一枚章
      body = '<div class="gz-fin gz-fin-b"><div class="gz-scroll"><i class="gz-rod is-top"></i><div class="gz-scroll-paper"><ol class="gz-board">' +
        order.map((s) => '<li class="gz-board-row' + (s === me ? ' is-me' : '') + (rank(s) === 1 && !losers.includes(s) ? ' is-top' : '') + (losers.includes(s) ? ' is-pig' : '') + '" data-seat="' + s + '">' +
          '<span class="gz-fin-av">' + face(s) + pig(s) + '</span>' + nm(s) + '<span class="gz-fin-tally">' + tallyHtml(tally[s]) + '</span>' + tot(s) + '</li>').join('') +
        '</ol></div><i class="gz-rod is-bot"></i></div></div>';
    }
    openDialog('<h2 class="gz-sr">' + finalTitle(losers) + '</h2>' + body + '<div class="gz-actions">' + settleActions() + '</div>', (d) => {
      d.classList.add('is-final', 'is-' + GZPV);
      if (ROLL) d.classList.add('is-final-b3', 'tone-' + (GZPV.slice(8, 9) || '0'), 'seal-at-' + (SEAL_AT || '0'));
      bindSettle(d);
      if (!intro) return;
      const sounds = [];
      let end = 0;
      if (GZPV === 'final-a') {
        // 台子三、二、一依次从地面长出来，人随后落到台上；台下的人淡入，猪最后落下
        const pods = [...d.querySelectorAll('.gz-pod:not(.is-empty)')].sort((a, b) => b.className.localeCompare(a.className));
        pods.forEach((p, j) => {
          const at = j * 170;
          p.querySelector('.gz-pod-blk').animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.06)', offset: 0.75 }, { transform: 'scaleY(1)' }], { duration: 440, delay: at, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' });
          p.querySelectorAll('.gz-fin-av, .gz-fin-nm, .gz-fin-tot').forEach((n) => n.animate([{ transform: 'translateY(-30px)', opacity: 0 }, { transform: 'translateY(3px)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 400, delay: at + 260, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }));
          if (p.classList.contains('is-p1')) p.querySelector('.gz-fin-av').animate([{ boxShadow: '0 0 0 0 rgba(201,169,110,.9)' }, { boxShadow: '0 0 0 14px rgba(201,169,110,0)' }], { duration: 700, delay: at + 620, fill: 'backwards' });
        });
        d.querySelectorAll('.gz-fin-low').forEach((x, i) => x.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 760 + i * 90, easing: 'ease-out', fill: 'backwards' }));
        end = 1150;
      } else if (GZPV === 'final-b1') {
        // 榜板先亮出来，帖子从上到下一张张「贴」上去（略放大、带影子落定），小牌随后冒出
        d.querySelector('.gz-hb').animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out', fill: 'backwards' });
        d.querySelectorAll('.gz-slip').forEach((x, i) => { const tl = 'rotate(' + x.style.getPropertyValue('--tilt') + ')'; x.animate([
          { opacity: 0, transform: 'translateY(-14px) scale(1.06) ' + tl, boxShadow: '0 14px 22px rgba(60,10,5,.35)' },
          { opacity: 1, transform: tl, boxShadow: '0 2px 6px rgba(60,10,5,.28)' },
        ], { duration: 300, delay: 260 + i * 170, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' }); });
        d.querySelectorAll('.gz-fin-ct').forEach((x, i) => x.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.2)', offset: 0.6 }, { transform: 'none' }], { duration: 280, delay: 900 + i * 50, easing: 'ease-out', fill: 'backwards' }));
        end = 1250;
      } else if (GZPV === 'final-b2') {
        // 一折一折翻开（绕左边的折痕转过来），小牌随后冒出
        d.querySelectorAll('.gz-leaf').forEach((x, i) => x.animate([{ transform: 'perspective(700px) rotateY(-88deg)', opacity: 0.2 }, { transform: 'perspective(700px) rotateY(6deg)', opacity: 1, offset: 0.75 }, { transform: 'none', opacity: 1 }],
          { duration: 420, delay: 80 + i * 180, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' }));
        d.querySelectorAll('.gz-fin-ct').forEach((x, i) => x.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.2)', offset: 0.6 }, { transform: 'none' }], { duration: 280, delay: 900 + i * 50, easing: 'ease-out', fill: 'backwards' }));
        end = 1250;
      } else if (ROLL) {
        const paper = d.querySelector('.gz-roll-mount'), axis = d.querySelector('.gz-axis.is-bot');
        const h = paper.offsetHeight;
        paper.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 760, delay: 100, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'backwards' });
        axis.animate([{ transform: 'translateY(' + (-h) + 'px)' }, { transform: 'none' }], { duration: 760, delay: 100, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'backwards' });
        d.querySelectorAll('.gz-roll-row').forEach((x, i) => x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, delay: 260 + i * 150, easing: 'ease-out', fill: 'backwards' }));
        d.querySelectorAll('.gz-fin-ct').forEach((x, i) => x.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.2)', offset: 0.6 }, { transform: 'none' }], { duration: 280, delay: 800 + i * 50, easing: 'ease-out', fill: 'backwards' }));
        end = 1150;
        // 头像换成猪：原头像绕竖轴翻过去，背面翻出来的就是猪（几个人同时当猪依次翻）
        d.querySelectorAll('.gz-fin-pigface').forEach((pf, i) => {
          const at = end + i * 160, fc = pf.parentNode.querySelector('.gz-fin-face');
          if (fc) fc.animate([{ transform: 'none' }, { transform: 'perspective(300px) rotateY(90deg)' }], { duration: 180, delay: at, easing: 'ease-in' });
          pf.animate([{ transform: 'perspective(300px) rotateY(-90deg)' }, { transform: 'perspective(300px) rotateY(0) scale(1.1)', offset: 0.7 }, { transform: 'none' }], { duration: 340, delay: at + 180, easing: 'ease-out', fill: 'backwards' });
          if (!i) sounds.push([at + 260, 'pig']);
        });
        if (SEAL_AT === '2') end += d.querySelectorAll('.gz-fin-pigface').length * 160 + 420;
      } else {
        const paper = d.querySelector('.gz-scroll-paper'), rod = d.querySelector('.gz-rod.is-bot');
        const h = paper.offsetHeight;
        paper.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 820, delay: 120, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'backwards' });
        rod.animate([{ transform: 'translateY(' + (-h) + 'px)' }, { transform: 'none' }], { duration: 820, delay: 120, easing: 'cubic-bezier(.35,.1,.25,1)', fill: 'backwards' });
        d.querySelectorAll('.gz-board-row').forEach((x, i) => x.animate([{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 300 + i * 150, easing: 'ease-out', fill: 'backwards' }));
        d.querySelectorAll('.gz-fin-tl').forEach((x, i) => x.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.25)', offset: 0.6 }, { transform: 'none' }], { duration: 320, delay: 700 + i * 60, easing: 'ease-out', fill: 'backwards' }));
        end = 1250;
      }
      const pigs = d.querySelectorAll('.gz-fin-pig');
      pigs.forEach((p, i) => { const land = dropPig(p, end + i * 160, GZPV !== 'final-a'); if (i === 0) sounds.push([land, 'pig']); });
      runFinIntro(d, (pigs.length ? end + (pigs.length - 1) * 160 + 640 : end) + 200, sounds);
    });
  }
  // 丙 · 原表上加记号：前三名（不当猪的）名字旁落一枚金 / 银 / 铜奖章，当猪的「猪」字签换成猪掉下来落在名字旁
  function finalMarks(d, losers) {
    const { rank } = finalData();
    const intro = !match.finShown;
    let n = 0;
    d.querySelectorAll('.gz-res-row[data-seat]').forEach((row) => {
      const s = +row.dataset.seat, name = row.querySelector('.gz-res-name');
      const badge = name.querySelector('.gz-pig-badge');
      if (badge) badge.remove();
      const mark = document.createElement('span');
      mark.className = 'gz-fin-mark';
      if (losers.includes(s)) mark.innerHTML = pigOn('is-mini');
      else if (rank(s) <= 3) mark.innerHTML = medalSvg(rank(s) - 1);
      else return;
      name.appendChild(mark);
      n++;
    });
    if (!intro || !n) return;
    const sounds = [];
    d.querySelectorAll('.gz-medal').forEach((m) => {
      const k = +m.dataset.k;
      m.animate([{ transform: 'translateY(-14px) scale(0) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(8deg)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 200 + k * 180, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'backwards' });
    });
    const pigs = d.querySelectorAll('.gz-fin-pig');
    pigs.forEach((p, i) => { const land = dropPig(p, 820 + i * 160); if (i === 0) sounds.push([land, 'pig']); });
    runFinIntro(d, (pigs.length ? 820 + (pigs.length - 1) * 160 + 640 : 900) + 150, sounds);
  }

  // 打完一盘回主页面：这一盘已经结束、不再接着打，换一盘新的（还没开局）垫在主页面后面，主页面上就不会写「接着打」
  function leaveFinishedSolo() { token++; setAutopilot(false); newMatch(); save(); showCover(); }

  /* 每局得分：一行一局（最新的在上面），四列是四家，最底下累计；点某一局展开看那一局各家吃了什么（和结算页同一套小牌）。
   * 单机记在存档里；联机的分来自服务器（刷新也在），各家吃了什么只有自己看着打完的那几局才有 */
  function keepRoundCaps(matchNo, last) {
    if (!online || !last || !last.captured) return;
    online.roundCaps[matchNo + ':' + last.roundNo] = { captured: last.captured, ctx: last.ctx };
    // 跟着联机会话存一份：刷新页面后，之前看着打完的那几局还能点开。只留这一盘的（换了一盘就丢掉上一盘的）
    const keep = {};
    Object.keys(online.roundCaps).forEach((k) => { if (k.split(':')[0] === String(matchNo)) keep[k] = online.roundCaps[k]; });
    online.roundCaps = keep;
    writeJSON(CAPS_KEY, { code: online.code, token: online.token, caps: keep });
  }
  // 同一个房间、同一个身份回来才接上；别的房间的明细作废
  function loadRoundCaps(code, tok) {
    const s = readJSON(CAPS_KEY);
    return s && s.code === code && s.token === tok && s.caps && typeof s.caps === 'object' ? s.caps : {};
  }
  function roundHistory() {
    if (!match.online) return match.history || [];
    const gv = online && online.st && online.st.game;
    if (!gv) return [];
    return (gv.history || []).map((h) => Object.assign({ roundNo: h.roundNo, scores: rot(h.scores) }, online.roundCaps[gv.matchNo + ':' + h.roundNo] || {}));
  }
  function showHistory() {
    const list = roundHistory().slice().reverse();
    const cls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
    const cell = (n) => '<td class="n gz-num ' + cls(n) + '">' + signed(n) + '</td>';
    const rows = list.map((h, i) =>
      '<tr class="gz-hist-row' + (h.captured ? ' can-open' : '') + '" data-i="' + i + '"><th scope="row">第 ' + h.roundNo + ' 局' +
      (h.captured ? '<span class="gz-hist-caret" aria-hidden="true"></span>' : '') + '</th>' + h.scores.map(cell).join('') + '</tr>').join('');
    openDialog('<h2>每局得分</h2>' +
      (list.length ? '<table class="gz-hist"><thead><tr><th></th>' + [0, 1, 2, 3].map((s) => '<th scope="col"><span>' + esc(NAMES[s]) + '</span></th>').join('') + '</tr></thead>' +
        '<tbody>' + rows + '</tbody><tfoot><tr><th scope="row">累计</th>' + match.totals.map(cell).join('') + '</tr></tfoot></table>'
        : '<p class="gz-note">这一盘还没打完一局。</p>') +
      '<div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('.gz-hist-row.can-open').forEach((tr) => tr.addEventListener('click', () => showRoundCard(list[+tr.dataset.i])));
      });
  }
  /* 某一局的明细：叠在「每局得分」上面的小窗（不展开在表格里，展开多了一大串很乱）。
   * 和结算页同一套行：名字 · 吃牌 · 本局；挤得看不清的那家换成两行 */
  let subMask = null;
  function editableEl(n) { return !!(n && n.closest && n.closest('input, textarea')); }
  function nodeEl(n) { return n && n.nodeType === 1 ? n : n && n.parentElement; }
  // force：连输入框里的选区也清（复制用的那个看不见的输入框）
  function clearSelection(force) {
    const sel = window.getSelection && window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (!force && editableEl(document.activeElement)) return;
    try { sel.removeAllRanges(); } catch (_) { /* ignore */ }
  }
  let subOnClose = null;   // 小窗关掉时要做的事（确认框：没开别的弹窗时把钟接着走）
  function closeSub() {
    if (!subMask || subMask.hidden) return;
    const a = document.activeElement;
    if (a && subMask.contains(a) && a.blur) a.blur();
    clearSelection(true);
    subMask.hidden = true; subMask.firstChild.innerHTML = '';
    const f = subOnClose; subOnClose = null;
    if (f) f();
  }
  function subBox() {
    if (!subMask) {
      subMask = document.createElement('div');
      subMask.className = 'gz-dialog-mask gz-sub-mask';
      subMask.innerHTML = '<div class="gz-dialog gz-sub" role="dialog" aria-modal="true"></div>';
      subMask.addEventListener('click', (e) => { if (e.target === subMask || e.target.closest('[data-sub-close]')) closeSub(); });
      els.app.appendChild(subMask);
    }
    closeSub();
    // 底下没开弹窗（从菜单直接点的）：问的这会儿钟先停，关掉再走
    if (els.mask.hidden) { pauseClock(); subOnClose = () => { if (els.mask.hidden) resumeClock(); }; }
    return subMask.firstChild;
  }
  /* 确认框：不用系统的 confirm()——微信内置浏览器会把它吞掉（点了没反应）。叠在当前弹窗上面的小窗，
   * 取消 / 点外面 / Esc = 什么也不做、回到原来那一层；确定才做。底下的弹窗（结算、房间设置）原样留着 */
  function askConfirm(title, text, okLabel, onOk) {
    const box = subBox();
    box.innerHTML = textSuits('<h2>' + esc(title) + '</h2>' + (text ? '<p>' + esc(text) + '</p>' : '') +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-sub-close>取消</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-yes>' + esc(okLabel) + '</button></div>');
    subMask.hidden = false;
    box.querySelector('[data-yes]').addEventListener('click', () => { closeSub(); onOk(); });
    box.querySelector('[data-yes]').focus({ preventScroll: true });
  }
  // 复制不了（剪贴板接口和 execCommand 都不让）：把内容摆在小窗里，长按自己选中复制
  function showCopyBox(title, text) {
    const box = subBox();
    box.innerHTML = '<h2>' + esc(title) + '</h2><textarea class="gz-copy-text" readonly rows="3"></textarea>' +
      '<div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-sub-close>好</button></div>';
    const ta = box.querySelector('textarea');
    ta.value = text;
    subMask.hidden = false;
    ta.addEventListener('focus', () => { try { ta.setSelectionRange(0, text.length); } catch (_) { ta.select(); } });
    box.querySelector('[data-sub-close]').focus({ preventScroll: true });
  }
  function showRoundCard(h) {
    subBox();
    const cls = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
    const box = subMask.firstChild;
    box.innerHTML = textSuits('<h2>第 ' + h.roundNo + ' 局</h2><div class="gz-res">' +
      [0, 1, 2, 3].map((s) => '<div class="gz-res-row is-3col" data-seat="' + s + '"><span class="gz-res-name">' + esc(NAMES[s]) + '</span>' +
        '<span class="gz-res-caps gz-caps"></span><span class="gz-res-n gz-num ' + cls(h.scores[s]) + '">' + signed(h.scores[s]) + '</span></div>').join('') +
      '</div><div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-sub-close>好</button></div>');
    subMask.hidden = false;
    box.querySelectorAll('.gz-res-row').forEach((row) => {
      const seat = +row.dataset.seat, caps = row.querySelector('.gz-res-caps');
      row.dataset.dbl = dblTone(h.captured[seat], h.ctx);
      const draw = () => { renderCaps(caps, h.captured[seat], null, h.ctx); const sc = caps.querySelector('.gz-cap-score'); if (sc) sc.remove(); };
      draw();
      if (fanSqueezed(caps)) { row.classList.add('is-stack'); draw(); }
    });
    box.querySelector('[data-sub-close]').focus({ preventScroll: true });
  }

  /* 规则说明跟着本盘的规则开关走 */
  function rulesHtml(rules) {
    const lead = rules.leader === 'spade2'
      ? '每局都由有 ♠2 的人先出' + (rules.spadeTwoFirst ? '，第一张必须打 ♠2' : '') + '。'
      : '第一局有 ♠2 的人先出' + (rules.spadeTwoFirst ? '，第一张必须打 ♠2' : '') + '；之后由上局吃到猪的人先出，领什么都行。';
    const hearts = rules.hearts === 'classic'
      ? '红桃 A −50、K −40、Q −30、J −20，10 到 5 各 −10，4、3、2 记 0 分（但仍算带分数的牌）。'
      : '红桃按牌面扣分：2 到 10 扣对应点数，J −11、Q −12、K −13，A 只扣 1 分。';
    const pigLine = {
      slam: '猪羊照常；红桃、猪、羊、变压器全吃齐是大满贯，猪也变正，共 +800。',
      hearts: '这时谁吃了猪，猪也变 +100；全吃齐是大满贯，共 +800。',
      manjuan: '红桃、猪、羊都吃齐（猪羊满圈），猪也变 +100；再加变压器是大满贯，共 +800。',
      swap: '这一局所有人的猪羊互换：吃猪 +100、吃羊 −100（猪羊变色）；全吃齐的大满贯不换，共 +800。',
    }[rules.allHeartsPig];
    const end = {
      lose1000: '有人累计到 −1000，这一盘结束。',
      pm1000: '有人累计到 −1000 或 +1000，这一盘结束。',
      rounds10: '打满 10 局，这一盘结束。',
      none: '不设终点，一直累计下去。',
    }[rules.end];
    return '<dl class="gz-rules">' +
      '<dt>出牌</dt><dd>四人各 13 张。' + lead + '每一轮第一张出的牌决定这一轮的花色：如果你手里有这个花色，就必须出这个花色的牌；没有才可以出任意一张（叫「垫牌」）。出了这一轮花色里最大一张的人赢下这一轮，收走这一轮的牌，下一轮由他先出。</dd>' +
      '<dt>带分数的牌</dt><dd>猪 ♠Q −100；羊 ♦J +100。' + hearts + '</dd>' +
      '<dt>变压器 ♣10</dt><dd>它本身不算分，吃到它，你这一局的分数（不论正负）翻倍' + (rules.doublerAlone === 50 ? '；只吃到它一张、别的带分数的牌都没吃到，算 +50。' : '。') + '</dd>' +
      '<dt>全红</dt><dd>一个人吃齐 13 张红桃，红桃改记 +200。' + pigLine + '</dd>' +
      (rules.expose ? '<dt>明牌</dt><dd>开打前，♥A、♠Q、♦J、♣10 可以明出来给大家看，效果翻倍：明 ♥A 红桃全部 ×2，明猪 −200，明羊 +200，明变压器 ×4' + (rules.doublerAlone === 50 ? '（单吃 +100）' : '') + '。这个花色第一次被领出的那一轮里，明出的牌不能出，也不能用它来领这个花色，除非你这个花色只剩它一张；垫牌不受限。</dd>' : '') +
      '<dt>一盘</dt><dd>' + end + '分最低的人当猪，并列都是。</dd></dl>';
  }
  // 规则里点名的牌（♠2、猪 ♠Q、羊 ♦J、变压器 ♣10、♥A）直接画成小牌，和新手教程里一样
  function rulesWithCards(rules) {
    return inlineCards(rulesHtml(rules).replace(/([♠♥♦♣])(10|[2-9JQKA])/g, '{$1$2}'));
  }

  function showRules() {
    const tutOk = !match.online;
    openDialog('<h2>拱猪规则</h2>' + rulesWithCards(match.rules) +
      '<div class="gz-actions">' + (tutOk ? '<button type="button" class="gz-btn" data-act="tutorial">新手教程</button>' +
        '<button type="button" class="gz-btn" data-act="tut-adv">进阶教程</button>' : '') +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>知道了</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        if (tutOk) {
          d.querySelector('[data-act="tutorial"]').addEventListener('click', () => { closeDialog(); startTutorial(); });
          d.querySelector('[data-act="tut-adv"]').addEventListener('click', () => { closeDialog(); startTutorial(false, 'adv'); });
        }
        // 正在明牌：直接翻到「明牌」那一段
        const gv = match.online && online && online.st && online.st.game;
        if (exposingMe() || (gv && gv.phase === 'expose')) {
          const dt = [...d.querySelectorAll('.gz-rules dt')].find((x) => x.textContent === '明牌');
          const body = d.querySelector('.gz-dialog-body');
          if (dt && body) body.scrollTop += dt.getBoundingClientRect().top - body.getBoundingClientRect().top - 6;
        }
      });
  }

  /* 设置里的规则开关：[键, 标题, [[值, 选项文字], ...]] */
  const RULE_UI = [
    ['spadeTwoFirst', '♠2 先出时', [[true, '第一张必须 ♠2'], [false, '随便出']]],
    ['leader', '每局谁先出', [['spade2', '有 ♠2 的人'], ['pig', '上局吃猪的人']]],
    ['hearts', '红桃计分', [['face', '按牌面'], ['classic', '经典 A −50']]],
    ['allHeartsPig', '全红时的猪', [['slam', '大满贯才变正'], ['hearts', '全红就变正'], ['manjuan', '猪羊满圈'], ['swap', '猪羊变色']]],
    ['doublerAlone', '单吃变压器', [[0, '不加分'], [50, '+50']]],
    ['expose', '明牌', [[true, '可以明牌'], [false, '不明牌']]],
    ['end', '一盘结束', [['lose1000', '有人到 −1000'], ['pm1000', '有人到 ±1000'], ['rounds10', '打满 10 局'], ['none', '不设终点']]],
  ];

  function restartMatch() {
    askConfirm('放弃这一盘，从 0 分重新开始？', '', '重开', () => {
      stopClock(); closeDialog(); clearScene(); busy = false; setAutopilot(false); if (social) social.clear(); newMatch(); startRound();
    });
  }

  /* ───── 右上角菜单 ─────
   * 顶栏：声音、规则、菜单，单机多一个暂停、联机多一个「说一句」。能做的事都收进菜单、写成字，前面一个线条小图标；
   * 按场合换内容：单机 / 联机房间里 / 教程里。比分不进菜单：每家头像旁边就写着累计分。 */
  let menuPanel = null;
  // 「返回百宝奇巧」只给从本站点进来的人（记在这个标签页里，刷新也还在）；
  // 单独打开的（分享链接、微信里点开、装到桌面）只是来玩这个游戏，菜单里不占这一条
  const FROM_SITE = (() => {
    const K = 'gz-from-site';
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && !ref.pathname.startsWith('/toolbox/gongzhu')) sessionStorage.setItem(K, '1');
      return sessionStorage.getItem(K) === '1';
    } catch (_) { return false; }
  })();
  // 齿轮：8 个齿按角度算出来，免得手抄一长串路径
  const GEAR = (() => {
    const pt = (deg, r) => { const a = (deg - 90) * Math.PI / 180; return (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2); };
    let d = '';
    for (let k = 0; k < 8; k++) {
      const c = k * 45;
      d += (k ? 'L' : 'M') + pt(c - 16, 6.6) + 'L' + pt(c - 10, 9.4) + 'L' + pt(c + 10, 9.4) + 'L' + pt(c + 16, 6.6);
    }
    return '<path d="' + d + 'Z"/><circle cx="12" cy="12" r="2.8"/>';
  })();
  const MENU_ICONS = {
    restart: '<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.6 4.2v4.2h-4.2"/>',
    join: '<path d="M10 4.5H17.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H10"/><path d="M4 12h10M10.5 8.5 14 12l-3.5 3.5"/>',
    create: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c.5-3.3 2.6-5.2 5.5-5.2s5 1.9 5.5 5.2"/><circle cx="16.8" cy="9.3" r="2.4"/><path d="M15.8 14.3c2.6-.2 4.4 1.5 4.8 4.4"/>',
    settings: GEAR,
    tutorial: '<path d="M12 6.6C10 5 7 4.5 4 5v13.2c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V5c-3-.5-6 0-8 1.6Z"/><path d="M12 6.6v13.2"/>',
    skip: '<path d="M4.5 6.5 11 12l-6.5 5.5Z"/><path d="M12.5 6.5 19 12l-6.5 5.5Z"/>',
    exit: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    room: '<path d="M10.2 13.8a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.1-1.1"/>',
    roomrules: '<path d="M4 7h9M17 7h3M4 17h4M12 17h8"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    leave: '<path d="M13.5 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7"/><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5"/>',
    profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
    history: '<rect x="4.5" y="4" width="15" height="16" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    cover: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.5 9.5v10h11v-10"/><path d="M10 19.5v-5h4v5"/>',
    reveal: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
    sit: '<path d="M7 4v8h10"/><path d="M7 12v8M17 12v8M7 16h10"/>',
    rules: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.6"/><path d="M12 16.9h.01"/>',
    chat: '<path d="M5.5 5.5h13a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-6.7L7.4 20v-2.9H5.5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z"/><path d="M8.6 11.3h.01M12 11.3h.01M15.4 11.3h.01"/>',
    advtut: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14Z"/><path d="M6.5 11.5v4c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4v-4"/><path d="M21.5 9.5v5"/>',
    stats: '<path d="M5 20V11h4v9M10 20V5h4v15M15 20v-6h4v6"/>',
    gzrrank: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
    feedback: '<path d="M6 21V4"/><path d="M6 4.5h11l-2.5 4 2.5 4H6"/>',
  };
  // 每条一个图标 + 一行字，不写说明小字（意思本身就清楚）
  function menuItems() {
    if (MENU_PV.menu) return pvMenuItems();
    const exit = FROM_SITE ? [['exit', '返回百宝奇巧']] : [];
    const moved = movedTools();
    if (match && match.tutorial) {
      return [['skip', '跳过教程'], ...moved, ['cover', '回到主页面'], ...exit];
    }
    if (match && match.online && online) {
      return [
        ['head', '房间 ' + online.code],
        ...(match.lobby ? [] : [['history', '每局得分']]),
        ['profile', '改名字 / 头像'],
        ...(statsOk() && !online.watching ? [['stats', '战绩']] : []),
        ['room', '邀请朋友'],
        ...(watching() && online.st.seatOpen ? [['sit', '坐下']] : []),
        ...(!online.watching ? [['reveal', meRevealing() ? '不让观战看我的牌' : '让观战看我的牌']] : []),
        ['roomrules', roomRulesLabel()],
        ...(hostPv ? hostPv.menuItems() : []),
        ...moved,
        ['leave', '离开房间'],
        ...exit,
      ];
    }
    return [
      ['history', '每局得分'],
      ['restart', '重开一盘'],
      ...moved,
      ...(NET ? [['create', '创建房间'], ['join', '加入房间']] : []),
      ...(MENU_PV.me ? [['profile', '名字 / 头像']] : []),
      ...(statsOk() ? [['stats', '战绩']] : []),
      ['settings', '设置'],
      ['tutorial', '新手教程'],
      ['line'],
      ['cover', '回到主页面'],
      ...exit,
    ];
  }
  const roomRulesLabel = () => (isHost() && match && match.lobby ? '自定义规则' : '房间规则');
  // 顶栏预览把「说一句」「规则」收进了菜单（见 syncBarPv）：菜单里补上这两条
  function movedTools() {
    return [
      ...(chatInMenu() && social && socialOk() ? [['chat', '说一句']] : []),
      ...(rulesInMenu() ? [['rules', '规则']] : []),
    ];
  }
  /* 菜单预览（?gzmenu=menu-a|b|c）：
   *   甲 照百变小咪分四组 本局 / 我 / 帮助 / 离开，组间一道细线，不写组名；乙 同样分组、每组上面一个很小的组名；
   *   丙 保持平铺，只去掉单机局里的创建 / 加入房间，补上缺的入口（名字头像、进阶教程、战绩、这步不对）。
   * 「战绩」「这步不对」两条要等对应模块落地（window.GongzhuStats / window.GongzhuFeedback）才露出 */
  const statsOk = () => !!(window.GongzhuStats && typeof window.GongzhuStats.open === 'function');
  const feedbackOk = () => !!(window.GongzhuFeedback && typeof window.GongzhuFeedback.open === 'function' && (!window.GongzhuFeedback.inMenu || window.GongzhuFeedback.inMenu()));
  function pvMenuGroups() {
    const exit = FROM_SITE ? [['exit', '返回百宝奇巧']] : [];
    const chat = chatInMenu() && social && socialOk() ? [['chat', '说一句']] : [];
    const rules = rulesInMenu() ? [['rules', '规则']] : [];
    const fb = feedbackOk() ? [['feedback', '这步不对']] : [];
    const stats = statsOk() ? [['stats', '战绩']] : [];
    if (match && match.tutorial) {
      return [['教程', [['skip', '跳过教程']]], ['帮助', rules], ['离开', [['cover', '回到主页面'], ...exit]]];
    }
    if (match && match.online && online) {
      return [
        ['房间 ' + online.code, [
          ...(match.lobby ? [] : [['history', '每局得分']]),
          ['room', '邀请朋友'],
          ...(watching() && online.st.seatOpen ? [['sit', '坐下']] : []),
          ['roomrules', roomRulesLabel()],
          ...fb,
        ]],
        ['我', [
          ['profile', '名字 / 头像'],
          ...(!online.watching ? [['reveal', meRevealing() ? '不让观战看我的牌' : '让观战看我的牌']] : []),
          ...stats,
        ]],
        ['帮助', rules],
        ['离开', [['leave', '离开房间'], ...exit]],
      ];
    }
    return [
      ['本局', [['history', '每局得分'], ['restart', '重开一盘'], ...chat, ...fb]],
      ['我', [['profile', '名字 / 头像'], ...stats, ['settings', '设置']]],
      ['帮助', [...rules, ['tutorial', '新手教程'], ['advtut', '进阶教程']]],
      ['离开', [['cover', '回到主页面'], ...exit]],
    ];
  }
  // 预览菜单：每组包一层（横屏矮屏时排成两栏，一组不拆开；见 gongzhu-menu-pv.css）
  function pvWrapGroups(panel) {
    panel.classList.add('is-pv', 'is-' + MENU_PV.menu);
    if (MENU_PV.menu === 'menu-c') return;
    let g = null;
    [...panel.children].forEach((el) => {
      if (!g || el.tagName === 'HR' || el.classList.contains('gz-menu-grp')) {
        g = document.createElement('div');
        g.className = 'gz-menu-g';
        panel.insertBefore(g, el);
      }
      g.appendChild(el);
    });
  }
  function pvMenuItems() {
    const groups = pvMenuGroups().filter(([, items]) => items.length);
    const online1 = match && match.online && online;
    if (MENU_PV.menu === 'menu-c') {
      // 平铺：离开那一组前面一道线（同现状），其余首尾相接
      const flat = [];
      groups.forEach(([, items], i) => { if (i === groups.length - 1) flat.push(['line']); flat.push(...items); });
      return online1 ? [['head', '房间 ' + online.code], ...flat] : flat;
    }
    const out = [];
    groups.forEach(([label, items], i) => {
      if (MENU_PV.menu === 'menu-b') out.push(['grp', label]);
      else if (i) out.push(['line']);
      else if (online1) out.push(['head', label]);
      out.push(...items);
    });
    return out;
  }
  function menuAct(k) {
    closeMenu();
    if (k === 'restart') restartMatch();
    else if (k === 'history') showHistory();
    else if (k === 'profile') { if (match && match.online) showProfile(); else showSoloProfile(); }
    else if (k === 'rules') showRules();
    else if (k === 'advtut') startTutorial(false, 'adv');
    else if (k === 'stats') { if (statsOk()) window.GongzhuStats.open(); }
    else if (k === 'feedback') { if (feedbackOk()) window.GongzhuFeedback.open(); }
    else if (k === 'chat') { if (social && socialOk()) social.openChat($('gzMenuBtn')); }
    else if (k === 'create') createRoom();
    else if (k === 'join') showJoin('');
    else if (k === 'settings') showSettings();
    else if (k === 'tutorial') startTutorial();
    else if (k === 'skip') endTutorial();
    else if (k === 'room') copyText(NET.inviteUrl(online.code), '邀请链接已复制，发给朋友就能进房间');
    else if (k === 'roomrules') showRoomRules('view');
    else if (hostPv && hostPv.menuAct(k)) { /* 预览模块接走了 */ }
    else if (k === 'sit') watchSit();
    else if (k === 'reveal') {
      const on = !meRevealing();
      onlineAct('reveal', { on }).then((res) => { if (res) toast(on ? '观战的人现在能看到你的手牌' : '观战的人看不到你的手牌了'); });
    }
    else if (k === 'leave') {
      askConfirm('离开房间？', match.lobby || watching() ? '' : '你的座位会交给机器人接着打。', '离开', () => leaveOnline(null, true));
    } else if (k === 'cover') {
      if (match && match.tutorial) quitTutorial(); else freezeSolo();
      showCover();
    } else if (k === 'exit') location.href = '/toolbox/';
  }
  function closeMenu() {
    if (!menuPanel || menuPanel.hidden) return;
    menuPanel.hidden = true;
    $('gzMenuBtn').setAttribute('aria-expanded', 'false');
    if (els.mask.hidden) resumeClock();
  }
  function toggleMenu(e) {
    if (e) e.stopPropagation();
    if (!menuPanel) {
      menuPanel = document.createElement('div');
      menuPanel.className = 'gz-menu';
      menuPanel.setAttribute('role', 'menu');
      menuPanel.hidden = true;
      menuPanel.addEventListener('click', (ev) => { const b = ev.target.closest('[data-menu]'); if (b) menuAct(b.dataset.menu); });
      menuPanel.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { closeMenu(); $('gzMenuBtn').focus(); return; }
        // 上下方向键在各条之间走（首尾相接），Home / End 跳到头尾
        const bs = Array.from(menuPanel.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
        const to = ev.key === 'ArrowDown' ? (i + 1) % bs.length : ev.key === 'ArrowUp' ? (i - 1 + bs.length) % bs.length : ev.key === 'Home' ? 0 : ev.key === 'End' ? bs.length - 1 : -1;
        if (to < 0 || !bs.length) return;
        ev.preventDefault();
        bs[to].focus();
      });
      document.addEventListener('click', (ev) => { if (!ev.target.closest('.gz-menu, #gzMenuBtn')) closeMenu(); });
      els.app.appendChild(menuPanel);
    }
    if (!menuPanel.hidden) { closeMenu(); return; }
    if (soundPanel) soundPanel.hidden = true;
    menuPanel.innerHTML = menuItems().map(([k, t]) =>
      k === 'line' ? '<hr>' : k === 'head' ? '<div class="gz-menu-head">' + esc(t) + '</div>'
        : k === 'grp' ? '<div class="gz-menu-grp" role="presentation">' + esc(t) + '</div>'
        : '<button type="button" role="menuitem" data-menu="' + k + '">' +
          '<svg class="gz-menu-ic" viewBox="0 0 24 24" aria-hidden="true">' + (MENU_ICONS[k] || '') + '</svg>' +
          '<b>' + esc(t) + '</b></button>').join('');
    if (MENU_PV.menu) pvWrapGroups(menuPanel);
    menuPanel.hidden = false;
    $('gzMenuBtn').setAttribute('aria-expanded', 'true');
    pauseClock();   // 翻菜单时不计时（同弹窗）
    const r = $('gzMenuBtn').getBoundingClientRect();
    menuPanel.style.top = Math.round(r.bottom + 8) + 'px';
    menuPanel.style.right = Math.round(Math.max(8, window.innerWidth - r.right)) + 'px';
    const first = menuPanel.querySelector('button');
    if (first) first.focus();
  }

  function showSettings() {
    if (match && match.online) { showRoomDialog(); return; }
    // 亮的是三家实际在用的档位（从联机大厅转来的单机局，三家可能各是一档：几档都亮）
    const inUse = new Set(match && !match.online ? botTiers() : [settings.tier]);
    const seg = Object.keys(TIER_LABELS).map((k) => '<button type="button" data-tier="' + k + '" aria-pressed="' + inUse.has(k) + '">' + TIER_LABELS[k] + '</button>').join('');
    // 这一盘的限时不是 20 秒 / 不限时（从联机大厅带来的 30 秒）：照实多画一格亮着，不然两格都不亮
    const secOpts = [20, 0];
    if (!secOpts.includes(turnSec())) secOpts.splice(1, 0, turnSec());
    const secs = secOpts.map((k) => '<button type="button" data-sec="' + k + '" aria-pressed="' + (turnSec() === k) + '">' + (TURN_SEC_OPTS[k] || k + ' 秒') + '</button>').join('');
    openDialog(
      '<h2>设置</h2><div class="gz-field-label">AI 水平</div><div class="gz-seg" role="group">' + seg + '</div>' +
      '<div class="gz-field-label">出牌限时</div><div class="gz-seg" role="group">' + secs + '</div>' +
      // 规则开关收在「玩法变体」里，默认折叠：新手先学一套完整规则，变体以后自己发现
      '<details class="gz-variants"' + (JSON.stringify(settings.rules) !== JSON.stringify(R.normalizeRules({})) ? ' open' : '') + '><summary>玩法变体</summary>' +
      RULE_UI.map(([k, label, opts]) => '<div class="gz-field-label">' + label + '</div><div class="gz-seg' + (opts.length > 2 ? ' is-4' : '') + '" role="group">' +
        opts.map(([v, t]) => '<button type="button" data-rule="' + k + '" data-val="' + v + '" aria-pressed="' + (settings.rules[k] === v) + '">' + t + '</button>').join('') +
        '</div>').join('') +
      '<p class="gz-note" data-rule-note hidden>规则改动从下一盘起生效。</p></details>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="restart">重开一盘</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => {
          const was = botTiers();
          settings.tier = b.dataset.tier;
          writeJSON(SETTINGS_KEY, settings);
          const bots = soloBots();
          if (bots) {
            bots.forEach((x) => { delete x.tier; });   // 房间里带过来的各家档位：在设置里选过就统一成这一档
            // 档位真换了：机器人当场换上这一档的名字和头像（看名字就知道是哪一档，不能挂着高手的名字打入门的牌）
            if (was.some((t) => t !== settings.tier)) renameSoloBots();
            save();
          }
          d.querySelectorAll('[data-tier]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        d.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => {
          settings.turnSec = +b.dataset.sec;
          writeJSON(SETTINGS_KEY, settings);
          if (match && match.turnSec != null) { delete match.turnSec; save(); }
          d.querySelectorAll('[data-sec]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          // 改了限时：当前这一手按新设置重新计
          if (clock.seat >= 0) { const seat = clock.seat, f = clock.onTimeout; startClock(seat, f); }
        }));
        const syncNote = () => {
          const differs = JSON.stringify(settings.rules) !== JSON.stringify(match.rules);
          d.querySelector('[data-rule-note]').hidden = !differs;
          d.querySelector('[data-act="restart"]').classList.toggle('gz-btn-primary', differs);
        };
        d.querySelectorAll('[data-rule]').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.rule;
          const opt = RULE_UI.find((x) => x[0] === k)[2].find(([v]) => String(v) === b.dataset.val);
          settings.rules = R.normalizeRules(Object.assign({}, settings.rules, { [k]: opt[0] }));
          writeJSON(SETTINGS_KEY, settings);
          d.querySelectorAll('[data-rule="' + k + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          syncNote();
        }));
        syncNote();
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="restart"]').addEventListener('click', restartMatch);
      });
  }

  /* ───── 特殊事件动画（牌桌中央，绝对定位、不占布局） ─────
   * 猪：粉色小猪头弹出、左右扭两下，然后朝吃猪的人跑过去；羊：卷毛小羊蹦两下再跑过去；
   * 变压器：圆环里一个 ×2（颜色随分数正负）+ 金星；全红：三处红心烟花接连炸开，再浮出「全红」；
   * 大满贯：金冠落下 + 金色烟花。领出花色的 A 一出：那张牌旁边盖一个小「照单全收」。 */

  const FX_DRIFT = [[0, 90], [120, 0], [0, -90], [-120, 0]];   // 朝各座位跑的方向（我 / 下 / 对 / 上）
  const FX_GAP = 600;
  const FX_DUR = { pig: 1900, sheep: 1900, doubler: 1700, allhearts: 2700, slam: 2600, clash: 2900 };
  const DOUBLER_TONE = {
    gold: { ink: '#b8924a', ring: '#c9a96e', sparks: ['#c9a96e', '#dcb86c'] },
    ash: { ink: '#7b756b', ring: '#a39c90', sparks: ['#a39c90', '#8c867b'] },
    navy: { ink: '#3d5878', ring: '#6c84a2', sparks: ['#6c84a2', '#8ea2bb'] },
  };
  const HEART_REDS = ['#b4392c', '#c9473a', '#d65f4f', '#a8322a', '#e07463'];
  const ART = {
    // 坏猪：小恶魔角、倒竖眉、红瞳、斜嘴獠牙
    pig: '<svg viewBox="0 0 140 122" aria-hidden="true">' +
      '<path d="M44 28C37 16 38 5 47 0c-2 10 2 18 9 22Z" style="fill:var(--pg-horn,#7a1e1a)"/><path d="M96 28c7-12 6-23-3-28 2 10-2 18-9 22Z" style="fill:var(--pg-horn,#7a1e1a)"/>' +
      '<path d="M22 44 28 12 52 32Z" style="fill:var(--pg-ear,#e0889a)"/><path d="M118 44 112 12 88 32Z" style="fill:var(--pg-ear,#e0889a)"/>' +
      '<ellipse cx="70" cy="70" rx="53" ry="47" style="fill:var(--pg-skin,#f2a9b5)"/><ellipse cx="40" cy="84" rx="9" ry="5.5" style="fill:var(--pg-cheek,#e98698)" opacity=".6"/><ellipse cx="100" cy="84" rx="9" ry="5.5" style="fill:var(--pg-cheek,#e98698)" opacity=".6"/>' +
      '<ellipse cx="52" cy="62" rx="9" ry="5.5" fill="#fff"/><ellipse cx="88" cy="62" rx="9" ry="5.5" fill="#fff"/><circle cx="54.5" cy="63" r="3.6" style="fill:var(--pg-eye,#b4392c)"/><circle cx="85.5" cy="63" r="3.6" style="fill:var(--pg-eye,#b4392c)"/>' +
      '<path d="M38 47 61 57M102 47 79 57" style="stroke:var(--pg-line,#3a2420)" stroke-width="6.5" stroke-linecap="round"/>' +
      // 额头一颗小黑桃（呼应 ♠Q）
      '<path d="M70 27c5 5 10 8.5 10 13 0 3.4-3.2 5.2-6 3.8-1-.5-1.8-1.3-2.4-2.4L73 47h-6l1.4-5.6c-.6 1.1-1.4 1.9-2.4 2.4-2.8 1.4-6-.4-6-3.8 0-4.5 5-8 10-13Z" style="fill:var(--pg-spade,#1f1c18)"/>' +
      '<ellipse cx="70" cy="84" rx="21" ry="14" style="fill:var(--pg-snout,#ea8f9f)"/><ellipse cx="62" cy="84" rx="3.6" ry="5.4" style="fill:var(--pg-nose,#a94a5e)"/><ellipse cx="78" cy="84" rx="3.6" ry="5.4" style="fill:var(--pg-nose,#a94a5e)"/>' +
      '<path d="M50 103q22 10 42-6" style="stroke:var(--pg-line,#3a2420)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="m80 103 4 8 3-11Z" fill="#fffaf3" style="stroke:var(--pg-line,#3a2420)" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    // 羊：羊毛先描一圈外轮廓再整块填色（像一整朵云，不是一个个圆），暖米色、腮红，额头一颗小红方块呼应 ♦J
    sheep: (() => {
      const wool = [[34, 42, 16], [52, 28, 17], [72, 28, 17], [88, 43, 16], [93, 63, 15], [78, 80, 16], [42, 80, 16], [27, 63, 15], [60, 86, 15], [60, 52, 30]];
      const tuft = [[50, 37, 9], [70, 37, 9], [60, 31, 10]];
      const circ = (a, attrs) => a.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + attrs + '/>').join('');
      return '<svg viewBox="0 0 120 106" aria-hidden="true">' +
        '<g style="fill:var(--sh-edge,#e7cfc0);stroke:var(--sh-line,#b98f80)">' + circ(wool, ' stroke-width="5"') + '</g><g style="fill:var(--sh-wool,#fbefe4)">' + circ(wool, '') + '</g>' +
        '<ellipse cx="31" cy="55" rx="12" ry="6" transform="rotate(-24 31 55)" fill="#4b3a34"/><ellipse cx="89" cy="55" rx="12" ry="6" transform="rotate(24 89 55)" fill="#4b3a34"/>' +
        '<ellipse cx="60" cy="61" rx="20" ry="25" fill="#4b3a34"/>' +
        '<g style="fill:var(--sh-edge,#e7cfc0);stroke:var(--sh-line,#b98f80)">' + circ(tuft, ' stroke-width="4"') + '</g><g style="fill:var(--sh-wool,#fbefe4)">' + circ(tuft, '') + '</g>' +
        '<path d="M60 26 65 33 60 40 55 33Z" style="fill:var(--sh-gem,#b4392c)"/>' +
        '<circle cx="52" cy="59" r="5" fill="#fff"/><circle cx="68" cy="59" r="5" fill="#fff"/><circle cx="53" cy="60" r="2.6" fill="#1d1b18"/><circle cx="69" cy="60" r="2.6" fill="#1d1b18"/>' +
        '<ellipse cx="46" cy="70" rx="4.5" ry="2.8" fill="#d9786c" opacity=".7"/><ellipse cx="74" cy="70" rx="4.5" ry="2.8" fill="#d9786c" opacity=".7"/>' +
        '<path d="M55 75Q60 80 65 75" stroke="#d9b9a6" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
    })(),
    heart: '<svg viewBox="0 0 100 92" aria-hidden="true"><path d="M50 89C20 67 3 51 3 30 3 15 15 4 29 4c9 0 16 5 21 13 5-8 12-13 21-13 14 0 26 11 26 26 0 21-17 37-47 59Z" fill="#b4392c"/>' +
      '<path d="M22 18c-6 2-10 8-10 14" stroke="#e8857a" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/></svg>',
    // 金冠：渐变金、五个尖、珍珠；正中一颗红方块，冠箍上红桃居中、草花左、黑桃右
    crown: '<svg viewBox="0 0 160 124" aria-hidden="true"><defs>' +
      '<linearGradient id="gzCrownG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e2a4"/><stop offset=".55" stop-color="#d9b062"/><stop offset="1" stop-color="#a9823a"/></linearGradient>' +
      '<linearGradient id="gzCrownB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c97c"/><stop offset="1" stop-color="#9c7731"/></linearGradient></defs>' +
      '<path d="M20 94 11 36 47 64 80 16 113 64 149 36 140 94Z" fill="url(#gzCrownG)" stroke="#8a6526" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M26 88 20 50 47 70 80 30 113 70 140 50 134 88Z" fill="none" stroke="#fff4d2" stroke-width="1.5" opacity=".55" stroke-linejoin="round"/>' +
      // 正中一颗红方块（最像宝石）
      '<path d="M80 36 90 52 80 68 70 52Z" fill="#b4392c" stroke="#7a1e1a" stroke-width="1.5"/><path d="M80 40 85 50 80 52Z" fill="#f0a49a" opacity=".8"/>' +
      '<circle cx="11" cy="33" r="6.5" fill="#fffaf0" stroke="#a9823a" stroke-width="2"/><circle cx="80" cy="12" r="7.5" fill="#fffaf0" stroke="#a9823a" stroke-width="2"/><circle cx="149" cy="33" r="6.5" fill="#fffaf0" stroke="#a9823a" stroke-width="2"/>' +
      '<circle cx="47" cy="61" r="3.5" fill="#fffaf0" stroke="#a9823a" stroke-width="1.5"/><circle cx="113" cy="61" r="3.5" fill="#fffaf0" stroke="#a9823a" stroke-width="1.5"/>' +
      '<rect x="16" y="92" width="128" height="22" rx="5" fill="url(#gzCrownB)" stroke="#8a6526" stroke-width="2.5"/><path d="M22 97H138" stroke="#fff4d2" stroke-width="1.5" opacity=".6"/>' +
      // 冠箍：红桃居中，草花在左，黑桃在右
      '<path d="M80 111c-6-4.6-10-8-10-12 0-2.8 2.2-5 4.8-5 2.2 0 4 1.3 5.2 3.2 1.2-1.9 3-3.2 5.2-3.2 2.6 0 4.8 2.2 4.8 5 0 4-4 7.4-10 12Z" fill="#b4392c" stroke="#7a1e1a" stroke-width="1.2"/>' +
      '<g fill="#1f1c18"><circle cx="50" cy="99" r="3.3"/><circle cx="46.4" cy="104" r="3.3"/><circle cx="53.6" cy="104" r="3.3"/><path d="M50 102.5 52.6 110h-5.2Z"/></g>' +
      '<path d="M110 95c3.6 3.6 7.2 6 7.2 9.4 0 2.5-2.3 3.8-4.3 2.8-.7-.4-1.3-1-1.7-1.7L112.2 110h-4.4l1-4.5c-.4.7-1 1.3-1.7 1.7-2 1-4.3-.3-4.3-2.8 0-3.4 3.6-5.8 7.2-9.4Z" fill="#1f1c18"/>' +
      '<g fill="#fffaf0"><circle cx="34" cy="103" r="2.6"/><circle cx="65" cy="103" r="2.6"/><circle cx="95" cy="103" r="2.6"/><circle cx="126" cy="103" r="2.6"/></g></svg>',
  };

  function markAce(plays, seat, card) {
    if (!plays.length || R.rankOf(card) !== 12) return;
    if (R.suitOf(card) !== R.suitOf(plays[0].card)) return;
    els.slots[seat].classList.add('is-ace');
  }

  // 一轮里可能同时有好几件事（猪 + 变压器……）：依次上演。返回整段时长（无事件返回 0）
  function planTrickFx(done) {
    const r = match.round;
    const w = done.winner;
    const cs = done.plays.map((p) => p.card);
    const sc = R.scoreCaptured(r.captured[w], R.scoreCtx(r));
    const list = [];
    const hadAll = r.captured[w].filter(R.isHeart).length === 13 && cs.some(R.isHeart);
    // 大满贯要吃齐全部 16 张分牌：凑齐的必然是最后一张分牌所在的这一轮——不管这一轮里有没有红桃
    // （原来只认「这轮有红桃」：先吃齐红桃、最后才吃到猪 / 羊 / 变压器时，大满贯和那张牌的动画都不放）
    const slamNow = sc.grandSlam && cs.some(R.isScoring);
    // 动画只写效果 / 分数，不写是谁吃的（飘向谁已经说明了）
    if (slamNow) list.push({ kind: 'slam', word: '大满贯', sub: signed(sc.total) });
    else if (hadAll) list.push({ kind: 'allhearts', word: '全红', sub: signed(sc.heartScore) });
    if (!slamNow) {
      // 变压器的颜色看吃到它的人现在的分：正分金色（翻倍是好事）、负分灰色（雪上加霜）、0 分藏青
      const dbl = { word: '×' + (R.scoreCtx(r).exposed.includes(R.DOUBLER) ? 4 : 2), tone: sc.total > 0 ? 'gold' : sc.total < 0 ? 'ash' : 'navy' };
      const specials = [R.SHEEP, R.PIG, R.DOUBLER].filter((c) => cs.includes(c));
      if (specials.length >= 2) {
        // 猪 / 羊 / 变压器有两张以上同一轮被吃：不各放各的，改成对撞（见 playClash）；三张一起是三角对撞，烟花更大
        list.push({ kind: 'clash', cards: specials, dur: specials.length === 3 ? 3500 : FX_DUR.clash,
          pigSub: signed(sc.pigScore), sheepSub: signed(sc.sheepScore), dbl });
      } else {
        if (cs.includes(R.PIG)) list.push({ kind: 'pig', card: R.PIG, sub: signed(sc.pigScore) });
        if (cs.includes(R.SHEEP)) list.push({ kind: 'sheep', card: R.SHEEP, sub: signed(sc.sheepScore) });
        if (cs.includes(R.DOUBLER)) list.push({ kind: 'doubler', card: R.DOUBLER, word: dbl.word, sub: '', tone: dbl.tone });
      }
    }
    // 全红和猪 / 羊 / ×2 同一轮：接力——全红整段放完，再放猪 / 羊 / ×2（或对撞），两段不叠（用户从四版里挑定「甲」）
    if (hadAll && !slamNow && list.length === 2) {
      const spec = list[1];
      return reduceMotion() ? [] : [{ kind: 'combo', all: list[0], spec, dur: COMBO_GAP + (spec.dur || FX_DUR[spec.kind]) }];
    }
    return reduceMotion() ? [] : list;
  }

  function playTrickFx(done, list) {
    const w = done.winner;
    if (rimPv && list.length) rimPv.fx(list, w);
    if (!list.length) return 0;
    if (window.GongzhuAudio) window.GongzhuAudio.duck(list.reduce((m, fx, k) => Math.max(m, k * FX_GAP + (fx.dur || FX_DUR[fx.kind])), 0));
    let end = 0;
    list.forEach((fx, k) => {
      schedule(() => playFx(fx, w), k * FX_GAP);
      end = Math.max(end, k * FX_GAP + (fx.dur || FX_DUR[fx.kind]));
    });
    return end;
  }

  // 多段关键帧：缓动按段给（Web Animations 的整体 easing 会把整条时间线压歪，停顿变短、淡出提前）
  function animate(el, frames, opts, ease) {
    const e = ease || 'cubic-bezier(.25, .8, .35, 1)';
    return el.animate(frames.map((f) => Object.assign({ easing: e }, f)), Object.assign({ easing: 'linear' }, opts));
  }
  const FT = (x, y, sc, rot) => 'translate(-50%, -50%) translate(' + (x || 0) + 'px,' + (y || 0) + 'px) scale(' + (sc == null ? 1 : sc) + ') rotate(' + (rot || 0) + 'deg)';

  /* ───── 特效引擎（games-fx.js，和百变小咪共用）─────
   * 每个动画层一台：平时是 #gzFx，对撞放不下时是临时搭的缩放舞台。坐标是层自己的坐标，原点在左上角；
   * 拱猪的特效都以桌子正中为原点写（FT 的 left:50% top:50%），换算一下：fxOrigin() + (x, y)。
   * 粒子画布盖满整个视口（cover）：#gzFx 只是桌子中间一块，烟花会飞出去。善后定时器走 after（清场时一起清）。 */
  const fxLayers = new Set();
  function fxOf(layer) {
    if (!layer._gfx) {
      layer._gfx = window.GamesFx.create(layer, { prefix: 'gz', cardRatio: 1.44, cover: true, exact: true, later: after, sound: snd });
      fxLayers.add(layer);
    }
    return layer._gfx;
  }
  const fxOrigin = () => ({ x: els.fx.clientWidth / 2, y: els.fx.clientHeight / 2 });
  // 拱猪烟花的手感（和原来的 DOM 粒子逐项一样：起飞错开、下坠、大个飞近一点、转角、各段缩放、寿命 1250 / 大个 1400、字号取整）
  const GZ_SPARK = { lag: { double: 110, spiral: 16, fountain: 140, scatter: 170 }, fallBig: 0.65, fountain: [2.75, 1.75], bigDist: 0.85,
    spin: { steady: [6, 10], near: [14, 40], free: [40, 150, 320] }, scale: [0.3, 0.6, 1.12, 1, 1, 0.75], bigLife: 1.12, round: true };
  // 中心晕光（原 .gz-flash：90px 圆、径向渐变）；transparent 写成末色的透明版，和 CSS 的预乘插值一致
  const GLOW_GOLD = [[0, 'rgba(255, 236, 200, 0.95)'], [0.45, 'rgba(201, 169, 110, 0.35)'], [0.7, 'rgba(201, 169, 110, 0)']];
  const GLOW_RED = [[0, 'rgba(255, 214, 205, 0.9)'], [0.45, 'rgba(180, 57, 44, 0.28)'], [0.7, 'rgba(180, 57, 44, 0)']];
  /* 粒子形状：四种花色用牌面同一套矢量（和原来 span 里的 suitSVG 同一几何：♠♣ 宽 = 字的步进宽、高 1em、基线 1450.5；♥♦ 1em 见方），
   * 其余字符（✦）照原样用文字画：line-height 1 的行盒里基线在正中往下 (上伸 − 下伸) / 2 */
  const SPARK_SHAPES = {};
  function sparkShape(ch) {
    if (SPARK_SHAPES[ch]) return SPARK_SHAPES[ch];
    let draw;
    const suit = SUIT_OF_CHAR[ch];
    if (suit != null && GLYPH_SUITS[suit]) {
      const gl = GLYPH_SUITS[suit], path = new Path2D(gl.d);
      draw = (g, sz, color) => { const k = sz / 2048; g.translate(-gl.adv * k / 2, -sz / 2); g.scale(k, k); g.translate(0, 1450.5); g.fillStyle = color; g.fill(path); };
    } else if (suit != null) {
      const sv = SVG_SUITS[suit], path = new Path2D(sv.d);
      const ops = [...sv.t.matchAll(/(translate|scale)\(([^)]+)\)/g)].map((m) => [m[1], m[2].trim().split(/[\s,]+/).map(Number)]);
      draw = (g, sz, color) => {
        g.translate(-sz / 2, -sz / 2); g.scale(sz / 1000, sz / 1000);
        for (const [op, v] of ops) { if (op === 'translate') g.translate(v[0], v[1] || 0); else g.scale(v[0], v[1] == null ? v[0] : v[1]); }
        g.fillStyle = color; g.fill(path);
      };
    } else {
      const txt = ch + '\uFE0E', metric = {};
      draw = (g, sz, color) => {
        g.font = sz + "px 'Apple Symbols', 'Segoe UI Symbol', serif";
        const m = metric[sz] || (metric[sz] = (() => { const t = g.measureText(txt); const A = t.fontBoundingBoxAscent, D = t.fontBoundingBoxDescent; return { w: t.width, dy: A != null ? (A - D) / 2 : sz * 0.3 }; })());
        g.fillStyle = color; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        g.fillText(txt, -m.w / 2, m.dy);
      };
    }
    return (SPARK_SHAPES[ch] = { draw });
  }

  /* 大元素的影子 / 光晕预先画好垫在下面（2026-11-22）：原来插画、大红心、对撞的大花色带 CSS drop-shadow，
   * 一边缩放一边算大半径模糊；现在按同样的偏移、模糊、颜色在画布上画一次「只有影子」的底，元素本身不再带 filter。
   * 插画是 SVG 转成图片画的，要先解码：页面空下来时预先载好；万一还没好，这一次照旧用 CSS 的 filter（.is-baked 才去掉） */
  const BAKE = {   // 插画 → 影子层（由内到外）：[dx, dy, 模糊, 颜色]；第二层是给「插画 + 第一层影子」整体再加的光晕（猪）
    pig: [[0, 4, 6, 'rgba(20, 18, 15, 0.16)'], [0, 0, 18, 'rgba(122, 30, 26, 0.45)']],
    sheep: [[0, 4, 6, 'rgba(20, 18, 15, 0.16)']],
    crown: [[0, 6, 12, 'rgba(169, 130, 58, 0.4)']],
    heart: [[0, 6, 10, 'rgba(180, 57, 44, 0.3)']],
  };
  const artImg = {};
  function loadArt() {
    for (const k of Object.keys(BAKE)) {
      if (artImg[k]) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART[k].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      artImg[k] = img;
      if (img.decode) img.decode().catch(() => {});
    }
  }
  if (window.requestIdleCallback) requestIdleCallback(loadArt, { timeout: 3000 }); else setTimeout(loadArt, 1200);
  // 只画影子：把东西画在画布外很远处、影子偏移回来（画布的影子偏移和模糊都按像素算，不跟 transform 走）
  function shadowOnly(g, src, x, y, w, h, R, [dx, dy, blur, color]) {
    const FAR = 10000;
    g.save();
    g.shadowColor = color; g.shadowBlur = blur * R; g.shadowOffsetX = FAR + dx * R; g.shadowOffsetY = dy * R;
    g.drawImage(src, x - FAR, y, w, h);
    g.restore();
  }
  function bakeLayer(w, h, layers, paint) {
    const R = Math.min(2, window.devicePixelRatio || 1) * 1.25;   // 元素会放大到 1.2 倍左右，按这个分辨率画
    const pad = Math.ceil(layers.reduce((m, l) => Math.max(m, Math.abs(l[0]) + Math.abs(l[1]) + l[2] * 2), 0)) + 2;
    const W = Math.ceil((w + pad * 2) * R), H = Math.ceil((h + pad * 2) * R);
    const shape = document.createElement('canvas');
    shape.width = W; shape.height = H;
    const sg = shape.getContext('2d');
    sg.setTransform(R, 0, 0, R, pad * R, pad * R);
    paint(sg);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    const out = document.createElement('canvas');
    out.width = W; out.height = H;
    const og = out.getContext('2d');
    shadowOnly(og, shape, 0, 0, W, H, R, layers[0]);
    if (layers[1]) {
      // 外层光晕是给「本体 + 内层影子」整体加的：先合成一份，再取它的影子
      const both = document.createElement('canvas');
      both.width = W; both.height = H;
      const bg = both.getContext('2d');
      shadowOnly(bg, shape, 0, 0, W, H, R, layers[0]);
      bg.drawImage(shape, 0, 0);
      const tmp = document.createElement('canvas');
      tmp.width = W; tmp.height = H;
      const tg = tmp.getContext('2d');
      shadowOnly(tg, both, 0, 0, W, H, R, layers[1]);
      tg.drawImage(out, 0, 0);
      return { cv: tmp, pad };
    }
    return { cv: out, pad };
  }
  function placeBake(host, baked, w, h) {
    const c = baked.cv;
    c.className = 'gz-bake';
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'left:' + (-baked.pad) + 'px;top:' + (-baked.pad) + 'px;width:' + (w + baked.pad * 2) + 'px;height:' + (h + baked.pad * 2) + 'px';
    host.prepend(c);
    host.classList.add('is-baked');
  }
  const bakeCache = new Map();
  function cachedBake(key, w, h, layers, paint) {
    let b = bakeCache.get(key);
    if (!b) { b = bakeLayer(w, h, layers, paint); bakeCache.set(key, b); }
    const c = document.createElement('canvas');
    c.width = b.cv.width; c.height = b.cv.height;
    c.getContext('2d').drawImage(b.cv, 0, 0);
    return { cv: c, pad: b.pad };
  }
  // 一个特效元素里的插画 / 大红心：量出它摆出来的大小，垫上影子
  function bakeIn(el) {
    const art = el.querySelector('.gz-fxart, .gz-fxheart');
    if (!art) return;
    const svg = art.querySelector('svg');
    const k = art.classList.contains('gz-fxheart') ? 'heart' : el.classList.contains('kind-pig') ? 'pig' : el.classList.contains('kind-sheep') ? 'sheep' : el.classList.contains('kind-slam') ? 'crown' : '';
    const img = artImg[k];
    if (!k || !svg || !img || !img.complete || !img.naturalWidth) return;
    const vb = svg.viewBox.baseVal, w = parseFloat(getComputedStyle(svg).width), h = w * vb.height / vb.width;
    if (!(w > 0)) return;
    placeBake(art, cachedBake(k + ':' + w, w, h, BAKE[k], (g) => g.drawImage(img, 0, 0, w, h)), w, h);
  }
  // 对撞中央的大花色：路径就是花色矢量，直接画
  function bakeGiant(el, suit, size) {
    const gl = GLYPH_SUITS[suit], w = gl ? size * gl.adv / 2048 : size, h = size;
    const shape = sparkShape(['♠', '♥', '♦', '♣'][suit]);
    placeBake(el, cachedBake('giant:' + suit + ':' + size, w, h, [[0, 6, 14, 'rgba(20, 18, 15, 0.22)']],
      (g) => { g.translate(w / 2, h / 2); shape.draw(g, size, '#000'); }), w, h);
  }

  /* 对撞：猪 / 羊 / 变压器有两张以上同一轮被吃。
   * 两张：一左一右（羊 + 猪：羊左猪右；羊 / 猪 + 变压器：羊或猪在左、×2 在右）；三张：正三角，羊左上、猪右上、×2 在下。
   * 各自亮相（羊蹦两下、猪刨两下地、×2 一鼓一鼓），往后一缩，一起冲向中间撞上——白光一闪、一团烟把它们吞掉，
   * 接着用参与者的花色放烟花（羊 ♦、猪 ♠、变压器 ♣；三张一起再加金星、多放两轮），不写字；
   * 最后这几张牌在吃到的人的吃牌区翻出来。 */
  /* 对撞的构图按宽屏排的（左右两位离中心 170px，三张时三角摆开）：手机竖屏放不下，就把整场——位置、大小、烟花——
   * 按同一比例缩进画幅，构图不变。做法：临时搭一层缩放过的舞台，这一场的元素都往舞台里放（全是同步创建的），放完拆掉 */
  function playClash(fx, w) {
    const three = fx.cards.length === 3;
    const box = els.fx.getBoundingClientRect();
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const roomX = Math.min(cx, window.innerWidth - cx) - 8, roomY = Math.min(cy, window.innerHeight - cy) - 8;
    // 角色最外沿离中心多远：站位 + 蓄力往后缩的 20px + 半个身子（两张：猪羊各 150 宽；三张：上两位 + 下面的 ×2）
    const f = Math.min(1, roomX / (three ? 235 : 265), roomY / (three ? 225 : 150));
    if (f >= 0.99) { playClashScene(fx, w); return; }
    const host = els.fx;
    const stage = document.createElement('div');
    stage.className = 'gz-fx-stage';
    stage.style.transform = 'scale(' + f.toFixed(3) + ')';
    host.appendChild(stage);
    els.fx = stage;
    try { playClashScene(fx, w); } finally { els.fx = host; }
    after(() => { stage.remove(); fxLayers.delete(stage); }, (fx.dur || FX_DUR.clash) + 3200);
  }
  function playClashScene(fx, w) {
    const dur = fx.dur || FX_DUR.clash;
    const three = fx.cards.length === 3;
    const pos = three
      ? { [R.SHEEP]: [-140, -80], [R.PIG]: [140, -80], [R.DOUBLER]: [0, 150] }
      : (() => { const [l, r] = fx.cards; return { [l]: [-170, 0], [r]: [170, 0] }; })();
    const tag = (v) => '<div class="gz-fxscore ' + (v[0] === '−' ? 'neg' : 'pos') + '">' + v + '</div>';
    const IN = 'cubic-bezier(.55, 0, .9, .45)';   // 冲锋：越跑越快
    const OUT = 'cubic-bezier(.25, .8, .35, 1)';
    const actors = fx.cards.map((c) => {
      const el = document.createElement('div');
      if (c === R.DOUBLER) {
        const tone = DOUBLER_TONE[fx.dbl.tone || 'gold'];
        el.className = 'gz-fxitem kind-doubler is-duel';
        el.innerHTML = '<div class="gz-fxcoin" style="--tone:' + tone.ring + ';color:' + tone.ink + '"><span>' + fx.dbl.word + '</span></div>';
      } else {
        const pig = c === R.PIG;
        el.className = 'gz-fxitem kind-' + (pig ? 'pig' : 'sheep') + ' is-duel';
        el.innerHTML = '<div class="gz-fxart">' + ART[pig ? 'pig' : 'sheep'] + '</div>' + tag(pig ? fx.pigSub : fx.sheepSub);
      }
      els.fx.appendChild(el);
      bakeIn(el);
      const [x, y] = pos[c];
      const len = Math.hypot(x, y) || 1, ux = x / len, uy = y / len;   // 从中间指向它的方向
      const at = (k, sc, rot) => FT(x * k, y * k, sc, rot);
      const lean = (ux || uy) * 8;
      // 亮相后的小动作：羊蹦、猪刨地、×2 一鼓一鼓
      const idle = c === R.SHEEP
        ? [{ transform: FT(x, y - 22, 1), offset: 0.19 }, { transform: at(1, 1), offset: 0.24 }, { transform: FT(x, y - 12, 1), offset: 0.28 }]
        : c === R.PIG
          ? [{ transform: FT(x - 9, y, 1, -4), offset: 0.18 }, { transform: FT(x + 9, y, 1, 3), offset: 0.23 }, { transform: FT(x - 4, y, 1, -2), offset: 0.28 }]
          : [{ transform: at(1, 1.14), offset: 0.18 }, { transform: at(1, 0.96), offset: 0.23 }, { transform: at(1, 1.08), offset: 0.28 }];
      const frames = [
        { transform: at(1.25, 0.2), opacity: 0 },
        { transform: at(1, 1.08), opacity: 1, offset: 0.08 },
        { transform: at(1, 1), offset: 0.13 },
        ...idle,
        { transform: FT(x + ux * 20, y + uy * 20, 0.96, -lean), offset: 0.33 },   // 往后一缩，蓄力
        { transform: at(0.22, 1.06, lean), offset: 0.43 },
        { transform: at(0.17, 0.86), opacity: 1, offset: 0.46 },
        { transform: at(0.15, 0.4), opacity: 0, offset: 0.54 },
        { transform: at(0.15, 0.4), opacity: 0 },
      ].map((f, i, all) => Object.assign({ easing: all[i + 1] && all[i + 1].offset === 0.43 ? IN : OUT }, f));
      el.animate(frames, { duration: dur, fill: 'forwards', easing: 'linear' });
      const label = el.querySelector('.gz-fxscore');
      if (label) label.animate([{ opacity: 1 }, { opacity: 1, offset: 0.27 }, { opacity: 0, offset: 0.33 }, { opacity: 0 }], { duration: dur, fill: 'forwards' });
      return el;
    });

    const hit = Math.round(dur * 0.44);
    // 声音：各自亮相时叫一声（羊咩、猪哼、×2 叮）→ 蓄力冲锋的风声 → 撞上「轰」
    fx.cards.forEach((c, i) => snd(c === R.SHEEP ? 'sheep' : c === R.PIG ? 'pig' : 'doubler', 60 + i * 140));
    snd('charge', dur * 0.33, dur * 0.11);
    snd('boom', hit, three);
    const glyphs = fx.cards.map((c) => (c === R.SHEEP ? '♦' : c === R.PIG ? '♠' : '♣'));
    const tint = (g) => (g === '♣' ? DOUBLER_TONE[fx.dbl.tone || 'gold'].ink : SUIT_TINT(g));
    // 撞上：白光 + 参与者的花色四溅
    burst(0, -18, three ? 56 : 44, glyphs, tint, hit, three ? 220 : 190, { glow: 'gold', spin: true, size: [16, three ? 80 : 72] });
    // 一团烟：一圈圈灰白的云团鼓起来、往上飘散（引擎的 smoke，参数是拱猪原来那一组）
    const oc = fxOrigin();
    fxOf(els.fx).smoke(oc.x, oc.y - 18, { n: three ? 15 : 11, spread: three ? 60 : 46, size: [70, three ? 160 : 140], delay: hit,
      rise: 40, alpha: 0.85, life: [1100, 1600], spreadK: [1.2, 1.7] });
    // 爆炸中央浮出巨大的花色：猪 ♠、羊 ♦（变压器只是倍数，两张时不单独出大花色）；
    // 猪羊对撞两个依次冒出、再一起淡掉；三张一起是三个大花色在三角位置接连冒出，各自炸碎成一把同花色的碎片
    const giants = three ? [[R.SHEEP, -70, -55], [R.PIG, 70, -55], [R.DOUBLER, 0, 55]]
      : fx.cards.filter((c) => c !== R.DOUBLER).map((c, i, all) => [c, all.length > 1 ? (i ? 46 : -46) : 0, -18]);
    giants.forEach(([c, gx, gy], i) => {
      const suit = c === R.SHEEP ? 2 : c === R.PIG ? 0 : 3;
      const g = document.createElement('div');
      g.className = 'gz-giant';
      g.style.color = c === R.DOUBLER ? DOUBLER_TONE[fx.dbl.tone || 'gold'].ink : suit === 2 ? '#b4392c' : '#1f1c18';
      g.style.fontSize = (three ? 200 : 260) + 'px';
      g.innerHTML = suitSVG(suit);
      bakeGiant(g, suit, three ? 200 : 260);
      els.fx.appendChild(g);
      const delay = hit + 90 + i * (three ? 260 : 380);
      const life = three ? 1200 - i * 120 : 1500;
      snd('gong', delay + life * 0.08, suit);
      if (three) snd('shatter', delay + life * 0.62);
      animate(g, three ? [
        { transform: FT(gx, gy, 0.15, -12), opacity: 0 },
        { transform: FT(gx, gy, 1.22, 4), opacity: 1, offset: 0.2 },
        { transform: FT(gx, gy, 1, 0), opacity: 1, offset: 0.34 },
        { transform: FT(gx, gy, 1.04, 0), opacity: 1, offset: 0.62 },
        { transform: FT(gx, gy, 1.55, 0), opacity: 0 },
      ] : [
        { transform: FT(gx, gy, 0.15, -10), opacity: 0 },
        { transform: FT(gx, gy, 1.2, 3), opacity: 1, offset: 0.16 },
        { transform: FT(gx, gy, 1, 0), opacity: 1, offset: 0.28 },
        { transform: FT(gx, gy, 1.03, 0), opacity: 0.95, offset: 0.66 },
        { transform: FT(gx, gy, 1.28, 0), opacity: 0 },
      ], { duration: life, delay, fill: 'both' });   // 缓动逐段给（整体 easing 会把停留段压没）
      // 三张一起：大花色在淡出的那一刻炸碎成一把同花色碎片
      if (three) burst(gx, gy, 30, [['♠', '♥', '♦', '♣'][suit]], tint, delay + life * 0.62, 200, { glow: 'none', spin: true, size: [18, 84] });
      after(() => g.remove(), delay + life + 60);
    });
    // 撞完的烟花：两侧、上方接连再炸几朵；三张一起再多两轮、加金星
    const more = three ? glyphs.concat(['✦']) : glyphs;
    const tint2 = (g) => (g === '✦' ? '#c9a96e' : tint(g));
    burst(-120, -50, 24, more, tint2, hit + 260, 130, { glow: 'none', spin: true, size: [16, 64] });
    burst(125, -40, 24, more, tint2, hit + 480, 130, { glow: 'none', spin: true, size: [16, 64] });
    burst(0, -90, 30, more, tint2, hit + 700, 160, { glow: 'gold', spin: true, size: [16, 72] });
    if (three) {
      burst(-90, 70, 26, more, tint2, hit + 900, 140, { glow: 'none', spin: true, size: [16, 70] });
      burst(95, 75, 26, more, tint2, hit + 1080, 140, { glow: 'none', spin: true, size: [16, 70] });
      burst(0, -10, 44, more, tint2, hit + 1280, 210, { glow: 'gold', spin: true, size: [18, 86] });
    }
    after(() => {
      actors.forEach((el) => el.remove());
    }, dur);
  }

  function playFx(fx, w) {
    if (fx.kind === 'clash') { playClash(fx, w); return; }
    if (fx.kind === 'combo') { playCombo(fx, w); return; }
    const [dx, dy] = FX_DRIFT[w];
    const dur = FX_DUR[fx.kind];
    const item = document.createElement('div');
    item.className = 'gz-fxitem kind-' + fx.kind;
    const art = fx.kind === 'pig' || fx.kind === 'sheep' ? ART[fx.kind] : fx.kind === 'slam' ? ART.crown : '';
    const tone = fx.kind === 'doubler' ? DOUBLER_TONE[fx.tone || 'gold'] : null;
    item.innerHTML = (art ? '<div class="gz-fxart">' + art + '</div>' : '') +
      (fx.kind === 'allhearts' ? '<div class="gz-fxheart">' + ART.heart + '<span class="w">' + fx.word + '</span></div>' : '') +
      (fx.kind === 'doubler' ? '<div class="gz-fxcoin" style="--tone:' + tone.ring + ';color:' + tone.ink + '"><span>' + fx.word + '</span></div>' : '') +
      (fx.kind === 'slam' ? '<div class="gz-fxword">大满贯</div>' : '') +
      (fx.sub ? '<div class="gz-fxscore ' + (fx.sub[0] === '−' ? 'neg' : 'pos') + '">' + fx.sub + '</div>' : '');
    els.fx.appendChild(item);
    bakeIn(item);
    // 声音跟着动作：猪抖身子时哼两声再刨地、羊一出场就咩、变压器落定时叮、全红大红心跳时怦怦、金冠落下时奏一串
    ({ pig: () => snd('pig', 250), sheep: () => snd('sheep', 120), doubler: () => snd('doubler', 180),
      allhearts: () => snd('heartbeat', dur * 0.33), slam: () => snd('slam', dur * 0.13) })[fx.kind]();

    // 最后一段：缩成牌那么大、飞进吃牌区；落地瞬间淡掉，换成真牌翻出来
    // 收尾：特效就地缩小淡出、略朝吃到的人那边飘一点（牌随后再整轮收过去）
    const LAND = [{ transform: FT(dx * 0.3, dy * 0.3, 0.6), opacity: 0 }];
    let frames;
    if (fx.kind === 'pig') {
      // 猪是 ♠Q：四散的全是大大小小、边飞边转的黑桃
      bloom(['♠'], ['#1f1c18', '#3a2420', '#4a3a36', '#7a1e1a'], 180, 190, [16, 82]);
      frames = [
        { transform: FT(0, 0, 0.2), opacity: 0 }, { transform: FT(0, 0, 1.15), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1), offset: 0.26 },
        { transform: FT(-9, 0, 1), offset: 0.34 }, { transform: FT(9, 0, 1), offset: 0.42 }, { transform: FT(-6, 0, 1), offset: 0.5 },
        { transform: FT(4, 0, 1), offset: 0.57 }, { transform: FT(0, 0, 1), opacity: 1, offset: 0.66 }, ...LAND
      ];
    } else if (fx.kind === 'sheep') {
      // 羊是 ♦J：四散的是红方块
      bloom(['♦'], ['#b4392c', '#c9473a', '#d65f4f', '#a8322a'], 180, 190, [16, 76]);
      frames = [
        { transform: FT(0, 0, 0.2), opacity: 0 }, { transform: FT(0, 0, 1.12), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1), offset: 0.26 },
        { transform: FT(0, -22, 1), offset: 0.36 }, { transform: FT(0, 0, 1), offset: 0.46 }, { transform: FT(0, -13, 1), offset: 0.54 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.66 }, ...LAND
      ];
    } else if (fx.kind === 'doubler') {
      frames = [
        { transform: FT(0, 0, 2.2), opacity: 0 }, { transform: FT(0, 0, 0.92), opacity: 1, offset: 0.16 }, { transform: FT(0, 0, 1.04), offset: 0.24 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.7 }, ...LAND
      ];
      // 变压器是 ♣10：四散的是草花，颜色跟着圆环
      bloom(['♣'], tone.sparks, 120, 160, [16, 66], 0);
    } else if (fx.kind === 'allhearts') {
      // 只用红心：五朵红心烟花接连炸开，中间一颗大红心「怦、怦」跳两下
      burst(-150, -60, 26, ['♥'], HEART_REDS, 0, 135, { glow: 'red', spin: true, size: [20, 78] });
      burst(150, -50, 26, ['♥'], HEART_REDS, 220, 135, { glow: 'red', spin: true, size: [20, 78] });
      burst(-90, 70, 24, ['♥'], HEART_REDS, 440, 120, { glow: 'red', spin: true, size: [20, 78] });
      burst(100, 75, 24, ['♥'], HEART_REDS, 620, 120, { glow: 'red', spin: true, size: [20, 78] });
      burst(0, -10, 40, ['♥'], HEART_REDS, 820, 190, { glow: 'red', spin: true, size: [20, 78] });
      frames = [
        { transform: FT(0, 0, 0), opacity: 0 }, { transform: FT(0, 0, 0), opacity: 0, offset: 0.26 },
        { transform: FT(0, 0, 1.18), opacity: 1, offset: 0.34 }, { transform: FT(0, 0, 0.94), offset: 0.4 },
        { transform: FT(0, 0, 1.1), offset: 0.46 }, { transform: FT(0, 0, 1), offset: 0.53 },
        { transform: FT(0, 0, 1), opacity: 1, offset: 0.82 }, ...LAND
      ];
    } else {   // slam
      // 大满贯：四种花色混在一起，加几颗金星
      burst(-140, -40, 26, ['♠', '♥', '♦', '♣', '✦'], SUIT_TINT, 250, 140, { spin: true, size: [18, 72] });
      burst(140, -40, 26, ['♣', '♦', '♥', '♠', '✦'], SUIT_TINT, 520, 140, { spin: true, size: [18, 72] });
      burst(0, 20, 36, ['♥', '♠', '♦', '♣', '✦'], SUIT_TINT, 800, 175, { spin: true, size: [18, 82] });
      frames = [
        { transform: FT(0, -120, 1), opacity: 0 }, { transform: FT(0, 6, 1), opacity: 1, offset: 0.14 }, { transform: FT(0, -6, 1), offset: 0.2 },
        { transform: FT(0, 0, 1), offset: 0.26 }, { transform: FT(0, 0, 1), opacity: 1, offset: 0.82 }, ...LAND
      ];
    }
    animate(item, frames, { duration: dur, fill: 'forwards' });
    // 分数大字在起飞前先淡掉，只让插画飞过去
    const label = item.querySelector('.gz-fxscore');
    if (label) {
      const holdEnd = frames[frames.length - 2].offset || 0.66;
      animate(label, [{ opacity: 1 }, { opacity: 1, offset: holdEnd }, { opacity: 0, offset: Math.min(0.95, holdEnd + 0.08) }, { opacity: 0 }], { duration: dur, fill: 'forwards' }, 'ease-out');
    }
    after(() => item.remove(), dur);
  }

  /* 全红 + 猪 / 羊 / ×2 同一轮：全红放到快收尾时接上猪 / 羊 / ×2（或对撞） */
  const COMBO_GAP = 2300;
  function playCombo(fx, w) {
    playFx(fx.all, w);
    schedule(() => playFx(fx.spec, w), COMBO_GAP);
  }

  // 一朵烟花：n 颗粒子从 (x, y) 炸开，往外飞、再带点下坠淡出
  // 一次「绽放」：主朵 + 一半概率再追一小朵（换个样式、偏开一点），每回都不一样
  function bloom(glyphs, colors, delay, radius, size, y0 = -30) {
    burst(0, y0, 30, glyphs, colors, delay, radius, { glow: 'none', spin: true, size });
    if (Math.random() < 0.5) {
      const side = Math.random() < 0.5 ? -1 : 1;
      burst(side * (60 + Math.random() * 60), -40 + Math.random() * 50, 14, glyphs, colors, delay + 260, radius * 0.6,
        { glow: 'none', spin: true, size: [size[0], size[1] * 0.75] });
    }
  }

  /* opts：glow 'gold' | 'red' | 'none'（中心晕光）；spin 允许旋转；size [最小, 最大] 字号 px。
   * colors 可以是数组（按顺序轮换）或函数 glyph → 颜色。
   * 粒子的姿态：大小拉开（少数很大），大部分接近正放；越大的越正、越稳，只有少数小的会大角度翻飞。
   * 2026-11-22 粒子改画在画布上（引擎 games-fx.js）：原来每粒一个 span + 一段 SVG + 一条动画，三张对撞那一场同步建三百多个元素；
   * 轨迹、大小分布、角度、每段缓动、晕光都照原来的逐项搬过去（GZ_SPARK），调用方式不变 */
  function burst(x, y, n, glyphs, colors, delay, radius, opts) {
    const o = Object.assign({ glow: 'gold', spin: false, size: [15, 28] }, opts);
    snd('pop', delay, n / 44);   // 每朵烟花「嘭」一下，跟着粒子数大小
    const fx = fxOf(els.fx), c = fxOrigin();
    if (o.glow !== 'none') fx.glow(c.x + x, c.y + y, { stops: o.glow === 'red' ? GLOW_RED : GLOW_GOLD, delay });
    const tints = [];
    for (let k = 0; k < n; k++) tints.push(typeof colors === 'function' ? colors(glyphs[k % glyphs.length]) : colors[k % colors.length]);
    // 绽放样式：每次随机一种（一整圈 / 内外两圈 / 螺旋 / 喷泉 / 随意散开），同一种动画每回看起来都不一样
    fx.burst(c.x + x, c.y + y, { n, shapes: glyphs.map(sparkShape), colors: tints, radius, size: o.size, delay, life: 1250, gravity: 40,
      spin: o.spin, pattern: o.pattern, profile: GZ_SPARK });
  }
  // 花色本色：黑桃草花墨黑、红桃方块朱红、星点金色
  const SUIT_TINT = (g) => (g === '♠' || g === '♣' ? '#1f1c18' : g === '♥' || g === '♦' ? '#b4392c' : '#c9a96e');

  // 本机调试：控制台里 __gzDebug.playFx({ kind: 'pig', sub: '下家 −100' }, 1) 单独放一段动画
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__gzDebug = { playFx, copyText, askConfirm, match: () => match, render: () => renderAll(), step: () => step(),
 solveSize: () => { solveSize(); if (match) renderHand(); }, showCoach: (m) => showCoach(m, () => hideCoach()),
 social: () => social,
 parts: () => [...fxLayers].flatMap((l) => {   // 画布粒子此刻的状态（换成视口坐标，逐帧比对用）
   const r = l.getBoundingClientRect(), k = l.offsetWidth ? r.width / l.offsetWidth : 1;
   return l._gfx.peek().map((q) => Object.assign(q, { x: r.left + q.x * k, y: r.top + q.y * k, s: q.s * k }));
 }) };   // __gzDebug.social().play({ kind: 'prop', from: 3, to: 0, prop: 'pig' })

  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ───── 新手教程：固定一副牌 + 三家「导演」出牌 + 按事件讲解（内容在 gongzhu-tutorial.js） ───── */

  let tut = null;   // { coach, saved: 教程前的那一盘（教完放回去）, firstRun }
  let coachNext = null, coachHideTimer = 0;
  let idleTimer = 0, suggestCard = -1;   // 教程里久不出牌：呼吸提示一张牌（或已选好时提示「出牌」）
  const IDLE_MS = 8000;

  function armIdle() {
    clearTimeout(idleTimer);
    clearSuggest();
    if (!match.tutorial) return;
    const my = token;
    idleTimer = setTimeout(() => {
      const r = match.round;
      if (my !== token || !r || busy || r.turn !== 0 || coachNext) return;
      if (selected >= 0) { els.play.classList.add('is-suggest'); return; }
      suggestCard = AI.countingPolicy(r, 0);
      renderHand();
    }, IDLE_MS);
  }
  function clearSuggest() {
    els.play.classList.remove('is-suggest');
    if (suggestCard >= 0) { suggestCard = -1; if (match && match.round) renderHand(); }
  }

  /* kind 'adv' = 进阶教程（明牌）：开局四家一起明牌（我点 ♥A 再点「明牌」，三家机器人跟着明），
   * 前几墩照剧本讲（第 4–6 墩只能出指定那张），讲完剩下的牌全部自动快进打完 */
  function startTutorial(firstRun, kind) {
    const adv = kind === 'adv';
    const short = !adv && GZTUT_PV && T.short ? T.short[GZTUT_PV.script] : null;   // 预览：压短的剧本（见 GZTUT_PV）
    const M = adv ? T.advanced : short || T;
    clearScene();
    if (social) social.clear();
    stopClock();
    setAutopilot(false);
    hideExposeTip();
    tut = { coach: M.createCoach(), saved: match && !match.tutorial ? match : (tut && tut.saved), firstRun: !!firstRun, adv, short, fast: false, introDone: false, exposeTalked: false };
    match = { tutorial: true, adv, rules: M.RULES, totals: [0, 0, 0, 0], roundNo: 1, pigTaker: -1, seed: 0, round: M.createRound(), exposing: adv ? [0] : [], last: null, over: false };
    exposePick = []; ov.held = [];
    exposeWait = adv ? { bots: Promise.resolve(M.EXPOSE) } : null;
    applySoloIdentity();
    selected = -1;
    busy = true;
    els.table.classList.add('is-tutorial');
    hideCoach();
    renderAll();
    schedule(step, 500);
  }

  // 新手教程学完：记下来；第一次学完的人先跟「入门」机器人打
  function finishBasicTutorial() {
    writeJSON(TUT_KEY, 1);
    if (tut && tut.firstRun) { settings.tier = 'easy'; writeJSON(SETTINGS_KEY, settings); }
    if (tut) tut.firstRun = false;
  }
  function endTutorial() {
    clearScene();
    clearTimeout(idleTimer);
    suggestCard = -1;
    els.play.classList.remove('is-suggest');
    if (tut && tut.adv) writeJSON(ADV_KEY, 1); else finishBasicTutorial();
    els.table.classList.remove('is-tutorial');
    hideCoach();
    const back = (tut && tut.saved) || loadSaved();
    tut = null;
    busy = false;
    selected = -1;
    if (back && !back.over && (back.round || back.last)) {
      match = back;
      if (!match.bots) match.bots = drawBots();
      applySoloIdentity();
      renderAll();
      if (match.round) step();
      else showSettlement();
      return;
    }
    newMatch();
    startRound();
  }

  // 教程打到一半回封面：收拾教程的样子，不记「学过了」，原来那一盘留在内存里（封面上点单机接着打）
  function quitTutorial() {
    clearScene();
    clearTimeout(idleTimer);
    suggestCard = -1;
    els.play.classList.remove('is-suggest');
    els.table.classList.remove('is-tutorial');
    hideCoach();
    match = (tut && tut.saved) || null;
    tut = null;
    selected = -1;
  }

  function tutStep() {
    const r = match.round;
    renderSeats();
    if (tut.adv) {
      // 明牌这一步：先讲一段（点继续），再让我点 ♥A、点「明牌」（提示贴在出牌处，不挡操作）
      if (match.exposing.length) {
        if (!tut.introDone) { tut.introDone = true; busy = true; renderHand(); coachSay(tut.coach.intro, tutStep); return; }
        busy = false; renderHand(); showCoach({ text: tut.coach.pick }, null);
        return;
      }
      if (!tut.exposeTalked) { tut.exposeTalked = true; busy = true; renderHand(); coachSay(tut.coach.afterExpose, tutStep); return; }
      // 讲完了：剩下的牌四家（包括我）都自动、快速地打完
      if (r.trickNo >= T.advanced.SCRIPTED) {
        tut.fast = true;
        hideCoach();
        busy = true;
        renderHand();
        const seat = r.turn;
        schedule(() => commit(seat, AI.countingPolicy(r, seat)), pace().aiMin);
        return;
      }
    }
    if (tut.short) {
      // 压短的剧本：开打前先说一段（乙：猪和羊）；打到收尾点就讲最后一句、按已经吃到的牌出结算
      if (!tut.introDone) { tut.introDone = true; if (tut.coach.intro.length) { busy = true; renderHand(); coachSay(tut.coach.intro, tutStep); return; } }
      if (tut.short.isDone(r)) { busy = true; renderHand(); coachSay(tut.coach.outro(r), finishShortTutorial); return; }
    }
    if (r.turn === 0) {
      busy = false;
      renderHand();
      const h = tut.coach.hint(r);
      if (h) showCoach({ text: h }, null);
      armIdle();
      return;
    }
    busy = true;
    renderHand();
    const seat = r.turn;
    schedule(() => commit(seat, (tut.adv ? T.advanced : tut.short || T).director(r, seat)), pace().aiMin);
  }

  // 压短的剧本收尾：剩下的牌不演了，按已经吃到的牌算这一局，出和原来一样的「学会了」结算（去向不变）
  function finishShortTutorial() {
    const r = match.round;
    const scores = R.roundScores(r);
    for (let s = 0; s < 4; s++) match.totals[s] += scores[s];
    match.last = { roundNo: 1, captured: r.captured.map((c) => c.slice()), scores, ctx: R.scoreCtx(r) };
    match.round = null;
    match.over = false;
    settleOnTable(() => { roundEndSound(scores[0]); showSettlement(); });
  }

  // 讲解一段段地说，每段点「继续」；说完回到 done
  function coachSay(msgs, done) {
    if (!msgs.length) { hideCoach(); done(); return; }
    showCoach(msgs[0], () => coachSay(msgs.slice(1), done));
  }

  // 讲解里的 {♠Q} 画成嵌在字里的真牌面（跟手牌完全同一套版式，只是缩小）
  const SUIT_OF_CHAR = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
  function cardHtml(c, cls) {
    const el = buildCard(c);
    el.classList.add('gz-handlike', cls);
    return el.outerHTML;
  }
  function inlineCards(text) {
    return text.replace(/\{([♠♥♦♣])([0-9JQKA]+)\}/g, (_, su, rk) => cardHtml(SUIT_OF_CHAR[su] * 13 + R.RANK_LABELS.indexOf(rk), 'gz-inline'));
  }
  // 一笔由细到粗、尾巴淡出的金色箭杆，箭头是两道弧
  const ARROW = '<div class="gz-rank-arrow"><span>小</span><svg viewBox="0 0 240 16" preserveAspectRatio="none" aria-hidden="true">' +
    '<defs><linearGradient id="gzArrowG" x1="0" x2="1"><stop offset="0" stop-color="#c9a96e" stop-opacity="0"/><stop offset=".35" stop-color="#c9a96e" stop-opacity=".7"/><stop offset="1" stop-color="#a8843e"/></linearGradient></defs>' +
    '<path d="M2 8 222 6.4Q228 8 222 9.6Z" fill="url(#gzArrowG)"/><path d="M214 1.5Q224 6 237 8Q224 10 214 14.5Q222 8 214 1.5Z" fill="#a8843e"/></svg><span>大</span></div>';
  // 牌的大小：每种花色各一排真牌 2…A，底下一支从小指到大的箭头
  function rankChart() {
    const rows = [0, 1, 3, 2].map((su) => '<div class="gz-rank-row">' +
      R.RANK_LABELS.map((_, rk) => cardHtml(su * 13 + rk, 'gz-rank-card')).join('') + '</div>').join('');
    return '<div class="gz-ranks">' + rows + ARROW + '</div>';
  }

  // 这一轮四家出的牌：按出牌顺序排开，下面写是谁；首出、垫牌、最大的那张各有标记
  function trickRow(t, mark) {
    const lead = R.suitOf(t.plays[0].card);
    return '<div class="gz-trickrow">' + t.plays.map((p, k) => {
      const tag = mark && p.seat === t.winner ? '最大' : k === 0 ? '首出' : R.suitOf(p.card) !== lead ? '垫牌' : '';
      const cls = (mark && p.seat === t.winner ? ' is-win' : '') + (R.suitOf(p.card) !== lead ? ' is-off' : '');
      return '<span class="gz-tr-cell' + cls + '">' + cardHtml(p.card, 'gz-tr-card') +
        '<span class="gz-tr-name">' + (p.seat === 0 ? '你' : NAMES[p.seat]) + '</span><span class="gz-tr-tag">' + tag + '</span></span>';
    }).join('') + '</div>';
  }
  // 红桃扣分：2…A 一排，每张下面写扣几分，底下一支从小到大的箭头
  function heartChart() {
    const cells = R.RANK_LABELS.map((_, rk) => {
      const c = R.HEART * 13 + rk;
      return '<span class="gz-hc-cell">' + cardHtml(c, 'gz-rank-card') + '<span class="gz-num neg">' + signed(R.heartValue(c, match.rules)) + '</span></span>';
    }).join('');
    return '<div class="gz-ranks"><div class="gz-rank-row gz-hc-row">' + cells + '</div>' + ARROW + '</div>';
  }
  // 全红：13 张红桃、每张下面写扣几分；一道黑线从左往右把负分全部划掉，然后浮出一个大大的 +200
  function allHeartsRow() {
    const cells = R.RANK_LABELS.map((_, rk) => {
      const c = R.HEART * 13 + rk;
      return '<span class="gz-hc-cell">' + cardHtml(c, 'gz-rank-card') + '<span class="gz-num neg">' + signed(R.heartValue(c, match.rules)) + '</span></span>';
    }).join('');
    return '<div class="gz-allhearts"><div class="gz-rank-row gz-hc-row">' + cells + '<span class="gz-strike" aria-hidden="true"></span></div>' +
      '<span class="gz-ah-total gz-num">+200</span></div>';
  }

  function showCoach(msg, onNext) {
    const c = els.coach;
    c.querySelector('.gz-coach-text').innerHTML = textSuits(inlineCards(msg.text));
    const parts = c.querySelector('.gz-coach-parts');
    parts.innerHTML = msg.ranks ? rankChart() : msg.trick ? trickRow(msg.trick, msg.mark) : msg.heartChart ? heartChart() : msg.allHearts ? allHeartsRow() : '';
    if (msg.parts) {
      let sum = 0;
      for (const p of msg.parts) {
        sum += p.value;
        const cell = document.createElement('span');
        cell.className = 'gz-part';
        const m = buildCard(p.card);
        m.classList.add('gz-handlike');
        const v = document.createElement('span');
        v.className = 'gz-num neg';
        v.textContent = signed(p.value);
        cell.append(m, v);
        parts.appendChild(cell);
      }
      const eq = document.createElement('span');
      eq.className = 'gz-part-sum gz-num neg';
      eq.textContent = '= ' + signed(sum);
      parts.appendChild(eq);
    }
    // 讲到吃牌区时把那一家的吃牌区点亮：先放大再缩回，然后金边慢慢呼吸
    els.seats.forEach((seat, k) => seat.querySelector('.gz-caps').classList.toggle('is-focus', msg.focus === k));
    // 说（等点继续）居中大字；提示（等我出牌）落在我出牌的位置
    coachNext = onNext || null;
    c.classList.toggle('is-say', !!onNext);
    c.classList.toggle('is-hint', !onNext);
    c.classList.remove('pulse');
    clearTimeout(coachHideTimer);
    if (c.hidden) { c.hidden = false; void c.offsetWidth; }
    c.classList.add('on');
  }
  function hideCoach() {
    coachNext = null;
    els.seats.forEach((seat) => seat.querySelector('.gz-caps').classList.remove('is-focus'));
    const c = els.coach;
    c.classList.remove('on');
    clearTimeout(coachHideTimer);
    coachHideTimer = setTimeout(() => { if (!c.classList.contains('on')) c.hidden = true; }, 240);
  }
  // 点任意处 / 空格 / 回车：往下讲
  function coachAdvance() {
    const f = coachNext;
    if (!f) return false;
    coachNext = null;
    f();
    return true;
  }

  /* ───── 实战引导（预览中，GZTUT_PV 开着才有；2026-11-22 对照百变小咪审查 D5） ─────
   * 新手教程不再讲的东西，实战里第一次碰到时讲一句，每样只讲一次（记在 gz.guide.v1）：
   *   手里第一次有猪 / 羊 / 变压器；第一次轮到我可以明牌（替掉旧的「第一次碰到明牌？」小提示）；第一次有别家明牌；
   *   第一次有红桃被收走；第一次有人红桃快收齐（全红的苗头）；第一次看结算表。
   * 不打断牌局：只盖一层、不拦操作（点哪儿都照常生效，顺带算看过）；桌上一有事要我表态（明牌、弹窗）就自己收起、不算看过，下次安静时再讲。
   * 两种呈现（?gztut=…,guide-a|guide-b）：甲 桌子中间把那张牌放大亮一下配一句；乙 就在手牌 / 明牌 / 吃牌区原位发金光，旁边一个小气泡。 */
  function guideLoad() {
    if (guideSet) return guideSet;
    let raw = null;
    try { raw = localStorage.getItem(GUIDE_KEY); } catch (_) { /* 无痕 */ }
    try { guideSet = new Set(raw ? JSON.parse(raw) : []); } catch (_) { guideSet = new Set(); }
    return guideSet;
  }
  const guideSeen = (k) => guideLoad().has(k);
  function guideMark(k) { guideLoad().add(k); try { localStorage.setItem(GUIDE_KEY, JSON.stringify([...guideSet])); } catch (_) { /* 无痕 */ } }
  const whoCn = (s) => (s === 0 ? '你' : NAMES[s]);

  // 现在该讲哪一样：{ key, text, cards, at: 'hand' | 'shown' | 'caps' | 'settle', seat }
  function guideNext() {
    const r = match.round;
    if (!r) return null;
    const hand = r.hands[0];
    if (match.exposing.length) {
      const mine = R.EXPOSABLE.filter((c) => hand.includes(c));
      if (match.exposing.includes(0) && mine.length && !guideSeen('expose-me')) return { key: 'expose-me', at: 'hand', cards: mine, text: '开打前可以把' + (mine.length > 1 ? '这几张' : '它') + '明出来：大家都看得见，效果翻倍。不想明就点「不明牌」。' };
      return null;
    }
    const other = r.exposed.find(([c, o]) => o !== 0 && r.hands[o].includes(c));
    if (other && !guideSeen('exposed')) {
      const c = other[0];
      const eff = c === R.PIG ? '谁收下猪 −200' : c === R.SHEEP ? '谁收下羊 +200' : c === R.DOUBLER ? '谁收下它，这一局的分 ×4' : '这一局红桃的扣分全部翻倍';
      return { key: 'exposed', at: 'shown', seat: other[1], cards: [c], text: NAMES[other[1]] + '明了这张牌：' + eff + '。' };
    }
    const ONE = [['pig', R.PIG, '猪：谁收下它 −100。能躲就躲，没这门花色时可以把它垫出去。'], ['sheep', R.SHEEP, '羊：谁收下它 +100。'],
      ['dbl', R.DOUBLER, '变压器：谁收下它，这一局的分翻倍——好的更好，坏的更坏。']];
    for (const [k, c, t] of ONE) if (hand.includes(c) && !guideSeen(k)) return { key: k, at: 'hand', cards: [c], text: t };
    const hs = r.captured.map((cs) => cs.filter(R.isHeart).sort((a, b) => R.rankOf(b) - R.rankOf(a)));
    const has = [0, 1, 2, 3].filter((s) => hs[s].length);
    if (has.length && !guideSeen('hearts')) {
      const flat = R.heartValue(R.HEART * 13 + 12, match.rules) === R.heartValue(R.HEART * 13, match.rules);
      return { key: 'hearts', at: 'caps', seat: has[0], cards: hs[has[0]].slice(0, 1), text: '红桃都扣分' + (flat ? '' : '，牌越大扣得越多') + '。' };
    }
    if (has.length === 1 && hs[has[0]].length >= 8 && !guideSeen('allred')) {
      const all = R.scoreCaptured(Array.from({ length: 13 }, (_, i) => R.HEART * 13 + i), R.scoreCtx(r)).heartScore;
      if (all > 0) return { key: 'allred', at: 'caps', seat: has[0], cards: hs[has[0]].slice(0, 3), text: whoCn(has[0]) + '已经收了 ' + hs[has[0]].length + ' 张红桃。收齐 13 张，红桃反而一共 +' + all + '，叫「全红」。' };
    }
    return null;
  }
  // 桌上安静时看看有没有要讲的（step 里每一手调一次）；到了要我表态的时候（明牌）先把别的收起来
  function guideCheck() {
    if (!GZTUT_PV || !match || match.tutorial || match.online || match.demo || match.lobby || AUTO || ov.deal) return;
    const item = guideNext();
    if (guideCur && match.exposing.length && guideCur.key !== 'expose-me') guideHide(false);
    if (guideCur || !els.mask.hidden || !item) return;
    if (els.center.classList.contains('is-fxing')) return;   // 桌心正放吃猪 / 吃羊的印章，别抢镜（放完 setFxing 会再叫一次）
    guideShow(item);
  }
  function guideTargets(g) {
    if (g.at === 'hand') return [...els.hand.querySelectorAll('.gz-card')].filter((x) => g.cards.includes(+x.dataset.card));
    if (g.at === 'shown') return [...els.seats[g.seat].querySelectorAll('.gz-shown .gz-card')].filter((x) => g.cards.includes(+x.dataset.card));
    if (g.at === 'caps') return [els.seats[g.seat].querySelector('.gz-caps')].filter(Boolean);
    if (g.at === 'settle') {   // 指着一行吃到了分牌的（先看自己那行）
      const rows = [...els.dialog.querySelectorAll('.gz-res-row[data-seat]')];
      const row = rows.find((x) => x.classList.contains('me') && x.querySelector('.gz-res-caps .gz-card')) || rows.find((x) => x.querySelector('.gz-res-caps .gz-card')) || rows[0];
      return row ? [row] : [];
    }
    return [];
  }
  function guideShow(item) {
    const ver = GZTUT_PV.guide;
    const el = document.createElement('div');
    el.className = 'gz-guide is-' + ver + (item.at === 'settle' ? ' on-dialog' : '');
    el.setAttribute('aria-live', 'polite');
    const cards = (item.cards || []).map((c) => cardHtml(c, 'gz-guide-card')).join('');
    el.innerHTML = ver === 'a'
      ? (cards ? '<div class="gz-guide-cards">' + cards + '</div>' : '') + '<p>' + textSuits(item.text) + '</p>'
      : '<p>' + textSuits(item.text) + '</p><i class="gz-guide-tail" aria-hidden="true"></i>';
    els.app.appendChild(el);
    guideCur = Object.assign({ el, glow: [] }, item);
    snd('bubble');
    guidePlace();
    // 手牌 / 座位会整块重画：重画后把金光和气泡位置补回来
    guideCur.mo = new MutationObserver(() => guidePlace());
    [els.hand, ...els.seats].forEach((x) => guideCur.mo.observe(x, { childList: true, subtree: true }));
  }
  function guidePlace() {
    const g = guideCur;
    if (!g) return;
    const tg = guideTargets(g);
    g.glow.forEach((x) => { if (!tg.includes(x)) x.classList.remove('gz-guide-glow'); });
    tg.forEach((x) => x.classList.add('gz-guide-glow'));
    g.glow = tg;
    const el = g.el, W = window.innerWidth, H = window.innerHeight;
    if (el.classList.contains('is-a')) {
      // 甲：桌子正中；结算时浮在结算框上沿外面（不挡住要讲的那几行），上面放不下就压住框的顶边
      const box = (g.at === 'settle' ? els.dialog : els.center).getBoundingClientRect();
      el.style.left = (box.left + box.width / 2) + 'px';
      el.style.top = (g.at === 'settle' ? Math.max(8 + el.offsetHeight / 2, box.top - 10 - el.offsetHeight / 2) : box.top + box.height / 2) + 'px';
      return;
    }
    // 乙：贴着发光的那几样，放在上方（放不下就放下方），左右夹在屏幕里
    if (!tg.length) { el.style.left = W / 2 + 'px'; el.style.top = H / 2 + 'px'; return; }
    const rs = tg.map((x) => x.getBoundingClientRect());
    const L = Math.min(...rs.map((q) => q.left)), R2 = Math.max(...rs.map((q) => q.right));
    let T2 = Math.min(...rs.map((q) => q.top));
    const B2 = Math.max(...rs.map((q) => q.bottom));
    // 手牌：气泡放到出牌 / 明牌那排键的上面，别挡住键
    const band = g.at === 'hand' && els.play.closest('.gz-band');
    if (band) { const bb = band.getBoundingClientRect(); if (bb.height) T2 = Math.min(T2, bb.top); }
    const bw = el.offsetWidth, bh = el.offsetHeight, cx = (L + R2) / 2;
    const up = T2 - bh - 14 > 8 && (T2 + B2) / 2 > H * 0.4;   // 上半屏的（别家的明牌、吃牌区）气泡放下面，不挡头像
    const x = Math.max(8 + bw / 2, Math.min(W - 8 - bw / 2, cx));
    el.style.left = x + 'px';
    el.style.top = (up ? T2 - 12 - bh / 2 : B2 + 12 + bh / 2) + 'px';
    el.classList.toggle('is-below', !up);
    el.style.setProperty('--tail', Math.max(14, Math.min(bw - 14, cx - (x - bw / 2))) + 'px');
  }
  // seen：点过（看过了）才记下；被要我表态的事挤掉的不记，下次安静时再讲
  function guideHide(seen) {
    const g = guideCur;
    if (!g) return;
    guideCur = null;
    if (g.mo) g.mo.disconnect();
    g.glow.forEach((x) => x.classList.remove('gz-guide-glow'));
    if (seen) guideMark(g.key);
    g.el.classList.add('is-out');
    setTimeout(() => g.el.remove(), 220);
  }
  // 点任意处：照常生效（选牌、出牌、按钮都不拦），引导顺带收起、算看过
  document.addEventListener('pointerdown', () => { if (guideCur) guideHide(true); }, true);
  document.addEventListener('keydown', (e) => { if (guideCur && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) guideHide(true); }, true);
  window.addEventListener('resize', () => guidePlace());

  /* ───── 第一次点「单机」：直接开 / 跟我学（预览中，?gztut=…,first-a|first-b） ─────
   * 甲：弹层，上面封面那只猪，下面两张「牌」当按钮（一叠牌 / 翻开的书，后者发暖金光），不写说明句；
   * 乙：从「单机」键上方冒出一张小卡，两个圆形图标键，点卡外面收起（这次不算问过）。
   * 正式上线时只问从没学过教程的人；预览里谁都问（问过一次记在 gz.firstask.pv，?gztut=…,reset 可以再看） */
  const FIRST_ICONS = {
    go: '<path d="M7.5 5.5h7.2a1.3 1.3 0 0 1 1.3 1.3v11.9a1.3 1.3 0 0 1-1.3 1.3H7.5a1.3 1.3 0 0 1-1.3-1.3V6.8a1.3 1.3 0 0 1 1.3-1.3Z"/><path d="M16 7.6l1.9.5a1.3 1.3 0 0 1 .9 1.6l-2.8 10.4"/><path d="M11.1 10.3 12.6 12.6 11.1 14.9 9.6 12.6Z"/>',
    learn: MENU_ICONS.tutorial,
  };
  let firstPop = null;
  function firstAsk(btn) {
    if (!GZTUT_PV || readJSON(FIRST_PV_KEY)) return false;
    const go = () => { writeJSON(FIRST_PV_KEY, 1); if (!(coverUi && coverUi.click('solo', btn))) playSolo(soloBots() ? match : loadSaved()); };
    const learn = () => { writeJSON(FIRST_PV_KEY, 1); hideCover(); startTutorial(!readJSON(TUT_KEY)); };
    const icon = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + FIRST_ICONS[k] + '</svg>';
    if (GZTUT_PV.first === 'a') {
      openDialog('<div class="gz-first-art">' + ART.pig + '</div><div class="gz-first-cards">' +
        '<button type="button" class="gz-first-card" data-first="go"><span class="pic">' + icon('go') + '</span><b>直接开</b></button>' +
        '<button type="button" class="gz-first-card is-learn" data-first="learn" data-autofocus><span class="pic">' + icon('learn') + '</span><b>跟我学</b></button></div>',
      (d) => {
        d.classList.add('is-first');
        d.querySelector('[data-first="go"]').addEventListener('click', () => { closeDialog(); go(); });
        d.querySelector('[data-first="learn"]').addEventListener('click', () => { closeDialog(); learn(); });
      });
      return true;
    }
    if (firstPop) firstPop.remove();
    const pop = firstPop = document.createElement('div');
    pop.className = 'gz-first-pop';
    pop.innerHTML = '<button type="button" data-first="go"><span class="pic">' + icon('go') + '</span><b>直接开</b></button>' +
      '<button type="button" class="is-learn" data-first="learn"><span class="pic">' + icon('learn') + '</span><b>跟我学</b></button><i class="gz-guide-tail" aria-hidden="true"></i>';
    els.app.appendChild(pop);
    const b = btn.getBoundingClientRect();
    pop.style.left = Math.max(8 + pop.offsetWidth / 2, Math.min(window.innerWidth - 8 - pop.offsetWidth / 2, b.left + b.width / 2)) + 'px';
    pop.style.top = (b.top - 12) + 'px';
    const close = () => { pop.remove(); if (firstPop === pop) firstPop = null; document.removeEventListener('pointerdown', outside, true); };
    const outside = (e) => { if (!pop.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
    pop.querySelector('[data-first="go"]').addEventListener('click', () => { close(); go(); });
    pop.querySelector('[data-first="learn"]').addEventListener('click', () => { close(); learn(); });
    pop.querySelector('[data-first="learn"]').focus({ preventScroll: true });
    return true;
  }

  /* ───── 联机 ─────
   * 服务器说了算（backends/urge/api/gongzhu.js）：发牌、校验、机器人、超时代打都在服务器上。
   * 这边只做三件事：长轮询拿房间视图；把视图里的事件日志（发牌 / 亮牌 / 出牌 / 收牌 / 结算）按顺序播成和单机一样的动画；
   * 把我的操作（出牌 / 亮牌 / 下一局 / 大厅设置）发出去。
   * 座位换算：服务器座位 0..3 → 我这边的位置（我永远在下方 0，下家 1、对家 2、上家 3）。
   * 别家的手牌只知道张数：镜像局面里用 HIDDEN 占位，亮出的牌按真牌放进去；轮到他出某张时把一个占位换成那张再交给规则引擎。
   * 播完事件后和快照对一遍（手牌 / 轮到谁 / 第几轮），对不上就按快照直接重画——断线、漏消息都靠这个自愈。 */

  const NET = window.GongzhuNet || null;
  let online = null;   // { code, token, st, mySeat, applied, queue, pending, idle, inGame, readySent, skew, stopped }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
  const srv = (l) => (l + online.mySeat) % 4;
  const loc = (s) => (s - online.mySeat + 4) % 4;
  const rot = (arr) => [0, 1, 2, 3].map((l) => arr[srv(l)]);
  function playerAt(s) { return online && online.st ? online.st.players.find((p) => p.seat === s) || null : null; }
  function isHost() { return !!(online && online.st && online.st.hostId === online.st.me); }
  function onlineAuto() { const g = online && online.st && online.st.game; return !!(g && !online.watching && g.auto[online.mySeat]); }
  /* 观战：没有座位，牌桌固定从 0 号座看过去（mySeat 记成 0 只为了转座位方向）；看不到任何手牌、不能出牌 */
  function watching() { return !!(online && online.watching && match && match.online); }
  // 我有没有打开「观战能看我的牌」（默认不给看）
  function meRevealing() { const st = online && online.st; const me = st && st.players.find((p) => p.id === st.me); return !!(me && me.showHand); }
  /* 头像：联机里每人有服务器分的矢量头像（见 gongzhu-avatars.js），记作 'svg:<编号>'；
   * 单机的「我 / 上 / 对 / 下」、老房间没头像的人仍是一个字 */
  function avatarOf(p) {
    if (!p) return '+';
    if (p.avatar && window.GongzhuAvatars && GongzhuAvatars.byId[p.avatar]) return 'svg:' + p.avatar;
    return [...String(p.nick)][0] || '?';
  }
  function seatIsBot(l) {
    const p = playerAt(srv(l));
    const g = online.st.game;
    return !p || p.isAi || p.left || !!(g && g.auto[srv(l)]);
  }

  function toast(text) {
    let el = $('gzToast');
    if (!el) { el = document.createElement('div'); el.id = 'gzToast'; el.className = 'gz-toast'; el.setAttribute('role', 'status'); els.app.appendChild(el); }
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ───── 牌桌互动：点别家头像扔道具、顶栏「说一句」（画和动画在 gongzhu-social.js）─────
   * 单机：纯本机，机器人挨了打有时回一句、偶尔扔回来（模块里定）。
   * 联机：我发的先在本机画，同时 POST emote；别人发的、服务器替机器人回的，跟着长轮询一起来（fx 序号），见 onFx。
   * 观战的人只看不发（点头像仍是换视角）；教程、动画预览、大厅里不出。屏蔽只记在这一次打开的页面里。 */
  const mutedIds = new Set();
  function socialOk() {
    if (!match || match.tutorial || match.demo || match.lobby) return false;
    // 联机：服务器回过互动序号（fxSeq）才算支持——后端没更新时不露出聊天键，免得发了别人看不到
    if (match.online) return !!(online && online.inGame && !online.watching && online.fxSeq != null);
    return true;
  }
  function syncSocialUi() {
    const ok = !!social && socialOk();
    const btn = $('gzChatBtn');
    if (btn) btn.hidden = !ok || chatInMenu();
    els.app.classList.toggle('can-social', ok);
    if (!ok && social) social.close();
  }
  function socialPlayer(l) { return match && match.online && online && online.st ? playerAt(srv(l)) : null; }
  function initSocial() {
    if (!window.GongzhuSocial) return;
    social = GongzhuSocial.create({
      root: els.app,
      avatar: (l) => (els.seats[l] ? els.seats[l].querySelector('.gz-avatar') : null),
      name: (l) => NAMES[l],
      canSend: socialOk,
      send(ev) {
        if (!match || !match.online || !online) return;
        const body = ev.kind === 'prop' ? { to: srv(ev.to), prop: ev.prop } : { text: ev.text };
        NET.act(online.code, online.token, 'emote', body).catch((e) => { if (e && e.status === 429) toast('慢一点，歇一下再发'); });
      },
      autoBots: () => !!(match && !match.online),
      isBot: (l) => (match && match.online ? !!online && seatIsBot(l) : l > 0),
      mutable: (l) => { const p = socialPlayer(l); return !!(p && !p.isAi); },
      muted: (l) => { const p = socialPlayer(l); return !!(p && mutedIds.has(p.id)); },
      setMuted(l, on) {
        const p = socialPlayer(l);
        if (!p) return;
        if (on) mutedIds.add(p.id); else mutedIds.delete(p.id);
        toast(on ? '已屏蔽' + p.nick + '的互动' : '不再屏蔽' + p.nick);
      },
      // 房主点一个真人：底下多一排（托管 / 禁言 / 请离），预览中（?gzhost=），见 gongzhu-host-pv.js
      extraTitle: (l) => (hostPv ? hostPv.extraTitle(l) : ''),
      extra: (l) => (hostPv ? hostPv.extra(l) : []),
      sfx: (name, delay) => snd(name, delay),
      reduce: reduceMotion,
    });
  }
  /* 长轮询带回来的互动：第一次只记下序号（不重放进房间前的）；我自己发的本机已经画过了 */
  function onFx(my, res) {
    const first = my.fxSeq == null;
    if (!first && res.fxSeq <= my.fxSeq) return;
    my.fxSeq = res.fxSeq;
    if (first) syncSocialUi();
    if (first || !social || !Array.isArray(res.fx) || !match || !match.online || match.lobby || !my.inGame) return;
    for (const e of res.fx) {
      if (!e || (!my.watching && e.from === my.mySeat)) continue;
      const from = loc(e.from);
      const ev = e.t === 'p' ? { kind: 'prop', from, to: loc(e.to), prop: e.prop } : { kind: 'chat', from, text: e.text };
      social.play(ev, { echo: true, delay: e.delay || 0 });
    }
  }

  /* 预览模块（?gzhost=）：按需加载，拿到的是一组读状态 / 发动作 / 画弹框的接口，不直接碰这里的变量 */
  function loadHostPv() {
    const v = '?v=' + (window.GZ_BUILD || VERSION);
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/assets/css/gongzhu-host-pv.css' + v;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = '/assets/js/games/gongzhu-host-pv.js' + v;
    js.onload = () => {
      if (!window.GongzhuHostPv) return;
      hostPv = GongzhuHostPv.create(GZHOST, {
        $, els, esc, faceHtml, avatarOf, toast, askConfirm, openDialog, closeDialog, snd,
        online: () => online, match: () => match, isHost, playerAt, srv, loc,
        act: (action, body) => onlineAct(action, body),
        lobbyOp, hostStart, tierLabels: TIER_LABELS, tierOrder: TIER_ORDER,
        names: () => NAMES,
        redraw: () => { if (!online || !online.st) return; if (online.st.phase === 'lobby') renderLobby(); else renderOnlineBadges(); },
      });
      if (online && online.st) { hostPv.onState(online.st); if (online.st.phase === 'lobby') hostPv.lobby(online.st); else renderOnlineBadges(); }
    };
    document.head.appendChild(js);
  }

  function loadRimPv() {
    const v = '?v=' + (window.GZ_BUILD || VERSION);
    if (!document.querySelector('link[rel="stylesheet"][href*="gongzhu-rim-pv.css"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = '/assets/css/gongzhu-rim-pv.css' + v;
      document.head.appendChild(css);
    }
    const js = document.createElement('script');
    js.src = '/assets/js/games/gongzhu-rim-pv.js' + v;
    js.onload = () => {
      if (!window.GongzhuRimPv) return;
      rimPv = GongzhuRimPv.create(GZRIM, { $, els, online: () => online, match: () => match, playerAt, srv });
      if (online && online.st && online.st.phase === 'lobby') rimPv.lobby(online.st);
      rimPv.sync();
    };
    document.head.appendChild(js);
  }

  /* 进入联机：先停掉单机这一盘（存档还在，离开房间时接着打） */
  function startOnline(st, tok, joined) {
    if (match && !match.online && !match.tutorial) save();
    token++;
    if (social) social.clear();
    stopClock(); hideCoach(); closeDialog(); hideCover();
    $('gzPauseBtn').hidden = true;
    setAutopilot(false);
    online = { code: st.code, token: tok, st: null, mySeat: st.mySeat, watching: false, watchSeat: st.spectator ? st.viewSeat | 0 : 0, viewPending: -1, applied: 0, queue: [], pending: -1, idle: true, inGame: false, readySent: false, skew: 0, stopped: false, joinRules: !!joined, seenCfg: null, sheetBase: null, base: null, ops: [], pumping: false, roundCaps: loadRoundCaps(st.code, tok) };
    NET.writeSession({ code: st.code, token: tok });
    try { const u = new URL(location.href); u.searchParams.set('room', st.code); history.replaceState(null, '', u); } catch (_) { /* ignore */ }
    els.app.classList.add('is-online');
    onState(st);
    pollLoop(online);
  }

  function leaveOnline(msg, sendLeave, then) {
    const my = online;
    if (!my) return;
    stopCountdown();
    if (sendLeave) NET.act(my.code, my.token, 'leave', {}).catch(() => {});
    my.stopped = true;
    online = null;
    if (social) social.clear();
    NET.writeSession(null);
    try { const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u); } catch (_) { /* ignore */ }
    token++;
    stopClock(); closeDialog();
    busy = false; selected = -1; exposePick = []; ov.trick = null;
    els.app.classList.remove('is-online', 'is-lobby', 'is-watching');
    if (hostPv) hostPv.reset();
    renderWatchUi();
    $('gzLobby').hidden = true;
    match = null;   // 单机那一盘进房间前已存档，封面上点「单机」接着打
    applySoloIdentity();
    els.hand.innerHTML = '';
    els.slots.forEach((x) => { x.innerHTML = ''; });
    if (then) then(); else showCover(msg);
  }

  /* 房主点「开始」时房间里只有自己 + 机器人：牌局开始后没人进得来（中途只能补「已离开」的真人座位），这就是单机。
   * 悄悄换成本机单机打（能暂停、断网也能打），不另外提示；房间随之解散。
   * 规则、出牌限时、三个机器人的名字 / 头像 / 水平原样带过来。（这一盘会顶掉原来没打完的单机存档） */
  // 只剩我 + 三个机器人时，换成本机单机要用的这一盘（还没被服务器确认的机器人也算：名字 / 头像在这里补一个）
  function soloPlan() {
    const st = online && online.st;
    if (!st || !isHost() || st.players.some((p) => !p.isAi && p.id !== st.me && !p.left)) return null;
    const bots = [1, 2, 3].map((l) => playerAt(srv(l)));
    if (bots.some((p) => !p || !p.isAi)) return null;
    const A = window.GongzhuAvatars;
    const used = bots.map((p) => p.nick), faces = bots.map((p) => p.avatar);
    const pick = (pool, taken) => { const free = pool.filter((x) => !taken.includes(x)); const from = free.length ? free : pool; return from[(Math.random() * from.length) | 0]; };
    return {
      rules: R.normalizeRules(st.config.rules), totals: [0, 0, 0, 0], roundNo: 0, pigTaker: -1, seed: (Math.random() * 2 ** 31) | 0,
      round: null, exposing: [], last: null, over: false, turnSec: st.config.turnSec | 0,
      bots: bots.map((p) => {
        const P = A ? tierPool(TIER_LABELS[p.aiLevel] ? p.aiLevel : settings.tier) : null;   // 还没被服务器确认的机器人：按它的档位起名
        const nick = p.pending && A ? pick(P.nicks, used) : p.nick;
        const avatar = A && A.byId[p.avatar] && !p.pending ? p.avatar : A ? pick(P.faces, faces) : 'bot-navy';
        used.push(nick); faces.push(avatar);
        return { nick, avatar, tier: TIER_LABELS[p.aiLevel] ? p.aiLevel : settings.tier };
      }),
    };
  }

  /* ───── 房主点「开始」：3、2、1 ─────
   * 不管机器人有没有被服务器确认，点了就倒数 3 秒——这 3 秒正好给后端把排着的操作和开局做完，画面上一点就有反应。
   *  · 只有机器人：数完直接在本机按单机开（不等服务器），房间解散
   *  · 有别人：「开始」排在机器人后面发出去；服务器先开了也先不切画面，数完再进牌局
   *  · 数完服务器还没开局：写「正在开局…」接着等；开局被拒（比如有人刚走）→ 收起、留在大厅并提示；
   *    15 秒还没回音 → 收起、留在大厅提示网络慢（服务器那边要是其实开了，状态一到会自己进牌局） */
  let countdown = null;   // { t, done: 数完了在等服务器 }
  function countdownEl() {
    let el = $('gzCountdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gzCountdown';
      el.className = 'gz-countdown';
      el.setAttribute('aria-live', 'assertive');
      el.innerHTML = '<b></b><p></p>';
      els.app.appendChild(el);
    }
    return el;
  }
  function stopCountdown() {
    if (!countdown) return;
    clearTimeout(countdown.t);
    countdown = null;
    countdownEl().hidden = true;
  }
  function hostStart() {
    if (countdown || !online) return;
    const my = online;
    const el = countdownEl();
    const num = el.querySelector('b'), note = el.querySelector('p');
    note.textContent = '';
    el.hidden = false;
    countdown = { t: 0, done: false, sent: false };
    // 有别人在：开始现在就排进队（机器人确认完立刻发），数字数完时服务器多半已经开好了
    if (!soloPlan()) { lobbyOp('start'); countdown.sent = true; }
    let n = 3;
    const tick = () => {
      if (online !== my || !countdown) return;
      if (n > 0) {
        num.textContent = n;
        num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
        snd('tick');
        n--;
        countdown.t = setTimeout(tick, 1000);
        return;
      }
      // 数完：只剩机器人 → 本机单机；（倒数时有人进来了就改走联机开局）
      const plan = countdown.sent ? null : soloPlan();
      if (plan) {
        my.ops = [];
        stopCountdown();
        leaveOnline(null, true, () => playSolo(plan));
        return;
      }
      if (!countdown.sent) { lobbyOp('start'); countdown.sent = true; }
      if (online.base && online.base.phase !== 'lobby') { stopCountdown(); onState(online.base, true); return; }
      countdown.done = true;
      num.textContent = '';
      note.textContent = '正在开局…';
      countdown.t = setTimeout(() => { stopCountdown(); toast('开局没有回音，网络可能慢，再点一次「开始」试试'); }, 15000);
    };
    tick();
  }

  /* 长轮询卡住了怎么办（2026-11-22 照百变小咪）：每条长轮询记下发出的时间，用 AbortController 发；
   * 连接探测（ping，每 3 秒一次，页面在前台时）顺便问服务器房间进度 v：服务器已经比我新、这条却还挂着 = 卡住了 → 丢掉重发；
   * 挂得比服务器最长等待（20 秒）还久也丢。丢掉的那条卡了多久，下一条报给服务器记日志。
   * ping 也量来回、对时（比长轮询回来的 serverNow 准：长轮询回程不定）。老后端没有 ping：只剩「挂太久就丢」这一条 */
  const POLL_GIVEUP_MS = 26000, STALL_MIN_MS = 2500, PING_MS = 3000;
  function pollStalled(my, v) {
    const pr = my.pollReq;
    if (!pr || pr.ctl.signal.aborted) return;
    const age = performance.now() - pr.t0;
    if ((v != null && v > pr.since && age > STALL_MIN_MS) || age > POLL_GIVEUP_MS) { my.stallMs = age; pr.ctl.abort(); }
  }
  async function pingLoop(my) {
    while (online === my && !my.stopped) {
      await new Promise((r) => setTimeout(r, PING_MS));
      if (online !== my || my.stopped) return;
      if (document.hidden || my.noPing) { pollStalled(my, null); continue; }
      const t0 = performance.now();
      const j = await NET.ping(my.code);
      if (online !== my) return;
      if (j === false) my.noPing = true;   // 老后端：不再问（免得控制台一排 400），只剩「挂太久就丢」
      if (j) {
        const ms = performance.now() - t0;
        if (ms < 3000) my.pingSkew = j.serverNow + ms / 2 - Date.now();   // 对时：服务器时间 + 半个来回
        pollStalled(my, j.v);
      } else pollStalled(my, null);
    }
  }
  async function pollLoop(my) {
    let fails = 0;
    pingLoop(my);
    while (online === my && !my.stopped) {
      const ctl = new AbortController(), since = my.st ? my.st.version : 0;
      my.pollReq = { ctl, t0: performance.now(), since };
      const stall = my.stallMs || 0;
      my.stallMs = 0;
      try {
        const res = await NET.state(my.code, my.token, since, ctl.signal, my.fxSeq == null ? -1 : my.fxSeq, stall);
        fails = 0;
        if (online !== my) return;
        if (res.fxSeq != null) onFx(my, res);
        if (res.state) onState(res.state);
      } catch (e) {
        if (online !== my) return;
        if (ctl.signal.aborted) continue;   // 是我嫌它卡住、自己丢掉的：马上重发，不算失败
        if (e.status === 401 || e.status === 404) { leaveOnline('房间已经解散了'); return; }
        fails++;
        if (fails === 3) toast('网络不太稳，正在重连…');
        await new Promise((r) => setTimeout(r, Math.min(8000, 800 * fails)));
      }
    }
  }

  async function onlineAct(action, body) {
    const my = online;
    if (!my) return null;
    try {
      const res = await NET.act(my.code, my.token, action, body || {});
      if (online === my && res && res.state) onState(res.state);
      return res;
    } catch (e) {
      if (online !== my) return null;
      toast(NET.message(e));
      if (e.status === 401 || e.status === 404) { leaveOnline(); return null; }
      if (my.pending >= 0) my.pending = -1;
      if (action === 'expose') { my.exposeSent = null; ov.held = []; }   // 没送到：让我重新表态
      if (my.inGame && my.st && my.st.game) resync();
      return null;
    }
  }

  /* 收到一份房间视图（长轮询或自己动作的回应） */
  function onState(st, again) {
    if (!online || !st || st.code !== online.code) return;
    if (online.st && st.version < online.st.version && !again) return;   // 迟到的旧视图
    if (st.spectator && online.viewPending >= 0 && st.viewSeat !== online.viewPending) return;   // 正在换视角：换之前的快照不要了
    online.base = st;
    online.st = st.phase === 'lobby' ? withOps(st) : st;
    online.skew = online.pingSkew != null ? online.pingSkew : st.serverNow - Date.now();
    const spec = !!st.spectator;
    const me = st.players.find((p) => p.id === st.me);
    if (!spec && (!me || me.left || st.mySeat < 0)) { leaveOnline(st.kicked ? '房主请你离开了房间' : '你已经不在这个房间里了'); return; }
    // 观战 ↔ 坐下：看的方向变了，整桌按快照重画
    online.watchSeat = spec ? st.viewSeat | 0 : 0;
    const view = spec ? online.watchSeat : st.mySeat;
    const moved = online.mySeat !== view || online.watching !== spec;
    const sat = online.watching && !spec;
    online.mySeat = view;
    online.watching = spec;
    els.app.classList.toggle('is-watching', spec);
    NAMES = [0, 1, 2, 3].map((l) => (l === 0 && !spec ? '我' : (playerAt(srv(l)) || { nick: '空位' }).nick));
    AVATARS = [0, 1, 2, 3].map((l) => avatarOf(l === 0 && !spec ? me : playerAt(srv(l))));
    renderWatchUi();
    syncSocialUi();
    if (hostPv) hostPv.onState(st);
    if (sat) toast(st.phase === 'lobby' ? '坐下了' : '坐下了，下一局一起打');
    if (st.phase === 'lobby') { renderLobby(); return; }
    if (countdown && !countdown.done) return;   // 房主还在数 3、2、1：数完再进（见 hostStart）
    stopCountdown();
    online.joinRules = false;
    const gv = st.game;
    if (moved || !online.inGame || !match || !match.online || match.lobby || match.matchNo !== gv.matchNo) { enterGameView(); resync(); return; }
    const last = online.queue.length ? online.queue[online.queue.length - 1].n : online.applied;
    if (gv.seq < online.applied) { resync(); return; }
    const fresh = gv.log.filter((e) => e.n > last);
    if (fresh.length && fresh[0].n !== last + 1) { resync(); return; }
    online.queue.push(...fresh);
    renderOnlineBadges();
    if (online.idle) onlineStep();
    updateSettleWaiting();
  }

  function enterGameView() {
    online.inGame = true;
    renderWatchUi();
    if (els.dialog.querySelector('[data-sheet="rules"]')) closeDialog();
    els.app.classList.remove('is-lobby');
    $('gzLobby').hidden = true;
    buildSeats();
  }

  /* 按快照直接画出当前局面（不播动画）：刚进来、断线回来、或者播完对不上时 */
  function resync() {
    const gv = online.st.game;
    clearScene();
    stopClock();
    busy = true; selected = -1; exposePick = [];
    if (online.exposeSent !== exposeKey(gv)) ov.held = [];
    online.queue = []; online.applied = gv.seq; online.pending = -1;
    const ended = gv.phase === 'round_end' || gv.phase === 'match_end';
    match = {
      online: true, matchNo: gv.matchNo, rules: gv.rules, totals: rot(gv.totals), roundNo: gv.roundNo,
      round: ended || !gv.round ? null : mirrorFromSnapshot(gv), exposing: [],
      last: gv.last ? { roundNo: gv.last.roundNo, scores: rot(gv.last.scores), captured: rot(gv.last.captured), ctx: gv.last.ctx } : null,
      over: gv.phase === 'match_end', losers: (gv.losers || []).map(loc), tutorial: false,
    };
    if (match.last) keepRoundCaps(gv.matchNo, match.last);
    if (ended && match.last) statsNote();   // 刷新 / 重连回到局终：这一局补记（按局号去重）
    closeDialog();
    renderAll();
    renderOnlineBadges();
    if (ended && match.last) { online.readySent = !!(gv.ready && gv.ready[online.mySeat]); showSettlement(); }
    onlineIdle();
  }

  /* 别家没亮的手牌用占位 HIDDEN 顶着（只用来数张数）。占位必须不属于任何花色：
   * 早先用 -1，可 suitOf(-1) 算出来是 0（♠）——♠ 领出时别家垫牌，规则引擎以为他手里还有 ♠、判「必须跟牌」，
   * 这一手就对不上、整桌按快照重画（这一轮的收牌动画直接跳过，看着像牌被别人吃了）。 */
  const HIDDEN = 52;

  function mirrorFromSnapshot(gv) {
    const v = gv.round;
    const exposed = v.exposed.map(([c, s]) => [c, loc(s)]);
    const hands = [0, 1, 2, 3].map((l) => {
      if (l === 0 && (!online.watching || v.hand.length)) return v.hand.slice();   // 观战：那一家公开了手牌才有
      const known = exposed.filter(([c, o]) => o === l && !v.played[c]).map(([c]) => c);
      return known.concat(new Array(Math.max(0, v.counts[srv(l)] - known.length)).fill(HIDDEN));
    });
    const r = R.createRound(hands, loc(v.leader), v.mustLead, gv.rules);
    Object.assign(r, {
      exposed, led: v.led.slice(), firstOfSuit: v.firstOfSuit, turn: loc(v.turn), trickNo: v.trickNo,
      trick: v.trick.map((p) => ({ seat: loc(p.seat), card: p.card })),
      captured: rot(v.captured).map((c) => c.slice()),
      history: v.history.map((h) => ({ leader: loc(h.leader), winner: loc(h.winner), plays: h.plays.map((p) => ({ seat: loc(p.seat), card: p.card })) })),
      voids: rot(v.voids).map((x) => x.slice()),
      pigTaker: v.pigTaker < 0 ? -1 : loc(v.pigTaker),
      played: v.played.slice(),
    });
    return r;
  }

  /* 别家打出某张牌之前：把一个占位换成这张牌，规则引擎才认 */
  function ensureCard(r, l, c) {
    if (l === 0 && !online.watching) return;
    const h = r.hands[l];
    if (h.includes(c)) return;
    const i = h.indexOf(HIDDEN);
    if (i >= 0) h[i] = c; else h.push(c);
  }

  function sameAsSnapshot(r, gv) {
    const v = gv.round;
    if (!v) return true;
    // 观战、那一家没公开：只对张数（本地手里只能是牌背 + 亮出来的牌，公开后又关掉就得重画）
    if (online.watching && !v.hand.length) {
      return r.hands[0].length === v.counts[srv(0)] && r.hands[0].every((c) => c === HIDDEN || isExposedCard(c)) &&
        r.trickNo === v.trickNo && r.trick.length === v.trick.length && r.turn === loc(v.turn);
    }
    const a = r.hands[0].slice().sort((x, y) => x - y).join();
    const b = v.hand.slice().sort((x, y) => x - y).join();
    return a === b && r.trickNo === v.trickNo && r.trick.length === v.trick.length && r.turn === loc(v.turn);
  }

  // 一条事件出错就整体按快照重画，不让一处对不上卡死整桌
  function safely(fn) { return () => { try { fn(); } catch (e) { console.warn('[gongzhu] 联机事件对不上，按快照重画', e); resync(); } }; }

  function onlineStep() {
    if (!online || !match || !match.online || match.lobby) return;
    const ev = online.queue.shift();
    if (!ev) { onlineIdle(); return; }
    online.idle = false;
    online.applied = ev.n;
    stopClock();
    safely(() => {
      const r = match.round;
      if (ev.t === 'deal') {
        closeDialog();
        const gv = online.st.game;
        const blank = () => new Array(13).fill(HIDDEN);
        match.roundNo = ev.roundNo; match.over = false; match.losers = [];
        match.round = R.createRound([gv.dealt ? gv.dealt.slice() : blank(), blank(), blank(), blank()], loc(ev.leader), ev.mustLead, match.rules);
        match.exposing = [];
        selected = -1; exposePick = []; ov.held = []; busy = true; online.readySent = false;
        if (DEAL_FX && !watching()) { dealIntro().then(() => { if (match && match.online) schedule(step, 120); }); return; }
        renderAll();
        snd('deal');
        schedule(step, 450);
        return;
      }
      if (!r) { resync(); return; }
      if (ev.t === 'expose') {
        for (const [c, s] of ev.exposed) { const l = loc(s); ensureCard(r, l, c); R.expose(r, l, c); }
        match.exposing = []; ov.held = [];
        renderSeats(); renderHand();
        ev.exposed.forEach((_, i) => snd('stamp', i * 160));
        schedule(step, 900);
        return;
      }
      if (ev.t === 'play') {
        const l = loc(ev.seat);
        if (l === 0 && online.pending === ev.card) { online.pending = -1; schedule(step, 0); return; }   // 我刚出的，已经先播过了
        if (l === 0) { online.pending = -1; selected = -1; }
        ensureCard(r, l, ev.card);
        schedule(safely(() => commit(l, ev.card)), l === 0 && !online.watching ? 0 : seatIsBot(l) ? pace().aiMin : 160);
        return;
      }
      if (ev.t === 'round') {
        const gv = online.st.game;
        match.totals = rot(ev.totals);
        match.last = { roundNo: ev.roundNo, captured: r.captured.map((c) => c.slice()), scores: rot(ev.scores), ctx: R.scoreCtx(r) };
        keepRoundCaps(gv.matchNo, match.last);
        match.round = null;
        match.over = gv.phase === 'match_end' && gv.roundNo === ev.roundNo;
        match.losers = match.over ? (gv.losers || []).map(loc) : [];
        statsNote();
        online.readySent = false;
        renderOnlineBadges();
        // 和单机一样：等最后一轮的本局分翻完，再在桌上把累计分数完，停一下才出结算页
        schedule(() => settleOnTable(() => { if (match.over) matchEndSound(); else roundEndSound(online.watching ? 0 : match.last.scores[0]); showSettlement(); step(); }), pace().roundEnd);
        return;
      }
      schedule(step, 0);   // trick：收牌动画在第四张牌的 commit 里已经播了
    })();
  }

  /* 事件播完了：按快照决定现在能不能动、钟走给谁 */
  function onlineIdle() {
    online.idle = true;
    const gv = online.st && online.st.game;
    if (!gv || !match || !match.online) return;
    if (gv.phase === 'match_end' && !match.over && !match.round) {   // 「不设终点」被房主叫停
      match.over = true;
      match.losers = (gv.losers || []).map(loc);
      statsNote();
      if (!els.mask.hidden) showSettlement();
    }
    if (online.pending >= 0) { busy = true; renderHand(); return; }   // 等服务器确认我刚出的牌
    const r = match.round;
    if (!r) { updateSettleWaiting(); return; }
    if (!sameAsSnapshot(r, gv)) { resync(); return; }
    if (gv.phase === 'expose') {
      // 每个真人都要表态（没有可明的牌也点一下「不明牌」），亮牌阶段长短才不会泄露谁有特殊牌
      // 我已经点过（请求还在路上）：服务器在收到之前发出的快照仍写着「没表态」，不能凭它再把按钮弹出来
      const mine = !!(gv.expose && !gv.expose.decided) && online.exposeSent !== exposeKey(gv);
      match.exposing = mine ? [0] : [];
      busy = !mine;
      renderSeats(); renderHand();
      if (gv.paused) { busy = true; match.exposing = []; renderHand(); }   // 房主暂停：服务器不收，先别让我点
      if (mine && !gv.paused) { startClock(0, null, remainMs(gv)); dingMyTurn(); maybeExposeTip(); }
      return;
    }
    match.exposing = [];
    if (gv.phase !== 'playing') return;
    busy = !(r.turn === 0 && gv.legal.length > 0) || !!gv.paused;   // 房主暂停：谁都不能出
    renderSeats(); renderHand();
    startClock(r.turn, null, remainMs(gv));
    if (gv.paused) holdClock();   // 暂停：钟停在暂停那一刻（继续时服务器把截止时刻整体后移，按新快照重新走）
    else if (!busy) dingMyTurn();
  }
  function exposeKey(gv) { return gv.matchNo + ':' + gv.roundNo; }
  // 倒计时还剩多久：服务器的截止时刻（出牌时它比我这边多等一截宽限，先让我自己的钟走完；
  // 宽限由服务器按网络给、随视图下发 game.grace，老后端没有这个字段 = 3 秒）
  function remainMs(gv) {
    if (!gv.deadline) return 0;
    const grace = gv.phase === 'playing' ? (gv.grace > 0 ? gv.grace : 3000) : 0;
    const now = gv.paused && gv.pausedAt ? gv.pausedAt : Date.now() + online.skew;   // 暂停中：钟停在暂停那一刻
    const left = gv.deadline - now - grace;
    return Math.min(Math.max(left, 0), Math.max(gv.turnSec, 15) * 1000);
  }

  function onlinePlaySelected() {
    if (exposingMe()) {
      if (busy || !exposePick.length) return;
      const cards = exposePick.slice();
      busy = true; match.exposing = []; exposePick = []; ov.held = cards.slice();
      online.exposeSent = exposeKey(online.st.game);
      stopClock(); renderHand();
      onlineAct('expose', { cards });
      return;
    }
    const r = match.round;
    if (busy || !r || r.turn !== 0 || selected < 0 || !R.legalFor(r, 0).includes(selected)) return;
    const card = selected;
    busy = true;
    online.idle = false;
    online.pending = card;
    commit(0, card);   // 先在本地打出去（不等网络），服务器确认后那条出牌事件就跳过
    onlineAct('play', { card });
  }

  /* 牌桌上的名字 / 头像 / 状态小签：掉线、已离开（机器人代打）；托管是头像右下角的小机器人 */
  const EYE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  function renderOnlineBadges() {
    if (!online || !online.inGame) return;
    const g = online.st.game;
    for (let l = 0; l < 4; l++) {
      const p = playerAt(srv(l));
      const el = els.seats[l];
      const name = el.querySelector('.gz-name');
      if (name && name.textContent !== NAMES[l]) name.textContent = NAMES[l];
      const face = el.querySelector('.gz-av-face');
      if (face && face.dataset.v !== AVATARS[l]) { face.innerHTML = faceHtml(AVATARS[l]); face.dataset.v = AVATARS[l]; }
      const line = el.querySelector('.gz-name-line');
      let tag = line && line.querySelector('.gz-tag');
      // 托管不写字：和我自己托管一样，头像右下角挂一枚小机器人
      const auto = !!(p && !p.left && g && g.auto[p.seat]);
      // 机器人不再把档位写进名字：名字旁边一个小签写「入门 / 普通 / 高手」
      const text = !p ? '' : p.left ? '已离开' : auto ? '' : p.isAi ? TIER_LABELS[p.aiLevel] || '' : !p.online ? '掉线' : '';
      if (line && !tag && text) { tag = document.createElement('span'); tag.className = 'gz-tag'; line.appendChild(tag); }
      if (tag) { tag.textContent = text; tag.hidden = !text; tag.classList.toggle('is-level', !!(p && p.isAi && !p.left)); }
      el.classList.toggle('is-auto', auto);
      // 头像旁「眼睛 + 数字」：有几个观战的人站在这一家身后看
      const eyes = (online.st.spectators || []).filter((x) => x.online && (x.view | 0) === srv(l)).length;
      const av = el.querySelector('.gz-avatar');
      let eb = av && av.querySelector('.gz-eyes');
      if (av && !eb && eyes) { eb = document.createElement('span'); eb.className = 'gz-eyes'; eb.innerHTML = EYE_SVG + '<b></b>'; av.appendChild(eb); }
      if (eb) { eb.hidden = !eyes; eb.querySelector('b').textContent = eyes; }
      if (av) av.setAttribute('aria-label', eyes ? eyes + ' 人在这一家身后观战' : '');
      if (l > 0) { if (auto) el.setAttribute('aria-label', NAMES[l] + '（托管中）'); else el.removeAttribute('aria-label'); }
      if (hostPv) hostPv.badge(l, el, p);
    }
    if (rimPv) rimPv.sync();
  }

  /* ───── 联机 · 结算页 ───── */

  function onlineSettleActions() {
    if (online.watching) {
      return '<span class="gz-wait" data-wait>' + (match.over ? '等房主回到房间…' : waitingText()) + '</span>' +
        (online.st.seatOpen ? '<button type="button" class="gz-btn gz-btn-primary" data-act="sit" data-autofocus>坐下</button>' : '');
    }
    if (match.over) {
      return isHost() ? '<button type="button" class="gz-btn gz-btn-primary" data-act="rematch" data-autofocus>回到房间</button>'
        : '<span class="gz-wait" data-wait>等房主回到房间…</span>';
    }
    return (isHost() && match.rules.end === 'none' ? '<button type="button" class="gz-btn" data-act="end-match">结束这一盘</button>' : '') +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="ready" data-autofocus' + (online.readySent ? ' disabled' : '') + '>' +
      (online.readySent ? waitingText() : '下一局') + '</button>';
  }
  function waitingText() {
    const g = online.st.game;
    if (!g || !g.ready) return '等其他人…';
    const names = [0, 1, 2, 3].filter((s) => !g.ready[s]).map((s) => (playerAt(s) || { nick: '' }).nick).filter(Boolean);
    return names.length ? '等' + names.join('、') + '…' : '马上开始…';
  }
  function bindOnlineSettle(d) {
    d.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'ready') { online.readySent = true; b.disabled = true; b.textContent = waitingText(); onlineAct('ready'); }
      if (act === 'end-match') askConfirm('现在结束这一盘？', '按累计分排名，不评猪。', '结束', () => onlineAct('end_match'));
      if (act === 'rematch') onlineAct('rematch');
      if (act === 'sit') { b.disabled = true; watchSit(); }
    }));
  }
  function updateSettleWaiting() {
    if (!online || els.mask.hidden) return;
    if (online.watching) {
      if (!els.dialog.querySelector('.gz-res, .gz-fin')) return;
      const w = els.dialog.querySelector('[data-wait]');
      const want = match.over ? '等房主回到房间…' : waitingText();
      // 能不能坐下变了 / 整盘结束了：整页重画；否则只改等谁那一行
      if (!w || !!els.dialog.querySelector('[data-act="sit"]') !== !!online.st.seatOpen || (match.over && w.textContent !== want)) showSettlement();
      else w.textContent = want;
      return;
    }
    const b = els.dialog.querySelector('[data-act="ready"]');
    if (b && online.readySent) b.textContent = waitingText();
    if (match && match.over && !els.dialog.querySelector('[data-act="rematch"], [data-wait]') && els.dialog.querySelector('.gz-res, .gz-fin')) showSettlement();
  }

  /* ───── 联机 · 观战 ─────
   * 满房（或这一局正打着）时点「加入」、或者直接点「观战」进来的人：没有座位，牌桌固定从 0 号座看；
   * 看得到吃牌、分数、每一轮的动画和结算页，看不到任何人的手牌，也不能出牌 / 准备。
   * 有空位（大厅里、或者一局打完有人走了 / 有机器人可以换下）时，顶栏下面出一个「坐下」。 */
  function renderWatchUi() {
    const on = !!(online && online.watching);
    // 观战的人：顶栏写「观战中」；坐着的人：有人观战时写「N 人观战」
    const watchers = online && online.st ? (online.st.spectators || []).filter((x) => x.online).length : 0;
    const text = on ? (online.inGame ? '观战中 · 点头像换视角' : '观战中') : watchers ? watchers + ' 人观战' : '';
    let tag = $('gzWatchTag');
    if (!tag && text) {
      tag = document.createElement('span');
      tag.id = 'gzWatchTag';
      tag.className = 'gz-watch-tag';
      $('gzRoundInfo').after(tag);
    }
    if (tag) { tag.textContent = text; tag.hidden = !text; }
    let sit = $('gzSitBtn');
    if (!sit && on) {
      sit = document.createElement('button');
      sit.type = 'button';
      sit.id = 'gzSitBtn';
      sit.className = 'gz-btn gz-btn-primary';
      sit.textContent = '坐下';
      sit.addEventListener('click', () => watchSit());
      els.play.after(sit);
    }
    if (sit) sit.hidden = !(on && online.st && online.st.seatOpen);
    els.hand.setAttribute('aria-label', on ? '手牌（观战看不到）' : '我的手牌');
  }
  /* 观战：点哪家的头像，就坐到哪家身后看（那一家公开了手牌才看得到牌，否则只有牌背） */
  function switchView(seat) {
    const my = online;
    if (!my || !my.watching || seat === my.watchSeat || my.viewPending >= 0) return;
    my.viewPending = seat;
    onlineAct('view', { seat }).finally(() => { if (online === my) my.viewPending = -1; });
  }
  let sitting = false;
  async function watchSit(seat) {
    if (!online || !online.watching || sitting) return;
    sitting = true;
    try { await onlineAct('sit', seat == null ? {} : { seat }); } finally { sitting = false; }
  }

  /* ───── 联机 · 大厅（就用牌桌本身：四个座位在原位，中间是房号 / 邀请 / 规则 / 开始） ───── */

  function renderLobby() {
    const st = online.st;
    if (online.inGame) { online.inGame = false; token++; stopClock(); closeDialog(); renderWatchUi(); }
    match = { online: true, lobby: true, rules: st.config.rules, totals: [0, 0, 0, 0], roundNo: 0, round: null, exposing: [], last: null, over: false, losers: [] };
    busy = true; selected = -1; ov.trick = null;
    els.app.classList.add('is-online', 'is-lobby');
    els.hand.innerHTML = '';
    els.slots.forEach((x) => { x.innerHTML = ''; });
    els.play.disabled = true;
    els.roundNo.textContent = '房间 ' + st.code;
    const host = isHost();
    const spec = online.watching;
    for (let l = 0; l < 4; l++) {
      const p = playerAt(srv(l));
      const el = els.seats[l];
      const mine = l === 0 && !spec;
      el.classList.remove('is-turn', 'is-timed', 'is-hurry', 'is-auto');
      el.innerHTML = p
        ? '<button type="button" class="gz-lobby-seat' + (p.pending ? ' is-pending' : '') + '" data-lseat="' + l + '"' + (mine ? ' aria-label="改名字和头像"' : '') + '>' +
          '<span class="gz-avatar' + (p.isAi ? ' is-bot' : '') + '"><span class="gz-av-face">' + faceHtml(avatarOf(p)) + '</span></span>' +
          '<span class="gz-lobby-name">' + esc(p.nick) + '</span>' +
          (mine ? '<svg class="gz-lobby-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h3.2L18.5 8.7l-3.2-3.2L5 15.8Z"/><path d="M13.6 7.2l3.2 3.2"/></svg>' : '') +
          (p.id === st.hostId ? '<span class="gz-tag is-host">房主</span>' : '') +
          (p.isAi ? '<span class="gz-tag is-level">' + (TIER_LABELS[p.aiLevel] || '') + '</span>' : '') +
          (!p.isAi && !p.online ? '<span class="gz-tag">掉线</span>' : '') + '</button>'
        : '<button type="button" class="gz-lobby-seat is-empty" data-lseat="' + l + '">' +
          '<span class="gz-avatar"><span class="gz-av-face">+</span></span><span class="gz-lobby-name">空位</span></button>';
    }
    const box = $('gzLobby');
    box.hidden = false;
    box.querySelector('.gz-lobby-code b').textContent = st.code;
    // 2026-11-23 用户定：大厅不要二维码、复制只留「复制邀请链接」、规则收进右上角菜单。老页面（HTML 还在缓存里）多出来的这几样直接拿掉
    box.querySelectorAll('.gz-lobby-qr, [data-lb="copy-code"], [data-lb="rules"]').forEach((x) => x.remove());
    const missing = 4 - st.players.length;
    const start = box.querySelector('[data-lb="start"]');
    start.hidden = !host;
    start.disabled = missing > 0;
    let sitLb = box.querySelector('[data-lb="sit"]');
    if (!sitLb) {   // 老页面（HTML 还在缓存里）没有这个键：补一个
      sitLb = document.createElement('button');
      sitLb.type = 'button'; sitLb.className = 'gz-btn gz-btn-primary'; sitLb.dataset.lb = 'sit'; sitLb.textContent = '坐下';
      start.after(sitLb);
    }
    sitLb.hidden = !(spec && st.seatOpen);
    box.querySelector('.gz-lobby-wait').textContent = (spec
      ? (st.seatOpen ? '观战中，点「坐下」或空位入座' : '观战中，座位满了')
      : host
        ? (missing > 0 ? '还差 ' + missing + ' 人' : '人齐了，可以开始')
        : '等房主开始');
    guestRulesCheck(st);
    if (hostPv) hostPv.lobby(st);
    if (rimPv) { rimPv.lobby(st); rimPv.sync(); }
  }

  /* ───── 大厅里房主的机器人操作：先画上去，再排队慢慢发 ─────
   * 加 / 移除 / 换档机器人只有房主能做，结果房主自己说了算，所以点了就直接画出来（乐观更新），不等服务器那一两秒。
   * 规矩：
   *  · 操作按点的顺序排队，一次只发一条，上一条回来了才发下一条——服务器看到的顺序和房主点的一模一样；
   *  · 画面 = 服务器最新视图 + 队列里还没确认的操作（withOps），轮询中途送来的旧视图不会把刚加的机器人「闪掉」；
   *  · 还没发出去的「加」被「移除」：两条互相抵消，都不发；还没发出去的「加」被换档：直接改那条「加」的档位；
   *  · 某条被服务器拒了（比如那个空位刚好有人坐进来）：提示一下，丢掉它和后面同一座位的操作，画面回到服务器的样子；
   *  · 「开始」也排进这条队，等前面的机器人都确认了才发，不会因为人还没凑齐被拒。 */
  function withOps(st) {
    const ops = online && online.ops;
    if (!ops || !ops.length) return st;
    let players = st.players.slice();
    for (const { action, body } of ops) {
      if (action === 'add_ai' && !players.some((p) => p.seat === body.seat)) {
        players.push({ id: 'pending_' + body.seat, nick: '机器人', seat: body.seat, isAi: true, aiLevel: body.level, online: true, avatar: 'bot-navy', pending: true });
      } else if (action === 'remove_ai') {
        players = players.filter((p) => !(p.seat === body.seat && p.isAi));
      } else if (action === 'set_ai') {
        players = players.map((p) => (p.seat === body.seat && p.isAi ? Object.assign({}, p, { aiLevel: body.level }) : p));
      }
    }
    return Object.assign({}, st, { players });
  }
  function redrawLobby() {
    if (!online || !online.base || online.base.phase !== 'lobby') return;
    online.st = withOps(online.base);
    renderLobby();
  }
  function lobbyOp(action, body) {
    const my = online;
    if (!my) return;
    body = Object.assign({}, body || {});
    const unsent = (a, seat) => my.ops.findIndex((o) => !o.sent && o.action === a && o.body.seat === seat);
    if (action === 'remove_ai' && unsent('add_ai', body.seat) >= 0) {
      my.ops = my.ops.filter((o) => o.sent || o.body.seat !== body.seat);
      redrawLobby();
      return;
    }
    if (action === 'set_ai') {
      const i = unsent('add_ai', body.seat);
      if (i >= 0) { my.ops[i].body.level = body.level; redrawLobby(); return; }
    }
    if (action === 'start' && my.ops.some((o) => o.action === 'start')) return;
    my.ops.push({ action, body, sent: false });
    redrawLobby();
    pumpOps(my);
  }
  async function pumpOps(my) {
    if (my.pumping) return;
    my.pumping = true;
    while (online === my && my.ops.length) {
      const op = my.ops[0];
      op.sent = true;
      const res = await onlineAct(op.action, op.body);
      if (online !== my) break;
      my.ops.shift();
      if (!res && op.action === 'start') stopCountdown();   // 开局被拒（提示已经弹了）：留在大厅
      if (!res) my.ops = my.ops.filter((o) => o.action !== 'start' && (op.body.seat == null || o.body.seat !== op.body.seat));
      redrawLobby();
    }
    my.pumping = false;
  }

  /* 改自己的名字 / 头像：大厅里点自己那一格，或者牌局里菜单「改名字 / 头像」 */
  function showProfile() {
    const st = online && online.st;
    const me = st && (st.players.find((p) => p.id === st.me) || (st.spectators || []).find((p) => p.id === st.me));
    const A = window.GongzhuAvatars;
    if (!me || !A) return;
    let pick = me.avatar;
    openDialog('<h2>名字和头像</h2><div class="gz-field-label">名字（选填）</div>' +
      '<input class="gz-input" data-nick maxlength="12" autocomplete="nickname" value="' + esc(me.nick) + '">' +
      '<div class="gz-field-label">头像</div><div class="gz-av-grid" role="group">' +
      A.HUMAN.map((a) => '<button type="button" class="gz-av-pick" data-av="' + a.id + '" aria-label="' + esc(a.name) + '" aria-pressed="' + (a.id === pick) + '">' + a.svg + '</button>').join('') +
      '</div><p class="gz-note gz-err" data-err hidden></p>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="save">保存</button></div>',
      (d) => {
        const err = d.querySelector('[data-err]'), nickIn = d.querySelector('[data-nick]');
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('[data-av]').forEach((b) => b.addEventListener('click', () => {
          pick = b.dataset.av;
          d.querySelectorAll('[data-av]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        d.querySelector('[data-act="save"]').addEventListener('click', async () => {
          const v = nickIn.value.trim();   // 删空 = 让服务器从昵称库里随机起一个（和加入房间一样）
          if (v && ([...v].length > 12 || /[<>&"'/\\]/.test(v))) { err.textContent = '名字最多 12 个字，不能有特殊符号'; err.hidden = false; nickIn.focus(); return; }
          const body = {};
          if (v !== me.nick) body.nick = v;
          if (pick !== me.avatar) body.avatar = pick;
          if (!Object.keys(body).length) { closeDialog(); return; }
          const ident = window.GamesShell && GamesShell.Identity;
          if (body.nick !== undefined && ident) { if (v) { if (ident.setNick) ident.setNick(v); } else if (ident.clearNick) ident.clearNick(); }
          const res = await onlineAct('profile', body);
          if (res) closeDialog();
        });
      });
  }

  function showSeatMenu(l) {
    const s = srv(l);
    const p = playerAt(s);
    if (online.watching) {   // 观战：点空位 / 机器人就坐过去
      if (p && !p.isAi) return;
      openDialog('<h2>' + (p ? esc(p.nick) : '空位') + '</h2>' +
        '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
        '<button type="button" class="gz-btn gz-btn-primary" data-act="sit" data-autofocus>' + (p ? '换下机器人，我来坐' : '我坐这里') + '</button></div>',
        (d) => {
          d.querySelector('[data-close]').addEventListener('click', closeDialog);
          d.querySelector('[data-act="sit"]').addEventListener('click', () => { closeDialog(); watchSit(s); });
        });
      return;
    }
    if (l === 0) { showProfile(); return; }
    const host = isHost();
    let body = '';
    const acts = [];
    if (!p) {
      if (host) body += '<div class="gz-field-label">加一个机器人</div><div class="gz-seg" role="group">' +
        TIER_ORDER.map((k) => '<button type="button" data-ai="' + k + '">' + TIER_LABELS[k] + '</button>').join('') + '</div>';
      acts.push('<button type="button" class="gz-btn" data-seat-act="sit">我坐这里</button>');
    } else if (p.isAi) {
      if (host) {
        body += '<div class="gz-field-label">机器人水平</div><div class="gz-seg" role="group">' +
          TIER_ORDER.map((k) => '<button type="button" data-set-ai="' + k + '" aria-pressed="' + (p.aiLevel === k) + '">' + TIER_LABELS[k] + '</button>').join('') + '</div>';
        acts.push('<button type="button" class="gz-btn" data-seat-act="remove">移除机器人</button>');
      }
      acts.push('<button type="button" class="gz-btn" data-seat-act="sit">和它换座</button>');
    } else if (host) {
      acts.push('<button type="button" class="gz-btn" data-seat-act="kick">请' + esc(p.nick) + '离开</button>');
    }
    if (!body && !acts.length) return;
    openDialog('<h2>' + (p ? esc(p.nick) : '空位') + '</h2>' + body +
      '<div class="gz-actions">' + acts.join('') + '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('[data-ai]').forEach((b) => b.addEventListener('click', () => { closeDialog(); lobbyOp('add_ai', { seat: s, level: b.dataset.ai }); }));
        d.querySelectorAll('[data-set-ai]').forEach((b) => b.addEventListener('click', () => {
          d.querySelectorAll('[data-set-ai]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          lobbyOp('set_ai', { seat: s, level: b.dataset.setAi });
        }));
        d.querySelectorAll('[data-seat-act]').forEach((b) => b.addEventListener('click', () => {
          closeDialog();
          const a = b.dataset.seatAct;
          if (a === 'sit') lobbyOp('sit', { seat: s });   // 也排队：和刚加、还没确认的机器人换座，得等它先落座
          if (a === 'remove') lobbyOp('remove_ai', { seat: s });
          if (a === 'kick') lobbyOp('kick', { pid: p.id });
        }));
      });
  }

  // 剪贴板接口用不了（部分微信内置浏览器）：退回老办法 execCommand；再不行才弹框让人手动复制
  async function copyText(text, done) {
    try { await navigator.clipboard.writeText(text); toast(done); return; } catch (_) { /* 往下试 */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch (_) { /* iPhone 上 select() 不一定选全 */ }
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
    // 复制完马上把选区和焦点收掉再拿走这个看不见的输入框：不然微信的「搜一搜 / 复制」菜单会卡在屏幕上
    ta.blur();
    clearSelection(true);
    ta.remove();
    if (ok) toast(done); else showCopyBox('复制下面这段发给朋友', text);
  }

  /* 房间设置：邀请、离开房间（规则在右上角菜单「自定义规则 / 房间规则」） */
  function showRoomDialog() {
    const st = online.st;
    openDialog('<h2>房间 ' + st.code + '</h2>' +
      '<div class="gz-actions gz-actions-start"><button type="button" class="gz-btn" data-act="copy-link">复制邀请链接</button></div>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-act="leave">离开房间</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelector('[data-act="copy-link"]').addEventListener('click', () => copyText(NET.inviteUrl(st.code), '邀请链接已复制'));
        d.querySelector('[data-act="leave"]').addEventListener('click', () => {
          const inGame = st.phase !== 'lobby' && !online.watching;
          askConfirm('离开房间？', inGame ? '你的座位会交给机器人接着打。' : '', '离开', () => leaveOnline(null, true));
        });
      });
  }

  /* 房间规则：大厅里不再摆规则，全收在这一页。
   * 房主（大厅里）= 编辑，攒好一次「保存」才发出去（其他人只收到一次通知）；
   * 其他人 / 开局后 = 只读清单。kind：view 自己点开 · join 刚进房间 · changed 房主改了规则（改过的几行标出来）。
   * 不搞全体同意：不同意就在这一页「退出房间」。 */
  const ROOM_RULE_ROWS = [['turnSec', '出牌限时', [[20, '20 秒'], [30, '30 秒'], [0, '不限时']]]].concat(RULE_UI);
  const cfgVal = (cfg, k) => (k === 'turnSec' ? cfg.turnSec | 0 : cfg.rules[k]);
  const cfgText = (cfg, k, opts) => { const o = opts.find(([v]) => v === cfgVal(cfg, k)); return o ? o[1] : String(cfgVal(cfg, k)); };
  const cfgKey = (cfg) => JSON.stringify(ROOM_RULE_ROWS.map(([k]) => cfgVal(cfg, k)));

  function showRoomRules(kind, base) {
    const st = online.st;
    const cfg = st.config;
    if (st.phase === 'lobby' && isHost()) { editRoomRules(); return; }
    online.sheetBase = base || null;
    const rows = ROOM_RULE_ROWS.map(([k, label, opts]) => {
      const changed = base && cfgVal(base, k) !== cfgVal(cfg, k);
      return '<div class="gz-rl-row' + (changed ? ' is-changed' : '') + '"><span class="gz-rl-k">' + label + '</span>' +
        '<span class="gz-rl-v">' + esc(cfgText(cfg, k, opts)) + (changed ? '<small>原来：' + esc(cfgText(base, k, opts)) + '</small>' : '') + '</span></div>';
    }).join('');
    const title = kind === 'changed' ? '房主改了规则' : '房间 ' + st.code + ' 的规则';
    const asking = kind === 'join' || kind === 'changed';
    openDialog('<h2>' + title + '</h2><div class="gz-rulelist" data-sheet="rules" data-kind="' + kind + '">' + rows + '</div>' +
      (st.phase === 'lobby' ? '<p class="gz-note">只有房主可以改规则</p>' : '') +
      '<div class="gz-actions">' + (asking ? '<button type="button" class="gz-btn" data-act="leave">退出房间</button>' : '') +
      '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>' + (kind === 'join' ? '继续' : '好') + '</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', () => { online.sheetBase = null; closeDialog(); });
        const lv = d.querySelector('[data-act="leave"]');
        if (lv) lv.addEventListener('click', () => leaveOnline(null, true));
      });
  }

  function editRoomRules() {
    const st = online.st;
    const draft = { turnSec: st.config.turnSec | 0, rules: Object.assign({}, st.config.rules) };
    const others = st.players.some((p) => !p.isAi && p.id !== st.me && !p.left);
    openDialog('<h2>自定义规则</h2>' +
      ROOM_RULE_ROWS.map(([k, label, opts]) => '<div class="gz-field-label">' + label + '</div><div class="gz-seg' + (opts.length > 3 ? ' is-4' : '') + '" role="group">' +
        opts.map(([v, t], i) => '<button type="button" data-rk="' + k + '" data-ri="' + i + '" aria-pressed="' + (cfgVal(draft, k) === v) + '">' + t + '</button>').join('') + '</div>').join('') +
      (others ? '<p class="gz-note">保存后，房间里的其他人会看到改了哪几条</p>' : '') +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="save" data-autofocus>保存</button></div>',
      (d) => {
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        d.querySelectorAll('[data-rk]').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.rk;
          const v = ROOM_RULE_ROWS.find((x) => x[0] === k)[2][+b.dataset.ri][0];
          if (k === 'turnSec') draft.turnSec = v; else draft.rules[k] = v;
          d.querySelectorAll('[data-rk="' + k + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }));
        d.querySelector('[data-act="save"]').addEventListener('click', () => {
          closeDialog();
          const cur = online.st.config;
          const config = {};
          if (draft.turnSec !== (cur.turnSec | 0)) config.turnSec = draft.turnSec;
          const rules = {};
          RULE_UI.forEach(([k]) => { if (draft.rules[k] !== cur.rules[k]) rules[k] = draft.rules[k]; });
          if (Object.keys(rules).length) config.rules = rules;
          if (Object.keys(config).length) onlineAct('config', { config });
        });
      });
  }

  /* 不是房主：刚进房间先看一眼规则；之后房主每改一次，弹一次「改了哪几条」 */
  function guestRulesCheck(st) {
    if (isHost()) { online.seenCfg = st.config; return; }
    if (online.joinRules) { online.joinRules = false; online.seenCfg = st.config; showRoomRules('join'); return; }
    if (!online.seenCfg) { online.seenCfg = st.config; return; }
    if (cfgKey(online.seenCfg) === cfgKey(st.config)) return;
    const open = els.dialog.querySelector('[data-sheet="rules"]');
    const base = open && online.sheetBase ? online.sheetBase : online.seenCfg;
    online.seenCfg = st.config;
    showRoomRules(open && open.dataset.kind === 'join' ? 'join' : 'changed', base);
  }

  /* 创建房间：不弹框，点了直接建好进大厅。昵称用上次填过的；没填过就让服务器从昵称库里随机起一个 */
  let creating = false;
  /* 连服务器时盖一层「正在连接」+ 一条假进度条（照百变小咪，2026-11-12）：
   * 匀速 1.2 秒走到 70%；还没好就放慢、再 4 秒走到 90%，然后停着等；一连上就 0.25 秒冲到 100% 收起。
   * 250ms 内就连上的不露（不闪）；盖着的时候底下什么都点不了。上面四个花色一个接一个亮 */
  let connEl = null, connTimer = 0, connStage = 0;
  function connecting(on, text) {
    clearTimeout(connTimer); clearTimeout(connStage);
    if (!on) {
      if (!connEl || connEl.hidden) return Promise.resolve();
      const bar = connEl.querySelector('.gz-conn-bar i');
      bar.style.transition = 'transform .25s ease-out';
      bar.style.transform = 'scaleX(1)';
      return new Promise((r) => setTimeout(() => { connEl.hidden = true; r(); }, 300));
    }
    connTimer = setTimeout(() => {
      if (!connEl) {
        connEl = document.createElement('div');
        connEl.className = 'gz-connecting';
        connEl.innerHTML = '<div class="gz-conn-box"><div class="gz-conn-suits">' + [0, 1, 3, 2].map((s) => '<i class="gz-conn-suit s' + s + '">' + suitSVG(s) + '</i>').join('') + '</div>' +
          '<b data-t></b><div class="gz-conn-bar" role="progressbar" aria-label="连接中"><i></i></div></div>';
        document.body.appendChild(connEl);
      }
      connEl.querySelector('[data-t]').textContent = text || '正在连接…';
      const bar = connEl.querySelector('.gz-conn-bar i');
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

  async function createRoom() {
    if (!NET || creating) return;
    if (match && match.tutorial) { toast('先打完或跳过教程，再开联机'); return; }
    creating = true;
    const ident = window.GamesShell && GamesShell.Identity;
    const nick = (ident && ident.getNick && ident.getNick()) || '';
    try {
      const res = await withConn('正在创建房间…', () => NET.create(nick, { rules: settings.rules, turnSec: settings.turnSec | 0 }));
      startOnline(res.state, res.token);
    } catch (e) { toast(NET.message(e)); }
    finally { creating = false; }
  }

  /* 加入房间：来的人脑子里记着的是那 4 位房号，所以房号放最上面、做大；昵称在下面，选填（填过的自动带上） */
  function showJoin(code) {
    if (!NET) return;
    if (match && match.tutorial) { toast('先打完或跳过教程，再开联机'); return; }
    NET.warm();
    const ident = window.GamesShell && GamesShell.Identity;
    const nick = (ident && ident.getNick && ident.getNick()) || '';
    openDialog('<h2>加入房间</h2>' +
      '<input class="gz-input gz-code-input" data-code inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 位房号" aria-label="房号" value="' + esc(code || '') + '">' +
      '<div class="gz-field-label">昵称（选填）</div><input class="gz-input" data-nick maxlength="12" autocomplete="nickname" aria-label="昵称" value="' + esc(nick) + '">' +
      '<p class="gz-note gz-err" data-err hidden></p>' +
      '<div class="gz-actions"><button type="button" class="gz-btn" data-close>取消</button>' +
      '<button type="button" class="gz-btn" data-act="watch">观战</button>' +
      '<button type="button" class="gz-btn gz-btn-primary" data-act="join"' + (code ? ' data-autofocus' : '') + '>加入</button></div>',
      (d) => {
        const err = d.querySelector('[data-err]');
        const nickIn = d.querySelector('[data-nick]');
        const codeIn = d.querySelector('[data-code]');
        const btn = d.querySelector('[data-act="join"]');
        const watchBtn = d.querySelector('[data-act="watch"]');
        const fail = (text) => { err.textContent = text; err.hidden = false; btn.disabled = false; watchBtn.disabled = false; };
        // 加入：先坐空位，没空位顶掉一个机器人；满了（四个真人）或这一局正打着，就先观战
        const join = async (mode) => {
          if (mode !== 'watch') mode = 'play';
          const c = codeIn.value.trim();
          if (!/^\d{4}$/.test(c)) { fail('房号是 4 位数字'); codeIn.focus(); return; }
          const v = nickIn.value.trim();   // 不填：服务器从昵称库里随机起一个
          if (v && ([...v].length > 12 || /[<>&"'/\\]/.test(v))) { fail('昵称最多 12 个字，不能有特殊符号'); nickIn.focus(); return; }
          // 删空了就把记着的昵称也忘掉：下次创建房间同样随机起
          if (ident) { if (v) { if (ident.setNick) ident.setNick(v); } else if (ident.clearNick) ident.clearNick(); }
          err.hidden = true;
          btn.disabled = true; watchBtn.disabled = true;
          try {
            const res = await withConn(mode === 'watch' ? '正在进房间观战…' : '正在进房间…', () => NET.join(c, v, mode));
            startOnline(res.state, res.token, true);
            if (res.fellBack === 'room_full') toast('房间满了，先观战；有空位时可以坐下');
            else if (res.fellBack === 'wait_round_end') toast('这一局还在打，先观战；打完这一局就能坐下');
          } catch (e) { fail(NET.message(e)); }
        };
        d.querySelector('[data-close]').addEventListener('click', closeDialog);
        btn.addEventListener('click', () => join('play'));
        watchBtn.addEventListener('click', () => join('watch'));
        codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.replace(/\D/g, '').slice(0, 4); });
        [codeIn, nickIn].forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); join('play'); } }));
        if (!code) setTimeout(() => codeIn.focus(), 0);
      });
  }

  // 刷新 / 重新打开页面：上次的房间还在就接回去
  async function resumeOnline(sess) {
    try {
      const res = await withConn('正在回到房间…', () => NET.state(sess.code, sess.token, 0));
      startOnline(res.state, sess.token);
      return true;
    } catch (e) {
      // 只有服务器明确说房间没了 / 凭证不认（404 / 401）才忘掉；断网、服务器睡着之类的先留着，下次还能接（同百变小咪）
      if (e && (e.status === 401 || e.status === 404)) NET.writeSession(null);
      return false;
    }
  }


  /* ───── 启动 ───── */

  /* 游戏里永远不选文字：只有正在输入的输入框（房号 / 昵称）可以；别处冒出来的选区（长按、双击、程序选中）立刻清掉。
   * CSS 那边也关了选字和长按菜单（见 gongzhu.css「只有输入框能选字」），这里兜住 CSS 管不到的情况。 */
  document.addEventListener('selectstart', (e) => { if (!editableEl(nodeEl(e.target))) e.preventDefault(); });
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || editableEl(document.activeElement) || editableEl(nodeEl(sel.anchorNode))) return;
    sel.removeAllRanges();
  });
  document.addEventListener('contextmenu', (e) => { if (!editableEl(nodeEl(e.target))) e.preventDefault(); });

  els.play.addEventListener('click', playSelected);
  els.noExpose.addEventListener('click', () => {
    if (!match || !exposingMe() || busy) return;
    exposePick = [];
    if (match.online) {
      busy = true; match.exposing = []; ov.held = [];
      online.exposeSent = exposeKey(online.st.game);
      stopClock(); renderHand();
      onlineAct('expose', { cards: [] });
    } else { busy = true; timeouts = 0; applyExpose(0, []); }
  });
  $('gzRulesBtn').addEventListener('click', showRules);
  $('gzSoundBtn').addEventListener('click', toggleSoundPanel);
  refreshSoundBtn();
  $('gzRoundInfo').addEventListener('click', () => { if (match && !match.tutorial && !match.lobby && !match.demo) showHistory(); });
  $('gzSkipTut').addEventListener('click', () => { if (match.tutorial) endTutorial(); });
  // 教程讲解时点牌桌任意处继续（顶栏按钮、弹窗照常）
  els.app.addEventListener('click', (e) => {
    if (!coachNext || e.target.closest('.gz-topbar') || !els.mask.hidden) return;
    coachAdvance();
  });
  // 点自己的头像：进入托管（机器人替我打）；托管中再点一下收回。教程、动画预览、大厅里不管
  // 观战：点别家的头像换到他身后看；打牌的人点别家头像 = 弹出道具面板扔过去（见「牌桌互动」）
  [1, 2, 3].forEach((l) => els.seats[l].addEventListener('click', (e) => {
    if (!e.target.closest('.gz-avatar')) return;
    if (online && online.watching && online.inGame) { switchView(srv(l)); return; }
    if (social && socialOk()) social.openProps(l);
  }));
  initSocial();
  if (GZHOST) loadHostPv();
  if (GZRIM) {
    // 类名先挂上（样式表在页面里直接引入），第一次画桌就是新排法；金线那层 svg 等脚本到了再画，不会先显示旧布局再跳
    const on = 'def'.includes(GZRIM.rim);
    els.app.classList.add('gzr', 'gzr-' + (on ? 'a' : GZRIM.rim), 'gzr-lobby-' + GZRIM.lobby, ...(on ? ['gzr-on', 'gzr-' + GZRIM.rim] : []));
    loadRimPv();
  }
  $('gzChatBtn').addEventListener('click', () => { if (social && socialOk()) social.openChat($('gzChatBtn')); });
  els.seats[0].addEventListener('click', (e) => {
    if (!e.target.closest('.gz-avatar') || !match || match.tutorial || match.demo || match.lobby || AUTO) return;
    if (match.online) {
      if (!online || !online.inGame || !match.round || online.watching) return;
      const on = !onlineAuto();
      onlineAct('auto', { on });
      if (on) { statsAuto = true; toast('托管中：机器人替你出牌。点头像或手牌收回'); }
      return;
    }
    if (autopilot) { setAutopilot(false); return; }
    if (!match.round) return;
    setAutopilot(true);
    takeOverNow();
    toast('托管中：机器人替你出牌。点头像或手牌收回');
  });
  // 点弹窗外面关掉（见 openDialog）
  els.mask.addEventListener('click', (e) => {
    if (e.target !== els.mask) return;
    if (finIntro && els.dialog.classList.contains('is-intro')) { finIntro(); return; }   // 盘终收尾的入场动画还在放：点哪里都是跳过
    // 没有「好 / 取消」的弹窗（结算页等）点外面不关，主键晃一下提醒要点按钮（照百变小咪）
    const b = !els.dialog.querySelector('[data-close]') && els.dialog.querySelector('.gz-btn-primary:not([disabled])');
    if (b) { shake(b); return; }
    dismissDialog();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && subMask && !subMask.hidden) { closeSub(); return; }
    if (e.key === 'Escape' && !els.mask.hidden) dismissDialog();
    if (coverOn || !match) return;
    // 焦点停在按钮 / 输入框上：回车是按那个键（或在框里换行），不能顺带把选中的牌打出去
    const t = e.target, onControl = !!(t && t.closest && t.closest('button, input, textarea, select, a[href], [contenteditable="true"]'));
    if ((e.key === ' ' || e.key === 'Enter') && els.mask.hidden && coachNext && !onControl) { e.preventDefault(); coachAdvance(); return; }
    if (e.key === 'Enter' && els.mask.hidden && !onControl && (!subMask || subMask.hidden)) playSelected();
  });
  /* 窗口变了：防抖后重算尺寸。牌局里（照百变小咪）只在页面在前台、且宽度真变了（转屏 / 拉窗口，差 40px 以上）时才重算——
   * 手机切后台截快照会把网页临时转成横屏、浏览器工具栏伸缩也发 resize，量到的是临时尺寸，回来就一直错着。
   * 「请转屏」提示正盖着、或牌桌已经放不下时照常重算（提示要能自己收起 / 弹出）。没在打牌（主菜单）就每次都算。
   * 尺寸不重算时，吃牌区的红桃扇还是按现在的座位宽度重排一遍（它的叠放间距是按像素写死的） */
  let resizeTimer = 0;
  const viewW = () => document.documentElement.clientWidth || window.innerWidth;
  const inGame = () => !!match && !coverOn;
  const resizeNow = () => {
    if (inGame() && document.hidden) return;
    const fitOn = $('gzFit') && !$('gzFit').hidden;
    // 宽度没怎么变、牌桌也还放得下：不重算（只改高度把桌子挤出界了——比如电脑上把窗口拉矮——照样重算）
    if (inGame() && !fitOn && Math.abs(viewW() - sizeW) < 40 && tableFits()) { refitCaps(); return; }
    solveSize(); if (match) { renderHand(); refitCaps(); }
  };
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeNow();
      // 转屏时浏览器的布局常常晚一拍才稳定，过一会儿再量一次
      resizeTimer = setTimeout(resizeNow, 320);
    }, 80);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  // 回到前台：在后台时没量，复核一次
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onResize(); });
  // 输完收起键盘：补量一次（输入时跳过了）
  document.addEventListener('focusout', () => { if (!typing()) onResize(); });

  /* 单机存档：封面「单机」接着打用（见 playSolo）；坏档 / 旧版本 / 打完的不认 */
  // 存档自检：任何一张牌在手牌 / 吃牌 / 桌上出现两次，就是坏档（旧版本留下的或被改过），直接作废重开
  function saneMatch(m) {
    const ok = (lists) => { const all = lists.flat(); return all.every((c) => Number.isInteger(c) && c >= 0 && c < 52) && new Set(all).size === all.length; };
    const r = m.round;
    if (r && !ok([...r.hands, ...r.captured, r.trick.map((p) => p.card)])) return false;
    if (m.last && !ok(m.last.captured)) return false;
    return true;
  }
  function loadSaved() {
    const saved = readJSON(STORE_KEY);
    if (!saved || saved.v !== VERSION || !saved.match || saved.match.over || !saneMatch(saved.match)) return null;
    const m = saved.match;
    m.rules = R.normalizeRules(m.rules);
    return m;
  }

  /* ───── 封面 · 暂停 ─────
   * 进来时怎么走（boot，详见文件末尾）：
   *  · 动画预览 ?fxdemo=… → 预览；本机自测 ?gzauto=1 → 直接打单机，不出封面
   *  · 其余先停在封面（主菜单），进度条跑完露出「单机」「联机」，不硬接回上次的牌局：
   *    单机有存档 → 「单机」下面写「接着打第 N 局」；上次的联机房间问得到、还在 → 进度条跑完直接接回房间，
   *    问不到（断网 / 服务器没醒）→ 「联机」下面写「回到房间 1234」；
   *    点邀请链接 ?room=1234 进来 → 进度条跑完弹「加入房间」（房号已填好），单机存档原样不动
   * 打着单机切到后台（微信回个消息）也算暂停：机器人不偷跑、我的钟不走，回来点「继续」。联机不暂停（别人在等）。 */
  let coverOn = false;
  let liveRoom = null;   // 上次在的联机房间（主菜单里「联机」= 回到这个房间）
  function showCover(msg) {
    const el = $('gzCover');
    coverOn = true;
    closeDialog(); closeMenu(); hideCoach();
    if (soundPanel) soundPanel.hidden = true;
    const art = el.querySelector('.gz-cover-art');
    if (!art.innerHTML) art.innerHTML = ART.pig;
    const m = soloBots() ? match : loadSaved();
    const resume = el.querySelector('[data-cover="solo"] small');
    resume.textContent = m && (m.round || m.last) ? '接着打第 ' + m.roundNo + ' 局' : '';
    resume.hidden = !resume.textContent;
    el.querySelector('[data-cover="online"]').hidden = !NET;
    if (liveRoom && (!NET || !NET.readSession())) liveRoom = null;
    el.querySelector('[data-cover="online"] small').textContent = liveRoom ? '回到房间 ' + liveRoom.code : '创建 / 加入房间';
    el.querySelector('[data-cover="tutorial"]').textContent = readJSON(TUT_KEY) ? '新手教程' : '第一次玩？先学一局';
    el.querySelector('[data-cover="exit"]').hidden = !FROM_SITE;
    coverStep('main');
    el.hidden = false;
    els.app.classList.add('is-cover');
    if (coverUi) coverUi.show();
    if (msg) toast(msg);
  }
  function hideCover() {
    coverOn = false;
    $('gzCover').hidden = true;
    els.app.classList.remove('is-cover');
    if (coverUi) coverUi.hide();
  }
  // 封面两步：先选单机 / 联机；联机再选创建 / 加入
  function coverStep(k) {
    $('gzCover').querySelectorAll('[data-cover-step]').forEach((x) => { x.hidden = x.dataset.coverStep !== k; });
  }

  // 单机停下来：作废所有排着的回调（机器人出牌、动画），钟停住，存一下。之后从 playSolo 原样接着打——和刷新页面后接存档走的是同一条路
  function freezeSolo() {
    if (!soloBots()) return;
    clearScene(true);
    stopClock();
    busy = true;
    exposeWait = null;
    save();
  }
  /* 暂停页预览（?gzmenu=pause-a|pause-b）：甲 照百变小咪——正中一个大暂停图标，下面左「主页面」（小房子）右「继续」（播放三角）；
   * 乙 保留竖排两颗大键，只把「暂停」两个大字换成同一个图标。点窗外 / Esc 都等于继续（「继续」带 data-close） */
  const PAUSE_IC = '<div class="gz-pause-ic" role="img" aria-label="暂停"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><rect x="34" y="28" width="11" height="44" rx="3.5"/><rect x="55" y="28" width="11" height="44" rx="3.5"/></svg></div>';
  const PLAY_IC = '<svg class="gz-btn-ic is-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  const HOME_IC = '<svg class="gz-btn-ic" viewBox="0 0 24 24" aria-hidden="true">' + MENU_ICONS.cover + '</svg>';
  function showPause() {
    const html = MENU_PV.pause === 'pause-a'
      ? PAUSE_IC + '<div class="gz-actions"><button type="button" class="gz-btn" data-act="cover">' + HOME_IC + '主页面</button>' +
        '<button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>' + PLAY_IC + '继续</button></div>'
      : (MENU_PV.pause === 'pause-b' ? PAUSE_IC : '<h2>暂停</h2>') +
        '<div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>继续</button>' +
        '<button type="button" class="gz-btn" data-act="cover">回到主页面</button></div>';
    openDialog(html,
      (d) => {
        d.classList.add('is-pause');
        if (MENU_PV.pause) d.classList.add('is-' + MENU_PV.pause);
        d.querySelector('[data-close]').addEventListener('click', () => { closeDialog(); playSolo(match); });
        d.querySelector('[data-act="cover"]').addEventListener('click', () => showCover());
      });
  }
  // 进单机：给了这一盘就接着打（打到哪算哪），没给就新开一盘
  function playSolo(m) {
    hideCover();
    stopClock();
    busy = false; selected = -1; exposePick = []; ov.held = []; exposeWait = null;   // ov.trick 留着：暂停打断的那一轮由 step 重放
    if (!m) { newMatch(); startRound(); return; }
    match = m;
    if (!match.bots) match.bots = drawBots();   // 老存档没有机器人名字：现在抽一次，记进去
    applySoloIdentity();
    save();
    renderAll();
    if (match.round) step();
    else if (match.last) showSettlement();
    else startRound();
  }
  // 切到后台：单机一局正打着、没开着别的弹窗，就停下来，回来看到「暂停中」
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || AUTO || coverOn || !soloBots() || !match.round || !els.mask.hidden) return;
    closeMenu();
    if (soundPanel) soundPanel.hidden = true;   // 声音面板层级比弹窗高，不收会压在暂停页上
    freezeSolo();
    showPause();
  });

  $('gzMenuBtn').addEventListener('click', toggleMenu);
  $('gzPauseBtn').addEventListener('click', () => {
    if (coverOn || !soloBots() || !match.round || !els.mask.hidden) return;
    closeMenu();
    if (soundPanel) soundPanel.hidden = true;
    freezeSolo();
    showPause();
  });
  $('gzCover').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cover]');
    if (!b) return;
    const k = b.dataset.cover;
    if (k === 'solo' && firstAsk(b)) return;   // 预览：第一次点单机问「直接开 / 跟我学」（见 firstAsk）
    if (coverUi && coverUi.click(k, b)) return;
    if (k === 'solo') playSolo(soloBots() ? match : loadSaved());
    else if (k === 'online') {
      if (!liveRoom) { NET.warm(); coverStep('online'); return; }
      const sess = liveRoom;
      resumeOnline(sess).then((ok) => {
        if (ok) return;
        if (NET.readSession()) { showCover('连不上服务器，过一会儿再试'); return; }
        liveRoom = null; showCover('上次的房间已经没了');
        if (!coverUi || !coverUi.click('online')) coverStep('online');
      });
    }
    else if (k === 'back') coverStep('main');
    else if (k === 'create') createRoom();
    else if (k === 'join') showJoin('');
    else if (k === 'tutorial') { hideCover(); startTutorial(!readJSON(TUT_KEY)); }
    else if (k === 'exit') location.href = '/toolbox/';
  });
  // 大厅：点座位（空位加机器人 / 坐过去，机器人换档，房主请人离开）；中间面板的几个按钮
  els.table.addEventListener('click', (e) => {
    if (ov.deal) { skipDeal(); return; }   // 发牌中点一下：直接发完
    if (countdown) return;
    const seat = e.target.closest('[data-lseat]');
    if (seat && online && match && match.lobby) { showSeatMenu(+seat.dataset.lseat); return; }
    const lb = e.target.closest('[data-lb]');
    if (!lb || !online) return;
    const act = lb.dataset.lb;
    if (act === 'copy-link') copyText(NET.inviteUrl(online.code), '邀请链接已复制');
    if (act === 'rules') showRoomRules('view');
    if (act === 'start') hostStart();
    if (act === 'sit') watchSit();
    if (act === 'leave') askConfirm('离开房间？', '', '离开', () => leaveOnline(null, true));
  });

  /* ───── 动画预览：?fxdemo=sweep|eat|clash|sheepdbl|pigdbl|triple ─────
   * 在真牌桌上反复放「一轮结束」那一下（走的就是正式出牌时的同一套收牌 / 特效代码），不动存档。 */
  const H12 = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  const DEMOS = {
    sweep: ['没分的一轮', [1, 4, 7, 11]],            // ♠3 ♠6 ♠9 ♠K：全钻进赢家头像
    eat: ['有分的一轮', [42, 46, 18, 50]],           // ♣5 ♣9 ♥7(垫) ♣K：红桃插进吃牌区，其余进头像
    insert: ['插进红桃扇', [42, 46, 18, 50], [13, 15, 20, 22]],   // 赢家已有 ♥2 ♥4 ♥9 ♥J，♥7 要插到中间
    clash: ['猪羊对撞', [27, 35, 10, 38]],           // ♦3 ♦J ♠Q(垫) ♦A
    sheepdbl: ['羊 × 变压器', [28, 35, 47, 38]],     // ♦4 ♦J ♣10(垫) ♦A
    pigdbl: ['猪 × 变压器', [1, 10, 47, 12]],        // ♠3 ♠Q ♣10(垫) ♠A
    triple: ['猪羊变压器三角对撞', [27, 35, 10, 47, 38]],   // ♦3 ♦J ♠Q ♣10 ♦A（取后四张）
    // 全红 + 猪 / 羊 / ×2：赢家已吃 ♥2–♥K，这一轮再收 ♥A 凑齐 13 张
    ahpig: ['全红 + 猪', [42, 50, 25, 10], H12],               // ♣5 ♣K ♥A(垫) ♠Q(垫)
    ahsheep: ['全红 + 羊', [42, 50, 25, 35], H12],             // ♣5 ♣K ♥A ♦J
    ahdbl: ['全红 + ×2', [42, 47, 25, 50], H12],               // ♣5 ♣10 ♥A ♣K
    ahpigsheep: ['全红 + 猪羊', [42, 10, 25, 35], H12],        // ♣5 ♠Q ♥A ♦J
    ahpigdbl: ['全红 + 猪 ×2', [42, 10, 25, 47], H12],         // ♣5 ♠Q ♥A ♣10
    ahsheepdbl: ['全红 + 羊 ×2', [42, 35, 25, 47], H12],       // ♣5 ♦J ♥A ♣10
  };
  // ?fxdemo=deal：开局发牌一遍遍循环播，「再发一次」重播
  function startDealDemo() {
    match = { demo: true, rules: R.normalizeRules({}), totals: [0, 0, 0, 0], roundNo: 1, pigTaker: -1, seed: 1, round: null, exposing: [], last: null, over: false };
    let seed = 7;
    const fresh = () => { match.round = R.createRound(R.deal(R.makeRng(seed++)), 0, -1, match.rules); };
    fresh();
    busy = true;
    renderAll();
    const bar = document.createElement('div');
    bar.className = 'gz-demo';
    bar.innerHTML = '<b>发牌预览</b><button type="button" data-again>再发一次</button><a href="' + location.pathname + '">去牌桌</a>';
    bar.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('[data-again]')) go(); });
    els.table.appendChild(bar);
    const cr = els.center.getBoundingClientRect();   // 挪到桌子中下方，别挡住上面三家
    bar.style.top = Math.round(cr.top + cr.height * 0.74) + 'px';
    let timer = 0;
    const go = () => {
      clearTimeout(timer);
      token++;
      fresh();
      dealIntro().then(() => { busy = true; renderHand(); timer = setTimeout(go, 2200); });
    };
    setTimeout(go, 500);
  }
  /* ?fxdemo=final（配 ?gzpv=final-a|b|c，不带 = 现状）：一组固定的假数据直接演「一盘结束」——桌上累计分数完 → 收尾页。
   * &case= one 下家当猪（默认）/ me 我当猪 / tie 两家并列当猪 + 两家并列第一 / stop 「不设终点」叫停、不评猪 */
  const FIN_CASES = {
    one: ['下家当猪', [185, -1045, 320, -160], [[1, 3], [2, 2], [3, 1]]],
    me: ['我当猪', [-1010, 240, 95, -310], [[0, 4], [3, 2], [1, 1]]],
    tie: ['两家并列当猪', [140, -1020, 140, -1020], [[1, 3], [3, 3], [2, 1]]],
    stop: ['叫停不评猪', [-380, 210, 455, -90], [[0, 2], [3, 1], [1, 1]]],
  };
  const FIN_VERS = { '': '现状', 'final-b1': '乙一 红榜', 'final-b2': '乙二 经折', 'final-b3': '乙三 宣纸卷', 'final-b3a': '卷·素绢灰青', 'final-b3a1': '素绢·章在分数左', 'final-b3a2': '素绢·头像换成猪', 'final-b3b': '卷·檀木赭石', 'final-b3c': '卷·水墨', 'final-b3d': '卷·青绿', 'final-b': '乙 旧卷轴', 'final-c': '丙 原表加奖章', 'final-a': '甲 领奖台' };
  function startFinalDemo() {
    const q = new URLSearchParams(location.search);
    const cs = FIN_CASES[q.get('case')] ? q.get('case') : 'one';
    const [, totals, pigBy] = FIN_CASES[cs];
    const A = window.GongzhuAvatars;
    if (A) { NAMES = ['我', A.BOT_NICKS[0], A.BOT_NICKS[4], A.BOT_NICKS[7]]; AVATARS = ['我'].concat([0, 3, 5].map((i) => 'svg:' + A.ROBOT[i % A.ROBOT.length].id)); buildSeats(); }
    const rules = R.normalizeRules(cs === 'stop' ? { end: 'none' } : {});
    // 九局的吃牌：猪 / 羊按 pigBy 分给各家（[座位, 吃猪次数]），羊轮着给；最后一局再配一手红桃，结算表有东西看
    const pigSeats = [].concat(...pigBy.map(([seat, n]) => Array(n).fill(seat)));
    const history = [];
    for (let k = 1; k <= 9; k++) {
      const r = R.createRound(R.deal(R.makeRng(k)), 0, -1, rules);
      r.captured = [[], [], [], []];
      if (k <= pigSeats.length) r.captured[pigSeats[k - 1]].push(R.PIG);
      r.captured[(k * 3) % 4].push(R.SHEEP);
      if (k === 9) { r.captured[2].push(13, 15, 20, R.DOUBLER); r.captured[1].push(17, 22, 24); r.captured[0].push(14); }
      history.push({ roundNo: k, captured: r.captured, scores: R.roundScores(r), ctx: R.scoreCtx(r) });
    }
    const last = history[8];
    const before = totals.map((x, s) => x - last.scores[s]);
    let boot = 0;
    const go = () => {
      clearTimeout(boot);   // 开场那一下还没到就点了「重播」：别再播第二遍
      token++; closeDialog();
      match = { demo: true, rules, totals: before.slice(), roundNo: 9, pigTaker: -1, seed: 1, round: null, exposing: [], last, history, over: true, losers: cs === 'stop' ? [] : undefined };
      busy = true;
      renderAll();
      const my = token;
      setTimeout(() => {
        if (my !== token) return;
        match.totals = totals.slice();
        settleOnTable(() => { matchEndSound(); showSettlement(); });
      }, 700);
    };
    finDemoReplay = go;
    const bar = document.createElement('div');
    bar.className = 'gz-demo gz-demo-fin';
    const opt = (o, cur) => Object.keys(o).map((k) => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + o[k][0] + '</option>').join('');
    bar.innerHTML = '<b>盘终预览</b><select data-v aria-label="版本">' + Object.keys(FIN_VERS).map((k) => '<option value="' + k + '"' + (k === GZPV ? ' selected' : '') + '>' + FIN_VERS[k] + '</option>').join('') + '</select>' +
      '<select data-c aria-label="局面">' + opt(FIN_CASES, cs) + '</select><button type="button" data-again>重播</button>';
    bar.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('[data-again]')) go(); });
    bar.addEventListener('change', () => {
      const u = new URLSearchParams({ fxdemo: 'final' });
      if (bar.querySelector('[data-v]').value) u.set('gzpv', bar.querySelector('[data-v]').value);
      u.set('case', bar.querySelector('[data-c]').value);
      location.search = '?' + u.toString();
    });
    els.app.appendChild(bar);
    boot = setTimeout(go, 400);
  }
  function startDemo(kind) {
    if (kind === 'deal') { startDealDemo(); return; }
    if (kind === 'final') { startFinalDemo(); return; }
    if (kind === 'play') { startPlayDemo(); return; }
    const demo = DEMOS[kind] ? kind : 'sweep';
    match = { demo: true, rules: R.normalizeRules({}), totals: [0, 0, 0, 0], roundNo: 1, pigTaker: -1, seed: 1, round: null, exposing: [], last: null, over: false };
    match.round = R.createRound(R.deal(R.makeRng(7)), 0, -1, match.rules);
    busy = true;
    renderAll();
    const bar = document.createElement('div');
    bar.className = 'gz-demo';
    bar.innerHTML = '<b>动画预览</b><select data-demo aria-label="局面">' +
      Object.keys(DEMOS).map((k) => '<option value="' + k + '"' + (k === demo ? ' selected' : '') + '>' + DEMOS[k][0] + '</option>').join('') + '</select>' +
      '<a href="' + location.pathname + '">回到牌桌</a>';
    bar.addEventListener('change', () => { location.search = '?fxdemo=' + bar.querySelector('[data-demo]').value; });
    els.table.appendChild(bar);
    let k = 0;
    const loop = () => {
      const r = match.round;
      const cards = DEMOS[demo][1].slice(-4);
      const leader = k++ % 4;
      const plays = cards.map((c, i) => ({ seat: (leader + i) % 4, card: c }));
      const w = R.trickWinner(plays);
      const pre = DEMOS[demo][2] || [];
      r.captured = [[], [], [], []];
      r.captured[w] = pre.slice();
      r.exposed = [];
      ov.trick = null;
      renderSeats();
      renderTrick(plays);
      schedule(() => {
        r.captured[w] = pre.concat(cards.filter(R.isScoring));
        const done = { winner: w, plays };
        ov.trick = { match, done, talk: null, hold: new Set(cards.filter(R.isScoring)), onTable: true, lead: false, fxing: false, replay: false };
        showLead(-1);
        const fxMs = playTrickFx(done, planTrickFx(done));
        if (fxMs) setFxing(true);
        schedule(() => {
          setFxing(false);
          schedule(loop, flyTrick(plays, w) + 1500);
        }, fxMs ? Math.max(0, fxMs - 150) : 0);
      }, 1100);
    };
    schedule(loop, 500);
  }

  /* ───── 封面：单机 / 联机的设置单（2026-11-22 用户在三版预览里挑了甲，界面在 gongzhu-cover.js）─────
   * 这里只把它要用的几样递过去；它没装上（脚本没加载到）就照老样子：单机一步开局、联机两层 */
  let coverUi = null;
  // 单机新开一盘（不管有没有存档）；bots 给了就用这三位（设置单上先摆出来、各自选了档位的那三位）
  function playSoloFresh(bots) {
    hideCover();
    stopClock();
    clearScene();
    busy = false; selected = -1; exposePick = []; ov.held = []; exposeWait = null;
    setAutopilot(false);
    if (social) social.clear();
    newMatch();
    if (bots && bots.length === 3) { match.bots = bots; applySoloIdentity(); }
    startRound();
  }
  // 封面上直接用房号进房间（不弹「加入房间」框）：昵称用记着的，没有就让服务器随机起；失败抛出去由封面显示
  async function joinByCode(code, mode) {
    if (match && match.tutorial) throw { error: 'tutorial' };
    const ident = window.GamesShell && GamesShell.Identity;
    const nick = (ident && ident.getNick && ident.getNick()) || '';
    const res = await withConn(mode === 'watch' ? '正在进房间观战…' : '正在进房间…', () => NET.join(code, nick, mode === 'watch' ? 'watch' : 'play'));
    startOnline(res.state, res.token, true);
    if (res.fellBack === 'room_full') toast('房间满了，先观战；有空位时可以坐下');
    else if (res.fellBack === 'wait_round_end') toast('这一局还在打，先观战；打完这一局就能坐下');
  }
  try {
    coverUi = window.GongzhuCover && window.GongzhuCover.install({
      cover: $('gzCover'), settings, R, NET, TIER_LABELS, TIER_ORDER, RULE_UI,
      saveSettings: () => writeJSON(SETTINGS_KEY, settings),
      saved: () => (soloBots() ? match : loadSaved()),
      resume: (m) => playSolo(m),
      fresh: playSoloFresh,
      drawBots,
      face: (id) => (window.GongzhuAvatars ? GongzhuAvatars.svg(id) : ''),
      me: soloMe,
      createRoom, showJoin, joinByCode,
      liveRoom: () => liveRoom,
      openDialog, closeDialog, toast, coverStep, esc,
    });
  } catch (_) { coverUi = null; }

  buildSeats();
  solveSize();
  const demoParam = new URLSearchParams(location.search).get('fxdemo');
  if (demoParam) { hideCover(); startDemo(demoParam); return; }
  /* 进来先停在主菜单：拱猪大字下面跑一条进度条（字体、上次的房间还在不在），跑完才露出「单机」「联机」。
   * 不再一进来就硬接回上次的牌局 / 房间（接房间要等服务器醒过来，常常白屏好几秒）：
   *  · 单机有存档 → 「单机」下面写「接着打第 N 局」，点了接着打
   *  · 上次在联机房间里、房间还在 → 进度条跑完直接接回房间；服务器明确说房间没了（401 / 404）就悄悄忘掉；
   *    连不上 / 问不到 → 「联机」下面写「回到房间 1234」，点了再试
   *  · 点邀请链接进来 → 进度条跑完弹「加入房间」（房号已填好）；邀请的就是上次那个房间 → 同上「回到房间」
   * 本机自测 ?gzauto=1 不出主菜单，直接打单机 */
  const roomParam = (new URLSearchParams(location.search).get('room') || '').trim();
  let invite = NET && /^\d{4}$/.test(roomParam) ? roomParam : '';
  let sess = NET && NET.readSession();
  if (sess && invite && invite !== sess.code) { NET.writeSession(null); sess = null; }   // 换了个房间的邀请：上一个房间就不回了
  if (sess && invite === sess.code) invite = '';
  if (AUTO) { hideCover(); playSolo(loadSaved()); return; }
  coverOn = true;
  els.app.classList.add('is-cover');
  coverStep('load');
  const cover = $('gzCover');
  cover.querySelector('.gz-cover-art').innerHTML = ART.pig;
  const bar = cover.querySelector('.gz-cover-load i');
  let got = 0.12;
  const bump = (to) => { got = Math.max(got, to); bar.style.transform = 'scaleX(' + got.toFixed(3) + ')'; };
  bump(0.25);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = performance.now();
  let roomNow = null;   // 启动时问到的房间现状（房间还在才有）
  Promise.all([
    (document.fonts ? Promise.race([document.fonts.ready, sleep(1500)]) : Promise.resolve()).then(() => bump(got + 0.3)),
    // 上次的房间还在不在（顺带把可能睡着的服务器叫醒，之后建房 / 进房快）；最多等 4 秒。
    // 只有服务器明确回 401 / 404 才算房间没了；连不上 / 等不到都当它还在，封面上留「回到房间」，点的时候再说
    (sess ? Promise.race([NET.state(sess.code, sess.token, 0).then((res) => (res && res.state ? res : 'unknown'),
      (e) => (e && (e.status === 401 || e.status === 404) ? 'gone' : 'unknown')), sleep(4000).then(() => 'unknown')]) : Promise.resolve(null))
      .then((r) => { if (sess && r === 'gone') { NET.writeSession(null); sess = null; } if (r && r.state) roomNow = r; bump(got + 0.3); }),
  ]).then(async () => {
    await sleep(Math.max(0, 650 - (performance.now() - t0)));   // 太快也让进度条走完一程，不闪
    bump(1);
    await sleep(220);
    liveRoom = sess;
    // 房间确实还在：直接接回去，不用再点「回到房间」（封面垫在底下，接回去就收起）
    if (sess && roomNow) { showCover(); startOnline(roomNow.state, sess.token); return; }
    showCover();
    if (invite) showJoin(invite);
  });
})();
