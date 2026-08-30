(function () {
  'use strict';

  var WIDTH = 1200;
  var HEIGHT = 800;
  var COLORS = ['#b56f61', '#657f3f', '#426d9c', '#9a702f', '#79567f', '#3f7472', '#8b5f43', '#536983', '#8c5265', '#46673b'];

  function escapeXml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character];
    });
  }

  function textUnits(value) {
    return Array.from(String(value || '')).reduce(function (total, character) {
      return total + (/^[\x00-\xff]$/.test(character) ? 1 : 2);
    }, 0);
  }

  function truncate(value, maxUnits) {
    var characters = Array.from(String(value || ''));
    var output = '';
    var units = 0;
    for (var index = 0; index < characters.length; index += 1) {
      var next = /^[\x00-\xff]$/.test(characters[index]) ? 1 : 2;
      if (units + next > maxUnits) return output + '…';
      output += characters[index];
      units += next;
    }
    return output;
  }

  function truncateCharacters(value, maxLength) {
    var characters = Array.from(String(value || ''));
    return characters.length > maxLength ? characters.slice(0, maxLength).join('') + '…' : characters.join('');
  }

  function polar(cx, cy, radius, angle) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function contrast(color) {
    var value = color.replace('#', '');
    var red = parseInt(value.slice(0, 2), 16);
    var green = parseInt(value.slice(2, 4), 16);
    var blue = parseInt(value.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#17252d' : '#fff8d9';
  }

  function normalize(data) {
    var options = (data.options || []).map(function (option, index) {
      return {
        name: String(option.name || ('选项 ' + (index + 1))),
        weight: Math.max(0, Number(option.weight) || 0),
        votes: Math.max(0, Math.round(Number(option.votes) || 0)),
        color: option.color || COLORS[index % COLORS.length],
        index: index
      };
    });
    if (!options.length) options = [{ name: '选项 1', weight: 50, votes: 0, color: COLORS[0], index: 0 }, { name: '选项 2', weight: 50, votes: 0, color: COLORS[1], index: 1 }];
    var weightTotal = options.reduce(function (sum, option) { return sum + option.weight; }, 0);
    if (!weightTotal) options.forEach(function (option) { option.weight = 100 / options.length; });
    else options.forEach(function (option) { option.weight = option.weight / weightTotal * 100; });
    var maxVotes = Math.max.apply(null, options.map(function (option) { return option.votes; }).concat([0]));
    var winners = options.filter(function (option) { return option.votes === maxVotes; });
    if (!maxVotes && data.selectedIndexes && data.selectedIndexes.length) winners = options.filter(function (option) { return data.selectedIndexes.indexOf(option.index) >= 0; });
    if (!winners.length) winners = [options[0]];
    return {
      mode: data.mode || '多轮决胜',
      modeType: data.modeType || 'tournament',
      options: options,
      winners: winners,
      maxVotes: maxVotes,
      rounds: Math.max(1, Math.round(Number(data.rounds) || Math.max(1, options.reduce(function (sum, option) { return sum + option.votes; }, 0))))
    };
  }

  function headlineParts(normalized) {
    var names = normalized.winners.map(function (winner) { return winner.name; });
    var accent;
    var suffix;
    if (normalized.modeType === 'multiple') {
      accent = names.length + ' 项';
      suffix = '已抽出';
    } else if (names.length > 1) {
      accent = truncate(names.join('、'), 12);
      suffix = '并列胜出';
    } else if (normalized.modeType === 'single') {
      accent = truncate(names[0], 12);
      suffix = '被选中';
    } else {
      accent = truncate(names[0], 12);
      suffix = '赢了';
    }
    return { accent: accent, suffix: suffix };
  }

  function renderWheel(normalized) {
    var cx = 885;
    var cy = 367;
    var radius = 252;
    var total = normalized.options.reduce(function (sum, option) { return sum + option.weight; }, 0) || 100;
    var angleOffset = 0;
    if (normalized.winners.length === 1) {
      var winnerIndex = normalized.winners[0].index;
      var winnerStart = normalized.options.slice(0, winnerIndex).reduce(function (sum, option) { return sum + option.weight; }, 0) / total;
      var winnerFraction = normalized.options[winnerIndex].weight / total;
      angleOffset = -(winnerStart + winnerFraction / 2) * Math.PI * 2;
    }
    var accumulated = 0;
    var output = '';
    normalized.options.forEach(function (option) {
      var fraction = option.weight / total;
      var start = accumulated;
      accumulated += fraction;
      var a0 = start * Math.PI * 2 - Math.PI / 2 + angleOffset;
      var a1 = accumulated * Math.PI * 2 - Math.PI / 2 + angleOffset;
      var p0 = polar(cx, cy, radius, a0);
      var p1 = polar(cx, cy, radius, a1);
      output += '<path d="M' + cx + ' ' + cy + ' L' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) + ' A' + radius + ' ' + radius + ' 0 ' + (fraction > 0.5 ? 1 : 0) + ' 1 ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) + ' Z" fill="' + option.color + '" stroke="#fff8d9" stroke-width="3"/>';
      if (fraction >= 0.055 && option.name.trim()) {
        var mid = (a0 + a1) / 2;
        var labelRadius = fraction > 0.22 ? 160 : 185;
        var labelPoint = polar(cx, cy, labelRadius, mid);
        var label = truncateCharacters(option.name, fraction > 0.22 ? 6 : 4);
        var fontSize = Math.min(30, 16 + fraction * 38, (2 * Math.PI * labelRadius * fraction) / Math.max(1, textUnits(label) * 0.55));
        var rotation = mid * 180 / Math.PI + 90;
        while (rotation > 180) rotation -= 360;
        while (rotation <= -180) rotation += 360;
        if (rotation > 90) rotation -= 180;
        if (rotation < -90) rotation += 180;
        if (fontSize >= 17) output += '<text class="wheel-label" x="' + labelPoint.x.toFixed(2) + '" y="' + labelPoint.y.toFixed(2) + '" fill="' + contrast(option.color) + '" font-size="' + fontSize.toFixed(1) + '" transform="rotate(' + rotation.toFixed(2) + ' ' + labelPoint.x.toFixed(2) + ' ' + labelPoint.y.toFixed(2) + ')">' + escapeXml(label) + '</text>';
      }
    });
    output += '<circle cx="' + cx + '" cy="' + cy + '" r="40" fill="#f5f1e8" stroke="#b89252" stroke-width="10"/><circle cx="' + cx + '" cy="' + cy + '" r="12" fill="#1e3a5f"/><circle cx="' + cx + '" cy="' + cy + '" r="255" fill="none" stroke="#1e3a5f" stroke-width="8"/>';
    output += '<path d="M' + (cx - 24) + ' 82 H' + (cx + 24) + ' L' + cx + ' 128 Z" fill="#ffe552" stroke="#17252d" stroke-width="4"/>';
    return output;
  }

  function renderBars(normalized) {
    var sorted = normalized.options.slice().sort(function (a, b) { return b.votes - a.votes || b.weight - a.weight || a.index - b.index; });
    var shown = sorted.slice(0, 6);
    var count = shown.length;
    var rowHeight = count <= 2 ? 96 : count === 3 ? 80 : count === 4 ? 70 : 58;
    var startY = 288;
    var trackWidth = 438;
    var output = '<text x="70" y="262" class="section-label">FINAL VOTES · ' + count + ' / ' + normalized.options.length + '</text>';
    shown.forEach(function (option, index) {
      var y = startY + index * rowHeight;
      var winner = normalized.winners.some(function (candidate) { return candidate.index === option.index; });
      if (winner) output += '<rect x="68" y="' + (y - 12) + '" width="466" height="' + (rowHeight - 8) + '" rx="12" fill="#fff8d9" stroke="#17252d" stroke-width="4"/>';
      else output += '<rect x="68" y="' + (y - 12) + '" width="466" height="' + (rowHeight - 8) + '" rx="12" fill="#ffffff" fill-opacity=".26" stroke="#17252d" stroke-opacity=".32" stroke-width="2"/>';
      output += '<circle cx="88" cy="' + (y + 10) + '" r="7" fill="' + option.color + '"/><text x="107" y="' + (y + 17) + '" class="bar-name">' + escapeXml(truncate(option.name, 14)) + '</text><text x="435" y="' + (y + 16) + '" class="bar-weight" text-anchor="end">' + Math.round(option.weight) + '% 权重</text>';
      output += '<text x="512" y="' + (y + 17) + '" class="bar-votes" text-anchor="end">' + option.votes + ' 票</text><rect x="82" y="' + (y + 34) + '" width="' + trackWidth + '" height="10" rx="5" fill="#17252d" fill-opacity=".16"/>';
      var barWidth = normalized.maxVotes ? trackWidth * option.votes / normalized.maxVotes : 0;
      if (barWidth > 0) output += '<rect x="82" y="' + (y + 34) + '" width="' + Math.max(5, barWidth).toFixed(2) + '" height="10" rx="5" fill="' + option.color + '"/>';
    });
    if (normalized.options.length > shown.length) {
      var omitted = sorted.slice(shown.length);
      var overflow = '<g class="overflow-indicator">';
      omitted.slice(0, 3).forEach(function (option, index) { overflow += '<circle cx="' + (78 + index * 20) + '" cy="650" r="6" fill="' + option.color + '"/>'; });
      overflow += '<text x="145" y="656" class="overflow-ellipsis">…</text><rect x="170" y="634" width="62" height="30" rx="15" fill="#fff8d9" stroke="#17252d" stroke-width="2"/><text x="201" y="655" class="overflow-count" text-anchor="middle">+' + omitted.length + '</text></g>';
      output += overflow;
    }
    return output;
  }

  function renderSvg(data) {
    var normalized = normalize(data || {});
    var headline = headlineParts(normalized);
    var modeLabel = normalized.modeType === 'tournament' ? String(normalized.rounds).padStart(2, '0') + ' ROUNDS' : normalized.mode.toUpperCase();
    var winnerSize = textUnits(headline.accent) <= 6 ? 92 : textUnits(headline.accent) <= 10 ? 76 : 60;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + WIDTH + '" height="' + HEIGHT + '" viewBox="0 0 ' + WIDTH + ' ' + HEIGHT + '">' +
      '<style>text{font-family:"Avenir Next","PingFang SC","Noto Sans CJK SC",sans-serif;fill:#17252d}.serif{font-family:"Songti SC","Noto Serif CJK SC","STSong",serif}.kicker,.section-label,.footer{font-family:"Avenir Next",Arial,sans-serif;font-weight:800;letter-spacing:3px}.kicker{font-size:16px}.headline-line{font-family:"Songti SC","Noto Serif CJK SC","STSong",serif;font-weight:800}.headline-winner{fill:#ff7867}.headline-suffix{fill:#17252d;font-size:48px}.section-label{font-size:14px}.bar-name{font-family:"Songti SC","Noto Serif CJK SC","STSong",serif;font-size:24px;font-weight:700}.bar-weight{font-family:"Songti SC","Noto Serif CJK SC","STSong",serif;font-size:17px;fill:#536983}.bar-votes{font-family:"Songti SC","Noto Serif CJK SC","STSong",serif;font-size:22px;font-weight:800}.wheel-label{font-family:"Songti SC","Noto Serif CJK SC","STSong",serif;font-weight:700;text-anchor:middle;dominant-baseline:middle}.overflow-ellipsis{font-family:Georgia,serif;font-size:25px}.overflow-count{font-family:"Avenir Next",Arial,sans-serif;font-size:15px;font-weight:900}.tagline{font-size:24px;font-weight:800}.footer{font-size:14px}</style>' +
      '<rect width="1200" height="800" fill="#75cfe1"/><text x="70" y="70" class="kicker">RANDOM PICKER · ' + escapeXml(modeLabel) + '</text>' +
      '<text x="70" y="190" class="headline-line"><tspan class="headline-winner" style="font-size:' + winnerSize + 'px">' + escapeXml(headline.accent) + '</tspan><tspan class="headline-suffix" dx="18">' + escapeXml(headline.suffix) + '</tspan></text>' +
      renderBars(normalized) + renderWheel(normalized) +
      '<text x="70" y="705" class="tagline serif">遇事不决，转盘解决。</text><rect y="720" width="1200" height="80" fill="#ffe552"/><rect y="720" width="1200" height="7" fill="#17252d"/><text x="50" y="770" class="footer">' + normalized.options.length + ' OPTIONS · ' + escapeXml(normalized.mode.toUpperCase()) + '</text><text x="1150" y="770" class="footer" text-anchor="end">RUIZHOU03.COM/TOOLBOX/PICKER</text></svg>';
  }

  function svgDataUrl(data) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderSvg(data));
  }

  function toPngBlob(data) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, WIDTH, HEIGHT);
        canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('PNG generation failed')); }, 'image/png');
      };
      image.onerror = function () { reject(new Error('SVG rendering failed')); };
      image.src = svgDataUrl(data);
    });
  }

  window.PickerResultCard = { width: WIDTH, height: HEIGHT, renderSvg: renderSvg, svgDataUrl: svgDataUrl, toPngBlob: toPngBlob };
})();
