/* 拱猪 · 封面改版预览（2026-11-22）：?gzpv=cover-a | cover-b | cover-c 才会加载（见 gongzhu.js「封面改版预览」）。
 * 用户挑定之前线上默认不变；挑定后把那一版并进 gongzhu.js / gongzhu.css，这个文件和另两版一起删掉。
 *  · 甲 cover-a：照百变小咪——点「单机」从底下升起设置单（横屏是右侧抽屉），点「联机」同款单子；封面原地不动
 *  · 乙 cover-b：不弹单子——点「单机」「联机」在封面按钮区原地换成选项，标题插画不动、按钮宽度不变
 *  · 丙 cover-c：最小改动——单机仍一步开局；有存档时拆成「接着打」「新开一盘」；脚注加「设置」；联机合成一层
 * 三版共用：标题插画钉在固定高度（不再随下面内容多少上下跳）、主按钮一样高、横屏左右两栏（左插画右按钮）；
 * 选项即点即存进 settings（和局内「设置」同一份）。 */
(function () {
  'use strict';

  function install(A) {
    const V = A.variant.slice(-1);   // a / b / c
    const S = A.settings;
    const cover = A.cover;
    const inner = cover.querySelector('.gz-cover-inner');
    const esc = A.esc;
    cover.classList.add('gzpv', 'gzpv-' + V);

    // 版式：插画 + 标题 + 进度条收进左（上）一块，按钮那些收进右（下）一块——竖屏上下、横屏左右
    const head = document.createElement('div');
    head.className = 'gzpv-head';
    const side = document.createElement('div');
    side.className = 'gzpv-side';
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
      if (k === 'tier') { S.tier = v; delete S.pvBotTiers; tierTouched = true; }
      else if (k === 'sec') S.turnSec = v;
      else S.rules = A.R.normalizeRules(Object.assign({}, S.rules, { [k]: v }));
      A.saveSettings();
    }
    const optsOf = (k) => (k === 'tier' ? TIER_OPTS : k === 'sec' ? SEC_OPTS : A.RULE_UI.find((x) => x[0] === k)[2]);
    function segHtml(k) {
      const opts = optsOf(k);
      const pressed = (v) => (k === 'tier' && botTierMixed() ? false : getOpt(k) === v);
      return '<div class="gz-seg gzpv-seg' + (opts.length > 3 ? ' is-4' : '') + '" role="group">' +
        opts.map(([v, t], i) => '<button type="button" data-pvk="' + k + '" data-pvi="' + i + '" aria-pressed="' + pressed(v) + '">' + t + '</button>').join('') + '</div>';
    }
    const row = (label, html) => '<div class="gzpv-row"><span class="gzpv-k">' + label + '</span><div class="gzpv-v">' + html + '</div></div>';

    /* ───── 机器人（甲：点某个头像单独换档）─────
     * 先把这一盘要来的三位摆出来（名字、头像抽好），开局就用这三位；各自换过档就记在 settings.pvBotTiers */
    let pend = null;
    const pendBots = () => pend || (pend = A.drawBots() || []);
    const botTier = (i) => (S.pvBotTiers && S.pvBotTiers[i]) || S.tier;
    const botTierMixed = () => !!(S.pvBotTiers && S.pvBotTiers.some((t, i) => t && botTier(i) !== S.tier));
    function botsHtml() {
      return '<div class="gzpv-bots">' + pendBots().map((b, i) =>
        '<button type="button" class="gzpv-bot" data-pv="bot" data-i="' + i + '" aria-label="' + esc(b.nick) + '：' + A.TIER_LABELS[botTier(i)] + '">' +
        '<i class="gzpv-av">' + A.face(b.avatar) + '</i><span class="gzpv-tier t-' + botTier(i) + '">' + A.TIER_LABELS[botTier(i)] + '</span></button>').join('') + '</div>';
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
      const faces = ['<i class="gzpv-av is-me">我</i>'].concat((m.bots || []).map((b) => '<i class="gzpv-av">' + A.face(b.avatar) + '</i>'));
      return '<span class="gzpv-strip">' + faces.map((f, i) => '<span class="gzpv-pl">' + f + '<b class="' + (t[i] < 0 ? 'neg' : t[i] > 0 ? 'pos' : '') + '">' + fmt(t[i]) + '</b></span>').join('') + '</span>';
    }
    function resumeHtml(m) {
      return '<button type="button" class="gzpv-resume" data-pv="resume"><span class="gzpv-rtx"><b>接着打</b><small>第 ' + m.roundNo + ' 局</small></span>' +
        stripHtml(m) + '<i class="gzpv-go" aria-hidden="true"></i></button>';
    }
    function doResume() {
      const m = A.saved();
      if (!m) return;
      if (tierTouched && m.bots) m.bots.forEach((b) => { delete b.tier; });   // 刚改过档位：接着打的这一盘也换成这一档（同局内「设置」）
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
      return '<button type="button" class="gz-cover-btn is-primary" data-pv="create"><b>创建房间</b><small>邀请朋友来</small></button>' +
        '<div class="gzpv-or"><span>或</span></div>' +
        '<div class="gzpv-join"><input class="gz-input gzpv-code" data-pv-code inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4 位房号" aria-label="房号">' +
        '<button type="button" class="gz-cover-btn" data-pv="join"><b>加入</b></button></div>' +
        '<p class="gzpv-err" data-pv-err hidden></p>' +
        '<button type="button" class="gz-cover-link gzpv-watch" data-pv="watch">只观战</button>';
    }
    function bindOnline(root) {
      const code = root.querySelector('[data-pv-code]');
      code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 4); root.querySelector('[data-pv-err]').hidden = true; });
      code.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); join(root, 'play'); } });
    }
    let joining = false;
    async function join(root, mode) {
      if (joining) return;
      const code = root.querySelector('[data-pv-code]'), err = root.querySelector('[data-pv-err]');
      const c = code.value.trim();
      if (!/^\d{4}$/.test(c)) { err.textContent = '房号是 4 位数字'; err.hidden = false; code.focus(); return; }
      joining = true;
      try { await A.joinByCode(c, mode); }
      catch (e) { err.textContent = e && e.error === 'tutorial' ? '先打完或跳过教程，再开联机' : A.NET.message(e); err.hidden = false; }
      finally { joining = false; }
    }

    /* ───── 单机设置（甲的单子、乙的原地面板共用）───── */
    function soloHtml(withBots) {
      const m = saved();
      return (m ? resumeHtml(m) : '') +
        (withBots ? row('机器人', botsHtml() + segHtml('tier')) : row('机器人', segHtml('tier'))) +
        row('限时', segHtml('sec')) +
        row('终点', segHtml('end')) +
        (V === 'a' ? '<button type="button" class="gz-cover-link gzpv-more" data-pv="variants">玩法变体</button>' : '') +
        '<button type="button" class="gz-cover-btn is-primary gzpv-start" data-pv="new"><b>' + (m ? '新开一盘' : '开始') + '</b><small>' + (m ? '从 0 分打起' : '') + '</small></button>';
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
    // 丙：脚注里的「设置」——在封面上就能改档位、限时、终点和玩法变体（局内「设置」去掉「重开一盘」那一版）
    function showSettingsC() {
      const m = saved();
      A.openDialog('<h2>设置</h2>' +
        '<div class="gz-field-label">AI 水平</div>' + segHtml('tier') +
        '<div class="gz-field-label">出牌限时</div>' + segHtml('sec') +
        '<div class="gz-field-label">一盘结束</div>' + segHtml('end') +
        '<details class="gz-variants"><summary>玩法变体</summary>' +
        VARIANT_ROWS.map(([k, label]) => '<div class="gz-field-label">' + label + '</div>' + segHtml(k)).join('') + '</details>' +
        (m ? '<p class="gz-note">规则改动从新开的一盘起生效</p>' : '') +
        '<div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>',
        (d) => {
          d.addEventListener('click', onSeg);
          d.querySelector('[data-close]').addEventListener('click', A.closeDialog);
        });
    }

    // 分段选项：点了就存，同组的按下态跟着换（档位换了，甲的机器人头像下面的档位签也跟着换）
    function onSeg(e) {
      const b = e.target.closest('[data-pvk]');
      if (!b) return false;
      const k = b.dataset.pvk;
      setOpt(k, optsOf(k)[+b.dataset.pvi][0]);
      const root = b.closest('.gzpv-sheet, .gzpv-panel, .gz-dialog') || cover;
      root.querySelectorAll('[data-pvk="' + k + '"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (k === 'tier') { const bots = root.querySelector('.gzpv-bots'); if (bots) bots.outerHTML = botsHtml(); }
      return true;
    }

    /* ───── 甲：设置单（竖屏从底下升起；横屏是右侧抽屉）───── */
    let mask = null, sheet = null, sheetGen = 0;
    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    function openSheet(kind) {
      if (!mask) {
        mask = document.createElement('div');
        mask.className = 'gzpv-mask';
        mask.hidden = true;
        mask.innerHTML = '<div class="gzpv-sheet" role="dialog" aria-modal="true"><i class="gzpv-grab" aria-hidden="true"></i>' +
          '<button type="button" class="gzpv-x" data-pv="close" aria-label="收起"></button><div class="gzpv-body"></div></div>';
        cover.appendChild(mask);
        sheet = mask.firstElementChild;
        mask.addEventListener('click', (e) => { if (e.target === mask) closeSheet(); });
        dragToClose(sheet);
      }
      sheetGen++;
      mask.classList.remove('is-out');
      sheet.dataset.kind = kind;
      const body = sheet.querySelector('.gzpv-body');
      body.innerHTML = kind === 'solo' ? soloHtml(true) : onlineHtml();
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

    /* ───── 乙 / 丙：原地换的面板（走封面自己的 coverStep，标题插画不动）───── */
    let soloPanel = null, onlinePanel = null;
    function panel(step) {
      const p = document.createElement('div');
      p.className = 'gzpv-panel';
      p.dataset.coverStep = step;
      p.hidden = true;
      side.insertBefore(p, side.querySelector('.gz-cover-foot'));
      return p;
    }
    if (V === 'b') soloPanel = panel('pv-solo');
    if (V === 'b' || V === 'c') onlinePanel = panel('pv-online');
    const backHtml = '<button type="button" class="gz-cover-link gzpv-back" data-pv="back">‹ 返回</button>';

    /* ───── 丙：有存档时「单机」拆成并排两张 ───── */
    let pair = null;
    if (V === 'c') {
      pair = document.createElement('div');
      pair.className = 'gzpv-pair';
      const soloBtn = side.querySelector('[data-cover="solo"]');
      soloBtn.parentNode.insertBefore(pair, soloBtn);
      const foot = side.querySelector('.gz-cover-foot');
      const tut = foot.querySelector('[data-cover="tutorial"]');
      const set = document.createElement('button');
      set.type = 'button';
      set.className = 'gz-cover-link';
      set.dataset.pv = 'settings';
      set.textContent = '设置';
      tut.after(set);
    }
    function refreshMain() {
      if (V !== 'c') return;
      const m = saved();
      const soloBtn = side.querySelector('[data-cover="solo"]');
      soloBtn.hidden = !!m;
      pair.hidden = !m;
      pair.innerHTML = m ? '<button type="button" class="gz-cover-btn is-primary" data-pv="resume"><b>接着打</b><small>第 ' + m.roundNo + ' 局</small></button>' +
        '<button type="button" class="gz-cover-btn" data-pv="new"><b>新开一盘</b><small>从 0 分</small></button>' : '';
    }

    cover.addEventListener('click', (e) => {
      if (onSeg(e)) return;
      const b = e.target.closest('[data-pv]');
      if (!b || !cover.contains(b)) return;
      const k = b.dataset.pv;
      const root = b.closest('.gzpv-sheet, .gzpv-panel') || side;
      if (k === 'close') closeSheet();
      else if (k === 'back') A.coverStep('main');
      else if (k === 'resume') doResume();
      else if (k === 'new') doNew(b);
      else if (k === 'variants') showVariants();
      else if (k === 'settings') showSettingsC();
      else if (k === 'create') A.createRoom();
      else if (k === 'join') join(root, 'play');
      else if (k === 'watch') join(root, 'watch');
      else if (k === 'bot') {
        const i = +b.dataset.i;
        const order = A.TIER_ORDER;
        const t = order[(order.indexOf(botTier(i)) + 1) % order.length];
        S.pvBotTiers = [0, 1, 2].map((j) => (j === i ? t : botTier(j)));
        if (S.pvBotTiers.every((x) => x === S.tier)) delete S.pvBotTiers;
        A.saveSettings();
        const box = b.closest('.gzpv-row');
        box.querySelector('.gzpv-bots').outerHTML = botsHtml();
        box.querySelectorAll('[data-pvk="tier"]').forEach((x, j) => x.setAttribute('aria-pressed', String(!botTierMixed() && TIER_OPTS[j][0] === S.tier)));
      }
    });

    return {
      show() {
        closeSheet(true);
        refreshMain();
      },
      hide() { closeSheet(true); },
      // 封面原有的键：拦下来换成这一版的走法；不拦（return false）就照原样
      click(k) {
        const live = !!A.liveRoom();
        if (V === 'a') {
          if (k === 'solo') { openSheet('solo'); return true; }
          if (k === 'online' && !live) { openSheet('online'); return true; }
          return false;
        }
        if (k === 'online' && !live) {
          onlinePanel.innerHTML = onlineHtml() + backHtml;
          bindOnline(onlinePanel);
          A.NET.warm();
          A.coverStep('pv-online');
          return true;
        }
        if (V === 'b' && k === 'solo') {
          soloPanel.innerHTML = soloHtml(false) + backHtml;
          A.coverStep('pv-solo');
          return true;
        }
        return false;
      },
    };
  }

  window.GongzhuCoverPV = { install };
})();
