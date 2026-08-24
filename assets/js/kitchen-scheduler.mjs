const EPSILON = 1e-7;
const SLOT_MINUTES = 0.25;
const MAX_HORIZON_MINUTES = 12 * 60;

export const DEFAULT_KITCHEN_PROFILE = Object.freeze({
  resources: Object.freeze({
    cook: 1,
    knife: 1,
    board: 1,
    wok: 1,
    pot: 1,
    burner: 2,
  }),
});

function positive(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function rounded(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function safeId(value) {
  return String(value || 'task').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'task';
}

function ingredientQuantity(recipe, ingredientId) {
  return (recipe.ingredients || [])
    .filter((ingredient) => ingredient.id === ingredientId)
    .reduce((sum, ingredient) => sum + positive(ingredient.qty), 0) * recipe.servings;
}

function normalizedTask(task) {
  return {
    id: String(task.id),
    label: String(task.label || task.id),
    kind: String(task.kind || 'work'),
    recipeSlug: task.recipeSlug || '',
    recipeTitle: task.recipeTitle || '',
    dependencies: [...new Set(task.dependencies || [])],
    activeMin: rounded(Math.max(0, Number(task.activeMin) || 0)),
    passiveMin: rounded(Math.max(0, Number(task.passiveMin) || 0)),
    resourcesActive: [...new Set(task.resourcesActive || [])],
    resourcesPassive: [...new Set(task.resourcesPassive || [])],
    safety: task.safety || 'neutral',
    mergeKey: task.mergeKey || '',
    finish: Boolean(task.finish),
    holdMaxMin: Math.max(0, Number(task.holdMaxMin) || 0),
    qualityPenalty: Math.max(0, Number(task.qualityPenalty) || 0),
    explain: task.explain || '',
    sequenceStart: Boolean(task.sequenceStart),
    quantity: Number(task.quantity) || 0,
    unit: task.unit || '',
    members: task.members || [],
  };
}

function prepDuration(task, quantity, defaults) {
  const base = positive(task.base_min, defaults.base);
  const per100 = positive(task.min_per_100g, defaults.per100);
  return rounded(base + per100 * quantity / 100);
}

function compileProduce(plan, ingredientCatalog) {
  const groups = new Map();
  const recipeDependencies = new Map();
  for (const recipe of plan.recipes) {
    recipeDependencies.set(recipe.slug, []);
    for (const task of recipe.prepPlan?.produce || []) {
      const quantity = ingredientQuantity(recipe, task.id);
      if (!quantity) continue;
      const mergeKey = `cut:${task.id}:${task.action || ''}`;
      const current = groups.get(mergeKey) || {
        id: `shared:${safeId(mergeKey)}`,
        label: `${ingredientCatalog[task.id]?.label || task.id}：${task.action || '切配'}`,
        kind: 'cut',
        dependencies: [],
        activeMin: 0,
        passiveMin: 0,
        resourcesActive: ['cook', 'knife', 'board'],
        resourcesPassive: [],
        safety: 'clean',
        mergeKey,
        quantity: 0,
        unit: 'g',
        members: [],
        explain: '相同食材与切法合并为一次操作',
      };
      current.quantity += quantity;
      current.members.push({ recipeSlug: recipe.slug, recipeTitle: recipe.title, servings: recipe.servings, quantity });
      current.durationConfig = {
        base: positive(task.base_min, 0.5),
        per100: positive(task.min_per_100g, task.id === 'garlic' ? 2 : 0.8),
      };
      groups.set(mergeKey, current);
      recipeDependencies.get(recipe.slug).push(current.id);
    }
  }
  const tasks = [...groups.values()].map((task) => normalizedTask({
    ...task,
    activeMin: prepDuration(task.durationConfig, task.quantity, task.durationConfig),
  }));
  return { tasks, recipeDependencies };
}

function compileMixes(plan, recipeDependencies) {
  const tasks = [];
  for (const recipe of plan.recipes) {
    (recipe.prepPlan?.mixes || []).forEach((mix, index) => {
      const id = `${recipe.slug}:mix:${index + 1}`;
      tasks.push(normalizedTask({
        id,
        label: `${recipe.title}：调 ${mix.name || '料汁'}`,
        kind: 'mix',
        recipeSlug: recipe.slug,
        recipeTitle: recipe.title,
        dependencies: [],
        activeMin: positive(mix.active_min, 1.5) + Math.max(0, recipe.servings - 1) * 0.2,
        resourcesActive: ['cook'],
        safety: 'clean',
        explain: '料汁提前调好并贴标签，减少开火后的切换',
      }));
      recipeDependencies.get(recipe.slug).push(id);
    });
  }
  return tasks;
}

function compileProteins(plan, ingredientCatalog, cleanTaskIds, recipeDependencies) {
  const tasks = [];
  const rawBySafety = new Map();
  const marinadeActiveBySafety = new Map();
  const waitByRecipe = new Map();

  for (const recipe of plan.recipes) {
    (recipe.prepPlan?.proteins || []).forEach((protein, index) => {
      const quantity = ingredientQuantity(recipe, protein.id);
      if (!quantity) return;
      const safety = ingredientCatalog[protein.id]?.safety_class || 'raw_meat';
      const cutId = `${recipe.slug}:protein:${index + 1}:cut`;
      const marinadeId = `${recipe.slug}:protein:${index + 1}:marinade`;
      const waitId = `${recipe.slug}:protein:${index + 1}:wait`;
      const cutTask = normalizedTask({
        id: cutId,
        label: `${recipe.title}：${ingredientCatalog[protein.id]?.label || protein.id}${protein.cut ? `，${protein.cut}` : ''}`,
        kind: 'cut-protein',
        recipeSlug: recipe.slug,
        recipeTitle: recipe.title,
        dependencies: [...cleanTaskIds],
        activeMin: prepDuration(protein, quantity, { base: 1, per100: safety === 'raw_beef' ? 0.9 : 0.7 }),
        resourcesActive: ['cook', 'knife', 'board'],
        safety,
        quantity,
        unit: 'g',
        explain: '生肉集中切配后按菜分盒，避免反复污染刀板',
      });
      const marinadeTask = normalizedTask({
        id: marinadeId,
        label: `${recipe.title}：拌腌料并装盒`,
        kind: 'marinade-active',
        recipeSlug: recipe.slug,
        recipeTitle: recipe.title,
        dependencies: [cutId],
        activeMin: positive(protein.marinade_active_min, 1.5) + Math.max(0, recipe.servings - 1) * 0.25,
        resourcesActive: ['cook'],
        safety,
      });
      const waitTask = normalizedTask({
        id: waitId,
        label: `${recipe.title}：冷藏腌制`,
        kind: 'marinate-wait',
        recipeSlug: recipe.slug,
        recipeTitle: recipe.title,
        dependencies: [marinadeId],
        activeMin: 0,
        passiveMin: positive(protein.marinade_minutes, 20),
        safety,
        explain: '腌制为被动等待，可穿插清洁和其他菜的操作',
      });
      tasks.push(cutTask, marinadeTask, waitTask);
      if (!rawBySafety.has(safety)) rawBySafety.set(safety, []);
      if (!marinadeActiveBySafety.has(safety)) marinadeActiveBySafety.set(safety, []);
      rawBySafety.get(safety).push(cutId);
      marinadeActiveBySafety.get(safety).push(marinadeId);
      waitByRecipe.set(recipe.slug, [...(waitByRecipe.get(recipe.slug) || []), waitId]);
      recipeDependencies.get(recipe.slug).push(waitId);
    });
  }

  const beefMarinades = marinadeActiveBySafety.get('raw_beef') || [];
  const poultryCuts = rawBySafety.get('raw_poultry') || [];
  let crossSanitizeId = '';
  if (beefMarinades.length && poultryCuts.length) {
    crossSanitizeId = 'shared:sanitize:beef-to-poultry';
    tasks.push(normalizedTask({
      id: crossSanitizeId,
      label: '牛肉处理后清洗消毒刀板，再处理禽肉',
      kind: 'sanitize',
      dependencies: beefMarinades,
      activeMin: 2,
      resourcesActive: ['cook', 'knife', 'board'],
      safety: 'sanitize',
      explain: '避免生禽污染只需较低熟度的牛肉',
    }));
    tasks.forEach((task) => {
      if (poultryCuts.includes(task.id)) task.dependencies = [...new Set([...task.dependencies, crossSanitizeId])];
    });
  }

  const allMarinades = [...marinadeActiveBySafety.values()].flat();
  const finalSanitizeId = allMarinades.length ? 'shared:sanitize:final' : '';
  if (finalSanitizeId) {
    tasks.push(normalizedTask({
      id: finalSanitizeId,
      label: '生肉全部入盒后清洗刀板、台面和双手',
      kind: 'sanitize',
      dependencies: allMarinades,
      activeMin: 3,
      resourcesActive: ['cook', 'knife', 'board'],
      safety: 'sanitize',
      explain: '完成生熟分区后再进入开火阶段',
    }));
  }
  return { tasks, waitByRecipe, finalSanitizeId };
}

function compileCooking(plan, recipeDependencies, finalSanitizeId) {
  const tasks = [];
  const sequences = [];
  for (const recipe of plan.recipes) {
    const workflow = Array.isArray(recipe.workflow) ? recipe.workflow : [];
    const localIds = new Set(workflow.map((task) => task.id));
    workflow.forEach((rawTask) => {
      const id = `${recipe.slug}:cook:${rawTask.id}`;
      const localDependencies = (rawTask.depends_on || []).filter((dep) => localIds.has(dep)).map((dep) => `${recipe.slug}:cook:${dep}`);
      const dependencies = [...localDependencies];
      if (rawTask.after_prep) dependencies.push(...(recipeDependencies.get(recipe.slug) || []));
      if (rawTask.after_prep && finalSanitizeId) dependencies.push(finalSanitizeId);

      let activeMin = positive(rawTask.active_min, 1);
      let batches = 1;
      if (rawTask.batch_ingredient_id && positive(rawTask.batch_capacity_g)) {
        const quantity = ingredientQuantity(recipe, rawTask.batch_ingredient_id);
        batches = Math.max(1, Math.ceil(quantity / Number(rawTask.batch_capacity_g)));
        activeMin *= batches;
      }
      activeMin += Math.max(0, recipe.servings - 1) * positive(rawTask.per_extra_serving_min);

      tasks.push(normalizedTask({
        id,
        label: `${recipe.title}：${rawTask.label || rawTask.id}${batches > 1 ? `（分 ${batches} 批）` : ''}`,
        kind: rawTask.kind || 'cook',
        recipeSlug: recipe.slug,
        recipeTitle: recipe.title,
        dependencies,
        activeMin,
        passiveMin: positive(rawTask.passive_min),
        resourcesActive: rawTask.resources_active || ['cook', 'wok', 'burner'],
        resourcesPassive: rawTask.resources_passive || [],
        safety: rawTask.safety || 'cooking',
        finish: rawTask.finish,
        holdMaxMin: rawTask.hold_max_min,
        qualityPenalty: rawTask.quality_penalty,
        explain: rawTask.explain || '',
        sequenceStart: Boolean(rawTask.after_prep),
      }));
    });
    const recipeTasks = tasks.filter((task) => task.recipeSlug === recipe.slug);
    const start = recipeTasks.find((task) => task.sequenceStart);
    const finish = recipeTasks.find((task) => task.finish);
    if (start && finish) {
      const primaryEquipment = start.resourcesActive.find((resource) => !['cook', 'burner'].includes(resource)) || '';
      sequences.push({ start, finish, primaryEquipment });
    }
  }
  const equipmentGroups = new Map();
  sequences.forEach((sequence) => {
    if (!sequence.primaryEquipment) return;
    if (!equipmentGroups.has(sequence.primaryEquipment)) equipmentGroups.set(sequence.primaryEquipment, []);
    equipmentGroups.get(sequence.primaryEquipment).push(sequence);
  });
  equipmentGroups.forEach((group) => {
    group.sort((a, b) => (
      a.finish.qualityPenalty - b.finish.qualityPenalty
      || b.finish.holdMaxMin - a.finish.holdMaxMin
      || a.start.recipeSlug.localeCompare(b.start.recipeSlug)
    ));
    for (let index = 1; index < group.length; index += 1) {
      group[index].start.dependencies = [...new Set([...group[index].start.dependencies, group[index - 1].finish.id])];
      group[index].start.explain = `等待同一${group[index].primaryEquipment === 'wok' ? '口炒锅' : '设备'}中的前一道菜完成；更耐等待的菜优先`;
    }
  });
  return tasks;
}

export function compileKitchenWorkflow(plan, ingredientCatalog = {}, profile = DEFAULT_KITCHEN_PROFILE) {
  const { tasks: produceTasks, recipeDependencies } = compileProduce(plan, ingredientCatalog);
  const mixTasks = compileMixes(plan, recipeDependencies);
  const cleanTaskIds = [...produceTasks, ...mixTasks].map((task) => task.id);
  const protein = compileProteins(plan, ingredientCatalog, cleanTaskIds, recipeDependencies);
  const cookingTasks = compileCooking(plan, recipeDependencies, protein.finalSanitizeId);
  const tasks = [...produceTasks, ...mixTasks, ...protein.tasks, ...cookingTasks];
  const errors = validateTaskGraph(tasks, profile);
  if (errors.length) throw new Error(`workflow_invalid:${errors.join('|')}`);
  return { tasks, profile, recipeDependencies };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd - EPSILON && bStart < aEnd - EPSILON;
}

function intervalFits(calendar, resource, start, end, capacity) {
  if (end <= start + EPSILON) return true;
  const intervals = calendar.get(resource) || [];
  const points = [start, end];
  intervals.forEach((interval) => {
    if (interval.start > start && interval.start < end) points.push(interval.start);
    if (interval.end > start && interval.end < end) points.push(interval.end);
  });
  points.sort((a, b) => a - b);
  for (let index = 0; index < points.length - 1; index += 1) {
    const midpoint = (points[index] + points[index + 1]) / 2;
    const used = intervals.filter((interval) => midpoint >= interval.start - EPSILON && midpoint < interval.end - EPSILON).length;
    if (used + 1 > capacity) return false;
  }
  return true;
}

function resourcesFit(calendar, resources, start, end, capacities) {
  return resources.every((resource) => intervalFits(calendar, resource, start, end, capacities[resource] || 0));
}

function reserve(calendar, resources, start, end, taskId, phase) {
  if (end <= start + EPSILON) return;
  resources.forEach((resource) => {
    if (!calendar.has(resource)) calendar.set(resource, []);
    calendar.get(resource).push({ start, end, taskId, phase });
  });
}

function findEarliestSlot(task, earliest, calendar, capacities) {
  for (let start = Math.max(0, earliest); start <= MAX_HORIZON_MINUTES; start = rounded(start + SLOT_MINUTES)) {
    const activeEnd = rounded(start + task.activeMin);
    const end = rounded(activeEnd + task.passiveMin);
    if (!resourcesFit(calendar, task.resourcesActive, start, activeEnd, capacities)) continue;
    if (!resourcesFit(calendar, task.resourcesPassive, activeEnd, end, capacities)) continue;
    return { start, activeEnd, end };
  }
  throw new Error(`no_resource_slot:${task.id}`);
}

function criticalPaths(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const children = new Map(tasks.map((task) => [task.id, []]));
  tasks.forEach((task) => task.dependencies.forEach((dependency) => children.get(dependency)?.push(task.id)));
  const memo = new Map();
  const visit = (id) => {
    if (memo.has(id)) return memo.get(id);
    const task = byId.get(id);
    const child = Math.max(0, ...(children.get(id) || []).map(visit));
    const value = task.activeMin + task.passiveMin + child;
    memo.set(id, value);
    return value;
  };
  tasks.forEach((task) => visit(task.id));
  return memo;
}

function downstreamFreshness(tasks) {
  const children = new Map(tasks.map((task) => [task.id, []]));
  tasks.forEach((task) => task.dependencies.forEach((dependency) => children.get(dependency)?.push(task.id)));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const memo = new Map();
  const visit = (id) => {
    if (memo.has(id)) return memo.get(id);
    const task = byId.get(id);
    let best = task.finish ? { penalty: task.qualityPenalty, holdMax: task.holdMaxMin } : { penalty: 0, holdMax: 0 };
    (children.get(id) || []).forEach((childId) => {
      const child = visit(childId);
      if (child.penalty > best.penalty) best = child;
    });
    memo.set(id, best);
    return best;
  };
  tasks.forEach((task) => visit(task.id));
  return memo;
}

function downstreamPassive(tasks) {
  const children = new Map(tasks.map((task) => [task.id, []]));
  tasks.forEach((task) => task.dependencies.forEach((dependency) => children.get(dependency)?.push(task.id)));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const memo = new Map();
  const visit = (id) => {
    if (memo.has(id)) return memo.get(id);
    const task = byId.get(id);
    const value = task.passiveMin + Math.max(0, ...(children.get(id) || []).map(visit));
    memo.set(id, value);
    return value;
  };
  tasks.forEach((task) => visit(task.id));
  return memo;
}

function candidateScore(task, criticalPath, passivePath, freshness, strategy, lastCookingRecipe, resumeLockedPassive) {
  const passiveBonus = strategy.passive * passivePath;
  const launchPassive = passivePath > 0 ? (strategy.launchPassive || 0) * passivePath : 0;
  const finishDelay = strategy.hold * (freshness?.penalty || 0);
  const sanitation = task.kind === 'sanitize' ? 1000 : 0;
  const immediateWait = task.activeMin === 0 && task.passiveMin > 0 ? 20000 : 0;
  const continuity = lastCookingRecipe && task.recipeSlug === lastCookingRecipe && isCookingKind(task.kind)
    ? (strategy.continuity || 0)
    : 0;
  const resume = resumeLockedPassive ? (strategy.resumePassive || 0) : 0;
  return immediateWait + sanitation + resume + continuity + launchPassive + strategy.critical * criticalPath + passiveBonus - finishDelay;
}

export function scheduleTasks(tasks, profile = DEFAULT_KITCHEN_PROFILE, strategy = { critical: 8, passive: 5, launchPassive: 100, resumePassive: 5000, hold: 8, continuity: 10000, delayFreshness: true }) {
  const normalized = tasks.map(normalizedTask);
  const taskById = new Map(normalized.map((task) => [task.id, task]));
  const capacities = profile.resources || {};
  const critical = criticalPaths(normalized);
  const passive = downstreamPassive(normalized);
  const freshness = downstreamFreshness(normalized);
  const calendar = new Map();
  const scheduled = new Map();
  let lastCookingRecipe = '';
  let currentTime = 0;

  while (scheduled.size < normalized.length) {
    const dependencyKnown = normalized.filter((task) => !scheduled.has(task.id) && task.dependencies.every((dependency) => scheduled.has(dependency)));
    if (!dependencyKnown.length) throw new Error('workflow_cycle_or_missing_dependency');
    const projectedHorizon = Math.max(currentTime, ...[...scheduled.values()].map((entry) => entry.start + critical.get(entry.id)));
    const candidates = dependencyKnown.map((task) => {
      const dependencyEnd = Math.max(0, ...task.dependencies.map((dependency) => scheduled.get(dependency).end));
      let earliest = Math.max(currentTime, dependencyEnd);
      if (strategy.delayFreshness && task.sequenceStart) {
        const info = freshness.get(task.id);
        if (info?.penalty >= 2) earliest = Math.max(earliest, projectedHorizon - critical.get(task.id) - info.holdMax);
      }
      const slot = findEarliestSlot(task, earliest, calendar, capacities);
      return { task, slot };
    });
    const earliestStart = Math.min(...candidates.map((candidate) => candidate.slot.start));
    if (earliestStart > currentTime + EPSILON) {
      currentTime = earliestStart;
      continue;
    }
    const ready = candidates.filter((candidate) => candidate.slot.start <= currentTime + EPSILON);
    ready.sort((a, b) => {
      const taskA = a.task;
      const taskB = b.task;
      const resumesA = taskA.dependencies.some((dependency) => (taskById.get(dependency)?.resourcesPassive || []).length > 0);
      const resumesB = taskB.dependencies.some((dependency) => (taskById.get(dependency)?.resourcesPassive || []).length > 0);
      const scoreDiff = candidateScore(taskB, critical.get(taskB.id), passive.get(taskB.id), freshness.get(taskB.id), strategy, lastCookingRecipe, resumesB)
        - candidateScore(taskA, critical.get(taskA.id), passive.get(taskA.id), freshness.get(taskA.id), strategy, lastCookingRecipe, resumesA);
      return scoreDiff || taskA.id.localeCompare(taskB.id);
    });
    const { task, slot } = ready[0];
    const entry = { ...task, ...slot };
    scheduled.set(task.id, entry);
    reserve(calendar, task.resourcesActive, slot.start, slot.activeEnd, task.id, 'active');
    reserve(calendar, task.resourcesPassive, slot.activeEnd, slot.end, task.id, 'passive');
    if (task.recipeSlug && task.activeMin > 0 && isCookingKind(task.kind)) lastCookingRecipe = task.recipeSlug;
    if (task.activeMin > 0) currentTime = slot.activeEnd;
  }

  return scoreSchedule([...scheduled.values()], normalized, profile, strategy);
}

function isCookingKind(kind) {
  return !['cut', 'mix', 'cut-protein', 'marinade-active', 'marinate-wait', 'sanitize'].includes(kind);
}

function scoreSchedule(entries, tasks, profile, strategy) {
  const sorted = [...entries].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  const makespan = Math.max(0, ...sorted.map((entry) => entry.end));
  let qualityLoss = 0;
  sorted.filter((entry) => entry.finish).forEach((entry) => {
    const excess = Math.max(0, makespan - entry.end - entry.holdMaxMin);
    qualityLoss += excess * entry.qualityPenalty;
  });
  const activeCooking = sorted.filter((entry) => entry.activeMin > 0 && isCookingKind(entry.kind) && entry.recipeSlug);
  let contextSwitches = 0;
  for (let index = 1; index < activeCooking.length; index += 1) {
    if (activeCooking[index - 1].recipeSlug !== activeCooking[index].recipeSlug) contextSwitches += 1;
  }
  const objective = rounded(makespan + qualityLoss * 8 + contextSwitches * 1.5);
  return {
    entries: sorted,
    tasks,
    profile,
    strategy,
    metrics: { makespan, qualityLoss: rounded(qualityLoss), contextSwitches, objective },
    timeline: buildTimeline(sorted),
  };
}

export function optimizeKitchenSchedule(tasks, profile = DEFAULT_KITCHEN_PROFILE) {
  const strategies = [
    { name: 'balanced', critical: 8, passive: 5, launchPassive: 100, resumePassive: 5000, hold: 8, continuity: 10000, delayFreshness: true },
    { name: 'start-waits-early', critical: 6, passive: 10, launchPassive: 140, resumePassive: 5000, hold: 6, continuity: 10000, delayFreshness: true },
    { name: 'protect-freshness', critical: 7, passive: 5, launchPassive: 100, resumePassive: 5000, hold: 18, continuity: 10000, delayFreshness: true },
    { name: 'critical-path', critical: 12, passive: 2, launchPassive: 80, resumePassive: 5000, hold: 5, continuity: 10000, delayFreshness: false },
  ];
  const schedules = strategies.map((strategy) => scheduleTasks(tasks, profile, strategy));
  schedules.sort((a, b) => a.metrics.objective - b.metrics.objective || a.strategy.name.localeCompare(b.strategy.name));
  return { best: schedules[0], alternatives: schedules };
}

export function buildTimeline(entries) {
  const segments = [];
  entries.forEach((entry) => {
    if (entry.activeMin > 0) {
      segments.push({
        taskId: entry.id,
        recipeSlug: entry.recipeSlug,
        recipeTitle: entry.recipeTitle,
        label: entry.label,
        kind: entry.kind,
        phase: 'active',
        start: entry.start,
        end: entry.activeEnd,
        resources: entry.resourcesActive,
        explain: entry.explain,
      });
    }
    if (entry.passiveMin > 0) {
      segments.push({
        taskId: entry.id,
        recipeSlug: entry.recipeSlug,
        recipeTitle: entry.recipeTitle,
        label: entry.label,
        kind: entry.kind,
        phase: 'passive',
        start: entry.activeEnd,
        end: entry.end,
        resources: entry.resourcesPassive,
        explain: entry.explain,
      });
    }
  });
  return segments.sort((a, b) => {
    const phaseOrder = (a.phase === 'active' ? 0 : 1) - (b.phase === 'active' ? 0 : 1);
    return a.start - b.start || phaseOrder || a.taskId.localeCompare(b.taskId);
  });
}

export function validateTaskGraph(tasks, profile = DEFAULT_KITCHEN_PROFILE) {
  const errors = [];
  const byId = new Map();
  tasks.forEach((task) => {
    if (!task.id || byId.has(task.id)) errors.push(`duplicate_or_missing:${task.id || 'unknown'}`);
    byId.set(task.id, task);
    [...(task.resourcesActive || []), ...(task.resourcesPassive || [])].forEach((resource) => {
      if (!positive(profile.resources?.[resource])) errors.push(`${task.id}:resource_unavailable:${resource}`);
    });
  });
  tasks.forEach((task) => (task.dependencies || []).forEach((dependency) => {
    if (!byId.has(dependency)) errors.push(`${task.id}:missing_dependency:${dependency}`);
  }));
  return errors;
}

export function validateSchedule(schedule) {
  const errors = [];
  const byId = new Map(schedule.entries.map((entry) => [entry.id, entry]));
  schedule.entries.forEach((entry) => entry.dependencies.forEach((dependency) => {
    if ((byId.get(dependency)?.end || Infinity) > entry.start + EPSILON) errors.push(`${entry.id}:dependency_overlap:${dependency}`);
  }));
  const segmentsByResource = new Map();
  schedule.entries.forEach((entry) => {
    entry.resourcesActive.forEach((resource) => {
      if (!segmentsByResource.has(resource)) segmentsByResource.set(resource, []);
      segmentsByResource.get(resource).push({ start: entry.start, end: entry.activeEnd, id: entry.id });
    });
    entry.resourcesPassive.forEach((resource) => {
      if (!segmentsByResource.has(resource)) segmentsByResource.set(resource, []);
      segmentsByResource.get(resource).push({ start: entry.activeEnd, end: entry.end, id: entry.id });
    });
  });
  segmentsByResource.forEach((segments, resource) => {
    const capacity = schedule.profile.resources[resource] || 0;
    const points = [...new Set(segments.flatMap((segment) => [segment.start, segment.end]))].sort((a, b) => a - b);
    for (let index = 0; index < points.length - 1; index += 1) {
      const midpoint = (points[index] + points[index + 1]) / 2;
      const active = segments.filter((segment) => overlaps(segment.start, segment.end, midpoint, midpoint + EPSILON)).length;
      if (active > capacity) errors.push(`resource_overbooked:${resource}:${points[index]}`);
    }
  });
  return errors;
}
