---
layout: post
title: "优雅地用 R 拿捏聚类分析"
main_category: "科研妙招"
date: "2023-05-22"
sub_category: "R 教程"
author: "Zircon"
permalink: "/research/r-tutorials/r-cluster-analysis"
published: true
keywords: ["R 聚类分析", "聚类分析", "cluster analysis", "k-means", "k 均值聚类", "层次聚类", "hierarchical clustering", "kmeans 函数", "hclust", "聚类树状图", "dendrogram", "距离矩阵", "类别划分", "无监督学习", "心理统计 II", "数据分组", "聚类 R", "聚类分析R", "簇 cluster"]
---

至此，心理统计 II 的所有新知识都已经覆盖了。往回看，不得不承认心统 II 的工具性比较强，但课后回味老师上课讲的例子，加上善用搜索理解原理的过程是自己最快乐的时光了。

![心理统计II课程各周讲座与实验安排表](/files/images/r-cluster-analysis/01.jpg)

说实话，这学期心统对自己的帮助还是比较大的。每上一节课，我总会忍不住想想这节课的研究方法能否用到自己正在做（学期初）或者做完了（学期中）的挑战杯，并且现在也开始觉得当时自己只会多元线性回归加上倒退法，确实会的只是皮毛。不过话说回来，工具终归是工具，魏老师不断提醒的“So What?”如同头顶上那轮明月，柔美又值得敬畏！

聚类分析是一种数据分析方法，它可以将相似的物体或数据分成几组。这个方法可以帮助我们更好地理解和处理大量数据。比如，如果我们有很多电影，我们可以使用聚类分析将它们按照类型、主题、导演等特征进行分类。这样，我们就可以更好地管理和了解这些电影，也可以在日后寻找类似的电影时更加方便。聚类分析在生物学、医学、市场营销等领域也有广泛的应用。通过聚类分析，我们可以更好地理解和解释事物之间的联系和相似性。（来自 ChatGPT）

![聚类分析教程封面与目录，含 K-Means、层次聚类等章节](/files/images/r-cluster-analysis/02.jpg)

![K-Means 聚类 kmeans() 函数参数说明及代码示例](/files/images/r-cluster-analysis/03.jpg)

![kmeans() 输出的聚类标签、中心点、组内平方和等结果](/files/images/r-cluster-analysis/04.jpg)

![fviz_cluster() 生成的 K-Means 四类聚类散点图](/files/images/r-cluster-analysis/05.jpg)

![指定初始中心的 K-Means 聚类散点图及层次聚类章节开篇](/files/images/r-cluster-analysis/06.jpg)

![hclust() 生成的层次聚类树状图（无标签版）](/files/images/r-cluster-analysis/07.jpg)

![层次聚类树状图与 fviz_dend() 三色分组可视化](/files/images/r-cluster-analysis/08.jpg)

![aggregate() 输出各聚类中心均值及 silhouette 图代码](/files/images/r-cluster-analysis/09.jpg)

![三类层次聚类的 Silhouette 宽度图，平均轮廓系数 0.3](/files/images/r-cluster-analysis/10.jpg)

![elbow 法最优聚类数折线图，组内平方和随 k 下降](/files/images/r-cluster-analysis/11.jpg)

![silhouette 法最优聚类数折线图，k=2 时平均宽度最高](/files/images/r-cluster-analysis/12.jpg)

![n_clusters() 多方法表决的最优聚类数柱状图，k=2 获最多支持](/files/images/r-cluster-analysis/13.jpg)

![Two Step Clustering 与案例聚类章节，Q1 题目说明](/files/images/r-cluster-analysis/14.jpg)

![基础设施建设指标的层次聚类树状图，按中文变量名分组](/files/images/r-cluster-analysis/15.jpg)

![Q2 按三类均值将七国分为发展中与发达两组的代码与输出](/files/images/r-cluster-analysis/16.jpg)

![各国指标两组均值比较表，涵盖医疗、教育、交通 16 项](/files/images/r-cluster-analysis/17.jpg)

![七国 K-Means 两类聚类散点图，发达与发展中国家分组可视化](/files/images/r-cluster-analysis/18.jpg)
