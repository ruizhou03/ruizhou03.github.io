(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var paths = {
    fine: '/files/data/dinggou/dinggou-scan-0-1.csv',
    coarse: '/files/data/dinggou/dinggou-half-to-three.csv',
    trace: '/files/data/dinggou/dinggou-trajectory-40.csv'
  };

  function parseCSV(text) {
    var lines = text.trim().split(/\r?\n/);
    var headers = lines.shift().split(',');
    return lines.map(function (line) {
      var values = line.split(',');
      var row = {};
      headers.forEach(function (header, index) {
        var value = values[index];
        row[header] = value !== '' && isFinite(value) ? Number(value) : value;
      });
      return row;
    });
  }

  function fetchCSV(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) throw new Error(path + ': ' + response.status);
      return response.text();
    }).then(parseCSV);
  }

  function svgElement(name, attrs, text) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeSVG(label) {
    var width = window.innerWidth <= 620 ? 360 : 680;
    var node = svgElement('svg', {
      viewBox: '0 0 ' + width + ' 350',
      role: 'img',
      'aria-label': label,
      preserveAspectRatio: 'xMidYMid meet'
    });
    node.dgBounds = {
      width: width,
      left: width <= 400 ? 46 : 58,
      right: width - (width <= 400 ? 38 : 30),
      top: 22,
      bottom: 304
    };
    return node;
  }

  function scale(domainMin, domainMax, rangeMin, rangeMax) {
    return function (value) {
      if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
      return rangeMin + (value - domainMin) / (domainMax - domainMin) * (rangeMax - rangeMin);
    };
  }

  function linePath(rows, x, y) {
    return rows.map(function (row, index) {
      return (index ? 'L' : 'M') + x(row).toFixed(1) + ',' + y(row).toFixed(1);
    }).join(' ');
  }

  function addAxes(svg, config) {
    var bounds = svg.dgBounds;
    var left = bounds.left, right = bounds.right, top = bounds.top, bottom = bounds.bottom;
    var i;
    for (i = 0; i <= 4; i += 1) {
      var y = top + (bottom - top) * i / 4;
      svg.appendChild(svgElement('line', { x1: left, y1: y, x2: right, y2: y, class: 'dg-grid' }));
      var value = config.yMax - (config.yMax - config.yMin) * i / 4;
      svg.appendChild(svgElement('text', { x: left - 8, y: y + 4, 'text-anchor': 'end', class: 'dg-label' }, config.yFormat(value)));
      if (config.y2Max !== undefined) {
        var value2 = config.y2Max - (config.y2Max - config.y2Min) * i / 4;
        svg.appendChild(svgElement('text', { x: right + 8, y: y + 4, class: 'dg-label' }, config.y2Format(value2)));
      }
    }
    config.xTicks.forEach(function (tick) {
      var x = config.xScale(tick);
      svg.appendChild(svgElement('line', { x1: x, y1: bottom, x2: x, y2: bottom + 5, class: 'dg-axis' }));
      svg.appendChild(svgElement('text', { x: x, y: bottom + 19, 'text-anchor': 'middle', class: 'dg-label' }, config.xFormat(tick)));
    });
    svg.appendChild(svgElement('line', { x1: left, y1: top, x2: left, y2: bottom, class: 'dg-axis' }));
    svg.appendChild(svgElement('line', { x1: left, y1: bottom, x2: right, y2: bottom, class: 'dg-axis' }));
    if (config.y2Max !== undefined) svg.appendChild(svgElement('line', { x1: right, y1: top, x2: right, y2: bottom, class: 'dg-axis' }));
    svg.appendChild(svgElement('text', { x: (left + right) / 2, y: 345, 'text-anchor': 'middle', class: 'dg-label dg-label-strong' }, config.xLabel));
  }

  function titleFor(row, fields) {
    return fields.map(function (field) { return field[0] + field[1](row); }).join('\n');
  }

  function renderFine(mount, rows) {
    var svg = makeSVG('0 到 1 副牌精细扫描：中位出牌手数与每局四分之三赛点次数');
    var bounds = svg.dgBounds;
    var mobile = bounds.width <= 400;
    var x = scale(4, 54, bounds.left, bounds.right);
    var y = scale(0, 160, bounds.bottom, bounds.top);
    var y2 = scale(0, 4.2, bounds.bottom, bounds.top);
    addAxes(svg, {
      yMin: 0, yMax: 160, yFormat: function (v) { return String(Math.round(v)); },
      y2Min: 0, y2Max: 4.2, y2Format: function (v) { return v.toFixed(1); },
      xTicks: mobile ? [4, 14, 27, 40, 54] : [4, 14, 24, 34, 44, 54], xScale: x,
      xFormat: function (v) { return (v / 54).toFixed(2); }, xLabel: '副牌数（总张数 ÷ 54）'
    });
    svg.appendChild(svgElement('text', { x: 8, y: 14, class: 'dg-label dg-label-strong' }, '中位手数'));
    svg.appendChild(svgElement('text', { x: bounds.width - 4, y: 14, 'text-anchor': 'end', class: 'dg-label dg-label-strong' }, '赛点次数'));
    svg.appendChild(svgElement('path', {
      d: linePath(rows, function (r) { return x(r.cards); }, function (r) { return y(r.median_plays); }),
      class: 'dg-line-b'
    }));
    svg.appendChild(svgElement('path', {
      d: linePath(rows, function (r) { return x(r.cards); }, function (r) { return y2(r.avg_75_entries); }),
      class: 'dg-line-a'
    }));
    rows.forEach(function (row) {
      var dot = svgElement('circle', { cx: x(row.cards), cy: y2(row.avg_75_entries), r: 2.6, class: 'dg-dot' });
      dot.appendChild(svgElement('title', {}, titleFor(row, [
        ['总张数：', function (r) { return r.cards; }],
        ['中位手数：', function (r) { return r.median_plays; }],
        ['赛点次数：', function (r) { return r.avg_75_entries.toFixed(2); }]
      ])));
      svg.appendChild(dot);
    });
    mount.replaceChildren(svg);
  }

  function pareto(rows) {
    return rows.filter(function (point) {
      return !rows.some(function (other) {
        return other.median_plays <= point.median_plays &&
          other.avg_meaningful_swings >= point.avg_meaningful_swings &&
          (other.median_plays < point.median_plays || other.avg_meaningful_swings > point.avg_meaningful_swings);
      });
    }).sort(function (a, b) { return a.median_plays - b.median_plays; });
  }

  function renderPareto(mount, rows) {
    var svg = makeSVG('游戏时长与重大摇摆次数的 Pareto 权衡');
    var tooltip = document.createElement('div');
    tooltip.className = 'dg-chart-tooltip';
    tooltip.hidden = true;
    var bounds = svg.dgBounds;
    var mobile = bounds.width <= 400;
    var x = scale(0, 1200, bounds.left, bounds.right);
    var y = scale(0.7, 2.0, bounds.bottom, bounds.top);
    addAxes(svg, {
      yMin: 0.7, yMax: 2.0, yFormat: function (v) { return v.toFixed(1); },
      xTicks: mobile ? [0, 400, 800, 1200] : [0, 200, 400, 600, 800, 1000, 1200], xScale: x,
      xFormat: function (v) { return String(v); }, xLabel: '中位出牌手数（越左越快）'
    });
    svg.appendChild(svgElement('text', { x: 8, y: 14, class: 'dg-label dg-label-strong' }, '重大摇摆/局'));
    var front = pareto(rows);
    svg.appendChild(svgElement('path', {
      d: linePath(front, function (r) { return x(r.median_plays); }, function (r) { return y(r.avg_meaningful_swings); }),
      class: 'dg-line-a'
    }));
    rows.forEach(function (row) {
      var isFront = front.indexOf(row) >= 0;
      var dot = svgElement('circle', {
        cx: x(row.median_plays), cy: y(row.avg_meaningful_swings), r: isFront ? 4.3 : 3,
        class: isFront ? 'dg-dot-front' : 'dg-dot'
      });
      dot.appendChild(svgElement('title', {}, titleFor(row, [
        ['总张数：', function (r) { return r.cards; }],
        ['中位手数：', function (r) { return r.median_plays; }],
        ['重大摇摆：', function (r) { return r.avg_meaningful_swings.toFixed(2); }]
      ])));
      function showTooltip() {
        tooltip.textContent = row.cards + ' 张 · x = ' + row.median_plays + ' 手 · y = ' +
          row.avg_meaningful_swings.toFixed(2) + ' 次/局 · ' + (isFront ? 'Pareto 前沿' : '被占优');
        tooltip.hidden = false;
        tooltip.style.transform = 'translate(-50%, -100%)';
        var mountRect = mount.getBoundingClientRect();
        var dotRect = dot.getBoundingClientRect();
        var left = dotRect.left - mountRect.left + dotRect.width / 2;
        var top = dotRect.top - mountRect.top - 8;
        var halfWidth = tooltip.offsetWidth / 2;
        left = Math.max(halfWidth + 6, Math.min(mountRect.width - halfWidth - 6, left));
        if (top < tooltip.offsetHeight + 6) {
          top = dotRect.bottom - mountRect.top + 8;
          tooltip.style.transform = 'translate(-50%, 0)';
        }
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
      }
      dot.addEventListener('mouseenter', showTooltip);
      dot.addEventListener('focus', showTooltip);
      dot.addEventListener('click', showTooltip);
      dot.addEventListener('mouseleave', function () { tooltip.hidden = true; });
      dot.addEventListener('blur', function () { tooltip.hidden = true; });
      dot.setAttribute('tabindex', '0');
      svg.appendChild(dot);
    });
    mount.replaceChildren(svg, tooltip);
  }

  function renderTrace(mount, rows) {
    var svg = makeSVG('一局 40 张钉勾的牌权轨迹：落后方曾达到四分之三优势，最终被反超');
    var bounds = svg.dgBounds;
    var mobile = bounds.width <= 400;
    var maxPlay = rows[rows.length - 1].play;
    var x = scale(0, maxPlay, bounds.left, bounds.right);
    var y = scale(0, 1, bounds.bottom, bounds.top);
    addAxes(svg, {
      yMin: 0, yMax: 1, yFormat: function (v) { return Math.round(v * 100) + '%'; },
      xTicks: mobile ? [0, 50, 100, maxPlay] : [0, 25, 50, 75, 100, 125, maxPlay], xScale: x,
      xFormat: function (v) { return String(v); }, xLabel: '累计出牌手数'
    });
    svg.insertBefore(svgElement('rect', { x: bounds.left, y: y(0.75), width: bounds.right - bounds.left, height: y(0.5) - y(0.75), class: 'dg-band' }), svg.firstChild);
    [0.5, 0.75].forEach(function (threshold) {
      svg.appendChild(svgElement('line', { x1: bounds.left, y1: y(threshold), x2: bounds.right, y2: y(threshold), class: 'dg-threshold' }));
      svg.appendChild(svgElement('text', { x: bounds.right - 4, y: y(threshold) - 5, 'text-anchor': 'end', class: 'dg-label' }, threshold === 0.75 ? '3/4 赛点' : '1/2 优劣线'));
    });
    svg.appendChild(svgElement('path', {
      d: linePath(rows, function (r) { return x(r.play); }, function (r) { return y(r.a_share); }),
      class: 'dg-line-a'
    }));
    svg.appendChild(svgElement('path', {
      d: linePath(rows, function (r) { return x(r.play); }, function (r) { return y(r.b_share); }),
      class: 'dg-line-b'
    }));
    rows.filter(function (row, index) {
      if (!index) return false;
      var previous = rows[index - 1];
      return (row.a_share >= 0.75 && previous.a_share < 0.75) ||
        (row.b_share >= 0.75 && previous.b_share < 0.75);
    }).forEach(function (row) {
      svg.appendChild(svgElement('line', { x1: x(row.play), y1: bounds.top, x2: x(row.play), y2: bounds.bottom, class: 'dg-event' }));
    });
    mount.replaceChildren(svg);
  }

  function showError(mount) {
    mount.innerHTML = '<div class="dg-error">图表数据加载失败，可用下方 CSV 直接查看。</div>';
  }

  var rulesDetails = document.querySelector ? document.querySelector('.dg-rules-details') : null;
  var rulesFlow = rulesDetails && rulesDetails.querySelector('.dg-rules-flow');
  var mermaidPromise;

  function darkThemeActive() {
    var selected = document.documentElement.getAttribute('data-theme');
    if (selected === 'dark') return true;
    if (selected === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function loadMermaid() {
    if (!mermaidPromise) {
      mermaidPromise = import('https://cdn.jsdelivr.net/npm/mermaid@11.16.0/dist/mermaid.esm.min.mjs');
    }
    return mermaidPromise;
  }

  async function renderRulesFlow(force) {
    if (!rulesDetails || !rulesFlow || !rulesDetails.open) return;
    if (rulesFlow.dataset.rendered === 'true' && !force) return;
    var source = rulesFlow.dataset.source || rulesFlow.textContent.trim();
    rulesFlow.dataset.source = source;
    rulesFlow.dataset.rendered = 'false';
    rulesFlow.removeAttribute('data-processed');
    rulesFlow.textContent = source;
    rulesFlow.classList.remove('is-error');
    rulesFlow.classList.add('is-loading');
    try {
      var module = await loadMermaid();
      var mermaid = module.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: darkThemeActive() ? 'dark' : 'neutral',
        fontFamily: window.getComputedStyle(document.body).fontFamily,
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
      });
      await mermaid.run({ nodes: [rulesFlow] });
      rulesFlow.dataset.rendered = 'true';
    } catch (error) {
      rulesFlow.classList.add('is-error');
    } finally {
      rulesFlow.classList.remove('is-loading');
    }
  }

  if (rulesDetails) {
    rulesDetails.addEventListener('toggle', function () { renderRulesFlow(false); });
    var themeObserver = new MutationObserver(function () { renderRulesFlow(true); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      var darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
      if (darkMedia.addEventListener) darkMedia.addEventListener('change', function () { renderRulesFlow(true); });
    }
  }

  Promise.all([fetchCSV(paths.fine), fetchCSV(paths.coarse), fetchCSV(paths.trace)])
    .then(function (sets) {
      var fine = sets[0];
      var coarse = sets[1];
      var trace = sets[2];
      var paretoRows = fine.filter(function (row) { return row.cards >= 27; })
        .concat(coarse.filter(function (row) { return row.cards > 54; }));
      document.querySelectorAll('[data-dg-chart="fine"]').forEach(function (node) { renderFine(node, fine); });
      document.querySelectorAll('[data-dg-chart="pareto"]').forEach(function (node) { renderPareto(node, paretoRows); });
      document.querySelectorAll('[data-dg-chart="trace"]').forEach(function (node) { renderTrace(node, trace); });
    })
    .catch(function () {
      document.querySelectorAll('[data-dg-chart]').forEach(showError);
    });
}());
