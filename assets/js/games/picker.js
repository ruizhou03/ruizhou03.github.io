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
    options: [
      { id: cryptoId(), text: '火锅',     weight: 5 },
      { id: cryptoId(), text: '烧烤',     weight: 5 },
      { id: cryptoId(), text: '沙县小吃', weight: 5 },
    ],
    draws: 1,
    busy: false,
    rotation: 0,            // 当前累积旋转角度（CSS）
    multiResults: [],       // 多次模式下每次抽到的 idx
    skipAnimation: false,   // 用户在多次模式中点了"跳过动画"
    profiles: [],           // 本地存的所有方案（从 localStorage 读取）
    currentProfileId: null, // 当前加载的方案 id；null = 未选择
    dirty: false,           // 当前选项相对于已加载方案是否有未保存的修改
    history: [],            // 抽签历史（最近 10 条），从 localStorage 读取
    lastResultText: '',     // 最近一次的结果纯文本（用于复制）
  };
  const HISTORY_MAX = 10;

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
      weight: o.weight,
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
    renderProfileBar();
    showToast('已新建方案');
  }
  function saveCurrentToProfile() {
    const p = findProfile(state.currentProfileId);
    if (!p) return;
    p.options = snapshotCurrentOptions();
    p.draws = state.draws;
    saveProfilesToStorage();
    markClean();
    showToast('已保存修改');
  }
  function renameCurrentProfile(newName) {
    const p = findProfile(state.currentProfileId);
    if (!p) return;
    p.name = newName;
    saveProfilesToStorage();
    renderProfileBar();
  }
  function deleteCurrentProfile() {
    state.profiles = state.profiles.filter(p => p.id !== state.currentProfileId);
    saveProfilesToStorage();
    state.currentProfileId = null;
    markClean();
    renderProfileBar();
    showToast('已删除');
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
    saveHistoryToStorage();
    renderHistory();
  }
  function clearHistory() {
    state.history = [];
    saveHistoryToStorage();
    renderHistory();
  }
  function renderHistory() {
    const n = state.history.length;
    $historyCount.textContent = n > 0 ? `（${n}）` : '';
    if (n === 0) {
      $historyList.innerHTML = '<p class="history-empty">还没有抽签记录。</p>';
      return;
    }
    $historyList.innerHTML = state.history.map(h => {
      const dt = new Date(h.ts);
      const timeStr = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      const fromStr = h.profile ? h.profile : (h.optionTexts || []).join(' · ');
      const drawsStr = (h.draws && h.draws > 1) ? ` · ${h.draws} 次` : '';
      return `<div class="history-item">
        <span class="history-winner">${escapeHtml(h.winner || '?')}</span>
        <span class="history-from">${escapeHtml(fromStr)}${drawsStr}</span>
        <span class="history-meta">${escapeHtml(timeStr)}</span>
      </div>`;
    }).join('');
  }

  // ── URL Hash 分享 ────────────────────
  // 格式：#options=encode(text):weight,encode(text):weight,...&draws=N
  function encodeStateToHash() {
    const items = state.options
      .filter(o => (o.text || '').trim() !== '')
      .map(o => `${encodeURIComponent(o.text.trim())}:${Math.max(0, Math.min(10, o.weight | 0))}`);
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
        const w = parseInt(s.slice(colonIdx + 1), 10);
        if (!text) return null;
        return {
          id: cryptoId(),
          text: text.slice(0, 20),
          weight: Math.max(0, Math.min(10, isNaN(w) ? 5 : w)),
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

  function renderProfileBar() {
    // 重建 select
    const prevValue = state.currentProfileId || '';
    $profileSelect.innerHTML = '<option value="">（未选择方案）</option>';
    state.profiles.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === state.currentProfileId) opt.selected = true;
      $profileSelect.appendChild(opt);
    });
    if (!findProfile(state.currentProfileId)) {
      state.currentProfileId = null;
      $profileSelect.value = '';
    } else {
      $profileSelect.value = state.currentProfileId;
    }
    // 操作按钮按是否有选中方案来显示
    const has = !!state.currentProfileId;
    $profileSaveBtn.style.display   = has ? '' : 'none';
    $profileRenameBtn.style.display = has ? '' : 'none';
    $profileDeleteBtn.style.display = has ? '' : 'none';
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
  const $profileSelect    = document.getElementById('profile-select');
  const $profileSaveBtn   = document.getElementById('profile-save-btn');
  const $profileRenameBtn = document.getElementById('profile-rename-btn');
  const $profileDeleteBtn = document.getElementById('profile-delete-btn');
  const $profileNewBtn    = document.getElementById('profile-new-btn');
  const $profileShareBtn  = document.getElementById('profile-share-btn');
  const $profileToast     = document.getElementById('profile-toast');
  const $wheelZone        = document.getElementById('wheel-zone');
  const $resultCopyBtn    = document.getElementById('result-copy-btn');
  const $historyList      = document.getElementById('history-list');
  const $historyCount     = document.getElementById('history-count');
  const $historyClearBtn  = document.getElementById('history-clear-btn');
  const $ioTextarea       = document.getElementById('io-textarea');
  const $ioExportBtn      = document.getElementById('io-export-btn');
  const $ioCopyBtn        = document.getElementById('io-copy-btn');
  const $ioImportBtn      = document.getElementById('io-import-btn');

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
    const ws = effectiveWeights();
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    state.options.forEach((opt, idx) => {
      const row = document.createElement('div');
      row.className = 'option-row';
      row.dataset.id = opt.id;
      const pct = total > 0 ? (ws[idx] / total * 100) : 0;
      row.innerHTML = `
        <button type="button" class="opt-del" aria-label="删除选项" ${state.options.length <= 2 ? 'disabled' : ''}>✕</button>
        <input type="text" class="opt-text" value="${escapeHtml(opt.text)}" placeholder="选项 ${idx + 1}" maxlength="20" />
        <input type="range" class="opt-weight" min="0" max="10" step="1" value="${opt.weight}" />
        <span class="opt-pct">${pct.toFixed(0)}%</span>
      `;
      // 事件
      row.querySelector('.opt-del').addEventListener('click', () => {
        if (state.busy) return;
        if (state.options.length <= 2) return;
        const idx = state.options.findIndex(o => o.id === opt.id);
        if (idx < 0) return;
        const removed = state.options.splice(idx, 1)[0];
        markDirty();
        renderAll();
        showToast(`已删除"${removed.text || ('选项' + (idx + 1))}"`, {
          label: '撤销',
          onClick: () => {
            if (state.options.length >= 10) return;
            state.options.splice(idx, 0, removed);
            markDirty();
            renderAll();
          },
        });
      });
      row.querySelector('.opt-text').addEventListener('input', (e) => {
        opt.text = e.target.value;
        markDirty();
        renderWheel();   // 文字变了要重画转盘
      });
      row.querySelector('.opt-weight').addEventListener('input', (e) => {
        opt.weight = Number(e.target.value);
        markDirty();
        renderOptionsPct();
        renderWheel();
        updateSpinBtn();
      });
      $list.appendChild(row);
    });
  }
  function renderOptionsPct() {
    const ws = effectiveWeights();
    const total = ws.reduce((a, b) => a + b, 0) || 1;
    const rows = $list.querySelectorAll('.option-row');
    rows.forEach((row, idx) => {
      const pct = ws[idx] / total * 100;
      row.querySelector('.opt-pct').textContent = pct.toFixed(0) + '%';
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

      // 文字标签：放在切片角度中点，半径 60% 处
      const aMid = (a0 + a1) / 2;
      const sliceFraction = end - start;
      if (sliceFraction > 0.04) {  // 至少占 4% 才放文字
        const tx = cx + r * 0.6 * Math.cos(aMid);
        const ty = cy + r * 0.6 * Math.sin(aMid);
        // 下半圆（sin(aMid) > 0，即 y > cy）多旋 180°，避免文字倒着读
        let rotDeg = (aMid * 180 / Math.PI) + 90;
        if (Math.sin(aMid) > 0) rotDeg += 180;
        const fontSize = sliceFraction > 0.18 ? 8.5 : (sliceFraction > 0.10 ? 7 : 5.6);
        const label = truncateLabel(opt.text || ('选项' + (idx + 1)), sliceFraction);
        svg += `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" transform="rotate(${rotDeg.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})" font-size="${fontSize}">${escapeHtml(label)}</text>`;
      }
    });
    $wheel.innerHTML = svg;
  }
  function truncateLabel(text, fraction) {
    // 切片越大允许越长。粗略：每 0.06 片段允许 1 个字
    const maxChars = Math.max(2, Math.floor(fraction * 16));
    if ([...text].length > maxChars) {
      return [...text].slice(0, maxChars - 1).join('') + '…';
    }
    return text;
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
      return `
        <div class="tally-col" data-idx="${i}">
          <div class="tally-medal">🥇</div>
          <div class="tally-bar-bg">
            <div class="tally-bar-fill" style="background:${color};"></div>
            <div class="tally-count">0</div>
          </div>
          <div class="tally-name">${escapeHtml(o.text || ('选项' + (i + 1)))}</div>
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
    if (state.options.length < 2) return;
    if (totalWeight() <= 0) return;

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

    // 把转盘 zone 滚到视口顶——保证手机上转盘 + 结果 + 计票都同时可见
    // 不用纠结"已经在视口里了要不要滚"——smooth scroll 距离零时本来也不会有视觉干扰
    $wheel.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
  function updateSpinBtn() {
    const enoughOpts = state.options.length >= 2;
    const hasWeight = totalWeight() > 0;
    $spinBtn.disabled = !enoughOpts || !hasWeight || state.busy;
    if (!enoughOpts) {
      $spinHintText.textContent = '至少需要两个选项';
    } else if (!hasWeight) {
      $spinHintText.textContent = '所有权重为 0，至少给一项设置权重 > 0';
    } else if (!state.busy) {
      $spinHintText.textContent = '';
    }
  }
  function updateWheelVisibility() {
    $wheelZone.style.display = state.options.length >= 2 ? '' : 'none';
  }

  // ── 事件绑定 ──────────────────────────
  $addBtn.addEventListener('click', () => {
    if (state.busy || state.options.length >= 10) return;
    state.options.push({ id: cryptoId(), text: '', weight: 5 });
    markDirty();
    renderAll();
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
  $profileSelect.addEventListener('change', (e) => {
    if (state.busy) {
      // 抽签中不让切，但要把 select 拉回去
      $profileSelect.value = state.currentProfileId || '';
      return;
    }
    // 切走前如果有未保存修改，提示
    if (state.dirty && state.currentProfileId) {
      const p = findProfile(state.currentProfileId);
      const pName = p ? p.name : '当前方案';
      if (!confirm(`「${pName}」有未保存的修改，切换会丢失。\n确定继续？`)) {
        $profileSelect.value = state.currentProfileId;
        return;
      }
    }
    const id = e.target.value;
    if (!id) {
      // "（未选择方案）"——清掉关联，保留当前选项内容不变
      state.currentProfileId = null;
      markClean();
      renderProfileBar();
      return;
    }
    const p = findProfile(id);
    if (!p) return;
    applyProfileToState(p);
    state.currentProfileId = id;
    markClean();
    renderAll();
    updateDrawsUI();
    renderProfileBar();
    reset();
  });

  $profileNewBtn.addEventListener('click', () => {
    if (state.busy) return;
    const name = prompt('给这个方案起个名字：', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('方案名不能为空');
      return;
    }
    if (state.profiles.some(p => p.name === trimmed)) {
      if (!confirm(`已经有同名方案"${trimmed}"，确定要再建一个？`)) return;
    }
    createProfile(trimmed);
  });

  $profileSaveBtn.addEventListener('click', () => {
    if (state.busy || !state.currentProfileId) return;
    saveCurrentToProfile();
  });

  $profileRenameBtn.addEventListener('click', () => {
    if (state.busy || !state.currentProfileId) return;
    const p = findProfile(state.currentProfileId);
    if (!p) return;
    const name = prompt('新方案名：', p.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('方案名不能为空');
      return;
    }
    renameCurrentProfile(trimmed);
    showToast('已重命名');
  });

  $profileDeleteBtn.addEventListener('click', () => {
    if (state.busy || !state.currentProfileId) return;
    const p = findProfile(state.currentProfileId);
    if (!p) return;
    if (!confirm(`确定要删除方案"${p.name}"吗？此操作不可恢复。`)) return;
    deleteCurrentProfile();
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

  // ── 导入 / 导出 ───────────────────────
  $ioExportBtn.addEventListener('click', () => {
    if (state.profiles.length === 0) {
      $ioTextarea.value = '[]';
      showToast('还没有方案可以导出');
      return;
    }
    const exportData = state.profiles.map(p => ({
      name: p.name,
      options: p.options,
      draws: p.draws || 1,
    }));
    $ioTextarea.value = JSON.stringify(exportData, null, 2);
    $ioTextarea.focus();
    $ioTextarea.select();
  });
  $ioCopyBtn.addEventListener('click', async () => {
    if (!$ioTextarea.value.trim()) {
      showToast('文本框是空的');
      return;
    }
    try {
      await navigator.clipboard.writeText($ioTextarea.value);
      showToast('已复制到剪贴板');
    } catch (e) {
      $ioTextarea.focus();
      $ioTextarea.select();
      showToast('剪贴板不可用，请手动 Cmd/Ctrl+C');
    }
  });
  $ioImportBtn.addEventListener('click', () => {
    if (state.busy) return;
    const raw = $ioTextarea.value.trim();
    if (!raw) {
      showToast('请先把方案 JSON 粘贴进来');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      showToast('JSON 解析失败：格式不对');
      return;
    }
    if (!Array.isArray(parsed)) {
      showToast('JSON 应该是一个方案数组');
      return;
    }
    const cleaned = [];
    for (const p of parsed) {
      if (!p || typeof p.name !== 'string' || !Array.isArray(p.options)) continue;
      const opts = p.options
        .filter(o => o && typeof o.text === 'string')
        .map(o => ({
          text: o.text.slice(0, 20),
          weight: Math.max(0, Math.min(10, Number(o.weight) | 0)),
        }));
      if (opts.length < 2) continue;
      cleaned.push({
        id: cryptoId(),
        name: p.name.slice(0, 40),
        options: opts,
        draws: Math.max(1, Math.min(100, Number(p.draws) || 1)),
        createdAt: Date.now(),
      });
    }
    if (cleaned.length === 0) {
      showToast('没找到有效方案');
      return;
    }
    const msg = `将导入 ${cleaned.length} 个方案（追加到现有 ${state.profiles.length} 个之后）。确定？`;
    if (!confirm(msg)) return;
    state.profiles = state.profiles.concat(cleaned);
    saveProfilesToStorage();
    renderProfileBar();
    showToast(`已导入 ${cleaned.length} 个方案`);
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
      renderProfileBar();
      reset();
    }
  });

  // ── 初始化 ────────────────────────────
  state.profiles = loadProfilesFromStorage();
  state.history  = loadHistoryFromStorage();
  // 如果 URL 里有 #options=...，优先用 hash 的内容（覆盖默认 options）
  tryApplyHashToState();
  renderProfileBar();
  renderHistory();
  renderAll();
  updateDrawsUI();
})();
