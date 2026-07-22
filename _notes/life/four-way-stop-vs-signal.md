---
layout: post
title: "美国大学城路口全是 four-way stop，高峰期为什么感觉比红绿灯还慢？"
date: 2026-05-19
main_category: "生活攻略"
sub_category: "生活之问"
keywords: ["four-way stop", "四向停车", "全向停车", "all-way stop", "AWSC", "停车标志路口", "四向停车效率", "四向停车 vs 红绿灯", "红绿灯和停车标志哪个快", "路口通行能力", "交叉口延误", "交通模拟", "Monte Carlo 模拟", "Poisson 到达", "饱和车头时距", "saturation headway", "HCM 通行能力手册", "MUTCD 多向停车", "交通信号配时", "美国大学城路口", "校园路口", "高峰期堵路口", "为什么美国用停车标志", "四向停车谁先走", "通行效率交叉点", "路口控制方式相图"]
permalink: "/life/four-way-stop-vs-signal"
---

# 1. 问题

在美国读书的人几乎都注意到一件事：大学城里大量路口**根本没有红绿灯**，立着的是四块红色八角 STOP 牌，俗称 **four-way stop**（四向停车）——每个方向来的车都要停，通常先到先走。

平时它确实很顺：横向没车，停稳、看一眼就走，不必对着空路等红灯。但只要赶上集中放学，四个方向都排起队，每辆车又都要重新判断一次谁先走，路口就像突然被掐住了喉咙。于是很自然会怀疑：**这种时候，是不是还不如装个红绿灯？**

这个直觉大体正确，但我原先给出的解释太简单了：只画了两条示意曲线，又做了一个“一次只放一辆”的动画。那能说明机制，却不能算量化证据——因为只要预先规定四向停车每 4 秒走一辆、绿灯每 2 秒走一辆，最后当然会得到“高流量时红绿灯赢”。

所以这次不再画一条想象中的曲线，而是做一个**可复现的 Monte Carlo 模拟**：把车辆随机到达、四个进口的流量分布、转向和实测车头时距放进模型，系统跑完 5 种方向结构、13 档总流量、两种控制方式，每个格子重复 40 次。一共是 **5,200 个一小时样本**。

# 2. 先看结果

在本文的单车道、两相位和参数设定下：

- 四向流量均衡时，四向停车在 **1,400 辆/小时**仍较快：平均延误约 **9.9 秒/辆**，定时信号约 **16.3 秒/辆**。
- 到 **1,600 辆/小时**，顺序反转：四向停车约 **22.5 秒/辆**，信号灯约 **16.9 秒/辆**。
- 到 **1,800 辆/小时**，四向停车已经进入不稳定区，平均延误升到约 **154 秒/辆**；信号灯仍约 **17.6 秒/辆**。
- 低流量时红绿灯的代价也很真实。总流量只有 **400 辆/小时**时，四向停车约 **4.1 秒/辆**，定时信号约 **13.8 秒/辆**。

所以确实存在反转，但它不是某个放之四海皆准的神奇数字。在本模型里，均衡路口的反转落在 **1,400–1,600 辆/小时**之间；改变转向、车道数、行人、重车和信号配时，边界都会移动。

更有意思的是：**平均效率和个体体验可能指向不同答案。** 当主路占 80%、总流量为 1,600 辆/小时时，信号灯平均延误只有 12.1 秒，优于四向停车的 19.8 秒；但信号灯下最吃亏方向的平均延误约 31.1 秒，反而高于四向停车的 21.2 秒。信号通过成批放行主路提高总效率，也把等待更集中地分给了支路。

# 3. 怎么模拟

## 3.1 车辆怎么来：不是整齐排队，而是随机到达

设总进入流量为 $q$，主路（南北向）占比为 $m$。四个进口的平均到达率分别是

\[
\lambda_N=\lambda_S=\frac{mq}{2},\qquad
\lambda_E=\lambda_W=\frac{(1-m)q}{2}.
\]

每个进口采用相互独立的 Poisson arrival process。直观地说：模型只规定“平均每小时来多少辆”，具体哪一秒来车由随机数决定。同一个流量跑 40 次，就是为了避免某一次碰巧特别顺或特别堵。

基准情形是一条进口车道，左转、直行、右转比例分别为 10%、80%、10%。每次模拟 75 分钟，前 15 分钟作为 warm-up，后 60 分钟计入结果。

## 3.2 四向停车：不是“一次只能走一辆”

真实 four-way stop 最容易被简化错的地方就在这里。对向直行等互不冲突的车辆可能同时通过；而当相邻进口都有车、有人左转、或者四边同时到达时，判断和轮转又会拉长同一进口的 departure headway。

1990 年，Michael Kyte 在 20 个 all-way-stop 路口记录了 7,129 个饱和 departure headways，并按其它进口是否有车分成四类。单车道四腿路口的实测均值大致落在下面这些量级：

| 路口状态 | 本文采用的平均 departure headway |
|---|---:|
| 只有本进口有排队 | 3.7 秒 |
| 本进口 + 对向进口 | 5.7 秒 |
| 本进口 + 冲突进口 | 6.5 秒 |
| 四个进口都在排队 | 8.4 秒 |

这些是“同一个进口连续两辆车离开”的间隔，不是整个路口每辆车之间的间隔。模型因此让有车的进口按最早到达顺序轮转，并把上述 approach headway 除以当前有车的进口数，转换成全路口的 service-event interval；只有在没有横向冲突队伍时，互不冲突的对向 movement 才一起放行。每次间隔再加入 coefficient of variation 为 0.15 的 lognormal 扰动，表示驾驶人的反应差异。

这仍然是一个透明的简化模型，不是 Highway Capacity Manual 的复刻。但它至少不再把 four-way stop 错写成一个固定 4 秒的单服务器。

## 3.3 红绿灯：连续放行，但要付切换成本

信号灯使用 70 秒周期、南北/东西两个相位，一个周期共留 8 秒给黄灯、全红和切换损失。绿灯期间的 saturation headway 取 2.0 秒，也就是每车道每小时绿灯约 1,800 辆的基础饱和流率。这个 2 秒基准与 Kyte 论文引用的 HCM 数值一致。

为了不故意把偏流路口的信号配坏，剩余 62 秒有效绿灯按两条道路的需求比例分配，同时保证每条道路至少 10 秒绿灯：

\[
g_{\text{major}}
=\min\left\{52,\max\left[10,\;62m\right]\right\},
\qquad
g_{\text{minor}}=62-g_{\text{major}}.
\]

这仍然是**经过需求适配的定时信号**，不是车辆感应式或实时自适应信号。后两者在低流量时可以跳过没有车辆的相位，通常会进一步缩小红绿灯的“空等损失”。

## 3.4 输出什么

这里的“延误”是车辆到达进口队首后，到获得通行权之间的时间；没有把上游减速和通过路口后的加速损失全部加进去。除了平均值，模型还记录：

- 第 95 百分位延误；
- 实际通过量与模拟结束时的剩余排队；
- 四个进口中最差方向的平均延误；
- 四个方向平均延误的 Gini coefficient。

如果一辆车到模拟结束仍没通过，它已经等待的时间会作为右删失下界计入。因此过饱和区域的延误数字是**保守下界**：继续模拟下去，队伍还可能继续增长。

# 4. 结果一：所谓“交叉点”，实际是一段很陡的容量边界

<img src="/assets/images/life/four-way-stop/delay-curves.svg" alt="四向停车和定时信号在均衡与偏流情形下的平均延误曲线" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">每个点是 40 次随机模拟的平均值，阴影为 95% Monte Carlo confidence interval。曲线到 300 秒处截断，以免过饱和区把低流量部分压扁；完整数字可在文末下载。</p>

左图是四向均衡，右图是主路占 80%。两边都能看到三个阶段：

1. **低流量：四向停车赢。** 路口经常只有一个方向来车，停稳后很快就走；定时信号却仍可能让它等待完整红灯。
2. **接近容量：结果迅速反转。** 均衡情形下，1,400 辆/小时的四向停车平均延误是 9.9 秒；1,600 辆/小时已经变成 22.5 秒。增加的只是 14% 流量，平均延误却增长了 127%。
3. **超过容量：队伍不再自行消失。** 到 1,800 辆/小时，四向停车的到达率长期高于可实现离开率，延误不只是“多一点”，而是随着观察窗口继续增长。

这就是为什么体感会突然恶化。路口容量不是一道撞上去立刻停住的墙；它更像排队论中的临界点。当利用率 $\rho=\lambda/\mu$ 接近 1 时，随机到达造成的小波动越来越难被消化；一旦长期超过 1，任何有限时间算出的“平均延误”都只是不断增长过程中的一帧。

尾部体验也会先于均值恶化。均衡流量为 1,600 辆/小时时：

| 控制方式 | 平均延误 | 第 95 百分位延误 | 结束时平均剩余队伍 |
|---|---:|---:|---:|
| 四向停车 | 22.5 秒 | 49.4 秒 | 9.8 辆 |
| 定时信号 | 16.9 秒 | 39.9 秒 | 0.0 辆 |

“我怎么偏偏等了快一分钟”的抱怨，不一定和平均值矛盾；排队分布的右尾本来就比均值更早变难看。

# 5. 结果二：不是一个交叉点，而是一张控制方式地图

<img src="/assets/images/life/four-way-stop/control-phase-map.svg" alt="总流量和主路流量占比共同决定四向停车或信号灯哪一种平均延误更低" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">横轴是四个进口合计流量，纵轴是主路占比；“停/灯”表示哪种方式的平均延误更低，格内数字是两者相差多少秒。这里的边界只属于本文参数，不是工程安装标准。</p>

原问题只沿着“总流量”这一根轴思考，所以想象中会有一个固定交叉点。把方向结构加入后，它变成一条边界：

- 在这组参数下，5 种主路占比的反转都发生在 1,400–1,600 辆/小时之间。
- 偏流越明显，按需求分配绿灯的信号在平均值上越占便宜，边界略向左移动。
- 但这不等于偏流路口就该在 all-way stop 和 signal 之间二选一。2008 年 Han、Li 与 Urbanik 用 HCM 方法分析超过 5,000 个场景后指出：**主支路很不均衡、支路流量又低时，two-way stop 往往比两者都合适**；流量较均衡且低至中等时，all-way stop 才更有优势。

因此，严谨的问题从来不是“四向停车还是红绿灯”，而是“在 AWSC、TWSC、signal、roundabout 等候选机制中，谁在给定需求与安全条件下表现最好”。本文因为要回答原题，才只保留前两种。

# 6. 结果三：集中放学不是稳态流量，而是一记冲击

平均每小时流量还会掩盖大学城最典型的现象：平时车很少，下课后 20 分钟突然一起涌来。

下面让总流量先保持在 400 辆/小时，第 25–45 分钟跃升到 2,000 辆/小时，再降回 400；曲线是 40 次模拟的平均排队车辆数。

<img src="/assets/images/life/four-way-stop/peak-queue.svg" alt="集中放学二十分钟期间四向停车与定时信号的平均排队车辆数" style="max-width:100%;width:760px;box-shadow:none;">
<p class="img-caption">高峰结束并不等于堵车立刻结束。四向停车在第 45 分钟平均积压约 106 辆；需求恢复后还要再用约 15 分钟消化。信号灯的平均峰值约 14 辆。</p>

这张图比稳态曲线更接近“下课后那十几分钟”的真实体验：

- 四向停车不是任何时刻都慢。前 25 分钟两者都没形成持续队伍。
- 高峰流量越过容量后，四向停车的积压近似线性增长；到高峰结束时平均约 106 辆。
- 需求降回低位后，路口才有富余能力偿还之前欠下的队伍。本文设定下，大约又过 15 分钟才基本清空。

所以应该区分两件事：**高峰本身持续多久**，以及**高峰留下的队伍要多久才能消失**。后者才是人们觉得“明明已经放学一阵子，怎么还堵着”的原因。

# 7. 一个经济学上更有意思的结果：效率和公平会分叉

把主路占比设成 80% 后，经过需求适配的信号灯会把更多绿灯给主路。这明显提高加权平均效率，但支路司机承担了更长的红灯。

| 总流量 1,600 辆/小时，主路占 80% | 全部车辆平均延误 | 最差方向平均延误 | 方向延误 Gini |
|---|---:|---:|---:|
| 四向停车 | 19.8 秒 | 21.2 秒 | 0.02 |
| 定时信号 | 12.1 秒 | 31.1 秒 | 0.31 |

这提供了一个比“谁更快”更好的机制设计视角：

- **Four-way stop** 是去中心化、近似 first-come-first-served 的逐车协调。它有观察和协商成本，但各方向的等待更均匀。
- **Signal** 是中心化、按方向 batching 的通行权分配。它用固定切换损失换取连续放行，并且可以有意偏向需求更大的方向。

如果目标函数只最小化所有车辆的平均延误，信号灯可能已经赢了；如果还惩罚最差方向等待，或者要求某种程序公平，结论可能不同。现实交通工程当然还要加入事故、行人、自行车、建设与维护成本——一个控制方式不是单凭平均延误就能决定的。

# 8. 历史上有没有人研究：不但有，而且是一条六十多年的文献线

- 1950 年代已经有现场比较 two-way stop、four-way stop、定时信号和感应信号延误的研究。早期结果就提醒：**信号怎么配时**和**流量怎么分布**都会改变排名，而不是“装灯必然更快”。
- 1963 年 Hebert 用芝加哥三个路口研究 four-way-stop capacity，后来成为早期 HCM 材料的重要基础。
- 1987 年 Richardson 建立 multiway-stop 的排队延误模型。
- 1990 年 Kyte 用 20 个现场、7,129 个 departure headways 建立 AWSC approach-capacity model。
- 1990 年代的 NCHRP Project 3-46 又系统扩充现场数据；1999 年发表的 stream-interaction model 使用超过 20,000 个车头时距，把冲突状态细分为五类。
- 2008 年 Han、Li 与 Urbanik 跑了超过 5,000 个 HCM cases，直接研究不同需求水平下应该选 TWSC、AWSC 还是 signal。
- 目前的 **Highway Capacity Manual 7th Edition** 仍把 Signalized Intersections、Two-Way Stop-Controlled Intersections、All-Way Stop-Controlled Intersections 和 Roundabouts 分成独立章节。

换句话说，这不是没人碰过的空白题目。如果只比较一次 four-way stop 与 fixed signal，很难构成新的交通工程论文；但作为一篇可复现的科普文章，它完全可以做得扎实。若进一步加入“同时到达判断误差、驾驶人犹豫、抢行概率、规则熟悉度”等行为参数，再配合真实路口视频编码，才可能长成一个更有行为经济学味道的小研究。

# 9. 两个需要纠正的常见说法

## 9.1 MUTCD warrant 不是简单的“流量上限”

美国 2023 MUTCD 的 all-way-stop warrants 包括事故、视距、向信号灯过渡、八小时流量和其它因素。八小时流量条款给出的其实是**最低条件**：major-street approaches 合计至少 300 units/hour，minor-street approaches 合计至少 200 units/hour，并持续任意相同的 8 小时；满足 warrant 本身也不自动要求安装。

信号灯同样如此：满足一个 signal warrant 只是启动完整工程判断的条件，不等于“必须装灯”。FHWA 还明确提醒，即使满足 warrant，也应考虑 STOP control、环岛或几何改造等替代方案。

## 9.2 安全不能用一句“停车牌更安全”概括

Four-way stop 强迫低速，确实会改变冲突速度和事故类型；信号灯则把冲突 movement 分时隔离，却可能增加追尾。FHWA 的 Traffic Signal Timing Manual 引用过一项结果：四腿城市 stop-controlled intersection 改为信号控制后，fatal-and-injury crashes 的 accident modification factor 约为 0.77，即估计减少 23%。但同一手册也强调，有些地点装信号后车辆延误或某些事故类型反而会上升。

所以完整比较至少应该是一个效率—安全前沿，而不是把“安全”当作某种控制方式的永久标签。本文没有事故数据，因而只报告运行效率，不把模拟延误外推成安全结论。

# 10. 这次模拟能说明什么、不能说明什么

它能说明：

- 低流量时四向停车的灵活性确实有价值；
- 接近容量时，平均延误和尾部等待会非线性上升；
- “交叉点”依赖需求结构和配时，不是固定常数；
- 短暂的过饱和也可能留下持续很久的队伍；
- 最小化平均延误与照顾最差方向不是同一个目标。

它不能说明：

- State College 某个具体路口就该在 1,500 辆/小时改信号；
- 本文数字可以替代 HCM、现场 turning-movement count 或工程设计；
- 四向停车或信号灯在一般意义上“更安全”；
- 多车道、行人密集、校车与重车很多的路口仍沿用同一边界。

真正评估一个具体路口，需要至少采集各进口 15 分钟流量、左右转比例、行人/自行车量、车道几何、实测 departure headway、现有排队和事故记录，再用 HCM 或经过校准的 microsimulation 检查。

# 11. 数据、代码与参考来源

- [下载本文完整模拟结果 CSV](/files/life/four-way-stop/simulation-results.csv)。图表与正文数字均由仓库中的可复现脚本生成。
- **Kyte, M. (1990).** [Estimating Capacity of an All-Way-Stop-Controlled Intersection](https://onlinepubs.trb.org/Onlinepubs/trr/1990/1287/1287-009.pdf). *Transportation Research Record 1287*. ——20 个路口、7,129 个 departure headways；本文 AWSC headway calibration 的主要来源。
- **Kyte, M. et al. (1999).** [A capacity model for all-way stop-controlled intersections based on stream interactions](https://doi.org/10.1016/S0965-8564(98)00043-3). *Transportation Research Part A, 33*(3–4), 313–335. ——超过 20,000 个 headways、五类冲突状态。
- **Richardson, A. J. (1987).** [A delay model for multiway stop-sign intersections](https://onlinepubs.trb.org/Onlinepubs/trr/1987/1112/1112-014.pdf). *Transportation Research Record 1112*, 107–114. ——AWSC 排队延误模型。
- **Han, L. D., Li, J.-M., & Urbanik, T. (2008).** [Control-Type Selection at Isolated Intersections Based on Control Delay Under Various Demand Levels](https://trid.trb.org/View/848454). *Transportation Research Record 2071*, 109–116. ——超过 5,000 个 HCM cases，比较 TWSC、AWSC 与 signal。
- **Transportation Research Board.** [Highway Capacity Manual 7th Edition 章节结构](https://onlinepubs.trb.org/onlinepubs/webinars/220607.pdf). ——第 19–22 章分别处理 signal、TWSC、AWSC 与 roundabout。
- **Federal Highway Administration.** [Manual on Uniform Traffic Control Devices, 11th Edition](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/mutcd11theditionhl.pdf). ——all-way-stop 与 signal warrants 的现行联邦标准。
- **Federal Highway Administration.** [Traffic Signal Timing Manual, Chapter 3](https://ops.fhwa.dot.gov/publications/fhwahop08024/chapter3.htm). ——signal warrants、替代方案与事故修改因子讨论。
- **Volk, W. N. (1956).** [Effect of Type of Control on Intersection Delay](https://onlinepubs.trb.org/Onlinepubs/hrbproceedings/35/35-035.pdf). ——早期现场延误比较。

本文模型是解释机制的 stylized simulation，不是工程设计软件。最重要的输出也不是“1,500”这个近似数字，而是那张相图背后的判断：**路口控制方式没有脱离需求结构的固定冠军。**
