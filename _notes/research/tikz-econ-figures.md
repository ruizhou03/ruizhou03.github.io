---
layout: post
title: "用 TikZ 画经济学里的图：供需、博弈树、时间线"
main_category: "科研妙招"
sub_category: "LaTeX相关"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/latex/tikz-econ-figures"
published: true
keywords: ["TikZ 教程", "TikZ 经济学图", "LaTeX 画图", "供需图 TikZ", "supply demand diagram", "需求曲线 供给曲线", "均衡点", "曲线移动", "博弈树 TikZ", "game tree", "extensive form", "博弈论树状图", "forest 宏包", "时间线 timeline", "DID 时间线", "事件研究设计图", "standalone 类", "pgfplots", "TikZ externalize", "矢量图 论文插图", "PPT 矢量图", "坐标轴 节点 箭头", "draw node arrow", "TikZ 入门", "LaTeX 矢量图", "经济学论文配图", "TikZ tu", "怎么画供需图", "怎么画博弈树"]
---


经济学论文和讲义里的图，很大一部分不是数据图，而是**示意图**：一张供需图、一棵博弈树、一条识别设计的时间线。这类图用画图软件拉很难和正文字体统一、放大还糊；用 TikZ 写出来则是矢量的、字体和论文一致、改一个参数图就重排。这篇给三类最常用的图配可直接抄的代码，并把生成出来的样子画给你看。

## 准备：把图当独立文件编译

强烈建议每张图单独一个 `.tex`，用 `standalone` 文档类，编译出一个紧贴内容的 PDF，正文再 `\includegraphics` 引——这样图能单独调试，也能复用到 slides 里。

```latex
\documentclass[tikz,border=2pt]{standalone}
\usepackage{tikz}
\usetikzlibrary{arrows.meta, positioning, calc}
\begin{document}
\begin{tikzpicture}
  % 图的代码写这里
\end{tikzpicture}
\end{document}
```

要画**带数据的函数曲线/散点**，加 `pgfplots`（`\usepackage{pgfplots}` + `\pgfplotsset{compat=1.18}`），它在 TikZ 之上专门管坐标系。下面三个例子用纯 TikZ 就够。

## 一、供需图

最常画的图。思路：画两条带箭头的坐标轴，两条直线当供给/需求，标出交点。

```latex
\begin{tikzpicture}[>=Stealth, thick]
  % 坐标轴
  \draw[->] (0,0) -- (6,0) node[right] {$Q$};
  \draw[->] (0,0) -- (0,6) node[above] {$P$};
  % 需求（向下）与供给（向上）
  \draw[blue] (0.5,5) -- (5,0.5) node[right] {$D$};
  \draw[red]  (0.5,0.5) -- (5,5)  node[right] {$S$};
  % 均衡点与虚线投影
  \coordinate (E) at (2.75,2.75);
  \fill (E) circle (2pt) node[above right] {$E$};
  \draw[dashed] (E) -- (E|-0,0) node[below] {$Q^*$};
  \draw[dashed] (E) -- (E-|0,0) node[left]  {$P^*$};
\end{tikzpicture}
```

编译出来就是这样（矢量，放大不糊、字体随正文）：

<svg viewBox="0 0 260 230" xmlns="http://www.w3.org/2000/svg" style="width:260px;display:block;margin:1.2rem auto;font-family:serif;">
  <defs><marker id="t1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#333"/></marker></defs>
  <line x1="40" y1="190" x2="240" y2="190" stroke="#333" stroke-width="1.5" marker-end="url(#t1)"/>
  <line x1="40" y1="190" x2="40" y2="20" stroke="#333" stroke-width="1.5" marker-end="url(#t1)"/>
  <text x="244" y="194" font-size="13" font-style="italic">Q</text>
  <text x="34" y="18" font-size="13" font-style="italic">P</text>
  <line x1="60" y1="40" x2="210" y2="170" stroke="#3b6ea5" stroke-width="2"/>
  <text x="214" y="172" font-size="13" font-style="italic" fill="#3b6ea5">D</text>
  <line x1="60" y1="170" x2="210" y2="40" stroke="#c0504d" stroke-width="2"/>
  <text x="214" y="42" font-size="13" font-style="italic" fill="#c0504d">S</text>
  <circle cx="135" cy="105" r="3" fill="#000"/>
  <text x="142" y="100" font-size="13" font-style="italic">E</text>
  <line x1="135" y1="105" x2="135" y2="190" stroke="#888" stroke-dasharray="3 3"/>
  <line x1="135" y1="105" x2="40" y2="105" stroke="#888" stroke-dasharray="3 3"/>
  <text x="128" y="206" font-size="12">Q*</text>
  <text x="20" y="109" font-size="12">P*</text>
</svg>

要表现“需求外移”，再画一条平移的虚线并加箭头即可：

```latex
  \draw[blue, dashed] (1.5,5) -- (6,0.5) node[right] {$D'$};
  \draw[->] (3.2,2.8) -- (3.9,3.5);   % 移动方向箭头
```

`\coordinate` 命名关键点、`(E|-0,0)` 这种语法做垂直/水平投影——这是 TikZ 画经济图最省事的两个技巧，福利三角形、税收楔子都靠它们拼。

## 二、博弈树（扩展式）

博弈树用 `forest` 宏包最省心（`\usepackage{forest}`），它专门画树：缩进表示父子，方括号嵌套，叶子放收益。

```latex
\begin{forest}
  for tree={s sep=24mm, l=18mm, edge={-}}
  [$1$
    [$2$, edge label={node[midway,left]{$L$}}
      [{$(2,1)$}, edge label={node[midway,left]{$\ell$}}]
      [{$(0,0)$}, edge label={node[midway,right]{$r$}}]
    ]
    [{$(1,2)$}, edge label={node[midway,right]{$R$}}]
  ]
\end{forest}
```

`$1$`、`$2$` 是轮到谁行动的决策结，分支上的 `L/R/ℓ/r` 是行动，叶子 `(2,1)` 是收益向量。生成出来：

<svg viewBox="0 0 320 210" xmlns="http://www.w3.org/2000/svg" style="width:320px;display:block;margin:1.2rem auto;font-family:serif;">
  <line x1="160" y1="30" x2="80" y2="95" stroke="#333"/><line x1="160" y1="30" x2="250" y2="95" stroke="#333"/>
  <line x1="80" y1="95" x2="30" y2="170" stroke="#333"/><line x1="80" y1="95" x2="135" y2="170" stroke="#333"/>
  <circle cx="160" cy="25" r="11" fill="#fff" stroke="#333"/><text x="160" y="30" font-size="13" text-anchor="middle" font-style="italic">1</text>
  <circle cx="80" cy="95" r="11" fill="#fff" stroke="#333"/><text x="80" y="100" font-size="13" text-anchor="middle" font-style="italic">2</text>
  <text x="105" y="58" font-size="12" font-style="italic">L</text>
  <text x="215" y="58" font-size="12" font-style="italic">R</text>
  <text x="42" y="138" font-size="12" font-style="italic">ℓ</text>
  <text x="115" y="138" font-size="12" font-style="italic">r</text>
  <text x="30" y="188" font-size="12" text-anchor="middle">(2,1)</text>
  <text x="135" y="188" font-size="12" text-anchor="middle">(0,0)</text>
  <text x="250" y="112" font-size="12" text-anchor="middle">(1,2)</text>
</svg>

要标信息集（虚线连两个不可区分的结），在 `forest` 里给两个结命名再 `\draw[dashed]` 连起来即可——一图胜过几段文字解释贝叶斯纳什。

## 三、识别设计的时间线

写 DID / 事件研究 / RDD 的论文，正文配一条时间线说清“谁在什么时候被处理、对照组是谁”，审稿人理解成本骤降。一根带刻度的箭头就够：

```latex
\begin{tikzpicture}[>=Stealth]
  \draw[->, thick] (0,0) -- (10,0);
  \foreach \x/\t in {1/2018, 3/2019, 5/2020, 7/2021, 9/2022}
    \draw (\x,0.12) -- (\x,-0.12) node[below] {\t};
  % 处理时点
  \draw[red, thick, dashed] (5,-0.6) -- (5,1);
  \node[red, align=center] at (5,1.35) {政策实施\\$t=0$};
  \node[align=center] at (2,0.9) {处理前\\（建立基期）};
  \node[align=center] at (8,0.9) {处理后\\（估计动态效应）};
\end{tikzpicture}
```

<svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:420px;display:block;margin:1.2rem auto;font-family:serif;">
  <defs><marker id="t2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#333"/></marker></defs>
  <line x1="30" y1="85" x2="395" y2="85" stroke="#333" stroke-width="1.6" marker-end="url(#t2)"/>
  <g font-size="11" text-anchor="middle">
    <line x1="70"  y1="80" x2="70"  y2="90" stroke="#333"/><text x="70"  y="106">2018</text>
    <line x1="140" y1="80" x2="140" y2="90" stroke="#333"/><text x="140" y="106">2019</text>
    <line x1="210" y1="80" x2="210" y2="90" stroke="#333"/><text x="210" y="106">2020</text>
    <line x1="280" y1="80" x2="280" y2="90" stroke="#333"/><text x="280" y="106">2021</text>
    <line x1="350" y1="80" x2="350" y2="90" stroke="#333"/><text x="350" y="106">2022</text>
  </g>
  <line x1="210" y1="40" x2="210" y2="100" stroke="#c0504d" stroke-width="1.6" stroke-dasharray="5 4"/>
  <text x="210" y="30" font-size="11" fill="#c0504d" text-anchor="middle">政策实施 t=0</text>
  <text x="120" y="55" font-size="11" text-anchor="middle">处理前 · 建立基期</text>
  <text x="305" y="55" font-size="11" text-anchor="middle">处理后 · 估计动态效应</text>
</svg>

`\foreach` 批量打刻度是这里的关键——加一年改一处，不用一个个挪坐标。

## 工作流提醒

- **每张图独立 `standalone` 文件**，正文 `\includegraphics{figs/sd.pdf}`；图的字号用相对单位，正文缩放后仍清晰。
- **图多、编译慢**时，开 TikZ externalization（`\usetikzlibrary{external}` + `\tikzexternalize`），没改过的图直接复用已编译的 PDF，正文编译从几十秒回到几秒——这条和[「告别 LaTeX 文件海洋」](/research/latex/latex-clean-workflow)那套整洁工作流是一对。
- 同一份 TikZ 代码，论文和[ beamer slides ](/research/latex/beamer-slides)可以直接复用，配色和字体天然统一。

不用背命令。把这三段当模板存进 `commands.tex` 旁边的 `figures/` 目录，下次要画改数据点就行——TikZ 的价值不是炫技，是让你的图和论文是同一套排版语言。

