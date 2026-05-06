/* games-shell/settlement.js
 * 通用结算图合成 + 浮层显示模块。挂在 window.GamesShell.Settlement 下。
 *
 * 用法（在游戏 index.html 末尾、game-over 钩子里）:
 *
 *   const btn = GamesShell.Settlement.mountButton({
 *     container: document.getElementById('settle-btn-mount'),
 *     gameId: '2048',
 *     label: '📸 保存这局结算图',
 *     getOpts: () => ({
 *       kind: 'single',
 *       gameId: '2048',
 *       title: '2048',
 *       emoji: '🟧',
 *       nick: GamesShell.Identity.getNick(),
 *       score: state.score,
 *       scoreLabel: '本 局 得 分',
 *       rankInfo: { rank, total, mode: '4×4' },     // 可选
 *       stats: [{ label: '最大方块', value: 2048 }],
 *       paintBoard: (ctx, x, y, w, h) => { ... },
 *       boardAspect: 1,                              // 默认 1
 *       watermark: 'zirconeey.github.io/toolbox/2048',
 *     }),
 *   });
 *   btn.setEnabled(false);                            // 游戏未结束时禁用
 *
 *   // duel 模式（对弈）：
 *   getOpts: () => ({
 *     kind: 'duel',
 *     opponent: 'AI · 普通',
 *     result: 'win' | 'lose' | 'draw',
 *     stats: [{ label: '用时', value: '5:23' }, { label: '走子', value: 38 }],
 *     paintBoard, ...
 *   })
 */
(function () {
  'use strict';
  const GS = window.GamesShell = window.GamesShell || {};

  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
  const SERIF = 'Georgia, "Times New Roman", "STSong", serif';

  function getColors() {
    const isDark = (typeof matchMedia === 'function')
      && (matchMedia('(prefers-color-scheme: dark)').matches
          || document.documentElement.getAttribute('data-theme') === 'dark');
    if (isDark) return {
      bgTop: '#2a2418', bgBot: '#1f1a10',
      ink: '#e8d8b8', muted: '#9c8e72',
      accent: '#f0c674', divider: 'rgba(255,255,255,0.08)',
      win: '#7dc88a', lose: '#e07c7c', draw: '#9c8e72',
    };
    return {
      bgTop: '#fef6e4', bgBot: '#f9e8c4',
      ink: '#1e3a5f', muted: '#7d8a9c',
      accent: '#c4923f', divider: 'rgba(30,58,95,0.08)',
      win: '#5fa66e', lose: '#c0392b', draw: '#7d8a9c',
    };
  }

  function pathRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 合成结算图，返回 PNG dataURL（失败返回 ''）。
  function compose(opts) {
    if (!opts || typeof opts.paintBoard !== 'function') {
      console.warn('[gs:settlement] paintBoard required');
      return '';
    }
    try {
      const kind = opts.kind === 'duel' ? 'duel' : 'single';
      const PAD = 18;
      const HEADER_H = 56;
      const boardW = opts.boardW || 480;
      const boardAspect = opts.boardAspect || 1;
      const boardH = Math.round(boardW / boardAspect);
      const colors = getColors();
      const stats = Array.isArray(opts.stats) ? opts.stats.filter(s => s && s.label != null) : [];

      // Footer 高度按内容动态算
      let FOOTER_H;
      if (kind === 'duel') {
        FOOTER_H = 22 + 44 + (opts.opponent ? 24 : 0) + stats.length * 22 + 32;
      } else {
        FOOTER_H = 22 + 56 + 30 + stats.length * 22 + 32;
      }

      const W = boardW + PAD * 2;
      const H = HEADER_H + boardH + FOOTER_H;

      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const ctx = off.getContext('2d');

      // 背景渐变
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, colors.bgTop);
      grad.addColorStop(1, colors.bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ===== HEADER =====
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      let tx = PAD;
      if (opts.emoji) {
        ctx.fillStyle = colors.ink;
        ctx.font = `26px ${FONT}`;
        ctx.fillText(opts.emoji, tx, HEADER_H / 2);
        tx += 38;
      }
      ctx.fillStyle = colors.ink;
      ctx.font = `600 20px ${FONT}`;
      ctx.fillText(opts.title || '', tx, HEADER_H / 2);

      if (opts.nick) {
        ctx.fillStyle = colors.muted;
        ctx.font = `13px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText('玩家  ' + opts.nick, W - PAD, HEADER_H / 2);
      }

      // header 分隔线
      ctx.strokeStyle = colors.divider;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, HEADER_H - 0.5);
      ctx.lineTo(W - PAD, HEADER_H - 0.5);
      ctx.stroke();

      // ===== BOARD =====
      const RADIUS = 14;
      const gx = PAD, gy = HEADER_H, gw = boardW, gh = boardH;
      ctx.save();
      pathRoundRect(ctx, gx, gy, gw, gh, RADIUS);
      ctx.clip();
      try {
        opts.paintBoard(ctx, gx, gy, gw, gh);
      } catch (e) {
        console.warn('[gs:settlement] paintBoard threw:', e);
      }
      ctx.restore();

      // 边框
      ctx.save();
      pathRoundRect(ctx, gx + 0.5, gy + 0.5, gw - 1, gh - 1, RADIUS);
      ctx.strokeStyle = colors.divider;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // board / footer 分隔线
      ctx.beginPath();
      ctx.moveTo(PAD, HEADER_H + boardH + 0.5);
      ctx.lineTo(W - PAD, HEADER_H + boardH + 0.5);
      ctx.strokeStyle = colors.divider;
      ctx.stroke();

      // ===== FOOTER =====
      const footerTop = HEADER_H + boardH;
      let y = footerTop + 22;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (kind === 'duel') {
        const RESULT_TEXT = { win: '胜！', lose: '负', draw: '和棋' };
        const resultText = RESULT_TEXT[opts.result] || '';
        const resultColor = opts.result === 'win' ? colors.win
                          : opts.result === 'lose' ? colors.lose
                          : colors.draw;
        ctx.fillStyle = resultColor;
        ctx.font = `700 36px ${SERIF}`;
        ctx.fillText(resultText, W / 2, y);
        y += 30;

        if (opts.opponent) {
          ctx.fillStyle = colors.ink;
          ctx.font = `14px ${FONT}`;
          ctx.fillText(opts.opponent, W / 2, y);
          y += 24;
        }
      } else {
        ctx.fillStyle = colors.muted;
        ctx.font = `11px ${FONT}`;
        ctx.fillText(opts.scoreLabel || '本 局 得 分', W / 2, y);
        y += 36;

        const fmt = opts.scoreFormatter || (v => String(v));
        const scoreText = fmt(opts.score);
        ctx.fillStyle = colors.accent;
        ctx.font = `700 44px ${SERIF}`;
        ctx.fillText(scoreText, W / 2, y);
        y += 38;

        ctx.fillStyle = colors.ink;
        ctx.font = `14px ${FONT}`;
        const ri = opts.rankInfo || {};
        let rankText;
        if (ri.rank && ri.total) {
          rankText = ri.mode
            ? `第 ${ri.rank} 名 · 共 ${ri.total} 位 · ${ri.mode}`
            : `第 ${ri.rank} 名 · 共 ${ri.total} 位玩家`;
        } else if (ri.failed) {
          rankText = '排行榜暂时不可用';
        } else if (ri.pending) {
          rankText = '本局未上传到排行榜';
        } else {
          rankText = '排名加载中…';
        }
        ctx.fillText(rankText, W / 2, y);
        y += 24;
      }

      // stats 行
      ctx.fillStyle = colors.muted;
      ctx.font = `12px ${FONT}`;
      for (const s of stats) {
        ctx.fillText(`${s.label}  ${s.value}`, W / 2, y);
        y += 22;
      }

      // 水印
      ctx.fillStyle = colors.muted;
      ctx.font = `10px ${FONT}`;
      ctx.fillText(opts.watermark || 'zirconeey.github.io', W / 2, H - 14);

      return off.toDataURL('image/png');
    } catch (e) {
      console.warn('[gs:settlement] compose failed:', e);
      return '';
    }
  }

  function isIosUA() {
    const ua = String(navigator.userAgent || '');
    return /iPhone|iPad|iPod/i.test(ua);
  }

  function doDownload(dataURL, filename) {
    if (isIosUA()) {
      const w = window.open();
      if (w) {
        w.document.title = filename || 'snapshot.png';
        w.document.body.style.cssText = 'margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;';
        const wrap = w.document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
        const img = w.document.createElement('img');
        img.src = dataURL;
        img.style.cssText = 'max-width:100%;height:auto;';
        const tip = w.document.createElement('p');
        tip.textContent = '长按图片选择"存储到照片"';
        tip.style.cssText = 'color:#fff;text-align:center;font-family:-apple-system,sans-serif;font-size:0.9rem;margin:1rem;';
        wrap.append(img, tip);
        w.document.body.appendChild(wrap);
      } else {
        alert('请允许弹窗，或长按结算面板里的图片自行保存');
      }
      return;
    }
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename || 'snapshot.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // 弹出预览浮层
  function present(opts) {
    if (!opts || !opts.dataURL) return;
    const old = document.getElementById('gs-settle-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'gs-settle-overlay';
    overlay.className = 'gs-settle-overlay';

    const card = document.createElement('div');
    card.className = 'gs-settle-card';

    const img = document.createElement('img');
    img.className = 'gs-settle-img';
    img.src = opts.dataURL;
    img.alt = '结算图';

    const tip = document.createElement('p');
    tip.className = 'gs-settle-tip';
    tip.textContent = isIosUA()
      ? '长按图片可存到照片；或点下方按钮在新标签页打开'
      : '长按 / 右键图片可另存；或点下方按钮直接下载 PNG';

    const actions = document.createElement('div');
    actions.className = 'gs-settle-actions';

    const btnDownload = document.createElement('button');
    btnDownload.type = 'button';
    btnDownload.className = 'gs-settle-primary';
    btnDownload.textContent = isIosUA() ? '🌐 在新标签打开' : '⬇ 下载 PNG';
    btnDownload.addEventListener('click', () => doDownload(opts.dataURL, opts.filename));

    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'gs-settle-secondary';
    btnClose.textContent = '关闭';

    function close() {
      overlay.classList.remove('gs-open');
      setTimeout(() => overlay.remove(), 250);
      try { opts.onClose && opts.onClose(); } catch {}
    }
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    actions.append(btnDownload, btnClose);
    card.append(img, tip, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('gs-open'));
  }

  // 在 container 里挂一个"📸 保存这局"按钮
  function mountButton(opts) {
    if (!opts || !opts.container || typeof opts.getOpts !== 'function') {
      throw new Error('GamesShell.Settlement.mountButton: container and getOpts required');
    }
    let btn = opts.container.querySelector('.gs-settle-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gs-settle-btn';
      if (opts.gameId) btn.dataset.game = opts.gameId;
      const labelText = opts.label || '保存这局结算图';
      btn.innerHTML = '<span class="gs-settle-btn-emoji">📸</span><span>'
        + labelText.replace(/^📸\s*/, '') + '</span>';
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const settleOpts = opts.getOpts();
        if (!settleOpts) return;
        const dataURL = compose(settleOpts);
        if (!dataURL) return;
        const ts = Date.now();
        const idPart = settleOpts.gameId || opts.gameId || 'game';
        const scorePart = (settleOpts.score != null) ? settleOpts.score
          : (settleOpts.result || 'snapshot');
        const filename = `${idPart}_${scorePart}_${ts}.png`;
        present({ dataURL, filename });
      });
      opts.container.appendChild(btn);
    }
    btn.disabled = !!opts.startDisabled;
    return {
      element: btn,
      setEnabled(enabled) { btn.disabled = !enabled; },
      setLabel(text) {
        btn.innerHTML = '<span class="gs-settle-btn-emoji">📸</span><span>'
          + String(text).replace(/^📸\s*/, '') + '</span>';
      },
      remove() { btn.remove(); },
    };
  }

  GS.Settlement = { compose, present, mountButton };
})();
