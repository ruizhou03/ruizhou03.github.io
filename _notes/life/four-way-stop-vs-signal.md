---
layout: post
title: "美国大学城路口全是 four-way stop，高峰期为什么感觉比红绿灯还慢？"
date: 2026-05-19
main_category: "生活攻略"
sub_category: "生活之问"
keywords: ["four-way stop", "四向停车", "全向停车", "all-way stop", "停车标志路口", "stop sign 路口", "美国路口没有红绿灯", "四向停车效率", "四向停车 vs 红绿灯", "红绿灯和停车标志哪个快", "路口通行能力", "饱和车头时距", "saturation headway", "交叉口延误", "HCM 通行能力手册", "AWSC", "MUTCD 多向停车", "环岛 roundabout", "美国大学城路口", "校园路口", "高峰期堵路口", "为什么美国用停车标志", "四向停车谁先走", "停车让行规则", "four way stop 礼仪", "通行效率交叉点", "four way stop sign"]
permalink: "/life/four-way-stop-vs-signal"
---

# 1. 问题

在美国读书的人几乎都注意到一件事：大学城里大量路口**根本没有红绿灯**，立着的是四块红色八角 STOP 牌，俗称 **four-way stop**（四向停车）——每个方向来的车都得停，先停的先走。

平时它确实挺顺：路上没几辆车，到了路口停一下、看一眼、走，不用对着空路傻等红灯。但只要赶上**上下学高峰**，集中放学那阵子，四个方向全排起长队，每辆车都得老老实实停一次再挪一下，那个路口就像被掐住了喉咙——慢得让人怀疑：**这种时候，是不是还不如装个红绿灯？**

这篇想回答的就是这个问题：你这个“高峰期 four-way stop 效率特别低”的体感，到底对不对？交通工程界有没有研究过？以及——文末给你**一个能拖到达率、能一键在“四向停车 / 红绿灯”之间切换的路口模拟器**，你自己把那个交叉点跑出来。这也是塞车系列的第四篇，前三篇是[幽灵堵车](/life/phantom-traffic-jam)、[变道错觉](/life/lane-change-illusion)。

# 2. 结论先行

- **你的感觉基本是对的，而且这是交通工程里的定论，不是错觉。** 四向停车在**低流量**时延误最小（车少时不用对着空路等红灯）；但它有一个**很低的通行能力天花板**——每辆车都必须完全停下、再轮流逐个通过，高峰期需求一旦超过这个上限，排队就会爆炸式增长。
- **红绿灯的性质正相反**：低流量时它让你对着空荡荡的横向马路干等红灯（更烦、更亏）；但高峰期它能让一个方向以接近**每 2 秒一辆**的“饱和流”连续放行，吞吐量远高于四向停车。
- 于是两者的优劣随车流量**交叉**：低流量四向停车赢，高流量红绿灯赢，中间有一个交叉点。**你高峰期的烦躁，正是车流量已经越过了那个交叉点。** 工程规范也正是这么规定的：低流量小路口优先用四向停车（便宜、安全、低延误），流量大了该上信号灯或环岛——很多情况下**环岛在中等流量比这两者都好**。

下面讲清楚这个天花板从哪来、交叉点长什么样。

# 3. 科学原理

## 3.1 四向停车的天花板：每辆车都得“停—看—走”

四向停车路口的核心约束是规则本身：**每一辆车，无论有没有别的车，都必须完全停住**，然后按“先到先走、同时到右方先走”的规矩，**一辆一辆轮流**通过冲突区。

把一辆车通过路口的“服务时间”拆开看：减速到完全停 → 观察其它三个方向、确认轮到自己（判断/犹豫）→ 起步反应 → 加速穿过路口。这一整套，每辆车都躲不掉，合计大约 **3–5 秒**。也就是说，这个路口每隔 3–5 秒才能放走一辆车，**饱和通行能力被钉死在每方向每小时几百辆的量级**。

对比红绿灯：绿灯亮起后，排队的车是**一串连续起步、不用每辆都从零谈判**的，相邻两车通过停止线的“饱和车头时距”大约 **2 秒**——接近四向停车的两倍效率，而且可以在整个绿灯期间持续输出。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 250" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="340" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">放走同样 5 辆车，谁花的时间长</text>
  <text x="60" y="58" font-size="12" fill="#444" font-weight="600">四向停车</text>
  <g>
    <rect x="60" y="70" width="80" height="26" rx="3" fill="#d98a8a"/><text x="100" y="87" text-anchor="middle" font-size="10" fill="#fff">停·看·走</text>
    <rect x="148" y="70" width="80" height="26" rx="3" fill="#d98a8a"/><text x="188" y="87" text-anchor="middle" font-size="10" fill="#fff">停·看·走</text>
    <rect x="236" y="70" width="80" height="26" rx="3" fill="#d98a8a"/><text x="276" y="87" text-anchor="middle" font-size="10" fill="#fff">停·看·走</text>
    <rect x="324" y="70" width="80" height="26" rx="3" fill="#d98a8a"/><text x="364" y="87" text-anchor="middle" font-size="10" fill="#fff">停·看·走</text>
    <rect x="412" y="70" width="80" height="26" rx="3" fill="#d98a8a"/><text x="452" y="87" text-anchor="middle" font-size="10" fill="#fff">停·看·走</text>
    <text x="500" y="88" font-size="11" fill="#c0504d" font-weight="600">≈ 每辆 4 秒</text>
  </g>
  <text x="60" y="140" font-size="12" fill="#444" font-weight="600">红绿灯（绿灯期间）</text>
  <g>
    <rect x="60" y="152" width="40" height="26" rx="3" fill="#7bb37b"/>
    <rect x="104" y="152" width="40" height="26" rx="3" fill="#7bb37b"/>
    <rect x="148" y="152" width="40" height="26" rx="3" fill="#7bb37b"/>
    <rect x="192" y="152" width="40" height="26" rx="3" fill="#7bb37b"/>
    <rect x="236" y="152" width="40" height="26" rx="3" fill="#7bb37b"/>
    <text x="290" y="170" font-size="11" fill="#2e8b57" font-weight="600">≈ 每辆 2 秒，连续放行</text>
  </g>
  <text x="340" y="220" text-anchor="middle" font-size="11" fill="#888">同样 5 辆车，四向停车花的时间约是红绿灯绿灯期的两倍——这就是高峰期的差距来源</text>
</svg>
<p class="img-caption">四向停车的每一辆车都要重走一遍“停—看—走”，服务时间被钉死；红绿灯绿灯期是一串车连续放行。需求小的时候这点差别看不出来，需求一大，差距就被排队放大成肉眼可见的长龙。</p>

## 3.2 红绿灯的代价：固定损失 + 让人对着空路干等

那为什么不干脆所有路口都装红绿灯？因为红绿灯也有它的固定成本：

- **每个相位都有损失时间。** 黄灯、全红清空、绿灯刚亮时大家的起步反应——每次相位切换都白白损失几秒，一个周期里这部分是纯浪费。
- **它会让没车的方向也等红灯。** 深夜或低峰，你横向明明一辆车都没有，红灯照样让你停 30 秒。四向停车在这种时候完胜——没车就直接走，零等待。

所以红绿灯是一种“**用低流量时的额外等待，换高流量时的高吞吐**”的设计。流量越大，它那套连续放行越划算；流量越小，它那套固定损失和无谓等待越亏。

## 3.3 交叉点：两条延误曲线在某个流量相交

把“平均每辆车被耽误多少秒”对“车流量”画出来，就能看到你那个体感的精确形状：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 350" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="330" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">平均延误 — 车流量：两条曲线在交叉点互换优劣</text>
  <line x1="60" y1="60" x2="60" y2="290" stroke="#888" stroke-width="1.3"/>
  <line x1="60" y1="290" x2="610" y2="290" stroke="#888" stroke-width="1.3"/>
  <text x="40" y="175" text-anchor="middle" font-size="11" fill="#666" transform="rotate(-90 40 175)">平均延误（每辆车被耽误的秒数）</text>
  <text x="335" y="318" text-anchor="middle" font-size="11" fill="#666">车流量（每小时车数）→</text>
  <path d="M60,272 C160,266 230,255 300,232 C360,212 400,180 430,120 C450,86 460,70 470,60" fill="none" stroke="#c0504d" stroke-width="3"/>
  <path d="M60,232 C160,228 280,222 380,214 C470,206 540,196 600,182" fill="none" stroke="#2e8b57" stroke-width="3"/>
  <circle cx="316" cy="226" r="5" fill="#333"/>
  <line x1="316" y1="60" x2="316" y2="290" stroke="#999" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="316" y="50" text-anchor="middle" font-size="11" fill="#333" font-weight="700">交叉点</text>
  <text x="150" y="250" font-size="12" fill="#c0504d" font-weight="600">四向停车</text>
  <text x="120" y="266" font-size="10" fill="#c0504d">低流量赢（不用空等）</text>
  <text x="430" y="100" font-size="11" fill="#c0504d" font-weight="600">触顶后延误爆炸式飙升 ↑</text>
  <text x="500" y="170" font-size="12" fill="#2e8b57" font-weight="600">红绿灯</text>
  <text x="486" y="186" font-size="10" fill="#2e8b57">起点高但平缓、容量大</text>
  <text x="200" y="306" text-anchor="middle" font-size="10" fill="#999">← 这一侧四向停车更顺</text>
  <text x="470" y="306" text-anchor="middle" font-size="10" fill="#999">这一侧红绿灯完胜 →</text>
</svg>
<p class="img-caption">红线（四向停车）起点低——低流量时几乎不耽误你；但一旦需求接近它那个低天花板，延误就<strong>指数式炸起来</strong>。绿线（红绿灯）起点高（总要等相位），但很平、容量大。两线相交处就是该换控制方式的流量。你高峰期的烦躁，是车流量跑到了交叉点右边。</p>

## 3.4 这件事有没有人研究过：有，而且早有规范

这不是民间感觉，是交通工程的成熟课题：

- 美国的**《通行能力手册》（HCM，交通研究委员会出版）**专门有“全向停车控制（AWSC）”一章，用排队/间隙模型估算其通行能力；这条线的奠基工作包括 Richardson（1987）的模型和 Kyte 等人的 NCHRP 研究——结论一致：AWSC 容量显著低于信号控制。
- 美国的交通管制设施标准 **MUTCD** 给“多向停车”设了明确的**安装条件（warrants）**：本质上是一组**流量上限**——只有当各进口流量低于某阈值（且常因事故或视距等安全理由）才适合装四向停车；流量超过就应改用信号或其它方案。换句话说，“四向停车只配给低流量路口”是写进规范的。
- **联邦公路管理局（FHWA）**等机构进一步指出：在很多中等流量场景，**现代环岛**的通行能力和安全性优于四向停车，也优于信号灯（无固定相位损失、不用停等、冲突点更少）——所以“红绿灯 vs 四向停车”常常不是最优的二选一，环岛是第三个、往往更好的答案。

至于大学城为什么明知道高峰慢还大量保留四向停车：**大部分时段流量确实低**（装信号反而亏），而且 stop sign **便宜、维护近乎为零、强制低速、对横穿的行人和自行车更安全**——校园看重的恰恰是安全和低速，不是高峰那十几分钟的通行效率。这是一个“多数时间最优 + 安全优先”压过“高峰效率”的权衡。

## 3.5 自己跑一遍：把那个交叉点找出来

下面是一个十字路口模拟器：四个方向不断来车（只走直行，已简化），你可以**拖动到达率**，并用按钮在「**四向停车**」和「**红绿灯**」两种控制之间一键切换。它会实时统计平均延误、实际通过量和排队长度，并**记住你上一次在另一种模式、同一到达率下的延误**，方便你直接 A/B 对比。

玩法建议：

- 先把到达率拉到**很低**，分别试两种模式——你会发现四向停车的延误更小（红绿灯在让你空等）。
- 再把到达率拉到**很高**，同样两种都试——四向停车会排到天际线、延误飙升，红绿灯则稳得多。
- 在中间慢慢调，找到两种模式延误大致相等的那个到达率：**那就是 3.3 图里的交叉点。**

<div id="fws-sim" style="border:1px solid #d8d4c8;border-radius:10px;padding:14px 16px;margin:1.6em auto;background:#fbfaf6;max-width:600px;font-size:14px;color:#333;">
  <div style="display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center;margin-bottom:10px;">
    <label style="display:flex;align-items:center;gap:8px;">到达率
      <input id="fws-rate" type="range" min="300" max="2600" value="700" step="100" style="vertical-align:middle;">
      <b id="fws-rate-v" style="min-width:78px;display:inline-block;">700 辆/小时</b>
    </label>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
    <button id="fws-mode" style="padding:5px 12px;border:1px solid #b9b3a3;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;font-weight:600;">当前：四向停车（点击切到红绿灯）</button>
    <button id="fws-play" style="padding:5px 12px;border:1px solid #b9b3a3;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">⏸ 暂停</button>
    <button id="fws-reset" style="padding:5px 12px;border:1px solid #b9b3a3;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;">↺ 重置</button>
  </div>
  <canvas id="fws-cv" width="600" height="440" style="width:100%;height:auto;display:block;background:#fff;border-radius:8px;">你的浏览器不支持画布，换个浏览器看这个模拟器。</canvas>
  <div id="fws-stat" style="text-align:center;margin:9px 0 2px;font-size:13px;color:#555;line-height:1.7;">初始化中…</div>
</div>

<script>
(function(){
  var cv = document.getElementById('fws-cv');
  if (!cv || !cv.getContext) return;
  var g = cv.getContext('2d');
  var elRate = document.getElementById('fws-rate');
  var elRateV = document.getElementById('fws-rate-v');
  var elMode = document.getElementById('fws-mode');
  var elPlay = document.getElementById('fws-play');
  var elReset = document.getElementById('fws-reset');
  var elStat = document.getElementById('fws-stat');

  var W = 600, H = 440, cx = 300, cy = 200;
  var B = 76, half = B/2;
  var lineN = cy - half, lineS = cy + half, lineE = cx + half, lineW = cx - half;
  var APP = 150, Dline = APP, Dexit = APP + B, Ddesp = Dexit + 54;
  var off = 12, carLen = 16, carW = 9;
  var v0 = 86, accel = 70, dt = 0.05;
  var stepsPerFrame = 2;

  var awsc = true, running = true, simT = 0;
  var rate = 700;
  var lam = rate/3600;
  var cars = [[],[],[],[]];
  var grantCar = null, grantAp = -1, lastServed = 3, freeAt = 0, lostT = 1.0;
  var phase = 'Ag', phaseT = 0, Tg = 13, Tc = 4;
  var delays = [], clears = [], memo = { a: null, s: null };

  function pcoord(ap, d){
    if (ap===0) return { x: cx-off, y: lineN-APP+d, ang: 0 };
    if (ap===1) return { x: cx+off, y: lineS+APP-d, ang: 0 };
    if (ap===2) return { x: lineE+APP-d, y: cy+off, ang: 1 };
    return { x: lineW-APP+d, y: cy-off, ang: 1 };
  }

  function reset(full){
    cars = [[],[],[],[]];
    grantCar = null; grantAp = -1; lastServed = 3; freeAt = 0;
    phase = 'Ag'; phaseT = 0; simT = 0;
    delays = []; clears = [];
    if (full) memo = { a: null, s: null };
    draw(); stat();
  }

  function frontCar(ap){
    var list = cars[ap], best = null;
    for (var i=0;i<list.length;i++){
      var c = list[i];
      if (c.d < Dline && (best===null || c.d > best.d)) best = c;
    }
    return best;
  }

  function spawn(){
    for (var ap=0;ap<4;ap++){
      if (Math.random() < (lam/4)*dt){
        var list = cars[ap], okv = true;
        for (var i=0;i<list.length;i++){ if (list[i].d < 30){ okv=false; break; } }
        if (okv && list.length < 70){
          list.push({ d: 0, v: v0*0.7, ap: ap, granted: false, crossed: false, tin: simT, rUntil: 0 });
        }
      }
    }
  }

  function updateSignal(){
    phaseT += dt;
    if (phase==='Ag' && phaseT>=Tg){ phase='Ac'; phaseT=0; }
    else if (phase==='Ac' && phaseT>=Tc){ phase='Bg'; phaseT=0; }
    else if (phase==='Bg' && phaseT>=Tg){ phase='Bc'; phaseT=0; }
    else if (phase==='Bc' && phaseT>=Tc){ phase='Ag'; phaseT=0; }
  }

  function updateServer(){
    if (grantCar){
      var still = cars[grantAp].indexOf(grantCar) >= 0;
      if (!still || grantCar.d >= Dexit){
        grantCar = null; freeAt = simT + lostT; lastServed = grantAp;
      }
      return;
    }
    if (simT < freeAt) return;
    for (var k=1;k<=4;k++){
      var ap = (lastServed + k) % 4;
      var fc = frontCar(ap);
      if (fc && (Dline - fc.d) < 16 && fc.v < 13){
        grantCar = fc; grantAp = ap; fc.granted = true; return;
      }
    }
  }

  function allowed(c){
    if (c.d >= Dline) return true;
    if (awsc) return c.granted;
    var grp = c.ap < 2 ? 0 : 1;
    var gg = phase==='Ag' ? 0 : (phase==='Bg' ? 1 : -1);
    return gg === grp;
  }

  function moveApproach(ap){
    var list = cars[ap];
    list.sort(function(p,q){ return q.d - p.d; });
    for (var i=0;i<list.length;i++){
      var c = list[i];
      var leader = i>0 ? list[i-1] : null;
      var gapL = leader ? (leader.d - c.d - carLen) : 1e9;
      var gapStop = allowed(c) ? 1e9 : (Dline - c.d);
      var eff = Math.min(gapL, gapStop);
      if (eff < 0) eff = 0;
      var vSafe = Math.sqrt(Math.max(0, 2*accel*Math.max(0, eff - 2)));
      var nv = Math.min(v0, c.v + accel*dt, vSafe);
      if (nv < 0) nv = 0;
      if (c.v < 3 && nv > 3){
        if (c.rUntil === 0) c.rUntil = simT + 0.85;
        if (simT < c.rUntil) nv = 0; else c.rUntil = 0;
      } else if (c.v >= 3){ c.rUntil = 0; }
      c.v = nv;
      c.d += c.v*dt;
      if (!c.crossed && c.d >= Dexit){
        c.crossed = true;
        var fl = Dexit / v0;
        delays.push(Math.max(0, (simT - c.tin) - fl));
        if (delays.length > 90) delays.shift();
        clears.push(simT);
      }
    }
    for (var j=list.length-1;j>=0;j--){ if (list[j].d > Ddesp) list.splice(j,1); }
  }

  function tick(){
    simT += dt;
    spawn();
    if (awsc) updateServer(); else updateSignal();
    for (var ap=0;ap<4;ap++) moveApproach(ap);
    while (clears.length && clears[0] < simT - 25) clears.shift();
  }

  function carColor(c){ return c.v < 6 ? '#c0504d' : (c.v < 40 ? '#d4a017' : '#2e8b57'); }

  function draw(){
    g.clearRect(0,0,W,H);
    g.fillStyle = '#eceae2';
    g.fillRect(cx-24, 0, 48, H);
    g.fillRect(0, cy-24, W, 48);
    g.fillStyle = '#f6f4ec';
    g.fillRect(cx-half, cy-half, B, B);
    g.strokeStyle = '#d8d4c6'; g.setLineDash([6,6]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx,0); g.lineTo(cx,H); g.moveTo(0,cy); g.lineTo(W,cy); g.stroke();
    g.setLineDash([]);
    var sigCol = function(ap){
      if (awsc) return null;
      var grp = ap<2?0:1, gg = phase==='Ag'?0:(phase==='Bg'?1:-1);
      return gg===grp ? '#2e8b57' : '#c0504d';
    };
    var marks = [ [cx-off,lineN],[cx+off,lineS],[lineE,cy+off],[lineW,cy-off] ];
    for (var m=0;m<4;m++){
      if (awsc){
        g.fillStyle = (grantAp===m && grantCar) ? '#2e8b57' : '#c0504d';
        g.beginPath(); g.arc(marks[m][0], marks[m][1], 4.5, 0, 2*Math.PI); g.fill();
      } else {
        g.fillStyle = sigCol(m);
        g.beginPath(); g.arc(marks[m][0], marks[m][1], 5, 0, 2*Math.PI); g.fill();
      }
    }
    for (var ap=0;ap<4;ap++){
      var list = cars[ap];
      for (var i=0;i<list.length;i++){
        var c = list[i], pc = pcoord(ap, c.d);
        g.fillStyle = carColor(c);
        if (pc.ang===0) g.fillRect(pc.x-carW/2, pc.y-carLen/2, carW, carLen);
        else g.fillRect(pc.x-carLen/2, pc.y-carW/2, carLen, carW);
      }
    }
    g.fillStyle = '#9a9a9a'; g.font = '12px sans-serif'; g.textAlign = 'center';
    g.fillText(awsc ? '四向停车：一次只放一辆，每辆都先停' : '红绿灯：绿向连续放行，红向等相位', cx, H-10);
  }

  function stat(){
    var avg = delays.length ? (delays.reduce(function(a,b){return a+b;},0)/delays.length) : 0;
    var thru = Math.round(clears.length / 25 * 3600);
    var q = 0;
    for (var ap=0;ap<4;ap++) for (var i=0;i<cars[ap].length;i++) if (cars[ap][i].v < 6) q++;
    if (delays.length >= 12){ if (awsc) memo.a = avg; else memo.s = avg; }
    var line1 = (awsc ? '四向停车' : '红绿灯') + ' ｜ 到达率 ' + rate + ' 辆/小时 ｜ 实际通过 ' + thru + ' 辆/小时';
    var line2 = '平均延误 ' + avg.toFixed(1) + ' s ｜ 当前排队 ' + q + ' 辆';
    var verdict;
    if (memo.a !== null && memo.s !== null){
      var win = memo.a < memo.s ? '四向停车' : '红绿灯';
      verdict = `<b style='color:#1f6fd0;'>同一到达率下 — 四向停车 ` + memo.a.toFixed(1) + ` s，红绿灯 ` + memo.s.toFixed(1) + ` s：` + win + ` 更优</b>`;
    } else {
      verdict = `<span style='color:#888;'>把两种模式各跑十几秒，这里会出现同流量下的 A/B 对比</span>`;
    }
    elStat.innerHTML = line1 + '<br>' + line2 + '<br>' + verdict;
  }

  function frame(){
    if (running){ for (var k=0;k<stepsPerFrame;k++) tick(); draw(); stat(); }
    requestAnimationFrame(frame);
  }

  elRate.addEventListener('input', function(){
    rate = parseInt(elRate.value,10); lam = rate/3600;
    elRateV.textContent = rate + ' 辆/小时';
    reset(true);
  });
  elMode.addEventListener('click', function(){
    awsc = !awsc;
    elMode.textContent = awsc ? '当前：四向停车（点击切到红绿灯）' : '当前：红绿灯（点击切到四向停车）';
    reset(false);
  });
  elPlay.addEventListener('click', function(){ running=!running; elPlay.textContent = running?'⏸ 暂停':'▶ 播放'; });
  elReset.addEventListener('click', function(){ reset(true); });

  elRateV.textContent = rate + ' 辆/小时';
  reset(true);
  requestAnimationFrame(frame);
})();
</script>

你会摸到一个很清楚的规律：**到达率低时切到红绿灯，平均延误反而变大**（你在替没有车的横向等红灯）；**到达率高时切回四向停车，延误和排队会失控飙升**（撞上那个低天花板）。把到达率慢慢往上推、两种模式来回切，你就亲手量出了那个交叉点——它右边，就是你高峰期那条长龙所在的区域。

（模型做了简化：只走直行、单车道、四向停车按“一次一辆轮流”建模，没有右转空档和真实人类的犹豫差异，所以绝对数值别当真；但“低流量四向停车赢、高流量红绿灯赢、中间有交叉点”这个**定性结论**是稳的，和交通工程文献一致。顺带一提，绿灯刚亮时那一串车一个接一个启动的“启动波”，正是[幽灵堵车](/life/phantom-traffic-jam)那篇讲的反应延迟在小尺度上的样子。）

# 4. 实践建议

- **接受“四向停车在高峰慢”是设计取舍，不是路口坏了。** 它换来的是低流量时段的低延误、近乎零的维护成本、强制低速和对行人/骑行者的安全。校园尤其看重后面这些。
- **真到了天天高峰排长龙，该反馈的是“申请改信号或环岛”**，而不是抱怨。MUTCD 的多向停车安装条件本质是流量阈值，长期超阈值就具备了改造依据；很多路口的信号化/环岛化正是居民和学校反馈推动的。环岛在中等流量常常比红绿灯和四向停车都好，可以一并提。
- **把四向停车的规矩用对，路口就能快不少**：完全停住（不是“滑行带刹”）、**先停的先走**、几乎同时到则**右手边的先走**、轮到自己就果断通过别犹豫——四向停车的效率高度依赖大家不磨蹭，集体的犹豫会让本就低的通行能力雪上加霜。
- **行人和骑车人反而受益于四向停车**：所有车都必须停，过街的冲突速度低、可预期——这也是它在校园被保留的关键原因之一。

# 5. 参考来源

1. **Transportation Research Board.** *Highway Capacity Manual (HCM).* ——“全向停车控制（AWSC）”通行能力与延误的标准分析方法，AWSC 容量显著低于信号控制的权威依据。
2. **Richardson AJ.** **A delay model for multiway stop-sign intersections.** *Transportation Research Record.* 1987;1112:107–114. ——四向停车延误/容量建模的奠基论文。
3. **Kyte M, et al. (NCHRP).** *Capacity and Level of Service at Unsignalized Intersections.* NCHRP Project 3-46, 1996. ——无信号交叉口（含 AWSC）通行能力的系统研究，HCM 方法的来源之一。
4. **Federal Highway Administration / US DOT.** *Manual on Uniform Traffic Control Devices (MUTCD), “Multiway Stop Applications”.* ——多向停车的安装条件（warrants），本质是一组流量上限阈值。
5. **Federal Highway Administration.** *Roundabouts: An Informational Guide (NCHRP Report 672) / Intersection Safety.* ——现代环岛在通行能力与安全上常优于四向停车与信号灯的官方依据。
