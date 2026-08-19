window.ICON_REFINE_DATA = {
  format: 'ICON_REVIEW_V2',
  batch: 'sitewide-png-refine-02',
  revision: 2,
  auditedCommit: 'dfbb5042',
  sourceFeedback: '../approvals/sitewide-png-01.json',
  items: [
    { id: 'toolbox.blackjack', name: '21 点', tagline: '6 副牌 vs 庄家', asset: 'assets/blackjack.png', previous: 'B', previousNote: '', change: '按 B 的牌桌与筹码方向独立重绘；整副构图完整落在安全区内。' },
    { id: 'toolbox.solitaire', name: '接龙纸牌', tagline: '经典 Klondike · 翻 1/3', asset: 'assets/solitaire.png', previous: 'B', previousNote: '', change: '按 B 的编辑部立体风格独立重绘；叠牌与四张展开牌全部完整。' },
    { id: 'toolbox.random', name: '随机数生成器', tagline: '13 种概率分布', asset: 'assets/random.png', previous: 'A', previousNote: '右下角的那个球有点不明所以。', change: '已移除不明所以的条纹球，替换为两枚骰子与明确的概率分布曲线。' },
    { id: 'toolbox.time', name: '时间工具', tagline: '时区换算 + 日期计算', asset: 'assets/time.png', previous: 'C', previousNote: '设计得很好，但是就是C选项似乎给人一种被截断了的感觉。', change: '按 C 的手工材质独立重绘；地球、黄铜环、小钟和底座全部完整。' },
    { id: 'toolbox.metronome', name: '节拍器', tagline: 'BPM 30–300', asset: 'assets/metronome.png', previous: 'A', previousNote: '', change: '按 A 的胡桃木实物方向独立重绘；顶部、摆杆、旋钮和脚完整保留。' },
    { id: 'toolbox.pitch', name: '音高测量', tagline: '麦克风实时识别', asset: 'assets/pitch.png', previous: 'B', previousNote: '设计得很好，但是有一种被切断了的感觉。', change: '按 B 的音叉与波形方向独立重绘；叉尖、底座和整条波形均不再截断。' },
    { id: 'toolbox.picker', name: '遇事不决', tagline: '权重转盘抽签', asset: 'assets/picker.png', previous: 'A', previousNote: '设计得很好，但是有种被截断了的感觉。', change: '按 A 的微缩转盘方向独立重绘；指针、轮盘和木质底座完整显示。' },
    { id: 'toolbox.grouper', name: '随机分组器', tagline: 'N 人分 K 组', asset: 'assets/grouper.png', previous: 'C', previousNote: '设计得很好，但是有种被截断了的感觉。', change: '按 C 的陶瓷人物方向独立重绘；明确呈现 3+3 两组，六个人物全部完整。' },
    { id: 'toolbox.roll-call', name: '随机点名', tagline: '上课提问 / 汇报', asset: 'assets/roll-call.png', previous: 'C', previousNote: '设计得很好，但是有种被截断了的感觉。', change: '按 C 的玻璃抽签罐方向独立重绘；被抽中的纸签和夹子完整进入画面。' },
    { id: 'toolbox.countdown', name: '倒计时面板', tagline: '节日 + 截稿剩余天', asset: 'assets/countdown.png', previous: 'B', previousNote: '设计得很好，但是有种被截断了的感觉。', change: '按 B 的沙漏与日历方向独立重绘；顶部、底座和整本日历均完整。' }
  ],
  lockedApprovals: [
    { id: 'site.feature-marker', choice: 'A', label: '全站“精选 / 招牌”标记', result: '双芒闪光' },
    { id: 'site.theme-control', choice: 'C', label: '深浅主题切换', result: '极简月相环' },
    { id: 'flight.itinerary-heading', choice: 'B', label: '机票：行程标题', result: '旅行箱' },
    { id: 'flight.date-heading', choice: 'A', label: '机票：出行时间标题', result: '日历' },
    { id: 'flight.transfer-heading', choice: 'B', label: '机票：直飞 / 中转标题', result: '双向换乘' },
    { id: 'flight.calendar-priority', choice: 'C', label: '机票：候选日 / 理想日', result: '边框粗细' },
    { id: 'flight.sort-controls', choice: 'A', label: '机票：排序与展开', result: '独立线性按钮' }
  ]
};
