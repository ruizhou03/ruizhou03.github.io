(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PickerCore = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var VERSION = 2;
  var MAX_OPTIONS = 30;
  var MAX_NAME_LENGTH = 40;
  var MIN_PERCENT = 1;

  function clamp(value, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = min;
    return Math.min(max, Math.max(min, number));
  }

  function id() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var bytes = new Uint32Array(2);
      crypto.getRandomValues(bytes);
      return bytes[0].toString(36) + bytes[1].toString(36);
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function secureRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var value = new Uint32Array(1);
      crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
  }

  function nameLength(value) {
    return Array.from(String(value || '')).length;
  }

  function trimName(value) {
    return Array.from(String(value || '').trim()).slice(0, MAX_NAME_LENGTH).join('');
  }

  function sanitizeOption(option, index) {
    var source = option || {};
    return {
      id: source.id || id(),
      text: trimName(source.text),
      weight: clamp(source.weight == null ? 1 : source.weight, 0.001, 1000000),
      locked: !!source.locked,
      sourceIndex: index
    };
  }

  function validOptions(options) {
    return (Array.isArray(options) ? options : [])
      .slice(0, MAX_OPTIONS)
      .map(sanitizeOption)
      .filter(function (option) { return option.text !== ''; });
  }

  function percentages(options) {
    var list = Array.isArray(options) ? options : [];
    if (!list.length) return [];
    var weights = list.map(function (option) {
      return Math.max(0, Number(option.weight) || 0);
    });
    var total = weights.reduce(function (sum, value) { return sum + value; }, 0);
    if (total <= 0) return list.map(function () { return 100 / list.length; });
    return weights.map(function (weight) { return weight / total * 100; });
  }

  function displayPercentages(options) {
    var exact = percentages(options);
    if (!exact.length) return [];
    var floors = exact.map(Math.floor);
    var remaining = 100 - floors.reduce(function (sum, value) { return sum + value; }, 0);
    var order = exact.map(function (value, index) {
      return { index: index, fraction: value - floors[index] };
    }).sort(function (a, b) {
      return b.fraction - a.fraction || a.index - b.index;
    });
    for (var i = 0; i < remaining; i += 1) floors[order[i % order.length].index] += 1;
    return floors;
  }

  function equalize(options) {
    var list = Array.isArray(options) ? options : [];
    if (!list.length) return list;
    var share = 100 / list.length;
    list.forEach(function (option) {
      option.weight = share;
      option.locked = false;
    });
    return list;
  }

  function rebalance(options, changedIndex, targetPercent) {
    var list = Array.isArray(options) ? options : [];
    if (!list[changedIndex]) return list;
    var current = percentages(list);
    var lockedTotal = 0;
    var adjustable = [];
    list.forEach(function (option, index) {
      if (index === changedIndex) return;
      if (option.locked) lockedTotal += current[index];
      else adjustable.push(index);
    });
    if (!adjustable.length) {
      list[changedIndex].weight = Math.max(MIN_PERCENT, 100 - lockedTotal);
      return list;
    }
    var maxChanged = Math.max(MIN_PERCENT, 100 - lockedTotal - MIN_PERCENT * adjustable.length);
    var nextChanged = clamp(targetPercent, MIN_PERCENT, maxChanged);
    var remaining = Math.max(0, 100 - lockedTotal - nextChanged);
    list[changedIndex].weight = nextChanged;
    var pending = adjustable.slice();
    while (pending.length) {
      var adjustableTotal = pending.reduce(function (sum, index) { return sum + Math.max(0.0001, current[index]); }, 0);
      var belowMinimum = pending.filter(function (index) { return remaining * Math.max(0.0001, current[index]) / adjustableTotal < MIN_PERCENT; });
      if (!belowMinimum.length) {
        pending.forEach(function (index) { list[index].weight = remaining * Math.max(0.0001, current[index]) / adjustableTotal; });
        break;
      }
      belowMinimum.forEach(function (index) { list[index].weight = MIN_PERCENT; remaining -= MIN_PERCENT; });
      pending = pending.filter(function (index) { return belowMinimum.indexOf(index) < 0; });
    }
    list.forEach(function (option, index) {
      if (index !== changedIndex && option.locked) option.weight = current[index];
    });
    return list;
  }

  function weightedChoice(options, rng) {
    var list = Array.isArray(options) ? options : [];
    if (!list.length) return -1;
    var random = typeof rng === 'function' ? rng : secureRandom;
    var weights = list.map(function (option) { return Math.max(0, Number(option.weight) || 0); });
    var total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    if (total <= 0) {
      return Math.min(list.length - 1, Math.floor(random() * list.length));
    }
    var needle = random() * total;
    var accumulated = 0;
    for (var i = 0; i < weights.length; i += 1) {
      accumulated += weights[i];
      if (needle < accumulated) return i;
    }
    return list.length - 1;
  }

  function weightedSampleWithoutReplacement(options, count, rng) {
    var remaining = (Array.isArray(options) ? options : []).map(function (option, index) {
      return { option: option, originalIndex: index };
    });
    var result = [];
    var target = Math.min(Math.max(0, remaining.length - 1), Math.max(0, Math.floor(Number(count) || 0)));
    while (result.length < target) {
      var localIndex = weightedChoice(remaining.map(function (item) { return item.option; }), rng);
      result.push(remaining[localIndex].originalIndex);
      remaining.splice(localIndex, 1);
    }
    return result;
  }

  function runTournament(options, rounds, rng) {
    var list = Array.isArray(options) ? options : [];
    var totalRounds = Math.max(1, Math.min(1000, Math.floor(Number(rounds) || 1)));
    var counts = list.map(function () { return 0; });
    var sequence = [];
    for (var i = 0; i < totalRounds; i += 1) {
      var winner = weightedChoice(list, rng);
      sequence.push(winner);
      if (winner >= 0) counts[winner] += 1;
    }
    var max = counts.length ? Math.max.apply(Math, counts) : 0;
    var tiedIndices = [];
    counts.forEach(function (count, index) {
      if (count === max) tiedIndices.push(index);
    });
    return {
      counts: counts,
      sequence: sequence,
      max: max,
      tiedIndices: tiedIndices,
      winnerIndex: tiedIndices.length === 1 ? tiedIndices[0] : null
    };
  }

  function parseBulk(text, limit) {
    var max = Math.max(2, Math.min(MAX_OPTIONS, Number(limit) || MAX_OPTIONS));
    var seen = Object.create(null);
    var duplicates = 0;
    var truncated = 0;
    var names = [];
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var name = trimName(line);
      if (!name) return;
      if (seen[name]) { duplicates += 1; return; }
      seen[name] = true;
      if (names.length >= max) { truncated += 1; return; }
      names.push(name);
    });
    return { names: names, duplicates: duplicates, truncated: truncated };
  }

  function normalizeConfig(config) {
    var source = config || {};
    var options = validOptions(source.options);
    if (options.length < 2) return null;
    var mode = ['single', 'multiple', 'tournament'].indexOf(source.mode) >= 0 ? source.mode : 'single';
    var maxCount = Math.max(1, options.length - 1);
    var count = Math.max(1, Math.min(maxCount, Math.floor(Number(source.count) || 1)));
    var rounds = Math.max(1, Math.min(1000, Math.floor(Number(source.rounds) || 5)));
    var weighted = source.weighted !== false;
    if (!weighted) equalize(options);
    return {
      v: VERSION,
      options: options.map(function (option) { return { text: option.text, weight: option.weight }; }),
      mode: mode,
      count: count,
      rounds: rounds,
      weighted: weighted
    };
  }

  function encodeConfig(config) {
    var normalized = normalizeConfig(config);
    if (!normalized) return '';
    return '#picker=' + encodeURIComponent(JSON.stringify(normalized));
  }

  function decodeLegacyHash(hash) {
    var body = String(hash || '').replace(/^#/, '');
    var optionsRaw = null;
    var draws = 1;
    body.split('&').forEach(function (segment) {
      var index = segment.indexOf('=');
      if (index < 0) return;
      var key = segment.slice(0, index);
      var value = segment.slice(index + 1);
      if (key === 'options') optionsRaw = value;
      if (key === 'draws') draws = parseInt(value, 10) || 1;
    });
    if (!optionsRaw) return null;
    var options = optionsRaw.split(',').map(function (item) {
      var index = item.lastIndexOf(':');
      if (index < 0) return null;
      try {
        return { text: decodeURIComponent(item.slice(0, index)), weight: Number(item.slice(index + 1)) || 1 };
      } catch (_) { return null; }
    }).filter(Boolean);
    return normalizeConfig({
      options: options,
      mode: draws > 1 ? 'tournament' : 'single',
      rounds: draws,
      weighted: true
    });
  }

  function decodeHash(hash) {
    var body = String(hash || '').replace(/^#/, '');
    if (body.indexOf('picker=') !== 0) return decodeLegacyHash(hash);
    try {
      return normalizeConfig(JSON.parse(decodeURIComponent(body.slice(7))));
    } catch (_) {
      return null;
    }
  }

  function contrastText(hex) {
    var clean = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(clean)) return '#ffffff';
    var channels = [0, 2, 4].map(function (offset) {
      var value = parseInt(clean.slice(offset, offset + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    var luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    var whiteContrast = 1.05 / (luminance + 0.05);
    var inkContrast = (luminance + 0.05) / 0.055;
    return inkContrast >= whiteContrast ? '#1a1a2e' : '#ffffff';
  }

  return {
    VERSION: VERSION,
    MAX_OPTIONS: MAX_OPTIONS,
    MAX_NAME_LENGTH: MAX_NAME_LENGTH,
    MIN_PERCENT: MIN_PERCENT,
    clamp: clamp,
    id: id,
    secureRandom: secureRandom,
    nameLength: nameLength,
    trimName: trimName,
    sanitizeOption: sanitizeOption,
    validOptions: validOptions,
    percentages: percentages,
    displayPercentages: displayPercentages,
    equalize: equalize,
    rebalance: rebalance,
    weightedChoice: weightedChoice,
    weightedSampleWithoutReplacement: weightedSampleWithoutReplacement,
    runTournament: runTournament,
    parseBulk: parseBulk,
    normalizeConfig: normalizeConfig,
    encodeConfig: encodeConfig,
    decodeHash: decodeHash,
    contrastText: contrastText
  };
}));
