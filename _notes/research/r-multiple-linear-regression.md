---
layout: post
title: "优雅地用 R 拿捏多元线性回归"
main_category: "科研妙招"
date: "2023-04-04"
sub_category: "R 教程"
author: "Zircon"
permalink: "/research/r-tutorials/r-multiple-linear-regression"
published: true
keywords: ["R 多元线性回归", "多元线性回归", "multiple linear regression", "线性回归", "linear regression", "lm 函数", "回归系数", "回归模型", "最小二乘", "OLS", "逐步回归", "stepwise", "回归诊断", "多重共线性", "残差分析", "R 回归教程", "回归分析 R", "多元回归", "多元线性回归R"]
---

![多元线性回归教程封面与目录，含五大章节索引](/files/images/r-multiple-linear-regression/01.jpg)

![加载 dplyr 包及读取数据，attach() 函数说明](/files/images/r-multiple-linear-regression/02.jpg)

![相关矩阵代码及 cor() 输出结果，各变量两两相关系数](/files/images/r-multiple-linear-regression/03.jpg)

![bruceR::Corr() 生成的可视化相关矩阵热力图](/files/images/r-multiple-linear-regression/04.jpg)

![各变量对之间的 Pearson 相关系数与置信区间表](/files/images/r-multiple-linear-regression/05.jpg)

![lm() 拟合多元线性回归及 summary() 输出的系数与显著性](/files/images/r-multiple-linear-regression/06.jpg)

![coefficients() 与 confint() 输出的回归系数及 95% 置信区间](/files/images/r-multiple-linear-regression/07.jpg)

![anova() 模型比较输出及标准化多元线性回归章节介绍](/files/images/r-multiple-linear-regression/08.jpg)

![标准化多元线性回归 summary() 输出，含标准化系数](/files/images/r-multiple-linear-regression/09.jpg)

![pcor() 偏相关和半偏相关矩阵输出](/files/images/r-multiple-linear-regression/10.jpg)

![ppcor 包输出的相关系数、t 统计量及 p 值矩阵](/files/images/r-multiple-linear-regression/11.jpg)

![ppcor 输出的统计量矩阵与拟合优度章节过渡](/files/images/r-multiple-linear-regression/12.jpg)

![回归拟合值与真实薪资的散点图](/files/images/r-multiple-linear-regression/13.jpg)

![残差直方图，显示残差分布形态](/files/images/r-multiple-linear-regression/14.jpg)

![plot(fit) 输出的残差与拟合值散点图](/files/images/r-multiple-linear-regression/15.jpg)

![Normal Q-Q 图与 Scale-Location 图并排，检验残差正态性与同方差性](/files/images/r-multiple-linear-regression/16.jpg)

![Cook's Distance 图与残差对杠杆值图，识别强影响点](/files/images/r-multiple-linear-regression/17.jpg)

![Cook's 距离与杠杆值二维图，标注离群点](/files/images/r-multiple-linear-regression/18.jpg)

![performance::check_model() 输出的影响点检验图](/files/images/r-multiple-linear-regression/19.jpg)
