---
layout: post
title: "色盲到底是看不见颜色，还是看到不一样的颜色？"
date: 2026-04-28
main_category: "生活攻略"
sub_category: "生活之问"
permalink: "/life/color-blindness-mechanism"
---

# 1. 问题

那天和朋友在咖啡馆吃饭，他随口说了一句：“我色弱，所以咖啡的拉花我看上去就跟你不一样。” 我下意识反应：“啊？那你看到的是黑白世界？” 他笑着摇头：“不是不是，我看得到颜色。我做色盲测试图的时候是这样的——能看到一个数字，但是错的。”

我愣了一下：能“看到错的答案”？这跟我以为的“色盲就是看不见颜色”完全对不上。后来才发现，我的认知是错的——绝大多数被叫做“色盲”“色弱”的人都看得到颜色，而那种能“看到错的答案”的现象，本身就是色觉异常机制最精妙的证据。

这篇文章想把这件事彻底讲清楚：色盲和色弱到底是怎么“看”颜色的？为什么色弱的人看色盲测试图会给出“错的”答案而不是“看不见”？背后的视觉机制是什么？

# 2. 结论先行

三件事一句话讲清楚：

- **真正的“黑白世界”极其罕见**——只有约 1/30,000 的“全色盲”才符合“完全看不见颜色”的字面定义。
- **绝大多数色觉异常者看得到颜色**，只是色彩空间被压扁了——红绿这一维度被砍掉或塌缩，世界从三维色彩退化成二维。
- **石原色盲测试图的精妙**在于它专门设计成两类人各自能“看到不同的图案”——色弱者不是看不到答案，而是基于不同的视觉信号给出了“另一个、可预测的、错的”答案。这种差异本身就是诊断依据。

下面分别讲机制。

# 3. 科学原理

## 3.1 我们怎么“看”颜色：三种视锥细胞

人眼视网膜上有两类感光细胞：**视杆细胞**（rod）负责弱光下的明暗（夜里看东西全是灰的就是这个原因），**视锥细胞**（cone）负责亮光下的颜色和细节。

视锥细胞分三种，各自对不同波长的光最敏感：

- **L 锥**（Long-wavelength）：峰值约 564 nm，红色附近
- **M 锥**（Medium-wavelength）：峰值约 533 nm，绿色附近
- **S 锥**（Short-wavelength）：峰值约 437 nm，蓝色附近

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <defs>
    <linearGradient id="cb-spectrum" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7030a0"/>
      <stop offset="18%" stop-color="#3060c8"/>
      <stop offset="35%" stop-color="#30a0a8"/>
      <stop offset="50%" stop-color="#5cb830"/>
      <stop offset="65%" stop-color="#e8c828"/>
      <stop offset="82%" stop-color="#e87830"/>
      <stop offset="100%" stop-color="#c83030"/>
    </linearGradient>
  </defs>
  <text x="320" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">三种视锥细胞的归一化敏感度曲线</text>
  <line x1="60" y1="50" x2="60" y2="270" stroke="#888" stroke-width="1.3"/>
  <text x="50" y="55" text-anchor="end" font-size="11" fill="#666">1.0</text>
  <text x="50" y="163" text-anchor="end" font-size="11" fill="#666">0.5</text>
  <text x="50" y="274" text-anchor="end" font-size="11" fill="#666">0</text>
  <text x="22" y="160" text-anchor="middle" font-size="11" fill="#666" transform="rotate(-90 22 160)">敏感度</text>
  <line x1="60" y1="270" x2="600" y2="270" stroke="#888" stroke-width="1.3"/>
  <rect x="60" y="270" width="540" height="10" fill="url(#cb-spectrum)" opacity="0.6"/>
  <text x="94" y="298" text-anchor="middle" font-size="11" fill="#666">400</text>
  <text x="178" y="298" text-anchor="middle" font-size="11" fill="#666">450</text>
  <text x="263" y="298" text-anchor="middle" font-size="11" fill="#666">500</text>
  <text x="347" y="298" text-anchor="middle" font-size="11" fill="#666">550</text>
  <text x="431" y="298" text-anchor="middle" font-size="11" fill="#666">600</text>
  <text x="516" y="298" text-anchor="middle" font-size="11" fill="#666">650</text>
  <text x="600" y="298" text-anchor="middle" font-size="11" fill="#666">700</text>
  <text x="330" y="315" text-anchor="middle" font-size="11" fill="#888">波长 (nm)</text>
  <polyline points="94,257 111,221 128,149 144,71 156,50 170,77 186,157 203,226 220,259" fill="none" stroke="#3060c8" stroke-width="2.5" stroke-linejoin="round"/>
  <polyline points="212,265 229,256 246,234 263,194 280,139 297,83 314,52 318,50 330,60 347,104 364,162 381,212 398,245 415,261 431,267" fill="none" stroke="#5cb830" stroke-width="2.5" stroke-linejoin="round"/>
  <polyline points="229,268 246,265 263,257 280,241 297,212 314,171 330,122 347,78 364,52 371,50 381,55 398,86 415,132 431,180 448,219 465,245 482,259 499,266" fill="none" stroke="#d04030" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="156" y="42" text-anchor="middle" font-size="13" fill="#3060c8" font-weight="700">S 锥</text>
  <text x="156" y="58" text-anchor="middle" font-size="10" fill="#3060c8">437 nm</text>
  <text x="318" y="42" text-anchor="middle" font-size="13" fill="#5cb830" font-weight="700">M 锥</text>
  <text x="318" y="58" text-anchor="middle" font-size="10" fill="#5cb830">533 nm</text>
  <text x="394" y="42" text-anchor="middle" font-size="13" fill="#d04030" font-weight="700">L 锥</text>
  <text x="394" y="58" text-anchor="middle" font-size="10" fill="#d04030">564 nm</text>
  <rect x="290" y="80" width="120" height="170" fill="#fff5d0" opacity="0.45" stroke="#caa040" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="350" y="265" text-anchor="middle" font-size="11" fill="#a07020" font-style="italic">L 与 M 严重重叠</text>
</svg>
<p class="img-caption">三种视锥细胞的敏感度曲线。注意一个反直觉的细节——L 锥和 M 锥的敏感曲线**严重重叠**：红和绿在波长上挨得很近（峰值只差 30 nm），而蓝离它们很远。</p>

## 3.2 红 vs 绿，本质上是一道“减法题”

既然 L 和 M 的曲线重叠这么多，大脑怎么判断“这是红还是绿”？答案是：**靠不上任何单一锥细胞，只能靠对比 L 和 M 的相对激发量**。

L 比 M 强 → 偏红；M 比 L 强 → 偏绿。

这个对比信号叫做 **red-green opponent channel（红-绿对立通道）**，由视网膜后端的神经节细胞做减法运算得到。换句话说，“红绿”这一维度的颜色感知，本质上是一个减法运算的输出——一旦减法的两个输入太接近，输出信号就糊了。**这正是红绿色盲/色弱的核心机制。**

人脑还有另一条独立的对立通道：**blue-yellow（蓝-黄）**，由 S 锥与 (L+M) 的对比给出。这条轴不依赖 L−M，所以即便红绿轴坏了，蓝-黄轴一般还在工作——这就是为什么大多数色弱者依然能区分蓝色和黄色。

## 3.3 三种色觉异常：缺一个 vs 偏一个 vs 全没了

中文里“色盲”“色弱”经常被混着用，但英文里分得很清楚，机制完全不同：

**第一种：全色盲（achromatopsia）—— 真·黑白世界，1/30,000 罕见**

L、M、S 三种锥细胞**全都不工作**，只能靠视杆细胞看世界。这种人看到的真的是黑白灰，而且因为视杆细胞在强光下会饱和，他们大白天还会畏光。这就是“色盲就是看不见颜色”那个旧认知对应的稀有情况——大多数人遇不到。

**第二种：二色视者（dichromat）—— 中文俗称“色盲”**

三种锥细胞里**完全缺一种**。最常见的两种：

- **Protanopia（红色盲）**：L 锥缺失。看红光特别暗（因为亮度感知里 L 锥是主要贡献者）。
- **Deuteranopia（绿色盲）**：M 锥缺失。亮度大致正常，但红绿无法区分。
- **Tritanopia（蓝色盲）**：S 锥缺失，极罕见，跟红绿色盲遗传机制完全不同。

这类人**看得到颜色**，只是色彩空间从三维退化成二维——他们的蓝-黄轴还在工作，但红绿轴整个塌缩了。所以红、橙、黄、绿在他们眼里是一系列相似的颜色，通常都呈现成各种深浅的黄褐 / 黄绿色。

**第三种：异常三色视者（anomalous trichromat）—— 中文俗称“色弱”**

三种锥细胞**都还在**，但其中一种（通常是 L 或 M）的敏感曲线**峰值偏移了**——往中间靠，导致 L 和 M 的曲线重叠得更厉害。

- **Protanomaly（红色弱）**：L 锥峰值往 M 靠
- **Deuteranomaly（绿色弱）**：M 锥峰值往 L 靠——这是最常见的色觉异常，占男性人口的约 5%

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="360" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">正常三色视 vs 异常三色视（绿色弱）</text>
  <text x="180" y="46" text-anchor="middle" font-size="13" fill="#444" font-weight="500">正常人</text>
  <text x="540" y="46" text-anchor="middle" font-size="13" fill="#a04030" font-weight="500">绿色弱（M 锥峰值偏向 L）</text>
  <g>
    <line x1="40" y1="80" x2="40" y2="260" stroke="#888" stroke-width="1.2"/>
    <line x1="40" y1="260" x2="320" y2="260" stroke="#888" stroke-width="1.2"/>
    <text x="180" y="290" text-anchor="middle" font-size="11" fill="#888">波长 (nm)</text>
    <polyline points="60,250 70,225 80,170 90,100 100,72 110,80 120,140 130,210 140,248" fill="none" stroke="#3060c8" stroke-width="2" stroke-linejoin="round"/>
    <text x="100" y="65" text-anchor="middle" font-size="11" fill="#3060c8" font-weight="600">S</text>
    <polyline points="135,253 150,232 165,180 180,108 195,72 200,72 215,108 230,180 245,232 260,253" fill="none" stroke="#5cb830" stroke-width="2" stroke-linejoin="round"/>
    <text x="200" y="65" text-anchor="middle" font-size="11" fill="#5cb830" font-weight="600">M</text>
    <polyline points="160,255 175,238 190,200 210,140 230,90 245,72 260,75 275,118 290,180 305,235 320,254" fill="none" stroke="#d04030" stroke-width="2" stroke-linejoin="round"/>
    <text x="248" y="65" text-anchor="middle" font-size="11" fill="#d04030" font-weight="600">L</text>
  </g>
  <g>
    <line x1="400" y1="80" x2="400" y2="260" stroke="#888" stroke-width="1.2"/>
    <line x1="400" y1="260" x2="680" y2="260" stroke="#888" stroke-width="1.2"/>
    <text x="540" y="290" text-anchor="middle" font-size="11" fill="#888">波长 (nm)</text>
    <polyline points="420,250 430,225 440,170 450,100 460,72 470,80 480,140 490,210 500,248" fill="none" stroke="#3060c8" stroke-width="2" stroke-linejoin="round"/>
    <text x="460" y="65" text-anchor="middle" font-size="11" fill="#3060c8" font-weight="600">S</text>
    <polyline points="510,253 525,232 540,180 555,108 570,72 575,72 590,108 605,180 620,232 635,253" fill="none" stroke="#5cb830" stroke-width="2" stroke-linejoin="round"/>
    <text x="575" y="65" text-anchor="middle" font-size="11" fill="#5cb830" font-weight="600">M*</text>
    <polyline points="520,255 535,238 550,200 570,140 590,90 605,72 620,75 635,118 650,180 665,235 680,254" fill="none" stroke="#d04030" stroke-width="2" stroke-linejoin="round"/>
    <text x="608" y="65" text-anchor="middle" font-size="11" fill="#d04030" font-weight="600">L</text>
    <rect x="555" y="65" width="80" height="195" fill="#fce0d4" opacity="0.5" stroke="#a04030" stroke-width="0.8" stroke-dasharray="3,3"/>
    <text x="595" y="305" text-anchor="middle" font-size="11" fill="#a04030" font-style="italic">M 与 L 几乎重叠 → 减法接近 0</text>
  </g>
</svg>
<p class="img-caption">异常三色视者的 M 锥峰值往 L 锥靠拢，两条曲线几乎重叠——L−M 的减法运算结果接近零，红绿对比信号被压扁。这就是色弱的物理本质。</p>

后果是什么？他们的红-绿对立通道输出信号很弱——减法的两个输入太相似，差值就小。他们能感觉到红和绿不一样，但区分度严重下降；尤其在低饱和度、相近色调、暗光环境下，几乎没法分。

我朋友说：“明暗的对比和颜色的对比，在我眼里明暗的对比显得太突出了，以至于无法注意到颜色的区分。” 这个体感是对的，但更精确的说法是：**对色弱者来说，亮度信号和颜色信号的相对权重失衡了**。正常人看一个红绿对比鲜明的画面，大脑同时收到强烈的亮度差和强烈的颜色差；色弱者收到的是强亮度差 + 弱颜色差，所以大脑自然就更依赖亮度信息来分辨图像。**不是“明暗变强了”，而是“颜色变弱了，衬得明暗成了主导”**——主观体验差不多，机制上区别在这。

## 3.4 为什么是男性多发：X 染色体遗传的直接后果

红绿色觉异常**绝大多数是 X 染色体隐性遗传**——这个生物学细节直接解释了为什么男性发病率（~8%）远远高于女性（~0.5%）。

L 锥和 M 锥的基因都位于 X 染色体上（S 锥的基因在 7 号染色体上，所以蓝色盲的遗传规律完全不同）。男性的染色体是 XY，**只有一条 X**——这条 X 上的色觉基因坏了，就**没有备份**，直接发病。女性是 XX，两条 X 上的色觉基因有一条好就够用——除非两条都坏，否则只是携带者。

具体到家族遗传，是这样的：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="300" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">色觉异常的 X 染色体遗传（父正常 + 母携带者）</text>
  <g>
    <text x="120" y="58" text-anchor="middle" font-size="12" fill="#444">父亲（正常）</text>
    <rect x="80" y="68" width="32" height="14" fill="#5ca0d8" stroke="#3070b0" stroke-width="1"/>
    <text x="96" y="79" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">X</text>
    <rect x="120" y="68" width="22" height="14" fill="#888" stroke="#555" stroke-width="1"/>
    <text x="131" y="79" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">Y</text>
  </g>
  <g>
    <text x="480" y="58" text-anchor="middle" font-size="12" fill="#444">母亲（携带者）</text>
    <rect x="440" y="68" width="32" height="14" fill="#5ca0d8" stroke="#3070b0" stroke-width="1"/>
    <text x="456" y="79" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">X</text>
    <rect x="480" y="68" width="32" height="14" fill="#e0a050" stroke="#a06820" stroke-width="1"/>
    <text x="496" y="79" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">X′</text>
  </g>
  <text x="220" y="118" font-size="11" fill="#888">父亲贡献的染色体</text>
  <text x="555" y="240" font-size="11" fill="#888" transform="rotate(-90 555 240)">母亲贡献的染色体</text>
  <line x1="160" y1="135" x2="540" y2="135" stroke="#bbb" stroke-width="1"/>
  <line x1="540" y1="135" x2="540" y2="370" stroke="#bbb" stroke-width="1"/>
  <g transform="translate(180,150)">
    <rect x="0" y="0" width="60" height="20" fill="#5ca0d8" stroke="#3070b0" stroke-width="1"/>
    <text x="30" y="14" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">X (正常)</text>
  </g>
  <g transform="translate(360,150)">
    <rect x="0" y="0" width="60" height="20" fill="#888" stroke="#555" stroke-width="1"/>
    <text x="30" y="14" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">Y</text>
  </g>
  <g transform="translate(70,200)">
    <rect x="0" y="0" width="80" height="20" fill="#5ca0d8" stroke="#3070b0" stroke-width="1"/>
    <text x="40" y="14" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">X (正常)</text>
  </g>
  <g transform="translate(70,290)">
    <rect x="0" y="0" width="80" height="20" fill="#e0a050" stroke="#a06820" stroke-width="1"/>
    <text x="40" y="14" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">X′ (异常)</text>
  </g>
  <g transform="translate(180,190)">
    <rect x="0" y="0" width="160" height="80" fill="#eef9ee" stroke="#5ca830" stroke-width="1.5"/>
    <text x="80" y="22" text-anchor="middle" font-size="11" fill="#3a7818" font-weight="600">XX</text>
    <text x="80" y="44" text-anchor="middle" font-size="13" fill="#2a5810" font-weight="600">健康女儿</text>
    <text x="80" y="62" text-anchor="middle" font-size="11" fill="#5a7848">25%</text>
  </g>
  <g transform="translate(360,190)">
    <rect x="0" y="0" width="160" height="80" fill="#eef0f8" stroke="#3070b0" stroke-width="1.5"/>
    <text x="80" y="22" text-anchor="middle" font-size="11" fill="#3070b0" font-weight="600">XY</text>
    <text x="80" y="44" text-anchor="middle" font-size="13" fill="#1a4878" font-weight="600">健康儿子</text>
    <text x="80" y="62" text-anchor="middle" font-size="11" fill="#5a6878">25%</text>
  </g>
  <g transform="translate(180,280)">
    <rect x="0" y="0" width="160" height="80" fill="#fdf5e8" stroke="#c08030" stroke-width="1.5"/>
    <text x="80" y="22" text-anchor="middle" font-size="11" fill="#a06820" font-weight="600">XX′</text>
    <text x="80" y="44" text-anchor="middle" font-size="13" fill="#704818" font-weight="600">携带者女儿</text>
    <text x="80" y="62" text-anchor="middle" font-size="11" fill="#8a6838">25%（自己色觉正常）</text>
  </g>
  <g transform="translate(360,280)">
    <rect x="0" y="0" width="160" height="80" fill="#fce0d4" stroke="#c83828" stroke-width="1.5"/>
    <text x="80" y="22" text-anchor="middle" font-size="11" fill="#a02818" font-weight="600">X′Y</text>
    <text x="80" y="44" text-anchor="middle" font-size="13" fill="#801808" font-weight="600">色盲 / 色弱儿子</text>
    <text x="80" y="62" text-anchor="middle" font-size="11" fill="#a04848">25%</text>
  </g>
</svg>
<p class="img-caption">父亲色觉正常 + 母亲是携带者时的 4 种孩子组合：儿子 50% 概率色盲，女儿 50% 概率成为像母亲一样的携带者（自己正常但下一代有风险）。要让一个女儿真的色盲，需要"父亲色盲 + 母亲至少是携带者"的组合——这个组合本身就少见。</p>

所以你周围色弱的男性朋友会比女性朋友多得多——这不是巧合，这是 X 染色体上一个隐性等位基因的几率游戏。

# 4. 石原色盲测试图：颜色和亮度的双谜题

这是整个色觉话题最精彩的部分。石原图（Ishihara plate）的设计是这样的——

图上的“数字”和“背景”由两组**不同颜色但亮度相同**的小圆点组成。比如某张测试图里，数字“6"由红色点组成，背景由绿色点组成，但红色点和绿色点的亮度（明度，luminance）被精心调成完全一致。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="360" y="20" text-anchor="middle" font-size="14" fill="#333" font-weight="600">石原图原理：颜色 + 亮度的双谜题</text>
  <defs>
    <clipPath id="cb-circle-a"><circle cx="120" cy="140" r="90"/></clipPath>
    <clipPath id="cb-circle-b"><circle cx="360" cy="140" r="90"/></clipPath>
    <clipPath id="cb-circle-c"><circle cx="600" cy="140" r="90"/></clipPath>
  </defs>
  <g clip-path="url(#cb-circle-a)">
    <rect x="30" y="50" width="180" height="180" fill="#7cc850"/>
    <g fill="#7cc850" stroke="#5ca830" stroke-width="0.5">
      <circle cx="50" cy="65" r="6"/><circle cx="64" cy="80" r="7"/><circle cx="80" cy="68" r="6"/><circle cx="96" cy="84" r="7"/><circle cx="112" cy="70" r="6"/><circle cx="128" cy="86" r="7"/><circle cx="144" cy="72" r="6"/><circle cx="160" cy="88" r="7"/><circle cx="176" cy="74" r="6"/><circle cx="192" cy="86" r="7"/>
      <circle cx="50" cy="100" r="7"/><circle cx="80" cy="104" r="6"/><circle cx="112" cy="108" r="6"/><circle cx="186" cy="100" r="7"/><circle cx="200" cy="118" r="6"/>
      <circle cx="46" cy="138" r="7"/><circle cx="200" cy="142" r="6"/>
      <circle cx="48" cy="172" r="6"/><circle cx="196" cy="170" r="7"/>
      <circle cx="46" cy="206" r="7"/><circle cx="62" cy="218" r="6"/><circle cx="80" cy="208" r="6"/><circle cx="112" cy="216" r="7"/><circle cx="148" cy="216" r="6"/><circle cx="184" cy="206" r="7"/><circle cx="200" cy="218" r="6"/>
    </g>
    <g fill="#dc6850" stroke="#a83828" stroke-width="0.5">
      <circle cx="92" cy="98" r="7"/><circle cx="76" cy="118" r="7"/><circle cx="62" cy="134" r="6"/><circle cx="60" cy="156" r="7"/><circle cx="68" cy="178" r="6"/><circle cx="86" cy="194" r="7"/><circle cx="106" cy="198" r="7"/><circle cx="128" cy="194" r="6"/><circle cx="148" cy="184" r="7"/><circle cx="156" cy="166" r="6"/><circle cx="148" cy="148" r="7"/><circle cx="128" cy="142" r="6"/><circle cx="108" cy="148" r="7"/><circle cx="98" cy="166" r="6"/><circle cx="116" cy="178" r="7"/><circle cx="138" cy="172" r="6"/>
      <circle cx="158" cy="138" r="7"/><circle cx="142" cy="126" r="6"/><circle cx="124" cy="116" r="7"/><circle cx="108" cy="80" r="6"/>
    </g>
    <circle cx="120" cy="140" r="90" fill="none" stroke="#444" stroke-width="1"/>
  </g>
  <g clip-path="url(#cb-circle-b)">
    <rect x="270" y="50" width="180" height="180" fill="#a8a8a8"/>
    <g fill="#a8a8a8" stroke="#888" stroke-width="0.5">
      <circle cx="290" cy="65" r="6"/><circle cx="304" cy="80" r="7"/><circle cx="320" cy="68" r="6"/><circle cx="336" cy="84" r="7"/><circle cx="352" cy="70" r="6"/><circle cx="368" cy="86" r="7"/><circle cx="384" cy="72" r="6"/><circle cx="400" cy="88" r="7"/><circle cx="416" cy="74" r="6"/><circle cx="432" cy="86" r="7"/>
      <circle cx="290" cy="100" r="7"/><circle cx="320" cy="104" r="6"/><circle cx="332" cy="98" r="7"/><circle cx="316" cy="118" r="7"/><circle cx="302" cy="134" r="6"/><circle cx="300" cy="156" r="7"/><circle cx="308" cy="178" r="6"/><circle cx="326" cy="194" r="7"/><circle cx="346" cy="198" r="7"/><circle cx="368" cy="194" r="6"/><circle cx="388" cy="184" r="7"/><circle cx="396" cy="166" r="6"/><circle cx="388" cy="148" r="7"/><circle cx="368" cy="142" r="6"/><circle cx="348" cy="148" r="7"/><circle cx="338" cy="166" r="6"/><circle cx="356" cy="178" r="7"/><circle cx="378" cy="172" r="6"/>
      <circle cx="398" cy="138" r="7"/><circle cx="382" cy="126" r="6"/><circle cx="364" cy="116" r="7"/><circle cx="348" cy="108" r="6"/><circle cx="352" cy="100" r="7"/>
      <circle cx="290" cy="120" r="6"/><circle cx="430" cy="100" r="7"/><circle cx="440" cy="118" r="6"/><circle cx="286" cy="138" r="7"/><circle cx="440" cy="142" r="6"/><circle cx="288" cy="172" r="6"/><circle cx="436" cy="170" r="7"/><circle cx="286" cy="206" r="7"/><circle cx="302" cy="218" r="6"/><circle cx="320" cy="208" r="6"/><circle cx="352" cy="216" r="7"/><circle cx="388" cy="216" r="6"/><circle cx="424" cy="206" r="7"/><circle cx="440" cy="218" r="6"/>
    </g>
    <circle cx="360" cy="140" r="90" fill="none" stroke="#444" stroke-width="1"/>
  </g>
  <g clip-path="url(#cb-circle-c)">
    <rect x="510" y="50" width="180" height="180" fill="#7cc850"/>
    <g fill="#dc6850">
      <circle cx="572" cy="98" r="11"/><circle cx="556" cy="118" r="11"/><circle cx="544" cy="138" r="11"/><circle cx="540" cy="158" r="11"/><circle cx="548" cy="178" r="11"/><circle cx="566" cy="194" r="11"/><circle cx="588" cy="198" r="11"/><circle cx="610" cy="194" r="11"/><circle cx="630" cy="184" r="11"/><circle cx="638" cy="166" r="11"/><circle cx="630" cy="148" r="11"/><circle cx="610" cy="142" r="11"/><circle cx="588" cy="148" r="11"/><circle cx="578" cy="166" r="11"/><circle cx="596" cy="178" r="11"/><circle cx="618" cy="172" r="11"/>
      <circle cx="638" cy="138" r="11"/><circle cx="622" cy="126" r="11"/><circle cx="604" cy="116" r="11"/><circle cx="588" cy="80" r="10"/>
    </g>
    <circle cx="600" cy="140" r="90" fill="none" stroke="#444" stroke-width="1"/>
    <text x="595" y="160" text-anchor="middle" font-size="68" fill="#dc6850" font-weight="700" opacity="0.0">6</text>
  </g>
  <text x="120" y="252" text-anchor="middle" font-size="12" fill="#444" font-weight="500">(a) 完整图</text>
  <text x="120" y="270" text-anchor="middle" font-size="10" fill="#888">颜色 + 亮度都在</text>
  <text x="360" y="252" text-anchor="middle" font-size="12" fill="#444" font-weight="500">(b) 抽掉颜色</text>
  <text x="360" y="270" text-anchor="middle" font-size="10" fill="#888">只剩亮度——数字消失</text>
  <text x="600" y="252" text-anchor="middle" font-size="12" fill="#444" font-weight="500">(c) 抽掉亮度</text>
  <text x="600" y="270" text-anchor="middle" font-size="10" fill="#888">只剩色相——数字浮出</text>
</svg>
<p class="img-caption">石原图的核心设计：数字（红点组成的"6"）和背景（绿点）<strong>颜色不同但亮度故意调成相同</strong>。(a) 完整图里数字清晰；(b) 抽掉色相只看亮度，整张图变成均匀斑点，数字消失；(c) 抽掉亮度只看色相，数字反而更清晰——证明数字信号<strong>只活在色相通道里</strong>。</p>

对**正常人**：颜色通道告诉你”红绿不一样 → 那里有个 6"；亮度通道说“看不出形状”。两个通道独立，颜色通道获胜，于是看到 6。

对**色弱 / 色盲者**：颜色通道传不出信号（红绿对他们差不多），亮度通道也传不出信号（亮度被故意做成一样），所以他们什么都看不到，或者看到一片乱码。

但石原测试集还有一类特别精妙的图，叫做 **“hidden digit” plate（隐藏数字图）**——它反过来设计：背景颜色和数字颜色对正常人来说**色相很接近**（混在一起），但**亮度有一点点差异**。

这种图里：

- **正常人**：颜色通道太强势，把弱亮度差忽略掉了——什么都看不到
- **色弱 / 色盲者**：颜色通道弱，亮度通道反而成了主信号——他们一眼就看出来了，看到的还是个**正常人完全看不到**的另一个数字

所以一套完整的石原测试结果是这样的：

| | 看到 A | 看到 B |
|:---|:---:|:---:|
| 正常人 | ✅ | ❌ |
| 色弱 / 色盲者 | ❌ | ✅ |

测试不是靠“色弱看不到东西”来诊断，而是靠“色弱看到了和正常人完全不同、但**可预测且一致**的东西”。这正是我朋友说的“答案是错的”的意思——**他基于不同的视觉信号系统、给出了一致的、可预测的、不同于正常视觉系统的答案**。

那么色弱者眼中的世界到底是什么样子？下面这张图模拟了同一个画面在不同色觉下的视觉效果——

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 320" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="360" y="20" text-anchor="middle" font-size="14" fill="#333" font-weight="600">同一个水果摊，在四种不同视觉下的样子</text>
  <g transform="translate(20,50)">
    <rect x="0" y="0" width="160" height="180" fill="#f0e8d0" stroke="#a08868" stroke-width="1"/>
    <ellipse cx="40" cy="80" rx="22" ry="22" fill="#d83820"/>
    <ellipse cx="38" cy="72" rx="6" ry="3" fill="#f88060" opacity="0.7"/>
    <ellipse cx="80" cy="80" rx="22" ry="22" fill="#d83820"/>
    <ellipse cx="78" cy="72" rx="6" ry="3" fill="#f88060" opacity="0.7"/>
    <ellipse cx="120" cy="80" rx="22" ry="22" fill="#5ca830"/>
    <ellipse cx="118" cy="72" rx="6" ry="3" fill="#90c860" opacity="0.7"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142 Q 125,148 80,148 Q 35,148 30,140 Z" fill="#e8c828"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142" fill="none" stroke="#b89008" stroke-width="1"/>
    <text x="80" y="174" text-anchor="middle" font-size="11" fill="#444">正常视觉</text>
  </g>
  <g transform="translate(200,50)">
    <rect x="0" y="0" width="160" height="180" fill="#f0e8d0" stroke="#a08868" stroke-width="1"/>
    <ellipse cx="40" cy="80" rx="22" ry="22" fill="#807820"/>
    <ellipse cx="38" cy="72" rx="6" ry="3" fill="#a89830" opacity="0.7"/>
    <ellipse cx="80" cy="80" rx="22" ry="22" fill="#807820"/>
    <ellipse cx="78" cy="72" rx="6" ry="3" fill="#a89830" opacity="0.7"/>
    <ellipse cx="120" cy="80" rx="22" ry="22" fill="#988820"/>
    <ellipse cx="118" cy="72" rx="6" ry="3" fill="#b8a830" opacity="0.7"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142 Q 125,148 80,148 Q 35,148 30,140 Z" fill="#d8b820"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142" fill="none" stroke="#a08010" stroke-width="1"/>
    <text x="80" y="174" text-anchor="middle" font-size="11" fill="#444">红色盲（protanopia）</text>
    <text x="80" y="190" text-anchor="middle" font-size="9" fill="#888" font-style="italic">红色变暗、偏黄褐</text>
  </g>
  <g transform="translate(380,50)">
    <rect x="0" y="0" width="160" height="180" fill="#f0e8d0" stroke="#a08868" stroke-width="1"/>
    <ellipse cx="40" cy="80" rx="22" ry="22" fill="#a89020"/>
    <ellipse cx="38" cy="72" rx="6" ry="3" fill="#c8b030" opacity="0.7"/>
    <ellipse cx="80" cy="80" rx="22" ry="22" fill="#a89020"/>
    <ellipse cx="78" cy="72" rx="6" ry="3" fill="#c8b030" opacity="0.7"/>
    <ellipse cx="120" cy="80" rx="22" ry="22" fill="#a89030"/>
    <ellipse cx="118" cy="72" rx="6" ry="3" fill="#c8b040" opacity="0.7"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142 Q 125,148 80,148 Q 35,148 30,140 Z" fill="#d8b820"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142" fill="none" stroke="#a08010" stroke-width="1"/>
    <text x="80" y="174" text-anchor="middle" font-size="11" fill="#444">绿色盲（deuteranopia）</text>
    <text x="80" y="190" text-anchor="middle" font-size="9" fill="#888" font-style="italic">红绿苹果几乎看不出区别</text>
  </g>
  <g transform="translate(560,50)">
    <rect x="0" y="0" width="160" height="180" fill="#d0d0d0" stroke="#888" stroke-width="1"/>
    <ellipse cx="40" cy="80" rx="22" ry="22" fill="#787878"/>
    <ellipse cx="38" cy="72" rx="6" ry="3" fill="#a0a0a0" opacity="0.7"/>
    <ellipse cx="80" cy="80" rx="22" ry="22" fill="#787878"/>
    <ellipse cx="78" cy="72" rx="6" ry="3" fill="#a0a0a0" opacity="0.7"/>
    <ellipse cx="120" cy="80" rx="22" ry="22" fill="#888888"/>
    <ellipse cx="118" cy="72" rx="6" ry="3" fill="#b0b0b0" opacity="0.7"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142 Q 125,148 80,148 Q 35,148 30,140 Z" fill="#c0c0c0"/>
    <path d="M 30,140 Q 40,118 80,120 Q 120,122 130,142" fill="none" stroke="#888" stroke-width="1"/>
    <text x="80" y="174" text-anchor="middle" font-size="11" fill="#444">全色盲（罕见）</text>
    <text x="80" y="190" text-anchor="middle" font-size="9" fill="#888" font-style="italic">真·黑白世界</text>
  </g>
  <text x="360" y="285" text-anchor="middle" font-size="11" fill="#888" font-style="italic">注：左 3 张为模拟，真实色弱者主观体验是从小到大形成的"自然世界"，不存在<strong>对照感知</strong>的可能</text>
</svg>
<p class="img-caption">同一个画面（两个红苹果 + 一个绿苹果 + 一根香蕉）在四种视觉下的样子。注意红色盲和绿色盲的两个面板里，红苹果和绿苹果几乎合并成同一种黄褐色——这就是"色彩空间从三维塌成二维"的具体感觉。</p>

# 5. 几个有趣的延伸

## 色弱者的“超能力”：识破迷彩伪装

二战的时候，英美军队意外发现：**色弱士兵在识别敌方迷彩伪装时反而比正常视觉的士兵更快、更准**。

原因很直接——迷彩服的设计假定观察者是正常色觉，颜色被用来“骗”颜色通道（譬如让绿色军装融入树林）。但色弱士兵根本不依赖颜色通道，他们靠**亮度和纹理**来识别物体形状——而这两个维度伪装服骗不了。英美军方因此专门把色弱士兵用作“spotter”（侦察兵），用他们的“缺陷”来识破敌方的视觉欺骗。

这是个很有意思的提醒：**所谓“缺陷”和“优势”，往往只是任务匹配的不同**。

## EnChroma 眼镜：为什么对色弱有效，对色盲无效

最近几年流行的 EnChroma 眼镜，号称能让色觉异常者“看到”以前看不到的颜色——它的科学原理其实简单：

镜片里加了一层精心设计的滤光片，把红光和绿光的波段分得**更开**。换句话说，镜片人为减少了 L 锥和 M 锥同时被激发的机会——L 锥更专心接收红光，M 锥更专心接收绿光，于是 L−M 减法的差值变大了，红绿对比信号被人为放大。

这对**异常三色视者（色弱）**有用——他们三种锥细胞都在，只是峰值靠得太近，把光谱拉开了差值就回来了。但对**二色视者（真正的色盲）**基本无效——他们直接缺一种锥细胞，**放大零依然是零**。

所以网上那些“色盲第一次戴 EnChroma 眼镜感动落泪”的视频，主角实际上几乎都是色弱者。真正的色盲戴上去的体验是没什么变化的。

## 不止人类有色觉问题，也不止人类有色觉

色觉这件事在动物界差异巨大：

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" style="max-width:100%;height:auto;display:block;margin:1.4em auto;">
  <text x="320" y="22" text-anchor="middle" font-size="14" fill="#333" font-weight="600">不同物种的视锥细胞数量</text>
  <line x1="160" y1="55" x2="160" y2="290" stroke="#888" stroke-width="1.2"/>
  <line x1="160" y1="290" x2="600" y2="290" stroke="#888" stroke-width="1.2"/>
  <text x="380" y="310" text-anchor="middle" font-size="11" fill="#888">视锥细胞种类数</text>
  <g font-size="11" fill="#666">
    <text x="160" y="305" text-anchor="middle">0</text>
    <text x="216" y="305" text-anchor="middle">2</text>
    <text x="272" y="305" text-anchor="middle">4</text>
    <text x="328" y="305" text-anchor="middle">6</text>
    <text x="384" y="305" text-anchor="middle">8</text>
    <text x="440" y="305" text-anchor="middle">10</text>
    <text x="496" y="305" text-anchor="middle">12</text>
    <text x="552" y="305" text-anchor="middle">14</text>
    <text x="600" y="305" text-anchor="middle">16</text>
  </g>
  <g>
    <text x="150" y="78" text-anchor="end" font-size="12" fill="#444">🐶 狗</text>
    <rect x="160" y="64" width="56" height="22" fill="#a8c8e8" stroke="#5080b0" stroke-width="1"/>
    <text x="225" y="80" font-size="11" fill="#555">2 种（蓝-黄）</text>
  </g>
  <g>
    <text x="150" y="118" text-anchor="end" font-size="12" fill="#444">🧑 人</text>
    <rect x="160" y="104" width="84" height="22" fill="#88c878" stroke="#5ca830" stroke-width="1"/>
    <text x="253" y="120" font-size="11" fill="#555">3 种（红-绿-蓝）</text>
  </g>
  <g>
    <text x="150" y="158" text-anchor="end" font-size="12" fill="#444">🐦 鸟</text>
    <rect x="160" y="144" width="112" height="22" fill="#e8c850" stroke="#a89020" stroke-width="1"/>
    <text x="280" y="160" font-size="11" fill="#555">4 种（+ 紫外）</text>
  </g>
  <g>
    <text x="150" y="198" text-anchor="end" font-size="12" fill="#444">🦋 蝴蝶</text>
    <rect x="160" y="184" width="140" height="22" fill="#e8a8c8" stroke="#a83878" stroke-width="1"/>
    <text x="308" y="200" font-size="11" fill="#555">5 种</text>
  </g>
  <g>
    <text x="150" y="238" text-anchor="end" font-size="12" fill="#444">🦐 螳螂虾</text>
    <rect x="160" y="224" width="392" height="22" fill="#d04030" stroke="#a02818" stroke-width="1"/>
    <text x="560" y="240" font-size="11" fill="#555">12-16 种</text>
  </g>
  <g>
    <text x="150" y="278" text-anchor="end" font-size="12" fill="#444">👁️ 全色盲</text>
    <rect x="160" y="264" width="2" height="22" fill="#888" stroke="#555" stroke-width="1"/>
    <text x="170" y="280" font-size="11" fill="#888">0 种（仅视杆）</text>
  </g>
</svg>
<p class="img-caption">人类的三色视在动物界其实只能算"凑合"。狗只有 2 种锥（看世界跟人类的二色视者类似——所以扔红球到草地上，狗找起来比扔蓝球难得多）；鸟类有 4 种，能看到我们看不到的紫外线模式；螳螂虾的 12-16 种是已知的天花板。</p>

但有趣的反转：2014 年发表在 Science 上的研究（Thoen et al.）发现，**螳螂虾的辨色能力其实不如人类**——它们似乎不做我们大脑那样的“通道对比减法”，而是直接用每种锥的激发量做模式识别，是种完全不同的色觉策略。锥细胞种类多 ≠ 色觉强；这是一个让人思考“什么叫'看见颜色'”的好例子。

哺乳动物大多数是 2 种锥细胞（跟狗一样）。**人类的三色视实际上是灵长类祖先的一次基因复制突变**——L 和 M 锥的基因本来是同一个，复制了一份后慢慢分化，给了我们多出来的红-绿这一维度。而**极少数女性是四色视者**——她们 X 染色体上的 L/M 基因发生变异，理论上拥有 4 种锥细胞，色彩分辨能力超过常人。这种现象客观存在但极其罕见，功能性影响也比理论预期小。

## 一个哲学留白

最后留一个开放性问题。颜色不是光的物理属性，而是大脑给不同波长贴的标签。两个人都说“这是红色”，但他们脑子里“红色”的感受到底是不是一样的？这是哲学上著名的 **inverted qualia 问题**——所有的“颜色”本质上都是不可观测的内部状态，我们只能通过行为输出（说出来的颜色名字）来推断。

色盲色弱让我们意识到一件事：**“我们看到的世界”和“世界本身”不是一回事**。你眼里那个鲜红的苹果，物理上只是反射了 600+ nm 波长光的有机体；那个“红”是你大脑里的内部体验，跟我大脑里的“红”有没有可比性，谁也说不清。色觉异常只是把这件事推到了一个看得见的极端——它告诉我们，每个人眼前的世界，都是大脑构造出来的。
