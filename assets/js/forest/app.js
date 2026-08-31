(function () {
  'use strict';


  // localStorage 写入失败的可见反馈（仅 QuotaExceededError 时显示，一次性）
  let _storageWarnShown = false;
  function showStorageWarn(message) {
    if (_storageWarnShown) return;
    _storageWarnShown = true;
    const b = document.createElement('div');
    b.className = 'storage-warn';
    b.innerHTML = '<span class="storage-warn-message"></span> <button type="button" class="storage-warn-close">关闭</button>';
    b.querySelector('.storage-warn-message').textContent = message || '浏览器存储暂时不可写。当前页面仍可使用，但请立即导出 JSON 备份，避免刷新后丢失。';
    b.querySelector('.storage-warn-close').addEventListener('click', () => b.remove());
    document.body.appendChild(b);
  }

  // ============ 站内 modal / toast（替代原生 confirm/prompt/alert）============
  let _modalEls = null;
  function ensureModal() {
    if (_modalEls) return _modalEls;
    const mask = document.createElement('div');
    mask.className = 'ft-modal-mask';
    mask.innerHTML = '<div class="ft-modal" role="dialog" aria-modal="true" aria-labelledby="ft-modal-title" aria-describedby="ft-modal-message">'
      + '<h3 class="ft-modal-title" id="ft-modal-title"></h3>'
      + '<p class="ft-modal-msg" id="ft-modal-message"></p>'
      + '<input type="text" class="ft-modal-input" aria-label="输入内容" style="display:none;" maxlength="30" />'
      + '<div class="ft-modal-actions">'
      + '<button type="button" class="ft-modal-cancel"></button>'
      + '<button type="button" class="ft-modal-ok"></button>'
      + '</div></div>';
    document.body.appendChild(mask);
    _modalEls = {
      mask,
      title: mask.querySelector('.ft-modal-title'),
      msg: mask.querySelector('.ft-modal-msg'),
      input: mask.querySelector('.ft-modal-input'),
      cancel: mask.querySelector('.ft-modal-cancel'),
      ok: mask.querySelector('.ft-modal-ok'),
      actions: mask.querySelector('.ft-modal-actions'),
    };
    return _modalEls;
  }
  // 通用弹窗；isPrompt 时带输入框，resolve 输入串或 null；否则 resolve 布尔
  function openModal(opts, isPrompt) {
    const els = ensureModal();
    const invoker = document.activeElement;
    els.title.textContent = opts.title || '';
    if (opts.message) { els.msg.innerHTML = opts.message; els.msg.style.display = ''; }
    else { els.msg.textContent = ''; els.msg.style.display = 'none'; }
    els.ok.textContent = opts.okText || '确定';
    els.ok.className = 'ft-modal-ok ' + (opts.danger ? 'danger' : 'primary');
    els.cancel.textContent = opts.cancelText || '取消';
    if (isPrompt) {
      els.input.style.display = '';
      els.input.value = opts.value || '';
      els.input.placeholder = opts.placeholder || '';
    } else {
      els.input.style.display = 'none';
    }
    els.mask.classList.add('open');
    Array.from(document.body.children).forEach((child) => {
      if (child === els.mask || child.hasAttribute('inert')) return;
      child.setAttribute('data-ft-modal-inert', '1');
      child.setAttribute('inert', '');
    });
    if (isPrompt) setTimeout(() => { els.input.focus(); els.input.select(); }, 30);
    else setTimeout(() => els.ok.focus(), 30);
    return new Promise(resolve => {
      function done(val) {
        els.ok.removeEventListener('click', onOk);
        els.cancel.removeEventListener('click', onCancel);
        els.mask.removeEventListener('click', onMask);
        document.removeEventListener('keydown', onKey, true);
        els.mask.classList.remove('open');
        document.querySelectorAll('[data-ft-modal-inert="1"]').forEach((child) => {
          child.removeAttribute('data-ft-modal-inert');
          child.removeAttribute('inert');
        });
        if (invoker && invoker.isConnected && typeof invoker.focus === 'function') setTimeout(() => invoker.focus(), 0);
        resolve(val);
      }
      const okVal = () => isPrompt ? els.input.value.trim() : true;
      const cancelVal = () => isPrompt ? null : false;
      function onOk() { done(okVal()); }
      function onCancel() { done(cancelVal()); }
      function onMask(e) { if (e.target === els.mask) done(cancelVal()); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(cancelVal()); }
        else if (e.key === 'Enter' && (isPrompt || document.activeElement === els.ok)) { e.preventDefault(); done(okVal()); }
        else if (e.key === 'Tab') {
          const focusable = [els.input, els.cancel, els.ok].filter((item) => item && item.style.display !== 'none' && !item.disabled);
          const index = focusable.indexOf(document.activeElement);
          if (!focusable.length) return;
          if (e.shiftKey && (index <= 0)) { e.preventDefault(); focusable[focusable.length - 1].focus(); }
          else if (!e.shiftKey && index === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
        }
      }
      els.ok.addEventListener('click', onOk);
      els.cancel.addEventListener('click', onCancel);
      els.mask.addEventListener('click', onMask);
      document.addEventListener('keydown', onKey, true);
    });
  }
  function showConfirm(opts) { return openModal(opts, false); }
  function showPrompt(opts) { return openModal(opts, true); }
  function showChoice(opts) {
    const els = ensureModal();
    const invoker = document.activeElement;
    els.title.textContent = opts.title || '';
    els.msg.textContent = opts.message || '';
    els.msg.style.display = opts.message ? '' : 'none';
    els.input.style.display = 'none';
    els.cancel.style.display = 'none';
    els.ok.style.display = 'none';
    const choiceWrap = document.createElement('div');
    choiceWrap.className = 'ft-modal-choices';
    (opts.choices || []).forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = choice.value;
      button.textContent = choice.label;
      choiceWrap.appendChild(button);
    });
    els.actions.appendChild(choiceWrap);
    els.mask.classList.add('open');
    Array.from(document.body.children).forEach((child) => {
      if (child === els.mask || child.hasAttribute('inert')) return;
      child.setAttribute('data-ft-modal-inert', '1');
      child.setAttribute('inert', '');
    });
    const buttons = Array.from(choiceWrap.querySelectorAll('button'));
    setTimeout(() => { if (buttons[0]) buttons[0].focus(); }, 30);
    return new Promise((resolve) => {
      function done(value) {
        document.removeEventListener('keydown', onKey, true);
        choiceWrap.remove();
        els.cancel.style.display = '';
        els.ok.style.display = '';
        els.mask.classList.remove('open');
        document.querySelectorAll('[data-ft-modal-inert="1"]').forEach((child) => { child.removeAttribute('data-ft-modal-inert'); child.removeAttribute('inert'); });
        if (invoker && invoker.isConnected && typeof invoker.focus === 'function') setTimeout(() => invoker.focus(), 0);
        resolve(value);
      }
      choiceWrap.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-value]');
        if (button) done(button.dataset.value);
      });
      function onKey(event) {
        if (event.key === 'Escape') { event.preventDefault(); done(null); }
        if (event.key === 'Tab' && buttons.length) {
          const index = buttons.indexOf(document.activeElement);
          if (event.shiftKey && index <= 0) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
          else if (!event.shiftKey && index === buttons.length - 1) { event.preventDefault(); buttons[0].focus(); }
        }
      }
      document.addEventListener('keydown', onKey, true);
    });
  }

  // 读取底部安全区高度（供 popover 避开 Home 指示条）
  let _safeProbe = null;
  function safeAreaBottom() {
    if (!_safeProbe) {
      _safeProbe = document.createElement('div');
      _safeProbe.style.cssText = 'position:fixed;bottom:0;left:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none;';
      document.body.appendChild(_safeProbe);
    }
    return parseFloat(getComputedStyle(_safeProbe).paddingBottom) || 0;
  }

  let _toastEl = null, _toastTimer = null, _toastDeadline = 0;
  function hideToast() {
    if (_toastEl) _toastEl.classList.remove('show');
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
    _toastDeadline = 0;
  }
  function showToast(message, opts) {
    opts = opts || {};
    const duration = opts.duration || (typeof opts.undo === 'function' ? 15000 : 5000);
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      _toastEl.className = 'ft-toast';
      _toastEl.setAttribute('role', 'status');       // 读屏可闻：一次性反馈（种成 / 撤销入口）
      _toastEl.setAttribute('aria-live', 'polite');
      // 点 toast 空白处即关——带「去看看 / 撤销」按钮的提示容易被当成"必须处理"，给个随手关掉的出口
      _toastEl.addEventListener('click', (e) => { if (!e.target.closest('button')) hideToast(); });
      const pauseDismiss = () => { if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; } };
      const resumeDismiss = () => {
        if (!_toastDeadline || _toastTimer) return;
        const remaining = Math.max(0, _toastDeadline - Date.now());
        if (!remaining) hideToast(); else _toastTimer = setTimeout(hideToast, remaining);
      };
      _toastEl.addEventListener('focusin', pauseDismiss);
      _toastEl.addEventListener('focusout', resumeDismiss);
      _toastEl.addEventListener('mouseenter', pauseDismiss);
      _toastEl.addEventListener('mouseleave', resumeDismiss);
      document.body.appendChild(_toastEl);
    }
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
    _toastEl.innerHTML = '<span class="ft-toast-msg"></span>';
    _toastEl.querySelector('.ft-toast-msg').textContent = message;
    if (typeof opts.undo === 'function') {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opts.undoText || '撤销';
      b.addEventListener('click', () => { hideToast(); opts.undo(); });
      _toastEl.appendChild(b);
    }
    requestAnimationFrame(() => _toastEl.classList.add('show'));
    _toastDeadline = Date.now() + duration;
    _toastTimer = setTimeout(hideToast, duration);
  }
  // 后台标签页里 setTimeout 会被节流，回到前台时若 toast 早该消失了立刻收掉，别留"僵尸提示"
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && _toastDeadline && Date.now() >= _toastDeadline) hideToast();
  });

  const TREES_KEY = 'tool.forest.trees.v1';
  const ACTIVE_KEY = 'tool.forest.active.v1';
  const FIELDS_KEY = 'tool.forest.fields.v1';
  const ACTIVE_FIELD_KEY = 'tool.forest.activeField.v1';
  const THEME_KEY = 'tool.forest.theme.v1';
  const SESSIONS_KEY = 'tool.forest.sessions.v1';   // 不可变专注流水（统计/经验曲线用，不受合并/培养影响）
  const Core = window.ForestCore;
  const ForestStorage = window.ForestStorage;
  const forestStore = ForestStorage.createStore(localStorage, { mirrorLegacy: true });
  const SNAPSHOT_KEY = ForestStorage.SNAPSHOT_KEY;
  const LEASE_KEY = ForestStorage.LEASE_KEY;
  const DEVICE_ID = forestStore.getDeviceId();
  let forestChannel = null;
  try { if ('BroadcastChannel' in window) forestChannel = new BroadcastChannel('ruizhou-forest-v2'); } catch (e) { forestChannel = null; }
  let forestSnapshot = null;
  let storeSaveQueued = false;
  let storeSaveReason = 'ui';
  // 每标签页一个稳定 id（sessionStorage 跨刷新存活、跨标签页独立），用于判断进行中的专注归属哪个 tab
  let _tabId;
  try {
    _tabId = sessionStorage.getItem('tool.forest.tabId');
    if (!_tabId) { _tabId = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('tool.forest.tabId', _tabId); }
  } catch (e) { _tabId = 't' + Date.now(); }
  const STRICT_KEY = 'tool.forest.strict.v1';   // 专注严格度：'1'=离开枯萎 / '0'=宽松自觉
  const PREFS_KEY = 'tool.forest.prefs.v1';   // 常用偏好：树种/时长/番茄开关/休息分钟（跨访问记住）

  function loadPrefs() {
    if (forestSnapshot && forestSnapshot.prefs) return forestSnapshot.prefs;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const p = raw ? JSON.parse(raw) : null;
      return (p && typeof p === 'object') ? p : null;
    } catch (e) { return null; }
  }
  function savePrefs() {
    queueStoreSave('prefs');
  }

  // 首次默认自觉模式。网页无法可靠区分主动切走、来电与系统锁屏，严格模式必须由用户主动选择。
  function defaultStrict() {
    return false;
  }
  function loadStrict() {
    if (forestSnapshot && forestSnapshot.prefs) return forestSnapshot.prefs.focusMode === Core.MODE.STRICT;
    try {
      const raw = localStorage.getItem(STRICT_KEY);
      return raw === null ? defaultStrict() : raw === '1';
    } catch (e) { return defaultStrict(); }
  }
  function saveStrict() {
    queueStoreSave('focus-policy');
  }
  // 当前模式下「离开页面」的说明文案（首屏与遮罩共用）
  function focusWarnText() {
    return state.strict
      ? '严格模式：离开本页超过 15 秒会在当时失败；未满 1 分钟的整次专注不留记录'
      : '自觉模式：离开页面不会让树枯萎，专注全凭自己坚持';
  }

  const TREE_NAME = {
    oak: '橡树', pine: '松树', sakura: '樱花', palm: '椰子树', cactus: '仙人掌',
  };

  const state = {
    trees: [],          // 已种成的树 / 失败记录
    duration: 30,       // 当前选定的分钟数
    treeType: 'oak',
    task: '',
    session: null,      // 进行中的 session
    leftAt: null,       // 离开页面的时间戳
    pomodoroOn: false,  // 是否开启循环模式
    cycleCount: 0,      // 当前循环里完成了几个 focus（连续完整完成的）
    breakMode: false,   // 当前 session 是 break 还是 focus
    breakMin: 5,        // 用户自定义的休息分钟（开循环时用）
    currentChainId: null, // 当前循环链 ID（同链树共享 cycleBonus）
    revivalTargetId: null, // 正在准备灌溉的枯萎树 id（null 时是普通 session）
    cultivateTargetId: null, // 正在准备培养的成活树 id（下一次专注并入它）
    paused: false,      // 专注是否暂停
    pausedAt: null,     // 暂停起始时间戳
    strict: true,       // 离开页面是否枯萎（init 时按设备/存档定）
    sessions: [],       // 不可变专注流水 [{minutes, exp, endTime, type}]，统计/曲线用
    selectedIds: [],    // 整理模式下勾选待合并的树 id
    fields: [],         // 田块列表 [{id, name, createdAt}]
    activeFieldId: null,
    flexible: false,    // 灵活模式：不设目标·正计时·不失败·锁松树
    theme: { background: 'auto', timer: 'countdown', visualVersion: 3 },
    autoStartBreak: true,
    autoStartFocus: false,
    wakeLock: true,
    sound: false,
    vibration: false,
    notifications: false,
    lastCompletion: null,
    recentDeleted: [],
    syncTombstones: [],
    pendingTakeover: null,
    storageReadOnly: false,
    externalSessionReadonly: false,
    activityReturnDraft: null,
    modelDemoCount: 0,
  };

  function runtimeFromLegacy(active) {
    if (!active) return null;
    if (active.status && active.startedAt !== undefined) return active;
    const start = Number(active.startTime) || Date.now();
    const durationMs = active.duration === null ? null : Number(active.duration);
    const pausedAt = active.paused ? Number(active.pausedAt || active.lastTick || Date.now()) : null;
    const meta = active._meta || {};
    const target = meta.revivalTargetId
      ? { kind: 'revival', treeId: meta.revivalTargetId }
      : meta.cultivateTargetId ? { kind: 'cultivate', treeId: meta.cultivateTargetId } : null;
    return {
      id: active.id || Core.stableId('fs', [start, active.task, active.treeType]),
      status: active.paused ? Core.STATUS.PAUSED : active.isBreak ? Core.STATUS.BREAK : active.flexible ? Core.STATUS.FLEXIBLE : Core.STATUS.FOCUS,
      phase: active.isBreak ? 'break' : 'focus',
      mode: active.flexible ? Core.MODE.FLEXIBLE : state.strict ? Core.MODE.STRICT : Core.MODE.SELF,
      timingMode: active.flexible ? 'flexible' : 'fixed',
      focusPolicy: active.isBreak ? null : state.strict ? Core.MODE.STRICT : Core.MODE.SELF,
      startedAt: start,
      runningSince: active.paused ? null : start,
      elapsedBeforeRunMs: active.paused ? Math.max(0, pausedAt - start) : 0,
      durationMs,
      scheduledEndAt: active.paused || durationMs === null ? null : start + durationMs,
      pausedAt,
      hiddenAt: active.hiddenAt || null,
      lastSeenAt: Number(active.lastTick || start),
      task: active.task || '',
      fieldId: active.fieldId || state.activeFieldId,
      treeType: active.treeType || 'oak',
      target,
      chainId: meta.currentChainId || null,
      cycleNumber: Number(meta.cycleCount || 0),
      ownerTabId: active._tabId || _tabId,
      ownerDeviceId: active.ownerDeviceId || DEVICE_ID,
      leaseEpoch: Number(active.leaseEpoch || 0),
      fenceToken: active.fenceToken || null,
      updatedAt: Number(active.lastTick || Date.now()),
    };
  }

  function legacyFromRuntime(runtime) {
    if (!runtime) return null;
    const runningStart = runtime.runningSince || runtime.startedAt;
    return {
      id: runtime.id,
      startTime: runningStart,
      duration: runtime.durationMs,
      task: runtime.task || '',
      treeType: runtime.treeType || 'oak',
      fieldId: runtime.fieldId || null,
      isBreak: runtime.phase === 'break',
      flexible: runtime.mode === Core.MODE.FLEXIBLE,
      lastTick: runtime.lastSeenAt || Date.now(),
      hiddenAt: runtime.hiddenAt || null,
      paused: runtime.status === Core.STATUS.PAUSED,
      pausedAt: runtime.pausedAt || null,
      _tabId: runtime.ownerTabId || null,
      ownerDeviceId: runtime.ownerDeviceId || null,
      leaseEpoch: runtime.leaseEpoch || 0,
      fenceToken: runtime.fenceToken || null,
      _meta: {
        pomodoroOn: !!(forestSnapshot && forestSnapshot.prefs && forestSnapshot.prefs.pomodoroOn),
        cycleCount: runtime.cycleNumber || 0,
        currentChainId: runtime.chainId || null,
        revivalTargetId: runtime.target && runtime.target.kind === 'revival' ? runtime.target.treeId : null,
        cultivateTargetId: runtime.target && runtime.target.kind === 'cultivate' ? runtime.target.treeId : null,
        breakMin: forestSnapshot && forestSnapshot.prefs ? forestSnapshot.prefs.breakMin : state.breakMin,
      },
    };
  }

  function decoratedRuntime(runtime, now) {
    if (!runtime) return null;
    const time = Number(now) || Date.now();
    return Object.assign({}, runtime, legacyFromRuntime(runtime), {
      startTime: time - Core.elapsedMs(runtime, time),
      duration: runtime.durationMs,
      isBreak: runtime.phase === 'break',
      flexible: runtime.mode === Core.MODE.FLEXIBLE,
    });
  }

  function snapshotFromState() {
    const base = Core.normalizeSnapshot(forestSnapshot || Core.emptySnapshot(Date.now()), Date.now());
    const locked = !!(state.revivalTargetId || state.cultivateTargetId);
    const previousDuration = base.prefs && Number.isFinite(base.prefs.duration) ? base.prefs.duration : state.duration;
    return Object.assign(base, {
      trees: state.trees,
      sessions: state.sessions,
      fields: state.fields,
      activeFieldId: state.activeFieldId,
      prefs: Object.assign({}, base.prefs, {
        treeType: state.treeType,
        duration: locked ? previousDuration : state.duration,
        pomodoroOn: state.pomodoroOn,
        breakMin: state.breakMin,
        breakTouched: typeof breakTouched !== 'undefined' ? !!breakTouched : false,
        focusMode: state.strict ? Core.MODE.STRICT : Core.MODE.SELF,
        autoStartBreak: state.autoStartBreak,
        autoStartFocus: state.autoStartFocus,
        wakeLock: state.wakeLock,
        sound: state.sound,
        vibration: state.vibration,
        notifications: state.notifications,
      }),
      theme: state.theme,
      lastCompletion: state.lastCompletion,
      recentDeleted: state.recentDeleted,
      tombstones: state.syncTombstones,
      pendingTakeover: state.pendingTakeover,
      activity: state.revivalTargetId || state.cultivateTargetId ? {
        kind: state.revivalTargetId ? 'revival' : 'cultivate',
        treeId: state.revivalTargetId || state.cultivateTargetId,
        returnDraft: state.activityReturnDraft,
        updatedAt: Date.now(),
      } : null,
    });
  }

  function applyStoreSnapshot(snapshot) {
    forestSnapshot = Core.normalizeSnapshot(snapshot, Date.now());
    state.trees = forestSnapshot.trees;
    state.sessions = forestSnapshot.sessions;
    state.fields = forestSnapshot.fields;
    state.activeFieldId = forestSnapshot.activeFieldId;
    state.theme = forestSnapshot.theme;
    state.lastCompletion = forestSnapshot.lastCompletion;
    state.recentDeleted = forestSnapshot.recentDeleted || [];
    state.syncTombstones = forestSnapshot.tombstones || [];
    state.pendingTakeover = forestSnapshot.pendingTakeover || null;
    state.revivalTargetId = forestSnapshot.activity && forestSnapshot.activity.kind === 'revival' ? forestSnapshot.activity.treeId : null;
    state.cultivateTargetId = forestSnapshot.activity && forestSnapshot.activity.kind === 'cultivate' ? forestSnapshot.activity.treeId : null;
    state.activityReturnDraft = forestSnapshot.activity && forestSnapshot.activity.returnDraft || null;
  }

  function flushStoreSave() {
    storeSaveQueued = false;
    if (state.storageReadOnly) return false;
    const next = snapshotFromState();
    const expectedRevision = forestSnapshot ? forestSnapshot.revision : null;
    let result = forestStore.save(next, { reason: storeSaveReason, expectedRevision });
    if (result.conflict && result.current) result = forestStore.merge(next, `merge-${storeSaveReason}`);
    if (!result.ok) {
      state.storageReadOnly = !!(result.unsupported || result.corrupt);
      showStorageWarn();
      return false;
    }
    forestSnapshot = result.snapshot;
    if (forestChannel) forestChannel.postMessage({ type: 'snapshot', revision: forestSnapshot.revision, tabId: _tabId });
    if (result.legacyMirrorError) showToast('新版数据已保存；旧版兼容副本写入失败，请尽快导出备份');
    if (window.CloudSync && typeof window.CloudSync.push === 'function') window.CloudSync.push();
    return true;
  }

  function queueStoreSave(reason) {
    storeSaveReason = reason || storeSaveReason;
    if (storeSaveQueued) return;
    storeSaveQueued = true;
    Promise.resolve().then(flushStoreSave);
  }

  function hydrateStore() {
    const result = forestStore.load();
    if (!result.ok) {
      state.storageReadOnly = true;
      showStorageWarn();
      return false;
    }
    applyStoreSnapshot(result.snapshot);
    return true;
  }

  // 焦点时长 → 推荐休息时长（用户没改时的 default）
  function breakMinutesFor(focusMin) {
    if (focusMin <= 30) return 5;
    if (focusMin <= 50) return 10;
    if (focusMin <= 90) return 20;
    return Math.round(focusMin / 5);
  }

  // 循环连击加成：完成 N 棵的链 → 全链每棵都用这个 bonus
  // 1 → 1.0x；2 → 1.25x；3+ → 1.5x
  function cycleBonusFor(cycleCount) {
    if (cycleCount >= 3) return 1.5;
    if (cycleCount >= 2) return 1.25;
    return 1.0;
  }
  function newChainId() {
    return 'chain-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
  }

  // 树的「有效经验值」——决定 tier / 尺寸。合并/培养后的树带显式 value；普通树 = 时长×连击×灌溉折扣
  function treeValue(tree) {
    if (typeof tree.value === 'number') return tree.value;
    if (!tree.success) return 0;
    return tree.durationMinutes * (tree.cycleBonus || 1.0) * (tree.revivalDiscount || 1.0);
  }
  function effectiveTier(tree) {
    if (!tree.success) return 1;
    return durationToTier(treeValue(tree));
  }
  // 兼容旧调用；森林展示用。统计/经验曲线改走不可变 sessions 流水，不受合并/培养影响
  function treeExp(tree) { return treeValue(tree); }

  // ============ DOM ============
  const $treeContainer = document.getElementById('tree-container');
  const $overlayTreeContainer = document.getElementById('overlay-tree-container');
  const $timerDisplay = document.getElementById('timer-display');
  const $overlayTimer = document.getElementById('overlay-timer');
  const $timerStatus = document.getElementById('timer-status');
  const $startBtn = document.getElementById('start-btn');
  const $giveUpBtn = document.getElementById('give-up-btn');
  const $pauseBtn = document.getElementById('pause-btn');
  const $taskInput = document.getElementById('task-input');
  const $customMin = document.getElementById('custom-min');
  const $durationTabs = document.querySelectorAll('[data-min]');
  const $treeTypes = document.querySelectorAll('[data-tree]');
  const $flexBtn = document.getElementById('flex-btn');
  const $treeTypesEl = document.getElementById('tree-types');
  const $overlay = document.getElementById('focus-overlay');
  const $overlayTag = document.getElementById('overlay-tag');
  const $focusWarning = document.getElementById('focus-warning');
  const $pomodoroOn = document.getElementById('pomodoro-on');
  const $overlayCounter = document.getElementById('overlay-counter');
  const $overlayWarn = document.getElementById('overlay-warn');
  const $graceBanner = document.getElementById('grace-banner');
  const $targetFieldSelect = document.getElementById('target-field-select');
  const $customMinError = document.getElementById('custom-min-error');
  const $sessionPreview = document.getElementById('session-preview');
  const $autoStartBreak = document.getElementById('auto-start-break');
  const $autoStartFocus = document.getElementById('auto-start-focus');
  const $cycleOptions = document.getElementById('cycle-options');
  const $wakeLockOn = document.getElementById('wake-lock-on');
  const $soundOn = document.getElementById('sound-on');
  const $vibrationOn = document.getElementById('vibration-on');
  const $notificationOn = document.getElementById('notification-on');
  const $completionCard = document.getElementById('completion-card');
  const $completionSummary = document.getElementById('completion-summary');
  const $plantControlsPane = document.querySelector('.plant-controls-pane');
  const $focusStage = document.getElementById('focus-stage');

  const $statToday = document.getElementById('stat-today');
  const $statWeek = document.getElementById('stat-week');
  const $statTotalMin = document.getElementById('stat-total-min');
  const $forestMeta = document.getElementById('forest-meta');
  const $emptyForest = document.getElementById('empty-forest');
  const $resetBtn = document.getElementById('reset-btn');
  const originalDocumentTitle = document.title;
  let wakeLockSentinel = null;
  let audioContext = null;
  let lastGrowthStage = null;

  async function acquireWakeLock() {
    if (!state.wakeLock || document.hidden || !state.session || state.session.isBreak || state.session.phase === 'break' || !('wakeLock' in navigator)) return;
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
      }
    } catch (e) {}
  }
  async function releaseWakeLock() {
    const sentinel = wakeLockSentinel;
    wakeLockSentinel = null;
    if (sentinel) { try { await sentinel.release(); } catch (e) {} }
  }
  function primeAudio() {
    if (!state.sound || audioContext) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try { audioContext = new AudioContextClass(); audioContext.resume(); } catch (e) {}
  }
  function notifyCompletion(completion) {
    if (!completion) return;
    document.title = `完成 · ${completion.task || '种树专注'}`;
    if (state.vibration && navigator.vibrate) { try { navigator.vibrate([90, 60, 140]); } catch (e) {} }
    if (state.sound && audioContext) {
      try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.18);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(); oscillator.stop(audioContext.currentTime + 0.36);
      } catch (e) {}
    }
    if (state.notifications && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { new Notification('种树专注完成', { body: `${completion.task || '本次专注'} · ${completion.minutes} 分钟`, icon: '/assets/icons/forest-icon-192.png' }); } catch (e) {}
    }
    releaseWakeLock();
  }

  // ============ Storage ============
  function loadTrees() {
    if (!forestSnapshot) hydrateStore();
    state.trees = forestSnapshot ? forestSnapshot.trees : [];
  }
  function saveTrees() {
    queueStoreSave('trees');
  }
  // ============ 不可变专注流水（统计 / 经验曲线；合并 / 培养不改它）============
  function loadSessions() {
    if (!forestSnapshot) hydrateStore();
    state.sessions = forestSnapshot ? forestSnapshot.sessions : [];
  }
  function saveSessions() {
    queueStoreSave('sessions');
  }
  // 每完成一次真实专注都追加一条（minutes=真实分钟，exp=当时的经验含连击/灌溉折扣）
  function logSession(minutes, exp, endTime, type, details) {
    const extra = details || {};
    const sourceId = extra.sessionId || (state.session && state.session.id) || null;
    const id = extra.id || sourceId || Core.stableId('fr', [endTime, minutes, exp, type, state.sessions.length]);
    if (state.sessions.some((row) => row.id === id || (sourceId && row.sessionId === sourceId))) return state.sessions.find((row) => row.id === id || row.sessionId === sourceId);
    const record = Core.makeSessionRecord({
      id,
      sessionId: sourceId,
      treeId: extra.treeId || null,
      fieldId: extra.fieldId || (state.session && state.session.fieldId) || state.activeFieldId,
      task: extra.task !== undefined ? extra.task : (state.session && state.session.task) || state.task,
      treeType: type || 'oak',
      outcome: extra.outcome || 'planted',
      minutes,
      exp,
      startTime: extra.startTime || (state.session && state.session.startTime) || endTime - minutes * 60000,
      endTime,
      updatedAt: endTime,
    });
    state.sessions.push(record);
    saveSessions();
    return record;
  }
  // 首次引入 sessions：从现有成活树回填一份历史流水，之后二者独立
  function migrateSessions() {
    if (state.sessions.length || !state.trees.length) return;
    state.sessions = state.trees.filter(t => t.success).map((t, index) => Core.makeSessionRecord({
      id: t.createdBySessionId || Core.stableId('fr', [t.id, t.endTime, index]),
      sessionId: t.createdBySessionId || null,
      treeId: t.id,
      fieldId: t.fieldId || state.activeFieldId,
      task: t.task || '',
      minutes: Math.round((t.durationMinutes || treeValue(t)) * 10) / 10,
      exp: Math.round(treeValue(t) * 10) / 10,
      startTime: t.startTime || t.endTime - (t.durationMinutes || 0) * 60000,
      endTime: t.endTime,
      treeType: t.type,
      outcome: t.manual ? 'manual' : 'planted',
      updatedAt: t.endTime,
    }));
    saveSessions();
  }
  function loadActive() {
    if (!forestSnapshot) hydrateStore();
    return forestSnapshot ? decoratedRuntime(forestSnapshot.active, Date.now()) : null;
  }
  function saveActive(s) {
    if (!forestSnapshot) hydrateStore();
    if (!forestSnapshot) return false;
    forestSnapshot.active = s ? runtimeFromLegacy(s) : null;
    storeSaveReason = 'active-session';
    return flushStoreSave();
  }
  // 把进行中的 session + 番茄链/灌溉/暂停 元信息 + 心跳时间一起落盘，供智能续跑还原
  function persistActive() {
    if (!state.session) { saveActive(null); return; }
    if (state.session.status && state.session.startedAt !== undefined) {
      let runtime = Core.heartbeat(state.session, Date.now());
      runtime.ownerTabId = _tabId;
      runtime.ownerDeviceId = DEVICE_ID;
      runtime.hiddenAt = state.leftAt;
      if (runtime.fenceToken) {
        const renewed = forestStore.renewLease(runtime.id, _tabId, DEVICE_ID);
        if (!renewed.ok || renewed.lease.fenceToken !== runtime.fenceToken || renewed.lease.epoch !== runtime.leaseEpoch) {
          if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
          $startBtn.disabled = true;
          showToast('此专注已由另一个标签页接管，本页已停止写入');
          return;
        }
      }
      state.session = Object.assign(runtime, {
        startTime: Date.now() - Core.elapsedMs(runtime, Date.now()),
        duration: runtime.durationMs,
        isBreak: runtime.phase === 'break',
        flexible: runtime.mode === Core.MODE.FLEXIBLE,
      });
      saveActive(state.session);
      return;
    }
    saveActive(Object.assign({}, state.session, {
      id: state.session.id,
      lastTick: Date.now(),
      _tabId: _tabId,
      ownerDeviceId: DEVICE_ID,
      fieldId: state.session.fieldId || state.activeFieldId,
      leaseEpoch: state.session.leaseEpoch || 0,
      fenceToken: state.session.fenceToken || null,
      hiddenAt: state.leftAt,
      paused: !!state.paused,
      pausedAt: state.paused ? state.pausedAt : null,
      _meta: {
        pomodoroOn: state.pomodoroOn,
        cycleCount: state.cycleCount,
        currentChainId: state.currentChainId,
        revivalTargetId: state.revivalTargetId,
        cultivateTargetId: state.cultivateTargetId,
        breakMin: state.breakMin,
      },
    }));
  }
  function restoreMeta(active) {
    const m = active._meta || {};
    state.pomodoroOn = !!m.pomodoroOn;
    if (typeof m.cycleCount === 'number') state.cycleCount = m.cycleCount;
    state.currentChainId = m.currentChainId || null;
    state.revivalTargetId = m.revivalTargetId || null;
    state.cultivateTargetId = m.cultivateTargetId || null;
    if (typeof m.breakMin === 'number') state.breakMin = m.breakMin;
    if ($pomodoroOn) $pomodoroOn.checked = state.pomodoroOn;
    syncBreakRow();
  }

  // ============ Single field ============
  function loadFields() {
    if (!forestSnapshot) hydrateStore();
    state.fields = forestSnapshot ? forestSnapshot.fields : [];
    state.activeFieldId = forestSnapshot ? forestSnapshot.activeFieldId : null;
  }
  function saveFields() {
    queueStoreSave('fields');
  }
  function newFieldId() {
    return 'fld-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5);
  }

  // 迁移：产品只保留一块田。旧多田数据无损并入第一块田，树与专注流水不删除。
  function migrateFieldsAndTrees() {
    const fallback = { id: newFieldId(), name: '我的田地', createdAt: new Date().toISOString() };
    const consolidated = Core.consolidateSingleField(state.fields, state.trees, fallback);
    if (consolidated.retiredFieldIds.length) {
      const retiredAt = Date.now();
      consolidated.retiredFieldIds.forEach((fieldId) => addSyncTombstone('field', fieldId, retiredAt));
    }
    const activeChanged = state.activeFieldId !== consolidated.activeFieldId;
    state.fields = consolidated.fields;
    const migrationDensity = window.ForestLayout.densityProfile(consolidated.trees.length);
    const layoutInput = consolidated.trees.map((tree) => Object.assign({}, tree, { tier: effectiveTier(tree), densityScale: migrationDensity.footprintScale, assetWidth: migrationDensity.assetBase, assetHeight: migrationDensity.assetBase }));
    const migratedLayout = window.ForestLayout.migrateLegacyPositions(layoutInput, CANONICAL_COLUMNS, { scene: 'forest' });
    let layoutChanged = false;
    state.trees = migratedLayout.map((tree, index) => {
      const previous = consolidated.trees[index];
      if (JSON.stringify(previous.position3d || null) !== JSON.stringify(tree.position3d || null)) layoutChanged = true;
      const next = Object.assign({}, tree);
      if (!Object.prototype.hasOwnProperty.call(previous, 'tier')) delete next.tier;
      delete next.densityScale; delete next.assetWidth; delete next.assetHeight;
      return next;
    });
    state.activeFieldId = consolidated.activeFieldId;
    let runtimeChanged = false;
    if (forestSnapshot && forestSnapshot.active && forestSnapshot.active.fieldId !== consolidated.activeFieldId) {
      forestSnapshot.active.fieldId = consolidated.activeFieldId;
      runtimeChanged = true;
    }
    if (state.session && state.session.fieldId !== consolidated.activeFieldId) state.session.fieldId = consolidated.activeFieldId;
    if (consolidated.fieldsChanged || activeChanged || runtimeChanged) saveFields();
    if (consolidated.treesChanged || layoutChanged) saveTrees();
  }

  function activeFieldTrees() {
    return state.trees.filter(t => t.fieldId === state.activeFieldId);
  }

  // ============ Theme ============
  function loadTheme() {
    if (forestSnapshot && forestSnapshot.theme) {
      state.theme = Object.assign({}, state.theme, forestSnapshot.theme);
    } else {
      try {
        const raw = localStorage.getItem(THEME_KEY);
        if (raw) state.theme = Object.assign({}, state.theme, JSON.parse(raw));
      } catch (e) {}
    }
    // v4 使用一体式晨光温室 / 萤火夜林；旧默认继续升级为跟随系统。
    const fromOldVisualSystem = Number(state.theme.visualVersion || 0) < 3;
    if (fromOldVisualSystem && state.theme.background !== 'night') state.theme.background = 'auto';
    if (!['auto', 'default', 'night'].includes(state.theme.background)) state.theme.background = 'auto';
    if (!['countdown', 'countup', 'hidden'].includes(state.theme.timer)) state.theme.timer = 'countdown';
    state.theme.visualVersion = 4;
  }
  function saveTheme() {
    queueStoreSave('theme');
  }


  function _sceneSvg(name, focus) {
    const night = name === 'night';
    if (focus) {
      const wide = night ? '/assets/images/forest/firefly-focus-wide-v4.webp' : '/assets/images/forest/greenhouse-focus-wide-v4.webp';
      const portrait = night ? '/assets/images/forest/firefly-focus-portrait-v4.webp' : '/assets/images/forest/greenhouse-focus-portrait-v4.webp';
      return `<div class="focus-scene-frame ${night ? 'focus-scene-night' : 'focus-scene-greenhouse'}"><picture><source media="(orientation: portrait)" srcset="${portrait}"><img src="${wide}" alt="" decoding="async"></picture><span class="focus-scene-vignette" aria-hidden="true"></span></div>`;
    }
    const stage = night ? '/assets/images/forest/firefly-focus-wide-v4.webp' : '/assets/images/forest/greenhouse-focus-wide-v4.webp';
    return `<picture class="stage-scene-frame"><img src="${stage}" alt="" decoding="async"></picture>`;
  }
  const systemDarkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function siteUsesDarkMode() {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return !!(systemDarkQuery && systemDarkQuery.matches);
  }
  function resolvedBackground() {
    return state.theme.background === 'auto' ? (siteUsesDarkMode() ? 'night' : 'default') : state.theme.background;
  }
  function applyVisualShell(theme) {
    const wrap = document.querySelector('.ft-wrap');
    if (!wrap) return;
    wrap.classList.toggle('visual-day', theme === 'default');
    wrap.classList.toggle('visual-night', theme === 'night');
    wrap.dataset.visualTheme = theme;
    document.body.dataset.forestVisual = theme;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'night' ? '#06141e' : '#f3eee3');
    const help = document.getElementById('theme-choice-help');
    if (help) {
      help.textContent = state.theme.background === 'auto'
        ? `正在跟随系统：${theme === 'night' ? '萤火夜林' : '晨光温室'}`
        : `已固定为${theme === 'night' ? '萤火夜林' : '晨光温室'}。`;
    }
    updateAmbientLight();
  }
  function updateAmbientLight() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const daylight = Math.max(0, Math.min(1, (minutes - 360) / 720));
    const arc = Math.sin(daylight * Math.PI);
    document.documentElement.style.setProperty('--forest-sun-x', `${(18 + daylight * 58).toFixed(1)}%`);
    document.documentElement.style.setProperty('--forest-sun-y', `${(34 - arc * 23).toFixed(1)}%`);
    document.documentElement.style.setProperty('--forest-day-warmth', `${(.07 + arc * .13).toFixed(3)}`);
  }
  updateAmbientLight();
  setInterval(updateAmbientLight, 5 * 60 * 1000);
  // 前景地面带（让树扎实种在地里）；落雨主题在带上加可见的涟漪+落地水花
  const _OVGROUND = { default:['#768b62','#4f6953','#d7d3a0'], night:['#0b2a23','#061912','#648a72'], sunrise:['#cf9a63','#ad7842','#e8c48c'], rain:['#3c4e60','#2a3947','#566b7d'], bubbles:['#1e5f7d','#123f52','#3080a0'] };
  function _overlayGroundSvg(theme){
    // v3 的两套签名场景已经把可种植的地面画进背景；保留透明定位层，避免再盖一条平涂色带。
    if (theme === 'default' || theme === 'night') return '<svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"></svg>';
    const g = _OVGROUND[theme] || _OVGROUND.default;
    let rip = '';
    if (theme === 'rain') {
      const R=[[58,42,26],[150,34,17],[252,46,30],[332,36,20],[110,60,22],[300,62,24],[200,54,19],[40,66,15]];
      rip = R.map((v,i)=>{ const x=v[0],y=v[1],rx=v[2], d=(((i*0.37)%1)*2.4).toFixed(2), dur=(2.0+(i%3)*0.45).toFixed(2), sdur=(1.3+(i%3)*0.35).toFixed(2);
        return `<g class="rn-ripple" style="animation-delay:-${d}s;animation-duration:${dur}s"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${(rx*0.34).toFixed(1)}" fill="none" stroke="#9fc0dd" stroke-width="1.6" opacity="0.55"/><ellipse cx="${x}" cy="${y}" rx="${(rx*0.5).toFixed(1)}" ry="${(rx*0.5*0.34).toFixed(1)}" fill="none" stroke="#c2dcf0" stroke-width="1.1" opacity="0.4"/></g>`
          +`<g class="rn-splash" style="animation-delay:-${d}s;animation-duration:${sdur}s;transform-origin:${x}px ${y}px"><path d="M${x} ${y-3} l0 -3.4 M${x-2.6} ${y-2.6} l-1.3 -2.2 M${x+2.6} ${y-2.6} l1.3 -2.2" stroke="#dbeaf7" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.85"/></g>`;
      }).join('');
    }
    return `<svg viewBox="0 0 400 100" preserveAspectRatio="none"><rect width="400" height="100" fill="${g[1]}"/><path d="M0 30 Q 200 8 400 24 L400 100 L0 100 Z" fill="${g[0]}"/><path d="M0 30 Q 200 8 400 24" fill="none" stroke="${g[2]}" stroke-width="2.4" opacity="0.55"/>${rip}</svg>`;
  }
  // 场景切换交叉淡入：新层叠上、动画结束移除旧层，避免整幅 innerHTML 硬切
  function _swapScene(container, html) {
    if (!container) return;
    while (container.children.length > 1) container.firstElementChild.remove();
    const old = container.firstElementChild;
    if (!old) { container.innerHTML = html; return; }
    container.insertAdjacentHTML('beforeend', html);
    const nw = container.lastElementChild;
    nw.classList.add('scene-fade-in');
    let done = false;
    const finish = () => { if (done) return; done = true; if (old.parentNode) old.remove(); nw.classList.remove('scene-fade-in'); };
    nw.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 650);   // reduced-motion / 动画被跳过时的兜底
  }
  function applyTheme() {
    if (!$overlay) return;
    const background = resolvedBackground();
    // 清掉所有 theme-* 类，只加当前
    $overlay.className = $overlay.className.replace(/\btheme-\w+\b/g, '').replace(/\btimer-\w+\b/g, '');
    $overlay.classList.add('theme-' + background);
    $overlay.classList.add('timer-' + state.theme.timer);
    _swapScene(document.getElementById('overlay-scene'), _sceneSvg(background, true));
    _swapScene(document.getElementById('overlay-ground'), _overlayGroundSvg(background));
    applyVisualShell(background);
    requestAnimationFrame(positionSingleTreeTargets);
  }

  function applyStageTheme() {
    const $stage = document.getElementById('stage');
    if (!$stage) return;
    const background = resolvedBackground();
    $stage.className = $stage.className.replace(/\btheme-\w+\b/g, '');
    $stage.classList.add('theme-' + background);
    _swapScene(document.getElementById('stage-scene'), _sceneSvg(background, false));
    _swapScene(document.getElementById('stage-ground'), _overlayGroundSvg(background));
    applyVisualShell(background);
    requestAnimationFrame(positionSingleTreeTargets);
  }

  // ============ Tree SVG ============
  // progress: 0-1 描述树的成长进度
  // ============ 主题场景（每主题一幅矢量小景，作舞台 / 全屏遮罩 / 选择器的背景）============
  const { _themeScene, _themeThumb, buildTreeSvg, durationToTier, buildFieldTreeSvg, _gradeName, _decoLevel } = window.ForestScenes;
  const Layout = window.ForestLayout;
  const SINGLE_TREE_WORLD = Object.freeze({ x: 0, y: 0, z: 0.6, seed: 314159 });
  let lastTreeProgress = 0;

  function projectSingleTree(target, progress) {
    if (!target) return;
    const isOverlay = target === $overlayTreeContainer;
    const host = isOverlay ? document.querySelector('.focus-visual') : document.getElementById('stage');
    if (!host || !host.clientWidth || !host.clientHeight) return;
    const mobile = window.matchMedia && window.matchMedia('(max-width: 1199px)').matches;
    const scene = isOverlay ? (resolvedBackground() === 'night' ? 'focusNight' : 'focusDay') : (mobile ? 'homeMobile' : 'homeDesktop');
    const viewport = { width: host.clientWidth, height: host.clientHeight };
    const projected = Layout.projectToViewport(scene, SINGLE_TREE_WORLD, viewport);
    const stageGrowth = 0.58 + Layout.growthScale(progress) * 0.42;
    // 容器与素材一一对应；不再依赖旧 flex 布局把树误缩成半宽。
    const base = isOverlay
      ? Math.min(viewport.width * 0.19, viewport.height * 0.45)
      : Math.min(viewport.width * 0.24, viewport.height * 0.45);
    const size = Math.max(52, base * projected.scale * stageGrowth);
    target.classList.add('layout-3d-tree');
    target.style.left = `${projected.x}px`;
    target.style.top = `${projected.y}px`;
    target.style.bottom = 'auto';
    target.style.width = `${size}px`;
    target.style.height = `${size * 0.8}px`;
    target.style.zIndex = String(projected.zIndex);
    target.dataset.worldX = String(SINGLE_TREE_WORLD.x);
    target.dataset.worldY = '0';
    target.dataset.worldZ = String(SINGLE_TREE_WORLD.z);
    target.style.setProperty('--single-growth', stageGrowth.toFixed(4));
  }

  function positionSingleTreeTargets() {
    projectSingleTree($treeContainer, lastTreeProgress);
    projectSingleTree($overlayTreeContainer, lastTreeProgress);
  }

  function renderTree(progress, target) {
    // 生长中的树按「本次专注最终会长成多大」预告装饰（接近完成才淡入）
    let value;
    if (state.session && !state.session.isBreak) {
      const mins = state.session.duration / 60000;
      if (state.cultivateTargetId) {
        const tt = state.trees.find(x => x.id === state.cultivateTargetId && x.success);
        value = tt ? Core.cultivationValue(treeValue(tt), mins) : mins;
      } else {
        value = mins;
      }
    }
    // 生长量化到 0.5%：一档内几何不变就不重建（旧方案每秒重建 svg，摆动/落樱动画被打断）
    const pq = Math.round(Math.max(0, Math.min(1, progress)) * 200) / 200;
    lastTreeProgress = pq;
    const wantPetals = state.treeType === 'sakura' && pq >= 0.5;
    const key = state.treeType + '|' + pq + '|' + (value || 0);
    const targets = target ? [target] : [$treeContainer, $overlayTreeContainer];
    targets.forEach(t => {
      const L = _ensureTreeLayers(t);
      if (L.anim._ftKey !== key) {
        L.anim._ftKey = key;
        L.anim.innerHTML = buildTreeSvg(state.treeType, pq, value, true, true);
      }
      const hasPetals = !!L.petals.firstChild;
      if (wantPetals && !hasPetals) L.petals.innerHTML = '<svg viewBox="0 0 320 240">' + _sakuraFall() + '</svg>';
      else if (!wantPetals && hasPetals) L.petals.innerHTML = '';
      projectSingleTree(t, pq);
    });
  }
  // 持久双层：.tree-anim（摆动层，跨重建存活）+ .petal-layer（落樱层，只建一次持续飘）
  function _ensureTreeLayers(target) {
    let anim = target.querySelector(':scope > .tree-anim');
    if (!anim) {
      target.innerHTML = '<div class="tree-anim"></div><div class="petal-layer"></div>';
      anim = target.querySelector(':scope > .tree-anim');
    }
    return { anim, petals: target.querySelector(':scope > .petal-layer') };
  }

  // ============ 田地树（按 tier 渲染最终形态）============
  // tier 1-4 对应不同的形态/大小
  // ============ Timer ============
  function fmtTime(sec) {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  let tickInterval = null;
  let graceTimeout = null;

  function decorateRuntime(runtime, now) {
    return decoratedRuntime(runtime, now);
  }

  function startSession(opts = {}) {
    const isBreak = !!opts.isBreak;
    const flexible = !isBreak && !!state.flexible;
    const minutes = isBreak ? state.breakMin : state.duration;
    const now = Date.now();
    let runtime;
    try {
      runtime = Core.createSession({
        id: opts.id,
        now,
        phase: isBreak ? 'break' : 'focus',
        mode: flexible ? Core.MODE.FLEXIBLE : state.strict ? Core.MODE.STRICT : Core.MODE.SELF,
        minutes,
        task: state.task,
        fieldId: state.activeFieldId,
        treeType: flexible ? 'pine' : state.treeType,
        target: state.revivalTargetId
          ? { kind: 'revival', treeId: state.revivalTargetId }
          : state.cultivateTargetId ? { kind: 'cultivate', treeId: state.cultivateTargetId } : null,
        chainId: state.currentChainId,
        cycleNumber: state.cycleCount + (isBreak ? 0 : 1),
        ownerTabId: _tabId,
        ownerDeviceId: DEVICE_ID,
      });
    } catch (error) {
      if ($customMinError) $customMinError.textContent = '时长或活动状态无效，请重新选择';
      validateDurationUI();
      return false;
    }
    const claimed = forestStore.claimLease(runtime.id, _tabId, DEVICE_ID, false);
    if (!claimed.ok) {
      $startBtn.disabled = true;
      showToast('另一个标签页正在专注；请切回原标签，或在恢复提示中明确接管');
      return false;
    }
    runtime.leaseEpoch = claimed.lease.epoch;
    runtime.fenceToken = claimed.lease.fenceToken;
    state.session = decorateRuntime(runtime, now);
    if (forestChannel) forestChannel.postMessage({ type: 'lease', sessionId: runtime.id, tabId: _tabId, epoch: runtime.leaseEpoch });
    state.paused = false;
    state.pausedAt = null;
    openSessionUI();
    persistActive();
    return true;
  }

  // 全屏遮罩=对话框：打开时隔离背景（inert 挡键盘/读屏）+ 移焦进遮罩，关闭时还原
  let overlayInerted = [];
  function setOverlayA11y(on) {
    if (on) {
      const bodyBranches = Array.from(document.body.children).filter((element) => !element.contains($overlay));
      const localSiblings = $overlay.parentElement ? Array.from($overlay.parentElement.children).filter((element) => element !== $overlay) : [];
      overlayInerted = Array.from(new Set([...bodyBranches, ...localSiblings])).filter((element) => !element.classList.contains('ft-modal-mask') && !element.hasAttribute('inert'));
      overlayInerted.forEach((element) => element.setAttribute('inert', ''));
    } else {
      overlayInerted.forEach((element) => element.removeAttribute('inert'));
      overlayInerted = [];
    }
    if (on) { try { $overlay.focus(); } catch (e) {} }
    else { try { if (!$startBtn.disabled) $startBtn.focus(); } catch (e) {} }
  }
  // Esc 关闭遮罩 = 走「放弃 / 结束循环」流程（放弃仍会弹确认，不一键毁树）；确认框开着时它自理 Esc
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !$overlay.classList.contains('open')) return;
    if (document.querySelector('.ft-modal-mask.open')) return;
    e.preventDefault();
    $giveUpBtn.click();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !$overlay.classList.contains('open') || document.querySelector('.ft-modal-mask.open')) return;
    const focusable = Array.from($overlay.querySelectorAll('button:not([disabled]):not([hidden]), [tabindex="0"]')).filter((element) => element.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); $overlay.focus(); return; }
    const index = focusable.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
    else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0].focus(); }
  }, true);

  // 依据 state.session 打开全屏遮罩并启动计时（新开 / 续跑共用）
  function openSessionUI() {
    const isBreak = !!state.session.isBreak;
    state.breakMode = isBreak;
    lastGrowthStage = null;
    if ($focusStage) $focusStage.textContent = '';
    applyTheme();   // 套用主题 + 生成粒子
    $overlay.classList.add('open');
    document.body.classList.add('forest-focus-active');
    $overlay.classList.toggle('break-mode', isBreak);
    setOverlayA11y(true);
    $overlayTimer.style.color = '';   // 复位上一段可能残留的告警色

    const flexible = !!state.session.flexible;
    $giveUpBtn.classList.toggle('flex-stop', flexible);
    if (flexible) {
      $overlayTag.textContent = state.task || '';
      $overlayTag.hidden = !state.task;
      $overlayWarn.textContent = '随时点「停下 · 收树」结束，会种下一棵松树';
      $overlayWarn.hidden = false;
      $giveUpBtn.textContent = '停下 · 收树';
    } else if (isBreak) {
      $overlayTag.textContent = '休息一下';
      $overlayTag.hidden = false;
      $overlayWarn.textContent = '休息按挂钟结束；下一次专注需要你确认，除非主动开启自动开始';
      $overlayWarn.hidden = false;
      $giveUpBtn.textContent = '结束循环';
    } else {
      $overlayTag.textContent = state.task || '';
      $overlayTag.hidden = !state.task;
      $overlayWarn.textContent = state.strict ? '离开页面超过 15 秒，树会枯萎' : '自觉模式：离开不会枯萎';
      $overlayWarn.hidden = !state.strict;
      $giveUpBtn.textContent = '放弃这棵';
    }

    if (state.pomodoroOn) {
      $overlayCounter.style.display = '';
      const phaseLabel = isBreak ? '休息' : '专注';
      const cycleNum = state.cycleCount + (isBreak ? 0 : 1);
      $overlayCounter.textContent = `第 ${cycleNum} 个番茄 · ${phaseLabel}`;
    } else {
      $overlayCounter.style.display = 'none';
    }

    updatePauseUI();
    $startBtn.disabled = true;
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    tick();
    tickInterval = setInterval(tick, 1000);
    acquireWakeLock();
  }

  // 续跑一个已存在的 session（智能续跑用）
  function enterExisting(active, note) {
    const runtime = runtimeFromLegacy(active);
    const claimed = forestStore.claimLease(runtime.id, _tabId, DEVICE_ID, false);
    if (!claimed.ok) {
      $startBtn.disabled = true;
      showToast('另一个标签页仍持有这次专注，本页不会接管');
      return false;
    }
    runtime.ownerTabId = _tabId;
    runtime.ownerDeviceId = DEVICE_ID;
    runtime.leaseEpoch = claimed.lease.epoch;
    runtime.fenceToken = claimed.lease.fenceToken;
    state.session = decorateRuntime(runtime, Date.now());
    state.treeType = active.treeType || state.treeType;
    state.task = active.task || '';
    if (!active.isBreak && !active.flexible) state.duration = Math.round(active.duration / 60000);  // 让结束后的显示与本段时长一致
    state.paused = runtime.status === Core.STATUS.PAUSED;
    state.pausedAt = runtime.pausedAt || null;
    openSessionUI();
    if (state.paused) {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      updatePauseUI();
      tick();
      releaseWakeLock();
    }
    persistActive();
    if (note) showToast('已为你继续计时');
    return true;
  }

  // ============ 暂停 / 继续 ============
  function updatePauseUI() {
    const inFocus = state.session && !state.session.isBreak && !state.session.flexible;   // 灵活模式无暂停
    $pauseBtn.style.display = inFocus ? '' : 'none';
    if (inFocus && state.paused) {
      $pauseBtn.textContent = '继续';
      $overlayTag.textContent = '已暂停';
      $overlayTag.hidden = false;
      $overlay.classList.add('paused');
    } else {
      $pauseBtn.textContent = '暂停';
      $overlay.classList.remove('paused');
      if (inFocus) {
        $overlayTag.textContent = state.task || '';
        $overlayTag.hidden = !state.task;
      }
    }
  }
  function togglePause() {
    if (!state.session || state.session.isBreak) return;
    if (!state.paused) {
      state.session = decorateRuntime(Core.pauseSession(state.session, Date.now()), Date.now());
      state.paused = true;
      state.pausedAt = state.session.pausedAt;
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      state.leftAt = null;   // 暂停期间的离开不计
      updatePauseUI();
      persistActive();
      releaseWakeLock();
    } else {
      state.session = decorateRuntime(Core.resumePausedSession(state.session, Date.now()), Date.now());
      state.paused = false;
      state.pausedAt = null;
      updatePauseUI();
      persistActive();
      tick();
      tickInterval = setInterval(tick, 1000);
      acquireWakeLock();
    }
  }
  $pauseBtn.addEventListener('click', togglePause);

  let _lastBeat = 0;
  function tick() {
    if (!state.session) return;
    const now = Date.now();
    // 心跳：定期落盘 lastTick，供智能续跑判断离开时长（节流 ~2s）
    if (!state.paused && now - _lastBeat > 2000) { _lastBeat = now; persistActive(); }
    const elapsed = now - state.session.startTime;
    if (state.session.flexible) {
      // 灵活模式：正计时，不倒计时、不自动完成；树按已专注时长生长（1 小时≈满，封顶）
      const t = fmtTime(Math.floor(elapsed / 1000));
      $timerDisplay.textContent = t;
      $overlayTimer.textContent = t;
      document.title = `(${t}) ${state.session.task || '不限时专注'} · 种树`;
      renderTree(Math.min(1, elapsed / (60 * 60 * 1000)));
      return;
    }
    const remaining = state.session.duration - elapsed;
    const progress = Math.min(1, elapsed / state.session.duration);

    const remainSec = Math.ceil(remaining / 1000);
    const elapsedSec = Math.floor(elapsed / 1000);
    const remainTxt = fmtTime(remainSec);
    const elapsedTxt = fmtTime(elapsedSec);
    // 主页 timer 始终倒计时（不被 theme 影响）
    $timerDisplay.textContent = remainTxt;
    // overlay timer 跟随 theme.timer 设定
    if (state.theme.timer === 'countup') {
      $overlayTimer.textContent = elapsedTxt;
    } else {
      $overlayTimer.textContent = remainTxt;  // countdown / hidden 都用 remainTxt（hidden 时 CSS 隐藏）
    }
    document.title = `(${remainTxt}) ${state.session.task || (state.session.isBreak ? '休息' : '专注')} · 种树`;
    if (remainSec <= 60 && remainSec > 0) {
      $timerDisplay.classList.add('warn');
      $overlayTimer.style.color = state.session.isBreak ? '#88c8ff' : '#ffb88c';
    }

    if (state.session.isBreak) {
      // break 模式不画树，画一杯矢量热饮 + 袅袅热气（只画一次：每秒重建会打断热气动画）
      if (!$overlayTreeContainer.querySelector('.break-mug')) {
        $overlayTreeContainer.innerHTML = `
        <svg class="tree-svg break-mug" viewBox="0 0 320 240" style="opacity: 0.85;">
          <g fill="none" stroke="#cfe6ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M112 120 h74 v46 a26 26 0 0 1 -26 26 h-22 a26 26 0 0 1 -26 -26 z"/>
            <path d="M186 130 h16 a18 18 0 0 1 0 36 h-16"/>
          </g>
          <g fill="none" stroke="#cfe6ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
            <path class="mug-steam" d="M132 98 c0 -11 -9 -13 -9 -24"/>
            <path class="mug-steam" style="animation-delay:-1.1s" d="M158 98 c0 -11 -9 -13 -9 -24"/>
            <path class="mug-steam" style="animation-delay:-2.2s" d="M184 98 c0 -11 -9 -13 -9 -24"/>
          </g>
        </svg>
      `;
      }
    } else {
      const stage = Core.growthStage(progress);
      if (stage.key !== lastGrowthStage) {
        lastGrowthStage = stage.key;
        if ($focusStage) $focusStage.textContent = stage.label;
      }
      let reducedMotion = false;
      try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      renderTree(reducedMotion ? stage.visualProgress : Math.max(progress, 0.04));
    }

    if (remaining <= 0) {
      const decision = Core.resumeDecision(state.session, now);
      if (decision.action === 'fail-left-page') failSession('left_page', { failedAt: decision.failedAt, elapsedMs: decision.elapsedMs });
      else completeSession({ completedAt: decision.completedAt || Core.scheduledCompletion(state.session, now) });
    }
  }

  function ensureSessionField(session) {
    if (session && state.fields.some((field) => field.id === session.fieldId)) return session.fieldId;
    let recovery = state.fields.find((field) => field.id === 'fld-recovery');
    if (!recovery) {
      recovery = { id: 'fld-recovery', name: '恢复田', createdAt: new Date().toISOString(), updatedAt: Date.now() };
      state.fields.push(recovery);
    }
    return recovery.id;
  }

  function closeFocusOverlay() {
    $overlay.classList.remove('open', 'break-mode', 'paused');
    document.body.classList.remove('forest-focus-active');
    document.title = originalDocumentTitle;
    lastGrowthStage = null;
    if ($focusStage) $focusStage.textContent = '';
    releaseWakeLock();
    $startBtn.disabled = false;
    setOverlayA11y(false);
  }

  function scheduleNextPhase(nextIsBreak, existingGrace) {
    const autoStart = nextIsBreak ? state.autoStartBreak : state.autoStartFocus;
    const grace = existingGrace || Core.createGrace({
      now: Date.now(), nextPhase: nextIsBreak ? 'break' : 'focus', autoStart,
      chainId: state.currentChainId, cycleNumber: state.cycleCount,
    });
    if (forestSnapshot) forestSnapshot.active = grace;
    queueStoreSave('pomodoro-grace');
    $pauseBtn.style.display = 'none';
    $giveUpBtn.textContent = '结束循环';
    $timerDisplay.textContent = fmtTime((nextIsBreak ? state.breakMin : state.duration) * 60);
    $graceBanner.classList.remove('hidden');
    const startNext = () => {
      if (!nextIsBreak && document.hidden) {
        showReady();
        return;
      }
      if (forestSnapshot) forestSnapshot.active = null;
      $graceBanner.classList.add('hidden');
      startSession({ isBreak: nextIsBreak });
    };
    const showReady = () => {
      if (graceTimeout) { clearInterval(graceTimeout); graceTimeout = null; }
      $graceBanner.innerHTML = nextIsBreak
        ? '休息已准备好 <button type="button" class="grace-start">开始休息</button>'
        : '下一棵已准备好 <button type="button" class="grace-start">开始下一次专注</button>';
      const button = $graceBanner.querySelector('.grace-start');
      if (button) button.addEventListener('click', startNext, { once: true });
    };
    if (!autoStart || (!nextIsBreak && document.hidden)) { showReady(); return; }
    let countdown = Math.max(0, Math.ceil((grace.nextStartAt - Date.now()) / 1000));
    const paint = () => { $graceBanner.textContent = `${countdown} 秒后开始${nextIsBreak ? '休息' : '下一棵'}`; };
    paint();
    graceTimeout = setInterval(() => {
      countdown = Math.max(0, Math.ceil((grace.nextStartAt - Date.now()) / 1000));
      if (countdown <= 0) { clearInterval(graceTimeout); graceTimeout = null; startNext(); }
      else paint();
    }, 250);
  }

  function completeSession(opts) {
    opts = opts || {};
    if (!state.session) return;
    const session = state.session;
    const lease = forestStore.readLease();
    if (session.fenceToken && !Core.leaseMatches(lease, session)) {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      showToast('此专注已被其他标签页接管，本页没有重复结算');
      state.session = null;
      return;
    }
    if (session.id && state.sessions.some((row) => row.sessionId === session.id)) {
      forestStore.releaseLease(session.id, _tabId);
      state.session = null;
      saveActive(null);
      closeFocusOverlay();
      return;
    }
    clearInterval(tickInterval); tickInterval = null;
    state.paused = false; state.pausedAt = null;
    const completedAt = Number(opts.completedAt) || Core.scheduledCompletion(session, Date.now());
    const wasBreak = !!session.isBreak;
    const revivalTargetId = state.revivalTargetId;
    const cultivateTargetId = state.cultivateTargetId;
    const wasRevival = !!revivalTargetId;
    const fieldId = ensureSessionField(session);
    const realMinutes = wasBreak ? 0 : session.duration / 60000;
    const sessType = session.treeType;
    let tree = null;
    let record = null;
    let outcome = wasBreak ? 'break-completed' : 'planted';
    let resultMessage = '';
    let completionGrade = '';

    if (!wasBreak && wasRevival) {
      const target = state.trees.find((item) => item.id === revivalTargetId && !item.success);
      if (target) {
        const attempted = target.attemptedMinutes || 5;
        target.success = true;
        target.durationMinutes = attempted;
        target.revivalDiscount = 0.5;
        target.endTime = completedAt;
        target.updatedAt = completedAt;
        target.cycleBonus = 1.0;
        target.chainId = null;
        target.cycleNum = null;
        target.appliedSessionIds = Array.from(new Set([...(target.appliedSessionIds || []), session.id]));
        delete target.attemptedMinutes;
        delete target.reason;
        resultMessage = `并复活了 ${TREE_NAME[target.type]}`;
      }
      outcome = 'revived';
    }

    if (!wasBreak && cultivateTargetId) {
      const target = state.trees.find((item) => item.id === cultivateTargetId && item.success);
      if (target) {
        const before = treeValue(target);
        const newVal = Core.cultivationValue(before, realMinutes);
        target.value = newVal;
        target.origin = 'cultivate';
        target.endTime = completedAt;
        target.updatedAt = completedAt;
        target.appliedSessionIds = Array.from(new Set([...(target.appliedSessionIds || []), session.id]));
        completionGrade = _gradeName(newVal);
        resultMessage = `培养成功：${TREE_NAME[target.type]}长到约 ${newVal} 分（${completionGrade}）`;
      } else resultMessage = `专注 ${realMinutes} 分钟完成；原培养目标已不存在`;
      outcome = 'cultivated';
      record = logSession(realMinutes, realMinutes, completedAt, sessType, {
        sessionId: session.id, treeId: target ? target.id : null, fieldId, task: session.task,
        startTime: session.startTime, outcome,
      });
    } else if (!wasBreak) {
      const isInChain = state.pomodoroOn && state.currentChainId && !wasRevival;
      const cycleNum = isInChain ? state.cycleCount + 1 : null;
      tree = {
        id: session.id ? `tr-${session.id}` : Core.randomId('tr', completedAt),
        createdBySessionId: session.id || null,
        type: session.treeType, task: session.task || '', fieldId,
        durationMinutes: realMinutes, chainId: isInChain ? state.currentChainId : null,
        cycleNum, cycleBonus: 1.0, startTime: session.startTime, endTime: completedAt,
        updatedAt: completedAt, success: true,
      };
      if (!state.trees.some((item) => item.id === tree.id || (session.id && item.createdBySessionId === session.id))) {
        assignNewPosition(tree);
        state.trees.push(tree);
      }
      _justPlantedId = tree.id;
      state.cycleCount++;
      let bonus = 1.0;
      if (isInChain) {
        bonus = cycleBonusFor(state.cycleCount);
        state.trees.forEach((item) => { if (item.chainId === state.currentChainId) { item.cycleBonus = bonus; item.updatedAt = completedAt; } });
      }
      record = logSession(tree.durationMinutes, treeValue(tree), completedAt, tree.type, {
        sessionId: session.id, treeId: tree.id, fieldId, task: session.task,
        startTime: session.startTime, outcome,
      });
      completionGrade = _gradeName(treeValue(tree));
      resultMessage = wasRevival
        ? `灌溉成功：新种一棵 ${TREE_NAME[tree.type]}（${tree.durationMinutes} 分），${resultMessage}`
        : `种成一棵 ${TREE_NAME[tree.type]} · 专注 ${tree.durationMinutes} 分钟${isInChain && bonus > 1 ? ` · ${state.cycleCount} 连击 ×${bonus}` : ''}`;
    } else {
      resultMessage = '休息结束；下一次专注需要你确认开始';
    }

    if (!wasBreak) {
      state.lastCompletion = Core.completionView({
        sessionId: session.id, treeId: tree ? tree.id : cultivateTargetId, task: session.task,
        fieldId, fieldName: state.fields.find((item) => item.id === fieldId)?.name || '恢复田',
        treeType: sessType, grade: completionGrade, minutes: realMinutes, exp: record ? record.exp : realMinutes,
        outcome, endedAt: completedAt,
      });
      $timerStatus.textContent = resultMessage;
    } else $timerStatus.textContent = resultMessage;

    forestStore.releaseLease(session.id, _tabId);
    state.session = null;
    if (revivalTargetId) cancelRevival();
    if (cultivateTargetId) cancelCultivate();
    saveActive(null);
    $overlayTimer.style.color = '';
    $timerDisplay.classList.remove('warn');
    renderStats();
    renderCompletionCard(!wasBreak);
    if (!wasBreak) notifyCompletion(state.lastCompletion);

    if (state.pomodoroOn && !opts.noAdvance) {
      scheduleNextPhase(!wasBreak);
      return;
    }
    const wasOverlayOpen = $overlay.classList.contains('open');
    const closeNow = () => {
      if (state.session) return;
      closeFocusOverlay();
      if (!wasBreak && wasOverlayOpen) showToast('这次专注已完整入账', { undoText: '去看看', undo: () => { location.hash = '#forest'; } });
      setTimeout(() => { if (!state.session) renderTree(0, $overlayTreeContainer); }, 420);
    };
    $pauseBtn.style.display = 'none';
    $timerDisplay.textContent = fmtTime(state.duration * 60);
    renderTree(0, $treeContainer);
    if (!wasBreak) celebrateThenClose(closeNow); else closeNow();
  }

  // 种成庆典：柔金光环 + 叶瓣爆散，播完再关遮罩（reduced-motion 直接关）
  function celebrateThenClose(closeFn) {
    let rm = false;
    try { rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (rm || !$overlayTreeContainer || !$overlay.classList.contains('open')) { closeFn(); return; }
    const burst = document.createElement('div');
    burst.className = 'celebrate-burst';
    const leaves = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8 + 0.35;
      const dx = Math.cos(a) * 92, dy = Math.sin(a) * 66 - 26;
      const col = i % 2 ? '#8fbf6f' : '#e7c87f';
      leaves.push('<path class="celeb-leaf" style="--dx:' + dx.toFixed(0) + 'px;--dy:' + dy.toFixed(0) + 'px;animation-delay:' + (i * 0.03).toFixed(2) + 's" transform="translate(160 128)" d="M0 0 q5 -8 0 -15 q-5 7 0 15" fill="' + col + '"/>');
    }
    burst.innerHTML = '<svg viewBox="0 0 320 240"><circle class="celeb-ring" cx="160" cy="128" r="30" fill="none" stroke="#e7c87f" stroke-width="3"/>' + leaves.join('') + '</svg>';
    $overlayTreeContainer.appendChild(burst);
    setTimeout(() => { burst.remove(); closeFn(); }, 1200);   // ≥ 最长叶瓣 0.95s+0.21s 延迟，庆典完整播完再收遮罩
  }

  function failSession(reason, options) {
    if (!state.session) return;
    const opts = options || {};
    const session = state.session;
    const lease = forestStore.readLease();
    if (session.fenceToken && !Core.leaseMatches(lease, session)) {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      state.session = null;
      showToast('此专注已由另一个标签页接管，本页没有重复结算');
      return;
    }
    clearInterval(tickInterval); tickInterval = null;
    if (graceTimeout) { clearInterval(graceTimeout); graceTimeout = null; }
    $graceBanner.classList.add('hidden');
    const failedAt = Number(opts.failedAt) || Date.now();
    const elapsed = Number.isFinite(opts.elapsedMs) ? opts.elapsedMs : Core.elapsedMs(session, failedAt);
    const wasBreak = !!session.isBreak;
    const target = state.revivalTargetId
      ? { kind: 'revival', treeId: state.revivalTargetId }
      : state.cultivateTargetId ? { kind: 'cultivate', treeId: state.cultivateTargetId } : null;
    const outcome = Core.abandonOutcome({ elapsedMs: elapsed, plannedMinutes: session.duration / 60000, phase: wasBreak ? 'break' : 'focus', target });
    let failedTree = null;
    if (!wasBreak && outcome.createsTree) {
      failedTree = {
        id: session.id ? `tr-${session.id}-failed` : Core.randomId('tr', failedAt),
        createdBySessionId: session.id || null,
        type: session.treeType, task: session.task || '', fieldId: ensureSessionField(session),
        durationMinutes: session.duration / 60000, attemptedMinutes: outcome.attemptedMinutes,
        startTime: session.startTime, endTime: failedAt, updatedAt: failedAt,
        success: false, reason: reason || 'gave_up',
      };
      if (!state.trees.some((item) => item.id === failedTree.id || (session.id && item.createdBySessionId === session.id))) {
        assignNewPosition(failedTree);
        state.trees.push(failedTree);
      }
      logSession(outcome.attemptedMinutes, 0, failedAt, failedTree.type, {
        sessionId: session.id, treeId: failedTree.id, fieldId: failedTree.fieldId, task: session.task,
        startTime: session.startTime, outcome: reason === 'left_page' ? 'left-page' : 'abandoned',
      });
      $timerStatus.textContent = reason === 'left_page' ? '树枯萎了：离开页面太久' : '树枯萎了：这次提前结束';
    } else if (!wasBreak) {
      $timerStatus.textContent = outcome.message;
    } else $timerStatus.textContent = '休息提前结束，循环已停止';

    forestStore.releaseLease(session.id, _tabId);
    state.session = null;
    state.cycleCount = 0;
    state.currentChainId = null;
    state.paused = false;
    state.pausedAt = null;
    if (state.revivalTargetId) cancelRevival();
    if (state.cultivateTargetId) cancelCultivate();
    saveActive(null);
    closeFocusOverlay();
    $pauseBtn.style.display = 'none';
    $overlayTimer.style.color = '';
    $timerDisplay.classList.remove('warn');
    $timerDisplay.textContent = fmtTime(state.duration * 60);
    renderTree(0, $treeContainer);
    setTimeout(() => { if (!state.session) renderTree(0, $overlayTreeContainer); }, 420);
    renderStats();
  }

  // 灵活模式「停下 · 收树」：不失败；长时间失联会先由 reconcileVisibleSession 询问。
  function stopFlexibleAt(stopAt) {
    if (!state.session || !state.session.flexible) return;
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    const session = state.session;
    const startTime = session.startTime;
    const task = session.task || '';
    const endTime = Number(stopAt) || Date.now();
    const elapsedMin = Math.max(0, (endTime - startTime) / 60000);
    const min = Math.round(elapsedMin);
    const planted = elapsedMin >= 1;
    const wasOverlayOpen = $overlay.classList.contains('open');
    let tree = null;
    let record = null;
    if (planted) {
      tree = {
        id: session.id ? `tr-${session.id}` : Core.randomId('tr', endTime),
        createdBySessionId: session.id || null,
        type: 'pine', task, fieldId: session.fieldId || state.activeFieldId, durationMinutes: min,
        chainId: null, cycleNum: null, cycleBonus: 1.0,
        startTime, endTime, updatedAt: endTime,
        success: true, flex: true,
      };
      if (!state.trees.some((item) => item.id === tree.id || (session.id && item.createdBySessionId === session.id))) {
        assignNewPosition(tree);
        state.trees.push(tree);
      }
      _justPlantedId = tree.id;
      record = logSession(min, treeValue(tree), endTime, 'pine', {
        sessionId: session.id, treeId: tree.id, fieldId: tree.fieldId, task,
        startTime, outcome: 'planted',
      });
      state.lastCompletion = Core.completionView({
        sessionId: session.id, treeId: tree.id, task, fieldId: tree.fieldId, fieldName: state.fields.find((field) => field.id === tree.fieldId)?.name || '恢复田',
        treeType: 'pine', grade: _gradeName(treeValue(tree)), minutes: min, exp: record ? record.exp : min, outcome: 'planted', endedAt: endTime,
      });
      $timerStatus.textContent = `种成一棵松树 · 灵活专注 ${min} 分钟`;
    } else {
      $timerStatus.textContent = '不足 1 分钟，这次不计';
    }
    forestStore.releaseLease(session.id, _tabId);
    state.session = null;
    saveActive(null);
    renderStats();
    renderCompletionCard(true);
    $pauseBtn.style.display = 'none';
    $timerDisplay.textContent = '0:00';
    renderTree(0, $treeContainer);
    const closeNow = () => {
      if (state.session) return;
      $overlay.classList.remove('open');
      $overlay.classList.remove('break-mode');
      document.body.classList.remove('forest-focus-active');
      $startBtn.disabled = false;
      setOverlayA11y(false);
      if (planted && wasOverlayOpen) showToast(`已种下一棵松树 · ${min} 分（灵活）`, { undoText: '去看看', undo: () => { location.hash = '#forest'; } });
      setTimeout(() => { if (!state.session) renderTree(0, $overlayTreeContainer); }, 420);
    };
    if (planted) celebrateThenClose(closeNow); else closeNow();
  }
  function stopFlexible() { stopFlexibleAt(Date.now()); }

  $startBtn.addEventListener('click', () => {
    primeAudio();
    if (!validateDurationUI()) return;
    if (state.pomodoroOn && !Core.validateMinutes($breakMin.value, 1, 60).ok) {
      $breakMin.setAttribute('aria-invalid', 'true');
      if ($customMinError) $customMinError.textContent = '休息时长必须是 1–60 整分钟';
      return;
    }
    if ($targetFieldSelect && state.fields.some((field) => field.id === $targetFieldSelect.value)) state.activeFieldId = $targetFieldSelect.value;
    if (state.revivalTargetId && !state.trees.some((treeItem) => treeItem.id === state.revivalTargetId && !treeItem.success)) { cancelRevival(); showToast('灌溉目标已不存在，请重新选择'); return; }
    if (state.cultivateTargetId && !state.trees.some((treeItem) => treeItem.id === state.cultivateTargetId && treeItem.success)) { cancelCultivate(); showToast('培养目标已不存在，请重新选择'); return; }
    state.task = $taskInput.value.trim();
    state.cycleCount = 0;
    state.currentChainId = state.pomodoroOn ? newChainId() : null;
    startSession();
  });

  $giveUpBtn.addEventListener('click', async () => {
    if (graceTimeout) {
      clearInterval(graceTimeout); graceTimeout = null;
      $graceBanner.classList.add('hidden');
      state.cycleCount = 0;
      state.currentChainId = null;
      if (forestSnapshot) forestSnapshot.active = null;
      queueStoreSave('cancel-grace');
      $overlay.classList.remove('open', 'break-mode');
      document.body.classList.remove('forest-focus-active');
      $pauseBtn.style.display = 'none';
      $startBtn.disabled = false;
      setOverlayA11y(false);
      $timerDisplay.textContent = fmtTime(state.duration * 60);
      renderTree(0, $treeContainer);
      setTimeout(() => { if (!state.session) renderTree(0, $overlayTreeContainer); }, 420);
      $timerStatus.textContent = '循环已结束';
      return;
    }
    if (!state.session) return;
    if (state.session.flexible) { stopFlexible(); return; }
    if (state.session.isBreak) { failSession('gave_up'); return; }
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
    const outcome = Core.abandonOutcome({
      elapsedMs: Core.elapsedMs(state.session, Date.now()),
      plannedMinutes: state.session.duration / 60000,
      phase: 'focus',
      target: state.revivalTargetId
        ? { kind: 'revival', treeId: state.revivalTargetId }
        : state.cultivateTargetId ? { kind: 'cultivate', treeId: state.cultivateTargetId } : null,
    });
    const ok = await showConfirm({ title: '结束本次专注？', message: outcome.message, okText: '结束本次', danger: true });
    if (!ok) {
      if (state.session && !state.paused) { tick(); tickInterval = setInterval(tick, 1000); }
      return;
    }
    failSession('gave_up', { elapsedMs: Core.elapsedMs(state.session, Date.now()), failedAt: Date.now() });
  });

  // ============ Page visibility / pagehide ============
  async function reconcileVisibleSession() {
    if (!state.session || state.paused) return;
    const now = Date.now();
    const decision = Core.resumeDecision(state.session, now);
    if (decision.action === 'complete') { completeSession({ completedAt: decision.completedAt, noAdvance: document.hidden }); return; }
    if (decision.action === 'fail-left-page') { failSession('left_page', { failedAt: decision.failedAt, elapsedMs: decision.elapsedMs }); return; }
    if (decision.action === 'reconcile-flexible') {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      const choice = await showChoice({
        title: '这段不限时专注离开较久',
        message: '请选择如何处理离开后的时间。不会自动把整晚算成专注。',
        choices: [
          { value: 'include', label: '计入离开时间' },
          { value: 'exclude', label: '排除离开时间并继续' },
          { value: 'stop', label: '按离开时收树' },
        ],
      });
      if (choice === 'stop') { stopFlexibleAt(decision.stopAt); return; }
      if (!choice) return;
      if (choice === 'exclude') {
        const gap = decision.gapMs || 0;
        state.session.runningSince += gap;
        state.session.startedAt += gap;
      }
    }
    state.leftAt = null;
    state.session = decorateRuntime(Core.markVisible(state.session, now), now);
    persistActive();
    tick();
    if (!tickInterval) tickInterval = setInterval(tick, 1000);
    acquireWakeLock();
  }
  document.addEventListener('visibilitychange', () => {
    if (!state.session || state.paused) return;
    if (document.hidden) {
      releaseWakeLock();
      const now = Date.now();
      state.leftAt = now;
      state.session = decorateRuntime(Core.markHidden(state.session, now), now);
      persistActive();
    } else reconcileVisibleSession();
  });
  window.addEventListener('pagehide', () => {
    if (!state.session || state.paused) return;
    releaseWakeLock();
    const now = Date.now();
    state.leftAt = now;
    state.session = decorateRuntime(Core.markHidden(state.session, now), now);
    persistActive();
  });

  // ============ Pomodoro toggle + 自定义休息 ============
  const $breakMin = document.getElementById('break-min');
  function syncBreakRow() {
    const r = document.getElementById('break-row');
    if (r) r.hidden = !($pomodoroOn && $pomodoroOn.checked);
    if ($cycleOptions) $cycleOptions.hidden = !($pomodoroOn && $pomodoroOn.checked);
  }
  $pomodoroOn.addEventListener('change', () => {
    state.pomodoroOn = $pomodoroOn.checked;
    syncBreakRow();
    savePrefs();
  });
  let breakTouched = false;   // 用户手动改过休息分钟后，切换专注时长不再覆盖它
  $breakMin.addEventListener('input', () => {
    const result = Core.validateMinutes($breakMin.value, 1, 60);
    $breakMin.setAttribute('aria-invalid', result.ok ? 'false' : 'true');
    if (result.ok) { state.breakMin = result.value; breakTouched = true; savePrefs(); }
    validateDurationUI();
  });
  function updatePomodoroHint() {
    // 切换专注时长时，自动建议一个对应的休息时长——但用户手动设过就不再覆盖
    if (breakTouched) return;
    const suggested = breakMinutesFor(state.duration);
    state.breakMin = suggested;
    $breakMin.value = suggested;
  }

  // ============ Settings UI ============
  function currentFieldName() {
    const field = state.fields.find((item) => item.id === state.activeFieldId);
    return field ? field.name : '我的田地';
  }

  function renderTargetFieldSelect() {
    if (!$targetFieldSelect) return;
    $targetFieldSelect.innerHTML = state.fields.map((field) => `<option value="${escapeHtml(field.id)}">${escapeHtml(field.name)}</option>`).join('');
    if (state.fields.some((field) => field.id === state.activeFieldId)) $targetFieldSelect.value = state.activeFieldId;
  }

  function validateDurationUI() {
    if (state.flexible) {
      $customMin.removeAttribute('aria-invalid');
      if ($customMinError) $customMinError.textContent = '';
      $startBtn.disabled = !!state.session || state.externalSessionReadonly;
      return true;
    }
    const customIsActive = $customMin.value.trim() !== '' && !Array.from($durationTabs).some((button) => button.classList.contains('active'));
    const result = Core.validateMinutes(customIsActive ? $customMin.value : state.duration, 1, 180);
    if (!result.ok) {
      $customMin.setAttribute('aria-invalid', 'true');
      if ($customMinError) $customMinError.textContent = result.reason === 'integer' ? '请输入整分钟' : '请输入 1–180 分钟';
      $startBtn.disabled = true;
      return false;
    }
    $customMin.removeAttribute('aria-invalid');
    if ($customMinError) $customMinError.textContent = '';
    if (customIsActive) state.duration = result.value;
    $startBtn.disabled = !!state.session || state.externalSessionReadonly;
    return true;
  }

  function updateSessionPreview() {
    if (!$sessionPreview) return;
    if (state.flexible) {
      $sessionPreview.textContent = `不限时 · 松树 · 种到「${currentFieldName()}」；离开超过 5 分钟后会询问如何结算`;
      validateDurationUI();
      return;
    }
    const target = state.revivalTargetId
      ? '灌溉目标并新种一棵'
      : state.cultivateTargetId ? '培养目标树' : `预计获得 ${state.duration} 经验`;
    $sessionPreview.textContent = `${state.duration} 分钟 · ${TREE_NAME[state.treeType] || '树'} · ${target} · 种到「${currentFieldName()}」`;
    validateDurationUI();
  }

  if ($targetFieldSelect) $targetFieldSelect.addEventListener('change', () => {
    if (state.session) return;
    if (!state.fields.some((field) => field.id === $targetFieldSelect.value)) return;
    state.activeFieldId = $targetFieldSelect.value;
    saveFields();
    renderFieldTabs();
    updateSessionPreview();
  });

  [$autoStartBreak, $autoStartFocus, $wakeLockOn, $soundOn, $vibrationOn].forEach((control) => {
    if (!control) return;
    control.addEventListener('change', () => {
      state.autoStartBreak = $autoStartBreak ? $autoStartBreak.checked : state.autoStartBreak;
      state.autoStartFocus = $autoStartFocus ? $autoStartFocus.checked : state.autoStartFocus;
      state.wakeLock = $wakeLockOn ? $wakeLockOn.checked : state.wakeLock;
      state.sound = $soundOn ? $soundOn.checked : state.sound;
      state.vibration = $vibrationOn ? $vibrationOn.checked : state.vibration;
      savePrefs();
    });
  });
  if ($notificationOn) $notificationOn.addEventListener('change', async () => {
    if ($notificationOn.checked && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) {}
    }
    state.notifications = $notificationOn.checked && 'Notification' in window && Notification.permission === 'granted';
    $notificationOn.checked = state.notifications;
    savePrefs();
  });

  // 灵活模式（∞）UI 同步：进入=锁松树/关番茄/正计时从 0；退出=还原
  function applyFlexibleUI() {
    const flex = !!state.flexible;
    if ($flexBtn) $flexBtn.classList.toggle('active', flex);
    if ($treeTypesEl) $treeTypesEl.classList.toggle('flex-locked', flex);
    if (flex) {
      $durationTabs.forEach(b => b.classList.remove('active'));
      if ($customMin) $customMin.value = '';
      state.treeType = 'pine';
      if ($pomodoroOn && $pomodoroOn.checked) { $pomodoroOn.checked = false; state.pomodoroOn = false; syncBreakRow(); }
    } else if (state.treeType === 'pine') {
      state.treeType = 'oak';   // 松树仅灵活模式专属
    }
    $treeTypes.forEach(b => b.classList.toggle('active', b.dataset.tree === state.treeType));
    if (!state.session) {
      $timerDisplay.textContent = flex ? '0:00' : fmtTime(state.duration * 60);
      if ($startBtn) $startBtn.textContent = flex ? '开始 · 不限时' : '开始种树';
      renderTree(0);
    }
    updateSessionPreview();
  }
  function exitFlexibleUI() {
    if (!state.flexible && !($flexBtn && $flexBtn.classList.contains('active'))) return;
    state.flexible = false;
    if ($flexBtn) $flexBtn.classList.remove('active');
    if ($treeTypesEl) $treeTypesEl.classList.remove('flex-locked');
    if ($startBtn && !state.session) $startBtn.textContent = '开始种树';
    if (state.treeType === 'pine') { state.treeType = 'oak'; $treeTypes.forEach(b => b.classList.toggle('active', b.dataset.tree === state.treeType)); }
  }
  $durationTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.session) return;
      exitFlexibleUI();
      $durationTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.duration = parseInt(btn.dataset.min, 10);
      $customMin.value = '';
      $timerDisplay.textContent = fmtTime(state.duration * 60);
      updatePomodoroHint();
      savePrefs();
      updateSessionPreview();
    });
  });
  $customMin.addEventListener('input', () => {
    if (state.session) return;
    exitFlexibleUI();
    // 一旦用户开始输入自定义值，就不再让旧预设保持“选中”；否则 200 之类的非法值
    // 会被 validateDurationUI 误判为仍在使用 30 分钟，既不报错也不禁用开始按钮。
    if ($customMin.value.trim() !== '') $durationTabs.forEach(b => b.classList.remove('active'));
    const result = Core.validateMinutes($customMin.value, 1, 180);
    if (result.ok) {
      state.duration = result.value;
      $timerDisplay.textContent = fmtTime(result.value * 60);
      updatePomodoroHint();
      savePrefs();
    }
    validateDurationUI();
    updateSessionPreview();
  });
  $treeTypes.forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.session) return;
      $treeTypes.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.treeType = btn.dataset.tree;
      renderTree(0);
      savePrefs();
      updateSessionPreview();
    });
  });
  if ($flexBtn) $flexBtn.addEventListener('click', () => {
    if (state.session) return;
    cancelRevival();
    cancelCultivate();
    state.flexible = true;
    applyFlexibleUI();
    updatePomodoroHint();
    savePrefs();
  });

  // ============ Stats + 田地视图 ============
  // 田地相关 DOM
  const $field = document.getElementById('field');
  const $editModeBtn = document.getElementById('edit-mode-btn');
  const $fieldHint = document.getElementById('field-hint');
  const $treeDetail = document.getElementById('tree-detail');
  const $forestSortSelect = document.getElementById('forest-sort-select');

  let editMode = false;
  let forestSort = 'manual';
  let openDetailId = null;
  let detailScrollGuardUntil = 0;
  let detailInvoker = null;
  let $snapPreview = null;  // 拖动时的目标 cell 预览
  const treeNodeCache = new Map();
  let dragState = null;

  // 树悬浮备注：单例 tooltip，getBoundingClientRect + 视口夹取，绝不出框
  const _canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
  let _treeTip = null;
  function showTreeTip(el, text) {
    if (!_treeTip) {
      _treeTip = document.createElement('div');
      _treeTip.className = 'tree-hover-tip';
      document.body.appendChild(_treeTip);
    }
    _treeTip.textContent = text;
    _treeTip.style.display = 'block';
    const r = el.getBoundingClientRect();
    const tw = _treeTip.offsetWidth, th = _treeTip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));   // 水平夹在视口内
    let top = r.top - th - 8;
    if (top < 8) top = r.bottom + 8;                                  // 上方放不下 → 放树下方
    _treeTip.style.left = left + 'px';
    _treeTip.style.top = top + 'px';
    _treeTip.classList.add('show');
  }
  function hideTreeTip() {
    if (_treeTip) { _treeTip.classList.remove('show'); _treeTip.style.display = 'none'; }
  }

  let _justPlantedId = null;   // 刚种成的树：下次渲染田地时做一次 pop-in
  let _lastFieldWidth = 0;   // 森林视图隐藏时 clientWidth=0，退回上次真实量到的宽度

  function fieldViewport() {
    return {
      width: Math.max(1, $field.clientWidth || _lastFieldWidth || 1200),
      height: Math.max(1, $field.clientHeight || 620),
    };
  }

  const CANONICAL_COLUMNS = 12;

  function ensurePositions() {
    const density = Layout.densityProfile(state.trees.length);
    const input = state.trees.map((tree) => Object.assign({}, tree, { tier: effectiveTier(tree), densityScale: density.footprintScale, assetWidth: density.assetBase, assetHeight: density.assetBase }));
    const migrated = Layout.migrateLegacyPositions(input, CANONICAL_COLUMNS, { scene: 'forest' });
    let changed = false;
    state.trees = migrated.map((tree, index) => {
      const previous = state.trees[index];
      if (JSON.stringify(previous.position3d || null) !== JSON.stringify(tree.position3d || null)) changed = true;
      const next = Object.assign({}, tree);
      if (!Object.prototype.hasOwnProperty.call(previous, 'tier')) delete next.tier;
      delete next.densityScale; delete next.assetWidth; delete next.assetHeight;
      return next;
    });
    if (changed) saveTrees();
  }

  function assignNewPosition(newTree) {
    const fieldId = newTree.fieldId || state.activeFieldId;
    newTree.fieldId = fieldId;
    const density = Layout.densityProfile(state.trees.filter((tree) => tree.fieldId === fieldId).length + 1);
    const occupied = state.trees.filter((tree) => tree.fieldId === fieldId).map((tree) => Object.assign({}, tree, { tier: effectiveTier(tree), densityScale: density.footprintScale, assetWidth: density.assetBase, assetHeight: density.assetBase }));
    newTree.position3d = Layout.allocatePosition(Object.assign({}, newTree, { tier: effectiveTier(newTree), densityScale: density.footprintScale, assetWidth: density.assetBase, assetHeight: density.assetBase }), occupied, {
      scene: 'forest',
      viewport: fieldViewport(),
    });
  }

  function renderStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7));

    function compactMinutes(value) {
      const minutes = Math.max(0, Math.round(value || 0));
      if (minutes < 60) return `${minutes} 分`;
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest ? `${hours} 时 ${rest} 分` : `${hours} 小时`;
    }

    // 统计只纳入完成/手动专注；失败记录仍留在历史，但不冒充成果。
    const completed = state.sessions.filter((session) => !session.outcome || ['planted', 'manual', 'revived', 'cultivated', 'completed'].includes(session.outcome));
    $statToday.textContent = compactMinutes(completed.filter(s => s.endTime >= startOfToday.getTime()).reduce((sum, s) => sum + (s.minutes || 0), 0));
    $statWeek.textContent = compactMinutes(completed.filter(s => s.endTime >= startOfWeek.getTime()).reduce((sum, s) => sum + (s.minutes || 0), 0));
    $statTotalMin.textContent = compactMinutes(completed.reduce((sum, s) => sum + (s.minutes || 0), 0));

    // 田地
    ensurePositions();
    renderField();
    // 同步 tabs 计数（如果 tabs 已渲染）
    if (document.getElementById('field-tabs') && document.getElementById('field-tabs').children.length > 0) {
      renderFieldTabs();
    }
    // 经验值图表
    if (typeof renderExpChart === 'function') renderExpChart();
  }

  function createTreeNode(tree) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-instance';
    wrapper.dataset.id = tree.id;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'tree-open';
    open.setAttribute('aria-controls', 'tree-detail');
    open.setAttribute('aria-expanded', 'false');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-x';
    remove.textContent = '×';
    wrapper.append(open, remove);
    treeNodeCache.set(tree.id, wrapper);
    return wrapper;
  }

  function patchTreeNode(node, tree, geometry) {
    const tier = tree.success ? effectiveTier(tree) : 1;
    const selected = editMode && state.selectedIds.includes(tree.id);
    node.className = 'tree-instance' + (tree.success ? '' : ' dead')
      + (tree.id === _justPlantedId ? ' just-planted' : '')
      + (tree.manual ? ' manual' : '')
      + (selected ? ' msel' : '');
    node.dataset.tier = String(tier);
    node.style.width = `${geometry.width}px`;
    node.style.height = `${geometry.height}px`;
    node.style.left = `${geometry.x}px`;
    node.style.top = `${geometry.y}px`;
    node.style.zIndex = String(geometry.zIndex);
    node.dataset.worldU = geometry.position.u.toFixed(5);
    node.dataset.worldV = geometry.position.v.toFixed(5);
    node.dataset.worldX = geometry.position.x.toFixed(5);
    node.dataset.worldY = geometry.position.y.toFixed(5);
    node.dataset.worldZ = geometry.position.z.toFixed(5);
    node.style.setProperty('--tree-depth', geometry.depth.toFixed(4));
    node.style.setProperty('--tree-scale', geometry.scale.toFixed(4));
    const open = node.querySelector('.tree-open');
    const remove = node.querySelector('.delete-x');
    const visualKey = [tree.type, tier, tree.success, Math.round(tree.success ? treeValue(tree) : 0)].join(':');
    if (open.dataset.visualKey !== visualKey) {
      open.innerHTML = buildFieldTreeSvg(tree.type, tier, !tree.success, tree.success ? treeValue(tree) : 0);
      open.dataset.visualKey = visualKey;
    }
    const plantedAt = new Date(tree.endTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const taskLabel = String(tree.task || '').trim() || '未填写任务';
    const focusMinutes = tree.success ? Math.round(tree.durationMinutes || treeValue(tree) || 0) : Math.round(tree.attemptedMinutes || 0);
    const revived = tree.success && !tree.origin && tree.revivalDiscount && tree.revivalDiscount < 1;
    const tip = tree.success
      ? `${TREE_NAME[tree.type]} · ${taskLabel} · ${plantedAt} · ${focusMinutes} 分钟${revived ? ' · 灌溉复活' : ''}`
      : `${TREE_NAME[tree.type]}（枯萎）· ${taskLabel} · ${plantedAt} · 坚持 ${focusMinutes} 分钟`;
    node.dataset.tip = tip;
    open.setAttribute('aria-label', `${tip}，打开详情`);
    open.setAttribute('aria-expanded', openDetailId === tree.id ? 'true' : 'false');
    remove.setAttribute('aria-label', `铲除${tree.success ? TREE_NAME[tree.type] : '这棵枯树'}`);
    remove.hidden = !editMode;
  }

  function renderField() {
    const view = document.getElementById('view-forest');
    if (view && view.hidden) return;
    const trees = activeFieldTrees();
    const allIds = new Set(state.trees.map((tree) => tree.id));
    treeNodeCache.forEach((node, id) => {
      if (!allIds.has(id)) { node.remove(); treeNodeCache.delete(id); }
      else if (!trees.some((tree) => tree.id === id)) node.remove();
    });
    if (!trees.length) {
      $field.style.display = '';
      $field.style.height = '';
      $field.classList.add('is-empty');
      $emptyForest.style.display = '';
      $forestMeta.textContent = '';
      hideDetail();
      return;
    }
    $field.classList.remove('is-empty');
    $emptyForest.style.display = 'none';
    $field.style.display = '';
    const total = trees.length;
    const dead = trees.filter((tree) => !tree.success).length;
    const grand = trees.filter((tree) => tree.success && effectiveTier(tree) === 4).length;
    const metaParts = [`${total} 棵树`];
    if (dead) metaParts.push(`枯萎 ${dead}`);
    if (grand) metaParts.push(`巨树 ${grand}`);
    $forestMeta.textContent = metaParts.join(' · ');

    let displayTrees = trees;
    if (forestSort !== 'manual') {
      const sign = forestSort === 'oldest' || forestSort === 'duration-asc' ? 1 : -1;
      displayTrees = trees.slice().sort((a, b) => {
        if (forestSort === 'newest' || forestSort === 'oldest') return sign * ((a.endTime || 0) - (b.endTime || 0));
        const av = a.success ? treeValue(a) : (a.attemptedMinutes || 0);
        const bv = b.success ? treeValue(b) : (b.attemptedMinutes || 0);
        return sign * (av - bv) || ((b.endTime || 0) - (a.endTime || 0));
      });
    }
    const viewport = fieldViewport();
    const density = Layout.densityProfile(trees.length);
    const densityBase = density.assetBase;
    let layoutInput;
    if (forestSort === 'manual') {
      layoutInput = displayTrees.map((tree) => Object.assign({}, tree, {
        tier: effectiveTier(tree),
        densityScale: density.footprintScale,
        assetWidth: densityBase,
        assetHeight: densityBase,
      }));
    } else {
      const occupied = [];
      layoutInput = displayTrees.map((tree, index) => {
        const layoutTree = Object.assign({}, tree, {
          id: `${forestSort}-${index}`,
          tier: effectiveTier(tree),
          densityScale: density.footprintScale,
          assetWidth: densityBase,
          assetHeight: densityBase,
        });
        const position3d = Layout.allocatePosition(layoutTree, occupied, { scene: 'forest', viewport });
        const assigned = Object.assign({}, tree, layoutTree, { id: tree.id, position3d });
        occupied.push(assigned);
        return assigned;
      });
    }
    const layouts = Layout.layoutTrees(layoutInput, { scene: 'forest', viewport });
    $field.style.height = '';
    const grid = $field.querySelector('.field-cell-grid');
    if (grid) grid.style.backgroundSize = '';
    if (!$snapPreview) {
      $snapPreview = document.createElement('div');
      $snapPreview.className = 'snap-preview';
      $field.appendChild($snapPreview);
    }
    layouts.forEach((geometry) => {
      const tree = geometry.tree;
      const node = treeNodeCache.get(tree.id) || createTreeNode(tree);
      patchTreeNode(node, tree, geometry);
      $field.appendChild(node);
    });
    $field.appendChild($snapPreview);
    _justPlantedId = null;
  }

  async function deleteTree(id) {
    const t = state.trees.find(x => x.id === id);
    if (!t) return;
    const label = t.success ? `${TREE_NAME[t.type]}（${t.origin ? '约 ' + Math.round(treeValue(t)) : t.durationMinutes} 分）` : `枯萎的${TREE_NAME[t.type]}`;
    const ok = await showConfirm({
      title: t.success ? '铲除这棵树？' : '铲除这棵枯树？',
      message: '会移入“最近删除”，7 天内可以恢复；之后才从恢复列表清除。',
      okText: '铲除', danger: true,
    });
    if (!ok) return;
    if (state.revivalTargetId === id) cancelRevival();  // 正准备灌溉这棵则先取消
    if (state.cultivateTargetId === id) cancelCultivate();
    const si = state.selectedIds.indexOf(id); if (si >= 0) state.selectedIds.splice(si, 1);
    const snapshot = t;
    state.trees = state.trees.filter(x => x.id !== id);
    moveToTrash('tree', snapshot, label, id);
    hideDetail();
    renderFieldTabs();
    renderStats();
  }

  // ============ 灌溉机制 ============
  const $revivalBanner = document.getElementById('revival-banner');
  function captureActivityDraft() {
    if (state.activityReturnDraft) return;
    state.activityReturnDraft = {
      duration: state.duration,
      treeType: state.treeType,
      flexible: state.flexible,
      pomodoroOn: state.pomodoroOn,
      customValue: $customMin.value,
      activeDuration: Array.from($durationTabs).find((button) => button.classList.contains('active'))?.dataset.min || null,
    };
  }
  function restoreActivityDraft() {
    const draft = state.activityReturnDraft;
    state.activityReturnDraft = null;
    if (!draft) { updateSessionPreview(); return; }
    state.duration = draft.duration;
    state.treeType = draft.treeType;
    state.flexible = draft.flexible;
    state.pomodoroOn = draft.pomodoroOn;
    if ($pomodoroOn) $pomodoroOn.checked = draft.pomodoroOn;
    $customMin.value = draft.customValue || '';
    $durationTabs.forEach((button) => button.classList.toggle('active', !!draft.activeDuration && button.dataset.min === draft.activeDuration));
    $treeTypes.forEach((button) => button.classList.toggle('active', button.dataset.tree === state.treeType));
    syncBreakRow();
    applyFlexibleUI();
    updateSessionPreview();
  }
  function revivalCostFor(tree) {
    // 用原目标时长（durationMinutes 在枯萎树上保留为原 target）
    return Math.max(1, Math.round(tree.durationMinutes || 25));
  }
  function queueRevival(treeId) {
    const t = state.trees.find(x => x.id === treeId);
    if (!t || t.success) return;
    cancelCultivate();                     // 与培养互斥
    captureActivityDraft();
    exitFlexibleUI();
    state.pomodoroOn = false;
    if ($pomodoroOn) $pomodoroOn.checked = false;
    syncBreakRow();
    state.revivalTargetId = treeId;
    const cost = revivalCostFor(t);
    state.duration = cost;
    $timerDisplay.textContent = fmtTime(cost * 60);
    // 选中对应的 duration tab（如果匹配）
    $durationTabs.forEach(b => b.classList.toggle('active', parseInt(b.dataset.min, 10) === cost));
    if (!Array.from($durationTabs).some(b => b.classList.contains('active'))) {
      $customMin.value = cost;
    }
    // 展示 banner（只留状态短句；完整规则在详情 popover 里讲）
    $revivalBanner.innerHTML = `
      灌溉 <strong>${TREE_NAME[t.type]}</strong>：完成 <strong>${cost} 分钟</strong>专注即可复活
      <button type="button" class="cancel-revival" id="cancel-revival">取消</button>
    `;
    $revivalBanner.classList.add('visible');
    document.getElementById('cancel-revival').addEventListener('click', cancelRevival);
    // 时长锁定：禁用 duration tabs + custom min
    $durationTabs.forEach(b => b.disabled = true);
    $customMin.disabled = true;
    // 修改 startBtn 文案
    $startBtn.textContent = `开始灌溉（${cost} 分）`;
    updateSessionPreview();
    queueStoreSave('queue-revival');
    // 从森林视图发起时先切回种树视图，再滚到设置区
    goPlantView(() => $revivalBanner.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
  function cancelRevival() {
    if (!state.revivalTargetId) return;
    state.revivalTargetId = null;
    $revivalBanner.classList.remove('visible');
    $revivalBanner.innerHTML = '';
    $durationTabs.forEach(b => b.disabled = false);
    $customMin.disabled = false;
    $startBtn.textContent = '开始种树';
    restoreActivityDraft();
    savePrefs();
    queueStoreSave('cancel-revival');
  }

  // ============ 培养机制（挑一棵成活树，下一次专注并入它，×0.9）============
  function queueCultivate(treeId) {
    const t = state.trees.find(x => x.id === treeId);
    if (!t || !t.success) return;
    cancelRevival();                       // 与灌溉互斥
    captureActivityDraft();
    exitFlexibleUI();
    state.cultivateTargetId = treeId;
    const cur = Math.round(treeValue(t));
    // 培养不锁时长——用户自选专注多久，完成后按 (原值 + 本次分钟) × 0.9 升级
    $revivalBanner.innerHTML = `
      培养 <strong>${TREE_NAME[t.type]}</strong>（现约 ${cur} 分）：预计完成后约 <strong>${Core.cultivationValue(cur, state.duration)} 分</strong>，不会缩水
      <button type="button" class="cancel-revival" id="cancel-cultivate">取消</button>
    `;
    $revivalBanner.classList.add('visible');
    document.getElementById('cancel-cultivate').addEventListener('click', cancelCultivate);
    $startBtn.textContent = '开始培养';
    updateSessionPreview();
    queueStoreSave('queue-cultivate');
    goPlantView(() => $revivalBanner.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }
  function cancelCultivate() {
    if (!state.cultivateTargetId) return;
    state.cultivateTargetId = null;
    $revivalBanner.classList.remove('visible');
    $revivalBanner.innerHTML = '';
    $startBtn.textContent = '开始种树';
    restoreActivityDraft();
    savePrefs();
    queueStoreSave('cancel-cultivate');
  }

  // ============ 拖动 + 点击 ============
  function layoutTreeAt(tree, position3d) {
    const density = Layout.densityProfile(activeFieldTrees().length);
    return Layout.layoutTrees([Object.assign({}, tree, {
      tier: effectiveTier(tree), position3d, densityScale: density.footprintScale, assetWidth: density.assetBase, assetHeight: density.assetBase,
    })], { scene: 'forest', viewport: fieldViewport() })[0];
  }

  function validateWorldPosition(tree, position3d) {
    const density = Layout.densityProfile(activeFieldTrees().length);
    const occupied = activeFieldTrees().filter((item) => item.id !== tree.id).map((item) => Object.assign({}, item, { tier: effectiveTier(item), densityScale: density.footprintScale, assetWidth: density.assetBase, assetHeight: density.assetBase }));
    const root = Layout.rootClearance(position3d, occupied, tree.type, effectiveTier(tree), density.footprintScale, 'forest');
    const canopy = Layout.canopyConflict(Object.assign({}, tree, {
      tier: effectiveTier(tree), position3d, densityScale: density.footprintScale, assetWidth: density.assetBase, assetHeight: density.assetBase,
    }), occupied, { scene: 'forest', viewport: fieldViewport() });
    return { legal: root.legal && !canopy.hard, root, canopy };
  }

  function showSnapPreview(tree, position3d, validation) {
    if (!$snapPreview) return;
    const geometry = layoutTreeAt(tree, position3d);
    const meta = Layout.plantMeta(tree.type);
    const rx = Math.max(14, geometry.width * meta.footprintX * 1.3);
    const ry = Math.max(7, geometry.height * meta.footprintZ * 1.8);
    $snapPreview.style.left = `${geometry.rootX - rx}px`;
    $snapPreview.style.top = `${geometry.rootY - ry}px`;
    $snapPreview.style.width = `${rx * 2}px`;
    $snapPreview.style.height = `${ry * 2}px`;
    $snapPreview.classList.toggle('blocked', !validation.legal);
    $snapPreview.classList.add('visible');
  }
  function hideSnapPreview() {
    if (!$snapPreview) return;
    $snapPreview.classList.remove('visible', 'blocked');
  }

  function moveTreeByKeyboard(treeId, dx, dy) {
    const tree = state.trees.find((item) => item.id === treeId);
    if (!tree) return;
    const current = Layout.normalizeWorldPosition(tree.position3d, tree.id);
    const target = Layout.normalizeWorldPosition({ u: current.u + dx * 0.025, v: current.v + dy * 0.025, seed: current.seed }, tree.id);
    const validation = validateWorldPosition(tree, target);
    if (!validation.legal) { showToast('这个位置与另一棵树的根区或树冠冲突'); return; }
    tree.position3d = target;
    saveTrees();
    renderField();
    $fieldHint.textContent = `${TREE_NAME[tree.type]}已移动`;
    treeNodeCache.get(tree.id)?.querySelector('.tree-open')?.focus();
  }

  $field.addEventListener('click', (event) => {
    const wrapper = event.target.closest('.tree-instance');
    if (!wrapper) return;
    if (dragState && dragState.suppressClick) { event.preventDefault(); dragState = null; return; }
    if (event.target.closest('.delete-x')) { event.stopPropagation(); deleteTree(wrapper.dataset.id); return; }
    if (event.target.closest('.tree-open')) {
      if (editMode) toggleMergeSelect(wrapper.dataset.id);
      else showDetail(wrapper.dataset.id, event.target.closest('.tree-open'));
    }
  });
  $field.addEventListener('keydown', (event) => {
    const open = event.target.closest('.tree-open');
    if (!open || !editMode || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    moveTreeByKeyboard(open.closest('.tree-instance').dataset.id, event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0, event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
  });
  if (_canHover) {
    $field.addEventListener('pointerover', (event) => {
      const node = event.target.closest('.tree-instance');
      if (node && !node.classList.contains('dragging')) showTreeTip(node, node.dataset.tip);
    });
    $field.addEventListener('pointerout', (event) => { if (event.target.closest('.tree-instance')) hideTreeTip(); });
  }
  $field.addEventListener('pointerdown', (event) => {
    const open = event.target.closest('.tree-open');
    if (!open || !editMode || event.button !== 0) return;
    const node = open.closest('.tree-instance');
    const tree = state.trees.find((item) => item.id === node.dataset.id);
    if (!tree) return;
    dragState = {
      pointerId: event.pointerId, node, treeId: node.dataset.id, startX: event.clientX, startY: event.clientY,
      startPosition: Layout.normalizeWorldPosition(tree.position3d, tree.id),
      previewPosition: null, legal: false, dragging: false, suppressClick: false,
    };
    node.setPointerCapture(event.pointerId);
  });
  $field.addEventListener('pointermove', (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.dragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) { dragState.dragging = true; dragState.node.classList.add('dragging'); hideDetail(); hideTreeTip(); }
    if (!dragState.dragging) return;
    event.preventDefault();
    const rect = $field.getBoundingClientRect();
    const tree = state.trees.find((item) => item.id === dragState.treeId);
    if (!tree) return;
    const target = Layout.inverseFromViewport('forest', { x: event.clientX - rect.left, y: event.clientY - rect.top }, fieldViewport(), tree.id);
    const validation = validateWorldPosition(tree, target);
    dragState.previewPosition = target;
    dragState.legal = validation.legal;
    patchTreeNode(dragState.node, tree, layoutTreeAt(tree, target));
    showSnapPreview(tree, target, validation);
  });
  function finishFieldPointer(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const current = dragState;
    if (current.node.hasPointerCapture(current.pointerId)) current.node.releasePointerCapture(current.pointerId);
    if (current.dragging) {
      current.node.classList.remove('dragging'); hideSnapPreview();
      const tree = state.trees.find((item) => item.id === current.treeId);
      if (tree && current.legal && current.previewPosition) { tree.position3d = current.previewPosition; saveTrees(); }
      renderField();
      current.suppressClick = true; dragState = current;
      setTimeout(() => { if (dragState === current) dragState = null; }, 0);
    } else dragState = null;
  }
  $field.addEventListener('pointerup', finishFieldPointer);
  $field.addEventListener('pointercancel', finishFieldPointer);

  // ============ 详情 popover ============
  function showDetail(treeId, anchorEl) {
    const t = state.trees.find(x => x.id === treeId);
    if (!t) return;
    const tier = t.success ? effectiveTier(t) : 0;
    const date = new Date(t.endTime).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const startDate = new Date(t.startTime).toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit',
    });
    const endDate = new Date(t.endTime).toLocaleTimeString('zh-CN', {
      hour: '2-digit', minute: '2-digit',
    });
    const taskRow = t.task ? `
      <div class="td-row"><span class="label">任务</span><span class="value">${escapeHtml(t.task)}</span></div>
    ` : '';
    const isRevived = t.success && !t.origin && t.revivalDiscount && t.revivalDiscount < 1;
    const originName = t.origin === 'merge' ? '合并而成' : t.origin === 'cultivate' ? '培养长成' : '';
    const statusRow = t.success
      ? `<div class="td-row"><span class="label">树形</span><span class="value">${TREE_NAME[t.type]} <span class="tier-badge tier-${tier}">${_gradeName(treeValue(t))}</span>${isRevived ? ' <span class="tier-badge" style="background: var(--ft-gold-soft); color: var(--ft-gold-ink);">灌溉复活</span>' : ''}${t.origin ? ` <span class="tier-badge" style="background: var(--ft-gold-soft); color: var(--ft-gold-ink);">${originName}</span>` : ''}${t.manual ? ' <span class="tier-badge" style="background: var(--color-bg-warm); color: var(--color-muted);">手动补种</span>' : ''}${t.flex ? ' <span class="tier-badge" style="background: var(--color-bg-warm); color: var(--color-muted);">灵活</span>' : ''}</span></div>`
      : `<div class="td-row"><span class="label">状态</span><span class="value" style="color: var(--ft-danger);">已枯萎</span></div>`;
    const durationRow = t.success
      ? (t.origin
          ? `<div class="td-row"><span class="label">等效</span><span class="value"><strong>约 ${Math.round(treeValue(t))} 分</strong>专注</span></div>`
          : `<div class="td-row"><span class="label">专注</span><span class="value"><strong>${t.durationMinutes} 分钟</strong>${isRevived ? '（曾坚持时长）' : ''}</span></div>`)
      : `<div class="td-row"><span class="label">专注</span><span class="value">坚持了 ${t.attemptedMinutes || 0} 分（目标 ${t.durationMinutes} 分）</span></div>`;
    const bonusRow = t.success && !t.origin && t.cycleBonus && t.cycleBonus > 1
      ? `<div class="td-row"><span class="label">加成</span><span class="value" style="color: var(--ft-gold-ink);"><strong>×${t.cycleBonus}</strong>${t.cycleNum ? ` · 循环第 ${t.cycleNum} 个` : ''}</span></div>`
      : '';
    const discountRow = isRevived
      ? `<div class="td-row"><span class="label">折扣</span><span class="value" style="color: var(--ft-gold-ink);"><strong>×${t.revivalDiscount}</strong> · 灌溉复活</span></div>`
      : '';
    const expRow = t.success
      ? `<div class="td-row"><span class="label">经验</span><span class="value">${treeExp(t).toFixed(1)} 点</span></div>`
      : '';

    // 操作按钮：枯萎树 → 灌溉；正常树 → 培养 / 铲除
    const actionsHtml = t.success
      ? `<button type="button" id="td-cultivate" style="background: var(--ft-gold-soft); border-color: var(--ft-gold); color: var(--ft-gold-ink); font-weight: 600;">继续培养</button>
         <button type="button" class="danger" id="td-delete">铲除</button>
         <button type="button" id="td-close">关闭</button>`
      : `<button type="button" id="td-revive" style="background: var(--ft-gold-soft); border-color: var(--ft-gold); color: var(--ft-gold-ink); font-weight: 600;">灌溉这棵（${revivalCostFor(t)} 分）</button>
         <button type="button" class="danger" id="td-delete">铲除</button>
         <button type="button" id="td-close">关闭</button>`;

    const historyAction = t.createdBySessionId ? '<button type="button" id="td-history">查看对应专注</button>' : '';
    const revivalHint = !t.success
      ? `<div style="margin-top: 0.6rem; padding: 0.55rem 0.7rem; background: var(--color-bg-warm); border-radius: var(--ft-r-xs); font-size: var(--ft-fs-cap); color: var(--color-muted); line-height: 1.5;">
          完成 <strong style="color: var(--color-ink);">${revivalCostFor(t)} 分钟</strong>专注即可复活：这棵变回 <strong style="color: var(--color-ink);">×0.5 折扣</strong>形态，同时新种一棵 ${revivalCostFor(t)} 分树。不想留着也可以直接铲除。
        </div>`
      : '';

    const moveActions = editMode ? '<div class="td-move" aria-label="移动树"><button type="button" data-move="up">上移</button><button type="button" data-move="left">左移</button><button type="button" data-move="right">右移</button><button type="button" data-move="down">下移</button></div>' : '';
    $treeDetail.setAttribute('role', 'dialog');
    $treeDetail.setAttribute('aria-labelledby', 'tree-detail-title');
    $treeDetail.setAttribute('tabindex', '-1');
    $treeDetail.innerHTML = `
      <h3 id="tree-detail-title">${escapeHtml(TREE_NAME[t.type] || '树')}详情</h3>
      ${statusRow}
      ${durationRow}
      ${bonusRow}
      ${discountRow}
      ${expRow}
      <div class="td-row"><span class="label">时间</span><span class="value">${startDate}–${endDate}</span></div>
      <div class="td-row"><span class="label">日期</span><span class="value">${date.split(' ')[0]}</span></div>
      ${taskRow}
      ${revivalHint}
      ${moveActions}
      <div class="td-actions">
        ${historyAction}
        ${actionsHtml}
      </div>
    `;

    // 定位：先让弹窗可测量（不可见），按真实尺寸放上/下方，并避开底部安全区
    $treeDetail.style.visibility = 'hidden';
    $treeDetail.classList.add('open');
    const rect = anchorEl.getBoundingClientRect();
    const popH = $treeDetail.offsetHeight;
    const popW = $treeDetail.offsetWidth;
    const margin = 12;
    const safeB = safeAreaBottom();
    let top = rect.top - popH - 8;
    if (top < margin) top = rect.bottom + 8;                  // 上方放不下 → 放下方
    const maxTop = window.innerHeight - popH - margin - safeB;
    if (top > maxTop) top = Math.max(margin, maxTop);         // 下方顶出视口 → 钳回（含安全区）
    let left = rect.left + rect.width / 2 - popW / 2;
    left = Math.max(margin, Math.min(window.innerWidth - popW - margin, left));
    $treeDetail.style.top = top + 'px';
    $treeDetail.style.left = left + 'px';
    $treeDetail.style.visibility = '';
    openDetailId = treeId;
    detailInvoker = anchorEl;
    anchorEl.setAttribute('aria-expanded', 'true');

    const $tdDelete = document.getElementById('td-delete');
    if ($tdDelete) $tdDelete.addEventListener('click', () => deleteTree(treeId));
    const $tdRevive = document.getElementById('td-revive');
    if ($tdRevive) $tdRevive.addEventListener('click', () => {
      queueRevival(treeId);
      hideDetail();
    });
    const $tdCultivate = document.getElementById('td-cultivate');
    if ($tdCultivate) $tdCultivate.addEventListener('click', () => {
      queueCultivate(treeId);
      hideDetail();
    });
    const historyButton = document.getElementById('td-history');
    if (historyButton) historyButton.addEventListener('click', () => {
      historyHighlightId = t.createdBySessionId;
      hideDetail(false);
      const panel = document.getElementById('history-panel');
      panel.hidden = false;
      document.getElementById('history-toggle')?.setAttribute('aria-expanded', 'true');
      renderHistory();
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('td-close').addEventListener('click', hideDetail);
    $treeDetail.querySelectorAll('[data-move]').forEach((button) => button.addEventListener('click', () => {
      const delta = button.dataset.move;
      moveTreeByKeyboard(treeId, delta === 'left' ? -1 : delta === 'right' ? 1 : 0, delta === 'up' ? -1 : delta === 'down' ? 1 : 0);
      hideDetail();
    }));
    setTimeout(() => { const first = $treeDetail.querySelector('button'); if (first) first.focus(); }, 0);
    // fixed 弹窗不跟随滚动 → 页面一滚就关，避免浮在半空指错树
    window.addEventListener('scroll', hideDetailOnScroll, { passive: true });
  }

  function hideDetail(restoreFocus = true) {
    $treeDetail.classList.remove('open');
    if (detailInvoker) detailInvoker.setAttribute('aria-expanded', 'false');
    if (restoreFocus && detailInvoker && detailInvoker.isConnected) detailInvoker.focus();
    detailInvoker = null;
    openDetailId = null;
    window.removeEventListener('scroll', hideDetailOnScroll);
  }
  function hideDetailOnScroll() {
    if (performance.now() < detailScrollGuardUntil) return;
    hideDetail(false);
  }

  document.addEventListener('click', e => {
    if (!openDetailId) return;
    if (e.target.closest('.tree-detail') || e.target.closest('.tree-instance')) return;
    hideDetail();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openDetailId) { event.preventDefault(); hideDetail(); }
  });

  // ============ Edit mode toggle ============
  // ============ 合并（整理模式勾选两棵以上 → 合成一棵，×0.8）============
  const $mergeBtn = document.getElementById('merge-btn');
  function toggleMergeSelect(id) {
    const t = state.trees.find(x => x.id === id);
    if (!t || !t.success) return;   // 只有成活的树能合并
    const i = state.selectedIds.indexOf(id);
    if (i >= 0) state.selectedIds.splice(i, 1);
    else state.selectedIds.push(id);
    renderField();
    updateMergeBtn();
  }
  function updateMergeBtn() {
    if (!$mergeBtn) return;
    const n = state.selectedIds.length;
    if (editMode && n >= 2) { $mergeBtn.style.display = ''; $mergeBtn.textContent = `合并 ${n} 棵`; }
    else $mergeBtn.style.display = 'none';
  }
  async function mergeSelected() {
    const picks = state.selectedIds.map(id => state.trees.find(t => t.id === id && t.success)).filter(Boolean);
    if (picks.length < 2) return;
    const sum = picks.reduce((acc, t) => acc + treeValue(t), 0);
    const newVal = Math.round(sum * 0.8);
    const first = picks[0];
    const ok = await showConfirm({
      title: `合并 ${picks.length} 棵树？`,
      message: `合成一棵约 <strong>${newVal} 分</strong>的${TREE_NAME[first.type]}（${picks.length} 棵之和 ×0.8）。原来的树会消失；累计专注和经验曲线不受影响。`,
      okText: '合并',
    });
    if (!ok) return;
    const merged = {
      id: 'tr-' + Date.now().toString(36),
      type: first.type,
      value: newVal,
      origin: 'merge',
      endTime: Date.now(),
      success: true,
      fieldId: first.fieldId,
      position: first.position,
      position3d: first.position3d,
      lineage: { sourceTreeIds: picks.map((tree) => tree.id) },
      updatedAt: Date.now(),
    };
    const ids = new Set(state.selectedIds);
    picks.forEach((tree) => addSyncTombstone('tree', tree.id, merged.updatedAt));
    state.trees = state.trees.filter(t => !ids.has(t.id));
    state.trees.push(merged);
    _justPlantedId = merged.id;
    state.selectedIds = [];
    saveTrees();
    updateMergeBtn();
    hideDetail();
    renderFieldTabs();
    renderStats();
    showToast(`合并成一棵约 ${newVal} 分的${TREE_NAME[merged.type]}（${_gradeName(newVal)}）`);
  }
  if ($mergeBtn) $mergeBtn.addEventListener('click', mergeSelected);

  if ($forestSortSelect) {
    $forestSortSelect.addEventListener('change', () => {
      forestSort = $forestSortSelect.value || 'manual';
      if (editMode && forestSort !== 'manual') {
        editMode = false;
        $field.classList.remove('edit-mode');
        $editModeBtn.classList.remove('active');
        $editModeBtn.textContent = '整理树木';
        state.selectedIds = [];
        updateMergeBtn();
      }
      hideDetail();
      renderField();
    });
  }

  $editModeBtn.addEventListener('click', () => {
    if (forestSort !== 'manual') {
      forestSort = 'manual';
      if ($forestSortSelect) $forestSortSelect.value = 'manual';
    }
    editMode = !editMode;
    $field.classList.toggle('edit-mode', editMode);
    $editModeBtn.classList.toggle('active', editMode);
    $editModeBtn.textContent = editMode ? '完成整理' : '整理树木';
    $fieldHint.textContent = editMode
      ? '拖动挪位置 · 点 × 铲除 · 点选两棵可合并'
      : '点击查看详情 · 拖动挪位置';
    state.selectedIds = [];       // 进出整理都清空勾选
    updateMergeBtn();
    hideDetail();
    renderField();
  });

  // 宽度变化只在下一动画帧 patch 几何；不重建未变化的树节点。
  let resizeRenderFrame = 0;
  function scheduleForestGeometry() {
    if (resizeRenderFrame) return;
    resizeRenderFrame = requestAnimationFrame(() => {
      resizeRenderFrame = 0;
      if (state.trees.length) renderField();
      const view = document.getElementById('view-forest');
      if (view && !view.hidden) renderExpChart();
      positionSingleTreeTargets();
    });
  }
  window.addEventListener('resize', scheduleForestGeometry, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(scheduleForestGeometry).observe($field);

  function renderAfterExternalData() {
    const externalLeaseOwner = Core.leaseOwner(forestStore.readLease(), Date.now());
    state.externalSessionReadonly = !!(forestSnapshot && forestSnapshot.active && externalLeaseOwner && externalLeaseOwner !== _tabId);
    migrateFieldsAndTrees();
    if (state.modelDemoCount) applyLocalForestModelDemo();
    hideDetail(false);
    renderFieldTabs();
    renderTargetFieldSelect();
    renderStats();
    renderHistoryFilters();
    renderHistory();
    renderTrash();
    renderCompletionCard(false);
    updateSessionPreview();
  }
  function mergePendingRemote() {
    if (storeSaveQueued) flushStoreSave();
    let raw = null;
    try { raw = localStorage.getItem('tool.forest.pendingRemote.v2'); } catch (e) {}
    if (!raw) return false;
    try {
      const remote = JSON.parse(raw);
      const merged = forestStore.merge(remote, 'cloud-pending');
      if (!merged.ok) return false;
      try { localStorage.removeItem('tool.forest.pendingRemote.v2'); } catch (e) {}
      applyStoreSnapshot(merged.snapshot);
      renderAfterExternalData();
      if (window.CloudSync) window.CloudSync.push(true);
      return true;
    } catch (error) {
      showStorageWarn('云端 Forest 快照无法解析，已保留在 pending 中，没有覆盖本机数据。');
      return false;
    }
  }
  window.addEventListener('storage', (event) => {
    if (!event.key) return;
    if (event.key === SNAPSHOT_KEY) {
      if (storeSaveQueued) flushStoreSave();
      const loaded = forestStore.load();
      if (loaded.ok) { applyStoreSnapshot(loaded.snapshot); renderAfterExternalData(); }
    }
    if (event.key === LEASE_KEY && state.session) {
      const lease = forestStore.readLease();
      if (!Core.leaseMatches(lease, state.session)) {
        if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
        $startBtn.disabled = true;
        showToast('另一个标签页已接管，本页停止计时与写入');
      }
    }
  });
  window.addEventListener('cloudsync:pulled', mergePendingRemote);
  window.addEventListener('cloudsync:status', updateSyncStatus);
  if (forestChannel) forestChannel.addEventListener('message', (event) => {
    if (!event.data || event.data.tabId === _tabId) return;
    if (event.data.type === 'snapshot') {
      if (storeSaveQueued) flushStoreSave();
      const loaded = forestStore.load();
      if (loaded.ok) { applyStoreSnapshot(loaded.snapshot); renderAfterExternalData(); }
    }
    if (event.data.type === 'lease' && state.session && event.data.sessionId === state.session.id && event.data.epoch !== state.session.leaseEpoch) {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      showToast('另一个标签页已接管，本页停止计时与写入');
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  $resetBtn.addEventListener('click', async () => {
    flushStoreSave();
    const backup = forestStore.exportData();
    if (!backup.ok) { showStorageWarn('完整备份失败，因此没有清空任何数据。请先解决存储问题。'); return; }
    const ok = await showConfirm({
      title: '清空所有数据？',
      message: '会先下载完整 JSON 备份，并把当前森林移入“最近删除”保留 7 天。',
      okText: '清空', danger: true,
    });
    if (!ok) return;
    downloadText(backup.json, 'application/json;charset=utf-8', `forest-before-reset-${new Date().toISOString().slice(0, 10)}.json`);
    const snap = snapshotFromState();
    state.trees.forEach((item) => addSyncTombstone('tree', item.id, Date.now()));
    state.fields.forEach((item) => addSyncTombstone('field', item.id, Date.now()));
    state.sessions.forEach((item) => addSyncTombstone('session', item.id, Date.now()));
    state.trees = [];
    state.fields = [];
    state.activeFieldId = null;
    state.sessions = [];
    migrateFieldsAndTrees();  // 重建默认田
    moveToTrash('all', snap, '全部森林数据', 'all');
    saveActive(null);
    renderFieldTabs();
    renderTargetFieldSelect();
    renderStats();
  });

  // ============ Resume in-progress session ============
  async function resumeSession() {
    if (!forestSnapshot || !forestSnapshot.active) return;
    const runtime = JSON.parse(JSON.stringify(forestSnapshot.active));
    if (runtime.status === Core.STATUS.GRACE) {
      state.currentChainId = runtime.chainId || null;
      state.cycleCount = runtime.cycleNumber || 0;
      applyTheme();
      $overlay.classList.add('open');
      document.body.classList.add('forest-focus-active');
      setOverlayA11y(true);
      scheduleNextPhase(runtime.nextPhase === 'break', runtime);
      return;
    }
    const lease = forestStore.readLease();
    const liveOwner = Core.leaseOwner(lease, Date.now());
    if (liveOwner && liveOwner !== _tabId) {
      state.externalSessionReadonly = true;
      $startBtn.disabled = true;
      showToast('另一个标签页正在专注中；本页保持只读');
      return;
    }
    const foreign = (runtime.ownerTabId && runtime.ownerTabId !== _tabId) || (runtime.ownerDeviceId && runtime.ownerDeviceId !== DEVICE_ID);
    if (foreign) {
      const takeover = await showConfirm({
        title: '接管上次专注？',
        message: '这次专注来自另一个标签或设备。只有明确接管后，本页才会继续计时和结算。',
        okText: '接管', cancelText: '保持只读',
      });
      if (!takeover) { $startBtn.disabled = true; return; }
      const claimed = forestStore.claimLease(runtime.id, _tabId, DEVICE_ID, true);
      if (!claimed.ok) { showToast('接管失败，请稍后重试'); return; }
      runtime.ownerTabId = _tabId; runtime.ownerDeviceId = DEVICE_ID;
      runtime.leaseEpoch = claimed.lease.epoch; runtime.fenceToken = claimed.lease.fenceToken;
    }
    state.revivalTargetId = runtime.target && runtime.target.kind === 'revival' ? runtime.target.treeId : null;
    state.cultivateTargetId = runtime.target && runtime.target.kind === 'cultivate' ? runtime.target.treeId : null;
    if (state.revivalTargetId && !state.trees.some((tree) => tree.id === state.revivalTargetId && !tree.success)) { state.revivalTargetId = null; runtime.target = null; showToast('原灌溉目标已不存在，已取消特殊活动'); }
    if (state.cultivateTargetId && !state.trees.some((tree) => tree.id === state.cultivateTargetId && tree.success)) { state.cultivateTargetId = null; runtime.target = null; showToast('原培养目标已不存在，已取消特殊活动'); }
    state.pomodoroOn = !!(forestSnapshot.prefs && forestSnapshot.prefs.pomodoroOn);
    state.currentChainId = runtime.chainId || null;
    state.cycleCount = runtime.cycleNumber || 0;
    state.breakMin = forestSnapshot.prefs.breakMin || state.breakMin;
    const decision = Core.resumeDecision(runtime, Date.now());
    const decorated = decorateRuntime(runtime, Date.now());
    if (decision.action === 'complete') {
      state.session = decorated;
      if (!decorated.isBreak && !decorated.flexible) state.duration = Math.round(decorated.duration / 60000);
      completeSession({ noAdvance: true, completedAt: decision.completedAt });
      return;
    }
    if (decision.action === 'break-complete') {
      state.session = decorated;
      completeSession({ noAdvance: true, completedAt: runtime.scheduledEndAt });
      return;
    }
    if (decision.action === 'fail-left-page') {
      state.session = decorated;
      failSession('left_page', { failedAt: decision.failedAt, elapsedMs: decision.elapsedMs });
      return;
    }
    if (decision.action === 'reconcile-flexible') {
      const choice = await showChoice({
        title: '这段不限时专注离开较久',
        message: '请选择如何处理离开后的时间。不会自动把整晚算成专注。',
        choices: [
          { value: 'include', label: '计入离开时间' },
          { value: 'exclude', label: '排除离开时间并继续' },
          { value: 'stop', label: '按离开时收树' },
        ],
      });
      if (!choice) { if (foreign) forestStore.releaseLease(runtime.id, _tabId); return; }
      if (choice === 'exclude') {
        runtime.runningSince += decision.gapMs || 0;
        runtime.startedAt += decision.gapMs || 0;
      }
      state.flexible = true;
      if (!enterExisting(runtime, false)) return;
      if (choice === 'stop') stopFlexibleAt(decision.stopAt);
      return;
    }
    state.flexible = runtime.mode === Core.MODE.FLEXIBLE;
    if (!enterExisting(runtime, decision.action === 'resume-running')) return;
  }
  // ============ Field tabs UI ============
  const $fieldTabs = document.getElementById('field-tabs');
  const $renameFieldBtn = document.getElementById('rename-field-btn');
  const $deleteFieldBtn = document.getElementById('delete-field-btn');

  function renderFieldTabs() {
    $fieldTabs.innerHTML = state.fields.map(f => {
      const count = state.trees.filter(t => t.fieldId === f.id).length;
      const active = f.id === state.activeFieldId;
      return `
        <button type="button" class="field-tab ${active ? 'active' : ''}" data-field-id="${f.id}" aria-pressed="${active ? 'true' : 'false'}">
          <span>${escapeHtml(f.name)}</span>
          <span class="tab-count">${count}</span>
        </button>
      `;
    }).join('')
      + '<button type="button" class="field-tab-add" id="add-field-btn">+ 新建田块</button>'
      + (state.fields.length === 1 ? '<span class="field-tab-hint">按项目 / 时期分开管理</span>' : '');

    $fieldTabs.querySelectorAll('.field-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeFieldId = btn.dataset.fieldId;
        saveFields();
        state.selectedIds = []; if (typeof updateMergeBtn === 'function') updateMergeBtn();  // 换田清空勾选
        hideDetail();
        renderFieldTabs();
        renderTargetFieldSelect();
        updateSessionPreview();
        renderField();
      });
    });
    document.getElementById('add-field-btn').addEventListener('click', addNewField);

    // 删除按钮：只有 ≥ 2 块田时才允许删
    $deleteFieldBtn.style.display = state.fields.length >= 2 ? '' : 'none';
    renderTargetFieldSelect();
    renderHistoryFilters();
  }

  async function addNewField() {
    const defaultName = `第 ${state.fields.length + 1} 块田`;
    const name = await showPrompt({ title: '新建田块', placeholder: '给这块田起个名字', value: defaultName, okText: '创建' });
    if (name === null) return;                 // 取消
    const f = { id: newFieldId(), name: name || defaultName, createdAt: new Date().toISOString() };
    state.fields.push(f);
    state.activeFieldId = f.id;
    saveFields();
    renderFieldTabs();
    renderField();
  }

  $renameFieldBtn.addEventListener('click', async () => {
    const f = state.fields.find(x => x.id === state.activeFieldId);
    if (!f) return;
    const name = await showPrompt({ title: '重命名田块', value: f.name, okText: '保存' });
    if (!name || name === f.name) return;
    f.name = name;
    saveFields();
    renderFieldTabs();
  });

  $deleteFieldBtn.addEventListener('click', async () => {
    if (state.fields.length < 2) return;
    const f = state.fields.find(x => x.id === state.activeFieldId);
    if (!f) return;
    const treesInField = state.trees.filter(t => t.fieldId === state.activeFieldId);
    const ok = await showConfirm({
      title: `删除「${f.name}」？`,
      message: treesInField.length > 0
        ? `这块田和其中 ${treesInField.length} 棵树会移入“最近删除”，7 天内可恢复。`
        : '这块田会移入“最近删除”，7 天内可恢复。',
      okText: '删除', danger: true,
    });
    if (!ok) return;
    const snap = { field: f, trees: treesInField };
    state.trees = state.trees.filter(t => t.fieldId !== state.activeFieldId);
    state.fields = state.fields.filter(x => x.id !== state.activeFieldId);
    state.activeFieldId = state.fields[0].id;
    treesInField.forEach((tree) => addSyncTombstone('tree', tree.id, Date.now()));
    moveToTrash('field', snap, `田块「${snap.field.name}」`, snap.field.id);
    hideDetail();
    renderFieldTabs();
    renderStats();
    renderTargetFieldSelect();
  });

  // ============ 经验值图表 ============
  const $expRangeTabs = document.getElementById('exp-range-tabs');
  const $expSvg = document.getElementById('exp-chart-svg');
  const $expSummary = document.getElementById('exp-summary');
  const $expEmpty = document.getElementById('exp-empty');
  const $expSvgWrap = document.getElementById('exp-chart-svg-wrap');
  const $expTooltip = document.getElementById('exp-bar-tooltip');
  const $expChartZone = document.getElementById('exp-chart-zone');

  let expRange = 'week';

  function buildBuckets(range) {
    const now = new Date();
    const completed = state.sessions.filter((session) => !session.outcome || ['planted', 'manual', 'revived', 'cultivated', 'completed'].includes(session.outcome));
    const buckets = [];
    const pushBucket = (start, end, label, fullLabel) => buckets.push({
      label, fullLabel, startMs: start.getTime(), endMs: end.getTime(), exp: 0, count: 0, minutes: 0,
    });

    if (range === 'day') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      for (let hour = 0; hour < 24; hour++) {
        const a = new Date(start); a.setHours(hour);
        const b = new Date(start); b.setHours(hour + 1);
        pushBucket(a, b, hour % 3 === 0 ? `${hour}时` : '', `${hour}:00–${String(hour + 1).padStart(2, '0')}:00`);
      }
    } else if (range === 'week') {
      const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      for (let i = 0; i < 7; i++) {
        const a = new Date(start); a.setDate(start.getDate() + i);
        const b = new Date(a); b.setDate(a.getDate() + 1);
        pushBucket(a, b, weekdays[i], a.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }));
      }
    } else if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      for (let cursor = new Date(start), index = 0; cursor < end; index++) {
        const a = new Date(cursor);
        const b = new Date(cursor); b.setDate(cursor.getDate() + 1);
        const day = a.getDate();
        pushBucket(a, b, day === 1 || day % 5 === 0 || b >= end ? `${day}` : '', a.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }));
        cursor = b;
      }
    } else {
      for (let month = 0; month < 12; month++) {
        const a = new Date(now.getFullYear(), month, 1);
        const b = new Date(now.getFullYear(), month + 1, 1);
        pushBucket(a, b, `${month + 1}月`, `${now.getFullYear()}年${month + 1}月`);
      }
    }

    completed.forEach((session) => {
      const bucket = buckets.find((item) => session.endTime >= item.startMs && session.endTime < item.endMs);
      if (!bucket) return;
      bucket.exp += session.exp || 0;
      bucket.count += 1;
      bucket.minutes += session.minutes || 0;
    });
    return buckets;
  }

  function renderExpChart() {
    const buckets = buildBuckets(expRange);
    const total = buckets.reduce((s, b) => s + b.minutes, 0);
    const peak = Math.max(0.1, ...buckets.map(b => b.minutes));

    const tableBody = document.querySelector('#exp-data-table tbody');
    if (tableBody) tableBody.innerHTML = buckets.map((bucket) => `<tr><td>${escapeHtml(bucket.fullLabel || bucket.key || bucket.label)}</td><td>${bucket.count}</td><td>${Math.round((bucket.minutes || 0) * 10) / 10}</td></tr>`).join('');
    if (total <= 0) {
      $expSvg.style.display = 'none';
      $expEmpty.style.display = '';
      $expSummary.textContent = '';
      $expSvg.setAttribute('aria-label', '专注时间柱状图：本范围暂无专注记录');
      return;
    }
    $expSvg.style.display = '';
    $expEmpty.style.display = 'none';

    const totalCount = buckets.reduce((s, b) => s + b.count, 0);
    const totalText = total >= 60 ? `${Math.floor(total / 60)} 小时${Math.round(total % 60) ? ` ${Math.round(total % 60)} 分` : ''}` : `${Math.round(total)} 分钟`;
    $expSummary.innerHTML = `共 <strong>${totalText}</strong> · ${totalCount} 次`;
    $expSvg.setAttribute('aria-label', `专注时间柱状图：本范围共 ${totalText}，${totalCount} 次专注`);

    // 手机上固定 720 宽 viewBox 会把轴字缩到 ~4px：按容器实际宽度设（1 单位 ≈ 1px）
    const wrapW = ($expSvgWrap && $expSvgWrap.clientWidth) || 0;
    const W = wrapW ? Math.max(320, Math.min(720, Math.round(wrapW))) : 720, H = 200;
    $expSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const m = { l: 38, r: 8, t: 12, b: 28 };
    const innerW = W - m.l - m.r;
    const innerH = H - m.t - m.b;
    const N = buckets.length;
    const barW = innerW / N;
    const barInnerW = Math.max(2, barW - 4);

    // y ticks 3 档
    const yMax = peak * 1.1;
    const yTicks = [0, yMax / 2, yMax];

    let html = '';
    // 网格
    yTicks.forEach(v => {
      const y = m.t + innerH - (v / yMax) * innerH;
      html += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.6"/>`;
      html += `<text x="${m.l - 6}" y="${y + 3}" text-anchor="end" fill="var(--ft-hint)" font-size="11">${Math.round(v)}</text>`;
    });
    // bars
    buckets.forEach((b, i) => {
      const x = m.l + i * barW + (barW - barInnerW) / 2;
      const h = (b.minutes / yMax) * innerH;
      const y = m.t + innerH - h;
      // grad: 浅 → 深绿
      const fill = b.minutes > 0 ? 'var(--color-accent)' : 'transparent';
      const opacity = b.minutes > 0 ? (0.55 + 0.45 * (b.minutes / peak)) : 0;
      html += `<rect class="exp-bar" data-idx="${i}" x="${x}" y="${y}" width="${barInnerW}" height="${Math.max(0, h)}" fill="${fill}" opacity="${opacity}" rx="2"${b.minutes > 0 ? ` tabindex="0" role="img" aria-label="${escapeHtml(b.fullLabel)}：${Math.round((b.minutes || 0) * 10) / 10} 分钟，${b.count} 次专注"` : ''}/>`;
      // label
      if (b.label) {
        const labelX = m.l + i * barW + barW / 2;
        html += `<text x="${labelX}" y="${H - 10}" text-anchor="middle" fill="var(--ft-hint)" font-size="11">${b.label}</text>`;
      }
    });
    // baseline
    html += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + innerH}" y2="${m.t + innerH}" stroke="var(--color-border)" stroke-width="1"/>`;

    $expSvg.innerHTML = html;

    function showBar(bar) {
      const idx = parseInt(bar.dataset.idx, 10);
      const bucket = buckets[idx];
      if (!bucket || bucket.minutes <= 0) { hideExpTooltip(); return; }
      $expTooltip.innerHTML = `<strong>${escapeHtml(bucket.fullLabel)}</strong><br/>${Math.round((bucket.minutes || 0) * 10) / 10} 分钟 · ${bucket.count} 次`;
      $expTooltip.style.display = 'block';
      const barRect = bar.getBoundingClientRect();
      const wrapRect = $expSvgWrap.getBoundingClientRect();
      $expTooltip.style.left = `${barRect.left + barRect.width / 2 - wrapRect.left}px`;
      $expTooltip.style.top = `${barRect.top - wrapRect.top}px`;
    }
    // hover、键盘 focus 与触屏 click 使用同一信息源
    $expSvg.querySelectorAll('.exp-bar').forEach(bar => {
      bar.style.cursor = 'pointer';
      bar.addEventListener('mouseenter', () => showBar(bar));
      bar.addEventListener('focus', () => showBar(bar));
      bar.addEventListener('click', () => showBar(bar));
      bar.addEventListener('mousemove', (e) => {
        const wrapRect = $expSvgWrap.getBoundingClientRect();
        $expTooltip.style.left = (e.clientX - wrapRect.left) + 'px';
        $expTooltip.style.top = (e.clientY - wrapRect.top) + 'px';
      });
      bar.addEventListener('mouseleave', hideExpTooltip);
      bar.addEventListener('blur', hideExpTooltip);
    });
  }
  function hideExpTooltip() { $expTooltip.style.display = 'none'; }

  $expRangeTabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      $expRangeTabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      expRange = btn.dataset.range;
      renderExpChart();
    });
  });
  const $statisticsToggle = document.getElementById('statistics-toggle');
  const $statisticsClose = document.getElementById('statistics-close');
  const $forestUtilityMenu = document.querySelector('.forest-utility-menu');
  function setStatisticsOpen(open) {
    if (!$expChartZone || !$statisticsToggle) return;
    $expChartZone.hidden = !open;
    $statisticsToggle.setAttribute('aria-expanded', String(open));
    $statisticsToggle.classList.toggle('active', open);
    if (open && $forestUtilityMenu) $forestUtilityMenu.open = false;
    if (open) {
      document.querySelectorAll('.forest-panel').forEach((item) => { item.hidden = true; });
      document.querySelectorAll('.data-toolbar button[aria-expanded]').forEach((button) => {
        if (button !== $statisticsToggle) button.setAttribute('aria-expanded', 'false');
      });
      renderExpChart();
      const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      requestAnimationFrame(() => $expChartZone.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }));
    }
  }
  $statisticsToggle?.addEventListener('click', () => setStatisticsOpen($expChartZone.hidden));
  $statisticsClose?.addEventListener('click', () => setStatisticsOpen(false));

  // ============ Theme settings UI（pill 按钮组）============
  const $themeBgPills = document.getElementById('theme-bg-pills');
  const $themeTimerPills = document.getElementById('theme-timer-pills');

  function setActivePill($container, value) {
    $container.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.value === value);
    });
  }

  $themeBgPills.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme.background = btn.dataset.value;
      setActivePill($themeBgPills, btn.dataset.value);
      saveTheme();
      applyStageTheme();
      if (state.session) applyTheme();
    });
  });
  $themeTimerPills.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme.timer = btn.dataset.value;
      setActivePill($themeTimerPills, btn.dataset.value);
      saveTheme();
      if (state.session) applyTheme();
    });
  });
  function refreshAutomaticTheme() {
    if (state.theme.background !== 'auto') return;
    applyStageTheme();
    if (state.session) applyTheme();
  }
  if (systemDarkQuery) {
    if (typeof systemDarkQuery.addEventListener === 'function') systemDarkQuery.addEventListener('change', refreshAutomaticTheme);
    else if (typeof systemDarkQuery.addListener === 'function') systemDarkQuery.addListener(refreshAutomaticTheme);
  }
  new MutationObserver(refreshAutomaticTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ============ 专注严格度（离开是否枯萎）============
  const $strictTabs = document.getElementById('strict-tabs');
  const $strictThumb = document.getElementById('strict-thumb');
  // 把滑块移到当前选中项上（折叠面板展开后才有真实尺寸，故也在 toggle/resize 时重定位）
  function positionStrictThumb() {
    if (!$strictTabs || !$strictThumb) return;
    const activeBtn = $strictTabs.querySelector('button.active');
    if (!activeBtn || !activeBtn.offsetWidth) return;
    $strictThumb.style.left = activeBtn.offsetLeft + 'px';
    $strictThumb.style.width = activeBtn.offsetWidth + 'px';
  }
  function applyStrictUI() {
    if ($strictTabs) {
      $strictTabs.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', (b.dataset.strict === '1') === state.strict);
      });
      positionStrictThumb();
    }
    // 首屏说明随模式更新（浏览器不支持可见性检测时另说）
    if ($focusWarning) {
      $focusWarning.textContent = ('hidden' in document)
        ? focusWarnText()
        : '你的浏览器较旧，离开页面本就不会让树枯萎';
    }
    // 正在专注时实时更新遮罩说明
    if (state.session && !state.session.isBreak && $overlayWarn) {
      $overlayWarn.textContent = state.strict ? '离开页面超过 15 秒，树会枯萎' : '自觉模式：离开不会枯萎';
      $overlayWarn.hidden = !state.strict;
    }
  }
  if ($strictTabs) {
    $strictTabs.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.strict = btn.dataset.strict === '1';
        saveStrict();
        applyStrictUI();
      });
    });
    // 展开「更多设置」后测量重定位滑块（折叠时子元素无尺寸）
    const $moreSettings = document.querySelector('.more-settings');
    if ($moreSettings) $moreSettings.addEventListener('toggle', () => { if ($moreSettings.open) positionStrictThumb(); });
    window.addEventListener('resize', positionStrictThumb);
  }

  // Botanical Editorial 工具轨：直接控制真实偏好面板，不另造一份“效果图专用”控件。
  const $editorialSettingsBtn = document.getElementById('editorial-settings-btn');
  const $editorialPreferences = document.getElementById('preferences-panel');
  function syncEditorialPreferencesButton() {
    if (!$editorialSettingsBtn || !$editorialPreferences) return;
    $editorialSettingsBtn.setAttribute('aria-expanded', String($editorialPreferences.open));
    $editorialSettingsBtn.classList.toggle('active', $editorialPreferences.open);
  }
  if ($editorialSettingsBtn && $editorialPreferences) {
    $editorialSettingsBtn.addEventListener('click', () => {
      if (location.hash === '#forest') {
        location.hash = '#/';
        applyRoute();
        $editorialPreferences.open = true;
        syncEditorialPreferencesButton();
        requestAnimationFrame(positionStrictThumb);
        return;
      }
      $editorialPreferences.open = !$editorialPreferences.open;
      syncEditorialPreferencesButton();
      if ($editorialPreferences.open) requestAnimationFrame(positionStrictThumb);
    });
    $editorialPreferences.addEventListener('toggle', syncEditorialPreferencesButton);
    syncEditorialPreferencesButton();
  }

  // ============ 视图路由：#/ 种树 ↔ #forest 我的森林 ============
  // DOM 节点只做 hidden 切换、绝不 innerHTML 重建，所有既有监听保持存活。
  const $viewPlant = document.getElementById('view-plant');
  const $viewForest = document.getElementById('view-forest');
  const $navTabs = document.querySelectorAll('.ft-nav-tab');
  let currentView = null;
  function parseRoute() { return location.hash === '#forest' ? 'forest' : 'plant'; }
  function applyRoute() {
    const v = parseRoute();
    if (v === currentView) return;
    currentView = v;
    document.body.classList.toggle('forest-gallery-active', v === 'forest');
    if (v === 'forest' && $editorialPreferences?.open) $editorialPreferences.open = false;
    hideDetail();
    $viewPlant.hidden = v !== 'plant';
    $viewForest.hidden = v !== 'forest';
    $navTabs.forEach(t => {
      const active = t.dataset.view === v;
      t.classList.toggle('active', active);
      if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    const el = v === 'forest' ? $viewForest : $viewPlant;
    el.classList.remove('view-enter-l', 'view-enter-r');
    void el.offsetWidth;
    el.classList.add(v === 'forest' ? 'view-enter-r' : 'view-enter-l');
    window.scrollTo(0, 0);
    if (v === 'forest') {
      // 等一帧让布局稳定，clientWidth 量到的才是真实宽度
      requestAnimationFrame(() => {
        if (currentView !== 'forest') return;
        renderFieldTabs();
        renderStats();
      });
    } else {
      positionStrictThumb();   // 视图重新可见后滑块需要真实尺寸重定位
    }
  }
  // 灌溉/培养从森林视图发起、落点在种树卡：先切回种树视图再执行回调
  function goPlantView(cb) {
    if (parseRoute() === 'plant') { if (cb) cb(); return; }
    location.hash = '#/';
    applyRoute();
    if (cb) requestAnimationFrame(() => requestAnimationFrame(cb));
  }
  window.addEventListener('hashchange', applyRoute);

  // ============ 开发者补种控制台（暗号：grow）============
  // 给一段没开计时、但确实专注过的时间补记一棵树，直接种进当前田块并标记 manual，与正常种的树区分。
  function _bfPad2(n) { return String(n).padStart(2, '0'); }
  function _bfToLocalInput(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${_bfPad2(d.getMonth() + 1)}-${_bfPad2(d.getDate())}T${_bfPad2(d.getHours())}:${_bfPad2(d.getMinutes())}`;
  }
  let _bfMask = null;
  function ensureBackfillPanel() {
    if (_bfMask) return _bfMask;
    _bfMask = document.createElement('div');
    _bfMask.className = 'ft-backfill-mask';
    const opts = Object.keys(TREE_NAME).map(k => `<option value="${k}">${TREE_NAME[k]}</option>`).join('');
    _bfMask.innerHTML = `<div class="ft-backfill-card" role="dialog" aria-modal="true" aria-label="补种控制台">
      <div class="bf-title">补种一棵<span class="bf-dev">开发者</span></div>
      <div class="bf-desc">给一段没开计时、但确实专注过的时间补记一棵树——直接种进当前这块田，标为「手动补种」，和正常种的树区分开。</div>
      <div class="bf-field"><label for="bf-type">树种</label><select id="bf-type">${opts}</select></div>
      <div class="bf-field"><label for="bf-min">时长（分钟）</label><input type="number" id="bf-min" min="1" max="600" step="1" /></div>
      <div class="bf-field"><label for="bf-end">结束时间</label><input type="datetime-local" id="bf-end" /></div>
      <div class="bf-field"><label for="bf-task">任务（可选）</label><input type="text" id="bf-task" maxlength="60" placeholder="例如：读论文" /></div>
      <div class="bf-preview" id="bf-preview"></div>
      <div class="bf-actions"><button type="button" id="bf-cancel">取消</button><button type="button" id="bf-plant" class="bf-primary">补种</button></div>
    </div>`;
    document.body.appendChild(_bfMask);
    const q = sel => _bfMask.querySelector(sel);
    const close = () => _bfMask.classList.remove('open');
    function readVals() {
      const type = q('#bf-type').value;
      const min = Math.max(1, Math.min(600, parseInt(q('#bf-min').value, 10) || 0));
      const endV = q('#bf-end').value;
      const end = endV ? new Date(endV).getTime() : Date.now();
      return { type, min, end };
    }
    function updatePreview() {
      const { min, end } = readVals();
      if (!isFinite(end)) { q('#bf-preview').textContent = '结束时间无效'; return; }
      const fmt = t => new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      q('#bf-preview').textContent = `将补种：${fmt(end - min * 60000)} → ${fmt(end)} · ${_gradeName(min)}`;
    }
    _bfMask.addEventListener('click', e => { if (e.target === _bfMask) close(); });
    q('#bf-cancel').addEventListener('click', close);
    ['#bf-type', '#bf-min', '#bf-end'].forEach(sel => q(sel).addEventListener('input', updatePreview));
    q('#bf-plant').addEventListener('click', () => {
      const { type, min, end } = readVals();
      if (!isFinite(end)) { updatePreview(); return; }
      const tree = {
        id: 'tr-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        type, task: q('#bf-task').value.trim(), durationMinutes: min,
        chainId: null, cycleNum: null, cycleBonus: 1.0,
        fieldId: state.activeFieldId,
        startTime: end - min * 60000, endTime: end, updatedAt: end,
        success: true, manual: true,
      };
      assignNewPosition(tree);
      state.trees.push(tree);
      _justPlantedId = tree.id;
      const record = logSession(min, treeValue(tree), end, type, {
        id: Core.stableId('fr', ['manual', tree.id, end]), treeId: tree.id, fieldId: tree.fieldId,
        task: tree.task, startTime: tree.startTime, outcome: 'manual',
      });
      state.lastCompletion = Core.completionView({
        sessionId: record.id, treeId: tree.id, task: tree.task, fieldId: tree.fieldId,
        fieldName: currentFieldName(), treeType: type, grade: _gradeName(treeValue(tree)), minutes: min, exp: record.exp, outcome: 'manual', endedAt: end,
      });
      queueStoreSave('manual-backfill');
      renderStats();
      close();
      showToast(`已补种：${TREE_NAME[type]} · ${min} 分（手动补记）`, { undoText: '去看看', undo: () => { location.hash = '#forest'; } });
    });
    _bfMask.__update = updatePreview;
    return _bfMask;
  }
  function openBackfillPanel() {
    const m = ensureBackfillPanel();
    m.querySelector('#bf-type').value = state.treeType;
    m.querySelector('#bf-min').value = state.duration;
    m.querySelector('#bf-end').value = _bfToLocalInput(Date.now());
    m.querySelector('#bf-task').value = '';
    m.__update();
    m.classList.add('open');
    setTimeout(() => { try { const el = m.querySelector('#bf-min'); el.focus(); el.select(); } catch (e) {} }, 30);
  }
  // 暗号 grow：不在输入区时连打 g-r-o-w 弹出补种控制台
  (function () {
    let buf = '';
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      if (!e.key || e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
      buf = (buf + e.key.toLowerCase()).slice(-6);
      if (buf.endsWith('grow')) { buf = ''; openBackfillPanel(); }
    });
  })();

  // ============ Completion, history, trash, and backup panels ============
  function renderCompletionCard(announce) {
    if (!$completionCard || !$completionSummary) return;
    const item = state.lastCompletion;
    if (!item) {
      $completionCard.hidden = true;
      $plantControlsPane?.classList.remove('completion-mode');
      return;
    }
    $completionSummary.replaceChildren();
    const title = document.createElement('p');
    title.innerHTML = `<strong>${escapeHtml(TREE_NAME[item.treeType] || '专注')}</strong>${item.grade ? ` · ${escapeHtml(item.grade)}` : ''} · ${item.minutes} 分钟 · ${item.exp} 经验`;
    const context = document.createElement('p');
    const ended = new Date(item.endedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    context.textContent = `${item.task || '未填写任务'} · ${item.fieldName || '我的田地'} · ${ended}`;
    $completionSummary.append(title, context);
    $completionCard.hidden = false;
    $plantControlsPane?.classList.add('completion-mode');
    $completionCard.setAttribute('aria-live', announce ? 'polite' : 'off');
    if (announce) setTimeout(() => $completionCard.setAttribute('aria-live', 'off'), 1000);
  }
  document.getElementById('completion-again')?.addEventListener('click', () => {
    state.lastCompletion = null;
    $completionCard.hidden = true;
    $plantControlsPane?.classList.remove('completion-mode');
    queueStoreSave('dismiss-completion');
    $startBtn.focus();
  });
  document.getElementById('completion-forest')?.addEventListener('click', () => { location.hash = '#forest'; });
  document.getElementById('completion-dismiss')?.addEventListener('click', () => {
    state.lastCompletion = null;
    $completionCard.hidden = true;
    $plantControlsPane?.classList.remove('completion-mode');
    queueStoreSave('dismiss-completion');
  });

  let historyLimit = 20;
  let historyHighlightId = null;
  function historyMatches(record) {
    const task = (document.getElementById('history-task-filter')?.value || '').trim().toLowerCase();
    const field = document.getElementById('history-field-filter')?.value || '';
    const tree = document.getElementById('history-tree-filter')?.value || '';
    return (!task || String(record.task || '').toLowerCase().includes(task))
      && (!field || record.fieldId === field)
      && (!tree || record.treeType === tree);
  }
  function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const rows = state.sessions.filter(historyMatches).sort((a, b) => b.endTime - a.endTime);
    list.replaceChildren();
    rows.slice(0, historyLimit).forEach((record) => {
      const li = document.createElement('li');
      li.className = 'history-item' + ((record.sessionId || record.id) === historyHighlightId ? ' history-highlight' : '');
      li.dataset.sessionId = record.sessionId || record.id;
      const outcome = record.outcome === 'planted' || record.outcome === 'manual' || record.outcome === 'revived' || record.outcome === 'cultivated'
        ? '完成' : record.outcome === 'left-page' ? '离开失败' : '提前结束';
      const title = document.createElement('strong');
      title.textContent = `${record.task || '未填写任务'} · ${record.minutes} 分钟`;
      const meta = document.createElement('div');
      meta.className = 'history-meta';
      const fieldName = state.fields.find((item) => item.id === record.fieldId)?.name || '已删除田块';
      meta.textContent = `${new Date(record.endTime).toLocaleString('zh-CN')} · ${fieldName} · ${TREE_NAME[record.treeType] || record.treeType} · ${outcome}`;
      li.append(title, meta);
      const linkedTree = record.treeId && state.trees.find((treeItem) => treeItem.id === record.treeId);
      if (linkedTree) {
        const openTree = document.createElement('button');
        openTree.type = 'button'; openTree.textContent = '查看对应树';
        openTree.addEventListener('click', () => {
          state.activeFieldId = linkedTree.fieldId;
          saveFields(); renderFieldTabs(); renderField();
          requestAnimationFrame(() => {
            const node = treeNodeCache.get(linkedTree.id);
            // 先瞬时定位再开详情；smooth scroll 的后续 scroll 事件会触发 hideDetailOnScroll，
            // 导致详情刚打开就被关闭、aria-expanded 又变回 false。
            if (node) {
              detailScrollGuardUntil = performance.now() + 700;
              node.scrollIntoView({ behavior: 'auto', block: 'center' });
              // Chrome 会在 scrollIntoView 返回后才派发 scroll；再等一帧，避免该事件关闭刚打开的详情。
              requestAnimationFrame(() => showDetail(linkedTree.id, node.querySelector('.tree-open')));
            }
          });
        });
        li.appendChild(openTree);
      }
      list.appendChild(li);
    });
    if (historyHighlightId) requestAnimationFrame(() => list.querySelector('.history-highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    const more = document.getElementById('history-more');
    if (more) { more.hidden = rows.length <= historyLimit; more.textContent = `加载更多（还剩 ${Math.max(0, rows.length - historyLimit)} 条）`; }
  }
  function renderHistoryFilters() {
    const fieldSelect = document.getElementById('history-field-filter');
    const treeSelect = document.getElementById('history-tree-filter');
    if (fieldSelect) {
      const value = fieldSelect.value;
      fieldSelect.innerHTML = '<option value="">全部田块</option>' + state.fields.map((field) => `<option value="${escapeHtml(field.id)}">${escapeHtml(field.name)}</option>`).join('');
      fieldSelect.value = value;
    }
    if (treeSelect && treeSelect.options.length <= 1) {
      treeSelect.innerHTML = '<option value="">全部树种</option>' + Object.entries(TREE_NAME).map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
    }
  }
  ['history-task-filter', 'history-field-filter', 'history-tree-filter'].forEach((id) => document.getElementById(id)?.addEventListener('input', () => { historyLimit = 20; renderHistory(); }));
  document.getElementById('history-more')?.addEventListener('click', () => { historyLimit += 20; renderHistory(); });

  function purgeExpiredTrash() {
    const now = Date.now();
    const before = state.recentDeleted.length;
    state.recentDeleted = state.recentDeleted.filter((entry) => !entry.expiresAt || entry.expiresAt > now);
    if (state.recentDeleted.length !== before) queueStoreSave('purge-trash');
  }
  function addSyncTombstone(entityType, entityId, deletedAt) {
    const id = `${entityType}:${entityId}`;
    const previous = state.syncTombstones.find((item) => item.id === id);
    const marker = { id, entityType, entityId, deletedAt, updatedAt: deletedAt };
    if (previous) Object.assign(previous, marker); else state.syncTombstones.push(marker);
  }
  function moveToTrash(entityType, payload, label, entityId) {
    const deletedAt = Date.now();
    const entry = {
      id: Core.randomId('trash', deletedAt), entityType, entityId: entityId || payload.id || 'all',
      label, payload: JSON.parse(JSON.stringify(payload)), deletedAt,
      expiresAt: deletedAt + Core.UNDO_RETENTION_MS, updatedAt: deletedAt,
    };
    state.recentDeleted.push(entry);
    addSyncTombstone(entityType, entry.entityId, deletedAt);
    queueStoreSave('trash');
    renderTrash();
    showToast(`${label}已移入最近删除`, { undo: () => restoreTrash(entry.id) });
    return entry;
  }
  function restoreTrash(id) {
    const entry = state.recentDeleted.find((item) => item.id === id);
    if (!entry) return;
    if (entry.entityType === 'tree') {
      const tree = entry.payload;
      if (tree.position && state.trees.some((item) => item.fieldId === tree.fieldId && item.position && item.position.col === tree.position.col && item.position.row === tree.position.row)) delete tree.position;
      if (!state.fields.some((field) => field.id === tree.fieldId)) tree.fieldId = state.activeFieldId;
      if (!state.trees.some((item) => item.id === tree.id)) state.trees.push(tree);
    } else if (entry.entityType === 'field') {
      if (!state.fields.some((field) => field.id === entry.payload.field.id)) state.fields.push(entry.payload.field);
      entry.payload.trees.forEach((tree) => { if (!state.trees.some((item) => item.id === tree.id)) state.trees.push(tree); });
      state.activeFieldId = entry.payload.field.id;
      const restoredIds = new Set([entry.payload.field.id, ...entry.payload.trees.map((tree) => tree.id)]);
      state.syncTombstones = state.syncTombstones.filter((item) => !restoredIds.has(item.entityId));
    } else if (entry.entityType === 'all') {
      applyStoreSnapshot(entry.payload);
      const restoredIds = new Set([
        ...entry.payload.trees.map((item) => item.id),
        ...entry.payload.fields.map((item) => item.id),
        ...entry.payload.sessions.map((item) => item.id),
      ]);
      state.syncTombstones = state.syncTombstones.filter((item) => !restoredIds.has(item.entityId));
    }
    state.recentDeleted = state.recentDeleted.filter((item) => item.id !== id);
    state.syncTombstones = state.syncTombstones.filter((item) => !(item.entityType === entry.entityType && item.entityId === entry.entityId));
    migrateFieldsAndTrees();
    queueStoreSave('restore-trash');
    renderFieldTabs(); renderTargetFieldSelect(); renderStats(); renderTrash();
  }
  function renderTrash() {
    purgeExpiredTrash();
    const list = document.getElementById('trash-list');
    const count = document.getElementById('trash-count');
    if (count) count.textContent = String(state.recentDeleted.length);
    if (!list) return;
    list.replaceChildren();
    if (!state.recentDeleted.length) { list.textContent = '最近删除为空。'; return; }
    state.recentDeleted.slice().sort((a, b) => b.deletedAt - a.deletedAt).forEach((entry) => {
      const row = document.createElement('div'); row.className = 'trash-entry';
      const text = document.createElement('span'); text.textContent = `${entry.label} · ${new Date(entry.deletedAt).toLocaleString('zh-CN')}`;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = '恢复'; button.addEventListener('click', () => restoreTrash(entry.id));
      row.append(text, button); list.appendChild(row);
    });
  }

  function downloadText(text, mime, name) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.getElementById('export-data-btn')?.addEventListener('click', () => {
    flushStoreSave();
    const exported = forestStore.exportData();
    if (!exported.ok) {
      const corrupt = forestStore.recoverCorruptRaw();
      if (corrupt) {
        downloadText(corrupt.raw, 'application/json;charset=utf-8', 'forest-corrupt-raw.json');
        showStorageWarn('完整快照损坏；已下载未改写的原始数据供恢复。');
      } else showStorageWarn('无法读取完整备份；为避免生成残缺文件，本次没有下载。');
      return;
    }
    downloadText(exported.json, 'application/json;charset=utf-8', `forest-backup-${new Date().toISOString().slice(0, 10)}.json`);
  });
  document.getElementById('import-data-input')?.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const status = document.getElementById('import-preview');
    let text;
    try { text = await file.text(); } catch (error) { status.textContent = '无法读取文件。'; return; }
    if (file.size > 10 * 1024 * 1024) { status.textContent = '文件超过 10MB，未导入。'; return; }
    const preview = forestStore.previewImport(text);
    if (!preview.ok) { status.textContent = `备份校验失败：${preview.reason}`; return; }
    status.textContent = `差异预览：树 ${preview.diff.trees >= 0 ? '+' : ''}${preview.diff.trees}，记录 ${preview.diff.sessions >= 0 ? '+' : ''}${preview.diff.sessions}，田块 ${preview.diff.fields >= 0 ? '+' : ''}${preview.diff.fields}`;
    const strategy = await showChoice({ title: '确认导入方式', message: status.textContent, choices: [
      { value: 'merge', label: '合并进现有森林' }, { value: 'replace', label: '用备份替换' }, { value: 'cancel', label: '取消' },
    ] });
    if (!strategy || strategy === 'cancel') return;
    const imported = forestStore.importData(text, strategy);
    if (!imported.ok) { status.textContent = `导入失败：${imported.reason || '无法写入'}`; return; }
    if (imported.preImportBackup) downloadText(imported.preImportBackup.json, 'application/json;charset=utf-8', `forest-before-import-${new Date().toISOString().slice(0, 10)}.json`);
    applyStoreSnapshot(imported.snapshot);
    migrateFieldsAndTrees();
    renderFieldTabs(); renderTargetFieldSelect(); renderStats(); renderHistoryFilters(); renderHistory(); renderTrash();
    status.textContent = '导入完成；导入前备份已同时下载。';
  });

  function updateSyncStatus() {
    const status = document.getElementById('sync-status');
    if (!status) return;
    const loggedIn = !!(window.SiteAuth && typeof window.SiteAuth.isLoggedIn === 'function' && window.SiteAuth.isLoggedIn());
    status.textContent = loggedIn
      ? '已登录：森林快照（包含任务文字）会进入账号同步；跨设备并发采用尽力合并，当前后端尚无 CAS。'
      : '游客模式：森林与任务文字只保存在这台设备。建议定期导出 JSON。';
  }

  // 本地建模验收夹具：只在 localhost 且显式传入 ?forestDemo=40/100 时生效。
  // 它走与真实种树完全相同的分配、透视、遮挡和渲染链路，但不写回存档。
  function applyLocalForestModelDemo() {
    if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return false;
    const raw = new URLSearchParams(location.search).get('forestDemo');
    const count = Number.parseInt(raw || '', 10);
    if (!Number.isFinite(count) || count < 1 || count > 120) return false;

    const fieldId = 'field-model-demo';
    const baseTime = Date.UTC(2026, 7, 30, 16, 0, 0);
    const types = ['oak', 'sakura', 'palm', 'cactus'];
    const durations = [30, 50, 90, 180];
    const density = Layout.densityProfile(count);
    const viewport = { width: 1672, height: 941 };
    const occupied = [];
    const trees = [];

    for (let index = 0; index < count; index++) {
      const durationMinutes = durations[index % durations.length];
      const tree = {
        id: `model-demo-${count}-${index + 1}`,
        type: types[index % types.length],
        task: `三维田地验收 ${index + 1}`,
        fieldId,
        durationMinutes,
        startTime: baseTime - (count - index) * 3600000,
        endTime: baseTime - (count - index) * 3600000 + durationMinutes * 60000,
        updatedAt: baseTime,
        success: true,
      };
      const layoutTree = Object.assign({}, tree, {
        tier: effectiveTier(tree),
        densityScale: density.footprintScale,
        assetWidth: density.assetBase,
        assetHeight: density.assetBase,
      });
      tree.position3d = Layout.allocatePosition(layoutTree, occupied, { scene: 'forest', viewport });
      occupied.push(Object.assign({}, layoutTree, { position3d: tree.position3d }));
      trees.push(tree);
    }

    state.fields = [{ id: fieldId, name: '三维田地验收', createdAt: baseTime, updatedAt: baseTime }];
    state.activeFieldId = fieldId;
    state.trees = trees;
    state.sessions = trees.map((tree) => Core.makeSessionRecord({
      id: `model-session-${tree.id}`,
      sessionId: `model-session-${tree.id}`,
      treeId: tree.id,
      fieldId,
      task: tree.task,
      minutes: tree.durationMinutes,
      exp: tree.durationMinutes,
      startTime: tree.startTime,
      endTime: tree.endTime,
      treeType: tree.type,
      outcome: 'planted',
      updatedAt: tree.endTime,
    }));
    state.modelDemoCount = count;
    document.documentElement.dataset.forestModelDemo = String(count);
    return true;
  }

  ['history', 'trash', 'data', 'rules'].forEach((name) => {
    document.getElementById(`${name}-toggle`)?.addEventListener('click', () => {
      setStatisticsOpen(false);
      if ($forestUtilityMenu) $forestUtilityMenu.open = false;
      const panel = document.getElementById(`${name}-panel`);
      const open = panel.hidden;
      document.querySelectorAll('.forest-panel').forEach((item) => { item.hidden = true; });
      panel.hidden = !open;
      document.querySelectorAll('.data-toolbar button[aria-expanded]').forEach((button) => button.setAttribute('aria-expanded', button.id === `${name}-toggle` && open ? 'true' : 'false'));
      if (open && name === 'history') { renderHistoryFilters(); renderHistory(); }
      if (open && name === 'trash') renderTrash();
      if (open && name === 'data') updateSyncStatus();
    });
  });
  document.querySelectorAll('[data-close-panel]').forEach((button) => button.addEventListener('click', () => {
    const panel = document.getElementById(button.dataset.closePanel); if (panel) panel.hidden = true;
    const toggle = document.querySelector(`[aria-controls="${button.dataset.closePanel}"]`); if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('click', (event) => {
    if ($forestUtilityMenu?.open && !$forestUtilityMenu.contains(event.target)) $forestUtilityMenu.open = false;
  });

  // ============ Init ============
  hydrateStore();
  mergePendingRemote();
  loadTrees();
  loadFields();
  loadSessions();
  loadTheme();
  state.strict = loadStrict();
  migrateFieldsAndTrees();
  migrateSessions();   // 首次从现有成活树回填一份不可变专注流水
  applyLocalForestModelDemo();
  // 恢复常用偏好（树种/时长/番茄开关/休息分钟）；进行中会话稍后由 restoreMeta 覆盖
  (function applyPrefs() {
    const p = loadPrefs();
    if (!p) { syncBreakRow(); return; }
    if (p.treeType && TREE_NAME[p.treeType]) {
      state.treeType = p.treeType;
      $treeTypes.forEach(b => b.classList.toggle('active', b.dataset.tree === p.treeType));
    }
    if (Number.isFinite(p.duration) && p.duration >= 1 && p.duration <= 180) {
      state.duration = p.duration;
      let hit = false;
      $durationTabs.forEach(b => { const on = parseInt(b.dataset.min, 10) === p.duration; b.classList.toggle('active', on); hit = hit || on; });
      if (!hit) $customMin.value = p.duration;
    }
    if (typeof p.pomodoroOn === 'boolean') { state.pomodoroOn = p.pomodoroOn; $pomodoroOn.checked = p.pomodoroOn; }
    if (Number.isFinite(p.breakMin) && p.breakMin >= 1 && p.breakMin <= 60) { state.breakMin = p.breakMin; $breakMin.value = p.breakMin; }
    breakTouched = !!p.breakTouched;
    state.flexible = false;
    state.autoStartBreak = p.autoStartBreak !== false;
    state.autoStartFocus = p.autoStartFocus === true;
    state.wakeLock = p.wakeLock !== false;
    state.sound = p.sound === true;
    state.vibration = p.vibration === true;
    state.notifications = p.notifications === true;
    if ($autoStartBreak) $autoStartBreak.checked = state.autoStartBreak;
    if ($autoStartFocus) $autoStartFocus.checked = state.autoStartFocus;
    if ($wakeLockOn) $wakeLockOn.checked = state.wakeLock;
    if ($soundOn) $soundOn.checked = state.sound;
    if ($vibrationOn) $vibrationOn.checked = state.vibration;
    if ($notificationOn) $notificationOn.checked = state.notifications;
    syncBreakRow();
  })();
  if (state.revivalTargetId) {
    const queued = state.revivalTargetId;
    if (state.trees.some((tree) => tree.id === queued && !tree.success)) queueRevival(queued);
    else { state.revivalTargetId = null; state.activityReturnDraft = null; queueStoreSave('drop-missing-revival'); }
  } else if (state.cultivateTargetId) {
    const queued = state.cultivateTargetId;
    if (state.trees.some((tree) => tree.id === queued && tree.success)) queueCultivate(queued);
    else { state.cultivateTargetId = null; state.activityReturnDraft = null; queueStoreSave('drop-missing-cultivate'); }
  }
  setActivePill($themeBgPills, state.theme.background);
  setActivePill($themeTimerPills, state.theme.timer);
  // 选择器里每个主题按钮画一枚「场景圆窗」预览
  document.querySelectorAll('.theme-swatch[data-scene]').forEach(el => {
    const nm = el.dataset.scene;
    const src = nm === 'night' ? '/assets/images/forest/firefly-home-wide-v4.webp' : '/assets/images/forest/greenhouse-square-v4.webp';
    el.innerHTML = `<img src="${src}" alt="" decoding="async">`;
  });
  $treeTypes.forEach(button => {
    const icon = button.querySelector('.opt-ico');
    if (!icon) return;
    icon.classList.add('tree-model-preview');
    icon.innerHTML = buildTreeSvg(button.dataset.tree, 0.68, 50, true, true);
  });
  applyStageTheme();
  $timerDisplay.textContent = fmtTime(state.duration * 60);
  renderTree(0);
  // 森林视图尚未打开时也要有真实田宽（否则种树按 800px 兜底算列数，首次进森林页会触发重排）：
  // 以 visibility:hidden 显示一帧量宽，量完立刻藏回
  (function seedFieldWidth() {
    if ($field.clientWidth || !$viewForest || !$viewForest.hidden) return;
    $viewForest.style.visibility = 'hidden';
    $viewForest.hidden = false;
    const w = $field.clientWidth;
    $viewForest.hidden = true;
    $viewForest.style.visibility = '';
    if (w) _lastFieldWidth = w;
  })();
  renderFieldTabs();
  renderStats();
  renderTargetFieldSelect();
  renderCompletionCard(false);
  renderHistoryFilters();
  renderTrash();
  updateSyncStatus();
  updateSessionPreview();
  updatePomodoroHint();
  resumeSession();
  applyFlexibleUI();   // 灵活模式（∞）UI 与偏好 / 续跑同步
  applyStrictUI();   // 严格度按钮高亮 + 首屏「离开页面」说明（随当前模式）
  // 分段/胶囊单选控件：视觉选中靠 .active，读屏靠 aria-pressed —— 用委托监听统一同步（免逐点维护）
  function refreshAriaPressed() {
    document.querySelectorAll('#tree-types button, .duration-tabs button, #theme-bg-pills button, #theme-timer-pills button, #strict-tabs button, .exp-range-tabs button')
      .forEach(b => b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false'));
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('#tree-types, .duration-tabs, #theme-bg-pills, #theme-timer-pills, #strict-tabs, .exp-range-tabs')) {
      requestAnimationFrame(refreshAriaPressed);
    }
  });
  refreshAriaPressed();
  applyRoute();      // 按 URL hash 进入对应视图（#forest 深链接也能直达）
})();
