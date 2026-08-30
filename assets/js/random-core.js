(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RandomCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function hashSeed(value) {
    const text = String(value == null ? '' : value);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return h >>> 0;
  }

  function createSeededRandom(seed) {
    let a = hashSeed(seed);
    return function random() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createSecureRandom(cryptoObject) {
    const source = cryptoObject && typeof cryptoObject.getRandomValues === 'function'
      ? cryptoObject
      : null;
    if (!source) return Math.random;
    const pool = new Uint32Array(1024);
    let cursor = pool.length;
    return function random() {
      if (cursor >= pool.length) {
        source.getRandomValues(pool);
        cursor = 0;
      }
      return pool[cursor++] / 4294967296;
    };
  }

  // Positive nodes and weights for 16-point Gauss-Legendre quadrature.
  const GL_X = [
    0.09501250983763744, 0.2816035507792589,
    0.4580167776572274, 0.6178762444026438,
    0.755404408355003, 0.8656312023878318,
    0.9445750230732326, 0.9894009349916499,
  ];
  const GL_W = [
    0.1894506104550685, 0.1826034150449236,
    0.16915651939500254, 0.14959598881657673,
    0.12462897125553388, 0.09515851168249278,
    0.06225352393864789, 0.027152459411754096,
  ];

  // The cosine transform removes common algebraic endpoint singularities,
  // such as Beta(1/2, 1/2), before applying composite Gauss-Legendre.
  function integrateFinite(fn, a, b, panels) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
    const nPanels = Math.max(1, Math.floor(panels || 8));
    const span = b - a;
    function transformed(t) {
      const angle = Math.PI * t;
      const x = a + span * (1 - Math.cos(angle)) * 0.5;
      const jacobian = span * Math.PI * Math.sin(angle) * 0.5;
      const value = fn(x);
      return Number.isFinite(value) ? value * jacobian : 0;
    }
    let total = 0;
    for (let panel = 0; panel < nPanels; panel++) {
      const lo = panel / nPanels;
      const hi = (panel + 1) / nPanels;
      const mid = (lo + hi) * 0.5;
      const half = (hi - lo) * 0.5;
      for (let i = 0; i < GL_X.length; i++) {
        const dx = half * GL_X[i];
        total += half * GL_W[i] * (transformed(mid - dx) + transformed(mid + dx));
      }
    }
    return total;
  }

  function discreteIntervalProbability(support, pdf, a, b) {
    let total = 0;
    for (const value of support) {
      if (value >= a && value <= b) total += pdf(value);
    }
    return total;
  }

  function normalizePdf(pdf, a, b) {
    const mass = integrateFinite(pdf, a, b, 16);
    if (!(mass > 0) || !Number.isFinite(mass)) throw new Error('PDF has no finite positive mass');
    return {
      mass,
      pdf: x => pdf(x) / mass,
    };
  }

  function conditionCdf(cdf, a, b) {
    const lower = cdf(a);
    const upper = cdf(b);
    const mass = upper - lower;
    if (!(mass > 0) || !Number.isFinite(mass)) throw new Error('CDF has no finite positive mass');
    return {
      lower,
      upper,
      mass,
      cdf: x => {
        if (x <= a) return 0;
        if (x >= b) return 1;
        return Math.max(0, Math.min(1, (cdf(x) - lower) / mass));
      },
    };
  }

  function sampleStats(values, a, b) {
    let n = 0;
    let mean = 0;
    let m2 = 0;
    let hits = 0;
    for (const value of values) {
      n++;
      const delta = value - mean;
      mean += delta / n;
      m2 += delta * (value - mean);
      if (a != null && b != null && value >= a && value <= b) hits++;
    }
    return {
      n,
      mean: n ? mean : NaN,
      populationVariance: n ? m2 / n : NaN,
      sampleVariance: n > 1 ? m2 / (n - 1) : NaN,
      hits,
    };
  }

  const EXPRESSION_FUNCTIONS = new Set([
    'exp', 'log', 'ln', 'sqrt', 'abs',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh',
    'floor', 'ceil', 'round', 'min', 'max', 'pow',
  ]);

  function parseExpressionTree(source) {
    const text = String(source == null ? '' : source).trim();
    if (!text) throw new Error('表达式为空');
    const tokens = [];
    let cursor = 0;
    while (cursor < text.length) {
      const rest = text.slice(cursor);
      const whitespace = rest.match(/^\s+/);
      if (whitespace) { cursor += whitespace[0].length; continue; }
      const number = rest.match(/^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?/i);
      if (number) { tokens.push({ type: 'number', value: number[0] }); cursor += number[0].length; continue; }
      const identifier = rest.match(/^[A-Za-z_][A-Za-z_0-9]*/);
      if (identifier) { tokens.push({ type: 'identifier', value: identifier[0] }); cursor += identifier[0].length; continue; }
      const symbol = rest[0];
      if ('+-*/^(),'.includes(symbol)) { tokens.push({ type: symbol, value: symbol }); cursor++; continue; }
      throw new Error(`不允许的字符：“${symbol}”`);
    }

    let index = 0;
    const peek = () => tokens[index];
    const take = (type) => {
      const token = tokens[index];
      if (!token || (type && token.type !== type)) throw new Error(type ? `这里需要“${type}”` : '表达式不完整');
      index++;
      return token;
    };

    function parseExpression() { return parseAdditive(); }
    function parseAdditive() {
      let node = parseMultiplicative();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = take().type;
        node = { type: 'binary', op, left: node, right: parseMultiplicative() };
      }
      return node;
    }
    function parseMultiplicative() {
      let node = parseUnary();
      while (peek()) {
        if (peek().type === '*' || peek().type === '/') {
          const op = take().type;
          node = { type: 'binary', op, left: node, right: parseUnary() };
          continue;
        }
        if (peek().type === 'number' || peek().type === 'identifier' || peek().type === '(') {
          node = { type: 'binary', op: '*', left: node, right: parseUnary() };
          continue;
        }
        break;
      }
      return node;
    }
    function parseUnary() {
      if (peek() && (peek().type === '+' || peek().type === '-')) {
        return { type: 'unary', op: take().type, value: parseUnary() };
      }
      return parsePower();
    }
    function parsePower() {
      let node = parsePrimary();
      if (peek() && peek().type === '^') {
        take('^');
        node = { type: 'binary', op: '^', left: node, right: parseUnary() };
      }
      return node;
    }
    function parsePrimary() {
      const token = peek();
      if (!token) throw new Error('表达式不完整');
      if (token.type === 'number') { take(); return { type: 'number', value: token.value }; }
      if (token.type === '(') {
        take('(');
        const node = parseExpression();
        take(')');
        return node;
      }
      if (token.type === 'identifier') {
        const name = take().value;
        if (peek() && peek().type === '(') {
          if (!EXPRESSION_FUNCTIONS.has(name)) throw new Error(`不支持函数“${name}”`);
          take('(');
          const args = [];
          if (!peek() || peek().type !== ')') {
            args.push(parseExpression());
            while (peek() && peek().type === ',') { take(','); args.push(parseExpression()); }
          }
          take(')');
          if ((name === 'pow' || name === 'min' || name === 'max') && args.length < 2) throw new Error(`${name} 至少需要两个参数`);
          if (!['pow', 'min', 'max'].includes(name) && args.length !== 1) throw new Error(`${name} 需要一个参数`);
          return { type: 'call', name, args };
        }
        if (!['x', 'pi', 'e'].includes(name)) throw new Error(`不允许的标识符“${name}”`);
        return { type: 'identifier', value: name };
      }
      throw new Error(`“${token.value}”出现在不合适的位置`);
    }

    const tree = parseExpression();
    if (index !== tokens.length) throw new Error(`无法解析“${tokens[index].value}”之后的内容`);
    return tree;
  }

  function latexToExpression(source) {
    let text = String(source == null ? '' : source).trim();
    if ((text.startsWith('$$') && text.endsWith('$$')) || (text.startsWith('\\[') && text.endsWith('\\]'))) text = text.slice(2, -2);
    else if (text.startsWith('$') && text.endsWith('$')) text = text.slice(1, -1);
    else if (text.startsWith('\\(') && text.endsWith('\\)')) text = text.slice(2, -2);
    text = text.replace(/^\s*[fF]\s*\(\s*x\s*\)\s*=\s*/, '');
    text = text.replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');

    function skipSpace(input, position) {
      while (position < input.length && /\s/.test(input[position])) position++;
      return position;
    }
    function readBraced(input, position) {
      position = skipSpace(input, position);
      if (input[position] !== '{') throw new Error('LaTeX 命令后需要 {...}');
      let depth = 1;
      let end = position + 1;
      while (end < input.length && depth > 0) {
        if (input[end] === '{') depth++;
        else if (input[end] === '}') depth--;
        end++;
      }
      if (depth !== 0) throw new Error('LaTeX 花括号没有闭合');
      return { content: input.slice(position + 1, end - 1), end };
    }
    function convert(segment) {
      let out = '';
      for (let i = 0; i < segment.length;) {
        const char = segment[i];
        if (char === '\\') {
          const commandMatch = segment.slice(i + 1).match(/^[A-Za-z]+/);
          if (!commandMatch) {
            const spacing = segment[i + 1];
            if ([',', ';', '!', ' '].includes(spacing)) { i += 2; continue; }
            throw new Error(`不支持 LaTeX 命令“\\${spacing || ''}”`);
          }
          const command = commandMatch[0];
          i += command.length + 1;
          if (command === 'left' || command === 'right') continue;
          if (command === 'cdot' || command === 'times') { out += '*'; continue; }
          if (command === 'div') { out += '/'; continue; }
          if (command === 'pi') { out += 'pi'; continue; }
          if (['quad', 'qquad'].includes(command)) continue;
          if (command === 'frac') {
            const numerator = readBraced(segment, i);
            const denominator = readBraced(segment, numerator.end);
            out += `((${convert(numerator.content)})/(${convert(denominator.content)}))`;
            i = denominator.end;
            continue;
          }
          if (command === 'sqrt') {
            i = skipSpace(segment, i);
            if (segment[i] === '[') throw new Error('暂不支持高次根号，请改用幂运算');
            const radicand = readBraced(segment, i);
            out += `sqrt(${convert(radicand.content)})`;
            i = radicand.end;
            continue;
          }
          if (command === 'operatorname' || command === 'mathrm') {
            const name = readBraced(segment, i);
            out += name.content.trim();
            i = name.end;
            continue;
          }
          if (EXPRESSION_FUNCTIONS.has(command)) { out += command; continue; }
          throw new Error(`不支持 LaTeX 命令“\\${command}”`);
        }
        if (char === '{') {
          let depth = 1;
          let end = i + 1;
          while (end < segment.length && depth > 0) {
            if (segment[end] === '{') depth++;
            else if (segment[end] === '}') depth--;
            end++;
          }
          if (depth !== 0) throw new Error('LaTeX 花括号没有闭合');
          out += `(${convert(segment.slice(i + 1, end - 1))})`;
          i = end;
          continue;
        }
        if (char === '}') throw new Error('出现了多余的 LaTeX 右花括号');
        if (char === '_') throw new Error('暂不支持下标');
        out += char;
        i++;
      }
      return out;
    }
    const converted = convert(text).trim();
    if (!converted) throw new Error('表达式为空');
    return converted;
  }

  function expressionToLatex(source) {
    const tree = parseExpressionTree(source);
    const precedence = node => node.type === 'binary'
      ? ({ '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 }[node.op] || 5)
      : (node.type === 'unary' ? 3 : 5);
    function render(node, parentPrecedence) {
      const own = precedence(node);
      let latex;
      if (node.type === 'number') latex = node.value;
      else if (node.type === 'identifier') latex = node.value === 'pi' ? '\\pi' : node.value;
      else if (node.type === 'unary') latex = `${node.op}${render(node.value, own)}`;
      else if (node.type === 'binary') {
        if (node.op === '/') latex = `\\frac{${render(node.left, 0)}}{${render(node.right, 0)}}`;
        else if (node.op === '^') latex = `{${render(node.left, own)}}^{${render(node.right, 0)}}`;
        else {
          const separator = node.op === '*' ? ' \\cdot ' : ` ${node.op} `;
          latex = `${render(node.left, own)}${separator}${render(node.right, own + (node.op === '-' ? 1 : 0))}`;
        }
      } else if (node.type === 'call') {
        const rendered = node.args.map(arg => render(arg, 0));
        if (node.name === 'sqrt') latex = `\\sqrt{${rendered[0]}}`;
        else if (node.name === 'abs') latex = `\\left|${rendered[0]}\\right|`;
        else if (node.name === 'floor') latex = `\\left\\lfloor ${rendered[0]} \\right\\rfloor`;
        else if (node.name === 'ceil') latex = `\\left\\lceil ${rendered[0]} \\right\\rceil`;
        else if (node.name === 'pow') latex = `{${rendered[0]}}^{${rendered[1]}}`;
        else if (node.name === 'min' || node.name === 'max') latex = `\\${node.name}\\left(${rendered.join(', ')}\\right)`;
        else {
          const command = ['exp', 'log', 'ln', 'sin', 'cos', 'tan', 'sinh', 'cosh', 'tanh'].includes(node.name)
            ? `\\${node.name}`
            : `\\operatorname{${node.name}}`;
          latex = `${command}\\left(${rendered[0]}\\right)`;
        }
      } else throw new Error('未知表达式节点');
      return own < (parentPrecedence || 0) ? `\\left(${latex}\\right)` : latex;
    }
    return render(tree, 0);
  }

  function compileExpression(source) {
    const tree = parseExpressionTree(source);
    const functions = {
      exp: Math.exp, log: Math.log, ln: Math.log, sqrt: Math.sqrt, abs: Math.abs,
      sin: Math.sin, cos: Math.cos, tan: Math.tan,
      asin: Math.asin, acos: Math.acos, atan: Math.atan,
      sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
      floor: Math.floor, ceil: Math.ceil, round: Math.round,
      min: Math.min, max: Math.max, pow: Math.pow,
    };
    function evaluate(node, x) {
      if (node.type === 'number') return Number(node.value);
      if (node.type === 'identifier') {
        if (node.value === 'x') return x;
        if (node.value === 'pi') return Math.PI;
        if (node.value === 'e') return Math.E;
      }
      if (node.type === 'unary') {
        const value = evaluate(node.value, x);
        return node.op === '-' ? -value : value;
      }
      if (node.type === 'binary') {
        const left = evaluate(node.left, x);
        const right = evaluate(node.right, x);
        if (node.op === '+') return left + right;
        if (node.op === '-') return left - right;
        if (node.op === '*') return left * right;
        if (node.op === '/') return left / right;
        if (node.op === '^') return Math.pow(left, right);
      }
      if (node.type === 'call') return functions[node.name](...node.args.map(arg => evaluate(arg, x)));
      throw new Error('未知表达式节点');
    }
    return x => evaluate(tree, Number(x));
  }

  function compileLatexExpression(source) {
    return compileExpression(latexToExpression(source));
  }

  function latexExpressionToLatex(source) {
    return expressionToLatex(latexToExpression(source));
  }

  return {
    compileExpression,
    compileLatexExpression,
    createSecureRandom,
    createSeededRandom,
    conditionCdf,
    discreteIntervalProbability,
    hashSeed,
    integrateFinite,
    latexExpressionToLatex,
    latexToExpression,
    normalizePdf,
    expressionToLatex,
    sampleStats,
  };
});
