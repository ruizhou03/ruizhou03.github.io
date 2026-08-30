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
  const SWATCHES = ['#e26f54', '#3e88a6', '#78a97f', '#e9bd55', '#514b45', '#ffffff'];
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
    drawWidth: 0.008,
    eraseMode: false,
    mutationChain: Promise.resolve(),
    uncertainMutations: new Map(),
    deferredRender: false,
    lastUiSignature: '',
    createBusy: false,
    joinBusy: false,
    mobilePanel: 'stage',
    createStep: 1,
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
      invalid_word_choice_set: '这组词已失效，请重新选择',
      word_refreshes_exhausted: '本回合已经换过两次词了',
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
          node.setAttribute(k, '');
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
    if (location.hash !== hash) {
      state.mobilePanel = 'stage';
      location.hash = hash;
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    }
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
  function icon(name, className) {
    const icons = window.GamesShell && GamesShell.DrawingIcons;
    return el('span', { class: className || 'dg-inline-icon', html: icons ? icons.svg(name) : '' });
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
    const wrap = el('section', { class: 'dg-entry dg-setup-card compact' });
    const main = el('div', { class: 'dg-entry-main' });
    main.appendChild(el('header', { class: 'dg-section-head dg-setup-head' }, [
      el('h2', null, '开一张画桌'),
      el('p', null, '创建房间，或加入朋友的房间。'),
    ]));
    main.appendChild(el('div', { class: 'dg-entry-actions' }, [
      el('button', { class: 'dg-entry-action create', on: { click: () => nav('#/create') } }, [
        el('span', { class: 'action-icon' }, icon('create')),
        el('span', null, [el('strong', null, '创建房间'), el('small', null, '决定词库、时间与作画轮数')]),
      ]),
      el('button', { class: 'dg-entry-action join', on: { click: () => nav('#/join') } }, [
        el('span', { class: 'action-icon' }, icon('join')),
        el('span', null, [el('strong', null, '加入房间'), el('small', null, '输入四位房号，加入朋友的画桌')]),
      ]),
    ]));
    wrap.appendChild(main);
    return wrap;
  }

  // ====================================================================
  // Create
  // ====================================================================
  function viewCreate() {
    const wrap = el('section', { class: 'dg-create-main dg-setup-card' });
    wrap.appendChild(el('header', { class: 'dg-section-head dg-setup-head' }, [el('h2', null, '创建房间')]));
    const grid = el('div', { class: 'dg-form-grid' });
    const nick = el('input', {
      id: 'dg-create-nick',
      class: 'dg-input',
      type: 'text', maxlength: '12',
      placeholder: '1-12 字',
      value: createForm.nick,
      on: { input: (e) => { createForm.nick = e.target.value; createForm.requestId = null; updateCreateBtn(); } },
    });
    const segment = (id, value, current, label, set) => el('button', {
      id, type: 'button', class: 'dg-segment' + (value === current ? ' selected' : ''),
      'aria-pressed': value === current ? 'true' : 'false',
      on: { click: () => { set(value); createForm.requestId = null; render(); } },
    }, label);
    const difficulty = el('div', { id: 'dg-create-difficulty', class: 'dg-segments' }, [
      segment('dg-diff-mix', 'mix', createForm.difficulty, '混合', (v) => { createForm.difficulty = v; }),
      segment('dg-diff-easy', 'easy', createForm.difficulty, '简单', (v) => { createForm.difficulty = v; }),
      segment('dg-diff-medium', 'medium', createForm.difficulty, '中等', (v) => { createForm.difficulty = v; }),
      segment('dg-diff-hard', 'hard', createForm.difficulty, '困难', (v) => { createForm.difficulty = v; }),
    ]);
    const seconds = el('div', { id: 'dg-create-seconds', class: 'dg-segments' }, [60, 90, 120, 150].map((v) =>
      segment(`dg-sec-${v}`, v, createForm.roundSec, `${v} 秒`, (next) => { createForm.roundSec = next; })));
    const rounds = el('div', { id: 'dg-create-rounds', class: 'dg-segments', 'aria-label': '每人作画次数' }, [1, 2, 3, 0].map((v) =>
      segment(`dg-rounds-${v}`, v, createForm.roundsPerPlayer, v ? `${v} 次` : '不限', (next) => { createForm.roundsPerPlayer = next; })));
    const code = el('input', {
      id: 'dg-create-code',
      class: 'dg-input dg-room-code-input',
      type: 'text', inputmode: 'numeric', maxlength: '4',
      placeholder: '留空则随机分配',
      value: createForm.customCode,
      on: { input: (e) => {
        createForm.customCode = e.target.value.replace(/\D/g, '').slice(0, 4);
        createForm.requestId = null;
        e.target.value = createForm.customCode;
      } },
    });
    const field = (label, id, control, full) => el('div', { class: 'dg-field dg-field-card' + (full ? ' full' : '') }, [el('label', { class: 'dg-label', for: id }, label), control]);
    grid.appendChild(field('你的昵称', 'dg-create-nick', nick, true));
    grid.appendChild(field('词库', 'dg-create-difficulty', difficulty, true));
    grid.appendChild(el('div', { class: 'dg-choice-pair full' }, [
      field('单轮时间', 'dg-create-seconds', seconds),
      el('span', { class: 'dg-choice-divider', 'aria-hidden': 'true' }),
      field('每人作画', 'dg-create-rounds', rounds),
    ]));
    grid.appendChild(field('房号', 'dg-create-code', code, true));
    wrap.appendChild(grid);
    wrap.appendChild(el('div', { class: 'dg-form-actions dg-form-footer' }, [
      el('span', { class: 'dg-form-summary' }, `${DIFFICULTY_LABELS[createForm.difficulty]}词库 · ${createForm.roundSec} 秒 · ${createForm.roundsPerPlayer ? `每人 ${createForm.roundsPerPlayer} 次` : '不限'}`),
      el('div', { class: 'dg-row' }, [
        el('button', { class: 'dg-btn ghost', on: { click: () => nav('#/') } }, [icon('back'), document.createTextNode(' 返回')]),
        el('button', { id: 'dg-create-btn', class: 'dg-btn primary', disabled: createForm.nick.trim() && !state.createBusy ? null : '', on: { click: doCreate } }, [icon('create'), document.createTextNode(state.createBusy ? ' 创建中…' : ' 创建房间')]),
      ]),
    ]));
    return wrap;
  }
  function updateCreateSummary() {
    const main = document.getElementById('dg-create-summary-main');
    const rounds = document.getElementById('dg-create-summary-rounds');
    if (main) main.textContent = `${DIFFICULTY_LABELS[createForm.difficulty]} · ${createForm.roundSec} 秒`;
    if (rounds) rounds.textContent = createForm.roundsPerPlayer ? `每人 ${createForm.roundsPerPlayer} 次` : '不限轮数';
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
    const wrap = el('section', { class: 'dg-join-shell dg-setup-card' });
    const invited = /^\d{4}$/.test(joinForm.code);
    const ticket = el('section', { class: 'dg-join-ticket' }, [
      el('div', null, [
        invited ? el('span', { class: 'dg-side-kicker' }, '朋友邀请你') : null,
        el('h2', null, invited ? `房间 ${joinForm.code}` : '加入朋友的画桌'),
        el('p', null, invited ? '填写昵称即可入座' : '输入四位房号'),
      ]),
      el('span', { class: 'dg-side-kicker' }, 'DRAW & GUESS'),
    ]);
    const codeCells = el('div', { class: 'dg-code-cells', role: 'group', 'aria-label': '四位房号' });
    const syncCodeCells = (focusIndex) => {
      const cells = [...codeCells.querySelectorAll('input')];
      joinForm.code = cells.map((cell) => cell.value.replace(/\D/g, '').slice(-1)).join('');
      joinForm.requestId = null;
      if (Number.isInteger(focusIndex) && cells[focusIndex]) cells[focusIndex].focus();
      updateJoinBtn();
    };
    for (let index = 0; index < 4; index++) {
      codeCells.appendChild(el('input', {
        ...(index === 0 ? { id: 'dg-join-code' } : {}),
        class: 'dg-code-cell', type: 'text', inputmode: 'numeric', maxlength: '1',
        value: joinForm.code[index] || '', 'aria-label': `房号第 ${index + 1} 位`,
        on: {
          input: (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(-1); syncCodeCells(e.target.value && index < 3 ? index + 1 : null); },
          keydown: (e) => { if (e.key === 'Backspace' && !e.target.value && index > 0) syncCodeCells(index - 1); },
          paste: (e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            if (pasted.length === 4) { e.preventDefault(); joinForm.code = pasted; render(); }
          },
        },
      }));
    }
    ticket.firstChild.appendChild(codeCells);
    const card = el('div', { class: 'dg-join-card dg-join-form' });
    card.appendChild(el('header', { class: 'dg-join-heading dg-setup-head' }, [el('h2', null, invited ? '加入这张画桌' : '加入房间')]));
    const grid = el('div', { class: 'dg-join-fields dg-form-grid' });
    const nick = el('input', {
      id: 'dg-join-nick',
      class: 'dg-input',
      type: 'text', maxlength: '12',
      placeholder: '1-12 字',
      value: joinForm.nick,
      on: { input: (e) => { joinForm.nick = e.target.value; joinForm.requestId = null; updateJoinBtn(); } },
    });
    grid.appendChild(el('div', { class: 'dg-field full' }, [el('label', { class: 'dg-label', for: 'dg-join-nick' }, '你的昵称'), nick]));
    card.appendChild(grid);
    card.appendChild(el('div', { class: 'dg-form-actions' }, [
      el('button', { class: 'dg-btn ghost', on: { click: () => nav('#/') } }, [icon('back'), document.createTextNode(' 返回')]),
      el('button', {
        id: 'dg-join-btn',
        class: 'dg-btn primary',
        disabled: state.joinBusy || !/^\d{4}$/.test(joinForm.code) || !joinForm.nick.trim() ? '' : null,
        on: { click: doJoin },
      }, [icon('join'), document.createTextNode(state.joinBusy ? ' 加入中…' : ' 加入房间')]),
    ]));
    wrap.appendChild(el('div', { class: 'dg-join-layout' }, [ticket, card]));
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
    if (!r) return el('div', { class: 'dg-lobby-note' }, '正在进入房间…');
    const wrap = el('section', { class: 'dg-lobby dg-lobby-layout' });
    const isHost = amIHost();
    const players = (r.players || []).filter((p) => !p.kicked);
    const main = el('section', { class: 'dg-lobby-main' });
    main.appendChild(el('header', { class: 'dg-lobby-head' }, [
      el('div', null, [el('h2', null, isHost ? (players.length === 1 ? '邀请朋友入座' : '准备开始') : '等待房主开局'), el('span', null, `${players.length} / 12 人已入座`)]),
    ]));
    const playerSection = el('section', { class: 'dg-player-section' });
    playerSection.appendChild(el('header', { class: 'dg-player-section-head' }, [
      el('h3', null, '同桌玩家'),
      el('span', { class: 'dg-side-kicker' }, `${players.filter((p) => p.online).length} 人在线`),
    ]));
    playerSection.appendChild(renderPlayerList(players, isHost));
    main.appendChild(playerSection);
    const actions = el('div', { class: 'dg-lobby-start' });
    if (isHost) {
      const onlineCount = players.filter((player) => player.online).length;
      const enough = onlineCount >= 2;
      actions.appendChild(el('button', { class: 'dg-btn ghost', on: { click: doLeave } }, [icon('exit'), document.createTextNode(' 离开') ]));
      actions.appendChild(el('button', { class: 'dg-btn danger', on: { click: () => doDissolve(false) } }, '解散房间'));
      actions.appendChild(el('button', { class: 'dg-btn primary', disabled: enough ? null : '', on: { click: doStart } }, [icon('start'), document.createTextNode(enough ? ' 开始游戏' : ` 等待玩家 ${onlineCount}/2`) ]));
    } else {
      actions.appendChild(el('button', { class: 'dg-btn ghost', on: { click: doLeave } }, [icon('exit'), document.createTextNode(' 离开房间') ]));
    }
    main.appendChild(actions);
    wrap.appendChild(main);
    wrap.appendChild(el('aside', { class: 'dg-invite-island' }, [
      el('header', { class: 'dg-invite-head' }, [el('span', null, '房间'), el('div', { class: 'dg-code-display' }, r.code)]),
      el('div', { class: 'dg-invite-actions' }, [
        el('button', { class: 'dg-btn primary', on: { click: () => copyShareLink(r.code) } }, [icon('invite'), document.createTextNode(' 复制邀请链接')]),
        el('button', { class: 'dg-btn ghost', on: { click: () => copyToClipboard(r.code, '已复制四位房号') } }, [icon('copy'), document.createTextNode(` 复制房号 ${r.code}`)]),
      ]),
      el('div', { class: 'dg-setting-list' }, [
        el('div', null, [el('span', null, '词库'), el('b', null, DIFFICULTY_LABELS[r.config.difficulty] || r.config.difficulty)]),
        el('div', null, [el('span', null, '单轮'), el('b', null, `${r.config.roundSec} 秒`)]),
        el('div', null, [el('span', null, '作画'), el('b', null, r.config.roundsPerPlayer ? `每人 ${r.config.roundsPerPlayer} 次` : '不限')]),
      ]),
    ]));
    return wrap;
  }

  function renderPlayerList(players, isHost) {
    const list = el('div', { class: 'dg-player-list dg-seat-grid' });
    for (const p of players) {
      const isMe = state.session && p.id === state.session.playerId;
      const cls = ['dg-player'];
      if (isMe) cls.push('me');
      if (p.isHost) cls.push('host');
      if (!p.online) cls.push('offline');
      const identity = el('div', { class: 'dg-player-copy' }, [
        el('div', { class: 'nick' }, p.nick),
        el('div', { class: 'crown' }, p.isHost ? '房主' : (isMe ? '这是你' : (p.online ? '在线' : '离线'))),
      ]);
      const node = el('div', { class: cls.join(' ') }, [
        el('div', { class: 'seat-num dg-seat-avatar' }, String(p.seat)),
        identity,
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
    if (players.length < 12) {
      list.appendChild(el('div', { class: 'dg-player dg-seat waiting' }, [
        el('span', { class: 'dg-waiting-dots', 'aria-label': '等待新玩家' }, [el('i'), el('i'), el('i')]),
        el('div', { class: 'dg-player-copy' }, [el('div', { class: 'nick' }, '等待新玩家')]),
      ]));
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
    if (!r) return el('div', { class: 'dg-lobby-note' }, '正在同步画桌…');
    const wrap = el('section', { class: 'dg-game dg-game-board' });
    const isHost = amIHost();
    const topActions = el('div', { class: 'dg-game-command' }, [
      el('div', { class: 'dg-room-meta' }, `房间 ${r.code} · 第 ${r.round ? r.round.n : 1} 回合 · ${(r.players || []).filter((p) => !p.kicked && p.online).length} 人在线`),
      el('div', { class: 'dg-row' }, [
        el('button', { class: 'dg-btn ghost tiny', on: { click: () => copyShareLink(r.code) } }, [icon('invite'), document.createTextNode(' 邀请')]),
        isHost ? el('button', { class: 'dg-btn ghost tiny', on: { click: doSkip } }, '跳过') : null,
        isHost ? el('button', { class: 'dg-btn danger tiny', on: { click: doEnd } }, '结束') : null,
        el('button', { class: 'dg-btn ghost tiny', on: { click: doLeave } }, [icon('exit'), document.createTextNode(' 离开')]),
      ]),
    ]);
    wrap.appendChild(topActions);
    wrap.appendChild(renderTopbar(r));
    const left = el('div', { class: 'dg-canvas-column' });
    left.appendChild(renderCanvasArea(r));
    if (amIDrawer() && r.round && r.round.phase === 'drawing') {
      left.appendChild(renderToolbar());
    }
    wrap.appendChild(left);

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
    const categoryHint = round && round.wordHint && round.wordHint.revealed && round.wordHint.category
      ? `【提示：${round.wordHint.category}】`
      : '';
    if (round) {
      if (amIDrawer()) {
        if (round.phase === 'pick-word') {
          wordNode = el('div', { class: 'word-display drawer-word' }, '轮到你选词');
        } else if (round.phase === 'drawing' && r.me && r.me.currentWord) {
          wordNode = el('div', { class: 'word-display drawer-word' }, `题目：${r.me.currentWord}`);
        } else if (round.phase === 'reveal' && r.round.wordRevealed) {
          wordNode = el('div', { class: 'word-display', 'aria-hidden': 'true' }, '');
        }
      } else {
        if (round.phase === 'drawing' && round.wordHint) {
          wordNode = el('div', { class: 'word-display' }, [
            el('span', null, round.wordHint.mask),
            categoryHint ? el('span', { class: 'dg-top-hint' }, categoryHint) : null,
          ]);
        } else if (round.phase === 'pick-word') {
          const drawer = (r.players || []).find((p) => p.id === round.drawerPid);
          wordNode = el('div', { class: 'word-display' }, `${drawer ? drawer.nick : '画手'} 在选词…`);
        } else if (round.phase === 'reveal' && round.wordRevealed) {
          wordNode = el('div', { class: 'word-display', 'aria-hidden': 'true' }, '');
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
          const remain = round.deadlineTs > 0 ? Math.max(0, Math.ceil((round.deadlineTs - (Date.now() + state.serverOffsetMs)) / 1000)) : 0;
          panel.appendChild(el('div', { class: 'dg-pick-head' }, [
            el('h2', null, '轮到你画'),
            el('div', { id: 'dg-pick-countdown', class: 'dg-pick-timer' + (remain <= 8 ? ' critical' : ''), 'aria-label': `还剩 ${remain} 秒` }, [el('span', null, String(remain).padStart(2, '0')), el('small', null, '秒')]),
          ]));
          const choices = el('div', { class: 'word-choices four' });
          r.me.wordChoices.forEach((w, i) => {
            choices.appendChild(el('button', {
              on: { click: () => doPickWord(i) },
            }, w));
          });
          panel.appendChild(choices);
          const refreshesLeft = Number.isInteger(r.me.wordRefreshesLeft) ? r.me.wordRefreshesLeft : 0;
          panel.appendChild(el('div', { class: 'dg-pick-actions' }, [
            el('button', {
              class: 'dg-refresh-words', disabled: refreshesLeft > 0 ? null : '',
              on: { click: doRefreshWords },
            }, refreshesLeft > 0 ? `换一组 · 还可换 ${refreshesLeft} 次` : '不能再换'),
          ]));
        } else {
          const drawer = (r.players || []).find((p) => p.id === round.drawerPid);
          panel.appendChild(el('h2', null, (drawer ? drawer.nick : '画手') + ' 正在选词…'));
          panel.appendChild(el('div', { style: { color: '#63707a' } }, '稍等片刻就开始'));
        }
        overlay.appendChild(panel);
        wrap.appendChild(overlay);
      } else if (round.phase === 'reveal') {
        const overlay = el('div', { class: 'dg-canvas-overlay' });
        const panel = el('div', { class: 'panel' });
        panel.appendChild(el('span', { class: 'dg-side-kicker' }, '答案是'));
        panel.appendChild(el('div', { class: 'reveal-word' }, round.wordRevealed || '—'));
        overlay.appendChild(panel);
        wrap.appendChild(overlay);
      }
    }

    return wrap;
  }

  function renderToolbar() {
    const bar = el('div', { class: 'dg-toolbar' });
    const colorNames = ['珊瑚红', '湖蓝', '草绿', '明黄', '墨色', '白色'];
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
    bar.appendChild(el('label', { class: 'dg-color-picker', 'aria-label': '选择更多颜色' }, el('input', {
      type: 'color', value: state.drawColor, 'aria-label': '选择更多颜色',
      on: { input: (e) => { state.drawColor = e.target.value; state.eraseMode = false; } },
    })));
    bar.appendChild(el('label', { class: 'dg-thickness', 'aria-label': '调整画笔粗细' }, [
      el('i', { class: 'thin', 'aria-hidden': 'true' }),
      el('input', { type: 'range', min: '1', max: '20', value: String(Math.round(state.drawWidth * 1000)), 'aria-label': '画笔粗细', on: { input: (e) => { state.drawWidth = Number(e.target.value) / 1000; } } }),
      el('i', { class: 'thick', 'aria-hidden': 'true' }),
    ]));
    bar.appendChild(el('button', {
      class: 'dg-icon-tool' + (state.eraseMode ? ' active' : ''),
      'aria-label': '橡皮擦',
      'aria-pressed': state.eraseMode ? 'true' : 'false',
      on: { click: () => { state.eraseMode = !state.eraseMode; render(); } },
    }, icon('eraser')));
    bar.appendChild(el('div', { class: 'tool-spacer' }));
    bar.appendChild(el('button', {
      class: 'dg-icon-tool', 'aria-label': '撤销',
      on: { click: doUndo },
    }, icon('undo')));
    bar.appendChild(el('button', {
      class: 'dg-icon-tool', 'aria-label': '清空画板',
      on: { click: doClear },
    }, icon('clear')));
    return bar;
  }

  function renderSidebar(r) {
    const sidebar = el('div', { class: 'dg-sidebar' });
    sidebar.appendChild(renderChatMessages(r));
    sidebar.appendChild(renderChatInput(r));
    sidebar.appendChild(renderScoreboard(r));
    return sidebar;
  }

  function sideCard(className, kicker, title, iconName, body) {
    const card = el('section', { class: `dg-side-card ${className}` });
    card.appendChild(el('header', null, [
      el('div', null, [el('span', { class: 'dg-side-kicker' }, kicker), el('h2', null, title)]),
      el('span', { class: 'dg-side-icon' }, icon(iconName)),
    ]));
    card.appendChild(el('div', { class: 'dg-side-body' }, body));
    return card;
  }

  function ruleLines(lines) {
    return el('div', { class: 'dg-rule-lines' }, lines.map((text, index) =>
      el('div', { class: 'dg-rule-line' }, [el('i', null, String(index + 1).padStart(2, '0')), el('span', null, text)]),
    ));
  }

  function renderSideShell(route) {
    const side = document.getElementById('dg-side-shell');
    const shell = document.getElementById('dg-app-shell');
    if (!side || !shell) return;
    shell.dataset.mobilePanel = state.mobilePanel;
    side.innerHTML = '';
    const room = state.roomState;
    const inPlay = route === '#/play' && room;
    side.hidden = !inPlay;
    shell.classList.toggle('dg-stage-only', !inPlay);
    if (!inPlay) return;
    const hint = room.round && room.round.wordHint;
    const inlineHint = hint && hint.revealed && hint.category
      ? `【提示：${hint.category}】（${hint.len} 个字）`
      : '';
    side.appendChild(el('section', { class: 'dg-interaction dg-chat-card' }, [
      el('header', { class: 'dg-interaction-head' }, [
        el('span', { class: 'dg-side-kicker' }, amIDrawer() ? '房间动态' : '猜词与讨论'),
        inlineHint ? el('div', { class: 'dg-inline-hint' }, inlineHint) : null,
      ]),
      renderChatMessages(room),
      renderChatInput(room),
    ]));
    side.appendChild(el('section', { class: 'dg-roster dg-info-card', 'aria-label': '全部玩家与实时计分' }, [
      el('header', { class: 'dg-roster-head' }, [
        el('h3', null, '同桌玩家'),
        el('span', null, `${(room.players || []).filter((p) => !p.kicked && p.online).length} / ${(room.players || []).filter((p) => !p.kicked).length} 在线`),
      ]),
      renderScoreboard(room),
    ]));
  }

  function setMobilePanel(panel) {
    if (!['stage', 'chat', 'info'].includes(panel)) return;
    state.mobilePanel = panel;
    const shell = document.getElementById('dg-app-shell');
    if (shell) shell.dataset.mobilePanel = panel;
    document.querySelectorAll('[data-dg-panel]').forEach((button) => button.classList.toggle('active', button.dataset.dgPanel === panel));
    const target = panel === 'stage' ? document.getElementById('dg-view') : document.querySelector(panel === 'chat' ? '.dg-chat-card' : '.dg-info-card');
    if (target) requestAnimationFrame(() => target.focus?.({ preventScroll: true }));
  }

  function renderScoreboard(r) {
    const score = el('div', { class: 'dg-scoreboard dg-roster-grid' });
    const sorted = [...(r.players || [])]
      .filter((p) => !p.kicked)
      .sort((a, b) => {
        if (Number.isInteger(a.rank) && Number.isInteger(b.rank)) return a.rank - b.rank;
        return (b.score || 0) - (a.score || 0) || (a.seat || 0) - (b.seat || 0);
      });
    const drawerPid = r.round ? r.round.drawerPid : null;
    const correctSet = new Set(r.round ? (r.round.correctGuessers || []) : []);
    const statusLabel = (p) => {
      const labels = {
        drawer: '本轮画手', drawing: '本轮画手', correct: '本轮猜中', guessed: '本轮猜中',
        guessing: '思考中', thinking: '思考中', waiting: '等待猜中', spectator: '下轮参与', offline: '离线', online: '在线',
        'choosing-word': '选词中', 'waiting-for-drawer': '等待画手选词', 'waiting-next-round': '下轮参与',
        missed: '未猜中', finished: '已结束', lobby: '等待开局',
      };
      if (!p.online) return '离线';
      if (p.id === drawerPid) return '本轮画手';
      if (correctSet.has(p.id)) return '本轮猜中';
      return labels[p.roundStatus] || (p.roundStatus || '在线');
    };
    sorted.forEach((p, index) => {
      const isMe = state.session && p.id === state.session.playerId;
      const rank = Number.isInteger(p.rank) ? p.rank : index + 1;
      const cls = ['row', 'dg-roster-player', `rank-${rank}`];
      if (p.id === drawerPid) cls.push('drawer');
      else if (correctSet.has(p.id)) cls.push('correct');
      if (isMe) cls.push('me');
      const delta = Number(p.roundDelta || 0);
      score.appendChild(el('div', { class: cls.join(' ') }, [
        el('span', { class: 'icon dg-rank-avatar' }, String(rank)),
        el('span', { class: 'nick dg-player-name' }, [
          document.createTextNode(p.nick + (p.isHost ? '（房主）' : '')),
          el('small', null, statusLabel(p)),
        ]),
        el('span', { class: 'score dg-points' }, [
          el('b', null, String(p.score || 0)),
          el('small', { class: delta > 0 ? 'positive' : '' }, `${delta >= 0 ? '+' : ''}${delta}`),
        ]),
      ]));
    });
    return score;
  }

  function renderChatMessages(r) {
    const messages = el('div', { class: 'dg-chat-messages', id: 'dg-chat-messages', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    const chat = r.chat || [];
    if (!chat.length) messages.appendChild(el('div', { class: 'dg-lobby-note' }, '房间消息会出现在这里。'));
    chat.forEach((m) => messages.appendChild(renderChatMsg(m, r)));
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
      'aria-label': '发送',
      disabled: disabled ? '' : null,
      on: {
        click: async () => {
          const v = input.value.trim();
          if (v && await sendGuess(v)) input.value = '';
        },
      },
    }, icon('send'));
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
      await enqueueMutation('pickword', {
        roundId: state.roomState.round.roundId,
        wordIndex: idx,
        wordChoiceSetId: state.roomState.me && state.roomState.me.wordChoiceSetId,
      });
    } catch (e) { toast(errMsg(e)); }
  }
  async function doRefreshWords() {
    const room = state.roomState;
    if (!room || !room.round || !room.me || !room.me.wordChoiceSetId || room.me.wordRefreshesLeft <= 0) return;
    try {
      await enqueueMutation('refreshwords', {
        roundId: room.round.roundId,
        wordChoiceSetId: room.me.wordChoiceSetId,
      });
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
    const scores = [...(r.finalScores || [])].sort((a, b) => a.rank - b.rank);
    const wrap = el('section', { class: 'dg-final-layout' });
    const board = el('div', { class: 'dg-final-board' }, [
      el('span', { class: 'dg-side-kicker' }, '本局结束'),
      el('h1', { class: 'dg-final-title' }, '今晚的画猜冠军'),
    ]);
    const podium = el('div', { class: 'dg-podium' });
    [2, 1, 3].forEach((rank) => {
      const row = scores.find((item) => item.rank === rank);
      if (!row) return;
      const names = { 1: 'first', 2: 'second', 3: 'third' };
      podium.appendChild(el('div', { class: `dg-podium-card ${names[rank]}` }, [
        el('span', { class: 'dg-podium-rank' }, String(rank)),
        el('b', null, row.nick),
        el('strong', null, `${row.score} 分`),
      ]));
    });
    board.appendChild(podium);
    const rest = el('div', { class: 'dg-ranking-rest' });
    scores.filter((row) => row.rank > 3).forEach((row) => rest.appendChild(el('div', { class: 'dg-rank-row' }, [
      el('b', null, String(row.rank)), el('span', null, row.nick), el('b', null, `${row.score} 分`),
    ])));
    board.appendChild(rest);
    const isHost = amIHost();
    const champion = scores[0];
    wrap.appendChild(board);
    wrap.appendChild(el('aside', { class: 'dg-invite-island dg-final-actions' }, [
      el('div', { class: 'dg-invite-head' }, [el('h2', null, `房间 ${r.code}`), el('span', null, `${(r.players || []).filter((p) => !p.kicked && p.online).length} 人仍在线`)]),
      el('div', { class: 'dg-invite-actions' }, [
        isHost ? el('button', { class: 'dg-btn primary', on: { click: doRematch } }, [icon('rounds'), document.createTextNode(' 再来一局')]) : null,
        el('button', { class: 'dg-btn ghost', on: { click: () => copyFinalResults(scores) } }, [icon('copy'), document.createTextNode(' 复制本局结果')]),
        el('button', { class: 'dg-btn ghost', on: { click: doLeave } }, [icon('exit'), document.createTextNode(' 离开房间')]),
      ]),
      champion ? el('div', { class: 'dg-setting-list' }, [el('div', null, [el('span', null, '冠军'), el('b', null, `${champion.nick} · ${champion.score} 分`)])]) : null,
    ]));
    return wrap;
  }

  function copyFinalResults(scores) {
    const rows = scores.map((row) => `${row.rank}. ${row.nick} ${row.score} 分`).join('\n');
    copyToClipboard(`你画我猜 · 房间 ${state.roomState.code}\n${rows}`, '已复制本局结果');
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
    if (!['#/lobby', '#/play', '#/end'].includes(route)) setConnection('offline');
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
    $view.innerHTML = '';
    $view.appendChild(content);
    renderSideShell(route);

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
    if (!state.roomState || !state.roomState.round) return;
    const remain = state.roomState.round.deadlineTs - (Date.now() + state.serverOffsetMs);
    const sec = Math.max(0, Math.ceil(remain / 1000));
    if (n) {
      n.textContent = sec + 's';
      n.classList.remove('warn', 'danger');
      if (sec <= 5) n.classList.add('danger');
      else if (sec <= 15) n.classList.add('warn');
    }
    const picker = document.getElementById('dg-pick-countdown');
    if (picker) {
      const value = picker.querySelector('span');
      if (value) value.textContent = String(sec).padStart(2, '0');
      picker.classList.toggle('critical', sec <= 8);
      picker.setAttribute('aria-label', `还剩 ${sec} 秒`);
    }
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
    const top = document.getElementById('dg-top-status');
    if (top) {
      top.className = `dg-top-status ${next}`;
      const label = top.querySelector('span');
      if (label) label.textContent = { online: '已连接', reconnecting: '重连中…', offline: '等待入场' }[next] || '等待入场';
    }
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

  let commentsMounted = false;
  let feedbackReturnFocus = null;
  function mountFeedbackComments() {
    if (commentsMounted || !window.GamesShell || !GamesShell.Comments) return;
    const container = document.getElementById('dg-cm-mount');
    if (!container) return;
    container.innerHTML = '';
    GamesShell.Comments.mount({
      container,
      path: '/toolbox/drawing/',
      title: '玩法吐槽 / 词库求增',
      intro: '说说你想加什么词、遇到什么 bug ~',
      placeholder: '聊聊你画我猜心得 ~',
    });
    commentsMounted = true;
  }
  function openFeedback() {
    const layer = document.getElementById('dg-feedback-layer');
    const sheet = layer && layer.querySelector('.dg-feedback-sheet');
    if (!layer || !sheet) return;
    feedbackReturnFocus = document.activeElement;
    layer.classList.add('open');
    layer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    mountFeedbackComments();
    requestAnimationFrame(() => sheet.focus());
  }
  function closeFeedback() {
    const layer = document.getElementById('dg-feedback-layer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (feedbackReturnFocus && feedbackReturnFocus.focus) feedbackReturnFocus.focus();
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dg-feedback-open')?.addEventListener('click', openFeedback);
    document.querySelector('.dg-feedback-close')?.addEventListener('click', closeFeedback);
    document.querySelector('.dg-feedback-backdrop')?.addEventListener('click', closeFeedback);
    document.querySelectorAll('[data-dg-panel]').forEach((button) => {
      button.addEventListener('click', () => setMobilePanel(button.dataset.dgPanel));
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeFeedback(); });
    init();
  });
})();
