import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregatePlan,
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
    walmart: { label: '默认蚝油', pack: '18 oz 瓶装', url: 'https://example.test/oyster' },
  },
  curry: {
    label: '咖喱块', category: 'staple', purchase_mode: 'packaged',
    walmart: { label: '默认咖喱块', package_qty: 220, package_unit: 'g', pack: '220 g/盒' },
  },
  water: { label: '清水', category: 'excluded', purchase_mode: 'exclude' },
};

const recipes = [{
  slug: 'beef-dish', title: '黑椒牛肉', cover: '', url: '/beef', prepTasks: ['切牛肉'],
  ingredients: [
    { id: 'beef', name: '牛肉', qty: 209, unit: 'g' },
    { id: 'oyster', name: '蚝油（腌肉）', qty: 4, unit: 'g' },
    { id: 'oyster', name: '蚝油（料汁）', qty: 6, unit: 'g' },
    { id: 'curry', name: '咖喱块', qty: 60, unit: 'g' },
    { id: 'water', name: '清水', qty: 30, unit: 'g' },
  ],
}];

test('normalizes only known whole-number serving selections', () => {
  const map = new Map(recipes.map((recipe) => [recipe.slug, recipe]));
  assert.deepEqual(normalizeSelections({ 'beef-dish': 4, missing: 2, bad: 1.5 }, map), { 'beef-dish': 4 });
});

test('aggregates duplicate recipe lines before applying package rules', () => {
  const plan = aggregatePlan({
    recipes, ingredientCatalog, selections: { 'beef-dish': 4 }, pantry: {}, retailer: 'walmart',
  });
  assert.equal(plan.totalServings, 4);
  assert.equal(plan.ingredients.find((item) => item.id === 'beef').requiredQty, 836);
  assert.equal(plan.ingredients.find((item) => item.id === 'oyster').requiredQty, 40);
  assert.match(plan.ingredients.find((item) => item.id === 'oyster').purchase.text, /× 1/);
  assert.match(plan.ingredients.find((item) => item.id === 'beef').purchase.text, /1\.84 lb/);
  assert.equal(plan.ingredients.find((item) => item.id === 'curry').purchase.packages, 2);
  assert.equal(plan.purchases.some((item) => item.id === 'water'), false);
});

test('owned pantry staples remain in the usage table but leave the shopping list', () => {
  const plan = aggregatePlan({
    recipes, ingredientCatalog, selections: { 'beef-dish': 3 }, pantry: { oyster: true }, retailer: 'general',
  });
  const oyster = plan.ingredients.find((item) => item.id === 'oyster');
  assert.equal(oyster.requiredQty, 30);
  assert.equal(oyster.pantryOwned, true);
  assert.equal(oyster.purchase, null);
});

test('catalog validation rejects unknown ingredients and invalid quantities', () => {
  const broken = [{ slug: 'x', ingredients: [{ id: 'missing', qty: 0, unit: '' }] }];
  assert.deepEqual(validatePlannerCatalog(broken, ingredientCatalog), [
    'x:ingredient_0:unknown_id:missing',
    'x:ingredient_0:invalid_qty',
    'x:ingredient_0:missing_unit',
  ]);
  assert.deepEqual(validatePlannerCatalog(recipes, ingredientCatalog), []);
});

test('mass formatting keeps metric exactness and adds a Walmart-friendly estimate', () => {
  assert.equal(formatMassWithPounds(836, 'g'), '836 g（约 1.84 lb）');
  assert.equal(formatMassWithPounds(40, 'g'), '40 g');
});
