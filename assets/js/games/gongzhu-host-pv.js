/* 拱猪联机 · 房主管人 / 暂停 / 本房间战绩 —— 预览（2026-11-22，待用户挑版本）
 * 只在 ?gzhost= 时由 gongzhu.js 加载（见那边 GZHOST / loadHostPv），不带参数的页面根本不加载这个文件。
 *   房主那一排（点别人头像弹出的互动框里）：
 *     a  框底一排三个图标（托管 / 禁言 / 请离，照百变小咪）；被禁言的人头像左上角挂一枚「划掉的对话框」
 *     b  框底只有一个「管理」图标，点开一张小单子：大头像 + 三个带短标签的大圆键（开着的实心）；被禁言的人头像变灰、外圈虚线
 *     c  三个带短标签的开关挪到框最上面（先管人、再扔道具）；被禁言的人名字后面跟一个「划掉的对话框」小图标
 *   暂停：1 顶栏工具键（和单机的暂停键同一个位置），暂停时牌桌罩一层纸色，中间一张暂停卡（房主卡上有「继续」）
 *         2 左上角局数旁一颗小圆键，暂停时不罩牌桌：桌心一个淡淡的大暂停记号、房主头像角上挂暂停标，倒计时停住
 *   本房间战绩（大厅）：1 每个座位卡下面一排小点（最近 6 盘的名次，当猪那盘画成猪鼻子）+ 平均名次
 *                       2 大厅中间一张可展开的小表（平均名次 / 当猪次数 / 最近几盘）
 * 新后端才有的字段（game.paused、players[].muted、record）缺了就什么都不画：连现在线上的后端，预览页和现状一样。 */
(function () {
  'use strict';

  const IC = {
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="8" width="15" height="11" rx="3.5"/><path d="M12 4.5V8M9 13v1.2M15 13v1.2M2.5 13v2.5M21.5 13v2.5"/></svg>',
    unauto: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="8" width="15" height="11" rx="3.5"/><path d="M12 4.5V8M9 13v1.2M15 13v1.2M3 3l18 18"/></svg>',
    mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z"/><path d="M3 3l18 18"/></svg>',
    unmute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5Z"/><path d="M8.5 11h7"/></svg>',
    kick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M11 12h10M17.5 8.5 21 12l-3.5 3.5"/></svg>',
    manage: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.3 0 2.5.3 3.4.9"/><circle cx="17.5" cy="16.5" r="2.2"/><path d="M17.5 12.6v1.7M17.5 18.7v1.7M21.4 16.5h-1.7M15.3 16.5h-1.7M20.3 13.7l-1.2 1.2M15.9 18.1l-1.2 1.2M20.3 19.3l-1.2-1.2M15.9 14.9l-1.2-1.2"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 7v10M14.8 7v10"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6.5v11l9-5.5z"/></svg>',
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9.5h17M9 9.5V19"/></svg>',
    again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19.5 4.5v3.5H16"/></svg>',
  };

  function create(cfg, A) {
    const root = A.els.app;
    root.classList.add('gzh-row-' + cfg.row, 'gzh-pause-' + cfg.pause, 'gzh-rec-' + cfg.rec);
    let veil = null, chip = null, mark = null;

    const st = () => { const o = A.online(); return o && o.st; };
    const gv = () => { const s = st(); return s && s.game; };
    const supports = () => { const g = gv(); return !!(g && 'paused' in g); };   // 新后端才下发 paused
    const hostP = () => { const s = st(); return s ? s.players.find((p) => p.id === s.hostId) || null : null; };

    /* ───── 房主那一排 ───── */
    function target(l) {
      const s = st(), o = A.online();
      if (!s || !o || !o.inGame || o.watching || !A.isHost() || l === 0 || !supports()) return null;
      const p = A.playerAt(A.srv(l));
      return p && !p.isAi && !p.left ? p : null;
    }
    function toggleAuto(p) {
      const g = gv(), on = !(g && g.auto[p.seat]);
      A.act('host_auto', { seat: p.seat, on }).then((r) => { if (r) A.toast(on ? p.nick + '改由机器人托管，他点自己头像就能收回' : '已取消' + p.nick + '的托管'); });
    }
    function toggleMute(p) {
      const on = !p.muted;
      A.act('mute', { pid: p.id, on }).then((r) => { if (r) A.toast(on ? '已禁言' + p.nick : '已解除' + p.nick + '的禁言'); });
    }
    function askKick(p) {
      A.askConfirm('请' + p.nick + '离开？', '他这一座交给机器人打完这一局，之后别人可以坐进来。他这台设备 10 分钟内只能观战。', '请他离开', () => {
        A.act('kick', { pid: p.id }).then((r) => { if (r) A.toast('已请' + p.nick + '离开'); });
      });
    }
    function rowItems(p, withText) {
      const g = gv(), auto = !!(g && g.auto[p.seat]);
      const lb = (ic, t, on) => '<span class="gzh-act' + (on ? ' is-on' : '') + '" title="' + t + '">' + ic + (withText ? '<small>' + t + '</small>' : '') + '</span>';
      return [
        { label: lb(auto ? IC.unauto : IC.auto, auto ? '取消托管' : '托管', auto), on: () => toggleAuto(p) },
        { label: lb(p.muted ? IC.unmute : IC.mute, p.muted ? '解除禁言' : '禁言', p.muted), on: () => toggleMute(p) },
        { label: lb(IC.kick, '请离'), on: () => askKick(p) },
      ];
    }
    function extra(l) {
      const p = target(l);
      if (!p) return [];
      if (cfg.row === 'b') return [{ label: '<span class="gzh-act" title="管理">' + IC.manage + '</span>', on: () => manage(p) }];
      return rowItems(p, cfg.row === 'c');
    }
    // 乙：一张小单子（大头像 + 三个大圆键）
    function manage(p) {
      const g = gv(), auto = !!(g && g.auto[p.seat]);
      const key = (k, ic, t, on) => '<button type="button" class="gzh-big' + (on ? ' is-on' : '') + '" data-h="' + k + '" aria-pressed="' + !!on + '"><span>' + ic + '</span><small>' + t + '</small></button>';
      A.openDialog('<div class="gzh-sheet"><div class="gzh-sheet-av"><span class="gz-avatar"><span class="gz-av-face">' + A.faceHtml(A.avatarOf(p)) + '</span></span><b>' + A.esc(p.nick) + '</b></div>' +
        '<div class="gzh-bigs">' + key('auto', IC.auto, '托管', auto) + key('mute', IC.mute, '禁言', p.muted) + key('kick', IC.kick, '请离') + '</div></div>' +
        '<div class="gz-actions"><button type="button" class="gz-btn gz-btn-primary" data-close data-autofocus>好</button></div>', (d) => {
        d.querySelector('[data-close]').addEventListener('click', A.closeDialog);
        d.querySelectorAll('[data-h]').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.h;
          if (k === 'kick') { askKick(p); return; }
          b.classList.toggle('is-on'); b.setAttribute('aria-pressed', String(b.classList.contains('is-on')));
          if (k === 'auto') toggleAuto(p); else toggleMute(p);
        }));
      });
    }

    /* 头像上的标记（不写字） */
    function badge(l, el, p) {
      const muted = !!(p && !p.isAi && !p.left && p.muted);
      el.classList.toggle('gzh-muted', muted);
      const av = el.querySelector('.gz-avatar');
      if (cfg.row === 'a' && av) {
        let b = av.querySelector('.gzh-mb');
        if (!b && muted) { b = document.createElement('span'); b.className = 'gzh-mb'; b.innerHTML = IC.mute; av.appendChild(b); }
        if (b) b.hidden = !muted;
      }
      if (cfg.row === 'c') {
        const line = el.querySelector('.gz-name-line'), name = el.querySelector('.gz-name');
        let b = line && line.querySelector('.gzh-mn');
        if (!b && muted && name) { b = document.createElement('span'); b.className = 'gzh-mn'; b.innerHTML = IC.mute; name.after(b); }
        if (b) b.hidden = !muted;
      }
      // 暂停乙：房主头像角上挂暂停标
      if (cfg.pause === '2' && av) {
        const g = gv(), on = !!(g && g.paused && p && p.id === st().hostId);
        let b = av.querySelector('.gzh-pb');
        if (!b && on) { b = document.createElement('span'); b.className = 'gzh-pb'; b.innerHTML = IC.pause; av.appendChild(b); }
        if (b) b.hidden = !on;
      }
    }

    /* ───── 暂停 ───── */
    function canPause() {
      const o = A.online(), g = gv();
      return !!(o && o.inGame && !o.watching && A.isHost() && supports() && g.phase !== 'match_end');
    }
    function togglePause() {
      const g = gv();
      if (!canPause()) return;
      A.act('pause', { on: !g.paused });
    }
    function pauseUi() {
      const g = gv(), o = A.online();
      const paused = !!(o && o.inGame && g && g.paused && g.phase !== 'match_end');
      root.classList.toggle('gzh-paused', paused);
      if (cfg.pause === '1') {
        const btn = A.$('gzPauseBtn');
        if (o) {   // 单机时这颗键归单机管（applySoloIdentity），联机里归这里
          btn.hidden = !canPause();
          btn.classList.toggle('is-on', paused);
          btn.setAttribute('aria-pressed', String(paused));
        }
        if (paused && !veil) {
          veil = document.createElement('div');
          veil.className = 'gzh-veil';
          A.$('gzTable').appendChild(veil);
        }
        if (veil) {
          veil.hidden = !paused;
          if (paused) {
            const h = hostP();
            const key = (A.isHost() ? 'h' : 'g') + (h ? h.id + h.avatar : '');
            if (veil.dataset.k !== key) {
              veil.dataset.k = key;
              veil.innerHTML = '<div class="gzh-card"><span class="gzh-glyph">' + IC.pause + '</span>' +
                (h ? '<span class="gz-avatar gzh-host-av"><span class="gz-av-face">' + A.faceHtml(A.avatarOf(h)) + '</span></span>' : '') +
                (A.isHost() ? '<button type="button" class="gz-btn gz-btn-primary" data-resume>继续</button>' : '') + '</div>';
              const r = veil.querySelector('[data-resume]');
              if (r) r.addEventListener('click', togglePause);
            }
          }
        }
      } else {
        if (!chip && o) {
          chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'gzh-chip';
          chip.addEventListener('click', togglePause);
          A.$('gzRoundInfo').after(chip);
        }
        if (chip) {
          chip.hidden = !canPause();
          chip.innerHTML = paused ? IC.play : IC.pause;
          chip.setAttribute('aria-label', paused ? '继续' : '暂停');
          chip.classList.toggle('is-on', paused);
        }
        if (paused && !mark) {
          mark = document.createElement('div');
          mark.className = 'gzh-mark';
          mark.innerHTML = IC.pause;
          A.$('gzCenter').appendChild(mark);
        }
        if (mark) mark.hidden = !paused;
      }
    }
    if (cfg.pause === '1') {
      A.$('gzPauseBtn').addEventListener('click', (e) => {
        if (!A.online()) return;   // 单机：gongzhu.js 自己那个监听管
        e.stopImmediatePropagation();
        togglePause();
      }, true);
    }

    /* ───── 本房间战绩（大厅） ───── */
    function dot(x) {
      if (x.pig) return '<i class="gzh-dot is-pig" title="第' + x.rank + '名 · 当猪"><svg viewBox="0 0 12 12" aria-hidden="true"><ellipse cx="6" cy="6" rx="5" ry="3.8"/><circle cx="4.2" cy="6" r="0.9"/><circle cx="7.8" cy="6" r="0.9"/></svg></i>';
      return '<i class="gzh-dot r' + x.rank + '" title="第' + x.rank + '名"></i>';
    }
    function recentOf(rec, id, n) {
      return rec.games.slice(-n).map((gm) => gm.seats.find((x) => x.id === id)).filter(Boolean);
    }
    const fmtAvg = (v) => (Math.round(v * 10) / 10).toFixed(1);
    function lobby(s) {
      const rec = s.record;
      const has = !!(rec && rec.n);
      // 甲：座位卡下面一排小点
      for (let l = 0; l < 4; l++) {
        const card = A.els.seats[l].querySelector('.gz-lobby-seat');
        if (!card) continue;
        let row = card.querySelector('.gzh-dots');
        const p = A.playerAt(A.srv(l));
        const me = has && p ? rec.people.find((x) => x.id === p.id) : null;
        if (cfg.rec !== '1' || !me) { if (row) row.remove(); continue; }
        if (!row) { row = document.createElement('span'); row.className = 'gzh-dots'; card.appendChild(row); }
        row.innerHTML = recentOf(rec, p.id, 6).map(dot).join('') + '<b class="gzh-avg" title="平均名次">' + fmtAvg(me.avgRank) + '</b>';
      }
      // 乙：大厅中间一张可展开的小表
      const box = A.$('gzLobby');
      let det = box.querySelector('.gzh-rec');
      if (cfg.rec !== '2' || !has) { if (det) det.remove(); }
      else {
        if (!det) {
          det = document.createElement('details');
          det.className = 'gzh-rec';
          box.querySelector('.gz-lobby-wait').after(det);
        }
        const seated = s.players.map((p) => p.id);
        const rows = rec.people.slice().sort((a, b) => (seated.includes(b.id) - seated.includes(a.id)) || a.avgRank - b.avgRank).slice(0, 8);
        const html = '<summary>' + IC.table + '<span>本房间战绩</span><b>' + rec.n + ' 盘</b></summary>' +
          '<table><thead><tr><th></th><th>平均名次</th><th>当猪</th><th>最近</th></tr></thead><tbody>' +
          rows.map((q) => '<tr class="' + (seated.includes(q.id) ? '' : 'is-gone') + '"><td class="who"><div><span class="gz-avatar"><span class="gz-av-face">' + A.faceHtml(A.avatarOf(q)) + '</span></span><span>' + A.esc(q.nick) + '</span></div></td>' +
            '<td class="avg">' + fmtAvg(q.avgRank) + '</td><td class="pig">' + (q.pigs || '') + '</td><td class="dots">' + recentOf(rec, q.id, 5).map(dot).join('') + '</td></tr>').join('') +
          '</tbody></table>';
        if (det.dataset.h !== html) { det.dataset.h = html; const open = det.open; det.innerHTML = html; det.open = open; }
      }
      // 盘终再来一盘的大厅侧入口：上一盘打完回到房间、有人走了空出座位时，房主一键「照上一盘再来」——空座补上机器人（场上最强那一档）就开。
      // 座位是满的就和「开始」一样，不另出；出的时候顶替（这时本来就点不了的）「开始」的位置
      let again = box.querySelector('[data-gzh="again"]');
      const empty = [0, 1, 2, 3].some((seat) => !s.players.some((p) => p.seat === seat));
      const show = has && empty && A.isHost() && !A.online().watching;
      const start = box.querySelector('[data-lb="start"]');
      if (show) start.hidden = true;
      if (show && !again) {
        again = document.createElement('button');
        again.type = 'button';
        again.className = 'gz-btn gzh-again';
        again.dataset.gzh = 'again';
        again.innerHTML = IC.again + '<span>照上一盘再来</span>';
        again.addEventListener('click', againFromLobby);
        box.querySelector('[data-lb="start"]').before(again);
      }
      if (again) again.hidden = !show;
    }
    function againFromLobby() {
      const s = st();
      if (!s || s.phase !== 'lobby' || !A.isHost()) return;
      const bots = s.players.filter((p) => p.isAi);
      let best = -1;
      for (const b of bots) best = Math.max(best, A.tierOrder.indexOf(b.aiLevel));
      const level = A.tierOrder[best < 0 ? 1 : best];
      for (let seat = 0; seat < 4; seat++) if (!s.players.some((p) => p.seat === seat)) A.lobbyOp('add_ai', { seat, level });
      A.hostStart();
    }

    function onState(s) {
      pauseUi();
      if (s.phase !== 'lobby' && A.online() && A.online().inGame) for (let l = 0; l < 4; l++) badge(l, A.els.seats[l], A.playerAt(A.srv(l)));
    }
    function reset() {
      root.classList.remove('gzh-paused');
      if (veil) veil.hidden = true;
      if (chip) chip.hidden = true;
      if (mark) mark.hidden = true;
    }

    return {
      extraTitle: () => '房主',
      extra, badge, lobby, onState, reset,
      menuItems: () => [],
      menuAct: () => false,
    };
  }

  window.GongzhuHostPv = { create };
})();
