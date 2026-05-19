---
layout: post
title: "回归结果一键出三线表：用 fixest / modelsummary / esttab 告别手抄系数"
main_category: "科研妙招"
sub_category: "计量实证"
date: "2026-05-20"
author: "Zircon"
permalink: "/research/econometrics/regression-tables"
published: true
keywords: ["回归表 LaTeX", "三线表", "回归结果出表", "regression table", "modelsummary", "fixest etable", "esttab estout", "stargazer", "Stata 回归表", "Stata 导出 LaTeX", "outreg2", "reghdfe esttab", "R 回归表", "回归系数表", "booktabs 表格", "显著性星号", "standard errors 括号", "固定效应 yes no 行", "手抄系数", "回归结果复制粘贴", "一键出表", "论文表格自动化", "tex 表格 input", "Word 回归表", "huxtable", "fixed effects row", "huigui biao", "回归表格模板"]
---

{% raw %}

手抄回归系数是科研里最没有产出、又最容易出错的环节之一：从 console 里一个个把系数、括号里的标准误、星号抄进 Word 或 LaTeX，改了个控制变量重新跑，再抄一遍。抄错一位小数，审稿人正好算了边际效应对不上——这种翻车每年都在发生。

正确的做法是：**回归对象直接喂给出表函数，生成一个 `.tex`（或 `.docx`），论文里 `\input` 它，永不手碰数字。** 改了模型重跑脚本，表自动更新。这篇把 R 和 Stata 两边最顺手的工具讲清楚，给到能直接抄的模板。

## R：modelsummary + fixest，目前的最优解

[`fixest`](https://lrberge.github.io/fixest/) 跑带高维固定效应的回归极快，[`modelsummary`](https://modelsummary.com/) 负责把任意一组模型排成出版级表格。两者配合是现在 R 用户的主流选择。

```r
library(fixest)
library(modelsummary)

m1 <- feols(lwage ~ educ,                       data = df)
m2 <- feols(lwage ~ educ + exper,               data = df)
m3 <- feols(lwage ~ educ + exper | firm + year, data = df,
            cluster = ~firm)          # 双向固定效应 + 公司层聚类

models <- list("(1)" = m1, "(2)" = m2, "(3)" = m3)

modelsummary(
  models,
  output    = "output/tables/wage.tex",   # 直接落盘成 LaTeX
  stars     = c('*' = .1, '**' = .05, '***' = .01),
  coef_map  = c(educ = "受教育年限", exper = "工作经验"),
  gof_omit  = "AIC|BIC|RMSE|Log.Lik",     # 删掉没人看的拟合指标行
  gof_map   = list(
    list("raw" = "nobs",      "clean" = "观测数",   "fmt" = 0),
    list("raw" = "r.squared", "clean" = "R$^2$",    "fmt" = 3)
  ),
  notes = "括号内为公司层聚类稳健标准误。"
)
```

`feols` 用 `|` 分隔出固定效应，`modelsummary` 会**自动加一行 `FE: firm` / `FE: year` 的 Yes/No**，不用手写。`output` 给 `.docx` 就出 Word 表，给 `"markdown"` 就直接在 console 看草稿——同一份代码，三种产物。

`fixest` 自带的 `etable()` 是另一个选择，对纯 `fixest` 模型排版更精细，固定效应行、聚类信息处理得很贴经济学习惯：

```r
etable(m1, m2, m3,
       tex     = TRUE,
       file    = "output/tables/wage.tex",
       dict    = c(educ = "受教育年限", exper = "工作经验"),
       fitstat = ~ n + r2)
```

经验法则：**全程 `fixest` 就用 `etable`；要把 `feols`、`lm`、`glm`、IV 混排在一张表里，用 `modelsummary`**。`stargazer` 仍有人用，但它不认 `fixest` 对象、维护停滞，新项目不必再选它。

生成的表大致长这样（`booktabs` 三线，无竖线）：

| | (1) | (2) | (3) |
|---|---|---|---|
| 受教育年限 | 0.082\*\*\* | 0.071\*\*\* | 0.065\*\*\* |
| | (0.004) | (0.005) | (0.009) |
| 工作经验 | | 0.011\*\*\* | 0.013\*\*\* |
| | | (0.002) | (0.003) |
| 公司固定效应 | No | No | Yes |
| 年份固定效应 | No | No | Yes |
| 观测数 | 12,540 | 12,540 | 12,540 |

## Stata：esttab（estout 套件）

Stata 这边的事实标准是 [`estout`](http://repec.org/bocode/e/estout/) 里的 `esttab`。先 `ssc install estout, replace` 装一次。核心节奏是**跑一个模型 `eststo` 存一个，最后 `esttab` 一起导出**：

```stata
eststo clear

eststo: reg lwage educ
eststo: reg lwage educ exper
eststo: reghdfe lwage educ exper, absorb(firm year) cluster(firm)

esttab using "output/tables/wage.tex", replace ///
    booktabs                                  /// 用 \toprule \midrule \bottomrule
    se                                        /// 括号里放标准误（默认是 t 值）
    star(* 0.10 ** 0.05 *** 0.01)             ///
    b(3) se(3)                                /// 系数 / 标准误保留 3 位
    label                                     /// 用变量 label 而非变量名
    keep(educ exper)                          /// 只显示这两个，控制变量不进表
    stats(N r2, fmt(0 3) labels("观测数" "R\$^2\$")) ///
    nonotes addnotes("括号内为公司层聚类稳健标准误。")
```

`reghdfe` 吸收的固定效应，加 `indicate("公司 FE = *.firm" "年份 FE = *.year")` 或装 `estadd` 就能补上 Yes/No 行。要 Word 不要 LaTeX，把扩展名换成 `.rtf` 或 `.csv` 即可，选项几乎不用动。

一个常踩的坑：`esttab` 默认括号里是 **t 统计量**，不是标准误——经济学惯例放标准误，**记得永远带 `se`**，否则审稿人会以为你的标准误小得离谱。

## 三条让表“能直接进论文”的纪律

工具只是第一步，下面三点决定这张表是省事还是埋雷：

1. **`\input` 进正文，绝不复制粘贴。** LaTeX 里写 `\input{../output/tables/wage.tex}`，重跑回归脚本表就自动更新。手抄一时爽，重跑两行泪。
2. **导出的是片段，不是整页文档。** `modelsummary` / `esttab` 默认吐 `tabular` 片段，正文里再用 `table` 环境套标题和 `\label`，这样换个期刊模板表照样能用。
3. **星号、标准误类型、固定效应行写进表注，别只在心里记。** 审稿人第一个问的就是“标准误聚类在哪一层”，让表自己说清楚。

把这套接进[可复现项目的主脚本](/research/workflow/reproducible-project)里，回归一改、`Rscript run_all.R` 一跑，论文里所有表同步刷新——这才是出表工具真正的价值：不是省那几分钟排版，是从此**数字只有一个来源**。

{% endraw %}
