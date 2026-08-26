import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../toolbox/forest/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../assets/css/forest.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../assets/js/forest/app.js', import.meta.url), 'utf8');

test('primary flow exposes task, field, valid duration, result preview, and completion', () => {
  for (const id of ['task-input', 'target-field-select', 'custom-min', 'custom-min-error', 'session-preview', 'start-btn', 'completion-card']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /<label for="custom-min">自定义时长<\/label>/);
  assert.match(html, /<label for="target-field-select">种到<\/label>/);
  assert.match(html, /aria-describedby="custom-min-unit custom-min-error"/);
  assert.match(app, /Core\.validateMinutes/);
  assert.match(app, /\$customMin\.value\.trim\(\) !== ''[\s\S]*\$durationTabs\.forEach\(b => b\.classList\.remove\('active'\)\)/);
});

test('mobile duration and focus overlay use reflowing grids without the old cascade conflict', () => {
  assert.match(css, /\.duration-row \.duration-tabs \{\s*display: grid;/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(html, /class="focus-layout"/);
  assert.match(css, /grid-template-rows: auto minmax\(10rem, 1fr\) auto/);
  assert.match(css, /orientation: landscape[\s\S]*grid-template-columns:/);
});

test('Forest data, history, trash, accessible chart table, and help are real surfaces', () => {
  for (const id of ['history-panel', 'trash-panel', 'data-panel', 'rules-panel', 'exp-data-table', 'export-data-btn', 'import-data-input']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(app, /forestStore\.exportData\(\)/);
  assert.match(app, /forestStore\.previewImport/);
  assert.match(app, /moveToTrash/);
  assert.match(app, /renderHistory/);
});

test('approved logic regressions are absent from the coordinator', () => {
  assert.doesNotMatch(app, /Math\.round\(\(before \+ realMinutes\) \* 0\.9\)/);
  assert.doesNotMatch(app, /这棵树会枯萎，且无法恢复/);
  assert.doesNotMatch(app, /function reflowOutOfRange/);
  assert.doesNotMatch(app, /querySelectorAll\('\.tree-instance'\)\)\.forEach\(el => el\.remove/);
  assert.match(app, /Core\.resumeDecision/);
  assert.match(app, /Core\.abandonOutcome/);
  assert.match(app, /Core\.leaseMatches/);
});

test('tree rendering is keyed and tree actions are native sibling buttons', () => {
  assert.match(app, /const treeNodeCache = new Map\(\)/);
  assert.match(app, /className = 'tree-open'/);
  assert.match(app, /className = 'delete-x'/);
  assert.doesNotMatch(app, /setAttribute\('role', 'button'\)/);
  assert.match(css, /\.field\.edit-mode \.tree-instance \{ touch-action: none; \}/);
  assert.match(css, /\.tree-instance \{ touch-action: manipulation; \}/);
});

test('navigation and fields expose current state semantics', () => {
  assert.match(app, /setAttribute\('aria-current', 'page'\)/);
  assert.match(app, /aria-pressed="\$\{active \? 'true' : 'false'\}"/);
  assert.match(app, /aria-label=.*次专注/);
  assert.match(app, /scrollIntoView\(\{ behavior: 'auto', block: 'center' \}\);[\s\S]*requestAnimationFrame\(\(\) => showDetail/);
  assert.match(app, /performance\.now\(\) < detailScrollGuardUntil/);
  assert.match(app, /\$startBtn\.disabled = !!state\.session \|\| state\.externalSessionReadonly/);
});

test('signature visual system follows site light and dark mode with an explicit override', () => {
  assert.match(html, /data-value="auto"[\s\S]*跟随系统/);
  assert.match(html, /data-value="default"[\s\S]*晨光温室/);
  assert.match(html, /data-value="night"[\s\S]*萤火夜林/);
  assert.doesNotMatch(html, /data-value="(?:bubbles|sunrise|rain)"/);
  assert.match(app, /function resolvedBackground\(\)/);
  assert.match(app, /state\.theme\.background === 'auto'/);
  assert.match(app, /MutationObserver\(refreshAutomaticTheme\)/);
  assert.match(css, /\.ft-wrap\.visual-day/);
  assert.match(css, /\.ft-wrap\.visual-night/);
  assert.match(css, /\.firefly/);
  assert.match(css, /\.season-leaf/);
  assert.match(html, /greenhouse-home-wide-v4\.webp/);
  assert.match(html, /firefly-home-wide-v4\.webp/);
  assert.match(html, /forest-plant-a-assets/);
  assert.match(html, /晨光温室/);
  assert.match(html, /专注节奏/);
  assert.match(html, /完成后安排休息/);
  assert.doesNotMatch(html, /番茄循环/);
  assert.match(app, /function updateAmbientLight\(\)/);
  assert.match(app, /tree-model-preview/);
  assert.match(app, /buildTreeSvg\(button\.dataset\.tree, 0\.68, 50, true, true\)/);
  assert.match(css, /\.more-settings\[open\] \{[\s\S]*position: absolute/);
  assert.match(css, /@keyframes forestFocusDrift/);
  assert.match(css, /visual-day \.plant-card \.stage > #tree-container \{ bottom: 18%; \}/);
  assert.match(css, /visual-night \.plant-card \.stage > #tree-container \{ bottom: 19%; \}/);
  assert.match(css, /@media \(min-width: 701px\)[\s\S]*visual-day \.plant-card \.stage > #tree-container \{ bottom: 18%; \}/);
  assert.match(css, /@media \(min-width: 701px\)[\s\S]*visual-night \.plant-card \.stage > #tree-container \{ bottom: 19%; \}/);
  assert.doesNotMatch(css, /root-occlusion/);
  assert.doesNotMatch(app, /root-occlusion/);
  assert.doesNotMatch(css, /overlay-tree-container\.overlay-tree-zone::after/);
});
