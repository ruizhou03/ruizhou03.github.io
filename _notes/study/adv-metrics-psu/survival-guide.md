---
layout: post
main_category: "学习资料"
sub_category: "高级计量经济学（PSU）"
title: "我和 Claude Code 合力，写了份计量 8 天自救指南"
keywords: ["高级计量 期末 自救", "高计 PSU 求生指南", "ECON 510 final 复习", "metrics survival guide", "advanced econometrics PSU final", "Patrik Guggenberger", "8 天复习计划", "Claude Code 写讲义", "考点优先级 ROI", "GMM bootstrap 复习", "weak IV 复习", "Lasso 应试", "博一 计量 期末", "Penn State 经济学博士", "高计 8 天 速成", "计量 求生指南", "高级计量 速成讲义", "metrics 速成"]
list_title: "Advanced Econometrics: An 8-Day Survival Guide"
discipline: "经济学"
course: "高级计量经济学（PSU）"
material_type: "Notes"
date: 2026-05-02
author: "Zircon"
permalink: "/notes/adv-metrics-psu/survival-guide"
pdf_url: "/files/adv-metrics-psu/metrics-survival-guide.pdf"
---

> *“This textbook is written for someone who has not been to class since the midterm and has not opened the lecture notes. You have 8 days, you need a B-, and you do not have time to learn the material the long way.”*
> ——讲义首页

## 起因

事情大概是这样的：

- 4 月底，距离 Patrik Guggenberger 教授的 **ECON 510 final exam** 还有 9 天。
- 我已经很久没去上课了，midterm 之后的内容也没怎么看。
- 课件叠在硬盘里，问题集摆在 Canvas 里，旧考题在角落吃灰。
- 我的目标不是 A，也不是理解每个证明的全部细节。我的目标是 **B-，活下去，把时间留给真正属于我的研究方向**。

这是 metrics 博一的真实处境：要学的太多，要应付的考试太多，但每个 topic 我们最终未必都用得上。Patrik 的课是必修，他自己的研究方向是 weak IV / asymptotic size，跟我之后想做的方向距离比较远。投入产出比的考虑很现实。

但 Patrik 教得认真，考得也不水。所以“用最少的时间换最高的分数”成了一个真实的工程问题。

于是我决定写一本针对这门期末的**应试讲义**，写给一个特定的读者：「midterm 之后没去过课、没翻过 lecture notes、还有 8 天考试、需要 B-」的我自己。目标是：

- **可替代**全部讲义、问题集、midterm 旧题。读完这本就够了。
- **按考点 ROI 排序**。高频考点放在前面，低频甚至从未考过的章节直接放最后或允许跳过。
- 每个知识点**先讲直觉、再上数学**——为什么要学它、它和前面的工具是什么关系。
- 每个证明分**优先级**：哪些必须会默写、哪些知道结构就行、哪些可以彻底跳过。
- 每道作业题**完整原文**，配考察点 + 思路 + 逐步带“why”标注的解答。

最后写下来一共 113 页 PDF，11 章，覆盖从 Q1 模板到 Lasso 的全部内容，外加一个独立的 HW5–HW10 题答汇总章节。

## 这本讲义适合谁

**适合**：

- 正在或即将参加 ECON 510（或类似 first-year metrics 期末）的学生。Patrik 的课每年内容大体稳定。
- 时间紧、目标是“过线”而非“精通”的同学。
- 对“如何在 8 天内组织一个 ROI 优先的复习方案”感兴趣的人。

**不适合**：

- 想真正搞懂计量基础的人。这是一本求生指南，不是 Hayashi，也不是 Hansen。许多技术细节（Edgeworth expansion、empirical process theory、subsampling 严格证明）只被引用而非完整推导。
- 想看完整证明的人——请去看 Don Andrews 的讲义和 Patrik 自己的 lecture notes，那是源头。

## 怎么用

### 1. 章节 Tier 系统

11 章按考试重要性分成三档：

| Tier | 章节 | 目标 |
|---|---|---|
| **Tier 1（必须掌握）** | Q1 模板、Bootstrap | Q1 拿 9/10，Q3 拿 7/10 |
| **Tier 2（应当掌握）** | Identification、Tests、Weak IV | Q2 拿 6/10 |
| **Tier 3（争取部分分）** | Nonsmooth GMM、AsyCS、Lasso/Ridge/Thresholding | Q4 拿 3–5/10 |
| **Skip** | Bootstrap Improvements（性价比低）、Invariant Tests（从没考过） | 完全不读 |

### 2. 证明 Tier 系统

不是每个证明都要会推。每个证明第一行都打了一个 tag：

- **[REPRODUCE]**——必须能在考场上从头默写。
- **[STRUCTURE]**——记得框架和用到的工具（CLT、Slutsky、USCON）就够，代数细节可以模糊。
- **[INTUITION ONLY]**——只看一遍理解直觉，不用记。
- **[SKIP]**——为完整性放在那里，时间紧时直接略过。

**配套 triage 规则**：Tier 1 章节里 [REPRODUCE] 的证明 = 最高优先级。Tier 3 章节里 [SKIP] 的证明 = 直接忽略，不必有罪恶感。

### 3. 8 天阅读路线图

讲义里有一份精确到天的复习节奏：哪天读哪章、哪天做模拟考、哪天彻底不学新东西早睡。**整本书就是围绕这个 8 天计划组织的**——你按表执行就行，不用再操心“先学哪个”的二阶决策。事后看执行得不错，比无头苍蝇式复习至少省了一半时间。

### 4. HW5–HW10 题答汇总（最后一章）

Patrik 直说期末会从作业题里抽题。所以最后一章把 HW5–10 共 21 道题做成统一的四段式：

1. **Problem (verbatim)**——题目原文完整放出，不压缩、不省略。
2. **What this tests**——这道题在考什么、和正文的哪一节关联。
3. **Approach**——上手前的高层策略。
4. **Solution**——逐步带“why”标注的解答。

每道题再打一个五档 tag：

- **CORE**——必须会，照着写能拿大头分。
- **MEMORIZE**——结论记住即可，不用现场推导。
- **EXAM-WRITE**——真要完整推太长，写出“这么多”就够大部分分。
- **LOW ROI**——基本不会考成推导题，跳过。
- **REFERENCE ONLY**——参考某篇论文，引用一句就走。

## 我觉得这本讲义做对的几件事

**直觉优先**。每章开头一节叫 *The Story (Read This First, No Math)*，纯文字描述这一章在解什么问题、为什么需要这个工具。技术细节之后再来。比如 Bootstrap 章不上来就写 EDF 定义，而是先讲：“你的 t-statistic 在小样本里可能根本不是正态分布，那怎么办？”

**每一步都讲 why**。这是我最坚持的一条。每个证明里每一步公式后跟一行斜体解释“为什么这一步是这一步”——为什么我们要 mean-value 展开 FOC 而不是直接展开 estimator（因为 estimator 没有解析式），为什么 U-WCON 不能换成 pointwise convergence（因为 θ̂ₙ 自己是随机的、必须能“跟着它走”），为什么 Kleibergen 的 LM-CUE 要加 −1 修正项（让 ḡ 和 D 渐近独立）。

**老实承认重难点**。许多 textbook 倾向于让所有证明看起来一样难、所有结论一样重要。这本不是。它会直接说：“Q4 是出名的难，目标拿部分分，不要超过 10 分钟。” 或者：“不建议学习，性价比很低。” 这种坦白比掩饰对应试更有用。

**作业题原文不省略**。第一版我图省事把题目压缩成了一句话，结果被自己看不懂打脸了。第二版每道题都把 Patrik 写的原文完整放出来，再加考察点和思路。这样看一遍就知道题目在问什么、为什么这么问。

**Typography 错了就改**。早期版本里 `\Var(X)` 渲染成了 `Var[(]X)`（宏定义和调用方式不匹配），看到就要修。读者一旦发现一处显示错乱，会自动怀疑整本书的可靠性。

## 局限与免责

- 这是一本**考试导向**的求生指南，不是教材替代品。它牺牲了完整性换取效率。
- 所有“考点优先级”基于 Patrik 历年期中、期末的命题习惯。如果他下一届换了风格，请自行重判。
- 这本讲义本身是赶在期末前几天用 Claude Code 协作完成的，结构性的错漏几乎肯定存在。发现错误欢迎告诉我。
- 写作过程中 Claude 做了大量的格式整理、错排修复和文字润色——它在补充 LaTeX 排版、统一术语、抓 typo 上帮了大忙。但所有 **结构性决策**（章节顺序、tier 系统、tag 等级、考点优先级、应试策略、8 天复习路线图）全部由我自己制定，AI 不知道 Patrik 的命题偏好。
- 这本书反映的是**我**这个特定读者的需求和水平。它不一定适合你。但如果你也是上面说的那种处境的同学，希望它能帮上忙。

## 怎么获取

- **PDF 下载**：本文顶部 / 底部的下载按钮（[`metrics-survival-guide.pdf`](/files/adv-metrics-psu/metrics-survival-guide.pdf)，113 页）
- 同款课程历年 midterm 也挂在了「Exams」分类下，可以一起拿走

欢迎给下一届同学接力使用。

## 写在最后

写这本讲义让我意识到一件事：在博士项目里，“学完一门课”和“考过一门课”是非常不同的两件事，需要不同的资源、不同的策略、甚至不同的心态。前者讲究深入和完整；后者讲究优先级、ROI、心理韧性，以及对自己处境的诚实。

我们的教育体系提供了大量“学完一门课”的资源——教材、讲义、问题集、TA section——但很少给我们“考过一门课”的工具。这本讲义试着填一下后者的空白。

如果它能让你**按 8 天计划顺利搞定这门 final**，那我做这本就值了。