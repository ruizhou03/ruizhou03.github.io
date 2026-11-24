/* 拱猪 · 房间首页（2026-11-24 用户定 b 整页请帖，默认就是 b；?gzroom=a 看弹窗版，?gzroom=0 = 改版前，见 gongzhu.js GZROOM）
 * 跟大厅的名帖一路：房号就是那张双线框小帖子，四个数字格，打一位亮一格。
 *   两版共用：封面「联机」那张单子——「创建房间」照旧在上；下面的房号框换成名帖（点帖子就能打字），打满 4 位「加入」才亮
 *   a 邀请弹窗：朋友点邀请链接进来，还是一个弹窗，但改成「有人邀你来打拱猪」+ 名帖（房号已填好）+ 名字一行 + 一个大「入座」，
 *     「只观战」「取消」收成底下一行小字
 *   b 整页请帖：同样的内容不弹窗，直接换掉封面下半截（拱猪插画和标题留在上面），像一张请帖；「取消」= 回到单机 / 联机两个键
 * 进房间的逻辑全走 gongzhu.js 的 joinAs（和原来的加入弹窗同一套校验和提示） */
(function () {
  'use strict';

  function create(kind, A) {
    const cover = A.cover;
    cover.classList.add('gzrm', 'gzrm-' + kind);

    /* 名帖：一张双线框小帖子，「房间」两个小金字 + 四个数字格；真正的输入框整块盖在帖子上、看不见，点帖子就能打字 */
    function cardHtml(code, attr) {
      return '<label class="gzrm-card"><span class="gzrm-lab">房间</span><span class="gzrm-slots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
        '<input class="gzrm-in" ' + attr + ' inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="4 位房号" value="' + A.esc(code || '') + '"></label>';
    }
    function bindCard(card, onChange) {
      const inp = card.querySelector('.gzrm-in'), slots = [...card.querySelectorAll('.gzrm-slots i')];
      const paint = () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
        const v = inp.value;
        slots.forEach((x, i) => { x.textContent = v[i] || ''; x.classList.toggle('is-on', !!v[i]); x.classList.toggle('is-at', document.activeElement === inp && i === Math.min(v.length, 3) && v.length < 4); });
        card.classList.toggle('is-full', v.length === 4);
        if (onChange) onChange(v);
      };
      inp.addEventListener('input', paint);
      inp.addEventListener('focus', paint);
      inp.addEventListener('blur', paint);
      paint();
      return { inp, paint };
    }

    /* ───── 封面「联机」单子 ───── */
    function enhanceSheet(body) {
      const join = body.querySelector('.gzc-join');   // 单子每次打开都重写内容：还有旧房号框就换一次（换完旧框就没了）
      if (!join) return;
      const old = join.querySelector('[data-cv-code]');
      const btn = join.querySelector('[data-cv="join"]');
      // 名帖里的输入框接管 data-cv-code（封面那边按这个读房号）；旧框拿掉
      const wrap = document.createElement('div');
      wrap.className = 'gzrm-join';
      wrap.innerHTML = cardHtml('', 'data-cv-code');
      old.remove();
      btn.classList.add('gzrm-go');
      btn.innerHTML = '<b>加入</b>';
      wrap.appendChild(btn);
      join.replaceWith(wrap);
      const { inp } = bindCard(wrap.querySelector('.gzrm-card'), (v) => btn.classList.toggle('is-ready', v.length === 4));
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
      const err = body.querySelector('[data-cv-err]');
      inp.addEventListener('input', () => { if (err) err.hidden = true; });
    }
    new MutationObserver(() => {
      const body = cover.querySelector('.gzc-sheet[data-kind="online"] .gzc-body');
      if (body) enhanceSheet(body);
    }).observe(cover, { childList: true, subtree: true });

    /* ───── 邀请进来 ───── */
    function invHtml(code) {
      return '<p class="gzrm-kicker">' + (code ? '有人邀你来打拱猪' : '加入房间') + '</p>' + cardHtml(code, 'data-code') +
        '<label class="gzrm-name"><span>名字</span><input class="gzrm-nick" data-nick maxlength="12" autocomplete="nickname" placeholder="不填就随机起一个" value="' + A.esc(A.nick()) + '"></label>' +
        '<p class="gzrm-err" data-err hidden></p>' +
        '<button type="button" class="gz-btn gz-btn-primary gzrm-sit" data-go><span>入座</span></button>' +
        '<p class="gzrm-links"><button type="button" class="gzrm-link" data-watch>只观战</button><i aria-hidden="true"></i><button type="button" class="gzrm-link" data-close>取消</button></p>';
    }
    function bindInv(root, onClose) {
      const { inp } = bindCard(root.querySelector('.gzrm-card'));
      const nick = root.querySelector('[data-nick]'), err = root.querySelector('[data-err]');
      const go = root.querySelector('[data-go]'), watch = root.querySelector('[data-watch]');
      let busy = false;
      const run = async (mode) => {
        if (busy) return;
        busy = true; go.disabled = true; watch.disabled = true; err.hidden = true;
        const msg = await A.joinAs(inp.value, nick.value, mode);
        busy = false; go.disabled = false; watch.disabled = false;
        if (msg) { err.textContent = msg; err.hidden = false; (/房号/.test(msg) ? inp : nick).focus(); }
        else if (onClose) onClose(true);
      };
      go.addEventListener('click', () => run('play'));
      watch.addEventListener('click', () => run('watch'));
      root.querySelector('[data-close]').addEventListener('click', () => onClose && onClose(false));
      [inp, nick].forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run('play'); } }));
      setTimeout(() => (inp.value.length === 4 ? go : inp).focus({ preventScroll: true }), 0);
    }

    function showJoin(code) {
      // 整页请帖只在封面露着、而且是带着房号进来（邀请链接）时用；局中菜单的「加入房间」封面是藏着的，走弹窗
      const coverUp = !cover.hidden && cover.offsetParent !== null;
      if (kind === 'a' || !code || !coverUp) {
        A.openDialog('<h2 class="gz-sr">加入房间</h2><div class="gzrm-inv">' + invHtml(code) + '</div>', (d) => {
          d.classList.add('gzrm-dlg');
          bindInv(d, (ok) => { if (!ok) A.closeDialog(); });
        });
        return;
      }
      // b：换掉封面下半截（单机 / 联机那两个键先藏起来，取消再放回来）
      const side = cover.querySelector('.gzc-side') || cover.querySelector('.gz-cover-inner');
      let page = side.querySelector('.gzrm-page');
      if (!page) { page = document.createElement('div'); page.className = 'gzrm-inv gzrm-page'; side.appendChild(page); }
      page.innerHTML = invHtml(code);
      side.classList.add('gzrm-inviting');
      bindInv(page, () => { side.classList.remove('gzrm-inviting'); page.remove(); });
    }

    return { showJoin };
  }

  window.GongzhuRoomPv = { create };
})();
