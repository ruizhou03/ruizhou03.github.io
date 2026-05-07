/* games-shell/nick-prompt.js
 * 通用"想上排行榜？起个昵称吧"表单。
 *
 * 用法：把 mountNickForm 装进游戏结束的 overlay 内一个 <div>。
 * 已经有 nick 时只显示一个 tag（"以 X 上传 · 换昵称"）。
 *
 *   GamesShell.NickPrompt.mount({
 *     container: document.getElementById('nick-mount'),
 *     prompt: '想上排行榜？起个昵称吧',
 *     onSubmit: nick => submitToLeaderboard(nick),
 *     onSkip: () => renderRankSlot('hidden'),
 *   });
 *
 * 调 .show() 显示表单，.hide() 隐藏，.refresh() 根据当前 localStorage 的 nick 状态重渲。
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};

  function mount(opts) {
    if (!opts || !opts.container) throw new Error('NickPrompt.mount: container required');
    const c = opts.container;
    c.innerHTML = `
      <div class="gs-nick-form">
        <div class="gs-nick-prompt"></div>
        <div class="gs-nick-privacy"></div>
        <input type="text" maxlength="36" placeholder="3-12 字 · 中英 / 数字 / 标点 / emoji 都算" autocomplete="off" />
        <div class="gs-nick-error"></div>
        <div class="gs-nick-buttons">
          <button type="button" class="gs-nick-skip">本局不上传</button>
          <button type="button" class="gs-nick-submit">上榜</button>
        </div>
      </div>
      <div class="gs-nick-tag" style="display: none;">
        以 <strong></strong> 上传 · <a>换昵称</a>
      </div>
    `;
    const form = c.querySelector('.gs-nick-form');
    const promptEl = c.querySelector('.gs-nick-prompt');
    const privacyEl = c.querySelector('.gs-nick-privacy');
    const inputEl = c.querySelector('input');
    const errorEl = c.querySelector('.gs-nick-error');
    const skipBtn = c.querySelector('.gs-nick-skip');
    const submitBtn = c.querySelector('.gs-nick-submit');
    const tag = c.querySelector('.gs-nick-tag');
    const tagNick = tag.querySelector('strong');
    const tagChange = tag.querySelector('a');

    promptEl.textContent = opts.prompt || '想上排行榜？起个昵称吧';
    privacyEl.textContent = opts.privacy || '提交后，本局成绩会和昵称一起送到我自己的小服务器，仅用于显示排行榜';

    function refresh() {
      const nick = GS.Identity && GS.Identity.getNick();
      if (nick) {
        form.classList.remove('gs-open');
        tag.style.display = '';
        tagNick.textContent = nick;
      } else {
        tag.style.display = 'none';
      }
    }

    function show() {
      const nick = GS.Identity && GS.Identity.getNick();
      if (nick) {
        // 已有昵称：直接 onSubmit 即可（外部决定是否再问）
        if (typeof opts.onSubmit === 'function') opts.onSubmit(nick);
        return;
      }
      form.classList.add('gs-open');
      errorEl.textContent = '';
      inputEl.value = '';
      inputEl.focus();
    }
    function hide() {
      form.classList.remove('gs-open');
    }

    submitBtn.addEventListener('click', () => {
      const v = GS.Identity.validateNick(inputEl.value);
      if (!v.ok) { errorEl.textContent = v.reason; return; }
      GS.Identity.setNick(v.nick);
      refresh();
      hide();
      if (typeof opts.onSubmit === 'function') opts.onSubmit(v.nick);
    });
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitBtn.click(); }
    });
    skipBtn.addEventListener('click', () => {
      hide();
      if (typeof opts.onSkip === 'function') opts.onSkip();
    });
    tagChange.addEventListener('click', () => {
      GS.Identity.clearNick();
      refresh();
      show();
    });

    refresh();

    return {
      show, hide, refresh,
      element: c,
    };
  }

  GS.NickPrompt = { mount };
})();
