const GRAMS_PER_POUND = 453.59237;

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function rounded(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function formatQuantity(quantity, unit) {
  const value = rounded(quantity, quantity < 10 ? 2 : 1);
  const shown = Number.isInteger(value) ? String(value) : String(value).replace(/\.0$/, '');
  const unitLabels = { g: 'g', ml: 'ml', each: '个' };
  return `${shown} ${unitLabels[unit] || unit}`;
}

export function formatMassWithPounds(quantity, unit) {
  const base = formatQuantity(quantity, unit);
  if (unit !== 'g' || quantity < 227) return base;
  return `${base}（约 ${rounded(quantity / GRAMS_PER_POUND, 2)} lb）`;
}

export function normalizeSelections(rawSelections, recipeMap) {
  const normalized = {};
  Object.entries(rawSelections || {}).forEach(([slug, rawServings]) => {
    const servings = Number(rawServings);
    if (!recipeMap.has(slug)) return;
    if (!Number.isInteger(servings) || servings < 1 || servings > 20) return;
    normalized[slug] = servings;
  });
  return normalized;
}

function packageCount(item, product) {
  if (!product) return null;
  const quantity = finitePositive(product.package_qty);
  if (!quantity || product.package_unit !== item.unit) return null;
  return Math.max(1, Math.ceil(item.requiredQty / quantity));
}

function purchaseSuggestion(item, retailer) {
  const meta = item.meta;
  if (meta.purchase_mode === 'exclude') return null;

  const walmart = retailer === 'walmart' ? meta.walmart : null;
  const product = walmart || meta.package || null;
  const count = packageCount(item, product);

  if (retailer === 'walmart' && meta.purchase_mode === 'pantry') {
    const productName = product && product.label ? product.label : meta.label;
    const packText = product && product.pack ? `，${product.pack}` : '';
    return {
      kind: 'package',
      label: productName,
      recommendedQty: count || 1,
      unitLabel: product && product.unit_label ? product.unit_label : '件',
      pack: product && product.pack ? product.pack : '',
      packages: count || 1,
      text: `${productName} × ${count || 1}${packText}`,
      url: walmart && walmart.url ? walmart.url : '',
    };
  }

  if (retailer === 'walmart' && meta.purchase_mode === 'packaged' && product) {
    const productName = product.label || meta.label;
    const packText = product.pack ? `，${product.pack}` : '';
    return {
      kind: 'package',
      label: productName,
      recommendedQty: count || 1,
      unitLabel: product.unit_label || '件',
      pack: product.pack || '',
      packages: count || 1,
      text: `${productName} × ${count || 1}${packText}`,
      url: walmart && walmart.url ? walmart.url : '',
    };
  }

  const target = retailer === 'walmart'
    ? formatMassWithPounds(item.requiredQty, item.unit)
    : formatQuantity(item.requiredQty, item.unit);
  const productName = product && product.label ? product.label : meta.label;
  return {
    kind: 'quantity',
    label: productName,
    recommendedQty: item.requiredQty,
    unit: item.unit,
    unitLabel: item.unit,
    pack: '',
    packages: null,
    text: `${productName}：目标至少 ${target}`,
    url: walmart && walmart.url ? walmart.url : '',
  };
}

export function aggregatePlan({ recipes = [], ingredientCatalog = {}, selections = {}, retailer = 'general' }) {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.slug, recipe]));
  const selected = normalizeSelections(selections, recipeMap);
  const merged = new Map();
  const chosenRecipes = [];

  Object.entries(selected).forEach(([slug, servings]) => {
    const recipe = recipeMap.get(slug);
    chosenRecipes.push({
      slug,
      title: recipe.title,
      cover: recipe.cover || '',
      url: recipe.url || '',
      servings,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      prepPlan: recipe.prepPlan && typeof recipe.prepPlan === 'object' ? recipe.prepPlan : {},
      cookPriority: Number(recipe.cookPriority) || 999,
      cookNote: recipe.cookNote || '',
      cookTasks: Array.isArray(recipe.cookTasks) ? recipe.cookTasks : [],
    });

    (recipe.ingredients || []).forEach((ingredient) => {
      const meta = ingredientCatalog[ingredient.id];
      const quantity = finitePositive(ingredient.qty);
      if (!meta || !quantity || !ingredient.unit) return;
      const key = ingredient.id;
      const existing = merged.get(key);
      if (existing && existing.unit !== ingredient.unit) {
        throw new Error(`ingredient_unit_mismatch:${ingredient.id}`);
      }
      const lineQuantity = quantity * servings;
      if (existing) {
        existing.requiredQty += lineQuantity;
        existing.sources.push({ slug, title: recipe.title, qty: lineQuantity, unit: ingredient.unit });
      } else {
        merged.set(key, {
          id: ingredient.id,
          label: meta.label || ingredient.name,
          unit: ingredient.unit,
          requiredQty: lineQuantity,
          category: meta.category || 'other',
          meta,
          sources: [{ slug, title: recipe.title, qty: lineQuantity, unit: ingredient.unit }],
        });
      }
    });
  });

  const ingredients = [...merged.values()].map((item) => {
    item.requiredQty = rounded(item.requiredQty, 3);
    item.requiredText = formatQuantity(item.requiredQty, item.unit);
    item.purchase = purchaseSuggestion(item, retailer);
    return item;
  }).sort((a, b) => {
    const order = { meat: 1, produce: 2, staple: 3, seasoning: 4, other: 5, excluded: 9 };
    return (order[a.category] || 8) - (order[b.category] || 8) || a.label.localeCompare(b.label, 'zh-CN');
  });

  return {
    recipes: chosenRecipes,
    ingredients,
    purchases: ingredients.filter((item) => item.purchase),
    excluded: ingredients.filter((item) => item.meta.purchase_mode === 'exclude'),
    totalServings: chosenRecipes.reduce((sum, recipe) => sum + recipe.servings, 0),
  };
}

function quantityForIngredient(recipe, ingredientId) {
  return (recipe.ingredients || [])
    .filter((ingredient) => ingredient.id === ingredientId)
    .reduce((sum, ingredient) => sum + (finitePositive(ingredient.qty) || 0), 0);
}

function scaledComponents(components, servings, ingredientCatalog) {
  return (components || []).map((component) => ({
    id: component.id,
    label: ingredientCatalog[component.id]?.label || component.id,
    qty: rounded((finitePositive(component.qty) || 0) * servings, 3),
    unit: component.unit,
    text: formatQuantity((finitePositive(component.qty) || 0) * servings, component.unit),
  }));
}

export function buildOptimizedPrep(plan, ingredientCatalog = {}) {
  const produce = new Map();
  const proteins = new Map();
  const mixes = [];

  (plan.recipes || []).forEach((recipe) => {
    const prep = recipe.prepPlan || {};
    (prep.produce || []).forEach((task) => {
      const qty = quantityForIngredient(recipe, task.id) * recipe.servings;
      if (!qty) return;
      const current = produce.get(task.id) || {
        id: task.id,
        label: ingredientCatalog[task.id]?.label || task.id,
        unit: (recipe.ingredients.find((ingredient) => ingredient.id === task.id) || {}).unit || 'g',
        totalQty: 0,
        allocations: [],
      };
      current.totalQty += qty;
      current.allocations.push({ title: recipe.title, servings: recipe.servings, qty, action: task.action || '' });
      produce.set(task.id, current);
    });

    (prep.mixes || []).forEach((mix) => {
      mixes.push({
        title: recipe.title,
        servings: recipe.servings,
        name: mix.name || '料汁',
        action: mix.action || '混合均匀并贴上菜名',
        components: scaledComponents(mix.components, recipe.servings, ingredientCatalog),
      });
    });

    (prep.proteins || []).forEach((task) => {
      const qty = quantityForIngredient(recipe, task.id) * recipe.servings;
      if (!qty) return;
      const current = proteins.get(task.id) || {
        id: task.id,
        label: ingredientCatalog[task.id]?.label || task.id,
        unit: (recipe.ingredients.find((ingredient) => ingredient.id === task.id) || {}).unit || 'g',
        totalQty: 0,
        batches: [],
      };
      current.totalQty += qty;
      current.batches.push({
        title: recipe.title,
        servings: recipe.servings,
        qty,
        cut: task.cut || '',
        marinadeMinutes: Number(task.marinade_minutes) || 0,
        marinade: scaledComponents(task.marinade, recipe.servings, ingredientCatalog),
        action: task.action || '',
      });
      proteins.set(task.id, current);
    });
  });

  const finalize = (item) => ({
    ...item,
    totalQty: rounded(item.totalQty, 3),
    totalText: formatQuantity(item.totalQty, item.unit),
  });
  const finalizeProduce = (item) => {
    const finalized = finalize(item);
    const groups = new Map();
    finalized.allocations.forEach((allocation) => {
      const action = allocation.action || '按菜谱处理';
      const current = groups.get(action) || { action, qty: 0, uses: [] };
      current.qty += allocation.qty;
      current.uses.push({ title: allocation.title, servings: allocation.servings });
      groups.set(action, current);
    });
    finalized.actionGroups = [...groups.values()].map((group) => ({
      ...group,
      qty: rounded(group.qty, 3),
      text: formatQuantity(group.qty, finalized.unit),
    }));
    return finalized;
  };
  const finalizeProtein = (item) => {
    const finalized = finalize(item);
    const groups = new Map();
    finalized.batches.forEach((batch) => {
      const cut = batch.cut || '按菜谱切配';
      const current = groups.get(cut) || { cut, qty: 0, uses: [] };
      current.qty += batch.qty;
      current.uses.push({ title: batch.title, servings: batch.servings, qty: batch.qty });
      groups.set(cut, current);
    });
    finalized.cutGroups = [...groups.values()].map((group) => ({
      ...group,
      qty: rounded(group.qty, 3),
      text: formatQuantity(group.qty, finalized.unit),
    }));
    return finalized;
  };
  const cooking = [...(plan.recipes || [])]
    .sort((a, b) => a.cookPriority - b.cookPriority || a.title.localeCompare(b.title, 'zh-CN'))
    .map((recipe, index) => ({ ...recipe, order: index + 1 }));
  const marinadeMinutes = [...proteins.values()]
    .flatMap((protein) => protein.batches.map((batch) => batch.marinadeMinutes))
    .reduce((max, minutes) => Math.max(max, minutes), 0);

  return {
    produce: [...produce.values()].map(finalizeProduce),
    mixes,
    proteins: [...proteins.values()].map(finalizeProtein),
    cooking,
    marinadeMinutes,
    hasLongCook: cooking.some((recipe) => recipe.cookPriority <= 10),
  };
}

export function validatePlannerCatalog(recipes, ingredientCatalog) {
  const errors = [];
  const seenSlugs = new Set();
  (recipes || []).forEach((recipe) => {
    if (!recipe.slug || seenSlugs.has(recipe.slug)) errors.push(`duplicate_or_missing_recipe:${recipe.slug || 'unknown'}`);
    seenSlugs.add(recipe.slug);
    (recipe.ingredients || []).forEach((ingredient, index) => {
      if (!ingredientCatalog[ingredient.id]) errors.push(`${recipe.slug}:ingredient_${index}:unknown_id:${ingredient.id}`);
      if (!finitePositive(ingredient.qty)) errors.push(`${recipe.slug}:ingredient_${index}:invalid_qty`);
      if (!ingredient.unit) errors.push(`${recipe.slug}:ingredient_${index}:missing_unit`);
    });
    if (!recipe.prepPlan || typeof recipe.prepPlan !== 'object') errors.push(`${recipe.slug}:missing_prep_plan`);
    if (!Array.isArray(recipe.cookTasks) || !recipe.cookTasks.length) errors.push(`${recipe.slug}:missing_cook_tasks`);
    if (!Number.isFinite(Number(recipe.cookPriority))) errors.push(`${recipe.slug}:missing_cook_priority`);
  });
  return errors;
}
