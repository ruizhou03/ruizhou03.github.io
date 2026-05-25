---
layout: post
title: "可复现的研究项目怎么搭：数据-代码-输出分离、相对路径、renv 与 AEA data policy"
main_category: "科研妙招"
sub_category: "科研工作流"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/workflow/reproducible-project"
published: true
keywords: ["可复现研究", "复现 reproducibility", "replication package", "复现包", "AEA data policy", "AER 数据政策", "数据可用性政策", "data availability", "研究项目结构", "项目目录结构", "数据代码输出分离", "相对路径", "setwd 绝对路径", "here 包", "here::here", "RProject Rproj", "renv 锁依赖", "依赖管理", "set.seed 随机种子", "Stata set seed", "master do 文件", "run_all", "Makefile 复现", "README 写法", "原始数据只读", "raw data read only", "gitignore 数据", "三个月后跑不出来", "审稿复现", "kefuxian", "复现性"]
---


每个做实证的人迟早会撞上这两件事的其中之一：

- 投出去的论文被接收后，期刊要你交一个 **replication package**，结果你打开两年前的文件夹，里面 `final.do`、`final_v2.do`、`final_real.do`、`真的最终版.do` 排成一排，自己都不知道哪个跑出了表 3；
- 或者更早——审稿意见回来要你换个样本重跑，你改了清洗代码，结果发现回归那一步读的还是旧的中间文件，数字对不上，排查了一整天。

这两件事的根都是同一个：项目不可复现。可复现不是“把代码发出去”那么简单，它是指**任何人（包括三个月后的你）拿到这个文件夹，按 README 跑一个脚本，就能从原始数据一路生成出论文里每一张表、每一张图**。这篇讲怎么从一开始就把项目搭成这样，不用等到中稿才返工。

## 一、心智模型：数据 → 代码 → 输出，单向流动

先记住一句话：**原始数据是只读的，输出是可丢弃的，中间所有东西都由代码生成。**

<svg viewBox="0 0 640 140" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:640px;display:block;margin:1.5rem auto;font-family:sans-serif;">
  <defs>
    <marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="#555"/>
    </marker>
  </defs>
  <rect x="20" y="40" width="150" height="60" rx="6" fill="#eef3fb" stroke="#5e7c98"/>
  <text x="95" y="66" text-anchor="middle" font-size="14" fill="#1f3b5b">data/raw/</text>
  <text x="95" y="86" text-anchor="middle" font-size="11" fill="#5a7">只读 · 永不手改</text>
  <rect x="245" y="40" width="150" height="60" rx="6" fill="#fdf3e7" stroke="#8a6841"/>
  <text x="320" y="66" text-anchor="middle" font-size="14" fill="#7a531a">code/</text>
  <text x="320" y="86" text-anchor="middle" font-size="11" fill="#a86">唯一改动入口</text>
  <rect x="470" y="40" width="150" height="60" rx="6" fill="#eef9ef" stroke="#557559"/>
  <text x="545" y="66" text-anchor="middle" font-size="14" fill="#1f5b2e">output/</text>
  <text x="545" y="86" text-anchor="middle" font-size="11" fill="#5a7">可随时删了重生成</text>
  <line x1="170" y1="70" x2="240" y2="70" stroke="#555" stroke-width="1.5" marker-end="url(#ah)"/>
  <line x1="395" y1="70" x2="465" y2="70" stroke="#555" stroke-width="1.5" marker-end="url(#ah)"/>
  <text x="320" y="125" text-anchor="middle" font-size="12" fill="#888">删掉 output/ 跑一遍脚本，应该一字不差地长回来</text>
</svg>

判断项目健不健康有个一句话测试：**把 `output/` 整个删掉，重跑主脚本，论文里的表和图应该一字不差地长回来。** 如果做不到——比如某个数字是你手动在 Excel 里调过的、某张图是截屏来的——那它就还不可复现。

## 二、目录结构

不用追求花哨，下面这套朴素结构能扛住 95% 的实证项目：

```
my-paper/
├── README.md            ← 怎么跑、跑出什么、数据从哪来
├── my-paper.Rproj       ← RStudio 项目锚点（用 R 的话）
├── data/
│   ├── raw/             ← 原始数据，只读，绝不手动改一个格子
│   └── clean/           ← 清洗后的分析样本，由 code 生成
├── code/
│   ├── 01_clean.R       ← 读 raw/ → 写 clean/
│   ├── 02_analysis.R    ← 读 clean/ → 跑回归
│   ├── 03_tables.R      ← 出表
│   ├── 04_figures.R     ← 出图
│   └── run_all.R        ← 按顺序调上面四个
├── output/
│   ├── tables/
│   └── figures/
└── paper/
    └── main.tex         ← \input{../output/tables/tab1.tex}
```

几个不起眼但关键的约定：

- **脚本带数字前缀**，文件管理器里天然按执行顺序排列，新人扫一眼就知道先跑谁。
- **`data/raw/` 进去之后就当它是石头**。要修正一个明显的录入错误？也写在清洗代码里（`mutate(age = ifelse(id == 42, 29, age))`），而不是去 raw 文件里改——这样这个修正是有记录、可审查、可撤销的。
- **`output/` 里不放任何手工产物**。表是代码 `write` 出来的 `.tex`，图是代码存的 `.pdf`，论文用 `\input` / `\includegraphics` 引，永不复制粘贴数字。

## 三、相对路径：复现性头号杀手是 `setwd()`

一个项目能不能在别人电脑上跑起来，80% 卡在路径。下面这行是最经典的反面教材：

```r
setwd("/Users/zircon/Dropbox/research/my-paper/data")   # ← 换台电脑必死
```

正确做法是**让“项目根目录”成为唯一的锚，所有路径都相对它写**。

**R**：用 [`here`](https://here.r-lib.org/) 包。它会自动往上找 `.Rproj` 或 `.git` 当根，无论你从哪个子目录、用 RStudio 还是 `Rscript` 跑，路径都一致：

```r
library(here)
df  <- read_csv(here("data", "raw", "survey.csv"))
write_csv(clean, here("data", "clean", "analysis.csv"))
```

**Stata**：在 master do 文件开头定义一个全局宏当根，全项目只此一处写绝对路径，其余一律相对它：

```stata
* master.do —— 只有这里碰绝对路径，换人换机只改这一行
global root "/Users/zircon/research/my-paper"

do "$root/code/01_clean.do"
do "$root/code/02_analysis.do"
```

更进一步可以连这一行都不写死：让协作者各自建一个本地的 `profile.do` 设 `global root`，主仓库里不提交它（见第七节 `.gitignore`）。

## 四、一个主脚本串起一切

复现的入口必须是**一个**命令，不是一份“先跑这个再跑那个，记得中间手动导出一下”的口头说明。

最低成本版本——`run_all.R`：

```r
source(here::here("code", "01_clean.R"))
source(here::here("code", "02_analysis.R"))
source(here::here("code", "03_tables.R"))
source(here::here("code", "04_figures.R"))
```

Stata 对应 `master.do` 依次 `do` 各步。

如果项目大、某些步骤要跑几小时，值得上 **Makefile**：它会记录依赖关系，只重跑真正变了的环节（改了出图代码，不会陪着把两小时的清洗重跑一遍）：

```makefile
output/tables/tab1.tex: code/03_tables.R data/clean/analysis.csv
	Rscript code/03_tables.R

data/clean/analysis.csv: code/01_clean.R data/raw/survey.csv
	Rscript code/01_clean.R
```

R 生态里 [`targets`](https://books.ropensci.org/targets/) 包是同思路的现代替代，不熟 Make 语法的话更友好。但别为了上工具而上工具——小项目一个 `run_all.R` 足够。

## 五、把随机性钉死

只要代码里有 bootstrap、模拟、随机分训练测试集、随机抽子样本，**不设种子，你就永远复现不了自己的数字**。

```r
set.seed(20260520)        # R：放在脚本最顶，任何随机操作之前
```

```stata
set seed 20260520          // Stata
set sortseed 20260520      // 排序里有并列时也固定，常被忘
```

提醒两点：种子要写在脚本里、跟着代码一起进版本控制，不是临时在 console 敲一下；R 在 3.6 版改过默认抽样算法，跨大版本复现要留意 `RNGkind()`，写进 README 里。

## 六、锁住依赖：别人的 `tidyverse` 不是你的 `tidyverse`

“代码我跑没问题啊”——很多复现失败不是代码错，是包版本变了：某个函数默认参数改了、某个包从 CRAN 下架了。把依赖也锁进项目：

**R**：用 [`renv`](https://rstudio.github.io/renv/)。它给项目建一个独立的包库，并把每个包的精确版本写进 `renv.lock`：

```r
renv::init()      # 项目开张时跑一次，建立隔离环境
renv::snapshot()  # 每次装/升级了包后，把版本快照写进 renv.lock
renv::restore()   # 别人 clone 后跑这一句，装回一模一样的版本
```

`renv.lock` 要提交进 git，包本身不提交。

**Stata**：没有 renv 这种东西，但有两条等效纪律——在 master do 里写 `version 18`（强制用该版本的语法行为），并且把外部命令（`reghdfe`、`estout` 等）的 `.ado` 文件直接放进 `code/ado/`、用 `sysdir set PLUS` 指过去，而不是依赖每个人 `ssc install` 时装到的随机版本。

**Python**：`requirements.txt` 配 `pip freeze`，或用 `uv` / `conda` 的 lock 文件，同理。

## 七、README 和 .gitignore

**README** 是复现包的脸。不用长，但这几样必须有：

- 数据从哪来、怎么获取（公开下载链接，或“受限数据，需向 XX 申请，作者不能直接分发”）；
- 软件和版本（R 4.4.1 / Stata 18 / 关键包版本，或直接指向 `renv.lock`）；
- **怎么跑**：一句话——“`Rscript code/run_all.R`，约 20 分钟，产物在 `output/`”；
- 哪个脚本对应论文里哪张表/图（一个小对照表，审稿人和未来的你都会感谢这个）。

**`.gitignore`**：版本控制里只放代码和小的可分发数据，**别把几个 GB 的原始数据、保密数据、可重新生成的中间文件塞进 git**——仓库会爆，还可能违反数据协议：

```gitignore
data/raw/*          # 大数据 / 保密数据不进库；保留目录占位见下
!data/raw/.gitkeep
data/clean/*         # 中间文件由代码生成，不入库
!data/clean/.gitkeep
output/              # 产物可重生成，不入库
renv/library/        # renv 的包本体不入库，只留 renv.lock
*.log
profile.do           # 各人本地路径配置，不入库
```

## 八、对着 AEA 数据政策自查

经济学顶刊（AER、AEJ 系列、JEL 等）现在都执行 [AEA Data and Code Availability Policy](https://www.aeaweb.org/journals/data/data-code-policy)，由 AEA Data Editor 真的会拿你的包从头跑一遍。中稿前对着这张清单过一遍，能省掉来回折腾：

- 有没有一个主脚本，从原始数据一路生成所有表和图，**中间零手工步骤**？
- 每张表、每张图都能对应到生成它的具体代码行？
- 用了保密/付费数据的，有没有写清来源、申请方式，并提供一份能跑通的合成或公开子样本？
- 软件、包、版本、随机种子都交代了？
- 在一台干净的机器（最好不是你自己天天用的那台）上，照 README 真的跑通过一次？

最后一条最值钱：**复现性不是写出来的，是在别的机器上跑通一次验出来的。** 项目开张第一天就按这套搭，比中稿后回头考古，省的是以周计的时间。

