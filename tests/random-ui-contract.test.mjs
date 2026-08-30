import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const page = readFileSync(new URL('../toolbox/random/index.html', import.meta.url), 'utf8');
const inlineScript = [...page.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .find(source => source.includes('const LZ_G'));

test('random page inline application remains valid JavaScript', () => {
  assert.ok(inlineScript, 'inline random application script must exist');
  assert.doesNotThrow(() => new vm.Script(inlineScript));
});

test('paper studio uses one viewport as a professional utility panel', () => {
  assert.match(page, /minimal_app_shell: true/);
  assert.match(page, /body_class: rng-paper-tool/);
  assert.match(page, /class="rng-appbar"/);
  assert.doesNotMatch(page, /class="rng-header"/);
  assert.doesNotMatch(page, /01 \/ DISTRIBUTION|02 \/ SAMPLE|下一步可以试|把观察留在工作台上/);
  assert.match(page, /body\.rng-paper-tool \{[\s\S]*overflow: hidden/);
  assert.match(page, /paper-studio-v1\.webp/);
  assert.match(page, /body\.rng-paper-tool \.rng-wrap \{[\s\S]*height: calc\(100dvh - 24px\)/);
  assert.match(page, /<article class="rng-wrap">\s*<header class="rng-appbar">/);
  assert.match(page, /grid-template-rows: 66px minmax\(0,1fr\) 112px/);
  assert.match(page, /width: calc\(100% - clamp\(24px, 2\.2vw, 44px\)\)/);
  assert.match(page, /body\.rng-paper-tool \.rng-wrap \{[\s\S]*max-width: none/);
  assert.match(page, /grid-template-columns: minmax\(0,1fr\) 330px/);
  assert.match(page, /grid-template-columns: 280px minmax\(0,1fr\)/);
  assert.match(page, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(page, /class="rng-grid"/);
  assert.match(page, /class="rng-summary"[\s\S]*aria-label="抽样统计摘要"/);
  assert.match(page, /@media \(max-width: 900px\)[\s\S]*grid-template-rows: minmax\(0,1fr\) 132px/);
  assert.match(page, /id="rng-open-seed"/);
  assert.match(page, /id="rng-open-custom"/);
  assert.doesNotMatch(page, /所有计算仅在本地/);
  assert.match(page, /id="rng-open-seed"[\s\S]*<rect x="4" y="4" width="16" height="16" rx="4">/);
  assert.match(page, /id="rng-source-dialog" role="dialog"[\s\S]*aria-labelledby="rng-source-dialog-title"/);
  assert.match(page, /id="rng-custom-dialog" role="dialog"[\s\S]*aria-labelledby="rng-custom-dialog-title"/);
  assert.match(page, /function openDialog\(dialog\)/);
  assert.match(page, /id="rng-open-seed"[\s\S]*openDialog\(\$sourceDialog\)/);
  assert.match(page, /id="rng-open-custom"[\s\S]*openDialog\(\$customDialog\)/);
  assert.doesNotMatch(page, /id="rng-advanced-toggle"|>高级设置</);
  assert.match(page, /id="btn-export"/);
  assert.match(page, /id="btn-clear-summary"/);
  assert.match(page, /\.rng-busy \{ color: var\(--rng-blue\); pointer-events: none; \}/);
});

test('controls expose explicit names, modal semantics, direct parameter input, and reduced motion', () => {
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'static HTML ids must be unique');
  for (const [, target] of page.matchAll(/\sfor="([^"]+)"/g)) {
    assert.ok(ids.includes(target), `label target #${target} must exist`);
  }
  assert.match(page, /role="img" aria-label="当前概率分布与抽样结果"/);
  assert.match(page, /role="status" aria-live="polite"/);
  assert.match(page, /id="cf-preview" aria-live="polite"/);
  assert.match(page, /Core\.latexExpressionToLatex\(expression\)/);
  assert.match(page, /setTimeout\(updateCustomPreview, 100\)/);
  assert.match(page, /id="dist-trigger"[\s\S]*aria-haspopup="listbox"/);
  assert.match(page, /id="dist-menu" role="listbox"/);
  assert.match(page, /renderDistributionFormula\(math, dist\)/);
  assert.match(page, /name\.className = 'sr-only'/);
  assert.match(page, /notation\.className = 'dist-option-notation'/);
  assert.match(page, /fitRenderedMath\(target/);
  assert.match(page, /id="rng-source-close" aria-label="关闭随机源设置"/);
  assert.match(page, /id="rng-custom-close" aria-label="关闭自定义分布"/);
  assert.match(page, /id="rng-modal-backdrop" hidden/);
  assert.match(page, /\$modalBackdrop\.addEventListener\('click'/);
  assert.doesNotMatch(page, /probability-mode-toggle|interval-prob|区间命中率|不影响抽样|data-h=/);
  assert.match(page, /公式 <span>LaTeX \/ Markdown<\/span>/);
  assert.match(page, /class="cf-type-options"/);
  assert.match(page, /class="cf-formula-grid"/);
  assert.match(page, /class="sr-only" for="cf-a">支撑区间下界/);
  assert.match(page, /class="sr-only" for="cf-b">支撑区间上界/);
  assert.match(page, /class="cf-actions-left"><button class="sample-btn" id="btn-new-custom" type="button">清空<\/button>/);
  assert.doesNotMatch(page, /清空表单/);
  assert.match(page, /class="param-number" type="number"/);
  assert.match(page, /if \(value < min\) slider\.min/);
  assert.match(page, /if \(value > max\) slider\.max/);
  assert.match(page, /function pairedParamUpdates\(key, value\)/);
  assert.match(page, /updates\.b = value \+ currentWidth/);
  assert.match(page, /updates\.a = value - currentWidth/);
  assert.doesNotMatch(page, /class="sample-btn primary" data-n="1"/);
  assert.match(page, /function setActiveSampleControl\(button\)/);
  assert.match(page, /body\.rng-paper-tool \.last-sample\.empty \{ display: none; \}/);
  assert.match(page, /@media \(prefers-reduced-motion: reduce\)/);
});

test('secure and reproducible random modes are wired without direct page Math.random calls', () => {
  assert.doesNotMatch(page, /Math\.random/);
  assert.match(page, /Core\.createSecureRandom\(window\.crypto\)/);
  assert.match(page, /Core\.createSeededRandom\(\$rngSeed\.value\)/);
  assert.match(page, /id="rng-seed-reset"/);
});

test('known distribution and synchronization regressions stay fixed', () => {
  assert.match(page, /Core\.normalizePdf\(rawPDF, a, b\)/);
  assert.match(page, /Core\.conditionCdf\(rawCDF, a, b\)/);
  assert.match(page, /Core\.sampleStats\(state\.samples\)/);
  assert.doesNotMatch(page, /复合辛普森|正态近似/);
});

test('every generation replaces the prior batch and large batches stay bounded and chunked', () => {
  assert.match(page, /const MAX_BATCH = 1_000_000/);
  assert.match(page, /function drawSamples\(n\)[\s\S]*cancelSampling\(\);[\s\S]*state\.samples = \[\];[\s\S]*n = Math\.min\(n, MAX_BATCH\)/);
  assert.match(page, /const stop = Math\.min\(n, completed \+ 10_000\)/);
  assert.match(page, /if \(job !== sampleJob\) return/);
  assert.match(page, /setTimeout\(chunk, 0\)/);
  assert.match(page, /正在生成…/);
  assert.match(page, /function pulseSamplePoint\(value\)/);
  assert.match(page, /const endRadius = 8 \/ scaleX/);
  assert.doesNotMatch(page, /animateSampleDrop|动画"落下"/);
});
