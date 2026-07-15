(function () {
  'use strict';

  const BUILD_VERSION = 'v2026.07.14';
  console.log('%c🐾 宠物中心 ' + BUILD_VERSION, 'color:#1e3a5f;font-weight:bold;font-size:13px');

  const STORE_KEY = 'tool.pet-food.v1';
  const DEVICE_KEY = 'tool.pet-food.deviceId';
  const API_BASE  = 'https://zircon-urge.fly.dev/api/pet-food';

  // ===== Identity =====
  function getDeviceId() {
    let id = '';
    try { id = localStorage.getItem(DEVICE_KEY) || ''; } catch (_) {}
    if (!id || id.length < 8) {
      // Crypto-strong random; falls back to Math.random if needed
      let bytes;
      try {
        bytes = new Uint8Array(16);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
      } catch (_) {
        bytes = new Uint8Array(16).map(() => Math.floor(Math.random() * 256));
      }
      id = 'd-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      try { localStorage.setItem(DEVICE_KEY, id); } catch (_) {}
    }
    return id;
  }
  const DEVICE_ID = getDeviceId();

  // ===== Backend API wrapper =====
  async function api(action, opts = {}) {
    const qs = new URLSearchParams({ action });
    if (opts.petId) qs.set('petId', opts.petId);
    const method = opts.method || (opts.body ? 'POST' : 'GET');
    const headers = { 'X-Device-Id': DEVICE_ID };
    // Attach this device's per-pet secret token so the backend can verify identity
    // (deviceId alone is known to all members and isn't enough to act as them).
    if (opts.petId) {
      const tp = state.pets.find(p => p.serverPetId === opts.petId);
      if (tp && tp.memberToken) headers['X-Pet-Token'] = tp.memberToken;
    }
    if (opts.body) headers['Content-Type'] = 'application/json';
    const r = await fetch(`${API_BASE}?${qs}`, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: 'parse_error', raw: text }; }
    // A 200 with an unparseable/garbage body is NOT success — must be retriable, never
    // treated as a landed write (else the outbox would drop the op on a fake success).
    if (!r.ok || !data || data.ok === false || data.error === 'parse_error') {
      const err = new Error((data && data.error) || `http_${r.status}`);
      err.status = r.status;
      err.code = data && data.error;   // lets the outbox tell terminal rejections from transient
      throw err;
    }
    return data;
  }
  // For user-initiated one-shot ops NOT in the durable entry-outbox (member/role/transfer/
  // leave/regenerate + time-change): retry a TRANSIENT failure (network / 5xx / 429 / 503
  // write-contention / parse_error) a few times so a dropped POST isn't silently lost. A
  // TERMINAL 4xx (invalid op) throws immediately — no pointless retry. Pass a stable opId in
  // the body for any non-idempotent op (propose-time-change) so a retry can't duplicate.
  async function apiRetry(action, opts, tries = 4) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try { return await api(action, opts); }
      catch (e) {
        lastErr = e;
        const st = e && e.status;
        if (st && st >= 400 && st < 500 && st !== 429) throw e;   // terminal (4xx≠429) → don't retry
        await new Promise(r => setTimeout(r, 250 * (i + 1) + Math.floor(Math.random() * 150)));
      }
    }
    throw lastErr;
  }
  const EMOJIS = ['🐱', '🐈', '🐈‍⬛', '🐕', '🐶', '🐰', '🐹', '🐭', '🦔', '🐦', '🦜', '🐢', '🐠'];   // 13 个 + 拍照格 = 14，正好铺满两行（每行 7）
  // 各物种干粮默认能量密度（kcal/g，可被用户覆盖）——粗略行业基线：猫粮≈3.8、狗粮略低、兔粮高纤偏低、雪貂高蛋白偏高。
  const KIBBLE_KCAL_DEFAULT = { cat: 3.8, dog: 3.5, rabbit: 2.6, hamster: 3.2, bird: 3.5, ferret: 4.2 };
  function kibbleDefaultFor(species) { return KIBBLE_KCAL_DEFAULT[species] || 3.8; }
  const DAY_MS = 86400000;

  // Recommended dry food intake (g per kg body weight per day for body-weight-aware species;
  // g/day for non body-weight-aware species like hamster). Very approximate baselines.
  const FOOD_REC = {
    cat: {
      label: '猫',
      bodyWeightAware: true,
      method: 'mer',   // RER=70·kg^0.75 × 生命阶段 MER 系数（AAHA/WSAVA），再换算成克
      merFactor: {
        kitten_young:    { min: 2.2, max: 2.75 },  // 0–4 月：生长（~2.5×RER）
        kitten:          { min: 1.8, max: 2.2 },   // 4–12 月：生长（~2.0×）
        adult_intact:    { min: 1.3, max: 1.5 },   // 1–7 岁未绝育（~1.4×）
        adult_neutered:  { min: 1.1, max: 1.3 },   // 1–7 岁已绝育（~1.2×）
        senior:          { min: 1.0, max: 1.2 },   // 7–11 岁
        geriatric:       { min: 1.0, max: 1.2 },   // 11 岁以上
      },
      breeds: {
        '英短':       { f: 0.95, aka: ['蓝猫', '蓝白', '金渐层', '银渐层'] },
        '美短':       { f: 1.00, aka: ['起司猫'] },
        '布偶':       { f: 1.10 },
        '缅因':       { f: 1.15, aka: ['缅因库恩'] },
        '暹罗':       { f: 1.10 },
        '阿比西尼亚': { f: 1.10, aka: ['兔猫'] },
        '波斯':       { f: 0.85 },
        '异国短毛':   { f: 0.85, aka: ['加菲猫'] },
        '斯芬克斯':   { f: 1.20, aka: ['无毛猫'] },
        '田园猫':     { f: 1.00, aka: ['中华田园猫', '土猫'] },
        '橘猫':       { f: 1.00, aka: ['大橘'] },
        '狸花猫':     { f: 1.00, aka: ['中国狸花'] },
      },
    },
    dog: {
      label: '狗',
      bodyWeightAware: true,
      method: 'mer',
      merFactor: {
        young:           { min: 2.0, max: 3.0 },   // 幼犬生长（4–12 月 ~2×，<4 月 ~3×）
        adult_intact:    { min: 1.7, max: 1.9 },   // 成年未绝育（~1.8×）
        adult_neutered:  { min: 1.5, max: 1.7 },   // 成年已绝育（~1.6×）
        senior:          { min: 1.2, max: 1.4 },   // 老年
      },
      breeds: {
        '泰迪 / 贵宾':   { f: 1.00 },
        '比熊':         { f: 1.00 },
        '吉娃娃':       { f: 1.00 },
        '博美':         { f: 1.00 },
        '柴犬':         { f: 1.00 },
        '柯基':         { f: 0.95, aka: ['威尔士柯基'] },
        '边境牧羊犬':   { f: 1.15, aka: ['边牧'] },
        '哈士奇':       { f: 1.20, aka: ['二哈'] },
        '萨摩耶':       { f: 1.10 },
        '阿拉斯加':     { f: 1.15 },
        '金毛':         { f: 1.05, aka: ['金毛寻回'] },
        '拉布拉多':     { f: 1.05, aka: ['拉拉'] },
        '德牧':         { f: 1.05, aka: ['德国牧羊犬'] },
        '杜宾':         { f: 1.05 },
        '大丹':         { f: 0.90 },
        '圣伯纳':       { f: 0.85 },
        '中华田园犬':   { f: 1.00, aka: ['土狗'] },
      },
    },
    rabbit: {
      label: '兔',
      bodyWeightAware: true,
      method: 'grams',
      note: '兔子应以无限量干草为主食；下面是「兔粮/颗粒」的建议限量（约体重的 1–2%），别拿它当全部口粮。',
      base: {
        young:           { min: 25, max: 50 },   // 幼兔生长，颗粒可多些
        adult_intact:    { min: 12, max: 25 },   // 成年限量（约体重 1–2%）
        adult_neutered:  { min: 12, max: 25 },
        senior:          { min: 12, max: 22 },
      },
      breeds: {
        '荷兰侏儒':     { f: 1.00 },
        '英国安哥拉':   { f: 1.05 },
        '垂耳兔':       { f: 1.00, aka: ['荷兰垂耳'] },
        '法兰德斯巨兔': { f: 1.10 },
        '熊猫兔':       { f: 1.00 },
        '狮子兔':       { f: 1.00 },
      },
    },
    hamster: {
      label: '仓鼠',
      bodyWeightAware: false,
      method: 'grams',
      note: '小宠能量数据有限，下面是大致参考；以自家鼠粮包装和体态为准。',
      base: {
        young:           { min: 8, max: 16 },
        adult_intact:    { min: 6, max: 12 },
        adult_neutered:  { min: 6, max: 12 },
        senior:          { min: 6, max: 10 },
      },
      breeds: {
        '叙利亚':         { f: 1.40, aka: ['金丝熊'] },
        '加卡利亚':       { f: 0.85, aka: ['三线'] },
        '坎贝尔':         { f: 0.85 },
        '冬白':           { f: 0.85 },
        '罗伯罗夫斯基':   { f: 0.70, aka: ['老婆鼠'] },
      },
    },
    bird: {
      label: '鸟（鹦鹉等）',
      bodyWeightAware: true,
      method: 'grams',
      note: '鸟类品种间差异极大，下面是大致参考；以自家鸟粮和体态为准。',
      base: {
        young:           { min: 80, max: 150 },
        adult_intact:    { min: 50, max: 100 },
        adult_neutered:  { min: 50, max: 100 },
        senior:          { min: 50, max: 90 },
      },
      breeds: {
        '虎皮鹦鹉':   { f: 0.90 },
        '玄凤鹦鹉':   { f: 1.00, aka: ['鸡尾鹦鹉'] },
        '牡丹鹦鹉':   { f: 1.00, aka: ['爱情鸟'] },
        '和尚鹦鹉':   { f: 1.05, aka: ['和尚'] },
        '太阳锥尾':   { f: 1.10, aka: ['小太阳'] },
        '灰鹦鹉':     { f: 1.10, aka: ['非洲灰'] },
        '金刚鹦鹉':   { f: 1.15 },
      },
    },
    ferret: {
      label: '雪貂',
      bodyWeightAware: true,
      method: 'kcalPerKg',   // 雪貂不套 RER，按每公斤体重 200–300 kcal/天（幼年更高）
      kcalPerKg: {
        young:           { min: 250, max: 380 },
        adult_intact:    { min: 200, max: 300 },
        adult_neutered:  { min: 200, max: 280 },
        senior:          { min: 180, max: 260 },
      },
      breeds: {},
    },
  };

  const ACTIVITY_FACTOR = { low: 0.8, normal: 1.0, high: 1.3 };   // 放宽活动量档差（原 ±15% 过窄）

  // Body weight unit (display), stored internally as kg
  const WEIGHT_UNITS = { kg: 1, '斤': 0.5, lb: 0.453592, g: 0.001 };
  function bwToKg(v, unit) { return v * (WEIGHT_UNITS[unit] || 1); }
  function bwFromKg(kg, unit) { return kg / (WEIGHT_UNITS[unit] || 1); }

  // Convert age (years) + species + neutered → stage key used by FOOD_REC.base
  function stageFromAge(species, age, neutered) {
    if (species === 'cat') {
      // Finer brackets for cats
      if (age < 0.33) return 'kitten_young';                            // < 4 months
      if (age < 1)    return 'kitten';                                  // 4–12 months
      if (age < 7)    return neutered ? 'adult_neutered' : 'adult_intact';
      if (age < 11)   return 'senior';                                  // 7–11 years
      return 'geriatric';                                               // ≥ 11 years
    }
    let bracket;
    if (species === 'rabbit')       bracket = age < 0.5  ? 'young' : age < 5   ? 'adult' : 'senior';
    else if (species === 'hamster') bracket = age < 0.08 ? 'young' : age < 1.5 ? 'adult' : 'senior';
    else if (species === 'bird')    bracket = age < 1    ? 'young' : age < 10  ? 'adult' : 'senior';
    else /* dog, ferret */          bracket = age < 1    ? 'young' : age < 7   ? 'adult' : 'senior';
    if (bracket === 'adult') return neutered ? 'adult_neutered' : 'adult_intact';
    return bracket;
  }
  function combineAge(years, months) {
    const y = parseFloat(years);
    const m = parseFloat(months);
    const yv = Number.isFinite(y) ? y : 0;
    const mv = Number.isFinite(m) ? m : 0;
    if (yv === 0 && mv === 0) return null;
    return yv + mv / 12;
  }
  function splitAge(ageYears) {
    if (!Number.isFinite(ageYears) || ageYears <= 0) return { years: '', months: '' };
    const y = Math.floor(ageYears);
    let m = Math.round((ageYears - y) * 12);
    if (m === 12) return { years: y + 1, months: 0 };
    return { years: y, months: m };
  }

  // Unit conversion (to grams)
  const UNITS = {
    g:  1,
    kg: 1000,
    oz: 28.3495,
    lb: 453.592,
  };
  function toGrams(v, unit) { return v * (UNITS[unit] || 1); }
  function fromGrams(g, unit) { return g / (UNITS[unit] || 1); }

  let _storageWarnShown = false;
  function showStorageWarn() {
    if (_storageWarnShown) return;
    _storageWarnShown = true;
    const b = document.createElement('div');
    b.className = 'storage-warn';
    // Persistent (re-shows next time too): closing only hides this instance, the
    // flag resets so a later failed write surfaces it again.
    b.innerHTML = '⚠️ 存储空间已满，新记录会保存失败。请到「👤 我的档案 → 导出备份」存一份再清理旧数据。 <button type="button" class="close-btn">知道了</button>';
    b.querySelector('.close-btn').addEventListener('click', () => { b.remove(); _storageWarnShown = false; });
    document.body.appendChild(b);
  }

  const state = {
    pets: [],
    currentId: null,
    editingId: null,
    selectedEmoji: '🐱',
    pendingAvatar: null,    // dataURL while editing in modal
    historyOpen: false,
    period: 'today',
    intradayIso: null,       // 今日时段视图正在看的那天（null=今天/实时；不持久化，刷新回今天）
    customStart: null,
    customEnd: null,
    board: 'food',           // active board tab: food / weight / meow
    weightMethod: 'direct',  // weight entry method: direct / diff
    weightPeriod: '30',      // weight trend range: 30/90/180/365/all/custom
    weightCustomStart: null,
    weightCustomEnd: null,
    lastRenderedPetId: null, // for one-shot mode reset on pet switch
    contactNicknames: {},    // local-only nicknames you set for other members
  };

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (parsed && Array.isArray(parsed.pets)) {
        state.pets = parsed.pets;
        state.currentId = parsed.currentId || (state.pets[0] && state.pets[0].id) || null;
        if (parsed.period) state.period = parsed.period;
        if (parsed.customStart) state.customStart = parsed.customStart;
        if (parsed.customEnd) state.customEnd = parsed.customEnd;
        if (parsed.board) state.board = parsed.board;
        if (parsed.weightMethod) state.weightMethod = parsed.weightMethod;
        if (parsed.weightPeriod) state.weightPeriod = parsed.weightPeriod;
        if (parsed.weightCustomStart) state.weightCustomStart = parsed.weightCustomStart;
        if (parsed.weightCustomEnd) state.weightCustomEnd = parsed.weightCustomEnd;
        if (parsed.contactNicknames && typeof parsed.contactNicknames === 'object') {
          state.contactNicknames = parsed.contactNicknames;
        }
      }
    } catch (e) { /* */ }
    migratePets();
  }
  function crystallizeBowlSnapshots(pet) {
    // For any 含碗 entry missing the snapshotted bowlWeight, fill it from the
    // pet's current pet.bowlWeight (best-effort; only safe when pet.bowlWeight
    // is still a valid number for the entry's time period).
    if (pet.bowlWeight == null) return;
    (pet.entries || []).forEach(e => {
      if (e && e.withBowl && e.bowlWeight === undefined) {
        e.bowlWeight = pet.bowlWeight;
      }
    });
  }
  function migratePets() {
    state.pets.forEach(p => {
      if (p.showTargetOnChart === undefined) p.showTargetOnChart = true;
      if (!p.bodyWeightUnit) p.bodyWeightUnit = 'kg';
      if (!p.bowlUnit) p.bowlUnit = 'g';
      // Old schema treated bowlWeight=0 as "unset"; migrate to null.
      // (Any pre-existing 含碗 entries with bowlWeight=0 already returned null food weight,
      // so this changes nothing visible.)
      if (p.bowlWeight === 0) p.bowlWeight = null;
      // Capture pet.bowlWeight onto historical entries that lack the snapshot, so
      // future bowl changes don't retroactively rewrite their food weights.
      crystallizeBowlSnapshots(p);
      // Migrate deprecated lifeStage → ageYears + neutered
      if (p.ageYears === undefined && p.lifeStage) {
        if (p.lifeStage === 'young')              { p.ageYears = 0.5; p.neutered = false; }
        else if (p.lifeStage === 'adult_intact')  { p.ageYears = 3;   p.neutered = false; }
        else if (p.lifeStage === 'adult_neutered'){ p.ageYears = 3;   p.neutered = true;  }
        else if (p.lifeStage === 'senior')        { p.ageYears = 9;   p.neutered = true;  }
      }
      if (p.neutered === undefined) p.neutered = false;
      // Extras (treats/cans) folded into intake via kibble-equivalent grams.
      if (!Number.isFinite(p.kibbleKcalPerG) || p.kibbleKcalPerG <= 0) p.kibbleKcalPerG = 3.8;
      if (!Array.isArray(p.entries)) p.entries = [];   // 最核心的字段也要兜底，否则 render() 里 [...pet.entries] 会崩
      if (!Array.isArray(p.foodLibrary)) p.foodLibrary = [];
      if (!Array.isArray(p.foodGroups)) p.foodGroups = [];   // 食物折叠分组（组织用，不带换算系数）
      // Back-fill measure/unitLabel on library items from the first extras version
      // (which stored kcalPerUnit as per-piece) → count-based, unit "份".
      p.foodLibrary.forEach(f => {
        if (f && !f.measure) { f.measure = 'count'; if (!f.unitLabel) f.unitLabel = '份'; }
      });
      if (!Array.isArray(p.timeChanges)) p.timeChanges = [];
      if (!Array.isArray(p.tcSeen)) p.tcSeen = [];   // locally-dismissed timechange ids
      // Baseline for "new record" notifications: everything already here counts as
      // seen, so we only notify about records added after this device first saw the pet.
      if (typeof p.activitySeenAt !== 'number') p.activitySeenAt = Date.now();
      reconcileBodyWeight(p);   // latest weight-log entry drives pet.bodyWeight
      // Back-fill target from helper for legacy pets
      const hasTarget = (Number.isFinite(p.dailyTargetMin) && p.dailyTargetMin > 0) ||
                        (Number.isFinite(p.dailyTargetMax) && p.dailyTargetMax > 0);
      if (!hasTarget && p.species && p.ageYears > 0 && p.bodyWeight > 0) {
        const r = estimatorCompute({
          species: p.species, breed: p.breed || '',
          age: p.ageYears, bodyWeightKg: p.bodyWeight,
          activity: p.activity || 'normal', neutered: !!p.neutered,
        });
        if (r) { p.dailyTargetMin = r.min; p.dailyTargetMax = r.max; }
      }
      // Seed per-period target history: one period covering all existing data with the
      // current target. We can't reconstruct when past targets started (no such record ever
      // existed), so old buckets keep showing today's target — the stepped/historical line
      // only becomes truly accurate for changes made from here on (no back-dating).
      if (!Array.isArray(p.targetHistory)) {
        p.targetHistory = [];
        const hasT = (Number.isFinite(p.dailyTargetMin) && p.dailyTargetMin > 0) ||
                     (Number.isFinite(p.dailyTargetMax) && p.dailyTargetMax > 0);
        if (hasT) {
          const ts = (p.entries || []).map(e => e && e.ts).filter(Number.isFinite);
          const seedIso = ts.length ? isoDate(Math.min.apply(null, ts)) : todayBucketIso();
          p.targetHistory.push({
            from: seedIso,
            min: (p.dailyTargetMin != null) ? p.dailyTargetMin : null,
            max: (p.dailyTargetMax != null) ? p.dailyTargetMax : null,
          });
        }
      }
      delete p.lifeStage;
    });
  }
  function serializeState() {
    return {
      pets: state.pets,
      currentId: state.currentId,
      period: state.period,
      customStart: state.customStart,
      customEnd: state.customEnd,
      board: state.board,
      weightMethod: state.weightMethod,
      weightPeriod: state.weightPeriod,
      weightCustomStart: state.weightCustomStart,
      weightCustomEnd: state.weightCustomEnd,
      contactNicknames: state.contactNicknames,
    };
  }
  // Returns true if the write landed, false if storage is full. Callers that just
  // added a record should check this and roll back + warn on false, so the UI never
  // says "已记录" for something that actually got dropped.
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(serializeState()));
      return true;
    } catch (e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) showStorageWarn();
      return false;
    }
  }
  // Add a record and persist atomically: if storage is full, roll the record back
  // out so we never tell the user "已记录" for something that didn't actually save.
  function commitNewEntry(pet, newEntry) {
    pet.entries.push(newEntry);
    recordsDay = null;   // 新记一笔 → 记录区跳回今天，好看到刚记的这条
    if (!persist()) {
      pet.entries.pop();
      alert('存储空间已满，这条没能保存。\n请到「👤 我的档案 → 导出备份」存一份，再清理旧数据后重试。');
      return false;
    }
    return true;
  }
  function uuid(prefix) { return (prefix || 'p') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtG(n) {
    if (!Number.isFinite(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 100) return Math.round(n).toString();
    return parseFloat(n.toFixed(1)).toString();
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function isoDate(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function parseIsoDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function shortMD(s) {
    const parts = s.split('-');
    return parseInt(parts[1], 10) + '/' + parseInt(parts[2], 10);
  }

  // foodWeight for an entry; null if it depends on bowlWeight that's unset
  function foodWeight(entry, pet) {
    if (!entry.withBowl) return entry.reading;
    // Use the bowl weight snapshotted on the entry (so editing pet.bowlWeight
    // later won't rewrite historical food weights). Fall back to pet.bowlWeight
    // for entries from before this field existed.
    const bw = (entry.bowlWeight !== undefined) ? entry.bowlWeight : pet.bowlWeight;
    if (bw == null) return null;
    return entry.reading - bw;
  }

  function bucketDateIso(ts) { return isoDate(ts); }
  function todayBucketIso() { return bucketDateIso(Date.now()); }
  function dayRangeMs(isoStr) {
    const d = parseIsoDate(isoStr);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return { start, end: start + DAY_MS };
  }

  // 算「吃了多少」的 delta 类型；每个 delta 同时带显示字段(type/entry)和数学字段(amount=等效干粮克数, startTs, endTs)。
  // startTs<endTs 表示这笔消耗匀速摊在这段时间里（作差链相邻两次之间 / 直接填的时间段）；相等=某一刻的一笔。
  const EAT_TYPES = new Set(['eat', 'remain-eat', 'extra']);
  function computeDeltas(pet) {
    const entries = pet.entries || [];
    const result = [];
    const kpg = kibbleKcalPerGOf(pet);
    // 按「食物容器」分组，每个容器各一条统一时间线：
    //   · 水平项（lvl）= 称重(weigh，干粮碗) / 记还剩(remain，其它食物) → 设绝对水平；
    //   · 直接填（fill = extra）→ 消耗一笔，并把该容器水平往下扣（补充机制）。
    // 这样「先称重→后直接填→再称重」时，下一次称重只对扣减后的水平作差，不重复计已直接填的量。
    // 干粮容器 id='kibble'，水平用 foodWeight(克)、1:1 折等效；其它食物水平用 reading(份/克)，按 kcalPerUnit/kpg 折等效。
    const containers = new Map();
    const C = fid => { if (!containers.has(fid)) containers.set(fid, { lvl: [], fill: [] }); return containers.get(fid); };
    entries.forEach(e => {
      const k = e.kind || 'weigh';
      if (k === 'weigh') C('kibble').lvl.push(e);
      else if (k === 'remain') C(e.foodId || e.foodName || '?').lvl.push(e);
      else if (k === 'extra') C(e.foodId || '__legacy__').fill.push(e);   // 无 foodId 的旧 extra → 独立桶（水平恒为 null，互不联动）
    });
    containers.forEach((c, fid) => {
      const isKibble = (fid === 'kibble');
      const timeline = [...c.lvl.map(e => ({ k: 'lvl', e })), ...c.fill.map(e => ({ k: 'fill', e }))].sort((a, b) => a.e.ts - b.e.ts);
      let level = null, prevTs = null;
      timeline.forEach(it => {
        const e = it.e;
        if (it.k === 'lvl') {
          const raw = isKibble ? foodWeight(e, pet) : Number(e.reading);
          const nl = (raw == null || !Number.isFinite(raw)) ? null : raw;
          if (nl === null) {
            result.push({ entry: e, ts: e.ts, type: isKibble ? 'unknown' : 'remain-first', amount: 0, foodWeight: null, prevTs: null, startTs: e.ts, endTs: e.ts });
          } else if (e.reset || level === null) {
            // 倒掉换新 或 第一条 → 这次的量作为新起点，不和上次作差、不计消耗
            result.push({ entry: e, ts: e.ts, type: isKibble ? 'first' : 'remain-first', amount: 0, foodWeight: isKibble ? nl : undefined, reset: !!e.reset, prevTs: null, startTs: e.ts, endTs: e.ts });
            level = nl; prevTs = e.ts;
          } else {
            const du = level - nl;
            if (du > 0) {
              const eq = isKibble ? du : du * (Number(e.kcalPerUnit) || 0) / kpg;
              result.push({ entry: e, ts: e.ts, type: isKibble ? 'eat' : 'remain-eat', amount: eq, unitsEaten: du, foodWeight: isKibble ? nl : undefined, prevTs, startTs: prevTs, endTs: e.ts });
            } else if (du < 0) {
              // 碗里/还剩 变多 = 添了粮（refill），amount 记添加量供「添了 X」显示；
              // eatenByDate/drawIntraday 按 type 过滤（refill 不在 EAT_TYPES），不会计入吃了。
              const added = isKibble ? (-du) : (-du) * (Number(e.kcalPerUnit) || 0) / kpg;
              result.push({ entry: e, ts: e.ts, type: isKibble ? 'refill' : 'remain-refill', amount: added, unitsEaten: du, foodWeight: isKibble ? nl : undefined, prevTs, startTs: e.ts, endTs: e.ts });
            } else {
              result.push({ entry: e, ts: e.ts, type: isKibble ? 'eat' : 'remain-eat', amount: 0, unitsEaten: 0, foodWeight: isKibble ? nl : undefined, prevTs, startTs: prevTs, endTs: e.ts });
            }
            level = nl; prevTs = e.ts;
          }
        } else {
          // 直接填一笔：消耗 kibbleEqG（有 tsEnd 则摊在时间段），并扣减该容器水平
          const eq = Number(e.kibbleEqG) || 0;
          const endTs = (Number.isFinite(e.tsEnd) && e.tsEnd > e.ts) ? e.tsEnd : e.ts;
          result.push({ entry: e, ts: e.ts, type: 'extra', amount: eq, foodWeight: null, prevTs: null, startTs: e.ts, endTs });
          if (level !== null) {
            const dec = isKibble ? (Number(e.count) || eq) : (Number(e.count) || 0);   // 扣减用食物原生单位（干粮=克、其它=份/克）
            level = Math.max(0, level - dec);
            prevTs = e.ts;   // 下一次称重/记还剩 从这笔之后、对扣减后的水平作差
          }
        }
      });
    });
    return result;
  }

  function eatenByDate(deltas) {
    const map = new Map();
    deltas.forEach(d => {
      if (!EAT_TYPES.has(d.type) || !(d.amount > 0)) return;
      const s = d.startTs, e = d.endTs;
      if (!(e > s)) {   // 某一刻的一笔：整笔归到那天
        const k = bucketDateIso(s);
        map.set(k, (map.get(k) || 0) + d.amount);
        return;
      }
      const rate = d.amount / (e - s);   // 摊在 [s,e]，跨天则按各天占比分
      let cursor = s;
      while (cursor < e) {
        const dayIso = bucketDateIso(cursor);
        const { end } = dayRangeMs(dayIso);
        const segEnd = Math.min(end, e);
        map.set(dayIso, (map.get(dayIso) || 0) + (segEnd - cursor) * rate);
        cursor = segEnd;
      }
    });
    return map;
  }

  // Returns the user's stored target range. If only one bound is set, both are equal (single line).
  function targetRange(pet) {
    let min = Number.isFinite(pet.dailyTargetMin) && pet.dailyTargetMin > 0 ? pet.dailyTargetMin : null;
    let max = Number.isFinite(pet.dailyTargetMax) && pet.dailyTargetMax > 0 ? pet.dailyTargetMax : null;
    if (min === null && max === null) return null;
    const lo = min !== null ? min : max;
    const hi = max !== null ? max : min;
    // If the user typed min > max, swap so the band/over-under logic doesn't invert.
    return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
  }
  // Normalize a raw (min,max) pair the same way targetRange does: single-bound → equal,
  // swap if inverted, null if neither set.
  function normTarget(min, max) {
    const lo0 = Number.isFinite(min) && min > 0 ? min : null;
    const hi0 = Number.isFinite(max) && max > 0 ? max : null;
    if (lo0 === null && hi0 === null) return null;
    const lo = lo0 !== null ? lo0 : hi0;
    const hi = hi0 !== null ? hi0 : lo0;
    return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
  }
  // Target range in effect on a given local-date ISO. Reads per-period targetHistory (each
  // {from,min,max} = "effective from that date until the next period"); falls back to the
  // current dailyTargetMin/Max mirror when no period covers the date. This is what lets each
  // trend bucket be judged against the target that was actually set at the time.
  function targetRangeAt(pet, iso) {
    const hist = Array.isArray(pet.targetHistory) ? pet.targetHistory : null;
    if (hist && hist.length) {
      let chosen = null;
      for (let i = 0; i < hist.length; i++) {
        const h = hist[i];
        if (h && typeof h.from === 'string' && h.from <= iso) {
          if (!chosen || h.from >= chosen.from) chosen = h;
        }
      }
      if (chosen) return normTarget(chosen.min, chosen.max);
      // iso is before the first recorded period → use the earliest period as best guess.
      let first = null;
      for (let i = 0; i < hist.length; i++) { const h = hist[i]; if (h && typeof h.from === 'string' && (!first || h.from < first.from)) first = h; }
      if (first) return normTarget(first.min, first.max);
    }
    return targetRange(pet);
  }
  // The one funnel for every target write: updates the current mirror AND records/updates
  // TODAY's period in targetHistory (no back-dating — a change always takes effect "today",
  // past buckets keep whatever period was in effect then). Used by manual edits AND the
  // weight-auto-follow path, so auto-follow changes also step the historical reference line.
  function setTarget(pet, min, max) {
    pet.dailyTargetMin = (min != null) ? min : null;
    pet.dailyTargetMax = (max != null) ? max : null;
    if (!Array.isArray(pet.targetHistory)) pet.targetHistory = [];
    const today = todayBucketIso();
    const rec = pet.targetHistory.find(h => h && h.from === today);
    if (rec) { rec.min = pet.dailyTargetMin; rec.max = pet.dailyTargetMax; }
    else pet.targetHistory.push({ from: today, min: pet.dailyTargetMin, max: pet.dailyTargetMax });
    pet.targetHistory.sort((a, b) => (a.from < b.from ? -1 : (a.from > b.from ? 1 : 0)));
  }

  // Smart estimator: pure formula from species/breed/age/bodyWeight/activity/neutered.
  function estimatorCompute(opts) {
    const sp = FOOD_REC[opts.species];
    if (!sp) return null;
    const age = Number.isFinite(opts.age) ? opts.age : parseFloat(opts.age);
    if (!Number.isFinite(age) || age < 0) return null;
    const stage = stageFromAge(opts.species, age, !!opts.neutered);
    const actAdj = ACTIVITY_FACTOR[opts.activity] || 1.0;
    let breedAdj = 1.0;
    if (opts.breed && sp.breeds && sp.breeds[opts.breed]) breedAdj = sp.breeds[opts.breed].f || 1.0;
    const method = sp.method || 'grams';

    // 能量法（猫/狗：RER=70·kg^0.75 × MER 系数；雪貂：kcal/kg）→ 先算 kcal/天，再按
    // 干粮能量密度换成「等效干粮克数」，与工具的 kcal 体系打通。
    if (method === 'mer' || method === 'kcalPerKg') {
      const bwKg = parseFloat(opts.bodyWeightKg);
      if (!Number.isFinite(bwKg) || bwKg <= 0) return null;
      let kcalMin, kcalMax;
      if (method === 'mer') {
        const rer = 70 * Math.pow(bwKg, 0.75);
        const f = sp.merFactor[stage]; if (!f) return null;
        kcalMin = rer * f.min; kcalMax = rer * f.max;
      } else {
        const f = sp.kcalPerKg[stage]; if (!f) return null;
        kcalMin = bwKg * f.min; kcalMax = bwKg * f.max;
      }
      kcalMin *= actAdj * breedAdj; kcalMax *= actAdj * breedAdj;
      const kpg = (Number.isFinite(opts.kibbleKcalPerG) && opts.kibbleKcalPerG > 0) ? opts.kibbleKcalPerG : kibbleDefaultFor(opts.species);
      return { min: kcalMin / kpg, max: kcalMax / kpg, kcalMin, kcalMax, note: sp.note || null };
    }

    // 克数启发式（兔颗粒限量 / 仓鼠 / 鸟——能量数据太散，不假装精确）
    const base = sp.base[stage];
    if (!base) return null;
    let mult = 1;
    if (sp.bodyWeightAware) {
      const bwKg = parseFloat(opts.bodyWeightKg);
      if (!Number.isFinite(bwKg) || bwKg <= 0) return null;
      mult = bwKg;
    }
    return { min: base.min * mult * breedAdj * actAdj, max: base.max * mult * breedAdj * actAdj, note: sp.note || null };
  }

  // Mismatch detection: returns { swapDelta, chosenDelta, chosenMag, swapMag, typical } or null
  function detectModeMismatch(pet, newReading, withBowlChosen) {
    if (pet.bowlWeight == null || pet.bowlWeight === 0 || pet.entries.length === 0) return null;
    const sorted = [...pet.entries].filter(e => (e.kind || 'weigh') === 'weigh').sort((a, b) => b.ts - a.ts);
    if (sorted.length === 0) return null;
    const prevEntry = sorted[0];
    const prevFood = foodWeight(prevEntry, pet);
    if (prevFood === null) return null;

    const chosenFood  = withBowlChosen ? (newReading - pet.bowlWeight) : newReading;
    const swappedFood = withBowlChosen ? newReading : (newReading - pet.bowlWeight);
    if (swappedFood < 0) return null; // swap would produce negative — not a sensible alternative

    const chosenDelta  = chosenFood  - prevFood;
    const swappedDelta = swappedFood - prevFood;
    const chosenMag  = Math.abs(chosenDelta);
    const swappedMag = Math.abs(swappedDelta);

    // Typical eat magnitude from history
    const deltas = computeDeltas(pet);
    const eats = deltas.filter(d => d.type === 'eat' && d.amount > 0).map(d => d.amount).sort((a, b) => a - b);
    let typical;
    if (eats.length >= 5) {
      typical = eats[Math.floor(eats.length * 0.75)] || 20;
    } else {
      typical = Math.max(20, pet.bowlWeight * 0.4);
    }

    // Flag only when chosen is much bigger AND swap is way better
    const tooBig    = chosenMag > Math.max(typical * 3, pet.bowlWeight * 0.6);
    const swapBetter = swappedMag < chosenMag * 0.45 && swappedMag < typical * 2.5;

    if (tooBig && swapBetter) {
      return { chosenDelta, swappedDelta, chosenMag, swapMag: swappedMag, typical };
    }
    return null;
  }

  // ===== DOM =====
  const $petTabs = document.getElementById('pet-tabs');
  const $petAdd = document.getElementById('pet-add');
  const $petAddMenu = document.getElementById('pet-add-menu');
  const $petAddWrap = document.getElementById('pet-add-wrap');
  const $emptyJoin = document.getElementById('empty-join');
  const $petEmpty = document.getElementById('pet-empty');
  const $petView = document.getElementById('pet-view');
  const $emptyAdd = document.getElementById('empty-add');

  const $scToday = document.getElementById('sc-today');
  const $scCount = document.getElementById('sc-count');
  const $scAvg = document.getElementById('sc-avg');
  const $scAvgLbl = document.getElementById('sc-avg-lbl');
  const $scBowl = document.getElementById('sc-bowl');
  const $cardBowl = document.getElementById('card-bowl');
  const $firstHint = document.getElementById('first-hint');

  const $recStrip = document.getElementById('rec-strip');
  const $recTitle = document.getElementById('rec-title');
  const $recNow = document.getElementById('rec-now');
  const $recBand = document.getElementById('rec-band');
  const $recFill = document.getElementById('rec-fill');
  const $recMarker = document.getElementById('rec-marker');

  const $reading = document.getElementById('reading');
  const $unitPick = document.getElementById('unit-pick');
  const $modeToggle = document.getElementById('mode-toggle');
  const $saveEntry = document.getElementById('save-entry');
  const $bowlWeight = document.getElementById('bowl-weight');
  const $bowlWeightUnit = document.getElementById('bowl-weight-unit');
  const $bowlRow = document.getElementById('bowl-row');
  const $modeBowlRow = document.getElementById('mode-bowl-row');
  const $chartRangeLbl = document.getElementById('chart-range-lbl');

  const $weightInput = document.getElementById('weight-input');
  const $weightUnit = document.getElementById('weight-unit');
  const $weightSave = document.getElementById('weight-save');
  const $weightTimeToggle = document.getElementById('weight-time-toggle');
  const $weightTimeVal = document.getElementById('weight-time-val');
  const $weightHero = document.getElementById('weight-hero');
  const $weightHeroRule = document.getElementById('weight-hero-rule');
  const $whNum = document.getElementById('wh-num');
  const $whUnit = document.getElementById('wh-unit');
  const $whSub = document.getElementById('wh-sub');
  const $weightChart = document.getElementById('weight-chart');
  const $weightEmpty = document.getElementById('weight-empty');
  const $weightList = document.getElementById('weight-list');
  const $weightPage = document.getElementById('weight-page');
  const $weightPageSelect = document.getElementById('weight-page-select');
  const $weightPageTotal = document.getElementById('weight-page-total');
  const $weightPagePrev = document.getElementById('weight-page-prev');
  const $weightPageNext = document.getElementById('weight-page-next');
  let weightPage = 0;
  let lastWeightPetId = null;
  const WEIGHT_PAGE_SIZE = 8;
  const $weightMethod = document.getElementById('weight-method');
  const $weightSingle = document.getElementById('weight-single');
  const $weightDiff = document.getElementById('weight-diff');
  const $weightDiffA = document.getElementById('weight-diff-a');
  const $weightDiffB = document.getElementById('weight-diff-b');
  const $weightDiffUnit = document.getElementById('weight-diff-unit');
  const $weightDiffUnitEcho = document.getElementById('weight-diff-unit-echo');
  const $weightDiffResult = document.getElementById('weight-diff-result');
  const $weightRangeLbl = document.getElementById('weight-range-lbl');
  const $weightTrendTabs = document.getElementById('weight-trend-tabs');
  const $weightTrendCustom = document.getElementById('weight-trend-custom');
  const $weightCustomStart = document.getElementById('weight-custom-start');
  const $weightCustomEnd = document.getElementById('weight-custom-end');
  const $boardTabs = document.getElementById('board-tabs');
  const $linkToastMount = document.getElementById('link-toast-mount');

  const $foodSelector = document.getElementById('food-selector');
  const $entryCols = document.getElementById('entry-cols');
  const $foodPickerTrigger = document.getElementById('food-picker-trigger');
  const $unitSuffix = document.getElementById('unit-suffix');
  const $extraEqRow = document.getElementById('extra-eq-row');
  const $extraEq = document.getElementById('extra-eq');
  const $timeToggle = document.getElementById('time-toggle');
  const $timeVal = document.getElementById('time-val');
  const $methodToggle = document.getElementById('method-toggle');
  const $mtDirectLbl = document.getElementById('mt-direct-lbl');
  const $mtDiffLbl = document.getElementById('mt-diff-lbl');
  const $timeAddEnd = document.getElementById('time-add-end');
  const $timeEndToggle = document.getElementById('time-end-toggle');
  const $timeEndVal = document.getElementById('time-end-val');
  const $timeEndClear = document.getElementById('time-end-clear');
  const $resetRow = document.getElementById('reset-row');
  const $resetCheck = document.getElementById('reset-check');

  // Time-picker modal
  const $tpModal = document.getElementById('time-picker-modal');
  const $tpTitle = document.getElementById('tp-title');
  const $tpDate = document.getElementById('tp-date');
  const $tpTime = document.getElementById('tp-time');
  const $tpNow = document.getElementById('tp-now');
  const $tpCancel = document.getElementById('tp-cancel');
  const $tpConfirm = document.getElementById('tp-confirm');

  // Food (treat/can) modal
  const $foodModal = document.getElementById('food-modal');
  const $fmTitle = document.getElementById('fm-title');
  const $fmName = document.getElementById('fm-name');
  const $fmGroup = document.getElementById('fm-group');
  const $fmEmojiPick = document.getElementById('fm-emoji-pick');
  const $fmMeasure = document.getElementById('fm-measure');
  const $fmUnitLabelField = document.getElementById('fm-unit-label-field');
  const $fmUnitLabel = document.getElementById('fm-unit-label');
  const $fmUnitEcho = document.getElementById('fm-unit-echo');
  const $fmUnitEcho2 = document.getElementById('fm-unit-echo2');
  const $fmSource = document.getElementById('fm-source');
  const $fmDirectBlock = document.getElementById('fm-direct-block');
  const $fmCountFields = document.getElementById('fm-count-fields');
  const $fmGramFields = document.getElementById('fm-gram-fields');
  const $fmKcalCount = document.getElementById('fm-kcal-count');
  const $fmKcal100g = document.getElementById('fm-kcal-100g');
  const $fmAnalysisBlock = document.getElementById('fm-analysis-block');
  const $fmGramsPerUnitField = document.getElementById('fm-grams-per-unit-field');
  const $fmGramsPerUnit = document.getElementById('fm-grams-per-unit');
  const $fmAnProtein = document.getElementById('fm-an-protein');
  const $fmAnFat = document.getElementById('fm-an-fat');
  const $fmAnMoisture = document.getElementById('fm-an-moisture');
  const $fmAnAsh = document.getElementById('fm-an-ash');
  const $fmAnFiber = document.getElementById('fm-an-fiber');
  const $fmEstResult = document.getElementById('fm-est-result');
  const $fmBasisNote = document.getElementById('fm-basis-note');
  const $fmEquivBlock = document.getElementById('fm-equiv-block');
  const $fmEquivCount = document.getElementById('fm-equiv-count');
  const $fmEquivGramField = document.getElementById('fm-equiv-gram-field');
  const $fmEquivGrams = document.getElementById('fm-equiv-grams');
  const $fmEquivGrams100 = document.getElementById('fm-equiv-grams100');
  const $fmUnitEcho3 = document.getElementById('fm-unit-echo3');
  const $fmSourceEquiv = document.getElementById('fm-source-equiv');
  const $fmDelete = document.getElementById('fm-delete');
  const $fmCancel = document.getElementById('fm-cancel');
  const $fmSave = document.getElementById('fm-save');
  const $fmMeasureField = document.getElementById('fm-measure-field');
  const $fmKibbleHint = document.getElementById('fm-kibble-hint');

  const $inboxBtn = document.getElementById('inbox-btn');
  const $inboxDot = document.getElementById('inbox-dot');
  const $inboxModal = document.getElementById('inbox-modal');
  const $inboxList = document.getElementById('inbox-list');
  const $inboxClose = document.getElementById('inbox-close');

  const $entriesToday = document.getElementById('entries-today');
  const $entriesHistory = document.getElementById('entries-history');
  const $toggleHistory = document.getElementById('toggle-history');
  const $recCur = document.getElementById('rec-cur');
  const $recDate = document.getElementById('rec-date');
  const $recPrev = document.getElementById('rec-prev');
  const $recNext = document.getElementById('rec-next');
  const $recTotal = document.getElementById('rec-total');
  let recordsDay = null;   // 记录区正在看的那天（null=今天）；按日翻用
  let lastRecordsPetId = null;   // 切换宠物时把记录区跳回今天
  const $trendChart = document.getElementById('trend-chart');
  const $trendTabs = document.getElementById('trend-tabs');
  const $trendCustom = document.getElementById('trend-custom');
  const $customStart = document.getElementById('custom-start');
  const $customEnd = document.getElementById('custom-end');
  const $trendDaynav = document.getElementById('trend-daynav');
  const $dnPrev = document.getElementById('dn-prev');
  const $dnNext = document.getElementById('dn-next');
  const $dnDate = document.getElementById('dn-date');
  const $dnToday = document.getElementById('dn-today');
  const $chartMeta = document.getElementById('chart-meta');
  const $chartTip = document.getElementById('chart-tip');

  const $modal = document.getElementById('pet-modal');
  const $pmTitle = document.getElementById('pm-title');
  const $pmName = document.getElementById('pm-name');
  const $pmTargetMin = document.getElementById('pm-target-min');
  const $pmTargetMax = document.getElementById('pm-target-max');
  const $pmKibbleKcal = document.getElementById('pm-kibble-kcal');
  const $pmConvBase = document.getElementById('pm-conv-base');
  const $pmTgtUnitMin = document.getElementById('pm-tgt-unit-min');
  const $pmTgtUnitMax = document.getElementById('pm-tgt-unit-max');
  const $chartTargetToggle = document.getElementById('chart-target-toggle');
  const $pmSpecies = document.getElementById('pm-species');
  const $pmBreed = document.getElementById('pm-breed'); // hidden input
  const $pmBreedSelect = document.getElementById('pm-breed-select');
  const $pmBreedTrigger = document.getElementById('pm-breed-trigger');
  const $pmBreedLabel = document.getElementById('pm-breed-label');
  const $pmBreedMenu = document.getElementById('pm-breed-menu');
  const $pmAgeYears = document.getElementById('pm-age-years');
  const $pmAgeMonths = document.getElementById('pm-age-months');
  const $pmBodyWeight = document.getElementById('pm-body-weight');
  const $pmBodyWeightUnit = document.getElementById('pm-body-weight-unit');
  const $pmActivity = document.getElementById('pm-activity');
  const $pmNeutered = document.getElementById('pm-neutered');
  const $pmRecPreview = document.getElementById('pm-rec-preview');
  const $pmSpeciesNote = document.getElementById('pm-species-note');
  const $pmRecApply = document.getElementById('pm-rec-apply');
  const $pmSave = document.getElementById('pm-save');
  const $pmCancel = document.getElementById('pm-cancel');
  const $pmDelete = document.getElementById('pm-delete');
  const $intakeModal = document.getElementById('intake-modal');
  const $imPetAv = document.getElementById('im-pet-av');
  const $imPetName = document.getElementById('im-pet-name');
  const $imPetSub = document.getElementById('im-pet-sub');
  const $imEditProfile = document.getElementById('im-edit-profile');
  const $imKibbleField = document.getElementById('im-kibble-field');
  const $imCancel = document.getElementById('im-cancel');
  const $imSave = document.getElementById('im-save');
  // 档案必填项的 .field 容器（红框校验用）
  const $pmNameField = $pmName.closest('.field');
  const $pmSpeciesField = $pmSpecies.closest('.field');
  const $pmBreedField = $pmBreedSelect.closest('.field');
  const $pmAgeField = $pmAgeYears.closest('.field');
  const $pmWeightField = $pmBodyWeight.closest('.field');
  function pmSetErr(field, msg) {
    if (!field) return;
    field.classList.add('invalid');
    let e = field.querySelector('.field-err');
    if (!e) { e = document.createElement('div'); e.className = 'field-err'; field.appendChild(e); }
    e.textContent = msg;
  }
  function pmClearErr(field) {
    if (!field) return;
    field.classList.remove('invalid');
    const e = field.querySelector('.field-err'); if (e) e.remove();
  }
  function pmClearAllErrors() {
    [$pmNameField, $pmSpeciesField, $pmBreedField, $pmAgeField, $pmWeightField].forEach(pmClearErr);
  }
  const $pmAvatarRow = document.getElementById('pm-avatar-row');
  const $pmAvatarFile = document.getElementById('pm-avatar-file');
  const $pmPhotoBtn = document.getElementById('pm-photo-btn');
  const $pmPhotoIcon = document.getElementById('pm-photo-icon');
  const $pmPhotoThumb = document.getElementById('pm-photo-thumb');

  const $pmShareSection = document.getElementById('pm-share-section');
  const $pmShareBlock = document.getElementById('pm-share-block');
  const $pmShareCreate = document.getElementById('pm-share-create');
  const $pmShareExisting = document.getElementById('pm-share-existing');
  const $pmShareCode = document.getElementById('pm-share-code');
  const $pmMakeShared = document.getElementById('pm-make-shared');
  const $pmCopyCode = document.getElementById('pm-copy-code');
  const $pmRegenCode = document.getElementById('pm-regen-code');
  const $pmMembersList = document.getElementById('pm-members-list');
  const $pmYourRole = document.getElementById('pm-your-role');

  const $profileBtn = document.getElementById('profile-btn');
  const $profileModal = document.getElementById('profile-modal');
  const $profileNickname = document.getElementById('profile-nickname');
  const $profileClose = document.getElementById('profile-close');
  const $myPetsList = document.getElementById('my-pets-list');

  const $joinModal = document.getElementById('join-modal');
  const $joinCode = document.getElementById('join-code');
  const $joinCancel = document.getElementById('join-cancel');
  const $joinConfirm = document.getElementById('join-confirm');

  const $cropModal = document.getElementById('crop-modal');
  const $cropStage = document.getElementById('crop-stage');
  const $cropImg = document.getElementById('crop-img');
  const $cropFrame = document.getElementById('crop-frame');
  const $cropCancel = document.getElementById('crop-cancel');
  const $cropApply = document.getElementById('crop-apply');

  const $mmModal = document.getElementById('mismatch-modal');
  const $mmBody = document.getElementById('mm-body');
  const $mmKeep = document.getElementById('mm-keep');
  const $mmSwap = document.getElementById('mm-swap');

  // Build avatar picker: photo button (already in HTML) + emoji cells
  EMOJIS.forEach(em => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'avatar-cell emoji-cell';
    b.dataset.emoji = em;
    b.textContent = em;
    b.addEventListener('click', () => {
      state.pendingAvatar = null;
      state.selectedEmoji = em;
      updateAvatarSelection();
    });
    $pmAvatarRow.appendChild(b);
  });
  $pmPhotoBtn.addEventListener('click', () => $pmAvatarFile.click());

  function updateAvatarSelection() {
    if (state.pendingAvatar) {
      $pmPhotoThumb.src = state.pendingAvatar;
      $pmPhotoThumb.style.display = '';
      $pmPhotoIcon.style.display = 'none';
      $pmPhotoBtn.classList.add('selected');
    } else {
      $pmPhotoThumb.removeAttribute('src');
      $pmPhotoThumb.style.display = 'none';
      $pmPhotoIcon.style.display = '';
      $pmPhotoBtn.classList.remove('selected');
    }
    $pmAvatarRow.querySelectorAll('.emoji-cell').forEach(b => {
      b.classList.toggle('selected', !state.pendingAvatar && b.dataset.emoji === state.selectedEmoji);
    });
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('读取失败'));
      r.readAsDataURL(file);
    });
  }

  // ===== Estimator (helper to fill target range) =====
  // Build the custom-select dropdown for breed; closed-state shows short name only,
  // open menu shows aliases in parens.
  function buildBreedDropdown(species, selected) {
    const sp = FOOD_REC[species];
    $pmBreedMenu.innerHTML = '';
    const addItem = (value, full, short) => {
      const li = document.createElement('li');
      li.dataset.value = value;
      li.textContent = full;
      if (value === (selected || '')) li.classList.add('selected');
      li.addEventListener('click', () => selectBreedItem(value, short));
      $pmBreedMenu.appendChild(li);
    };
    addItem('', '', '');
    if (sp && sp.breeds) {
      Object.keys(sp.breeds).forEach(b => {
        const info = sp.breeds[b];
        const full = (info.aka && info.aka.length) ? `${b}（${info.aka.join(' / ')}）` : b;
        addItem(b, full, b);
      });
    }
    addItem('其他 / 不确定', '其他 / 不确定', '其他 / 不确定');   // 兜底项：品种必填又不在列表（含雪貂无品种）时可选
    // Set initial label / value
    const known = sp && sp.breeds && sp.breeds[selected];
    const validSelected = selected && (known || selected === '其他 / 不确定') ? selected : '';
    $pmBreed.value = validSelected;
    $pmBreedLabel.textContent = validSelected || '';
    $pmBreedLabel.classList.toggle('placeholder', !validSelected);
  }
  function selectBreedItem(value, shortLabel) {
    $pmBreed.value = value;
    $pmBreedLabel.textContent = shortLabel;
    $pmBreedLabel.classList.toggle('placeholder', value === '');
    $pmBreedMenu.querySelectorAll('li').forEach(li => {
      li.classList.toggle('selected', li.dataset.value === value);
    });
    $pmBreedSelect.classList.remove('open');
    if (value) pmClearErr($pmBreedField);
  }
  $pmBreedTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    $pmBreedSelect.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!$pmBreedSelect.contains(e.target)) $pmBreedSelect.classList.remove('open');
  });
  // 用户开始填写就消掉对应红框
  $pmName.addEventListener('input', () => pmClearErr($pmNameField));
  $pmSpecies.addEventListener('change', () => pmClearErr($pmSpeciesField));
  [$pmAgeYears, $pmAgeMonths].forEach(el => el.addEventListener('input', () => pmClearErr($pmAgeField)));
  $pmBodyWeight.addEventListener('input', () => pmClearErr($pmWeightField));

  // ===== 弹窗里「每日目标」跟随换算基准 =====
  // pmTargetG 缓存 canonical 等效干粮克数（真值）；输入框只是它在当前基准单位下的显示。
  // 改基准下拉 / 改干粮热量 → 从缓存按新倍率重渲染；保存直接读缓存（无需反算）。
  let pmBaseId = 'kibble';
  let pmTargetG = { min: null, max: null };
  let intakeEditId = null;   // 食量设置弹窗当前编辑的宠物（与档案弹窗的 state.editingId 分开）
  function pmEditingPet() { return intakeEditId ? state.pets.find(p => p.id === intakeEditId) : null; }
  // 从「已保存的档案」算每日推荐食量（克干粮/天）——食量设置弹窗用，不读档案弹窗的 DOM
  function estimatorFromPet(pet) {
    if (!pet) return null;
    return estimatorCompute({
      species: pet.species || '', breed: pet.breed || '',
      age: pet.ageYears, bodyWeightKg: pet.bodyWeight,
      activity: pet.activity || 'normal', neutered: !!pet.neutered,
      kibbleKcalPerG: pet.kibbleKcalPerG,
    });
  }
  function pmKibbleKcalLive() { const v = parseFloat($pmKibbleKcal.value); return (Number.isFinite(v) && v > 0) ? v : 3.8; }
  function pmBaseFood(baseId) {
    const pet = pmEditingPet();
    if (baseId && baseId !== 'kibble' && pet) {
      const f = (pet.foodLibrary || []).find(x => x.id === baseId);
      if (f && Number.isFinite(f.kcalPerUnit) && f.kcalPerUnit > 0) return { kcalPerUnit: f.kcalPerUnit, measure: f.measure || 'count', unitLabel: f.unitLabel || '份' };
    }
    return { kcalPerUnit: pmKibbleKcalLive(), measure: 'gram', unitLabel: 'g' };   // 干粮基准 → kcalPerUnit=每克干粮大卡
  }
  function pmConvM(baseId) { return pmKibbleKcalLive() / pmBaseFood(baseId).kcalPerUnit; }   // 干粮基准 → 1
  function pmConvUnit(baseId) { const b = pmBaseFood(baseId); return b.measure === 'gram' ? 'g' : b.unitLabel; }
  function pmRenderTargetInputs() {
    const M = pmConvM(pmBaseId), u = pmConvUnit(pmBaseId);
    $pmTargetMin.value = (pmTargetG.min != null) ? parseFloat((pmTargetG.min * M).toFixed(1)) : '';
    $pmTargetMax.value = (pmTargetG.max != null) ? parseFloat((pmTargetG.max * M).toFixed(1)) : '';
    $pmTgtUnitMin.textContent = u; $pmTgtUnitMax.textContent = u;
  }

  function refreshEstimatorPreview() {
    const r = estimatorFromPet(pmEditingPet());
    if (!r) {
      $pmRecPreview.textContent = '完善宠物档案以估算';
      $pmRecPreview.classList.remove('has-value');
      $pmRecApply.disabled = true;
      $pmRecApply.dataset.min = '';
      $pmRecApply.dataset.max = '';
      if ($pmSpeciesNote) { $pmSpeciesNote.textContent = ''; $pmSpeciesNote.style.display = 'none'; }
      return;
    }
    const M = pmConvM(pmBaseId), u = pmConvUnit(pmBaseId);
    let txt = `估算 ${fmtG(r.min * M)} – ${fmtG(r.max * M)} ${u}/天`;
    if (Number.isFinite(r.kcalMin) && Number.isFinite(r.kcalMax)) txt += `（约 ${Math.round(r.kcalMin)}–${Math.round(r.kcalMax)} 大卡）`;
    $pmRecPreview.textContent = txt;
    $pmRecPreview.classList.add('has-value');
    $pmRecApply.disabled = false;
    $pmRecApply.dataset.min = String(r.min);   // dataset 仍存 canonical 克数
    $pmRecApply.dataset.max = String(r.max);
    if ($pmSpeciesNote) {
      if (r.note) { $pmSpeciesNote.textContent = r.note; $pmSpeciesNote.style.display = ''; }
      else { $pmSpeciesNote.textContent = ''; $pmSpeciesNote.style.display = 'none'; }
    }
  }
  $pmSpecies.addEventListener('change', () => {
    buildBreedDropdown($pmSpecies.value, '');
  });
  // 估算改成在「食量设置」弹窗里按已存档案算，故档案里的体型字段不再实时刷新估算预览。
  $pmRecApply.addEventListener('click', () => {
    const mn = parseFloat($pmRecApply.dataset.min);   // canonical 克数
    const mx = parseFloat($pmRecApply.dataset.max);
    pmTargetG.min = Number.isFinite(mn) ? mn : null;
    pmTargetG.max = Number.isFinite(mx) ? mx : null;
    pmRenderTargetInputs();                           // 按当前基准单位显示
    // Mark that the target now mirrors the recommendation — so it auto-follows
    // future body-weight changes (see maybeFollowRecommendation).
    recAppliedThisSession = true;
    targetEditedManually = false;
  });
  // Hand-editing the target means the user has taken manual control → stop auto-following.
  // 输入是当前基准单位，÷M 回到 canonical 克数存进缓存。
  $pmTargetMin.addEventListener('input', () => {
    const v = parseFloat($pmTargetMin.value);
    pmTargetG.min = (Number.isFinite(v) && v > 0) ? v / pmConvM(pmBaseId) : null;
    targetEditedManually = true; recAppliedThisSession = false;
  });
  $pmTargetMax.addEventListener('input', () => {
    const v = parseFloat($pmTargetMax.value);
    pmTargetG.max = (Number.isFinite(v) && v > 0) ? v / pmConvM(pmBaseId) : null;
    targetEditedManually = true; recAppliedThisSession = false;
  });
  function imToggleKibbleField() {
    // 「干粮每克大卡」只在主粮=干粮时填；选了某款罐头/猫条当主粮则隐藏（其能量在该食物里设）。
    if ($imKibbleField) $imKibbleField.style.display = (pmBaseId === 'kibble') ? '' : 'none';
  }
  // 改主粮下拉 / 改干粮热量 → 目标输入框与估算预览按新倍率重渲染（缓存的克数不变）。
  $pmConvBase.addEventListener('change', () => {
    pmBaseId = $pmConvBase.value || 'kibble';
    imToggleKibbleField();
    pmRenderTargetInputs();
    refreshEstimatorPreview();
    // Warn if a count-based food is picked as base (targets will show in absurd 份/天)
    if (pmBaseId !== 'kibble') {
      const pet = pmEditingPet() || currentPet();
      const food = (pet && pet.foodLibrary || []).find(f => f.id === pmBaseId);
      if (food && food.measure === 'count') {
        $pmConvBase.style.borderColor = 'var(--pet-danger)';
        $pmConvBase.parentElement.querySelector('.hint')?.remove();
        const hint = document.createElement('p');
        hint.className = 'hint'; hint.style.cssText = 'margin:0.3rem 0 0; color:var(--pet-danger);';
        hint.textContent = '⚠️ 「' + food.name + '」是按份记的，选了它每日目标会显示成「份/天」，建议还是用干粮当主粮。';
        $pmConvBase.parentElement.appendChild(hint);
        return;
      }
    }
    $pmConvBase.style.borderColor = '';
    $pmConvBase.parentElement.querySelector('.hint')?.remove();
  });
  $pmKibbleKcal.addEventListener('input', () => {
    pmRenderTargetInputs();
    refreshEstimatorPreview();
  });

  // Mode toggle
  $modeToggle.querySelectorAll('label').forEach(lbl => {
    lbl.addEventListener('click', e => {
      e.preventDefault();
      $modeToggle.querySelectorAll('label').forEach(l => l.classList.remove('active'));
      lbl.classList.add('active');
      lbl.querySelector('input').checked = true;
      checkFormWarn();
      // If switching to 含碗 with no bowl weight yet, focus the bowl input
      const pet = currentPet();
      if (lbl.dataset.val === '1' && pet && pet.bowlWeight == null) {
        setTimeout(() => $bowlWeight.focus(), 0);
      }
    });
  });
  function currentMode() {
    return $modeToggle.querySelector('label.active').dataset.val === '1';
  }
  function setMode(withBowl) {
    const v = withBowl ? '1' : '0';
    $modeToggle.querySelectorAll('label').forEach(l => {
      const on = l.dataset.val === v;
      l.classList.toggle('active', on);
      l.querySelector('input').checked = on;
    });
    checkFormWarn();
  }

  function checkFormWarn() {
    const pet = currentPet();
    const withBowl = pet ? currentMode() : false;
    // 空碗重量设置只在「含碗」且当前是干粮称重时出现；「不含碗」直接收起。
    const showBowl = (recordFood === 'kibble') && withBowl;
    $bowlRow.style.display = showBowl ? '' : 'none';
    $bowlRow.classList.remove('muted');
    $bowlRow.classList.toggle('needs-bowl', !!pet && showBowl && pet.bowlWeight == null);
  }

  function currentPet() {
    return state.pets.find(p => p.id === state.currentId) || null;
  }

  // ===== Role helpers =====
  function myRoleFor(pet) {
    if (!pet || !pet.shared) return 'owner';   // local pets: you're the owner
    const m = (pet.members || []).find(x => x.deviceId === DEVICE_ID);
    return m ? m.role : null;
  }
  function isOwner(pet)   { return myRoleFor(pet) === 'owner'; }
  function isAdminOrUp(pet) { const r = myRoleFor(pet); return r === 'owner' || r === 'admin'; }

  // Display name for any member of a pet, matching the member-list priority:
  // your local note (contactNicknames) → server nickname → short device id.
  // For yourself, prefer your fresh profile nickname.
  function memberDisplayName(pet, deviceId) {
    if (!deviceId) return '某人';
    const shortId = deviceId.slice(2, 10);
    if (deviceId === DEVICE_ID) {
      return (cachedProfile && cachedProfile.nickname) || shortId;
    }
    const m = (pet && pet.members || []).find(x => x.deviceId === deviceId);
    const localAlias = state.contactNicknames[deviceId];
    return localAlias || (m && m.nickname) || shortId;
  }

  // ===== Record-time editing helpers =====
  function tsToLocalInput(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
      + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function localInputToTs(str) {
    if (!str) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
  }
  // Can the current user change THIS entry's time at all?
  // owner/admin: any entry. regular: only entries they authored.
  function canEditEntryTime(e, pet) {
    const r = myRoleFor(pet);
    if (r === 'owner' || r === 'admin') return true;
    if (r === 'regular') return e.author === DEVICE_ID;
    return false;
  }

  // ===== Backend sync =====
  // Pet schema fields that get synced to backend metadata
  const META_FIELDS = [
    'name','emoji','avatar',
    'bowlWeight','bowlUnit',
    'dailyTargetMin','dailyTargetMax','targetHistory','showTargetOnChart','targetFollowsRecommendation',
    'species','breed','ageYears','bodyWeight','bodyWeightUnit','activity','neutered',
    'preferredUnit',
    'kibbleKcalPerG','kibble','foodLibrary','foodGroups','conversionBase',
  ];
  // PER-FIELD meta sync. pet._syncedMeta = the last-known SERVER value of each field.
  // A field is "dirty" iff its local value differs from _syncedMeta. petMetaPatch sends
  // ONLY dirty fields → two admins editing DIFFERENT fields don't clobber each other (the
  // backend merges per field). On pull we apply server values only for NON-dirty fields.
  function metaDirtyKeys(pet) {
    const synced = pet._syncedMeta || {};
    const out = [];
    META_FIELDS.forEach(k => { if (JSON.stringify(pet[k]) !== JSON.stringify(synced[k])) out.push(k); });
    return out;
  }
  function petMetaPatch(pet) {
    const patch = {};
    metaDirtyKeys(pet).forEach(k => { patch[k] = pet[k]; });
    return patch;
  }
  function markMetaSynced(pet, patch) {
    pet._syncedMeta = pet._syncedMeta || {};
    Object.keys(patch).forEach(k => { pet._syncedMeta[k] = patch[k]; });
  }
  // Fold a freshly-pulled server meta into the pet: adopt the server value for every field
  // we DON'T have a local unsynced edit on; keep (and later re-push) the ones we do. Also
  // (re)baselines _syncedMeta so future diffs are per-field.
  function applyServerMeta(pet, serverMeta) {
    if (!serverMeta) return;
    if (!pet._syncedMeta) {
      // First fold under the per-field scheme. Adopt server wholesale UNLESS a legacy
      // whole-pet dirty flag says we have an unsynced edit (then keep local; it'll diff-push).
      const hadLegacyDirty = pet._metaDirty === true;
      META_FIELDS.forEach(k => { if (!hadLegacyDirty && serverMeta[k] !== undefined) pet[k] = serverMeta[k]; });
      pet._syncedMeta = {};
      META_FIELDS.forEach(k => { pet._syncedMeta[k] = serverMeta[k]; });
      delete pet._metaDirty;   // retire the old boolean; dirtiness now derives from _syncedMeta
      return;
    }
    META_FIELDS.forEach(k => {
      const localDirty = JSON.stringify(pet[k]) !== JSON.stringify(pet._syncedMeta[k]);
      if (!localDirty && serverMeta[k] !== undefined) { pet[k] = serverMeta[k]; pet._syncedMeta[k] = serverMeta[k]; }
      // dirty field → keep local value, leave _syncedMeta stale so it still counts as dirty and gets pushed
    });
  }
  const metaPushTimers = {};   // per-pet debounce timer (id → handle), so editing pet B can't cancel pet A's pending push
  function schedulePushMeta(pet) {
    if (!pet || !pet.shared || !pet.serverPetId) return;
    // _metaSeq guards against an in-flight push marking fields synced when a newer edit
    // arrived during its await.
    pet._metaSeq = (pet._metaSeq || 0) + 1;
    const mySeq = pet._metaSeq;
    clearTimeout(metaPushTimers[pet.id]);
    metaPushTimers[pet.id] = setTimeout(async () => {
      const patch = petMetaPatch(pet);
      if (!Object.keys(patch).length) return;   // nothing changed
      try {
        await api('update', { petId: pet.serverPetId, body: { patch } });
        if (pet._metaSeq === mySeq) markMetaSynced(pet, patch);   // these fields now match server
      } catch (e) { /* swallow; fields stay dirty so pulls keep the local copy + retry later */ }
    }, 600);
  }
  // Push any pets whose local meta edits never reached the server (e.g. saved then
  // reloaded before the debounced push fired). Run before the first pull so the
  // initial sync can't overwrite an unsynced local edit.
  async function flushDirtyMeta() {
    await Promise.all(state.pets
      .filter(p => p.shared && p.serverPetId && metaDirtyKeys(p).length)
      .map(async p => {
        const patch = petMetaPatch(p);
        if (!Object.keys(patch).length) return;
        try {
          await api('update', { petId: p.serverPetId, body: { patch } });
          markMetaSynced(p, patch);
        } catch (e) { /* stays dirty; retried next session */ }
      }));
  }

  // Merge a server entries array onto a local one without dropping local records
  // that haven't reached the server yet (still queued in _pendingOps). Server wins
  // for matching ids; local-only ids are appended. Used by every sync path so none
  // of them can silently overwrite a not-yet-synced record.
  function mergeServerEntries(local, server, deleted) {
    const srv = Array.isArray(server) ? server : [];
    const tomb = new Set(Array.isArray(deleted) ? deleted : []);
    const serverIds = new Set(srv.map(e => e.id));
    const merged = srv.filter(e => !tomb.has(e.id));          // server is authoritative, minus tombstones
    (local || []).forEach(e => {
      if (serverIds.has(e.id)) return;                         // server has it → use server's copy
      if (tomb.has(e.id)) return;                              // deleted on server → drop, never resurrect
      merged.push(e);                                          // local-only, not deleted → keep (no data loss)
    });
    merged.sort((a, b) => (a.ts - b.ts) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));   // stable id tiebreak
    return merged;
  }

  async function pullSharedPets() {
    const shared = state.pets.filter(p => p.shared && p.serverPetId);
    if (shared.length === 0) return;
    await Promise.all(shared.map(async p => {
      try {
        await flushOps(p);   // push any queued records first, so the merge below doesn't look "local-only"
        const r = await api('get', { petId: p.serverPetId });
        // Per-field fold: adopt server values for fields with no local unsynced edit, keep
        // the ones we're mid-editing (they'll diff-push) — so a pull never reverts a just-
        // saved change, and two admins editing different fields both survive.
        if (r && r.pet) applyServerMeta(p, r.pet);
        if (r && Array.isArray(r.members)) {
          // Detect newcomers so the owner/members get a 「新成员加入」notice instead of
          // a stranger silently appearing. First pull baselines the whole roster.
          const ids = r.members.map(m => m.deviceId);
          if (!Array.isArray(p.knownMemberIds)) {
            p.knownMemberIds = ids;                       // baseline, no notice
          } else {
            const fresh = ids.filter(id => id !== DEVICE_ID && !p.knownMemberIds.includes(id));
            if (fresh.length) {
              p.pendingNewMembers = [...new Set([...(p.pendingNewMembers || []), ...fresh])];
              p.knownMemberIds = [...new Set([...p.knownMemberIds, ...fresh])];
            }
            // also absorb any departures so a re-join later re-notifies
            p.knownMemberIds = p.knownMemberIds.filter(id => ids.includes(id));
          }
          p.members = r.members;
        }
        if (typeof p.activitySeenAt !== 'number') p.activitySeenAt = Date.now();   // baseline so a fresh pull doesn't flag all history
        if (r && Array.isArray(r.entries)) {
          // Self-heal: any local record the server is missing (and that wasn't deleted) —
          // e.g. one lost to the OLD pre-atomic clobber bug — gets re-queued so it re-uploads
          // and reaches every member. Tombstoned (deleted) ids are never re-queued.
          const tomb = new Set(Array.isArray(r.deleted) ? r.deleted : []);
          const serverIds = new Set(r.entries.map(e => e.id));
          const pendingAddIds = new Set((p._pendingOps || []).filter(o => o.type === 'add' && o.entry).map(o => o.entry.id));
          (p.entries || []).forEach(e => {
            if (e && e.id && !serverIds.has(e.id) && !tomb.has(e.id) && !pendingAddIds.has(e.id)) {
              enqueueOp(p, { type: 'add', entry: e });
            }
          });
          p.entries = mergeServerEntries(p.entries, r.entries, r.deleted);
          reconcileBodyWeight(p);
          // bodyWeight is derived from weight ENTRIES (decision A), not an independent scalar
          // to sync — re-baseline its synced value so the reconciled number never looks
          // spuriously "dirty" and churns the meta push.
          if (p._syncedMeta) p._syncedMeta.bodyWeight = p.bodyWeight;
        }
        if (r && Array.isArray(r.timechanges)) p.timeChanges = r.timechanges;
        if (r && r.code) p.serverCode = r.code;
      } catch (e) {
        // 403 = kicked from members; 404 = pet deleted by owner — both: orphan locally
        if (e && (e.status === 403 || e.status === 404)) {
          state.pets = state.pets.filter(x => x.id !== p.id);
          if (state.currentId === p.id) state.currentId = (state.pets[0] || {}).id || null;
        }
      }
    }));
    persist();
  }

  // Reliable outbox: queue add/delete ops per pet and retry until the server
  // confirms. A dropped network push must NOT silently lose a record — otherwise
  // the recorder sees it locally but other members never do (the "5 recorded,
  // admin sees 3" bug). Ops persist to localStorage so they survive a reload.
  const _flushing = {};   // serverPetId -> bool, so one pet flushes one-at-a-time
  // Server error codes that mean "this op is INVALID and will never succeed" → safe to drop.
  // Anything else (transient 404/429/503, bad_token/not_member during a race, network,
  // parse_error) stays queued and retries, so a record is never silently lost.
  const TERMINAL_OP_ERRORS = new Set([
    'not_your_entry', 'no_permission', 'owner_only', 'missing_entry', 'missing_entry_id',
    'bad_ts', 'bad_decision', 'not_approvable', 'not_rejectable',
    'cannot_remove_owner', 'cannot_change_owner_role', 'bad_role', 'member_not_found',
  ]);
  function enqueueOp(pet, op) {
    pet._pendingOps = pet._pendingOps || [];
    if (!op.opId) op.opId = uuid('op');   // idempotency: retries can't duplicate on the server
    pet._pendingOps.push(op);
    persist();
    flushOps(pet);
  }
  async function flushOps(pet) {
    if (!pet || !pet.shared || !pet.serverPetId) return;
    if (_flushing[pet.serverPetId]) return;
    if (!pet._pendingOps || !pet._pendingOps.length) return;
    _flushing[pet.serverPetId] = true;
    try {
      while (pet._pendingOps && pet._pendingOps.length) {
        const op = pet._pendingOps[0];
        try {
          if (op.type === 'add') {
            const r = await api('add-entry', { petId: pet.serverPetId, body: { entry: op.entry, opId: op.opId } });
            // Landing verification: the server response must actually contain the record's
            // id before we drop it from the outbox. (Belt-and-suspenders now the backend is
            // atomic; catches any 200-with-wrong-body.)
            if (r && Array.isArray(r.entries) && !r.entries.some(e => e && e.id === op.entry.id)) {
              break;   // didn't land → keep queued, retry on next flush
            }
          } else if (op.type === 'del') {
            const r = await api('delete-entry', { petId: pet.serverPetId, body: { entryId: op.entryId, opId: op.opId } });
            if (r && Array.isArray(r.timechanges)) pet.timeChanges = r.timechanges;
          }
          pet._pendingOps.shift();   // server confirmed the write landed → drop from outbox
          persist();
        } catch (e) {
          // Only drop on an explicit TERMINAL rejection. Transient failures stay queued.
          if (TERMINAL_OP_ERRORS.has(e && e.code)) {
            pet._pendingOps.shift();
            persist();
            pullSharedPets().then(render).catch(() => {});
            continue;
          }
          break;   // network / transient (incl. bad_token/not_member during a race) → retry later
        }
      }
    } finally {
      _flushing[pet.serverPetId] = false;
    }
  }
  function pushAddEntry(pet, entry) {
    if (!pet.shared || !pet.serverPetId) return;
    enqueueOp(pet, { type: 'add', entry });
  }
  function pushDeleteEntry(pet, entryId) {
    if (!pet.shared || !pet.serverPetId) return;
    // If it was never synced (still queued as an add), just drop the add — no round-trip.
    if (pet._pendingOps) {
      const before = pet._pendingOps.length;
      pet._pendingOps = pet._pendingOps.filter(o => !(o.type === 'add' && o.entry && o.entry.id === entryId));
      if (pet._pendingOps.length !== before) { persist(); return; }
    }
    enqueueOp(pet, { type: 'del', entryId });
  }
  // Returns the server response (entries/timechanges) so callers can reconcile.
  async function pushProposeTimeChange(pet, entryId, newTs) {
    // opId (stable across retries) makes the tc-push idempotent so a retry can't create a duplicate.
    return apiRetry('propose-time-change', { petId: pet.serverPetId, body: { entryId, newTs, opId: uuid('op') } });
  }
  async function pushDecideTimeChange(pet, tcId, decision) {
    return apiRetry('decide-time-change', { petId: pet.serverPetId, body: { tcId, decision } });
  }

  function petIconHtml(p) {
    if (p.avatar) {
      return `<span class="pet-icon"><img src="${escapeHtml(p.avatar)}" alt=""></span>`;
    }
    return `<span class="pet-icon">${escapeHtml(p.emoji || '🐾')}</span>`;
  }

  // ===== Render =====
  function render() {
    if (state.pets.length === 0) {
      $petEmpty.style.display = '';
      $petView.style.display = 'none';
      $petTabs.innerHTML = '';
      return;
    }
    $petEmpty.style.display = 'none';
    $petView.style.display = '';
    setBoard(state.board);

    $petTabs.innerHTML = state.pets.map(p =>
      `<button type="button" class="pet-tab ${p.id === state.currentId ? 'active' : ''}" data-id="${p.id}">${petIconHtml(p)}<span>${escapeHtml(p.name)}</span></button>`
    ).join('');
    $petTabs.querySelectorAll('.pet-tab').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.id === state.currentId) {
          // Second click on the active tab → open档案 modal
          openModal(state.currentId);
        } else {
          state.currentId = b.dataset.id;
          persist();
          render();
        }
      });
    });

    const pet = currentPet();
    if (!pet) return;

    // Mode determination
    // - Bowl unset (null) → force 不含碗 (always, even mid-stream)
    // - Otherwise, only re-pick mode when pet changes; preserve user's manual toggling
    if (pet.bowlWeight == null && currentMode()) {
      setMode(false);
    } else if (state.lastRenderedPetId !== pet.id) {
      if (pet.bowlWeight == null) {
        setMode(false);
      } else {
        const weighs = [...pet.entries].filter(e => (e.kind || 'weigh') === 'weigh').sort((a, b) => b.ts - a.ts);
        if (weighs.length > 0) setMode(!!weighs[0].withBowl);
        else setMode(true);  // bowl set + no history → 含碗
      }
    }
    if (state.lastRenderedPetId !== pet.id) {
      recordFood = 'kibble'; // reset food picker on pet switch
      recordMethod = (getMethodPref(pet, 'kibble')) || defaultMethodFor('kibble');
      pendingEntryTsEnd = null;
    }
    state.lastRenderedPetId = pet.id;

    $unitPick.value = pet.preferredUnit || 'g';
    // placeholder is finalized by applyRecordFoodUI() below (depends on selected food)
    const bUnit = pet.bowlUnit || 'g';
    $bowlWeightUnit.value = bUnit;
    if (document.activeElement !== $bowlWeight) {
      if (pet.bowlWeight == null) {
        $bowlWeight.value = '';
      } else {
        $bowlWeight.value = parseFloat(fromGrams(pet.bowlWeight, bUnit).toFixed(3));
      }
    }
    checkFormWarn();

    const deltas = computeDeltas(pet);
    const eatenMap = eatenByDate(deltas);
    const todayIso = todayBucketIso();
    const todayEaten = eatenMap.get(todayIso) || 0;

    const { start: todayStart, end: todayEnd } = dayRangeMs(todayIso);
    const todayDeltas = deltas.filter(d => d.ts >= todayStart && d.ts < todayEnd);
    const todayCount = todayDeltas.length;   // 每条记录(称重/作差/直接填)各一笔

    const recent = lastNDays(7, todayIso);
    const recentExclToday = recent.filter(d => d !== todayIso);
    // Denominator = days that have ANY food record (not just days with net-eaten>0),
    // so a "no change" / 0-intake day you DID log still counts and doesn't bias the
    // average upward. Days you never recorded stay excluded.
    const recordedDays = new Set(deltas.map(d => bucketDateIso(d.ts)));
    let sum = 0, days = 0;
    recentExclToday.forEach(d => {
      if (recordedDays.has(d)) { sum += (eatenMap.get(d) || 0); days++; }
    });
    const avg = days > 0 ? sum / days : NaN;

    $scToday.textContent = fmtEq(pet, todayEaten);
    $scCount.textContent = todayCount;
    $scAvg.textContent = fmtEq(pet, avg);
    $scAvgLbl.textContent = days >= 1 ? `近 ${days} 日均` : '日均（无数据）';

    const weighEntries = [...pet.entries].filter(e => (e.kind || 'weigh') === 'weigh').sort((a, b) => b.ts - a.ts);
    const lastEntry = weighEntries[0] || null;
    // 没有过「称碗」记录（比如只用「直接填」的用户）就别显示「当前碗中剩」这张永远为空的卡
    if ($cardBowl) $cardBowl.style.display = lastEntry ? '' : 'none';
    // 新宠物还没有任何食量记录时，在录入区上方给一次性引导（记了第一笔就消失）
    if ($firstHint) {
      const hasFood = (pet.entries || []).some(e => { const k = e.kind || 'weigh'; return k === 'weigh' || k === 'extra' || k === 'remain'; });
      $firstHint.style.display = hasFood ? 'none' : '';
    }
    if (lastEntry) {
      const fw = foodWeight(lastEntry, pet);
      if (fw === null) {
        $scBowl.textContent = '? ' + convUnit(pet);
      } else {
        // 补充机制：最近一次称重之后的干粮「直接填」消耗，从碗中剩里扣掉
        const since = (pet.entries || []).filter(e => e.kind === 'extra' && e.foodId === 'kibble' && e.ts > lastEntry.ts)
          .reduce((s, e) => s + (Number(e.count) || Number(e.kibbleEqG) || 0), 0);
        $scBowl.textContent = fmtEq(pet, Math.max(0, fw - since));
      }
    } else {
      $scBowl.textContent = '— ' + convUnit(pet);
    }

    renderRecommendation(pet, todayEaten);
    renderTargetToggle(pet);
    applyEntryFormLock();
    renderRecords(pet, deltas, eatenMap);
    renderWeight(pet);
    renderTrend(deltas, pet);
    if (trendFsOpen) syncTrendFs();   // 全屏横向看图开着时，把这一帧镜像过去
    updateInboxBadge();
    if ($inboxModal.classList.contains('open')) renderInbox();   // live-refresh open inbox on new sync
    renderFoodSelector();
    applyRecordFoodUI();
    updateExtraEq();
  }

  function renderTargetToggle(pet) {
    const tr = targetRange(pet);
    if (!tr) { $chartTargetToggle.style.display = 'none'; return; }
    $chartTargetToggle.style.display = '';
    const on = pet.showTargetOnChart !== false;
    $chartTargetToggle.classList.toggle('active', on);
    $chartTargetToggle.textContent = on ? '✓ 目标参考线' : '目标参考线';
  }

  $chartTargetToggle.addEventListener('click', () => {
    const pet = currentPet();
    if (!pet) return;
    pet.showTargetOnChart = !(pet.showTargetOnChart !== false);
    persist();
    render();
  });

  function renderRecommendation(pet, todayEaten) {
    const rec = targetRange(pet);
    const canEdit = isAdminOrUp(pet);
    if (!rec) {
      // 没设目标：管理员看到「设定目标」入口（点开食量设置），普通成员则隐藏。
      if (!canEdit) { $recStrip.style.display = 'none'; return; }
      $recStrip.style.display = '';
      $recStrip.classList.add('editable', 'no-target');
      $recTitle.innerHTML = '🎯 点这里设定每日目标';
      $recNow.innerHTML = '';
      $recMarker.style.display = 'none';
      return;
    }
    $recStrip.classList.remove('no-target');
    $recStrip.style.display = '';
    const isPoint = rec.min === rec.max;
    const M = convM(pet), U = convUnit(pet);
    const titleText = isPoint
      ? `🎯 目标 ${fmtG(rec.min * M)} ${U}/天`
      : `🎯 目标 ${fmtG(rec.min * M)}–${fmtG(rec.max * M)} ${U}/天`;
    // 目标栏可点击修改（管理员及以上）：标题后挂个 ✎ 提示，整条加 editable 手势。
    $recTitle.innerHTML = titleText + (canEdit ? '<span class="rec-edit">✎ 改目标</span>' : '');
    $recStrip.classList.toggle('editable', canEdit);
    $recNow.innerHTML = `今日 <strong>${fmtEq(pet, todayEaten)}</strong>`;
    const scale = Math.max(rec.max * 1.3, todayEaten * 1.1, rec.max + 5);
    const bandLeft = (rec.min / scale) * 100;
    const bandWidth = Math.max(0.5, ((rec.max - rec.min) / scale) * 100);
    $recBand.style.left = bandLeft.toFixed(1) + '%';
    $recBand.style.width = bandWidth.toFixed(1) + '%';
    const fillW = Math.min(100, (todayEaten / scale) * 100);
    $recFill.style.width = fillW.toFixed(1) + '%';
    $recFill.classList.toggle('over', todayEaten > rec.max);
    $recFill.classList.toggle('under', todayEaten > 0 && todayEaten < rec.min);
    if (todayEaten > 0) {
      $recMarker.style.left = fillW.toFixed(1) + '%';
      $recMarker.style.display = '';
    } else {
      $recMarker.style.display = 'none';
    }
  }

  function lastNDays(n, fromIso) {
    const out = [];
    const baseIso = fromIso || todayBucketIso();
    const base = parseIsoDate(baseIso);
    for (let i = 0; i < n; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      out.push(d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()));
    }
    return out;
  }

  // Wire up the per-row delete (.er-del) and edit-time (.er-edit) buttons.
  // Shared by both the recent-list and the grouped history.
  function wireEntryButtons(container, pet) {
    container.querySelectorAll('.er-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = currentPet(); if (!p) return;
        const eid = btn.dataset.eid;
        const entry = (p.entries || []).find(x => x.id === eid);
        const kind = (entry && entry.kind) || 'weigh';
        // For weigh / remain entries that sit in a chain, warn about recomputation
        let confirmMsg = '删除这条记录？';
        if (kind === 'weigh' || kind === 'remain') {
          const sorted = [...p.entries].filter(e => (e.kind || 'weigh') === kind).sort((a, b) => a.ts - b.ts);
          const idx = sorted.findIndex(x => x.id === eid);
          if (idx > 0 && idx < sorted.length - 1) {
            confirmMsg = '删掉这条记录会重新计算它前后两次称重之间的「吃了多少」，确定删除？';
          }
        }
        if (!confirm(confirmMsg)) return;
        const snapshot = { id: eid, entry: Object.assign({}, entry) };  // shallow clone for undo
        p.entries = p.entries.filter(x => x.id !== eid);
        persist();
        render();
        pushDeleteEntry(p, eid);
        // Undo toast
        const entryLabel = kind === 'bodyweight' ? '⚖️ 体重' : '🍽️ 记录';
        showLinkToast('已删除一条' + entryLabel,
          () => { p.entries.push(snapshot.entry); p.entries.sort((a, b) => a.ts - b.ts); persist(); render(); });
      });
    });
    container.querySelectorAll('.er-edit').forEach(btn => {
      btn.addEventListener('click', () => promptEditTime(btn.dataset.eid));
    });
  }

  function renderEntriesList(container, items, pet, emptyTxt) {
    if (!items || items.length === 0) {
      container.innerHTML = `<div class="empty-row">${emptyTxt}</div>`;
      return;
    }
    const sorted = [...items].sort((a, b) => b.ts - a.ts);
    container.innerHTML = sorted.map(d => renderEntryRow(d, pet)).join('');
    wireEntryButtons(container, pet);
  }

  // 「记录」按日翻（方案 B）：默认今天，可用 ‹ › / 跳日期 翻看某一天；显示当天合计。
  function renderRecords(pet, deltasArg, eatenMapArg) {
    if (!pet) return;
    if (pet.id !== lastRecordsPetId) { recordsDay = null; lastRecordsPetId = pet.id; }
    const deltas = deltasArg || computeDeltas(pet);
    const eatenMap = eatenMapArg || eatenByDate(deltas);
    const todayIso = todayBucketIso();
    let selIso = (recordsDay && recordsDay <= todayIso) ? recordsDay : todayIso;
    if (selIso === todayIso) recordsDay = null;
    const isToday = selIso === todayIso;
    const dayDeltas = deltas.filter(d => bucketDateIso(d.ts) === selIso);
    renderEntriesList($entriesToday, dayDeltas, pet, isToday ? '今天还没记录' : '这天没有记录');
    if ($recCur) $recCur.textContent = isToday ? '今天' : recDayLabel(selIso);
    if ($recDate) { $recDate.value = selIso; $recDate.max = todayIso; }
    if ($recNext) $recNext.disabled = isToday;
    const eaten = eatenMap.get(selIso) || 0;
    if ($recTotal) $recTotal.innerHTML = dayDeltas.length ? `这天合计 <b>${fmtEq(pet, eaten)}</b>` : '';
  }
  function recDayLabel(iso) {
    if (iso === isoDate(Date.now() - DAY_MS)) return '昨天';
    const p = iso.split('-').map(Number);
    return `${p[1]}月${p[2]}日`;
  }
  function shiftRecordsDay(n) {
    const todayIso = todayBucketIso();
    const cur = recordsDay || todayIso;
    const p = cur.split('-').map(Number);
    const nextIso = isoDate(new Date(p[0], p[1] - 1, p[2] + n).getTime());
    if (nextIso > todayIso) return;
    recordsDay = (nextIso === todayIso) ? null : nextIso;
    renderRecords(currentPet());
  }

  function entryRowActions(e, pet) {
    // Same rule for edit-time AND delete: owner/admin can touch any record,
    // a regular member only their own (mirrors the backend gate).
    const mine = canEditEntryTime(e, pet);
    const edit = mine
      ? `<button type="button" class="er-edit" data-eid="${e.id}" title="改时间" aria-label="修改这条记录的时间">✎</button>` : '';
    const del = mine
      ? `<button type="button" class="er-del" data-eid="${e.id}" title="删除" aria-label="删除这条记录">×</button>` : '';
    return `<span class="er-actions">${edit}${del}</span>`;
  }

  function fmtAmt(n) { return Number.isInteger(n) ? String(n) : parseFloat(Number(n).toFixed(2)); }
  function renderExtraRow(d, pet) {
    const e = d.entry;
    const eq = Number(e.kibbleEqG) || 0;
    const cntStr = fmtAmt(Number(e.count) || 1);
    const name = escapeHtml(e.foodName || '零食');
    const emoji = escapeHtml(e.emoji || '🍖');
    // gram-measured: "罐头 40g" ; count-measured: "猫条 ×2 根"
    const amountStr = (e.measure === 'gram') ? `${cntStr}g` : `×${cntStr} ${escapeHtml(e.unitLabel || '份')}`;
    // 有结束时间戳 → 显示成时间段
    const timeStr = (Number.isFinite(e.tsEnd) && e.tsEnd > e.ts) ? `${fmtTime(e.ts)}–${fmtTime(e.tsEnd)}` : fmtTime(e.ts);
    return `
      <div class="entry-row entry-row-extra">
        <span class="er-time">${timeStr}</span>
        <span class="er-main">
          <span class="er-delta extra">${emoji} ${name} ${amountStr}</span>
          <span class="er-reading">≈ ${fmtEq(pet, eq)} 等效${escapeHtml(convName(pet))}</span>
        </span>
        ${entryRowActions(e, pet)}
      </div>
    `;
  }

  function renderRemainRow(d, pet) {
    const e = d.entry;
    const name = escapeHtml(e.foodName || '食物');
    const emoji = escapeHtml(e.emoji || '🍖');
    const unit = e.measure === 'gram' ? 'g' : escapeHtml(e.unitLabel || '份');
    const remStr = `${fmtAmt(Number(e.reading))} ${unit}`;
    let deltaHtml;
    if (d.type === 'remain-first') deltaHtml = `<span class="er-delta first">${emoji} ${name} · ${d.reset ? '🗑 倒掉换新·起点' : '记下起点'}</span>`;
    else if (d.type === 'remain-refill') deltaHtml = `<span class="er-delta refill">${emoji} ${name} · 又开了一份</span>`;
    else if (!(d.amount > 0)) deltaHtml = `<span class="er-delta eat">${emoji} ${name} · 没变化</span>`;
    else deltaHtml = `<span class="er-delta eat">${emoji} ${name} 吃了 ${fmtEq(pet, d.amount)}</span>`;
    return `
      <div class="entry-row entry-row-extra">
        <span class="er-time">${fmtTime(e.ts)}</span>
        <span class="er-main">
          ${deltaHtml}
          <span class="er-reading">现在还剩 ${remStr}</span>
        </span>
        ${entryRowActions(e, pet)}
      </div>
    `;
  }

  function renderEntryRow(d, pet) {
    const e = d.entry;
    if (e.kind === 'extra') return renderExtraRow(d, pet);
    if (e.kind === 'remain') return renderRemainRow(d, pet);
    let deltaHtml;
    if (d.type === 'first') deltaHtml = `<span class="er-delta first">${d.reset ? '🗑 倒掉换新 · 起点' : '起点'}</span>`;
    else if (d.type === 'unknown') deltaHtml = `<span class="er-delta unknown">无法换算</span>`;
    else if (d.amount === 0) deltaHtml = `<span class="er-delta eat">没变化</span>`;
    else if (d.type === 'eat') deltaHtml = `<span class="er-delta eat">吃了 ${fmtEq(pet, d.amount)}</span>`;
    else deltaHtml = `<span class="er-delta refill">添了 ${fmtEq(pet, d.amount)}</span>`;
    const fwStr = d.foodWeight === null ? '?' : fmtEq(pet, d.foodWeight);
    const modeStr = e.withBowl ? '含碗' : '不含碗';
    return `
      <div class="entry-row">
        <span class="er-time">${fmtTime(e.ts)}</span>
        <span class="er-main">
          ${deltaHtml}
          <span class="er-reading">碗里 ${fwStr} <span class="er-raw">(${e.reading} g · ${modeStr})</span></span>
        </span>
        ${entryRowActions(e, pet)}
      </div>
    `;
  }

  function renderHistory(deltas, pet) {
    if (deltas.length === 0) {
      $entriesHistory.innerHTML = '<div class="empty-row">还没有记录</div>';
      return;
    }
    const groups = new Map();
    deltas.forEach(d => {
      const k = bucketDateIso(d.ts);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(d);
    });
    // Use the same cross-midnight-aware day totals as the today card / trend chart,
    // so 「当日 X」on a day here can't disagree with what the chart shows for it.
    const eatenMap = eatenByDate(deltas);
    const sortedDates = [...groups.keys()].sort().reverse();
    let html = '';
    sortedDates.forEach(date => {
      const items = groups.get(date);
      const eaten = eatenMap.get(date) || 0;
      const sortedItems = [...items].sort((a, b) => b.ts - a.ts);
      html += `<div class="day-divider"><span>${date}</span><span>当日 <strong>${fmtEq(pet, eaten)}</strong> · ${items.length} 条记录</span></div>`;
      sortedItems.forEach(d => { html += renderEntryRow(d, pet); });
    });
    $entriesHistory.innerHTML = html;
    wireEntryButtons($entriesHistory, pet);
  }

  // ===== Trend chart =====
  // 悬停/框选交互的当前几何，由 draw* 函数每次重绘时填好：
  //   bars     = 柱状(每根柱悬停给读数)；intraday = 当日累计曲线(悬停给读数 + 拖动框选算平均速度)
  let trendHit = null;
  function renderTrend(deltas, pet) {
    // 重绘时先收掉上一帧残留的浮窗（SVG 里的 overlay 会被 innerHTML 自然清掉，浮窗是 SVG 外的兄弟节点需手动收）
    if ($chartTip) { $chartTip.hidden = true; $chartTip.classList.remove('show'); }
    $trendTabs.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.p === state.period);
    });
    $trendCustom.style.display = state.period === 'custom' ? '' : 'none';
    if ($trendDaynav) $trendDaynav.style.display = state.period === 'today' ? '' : 'none';

    if (state.period === 'today') { syncDayNav(); drawIntraday(deltas, pet, state.intradayIso); return; }

    let startIso, endIso;
    const todayIso = todayBucketIso();

    if (state.period === 'custom') {
      if (!state.customStart || !state.customEnd) {
        $customStart.value = state.customStart || '';
        $customEnd.value = state.customEnd || todayIso;
        renderEmptyChart('选起止日期看自定义区间');
        $chartRangeLbl.textContent = '';
        return;
      }
      startIso = state.customStart;
      endIso = state.customEnd;
      if (startIso > endIso) { [startIso, endIso] = [endIso, startIso]; }
      $customStart.value = startIso;
      $customEnd.value = endIso;
    } else {
      const n = parseInt(state.period, 10) || 7;
      const days = lastNDays(n, todayIso);
      startIso = days[days.length - 1];
      endIso = days[0];
    }

    const startDate = parseIsoDate(startIso);
    const endDate = parseIsoDate(endIso);
    const dayCount = Math.max(1, Math.round((endDate - startDate) / DAY_MS) + 1);

    let agg;
    if (dayCount <= 35) agg = 'day';
    else if (dayCount <= 200) agg = 'week';
    else agg = 'month';

    drawAggregatedBars(deltas, pet, startIso, endIso, agg);
  }

  function targetForAggregation(pet, agg) {
    if (pet.showTargetOnChart === false) return null;
    const tr = targetRange(pet);
    if (!tr) return null;
    let factor = 1;
    if (agg === 'day') factor = 1;
    else if (agg === 'week') factor = 7;
    else if (agg === 'month') factor = 30; // approximate
    return { min: tr.min * factor, max: tr.max * factor, unit: agg };
  }
  // Per-bucket target: the target in effect on `iso`, scaled to the aggregation period, so
  // each bar can be drawn against the target that was actually set at that point in time.
  function scaledTargetAt(pet, iso, agg) {
    if (pet.showTargetOnChart === false) return null;
    const tr = targetRangeAt(pet, iso);
    if (!tr) return null;
    const factor = agg === 'week' ? 7 : (agg === 'month' ? 30 : 1);
    return { min: tr.min * factor, max: tr.max * factor };
  }

  function renderEmptyChart(msg) {
    trendHit = null;
    $trendChart.innerHTML = '';
    $chartMeta.innerHTML = `<div style="text-align:center;width:100%;padding:1.5rem;color:var(--color-light);">${escapeHtml(msg)}</div>`;
  }

  function drawIntraday(deltas, pet, dayIso) {
    const viewIso = dayIso || todayBucketIso();   // 正在看的那天（null/未传=今天，实时）
    const { start: dayStart, end: dayEnd } = dayRangeMs(viewIso);

    // 把今天所有消耗事件整理成 斜坡(ramp，时间段匀速涨) + 瞬时(step，某一刻一笔)，再扫描积分成累计曲线。
    // 用统一的 delta（startTs/endTs）—— 作差链、直接填、时间段都已归一，且能正确处理事件重叠（如罐头与干粮区间叠加）。
    const ramps = [];  // {s, e, rate}
    const steps = [];  // {t, amount}
    const bset = new Set([dayStart]);
    deltas.forEach(d => {
      if (!EAT_TYPES.has(d.type) || !(d.amount > 0)) return;
      if (d.endTs > d.startTs) {
        const s = Math.max(d.startTs, dayStart), e = Math.min(d.endTs, dayEnd);
        if (e > s) { ramps.push({ s, e, rate: d.amount / (d.endTs - d.startTs) }); bset.add(s); bset.add(e); }
      } else if (d.startTs >= dayStart && d.startTs < dayEnd) {
        steps.push({ t: d.startTs, amount: d.amount }); bset.add(d.startTs);
      }
    });
    const now = Date.now();
    const endT = (now >= dayStart && now < dayEnd) ? now : dayEnd;
    bset.add(endT);
    const xs = [...bset].filter(t => t >= dayStart && t <= endT).sort((a, b) => a - b);
    const points = [{ t: dayStart, c: 0 }];
    let cum = 0;
    for (let i = 0; i < xs.length; i++) {
      const t = xs[i];
      const stepSum = steps.reduce((a, st) => a + (st.t === t ? st.amount : 0), 0);
      if (stepSum > 0) { points.push({ t, c: cum }); cum += stepSum; points.push({ t, c: cum }); }
      if (i + 1 < xs.length) {
        const t2 = xs[i + 1];
        const rate = ramps.reduce((a, r) => a + ((r.s <= t && r.e >= t2) ? r.rate : 0), 0);
        cum += rate * (t2 - t);
        points.push({ t: t2, c: cum });
      }
    }
    if (points[points.length - 1].t < endT) points.push({ t: endT, c: cum });

    const sortedEntries = [...pet.entries].filter(e => { const k = e.kind || 'weigh'; return k === 'weigh' || k === 'extra' || k === 'remain'; }).sort((a, b) => a.ts - b.ts);
    const todayMeasurements = sortedEntries.filter(e => e.ts >= dayStart && e.ts < dayEnd).map(e => ({
      ts: e.ts, c: interpolateCum(points, e.ts),
    }));

    const W = 600, H = 240;
    const m = { l: 44, r: 16, t: 18, b: 32 };
    const innerW = W - m.l - m.r;
    const innerH = H - m.t - m.b;

    const M = convM(pet), U = convUnit(pet);   // 标签层换算（几何仍按等效干粮克数算）
    const target = (pet.showTargetOnChart !== false) ? targetRangeAt(pet, viewIso) : null;
    const dataMax = Math.max(1, ...points.map(p => p.c));
    const targetCeil = target ? target.max : 0;
    const niceMax = niceCeil(Math.max(dataMax, targetCeil));

    const xScale = ts => m.l + ((ts - dayStart) / DAY_MS) * innerW;
    const yScale = c => m.t + innerH - (c / niceMax) * innerH;

    let html = '';

    const yTicks = niceTicks(0, niceMax, 4);
    yTicks.forEach(v => {
      const y = yScale(v);
      html += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.6"/>`;
      html += `<text x="${m.l - 6}" y="${y + 3.5}" text-anchor="end" fill="var(--color-light)" font-size="12">${fmtG(v * M)}</text>`;
    });
    html += `<text x="6" y="${m.t + 4}" fill="var(--color-light)" font-size="12">${escapeHtml(U)}</text>`;

    html += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + innerH}" y2="${m.t + innerH}" stroke="var(--color-border)"/>`;
    for (let off = 0; off <= 24; off += 6) {
      const ts = dayStart + off * 3600 * 1000;
      const x = xScale(ts);
      const dt = new Date(ts);
      const hh = pad2(dt.getHours());
      html += `<line x1="${x}" x2="${x}" y1="${m.t + innerH}" y2="${m.t + innerH + 3}" stroke="var(--color-border)"/>`;
      html += `<text x="${x}" y="${H - 14}" text-anchor="middle" fill="var(--color-light)" font-size="12">${hh}:00</text>`;
    }

    // Target wedge: from (00:00, 0) to (24h, target_min/max). Diagonal "ideal pace".
    if (target) {
      const xA = xScale(dayStart);
      const yA = yScale(0);
      const xB = xScale(dayEnd);
      const yMin = yScale(target.min);
      const yMax = yScale(target.max);
      if (target.min === target.max) {
        // Single line
        html += `<line x1="${xA}" y1="${yA}" x2="${xB}" y2="${yMin}" stroke="var(--pet-chart-target)" stroke-width="1.3" stroke-dasharray="5 3" opacity="0.75"/>`;
      } else {
        html += `<polygon points="${xA},${yA} ${xB},${yMax} ${xB},${yMin}" fill="var(--pet-chart-target)" opacity="0.10"/>`;
        html += `<line x1="${xA}" y1="${yA}" x2="${xB}" y2="${yMin}" stroke="var(--pet-chart-target)" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.7"/>`;
        html += `<line x1="${xA}" y1="${yA}" x2="${xB}" y2="${yMax}" stroke="var(--pet-chart-target)" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.7"/>`;
      }
      const lblY = Math.max(yMax, m.t + 12);
      const targetLbl = target.min === target.max
        ? `目标 ${fmtG(target.min * M)}${U}`
        : `目标 ${fmtG(target.min * M)}–${fmtG(target.max * M)}${U}`;
      html += `<text x="${xB - 4}" y="${lblY - 4}" text-anchor="end" fill="var(--pet-chart-target)" font-size="12">${targetLbl}</text>`;
    }

    if (points.length >= 2) {
      const fillPath = (
        `M ${xScale(points[0].t)},${yScale(0)} ` +
        points.map(p => `L ${xScale(p.t)},${yScale(p.c)}`).join(' ') +
        ` L ${xScale(points[points.length - 1].t)},${yScale(0)} Z`
      );
      html += `<path d="${fillPath}" fill="var(--color-accent)" opacity="0.12"/>`;

      const linePath = `M ${xScale(points[0].t)},${yScale(points[0].c)} ` +
        points.slice(1).map(p => `L ${xScale(p.t)},${yScale(p.c)}`).join(' ');
      html += `<path d="${linePath}" stroke="var(--color-accent)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    todayMeasurements.forEach(p => {
      html += `<circle cx="${xScale(p.ts)}" cy="${yScale(p.c)}" r="3.5" fill="var(--color-accent)" stroke="var(--color-bg)" stroke-width="1.5"/>`;
    });

    if (now >= dayStart && now < dayEnd) {
      const nx = xScale(now);
      html += `<line x1="${nx}" x2="${nx}" y1="${m.t}" y2="${m.t + innerH}" stroke="var(--color-highlight)" stroke-width="1" stroke-dasharray="2 3"/>`;
      html += `<text x="${nx}" y="${m.t - 4}" text-anchor="middle" fill="var(--color-highlight)" font-size="12">现在</text>`;
    }

    if (cum > 0) {
      const lx = xScale(endT);
      const ly = yScale(cum);
      html += `<text x="${Math.min(lx + 4, W - m.r - 4)}" y="${Math.max(ly - 6, m.t + 10)}" text-anchor="${lx > W - 60 ? 'end' : 'start'}" fill="var(--color-accent)" font-size="12.5" font-weight="600">${fmtG(cum * M)} ${escapeHtml(U)}</text>`;
    }

    trendHit = { kind: 'intraday', m, innerW, innerH, dayStart, dayEnd, endT, niceMax, points, M, U };
    $trendChart.innerHTML = html;

    const startD = new Date(dayStart);
    $chartRangeLbl.textContent = `${pad2(startD.getMonth() + 1)}/${pad2(startD.getDate())} 00:00 起 · 24h`;
    $chartMeta.innerHTML = `
      <span><span class="legend-dot" style="background:var(--color-accent);opacity:0.6;"></span>累计已吃（假设两次称重之间匀速进食）</span>
      <span>共 ${fmtEq(pet, cum)}</span>
    `;
  }

  function interpolateCum(points, t) {
    if (points.length === 0) return 0;
    if (t <= points[0].t) return points[0].c;
    if (t >= points[points.length - 1].t) return points[points.length - 1].c;
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i].t) {
        const p0 = points[i - 1], p1 = points[i];
        if (p1.t === p0.t) return p1.c;
        const f = (t - p0.t) / (p1.t - p0.t);
        return p0.c + f * (p1.c - p0.c);
      }
    }
    return points[points.length - 1].c;
  }

  function drawAggregatedBars(deltas, pet, startIso, endIso, agg) {
    const eatenMap = eatenByDate(deltas);
    const todayIso = todayBucketIso();
    // 不完整周期修正：第一条记录时间 tFirst、现在 now，用来判断每个桶是否「不完整」(起始/进行中)。
    const entriesAll = (pet.entries || []).filter(e => (e.kind || 'weigh') !== 'bodyweight');
    const tFirst = entriesAll.length ? Math.min(...entriesAll.map(e => e.ts)) : null;
    const now = Date.now();
    const dayMeta = (dIso) => {
      const { start, end } = dayRangeMs(dIso);
      const complete = (tFirst != null && start >= tFirst && end <= now);          // 整天都在 [第一条记录, 现在] 内
      const partial = (tFirst != null && ((start < tFirst && end > tFirst) || (start <= now && end > now))); // 跨过 tFirst(起始日) 或 now(今天)
      return { complete, partial, eaten: eatenMap.get(dIso) || 0 };
    };
    const isoOf = (y, mIdx, d) => y + '-' + pad2(mIdx + 1) + '-' + pad2(d);

    const dayList = [];
    let cur = parseIsoDate(startIso);
    const endD = parseIsoDate(endIso);
    while (cur <= endD) {
      dayList.push(isoOf(cur.getFullYear(), cur.getMonth(), cur.getDate()));
      cur.setDate(cur.getDate() + 1);
    }
    // 「平均」只用完整天的日均（排除起始日 / 今天 这类不完整天）
    let cSum = 0, cCount = 0;
    dayList.forEach(d => { const mm = dayMeta(d); if (mm.complete) { cSum += mm.eaten; cCount++; } });
    const avgCompleteDay = cCount > 0 ? cSum / cCount : 0;

    const bars = [];
    if (agg === 'day') {
      dayList.forEach(d => {
        const mm = dayMeta(d);
        bars.push({ key: d, label: shortMD(d), value: mm.eaten, isToday: d === todayIso, sub: null, incomplete: mm.partial, projected: null, target: scaledTargetAt(pet, d, 'day') });
      });
    } else if (agg === 'week') {
      const groups = new Map();
      dayList.forEach(d => {
        const dt = parseIsoDate(d);
        const mon = new Date(dt); mon.setDate(mon.getDate() - ((dt.getDay() + 6) % 7));
        const monIso = isoOf(mon.getFullYear(), mon.getMonth(), mon.getDate());
        if (!groups.has(monIso)) groups.set(monIso, { sum: 0, count: 0 });
        groups.get(monIso).sum += (eatenMap.get(d) || 0);
        groups.get(monIso).count++;
      });
      [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([monIso, g]) => {
        const ws = parseIsoDate(monIso);
        const weekStart = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()).getTime();
        const weekEnd = weekStart + 7 * DAY_MS;
        let compSum = 0, compCnt = 0;
        for (let k = 0; k < 7; k++) { const dd = new Date(weekStart + k * DAY_MS); const mm = dayMeta(isoOf(dd.getFullYear(), dd.getMonth(), dd.getDate())); if (mm.complete) { compSum += mm.eaten; compCnt++; } }
        const incomplete = (tFirst != null) && ((weekStart < tFirst && weekEnd > tFirst) || (weekStart <= now && weekEnd > now));
        const projected = (incomplete && compCnt > 0) ? (compSum / compCnt) * 7 : null;   // 折算满周 = 完整天日均 × 7
        bars.push({ key: monIso, label: shortMD(monIso), value: g.sum, isToday: false, sub: g.count < 7 ? `${g.count}d` : null, incomplete, projected, recordedDays: g.count, target: scaledTargetAt(pet, monIso, 'week') });
      });
    } else {
      const groups = new Map();
      dayList.forEach(d => {
        const ym = d.slice(0, 7);
        if (!groups.has(ym)) groups.set(ym, { sum: 0, count: 0 });
        groups.get(ym).sum += (eatenMap.get(d) || 0);
        groups.get(ym).count++;
      });
      [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([ym, g]) => {
        const yy = parseInt(ym.slice(0, 4), 10), mm0 = parseInt(ym.slice(5, 7), 10);
        const monStart = new Date(yy, mm0 - 1, 1).getTime();
        const daysInMonth = new Date(yy, mm0, 0).getDate();
        const monEnd = new Date(yy, mm0 - 1, daysInMonth).getTime() + DAY_MS;
        let compSum = 0, compCnt = 0;
        for (let k = 1; k <= daysInMonth; k++) { const mm = dayMeta(isoOf(yy, mm0 - 1, k)); if (mm.complete) { compSum += mm.eaten; compCnt++; } }
        const incomplete = (tFirst != null) && ((monStart < tFirst && monEnd > tFirst) || (monStart <= now && monEnd > now));
        const projected = (incomplete && compCnt > 0) ? (compSum / compCnt) * daysInMonth : null;   // 折算满月 = 完整天日均 × 当月天数
        bars.push({ key: ym, label: mm0 + '月', value: g.sum, isToday: false, sub: null, incomplete, projected, recordedDays: g.count, target: scaledTargetAt(pet, ym + '-01', 'month') });
      });
    }

    const target = targetForAggregation(pet, agg);
    drawBars(bars, agg, startIso, endIso, dayList.length, target, pet, avgCompleteDay);
  }

  function drawBars(bars, agg, startIso, endIso, dayCount, target, pet, avgCompleteDay) {
    const M = convM(pet), U = convUnit(pet);   // 标签层换算（柱高/几何仍按等效干粮克数）
    const W = 600, H = 240;
    const m = { l: 44, r: 16, t: 22, b: 34 };
    const innerW = W - m.l - m.r;
    const innerH = H - m.t - m.b;
    const periodName = agg === 'week' ? '周' : '月';
    const dataMax = Math.max(1, ...bars.map(b => Math.max(b.value, b.projected || 0)));   // 含折算值，预测段也能放下
    const barTargetMax = Math.max(0, ...bars.map(b => (b.target ? b.target.max : 0)));    // 分段目标里最高的一段也要放得下
    const niceMax = niceCeil(Math.max(dataMax, target ? target.max : 0, barTargetMax));
    const n = Math.max(1, bars.length);
    const barW = innerW / n;
    const yScale = v => m.t + innerH - (v / niceMax) * innerH;

    let labelEvery = 1;
    if (n > 12) labelEvery = Math.ceil(n / 8);

    let html = '';
    const yTicks = niceTicks(0, niceMax, 4);
    yTicks.forEach(v => {
      const y = yScale(v);
      html += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.6"/>`;
      html += `<text x="${m.l - 6}" y="${y + 3.5}" text-anchor="end" fill="var(--color-light)" font-size="12">${fmtG(v * M)}</text>`;
    });
    html += `<text x="6" y="${m.t + 4}" fill="var(--color-light)" font-size="12">${escapeHtml(U)}</text>`;
    html += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + innerH}" y2="${m.t + innerH}" stroke="var(--color-border)"/>`;

    // Per-bucket target band (drawn behind bars): each bar is drawn against the target that
    // was actually in effect for its date, so a target that changed over time shows as a
    // STEPPED reference band instead of one flat line applied to all of history. Adjacent
    // buckets sharing a target read as one continuous band; a change makes a visible step.
    for (let i = 0; i < bars.length; ) {
      const t = bars[i].target;
      if (!t) { i++; continue; }
      // 合并相邻、目标相同的桶成一段连续参考带；目标变了的地方自然出现台阶。
      let j = i;
      while (j + 1 < bars.length && bars[j + 1].target &&
             bars[j + 1].target.min === t.min && bars[j + 1].target.max === t.max) j++;
      const x0 = m.l + barW * i;
      const x1 = Math.min(m.l + barW * (j + 1), W - m.r);
      const yMin = yScale(t.min);
      const yMax = yScale(t.max);
      if (t.min === t.max) {
        html += `<line x1="${x0}" x2="${x1}" y1="${yMin}" y2="${yMin}" stroke="var(--pet-chart-target)" stroke-width="1.3" stroke-dasharray="5 3" opacity="0.8"/>`;
      } else {
        html += `<rect x="${x0}" y="${yMax}" width="${x1 - x0}" height="${yMin - yMax}" fill="var(--pet-chart-target)" opacity="0.10"/>`;
        html += `<line x1="${x0}" x2="${x1}" y1="${yMin}" y2="${yMin}" stroke="var(--pet-chart-target)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>`;
        html += `<line x1="${x0}" x2="${x1}" y1="${yMax}" y2="${yMax}" stroke="var(--pet-chart-target)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>`;
      }
      i = j + 1;
    }
    // One label at top-right for the CURRENT (latest) target — the band itself shows history.
    if (target) {
      const yMaxCur = yScale(target.max);
      const unitName = agg === 'day' ? '日' : (agg === 'week' ? '周' : '月');
      const tLbl = target.min === target.max
        ? `目标 ${fmtG(target.min * M)}${U}/${unitName}`
        : `目标 ${fmtG(target.min * M)}–${fmtG(target.max * M)} ${U}/${unitName}`;
      html += `<text x="${W - m.r - 4}" y="${Math.max(yMaxCur, m.t + 10) - 4}" text-anchor="end" fill="var(--pet-chart-target)" font-size="12">${tLbl}</text>`;
    }

    let anyIncomplete = false, anyProjected = false;
    const hitBars = [];
    bars.forEach((b, i) => {
      const x = m.l + barW * i + 1.5;
      const w = Math.max(1, barW - 3);
      const bh = (b.value / niceMax) * innerH;
      const y = m.t + innerH - bh;
      const baseFill = b.isToday ? 'var(--color-accent)' : 'var(--pet-chart-bar)';
      const hasProj = b.projected && b.projected > b.value;
      if (b.incomplete) anyIncomplete = true;
      let topY = b.value > 0 ? y : m.t + innerH;
      // 折算满周期 的虚线预测段（实际柱顶 → 折算值）。折算值只在悬停浮窗里给，柱顶不再常驻「折算 X 克」文字。
      if (hasProj) {
        anyProjected = true;
        const yp = m.t + innerH - (b.projected / niceMax) * innerH;
        html += `<rect x="${x}" y="${yp}" width="${w}" height="${y - yp}" fill="var(--pet-chart-target)" fill-opacity="0.10" stroke="var(--pet-chart-target)" stroke-width="1" stroke-dasharray="3 2" rx="2"/>`;
        topY = yp;
      }
      // 实际柱：不完整桶用半透明 + 虚线描边标出。读数（X 克）一律收进悬停浮窗，柱顶不再常驻数字。
      const incAttr = b.incomplete ? ' fill-opacity="0.5" stroke="' + baseFill + '" stroke-width="1" stroke-dasharray="3 2"' : '';
      html += `<rect x="${x}" y="${y}" width="${w}" height="${bh}" fill="${baseFill}"${incAttr} rx="2"/>`;
      if (i % labelEvery === 0 || i === n - 1) {
        html += `<text x="${x + w / 2}" y="${H - 14}" text-anchor="middle" fill="${b.incomplete ? 'var(--pet-chart-incomplete)' : 'var(--color-light)'}" font-size="12">${escapeHtml(b.label)}</text>`;
      }
      // 悬停命中区：整列（含柱间空隙）都算这根柱，浮窗里给读数
      const lbl = `<strong>${escapeHtml(b.label)}</strong>`;
      let tipHtml;
      if (b.incomplete && hasProj) {
        tipHtml = `${lbl}<br>已记录 ${fmtG(b.value * M)} ${escapeHtml(U)}<br><span class="tip-sub">折算满${periodName} ${fmtG(b.projected * M)} ${escapeHtml(U)}</span>`;
      } else if (b.incomplete) {
        tipHtml = `${lbl} <span class="tip-sub">· 不完整</span><br>已记录 ${fmtG(b.value * M)} ${escapeHtml(U)}`;
      } else {
        const days = (b.recordedDays && agg !== 'day') ? ` <span class="tip-sub">· 记录 ${b.recordedDays} 天</span>`
          : (b.sub ? ` <span class="tip-sub">· ${escapeHtml(b.sub)}</span>` : '');
        tipHtml = `${lbl}${days}<br>${fmtG(b.value * M)} ${escapeHtml(U)}`;
      }
      hitBars.push({ slotX0: m.l + barW * i, slotX1: m.l + barW * (i + 1), cx: x + w / 2, topY, tip: tipHtml });
    });

    trendHit = { kind: 'bars', bars: hitBars, m, innerW, innerH };
    $trendChart.innerHTML = html;

    const totalEaten = bars.reduce((s, b) => s + b.value, 0);
    const aggName = agg === 'day' ? '日' : (agg === 'week' ? '周' : '月');
    const incLegend = anyProjected ? ' · <span style="color:var(--pet-chart-target);">┈ 折算满' + periodName + '</span>'
      : (anyIncomplete ? ' · <span style="color:var(--pet-chart-incomplete);">┈ 不完整</span>' : '');
    $chartMeta.innerHTML = `
      <span><span class="legend-dot" style="background:var(--pet-chart-bar);"></span>每${aggName}吃量 <span class="legend-dot" style="background:var(--color-accent);margin-left:0.5rem;"></span>今日${incLegend}</span>
      <span>共 ${fmtG(totalEaten * M)} ${U} · 日均 ${fmtG(avgCompleteDay * M)} ${U}<span style="color:var(--color-light);">（仅完整天）</span></span>
    `;
    $chartRangeLbl.textContent = `${startIso} → ${endIso} · 按${aggName}`;
  }

  // ===== 趋势图悬停 / 框选交互 =====
  // 一套指针处理器挂在 SVG 上，按 trendHit.kind 分流：
  //   bars     —— 悬停某一列 → 浮窗给该桶读数（柱顶已不再常驻数字）
  //   intraday —— 悬停 → 十字线 + 该时刻累计；按住拖动 → 框选区间 → 平均进食速度 + 区间吃了多少克
  // 浮窗用绝对定位的 .chart-tip（在 .chart-wrap 内），SVG 里的高亮/十字/框选用一个临时 overlay <g> 画，
  // 每次重绘 innerHTML 会自然清掉它，所以无需手动同步。
  function setupTrendInteraction() {
    const svg = $trendChart, tip = $chartTip;
    if (!svg || !tip) return;
    const NS = 'http://www.w3.org/2000/svg';
    let dragging = false, pinned = false, pinnedHit = null, dragX0 = 0;
    const pinActive = () => pinned && pinnedHit === trendHit;

    function ensureOverlay() {
      let g = svg.querySelector('#trend-ovl');
      if (!g || g.parentNode !== svg) {
        g = document.createElementNS(NS, 'g');
        g.id = 'trend-ovl'; g.setAttribute('pointer-events', 'none');
        svg.appendChild(g);
      }
      return g;
    }
    function clearOverlay() { const g = svg.querySelector('#trend-ovl'); if (g) g.innerHTML = ''; }
    function hideTip() { tip.classList.remove('show'); tip.hidden = true; }

    function vb(ev) {
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (ev.clientX - r.left) / r.width * 600, y: (ev.clientY - r.top) / r.height * 240 };
    }
    // vbX/vbY 是 viewBox(600×240) 坐标，换算成相对 .chart-wrap 的 CSS 像素来摆浮窗
    function placeTip(html, vbX, vbY) {
      tip.innerHTML = html;
      tip.hidden = false;
      const wrap = svg.parentElement;
      const sr = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const left = (sr.left - wr.left) + (vbX / 600) * sr.width;
      let top = (sr.top - wr.top) + (vbY / 240) * sr.height;
      tip.style.top = top + 'px';
      tip.style.left = left + 'px';
      tip.classList.add('show');
      // 夹住，别让浮窗溢出卡片。浮窗 transform 是 translate(-50%,-100%)：left 是中心、top 是其底边。
      const half = tip.offsetWidth / 2;
      const minL = half + 4, maxL = wrap.clientWidth - half - 4;
      if (maxL > minL) tip.style.left = Math.max(minL, Math.min(maxL, left)) + 'px';
      const minTop = tip.offsetHeight + 2;   // 柱子很高时浮窗别飞出卡片上沿
      if (top < minTop) { top = minTop; tip.style.top = top + 'px'; }
    }

    const fmtClock = ts => { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
    const clampX = (h, x) => Math.max(h.m.l, Math.min(h.m.l + h.innerW, x));
    const tAtX = (h, x) => h.dayStart + (clampX(h, x) - h.m.l) / h.innerW * DAY_MS;
    const xAtT = (h, t) => h.m.l + (t - h.dayStart) / DAY_MS * h.innerW;
    const yAtC = (h, c) => h.m.t + h.innerH - (c / h.niceMax) * h.innerH;

    function drawCrosshair(h, x) {
      const t = Math.min(tAtX(h, x), h.endT);
      const cum = interpolateCum(h.points, t);
      const px = xAtT(h, t), py = yAtC(h, cum);
      ensureOverlay().innerHTML =
        `<line x1="${px.toFixed(1)}" x2="${px.toFixed(1)}" y1="${h.m.t}" y2="${h.m.t + h.innerH}" stroke="var(--color-accent)" stroke-width="1" stroke-dasharray="3 3" opacity="0.55"/>` +
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="var(--color-accent)" stroke="var(--color-bg)" stroke-width="1.5"/>`;
      placeTip(`<strong>${fmtClock(t)}</strong><br>累计 ${fmtG(cum * h.M)} ${escapeHtml(h.U)}`, px, py - 8);
    }

    function drawBrush(h, xa, xb) {
      const x0 = clampX(h, Math.min(xa, xb)), x1 = clampX(h, Math.max(xa, xb));
      const t0 = tAtX(h, x0), t1 = Math.min(tAtX(h, x1), h.endT);
      const c0 = interpolateCum(h.points, t0), c1 = interpolateCum(h.points, t1);
      const grams = (c1 - c0) * h.M, hours = (t1 - t0) / 3600000;
      const yTop = h.m.t, yBot = h.m.t + h.innerH;
      const ya = yAtC(h, c0), yb = yAtC(h, c1);
      ensureOverlay().innerHTML =
        `<rect x="${x0.toFixed(1)}" y="${yTop}" width="${Math.max(0, x1 - x0).toFixed(1)}" height="${(yBot - yTop).toFixed(1)}" fill="var(--color-accent)" fill-opacity="0.12" stroke="var(--color-accent)" stroke-opacity="0.45" stroke-width="1"/>` +
        `<line x1="${x0.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${yb.toFixed(1)}" stroke="var(--color-accent)" stroke-width="1.6"/>` +
        `<circle cx="${x0.toFixed(1)}" cy="${ya.toFixed(1)}" r="3" fill="var(--color-accent)"/>` +
        `<circle cx="${x1.toFixed(1)}" cy="${yb.toFixed(1)}" r="3" fill="var(--color-accent)"/>`;
      let body;
      if (grams <= 0.05) {
        body = `<span class="tip-sub">这段时间没进食</span>`;
      } else {
        const rate = hours > 0.0001 ? grams / hours : 0;
        body = `吃了 <strong>${fmtG(grams)}</strong> ${escapeHtml(h.U)}<br><span class="tip-sub">平均 ${fmtG(rate)} ${escapeHtml(h.U)}/小时</span>`;
      }
      placeTip(`<strong>${fmtClock(t0)} – ${fmtClock(t1)}</strong><br>${body}`, (x0 + x1) / 2, yTop - 4);
    }

    function onMove(ev) {
      const h = trendHit;
      if (!h) { hideTip(); return; }
      const c = vb(ev); if (!c) return;
      if (h.kind === 'bars') {
        const slot = h.bars.find(b => c.x >= b.slotX0 && c.x < b.slotX1);
        if (!slot) { clearOverlay(); hideTip(); return; }
        ensureOverlay().innerHTML =
          `<rect x="${slot.slotX0.toFixed(1)}" y="${h.m.t}" width="${(slot.slotX1 - slot.slotX0).toFixed(1)}" height="${h.innerH}" fill="var(--color-accent)" fill-opacity="0.08"/>`;
        placeTip(slot.tip, slot.cx, slot.topY - 6);
        return;
      }
      // intraday
      if (dragging) { drawBrush(h, dragX0, c.x); return; }
      if (pinActive()) { pinned = false; pinnedHit = null; }   // 钉住的框选：光标一旦在图上移动就让位给悬停十字线（触屏抬手无 move，仍保留）
      drawCrosshair(h, c.x);
    }

    function onDown(ev) {
      const h = trendHit;
      if (!h) return;
      if (h.kind === 'bars') { onMove(ev); return; }   // 触屏点一下柱子也出读数（无悬停）
      const c = vb(ev); if (!c) return;
      if (c.y < h.m.t - 6 || c.y > h.m.t + h.innerH + 6) return;   // 只在绘图区内起手
      dragging = true; pinned = false; pinnedHit = null;
      dragX0 = clampX(h, c.x);
      try { svg.setPointerCapture(ev.pointerId); } catch (e) {}
      ev.preventDefault();
    }
    function onUp(ev) {
      if (!dragging) return;
      dragging = false;
      try { svg.releasePointerCapture(ev.pointerId); } catch (e) {}
      const h = trendHit, c = vb(ev);
      if (h && h.kind === 'intraday' && c && Math.abs(clampX(h, c.x) - dragX0) >= 6) {
        pinned = true; pinnedHit = h;   // 真框选：钉住，方便（尤其触屏抬手后）继续读
        return;
      }
      pinned = false; pinnedHit = null; clearOverlay();   // 太短当点击：回到悬停
      if (h && h.kind === 'intraday' && c) drawCrosshair(h, c.x);
    }
    function onLeave() {
      if (dragging || pinActive()) return;
      clearOverlay(); hideTip();
    }

    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointerleave', onLeave);
    svg.style.touchAction = 'pan-y';   // 触屏上横向拖动归框选，纵向仍可滚页
  }

  function niceCeil(v) {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const mant = v / exp;
    let nice;
    if (mant <= 1) nice = 1;
    else if (mant <= 2) nice = 2;
    else if (mant <= 5) nice = 5;
    else nice = 10;
    return nice * exp;
  }
  function niceTicks(lo, hi, count) {
    const out = [];
    for (let i = 0; i <= count; i++) out.push(lo + (hi - lo) * (i / count));
    return out;
  }

  // ===== File picker → crop modal =====
  $pmAvatarFile.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    $pmAvatarFile.value = '';
    if (!f) return;
    if (!f.type || f.type.indexOf('image/') !== 0) { alert('请选图片文件'); return; }
    try {
      const dataUrl = await readAsDataURL(f);
      openCropModal(dataUrl);
    } catch (err) {
      alert('读取图片失败：' + err.message);
    }
  });

  // ===== Crop modal =====
  const cropState = { scale: 1, w: 0, h: 0, frame: { x: 0, y: 0, size: 0 } };
  let cropDrag = null;
  let cropApplyFn = null;   // 裁剪「应用」后把结果 dataURL 交给谁；null=默认走宠物头像

  function openCropModal(srcDataUrl, onApply) {
    cropApplyFn = onApply || null;
    $cropImg.onload = () => {
      const modalEl = $cropModal.querySelector('.modal');
      const containerW = (modalEl.clientWidth || 360) - 64;
      const maxW = Math.max(200, containerW);
      const maxH = Math.max(220, window.innerHeight * 0.55);
      const nW = $cropImg.naturalWidth, nH = $cropImg.naturalHeight;
      const scale = Math.min(maxW / nW, maxH / nH, 1);
      const dw = Math.round(nW * scale);
      const dh = Math.round(nH * scale);
      $cropStage.style.width = dw + 'px';
      $cropStage.style.height = dh + 'px';
      $cropImg.style.width = dw + 'px';
      $cropImg.style.height = dh + 'px';
      const sq = Math.floor(Math.min(dw, dh) * 0.85);
      cropState.scale = scale;
      cropState.w = dw;
      cropState.h = dh;
      cropState.frame = {
        x: Math.floor((dw - sq) / 2),
        y: Math.floor((dh - sq) / 2),
        size: sq,
      };
      updateCropFrame();
    };
    $cropImg.src = srcDataUrl;
    $cropModal.classList.add('open');
  }
  function updateCropFrame() {
    $cropFrame.style.left = cropState.frame.x + 'px';
    $cropFrame.style.top = cropState.frame.y + 'px';
    $cropFrame.style.width = cropState.frame.size + 'px';
    $cropFrame.style.height = cropState.frame.size + 'px';
  }
  function closeCropModal() { $cropModal.classList.remove('open'); }

  function getStagePos(ev) {
    const rect = $cropStage.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  $cropStage.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('crop-handle')) {
      cropDrag = { mode: 'resize-' + t.dataset.handle, frame: { ...cropState.frame } };
    } else if (t === $cropFrame || t === $cropStage || t === $cropImg) {
      cropDrag = { mode: 'move', startMouse: getStagePos(e), frame: { ...cropState.frame } };
    } else {
      return;
    }
    try { $cropStage.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  $cropStage.addEventListener('pointermove', (e) => {
    if (!cropDrag) return;
    const pos = getStagePos(e);
    const dw = cropState.w, dh = cropState.h;
    if (cropDrag.mode === 'move') {
      const dx = pos.x - cropDrag.startMouse.x;
      const dy = pos.y - cropDrag.startMouse.y;
      cropState.frame = {
        x: Math.max(0, Math.min(dw - cropDrag.frame.size, cropDrag.frame.x + dx)),
        y: Math.max(0, Math.min(dh - cropDrag.frame.size, cropDrag.frame.y + dy)),
        size: cropDrag.frame.size,
      };
    } else {
      const corner = cropDrag.mode.slice(7);
      const sf = cropDrag.frame;
      const anchor = {
        x: corner.endsWith('e') ? sf.x : sf.x + sf.size,
        y: corner.startsWith('s') ? sf.y : sf.y + sf.size,
      };
      const mx = Math.max(0, Math.min(dw, pos.x));
      const my = Math.max(0, Math.min(dh, pos.y));
      const sgnX = corner.endsWith('e') ? 1 : -1;
      const sgnY = corner.startsWith('s') ? 1 : -1;
      let size = Math.min((mx - anchor.x) * sgnX, (my - anchor.y) * sgnY);
      if (sgnX === 1) size = Math.min(size, dw - anchor.x); else size = Math.min(size, anchor.x);
      if (sgnY === 1) size = Math.min(size, dh - anchor.y); else size = Math.min(size, anchor.y);
      size = Math.max(24, size);
      cropState.frame = {
        x: corner.endsWith('e') ? anchor.x : anchor.x - size,
        y: corner.startsWith('s') ? anchor.y : anchor.y - size,
        size,
      };
    }
    updateCropFrame();
  });
  function endCropDrag(e) {
    if (cropDrag) {
      cropDrag = null;
      try { $cropStage.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }
  $cropStage.addEventListener('pointerup', endCropDrag);
  $cropStage.addEventListener('pointercancel', endCropDrag);
  // 键盘替代（a11y-7）：裁剪框可聚焦，方向键平移、+/− 缩放，夹取同拖拽一致
  function nudgeCropFrame(dx, dy, dsize) {
    const dw = cropState.w, dh = cropState.h;
    let size = Math.max(24, Math.min(cropState.frame.size + (dsize || 0), Math.min(dw, dh)));
    let x = Math.max(0, Math.min(dw - size, cropState.frame.x + (dx || 0)));
    let y = Math.max(0, Math.min(dh - size, cropState.frame.y + (dy || 0)));
    cropState.frame = { x, y, size };
    updateCropFrame();
  }
  $cropFrame.addEventListener('keydown', e => {
    const step = e.shiftKey ? 20 : 6;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft': nudgeCropFrame(-step, 0, 0); break;
      case 'ArrowRight': nudgeCropFrame(step, 0, 0); break;
      case 'ArrowUp': nudgeCropFrame(0, -step, 0); break;
      case 'ArrowDown': nudgeCropFrame(0, step, 0); break;
      case '+': case '=': nudgeCropFrame(0, 0, step); break;
      case '-': case '_': nudgeCropFrame(0, 0, -step); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  $cropApply.addEventListener('click', () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160; canvas.height = 160;
      const ctx = canvas.getContext('2d');
      const sx = cropState.frame.x / cropState.scale;
      const sy = cropState.frame.y / cropState.scale;
      const ss = cropState.frame.size / cropState.scale;
      ctx.drawImage($cropImg, sx, sy, ss, ss, 0, 0, 160, 160);
      const url = canvas.toDataURL('image/jpeg', 0.82);
      if (cropApplyFn) { cropApplyFn(url); }
      else { state.pendingAvatar = url; updateAvatarSelection(); }   // 默认：宠物头像
      closeCropModal();
    } catch (err) { alert('裁剪失败：' + err.message); }
  });
  $cropCancel.addEventListener('click', closeCropModal);
  $cropModal.addEventListener('click', e => { if (e.target === $cropModal) closeCropModal(); });

  // ===== Modal share section + permission gating =====
  function renderShareSection(p) {
    const modalEl = $modal.querySelector('.modal');
    if (!p) {
      // Adding a new pet: hide share section entirely
      $pmShareSection.style.display = 'none';
      $pmShareBlock.style.display = 'none';
      modalEl.classList.remove('pm-locked', 'pm-locked-name');
      $pmDelete.style.display = 'none';
      return;
    }
    $pmShareSection.style.display = '';
    $pmShareBlock.style.display = '';

    const role = myRoleFor(p);                 // 'owner' | 'admin' | 'regular' (shared) or 'owner' for local
    const owner = isOwner(p);
    const adminUp = isAdminOrUp(p);

    if (p.shared && p.serverPetId) {
      $pmShareCreate.style.display = 'none';
      $pmShareExisting.style.display = '';
      const hasCode = !!p.serverCode;
      $pmShareCode.textContent = hasCode ? p.serverCode : '已用 · 点 🔄 生成新码';
      $pmShareCode.style.opacity = hasCode ? '' : '0.55';
      $pmCopyCode.style.display = hasCode ? '' : 'none';
      $pmRegenCode.style.display = owner ? '' : 'none';
      $pmRegenCode.textContent = hasCode ? '🔄 重新生成' : '🔄 生成';
      // Members list
      const meId = DEVICE_ID;
      const members = p.members || [];
      $pmMembersList.innerHTML = members.map(m => {
        const self = m.deviceId === meId;
        const shortId = m.deviceId.slice(2, 10);
        const localAlias = state.contactNicknames[m.deviceId];
        // Display priority:
        //   self  →  cachedProfile.nickname (fresh) → server m.nickname → shortId
        //   other →  localAlias (your note)         → server m.nickname → shortId
        let displayName;
        if (self) {
          displayName = (cachedProfile && cachedProfile.nickname) || m.nickname || shortId;
        } else {
          displayName = localAlias || m.nickname || shortId;
        }
        const isShortId = displayName === shortId;   // no nickname set → show as muted monospace
        const roleLbl = m.role === 'owner' ? '主人' : (m.role === 'admin' ? '管理员' : '成员');
        const actions = [];
        // Anyone (except for themselves) can set a local alias for any other member
        if (!self) {
          actions.push(`<button data-act="alias" data-target="${m.deviceId}" title="本地备注">✎ 备注</button>`);
        }
        if (owner && !self) {
          if (m.role === 'admin') actions.push(`<button data-act="role" data-target="${m.deviceId}" data-role="regular">取消管理</button>`);
          else if (m.role === 'regular') actions.push(`<button data-act="role" data-target="${m.deviceId}" data-role="admin">设为管理员</button>`);
          actions.push(`<button data-act="transfer" data-target="${m.deviceId}">转让主人</button>`);
          actions.push(`<button class="danger" data-act="remove" data-target="${m.deviceId}">移除</button>`);
        }
        // If localAlias is set, show the original server name in a faded second-line for context
        const aliasHint = (!self && localAlias && m.nickname && localAlias !== m.nickname)
          ? ` <span style="color:var(--color-light);font-size:0.74rem;">(${escapeHtml(m.nickname)})</span>`
          : '';
        return `<li>
          <span class="m-id ${self ? 'm-self' : ''}${isShortId ? ' is-shortid' : ''}">${self ? '你 · ' : ''}${escapeHtml(displayName)}${aliasHint}</span>
          <span class="m-role ${m.role}">${roleLbl}</span>
          <span class="m-actions">${actions.join('')}</span>
        </li>`;
      }).join('');
      // Wire up actions
      $pmMembersList.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', () => handleMemberAction(p, btn.dataset));
      });
      // Your role text
      const roleZh = role === 'owner' ? '主人' : role === 'admin' ? '管理员' : '成员';
      $pmYourRole.innerHTML = `你是 <strong>${roleZh}</strong>`;
    } else {
      $pmShareCreate.style.display = '';
      $pmShareExisting.style.display = 'none';
    }

    // Permission gating
    // Regular: lock everything except entry recording. Modal save still allowed (no-op on locked fields).
    // Admin: lock name/emoji/avatar; unlock all metadata.
    // Owner: full access.
    modalEl.classList.toggle('pm-locked', role === 'regular');

    // Owner-only fields: name input + avatar row
    $pmName.disabled = !owner && p.shared;
    $pmAvatarRow.style.pointerEvents = (!owner && p.shared) ? 'none' : '';
    $pmAvatarRow.style.opacity = (!owner && p.shared) ? '0.55' : '';

    // Make-shared button visible only on local pets (you're the owner)
    $pmMakeShared.style.display = (!p.shared && owner) ? '' : 'none';

    // Delete button: text adapts
    $pmDelete.style.display = '';
    if (p.shared && !owner) $pmDelete.textContent = '🚪 退出共享';
    else $pmDelete.textContent = '🗑 删除';
  }

  // Set a local-only alias for another member. Reused by the member list AND the
  // activity feed so you can name an unfamiliar device wherever you run into it.
  function setContactAlias(deviceId, onDone) {
    const cur = state.contactNicknames[deviceId] || '';
    const next = prompt('给 TA 起个备注名（只有你自己看得到，方便认人；留空则清除）：', cur);
    if (next === null) return;
    const trimmed = next.trim().slice(0, 40);
    if (trimmed) state.contactNicknames[deviceId] = trimmed;
    else delete state.contactNicknames[deviceId];
    persist();
    // 备注是设备私有字段，却和宠物状态同存于被 CloudSync“整份覆盖”的 blob 里。设完立刻推一次，
    // 否则只靠 30s 定时 / beforeunload 兜底，而 beforeunload 的 fetch 会在刷新时被浏览器掐断，
    // 导致备注根本没上云；下次加载 pull 又用尚无此备注的云端快照把它盖掉 → 刷新即丢。
    try { if (window.CloudSync && window.CloudSync.push) window.CloudSync.push(); } catch (_) {}
    if (onDone) onDone();
  }
  // True when we have no human-readable name for this member yet (only their shortId).
  function hasNoNameFor(pet, deviceId) {
    if (!deviceId || deviceId === DEVICE_ID) return false;
    if (state.contactNicknames[deviceId]) return false;
    const m = (pet && pet.members || []).find(x => x.deviceId === deviceId);
    return !(m && m.nickname);
  }

  async function handleMemberAction(p, ds) {
    if (!p.serverPetId) return;
    const target = ds.target;
    // Local alias (no backend call)
    if (ds.act === 'alias') {
      setContactAlias(target, () => renderShareSection(p));
      return;
    }
    try {
      if (ds.act === 'role') {
        await apiRetry('set-role', { petId: p.serverPetId, body: { targetDeviceId: target, role: ds.role } });
      } else if (ds.act === 'remove') {
        if (!confirm('把「' + memberDisplayName(p, target) + '」移出？他们将立即失去访问权。')) return;
        await apiRetry('remove-member', { petId: p.serverPetId, body: { targetDeviceId: target } });
      } else if (ds.act === 'transfer') {
        const tName = memberDisplayName(p, target);
        if (!confirm('把主人身份转让给「' + tName + '」？你将变成管理员。')) return;
        await apiRetry('transfer', { petId: p.serverPetId, body: { newOwnerDeviceId: target } });
      }
      const r = await api('get', { petId: p.serverPetId });
      p.members = r.members || p.members;
      persist();
      renderShareSection(p);
      render();
    } catch (e) {
      console.error(e); alert('操作没成功，请检查网络后重试。');
    }
  }

  function applyEntryFormLock() {
    const pet = currentPet();
    const role = pet ? myRoleFor(pet) : 'owner';
    const lockBowl = pet && pet.shared && role === 'regular';
    $bowlRow.classList.toggle('locked', !!lockBowl);
  }

  // ===== Modal =====
  // Transient (per modal session) intent tracking for the 推荐→目标 linkage.
  let recAppliedThisSession = false;   // user clicked 套用 (apply recommendation)
  let targetEditedManually = false;    // user hand-edited the target fields
  function openModal(id) {
    state.editingId = id || null;
    recAppliedThisSession = false;
    targetEditedManually = false;
    pmClearAllErrors();
    if (id) {
      const p = state.pets.find(x => x.id === id);
      if (!p) return;
      $pmTitle.textContent = '编辑宠物';
      $pmName.value = p.name;
      $pmSpecies.value = p.species || '';
      buildBreedDropdown(p.species || '', p.breed || '');
      const ageParts = splitAge(p.ageYears);
      $pmAgeYears.value = ageParts.years === '' ? '' : ageParts.years;
      $pmAgeMonths.value = ageParts.months === '' ? '' : ageParts.months;
      const bwUnit = p.bodyWeightUnit || 'kg';
      $pmBodyWeightUnit.value = bwUnit;
      $pmBodyWeight.value = (Number.isFinite(p.bodyWeight) && p.bodyWeight > 0)
        ? parseFloat(bwFromKg(p.bodyWeight, bwUnit).toFixed(2))
        : '';
      $pmActivity.value = p.activity || '';
      $pmNeutered.checked = !!p.neutered;
      state.selectedEmoji = p.emoji || EMOJIS[0];
      state.pendingAvatar = p.avatar || null;
      $pmDelete.style.display = '';
    } else {
      $pmTitle.textContent = '添加宠物';
      $pmName.value = '';
      $pmSpecies.value = '';
      buildBreedDropdown('', '');
      $pmAgeYears.value = '';
      $pmAgeMonths.value = '';
      $pmBodyWeightUnit.value = 'kg';
      $pmBodyWeight.value = '';
      $pmActivity.value = '';
      $pmNeutered.checked = false;
      state.selectedEmoji = EMOJIS[0];
      state.pendingAvatar = null;
      $pmDelete.style.display = 'none';
    }
    updateAvatarSelection();
    const editingPet = id ? state.pets.find(x => x.id === id) : null;
    renderShareSection(editingPet);
    $modal.classList.add('open');
    setTimeout(() => $pmName.focus(), 50);
  }
  function closeModal() {
    $modal.classList.remove('open');
    state.editingId = null;
    state.pendingAvatar = null;
  }

  // ===== Profile modal =====
  let cachedProfile = null;
  async function loadProfile() {
    try {
      const r = await api('get-profile', { method: 'GET' });
      cachedProfile = r.profile || {};
    } catch (_) { cachedProfile = cachedProfile || {}; }
    return cachedProfile;
  }
  function openProfileModal() {
    $profileNickname.value = (cachedProfile && cachedProfile.nickname) || '';
    renderMyPetsList();
    $profileModal.classList.add('open');
    // Reload nickname from server in background
    loadProfile().then(() => { $profileNickname.value = (cachedProfile && cachedProfile.nickname) || ''; }).catch(() => {});
  }
  function closeProfileModal() { $profileModal.classList.remove('open'); }

  // ===== Backup: export / import (pure local, no cloud) =====
  function exportBackup() {
    const payload = { app: 'pet-center', v: 1, exportedAt: new Date().toISOString(), data: serializeState() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
    const a = document.createElement('a');
    a.href = url; a.download = `宠物中心备份-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(String(reader.result)); } catch { alert('这个文件读不出来，确认是导出的备份 .json 吗？'); return; }
      const data = (parsed && parsed.data) ? parsed.data : parsed;   // accept raw state too
      if (!data || !Array.isArray(data.pets)) { alert('备份里没有宠物数据，换个文件试试。'); return; }
      if (!confirm('从备份恢复？备份里的宠物与记录会并入当前数据（按记录 id 去重，不会重复，也不会删掉现有的）。')) return;
      // Merge pets by id (or serverPetId); union their entries by entry id.
      data.pets.forEach(ip => {
        const local = state.pets.find(p => p.id === ip.id || (ip.serverPetId && p.serverPetId === ip.serverPetId));
        if (local) {
          local.entries = mergeServerEntries(local.entries, ip.entries || []);
          ['foodLibrary', 'foodGroups', 'kibble', 'name', 'emoji', 'avatar'].forEach(k => { if (local[k] == null && ip[k] != null) local[k] = ip[k]; });
        } else {
          state.pets.push(ip);
        }
      });
      migratePets();   // 规整导入进来的宠物（补 entries 数组等），避免 render() 撞到脏结构崩页
      if (data.contactNicknames) state.contactNicknames = Object.assign({}, data.contactNicknames, state.contactNicknames);
      if (!state.currentId && state.pets.length) state.currentId = state.pets[0].id;
      if (persist()) { render(); alert('恢复完成 ✓'); }
    };
    reader.readAsText(file);
  }

  function renderMyPetsList() {
    const pets = state.pets;
    if (pets.length === 0) {
      $myPetsList.innerHTML = '<li class="mp-empty">还没有宠物</li>';
      return;
    }
    $myPetsList.innerHTML = pets.map(p => {
      const role = myRoleFor(p);
      const roleZh = role === 'owner' ? '主人' : role === 'admin' ? '管理员' : '成员';
      const iconImg = p.avatar ? `<img src="${escapeHtml(p.avatar)}" alt="">` : escapeHtml(p.emoji || '🐾');
      return `<li data-pet-id="${p.id}">
        <span class="mp-icon">${iconImg}</span>
        <span class="mp-name">${escapeHtml(p.name || '未命名')}</span>
        <span class="mp-role-badge ${role}">${roleZh}</span>
      </li>`;
    }).join('');
    $myPetsList.querySelectorAll('li[data-pet-id]').forEach(li => {
      li.addEventListener('click', () => {
        const id = li.dataset.petId;
        if (!id) return;
        state.currentId = id;
        persist();
        closeProfileModal();
        render();
        openModal(id);
      });
    });
  }
  $profileBtn.addEventListener('click', openProfileModal);
  $profileClose.addEventListener('click', closeProfileModal);
  $profileModal.addEventListener('click', e => { if (e.target === $profileModal) closeProfileModal(); });
  // 隐私与数据说明弹窗（档案里 + 首屏欢迎卡 都能打开）
  const $privacyModal = document.getElementById('privacy-modal');
  function openPrivacyModal() { if ($privacyModal) $privacyModal.classList.add('open'); }
  const $profilePrivacy = document.getElementById('profile-privacy');
  const $welcomePrivacy = document.getElementById('welcome-privacy');
  const $privacyClose = document.getElementById('privacy-close');
  if ($profilePrivacy) $profilePrivacy.addEventListener('click', openPrivacyModal);
  if ($welcomePrivacy) $welcomePrivacy.addEventListener('click', openPrivacyModal);
  if ($privacyClose) $privacyClose.addEventListener('click', () => $privacyModal.classList.remove('open'));
  if ($privacyModal) $privacyModal.addEventListener('click', e => { if (e.target === $privacyModal) $privacyModal.classList.remove('open'); });
  // PWA 独立窗口里站点导航被隐藏，用 App 顶栏的按钮切明暗（复用站点全局 toggleTheme）
  const $pfThemeToggle = document.getElementById('pf-theme-toggle');
  if ($pfThemeToggle) $pfThemeToggle.addEventListener('click', () => { if (typeof window.toggleTheme === 'function') window.toggleTheme(); });
  const $backupExport = document.getElementById('backup-export');
  const $backupImport = document.getElementById('backup-import');
  const $backupFile = document.getElementById('backup-file');
  if ($backupExport) $backupExport.addEventListener('click', exportBackup);
  if ($backupImport) $backupImport.addEventListener('click', () => $backupFile.click());
  if ($backupFile) $backupFile.addEventListener('change', () => {
    const f = $backupFile.files && $backupFile.files[0];
    if (f) importBackup(f);
    $backupFile.value = '';
  });
  $profileNickname.addEventListener('blur', async () => {
    const nickname = $profileNickname.value.trim().slice(0, 40);
    const cur = (cachedProfile && cachedProfile.nickname) || '';
    if (nickname === cur) return;
    try {
      await api('set-nickname', { body: { nickname } });
      cachedProfile = { ...(cachedProfile || {}), nickname: nickname || null };
      // Refresh members lists of shared pets (their cached members now stale on others' devices,
      // but for us it's fine — we know our own nickname)
    } catch (e) { /* silent */ }
  });
  $profileNickname.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $profileNickname.blur(); }
  });

  // ===== Join via code =====
  function openJoinModal() {
    $joinCode.value = '';
    $joinModal.classList.add('open');
    setTimeout(() => $joinCode.focus(), 50);
  }
  function closeJoinModal() { $joinModal.classList.remove('open'); }
  $emptyJoin.addEventListener('click', openJoinModal);
  $joinCancel.addEventListener('click', closeJoinModal);
  // 没有宠物码的新人，给一条回到「新建宠物」的出路
  const $joinToNew = document.getElementById('join-to-new');
  if ($joinToNew) $joinToNew.addEventListener('click', () => { closeJoinModal(); openModal(null); });
  $joinModal.addEventListener('click', e => { if (e.target === $joinModal) closeJoinModal(); });
  $joinCode.addEventListener('input', () => { $joinCode.value = $joinCode.value.toUpperCase(); });
  $joinCode.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $joinConfirm.click(); }
  });
  $joinConfirm.addEventListener('click', async () => {
    const code = $joinCode.value.trim().toUpperCase();
    if (!code || code.length < 4) { $joinCode.focus(); return; }
    $joinConfirm.disabled = true; $joinConfirm.textContent = '加入中…';
    try {
      const r = await api('join', { body: { code } });
      // Avoid dup if user already had this pet locally
      const existing = state.pets.find(p => p.serverPetId === r.petId);
      if (existing) {
        await flushOps(existing);   // push any queued local records before merging
        // 只按字段合并服务端 meta，绝不整体展开 r.pet（否则会把本地稳定 id/createdAt 覆盖成 serverPetId，
        // 与全局其它 join/pull 路径保持一致，见 META_FIELDS.forEach 用法）
        META_FIELDS.forEach(k => { if (r.pet && r.pet[k] !== undefined) existing[k] = r.pet[k]; });
        existing.shared = true;
        existing.serverPetId = r.petId;
        existing.serverCode = r.code;
        existing.members = r.members || [];
        existing.entries = mergeServerEntries(existing.entries, r.entries);
        if (r.myToken) existing.memberToken = r.myToken;
        existing.knownMemberIds = (r.members || []).map(m => m.deviceId);
        state.currentId = existing.id;
      } else {
        const newPet = {
          id: uuid('pet'),
          shared: true,
          serverPetId: r.petId,
          serverCode: r.code,
          memberToken: r.myToken || null,
          members: r.members || [],
          knownMemberIds: (r.members || []).map(m => m.deviceId),   // baseline roster on join
          entries: r.entries || [],
          createdAt: new Date().toISOString(),
          preferredUnit: 'g',
          bowlUnit: 'g',
          bodyWeightUnit: 'kg',
          showTargetOnChart: true,
          activitySeenAt: Date.now(),   // joining: existing history is the baseline, not "new"
          tcSeen: [],
        };
        META_FIELDS.forEach(k => { if (r.pet && r.pet[k] !== undefined) newPet[k] = r.pet[k]; });
        if (!newPet.name) newPet.name = '共享宠物';
        if (!newPet.emoji) newPet.emoji = '🐾';
        state.pets.push(newPet);
        state.currentId = newPet.id;
      }
      persist();
      render();
      closeJoinModal();
    } catch (e) {
      const msg = e && e.message === 'code_not_found' ? '宠物码不存在' : '加入失败，请检查网络后重试。';
      alert(msg);
    } finally {
      $joinConfirm.disabled = false; $joinConfirm.textContent = '加入';
    }
  });

  // ===== Make local pet shared =====
  $pmMakeShared.addEventListener('click', async () => {
    if (!state.editingId) return;
    const p = state.pets.find(x => x.id === state.editingId);
    if (!p) return;
    $pmMakeShared.disabled = true; $pmMakeShared.textContent = '生成中…';
    try {
      const payload = petMetaPatch(p);
      payload.entries = p.entries || [];
      const r = await api('create', { body: { pet: payload } });
      p.shared = true;
      p.serverPetId = r.petId;
      p.serverCode = r.code;
      if (r.myToken) p.memberToken = r.myToken;
      p.members = r.members || [];
      p.knownMemberIds = (r.members || []).map(m => m.deviceId);   // baseline roster
      persist();
      // Refresh modal share UI
      renderShareSection(p);
    } catch (e) {
      console.error(e); alert('生成失败，请检查网络后重试。');
    } finally {
      $pmMakeShared.disabled = false; $pmMakeShared.textContent = '🔗 生成宠物码';
    }
  });

  // ===== Copy + regen code =====
  $pmCopyCode.addEventListener('click', async () => {
    const code = ($pmShareCode.textContent || '').trim();
    if (!code) return;
    // 复制成可点击的邀请链接——家人打开就自动填好宠物码、弹出加入框（disc-8）
    const link = location.origin + '/toolbox/pet/?join=' + encodeURIComponent(code);
    const text = '一起记录我家宝贝吧～打开链接加入：' + link + '（宠物码 ' + code + '）';
    try {
      await navigator.clipboard.writeText(text);
      $pmCopyCode.textContent = '✓ 已复制';
      setTimeout(() => { $pmCopyCode.textContent = '📋 复制邀请'; }, 1600);
    } catch (_) { /* */ }
  });
  $pmRegenCode.addEventListener('click', async () => {
    if (!state.editingId) return;
    const p = state.pets.find(x => x.id === state.editingId);
    if (!p || !p.serverPetId) return;
    if (!confirm('生成新宠物码？旧码立刻失效，之后要用新码才能加入。')) return;
    // Regenerating only blocks NEW joins — people who already joined stay in.
    // Offer to also remove them, for when you suspect the old code leaked.
    const others = (p.members || []).filter(m => m.role !== 'owner').length;
    let kickOthers = false;
    if (others > 0) {
      kickOthers = confirm(`当前还有 ${others} 位已加入的成员。\n\n确定 = 同时把他们移出（彻底清退，怀疑泄露时用）\n取消 = 只换码，已加入的成员保留`);
    }
    try {
      const r = await apiRetry('regenerate-code', { petId: p.serverPetId, body: { kickOthers } });
      p.serverCode = r.code;
      $pmShareCode.textContent = r.code;
      if (r && Array.isArray(r.members)) p.members = r.members;
      persist();
      renderShareSection(p);
    } catch (e) {
      console.error(e); alert('操作没成功，请检查网络后重试。');
    }
  });

  // + 宠物 → dropdown 菜单（新建 / 用宠物码加入）
  $petAdd.addEventListener('click', (e) => {
    e.stopPropagation();
    $petAddMenu.classList.toggle('open');
  });
  $petAddMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    $petAddMenu.classList.remove('open');
    if (btn.dataset.act === 'new') openModal(null);
    else if (btn.dataset.act === 'join') openJoinModal();
  });
  document.addEventListener('click', (e) => {
    if (!$petAddWrap.contains(e.target)) $petAddMenu.classList.remove('open');
  });
  $emptyAdd.addEventListener('click', () => openModal(null));
  $pmCancel.addEventListener('click', closeModal);
  $modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });
  // Close whichever modal is currently open (used by Esc and the ✕ buttons).
  function closeTopModal() {
    if ($catAddModal && $catAddModal.classList.contains('open')) { $catAddModal.classList.remove('open'); return; }
    if ($privacyModal && $privacyModal.classList.contains('open')) { $privacyModal.classList.remove('open'); return; }
    if ($cropModal.classList.contains('open')) closeCropModal();
    else if ($joinModal.classList.contains('open')) closeJoinModal();
    else if ($profileModal.classList.contains('open')) closeProfileModal();
    else if ($mmModal.classList.contains('open')) $mmModal.classList.remove('open');
    else if ($intakeModal.classList.contains('open')) closeIntakeModal();
    else if ($inboxModal.classList.contains('open')) closeInbox();
    else if ($foodModal.classList.contains('open')) closeFoodModal();
    else if ($fw.classList.contains('open')) { $fw.classList.remove('open'); }
    else if ($tpModal.classList.contains('open')) closeTimePicker();
    else if ($modal.classList.contains('open')) closeModal();
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($petAddMenu.classList.contains('open')) { $petAddMenu.classList.remove('open'); return; }
    closeTopModal();
  });
  // Inject a top-right ✕ close button into every modal header (so users don't have
  // to scroll to the bottom cancel on long forms). Reuses closeTopModal.
  document.querySelectorAll('.modal-backdrop > .modal > h2').forEach(h2 => {
    if (h2.querySelector('.modal-close')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'modal-close'; b.setAttribute('aria-label', '关闭'); b.textContent = '✕';
    b.addEventListener('click', () => closeTopModal());
    h2.appendChild(b);
  });

  $pmSave.addEventListener('click', () => {
    // —— 只有「名字」必填；物种/品种/年龄/体重都选填（用于估算每日推荐量，可稍后补）——
    pmClearAllErrors();
    const errs = [];
    const name = $pmName.value.trim();
    if (!name) errs.push([$pmNameField, '给 TA 起个名字吧']);
    const species = $pmSpecies.value || null;   // 选填
    const breed = $pmBreed.value || null;        // 选填
    const ageProvided = ($pmAgeYears.value !== '' || $pmAgeMonths.value !== '');
    const ageYearsRaw = combineAge($pmAgeYears.value, $pmAgeMonths.value);
    if (ageProvided) {
      if (!Number.isFinite(ageYearsRaw) || ageYearsRaw <= 0) errs.push([$pmAgeField, '年龄填个数字，或者留空']);
      else if (ageYearsRaw > 40) errs.push([$pmAgeField, '年龄看起来不太对（最多 40 岁）']);
    }
    const bwUnit = $pmBodyWeightUnit.value || 'kg';
    const weightProvided = ($pmBodyWeight.value.trim() !== '');
    const bwRaw = parseFloat($pmBodyWeight.value);
    let bodyWeight = NaN;
    if (weightProvided) {
      if (!Number.isFinite(bwRaw) || bwRaw <= 0) errs.push([$pmWeightField, '体重填个数字，或者留空']);
      else {
        bodyWeight = bwToKg(bwRaw, bwUnit);
        if (!Number.isFinite(bodyWeight) || bodyWeight <= 0 || bodyWeight > 120) errs.push([$pmWeightField, '体重看起来不太对（应在 0–120 之间）']);
      }
    }
    // 归一成「有就用、没有就 null」，供下面档案与估算判断
    const age = (ageProvided && Number.isFinite(ageYearsRaw) && ageYearsRaw > 0 && ageYearsRaw <= 40) ? ageYearsRaw : null;
    const bw = (weightProvided && Number.isFinite(bodyWeight) && bodyWeight > 0 && bodyWeight <= 120) ? bodyWeight : null;
    if (errs.length) {
      errs.forEach(([f, m]) => pmSetErr(f, m));
      const first = errs[0][0];
      if (first) {
        first.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const inp = first.querySelector('input, select, .cs-trigger');
        if (inp) inp.focus({ preventScroll: true });
      }
      return;
    }
    const activity = $pmActivity.value || 'normal';   // 留空=普通
    const neutered = !!$pmNeutered.checked;

    if (state.editingId) {
      const p = state.pets.find(x => x.id === state.editingId);
      if (!p) return;
      p.name = name;
      p.emoji = state.selectedEmoji;
      p.avatar = state.pendingAvatar || null;
      p.species = species;
      p.breed = breed;
      p.ageYears = age;
      p.bodyWeight = bw;
      p.bodyWeightUnit = bwUnit;
      p.activity = activity;
      p.neutered = neutered;
      // 目标 / 干粮热量 / 换算基准 不在档案弹窗里改 —— 由「食量设置」弹窗负责，这里别动它们。
      delete p.lifeStage;
    } else {
      const id = uuid('pet');
      // 档案齐全（物种+年龄+体重都填了）才自动套用推荐并跟随；只填名字的先不设目标，
      // 看板会显示「点这里设定每日目标」的 CTA 引导稍后补。
      const est = (species && age != null && bw != null)
        ? estimatorCompute({ species, breed: breed || '', age, bodyWeightKg: bw, activity, neutered, kibbleKcalPerG: kibbleDefaultFor(species) })
        : null;
      state.pets.push({
        id, name,
        emoji: state.selectedEmoji,
        avatar: state.pendingAvatar || null,
        bowlWeight: null,
        bowlUnit: 'g',
        dailyTargetMin: est ? est.min : null,
        dailyTargetMax: est ? est.max : null,
        showTargetOnChart: true,
        targetFollowsRecommendation: !!est,
        species,
        breed,
        ageYears: age,
        bodyWeight: bw,
        bodyWeightUnit: bwUnit,
        activity,
        neutered,
        kibbleKcalPerG: kibbleDefaultFor(species),
        conversionBase: 'kibble',
        foodLibrary: [],
        preferredUnit: 'g',
        entries: [],
        createdAt: new Date().toISOString(),
      });
      state.currentId = id;
    }
    const savedId = state.editingId || state.currentId;
    persist();
    closeModal();
    render();
    schedulePushMeta(state.pets.find(p => p.id === savedId) || null);
  });

  // ===== 食量设置弹窗（点 🎯 目标条打开）=====
  function petBodySummary(pet) {
    const bits = [];
    const ap = splitAge(pet.ageYears);
    let a = '';
    if (ap.years !== '' && ap.years > 0) a += ap.years + '岁';
    if (ap.months !== '' && ap.months > 0) a += ap.months + '月';
    if (a) bits.push(a);
    if (pet.neutered) bits.push('已绝育');
    if (Number.isFinite(pet.bodyWeight) && pet.bodyWeight > 0) {
      const u = pet.bodyWeightUnit || 'kg';
      bits.push(parseFloat(bwFromKg(pet.bodyWeight, u).toFixed(2)) + ' ' + u);
    }
    return bits.length ? bits.join(' · ') : '档案还没填';
  }
  function openIntakeModal() {
    const pet = currentPet();
    if (!pet) return;
    intakeEditId = pet.id;
    recAppliedThisSession = false;
    targetEditedManually = false;
    $imPetAv.textContent = pet.emoji || '🐱';
    $imPetName.textContent = pet.name || '宝贝';
    $imPetSub.textContent = petBodySummary(pet);
    pmTargetG.min = (Number.isFinite(pet.dailyTargetMin) && pet.dailyTargetMin > 0) ? pet.dailyTargetMin : null;
    pmTargetG.max = (Number.isFinite(pet.dailyTargetMax) && pet.dailyTargetMax > 0) ? pet.dailyTargetMax : null;
    $pmKibbleKcal.value = (Number.isFinite(pet.kibbleKcalPerG) && pet.kibbleKcalPerG > 0) ? parseFloat(pet.kibbleKcalPerG.toFixed(2)) : '';
    $pmKibbleKcal.placeholder = String(kibbleDefaultFor(pet.species));   // 默认能量密度随物种
    renderConvBaseOptions(pet);
    pmBaseId = $pmConvBase.value || 'kibble';
    imToggleKibbleField();
    pmRenderTargetInputs();
    refreshEstimatorPreview();
    $intakeModal.classList.add('open');
  }
  function closeIntakeModal() { $intakeModal.classList.remove('open'); intakeEditId = null; }
  function saveIntake() {
    const pet = state.pets.find(p => p.id === intakeEditId);
    if (!pet) { closeIntakeModal(); return; }
    if (!isAdminOrUp(pet)) { alert('只有主人/管理员能改食量设置'); return; }
    if (pmTargetG.min != null && pmTargetG.max != null && pmTargetG.min > pmTargetG.max) {
      alert('每日目标的下限不能大于上限'); return;
    }
    setTarget(pet, (pmTargetG.min != null) ? pmTargetG.min : null, (pmTargetG.max != null) ? pmTargetG.max : null);
    if (recAppliedThisSession) pet.targetFollowsRecommendation = true;
    else if (targetEditedManually) pet.targetFollowsRecommendation = false;
    const kkRaw = parseFloat($pmKibbleKcal.value);
    pet.kibbleKcalPerG = (Number.isFinite(kkRaw) && kkRaw > 0) ? kkRaw : 3.8;
    pet.conversionBase = $pmConvBase.value || 'kibble';
    persist();
    render();
    schedulePushMeta(pet);
    closeIntakeModal();
  }
  $imSave.addEventListener('click', saveIntake);
  $imCancel.addEventListener('click', closeIntakeModal);
  $intakeModal.addEventListener('click', e => { if (e.target === $intakeModal) closeIntakeModal(); });
  $imEditProfile.addEventListener('click', () => { const id = intakeEditId; closeIntakeModal(); openModal(id); });

  $pmDelete.addEventListener('click', async () => {
    if (!state.editingId) return;
    const p = state.pets.find(x => x.id === state.editingId);
    if (!p) return;

    if (p.shared && p.serverPetId) {
      if (isOwner(p)) {
        if (!confirm('彻底删除这只宠物？所有共享的人都会失去这只宠物（包含所有记录）。')) return;
        try { await api('delete', { petId: p.serverPetId, body: {} }); }
        catch (e) { console.error(e); alert('删除失败，请检查网络后重试。'); return; }
      } else {
        if (!confirm('仅从你这边移除？其他人仍能继续记录。')) return;
        try { await apiRetry('leave', { petId: p.serverPetId, body: {} }); } catch (_) {}
      }
    } else {
      if (!confirm('删除这只宠物以及所有记录？')) return;
    }

    state.pets = state.pets.filter(x => x.id !== state.editingId);
    if (state.currentId === state.editingId) {
      state.currentId = state.pets[0] ? state.pets[0].id : null;
    }
    persist();
    closeModal();
    render();
  });

  // ===== Entry add (with mismatch detection) =====
  // Timestamp to stamp on a new record: a custom time the user picked, else now.
  // Anyone may set this. pendingEntryTs null = "now".
  let pendingEntryTs = null;
  function pickedEntryTs() { return pendingEntryTs || Date.now(); }
  function setPendingEntryTs(ts) {
    pendingEntryTs = ts || null;
    if (pendingEntryTs) {
      $timeVal.textContent = shortMD(isoDate(pendingEntryTs)) + ' ' + fmtTime(pendingEntryTs);
      $timeToggle.classList.add('custom');
    } else {
      $timeVal.textContent = '现在';
      $timeToggle.classList.remove('custom');
    }
    updateWeightTimeDisplay();
  }
  let pendingEntryTsEnd = null;   // 直接填模式可选的结束时间戳（构成时间段）
  function setPendingEntryTsEnd(ts) {
    pendingEntryTsEnd = ts || null;
    applyTimeEndUI(recordMethod === 'direct');
  }
  function applyTimeEndUI(enabled) {
    if (!enabled) { $timeAddEnd.style.display = 'none'; $timeEndToggle.style.display = 'none'; return; }
    if (pendingEntryTsEnd) {
      $timeAddEnd.style.display = 'none';
      $timeEndToggle.style.display = '';
      $timeEndVal.textContent = shortMD(isoDate(pendingEntryTsEnd)) + ' ' + fmtTime(pendingEntryTsEnd);
    } else {
      $timeAddEnd.style.display = '';
      $timeEndToggle.style.display = 'none';
    }
  }
  function resetEntryTime() { setPendingEntryTs(null); pendingEntryTsEnd = null; applyTimeEndUI(recordMethod === 'direct'); }

  // ===== Unified food selector (kibble + saved treats/cans) =====
  let recordFood = 'kibble';  // 'kibble' | foodId
  let recordMethod = 'diff';  // 'direct' | 'diff'（每种食物可不同；干粮默认 diff，其它默认 direct）
  // 记住每种食物上次用的填法（设备本地，不跨设备同步）
  function methodPrefKey(pet) { return 'pet-method-pref'; }
  function getMethodPref(pet, foodKey) {
    try { const m = JSON.parse(localStorage.getItem(methodPrefKey(pet)) || '{}'); return m[pet.id + '|' + foodKey] || null; } catch (_) { return null; }
  }
  function setMethodPref(pet, foodKey, method) {
    try { const m = JSON.parse(localStorage.getItem(methodPrefKey(pet)) || '{}'); m[pet.id + '|' + foodKey] = method; localStorage.setItem(methodPrefKey(pet), JSON.stringify(m)); } catch (_) {}
  }
  function defaultMethodFor(foodKey) { return 'direct'; }   // 新手默认「直接填吃了多少」最直观；作差/称重仍可手动切，并按食物记住上次选择
  function lastRemainReading(pet, foodId) {
    const list = (pet.entries || []).filter(e => e.kind === 'remain' && e.foodId === foodId).sort((a, b) => b.ts - a.ts);
    return list.length ? Number(list[0].reading) : null;
  }
  function unitOf(food) { return food.measure === 'gram' ? 'g' : (food.unitLabel || '份'); }
  function currentFoodItem() {
    if (recordFood === 'kibble') return null;
    const pet = currentPet();
    return ((pet && pet.foodLibrary) || []).find(f => f.id === recordFood) || null;
  }
  // 食物图标：有照片用照片(小方图)，否则用 emoji。
  function foodIconHTML(item, fallback) {
    // emoji / iconPhoto come from synced foodLibrary (any member can set them) → escape.
    return (item && item.iconPhoto)
      ? `<img class="fc-photo" src="${escapeHtml(item.iconPhoto)}" alt="">`
      : escapeHtml((item && item.emoji) || fallback);
  }
  let foodFilter = null;   // 分类筛选：null=全部，或某类别(foodGroup) id
  function renderFoodSelector() {
    const pet = currentPet();
    if (!pet) { $foodSelector.innerHTML = ''; return; }
    const lib = pet.foodLibrary || [];
    const groups = Array.isArray(pet.foodGroups) ? pet.foodGroups : [];
    const groupById = new Map(groups.map(g => [g.id, g]));
    // Selected food may have been deleted/synced away → fall back to kibble.
    if (recordFood !== 'kibble' && !lib.some(f => f.id === recordFood)) recordFood = 'kibble';
    const canEdit = isAdminOrUp(pet);
    const kb = pet.kibble || {};
    const kbName = kb.name || '干粮';
    // ===== 分类筛选标签：全部 + 有食物的类别（用户自建；没建过就不显示筛选行）=====
    const $foodFilter = document.getElementById('food-filter');
    if ($foodFilter) {
      const cats = groups.filter(g => lib.some(f => f.groupId === g.id));
      if (cats.length === 0) { $foodFilter.style.display = 'none'; foodFilter = null; }
      else {
        if (foodFilter && !cats.some(g => g.id === foodFilter)) foodFilter = null;   // 该类别没食物了 → 回全部
        $foodFilter.style.display = '';
        // 选中某类别时、标签旁给管理员一个小 ✎ → 改名 / 删除该类别（openGroupEditor）
        $foodFilter.innerHTML = `<button type="button" class="ff${!foodFilter ? ' active' : ''}" data-cat="">全部</button>` +
          cats.map(g => {
            const on = foodFilter === g.id;
            const edit = (on && canEdit) ? `<button type="button" class="ff-edit" data-editcat="${g.id}" aria-label="改名或删除类别 ${escapeHtml(g.name || '')}" title="改名 / 删除">✎</button>` : '';
            return `<button type="button" class="ff${on ? ' active' : ''}" data-cat="${g.id}">${escapeHtml(g.name || '类别')}</button>${edit}`;
          }).join('');
        $foodFilter.querySelectorAll('.ff').forEach(b => b.addEventListener('click', () => { foodFilter = b.dataset.cat || null; renderFoodSelector(); }));
        $foodFilter.querySelectorAll('.ff-edit').forEach(b => b.addEventListener('click', () => openGroupEditor(b.dataset.editcat)));
      }
    }
    const visible = lib.filter(f => !foodFilter || f.groupId === foodFilter);

    // 圆食豆：一个头像圆点 + 名字；选中金环。编辑✎只在选中的食豆上冒出来。
    const foodCoin = (f) => `<div class="coin${recordFood===f.id?' on':''}" role="button" tabindex="0" data-food="${f.id}"><span class="disc">${foodIconHTML(f,'🍖')}</span><span class="cn">${escapeHtml(f.name)}</span>${canEdit ? `<button type="button" class="coin-edit" data-edit="${f.id}" aria-label="编辑 ${escapeHtml(f.name)}" title="编辑">✎</button>` : ''}</div>`;

    // 干粮固定第一个（只在「全部」下出现）
    let html = '';
    if (!foodFilter) html += `<div class="coin${recordFood==='kibble'?' on':''}" role="button" tabindex="0" data-food="kibble"><span class="disc">${foodIconHTML(kb,'🥣')}</span><span class="cn">${escapeHtml(kbName)}</span>${canEdit ? `<button type="button" class="coin-edit" data-edit="kibble" aria-label="编辑干粮" title="编辑">✎</button>` : ''}</div>`;
    visible.forEach(f => { html += foodCoin(f); });
    if (canEdit) html += `<div class="coin add" role="button" tabindex="0" data-food="__new"><span class="disc">＋</span><span class="cn">新建</span></div>`;
    $foodSelector.innerHTML = html;
    $foodSelector.querySelectorAll('.coin').forEach(coin => {
      coin.addEventListener('click', e => {
        if (e.target.dataset.edit) { openFoodModal(e.target.dataset.edit); return; }
        const f = coin.dataset.food;
        if (f === '__new') { if (foodFilter) openCatAddModal(foodFilter); else openFoodModal(null); return; }
        selectRecordFood(f);
      });
      coin.addEventListener('keydown', e => {
        if (e.target !== coin) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); coin.click(); }
      });
    });
    updatePickerTrigger();
  }
  // 手机端「当前食物」触发条：显示当前选中的食物 + 换▾（桌面端 CSS 隐藏此条）。
  function updatePickerTrigger() {
    if (!$foodPickerTrigger) return;
    const pet = currentPet();
    if (!pet) { $foodPickerTrigger.innerHTML = ''; return; }
    let icon, name;
    if (recordFood === 'kibble') {
      const kb = pet.kibble || {}; icon = foodIconHTML(kb, '🥣'); name = kb.name || '干粮';
    } else {
      const f = (pet.foodLibrary || []).find(x => x.id === recordFood);
      if (f) { icon = foodIconHTML(f, '🍖'); name = f.name; }
      else { const kb = pet.kibble || {}; icon = foodIconHTML(kb, '🥣'); name = kb.name || '干粮'; }
    }
    $foodPickerTrigger.innerHTML = `<span class="fpt-emoji">${icon}</span><span class="fpt-name">${escapeHtml(name)}</span><span class="fpt-caret">换</span>`;
  }
  // 折叠组：增删改与折叠开关。组只是「组织容器」，不带任何换算系数——每个成员仍保留各自的
  // 等效干粮重量。组头不可被选来记账（点它＝展开/收起）。
  function createFoodGroup(pet, name) {
    if (!Array.isArray(pet.foodGroups)) pet.foodGroups = [];
    const id = uuid('g');
    pet.foodGroups.push({ id, name: (name || '类别').slice(0, 12), emoji: '🗂', collapsed: false });
    return id;
  }
  function toggleGroupCollapsed(gid) {
    const pet = currentPet(); if (!pet) return;
    const g = (pet.foodGroups || []).find(x => x.id === gid); if (!g) return;
    g.collapsed = !g.collapsed;
    persist(); schedulePushMeta(pet);
    renderFoodSelector();
  }
  function openGroupEditor(gid) {
    const pet = currentPet(); if (!pet || !isAdminOrUp(pet)) return;
    const g = (pet.foodGroups || []).find(x => x.id === gid); if (!g) return;
    const next = prompt('类别名称（清空并确定＝删除类别，里面的食物回到「不分类」）：', g.name || '');
    if (next === null) return;
    const name = next.trim().slice(0, 12);
    if (!name) {
      (pet.foodLibrary || []).forEach(f => { if (f.groupId === gid) f.groupId = null; });   // 成员升回顶层
      pet.foodGroups = (pet.foodGroups || []).filter(x => x.id !== gid);
    } else {
      g.name = name;
    }
    persist(); schedulePushMeta(pet);
    renderFoodSelector();
  }
  // 「加现有食物到某类别」——在某类别下点「＋」时打开，省得挨个编辑食物去归类
  const $catAddModal = document.getElementById('cat-add-modal');
  const $catAddTitle = document.getElementById('cat-add-title');
  const $catAddNew = document.getElementById('cat-add-new');
  const $catAddList = document.getElementById('cat-add-list');
  const $catAddClose = document.getElementById('cat-add-close');
  let catAddGid = null;
  let pendingCatForNewFood = null;   // 从某类别里「新建食物」时，让新食物默认归入该类别
  function openCatAddModal(gid) {
    const pet = currentPet(); if (!pet || !isAdminOrUp(pet)) return;
    const g = (pet.foodGroups || []).find(x => x.id === gid); if (!g) return;
    catAddGid = gid;
    if ($catAddTitle) $catAddTitle.textContent = `加食物到「${g.name || '类别'}」`;
    renderCatAddList();
    if ($catAddModal) $catAddModal.classList.add('open');
  }
  function renderCatAddList() {
    const pet = currentPet(); if (!pet || !$catAddList) return;
    const others = (pet.foodLibrary || []).filter(f => f.groupId !== catAddGid);
    if (others.length === 0) {
      $catAddList.innerHTML = '<div class="cat-add-empty">现有食物都已在这个类别里了——可以「新建一个食物」。</div>';
      return;
    }
    $catAddList.innerHTML = others.map(f => `<button type="button" class="cat-add-row" data-fid="${escapeHtml(f.id)}"><span class="ca-emoji">${foodIconHTML(f, '🍖')}</span><span class="ca-name">${escapeHtml(f.name)}</span><span class="ca-plus">＋ 加入</span></button>`).join('');
    $catAddList.querySelectorAll('.cat-add-row').forEach(b => b.addEventListener('click', () => {
      const f = (pet.foodLibrary || []).find(x => x.id === b.dataset.fid);
      if (f) { f.groupId = catAddGid; persist(); schedulePushMeta(pet); renderCatAddList(); renderFoodSelector(); }
    }));
  }
  if ($catAddNew) $catAddNew.addEventListener('click', () => {
    pendingCatForNewFood = catAddGid;
    if ($catAddModal) $catAddModal.classList.remove('open');
    openFoodModal(null);
  });
  if ($catAddClose) $catAddClose.addEventListener('click', () => { if ($catAddModal) $catAddModal.classList.remove('open'); });
  if ($catAddModal) $catAddModal.addEventListener('click', e => { if (e.target === $catAddModal) $catAddModal.classList.remove('open'); });

  // ===== 长按拖拽给食物排序（干粮固定顶、新建固定底；仅管理员；松手即生效）=====
  let fdDidReorder = false;          // 刚拖完抑制随之而来的 click
  let fd = null;                     // 当前拖拽状态
  function fdEligible() {            // 可排序的库内食物 chip（按当前 DOM 顺序）
    return Array.from($foodSelector.querySelectorAll('.extra-chip.fc-draggable'));
  }
  function fdAxis() {
    const dir = getComputedStyle($foodSelector).flexDirection;
    return (dir === 'row' || dir === 'row-reverse') ? 'x' : 'y';
  }
  function fdDown(e) {
    if (e.button != null && e.button > 0) return;          // 只认主键 / 触摸
    const chip = e.target.closest('.extra-chip.fc-draggable');
    if (!chip || e.target.closest('.edit-food')) return;   // 非库内食物、或点在铅笔上 → 不拖
    const pet = currentPet();
    if (!pet || !isAdminOrUp(pet)) return;
    fd = { chip, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
           pointerId: e.pointerId, axis: fdAxis(), active: false, translate: 0, timer: null };
    fd.timer = setTimeout(fdBegin, 260);                   // 长按 260ms 才进入拖动
    window.addEventListener('pointermove', fdMove, { passive: false });
    window.addEventListener('pointerup', fdUp);
    window.addEventListener('pointercancel', fdUp);
  }
  function fdBegin() {
    if (!fd) return;
    fd.timer = null; fd.active = true; fd.translate = 0;
    fd.chip.classList.add('fc-dragging');
    $foodSelector.classList.add('fc-reordering');
    $foodSelector.style.touchAction = 'none';   // 触摸期间不让原生滚动抢手势
    try { fd.chip.setPointerCapture(fd.pointerId); } catch (_) {}
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
    fdPosition(fd.lastX, fd.lastY);
    fd.raf = requestAnimationFrame(fdTick);
  }
  function fdMove(e) {
    if (!fd) return;
    fd.lastX = e.clientX; fd.lastY = e.clientY;
    if (!fd.active) {                                       // 长按未触发前：移动超阈值视为滚动/轻点，放弃拖动
      if (Math.hypot(e.clientX - fd.startX, e.clientY - fd.startY) > 10) { clearTimeout(fd.timer); fdCleanup(false); }
      return;
    }
    e.preventDefault();
    fdReorder(e.clientX, e.clientY);
    fdPosition(e.clientX, e.clientY);
  }
  function fdReorder(cx, cy) {
    const axisY = fd.axis === 'y';
    const main = axisY ? cy : cx;
    let ref = null;
    for (const s of fdEligible()) {
      if (s === fd.chip) continue;
      const r = s.getBoundingClientRect();
      const mid = axisY ? r.top + r.height / 2 : r.left + r.width / 2;
      if (main < mid) { ref = s; break; }
    }
    const target = ref || $foodSelector.querySelector('.add-chip');
    // 已经在该位置就别动（用 nextElementSibling 跳过模板里的空白文本节点，避免每帧空重排导致抖动）
    if (target) { if (fd.chip.nextElementSibling === target) return; }
    else if ($foodSelector.lastElementChild === fd.chip) return;
    // FLIP：让位的食物从「原位」滑到「新位」。用 offsetTop/Left 记录（与 transform、滚动都无关）。
    const movers = fdEligible().filter(c => c !== fd.chip);
    const first = movers.map(c => axisY ? c.offsetTop : c.offsetLeft);
    if (target) $foodSelector.insertBefore(fd.chip, target);
    else $foodSelector.appendChild(fd.chip);
    movers.forEach((c, i) => {
      const d = first[i] - (axisY ? c.offsetTop : c.offsetLeft);
      if (!d) return;
      c.style.transition = 'none';
      c.style.transform = axisY ? `translateY(${d}px)` : `translateX(${d}px)`;
      requestAnimationFrame(() => { c.style.transition = 'transform 0.16s cubic-bezier(0.2,0.7,0.3,1)'; c.style.transform = ''; });
    });
  }
  // 边缘自动滚动：指针进入容器上下/左右 30px 边缘带就滚动，速度随深入加快但封顶（恒定限速，不累加）。
  function fdTick() {
    if (!fd || !fd.active) { if (fd) fd.raf = null; return; }
    const r = $foodSelector.getBoundingClientRect();
    const EDGE = 30, MAX = 9, axisY = fd.axis === 'y';
    const p = axisY ? fd.lastY : fd.lastX;
    const lo = (axisY ? r.top : r.left) + EDGE, hi = (axisY ? r.bottom : r.right) - EDGE;
    let dv = 0;
    if (p < lo) dv = -Math.min(MAX, (lo - p) / EDGE * MAX);
    else if (p > hi) dv = Math.min(MAX, (p - hi) / EDGE * MAX);
    if (dv) {
      const key = axisY ? 'scrollTop' : 'scrollLeft';
      const before = $foodSelector[key];
      $foodSelector[key] = before + dv;
      if ($foodSelector[key] !== before) { fdReorder(fd.lastX, fd.lastY); fdPosition(fd.lastX, fd.lastY); }
    }
    fd.raf = requestAnimationFrame(fdTick);
  }
  function fdPosition(cx, cy) {                             // 跟手 + 夹住在容器可视范围内
    const chip = fd.chip, rect = chip.getBoundingClientRect();
    const cont = $foodSelector.getBoundingClientRect();
    const axisY = fd.axis === 'y';
    const pointer = axisY ? cy : cx;
    const center = axisY ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    const natural = center - fd.translate;                 // 当前自然中心（剔除已应用位移；重排后自动校正）
    const half = (axisY ? rect.height : rect.width) / 2;
    const lo = (axisY ? cont.top : cont.left) + half;
    const hi = (axisY ? cont.bottom : cont.right) - half;
    // 夹住被拖项中心，不让它（连同 transform）越出容器——否则会撑大滚动溢出、触发浏览器反馈式自动滚动而失控
    const t = Math.max(lo, Math.min(hi, pointer)) - natural;
    fd.translate = t;
    chip.style.transform = axisY ? `translateY(${t}px)` : `translateX(${t}px)`;
  }
  function fdUp() {
    if (!fd) return;
    if (fd.timer) clearTimeout(fd.timer);
    const wasActive = fd.active;
    if (wasActive) {
      fdCommit();
      fdDidReorder = true;
      setTimeout(() => { fdDidReorder = false; }, 0);       // 抑制紧随的 click，下一拍恢复
    }
    fdCleanup(wasActive);
  }
  function fdCleanup(rerender) {
    window.removeEventListener('pointermove', fdMove);
    window.removeEventListener('pointerup', fdUp);
    window.removeEventListener('pointercancel', fdUp);
    if (fd) {
      if (fd.raf) cancelAnimationFrame(fd.raf);
      if (fd.active) {
        fd.chip.classList.remove('fc-dragging');
        fd.chip.style.transform = '';
        try { fd.chip.releasePointerCapture(fd.pointerId); } catch (_) {}
      }
      $foodSelector.classList.remove('fc-reordering');
      $foodSelector.style.touchAction = '';
    }
    fd = null;
    if (rerender) renderFoodSelector();
  }
  function fdCommit() {
    const pet = currentPet();
    if (!pet || !Array.isArray(pet.foodLibrary)) return;
    // 按 DOM 顺序重建 foodLibrary。折叠组的成员不在 DOM 里，用「组头位置」作锚把它们按原相对
    // 顺序注入回去——否则收起某组后再拖别的，会把这些看不见的成员甩到末尾、把组挪位。展开的组
    // 成员本身就是扁平的 .fc-child chip，按各自 DOM 顺序落位（组内拖拽排序照样生效）。
    const byId = new Map(pet.foodLibrary.map(f => [f.id, f]));
    const childrenOf = new Map();
    pet.foodLibrary.forEach(f => {
      if (f.groupId) { if (!childrenOf.has(f.groupId)) childrenOf.set(f.groupId, []); childrenOf.get(f.groupId).push(f); }
    });
    const domFoodSet = new Set(Array.from($foodSelector.children)
      .map(el => el.dataset && el.dataset.food).filter(Boolean));
    const newLib = [], placed = new Set();
    const place = f => { if (f && !placed.has(f.id)) { newLib.push(f); placed.add(f.id); } };
    Array.from($foodSelector.children).forEach(el => {
      const fid = el.dataset && el.dataset.food;
      const gid = el.dataset && el.dataset.group;
      if (fid && fid !== 'kibble' && fid !== '__new') place(byId.get(fid));
      else if (gid) {
        const kids = childrenOf.get(gid) || [];
        if (!kids.some(k => domFoodSet.has(k.id))) kids.forEach(place);   // 折叠组：整组注入
      }
    });
    pet.foodLibrary.forEach(place);   // 兜底：任何没被 DOM 覆盖的食物按原序补到末尾，绝不丢
    pet.foodLibrary = newLib;
    persist();
    schedulePushMeta(pet);
  }
  $foodSelector.addEventListener('pointerdown', fdDown);
  // 手机端：点触发条展开/收起食物列表
  if ($foodPickerTrigger) $foodPickerTrigger.addEventListener('click', () => {
    if ($entryCols) $entryCols.classList.toggle('fs-open');
  });
  // 悬浮列表打开时，点它和触发条以外的地方 → 收起（列表已盖住填写区，只有真正点外面才收）
  document.addEventListener('click', (e) => {
    if (!$entryCols || !$entryCols.classList.contains('fs-open')) return;
    if ($entryCols.contains(e.target)) return;
    $entryCols.classList.remove('fs-open');
  });

  function selectRecordFood(id) {
    recordFood = id;
    if ($entryCols) $entryCols.classList.remove('fs-open');   // 选好后把手机端列表自动收回去
    const pet = currentPet();
    recordMethod = (pet && getMethodPref(pet, id)) || defaultMethodFor(id);
    pendingEntryTsEnd = null;
    $resetCheck.checked = false;
    $reading.value = '';
    renderFoodSelector();
    applyRecordFoodUI();
    updateExtraEq();
  }
  // 按 选中的食物 × 当前填法 调整输入框 / 切换块 / 时间段控件
  function applyRecordFoodUI() {
    const food = currentFoodItem();
    const isKibble = !food;
    const method = recordMethod;
    const pet = currentPet();
    // 填法切换条
    $methodToggle.style.display = '';
    $mtDirectLbl.textContent = '直接填吃了多少';
    $mtDiffLbl.textContent = isKibble ? '称重作差' : '作差·记还剩';
    $methodToggle.querySelectorAll('label').forEach(l => l.classList.toggle('active', l.dataset.m === method));
    const mr = $methodToggle.querySelector(`input[value="${method}"]`); if (mr) mr.checked = true;

    if (isKibble) {
      $unitPick.style.display = '';
      $unitSuffix.style.display = 'none';
      $extraEqRow.style.display = 'none';
      if (method === 'diff') {
        $modeBowlRow.style.display = '';
        $reading.placeholder = (pet && pet.preferredUnit && pet.preferredUnit !== 'g') ? `碗里现在（${pet.preferredUnit}）` : '碗里现在的重量';
        checkFormWarn();
      } else {
        $modeBowlRow.style.display = 'none';
        $reading.placeholder = '吃了多少';
      }
    } else {
      $unitPick.style.display = 'none';
      $modeBowlRow.style.display = 'none';
      $extraEqRow.style.display = '';
      $unitSuffix.style.display = '';
      $unitSuffix.textContent = unitOf(food);
      if (method === 'diff') {
        $reading.placeholder = food.measure === 'gram' ? '现在还剩多少' : ('现在还剩几' + (food.unitLabel || '份'));
      } else {
        $reading.placeholder = food.measure === 'gram' ? '吃了多少' : ('吃了几' + (food.unitLabel || '份'));
      }
    }
    applyTimeEndUI(method === 'direct');   // 时间段只在「直接填」模式可用
    // 「倒掉换新」只在 作差/称重 模式出现（直接填没有这个概念）
    const showReset = (method === 'diff');
    $resetRow.style.display = showReset ? '' : 'none';
    if (!showReset) $resetCheck.checked = false;
  }
  function updateExtraEq() {
    const pet = currentPet(); const food = currentFoodItem();
    if (!pet || !food) { $extraEq.textContent = '≈ — 等效干粮'; return; }
    const val = parseFloat($reading.value);
    if (recordMethod === 'diff') {
      const prev = lastRemainReading(pet, food.id);
      const u = unitOf(food);
      if (prev == null) {
        $extraEq.textContent = Number.isFinite(val) ? `记下起点：还剩 ${fmtAmt(val)} ${u}（下次再记就能算出吃了多少）` : '第一次记「现在还剩多少」当起点';
        return;
      }
      if (!Number.isFinite(val)) { $extraEq.textContent = `上次还剩 ${fmtAmt(prev)} ${u}`; return; }
      const eaten = prev - val;
      if (eaten > 0) { const eq = kibbleEqOf(pet, eaten, food.kcalPerUnit); $extraEq.textContent = `比上次少 ${fmtAmt(eaten)} ${u} → 吃了 ≈ ${fmtEq(pet, eq)} 等效${convName(pet)}`; }
      else if (eaten < 0) { $extraEq.textContent = `比上次多 → 算「又开了一份」，不计为吃`; }
      else { $extraEq.textContent = `和上次一样，没吃`; }
    } else {
      const eq = kibbleEqOf(pet, val, food.kcalPerUnit);
      $extraEq.textContent = (eq > 0) ? `≈ ${fmtEq(pet, eq)} 等效${convName(pet)}` : `≈ — 等效${convName(pet)}`;
    }
  }

  function saveEntry(reading, withBowl) {
    const pet = currentPet();
    if (!pet) return;
    const newEntry = {
      id: uuid('e'),
      ts: pickedEntryTs(),
      addedAt: Date.now(),   // when this record was created (ts may be backdated)
      kind: 'weigh',
      reading,
      withBowl,
      bowlWeight: withBowl ? pet.bowlWeight : null,  // snapshot at record time
      reset: !!$resetCheck.checked,   // 倒掉换新 → 作为新起点
      note: '',
      author: DEVICE_ID,
    };
    pet.preferredUnit = $unitPick.value || 'g';
    if (!commitNewEntry(pet, newEntry)) return;
    $reading.value = '';
    $resetCheck.checked = false;
    resetEntryTime();
    render();
    $reading.focus();
    pushAddEntry(pet, newEntry);
    schedulePushMeta(pet);
  }

  // ===== Extras (treats / cans) =====
  function kibbleEqOf(pet, count, kcalPerUnit) {
    const dens = (Number.isFinite(pet.kibbleKcalPerG) && pet.kibbleKcalPerG > 0) ? pet.kibbleKcalPerG : 3.8;
    return (Number(count) || 0) * (Number(kcalPerUnit) || 0) / dens;
  }
  // ===== 换算基准：内部一切量始终以「等效干粮克数」为 canonical 单位；这里只做显示层折算。
  //       基准=干粮时 M=1、单位 g，所有显示与原先逐字节相同；选了别的食物才变化。
  function kibbleKcalPerGOf(pet) {
    return (pet && Number.isFinite(pet.kibbleKcalPerG) && pet.kibbleKcalPerG > 0) ? pet.kibbleKcalPerG : 3.8;
  }
  function convBaseFood(pet) {
    const id = pet && pet.conversionBase;
    if (id && id !== 'kibble') {
      const f = ((pet && pet.foodLibrary) || []).find(x => x.id === id);
      if (f && Number.isFinite(f.kcalPerUnit) && f.kcalPerUnit > 0) {
        return { kcalPerUnit: f.kcalPerUnit, measure: f.measure || 'count', unitLabel: f.unitLabel || '份', name: f.name || '该食物' };
      }
    }
    const kbName = (pet && pet.kibble && pet.kibble.name) ? pet.kibble.name : '干粮';
    return { kcalPerUnit: kibbleKcalPerGOf(pet), measure: 'gram', unitLabel: 'g', name: kbName };
  }
  function convM(pet) { return kibbleKcalPerGOf(pet) / convBaseFood(pet).kcalPerUnit; }   // 干粮基准 → 1
  function convUnit(pet) { const b = convBaseFood(pet); return b.measure === 'gram' ? 'g' : b.unitLabel; }
  function convName(pet) { return convBaseFood(pet).name; }
  function fmtEq(pet, grams) { return fmtG(grams * convM(pet)) + ' ' + convUnit(pet); }    // 等效干粮克数 → 「X 基准单位」
  // 宠物弹窗里「换算基准」下拉的选项：干粮（默认）+ 食物库全部
  function renderConvBaseOptions(p) {
    const kbName = (p && p.kibble && p.kibble.name) ? p.kibble.name : '干粮';
    const kbEmoji = (p && p.kibble && p.kibble.emoji) ? p.kibble.emoji : '🥣';
    let html = `<option value="kibble">${escapeHtml(kbEmoji)} ${escapeHtml(kbName)}（默认）</option>`;
    ((p && p.foodLibrary) || []).forEach(f => {
      html += `<option value="${escapeHtml(f.id)}">${escapeHtml(f.emoji || '🍖')} ${escapeHtml(f.name)}</option>`;
    });
    $pmConvBase.innerHTML = html;
    const want = (p && p.conversionBase) || 'kibble';
    $pmConvBase.value = want;
    if (!$pmConvBase.value) $pmConvBase.value = 'kibble';   // 所选基准已被删除 → 回落干粮
  }
  // Save an extra (treat/can) entry from the currently-selected food in the unified input.
  function saveSelectedExtra() {
    const pet = currentPet(); const food = currentFoodItem();
    if (!pet || !food) return;
    const count = parseFloat($reading.value);
    if (!Number.isFinite(count) || count <= 0) {
      alert(food.measure === 'gram' ? '吃了多少克填一下' : ('吃了几' + (food.unitLabel || '份') + '填一下'));
      return;
    }
    const eq = kibbleEqOf(pet, count, food.kcalPerUnit);
    const endTs = (pendingEntryTsEnd && pendingEntryTsEnd > pickedEntryTs()) ? pendingEntryTsEnd : undefined;
    const newEntry = {
      id: uuid('e'),
      ts: pickedEntryTs(),
      tsEnd: endTs,            // 可选结束时间 → 时间段
      addedAt: Date.now(),
      kind: 'extra',
      reading: null,           // keep null so legacy clients mark it 无法换算, not pollute deltas
      foodId: food.id,
      foodName: food.name,
      emoji: food.emoji || '🍖',
      measure: food.measure || 'count',
      unitLabel: food.measure === 'gram' ? 'g' : (food.unitLabel || '份'),
      count,
      kcalPerUnit: food.kcalPerUnit,
      kibbleEqG: eq,           // snapshot the conversion at record time
      note: '',
      author: DEVICE_ID,
    };
    if (!commitNewEntry(pet, newEntry)) return;
    $reading.value = '';
    resetEntryTime();
    updateExtraEq();
    render();
    pushAddEntry(pet, newEntry);
  }
  // 干粮「直接填吃了多少」—— 记成一笔 extra（等效干粮=克数，1:1）
  function saveKibbleDirect() {
    const pet = currentPet();
    if (!pet) return;
    const raw = parseFloat($reading.value);
    const unit = $unitPick.value || 'g';
    const grams = toGrams(raw, unit);
    if (!Number.isFinite(grams) || grams <= 0) { alert('吃了多少克填一下'); return; }
    const kb = pet.kibble || {};
    const endTs = (pendingEntryTsEnd && pendingEntryTsEnd > pickedEntryTs()) ? pendingEntryTsEnd : undefined;
    const newEntry = {
      id: uuid('e'), ts: pickedEntryTs(), tsEnd: endTs, addedAt: Date.now(),
      kind: 'extra', reading: null,
      foodId: 'kibble', foodName: kb.name || '干粮', emoji: kb.emoji || '🥣',
      measure: 'gram', unitLabel: 'g', count: grams,
      kcalPerUnit: kibbleKcalPerGOf(pet), kibbleEqG: grams,
      note: '', author: DEVICE_ID,
    };
    pet.preferredUnit = unit;
    if (!commitNewEntry(pet, newEntry)) return;
    $reading.value = '';
    resetEntryTime();
    updateExtraEq();
    render();
    pushAddEntry(pet, newEntry);
  }
  // 食物「作差·记现在还剩」—— 记成一笔 remain，吃了多少靠相邻两次差值算
  function saveFoodRemain() {
    const pet = currentPet(); const food = currentFoodItem();
    if (!pet || !food) return;
    const val = parseFloat($reading.value);
    if (!Number.isFinite(val) || val < 0) { alert('填一下现在还剩多少'); return; }
    const newEntry = {
      id: uuid('e'), ts: pickedEntryTs(), addedAt: Date.now(),
      kind: 'remain', reading: val,
      reset: !!$resetCheck.checked,   // 倒掉换新 → 作为新起点
      foodId: food.id, foodName: food.name, emoji: food.emoji || '🍖',
      measure: food.measure || 'count',
      unitLabel: food.measure === 'gram' ? 'g' : (food.unitLabel || '份'),
      kcalPerUnit: food.kcalPerUnit,
      note: '', author: DEVICE_ID,
    };
    if (!commitNewEntry(pet, newEntry)) return;   // push+persist atomically; rollback+warn on quota (no local/server split)
    $reading.value = '';
    $resetCheck.checked = false;
    resetEntryTime();
    updateExtraEq();
    render();
    pushAddEntry(pet, newEntry);
  }

  // ===== Body-weight tracking =====
  // Stored as entries with kind:'bodyweight' {ts, kg, author} — reuses the whole
  // sync / time-edit / delete pipeline. Food calculations exclude this kind.
  function weightEntries(pet) {
    return (pet && pet.entries || []).filter(e => e.kind === 'bodyweight' && Number.isFinite(Number(e.kg)));
  }
  // Keep pet.bodyWeight (used by the food estimator) in step with the latest log.
  function reconcileBodyWeight(pet) {
    const ws = weightEntries(pet).sort((a, b) => a.ts - b.ts);
    if (ws.length) {
      const latest = Number(ws[ws.length - 1].kg);
      if (Number.isFinite(latest) && latest > 0) pet.bodyWeight = latest;
    }
  }
  // Shared commit path for both weight-entry methods (直接称 / 作差).
  // extra = optional fields to stash on the entry blob (e.g. diff readings).
  function commitWeight(kg, unit, extra) {
    const pet = currentPet();
    if (!pet) { alert('先添加一只宠物'); return; }
    if (!Number.isFinite(kg) || kg <= 0 || kg > 200) { alert('体重看起来不太对（应在 0–200 之间），检查一下数字和单位？'); return; }
    const prevWeight = Number.isFinite(pet.bodyWeight) && pet.bodyWeight > 0 ? pet.bodyWeight : null;
    const newEntry = Object.assign(
      { id: uuid('e'), ts: pickedEntryTs(), addedAt: Date.now(), kind: 'bodyweight', reading: null, kg, author: DEVICE_ID, note: '' },
      extra || {}
    );
    if (!commitNewEntry(pet, newEntry)) return;
    weightPage = 0;                  // 新记一笔 → 历史跳回第一页
    pet.bodyWeightUnit = unit;       // remember the unit the user weighs in
    reconcileBodyWeight(pet);
    // Weight → recommended food → target food linkage.
    maybeFollowRecommendation(pet, prevWeight);
    persist();
    resetEntryTime();
    render();
    pushAddEntry(pet, newEntry);
    schedulePushMeta(pet);           // best-effort sync of bodyWeight/unit + target (admin+)
  }
  function saveWeight() {
    const raw = parseFloat($weightInput.value);
    if (!Number.isFinite(raw) || raw <= 0) { alert('填一下体重'); return; }
    const unit = $weightUnit.value || 'kg';
    commitWeight(bwToKg(raw, unit), unit, null);
    $weightInput.value = '';
  }
  // Reading the 作差 inputs into { a, b, kg, unit } (kg = |a-b| converted). Returns null if incomplete.
  function readWeightDiff() {
    const a = parseFloat($weightDiffA.value);
    const b = parseFloat($weightDiffB.value);
    const unit = $weightDiffUnit.value || 'kg';
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null;
    return { a, b, unit, kg: bwToKg(Math.abs(a - b), unit) };
  }
  function refreshDiffResult() {
    const unit = $weightDiffUnit.value || 'kg';
    $weightDiffUnitEcho.textContent = unit;
    const d = readWeightDiff();
    if (!d) {
      const nm = (currentPet() && currentPet().name) || '宝贝';
      $weightDiffResult.className = 'diff-result empty';
      $weightDiffResult.textContent = '两次读数都填上，自动算出' + nm + '体重';
      return;
    }
    const disp = parseFloat(bwFromKg(d.kg, unit).toFixed(2));
    $weightDiffResult.className = 'diff-result';
    $weightDiffResult.innerHTML = `宝贝体重 ≈ <strong>${disp} ${unit}</strong>`;
  }
  function saveWeightDiff() {
    const d = readWeightDiff();
    if (!d) { alert('两次读数都要填'); return; }
    if (!Number.isFinite(d.kg) || d.kg <= 0) { alert('两次读数差出来不像体重，检查一下是不是把两次读数或单位弄反了？'); return; }
    commitWeight(d.kg, d.unit, { method: 'diff', diffA: d.a, diffB: d.b, diffUnit: d.unit });
    $weightDiffA.value = '';
    $weightDiffB.value = '';
    refreshDiffResult();
  }

  // ===== 体重 → 推荐食量 → 目标食量 联动 =====
  // If the pet's target food is set to follow the recommendation, recompute it
  // when body weight changes and surface a dismissible/undoable toast.
  function maybeFollowRecommendation(pet, prevWeight) {
    if (!pet || pet.targetFollowsRecommendation !== true) return;
    if (!pet.species || !(pet.ageYears > 0) || !(pet.bodyWeight > 0)) return;
    const r = estimatorCompute({
      species: pet.species, breed: pet.breed || '', age: pet.ageYears,
      bodyWeightKg: pet.bodyWeight, activity: pet.activity || 'normal', neutered: !!pet.neutered,
    });
    if (!r) return;
    const newMin = parseFloat(r.min.toFixed(1));
    const newMax = parseFloat(r.max.toFixed(1));
    const oldMin = pet.dailyTargetMin, oldMax = pet.dailyTargetMax;
    // No meaningful change → nothing to announce.
    if (Math.abs((oldMin || 0) - newMin) < 0.05 && Math.abs((oldMax || 0) - newMax) < 0.05) return;
    setTarget(pet, newMin, newMax);
    const unit = pet.bodyWeightUnit || 'kg';
    const wOld = prevWeight ? `${parseFloat(bwFromKg(prevWeight, unit).toFixed(2))}` : '—';
    const wNew = parseFloat(bwFromKg(pet.bodyWeight, unit).toFixed(2));
    const M = convM(pet), U = convUnit(pet);
    const oldStr = (oldMin || oldMax) ? `${fmtG((oldMin || oldMax) * M)}–${fmtG((oldMax || oldMin) * M)}` : '未设';
    showLinkToast(
      `体重 ${wOld}→${wNew} ${unit}，目标食量已从 <strong>${oldStr}</strong> 调到 <strong>${fmtG(newMin * M)}–${fmtG(newMax * M)} ${U}</strong>`,
      () => { setTarget(pet, oldMin, oldMax); persist(); render(); schedulePushMeta(pet); }
    );
  }
  let linkToastTimer = null;
  function showLinkToast(msgHtml, onUndo) {
    if (!$linkToastMount) return;
    clearTimeout(linkToastTimer);
    $linkToastMount.innerHTML =
      `<div class="link-toast"><span class="lt-msg">${msgHtml}</span>` +
      `<button type="button" class="lt-undo">撤销</button>` +
      `<button type="button" class="lt-close" aria-label="关闭">×</button></div>`;
    const close = () => { clearTimeout(linkToastTimer); $linkToastMount.innerHTML = ''; };
    $linkToastMount.querySelector('.lt-undo').addEventListener('click', () => { if (onUndo) onUndo(); close(); });
    $linkToastMount.querySelector('.lt-close').addEventListener('click', close);
    linkToastTimer = setTimeout(close, 12000);
  }

  // Visible window [start, end] in ms for the weight trend, per state.weightPeriod.
  function weightWindow() {
    const now = Date.now();
    const p = state.weightPeriod || '30';
    if (p === 'all') return { start: -Infinity, end: now + DAY_MS };
    if (p === 'custom') {
      let s = state.weightCustomStart, e = state.weightCustomEnd;
      if (!s || !e) return null;
      if (s > e) { [s, e] = [e, s]; }
      return { start: parseIsoDate(s).getTime(), end: parseIsoDate(e).getTime() + DAY_MS };
    }
    const n = parseInt(p, 10) || 30;
    return { start: now - n * DAY_MS, end: now + DAY_MS };
  }
  const WEIGHT_PERIOD_LBL = { '30': '近 30 日', '90': '近 3 月', '180': '近半年', '365': '近 1 年', all: '全部', custom: '自定义' };

  function renderWeight(pet) {
    reconcileBodyWeight(pet);   // keep estimator's bodyWeight in step with the log
    updateWeightTimeDisplay();  // sync time pill with pendingEntryTs
    const unit = pet.bodyWeightUnit || 'kg';
    $weightUnit.value = unit;
    $weightDiffUnit.value = unit;   // 作差也跟随宠物偏好单位（默认别老是 kg）
    // 占位文案用当前宠物的名字（「称一下橘座」「抱着橘座的读数」）
    const nm = pet.name || '宝贝';
    $weightInput.placeholder = '称一下' + nm;
    $weightDiffA.placeholder = '抱着' + nm + '的读数';
    // Sync the entry-method toggle to remembered state.
    setWeightMethod(state.weightMethod || 'direct');
    refreshDiffResult();
    // Sync trend range tabs + custom inputs.
    $weightTrendTabs.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.p === state.weightPeriod);
    });
    $weightTrendCustom.style.display = state.weightPeriod === 'custom' ? '' : 'none';
    if (state.weightCustomStart) $weightCustomStart.value = state.weightCustomStart;
    if (state.weightCustomEnd) $weightCustomEnd.value = state.weightCustomEnd;
    const ws = weightEntries(pet).sort((a, b) => a.ts - b.ts);
    // Featured current-weight card: current weight + change vs ~30 days ago.
    if (ws.length === 0) {
      $weightHero.style.display = 'none';
      if ($weightHeroRule) $weightHeroRule.style.display = 'none';
    } else {
      const curKg = Number(ws[ws.length - 1].kg);
      const curTs = ws[ws.length - 1].ts;
      // earliest entry within the last 30 days (else the very first) for a delta
      const since = curTs - 30 * DAY_MS;
      const ref = ws.find(w => w.ts >= since);
      const dKg = ref ? (curKg - Number(ref.kg)) : 0;
      const curStr = parseFloat(bwFromKg(curKg, unit).toFixed(2));
      let subHtml = '当前体重';
      if (ref && ws.length >= 2 && Math.abs(dKg) >= 0.005) {
        const dStr = parseFloat(Math.abs(bwFromKg(dKg, unit)).toFixed(2));
        const arrow = dKg > 0 ? '↑' : '↓';
        subHtml += ` · 近 30 天 <span class="wh-delta">${arrow}${dStr} ${unit}</span>`;
      }
      $whNum.textContent = curStr;
      $whUnit.textContent = unit;
      $whSub.innerHTML = subHtml;
      $weightHero.style.display = '';
      if ($weightHeroRule) $weightHeroRule.style.display = '';
    }
    // Windowed entries drive the chart.
    const win = weightWindow();
    const wsWin = win ? ws.filter(w => w.ts >= win.start && w.ts < win.end) : ws;
    $weightRangeLbl.textContent = win === null
      ? ''
      : `${WEIGHT_PERIOD_LBL[state.weightPeriod] || ''} · ${wsWin.length} 条`;
    drawWeightTrend(pet, wsWin, unit, win === null);
    // 历史记录：全部（最新在前）分页看，每页 WEIGHT_PAGE_SIZE 条
    if (pet.id !== lastWeightPetId) { weightPage = 0; lastWeightPetId = pet.id; }
    const allDesc = [...ws].reverse();
    const totalPages = Math.max(1, Math.ceil(allDesc.length / WEIGHT_PAGE_SIZE));
    if (weightPage > totalPages - 1) weightPage = totalPages - 1;
    if (weightPage < 0) weightPage = 0;
    if (allDesc.length === 0) {
      $weightList.innerHTML = '';
    } else {
      const slice = allDesc.slice(weightPage * WEIGHT_PAGE_SIZE, weightPage * WEIGHT_PAGE_SIZE + WEIGHT_PAGE_SIZE);
      $weightList.innerHTML = slice.map(e => {
        const kgStr = parseFloat(bwFromKg(Number(e.kg), unit).toFixed(2));
        const tag = e.method === 'diff' ? ' <span class="er-raw">(作差)</span>' : '';
        return `<div class="entry-row">
          <span class="er-time">${isoDate(e.ts).slice(5)} ${fmtTime(e.ts)}</span>
          <span class="er-main"><span class="er-delta extra">⚖️ ${kgStr} ${unit}</span>${tag}</span>
          ${entryRowActions(e, pet)}
        </div>`;
      }).join('');
      wireEntryButtons($weightList, pet);
    }
    renderWeightPager(totalPages);
  }
  function renderWeightPager(totalPages) {
    if (!$weightPage) return;
    if (totalPages <= 1) { $weightPage.style.display = 'none'; return; }
    $weightPage.style.display = '';
    let opts = '';
    for (let i = 0; i < totalPages; i++) opts += `<option value="${i}"${i === weightPage ? ' selected' : ''}>${i + 1}</option>`;
    $weightPageSelect.innerHTML = opts;
    $weightPageTotal.textContent = `/ ${totalPages}`;
    $weightPagePrev.disabled = weightPage === 0;
    $weightPageNext.disabled = weightPage >= totalPages - 1;
  }
  function gotoWeightPage(p) { weightPage = p; renderWeight(currentPet()); }

  // Line chart of weight over the visible window (its own drawing, food charts are grams).
  // needRange: true when the user picked 自定义 but hasn't filled both dates.
  function drawWeightTrend(pet, ws, unit, needRange) {
    if (needRange) {
      $weightChart.style.display = 'none';
      $weightEmpty.style.display = '';
      $weightEmpty.textContent = '选起止日期看自定义区间';
      return;
    }
    if (!ws || ws.length < 2) {
      $weightChart.style.display = 'none';
      $weightEmpty.style.display = '';
      $weightEmpty.textContent = ws && ws.length === 1
        ? '这个时间段只有一条记录——再称一次就能看到曲线' : '这个时间段还没有体重记录';
      return;
    }
    $weightEmpty.style.display = 'none';
    $weightChart.style.display = '';
    const W = 600, H = 200, padL = 44, padR = 16, padT = 16, padB = 26;
    const t0 = ws[0].ts, t1 = ws[ws.length - 1].ts;
    const span = Math.max(1, t1 - t0);
    const vals = ws.map(w => Number(w.kg));
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 0.2) { const m = (hi + lo) / 2; lo = m - 0.2; hi = m + 0.2; } // pad flat lines
    const range = hi - lo;
    lo -= range * 0.15; hi += range * 0.15;
    const x = t => padL + (t - t0) / span * (W - padL - padR);
    const y = kg => padT + (1 - (kg - lo) / (hi - lo)) * (H - padT - padB);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#1e3a5f';
    const grid = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || '#ddd';
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--color-muted').trim() || '#888';
    // y gridlines (lo / mid / hi in display unit)
    let svg = '';
    [hi, (hi + lo) / 2, lo].forEach(kv => {
      const yy = y(kv);
      svg += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="${grid}" stroke-width="1" stroke-dasharray="3 3"/>`;
      svg += `<text x="${padL - 6}" y="${(yy + 3).toFixed(1)}" text-anchor="end" font-size="12.5" fill="${muted}">${parseFloat(bwFromKg(kv, unit).toFixed(1))}</text>`;
    });
    // Weight range band: use pet's target if available, else auto-compute from data
    const target = pet.weightTargetMin && pet.weightTargetMax
      ? { min: pet.weightTargetMin, max: pet.weightTargetMax }
      : null;
    if (target) {
      const yTop = y(target.max), yBot = y(target.min);
      const bandH = yBot - yTop;
      if (bandH > 0) {
        const sage = getComputedStyle(document.documentElement).getPropertyValue('--pet-chart-target').trim() || '#4a7c59';
        svg += `<rect x="${padL}" y="${yTop}" width="${(W - padL - padR)}" height="${bandH}" fill="${sage}" opacity="0.08" rx="2"/>`;
        svg += `<text x="${(W - padR - 2)}" y="${(yTop + 11)}" text-anchor="end" font-size="12" fill="${sage}" opacity="0.7">目标 ${parseFloat(bwFromKg(target.min, unit).toFixed(1))}–${parseFloat(bwFromKg(target.max, unit).toFixed(1))}</text>`;
      }
    }
    // Line segments: dashes when gap > 70 days (don't fake continuous measurement)
    for (let i = 1; i < ws.length; i++) {
      const gap = (ws[i].ts - ws[i - 1].ts) / DAY_MS;
      const dash = gap > 70 ? ' stroke-dasharray="5 4"' : '';
      svg += `<line x1="${x(ws[i - 1].ts).toFixed(1)}" y1="${y(Number(ws[i - 1].kg)).toFixed(1)}" x2="${x(ws[i].ts).toFixed(1)}" y2="${y(Number(ws[i].kg)).toFixed(1)}" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"${dash}/>`;
    }
    // Dots: white fill + accent stroke for clarity
    ws.forEach(w => { svg += `<circle cx="${x(w.ts).toFixed(1)}" cy="${y(Number(w.kg)).toFixed(1)}" r="3.5" fill="#fff" stroke="${accent}" stroke-width="2"/>`; });
    // x labels: mark each data point with mm/dd (skip some if overlapping — show all when ≤6, every other when more)
    const labelStep = ws.length <= 6 ? 1 : 2;
    ws.forEach((w, i) => {
      if (i % labelStep !== 0 && i !== ws.length - 1) return;  // always show last
      const anchor = i === 0 ? 'start' : (i === ws.length - 1 ? 'end' : 'middle');
      svg += `<text x="${x(w.ts).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}" font-size="12.5" fill="${muted}">${shortMD(isoDate(w.ts))}</text>`;
    });
    // Invisible hit areas for hover/touch tooltip
    ws.forEach(w => {
      svg += `<rect x="${(x(w.ts) - 10).toFixed(1)}" y="${padT}" width="20" height="${(H - padT - padB)}" fill="transparent" data-wts="${w.ts}" data-wkg="${Number(w.kg).toFixed(2)}"/>`;
    });
    $weightChart.innerHTML = svg;
    // Hover/touch tooltip via title attribute (weight-chart is inside .weight-chart-wrap)
    const tipEl = document.getElementById('weight-chart-tip');
    if (tipEl) tipEl.remove();
    const wrap = $weightChart.parentElement;
    const tip = document.createElement('div');
    tip.id = 'weight-chart-tip';
    tip.style.cssText = 'display:none;position:absolute;background:var(--color-ink, #1a1a2e);color:#fff;font-size:0.75rem;padding:0.35rem 0.6rem;border-radius:7px;pointer-events:none;white-space:nowrap;z-index:5;transform:translate(-50%,-130%);';
    tip.textContent = '';
    wrap.style.position = 'relative';
    wrap.appendChild(tip);
    const tooltipShow = (ev, w) => {
      const rect = $weightChart.getBoundingClientRect();
      const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
      tip.style.display = ''; tip.style.left = (cx - rect.left) + 'px'; tip.style.top = (cy - rect.top) + 'px';
      tip.innerHTML = isoDate(w.ts).slice(5) + ' · <b>' + parseFloat(bwFromKg(Number(w.kg), unit).toFixed(2)) + ' ' + unit + '</b>';
    };
    const tooltipHide = () => { tip.style.display = 'none'; };
    $weightChart.querySelectorAll('rect[data-wts]').forEach(r => {
      const wts = parseInt(r.dataset.wts), wkg = parseFloat(r.dataset.wkg);
      r.addEventListener('mouseenter', (ev) => tooltipShow(ev, {ts: wts, kg: wkg}));
      r.addEventListener('mousemove', (ev) => tooltipShow(ev, {ts: wts, kg: wkg}));
      r.addEventListener('mouseleave', tooltipHide);
      r.addEventListener('touchstart', (ev) => { ev.preventDefault(); tooltipShow(ev, {ts: wts, kg: wkg}); });
      r.addEventListener('touchend', tooltipHide);
    });
  }

  function attemptSave() {
    const pet = currentPet();
    if (!pet) { alert('先添加一只宠物'); return; }
    // 按 (食物 × 填法) 分派：
    if (recordFood !== 'kibble') {
      if (recordMethod === 'diff') { saveFoodRemain(); return; }   // 食物·作差·记还剩
      saveSelectedExtra(); return;                                  // 食物·直接填(+时间段)
    }
    if (recordMethod === 'direct') { saveKibbleDirect(); return; }  // 干粮·直接填(+时间段)
    // 干粮·称重作差（现状）：
    const raw = parseFloat($reading.value);
    if (!Number.isFinite(raw) || raw < 0) { alert('请输入碗里现在的重量'); return; }
    const unit = $unitPick.value || 'g';
    const gramsReading = toGrams(raw, unit);
    const withBowl = currentMode();
    if (withBowl && pet.bowlWeight == null) {
      // No alert wall; just nudge user to fill bowl weight inline.
      $bowlRow.classList.add('shake', 'needs-bowl');
      setTimeout(() => $bowlRow.classList.remove('shake'), 400);
      $bowlWeight.focus();
      return;
    }
    // Guard: reading lower than bowl weight in 含碗 mode → likely forgot to switch
    if (withBowl && pet.bowlWeight > 0 && gramsReading < pet.bowlWeight) {
      $mmBody.innerHTML = `
        读数 <code>${fmtG(gramsReading)} g</code> 比空碗 <code>${fmtG(pet.bowlWeight)} g</code> 还轻。<br><br>
        是不是记成<b>不含碗</b>了？切换到「不含碗」再记一次？
      `;
      $mmModal.dataset.reading = String(gramsReading);
      $mmModal.dataset.withBowl = '1';
      $mmModal.classList.add('open');
      return;
    }
    // 倒掉换新：作为新起点，跳过「最近记录/含碗模式」的提醒（这一称重不和上次作差）
    if ($resetCheck.checked) { saveEntry(gramsReading, withBowl); return; }
    // 30-minute throttle: warn (don't block) if a weigh record exists within 30 min.
    // 例外：这次称重明显比上一条「重」时（碗里变重 = 加粮），不弹窗。常见流程是
    // 先称剩余、再加新粮、又称一次——第二条本就会记成「添了 X g」，不算误记。
    const sorted = [...pet.entries].filter(e => (e.kind || 'weigh') === 'weigh').sort((a, b) => b.ts - a.ts);
    if (sorted.length > 0) {
      const gap = Date.now() - sorted[0].ts;
      if (gap < 30 * 60 * 1000) {
        const newFood = withBowl ? (gramsReading - pet.bowlWeight) : gramsReading;
        const lastFood = foodWeight(sorted[0], pet);
        const isRefill = Number.isFinite(newFood) && Number.isFinite(lastFood) && (newFood - lastFood) > 0.5;
        if (!isRefill) {
          const mins = Math.max(1, Math.round(gap / 60000));
          if (!confirm(`距上一条记录 ${mins} 分钟，确定再记一次？`)) return;
        }
      }
    }
    const mismatch = detectModeMismatch(pet, gramsReading, withBowl);
    if (mismatch) {
      const chosenSign = mismatch.chosenDelta < 0 ? '吃了' : '添了';
      const swapSign = mismatch.swappedDelta < 0 ? '吃了' : '添了';
      $mmBody.innerHTML = `
        按 <strong>「${withBowl ? '含碗' : '不含碗'}」</strong>算 —— 这次相当于<strong>${chosenSign} <code>${fmtG(mismatch.chosenMag)} g</code></strong>，<br>
        但平时一次 <code>~${fmtG(mismatch.typical)} g</code> 左右。<br><br>
        若换成 <strong>「${withBowl ? '不含碗' : '含碗'}」</strong>则是 <strong>${swapSign} <code>${fmtG(mismatch.swapMag)} g</code></strong>，更接近平常。<br><br>
        是不是模式选错了？
      `;
      $mmModal.dataset.reading = String(gramsReading);
      $mmModal.dataset.withBowl = withBowl ? '1' : '0';
      $mmModal.classList.add('open');
    } else {
      saveEntry(gramsReading, withBowl);
    }
  }

  $saveEntry.addEventListener('click', attemptSave);
  $reading.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); attemptSave(); }
  });
  // Live equivalent-grams hint when a treat/can is selected.
  $reading.addEventListener('input', () => { if (recordFood !== 'kibble') updateExtraEq(); });

  // --- Body weight ---
  // One 记体重 button serves both methods (mirrors the food box's single 记一笔).
  $weightSave.addEventListener('click', () => {
    if ((state.weightMethod || 'direct') === 'diff') saveWeightDiff(); else saveWeight();
  });
  // Weight time-pill: same time picker as food panel, sharing pendingEntryTs
  $weightTimeToggle.addEventListener('click', () => {
    openTimePicker(pendingEntryTs || Date.now(), ts => setPendingEntryTs(ts), '这次称重的时间', () => resetEntryTime());
  });
  function updateWeightTimeDisplay() {
    if ($weightTimeVal) {
      $weightTimeVal.textContent = pendingEntryTs ? isoDate(pendingEntryTs) + ' ' + fmtTime(pendingEntryTs) : '现在';
    }
  }
  $weightInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveWeight(); } });
  $weightUnit.addEventListener('change', () => {
    const pet = currentPet(); if (!pet) return;
    pet.bodyWeightUnit = $weightUnit.value || 'kg';
    persist(); renderWeight(pet);
  });

  // Weight entry method (直接称 / 作差) toggle.
  function setWeightMethod(method) {
    const m = method === 'diff' ? 'diff' : 'direct';
    $weightMethod.querySelectorAll('label').forEach(l => {
      const on = l.dataset.val === m;
      l.classList.toggle('active', on);
      const inp = l.querySelector('input'); if (inp) inp.checked = on;
    });
    $weightSingle.classList.toggle('hidden', m === 'diff');
    $weightDiff.classList.toggle('active', m === 'diff');
  }
  $weightMethod.querySelectorAll('label').forEach(lbl => {
    lbl.addEventListener('click', e => {
      e.preventDefault();
      state.weightMethod = lbl.dataset.val === 'diff' ? 'diff' : 'direct';
      setWeightMethod(state.weightMethod);
      persist();
    });
  });
  [$weightDiffA, $weightDiffB].forEach(el => el.addEventListener('input', refreshDiffResult));
  $weightDiffB.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); saveWeightDiff(); } });
  $weightDiffUnit.addEventListener('change', () => {
    const pet = currentPet(); if (pet) { pet.bodyWeightUnit = $weightDiffUnit.value || 'kg'; persist(); }
    refreshDiffResult();
  });

  // Weight trend range tabs + custom range.
  $weightTrendTabs.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      state.weightPeriod = b.dataset.p;
      if (state.weightPeriod === 'custom' && (!state.weightCustomStart || !state.weightCustomEnd)) {
        const today = todayBucketIso();
        if (!state.weightCustomEnd) state.weightCustomEnd = today;
        if (!state.weightCustomStart) state.weightCustomStart = lastNDays(30, today).slice(-1)[0];
      }
      persist();
      const pet = currentPet(); if (pet) renderWeight(pet);
    });
  });
  $weightCustomStart.addEventListener('change', () => {
    state.weightCustomStart = $weightCustomStart.value || null;
    persist(); const pet = currentPet(); if (pet) renderWeight(pet);
  });
  $weightCustomEnd.addEventListener('change', () => {
    state.weightCustomEnd = $weightCustomEnd.value || null;
    persist(); const pet = currentPet(); if (pet) renderWeight(pet);
  });

  // ===== Board tabs (粮食 / 体重 / 猫语) =====
  function setBoard(board) {
    const b = ['food', 'weight', 'meow'].includes(board) ? board : 'food';
    const changed = state.board !== b;
    state.board = b;
    $boardTabs.querySelectorAll('button').forEach(btn => {
      const on = btn.dataset.board === b;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.board-panel').forEach(p => p.classList.toggle('active', p.dataset.board === b));
    // 切走「猫语」时停止仍在循环的叫声
    if (b !== 'meow') document.dispatchEvent(new Event('cat-board-stop'));
    // 切换面板时复位「待记录时间」，杜绝在粮食面板设过的补录时间泄漏到体重面板（反之亦然）
    if (changed) resetEntryTime();
  }
  // 让每个板块可被链接直达：#food / #weight / #meow（兼容 #cat）。这样可以
  // 单独收藏/分享某个 tab，打开就停在那个板块，而不是总落回「粮食」。
  function boardFromHash() {
    const h = (location.hash || '').replace(/^#/, '').toLowerCase();
    if (['meow', 'cat', 'catlang', '猫语'].includes(h)) return 'meow';
    if (['weight', '体重'].includes(h)) return 'weight';
    if (['food', '粮食'].includes(h)) return 'food';
    return null;
  }
  function syncBoardHash(b) {
    const want = '#' + b;
    if (location.hash !== want) history.replaceState(null, '', location.pathname + location.search + want);
  }
  $boardTabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { setBoard(btn.dataset.board); persist(); syncBoardHash(state.board); });
  });
  // 直接改 hash（粘贴链接 / 浏览器前进后退）也跟着切板块
  window.addEventListener('hashchange', () => { const b = boardFromHash(); if (b && b !== state.board) { setBoard(b); persist(); } });

  // 点目标进度条 → 打开宠物编辑弹窗并聚焦目标输入（管理员及以上）
  $recStrip.addEventListener('click', () => {
    const pet = currentPet();
    if (!pet || !isAdminOrUp(pet)) return;
    openIntakeModal();   // 点目标条 → 打开聚焦的「食量设置」弹窗（不再弹整张档案）
  });

  // ===== Reusable date+time picker modal =====
  let tpOnConfirm = null;
  let tpOnReset = null;   // 可选：弹窗里「用现在」按钮的回调（仅记录新条目时给）
  function openTimePicker(initialTs, onConfirm, title, onReset) {
    tpOnConfirm = onConfirm;
    tpOnReset = onReset || null;
    $tpNow.style.display = tpOnReset ? '' : 'none';
    $tpTitle.textContent = title || '选择时间';
    const local = tsToLocalInput(initialTs || Date.now()); // YYYY-MM-DDTHH:MM
    $tpDate.value = local.slice(0, 10);
    $tpDate.max = todayBucketIso();   // grey out future dates in native calendar
    $tpTime.value = local.slice(11, 16);
    $tpModal.classList.add('open');
  }
  function closeTimePicker() { $tpModal.classList.remove('open'); tpOnConfirm = null; tpOnReset = null; }
  $tpCancel.addEventListener('click', closeTimePicker);
  $tpNow.addEventListener('click', () => { const cb = tpOnReset; closeTimePicker(); if (cb) cb(); });
  $tpModal.addEventListener('click', e => { if (e.target === $tpModal) closeTimePicker(); });
  $tpConfirm.addEventListener('click', () => {
    if (!$tpDate.value || !$tpTime.value) { alert('日期和时间都要选'); return; }
    const ts = localInputToTs($tpDate.value + 'T' + $tpTime.value);
    if (!ts) { alert('时间无效'); return; }
    if (ts > Date.now() + 60000) { alert('时间不能晚于现在'); return; }
    const cb = tpOnConfirm;
    closeTimePicker();
    if (cb) cb(ts);
  });

  // --- Custom record time (add) ---
  $timeToggle.addEventListener('click', () => {
    openTimePicker(pendingEntryTs || Date.now(), ts => setPendingEntryTs(ts), '这次记录的时间', () => resetEntryTime());
  });
  // --- 结束时间（构成时间段，仅直接填模式）---
  function pickEndTime() {
    openTimePicker(pendingEntryTsEnd || pickedEntryTs(), ts => setPendingEntryTsEnd(ts), '吃完的时间（结束）', () => setPendingEntryTsEnd(null));
  }
  $timeAddEnd.addEventListener('click', pickEndTime);
  $timeEndToggle.addEventListener('click', (e) => {
    if (e.target === $timeEndClear) { setPendingEntryTsEnd(null); return; }
    pickEndTime();
  });

  // --- 填法切换（直接填 / 作差）---
  $methodToggle.querySelectorAll('input[name="rec-method"]').forEach(r => {
    r.addEventListener('change', () => {
      recordMethod = r.value;
      const pet = currentPet();
      if (pet) setMethodPref(pet, recordFood, recordMethod);
      applyRecordFoodUI();
      updateExtraEq();
    });
  });

  // ===== Food (treat/can) modal =====
  // 5 列网格，保持整行：图标格(📷)+14 emoji = 15 格 = 3 整行（同头像那套 13+拍照格=14）。
  const FOOD_EMOJIS = ['🥣','🍚','🥫','🍗','🐔','🥩','🐟','🦐','🦴','🥚','🧀','🥛','🍪','💊'];
  let fmEditingId = null;
  let fmGroupId = null;   // 编辑食物时选中的「所属分组」（null=不分组）
  // 填充食物弹窗里的「分组」下拉：不分组 + 现有各组 + 新建分组。
  function renderFmGroupOptions(pet, selectedGid) {
    if (!$fmGroup) return;
    const groups = Array.isArray(pet.foodGroups) ? pet.foodGroups : [];
    let html = `<option value="">不分类</option>`;
    html += groups.map(g => `<option value="${g.id}"${g.id === selectedGid ? ' selected' : ''}>${escapeHtml((g.emoji || '🗂') + ' ' + (g.name || '类别'))}</option>`).join('');
    html += `<option value="__new">＋ 新建类别…</option>`;
    $fmGroup.innerHTML = html;
    fmGroupId = selectedGid || null;
  }
  let fmEmoji = '🍖';
  let fmIconPhoto = null;             // 食物图标用的照片(160px JPEG dataURL)；存在则优先于 emoji
  let fmKibbleMode = false;          // 编辑「干粮」基准时为 true（写 pet.kibbleKcalPerG，不进 foodLibrary）

  // Estimate metabolizable energy (kcal per 100g as-fed) from the guaranteed
  // analysis using modified Atwater factors (protein 3.5, fat 8.5, NFE 3.5).
  // NFE (carbs) = 100 − moisture − protein − fat − ash − fiber. Ash/fiber are
  // small; default to typical values (2 / 0.5) when the label omits them.
  //
  // Mixed-basis guard (common on Chinese labels): protein/fat/ash/fiber are
  // often printed on a DRY-MATTER basis while moisture is as-fed. Then the
  // numbers sum past 100% (e.g. protein 45 + water 85 is impossible as-fed —
  // there's only 15g of dry matter per 100g). When we detect that, we scale the
  // macros back to as-fed (× dry-matter fraction) before computing energy, so a
  // 15g 85%-water stick reads as ~2g of kibble instead of a bogus ~10g.
  // This correction is SILENT — the dry/as-fed basis is our internal accounting,
  // never surfaced to the user (it only confuses; they just copy the label).
  // Returns { kcal, corrected, asfed:{p,f,m} } — asfed = the as-fed macro values
  // after any silent correction, used by sanityHint() for typo detection.
  function analyzeKcal(a) {
    // Empty fields must be "missing", not 0 — Number('') is 0 (finite), which
    // would silently treat blanks as 0% and inflate NFE. Parse blanks to NaN.
    const num = v => (v === '' || v == null) ? NaN : Number(v);
    const p = num(a.protein), f = num(a.fat), m = num(a.moisture);
    if (!Number.isFinite(p) || !Number.isFinite(f) || !Number.isFinite(m)) return null;
    const ashN = num(a.ash), fiberN = num(a.fiber);
    let ash = Number.isFinite(ashN) ? ashN : 2;
    let fiber = Number.isFinite(fiberN) ? fiberN : 0.5;
    let P = p, F = f;
    let corrected = false;
    // Dry-basis tell: stated protein can't exceed the non-water mass (dry matter
    // = 100 − moisture). If it does, the macros are physically impossible as-fed
    // and must be on a dry-matter basis — fold them back to as-fed (× dry frac).
    // (As-fed guaranteed values are min/max bounds and can legitimately sum a few
    // points past 100, so a bare sum>100 check over-fires; the protein>DM test is
    // the hard one, with a generous sum>110 backstop for odd fat-heavy labels.)
    const dryMatter = 100 - m;
    if (m > 0 && m < 100 && (p > dryMatter || (m + p + f + ash + fiber) > 110)) {
      const dryFrac = dryMatter / 100;
      P = p * dryFrac; F = f * dryFrac; ash = ash * dryFrac; fiber = fiber * dryFrac;
      corrected = true;
    }
    const nfe = Math.max(0, 100 - m - P - F - ash - fiber);
    const kcal = P * 3.5 + F * 8.5 + nfe * 3.5;
    return kcal > 0 ? { kcal, corrected, asfed: { p: P, f: F, m } } : null;
  }
  function kcalPer100gFromAnalysis(a) { const r = analyzeKcal(a); return r ? r.kcal : null; }

  // ===== 离谱值轻声提醒 =====
  // 干湿基那套已在 analyzeKcal 里静默修正、绝不提示用户。这里只做另一件事：
  // 用户大概率是照包装老实抄的，但偶尔会手滑（多打一位 / 看错行 / 数字写串）。
  // 水分这一项本身就告诉了我们是干粮还是湿粮，无需再问「这是哪种食物」——
  // 据此取该类「实物成分」的常见上限，只有当某项**明显说不通**时才轻声问一句。
  // 阈值刻意放宽，照抄正常标签几乎不会触发；命中也只是中性提示，绝不拦保存。
  const SANITY_CAPS = {                 // 实物(as-fed)成分离谱上限 [蛋白, 脂肪]%
    wet:  { protein: 30, fat: 22 },     // 猫条 / 罐头 / 主食湿粮（水分≥65）
    dry:  { protein: 68, fat: 58 },     // 干粮 / 膨化 / 冻干（水分≤16，留足冻干高蛋白余量）
    semi: { protein: 55, fat: 45 },     // 半湿 / 不确定
  };
  function sanityHint(a) {
    const r = analyzeKcal(a);
    if (!r) return null;
    const { p, f, m } = r.asfed;        // 已按干湿基静默修正后的实物值
    const rawP = parseFloat(a.protein), rawF = parseFloat(a.fat);  // 用户原样填的
    const offs = [];
    if (m > 95) offs.push('水分');       // 再湿的猫条一般也不超 ~90%
    const cls = m >= 65 ? 'wet' : (m <= 16 ? 'dry' : 'semi');
    const cap = SANITY_CAPS[cls];
    // 实物值超该类常见上限，或原始值在任何基准下都不可能(>90%，真实标签最高 ~65%)
    // ——后者专抓「多打一位」这类手滑（干基修正会把它缩成正常值、躲过上面那关）。
    if (p > cap.protein || rawP > 90) offs.push('粗蛋白质');
    if (f > cap.fat || rawF > 90) offs.push('粗脂肪');
    if (!offs.length) return null;
    if (offs.length === 1 && offs[0] === '水分')
      return '水分这项偏高，确认下没看错喔（再湿的猫条一般也不超过 90%）。';
    return `「${offs.join('」「')}」${offs.length > 1 ? '这几项' : '这项'}数字偏高，确认下是不是看错、或多打了一位。`;
  }
  function fmReadAnalysis() {
    return {
      protein: $fmAnProtein.value, fat: $fmAnFat.value, moisture: $fmAnMoisture.value,
      ash: $fmAnAsh.value, fiber: $fmAnFiber.value,
    };
  }
  function fmMeasureVal() {
    const r = $fmMeasure.querySelector('input[name="fm-measure"]:checked');
    return r ? r.value : 'count';
  }
  function fmSourceVal() {
    const r = $fmSource.querySelector('input[name="fm-source"]:checked');
    return r ? r.value : 'direct';
  }
  function fmApplyMeasureUI() {
    const m = fmMeasureVal();
    const isCount = m === 'count';
    $fmCountFields.style.display = isCount ? '' : 'none';
    $fmGramFields.style.display = isCount ? 'none' : '';
    $fmUnitLabelField.style.display = isCount ? '' : 'none';
    $fmGramsPerUnitField.style.display = (isCount && fmSourceVal() === 'analysis') ? '' : 'none';
    $fmEquivCount.style.display = isCount ? '' : 'none';
    $fmEquivGramField.style.display = isCount ? 'none' : '';
    $fmMeasure.querySelectorAll('label').forEach(l => l.classList.toggle('active', l.dataset.val === m));
  }
  function fmApplySourceUI() {
    const s = fmSourceVal();
    $fmDirectBlock.style.display = s === 'direct' ? '' : 'none';
    $fmAnalysisBlock.style.display = s === 'analysis' ? '' : 'none';
    $fmEquivBlock.style.display = s === 'equiv' ? '' : 'none';
    $fmGramsPerUnitField.style.display = (fmMeasureVal() === 'count' && s === 'analysis') ? '' : 'none';
    $fmSource.querySelectorAll('label').forEach(l => l.classList.toggle('active', l.dataset.val === s));
    fmUpdateEstimate();
  }
  // Live estimate readout under the analysis fields.
  function fmUpdateEstimate() {
    if (fmSourceVal() !== 'analysis') return;
    const a = fmReadAnalysis();
    const r = analyzeKcal(a);
    if (r == null) { $fmEstResult.textContent = '≈ — 大卡 / 100 克'; $fmBasisNote.style.display = 'none'; return; }
    const k100 = r.kcal;
    if (fmMeasureVal() === 'gram') {
      $fmEstResult.textContent = `≈ ${fmtG(k100)} 大卡 / 100 克`;
    } else {
      const g = parseFloat($fmGramsPerUnit.value);
      const label = $fmUnitLabel.value.trim() || '份';
      if (Number.isFinite(g) && g > 0) {
        $fmEstResult.textContent = `每${label} ≈ ${parseFloat((k100*g/100).toFixed(1))} 大卡`;
      } else {
        $fmEstResult.textContent = `≈ ${fmtG(k100)} 大卡 / 100 克（填上一${label}多少克，就能算每${label}热量）`;
      }
    }
    const hint = sanityHint(a);
    $fmBasisNote.textContent = hint || '';
    $fmBasisNote.style.display = hint ? '' : 'none';
  }
  // 食物图标的「拍照 / 选图」——编辑弹窗与向导共用这个隐藏 input，
  // 裁剪结果(160px JPEG)按 onApply 回调写到对应字段(fmIconPhoto / fwIconPhoto)。
  const $foodPhotoFile = document.getElementById('food-photo-file');
  let foodPhotoApply = null;
  function pickFoodPhoto(onApply) { foodPhotoApply = onApply; $foodPhotoFile.value = ''; $foodPhotoFile.click(); }
  $foodPhotoFile.addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    $foodPhotoFile.value = '';
    if (!f) return;
    if (!f.type || f.type.indexOf('image/') !== 0) { alert('请选图片文件'); return; }
    const cb = foodPhotoApply;
    try { const dataUrl = await readAsDataURL(f); openCropModal(dataUrl, cb); }
    catch (err) { alert('读取图片失败：' + (err && err.message || err)); }
  });
  // 图标网格 = 照片格（拍照/选图）+ emoji；选 emoji 会清掉照片，反之照片优先、emoji 不再高亮。
  function fmRenderEmoji() {
    const photo = fmIconPhoto
      ? `<button type="button" class="photo-cell active" data-photo="1" title="换图标照片"><img src="${escapeHtml(fmIconPhoto)}" alt=""></button>`
      : `<button type="button" class="photo-cell" data-photo="1" title="拍照 / 从相册选">📷</button>`;
    $fmEmojiPick.innerHTML = photo + FOOD_EMOJIS.map(e =>
      `<button type="button" class="${!fmIconPhoto && e === fmEmoji ? 'active' : ''}" data-emoji="${e}">${e}</button>`).join('');
    $fmEmojiPick.querySelectorAll('button[data-emoji]').forEach(b => b.addEventListener('click', () => {
      fmEmoji = b.dataset.emoji; fmIconPhoto = null; fmRenderEmoji();
    }));
    $fmEmojiPick.querySelector('button[data-photo]').addEventListener('click', () =>
      pickFoodPhoto(url => { fmIconPhoto = url; fmRenderEmoji(); }));
  }
  function setFmMeasure(m) {
    const r = $fmMeasure.querySelector(`input[value="${m}"]`);
    if (r) r.checked = true;
    fmApplyMeasureUI();
  }
  function setFmSource(s) {
    const r = $fmSource.querySelector(`input[value="${s}"]`);
    if (r) r.checked = true;
    fmApplySourceUI();
  }
  function fmClearAnalysis() {
    $fmAnProtein.value = ''; $fmAnFat.value = ''; $fmAnMoisture.value = '';
    $fmAnAsh.value = ''; $fmAnFiber.value = ''; $fmGramsPerUnit.value = '';
    $fmEquivGrams.value = ''; $fmEquivGrams100.value = '';
    if ($fmBasisNote) $fmBasisNote.style.display = 'none';
  }
  function fmSetAnalysis(a) {
    $fmAnProtein.value = a && a.protein != null ? a.protein : '';
    $fmAnFat.value = a && a.fat != null ? a.fat : '';
    $fmAnMoisture.value = a && a.moisture != null ? a.moisture : '';
    $fmAnAsh.value = a && a.ash != null ? a.ash : '';
    $fmAnFiber.value = a && a.fiber != null ? a.fiber : '';
  }
  function openKibbleEditor(pet) {
    // 复用本弹窗编辑「干粮」基准：只填名字/图标/每100克大卡（或照成分估算），强制按克、无删除。
    fmKibbleMode = true;
    fmEditingId = null;
    fmClearAnalysis();
    const k = pet.kibble || {};
    $fmTitle.textContent = '编辑干粮';
    $fmKibbleHint.style.display = '';
    $fmName.value = k.name || '干粮';
    fmEmoji = k.emoji || '🥣';
    fmIconPhoto = k.iconPhoto || null;
    setFmMeasure('gram');                       // 干粮永远按克
    $fmMeasureField.style.display = 'none';      // 隐藏「怎么算量」整块
    $fmUnitLabel.value = '份';
    const perG = (Number.isFinite(pet.kibbleKcalPerG) && pet.kibbleKcalPerG > 0) ? pet.kibbleKcalPerG : 3.8;
    if (k.analysis) fmSetAnalysis(k.analysis);
    if (k.kcalSource === 'analysis') { $fmKcal100g.value = ''; setFmSource('analysis'); }
    else { $fmKcal100g.value = parseFloat((perG * 100).toFixed(1)); setFmSource('direct'); }
    $fmDelete.style.display = 'none';            // 基准干粮不能删
    if ($fmSourceEquiv) $fmSourceEquiv.style.display = 'none';   // 干粮本身就是基准，「折成干粮」对它无意义
    fmRenderEmoji();
    $foodModal.classList.add('open');
    $fmName.focus();
  }
  function openFoodModal(id) {
    const pet = currentPet();
    if (!pet || !isAdminOrUp(pet)) { alert('只有主人/管理员能添加或修改食物'); return; }
    if (id === 'kibble') { openKibbleEditor(pet); return; }
    // 新建走分步向导（C）；本弹窗（A 卡片）只负责编辑已有食物。
    if (!id) { openFoodWizard(); return; }
    fmKibbleMode = false;
    $fmMeasureField.style.display = '';
    $fmKibbleHint.style.display = 'none';
    if ($fmSourceEquiv) $fmSourceEquiv.style.display = '';       // 普通食物可用「折成干粮」
    fmEditingId = id;
    fmClearAnalysis();
    const f = (pet.foodLibrary || []).find(x => x.id === id);
    if (!f) return;
    $fmTitle.textContent = '编辑食物';
    renderFmGroupOptions(pet, f.groupId || '');
    $fmName.value = f.name || '';
    fmEmoji = f.emoji || '🍖';
    fmIconPhoto = f.iconPhoto || null;
    const measure = f.measure || 'count';
    setFmMeasure(measure);
    $fmUnitLabel.value = measure === 'gram' ? '份' : (f.unitLabel || '份');
    if (measure === 'gram') {
      $fmKcal100g.value = (Number(f.kcalPerUnit) || 0) * 100 || '';
      $fmKcalCount.value = '';
    } else {
      $fmKcalCount.value = f.kcalPerUnit != null ? f.kcalPerUnit : '';
      $fmKcal100g.value = '';
    }
    // Restore the estimator if this food was created from an analysis.
    if (f.analysis) { fmSetAnalysis(f.analysis); if (f.gramsPerUnit != null) $fmGramsPerUnit.value = f.gramsPerUnit; }
    // Restore the "folds into kibble" quick-entry.
    if (f.kcalSource === 'equiv' && f.equivGrams != null) {
      if (measure === 'gram') $fmEquivGrams100.value = f.equivGrams; else $fmEquivGrams.value = f.equivGrams;
    }
    setFmSource(f.kcalSource === 'analysis' ? 'analysis' : (f.kcalSource === 'equiv' ? 'equiv' : 'direct'));
    $fmDelete.style.display = '';
    $fmUnitEcho.textContent = $fmUnitLabel.value || '份';
    $fmUnitEcho2.textContent = $fmUnitLabel.value || '份';
    $fmUnitEcho3.textContent = $fmUnitLabel.value || '份';
    fmRenderEmoji();
    $foodModal.classList.add('open');
    $fmName.focus();
  }
  function closeFoodModal() {
    $foodModal.classList.remove('open'); fmEditingId = null;
    fmKibbleMode = false;
    if ($fmMeasureField) $fmMeasureField.style.display = '';
    if ($fmKibbleHint) $fmKibbleHint.style.display = 'none';
  }
  // 换算基准只在「🎯 食量设置 › 平时主要吃什么」下拉里切换（默认干粮）——
  // 不在每个食物编辑弹窗里放「设为基准」按钮，免得打扰日常使用。
  function saveKibble(pet, name) {
    const source = fmSourceVal();
    let perG, analysis = null;
    if (source === 'analysis') {
      const k100 = kcalPer100gFromAnalysis(fmReadAnalysis());
      if (k100 == null) { alert('至少把粗蛋白、粗脂肪、水分填上'); return; }
      analysis = fmReadAnalysis();
      perG = k100 / 100;
    } else {
      const k100 = parseFloat($fmKcal100g.value);
      if (!Number.isFinite(k100) || k100 <= 0) { alert('填一下每 100 克干粮多少大卡'); return; }
      perG = k100 / 100;
    }
    pet.kibbleKcalPerG = perG;                  // 换算基准（kcal/g）—— 全局换算都读它
    pet.kibble = { name, emoji: fmEmoji, iconPhoto: fmIconPhoto || null, kcalSource: source, analysis };
    persist();
    schedulePushMeta(pet);
    closeFoodModal();
    selectRecordFood('kibble');                 // 重渲染并把基准变化带进等效预览
    return true;
  }
  function saveFood() {
    const pet = currentPet();
    if (!pet || !isAdminOrUp(pet)) return;
    const name = $fmName.value.trim();
    if (!name) { alert('给食物起个名'); return; }
    // Soft-check for duplicate name (non-blocking — just a heads-up)
    if (!fmEditingId) {
      const dup = (pet.foodLibrary || []).find(x => x.name === name);
      if (dup && !confirm('已经有一个叫"' + name + '"的食物，要再建一个同名的吗？')) return;
    }
    if (fmKibbleMode) return saveKibble(pet, name);
    const measure = fmMeasureVal();
    const source = fmSourceVal();
    const unitLabel = measure === 'gram' ? 'g' : ($fmUnitLabel.value.trim() || '份');
    let kcalPerUnit, analysis = null, gramsPerUnit = null, equivGrams = null;

    if (source === 'analysis') {
      const k100 = kcalPer100gFromAnalysis(fmReadAnalysis());
      if (k100 == null) { alert('至少把粗蛋白、粗脂肪、水分填上'); return; }
      analysis = fmReadAnalysis();
      if (measure === 'gram') {
        kcalPerUnit = k100 / 100;        // kcal per gram
      } else {
        const g = parseFloat($fmGramsPerUnit.value);
        if (!Number.isFinite(g) || g <= 0) { alert('按成分估算时，填一下每' + unitLabel + '大约多少克'); return; }
        kcalPerUnit = k100 * g / 100;    // kcal per piece
        gramsPerUnit = g;
      }
    } else if (source === 'equiv') {
      // User states this food is worth N grams of kibble. Store the energy
      // (N × kibble's kcal/g) so it slots into the same kcalPerUnit pipeline;
      // keep equivGrams for re-editing. (Display back as N grams when base=kibble.)
      const dens = kibbleKcalPerGOf(pet);
      if (measure === 'gram') {
        const g100 = parseFloat($fmEquivGrams100.value);
        if (!Number.isFinite(g100) || g100 <= 0) { alert('填一下每 100 克相当于多少克干粮'); return; }
        kcalPerUnit = (g100 / 100) * dens;   // kcal per gram
        equivGrams = g100;
      } else {
        const g = parseFloat($fmEquivGrams.value);
        if (!Number.isFinite(g) || g <= 0) { alert('填一下每' + unitLabel + '相当于多少克干粮'); return; }
        kcalPerUnit = g * dens;              // kcal per piece
        equivGrams = g;
      }
    } else {
      if (measure === 'gram') {
        const k100 = parseFloat($fmKcal100g.value);
        if (!Number.isFinite(k100) || k100 <= 0) { alert('填一下每 100 克多少大卡'); return; }
        // Most cat/dog dry food is 300–450 kcal/100g; wet food 60–120.
        // Flag anything wildly outside that range as a likely typo/swap (non-blocking).
        if (k100 > 900 && !confirm('每100克 ' + k100 + ' 大卡看起来偏高（通常是 60–450）。包装上印的可能是每公斤或每袋？\n确定就是这个数字？')) return;
        if (k100 < 30 && !confirm('每100克 ' + k100 + ' 大卡看起来偏低。确定吗？')) return;
        kcalPerUnit = k100 / 100;
      } else {
        const k = parseFloat($fmKcalCount.value);
        if (!Number.isFinite(k) || k <= 0) { alert('填一下每' + unitLabel + '多少大卡'); return; }
        if (k > 500 && !confirm('每' + unitLabel + ' ' + k + ' 大卡看起来很高。是不是把每 100 克的数字填进来了？\n确定就是这个数字？')) return;
        kcalPerUnit = k;
      }
    }

    const data = { name, emoji: fmEmoji, iconPhoto: fmIconPhoto || null, measure, unitLabel, kcalPerUnit, kcalSource: source, analysis, gramsPerUnit, equivGrams, groupId: fmGroupId || null };
    pet.foodLibrary = pet.foodLibrary || [];
    let savedId;
    if (fmEditingId) {
      const f = pet.foodLibrary.find(x => x.id === fmEditingId);
      if (f) { Object.assign(f, data); savedId = f.id; }
    } else {
      savedId = uuid('f');
      pet.foodLibrary.push({ id: savedId, ...data });
    }
    persist();
    schedulePushMeta(pet);
    closeFoodModal();
    if (savedId) selectRecordFood(savedId); else { renderFoodSelector(); }
    return true;   // 让 finishFoodWizard 知道保存成功了，才关闭向导
  }
  function deleteFood() {
    const pet = currentPet();
    if (!pet || !fmEditingId) return;
    if (!confirm('删除这个食物？已记录的历史不受影响。')) return;
    pet.foodLibrary = (pet.foodLibrary || []).filter(f => f.id !== fmEditingId);
    if (recordFood === fmEditingId) recordFood = 'kibble';
    persist();
    schedulePushMeta(pet);
    closeFoodModal();
    selectRecordFood('kibble');
  }
  $fmMeasure.querySelectorAll('input[name="fm-measure"]').forEach(r => r.addEventListener('change', () => { fmApplyMeasureUI(); fmUpdateEstimate(); }));
  $fmSource.querySelectorAll('input[name="fm-source"]').forEach(r => r.addEventListener('change', fmApplySourceUI));
  $fmUnitLabel.addEventListener('input', () => {
    const v = $fmUnitLabel.value.trim() || '份';
    $fmUnitEcho.textContent = v; $fmUnitEcho2.textContent = v; $fmUnitEcho3.textContent = v; fmUpdateEstimate();
  });
  [$fmAnProtein, $fmAnFat, $fmAnMoisture, $fmAnAsh, $fmAnFiber, $fmGramsPerUnit].forEach(el =>
    el.addEventListener('input', fmUpdateEstimate));
  if ($fmGroup) $fmGroup.addEventListener('change', () => {
    if ($fmGroup.value === '__new') {
      const pet = currentPet();
      const name = (prompt('新类别名称（如：湿粮 / 零食 / 罐头）：', '') || '').trim();
      if (!name || !pet) { $fmGroup.value = fmGroupId || ''; return; }
      const gid = createFoodGroup(pet, name);
      persist(); schedulePushMeta(pet);
      renderFmGroupOptions(pet, gid);
    } else {
      fmGroupId = $fmGroup.value || null;
    }
  });
  $fmSave.addEventListener('click', saveFood);
  $fmDelete.addEventListener('click', deleteFood);
  $fmCancel.addEventListener('click', closeFoodModal);
  $foodModal.addEventListener('click', e => { if (e.target === $foodModal) closeFoodModal(); });

  // ===== New-food wizard (C, 3-step). Collects answers, then hydrates the
  //       #food-modal inputs and reuses saveFood() — one save/validation path. =====
  const $fw = document.getElementById('food-wizard');
  const $fwName = document.getElementById('fw-name');
  const $fwEmojiPick = document.getElementById('fw-emoji-pick');
  const $fwEmojiEcho = document.getElementById('fw-emoji-echo');
  const $fwMeasure = document.getElementById('fw-measure');
  const $fwUnitField = document.getElementById('fw-unit-field');
  const $fwUnitLabel = document.getElementById('fw-unit-label');
  const $fwSource = document.getElementById('fw-source');
  const $fwDirect = document.getElementById('fw-direct');
  const $fwKcal = document.getElementById('fw-kcal');
  const $fwSuffix = document.getElementById('fw-suffix');
  const $fwAnalysis = document.getElementById('fw-analysis');
  const $fwGpuField = document.getElementById('fw-gpu-field');
  const $fwGpu = document.getElementById('fw-gpu');
  const $fwUnitEcho = document.getElementById('fw-unit-echo');
  const $fwEst = document.getElementById('fw-est');
  const $fwBasisNote = document.getElementById('fw-basis-note');
  const $fwEquiv = document.getElementById('fw-equiv');
  const $fwEquivCount = document.getElementById('fw-equiv-count');
  const $fwEquivGramField = document.getElementById('fw-equiv-gram-field');
  const $fwEquivGrams = document.getElementById('fw-equiv-grams');
  const $fwEquivGrams100 = document.getElementById('fw-equiv-grams100');
  const $fwUnitEcho2 = document.getElementById('fw-unit-echo2');
  const $fwDots = Array.from(document.getElementById('fw-dots').children);
  const $fwBack = document.getElementById('fw-back');
  const $fwNext = document.getElementById('fw-next');
  const $fwCancel = document.getElementById('fw-cancel');
  let fwStep = 1, fwMeasure = 'count', fwSource = 'direct', fwEmoji = '🍖', fwIconPhoto = null;

  function fwReadAnalysis() {
    const o = {};
    $fwAnalysis.querySelectorAll('.fw-an').forEach(i => o[i.dataset.k] = i.value);
    return o;
  }
  function fwRenderEmoji() {
    const photo = fwIconPhoto
      ? `<button type="button" class="photo-cell active" data-photo="1" title="换图标照片"><img src="${escapeHtml(fwIconPhoto)}" alt=""></button>`
      : `<button type="button" class="photo-cell" data-photo="1" title="拍照 / 从相册选">📷</button>`;
    $fwEmojiPick.innerHTML = photo + FOOD_EMOJIS.map(e =>
      `<button type="button" class="${!fwIconPhoto && e === fwEmoji ? 'active' : ''}" data-emoji="${e}">${e}</button>`).join('');
    $fwEmojiPick.querySelectorAll('button[data-emoji]').forEach(b => b.addEventListener('click', () => {
      fwEmoji = b.dataset.emoji; fwIconPhoto = null; fwRenderEmoji(); $fwEmojiEcho.textContent = fwEmoji;
    }));
    $fwEmojiPick.querySelector('button[data-photo]').addEventListener('click', () =>
      pickFoodPhoto(url => { fwIconPhoto = url; fwRenderEmoji(); $fwEmojiEcho.textContent = '📷'; }));
  }
  function fwUpdateEstimate() {
    if (fwSource !== 'analysis') return;
    const a = fwReadAnalysis();
    const r = analyzeKcal(a);
    if (r == null) { $fwEst.textContent = '≈ — 大卡 / 100 克'; $fwBasisNote.style.display = 'none'; return; }
    const k = r.kcal;
    if (fwMeasure === 'gram') { $fwEst.textContent = `≈ ${fmtG(k)} 大卡 / 100 克`; }
    else {
      const g = parseFloat($fwGpu.value);
      const lb = $fwUnitLabel.value.trim() || '份';
      $fwEst.textContent = (Number.isFinite(g) && g > 0)
        ? `每${lb} ≈ ${parseFloat((k * g / 100).toFixed(1))} 大卡`
        : `≈ ${fmtG(k)} 大卡 / 100 克（填上一${lb}多少克，就能算每${lb}热量）`;
    }
    const hint = sanityHint(a);
    $fwBasisNote.textContent = hint || '';
    $fwBasisNote.style.display = hint ? '' : 'none';
  }
  function fwRefresh() {
    [1, 2, 3].forEach(n => document.getElementById('fw-step' + n).hidden = (n !== fwStep));
    $fwDots.forEach((d, i) => { d.classList.toggle('active', i === fwStep - 1); d.classList.toggle('done', i < fwStep - 1); });
    $fwBack.style.visibility = fwStep === 1 ? 'hidden' : 'visible';
    $fwNext.textContent = fwStep === 3 ? '保存 ✓' : '下一步 →';
    $fwEmojiEcho.textContent = fwEmoji;
    const lb = $fwUnitLabel.value.trim() || '份';
    $fwUnitField.style.display = fwMeasure === 'count' ? '' : 'none';
    $fwSuffix.textContent = fwMeasure === 'gram' ? '大卡 / 100 克' : ('大卡 / 每' + lb);
    $fwGpuField.style.display = (fwMeasure === 'count' && fwSource === 'analysis') ? '' : 'none';
    $fwUnitEcho.textContent = lb;
    $fwUnitEcho2.textContent = lb;
    $fwDirect.hidden = fwSource !== 'direct';
    $fwAnalysis.hidden = fwSource !== 'analysis';
    $fwEquiv.hidden = fwSource !== 'equiv';
    $fwEquivCount.style.display = fwMeasure === 'count' ? '' : 'none';
    $fwEquivGramField.style.display = fwMeasure === 'count' ? 'none' : '';
    fwUpdateEstimate();
  }
  function openFoodWizard() {
    fwStep = 1; fwMeasure = 'count'; fwSource = 'direct'; fwEmoji = '🍖'; fwIconPhoto = null;
    $fwName.value = ''; $fwUnitLabel.value = '份'; $fwKcal.value = ''; $fwGpu.value = '';
    $fwEquivGrams.value = ''; $fwEquivGrams100.value = '';
    $fwAnalysis.querySelectorAll('.fw-an').forEach(i => i.value = '');
    $fwMeasure.querySelectorAll('.big-choice').forEach(x => x.classList.toggle('active', x.dataset.val === 'count'));
    $fwSource.querySelectorAll('.big-choice').forEach(x => x.classList.toggle('active', x.dataset.val === 'direct'));
    fwRenderEmoji();
    fwRefresh();
    $fw.classList.add('open');
    $fwName.focus();
  }
  function closeFoodWizard() { $fw.classList.remove('open'); }
  function finishFoodWizard() {
    // Funnel wizard answers into the canonical edit-modal inputs, then save once.
    fmEditingId = null;
    fmGroupId = pendingCatForNewFood || null;   // 从某类别里「新建食物」→ 默认归入该类别；否则不分类
    pendingCatForNewFood = null;
    fmKibbleMode = false;   // 向导永远存的是库内食物，绝不能误走干粮分支
    $fmName.value = $fwName.value.trim();
    fmEmoji = fwEmoji;
    fmIconPhoto = fwIconPhoto;
    setFmMeasure(fwMeasure);
    $fmUnitLabel.value = fwMeasure === 'gram' ? '份' : ($fwUnitLabel.value.trim() || '份');
    $fmKcalCount.value = ''; $fmKcal100g.value = ''; fmClearAnalysis();
    if (fwSource === 'analysis') {
      fmSetAnalysis(fwReadAnalysis());
      if (fwMeasure === 'count') $fmGramsPerUnit.value = $fwGpu.value;
    } else if (fwSource === 'equiv') {
      if (fwMeasure === 'gram') $fmEquivGrams100.value = $fwEquivGrams100.value;
      else $fmEquivGrams.value = $fwEquivGrams.value;
    } else {
      if (fwMeasure === 'gram') $fmKcal100g.value = $fwKcal.value;
      else $fmKcalCount.value = $fwKcal.value;
    }
    setFmSource(fwSource);
    $fmUnitEcho.textContent = $fmUnitLabel.value || '份';
    $fmUnitEcho2.textContent = $fmUnitLabel.value || '份';
    if (saveFood()) closeFoodWizard();   // saveFood() validates; only close on success
  }
  $fwMeasure.addEventListener('click', e => {
    const c = e.target.closest('.big-choice'); if (!c) return;
    fwMeasure = c.dataset.val;
    Array.from($fwMeasure.children).forEach(x => x.classList.toggle('active', x === c));
    fwRefresh();
  });
  $fwSource.addEventListener('click', e => {
    const c = e.target.closest('.big-choice'); if (!c) return;
    fwSource = c.dataset.val;
    Array.from($fwSource.children).forEach(x => x.classList.toggle('active', x === c));
    fwRefresh();
  });
  $fwUnitLabel.addEventListener('input', fwRefresh);
  [$fwGpu].concat(Array.from($fwAnalysis.querySelectorAll('.fw-an'))).forEach(el => el.addEventListener('input', fwUpdateEstimate));
  $fwBack.addEventListener('click', () => { if (fwStep > 1) { fwStep--; fwRefresh(); } });
  $fwNext.addEventListener('click', () => {
    if (fwStep === 1) { if (!$fwName.value.trim()) { alert('给食物起个名'); return; } fwStep = 2; fwRefresh(); return; }
    if (fwStep === 2) { fwStep = 3; fwRefresh(); return; }
    finishFoodWizard();
  });
  $fwCancel.addEventListener('click', closeFoodWizard);
  $fw.addEventListener('click', e => { if (e.target === $fw) closeFoodWizard(); });

  // --- Edit the timestamp of an existing record (gated by role) ---
  function promptEditTime(eid) {
    const pet = currentPet(); if (!pet) return;
    const e = (pet.entries || []).find(x => x.id === eid);
    if (!e) return;
    if (!canEditEntryTime(e, pet)) { alert('你只能改自己提交的记录的时间'); return; }
    openTimePicker(e.ts, newTs => {
      if (newTs === e.ts) return;
      applyTimeChange(pet, e, eid, newTs);
    }, '改记录时间');
  }

  function applyTimeChange(pet, e, eid, newTs) {
    const role = myRoleFor(pet);

    // Local-only (non-shared) pet: just change it.
    if (!pet.shared || !pet.serverPetId) {
      e.ts = newTs; persist(); render(); return;
    }

    if (role === 'owner' || role === 'admin') {
      // Optimistic: owner/admin changes take effect immediately.
      e.ts = newTs; persist(); render();
      pushProposeTimeChange(pet, eid, newTs).then(r => {
        if (r && Array.isArray(r.timechanges)) pet.timeChanges = r.timechanges;
        if (r && Array.isArray(r.entries)) pet.entries = mergeServerEntries(pet.entries, r.entries);
        persist(); render();
      }).catch(err => {
        alert('改时间失败：' + (err && err.message || '网络问题')); pullSharedPets().then(render);
      });
    } else {
      // regular: submit a request, do NOT change locally yet.
      pushProposeTimeChange(pet, eid, newTs).then(r => {
        if (r && Array.isArray(r.timechanges)) pet.timeChanges = r.timechanges;
        if (r && Array.isArray(r.entries)) pet.entries = mergeServerEntries(pet.entries, r.entries);
        persist(); render();
        alert('已提交，等待主人或管理员批准后生效。');
      }).catch(err => {
        const msg = (err && err.message === 'not_your_entry') ? '只能改你自己提交的记录' : ('提交失败：' + (err && err.message || '网络问题'));
        alert(msg);
      });
    }
  }

  // ===== Inbox: time-change requests & notices =====
  function fmtDateTime(ts) { return isoDate(ts) + ' ' + fmtTime(ts); }

  // Which timechanges does this role get to see at all?
  function tcVisibleFor(tc, role) {
    if (role === 'owner') return tc.mode === 'veto' || tc.mode === 'approval';
    if (role === 'admin') return (tc.mode === 'veto' && tc.byDevice === DEVICE_ID) || tc.mode === 'approval';
    if (role === 'regular') return tc.byDevice === DEVICE_ID;
    return false;
  }
  // Which ones are "notable" — light the red dot until the user opens the inbox.
  function tcNotableFor(tc, role) {
    if (role === 'owner') {
      if (tc.mode === 'veto' && tc.status === 'active') return true;
      if (tc.mode === 'approval' && tc.status === 'pending') return true;
      if (tc.mode === 'approval' && tc.status === 'approved' && tc.decidedByRole === 'admin') return true;
      return false;
    }
    if (role === 'admin') {
      if (tc.mode === 'approval' && tc.status === 'pending') return true;
      if (tc.mode === 'approval' && tc.status === 'approved' && tc.decidedByRole === 'owner') return true;
      return false;
    }
    if (role === 'regular') {
      return tc.byDevice === DEVICE_ID && (tc.status === 'approved' || tc.status === 'rejected');
    }
    return false;
  }
  function inboxUnseenCount(pet) {
    if (!pet || !pet.shared) return 0;
    const role = myRoleFor(pet);
    const seen = new Set(pet.tcSeen || []);
    const tcN = (pet.timeChanges || []).filter(tc => tcNotableFor(tc, role) && !seen.has(tc.id)).length;
    const newMem = (pet.pendingNewMembers || []).filter(id => (pet.members || []).some(m => m.deviceId === id)).length;
    return tcN + newActivityFor(pet).length + newMem;
  }

  // New records added by OTHER members since this device last opened the inbox.
  // Drives the red dot only — the inbox itself shows the full history below.
  function newActivityFor(pet) {
    if (!pet || !pet.shared) return [];
    const seenAt = pet.activitySeenAt || 0;
    return (pet.entries || [])
      .filter(e => e.author && e.author !== DEVICE_ID && (e.addedAt || 0) > seenAt)
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }
  // Full recent activity timeline — EVERYONE's records (incl. your own, marked 「我」),
  // always visible so the inbox reads as a complete family timeline. The red dot still
  // only lights for others' new records (newActivityFor), so your own don't nag you.
  function recentActivityFor(pet, limit) {
    if (!pet || !pet.shared) return [];
    return (pet.entries || [])
      .filter(e => e.author)
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, limit || 50);
  }
  function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' 天前';
    return isoDate(ts).slice(5);
  }
  // Plain-language description of a record for the activity feed.
  // NB: emoji/unitLabel/foodName are member-supplied free text → always escapeHtml.
  function describeEntry(e, pet) {
    const emoji = escapeHtml(e.emoji || '🍖');
    if (e.kind === 'extra') {
      const cnt = Number(e.count) || 0;
      const amt = e.measure === 'gram'
        ? `${parseFloat(cnt.toFixed(1))} g`
        : `${parseFloat(cnt.toFixed(2))} ${escapeHtml(e.unitLabel || '份')}`;
      return `喂了 ${emoji} ${escapeHtml(e.foodName || '零食')} ${amt}`;
    }
    if (e.kind === 'remain') {
      const unit = e.measure === 'gram' ? 'g' : escapeHtml(e.unitLabel || '份');
      return `记了 ${emoji} ${escapeHtml(e.foodName || '食物')} 还剩 ${fmtAmt(Number(e.reading) || 0)} ${unit}`;
    }
    if (e.kind === 'bodyweight') {
      const unit = pet.bodyWeightUnit || 'kg';
      return `记了体重 ${parseFloat(bwFromKg(Number(e.kg) || 0, unit).toFixed(2))} ${unit}`;
    }
    return `记了一次称重${e.withBowl ? '（含碗）' : ''}`;
  }

  function tcStatusLabel(tc) {
    if (tc.status === 'pending')  return { cls: 'pending',  txt: '等你确认' };
    if (tc.status === 'active')   return { cls: 'active',   txt: '已改好·可撤销' };
    if (tc.status === 'approved') return { cls: 'approved', txt: '已确认' };
    return { cls: 'rejected', txt: '没采纳' };
  }
  function tcEntryBrief(pet, tc) {
    const e = (pet.entries || []).find(x => x.id === tc.entryId);
    if (!e) return '（记录已删除）';
    if (e.kind === 'extra') return `${e.emoji || '🍖'} ${escapeHtml(e.foodName || '零食')}`;
    if (e.kind === 'bodyweight') return '一次体重记录';
    return e.withBowl ? '一次称重（含碗）' : '一次称重';
  }
  // Buttons available to this role for this tc.
  function tcActions(tc, role) {
    const out = [];
    if (role === 'owner') {
      if (tc.mode === 'veto' && tc.status === 'active') out.push('reject');
      else if (tc.mode === 'approval' && tc.status === 'pending') { out.push('approve'); out.push('reject'); }
      else if (tc.mode === 'approval' && tc.status === 'approved' && tc.decidedByRole === 'admin') out.push('reject');
    } else if (role === 'admin') {
      if (tc.mode === 'approval' && tc.status === 'pending') { out.push('approve'); out.push('reject'); }
    }
    return out;
  }

  function renderInbox() {
    const pet = currentPet();
    if (!pet || !pet.shared) { $inboxList.innerHTML = '<div class="empty-row">没有通知</div>'; return; }
    const role = myRoleFor(pet);
    const tcs = (pet.timeChanges || []).filter(tc => tcVisibleFor(tc, role))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const acts = recentActivityFor(pet, 50);    // full history, not just unseen
    const seenAt = pet.activitySeenAt || 0;
    const newMembers = (pet.pendingNewMembers || []).filter(id => (pet.members || []).some(m => m.deviceId === id));

    if (tcs.length === 0 && acts.length === 0 && newMembers.length === 0) { $inboxList.innerHTML = '<div class="empty-row">还没有家人一起记录的动态</div>'; return; }

    let html = '';
    // Section 0: new members who just joined (so a stranger can't slip in unnoticed)
    if (newMembers.length) {
      html += '<div class="inbox-sec-title">✦ 新成员加入</div>';
      html += newMembers.map(id => {
        const noName = hasNoNameFor(pet, id);
        const nameBtn = noName
          ? `<button class="act-alias" data-alias="${id}" title="给 TA 起个备注名">${escapeHtml(memberDisplayName(pet, id))} <span class="aa-add">＋备注</span></button>`
          : `<span class="tc-who">${escapeHtml(memberDisplayName(pet, id))}</span>`;
        return `<div class="tc-item act-item"><div class="tc-head">${nameBtn}<span style="color:var(--color-ink);font-size:0.86rem;">加入了一起记录</span><span class="tc-badge act-new">新</span></div></div>`;
      }).join('');
    }
    // Section 1: time-change requests / notices (actionable)
    if (tcs.length) {
      html += '<div class="inbox-sec-title">⏱ 改了记录时间</div>';
      html += tcs.map(tc => {
        const st = tcStatusLabel(tc);
        const who = memberDisplayName(pet, tc.byDevice);
        const a = tcActions(tc, role);
        const actHtml = a.length ? `<div class="tc-actions">${a.map(x =>
          x === 'approve' ? `<button class="tc-approve" data-tc="${tc.id}" data-dec="approve">确认</button>`
                          : `<button class="tc-reject" data-tc="${tc.id}" data-dec="reject">不采纳</button>`).join('')}</div>` : '';
        let decided = '';
        if (tc.status === 'approved' && tc.decidedBy) decided = `<div class="tc-note">${escapeHtml(memberDisplayName(pet, tc.decidedBy))} 确认了</div>`;
        else if (tc.status === 'rejected' && tc.decidedBy) decided = `<div class="tc-note">${escapeHtml(memberDisplayName(pet, tc.decidedBy))} 没采纳</div>`;
        let noteHtml = '';
        if (tc.note === 'entry_deleted') noteHtml = '<div class="tc-note">这条记录已被删除</div>';
        else if (tc.note === 'overwritten') noteHtml = '<div class="tc-note">这条时间后来又被改过，没有改回去</div>';
        return `<div class="tc-item">
          <div class="tc-head">
            <span class="tc-who">${escapeHtml(who)}</span>
            <span style="color:var(--color-light);font-size:0.8rem;">改了「${tcEntryBrief(pet, tc)}」的时间</span>
            <span class="tc-badge ${st.cls}">${st.txt}</span>
          </div>
          <div class="tc-times">${fmtDateTime(tc.oldTs)} <span class="tc-arrow">→</span> ${fmtDateTime(tc.newTs)}</div>
          ${decided}${noteHtml}${actHtml}
        </div>`;
      }).join('');
    }
    // Section 2: activity by other members — full history (newest first), with a
    // 「新」flag on anything added since you last opened, and an inline 「起备注」
    // shortcut whenever the actor still shows as an anonymous device id.
    if (acts.length) {
      // Only label this section when something sits above it — otherwise the modal
      // title「家人动态」already says it and a repeated header reads redundant.
      if (newMembers.length || tcs.length) html += '<div class="inbox-sec-title">🐾 最近记录</div>';
      html += acts.map(e => {
        const mine = e.author === DEVICE_ID;
        const isNew = !mine && (e.addedAt || 0) > seenAt;   // your own records never show 「新」
        const noName = !mine && hasNoNameFor(pet, e.author);
        const nameBtn = mine
          ? `<span class="tc-who tc-me">我</span>`
          : (noName
            ? `<button class="act-alias" data-alias="${e.author}" title="给 TA 起个备注名">${escapeHtml(memberDisplayName(pet, e.author))} <span class="aa-add">＋备注</span></button>`
            : `<span class="tc-who">${escapeHtml(memberDisplayName(pet, e.author))}</span>`);
        return `<div class="tc-item act-item">
        <div class="tc-head">
          ${nameBtn}
          <span style="color:var(--color-ink);font-size:0.86rem;">${describeEntry(e, pet)}</span>
          ${isNew ? '<span class="tc-badge act-new">新</span>' : ''}
          <span class="tc-badge act-badge">${timeAgo(e.addedAt)}</span>
        </div>
        <div class="tc-note">记录时间 ${fmtDateTime(e.ts)}</div>
      </div>`;
      }).join('');
    }
    $inboxList.innerHTML = html;
    $inboxList.querySelectorAll('.tc-actions button').forEach(btn => {
      btn.addEventListener('click', () => decideTimeChange(btn.dataset.tc, btn.dataset.dec));
    });
    $inboxList.querySelectorAll('.act-alias').forEach(btn => {
      btn.addEventListener('click', () => setContactAlias(btn.dataset.alias, () => renderInbox()));
    });
  }

  function decideTimeChange(tcId, decision) {
    const pet = currentPet();
    if (!pet || !pet.serverPetId) return;
    if (decision === 'reject' && !confirm('不采纳这次时间改动？记录时间会保持原样。')) return;
    pushDecideTimeChange(pet, tcId, decision).then(r => {
      if (r && Array.isArray(r.timechanges)) pet.timeChanges = r.timechanges;
      if (r && Array.isArray(r.entries)) pet.entries = mergeServerEntries(pet.entries, r.entries);
      persist(); render(); renderInbox();
    }).catch(err => {
      // 409 already-decided: refresh to show current truth.
      pullSharedPets().then(() => { render(); renderInbox(); });
      if (err && err.message !== 'already_decided') alert('操作失败：' + (err && err.message || '网络问题'));
    });
  }

  function openInbox() {
    // Show what's new; don't clear until the user closes (so the list stays visible).
    renderInbox();
    $inboxModal.classList.add('open');
  }
  function closeInbox() {
    const pet = currentPet();
    if (pet) {
      // Mark time-changes + activity as seen → clears the dot.
      const role = myRoleFor(pet);
      const seen = new Set(pet.tcSeen || []);
      (pet.timeChanges || []).forEach(tc => { if (tcNotableFor(tc, role)) seen.add(tc.id); });
      pet.tcSeen = [...seen];
      pet.activitySeenAt = Date.now();
      pet.pendingNewMembers = [];   // new-member notices acknowledged
      persist();
    }
    $inboxModal.classList.remove('open');
    updateInboxBadge();
  }
  function updateInboxBadge() {
    const pet = currentPet();
    // Bell is available on any shared pet (so members can see the activity feed).
    $inboxBtn.style.display = (pet && pet.shared && (pet.members || []).length > 1) ? '' : 'none';
    const n = inboxUnseenCount(pet);
    $inboxDot.style.display = n > 0 ? '' : 'none';
    // 让读屏/无障碍也能知道有没有未读，不只靠那个纯色小红点
    const label = n > 0 ? '家人动态（有新消息）' : '家人动态';
    $inboxBtn.setAttribute('aria-label', label);
    $inboxBtn.setAttribute('title', label);
  }
  $inboxBtn.addEventListener('click', openInbox);
  $inboxClose.addEventListener('click', closeInbox);
  $inboxModal.addEventListener('click', e => { if (e.target === $inboxModal) closeInbox(); });

  function commitBowlWeight() {
    const pet = currentPet();
    if (!pet) return;
    const raw = $bowlWeight.value.trim();
    const unit = $bowlWeightUnit.value || 'g';
    let newVal;
    if (raw === '') {
      newVal = null;
    } else {
      const num = parseFloat(raw);
      if (!Number.isFinite(num) || num < 0) {
        // Invalid; revert display
        if (pet.bowlWeight == null) $bowlWeight.value = '';
        else $bowlWeight.value = parseFloat(fromGrams(pet.bowlWeight, unit).toFixed(3));
        checkFormWarn();
        return;
      }
      newVal = toGrams(num, unit);
    }
    const changed = newVal !== pet.bowlWeight;
    // Before mutating pet.bowlWeight, freeze the current value onto any
    // un-snapshotted entries so their food weights stay correct.
    if (changed) crystallizeBowlSnapshots(pet);
    pet.bowlWeight = newVal;
    pet.bowlUnit = unit;
    if (changed) {
      persist();
      render();
      schedulePushMeta(pet);
    } else {
      checkFormWarn();
    }
  }
  $bowlWeight.addEventListener('blur', commitBowlWeight);
  $bowlWeight.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $bowlWeight.blur(); }
  });
  $bowlWeightUnit.addEventListener('change', () => {
    const pet = currentPet();
    if (!pet) return;
    const oldUnit = pet.bowlUnit || 'g';
    const newUnit = $bowlWeightUnit.value;
    // Convert displayed value (if any) from old unit → new unit, keep underlying grams identical
    const raw = $bowlWeight.value.trim();
    if (raw !== '') {
      const num = parseFloat(raw);
      if (Number.isFinite(num) && num >= 0) {
        const grams = toGrams(num, oldUnit);
        $bowlWeight.value = parseFloat(fromGrams(grams, newUnit).toFixed(3));
      }
    }
    pet.bowlUnit = newUnit;
    persist();
  });
  $unitPick.addEventListener('change', () => {
    const pet = currentPet();
    if (pet) {
      pet.preferredUnit = $unitPick.value;
      persist();
    }
    $reading.placeholder = $unitPick.value === 'g' ? '粮食称重' : `粮食称重（${$unitPick.value}）`;
  });

  $mmKeep.addEventListener('click', () => {
    const r = parseFloat($mmModal.dataset.reading);
    const wb = $mmModal.dataset.withBowl === '1';
    $mmModal.classList.remove('open');
    if (Number.isFinite(r)) saveEntry(r, wb);
  });
  $mmSwap.addEventListener('click', () => {
    const r = parseFloat($mmModal.dataset.reading);
    const wb = $mmModal.dataset.withBowl === '1';
    $mmModal.classList.remove('open');
    if (Number.isFinite(r)) {
      setMode(!wb);
      saveEntry(r, !wb);
    }
  });
  $mmModal.addEventListener('click', e => { if (e.target === $mmModal) $mmModal.classList.remove('open'); });

  // ===== 趋势图：导出图片 + 全屏横向看图 =====
  const $chartDownload = document.getElementById('chart-download');
  const $chartFullscreen = document.getElementById('chart-fullscreen');
  const $trendFs = document.getElementById('trend-fs');
  const $trendChartFs = document.getElementById('trend-chart-fs');
  const $tfsTitle = document.getElementById('tfs-title');
  const $tfsTabs = document.getElementById('tfs-tabs');
  const $tfsStats = document.getElementById('tfs-stats');
  const $tfsClose = document.getElementById('tfs-close');
  const $tfsDownload = document.getElementById('tfs-download');
  const $tfsDaynav = document.getElementById('tfs-daynav');
  const $tfsPrev = document.getElementById('tfs-prev');
  const $tfsDate = document.getElementById('tfs-date');
  const $tfsNext = document.getElementById('tfs-next');
  const $tfsToday = document.getElementById('tfs-today');
  const $tfsCustom = document.getElementById('tfs-custom');
  const $tfsCustomStart = document.getElementById('tfs-custom-start');
  const $tfsCustomEnd = document.getElementById('tfs-custom-end');

  // 统一的区间切换入口（内嵌 tab 与全屏 tab 都调它）
  function setTrendPeriod(p) {
    state.period = p;
    state.intradayIso = null;   // 切换区间时今日视图回到今天，避免停在某个旧日期上
    if (p === 'custom' && (!state.customStart || !state.customEnd)) {
      const todayIso = todayBucketIso();
      const back = lastNDays(30, todayIso);
      state.customStart = state.customStart || back[back.length - 1];
      state.customEnd = state.customEnd || todayIso;
    }
    persist();
    render();
  }
  // 当前视图的「区间名 + 日期范围」——用于导出标题与全屏标题
  function trendExportInfo() {
    const activeBtn = $trendTabs.querySelector('button.active');
    const label = (activeBtn && activeBtn.textContent.trim()) || '趋势';
    const fmtCn = iso => { const q = iso.split('-'); return q[0] + '年' + parseInt(q[1], 10) + '月' + parseInt(q[2], 10) + '日'; };
    let range = '';
    if (state.period === 'today') {
      range = fmtCn(state.intradayIso || todayBucketIso());
    } else if (state.period === 'custom') {
      let s = state.customStart, e = state.customEnd;
      if (s && e) { if (s > e) { const t = s; s = e; e = t; } range = fmtCn(s) + ' — ' + fmtCn(e); }
    } else {
      const n = parseInt(state.period, 10) || 7;
      const days = lastNDays(n, todayBucketIso());
      range = fmtCn(days[days.length - 1]) + ' — ' + fmtCn(days[0]);
    }
    return { label, range };
  }
  function petInfoLine(pet) {
    const parts = [];
    const sp = (FOOD_REC[pet.species] && FOOD_REC[pet.species].label) || '';
    const breedOrSp = (pet.breed && pet.breed.trim()) || sp;
    if (breedOrSp) parts.push(breedOrSp);
    if (pet.ageYears > 0) parts.push(pet.ageYears < 1 ? Math.round(pet.ageYears * 12) + '月龄' : (pet.ageYears % 1 === 0 ? pet.ageYears : pet.ageYears.toFixed(1)) + '岁');
    if (pet.bodyWeight > 0) { const u = pet.bodyWeightUnit || 'kg'; parts.push(parseFloat(bwFromKg(pet.bodyWeight, u).toFixed(2)) + ' ' + u); }
    const tr = targetRange(pet);
    if (tr) { const M = convM(pet), U = convUnit(pet); parts.push(tr.min === tr.max ? '目标 ' + fmtG(tr.min * M) + ' ' + U + '/天' : '目标 ' + fmtG(tr.min * M) + '–' + fmtG(tr.max * M) + ' ' + U + '/天'); }
    return parts.join('   ·   ');
  }
  // 把当前趋势 SVG 栅格化成一张图（解析掉 CSS 变量，按目标像素渲染保证清晰）
  function svgToPng(svgEl, outW, outH, done) {
    const cs = getComputedStyle(svgEl);
    let s = new XMLSerializer().serializeToString(svgEl);
    s = s.replace(/var\((--[\w-]+)\)/g, (m, name) => (cs.getPropertyValue(name).trim() || '#000000'));
    const font = "-apple-system,'PingFang SC','Noto Sans CJK SC','Noto Serif SC',sans-serif";
    s = s.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg" width="' + outW + '" height="' + outH + '" style="font-family:' + font + '"');
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function loadImage(src, done) {
    if (!src) { done(null); return; }
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // 把趋势图导出成一张带宠物信息 + 区间日期 + 站点署名的图片卡片
  async function downloadTrendImage() {
    const pet = currentPet();
    if (!pet || !$trendChart || !$trendChart.querySelector('*')) { alert('这个图暂时没有内容可下载'); return; }
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
    const S = 2, W = 760, PAD = 32;
    const chartW = W - PAD * 2;
    const chartH = Math.round(chartW * 240 / 600);
    svgToPng($trendChart, Math.round(chartW * S), Math.round(chartH * S), (chartImg) => {
      if (!chartImg) { alert('导出失败，请重试'); return; }
      loadImage(pet.avatar || null, (avatarImg) => {
        const root = document.documentElement;
        const gv = n => getComputedStyle(root).getPropertyValue(n).trim();
        const C = { bg: gv('--color-bg') || '#faf8f4', warm: gv('--color-bg-warm') || '#f2eee6', ink: gv('--color-ink') || '#2b2824', muted: gv('--color-muted') || '#77716a', accent: gv('--color-accent') || '#3a4a63', border: gv('--color-border') || '#e6e0d6' };
        const font = getComputedStyle(document.body).fontFamily || "'Noto Serif SC',serif";
        const info = trendExportInfo();
        const infoLine = petInfoLine(pet);
        const stats = (($chartMeta.querySelector('span:last-child') || {}).textContent || '').trim();
        const now = new Date();
        const genStamp = '导出于 ' + now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
        const avSize = 50;
        let H = PAD + avSize + 20 + 34;
        if (info.range) H += 28;
        H += 16 + chartH + 14;
        if (stats) H += 22;
        H += 18 + 20 + PAD;
        const cv = document.createElement('canvas');
        cv.width = Math.round(W * S); cv.height = Math.round(H * S);
        const ctx = cv.getContext('2d');
        ctx.scale(S, S);
        ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = C.accent; ctx.fillRect(0, 0, W, 5);
        let y = PAD;
        if (avatarImg) {
          ctx.save(); roundRectPath(ctx, PAD, y, avSize, avSize, 12); ctx.clip();
          ctx.drawImage(avatarImg, PAD, y, avSize, avSize); ctx.restore();
          ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRectPath(ctx, PAD, y, avSize, avSize, 12); ctx.stroke();
        } else {
          roundRectPath(ctx, PAD, y, avSize, avSize, 12); ctx.fillStyle = C.warm; ctx.fill();
          ctx.font = Math.round(avSize * 0.6) + 'px ' + font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = C.ink; ctx.fillText(pet.emoji || '🐾', PAD + avSize / 2, y + avSize / 2 + 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
        ctx.textBaseline = 'middle';
        ctx.font = '600 30px ' + font; ctx.fillStyle = C.ink;
        ctx.fillText(pet.name || '宝贝', PAD + avSize + 16, y + (infoLine ? avSize / 2 - 9 : avSize / 2));
        if (infoLine) { ctx.font = '15px ' + font; ctx.fillStyle = C.muted; ctx.fillText(infoLine, PAD + avSize + 16, y + avSize / 2 + 15); }
        ctx.textBaseline = 'alphabetic';
        y += avSize + 20;
        ctx.font = '600 24px ' + font; ctx.fillStyle = C.ink; ctx.fillText(info.label, PAD, y + 22); y += 34;
        if (info.range) { ctx.font = '16px ' + font; ctx.fillStyle = C.accent; ctx.fillText(info.range, PAD, y + 18); y += 28; }
        y += 16;
        roundRectPath(ctx, PAD - 8, y - 8, chartW + 16, chartH + 16, 14); ctx.fillStyle = C.warm; ctx.fill();
        ctx.drawImage(chartImg, PAD, y, chartW, chartH);
        y += chartH + 14;
        if (stats) { ctx.font = '15px ' + font; ctx.fillStyle = C.ink; ctx.fillText(stats, PAD, y + 16); y += 22; }
        y += 18;
        ctx.font = '12.5px ' + font; ctx.fillStyle = C.muted;
        ctx.fillText('🐾 宠物中心 · ruizhou03.com', PAD, y + 12);
        ctx.textAlign = 'right'; ctx.fillText(genStamp, W - PAD, y + 12); ctx.textAlign = 'left';
        cv.toBlob((blob) => {
          if (!blob) { alert('导出失败'); return; }
          const safe = str => (str || '').replace(/[\\/:*?"<>|]/g, '').replace(/年|月/g, '.').replace(/日/g, '').replace(/\s*—\s*/g, '_至_').replace(/\s+/g, '');
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = (pet.name || '宠物') + '-' + safe(info.label) + (info.range ? '-' + safe(info.range) : '') + '.png';
          document.body.appendChild(a); a.click();
          setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        }, 'image/png');
      });
    });
  }
  // ---- 全屏横向看图（手机竖屏时旋转成横屏，内含区间/日期切换）----
  let trendFsOpen = false;
  function openTrendFs() {
    if (!$trendFs) return;
    trendFsOpen = true;
    $trendFs.hidden = false;
    document.body.classList.add('trend-fs-open');
    syncTrendFs();
  }
  function closeTrendFs() {
    trendFsOpen = false;
    if ($trendFs) $trendFs.hidden = true;
    document.body.classList.remove('trend-fs-open');
  }
  // 把内嵌趋势图的最新一帧镜像到全屏面板（复用同一套渲染，避免两套绘制逻辑）
  function syncTrendFs() {
    if (!trendFsOpen || !$trendChartFs) return;
    $trendChartFs.innerHTML = $trendChart.innerHTML;
    const pet = currentPet();
    const info = trendExportInfo();
    if ($tfsTitle) $tfsTitle.textContent = (pet && pet.name ? pet.name + ' · ' : '') + info.label + (info.range ? ' · ' + info.range : '');
    if ($tfsStats) $tfsStats.textContent = (($chartMeta.querySelector('span:last-child') || {}).textContent || '').trim();
    if ($tfsTabs) $tfsTabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.p === state.period));
    if ($tfsDaynav) $tfsDaynav.style.display = state.period === 'today' ? '' : 'none';
    if ($tfsCustom) $tfsCustom.style.display = state.period === 'custom' ? '' : 'none';
    if (state.period === 'today') syncTfsDayNav();
    if (state.period === 'custom') { if ($tfsCustomStart) $tfsCustomStart.value = state.customStart || ''; if ($tfsCustomEnd) $tfsCustomEnd.value = state.customEnd || ''; }
  }
  function syncTfsDayNav() {
    if (!$tfsDate) return;
    const today = todayBucketIso();
    const view = state.intradayIso || today;
    $tfsDate.value = view; $tfsDate.max = today;
    const isToday = view >= today;
    if ($tfsNext) $tfsNext.disabled = isToday;
    if ($tfsToday) $tfsToday.style.display = isToday ? 'none' : '';
  }
  if ($chartDownload) $chartDownload.addEventListener('click', downloadTrendImage);
  if ($chartFullscreen) $chartFullscreen.addEventListener('click', openTrendFs);
  if ($tfsClose) $tfsClose.addEventListener('click', closeTrendFs);
  if ($tfsDownload) $tfsDownload.addEventListener('click', downloadTrendImage);
  if ($tfsTabs) $tfsTabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => setTrendPeriod(b.dataset.p)));
  if ($tfsToday) $tfsToday.addEventListener('click', () => { state.intradayIso = null; render(); });
  if ($tfsDate) $tfsDate.addEventListener('change', () => { const v = $tfsDate.value; if (!v) return; const today = todayBucketIso(); state.intradayIso = (v >= today) ? null : v; render(); });
  if ($tfsCustomStart) $tfsCustomStart.addEventListener('change', () => { state.customStart = $tfsCustomStart.value || null; persist(); render(); });
  if ($tfsCustomEnd) $tfsCustomEnd.addEventListener('change', () => { state.customEnd = $tfsCustomEnd.value || null; persist(); render(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && trendFsOpen) closeTrendFs(); });

  // ===== Trend tabs =====
  $trendTabs.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => setTrendPeriod(b.dataset.p));
  });
  $customStart.addEventListener('change', () => { state.customStart = $customStart.value || null; persist(); render(); });
  $customEnd.addEventListener('change', () => { state.customEnd = $customEnd.value || null; persist(); render(); });

  // ===== 今日时段 · 逐日翻看 =====
  // 让底部趋势图的「今日时段」不再只锁定今天：◀/▶ 翻前后一天、可点日期跳，▶ 到今天为止。
  // intradayIso 只在内存里（不持久化），刷新即回到今天的实时视图。
  function syncDayNav() {
    if (!$dnDate) return;
    const today = todayBucketIso();
    const view = state.intradayIso || today;
    $dnDate.value = view;
    $dnDate.max = today;                       // 原生日历也挡住未来
    const isToday = view >= today;
    if ($dnNext) $dnNext.disabled = isToday;
    if ($dnToday) $dnToday.style.display = isToday ? 'none' : '';
  }
  function stepIntraday(deltaDays) {
    const today = todayBucketIso();
    const d = parseIsoDate(state.intradayIso || today);
    d.setDate(d.getDate() + deltaDays);
    let iso = isoDate(d);
    if (iso > today) iso = today;              // 不能翻到未来
    state.intradayIso = (iso >= today) ? null : iso;
    render();
  }
  if ($dnPrev) $dnPrev.addEventListener('click', () => stepIntraday(-1));
  if ($dnNext) $dnNext.addEventListener('click', () => stepIntraday(1));
  if ($tfsPrev) $tfsPrev.addEventListener('click', () => stepIntraday(-1));   // 全屏里的逐日翻看复用同一逻辑
  if ($tfsNext) $tfsNext.addEventListener('click', () => stepIntraday(1));
  if ($dnToday) $dnToday.addEventListener('click', () => { state.intradayIso = null; render(); });
  if ($dnDate) $dnDate.addEventListener('change', () => {
    const v = $dnDate.value; if (!v) return;
    const today = todayBucketIso();
    state.intradayIso = (v >= today) ? null : v;
    render();
  });
  setupTrendInteraction();

  if ($toggleHistory) $toggleHistory.addEventListener('click', () => {
    state.historyOpen = !state.historyOpen;
    if ($entriesHistory) $entriesHistory.style.display = state.historyOpen ? '' : 'none';
    $toggleHistory.textContent = state.historyOpen ? '收起更早 ▴' : '展开更早的记录 ▾';
  });
  // 记录「按日翻」接线
  if ($recPrev) $recPrev.addEventListener('click', () => shiftRecordsDay(-1));
  if ($recNext) $recNext.addEventListener('click', () => shiftRecordsDay(1));
  if ($recDate) $recDate.addEventListener('change', () => {
    const v = $recDate.value, todayIso = todayBucketIso();
    if (!v || v > todayIso) { $recDate.value = recordsDay || todayIso; return; }
    recordsDay = (v === todayIso) ? null : v;
    renderRecords(currentPet());
  });
  if ($recCur) $recCur.addEventListener('click', () => {
    try { $recDate.showPicker(); } catch (_) { try { $recDate.focus(); $recDate.click(); } catch (__) {} }
  });
  // 体重历史记录分页
  if ($weightPagePrev) $weightPagePrev.addEventListener('click', () => { if (weightPage > 0) gotoWeightPage(weightPage - 1); });
  if ($weightPageNext) $weightPageNext.addEventListener('click', () => gotoWeightPage(weightPage + 1));
  if ($weightPageSelect) $weightPageSelect.addEventListener('change', () => gotoWeightPage(parseInt($weightPageSelect.value, 10) || 0));

  // ===== 弹窗无障碍：焦点归还 + Tab 焦点陷阱（集中式，覆盖所有 .modal-backdrop）=====
  (function initModalA11y() {
    const openerStack = [];
    const isOpen = bk => bk.classList.contains('open');
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    function focusablesIn(modal) {
      return Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
    }
    function topOpenModal() {
      const open = Array.from(document.querySelectorAll('.modal-backdrop.open'));
      return open.length ? open[open.length - 1].querySelector('.modal') : null;
    }
    document.querySelectorAll('.modal-backdrop').forEach(bk => {
      let was = isOpen(bk);
      new MutationObserver(() => {
        const now = isOpen(bk);
        if (now && !was) {
          openerStack.push(document.activeElement);
          const m = bk.querySelector('.modal');
          // 若弹窗自身没抢焦点，兜底把焦点送进去，读屏才会宣告「进入对话框」
          setTimeout(() => {
            if (!isOpen(bk) || !m || m.contains(document.activeElement)) return;
            const f = focusablesIn(m);
            if (f.length) { try { f[0].focus(); } catch (_) {} }
          }, 60);
        } else if (!now && was) {
          const opener = openerStack.pop();
          if (opener && typeof opener.focus === 'function' && document.contains(opener)) { try { opener.focus(); } catch (_) {} }
        }
        was = now;
      }).observe(bk, { attributes: true, attributeFilter: ['class'] });
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const m = topOpenModal();
      if (!m) return;
      const items = focusablesIn(m);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !m.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last || !m.contains(active)) { e.preventDefault(); first.focus(); }
      }
    });
  })();

  // 初始化出错的友善兜底：任何脏数据/异常都不该让整页变成点不动的死页
  function showFatalError(err) {
    const wrap = document.querySelector('.pf-wrap');
    if (!wrap) { alert('宠物中心加载出错，请稍后重试。'); return; }
    let raw = '';
    try { raw = localStorage.getItem(STORE_KEY) || ''; } catch (_) {}
    const box = document.createElement('div');
    box.style.cssText = 'max-width:520px;margin:3rem auto;padding:1.6rem;border:1px solid var(--color-border);border-radius:var(--pet-r-card,14px);background:var(--color-bg-warm);text-align:center;';
    box.innerHTML =
      '<div style="font-size:2.2rem;margin-bottom:0.5rem;">🐾</div>' +
      '<h2 style="margin:0 0 0.5rem;font-size:1.2rem;color:var(--color-ink);">宠物中心没能正常打开</h2>' +
      '<p style="color:var(--color-muted);font-size:0.9rem;line-height:1.7;margin:0 0 1.2rem;">本机保存的数据可能损坏了。可以先把它导出留底，再清空重来；导出的文件之后能在「我的档案 → 恢复」里导入找回。</p>' +
      '<div style="display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;">' +
      '<button type="button" id="pf-fatal-export" style="font:inherit;padding:0.5rem 1.1rem;border-radius:999px;border:1px solid var(--color-accent);background:var(--color-accent);color:#fff;cursor:pointer;">导出留底</button>' +
      '<button type="button" id="pf-fatal-reset" style="font:inherit;padding:0.5rem 1.1rem;border-radius:999px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--pet-danger,#b07c75);cursor:pointer;">清空并重来</button>' +
      '</div>';
    wrap.innerHTML = '';
    wrap.appendChild(box);
    const exp = document.getElementById('pf-fatal-export');
    if (exp) exp.addEventListener('click', () => {
      try {
        const blob = new Blob([raw || '{}'], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'pet-backup-broken.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (_) { alert('导出失败，可手动在浏览器里备份后再清空。'); }
    });
    const rst = document.getElementById('pf-fatal-reset');
    if (rst) rst.addEventListener('click', () => {
      if (!confirm('确定清空本机宠物数据并重来吗？（清空前建议先导出留底）')) return;
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      location.reload();
    });
  }

  // ===== Init =====
  try {
    load();
    // 打开时若链接带 #food/#weight/#meow，就停在那个板块（覆盖上次记住的）
    const hashBoard = boardFromHash();
    if (hashBoard) state.board = hashBoard;
    render();
    // 邀请链接 ?join=CODE：打开就自动填好宠物码 + 弹出「加入」框（disc-8）
    try {
      const joinCode = new URLSearchParams(location.search).get('join');
      if (joinCode) { openJoinModal(); $joinCode.value = joinCode.trim().toUpperCase().slice(0, 6); }
    } catch (_) {}
  } catch (err) {
    console.error('宠物中心初始化失败', err);
    showFatalError(err);
  }
  // Pull profile + shared pet data (best-effort, parallel)
  loadProfile().catch(() => {});
  flushDirtyMeta().then(() => pullSharedPets()).then(() => render()).catch(() => {});

  // No realtime backend: refresh shared data when the tab regains focus and on
  // a slow 60s poll, so time-change requests/notices show up without a reload.
  let lastPull = Date.now();
  function refreshShared() {
    if (!state.pets.some(p => p.shared && p.serverPetId)) return;
    lastPull = Date.now();
    pullSharedPets().then(() => render()).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastPull > 20000) refreshShared();
  });
  setInterval(() => { if (!document.hidden) refreshShared(); }, 60000);

  // ===== 账号云同步：宠物数据跟账号跨设备同步 =====
  // 身份 tool.pet-food.deviceId 已由 auth.js 在登录时切成 accountId；CloudSync 负责把
  // 宠物状态 tool.pet-food.v1 随账号搬运（/api/me kv）。CloudSync 拉回时对 localStorage 是
  // “整份覆盖”，这里在它拉完后改成“按宠物 id 取并集”地并入内存——既让远端的本地宠物（如
  // 旺仔）出现，又不会让某台设备较空的快照把本地已有宠物冲掉（护住数据，绝不丢宠物）。
  function mergeEntries(a, b) {
    const seen = new Set((a || []).map(e => e && e.id).filter(Boolean));
    return (a || []).concat((b || []).filter(e => e && e.id && !seen.has(e.id)));
  }
  // 按 id 取并集，本地优先（本地有的都留、另一方多出来的补进来）。用于食物库/类别这种
  // 「本设备正在编辑、又不是 append-only」的数组——不能像条目那样简单以「更全者为准」。
  function unionById(localArr, remoteArr) {
    const out = [], seen = new Set();
    (Array.isArray(localArr) ? localArr : []).forEach(x => { if (x && x.id != null && !seen.has(x.id)) { out.push(x); seen.add(x.id); } });
    (Array.isArray(remoteArr) ? remoteArr : []).forEach(x => { if (x && x.id != null && !seen.has(x.id)) { out.push(x); seen.add(x.id); } });
    return out;
  }
  function mergePetPair(local, remote) {
    // 条目更全的一方做底，另一方补齐它缺的条目；其余字段以条目更全者为准。
    const base  = (remote.entries || []).length >= (local.entries || []).length ? remote : local;
    const other = base === remote ? local : remote;
    const merged = Object.assign({}, base, { entries: mergeEntries(base.entries, other.entries) });
    // ⚠️ 食物库 / 类别是本设备正在编辑的字段：绝不能被一份可能陈旧的云端快照按「条目更全者」
    // 整份盖掉（否则刚建的类别、刚给食物归的类，会在一次后台 CloudSync 拉取里凭空消失）。
    // 按 id 取并集、本地优先——护住本地刚做的改动，同时把另一台设备新增的食物/类别也收进来。
    merged.foodLibrary = unionById(local.foodLibrary, remote.foodLibrary);
    merged.foodGroups = unionById(local.foodGroups, remote.foodGroups);
    return merged;
  }
  function mergeInRemotePets() {
    let incoming = null;
    try { incoming = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { return; }
    if (!incoming) return;
    // 本地备注（contactNicknames）是设备私有字段，却和宠物状态同存于被 CloudSync“整份覆盖”的 blob
    // 里——拉取会用云端快照把本地备注一起盖掉。这里把本地备注并回来（本地为准），护住它不随 pull 丢。
    const incomingContacts = (incoming.contactNicknames && typeof incoming.contactNicknames === 'object')
      ? incoming.contactNicknames : {};
    const mergedContacts = Object.assign({}, incomingContacts, state.contactNicknames || {});
    const contactsNeedWrite = JSON.stringify(mergedContacts) !== JSON.stringify(incomingContacts);
    state.contactNicknames = mergedContacts;
    if (!Array.isArray(incoming.pets)) { if (contactsNeedWrite) { persist(); render(); } return; }
    const byId = new Map();
    state.pets.forEach(p => { if (p && p.id) byId.set(p.id, p); });   // 本地（内存）现有的先占位
    incoming.pets.forEach(rp => {                                     // 远端按 id 合并 / 补充
      if (!rp || !rp.id) return;
      const cur = byId.get(rp.id);
      if (cur) {
        // 共享宠物的记录/元数据/成员/发件箱/令牌以 pet-food 后端为准（pullSharedPets 会持续刷新）。
        // 账号云同步是另一套「整份覆盖」，绝不能拿一份陈旧快照把共享宠物的这些字段冲掉——保留本地。
        byId.set(rp.id, (cur.shared || rp.shared) ? cur : mergePetPair(cur, rp));
      } else {
        byId.set(rp.id, rp);                                          // 只在另一台设备上的宠物 → 收进来（共享的随后由 pull 刷新）
      }
    });
    const merged = Array.from(byId.values());
    const unchanged = merged.length === state.pets.length &&
      merged.every((p, i) => state.pets[i] && state.pets[i].id === p.id &&
                             (state.pets[i].entries || []).length === (p.entries || []).length);
    if (unchanged) {                                                  // 没有新宠物 / 新条目
      if (contactsNeedWrite) { persist(); render(); }                 // 但本地备注要写回，别被 pull 盖掉
      return;
    }
    state.pets = merged;
    if (!state.currentId || !state.pets.some(p => p.id === state.currentId)) {
      state.currentId = (state.pets[0] && state.pets[0].id) || null;
    }
    migratePets();
    persist();   // 写回并集——下次 CloudSync push 上传的就是并集，顺带把云端补全
    render();
  }
  // CloudSync 同标签页拉取（登录 / 换设备首屏）→ 合并；其它标签页改动 → storage 兜底
  window.addEventListener('cloudsync:pulled', mergeInRemotePets);
  window.addEventListener('storage', (e) => { if (e && e.key === STORE_KEY) mergeInRemotePets(); });
})();
