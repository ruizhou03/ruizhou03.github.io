(function () {
  'use strict';

  // ====================================================================
  // 配置
  // ====================================================================
  const Protocol = window.DrawingProtocol;
  if (!Protocol) throw new Error('DrawingProtocol is required');
  const SESSION_KEY = 'draw:session.v2';
  const LEGACY_SESSION_KEY = 'draw:session.v1';
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
    session: null,           // {code, accessToken, resumeSecret, playerId, deviceId, nick}
    roomState: null,
    lastVersion: 0,
    commandVersion: 0,
    polling: false,
    pollGeneration: 0,
    connection: 'offline',
    serverOffsetMs: 0,
    countdownTimer: null,
    // 画板本地状态
    strokes: [],             // 累计笔画（已渲染）
    sinceStrokeIdx: 0,       // 已应用到 state.strokes 的进度
    currentStroke: null,     // 画手正在画的临时笔画
    optimisticStrokes: [],
    drawColor: SWATCHES[0],
    drawWidth: SIZES[1].width,
    eraseMode: false,
    mutationChain: Promise.resolve(),
    uncertainMutations: new Map(),
    deferredRender: false,
    lastUiSignature: '',
    createBusy: false,
    joinBusy: false,
  };

  function loadSession() {
    try {
      const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (value && value.accessToken && value.resumeSecret) return value;
      localStorage.removeItem(LEGACY_SESSION_KEY);
      return null;
    } catch { return null; }
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

  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function api(method, action, options) { return Protocol.request(method, action, options); }

  function baseBody(extra) {
    return { protocolVersion: Protocol.VERSION, ...(extra || {}) };
  }

  function enqueueMutation(action, payload, options) {
    const opts = options || {};
    const replayKey = `${action}:${JSON.stringify(payload || {})}`;
    const requestId = opts.requestId || state.uncertainMutations.get(replayKey) || Protocol.newRequestId(action);
    state.uncertainMutations.set(replayKey, requestId);
    const run = async () => {
      const room = state.roomState;
      const body = baseBody({
        code: state.session.code,
        requestId,
        ...(opts.expectedVersion === false ? {} : {
          expectedVersion: Math.max(state.commandVersion || 0, room ? room.version : 0),
        }),
        ...(payload || {}),
      });
      try {
        const response = await api('POST', action, {
          token: state.session.accessToken,
          body,
        });
        state.uncertainMutations.delete(replayKey);
        if (Number.isInteger(response.version)) state.commandVersion = response.version;
        return response;
      } catch (error) {
        if (!error.network && !(error.status >= 500) && error.status !== 429) {
          state.uncertainMutations.delete(replayKey);
        }
        throw error;
      }
    };
    const result = state.mutationChain.catch(() => {}).then(run);
    state.mutationChain = result;
    return result;
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
      invalid_request_id: '请求标识无效，请刷新后重试',
      invalid_expected_version: '房间版本无效，请刷新后重试',
      version_conflict: '房间刚刚发生变化，请重试',
      idempotency_conflict: '操作内容与重试记录不一致',
      unsupported_protocol_version: '游戏已更新，请刷新页面',
      stale_round: '本回合已经结束',
      spectator_until_next_round: '你将在下一回合加入',
      resume_denied: '恢复凭据已失效，请重新加入',
      target_offline: '该玩家当前离线，不能接任房主',
      game_not_ended: '本局尚未结束',
      chat_slow_down: '发送太快了，稍等一下',
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
    if (tag === 'button' && !node.hasAttribute('aria-label')) {
      const label = node.textContent.replace(/\[\[zi:[^\]]+\]\]\s*/g, '').trim();
      if (label) node.setAttribute('aria-label', label);
    }
    return node;
  }

  let toastTimer = null;
  function toast(msg, ms) {
    document.querySelectorAll('.dg-toast').forEach((node) => node.remove());
    const t = document.createElement('div');
    t.className = 'dg-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = msg;
    document.body.appendChild(t);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.remove(); }, ms || 2000);
  }

  function nav(hash) {
    if (location.hash !== hash) location.hash = hash;
    else render();
  }

  async function copyToClipboard(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg || '已复制');
    } catch { toast('复制失败，请长按房号手动复制'); }
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
  function connectionPill() {
    const labels = { online: '已连接', reconnecting: '重连中…', offline: '离线' };
    return el('span', {
      class: `dg-connection ${state.connection}`,
      role: 'status',
      'aria-live': 'polite',
    }, labels[state.connection] || labels.offline);
  }

  // ====================================================================
  // 表单状态
  // ====================================================================
  const createForm = {
    nick: getInitialNick(),
    customCode: '',
    difficulty: 'mix',
    roundSec: 90,
    roundsPerPlayer: 1,
    requestId: null,
  };
  const joinForm = { code: '', nick: getInitialNick(), requestId: null };

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
      }, '创建房间'),
      el('button', {
        class: 'dg-btn ghost',
        on: { click: () => nav('#/join') },
      }, '加入房间'),
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

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-create-nick' }, '你的昵称'));
    card.appendChild(el('input', {
      id: 'dg-create-nick',
      class: 'dg-input',
      type: 'text', maxlength: '12',
      placeholder: '1-12 字',
      value: createForm.nick,
      on: { input: (e) => { createForm.nick = e.target.value; createForm.requestId = null; updateCreateBtn(); } },
    }));

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-create-difficulty' }, '词库难度'));
    card.appendChild(el('select', {
      id: 'dg-create-difficulty',
      class: 'dg-select',
      on: { change: (e) => { createForm.difficulty = e.target.value; createForm.requestId = null; } },
    }, [
      el('option', { value: 'mix', selected: createForm.difficulty === 'mix' }, '混合（推荐）'),
      el('option', { value: 'easy', selected: createForm.difficulty === 'easy' }, '简单'),
      el('option', { value: 'medium', selected: createForm.difficulty === 'medium' }, '中等'),
      el('option', { value: 'hard', selected: createForm.difficulty === 'hard' }, '困难'),
    ]));

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-create-seconds' }, '每回合时长'));
    card.appendChild(el('select', {
      id: 'dg-create-seconds',
      class: 'dg-select',
      on: { change: (e) => { createForm.roundSec = parseInt(e.target.value, 10) || 90; createForm.requestId = null; } },
    }, [
      el('option', { value: '60', selected: createForm.roundSec === 60 }, '60 秒'),
      el('option', { value: '90', selected: createForm.roundSec === 90 }, '90 秒（推荐）'),
      el('option', { value: '120', selected: createForm.roundSec === 120 }, '120 秒'),
      el('option', { value: '150', selected: createForm.roundSec === 150 }, '150 秒'),
    ]));

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-create-rounds' }, '每人作画次数'));
    card.appendChild(el('select', {
      id: 'dg-create-rounds',
      class: 'dg-select',
      on: { change: (e) => { createForm.roundsPerPlayer = parseInt(e.target.value, 10) || 0; createForm.requestId = null; } },
    }, [
      el('option', { value: '1', selected: createForm.roundsPerPlayer === 1 }, '每人 1 次（推荐）'),
      el('option', { value: '2', selected: createForm.roundsPerPlayer === 2 }, '每人 2 次'),
      el('option', { value: '3', selected: createForm.roundsPerPlayer === 3 }, '每人 3 次'),
      el('option', { value: '0', selected: createForm.roundsPerPlayer === 0 }, '不限（房主手动结束）'),
    ]));

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-create-code' }, '自定义房号（可选 · 4 位数字）'));
    card.appendChild(el('input', {
      id: 'dg-create-code',
      class: 'dg-input',
      type: 'text', inputmode: 'numeric', maxlength: '4',
      placeholder: '留空则随机分配',
      value: createForm.customCode,
      on: { input: (e) => {
        createForm.customCode = e.target.value.replace(/\D/g, '').slice(0, 4);
        createForm.requestId = null;
        e.target.value = createForm.customCode;
      } },
    }));

    card.appendChild(el('div', { class: 'dg-row', style: { marginTop: '1rem', justifyContent: 'space-between' } }, [
      el('button', { class: 'dg-btn ghost', on: { click: () => nav('#/') } }, '← 返回'),
      el('button', {
        id: 'dg-create-btn',
        class: 'dg-btn primary',
        disabled: createForm.nick.trim() && !state.createBusy ? null : '',
        on: { click: doCreate },
      }, state.createBusy ? '创建中…' : '创建房间'),
    ]));
    wrap.appendChild(card);
    return wrap;
  }
  function updateCreateBtn() {
    const btn = document.getElementById('dg-create-btn');
    if (!btn) return;
    if (createForm.nick.trim() && !state.createBusy) btn.removeAttribute('disabled');
    else btn.setAttribute('disabled', '');
  }
  async function doCreate() {
    const nick = createForm.nick.trim();
    if (!nick) { toast('请填昵称'); return; }
    if (state.createBusy) return;
    state.createBusy = true;
    render();
    if (window.GamesShell && GamesShell.Identity) GamesShell.Identity.setNick(nick);
    try {
      const r = await api('POST', 'create', {
        body: baseBody({
          hostNick: nick,
          deviceId: getDeviceId(),
          requestId: createForm.requestId || (createForm.requestId = Protocol.newRequestId('create')),
          customCode: createForm.customCode || null,
          config: {
            difficulty: createForm.difficulty,
            roundSec: createForm.roundSec,
            roundsPerPlayer: createForm.roundsPerPlayer,
          },
        }),
      });
      const sess = {
        code: r.code, accessToken: r.accessToken, resumeSecret: r.resumeSecret, playerId: r.playerId,
        deviceId: getDeviceId(), nick,
      };
      saveSession(sess);
      state.session = sess;
      state.lastVersion = 0;
      state.commandVersion = r.version || 0;
      state.roomState = null;
      state.lastUiSignature = '';
      state.strokes = [];
      state.optimisticStrokes = [];
      createForm.requestId = null;
      nav('#/lobby');
    } catch (e) {
      if (!e.network && !(e.status >= 500) && e.status !== 429) createForm.requestId = null;
      toast(errMsg(e));
    }
    finally { state.createBusy = false; if (state.view === '#/create') render(); }
  }

  // ====================================================================
  // Join
  // ====================================================================
  function viewJoin() {
    const wrap = el('div');
    const card = el('section', { class: 'dg-card' });
    card.appendChild(el('h3', null, '加入房间'));

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-join-code' }, '房号（4 位数字）'));
    card.appendChild(el('input', {
      id: 'dg-join-code',
      class: 'dg-input',
      type: 'text', inputmode: 'numeric', maxlength: '4',
      placeholder: '例如 1234',
      value: joinForm.code,
      on: { input: (e) => {
        joinForm.code = e.target.value.replace(/\D/g, '').slice(0, 4);
        joinForm.requestId = null;
        e.target.value = joinForm.code;
        updateJoinBtn();
      } },
    }));

    card.appendChild(el('label', { class: 'dg-label', for: 'dg-join-nick' }, '你的昵称'));
    card.appendChild(el('input', {
      id: 'dg-join-nick',
      class: 'dg-input',
      type: 'text', maxlength: '12',
      placeholder: '1-12 字',
      value: joinForm.nick,
      on: { input: (e) => { joinForm.nick = e.target.value; joinForm.requestId = null; updateJoinBtn(); } },
    }));

    card.appendChild(el('div', { class: 'dg-row', style: { marginTop: '1rem', justifyContent: 'space-between' } }, [
      el('button', { class: 'dg-btn ghost', on: { click: () => nav('#/') } }, '← 返回'),
      el('button', {
        id: 'dg-join-btn',
        class: 'dg-btn primary',
        disabled: state.joinBusy || !/^\d{4}$/.test(joinForm.code) || !joinForm.nick.trim() ? '' : null,
        on: { click: doJoin },
      }, state.joinBusy ? '加入中…' : '加入'),
    ]));
    wrap.appendChild(card);
    return wrap;
  }
  function updateJoinBtn() {
    const btn = document.getElementById('dg-join-btn');
    if (!btn) return;
    if (/^\d{4}$/.test(joinForm.code) && joinForm.nick.trim() && !state.joinBusy) btn.removeAttribute('disabled');
    else btn.setAttribute('disabled', '');
  }
  async function doJoin() {
    const code = joinForm.code.trim();
    const nick = joinForm.nick.trim();
    if (!/^\d{4}$/.test(code)) { toast('房号 4 位数字'); return; }
    if (!nick) { toast('请填昵称'); return; }
    if (state.joinBusy) return;
    state.joinBusy = true;
    render();
    if (window.GamesShell && GamesShell.Identity) GamesShell.Identity.setNick(nick);
    try {
      const r = await api('POST', 'join', {
        body: baseBody({ code, nick, deviceId: getDeviceId(), requestId: joinForm.requestId || (joinForm.requestId = Protocol.newRequestId('join')) }),
      });
      const sess = {
        code: r.code, accessToken: r.accessToken, resumeSecret: r.resumeSecret, playerId: r.playerId,
        deviceId: getDeviceId(), nick,
      };
      saveSession(sess);
      state.session = sess;
      state.lastVersion = 0;
      state.commandVersion = r.version || 0;
      state.roomState = null;
      state.lastUiSignature = '';
      state.strokes = [];
      state.optimisticStrokes = [];
      joinForm.requestId = null;
      nav('#/lobby');
    } catch (e) {
      if (!e.network && !(e.status >= 500) && e.status !== 429) joinForm.requestId = null;
      toast(errMsg(e));
    }
    finally { state.joinBusy = false; if (state.view === '#/join') render(); }
  }

  // ====================================================================
  // Lobby
  // ====================================================================
  function viewLobby() {
    const r = state.roomState;
    if (!r) {
      return el('div', { style: { textAlign: 'center', padding: '2rem' } }, '加载房间…');
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
        connectionPill(),
        el('button', {
          class: 'dg-btn tiny',
          on: { click: () => copyToClipboard(r.code, '已复制房号') },
        }, '复制房号'),
        el('button', {
          class: 'dg-btn tiny',
          on: { click: () => copyShareLink(r.code) },
        }, '复制链接'),
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
      const onlineCount = players.filter((player) => player.online).length;
      const enough = onlineCount >= 2;
      card.appendChild(el('div', { style: { marginTop: '0.9rem', textAlign: 'center' } }, [
        el('button', {
          class: 'dg-btn primary',
          disabled: enough ? null : '',
          on: { click: doStart },
        }, enough ? '开始游戏' : `至少需要 2 人在线（当前 ${onlineCount}）`),
        el('div', { style: { fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.5rem' } },
          '不预设人数，邀请到位就开。中途加入者下一轮上场。'),
      ]));
    } else {
      card.appendChild(el('div', { style: { marginTop: '0.7rem', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.9rem' } },
        '等待房主开始游戏…'));
    }
    wrap.appendChild(card);

    // 规则汇总
    const sum = el('section', { class: 'dg-card' });
    sum.appendChild(el('h3', null, '本场设置'));
    sum.appendChild(el('div', { style: { fontSize: '0.88rem', lineHeight: '1.7', color: 'var(--color-muted)' } }, [
      el('div', null, `难度：${DIFFICULTY_LABELS[r.config.difficulty] || r.config.difficulty}`),
      el('div', null, `每回合：${r.config.roundSec} 秒`),
      el('div', null, `作画次数：${r.config.roundsPerPlayer > 0 ? '每人 ' + r.config.roundsPerPlayer + ' 次' : '不限（房主手动结束）'}`),
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
      }, '解散房间') : null,
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
        p.isHost ? el('span', { class: 'crown', 'aria-label': '房主' }, '房主') : null,
        el('div', { class: 'nick' }, p.nick),
        (p.score || 0) > 0 ? el('div', { class: 'score' }, String(p.score)) : null,
        (isHost && !p.isHost && !isMe) ? el('button', {
          class: 'kick',
          title: '踢出',
          'aria-label': `踢出 ${p.nick}`,
          on: { click: () => doKick(p.id, p.nick) },
        }, '移除') : null,
      ]);
      list.appendChild(node);
    }
    return list;
  }

  async function doStart() {
    try {
      await enqueueMutation('start');
    } catch (e) { toast(errMsg(e)); }
  }
  async function doKick(targetPid, nick) {
    if (!confirm(`确认踢出 ${nick}？`)) return;
    try {
      await enqueueMutation('kick', { targetPid });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doLeave() {
    const isHost = amIHost();
    if (isHost) {
      const others = (state.roomState.players || []).filter((p) => !p.kicked && p.online && p.id !== state.session.playerId);
      if (others.length > 0) {
        showHostLeaveModal(others);
        return;
      }
      if (!confirm('你是房主，离开会解散房间，确定？')) return;
      try { await enqueueMutation('leave', { dissolveOnLeave: true }); }
      catch (e) { toast(errMsg(e)); return; }
    } else {
      try { await enqueueMutation('leave'); }
      catch (e) { toast(errMsg(e)); return; }
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
      await enqueueMutation('dissolve');
    } catch (e) { toast(errMsg(e)); }
  }
  async function doTransferAndLeave(targetPid) {
    try {
      await enqueueMutation('leave', { transferTo: targetPid });
    } catch (e) { toast(errMsg(e)); return; }
    saveSession(null);
    state.session = null;
    state.roomState = null;
    state.polling = false;
    nav('#/');
  }

  function showHostLeaveModal(others) {
    const bg = el('div', { class: 'dg-modal-bg' });
    const m = el('div', { class: 'dg-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dg-host-leave-title', tabindex: '-1' });
    m.appendChild(el('h3', { id: 'dg-host-leave-title' }, '你是房主，怎么办？'));
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
    bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    document.body.appendChild(bg);
    requestAnimationFrame(() => m.focus());
  }
  function closeModal() {
    document.querySelectorAll('.dg-modal-bg').forEach((n) => n.remove());
  }

  // ====================================================================
  // Play
  // ====================================================================
  function viewPlay() {
    const r = state.roomState;
    if (!r) return el('div', { style: { textAlign: 'center', padding: '2rem' } }, '加载…');

    const wrap = el('div');

    // 房号小条 + 房主操作
    const isHost = amIHost();
    const topActions = el('div', { class: 'dg-row', style: { justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.85rem', color: 'var(--color-muted)' } }, [
      el('div', null, `房号 ${r.code} · ${(r.players || []).filter((p) => !p.kicked).length} 人`),
      el('div', { class: 'dg-row', style: { gap: '0.3rem' } }, [
        connectionPill(),
        el('button', { class: 'dg-btn ghost tiny', on: { click: () => copyShareLink(r.code) } }, '邀请'),
        isHost ? el('button', { class: 'dg-btn ghost tiny', on: { click: doSkip } }, '跳过本回合') : null,
        isHost ? el('button', { class: 'dg-btn danger tiny', on: { click: doEnd } }, '结束游戏') : null,
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
    const totalLabel = r.config.roundsPerPlayer > 0 ? ` · 每人 ${r.config.roundsPerPlayer} 次` : '';
    const phaseLabel = round ? ({
      'pick-word': '选词中',
      'drawing': '画图中',
      'reveal': '本回合结束',
    }[round.phase] || round.phase) : '';
    const remain = round && round.deadlineTs > 0 ? Math.max(0, round.deadlineTs - (Date.now() + state.serverOffsetMs)) : 0;
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
          wordNode = el('div', { class: 'word-display drawer-word' }, `题目：${r.me.currentWord}`);
        } else if (round.phase === 'reveal' && r.round.wordRevealed) {
          wordNode = el('div', { class: 'word-display drawer-word' }, `答案：${r.round.wordRevealed}`);
        }
      } else {
        if (round.phase === 'drawing' && round.wordHint) {
          wordNode = el('div', { class: 'word-display' }, `${round.wordHint.mask}（${round.wordHint.len} 字）`);
        } else if (round.phase === 'pick-word') {
          const drawer = (r.players || []).find((p) => p.id === round.drawerPid);
          wordNode = el('div', { class: 'word-display' }, `${drawer ? drawer.nick : '画手'} 在选词…`);
        } else if (round.phase === 'reveal' && round.wordRevealed) {
          wordNode = el('div', { class: 'word-display' }, `答案：${round.wordRevealed}`);
        }
      }
    }

    return el('div', { class: 'dg-topbar' }, [
      el('span', { class: 'round-pill' }, `第 ${round ? round.n : 1} 回合${totalLabel} · ${phaseLabel}`),
      wordNode,
      round ? el('span', { id: 'dg-countdown', class: cls }, sec + 's') : null,
    ]);
  }

  function renderCanvasArea(r) {
    const wrap = el('div', { class: 'dg-canvas-wrap', id: 'dg-canvas-wrap' });
    const canvas = el('canvas', {
      class: 'dg-canvas', id: 'dg-canvas', role: 'img',
      'aria-label': amIDrawer() ? '绘图画布，可用鼠标或触摸绘制' : '画手正在绘制的画布',
    });
    wrap.appendChild(canvas);

    // 覆盖层：选词 / reveal
    const round = r.round;
    if (round) {
      if (round.phase === 'pick-word') {
        const overlay = el('div', { class: 'dg-canvas-overlay' });
        const panel = el('div', { class: 'panel' });
        if (amIDrawer() && r.me && r.me.wordChoices) {
          panel.appendChild(el('h2', null, '你来画！'));
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
          panel.appendChild(el('h2', null, (drawer ? drawer.nick : '画手') + ' 正在选词…'));
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
    const colorNames = ['黑色', '红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '白色'];
    SWATCHES.forEach((c, index) => {
      const sw = el('button', {
        class: 'swatch' + (state.drawColor === c && !state.eraseMode ? ' active' : ''),
        style: { background: c, border: c === '#ffffff' ? '2px solid #ccc' : null },
        title: colorNames[index],
        'aria-label': `画笔颜色：${colorNames[index]}`,
        'aria-pressed': state.drawColor === c && !state.eraseMode ? 'true' : 'false',
        on: { click: () => { state.drawColor = c; state.eraseMode = false; render(); } },
      });
      bar.appendChild(sw);
    });
    SIZES.forEach((s) => {
      bar.appendChild(el('button', {
        class: 'size-btn' + (Math.abs(state.drawWidth - s.width) < 0.0005 ? ' active' : ''),
        'aria-label': `${s.label}画笔`,
        'aria-pressed': Math.abs(state.drawWidth - s.width) < 0.0005 ? 'true' : 'false',
        on: { click: () => { state.drawWidth = s.width; render(); } },
      }, s.label));
    });
    bar.appendChild(el('button', {
      class: 'size-btn' + (state.eraseMode ? ' active' : ''),
      'aria-pressed': state.eraseMode ? 'true' : 'false',
      on: { click: () => { state.eraseMode = !state.eraseMode; render(); } },
    }, '橡皮'));
    bar.appendChild(el('div', { class: 'tool-spacer' }));
    bar.appendChild(el('button', {
      class: 'dg-btn ghost tiny',
      on: { click: doUndo },
    }, '撤销'));
    bar.appendChild(el('button', {
      class: 'dg-btn ghost tiny',
      on: { click: doClear },
    }, '清空画布'));
    return bar;
  }

  function renderSidebar(r) {
    const sidebar = el('div', { class: 'dg-sidebar' });
    sidebar.appendChild(renderChatMessages(r));
    sidebar.appendChild(renderChatInput(r));
    sidebar.appendChild(renderScoreboard(r));
    return sidebar;
  }

  function renderScoreboard(r) {
    const score = el('div', { class: 'dg-scoreboard' });
    score.appendChild(el('h4', null, '计分板'));
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
        el('span', { class: 'icon' }, p.id === drawerPid ? '画' : (correctSet.has(p.id) ? '✓' : (p.online ? '·' : '离线'))),
        el('span', { class: 'nick' }, p.nick + (p.isHost ? '（房主）' : '')),
        el('span', { class: 'score' }, String(p.score || 0)),
      ]));
    });
    return score;
  }

  function renderChatMessages(r) {
    const messages = el('div', { class: 'dg-chat-messages', id: 'dg-chat-messages', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    (r.chat || []).forEach((m) => messages.appendChild(renderChatMsg(m, r)));
    return messages;
  }

  // 画手在 pick-word / drawing 阶段全程禁言（避免直接报答案）。
  // reveal、lobby 等空隙允许聊天。
  function renderChatInput(r) {
    const isDrawer = amIDrawer();
    const me = r.me;
    const hasGuessed = me && r.round && (r.round.correctGuessers || []).includes(me.playerId);
    const isRoundGuesser = me && r.round && (r.round.guesserPids || []).includes(me.playerId);
    const phase = r.round ? r.round.phase : null;
    const isDrawing = phase === 'drawing';
    const isPickWord = phase === 'pick-word';
    const drawerSilent = isDrawer && (isDrawing || isPickWord);

    let placeholder = '聊天…';
    let disabled = false;
    if (drawerSilent) { placeholder = '画手不能发消息'; disabled = true; }
    else if (isDrawing && !isRoundGuesser) { placeholder = '旁观本回合 · 下一回合加入'; disabled = true; }
    else if (isDrawing && !hasGuessed) placeholder = '在这里猜词';
    else if (isDrawing && hasGuessed) placeholder = '你已猜中，可以聊天';

    const input = el('input', {
      type: 'text', maxlength: '30',
      id: 'dg-chat-draft',
      'aria-label': isDrawing && !hasGuessed ? '输入猜词' : '输入聊天消息',
      placeholder,
      disabled: disabled ? '' : null,
      on: {
        keydown: async (e) => {
          if (e.key === 'Enter' && !e.isComposing) {
            const v = e.target.value.trim();
            if (v && await sendGuess(v)) e.target.value = '';
          }
        },
      },
    });
    const send = el('button', {
      class: 'dg-btn primary tiny',
      disabled: disabled ? '' : null,
      on: {
        click: async () => {
          const v = input.value.trim();
          if (v && await sendGuess(v)) input.value = '';
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
      const tag = m.order <= 3 ? `第 ${m.order} 位` : '猜中';
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
      await enqueueMutation('pickword', { roundId: state.roomState.round.roundId, wordIndex: idx });
    } catch (e) { toast(errMsg(e)); }
  }
  async function sendGuess(text) {
    try {
      await enqueueMutation('guess', { roundId: state.roomState.round ? state.roomState.round.roundId : null, text }, { expectedVersion: false });
      return true;
    } catch (e) { toast(errMsg(e)); return false; }
  }
  async function doClear() {
    try {
      await enqueueMutation('clear', { roundId: state.roomState.round.roundId });
      state.strokes = [];
      state.optimisticStrokes = [];
      state.sinceStrokeIdx = 0;
      redrawCanvas();
    } catch (e) { toast(errMsg(e)); }
  }
  async function doUndo() {
    try {
      await enqueueMutation('undo', { roundId: state.roomState.round.roundId });
      state.strokes.pop();
      state.sinceStrokeIdx = state.strokes.length;
      redrawCanvas();
    } catch (e) { toast(errMsg(e)); }
  }
  async function doSkip() {
    try {
      await enqueueMutation('skip', { roundId: state.roomState.round.roundId });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doEnd() {
    if (!confirm('确认结束游戏？将进入最终排行榜。')) return;
    try {
      await enqueueMutation('end');
    } catch (e) { toast(errMsg(e)); }
  }

  // ====================================================================
  // End view
  // ====================================================================
  function viewEnd() {
    const r = state.roomState;
    if (!r) return el('div', null, '加载…');
    const wrap = el('div');
    const card = el('section', { class: 'dg-card' });
    card.appendChild(el('h3', null, '最终排行榜'));
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
      }, '再来一局') : null,
    ]));
    wrap.appendChild(card);
    return wrap;
  }

  async function doRematch() {
    if (!confirm('保留当前房间和玩家，立即开始新一局？')) return;
    try { await enqueueMutation('rematch'); }
    catch (e) { toast(errMsg(e)); }
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
    for (const pending of state.optimisticStrokes) drawStroke(ctx, pending.stroke, w, h);
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
    let strokeStartedAt = 0;

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
      strokeStartedAt = Date.now();
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
        if (state.currentStroke.points.length >= 100 || Date.now() - strokeStartedAt >= 250) {
          const stroke = state.currentStroke;
          const requestId = Protocol.newRequestId('stroke');
          state.optimisticStrokes.push({ requestId, stroke });
          state.currentStroke = {
            points: [p], color: state.drawColor, width: state.drawWidth,
            kind: state.eraseMode ? 'erase' : 'pen',
          };
          strokeStartedAt = Date.now();
          sendStroke(stroke, requestId, state.roomState.round.roundId);
          redrawCanvas();
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
        const requestId = Protocol.newRequestId('stroke');
        state.optimisticStrokes.push({ requestId, stroke: s });
        state.currentStroke = null;
        redrawCanvas();
        sendStroke(s, requestId, state.roomState.round.roundId);
      } else {
        state.currentStroke = null;
        redrawCanvas();
      }
      if (state.deferredRender) {
        state.deferredRender = false;
        render();
      }
    }

    c.addEventListener('pointerdown', start);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', (e) => { if (drawing) end(e); });
  }

  async function sendStroke(stroke, requestId, roundId) {
    try {
      const result = await enqueueMutation('stroke', { roundId, stroke }, { expectedVersion: false, requestId });
      const pendingIndex = state.optimisticStrokes.findIndex((item) => item.requestId === requestId);
      if (pendingIndex >= 0) state.optimisticStrokes.splice(pendingIndex, 1);
      if (state.roomState && state.roomState.round && state.roomState.round.roundId === roundId
          && result.strokeIndex === state.strokes.length) {
        state.strokes.push(stroke);
        state.sinceStrokeIdx = state.strokes.length;
      }
      redrawCanvas();
    } catch (e) {
      const pendingIndex = state.optimisticStrokes.findIndex((item) => item.requestId === requestId);
      if (pendingIndex >= 0) state.optimisticStrokes.splice(pendingIndex, 1);
      redrawCanvas();
      toast(errMsg(e));
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

    const previousInput = document.getElementById('dg-chat-draft');
    const draft = previousInput ? previousInput.value : '';
    const hadFocus = previousInput && document.activeElement === previousInput;
    const selectionStart = hadFocus ? previousInput.selectionStart : null;
    const previousMessages = document.getElementById('dg-chat-messages');
    const previousScrollTop = previousMessages ? previousMessages.scrollTop : 0;
    const wasNearBottom = previousMessages
      ? previousMessages.scrollHeight - previousMessages.scrollTop - previousMessages.clientHeight < 36
      : true;
    const $view = document.getElementById('dg-view');
    $view.classList.toggle('dg-in-room', ['#/lobby', '#/play', '#/end'].includes(route));
    const gameWrap = $view.closest('.dg-wrap');
    if (gameWrap) gameWrap.classList.toggle('in-session', ['#/lobby', '#/play', '#/end'].includes(route));
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
    requestAnimationFrame(() => {
      const input = document.getElementById('dg-chat-draft');
      if (input && !input.disabled) {
        input.value = draft;
        if (hadFocus) {
          input.focus({ preventScroll: true });
          if (selectionStart != null) input.setSelectionRange(selectionStart, selectionStart);
        }
      }
      const messages = document.getElementById('dg-chat-messages');
      if (messages) messages.scrollTop = wasNearBottom ? messages.scrollHeight : previousScrollTop;
    });
  }
  function tickCountdown() {
    const n = document.getElementById('dg-countdown');
    if (!n || !state.roomState || !state.roomState.round) return;
    const remain = state.roomState.round.deadlineTs - (Date.now() + state.serverOffsetMs);
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
    const generation = ++state.pollGeneration;
    pollLoop(generation);
  }
  function stopPolling() { state.polling = false; state.pollGeneration++; }

  function setConnection(next) {
    if (state.connection === next) return;
    state.connection = next;
    document.querySelectorAll('.dg-connection').forEach((node) => {
      node.className = `dg-connection ${next}`;
      node.textContent = { online: '已连接', reconnecting: '重连中…', offline: '离线' }[next] || '离线';
    });
  }

  async function resumeSession() {
    const session = state.session;
    if (!session || !session.resumeSecret) return false;
    try {
      const response = await api('POST', 'resume', {
        body: baseBody({
          code: session.code,
          playerId: session.playerId,
          resumeSecret: session.resumeSecret,
          requestId: Protocol.newRequestId('resume'),
        }),
      });
      session.accessToken = response.accessToken;
      state.commandVersion = Math.max(state.commandVersion, response.version || 0);
      saveSession(session);
      return true;
    } catch { return false; }
  }

  async function pollLoop(generation) {
    while (state.polling && generation === state.pollGeneration && state.session && state.session.accessToken) {
      try {
        const r = await api('GET', 'state', {
          token: state.session.accessToken,
          query: {
            protocolVersion: Protocol.VERSION,
            code: state.session.code,
            since: state.lastVersion,
            sinceStroke: state.sinceStrokeIdx,
          },
        });
        setConnection('online');
        if (Number.isFinite(r.serverTs)) state.serverOffsetMs = r.serverTs - Date.now();
        if (r.version > state.lastVersion) {
          state.lastVersion = r.version;
          state.commandVersion = Math.max(state.commandVersion, r.version);
          const prev = state.roomState;
          state.roomState = r;
          applyStrokesDelta(r, prev);
          onStateUpdate(r, prev);
        }
        if (document.hidden) await sleep(6000);
      } catch (e) {
        setConnection('reconnecting');
        if (e.status === 403 && await resumeSession()) continue;
        if (e.status === 403 || e.status === 404 || e.message === 'unsupported_protocol_version') {
          toast(errMsg(e));
          saveSession(null);
          state.session = null;
          state.roomState = null;
          state.polling = false;
          state.strokes = [];
          state.optimisticStrokes = [];
          state.sinceStrokeIdx = 0;
          nav('#/');
          return;
        }
        await sleep(2500);
      }
    }
  }

  function applyStrokesDelta(r, prev) {
    if (!r.round) {
      state.strokes = [];
      state.optimisticStrokes = [];
      state.sinceStrokeIdx = 0;
      return;
    }
    // 回合切换：清空本地
    if (!prev || !prev.round || prev.round.roundId !== r.round.roundId) {
      state.strokes = [];
      state.optimisticStrokes = [];
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
    const signature = JSON.stringify({
      code: r.code, state: r.state, config: r.config, hostPlayerId: r.hostPlayerId,
      players: r.players, me: r.me, chat: r.chat, finalScores: r.finalScores,
      round: r.round ? {
        n: r.round.n, roundId: r.round.roundId, drawerPid: r.round.drawerPid,
        phase: r.round.phase, wordHint: r.round.wordHint, wordRevealed: r.round.wordRevealed,
        correctGuessers: r.round.correctGuessers, guesserPids: r.round.guesserPids,
      } : null,
    });
    if (signature === state.lastUiSignature) { redrawCanvas(); return; }
    state.lastUiSignature = signature;
    if (state.currentStroke) {
      state.deferredRender = true;
      redrawCanvas();
      return;
    }
    render();
  }

  // ====================================================================
  // 启动
  // ====================================================================
  function init() {
    const s = loadSession();
    if (s && s.code && s.accessToken && s.resumeSecret) state.session = s;

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
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && ['#/lobby', '#/play', '#/end'].includes(state.view)) ensurePolling();
    });
    render();
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (window.GamesShell && GamesShell.Comments) {
      GamesShell.Comments.mount({
        container: document.getElementById('dg-cm-mount'),
        path: '/toolbox/drawing/',
        title: '玩法吐槽 / 词库求增',
        intro: '说说你想加什么词、遇到什么 bug ~',
        placeholder: '聊聊你画我猜心得 ~',
      });
    }
    init();
  });
})();
