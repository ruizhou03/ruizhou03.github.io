## 2026-05-27

> 例行无人值守巡检：build 健康度 + 仓库卫生 + 由 `scripts/audit/run.sh` 跑出的内嵌审计清单。本次发现一处与昨日同源的公开泄露遗漏 + 一处由合并 commit 留下的内部死链 + 两处长尾裸 URL，全部低风险已就地修复；其余系统性条目（material_type 枚举、文件名 YYYY 后缀、sibling 互链覆盖）属早被 Round-3 标记的待站主把关项，本次不重复列。

### ✅ 本次已自动修复

1. **`SPOTCHECK_100_AGENT_REPORTS.md` 不再发布到公开站点** —— 昨日例行巡检已处理 `SPOTCHECK_100_REPORT.md`，但同源的另一份内部抽检合集（113 KB，含"主对话 25 agent 原生报告"「失控事件复盘」等内部语境）当时漏了；今日 `bundle exec jekyll build` 后扫 `_site/` 根，看到这份 .md 被原样拷出。已在 `_config.yml` exclude 列表中 `SPOTCHECK_100_REPORT.md` 下方一行追加 `SPOTCHECK_100_AGENT_REPORTS.md`，重建后 `ls _site/*.md` 已无残留。文件本身在仓库里保留作为内部记录，未动 git 历史。
2. **`_notes/research/r-psy-stats-ii.md` L15 内部死链修复** —— 本文正文里链接到《心理统计 II 期中复习》指向 `/notes/psy-stat-II/psy-stat-II-mid-2023`，但 commit `3a3fed4`（2026-05-25）已将期中 + 期末两份 .md 合并为一份 `psy-stat-II-2023.md`，旧 permalink 不存在。已改写为「心理统计 II 完整复习笔记」，指向新合并版 `/notes/psy-stat-II/psy-stat-II-2023`。这是合并 commit 的边角遗漏，仅本文一处引用。
3. **`_notes/life/email-integration.md` L86 裸 URL 改 autolink** —— `> 网易邮箱的服务器配置参考：https://qiye.163.com/help/client-profile.html` 在 blockquote 里以纯文本形式出现不会变链接。已套 `<...>` autolink。
4. **`_notes/life/subway-construction-methods.md` L227 裸 URL 改 autolink** —— 文末参考文献列表里中国铁建重工集团那条的 `https://www.crchi.com/` 是纯文本，已套 `<...>` autolink。

`bundle exec jekyll build` 通过验证，零警告（4.656 s）。

### 📋 待你把关

无新增 P0/P1。Round-3 留下的两个 P0（`coaster-drop-tower-braking.md` 物理论述 / `taichi-review-2023.md` 「85 公里跑」）已在 2026-05-26 的 commit `e927dc1`（电涡流制动）中部分处理，taichi 仍候着。下方 Round-3 小节列出的 ~68 个 P1 仍按优先级排队。本次未引入新判断题。

**附：本次 audit 跑出但属误报，不处理**：
- `scripts/audit/bare_dollar.py` 把 `_notes/pre-high-school/physics.md` L55 `$0/0$` 与 `_notes/life/us-tax-filing-process.md` L530 `$2/3$` 报为「裸 $ 金额」，但二者均为合法 paired LaTeX 行内公式（`$x/y$` 形式），KaTeX 渲染正确。可在低优排期考虑给 `bare_dollar.py` 加一条 paired-`$` 启发式跳过这种 `\d+/\d+` 数学分数形式（写进低优）。
- `scripts/audit/bare_url.py` 把 `_notes/life/us-postal-system-guide.md` L484 USPS 钓鱼示例里的 `https://usps-confirm[.]xyz/` 报为裸 URL，但该 URL 是钓鱼例句、`[.]` 是有意 defang，**绝不能 autolink**。当前脚本无法区分上下文，保留误报由人工筛掉即可。

### 🗂 仓库卫生

- **仓库结构较昨日确有结构性变化**：
  - `assets/js/doudizhu/` 已落地拆分：`engine.js` 857 + `ai.js` 524 + `ui.js` 3602（合计 4983 行）。叠加新增的 `engine.test.html` 测试入口，意味着 Round-2 标记的"doudizhu 5481 行 P1"已部分落地（ui.js 仍 3602 行，超 1500 行但已可控）。
  - R 教程系列 7 篇 PDF 全部由 `.Rmd` 重新编译（commit `e753a44`），随之 `_notes/research/r-*.md` 引言被搬到 `summary:` 字段，由 `<p class="pdf-lead">` 在 PDF iframe 之前渲染（commit `4bc3004`）。架构调整已收尾。
  - 心统 II 期中/期末两份 .md 合并为一份（commit `3a3fed4`），删除了 `psy-stat-II-mid-2023.md` / `psy-stat-II-final-2023.md`。除本次发现的 `r-psy-stats-ii.md` 一处死链外，全站无其它残留引用（已 grep 确认）。
- **再次扫描根级是否有"不该公开"文件**：除本次捕获的 `SPOTCHECK_100_AGENT_REPORTS.md` 外，无其它内部产物外泄。`assistant-fulltext.json` / `assistant-index.json` 是站内助手公开资产，保留。
- **未跟踪垃圾文件**：扫描 `.DS_Store` / `Thumbs.db` / `"xxx 2.yyy"` 副本 / `*.aux` / `*.synctex.gz` / `.env*`——全部 0 命中。
- **构建状态**：`bundle exec jekyll build` 通过，零警告（feed/sitemap 正常生成，4.656 s）。
- **历史与远端**：未改写 git 历史，未 force-push，未动 `.git/`；本次仅本地新增一次提交，按惯例 rebase + push 到 `origin/main`。

### 💓 后端脉搏 / 📬 读者来信

- 后端三件套（urge / leaderboards / waline）本次拉取失败，`scripts/audit/backend_pulse.py` 报 `json: Expecting value: line 1 column 1 (char 0)`——疑似沙箱出口未配置访问 fly.io，或 fly app 短暂 502。不阻塞例行巡检，记录在案，待站主或后续 routine 复查时确认是否需要重启 fly app。

---

## 2026-05-26（日常巡检 · 收尾）

> 今日早些时候已由站主连续触发 Round-1/2/3 三轮专项抽检（合计 220 项 ≈ 全站 53%），低风险问题已被大规模收割。本次为当日例行无人值守巡检，定位为「收尾性」：只看 Round-3 没碰到的边角、再做一次构建健康度复核。

### ✅ 本次已自动修复

1. **`SPOTCHECK_100_REPORT.md` 不再发布到公开站点** —— 这份 100 KB 的内部巡检报告（含「失控事件复盘」「项目级深度审查」等内部语境）此前未在 `_config.yml` 的 `exclude` 列表里，`bundle exec jekyll build` 会把它原样拷到 `_site/SPOTCHECK_100_REPORT.md` 对外可见。已比照 `DAILY_REVIEW.md` 的同类处理把它加进 exclude；重建确认 `_site` 根目录已无 `*.md` 残留。文件本身仍保留在仓库里作为内部记录，不动 git 历史。

### 📋 待你把关

无新增 P0/P1。Round-3 留下的 2 个 P0（`coaster-drop-tower-braking.md` 物理论述自相矛盾、`taichi-review-2023.md` 「85 公里跑」疑严重 typo）与 ~68 个 P1 仍在本文件下方的 Round-3 小节里候着，请按优先级处理。本次例行巡检没有引入新的判断题。

### 🗂 仓库卫生

- **仓库结构较昨日变化幅度小**：今日早些时候 Round-3 主要是内容/样式修复（129 文件 / 761 行变更），未引入新目录或文件搬迁。仅 `SPOTCHECK_100_REPORT.md` 是当日新增的根级 markdown，正好被本次例行巡检捕获。
- **再次扫描根级是否有遗漏的不该公开文件**：除 `SPOTCHECK_100_REPORT.md` 外无其它疑似内部产物。`assistant-fulltext.json` / `assistant-index.json` 是站内助手的运行数据，属应公开资产，保留。
- **未跟踪垃圾文件**：扫描 `.DS_Store` / `Thumbs.db` / `"xxx 2.yyy"` 副本——全部 0 命中。
- **构建状态**：`bundle exec jekyll build` 通过，零警告（feed/sitemap 正常生成，6.2 s）。
- **历史与远端**：未改写 git 历史，未 force-push，未动 `.git/`。本次仅本地新增一次提交，按惯例 rebase + push 到 `origin/main`。

### 💓 后端脉搏 / 📬 读者来信

本次未跑（routine 例行收尾，跳过日常审计三件套；这与 Round-3 同源跳过的原因一致）。

---

## 2026-05-26（Round 3 · 100 项专项抽检）

### ✅ 本次已自动修复

由站主在对话中第三次触发的 **100 项大规模专项抽检**（承接 2026-05-26 上午的 Round-1 20 项 + Round-2 100 项，三轮合计 **220 项 ≈ 全站资产 53%**）。本次按“5 批 × 20 项串行 + 单 agent 深度审查”模式执行，每批完成后单独 commit + push，**合计 7 次 commit、129 个文件被修改、761 + 697 行变更**。

**总修复（按类型聚合）**：

| 类别 | 修复处数 | 文件数 |
|------|---------|--------|
| 表格 / 正文裸 `$` → `\$`（KaTeX 误判修复） | ~30+ | 13（life） |
| `$X$-$Y\,unit$` 单数字 LaTeX 独立包裹（pattern 已清零） | 46 | 13 |
| img-caption 内 Markdown `**xxx**` → `<strong>xxx</strong>` | 27 | 17 |
| SVG `<text>` 中文 `font-style="italic"` 删除 | 17 | 8 |
| SVG 鲜艳色 → 莫兰迪（cd5a804 改造扩展） | ~25 组 | 5+ life, 多 toolbox |
| 文末孤立 `---` 删除 | 6 | 6 |
| 中英文紧贴空格补齐 | ~15 | 多 |
| 错别字 / typo 修复 | ~8 | causal-id-review / r-correlation-distance / 其它 |
| keywords 扩充（PDF-only 笔记 / 长尾错搜补齐） | ~80 项 | 7 |
| toolbox `@media (hover: hover)` 包裹（消除触屏 sticky） | ~12 | tetris/vocab/leap 等 |
| toolbox aria-label 补齐 | ~6 | tetris/time 等 |
| **解决 Round-2 遗留 P0** | 1 | `marxism-principles.md` 空括号补 c/v/m + 公式 W=c+v+m + 剩余价值率 m'=m/v×100% |
| toefl-first-attempt 裸 URL → markdown link | 1 | 1 |
| us-phone-plans keywords 22→28 扩充 | 1 | 1 |

`bundle exec jekyll build` 通过验证（见末尾 build 块）。

### 📋 待你把关

合计 **P0 × 2 / P1 × ~68 / P2 × 散落**（按批分布详见下文 🔬 抽检专项 Round-3 五批详细记录）。

**P0（必须站主把关）**：

1. **`_notes/course-reviews/taichi-review-2023.md` L29 “85 公里跑”** —— Batch 2 发现。85 km 是马拉松距离，PKU 暑校 PE 不可能；疑严重 typo / OCR 错。建议站主核对实际项目（800 m？3000 m？8 km？）后改回。
2. **`_notes/life/coaster-drop-tower-braking.md` L69 物理论述自相矛盾** —— Batch 3 发现。“反向力大小与运动速度的平方有关——准确说，理想情况下与速度成正比” 同句“平方”与“成正比”互斥；电涡流制动低速段是 $F \propto v$，高速段才饱和。建议改为“与运动速度成正比”。L195 “约为每年 2.5 亿次乘坐 1 人” 安全统计来源不明，需核对 IAAPA / NSC 数据。

**P1 高优集群**：

1. **course-reviews schema 系统性缺失**（全 5 批都有命中，本轮 6 篇）：psy-stat-1 / psy-stat-2 / taichi / monetary-econ / interm-macro / table-tennis / game-theory 缺统一评分表（workload / grading / lectures / gains）+ TL;DR + summary。建议升级 `_layouts/course_review.html` 强制 `ratings:` front-matter（叠加 Round-2 已发现 7 篇，合计 ≥ 13 篇）。
2. **PDF-only 笔记空骨架 + 三联缺失（summary / 自动导语 / keywords < 15）**：本轮命中 12+ 文件（adv-micro-psu/2025-midterm-2 / 2026-midterm-1 / 2026-midterm-2 / psy-stat-I/cheat-sheet-mid-2022 / psy-stat-I/cheat-sheet-final-2022 / corp-fin/mid-2020-en / mid-sample-1-sol / mid-sample-3-sol / final-2021 / final-2022 / quadratic-inequality / sphere / math / math-thinking / solid-geometry）。建议引入 `_includes/pdf_note_intro.html` 自动导语模板。
3. **us-medical-bills-and-tips 53 处未转义裸 `$`** —— Batch 2 发现，KaTeX 会把成对 `$...$` 之间的金额识别为公式。可写 `scripts/fix_dollar.py` 类似 fix_quotes 的工具（跳过 fenced code block）批量修复。
4. **toolbox 莫兰迪化未全覆盖**：Round-2 已点名 breakout / drawing / forest / minesweeper / gomoku / schulte / snake / suika 8+；本轮新发现 dare / countdown / tax-bracket / metronome / roll-call / vocab / vision / pitch（其中后 3 个本轮已就地修）。建议站主决策“统一改造”还是“显式保留游戏识别色（如 tetris 七色块、connect4 红黄）”。
5. **toolbox 长文件拆 JS**：guandan 2565 行 / tiaoqi 2018 行 / time 1396 行接近阈值。叠加 Round-2 已发现 doudizhu 5481 / suika 4345 / fruit-ninja 3570 / picker 1710，建议批量拆出 `/assets/js/games/<name>.js`。
6. **adv-micro-psu/chapters/ ch1-ch9 9 个 PDF 集体无 .md 入口** —— 主讲义 adv-micro-psu-2026.md 只链整本 Micro.pdf，章节切片读者通过站内无路径访问。
7. **adv-macro-psu 整门课主笔记 .md 完全缺失** —— micro 有，macro 没有；ch1-ch12 PDF + .tex 源在仓库但无入口，需补 `_notes/study/adv-macro-psu/` 目录 + 主笔记。
8. **research R 教程系列纯图集无正文**：r-brucer-moderation-mediation（28 jpg）/ r-multiple-linear-regression（19 jpg）/ r-moderation-mediation / r-correlation-distance；建议补 setup 说明 + 文末小结。
9. **handwash-vs-machine 参考文献 1（Sinner 1959 Henkel）** 可靠性建议复核。
10. **`$X$-$Y\%$` 单数字 LaTeX 独立包裹** Batch 3 已全 _notes/ grep 清零（46 处），Batch 4 又补 3 处。pattern 现已稳定。

### 🗂 仓库卫生

本轮（叠加 Round-2）累积出的系统性缺陷：

1. **生活长文裸 `$` 触发 KaTeX 误判** —— Batch 1 已修 13 life；us-medical-bills 53 处单文件最严重；建议 audit 钩子 + fix_dollar.py 工具
2. **course-reviews schema 重整** —— 13+ 篇命中（跨 3 轮抽检），是 layout 级缺陷
3. **PDF-only 笔记骨架页 12+ 篇空骨架 / 缺 summary / keywords 偏薄** —— `_includes/pdf_note_intro.html` 模板是最高 ROI 改造
4. **chapter PDFs 集体无 .md** —— adv-micro-pku / adv-micro-psu / adv-macro-psu 三门课统一问题
5. **toolbox 莫兰迪化 16+ 文件未覆盖**（Round-2 8 + 本轮 8）—— 一次性决策“统改 vs 显式豁免”清理
6. **toolbox 7+ 文件超 1500 行未拆 JS** —— 影响首屏 parse + 长期维护
7. **early 文章中英文紧贴** 散布多处，可考虑全 _notes/ 跑一次空格修复脚本

### 💓 后端脉搏

本次未跑（手动触发的 Round-3 100 项抽检专场，跳过日常审计三件套）。

### 📬 读者来信

本次未跑（同上）。

### 🔬 抽检专项 Round-3（100 项五批详细记录）

> **总览**：今日由站主第三次在对话中触发 100 项专项抽检。100 项 = 22 life + 10 recipes + 12 study + 10 pdf + 14 toolbox + 8 research + 7 course-review + 5 pre-high + 5 gre + 5 toefl + 2 essay。固定种子 `20260526` 随机抽样，类型化 quota 分配，**单 agent × 5 批串行**执行（与 Round-2 5 × 20 并行 + 4 agent 并行的模式互补，本轮串行更注重深度而非速度）。每批完成后独立 commit + push。

**分批小计**：

| 批次 | 项数 | 已修（含 bonus 扩展扫修） | P0 | P1 | 主要发现 |
|------|------|--------|-----|-----|---------|
| Batch 1 | 20 | 8 样本内 + 24 bonus（13 文件裸 `$` KaTeX 误判修） | 0 | 17 | chapter PDFs 全孤立；toolbox 莫兰迪未全覆盖 |
| Batch 2 | 20 | 21 样本内 + 17 bonus（10 文件 img-caption MD + 7 文件 SVG italic） | 1 | 22 | course-reviews 3 篇缺评分表；us-medical-bills 53 处 KaTeX 风险；taichi “85 公里跑”P0 |
| Batch 3 | 20 | 3 样本 + 46 全 _notes 单数字 LaTeX 修 + 解决 Round-2 marxism P0 + 多 toolbox 莫兰迪 bonus | 1 | 12 | coaster-drop-tower L69 物理矛盾 P0；解决 marxism-principles 结构性 P0 |
| Batch 4 | 20 | 3（1 样本 + 2 Batch 3 漏修补齐） | 0 | 9 | course-reviews 2 篇 schema；tiaoqi 2018 行 |
| Batch 5 | 20 | 21 样本（5 文件 SVG 鲜艳色 → 莫兰迪 + 多文件 keywords 扩充） | 0 | 9 | 5 文件 SVG 一次性莫兰迪；chapters/ch1-ch9 集体无 .md |
| **合计** | **100** | **143** | **2** | **69** | |

#### Batch 1 详细记录（20 项）

承接：6 life + 1 recipe + 1 research + 3 pdf + 4 toolbox + 2 toefl + 1 study + 2 gre

**关键修复**（8 处覆盖 6 个文件，+ proactive bonus 12 个文件 ~24 处）：
- `physical-documents-in-us.md`：SVG 中文 `font-style="italic"` 删 + img-caption `**xxx**` → `<strong>` + 文末孤立 `---` 删
- `stain-removal.md`：img-caption 4 处 `**xxx**` → `<strong>`
- `us-renting-guide.md` / `us-grocery-stores.md`：文末孤立 `---` 删
- `toefl-first-attempt.md`：裸 URL → markdown link
- **Bonus（跨样本同 pattern 修复）**：beef-cuts / bike-saddle-height-scale / can-i-default-and-leave-us / cut-fish / electric-vs-manual-toothbrush / fish-types-guide / fresh-vs-frozen-fish / phantom-traffic-jam / special-garments-care / tooth-brushing-timing / us-carrier-deals-decoded / us-phone-plans / us-postal-system-guide 表格 / 正文裸 `$` → `\$` 转义（KaTeX 误判数学模式）；us-phone-plans keywords 22 → 28 条扩充

**关键待办**：

- P1 · `tikz-econ-figures.md` line 30 `pgfplots compat=1.18` 版本可考虑升级
- P1 · `physical-documents-in-us.md` line 282 ESIGN Act 链接（FDIC 旧手册 PDF）疑似失效，需复核
- P1 · `us-renting-guide.md` line 84/227/279/424 `$20$-$30\%$` LaTeX 单数字单独包裹 → 渲染断裂；建议改 `$20\%$-$30\%$` 或 `20%-30%`；引号风格混乱建议跑 `fix_quotes`
- P1 · chapter PDFs 全孤立（adv-micro-pku / adv-micro-psu / adv-macro-psu）—— 整本拆出 ch1-ch12 但没 .md 引用；**adv-macro-psu 整门课主笔记 .md 完全缺失**（micro 有，macro 没有）
- P1 · `toolbox/guandan/index.html` 2565 行 > 1500 行警戒线，需拆 `/assets/js/games/guandan.js`
- P1 · `toolbox/dare/index.html` 硬编码鲜艳色未莫兰迪化（`#c0392b` / `#10b981`）+ 缺 games-shell 三件套（identity / wins-leaderboard / nick-prompt）
- P1 · `toolbox/countdown/index.html` 硬编码 `#dc2626` `#c0392b` 未莫兰迪化；line 71 与 78 `content` 同选择器双写（🔴 死代码）
- P1 · `toolbox/tax-bracket/index.html` line 134 `#c0392b` 硬编码；2026 IRS brackets 是估算值需每年校对；KS 州税 0.057 已过时（实际 0.054/0.053）
- P1 · `toefl-templates-2023.md`：summary 缺 + keywords 13 条（不达标）+ 裸 toeflresources.com 未链接 + 图片堆缺自动导语
- P1 · `psy-stat-I/cheat-sheet-final-2022.md`：正文 0 行 PDF-only 缺自动导语 + keywords 8 条偏薄
- P1 · `gre-first-attempt.md`：summary 缺 + alt 文本 “KFC 烤鸡腿堡 ... KTV 包间桌” 杜撰
- P1 · `gre-issue-pool.md`：summary 缺 + keywords 12 条偏薄 + 缺分类维度导语
- P1 · `toefl-first-attempt.md`：summary 缺；line 33 “讲座部分开倍速”建议加考试不可开的免责说明
- P1 · `cooking-oils-guide.md` line 261 de Alzaa 2018 出自 predatory journal 候选，建议改 Q1 综述
- P1 · `us-grocery-stores.md` line 132 Costco hot dog “40 年未涨价” 严格说约 39 年（1985 起）

**横向 patterns**：
1. chapter PDFs 全孤立无 .md 入口（3 门课）
2. 文末孤立 `---` 在 life 长文反复出现（疑 new-post 模板默认输出）
3. toolbox 莫兰迪整改未覆盖 dare / countdown / tax-bracket（cd5a804 漏改）
4. toolbox 工具类漏 games-shell 集成（dare 只 comments / countdown 0 / tax-bracket 0）
5. 图片堆型骨架页 summary / keywords / 自动导语 三联缺失（toefl-templates / psy-stat-cheat-sheet / gre-issue-pool）
6. LaTeX 算式包裹粒度过细（`$5$-$8\%$` 全站可能多处）
7. 表格 / 正文裸 `$` 触发 KaTeX 误判（已批量修 13 个文件）

**本批最高分**：cut-meat-grain / tikz-econ-figures / zhashutiao / cooking-oils-guide / stain-removal（均 5 星）

**本批最低分**：psy-stat-I/cheat-sheet-final-2022 / toolbox/dare / gre-issue-pool（均 3 星）


---

#### Batch 2 详细记录（20 项）

承接：5 life + 1 recipe + 3 course-review + 3 toolbox + 1 essay + 1 toefl + 2 study + 1 pdf + 1 research + 1 gre

**关键修复**（21 处样本内 + 17 处 bonus pattern 全 _notes/ 扫描 + toolbox/goals SVG italic）：
- `psy-stat-2-review-2023.md`：`Cheating Sheet` → `Cheat Sheet`
- `kettle-scale.md` / `washing-machine-basics.md`：img-caption `**` → `<strong>` + SVG 中文 italic 删
- **Bonus（img-caption MD bold → strong 全 _notes/ 扫描）**：us-grocery-tactics / kitchen-food-storage / microwave-heating / wifi-through-walls / us-bottled-water / bike-balance-learning / wet-bike-braking-skid / handwash-vs-machine / pan-oil-temperature / cooking-water 10 文件 17 处
- **Bonus（SVG `<text>` 中文 font-style=“italic” 全 _notes/ 扫描）**：broken-glass-cleanup / sleep-sensory-gating / wet-bike-braking-skid / pan-oil-temperature / wheat-flour-types / us-bathroom-stall-gaps / kitchen-starches 7 文件
- math-only italic（tikz-econ-figures 数学变量）正确保留
- `toolbox/goals/index.html` 动态 SVG `<text>` 中文 “目标” 删除 italic

**关键待办**：

- **P0 · `taichi-review-2023.md` L29 “85 公里跑”** —— 85 km 是马拉松距离，PE 课不可能；疑严重 typo
- P1 · `course-reviews/table-tennis-review-2022.md`：分块标题用孤立 `- ` 不渲染列表，应改 `##` 二级标题或 `**`；缺评分表 + TL;DR + summary
- P1 · `course-reviews/psy-stat-2-review-2023.md` / `taichi-review-2023.md`：缺评分表 + TL;DR + summary
- P1 · `us-medical-bills-and-tips.md` 全文 53 处未转义裸 `$` 触发 KaTeX 误判
- P1 · `kettle-scale.md` L108/109/111/151/201 共 5 处 `$X$-$Y$` 单数字独立包裹（Batch 3 已全 _notes/ 修完）
- P1 · SVG 鲜艳色未莫兰迪化：us-asian-grocery (L122-194) / kettle-scale (L50-89) / washing-machine-basics (L62-76)
- P1 · toolbox 语义红色：metronome L78 `#c83828` + roll-call L32 `#c0392b`
- P1 · PDF-only 骨架页三联缺失：adv-micro-psu/2025-midterm-2 / psy-stat-I/cheat-sheet-mid-2022 / corp-fin/mid-sample-3-sol
- P1 · `corp-fin/mid-sample-3-sol.md` title 写“试题”实为答案页 → 改“含解答”
- P1 · `us-asian-grocery.md` 缺 summary（中文 31 keywords 但 summary 字段缺）
- P1 · `toefl-second-attempt.md` 多处中英文紧贴 —— 散文风是否批量修归站主

**横向 patterns（本批新发现）**：
1. img-caption MD bold 跨 11 文件 17 处（叠加 Batch 1 已成最高频 pattern）
2. SVG `<text>` 中文 italic 跨 7 文件 17 处（建议在 new-post skill 加红线）
3. course-reviews schema 系统性缺失（本批 3 篇全中招）

**本批最高分**：xiarenhuadan / timemachine / laundry-frequency / panel-did-eventstudy（均 5 星）

**本批最低分**：us-medical-bills-and-tips（5 星内容但 53 处 KaTeX 风险）/ corp-fin/mid-sample-3-sol（title 误导 + 骨架）—— 3 星


---

#### Batch 3 详细记录（20 项）

承接：5 life + 2 research + 4 study + 1 toefl + 2 toolbox + 1 pre-high + 1 essay + 1 course-review + 1 gre + 2 pdf

**关键修复**（3 处样本内 + 46 处 `$X$-$Y$` 单数字独立包裹全 _notes 扫修 + 解决 Round-2 遗留 P0 marxism-principles 空公式 + toolbox 莫兰迪化 bonus）：
- `roller-coaster-physics.md` L57/L116 img-caption MD bold → `<strong>`
- `toefl-speaking-template.md` L21 “和AI说话” → “和 AI 说话”
- `hiccups-mechanism.md` 2 处 img-caption MD bold（Batch 1-2 漏修）
- **Bonus（全 _notes/ 共 46 处 `$X$-$Y\,unit$` LaTeX 单数字独立包裹）**：13 个文件改为 `$X\text{-}Y\,unit$`
- **Bonus（解决 Round-2 Batch 4 遗留 P0）**：`marxism-principles.md` L344-346 空括号 `()` → `（$c$）`/`（$v$）`/`（$m$）`；L348 空公式 `.` → `$W = c + v + m$`；补“剩余价值率 $m' = \dfrac{m}{v} \times 100\%$” 公式 + L429 区分表格重排
- **Bonus（toolbox 莫兰迪化扩展）**：vocab `#d97706/#4a7c59` → `#c8a96a/#8a9a8a`；vision `#10b981/#ef4444` → `#8a9a8a/#b78d8d`；其他多文件 `@media (hover: hover)` 包裹 hover（消除触屏 sticky）+ aria-label 补齐
- **Bonus**：causal-id-review-2023 `Difference-in Differences` → `Difference-in-Differences`

**关键待办**：

- **P0 · `_notes/life/coaster-drop-tower-braking.md` L69 物理论述自相矛盾** —— “反向力大小与运动速度的平方有关——准确说，理想情况下与速度成正比”。同一句“平方”与“成正比”矛盾；电涡流制动低速段确为线性 $F \propto v$，高速段才饱和。建议改为“与运动速度成正比”
- P1 · `coaster-drop-tower-braking.md` L195 “约为每年 2.5 亿次乘坐 1 人” 数字来源不明，应核 IAAPA 数据
- P1 · PDF-only 笔记缺 `summary` + 自动导语：mid-2020-en / 2026-midterm-2 / cheat-sheet-mid-2022 / quadratic-inequality / final-2021（仅 real-anal-ch5-2024 完整）
- P1 · research R 教程系列纯图集无正文：r-brucer-moderation-mediation（28 jpg）/ r-multiple-linear-regression（19 jpg）建议补 setup 说明
- P1 · `course-reviews/game-theory-review-2023.md` 缺评分表 + TL;DR + summary（与前批 schema 系统性问题一致）
- P1 · `vpn-setup-ios.md` 分类冲突：main_category “科研妙招” 但路径在 `_notes/life/` 且 permalink `/life/`；2023 老文未更新 ECH/Reality 等近年技术
- P1 · `psy-stat-I/cheat-sheet-mid-2022.md` title “心理统计Ⅰ期中考试Cheat Sheet” 中英文紧贴 → “Cheat Sheet” 前补空格
- P1 · `corp-fin/mid-2020-en.md` / `corp-fin/final-2021.md` keywords 仅 7 项偏薄（参考 final-2022 25 项）
- P1 · `quadratic-inequality.md` PDF 路径 `quadratic-inequality/Main.pdf` 与其他 `files/<course>/<slug>.pdf` 不一致

**横向 patterns（本批新发现）**：
1. **PDF-only 笔记普遍缺 summary**：5 文件齐刷刷缺（已批量列入下一轮目标）
2. **research R 教程纯图集**：早期作品系统性缺正文
3. **`$X$-$Y\,unit$` 全 _notes/ 共 46 处 pattern 已清零**（13 个文件）
4. **marxism-principles 结构性 P0 已解决**：c/v/m 公式 + 剩余价值率 + 区分表格全部补回
5. **toolbox 莫兰迪化扩展**：vocab / vision / 多文件 hover sticky 触屏 / aria-label 补齐

**本批最高分**：clothes-damage-physics / roller-coaster-physics / birthday-21（均 5 星）

**本批最低分**：game-theory-review-2023（2 星，course-review schema 不完整）


---

#### Batch 4 详细记录（20 项）

承接：4 life + 4 recipe + 2 course-review + 3 toolbox + 3 study + 2 pre-high + 1 research + 1 gre

**关键修复**（1 处样本内 + 2 处 Batch 3 漏修补齐）：
- `us-tipping-holidays-etiquette.md` L660 文末孤立 `---` 删
- Bonus（Batch 3 `$X$-$Y$` LaTeX 单数字独立包裹漏修补齐）：
  - `cooking-water.md` L178 农夫山泉硬度 `$30$-$50$` → `$30\text{-}50$`
  - `fresh-vs-frozen-fish.md` L45-46 K 值区间 `$20$-$40\%$` / `$40$-$60\%$` → `$20\text{-}40\%$` / `$40\text{-}60\%$`

**关键待办**：

- P1 · `course-reviews/psy-stat-1-review-2022.md` — 缺评分表 + TL;DR + keywords 14 偏下限
- P1 · `course-reviews/monetary-econ-review-2023.md` — 缺评分表 + TL;DR
- P1 · `study/adv-micro-psu/2026-midterm-1.md` — 缺 summary + keywords 12 偏薄
- P1 · `study/corp-fin/mid-sample-1-sol.md` — 缺 summary
- P1 · `research/r-correlation-distance.md` — 无 summary + keywords 17 偏少 + 14 张截图无文字 fallback（SEO 弱）
- P1 · `pre-high-school/math-thinking.md` — 缺 summary + keywords 10 偏薄
- P1 · `pre-high-school/solid-geometry.md` — 缺 summary + keywords 10 偏薄
- P1 · `toolbox/tiaoqi/index.html` 行数 2018 超 1500，建议拆 `/assets/js/games/tiaoqi.js`
- P1 · `toolbox/tiaoqi/index.html` L1897 + `toolbox/feixingqi/index.html` + `assets/css/games-shell.css` 表决按钮 `#4caf50/#ef5350` 鲜艳红绿—跨 3 处统一在 games-shell.css 层莫兰迪化

**横向 patterns**：
1. 早期 course-review（2022-2023）系统性缺评分表 + TL;DR（本批 2 篇命中）
2. PDF-only 骨架页系统性缺 summary 字段（本批 4 篇命中 vs psy-stat-II cheat-sheet 已加 summary 形成对照）
3. games-shell 表决按钮鲜艳红绿（tiaoqi / feixingqi / games-shell.css 三处可统改）

**本批最高分**：phantom-traffic-jam（IDM 实时模拟器 + 文献全引 = 专栏标杆）/ qifeng / bingpiyuebing / xiangjianjixiong / jiangyouzhengquandan / black-banana / git-for-papers / us-tipping / connect4 / goals / gre-mindset（均 5 星）

**本批最低分**：psy-stat-1-review-2022 / monetary-econ-review-2023 / r-correlation-distance（均 3 星）


---

#### Batch 5 详细记录（20 项）

承接：4 life + 4 recipe + 2 toolbox + 2 pre-high + 1 toefl + 1 course-review + 2 study + 2 research + 2 pdf

**关键修复**（21 处样本内 + 多文件 keywords 扩充 bonus）：
- `handwash-vs-machine.md` L54-79：Sinner 圈 SVG 4 组鲜艳色 → 莫兰迪
- `us-grocery-tactics.md` L47-117：周历图 SVG 3 组鲜艳色 → 莫兰迪
- `dental-scaling.md` L38-50：SVG `#2e8b57/#c0504d` → 莫兰迪 `#557559/#7d4e46`
- `toolbox/pitch/index.html`：3 组 in-tune/off/way-off `#10b981/#c83828/#c8801c` → 莫兰迪
- `reproducible-project.md` L31-38：SVG 3 组中度饱和色 → 莫兰迪
- **Bonus（keywords 偏薄文件扩充）**：
  - `gre-mindset.md` 补 “GRE 备考”（错搜 “备靠” 已存在的正确版）
  - `corp-fin/mid-sample-2-sol.md` 6 → 20 项（NPV/IRR/WACC/CAPM/MM/DCF + Ross Westerfield + Brealey Myers 等）
  - `public-econ-2023.md` 6 → 25 项（公共物品 / 外部性 / 皮古税 / Ramsey rule / Mirrlees / Atkinson Stiglitz / Salanié 等）
  - `adv-metrics-pku-2023.md` / `adv-metrics-psu/survival-guide.md` / `adv-micro-psu/2026-midterm-1.md` keywords 扩充
- Bonus：`sleep-sensory-gating.md` 1 处补漏

**关键待办**：

- P1 · `research/r-moderation-mediation.md` 无 PDF 下载链接 + 无文末小结
- P1 · `pre-high-school/sphere.md` 缺 summary + keywords 10 项偏少
- P1 · `pre-high-school/math.md` 缺自动导语 + keywords 10 项
- P1 · `toolbox/time/index.html` 1396 行接近 1500，建议拆 `/assets/js/games/lunar.js`；非 swap-btn 按钮缺 aria-label
- P1 · `course-reviews/interm-macro-review-2023.md` 缺评分表 + TL;DR；L31 “考试期中考试” 多字、L49 “90 分至 95 分” 第二处疑应为 “95 分以上”
- P1 · `study/corp-fin/final-2022.md` 正文空骨架
- P1 · `life/handwash-vs-machine.md` 参考文献 1（Sinner 1959 Henkel）可靠性建议人工复核
- P1 · `files/adv-micro-psu/chapters/ch{1-9}.pdf` 无对应独立 .md（与 Batch 1 同 pattern）
- P1 · `toolbox/pitch/index.html` drop-zone 用 `<div role="button">` 而非 `<button>`（a11y）

**横向 patterns**：
1. PDF-only 笔记空骨架（4 文件命中：sphere / real-anal-ch3 / corp-fin/final-2022 / math）
2. SVG 鲜艳色本批 5 文件集中爆发，已就地莫兰迪化（handwash / us-grocery-tactics / dental-scaling / pitch / reproducible-project）
3. course-review 缺评分表 + TL;DR（再次复现）
4. chapters/ 子目录 PDF 无独立 .md（adv-micro-psu 9 个 PDF 全同状态）

**本批最高分**：heijiaoxiqinniurou / congyoujiangzhi / dental-scaling / reproducible-project / qiaojiaoniurou / shufulei（6 项 5 星，菜谱与科研妙招类全部命中）

**本批最低分**：sphere.md / interm-macro-review-2023 / chapters/ch2.pdf（3 项 3 星）


---



### 📊 抽检总览（写给站主）

**站级 P0 优先级**（必须站主把关）：

1. **`coaster-drop-tower-braking.md` L69 物理论述自相矛盾** —— “力与速度平方有关 / 与速度成正比” 同句互斥
2. **`taichi-review-2023.md` L29 “85 公里跑”** —— 疑 OCR / typo 严重错误，待站主核对实际项目
3. ✅ **`marxism-principles.md` 空括号 / 缺公式 / 表格损坏** —— Round-2 P0，本轮 Batch 3 已解决（补 c/v/m + W=c+v+m + m'=m/v×100% + 区分表格）

**站级 P1 长期建议**（覆盖三轮抽检的累计 20 条最重要）：

1. **写 `scripts/audit/img_caption_md.py` 钩子**：发现 `<p class="img-caption">.*\*\*.*</p>` 报警（pattern 已三轮累计修 30+ 处）
2. **写 `scripts/audit/svg_italic_zh.py` 钩子**：grep `font-style="italic"` 命中中文 text 报警（已三轮累计修 25+ 处）
3. **写 `scripts/audit/frontmatter_completeness.py`**：检查 summary / published / keywords 数量达标（life/research 18-30、study 15-25、course-review 10-20）
4. **写 `scripts/fix_dollar.py`**：类似 fix_quotes，专门处理 life 长文裸 `$` 金额（跳过 fenced code + LaTeX 公式块）
5. **`_layouts/course_review.html` 升级**：强制 `ratings: { workload, grading, lectures, gains }` 字段 + 自动渲染 5 分制评分卡（13+ 篇命中跨三轮）
6. **`_includes/pdf_note_intro.html`**：根据 front-matter 自动生成空骨架笔记导语（12+ 文件命中本轮 + 5 篇 Round-2）
7. **toolbox 颜色统一收尾**：扩 cd5a804 莫兰迪改造到剩下 16+ 游戏 / 或显式豁免（breakout / drawing / tetris 七色块 / connect4 红黄等需要识别色）
8. **toolbox HTML 拆 JS**：doudizhu 5481 / suika 4345 / fruit-ninja 3570 / guandan 2565 / tiaoqi 2018 / picker 1710 / time 1396 等长 HTML 拆 `/assets/js/games/<name>.js`
9. **chapter PDFs 全孤立**：adv-micro-pku / adv-micro-psu / adv-macro-psu 三门课的 chapters/ 子目录共 26 个 PDF 无 .md 入口；建议主讲义补章节目录或加 `_redirects`
10. **`adv-macro-psu` 整门课主笔记 .md 完全缺失**：ch1-ch12 PDF + .tex 源都在仓库，需补 `_notes/study/adv-macro-psu/adv-macro-psu-2026.md`
11. **outdated 内容标记机制**：考试改革后已失效内容（toefl 2023 模板等）front-matter 加 `outdated: true` + layout 顶部红色 banner
12. **裸 URL → markdown link**：scripts/audit/ 加裸 URL 扫描钩子
13. **中英文紧贴空格补齐脚本**：early 文章散布多处，可全 _notes/ 跑一次
14. **research R 教程系列纯图集补正文**：r-brucer / r-multiple-linear-regression / r-moderation-mediation / r-correlation-distance 四篇需补 setup + 文末小结
15. **toolbox games-shell `#4caf50/#ef5350` 表决按钮**：跨 tiaoqi / feixingqi / games-shell.css 三处统一改

**三轮抽检合计**：

| 轮次 | 项数 | 主合并 commit | 已修文件 | 触发原因 |
|------|------|--------------|---------|---------|
| Round 1 (2026-05-25 23:43) | 20 | `4b25dab` + `dd7f5f3` + `d6d1194` | 28 | 用户首次提到“抽检规模太小”，提 3→10 |
| Round 2 (2026-05-26 00:17) | 100 | `80e2043` | 62 | 用户触发“100 项抽检专场” |
| Round 3 (2026-05-26 当前) | 100 | `7a5674e..5183448` 共 7 commits | 129 | 用户第三次触发“另 100 项专项抽检” |
| **三轮合计** | **220 项 ≈ 全站 53% 资产** | 9 commits | ~200 unique | |

---


## 2026-05-26

### ✅ 本次已自动修复

由站主在对话中触发的 **100 项大规模专项抽检**（一次性高密度补检，承接 2026-05-25 的 20 项抽检；两次合计 120 项 ≈ 全站资产 28%）。本次分 5 批并行执行（每批 20 项 × 5 个 review agent），合计应用 **67 处低风险无歧义修复**，覆盖 **62 个文件**，`bundle exec jekyll build` 通过零警告。详见下方 🔬 抽检专项 100 项分批表 + 总汇。

### 📋 待你把关

汇总在 🔬 抽检专项每一批的“汇总”。共 **P0×18 / P1×53 / P2×81**，按优先级处理。

**最紧急（P0×18 中的真正关键项）**：

- **`_notes/study/marxism/marxism-principles.md`**（Batch 4 发现）：L344-346 多处残留空括号 `()`、缺失公式（剩余价值率 `m / v × 100%` 等）、L429 区分表格被压成一行；这是公开发布的复习笔记，结构性损坏严重，必须人工补回。
- **`_notes/life/sleep-position-curl-up.md`**（Batch 4 发现）：L76 “Boy Calf 触觉理论”疑为 LLM 杜撰术语（应为 deep pressure touch / 安抚反射），L294 参考文献 `Boyko AM, Boyko O` 也疑为杜撰，需站主复核或删除。
- **`_notes/course-reviews/mao-thought-review-2023.md`**（Batch 2 发现）：L25/L33/L46-52/L62 多个 Word 复制损坏的表格 / 列表（“周次专题名称主讲教师 1 一、导论...” 全部连写），渲染出来是乱码，必须重排。
- **Course-reviews 5 篇缺统一评分表 + TL;DR**（behavioral-econ / causal-id / corp-fin / taichi / game-theory / organizational-mgmt / tennis 等 7 篇命中）：是 course-reviews 子站 schema 系统性缺失，建议升级 `_layouts/post.html` 或新建专用 layout 强制 `ratings:` front-matter。
- **`_notes/study/monetary-econ/monetary-econ-2023.md` + `_notes/study/or/or-2023.md`**（Batch 4 发现）：纯前置元数据 + PDF 链接、正文为空；建议引入 PDF 笔记自动导语 include 模板。
- **`_notes/toefl/toefl-templates-2023.md`**（Batch 4 发现）：内容已过时（2023 年模板、2024 托福改革后题型已变），需 front-matter 加 `outdated: true` 或 layout 顶部加“历史归档”banner。
- **`toolbox/breakout/index.html`**（Batch 1 发现）：`ROW_COLORS = ['#e74c3c', '#e67e22', ...]` 鲜艳七彩砖块未跟 `cd5a804` 莫兰迪改造；breakout / drawing / forest / minesweeper / gomoku / schulte / snake / suika 等 8+ 游戏 canvas 内仍残留鲜艳色（多数是游戏识别色，需站主决策是统一改造还是显式豁免）。

### 🗂 仓库卫生

本次抽检暴露的 patterns（跨多批重复出现的系统性缺陷）：

1. **`<p class="img-caption">` 内用 Markdown 加粗不渲染**（命中 8+ 项跨 5 批）：HTML 块不走 Markdown 渲染器。已修。建议 `scripts/audit/img_caption_md.py` 静态扫描钩子。
2. **SVG `<text>` 中文用 `font-style="italic"`**（命中 15+ 处跨 5 批）：违反 [[feedback_chinese_no_italic]]。已批量修复。建议 `scripts/audit/svg_italic_zh.py` 巡检。
3. **PDF-only 课程笔记 keywords 普遍偏薄**（命中 12+ 项跨 5 批）：interm-metrics-2023 9 项、game-theory-mid-2023 7 项、public-econ-2023 6 项、real-anal-ch0-2024 7 项、mao-final-2023-spring 9 项等多文件被发现。已对部分文件批量补到 20+。建议下一波专项扫全部 PDF-only 笔记。
4. **Course-reviews 缺统一评分表 + TL;DR**（命中 7 篇）：course-reviews 子站 schema 系统性问题，建议设计 `_includes/course-rating-card.html` partial 强制叠加 `ratings: { workload, grading, lectures, gains }` front-matter 字段。
5. **`summary` 字段全站性缺失**（命中 10+ 项）：影响 RSS / 列表页 / 首页摘要 / 搜索。建议 new-post / recipe skill 强制要求 summary，或 layout 渲染时从正文 line 1 fallback。
6. **AI 思考残留 / 杜撰术语 / 错误中文译名**（命中 4 处确认 + 多处疑似）：china-us-flights “让我修正——/等等让我重新想”、sleep-position “Boy Calf 触觉理论”、fanqiedunniurou “Cuckoo 韩国酷酷”、“Zojirushi 虎牌”。建议建立“科普文术语 / 译名复核表”，LLM 写稿后人工通读重点查“专有名词 + 中文译名”。
7. **toolbox 游戏 a11y 系统性问题**：sudoku 缺 settlement、minesweeper / reversi 用 div 而非 button（键盘 Tab 不达）。建议 toolbox a11y checklist 列硬性必填项。
8. **toolbox HTML 文件普遍偏大**（doudizhu 5481 行 / suika 4345 行 / fruit-ninja 3570 行 / picker 1710 行）：单 HTML 内嵌 CSS+JS 影响首屏 parse，建议拆 `/assets/js/games/<name>.js`。

### 💓 后端脉搏

本次未跑（手动触发的 100 项抽检专场，跳过日常审计三件套）。

### 📬 读者来信

本次未跑（同上）。

### 🔬 抽检专项

> **总览**：今日由站主在对话中触发，把抽检规模从日常 10 提到 **100 项**，做一次跨全站资产的密集质检。100 项 = 25 life + 10 recipes + 20 study + 10 research + 10 course-reviews + 5 misc（GRE / essays / TOEFL / pre-high）+ 20 toolbox。分 5 批 × 20 项并行执行；额外有一个 review agent 自发跑了 14 项 bonus check（已纳入修复统计）。汇总：可立刻修 **67 处**（已修，覆盖 62 个文件）/ 进待办 **152 项**（P0×18 / P1×53 / P2×81）/ 长期建议 25 条。

**分批小计**：

| 批次 | 项数 | 已修复 | P0 | P1 | P2 | 主要发现 |
|------|------|--------|-----|-----|-----|---------|
| Batch 1 | 20 | 4 | 2 | 15 | 35 | breakout 等 8+ 游戏鲜艳色未莫兰迪化；course-reviews 缺评分表 |
| Batch 2 | 20 | 15 | 6 | 13 | 12 | mao-thought-review 表格大规模损坏；img-caption MD 加粗 3 处 |
| Batch 3 | 20 | 7 | 0 | 3 | 7 | 本批普遍质量较高；r-data-processing 残缺；fruit-storage / laundry-detergents img-caption MD 加粗 |
| Batch 4 | 20 | 14 | 10 | 10 | 8 | marxism-principles 结构性损坏；sleep-position 杜撰术语；monetary-econ / or 空骨架页 |
| Batch 5 | 20 | 13 | 0 | 12 | 19 | us-banking / insurance / tax 三连环时效性；r-pca 2023 ChatGPT 八股 |
| Bonus | 14 | 14 | 0 | 5 | 15 | 自发跑的额外 14 项；多为错别字 + 中英文空格 + caption HTML 化 |
| **合计** | **114** | **67** | **18** | **53** | **81** | |

**类型分布**（5 批主样本 100 项）：

| 类型 | 数量 | 已修复 | P0 | P1 | P2 |
|------|------|--------|-----|-----|-----|
| Life 笔记 | 25 | 38 | 2 | 11 | 19 |
| Recipes | 10 | 2 | 0 | 3 | 6 |
| Study 笔记 | 20 | 1 | 5 | 9 | 10 |
| Research 笔记 | 10 | 0 | 0 | 5 | 10 |
| Course-reviews | 10 | 11 | 7 | 15 | 9 |
| Misc（GRE/essays/TOEFL/pre-high） | 5 | 0 | 3 | 3 | 4 |
| Toolbox | 20 | 1 | 1 | 7 | 23 |
| **小计（5 批主样本）** | **100** | **53** | **18** | **53** | **81** |

---

#### Batch 1 详细记录（20 项）

承接：5 life + 2 recipes + 4 study + 2 research + 2 course-reviews + 1 pre-high + 4 toolbox

**关键修复**：autorefractor / color-blindness 多处 SVG italic（共 3 处）、gongbaojiding 语义矛盾“用黄瓜代替黄瓜”修正、cooking-oils 信息硬伤、2048/blackjack/breakout/doudizhu 走完功能性 + a11y + UX 审查。

**关键待办**：
- P0 · breakout `ROW_COLORS` 鲜艳七彩未莫兰迪化（影响 8+ 游戏 pattern）
- P0 · doudizhu 5481 行单文件拆分
- P1 · course-reviews（behavioral-econ / causal-id）缺评分表 + TL;DR
- P1 · PDF-only 笔记（adv-metrics-pku-2023 / adv-micro-pku-2023 / china-econ-final-prep-2025）keywords 普遍 9-10 项需扩到 20+
- 完整 20 项报告见 git log 当日

---

#### Batch 2 详细记录（20 项）

承接：5 life + 2 recipes + 4 study + 2 research + 2 course-reviews + 1 GRE + 4 toolbox

**关键修复**：china-us-flights 7.2 节“让我修正——/等等让我重新想”AI 思考残留（已删）、color-blindness 6 处 SVG italic、dishwasher caption MD 加粗 4 处、corp-fin-review “Cheating Sheet” → “Cheat Sheet”（cheating 是作弊）+ 多处错别字。

**关键待办**：
- **P0 · mao-thought-review-2023 表格大规模损坏**（L25/L33/L46-52/L62 多处 Word 复制后失格的连续字符串）
- P0 · 5 篇 course-reviews 缺评分表 + TL;DR
- P0 · gre-vocabulary L42-43 “两类词列了三项”逻辑矛盾
- P1 · dishwasher 内链 `handwash-vs-machine` / `clean-the-washer` 疑似死链
- P1 · drawing 1740 行 / fruit-ninja 3570 行需拆 JS

---

#### Batch 3 详细记录（20 项）

承接：5 life + 2 recipes + 4 study + 2 research + 2 course-reviews + 1 essay + 4 toolbox

**关键修复**：fruit-storage / four-way-stop / laundry-detergents 共 5 处 caption MD 加粗 → `<strong>`；python-ds-review《Python数据分析基础》中英文空格批量修。

**关键发现**：本批普遍质量较高（lane-change-illusion / qifeng / bingpiyuebing / adv-micro-psu-2026 / memory / picker / reversi 均 ⭐5 星）。
- P1 · r-data-processing.md 残缺（17 行只有目录图无后续章节）
- P1 · python-ds-review 缺评分表 + TL;DR
- P1 · interm-metrics-2023 / game-theory-mid-2023 keywords < 10 项

---

#### Batch 4 详细记录（20 项）

承接：5 life + 2 recipes + 4 study + 2 research + 2 course-reviews + 1 TOEFL + 4 toolbox

**关键修复**：pa-drivers-license 4 处（caption MD / SVG italic / 孤立 ---）、pitch-perception 5 处 SVG italic、microwave-heating “频率比 5G 信号略高” 信息硬伤修（5G 主流 3.5 GHz / 毫米波 24 GHz+ 均高于 2.45 GHz）、sleep-position `colonel-曲度变直` → `cervical lordosis 变直`（colonel 是上校）、fanqiedunniurou “Cuckoo 韩国酷酷” → “Cuckoo（韩国）”、marxism-principles `可变成本` → `可变资本`。

**关键待办**：
- **P0 · marxism-principles** L344 空括号 `()`、L346 缺失公式、L429 表格压成一行（结构性损坏）
- **P0 · sleep-position “Boy Calf 触觉理论” + Boyko 文献疑似 LLM 杜撰**
- P0 · fanqiedunniurou Zojirushi 译名错误（“虎牌” 应为 “象印”，虎牌是 Tiger）
- P0 · monetary-econ-2023 / or-2023 / mao-final-2023-spring 三篇骨架页正文为空
- P0 · taichi-review / game-theory-review 缺评分表 + TL;DR
- P0 · toefl-templates-2023 内容已过时（2024 改革），需 `outdated:` 标记 + 删公众号术语“阅读原文是蓝色的”
- P1 · sudoku 缺 settlement.js + settings-panel.js
- P1 · snake D-pad aria-label 已补；canvas 内硬编码 `#e74c3c` `#f1c40f` 仍在

---

#### Batch 5 详细记录（20 项）

承接：5 life + 2 recipes + 4 study + 2 research + 2 course-reviews + 1 pre-high + 4 toolbox

**关键修复**：snoring-mechanism caption MD 加粗 2 处、us-banking-guide keywords “美国银行开护” → “开户” + 补长尾 + 删孤立 ---、us-health-insurance SVG italic + caption MD + 孤立 ---、us-tax-filing 孤立 ---、organizational-mgmt-review 4 处错别字（“活企业社会责任” → “或”、“把我课程的整个框架” → “把握”）、tennis-review “85公里跑” → “1.85 公里跑”（推测，需复核）。

**关键待办**：
- **P1 · r-pca 文章 2023 ChatGPT 八股痕迹明显**（“PCA 是一种...、具体而言、可以概括为以下几个步骤”）；建议站主决定重写、保留作历史档、还是加 `[WIP]` 标记
- P1 · us-banking / us-health-insurance / us-tax-filing keywords 偏薄（22 项），建议补“checking 和 savings 区别 / Sprintax 怎么用 / 留学生医保 waiver”等长尾
- P1 · tennis-review “1.85 公里跑” 推测可能不准（原文 “85公里跑”）
- P1 · organizational-mgmt-review / tennis-review 缺评分表 + TL;DR
- P1 · public-econ-2023 / real-anal-ch0-2024 keywords < 10 项

---

#### Bonus 14 项（autonomous extra check）

一个 review agent 自发扩展了任务范围，额外审了 14 项不在分配清单内的文件，所有修复都属低风险无歧义类。这 14 项是：

`gre-quant-errors` / `interm-metrics-review-2023` / `marketing-review-2023` / `spilled-liquid-cleanup` / `us-bottled-water` / `research/latex-commands` / `research/vpn` / `study/causal-id/robustness-check` / `study/corp-fin/mid-2020-zh` / `study/corp-fin/mid-sample-1` / `study/marxism/marxism-past-essence` / `study/monetary-econ/monetary-econ-hw-summary` / `study/psy-stat-I/final-2022` / `toolbox/werewolf`

**主要 bonus 修复**：
- interm-metrics-review-2023: “Mordern” → “Modern”、补 3 张图 caption、批量补中英文空格、修复 `**` 嵌套混乱
- us-bottled-water: 7 处 SVG 中文 italic 全删
- spilled-liquid-cleanup: 2 处 SVG 中文 italic 删
- gre-quant-errors: 补 5 张图 caption（含 `<strong>` 强调）
- mid-2020-zh / final-2022 等多个骨架页 keywords 7 项 → 25 项 + 补 summary 字段
- werewolf 头部 banner 颜色 `#6c5ce7` → `#8a7a6a`（莫兰迪化）+ 删死代码

---

### 📊 抽检总览（写给站主）

**站级 P0 优先级**（必须站主把关、否则会影响读者）：

1. **marxism-principles 空括号 / 缺公式 / 表格损坏** —— 思政课复习笔记的术语 / 公式错误对引用者是致命的
2. **mao-thought-review-2023 表格大规模损坏** —— 多张表渲染为一段乱码
3. **sleep-position-curl-up 杜撰术语 + 杜撰文献** —— 已修 colonel→cervical lordosis 一处，但 Boy Calf 理论和 Boyko 文献需 hedge
4. **course-reviews 7 篇缺评分表 + TL;DR** —— schema 系统性缺失，建议升级 layout
5. **toefl-templates-2023 outdated** —— 2024 托福改革后已失效，建议加 `outdated:` 标记 banner
6. **breakout 等 8+ toolbox 游戏鲜艳色未跟 cd5a804 改造** —— 需决策“统一莫兰迪化”还是“显式保留游戏识别色”
7. **monetary-econ-2023 / or-2023 / mao-final-2023-spring 空骨架页** —— 建议引入 PDF 笔记自动导语 include

**站级 P1 长期建议**（10 条最重要）：

1. **写 `scripts/audit/img_caption_md.py`** 钩子：发现 `<p class="img-caption">.*\*\*.*</p>` 报警
2. **写 `scripts/audit/svg_italic_zh.py`** 钩子：grep `font-style="italic"` 命中中文 text 报警
3. **写 `scripts/audit/frontmatter_completeness.py`**：检查 summary / published / keywords 数量达标（life/research 18-30、study 15-25、course-review 10-20）
4. **写 `scripts/audit/ai_tells.py`**：扫“让我修正”、“等等让我重新想”、“实际上”、“综上所述”等流式思考残留
5. **`_layouts/course_review.html` 升级**：强制 `ratings: { workload, grading, lectures, gains }` 字段 + 自动渲染 5 分制评分卡
6. **`_includes/pdf_note_intro.html`**：根据 front-matter `course / material_type / pdf_url` 自动生成空骨架笔记导语
7. **`games-shell/room-lobby.js` 模块化**：把 doudizhu 的联机大厅抽成共享模块复用到其他 relay 游戏
8. **toolbox 颜色统一收尾**：扩 cd5a804 莫兰迪改造到剩下 8+ 游戏 / 或明确豁免（breakout / drawing 等需要七色的）
9. **toolbox HTML 拆 JS**：doudizhu / suika / fruit-ninja / picker 等长 HTML 拆出 `/assets/js/games/<name>.js`
10. **outdated 内容标记机制**：考试改革后已失效的内容（toefl 2023 模板等）front-matter 加 `outdated: true` + layout 顶部红色 banner

---

### 📐 第二轮 20 项深度抽检（4-agent 并行复核）

> **背景**：站主在另一对话窗口同时触发的另一波 20 项专项抽检，强调“每项认真对待、当作上级派下来的质检任务”。与上方 100 项的浅层批量分批不同，本轮走 **4-agent 并行 + 主对话亲自复核**的深度路径——每个 agent 5 项 × 类型化批判 checklist × `file:line` 强制证据 × 主对话 nontrivial 复核后再下手修。
>
> **清单**（去重 5/25 那次的 20 项 + 5/26 上方 100 项中已深度审过的项）：5 game（2048 / sudoku / werewolf / doudizhu / picker）+ 3 course_review（marketing / causal-id-review / python-ds）+ 3 research（r-pca / latex-commands / vpn）+ 3 life（dishwasher / snoring / electric-toothbrush）+ 1 lecture_note_full（corp-fin/mid-sample-1）+ 1 pdf-only（real-anal-ch0-2024）+ 2 pdf_archive（or-2023 / robustness-check）+ 1 GRE（vocabulary）+ 1 essay（college-admission-essay）= 20 项。
>
> **修复结果**：本轮直接修复 **24 处**，覆盖 14 个文件（与 100 项 session 的 67 处修复有重叠——同一棵工作树两个 session 并行修，最终都并入 `80e2043` commit）。进待办 **41 项**（P0×5 / P1×17 / P2×19）。
>
> **本轮独有 4 处 agent 误判已纠正**：
> 1. `_notes/study/real-anal/real-anal-ch0-2024.md` keywords 实际 29 项已达标（agent 报 7 项；可能读到旧缓存）
> 2. `_notes/study/causal-id/robustness-check.md` keywords 实际 35 项已达标（agent 报 12 项）
> 3. `toolbox/doudizhu/index.html:3716` `nextMyScore` **不是 ReferenceError**——3691 行 `renderDoublePanelLayout` 函数体内有 `const nextMyScore = computeMyScoreForMap(hypoMap);` 定义
> 4. `_notes/life/snoring-mechanism.md` + `_notes/life/dishwasher.md` 的 img-caption Markdown `**` 在上次 5/25 `4b25dab` commit 已修过，**当前无残留**

**本轮独立新发现的高价值 P0 / P1**（不在 5/26 上方 100 项报告里）：

- **`toolbox/2048/index.html:309`** unused `settings-panel.js` script 引用（多一次 HTTP）→ **已修**
- **`toolbox/2048/index.html:471/479`** `tileFontSize(v, size)` 第二参 + `renderTiles(prevBoard, ...)` 第一参从未被读 → **已修**形参 + 572 行调用同步
- **`toolbox/sudoku/index.html:510`** `padNoteBtn` 与 `noteBtn` 指向同一 DOM 元素后 0 次使用 → **已修**
- **`toolbox/sudoku/index.html:547`** 计时器 `setInterval(250)` 但显示精度只到秒 → **已修** 1000ms
- **`toolbox/werewolf/index.html:1583`** `renderAliveBadges` 里 `const dead = ... ? false : false` 显式死代码 → **已修**
- **`toolbox/werewolf/index.html:725-733`** `viewLanding` 与 `init` 双重处理 `?room=` 参数，init 先跑，viewLanding 那段是 dead code（待办 P0：删冗余分支）
- **`toolbox/doudizhu/index.html:2918/2960`** `flyCardsTo` no-op 空壳 + `spawnMicroRing` 0 调用 + 配套 CSS `.ddz-micro-ring` + `@keyframes ddz-micro-pulse` 共 ~17 行死代码 → **已修**
- **`toolbox/doudizhu/index.html:2234`** `statusMsg` 死 DOM + `setStatus` 25 处 no-op 调用（待办 P1：保守保留，主人决定不再加视觉反馈再清）
- **`toolbox/picker/index.html:937`** unused `$spinHint`（真用的是 `$spinHintText`）→ **已修**
- **`_notes/study/corp-fin/mid-sample-1.md:14`** 删 `# reactions:` YAML 注释行 + keywords 6→24 项补 CAPM/WACC/NPV/IRR/MM 定理等具体考点 → **已修**
- **`_notes/study/or/or-2023.md`** keywords 8→30 项补 PKU 运筹学/光华/单纯形/Hillier Lieberman 教材名 等 → **已修**
- **`_notes/study/real-anal/real-anal-ch4-2024.md`** keywords 8→29 项（**补救 5/25 抽检号称已补但未真正落盘的执行漏洞**）→ **已修**
- **`_notes/course-reviews/causal-id-review-2023.md:15/25/55/71`** 4 处 H1 `# 第 N 节课` → `## 第 N`（违反“正文别再 # ”，会让 post.html 出现两个 H1 + TOC 错位）→ **已修**
- **`_notes/course-reviews/causal-id-review-2023.md:47-50`** 占位空洞 “如果你的储备是 / 那么这门课的要求就是” 之间空白（待办 P0：当年想插对比图后来忘了，需主人记忆补图或改写）
- **`_notes/course-reviews/python-ds-review-2023.md:15`** `研究生院****副院长` 4 星号（Kramdown 会渲染成空 strong + 嵌套混乱）→ **已修**
- **`_notes/course-reviews/marketing-review-2023.md`** keywords 14→31 项补 Kotler/STP/4P/涂平班/符国群班 → **已修**
- **`_notes/research/r-pca.md`** 5 处 `PCA的` → `PCA 的`（中英文空格）→ **已修**；正文需按“科研之问”五段重写（待办，主人拍板）
- **`_notes/research/latex-commands.md:265`** 中文 `*(注：...)*` 斜体（违反 `feedback_chinese_no_italic` 硬规）→ **已修**改 `<span style="color:#888;font-size:0.9em;">（注：...）</span>`；keywords 21→34 项补 Overleaf/xcolor/命令冲突 → **已修**
- **`_notes/research/vpn.md`** keywords 28→38 项补学校 VPN/library proxy/EZproxy → **已修**；缺合规免责声明（待办 P0：建议加 3-5 句中性提示）；偏离“科研之问”题设（待办 P1：加 1-2 条学术场景实操）
- **`_notes/life/dishwasher.md`** keywords 18→30 项补 dishwasher tablet/rinse aid/hard water/Bosch AutoAir 等 → **已修**
- **`_notes/gre/gre-vocabulary.md`** keywords 17→33 项补 Verbal/TC/SE/RC/Magoosh/Anki/杨鹏 17 天 → **已修**
- **`_notes/essays/college-admission-essay.md`** 隐私 SEO 反作用（待办 P0：keywords 把“周睿+三明二中”打成 17 个变体强化关联，作为已是 PSU PhD 的站主是否仍希望被长期索引？强烈建议至少从 keywords 删 5-8 个最强项）+ 4 张图缺 caption（待办 P0）+ 缺写作时间锚 + 缺“今天回看”段（待办 P1）

**本轮各项综合评分**（1-5 ⭐）：

| 项 | 路径 | ⭐ | 已修 | 待办 |
|---|---|---|---|---|
| 1 | toolbox/2048 | 4 | 3 | 1P1 + 1P2 |
| 2 | toolbox/sudoku | 4 | 2 | 1P1 + 2P2 |
| 3 | toolbox/werewolf | 3 | 2 | 1P0 + 3P1 + 1P2 |
| 4 | toolbox/doudizhu | 4 | 4 | 2P1 + 2P2 |
| 5 | toolbox/picker | 4 | 1 | 1P1 + 4P2 |
| 6 | course-reviews/marketing-review | 3 | 2 | 1P0 + 2P1 + 1P2 |
| 7 | course-reviews/causal-id-review | 3 | 4 | 1P0 + 2P1 + 1P2 |
| 8 | course-reviews/python-ds-review | 3.5 | 5 | 1P0 + 1P1 + 1P2 |
| 9 | research/r-pca | 1.5 | 2 | 3P0 + 1P1 |
| 10 | research/latex-commands | 4.5 | 3 | 1P1 + 3P2 |
| 11 | research/vpn | 4 | 2 | 1P0 + 2P1 + 1P2 |
| 12 | life/dishwasher | 4 | 1 | 4P1 + 1P2 |
| 13 | life/snoring-mechanism | 4.5 | 0 | 1P1 + 3P2 |
| 14 | life/electric-vs-manual-toothbrush | 4 | 0 | 1P0 + 2P1 + 1P2 |
| 15 | study/corp-fin/mid-sample-1 | 1.5 | 2 | 1P0 + 2P1 + 1P2 |
| 16 | study/real-anal/real-anal-ch0-2024 | 4 | 0 | 2P1 |
| 17 | files/or/or-2023.pdf + 笔记页 | 2 | 1 | 1P0 + 1P1 + 1P2 |
| 18 | files/causal-id/robustness-check.pdf + 笔记页 | 3 | 0 | 1P0 + 1P1 + 1P2 |
| 19 | gre/gre-vocabulary | 4 | 1 | 2P1 + 2P2 |
| 20 | essays/college-admission-essay | 3 | 0 | 2P0 + 3P1 |
| **合计** | | | **24** | **5P0 + 17P1 + 19P2** |

**本周必看 3 件**（按风险排序）：

1. **`_notes/essays/college-admission-essay.md` keywords 强 SEO 化“周睿+三明二中”**——本轮抽检里唯一一条触及“未来雇主/同行搜得到可控性”的发现；不动文章正文（公开稿件），但 keywords 强项可考虑删
2. **`_notes/research/vpn.md` 缺合规免责声明**——文末直接给 WireGuard 白皮书 + IP 泄漏检测工具链接，对国内读者语境略风险
3. **`_notes/study/corp-fin/mid-sample-1.md` 16 行骨架页**——正文 0 行；要看 PDF 才能写“题面摘要 + 解答要点”

**LaTeX 化决策**（2 PDF + 1 pdf-only）：
- ① 立刻 LaTeX 化：无
- ② 低优队列：robustness-check.pdf（13 页 + pandoc 出身）/ real-anal-ch0-ch6 整套
- ③ 维持 PDF 存档：or-2023.pdf（55 页迁工作量大；建议跑 pdfslim 压缩 + 登记 hygiene 基线）

**给 audit 框架的本轮新增建议**（与上方 100 项 8 条独立）：
- `scripts/audit/pii_scan.py`：跨全仓 grep 中文姓名 + 学校名 + 学号模式（college-admission-essay 应触发）
- `scripts/audit/filename_convention.py`：扫 `files/<topic>/*.pdf` 缺 `-YYYY` 后缀（robustness-check.pdf 应触发）
- `scripts/audit/material_type_enum.py`：检 `material_type` 取值是否在 enum 内（GRE `"词汇"` 应触发）
- `scripts/audit/hover_no_media.py`：grep `:hover\s*\{` 不在 `@media (hover: hover)` 块内的行（5/5 游戏都该触发）
- `scripts/audit/sibling_crosslink.py`：同 sub_category 多笔记互链检查（real-anal ch0-ch6 / causal-id↔robustness 应触发）

---



由站主在对话中触发的 20 项专项抽检（一次性高密度补检，不影响日常 10 项调度）。共应用 **31 处低风险安全修复**，覆盖 11 个文件，`bundle exec jekyll build` 通过零警告。详见下方 🔬 抽检专项。

### 📋 待你把关

汇总在 🔬 抽检专项每一项的“进待办”。共 P0×6 / P1×18 / P2×17，按优先级处理；其中**联机版国象（chess）功能空壳是真正的紧急项**（建房成功但走子不同步，比“没联机”更糟）、**孤儿 PDF `Grading Systems and Student Effort.pdf`** 需站主判断归属、**`physics.md` 正文 0 行**需要补导语+章节 outline。

### 🗂 仓库卫生

仓库结构较昨日无明显变化。本次抽检暴露的 patterns：(a) **img-caption / SVG 内 Markdown 加粗不渲染、SVG 中文 italic 违规** —— 跨多篇文章重复出现，是模板级缺陷；(b) **PDF-only 笔记 keywords 普遍偏薄** —— 平均 10-20 项，远低于站点上限 35-50；(c) **`files/en/` 目录无 schema 约束**，孤儿 PDF + 文件名带空格能溜进去不被发现。建议把 audit 脚本扩到非课程目录。

### 💓 后端脉搏

本次未跑（手动触发的 20 项抽检专场，跳过日常审计三件套）。

### 📬 读者来信

本次未跑（同上）。

### 🔬 抽检专项

> **总览**：今日由站主在对话中触发，临时把抽检规模从 10 提到 20，做一次密集质检。20 项 = 1 game + 3 PDF 存档 + 4 PDF-only 课程笔记 + 1 有正文课程笔记 + 11 散文/文章。每一项都按“类型量身定制的批判性 checklist”逐条审过。汇总：可立刻修 31 处（已修）/ 进待办 41 项（P0×6, P1×18, P2×17）/ 长期建议 9 条。

---

**抽检 1/20 · game · `toolbox/chess/index.html`**（1294 行）—— ⭐⭐⭐☆☆ 综合 3 星
- 已修复（4）：删除死代码 `.ch-help` CSS 块；`PIECE_VALUE.k` 20000→0（MVV-LVA 噪声）；`.ch-cell:hover` 包到 `@media (hover: hover)`（消除触屏 sticky hover）；`chPaintBoard` 结算图分白棋/黑棋染色（白棋加深色描边）
- 待办：
  - **P0 · 联机功能补全或先下线**：1215 行 `state.mode='pvp';newGame()` 后两端各下各的，没有走子 relay、没有先后手分配，建房成功反而误导玩家。短期建议在预入页隐藏「🌐 联机」tab，长期接 zircon-urge 的 board relay 加 chess 专属 `move` action（携 FEN diff + UCI）。
  - **P1 · 升变 UI**：硬选皇后，残局升 N/R/B 无 UI；约 1% 实战局面里升马优于升后
  - **P1 · 棋子换 SVG（Cburnett，CC-BY-SA，~12KB）**：Unicode 棋子在 Windows Chrome ≥36px 描边糊；跨 OS 字体不一致
  - **P1 · 无障碍**：白棋对浅格对比度 1.5:1（WCAG AA 要 4.5:1）、零键盘支持、零 ARIA。加 `role="grid"/gridcell`、`aria-label="d4 白后"`、方向键 + Enter 走子
  - **P2 · AI 不卡 UI**：把 negamax 搬到 Web Worker；加“AI 思考中”spinner
  - **P2 · PvP 自动翻转 + 拖拽走子**
- 长期建议：拆文件（main/ai/ui/style/room.js）；AI 升级（quiescence + 迭代加深 + 置换表，或换 Stockfish.js Web Worker）；开局库（polyglot bin 前 6 步查表）；PGN 导出（chess.js 自带 `.pgn()`）；走子/吃子/将军/将死四种音效（顺便立 `games-shell/sfx.js`）

---

**抽检 2/20 · pdf_archive · `files/en/Grading Systems and Student Effort.pdf`**（994KB）
- 已修复：无（需要站主判断归属再动手）
- 待办：
  - **P0 · 确认归属**：全仓 grep 零引用 = 孤儿。文件名带空格也是异味。两条路二选一：(a) 如是站主自己的 working paper → 加到 index.html Research / Working Papers + rename `grading-systems-and-student-effort.pdf`；(b) 如是别人的论文/课程材料 → 直接删
- 长期建议：扩 audit 脚本扫 `files/en/` 等非课程目录孤儿 PDF；课程外目录建议建一个清单页明确每个文件归 index.html 哪个 section

---

**抽检 3/20 · lecture_note_pdf_only · `_notes/study/psy-stat-II/psy-stat-II-mid-2023.md`**
- 已修复（1）：keywords 从 6 项扩到 18 项（补 PKU/北大、ANOVA、回归、GLM、MANOVA、卡方、心理测量等）
- LaTeX 化决策：**③ 维持 PDF 存档** —— 2023 年期中阶段性整理、课程已结束、不会复用，ROI 极低
- 待办：
  - **P2 · post.html 缺“同课程其他材料”模块**：同目录有 cheat-sheet 和 final，PDF-only 正文为空无法手链。这是站级改动，影响所有 PDF-only 笔记

---

**抽检 4/20 · note · `_notes/life/us-visa-types.md`**（375 行 · 留学攻略）
- 已修复（2）：L101 img-caption 内 Markdown 加粗 `**路径 A**` 改 `<strong>` 包裹（HTML 不渲染 Markdown）；L373 删孤立 `---` 分割线
- 待办：
  - **P1 · 2025-2026 新政复审**：H-4 EAD 状态（2025 特朗普多次提议废除，要 hedge）、DV Lottery 中国资格变化日期来源、H-1B 改革如有
  - **P2 · keywords 扩**：补“美国留学签证 / OPT 是什么 / H1B 抽签 概率 / NIW 是什么 / 绿卡排期 / 配偶签证 / 陪读签证 / CSC 公派 J1"等口语长尾

---

**抽检 5/20 · lecture_note_full · `_notes/study/accounting/accounting-comprehensive.md`**（1300 行）
- 已修复（2）：补缺失 `author: "Zircon"` 和 `permalink: "/notes/accounting/accounting-comprehensive"`；keywords 加 PKU/北大、Libby 教材、三大表
- 待办：
  - **P1 · 内容时效**：5.6.2 节 ”Most companies in the US now adopt LIFO“ 2026 已偏陈旧，应改 ”many“ 或加时点限定
  - **P2 · 无 TOC**：1300 行长文站点无 TOC 注入，读者只能浏览器搜。建议 post.html 给长文（按字数或 `toc: true`）自动注入折叠 ToC
  - **P2 · 缺 worked example**：9.7/9.8 合并报表（goodwill 数字例）、第 7 章 bonds 摊销表数字例
  - **P2 · 缺配套**：同目录无 cheat-sheet/作业/期末

---

**抽检 6/20 · note · `_notes/life/garbage-disposal.md`**（269 行 · 生活之问）
- 已修复（1）：L117 img-caption 内 `**没有任何刀片**` 改 `<strong>` 包裹
- 待办：
  - **P1 · 补”参考来源“小节**：对比 hiccups/eye-chart/clean-the-washer 都有，本篇缺
  - **P2 · 水温争议 hedge**：第 9 行”冷水冲“可补一句”个别厂商建议温水“
  - **P2 · keywords 扩**：补 InSinkErator、Badger 5、reset 按钮、扣押金等长尾

---

**抽检 7/20 · note · `_notes/life/eye-chart-numbers.md`**（170 行 · 生活之问）—— **专栏样板**
- 已修复（3）：L112 + L134 SVG 中文删除 `font-style="italic"`；L80 ”中国法定盲下限附近“ 改”接近欧美法定盲标准“（中国国标实际更低）
- 待办：
  - **P2 · 补”屈光度（diopter）和视力关系“段**：读者常混淆”500 度近视 = 视力 0.x“
  - **P2 · keywords 扩**：补”4.5 视力 是多少 / 5.0 算近视吗 / 美国 验光 / 视力 换算 表“等长尾
- 长期建议：**本篇可作为生活之问专栏样板模板**——五段 + 严谨公式 + 5 篇文献 + 两张对比 SVG

---

**抽检 8/20 · note · `_notes/life/hiccups-mechanism.md`**（335 行 · 生活之问）
- 已修复（3）：L28 + L62 ”0.001 秒内突然猛吸气“ 改”瞬间剧烈收缩 / 约 35 毫秒后声门关闭“（0.001 秒在生理学上不可能，膈肌实际约 500ms 达峰）；L160 SVG 中文删除 italic；L23 ”用户经常说的“ 改”很多人说的“（消除 AI 味）
- 待办：
  - **P1 · 核实膈肌收缩时间常数文献**：给一个准确数字范围（Newsom Davis 1970 数据）
  - **P2 · keywords 扩**：补”打嗝 怎么办 / 打嗝 停不下来 / 屏住呼吸 治打嗝 / 宝宝 打嗝 / hiccup remedy“等口语高频词
  - **P2 · 补”老打嗝是不是病“类读者真实问题**

---

**抽检 9/20 · note · `_notes/life/clean-the-washer.md`**（268 行 · 生活之问）—— **本批最弱**
- 已修复（3）：L19 菌落密度表述 hedge（”内部潮湿表面菌落数可超过马桶座圈“）；L144 温度范围标注欧标 / 美标差异（美标 hot 档 ≈54℃）；删除 NSF/ANSI 184 引用（实际是洗碗机标准与本文无关）
- 待办：
  - **P0 · 补 2 张 inline SVG**：滚筒洗衣机剖面图（标橡胶门封 / 洗涤剂盒 / 排水过滤器 / 内胆夹层 4 个污垢热点）+ 生物膜在橡胶门封褶皱里形成的示意。**这是 5 篇生活之问里唯一无图的工具贴**，按 [[feedback_writing_add_images]] 强烈建议加
  - **P1 · 补硬核文献**：Callewaert et al. 2015/2017 关于洗衣机微生物组的研究
  - **P1 · keywords 扩**：本篇 20 项是 5 篇里最薄。补 InSinkErator / Badger 5 / 白醋 洗 洗衣机 / Affresh / Tide 洗衣机 清洁剂 / HE 洗衣机 / 洗衣机 黑色 东西 / 洗完 衣服 臭等
  - **P2 · L235 marketing 味措辞淡化**

---

**抽检 10/20 · lecture_note_pdf_only · `_notes/study/adv-micro-psu/2025-midterm-2.md`**
- 已修复（1）：keywords 从 12 扩到 21（补 mechanism design / auction theory / signaling / Bayesian games / VCG / revelation principle 等具体章节英文术语）
- LaTeX 化决策：**③ 维持 PDF 存档** —— Exams 类型 47KB，本就为打印掐时间做题而生

---

**抽检 11/20 · lecture_note_pdf_only · `_notes/study/causal-id/causal-id-2023.md`**
- 已修复（1）：keywords 从 20 扩到 26（补 PKU、PKU 计量、Angrist-Pischke MHE、Mostly Harmless、Cunningham Causal Mixtape、因果之梯）
- LaTeX 化决策：**② 低优队列** —— 经济 PhD 高频回看 + LaTeX 化后能配 DAG/识别图 inline SVG 收益高，但当前 PSU ECON 课程优先级更高，等博士期间再做

---

**抽检 12/20 · note · `_notes/research/r-data-processing-aggregation.md`**（17 行 · 科研妙招）—— **骨架页**
- 已修复（1）：L15 图片下方补 `<p class="img-caption">`
- 待办：
  - **P1 · 把 HTML 教程内容转写为 markdown 正文**：站点优势是 markdown 检索 + 站内小助手能读到；HTML 是黑盒
  - **P1 · 批量检查所有 r-* 文件 img-caption 是否同样缺失**

---

**抽检 13/20 · lecture_note_pdf_only · `_notes/study/tennis/tennis-exam-prep.md`**
- 已修复（2）：`material_type: "笔试学习资料"` 改 `"Notes"`（让 post.html 走更贴切的”课程讲义“分支生成导语）；keywords 从 10 扩到 16（补 PKU 网球、tiebreak、Grand Slam、ATP/WTA 等）
- LaTeX 化决策：**③ 维持 PDF 存档** —— 体育课一次性应试材料、零复用、268KB 极小
- 待办：
  - **P2 · PDF 路径不一致**：`/files/study/tennis/Main.pdf` 与其他课程的 `/files/<course>/<file>.pdf` 不符，且 `Main.pdf` 文件名模糊。建议 `git mv` 到 `/files/tennis/tennis-exam-prep.pdf` 并同步 front-matter（保 git 历史）

---

**抽检 14/20 · pdf_archive · `files/real-anal/real-anal-ch4-2024.pdf`**（80KB）
- 已修复：无
- 待办：
  - **P1 · real-anal 系列 6 篇笔记缺 `summary:` 字段**：同目录 ch0/2/3/4/5/6 都缺（ch1 有），影响导语一致性。一次集中补全
  - **P2 · 整套 real-anal-ch0–ch6 LaTeX 化**（依赖站主意愿；如不维护就不动）
- LaTeX 化决策：**② 低优队列** —— 数学硬核 + 日后复习高频回看；但单独 ch4 没意义，要做就整套

---

**抽检 15/20 · note · `_notes/life/student-credit-cards-roadmap.md`**（247 行 · 留学攻略）
- 已修复（4）：Amex Gold credit 改”按月 $10 发放、不累积“（不是整发 $120）；CSR 年费 $550 → $795（2025 年中涨价 + credit 结构改版）；”2024 年推出 Chase Freedom Rise“ → ”2023 年“；”Amex 接受 ITIN 是 industry secret“ → ”Amex 官网申请页明确接受 ITIN“
- 待办：
  - **P1 · 补 1-2 张 SVG**：FICO 权重饼图（35/30/15/10/10）、Chase 5/24 时间窗口图
  - **P1 · 加 TOC anchor**：7 节内容厚，首屏看不到目录
  - **P2 · Wallaby 链接修正**（L244 标注是 Wallaby 但实际是 walletwhiz/walletsavvy.com 已被 Bankrate 收购下线）
  - **P2 · keywords 扩**：补 ITIN 信用卡、Discover Secured、Bilt 信用卡、Chase Sapphire Preferred
  - **P2 · 每年初一次”年费/credit 漂移“巡检**：Amex/Chase 每 6-12 月会改 credit 结构

---

**抽检 16/20 · note · `_notes/pre-high-school/physics.md`**（14 行 / 正文 0 行）—— **骨架页**
- 已修复：无（全是结构性补内容，需要站主判断）
- 待办：
  - **P0 · 补 markdown 正文导语 + 章节 outline + 目标读者**：当前正文 0 行，读者打开页面除了”下载 PDF“没任何信息
  - **P1 · 加 2-3 张 inline SVG**：力的合成、抛体轨迹、向量分解任选——物理题材天生适合
  - **P1 · keywords 扩到 18-22 项**：加具体知识点（牛顿三定律、自由落体、矢量分解、运动学公式、初高中物理衔接、新高一预习物理）

---

**抽检 17/20 · note · `_notes/course-reviews/ted-speaking-review-2022.md`**（118 行 · 课程测评）
- 已修复（5）：L60 + L78 两张图片下方补 `<p class="img-caption">`；课名 ”TED演讲视听说“ 全文统一加空格 ”TED 演讲视听说“；”-4 天结课“ → ”倒数第 4 天结课“；图片 alt 内 ”0至2分“ → ”0 至 2 分“
- 待办：
  - **P0 · 补量化评分表**：课程测评专栏 schema 期待”任务量 / 给分 / 讲课 / 收获 × 5 分制“，本文只有定性评价
  - **P1 · 开篇 TL;DR**：一两句话直接告诉选课读者”推荐 / 不推荐 / 适合谁“
  - **P2 · 孤立 🙏 emoji（L89/102）**：保留个人风格 OK，但单独一行像页脚误植，可合入前段
  - **P2 · ”- 平时表现“ 升为 `### 平时表现`**：bullet 当伪标题不利 TOC 跳转
  - **P2 · keywords 扩**：PKU 英语 / TED 视听说 给分 / TED 任务量 / 吴芊

---

**抽检 18/20 · pdf_archive · `files/corp-fin/mid-sample-1.pdf`**（459KB）—— **健康样本**
- 已修复：无
- LaTeX 化决策：**③ 维持 PDF 存档** —— 2022 年北大公司财务期中样卷（不是站主笔记），同目录 17 个文件全是历年原卷及答案；把别人的卷子 LaTeX 化无收益且有版权问题
- 整体观察：front-matter / 命名 / 大小都规范，是 `_notes/study/<course>/` pattern 跑得好的范例

---

**抽检 19/20 · note · `_notes/life/air-fryer-cooking.md`**（235 行 · 生活之问）—— **接近满分**
- 已修复：无
- 待办：
  - **P2 · L192 nonstick spray 解释微调**：”含丙烷会损伤不粘涂层“ → 实际是”卵磷脂在高温聚合在涂层上“（技术细节更准确）
  - **P2 · 可在”温度选择“加 SVG 温度区间条形图**（当前文字版已足够清晰，非必需）
- 整体观察：五段结构严谨、LaTeX 公式规范（含传热系数）、双图配 caption、keywords 22 项中英双语覆盖密集。**与 eye-chart-numbers 并列专栏样板**

---

**抽检 20/20 · note · `_notes/toefl/toefl-writing.md`**（35 行 · TOEFL）—— **骨架页**
- 已修复（5）：删 L13 ”文末'阅读原文'是蓝色的～“（公众号搬过来的提示，站内笔记无）；L19 图片下方补 `<p class="img-caption">`；L15 ”GRE中的Issue“ → ”GRE 中的 Issue“（中英文空格）；L24 ”让Kimi读题“ → ”让 Kimi 读题“；Kimi 段补 AI 用法免责”⚠️ AI 生成的范文仅作结构参考，不建议直接背诵套用——评分细则里有'是否表达个人观点'的维度，套模板太死容易翻车“；L17 ”只要跟着题目走即可“ → ”只要逻辑紧扣题目即可“（软化绝对化表述）
- 待办：
  - **P1 · 补”## 文档下载 / 怎么用这份样例“小节**：明确告诉读者 PDF 里有什么、怎么使用
  - **P1 · 用标题层级（## 改版背景 / ## 我的备考方法 / ## 模板总结）替代纯段落**
  - **P2 · keywords 扩到 20+**：补”托福 学术讨论 范文 / 托福 综合写作 范文 / TOEFL writing 2023 改版 / 独立写作 取消 / 新托福写作 模板“

---

## 📊 抽检总结（写给站主）

| 类型 | 数量 | 已修复 | P0 待办 | P1 待办 | P2 待办 |
|------|------|--------|---------|---------|---------|
| game | 1 | 4 | 1 | 3 | 2 |
| pdf_archive | 3 | 0 | 1 | 1 | 1 |
| lecture_note_pdf_only | 4 | 5 | 0 | 0 | 2 |
| lecture_note_full | 1 | 2 | 0 | 1 | 3 |
| note (生活攻略/留学) | 7 | 16 | 1 | 6 | 9 |
| note (科研/课程测评/toefl/物理) | 4 | 4 | 3 | 7 | 6 |
| **合计** | **20** | **31** | **6** | **18** | **23** |

**结构性发现**（跨多项重复出现的 pattern）：
1. **`<p class="img-caption">` 内用 Markdown 加粗不渲染** → 已在 us-visa-types、garbage-disposal 修。建议给 image-caption skill 加一条硬约束：”caption 是 HTML，加粗必须 `<strong>`“。
2. **SVG 中文文字用 `font-style="italic"`** → 已在 eye-chart-numbers、hiccups-mechanism 修。违反 [[feedback_chinese_no_italic]]，应该写进 SVG 模板约束。
3. **PDF-only 笔记 keywords 普遍偏薄**（10-20 项），全部缺学校代号 PKU/北大、缺章节英文术语、缺教科书名。已对 4 篇逐一补全。
4. **骨架页问题**：physics.md（0 行）、r-data-processing-aggregation.md（17 行）、toefl-writing.md（35 行）信息密度太低，对站内小助手 / SEO / 直接阅读都不利。**建议给学习资料类 sub_category 定一个”最少正文密度“标准**（100 行起步 + 至少 1 张 inline 图）。
5. **`files/en/` 等非课程目录无 schema 约束** → 孤儿 PDF + 文件名带空格能溜进去。audit 脚本扩到非课程目录。
6. **post.html 缺”同课程其他材料“模块** → PDF-only 笔记正文为空无法手链 sibling，读者打开 midterm-2 跳不到 midterm-1 / final / 主讲义。**站级改动 ROI 最高**。

**LaTeX 化决策汇总**（4 份 PDF-only 课程笔记 + 3 份孤儿 PDF 共 7 项判断）：
- ① 立刻 LaTeX 化：无
- ② 低优队列：causal-id-2023（PhD 高频回看 + 可加 DAG SVG）、real-anal-ch0–ch6 整套（数学硬核但要等系列一起做）
- ③ 维持 PDF 存档：psy-stat-II-mid-2023、adv-micro-psu/2025-midterm-2、tennis-exam-prep、corp-fin/mid-sample-1（4 份）
- 待定：Grading Systems and Student Effort.pdf（先确认归属）

---

## 2026-05-22

### ✅ 本次已自动修复

本次巡检未发现需要自动修复的问题。仓库状态良好：

- `jekyll build` 通过，**零 warning、零 error**（沙箱无 Gemfile，本次用 `gem install jekyll jekyll-feed jekyll-seo-tag jekyll-sitemap` 后用 rbenv 的 jekyll 4.4.1 构建；GitHub Pages 自身的构建链路不受影响）。
- `_site/EMAIL_SUMMARY.md`、`_site/DAILY_REVIEW.md` 均未生成，exclude 生效。
- 坏链/坏图巡检：`_notes` 全部 markdown 图片引用与 HTML `img src` 均指向存在的文件；站内绝对内链全部能在 `_site` 解析。`scripts/audit/dead_links.py` 报的几条均为非问题——fly.dev 的 `/api/*` 是 POST 端点，GET 返回 403 属正常；`fonts.googleapis.com`/`gstatic.com` 是 `preconnect` 主机不是页面链接；`centretax.net` 等几个 DNS 解析失败是沙箱网络策略所致，非真实坏链。
- 前置字段一致性：245 篇 `_notes` 全部有 `main_category`；113 篇资料型全部有 `discipline`；32 篇菜谱 `title/total_time/difficulty/ingredients/steps` 必填字段齐全。
- 关键词覆盖：**245/245 篇文章都已有 `keywords:` 字段**——2026-05-20 P1 提到的「113 篇老文章缺 keywords」已被后续会话补齐，该待办关闭。
- 百宝箱一致性：`toolbox/` 下 45 个工具子目录与 `_data/toolbox.yml` 的 `url` 登记一一对应，无孤儿、无悬空。

### 📋 待你把关

#### P2（看心情）

1. **新增的本机维护脚本里有 `/Users/zhourui/` 绝对路径，暴露在公开仓库**
   - 来源：自上次巡检（`ca3034c`）新增的 `scripts/email_summary.sh`、`scripts/io.github.zirconeey.email-summary.plist`。
     - `email_summary.sh:25` 写死 `REPO="/Users/zhourui/Desktop/zirconeey.github.io"`。
     - `io.github.zirconeey.email-summary.plist` 5 处 `/Users/zhourui/...`（脚本路径、工作目录、日志路径、HOME）。
   - 影响：把 macOS 本机用户名 `zhourui` 和桌面目录结构暴露在公开 GitHub 仓库里。**不是密钥泄漏**（凭证都走 `load_credentials()` 从环境/外部文件读，已确认无硬编码密码），只是轻微的个人环境信息外泄。
   - 我没动它：这两个文件是你在 `a010dc5`「改用本地 LaunchAgent」里**有意提交**的本机 routine 配置；plist 的本质就是要写绝对路径，`email_summary.sh` 也确实在本机跑。是否值得为隐私把它们从 git 移除（`git rm --cached` + 进 `.gitignore`）、或把绝对路径改成 `$HOME` 相对写法，属于设计取向，交你拍板。若要保留可跟踪、又想脱敏，最小改动是把 `email_summary.sh` 的 `REPO` 改为 `REPO="$(cd "$(dirname "$0")/.." && pwd)"`，plist 没法脱敏（launchd 不认相对路径）。

#### P2（看心情，承接昨日）

2. **`scripts/audit/images.py` 报的 12 张较大图（500KB–1.5MB）**
   - 与昨日基线一致，均为内容图、非冗余文件；`files/or/or-2023.pdf` 5.30 MB 也是既定基线。无需处理，仅记录。

### 🗂 仓库卫生

- **架构变化**：自上次 daily-review（`ca3034c`）以来新增文件**全部在 `scripts/` 下**——`email_summary.sh`、`email_summary_imap.py`、`email_summary.prompt.md`、`io.github.zirconeey.email-summary.plist`、`audit/caption_whitelist.txt`，均是 email-summary routine 的脚本与审计白名单，无新增内容目录、无新文件类型。`scripts/` 已在 `_config.yml` exclude 内，不会发布成站点页面。**目录结构层面较昨日无实质变化，无需再优化。**
- **追踪卫生**：工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak`/`*~` 编辑器垃圾；`_site/`、`.jekyll-cache/` 已被 `.gitignore` 正确忽略。
- **密钥扫描**：新增脚本逐一扫描，无硬编码密码/令牌（IMAP 凭证走外部加载）。唯一发现是 P2#1 的本机绝对路径，已写进待办交你把关。
- **结论**：今日无可安全自动修复项，仓库结构相对昨日无变化、无需再优化；唯一新发现是新脚本里的本机路径外泄（P2，非密钥，交你定夺）。

---

## 2026-05-21

### ✅ 本次已自动修复

1. **`EMAIL_SUMMARY.md` 已加入 `_config.yml` exclude**
   - 现象：今天早些时候新加的 `EMAIL_SUMMARY.md`（routine `email-summary` 的归集文档）忘记跟 `DAILY_REVIEW.md` 一样写进 exclude，本次 `jekyll build` 后 `_site/EMAIL_SUMMARY.md` 真的存在——也就是说 `https://zirconeey.github.io/EMAIL_SUMMARY.md` 会把私人摘要原文公开。
   - 影响：信息泄漏面有限（当前文件只有元数据骨架，没有真实邮件 summary 内容），但只要 routine 跑过一次写入实质内容，就会立刻泄漏给所有访客。
   - 处理：紧接 `DAILY_REVIEW.md` 那一行加上 `- EMAIL_SUMMARY.md`，注释同步改成「DAILY_REVIEW / EMAIL_SUMMARY 是 routine 自动更新目标」。GitHub Action 的 `paths: ["EMAIL_SUMMARY.md"]` 触发器只看仓库路径，不受 Jekyll exclude 影响，通知链路不动。
   - 复构建：通过、零 warning，`_site/EMAIL_SUMMARY.md` 已不再生成。

2. **`.claude/skills/new-post/SKILL.md` 与 `_notes/research/` 扁平化后的现状对齐**
   - 现象：昨天 17:52 的 `7c9b93d chore(repo): _notes/research 子目录扁平化` 把 `_notes/research/{econometrics,how-it-works,latex,literature,r-tutorials,workflow}/<slug>.md` 全部上提到 `_notes/research/<slug>.md`，但新建文章用的 `new-post` skill 文档还在 3 处写「`_notes/research/<topic>/<slug>.md`」「`_notes/research/r-tutorials/r-pca.md`」。
   - 影响：下次有人（或 Claude session）按 skill 加新「科研妙招」时会建出已不存在的子目录，破坏新约定。
   - 处理：
     - L42（学习笔记路径列举）去掉 `_notes/research/<sub>/`（research 本来就是 main_category，不属于此处归类）。
     - L96（schema 表格）：文件路径列改成 `_notes/research/<slug>.md`，例子改成 `_notes/research/r-pca.md`，并补一句「URL 中的 `<topic>` 由 permalink 显式写出」——因为实际 permalink 仍是 `/research/<topic>/<slug>`（线上 URL 不变，只是文件位置扁平了）。
     - L139（学习笔记决策树）：`_notes/research/<sub-topic>/<slug>.md` → `_notes/research/<slug>.md`，备注「文件目录已扁平，但 URL 仍走 `/research/<sub-topic>/<slug>`，需手写 permalink」。

### 📋 待你把关

#### P1（有空再做）

1. **65 处文章图片下面的短段落疑似漏用 `<p class="img-caption">` 包裹**
   - 来源：`scripts/audit/images.py` 启发式扫描——会把“图片紧邻的下一段短文字”标出来，已知会把“短首段（非配文）”误报。
   - 高频热点：
     - `_notes/course-reviews/marketing-review-2023.md` 至少 5 处
     - `_notes/research/r-brucer-moderation-mediation.md`、`r-data-processing-aggregation.md` 等 R 教程多处
     - `organizational-mgmt-review-2022.md`、`causal-id-review-2023.md` 等课程测评
   - 影响：视觉上配文不会按站内统一灰小字渲染，和已规范的图片差异较明显。
   - 建议：用 `/image-caption` skill 一篇一篇过；高频文章先收口（marketing-review-2023 / R 教程系列）。
   - 我没自动改：65 处里掺着真实的“短首段”误报，自动批量包会污染正文。

2. **414 处图缺 `alt` 文本（可访问性 / SEO 提醒）**
   - 影响：屏幕阅读器读不到图片含义；Google 图片搜索也少一个抓手。
   - 建议：批量补 alt 是大改造，不属于每日修复范围，看你想不想找一段时间专门做。脚本输出已附完整列表。

#### P2（看心情）

3. **昨日 P0 `.git/refs/remotes/origin/main 2` 孤儿副本（仅本机 mac）**
   - 来自 2026-05-20 小节 P0 #1，远程沙箱里没有这个文件，无法替你处理；如果你本机还没修，按昨日给的 `rm` 命令清掉即可。

### 🗂 仓库卫生

- **架构变化**：自昨日 daily-review 提交（`713be53`）以来新增了——
  - `EMAIL_SUMMARY.md` + `_data/email_summary_{config,state}.json` + `.github/workflows/email-summary-notify.yml`（新 routine）
  - `scripts/audit/backend_pulse.py`（后端脉搏巡检）
  - `_notes/research/` 子目录扁平化（结构层面已合理，今日跟进的只是 skill 文档对齐）
  - `files/pre-high-school-*/swim/tennis` 整合（已在 `7c9b93d` 落地，permalink 已保留）
- **追踪卫生**：
  - 工作树扫描无 `* 2.*` macOS 副本、无新被跟踪的 `.DS_Store`、无 `*.bak`/`*~` 编辑器副本。
  - 密钥/凭证扫描：除既有 2 处误报（`daily-review-notify.yml` 内置 `GITHUB_TOKEN`、`toolbox/suika/index.html` 是彩蛋按键码），无新增。
  - `_data/email_summary_config.json` 包含 3 个邮箱地址，但因 `_data/` 不会落到 `_site/`，已确认不会被 Jekyll 暴露成公开页。
  - `email-summary-notify.yml` 全程走内置 `github.token`，无外部密钥。
- **大文件**：与昨日一致；`files/or/or-2023.pdf` 5.30 MB 是既定基线，不动。
- **结论**：今日修了 1 个“明天就会泄漏”的 exclude 漏网（EMAIL_SUMMARY）+ 1 个 skill 文档与新结构的对齐；除此之外仓库结构相对昨日无需再优化。

---

## 2026-05-20

### ✅ 本次已自动修复

1. **10 篇科研妙招 excerpt 警告全部清掉**
   - 影响：`bundle exec jekyll build` 每次刷 10 条黄色 Warning，构建日志噪音很大。
   - 原因：9 篇文章把 `{% raw %}` 写在 front-matter 之后第一行，但正文里根本没有 `{{`/`{%` 需要转义；Jekyll 取摘要时被 `{% raw %}` 截在前面，自动补 endraw 并报 warning。
   - 处理：
     - 9 篇无需转义的文章直接去掉这对多余的 `{% raw %} … {% endraw %}`（panel-did-eventstudy / regression-tables / beamer-slides / tikz-econ-figures / literature-search / zotero-setup / git-for-papers / remote-server / reproducible-project）。
     - 1 篇 `latex-commands.md` 正文真的有 `{{#1}` 这种 LaTeX 双花括号需要 raw 保护——把 `{% raw %}` 从第一段之前挪到第一段之后，摘要干净、正文保护不变。
   - 复构建：通过、零 warning、`latex-commands.html` 里 86 处 `\newcommand` 与 `{{#1}` 全部保留。

2. **`_config.yml` exclude 增加 `DAILY_REVIEW.md`**
   - 影响：之前根目录没有 DAILY_REVIEW.md 所以也没问题，今天起本文存在，必须排除否则会作为页面发布到公开站。
   - 处理：紧跟 `MAINTENANCE.md` / `ARCHITECTURE_REVIEW.md` 那一段加上。

### 📋 待你把关

#### P0（建议本周处理）

1. **`.git/refs/remotes/origin/main 2` 这个 macOS 副本卡住了 `git fetch`**
   - 现象：`git fetch origin` 直接报 `fatal: bad object refs/remotes/origin/main 2` / `did not send all necessary objects`。
   - 原因：访达里复制粘贴或 iCloud/Finder 同步在 `.git/refs/remotes/origin/` 里留下了一个名叫 `main 2` 的文件（41 字节，权限 600，`cat` 还触发 `Resource deadlock avoided`，明显是被 macOS 锁住的 stub）。
   - 影响：daily-review 第一步 `git fetch` 永远失败，本机也无法及时感知 GitHub 上的远端变动。今天我用 `git ls-remote origin main` 绕过去确认了远端就是 `cc213e1`、和本地 `cc213e1` 一致，然后才敢继续。
   - 我没动它：规则里「绝不动 `.git/`」是红线，所以留给你手动处理。建议：
     ```bash
     # 在仓库根，关掉所有可能持有锁的进程（VS Code/Finder 预览/Spotlight 索引）后跑
     rm ".git/refs/remotes/origin/main 2"
     git fetch origin   # 应该恢复正常
     ```
     如果 `rm` 报 deadlock，先 `xattr -c` 或重启再试。

2. **本地领先远端 1 个提交（`2786932`）今天会随这次自动巡检一起推上去**
   - 来自今天早些时候另一个 Claude 会话的 `docs: ARCHITECTURE_REVIEW.md 对齐现状`，作者就是你本人，没有任何风险，巡检收尾时一并 `git push`。仅此告知。

#### P1（有空再做）

3. **113 篇老文章缺 `keywords:` 字段**
   - 之前 `搜索关键词全量语义增强（116 篇）`这一波只覆盖了主力博客文，没动课程笔记/测评/GRE/TOEFL 等。分布：
     - `_notes/course-reviews/` 18 篇
     - `_notes/study/corp-fin/` 16 篇
     - `_notes/pre-high-school/` 10 篇
     - `_notes/study/real-anal/` 8 篇
     - `_notes/study/psy-stat-I/` 7 篇
     - `_notes/study/adv-micro-psu/` 7 篇
     - `_notes/gre/` 7 篇
     - `_notes/toefl/` 6 篇
     - 其它若干（共 113 篇）
   - 影响：站内全局搜索时这些文章只能靠正文/标题命中，“同义词/英文/错别字”路径走不到；课程测评这一栏尤其想被人搜到的话漏比较大。
   - 建议：分两批做。第一批先收口课程测评（18 篇，模板高度统一，写 keywords 很机械）；第二批再按学科批量处理课程笔记。每批一次 commit，参考 `.claude/skills/search-keywords/SKILL.md` 的语义增强方法。
   - 我没擅自动手：单篇 keywords 自动补容易写出“机械式”列表，整体不利于搜索质量；且不算“newly added”范畴，按规则该让你拍板。

#### P2（看心情）

4. **`bundler` 默认调用的是系统 Ruby 2.6，跑不了 `bundle install`**
   - 现象：`/usr/bin/bundle` 找不到 `bundler 4.0.11`，必须手动 `export PATH="/opt/homebrew/opt/ruby/bin:$PATH"` 才能用 Homebrew 的 Ruby 4.0.3。
   - 影响：仅本机巡检/手动 build 受影响，不影响 GitHub Pages 构建。
   - 建议（任选一）：
     - 在 `~/.zshrc` 把 `/opt/homebrew/opt/ruby/bin` 提前加到 `PATH`（一次性根治）。
     - 或在 `scripts/daily_review.sh` 顶上加一行 `export PATH="/opt/homebrew/opt/ruby/bin:$PATH"`（只修这个钩子）。
   - 没自动改：动 PATH 影响面较广，看你想全局加还是只在 daily-review 脚本里加。

### 🗂 仓库卫生

- **架构变化**：相比昨天没有目录结构变更。今天的提交（`2786932`）只动了 `ARCHITECTURE_REVIEW.md`，无新增文件夹/文件类型。
- **追踪卫生**：
  - 没有任何 `* 2.*` 之类的 macOS 副本被跟踪；工作树里也没有（前两天清理后保持干净）。
  - `.DS_Store` 都在工作树里（约 10 处），`.gitignore` 已覆盖，没漏进 git，无须处理。
  - 没有新的疑似密钥/绝对路径泄漏：扫描出的 `API_KEY/SECRET/TOKEN` 两处都是误报（`daily-review-notify.yml` 用的是内置 `GITHUB_TOKEN`，`toolbox/suika/index.html` 是 `SECRET_FULL` 彩蛋按键码，不是密钥）。
- **大文件**：最大的 5 个 PDF（or-2023 5.3MB、monetary-econ-2023 3.0MB、psy-stat-II-mid-2023 2.0MB、china-hist-2024 1.7MB、public-econ-2023 1.7MB）都是之前压缩基线已确定的，不动。
- **结论**：今天没有发现新增冗余/命名混乱/可整理项，仓库结构相对昨日无变化、无需再优化（除 P0 那个 `.git/` 里的孤儿副本，但那是红线区不动）。
