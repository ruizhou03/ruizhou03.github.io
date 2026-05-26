---
layout: post
title: "尽量优雅地用R对付主成分分析"
main_category: "科研妙招"
date: "2023-05-02"
sub_category: "R 教程"
author: "Zircon"
permalink: "/research/r-tutorials/r-pca"
published: true
keywords: ["主成分分析", "PCA", "principal component analysis", "降维", "dimensionality reduction", "因子分析", "EFA", "bruceR", "prcomp", "princomp", "碎石图 scree plot", "载荷 loadings", "特征值", "特征向量", "方差解释", "协方差矩阵", "R 数据降维", "主城分分析", "PCA R"]
pdf_url: "/files/r-tutorials/r-pca.pdf"
---

这回之所以不优雅，是因为主成分分析的结果本身就不够优雅，但已经尽量在示例代码的基础上优雅了不少。让我们一起说，bruceR::EFA()，永远滴神！

主成分分析（PCA）的核心想法是：手里有一组高维数据（比如几十个变量、上百个样本），它们之间通常存在大量相关性——也就是说“真正独立的信息维度”远少于变量数。PCA 干的事就是**找一组互不相关的新坐标轴**，让数据在第一根轴上散得最开（方差最大）、第二根轴次之、依此类推。把后面那些“几乎没人散开”的轴扔掉，就完成了降维。

实操上 PCA 等价于对**标准化后数据的协方差矩阵做特征分解**：特征向量给出新坐标轴的方向，特征值告诉你每根轴上有多少方差。我们按特征值从大到小排序，留下前 $k$ 个就行。

碎石图（scree plot）是常用的“选几维”判据——把特征值从大到小画出来，**找肘部**（突然变缓的那个拐点）就是 $k$。bruceR::EFA() 把这套流程裹得很顺手，参数和输出都比 prcomp / princomp 友好不少。下方挂的是用大五人格 25 题数据完整跑通的编译版 PDF（含碎石图、方差解释、因子载荷矩阵、成分分析路径图等）。

<p class="img-caption">LaTeX 源码：<a href="/files/r-tutorials/source/r-pca.tex">r-pca.tex</a></p>
