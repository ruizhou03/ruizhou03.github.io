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
  assert.match(html, /class="setting-row target-field-row" hidden/);
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

test('forest gallery is field-first with calendar statistics, sorting, and useful tree hover metadata', () => {
  for (const id of ['field', 'forest-sort-select', 'statistics-toggle', 'exp-chart-zone']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const range of ['day', 'week', 'month', 'year']) {
    assert.match(html, new RegExp(`data-range=["']${range}["']`));
  }
  for (const sort of ['manual', 'newest', 'oldest', 'duration-desc', 'duration-asc']) {
    assert.match(html, new RegExp(`value=["']${sort}["']`));
  }
  assert.match(app, /let forestSort = 'manual'/);
  assert.match(app, /forestSort === 'newest' \|\| forestSort === 'oldest'/);
  assert.match(app, /taskLabel[\s\S]*plantedAt[\s\S]*focusMinutes/);
  assert.match(app, /range === 'day'[\s\S]*range === 'week'[\s\S]*range === 'month'/);
  assert.match(app, /month < 12/);
  assert.match(app, /bucket\.minutes/);
  assert.match(css, /Forest field-first information hierarchy/);
  assert.match(css, /\.field > \.empty-forest/);
});

test('single-tree growth and forest rendering share the calibrated 3d layout engine', () => {
  assert.match(html, /assets\/js\/forest\/layout\.js/);
  assert.match(app, /Layout\.projectToViewport\(scene, SINGLE_TREE_WORLD/);
  assert.match(app, /Layout\.growthScale\(progress\)/);
  assert.match(app, /Layout\.layoutTrees\(layoutInput/);
  assert.match(app, /Layout\.inverseFromViewport\('forest'/);
  assert.match(app, /Layout\.rootClearance\([\s\S]*'forest'\)/);
  assert.match(app, /tree\.position3d = current\.previewPosition/);
  assert.match(app, /dataset\.worldX/);
  assert.match(app, /dataset\.worldY/);
  assert.match(app, /dataset\.worldZ/);
  assert.doesNotMatch(app, /function snapTreeToCell/);
  assert.doesNotMatch(app, /function snapColRow/);
  assert.match(css, /Calibrated 3D ground-plane projection/);
  assert.match(css, /layout-3d-tree/);
  assert.match(css, /layout-3d-tree > \.tree-anim[\s\S]*position: absolute !important/);
  assert.match(css, /translate\(-50%, -91\.5%\)/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*aspect-ratio: 1672 \/ 941/);
});

test('single-field product hides field selection and safely consolidates legacy fields', () => {
  assert.match(html, /id="field-tabs" hidden/);
  assert.match(html, /id="rename-field-btn" hidden/);
  assert.match(html, /id="delete-field-btn" hidden/);
  assert.match(app, /Core\.consolidateSingleField\(state\.fields, state\.trees, fallback\)/);
  assert.match(app, /consolidated\.retiredFieldIds/);
  assert.match(app, /state\.fields = consolidated\.fields/);
  assert.match(app, /addSyncTombstone\('field', fieldId/);
  assert.match(css, /Single-field forest atelier/);
  assert.match(css, /target-field-row\[hidden\]/);
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
  assert.doesNotMatch(css, /root-occlusion/);
  assert.doesNotMatch(app, /root-occlusion/);
  assert.doesNotMatch(css, /overlay-tree-container\.overlay-tree-zone::after/);
});
