# 本科旧笔记 LaTeX 化 · 工作文档 (Playbook)

> 给接手这个任务的新 AI agent：**读完本文你就应当知道整条工作流**。这是一个跨会话的长期任务，已用同一套流程成功上线 2 门课。请严格照此执行，重点照搬「图转换 + 用户核对」和「发布边界」两块，别自己另起炉灶。

---

## 0. TL;DR（30 秒版）

把周睿（Rui Zhou）在北大本科有价值的旧课程笔记，**重写成自足的英文教科书式 LaTeX PDF**（彩色盒子排版），发布到中文站 `ruizhou03.com` 的 `_notes/study/`，线上验证后**删掉原始课程文件夹**。

一门课的标准节奏：**定位源稿 → 搭骨架 → 图专项 workflow（看原图→画 TikZ→自渲染比对）→ 正文 workflow（draft→双审校→fix）→ 整书编译 → 生成「原图 vs TikZ」对照 PDF 放桌面让用户逐张确认 → 据反馈改图 → 发布（隔离 worktree 落 main）→ 线上验证 → rm 原始资料**。

**铁律三条**：① 图必须让用户对照核对后才定稿（图 agent 会幻觉）；② 发布只 `git add` 自己的文件、绝不 `-A`；③ 署名一律 **Rui Zhou**，不用 Zircon。

---

## 1. 任务目标与质量基线

- **目标**：本科笔记里「整理过、有价值」的部分 → LaTeX textbook 化上线 → 上线后删原始资料（释放磁盘 + 收敛）。
- **质量基线**：这是**一次成型、之后不再改**的永久产物。**正确性压倒一切**；教科书口吻（解释性、严谨、自足）；不是考试速记（禁 tier/答题模板/天数倒计时那一套）。
- **当前是 ultracode**：用 Workflow 工具做实质工作；token 不是约束；对图和正文都要对抗式验证。
- **语言**：给用户看的回复用中文；最终 PDF 正文用英文（教科书风）。

---

## 2. 进度、范围与选课

### 2.1 已完成（2 门，均已上线，author = Rui Zhou）
| 课 | slug | note | 源稿原格式 |
|---|---|---|---|
| 中级计量经济学 | `interm-econometrics` | `/notes/interm-econometrics/interm-econometrics-2023` | 前半中文 + 后半英文 `.Rmd`（译 + 扩写，10 章/120 页） |
| 货币经济学 | `monetary-econ` | `/notes/monetary-econ/monetary-econ-2023`（原地升级旧 markdown 版） | 英文 `.md`（Typora，7 图，7 章/57 页） |

> ⚠️ **反面教材，别重蹈**：中级计量站上**原本已有** `interm-metrics/interm-metrics-2023`（Zircon 旧版），我却**新建了 `interm-econometrics` 新 slug**，于是同一门课出现两个条目。正确做法见 §2.3（复用/升级现有 slug，别造新 slug）。这俩重复待清理，新 agent 可提醒用户。

### 2.2 范围（scope）—— 只做量化课
- **做**：经济学 / 数学 / 心理学 / 管理学里有「定理-证明-公式-可画图」结构、值得 textbook 化的课。
- **不做**（除非用户明确要）：思政（mao-thought、marxism）、体育（swimming、tennis）、通识 / 偏论述文科（china-hist、china-econ、**人类生存发展与核科学**）。
- 判据：有公式 / 定理 / 可画的图 → 做；纯文字论述 / 背诵类 → 跳过或问用户。
- 本项目专指**北大本科**课（原料在 `~/Desktop/其他/北京大学/课程/`）；PSU / 研究生课（`adv-*-psu` 等）和已 textbook 化的（`real-anal`）不在本项目内。

> ⚠️ 直觉「资料最少先做」会诱你选中体量最小的**核科学通识课**——它不在 scope。启发式应为「**在 in-scope 课里**挑资料最少 + 有成型量化笔记的先做」。

### 2.3 选课前必查（避免重复条目 / 决定升级 vs 新增）
原料随大扫除变化，**先 `ls` 看现状**。动手前对候选课跑：
```bash
ls ~/Desktop/其他/北京大学/课程/                       # 还剩哪些学期/课
du -sh ~/Desktop/其他/北京大学/课程/<学期>/<课程>      # 体量
find "~/Desktop/其他/北京大学/课程/<学期>/<课程>" -iname '*.md' -o -iname '*.tex' -o -iname '*.rmd' -o -iname '*.docx'  # 有无成型笔记
ls ~/Desktop/ruizhou03.github.io/_notes/study/         # 站上已有哪些课 slug
ls ~/Desktop/ruizhou03.github.io/_notes/study/<slug>/  # 这门课已有哪些条目
grep -h 'author:' ~/Desktop/ruizhou03.github.io/_notes/study/<slug>/*.md  # 看是 Zircon 旧版还是 Rui Zhou 新版
ls ~/Desktop/ruizhou03.github.io/files/<slug>/         # 已有源码/PDF?
```
据此判断并选择动作：
| 现状 | 动作 |
|---|---|
| 已有「讲义 textbook 条目」(author=Rui Zhou) | 已做，跳过 |
| 已有「markdown 渲染版讲义」(同一份课堂笔记，常 author=Zircon) | **原地升级**：复用其 slug+permalink、替换 PDF、author→Rui Zhou、更新 title/summary（货币经济学就是这么做的） |
| 只有「考试/cheat/作业」类条目 (exam-prep) | 那不是讲义；本任务的 textbook 讲义是**另一篇**，用同 course-slug + 新 note-slug 新增，别动 exam-prep 条目 |
| 站上无任何条目 | 全新建 |

> 现状参考（2026-06-13，会变，以实际 `ls` 为准）：站上很多课已有 **Zircon 的 exam-prep / cheat / 作业**条目（game-theory 仅期中、public-econ、causal-id、psy-stat-II、corp-fin、or 等）——**这不等于讲义已做**，多数课的「完整课堂讲义 textbook」尚未做。

---

## 3. 关键路径

- 站点仓库（工作目录）：`~/Desktop/ruizhou03.github.io`（git，push `main` = 部署到 ruizhou03.com，GitHub Pages 旧版构建）
- 原始课程资料：`~/Desktop/其他/北京大学/课程/<学期>/<课程>/`（⚠️ 桌面在 **iCloud 同步**，见 §9）
- 讲义源码：`files/<slug>/source/`（`main.tex` `theorems.tex` `commands.tex` `chapters/`；`figures/` **仅当该课把图拆成独立 `figN.tex` 时才有**——`monetary-econ` 有，`interm-econometrics` 是内联 tikz、无 `figures/`）
- 成品 PDF：`files/<slug>/<note-slug>.pdf`
- 站点条目：`_notes/study/<slug>/<note-slug>.md`（front-matter only，PDF 即内容）
- **风格样板（必读）**：`files/interm-econometrics/source/chapters/ch1_simple_regression.tex`（手写、用户批准的范本）、`theorems.tex`、`commands.tex`
- 本 playbook：`docs/undergrad-notes-latexify-playbook.md`

---

## 4. 输出格式（textbook 模板）

### 4.1 骨架
```bash
SRC=~/Desktop/ruizhou03.github.io/files/<slug>/source
mkdir -p "$SRC/chapters" "$SRC/figures"
cp ~/Desktop/ruizhou03.github.io/files/interm-econometrics/source/theorems.tex "$SRC/"
cp ~/Desktop/ruizhou03.github.io/files/interm-econometrics/source/commands.tex "$SRC/"
# main.tex 照 interm-econometrics/monetary-econ 的 main.tex 改标题页 + \include 列表
```

### 4.2 `main.tex` 要点
- `\documentclass[oneside]{book}` + 一大堆包（直接抄 monetary-econ/interm-econometrics 的 `main.tex` preamble，**已验证可编译**）。
- 用 **pdflatex** 编译（inputenc utf8 + babel english）。**⚠️ 不能放中文字符**（无 CJK 字形会编译失败）——老师名、署名一律罗马音。
- 标题页：`\def\noteauthor{Lecture course by \textbf{Prof. <英文名>} \\ Guanghua School of Management, Peking University \\ \vspace{0.5em} Notes written and {\LaTeX}-typeset by Rui Zhou}`、`\def\notedate{<学期> \\ \small (rewritten and unified, 2026)}`。
- 一页「How to Read This Book」+「Box Color Code」+「A Note on Notation」。
- `\include{chapters/chN_xxx}` 依序列出。

### 4.3 盒子系统（`theorems.tex` 定义，让 agent 必读）
`\defn{标题}{体}`(绿,定义) · `\thm{标题}{体}`+`\pf{证明}`(蓝,定理) · `\asm{标题}{体}`(粉,假设,同族用 description 列表塞一个框,见 ch1 的 SLR.1–5) · `\lem/\cor/\prop/\fact` · `\ex[名]{体}`(例) · `\sol{体}` · `\rmkb[名]{体}`/`\rmk{行内}` · `\state{标题}{体}`(要点强调框)。
**禁用**考试专用宏：`\strategy \template \reproduce \structure \intuition \proofskip`。

### 4.4 数学宏（`commands.tex`，必读）
`\E{u\given x}`→E(u|x)(宏自带括号,别写 `\E(...)`) · `\Var{} \Cov{}{} \Pr{} \given` · `\plim \pto \dto \iid` · `\hb`(=\widehat\beta) `\sumi \rtn \Op \op` · `\ba..\ea`(aligned) `\bc..\ec`(cases) `\RR \NN \d \pd{}{} \dd{}{} \abs{} \pr{} \br{}`。**绝不用未定义的宏**。注意 `\d \Pr \S \L` 被重定义。

### 4.5 风格规则
- 纯 LaTeX，**无 markdown、无 ``` 代码围栏、无隐藏字符**（源稿常有 U+200B 零宽空格 / U+3000 全角空格，别抄进去）。
- 每章开头一段**纯英文 story 引入**（动机：解决什么问题、为何引入这个工具），仿 ch1 口吻。
- **不放 R 代码**；**不 `\includegraphics` 外部图**——图一律 TikZ 或文字描述；表格用 booktabs。
- 中文源稿要**翻译成英文 + 把要点扩写成连贯教科书正文**（保证读者无难度断崖）；英文源稿则**润色 + 修 typo**，保留全部内容。
- **修源稿的事实/公式错**（源稿确有错，如收益率方向、自由度、卡方、IV 的 Cov/Var）；不确定就自己推导。

---

## 5. 端到端工作流（一门课）

> 整体是 ultracode 多 agent 编排。下面每个 workflow 脚本见 §6（可直接改路径复用）。

1. **定位 & 通读源稿**：`find` 课程文件夹找主笔记（.Rmd/.md/.tex/.docx/PDF）；完整 Read；按一级标题映射「节→章」；`grep` 出所有图（`<img>` / `![]()` / `\includegraphics` / `knitr::include_graphics`），记下每张图的行号 + 所属章 + 图片真实路径（Typora 图常在 `~/Library/Application Support/typora-user-images/`）。
   - **若主笔记是 `.docx`**（公共经济学 / 心理统计 II / 核科学等可能是）：Read 读不了二进制 docx，先转纯文本——`textutil -convert txt -stdout "in.docx"`（macOS 自带）或 `pandoc in.docx -t markdown -o out.md`（图片用 `--extract-media`）——再通读。同课若同时有 `.md/.tex` 和 `.docx`，以 `.md/.tex` 为 canonical，docx 仅补漏。
   - **若主笔记只有扫描版/纯图 PDF**（无文字层）：先 `pdftotext` 看有无文字；没有就需逐页 Read（PDF 当图看）人工誊录，工作量大——这种课先问用户值不值得做。
2. **搭骨架**（§4.1）+ 写 `main.tex`。
3. **图专项 workflow**（§6.A，**任务的重点**）：先把原图 `cp` 到稳定目录（**别用 /tmp，会被清**；用 `~/.figcheck-build` 之类）。每张图一个 agent：Read 原图 + 读上下文方程 → 写 `figures/figN.tex`（**只含 `\begin{tikzpicture}` 或 booktabs `tabular`，无 figure 浮动、无 caption**）→ 自己用 standalone 包裹编译 + `pdftoppm` 渲染 → Read 自己的渲染 + 原图对比 → 迭代到忠实还原。表格类的图渲染成 booktabs 表而非 TikZ。
4. **正文 workflow**（§6.B）：每章 `draft → verify(双路:计量/事实正确性 + LaTeX/风格) → fix`。draft 把对应 markdown/源稿节转成 textbook LaTeX，`<img>` 处插 `\input{figures/figN}` 浮动 + caption + `\label{fig:<slug>-N}`。
5. **并发跑完后复查**：图和正文 workflow 可并行（写不同子目录）。但**正文 workflow 的 fix-agent 可能回头改 `figures/`**（迁就它写的图注）——两个 workflow 全完成后，**务必重新渲染每张图、和原图再对一遍**（吃过亏：fig5 被改回错图）。
6. **整书编译**：`\include` 全部章 → `latexmk -pdf` 然后**再跑 2–3 遍 `pdflatex`**（一次性加多章 + 大量交叉引用，第一遍会有 undefined refs，多跑几遍才解析干净）。目标 `errors=0 undefined=0`。修编译错。
7. **图核对（与用户）**：生成「原图 vs 我的 TikZ」**对照 PDF**（§6.C），`cp` 到**桌面** + `open`（⚠️ `SendUserFile` 用户收不到，别用！）。请用户逐张看切点/结构/正误。据反馈改 `figures/figN.tex`（常见：切线没贴上、颜色、结构、范围括号），重渲染重对。
8. **发布**（§7）：写/更新 `_notes` 条目 → 隔离 worktree 落 `main` → 线上验证。
9. **删原始资料**（§9）：`rm -rf` 课程文件夹（iCloud dataless，不能进废纸篓）。
10. **更新 memory**：`project_undergrad_notes_latexify.md` 记进度。

---

## 6. 可复用的 Workflow 脚本（改路径即可）

> **完整可运行的真本脚本已存到仓库**：`docs/workflows/figures-to-tikz.workflow.js`（图专项，81 行）、`docs/workflows/body-to-latex.workflow.js`（正文 draft→verify→fix，103 行）。**直接读这两个文件照抄**，把里面的 `MD`/`SRC`/`FIGS`/`CHAPTERS` 路径与清单换成当前课的即可。下面是要点说明，细节以真本为准。

> **怎么运行**：用你工具列表里内置的 **Workflow 工具**（其工具说明详述了 `agent()/parallel()/pipeline()/log()` 语法与并发模型）。一个 workflow 就是一段 JS：以 `export const meta = {name, description, phases:[...]}`（**纯字面量**）开头，体内用 `agent(prompt,{label,phase,schema})` / `parallel(thunks)` / `pipeline(items,...stages)` / `log()`、顶层 `await`，最后 `return` 结果；把这段 JS 作为 Workflow 工具的 `script` 参数提交（或用 `scriptPath` 指向 `docs/workflows/*.js`）。它在后台跑、完成时通知你。

### 6.A 图 → TikZ（self-render-compare 闭环）
关键点：每个 agent 自带「画→编译→渲染→比对原图→迭代」闭环。`schema` 强制返回 caption/置信度/残差。standalone 包裹器（agent 在 prompt 里拿到）：
```latex
\documentclass[border=10pt]{standalone}
\usepackage{amsmath,amssymb}\usepackage{tikz}\usepackage{pgfplots}\pgfplotsset{compat=1.18}
\usetikzlibrary{positioning,arrows.meta,patterns,calc,decorations.pathreplacing}
\usepackage{booktabs}
\begin{document}\input{figN.tex}\end{document}
```
图 agent prompt 必含：原图绝对路径、源稿行号范围（读方程定斜率/截距）、house TikZ 风格参考、输出路径（`figures/figN.tex`，**只含 tikzpicture，无 figure 浮动**）、自渲染比对迭代指令、最后删 scratch 只留 `figN.tex`。
**图风格参考要指对**：拆分文件（`figures/figN.tex` + `\input`）这套**只有 `monetary-econ` 真正用了**——让图 agent 读 `files/monetary-econ/source/figures/fig*.tex`（standalone tikz 真本）+ `chapters/ch4_inflation.tex`（看 `\input{figures/figN}` 浮动用法）。TikZ 画风可另参 `files/interm-econometrics/source/chapters/ch6_dummies.tex`（但注意：interm-econometrics 是**内联 tikz**、没有 `figures/` 目录；ch1 根本没有图，只作 prose/盒子范本）。
**完整脚本**：`docs/workflows/figures-to-tikz.workflow.js`（含 `meta`、`FIGS`、`figPrompt` 全文、`SCHEMA`、standalone 渲染步骤、`parallel(...)` 驱动）。
**原图暂存**：放 `~/.figcheck-build/<slug>/`（持久，跨会话不丢）；用 `mkdir -p ~/.figcheck-build/<slug>` 建好，把 prompt 里所有图片路径指到这。真本里写的是 `/tmp/<...>-figs/`——`/tmp` 单次会话内不会被清、能用，但**跨会话/长任务请改用 `~/.figcheck-build/`，照抄真本时记得把 prompt 内所有 `/tmp/...-figs` 路径一并替换**。

### 6.B 正文 → LaTeX（draft→verify→fix 流水线）
```
pipeline(CHAPTERS,
  ch => agent(draftPrompt(ch)).then(s=>({ch,s})),                 // 写 chapters/chN.tex
  p  => agent(verifyPrompt(p.ch), {schema:ISSUES}).then(...),     // 对照源稿+宏查正确性/LaTeX
  p  => agent(fixPrompt(p.ch,p.issues), {schema:FIX}))            // 应用修订
```
中文源稿：双审校（事实/计量正确性 + LaTeX/风格）；英文源稿：可一路 verify。draft prompt 必含：先读 style guide + theorems/commands + ch1 范本 + 源稿行号；盒子/宏清单；图占位规则（`\input{figures/figN}`）；markdown 表→booktabs；翻译+扩写 or 润色；修源稿错；交叉引用 label 表。
**完整脚本**：`docs/workflows/body-to-latex.workflow.js`（含 `meta`、`GUIDE`、`CHAPTERS`、draft/verify/fix prompt 全文、`ISSUES_SCHEMA`/`FIX_SCHEMA`、`pipeline(...)` 驱动）。

### 6.C 对照文档（原图 vs TikZ）
```latex
\newcommand{\pair}[2]{\section*{Figure #1: #2}
 \begin{figure}[H]\centering
 \begin{minipage}[t]{0.47\textwidth}\centering\textbf{Original}\\[6pt]\fbox{\includegraphics[width=\linewidth]{<ORIG>/orig-fig#1.png}}\end{minipage}\hfill
 \begin{minipage}[t]{0.47\textwidth}\centering\textbf{My TikZ}\\[6pt]\fbox{\resizebox{\linewidth}{!}{\input{<FIGDIR>/fig#1.tex}}}\end{minipage}
 \end{figure}\bigskip}
```
用 `\documentclass[11pt]{article}` + tikz/pgfplots/booktabs/float + 每张 `\pair{N}{标题}`。编译后 `cp` 到桌面 + `open`。

> 可选的「资深编辑终审」workflow（每章再通读一遍抓残留笔误 / 记号不统一）——值得对永久产物跑一轮。结构同 §6.B 但更轻：`pipeline(CHAPTERS, proofread(schema:ISSUES), fix(schema:FIX))`，proofread agent 只挑 typo/语法/乱句/记号不统一/残留事实错，**外科手术式**别重写好句子。照 §6.B 真本改即可。

---

## 7. 发布

### 7.1 `_notes` front-matter（照抄 monetary-econ-2023.md，逐字段改）
```yaml
---
layout: post
main_category: "学习资料"
sub_category: "<课程显示名，如 中级计量经济学>"   # 纯 front-matter 驱动，无需别处注册
title: "<X>讲义"
keywords: [ ~50-100 个，双语 + 同义词 + 错别字 + 老师名 + 北大/PKU + 各主题 ]
discipline: "经济学"                              # 或 数学/心理学…
course: "<课程名>"
material_type: "Notes"
date: 2023-09-01                                  # 课程学期日期；⚠️ 绝不能晚于系统当天(未来日期 Jekyll 静默 404)
author: "Rui Zhou"                                # ⚠️ 不用 Zircon
permalink: "/notes/<slug>/<note-slug>"
pdf_url: "/files/<slug>/<note-slug>.pdf"
summary: "<中文，丰富：方向/学期/老师中英名 + 覆盖模块 + 多少页/盒子风格 + 可自学/复习>"
---
```
PDF 放 `files/<slug>/<note-slug>.pdf`；条目放 `_notes/study/<slug>/<note-slug>.md`。发布前可本地 `ruby -ryaml -rdate -e 'YAML.safe_load(...,permitted_classes:[Date])'` 校验 YAML。

### 7.2 落 main（隔离 worktree，守提交边界）
**铁律**（CLAUDE.md）：只 `git add <自己改的具体文件>`，**禁 `-A`/`.`/整目录**；发现别人的 WIP（常有 guandan/scripts 的改动）一概不碰、不 stash、不 reset。
- 工作区**干净且本地==origin**时：可直接 `git add <我的路径> && git commit && git push origin HEAD:main`。
- 工作区**脏（有别人 WIP）**时：开隔离 worktree——
```bash
cd ~/Desktop/ruizhou03.github.io
git fetch origin main -q
git worktree add -B land /tmp/land origin/main
cp -R files/<slug> /tmp/land/files/   # 及 _notes 文件
git -C /tmp/land add files/<slug> _notes/study/<slug>
git -C /tmp/land commit -m "...
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git -C /tmp/land fetch origin main -q && git -C /tmp/land rebase origin/main
git -C /tmp/land push origin HEAD:main
git worktree remove /tmp/land --force; git branch -D land
# ⚠️ 别在脏工作区 reset --hard（会毁别人 WIP）
```
commit message 用中文描述本次改动 + 上面那行 Co-Authored-By。

### 7.3 线上验证
```bash
gh api repos/ruizhou03/ruizhou03.github.io/pages/builds/latest --jq '{status,error:.error.message,commit:.commit}'
curl -L --retry 10 --retry-delay 22 --retry-all-errors -s "https://ruizhou03.com/notes/<slug>/<note-slug>" -o /tmp/n.html -w "%{http_code}\n"
grep -o "<标题>" /tmp/n.html ; # 校验标题/老师/署名
curl -L -sI "https://ruizhou03.com/files/<slug>/<note-slug>.pdf" | grep -i content-length  # 确认是新版大小
```
Pages 构建约 1–3 分钟；curl 用 `--retry-all-errors` 等它 built。

---

## 8. 发布前清源码

`cd $SRC && find . -type f ! -name "*.tex" -delete`（清掉 .aux/.log/.pdf 等编译副产物，**只留 .tex**），再把成品 PDF 单独 `cp` 到 `files/<slug>/<note-slug>.pdf`。注意验证阶段子 agent 可能留下 `_check_*` / `ch8test.*` 之类 scratch，一并清。

---

## 9. 删原始资料（⚠️ iCloud 坑）

桌面在 **iCloud 同步**，老课程资料里的大 PDF（教材等）多是 **dataless 占位文件**（`ls -ls` 显示 0 物理块）。后果：
- `mv` 到 `~/.Trash`、或访达删除 → 会**先触发下载**→ **超时失败**（`Operation timed out` / AppleEvent `-1712`）。
- 只能 `rm -rf "<课程文件夹>"`（直接 unlink，不下载）——但**永久删除、不进废纸篓、不可恢复**。
- **务必先确认**：讲义已上线验证 OK（§7.3），且原始资料里没有「未上线且唯一」的东西（教材网上可重下；笔记已转成更完整的讲义）。删前 `ls`/`du -sh` 给用户看一眼。**告知用户这是永久删除**（之前每门课都是这么删的，用户已知此限制）。

---

## 10. 坑 / 教训（血泪，务必记住）

1. **图 agent 会幻觉**：货币 fig5 该是 c1/c2 政府支出图，却被画成铸币税 Laffer 曲线。→ **永远生成对照 PDF 让用户核对后才定稿**。
2. **并发正文 workflow 的 fix-agent 会回头改 `figures/`**：为迁就图注把已修好的 fig5 又改回 Laffer。→ **所有 workflow 跑完后重渲染每张图复查**。
3. **切线必须精确**：indifference curve 用 Cobb-Douglas `c2 = K·c1^(-ρ)`，取 **ρ = m·c1\*/c2\***、**K = c2\*·c1\*^ρ**（m=预算线斜率绝对值），且**均衡点要落在预算线上**，才真相切而非擦边（用户对这个很敏感）。pgfmath 用 `pow(\x,-\rho)`。
4. **SendUserFile 用户收不到** → 一律 `cp` 到桌面 + `open`。
5. **iCloud dataless** → 删原料用 `rm -rf`（见 §9）。
6. **Git 边界**：只 add 自己文件；脏工作区用 worktree；push 前 fetch+rebase 自己那条；别 reset --hard 掉别人 WIP。
7. **latexmk 要多跑几遍 pdflatex** 才解析完交叉引用（首轮 undefined 正常）。
8. **pdflatex 不能放中文**（CJK 无字形）→ 名字罗马音。
9. **zsh 坑**：`echo '\end{x}'` 会把 `\e` 变成 ESC(U+001B) 污染文件 → 用 quoted heredoc `<<'EOF'` 或 `printf`；zsh 数组**从 1 开始**（别按 0 取，会串位）；通配符无匹配会报错（`setopt null_glob` 或用 `find`）。
10. **源稿隐藏字符**：U+200B/U+3000/杂控制符——agent prompt 里明令别抄；必要时 `LC_ALL=C grep -nP '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]'` 排查。
11. **未来日期**：`date` 晚于系统当天 → Jekyll 静默 404。用课程学期的过去日期。
12. **可能已有旧版笔记** → 原地升级（同 URL 换 PDF + 改 author/summary），别建重复条目。

---

## 11. 速查：约定

- **署名**：`Rui Zhou`（PDF + `_notes author`）。绝不用 Zircon。pdflatex 放不了中文「周睿」。
- **老师名**（查到的）：中级计量 = **宋晓军 / Xiaojun Song**；货币经济学 = **肖筱林 / Sylvia Xiaolin Xiao**。新课要查老师英文名（官网），拿不准就**问用户**（中级计量就因猜错被用户纠正过）。
- **图审美**（用户明确）：曲线用常规**黑色**不用灰；一图两条预算线用**粗细**区分（陡/feasible 线粗、缓/budget 线细，都黑）；表格**正文居中、表头保持左**（`{lccc}` + 表头 `\multicolumn{1}{l}{}`）。
- **盒子**：定义绿、定理蓝、假设粉、例子/备注/要点框；禁考试宏。
- **figure 浮动**：`\begin{figure}[h]\centering \input{figures/figN} \caption{...}\label{fig:<slug>-N}\end{figure}`；正文用 `Figure~\ref{...}`。

---

## 12. 命令速查

```bash
# 渲染某页抽查
pdftoppm -png -r 100 -f <p> -l <p> main.pdf /tmp/pg && # 然后 Read /tmp/pg-*.png
# 单图 standalone 渲染（见 §6.A 包裹器）
pdflatex -interaction=nonstopmode _check.tex && pdftoppm -png -r 130 _check.pdf /tmp/r
# 整书编译
cd $SRC && latexmk -pdf -interaction=nonstopmode main.tex && for i in 1 2; do pdflatex -interaction=nonstopmode main.tex; done
grep -c '^!' main.log; grep -c undefined main.log; pdfinfo main.pdf | awk '/Pages/{print $2}'
# 找图引用
grep -nE '<img|!\[|includegraphics|include_graphics' "<源稿>"
# 提 Typora 图真实路径并拷出
grep -oE 'src="[^"]*"' "<md>" | sed 's/src="//;s/"//'
```

---

*最后更新：2026-06-13（货币经济学完工后）。本文应随每门课的新教训更新。*
