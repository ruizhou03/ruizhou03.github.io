/* 拱猪 · 封面（2026-11-22 用户在三版预览里挑了甲，照百变小咪）：
 *  · 点「单机」从底下升起设置单（横屏是右侧抽屉），封面标题插画原地不动：有存档时顶上一张「接着打」卡（四个头像 + 累计分），
 *    机器人三位（点头像单独换档，名字头像跟着档位换）、档位三格、出牌限时、一盘到哪结束、玩法变体、开始 / 新开一盘（有存档要点两下）
 *  · 点「联机」同款单子：创建房间、房号 + 加入、只观战（上次的房间还在时「联机」= 回到房间，不走单子）
 *  · 标题插画钉在固定高度、主按钮一样高、横屏左右两栏（左插画右按钮）
 * 选项即点即存进 settings（和局内「设置」同一份）。gongzhu.js 启动时调 install，把要用的几样递过来 */
(function () {
  'use strict';

  function install(A) {
    const S = A.settings;
    const cover = A.cover;
    const inner = cover.querySelector('.gz-cover-inner');
    const esc = A.esc;
    cover.classList.add('gzc');

    // 版式：插画 + 标题 + 进度条收进左（上）一块，按钮那些收进右（下）一块——竖屏上下、横屏左右
    const head = document.createElement('div');
    head.className = 'gzc-head';
    const side = document.createElement('div');
    side.className = 'gzc-side';
    [...inner.children].forEach((x) => {
      (x.matches('.gz-cover-art, .gz-cover-title, .gz-cover-load') ? head : side).appendChild(x);
    });
    inner.appendChild(head);
    inner.appendChild(side);

    /* ───── 选项 ───── */
    const SEC_OPTS = [[20, '20 秒'], [30, '30 秒'], [0, '不限时']];
    const TIER_OPTS = A.TIER_ORDER.map((k) => [k, A.TIER_LABELS[k]]);
    const END_OPTS = A.RULE_UI.find((x) => x[0] === 'end')[2];
    const VARIANT_ROWS = A.RULE_UI.filter((x) => x[0] !== 'end');
    let tierTouched = false;
    const getOpt = (k) => (k === 'tier' ? S.tier : k === 'sec' ? (S.turnSec | 0) : S.rules[k]);
    function setOpt(k, v) {
      if (k === 'tier') { S.tier = v; delete S.botTiers; tierTouched = true; pend = null; }   // 名字头像跟着档位走：三位换成新档的人
      else if (k === 'sec') S.turnSec = v;
      else S.rules = A.R.normalizeRules(Object.assign({}, S.rules, { [k]: v }));
      A.saveSettings();
    }
    const optsOf = (k) => (k === 'tier' ? TIER_OPTS : k === 'sec' ? SEC_OPTS : A.RULE_UI.find((x) => x[0] === k)[2]);
    function segHtml(k) {
      const opts = optsOf(k);
      const pressed = (v) => (k === 'tier' && botTierMixed() ? false : getOpt(k) === v);
      return '<div class="gz-seg gzc-seg' + (opts.length > 3 ? ' is-4' : '') + '" role="group">' +
        opts.map(([v, t], i) => '<button type="button" data-cvk="' + k + '" data-cvi="' + i + '" aria-pressed="' + pressed(v) + '">' + t + '</button>').join('') + '</div>';
    }
    const row = (label, html) => '<div class="gzc-row"><span class="gzc-k">' + label + '</span><div class="gzc-v">' + html + '</div></div>';

    /* ───── 机器人（点某个头像单独换档）─────
     * 先把这一盘要来的三位摆出来（名字、头像抽好），开局就用这三位；各自换过档就记在 settings.botTiers */
    let pend = null;
    const pendBots = () => pend || (pend = A.drawBots(S.tier) || []);
    // 单独换了档的那一位：从新档的名字 / 头像里另抽一位（不和另两位撞）
    function redrawBot(i, tier) {
      const others = pendBots().filter((_, j) => j !== i);
      const pool = (A.drawBots(tier) || []).concat(A.drawBots(tier) || []);
      const pick = pool.find((b) => others.every((o) => o.nick !== b.nick && o.avatar !== b.avatar));
      if (pick) pend[i] = pick;
    }
    const botTier = (i) => (S.botTiers && S.botTiers[i]) || S.tier;
    const botTierMixed = () => !!(S.botTiers && S.botTiers.some((t, i) => t && botTier(i) !== S.tier));
    function botsHtml() {
      return '<div class="gzc-bots">' + pendBots().map((b, i) =>
        '<button type="button" class="gzc-bot" data-cv="bot" data-i="' + i + '" aria-label="' + esc(b.nick) + '：' + A.TIER_LABELS[botTier(i)] + '">' +
        '<i class="gzc-av">' + A.face(b.avatar) + '</i><span class="gzc-tier t-' + botTier(i) + '">' + A.TIER_LABELS[botTier(i)] + '</span></button>').join('') + '</div>';
    }
    function botsForStart() {
      const b = pendBots();
      if (b.length !== 3) return null;
      const mixed = botTierMixed();
      const out = b.map((x, i) => Object.assign({ nick: x.nick, avatar: x.avatar }, mixed ? { tier: botTier(i) } : {}));
      pend = null;   // 下一盘再抽新的三位
      return out;
    }

    /* ───── 存档：接着打第 N 局（四个头像 + 累计分的小条，少写字）───── */
    const saved = () => { const m = A.saved(); return m && (m.round || m.last) ? m : null; };
    const fmt = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
    function stripHtml(m) {
      const t = m.totals || [0, 0, 0, 0];
      const me = A.me && A.me();   // 单机身份预览（?gzmenu=me-*）：我也换成矢量头像
      const faces = ['<i class="gzc-av is-me">' + (me && me.face.startsWith('svg:') ? A.face(me.face.slice(4)) : '我') + '</i>'].concat((m.bots || []).map((b) => '<i class="gzc-av">' + A.face(b.avatar) + '</i>'));
      return '<span class="gzc-strip">' + faces.map((f, i) => '<span class="gzc-pl">' + f + '<b class="' + (t[i] < 0 ? 'neg' : t[i] > 0 ? 'pos' : '') + '">' + fmt(t[i]) + '</b></span>').join('') + '</span>';
    }
    function resumeHtml(m) {
      return '<button type="button" class="gzc-resume" data-cv="resume"><span class="gzc-rtx"><b>接着打</b><small>第 ' + m.roundNo + ' 局</small></span>' +
        stripHtml(m) + '<i class="gzc-go" aria-hidden="true"></i></button>';
    }
    function doResume() {
      const m = A.saved();
      if (!m) return;
      if (tierTouched && m.bots) { const fresh = A.drawBots(S.tier); if (fresh) m.bots = fresh; }   // 刚改过档位：接着打的这一盘也换成这一档的三位（同局内「设置」）
      A.resume(m);
    }
    // 有存档时「新开一盘」要点两下：第一下变成「确定新开？」，3 秒内再点才开（一盘拱猪很长，别一碰就没了）
    function armNew(btn) {
      if (!saved() || btn.classList.contains('is-armed')) return true;
      btn.classList.add('is-armed');
      const b = btn.querySelector('b'), sm = btn.querySelector('small');
      const old = [b.textContent, sm ? sm.textContent : ''];
      b.textContent = '确定新开？';
      if (sm) sm.textContent = '上一盘作废';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove('is-armed'); b.textContent = old[0]; if (sm) sm.textContent = old[1]; }, 3000);
      return false;
    }
    function doNew(btn) { if (!armNew(btn)) return; A.fresh(botsForStart()); }

    /* ───── 联机：创建 / 房号 / 加入 / 观战 同一层 ───── */
    function onlineHtml() {
      return '<button type="button" class="gz-cover-btn is-primary" data-cv="create"><b>创建房间</b><small>邀请朋友来</small></button>' +
        '<div class="gzc-or"><span>或</span></div>' +
        '<div class="gzc-join"><input class="gz-input gzc-code" data-cv-code inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 位房号" aria-label="房号">' +
        '<button type="button" class="gz-cover-btn" data-cv="join"><b>加入</b></button></div>' +
        '<p class="gzc-err" data-cv-err hidden></p>' +
        '<button type="button" class="gz-cover-link gzc-watch" data-cv="watch">只观战</button>';
    }
    function bindOnline(root) {
      const code = root.querySelector('[data-cv-code]');
      code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 4); root.querySelector('[data-cv-err]').hidden = true; });
      code.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); join(root, 'play'); } });
    }
    let joining = false;
    async function join(root, mode) {
      if (joining) return;
      const code = root.querySelector('[data-cv-code]'), err = root.querySelector('[data-cv-err]');
      const c = code.value.trim();
      if (!/^\d{4}$/.test(c)) { err.textContent = '房号是 4 位数字'; err.hidden = false; code.focus(); return; }
      joining = true;
      try { await A.joinByCode(c, mode); }
      catch (e) { err.textContent = e && e.error === 'tutorial' ? '先打完或跳过教程，再开联机' : A.NET.message(e); err.hidden = false; }
      finally { joining = false; }
    }

    /* ───── 单机设置单的内容 ───── */
    function soloHtml() {
      const m = saved();
      return (m ? resumeHtml(m) : '') +
        row('机器人', botsHtml() + segHtml('tier')) +
        row('限时', segHtml('sec')) +
        row('终点', segHtml('end')) +
        '<button type="button" class="gz-cover-link gzc-more" data-cv="variants">玩法变体</button>' +
        '<button type="button" class="gz-cover-btn is-primary gzc-start" data-cv="new"><b>' + (m ? '新开一盘' : '开始') + '</b><small>' + (m ? '从 0 分打起' : '') + '</small></button>';
    }

    function showVariants() {
      const m = saved();
      A.openDialog('<h2>玩法变体</h2>' +
        VARIANT_ROWS.map(([k, label]) => '<div class="gz-field-label">' + label + '</div>' + segHtml(k)).join('') +
        (m ? '<p class="gz-note">从新开的一盘起生效</p>' : '') +
        '<div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
        (d) => {
          d.addEventListener('click', onSeg);
          d.querySelector('[data-close]').addEventListener('click', A.closeDialog);
        });
    }

    // 分段选项：点了就存，同组的按下态跟着换（档位换了，机器人那一排也跟着换成新档的人）
    function onSeg(e) {
      const b = e.target.closest('[data-cvk]');
      if (!b) return false;
      const k = b.dataset.cvk;
      setOpt(k, optsOf(k)[+b.dataset.cvi][0]);
      const root = b.closest('.gzc-sheet, .gz-dialog') || cover;
      root.querySelectorAll('[data-cvk="' + k + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (k === 'tier') { const bots = root.querySelector('.gzc-bots'); if (bots) bots.outerHTML = botsHtml(); }
      return true;
    }

    /* ───── 设置单（竖屏从底下升起；横屏是右侧抽屉）───── */
    let mask = null, sheet = null, sheetGen = 0;
    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    function openSheet(kind) {
      if (!mask) {
        mask = document.createElement('div');
        mask.className = 'gzc-mask';
        mask.hidden = true;
        mask.innerHTML = '<div class="gzc-sheet" role="dialog" aria-modal="true"><i class="gzc-grab" aria-hidden="true"></i>' +
          '<button type="button" class="gzc-x" data-cv="close" aria-label="收起"></button><div class="gzc-body"></div></div>';
        cover.appendChild(mask);
        sheet = mask.firstElementChild;
        mask.addEventListener('click', (e) => { if (e.target === mask) closeSheet(); });
        dragToClose(sheet);
      }
      sheetGen++;
      mask.classList.remove('is-out');
      sheet.dataset.kind = kind;
      const body = sheet.querySelector('.gzc-body');
      body.innerHTML = kind === 'solo' ? soloHtml() : onlineHtml();
      if (kind === 'online') { bindOnline(body); A.NET.warm(); }
      mask.hidden = false;
      sheet.style.transform = '';
      if (!reduce()) { mask.classList.remove('is-in'); void mask.offsetWidth; mask.classList.add('is-in'); }
    }
    function closeSheet(now) {
      if (!mask || mask.hidden) return;
      const gen = ++sheetGen;
      if (now || reduce()) { mask.hidden = true; return; }
      mask.classList.remove('is-in');
      mask.classList.add('is-out');
      setTimeout(() => { if (gen === sheetGen) { mask.hidden = true; mask.classList.remove('is-out'); sheet.style.transform = ''; } }, 230);
    }
    // 往下拖设置单：跟手，拖过 80px（或甩得快）就收起；横屏抽屉不拖
    function dragToClose(sh) {
      let y0 = null, t0 = 0, dy = 0;
      sh.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, input, summary') || matchMedia('(orientation: landscape) and (max-height: 540px)').matches) return;
        y0 = e.clientY; t0 = performance.now(); dy = 0;
        try { sh.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      });
      sh.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = 'translateY(' + dy + 'px)'; });
      const end = () => {
        if (y0 == null) return;
        const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
        y0 = null;
        if (dy > 80 || (fast && dy > 24)) closeSheet(); else sh.style.transform = '';
      };
      sh.addEventListener('pointerup', end);
      sh.addEventListener('pointercancel', end);
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mask && !mask.hidden && document.querySelector('#gzDialogMask[hidden]')) closeSheet();
    });


    cover.addEventListener('click', (e) => {
      if (onSeg(e)) return;
      const b = e.target.closest('[data-cv]');
      if (!b || !cover.contains(b)) return;
      const k = b.dataset.cv;
      const root = b.closest('.gzc-sheet') || side;
      if (k === 'close') closeSheet();
      else if (k === 'resume') doResume();
      else if (k === 'new') doNew(b);
      else if (k === 'variants') showVariants();
      else if (k === 'create') A.createRoom();
      else if (k === 'join') join(root, 'play');
      else if (k === 'watch') join(root, 'watch');
      else if (k === 'bot') {
        const i = +b.dataset.i;
        const order = A.TIER_ORDER;
        const t = order[(order.indexOf(botTier(i)) + 1) % order.length];
        S.botTiers = [0, 1, 2].map((j) => (j === i ? t : botTier(j)));
        redrawBot(i, t);
        if (S.botTiers.every((x) => x === S.tier)) delete S.botTiers;
        A.saveSettings();
        const box = b.closest('.gzc-row');
        box.querySelector('.gzc-bots').outerHTML = botsHtml();
        box.querySelectorAll('[data-cvk="tier"]').forEach((x, j) => x.setAttribute('aria-pressed', String(!botTierMixed() && TIER_OPTS[j][0] === S.tier)));
      }
    });

    return {
      show() { closeSheet(true); },
      hide() { closeSheet(true); },
      // 封面原有的「单机」「联机」键：换成升起设置单；上次的房间还在时「联机」照原样回房间（return false）
      click(k) {
        if (k === 'solo') { openSheet('solo'); return true; }
        if (k === 'online' && !A.liveRoom()) { openSheet('online'); return true; }
        return false;
      },
    };
  }

  window.GongzhuCover = { install };
})();
