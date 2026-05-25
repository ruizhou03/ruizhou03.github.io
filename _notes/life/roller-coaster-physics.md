---
layout: post
title: "过山车没有发动机，为什么还能那么快？那一下失重感又是哪来的？"
date: 2026-05-19
main_category: "生活攻略"
sub_category: "生活之问"
permalink: "/life/roller-coaster-physics"
keywords: ["过山车原理", "过山车物理", "过山车失重感", "过山车为什么失重", "过山车有发动机吗", "过山车怎么动的", "失重感来源", "airtime 抛飞感", "g 力 g-force", "视重 表观重量", "过山车几个g", "向心力", "势能动能转换", "为什么第一个坡最高", "过山车回环", "回旋曲线 clothoid", "泪滴形回环", "弹射过山车", "过山车晕车", "过山车坐哪节最刺激", "roller coaster physics", "过山车加速减速", "过三车"]
---

# 1. 问题

坐过山车，最难忘的从来不是最快那一下，而是冲过坡顶、车头开始往下扎的那半秒——胃猛地往上一提，整个人像要从座位里飘出去，安全压杠成了你和天空之间唯一的东西。那种感觉，和电梯突然下坠、和飞机遇到气流往下掉，是同一种：**失重**。

可这里有个怪事。过山车的轨道上没有发动机，车厢里也没有，全程除了最开始被一根链条拖上去，没有任何东西在“推”它。一辆几吨重、坐满人的车，凭什么能在没有动力的情况下，越跑越快、连甩几个回环、最后还能自己回到站台？

这篇想把两件事讲透：**没有发动机的过山车靠什么跑起来**，以及**那股让你胃往上提的失重感，到底是什么力（或者说，什么力的消失）**。

# 2. 结论先行

三句话先给你：

- **过山车是一台“重力储蓄罐”**。除了弹射式，所有过山车都只在最开始被拉到最高点存一笔“高度”，之后全程就是高度（势能）和速度（动能）之间反复兑换，摩擦和空气阻力一路抽税——所以**第一个坡必须是全程最高的，后面的坡只能一个比一个矮**。
- **你身体感觉到的“重量”，从来不是地球的引力本身，而是座椅和压杠顶你的那个力**（物理上叫支持力 / 法向力）。这个力变大，你被压进座椅；变小，你发飘；归零，就是失重；变成“拉”你，就是那种要被甩出去的抛飞感。
- 过山车工程师真正在设计的不是“多快”，而是**你身上那条 g 力曲线**——什么时候压你、什么时候放你、什么时候让你瞬间失重，全是算好的。

下面分开讲。

# 3. 科学原理

## 3.1 一台没有发动机的机器，靠什么跑

绝大多数过山车（传统链条式）的全部动力，来自开场那段慢吞吞的爬升：一根埋在轨道里的链条，咔哒咔哒把你拖到全程最高点。这一步做的唯一一件事，是给整列车**充进一大笔重力势能**——你被举得越高，存进去的越多。

链条一脱开，这台机器就再没有任何外部动力了。接下来发生的全部事情，可以用一句话概括：**势能和动能之间来回兑换，中途被摩擦和空气阻力持续抽税。**

- 往下冲：高度换速度，势能→动能，越来越快。
- 往上爬：速度换高度，动能→势能，越来越慢。
- 全程：轮子与轨道的摩擦、车体推开空气的阻力，把总能量一点点磨成热散掉——这部分**只出不进**。

“抽税”这件事是理解整条轨道布局的关键。因为能量只会越来越少，永远不可能凭空多出来，所以**任何一个后面的坡，都不可能比前一个高**——你手里的“高度预算”只会缩水。第一个坡之所以是全程最高，就是因为它要为后面**所有**动作（每一个爬升、每一个回环、克服全程所有摩擦）一次性买单。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 360" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="340" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">能量沿轨道：势能 ↔ 动能，总量被摩擦抽税（虚线一路下滑）</text>
  <line x1="50" y1="300" x2="650" y2="300" stroke="#888" stroke-width="1.3"/>
  <line x1="50" y1="60" x2="50" y2="300" stroke="#888" stroke-width="1.3"/>
  <text x="40" y="300" text-anchor="end" font-size="11" fill="#666">0</text>
  <text x="24" y="180" text-anchor="middle" font-size="11" fill="#666" transform="rotate(-90 24 180)">能量 / 高度</text>
  <path d="M50,90 C110,90 120,90 150,150 C180,210 200,250 240,250 C280,250 300,170 330,170 C360,170 365,235 390,235 C420,235 430,150 470,180 C510,210 520,255 560,255 C600,255 620,275 650,275" fill="none" stroke="#3a6ea5" stroke-width="3" stroke-linejoin="round"/>
  <path d="M50,90 C150,92 250,110 350,150 C460,193 560,235 650,275" fill="none" stroke="#c0504d" stroke-width="2" stroke-dasharray="6,4"/>
  <circle cx="50" cy="90" r="5" fill="#3a6ea5"/>
  <text x="62" y="84" font-size="11" fill="#3a6ea5" font-weight="600">最高点：势能满格、速度≈0</text>
  <text x="248" y="272" font-size="11" fill="#444">谷底：速度最快</text>
  <text x="646" y="236" text-anchor="end" font-size="11" fill="#444">越往后高度预算越少</text>
  <text x="350" y="342" text-anchor="middle" font-size="11" fill="#c0504d" font-weight="600">红色虚线＝总机械能：摩擦/空气阻力只降不升</text>
</svg>
<p class="img-caption">蓝线是轨道高度剖面，车在它上面跑：低处快、高处慢。红色虚线是这列车手里的<strong>总机械能</strong>，因为摩擦和空气阻力，它只会一路往下滑——这就是为什么没有任何一个后坡能高过第一个坡。</p>

少数“弹射式过山车”（launched coaster）不靠链条爬坡，而是用直线电机、液压或飞轮，在两三秒内把车从静止直接弹到一百多公里时速。那是真有外部动力的一次性注入，但注入完之后，剩下的旅程仍然是同一套势能↔动能的兑换游戏。

## 3.2 你感觉到的“重”，根本不是重力

这是全篇最反直觉的一点，但它是理解失重感的钥匙。

地球对你的引力（重力）在整个过程中几乎纹丝不动——你在坡顶、谷底、回环里，体重计上的“真实重力”都是同一个值。**可你的身体明明能清楚地感到忽轻忽重。这个忽轻忽重，感觉的不是重力，而是“座椅／压杠顶着你的那个力”有多大。**

物理上这个力叫**支持力**（更准确说是法向力），日常我们能感知到的“体重”其实是它，可以叫**视重**（表观重量）。安静站着时，地面顶你的力恰好等于你的重力，所以你感觉“正常”。一旦这个顶你的力变了，身体立刻就报警：

- 顶你的力 **变大** → 被压进座椅，“变重”了（谷底、急转弯）。
- 顶你的力 **变小** → 发飘、轻飘飘（坡顶）。
- 顶你的力 **归零** → 完全失重。这正是自由落体的状态：没有任何东西托着你，你和过山车一起往下掉，于是胃里的器官也一起“掉”，那股上提感就来了。
- 顶你的力 **反过来变成“拉”你** → 这就是过山车迷专门追求的 **airtime（抛飞感）**：车往下扎得太猛，座椅根本来不及托住你，是**安全压杠反过来拽着你**别飞出去。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="360" y="20" text-anchor="middle" font-size="14" fill="#333" font-weight="600">同一个人，同一个重力，三处“视重”完全不同</text>
  <text x="360" y="38" text-anchor="middle" font-size="11" fill="#999">灰色＝重力（三处一样长）；绿/红＝座椅或压杠施加的力</text>
  <!-- valley -->
  <g>
    <path d="M60,80 Q130,210 200,80" fill="none" stroke="#bbb" stroke-width="3"/>
    <rect x="117" y="123" width="26" height="22" rx="3" fill="#5a8fc0"/>
    <line x1="130" y1="123" x2="130" y2="52" stroke="#2e7d32" stroke-width="3.5" marker-end="url(#au)"/>
    <line x1="130" y1="145" x2="130" y2="195" stroke="#9a9a9a" stroke-width="2.5" marker-end="url(#ad)"/>
    <text x="151" y="80" font-size="10" fill="#2e7d32">座椅猛顶</text>
    <text x="151" y="180" font-size="10" fill="#999">重力</text>
    <text x="130" y="230" text-anchor="middle" font-size="13" fill="#333" font-weight="600">谷底</text>
    <text x="130" y="250" text-anchor="middle" font-size="11" fill="#2e7d32">支持力 ＞ 重力 → 重（4–6 g）</text>
  </g>
  <!-- crest -->
  <g>
    <path d="M290,170 Q360,30 430,170" fill="none" stroke="#bbb" stroke-width="3"/>
    <rect x="347" y="78" width="26" height="22" rx="3" fill="#5a8fc0"/>
    <line x1="360" y1="78" x2="360" y2="56" stroke="#2e7d32" stroke-width="3.5" marker-end="url(#au)"/>
    <line x1="360" y1="100" x2="360" y2="150" stroke="#9a9a9a" stroke-width="2.5" marker-end="url(#ad)"/>
    <text x="379" y="68" font-size="10" fill="#c0504d">座椅几乎托不住</text>
    <text x="379" y="132" font-size="10" fill="#999">重力</text>
    <text x="360" y="230" text-anchor="middle" font-size="13" fill="#333" font-weight="600">坡顶</text>
    <text x="360" y="250" text-anchor="middle" font-size="11" fill="#c0504d">支持力 ＜ 重力 → 发飘、失重</text>
  </g>
  <!-- drop / airtime -->
  <g>
    <path d="M530,62 Q590,82 650,192" fill="none" stroke="#bbb" stroke-width="3"/>
    <rect x="577" y="93" width="26" height="22" rx="3" fill="#5a8fc0"/>
    <line x1="590" y1="60" x2="590" y2="91" stroke="#c0504d" stroke-width="3.5" marker-end="url(#ad2)"/>
    <line x1="590" y1="115" x2="590" y2="165" stroke="#9a9a9a" stroke-width="2.5" marker-end="url(#ad)"/>
    <text x="607" y="66" font-size="10" fill="#c0504d">压杠拽住你</text>
    <text x="607" y="148" font-size="10" fill="#999">重力</text>
    <text x="590" y="230" text-anchor="middle" font-size="13" fill="#333" font-weight="600">猛扎下坡</text>
    <text x="590" y="250" text-anchor="middle" font-size="11" fill="#c0504d">压杠反过来“拉”你 → 抛飞感（负 g）</text>
  </g>
  <defs>
    <marker id="au" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,10 L5,0 L10,10 z" fill="#2e7d32"/></marker>
    <marker id="ad" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L5,10 L10,0 z" fill="#9a9a9a"/></marker>
    <marker id="ad2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L5,10 L10,0 z" fill="#c0504d"/></marker>
  </defs>
</svg>
<p class="img-caption">绿色／红色箭头是座椅或压杠施加的力，灰色向下箭头是始终不变的重力。三处重力一模一样，但<strong>顶你的那个力</strong>差别巨大——身体感觉到的“轻重”，全是它说了算。</p>

一个家常类比：电梯。电梯起步上行的瞬间你感觉变重，到顶减速时感觉变轻；如果钢缆突然断了（别试），你会完全失重地飘在轿厢里——这一路里，地球对你的引力压根没变过，变的全是脚下地板顶你的力。过山车把这个体验做成了一分钟里反复上演十几次的版本。

## 3.3 坡顶为什么会失重：把“转弯”算进来

光有上下起伏还不够解释那股强烈的抛飞感，真正的主角是**走弧线时的向心力**。

任何让你走曲线而不是直线的运动，都需要一个指向曲线“内侧圆心”的力，叫向心力，大小是 mv²/r（m 是质量，v 是速度，r 是那段弧的弯曲半径）。过山车的坡顶和谷底，恰好是两段弯曲方向相反的弧：

- **谷底**是一段“开口朝上”的弧，圆心在你**上方**，所以需要一个**向上**的净力。座椅必须使劲往上顶你，顶的力＝你的重力＋那份向心力。结果就是支持力远大于重力，你被死死压进座位——这就是谷底那几秒“几个 g、抬不起头”的来源（典型 4–6 g，意味着你感觉自己重了四到六倍）。
- **坡顶**是一段“开口朝下”的弧，圆心在你**下方**，需要一个**向下**的净力。这份向下的力由谁出？重力本来就向下，正好派上用场。于是关系变成：座椅顶你的支持力＝重力 − 这份向心需求。速度越快，向心需求 mv²/r 越大，座椅要顶的力就越小。当速度刚好让 mv²/r 等于重力时，**座椅顶你的力归零——这就是坡顶失重的瞬间**。再快一点，重力还不够用，得靠安全压杠往下额外拽着你，于是负 g、抛飞感登场。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="350" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">同样在走弧线，坡顶和谷底的受力正好相反</text>
  <!-- crest -->
  <g>
    <path d="M60,170 Q200,40 340,170" fill="none" stroke="#bbb" stroke-width="3"/>
    <circle cx="200" cy="210" r="3" fill="#888"/>
    <text x="200" y="228" text-anchor="middle" font-size="10" fill="#888">圆心在下方</text>
    <line x1="200" y1="110" x2="200" y2="200" stroke="#888" stroke-width="1" stroke-dasharray="3,3"/>
    <rect x="188" y="88" width="24" height="28" rx="3" fill="#5a8fc0"/>
    <line x1="200" y1="116" x2="200" y2="158" stroke="#888" stroke-width="2.5" marker-end="url(#cd)"/>
    <text x="206" y="150" font-size="10" fill="#888">重力</text>
    <line x1="200" y1="116" x2="200" y2="100" stroke="#c0504d" stroke-width="2" marker-end="url(#cu)"/>
    <text x="120" y="80" font-size="12" fill="#333" font-weight="600">坡顶</text>
    <text x="60" y="290" font-size="11" fill="#c0504d">需要的净力朝下（朝圆心）。座椅力 ＝ 重力 − mv²/r，</text>
    <text x="60" y="307" font-size="11" fill="#c0504d">速度够快时归零 → 失重；再快 → 压杠拽你（负 g）</text>
  </g>
  <!-- valley -->
  <g>
    <path d="M380,150 Q520,280 660,150" fill="none" stroke="#bbb" stroke-width="3"/>
    <circle cx="520" cy="110" r="3" fill="#888"/>
    <text x="520" y="104" text-anchor="middle" font-size="10" fill="#888">圆心在上方</text>
    <line x1="520" y1="130" x2="520" y2="225" stroke="#888" stroke-width="1" stroke-dasharray="3,3"/>
    <rect x="508" y="210" width="24" height="28" rx="3" fill="#5a8fc0"/>
    <line x1="520" y1="225" x2="520" y2="265" stroke="#888" stroke-width="2.5" marker-end="url(#cd)"/>
    <text x="526" y="258" font-size="10" fill="#888">重力</text>
    <line x1="520" y1="210" x2="520" y2="145" stroke="#2e7d32" stroke-width="3" marker-end="url(#cu2)"/>
    <text x="445" y="262" font-size="12" fill="#333" font-weight="600">谷底</text>
    <text x="392" y="292" font-size="11" fill="#2e7d32">需要的净力朝上（朝圆心）。座椅力 ＝ 重力 ＋ mv²/r，</text>
    <text x="392" y="309" font-size="11" fill="#2e7d32">远大于重力 → 被压进座椅（4–6 g）</text>
  </g>
  <defs>
    <marker id="cu" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,10 L5,0 L10,10 z" fill="#c0504d"/></marker>
    <marker id="cu2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,10 L5,0 L10,10 z" fill="#2e7d32"/></marker>
    <marker id="cd" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L5,10 L10,0 z" fill="#888"/></marker>
  </defs>
</svg>
<p class="img-caption">关键差别只有一个：坡顶的“圆心”在你下方，谷底的“圆心”在你上方，于是向心力的方向相反。坡顶时重力刚好替向心力分担，座椅就省力甚至下岗——失重由此而来。</p>

所以那股“胃往上提”的感觉，本质上是：**在坡顶或猛下坡的瞬间，托着你内脏的支持力突然消失甚至反向，内脏在体腔里短暂地自由“漂”了一下**，前庭和内脏神经把这个异常状态翻译成了那种又爽又慌的失重感。

## 3.4 各种推力与阻力，谁在管什么

把过山车一圈里所有的“力”理一遍，分工很清楚：

- **重力**：唯一的“发动机”（弹射式除外）。它在你下坡时做正功（加速），上坡时做负功（减速），全程能量的总搬运工。
- **支持力 / 法向力**：座椅和轨道对你的约束力。它不改变速度大小，只负责“掰弯”你的轨迹（提供向心力），同时正是你身体感知“轻重”的那个力。
- **摩擦力**：轮子轴承、轮子与轨道之间。持续、小额、只抽税不返还，是速度慢慢损耗的主因之一。终点站的刹车（多为不接触车体的涡流磁刹）则是工程师主动加的、可控的大额“抽税”，专门用来把剩下的能量安全清零。
- **空气阻力**：随速度平方增大（v 翻倍，阻力变四倍）。低速时几乎可忽略，高速段它是吃掉能量的大头——这也是为什么过山车不可能靠重力“永动”下去。

把这些放一起就能解释整条轨道的形状逻辑：开局拉到最高，先用一个最大的俯冲把势能猛换成速度（这里最快、谷底最“重”），然后趁速度还高赶紧安排回环和爬升，因为每一段都在被摩擦和空气阻力抽税，**动作必须按“能量预算从多到少”的顺序排，越往后越温和、越矮**，最后用刹车把残值清零、稳稳进站。

## 3.5 回环为什么不是正圆，而是“泪滴形”

你仔细看过山车的竖直回环，会发现它不是一个圆，而是上窄下宽、像水滴的形状。这不是为了好看，是为了**保命**。

如果回环是个标准正圆：要让车在最高点（头朝下）不掉下来，最低得有个速度让向心力够用；可同一个圆、同样这套速度，到了回环底部，半径没变、速度却因为下降而变得更大，mv²/r 会飙到非常高——乘客在底部会承受危险的、可能让人黑视甚至受伤的过载。

工程师的解法是用一种叫**回旋曲线（clothoid，又称欧拉螺线）**的形状：曲率（弯曲程度）随路径长度平滑变化。直观说就是——**回环顶部用很小的半径**（这里速度慢，小半径也能凑够向心力，不必要求过高的最低速度）；**底部用很大的半径**（这里速度快，大半径把 mv²/r 压下来，过载就温和了）。于是整圈下来 g 力被“抹平”，既不会在顶部松脱，也不会在底部压伤人。现代过山车的竖直回环几乎全是这种泪滴形。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 320" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="310" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">正圆回环 vs 泪滴形（回旋曲线）回环</text>
  <g>
    <circle cx="160" cy="170" r="90" fill="none" stroke="#c0504d" stroke-width="3"/>
    <text x="160" y="295" text-anchor="middle" font-size="12" fill="#c0504d" font-weight="600">正圆：半径处处相同</text>
    <text x="160" y="313" text-anchor="middle" font-size="11" fill="#c0504d">底部速度快 → mv²/r 飙高，过载危险</text>
    <text x="160" y="80" text-anchor="middle" font-size="10" fill="#666">顶部</text>
    <text x="160" y="266" text-anchor="middle" font-size="10" fill="#666">底部</text>
  </g>
  <g>
    <path d="M460,260 C400,250 392,150 440,108 C470,82 510,82 540,108 C588,150 580,250 520,260 C500,264 480,264 460,260 Z" fill="none" stroke="#2e7d32" stroke-width="3"/>
    <text x="490" y="295" text-anchor="middle" font-size="12" fill="#2e7d32" font-weight="600">泪滴形：顶小半径、底大半径</text>
    <text x="490" y="313" text-anchor="middle" font-size="11" fill="#2e7d32">大半径压住底部 mv²/r → g 力被抹平</text>
    <text x="490" y="100" text-anchor="middle" font-size="10" fill="#666">顶（半径小）</text>
    <text x="490" y="276" text-anchor="middle" font-size="10" fill="#666">底（半径大）</text>
  </g>
</svg>
<p class="img-caption">同样是“翻一圈”，正圆会在速度最快的底部制造危险的高过载；泪滴形回环用“顶部小半径、底部大半径”把整圈的 g 力压平——这是过山车工程里最经典的一个设计。</p>

# 4. 实践建议

知道了原理，玩起来可以更有数：

- **想要最强失重感，坐最后一节车厢。** 当车头已经冲过坡顶开始下扎、把整列车往下拽时，最后一节还在坡这边，会以最高的速度被“甩”过坡顶——airtime 最猛。想体验最长的“吊在坡顶”那种悬空感，则坐第一节（车头最先探出坡顶、悬得最久）。中间最平淡。
- **怕失重就别坐尾节，挑中间偏前。** 同理，越靠中间 g 力变化越缓和。
- **失重那下，别绷着也别屏气。** 那股不适主要来自内脏短暂“漂浮”和前庭反应，正常呼吸、靠在椅背上、看远处固定的地平线，比死盯着脚下翻滚的轨道舒服得多。
- **晕过山车，多半是“看到的”和“感觉到的”打架。** 内耳前庭报告的剧烈翻滚，和眼睛（盯着近处或闭眼）给的信息对不上，大脑就晕——所以闭眼往往更晕，**睁眼看向运动的前方**反而稳。空腹或太饱都更容易难受，坐前别吃太撑。
- **下坡谷底那几秒抬不起头、手发沉是正常的。** 那是 4–6 g 把你压进座椅，不是身体出问题；提前知道就不会慌。有心血管问题、孕妇、颈椎不好的人要认真对待入口处的健康提示——高 g 和反复的负 g 对这些情况是真的有风险。

# 5. 参考来源

1. **Halliday D, Resnick R, Walker J.** *Fundamentals of Physics.* Wiley. ——大学普通物理经典教材，能量守恒、向心力、视重（apparent weight）等概念的标准出处。
2. **Hewitt PG.** *Conceptual Physics.* Pearson. ——以过山车、电梯失重为典型例子讲解“视重”和自由落体的科普向物理教材。
3. **Pendrill A-M.** **Rollercoaster loop shapes.** *Physics Education.* 2005;40(6):517–521. ——专门分析过山车回环为何采用回旋曲线（clothoid）而非正圆、以及沿程 g 力的物理论文。
4. **Pendrill A-M, Eager D.** **Free fall and weightlessness in amusement rides.** *Physics Education.* 2020;55:055017. ——系统讨论游乐设施中的失重、负 g（airtime）与表观重量的来源。
5. **Schützmannsky K. / Stengel W.** *Roller Coaster: Der Achterbahn-Designer Werner Stengel.* ——记录过山车工程师 Werner Stengel 引入回旋曲线设计的工程实践资料。
