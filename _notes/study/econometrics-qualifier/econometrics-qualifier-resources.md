---
layout: post
main_category: "学习资料"
sub_category: "经济计量学博资考"
title: "Penn State 经济计量学博资考：Cheat Sheet、ECON 501 讲义与往年题"
list_title: "资源说明与官方往年题入口"
keywords: ["Penn State 经济学 博资考", "PSU Economics qualifier", "econometrics qualifying exam", "经济计量学 博士资格考试", "Penn State econometrics qual", "ECON 501", "ECON 510", "计量经济学 cheat sheet", "econometrics cheat sheet PDF", "博资考 往年题", "econometrics qualifier past exams", "博资考 参考答案", "qualifying exam solutions", "ECON 501 handbook", "概率论 渐近理论", "GMM", "quantile regression", "weak IV", "弱工具变量", "bootstrap subsampling", "LASSO Ridge", "Penn State Economics PhD", "计量经济学 复习资料", "博士资格考 备考", "econometrics comprehensive exam"]
discipline: "经济学"
course: "经济计量学博资考（PSU）"
material_type: "Notes"
date: 2026-08-18
author: "Rui Zhou"
permalink: "/notes/econometrics-qualifier/resources"
summary: "Penn State 经济学博士项目 Econometrics Qualifier 的学生备考资料页：一页四栏 cheat sheet、ECON 501 自足讲义、2017–2025 非官方参考解答，以及系里公开的历年 Econometrics Qual 原卷入口。"
published: true
trashed: false
---

这是我准备 Penn State Economics Econometrics Qualifier 时整理的资料。考试结束后，我把原来的大 handbook 拆成了更清楚的三份：一页速查表、只保留高质量 **ECON 501** 部分的自足讲义，以及与系里公开原卷配套的学生参考解答。

> 这些都是**非官方学生资料**，不代表 Penn State Department of Economics 或任课教师。原始试卷请以系里公开档案为准；参考解答可能仍有疏漏，不能替代课程讲义、教材或教师勘误。

## 三份可下载资料

### 1. 一页四栏 Econometrics Qualifier Cheat Sheet

[下载 PDF：Econometrics Qualifier Cheat Sheet](/files/econometrics-qualifier/econometrics-qualifier-cheat-sheet.pdf)

横向 Letter、一页四栏，覆盖 ECON 501 与 ECON 510 的核心公式、条件、反例和高频题型提示。它是为考试现场设计的极高密度版本；在普通屏幕上建议放大阅读，打印时可先试 97% 缩放，避免打印机不可打印边缘吃掉内容。

公开前我补回了若干只适合私人速记、但不适合交给别人的条件。例如：正态二次型现在明确要求对称矩阵，投影二次型明确要求 \(P=P'=P^2\)；MCT/DCT、MLE invariance、Fisher information、Neyman–Pearson 边界随机化和 plain LASSO 的 oracle 限制也都写得更完整。

### 2. ECON 501 自足讲义

[下载 PDF：ECON 501 Self-Contained Handbook（104 页）](/files/econometrics-qualifier/econ-501-self-contained-handbook.pdf)

这本只保留原 handbook 中完成度较高的 ECON 501 部分：测度论概率、分布与矩、条件期望与多元正态、收敛与渐近理论、估计与 MLE、经典假设检验。写法以“第一次系统阅读也能跟下来”为目标，中文负责直觉和步骤，英文负责正式陈述与可复现证明。

原 handbook 的 ECON 510 教材式章节暂不公开，因为它们尚未达到同样的自足性和稳定性标准。

### 3. 2017–2025 Qualifier 非官方参考解答

[下载 PDF：Econometrics Qualifier Reference Solutions 2017–2025（174 页）](/files/econometrics-qualifier/econometrics-qualifier-reference-solutions-2017-2025.pdf)

这本按年份整理了 **94 个题目标签**，提供中文识题思路、英文推导和易错点。它不是官方 solutions；使用时请同时打开下方对应年份的官方原卷。2021 年系里公开扫描件只有两页，缺失题面没有臆造或补写。

我在拆分发布前做了结构和数学审查：所有题目标签都有唯一元数据、没有重复或占位 TODO；独立卷的章节引用已经修复；PDF 经过 XeLaTeX 编译、`qpdf` 结构检查、严格重开、空白页检查和封面/目录/中段/末页抽样渲染。长解答仍可能存在人工疏漏，发现问题请把年份、题号和具体等式发给我。

## Penn State 系里公开的 Econometrics Qual 原卷

下面全部直接链接 Penn State Department of Economics 的公开文件，不在本站重复托管：

| 年份 | 官方原卷 |
|---|---|
| 2025 | [2025 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2025/10/2025-Econometrics-Exam.pdf) |
| 2024 | [2024 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2024/10/Metrics-2024-Exam.pdf) |
| 2023 | [2023 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2023/10/20230927085024916.pdf) |
| 2022 | [2022 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2023/02/comp22-econometrics.pdf) |
| 2021 | [2021 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2022/05/Econometrics-2021.pdf)（公开扫描仅两页） |
| 2020 | [2020 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2022/05/Econometrics-2020.pdf) |
| 2019 | [2019 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2021/11/Econometrics-2019.pdf) |
| 2018 | [2018 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2021/11/Fall-18-Qualifier-Econometrics.pdf) |
| 2017 | [2017 Econometrics Exam](https://econ.la.psu.edu/wp-content/uploads/sites/5/2021/11/econometrics_candidacy_exam_august_18_2017.pdf) |

系里的总入口在 [Ph.D. Qualifier Exams](https://econ.la.psu.edu/ph-d-program/ph-d-qualifier-exams/)，那里还包括 Micro 和 Macro 原卷。

## 配套的 ECON 510 课程考试

“高级计量经济学（PSU）”课程目录现在还收录了三份带解答试卷：[2025 春期中]({{ '/notes/adv-metrics-psu/midterm-spring-2025-with-solutions' | relative_url }})、[2026 春期中]({{ '/notes/adv-metrics-psu/midterm-spring-2026' | relative_url }})和[2026 春期末]({{ '/notes/adv-metrics-psu/final-spring-2026-with-solutions' | relative_url }})。这些是课程考试资料，不是 Qualifier 官方答案；Qual 原卷和本页的非官方参考解答仍应分别理解。

## 使用建议

如果时间充足，先读 ECON 501 讲义，再按年份限时做原卷，最后对参考解答。若只剩几天，先做 2023–2025，再用 cheat sheet 查缺补漏。不要只背最终分布：资格考通常会给中间步骤分，至少要能写出假设、标准化、所用定理和关键展开。

版本日期：2026-08-18。后续若有勘误，我会在本页更新文件与说明。
