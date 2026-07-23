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
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.indexOf('[[zi:') !== -1) nodes.push(node);
    }
    nodes.forEach(hydrateText);
  }

  function flush() {
    scheduled = false;
    var roots = pendingRoots;
    pendingRoots = [];
    roots.forEach(hydrate);
  }

  function schedule(root) {
    pendingRoots.push(root);
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(flush);
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
