'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Core = require('../assets/js/random-core.js');

function close(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`);
}

test('fixed seeds replay the same sequence', () => {
  const first = Core.createSeededRandom('same-seed');
  const second = Core.createSeededRandom('same-seed');
  assert.deepEqual(
    Array.from({ length: 20 }, () => first()),
    Array.from({ length: 20 }, () => second()),
    'fixed seeds must replay the same sequence'
  );
});

test('finite integration handles algebraic endpoint singularities', () => {
  const integral = Core.integrateFinite(
    x => 1 / (Math.PI * Math.sqrt(x * (1 - x))),
    0,
    1,
    8
  );
  close(integral, 1, 1e-10, 'endpoint-singular Beta(1/2,1/2) density');
});

test('discrete interval probability supports non-integer values', () => {
  const support = [-1.25, 0.5, 2.75];
  const masses = new Map([[-1.25, 0.2], [0.5, 0.5], [2.75, 0.3]]);
  const probability = Core.discreteIntervalProbability(
    support,
    value => masses.get(value) || 0,
    0,
    1
  );
  close(probability, 0.5, 1e-15, 'non-integer discrete support');
});

test('PDF normalization keeps mass and moments internally consistent', () => {
  const normalized = Core.normalizePdf(() => 0.99, 0, 1);
  close(normalized.mass, 0.99, 1e-12, 'raw PDF mass');
  close(Core.integrateFinite(normalized.pdf, 0, 1, 8), 1, 1e-12, 'normalized PDF mass');
  close(Core.integrateFinite(x => x * normalized.pdf(x), 0, 1, 8), 0.5, 1e-12,
    'normalized PDF mean');
});

test('CDF conditioning removes truncated tail atoms', () => {
  const conditioned = Core.conditionCdf(x => 0.04 + 0.92 * x, 0, 1);
  close(conditioned.mass, 0.92, 1e-15, 'CDF captured mass');
  close(conditioned.cdf(0.3), 0.3, 1e-15, 'conditioned CDF lower point');
  close(conditioned.cdf(0.7) - conditioned.cdf(0.3), 0.4, 1e-15,
    'conditioned CDF interval probability');
});

test('sample statistics use stable online updates and unbiased variance', () => {
  const stats = Core.sampleStats([1, 2, 3, 4], 2, 3);
  close(stats.mean, 2.5, 1e-15, 'sample mean');
  close(stats.sampleVariance, 5 / 3, 1e-15, 'unbiased sample variance');
  assert.equal(stats.hits, 2, 'interval hit count');
});

test('custom expressions render as safe mathematical previews', () => {
  assert.equal(
    Core.expressionToLatex('exp(-x^2/2) / sqrt(2*pi)'),
    '\\frac{\\exp\\left(\\frac{-{x}^{2}}{2}\\right)}{\\sqrt{2 \\cdot \\pi}}'
  );
  assert.equal(
    Core.expressionToLatex('1 / (1 + exp(-x))'),
    '\\frac{1}{1 + \\exp\\left(-x\\right)}'
  );
  assert.throws(() => Core.expressionToLatex('alert(x)'), /不支持函数/);
  assert.throws(() => Core.expressionToLatex('x +'), /表达式不完整/);
});

test('custom expressions evaluate with mathematical unary and power precedence', () => {
  const normal = Core.compileExpression('exp(-x^2/2) / sqrt(2*pi)');
  close(normal(0), 1 / Math.sqrt(2 * Math.PI), 1e-15, 'normal density at zero');
  const inverseSquare = Core.compileExpression('x^-2');
  close(inverseSquare(2), 0.25, 1e-15, 'negative exponent');
  const grouped = Core.compileExpression('2*-(x+1)^2');
  close(grouped(2), -18, 1e-15, 'unary minus after multiplication');
});

test('LaTeX and Markdown-style formulas compile with implicit multiplication', () => {
  const latexNormal = Core.compileLatexExpression(String.raw`\frac{1}{\sqrt{2\pi}}e^{-x^2/2}`);
  close(latexNormal(0), 1 / Math.sqrt(2 * Math.PI), 1e-15, 'LaTeX normal density at zero');
  const implicit = Core.compileLatexExpression('$2x+1$');
  close(implicit(3), 7, 1e-15, 'implicit multiplication');
  assert.equal(Core.latexToExpression(String.raw`f(x)=\exp\left(-\frac{x^2}{2}\right)`), 'exp(-((x^2)/(2)))');
  assert.throws(() => Core.compileLatexExpression(String.raw`\sum_{i=1}^x i`), /不支持 LaTeX 命令|暂不支持下标/);
});
