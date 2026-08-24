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

function purchaseSuggestion(item, pantryOwned, retailer) {
  const meta = item.meta;
  if (meta.purchase_mode === 'exclude') return null;
  if (meta.purchase_mode === 'pantry' && pantryOwned) return null;

  const walmart = retailer === 'walmart' ? meta.walmart : null;
  const product = walmart || meta.package || null;
  const count = packageCount(item, product);

  if (meta.purchase_mode === 'pantry') {
    const productName = product && product.label ? product.label : meta.label;
    const packText = product && product.pack ? `，${product.pack}` : '';
    return {
      packages: count || 1,
      text: `${productName} × ${count || 1}${packText}`,
      url: walmart && walmart.url ? walmart.url : '',
    };
  }

  if (meta.purchase_mode === 'packaged' && product) {
    const productName = product.label || meta.label;
    const packText = product.pack ? `，${product.pack}` : '';
    return {
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
    packages: null,
    text: `${productName}：目标至少 ${target}`,
    url: walmart && walmart.url ? walmart.url : '',
  };
}

export function aggregatePlan({ recipes = [], ingredientCatalog = {}, selections = {}, pantry = {}, retailer = 'general' }) {
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
      prepTasks: Array.isArray(recipe.prepTasks) ? recipe.prepTasks : [],
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
    item.pantryOwned = item.meta.purchase_mode === 'pantry' && Boolean(pantry[item.id]);
    item.purchase = purchaseSuggestion(item, item.pantryOwned, retailer);
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
  });
  return errors;
}
