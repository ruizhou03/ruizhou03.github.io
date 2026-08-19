window.ICON_REVIEW_DATA = {
  batch: 'sitewide-png-01',
  revision: 1,
  auditedCommit: 'dfbb5042',
  generatedAt: '2026-08-18',
  styleSheets: {
    A: 'assets/toolbox-miniature.png',
    B: 'assets/toolbox-editorial.png',
    C: 'assets/toolbox-handmade.png'
  },
  styleLabels: {
    A: '微缩实物',
    B: '编辑部立体插画',
    C: '手工材质浮雕'
  },
  toolbox: [
    { id: 'toolbox.blackjack', category: 'toolbox', name: '21 点', current: '🎰', tagline: '6 副牌 vs 庄家', x: 0, y: 0, source: '_data/toolbox.yml:101', rationale: '不再借用老虎机：牌桌、21 点手牌与筹码直接表达玩法。' },
    { id: 'toolbox.solitaire', category: 'toolbox', name: '接龙纸牌', current: '🗂️', tagline: '经典 Klondike · 翻 1/3', x: 1, y: 0, source: '_data/toolbox.yml:110', rationale: '把“文件夹”改为真正的 Klondike 叠牌结构。' },
    { id: 'toolbox.random', category: 'toolbox', name: '随机数生成器', current: '🎰', tagline: '13 种概率分布', x: 2, y: 0, source: '_data/toolbox.yml:284', rationale: '骰子、概率点与抽样球表达随机性，并与 21 点彻底区分。' },
    { id: 'toolbox.time', category: 'toolbox', name: '时间工具', current: '🕐', tagline: '时区换算 + 日期计算', x: 3, y: 0, source: '_data/toolbox.yml:316', rationale: '世界钟与偏移轨道同时覆盖时区和日期换算。' },
    { id: 'toolbox.metronome', category: 'toolbox', name: '节拍器', current: '🥁', tagline: 'BPM 30–300', x: 4, y: 0, source: '_data/toolbox.yml:352', rationale: '机械节拍器比鼓更贴近这个工具本身。' },
    { id: 'toolbox.pitch', category: 'toolbox', name: '音高测量', current: '🎵', tagline: '麦克风实时识别', x: 0, y: 1, source: '_data/toolbox.yml:360', rationale: '音叉与受控波形表示“测量”，不是泛泛的音乐。' },
    { id: 'toolbox.picker', category: 'toolbox', name: '遇事不决', current: '🎯', tagline: '权重转盘抽签', x: 1, y: 1, source: '_data/toolbox.yml:368', rationale: '有指针和分区的权重转盘直接对应交互。' },
    { id: 'toolbox.grouper', category: 'toolbox', name: '随机分组器', current: '👥', tagline: 'N 人分 K 组', x: 2, y: 1, source: '_data/toolbox.yml:376', rationale: '同一组人物筹码被视觉上拆成两组，表达“分组”而非“人群”。' },
    { id: 'toolbox.roll-call', category: 'toolbox', name: '随机点名', current: '🎤', tagline: '上课提问 / 汇报', x: 3, y: 1, source: '_data/toolbox.yml:384', rationale: '抽签筒与被选中的名签更准确；避免把功能误解成唱歌。' },
    { id: 'toolbox.countdown', category: 'toolbox', name: '倒计时面板', current: '⏳', tagline: '节日 + 截稿剩余天', x: 4, y: 1, source: '_data/toolbox.yml:392', rationale: '沙漏配日历页，同时覆盖事件和剩余天数。' }
  ],
  uiScenes: [
    {
      id: 'site.feature-marker', category: 'site', name: '全站“精选 / 招牌”标记', current: '★ 精选', source: '_includes/category-listing-tools.html; _includes/sub-category-section.html; zh/index.html',
      rationale: '目前的实心星仍依赖字体。候选分别强调“闪光”“馆藏章”“纯排版”。',
      choices: [
        { id: 'A', label: '双芒闪光', kind: 'icon-label', icon: 'sparkle', text: '精选' },
        { id: 'B', label: '馆藏星章', kind: 'badge', icon: 'star', text: '精选' },
        { id: 'C', label: '无图标细线', kind: 'rule-label', text: '精选' }
      ]
    },
    {
      id: 'site.theme-control', category: 'site', name: '深浅主题切换', current: '◐ / ● / ○ / ◑', source: '_layouts/default.html; zh/index.html',
      rationale: '把平台字体圆点换成明确的太阳/月亮 SVG；也可以保留“单旋钮”感。',
      choices: [
        { id: 'A', label: '太阳 / 月亮', kind: 'dual-icon', icons: ['sun', 'moon'] },
        { id: 'B', label: '半明半暗旋钮', kind: 'theme-dial' },
        { id: 'C', label: '极简月相环', kind: 'moon-ring' }
      ]
    },
    {
      id: 'flight.itinerary-heading', category: 'flight', name: '机票工具：行程标题', current: '✈︎ 行程', source: 'toolbox/flight/index.html:226',
      rationale: '同一真实标题上下文比较飞行、行李与路线三种语义。',
      choices: [
        { id: 'A', label: '纸飞机', kind: 'heading-icon', icon: 'plane', text: '行程' },
        { id: 'B', label: '旅行箱', kind: 'heading-icon', icon: 'suitcase', text: '行程' },
        { id: 'C', label: '路线节点', kind: 'route-heading', text: '行程' }
      ]
    },
    {
      id: 'flight.date-heading', category: 'flight', name: '机票工具：出行时间标题', current: '❏ 出行时间', source: 'toolbox/flight/index.html:266',
      rationale: '当前空方框没有清楚语义，候选改为日历、世界时钟或日期区间。',
      choices: [
        { id: 'A', label: '日历', kind: 'heading-icon', icon: 'calendar', text: '出行时间' },
        { id: 'B', label: '时区钟', kind: 'heading-icon', icon: 'tz-dial', text: '出行时间' },
        { id: 'C', label: '日期区间', kind: 'date-range-heading', text: '出行时间' }
      ]
    },
    {
      id: 'flight.transfer-heading', category: 'flight', name: '机票工具：直飞 / 中转标题', current: '🔁 直飞 / 中转', source: 'toolbox/flight/index.html:273',
      rationale: '循环箭头容易被理解为刷新，候选改为真正的中转路线语义。',
      choices: [
        { id: 'A', label: '中转路线', kind: 'heading-icon', icon: 'transfer-route', text: '直飞 / 中转' },
        { id: 'B', label: '双向换乘', kind: 'heading-icon', icon: 'transfer', text: '直飞 / 中转' },
        { id: 'C', label: '一站式路线', kind: 'route-heading', text: '直飞 / 中转' }
      ]
    },
    {
      id: 'flight.calendar-priority', category: 'flight', name: '机票工具：候选日 / 理想日', current: '☆→★ · ✧→✦', source: 'toolbox/flight/index.html:99–101, 267, 545–590; email-digest.html:99–104',
      rationale: '星形既依赖字体又要区分出发/到达。三个方案都保留“双维度 + 两级优先”的信息。',
      choices: [
        { id: 'A', label: '角标圆点', kind: 'calendar-dots' },
        { id: 'B', label: '旗帜角标', kind: 'calendar-flags' },
        { id: 'C', label: '边框粗细', kind: 'calendar-borders' }
      ]
    },
    {
      id: 'flight.sort-controls', category: 'flight', name: '机票工具：排序与展开', current: '▲ ▼ ⌄', source: 'toolbox/flight/index.html:280–326',
      rationale: '这里应是紧凑控制图标，不需要写实 PNG；重点是统一笔画、点击面积和状态。',
      choices: [
        { id: 'A', label: '独立线性按钮', kind: 'sort-linear' },
        { id: 'B', label: '合并升降控件', kind: 'sort-segmented' },
        { id: 'C', label: '拖拽柄 + 展开', kind: 'sort-drag' }
      ]
    }
  ],
  auditGroups: [
    { status: '进入本轮', count: 59, title: '真实 UI 图标与状态符号', tone: 'review', body: '百宝箱 10 处、机票工具与摘要 42 处、全站精选和主题符号 7 处。全部映射到本页 17 个可见场景。' },
    { status: '保留', count: 48, title: '牌面与记忆翻牌内容', tone: 'keep', body: '斗地主 / 掼蛋牌面花色，以及记忆翻牌的水果、动物和表情，本身就是玩法内容，不应替换成通用 UI 图标。' },
    { status: '另开插画家族', count: 18, title: '宠物物种与默认头像', tone: 'future', body: '猫、狗、兔等是用户选择的宠物身份，不是按钮图标。未来若升级，应做成完整宠物头像家族并保留已有用户数据兼容。' },
    { status: '非运行时', count: 54, title: '掼蛋视觉检查页', tone: 'exclude', body: '这是开发阶段的静态 checkpoint，不是正式入口；其中棋子、花色和示意控件不计入当前线上图标替换。' }
  ]
};
