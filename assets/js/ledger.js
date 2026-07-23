/* 记账 ledger —— 纯本地、跨时区、可处理垫付/报销的记账工具。
 * 铁律：
 *  1) 数据只进 localStorage(tool.ledger.v1)，永不上传、不入 cloud-sync。备份靠手动导出文件。
 *  2) 每笔存 ts(ms-epoch) + tz(录入时的 IANA 时区)。显示与统计一律按「这笔自己的时区」算，
 *     禁止 new Date(ts).getHours()/getDate() 这种「查看者本地时间」取值——全走 partsInTz(ts, tz)。
 *  3) amount 恒为 GROSS 正数；NET(实际花销)一律派生。垫付未收齐时按「我的份额」算，结清才转亏损。
 *  4) 多币种默认分开统计、不换算；汇率换算是「手动 + 显式开关」，绝不自动。
 */
(function () {
  'use strict';

  // ============ 常量 ============
  var STORE_KEY = 'tool.ledger.v1';

  var CUR = {
    CNY: { sym: '¥', code: 'CNY', zh: '人民币' },
    USD: { sym: '$', code: 'USD', zh: '美元' }
  };

  var CITIES = [
    { zh: '北京 / 上海', tz: 'Asia/Shanghai' },
    { zh: '乌鲁木齐', tz: 'Asia/Urumqi' },
    { zh: '香港', tz: 'Asia/Hong_Kong' },
    { zh: '台北', tz: 'Asia/Taipei' },
    { zh: '东京', tz: 'Asia/Tokyo' },
    { zh: '首尔', tz: 'Asia/Seoul' },
    { zh: '新加坡', tz: 'Asia/Singapore' },
    { zh: '曼谷', tz: 'Asia/Bangkok' },
    { zh: '印度', tz: 'Asia/Kolkata' },
    { zh: '迪拜', tz: 'Asia/Dubai' },
    { zh: '莫斯科', tz: 'Europe/Moscow' },
    { zh: '伦敦', tz: 'Europe/London' },
    { zh: '巴黎 / 柏林', tz: 'Europe/Paris' },
    { zh: '纽约 (美东)', tz: 'America/New_York' },
    { zh: '芝加哥 (美中)', tz: 'America/Chicago' },
    { zh: '丹佛 (美山)', tz: 'America/Denver' },
    { zh: '洛杉矶 (美西)', tz: 'America/Los_Angeles' },
    { zh: '多伦多', tz: 'America/Toronto' },
    { zh: '温哥华', tz: 'America/Vancouver' },
    { zh: '圣保罗', tz: 'America/Sao_Paulo' },
    { zh: '悉尼', tz: 'Australia/Sydney' },
    { zh: '奥克兰', tz: 'Pacific/Auckland' }
  ];
  var TZ_SHORT = {};
  CITIES.forEach(function (c) { TZ_SHORT[c.tz] = c.zh.split(/[ /(]/)[0]; });

  function defaultCategories() {
    return [
      { id: 'c-food', emoji: '[[zi:bowl]]', name: '餐饮', type: 'expense', order: 0 },
      { id: 'c-life', emoji: '[[zi:cart]]', name: '生活', type: 'expense', order: 1 },
      { id: 'c-trans', emoji: '[[zi:train]]', name: '交通', type: 'expense', order: 2 },
      { id: 'c-shop', emoji: '[[zi:bag]]', name: '购物', type: 'expense', order: 3 },
      { id: 'c-home', emoji: '[[zi:home]]', name: '居住', type: 'expense', order: 4 },
      { id: 'c-fun', emoji: '[[zi:gamepad]]', name: '娱乐', type: 'expense', order: 5 },
      { id: 'c-med', emoji: '[[zi:medical]]', name: '医疗', type: 'expense', order: 6 },
      { id: 'c-study', emoji: '[[zi:book]]', name: '学习', type: 'expense', order: 7 },
      { id: 'c-social', emoji: '[[zi:gift]]', name: '人情', type: 'expense', order: 8 },
      { id: 'c-other-e', emoji: '[[zi:receipt]]', name: '其他', type: 'expense', order: 9 },
      { id: 'c-salary', emoji: '[[zi:wallet]]', name: '工资', type: 'income', order: 0 },
      { id: 'c-parttime', emoji: '[[zi:briefcase]]', name: '兼职', type: 'income', order: 1 },
      { id: 'c-reimb', emoji: '[[zi:receipt]]', name: '报销', type: 'income', order: 2 },
      { id: 'c-gift', emoji: '[[zi:gift]]', name: '红包', type: 'income', order: 3 },
      { id: 'c-interest', emoji: '[[zi:chart]]', name: '利息', type: 'income', order: 4 },
      { id: 'c-other-i', emoji: '[[zi:sparkle]]', name: '其他', type: 'income', order: 5 }
    ];
  }
  function defaultAccounts() {
    return [{ id: 'a-cash', name: '钱包', emoji: '[[zi:wallet]]', order: 0 }];
  }
  var CATEGORY_ICON_BY_NAME = {
    '餐饮': '[[zi:bowl]]', '生活': '[[zi:cart]]', '交通': '[[zi:train]]',
    '购物': '[[zi:bag]]', '居住': '[[zi:home]]', '娱乐': '[[zi:gamepad]]',
    '医疗': '[[zi:medical]]', '学习': '[[zi:book]]', '人情': '[[zi:gift]]',
    '工资': '[[zi:wallet]]', '兼职': '[[zi:briefcase]]', '报销': '[[zi:receipt]]',
    '红包': '[[zi:gift]]', '利息': '[[zi:chart]]', '其他': '[[zi:receipt]]'
  };
  function normalizedIcon(value, fallback) {
    return typeof value === 'string' && /^\[\[zi:[a-z0-9-]+(?::[a-z0-9-]+)?\]\]$/.test(value)
      ? value : fallback;
  }

  function defaultState() {
    return {
      version: 2,
      transactions: [],
      categories: defaultCategories(),
      accounts: defaultAccounts(),
      recurring: [],
      settings: {
        baseCurrency: 'CNY',
        period: 'month',
        customStart: null,
        customEnd: null,
        weekStartsOn: 1,
        monthlyBudget: null,
        budgetWarnPct: 0.8,
        showZoneBadges: true,
        fxRate: 7.2,        // 1 USD = ? CNY（用户手填）
        fxMerge: false      // 是否把其他币种按 fxRate 折算进显示币种合计（手动开关）
      }
    };
  }

  // ============ 持久化 ============
  var state = defaultState();

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { raw = null; }
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        state.version = d.version || 1;
        if (Array.isArray(d.transactions)) state.transactions = d.transactions;
        if (Array.isArray(d.categories) && d.categories.length) state.categories = d.categories;
        if (Array.isArray(d.accounts) && d.accounts.length) state.accounts = d.accounts;
        if (Array.isArray(d.recurring)) state.recurring = d.recurring;
        if (d.settings && typeof d.settings === 'object') {
          Object.keys(state.settings).forEach(function (k) {
            if (d.settings[k] !== undefined) state.settings[k] = d.settings[k];
          });
        }
      }
    } catch (e) { /* 损坏的存档忽略 */ }
    migrate();
  }

  function migrate() {
    if (!Array.isArray(state.accounts) || !state.accounts.length) state.accounts = defaultAccounts();
    if (!Array.isArray(state.recurring)) state.recurring = [];
    state.categories.forEach(function (c) {
      var fallback = CATEGORY_ICON_BY_NAME[c.name] || (c.type === 'income' ? '[[zi:sparkle]]' : '[[zi:receipt]]');
      c.emoji = normalizedIcon(c.emoji, fallback);
    });
    state.accounts.forEach(function (a) { a.emoji = normalizedIcon(a.emoji, '[[zi:wallet]]'); });
    var defAcc = state.accounts[0].id;
    state.transactions.forEach(function (t) {
      if (!t.currency) t.currency = 'CNY';
      if (!t.tz) t.tz = currentTz();
      if (t.createdAt == null) t.createdAt = t.ts;
      if (t.updatedAt == null) t.updatedAt = t.ts;
      if (t.settlement === undefined) t.settlement = null;
      if (t.type !== 'transfer' && !t.accountId) t.accountId = defAcc;
      if (t.settlement) {
        if (!Array.isArray(t.settlement.reimbursements)) t.settlement.reimbursements = [];
        if (t.settlement.closed === undefined) t.settlement.closed = false;
        if (t.settlement.closedNet === undefined) t.settlement.closedNet = null;
      }
    });
    state.version = 2;
  }

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        version: state.version,
        transactions: state.transactions,
        categories: state.categories,
        accounts: state.accounts,
        recurring: state.recurring,
        settings: state.settings
      }));
      try { window.dispatchEvent(new CustomEvent('ledger:changed')); } catch (e2) {}
    } catch (e) {
      if (e && e.name === 'QuotaExceededError') {
        alert('本地存储空间已满，最近这笔可能没存上。可在「备份 / 导入」导出后清理。');
      }
    }
  }

  // 给云同步模块（ledger-sync.js）用：取快照 / 按笔合并云端拉回的数据 / 重渲染。
  function snapshot() {
    return JSON.parse(JSON.stringify({
      version: state.version, transactions: state.transactions,
      categories: state.categories, accounts: state.accounts,
      recurring: state.recurring, settings: state.settings
    }));
  }
  function mergeSnapshot(inc) {
    if (!inc || typeof inc !== 'object') return;
    // 交易：按 id 取并集，同一笔以 updatedAt 较新的为准（决策：按笔合并，尽量不丢）
    var byId = {};
    state.transactions.forEach(function (t) { byId[t.id] = t; });
    (inc.transactions || []).forEach(function (t) {
      if (!t || !t.id) return;
      var ex = byId[t.id];
      if (!ex || num(t.updatedAt) >= num(ex.updatedAt)) byId[t.id] = t;
    });
    state.transactions = Object.keys(byId).map(function (k) { return byId[k]; });
    // 类目 / 账户 / 周期：按 id 并集，冲突保留本机（避免回退本地改名/排序）
    function unionLocal(localArr, incArr) {
      var seen = {}; localArr.forEach(function (x) { seen[x.id] = true; });
      (incArr || []).forEach(function (x) { if (x && x.id && !seen[x.id]) { localArr.push(x); seen[x.id] = true; } });
      return localArr;
    }
    state.categories = unionLocal(state.categories, inc.categories);
    state.accounts = unionLocal(state.accounts, inc.accounts);
    state.recurring = unionLocal(state.recurring, inc.recurring);
    // settings 保持本机（预算/汇率/视图各设备独立，不跨设备覆盖）
    migrate(); persist(); render();
  }

  // ============ 基础工具 ============
  function $(id) { return document.getElementById(id); }
  function uuid(p) { return (p || 't') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function num(v) { var n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function curSym(cur) { return (CUR[cur] || CUR.CNY).sym; }
  function fmtMoney(n, cur) {
    if (!Number.isFinite(n)) return '—';
    var sign = n < 0 ? '-' : '';
    var a = Math.abs(n);
    return sign + curSym(cur) + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtAxis(n, cur) {
    var s = curSym(cur);
    if (n >= 1e6) return s + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return s + (n / 1e3).toFixed(1) + 'k';
    return s + Math.round(n);
  }

  // ============ 手动汇率换算（绝不自动）============
  function convert(amt, from, to) {
    if (from === to) return amt;
    var r = num(state.settings.fxRate) || 1;
    if (from === 'USD' && to === 'CNY') return amt * r;
    if (from === 'CNY' && to === 'USD') return amt / r;
    return amt;
  }
  // 把某笔(currency 的 amt)折进当前显示币种：folded? 转换 : 同币种返回, 异币种返回 null(被排除)
  function amtInView(amt, cur) {
    var view = state.settings.baseCurrency;
    if (cur === view) return amt;
    if (state.settings.fxMerge) return convert(amt, cur, view);
    return null;
  }

  // ============ 时区核心（拷自 assets/js/games/time.js）============
  function currentTz() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'; }
    catch (e) { return 'Asia/Shanghai'; }
  }
  function getOffsetMinutes(tz, utcMs) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = {};
    fmt.formatToParts(new Date(utcMs)).forEach(function (p) { parts[p.type] = p.value; });
    var asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, (+parts.hour) % 24, +parts.minute, +parts.second);
    return Math.round((asUtc - utcMs) / 60000);
  }
  function fmtOffset(min) {
    var sign = min >= 0 ? '+' : '-';
    var abs = Math.abs(min);
    var h = Math.floor(abs / 60), m = abs % 60;
    return 'UTC' + sign + h + (m ? ':' + pad2(m) : '');
  }
  function partsInTz(ts, tz) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
    var parts = {};
    fmt.formatToParts(new Date(ts)).forEach(function (p) { parts[p.type] = p.value; });
    var y = +parts.year, m = +parts.month, d = +parts.day;
    var wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return { y: y, m: m, d: d, h: (+parts.hour) % 24, min: +parts.minute, wd: wd };
  }
  function wallToUtc(y, m, d, h, min, tz) {
    var guess = Date.UTC(y, m - 1, d, h, min);
    var off = getOffsetMinutes(tz, guess);
    return guess - off * 60000;
  }
  function offsetLabel(ts, tz) { return fmtOffset(getOffsetMinutes(tz, ts)); }
  function tzShort(tz) { return TZ_SHORT[tz] || tz.split('/').pop().replace(/_/g, ' '); }

  // ============ 日期桶 ============
  var WD_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function dateKey(ts, tz) { var p = partsInTz(ts, tz); return p.y + '-' + pad2(p.m) + '-' + pad2(p.d); }
  function monthKey(ts, tz) { var p = partsInTz(ts, tz); return p.y + '-' + pad2(p.m); }
  function yearKey(ts, tz) { return '' + partsInTz(ts, tz).y; }
  function isoFromUTCms(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function weekRange(y, m, d, weekStartsOn) {
    var base = Date.UTC(y, m - 1, d);
    var dow = new Date(base).getUTCDay();
    var diff = (dow - weekStartsOn + 7) % 7;
    var startMs = base - diff * 86400000;
    return { start: isoFromUTCms(startMs), end: isoFromUTCms(startMs + 6 * 86400000) };
  }
  function addDays(iso, n) {
    var p = iso.split('-').map(Number);
    return isoFromUTCms(Date.UTC(p[0], p[1] - 1, p[2]) + n * 86400000);
  }
  function weekdayOf(iso) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  function nowRef() {
    var tz = currentTz();
    var p = partsInTz(Date.now(), tz);
    return {
      tz: tz,
      today: p.y + '-' + pad2(p.m) + '-' + pad2(p.d),
      month: p.y + '-' + pad2(p.m),
      year: '' + p.y,
      week: weekRange(p.y, p.m, p.d, state.settings.weekStartsOn)
    };
  }

  function inPeriod(t, ref) {
    var period = state.settings.period;
    var dk = dateKey(t.ts, t.tz);
    if (period === 'today') return dk === ref.today;
    if (period === 'week') return dk >= ref.week.start && dk <= ref.week.end;
    if (period === 'month') return monthKey(t.ts, t.tz) === ref.month;
    if (period === 'year') return yearKey(t.ts, t.tz) === ref.year;
    if (period === 'custom') {
      var s = state.settings.customStart, e = state.settings.customEnd;
      if (!s || !e) return true;
      return dk >= s && dk <= e;
    }
    return true;
  }

  // ============ 结算（垫付/代收）派生 ============
  function received(t) {
    if (!t.settlement) return 0;
    return (t.settlement.reimbursements || []).reduce(function (s, r) { return s + num(r.amount); }, 0);
  }
  function outstanding(t) {
    if (!t.settlement) return 0;
    return Math.max(0, num(t.settlement.expected) - received(t));
  }
  function shortfall(t) {
    if (!t.settlement || !t.settlement.closed) return 0;
    return Math.max(0, num(t.settlement.expected) - received(t));
  }
  function actualMag(t) {
    if (t.type === 'transfer') return 0;
    if (!t.settlement) return num(t.amount);
    if (t.type === 'expense') {
      return t.settlement.closed ? (num(t.settlement.myShare) + shortfall(t)) : num(t.settlement.myShare);
    }
    return num(t.settlement.myShare);
  }
  function grossMag(t) { return t.type === 'transfer' ? 0 : num(t.amount); }
  function magFor(t, basis) { return basis === 'gross' ? grossMag(t) : actualMag(t); }
  function signed(t, basis) {
    if (t.type === 'transfer') return 0;
    return (t.type === 'income' ? 1 : -1) * magFor(t, basis);
  }

  // ============ 账户余额（按现金口径）============
  function accById(id) {
    for (var i = 0; i < state.accounts.length; i++) if (state.accounts[i].id === id) return state.accounts[i];
    return null;
  }
  // 单笔对「自己账户」的现金影响（本币种，带符号）。垫付的回款视作回到原账户。
  function cashEffect(t) {
    if (t.type === 'transfer') return 0;
    var net = num(t.amount) - received(t); // 收入：到手净额；支出：净流出绝对值
    return (t.type === 'income' ? 1 : -1) * net;
  }
  function accountBalance(accId) {
    var sum = 0;
    state.transactions.forEach(function (t) {
      if (t.type === 'transfer') {
        if (t.toAccountId === accId) { var a = amtInView(num(t.amount), t.currency); if (a != null) sum += a; }
        if (t.fromAccountId === accId) { var b = amtInView(num(t.amount), t.currency); if (b != null) sum -= b; }
      } else if (t.accountId === accId) {
        var v = amtInView(cashEffect(t), t.currency); if (v != null) sum += v;
      }
    });
    return sum;
  }
  function totalBalance() {
    var sum = 0;
    state.transactions.forEach(function (t) {
      if (t.type === 'transfer') return; // 转账在账户间净为 0，不影响总额
      var v = amtInView(cashEffect(t), t.currency); if (v != null) sum += v;
    });
    return sum;
  }

  // ============ 聚合 ============
  function catById(id) {
    for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === id) return state.categories[i];
    return null;
  }
  function periodTotals(txns, basis) {
    var income = 0, expense = 0;
    txns.forEach(function (t) {
      if (t.type === 'transfer') return;
      var v = amtInView(magFor(t, basis), t.currency);
      if (v == null) return;
      if (t.type === 'income') income += v; else expense += v;
    });
    return { income: income, expense: expense, net: income - expense };
  }
  function otherCurrencyExpense(txns, basis) {
    var view = state.settings.baseCurrency, map = {};
    txns.forEach(function (t) {
      if (t.type !== 'expense' || t.currency === view) return;
      map[t.currency] = (map[t.currency] || 0) + magFor(t, basis);
    });
    return map;
  }
  function totalOutstanding() {
    var view = state.settings.baseCurrency, sum = 0;
    state.transactions.forEach(function (t) {
      if (t.type === 'expense' && t.settlement && !t.settlement.closed) {
        var v = amtInView(outstanding(t), t.currency); if (v != null) sum += v;
      }
    });
    return sum;
  }

  // ============ 周期性账 ============
  function dueOn(r, iso) {
    if (r.freq === 'daily') return true;
    if (r.freq === 'weekly') return weekdayOf(iso) === +r.day;
    var p = iso.split('-').map(Number); // monthly
    var clampDay = Math.min(+r.day, daysInMonth(p[0], p[1]));
    return p[2] === clampDay;
  }
  function makeTxnFromRule(r, iso) {
    var p = iso.split('-').map(Number);
    var tz = currentTz();
    return {
      id: uuid('t'), type: r.type, amount: num(r.amount), currency: r.currency || 'CNY',
      ts: wallToUtc(p[0], p[1], p[2], 9, 0, tz), tz: tz,
      categoryId: r.categoryId || null, accountId: r.accountId || state.accounts[0].id,
      note: r.note || '', merchant: '', method: '', tags: [],
      createdAt: Date.now(), updatedAt: Date.now(), settlement: null, recurringId: r.id
    };
  }
  function runRecurring() {
    var ref = nowRef(), today = ref.today, changed = false;
    state.recurring.forEach(function (r) {
      if (!r.active || !r.startDate) return;
      var cursor = r.lastRun ? addDays(r.lastRun, 1) : r.startDate;
      var last = r.lastRun, guard = 0;
      while (cursor <= today && guard < 400) {
        if (cursor >= r.startDate && dueOn(r, cursor)) { state.transactions.push(makeTxnFromRule(r, cursor)); changed = true; }
        last = cursor; cursor = addDays(cursor, 1); guard++;
      }
      if (last) r.lastRun = last;
    });
    if (changed) persist();
  }

  // ============ UI 瞬时状态 ============
  var ui = {
    basis: 'net', chart: 'burn', search: '', filterType: 'all',
    editingId: null, entryType: 'expense', entryCur: 'CNY', selectedCat: null,
    entryAcc: null, settleTxnId: null, catManageType: 'expense', lastDeleted: null
  };
  var toastTimer = null;

  // ============ 渲染 ============
  function render() {
    var ref = nowRef();
    var periodTxns = state.transactions.filter(function (t) { return inPeriod(t, ref); });
    renderSummary(periodTxns, ref);
    renderAccounts();
    renderBudget(ref);
    renderChart(ref);
    renderList(periodTxns, ref);
    syncControls();
  }

  function periodLabel() {
    return { today: '今日', week: '本周', month: '本月', year: '今年', custom: '区间' }[state.settings.period] || '本月';
  }

  function renderSummary(txns, ref) {
    var cur = state.settings.baseCurrency;
    var t = periodTotals(txns, ui.basis);
    var pl = periodLabel();
    var cards = [
      { label: pl + '支出', val: '-' + fmtMoney(t.expense, cur).replace('-', ''), cls: 'lg-c-exp' },
      { label: pl + '收入', val: '+' + fmtMoney(t.income, cur), cls: 'lg-c-inc' },
      { label: pl + '结余', val: (t.net >= 0 ? '+' : '') + fmtMoney(t.net, cur), cls: t.net >= 0 ? 'lg-c-inc' : 'lg-c-exp' },
      { label: '累计余额', val: fmtMoney(totalBalance(), cur), cls: 'lg-c-neu' }
    ];
    var out = '<div class="lg-cur-toggle-hint">' + pl + '统计 · 单位 ' + curSym(cur) + (state.settings.fxMerge ? '（已折算合并）' : '') + '</div>';
    out += '<div class="lg-cards">';
    cards.forEach(function (c) {
      out += '<div class="lg-card"><div class="lg-card-label">' + c.label + '</div><div class="lg-card-val ' + c.cls + '">' + escapeHtml(c.val) + '</div></div>';
    });
    out += '</div>';

    var notes = [];
    if (!state.settings.fxMerge) {
      var other = otherCurrencyExpense(txns, ui.basis);
      var ks = Object.keys(other);
      if (ks.length) notes.push('另有 ' + ks.map(function (k) { return fmtMoney(other[k], k); }).join(' · ') +
        ' 未换算 <button type="button" class="lg-link-btn" id="lg-fx-merge-on">折算合并</button>');
    } else {
      notes.push('已按 1$=¥' + (num(state.settings.fxRate) || '?') + ' 折算 <button type="button" class="lg-link-btn" id="lg-fx-merge-off">分开看</button>');
    }
    var oout = totalOutstanding();
    if (oout > 0) notes.push('待收回 <b>' + escapeHtml(fmtMoney(oout, cur)) + '</b>');
    if (notes.length) out += '<div class="lg-foot-note">' + notes.join('　|　') + '</div>';
    $('lg-summary').innerHTML = out;
    var on = $('lg-fx-merge-on'), off = $('lg-fx-merge-off');
    if (on) on.onclick = function () { state.settings.fxMerge = true; persist(); render(); };
    if (off) off.onclick = function () { state.settings.fxMerge = false; persist(); render(); };
  }

  function renderAccounts() {
    var box = $('lg-accounts');
    if (!box) return;
    if (state.accounts.length <= 1) { box.hidden = true; box.innerHTML = ''; return; }
    var cur = state.settings.baseCurrency;
    box.hidden = false;
    box.innerHTML = state.accounts.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).map(function (a) {
      var bal = accountBalance(a.id);
      return '<div class="lg-acc-chip"><span>' + escapeHtml(a.emoji || '[[zi:wallet]]') + ' ' + escapeHtml(a.name) + '</span>' +
        '<b class="' + (bal < 0 ? 'lg-c-exp' : '') + '">' + escapeHtml(fmtMoney(bal, cur)) + '</b></div>';
    }).join('');
  }

  function currentBudget() {
    var b = state.settings.monthlyBudget;
    return (b != null && b !== '' && num(b) > 0) ? num(b) : null;
  }
  function monthExpenseFor(ref, predicate) {
    var sum = 0;
    state.transactions.forEach(function (t) {
      if (t.type !== 'expense' || monthKey(t.ts, t.tz) !== ref.month) return;
      if (predicate && !predicate(t)) return;
      var v = amtInView(actualMag(t), t.currency); if (v != null) sum += v;
    });
    return sum;
  }
  function budgetBar(label, spent, budget, cur) {
    var pct = budget > 0 ? spent / budget : 0;
    var over = pct >= 1, warn = pct >= num(state.settings.budgetWarnPct);
    var cls = over ? 'lg-bar-over' : (warn ? 'lg-bar-warn' : '');
    var w = Math.min(100, pct * 100);
    return '<div class="lg-budget-item"><div class="lg-budget-top"><span>' + escapeHtml(label) + '</span><span>' +
      escapeHtml(fmtMoney(spent, cur)) + ' / ' + escapeHtml(fmtMoney(budget, cur)) +
      ' <b class="' + (over ? 'lg-c-exp' : '') + '">(' + Math.round(pct * 100) + '%)</b></span></div>' +
      '<div class="lg-bar"><div class="lg-bar-fill ' + cls + '" style="width:' + w.toFixed(1) + '%"></div></div></div>';
  }
  function renderBudget(ref) {
    var box = $('lg-budget'), cur = state.settings.baseCurrency;
    var overall = currentBudget();
    var catBudgets = state.categories.filter(function (c) { return c.type === 'expense' && num(c.budget) > 0; });
    if (!overall && !catBudgets.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    var html = '';
    if (overall) {
      var spent = monthExpenseFor(ref, null);
      html += budgetBar('本月总预算', spent, overall, cur);
      if (spent >= overall) html += '<div class="lg-budget-msg lg-c-exp">已超总预算 ' + escapeHtml(fmtMoney(spent - overall, cur)) + '</div>';
      else if (spent >= overall * num(state.settings.budgetWarnPct)) html += '<div class="lg-budget-msg lg-c-warn">快到总预算了，还剩 ' + escapeHtml(fmtMoney(overall - spent, cur)) + '</div>';
    }
    catBudgets.forEach(function (c) {
      var spent = monthExpenseFor(ref, function (t) { return t.categoryId === c.id; });
      html += budgetBar(c.emoji + ' ' + c.name, spent, num(c.budget), cur);
    });
    box.innerHTML = html;
  }

  function renderList(txns, ref) {
    var list = $('lg-list');
    var filtered = txns.filter(function (t) {
      if (ui.filterType !== 'all' && t.type !== ui.filterType) return false;
      if (ui.search) {
        var c = catById(t.categoryId);
        var hay = [t.note, t.merchant, t.method, (t.tags || []).join(' '), c ? c.name : ''].join(' ').toLowerCase();
        if (hay.indexOf(ui.search.toLowerCase()) < 0) return false;
      }
      return true;
    });
    if (!filtered.length) {
      list.innerHTML = '<div class="lg-empty">' +
        (state.transactions.length ? '这个范围内没有记录' : '还没有记账，点上面「＋ 记一笔」开始吧') + '</div>';
      return;
    }
    var groups = {};
    filtered.forEach(function (t) { var k = dateKey(t.ts, t.tz); (groups[k] = groups[k] || []).push(t); });
    var keys = Object.keys(groups).sort(function (a, b) { return a < b ? 1 : -1; });
    var html = '';
    keys.forEach(function (k) {
      var rows = groups[k].sort(function (a, b) { return b.ts - a.ts; });
      var p = partsInTz(rows[0].ts, rows[0].tz);
      var dayMap = {};
      rows.forEach(function (t) { if (t.type !== 'transfer') dayMap[t.currency] = (dayMap[t.currency] || 0) + signed(t, ui.basis); });
      var daySum = Object.keys(dayMap).map(function (cc) {
        var v = dayMap[cc];
        return '<span class="' + (v >= 0 ? 'lg-c-inc' : 'lg-c-exp') + '">' + escapeHtml((v >= 0 ? '+' : '') + fmtMoney(v, cc)) + '</span>';
      }).join(' ');
      html += '<div class="lg-day"><div class="lg-day-h"><span>' + p.m + '月' + p.d + '日 ' + WD_ZH[p.wd] + '</span><span class="lg-day-sum">' + daySum + '</span></div>';
      rows.forEach(function (t) { html += rowHtml(t, ref.tz); });
      html += '</div>';
    });
    list.innerHTML = html;
  }

  function rowHtml(t, curTz) {
    var p = partsInTz(t.ts, t.tz);
    var timeStr = pad2(p.h) + ':' + pad2(p.min);
    var badge = '';
    if (state.settings.showZoneBadges && t.tz !== curTz) {
      badge = '<span class="lg-zone" title="' + escapeHtml(t.tz + ' ' + offsetLabel(t.ts, t.tz)) + '">' + escapeHtml(tzShort(t.tz)) + ' 时区</span>';
    }
    if (t.type === 'transfer') {
      var fa = accById(t.fromAccountId), ta = accById(t.toAccountId);
      return '<div class="lg-row" data-edit="' + t.id + '">' +
        '<div class="lg-row-mark" aria-hidden="true"></div>' +
        '<div class="lg-row-mid"><div class="lg-row-title">转账 ' + badge + '</div>' +
        '<div class="lg-row-sub">' + escapeHtml((fa ? fa.name : '?') + ' → ' + (ta ? ta.name : '?')) + ' · ' + timeStr + (t.note ? ' · ' + escapeHtml(t.note) : '') + '</div></div>' +
        '<div class="lg-row-amt lg-c-neu">' + escapeHtml(fmtMoney(num(t.amount), t.currency)) + '</div></div>';
    }
    var c = catById(t.categoryId);
    var emoji = c ? c.emoji : (t.type === 'income' ? '[[zi:sparkle]]' : '[[zi:receipt]]');
    var catName = c ? c.name : '未分类';
    var title = escapeHtml(t.note || t.merchant || catName);
    var sub = [];
    if (t.note && t.merchant) sub.push(escapeHtml(t.merchant));
    var acc = accById(t.accountId);
    if (acc && state.accounts.length > 1) sub.push(escapeHtml(acc.emoji + acc.name));
    if (t.method) sub.push(escapeHtml(t.method));
    (t.tags || []).forEach(function (tg) { sub.push('#' + escapeHtml(tg)); });

    var mag = magFor(t, ui.basis);
    var amtCls = t.type === 'income' ? 'lg-c-inc' : 'lg-c-exp';
    var amtStr = (t.type === 'income' ? '+' : '-') + fmtMoney(mag, t.currency).replace('-', '');

    var chip = '';
    if (t.settlement) {
      var label = t.type === 'expense' ? '垫付' : '代收';
      var oo = outstanding(t);
      if (t.settlement.closed) {
        var sf = shortfall(t);
        chip = '<button type="button" class="lg-chip lg-chip-done" data-settle="' + t.id + '">' + label + ' 已结清' + (sf > 0 ? '·亏' + escapeHtml(fmtMoney(sf, t.currency).replace('-', '')) : '') + '</button>';
      } else {
        chip = '<button type="button" class="lg-chip" data-settle="' + t.id + '">' + label + ' ' + fmtMoney(grossMag(t), t.currency) + '·' + (t.type === 'expense' ? '待收' : '待付') + escapeHtml(fmtMoney(oo, t.currency).replace('-', '')) + '</button>';
      }
    }
    var recur = t.recurringId ? '<span class="lg-zone">周期账</span>' : '';
    return '<div class="lg-row" data-edit="' + t.id + '">' +
      '<div class="lg-row-emoji">' + escapeHtml(emoji) + '</div>' +
      '<div class="lg-row-mid"><div class="lg-row-title">' + title + ' ' + badge + ' ' + recur + '</div>' +
      '<div class="lg-row-sub">' + escapeHtml(catName) + ' · ' + timeStr + (sub.length ? ' · ' + sub.join(' · ') : '') + '</div>' +
      (chip ? '<div class="lg-row-chips">' + chip + '</div>' : '') +
      '</div>' +
      '<div class="lg-row-amt ' + amtCls + '">' + escapeHtml(amtStr) + '</div>' +
      '</div>';
  }

  // ============ 图表 ============
  function renderChart(ref) {
    var svg = $('lg-chart'), empty = $('lg-chart-empty');
    var has = state.transactions.some(function (t) { return t.type !== 'transfer' && amtInView(1, t.currency) != null; });
    if (!has) { svg.style.display = 'none'; empty.hidden = false; return; }
    svg.style.display = ''; empty.hidden = true;
    if (ui.chart === 'burn') drawBurn(ref); else drawTrend(ref);
  }
  function drawBurn(ref) {
    var cur = state.settings.baseCurrency;
    var W = 600, H = 240, m = { l: 48, r: 14, t: 16, b: 28 };
    var innerW = W - m.l - m.r, innerH = H - m.t - m.b;
    var parts = ref.month.split('-'); var y = +parts[0], mo = +parts[1];
    var days = daysInMonth(y, mo);
    var daily = new Array(days + 1).fill(0);
    state.transactions.forEach(function (t) {
      if (t.type === 'expense' && monthKey(t.ts, t.tz) === ref.month) {
        var v = amtInView(actualMag(t), t.currency); if (v != null) daily[partsInTz(t.ts, t.tz).d] += v;
      }
    });
    var cum = new Array(days + 1).fill(0);
    for (var i = 1; i <= days; i++) cum[i] = cum[i - 1] + daily[i];
    var budget = currentBudget();
    var maxY = Math.max(cum[days], budget || 0, 1) * 1.12;
    var todayDay = (ref.month === nowRef().month) ? partsInTz(Date.now(), ref.tz).d : days;
    var xs = function (d) { return m.l + ((d - 1) / Math.max(1, days - 1)) * innerW; };
    var ys = function (v) { return m.t + innerH - (v / maxY) * innerH; };
    var h = '';
    [0, maxY / 2, maxY].forEach(function (v) {
      var yy = ys(v);
      h += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.6"/>';
      h += '<text x="' + (m.l - 6) + '" y="' + (yy + 4) + '" text-anchor="end" fill="var(--color-light)" font-size="10">' + fmtAxis(v, cur) + '</text>';
    });
    for (var d = 1; d <= days; d += (days > 20 ? 5 : 3)) {
      h += '<text x="' + xs(d) + '" y="' + (H - 10) + '" text-anchor="middle" fill="var(--color-light)" font-size="10">' + d + '</text>';
    }
    if (budget) {
      h += '<line x1="' + xs(1) + '" y1="' + ys(0) + '" x2="' + xs(days) + '" y2="' + ys(budget) + '" stroke="var(--color-light)" stroke-width="1.3" stroke-dasharray="5 4"/>';
      h += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + ys(budget) + '" y2="' + ys(budget) + '" stroke="var(--lg-warn)" stroke-width="1" stroke-dasharray="2 3" opacity="0.8"/>';
      h += '<text x="' + (W - m.r) + '" y="' + (ys(budget) - 5) + '" text-anchor="end" fill="var(--lg-warn)" font-size="10">预算 ' + fmtAxis(budget, cur) + '</text>';
    }
    var pts = [];
    for (var dd = 1; dd <= Math.max(1, todayDay); dd++) pts.push(xs(dd) + ',' + ys(cum[dd]));
    var over = budget && cum[Math.max(1, todayDay)] > budget;
    var col = over ? 'var(--lg-exp)' : 'var(--color-accent)';
    h += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linejoin="round"/>';
    h += '<circle cx="' + xs(Math.max(1, todayDay)) + '" cy="' + ys(cum[Math.max(1, todayDay)]) + '" r="3.5" fill="' + col + '"/>';
    h += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + innerH) + '" y2="' + (m.t + innerH) + '" stroke="var(--color-border)"/>';
    $('lg-chart').innerHTML = h;
  }
  function drawTrend(ref) {
    var cur = state.settings.baseCurrency;
    var W = 600, H = 240, m = { l: 48, r: 14, t: 16, b: 28 };
    var innerW = W - m.l - m.r, innerH = H - m.t - m.b;
    var N = 6, months = [];
    var parts = ref.month.split('-'); var y = +parts[0], mo = +parts[1];
    for (var i = N - 1; i >= 0; i--) {
      var yy = y, mm = mo - i;
      while (mm <= 0) { mm += 12; yy -= 1; }
      months.push({ key: yy + '-' + pad2(mm), label: mm + '月' });
    }
    var vals = months.map(function (mk) {
      var s = 0;
      state.transactions.forEach(function (t) {
        if (t.type === 'expense' && monthKey(t.ts, t.tz) === mk.key) { var v = amtInView(actualMag(t), t.currency); if (v != null) s += v; }
      });
      return s;
    });
    var budget = currentBudget();
    var maxY = Math.max(Math.max.apply(null, vals), budget || 0, 1) * 1.12;
    var xs = function (i) { return m.l + (N === 1 ? innerW / 2 : (i / (N - 1)) * innerW); };
    var ys = function (v) { return m.t + innerH - (v / maxY) * innerH; };
    var h = '';
    [0, maxY / 2, maxY].forEach(function (v) {
      var yv = ys(v);
      h += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yv + '" y2="' + yv + '" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.6"/>';
      h += '<text x="' + (m.l - 6) + '" y="' + (yv + 4) + '" text-anchor="end" fill="var(--color-light)" font-size="10">' + fmtAxis(v, cur) + '</text>';
    });
    months.forEach(function (mk, i) { h += '<text x="' + xs(i) + '" y="' + (H - 10) + '" text-anchor="middle" fill="var(--color-light)" font-size="10">' + mk.label + '</text>'; });
    if (budget) {
      h += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + ys(budget) + '" y2="' + ys(budget) + '" stroke="var(--lg-warn)" stroke-width="1" stroke-dasharray="4 4"/>';
      h += '<text x="' + (W - m.r) + '" y="' + (ys(budget) - 5) + '" text-anchor="end" fill="var(--lg-warn)" font-size="10">预算 ' + fmtAxis(budget, cur) + '</text>';
    }
    var line = vals.map(function (v, i) { return (i ? 'L' : 'M') + xs(i) + ',' + ys(v); }).join(' ');
    h += '<path d="' + line + '" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linejoin="round"/>';
    vals.forEach(function (v, i) {
      h += '<circle cx="' + xs(i) + '" cy="' + ys(v) + '" r="3.5" fill="var(--color-accent)"/>';
      h += '<text x="' + xs(i) + '" y="' + (ys(v) - 8) + '" text-anchor="middle" fill="var(--color-muted)" font-size="9">' + fmtAxis(v, cur) + '</text>';
    });
    h += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + innerH) + '" y2="' + (m.t + innerH) + '" stroke="var(--color-border)"/>';
    $('lg-chart').innerHTML = h;
  }

  function syncControls() {
    var cur = state.settings.baseCurrency;
    $('lg-cur-toggle').textContent = curSym(cur) + ' ' + cur;
    $('lg-mode-hint').textContent = ui.basis === 'net' ? '（垫付按你的份额算）' : '（按实际进出的钱算）';
    document.querySelectorAll('#lg-mode-toggle button').forEach(function (b) { b.classList.toggle('active', b.dataset.basis === ui.basis); });
    document.querySelectorAll('#lg-period button').forEach(function (b) { b.classList.toggle('active', b.dataset.period === state.settings.period); });
    document.querySelectorAll('.lg-chart-tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.chart === ui.chart); });
    $('lg-period-custom').hidden = state.settings.period !== 'custom';
  }

  // ============ 记一笔 / 编辑 弹窗 ============
  function fillTzSelect(sel, tz) {
    var cur = currentTz(), opts = '';
    if (!CITIES.some(function (c) { return c.tz === cur; })) opts += '<option value="' + escapeHtml(cur) + '">当前 (' + escapeHtml(tzShort(cur)) + ')</option>';
    CITIES.forEach(function (c) { opts += '<option value="' + c.tz + '"' + (c.tz === tz ? ' selected' : '') + '>' + escapeHtml(c.zh) + '</option>'; });
    sel.innerHTML = opts; sel.value = tz;
  }
  function fillAccSelect(sel, accId) {
    sel.innerHTML = state.accounts.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .map(function (a) { return '<option value="' + a.id + '"' + (a.id === accId ? ' selected' : '') + '>' + escapeHtml(a.name) + '</option>'; }).join('');
    if (accId) sel.value = accId;
  }
  function renderCatChips() {
    var box = $('lg-cat-chips');
    var cats = state.categories.filter(function (c) { return c.type === ui.entryType; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    box.innerHTML = cats.map(function (c) {
      return '<button type="button" class="lg-cat-chip' + (c.id === ui.selectedCat ? ' active' : '') + '" data-cat="' + c.id + '"><span class="lg-cat-chip-e">' + escapeHtml(c.emoji) + '</span>' + escapeHtml(c.name) + '</button>';
    }).join('');
  }
  function applyTypeUI() {
    var isTransfer = ui.entryType === 'transfer';
    $('lg-cat-chips').hidden = isTransfer;
    $('lg-transfer-fields').hidden = !isTransfer;
    $('lg-account-field').hidden = isTransfer || state.accounts.length <= 1;
    $('lg-fine-extra').hidden = isTransfer;
    $('lg-settle-wrap').hidden = isTransfer;
  }
  function computeAA() {
    if (!$('lg-aa-on').checked) return;
    var amt = num($('lg-amount').value);
    var people = Math.max(1, Math.round(num($('lg-aa-people').value) || 0));
    var cover = Math.max(1, Math.round(num($('lg-aa-cover').value) || 1));
    if (people < 1) return;
    var ms = Math.round((amt * cover / people) * 100) / 100;
    $('lg-myshare').value = ms;
    $('lg-expected').value = Math.max(0, Math.round((amt - ms) * 100) / 100);
    updateSettleLabels();
  }
  function updateSettleLabels() {
    var isExp = ui.entryType === 'expense';
    $('lg-settle-label').textContent = isExp ? '这是我垫付的（之后有人还我）' : '这是我代收的（之后要分给别人）';
    $('lg-myshare-label').textContent = isExp ? '我的份额' : '我实得';
    $('lg-expected-label').textContent = isExp ? '应收回' : '应付出';
    var amt = num($('lg-amount').value), ms = num($('lg-myshare').value);
    var exp = $('lg-expected').value === '' ? Math.max(0, amt - ms) : num($('lg-expected').value);
    $('lg-settle-hint').innerHTML = isExp
      ? '账面付出 ' + fmtMoney(amt, ui.entryCur) + '，你只承担 ' + fmtMoney(ms, ui.entryCur) + '，应收回 ' + fmtMoney(exp, ui.entryCur) + '。收款之后到这笔的「垫付详情」里记。'
      : '账面收到 ' + fmtMoney(amt, ui.entryCur) + '，你实得 ' + fmtMoney(ms, ui.entryCur) + '，要分出 ' + fmtMoney(exp, ui.entryCur) + '。';
  }

  function openEntry(txn) {
    ui.editingId = txn ? txn.id : null;
    ui.entryType = txn ? txn.type : 'expense';
    ui.entryCur = txn ? txn.currency : state.settings.baseCurrency;
    ui.selectedCat = txn ? txn.categoryId : defaultCatFor(ui.entryType === 'transfer' ? 'expense' : ui.entryType);
    ui.entryAcc = txn ? (txn.accountId || state.accounts[0].id) : state.accounts[0].id;

    $('lg-entry-title').textContent = txn ? '编辑' : '记一笔';
    document.querySelectorAll('#lg-type-toggle button').forEach(function (b) { b.classList.toggle('active', b.dataset.type === ui.entryType); });
    $('lg-entry-cur').textContent = curSym(ui.entryCur);
    $('lg-amount').value = txn ? txn.amount : '';
    $('lg-note').value = txn ? (txn.note || '') : '';
    $('lg-merchant').value = txn ? (txn.merchant || '') : '';
    $('lg-method').value = txn ? (txn.method || '') : '';
    $('lg-tags').value = txn ? (txn.tags || []).join(', ') : '';

    var ts = txn ? txn.ts : Date.now();
    var tz = txn ? txn.tz : currentTz();
    var p = partsInTz(ts, tz);
    $('lg-date').value = p.y + '-' + pad2(p.m) + '-' + pad2(p.d);
    $('lg-time').value = pad2(p.h) + ':' + pad2(p.min);
    fillTzSelect($('lg-tz'), tz);
    fillAccSelect($('lg-account'), ui.entryAcc);
    fillAccSelect($('lg-from-acc'), txn && txn.fromAccountId ? txn.fromAccountId : state.accounts[0].id);
    fillAccSelect($('lg-to-acc'), txn && txn.toAccountId ? txn.toAccountId : (state.accounts[1] ? state.accounts[1].id : state.accounts[0].id));

    var hasSettle = !!(txn && txn.settlement);
    $('lg-settle-on').checked = hasSettle;
    $('lg-settle-fields').hidden = !hasSettle;
    $('lg-myshare').value = hasSettle ? txn.settlement.myShare : '';
    $('lg-expected').value = hasSettle ? txn.settlement.expected : '';
    $('lg-aa-on').checked = false;
    $('lg-aa-fields').hidden = true;
    $('lg-aa-people').value = ''; $('lg-aa-cover').value = '1';

    var fine = txn && (txn.merchant || txn.method || (txn.tags && txn.tags.length) || hasSettle || (txn.accountId && txn.accountId !== state.accounts[0].id));
    $('lg-more').hidden = !fine;
    $('lg-more-toggle').setAttribute('aria-expanded', fine ? 'true' : 'false');
    $('lg-more-toggle').textContent = fine ? '更多 −' : '更多 +';

    $('lg-entry-del').hidden = !txn;
    renderCatChips(); applyTypeUI(); updateSettleLabels();
    openModal('lg-entry-modal');
    setTimeout(function () { $('lg-amount').focus(); }, 30);
  }
  function defaultCatFor(type) {
    var cats = state.categories.filter(function (c) { return c.type === type; });
    return cats.length ? cats.sort(function (a, b) { return (a.order || 0) - (b.order || 0); })[0].id : null;
  }

  function saveEntry() {
    var amount = num($('lg-amount').value);
    if (!(amount > 0)) { alert('请输入金额'); $('lg-amount').focus(); return; }
    var tz = $('lg-tz').value || currentTz();
    var dp = ($('lg-date').value || '').split('-').map(Number);
    var tp = ($('lg-time').value || '00:00').split(':').map(Number);
    var ts = (dp.length === 3 && !isNaN(dp[0])) ? wallToUtc(dp[0], dp[1], dp[2], tp[0] || 0, tp[1] || 0, tz) : Date.now();

    if (ui.entryType === 'transfer') {
      var from = $('lg-from-acc').value, to = $('lg-to-acc').value;
      if (from === to) { alert('转出和转入不能是同一个账户'); return; }
      var base = { type: 'transfer', amount: amount, currency: ui.entryCur, ts: ts, tz: tz, fromAccountId: from, toAccountId: to, note: $('lg-note').value.trim(), updatedAt: Date.now() };
      if (ui.editingId) { var et = findTxn(ui.editingId); if (et) { Object.keys(base).forEach(function (k) { et[k] = base[k]; }); et.categoryId = null; et.settlement = null; et.accountId = null; } }
      else { base.id = uuid('t'); base.createdAt = Date.now(); state.transactions.push(base); }
      persist(); closeModal('lg-entry-modal'); render(); return;
    }

    var tags = $('lg-tags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var settlement = null;
    if ($('lg-settle-on').checked) {
      var ms = num($('lg-myshare').value);
      var exp = $('lg-expected').value === '' ? Math.max(0, amount - ms) : num($('lg-expected').value);
      var existing = ui.editingId ? (findTxn(ui.editingId) || {}).settlement : null;
      settlement = {
        myShare: ms, expected: exp,
        reimbursements: (existing && existing.reimbursements) ? existing.reimbursements : [],
        closed: existing ? !!existing.closed : false,
        closedNet: existing ? existing.closedNet : null
      };
    }
    var fields = {
      type: ui.entryType, amount: amount, currency: ui.entryCur, ts: ts, tz: tz,
      categoryId: ui.selectedCat, accountId: $('lg-account').value || state.accounts[0].id,
      note: $('lg-note').value.trim(), merchant: $('lg-merchant').value.trim(),
      method: $('lg-method').value.trim(), tags: tags, settlement: settlement, updatedAt: Date.now()
    };
    if (ui.editingId) {
      var t = findTxn(ui.editingId);
      if (t) { Object.keys(fields).forEach(function (k) { t[k] = fields[k]; }); t.fromAccountId = undefined; t.toAccountId = undefined; }
    } else {
      fields.id = uuid('t'); fields.createdAt = Date.now();
      state.transactions.push(fields);
    }
    persist(); closeModal('lg-entry-modal'); render();
  }
  function findTxn(id) { for (var i = 0; i < state.transactions.length; i++) if (state.transactions[i].id === id) return state.transactions[i]; return null; }

  function deleteEntry(id) {
    var idx = state.transactions.findIndex(function (t) { return t.id === id; });
    if (idx < 0) return;
    ui.lastDeleted = { txn: state.transactions[idx], index: idx };
    state.transactions.splice(idx, 1);
    persist(); render();
    showToast('已删除一笔', function () {
      if (ui.lastDeleted) {
        state.transactions.splice(Math.min(ui.lastDeleted.index, state.transactions.length), 0, ui.lastDeleted.txn);
        ui.lastDeleted = null; persist(); render();
      }
    });
  }
  function showToast(msg, undoFn) {
    var bar = $('lg-toast');
    $('lg-toast-msg').textContent = msg; bar.hidden = false;
    $('lg-toast-undo').onclick = function () { if (undoFn) undoFn(); bar.hidden = true; clearTimeout(toastTimer); };
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { bar.hidden = true; }, 5000);
  }

  // ============ 垫付详情 弹窗 ============
  function openSettle(id) { ui.settleTxnId = id; renderSettle(); openModal('lg-settle-modal'); }
  function renderSettle() {
    var t = findTxn(ui.settleTxnId);
    if (!t || !t.settlement) { closeModal('lg-settle-modal'); return; }
    var isExp = t.type === 'expense';
    $('lg-settle-title').textContent = isExp ? '垫付详情' : '代收详情';
    $('lg-rb-amount-label').textContent = isExp ? '收到金额' : '付出金额';
    $('lg-rb-from-label').textContent = isExp ? '来自谁' : '付给谁';
    var s = t.settlement, cur = t.currency, rec = received(t), oo = outstanding(t), actual = actualMag(t);
    var rows = (s.reimbursements || []).map(function (r, i) {
      var pp = partsInTz(r.ts, r.tz);
      return '<div class="lg-rb-row"><span>' + pp.m + '/' + pp.d + ' ' + escapeHtml(r.from || '—') + '</span><span>' + fmtMoney(num(r.amount), cur) + ' <button type="button" class="lg-rb-del" data-rbdel="' + i + '" aria-label="删除">×</button></span></div>';
    }).join('') || '<div class="lg-hint">还没有记回款</div>';
    var summary = '<div class="lg-settle-sum">' +
      '<div><span>账面' + (isExp ? '付出' : '收到') + '</span><b>' + fmtMoney(grossMag(t), cur) + '</b></div>' +
      '<div><span>' + (isExp ? '我的份额' : '我实得') + '</span><b>' + fmtMoney(num(s.myShare), cur) + '</b></div>' +
      '<div><span>' + (isExp ? '已收回' : '已付出') + '</span><b>' + fmtMoney(rec, cur) + '</b></div>' +
      '<div><span>' + (isExp ? '待收回' : '待付出') + '</span><b class="' + (oo > 0 ? 'lg-c-warn' : '') + '">' + fmtMoney(oo, cur) + '</b></div>' +
      '<div class="lg-settle-actual"><span>' + (isExp ? '实际花销' : '实际收入') + '</span><b class="' + (isExp ? 'lg-c-exp' : 'lg-c-inc') + '">' + fmtMoney(actual, cur) + '</b></div></div>';
    var closedNote = '';
    if (s.closed) { var sf = shortfall(t); closedNote = '<div class="lg-settle-closed">已结清' + (sf > 0 && isExp ? '，' + escapeHtml(fmtMoney(sf, cur)) + ' 没收回，已计入你的实际亏损' : '') + '。</div>'; }
    $('lg-settle-body').innerHTML = summary + '<div class="lg-rb-list">' + rows + '</div>' + closedNote;
    $('lg-settle-addbox').style.display = s.closed ? 'none' : '';
    $('lg-settle-close').hidden = s.closed;
    $('lg-settle-reopen').hidden = !s.closed;
  }

  // ============ 类目管理 ============
  function renderCatManage() {
    document.querySelectorAll('#lg-cat-tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.ctype === ui.catManageType); });
    var cats = state.categories.filter(function (c) { return c.type === ui.catManageType; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var isExp = ui.catManageType === 'expense';
    $('lg-cat-manage').innerHTML = cats.map(function (c, i) {
      return '<div class="lg-cat-item"><span class="lg-cat-item-e">' + escapeHtml(c.emoji) + '</span>' +
        '<span class="lg-cat-item-n">' + escapeHtml(c.name) + '</span>' +
        (isExp ? '<input type="number" class="lg-cat-budget" data-catbudget="' + c.id + '" inputmode="decimal" step="any" min="0" placeholder="预算" value="' + (c.budget != null ? c.budget : '') + '">' : '') +
        '<button type="button" class="lg-cat-mv" data-catup="' + c.id + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="上移">↑</button>' +
        '<button type="button" class="lg-cat-mv" data-catdown="' + c.id + '"' + (i === cats.length - 1 ? ' disabled' : '') + ' aria-label="下移">↓</button>' +
        '<button type="button" class="lg-cat-del" data-catdel="' + c.id + '" aria-label="删除">删除</button></div>';
    }).join('') || '<div class="lg-hint">还没有类目</div>';
  }
  function swapOrder(id, dir) {
    var cats = state.categories.filter(function (c) { return c.type === ui.catManageType; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var i = cats.findIndex(function (c) { return c.id === id; });
    var j = i + dir;
    if (j < 0 || j >= cats.length) return;
    var oi = cats[i].order, oj = cats[j].order;
    cats[i].order = oj; cats[j].order = oi;
    persist(); renderCatManage();
  }

  // ============ 账户管理 ============
  function renderAccManage() {
    var accs = state.accounts.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    $('lg-acc-manage').innerHTML = accs.map(function (a) {
      var canDel = state.accounts.length > 1;
      return '<div class="lg-cat-item"><span class="lg-cat-item-e">' + escapeHtml(a.emoji || '[[zi:wallet]]') + '</span>' +
        '<span class="lg-cat-item-n">' + escapeHtml(a.name) + ' <small>' + escapeHtml(fmtMoney(accountBalance(a.id), state.settings.baseCurrency)) + '</small></span>' +
        (canDel ? '<button type="button" class="lg-cat-del" data-accdel="' + a.id + '" aria-label="删除">删除</button>' : '') + '</div>';
    }).join('');
  }

  // ============ 周期性账管理 ============
  function freqLabel(r) {
    if (r.freq === 'daily') return '每天';
    if (r.freq === 'weekly') return '每' + WD_ZH[+r.day];
    return '每月' + r.day + '号';
  }
  function renderRecManage() {
    var list = state.recurring.slice();
    $('lg-rec-list').innerHTML = list.length ? list.map(function (r) {
      var c = catById(r.categoryId);
      return '<div class="lg-cat-item"><span class="lg-cat-item-rule" aria-hidden="true"></span>' +
        '<span class="lg-cat-item-n">' + escapeHtml((c ? c.emoji + c.name + ' · ' : '') + fmtMoney(num(r.amount), r.currency)) + '<small> ' + freqLabel(r) + (r.active ? '' : ' · 已停') + '</small></span>' +
        '<button type="button" class="lg-cat-mv" data-rectoggle="' + r.id + '">' + (r.active ? '停用' : '启用') + '</button>' +
        '<button type="button" class="lg-cat-del" data-recdel="' + r.id + '" aria-label="删除">删除</button></div>';
    }).join('') : '<div class="lg-hint">还没有周期账。下面添加房租、订阅这类每月固定开支，进页面会自动补记。</div>';
    // 填类目下拉
    var sel = $('lg-rec-cat');
    var rt = $('lg-rec-type').value;
    sel.innerHTML = state.categories.filter(function (c) { return c.type === rt; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .map(function (c) { return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; }).join('');
    var freq = $('lg-rec-freq').value;
    $('lg-rec-day-wrap').hidden = freq === 'daily';
    if (freq === 'weekly') {
      $('lg-rec-day').innerHTML = WD_ZH.map(function (w, i) { return '<option value="' + i + '">' + w + '</option>'; }).join('');
    } else if (freq === 'monthly') {
      var o = ''; for (var i = 1; i <= 31; i++) o += '<option value="' + i + '">' + i + ' 号</option>'; $('lg-rec-day').innerHTML = o;
    }
  }

  // ============ 设置 ============
  function openSettings() {
    var s = state.settings;
    $('lg-set-cur').value = s.baseCurrency;
    $('lg-set-week').value = String(s.weekStartsOn);
    $('lg-set-budget').value = s.monthlyBudget != null ? s.monthlyBudget : '';
    $('lg-set-warn').value = String(s.budgetWarnPct);
    $('lg-set-badge').checked = !!s.showZoneBadges;
    $('lg-set-fxrate').value = s.fxRate != null ? s.fxRate : '';
    $('lg-set-fxmerge').checked = !!s.fxMerge;
    openModal('lg-settings-modal');
    if (window.LedgerSync && window.LedgerSync.renderStatus) window.LedgerSync.renderStatus();
  }
  function saveSettings() {
    var s = state.settings;
    s.baseCurrency = $('lg-set-cur').value;
    s.weekStartsOn = +$('lg-set-week').value;
    var b = $('lg-set-budget').value;
    s.monthlyBudget = (b === '' || num(b) <= 0) ? null : num(b);
    s.budgetWarnPct = num($('lg-set-warn').value);
    s.showZoneBadges = $('lg-set-badge').checked;
    var r = num($('lg-set-fxrate').value); s.fxRate = r > 0 ? r : 7.2;
    s.fxMerge = $('lg-set-fxmerge').checked;
    persist(); closeModal('lg-settings-modal'); render();
  }

  // ============ 备份 / 导入（WebCrypto 加密）============
  function b64(u8) { var s = ''; u8.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  async function deriveKey(pass, salt) {
    var km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptPayload(obj, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(pass, salt);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return { app: 'ruizhou-ledger', enc: true, v: 1, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
  }
  async function decryptPayload(blob, pass) {
    var key = await deriveKey(pass, unb64(blob.salt));
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.data));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function corePayload() {
    return { app: 'ruizhou-ledger', enc: false, v: state.version, exportedAt: Date.now(),
      state: { version: state.version, transactions: state.transactions, categories: state.categories, accounts: state.accounts, recurring: state.recurring, settings: state.settings } };
  }
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  async function doExport() {
    var ref = nowRef(), fname = 'ledger-backup-' + ref.today.replace(/-/g, '') + '.json';
    try {
      if ($('lg-io-encrypt').checked) {
        var pass = $('lg-io-pass').value;
        if (!pass) { ioStatus('请先设置密码', true); return; }
        download(fname, JSON.stringify(await encryptPayload(corePayload(), pass)));
      } else { download(fname, JSON.stringify(corePayload(), null, 2)); }
      ioStatus('已导出 ' + fname);
    } catch (e) { ioStatus('导出失败：' + e.message, true); }
  }
  function applyImported(payload) {
    if (!payload || payload.app !== 'ruizhou-ledger' || !payload.state) { ioStatus('文件格式不对', true); return; }
    if (!confirm('导入会用备份覆盖当前全部数据，继续？')) return;
    var st = payload.state;
    state.version = st.version || 2;
    state.transactions = Array.isArray(st.transactions) ? st.transactions : [];
    state.categories = (Array.isArray(st.categories) && st.categories.length) ? st.categories : defaultCategories();
    state.accounts = (Array.isArray(st.accounts) && st.accounts.length) ? st.accounts : defaultAccounts();
    state.recurring = Array.isArray(st.recurring) ? st.recurring : [];
    if (st.settings) Object.keys(state.settings).forEach(function (k) { if (st.settings[k] !== undefined) state.settings[k] = st.settings[k]; });
    migrate(); persist(); render();
    ioStatus('导入成功，共 ' + state.transactions.length + ' 笔');
  }
  async function doImport(file) {
    try {
      var parsed = JSON.parse(await file.text());
      if (parsed && parsed.enc) {
        var pass = $('lg-io-pass').value || prompt('这是加密备份，请输入密码：') || '';
        if (!pass) { ioStatus('需要密码才能导入', true); return; }
        applyImported(await decryptPayload(parsed, pass));
      } else { applyImported(parsed); }
    } catch (e) { ioStatus('导入失败：密码错误或文件损坏', true); }
  }
  function ioStatus(msg, bad) { var el = $('lg-io-status'); el.textContent = msg; el.className = 'lg-hint' + (bad ? ' lg-c-exp' : ''); }

  // ============ 弹窗开关 ============
  function openModal(id) { $(id).hidden = false; document.body.classList.add('lg-modal-open'); }
  function closeModal(id) { $(id).hidden = true; if (!document.querySelector('.lg-modal-backdrop:not([hidden])')) document.body.classList.remove('lg-modal-open'); }

  // ============ 事件绑定 ============
  function wire() {
    $('lg-cur-toggle').onclick = function () { state.settings.baseCurrency = state.settings.baseCurrency === 'CNY' ? 'USD' : 'CNY'; persist(); render(); };
    $('lg-settings-btn').onclick = openSettings;
    $('lg-io-btn').onclick = function () { ioStatus(''); openModal('lg-io-modal'); };
    $('lg-add-btn').onclick = function () { openEntry(null); };

    document.querySelectorAll('#lg-mode-toggle button').forEach(function (b) { b.onclick = function () { ui.basis = b.dataset.basis; render(); }; });
    document.querySelectorAll('#lg-period button').forEach(function (b) { b.onclick = function () { state.settings.period = b.dataset.period; persist(); render(); }; });
    $('lg-custom-start').onchange = function () { state.settings.customStart = this.value; persist(); render(); };
    $('lg-custom-end').onchange = function () { state.settings.customEnd = this.value; persist(); render(); };
    document.querySelectorAll('.lg-chart-tabs button').forEach(function (b) { b.onclick = function () { ui.chart = b.dataset.chart; render(); }; });
    $('lg-search-input').oninput = function () { ui.search = this.value.trim(); render(); };
    $('lg-filter-type').onchange = function () { ui.filterType = this.value; render(); };

    $('lg-list').onclick = function (e) {
      var sb = e.target.closest('[data-settle]');
      if (sb) { e.stopPropagation(); openSettle(sb.dataset.settle); return; }
      var row = e.target.closest('[data-edit]');
      if (row) { var t = findTxn(row.dataset.edit); if (t) openEntry(t); }
    };

    document.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { closeModal(b.dataset.close); }; });
    document.querySelectorAll('.lg-modal-backdrop').forEach(function (bd) { bd.addEventListener('click', function (e) { if (e.target === bd) closeModal(bd.id); }); });

    // 记一笔
    document.querySelectorAll('#lg-type-toggle button').forEach(function (b) {
      b.onclick = function () {
        ui.entryType = b.dataset.type;
        document.querySelectorAll('#lg-type-toggle button').forEach(function (x) { x.classList.toggle('active', x === b); });
        if (ui.entryType !== 'transfer') { ui.selectedCat = defaultCatFor(ui.entryType); renderCatChips(); }
        applyTypeUI(); updateSettleLabels();
      };
    });
    $('lg-entry-cur').onclick = function () { ui.entryCur = ui.entryCur === 'CNY' ? 'USD' : 'CNY'; this.textContent = curSym(ui.entryCur); updateSettleLabels(); };
    $('lg-cat-chips').onclick = function (e) { var chip = e.target.closest('[data-cat]'); if (!chip) return; ui.selectedCat = chip.dataset.cat; renderCatChips(); };
    $('lg-more-toggle').onclick = function () { var box = $('lg-more'); box.hidden = !box.hidden; this.setAttribute('aria-expanded', box.hidden ? 'false' : 'true'); this.textContent = box.hidden ? '更多 +' : '更多 −'; };
    $('lg-settle-on').onchange = function () { $('lg-settle-fields').hidden = !this.checked; updateSettleLabels(); };
    $('lg-aa-on').onchange = function () { $('lg-aa-fields').hidden = !this.checked; if (this.checked) computeAA(); };
    $('lg-aa-people').oninput = computeAA;
    $('lg-aa-cover').oninput = computeAA;
    $('lg-amount').oninput = function () { computeAA(); updateSettleLabels(); };
    $('lg-myshare').oninput = updateSettleLabels;
    $('lg-expected').oninput = updateSettleLabels;
    $('lg-entry-save').onclick = saveEntry;
    $('lg-entry-del').onclick = function () { if (ui.editingId && confirm('删除这笔记录？')) { deleteEntry(ui.editingId); closeModal('lg-entry-modal'); } };

    // 垫付详情
    $('lg-rb-add').onclick = function () {
      var t = findTxn(ui.settleTxnId); if (!t || !t.settlement) return;
      var amt = num($('lg-rb-amount').value); if (!(amt > 0)) { $('lg-rb-amount').focus(); return; }
      t.settlement.reimbursements.push({ ts: Date.now(), tz: currentTz(), amount: amt, from: $('lg-rb-from').value.trim(), note: '' });
      $('lg-rb-amount').value = ''; $('lg-rb-from').value = ''; persist(); renderSettle(); render();
    };
    $('lg-settle-body').onclick = function (e) {
      var del = e.target.closest('[data-rbdel]'); if (!del) return;
      var t = findTxn(ui.settleTxnId); if (!t) return;
      t.settlement.reimbursements.splice(+del.dataset.rbdel, 1); persist(); renderSettle(); render();
    };
    $('lg-settle-close').onclick = function () {
      var t = findTxn(ui.settleTxnId); if (!t || !t.settlement) return;
      t.settlement.closed = true; t.settlement.closedNet = num(t.settlement.myShare) + shortfall(t); persist(); renderSettle(); render();
    };
    $('lg-settle-reopen').onclick = function () { var t = findTxn(ui.settleTxnId); if (!t || !t.settlement) return; t.settlement.closed = false; t.settlement.closedNet = null; persist(); renderSettle(); render(); };

    // 类目管理
    $('lg-cat-open').onclick = function () { ui.catManageType = 'expense'; renderCatManage(); openModal('lg-cat-modal'); };
    document.querySelectorAll('#lg-cat-tabs button').forEach(function (b) { b.onclick = function () { ui.catManageType = b.dataset.ctype; renderCatManage(); }; });
    document.querySelectorAll('.lg-icon-picker').forEach(function (picker) {
      picker.onclick = function (e) {
        var button = e.target.closest('[data-icon]'); if (!button) return;
        picker.querySelectorAll('[data-icon]').forEach(function (item) {
          var selected = item === button;
          item.classList.toggle('active', selected);
          item.setAttribute('aria-checked', selected ? 'true' : 'false');
        });
        $(picker.id === 'lg-cat-icon-picker' ? 'lg-cat-emoji' : 'lg-acc-emoji').value = button.dataset.icon;
      };
    });
    $('lg-cat-add-btn').onclick = function () {
      var name = $('lg-cat-name').value.trim(); if (!name) { $('lg-cat-name').focus(); return; }
      var emoji = $('lg-cat-emoji').value.trim() || (ui.catManageType === 'income' ? '[[zi:sparkle]]' : '[[zi:receipt]]');
      var maxOrder = state.categories.filter(function (c) { return c.type === ui.catManageType; }).reduce(function (m, c) { return Math.max(m, c.order || 0); }, -1);
      state.categories.push({ id: uuid('c'), emoji: emoji, name: name, type: ui.catManageType, order: maxOrder + 1 });
      $('lg-cat-name').value = ''; persist(); renderCatManage();
    };
    $('lg-cat-manage').onclick = function (e) {
      var up = e.target.closest('[data-catup]'), down = e.target.closest('[data-catdown]'), del = e.target.closest('[data-catdel]');
      if (up) return swapOrder(up.dataset.catup, -1);
      if (down) return swapOrder(down.dataset.catdown, 1);
      if (del) {
        var id = del.dataset.catdel;
        var used = state.transactions.some(function (t) { return t.categoryId === id; });
        if (used && !confirm('有记录用了这个类目，删除后它们会变成「未分类」。继续？')) return;
        state.categories = state.categories.filter(function (c) { return c.id !== id; });
        if (used) state.transactions.forEach(function (t) { if (t.categoryId === id) t.categoryId = null; });
        persist(); renderCatManage(); render();
      }
    };
    $('lg-cat-manage').addEventListener('change', function (e) {
      var bud = e.target.closest('[data-catbudget]'); if (!bud) return;
      var c = catById(bud.dataset.catbudget); if (!c) return;
      var v = num(bud.value); c.budget = v > 0 ? v : undefined; persist(); render();
    });

    // 账户管理
    $('lg-acc-open').onclick = function () { renderAccManage(); openModal('lg-acc-modal'); };
    $('lg-acc-add-btn').onclick = function () {
      var name = $('lg-acc-name').value.trim(); if (!name) { $('lg-acc-name').focus(); return; }
      var emoji = $('lg-acc-emoji').value.trim() || '[[zi:wallet]]';
      var maxOrder = state.accounts.reduce(function (m, a) { return Math.max(m, a.order || 0); }, -1);
      state.accounts.push({ id: uuid('a'), name: name, emoji: emoji, order: maxOrder + 1 });
      $('lg-acc-name').value = ''; persist(); renderAccManage(); render();
    };
    $('lg-acc-manage').onclick = function (e) {
      var del = e.target.closest('[data-accdel]'); if (!del) return;
      var id = del.dataset.accdel;
      if (state.accounts.length <= 1) return;
      var used = state.transactions.some(function (t) { return t.accountId === id || t.fromAccountId === id || t.toAccountId === id; });
      if (used && !confirm('有记录用了这个账户，删除后它们会归到第一个账户。继续？')) return;
      var fallback = state.accounts.find(function (a) { return a.id !== id; }).id;
      state.accounts = state.accounts.filter(function (a) { return a.id !== id; });
      if (used) state.transactions.forEach(function (t) {
        if (t.accountId === id) t.accountId = fallback;
        if (t.fromAccountId === id) t.fromAccountId = fallback;
        if (t.toAccountId === id) t.toAccountId = fallback;
      });
      persist(); renderAccManage(); render();
    };

    // 周期账管理
    $('lg-rec-open').onclick = function () { renderRecManage(); openModal('lg-rec-modal'); };
    $('lg-rec-type').onchange = renderRecManage;
    $('lg-rec-freq').onchange = renderRecManage;
    $('lg-rec-add-btn').onclick = function () {
      var amt = num($('lg-rec-amount').value); if (!(amt > 0)) { $('lg-rec-amount').focus(); return; }
      var ref = nowRef();
      state.recurring.push({
        id: uuid('r'), type: $('lg-rec-type').value, amount: amt, currency: $('lg-rec-cur').value,
        categoryId: $('lg-rec-cat').value, accountId: state.accounts[0].id,
        note: $('lg-rec-note').value.trim(), freq: $('lg-rec-freq').value,
        day: $('lg-rec-freq').value === 'daily' ? 0 : +$('lg-rec-day').value,
        startDate: ref.today, lastRun: null, active: true
      });
      $('lg-rec-amount').value = ''; $('lg-rec-note').value = '';
      runRecurring(); persist(); renderRecManage(); render();
    };
    $('lg-rec-list').onclick = function (e) {
      var tg = e.target.closest('[data-rectoggle]'), del = e.target.closest('[data-recdel]');
      if (tg) { var r = state.recurring.find(function (x) { return x.id === tg.dataset.rectoggle; }); if (r) { r.active = !r.active; if (r.active) runRecurring(); persist(); renderRecManage(); render(); } }
      if (del) { state.recurring = state.recurring.filter(function (x) { return x.id !== del.dataset.recdel; }); persist(); renderRecManage(); }
    };

    // 设置
    $('lg-set-save').onclick = saveSettings;

    // 备份 / 导入
    $('lg-io-encrypt').onchange = function () { $('lg-io-pass-field').hidden = !this.checked; };
    $('lg-io-export').onclick = doExport;
    $('lg-io-import').onchange = function () { if (this.files && this.files[0]) { doImport(this.files[0]); this.value = ''; } };
    $('lg-io-clear').onclick = function () {
      if (confirm('确定清空全部记账数据？此操作不可撤销，建议先导出备份。') && confirm('再确认一次：真的全部删除？')) { state = defaultState(); persist(); render(); closeModal('lg-io-modal'); }
    };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var open = document.querySelectorAll('.lg-modal-backdrop:not([hidden])'); if (open.length) closeModal(open[open.length - 1].id); }
    });
  }

  // 暴露给 ledger-sync.js（端到端加密云同步）
  window.LedgerCore = { getSnapshot: snapshot, mergeSnapshot: mergeSnapshot, render: render };

  // ============ 启动 ============
  load();
  runRecurring();
  ui.basis = 'net';
  wire();
  render();
})();
