---
name: search-keywords
description: 给 ruizhou03.github.io 的文章/菜谱写好 front-matter `keywords:`，让读者凭"记得的内容"（同义词、关联词、英文、错别字）也能搜到。发布博客/菜谱前的必做收尾步骤——new-post 与 recipe skill 在 commit 前都要调用本方法。也可单独触发："给这篇加搜索关键词 / 优化关键词 / 让别人搜得到这篇 / 补 keywords / 这篇搜不到"。
---

# search-keywords — 为文章生成可被搜到的关键词

仓库根：`/Users/zhourui/Desktop/ruizhou03.github.io`

## 为什么需要

读者常常**记得文章讲过什么，却想不起确切标题**（搜“内衣”找《内裤多久换一条》、搜“卫生间”找《公共厕所的门为什么留缝》、搜“PCA”找主成分分析教程）。`keywords:` 就是为这种检索准备的。

它喂给两处搜索（都已接好，无需改代码）：

- 分类页搜索框：`_includes/sub-category-section.html` 把 `标题 + keywords + tags` 拼进 `data-title`
- 顶部导航搜索：`search.json` 把 `keywords + tags + 课程别名` 并进索引
- 两处都再经 `_includes/search-expand.html` + `_data/search_synonyms.yml` 做同义词扩展

**分工**：跨文章通用的等价词（番茄/西红柿、厕所/卫生间）放 `_data/search_synonyms.yml` 一处即可；**本文专属**的关联词放这篇的 `keywords:`。

## 方法

1. 读这篇文章：从**标题 + 开头 + 各级 `##`/`###` 小标题**判断它到底在讲什么、读者会用什么词找它（长文不必逐字读）。
2. 产出**单行** YAML flow 数组 `keywords: ["...", "...", ...]`，覆盖五类词：
   - **核心**：标题的核心点 + 最有辨识度的几个小节主题
   - **同义 / 可完全替换**：内裤↔内衣↔底裤↔underwear；宫保鸡丁↔宫爆鸡丁
   - **强关联**（非严格同义，但读者会拿来搜）：内裤文 → 棉/化纤/化学纤维/私处卫生/细菌/经期
   - **对应英文**：报税→tax return/1040NR；主成分分析→PCA；水垢→limescale
   - **常见错别字** 1–3 个，仅当真实可能误打时（主城分分析、瓶状水）；不硬造
3. 用 Edit **替换**已有的 `keywords:` 整行（幂等）。

## 约束

- 数量：散文/科普 14–26 条；菜谱 12–20 条
- 每条短：中文 ≤ ~12 字，英文 ≤ 3 词
- **只放相关词**：不要泛词填充（方法/问题/原理/总结/技巧/参考/科普/做法/美食），也不要会误伤其它文章的宽词
- 去重（不分大小写）；无 emoji；ASCII 双引号；词内不得出现 `"`；整体合法单行 YAML

## 放置规则

- **普通散文/科普文**（new-post 生成的）：`keywords:` 放 front-matter 内（紧跟 `title:` 一行之后即可）。已有就替换。
- **个人长文 / 生命故事 / 随笔**：已手工精修过的 keywords **保留**，只在其后**补**同义/英文/错字，别删原有的；保持克制。
- **菜谱**（`layout: recipe`，`_notes/life/recipes/`）：在 `title:` 行**正下方新增** `keywords:` 行，**绝不改 `tags:`**。内容＝菜名+别名、食材同义（番茄/西红柿、土豆/马铃薯）、英文菜名/食材、家常菜/下饭菜/快手菜等贴切的关联词。
- 学习资料 PDF（有 `pdf_url:`、正文为空）：不需要，靠课程名 + `_data/course_aliases.yml`。

## 校准基准（对齐这个密度与相关度）

《内裤多久换一条？棉 vs 化纤到底差在哪？》：

```
keywords: ["内裤多久换一条", "内裤更换频率", "内裤多久换新", "内衣", "底裤", "三角裤", "平角裤", "underwear", "棉质内裤", "化纤内裤", "化学纤维", "莫代尔 Modal", "Tencel 天丝", "竹纤维内裤", "私处卫生", "阴部健康", "细菌滋生", "内裤怎么洗", "内裤寿命", "经期内裤", "内裤误区"]
```

宫保鸡丁：`["宫保鸡丁", "宫爆鸡丁", "kung pao chicken", "鸡丁", "鸡胸肉", "chicken", "花生", "peanut", "川菜", "下饭菜", "家常菜", "快手菜", "辣", "宫保鸡定"]`

## 收尾校验

改完跑一次，确认 front-matter 仍是合法 YAML（一条坏行会让那页或构建出问题）：

```bash
python3 -c "import sys,yaml; t=open(sys.argv[1],encoding='utf-8').read(); yaml.safe_load(t.split('---')[1]); print('YAML OK')" <file>
```
随后照常 `/fix-quotes` + commit（如果是 new-post / recipe 流程的一环，就并入它们那次 commit，不单独提交）。

## 与发布流程的衔接

- `new-post`、`recipe` 在“写完后”的 commit **之前**必须执行本方法（已写入两个 skill 的步骤）。
- 单独被调用时：定位目标文章 → 执行上面「方法」→ 校验 → `/fix-quotes` → `git add/commit/push`。
- 批量补旧文可参考一次性脚本 `scripts/seed_keywords.py`（只做机械抽取打底，**不要拿它覆盖已语义增强过的 keywords**——全站 84 散文 + 32 菜谱已于 2026-05 手工增强过）。
