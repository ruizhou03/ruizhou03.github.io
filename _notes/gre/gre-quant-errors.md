---
layout: post
main_category: "学习资料"
sub_category: "GRE"
title: "（个人向）GRE 数学错题本"
keywords: ["GRE 数学错题本", "GRE Quant 错题", "Quant Mistakes", "GRE 数学精选题", "GRE Hard Quant", "GRE 数论", "GRE 数学易错点", "Quant 备考", "GRE 数学满分", "考满分 Quant", "LaTeX 错题本", "GRE 数学错提"]
date: 2024-08-14
discipline: "语言考试"
course: "GRE"
material_type: "错题本"
---

话不多说，第二次备考 GRE 了，很多的精力都放在了重过错题上（事实上第一次备考做的多而做不精，错题也只是错了）。上篇分享过[如何复刻和 GRE 考试界面一样的错题本](/notes/gre/gre-exam-ui-notebook)，这一篇就简单分享一下错题本吧，算是给自己后天的考试攒点人品 🙏。

今天分享的是数学。对于中国学生而言，数学确实不难，最多可能就是和数论沾点边的会陌生一些，但完全 do-able。结合第一次备考和考试的经验来看，数学也要刷（不过只要刷 hard 模式就好，也不要分知识点刷了，都上大学了没什么知识点是你需要单独应对的），尤其是像我这样容易粗心的人，每一题都不该错，但到头来还是会错那么一两题（初考 168）。第二次备考期间我也把数学作为调剂，穿插着也把 Hard 都做完了，发现从轻视到重视的心态转变之后，正确率确实会有提高。

数学错题本前三页（主要内容）是精选题，第四页是易错题，第五页是额外提醒一些字面上的理解不能出错（甚至没有计入总页数）。如果你也想复刻这样的格式（而懒得补档上一篇），我也把 header 的代码放在图片之后了，希望对大家有帮助～

![GRE Quant 精选题错题本第 1–2 页，含填空题与比大小题及中文解析](/files/images/gre-quant-errors/01.jpg)
<p class="img-caption">精选题第 1–2 页：填空题（Numeric Entry）与比大小题（Quantitative Comparison）混排，每题下方附中文解析。</p>

![GRE Quant 精选题错题本第 3–4 页，含单选题与比大小题及解析](/files/images/gre-quant-errors/02.jpg)
<p class="img-caption">精选题第 3–4 页：单选题与比大小题混排。</p>

![GRE Quant 精选题错题本第 5–6 页，含各题型混合及中文解析](/files/images/gre-quant-errors/03.jpg)
<p class="img-caption">精选题第 5–6 页：各题型混合，仍然保留考试界面排版手感。</p>

![GRE Quant 精选题错题本第 7–8 页，含易错题与知识点提醒](/files/images/gre-quant-errors/04.jpg)
<p class="img-caption">第 7–8 页起进入<strong>易错题</strong>板块，主打知识点提醒。</p>

![GRE Quant 精选题错题本第 9–10 页，留心字面理解专项提醒](/files/images/gre-quant-errors/05.jpg)
<p class="img-caption">最后两页是<strong>字面理解</strong>专项提醒：题干里那些容易看走眼的措辞集合。</p>

{% raw %}
```latex
\usepackage{tabularx}
\usepackage{tikz}

\renewcommand{\oval}{
\begin{tikzpicture}
  \draw (0,0) ellipse (.15cm and .075cm);
\end{tikzpicture}
}

\newcommand{\options}[5]{
\begin{center}
\begin{tabularx}{\linewidth}{>{\raggedleft\arraybackslash}p{0.45\linewidth} p{0.5\linewidth}}
    \oval & {#1} \\
    \oval & {#2} \\
    \oval & {#3} \\
    \oval & {#4} \\
    \oval & {#5}
\end{tabularx}
\end{center}
}

\newcommand{\quantities}[2]{
\begin{center}
    \begin{tabularx}{\linewidth}{*{2}{>{\centering\arraybackslash}X}}
    \textbf{\underline{Quantity A}} & \textbf{\underline{Quantity B}}\\
    {#1} & {#2}
    \end{tabularx}
\end{center}

\begin{center}
\begin{tabularx}{\linewidth}{>{\raggedleft\arraybackslash}p{0.2\linewidth} p{0.8\linewidth}}
    \oval & Quantity A is greater. \\
    \oval & Quantity B is greater. \\
    \oval & The two quantities are equal. \\
    \oval & The relationship cannot be determined from the information given.
\end{tabularx}
\end{center}
}

\renewcommand{\note}[1]{{\heiti\textbf{注\hspace{1em}}}#1.}

\newcommand{\field}{
\begin{center}
\begin{tikzpicture}
  \draw (0,0) rectangle (3,.6);
\end{tikzpicture}
\end{center}
}
```
{% endraw %}
