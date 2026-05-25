---
layout: post
title: "优雅地用bruceR拿捏调节效应和中介效应"
main_category: "科研妙招"
date: "2023-05-01"
sub_category: "R 教程"
author: "Zircon"
permalink: "/research/r-tutorials/r-brucer-moderation-mediation"
published: true
keywords: ["bruceR 调节效应", "bruceR 中介效应", "bruceR PROCESS", "PROCESS 宏", "moderation", "mediation", "调节效应", "中介效应", "简单斜率分析", "simple slope", "simpleSlope", "emtrends", "交互作用", "中心化标准化", "bruceR 教程", "调节中介 R", "PROCESS 模型", "brucR", "调节效用"]
---

这次的内容大不一样！上篇是《优雅地用 R 拿捏调节效应和中介效应》，这次不是优雅地用“R”了，而是优雅地用“bruceR”，比原先用R优雅地多！

站在巨人的肩膀上简单评价前人的成果是“不道德”的，但在进入正文之前，我还是想通过简单对比看看这次是有多优雅！在上篇介绍的，在调节效应显著后，简单斜率分析用到的代码是这样复杂：

```r
simpleSlope <- emtrends(model_moderation,
                        pairwise ~ age_con,
                        var = "Relationship",
                        cov.keep = 3,
                        at = list(
                          age_con = c(m_Age-sd_Age, m_Age, m_Age+sd_Age)),
                        level = 0.95)
summary(simpleSlope)
```

不仅需要指定很繁杂的参数，还要**手动**设置中心化和标准差！而且这还没有考虑此前拟合模型所费的周章。而用了bruceR::PROCESS()，只要一句指令

```r
PROCESS(stu, y="score", x="late", mods="gender")
```

就能给我返回部分模型、全模型，

![PROCESS() 调节效应分析的两模型回归系数汇总表](/files/images/r-brucer-moderation-mediation/03.jpg)

还帮我顺带做了效应估计（在调节作用中即简单斜率分析）！

![PROCESS() 输出的调节效应估计与简单斜率分析结果](/files/images/r-brucer-moderation-mediation/04.jpg)

真的是有被“bruceR::PROCESS()”幸福到！🥰

调节效应和中介效应是因果分析中非常重要的两个板块。说白了，调节效应就是“调节”，干预自变量对因变量的作用，技术上就是在多元线性回归中添加了交互作用，中介效应就是“中介”，作为中介介入自变量到因变量的影响，技术上就是多元线性回归中的考虑“遗漏变量”情形。

对于更基础的知识和操作，可以参见上篇《优雅地用 R 拿捏调节效应和中介效应》，我已经迫不及待地想要介绍“bruceR::PROCESS()”是有多优雅了！正文开始！
![bruceR::PROCESS 处理调节与中介效应教程封面与目录](/files/images/r-brucer-moderation-mediation/05.jpg)

![调节效应与中介效应概念背景及 bruceR 包介绍](/files/images/r-brucer-moderation-mediation/06.jpg)

![bruceR 包加载后主函数列表及 PROCESS() 功能说明](/files/images/r-brucer-moderation-mediation/07.jpg)

![PROCESS() 支持的中介效应置信区间方法及相关 R 包对比](/files/images/r-brucer-moderation-mediation/08.jpg)

![数据准备代码及调节效应分析章节开篇，二分调节变量示例](/files/images/r-brucer-moderation-mediation/09.jpg)

![PROCESS() 输出的回归模型摘要，含交互项系数](/files/images/r-brucer-moderation-mediation/10.jpg)

![PROCESS() 控制台输出的 $R^2$ 及调节效应 Part 2 简单斜率结果](/files/images/r-brucer-moderation-mediation/11.jpg)

![连续调节变量示例，PROCESS() 调节分析输出代码与模型摘要](/files/images/r-brucer-moderation-mediation/12.jpg)

![PROCESS() 多分调节变量的回归模型摘要及交互效应检验](/files/images/r-brucer-moderation-mediation/13.jpg)

![多分调节变量的简单斜率及 MANOVA 描述统计输出](/files/images/r-brucer-moderation-mediation/14.jpg)

![连续调节变量 Johnson-Neyman 图，显示斜率显著区间](/files/images/r-brucer-moderation-mediation/15.jpg)

![多分调节变量 PROCESS() 模型摘要，含 latefre 各水平交互系数](/files/images/r-brucer-moderation-mediation/16.jpg)

![多分调节变量交互效应检验输出及调节变量类型说明](/files/images/r-brucer-moderation-mediation/17.jpg)

![多分调节变量简单斜率分析与 MANOVA 均值描述统计](/files/images/r-brucer-moderation-mediation/18.jpg)

![MANOVA 两因素方差分析输出，含 $\text{late} \times \text{gender}$ 交互效应](/files/images/r-brucer-moderation-mediation/19.jpg)

![EMMEANS() 各水平估计边际均值及配对比较输出](/files/images/r-brucer-moderation-mediation/20.jpg)

![EMMEANS() 各水平均值与配对比较 Cohen's d 完整输出](/files/images/r-brucer-moderation-mediation/21.jpg)

![两个调节变量时的模型结构对比图（2-way vs 3-way）](/files/images/r-brucer-moderation-mediation/22.jpg)

![单一中介变量的 PROCESS() 分析代码与控制台输出](/files/images/r-brucer-moderation-mediation/23.jpg)

![单一中介模型的多模型回归系数摘要表](/files/images/r-brucer-moderation-mediation/24.jpg)

![单一中介效应的 Bootstrap 间接效应估计输出](/files/images/r-brucer-moderation-mediation/25.jpg)

![链式中介与有调节中介的 PROCESS() 代码示例](/files/images/r-brucer-moderation-mediation/26.jpg)

![将 PROCESS() 结果导出到 Word 文件的代码示例](/files/images/r-brucer-moderation-mediation/27.jpg)

![多模型回归系数汇总 APA 格式表格](/files/images/r-brucer-moderation-mediation/28.jpg)
