/* games-shell/comments.js
 * Waline 评论区包装。
 *
 *   GamesShell.Comments.mount({
 *     container: document.getElementById('cm-mount'),
 *     path: '/toolbox/2048/',
 *     title: '💬 来玩玩交流',
 *     intro: '分享你最高分截图...',
 *     placeholder: '聊聊 2048 心得...',
 *   });
 *
 * 容器会被替换为 .gs-comments-wrap > h3 + .gs-comments-intro + .gs-comments-mount。
 * Waline import 失败时静默 console.warn，不显示任何东西。
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};
  const WALINE_SERVER = 'https://zircon-comments.vercel.app';
  const WALINE_MJS = 'https://unpkg.com/@waline/client@v2/dist/waline.mjs';
  const EMOJI_CDN = '//unpkg.com/@waline/emojis@1.1.0/tieba';

  function mount(opts) {
    if (!opts || !opts.container || !opts.path) {
      throw new Error('GamesShell.Comments.mount: container and path required');
    }
    const wrap = opts.container;
    wrap.classList.add('gs-comments-wrap');
    const title = opts.title || '💬 评论交流';
    const intro = opts.intro || '欢迎留言交流游戏心得。';
    const placeholder = opts.placeholder || '说点什么…';
    const mountId = 'gs-cm-' + Math.random().toString(36).slice(2, 8);
    wrap.innerHTML = `
      <h3>${title}</h3>
      <p class="gs-comments-intro">${intro}</p>
      <div class="gs-comments-mount" id="${mountId}"></div>
    `;
    const mountEl = wrap.querySelector('.gs-comments-mount');

    import(WALINE_MJS).then(({ init }) => {
      wrap.classList.add('gs-loaded');
      init({
        el: '#' + mountId,
        serverURL: WALINE_SERVER,
        // 显式 path 避免 trailing slash / 大小写差异
        path: opts.path,
        dark: 'auto',
        lang: 'zh-CN',
        emoji: [EMOJI_CDN],
        placeholder,
        pageview: true,
        comment: true,
        requiredMeta: [],
        locale: { reactionTitle: '', preview: '👀 开启 Markdown 预览', anonymous: '神秘玩家' },
      });
      // 用占位符标记的 meta 字段——便于在窄屏隐藏 mail/link 只留 nick
      const fields = { nick: '昵称（可选）', mail: '邮箱（可选）', link: '网址（可选）' };
      const patchMeta = () => {
        Object.entries(fields).forEach(([name, ph]) => {
          const input = mountEl.querySelector(`input[name="${name}"]`);
          if (!input) return;
          if (input.placeholder !== ph) input.placeholder = ph;
          const wrapper = input.closest('.wl-header-item') || input.parentElement;
          if (wrapper && wrapper.dataset.walineField !== name) wrapper.dataset.walineField = name;
        });
      };
      new MutationObserver(patchMeta).observe(mountEl, { childList: true, subtree: true });
    }).catch(e => console.warn('[games-shell:comments] waline load failed:', e));
  }

  GS.Comments = { mount };
})();
