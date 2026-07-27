(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var XLINK = '/assets/icons/zircon-ui.svg#i-';
  var MARKER = /\[\[zi:([a-z0-9-]+)(?::([a-z0-9-]+))?\]\]/gi;
  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|PRE|CODE|SVG|MATH)$/;
  var scheduled = false;
  var started = false;
  var pendingRoots = [];

  function icon(name, variant) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'zi-icon' + (variant ? ' zi-icon--' + variant : ''));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', XLINK + name);
    svg.appendChild(use);
    return svg;
  }

  function shouldSkip(node) {
    var parent = node && node.parentElement;
    if (!parent || SKIP.test(parent.tagName)) return true;
    return !!parent.closest('[data-zi-native], .waline, [contenteditable="true"]');
  }

  function hydrateText(node) {
    if (!node || !node.nodeValue || node.nodeValue.indexOf('[[zi:') === -1 || shouldSkip(node)) return;
    var text = node.nodeValue;
    var fragment = document.createDocumentFragment();
    var last = 0;
    var found = false;
    text.replace(MARKER, function (whole, name, variant, offset) {
      found = true;
      if (offset > last) fragment.appendChild(document.createTextNode(text.slice(last, offset)));
      fragment.appendChild(icon(name, variant));
      last = offset + whole.length;
      return whole;
    });
    if (!found) return;
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(fragment, node);
  }

  function cleanAttributes(root) {
    if (!root.querySelectorAll) return;
    var elements = [];
    if (root.nodeType === 1) elements.push(root);
    elements = elements.concat(Array.prototype.slice.call(root.querySelectorAll('[title*="[[zi:"], [aria-label*="[[zi:"]')));
    elements.forEach(function (el) {
      ['title', 'aria-label'].forEach(function (name) {
        var value = el.getAttribute(name);
        if (value && value.indexOf('[[zi:') !== -1) {
          el.setAttribute(name, value.replace(MARKER, '').replace(/\s{2,}/g, ' ').trim());
        }
      });
    });
  }

  function hydrate(root) {
    root = root || document.body;
    if (!root) return;
    cleanAttributes(root);
    if (root.nodeType === 3) {
      hydrateText(root);
      return;
    }
    var nodes = [];
    // XPath 直接筛出含 marker 的文本节点，避免在 JS 中遍历大型牌桌的全部文本。
    try {
      var result = document.evaluate(
        './/text()[contains(., "[[zi:")]',
        root,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (var i = 0; i < result.snapshotLength; i++) nodes.push(result.snapshotItem(i));
    } catch (_) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.indexOf('[[zi:') !== -1) nodes.push(node);
      }
    }
    nodes.forEach(hydrateText);
  }

  function flush() {
    scheduled = false;
    var roots = pendingRoots;
    pendingRoots = [];
    // HTML parser 会逐节点触发 MutationObserver。逐个子树在同一帧全部处理会把大型
    // 游戏页放大成 >50ms 任务；按帧限量处理，同时仍在首屏几帧内完成 hydration。
    if (roots.length > 24) {
      var batch = [];
      while (roots.length && batch.length < 3) {
        var next = roots.shift();
        var element = next && next.nodeType === 3 ? next.parentNode : next;
        if (element && element.children && element.children.length > 8) {
          roots = Array.prototype.slice.call(element.children).concat(roots);
        } else {
          batch.push(next);
        }
      }
      batch.forEach(hydrate);
      pendingRoots = roots.concat(pendingRoots);
      scheduled = true;
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
      else setTimeout(flush, 0);
      return;
    }
    var minimal = [];
    roots.forEach(function (root) {
      var candidate = root && root.nodeType === 3 ? root.parentNode : root;
      if (!candidate || !candidate.isConnected) return;
      if (minimal.some(function (kept) { return kept === candidate || kept.contains(candidate); })) return;
      minimal = minimal.filter(function (kept) { return !candidate.contains(kept); });
      minimal.push(candidate);
    });
    minimal.forEach(hydrate);
  }

  function schedule(root) {
    pendingRoots.push(root);
    if (scheduled) return;
    scheduled = true;
    // rAF 在首帧绘制前执行，既保持 marker 无闪烁，又把同一解析帧的变更合并。
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
    else setTimeout(flush, 0);
  }

  function start() {
    if (started) return;
    started = true;
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') schedule(record.target);
        Array.prototype.forEach.call(record.addedNodes || [], schedule);
      });
    }).observe(document.documentElement, {subtree: true, childList: true, characterData: true});
    hydrate(document.body || document.documentElement);
  }

  window.ZirconIcons = {
    create: icon,
    hydrate: hydrate,
    marker: function (name, variant) {
      return '[[zi:' + name + (variant ? ':' + variant : '') + ']]';
    }
  };

  start();
}());
