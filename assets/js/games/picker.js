(function () {
  'use strict';

  var Core = window.PickerCore;
  if (!Core) return;

  var COLORS = ['#b56f61', '#657f3f', '#426d9c', '#9a702f', '#79567f', '#3f7472', '#8b5f43', '#536983', '#8c5265', '#46673b'];
  var PROFILE_KEY = 'picker.profiles.v2';
  var LEGACY_PROFILE_KEY = 'picker.profiles.v1';
  var HISTORY_KEY = 'picker.history.v2';
  var LEGACY_HISTORY_KEY = 'picker.history.v1';
  var HISTORY_MAX = 200;

  var state = {
    options: [makeOption('', 50), makeOption('', 50)],
    weighted: true,
    mode: 'single',
    count: 1,
    rounds: 5,
    busy: false,
    rotation: 0,
    profiles: [],
    currentProfileId: null,
    dirty: false,
    history: [],
    historyVisible: 10,
    metricView: 'weights',
    liveCounts: [],
    lastResultText: '',
    lastExport: null,
    lastTournament: null,
    tieCandidates: [],
    metricView: 'weights',
    liveCounts: [],
    animationSkip: null,
    pendingHash: false
  };

  var libraryCloseTimer = 0;
  var currentLibrary = '';

  var el = {
    app: byId('picker-app'),
    editor: document.querySelector('.picker-editor'),
    draw: document.querySelector('.picker-draw'),
    modePanel: document.querySelector('.picker-mode-panel'),
    list: byId('options-list'),
    optionCount: byId('option-count'),
    add: byId('add-btn'),
    bulkToggle: byId('bulk-toggle-btn'),
    bulkPanel: byId('bulk-panel'),
    bulkInput: byId('bulk-input'),
    bulkApply: byId('bulk-apply-btn'),
    bulkCancel: byId('bulk-cancel-btn'),
    weighted: byId('weighted-toggle'),
    weightTools: byId('weight-tools'),
    equal: byId('equal-btn'),
    modeTabs: byId('mode-tabs'),
    multipleSetting: byId('multiple-setting'),
    multipleCount: byId('multiple-count'),
    tournamentSetting: byId('tournament-setting'),
    roundPresets: byId('round-presets'),
    roundsCustom: byId('rounds-custom'),
    wheel: byId('wheel'),
    spin: byId('spin-btn'),
    skip: byId('skip-btn'),
    status: byId('picker-status'),
    resultPlaceholder: byId('result-placeholder'),
    resultCard: byId('result-card'),
    resultEyebrow: byId('result-eyebrow'),
    resultMain: byId('result-main'),
    tally: byId('tally'),
    again: byId('again-btn'),
    copyResult: byId('copy-result-btn'),
    tieBreak: byId('tie-break-btn'),
    metricSwitch: byId('metric-switch'),
    metricLabel: byId('option-metric-label'),
    profilesTrigger: byId('profiles-trigger'),
    profileCount: byId('profile-count'),
    profileEmpty: byId('profile-empty'),
    profileList: byId('profile-list'),
    profileNew: byId('profile-new-btn'),
    profileSave: byId('profile-save-btn'),
    share: byId('share-btn'),
    historyTrigger: byId('history-trigger'),
    historyCount: byId('history-count'),
    historyEmpty: byId('history-empty'),
    historyList: byId('history-list'),
    historyMore: byId('history-more-btn'),
    historyClear: byId('history-clear-btn'),
    libraryFlyout: byId('library-flyout'),
    libraryTitle: byId('library-title'),
    librarySearch: byId('library-search'),
    libraryClose: byId('library-close'),
    libraryContent: byId('library-content'),
    profilesPanel: byId('profiles-panel'),
    historyPanel: byId('history-panel'),
    toast: byId('picker-toast')
  };

  function byId(id) { return document.getElementById(id); }
  function makeOption(text, weight) { return { id: Core.id(), text: text || '', weight: weight || 1, locked: false }; }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function lockIcon() {
    return '<svg class="picker-lock-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="picker-lock-shackle-closed" d="M8 10V7a4 4 0 0 1 8 0v3"></path><path class="picker-lock-shackle-open" d="M8 10V7a4 4 0 0 1 7-2.6"></path><rect x="5" y="10" width="14" height="11" rx="2"></rect><path d="M12 14v3"></path></svg>';
  }

  var viewportFitFrame = 0;
  function updateViewportFit() {
    var visual = window.visualViewport;
    var viewportHeight = Math.round(visual ? visual.height : window.innerHeight);
    var nav = document.querySelector('body > nav');
    var navHeight = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
    var available = Math.max(360, viewportHeight - navHeight - 8);
    document.documentElement.style.setProperty('--picker-nav-height', navHeight + 'px');
    document.documentElement.style.setProperty('--picker-viewport-height', available + 'px');
    el.app.dataset.fit = available < 600 ? 'tight' : (available < 720 ? 'compact' : 'normal');
    el.app.dataset.visualScale = String(Math.round(((visual && visual.scale) || 1) * 100) / 100);
    el.app.dataset.pixelRatio = String(Math.round((window.devicePixelRatio || 1) * 100) / 100);
  }
  function scheduleViewportFit() {
    cancelAnimationFrame(viewportFitFrame);
    viewportFitFrame = requestAnimationFrame(updateViewportFit);
  }

  function readStorage(key, fallback) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) { return fallback; }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      toast('浏览器存储不可用，未能保存');
      return false;
    }
  }

  var toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.hidden = false;
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 2400);
  }

  function clearSharedHash() {
    if (!/^#(?:picker=|options=)/.test(location.hash)) return;
    history.replaceState(null, '', location.pathname + location.search);
  }

  function markChanged() {
    state.dirty = true;
    clearSharedHash();
    clearOutcome();
    renderProfileSaveState();
  }

  function markClean() {
    state.dirty = false;
    renderProfileSaveState();
  }

  function clearOutcome() {
    if (state.busy) return;
    state.lastResultText = '';
    state.lastExport = null;
    state.lastTournament = null;
    state.tieCandidates = [];
    state.liveCounts = [];
    state.metricView = 'weights';
    el.resultPlaceholder.hidden = false;
    el.resultPlaceholder.textContent = '转一下，答案就会出现。';
    el.resultCard.hidden = true;
    el.tieBreak.hidden = true;
    el.tally.hidden = true;
    el.tally.innerHTML = '';
    clearHighlights();
    renderMetricState();
  }

  function currentConfig() {
    var options = state.options.map(function (option) {
      return { text: option.text.trim(), weight: state.weighted ? option.weight : 1 };
    });
    return {
      options: options,
      weighted: state.weighted,
      mode: state.mode,
      count: state.count,
      rounds: state.rounds
    };
  }

  function applyConfig(config) {
    if (!config) return false;
    state.options = config.options.map(function (option) { return makeOption(option.text, option.weight); });
    state.weighted = true;
    state.mode = config.mode;
    state.count = config.count;
    state.rounds = config.rounds;
    state.currentProfileId = null;
    markClean();
    clearOutcome();
    renderAll();
    return true;
  }

  function loadProfiles() {
    var profiles = readStorage(PROFILE_KEY, null);
    if (profiles) return profiles.filter(validProfile);
    var legacy = readStorage(LEGACY_PROFILE_KEY, []);
    return legacy.map(function (profile) {
      var draws = Math.max(1, Number(profile.draws) || 1);
      return {
        id: profile.id || Core.id(),
        name: String(profile.name || '未命名档案').slice(0, 60),
        config: Core.normalizeConfig({
          options: profile.options,
          weighted: true,
          mode: draws > 1 ? 'tournament' : 'single',
          rounds: draws
        }),
        createdAt: profile.createdAt || Date.now()
      };
    }).filter(validProfile);
  }

  function validProfile(profile) {
    return profile && profile.id && profile.name && Core.normalizeConfig(profile.config);
  }

  function loadHistory() {
    var historyItems = readStorage(HISTORY_KEY, null);
    if (historyItems) return historyItems.slice(0, HISTORY_MAX);
    return readStorage(LEGACY_HISTORY_KEY, []).slice(0, HISTORY_MAX).map(function (item) {
      return {
        ts: item.ts || Date.now(),
        result: item.winner || '未知结果',
        detail: item.draws > 1 ? String(item.draws) + ' 轮决胜' : '抽一个'
      };
    });
  }

  function renderOptions() {
    var display = Core.displayPercentages(state.options);
    el.list.innerHTML = '';
    state.options.forEach(function (option, index) {
      var row = document.createElement('div');
      row.className = 'picker-option';
      row.dataset.id = option.id;
      var color = COLORS[index % COLORS.length];
      row.innerHTML =
        '<span class="picker-option-marker" aria-hidden="true"><span class="picker-option-chip" style="background:' + color + '"></span><small>' + String(index + 1).padStart(2, '0') + '</small></span>' +
        '<input class="picker-option-input" type="text" maxlength="' + Core.MAX_NAME_LENGTH + '" value="' + escapeHtml(option.text) + '" placeholder="选项 ' + (index + 1) + '" aria-label="选项 ' + (index + 1) + '">' +
        '<button type="button" class="picker-option-delete" aria-label="删除' + (option.text ? '“' + escapeHtml(option.text) + '”' : '选项 ' + (index + 1)) + '"' + (state.options.length <= 2 ? ' disabled' : '') + '>[[zi:trash]]</button>' +
        '<div class="picker-weight-row"' + (state.weighted && state.metricView === 'weights' ? '' : ' hidden') + '>' +
          '<input class="picker-weight-range" type="range" min="1" max="99" step="1" value="' + display[index] + '" aria-label="' + escapeHtml(option.text || ('选项 ' + (index + 1))) + '的概率"' + (option.locked ? ' disabled' : '') + '>' +
          '<span class="picker-percent-wrap"><input class="picker-percent-input" type="number" min="1" max="99" step="1" inputmode="numeric" value="' + display[index] + '" aria-label="' + escapeHtml(option.text || ('选项 ' + (index + 1))) + '的概率百分比"' + (option.locked ? ' disabled' : '') + '></span>' +
          '<button type="button" class="picker-option-lock" aria-pressed="' + (option.locked ? 'true' : 'false') + '" aria-label="' + (option.locked ? '解除概率锁定' : '锁定当前概率') + '" title="' + (option.locked ? '已锁定，点击解除' : '锁定后调整其他项不会改变它') + '">' + lockIcon() + '</button>' +
        '</div>' +
        '<div class="picker-live-row"' + (state.metricView === 'votes' ? '' : ' hidden') + '><span class="picker-live-track"><span class="picker-live-fill"></span></span><strong class="picker-live-count">0 票</strong></div>';

      var nameInput = row.querySelector('.picker-option-input');
      var deleteButton = row.querySelector('.picker-option-delete');
      var range = row.querySelector('.picker-weight-range');
      var percentInput = row.querySelector('.picker-percent-input');
      var lockButton = row.querySelector('.picker-option-lock');

      nameInput.addEventListener('input', function () {
        option.text = nameInput.value;
        markChanged();
        renderWheel();
        updateControls();
      });
      nameInput.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        focusNextOption(index);
      });
      deleteButton.addEventListener('click', function () {
        if (state.busy || state.options.length <= 2) return;
        var removedName = option.text || ('选项 ' + (index + 1));
        state.options.splice(index, 1);
        Core.equalize(state.options);
        state.count = Math.min(state.count, Math.max(1, state.options.length - 1));
        markChanged();
        renderAll();
        toast('已删除“' + removedName + '”');
      });
      range.addEventListener('input', function () {
        Core.rebalance(state.options, index, Number(range.value));
        markChanged();
        syncWeightInputs(index);
        renderWheel();
      });
      percentInput.addEventListener('input', function () {
        if (percentInput.value === '') return;
        Core.rebalance(state.options, index, Number(percentInput.value));
        markChanged();
        syncWeightInputs(index, percentInput);
        renderWheel();
      });
      percentInput.addEventListener('blur', function () { syncWeightInputs(); });
      lockButton.addEventListener('click', function () {
        option.locked = !option.locked;
        markChanged();
        renderOptions();
      });
      el.list.appendChild(row);
    });
    el.optionCount.textContent = state.options.length + ' 项';
    renderMetricState();
    if (state.busy) el.list.querySelectorAll('input,button').forEach(function (control) { control.disabled = true; });
  }

  function focusNextOption(index) {
    if (index < state.options.length - 1) {
      var next = el.list.querySelectorAll('.picker-option-input')[index + 1];
      if (next) { next.focus(); next.select(); }
      return;
    }
    if (state.options[index].text.trim() && state.options.length < Core.MAX_OPTIONS) {
      addOption(true);
    } else if (!el.spin.disabled) {
      el.spin.focus();
    }
  }

  function addOption(focus) {
    if (state.busy || state.options.length >= Core.MAX_OPTIONS) return;
    state.options.push(makeOption('', 1));
    Core.equalize(state.options);
    markChanged();
    renderAll();
    if (focus) {
      var inputs = el.list.querySelectorAll('.picker-option-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }
  }

  function syncWeightInputs(exceptIndex, exceptElement) {
    var display = Core.displayPercentages(state.options);
    el.list.querySelectorAll('.picker-option').forEach(function (row, index) {
      var range = row.querySelector('.picker-weight-range');
      var number = row.querySelector('.picker-percent-input');
      range.value = display[index];
      if (number !== exceptElement && document.activeElement !== number) number.value = display[index];
      if (index === exceptIndex && exceptElement === number) range.value = display[index];
    });
  }

  function updateLiveVotes(counts) {
    state.liveCounts = (counts || []).slice();
    var max = Math.max.apply(null, state.liveCounts.concat([1]));
    el.list.querySelectorAll('.picker-option').forEach(function (row, index) {
      var count = state.liveCounts[index] || 0;
      var fill = row.querySelector('.picker-live-fill');
      var label = row.querySelector('.picker-live-count');
      if (fill) fill.style.width = (count / max * 100).toFixed(1) + '%';
      if (label) label.textContent = count + ' 票';
      row.classList.toggle('is-leading', count > 0 && count === max);
    });
  }

  function renderMetricState() {
    var tournament = state.mode === 'tournament';
    var hasVotes = state.busy || !!state.lastTournament || state.liveCounts.some(function (count) { return count > 0; });
    el.metricSwitch.hidden = !tournament;
    if (!tournament) state.metricView = 'weights';
    el.metricSwitch.querySelectorAll('[data-metric]').forEach(function (button) {
      var active = button.dataset.metric === state.metricView;
      button.classList.toggle('is-active', active);
      button.disabled = state.busy || (button.dataset.metric === 'votes' && !hasVotes);
    });
    el.metricLabel.textContent = state.metricView === 'votes' ? '每轮落定后立即更新' : '拖动时，其他未锁定项按比例调整';
    if (state.metricView === 'votes') updateLiveVotes(state.liveCounts);
  }

  function renderWheel(options) {
    var list = options || state.options;
    var weights = state.weighted ? list : list.map(function (option) {
      return { id: option.id, text: option.text, weight: 1, locked: option.locked };
    });
    var pcts = Core.percentages(weights);
    var accumulated = 0;
    var paths = '';
    list.forEach(function (option, index) {
      var start = accumulated;
      var fraction = (pcts[index] || 0) / 100;
      accumulated += fraction;
      var a0 = start * Math.PI * 2 - Math.PI / 2;
      var a1 = accumulated * Math.PI * 2 - Math.PI / 2;
      var x0 = 120 + 108 * Math.cos(a0);
      var y0 = 120 + 108 * Math.sin(a0);
      var x1 = 120 + 108 * Math.cos(a1);
      var y1 = 120 + 108 * Math.sin(a1);
      var large = fraction > 0.5 ? 1 : 0;
      var color = COLORS[index % COLORS.length];
      paths += '<path class="picker-slice" data-index="' + index + '" d="M120 120 L' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A108 108 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z" fill="' + color + '" stroke="#fafaf9" stroke-width="1.2"></path>';
      if (fraction >= 0.055 && option.text.trim()) {
        var mid = (a0 + a1) / 2;
        var radius = fraction > 0.22 ? 67 : 76;
        var label = Array.from(option.text.trim());
        if (label.length > 7) label = label.slice(0, 6).concat('…');
        var arcWidth = 2 * Math.PI * radius * fraction;
        var fontSize = Math.min(13, 7 + fraction * 24, arcWidth / Math.max(1, label.length * 0.92));
        if (fontSize >= 7) {
          var labelX = 120 + radius * Math.cos(mid);
          var labelY = 120 + radius * Math.sin(mid);
          var outwardRotation = mid * 180 / Math.PI + 90;
          paths += '<text x="' + labelX.toFixed(2) + '" y="' + labelY.toFixed(2) + '" font-size="' + fontSize.toFixed(1) + '" fill="' + Core.contrastText(color) + '" transform="rotate(' + outwardRotation.toFixed(2) + ' ' + labelX.toFixed(2) + ' ' + labelY.toFixed(2) + ')">' + escapeHtml(label.join('')) + '</text>';
        }
      }
    });
    paths += '<circle cx="120" cy="120" r="17" fill="#f5f1e8" stroke="#b89252" stroke-width="4"></circle>' +
      '<circle cx="120" cy="120" r="5" fill="#1e3a5f"></circle>' +
      '<circle cx="120" cy="120" r="109" fill="none" stroke="#1e3a5f" stroke-width="3"></circle>';
    el.wheel.innerHTML = '<title id="wheel-title">随机抽取转盘</title><desc id="wheel-desc">转盘扇区对应选项和概率</desc>' + paths;
  }

  function renderMode() {
    el.modeTabs.querySelectorAll('[data-mode]').forEach(function (button) {
      var active = button.dataset.mode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    el.multipleSetting.hidden = state.mode !== 'multiple';
    el.tournamentSetting.hidden = state.mode !== 'tournament';
    var maxMultiple = Math.max(1, state.options.length - 1);
    el.multipleCount.min = '1';
    el.multipleCount.max = String(maxMultiple);
    state.count = Math.max(1, Math.min(maxMultiple, state.count));
    el.multipleCount.value = String(state.count);
    el.roundPresets.querySelectorAll('[data-rounds]').forEach(function (button) {
      button.classList.toggle('is-active', Number(button.dataset.rounds) === state.rounds);
    });
    el.roundsCustom.value = [3, 5, 10].indexOf(state.rounds) >= 0 ? '' : String(state.rounds);
    if (state.mode === 'single') el.spin.innerHTML = '[[zi:shuffle]] 开始抽取';
    if (state.mode === 'multiple') el.spin.innerHTML = '[[zi:shuffle]] 抽出 ' + state.count + ' 项';
    if (state.mode === 'tournament') el.spin.innerHTML = '[[zi:trophy]] 进行 ' + state.rounds + ' 轮';
    renderMetricState();
  }

  function updateControls() {
    var blankCount = state.options.filter(function (option) { return !option.text.trim(); }).length;
    var valid = state.options.length >= 2 && blankCount === 0;
    el.spin.disabled = state.busy || !valid;
    el.status.textContent = blankCount ? '请先填写所有选项名称' : '';
    el.add.disabled = state.busy || state.options.length >= Core.MAX_OPTIONS;
    el.add.textContent = state.options.length >= Core.MAX_OPTIONS ? '已达 30 个上限' : '+ 添加选项';
    el.weighted.checked = state.weighted;
    el.weightTools.hidden = false;
  }

  function renderAll() {
    renderOptions();
    renderWheel();
    renderMode();
    updateControls();
    renderProfiles();
    renderHistory();
  }

  function clearHighlights() {
    el.wheel.querySelectorAll('.picker-slice').forEach(function (slice) {
      slice.classList.remove('is-winner', 'is-dim');
    });
    el.list.querySelectorAll('.picker-option').forEach(function (row) { row.classList.remove('is-selected'); });
  }

  function highlightIndices(indices) {
    var selected = indices || [];
    el.wheel.querySelectorAll('.picker-slice').forEach(function (slice, index) {
      slice.classList.toggle('is-winner', selected.indexOf(index) >= 0);
      slice.classList.toggle('is-dim', selected.indexOf(index) < 0);
    });
    el.list.querySelectorAll('.picker-option').forEach(function (row, index) {
      row.classList.toggle('is-selected', selected.indexOf(index) >= 0);
    });
  }

  function angleForIndex(options, index) {
    var weighted = state.weighted ? options : options.map(function (option) { return { text: option.text, weight: 1 }; });
    var pcts = Core.percentages(weighted);
    var start = 0;
    for (var i = 0; i < index; i += 1) start += pcts[i] / 100 * 360;
    var width = pcts[index] / 100 * 360;
    return start + width * (0.16 + Core.secureRandom() * 0.68);
  }

  function animateToIndex(options, index, settings) {
    return new Promise(function (resolve) {
      var config = settings || {};
      var duration = Math.max(120, Number(config.duration) || 2350);
      var turns = Math.max(1, Number(config.turns) || 5);
      var theta = angleForIndex(options, index);
      var current = ((state.rotation % 360) + 360) % 360;
      var desired = ((360 - theta) % 360 + 360) % 360;
      var delta = ((desired - current) % 360 + 360) % 360;
      var target = state.rotation + turns * 360 + delta;
      state.rotation = target;
      var finished = false;
      var safety;
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(safety);
        el.wheel.removeEventListener('transitionend', onEnd);
        el.wheel.classList.remove('is-spinning');
        el.skip.hidden = true;
        state.animationSkip = null;
        resolve();
      }
      function onEnd(event) {
        if (event.target === el.wheel && event.propertyName === 'transform') finish();
      }
      state.animationSkip = function () {
        el.wheel.classList.remove('is-spinning');
        void el.wheel.offsetWidth;
        el.wheel.style.transform = 'rotate(' + target + 'deg)';
        requestAnimationFrame(finish);
      };
      el.skip.hidden = false;
      el.wheel.addEventListener('transitionend', onEnd);
      void el.wheel.offsetWidth;
      el.wheel.style.transitionDuration = duration + 'ms';
      el.wheel.classList.add('is-spinning');
      el.wheel.style.transform = 'rotate(' + target + 'deg)';
      safety = setTimeout(finish, duration + 450);
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) state.animationSkip();
    });
  }

  function setBusy(busy) {
    state.busy = busy;
    el.editor.setAttribute('aria-busy', busy ? 'true' : 'false');
    el.modePanel.setAttribute('aria-busy', busy ? 'true' : 'false');
    el.app.querySelectorAll('.picker-editor input, .picker-editor textarea, .picker-editor button, .picker-mode-panel input, .picker-mode-panel button:not(#skip-btn), .picker-library-flyout button, .picker-library-triggers button').forEach(function (control) {
      control.disabled = busy;
    });
    el.spin.disabled = busy;
    el.again.disabled = busy;
    el.tieBreak.disabled = busy;
    if (!busy) {
      updateControls();
      renderOptions();
      renderProfileSaveState();
      if (state.pendingHash) {
        state.pendingHash = false;
        applyHash();
      }
    }
  }

  function drawSnapshot() {
    var options = state.options.map(function (option) {
      return { id: option.id, text: option.text.trim(), weight: state.weighted ? option.weight : 1, locked: option.locked };
    });
    if (options.length < 2 || options.some(function (option) { return !option.text; })) return null;
    return options;
  }

  async function animateTournamentSequence(options, outcome) {
    var sequence = outcome.sequence || [];
    var live = options.map(function () { return 0; });
    state.metricView = 'votes';
    state.lastTournament = null;
    updateLiveVotes(live);
    renderOptions();
    if (state.rounds <= 5) {
      for (var round = 0; round < sequence.length; round += 1) {
        el.status.textContent = '第 ' + (round + 1) + ' / ' + state.rounds + ' 轮';
        await animateToIndex(options, sequence[round], { duration: 900, turns: 3 });
        live[sequence[round]] += 1;
        updateLiveVotes(live);
      }
      return;
    }
    var frames = Math.min(sequence.length, 12);
    var batch = Math.ceil(sequence.length / frames);
    var completed = 0;
    for (var frame = 0; frame < frames; frame += 1) {
      var end = Math.min(sequence.length, completed + batch);
      el.status.textContent = '已完成 ' + end + ' / ' + state.rounds + ' 轮';
      await animateToIndex(options, sequence[end - 1], { duration: Math.max(150, 285 - frames * 7), turns: 2 });
      for (var item = completed; item < end; item += 1) live[sequence[item]] += 1;
      completed = end;
      updateLiveVotes(live);
    }
  }

  async function draw() {
    if (state.busy) return;
    var options = drawSnapshot();
    if (!options) {
      el.status.textContent = '请先填写至少两个完整选项';
      var blank = el.list.querySelector('.picker-option-input[value=""]');
      if (blank) blank.focus();
      return;
    }
    state.lastTournament = null;
    state.liveCounts = [];
    if (state.mode !== 'tournament') state.metricView = 'weights';
    setBusy(true);
    clearHighlights();
    el.resultPlaceholder.hidden = false;
    el.resultPlaceholder.textContent = '转盘正在寻找答案…';
    el.resultCard.hidden = true;
    el.status.textContent = '正在抽取…';

    var outcome;
    if (state.mode === 'single') {
      outcome = { indices: [Core.weightedChoice(options)] };
    } else if (state.mode === 'multiple') {
      outcome = { indices: Core.weightedSampleWithoutReplacement(options, state.count) };
    } else {
      outcome = Core.runTournament(options, state.rounds);
    }

    if (state.mode === 'tournament') await animateTournamentSequence(options, outcome);
    else await animateToIndex(options, outcome.indices[0]);
    var hadPendingHash = state.pendingHash;
    setBusy(false);
    if (hadPendingHash) return;
    el.status.textContent = '';
    if (state.mode === 'single') showSingleResult(options, outcome.indices[0]);
    else if (state.mode === 'multiple') showMultipleResult(options, outcome.indices);
    else showTournamentResult(options, outcome);
  }

  function showSingleResult(options, index) {
    var name = options[index].text;
    highlightIndices([index]);
    el.resultEyebrow.textContent = '抽取结果';
    el.resultMain.innerHTML = '这次选中：<strong>' + escapeHtml(name) + '</strong>';
    el.tally.hidden = true;
    el.tieBreak.hidden = true;
    el.resultPlaceholder.hidden = true;
    el.resultCard.hidden = false;
    state.lastResultText = '抽取结果：' + name;
    var counts = options.map(function (_, optionIndex) { return optionIndex === index ? 1 : 0; });
    state.lastExport = makeExportData(options, counts, '这次选中：' + name, '单次抽取', 'single', 1);
    recordHistory(name, '单次抽取', { counts: counts });
  }

  function showMultipleResult(options, indices) {
    highlightIndices(indices);
    var names = indices.map(function (index) { return options[index].text; });
    el.resultEyebrow.textContent = '不重复抽取 · ' + names.length + ' 项';
    el.resultMain.innerHTML = '<ol class="picker-result-list">' + names.map(function (name) { return '<li><strong>' + escapeHtml(name) + '</strong></li>'; }).join('') + '</ol>';
    el.tally.hidden = true;
    el.tieBreak.hidden = true;
    el.resultPlaceholder.hidden = true;
    el.resultCard.hidden = false;
    state.lastResultText = '不重复抽取（' + names.length + ' 项）\n' + names.map(function (name, index) { return (index + 1) + '. ' + name; }).join('\n');
    var counts = options.map(function (_, optionIndex) { return indices.indexOf(optionIndex) >= 0 ? 1 : 0; });
    state.lastExport = makeExportData(options, counts, '抽出：' + names.join('、'), '不重复抽取 ' + names.length + ' 项', 'multiple', 1);
    recordHistory(names.join('、'), '抽取 ' + names.length + ' 项', { counts: counts });
  }

  function renderTally(options, outcome) {
    var order = outcome.counts.map(function (count, index) { return { count: count, index: index }; })
      .sort(function (a, b) { return b.count - a.count || a.index - b.index; });
    el.tally.innerHTML = order.map(function (item) {
      var top = item.count === outcome.max;
      var width = outcome.max ? item.count / outcome.max * 100 : 0;
      return '<div class="picker-tally-row' + (top ? ' is-top' : '') + '">' +
        '<span class="picker-tally-name" title="' + escapeHtml(options[item.index].text) + '">' + escapeHtml(options[item.index].text) + '</span>' +
        '<span class="picker-tally-track"><span class="picker-tally-fill" style="display:block;width:' + width.toFixed(1) + '%"></span></span>' +
        '<span class="picker-tally-count">' + item.count + '</span></div>';
    }).join('');
    el.tally.hidden = false;
  }

  function tournamentCopyText(options, outcome, tieBreakWinner) {
    var order = outcome.counts.map(function (count, index) {
      return { count: count, name: options[index].text, index: index };
    }).sort(function (a, b) { return b.count - a.count || a.index - b.index; });
    var headline;
    if (tieBreakWinner) {
      headline = '随机决胜：' + tieBreakWinner;
    } else if (outcome.winnerIndex != null) {
      headline = '胜出：' + options[outcome.winnerIndex].text + '（' + outcome.max + ' 票）';
    } else {
      headline = '结果：' + outcome.tiedIndices.map(function (index) { return options[index].text; }).join('、') + ' 并列（' + outcome.max + ' 票）';
    }
    return state.rounds + ' 轮决胜\n' + headline + '\n票数：\n' + order.map(function (item) {
      return item.name + '：' + item.count + ' 票';
    }).join('\n');
  }

  function showTournamentResult(options, outcome) {
    renderTally(options, outcome);
    state.lastTournament = { options: options, outcome: outcome };
    el.resultEyebrow.textContent = state.rounds + ' 轮决胜';
    if (outcome.winnerIndex != null) {
      var name = options[outcome.winnerIndex].text;
      highlightIndices([outcome.winnerIndex]);
      el.resultMain.innerHTML = '<strong>' + escapeHtml(name) + '</strong> 以 ' + outcome.max + ' 票胜出';
      el.tieBreak.hidden = true;
      state.lastResultText = tournamentCopyText(options, outcome);
      state.lastExport = makeExportData(options, outcome.counts, name + ' 以 ' + outcome.max + ' 票胜出', state.rounds + ' 轮决胜', 'tournament', state.rounds);
      recordHistory(name, state.rounds + ' 轮决胜', outcome);
    } else {
      var names = outcome.tiedIndices.map(function (index) { return options[index].text; });
      highlightIndices(outcome.tiedIndices);
      el.resultMain.innerHTML = '<strong>' + names.map(escapeHtml).join('、') + '</strong> 同为 ' + outcome.max + ' 票，暂时并列';
      state.tieCandidates = outcome.tiedIndices.slice();
      el.tieBreak.hidden = false;
      state.lastResultText = tournamentCopyText(options, outcome);
      state.lastExport = makeExportData(options, outcome.counts, names.join('、') + ' 并列', state.rounds + ' 轮决胜', 'tournament', state.rounds);
      recordHistory(names.join('、') + '并列', state.rounds + ' 轮决胜', outcome);
    }
    el.resultPlaceholder.hidden = true;
    el.resultCard.hidden = false;
  }

  async function breakTie() {
    if (state.busy || state.tieCandidates.length < 2) return;
    var options = drawSnapshot();
    if (!options) return;
    var candidates = state.tieCandidates.map(function (index) { return { text: options[index].text, weight: 1, originalIndex: index }; });
    var localWinner = Core.weightedChoice(candidates);
    var winnerIndex = candidates[localWinner].originalIndex;
    setBusy(true);
    el.status.textContent = '正在从并列项中随机决胜…';
    await animateToIndex(options, winnerIndex);
    var hadPendingHash = state.pendingHash;
    setBusy(false);
    if (hadPendingHash) return;
    highlightIndices([winnerIndex]);
    el.status.textContent = '';
    el.resultEyebrow.textContent = '并列项随机决胜';
    el.resultMain.innerHTML = '最终选中：<strong>' + escapeHtml(options[winnerIndex].text) + '</strong>';
    el.resultPlaceholder.hidden = true;
    el.resultCard.hidden = false;
    el.tieBreak.hidden = true;
    state.lastResultText = state.lastTournament
      ? tournamentCopyText(state.lastTournament.options, state.lastTournament.outcome, options[winnerIndex].text)
      : '并列项随机决胜：' + options[winnerIndex].text;
    state.lastExport = state.lastTournament
      ? makeExportData(state.lastTournament.options, state.lastTournament.outcome.counts, '最终选中：' + options[winnerIndex].text, state.rounds + ' 轮决胜', 'tournament', state.rounds)
      : makeExportData(options, options.map(function (_, index) { return index === winnerIndex ? 1 : 0; }), '最终选中：' + options[winnerIndex].text, '并列项随机决胜', 'single', 1);
    recordHistory(options[winnerIndex].text, '并列项随机决胜');
    state.tieCandidates = [];
  }

  function recordHistory(result, detail, outcome) {
    var config = Core.normalizeConfig(currentConfig());
    var profile = state.profiles.find(function (item) { return item.id === state.currentProfileId; });
    state.history.unshift({
      ts: Date.now(),
      result: result,
      detail: detail,
      profileName: profile ? profile.name : '',
      config: config,
      counts: outcome && Array.isArray(outcome.counts) ? outcome.counts.slice() : []
    });
    state.history = state.history.slice(0, HISTORY_MAX);
    state.historyVisible = Math.max(10, state.historyVisible);
    writeStorage(HISTORY_KEY, state.history);
    renderHistory();
  }

  function renderHistory() {
    el.historyCount.textContent = String(state.history.length);
    el.historyEmpty.hidden = state.history.length > 0;
    var visible = state.history.slice(0, state.historyVisible);
    el.historyList.innerHTML = visible.map(function (item, index) {
      var date = new Date(item.ts);
      var time = String(date.getMonth() + 1).padStart(2, '0') + '/' + String(date.getDate()).padStart(2, '0') + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      var config = Core.normalizeConfig(item.config);
      var optionCount = config ? config.options.length : 0;
      var mode = String(item.detail || '历史记录').replace(/\s+/g, '');
      var search = [item.result, item.profileName].concat(config ? config.options.map(function (option) { return option.text; }) : []).join(' ').toLowerCase();
      var counts = Array.isArray(item.counts) ? item.counts : [];
      var total = counts.reduce(function (sum, count) { return sum + count; }, 0);
      var bars = total && config ? counts.map(function (count, barIndex) { return '<i style="width:' + (count / total * 100).toFixed(1) + '%;background:' + COLORS[barIndex % COLORS.length] + '"></i>'; }).join('') : '<i style="width:100%;background:' + COLORS[0] + '"></i>';
      return '<button type="button" class="picker-history-item" data-history-index="' + index + '" data-search-text="' + escapeHtml(search) + '"><span><strong>' + escapeHtml(item.result) + '</strong><small>' + time + '</small></span><em>' + escapeHtml(mode) + (optionCount ? '（共' + optionCount + '项备选）' : '') + '</em><span class="picker-history-mini">' + bars + '</span></button>';
    }).join('');
    el.historyList.querySelectorAll('[data-history-index]').forEach(function (button) {
      button.addEventListener('click', function () { showHistoryDetail(state.history[Number(button.dataset.historyIndex)]); });
    });
    el.historyMore.hidden = state.historyVisible >= state.history.length;
    el.historyClear.hidden = state.history.length === 0;
  }

  function showHistoryDetail(item) {
    if (!item) return;
    var config = Core.normalizeConfig(item.config);
    if (!config) { toast('这条旧记录没有保存完整设置'); return; }
    var display = Core.displayPercentages(config.options);
    var counts = Array.isArray(item.counts) ? item.counts : config.options.map(function () { return 0; });
    var maxVotes = Math.max.apply(null, counts.concat([1]));
    el.libraryFlyout.classList.add('is-detail');
    el.historyList.innerHTML = '<div class="picker-library-detail"><button type="button" class="picker-library-back" data-history-back>‹ <span>历史列表</span></button><div class="picker-library-detail-head"><strong>' + escapeHtml(item.result) + '</strong><span>' + escapeHtml(item.detail || '') + '</span></div><div class="picker-library-legend"><span><i class="weight"></i>当时权重</span><span><i class="votes"></i>最终票数</span></div>' + config.options.map(function (option, index) {
      return '<div class="picker-library-option"><strong>' + escapeHtml(option.text) + '</strong><span>' + Math.round(display[index]) + '%</span><b>' + (counts[index] || 0) + ' 票</b><div><span><i class="weight" style="width:' + display[index].toFixed(1) + '%"></i></span><span><i class="votes" style="width:' + ((counts[index] || 0) / maxVotes * 100).toFixed(1) + '%"></i></span></div></div>';
    }).join('') + '<div class="picker-library-detail-actions"><button type="button" data-history-reuse>↗ 复用这组设置</button></div></div>';
    el.historyList.querySelector('[data-history-back]').addEventListener('click', function () { el.libraryFlyout.classList.remove('is-detail'); renderHistory(); applyLibrarySearch(); });
    el.historyList.querySelector('[data-history-reuse]').addEventListener('click', function () { applyConfig(config); closeLibrary(); toast('已载入历史设置'); });
  }

  function renderProfiles() {
    el.profileCount.textContent = String(state.profiles.length);
    el.profileEmpty.hidden = state.profiles.length > 0;
    el.profileList.innerHTML = '';
    state.profiles.forEach(function (profile) {
      var config = Core.normalizeConfig(profile.config);
      if (!config) return;
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'picker-profile' + (profile.id === state.currentProfileId ? ' is-current' : '');
      row.dataset.searchText = [profile.name].concat(config.options.map(function (option) { return option.text; })).join(' ').toLowerCase();
      var display = Core.displayPercentages(config.options);
      var mode = config.mode === 'tournament' ? config.rounds + '轮决胜' : (config.mode === 'multiple' ? '抽取' + config.count + '项' : '单次抽取');
      row.innerHTML = '<span><strong>' + escapeHtml(profile.name) + '</strong><small>' + mode + '（共' + config.options.length + '项备选）</small></span><span class="picker-profile-mini">' + display.map(function (pct, index) { return '<i style="width:' + pct.toFixed(1) + '%;background:' + COLORS[index % COLORS.length] + '"></i>'; }).join('') + '</span>';
      row.addEventListener('click', function () { showProfileDetail(profile); });
      el.profileList.appendChild(row);
    });
    renderProfileSaveState();
  }

  function showProfileDetail(profile) {
    var config = profile && Core.normalizeConfig(profile.config);
    if (!config) return;
    var display = Core.displayPercentages(config.options);
    el.libraryFlyout.classList.add('is-detail');
    el.profileList.innerHTML = '<div class="picker-library-detail"><button type="button" class="picker-library-back" data-profile-back>‹ <span>档案列表</span></button><div class="picker-library-detail-head"><strong>' + escapeHtml(profile.name) + '</strong><span>' + config.options.length + ' 项</span></div><div class="picker-library-legend"><span><i class="weight"></i>档案权重</span></div>' + config.options.map(function (option, index) {
      return '<div class="picker-library-option"><strong>' + escapeHtml(option.text) + '</strong><span>' + Math.round(display[index]) + '%</span><b></b><div><span><i class="weight" style="width:' + display[index].toFixed(1) + '%"></i></span></div></div>';
    }).join('') + '<div class="picker-library-detail-actions"><button type="button" data-profile-load>↗ 载入这份档案</button><button type="button" data-profile-rename>重命名</button><button type="button" class="is-danger" data-profile-delete>删除</button></div></div>';
    el.profileList.querySelector('[data-profile-back]').addEventListener('click', function () { el.libraryFlyout.classList.remove('is-detail'); renderProfiles(); applyLibrarySearch(); });
    el.profileList.querySelector('[data-profile-load]').addEventListener('click', function () { loadProfile(profile.id); closeLibrary(); });
    el.profileList.querySelector('[data-profile-rename]').addEventListener('click', function () { renameProfile(profile.id); renderProfiles(); });
    el.profileList.querySelector('[data-profile-delete]').addEventListener('click', function () { deleteProfile(profile.id); renderProfiles(); });
  }

  function renderProfileSaveState() {
    el.profileSave.hidden = !state.currentProfileId;
    el.profileSave.textContent = state.dirty ? '[[zi:save]] 保存改动 ·' : '[[zi:save]] 已保存';
    el.profileSave.disabled = state.busy || !state.dirty;
  }

  function createProfile() {
    if (state.busy) return;
    var name = prompt('给这套选项起个档案名：', '');
    if (name === null) return;
    name = name.trim().slice(0, 60);
    if (!name) { toast('档案名不能为空'); return; }
    var config = Core.normalizeConfig(currentConfig());
    if (!config) { toast('请先填写至少两个完整选项'); return; }
    var profile = { id: Core.id(), name: name, config: config, createdAt: Date.now() };
    state.profiles.push(profile);
    state.currentProfileId = profile.id;
    writeStorage(PROFILE_KEY, state.profiles);
    markClean();
    renderProfiles();
    toast('已保存为“' + name + '”');
  }

  function saveProfile() {
    var profile = state.profiles.find(function (item) { return item.id === state.currentProfileId; });
    if (!profile || state.busy) return;
    var config = Core.normalizeConfig(currentConfig());
    if (!config) { toast('请先填写至少两个完整选项'); return; }
    profile.config = config;
    writeStorage(PROFILE_KEY, state.profiles);
    markClean();
    renderProfiles();
    toast('档案改动已保存');
  }

  function loadProfile(id) {
    if (state.busy) return;
    var profile = state.profiles.find(function (item) { return item.id === id; });
    if (!profile) return;
    if (state.dirty && state.currentProfileId && !confirm('当前档案有未保存改动，确定调取其他档案？')) return;
    var config = Core.normalizeConfig(profile.config);
    if (!config) { toast('这个档案已损坏，无法调取'); return; }
    applyConfig(config);
    state.currentProfileId = id;
    markClean();
    renderProfiles();
    toast('已调取“' + profile.name + '”');
  }

  function renameProfile(id) {
    var profile = state.profiles.find(function (item) { return item.id === id; });
    if (!profile || state.busy) return;
    var name = prompt('新的档案名：', profile.name);
    if (name === null) return;
    name = name.trim().slice(0, 60);
    if (!name) { toast('档案名不能为空'); return; }
    profile.name = name;
    writeStorage(PROFILE_KEY, state.profiles);
    renderProfiles();
  }

  function deleteProfile(id) {
    var profile = state.profiles.find(function (item) { return item.id === id; });
    if (!profile || state.busy || !confirm('确定删除档案“' + profile.name + '”？')) return;
    state.profiles = state.profiles.filter(function (item) { return item.id !== id; });
    if (state.currentProfileId === id) state.currentProfileId = null;
    writeStorage(PROFILE_KEY, state.profiles);
    markClean();
    renderProfiles();
    toast('档案已删除');
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }

  function makeExportData(options, counts, headline, modeLabel, modeType, rounds) {
    var display = Core.displayPercentages(options);
    return {
      headline: headline,
      mode: modeLabel,
      modeType: modeType || 'tournament',
      rounds: Math.max(1, Number(rounds) || 1),
      createdAt: Date.now(),
      options: options.map(function (option, index) {
        return { name: option.text, weight: display[index] || 0, votes: counts[index] || 0, color: COLORS[index % COLORS.length] };
      })
    };
  }

  function fitCanvasText(ctx, value, maxWidth) {
    var text = String(value || '');
    if (ctx.measureText(text).width <= maxWidth) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
    return text + '…';
  }

  function renderResultCanvas(data) {
    var width = 1200;
    var rowHeight = 92;
    var height = 330 + data.options.length * rowHeight;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff8d9';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffe552';
    ctx.fillRect(0, 0, width, 126);
    ctx.strokeStyle = '#17252d';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.fillStyle = '#17252d';
    ctx.font = '900 30px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.fillText('遇事不决 · 抽取结果', 58, 76);
    ctx.font = '700 20px "PingFang SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(data.mode, width - 58, 74);
    ctx.textAlign = 'left';
    ctx.font = '900 54px "PingFang SC", "Noto Serif SC", serif';
    ctx.fillText(fitCanvasText(ctx, data.headline, width - 116), 58, 202);
    ctx.font = '600 19px "PingFang SC", sans-serif';
    ctx.fillStyle = '#68747a';
    ctx.fillText('初始选项与权重', 58, 258);
    ctx.textAlign = 'right';
    ctx.fillText('票数', width - 58, 258);
    ctx.textAlign = 'left';
    var maxVotes = Math.max.apply(null, data.options.map(function (option) { return option.votes; }).concat([1]));
    data.options.forEach(function (option, index) {
      var top = 286 + index * rowHeight;
      ctx.fillStyle = option.color;
      ctx.beginPath();
      ctx.arc(72, top + 26, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#17252d';
      ctx.font = '800 25px "PingFang SC", sans-serif';
      ctx.fillText(fitCanvasText(ctx, option.name, 540), 102, top + 34);
      ctx.font = '700 20px "PingFang SC", sans-serif';
      ctx.fillStyle = '#68747a';
      ctx.fillText(Math.round(option.weight) + '%', 650, top + 34);
      ctx.fillStyle = '#17252d';
      ctx.textAlign = 'right';
      ctx.fillText(option.votes + ' 票', width - 58, top + 34);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e3e5e6';
      ctx.fillRect(102, top + 52, width - 160, 14);
      ctx.fillStyle = option.color;
      ctx.fillRect(102, top + 52, (width - 160) * (option.votes / maxVotes), 14);
    });
    ctx.fillStyle = '#68747a';
    ctx.font = '500 17px "PingFang SC", sans-serif';
    ctx.fillText('ruizhou03.com/toolbox/picker · 数据仅保存在你的浏览器', 58, height - 52);
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('无法生成图片')); }, 'image/png');
    });
  }

  async function exportResultImage() {
    if (!state.lastExport) throw new Error('没有可导出的结果');
    var useR2 = !!window.PickerResultCard;
    var blob = useR2
      ? await window.PickerResultCard.toPngBlob(state.lastExport)
      : await canvasToBlob(renderResultCanvas(state.lastExport));
    el.copyResult.dataset.exportRenderer = useR2 ? 'r2' : 'legacy';
    el.copyResult.dataset.exportDimensions = useR2 ? '1200x800' : 'legacy-variable';
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return 'copied';
      } catch (_) { /* fall through to download */ }
    }
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'picker-result-' + new Date().toISOString().slice(0, 10) + '.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    return 'downloaded';
  }

  async function shareConfig() {
    var hash = Core.encodeConfig(currentConfig());
    if (!hash) { toast('请先填写至少两个完整选项'); return; }
    var url = location.origin + location.pathname + hash;
    history.replaceState(null, '', hash);
    try {
      await copyText(url);
      toast('分享链接已复制；链接中只包含当前选项和设置');
    } catch (_) {
      toast('链接已写入地址栏，请手动复制');
    }
  }

  function applyHash() {
    var config = Core.decodeHash(location.hash);
    if (!config) return false;
    applyConfig(config);
    toast('已载入分享的选项');
    return true;
  }

  function applyLibrarySearch() {
    var query = el.librarySearch.value.trim().toLowerCase();
    var scope = currentLibrary === 'profiles' ? el.profileList : el.historyList;
    if (!scope) return;
    scope.querySelectorAll('[data-search-text]').forEach(function (item) {
      item.hidden = !!query && item.dataset.searchText.indexOf(query) < 0;
    });
  }

  function closeLibrary() {
    if (el.libraryFlyout.hidden) return;
    clearTimeout(libraryCloseTimer);
    el.libraryFlyout.classList.remove('is-open');
    el.libraryFlyout.classList.add('is-closing');
    el.profilesTrigger.setAttribute('aria-expanded', 'false');
    el.historyTrigger.setAttribute('aria-expanded', 'false');
    libraryCloseTimer = setTimeout(function () {
      el.libraryFlyout.classList.remove('is-closing', 'is-detail');
      el.libraryFlyout.hidden = true;
      currentLibrary = '';
    }, 190);
  }

  function openLibrary(kind, trigger) {
    if (!el.libraryFlyout.hidden && currentLibrary === kind && el.libraryFlyout.classList.contains('is-open')) { closeLibrary(); return; }
    clearTimeout(libraryCloseTimer);
    currentLibrary = kind;
    el.libraryFlyout.hidden = false;
    el.libraryFlyout.classList.remove('is-closing', 'is-detail');
    el.libraryTitle.textContent = kind === 'profiles' ? '我的档案' : '抽取历史';
    el.librarySearch.value = '';
    el.librarySearch.placeholder = kind === 'profiles' ? '搜索档案或选项' : '搜索结果或选项';
    el.librarySearch.setAttribute('aria-label', kind === 'profiles' ? '搜索档案' : '搜索抽取历史');
    el.profilesPanel.hidden = kind !== 'profiles';
    el.historyPanel.hidden = kind !== 'history';
    if (kind === 'profiles') renderProfiles(); else renderHistory();
    var appRect = el.app.getBoundingClientRect();
    var editorRect = el.editor.getBoundingClientRect();
    var triggerRect = trigger.getBoundingClientRect();
    var rightGap = 14;
    var breathingGap = 12;
    var width = Math.max(340, appRect.right - rightGap - (editorRect.left + breathingGap));
    var left = appRect.right - rightGap - width;
    var caret = Math.max(24, Math.min(width - 24, triggerRect.left + triggerRect.width / 2 - left));
    el.libraryFlyout.style.width = width + 'px';
    el.libraryFlyout.style.setProperty('--picker-library-caret-x', caret + 'px');
    requestAnimationFrame(function () { el.libraryFlyout.classList.add('is-open'); });
    el.profilesTrigger.setAttribute('aria-expanded', kind === 'profiles' ? 'true' : 'false');
    el.historyTrigger.setAttribute('aria-expanded', kind === 'history' ? 'true' : 'false');
  }

  el.add.addEventListener('click', function () { addOption(true); });
  el.bulkToggle.addEventListener('click', function () {
    var open = el.bulkPanel.hidden;
    el.bulkPanel.hidden = !open;
    el.bulkToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      el.bulkInput.value = state.options.map(function (option) { return option.text; }).join('\n');
      el.bulkInput.focus();
    }
  });
  el.bulkCancel.addEventListener('click', function () {
    el.bulkPanel.hidden = true;
    el.bulkToggle.setAttribute('aria-expanded', 'false');
  });
  el.bulkApply.addEventListener('click', function () {
    var parsed = Core.parseBulk(el.bulkInput.value);
    if (parsed.names.length < 2) { toast('批量名单至少需要两个不同选项'); return; }
    state.options = parsed.names.map(function (name) { return makeOption(name, 1); });
    state.weighted = true;
    state.count = Math.min(Math.max(1, state.count), Math.max(1, state.options.length - 1));
    markChanged();
    el.bulkPanel.hidden = true;
    el.bulkToggle.setAttribute('aria-expanded', 'false');
    renderAll();
    var notes = [];
    if (parsed.duplicates) notes.push('忽略 ' + parsed.duplicates + ' 个重复项');
    if (parsed.truncated) notes.push('超出上限的 ' + parsed.truncated + ' 项未加入');
    toast('已导入 ' + parsed.names.length + ' 个选项' + (notes.length ? '；' + notes.join('；') : ''));
  });
  el.equal.addEventListener('click', function () {
    Core.equalize(state.options);
    markChanged();
    renderAll();
    toast('已恢复等概率');
  });
  el.modeTabs.addEventListener('click', function (event) {
    var button = event.target.closest('[data-mode]');
    if (!button || state.busy || button.dataset.mode === state.mode) return;
    state.mode = button.dataset.mode;
    state.metricView = 'weights';
    state.liveCounts = [];
    markChanged();
    renderMode();
    renderOptions();
  });
  function syncMultipleCount() {
    var maxMultiple = Math.max(1, state.options.length - 1);
    var parsed = parseInt(el.multipleCount.value, 10);
    if (isNaN(parsed)) return;
    state.count = Math.max(1, Math.min(maxMultiple, parsed));
    markChanged();
    renderMode();
  }
  el.multipleCount.addEventListener('input', syncMultipleCount);
  el.multipleCount.addEventListener('change', function () {
    if (el.multipleCount.value === '') el.multipleCount.value = String(state.count);
    syncMultipleCount();
  });
  el.roundPresets.addEventListener('click', function (event) {
    var button = event.target.closest('[data-rounds]');
    if (!button || state.busy) return;
    state.rounds = Number(button.dataset.rounds);
    markChanged();
    renderMode();
  });
  el.roundsCustom.addEventListener('input', function () {
    var value = Number(el.roundsCustom.value);
    if (!Number.isInteger(value) || value < 1 || value > 1000) return;
    state.rounds = value;
    markChanged();
    renderMode();
  });
  el.roundsCustom.addEventListener('blur', function () {
    if (el.roundsCustom.value === '') return;
    state.rounds = Math.max(1, Math.min(1000, Number(el.roundsCustom.value) || 5));
    el.roundsCustom.value = String(state.rounds);
    markChanged();
    renderMode();
  });
  el.metricSwitch.addEventListener('click', function (event) {
    var button = event.target.closest('[data-metric]');
    if (!button || button.disabled) return;
    state.metricView = button.dataset.metric;
    renderOptions();
    if (state.metricView === 'weights') el.spin.innerHTML = '[[zi:trophy]] 按新权重进行 ' + state.rounds + ' 轮';
  });
  el.spin.addEventListener('click', draw);
  el.again.addEventListener('click', draw);
  el.skip.addEventListener('click', function () { if (state.animationSkip) state.animationSkip(); });
  el.tieBreak.addEventListener('click', breakTie);
  el.copyResult.addEventListener('click', async function () {
    if (!state.lastExport) return;
    try {
      var outcome = await exportResultImage();
      toast(outcome === 'copied' ? '结果图片已复制' : '浏览器不支持复制图片，已下载 PNG');
    } catch (_) { toast('生成结果图片失败'); }
  });
  el.profileNew.addEventListener('click', createProfile);
  el.profileSave.addEventListener('click', saveProfile);
  el.share.addEventListener('click', shareConfig);
  el.historyMore.addEventListener('click', function () { state.historyVisible += 10; renderHistory(); });
  el.historyClear.addEventListener('click', function () {
    if (!state.history.length || !confirm('确定清空全部抽取历史？')) return;
    state.history = [];
    writeStorage(HISTORY_KEY, state.history);
    renderHistory();
    toast('抽取历史已清空');
  });
  el.profilesTrigger.addEventListener('click', function () { openLibrary('profiles', el.profilesTrigger); });
  el.historyTrigger.addEventListener('click', function () { openLibrary('history', el.historyTrigger); });
  el.libraryClose.addEventListener('click', closeLibrary);
  el.librarySearch.addEventListener('input', applyLibrarySearch);
  document.addEventListener('pointerdown', function (event) {
    if (el.libraryFlyout.hidden) return;
    if (el.libraryFlyout.contains(event.target) || event.target.closest('[data-library]')) return;
    closeLibrary();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !el.libraryFlyout.hidden) {
      closeLibrary();
      return;
    }
    if (event.code !== 'Space' || state.busy) return;
    var active = document.activeElement;
    if (active && (/^(INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY)$/i.test(active.tagName) || active.isContentEditable)) return;
    if (el.spin.disabled) return;
    event.preventDefault();
    draw();
  });
  window.addEventListener('hashchange', function () {
    if (state.busy) { state.pendingHash = true; return; }
    applyHash();
  });

  window.addEventListener('resize', scheduleViewportFit, { passive: true });
  window.addEventListener('orientationchange', scheduleViewportFit, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleViewportFit, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleViewportFit);
  if (window.ResizeObserver) {
    var globalNav = document.querySelector('body > nav');
    if (globalNav) new ResizeObserver(scheduleViewportFit).observe(globalNav);
  }

  state.profiles = loadProfiles();
  state.history = loadHistory();
  scheduleViewportFit();
  if (!applyHash()) renderAll();
}());
