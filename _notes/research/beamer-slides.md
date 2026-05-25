---
layout: post
title: "用 beamer 做 job talk 和组会 slides"
main_category: "科研妙招"
sub_category: "LaTeX相关"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/latex/beamer-slides"
published: true
keywords: ["beamer 教程", "LaTeX 做幻灯片", "beamer slides", "学术 slides", "job talk", "工作坊报告", "组会 slides", "presentation 模板", "metropolis 主题", "beamer 主题推荐", "16:9 宽屏 slides", "aspectratio", "pause overlay 逐步显示", "onslide uncover", "beamer 复用论文图表", "input 表格 figure", "appendix 备份页", "backup slides", "hyperlink 跳转", "frame 页码", "allowframebreaks", "handout 模式", "讲者注释 pdfpc", "Warsaw 主题 太丑", "beamer 反例", "去掉导航栏", "beamer vs PPT", "beamer 入门", "LaTeX 演示文稿", "huandengpian", "怎么做学术报告 slides"]
---


学术报告用 beamer 而不是 PowerPoint，理由很实在：公式排版和论文完全一致、图表能直接复用论文里那份 `.tex`、改了数据 slides 跟着重生成、版本可控。代价是它默认主题确实丑、上手有门槛。这篇给一套现代、干净、能直接用在 job talk 和组会的配置，并讲清楚学术报告排 slides 的几条硬规矩。

## 一、一套不丑的最小配置

忘掉那些带蓝色导航条、每页顶部一排小圆点的默认主题（Warsaw / Berkeley 那类，一眼“上世纪”）。现在学术圈的事实标准是 **metropolis**：极简、留白大、字体好看、没有视觉噪音。

```latex
\documentclass[aspectratio=169, 11pt]{beamer}   % 169 = 16:9 宽屏
\usetheme{metropolis}
\usepackage{appendixnumberbeamer}   % 备份页不计入正文页码
\usepackage{booktabs}

\title{论文标题}
\author{Rui Zhou}
\institute{Penn State}
\date{\today}

\begin{document}

\maketitle

\begin{frame}{研究问题}
  \begin{itemize}
    \item 第一点
    \item 第二点
  \end{itemize}
\end{frame}

\end{document}
```

`\begin{frame}{标题}` 一个环境就是一页。`aspectratio=169` 现在几乎是默认要求——投影仪和会议室屏幕基本都是宽屏，用 4:3 会留两条黑边显得很旧。metropolis 没收录进部分 TeX 发行版的默认集，缺包就装 `beamertheme-metropolis`（TeX Live / MikTeX 包管理器里有）。

## 二、逐步显示：别一次糊一脸

报告时让要点一条条出现，听众的注意力跟着你走，而不是一上来就扫读整页。最简单是 `\pause`：

```latex
\begin{frame}{识别策略}
  政策在 2020 年于部分州实施。 \pause
  \medskip
  对照组：尚未实施的州。 \pause
  \medskip
  关键假设：处理前平行趋势。
\end{frame}
```

要更精细地控制“第几步显示什么”，用 overlay 规格 `<>`：

```latex
\begin{itemize}
  \item<1-> 一开始就在
  \item<2-> 第二步出现
  \item<3-> 第三步出现
\end{itemize}
\onslide<4->{\alert{结论这时才砸出来}}
```

`\only<2>{...}` 只在第 2 步出现（不占位），`\uncover<2->{...}` 占位但先隐形——画图分步揭示时常用。别滥用动画，学术报告的 overlay 是为了**控制信息释放节奏**，不是炫技。

## 三、复用论文里的图和表

这是 beamer 相对 PPT 最大的红利。论文里那张回归表、那张事件研究图，是[出表工具](/research/econometrics/regression-tables)和[ TikZ ](/research/latex/tikz-econ-figures)生成的 `.tex` / `.pdf`，slides 里直接 `\input` / `\includegraphics` 同一个文件：

```latex
\begin{frame}{主结果}
  \begin{table}
    \centering
    \resizebox{!}{0.7\textheight}{\input{../output/tables/main.tex}}
  \end{table}
\end{frame}

\begin{frame}{事件研究}
  \centering
  \includegraphics[height=0.8\textheight]{../output/figures/eventstudy.pdf}
\end{frame}
```

数据一改，重跑[主脚本](/research/workflow/reproducible-project)，论文和 slides 的数字同时更新——再也不会出现“slides 上的系数和论文对不上”这种答辩车祸。

## 四、job talk 的硬规矩

技术之外，排版本身就是内容。一页 slide 大致长这样才对：

<svg viewBox="0 0 360 210" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:360px;display:block;margin:1.2rem auto;font-family:sans-serif;">
  <rect x="10" y="10" width="340" height="190" rx="6" fill="#fbfbfc" stroke="#ccc"/>
  <text x="28" y="40" font-size="15" fill="#1f3b5b" font-weight="bold">一句话讲清这页的结论</text>
  <line x1="28" y1="50" x2="332" y2="50" stroke="#e0e0e0"/>
  <rect x="60" y="68" width="240" height="95" rx="4" fill="#eef3fb" stroke="#3b6ea5" stroke-dasharray="4 3"/>
  <text x="180" y="120" font-size="12" fill="#3b6ea5" text-anchor="middle">一张大图 / 一张表</text>
  <text x="180" y="138" font-size="11" fill="#88a" text-anchor="middle">（占据视觉中心）</text>
  <text x="180" y="186" font-size="11" fill="#888" text-anchor="middle">一行 take-away，不超两行字</text>
</svg>

- **一页一个想法**，标题就写这页的结论（“最低工资几乎没有降低就业”，而不是只写“结果”二字）——听众扫一眼标题就抓住要点；
- **字大、字少**。一页超过 ~30 个词就太多了。台下没人会读你的段落，他们在听你讲；
- **结果先行**。job talk 前几分钟就要让人看到主图主表，别按论文顺序铺垫半天文献和模型；
- **图比文字强**。能用[事件研究图 / TikZ 示意图](/research/latex/tikz-econ-figures)说的，不要写成 bullet。

## 五、备份页与跳转

答辩 Q&A 全靠备份页。把它们放进 appendix，配 `appendixnumberbeamer` 让正文页码不被备份页撑大（“23 页”听感比“61 页”专业）：

```latex
\appendix
\begin{frame}[label=robust]{稳健性：替换样本}
  ...
\end{frame}
```

正文里给个超链接，被问到时一键跳过去、答完跳回来：

```latex
\hyperlink{robust}{\beamergotobutton{稳健性见附录}}
```

## 六、打印稿与讲者注释

- **handout 模式**：`\documentclass[handout]{beamer}` 把所有 overlay 压平成一页一张，发给评委 / 打印不会出现“同一页 N 个版本”；想一页纸放多张，用 `pgfpages` 的 `\pgfpagesuselayout{4 on 1}`；
- **讲者注释**：`\setbeameroption{show notes on second screen}` + `\note{这里要强调识别假设}`，配 [pdfpc](https://pdfpc.github.io/) 演示，主屏出 slides、副屏出当前页 + 注释 + 计时器 + 下一页预览，控场利器。

## 七、几个高频翻车点

- **内容溢出 frame**（底部被截掉）：少塞内容是正道；实在装不下用 `\begin{frame}[allowframebreaks]` 自动续页，或 `\resizebox` 缩图表，别硬塞；
- **还在用默认主题**：换 metropolis，五分钟的事，观感差一个时代；
- **代码 / verbatim 报错**：含 `\verb` 或 `lstlisting` 的 frame 必须加 `[fragile]` 选项，否则编译失败；
- **图字比正文小**：会议室最后一排要看得清，宁可图少一点、大一点。

工作流上把 slides 也纳入[可复现项目](/research/workflow/reproducible-project)：`slides/talk.tex` 和论文共用 `output/` 里的图表，[ Git ](/research/workflow/git-for-papers)管版本，job market 季每改一版结果，论文、slides、海报一次同步——这正是当初忍着学 beamer 的回报。

