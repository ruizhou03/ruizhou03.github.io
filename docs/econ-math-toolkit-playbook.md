# 《经济学博士的数学工具箱》· 写作工作文档 (Playbook)

> 给接手的 AI agent：这是一本**原创**中文研究生数学教材的长期写作项目（区别于 `undergrad-notes-latexify-playbook.md` 那种「转旧笔记」）。读完本文即知整条流程。配套记忆见 `memory/project_econ_math_toolkit.md`。

## 0. TL;DR
为用户（PSU 经济学 PhD）从零写《经济学博士的数学工具箱》，中文（XeLaTeX + ctexbook），上线中文站（学习资料 / 数学，slug `econ-math-toolkit`）。**8 个 Part / 42 章**，逐 Part 写、每 Part 交用户审。核心写法是「三件套」：每个知识点都讲清 **①用处（工具性）→ ②从哪来（推导+直觉）→ ③以后用在哪（micro/macro/metrics 落点）**。各章不强求严丝合缝、可跳读。

## 1. 用户拍板的事（勿改）
- 语言 = **中文**；引擎 = **XeLaTeX**（`latexmk -xelatex`），class = `ctexbook`。
- 范围 = **全面 8 Part / 42 章**（spine 见 `files/econ-math-toolkit/source/main.tex` 顶部注释块）。
- 成品 **上线中文站**；discipline = 数学。
- 署名 = 周睿（中文，XeLaTeX 可放中文，不受 pdflatex 限制）。

## 2. 工程结构
- 源码：`files/econ-math-toolkit/source/`
  - `main.tex`：ctexbook preamble + 「如何阅读本书 / 三件套 / 彩框 / 记号」前言 + TOC + 42 章规划（注释）+ `\include` 列表。
  - `theorems.tex`：盒子系统（绿定义 / 蓝定理 / 粉假设 / 淡紫 `\state` 要点框 / 例 / 注 / 引理 / 推论 / 命题 / 事实）。**已去掉考试专用框**。
  - `commands.tex`：**广谱数学宏**。矩阵 `\mat{}`、向量 `\vc{}`、转置 `\T`、花体前缀 `\cF \cB \cP \cN`、期望/方差/概率自动配括号 `\E \Var \Cov \Prob \PP`、收敛 `\pto \dto \asto`、微分 `\d \dd \pd \pdc \grad \D`、`\argmax` 等。**单字母不做歧义重定义**；`\emph`→楷体（中文不用斜体）。
  - `chapters/`：每章一个 `chN_slug.tex`。
  - `_fig_preview.tex`：**单图自渲染检查工装**（见 §4）。
- 成品 PDF：`files/econ-math-toolkit/econ-math-toolkit.pdf`
- 站点条目：`_notes/study/econ-math-toolkit/econ-math-toolkit.md`（front-matter only）

## 3. 风格契约（所有章节统一）
- **黄金范本**：`chapters/ch15_ift_comparative_statics.tex`（隐函数定理，手写、用户批准）。新章一律照它的口吻 / 结构 / 盒子 / 图 / 三件套来写。
- 每章首行：楷体一句「用到的前置工具：……（第 X 章）」。随后一段平实引子说明「这章解决什么问题、为何引入这个工具」。
- 三件套贯穿：动机（用处）→ 陈述与推导（来历）→ 应用与去处（指向具体经济学场景与后续章节）。
- 证明以**讲明白**为准；少数极重的纯数学构造（如 Lebesgue 测度的完整构造、不动点定理的拓扑证明）只陈述 + 给直觉，不逐行搭建。
- 数学**正确性压倒一切**（永久产物，一次成型）。不确定的公式自己推。
- 语气：研究生教科书。**禁**考试腔（tier / 答题模板 / 天数倒计时）；**禁** AI 腔（套话堆砌、滥用 `\boxed`、中文斜体）。强调用 `\emph`（楷体）或 `\textbf`。
- 纯 LaTeX：无 markdown、无 ``` 代码围栏、无 R 代码、无隐藏字符（U+200B/U+3000）。表格用 booktabs。
- 只用 `commands.tex` 已定义的宏；绝不用未定义宏。
- **交叉引用**：同一 Part 内章节用 `\label`/`\ref`；引用其它 Part 的主题**一律用名称、不用硬编号**（如「见后文『包络定理』一章」），因为全书章号在最终装订前不定。
- label 约定：章 `\label{ch:slug}`、节 `\label{sec:slug-n}`、图 `\label{fig:slug-n}`。

## 4. 图的铁律（用户特别在意）⭐
- **凡有助理解就配图**（用户明确要求多上图）。inline `tikzpicture` 放进 `figure[h]` + `\caption` + `\label`。
- **文字 / 标签 / 箭头 / 标记绝不与曲线、坐标轴、其它标签重叠**。把标签停在空白区；必要时用细引线指向目标，但**引线不得穿过曲线**。
- **点必须精确落在曲线上**——按曲线方程算坐标，别目测。
  - 血泪：ch15 初稿把切点 P 的纵坐标写成 3.76（曲线在该处实为 2.76），导致点、虚线、切线整体浮在曲线上方约 1 单位，斜率标签又压在曲线上。教训：**每个坐标都要由方程算出**。
- **每张图都要用工装自渲染 + 肉眼检查后才算完成**：
  ```bash
  cd files/econ-math-toolkit/source
  # 把【一个】tikzpicture 写进 _fig_snippet.tex（不含 figure/caption）
  xelatex -interaction=nonstopmode _fig_preview.tex
  pdftoppm -png -r 150 _fig_preview.pdf /tmp/figchk
  # 然后 Read /tmp/figchk-1.png，逐项检查重叠 / 几何 / 点是否在线上
  ```

## 5. 端到端流程（一个 Part）
1. 主循环（我）写好该 Part 各章的**内容规格**（覆盖点 + 三件套 + 经济学落点 + 建议图）。
2. 跑 Workflow：`pipeline(CHAPTERS, draft, verify, fix)`——每章 draft（读范本+宏+规格→写 `chapters/chN.tex`，自渲染每张图）→ verify（对抗式审校：数学正确性 / 未定义宏 / 三件套 / 口吻 / **逐图渲染查重叠** / 交叉引用，返回 issues schema，不改文件）→ fix（按 issues 外科手术式修，改过的图重渲染确认）。脚本：`docs/workflows/econ-math-write-part.workflow.js`。
3. 主循环装订：编辑 `main.tex` 的 `\include` 列表纳入该 Part，`latexmk -xelatex` + 多跑两遍 `xelatex` 解析交叉引用，`grep -c '^!'`、`grep -c undefined` 清到 0。
4. 渲染若干页 + 抽查每张图，主循环亲自复核数学与图。
5. PDF 拷桌面 + `open` 交用户审（`SendUserFile` 用户收不到，别用）。据反馈改。
6. 更新 memory 进度。

## 6. 发布（全书完成后）
- front-matter 照 `undergrad-notes-latexify-playbook.md` §7.1：`main_category: 学习资料`、`sub_category: 数学基础`（或类似）、`discipline: 数学`、`material_type: Notes`、`author: 周睿`、`date` 用过去日期（未来日期 Jekyll 静默 404）、`permalink: /notes/econ-math-toolkit/econ-math-toolkit`、`pdf_url`、丰富中文 summary、双语 keywords。
- 落 main 守 `CLAUDE.md` 提交边界：只 `git add` 自己的文件（`files/econ-math-toolkit/**`、`_notes/study/econ-math-toolkit/**`），**禁 `-A`**；工作区脏就用隔离 worktree（`/tmp/land` 从 `origin/main` 建，rebase 后 `push origin HEAD:main`，完事 `reset --hard origin/main` 收回本地）。
- 发布前清源码 scratch：`cd source && find . -type f ! -name "*.tex" -delete`（保留 `_fig_preview.tex`），再单独 `cp` 成品 PDF 到 `files/econ-math-toolkit/econ-math-toolkit.pdf`。

## 7. 42 章 spine
见 `main.tex` 顶部注释块（I 线代 → II 分析拓扑 → III 多元微积分比较静态 → IV 最优化 → V 概率测度 → VI 渐近统计 → VII 动态最优化 → VIII 随机过程）。

## 8. 进度
- 2026-06-23：骨架 + 样章 ch15（隐函数定理）完成、风格经用户批准；图铁律确立。**Part I（线性代数 7 章）开写**。
- 其余 Part 待续。

---
*本文随每个 Part 的新教训更新。*
