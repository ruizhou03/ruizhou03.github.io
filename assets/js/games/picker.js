(function () {
  // ── 调色 ──────────────────────────────
  // 莫兰迪/低饱和大地色：饱和度 20-35%、明度 42-55%，跟站点米白底 + 海军蓝 + 驼金同源
  const SLICE_COLORS = [
    '#b6776a', // 陶土橘
    '#8a9e60', // 橄榄绿
    '#5c80a8', // 雾蓝
    '#b89252', // 驼金（≈ 站点 --color-highlight）
    '#8d6e94', // 藤紫
    '#5a8584', // 青石
    '#a07658', // 焦糖棕
    '#6e7e94', // 石板灰蓝
    '#9e6a78', // 霞粉
    '#5e7a52', // 苔深绿
  ];

  // ── 状态 ──────────────────────────────
  const state = {
    // 默认：是 / 否 —— 一打开就是个能直接抽的「二选一」决策转盘（最贴合「遇事不决」）
    options: [
      { id: cryptoId(), text: '是', weight: 50, locked: false },
      { id: cryptoId(), text: '否', weight: 50, locked: false },
    ],
    draws: 1,
    busy: false,
    spun: false,            // 是否已经抽过（宽屏：抽前转盘居中，首抽时滑向左边给结果腾位）
    rotation: 0,            // 当前累积旋转角度（CSS）
    multiResults: [],       // 多次模式下每次抽到的 idx
    skipAnimation: false,   // 用户在多次模式中点了"跳过动画"
    profiles: [],           // 本地存的所有方案（从 localStorage 读取）
    currentProfileId: null, // 当前加载的方案 id；null = 未选择
    dirty: false,           // 当前选项相对于已加载方案是否有未保存的修改
    history: [],            // 抽签历史（保存全部，上限 HISTORY_MAX），从 localStorage 读取
    historyPage: 1,         // 历史当前页（分页）
    historyPerPage: 10,     // 历史每页条数
    lastResultText: '',     // 最近一次的结果纯文本（用于复制）
  };
  const HISTORY_MAX = 1000; // 尽量“保存全部”，同时给 localStorage 一个安全上限
  const HISTORY_PERPAGE_KEY = 'picker.history.perpage.v1';
  const HISTORY_PERPAGE_OPTIONS = [10, 20, 50, 100];

  // ── Profile（本地方案）──────────────────
  const PROFILE_STORAGE_KEY = 'picker.profiles.v1';
  function loadProfilesFromStorage() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveProfilesToStorage() {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profiles));
    } catch (e) {
      // 配额超了 / 隐身模式 → 失败但不崩
      showToast('保存失败：浏览器存储不可用');
    }
  }
  function snapshotCurrentOptions() {
    return state.options.map(o => ({ text: o.text, weight: o.weight }));
  }
  function applyProfileToState(profile) {
    state.options = profile.options.map(o => ({
      id: cryptoId(),
      text: o.text,
      weight: clampWeight(o.weight),   // 兼容旧方案里可能存过的 0 权重 → 收敛成正数
      locked: false,
    }));
    state.draws = profile.draws || 1;
  }
  function findProfile(id) {
    return state.profiles.find(p => p.id === id);
  }
  function createProfile(name) {
    const profile = {
      id: cryptoId(),
      name: name,
      options: snapshotCurrentOptions(),
      draws: state.draws,
      createdAt: Date.now(),
    };
    state.profiles.push(profile);
    saveProfilesToStorage();
    state.currentProfileId = profile.id;
    markClean();
    renderProfileList();
    showToast('已存为新档案');
  }
  function saveCurrentToProfile() {
    const p = findProfile(state.currentProfileId);
    if (!p) return;
    p.options = snapshotCurrentOptions();
    p.draws = state.draws;
    saveProfilesToStorage();
    markClean();
    renderProfileList();
    showToast('已保存改动');
  }
  // 调取某个档案（覆盖当前选项）
  function loadProfile(id) {
    if (state.busy) return;
    const p = findProfile(id);
    if (!p) return;
    if (state.dirty && state.currentProfileId && state.currentProfileId !== id) {
      const cur = findProfile(state.currentProfileId);
      if (!confirm(`「${cur ? cur.name : '当前'}」有未保存的改动，调取别的档案会丢失。确定继续？`)) return;
    }
    applyProfileToState(p);
    state.currentProfileId = id;
    markClean();
    renderAll();
    updateDrawsUI();
    renderProfileList();
    reset();
    unspin();
    showToast(`已调取「${p.name}」`);
  }
  function renameProfile(id) {
    if (state.busy) return;
    const p = findProfile(id);
    if (!p) return;
    const name = prompt('新档案名：', p.name);
    if (name === null) return;
    const t = name.trim();
    if (!t) { showToast('档案名不能为空'); return; }
    p.name = t;
    saveProfilesToStorage();
    renderProfileList();
    showToast('已重命名');
  }
  function deleteProfile(id) {
    if (state.busy) return;
    const p = findProfile(id);
    if (!p) return;
    if (!confirm(`确定删除档案「${p.name}」？此操作不可恢复。`)) return;
    state.profiles = state.profiles.filter(x => x.id !== id);
    if (state.currentProfileId === id) { state.currentProfileId = null; markClean(); }
    saveProfilesToStorage();
    renderProfileList();
    showToast('已删除档案');
  }

  // ── Dirty 标识（当前 vs 已加载方案）──────
  function markDirty() {
    if (state.dirty) return;
    state.dirty = true;
    if (state.currentProfileId) {
      $profileSaveBtn.classList.add('dirty');
    }
  }
  function markClean() {
    state.dirty = false;
    $profileSaveBtn.classList.remove('dirty');
  }

  // ── 历史 ─────────────────────────────
  const HISTORY_STORAGE_KEY = 'picker.history.v1';
  function loadHistoryFromStorage() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, HISTORY_MAX) : [];
    } catch (e) { return []; }
  }
  function saveHistoryToStorage() {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history));
    } catch (e) { /* 存满了就静默 */ }
  }
  function recordHistory(entry) {
    state.history.unshift(entry);
    if (state.history.length > HISTORY_MAX) {
      state.history = state.history.slice(0, HISTORY_MAX);
    }
    state.historyPage = 1;      // 新记录 → 跳回第一页看最新
    saveHistoryToStorage();
    renderHistory();
  }
  function clearHistory() {
    state.history = [];
    state.historyPage = 1;
    saveHistoryToStorage();
    renderHistory();
  }
  function renderHistory() {
    const n = state.history.length;
    $historyCount.textContent = n > 0 ? `共 ${n} 条` : '';
    if (n === 0) {
      $historyList.innerHTML = '<p class="history-empty">还没有抽签记录。</p>';
      $historyPager.innerHTML = '';
      return;
    }
    const per = state.historyPerPage;
    const pages = Math.max(1, Math.ceil(n / per));
    state.historyPage = Math.min(Math.max(1, state.historyPage), pages);
    const startIdx = (state.historyPage - 1) * per;
    const slice = state.history.slice(startIdx, startIdx + per);
    $historyList.innerHTML = slice.map((h, i) => {
      const seq = startIdx + i + 1;   // 全局序号（1 = 最新）
      const dt = new Date(h.ts);
      const timeStr = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      const fromStr = h.profile ? h.profile : (h.optionTexts || []).join(' · ');
      const drawsStr = (h.draws && h.draws > 1) ? ` · ${h.draws} 次` : '';
      return `<div class="history-item">
        <span class="history-seq">#${seq}</span>
        <span class="history-winner">${escapeHtml(h.winner || '?')}</span>
        <span class="history-from">${escapeHtml(fromStr)}${drawsStr}</span>
        <span class="history-meta">${escapeHtml(timeStr)}</span>
      </div>`;
    }).join('');
    renderHistoryPager(pages);
  }
  function renderHistoryPager(pages) {
    if (pages <= 1) { $historyPager.innerHTML = ''; return; }
    const p = state.historyPage;
    $historyPager.innerHTML = `
      <button type="button" class="pg-btn" data-act="prev" ${p <= 1 ? 'disabled' : ''}>‹ 上一页</button>
      <span class="pg-info">第 <input type="number" class="pg-jump" min="1" max="${pages}" value="${p}" aria-label="跳转到第几页" /> / ${pages} 页</span>
      <button type="button" class="pg-btn" data-act="next" ${p >= pages ? 'disabled' : ''}>下一页 ›</button>
    `;
    $historyPager.querySelector('[data-act="prev"]').addEventListener('click', () => {
      if (state.historyPage > 1) { state.historyPage--; renderHistory(); }
    });
    $historyPager.querySelector('[data-act="next"]').addEventListener('click', () => {
      if (state.historyPage < pages) { state.historyPage++; renderHistory(); }
    });
    const jump = $historyPager.querySelector('.pg-jump');
    const applyJump = () => {
      let v = parseInt(jump.value, 10);
      if (isNaN(v)) v = state.historyPage;
      state.historyPage = Math.min(Math.max(1, v), pages);
      renderHistory();
    };
    jump.addEventListener('change', applyJump);
    jump.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyJump(); } });
  }

  // ── URL Hash 分享 ────────────────────
  // 格式：#options=encode(text):weight,encode(text):weight,...&draws=N
  function encodeStateToHash() {
    const items = state.options
      .filter(o => (o.text || '').trim() !== '')
      .map(o => `${encodeURIComponent(o.text.trim())}:${fmtWeight(o.weight)}`);
    if (items.length < 2) return '';
    const drawsPart = state.draws !== 1 ? `&draws=${state.draws}` : '';
    return `#options=${items.join(',')}${drawsPart}`;
  }
  function tryApplyHashToState() {
    try {
      const hash = location.hash.slice(1);
      if (!hash) return false;
      // 手写解析，避开 URLSearchParams：它会预先 decode 一遍 %2C → `,`、%3A → `:`，
      // 跟我们的分隔符冲突，导致带 `,` 或 `:` 的选项名会被错拆
      let optsRaw = null;
      let drawsRaw = '1';
      for (const seg of hash.split('&')) {
        const eq = seg.indexOf('=');
        if (eq < 0) continue;
        const k = seg.slice(0, eq);
        const v = seg.slice(eq + 1);
        if (k === 'options') optsRaw = v;
        else if (k === 'draws') drawsRaw = v;
      }
      if (!optsRaw) return false;
      const items = optsRaw.split(',').map(s => {
        // s 形如 "encoded_text:weight"，encodeURIComponent 已把 `,` 和 `:` 转为 %2C / %3A
        const colonIdx = s.lastIndexOf(':');
        if (colonIdx < 0) return null;
        let text;
        try { text = decodeURIComponent(s.slice(0, colonIdx)); }
        catch (e) { return null; }
        const w = parseFloat(s.slice(colonIdx + 1));
        if (!text) return null;
        return {
          id: cryptoId(),
          text: [...text].slice(0, MAX_NAME_LEN).join(''),
          weight: clampWeight(isNaN(w) ? DEFAULT_PCT : w),
          locked: false,
        };
      }).filter(Boolean).slice(0, 10);
      if (items.length < 2) return false;
      const drawsParsed = parseInt(drawsRaw, 10);
      state.options = items;
      state.draws = isNaN(drawsParsed) ? 1 : Math.max(1, Math.min(100, drawsParsed));
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderProfileList() {
    if (!findProfile(state.currentProfileId)) state.currentProfileId = null;
    const profiles = state.profiles;
    if (profiles.length === 0) {
      $profileList.innerHTML = '';
      $archiveEmpty.style.display = '';
    } else {
      $archiveEmpty.style.display = 'none';
      $profileList.innerHTML = profiles.map(p => {
        const cur = p.id === state.currentProfileId;
        const nOpt = Array.isArray(p.options) ? p.options.length : 0;
        return `<div class="archive-item${cur ? ' is-current' : ''}" data-id="${p.id}">
          <span class="archive-name">${escapeHtml(p.name)}${cur ? '<span class="archive-badge">当前</span>' : ''}</span>
          <span class="archive-meta">${nOpt} 项</span>
          <span class="archive-item-actions">
            <button type="button" class="ar-btn ar-load" data-act="load">调取</button>
            <button type="button" class="ar-btn ar-icon" data-act="rename" title="重命名" aria-label="重命名">✏️</button>
            <button type="button" class="ar-btn ar-icon" data-act="del" title="删除" aria-label="删除">🗑️</button>
          </span>
        </div>`;
      }).join('');
      $profileList.querySelectorAll('.archive-item').forEach(el => {
        const id = el.dataset.id;
        el.querySelector('[data-act="load"]').addEventListener('click', () => loadProfile(id));
        el.querySelector('[data-act="rename"]').addEventListener('click', () => renameProfile(id));
        el.querySelector('[data-act="del"]').addEventListener('click', () => deleteProfile(id));
      });
    }
    // 「保存改动到当前档案」只有在调取了某档案时才显示
    $profileSaveBtn.style.display = state.currentProfileId ? '' : 'none';
  }

  let toastTimer;
  function showToast(msg, action) {
    // action 可选：{ label, onClick }，传了就在 toast 里加按钮、duration 延长
    clearTimeout(toastTimer);
    $profileToast.innerHTML = '';
    $profileToast.appendChild(document.createTextNode(msg));
    if (action && typeof action.onClick === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = action.label || '撤销';
      btn.addEventListener('click', () => {
        clearTimeout(toastTimer);
        $profileToast.style.opacity = '0';
        setTimeout(() => { $profileToast.style.display = 'none'; }, 320);
        action.onClick();
      });
      $profileToast.appendChild(btn);
    }
    $profileToast.style.display = '';
    $profileToast.style.opacity = '1';
    const dur = action ? 5000 : 1800;
    toastTimer = setTimeout(() => {
      $profileToast.style.opacity = '0';
      setTimeout(() => { $profileToast.style.display = 'none'; }, 320);
    }, dur);
  }

  function updateDrawsUI() {
    // 根据 state.draws 设置 pill / 自定义输入框的视觉
    const presetBtn = $drawsGrp.querySelector(`button[data-draws="${state.draws}"]`);
    if (presetBtn) {
      setActivePreset(presetBtn);
      $drawsCustom.value = '';
    } else {
      setActivePreset(null);
      $drawsCustom.value = String(state.draws);
    }
  }

  // ── DOM 引用 ──────────────────────────
  const $list      = document.getElementById('options-list');
  const $addBtn    = document.getElementById('add-btn');
  const $equalBtn  = document.getElementById('equal-btn');
  const $stage     = document.getElementById('stage');
  const $drawsGrp  = document.getElementById('draws-group');
  const $drawsCustom = document.getElementById('draws-custom');
  const DRAWS_MAX = 100;
  const $spinBtn   = document.getElementById('spin-btn');
  const $spinHintText = document.getElementById('spin-hint-text');
  const $skipBtn      = document.getElementById('skip-btn');
  const $wheel     = document.getElementById('wheel-svg');
  const $result    = document.getElementById('result-line');
  const $tallyPnl  = document.getElementById('tally-panel');
  const $tallyHdr  = document.getElementById('tally-header');
  const $tallyBars = document.getElementById('tally-bars');
  const $resetRow  = document.getElementById('reset-row');
  const $resetBtn  = document.getElementById('reset-btn');
  const $profileList      = document.getElementById('profile-list');
  const $archiveEmpty     = document.getElementById('archive-empty');
  const $profileSaveBtn   = document.getElementById('profile-save-btn');
  const $profileNewBtn    = document.getElementById('profile-new-btn');
  const $profileShareBtn  = document.getElementById('profile-share-btn');
  const $profileToast     = document.getElementById('profile-toast');
  const $wheelZone        = document.getElementById('wheel-zone');
  const $resultCopyBtn    = document.getElementById('result-copy-btn');
  const $historyList      = document.getElementById('history-list');
  const $historyCount     = document.getElementById('history-count');
  const $historyClearBtn  = document.getElementById('history-clear-btn');
  const $historyPager     = document.getElementById('history-pager');
  const $historyPerpage   = document.getElementById('history-perpage');

  // ── 权重＝占比（百分比模型）──────────
  // 每项内部 weight 就当"百分点"用，界面上直接显示/编辑百分比，任何时候各项之和 = 100%。
  // 铁律：每项占比必须是正数（≥ MIN_PCT），禁 0/负（"某项 100% 其余 0" 无意义）。
  // 编辑联动：改一项，其余"未锁定"的行按各自比例自动补足到 100%；锁定(🔒)的行保持不变，
  //   于是能精确设出 40/40/20 这类组合（锁住已调好的，再调下一项）。
  const MIN_WEIGHT = 0.1;   // 内部权重下限（hash/导入/旧方案兜底用，防 0/负）
  const MAX_WEIGHT = 100;
  const MIN_PCT = 1;        // 每项最少占 1%（保证扇区可见且非 0）
  const DEFAULT_PCT = 20;   // 非法值兜底
  const MAX_NAME_LEN = 8;   // 单个选项名字上限（一般不超过 8 字，也让转盘文字排得下）
  function clampWeight(w) {
    let n = Number(w);
    if (!isFinite(n)) n = DEFAULT_PCT;
    n = Math.round(n * 10) / 10;          // 归一到一位小数
    if (n < MIN_WEIGHT) n = MIN_WEIGHT;
    if (n > MAX_WEIGHT) n = MAX_WEIGHT;
    return n;
  }
  function fmtWeight(w) {
    return String(Math.round(clampWeight(w) * 10) / 10);
  }

  // 各项精确百分比（未取整）
  function currentPercents() {
    const ws = state.options.map(o => Math.max(0, o.weight));
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    return ws.map(w => w / total * 100);
  }
  // 当前各项显示用的整数百分比。各项独立四舍五入——这样「等权」的项会显示成完全一样的数字
  // （如三项各 33，而不是 34/33/33）。底层权重本就严格相等，转盘/概率是真等分；不显示总计，
  // 所以取整后偶尔加总 99/101 不会露出来、也不影响真实概率。
  function displayPercents() {
    return currentPercents().map(x => Math.round(x));
  }
  // 把某一项的占比设为 target%，其余"未锁定"项按比例补足到 100%；写回后 weight 即百分比、和为 100
  function setPercent(optId, target) {
    const opts = state.options;
    const kIdx = opts.findIndex(o => o.id === optId);
    if (kIdx < 0) return;
    const total = opts.reduce((s, o) => s + Math.max(0, o.weight), 0) || 1;
    const cur = opts.map(o => Math.max(0, o.weight) / total * 100);
    let lockedSum = 0;
    const unlocked = [];
    opts.forEach((o, i) => {
      if (i === kIdx) return;
      if (o.locked) lockedSum += cur[i];
      else unlocked.push(i);
    });
    const unlockedSum = unlocked.reduce((s, i) => s + cur[i], 0);
    let p;
    if (unlocked.length === 0) {
      // 其余都锁死了：这一项被完全决定，无法自由改
      p = Math.max(MIN_PCT, 100 - lockedSum);
    } else {
      const maxK = 100 - lockedSum - MIN_PCT * unlocked.length;
      p = Math.max(MIN_PCT, Math.min(maxK, Number(target)));
    }
    const next = cur.slice();
    next[kIdx] = p;
    const remaining = 100 - p - lockedSum;
    if (unlocked.length > 0) {
      if (unlockedSum > 0) {
        unlocked.forEach(i => { next[i] = remaining * cur[i] / unlockedSum; });
      } else {
        unlocked.forEach(i => { next[i] = remaining / unlocked.length; });
      }
    }
    opts.forEach((o, i) => { o.weight = Math.max(MIN_WEIGHT, next[i]); });
  }

  // 平均分配：所有项占比拉平（并解除全部锁定）
  function equalizeWeights() {
    const share = 100 / state.options.length;
    state.options.forEach(o => { o.weight = share; o.locked = false; });
  }
  function clearLocks() {
    state.options.forEach(o => { o.locked = false; });
  }
  function unlockedCount() {
    return state.options.reduce((n, o) => n + (o.locked ? 0 : 1), 0);
  }

  // ── helpers ───────────────────────────
  function cryptoId() {
    return Math.random().toString(36).slice(2, 9);
  }
  function totalWeight() {
    return state.options.reduce((s, o) => s + Math.max(0, o.weight), 0);
  }
  function effectiveWeights() {
    // 全 0 → 等权
    let total = totalWeight();
    if (total <= 0) {
      return state.options.map(() => 1);
    }
    return state.options.map(o => Math.max(0, o.weight));
  }
  // 给定一个 [0, 360) 的角度，找出它落在哪个扇形里
  function sliceAtAngle(theta) {
    const ws = effectiveWeights();
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    for (let i = 0; i < state.options.length; i++) {
      const start = (acc / total) * 360;
      acc += ws[i];
      const end = (acc / total) * 360;
      if (theta >= start && theta < end) return i;
    }
    return state.options.length - 1;
  }

  // ── 渲染选项行 ────────────────────────
  function renderOptions() {
    $list.innerHTML = '';
    const pcts = displayPercents();
    state.options.forEach((opt, idx) => {
      const row = document.createElement('div');
      row.className = 'option-row' + (opt.locked ? ' is-locked' : '')
        + (nameLen(opt.text) > MAX_NAME_LEN ? ' is-toolong' : '');
      row.dataset.id = opt.id;
      const color = SLICE_COLORS[idx % SLICE_COLORS.length];
      const locked = !!opt.locked;
      row.innerHTML = `
        <button type="button" class="opt-del" aria-label="删除选项" ${state.options.length <= 2 ? 'disabled' : ''}>✕</button>
        <span class="opt-chip" style="background:${color}" aria-hidden="true"></span>
        <input type="text" class="opt-text" value="${escapeHtml(opt.text)}" placeholder="选项 ${idx + 1}" maxlength="40" />
        <input type="range" class="opt-weight" min="${MIN_PCT}" max="100" step="1" value="${pcts[idx]}" aria-label="占比滑块" ${locked ? 'disabled' : ''} />
        <span class="wnum"><input type="number" class="opt-weight-num" min="${MIN_PCT}" max="100" step="1" value="${pcts[idx]}" inputmode="numeric" aria-label="占比（百分比）" ${locked ? 'disabled' : ''} /><i class="wpct">%</i></span>
        <button type="button" class="opt-lock ${locked ? 'locked' : ''}" aria-label="${locked ? '解锁占比' : '锁定占比'}" title="${locked ? '已锁定：改别的选项时它保持不变' : '锁定这一项占比（调别的选项时它不变）'}">${locked ? '🔒' : '🔓'}</button>
      `;
      // 删除
      row.querySelector('.opt-del').addEventListener('click', () => {
        if (state.busy) return;
        if (state.options.length <= 2) return;
        const i = state.options.findIndex(o => o.id === opt.id);
        if (i < 0) return;
        const removed = state.options.splice(i, 1)[0];
        clearLocks();          // 结构变了，锁定失效
        markDirty();
        renderAll();
        showToast(`已删除"${removed.text || ('选项' + (i + 1))}"`, {
          label: '撤销',
          onClick: () => {
            if (state.options.length >= 10) return;
            state.options.splice(i, 0, removed);
            markDirty();
            renderAll();
          },
        });
      });
      const textInput = row.querySelector('.opt-text');
      const slider    = row.querySelector('.opt-weight');
      const numInput  = row.querySelector('.opt-weight-num');
      const lockBtn   = row.querySelector('.opt-lock');

      // 超过 8 字的红框警示（允许继续输入，但会挡住抽签）
      const warn = document.createElement('div');
      warn.className = 'opt-warn';
      warn.textContent = `名字不能超过 ${MAX_NAME_LEN} 个字`;
      const updateRowLen = (val) => {
        const tooLong = nameLen(val) > MAX_NAME_LEN;
        row.classList.toggle('is-toolong', tooLong);
        warn.style.display = tooLong ? '' : 'none';
      };
      updateRowLen(opt.text);

      textInput.addEventListener('input', (e) => {
        opt.text = e.target.value;
        updateRowLen(e.target.value);
        markDirty();
        renderWheel();       // 文字变了要重画转盘
        updateSpinBtn();     // 空名字 / 超长会挡住抽签
      });
      // 回车推进 / 末项非空则自动新建
      textInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        advanceFromTextInput(opt.id, e.target.value);
      });

      // 拖滑块 → 把这一项设成该占比（其余未锁定项按比例补足到 100%）
      slider.addEventListener('input', (e) => {
        if (opt.locked) return;
        setPercent(opt.id, Number(e.target.value));
        markDirty();
        // 绝对语义：滑块位置就是这项的绝对占比%（相同占比→相同位置）。若因锁定/others 触到上限，
        // 这里连同拖动的这根滑块一起回填成真实值——多拖也只会停在能占到的最大处（不越界）。
        syncWeightUI(null);
        renderWheel();
        updateSpinBtn();
      });
      // 数字框输占比。空串先放行，等 blur 再规范化回填
      numInput.addEventListener('input', (e) => {
        if (opt.locked) return;
        if (e.target.value.trim() === '') return;
        setPercent(opt.id, Number(e.target.value));
        markDirty();
        syncWeightUI(e.target);   // 别覆盖用户正在输入的这个框
        renderWheel();
        updateSpinBtn();
      });
      numInput.addEventListener('blur', () => {
        syncWeightUI(null);       // 回填成四舍五入后、加总 = 100 的整数占比
      });

      // 锁定 / 解锁
      lockBtn.addEventListener('click', () => {
        if (state.busy) return;
        if (!opt.locked && unlockedCount() <= 1) {
          showToast('至少留一项不锁定，才能自动配平');
          return;
        }
        opt.locked = !opt.locked;
        renderOptions();          // 重画锁图标 + 各框禁用态
        renderWheel();
      });

      const item = document.createElement('div');
      item.className = 'option-item';
      item.appendChild(row);
      item.appendChild(warn);
      $list.appendChild(item);
    });
  }
  function appendOption(text) {
    // 新选项默认拿"平均一份"的占比，不喧宾夺主；结构变了顺手解除锁定
    const ws = state.options.map(o => Math.max(0, o.weight));
    const avg = ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : DEFAULT_PCT;
    state.options.push({ id: cryptoId(), text: text || '', weight: avg, locked: false });
    clearLocks();
  }

  // 选项名输入框里按回车的推进逻辑（见 keydown 绑定）
  function advanceFromTextInput(optId, currentValue) {
    if (state.busy) return;
    const rows = [...$list.querySelectorAll('.option-row')];
    const idx = state.options.findIndex(o => o.id === optId);
    if (idx < 0) return;
    // 不是最后一个 → 直接跳到下一个选项名
    if (idx < rows.length - 1) {
      const next = rows[idx + 1].querySelector('.opt-text');
      if (next) { next.focus(); next.select(); }
      return;
    }
    // 已是最后一个：当前项还空着 / 已达 10 个上限 → 不堆空行，把焦点交给"抽"按钮收尾
    if ((currentValue || '').trim() === '' || state.options.length >= 10) {
      if (!$spinBtn.disabled) $spinBtn.focus();
      return;
    }
    // 否则新建一个选项并聚焦
    appendOption('');
    markDirty();
    renderAll();
    const newRows = $list.querySelectorAll('.option-row');
    const lastText = newRows[newRows.length - 1] &&
      newRows[newRows.length - 1].querySelector('.opt-text');
    if (lastText) lastText.focus();
  }

  // 编辑占比后，把每行的滑块 / 数字框 / 禁用态同步成最新（exceptEl 是用户当前正操作的元素，跳过不覆盖）
  function syncWeightUI(exceptEl) {
    const pcts = displayPercents();
    const rows = $list.querySelectorAll('.option-row');
    rows.forEach((row, idx) => {
      const o = state.options[idx];
      const slider = row.querySelector('.opt-weight');
      const num = row.querySelector('.opt-weight-num');
      if (slider && slider !== exceptEl) slider.value = pcts[idx];
      if (num && num !== exceptEl && document.activeElement !== num) num.value = pcts[idx];
      const locked = !!(o && o.locked);
      if (slider) slider.disabled = locked;
      if (num) num.disabled = locked;
      row.classList.toggle('is-locked', locked);
    });
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── 渲染转盘 ──────────────────────────
  function renderWheel() {
    const cx = 100, cy = 100, r = 92;
    const ws = effectiveWeights();
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    let svg = '';
    state.options.forEach((opt, idx) => {
      const start = acc / total;
      acc += ws[idx];
      const end = acc / total;
      const a0 = start * Math.PI * 2 - Math.PI / 2;  // 起点：12 点方向 = -90°
      const a1 = end   * Math.PI * 2 - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const largeArc = (end - start) > 0.5 ? 1 : 0;
      const color = SLICE_COLORS[idx % SLICE_COLORS.length];
      svg += `<path class="slice" data-idx="${idx}" d="M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${color}" stroke="#fff" stroke-width="0.6"/>`;

      // 文字标签：沿半径方向、从边界往中心排，每个字保持正立（不侧向旋转）。字号只看扇区大小
      // 与字符宽度、不随字数缩小（名字上限 8 字，都排得下）；扇区太细（如权重 1%）字会太小 →
      // 只留颜色、靠列表色块图例认。
      const aMid = (a0 + a1) / 2;
      const sliceFraction = end - start;
      const name = (opt.text || '').trim();
      if (name && sliceFraction > 0.015) {
        svg += wheelLabelSvg(name, aMid, sliceFraction, cx, cy, r);
      }
    });
    $wheel.innerHTML = svg;
  }
  // 扇区文字：字符沿半径逐个正立排开（不旋转），阅读顺序从最上/最左的一端开始（自然顺读）。
  // 字号 = min( 8 个字排满半径的上限(与字数无关), 扇区内端弧宽, 硬上限 )，1~8 字同样大小；
  // 字号 < 4（扇区太细，如 1%）就不写字、只留颜色。
  function wheelLabelSvg(name, aMid, sliceFraction, cx, cy, r) {
    const chars = [...name];
    const n = chars.length;
    const rInner = r * 0.18, rOuter = r * 0.90;
    const availR = rOuter - rInner;
    const rMid = (rInner + rOuter) / 2;
    const arcInner = rInner * (2 * Math.PI * Math.min(sliceFraction, 0.5)); // 内端(最窄处)弧宽
    let fontSize = Math.min(availR / (8 * 1.06), arcInner * 0.95, 13);
    if (fontSize < 4) return '';                       // 扇区太细：只留颜色
    const step = fontSize * 1.06;
    const cosA = Math.cos(aMid), sinA = Math.sin(aMid);
    // 阅读起点在“最上”的一端（若近水平则取“最左”）：rim 端是否为起点
    const eps = 0.02;
    const rimIsStart = (sinA < -eps) ? true : (sinA > eps ? false : (cosA < 0));
    const sign = rimIsStart ? 1 : -1;
    let out = '';
    for (let i = 0; i < n; i++) {
      const rho = rMid + sign * ((n - 1) / 2 - i) * step;  // i 为阅读顺序
      const x = cx + rho * cosA, y = cy + rho * sinA;
      out += `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${fontSize.toFixed(2)}">${escapeHtml(chars[i])}</text>`;
    }
    return out;
  }

  // ── 转盘动画 ──────────────────────────
  // 关键设计：抽一个 [0, 360) 的均匀随机角度。指针停在哪个扇形里 = 中签项。
  // 这跟"先按权重 pick winner、再让指针停在该扇形中点"在概率上完全等价
  // （扇形面积比例 = 权重比例 = 落入概率），但视觉上：
  //   1) 指针落点是真随机的，不会总是停在扇形中点
  //   2) 几乎不可能落在两扇形交界（连续均匀分布上落在精确边界的概率 = 0）

  // 计算 spin 的目标 CSS rotation 值。关键是要正确处理 state.rotation 的累计：
  // 我们要让 wheel-position `theta` 落到指针下（screen 角 0），
  // 等价于 (theta + total_rotation) mod 360 === 0
  //     => total_rotation mod 360 === (360 - theta) mod 360
  // 新 target 必须满足 (target mod 360) === desiredMod，且至少多转 extraSpins 整圈
  function computeSpinTarget(theta, extraSpins) {
    const desiredMod = ((360 - theta) % 360 + 360) % 360;
    const currentMod = ((state.rotation % 360) + 360) % 360;
    // delta：在当前 mod 360 基础上还需要再转的角度，规约到 [0, 360)
    const delta = ((desiredMod - currentMod) % 360 + 360) % 360;
    return state.rotation + extraSpins * 360 + delta;
  }

  // 返回 winner 的 idx
  function spinTo(fast = false) {
    return new Promise(resolve => {
      const theta = Math.random() * 360;
      const winnerIdx = sliceAtAngle(theta);

      // 跳过动画：直接 snap
      if (state.skipAnimation) {
        $wheel.classList.remove('spinning', 'spinning-fast');
        void $wheel.offsetWidth;
        const target = computeSpinTarget(theta, 0);
        $wheel.style.transform = `rotate(${target}deg)`;
        state.rotation = target;
        setTimeout(() => resolve(winnerIdx), 220);
        return;
      }

      const extraSpins = fast ? 3 : 5;
      const target = computeSpinTarget(theta, extraSpins);
      $wheel.classList.remove('spinning', 'spinning-fast');
      void $wheel.offsetWidth;
      $wheel.classList.add(fast ? 'spinning-fast' : 'spinning');
      $wheel.style.transform = `rotate(${target}deg)`;
      state.rotation = target;

      let safety;
      const onEnd = (e) => {
        // 必须确认是 wheel 自己的 transform transition 结束。
        // SVG 子元素 .slice 的 filter / opacity transitionend 会冒泡到 $wheel，
        // 不过滤的话会提前 resolve，导致多次抽签时序混乱
        if (e.target !== $wheel || e.propertyName !== 'transform') return;
        $wheel.removeEventListener('transitionend', onEnd);
        clearTimeout(safety);
        resolve(winnerIdx);
      };
      $wheel.addEventListener('transitionend', onEnd);
      safety = setTimeout(() => {
        $wheel.removeEventListener('transitionend', onEnd);
        resolve(winnerIdx);
      }, fast ? 2200 : 3800);
    });
  }
  function highlightSlice(winnerIdx) {
    const slices = $wheel.querySelectorAll('.slice');
    slices.forEach((s, i) => {
      if (i === winnerIdx) {
        s.classList.add('win');
        s.classList.remove('dim');
      } else {
        s.classList.add('dim');
        s.classList.remove('win');
      }
    });
    // 选项行也高亮
    const rows = $list.querySelectorAll('.option-row');
    rows.forEach((row, i) => {
      row.classList.toggle('is-winner', i === winnerIdx);
    });
  }
  function clearHighlights() {
    $wheel.querySelectorAll('.slice').forEach(s => s.classList.remove('win', 'dim'));
    $list.querySelectorAll('.option-row').forEach(r => r.classList.remove('is-winner'));
  }

  // ── 计票面板 ──────────────────────────
  function buildTally() {
    const N = state.options.length;
    state.multiResults = [];
    $tallyBars.innerHTML = state.options.map((o, i) => {
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      const name = o.text || ('选项' + (i + 1));
      return `
        <div class="tally-col" data-idx="${i}">
          <div class="tally-medal">🥇</div>
          <div class="tally-bar-bg">
            <div class="tally-bar-fill" style="background:${color};"></div>
            <div class="tally-count">0</div>
          </div>
          <div class="tally-name" title="${escapeHtml(name)}"><span class="tally-dot" style="background:${color}"></span>${escapeHtml(name)}</div>
        </div>
      `;
    }).join('');
  }
  function updateTally() {
    const counts = state.options.map(() => 0);
    state.multiResults.forEach(idx => counts[idx]++);
    const max = Math.max(...counts);
    const cols = $tallyBars.querySelectorAll('.tally-col');
    cols.forEach((col, i) => {
      const fill = col.querySelector('.tally-bar-fill');
      const cnt = col.querySelector('.tally-count');
      const pct = max > 0 ? (counts[i] / max * 100) : 0;
      fill.style.height = pct + '%';
      cnt.textContent = counts[i];
    });
  }
  function markTallyWinner(winnerIdx) {
    $tallyBars.querySelectorAll('.tally-col').forEach((col, i) => {
      col.classList.toggle('is-winner', i === winnerIdx);
    });
  }

  // ── 主流程 ────────────────────────────
  async function spin() {
    if (state.busy) return;
    // 有拦截项（选项不足 / 超 8 字 / 空名字 / 占比 0）→ 不抽，红框高亮 + 提示
    const blk = spinBlockers();
    if (blk) { $spinHintText.textContent = blk.reason; flashBadOptions(blk.ids); return; }

    state.busy = true;
    state.skipAnimation = false;   // 每次点抽都重新计起
    $skipBtn.style.display = 'none';
    setSpinDisabled(true);
    $resetRow.style.display = 'none';
    $resultCopyBtn.style.display = 'none';
    $resultCopyBtn.classList.remove('copied');
    $resultCopyBtn.textContent = '📋 复制结果';
    clearHighlights();
    $result.innerHTML = '&nbsp;';

    // 首抽：宽屏下把转盘从居中滑向左边，给右侧结果/计票腾位；再抽时已在分栏状态，不再来回移动。
    if (!state.spun) { state.spun = true; $stage.classList.add('spun'); }

    // 把整个"舞台"（转盘 + 结果 + 计票）滚进视口，保证两者都完整可见。
    // 关键：顶部导航是 position:fixed，会盖住视口顶端一整条；这里按导航实际高度设
    // scroll-margin-top，避免转盘顶部 + 指针被裁掉（旧版固定 32px 补偿不了导航高度）。
    scrollStageIntoView();

    let resultText = '';
    if (state.draws === 1) {
      // 单次模式
      $tallyPnl.classList.remove('show');
      $spinHintText.textContent = '抽签中…';
      const winnerIdx = await spinTo(false);
      $spinHintText.textContent = '';
      highlightSlice(winnerIdx);
      const name = state.options[winnerIdx].text || ('选项' + (winnerIdx + 1));
      $result.innerHTML = `🎉 选中：<span class="winner-name">${escapeHtml(name)}</span>`;
      resultText = `🎉 抽中：${name}`;
      recordHistory({
        ts: Date.now(),
        winner: name,
        profile: getCurrentProfileName(),
        optionTexts: state.options.map(o => o.text || '?'),
        draws: 1,
      });
    } else {
      // 多次模式
      buildTally();
      $tallyPnl.classList.add('show');
      $tallyHdr.textContent = `第 0 / ${state.draws} 次`;
      const counts = state.options.map(() => 0);
      for (let n = 0; n < state.draws; n++) {
        $spinHintText.textContent = `第 ${n + 1} / ${state.draws} 次…`;
        $tallyHdr.textContent = `第 ${n + 1} / ${state.draws} 次`;
        const fast = n > 0;
        const idx = await spinTo(fast);
        // 短暂展示这次的结果
        clearHighlights();
        highlightSlice(idx);
        state.multiResults.push(idx);
        counts[idx]++;
        updateTally();

        // 第一次抽完之后亮出"跳过动画"按钮（如果还有后续轮、且用户没点过）
        if (n === 0 && state.draws > 1 && !state.skipAnimation) {
          $skipBtn.style.display = '';
        }

        // 间隔（跳过动画时也短一些）
        if (n < state.draws - 1) {
          await new Promise(r => setTimeout(r, state.skipAnimation ? 80 : 350));
          clearHighlights();
        }
      }
      $skipBtn.style.display = 'none';
      $spinHintText.textContent = '';
      // 找出冠军：先找最高票数，再在并列者中找"第一时间到达 max"的
      const max = Math.max(...counts);
      const tiedIdxs = [];
      counts.forEach((c, i) => { if (c === max) tiedIdxs.push(i); });
      let winnerIdx;
      if (tiedIdxs.length === 1) {
        winnerIdx = tiedIdxs[0];
      } else {
        // 重放 multiResults，记录每个并列者首次到达 max 的轮次
        const running = state.options.map(() => 0);
        const reachedAt = {};
        for (let n = 0; n < state.multiResults.length; n++) {
          const i = state.multiResults[n];
          running[i]++;
          if (running[i] === max && reachedAt[i] === undefined) reachedAt[i] = n;
        }
        winnerIdx = tiedIdxs[0];
        let earliest = reachedAt[winnerIdx];
        for (const i of tiedIdxs) {
          if (reachedAt[i] !== undefined && reachedAt[i] < earliest) {
            earliest = reachedAt[i];
            winnerIdx = i;
          }
        }
      }
      const tied = tiedIdxs.length > 1;
      markTallyWinner(winnerIdx);
      highlightSlice(winnerIdx);
      const name = state.options[winnerIdx].text || ('选项' + (winnerIdx + 1));
      if (tied) {
        $result.innerHTML = `🤝 平票（${max} 票，共 ${tiedIdxs.length} 项并列），<span class="winner-name">${escapeHtml(name)}</span> 第一时间达到 → 算它赢`;
        resultText = `🤝 平票 ${max} 票（${tiedIdxs.length} 项并列），${name} 首先到达`;
      } else {
        $result.innerHTML = `🥇 <span class="winner-name">${escapeHtml(name)}</span> 拿下 ${max} / ${state.draws} 票`;
        resultText = `🥇 ${name} 拿下 ${max} / ${state.draws} 票`;
      }
      recordHistory({
        ts: Date.now(),
        winner: name,
        profile: getCurrentProfileName(),
        optionTexts: state.options.map(o => o.text || '?'),
        draws: state.draws,
        tied,
      });
    }

    state.lastResultText = resultText;
    $resultCopyBtn.style.display = '';
    setSpinDisabled(false);
    $resetRow.style.display = '';
    state.busy = false;
  }

  function getCurrentProfileName() {
    const p = findProfile(state.currentProfileId);
    return p ? p.name : '';
  }

  function scrollStageIntoView() {
    const nav = document.querySelector('nav');
    const navH = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
    // +18：给指针（在转盘框上方 overhang ~8px）留余量 + 一点呼吸留白
    $stage.style.scrollMarginTop = (navH + 18) + 'px';
    $stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setSpinDisabled(disabled) {
    $spinBtn.disabled = disabled;
    $addBtn.disabled = disabled;
  }

  function reset() {
    if (state.busy) return;
    clearHighlights();
    $result.innerHTML = '&nbsp;';
    $resetRow.style.display = 'none';
    $resultCopyBtn.style.display = 'none';
    $resultCopyBtn.classList.remove('copied');
    $resultCopyBtn.textContent = '📋 复制结果';
    $tallyPnl.classList.remove('show');
    $spinHintText.textContent = '';
    $skipBtn.style.display = 'none';
    state.multiResults = [];
    state.skipAnimation = false;
    state.lastResultText = '';
  }

  function renderAll() {
    renderOptions();
    renderWheel();
    updateAddBtn();
    updateSpinBtn();
    updateWheelVisibility();
  }
  function updateAddBtn() {
    const atMax = state.options.length >= 10;
    $addBtn.disabled = atMax;
    $addBtn.textContent = atMax ? '已达上限（10 个选项）' : '+ 添加选项';
  }
  function nameLen(t) { return [...(t || '')].length; }
  function tooLongIds() {
    return state.options.filter(o => nameLen(o.text) > MAX_NAME_LEN).map(o => o.id);
  }
  // 抽签前的拦截项：返回 null 表示可抽，否则 { reason, ids }（ids 是要高亮的选项）
  function spinBlockers() {
    if (state.options.length < 2) return { reason: '至少需要两个选项', ids: [] };
    const tl = tooLongIds();
    if (tl.length) return { reason: `有选项超过 ${MAX_NAME_LEN} 个字，请改短`, ids: tl };
    const bl = state.options.filter(o => (o.text || '').trim() === '').map(o => o.id);
    if (bl.length) return { reason: `还有 ${bl.length} 个选项没填名字`, ids: bl };
    if (totalWeight() <= 0) return { reason: '所有占比为 0，至少给一项设置占比 > 0', ids: [] };
    return null;
  }
  // 抽不了时，把有问题的那几行红框闪一下并聚焦第一处
  function flashBadOptions(ids) {
    ids.forEach(id => {
      const row = $list.querySelector(`.option-row[data-id="${id}"]`);
      if (!row) return;
      row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
      setTimeout(() => row.classList.remove('flash'), 800);
    });
    const first = ids[0] && $list.querySelector(`.option-row[data-id="${ids[0]}"] .opt-text`);
    if (first) first.focus();
  }
  function updateSpinBtn() {
    // 只有抽签中才禁用按钮；其它无效情况（空名字/超 8 字/占比 0）按钮仍可点，
    // 点了会在 spin() 里给红框高亮 + 提示，而不是把按钮灰掉、用户不知为何抽不了。
    $spinBtn.disabled = state.busy;
    const blk = state.busy ? null : spinBlockers();
    if (blk) $spinHintText.textContent = blk.reason;
    else if (!state.busy) $spinHintText.textContent = '';
  }
  // 宽屏"转盘居中→首抽滑向左"的收回：换方案 / 载入分享链接等新语境时回到居中
  function unspin() {
    state.spun = false;
    $stage.classList.remove('spun');
  }
  function updateWheelVisibility() {
    $wheelZone.style.display = state.options.length >= 2 ? '' : 'none';
  }

  // ── 事件绑定 ──────────────────────────
  $addBtn.addEventListener('click', () => {
    if (state.busy || state.options.length >= 10) return;
    appendOption('');
    markDirty();
    renderAll();
  });
  // 平均分配：把所有选项占比拉平（每项 100/n），并解除全部锁定
  $equalBtn.addEventListener('click', () => {
    if (state.busy) return;
    equalizeWeights();
    markDirty();
    renderOptions();   // 重画各行的滑块 / 数字框 / 锁定态
    renderWheel();
    updateSpinBtn();
    showToast('已平均分配');
  });
  function setActivePreset(btnOrNull) {
    $drawsGrp.querySelectorAll('button[data-draws]').forEach(b => {
      b.classList.toggle('active', b === btnOrNull);
    });
    $drawsCustom.classList.toggle('active', !btnOrNull);
  }

  $drawsGrp.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-draws]');
    if (!btn || state.busy) return;
    const newDraws = Number(btn.dataset.draws);
    if (newDraws !== state.draws) {
      state.draws = newDraws;
      markDirty();
    }
    setActivePreset(btn);
    // 切到 preset 时清空自定义框，免得视觉上同时有"自定义已填值 + 别的 pill 高亮"的歧义
    $drawsCustom.value = '';
    reset();
  });

  // 自定义抽签次数：用户输入数字 → 立即生效（约束到 1-100）
  $drawsCustom.addEventListener('input', () => {
    if (state.busy) return;
    const raw = $drawsCustom.value.trim();
    if (raw === '') {
      // 输入框被清空：fall back 到 1（保证 state 始终有效）
      if (state.draws !== 1) markDirty();
      state.draws = 1;
      const presetBtn = $drawsGrp.querySelector('button[data-draws="1"]');
      setActivePreset(presetBtn);
      reset();
      return;
    }
    let n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > DRAWS_MAX) n = DRAWS_MAX;
    if (n !== state.draws) markDirty();
    state.draws = n;
    setActivePreset(null);  // 当前激活态归到 custom 输入框
    reset();
  });

  // 失焦时把超界 / 非数字的 raw 值规范化展示出来
  $drawsCustom.addEventListener('blur', () => {
    const raw = $drawsCustom.value.trim();
    if (raw === '') return;  // 空就保持空（placeholder 显示）
    let n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > DRAWS_MAX) n = DRAWS_MAX;
    $drawsCustom.value = String(n);
  });
  $spinBtn.addEventListener('click', spin);
  $resetBtn.addEventListener('click', () => {
    if (state.busy) return;
    reset();
    // 名字叫"再抽一次"，就真的再抽
    spin();
  });
  $skipBtn.addEventListener('click', () => {
    state.skipAnimation = true;
    $skipBtn.style.display = 'none';
  });

  // ── Profile 事件绑定 ──────────────────
  // 存为新档案（把当前选项另存）
  $profileNewBtn.addEventListener('click', () => {
    if (state.busy) return;
    const name = prompt('给这套选项起个档案名：', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('档案名不能为空');
      return;
    }
    if (state.profiles.some(p => p.name === trimmed)) {
      if (!confirm(`已经有同名档案「${trimmed}」，确定要再建一个？`)) return;
    }
    createProfile(trimmed);
  });

  // 保存改动到当前档案
  $profileSaveBtn.addEventListener('click', () => {
    if (state.busy || !state.currentProfileId) return;
    saveCurrentToProfile();
  });

  // ── 分享按钮 ──────────────────────────
  $profileShareBtn.addEventListener('click', async () => {
    if (state.busy) return;
    const hash = encodeStateToHash();
    if (!hash) {
      showToast('至少需要两个有名字的选项才能分享');
      return;
    }
    const url = `${location.origin}${location.pathname}${hash}`;
    history.replaceState(null, '', hash);
    try {
      await navigator.clipboard.writeText(url);
      showToast('分享链接已复制');
    } catch (e) {
      // clipboard 失败：URL 已经在地址栏，提示用户自己复制
      showToast('已写入地址栏，请手动复制');
    }
  });

  // ── 复制结果 ──────────────────────────
  $resultCopyBtn.addEventListener('click', async () => {
    if (!state.lastResultText) return;
    try {
      await navigator.clipboard.writeText(state.lastResultText);
      $resultCopyBtn.textContent = '✓ 已复制';
      $resultCopyBtn.classList.add('copied');
      setTimeout(() => {
        $resultCopyBtn.textContent = '📋 复制结果';
        $resultCopyBtn.classList.remove('copied');
      }, 1600);
    } catch (e) {
      showToast('复制失败：浏览器不支持');
    }
  });

  // ── 历史清空 ──────────────────────────
  $historyClearBtn.addEventListener('click', () => {
    if (state.history.length === 0) return;
    if (!confirm('确定清空全部抽签历史？')) return;
    clearHistory();
    showToast('历史已清空');
  });

  // ── 历史每页条数 ──────────────────────
  $historyPerpage.addEventListener('change', () => {
    const v = parseInt($historyPerpage.value, 10);
    if (!isNaN(v) && v > 0) {
      state.historyPerPage = v;
      state.historyPage = 1;
      try { localStorage.setItem(HISTORY_PERPAGE_KEY, String(v)); } catch (e) {}
      renderHistory();
    }
  });

  // ── 键盘快捷键：Space / Enter 抽签 ─────
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    // 焦点在输入元素时不拦截
    const t = document.activeElement;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/i.test(t.tagName)) return;
    if (t && t.isContentEditable) return;
    // 焦点在普通按钮上时让默认行为走（避免 Space 重复触发当前 button + spin）
    if (t && t.tagName === 'BUTTON' && t !== document.body) return;
    if ($spinBtn.disabled || state.busy) return;
    e.preventDefault();
    spin();
  });

  // ── hash 变化时（用户回退/前进）重新加载 ─
  window.addEventListener('hashchange', () => {
    if (state.busy) return;
    if (tryApplyHashToState()) {
      state.currentProfileId = null;
      markClean();
      renderAll();
      updateDrawsUI();
      renderProfileList();
      reset();
      unspin();        // 载入分享链接 → 转盘回到居中
    }
  });

  // ── 初始化 ────────────────────────────
  state.profiles = loadProfilesFromStorage();
  state.history  = loadHistoryFromStorage();
  // 每页条数：填充下拉 + 读回上次选择
  try {
    const saved = parseInt(localStorage.getItem(HISTORY_PERPAGE_KEY), 10);
    if (!isNaN(saved) && saved > 0) state.historyPerPage = saved;
  } catch (e) {}
  if ($historyPerpage) {
    $historyPerpage.innerHTML = HISTORY_PERPAGE_OPTIONS
      .map(v => `<option value="${v}"${v === state.historyPerPage ? ' selected' : ''}>${v}</option>`).join('');
  }
  // 如果 URL 里有 #options=...，优先用 hash 的内容（覆盖默认 options）
  tryApplyHashToState();
  renderProfileList();
  renderHistory();
  renderAll();
  updateDrawsUI();
})();
