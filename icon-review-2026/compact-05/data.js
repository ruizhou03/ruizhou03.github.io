window.ICON_COMPACT5_DATA={
  format:'ICON_REVIEW_V2',batch:'sitewide-png-compact-05',revision:5,auditedCommit:'dfbb5042',
  locked:[
    {id:'toolbox.blackjack',name:'21 点',src:'../compact-03/assets/png/blackjack.png',decision:'compact-r3'},
    {id:'toolbox.solitaire',name:'接龙纸牌',src:'../compact-03/assets/png/solitaire.png',decision:'compact-r3'},
    {id:'toolbox.random',name:'随机数生成器',src:'../compact-04/assets/png/random.png',decision:'compact-r4'},
    {id:'toolbox.time',name:'时间工具',src:'../compact-04/assets/png/time.png',decision:'compact-r4'},
    {id:'toolbox.grouper',name:'随机分组器',src:'../compact-04/assets/png/grouper.png',decision:'compact-r4'}
  ],
  items:[
    {id:'toolbox.metronome',name:'节拍器',feedback:'重新设计，现在你有点故步自封了。',choices:[
      {id:'A',slug:'metronome-a',label:'经典单轮廓',desc:'正面机身、刻度与单一摆杆，删掉侧旋钮和装饰。'},
      {id:'B',slug:'metronome-b',label:'摆动节拍',desc:'不画三角机身，只画摆动轨迹、摆锤、底座和强拍点。'},
      {id:'C',slug:'metronome-c',label:'节拍点列',desc:'实心机身配五个节拍点，中间强拍放大。'}]},
    {id:'toolbox.pitch',name:'音高测量',feedback:'不够直观，像一个电压表了反而。',choices:[
      {id:'A',slug:'pitch-a',label:'音符升降',desc:'大音符配上下双箭头，直接表达音高变化。'},
      {id:'B',slug:'pitch-b',label:'音符高度线',desc:'音符落在三条高度线上，再用上箭头强调高低。'},
      {id:'C',slug:'pitch-c',label:'音叉 Hz',desc:'技术向：粗音叉中直接标 Hz，突出频率测量。'}]},
    {id:'toolbox.picker',name:'遇事不决',feedback:'推倒这版设计，多来几版；现在“转盘”仍不直观。',choices:[
      {id:'A',slug:'picker-a',label:'实体奖品轮',desc:'六分区轮、顶部指针、双腿和木质底座。'},
      {id:'B',slug:'picker-b',label:'桌游指针盘',desc:'方形桌游板中放置可旋转的大指针。'},
      {id:'C',slug:'picker-c',label:'旋转轨迹轮',desc:'大扇区轮配外侧粗旋转箭头，强调转动。'}]},
    {id:'toolbox.roll-call',name:'随机点名',feedback:'太抽象了。',choices:[
      {id:'A',slug:'roll-call-a',label:'名单高亮',desc:'名单中一行被高亮，右侧指针正选中该行。'},
      {id:'B',slug:'roll-call-b',label:'抽出名签',desc:'名签堆中抽出一张带人物的卡，并加选中星。'},
      {id:'C',slug:'roll-call-c',label:'聚光选中',desc:'三个人中间一人被虚线聚光圈锁定。'}]},
    {id:'toolbox.countdown',name:'倒计时面板',feedback:'为什么是数字 3 在中间呢？',choices:[
      {id:'A',slug:'countdown-a',label:'日历时钟',desc:'日历配大时钟与递减横线，不使用任意数字。'},
      {id:'B',slug:'countdown-b',label:'日历沙漏',desc:'日历中直接放沙漏，保留两个事件圆点。'},
      {id:'C',slug:'countdown-c',label:'撕页截止旗',desc:'叠放日历页配截止旗，强调日期逐页逼近。'}]}
  ]
};
