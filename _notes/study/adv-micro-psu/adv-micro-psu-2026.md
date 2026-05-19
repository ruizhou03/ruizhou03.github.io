---
layout: post
main_category: "学习资料"
sub_category: "高级微观经济学（PSU）"
title: "Advanced Microeconomics Lecture Notes"
discipline: "经济学"
course: "高级微观经济学（PSU）"
material_type: "Notes"
date: 2026-05-04
author: "Zircon"
permalink: "/notes/adv-micro-psu/lecture-notes"
pdf_url: "/files/adv-micro-psu/Micro.pdf"
# reactions: ['👍', '🎓', '📝', '🔥']
---

> *“These notes accompany the Spring 2026 offering of Econ 521 (Advanced Microeconomics Theory) at Penn State, taught by Professor Vijay Krishna. The course is the standard first-year PhD sequence on game theory, mechanism design, and matching—the strategic side of microeconomics.”*
> ——讲义 preface

## 起因

两天前我贴了一份 [计量 8 天自救指南](/notes/adv-metrics-psu/survival-guide)。那本是临考前赶出来的应试讲义——目标是 B-、活下去、把时间留给研究。

这本不一样。这本是**跟着 Krishna 教授一整学期，每周写一点、每章迭代两三遍**写出来的高微讲义。从一月开学到现在四个多月，最终是一本 299 页的 PDF：9 章、5 个 part，外加 13 套 problem set 和 6 套考试的完整解答。

写它的初衷其实很简单。Krishna 是 Penn State 经济系教博弈论的传奇教授（[*Auction Theory*](https://www.elsevier.com/books/auction-theory/krishna/978-0-12-374507-1) 那本书的作者），他上课的板书清晰、节奏稳、几乎不用 slides。我上课时就在 LaTeX 里实时记，下课后再补充直觉、对照课本、把每个证明的“为什么这一步是这一步”写出来。一学期下来，笔记就长成了一本可以独立读的教材。

期末复习时我翻一遍发现：诶，这东西如果整理一下，配上 PS 解答和往年题解答，对未来的同学应该挺有用。于是有了这次发表。

## 这本讲义是什么

5 个 part，9 章：

| Part | 章节 | 内容 |
|---|---|---|
| **I. Foundations** | Ch. 1 Game Representation | 扩展型与策略型博弈、信息集、行为策略 |
|  | Ch. 2 Nash Equilibrium | NE、SPE、占优、可理性化 |
| **II. Bargaining** | Ch. 3 Bargaining | Nash bargaining solution、Rubinstein 交替出价 |
| **III. Auctions & Mechanism Design** | Ch. 4 Auctions | 私人价值拍卖、收入等价、最优拍卖 |
|  | Ch. 5 Mechanism Design | VCG、AGV、Myerson 最优机制 |
| **IV. Matching** | Ch. 6 Matching | 二边匹配、Gale-Shapley、稳定与抗策略 |
| **V. Information & Dynamic Games** | Ch. 7 Common Knowledge | 共同知识及其操作含义 |
|  | Ch. 8 Repeated Games | 有限/无限重复博弈、Folk 定理 |
|  | Ch. 9 Perfect Bayesian Equilibrium | PBE、信号博弈、reputation |

外加 **Part VI（13 套 PS 题目原文 + 解答）** 和 **Part VII（2025–2026 全部 6 套考试题目 + 解答）**。

## 这本讲义适合谁

**适合**：

- 正在或即将上 ECON 521（或类似的一年级 PhD 高微博弈论 sequence）的同学。Krishna 的教法多年稳定，往年内容覆盖度很高。
- 准备 micro prelim 的二、三年级博士生。Part VII 的 5 套考题完整解答对模考很有帮助。
- 想 self-study 博弈论 / mechanism design / matching 的高年级本科生或硕士生。讲义在 Ch. 1–3 是相对完整自包含的。
- 想看看 **Krishna 的视角**怎么把 game theory → bargaining → auctions → mechanism design → matching → repeated games → PBE 这条主线串起来的人。

**不适合**：

- 想找 MWG 那种 consumer/producer theory 的人。这本是高微的**strategic side**（博弈论方向），不是 decision-theoretic side。
- 想要“全面覆盖博弈论所有分支”的人。Krishna 的取舍很明确——cooperative game theory、evolutionary games、global games 这些基本不碰。讲义忠实反映了这种取舍。
- 完全没接触过测度论概率的本科生。大部分内容自包含，但偶尔会用到 dominated convergence、uniform convergence 这类工具不另作展开。

## 怎么用

### 1. 章节依赖图

讲义的章节**不是线性的**。Ch. 1–2 是公共底座，之后 Krishna 开了四条相对独立的支线：

```
        Ch.1 Games → Ch.2 NE/SPE
                          │
        ┌─────────┬───────┼───────┬─────────┐
        ▼         ▼       ▼       ▼         ▼
      Ch.3      Ch.4    Ch.6    Ch.8      Ch.7
     Bargain   Auctions Match  Repeat   Common Know
                  │                │       │
                  ▼                └──→ Ch.9 PBE
                Ch.5
              Mechanism
```

时间紧的同学可以走最短路径：

- **只看 auctions / mechanism design**：1 → 2 → 4 → 5
- **只看 bargaining + dynamic games**：1 → 2 → 3，然后 1 → 2 → 8 → 9
- **只看 matching**：Ch. 6 几乎自包含，只需 Ch. 1 的偏好/策略语言

### 2. 颜色 boxed environments 速查

整本书用一套有色盒子帮你一眼区分内容类型：

- 🟢 **绿色 = Definition**——形式定义
- 🔵 **青色 = Theorem**——核心数学结论 + 证明
- 🟣 **紫色 = Lemma**——证明里用到的辅助引理
- 🟠 **橙色 = Corollary**——定理的直接推论
- 🟡 **黄色 = Proposition**——重要但不如定理中心的结论
- 🩷 **粉色 = Claim**——证明内部的小断言
- 🪧 **侧栏 = Example / Remark**——例子或评注，第一遍可跳过

读到第 50 页你就会条件反射地按颜色优先级分配阅读速度。

### 3. 每个证明先讲直觉，再上数学

这是我最坚持的一条。每个 theorem 上面我都会先用一段大白话讲：**这是在解什么问题？和前面的工具有什么关系？为什么是这个形式？**

举个例子，Mechanism Design 那章里 information rent $\frac{1-F(x)}{f(x)}$ 这个 hazard rate 项。我没有上来就给公式，而是先讲：seller 想让 type $x$ 中标，但所有比 $x$ 更高的 type 都可以装作 $x$ 来骗中标，所以 seller 必须给他们留下 surplus 才能阻止；高于 $x$ 的人有多少？正是 $1-F(x)$ 这个概率质量；除以本地密度 $f(x)$ 把总成本 normalize 成 marginal cost——于是 $(1-F)/f$ 自然出现。

这样上手再看公式就不会觉得是从天而降的。

### 4. PS 和往年题完整收录

Part VI 把所有 13 个 PS 的**题目原文（不省略不压缩）**+ 详细解答放进去。第一年最痛苦的从来不是不会做，而是看不懂题目在问什么——所以题目原文必须完整。

Part VII 是 2025 春全套（midterm 1 + midterm 2 + final）+ 2026 春全套（midterm 1 + midterm 2 + final）的 **6 套考试题 + 完整解答**。

如果你只想刷题，6 套考题也单独挂在了「Exams」分类下，方便直接拿走打印。

## 几个我觉得做对的事

**直觉先于形式**。Krishna 上课经常一句话点出某个定理“为什么是这个样子”——这种洞察 slide 上不会写、课本里也不一定有。这种洞察我尽量都收在了 Remark / Intuition box 里，避免讲义变成纯定理-证明的堆砌。

**每一步都讲 why**。证明里每一步公式后面我会跟一行斜体解释“为什么这一步是这一步”。比如 first-price auction 里，type $x$ 的期望收益（信息租）等于 $U(x) = \int_0^x F(t)^{n-1}\, dt$。我没有上来就给这个积分，而是先用 envelope theorem 把“为什么是积分”讲清楚：当 bidder 已经在最优地选 bid 时，期望收益对 type 求导 $U'(x) = q(x) = F(x)^{n-1}$（因为 bid 已最优，再调整一阶不改进，导数只来自 type 直接进入 payoff 的那一项）；再从 $x = 0$ 处的零收益基线积分上来，自然得到 $\int_0^x F(t)^{n-1}\, dt$。它不是一个突兀的积分，而是“低 type 也能伪装成 $x$，所以 $x$ 的 surplus 被低 type 一段一段顶起来”的几何累积——这种“卡住过一次的小地方”的注释，是我作为同样卡住过的学生最能贡献的部分。

**Problem set 不省略原文**。第一年学生最痛苦的是看不懂题面，所以我把 Krishna 写的题目原文一字不落地放出来再给思路。后人看一遍就知道题在问什么、为什么这么问。

**排版细节一直在抓**。今天还在帮我抓 LaTeX 里直引号 `"` 和 `` `` 的混用 bug。typography 一旦错乱，读者会自动怀疑整本书的可靠性，所以这种 “small chores” 我从不省。

## 局限与免责

- 这是**第一年学生**写的笔记。Krishna 是教这门课多年的大师，但作为听课人我肯定有理解偏差和笔误。看到错误请告诉我（评论区或邮件）。
- 笔记反映的是 **2026 春**的 syllabus 和讲法。Krishna 历年内容大体稳定，但具体例子、问题集、考点优先级可能微调。
- 写作过程中 Claude Code 帮了大量的 **LaTeX 排版、错排修复、术语统一、typo 抓取、依赖图绘制**等机械工作。但所有 **结构性决策**（章节顺序、每章的叙事流、什么写什么不写、直觉怎么讲、证明的哪一步要展开）全部由我自己完成。AI 不知道 Krishna 的命题习惯，也不知道哪段内容学生最容易卡住。
- 所有解答（PS / 考题）都基于我自己的理解写成；可能有错，**不要在考前最后一晚才用**——留出至少 2 天交叉验证的时间。

## 怎么获取

- **PDF 完整下载**：本文顶部 / 底部按钮（[`Micro.pdf`](/files/adv-micro-psu/Micro.pdf)，299 页）
- **6 套往年题单独下载**：见站内「Exams」分类，包含 2025 春全套 + 2026 春全套
- **Source code**：暂未开源，未来可能上 GitHub。如果你对某一章的 LaTeX 源码感兴趣可以联系我

## 写在最后

ECON 521 是博一这一学期我最喜欢的一门课。Krishna 讲博弈论时有一种“举重若轻”的优雅——他能在看似独立的章节之间不动声色地架起桥梁，让你一次次意识到“诶，这个工具我之前在另一章也见过”。这种跨章节的洞察 slide 上不会写，课本里也未必有。

我做的事其实很简单：把这些联系用 LaTeX 排好版，配上证明细节，做成一本可以反复读、可以离线读、可以从任何一章切入的书。Krishna 的内容是骨架，我做的是把它落到纸面上的工艺。

如果你也在准备一年级 micro / 复习 prelim / 想看看博弈论是怎么从游戏树一路走到 mechanism design 和 matching 的——希望这本能帮上忙。也欢迎把它转给下一届的同学接力使用。
