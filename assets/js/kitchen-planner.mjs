import {
  aggregatePlan,
  buildOptimizedPrep,
  formatMassWithPounds,
  formatQuantity,
  normalizeSelections,
  validatePlannerCatalog,
} from './kitchen-core.mjs?v=2';

const STORAGE_KEY = 'zircon.kitchen.planner.v1';
const API_FALLBACK = 'https://zircon-urge.fly.dev/api';
const CATEGORY_LABELS = {
  meat: '肉类',
  produce: '蔬菜与鲜货',
  staple: '包装主料',
  seasoning: '调味与常备品',
  other: '其他',
  excluded: '无需采购',
};

const app = document.getElementById('kp-app');
const catalogElement = document.getElementById('kp-catalog');
const catalog = JSON.parse(catalogElement.textContent);
const allRecipes = Array.isArray(catalog.recipes) ? catalog.recipes : [];
const ingredientCatalog = catalog.ingredients || {};
const recipeMap = new Map(allRecipes.map((recipe) => [recipe.slug, recipe]));
const catalogErrors = validatePlannerCatalog(allRecipes, ingredientCatalog);

const elements = {
  alert: document.getElementById('kp-alert'),
  title: document.getElementById('kp-title'),
  lead: document.getElementById('kp-lead'),
  modeLabel: document.getElementById('kp-mode-label'),
  privacy: document.getElementById('kp-privacy'),
  search: document.getElementById('kp-search'),
  recipeGrid: document.getElementById('kp-recipe-grid'),
  empty: document.getElementById('kp-empty'),
  results: document.getElementById('kp-results'),
  summary: document.getElementById('kp-summary'),
  shopping: document.getElementById('kp-shopping-list'),
  prep: document.getElementById('kp-prep-list'),
  cook: document.getElementById('kp-cook-list'),
  reset: document.getElementById('kp-reset'),
  copyList: document.getElementById('kp-copy-list'),
  printList: document.getElementById('kp-print-list'),
  restorePurchases: document.getElementById('kp-restore-purchases'),
  orderForm: document.getElementById('kp-order-form'),
  owner: document.getElementById('kp-owner'),
  inviteList: document.getElementById('kp-invite-list'),
  orderList: document.getElementById('kp-order-list'),
  openInvite: document.getElementById('kp-open-invite'),
  refreshOrders: document.getElementById('kp-refresh-orders'),
  inviteDialog: document.getElementById('kp-invite-dialog'),
  inviteForm: document.getElementById('kp-invite-form'),
  inviteSelection: document.getElementById('kp-invite-selection'),
  inviteTitle: document.getElementById('kp-invite-title'),
  inviteExpiry: document.getElementById('kp-invite-expiry'),
  createdLink: document.getElementById('kp-created-link'),
  inviteLink: document.getElementById('kp-invite-link'),
  copyInvite: document.getElementById('kp-copy-invite'),
};

const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
const inviteToken = hashParams.get('invite') || '';
let mode = inviteToken ? 'invite' : 'self';
let allowedSlugs = null;
let inviteData = null;
let ownerOrders = [];
let ownerCheckSequence = 0;
let retailer = 'general';
let selections = {};
let adjustments = { general: {}, walmart: {} };
let lastPlan = aggregatePlan({ recipes: allRecipes, ingredientCatalog, selections, retailer });

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = text;
  return element;
}

function setAlert(message, kind = 'info') {
  elements.alert.textContent = message || '';
  elements.alert.dataset.kind = kind;
  elements.alert.hidden = !message;
}

function apiBase() {
  return (window.SiteAuth && window.SiteAuth.API_BASE) || API_FALLBACK;
}

function loadLocalState() {
  if (mode !== 'self') return;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    selections = normalizeSelections(saved.selections || {}, recipeMap);
    adjustments = saved.adjustments && typeof saved.adjustments === 'object'
      ? {
        general: saved.adjustments.general && typeof saved.adjustments.general === 'object' ? saved.adjustments.general : {},
        walmart: saved.adjustments.walmart && typeof saved.adjustments.walmart === 'object' ? saved.adjustments.walmart : {},
      }
      : { general: {}, walmart: {} };
    retailer = saved.retailer === 'walmart' ? 'walmart' : 'general';
  } catch {
    selections = {};
    adjustments = { general: {}, walmart: {} };
    retailer = 'general';
  }
  const addedSlug = new URLSearchParams(location.search).get('add');
  if (addedSlug && recipeMap.has(addedSlug)) {
    selections[addedSlug] = Math.max(1, selections[addedSlug] || 0);
    saveLocalState();
    history.replaceState(null, '', location.pathname);
  }
}

function saveLocalState() {
  if (mode !== 'self') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selections, adjustments, retailer }));
  } catch {}
}

function selectedRecipeEntries() {
  return Object.entries(selections)
    .filter(([, servings]) => servings > 0)
    .map(([slug, servings]) => ({ recipe: recipeMap.get(slug), servings }))
    .filter((entry) => entry.recipe);
}

function changeServing(slug, delta) {
  const current = Number(selections[slug] || 0);
  const next = Math.max(0, Math.min(20, current + delta));
  if (next === 0) delete selections[slug];
  else selections[slug] = next;
  saveLocalState();
  renderRecipes();
  renderPlan();
}

function recipeAllowed(recipe) {
  return !allowedSlugs || allowedSlugs.has(recipe.slug);
}

function renderRecipes() {
  const query = elements.search.value.trim().toLowerCase();
  elements.recipeGrid.replaceChildren();
  allRecipes
    .filter(recipeAllowed)
    .filter((recipe) => {
      if (!query) return true;
      return `${recipe.title} ${(recipe.tags || []).join(' ')}`.toLowerCase().includes(query);
    })
    .forEach((recipe) => {
      const servings = selections[recipe.slug] || 0;
      const card = createElement('article', `kp-recipe${servings ? ' is-selected' : ''}`);
      const image = createElement('img', 'kp-recipe-cover');
      image.src = recipe.cover;
      image.alt = '';
      image.loading = 'lazy';
      card.append(image);

      const body = createElement('div', 'kp-recipe-body');
      const top = createElement('div');
      const title = createElement('a', 'kp-recipe-title', recipe.title);
      title.href = recipe.url;
      const meta = createElement('div', 'kp-recipe-meta', `${recipe.totalTime || '—'} min · ${(recipe.tags || []).join(' · ')}`);
      top.append(title, meta);

      const stepper = createElement('div', 'kp-stepper');
      const minus = createElement('button', '', '−');
      minus.type = 'button';
      minus.disabled = servings === 0;
      minus.setAttribute('aria-label', `${recipe.title}减少一份`);
      minus.addEventListener('click', () => changeServing(recipe.slug, -1));
      const output = createElement('output', '', servings ? `${servings} 份` : '未选择');
      const plus = createElement('button', '', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', `${recipe.title}增加一份`);
      plus.addEventListener('click', () => changeServing(recipe.slug, 1));
      stepper.append(minus, output, plus);
      body.append(top, stepper);
      card.append(body);
      elements.recipeGrid.append(card);
    });
}

function groupByCategory(items) {
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  });
  return groups;
}

function adjustmentStep(item) {
  if (item.purchase.kind === 'package') return 1;
  if (item.category === 'meat') return 50;
  if (item.category === 'produce') return item.requiredQty < 100 ? 10 : 50;
  if (item.category === 'staple') return 10;
  return 5;
}

function roundedAdjustment(value) {
  return Math.max(0, Math.round((Number(value) + Number.EPSILON) * 100) / 100);
}

function adjustedPurchase(item) {
  const current = adjustments[retailer] || {};
  const saved = Number(current[item.id]);
  const recommended = Number(item.purchase.recommendedQty) || 0;
  const quantity = Number.isFinite(saved) && saved >= 0 ? saved : recommended;
  const isPackage = item.purchase.kind === 'package';
  return {
    item,
    quantity: roundedAdjustment(quantity),
    recommended: roundedAdjustment(recommended),
    step: adjustmentStep(item),
    manual: Object.prototype.hasOwnProperty.call(current, item.id),
    unitLabel: isPackage ? item.purchase.unitLabel : (item.purchase.unit || item.unit),
    displayQuantity: isPackage
      ? `${roundedAdjustment(quantity)} ${item.purchase.unitLabel}`
      : (retailer === 'walmart' ? formatMassWithPounds(quantity, item.purchase.unit || item.unit) : formatQuantity(quantity, item.purchase.unit || item.unit)),
  };
}

function setPurchaseAdjustment(item, value) {
  const next = roundedAdjustment(value);
  if (!adjustments[retailer]) adjustments[retailer] = {};
  adjustments[retailer][item.id] = next;
  saveLocalState();
  renderShopping(lastPlan);
}

function renderShopping(plan) {
  elements.shopping.replaceChildren();
  groupByCategory(plan.purchases).forEach((items, category) => {
    const group = createElement('section', 'kp-group');
    group.append(createElement('h4', 'kp-group-title', CATEGORY_LABELS[category] || '其他'));
    items.forEach((item) => {
      const adjusted = adjustedPurchase(item);
      const row = createElement('div', `kp-purchase-row${adjusted.quantity === 0 ? ' is-zero' : ''}`);
      const left = createElement('div');
      const content = item.purchase.url
        ? createElement('a', 'kp-purchase-link', item.purchase.label)
        : createElement('span', 'kp-ingredient-label', item.purchase.label);
      if (content.tagName === 'A') {
        content.href = item.purchase.url;
        content.target = '_blank';
        content.rel = 'noopener noreferrer';
      }
      const detailParts = [`菜谱合计需要 ${item.requiredText}`];
      if (item.purchase.pack) detailParts.push(`默认包装 ${item.purchase.pack}`);
      if (adjusted.manual) detailParts.push('已手动调整');
      left.append(content, createElement('span', 'kp-ingredient-source', detailParts.join(' · ')));

      const adjuster = createElement('div', 'kp-adjuster');
      const minus = createElement('button', '', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', `${item.purchase.label}减少购买数量`);
      minus.addEventListener('click', () => setPurchaseAdjustment(item, adjusted.quantity - adjusted.step));
      const input = createElement('input');
      input.type = 'number';
      input.min = '0';
      input.step = String(adjusted.step);
      input.value = String(adjusted.quantity);
      input.setAttribute('aria-label', `${item.purchase.label}购买数量`);
      input.addEventListener('input', () => {
        if (!adjustments[retailer]) adjustments[retailer] = {};
        adjustments[retailer][item.id] = roundedAdjustment(input.value);
        row.classList.toggle('is-zero', roundedAdjustment(input.value) === 0);
        saveLocalState();
      });
      input.addEventListener('change', () => setPurchaseAdjustment(item, input.value));
      const unit = createElement('span', 'kp-adjuster-unit', adjusted.unitLabel);
      const plus = createElement('button', '', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', `${item.purchase.label}增加购买数量`);
      plus.addEventListener('click', () => setPurchaseAdjustment(item, adjusted.quantity + adjusted.step));
      adjuster.append(minus, input, unit, plus);
      row.append(left, adjuster);
      group.append(row);
    });
    elements.shopping.append(group);
  });
}

function appendPrepPhase(container, number, title, content) {
  const phase = createElement('section', 'kp-prep-phase');
  phase.append(createElement('span', 'kp-prep-phase-number', String(number)));
  const body = createElement('div');
  body.append(createElement('h4', '', title), content);
  phase.append(body);
  container.append(phase);
}

function renderPrep(plan) {
  elements.prep.replaceChildren();
  elements.prep.className = 'kp-prep-timeline';
  const optimized = buildOptimizedPrep(plan, ingredientCatalog);

  const produceBody = createElement('div');
  optimized.produce.forEach((item) => {
    const row = createElement('div', 'kp-prep-item');
    row.append(createElement('strong', '', `${item.label} · 共 ${item.totalText}`));
    const details = createElement('ul', 'kp-prep-details');
    item.actionGroups.forEach((group) => {
      const uses = group.uses.map((use) => `${use.title} × ${use.servings}`).join('、');
      details.append(createElement('li', '', `${group.action}：一次处理 ${group.text}，再分给 ${uses}`));
    });
    row.append(details);
    produceBody.append(row);
  });
  appendPrepPhase(elements.prep, 1, '蔬菜与葱姜蒜一次切齐', produceBody);

  const mixesBody = createElement('div');
  optimized.mixes.forEach((mix) => {
    const row = createElement('div', 'kp-prep-item');
    row.append(createElement('strong', '', `${mix.title} × ${mix.servings} · ${mix.name}`));
    row.append(createElement('span', 'kp-ingredient-source', mix.components.map((component) => `${component.label} ${component.text}`).join('、')));
    row.append(createElement('span', 'kp-ingredient-source', mix.action));
    mixesBody.append(row);
  });
  appendPrepPhase(elements.prep, 2, '按菜调好料汁并贴标签', mixesBody);

  const proteinBody = createElement('div');
  optimized.proteins.forEach((protein) => {
    const row = createElement('div', 'kp-prep-item');
    row.append(createElement('strong', '', `${protein.label} · 共 ${protein.totalText}`));
    const details = createElement('ul', 'kp-prep-details');
    protein.cutGroups.forEach((group) => {
      const uses = group.uses.map((use) => `${use.title} × ${use.servings}`).join('、');
      details.append(createElement('li', '', `${group.cut}：一次处理 ${group.text}，再分给 ${uses}`));
    });
    protein.batches.forEach((batch) => {
      const marinade = batch.marinade.map((component) => `${component.label} ${component.text}`).join('、');
      details.append(createElement('li', '', `${batch.title} × ${batch.servings}：分出 ${formatQuantity(batch.qty, protein.unit)}；${batch.action}（${marinade}）`));
    });
    row.append(details);
    proteinBody.append(row);
  });
  appendPrepPhase(elements.prep, 3, '最后处理生肉，按菜分盒腌制', proteinBody);

  const parallel = createElement('p', 'kp-prep-parallel');
  const parallelParts = [
    `生肉全部入盒后，立即清洗刀、砧板、台面和双手；最长腌制约 ${optimized.marinadeMinutes || 0} 分钟。`,
    '等待时把料汁按炒制顺序排好，并准备盛出半熟肉的干净盘子。',
  ];
  if (optimized.hasLongCook) parallelParts.push('腌制结束后先启动咖喱等焖煮菜，利用焖煮时间炒下一道。');
  parallel.textContent = parallelParts.join(' ');
  appendPrepPhase(elements.prep, 4, '利用等待时间清洁与排台', parallel);

  renderCooking(optimized);
}

function renderCooking(optimized) {
  elements.cook.replaceChildren();
  optimized.cooking.forEach((recipe) => {
    const card = createElement('article', 'kp-cook-card');
    card.append(createElement('span', 'kp-cook-number', String(recipe.order)));
    const body = createElement('div');
    const title = createElement('h4');
    const link = createElement('a', 'kp-recipe-title', `${recipe.title} × ${recipe.servings}`);
    link.href = recipe.url;
    title.append(link);
    body.append(title);
    if (recipe.cookNote) body.append(createElement('p', 'kp-cook-note', recipe.cookNote));
    if (recipe.servings > 1) {
      body.append(createElement('p', 'kp-ingredient-source', `已选 ${recipe.servings} 份；下列为单份 / 单锅火候。肉类不要堆满锅，分批数量以完整菜谱的批量提示为准。`));
    }
    const steps = createElement('ol');
    recipe.cookTasks.forEach((task) => steps.append(createElement('li', '', task.replace(/\*\*/g, ''))));
    body.append(steps);
    card.append(body);
    elements.cook.append(card);
  });
}

function renderSummary(plan) {
  elements.summary.replaceChildren();
  plan.recipes.forEach((recipe) => {
    elements.summary.append(createElement('span', 'kp-summary-chip', `${recipe.title} × ${recipe.servings}`));
  });
  elements.summary.append(createElement('span', 'kp-summary-chip', `合计 ${plan.totalServings} 份`));
}

function renderPlan() {
  lastPlan = aggregatePlan({ recipes: allRecipes, ingredientCatalog, selections, retailer });
  const hasSelection = lastPlan.recipes.length > 0;
  elements.empty.hidden = hasSelection;
  elements.results.hidden = !hasSelection;
  elements.openInvite.disabled = !hasSelection;
  document.querySelectorAll('[data-retailer]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.retailer === retailer);
  });
  if (!hasSelection) return;
  renderSummary(lastPlan);
  renderShopping(lastPlan);
  renderPrep(lastPlan);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    setAlert('已复制到剪贴板。');
    return true;
  } catch {
    setAlert('浏览器不允许自动复制，请手动选择文本。', 'error');
    return false;
  }
}

function shoppingListText() {
  const lines = [`采购清单 · ${retailer === 'walmart' ? 'Walmart 推荐' : '普通品类'}`];
  lastPlan.purchases.map(adjustedPurchase).filter((entry) => entry.quantity > 0).forEach((entry) => {
    const purchase = entry.item.purchase;
    const text = purchase.kind === 'package'
      ? `${purchase.label} × ${entry.quantity} ${entry.unitLabel}${purchase.pack ? `（${purchase.pack}）` : ''}`
      : `${purchase.label} ${entry.displayQuantity}`;
    lines.push(`- ${text}`);
  });
  if (lines.length === 1) lines.push('- 无需购买');
  return lines.join('\n');
}

async function loadInvite() {
  setAlert('正在读取私密菜单…');
  try {
    const response = await fetch(`${apiBase()}/kitchen?action=resolve-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ token: inviteToken }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'invite_unavailable');
    inviteData = data.invite;
    allowedSlugs = new Set(inviteData.recipes.map((recipe) => recipe.slug));
    elements.title.textContent = inviteData.title;
    elements.modeLabel.textContent = '受邀点餐';
    elements.lead.textContent = '选好想吃的菜和份数，检查无误后再提交给邀请人。';
    elements.privacy.textContent = '这份点单默认私密，只有邀请人可以查看。';
    elements.orderForm.hidden = false;
    document.body.classList.add('kp-invite-mode');
    setAlert('');
    renderRecipes();
    renderPlan();
  } catch {
    allowedSlugs = new Set();
    elements.title.textContent = '邀请链接不可用';
    elements.lead.textContent = '链接可能已过期、关闭或输入不完整。';
    elements.orderForm.hidden = true;
    setAlert('无法读取这份私密菜单，请向邀请人索取新的链接。', 'error');
    renderRecipes();
  }
}

async function submitOrder(event) {
  event.preventDefault();
  if (!inviteData || !lastPlan.recipes.length) {
    setAlert('请先至少选择一道菜。', 'error');
    return;
  }
  const guestName = document.getElementById('kp-guest-name').value.trim();
  const mealTime = document.getElementById('kp-meal-time').value.trim();
  const note = document.getElementById('kp-order-note').value.trim();
  if (!guestName) {
    setAlert('请填写称呼。', 'error');
    return;
  }
  const review = lastPlan.recipes.map((recipe) => `${recipe.title} × ${recipe.servings}`).join('、');
  if (!window.confirm(`确认提交：${review}？\n提交后只有邀请人可以查看。`)) return;

  const submitButton = elements.orderForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await fetch(`${apiBase()}/kitchen?action=submit-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        token: inviteToken,
        guestName,
        mealTime,
        note,
        clientRequestId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        items: lastPlan.recipes.map((recipe) => ({ slug: recipe.slug, servings: recipe.servings })),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'submit_failed');
    selections = {};
    elements.orderForm.reset();
    renderRecipes();
    renderPlan();
    setAlert(`点单已提交，订单号 ${data.order.id}。邀请人现在可以在后台看到。`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    setAlert(`提交失败：${error.message === 'invite_expired' ? '邀请已经过期' : '请稍后重试'}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function waitForSiteAuth() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (window.SiteAuth) return window.SiteAuth;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

async function adminFetch(action, options = {}) {
  const auth = await waitForSiteAuth();
  if (!auth) throw new Error('auth_unavailable');
  const response = await auth.authedFetch(`${auth.API_BASE}/kitchen?action=${encodeURIComponent(action)}`, options);
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'request_failed');
  return data;
}

async function privateOrderingAvailable() {
  try {
    const response = await fetch(`${apiBase()}/kitchen?action=capabilities`, {
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data && data.ok === true && data.privateOrdering === true;
  } catch {
    return false;
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '未设置';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}

function renderOwnerInvites(invites) {
  elements.inviteList.replaceChildren();
  if (!invites.length) {
    elements.inviteList.append(createElement('p', 'kp-owner-empty', '还没有邀请。先选菜，再生成私密链接。'));
    return;
  }
  invites.forEach((invite) => {
    const card = createElement('div', 'kp-owner-card');
    card.append(createElement('h4', '', invite.title));
    card.append(createElement('p', '', `${invite.recipeCount} 道可选菜 · ${invite.active ? '有效' : '已关闭'} · ${formatDate(invite.expiresAt)} 失效`));
    if (invite.active) {
      const close = createElement('button', 'kp-btn kp-btn-quiet', '关闭邀请');
      close.type = 'button';
      close.addEventListener('click', async () => {
        if (!window.confirm(`确认关闭“${invite.title}”？已经拿到链接的人将无法继续提交。`)) return;
        close.disabled = true;
        try {
          await adminFetch('close-invite', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId: invite.id }),
          });
          await loadOwnerData();
        } catch { setAlert('关闭邀请失败，请稍后重试。', 'error'); }
      });
      card.append(close);
    }
    elements.inviteList.append(card);
  });
}

function selectionFromOrders(orders) {
  const combined = {};
  orders.forEach((order) => order.items.forEach((item) => {
    combined[item.slug] = (combined[item.slug] || 0) + item.servings;
  }));
  return normalizeSelections(combined, recipeMap);
}

function loadOrdersIntoPlan(orders) {
  selections = selectionFromOrders(orders);
  saveLocalState();
  renderRecipes();
  renderPlan();
  document.getElementById('kp-plan').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderOwnerOrders(orders) {
  elements.orderList.replaceChildren();
  const pending = orders.filter((order) => order.status === 'pending');
  if (pending.length > 1) {
    const merge = createElement('button', 'kp-btn kp-btn-primary', `合并 ${pending.length} 个待处理订单`);
    merge.type = 'button';
    merge.addEventListener('click', () => loadOrdersIntoPlan(pending));
    elements.orderList.append(merge);
  }
  if (!orders.length) {
    elements.orderList.append(createElement('p', 'kp-owner-empty', '还没有收到点单。'));
    return;
  }
  orders.forEach((order) => {
    const card = createElement('div', 'kp-owner-card');
    card.append(createElement('h4', '', `${order.guestName} · ${order.status === 'pending' ? '待处理' : order.status === 'completed' ? '已完成' : '已取消'}`));
    const dishes = order.items.map((item) => `${item.title} × ${item.servings}`).join('、');
    card.append(createElement('p', '', dishes));
    card.append(createElement('p', '', `${order.mealTime || '未填写用餐时间'} · ${formatDate(order.createdAt)}`));
    if (order.note) card.append(createElement('p', '', `备注：${order.note}`));
    const load = createElement('button', 'kp-btn kp-btn-quiet', '载入采购计划');
    load.type = 'button';
    load.addEventListener('click', () => loadOrdersIntoPlan([order]));
    card.append(load);
    if (order.status === 'pending') {
      const complete = createElement('button', 'kp-btn kp-btn-primary', '标记完成');
      complete.type = 'button';
      complete.addEventListener('click', async () => {
        complete.disabled = true;
        try {
          await adminFetch('update-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, status: 'completed' }),
          });
          await loadOwnerData();
        } catch { setAlert('更新订单失败，请稍后重试。', 'error'); }
      });
      card.append(document.createTextNode(' '), complete);
    }
    elements.orderList.append(card);
  });
}

async function loadOwnerData() {
  try {
    const [inviteResult, orderResult] = await Promise.all([
      adminFetch('list-invites'),
      adminFetch('list-orders'),
    ]);
    ownerOrders = orderResult.orders || [];
    renderOwnerInvites(inviteResult.invites || []);
    renderOwnerOrders(ownerOrders);
  } catch (error) {
    elements.inviteList.replaceChildren(createElement('p', 'kp-owner-empty', '后台暂时无法读取。'));
    elements.orderList.replaceChildren(createElement('p', 'kp-owner-empty', '后台暂时无法读取。'));
    if (error.message !== 'login_required' && error.message !== 'forbidden') setAlert('点餐后台读取失败。', 'error');
  }
}

async function initOwner() {
  if (mode === 'invite') return;
  const auth = await waitForSiteAuth();
  if (!auth) return;
  const showIfOwner = (user) => {
    const sequence = ++ownerCheckSequence;
    const isOwner = Boolean(user && user.isAdmin);
    if (!isOwner) {
      elements.owner.hidden = true;
      return;
    }
    privateOrderingAvailable().then((available) => {
      if (sequence !== ownerCheckSequence) return;
      elements.owner.hidden = !available;
      if (available) loadOwnerData();
      else setAlert('自用备餐仍可使用；私密点餐后台正在等待存储配额恢复。', 'error');
    });
  };
  showIfOwner(auth.getUser());
  auth.onChange(showIfOwner);
}

function defaultExpiryValue() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

async function createInvite(event) {
  event.preventDefault();
  if (event.submitter && event.submitter.value === 'cancel') {
    elements.inviteDialog.close();
    return;
  }
  const chosen = selectedRecipeEntries();
  if (!chosen.length) {
    setAlert('请先选择至少一道可点的菜。', 'error');
    elements.inviteDialog.close();
    return;
  }
  const title = elements.inviteTitle.value.trim();
  const expiresAt = new Date(elements.inviteExpiry.value).getTime();
  const createButton = document.getElementById('kp-create-invite');
  createButton.disabled = true;
  try {
    const data = await adminFetch('create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        expiresAt,
        recipes: chosen.map(({ recipe }) => ({ slug: recipe.slug, title: recipe.title })),
      }),
    });
    const link = `${location.origin}${location.pathname}#invite=${encodeURIComponent(data.invite.token)}`;
    elements.inviteLink.value = link;
    elements.createdLink.hidden = false;
    setAlert('私密邀请已创建。令牌不会出现在公开页面或搜索结果中。');
    await loadOwnerData();
  } catch (error) {
    setAlert(`邀请创建失败：${error.message === 'forbidden' ? '当前账号没有站主权限' : '请稍后重试'}`, 'error');
  } finally {
    createButton.disabled = false;
  }
}

elements.search.addEventListener('input', renderRecipes);
elements.orderForm.addEventListener('submit', submitOrder);
elements.copyList.addEventListener('click', () => copyText(shoppingListText()));
elements.printList.addEventListener('click', () => window.print());
elements.restorePurchases.addEventListener('click', () => {
  adjustments[retailer] = {};
  saveLocalState();
  renderShopping(lastPlan);
  setAlert('已恢复当前采购模式的推荐数量。');
});
elements.reset.addEventListener('click', () => {
  if (Object.keys(selections).length && !window.confirm('清空当前选菜和份数？')) return;
  selections = {};
  adjustments = { general: {}, walmart: {} };
  saveLocalState();
  renderRecipes();
  renderPlan();
});

document.querySelectorAll('[data-retailer]').forEach((button) => {
  button.addEventListener('click', () => {
    retailer = button.dataset.retailer === 'walmart' ? 'walmart' : 'general';
    saveLocalState();
    renderPlan();
  });
});

elements.openInvite.addEventListener('click', () => {
  const chosen = selectedRecipeEntries();
  if (!chosen.length) {
    setAlert('请先选择要开放点餐的菜。', 'error');
    return;
  }
  elements.inviteSelection.textContent = `可点：${chosen.map(({ recipe }) => recipe.title).join('、')}`;
  elements.inviteExpiry.value = defaultExpiryValue();
  elements.createdLink.hidden = true;
  elements.inviteDialog.showModal();
});
elements.inviteForm.addEventListener('submit', createInvite);
elements.copyInvite.addEventListener('click', () => copyText(elements.inviteLink.value));
elements.refreshOrders.addEventListener('click', loadOwnerData);

if (catalogErrors.length) {
  setAlert(`菜谱数据校验失败：${catalogErrors[0]}`, 'error');
} else {
  loadLocalState();
  renderRecipes();
  renderPlan();
  if (mode === 'invite') loadInvite();
  else initOwner();
}

app.dataset.ready = 'true';
