---
layout: post
title: "用 Git 写论文、和合作者协作：分支、冲突、给 LaTeX/数据写 .gitignore"
main_category: "科研妙招"
sub_category: "科研工作流"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/workflow/git-for-papers"
published: true
keywords: ["Git 写论文", "Git 论文版本管理", "LaTeX 版本控制", "论文协作", "合作者 git", "paper_final_v3", "版本命名混乱", "git 工作流 论文", "git status add commit push pull", "commit message 写法", "git 分支 branch", "审稿修改分支", "revision 分支", "merge 冲突", "LaTeX 合并冲突", "一句一行 one sentence per line", "git tag 投稿版本", "标记提交版本", "gitignore LaTeX", "忽略 aux log pdf", "gitignore 数据", "GitHub 私有仓库", "GitLab", "Overleaf git", "Overleaf 同步 git", "git restore revert", "git reflog 后悔药", "误删找回", "审稿意见 对照", "git xie lunwen", "论文怎么用 git", "多人写论文"]
---


`paper_final.tex`、`paper_final_v2.tex`、`paper_final_真的最终.tex`、`paper_zircon改_合作者再改.tex`——这是没用版本控制写论文的标准结局。等审稿意见回来要你“换回上一版的那个稳健性做法”，你已经不知道是哪个文件的哪一段了。

[Git 怎么让本地、GitHub 和“过去”协同](/research/how-it-works/git-workflow)那篇讲的是原理；这篇是操作手册——具体怎么把 Git 用在**写论文和带合作者**这件事上，包含 LaTeX 项目特有的坑。

## 一、论文项目该提交什么、忽略什么

论文仓库沿用[可复现项目结构](/research/workflow/reproducible-project)：`code/`、`data/`、`output/`、`paper/`。关键是 `.gitignore`——**Git 该管的是源码（`.tex`、`.bib`、代码），不是编译产物和大数据**。把这些垃圾提交进去，每次 commit 都是几百行 `.aux` 噪音，diff 完全没法看：

```gitignore
# LaTeX 编译副产物：可重新生成，不入库
*.aux
*.log
*.out
*.toc
*.bbl
*.blg
*.synctex.gz
*.fls
*.fdb_latexmk
paper/main.pdf          # PDF 是产物，按需提交（见下）

# 数据与结果
data/raw/*              # 大数据 / 保密数据不进库
!data/raw/.gitkeep
output/                 # 表和图由代码生成，不入库
```

是否提交编译出的 `main.pdf` 看习惯：合作者里有人不装 LaTeX、想直接看 PDF，就提交它,否则忽略掉，谁要看自己编译。把清理副产物这件事做彻底，可以配合[「告别 LaTeX 文件海洋」](/research/latex/latex-clean-workflow)那套 `outDir` 设置,从源头就不让垃圾文件出现在仓库目录里。

## 二、写论文的日常循环

就四个动作，形成肌肉记忆：

```bash
git status                 # 我改了哪些文件
git add paper/main.tex     # 选要记录的改动（别无脑 git add .）
git commit -m "重写引言第二段，突出识别策略的新意"
git push                   # 同步到 GitHub / GitLab
```

每天开工先 `git pull` 把合作者的改动拉下来。commit message 写**这次改了什么、为什么**，别写 “update”——半年后对着审稿意见回溯时，一句好 message 顶你翻十个文件。粒度上：一个完整的小改动就 commit 一次（“补做按性别分样本的稳健性”“按 R2 意见重写机制讨论”），别攒一周一次性提交。

## 三、用分支隔离“审稿修改”和“乱试”

分支让你在不动主线的情况下大刀阔斧地改。论文场景最实用的两种用法：

<svg viewBox="0 0 600 170" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:600px;display:block;margin:1.4rem auto;font-family:sans-serif;">
  <defs><marker id="g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#3b6ea5"/></marker></defs>
  <line x1="30" y1="60" x2="570" y2="60" stroke="#3b6ea5" stroke-width="2"/>
  <text x="30" y="48" font-size="11" fill="#3b6ea5">main（始终可编译的版本）</text>
  <g fill="#3b6ea5"><circle cx="80" cy="60" r="5"/><circle cx="300" cy="60" r="5"/><circle cx="540" cy="60" r="5"/></g>
  <path d="M80,60 C130,60 130,125 180,125" fill="none" stroke="#b07b2f" stroke-width="2"/>
  <line x1="180" y1="125" x2="280" y2="125" stroke="#b07b2f" stroke-width="2"/>
  <path d="M280,125 C300,125 300,60 300,60" fill="none" stroke="#b07b2f" stroke-width="2" marker-end="url(#g)"/>
  <g fill="#b07b2f"><circle cx="180" cy="125" r="5"/><circle cx="240" cy="125" r="5"/></g>
  <text x="135" y="150" font-size="11" fill="#b07b2f">revision-r1：按一审意见改，改好 merge 回 main</text>
  <text x="360" y="48" font-size="11" fill="#888">每个 commit 都能复现出对应那版论文</text>
</svg>

```bash
git switch -c revision-r1     # 一审回来，开个分支专门做这轮修改
# ……改正文、补稳健性、跑新结果……
git switch main
git merge revision-r1         # 这轮改定了，合回主线
```

- **按审稿轮次开分支**（`revision-r1`、`revision-r2`）：主线 `main` 永远是“当前最干净、能编译”的版本，修改过程的反复都圈在分支里；
- **“我想试个完全不同的稳健性”**：开 `try-altsample` 分支随便造，成了 merge、砸了直接删分支，主线毫发无伤——这就是 Git 替代“复制一份文件夹来试”的地方。

## 四、和合作者协作：让冲突几乎不发生

多人改同一个 `.tex`，最怕 merge 冲突。一个极其有效、却很少人做的习惯能把冲突降到接近零：**一句一行（one sentence per line）**。

在 `.tex` 里每写完一句就换行（LaTeX 不在意源码里的单换行，渲染出来照样是连续段落）。这样两个人改同一段的不同句子时，Git 看到的是不同行，能自动合并;传统的“一段挤成一长行”写法，改同一段任何一处都撞在同一行上,必冲突:

```latex
我们利用 2020 年的政策实施构造准自然实验。
对照组为尚未实施该政策的州。
关键识别假设是处理前的平行趋势。
```

协作铁律就一条：**push 前先 pull**。流程是 `git pull` → 解决可能的冲突 → 本地确认还能编译 → `git push`。真撞上冲突，Git 会在文件里标出来：

```
<<<<<<< HEAD
我们的弹性估计为 0.30。
=======
我们的弹性估计为 0.32（更新样本后）。
>>>>>>> coauthor-branch
```

手动留下正确的那句、删掉标记行，`git add` 再 `git commit` 即可。一句一行 + 勤 pull，一篇论文写完通常一次冲突都遇不到。仓库放 GitHub / GitLab **私有库**，把合作者加成 collaborator，别用邮件来回发附件。

## 五、给投稿版本打标签

论文投出去那一刻，给当前状态打个 tag。之后无论怎么改，都能精确地“回到当时投出去的那一版”——回应审稿意见、写 response letter、做 diff 给编辑时极有用：

```bash
git tag -a submitted-aer-2026-05 -m "投稿 AER 的版本"
git push --tags

# 半年后想看当时到底投了什么：
git switch --detach submitted-aer-2026-05
# 想生成"修订对照版"：
latexdiff <旧tag的main.tex> main.tex > diff.tex   # 给编辑的 tracked-changes 稿
```

`latexdiff` 配合 tag，就是审稿环节那份“标红改动稿”的标准做法。

## 六、Overleaf 也能纳进来

合作者只肯用 Overleaf？Overleaf 项目自带 Git 同步（项目菜单里有 Git 链接），可以 `git pull` 下来本地用 VS Code 写、`git push` 回去，Overleaf 端实时更新——既照顾合作者的习惯，你自己仍享有完整的版本历史和分支。

## 七、后悔药

误删一段、改崩了想退回，常用三招（深层原理见[ Git 协同那篇](/research/how-it-works/git-workflow)）：

```bash
git restore paper/main.tex          # 丢弃尚未提交的改动，回到上次 commit
git revert <commit>                 # 撤销某个已提交的改动（生成一个反向 commit，历史保留）
git reflog                          # 连分支都误删了？这里有所有 HEAD 移动记录，能捞回来
```

只要东西 commit 过，在 Git 里就几乎不可能真正丢失——这正是它替代“`final_v7` 文件夹”的底气。

把 Git 串进整条线：[可复现项目结构](/research/workflow/reproducible-project)管目录、Git 管版本与协作、[ SLURM ](/research/workflow/remote-server)管算力、[出表工具](/research/econometrics/regression-tables)和[ TikZ ](/research/latex/tikz-econ-figures)管图表、[ Zotero ](/research/literature/zotero-setup)管文献——这六篇合起来，就是一套从开题到投稿都不返工的实证科研工作流。

