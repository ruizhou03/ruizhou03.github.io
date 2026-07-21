#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'assets/js/dinggou-optimal-cards.js'), 'utf8');

class FakeNode {
  constructor(name) {
    this.nodeName = name;
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this.innerHTML = '';
    this.firstChild = null;
    this.style = {};
    this.hidden = false;
    this.className = '';
    this.offsetWidth = 180;
    this.offsetHeight = 36;
    this.listeners = {};
  }

  setAttribute(key, value) {
    this.attributes[key] = String(value);
  }

  appendChild(child) {
    this.children.push(child);
    this.firstChild = this.children[0] || null;
    return child;
  }

  insertBefore(child, before) {
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? 0 : index, 0, child);
    this.firstChild = this.children[0] || null;
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
    this.firstChild = this.children[0] || null;
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  dispatch(type) {
    (this.listeners[type] || []).forEach(listener => listener());
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, right: 680, bottom: 350, width: 680, height: 350 };
  }
}

function count(node, name) {
  return (node.nodeName === name ? 1 : 0) + node.children.reduce((sum, child) => sum + count(child, name), 0);
}

function findAll(node, name) {
  return (node.nodeName === name ? [node] : []).concat(...node.children.map(child => findAll(child, name)));
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serialize(node) {
  const attrs = Object.entries(node.attributes)
    .map(([key, value]) => ` ${key}="${escapeText(value)}"`).join('');
  const body = escapeText(node.textContent) + node.children.map(serialize).join('');
  return `<${node.nodeName}${attrs}>${body}</${node.nodeName}>`;
}

async function run(width) {
  const mounts = {
    fine: new FakeNode('div'),
    pareto: new FakeNode('div'),
    trace: new FakeNode('div')
  };
  const document = {
    createElement: name => new FakeNode(name),
    createElementNS: (_namespace, name) => new FakeNode(name),
    querySelectorAll: selector => {
      const match = selector.match(/data-dg-chart="([^"]+)"/);
      if (match) return [mounts[match[1]]];
      return selector === '[data-dg-chart]' ? Object.values(mounts) : [];
    }
  };
  const fetch = async url => ({
    ok: true,
    text: async () => fs.readFileSync(path.join(root, url), 'utf8')
  });
  const context = { document, fetch, window: { innerWidth: width }, console, isFinite, setTimeout };
  vm.runInNewContext(source, context, { filename: 'dinggou-optimal-cards.js' });
  await new Promise(resolve => setTimeout(resolve, 20));

  for (const [name, mount] of Object.entries(mounts)) {
    if (!mount.firstChild || mount.firstChild.nodeName !== 'svg') {
      throw new Error(`${name}: SVG was not rendered at ${width}px`);
    }
    const minimumPaths = name === 'pareto' ? 1 : 2;
    if (count(mount.firstChild, 'path') < minimumPaths) {
      throw new Error(`${name}: expected chart paths at ${width}px`);
    }
    const expectedViewBox = width <= 620 ? '0 0 360 350' : '0 0 680 350';
    if (mount.firstChild.attributes.viewBox !== expectedViewBox) {
      throw new Error(`${name}: wrong viewBox at ${width}px`);
    }
  }
  const paretoTooltip = mounts.pareto.children[1];
  const paretoDots = findAll(mounts.pareto.firstChild, 'circle');
  paretoDots[0].dispatch('mouseenter');
  if (paretoTooltip.hidden || !paretoTooltip.textContent.includes('x =') || !paretoTooltip.textContent.includes('y =')) {
    throw new Error(`pareto: coordinate tooltip did not open at ${width}px`);
  }
  paretoDots[0].dispatch('mouseleave');
  if (!paretoTooltip.hidden) throw new Error(`pareto: coordinate tooltip did not close at ${width}px`);
  if (process.env.DINGGOU_SNAPSHOT_DIR) {
    fs.mkdirSync(process.env.DINGGOU_SNAPSHOT_DIR, { recursive: true });
    const style = '<style>.dg-grid{stroke:#ddd}.dg-axis{stroke:#777}.dg-label{fill:#666;font:11px serif}.dg-label-strong{fill:#222;font-weight:600}.dg-line-a{fill:none;stroke:#b77a2a;stroke-width:2.5}.dg-line-b{fill:none;stroke:#467aa1;stroke-width:2.5}.dg-dot{fill:#fff;stroke:#b77a2a}.dg-dot-front{fill:#b77a2a;stroke:#fff}.dg-threshold,.dg-event{stroke:#a85757;stroke-dasharray:4 4}.dg-band{fill:#f4eadb}</style>';
    for (const [name, mount] of Object.entries(mounts)) {
      let output = serialize(mount.firstChild).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
      output = output.replace('>', `>${style}`);
      fs.writeFileSync(path.join(process.env.DINGGOU_SNAPSHOT_DIR, `${name}-${width}.svg`), output);
    }
  }
  return {
    width,
    fineDots: count(mounts.fine.firstChild, 'circle'),
    paretoDots: count(mounts.pareto.firstChild, 'circle'),
    tracePaths: count(mounts.trace.firstChild, 'path')
  };
}

(async () => {
  const desktop = await run(1280);
  const mobile = await run(390);
  console.log(JSON.stringify({ desktop, mobile }));
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
