---
layout: post
title: "美国大学城路口全是 four-way stop，高峰期为什么感觉比红绿灯还慢？"
date: 2026-05-19
main_category: "生活攻略"
sub_category: "生活之问"
keywords: ["four-way stop", "四向停车", "全向停车", "all-way stop", "AWSC", "停车标志路口", "四向停车效率", "四向停车 vs 红绿灯", "红绿灯和停车标志哪个快", "路口通行能力", "交叉口延误", "交通模拟", "Monte Carlo 模拟", "Poisson 到达", "饱和车头时距", "saturation headway", "效率与公平", "stop compliance", "行人流量", "驾驶人犹豫", "HCM 通行能力手册", "MUTCD 多向停车", "美国大学城路口", "校园路口", "集中放学", "路口控制方式相图"]
permalink: "/life/four-way-stop-vs-signal"
---

# 1. 从一个很普通的路口开始

在美国读书的人大概都遇到过这种路口：四个方向各立一块红色八角 STOP 牌，没有红绿灯，也没有谁拥有永久优先权。每辆车都要停稳，然后大致按照先到先走、右侧优先和转弯让直行的规则穿过路口。

平时它非常自然。横向没有车时，驾驶人停一下、看一眼就走，不需要对着空路等几十秒红灯。建设和维护也比信号灯简单。难怪大学城、住宅区和校园周边到处都是 **four-way stop**，交通工程里通常称为 **all-way stop control（AWSC）**。

但它也有另一个面孔。

集中放学时，四个方向突然都排起队。每辆车到达停止线后都要重新确认顺序：对面那辆是不是比我早一点？左边那辆到底要直行还是左转？我们是不是同时到的？有人犹豫，有人抢先，有人已经起步又重新刹住。原本很轻巧的协调方式，像是突然失去了节奏。

于是我一直有一个很朴素的问题：

> Four-way stop 到底在什么情况下会变得比红绿灯更慢？

我以前写过一版解释，画了两条示意曲线，也做了一个简单动画。问题是，那一版其实把答案提前放进了假设：如果规定停车牌每 4 秒放一辆，信号灯绿灯期间每 2 秒放一辆，那么高流量时红绿灯当然会赢。

真正有意思的并不是再讲一遍这个结论，而是把问题拆开：车辆怎样随机到达？Four-way stop 真的一次只能走一辆吗？什么决定它的处理速度？流量方向、左转、行人、驾驶人犹豫和停车遵从度，分别会改变什么？如果信号灯偏向主路，总效率提高以后，支路司机会付出什么代价？

下面就从这些问题开始。

# 2. 两种控制方式其实在解决不同的协调问题

先不谈谁更快，只看两种制度怎样分配通行权。

## 2.1 Four-way stop：逐车、去中心化协调

Four-way stop 没有预先规定哪个方向拥有接下来 30 秒的使用权。每一小组车辆到达以后，驾驶人根据顺序和 movement 现场协调。

这种制度的好处是灵活：

- 没有横向车辆时，不需要等待一个空的红灯；
- 车辆可以按实际到达顺序通行；
- 对向直行、对向同时左转等兼容 movement 有时可以一起通过；
- 各方向在程序上比较接近 first-come-first-served。

代价也来自同一个地方。通行权不是机器明确发出的，而要由驾驶人观察、判断和相互确认。流量越高，同时参与协调的人越多，左转、行人和模糊到达顺序越容易打断节奏。

## 2.2 Signal：分批、中心化协调

信号灯的做法相反。它把时间切成相位：南北向连续通行一段时间，再经过黄灯和全红切换给东西向。

它必然浪费一部分时间：

- 某个方向即使没有车，也可能占着绿灯；
- 每次相位切换都存在 lost time；
- 刚转绿时，队首车辆启动比稳定车流更慢。

但只要队伍已经形成，信号灯可以让同一方向的车辆连续离开。驾驶人不需要每通过一辆就重新协商一次通行权。换句话说，信号灯用固定的切换成本，换取成批放行的规模经济。

所以低流量与高流量可能偏好不同制度，并不是一个神秘现象。真正困难的是确定反转发生在哪里，以及哪些变量会移动这条边界。

# 3. 这并不是一个没人研究过的问题

交通工程对 stop control 的研究至少可以追溯到 1950 年代。早期现场研究已经比较过 two-way stop、four-way stop、定时信号和感应信号的延误，并发现排名同时依赖流量分布和信号配时。

1963 年，Hebert 用芝加哥三个路口研究 four-way-stop capacity。1987 年，Richardson 建立 multiway-stop 的排队延误模型。1990 年，Michael Kyte 在 20 个 all-way-stop 路口记录了 7,129 个饱和 departure headways。1990 年代的 NCHRP Project 3-46 又扩充了现场数据；后来发表的 stream-interaction model 使用了超过 20,000 个车头时距，把不同冲突状态进一步细分。

2008 年，Han、Li 和 Urbanik 用 Highway Capacity Manual 方法跑了超过 5,000 个需求场景，直接研究在不同流量和方向结构下应该选择 two-way stop、all-way stop 还是 signal。目前的 **Highway Capacity Manual 7th Edition** 仍将 signalized intersections、TWSC、AWSC 和 roundabouts 分成独立章节。

所以如果问题只是“四向停车和固定信号谁的平均延误低”，很难构成新的交通工程研究。这里更现实的目标，是做一个透明、可复现的 stylized simulation：不代替 HCM，也不为具体路口做工程设计，而是看看一个日常直觉背后有哪些机制。

# 4. 把路口放进一个可复现模型

模型是一座四腿、每个进口一条车道的交叉口。南北方向称为主路，东西方向称为支路。基准转向比例是左转 10%、直行 80%、右转 10%。

每个场景模拟 75 分钟，前 15 分钟作为 warm-up，后 60 分钟计入结果。每组基准场景重复 40 次。

## 4.1 车辆不是整齐到达的

设四个进口的合计流量为 $q$，南北主路占比为 $m$。各进口平均到达率为

\[
\lambda_N=\lambda_S=\frac{mq}{2},\qquad
\lambda_E=\lambda_W=\frac{(1-m)q}{2}.
\]

每个进口使用相互独立的 Poisson arrival process。模型只规定平均每小时来多少辆车，具体哪一秒到达由随机数决定。

这一点很重要。即使平均到达率没有超过容量，短时间内连续到车也可能形成队伍；当服务能力接近到达率时，这些随机波动会越来越难被消化。

## 4.2 Four-way stop 不是固定 4 秒的单服务器

Kyte 的现场数据表明，同一进口连续车辆的 departure headway 会随着其它进口是否有车而改变。本文基准模型采用以下近似均值：

| 路口状态 | 同一进口平均 departure headway |
|---|---:|
| 只有本进口有排队 | 3.7 秒 |
| 本进口与对向进口有车 | 5.7 秒 |
| 本进口与冲突进口有车 | 6.5 秒 |
| 四个进口都有车 | 8.4 秒 |

这些数字是同一进口连续两辆车离开的间隔，不是整个路口任意两辆车之间的间隔。模型把它换算成全路口 service-event interval，并允许没有横向冲突时的兼容对向 movement 同时通过。每次间隔再加入 coefficient of variation 为 0.15 的 lognormal 扰动，表示驾驶人反应差异。

这依然比真实 AWSC 简单，但至少不再预先规定“一次只能走一辆”。

## 4.3 信号灯也不能故意配得很差

信号模型采用：

- 70 秒周期；
- 南北与东西两个相位；
- 每周期 8 秒黄灯、全红和其它 lost time；
- 绿灯期间 2.0 秒 saturation headway；
- 每个方向至少 10 秒有效绿灯。

剩余有效绿灯按照两条道路的需求比例分配：

\[
g_{\text{major}}
=\min\left\{52,\max\left[10,\;62m\right]\right\},
\qquad
g_{\text{minor}}=62-g_{\text{major}}.
\]

这是一套经过需求适配的定时信号，不是感应式或实时自适应信号。后两者可以在低流量时跳过没有车辆的相位，通常会减少空等。

## 4.4 我们观察什么

除了全部车辆平均延误，模型还记录：

- 第 95 百分位延误；
- 实际通过量；
- 模拟结束时剩余队伍；
- 四个进口中最差方向的平均延误；
- 四个方向平均延误的 Gini coefficient。

如果车辆到模拟结束仍未通过，已经等待的时间作为右删失下界计入。因此过饱和区域的延误数字是保守下界：继续模拟，平均等待还可能增长。

# 5. 第一组实验：只增加总流量

先从最简单的实验开始。其它设定不变，只让四个进口的合计流量从每小时 200 辆逐步增加到 2,600 辆。

<img src="/assets/images/life/four-way-stop/delay-curves.svg" alt="四向停车和定时信号在均衡与偏流情形下的平均延误曲线" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">每个点是 40 次模拟的平均值，阴影为 95% Monte Carlo confidence interval。曲线在 300 秒处截断，避免过饱和区压扁其余部分。</p>

从左向右看，路口经历了三个阶段。

## 5.1 低流量：信号灯在等待不存在的冲突

总流量只有 400 辆/小时时，four-way stop 的平均延误约为 4.1 秒，定时信号约为 13.8 秒。

这时路口经常只有一个方向来车。停车牌只要求驾驶人确认安全，信号灯却可能要求他等待一个完全没有车辆的横向相位。Four-way stop 的灵活性在这里是真实的效率优势。

## 5.2 接近容量：延误不是线性增加的

均衡流量为 1,400 辆/小时时，four-way stop 平均延误约 9.9 秒，信号灯约 16.3 秒。增加到 1,600 辆/小时后，four-way stop 变成 22.5 秒，信号灯约 16.9 秒。

总流量只增加了约 14%，four-way stop 的平均延误却增加了 127%。到达率已经接近服务率，过去几秒钟形成的小队伍还没消失，下一批车又到了。

这时尾部体验比均值更早恶化：

| 均衡流量 1,600 辆/小时 | 平均延误 | 第 95 百分位延误 | 结束时剩余队伍 |
|---|---:|---:|---:|
| Four-way stop | 22.5 秒 | 49.4 秒 | 9.8 辆 |
| 定时信号 | 16.9 秒 | 39.9 秒 | 0.0 辆 |

## 5.3 超过容量：我们看到的只是一帧

到 1,800 辆/小时时，four-way stop 平均延误约 154 秒，信号灯约 18 秒。这里已经不是“每辆车多等一点”，而是长期到达率超过处理速度，队伍不再自行清空。

用排队论的语言说，当利用率 $\rho=\lambda/\mu$ 接近 1 时，随机波动会被显著放大；一旦长期超过 1，任何有限时间计算的平均延误都只是不断增长过程中的一帧。

# 6. 大学城的高峰不是稳态，而是一记冲击

“每小时平均多少辆车”仍然没有完全描述大学城的情形。平时道路很空，下课铃一响，大量车辆在十几分钟内集中出现。

下面让总流量先保持在 400 辆/小时，第 25 到 45 分钟突然升到 2,000 辆/小时，再恢复到 400。曲线是 40 次模拟的平均排队车辆数。

<img src="/assets/images/life/four-way-stop/peak-queue.svg" alt="集中放学二十分钟期间四向停车与定时信号的平均排队车辆数" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">黄色区域是 20 分钟集中放学。高峰结束不等于队伍立刻消失。</p>

前 25 分钟，两种控制方式都没有形成持续排队。高峰开始后，four-way stop 的到达率超过服务能力，积压近似线性增长；第 45 分钟时平均队伍约有 106 辆。流量恢复正常以后，路口才有富余能力偿还之前欠下的队伍，又过约 15 分钟才基本清空。

信号灯在高峰期间的平均峰值约为 14 辆，且高峰结束后很快恢复。

这解释了一个常见体验：明明放学已经过去一阵子，路口为什么还在堵？因为需要区分**冲击持续多久**和**冲击留下的队伍多久才能消失**。

# 7. 一张几乎没有变化的相图

做到这里，一个自然的下一步是加入方向结构。也许主路占 50% 和主路占 80% 时，控制方式的反转边界会明显不同。

于是我把横轴设为总流量，纵轴设为主路占比，画出了下面这张图。

<img src="/assets/images/life/four-way-stop/control-phase-map.svg" alt="总流量和主路流量占比共同决定四向停车或信号灯哪一种平均延误更低" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">“停/灯”表示平均延误较低的控制方式，格内数字是两者平均延误之差。</p>

它看起来很整齐，也几乎没有提供新信息：从主路占 50% 到 90%，反转都发生在 1,400 到 1,600 辆/小时之间，边界近似一条竖线。

第一反应可能是“主路占比不重要”。但更准确的解释是：**当前模型对这个变量具有结构性不敏感。**

信号灯的绿灯时间按照需求比例重新分配。主路车辆增加时，它也同步得到更多容量。另一方面，four-way stop 接近饱和后，四个进口几乎始终都有车；基准 headway 主要取决于有几个进口排队，而不区分这些车辆属于主路还是支路。

两边都在机制上抵消了流量不平衡对总容量的影响。

所以这张图不是一个值得大书特书的结论，而是一项模型诊断：如果想知道什么真正移动容量边界，应该研究直接改变每次通行所需时间的变量，而不是继续细分主路占比。

# 8. 哪些变量真的会移动边界？

接下来的实验加入三类 counterfactual knobs：左转比例、冲突行人流量和完整停车比例。它们没有全部经过现场校准，所以重点是方向和相对敏感性，而不是把具体阈值当成工程标准。

<img src="/assets/images/life/four-way-stop/experiments/crossover-sensitivity.svg" alt="左转比例、行人流量和完整停车比例变化时平均延误反转流量的位置" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">每个点是插值得到的平均延误反转流量。虚线是基准场景约 1,500 辆/小时。</p>

## 8.1 左转比例

基准实验中，左转只占 10%。敏感性模型相对基准转向结构，为左转加入更长的通行时间。左转车辆增加时，反转边界从没有左转时的约 1,619 辆/小时，逐步下降到左转占 40% 时的约 1,311 辆/小时。

这很符合机制：左转不仅路径更长，还更容易和对向 movement 冲突。尤其在共用一条进口车道时，一辆等待机会的左转车可能阻挡后面的直行车。

## 8.2 行人流量

行人实验把每条冲突横道的到达率从 0 增加到 400 人/小时。模型用 8 秒冲突区占用窗口和 4 秒平均剩余阻挡时间表示车辆让行。信号相位内的直行车辆视为与平行人流兼容，转弯车辆仍可能被阻挡；AWSC 的所有 movement 都可能遇到横道冲突，但权重不同。

反转边界从没有行人时的约 1,526 辆/小时，降到 100 人/小时时的约 1,305 辆/小时，再降到 400 人/小时时的约 990 辆/小时。

这里的精确数值对行人占用假设非常敏感，不能当成现场预测。但结果指出了一个重要方向：行人不是在既有车辆延误上简单加几秒，而可能改变路口的有效服务能力。

## 8.3 完整停车比例

Stop compliance 的实验以 80% 完整停车率为参考，把完整停车相对 rolling stop 的时间差设为 1 秒。完整停车比例从 60% 上升到 100% 时，反转边界从约 1,718 辆/小时下降到约 1,390 辆/小时。

从纯通行效率看，rolling stop 似乎在帮助路口处理更多车辆。但这显然还不是完整的福利比较，因为节省的时间可能来自更高的冲突暴露。这个问题稍后再回来。

# 9. 行为摩擦为什么会在临界点附近爆炸

Four-way stop 最有行为意味的部分，是通行权依赖驾驶人的共同判断。为了单独观察这一机制，模型加入两个参数：

- **Ambiguity window**：两辆车的到达时间差小于多少秒时，会被驾驶人视为“同时到达”；
- **Hesitation time**：每次出现这种歧义时，额外增加多少平均犹豫时间。

下面固定总流量为 1,500 辆/小时。没有额外行为摩擦时，four-way stop 平均延误约为 12.8 秒。

<img src="/assets/images/life/four-way-stop/experiments/ambiguity-hesitation.svg" alt="同时到达判断窗口和每次犹豫时间共同决定四向停车平均延误" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">格内数字是 four-way stop 平均延误。到达判断和犹豫参数目前是反事实旋钮，不是现场估计值。</p>

如果只把“同时到达”的判断窗口设为 0.5 秒，每次歧义额外犹豫 0.5 秒，平均延误上升到约 16.8 秒。窗口和犹豫都变成 1 秒时，平均延误约 48.7 秒。判断窗口为 2 秒、每次犹豫 1 秒时，平均延误约 171 秒。

这并不是因为“多犹豫 1 秒，所以每辆车多等 1 秒”。在 2 秒窗口、1 秒犹豫的场景中，路口每小时只能处理约 1,375 辆车，却有 1,500 辆车到达；模拟结束时平均仍积压约 117 辆。

一个看似很小的行为摩擦把系统推过容量边界，随后增加的主要是排队，而不是那 1 秒本身。

这也是目前最需要真实数据校准的部分。若要继续研究，可以从路口视频中编码到达时间差、实际启动顺序、起步后重新刹停的次数，以及获得通行权到开始移动的时间。

# 10. 右转和行人不是两个独立变量

单独增加右转比例似乎不会制造太严重的问题。右转路径短，很多情况下还避开了路口中心冲突。但只要加入行人，这个判断就可能反转，因为右转车辆与平行方向过街行人共享冲突区。

下面固定总流量为 1,500 辆/小时，同时改变右转比例和每条冲突横道的行人流量。

<img src="/assets/images/life/four-way-stop/experiments/right-turn-pedestrian.svg" alt="右转比例和行人流量共同改变四向停车相对信号灯的平均延误" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">绿色表示信号灯更慢，红色表示 four-way stop 更慢。格内数字是两者平均延误之差。</p>

没有行人时，提高右转比例只带来几秒差异。出现持续行人流量后，结果迅速扩大。以右转 10%、每小时 100 名冲突行人为例，four-way stop 平均延误约 66.7 秒，信号灯约 16.2 秒；前者每小时通过约 1,460 辆，模拟结束仍积压约 33 辆。

图中数百秒的极端格子不应该被当作某个真实路口的预测。它们表达的是同一件事：在接近容量的场景中，右转与行人让行造成的小幅 service-time penalty，可能让路口从稳定区跨入过饱和区。

# 11. 平均效率提高以后，谁在等待？

到现在为止，我们一直把所有车辆平均延误作为主要指标。但当主路占 80%、支路占 20% 时，信号灯可以通过给主路更多绿灯降低加权平均延误。问题是，这些节省的时间来自哪里？

为了回答它，这次不再改变主路流量占比，而是固定 80/20 需求，直接改变信号灯偏向主路的程度。设优先参数为 $\alpha$：

- $\alpha=0$ 时，两条道路均分有效绿灯；
- $\alpha=1$ 时，绿灯按需求比例分配；
- $\alpha>1$ 时，信号进一步偏向主路；
- 每条道路始终至少保留 10 秒有效绿灯。

<img src="/assets/images/life/four-way-stop/experiments/efficiency-fairness.svg" alt="信号灯主路优先程度改变总平均延误与最差方向平均延误" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">横轴是所有车辆平均延误，纵轴是最差方向平均延误；越靠左下越好。Four-way stop 是参照点。</p>

完全均分绿灯时，全部车辆平均延误约 22.4 秒，最差方向约 26.6 秒。温和偏向主路（$\alpha=0.25$）后，两者同时改善到约 16.0 秒和 17.8 秒。这一段没有效率—公平冲突，因为原来的均分本身配置得不好。

继续增加主路优先程度，trade-off 才真正出现：

| 信号优先程度 | 全部车辆平均延误 | 最差方向平均延误 | 方向延误 Gini |
|---|---:|---:|---:|
| $\alpha=0.25$ | 16.0 秒 | 17.8 秒 | 0.04 |
| $\alpha=0.50$ | 13.3 秒 | 21.4 秒 | 0.15 |
| $\alpha=0.75$ | 11.7 秒 | 25.4 秒 | 0.25 |
| $\alpha=1.00$ | 11.0 秒 | 30.6 秒 | 0.33 |
| $\alpha=1.20$ | 11.8 秒 | 40.6 秒 | 0.40 |
| Four-way stop | 19.9 秒 | 20.9 秒 | 0.02 |

按需求比例分配时，信号灯的平均效率最好，但支路承担了更长等待。继续偏向主路以后，支路接近饥饿，总平均延误也重新上升。

这让两种控制方式的制度差异更加清楚：four-way stop 接近逐车的 first-come-first-served；signal 则可以有意重新分配等待。选择配时方案，本质上是在选择社会目标函数究竟多重视加权平均、最差方向和方向间差异。

# 12. Rolling stop：一点效率，多少冲突暴露？

最后回到 stop compliance。

模型为每个未完整停车、同时又存在其它进口车辆或行人冲突的 service event 记录一次“冲突暴露”。它不是事故，也不能转换成事故概率，只是提醒我们不要把 rolling stop 节省的时间当成免费午餐。

<img src="/assets/images/life/four-way-stop/experiments/compliance-tradeoff.svg" alt="完整停车比例变化时四向停车平均延误与冲突暴露代理" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">固定均衡流量 1,400 辆/小时。冲突暴露只是一项机制代理，不是安全估计。</p>

| 完整停车比例 | 平均延误 | 冲突暴露代理（每千辆） |
|---:|---:|---:|
| 60% | 7.6 秒 | 394 |
| 70% | 8.6 秒 | 307 |
| 80% | 10.0 秒 | 209 |
| 90% | 11.9 秒 | 110 |
| 100% | 15.4 秒 | 0 |

如果只最小化平均延误，模型会错误地鼓励更多 rolling stop。加入冲突暴露以后，问题才恢复成真实的形状：我们需要比较节省的时间与增加的风险，而不是把规则遵从仅仅视为通行能力损失。

安全也不能用一句“四向停车更安全”或“信号灯更安全”概括。低速、冲突点分离、追尾、行人保护和驾驶人遵从会影响不同事故类型。本文没有事故数据，因此只把这一节看作未来安全模型的入口，不把冲突暴露外推成安全结论。

# 13. 这些结果能说明什么，不能说明什么

到这里，需要把两类参数分清楚。

第一类有现场或工程文献支撑，包括 AWSC departure headway、信号 saturation headway、周期和 lost time。这些参数仍然经过了简化，但至少有明确经验来源。

第二类是探索性参数，包括：

- 左转相对基准增加多少 service time；
- 行人冲突区占用和剩余阻挡时间；
- 多大的到达时间差会被视为同时到达；
- 每次歧义增加多少犹豫；
- 完整停车与 rolling stop 相差多少时间；
- 未完整停车事件如何映射为真实安全风险。

因此，目前较可信的是机制层面的判断：

- 低流量时，four-way stop 避免空等；
- 接近容量时，小幅 service-time penalty 会被排队非线性放大；
- 左转、行人和行为摩擦比主路占比更容易移动总容量边界；
- 右转与行人存在重要交互；
- 信号配时可以用支路等待换取加权平均效率；
- Stop compliance 不能只作为效率参数讨论。

目前不能声称的是：

- 某个 State College 路口到 1,500 辆/小时就应该装信号灯；
- 图中的行人、犹豫或遵从度数字可以直接预测现场延误；
- 冲突暴露能够替代事故数据；
- 单车道结果适用于多车道、专用转向车道、重车或复杂行人相位；
- 现实选择只有 AWSC 和 fixed signal。TWSC、roundabout、感应信号和几何改造都可能更合适。

真正评估一个具体路口，至少需要采集各进口 15 分钟 turning-movement counts、行人和自行车量、车道几何、实测 departure headway、队列、驾驶人行为和事故记录，再用 HCM 或经过校准的 microsimulation 检查。

# 14. 回到最初的问题

现在可以回到开头：为什么 four-way stop 平时很顺，集中放学时却会突然感觉比红绿灯慢？

因为两种制度支付的是不同成本。

Four-way stop 几乎没有固定的空等成本，却要为每一小组车辆重新完成观察、判断和协调。车少时，这种按需协调非常便宜；车多、左转多、行人多或驾驶人犹豫时，每次微小摩擦都会降低有效服务率。接近容量后，增加的主要不再是几秒操作时间，而是无法及时消化的队伍。

信号灯在低流量时经常让人等待不存在的冲突，但一旦形成连续队伍，它可以把通行权成批分配给同一方向。与此同时，信号配时也不只是技术参数：把更多绿灯给主路会提高平均效率，却可能把等待集中地分给支路。

所以这个问题最终没有一个脱离场景的固定冠军，也没有一个放之四海皆准的反转数字。更准确的判断是：

> 路口控制方式的表现，不仅取决于有多少辆车，还取决于这些车要怎么转、行人怎样穿过、驾驶人怎样协调，以及我们究竟想最小化平均等待、最差方向等待，还是安全风险。

这比一句“四向停车低流量快、红绿灯高流量快”麻烦得多，但也更接近我们每天真正经过的那个路口。

# 数据、代码与参考来源

- [基准模拟完整结果 CSV](/files/life/four-way-stop/simulation-results.csv)
- [敏感性实验完整结果 CSV](/files/life/four-way-stop/experiments/sensitivity-results.csv)
- [反转边界汇总 CSV](/files/life/four-way-stop/experiments/crossover-summary.csv)
- [敏感性实验参数说明](/files/life/four-way-stop/experiments/README.md)
- **Kyte, M. (1990).** [Estimating Capacity of an All-Way-Stop-Controlled Intersection](https://onlinepubs.trb.org/Onlinepubs/trr/1990/1287/1287-009.pdf). *Transportation Research Record 1287*.
- **Kyte, M. et al. (1999).** [A capacity model for all-way stop-controlled intersections based on stream interactions](https://doi.org/10.1016/S0965-8564(98)00043-3). *Transportation Research Part A, 33*(3–4), 313–335.
- **Richardson, A. J. (1987).** [A delay model for multiway stop-sign intersections](https://onlinepubs.trb.org/Onlinepubs/trr/1987/1112/1112-014.pdf). *Transportation Research Record 1112*, 107–114.
- **Han, L. D., Li, J.-M., & Urbanik, T. (2008).** [Control-Type Selection at Isolated Intersections Based on Control Delay Under Various Demand Levels](https://trid.trb.org/View/848454). *Transportation Research Record 2071*, 109–116.
- **Transportation Research Board.** [Highway Capacity Manual 7th Edition 章节结构](https://onlinepubs.trb.org/onlinepubs/webinars/220607.pdf).
- **Federal Highway Administration.** [Manual on Uniform Traffic Control Devices, 11th Edition](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/mutcd11theditionhl.pdf).
- **Federal Highway Administration.** [Traffic Signal Timing Manual, Chapter 3](https://ops.fhwa.dot.gov/publications/fhwahop08024/chapter3.htm).
- **NCHRP Project 3-72.** [Channelized Right-Turn Lanes: Pedestrian and Bicycle Considerations](https://onlinepubs.trb.org/onlinepubs/nchrp/docs/NCHRP03-72_ChannelizedRightTurnsSynthesis.pdf).
- **Federal Highway Administration.** [Naturalistic-driving evidence on stop-sign behavior](https://highways.dot.gov/media/3681).
- **Volk, W. N. (1956).** [Effect of Type of Control on Intersection Delay](https://onlinepubs.trb.org/Onlinepubs/hrbproceedings/35/35-035.pdf).

本文模型用于解释机制，不是工程设计软件。所有图表和正文数字均由仓库中的可复现脚本生成。
