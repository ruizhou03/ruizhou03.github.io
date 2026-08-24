import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregatePlan } from '../assets/js/kitchen-core.mjs';
import {
  compileKitchenWorkflow,
  DEFAULT_KITCHEN_PROFILE,
  optimizeKitchenSchedule,
  scheduleTasks,
  validateSchedule,
  validateTaskGraph,
} from '../assets/js/kitchen-scheduler.mjs';

const ingredientCatalog = {
  onion: { label: '黄洋葱', category: 'produce', purchase_mode: 'fresh' },
  chicken: { label: '鸡腿肉', category: 'meat', purchase_mode: 'fresh', safety_class: 'raw_poultry' },
  beef: { label: '牛肉', category: 'meat', purchase_mode: 'fresh', safety_class: 'raw_beef' },
  sauce: { label: '调味汁', category: 'seasoning', purchase_mode: 'pantry' },
};

const curry = {
  slug: 'curry', title: '咖喱鸡', ingredients: [
    { id: 'onion', qty: 100, unit: 'g' },
    { id: 'chicken', qty: 250, unit: 'g' },
    { id: 'sauce', qty: 30, unit: 'g' },
  ],
  prepPlan: {
    produce: [{ id: 'onion', action: '切粗丝', base_min: 0.5, min_per_100g: 0.8 }],
    mixes: [{ name: '咖喱料', active_min: 1, components: [{ id: 'sauce', qty: 30, unit: 'g' }] }],
    proteins: [{
      id: 'chicken', cut: '切块', base_min: 1, min_per_100g: 0.7,
      marinade_active_min: 1, marinade_minutes: 10, marinade: [{ id: 'sauce', qty: 5, unit: 'g' }],
    }],
  },
  cookPriority: 10, cookNote: '先炖', cookTasks: ['炖'],
  workflow: [
    { id: 'start', label: '炒料', kind: 'saute', after_prep: true, active_min: 2, resources_active: ['cook', 'pot', 'burner'] },
    { id: 'simmer', label: '焖煮', kind: 'simmer', depends_on: ['start'], active_min: 0.5, passive_min: 10, resources_active: ['cook', 'pot', 'burner'], resources_passive: ['pot', 'burner'] },
    { id: 'finish', label: '收汁', kind: 'finish', depends_on: ['simmer'], active_min: 1, resources_active: ['cook', 'pot', 'burner'], finish: true, hold_max_min: 20, quality_penalty: 0.2 },
  ],
};

const beef = {
  slug: 'beef', title: '黑椒牛肉', ingredients: [
    { id: 'onion', qty: 100, unit: 'g' },
    { id: 'beef', qty: 225, unit: 'g' },
    { id: 'sauce', qty: 20, unit: 'g' },
  ],
  prepPlan: {
    produce: [{ id: 'onion', action: '切粗丝', base_min: 0.5, min_per_100g: 0.8 }],
    mixes: [{ name: '黑椒汁', active_min: 1, components: [{ id: 'sauce', qty: 20, unit: 'g' }] }],
    proteins: [{
      id: 'beef', cut: '逆纹切片', base_min: 1, min_per_100g: 0.9,
      marinade_active_min: 1, marinade_minutes: 10, marinade: [{ id: 'sauce', qty: 4, unit: 'g' }],
    }],
  },
  cookPriority: 60, cookNote: '最后炒', cookTasks: ['快炒'],
  workflow: [
    { id: 'sear', label: '快炒牛肉', kind: 'sear', after_prep: true, active_min: 2, batch_ingredient_id: 'beef', batch_capacity_g: 200, resources_active: ['cook', 'wok', 'burner'] },
    { id: 'finish', label: '回锅完成', kind: 'finish', depends_on: ['sear'], active_min: 2, passive_min: 1, resources_active: ['cook', 'wok', 'burner'], finish: true, hold_max_min: 2, quality_penalty: 5 },
  ],
};

function fixture(servings = { curry: 1, beef: 2 }, profile = DEFAULT_KITCHEN_PROFILE) {
  const recipes = [curry, beef];
  const plan = aggregatePlan({ recipes, ingredientCatalog, selections: servings, retailer: 'general' });
  const compiled = compileKitchenWorkflow(plan, ingredientCatalog, profile);
  return { plan, compiled };
}

test('compiler merges identical cuts and injects beef-to-poultry sanitation', () => {
  const { compiled } = fixture();
  const onionCuts = compiled.tasks.filter((task) => task.mergeKey === 'cut:onion:切粗丝');
  assert.equal(onionCuts.length, 1);
  assert.equal(onionCuts[0].members.length, 2);
  assert.equal(onionCuts[0].quantity, 300);

  const cross = compiled.tasks.find((task) => task.id === 'shared:sanitize:beef-to-poultry');
  const poultryCut = compiled.tasks.find((task) => task.id === 'curry:protein:1:cut');
  assert.ok(cross);
  assert.equal(poultryCut.dependencies.includes(cross.id), true);
  assert.equal(compiled.tasks.some((task) => task.id === 'shared:sanitize:final'), true);
  assert.deepEqual(validateTaskGraph(compiled.tasks, compiled.profile), []);
});

test('batch capacity scales active searing time instead of crowding the wok', () => {
  const { compiled } = fixture();
  const sear = compiled.tasks.find((task) => task.id === 'beef:cook:sear');
  assert.match(sear.label, /分 3 批/);
  assert.equal(sear.activeMin, 6);
});

test('two burners allow wok work during passive pot simmering without resource overlap', () => {
  const { compiled } = fixture();
  const optimized = optimizeKitchenSchedule(compiled.tasks, compiled.profile).best;
  assert.deepEqual(validateSchedule(optimized), []);
  const simmerPassive = optimized.timeline.find((segment) => segment.taskId === 'curry:cook:simmer' && segment.phase === 'passive');
  const beefActive = optimized.timeline.filter((segment) => segment.recipeSlug === 'beef' && segment.phase === 'active');
  assert.ok(simmerPassive);
  assert.equal(beefActive.some((segment) => segment.start < simmerPassive.end && segment.end > simmerPassive.start), true);
});

test('one burner removes the simmer overlap and increases makespan', () => {
  const two = fixture();
  const twoSchedule = optimizeKitchenSchedule(two.compiled.tasks, two.compiled.profile).best;
  const oneProfile = { resources: { ...DEFAULT_KITCHEN_PROFILE.resources, burner: 1 } };
  const one = fixture({ curry: 1, beef: 2 }, oneProfile);
  const oneSchedule = optimizeKitchenSchedule(one.compiled.tasks, one.compiled.profile).best;
  const simmerPassive = oneSchedule.timeline.find((segment) => segment.taskId === 'curry:cook:simmer' && segment.phase === 'passive');
  const beefActive = oneSchedule.timeline.filter((segment) => segment.recipeSlug === 'beef' && segment.phase === 'active');
  assert.equal(beefActive.some((segment) => segment.start < simmerPassive.end && segment.end > simmerPassive.start), false);
  assert.ok(oneSchedule.metrics.makespan > twoSchedule.metrics.makespan);
  assert.deepEqual(validateSchedule(oneSchedule), []);
});

test('freshness-aware search keeps quick beef within its allowed hold window', () => {
  const { compiled } = fixture();
  const optimized = optimizeKitchenSchedule(compiled.tasks, compiled.profile).best;
  const beefFinish = optimized.entries.find((entry) => entry.id === 'beef:cook:finish');
  assert.ok(optimized.metrics.makespan - beefFinish.end <= beefFinish.holdMaxMin + 1e-7);
  assert.equal(optimized.metrics.qualityLoss, 0);
});

test('scheduling is deterministic and invalid resource profiles fail closed', () => {
  const { compiled } = fixture();
  const first = optimizeKitchenSchedule(compiled.tasks, compiled.profile).best;
  const second = optimizeKitchenSchedule(compiled.tasks, compiled.profile).best;
  assert.deepEqual(first.entries, second.entries);

  const brokenProfile = { resources: { ...DEFAULT_KITCHEN_PROFILE.resources, wok: 0 } };
  assert.equal(validateTaskGraph(compiled.tasks, brokenProfile).some((error) => error.includes('resource_unavailable:wok')), true);
  assert.throws(() => scheduleTasks(compiled.tasks, brokenProfile), /no_resource_slot/);
});
