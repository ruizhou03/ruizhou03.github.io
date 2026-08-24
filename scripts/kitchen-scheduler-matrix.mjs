import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aggregatePlan } from '../assets/js/kitchen-core.mjs';
import {
  compileKitchenWorkflow,
  DEFAULT_KITCHEN_PROFILE,
  optimizeKitchenSchedule,
  validateSchedule,
} from '../assets/js/kitchen-scheduler.mjs';

const html = readFileSync(new URL('../_site/toolbox/recipes/planner/index.html', import.meta.url), 'utf8');
const match = html.match(/<script id="kp-catalog" type="application\/json">([\s\S]*?)<\/script>/);
if (!match) throw new Error('planner_catalog_missing');
const catalog = JSON.parse(match[1]);
const recipes = catalog.recipes;
const ingredientCatalog = catalog.ingredients;
const slugs = recipes.map((recipe) => recipe.slug);
const cookingKinds = new Set(['saute', 'sear', 'simmer', 'mix-heat', 'aromatics', 'sauce', 'finish', 'cook']);

function selectedFromMask(mask, servings = 1) {
  const selected = {};
  slugs.forEach((slug, index) => { if (mask & (1 << index)) selected[slug] = servings; });
  return selected;
}

function hasIngredient(selected, ingredientId) {
  return recipes.some((recipe) => selected[recipe.slug] && recipe.ingredients.some((ingredient) => ingredient.id === ingredientId));
}

function assertSafety(schedule, selected) {
  const byId = new Map(schedule.entries.map((entry) => [entry.id, entry]));
  const finalSanitize = byId.get('shared:sanitize:final');
  assert.ok(finalSanitize, 'final sanitation task missing');
  schedule.entries.filter((entry) => cookingKinds.has(entry.kind)).forEach((entry) => {
    assert.ok(entry.start >= finalSanitize.end - 1e-7, `${entry.id} starts before final sanitation`);
  });

  if (hasIngredient(selected, 'beef_london_broil') && hasIngredient(selected, 'chicken_thigh')) {
    const cross = byId.get('shared:sanitize:beef-to-poultry');
    assert.ok(cross, 'beef-to-poultry sanitation task missing');
    schedule.entries.filter((entry) => entry.safety === 'raw_poultry' && entry.kind === 'cut-protein').forEach((entry) => {
      assert.ok(entry.start >= cross.end - 1e-7, `${entry.id} starts before cross sanitation`);
    });
  }
}

function assertPassiveSynergy(schedule, selected) {
  if (!selected.tudouhuluobogalijitui || Object.keys(selected).length < 2) return;
  const simmer = schedule.timeline.find((segment) => segment.taskId === 'tudouhuluobogalijitui:cook:simmer' && segment.phase === 'passive');
  assert.ok(simmer, 'curry passive simmer segment missing');
  const overlaps = schedule.timeline.some((segment) => (
    segment.phase === 'active' && segment.recipeSlug && segment.recipeSlug !== 'tudouhuluobogalijitui'
    && cookingKinds.has(segment.kind) && segment.start < simmer.end && segment.end > simmer.start
  ));
  assert.equal(overlaps, true, `no other dish uses curry simmer window for ${Object.keys(selected).join(',')}`);
}

function assertCookingContinuity(schedule) {
  const byId = new Map(schedule.entries.map((entry) => [entry.id, entry]));
  schedule.entries.filter((entry) => cookingKinds.has(entry.kind)).forEach((entry) => {
    entry.dependencies.forEach((dependency) => {
      const previous = byId.get(dependency);
      if (!previous || previous.recipeSlug !== entry.recipeSlug || !cookingKinds.has(previous.kind) || previous.passiveMin > 0) return;
      assert.ok(entry.start - previous.end <= 0.25 + 1e-7, `${entry.id}: unexplained mid-dish gap after ${dependency}`);
    });
  });
}

function assertPassiveStartsImmediately(schedule) {
  const byId = new Map(schedule.entries.map((entry) => [entry.id, entry]));
  schedule.entries.filter((entry) => entry.kind === 'marinate-wait').forEach((entry) => {
    const dependencyEnd = Math.max(...entry.dependencies.map((dependency) => byId.get(dependency).end));
    assert.ok(Math.abs(entry.start - dependencyEnd) <= 1e-7, `${entry.id}: passive wait does not start immediately`);
  });
}

const cases = [];
for (let mask = 1; mask < (1 << slugs.length); mask += 1) cases.push({ name: `subset-${mask}`, selected: selectedFromMask(mask, 1) });
cases.push({ name: 'all-2-servings', selected: Object.fromEntries(slugs.map((slug) => [slug, 2])) });
cases.push({ name: 'all-4-servings', selected: Object.fromEntries(slugs.map((slug) => [slug, 4])) });
slugs.forEach((slug) => cases.push({ name: `${slug}-4-servings`, selected: { [slug]: 4 } }));

let maxMakespan = 0;
let maxQualityLoss = 0;
let warningCases = 0;
const strategies = new Map();
for (const testCase of cases) {
  const plan = aggregatePlan({ recipes, ingredientCatalog, selections: testCase.selected, retailer: 'general' });
  const compiled = compileKitchenWorkflow(plan, ingredientCatalog, DEFAULT_KITCHEN_PROFILE);
  const result = optimizeKitchenSchedule(compiled.tasks, compiled.profile).best;
  assert.deepEqual(validateSchedule(result), [], `${testCase.name}: invalid resource/dependency schedule`);
  assert.equal(result.entries.filter((entry) => entry.finish).length, Object.keys(testCase.selected).length, `${testCase.name}: finish task mismatch`);
  assertSafety(result, testCase.selected);
  assertPassiveSynergy(result, testCase.selected);
  assertCookingContinuity(result);
  assertPassiveStartsImmediately(result);
  assert.ok(Number.isFinite(result.metrics.objective), `${testCase.name}: objective is not finite`);
  const beefFinish = result.entries.find((entry) => entry.id === 'heijiaoyangcongniuliu:cook:finish');
  if (beefFinish) {
    assert.ok(result.metrics.makespan - beefFinish.end <= beefFinish.holdMaxMin + 1e-7, `${testCase.name}: quick beef waits too long`);
  }
  const qualityLimit = Math.max(20, plan.totalServings * 20);
  assert.ok(result.metrics.qualityLoss <= qualityLimit, `${testCase.name}: excessive aggregate quality loss ${result.metrics.qualityLoss}`);
  assert.ok(result.metrics.contextSwitches <= Object.keys(testCase.selected).length + 2, `${testCase.name}: too many cooking context switches`);
  if (result.metrics.qualityLoss > 0) warningCases += 1;
  maxMakespan = Math.max(maxMakespan, result.metrics.makespan);
  maxQualityLoss = Math.max(maxQualityLoss, result.metrics.qualityLoss);
  strategies.set(result.strategy.name, (strategies.get(result.strategy.name) || 0) + 1);
}

const allSelected = Object.fromEntries(slugs.map((slug) => [slug, 2]));
const allPlan = aggregatePlan({ recipes, ingredientCatalog, selections: allSelected, retailer: 'general' });
const twoBurner = compileKitchenWorkflow(allPlan, ingredientCatalog, DEFAULT_KITCHEN_PROFILE);
const oneBurnerProfile = { resources: { ...DEFAULT_KITCHEN_PROFILE.resources, burner: 1 } };
const oneBurner = compileKitchenWorkflow(allPlan, ingredientCatalog, oneBurnerProfile);
const twoResult = optimizeKitchenSchedule(twoBurner.tasks, twoBurner.profile).best;
const oneResult = optimizeKitchenSchedule(oneBurner.tasks, oneBurner.profile).best;
assert.ok(oneResult.metrics.makespan >= twoResult.metrics.makespan, 'one burner unexpectedly beats two burners');

console.log(JSON.stringify({
  ok: true,
  cases: cases.length,
  maxMakespan,
  maxQualityLoss,
  warningCases,
  allTwoBurnerMakespan: twoResult.metrics.makespan,
  allOneBurnerMakespan: oneResult.metrics.makespan,
  chosenStrategies: Object.fromEntries(strategies),
}, null, 2));
