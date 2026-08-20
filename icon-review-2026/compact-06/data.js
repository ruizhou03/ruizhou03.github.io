window.ICON_COMPACT6_DATA={
  format:'ICON_REVIEW_V2',batch:'sitewide-png-compact-06',revision:6,auditedCommit:'dfbb5042',
  locked:[
    {id:'toolbox.blackjack',name:'21 点',src:'../compact-03/assets/png/blackjack.png',decision:'compact-r3'},
    {id:'toolbox.solitaire',name:'接龙纸牌',src:'../compact-03/assets/png/solitaire.png',decision:'compact-r3'},
    {id:'toolbox.random',name:'随机数',src:'../compact-04/assets/png/random.png',decision:'compact-r4'},
    {id:'toolbox.time',name:'时间',src:'../compact-04/assets/png/time.png',decision:'compact-r4'},
    {id:'toolbox.picker',name:'遇事不决',src:'../compact-05/assets/png/picker-a.png',decision:'compact-r5-A'},
    {id:'toolbox.grouper',name:'分组',src:'../compact-04/assets/png/grouper.png',decision:'compact-r4'},
    {id:'toolbox.countdown',name:'倒计时',src:'../compact-05/assets/png/countdown-b.png',decision:'compact-r5-B'}
  ],
  icons:[
    {id:'toolbox.metronome',name:'节拍器',feedback:'选中第五轮 A，但摇杆很奇怪。',choices:[
      {id:'A',slug:'metronome-a',label:'垂直归中',desc:'摆杆回到中线，水平配重块清楚稳定。'},
      {id:'B',slug:'metronome-b',label:'自然斜摆',desc:'细白摆杆、紧凑配重和两侧运动弧。'},
      {id:'C',slug:'metronome-c',label:'短杆摆动',desc:'短红摆杆、圆形配重与局部运动刻度。'}]},
    {id:'toolbox.pitch',name:'音高测量',feedback:'第五轮三套全部打回：都不好看。',choices:[
      {id:'A',slug:'pitch-a',label:'麦克风分析',desc:'输入麦克风、声音波形与三条分析结果线。'},
      {id:'B',slug:'pitch-b',label:'琴键音符',desc:'琴键与大音符，保留一条绿色校准弧。'},
      {id:'C',slug:'pitch-c',label:'数字调音器',desc:'真实调音器式 A4 显示与居中校准刻度。'}]}
  ],
  architecture:[
    {id:'A',label:'完整三标签合并',tag:'最大整合',recommended:false,desc:'新建一个“随机工具”应用，抽签、分组、点名共用一份名单与档案；旧 URL 重定向。',pros:['百宝箱只保留一张卡','名单真正一次维护','三种结果可无缝切换'],risks:['必须迁移三个存储键','权重与属性字段难统一','改动和回归风险最高']},
    {id:'B',label:'单入口随机工具馆',tag:'推荐',recommended:true,desc:'百宝箱只展示一个“随机工具”入口；进入后选转盘、分组或点名，三个成熟页面与数据完全不动。',pros:['立刻减少主页卡片','零数据迁移风险','旧链接和功能完整保留'],risks:['多一次入口点击','名单仍分别保存','底层代码仍是三套']},
    {id:'C',label:'独立工具＋共享名单库',tag:'折中',recommended:false,desc:'三个页面和卡片继续独立，但迁移到一套共享名单档案；每页保留自己的专用设置。',pros:['任务界面最专注','名单只维护一次','保留全部专用能力'],risks:['主页仍有三张卡','仍需谨慎迁移数据','权重/属性要做扩展字段']}
  ]
};
