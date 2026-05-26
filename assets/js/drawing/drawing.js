(function () {
  'use strict';

  // ====================================================================
  // 配置
  // ====================================================================
  const API_BASE = 'https://zircon-urge.fly.dev/api/draw';
  const SESSION_KEY = 'draw:session.v1';
  const DEVICE_KEY = 'draw:device.v1';
  const SWATCHES = ['#222222', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ffffff'];
  const SIZES = [
    { label: '细', width: 0.004 },
    { label: '中', width: 0.008 },
    { label: '粗', width: 0.016 },
  ];
  const DIFFICULTY_LABELS = { easy: '简单', medium: '中等', hard: '困难', mix: '混合' };

  // ====================================================================
  // 状态
  // ====================================================================
  const state = {
    view: '#/',
    session: null,           // {code, playerToken, playerId, deviceId, nick}
    roomState: null,
    lastVersion: 0,
    polling: false,
    countdownTimer: null,
    // 画板本地状态
    strokes: [],             // 累计笔画（已渲染）
    sinceStrokeIdx: 0,       // 已应用到 state.strokes 的进度
    currentStroke: null,     // 画手正在画的临时笔画
    drawColor: SWATCHES[0],
    drawWidth: SIZES[1].width,
    eraseMode: false,
    pendingStrokes: [],      // 待发送队列（节流用）
    sendInFlight: false,
  };

  function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }
  function saveSession(s) {
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }
  function getDeviceId() {
    let did = '';
    try { did = localStorage.getItem(DEVICE_KEY) || ''; } catch {}
    if (!did) {
      did = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { localStorage.setItem(DEVICE_KEY, did); } catch {}
    }
    return did;
  }
  function getInitialNick() {
    if (window.GamesShell && GamesShell.Identity) {
      const n = GamesShell.Identity.getNick();
      if (n) return n;
    }
    return '';
  }

  // ====================================================================
  // API（带超时 + 自动重试）
  //
  // 移动网络下访问 vercel.app 偶尔会返回 "Failed to fetch"——TCP 握手丢包、
  // CDN 路由抖动等。POST 类业务请求（猜词/笔画/加入房间）失败一次就 toast
  // 一次会让用户以为"功能坏了"，所以这里给 POST 加退避重试 + 8s 超时。
  // GET（state 长轮询）不在这里重试，pollLoop 自己有重试循环。
  // ====================================================================
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  async function api(method, action, params) {
    const url = new URL(API_BASE);
    url.searchParams.set('action', action);
    if (method === 'GET' && params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    }
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST') opts.body = JSON.stringify(params || {});

    const isPost = method === 'POST';
    const maxAttempts = isPost ? 2 : 1;
    const timeoutMs = isPost ? 6000 : 12000;

    let lastErr = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const resp = await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
        clearTimeout(tid);
        let data = {};
        try { data = await resp.json(); } catch {}
        if (!resp.ok) {
          const err = Object.assign(new Error(data.error || ('http_' + resp.status)), { status: resp.status, data });
          // 4xx 业务错误立刻抛，不重试（除 429 外）
          if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) throw err;
          lastErr = err;
        } else {
          return data;
        }
      } catch (e) {
        clearTimeout(tid);
        // 已识别的 4xx 业务错误：直接 rethrow
        if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
        lastErr = e;
      }
      if (attempt < maxAttempts - 1) {
        await sleep(400 * (attempt + 1));
      }
    }
    // 全部尝试用完：把根因包成 network_error / timeout 抛出
    const isAbort = lastErr && lastErr.name === 'AbortError';
    if (lastErr && lastErr.status) throw lastErr; // 5xx / 429 透传
    throw Object.assign(
      new Error(isAbort ? 'timeout' : 'network_error'),
      { network: true, timeout: !!isAbort, original: lastErr },
    );
  }
  function errMsg(e) {
    if (!e) return '未知错误';
    if (e.timeout) return '服务器响应超时，请重试';
    if (e.network) return '连接服务器失败 · 移动网络下不稳定，建议切换 WiFi';
    const map = {
      invalid_code: '房号格式错误',
      invalid_code_format: '房号必须是 4 位数字',
      invalid_nick: '昵称无效',
      invalid_device: '设备识别失败，请刷新',
      code_taken: '房号已被占用，换一个',
      no_code_available: '暂无空闲房号，稍后重试',
      room_not_found: '房间不存在或已过期',
      room_in_progress: '游戏已开始，无法加入',
      room_closed: '房间已结束',
      room_full: '房间已满，换一个房号试试',
      nick_taken_in_room: '昵称已被占用，换一个试试',
      not_host: '只有房主可以做这个操作',
      already_started: '游戏已经开始',
      too_few_players: '至少需要 2 位玩家才能开始',
      not_drawer: '只有当前画手能这么做',
      not_drawing_phase: '当前阶段不能画图',
      not_pick_phase: '现在不是选词阶段',
      invalid_word_index: '无效的词序号',
      invalid_stroke: '笔画数据无效',
      too_many_strokes: '本回合笔画太多了',
      empty_text: '消息不能为空',
      text_too_long: '消息太长',
      cant_kick_host: '不能踢出房主',
      target_not_found: '找不到目标玩家',
      already_host: '对方已是房主',
      host_must_transfer_or_dissolve: '房主离开前需先转让或解散',
      missing_field: '请求字段缺失',
      invalid_token: '会话已失效，请重新加入',
      token_room_mismatch: '会话与房间不匹配',
      missing_token: '会话已失效',
      lock_timeout: '房间繁忙，请重试',
      not_playing: '游戏未在进行中',
      drawer_silent: '画手在画图阶段不能发消息',
    };
    if (map[e.message]) return map[e.message];
    if (e.status === 429) return '操作太频繁，稍等再试';
    return '操作失败：' + (e.message || '');
  }

  // ====================================================================
  // 工具
  // ====================================================================
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'on') { for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn); }
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('data-')) node.setAttribute(k, String(v));
        else if (k === 'disabled' || k === 'checked' || k === 'selected') {
          if (v) node.setAttribute(k, ''); else node.removeAttribute(k);
        }
        else node.setAttribute(k, String(v));
      }
    }
    const append = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(append);
      else if (c instanceof Node) node.appendChild(c);
      else node.appendChild(document.createTextNode(String(c)));
    };
    if (children != null) append(children);
    return node;
  }

  let toastTimer = null;
  function toast(msg, ms) {
    const t = document.createElement('div');
    t.className = 'dg-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.remove(); }, ms || 2000);
  }

  function nav(hash) {
    if (location.hash !== hash) location.hash = hash;
    else render();
  }

  function copyToClipboard(text, msg) {
    try { navigator.clipboard.writeText(text); toast(msg || '已复制'); }
    catch { toast('复制失败'); }
  }
  function copyShareLink(code) {
    const url = location.origin + location.pathname + '?room=' + code;
    copyToClipboard(url, '已复制邀请链接');
  }

  function amIHost() {
    if (!state.roomState || !state.session) return false;
    return state.roomState.hostPlayerId === state.session.playerId;
  }
  function amIDrawer() {
    return !!(state.roomState && state.roomState.me && state.roomState.me.isDrawer);
  }
  function getMe() {
    return state.roomState ? state.roomState.me : null;
  }

  // ====================================================================
  // 表单状态
  // ====================================================================
  const createForm = {
    nick: getInitialNick(),
    customCode: '',
    difficulty: 'mix',
    roundSec: 90,
    totalRounds: 0,
  };
  const joinForm = { code: '', nick: getInitialNick() };

  // ====================================================================
  // Landing
  // ====================================================================
  function viewLanding() {
    const wrap = el('div');

    if (state.session && state.session.code) {
      const r = el('div', { class: 'dg-resume' }, [
        el('p', { style: { margin: '0 0 0.5rem' } }, `检测到上次会话：房间 ${state.session.code}（${state.session.nick}）`),
        el('div', { class: 'dg-row', style: { justifyContent: 'center' } }, [
          el('button', {
            class: 'dg-btn primary tiny',
            on: { click: () => { nav('#/lobby'); } },
          }, '回到房间'),
          el('button', {
            class: 'dg-btn ghost tiny',
            on: { click: () => { saveSession(null); state.session = null; render(); } },
          }, '清除'),
        ]),
      ]);
      wrap.appendChild(r);
    }

    wrap.appendChild(el('div', { class: 'dg-hero-actions' }, [
      el('button', {
        class: 'dg-btn primary',
        on: { click: () => nav('#/create') },
      }, '🎨 创建房间'),
      el('button', {
        class: 'dg-btn ghost',
        on: { click: () => nav('#/join') },
      }, '🚪 加入房间'),
    ]));

    wrap.appendChild(el('div', { class: 'dg-tip' }, [
      el('div', null, '· 房主创建房间后会得到 4 位房号，把链接发给朋友就能加入'),
      el('div', null, '· 不预设人数，房主想开就开（至少 2 人）'),
      el('div', null, '· 每回合一人画图，其他人在聊天框猜词；猜中按先后阶梯计分'),
    ]));

    return wrap;
  }

  // ====================================================================
  // Create
  // ====================================================================
  function viewCreate() {
    const wrap = el('div');
    const card = el('section', { class: 'dg-card' });
    card.appendChild(el('h3', null, '创建房间'));

    card.appendChild(el('label', { class: 'dg-label' }, '你的昵称'));
    card.appendChild(el('input', {
      class: 'dg-input',
      type: 'text', maxlength: '12',
      placeholder: '1-12 字',
      value: createForm.nick,
      on: { input: (e) => { createForm.nick = e.target.value; updateCreateBtn(); } },
    }));

    card.appendChild(el('label', { class: 'dg-label' }, '词库难度'));
    card.appendChild(el('select', {
      class: 'dg-select',
      on: { change: (e) => { createForm.difficulty = e.target.value; } },
    }, [
      el('option', { value: 'mix', selected: createForm.difficulty === 'mix' }, '混合（推荐）'),
      el('option', { value: 'easy', selected: createForm.difficulty === 'easy' }, '简单'),
      el('option', { value: 'medium', selected: createForm.difficulty === 'medium' }, '中等'),
      el('option', { value: 'hard', selected: createForm.difficulty === 'hard' }, '困难'),
    ]));

    card.appendChild(el('label', { class: 'dg-label' }, '每回合时长'));
    card.appendChild(el('select', {
      class: 'dg-select',
      on: { change: (e) => { createForm.roundSec = parseInt(e.target.value, 10) || 90; } },
    }, [
      el('option', { value: '60', selected: createForm.roundSec === 60 }, '60 秒'),
      el('option', { value: '90', selected: createForm.roundSec === 90 }, '90 秒（推荐）'),
      el('option', { value: '120', selected: createForm.roundSec === 120 }, '120 秒'),
      el('option', { value: '150', selected: createForm.roundSec === 150 }, '150 秒'),
    ]));

    card.appendChild(el('label', { class: 'dg-label' }, '总轮数（每人画 N 轮 · 0 = 房主手动结束）'));
    card.appendChild(el('select', {
      class: 'dg-select',
      on: { change: (e) => { createForm.totalRounds = parseInt(e.target.value, 10) || 0; } },
    }, [
      el('option', { value: '0', selected: createForm.totalRounds === 0 }, '不限（房主手动结束）'),
      el('option', { value: '6', selected: createForm.totalRounds === 6 }, '6 轮'),
      el('option', { value: '10', selected: createForm.totalRounds === 10 }, '10 轮'),
      el('option', { value: '15', selected: createForm.totalRounds === 15 }, '15 轮'),
      el('option', { value: '20', selected: createForm.totalRounds === 20 }, '20 轮'),
    ]));

    card.appendChild(el('label', { class: 'dg-label' }, '自定义房号（可选 · 4 位数字）'));
    card.appendChild(el('input', {
      class: 'dg-input',
      type: 'text', inputmode: 'numeric', maxlength: '4',
      placeholder: '留空则随机分配',
      value: createForm.customCode,
      on: { input: (e) => {
        createForm.customCode = e.target.value.replace(/\D/g, '').slice(0, 4);
        e.target.value = createForm.customCode;
      } },
    }));

    card.appendChild(el('div', { class: 'dg-row', style: { marginTop: '1rem', justifyContent: 'space-between' } }, [
      el('button', { class: 'dg-btn ghost', on: { click: () => nav('#/') } }, '← 返回'),
      el('button', {
        id: 'dg-create-btn',
        class: 'dg-btn primary',
        disabled: createForm.nick.trim() ? null : '',
        on: { click: doCreate },
      }, '🎨 创建房间'),
    ]));
    wrap.appendChild(card);
    return wrap;
  }
  function updateCreateBtn() {
    const btn = document.getElementById('dg-create-btn');
    if (!btn) return;
    if (createForm.nick.trim()) btn.removeAttribute('disabled');
    else btn.setAttribute('disabled', '');
  }
  async function doCreate() {
    const nick = createForm.nick.trim();
    if (!nick) { toast('请填昵称'); return; }
    if (window.GamesShell && GamesShell.Identity) GamesShell.Identity.setNick(nick);
    try {
      const r = await api('POST', 'create', {
        hostNick: nick,
        deviceId: getDeviceId(),
        customCode: createForm.customCode || null,
        config: {
          difficulty: createForm.difficulty,
          roundSec: createForm.roundSec,
          totalRounds: createForm.totalRounds,
        },
      });
      const sess = {
        code: r.code, playerToken: r.playerToken, playerId: r.playerId,
        deviceId: getDeviceId(), nick,
      };
      saveSession(sess);
      state.session = sess;
      state.lastVersion = 0;
      state.roomState = null;
      nav('#/lobby');
    } catch (e) { toast(errMsg(e)); }
  }

  // ====================================================================
  // Join
  // ====================================================================
  function viewJoin() {
    const wrap = el('div');
    const card = el('section', { class: 'dg-card' });
    card.appendChild(el('h3', null, '加入房间'));

    card.appendChild(el('label', { class: 'dg-label' }, '房号（4 位数字）'));
    card.appendChild(el('input', {
      class: 'dg-input',
      type: 'text', inputmode: 'numeric', maxlength: '4',
      placeholder: '例如 1234',
      value: joinForm.code,
      on: { input: (e) => {
        joinForm.code = e.target.value.replace(/\D/g, '').slice(0, 4);
        e.target.value = joinForm.code;
        updateJoinBtn();
      } },
    }));

    card.appendChild(el('label', { class: 'dg-label' }, '你的昵称'));
    card.appendChild(el('input', {
      class: 'dg-input',
      type: 'text', maxlength: '12',
      placeholder: '1-12 字',
      value: joinForm.nick,
      on: { input: (e) => { joinForm.nick = e.target.value; updateJoinBtn(); } },
    }));

    card.appendChild(el('div', { class: 'dg-row', style: { marginTop: '1rem', justifyContent: 'space-between' } }, [
      el('button', { class: 'dg-btn ghost', on: { click: () => nav('#/') } }, '← 返回'),
      el('button', {
        id: 'dg-join-btn',
        class: 'dg-btn primary',
        disabled: '',
        on: { click: doJoin },
      }, '加入'),
    ]));
    wrap.appendChild(card);
    return wrap;
  }
  function updateJoinBtn() {
    const btn = document.getElementById('dg-join-btn');
    if (!btn) return;
    if (/^\d{4}$/.test(joinForm.code) && joinForm.nick.trim()) btn.removeAttribute('disabled');
    else btn.setAttribute('disabled', '');
  }
  async function doJoin() {
    const code = joinForm.code.trim();
    const nick = joinForm.nick.trim();
    if (!/^\d{4}$/.test(code)) { toast('房号 4 位数字'); return; }
    if (!nick) { toast('请填昵称'); return; }
    if (window.GamesShell && GamesShell.Identity) GamesShell.Identity.setNick(nick);
    try {
      const r = await api('POST', 'join', { code, nick, deviceId: getDeviceId() });
      const sess = {
        code: r.code, playerToken: r.playerToken, playerId: r.playerId,
        deviceId: getDeviceId(), nick,
      };
      saveSession(sess);
      state.session = sess;
      state.lastVersion = 0;
      state.roomState = null;
      nav('#/lobby');
    } catch (e) { toast(errMsg(e)); }
  }

  // ====================================================================
  // Lobby
  // ====================================================================
  function viewLobby() {
    const r = state.roomState;
    if (!r) {
      return el('div', { style: { textAlign: 'center', padding: '2rem' } }, '⏳ 加载房间…');
    }
    const wrap = el('div');

    // 房号 banner
    const qrBox = el('div', { class: 'gs-room-qr' });
    if (window.GamesShell && GamesShell.QR) GamesShell.QR.render(qrBox, location.origin + location.pathname + '?room=' + r.code);
    const banner = el('section', { class: 'dg-room-banner' }, [
      el('div', null, [
        el('div', { class: 'label' }, '房号'),
        el('div', { class: 'code' }, r.code),
      ]),
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'dg-btn tiny',
          on: { click: () => copyToClipboard(r.code, '已复制房号') },
        }, '📋 复制房号'),
        el('button', {
          class: 'dg-btn tiny',
          on: { click: () => copyShareLink(r.code) },
        }, '🔗 复制链接'),
      ]),
      qrBox,
    ]);
    wrap.appendChild(banner);

    // 玩家列表
    const isHost = amIHost();
    const players = (r.players || []).filter((p) => !p.kicked);
    const card = el('section', { class: 'dg-card' });
    card.appendChild(el('h3', null, `玩家（${players.length}）`));
    card.appendChild(renderPlayerList(players, isHost));
    if (isHost) {
      const enough = players.length >= 2;
      card.appendChild(el('div', { style: { marginTop: '0.9rem', textAlign: 'center' } }, [
        el('button', {
          class: 'dg-btn primary',
          disabled: enough ? null : '',
          on: { click: doStart },
        }, enough ? '▶️ 开始游戏' : '至少需要 2 人'),
        el('div', { style: { fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.5rem' } },
          '不预设人数，邀请到位就开。中途加入者下一轮上场。'),
      ]));
    } else {
      card.appendChild(el('div', { style: { marginTop: '0.7rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.9rem' } },
        '⏳ 等待房主开始游戏…'));
    }
    wrap.appendChild(card);

    // 规则汇总
    const sum = el('section', { class: 'dg-card' });
    sum.appendChild(el('h3', null, '本场设置'));
    sum.appendChild(el('div', { style: { fontSize: '0.88rem', lineHeight: '1.7', color: 'var(--color-muted)' } }, [
      el('div', null, `难度：${DIFFICULTY_LABELS[r.config.difficulty] || r.config.difficulty}`),
      el('div', null, `每回合：${r.config.roundSec} 秒`),
      el('div', null, `总轮数：${r.config.totalRounds > 0 ? r.config.totalRounds + ' 轮' : '不限（房主手动结束）'}`),
      el('div', null, `计分：第 1 个猜中 3 分，第 2 个 2 分，第 3+ 个 1 分；画手按猜中人数 ×2，最多 6 分`),
    ]));
    wrap.appendChild(sum);

    // 离开 / 解散
    wrap.appendChild(el('div', { style: { textAlign: 'center', marginTop: '0.6rem', display: 'flex', gap: '0.4rem', justifyContent: 'center' } }, [
      el('button', {
        class: 'dg-btn ghost tiny',
        on: { click: doLeave },
      }, '退出房间'),
      isHost ? el('button', {
        class: 'dg-btn danger tiny',
        on: { click: () => doDissolve(false) },
      }, '🗑 解散房间') : null,
    ]));

    return wrap;
  }

  function renderPlayerList(players, isHost) {
    const list = el('div', { class: 'dg-player-list' });
    for (const p of players) {
      const isMe = state.session && p.id === state.session.playerId;
      const cls = ['dg-player'];
      if (isMe) cls.push('me');
      if (p.isHost) cls.push('host');
      if (!p.online) cls.push('offline');
      const node = el('div', { class: cls.join(' ') }, [
        el('div', { class: 'seat-num' }, String(p.seat)),
        p.isHost ? el('span', { class: 'crown' }, '👑') : null,
        el('div', { class: 'nick' }, p.nick),
        (p.score || 0) > 0 ? el('div', { class: 'score' }, String(p.score)) : null,
        (isHost && !p.isHost && !isMe) ? el('button', {
          class: 'kick',
          title: '踢出',
          on: { click: () => doKick(p.id, p.nick) },
        }, '✕') : null,
      ]);
      list.appendChild(node);
    }
    return list;
  }

  async function doStart() {
    try {
      await api('POST', 'start', { code: state.session.code, token: state.session.playerToken });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doKick(targetPid, nick) {
    if (!confirm(`确认踢出 ${nick}？`)) return;
    try {
      await api('POST', 'kick', { code: state.session.code, token: state.session.playerToken, targetPid });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doLeave() {
    const isHost = amIHost();
    if (isHost) {
      const others = (state.roomState.players || []).filter((p) => !p.kicked && p.id !== state.session.playerId);
      if (others.length > 0) {
        showHostLeaveModal(others);
        return;
      }
      if (!confirm('你是房主，离开会解散房间，确定？')) return;
      try { await api('POST', 'leave', { code: state.session.code, token: state.session.playerToken, dissolveOnLeave: true }); } catch {}
    } else {
      try { await api('POST', 'leave', { code: state.session.code, token: state.session.playerToken }); } catch {}
    }
    saveSession(null);
    state.session = null;
    state.roomState = null;
    state.polling = false;
    nav('#/');
  }
  async function doDissolve(skipConfirm) {
    if (!skipConfirm && !confirm('确认解散房间？所有玩家将被踢回首页。')) return;
    try {
      await api('POST', 'dissolve', { code: state.session.code, token: state.session.playerToken });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doTransferAndLeave(targetPid) {
    try {
      await api('POST', 'leave', {
        code: state.session.code,
        token: state.session.playerToken,
        transferTo: targetPid,
      });
    } catch (e) { toast(errMsg(e)); return; }
    saveSession(null);
    state.session = null;
    state.roomState = null;
    state.polling = false;
    nav('#/');
  }

  function showHostLeaveModal(others) {
    const bg = el('div', { class: 'dg-modal-bg' });
    const m = el('div', { class: 'dg-modal' });
    m.appendChild(el('h3', null, '你是房主，怎么办？'));
    m.appendChild(el('div', { class: 'body' }, '把房主转交给一位玩家后再离开，或者解散整个房间。'));
    m.appendChild(el('div', { style: { marginBottom: '0.8rem' } }, others.map((p) =>
      el('button', {
        class: 'dg-btn ghost tiny',
        style: { margin: '0.2rem' },
        on: { click: () => { closeModal(); doTransferAndLeave(p.id); } },
      }, `→ ${p.nick}`),
    )));
    m.appendChild(el('div', { class: 'actions' }, [
      el('button', { class: 'dg-btn ghost', on: { click: closeModal } }, '取消'),
      el('button', {
        class: 'dg-btn danger',
        on: { click: () => { closeModal(); doDissolve(true); } },
      }, '解散房间'),
    ]));
    bg.appendChild(m);
    bg.addEventListener('click', (e) => { if (e.target === bg) closeModal(); });
    document.body.appendChild(bg);
  }
  function closeModal() {
    document.querySelectorAll('.dg-modal-bg').forEach((n) => n.remove());
  }

  // ====================================================================
  // Play
  // ====================================================================
  function viewPlay() {
    const r = state.roomState;
    if (!r) return el('div', { style: { textAlign: 'center', padding: '2rem' } }, '⏳ 加载…');

    const wrap = el('div');

    // 房号小条 + 房主操作
    const isHost = amIHost();
    const topActions = el('div', { class: 'dg-row', style: { justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem', color: 'var(--color-muted)' } }, [
      el('div', null, `房号 ${r.code} · ${(r.players || []).filter((p) => !p.kicked).length} 人`),
      el('div', { class: 'dg-row', style: { gap: '0.3rem' } }, [
        el('button', { class: 'dg-btn ghost tiny', on: { click: () => copyShareLink(r.code) } }, '📤 邀请'),
        isHost ? el('button', { class: 'dg-btn ghost tiny', on: { click: doSkip } }, '⏭ 跳过本回合') : null,
        isHost ? el('button', { class: 'dg-btn danger tiny', on: { click: doEnd } }, '🏁 结束游戏') : null,
        el('button', { class: 'dg-btn ghost tiny', on: { click: doLeave } }, '退出'),
      ]),
    ]);
    wrap.appendChild(topActions);

    // 顶栏：回合 / 倒计时 / 词
    wrap.appendChild(renderTopbar(r));

    // 主舞台
    const stage = el('div', { class: 'dg-stage' });
    const left = el('div');
    left.appendChild(renderCanvasArea(r));
    if (amIDrawer() && r.round && r.round.phase === 'drawing') {
      left.appendChild(renderToolbar());
    }
    stage.appendChild(left);
    stage.appendChild(renderSidebar(r));
    wrap.appendChild(stage);

    return wrap;
  }

  function renderTopbar(r) {
    const round = r.round;
    const totalLabel = r.config.totalRounds > 0 ? `/${r.config.totalRounds}` : '';
    const phaseLabel = round ? ({
      'pick-word': '选词中',
      'drawing': '画图中',
      'reveal': '本回合结束',
    }[round.phase] || round.phase) : '';
    const remain = round && round.deadlineTs > 0 ? Math.max(0, round.deadlineTs - Date.now()) : 0;
    const sec = Math.ceil(remain / 1000);
    let cls = 'countdown';
    if (sec <= 5) cls += ' danger';
    else if (sec <= 15) cls += ' warn';

    let wordNode = null;
    if (round) {
      if (amIDrawer()) {
        if (round.phase === 'pick-word') {
          wordNode = el('div', { class: 'word-display drawer-word' }, '↓ 请选词 ↓');
        } else if (round.phase === 'drawing' && r.me && r.me.currentWord) {
          wordNode = el('div', { class: 'word-display drawer-word' }, `🖌 ${r.me.currentWord}`);
        } else if (round.phase === 'reveal' && r.round.wordRevealed) {
          wordNode = el('div', { class: 'word-display drawer-word' }, `答案：${r.round.wordRevealed}`);
        }
      } else {
        if (round.phase === 'drawing' && round.wordHint) {
          wordNode = el('div', { class: 'word-display' }, `${round.wordHint.mask}（${round.wordHint.len} 字）`);
        } else if (round.phase === 'pick-word') {
          const drawer = (r.players || []).find((p) => p.id === round.drawerPid);
          wordNode = el('div', { class: 'word-display' }, `🎨 ${drawer ? drawer.nick : ''} 在选词…`);
        } else if (round.phase === 'reveal' && round.wordRevealed) {
          wordNode = el('div', { class: 'word-display' }, `答案：${round.wordRevealed}`);
        }
      }
    }

    return el('div', { class: 'dg-topbar' }, [
      el('span', { class: 'round-pill' }, `第 ${round ? round.n : 1}${totalLabel} 回合 · ${phaseLabel}`),
      wordNode,
      round ? el('span', { id: 'dg-countdown', class: cls }, sec + 's') : null,
    ]);
  }

  function renderCanvasArea(r) {
    const wrap = el('div', { class: 'dg-canvas-wrap', id: 'dg-canvas-wrap' });
    const canvas = el('canvas', { class: 'dg-canvas', id: 'dg-canvas' });
    wrap.appendChild(canvas);

    // 覆盖层：选词 / reveal
    const round = r.round;
    if (round) {
      if (round.phase === 'pick-word') {
        const overlay = el('div', { class: 'dg-canvas-overlay' });
        const panel = el('div', { class: 'panel' });
        if (amIDrawer() && r.me && r.me.wordChoices) {
          panel.appendChild(el('h2', null, '🎨 你来画！'));
          panel.appendChild(el('div', null, '从下面三个词里选一个：'));
          const choices = el('div', { class: 'word-choices' });
          r.me.wordChoices.forEach((w, i) => {
            choices.appendChild(el('button', {
              on: { click: () => doPickWord(i) },
            }, w));
          });
          panel.appendChild(choices);
        } else {
          const drawer = (r.players || []).find((p) => p.id === round.drawerPid);
          panel.appendChild(el('h2', null, '🎨 ' + (drawer ? drawer.nick : '画手') + ' 正在选词…'));
          panel.appendChild(el('div', { style: { color: 'var(--color-muted)' } }, '稍等片刻就开始'));
        }
        overlay.appendChild(panel);
        wrap.appendChild(overlay);
      } else if (round.phase === 'reveal') {
        const overlay = el('div', { class: 'dg-canvas-overlay' });
        const panel = el('div', { class: 'panel' });
        panel.appendChild(el('h2', null, '本回合结束'));
        panel.appendChild(el('div', { class: 'reveal-word' }, round.wordRevealed || '—'));
        const correct = (round.correctGuessers || []).length;
        const drawer = (r.players || []).find((p) => p.id === round.drawerPid);
        panel.appendChild(el('div', { class: 'reveal-meta' },
          correct > 0
            ? `${correct} 人猜中 · 画手 ${drawer ? drawer.nick : '—'} +${Math.min(correct * 2, 6)} 分`
            : '可惜没人猜中…'
        ));
        overlay.appendChild(panel);
        wrap.appendChild(overlay);
      }
    }

    return wrap;
  }

  function renderToolbar() {
    const bar = el('div', { class: 'dg-toolbar' });
    SWATCHES.forEach((c) => {
      const sw = el('button', {
        class: 'swatch' + (state.drawColor === c && !state.eraseMode ? ' active' : ''),
        style: { background: c, border: c === '#ffffff' ? '2px solid #ccc' : null },
        title: c,
        on: { click: () => { state.drawColor = c; state.eraseMode = false; render(); } },
      });
      bar.appendChild(sw);
    });
    SIZES.forEach((s) => {
      bar.appendChild(el('button', {
        class: 'size-btn' + (Math.abs(state.drawWidth - s.width) < 0.0005 ? ' active' : ''),
        on: { click: () => { state.drawWidth = s.width; render(); } },
      }, s.label));
    });
    bar.appendChild(el('button', {
      class: 'size-btn' + (state.eraseMode ? ' active' : ''),
      on: { click: () => { state.eraseMode = !state.eraseMode; render(); } },
    }, '🧽 橡皮'));
    bar.appendChild(el('div', { class: 'tool-spacer' }));
    bar.appendChild(el('button', {
      class: 'dg-btn ghost tiny',
      on: { click: doUndo },
    }, '↩ 撤销'));
    bar.appendChild(el('button', {
      class: 'dg-btn ghost tiny',
      on: { click: doClear },
    }, '🗑 清空'));
    return bar;
  }

  function renderSidebar(r) {
    const sidebar = el('div', { class: 'dg-sidebar' });
    sidebar.appendChild(renderChatInput(r));
    sidebar.appendChild(renderChatMessages(r));
    sidebar.appendChild(renderScoreboard(r));
    return sidebar;
  }

  function renderScoreboard(r) {
    const score = el('div', { class: 'dg-scoreboard' });
    score.appendChild(el('h4', null, '📊 计分板'));
    const sorted = [...(r.players || [])]
      .filter((p) => !p.kicked)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    const drawerPid = r.round ? r.round.drawerPid : null;
    const correctSet = new Set(r.round ? (r.round.correctGuessers || []) : []);
    sorted.forEach((p) => {
      const isMe = state.session && p.id === state.session.playerId;
      const cls = ['row'];
      if (p.id === drawerPid) cls.push('drawer');
      else if (correctSet.has(p.id)) cls.push('correct');
      if (isMe) cls.push('me');
      score.appendChild(el('div', { class: cls.join(' ') }, [
        el('span', { class: 'icon' }, p.id === drawerPid ? '🖌' : (correctSet.has(p.id) ? '✓' : (p.online ? '·' : '○'))),
        el('span', { class: 'nick' }, p.nick + (p.isHost ? ' 👑' : '')),
        el('span', { class: 'score' }, String(p.score || 0)),
      ]));
    });
    return score;
  }

  function renderChatMessages(r) {
    const messages = el('div', { class: 'dg-chat-messages', id: 'dg-chat-messages' });
    (r.chat || []).forEach((m) => messages.appendChild(renderChatMsg(m, r)));
    return messages;
  }

  // 画手在 pick-word / drawing 阶段全程禁言（避免直接报答案）。
  // reveal、lobby 等空隙允许聊天。
  function renderChatInput(r) {
    const isDrawer = amIDrawer();
    const me = r.me;
    const hasGuessed = me && r.round && (r.round.correctGuessers || []).includes(me.playerId);
    const phase = r.round ? r.round.phase : null;
    const isDrawing = phase === 'drawing';
    const isPickWord = phase === 'pick-word';
    const drawerSilent = isDrawer && (isDrawing || isPickWord);

    let placeholder = '聊天…';
    let disabled = false;
    if (drawerSilent) { placeholder = '画手不能发消息'; disabled = true; }
    else if (isDrawing && !hasGuessed) placeholder = '在这里猜词';
    else if (isDrawing && hasGuessed) placeholder = '你已猜中，可以聊天';

    const input = el('input', {
      type: 'text', maxlength: '30',
      placeholder,
      disabled: disabled ? '' : null,
      on: {
        keydown: (e) => {
          if (e.key === 'Enter' && !e.isComposing) {
            const v = e.target.value.trim();
            if (v) { sendGuess(v); e.target.value = ''; }
          }
        },
      },
    });
    const send = el('button', {
      class: 'dg-btn primary tiny',
      disabled: disabled ? '' : null,
      on: {
        click: () => {
          const v = input.value.trim();
          if (v) { sendGuess(v); input.value = ''; }
        },
      },
    }, '发送');
    return el('div', { class: 'dg-chat-input' }, [input, send]);
  }

  function renderChatMsg(m, r) {
    if (m.kind === 'system') {
      return el('div', { class: 'msg system' }, m.text);
    }
    if (m.kind === 'correct') {
      const tag = m.order === 1 ? '🥇' : m.order === 2 ? '🥈' : m.order === 3 ? '🥉' : '✓';
      return el('div', { class: 'msg system correct-cheer' },
        `${tag} ${m.nick} 猜中了！+${m.score} 分`);
    }
    if (m.kind === 'guess') {
      return el('div', { class: 'msg guess' }, [
        el('span', { class: 'nick' }, m.nick),
        document.createTextNode(m.text),
      ]);
    }
    if (m.kind === 'chat') {
      return el('div', { class: 'msg chat' }, [
        el('span', { class: 'nick' }, m.nick),
        document.createTextNode(m.text),
      ]);
    }
    if (m.kind === 'chat-after') {
      return el('div', { class: 'msg chat-after' }, [
        el('span', { class: 'nick' }, m.nick),
        document.createTextNode(m.text),
      ]);
    }
    return el('div', { class: 'msg chat' }, m.text || '');
  }

  // ====================================================================
  // Play 操作
  // ====================================================================
  async function doPickWord(idx) {
    try {
      await api('POST', 'pickword', {
        code: state.session.code,
        token: state.session.playerToken,
        wordIndex: idx,
      });
    } catch (e) { toast(errMsg(e)); }
  }
  async function sendGuess(text) {
    try {
      await api('POST', 'guess', {
        code: state.session.code,
        token: state.session.playerToken,
        text,
      });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doClear() {
    try {
      await api('POST', 'clear', { code: state.session.code, token: state.session.playerToken });
      // 本地立刻清空
      state.strokes = [];
      state.sinceStrokeIdx = 0;
      redrawCanvas();
    } catch (e) { toast(errMsg(e)); }
  }
  async function doUndo() {
    try {
      await api('POST', 'undo', { code: state.session.code, token: state.session.playerToken });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doSkip() {
    try {
      await api('POST', 'skip', { code: state.session.code, token: state.session.playerToken });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doEnd() {
    if (!confirm('确认结束游戏？将进入最终排行榜。')) return;
    try {
      await api('POST', 'end', { code: state.session.code, token: state.session.playerToken });
    } catch (e) { toast(errMsg(e)); }
  }

  // ====================================================================
  // End view
  // ====================================================================
  function viewEnd() {
    const r = state.roomState;
    if (!r) return el('div', null, '⏳');
    const wrap = el('div');
    const card = el('section', { class: 'dg-card' });
    card.appendChild(el('h3', null, '🏆 最终排行榜'));
    const list = el('ul', { class: 'dg-final-list' });
    (r.finalScores || []).forEach((row) => {
      const cls = ['rank-' + row.rank];
      list.appendChild(el('li', { class: cls.join(' ') }, [
        el('span', { class: 'rank' }, '#' + row.rank),
        el('span', { class: 'nick' }, row.nick),
        el('span', { class: 'score' }, row.score + ' 分'),
      ]));
    });
    card.appendChild(list);

    const isHost = amIHost();
    card.appendChild(el('div', { style: { textAlign: 'center', marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' } }, [
      el('button', {
        class: 'dg-btn ghost',
        on: { click: doLeave },
      }, '返回首页'),
      isHost ? el('button', {
        class: 'dg-btn primary',
        on: { click: doRematch },
      }, '🔁 再来一局') : null,
    ]));
    wrap.appendChild(card);
    return wrap;
  }

  async function doRematch() {
    // 简化：先解散当前房间，再回首页让房主新建
    if (!confirm('再来一局？将解散当前房间，回到首页重新创建。')) return;
    try { await api('POST', 'dissolve', { code: state.session.code, token: state.session.playerToken }); } catch {}
    saveSession(null);
    state.session = null;
    state.roomState = null;
    state.polling = false;
    nav('#/create');
  }

  // ====================================================================
  // Canvas: 渲染 + 画手交互
  // ====================================================================
  function getCanvas() { return document.getElementById('dg-canvas'); }
  function getCtx() {
    const c = getCanvas();
    return c ? c.getContext('2d') : null;
  }
  function setupCanvasSize() {
    const c = getCanvas();
    if (!c) return;
    const wrap = c.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  function redrawCanvas() {
    const c = getCanvas();
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = c.width / dpr, h = c.height / dpr;
    ctx.clearRect(0, 0, w, h);
    for (const s of state.strokes) drawStroke(ctx, s, w, h);
    if (state.currentStroke) drawStroke(ctx, state.currentStroke, w, h);
  }
  function drawStroke(ctx, s, w, h) {
    if (!s || !s.points || s.points.length === 0) return;
    ctx.save();
    if (s.kind === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color || '#222';
    }
    ctx.lineWidth = (s.width || 0.005) * Math.min(w, h);
    ctx.beginPath();
    const [x0, y0] = s.points[0];
    ctx.moveTo(x0 * w, y0 * h);
    if (s.points.length === 1) {
      // 单点：画一个小圆
      ctx.arc(x0 * w, y0 * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i][0] * w, s.points[i][1] * h);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function attachCanvasInputs() {
    const c = getCanvas();
    if (!c) return;
    if (!amIDrawer() || !state.roomState || !state.roomState.round
        || state.roomState.round.phase !== 'drawing') {
      c.classList.add('readonly');
      return;
    }
    c.classList.remove('readonly');

    let drawing = false;
    let lastPt = null;

    function ptOf(e) {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
    }
    function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

    function start(e) {
      e.preventDefault();
      drawing = true;
      const p = ptOf(e);
      lastPt = p;
      state.currentStroke = {
        points: [p],
        color: state.drawColor,
        width: state.drawWidth,
        kind: state.eraseMode ? 'erase' : 'pen',
      };
      redrawCanvas();
      c.setPointerCapture && c.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = ptOf(e);
      if (!lastPt || dist(lastPt, p) > 0.003) {
        state.currentStroke.points.push(p);
        lastPt = p;
        if (state.currentStroke.points.length > 600) {
          // 强制结束本笔，避免 server 拒
          end(e);
          return;
        }
        redrawCanvas();
      }
    }
    function end(e) {
      if (!drawing) return;
      drawing = false;
      if (state.currentStroke && state.currentStroke.points.length > 0) {
        const s = state.currentStroke;
        // 立刻把这笔加入本地 strokes，避免视觉空隙
        state.strokes.push(s);
        state.sinceStrokeIdx = state.strokes.length;
        state.currentStroke = null;
        redrawCanvas();
        sendStroke(s);
      } else {
        state.currentStroke = null;
        redrawCanvas();
      }
    }

    c.addEventListener('pointerdown', start);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', (e) => { if (drawing) end(e); });
  }

  async function sendStroke(s) {
    state.pendingStrokes.push(s);
    flushPendingStrokes();
  }
  async function flushPendingStrokes() {
    if (state.sendInFlight) return;
    if (state.pendingStrokes.length === 0) return;
    const s = state.pendingStrokes.shift();
    state.sendInFlight = true;
    try {
      await api('POST', 'stroke', {
        code: state.session.code,
        token: state.session.playerToken,
        stroke: s,
      });
    } catch (e) {
      // 失败：从本地 strokes 撤回，提示
      const idx = state.strokes.indexOf(s);
      if (idx >= 0) {
        state.strokes.splice(idx, 1);
        state.sinceStrokeIdx = state.strokes.length;
        redrawCanvas();
      }
      toast(errMsg(e));
    } finally {
      state.sendInFlight = false;
      if (state.pendingStrokes.length > 0) flushPendingStrokes();
    }
  }

  // ====================================================================
  // 渲染 + 路由
  // ====================================================================
  function render() {
    const route = location.hash || '#/';
    state.view = route;
    if (state.countdownTimer) { clearInterval(state.countdownTimer); state.countdownTimer = null; }

    let content;
    if (route === '#/' || route === '') { stopPolling(); content = viewLanding(); }
    else if (route === '#/create') { stopPolling(); content = viewCreate(); }
    else if (route === '#/join') { stopPolling(); content = viewJoin(); }
    else if (route === '#/lobby') { ensurePolling(); content = viewLobby(); }
    else if (route === '#/play') { ensurePolling(); content = viewPlay(); }
    else if (route === '#/end') { ensurePolling(); content = viewEnd(); }
    else content = viewLanding();

    const $view = document.getElementById('dg-view');
    $view.innerHTML = '';
    $view.appendChild(content);

    // 画板初始化（在 DOM 就位后）
    if (route === '#/play' && getCanvas()) {
      requestAnimationFrame(() => {
        setupCanvasSize();
        redrawCanvas();
        attachCanvasInputs();
      });
      state.countdownTimer = setInterval(tickCountdown, 250);
    }
  }
  function tickCountdown() {
    const n = document.getElementById('dg-countdown');
    if (!n || !state.roomState || !state.roomState.round) return;
    const remain = state.roomState.round.deadlineTs - Date.now();
    const sec = Math.max(0, Math.ceil(remain / 1000));
    n.textContent = sec + 's';
    n.classList.remove('warn', 'danger');
    if (sec <= 5) n.classList.add('danger');
    else if (sec <= 15) n.classList.add('warn');
  }

  // ====================================================================
  // 轮询
  // ====================================================================
  function ensurePolling() {
    if (state.polling) return;
    state.polling = true;
    pollLoop();
  }
  function stopPolling() { state.polling = false; }

  async function pollLoop() {
    while (state.polling && state.session && state.session.playerToken) {
      try {
        const r = await api('GET', 'state', {
          code: state.session.code,
          token: state.session.playerToken,
          since: state.lastVersion,
          sinceStroke: state.sinceStrokeIdx,
        });
        if (r.version > state.lastVersion) {
          state.lastVersion = r.version;
          const prev = state.roomState;
          state.roomState = r;
          applyStrokesDelta(r, prev);
          onStateUpdate(r, prev);
        }
      } catch (e) {
        if (e.status === 403 || e.status === 404) {
          toast(errMsg(e));
          saveSession(null);
          state.session = null;
          state.roomState = null;
          state.polling = false;
          state.strokes = [];
          state.sinceStrokeIdx = 0;
          nav('#/');
          return;
        }
        await new Promise((res) => setTimeout(res, 2500));
      }
    }
  }

  function applyStrokesDelta(r, prev) {
    if (!r.round) {
      state.strokes = [];
      state.sinceStrokeIdx = 0;
      return;
    }
    // 回合切换：清空本地
    if (!prev || !prev.round || prev.round.n !== r.round.n) {
      state.strokes = [];
      state.sinceStrokeIdx = 0;
    }
    const total = r.round.strokeCount || 0;
    const baseIdx = r.strokesBaseIndex || 0;
    const delta = r.strokesDelta || [];
    if (baseIdx === 0 && total !== state.strokes.length) {
      // 全量重置（撤销 / 清空 / drawer 端 truncated）
      state.strokes = delta.slice();
      state.sinceStrokeIdx = state.strokes.length;
    } else if (delta.length > 0) {
      // 增量
      // 防止本地领先（画手已 push 自己的笔画）：用 server 的 total 对齐
      if (state.strokes.length < total) {
        // 仅把 baseIdx 之后的差值合并进去
        const want = total - state.strokes.length;
        if (delta.length >= want) {
          const add = delta.slice(delta.length - want);
          state.strokes = state.strokes.concat(add);
        } else {
          state.strokes = state.strokes.slice(0, baseIdx).concat(delta);
        }
      } else if (state.strokes.length > total) {
        // 服务器更短（撤销 / 清空）
        state.strokes = state.strokes.slice(0, total);
      }
      state.sinceStrokeIdx = state.strokes.length;
    } else if (state.strokes.length !== total) {
      // 没 delta 但长度对不上：撤销 / 清空场景
      if (total < state.strokes.length) {
        state.strokes = state.strokes.slice(0, total);
      }
      state.sinceStrokeIdx = state.strokes.length;
    }
  }

  function onStateUpdate(r, prev) {
    if (r.state === 'dissolved') {
      toast('房主已解散房间');
      saveSession(null);
      state.session = null;
      state.roomState = null;
      state.polling = false;
      state.strokes = [];
      state.sinceStrokeIdx = 0;
      nav('#/');
      return;
    }
    if (r.me) {
      const me = (r.players || []).find((p) => p.id === r.me.playerId);
      if (me && me.kicked) {
        toast('你被房主踢出了房间');
        saveSession(null);
        state.session = null;
        state.roomState = null;
        state.polling = false;
        state.strokes = [];
        state.sinceStrokeIdx = 0;
        nav('#/');
        return;
      }
    }
    if (r.state === 'lobby' && state.view !== '#/lobby') { nav('#/lobby'); return; }
    if (r.state === 'playing' && state.view !== '#/play') { nav('#/play'); return; }
    if (r.state === 'ended' && state.view !== '#/end') { nav('#/end'); return; }
    render();
    // 渲染后滚到聊天底部
    requestAnimationFrame(() => {
      const m = document.getElementById('dg-chat-messages');
      if (m) m.scrollTop = m.scrollHeight;
    });
  }

  // ====================================================================
  // 启动
  // ====================================================================
  function init() {
    const s = loadSession();
    if (s && s.code && s.playerToken) state.session = s;

    const params = new URLSearchParams(location.search);
    const roomParam = params.get('room');
    if (roomParam && /^\d{4}$/.test(roomParam)) {
      joinForm.code = roomParam;
      history.replaceState(null, '', location.pathname);
      if (state.session && state.session.code === roomParam) {
        location.hash = '#/lobby';
      } else {
        location.hash = '#/join';
      }
    } else if (state.session && (location.hash === '' || location.hash === '#/')) {
      location.hash = '#/lobby';
    }

    window.addEventListener('hashchange', render);
    window.addEventListener('resize', () => {
      if (state.view === '#/play') {
        setupCanvasSize();
        redrawCanvas();
      }
    });
    render();
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (window.GamesShell && GamesShell.Comments) {
      GamesShell.Comments.mount({
        container: document.getElementById('dg-cm-mount'),
        path: '/toolbox/drawing/',
        title: '💬 玩法吐槽 / 词库求增',
        intro: '说说你想加什么词、遇到什么 bug ~',
        placeholder: '聊聊你画我猜心得 ~',
      });
    }
    init();
  });
})();
