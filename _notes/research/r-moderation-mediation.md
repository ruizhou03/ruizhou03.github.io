---
layout: post
title: "优雅地用 R 拿捏调节效应和中介效应"
main_category: "科研妙招"
date: "2023-04-28"
sub_category: "R 教程"
author: "Zircon"
permalink: "/research/r-tutorials/r-moderation-mediation"
published: true
keywords: ["R 调节效应", "R 中介效应", "调节效应", "中介效应", "moderation", "mediation", "交互作用", "interaction effect", "遗漏变量", "简单斜率分析", "simple slope", "emtrends", "lm 回归", "自变量因变量", "IV DV", "因果分析", "调节中介 R", "调节效用", "中介效应R"]
---

调节效应和中介效应是因果分析中非常重要的两个板块。我仍然很清晰地记得去年《社会心理学》的助教学姐锐评我们搭建的漏洞百出的模型时，“调节效应”“中介效应”信口拈来，而那时连听到“IV”和“DV”都要反应一会儿的我真的完全懵了，只敢连声应下并事后偷偷补了补课。

说白了，调节效应就是“调节”，干预自变量对因变量的作用，技术上就是在多元线性回归中添加了交互作用，中介效应就是“中介”，作为中介介入自变量到因变量的影响，技术上就是多元线性回归中的考虑“遗漏变量”情形。调节作用在上周的一篇小文章样本结构与调节作用中简单谈过。

我后来发现在编译的 PDF 中显示代码结果是一件很烦人的事情，于是索性这回直接把所有的代码输出都隐藏了——结果从 Rmd 到 PDF 的编译速度简直飞起——往常我可以打开朋友圈点个赞的功夫 PDF 才会自动生成（10s 左右），这回没等我把手从键盘挪到鼠标就生成了！此外，《心理统计 II》现在越来越工具性了——我不像也没法像前几节课那样对所有的原理都做到完全消化，尤其是一些很复杂的技术性的检验——因此现在我除了放上最基本的理解外，文档整体上还是工具性更强一些，相信对于有实战需要的朋友能提供更直接的帮助。

![调节效应与中介效应笔记封面，含目录](/files/images/r-moderation-mediation/01.jpg)

![调节效应路径图：W 调节 X 对 Y 的影响](/files/images/r-moderation-mediation/02.jpg)

![调节模型 R 代码：数据中心化与 lm 交互项建模](/files/images/r-moderation-mediation/03.jpg)

![调节模型代码续：emmeans 估计边际均值与简单斜率](/files/images/r-moderation-mediation/04.jpg)

![emtrends 简单斜率分析与 emmip 交互效应可视化代码](/files/images/r-moderation-mediation/05.jpg)

![未中心化调节模型与 bruceR::GLM_summary 残差图代码](/files/images/r-moderation-mediation/06.jpg)

![调节效应局限性说明：六点文字讨论](/files/images/r-moderation-mediation/07.jpg)

![中介效应路径图：X 通过 M 影响 Y，含直接效应与间接效应标注](/files/images/r-moderation-mediation/08.jpg)

![中介效应 R 代码：Baron-Kenny 三步法建立直接效应与内部相关模型](/files/images/r-moderation-mediation/09.jpg)

![中介效应量指标代码：mediation 包计算 ACME、ADE 与中介比例](/files/images/r-moderation-mediation/10.jpg)

![中介效应附录：因果关系的三个成立条件文字说明](/files/images/r-moderation-mediation/11.jpg)

![中介效应因果局限性讨论：六点限制列举](/files/images/r-moderation-mediation/12.jpg)

![Sobel 检验路径图（X→M→Y）与 z 统计量公式及 R 代码](/files/images/r-moderation-mediation/13.jpg)

![中介效应代码尾页：detach 数据附件](/files/images/r-moderation-mediation/14.jpg)
