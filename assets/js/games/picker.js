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
    weighted: false,
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
    lastResultText: '',
    lastTournament: null,
    tieCandidates: [],
    animationSkip: null,
    pendingHash: false
  };

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
    profileCount: byId('profile-count'),
    profileEmpty: byId('profile-empty'),
    profileList: byId('profile-list'),
    profileNew: byId('profile-new-btn'),
    profileSave: byId('profile-save-btn'),
    share: byId('share-btn'),
    historyCount: byId('history-count'),
    historyEmpty: byId('history-empty'),
    historyList: byId('history-list'),
    historyMore: byId('history-more-btn'),
    historyClear: byId('history-clear-btn'),
    toast: byId('picker-toast')
  };

  function byId(id) { return document.getElementById(id); }
  function makeOption(text, weight) { return { id: Core.id(), text: text || '', weight: weight || 1, locked: false }; }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    state.lastTournament = null;
    state.tieCandidates = [];
    el.resultPlaceholder.hidden = false;
    el.resultPlaceholder.textContent = '转动之后，答案会落在这里。';
    el.resultCard.hidden = true;
    el.tieBreak.hidden = true;
    el.tally.hidden = true;
    el.tally.innerHTML = '';
    clearHighlights();
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
    state.weighted = !!config.weighted;
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
        '<div class="picker-weight-row"' + (state.weighted ? '' : ' hidden') + '>' +
          '<input class="picker-weight-range" type="range" min="1" max="99" step="1" value="' + display[index] + '" aria-label="' + escapeHtml(option.text || ('选项 ' + (index + 1))) + '的概率"' + (option.locked ? ' disabled' : '') + '>' +
          '<span class="picker-percent-wrap"><input class="picker-percent-input" type="number" min="1" max="99" step="1" inputmode="numeric" value="' + display[index] + '" aria-label="' + escapeHtml(option.text || ('选项 ' + (index + 1))) + '的概率百分比"' + (option.locked ? ' disabled' : '') + '></span>' +
          '<button type="button" class="picker-option-lock" aria-pressed="' + (option.locked ? 'true' : 'false') + '" aria-label="' + (option.locked ? '解除概率锁定' : '锁定当前概率') + '" title="' + (option.locked ? '已锁定，点击解除' : '锁定后调整其他项不会改变它') + '">[[zi:lock]]</button>' +
        '</div>';

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
    el.optionCount.textContent = state.options.length + ' / ' + Core.MAX_OPTIONS;
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
  }

  function updateControls() {
    var blankCount = state.options.filter(function (option) { return !option.text.trim(); }).length;
    var valid = state.options.length >= 2 && blankCount === 0;
    el.spin.disabled = state.busy || !valid;
    el.status.textContent = blankCount ? '请先填写所有选项名称' : '';
    el.add.disabled = state.busy || state.options.length >= Core.MAX_OPTIONS;
    el.add.textContent = state.options.length >= Core.MAX_OPTIONS ? '已达 30 个上限' : '+ 添加选项';
    el.weighted.checked = state.weighted;
    el.weightTools.hidden = !state.weighted;
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

  function animateToIndex(options, index) {
    return new Promise(function (resolve) {
      var theta = angleForIndex(options, index);
      var current = ((state.rotation % 360) + 360) % 360;
      var desired = ((360 - theta) % 360 + 360) % 360;
      var delta = ((desired - current) % 360 + 360) % 360;
      var target = state.rotation + 5 * 360 + delta;
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
      el.wheel.classList.add('is-spinning');
      el.wheel.style.transform = 'rotate(' + target + 'deg)';
      safety = setTimeout(finish, 2800);
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) state.animationSkip();
    });
  }

  function setBusy(busy) {
    state.busy = busy;
    el.editor.setAttribute('aria-busy', busy ? 'true' : 'false');
    el.modePanel.setAttribute('aria-busy', busy ? 'true' : 'false');
    el.app.querySelectorAll('.picker-editor input, .picker-editor textarea, .picker-editor button, .picker-mode-panel input, .picker-mode-panel button:not(#skip-btn), .picker-board button').forEach(function (control) {
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

  async function draw() {
    if (state.busy) return;
    var options = drawSnapshot();
    if (!options) {
      el.status.textContent = '请先填写至少两个完整选项';
      var blank = el.list.querySelector('.picker-option-input[value=""]');
      if (blank) blank.focus();
      return;
    }
    setBusy(true);
    clearHighlights();
    el.resultPlaceholder.hidden = false;
    el.resultPlaceholder.textContent = '转盘正在寻找答案…';
    el.resultCard.hidden = true;
    el.status.textContent = '正在抽取…';

    var outcome;
    var animationIndex;
    if (state.mode === 'single') {
      outcome = { indices: [Core.weightedChoice(options)] };
      animationIndex = outcome.indices[0];
    } else if (state.mode === 'multiple') {
      outcome = { indices: Core.weightedSampleWithoutReplacement(options, state.count) };
      animationIndex = outcome.indices[0];
    } else {
      outcome = Core.runTournament(options, state.rounds);
      animationIndex = outcome.sequence[outcome.sequence.length - 1];
    }

    await animateToIndex(options, animationIndex);
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
    recordHistory(name, '抽一个');
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
    recordHistory(names.join('、'), '不重复抽出 ' + names.length + ' 项');
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
      recordHistory(name, state.rounds + ' 轮决胜 · ' + outcome.max + ' 票');
    } else {
      var names = outcome.tiedIndices.map(function (index) { return options[index].text; });
      highlightIndices(outcome.tiedIndices);
      el.resultMain.innerHTML = '<strong>' + names.map(escapeHtml).join('、') + '</strong> 同为 ' + outcome.max + ' 票，暂时并列';
      state.tieCandidates = outcome.tiedIndices.slice();
      el.tieBreak.hidden = false;
      state.lastResultText = tournamentCopyText(options, outcome);
      recordHistory(names.join('、') + '并列', state.rounds + ' 轮决胜 · ' + outcome.max + ' 票');
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
    recordHistory(options[winnerIndex].text, '并列项随机决胜');
    state.tieCandidates = [];
  }

  function recordHistory(result, detail) {
    state.history.unshift({ ts: Date.now(), result: result, detail: detail });
    state.history = state.history.slice(0, HISTORY_MAX);
    state.historyVisible = Math.max(10, state.historyVisible);
    writeStorage(HISTORY_KEY, state.history);
    renderHistory();
  }

  function renderHistory() {
    el.historyCount.textContent = String(state.history.length);
    el.historyEmpty.hidden = state.history.length > 0;
    var visible = state.history.slice(0, state.historyVisible);
    el.historyList.innerHTML = visible.map(function (item) {
      var date = new Date(item.ts);
      var time = String(date.getMonth() + 1).padStart(2, '0') + '/' + String(date.getDate()).padStart(2, '0') + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      return '<div class="picker-history-item"><span class="picker-history-result" title="' + escapeHtml(item.result) + '">' + escapeHtml(item.result) + '</span><span class="picker-history-meta">' + escapeHtml(item.detail || '') + ' · ' + time + '</span></div>';
    }).join('');
    el.historyMore.hidden = state.historyVisible >= state.history.length;
    el.historyClear.hidden = state.history.length === 0;
  }

  function renderProfiles() {
    el.profileCount.textContent = String(state.profiles.length);
    el.profileEmpty.hidden = state.profiles.length > 0;
    el.profileList.innerHTML = '';
    state.profiles.forEach(function (profile) {
      var row = document.createElement('div');
      row.className = 'picker-profile' + (profile.id === state.currentProfileId ? ' is-current' : '');
      var config = Core.normalizeConfig(profile.config);
      row.innerHTML = '<span class="picker-profile-name" title="' + escapeHtml(profile.name) + '">' + escapeHtml(profile.name) + '</span>' +
        '<span class="picker-profile-meta">' + (config ? config.options.length : 0) + ' 项</span>' +
        '<span class="picker-profile-actions"><button type="button" data-action="load">调取</button><button type="button" data-action="rename" aria-label="重命名">[[zi:pencil]]</button><button type="button" data-action="delete" aria-label="删除">[[zi:trash]]</button></span>';
      row.querySelector('[data-action="load"]').addEventListener('click', function () { loadProfile(profile.id); });
      row.querySelector('[data-action="rename"]').addEventListener('click', function () { renameProfile(profile.id); });
      row.querySelector('[data-action="delete"]').addEventListener('click', function () { deleteProfile(profile.id); });
      el.profileList.appendChild(row);
    });
    renderProfileSaveState();
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
    state.weighted = false;
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
  el.weighted.addEventListener('change', function () {
    state.weighted = el.weighted.checked;
    Core.equalize(state.options);
    markChanged();
    renderAll();
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
    markChanged();
    renderMode();
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
  el.roundsCustom.addEventListener('change', function () {
    state.rounds = Math.max(3, Math.min(1000, Number(el.roundsCustom.value) || 5));
    markChanged();
    renderMode();
  });
  el.spin.addEventListener('click', draw);
  el.again.addEventListener('click', draw);
  el.skip.addEventListener('click', function () { if (state.animationSkip) state.animationSkip(); });
  el.tieBreak.addEventListener('click', breakTie);
  el.copyResult.addEventListener('click', async function () {
    if (!state.lastResultText) return;
    try { await copyText(state.lastResultText); toast('结果已复制'); }
    catch (_) { toast('复制失败，请手动选择结果'); }
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
  document.addEventListener('keydown', function (event) {
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
