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
---

这回之所以不优雅，是因为主成分分析的结果本身就不够优雅，但已经尽量在示例代码的基础上优雅了不少。让我们一起说，bruceR::EFA()，永远滴神！

主成分分析（PCA）是一种常用的数据降维技术，用于对高维数据进行降维处理。它通过找到数据中最主要的特征，将数据映射到一个更低维度的空间中，从而减少数据的维度，同时保留了大部分的信息。

具体而言，PCA 的目标是将原始数据转换为一组新的变量，这些变量被称为主成分，并且它们是原始数据的线性组合。这些主成分按照其解释原始数据方差的大小排序，因此前几个主成分通常可以代表原始数据的大部分信息。

PCA 的过程可以概括为以下几个步骤：

1. 将原始数据进行标准化，使每个变量的均值为0，标准差为1。

2. 计算协方差矩阵，该矩阵描述了原始数据中各个变量之间的关系。

3. 计算协方差矩阵的特征向量和特征值，特征向量是表示主成分的方向，而特征值则代表该方向上的方差。

4. 按照特征值的大小，选取前几个特征向量作为主成分。

5. 将原始数据映射到所选的主成分上，得到降维后的数据。

PCA 的应用非常广泛，例如在图像处理、语音识别、生物信息学等领域中都有应用。通过 PCA，我们可以有效地减少数据的维度，从而使得数据更易于处理和分析，同时也可以发现数据中的主要模式和结构。

![PCA 笔记封面：bruceR::EFA 主要参数中文说明](/files/images/r-pca/01.jpg)

![PCA 数据预处理：大五人格数据缺失值处理与变量选取代码](/files/images/r-pca/02.jpg)

![大五人格数据 PCA 碎石图，横轴为成分数，纵轴为特征值](/files/images/r-pca/03.jpg)

![EFA 函数返回结果结构说明及 stargazer 输出方法](/files/images/r-pca/04.jpg)

![EFA 方差解释表：各主成分特征值、方差比例与累积方差](/files/images/r-pca/05.jpg)

![EFA 因子载荷矩阵：25 个大五人格题目在 6 个主成分上的载荷与公因子方差](/files/images/r-pca/06.jpg)

![各主成分特征值与 SS 载荷汇总表（25 个成分）](/files/images/r-pca/07.jpg)

![PCA 成分分析路径图：25 题到 RC2–RC4 的载荷连线](/files/images/r-pca/08.jpg)

![因子分析路径图（Kaiser 标准化后）：25 题到 RC2–RC4 的载荷连线](/files/images/r-pca/09.jpg)
