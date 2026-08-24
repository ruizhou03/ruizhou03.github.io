import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregatePlan,
  buildOptimizedPrep,
  formatMassWithPounds,
  normalizeSelections,
  validatePlannerCatalog,
} from '../assets/js/kitchen-core.mjs';

const ingredientCatalog = {
  beef: {
    label: '牛后腿肉 / London Broil', category: 'meat', purchase_mode: 'fresh',
    walmart: { label: 'London Broil / Bottom Round', url: 'https://example.test/beef' },
  },
  oyster: {
    label: '蚝油', category: 'seasoning', purchase_mode: 'pantry',
    walmart: { label: '默认蚝油', pack: '18 oz 瓶装', unit_label: '瓶', url: 'https://example.test/oyster' },
  },
  curry: {
    label: '咖喱块', category: 'staple', purchase_mode: 'packaged',
    walmart: { label: '默认咖喱块', package_qty: 220, package_unit: 'g', pack: '220 g/盒', unit_label: '盒' },
  },
  onion: { label: '黄洋葱', category: 'produce', purchase_mode: 'fresh' },
  chicken: { label: '鸡腿肉', category: 'meat', purchase_mode: 'fresh' },
  water: { label: '清水', category: 'excluded', purchase_mode: 'exclude' },
};

const recipes = [{
  slug: 'beef-dish', title: '黑椒牛肉', cover: '', url: '/beef',
  prepPlan: {
    produce: [{ id: 'onion', action: '切粗丝' }],
    mixes: [{ name: '黑椒汁', action: '调匀', components: [{ id: 'oyster', qty: 6, unit: 'g' }] }],
    proteins: [{ id: 'beef', cut: '逆纹切片', marinade_minutes: 20, action: '腌制', marinade: [{ id: 'oyster', qty: 4, unit: 'g' }] }],
  },
  cookPriority: 60, cookNote: '最后快炒', cookTasks: ['快炒牛肉'],
  ingredients: [
    { id: 'beef', name: '牛肉', qty: 209, unit: 'g' },
    { id: 'onion', name: '洋葱', qty: 100, unit: 'g' },
    { id: 'oyster', name: '蚝油（腌肉）', qty: 4, unit: 'g' },
    { id: 'oyster', name: '蚝油（料汁）', qty: 6, unit: 'g' },
    { id: 'curry', name: '咖喱块', qty: 60, unit: 'g' },
    { id: 'water', name: '清水', qty: 30, unit: 'g' },
  ],
}, {
  slug: 'chicken-dish', title: '洋葱鸡腿', cover: '', url: '/chicken',
  prepPlan: {
    produce: [{ id: 'onion', action: '切粗丝' }],
    mixes: [{ name: '鸡汁', action: '调匀', components: [{ id: 'oyster', qty: 5, unit: 'g' }] }],
    proteins: [{ id: 'chicken', cut: '切块', marinade_minutes: 20, action: '腌制', marinade: [{ id: 'oyster', qty: 3, unit: 'g' }] }],
  },
  cookPriority: 20, cookNote: '先炒', cookTasks: ['煎鸡腿'],
  ingredients: [
    { id: 'chicken', name: '鸡腿', qty: 250, unit: 'g' },
    { id: 'onion', name: '洋葱', qty: 100, unit: 'g' },
    { id: 'oyster', name: '蚝油', qty: 8, unit: 'g' },
  ],
}];

test('normalizes only known whole-number serving selections', () => {
  const map = new Map(recipes.map((recipe) => [recipe.slug, recipe]));
  assert.deepEqual(normalizeSelections({ 'beef-dish': 4, missing: 2, bad: 1.5 }, map), { 'beef-dish': 4 });
});

test('aggregates duplicate recipe lines before applying package rules', () => {
  const plan = aggregatePlan({
    recipes, ingredientCatalog, selections: { 'beef-dish': 4 }, retailer: 'walmart',
  });
  assert.equal(plan.totalServings, 4);
  assert.equal(plan.ingredients.find((item) => item.id === 'beef').requiredQty, 836);
  assert.equal(plan.ingredients.find((item) => item.id === 'oyster').requiredQty, 40);
  assert.match(plan.ingredients.find((item) => item.id === 'oyster').purchase.text, /× 1/);
  assert.match(plan.ingredients.find((item) => item.id === 'beef').purchase.text, /1\.84 lb/);
  assert.equal(plan.ingredients.find((item) => item.id === 'curry').purchase.packages, 2);
  assert.equal(plan.purchases.some((item) => item.id === 'water'), false);
});

test('general shopping keeps pantry staples as editable required quantities', () => {
  const plan = aggregatePlan({
    recipes, ingredientCatalog, selections: { 'beef-dish': 3 }, retailer: 'general',
  });
  const oyster = plan.ingredients.find((item) => item.id === 'oyster');
  assert.equal(oyster.requiredQty, 30);
  assert.equal(oyster.purchase.kind, 'quantity');
  assert.equal(oyster.purchase.recommendedQty, 30);
  assert.equal(plan.purchases.some((item) => item.id === 'oyster'), true);
});

test('optimized prep merges repeated produce and separates cooking order', () => {
  const plan = aggregatePlan({
    recipes, ingredientCatalog, selections: { 'beef-dish': 2, 'chicken-dish': 3 }, retailer: 'general',
  });
  const optimized = buildOptimizedPrep(plan, ingredientCatalog);
  const onion = optimized.produce.find((item) => item.id === 'onion');
  assert.equal(onion.totalQty, 500);
  assert.equal(onion.allocations.length, 2);
  assert.equal(onion.actionGroups.length, 1);
  assert.equal(onion.actionGroups[0].qty, 500);
  assert.equal(onion.actionGroups[0].uses.length, 2);
  assert.equal(optimized.mixes.length, 2);
  assert.equal(optimized.proteins.length, 2);
  assert.equal(optimized.proteins.every((protein) => protein.cutGroups.length === 1), true);
  assert.deepEqual(optimized.cooking.map((recipe) => recipe.slug), ['chicken-dish', 'beef-dish']);
  assert.equal(optimized.marinadeMinutes, 20);
});

test('catalog validation rejects unknown ingredients and invalid quantities', () => {
  const broken = [{ slug: 'x', ingredients: [{ id: 'missing', qty: 0, unit: '' }] }];
  const errors = validatePlannerCatalog(broken, ingredientCatalog);
  assert.equal(errors.includes('x:ingredient_0:unknown_id:missing'), true);
  assert.equal(errors.includes('x:ingredient_0:invalid_qty'), true);
  assert.equal(errors.includes('x:ingredient_0:missing_unit'), true);
  assert.equal(errors.includes('x:missing_prep_plan'), true);
  assert.deepEqual(validatePlannerCatalog(recipes, ingredientCatalog), []);
});

test('mass formatting keeps metric exactness and adds a Walmart-friendly estimate', () => {
  assert.equal(formatMassWithPounds(836, 'g'), '836 g（约 1.84 lb）');
  assert.equal(formatMassWithPounds(40, 'g'), '40 g');
});
