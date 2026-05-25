---
layout: post
title: "固定效应、聚类标准误、DID 与事件研究：一份能直接抄的代码配方"
main_category: "科研妙招"
sub_category: "计量实证"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/econometrics/panel-did-eventstudy"
published: true
keywords: ["固定效应", "高维固定效应", "fixed effects", "reghdfe", "fixest feols", "聚类标准误", "cluster robust SE", "clustered standard errors", "聚类在哪一层", "双向聚类", "two-way clustering", "wild bootstrap", "boottest", "DID", "双重差分", "difference in differences", "TWFE", "双向固定效应", "交错 DID", "staggered DID", "Goodman-Bacon", "负权重 negative weights", "Callaway Sant'Anna", "csdid", "did 包", "Sun Abraham", "sunab", "de Chaisemartin", "did_multiplegt", "事件研究", "event study", "动态处理效应", "事件研究图", "平行趋势", "parallel trends", "never treated", "not yet treated", "基期 omitted period", "shijian yanjiu", "DID 代码", "面板回归"]
---


这篇是工具书性质的：固定效应、聚类标准误、DID、事件研究——把这四样最常用的实证操作，给一份 R（`fixest`）和 Stata（`reghdfe` / 现代 DID 包）都能直接抄走的代码，并标出每个地方最容易翻车的点。不讲推导，只讲“这行为什么这么写”。

## 一、高维固定效应

个体 + 时间双向固定效应是面板回归的默认起手式。别再用 `factor(id)` 硬塞几千个虚拟变量——专门的吸收（absorb）算法又快又稳。

**R（fixest）**：竖线后面列固定效应。

```r
library(fixest)
m <- feols(y ~ x1 + x2 | id + year, data = df)
```

**Stata（reghdfe）**：`absorb()` 里列固定效应。

```stata
reghdfe y x1 x2, absorb(id year)
```

注意一个识别问题：吸收了个体固定效应后，**任何不随个体变化的变量（性别、出生地）都会被吸收掉、估不出来**——这不是 bug，是设定。想看这类变量的效应，得换识别策略，而不是去掉个体 FE。

## 二、聚类标准误：先想清楚聚类在哪一层

聚类标准误的技术写法很简单，难的是**选对层级**。原则：聚类在“处理变量发生变化、且误差可能相关”的那一层——通常是政策实施的层级（州、学校、村）。聚太细会低估标准误（假显著），聚太粗会损失精度。

```r
# fixest：估计时直接指定，或在 summary 时按需切换
feols(y ~ x1 | id + year, data = df, cluster = ~state)
feols(y ~ x1 | id + year, data = df, cluster = ~state + year)  # 双向聚类
```

```stata
reghdfe y x1, absorb(id year) cluster(state)
reghdfe y x1, absorb(id year) cluster(state year)   // 双向聚类
```

**少聚类数（cluster 数 < 约 40）是最常被忽略的坑**：常规聚类标准误此时严重偏小，会让你得到一堆假阳性。补救是 wild cluster bootstrap：

```stata
reghdfe y x1, absorb(id year) cluster(state)
boottest x1, reps(9999)        // 装 boottest；少聚类数下的可信推断
```

R 里对应 `fwildclusterboot::boottest()`。审稿人现在对“只有十几个州却用常规聚类 SE”非常敏感，提前做掉这一步。

## 三、经典 $2 \times 2$ DID

只有“处理前/处理后 $\times$ 处理组/对照组”两期两组时，双向固定效应就是 DID，`treat × post` 的系数即处理效应：

```r
feols(y ~ i(treated, post, ref = 0) | id + year, data = df, cluster = ~id)
```

```stata
reghdfe y c.treated#c.post, absorb(id year) cluster(id)
```

这个设定**只在“所有处理个体同时受处理”时无偏**。一旦处理时点是交错的（不同州不同年实施政策），下面这条必须读。

## 四、交错 DID：别再无脑 TWFE

2018 年以来一系列论文（Goodman-Bacon；de Chaisemartin & D'Haultfœuille；Sun & Abraham；Callaway & Sant'Anna；Borusyak et al.）说清了同一件事：**当处理时点交错、且处理效应随时间变化时，传统 TWFE 的 `treat×post` 系数是各组各期 $2 \times 2$ 比较的加权平均，而那些权重可以是负的**——早处理组会被当成晚处理组的对照，估计量可能连符号都错。

诊断用 Goodman-Bacon 分解看权重构成（R: `bacondecomp`，Stata: `bacondecomp`）。但实务上更直接：交错处理就直接换成稳健估计量，别在 TWFE 上挣扎。

**Callaway & Sant'Anna（按队列-时间的 group-time ATT，目前用得最广）**

```r
library(did)                       # Callaway & Sant'Anna
att <- att_gt(yname = "y", tname = "year", idname = "id",
              gname = "first_treat",       # 各个体首次受处理的年份；从未处理记 0
              control_group = "notyettreated",
              data = df)
agg <- aggte(att, type = "dynamic")        # 聚合成事件研究曲线
ggdid(agg)
```

```stata
csdid y, ivar(id) time(year) gvar(first_treat) notyet
estat event                              // 动态效应
csdid_plot
```

**Sun & Abraham（想留在 fixest 框架里最省事）**

```r
m <- feols(y ~ sunab(first_treat, year) | id + year, data = df, cluster = ~id)
iplot(m)                                 # 直接出事件研究图
```

`did_multiplegt_dyn`（de Chaisemartin & D'Haultfœuille）、`did_imputation`（Borusyak et al.）是另外两个主流选择。不必每篇都全跑，但**正文用一个稳健估计量、附录用另一个做稳健性**，现在基本是审稿预期。

## 五、事件研究图：动态效应怎么画、怎么不翻车

事件研究把效应按“相对处理的时间”展开，既能看动态，又能用处理前的系数检验平行趋势。一张标准的事件研究图长这样：

<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:600px;display:block;margin:1.5rem auto;font-family:sans-serif;">
  <line x1="60" y1="240" x2="560" y2="240" stroke="#999"/>
  <line x1="60" y1="30" x2="60" y2="250" stroke="#999"/>
  <line x1="60" y1="160" x2="560" y2="160" stroke="#bbb" stroke-dasharray="4 3"/>
  <text x="40" y="164" font-size="11" fill="#888" text-anchor="end">0</text>
  <line x1="310" y1="30" x2="310" y2="250" stroke="#c0504d" stroke-dasharray="5 4"/>
  <text x="310" y="280" font-size="11" fill="#c0504d" text-anchor="middle">处理发生（基期 t = −1）</text>
  <g stroke="#3b6ea5" stroke-width="2">
    <line x1="110" y1="158" x2="110" y2="172"/><line x1="160" y1="150" x2="160" y2="166"/>
    <line x1="210" y1="155" x2="210" y2="171"/><line x1="260" y1="156" x2="260" y2="170"/>
    <line x1="360" y1="118" x2="360" y2="142"/><line x1="410" y1="92"  x2="410" y2="120"/>
    <line x1="460" y1="74"  x2="460" y2="106"/><line x1="510" y1="66"  x2="510" y2="102"/>
  </g>
  <g fill="#3b6ea5">
    <circle cx="110" cy="165" r="3.5"/><circle cx="160" cy="158" r="3.5"/>
    <circle cx="210" cy="163" r="3.5"/><circle cx="260" cy="163" r="3.5"/>
    <circle cx="360" cy="130" r="3.5"/><circle cx="410" cy="106" r="3.5"/>
    <circle cx="460" cy="90" r="3.5"/><circle cx="510" cy="84" r="3.5"/>
  </g>
  <text x="180" y="225" font-size="11" fill="#3b6ea5" text-anchor="middle">处理前 ≈ 0（平行趋势成立的迹象）</text>
  <text x="440" y="55" font-size="11" fill="#3b6ea5" text-anchor="middle">处理后效应逐步显现</text>
  <text x="300" y="20" font-size="12" fill="#555" text-anchor="middle">系数 ± 95% 置信区间，相对处理时间</text>
</svg>

读图三件事：**处理前的点是否贴着 0**（平行趋势的可视化检验，但别把“不显著”当成“成立”的证明，要看点估计大小和趋势）；**基期是哪一期**（通常 t=−1 被归一化为 0，是参照点，不要把它解读成“处理前一年没效应”）；**处理后是否有可解释的动态形态**。

实操上必须注意的三点：

1. **端点要 binning。** 相对时间太靠两端的格子样本极少、噪声极大。把 $t \leq -5$ 和 $t \geq +5$ 各自合并成一个端点桶，图才稳。`fixest::sunab()` 的 `bin` 参数、`did` 包都内建处理。
2. **永远漏掉一个处理前期当基期**（默认 t=−1）。不漏会完全共线、估不出来；漏哪一期会改变所有系数的解释，写进图注。
3. **交错处理下，事件研究也不能用裸 TWFE**（`i(time_to_treat)` 那种写法有同样的负权重问题）。用 `sunab()`、`did` 的 `aggte(type="dynamic")`、或 `did_imputation` 生成的动态系数。

最省事的一条龙（R）：

```r
m <- feols(y ~ sunab(first_treat, year) | id + year, data = df, cluster = ~id)
iplot(m, main = "事件研究：动态处理效应",
       xlab = "相对处理时间（年）")
```

Stata 端 `csdid ... ; estat event ; csdid_plot`，或经典做法用 `eventdd` / `event_plot`。

把这些回归对象接上[出表工具](/research/econometrics/regression-tables)，表和事件研究图就能跟着主脚本一起自动重生成——改个聚类层级或换个估计量，全文数字和图一次刷新，不用回去手改任何一处。

