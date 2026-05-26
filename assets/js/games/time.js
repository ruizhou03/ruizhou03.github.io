(function() {
  'use strict';

  // ============== Tab 切换 ==============
  const tabBtns = document.querySelectorAll('.tab-bar button');
  const panels = document.querySelectorAll('.panel');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      panels.forEach(p => {
        p.style.display = p.dataset.panel === target ? '' : 'none';
      });
    });
  });

  // ============== 城市库（~120 项） ==============
  const CITIES = [
    // 中国 / 港澳台
    { zh: '北京', en: 'Beijing', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '上海', en: 'Shanghai', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '广州', en: 'Guangzhou', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '深圳', en: 'Shenzhen', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '成都', en: 'Chengdu', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '西安', en: 'Xian', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '武汉', en: 'Wuhan', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '南京', en: 'Nanjing', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '杭州', en: 'Hangzhou', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '重庆', en: 'Chongqing', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '哈尔滨', en: 'Harbin', tz: 'Asia/Shanghai', country: '中国' },
    { zh: '乌鲁木齐', en: 'Urumqi', tz: 'Asia/Urumqi', country: '中国' },
    { zh: '香港', en: 'Hong Kong', tz: 'Asia/Hong_Kong', country: '中国' },
    { zh: '澳门', en: 'Macau', tz: 'Asia/Macau', country: '中国' },
    { zh: '台北', en: 'Taipei', tz: 'Asia/Taipei', country: '中国' },
    // 东亚
    { zh: '东京', en: 'Tokyo', tz: 'Asia/Tokyo', country: '日本' },
    { zh: '大阪', en: 'Osaka', tz: 'Asia/Tokyo', country: '日本' },
    { zh: '京都', en: 'Kyoto', tz: 'Asia/Tokyo', country: '日本' },
    { zh: '札幌', en: 'Sapporo', tz: 'Asia/Tokyo', country: '日本' },
    { zh: '首尔', en: 'Seoul', tz: 'Asia/Seoul', country: '韩国' },
    { zh: '釜山', en: 'Busan', tz: 'Asia/Seoul', country: '韩国' },
    { zh: '平壤', en: 'Pyongyang', tz: 'Asia/Pyongyang', country: '朝鲜' },
    { zh: '乌兰巴托', en: 'Ulaanbaatar', tz: 'Asia/Ulaanbaatar', country: '蒙古' },
    // 东南亚
    { zh: '新加坡', en: 'Singapore', tz: 'Asia/Singapore', country: '新加坡' },
    { zh: '吉隆坡', en: 'Kuala Lumpur', tz: 'Asia/Kuala_Lumpur', country: '马来西亚' },
    { zh: '曼谷', en: 'Bangkok', tz: 'Asia/Bangkok', country: '泰国' },
    { zh: '雅加达', en: 'Jakarta', tz: 'Asia/Jakarta', country: '印度尼西亚' },
    { zh: '马尼拉', en: 'Manila', tz: 'Asia/Manila', country: '菲律宾' },
    { zh: '河内', en: 'Hanoi', tz: 'Asia/Ho_Chi_Minh', country: '越南' },
    { zh: '胡志明市', en: 'Ho Chi Minh City', tz: 'Asia/Ho_Chi_Minh', country: '越南' },
    { zh: '仰光', en: 'Yangon', tz: 'Asia/Yangon', country: '缅甸' },
    { zh: '金边', en: 'Phnom Penh', tz: 'Asia/Phnom_Penh', country: '柬埔寨' },
    // 南亚 / 中亚
    { zh: '新德里', en: 'New Delhi', tz: 'Asia/Kolkata', country: '印度' },
    { zh: '孟买', en: 'Mumbai', tz: 'Asia/Kolkata', country: '印度' },
    { zh: '加尔各答', en: 'Kolkata', tz: 'Asia/Kolkata', country: '印度' },
    { zh: '班加罗尔', en: 'Bengaluru', tz: 'Asia/Kolkata', country: '印度' },
    { zh: '卡拉奇', en: 'Karachi', tz: 'Asia/Karachi', country: '巴基斯坦' },
    { zh: '伊斯兰堡', en: 'Islamabad', tz: 'Asia/Karachi', country: '巴基斯坦' },
    { zh: '达卡', en: 'Dhaka', tz: 'Asia/Dhaka', country: '孟加拉国' },
    { zh: '科伦坡', en: 'Colombo', tz: 'Asia/Colombo', country: '斯里兰卡' },
    { zh: '加德满都', en: 'Kathmandu', tz: 'Asia/Kathmandu', country: '尼泊尔' },
    { zh: '阿拉木图', en: 'Almaty', tz: 'Asia/Almaty', country: '哈萨克斯坦' },
    { zh: '塔什干', en: 'Tashkent', tz: 'Asia/Tashkent', country: '乌兹别克斯坦' },
    // 中东
    { zh: '迪拜', en: 'Dubai', tz: 'Asia/Dubai', country: '阿联酋' },
    { zh: '阿布扎比', en: 'Abu Dhabi', tz: 'Asia/Dubai', country: '阿联酋' },
    { zh: '利雅得', en: 'Riyadh', tz: 'Asia/Riyadh', country: '沙特阿拉伯' },
    { zh: '多哈', en: 'Doha', tz: 'Asia/Qatar', country: '卡塔尔' },
    { zh: '德黑兰', en: 'Tehran', tz: 'Asia/Tehran', country: '伊朗' },
    { zh: '巴格达', en: 'Baghdad', tz: 'Asia/Baghdad', country: '伊拉克' },
    { zh: '耶路撒冷', en: 'Jerusalem', tz: 'Asia/Jerusalem', country: '以色列' },
    { zh: '伊斯坦布尔', en: 'Istanbul', tz: 'Europe/Istanbul', country: '土耳其' },
    // 俄罗斯
    { zh: '莫斯科', en: 'Moscow', tz: 'Europe/Moscow', country: '俄罗斯' },
    { zh: '圣彼得堡', en: 'Saint Petersburg', tz: 'Europe/Moscow', country: '俄罗斯' },
    { zh: '叶卡捷琳堡', en: 'Yekaterinburg', tz: 'Asia/Yekaterinburg', country: '俄罗斯' },
    { zh: '新西伯利亚', en: 'Novosibirsk', tz: 'Asia/Novosibirsk', country: '俄罗斯' },
    { zh: '海参崴', en: 'Vladivostok', tz: 'Asia/Vladivostok', country: '俄罗斯' },
    // 欧洲
    { zh: '伦敦', en: 'London', tz: 'Europe/London', country: '英国' },
    { zh: '爱丁堡', en: 'Edinburgh', tz: 'Europe/London', country: '英国' },
    { zh: '都柏林', en: 'Dublin', tz: 'Europe/Dublin', country: '爱尔兰' },
    { zh: '巴黎', en: 'Paris', tz: 'Europe/Paris', country: '法国' },
    { zh: '柏林', en: 'Berlin', tz: 'Europe/Berlin', country: '德国' },
    { zh: '慕尼黑', en: 'Munich', tz: 'Europe/Berlin', country: '德国' },
    { zh: '法兰克福', en: 'Frankfurt', tz: 'Europe/Berlin', country: '德国' },
    { zh: '罗马', en: 'Rome', tz: 'Europe/Rome', country: '意大利' },
    { zh: '米兰', en: 'Milan', tz: 'Europe/Rome', country: '意大利' },
    { zh: '马德里', en: 'Madrid', tz: 'Europe/Madrid', country: '西班牙' },
    { zh: '巴塞罗那', en: 'Barcelona', tz: 'Europe/Madrid', country: '西班牙' },
    { zh: '里斯本', en: 'Lisbon', tz: 'Europe/Lisbon', country: '葡萄牙' },
    { zh: '阿姆斯特丹', en: 'Amsterdam', tz: 'Europe/Amsterdam', country: '荷兰' },
    { zh: '布鲁塞尔', en: 'Brussels', tz: 'Europe/Brussels', country: '比利时' },
    { zh: '维也纳', en: 'Vienna', tz: 'Europe/Vienna', country: '奥地利' },
    { zh: '苏黎世', en: 'Zurich', tz: 'Europe/Zurich', country: '瑞士' },
    { zh: '日内瓦', en: 'Geneva', tz: 'Europe/Zurich', country: '瑞士' },
    { zh: '哥本哈根', en: 'Copenhagen', tz: 'Europe/Copenhagen', country: '丹麦' },
    { zh: '斯德哥尔摩', en: 'Stockholm', tz: 'Europe/Stockholm', country: '瑞典' },
    { zh: '奥斯陆', en: 'Oslo', tz: 'Europe/Oslo', country: '挪威' },
    { zh: '赫尔辛基', en: 'Helsinki', tz: 'Europe/Helsinki', country: '芬兰' },
    { zh: '雷克雅未克', en: 'Reykjavik', tz: 'Atlantic/Reykjavik', country: '冰岛' },
    { zh: '华沙', en: 'Warsaw', tz: 'Europe/Warsaw', country: '波兰' },
    { zh: '布拉格', en: 'Prague', tz: 'Europe/Prague', country: '捷克' },
    { zh: '布达佩斯', en: 'Budapest', tz: 'Europe/Budapest', country: '匈牙利' },
    { zh: '雅典', en: 'Athens', tz: 'Europe/Athens', country: '希腊' },
    { zh: '基辅', en: 'Kyiv', tz: 'Europe/Kyiv', country: '乌克兰' },
    { zh: '布加勒斯特', en: 'Bucharest', tz: 'Europe/Bucharest', country: '罗马尼亚' },
    // 北美
    { zh: '纽约', en: 'New York', tz: 'America/New_York', country: '美国' },
    { zh: '波士顿', en: 'Boston', tz: 'America/New_York', country: '美国' },
    { zh: '华盛顿', en: 'Washington DC', tz: 'America/New_York', country: '美国' },
    { zh: '迈阿密', en: 'Miami', tz: 'America/New_York', country: '美国' },
    { zh: '亚特兰大', en: 'Atlanta', tz: 'America/New_York', country: '美国' },
    { zh: '费城', en: 'Philadelphia', tz: 'America/New_York', country: '美国' },
    { zh: '芝加哥', en: 'Chicago', tz: 'America/Chicago', country: '美国' },
    { zh: '休斯顿', en: 'Houston', tz: 'America/Chicago', country: '美国' },
    { zh: '达拉斯', en: 'Dallas', tz: 'America/Chicago', country: '美国' },
    { zh: '新奥尔良', en: 'New Orleans', tz: 'America/Chicago', country: '美国' },
    { zh: '丹佛', en: 'Denver', tz: 'America/Denver', country: '美国' },
    { zh: '盐湖城', en: 'Salt Lake City', tz: 'America/Denver', country: '美国' },
    { zh: '凤凰城', en: 'Phoenix', tz: 'America/Phoenix', country: '美国' },
    { zh: '洛杉矶', en: 'Los Angeles', tz: 'America/Los_Angeles', country: '美国' },
    { zh: '旧金山', en: 'San Francisco', tz: 'America/Los_Angeles', country: '美国' },
    { zh: '西雅图', en: 'Seattle', tz: 'America/Los_Angeles', country: '美国' },
    { zh: '拉斯维加斯', en: 'Las Vegas', tz: 'America/Los_Angeles', country: '美国' },
    { zh: '圣地亚哥', en: 'San Diego', tz: 'America/Los_Angeles', country: '美国' },
    { zh: '波特兰', en: 'Portland', tz: 'America/Los_Angeles', country: '美国' },
    { zh: '安克雷奇', en: 'Anchorage', tz: 'America/Anchorage', country: '美国' },
    { zh: '檀香山', en: 'Honolulu', tz: 'Pacific/Honolulu', country: '美国' },
    { zh: '多伦多', en: 'Toronto', tz: 'America/Toronto', country: '加拿大' },
    { zh: '蒙特利尔', en: 'Montreal', tz: 'America/Toronto', country: '加拿大' },
    { zh: '渥太华', en: 'Ottawa', tz: 'America/Toronto', country: '加拿大' },
    { zh: '温哥华', en: 'Vancouver', tz: 'America/Vancouver', country: '加拿大' },
    { zh: '卡尔加里', en: 'Calgary', tz: 'America/Edmonton', country: '加拿大' },
    { zh: '墨西哥城', en: 'Mexico City', tz: 'America/Mexico_City', country: '墨西哥' },
    { zh: '哈瓦那', en: 'Havana', tz: 'America/Havana', country: '古巴' },
    // 中南美
    { zh: '圣保罗', en: 'Sao Paulo', tz: 'America/Sao_Paulo', country: '巴西' },
    { zh: '里约热内卢', en: 'Rio de Janeiro', tz: 'America/Sao_Paulo', country: '巴西' },
    { zh: '布宜诺斯艾利斯', en: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', country: '阿根廷' },
    { zh: '利马', en: 'Lima', tz: 'America/Lima', country: '秘鲁' },
    { zh: '圣地亚哥智利', en: 'Santiago', tz: 'America/Santiago', country: '智利' },
    { zh: '波哥大', en: 'Bogota', tz: 'America/Bogota', country: '哥伦比亚' },
    { zh: '加拉加斯', en: 'Caracas', tz: 'America/Caracas', country: '委内瑞拉' },
    // 大洋洲
    { zh: '悉尼', en: 'Sydney', tz: 'Australia/Sydney', country: '澳大利亚' },
    { zh: '墨尔本', en: 'Melbourne', tz: 'Australia/Melbourne', country: '澳大利亚' },
    { zh: '布里斯班', en: 'Brisbane', tz: 'Australia/Brisbane', country: '澳大利亚' },
    { zh: '珀斯', en: 'Perth', tz: 'Australia/Perth', country: '澳大利亚' },
    { zh: '阿德莱德', en: 'Adelaide', tz: 'Australia/Adelaide', country: '澳大利亚' },
    { zh: '奥克兰', en: 'Auckland', tz: 'Pacific/Auckland', country: '新西兰' },
    { zh: '惠灵顿', en: 'Wellington', tz: 'Pacific/Auckland', country: '新西兰' },
    { zh: '苏瓦', en: 'Suva', tz: 'Pacific/Fiji', country: '斐济' },
    // 非洲
    { zh: '开罗', en: 'Cairo', tz: 'Africa/Cairo', country: '埃及' },
    { zh: '拉各斯', en: 'Lagos', tz: 'Africa/Lagos', country: '尼日利亚' },
    { zh: '内罗毕', en: 'Nairobi', tz: 'Africa/Nairobi', country: '肯尼亚' },
    { zh: '约翰内斯堡', en: 'Johannesburg', tz: 'Africa/Johannesburg', country: '南非' },
    { zh: '开普敦', en: 'Cape Town', tz: 'Africa/Johannesburg', country: '南非' },
    { zh: '卡萨布兰卡', en: 'Casablanca', tz: 'Africa/Casablanca', country: '摩洛哥' },
    { zh: '亚的斯亚贝巴', en: 'Addis Ababa', tz: 'Africa/Addis_Ababa', country: '埃塞俄比亚' }
  ];

  // 热门城市（按 zh 名查 CITIES 索引）
  const HOT_NAMES = ['北京', '上海', '东京', '纽约', '伦敦', '洛杉矶', '巴黎', '悉尼'];

  // ============== 时区核心 ==============
  // 给定 IANA tz 和某个 UTC 时刻，返回该时刻在 tz 的分钟偏移（DST-aware）
  function getOffsetMinutes(tz, utcMs) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = {};
    fmt.formatToParts(new Date(utcMs)).forEach(p => { parts[p.type] = p.value; });
    const asUtc = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      (+parts.hour) % 24, +parts.minute, +parts.second
    );
    return Math.round((asUtc - utcMs) / 60000);
  }

  function fmtOffset(min) {
    const sign = min >= 0 ? '+' : '-';
    const abs = Math.abs(min);
    const h = Math.floor(abs / 60), m = abs % 60;
    return 'UTC' + sign + h + (m ? ':' + String(m).padStart(2, '0') : '');
  }

  // 把 srcTz 的 wall-clock { y,m,d,h,min } 转为 UTC ms
  function wallToUtc(y, m, d, h, min, tz) {
    // 第一次猜测：把 wall time 当作 UTC
    const guess = Date.UTC(y, m - 1, d, h, min);
    // 这一刻在 tz 看来的偏移
    const off = getOffsetMinutes(tz, guess);
    // 减掉偏移得到真实 UTC 时刻
    return guess - off * 60000;
  }

  // 把 UTC ms 在 dstTz 下分解为 wall-clock 各部分
  function utcToWall(utcMs, tz) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'long'
    });
    const parts = {};
    fmt.formatToParts(new Date(utcMs)).forEach(p => { parts[p.type] = p.value; });
    return {
      year: +parts.year,
      month: +parts.month,
      day: +parts.day,
      hour: (+parts.hour) % 24,
      minute: +parts.minute,
      weekday: parts.weekday
    };
  }

  // ============== 时区 UI 状态 ==============
  let srcCityIdx = -1;  // CITIES 索引
  let dstCityIdx = -1;
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function pickInitialSrc() {
    const idx = CITIES.findIndex(c => c.tz === localTz);
    if (idx >= 0) return idx;
    return CITIES.findIndex(c => c.zh === '北京');
  }

  function pickInitialDst() {
    const local = pickInitialSrc();
    if (CITIES[local].zh === '北京') return CITIES.findIndex(c => c.zh === '纽约');
    return CITIES.findIndex(c => c.zh === '北京');
  }

  function renderHotRow(side) {
    const row = document.querySelector(`[data-hot="${side}"]`);
    row.innerHTML = '';
    HOT_NAMES.forEach(zh => {
      const idx = CITIES.findIndex(c => c.zh === zh);
      if (idx < 0) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tz-hot';
      btn.textContent = zh;
      btn.dataset.idx = idx;
      btn.addEventListener('click', () => selectCity(side, idx));
      row.appendChild(btn);
    });
  }

  function selectCity(side, idx) {
    if (side === 'src') srcCityIdx = idx;
    else dstCityIdx = idx;
    refreshHotActive(side);
    refreshSelectedLabel(side);
    refreshOutput();
    // 关闭搜索结果
    document.getElementById(side + '-list').innerHTML = '';
    document.getElementById(side + '-search').value = '';
  }

  function refreshHotActive(side) {
    const idx = side === 'src' ? srcCityIdx : dstCityIdx;
    document.querySelectorAll(`[data-hot="${side}"] .tz-hot`).forEach(b => {
      b.classList.toggle('active', +b.dataset.idx === idx);
    });
  }

  function refreshSelectedLabel(side) {
    const idx = side === 'src' ? srcCityIdx : dstCityIdx;
    const c = CITIES[idx];
    if (!c) return;
    const utcOff = fmtOffset(getOffsetMinutes(c.tz, Date.now()));
    document.getElementById(side + '-selected').innerHTML =
      `${c.zh} <span class="tz-id">${c.tz} · ${utcOff}</span>`;
  }

  function searchCities(q) {
    const norm = q.trim().toLowerCase();
    if (!norm) return [];
    const matches = [];
    for (let i = 0; i < CITIES.length; i++) {
      const c = CITIES[i];
      if (c.zh.toLowerCase().includes(norm) ||
          c.en.toLowerCase().includes(norm) ||
          c.country.toLowerCase().includes(norm)) {
        matches.push({ idx: i, city: c });
        if (matches.length >= 8) break;
      }
    }
    return matches;
  }

  function bindSearch(side) {
    const input = document.getElementById(side + '-search');
    const list = document.getElementById(side + '-list');
    input.addEventListener('input', () => {
      const matches = searchCities(input.value);
      list.innerHTML = '';
      matches.forEach(({ idx, city }) => {
        const item = document.createElement('div');
        item.className = 'tz-search-item';
        item.innerHTML = `${city.zh} <span class="country">${city.country}</span><span class="tzid">${city.tz}</span>`;
        item.addEventListener('click', () => selectCity(side, idx));
        list.appendChild(item);
      });
    });
    input.addEventListener('blur', () => {
      // 延迟清空，让 click 事件能先触发
      setTimeout(() => { list.innerHTML = ''; }, 200);
    });
  }

  function refreshOutput() {
    if (srcCityIdx < 0 || dstCityIdx < 0) return;
    const dateStr = document.getElementById('src-date').value;
    const timeStr = document.getElementById('src-time').value;
    if (!dateStr || !timeStr) return;
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeStr.split(':').map(Number);
    const srcTz = CITIES[srcCityIdx].tz;
    const dstTz = CITIES[dstCityIdx].tz;
    const utcMs = wallToUtc(y, mo, d, h, mi, srcTz);
    const wall = utcToWall(utcMs, dstTz);

    const big = `${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')} ${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}`;
    const srcOff = getOffsetMinutes(srcTz, utcMs);
    const dstOff = getOffsetMinutes(dstTz, utcMs);
    const diffMin = dstOff - srcOff;
    const diffH = Math.abs(diffMin) / 60;
    const diffStr = diffMin === 0
      ? '与源时区相同'
      : (diffMin > 0
          ? `目标比源快 ${diffH} 小时`
          : `目标比源慢 ${diffH} 小时`);
    const srcDateLabel = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')} ${CITIES[srcCityIdx].zh} (${fmtOffset(srcOff)})`;
    document.getElementById('tz-out-big').textContent = big + ' (' + wall.weekday + ')';
    document.getElementById('tz-out-meta').innerHTML =
      `${CITIES[dstCityIdx].zh} ${fmtOffset(dstOff)} · ${diffStr}<br>对应源：${srcDateLabel}`;

    // 同步刷新源 selected label 的偏移（季节切换时偏移可能变）
    refreshSelectedLabel('src');
    refreshSelectedLabel('dst');
  }

  function setSrcToNow() {
    const now = new Date();
    const tz = CITIES[srcCityIdx]?.tz || localTz;
    const wall = utcToWall(now.getTime(), tz);
    document.getElementById('src-date').value =
      `${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')}`;
    document.getElementById('src-time').value =
      `${String(wall.hour).padStart(2, '0')}:${String(wall.minute).padStart(2, '0')}`;
    refreshOutput();
  }

  // ============== 时区初始化 ==============
  renderHotRow('src');
  renderHotRow('dst');
  bindSearch('src');
  bindSearch('dst');
  srcCityIdx = pickInitialSrc();
  dstCityIdx = pickInitialDst();
  refreshHotActive('src');
  refreshHotActive('dst');
  refreshSelectedLabel('src');
  refreshSelectedLabel('dst');
  setSrcToNow();
  document.getElementById('src-date').addEventListener('input', refreshOutput);
  document.getElementById('src-time').addEventListener('input', refreshOutput);
  document.getElementById('src-now').addEventListener('click', setSrcToNow);
  document.getElementById('tz-swap').addEventListener('click', () => {
    [srcCityIdx, dstCityIdx] = [dstCityIdx, srcCityIdx];
    refreshHotActive('src');
    refreshHotActive('dst');
    refreshSelectedLabel('src');
    refreshSelectedLabel('dst');
    refreshOutput();
  });

  // ============== 日期工具：pill 切换 ==============
  const pillBtns = document.querySelectorAll('.pill-row button');
  const pillContents = document.querySelectorAll('.pill-content');
  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.pill;
      pillContents.forEach(c => {
        c.style.display = c.dataset.pillContent === target ? '' : 'none';
      });
    });
  });

  // ============== 日期工具：通用 helper ==============
  function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function parseDateUtc(str) {
    // "2026-05-07" -> Date in UTC
    const [y, m, d] = str.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function utcMsToYmd(ms) {
    const d = new Date(ms);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }

  function weekdayCn(ms) {
    const w = new Date(ms).getUTCDay();
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][w];
  }

  // 计算两个 UTC ms 之间相差的整年/整月/天（"X 年 Y 月 Z 天"）
  function calendarDiff(aMs, bMs) {
    let neg = false;
    if (aMs > bMs) { [aMs, bMs] = [bMs, aMs]; neg = true; }
    const a = utcMsToYmd(aMs), b = utcMsToYmd(bMs);
    let years = b.y - a.y;
    let months = b.m - a.m;
    let days = b.d - a.d;
    if (days < 0) {
      months--;
      // 借月：上一个月（b 的当月前面那个月）的天数
      const prevMonth = new Date(Date.UTC(b.y, b.m - 1, 0));
      days += prevMonth.getUTCDate();
    }
    if (months < 0) { years--; months += 12; }
    return { years, months, days, neg };
  }

  // ============== 天数差 ==============
  const diffA = document.getElementById('diff-a');
  const diffB = document.getElementById('diff-b');
  const diffInclusive = document.getElementById('diff-inclusive');
  function diffCalc() {
    if (!diffA.value || !diffB.value) return;
    const aMs = parseDateUtc(diffA.value);
    const bMs = parseDateUtc(diffB.value);
    const rawDays = (bMs - aMs) / 86400000;
    const inclusive = diffInclusive.checked;
    const adj = inclusive ? Math.sign(rawDays || 1) : 0;
    const days = rawDays + adj;
    const sign = days < 0 ? '-' : '';
    const abs = Math.abs(days);
    const tag = inclusive ? '（含起止）' : '';
    document.getElementById('diff-out').textContent = `${sign}${abs} 天${tag}`;
    const weeks = Math.floor(abs / 7), wdRem = abs % 7;
    const cd = calendarDiff(aMs, bMs);
    const cdStr = `${cd.years} 年 ${cd.months} 月 ${cd.days} 天`;
    const cdLabel = inclusive ? '原始日历差（不含起止）' : '≈';
    document.getElementById('diff-detail').innerHTML =
      `<span>≈ ${weeks} 周 ${wdRem} 天</span><span>${cdLabel} ${cdStr}</span><span>${diffA.value}（${weekdayCn(aMs)}） → ${diffB.value}（${weekdayCn(bMs)}）</span>`;
  }
  diffA.value = todayStr();
  // 默认 B = A + 30 天
  const today = parseDateUtc(todayStr());
  const future = utcMsToYmd(today + 30 * 86400000);
  diffB.value = `${future.y}-${String(future.m).padStart(2, '0')}-${String(future.d).padStart(2, '0')}`;
  diffA.addEventListener('input', diffCalc);
  diffB.addEventListener('input', diffCalc);
  diffInclusive.addEventListener('change', diffCalc);
  diffCalc();

  // ============== 加减天数 ==============
  const addBase = document.getElementById('add-base');
  const addN = document.getElementById('add-n');
  const addSign = document.getElementById('add-sign');
  let addPositive = true;
  function addCalc() {
    if (!addBase.value || addN.value === '') return;
    const baseMs = parseDateUtc(addBase.value);
    const n = Math.floor(Number(addN.value) || 0);
    const offset = (addPositive ? 1 : -1) * n;
    const resultMs = baseMs + offset * 86400000;
    const r = utcMsToYmd(resultMs);
    const dateStr = `${r.y}-${String(r.m).padStart(2, '0')}-${String(r.d).padStart(2, '0')}`;
    const lun = solarToLunar(r.y, r.m, r.d);
    document.getElementById('add-out').textContent = `${dateStr}  ${weekdayCn(resultMs)}`;
    document.getElementById('add-detail').innerHTML =
      `<span>${addBase.value} ${addPositive ? '+' : '−'} ${n} 天</span><span>农历：${lunarFormat(lun)}</span>`;
  }
  addBase.value = todayStr();
  addSign.addEventListener('click', () => {
    addPositive = !addPositive;
    addSign.textContent = addPositive ? '+' : '−';
    addCalc();
  });
  addBase.addEventListener('input', addCalc);
  addN.addEventListener('input', addCalc);

  // ============== 工作日 ==============
  const workA = document.getElementById('work-a');
  const workB = document.getElementById('work-b');
  function workCalc() {
    if (!workA.value || !workB.value) return;
    let aMs = parseDateUtc(workA.value);
    let bMs = parseDateUtc(workB.value);
    if (aMs > bMs) [aMs, bMs] = [bMs, aMs];
    let workdays = 0, weekend = 0;
    for (let t = aMs; t <= bMs; t += 86400000) {
      const w = new Date(t).getUTCDay();
      if (w === 0 || w === 6) weekend++;
      else workdays++;
    }
    const total = workdays + weekend;
    document.getElementById('work-out').textContent = `工作日：${workdays} 天`;
    document.getElementById('work-detail').innerHTML =
      `<span>周末：${weekend} 天</span><span>总计：${total} 天</span><span>不计中国法定节假日</span>`;
  }
  workA.value = todayStr();
  workB.value = `${future.y}-${String(future.m).padStart(2, '0')}-${String(future.d).padStart(2, '0')}`;
  workA.addEventListener('input', workCalc);
  workB.addEventListener('input', workCalc);
  workCalc();

  // ============== 农历 ==============
  // 1900-2100，每年一个 16-bit（含闰月信息低 4 位 + 月大小 12 位 + 闰月大小 1 位）
  const LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
    0x0d520
  ]; // 1900-2100 共 201 项

  function leapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
  function leapDays(y) {
    if (!leapMonth(y)) return 0;
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
  }
  function monthDays(y, m) {
    return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  }
  function lunarYearDays(y) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
    }
    return sum + leapDays(y);
  }

  function solarToLunar(year, month, day) {
    const baseDate = Date.UTC(1900, 0, 31);
    const target = Date.UTC(year, month - 1, day);
    let offset = Math.floor((target - baseDate) / 86400000);
    if (offset < 0 || year > 2100) return null;

    let lunarY = 1900;
    let temp = 0;
    while (lunarY < 2101) {
      temp = lunarYearDays(lunarY);
      if (offset < temp) break;
      offset -= temp;
      lunarY++;
    }

    const leap = leapMonth(lunarY);
    let isLeap = false;
    let lunarM = 1;
    while (lunarM < 13) {
      if (leap > 0 && lunarM === leap + 1 && !isLeap) {
        --lunarM;
        isLeap = true;
        temp = leapDays(lunarY);
      } else {
        temp = monthDays(lunarY, lunarM);
      }
      if (isLeap && lunarM === leap + 1) isLeap = false;
      if (offset < temp) break;
      offset -= temp;
      lunarM++;
    }
    const lunarD = offset + 1;
    return { year: lunarY, month: lunarM, day: lunarD, isLeap };
  }

  function lunarToSolar(year, month, day, isLeap) {
    if (year < 1900 || year > 2100) return null;
    if (month < 1 || month > 12 || day < 1 || day > 30) return null;
    const leap = leapMonth(year);
    if (isLeap && month !== leap) return null;

    let offset = 0;
    for (let y = 1900; y < year; y++) {
      offset += lunarYearDays(y);
    }
    for (let m = 1; m < month; m++) {
      offset += monthDays(year, m);
      if (m === leap) offset += leapDays(year);
    }
    const dayCap = isLeap ? leapDays(year) : monthDays(year, month);
    if (day > dayCap) return null;
    if (isLeap) offset += monthDays(year, month);
    offset += day - 1;

    const ms = Date.UTC(1900, 0, 31) + offset * 86400000;
    return utcMsToYmd(ms);
  }

  const TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
  const LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
  const LUNAR_DAYS_NAMES = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];

  function ganzhi(year) {
    const offset = (year - 4 + 600) % 60;
    return TIANGAN[offset % 10] + DIZHI[offset % 12];
  }
  function shengxiao(year) {
    return SHENGXIAO[((year - 4) % 12 + 12) % 12];
  }

  function lunarFormat(lun) {
    if (!lun) return '—';
    const monthName = (lun.isLeap ? '闰' : '') + LUNAR_MONTHS[lun.month - 1] + '月';
    return `${monthName}${LUNAR_DAYS_NAMES[lun.day - 1]}`;
  }

  // 农历 UI 初始化
  const lunDir = document.getElementById('lun-dir');
  const lunSolar = document.getElementById('lun-solar');
  const lunY = document.getElementById('lun-y');
  const lunM = document.getElementById('lun-m');
  const lunD = document.getElementById('lun-d');
  const lunLeap = document.getElementById('lun-leap');

  // 月下拉：12 个月
  for (let i = 1; i <= 12; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = LUNAR_MONTHS[i - 1] + '月';
    lunM.appendChild(opt);
  }
  // 日下拉：1–30
  for (let i = 1; i <= 30; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = LUNAR_DAYS_NAMES[i - 1];
    lunD.appendChild(opt);
  }
  lunSolar.value = todayStr();
  lunM.value = '3';
  lunD.value = '21';

  function refreshLunarLeapAvailable() {
    const y = +lunY.value;
    if (y < 1900 || y > 2100) { lunLeap.disabled = true; return; }
    const leap = leapMonth(y);
    const m = +lunM.value;
    if (leap > 0 && m === leap) {
      lunLeap.disabled = false;
    } else {
      lunLeap.disabled = true;
      lunLeap.checked = false;
    }
  }

  function lunarCalc() {
    const dir = lunDir.value;
    document.getElementById('lun-s2l-input').style.display = dir === 's2l' ? '' : 'none';
    document.getElementById('lun-l2s-input').style.display = dir === 'l2s' ? '' : 'none';

    if (dir === 's2l') {
      if (!lunSolar.value) return;
      const [y, m, d] = lunSolar.value.split('-').map(Number);
      const lun = solarToLunar(y, m, d);
      if (!lun) {
        document.getElementById('lun-out').textContent = '范围之外（仅支持 1900-01-31 至 2100-12-31）';
        document.getElementById('lun-detail').textContent = '';
        return;
      }
      document.getElementById('lun-out').textContent =
        `农历 ${ganzhi(lun.year)}年 ${lunarFormat(lun)}`;
      document.getElementById('lun-detail').innerHTML =
        `<span>生肖：${shengxiao(lun.year)}</span><span>天干地支：${ganzhi(lun.year)}</span><span>${lunSolar.value}（${weekdayCn(parseDateUtc(lunSolar.value))}）</span>`;
    } else {
      refreshLunarLeapAvailable();
      const y = +lunY.value, m = +lunM.value, d = +lunD.value;
      const isLeap = lunLeap.checked;
      const sol = lunarToSolar(y, m, d, isLeap);
      if (!sol) {
        document.getElementById('lun-out').textContent = '该农历日期不存在';
        document.getElementById('lun-detail').textContent = '';
        return;
      }
      const dateStr = `${sol.y}-${String(sol.m).padStart(2, '0')}-${String(sol.d).padStart(2, '0')}`;
      const ms = Date.UTC(sol.y, sol.m - 1, sol.d);
      document.getElementById('lun-out').textContent = `公历 ${dateStr}  ${weekdayCn(ms)}`;
      document.getElementById('lun-detail').innerHTML =
        `<span>农历 ${ganzhi(y)}年 ${(isLeap ? '闰' : '') + LUNAR_MONTHS[m - 1] + '月'}${LUNAR_DAYS_NAMES[d - 1]}</span><span>生肖：${shengxiao(y)}</span>`;
    }
  }

  lunDir.addEventListener('change', lunarCalc);
  lunSolar.addEventListener('input', lunarCalc);
  lunY.addEventListener('input', () => { refreshLunarLeapAvailable(); lunarCalc(); });
  lunM.addEventListener('change', () => { refreshLunarLeapAvailable(); lunarCalc(); });
  lunD.addEventListener('change', lunarCalc);
  lunLeap.addEventListener('change', lunarCalc);
  refreshLunarLeapAvailable();
  lunarCalc();
  addCalc();

  // ============== 生日 ==============
  const bdayDir = document.getElementById('bday-dir');
  const bdayYear = document.getElementById('bday-year');
  const bdayPast = document.getElementById('bday-past');
  const bdayLM = document.getElementById('bday-l-m');
  const bdayLD = document.getElementById('bday-l-d');
  const bdayLLeap = document.getElementById('bday-l-leap');
  const bdaySM = document.getElementById('bday-s-m');
  const bdaySD = document.getElementById('bday-s-d');

  // 农历月/日下拉
  for (let i = 1; i <= 12; i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = LUNAR_MONTHS[i - 1] + '月';
    bdayLM.appendChild(o);
  }
  for (let i = 1; i <= 30; i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = LUNAR_DAYS_NAMES[i - 1];
    bdayLD.appendChild(o);
  }
  // 公历月/日下拉
  for (let i = 1; i <= 12; i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = i + ' 月';
    bdaySM.appendChild(o);
  }
  for (let i = 1; i <= 31; i++) {
    const o = document.createElement('option');
    o.value = i; o.textContent = i + ' 日';
    bdaySD.appendChild(o);
  }

  // 默认值：今年 + 今天月日
  const todayObj = new Date();
  bdayYear.value = todayObj.getFullYear();
  bdaySM.value = todayObj.getMonth() + 1;
  bdaySD.value = todayObj.getDate();
  bdayLM.value = '8';
  bdayLD.value = '15';
  // 出生公历默认 30 年前的今天（一个示意值）
  const pastObj = new Date(todayObj.getTime());
  pastObj.setFullYear(pastObj.getFullYear() - 30);
  bdayPast.value = `${pastObj.getFullYear()}-${String(pastObj.getMonth() + 1).padStart(2, '0')}-${String(pastObj.getDate()).padStart(2, '0')}`;

  function refreshBdayLeap() {
    const y = +bdayYear.value;
    if (y < 1900 || y > 2100) { bdayLLeap.disabled = true; return; }
    const leap = leapMonth(y);
    const m = +bdayLM.value;
    if (leap > 0 && m === leap) {
      bdayLLeap.disabled = false;
    } else {
      bdayLLeap.disabled = true;
      bdayLLeap.checked = false;
    }
  }

  function daysFromTodayLabel(targetMs) {
    const now = new Date();
    const todayMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((targetMs - todayMs) / 86400000);
    if (diff === 0) return '就是今天';
    if (diff > 0) return `还有 ${diff} 天`;
    return `已过 ${-diff} 天`;
  }

  function bdayCalc() {
    const dir = bdayDir.value;
    document.getElementById('bday-past-input').style.display = dir === 'past2this' ? '' : 'none';
    document.getElementById('bday-l-input').style.display = dir === 'l2s' ? '' : 'none';
    document.getElementById('bday-s-input').style.display = dir === 's2l' ? '' : 'none';
    const y = +bdayYear.value;
    if (y < 1900 || y > 2100) {
      document.getElementById('bday-out').textContent = '年份超出 1900-2100 范围';
      document.getElementById('bday-detail').textContent = '';
      return;
    }

    if (dir === 'past2this') {
      if (!bdayPast.value) return;
      const [py, pm, pd] = bdayPast.value.split('-').map(Number);
      if (py < 1900 || py > 2100) {
        document.getElementById('bday-out').textContent = '出生年份超出 1900-2100 范围';
        document.getElementById('bday-detail').textContent = '';
        return;
      }
      const birthLun = solarToLunar(py, pm, pd);
      if (!birthLun) {
        document.getElementById('bday-out').textContent = '出生日期无法换算农历';
        document.getElementById('bday-detail').textContent = '';
        return;
      }
      // 今年农历同月日的公历
      const yearLeap = leapMonth(y);
      let useLeap = birthLun.isLeap;
      let note = '';
      if (birthLun.isLeap && yearLeap !== birthLun.month) {
        useLeap = false;
        note = `（出生年闰${LUNAR_MONTHS[birthLun.month - 1]}月，但 ${y} 年无此闰月，按正月计算）`;
      }
      // 处理 30 日不存在的情况（农历小月没有 30 日）
      let useDay = birthLun.day;
      const cap = useLeap ? leapDays(y) : monthDays(y, birthLun.month);
      if (useDay > cap) {
        useDay = cap;
        note += `（${y} 年农历此月仅 ${cap} 天，已取末日）`;
      }
      const sol = lunarToSolar(y, birthLun.month, useDay, useLeap);
      if (!sol) {
        document.getElementById('bday-out').textContent = '换算失败';
        document.getElementById('bday-detail').textContent = '';
        return;
      }
      const dateStr = `${sol.y}-${String(sol.m).padStart(2, '0')}-${String(sol.d).padStart(2, '0')}`;
      const ms = Date.UTC(sol.y, sol.m - 1, sol.d);
      const birthLunLabel = `${(birthLun.isLeap ? '闰' : '')}${LUNAR_MONTHS[birthLun.month - 1]}月${LUNAR_DAYS_NAMES[birthLun.day - 1]}`;
      const todayLunLabel = `${(useLeap ? '闰' : '')}${LUNAR_MONTHS[birthLun.month - 1]}月${LUNAR_DAYS_NAMES[useDay - 1]}`;
      const age = y - py;
      document.getElementById('bday-out').textContent = `${y} 年公历 ${dateStr}  ${weekdayCn(ms)}`;
      document.getElementById('bday-detail').innerHTML =
        `<span>出生 ${bdayPast.value} = ${ganzhi(birthLun.year)}年 ${birthLunLabel}</span><span>${y} 年农历 ${todayLunLabel}（虚岁 ${age + 1}）</span><span>${daysFromTodayLabel(ms)}</span>${note ? '<span>' + note + '</span>' : ''}`;
    } else if (dir === 'l2s') {
      refreshBdayLeap();
      const m = +bdayLM.value, d = +bdayLD.value;
      const wantLeap = bdayLLeap.checked;
      const yearLeap = leapMonth(y);
      let useLeap = wantLeap;
      let note = '';
      if (wantLeap && yearLeap !== m) {
        useLeap = false;
        note = `（${y} 年无闰${LUNAR_MONTHS[m - 1]}月，按正月计算）`;
      }
      const sol = lunarToSolar(y, m, d, useLeap);
      if (!sol) {
        document.getElementById('bday-out').textContent = '该农历日期不存在';
        document.getElementById('bday-detail').textContent = '';
        return;
      }
      const dateStr = `${sol.y}-${String(sol.m).padStart(2, '0')}-${String(sol.d).padStart(2, '0')}`;
      const ms = Date.UTC(sol.y, sol.m - 1, sol.d);
      const lunLabel = `${(useLeap ? '闰' : '')}${LUNAR_MONTHS[m - 1]}月${LUNAR_DAYS_NAMES[d - 1]}`;
      document.getElementById('bday-out').textContent = `${y} 年公历 ${dateStr}  ${weekdayCn(ms)}`;
      document.getElementById('bday-detail').innerHTML =
        `<span>${y} 年农历 ${lunLabel}</span><span>${daysFromTodayLabel(ms)}</span>${note ? '<span>' + note + '</span>' : ''}`;
    } else {
      const m = +bdaySM.value, d = +bdaySD.value;
      // 验证 公历 m/d 在 y 年是否存在
      const test = new Date(Date.UTC(y, m - 1, d));
      if (test.getUTCMonth() !== m - 1 || test.getUTCDate() !== d) {
        document.getElementById('bday-out').textContent = `${y} 年公历 ${m}-${d} 不存在`;
        document.getElementById('bday-detail').textContent = '';
        return;
      }
      const ms = Date.UTC(y, m - 1, d);
      const lun = solarToLunar(y, m, d);
      if (!lun) {
        document.getElementById('bday-out').textContent = '范围之外';
        document.getElementById('bday-detail').textContent = '';
        return;
      }
      const lunLabel = `${(lun.isLeap ? '闰' : '')}${LUNAR_MONTHS[lun.month - 1]}月${LUNAR_DAYS_NAMES[lun.day - 1]}`;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      document.getElementById('bday-out').textContent = `${y} 年农历 ${ganzhi(lun.year)}年 ${lunLabel}`;
      document.getElementById('bday-detail').innerHTML =
        `<span>公历 ${dateStr}（${weekdayCn(ms)}）</span><span>生肖：${shengxiao(lun.year)}</span><span>${daysFromTodayLabel(ms)}</span>`;
    }
  }

  bdayDir.addEventListener('change', bdayCalc);
  bdayYear.addEventListener('input', () => { refreshBdayLeap(); bdayCalc(); });
  bdayPast.addEventListener('input', bdayCalc);
  bdayLM.addEventListener('change', () => { refreshBdayLeap(); bdayCalc(); });
  bdayLD.addEventListener('change', bdayCalc);
  bdayLLeap.addEventListener('change', bdayCalc);
  bdaySM.addEventListener('change', bdayCalc);
  bdaySD.addEventListener('change', bdayCalc);
  refreshBdayLeap();
  bdayCalc();
})();
