---
layout: post
title: "优雅地用 R 拿捏生存分析"
main_category: "科研妙招"
date: "2023-05-19"
sub_category: "R 教程"
author: "Zircon"
permalink: "/research/r-tutorials/r-survival-analysis"
published: true
keywords: ["优雅地用 R 拿捏生存分析", "生存分析", "survival analysis", "Kaplan-Meier", "Kaplan-Meier 曲线", "KM 曲线", "Cox 回归", "Cox proportional hazards", "比例风险模型", "风险比", "hazard ratio", "survival package", "survfit", "coxph", "R 语言", "R tutorial", "R 教程", "事件发生概率", "生存曲线", "统计分析"]
---

这次只有九页，说起来难得这么优雅了。

生存分析是一种研究某个事件发生的概率的方法，这个事件可以是任何一件可能发生的事情，比如人们生病、死亡或者产品出现故障等。生存分析主要关注的是事件发生的时间，而不是事件是否发生的概率。

生存分析的目的是通过分析不同的因素对事件发生的影响，来预测某个事件的发生概率。例如，我们可以通过研究一个人的年龄、生活习惯、基因等因素，来预测他患某种疾病的概率，从而制定更有效的预防和治疗措施。

生存分析常用的方法有 Kaplan-Meier 曲线和 Cox 回归分析。Kaplan-Meier 曲线可以用来画出事件发生概率随时间变化的曲线，而 Cox 回归分析可以用来研究不同因素对事件发生概率的影响程度，比如年龄、性别、生活习惯等。

生存分析在医学、生物学、工程、经济学等领域都有应用。例如，在医学领域，生存分析可以用来研究不同治疗方法对患者生存时间的影响，从而帮助医生选择最适合患者的治疗方案。

总之，生存分析是一种非常有用的统计方法，可以帮助我们预测某个事件的发生概率，并且研究不同因素对事件发生的影响。

![生存分析笔记封面：目录含 Packages、Survival Object、Surv Model、Cox Regression、Surv Plots](/files/images/r-survival-analysis/02.jpg)

![lung 数据集变量说明：生存时间、删失状态、ECOG 评分等字段描述](/files/images/r-survival-analysis/03.jpg)

![survfit 建立生存模型代码与整体生存摘要输出（中位数 310 天）](/files/images/r-survival-analysis/04.jpg)

![按性别分组的生存模型摘要：男女各组中位生存时间对比](/files/images/r-survival-analysis/05.jpg)

![Cox 比例风险回归代码与性别风险比（HR=0.588）输出结果](/files/images/r-survival-analysis/06.jpg)

![survdiff 对数秩检验输出：男女生存差异卡方统计量（p=0.001）](/files/images/r-survival-analysis/07.jpg)

![按性别绘制的 Kaplan-Meier 生存曲线，含置信区间与风险表](/files/images/r-survival-analysis/08.jpg)

![按性别绘制的累积事件曲线（fun=“event”），p=0.0013](/files/images/r-survival-analysis/09.jpg)

![按性别绘制的累积风险曲线（fun=“cumhaz”），男性高于女性](/files/images/r-survival-analysis/10.jpg)
