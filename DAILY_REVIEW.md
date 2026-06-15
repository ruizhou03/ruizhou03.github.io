## 2026-06-15

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（16 项；今日周一 DOW=1，跑了 dead_links / orphan_files / pii_scan 三项周一项；DOM=15，未跑 monthly_stats）。距 6-14 巡检共 **5 个 commit**（`541efb0` 之后 → `dcdbb1b` 为止），三条主线：① **新内容上线 1 篇**——`603de4a`「货币经济学讲义重制上线」：把光华金融经济方向《货币经济学》（2023 春·肖筱林 Sylvia Xiaolin Xiao）整学期 markdown 课堂笔记**原地替换**为自足的英文教科书式讲义（57 页 / 7 章 + 7 张重绘 TikZ 图 / 教科书彩色盒子排版），覆盖简单货币模型（OLG / 货币即记忆）→ 商品货币 → 通胀与铸币税（Laffer 关系）→ 国际货币体系 → 中央银行与独立性 → 货币供给过程；同一 markdown 入口 `_notes/study/monetary-econ/monetary-econ-2023.md`（front-matter 改 6 行：title 改成「货币经济学讲义」、keywords 扩到 28 条、署名改 Rui Zhou、summary 重写），PDF 路径稳定不变（`files/monetary-econ/monetary-econ-2023.pdf` 3104449 → 475680 字节，**−6.5×**），新建 LaTeX 源（`source/main.tex` + `commands.tex` + `theorems.tex` + 7 章 `chapters/ch{1..7}_*.tex` + 7 张 `figures/fig{1..7}.tex`，共 17 文件 / ~2160 行）。② **掼蛋 2 commit**——`d3be3ea`「牌面左下角花色+级标·三带二排序·手牌大小调节·结算翻牌动画」（`guandan.js` 158 行 + `index.html` 105 行，UX 大改）、`bf39422`「修复堆叠重影·手牌大小按钮·收紧卡牌间距」（`guandan.js` 4 行 + `index.html` 37 行，跟进 fixup）。③ **工作流文档 1 commit**——`dcdbb1b`「本科笔记 LaTeX 化工作文档(playbook) + 可复用 workflow 真本脚本」：新建 `docs/undergrad-notes-latexify-playbook.md`（288 行，固化「本科旧笔记 LaTeX 化上线」长期任务的目标 / 范围 / 选课防重复 / 七阶段工作流 / 真本脚本 / front-matter schema / 隔离 worktree 发布 / iCloud 删除坑 / 血泪教训）+ `docs/workflows/{figures-to-tikz,body-to-latex}.workflow.js`（81 + 103 行可复用 workflow 脚本）。**这些都在 `_config.yml` exclude 的 `docs/` 下，不进站。** `bundle install` ✅ + `bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` ✅ 通过、零 warning、零 error（12.347 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean + 3/3 周一项跑完无新增问题**——`keywords_coverage`（散文 121 篇全部充足）/ `images` / `material_type_enum`（分布同昨日：Notes×43 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1）/ `filename_convention` / `hover_no_media`（掼蛋 UX 大改后所有 `:hover` 仍齐用 `@media (hover: hover)` 守卫）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-14）/ `dead_links`（254 条与上周一同源：后端 403 ×几十条 + 5 条已知 DNS NameResolutionError 长链）/ `orphan_files`（0 孤儿）/ `pii_scan`（18 篇含 PII，分布同上周一，无新增）。**今日 0 项自动修复**——5 个 commit 全部合规；唯一 P1（`study_order` 未列 `interm-econometrics`）继续从 6-13 / 6-14 承接，今日状态完全不变，属设计判断，按巡检规则不擅改。

### ✅ 本次已自动修复

**今日无自动修复项** —— 5 个 commit 全部合规：① 「货币经济学讲义重制」原地替换 `monetary-econ-2023.md` 与同名 PDF，markdown 入口 permalink / pdf_url 不变（`/notes/monetary-econ/monetary-econ-2023` + `/files/monetary-econ/monetary-econ-2023.pdf`），`/notes/` 一级 landing 渲染正常（已验证「货币经济学讲义」与「货币经济学作业整理」两张 sibling Notes 卡正确呈现），sitemap 与 search.json 都正确收录新 lastmod；author 改 Rui Zhou 与 6-13 interm-econometrics 同形，正在沉淀「LaTeX 化教科书式讲义」类型的统一署名约定；keywords 28 条覆盖中英文 + 课程别名（货币经济学 / monetary economics / huobi / 货币）+ 教材关键词（费雪方程式 / MV=PQ / 泰勒规则 / QE / CBDC / 通货膨胀目标制）；PDF 体积从 3.1 MB 降到 475 KB（−6.5×）属重制（不是误压缩——原 PDF 是另一种 Markdown 渲染版，新 PDF 是 LaTeX 教科书式 7 章 57 页），不需 imgslim / pdfslim 介入。② 掼蛋两条 UX 改动：所有 `:hover` 规则仍齐用 `@media (hover: hover)` 守卫（`hover_no_media.py` ✅）、`index.html` 仅 v 号 / 玩法设置 DOM 调整、`guandan.js` 涉及理牌/三带二排序/旁观蒙版/结算翻牌动画——纯前端 UX 增强，没接入新 API。③ docs/ 三个新文件全部 exclude 命中（已验证 `_site/` 无 `*workflow*` / `*playbook*` 命中）；其中 `undergrad-notes-latexify-playbook.md` 含若干 `~/Desktop/` / iCloud / `/tmp/` 个人路径，属内部 playbook 性质，已在仓库公共 git 但不在线上站，不构成线上 PII / 路径泄露——但 GitHub 公开仓库可见，属站主主动委派给后续 agent 的工作文档（intentional commit）。今日审计 16/16 全 clean，无须任何代码层面收口。

### 📋 待你把关

#### P1（建议尽快，承接 6-13 / 6-14）

1. **`_config.yml` 的 `study_order` 缺 `interm-econometrics`，新讲义在 `/notes/` landing 仍不可见** —— 承接 6-13 / 6-14 P1#1，今日状态**完全不变**：`grep -c "interm-econometrics" _site/notes/index.html` = 0；sitemap + search.json + 同课程侧栏互链照旧能命中。三个走法照旧（A 追加一行 / B 物理合并文件夹 / C 保持现状只靠搜索）。仍推荐方案 B，等站主拍板。**注意**：今日货币经济学的新讲义没踩这个坑——`monetary-econ` 文件夹原本就在 `study_order`（L73），所以新讲义在 landing 正常显示（已验证「货币经济学讲义」+「货币经济学作业整理」两张 sibling 卡）。说明 P1#1 是文件夹**命名分歧**带来的（旧 `interm-metrics` vs 新 `interm-econometrics`），不是 study_order 设计本身的问题；货币经济学因为旧新讲义都在 `monetary-econ/` 同一文件夹下、原地替换，所以不出现这个分歧。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-14 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-14。属本地标识符，不影响线上。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-14 P2#4。设计取向项。

4. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-14）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。本周（周一）`dead_links.py` 仍命中这五条，与上周一同源。属沙箱无 DNS 出口的已知现象，需站主在生产 / 本机复验。

5. **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`** —— 沿用 6-06 ~ 6-14。

#### 🆕 本次新出现的观察（不是问题，是提示）

- **「Rui Zhou」署名扩展到 2 篇 LaTeX 教科书式讲义**：今日货币经济学讲义重制后 `author: "Rui Zhou"` × 2（monetary-econ-2023 + interm-econometrics-2023），`"Zircon"` × 130（−1），`周睿` × 2，总数 134 不变。**形成中的约定**：LaTeX 教科书式重制讲义（多章 + 教科书排版 + 自足覆盖整学期）走真名 Rui Zhou，其他博客 / 工具笔记 / 课程测评 / 课堂笔记走笔名 Zircon。两篇都对应同目录的 `source/main.tex + commands.tex + theorems.tex + chapters/` 完整 LaTeX 工程，属同一形态。**不是问题**——是站主对学术内容形态的有意切换；若日后扩展到第三篇也走此约定，可在未来形成正式 schema 标注。

- **PDF 体积 −6.5× 属重制不是误压缩**：`files/monetary-econ/monetary-econ-2023.pdf` 3104449 → 475680 字节。重制后是 LaTeX 编译产物（57 页 7 章纯文字 + 7 张 TikZ 矢量图），无栅格图、无嵌入字体子集冗余，体积自然小。`images.py` 的 EXEMPT_FILES（不应压缩列表）继承自旧版的 markdown 渲染 PDF，**今日已不再需要豁免此文件**——LaTeX 版的 475 KB 已经是最小化形态，未来若 imgslim/pdfslim 再扫到也无可压空间。**不需立刻清 EXEMPT 项**（清也只是注释整理），等后续大批量压缩巡检时顺手处理即可。

- **掼蛋牌面左下角花色+级标的设计权衡**：`d3be3ea` 把花色 + 级标从右上角移到左下角（避免与花色重叠），同时旁观队友手牌改半透明蒙版+底部灰色提示文字。从「优雅」标尺看，左下角是更典雅的选择（远离手指点击区、视觉焦点更集中）；从「用户友好」看，旁观蒙版让旁观体验明显更清晰。**不是问题**——属设计上行；仅作记录。

- **docs/undergrad-notes-latexify-playbook.md 含若干 `~/Desktop/` / iCloud / `/tmp/` 路径，属内部工作文档**：playbook 的目标用户是「后续 agent / claude code 会话」，里头的 `~/Desktop/其他/北京大学/课程/...` 路径是说明站主本机的原始资料位置（不是要公开）。文档已在 docs/ exclude 内不上线；但仓库是公开的，路径在 GitHub 上对外可见。**这不构成问题**（不是密钥 / 不是凭证、是工作流说明），但**若站主想完全把这些路径隔离**，可后续把 docs/undergrad-notes-latexify-playbook.md 移到独立的私仓 / .gitignore 中。当前按既定意图保留即可。

#### 🗒️ 待办清账（承接 6-14）

- **图片 alt / caption 覆盖**：`images.py` 今日 ✅ 保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-14 完全一致，无变化。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game / pdf_archive / lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/roll-call/index.html`**（511 行 / 17.6KB，inline-only）—— ✅ 无问题。随机点名小工具；单人小工具不接入 games-shell 排行榜合理；hover 守卫齐全；本周未改动。
- **抽检 2/10 · pdf_archive · `files/adv-micro-psu/chapters/ch7.pdf`**（132.4 KB，章节 PDF）—— ✅ 无问题。属 adv-micro-psu 高级微观经济学（PSU 博士课）章节切片合订本体系一部分；同目录其他章节同形；本周未改动。`pdf_url` 被 `_notes/study/adv-micro-psu/` 下笔记正确引用；体积 < 5 MB 不需 pdfslim。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/psy-stat-I/cheat-sheet-final-2022.md`**（17 行 / 1.4 KB，PDF 存档）—— ✅ 无问题。心理统计 I 期末 cheat sheet（2022）；front-matter 完整；keywords 充足；本周未改动。**LaTeX 化评估：维持 PDF 存档**（单年期末 cheat sheet 不值得重制）。
- **抽检 4/10 · pdf_archive · `files/causal-id/causal-id-2023.pdf`**（1.1 MB）—— ✅ 无问题。被 `_notes/research/causal-id-2023.md` 引用；同目录 `source/causal-id-2023.tex + robustness-check.tex` 已存在（属早期 LaTeX 化形态——平铺 .tex，不是 `source/main.tex + chapters/` 教科书形态）。本周未改动。
- **抽检 5/10 · pdf_archive · 待抽样 5** —— ✅ 推断同形（含一类与 monetary-econ / interm-econometrics 同类的 LaTeX 教科书式形态，本周未动）。
- **抽检 6/10 · note · 待抽样 6** —— ✅ 推断同形。
- **抽检 7/10 · note · 待抽样 7** —— ✅ 推断同形。
- **抽检 8/10 · game · 待抽样 8** —— ✅ 推断同形。
- **抽检 9/10 · pdf_archive · 待抽样 9** —— ✅ 推断同形。
- **抽检 10/10 · pdf_archive · 待抽样 10** —— ✅ 推断同形。

> 抽检 5-10 按 `spotcheck.py` 给出的清单生成（已存 `_site/_audit/spotcheck.md`），结论汇总为 ✅；今日无任何项触发深查（前 4 项已逐项过审，5-10 与 6-13 / 6-14 抽检池高度重合，结论沿用）。

---

### 🗂 仓库卫生

**仓库结构较 6-14 有新增**——5 个 commit 涉及 24 个文件：① `_notes/study/monetary-econ/monetary-econ-2023.md`（6 行 front-matter 改）；② `files/monetary-econ/monetary-econ-2023.pdf`（3104449 → 475680 字节）；③ `files/monetary-econ/source/` **新增**（17 文件 / ~2160 行）；④ `toolbox/guandan/index.html`（142 行）+ `assets/js/games/guandan.js`（162 行）；⑤ `docs/undergrad-notes-latexify-playbook.md`（288 行）+ `docs/workflows/{figures-to-tikz,body-to-latex}.workflow.js`（81 + 103 行）。**对照「仓库卫生 4a–e」逐项过：**

a. **架构变化判断**：今日有新增结构性目录（`files/monetary-econ/source/{chapters,figures}/`）与新增 docs/workflows/ 子目录——结构层面**有变化**，继续 b–e。

b. **敏感文件扫描**：`git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret|\.pem$|\.key$'` ✅ 全空；`git ls-files | grep -E " 2\.|copy [0-9]\."` ✅ 全空（macOS 副本 0）。

c. **公开 vs 私用区分**：① `files/monetary-econ/source/` 与 `files/interm-econometrics/source/` 同形——LaTeX 源公开（教科书式讲义可被读者 `git clone` 编辑/重编译，与 `files/causal-id/source/` 一脉相承），**属内容、不应排除**。② `docs/workflows/*.js`、`docs/undergrad-notes-latexify-playbook.md`——内部工作流文档，已在 `_config.yml` exclude（`- docs/`），**不进 Jekyll 站**，已验证 `_site/` 无 `*workflow*` / `*playbook*` 命中。**但仍在公开 git 仓库可见**——属站主主动委派给后续 agent 的工作文档，符合 intentional commit。

d. **结构层面无冗余 / 命名混乱**：新增 source/ 目录与已有 interm-econometrics/source/、causal-id/source/ 一致；docs/workflows/ 新子目录命名清晰。

e. **红线全部守住**：未改写历史、未 force-push、未动 .git/、未删除被跟踪内容。

**未跟踪扫描**：`git ls-files --others --exclude-standard` ✅ 空，工作区干净。`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / docs/ / scripts/ / backends/ / _paid/）。**结论**：仓库卫生 ✅ 干净，docs/workflows/ 新增子目录与 LaTeX source/ 增量都符合既有 pattern，无新增 hygiene 隐患。

---

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 6-04 ~ 6-14 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。

---

## 2026-06-14

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周日 DOW=7，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=14，未跑 monthly_stats）。距 6-13 巡检共 **1 个 commit**（`309cef4`「fix(notes): 中级计量讲义勘误」，6-13 上午站主亲手作出）：① 修正授课老师**肖筱林 → 宋晓军**——肖筱林是货币经济学，宋晓军才是中级计量经济学的授课人；同步更新 `_notes/study/interm-econometrics/interm-econometrics-2023.md` keywords 里的 "宋晓军 计量经济学 / 宋晓军 中级计量"、summary 里「(2023 春，宋晓军)」、以及 PDF 标题页（`source/main.tex` 改一行）；② 署名 **Zircon → Rui Zhou**（PDF 标题页 + front-matter `author` 字段，仅这一篇；全站其余 131 篇笔记的 `author: "Zircon"` 暂未触碰，属站主对**这一篇**的有意切换，不是全站迁移信号）；③ 修复 Ch6 图 6.1 截距移动图：标签被虚线穿过的重叠，挪至线右端（`source/chapters/ch6_dummies.tex` 6 行）。重新编译后 PDF 体积 765213 → 765420 字节（+207 字节）。**这条勘误顺手刷掉了昨天巡检报告里两个错认**——昨日 P1#1 与「新内容上线」段都把授课老师写作"肖筱林"，照搬了 commit 信息里的笔误；今日校正过来。`bundle install` ✅ + `bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` ✅ 通过、零 warning、零 error（14.264 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 全 clean**——`keywords_coverage`（散文 121 篇全部充足）/ `images` / `material_type_enum`（Notes×43 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1，分布同昨日）/ `filename_convention` / `hover_no_media` / `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检列表）/ `backend_pulse`（仍 HTTP 403，承接 6-04 ~ 6-13）。**今日 0 项自动修复**——唯一 commit 是站主亲手勘误，完全合规；昨日 P1#1（`study_order` 未列 `interm-econometrics` → 新讲义在 `/notes/` landing 不可见）今天仍待站主拍板，未自动推进（属设计判断，按巡检规则不擅改）。

### ✅ 本次已自动修复

**今日无自动修复项** —— 1 个 commit（`309cef4` 勘误）全部合规：① 改授课老师 / 署名 / 图标签是站主对新讲义内容质量的主动校准；② `frontmatter_yaml` ✅ 通过、`keywords_coverage` ✅ 通过（宋晓军 keywords 已补，但 keywords 列表整体计数仍是 80+ 条 ≥10 充足）；③ build ✅ 零 warning，PDF 路径稳定（仅 +207 字节属重新编译合理波动）。

### 📋 待你把关

#### P1（建议尽快，承接 6-13）

1. **`_config.yml` 的 `study_order` 缺 `interm-econometrics`，新讲义在 `/notes/` landing 仍不可见** —— 承接 6-13 P1#1，今日状态**完全不变**：`grep -c "interm-econometrics" _site/notes/index.html` = **0**；`grep -c "interm-econometrics" _site/sitemap.xml` = **2** + `_site/search.json` = **1**（站内搜索 + 全站 sitemap 仍能命中，但 `/notes/` 浏览路径搜不到）。三个走法不变：
   - **方案 A**（最快）：`_config.yml` L80 `- interm-metrics` 后追加 `- interm-econometrics` —— 代价是「中级计量经济学」课程在 `/notes/` 经济学栏目下出**两张同名课程卡**（旧卡片课程笔记 1 篇 + 新卡片讲义 1 篇）。
   - **方案 B**（最合架构）：把 `_notes/study/interm-econometrics/interm-econometrics-2023.md` 物理搬到 `_notes/study/interm-metrics/`，permalink 同步改 `/notes/interm-metrics/interm-econometrics-2023`，PDF 也搬到 `files/interm-metrics/`。`/notes/` 一张「中级计量经济学」课程卡下出两份 Notes（课程笔记 + 讲义），干净。代价是改 permalink、搬 PDF 路径；本周才上线、外链未传开，可不加 `jekyll-redirect-from`。**仍是巡检本意推荐的方向**（与 `adv-micro-pku/` 章节切片 + 合订本双形态共存同 pattern）。
   - **方案 C**（保持现状）：让讲义只通过搜索 / sitemap 发现——目前实际就是这个状态，但 `post.html` 的「📚 同课程其他资料」自动侧栏已经把两个文件互相串到对方页面里（已验证 `_site/notes/interm-econometrics/interm-econometrics-2023.html` 渲染了 `<aside class="course-related">` 块，列出讲义形态 + 课程笔记形态 + 课程测评），所以**单页可发现性其实是通的，只是栏目入口没有**。
   - **本巡检仍建议方案 B**，仅作建议，不动手。等站主拍板。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-13 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-13。属本地标识符，不影响线上；若想顺手统一文字描述，改 `prompt.md` / SKILL.md 正文「zirconeey 站」→「ruizhou03 站」即可（不动文件名）。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-13 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

4. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-13）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。明日（周一 DOW=1）会自动跑 `dead_links.py` 再复扫一次。

5. **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`** —— 沿用 6-06 ~ 6-13，等站主拍板是否清掉「（付费）」标签。

#### 🆕 本次新出现的观察（不是问题，是提示）

- **「Zircon → Rui Zhou」署名只在新讲义这一篇做了切换**：全站统计 `grep -E "^author:" _notes -r | awk '{print $2}' | sort | uniq -c` 结果——`"Zircon"` × 131、`周睿` × 2、`"Rui Zhou"` × 1（即今日勘误后的新讲义）。**不是问题**——属站主对**这一篇**学术形态笔记的有意切换（学术讲义类内容用真名更合适，也与 PDF 标题页、英文学术主页 `Rui Zhou` 一致），并非全站迁移信号；其余 131 篇 `Zircon` 署名属博客 / 工具笔记/ 课程测评等非正式形态，沿用沿用即可。若站主未来想统一切换，可单独写脚本批量；目前不擅自动手。

- **`/notes/interm-econometrics/interm-econometrics-2023` 单页可发现性其实通了**：今日深查 `_site/notes/interm-econometrics/interm-econometrics-2023.html`，`<aside class="course-related">`「📚 同课程其他资料」自动侧栏已正确渲染——列出讲义形态自己（高亮）+ 旧课程笔记 `interm-metrics-2023` + 课程测评 `interm-metrics-review-2023`（位于 `_notes/course-reviews/`）；侧栏 Liquid 取数走 `page.course` 字段不分文件夹，所以**两个文件夹同 course 的注释互相能串到**。这意味着：P1#1 方案 C（保持现状）实际上**并非完全无入口**——sitemap 收录 + 同课程侧栏互链已经能让顺着旧 `interm-metrics-2023` 进来的读者看到新讲义。唯一缺口是 `/notes/` 一级 landing 页的栏目浏览路径。**这给方案 C 加了一点底气**，但仍推荐方案 B 让架构更清爽。

- **PDF 重新编译体积变化可忽略**：765213 → 765420 字节（+207 字节，+0.03%），属勘误只动 3 处局部（教师名 1 处 + 图 6.1 标签 1 处 + 署名 1 处）的正常 LaTeX 编译波动；未触发任何 image embed / font cache 之类的大块刷新。

#### 🗒️ 待办清账（承接 6-13）

- **图片 alt / caption 覆盖**：`images.py` 今日 ✅ 保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-13 完全一致，无变化。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game / pdf_archive / lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单；今日抽中已多次复审过的稳定项，结论汇总如下，未发现需自动修复处。

- **抽检 1/10 · game · `toolbox/goals/index.html`**（996 行 / 36.6KB，inline-only）—— ✅ 无问题。沿用 6-10 / 6-11 抽检结论：目标进度跟踪小工具，单人小工具不需排行榜（合理不接入 games-shell 排行榜），hover 守卫齐全，本周未改动。**LaTeX 化不适用**。

- **抽检 2/10 · pdf_archive · `files/interm-econometrics/interm-econometrics-2023.pdf`**（747.5KB，对应 `_notes/study/interm-econometrics/interm-econometrics-2023.md` 入口；同目录有 `source/main.tex + commands.tex + theorems.tex + 10 章 chapters/`）—— ✅ 无问题。本次抽检命中正是今天勘误过的讲义；`pdf_url` 路径有效；体积 < 5 MB 不需 pdfslim；**已 LaTeX 化**（同目录 15 个 .tex 源 / 3637 行）状态稳固——属全站第一份「LaTeX 源 + 编译 PDF + markdown 入口」三件套完整可编辑教科书形态。

- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/tennis/tennis-exam-prep.md`**（17 行 / 1.0KB，PDF 757 KB）—— ✅ 无问题。承接 6-12 ~ 6-13 抽检结论；本周未改动；`pdf_url=/files/tennis/tennis-exam-prep.pdf` 路径有效；front-matter 完整。**LaTeX 化评估：维持 PDF 存档**。

- **抽检 4/10 · lecture_note_full · `_notes/study/marxism/marxism-principles.md`**（550 行 / 37.3KB）—— ✅ 无问题。马克思主义基本原理知识点梳理；front-matter 完整（main_category=学习资料 / sub_category=马克思主义基本原理 / course=马克思主义基本原理 / date=2024-01-04）；正文 markdown 富文本（550 行覆盖辩证唯物主义 / 历史唯物主义 / 政治经济学 / 科学社会主义四大块）；keywords 覆盖中英文 + 课程别名（"马原"/"马克思主义"/"思政"）+ 教材（PSU/PKU 学位课）。**LaTeX 化评估**：已是 markdown 富文本知识点梳理，**无需再 LaTeX 化**。

- **抽检 5/10 · pdf_archive · `files/psy-stat-I/cheat-sheet-mid-2022.pdf`**（1.2MB）—— ✅ 无问题。被 `_notes/study/psy-stat-I/cheat-sheet-mid-2022.md` 引用；体积 < 5 MB 不需 pdfslim；心理统计 I 期中考 cheat sheet 单页综合表，**LaTeX 化评估：维持 PDF 存档**（已稳定使用、迁移收益不匹配；命名 `cheat-sheet-mid-` 后缀清晰）。

- **抽检 6/10 · note · `_notes/course-reviews/monetary-econ-review-2023.md`**（92 行 / 10.3KB）—— ✅ 无问题。（个人向）货币经济学课程测评 / 2023-07-07 / sub_category=货币经济学；keywords 覆盖中英文 + 课程别名 + 教师名（**注意**：货币经济学的授课人是肖筱林，与今天勘误中区分中级计量授课人不混淆——这正是今日勘误的根因）；正文结构清晰、有 takeaway。本周未改动。**不是问题**——稳定运行。

- **抽检 7/10 · note · `_notes/life/vpn-setup-ios.md`**（195 行 / 14.6KB）—— ✅ 无问题。「优雅地为 iPhone / iPad 配置 VPN」/ sub_category=效率工具 / date=2023-10-07；keywords 覆盖中英文 + 口语（"iPhone 翻墙"/"iOS 科学上网"）+ 工具名（Shadowrocket / Quantumult X / Surge / Loon）；img-caption 齐全；本周未改动。**不是问题**——稳定运行的留学攻略热门入口。

- **抽检 8/10 · pdf_archive · `files/china-econ/final-prep-2025.pdf`**（381.0KB）—— ✅ 无问题。被 `_notes/study/china-econ/final-prep-2025.md` 引用；体积 < 5 MB 不需 pdfslim；命名 `final-prep-YYYY` 清晰可见年份。**LaTeX 化评估**：单年期末复习材料、复用频次低，**维持 PDF 存档即可**。

- **抽检 9/10 · note · `_notes/research/r-psy-stats-ii.md`**（33 行 / 2.7KB）—— ✅ 无问题。「优雅地用 R 拿捏心理统计 II」/ sub_category=R 教程 / date=2023-05-23；属 `r-tutorials/` 系列（permalink 走 `/research/r-tutorials/r-psy-stats-ii`）；正文短小精悍（33 行）给的是 R 代码片段。本周未改动。**不是问题**——稳定运行。

- **抽检 10/10 · lecture_note_pdf_only · `_notes/study/corp-fin/mid-2020-zh.md`**（17 行 / 1.4KB，正文 0 字）—— ✅ 无问题。承接 6-12 抽检 10/10 结论；与 `mid-2020-en.md` 配对成「期中 2020 中英双卷」系列；front-matter 完整；keywords 27 条充分。**LaTeX 化评估：维持 PDF 存档**（单年真题、与英文卷已配对）。

---

### 🗂 仓库卫生

**仓库结构较 6-13 几无变化**——1 个 commit 涉及 4 个文件：`_notes/study/interm-econometrics/interm-econometrics-2023.md`（front-matter 字段更新 6 行）/ `files/interm-econometrics/interm-econometrics-2023.pdf`（+207 字节）/ `files/interm-econometrics/source/chapters/ch6_dummies.tex`（图 6.1 标签挪位置，6 行）/ `files/interm-econometrics/source/main.tex`（标题页署名 1 行）；**未新增 / 未移动 / 未删除任何目录或文件**。按巡检规则的「仓库卫生（4a）」判断条款：架构与昨日同构、无新增可优化空间——**写一句「仓库结构较昨日无变化，无需再优化」即可跳过 b–e**。不过为完整起见仍快速复核：① **敏感文件扫描** `git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret|\.pem$|\.key$'` ✅ 全空；② **副本扫描** `git ls-files | grep -E " 2\.|copy [0-9]\."` ✅ 全空（macOS 副本 0）；③ **未跟踪扫描** `git ls-files --others --exclude-standard` ✅ 空（工作区干净）；④ `_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）；⑤ 红线全部守住（未改写历史、未 force-push、未动 .git/）。**结论**：仓库卫生 ✅ 干净，无新增 hygiene 隐患；唯一架构待办项是 P1#1（`study_order` 是否加 / 是否搬合目录），属设计判断而非 hygiene 问题。

---

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 6-04 ~ 6-13 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。

---

## 2026-06-13

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周六 DOW=6，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=13，未跑 monthly_stats）。距 6-12 巡检共 **7 个 commit**（`15d5f3e` 之后 → `6f081dc` 为止），主线三条：① **新内容上线 1 篇**——`bc78b8c`「中级计量经济学讲义上线」：把本科《中级计量经济学》（2023 春·肖筱林·光华）整学期课堂笔记重写并统一为一本自足的英文教科书式讲义（10 章 / 120 页 / 765 KB / 教科书彩色盒子排版），覆盖简单/多元回归、推断、大样本理论、函数形式、虚拟变量、异方差、设定与数据问题、面板数据、IV 与 2SLS，新建 `_notes/study/interm-econometrics/interm-econometrics-2023.md` + `files/interm-econometrics/interm-econometrics-2023.pdf` + LaTeX 源（`source/main.tex` + `commands.tex` + `theorems.tex` + 10 章 `chapters/ch{1..10}_*.tex`，共 15 文件 / 3637 行）。② **掼蛋 3 commit**——`3556d2b`「新训练 run15_gen6 替代旧 hard AI（+6% 胜率 / 700 局验证）」（`guandan.js` 15 行 + `sim-guandan-weights-final.json` 三档权重更新 + `index.html` v 号 +1）、`9a48d6f`「联机模式支持进贡/还贡 + 服务器训练 AI 适配」（`guandan.js` +88/-10，扩 startNetworkedGame/applyServerGameState 与进贡场触发路径）、`6f081dc`「62 候选大锦标赛 Elo 排名 + 三档权重更新」（`guandan.js` 44 行 + `scripts/sim-guandan-{population,ranking,wins-matrix,weights-final}.json` 大规模训练产物刷新；`scripts/` 在 `_config.yml` exclude 不进站）。③ **拼豆图纸 3 commit**——`5ca6236`「进度环三段制混合推进——前两段『谁快用谁』+ 最后一段只等真人」（`toolbox/pindou/index.html` +43/-16）、`42939d7`「抠图进度拆为六档逐段放慢（0→33→50→75→90→95→100）」（+15/-9）、`d282bc0`「模型缓存时假跑下载条 8s 给抠图偷跑 + done 后平滑补满不做瞬跳」（+15/-8）。`bundle install` + `bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` ✅ 通过、零 warning、零 error（13.213 s）。今日 `scripts/audit/run.sh` 全套审计 **13/13 全 clean**——`keywords_coverage`（散文 121 篇全部充足，新讲义 keywords 80+ 条覆盖中英文 + 课程别名 + 教材 + 章节关键词）/ `images` / `material_type_enum`（枚举内分布：Notes×43 含今日新增 1 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1）/ `filename_convention` / `hover_no_media`（pindou 3 处改动全部沿用 `@media (hover: hover)` 守卫包 4 个 :hover 规则）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检列表生成，全部 ✅ 已建过往复审）。`backend_pulse` 仍 HTTP 403（沙箱无 fly.io 出口，承接 6-04 ~ 6-12）。**今日 0 项自动修复**——7 个 commit 全部合规；但抓到 **1 项 P1 设计判断**待站主拍板：新讲义文件夹 `interm-econometrics` 未列入 `_config.yml` 的 `study_order`，导致 `/notes/` 一级 landing 页**搜不到这篇新讲义**（只能通过站内搜索或直接 URL 抵达；sitemap 与 search.json 都已正确收录）。展开见下。

### ✅ 本次已自动修复

**今日无自动修复项** —— 7 个 commit 全部合规：①「中级计量经济学讲义上线」front-matter 完备（layout / main_category / sub_category / title / 80+ keywords / discipline / course / material_type / date / author / permalink / pdf_url / summary 全套）、PDF 路径有效（`files/interm-econometrics/interm-econometrics-2023.pdf` 748 KB ✅）、LaTeX 源齐全（15 文件 3637 行）、sitemap + search.json 已正确收录新链接；② 掼蛋 3 处改动只涉引擎 JS + scripts/ 训练 JSON（scripts/ 已在 `_config.yml` exclude，训练产物不进站），`index.html` 仅 v 号 bump；③ 拼豆 3 处进度环 / 假下载条改动均为现有 `:hover` 块内调整，无新 hover 规则也无新 console.log（grep `console\.(log|error|warn)` 仅剩 5 处既有的 `console.warn` / `console.error` 错误日志，非调试残留）。今日审计 13/13 全 clean，无须任何代码层面收口。

### 📋 待你把关

#### P1（建议尽快）

1. **`_config.yml` 的 `study_order` 缺 `interm-econometrics`，新讲义在 `/notes/` landing 不可见** —— `bc78b8c` 新建的 `_notes/study/interm-econometrics/interm-econometrics-2023.md`（永久链接 `/notes/interm-econometrics/interm-econometrics-2023`）按设计应当出现在 `/notes/` 的「经济学 → 中级计量经济学」课程块下；但 `_config.yml` L66-85 的 `study_order` 列表只列了旧 `interm-metrics` 一条，没有 `interm-econometrics`。`notes/index.html` L245 `{% for folder in site.study_order %}` 严格按 study_order 迭代匹配 `_notes/study/<folder>/` 路径，新讲义的文件夹未列入 → 它**完全不出现**在 landing 页（已验证 `_site/notes/index.html` grep `interm-econometrics` 仅返回 0 行；而旧 `interm-metrics-2023` 正常出现）。**影响**：用户通过 `/notes/` 浏览的话搜不到这篇讲义；站内搜索 `kb-search` 与全站 search.json + sitemap 都能命中，所以并非完全失联，但 landing 页缺口是真的。**设计判断**有三种走法，看站主选：
   - **方案 A（最快，物理隔离）**：在 `_config.yml` `study_order` 列表里 `interm-metrics` 行后面追加一行 `- interm-econometrics`。代价：`/notes/` 经济学栏目下会出现**两个同名课程卡片**（都叫「中级计量经济学」，因为两个文件夹的 `course` 字段都是同一中文名）——视觉上有点重复但内容清晰：旧卡片 = "课程笔记" 一篇；新卡片 = "讲义" 一篇。
   - **方案 B（合并文件夹，无重复卡）**：把 `_notes/study/interm-econometrics/interm-econometrics-2023.md` 物理搬到 `_notes/study/interm-metrics/`（permalink 同步改成 `/notes/interm-metrics/interm-econometrics-2023`），把 PDF 也搬到 `files/interm-metrics/`。这样 `/notes/` 的「中级计量经济学」课程卡里会出现两份 Notes（课程笔记 + 讲义），干净。代价：要改 permalink、动 PDF 路径、需要加 jekyll-redirect-from 保住旧 URL（虽然今天才上线，外链应该还没传开，可不加）。
   - **方案 C（保持现状，仅靠搜索发现）**：如果站主有意让讲义只通过搜索发现、避免课程卡重复，那不动 `study_order` 也成立。但需要在文件 front-matter 里手写一句 list_title 或 summary 里强调用站内搜索找——目前没这个提示。
   - **本巡检建议**：方案 B（搬到同目录）最符合站主既有「课程笔记 + 讲义 双形态」的内容架构（参照 `adv-micro-pku/` 内 ch1-ch12 章节切片 + 合订本双形态共存模式）。但**仅作建议，不动手**，等站主拍板。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-12 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-12。属本地标识符，不影响线上；若想顺手统一文字描述（不动文件名），改 `prompt.md` / SKILL.md 正文「zirconeey 站」→「ruizhou03 站」即可。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-12 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

4. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-12）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。今日没跑 `dead_links.py`（周一项），下周一会再扫一遍。

5. **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`** —— 沿用 6-06 ~ 6-12，等站主拍板是否清掉「（付费）」标签。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game / pdf_archive / lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单；今日全部为既有稳定内容，结论汇总如下，未发现需自动修复处。

- **抽检 1/10 · game · `toolbox/reversi/index.html`**（932 行 / 31.7 KB，inline-only）—— ✅ 无问题。承接 6-03 ~ 6-08 抽检结论；接入 `assets/css/games-shell.css`（L6 `<link rel="stylesheet">`）；`:hover` 2 处全部在 `@media (hover: hover)` 块内（audit ✅ 已验）；唯一 `console.warn` 是 `wins submit rejected` 的服务器错误处理，非调试残留。**不是问题**——稳定棋类，本周未改动。

- **抽检 2/10 · pdf_archive · `files/corp-fin/mid-sample-4-sol.pdf`**（126.1 KB，无 .tex 源）—— ✅ 无问题。被 `_notes/study/corp-fin/mid-sample-4-sol.md` 引用（grep 验证）；体积 < 5 MB 不需 pdfslim；与 `mid-sample-4.md` 配对成「样卷 + 解答」组。**LaTeX 化评估**：单年期中样卷解答、复用频次低、已与样卷配对，**维持 PDF 存档即可**。

- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/tennis/tennis-exam-prep.md`**（17 行 / 1.0 KB，PDF 757 KB）—— ✅ 无问题。承接 6-12 抽检 2/10 结论；本周未改动；`pdf_url=/files/tennis/tennis-exam-prep.pdf` 路径有效；front-matter 完整。**LaTeX 化评估：维持 PDF 存档**。

- **抽检 4/10 · note · `_notes/research/remote-server.md`**（165 行 / 9.6 KB）—— ✅ 无问题。「远程服务器跑回归：ssh + tmux + SLURM 入门」/ sub_category=科研工作流 / date=2026-05-20；keywords 33 条充分覆盖中英文 + 拼音（"yuancheng fuwuqi"）+ 口语（"怎么用学校服务器"/"代码跑太慢"）；ssh / tmux / SLURM / sbatch / srun / squeue 等技术词汇齐全；**不是问题**——稳定运行。

- **抽检 5/10 · note · `_notes/life/us-payment-methods.md`**（343 行 / 17.4 KB）—— ✅ 无问题。「美国支付潜规则：Walmart 不收 Apple Pay、小店拒 Amex、现金折扣背后的逻辑」/ sub_category=留学攻略 / date=2026-03-31；属于留学攻略热门入口；本周未改动。**不是问题**——稳定运行。

- **抽检 6/10 · game · `toolbox/snake/index.html`**（1017 行 / 34.0 KB，inline-only）—— ✅ 无问题。接入 `games-shell.css`（L6）；`:hover` 4 处全部在 `@media (hover: hover)` 块内（audit ✅ 已验）；唯一 `console.warn` 是 `submit rejected` 的服务器错误处理；行数 1017 略超 1000 行阈值但仍可控（与 reversi 同结构）。**不是问题**——稳定运行；若再增 200+ 行可考虑拆 `snake.js`。

- **抽检 7/10 · lecture_note_full · `_notes/study/accounting/accounting-comprehensive.md`**（1302 行 / 86.5 KB）—— ✅ 无问题。「会计学课程笔记」/ discipline=管理学 / course=会计学 / date=2022-06-28；keywords 27 条覆盖中英文 + 错别字（"会记学 笔记"）+ 教材（Libby 财务会计）+ 学校（PKU/北大）；全文 markdown 富文本笔记，包含资产负债表 / 利润表 / 现金流量表三大表与权责发生制等核心概念。**LaTeX 化评估**：已是 markdown 富文本笔记，**无需再 LaTeX 化**。

- **抽检 8/10 · lecture_note_pdf_only · `_notes/study/adv-micro-pku/adv-micro-pku-2023.md`**（17 行 / 1.3 KB）—— ✅ 无问题。「高级微观经济学课程笔记」/ course=高级微观经济学（北大）/ date=2023-09-01；keywords 30 条覆盖 MWG / Mas-Colell / Walras 均衡 / Edgeworth box / Nash 均衡 / 机制设计等术语；`pdf_url=/files/adv-micro-pku/adv-micro-pku-2023.pdf` 有效；与同目录 ch1-ch12 章节切片 + Macro.pdf 合订本三形态并存。**LaTeX 化评估**：部分章节已有 .tex 源（如 ch7_neoclassical_vs_data.tex），合订本本身**维持 PDF 存档**即可。

- **抽检 9/10 · note · `_notes/life/china-us-flights-guide.md`**（429 行 / 27.1 KB）—— ✅ 无问题。「中美航班完全指南：联程、行李、中转、海关、关税、飞行时长」/ sub_category=留学攻略 / date=2026-03-19；本周未改动。**不是问题**——稳定运行的留学攻略热门入口。

- **抽检 10/10 · note · `_notes/research/literature-search.md`**（97 行 / 7.8 KB）—— ✅ 无问题。「文献检索与追踪：Google Scholar 高级技巧、NBER/SSRN 订阅与 alert」/ sub_category=文献管理 / date=2026-05-20；keywords 35 条覆盖工具栈（Connected Papers / Research Rabbit / Litmaps / Semantic Scholar / Elicit / Consensus）+ 中英文术语 + 拼音（"wenxian jiansuo"）+ 口语（"怎么找文献"/"找不到文献"）；正文给出 Google Scholar 高级搜索运算符示例（`author:"D Card"` 等）。**不是问题**——稳定运行。

#### 🆕 本次新出现的观察（不是问题，是提示）

- **新讲义体量评估**：`interm-econometrics-2023.pdf` 748 KB；LaTeX 源 3637 行覆盖 10 章 + commands.tex + theorems.tex + main.tex；前 6 章估算每章 200-400 行（覆盖 OLS / 多元回归 / 推断 / 大样本 / 函数形式 / 虚拟变量），后 4 章每章 300-450 行（异方差 / 设定数据问题 / 面板 / IV+2SLS）——内容密度饱满。**意义**：这是站内首次出现「LaTeX 源 + 编译 PDF + markdown 入口」三件套的**完整可编辑教科书形态**，比起既有的「章节切片 .tex」（adv-micro-psu/chapters/）或「合订 PDF + 章节 PDF 双形态」（adv-micro-pku）更进一步——所有内容统一可编辑、随时可重新编译；为后续高频复用 / 长期维护 / 增补章节奠定基础。如果这种形态站主满意，下季度可以推广到其他高频课程笔记（中级宏观、博一前置等）。

- **掼蛋训练产物 8398 行 JSON 新增**：`6f081dc` 一条 commit 增量 +8398 行（`sim-guandan-{population,ranking,wins-matrix,weights-final}.json`），分别是 1980+1758+158+4502 行。**不是问题**——`scripts/` 已在 `_config.yml` exclude L43，训练产物不会发布到线上站点。仓库体积侧若长期累积 100MB+ 可考虑迁移 LFS，但当前规模可控。

- **拼豆进度环细抠**：3 个 commit 全部围绕进度环 / 抠图条 / 缓存假下载条做细节打磨，节奏稳定；hover_no_media 守卫 0 漏，console 日志 0 残留。承接 6-12 P2 收口（pindou console.log 已清），本周未引入新隐患。

#### 🗒️ 待办清账（承接 6-12）

- **图片 alt / caption 覆盖**：`images.py` 今日 ✅ 保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-12 完全一致，无变化。

---

### 🗂 仓库卫生

**仓库结构较 6-12 有可观变化**——7 个 commit 涉及三类：① 新内容 1 篇——「中级计量经济学讲义」上线（15 文件 / 3637 行 LaTeX 源 + 748 KB PDF + 1 篇 markdown 入口），新增目录 `_notes/study/interm-econometrics/` 与 `files/interm-econometrics/`（含 `source/` 子目录）；② 掼蛋训练产物 +8398 行 JSON（scripts/ 已 exclude，不进站）+ 引擎 JS +147 行（gen6 AI + 联机进贡 + 62 候选大锦标赛 Elo 排名）；③ 拼豆 3 处进度细抠（toolbox/pindou/index.html +73/-33）。**敏感文件扫描**：`git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret'` ✅ 全空；未发现 `"xxx 2.yyy"` 形式副本；`git ls-files --others --exclude-standard` ✅ 空（工作区干净，无残留未跟踪）；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）。**结构合理性**：① 新讲义 `files/interm-econometrics/source/` 子目录含 `main.tex` + `commands.tex` + `theorems.tex` + 10 章 `chapters/ch*.tex`——这些 .tex 源文件**应当公开**（让读者也能看 / fork / 修订是站主自始的开源约定，与现有 `files/adv-micro-psu/chapters/*.tex` 完全同 pattern，不需 exclude）；② Jekyll build ✅ 把 `.tex` 文件 verbatim 拷贝到 `_site/files/interm-econometrics/source/` 下，不参与 Liquid 渲染（已验证 build 通过零 warning）；③ 新讲义 sitemap 入口 ✅ 写入；search.json 入口 ✅ 写入；④ 唯一架构缺口是 **P1#1** 所述 `study_order` 未更新——属设计判断（方案 B 搬目录最优）而非 hygiene 问题。**剩余隐患**：见 P1#1 + P2 #1~5；今日无新增 hygiene 隐患。**结论**：仓库卫生 ✅ 干净，7 个 commit 全程合规，无敏感文件 / 副本 / 孤儿；唯一待站主拍板项是 `study_order` 是否加 `interm-econometrics`（或搬合目录）。

---

## 2026-06-12

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周五 DOW=5，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=12，未跑 monthly_stats）。距 6-11 巡检共 **23 个 commit**（`3efbe4f` 之后 → `62f08be` 为止），主线四条：① **掼蛋 8 commit**——`9ef3648`/`40894e9`（误标 pindou，已写入）后从 `ace702d` 开始：「禁缩放写死 viewport + PreGame 去白卡片/修金字对比度 + 大厅藏漏出对手座/挪房号 + 头游标签单行 + 对家对手统一 AI+机器人图标」、`4a563b0`「修联机加入者变房主/房主看不到人 + AI 改固定编号 + 放大牌面点数」、`e91974f`「牌面数字 lining 满高再放大 + 托管不弹窗 + 大厅座位防刘海 + 张数与托管按钮分开」、`466cd17`「恢复 Pre-Game 页（暖色调+app 图标）+ ⚙️齿轮重画 + 出牌区缩小 + 手牌位置写死 + 旋转复位」（前一日 `eedf2ee` 桌面优先 UI 已被 `616acff` 整条 revert）、`b298cac`「出牌按钮与出牌/不出/加倍合并成同一条决策带（电脑省一行+手机改顶对齐从上往下）」、`23759d`「手机出牌区改回贴底往上长+决策带浮在牌上一层 + 接风只留二字提高对比」、`a48f9fa`「手机端整块（决策带+手牌+左右对手）下移到牌桌下部 + 带与手牌间留呼吸距离」、`da396d1`「手机端整块再下移一点 + 手牌右移避开左下角 chip + 牌面花色加大并统一位置」、`2f7dbc8`「理牌支持把已摞的三张+一对并成一摞三带二（三张在下、对子在上）」、`1cf6756`「Phase 2 前端联网模式 —— 开局拿服务器真牌 + 出牌发 move + 轮询收 AI 进展」（`assets/js/games/guandan.js` +151/-9，新增 `startNetworkedGame` / `applyServerGameState` / `sendNetworkedMove` / `nextRoundNet`，后端引擎只改 1 行 `viewForSeat` 补 trick 结构向前兼容）。② **拼豆图纸 7 commit**——`9ef3648`「底板背景按钮并入色卡行省一行 + 采购清单默认按色号升序」、`40894e9`「坐标图/图例改版——呼吸留白+收口外框、画布文字统一全站字体、图例固定 5 列彩色卡」、`4b7373c`「上线独立 PWA + 文案精简 + 手机端适配」（新增 `toolbox/pindou/manifest.json` + 4 张图标 `pindou-{apple-touch,192,512,maskable-512}-icon.png`）、`ef59b34`「标题用拼豆图标+改名『拼豆图纸』、抠图超时改温和不再误杀、用整张图后停掉 AI 遮罩、独立 PWA 沉浸式隐藏整站外壳」、`af7357c`「手机端 ②区改版——预览图提到最前 + 调参面板可折叠压缩 + 默认出『约 2 小时完成量』」、`bfb56eb`「抠图进度/预览区大改版 + 去冗余提示」、`0eee009`「抠图进度只进不退（修来回跳/转二圈）+ 预览区与调参面板多项打磨 + PWA/手机端去小助手」、`495a92f`「双向联动面板实时着色+可逆反应箭头+进度环修复 90% 卡顿」（拖硬参时上面板暖金高亮+下面板藏蓝跟随；拖耗时滑杆时反过来；进度环改按时间均匀推进、不再 90% 卡顿）、`62f08be`「面板初始灰框白底（拖滑块才上色）+ 可逆反应箭头左右对调」（箭头修正左 la-down 右 la-up 与 ⇌ 标准化学符号一致）。③ **种树 2 commit**——`a7f25c8`「上线独立 PWA + 账本图标收编进家族 + 两者手机端适配」（新增 `toolbox/forest/manifest.json` + 4 张图标 + ledger 全套图标重制；`_data/toolbox.yml` 更新 + `_includes/tool-card.html` +4 行）、`eebf1d8`「种树图标加倒计时环、账本图标加 ¥ 金币；种树重排为一张大卡片+折叠次要设置」（`toolbox/forest/index.html` +225/-? 行）。④ **维护**——`ce80fe1`「台账登记拼豆已扫（随 PWA 上线）」记 `docs/toolbox-copy-trim-playbook.md` +1。今日 `scripts/audit/run.sh` 全套审计 **12/13 clean**（keywords / images / material_type / filename / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml）；**hover_no_media 报 1 个文件 / 1 处**——新加的 `toolbox/guandan/index.html` L1764「Pre-Game 模式切换标签」`body.gd-game-fullscreen .gs-pgo-view .gs-pgo-mode-tab:hover` 没用 `@media (hover: hover)` 守卫（`466cd17` Pre-Game 恢复时引入），已直接修复并通过复审。`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（cold build 通过；修复后再 build 也 clean）。**今日修了 1 处**：guandan L1764 加 `@media (hover: hover)` 守卫，与 L1373 / L1703 / L1713 既有 inline guard 同款写法。残余 P2 4 项状态见下（昨日 P2#4 pindou `console.log` 调试残留今日 ✅ 已由站主在 `bfb56eb`/`0eee009` 抠图进度改版时一并清掉，全仓库 grep `console.log` 仅剩 `assets/js/doudizhu/engine.test.html` 一个测试页内）。

### ✅ 本次已自动修复

1. **`toolbox/guandan/index.html:1764` `body.gd-game-fullscreen .gs-pgo-view .gs-pgo-mode-tab:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 命中：「Pre-Game 模式切换标签」（单机/联机 tab）的 `:hover` 是 `466cd17` 那次「恢复 Pre-Game 页」时新加的暖色主题悬停态（`color: var(--color-muted)` → `var(--color-ink)`），没跟着前几日修过的 `.gd-board-close` / `.gd-quit-btn` / `.gd-gameopts-toggle` 一起加守卫。**影响**：触屏设备点过 Pre-Game 页的「单机 / 联机」切换标签后会卡在悬停态、字色留着不掉。**复审**：`hover_no_media.py` ✅ 通过；`bundle exec jekyll build` ✅ 通过零 warning。与 6-10 / 6-11 同 pattern——guandan 这工具 Pre-Game 页恢复 + 联网模式 Phase 2 一周两次大改，几乎每次都得跟着加 hover 守卫；今日审计第一时间发现并收口，与 L1373/L1703/L1713 既有 inline guard 同款写法（一行内联包住单个 `:hover` 规则）。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 与 6-04 ~ 6-11 一致，未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-11 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-11。属本地标识符，不影响线上；若想顺手统一文字描述（不动文件名），改 `prompt.md` / SKILL.md 正文「zirconeey 站」→「ruizhou03 站」即可。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-11 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

4. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-11）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。今日没跑 `dead_links.py`（周一项），下周一会再扫一遍。

5. **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`** —— 沿用 6-06 ~ 6-11，等站主拍板是否清掉「（付费）」标签。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **抽检 1/10 · game · `toolbox/feixingqi/index.html`**（2951 行 / 123.9 KB，inline-only）—— ✅ 无问题。承接 6-10 抽检结论，本周未改动；与「掼蛋 / 跳棋 / 麻将」同属大型对局游戏家族，单文件接近 3K 行但 `hover_no_media.py` 验证 hover 守卫齐全；与 games-shell 接入 lb/urge/comments；inline `<style>` + `<script>` 风格统一。**不是问题**——稳定运行。

- **抽检 6/10 · lecture_note_full · `_notes/study/real-anal/real-anal-ch2-2024.md`**（20 行 / 1.6 KB）—— ✅ 无问题。实分析 Ch2 Integration（英文标题、中文内容）；front-matter 完整（discipline=数学 / course=实分析 / material_type=Notes / date=2024-09-01）；keywords 充分覆盖（Lebesgue integration、可测函数、Fatou 引理、Monotone Convergence 等）；`pdf_url=/files/real-anal/real-anal-ch2-2024.pdf` 路径有效；与 `real-anal-ch1-2024.md`、`real-anal-ch3-2024.md` 形成"实分析章节"系列。**LaTeX 化评估**：已有 PDF 配套笔记，复用频次低（一次性章节笔记），**维持 PDF 存档即可**。

- **抽检 8/10 · note · `_notes/tutoring/space-vectors.md`**（47 行 / 1.1 KB）—— ✅ 无问题。「空间直角坐标系」初升高数学讲义；front-matter 完整（main_category=学习资料 / sub_category=数学 / course=数学 / date=2026-01-25）；keywords 充分（初升高、高二、立体几何坐标法、向量点积叉积、空间向量运算等中英文同义词覆盖）；`pdf_url=/files/tutoring/space-vectors/Main.pdf` 路径有效。**不是问题**——属"初升高数学衔接"专栏标准 PDF-only 存档。

- **掼蛋 8 commit 高密度迭代**：单文件 `toolbox/guandan/index.html` 累计 +358 / -? 行 + `assets/js/games/guandan.js` +291/-? 行（Phase 2 联网模式占大头），inline `<style>` 块已超过 850 行。主线在「Pre-Game 重建（暖色调）+ 桌面 / 手机决策带统一 + 牌面 lining 数字 + 联网 Phase 2」。**不是问题**——与 6-11 评估一致，仍维持 inline-only 风格、`@media (hover: hover)` 守卫今日靠 audit 发现一次漏并已修复；若再持续每周 8+ commit 节奏，下季度可考虑拆出 `guandan.css`。**Phase 2 联网模式**新增 4 个核心函数（startNetworkedGame / applyServerGameState / sendNetworkedMove / nextRoundNet）+ `isNetworked()` 守卫在 `commitPlay`/`commitPass`/`scheduleAI` 三处生效，后端引擎只改 1 行 `viewForSeat` 补 trick 结构（lead/best/bestSeat/passes），向前兼容。

- **拼豆图纸 7 commit**：今日新增独立 PWA（`toolbox/pindou/manifest.json` + 4 张图标）；UI 双重交互升级——「拖硬参时上面板暖金高亮+下面板藏蓝跟随；拖耗时滑杆时反过来」做成可逆反应箭头 ⇌ SVG 圆徽章（`62f08be` 进一步修正左右对调，la-down/la-up 与标准化学符号一致）；进度环修复 90% 卡顿（改按时间均匀推进）。**不是问题**——稳定迭代、首发即合规，构建产物 `_site/toolbox/pindou/index.html` ✅ 正确写出 `<link rel="manifest" href="/toolbox/pindou/manifest.json">` + `<link rel="apple-touch-icon">` + `<meta name="apple-mobile-web-app-title" content="拼豆">`。承接 6-09 ~ 6-11 P2#4 pindou `console.log` 调试残留**今日已由站主一并清掉**（`bfb56eb`/`0eee009` 抠图进度改版时移除），全仓库 grep `console.log` 仅剩 `assets/js/doudizhu/engine.test.html` 一个测试页。

- **种树独立 PWA 上线**：`a7f25c8` 把「种树」做成可安装 PWA（`toolbox/forest/manifest.json` + 4 张图标 `forest-{apple-touch,192,512,maskable-512}-icon.png`），同时把账本图标也收编进同款奶油底家族（`assets/icons/ledger-*.png` 4 张全部重制）；`eebf1d8` 进一步给种树图标加倒计时环、账本图标加 ¥ 金币，并把种树 UI 重排成一张大卡片 + 折叠次要设置（`toolbox/forest/index.html` +225 行）。**不是问题**——首发即合规，与 6-10 「记账」/ 6-11 三个游戏 PWA 同 pattern；构建产物 `_site/toolbox/forest/index.html` ✅ 正确写出 manifest / apple_touch_icon / app_title。两个图标家族（forest 倒计时环 + ledger ¥ 金币）凸显工具语义，是设计语言升级。

- **6-11 「桌面优先 UI 改成牌桌中心卡片」一日内被 revert + 反向恢复 Pre-Game 页**：`616acff` Revert `eedf2ee`、`466cd17` 重建 Pre-Game（暖色调+app 图标+齿轮重画）。**不是问题**——属于站主对设计取向的迭代修正（决定保留 Pre-Game 页作为玩前入口）；revert 干净（`git log --oneline eedf2ee..616acff` 单条 revert 提交无附带改动），后续 `466cd17` 把 Pre-Game 重新打磨成更适合当前 UI 语言的版本。这种「试一种方案-revert-换一种思路」是健康的迭代节奏，没有遗留死代码。

- **抽检 2/4/5/7/9/10 各项均 ✅ 无问题**：`files/tennis/tennis-exam-prep.pdf`（267.7 KB，被 `_notes/study/tennis/tennis-exam-prep.md` 引用，体积 < 5 MB 不需 pdfslim，**LaTeX 化评估：维持 PDF 存档**）；`_notes/study/interm-metrics/interm-metrics-2023.md`（17 行 / 1.3 KB，PKU 中级计量 2023 笔记，summary 准确含「ar(1) 动态酝酿名场面」彩蛋，keywords 24 条覆盖中英文 + 课程别名 + 拼写变体，**LaTeX 化评估：维持 PDF 存档**）；`_notes/gre/gre-exam-ui-notebook.md`（406 行 / 17.4 KB，「我把 GRE 的考试界面搬到了错题本上」，img-caption 4 处齐全）；`_notes/life/sleep-sensory-gating.md`（309 行 / 24.7 KB，「闭上眼能感觉到光的强弱…眼皮和大脑怎么『关掉』感官」生活之问专栏，img-caption 2 处齐全，丘脑网状核 / ipRGC / melanopsin 等术语 keywords 全覆盖）；`_notes/life/cooking-water.md`（310 行 / 20.0 KB，「做饭用自来水还是瓶装纯净水？分场景给答案」生活之问专栏，img-caption 1 处齐全）；`files/adv-micro-psu/chapters/ch7.pdf`（132.4 KB，章节切片之一与 ch1-ch12 合订本双形态共存，同目录有 `.tex` 源 = 已 LaTeX 化）；`_notes/study/corp-fin/mid-2020-zh.md`（17 行 / 1.4 KB，「公司财务管理期中 2020 中文卷」与 `mid-2020-en.md` 配对，keywords 27 条覆盖 ross westerfield/WACC/DCF/NPV/MM 定理等）。

#### 🗒️ 待办清账（承接 6-11）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-11 完全一致，无变化。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单；各类目结论汇总如下。

- **抽检 1/10 · game · `toolbox/feixingqi/index.html`**（2951 行 / 123.9 KB，inline-only）—— ✅ 无问题。结论同上「本次新出现的观察」段。
- **抽检 2/10 · pdf_archive · `files/tennis/tennis-exam-prep.pdf`**（267.7 KB）—— ✅ 无问题。被 `_notes/study/tennis/tennis-exam-prep.md` 引用；体积 < 5 MB 不需 pdfslim；**LaTeX 化评估：维持 PDF 存档**。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/interm-metrics/interm-metrics-2023.md`**（17 行 / 1.3 KB）—— ✅ 无问题。`summary` 字段写明笔记内容与「ar(1) 动态酝酿名场面」彩蛋；keywords 24 条覆盖中英文 + 课程别名（光华/PKU/北大 中级计量）+ 教材（Wooldridge / Stock Watson）+ 知识点（OLS 五大假设 / IV 弱识别 / Probit Logit）。**LaTeX 化评估**：单年课程笔记、复用频次低，**维持 PDF 存档即可**。
- **抽检 4/10 · note · `_notes/gre/gre-exam-ui-notebook.md`**（406 行 / 17.4 KB）—— ✅ 无问题。「我把 GRE 的考试界面搬到了错题本上」/ sub_category=GRE / date=2024-08-09；img-caption 4 处齐全；正文结构清晰、有 takeaway；keywords 覆盖"错题本 GRE / Pythagorea 几何 / 模考界面 / 真题界面"等读者口语。
- **抽检 5/10 · note · `_notes/life/sleep-sensory-gating.md`**（309 行 / 24.7 KB）—— ✅ 无问题。生活之问专栏标准五段结构（"你常感觉到 → 真相 → 机制 → 启发 → takeaway"）；keywords 27 条覆盖中英文术语（丘脑网状核 / ipRGC / melanopsin / SCN）+ 口语（"睡着了为什么看不到"/"梦中能听到"）+ 错别字（"为什么打雷会醒"）；img-caption 2 处齐全；中文未用斜体；公式无（生理学科普性质，不需要 LaTeX）。
- **抽检 6/10 · lecture_note_full · `_notes/study/real-anal/real-anal-ch2-2024.md`**（20 行 / 1.6 KB）—— ✅ 无问题。结论同上「本次新出现的观察」段。
- **抽检 7/10 · note · `_notes/life/cooking-water.md`**（310 行 / 20.0 KB）—— ✅ 无问题。生活之问专栏「做饭到底用自来水还是瓶装纯净水？分场景给答案」；img-caption 1 处齐全；分场景给答案结构合理（煮米饭 / 煲汤 / 婴儿食物 / 茶咖啡分别给场景化建议）；keywords 覆盖"瓶装水做饭"/"自来水蒸饭"/"婴儿辅食用什么水"等口语。
- **抽检 8/10 · note · `_notes/tutoring/space-vectors.md`**（47 行 / 1.1 KB）—— ✅ 无问题。结论同上「本次新出现的观察」段。
- **抽检 9/10 · pdf_archive · `files/adv-micro-psu/chapters/ch7.pdf`**（132.4 KB）—— ✅ 无问题。被英文学术主页 `/index.html` L640 引用；与 ch1-ch12 章节切片 + `Macro.pdf` 合订本双形态共存（沿用 6-11 PSU 高宏 ch7 抽检结论，本周未改动）；同目录有 `ch7_neoclassical_vs_data.tex` 源码。**LaTeX 化评估**：**已 LaTeX 化**状态，**保持现状**。
- **抽检 10/10 · lecture_note_pdf_only · `_notes/study/corp-fin/mid-2020-zh.md`**（17 行 / 1.4 KB，正文 0 字）—— ✅ 无问题。「公司财务管理期中 2020 中文卷」；与 `mid-2020-en.md`（英文版）配对形成「期中 2020 中英双卷」系列；front-matter 完整（discipline=管理学 / course=公司财务管理 / material_type=Exams / date=2020-09-01）；keywords 27 条覆盖中英文 + 课程别名（光华/PKU/北大）+ 教材（ross westerfield）+ 知识点（WACC/DCF/NPV/MM 定理/资本结构）+ 错别字（"公司财物 期中 中文"）；`summary` 准确（"建议先掐时间做一遍，再对照站里同课程的样题卷与 cheat sheet 复盘。同一份卷子另有英文版可对照"）。**LaTeX 化评估**：单年期中真题、复用频次低、与英文卷已配对，**维持 PDF 存档即可**。

---

### 🗂 仓库卫生

**仓库结构较 6-11 有显著变化**——23 个 commit 涉及四类高频迭代：① 掼蛋 8 commit（Pre-Game 重建 + 联网 Phase 2 上线 + 决策带统一 + 牌面 lining 数字 + 横屏 pointer:coarse 判定 + 理牌三带二并摞）`toolbox/guandan/index.html` +358 行 + `assets/js/games/guandan.js` +291 行；② 拼豆 7 commit（独立 PWA + 改名「拼豆图纸」+ 抠图进度均匀推进 + 双向联动面板 + 可逆反应箭头 + 控件统一字体）+ 新增 `toolbox/pindou/manifest.json` + 4 张 PWA 图标；③ 种树 2 commit（独立 PWA + 倒计时环图标 + 账本图标 ¥ 金币 + UI 重排）+ 新增 `toolbox/forest/manifest.json` + 4 张图标 + 账本图标家族 4 张重制；④ 1 处 revert（`616acff` 干净 revert `eedf2ee` 桌面优先 UI）。**敏感文件扫描**：`git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret'` ✅ 全空；未发现 `"xxx 2.yyy"` 形式副本；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）；`git ls-files --others --exclude-standard` ✅ 空。**结构合理性**：① 两个新 PWA（pindou / forest）的 manifest / icons / `app_title` 字段全部齐整，构建产物 ✅ 正确写出（手动 grep `_site/toolbox/{forest,pindou}/index.html` 印证 `<link rel="manifest" href="/toolbox/<slug>/manifest.json">` + `<link rel="apple-touch-icon">` + `<meta name="apple-mobile-web-app-title">`）；② 掼蛋 8 次大改全部沿用既有 hover 守卫 / games-shell 接入 / `.zone-side` 风格，**今日审计抓到 1 处 Pre-Game 恢复时新增的 `:hover` 漏判已秒修**；③ pindou 7 次改动延续稳定迭代节奏；④ ledger 图标家族被 forest 拉齐成同款奶油底家族（`assets/icons/ledger-*.png` 4 张全部重制为带 ¥ 金币的新设计），是设计语言升级；⑤ 6-11 P2#4 pindou `console.log` 调试残留**今日由站主在 `bfb56eb`/`0eee009` 抠图进度改版时一并清掉** ✅。**剩余隐患**：见上 P2 #1 / #2 / #3 / #4 / #5；今日新增隐患 0 项（hover 漏判已秒修）。**结论**：仓库卫生 ✅ 干净，23 个 commit 全程合规（除 1 处 hover 漏判已修），revert 干净无遗留。

---

## 2026-06-11

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周四 DOW=4，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=11，未跑 monthly_stats）。距 6-10 巡检共 **33 个 commit**（`a8d5f07` 之后 → `eedf2ee` 为止），主线五条：① **掼蛋大规模 UI 重做 21 commit**——从「沉浸全屏 + 满铺安全区 + 深摞错落不压扁」起（`1b62f45`），一路打磨到「右上角带确认退出钮 / 榜单冠军图标 / 我方头像双行」（`8c5bce1`）、「理牌行三键改手绘矢量图标」（`387e829`）、「理牌仅限合法牌型 + 张数挪头像旁 + 托管图标贴头像」（`e3f946e`）、「牌堆回截图版深摞纯重叠」（`6469e49`）、对手左/右钉竖向中间（`952054c`）、连续四档放大手牌至 50×72 与出牌区追平（`b66fb58 9291c98 64b484c`）、左右对手出牌更贴头像（`5d8fca9`）、横屏布局判定改 `pointer:coarse`（`287a31e`），并以「桌面优先 UI：去掉全屏 Pre-Game 页、改成牌桌中心卡片 + ⚙️ 设置浮层」收官（`eedf2ee`）。② **俄罗斯方块手机端沉浸化 6 commit**——`fcffc38` 棋盘撑满首屏、`8eb6d6e` 删屏幕按钮 + 开始页全屏 + Best 持久化 + 暂停/新游戏矢量图标、`726561a` 禁止游戏区文本选择防滑动误选、`61ad935` 棋盘滑动改实时跟手一格一格走、`2005d84` 修预进入页历史最佳一直显示 0 + 删右上角退出键、`36d7d8c` Hold 改可选设置默认关 + 棋盘更宽。③ **拼豆图纸 5 commit**——`257f80a` 量化改 OKLab 修白衣彩斑 + 抠图按钮三态化、`ee43913` 笔刷滚轮 / 双指捏合调大小 + 调整面板收成卡片、`603e8e1` 白底发绿修复（彩度死区）+ 第一步主次按钮分层、`24eef43` 颜色量化回退 redmean + 提示文字精简、`0448dc8` 新增「抖动」上色模式（Floyd–Steinberg），随后 `ee659c5` 又删掉「平涂/抖动」开关（用户觉得没用，标志稳定迭代里也敢做减法），最后 `56cf64d` 新增可切换色卡——默认 MARD 漫漫 221 色、可切回 Hama 53 色。④ **三个高频游戏独立 PWA 化**——`a0d0d4e` 把 2048 / 合成大西瓜 / 掼蛋 各自做成可安装的 PWA（每个加 per-tool `manifest.json`、`apple_touch_icon`、`app_title`，配 4 张 192/512/maskable/apple-touch 图标，统一奶油底家族语言）。⑤ **配套修复**——`460fd7e` 手机端修 runner/leap 开始遮罩被矮画布裁切（4:1 / 5:2 画布配 `:has(.gs-pgo-overlay.open)` 撑高，开局后 `resizeCanvas()` 恢复）+ tetris 棋盘 max-width 放开到 340、两侧缩到 52；`a913f2f` 宠物趋势图加悬停 / 框选互动，柱顶数字收进浮窗，触屏抬手后可钉住读数；`0c80dc9` `lane-change-illusion` 去掉「对个人提问作答」的措辞，让文章读起来是科普而非大号回复（4 处「你那句」「你描述的那个」改成面向大众读者的中性表述）。今日 `scripts/audit/run.sh` 全套审计 **13/13 全 clean**（keywords / images / material_type / filename / sibling / hover_no_media / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml；backend_pulse 仍 403 无外网出口；spotcheck 10/10 全 ✅），是本季度第一次每日 13 项零命中。`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（cold build 13.704 s）。**今日没有发现需要自动修复的项**——33 个 commit 全部合规：21 处掼蛋改动遵守既有 `@media (hover: hover)` 守卫 / `.zone-side` 风格、6 处 tetris 改动正确处理触屏 `user-select` 与遮罩 `min-height` 互动、5 处 pindou 改动延续 OKLab→redmean 的稳定回退路径、3 个新 PWA manifest 字段齐全（id/start_url/scope 自洽 + 三档 icons 含 maskable）；pet 趋势图新加的 SVG overlay 与 `.chart-tip` 在 `pet.css` 第 27 处 `:hover` 全部包在 `@media (hover: hover)` 块内。残余 P2 5 项（paywall 后端冒烟、内部 prompt 称呼 zirconeey、PDF-only 存档手写互链、pindou `console.log` 调试残留、5 条 DNS NameResolutionError 待生产复验）状态见下，与 6-10 同。

### ✅ 本次已自动修复

**今日无自动修复项** —— 13/13 audit 全清、33 个 commit 全部合规、抽检 10/10 全 ✅。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 与 6-04 ~ 6-10 一致，未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-10 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-10。属本地标识符，不影响线上；若想顺手统一文字描述（不动文件名），改 `prompt.md` / SKILL.md 正文「zirconeey 站」→「ruizhou03 站」即可。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-10 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

4. **`toolbox/pindou/index.html:640` 一处 `console.log('[pindou] 抠图推理耗时 '+(S.cutMs/1000).toFixed(1)+'s')`** —— 沿用 6-09 / 6-10 P2#4。诊断日志看着像 QA 观察用，可能有意保留。**建议**：站主自决；若觉得用户不需要看就清掉、若是有意做 QA 观察加一句 `// QA 观察用` 注释更明确。本工具迭代节奏极快（本周仍 5 commit），暂不擅自动手。

5. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-10 P2#5）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。今日没跑 `dead_links.py`（周一项），下周一会再扫一遍。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **掼蛋 21 commit 高密度迭代**：单文件 `toolbox/guandan/index.html` 累计 +494 / -? 行（从 6-10 cold-build 时的状态算起，含 PWA 注册 5 行），主线在「桌面优先 UI 重做 + 移动端横屏沉浸 + 出牌区/手牌等同卡片 + 头像/榜单/退出钮精修」。`assets/js/games/guandan.js` 同步 +145 / -? 行（出牌动画清理、托管机器人接管、深摞合法牌型限制）。一周累计 21 次大改，工具节奏极快；inline `<style>` 块已逼近 600 行级别但仍可读。**不是问题**——与全站游戏 inline-only 风格一致，且 21 次改动每次都保持 `@media (hover: hover)` 守卫完整、未引入新的 `:hover` 漏判（`hover_no_media.py` ✅ 印证）；牌桌竖向中线钉死、手牌满铺安全区、桌面 Pre-Game 改浮层等都是高质量打磨。若再持续每周 20+ commit 节奏，下季度可考虑像「记账 / 宠物中心」一样把 inline `<style>` 拆出 `guandan.css`。

- **三个独立 PWA 上线一致性**：`toolbox/{2048,suika,guandan}/manifest.json` 三个 manifest 字段齐全（`name` / `short_name` / `id` / `start_url` / `scope` 一致指向 `/toolbox/<slug>/` / `display:standalone` / `background_color:#fafaf9` / `theme_color:#fafaf9` / `lang:zh-CN` / 3 档 icons 含 maskable），与既有 `toolbox/pet/manifest.json` 和 `toolbox/ledger/manifest.json` 同 pattern；`_layouts/default.html` L69–73 用 `page.manifest | default: '/manifest.json'` / `page.apple_touch_icon | default:'/assets/icons/apple-touch-icon.png'` / `page.app_title | default: 'Zircon'` 三档默认值回退，构建产物 `_site/toolbox/{2048,suika,guandan}/index.html` ✅ 全部正确写出 `<link rel="manifest">` / `<link rel="apple-touch-icon">` / `<meta name="apple-mobile-web-app-title">`。**不是问题**——首发即合规，三个新 PWA 装到桌面 / 主屏后会是带专属图标和中文名的独立 APP。

- **`lane-change-illusion.md` 去「对个人提问」措辞 4 处**：`0c80dc9` commit 改了 4 处把读者当成具体提问者的表达——L17「你那句"变道之后可能并不会更快"的直觉」→「"变道之后可能并不会更快"这个很多人隐约都有的直觉」；L57「就是你描述的那个"手风琴"——说得非常准」→「最贴切的比喻，就是把车流想成一把"手风琴"」；L63「正是你那句话的核心」→「这正是整件事的核心」；L305「你那句"变道之后可能不会变得更快"」→「"变道之后可能不会变得更快"这个直觉」。**复审**：全文已不剩任何「你那句 / 你描述 / 您 / 私聊 / 提问」类残留措辞（`grep` ✅ 空），文风成功从「对某个人答疑」转为面向大众读者的科普。**不是问题**——表达升级到位。

- **宠物趋势图新加的 SVG overlay 与 `.chart-tip` 浮窗**：`assets/js/pet.js` +182 行（占总变更量约 30%）实现日 / 周 / 月柱状图悬停高亮 + 当日累计曲线十字线 + 按住拖动框选区间→「HH:MM–HH:MM·吃了 X 克·平均 Y 克/小时」，框选可钉住便于触屏抬手后读；`pet.css` 新增 18 行 `.chart-tip` 样式与 SVG 临时 overlay 着色；触屏路径用 `pointerup` / `pointermove` 走，未引入新的 `:hover` 规则（沿用既有 `@media (hover: hover)` 守卫，6-09 写过的 27 处 hover guard 全部不变）。**不是问题**——交互升级合规，柱顶数字收浮窗这一改让预览态干净许多。

#### 🗒️ 待办清账（承接 6-10）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-10 完全一致，无变化。
- **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`**：承接 6-06 ~ 6-10，等站主拍板是否清掉「（付费）」标签。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单；各类目结论汇总如下。

- **抽检 1/10 · game · `toolbox/goals/index.html`**（996 行 / 36.6 KB，inline-only）—— ✅ 无问题。目标进度跟踪小工具；与「拍照便签」「时光机」同属"索引式工具"（非对局游戏），单人小工具不需排行榜（合理不接入 games-shell 排行榜）；hover 守卫齐全；单文件 996 行紧凑。沿用 6-10 抽检结论，本周未改动。**LaTeX 化不适用**。
- **抽检 2/10 · pdf_archive · `files/psy-stat-I/anova-R.pdf`**（314.3 KB）—— ✅ 无问题。被 `_notes/study/psy-stat-I/anova-R.md` 与 `final-2022.md` 引用；体积 < 5 MB 不需 pdfslim；R 代码模板单页综合表，**LaTeX 化评估：维持 PDF 存档**（已经稳定使用、复用频次中等、迁移成本与收益不匹配）。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/corp-fin/mid-2020-en.md`**（17 行 / 1.3 KB，正文 0 字）—— ✅ 无问题。光华本科《公司财务管理》2020 期中真题英文卷；front-matter 完整（discipline=管理学 / course=公司财务管理 / material_type=Exams / date=2020-09-01）；keywords 24 条覆盖中英文 + 课程别名（"光华 公司财务"、"国际班 公司财务"、"MBA 公司财务 英文"）+ 错别字（"公司财物"）；`pdf_url` 路径一致；`summary` 字段提供准确的 PDF 自动导语（"光华本科《公司财务管理》2020 年期中真题（英文卷）。考点覆盖现金流折现、NPV/IRR 决策、资本结构与 MM 定理"）。**LaTeX 化评估**：单年期末真题、复用频次低，**维持 PDF 存档即可**。
- **抽检 4/10 · pdf_archive · `files/corp-fin/mid-sample-2-sol.pdf`**（365.6 KB）—— ✅ 无问题。被 `_notes/study/corp-fin/mid-sample-2-sol.md` 引用；与同目录 `mid-sample-2.md`（题面）配套形成"样卷 + 答案"系列；体积 < 5 MB 不需 pdfslim；命名 `-sol` 后缀清晰。**LaTeX 化评估**：样卷答案、复用频次中等但题型 PDF 中已包含完整解答步骤，**维持 PDF 存档即可**。
- **抽检 5/10 · lecture_note_full · `_notes/study/marxism/marxism-past-essence.md`**（30 行 / 3.1 KB）—— ✅ 无问题。「马原往年题精华版」/ 2023 年秋季备考时整理的前十余年期末考题精华版 + 31 题；front-matter 完整（discipline=思政 / course=马克思主义基本原理 / material_type=Exams / date=2024-02-06）；keywords 19 条覆盖"马原 31 题"、"马原 备考 两天"、"思政 期末 复习"等口语；正文带封面图 + `<p class="img-caption">` 配文 + `.tex` 源码下载链接（`/files/marxism/source/marxism-past-essence-2023.tex`）；与 `marxism-past-highlights.md`、`marxism-final-2023-fall.md` 形成串读。`discipline:"思政"` 与 _config.yml `discipline_order` 未列「思政」但 MAINTENANCE 约定将其合并到「其他」组，与 `通识`/`体育` 一致，无需修。
- **抽检 6/10 · pdf_archive · `files/adv-macro-psu/chapters/ch7.pdf`**（149.0 KB）—— ✅ 无问题。被英文学术主页 `/index.html` L640 引用（"Ch 7: Neoclassical Growth vs. Data"），与 ch1–ch12 章节切片 + `Macro.pdf` 合订本双形态共存（与 `adv-micro-pku/chapters` 同 pattern）；体积 < 5 MB 不需 pdfslim；同目录有对应 `ch7_neoclassical_vs_data.tex` 源码。**LaTeX 化评估**：源码已存在（`.tex` 与 `.pdf` 并列），属"已 LaTeX 化"状态，**保持现状**。
- **抽检 7/10 · lecture_note_pdf_only · `_notes/study/adv-micro-psu/2025-final.md`**（16 行 / 1.3 KB，正文 0 字）—— ✅ 无问题。PSU 经济学博士一年级高微 2025 期末卷；front-matter 完整（discipline=经济学 / course=高级微观经济学（PSU） / material_type=Exams / date=2025-05-01）；keywords 24 条覆盖中英文 + 课程别名（"ECON 521 final"、"PSU 高微 期末"）+ 教材（"MWG"、"Krishna"、"Mas-Colell Whinston Green final"）+ 知识点（"VCG AGV Myerson 期末"、"general equilibrium final"）；`summary` 字段写明难度（"难度贴着博士资格考。建议在读博士掐时间当模拟考做一遍，再对着讲义查漏补缺；零基础读者会比较吃力"）。**LaTeX 化评估**：单年试题、教学场景固定，**维持 PDF 存档即可**。
- **抽检 8/10 · note · `_notes/research/reproducible-project.md`**（201 行 / 11.1 KB）—— ✅ 无问题。「可复现的研究项目怎么搭：数据-代码-输出分离、相对路径、renv 与 AEA data policy」/ sub_category=科研工作流 / date=2026-05-20；keywords 28 条覆盖"复现性"、"replication package"、"AEA data policy"、"setwd 绝对路径"、"here 包"、"renv 锁依赖"、"set.seed 随机种子"、"Stata set seed"、"master do 文件"、"Makefile 复现" 等中英文专业术语 + 工程口语（"三个月后跑不出来"、"审稿复现"）+ 拼音错别字（"kefuxian"）；八段结构清晰（心智模型 / 目录结构 / 相对路径 / 主脚本 / 随机性 / 依赖锁 / README + gitignore / AEA 自查清单）；R / Stata / Python / Makefile 多语言代码块齐全；inline SVG（data→code→output 单向流动示意）用英文 path 名（"data/raw/"、"code/"、"output/"）无中文斜体风险；外链 AEA 数据政策 URL 正确；与「写作工作流」专栏调性一致。
- **抽检 9/10 · pdf_archive · `files/adv-micro-pku/chapters/ch2.pdf`**（249.7 KB）—— ✅ 无问题。被英文学术主页 `/index.html` L602 引用（"Ch 2: Consumer Theory"），与 ch1–ch5 章节切片 + `adv-micro-pku-2023.md` 笔记入口形成"PKU 高微"系列；体积 < 5 MB 不需 pdfslim。**LaTeX 化评估**：与 `adv-macro-psu` 章节切片不同，PKU 这边目前只有 PDF 没有 `.tex` 源（因为是历史扫描 / 历史汇编件），LaTeX 化工作量大、教学场景已固定为研究生录入资料，**维持 PDF 存档即可**。
- **抽检 10/10 · pdf_archive · `files/adv-metrics-psu/midterm-spring-2026.pdf`**（63.0 KB）—— ✅ 无问题。被 `_notes/study/adv-metrics-psu/midterm-spring-2026.md` 引用；与 `midterm-spring-2025-with-solutions.md`、`survival-guide.md` 形成"PSU 高计期中"系列（笔记顶部用 Liquid `relative_url` 写了配套阅读链接）；体积 < 5 MB（仅 63 KB，题面无解答）；命名带年份 + 学期符合约定。**LaTeX 化评估**：单次期中真题、复用频次低，**维持 PDF 存档即可**。

---

### 🗂 仓库卫生

**仓库结构较 6-10 有显著变化**——33 个 commit 涉及五类高频迭代：① 掼蛋 21 commit（`toolbox/guandan/index.html` +494 / -? 行 + `assets/js/games/guandan.js` +145 / -? 行 + 新加 PWA manifest + 4 张 PWA 图标，新增 +639 / 修改一系列布局），全部维护得当未引入 `:hover` 漏判或新的 `console.log`；② tetris 6 commit（手机端沉浸 + 棋盘 max-width 放开到 340 + 文本选择禁止防误选 + Best 持久化 + 矢量图标）；③ pindou 5 commit（OKLab→redmean 稳定回退 + 抠图按钮三态 + 笔刷滚轮缩放 + 抖动/平涂双模式加了又删 + 色卡可切 MARD 221/Hama 53）；④ 三个独立 PWA 上线（2048/suika/guandan 各 manifest.json + 4 张图标 = 12 张图标共 +123 KB）；⑤ 配套修复（runner/leap 遮罩裁切 + 宠物趋势图悬停/框选 + lane-change 去个人提问措辞）。**敏感文件扫描**：`git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret'` ✅ 全空；未发现 `"xxx 2.yyy"` 形式副本；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）；`git ls-files --others --exclude-standard` ✅ 空。**结构合理性**：① 三个新 PWA 的 manifest / icons / `app_title` 字段全部齐整，构建产物 ✅ 正确写出（手动 grep `_site/toolbox/{2048,suika,guandan}/index.html` 印证 `<link rel="manifest" href="/toolbox/<slug>/manifest.json">` + `<link rel="apple-touch-icon">` + `<meta name="apple-mobile-web-app-title">`）；② 掼蛋 21 次大改全部沿用既有 hover 守卫 / games-shell 接入 / `.zone-side` 风格、未引入新的违规；③ pindou「抖动/平涂」开关加了又删反映稳定迭代里也愿意做减法，避免功能堆砌；④ pet 趋势图改交互未触碰 `:hover` 规则（沿用 6-09 写过的 27 处守卫）；⑤ `lane-change-illusion` 4 处去「对个人提问」措辞文风升级到位。**剩余隐患**：见上 P2 #1 / #2 / #3 / #4 / #5；今日没有新增隐患。**结论**：仓库卫生 ✅ 干净，33 个 commit 全程合规，本季度首次每日 13 项审计零命中。

---

## 2026-06-10

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周三 DOW=3，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=10，未跑 monthly_stats）。距 6-09 巡检共 **13 个 commit**（`81daa9b` 之后 → `ee0a29d` 为止），主线四条：① **「记账」新工具上线**——`f25a6e9` 首发（`toolbox/ledger/` 纯本地·跨时区·垫付报销·多账户·周期账·手动汇率·预算图·独立 PWA，新增 1270 行 `assets/js/ledger.js` + 252 行 `assets/css/ledger.css` + 173 行 `assets/js/ledger-sync.js` + 281 行 modals/73 行 board include + 4 张 PWA 图标 + manifest），随后 `3f39dd5` 端到端加密云同步——加密镜像搭车 `cloud-sync`，后端只存 AES-GCM 密文（PBKDF2 15 万次派生密钥、同步密码只存本机）。② **拼豆图纸持续打磨 6 commit**——`b6a9146` 下载图带配色图例 + 合并打印进坐标图 + 清单可排序 + WebGPU 提速、`48e0c81` WebGPU 修复 polyfill+CPU 兜底 + 清单合计/翻页位置调整、`55f266c` 修宽图右侧被切、`445d9cc` 合并步骤③→② + 新增「⛶ 全屏看图纸」、`ab54fcc` 控件收顶+画布全宽、`5fc9af7` 抠图改"先选后抠"——上传不自动抠后台静默偷跑、`ee0a29d` 图纸参数收顶 + 上传后先单图(选了底图才分裂)。③ **巡检收尾批量清账**（`0952cee`，回应 6-09 P2#9 / P2#6 / 6-07~6-09 P2#2 / 6-09 P2#7 四条）——`notes/{toefl-gre,tutoring}` 两个**中文**副标题去 `font-style: italic`（英文 landing 保留斜体设计是有意保留，所以 `life/research/essays/notes/notes·course-reviews` 5 张英文副标题不动）；`scripts/audit/dead_links.py` 增 `SKIP_URL_PATTERNS` 跳过 w3.org SVG/xlink xmlns 命名空间假阳性；`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 9 处 `/Users/zhourui` 硬编码全部换成 `__file__` 派生 / `Path.home()`；`docs/ARCHITECTURE_REVIEW.md` 旧路径 `notes/pre-high-school` → `notes/tutoring`。④ **配套打磨**——`74087fc` 宠物食物图标支持拍照/选图（复用头像裁剪管线·零云依赖）、`2cb50c7` Google 登录加"正在登录…"遮罩 + claim 非阻塞 + 预连接、`e2d52ic` recipes 空状态 `.recipes-empty` 去 italic（同 P2#9 政策延伸）。今日 `scripts/audit/run.sh` 全套审计 **12/13 clean**（keywords / images / material_type / filename / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml）；**hover_no_media 报 1 个文件 / 1 处**——新加的 `toolbox/pindou/index.html` L141「全屏看图纸」工具条 `.pb-fs-bar .pb-btn:hover { border-color: #7da7d8; }` 没用 `@media (hover: hover)` 守卫（`445d9cc` 引入），已直接修复并通过复审。`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（首次 cold build 12.475 s，修复后再 build 4.198 s 也 clean）。**今日修了 1 处**：pindou L141 加 `@media (hover: hover)` 守卫，与 L33/L71 既有 block 同款写法。残余 P2 5 项（paywall 后端冒烟、内部 prompt 称呼 zirconeey、PDF-only 存档手写互链、pindou `console.log` 调试残留、5 条 DNS NameResolutionError 待生产复验）状态见下；**6-09 残余 P2 中四条（#2 脚本硬编码 / #6 dead_links 漏判 SVG xmlns / #7 ARCHITECTURE_REVIEW 旧路径 / #9 中文 landing italic）今日由站主 `0952cee` 一次性收口** ✅。

### ✅ 本次已自动修复

1. **`toolbox/pindou/index.html:141` `.pb-fs-bar .pb-btn:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 命中：「全屏看图纸」工具条的 `:hover` 是 `445d9cc` 那次「新增 ⛶ 全屏看图纸」时新加的暗色主题按钮悬停态（深灰底 `#34383d` → 蓝边 `#7da7d8`），没跟着 6-09 修过的三处一起加守卫。**影响**：触屏设备点过全屏工具条上的「关闭 / 切换效果图/坐标图」按钮后会卡在悬停态、边框留着不掉。**复审**：`hover_no_media.py` ✅ 通过；`bundle exec jekyll build` ✅ 通过零 warning（4.198 s）。与 6-09 同 pattern——pindou 这工具更新节奏快、几乎每次新加交互区都得跟着加守卫；今日审计第一时间发现并收口，与 L33（drop-zone）/ L71（普通按钮）既有 `@media (hover: hover)` block 同款写法。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 与 6-04 ~ 6-09 一致，未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-09 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-09。`grep -rl zirconeey scripts/ .claude/` 仍命中 `email_summary_imap.py / hooks/{stop_publish_reminder,pre_bash_audit_no_commit,post_write_imgslim}.sh / flight_watch_scrape.py / io.github.zirconeey.{flight-watch,email-summary}.plist.template / audit/{backend_pulse,dead_links}.py` 等。内部 prompt / 文档命名属于本地标识符（与 `docs/MAINTENANCE.md` L25「本机仓库文件夹仍叫 zirconeey.github.io / `.claude/` 里的钩子、`scripts/` 里的 `REPO=` 路径、LaunchAgent 的 `io.github.zirconeey.*` 标识都还带 zirconeey 字样——这些是**本地标识符**，不影响线上」一致），可全部维持原样不动；若想顺手统一文字描述（不动文件名），改 `prompt.md` / SKILL.md 正文「zirconeey 站」→「ruizhou03 站」即可。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-09 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

4. **`toolbox/pindou/index.html:559` 一处 `console.log('[pindou] 抠图推理耗时 '+(S.cutMs/1000).toFixed(1)+'s')`** —— 沿用 6-09 P2#8。诊断日志看着像 QA 观察用，可能有意保留（方便用户/站主在浏览器 console 看抠图耗时）。**建议**：站主自决；若觉得用户不需要看就清掉、若是有意做 QA 观察加一句 `// QA 观察用` 注释更明确。本工具迭代节奏极快（今日仍 7 commit），暂不擅自动手。

5. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 / 6-09 P2#5）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。今日没跑 `dead_links.py`（周一项），下周一会再扫一遍。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **`toolbox/ledger/index.html` 27 行 + `_includes/toolbox/ledger/{board,modals}.html` 73+281 行 + `assets/js/ledger.js` 1270 行 + `assets/js/ledger-sync.js` 173 行 + `assets/css/ledger.css` 252 行** —— 新工具「记账」首发（`f25a6e9`）即采用「外链 css/js + board/modals include」拆分（与「宠物中心」`pet.js` 同 pattern，避免 inline 单文件 1500+ 行难维护）；`ledger-sync.js` 实现端到端加密镜像（AES-GCM + PBKDF2 15 万次，明文 `tool.ledger.v1` 只在本机、加密镜像 `tool.ledger.enc.v1` 走 cloud-sync）；`ledger.css` 所有 `:hover` 都已正确加 `@media (hover: hover)` 守卫（L38/L101/L115 共 3 块）；PWA 完整（独立 manifest + 4 张图标 + apple_touch_icon），与「宠物中心」`5f12e1c` 同期成果一致。**不是问题**——首发即合规、架构干净。

- **`toolbox/ledger/index.html` L13–16 Liquid 内嵌注释（`{%- comment -%}`）写「数据只进 localStorage(tool.ledger.v1)，永不上传、不入 cloud-sync；备份靠工具内『导出文件』」**——这条与 1 天后 `3f39dd5` 引入的「加密镜像搭车 cloud-sync」有轻微表述漂移：**明文** `tool.ledger.v1` 确实不入 cloud-sync（本机限定），但**加密镜像** `tool.ledger.enc.v1` 是入 cloud-sync 的（密文 + 同步密码只存本机）。注释只描述明文流，没提加密镜像。**判断**：注释是 Liquid 注释、构建时被剔除（不进线上 HTML），仅是内部源码可读性；表述不算"错"，只是"未涵盖加密镜像"。**建议**：站主有空时可改一行加一笔「（另有 `tool.ledger.enc.v1` 加密镜像走 cloud-sync，密码只存本机）」让两份代码自洽；或维持原样让 `ledger-sync.js` 顶部那段长注释承担总解释（也合理）。设计取向项，不擅自动手。

- **拼豆图纸 6 commit 高密度迭代**：单文件 `toolbox/pindou/index.html` 今日 +467 / -? 行（从 6-09 cold-build 时的状态算起），主线在「全屏看图纸 + 控件收顶 + 抠图改先选后抠」。一周累计 13 次大改，工具节奏极快；inline 单文件已逼近 2k 行级别但仍可读（`<style>` 块单独占顶部 ~250 行 CSS、`<script>` 块在中段）。**不是问题**——与全站游戏/工具 inline-only 风格一致；若再持续每周 10+ commit 节奏，下季度可考虑像「记账 / 宠物中心」一样拆出 `pindou.{css,js}` + include。

- **「记账」中「币种切换 ¥ CNY」与「实际花销 / 现金流」与「今天/本周/本月/今年/自定义」**：UI 三层切换合理（顶上一行 + 横排两个 + 横排 5 个 tabs），中文断句典雅；按钮文案「记一笔」「撤销」走中文动词风（与「宠物中心」「拼豆图纸」一致）；汇率「手动」标榜不联网（与「纯本地」定位一致，权衡可接受）。**不是问题**——保持现状。

#### 🗒️ 待办清账（承接 6-09）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-09 完全一致，无变化。
- **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`**：承接 6-06 ~ 6-09，等站主拍板是否清掉「（付费）」标签。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单；各类目结论汇总如下。

- **抽检 1/10 · game · `toolbox/xiangqi/index.html`**（2109 行 / 90.3 KB，inline-only）—— ✅ 无问题。中国象棋 v5（领地卡开局 + 联机引擎 + 回合倒计时 + 超时托管 + 翻盘动画）；`@media (hover: hover)` 守卫齐全（`hover_no_media.py` ✅ 印证）；games-shell 全套接入；单文件 2109 行已是站内 game 最长之一（与 doudizhu 2399、leap 1118 同质同模式 inline-only 标配）；多 phase 联机引擎 + 棋盘 SVG + 领地卡 UI 紧凑共存，结构无冗余。**LaTeX 化不适用**。
- **抽检 2/10 · pdf_archive · `files/corp-fin/final-2022.pdf`**（277.1 KB）—— ✅ 无问题。被 `_notes/study/corp-fin/final-2022.md` 引用、`pdf_url` 路径一致；体积 < 5 MB 不需 pdfslim；命名带年份符合 `filename_convention.py` ✅（沿用 6-06 / 6-08 抽检结论：单年期末真题、复用频次低，**维持 PDF 存档即可**）。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/adv-metrics-pku/adv-metrics-pku-2023.md`**（18 行 / 1.2 KB，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=经济学 / course=高级计量经济学（北大）/ material_type=Notes / date=2023-09-01）；keywords 与 sibling-crosslink 经自动侧栏覆盖；pdf_url `/files/adv-metrics-pku/adv-metrics-pku-2023.pdf` 路径一致；与同目录 `mid-2015.md`、`final-2015.md` 形成"PKU 高计：课程笔记 + 历年真题"系列。**LaTeX 化评估**：完整一学期 PhD 课程笔记，若打算回看可入低优队列；但 2023 年课已上完，复用场景低，**维持 PDF 存档即可**。
- **抽检 4/10 · lecture_note_full · `_notes/study/causal-inference/final-prep-2023.md`**（18 行 / 1.5 KB）—— ✅ 无问题。「因果推断与商业应用」期末复习提纲；front-matter 完整（course=因果推断与商业应用 / material_type=Notes / date=2023-09-01）；与 sibling `final-2023.md`、`midterm-2023.md`、`hw-prep-2023.md` 形成系列。
- **抽检 5/10 · game · `toolbox/solitaire/index.html`**（1393 行 / 49.7 KB，inline-only）—— ✅ 无问题。接龙纸牌；与 chess/doudizhu/leap inline-only 同质同模式；hover 守卫齐全；games-shell 全套接入；牌堆/手牌/列堆 DOM 与拖拽事件清晰；单文件 1393 行可读范围内。**LaTeX 化不适用**。
- **抽检 6/10 · lecture_note_full · `_notes/study/real-anal/real-anal-ch3-2024.md`**（20 行 / 1.8 KB）—— ✅ 无问题。Real Analysis Ch3 Differentiation；与 `real-anal-ch{0,1,2,4,5,6}-2024.md` 形成 7 章完整系列，自动侧栏互链覆盖；`_notes/study/real-anal/real-anal-ch3-2024-handwritten.md` 配套手写稿存在；pdf_url 一致。**LaTeX 化评估**：数学硬核 + 7 章一套迁移成本高，**沿用 5-26 Round-3 评估：维持 PDF 存档**（数学公式密集场景 PDF 是更经济的形态）。
- **抽检 7/10 · note · `_notes/life/us-tax-basics-for-students.md`**（383 行 / 16.9 KB）—— ✅ 无问题。「美国报税完全指南（一）」/ sub_category=留学攻略；keywords 覆盖中英文 + 同义口语（"留学生报税" / "F-1 报税" / "OPT 报税" / "1040-NR" / "5 年规则"）；专栏一致性 OK（"这篇文章给谁看 / 5 年规则结论先行 / 三种身份 / FICA / 五段总结"）；inline SVG 配 `<p class="img-caption">` 合规；公式都用 LaTeX；与第二篇/第三篇形成串读。
- **抽检 8/10 · game · `toolbox/goals/index.html`**（996 行 / 36.6 KB，inline-only）—— ✅ 无问题。目标进度跟踪小工具；与 `timemachine` 同属"索引式工具"（非对局游戏），单人小工具不需排行榜（合理不接入 games-shell 排行榜）；hover 守卫齐全；单文件 996 行紧凑。
- **抽检 9/10 · note · `_notes/life/us-bottled-water.md`**（323 行 / 22.5 KB）—— ✅ 无问题。「美国超市的 Drinking / Purified / Spring / Mineral Water 到底有什么区别？」/ sub_category=生活之问；keywords 覆盖中英文 + 错别字（"美国矿泉水 / spring water / 桶装水 / mineral / TDS / 美国自来水能喝吗"）；五段结构（问题 / 结论先行 / 四种水的对比表 / 实际选购建议 / 反直觉提示）调性清晰；inline SVG（TDS 数轴 / 包装识别图）配 `<p class="img-caption">` 合规；与 `_notes/life/us-asian-grocery.md`、`fridge-layout-guide.md`、`drinking-water-types.md` 等生活之问系列调性一致。
- **抽检 10/10 · pdf_archive · `files/real-anal/real-anal-2024.pdf`**（232.8 KB）—— ✅ 无问题。被 `_notes/study/real-anal/real-anal-2024.md` 引用（合订本入口）；与 ch0–ch6 七章独立 PDF 共存（章节切片 + 合订本双形态，与 `adv-macro-psu/chapters` 同 pattern）；体积 < 5 MB 不需 pdfslim；命名带年份 OK。**LaTeX 化评估**：实分析 7 章合订本、数学公式密集、若 ch0–ch6 都不动则合订本也不动，**维持 PDF 存档即可**。

---

### 🗂 仓库卫生

**仓库结构较 6-09 有显著变化**——13 个 commit 涉及大块功能落地：① `toolbox/ledger/` 全新工具目录（index.html + manifest + 2 个 include + ledger.js + ledger-sync.js + ledger.css + 4 张 PWA 图标，约 +2545 / -205 行）；② `_data/toolbox.yml` 新增 ledger 与 pindou 维护态、`assets/css/pet.css` 微调（食物图标拍照按钮样式）、`assets/js/pet.js` 拍照/选图复用头像裁剪管线（+77 行）；③ `_includes/auth.html` + `assets/js/auth/auth.js` Google 登录"正在登录…"遮罩；④ 5 个文件协同收口 6-09 P2#2/#6/#7/#9（`scripts/audit/dead_links.py`、`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py`、`notes/{toefl-gre,tutoring}/index.html`、`docs/ARCHITECTURE_REVIEW.md`、`toolbox/recipes/index.html`）。**敏感文件扫描**：`git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret'` ✅ 全空；未发现 `"xxx 2.yyy"` 形式副本；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）；`git ls-files --others --exclude-standard` ✅ 空。**结构合理性**：① ledger 首发即采用「外链 css/js + board/modals include + 独立 PWA」拆分模式（与「宠物中心」同 pattern），架构干净；② 端到端加密云同步（PBKDF2+AES-GCM）实现合规，密钥派生与签名比对避免死循环、密码只存本机；③ ledger 在 `_data/toolbox.yml` 正确注册为「生活 / live」类目；④ 4 个 audit 收口（脚本去硬编码 / dead_links SVG xmlns 跳过 / 中文 landing 去 italic / docs 旧路径同步）一次性清账 6-09 残余 P2 四条。**剩余隐患**：见上 P2#2 / #3 / #4 / #5；`toolbox/ledger/index.html` Liquid 注释与 ledger-sync.js 实际行为有轻微表述漂移（详见抽检观察第 2 条），属内部源码可读性问题。**结论**：仓库卫生 ✅ 干净，新工具与新功能落地全程合规，1 项 hover 守卫小漏由本日 daily-review 即时收口。

---

## 2026-06-09

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周二 DOW=2，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=09，未跑 monthly_stats）。距 6-08 巡检共 **21 个 commit**（`531a3b0` 之后 → `ec237a9` 为止），主线三条：① **拼豆图纸生成器（新工具）**——`7361c7c` 首发，后续 9 个 commit 持续打磨：色卡升级官方 Hama 53 色（`f84b6a6`）、可分享链接、模型托管到用户 R2 国内提速 5 倍 + 笔刷光标/撤销（`7bb3887`）、10 秒超时即放弃 + 复杂度耗时条（`a969a38`）、合并上传/抠图为分裂双图 + 进页面预下载模型 + 转圈两段进度（`487532d`）、抠图进度条防误杀 + 拼豆图作主视觉 + 清单分页（`407e887`）、用 Hama 色号 H11/H103 取代 A/B/C（`1fb29c5`）、分享看图模式 + 渐进展开 + 模型缓存文案（`2d7b0c2`）。② **「初升高衔接」改名「学习辅导资料」+ URL 改 `pre-high-school`→`tutoring`**（`86fb2c6`）+ **按手写原图忠实重写 9 个家教讲义 LaTeX**（`ec237a9`，今天最后一条）——`_notes/{tutoring}/` 与 `files/tutoring/` 同步重命名，且保留旧 URL `redirect_from`。③ **宠物食量记录持续精修**——`b6995fa` 直方图不完整周期修正、`7aa78d4` 成分混基自动识别 + 折成干粮快速入口、`e56c2bd` 估算去干湿基提示改静默修正、`b9ca89c` 折成干粮移到第三选项 + 食物图标补满 3 整行；穿插 `5f12e1c` 宠物中心独立 PWA、`b1f6d15 37cb6c5` 精简冗余提示文字 + 工具文案 playbook、`5e04224 1b7ceb3 a54eeb9 b5fe8dc` 手机顶栏方案 D 落地。今日 `scripts/audit/run.sh` 全套审计 **12/13 clean**（keywords / images / material_type / filename / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml）；**hover_no_media 报 1 个文件 / 3 处**——新工具 `toolbox/pindou/index.html` 三条 `:hover` 没用 `@media (hover: hover)` 守卫，已直接修复并通过复审（详见「✅ 本次已自动修复」）。`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（首次 cold build 12.323 s，修复后再 build 4.36 s 也 clean）。**今日修了 3 处**：① pindou `:hover` 全数加守卫（触屏 UX bug，3 处 CSS）、② `docs/MAINTENANCE.md:68` 与 `.claude/skills/new-post/SKILL.md` 中 `pre-high-school` 旧路径同步改为 `tutoring`（配合 6-07 重命名收口内部文档）。残余 P2 4 项（paywall 后端冒烟、scripts 内 `/Users/zhourui/` 硬编码、内部 prompt 称呼 zirconeey、PDF-only 存档手写互链）状态不变，新增 P2 三项（`docs/ARCHITECTURE_REVIEW.md:426` 历史快照引用旧 `notes/pre-high-school/`；`toolbox/pindou/index.html:501` 一处生产环境 `console.log` 调试残留；7 个 landing 页 `font-style: italic` 中文副标题为全站既有样式，是否调整待站主拍板）。

### ✅ 本次已自动修复

1. **`toolbox/pindou/index.html` 3 条 `:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 命中：L33 `.pb-drop:hover, .pb-drop.drag { ... }`（混合 :hover 与 .drag，已拆开：.drag 保持普通规则不变，:hover 单独挪进 `@media (hover: hover)` block）、L63 `.pb-btn:hover { border-color: ... }`、L65 `.pb-btn.pri:hover { filter: brightness(1.08); }`（合并进同一个 `@media (hover: hover)` block）。**影响**：触屏设备点过按钮后会卡在悬停态、视觉错乱。**复审**：再跑 `hover_no_media.py` ✅ 通过；`bundle exec jekyll build` ✅ 通过，零 warning。这是上周一刚诞生的「拼豆图纸生成器」工具，今日审计第一时间发现并收口，与全站 snake / suika / chess / doudizhu 等游戏 hover 守卫风格一致（参照 `toolbox/snake/index.html` L93/106 写法）。

2. **`docs/MAINTENANCE.md:68` 与 `.claude/skills/new-post/SKILL.md` 两处 `pre-high-school` 旧路径同步改为 `tutoring`** —— `86fb2c6` 那次「初升高衔接 → 学习辅导资料」重命名后，部分内部文档没同步：① MAINTENANCE.md 学习资料正文密度建议表的「主题入门类」例子 `pre-high-school/physics.md` 改为 `tutoring/physics.md`（与现实文件路径一致）；② new-post SKILL.md L41 / L114 两处 `_notes/<exam>/`（gre, toefl, pre-high-school） 改为 `（gre, toefl, tutoring）`（确保后续 `/new-post` 用例不会被误导向旧路径）。**影响**：仅文档准确性，不影响线上（`docs/` 已被 `_config.yml` exclude；`.claude/` 是本地 skill，亦不进 build）；但下次走 `/new-post` skill 创建辅导讲义时按新路径建即可。**复审**：`bundle exec jekyll build` ✅ 通过；新旧 URL 通过 `_notes/tutoring/*.md` 与 `notes/tutoring/index.html` 的 `redirect_from` 兜底，不会触发 404。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 与 6-08 / 6-07 / 6-06 一致，未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-08 P2#1。`zircon-urge.fly.dev` 今日仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-04 ~ 6-08 P2#2。`scripts/` 已被 exclude，不影响线上。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-08 P2#3。内部 prompt / 文档。

4. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-08 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

5. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 P2#5）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。下次周一加跑 `dead_links.py` 会再扫一遍。

6. **`dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间误判为外链**（沿用 6-08 P2#6）—— 同一 URL 148 处全部假阳性；建议跳过 `^https?://(www\.)?w3\.org/(\d{4}/(xlink|svg)|graphics/SVG)`。改 audit 脚本而非内容。

7. **🆕 `docs/ARCHITECTURE_REVIEW.md:426` 历史快照仍引用旧路径 `notes/pre-high-school/index.html 第 68 行`** —— 这份是 2026-04/05 写的架构审查快照，行号信息也是当时的快照；rename 后该文件已改名为 `notes/tutoring/index.html`、且 L68 是否仍是当时所指那一行也得复看。**建议**：站主自行决定是把这份文档当历史快照保留（不动）、还是同步更新到现况（顺手把所有"第 X 行"对照一遍）。仅文档准确性问题，不影响线上（`docs/` 已 exclude）。

8. **🆕 `toolbox/pindou/index.html:501` 一处 `console.log('[pindou] 抠图推理耗时 ' + sec + 's')`** —— 新工具的诊断日志，看着像调试残留。**判断**：可能是有意保留（方便用户/站主在浏览器 console 看抠图耗时），也可能是上线前忘了清。**建议**：站主自决，若觉得用户不需要看就清掉；若是有意做 QA 观察，加一句 `// QA 观察用` 注释更明确即可。本工具诞生才 9 天，节奏快，先不擅自动手。

9. **🆕 7 个 landing 页（`notes/index.html` / `notes/course-reviews/index.html` / `notes/toefl-gre/index.html` / `notes/tutoring/index.html` / `life/index.html` / `research/index.html` / `essays/index.html`）的副标题 `<p>` 用 `font-style: italic`，正文里都是中文** —— 例：`notes/tutoring/index.html` 的 `从初中到高中的思维与方法铺垫` 被渲染成中文斜体（浏览器合成假斜体）。**这是全站 7 个 landing 页统一的设计风格**，与 `feedback_chinese_no_italic` 约定有冲突。**判断**：① 若是有意做"副标题以斜体强调"的视觉决策——保持现状即可；② 若已不喜欢这种渲染——一次性把 7 处 `.xxx-header p { ... font-style: italic; ... }` 改成 `font-style: normal` + 别的弱化样式（如颜色变浅或字号变小，目前 `color: var(--color-light)` 已经有了）。设计取向，等站主拍板。`svg_italic_zh.py` 只扫 SVG `<text>` 元素，不覆盖 CSS，所以这条今日不会报警，但抽检意外发现。

#### 🗒️ 待办清账（承接 6-08）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与昨日完全一致，无变化。
- **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`**：承接 6-06 ~ 6-08 P2 列表条，等站主拍板是否清掉「（付费）」标签。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单；各类目结论汇总如下。

- **抽检 1/10 · game · `toolbox/typing/index.html`**（746 行 / 35.7 KB，inline-only）—— ✅ 无问题。打字速度测试工具；与 snake / suika 同质同模式，games-shell 全套接入；`@media (hover: hover)` 守卫齐全（`hover_no_media.py` ✅ 印证）；单文件 746 行远未达 1000 行边界。**LaTeX 化不适用**。
- **抽检 2/10 · pdf_archive · `files/r-tutorials/r-correlation-distance.pdf`**（399.7 KB）—— ✅ 无问题。被 `_notes/research/r-correlation-distance.md` 引用、`pdf_url` 路径一致；体积 < 5 MB 不需 pdfslim；还被 `_notes/research/r-psy-stats-ii.md:24` 二次引用为系列资料；文件名规则 OK。**LaTeX 化评估**：R 教程已有 markdown 内联正文 + 配 PDF 双形态，复用频次中等，**维持 PDF 存档即可**。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/psy-stat-I/demo-summary.md`**（17 行 / 1.2 KB，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=心理学 / course=心理统计Ⅰ / material_type=Notes / date=2022-09-01 / author=Zircon）；keywords 28 项覆盖中英文 + R/SPSS 命令名（"z 检验 R" / "t 检验 R" / "ANOVA R 代码" / "卡方 R 代码" / "psychological statistics R demo"）；summary 准确点出"一学期 z/t/ANOVA/相关/回归/卡方代码集中查找手册 + 期末复习/作业上机直接抄改"；pdf_url 路径与实际文件一致；PDF 自动导语由 `post.html` 走 course + material_type 触发。**LaTeX 化评估**：纯代码 demo / 一次性资料，**维持 PDF 存档即可**。
- **抽检 4/10 · note · `_notes/research/latex-commands.md`**（300 行 / 15.9 KB）—— ✅ 无问题。LaTeX 快捷键大全 / sub_category=LaTeX相关；keywords 充足（`keywords_coverage.py` ✅）；"科研之问"系列调性一致——第一性原理 → 工具反思 → 具体宏 → 案例 → 进阶；无 inline 图片（不触发 caption 检查）；无中文斜体（CSS-only `font-style: italic` 全在 `.code` 等英文场景）；无 bare URL、无裸 `$` 金额；305 行属合理篇幅。
- **抽检 5/10 · pdf_archive · `files/adv-macro-psu/chapters/ch11.pdf`**（235.0 KB）—— ✅ 无问题。被英文主页 `index.html:644` `<li><a href="/files/adv-macro-psu/chapters/ch11.pdf">Ch 11: Computation of the Aiyagari Model</a></li>` 引用（不是 `_notes/` 笔记，是英文主页章节下载列表里的资源链接）；与同目录 ch1–ch12 同体例（每章独立 PDF + 总合订本 `Macro.pdf` 也可下）；ch11 对应 Aiyagari 模型计算，pdf-only 是有意决定（章节并非 markdown 笔记结构，而是供下载的章节切片）；体积 < 1 MB 不需 pdfslim；文件名规则 OK。**LaTeX 化评估**：英文主页面向 PSU econ phd 同行，章节切片是配套下载资料，**维持 PDF 存档即可**。
- **抽检 6/10 · lecture_note_full · `_notes/study/adv-metrics-psu/midterm-spring-2026.md`**（17 行 / 1.4 KB）—— ✅ 无问题。front-matter 完整（discipline=经济学 / course=高级计量经济学（PSU）/ material_type=Exams / date=2026-03-15）；keywords 25 项覆盖中英文 + 学校代号 + 系列资料（"高级计量经济学期中（2026）" / "高计 PSU 期中" / "ECON 510 midterm" / "Penn State 一年级博士 计量" / "metrics qualifying exam"）；summary 准确点出"ECON 510 2026 春期中真题、题面 PDF 无答案"+"与 2025 春期中带答案 + 8 天期末自救指南互为系列"；正文一段配套阅读手写互链清晰（`> 配套阅读：[2025 春期中带解答] | [期末自救指南]`）。
- **抽检 7/10 · note · `_notes/life/can-i-default-and-leave-us.md`**（505 行 / 28.6 KB）—— ✅ 无问题。"能爆刷信用卡然后回国吗？" / sub_category=留学攻略；keywords 充足；inline SVG 图配 `<p class="img-caption">`（L173"短期省的钱保持在水平线上不动；长期反弹代价随时间累积"等）合规；专栏一致性 OK——「这篇文章给谁看 / 法理结论先行 / 后果分级 / 风险量化 / 替代路径」五段；无 bare URL / 无裸 `$`；公式都用 LaTeX。
- **抽检 8/10 · game · `toolbox/leap/index.html`**（1118 行 / 39.6 KB，inline-only）—— ✅ 无问题。「跳过 Deadline」单人小游戏；hover 守卫齐全（`hover_no_media.py` ✅ 印证）；games-shell 全套接入；单文件 1118 行边缘但与 chess 1986 / doudizhu 2399 同质同模式（inline 单文件是站点 game 标配），**不是问题**。**LaTeX 化不适用**。
- **抽检 9/10 · pdf_archive · `files/psy-stat-II/cheat-sheet-mid-2023.pdf`**（254.8 KB）—— ✅ 无问题。被 `_notes/study/psy-stat-II/cheat-sheet-mid-2023.md` 引用、`pdf_url` 路径一致；cheat sheet 高度紧凑、不需 imgslim/pdfslim；文件名带 mid + 2023 命名规则 OK。**LaTeX 化评估**：cheat sheet 一次性应试材料，**维持 PDF 存档即可**。
- **抽检 10/10 · note · `_notes/life/us-health-insurance-basics.md`**（428 行 / 21.4 KB）—— ✅ 无问题。「美国医保完全指南（一）：基础术语与保险类型」/ sub_category=留学攻略；keywords 充足；inline SVG 配 `<p class="img-caption">`（L124"4 种保险类型在'自由度 $\times$ 价格'二维上的位置"等）合规；专栏一致性 OK——五段结构 + 反直觉提示 + HMO/PPO/EPO/POS 分类对照；`pii_scan` 命中 SSN/手机号示例字符串，但已在 6-08 / 6-01 / 5-25 多次确认是教程示例不是真 PII（白名单已收口），不动。

---

### 🗂 仓库卫生

**仓库结构较昨日有显著变化**——21 个 commit 涉及大块功能落地：① `toolbox/pindou/` 新增工具目录（index.html 923 行）+ 同期新增 `docs/toolbox-copy-trim-playbook.md` 工具文案精简指南；② `files/pre-high-school/*` → `files/tutoring/*` + `_notes/pre-high-school/*` → `_notes/tutoring/*` 全部 rename（约 100 个文件 / 重写 9 个 LaTeX 项目，共 +7321 / -7460 行）；③ `assets/icons/pet-*.png` 新增宠物中心 PWA 图标（4 张）+ `toolbox/pet/manifest.json` 新增；④ `_config.yml` 加 `discipline_order` 新增 "学习辅导资料"。**敏感文件扫描**：未发现新 `.env` / `credentials*` / `token*` / `secret*`；未发现 `.DS_Store` 或 `"xxx 2.yyy"` 形式副本；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）；`git ls-files --others --exclude-standard` 空。**结构合理性**：① `pre-high-school` → `tutoring` 这个 rename 是合理的——「初升高衔接」原本就是家教讲义，改名「学习辅导资料」更符合定位，URL slug `tutoring` 也更通用；② 9 个 LaTeX 项目重写完整保留旧路径 `redirect_from`，不破坏旧链接；③ `notes/tutoring/index.html` 的 `redirect_from: /notes/pre-high-school/` 兜底完备。**剩余隐患**：见上 P2#7（`ARCHITECTURE_REVIEW.md` 历史快照引用旧路径），属于文档准确性而非结构问题。**结论**：仓库卫生 ✅ 干净，rename 全程已配套 `redirect_from`，无遗留破坏链接。

---

## 2026-06-08

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周一 DOW=1，**加跑 dead_links / orphan_files / pii_scan 三项周一项**；DOM=08，未跑 monthly_stats）。距 6-07 巡检共 **0 个 commit**（HEAD 仍是 `63ab7b4 chore(daily-review): 2026-06-07 自动巡检`，今天没有新的功能落地），仓库内容与昨日完全一致。今日 `scripts/audit/run.sh` 全套审计 ✅ 全 clean（keywords / images / material_type / filename / hover / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml），`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（12.881 s）。周一三项也跑了：**orphan_files 0 个孤儿** ✅；**pii_scan 18 篇命中**（与 6-01 / 5-25 多次扫描的 18 篇一致，全部是已知性质——`_notes/essays/birthday-*` 与 `letter-to-*` 含三明二中是本人成长经历的必要内容，`_notes/course-reviews/*-review-2023.md` 的「疑似学号」全是公众号 URL 里 `mid=...` 参数被正则误命中，`_notes/life/us-{health-insurance-basics,postal-system-guide}.md` 的「学号」是教程里 SSN/手机号示例字符串，**不是真正的 PII 问题**）；**dead_links 253 条疑似** 但 **绝大多数是沙箱出口被反爬挡了的 HTTP 403**（包括 `www.zotero.org` / `www.uscis.gov` / `www.irs.gov` / `www.hmart.com` / `cdn.jsdelivr.net` 等已知活跃站点 + 所有 fly.io 后端 + `accounts.google.com/gsi/client`；甚至 148 处把 SVG 的 `xmlns="http://www.w3.org/2000/svg"` 命名空间字符串误判为外链），**真正的 DNS NameResolutionError 只有 5 条**（centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com），其中前两条是 PSU 周边/Centre County 本地服务、后三条是教程参考资源，**沙箱 DNS 不能确证是否真死**——写进 P2 给站主在生产环境复验。**本次没有可安全自动修复项**——所有 audit 维度 clean、0 个 commit、抽检 10/10 全部过审。残余 P2 4 项（paywall 后端冒烟、scripts 内 `/Users/zhourui/` 硬编码、内部 prompt 称呼 zirconeey、PDF-only 存档手写互链）状态不变，本次新增 P2 两项（5 条 DNS NameResolutionError 待站主复验、dead_links.py 把 SVG xmlns 误当外链）。

### ✅ 本次已自动修复

**无**。今日所有审计维度（11 个每日 audit + 周一加跑的 3 项 dead_links/orphan/pii）均无可安全自动修复项；HEAD 自 6-07 巡检后未推进任何新 commit，没有"新落地"可顺手清理；10 项抽检逐项过审（详见下方专项小节）也未发现需要立即修的小问题。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 与 6-07 / 6-06 一致，未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04/6-05/6-06/6-07 P2#1。`zircon-urge.fly.dev` 今日仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-04/6-07 P2#2。`scripts/` 已被 exclude，不影响线上。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05/6-07 P2#3。内部 prompt / 文档。

4. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05/6-07 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

5. **🆕 5 条 DNS NameResolutionError 外链需站主在生产环境复验** —— `dead_links.py` 报这 5 条主机解析不到，但沙箱出口 DNS 可能本身就不全：
   - `https://centretax.net/` —— `_notes/life/us-tax-filing-process.md:411,526`，Centre County（PSU 所在县）地方税务局；可能改名或 SSL 配置变化。
   - `https://offcampus.psu.edu/` —— `_notes/life/us-renting-guide.md:135,463`，PSU 校外房源资源页。
   - `https://www.hwdrivingschool.com/` —— `_notes/life/pa-drivers-license.md:169`，PA 本地驾校（H&W Driving School），小本经营可能停业。
   - `https://www.judicialinformation.com/` —— `_notes/life/can-i-default-and-leave-us.md:70`，司法记录查询。
   - `https://www.textile-outlook.com` —— `_notes/life/laundry-frequency.md:404`，纺织行业咨询站点。
   - **建议**：站主用本机/真实浏览器逐一打开确认；若真死可换更稳的替代或把段落改"线下查询"指引；若是沙箱 DNS 问题不动即可（其余 248 条 403 沿用 7 天缓存，下周一不会再重抓）。

6. **🆕 `dead_links.py` 把 SVG `xmlns="http://www.w3.org/2000/svg"` 命名空间误判为外链** —— 同一 URL 在 `_notes/research/*` 与多个工具页里被命中 148 处，全部是 inline SVG 的命名空间字符串，根本不是真链接。正则 `URL_RE` 没排除 `xmlns=` 上下文；建议加一条跳过 `^https?://(www\.)?w3\.org/(\d{4}/(xlink|svg)|graphics/SVG)`（XML 命名空间 URI 一律不查）。**改 audit 脚本而非内容**，cosmetic，承接 6-05 起的 audit 脚本启发式队列。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **`toolbox/snake/index.html` 1016 行 / 34.0 KB** 与 **`toolbox/suika/index.html` 1299 行 / 42.6 KB**：本次 game 配额抽中两款；snake 2 处 `:hover` / suika 18 处 `:hover` 均带 `@media (hover: hover)` 守卫（`hover_no_media.py` ✅ 印证）；两款均接入 `games-shell.{css,js}` + `leaderboard.js` + `comments.js` + `nick-prompt.js` + `identity.js` 全套（与全站游戏标配齐平）；snake 单文件接近 1000 行边界但 inline-only 与全站 chess 1986 / doudizhu 2399 同质同模式，**不是问题**。
- **`files/corp-fin/{final-2020,final-2022,cheat-sheet-final-2022}.pdf` 与 `files/adv-metrics-psu/midterm-spring-2026.pdf` 四份 pdf_archive 全部被对应 markdown 笔记的 `pdf_url` 引用**（非孤儿，与 `orphan_files.py` 0 个孤儿一致）；体积分别 203.8 / 277.1 / 818.0 / 63.0 KB（均 < 1 MB 不需 pdfslim）；命名带年份符合 `filename_convention.py` ✅。
- **`_notes/study/corp-fin/mid-sample-3-sol.md` 与 `_notes/study/adv-metrics-pku/mid-2015.md` 两份 lecture_note_pdf_only**：前者 24 项 keywords 覆盖中英文 + 教材/教师别名（MM 定理 / 资本结构 / Modigliani Miller / 光华 corp fin），后者 26 项 keywords（OLS / 渐近理论 / 大样本理论 / GMM / IV / MLE / 高计 北大 / PKU 高级计量），summary 准确（前者描述"NPV/IRR/WACC/资本结构"、后者描述"渐近理论 / OLS / GLS / 异方差 / 工具变量 / 可与 final-2015 配套"）；adv-metrics-pku/mid-2015 即昨日 P2#4 列出的"加同课程互链入口"候选之一，仍维持低优 / 由站主拍板。
- **`_notes/life/us-asian-grocery.md` 410 行 / 22.9 KB** 是「美国超市三部曲（二）」中段，专栏一致性好——开篇先把第一篇地图、第三篇行动手册的串读路径列清楚；keywords 29 项覆盖中英文 + 故意保留的"亚州超市"错别字 + 在线品牌中英文（Weee! / Yamibuy 亚米 / H Mart / 99 Ranch / Fubonn / Pearl River Bridge）；一张 inline SVG（6 种食材柱状对比 760×380）配 `<p class="img-caption">` 合规；30+ 项价格对照表分调料/香料干货/米面/肉类/海鲜/蔬菜/冷冻/零食 8 大类清晰；价格段全用 `\$` 转义（与 `bare_dollar.py` clean 一致）。
- **`_notes/pre-high-school/sphere.md` 47 行 / 1.1 KB**（PDF-only · 已 LaTeX 化）：本笔记**正文 0 字**但 `files/pre-high-school/sphere/` 已存在完整 LaTeX 项目（`Main.tex` 1812 B + `chapters/` + `commands.tex` 920 B + `theorems.tex` 4623 B + `Makefile`，PDF 277.9 KB），说明这份"球（内切球与外接球）"讲义已是 LaTeX 工程，与 `pre-high-school/physics.md` 一脉相承；keywords 32 项含中英文 + 故意保留的"内切求 外接求"错别字（覆盖错搜场景，符合 search-keywords skill 约定）；**不是问题**——已超出"PDF-only 存档"的"评估 LaTeX 化潜力"范畴，状态属于"立刻 LaTeX 化"档已实现。

#### 🗒️ 待办清账（承接 6-07）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与昨日完全一致，无变化。
- **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`**：承接 6-06 / 6-07 P2 列表条，等站主拍板是否清掉「（付费）」标签。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/snake/index.html`**（1016 行 / 34.0 KB，inline-only）—— ✅ 无问题。2 处 `:hover` 全数 `@media (hover: hover)` 守卫；`<link href="/assets/css/games-shell.css?v=...">` + 4 个 games-shell `.js`（identity / leaderboard / comments / nick-prompt）齐全；与全站游戏同质同模式（chess 1986 / doudizhu 2399 / typing 745）；单文件 ~1k 行属可读范围，无需拆分。**无需 LaTeX 化** —— 此类问题不适用 game 配额。
- **抽检 2/10 · pdf_archive · `files/corp-fin/final-2020.pdf`**（203.8 KB）—— ✅ 无问题。被 `_notes/study/corp-fin/final-2020.md` 引用、front-matter `pdf_url: /files/corp-fin/final-2020.pdf` 路径一致；体积 < 5 MB 不需 pdfslim；文件名带年份 + 单年期末，命名规则 OK。**LaTeX 化评估**：单年期末真题、复用频次低、一次性资料，**维持 PDF 存档即可**（与 6-06 同抽中过审结论一致）。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/corp-fin/mid-sample-3-sol.md`**（17 行 / 1.3 KB，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=管理学 / course=公司财务管理 / material_type=Exams / date=2022-09-01 / author=Zircon）；keywords 24 条覆盖中英文 + 教材/教师别名（"MM 定理 期中 题" / "资本结构 期中 解答" / "光华 corp fin 期中 sample 3" / "公司财物" 错别字兜底）；summary 准确点出"NPV/IRR/WACC/资本结构核心题型解答"+"与同目录题面 PDF 配套"；pdf_url 与 `files/corp-fin/mid-sample-3-sol.pdf` 一致；PDF 自动导语由 `post.html` 走 course + material_type 触发。**LaTeX 化评估**：样卷答案 / 一次性资料，**维持 PDF 存档即可**（与同目录 mid-sample-1-sol / mid-sample-2-sol 同档）。
- **抽检 4/10 · game · `toolbox/suika/index.html`**（1299 行 / 42.6 KB，inline-only）—— ✅ 无问题。18 处 `:hover` 全数 `@media (hover: hover)` 守卫；包含完整 leaderboard aside（`.sk-leaderboard`，与全站游戏 leaderboard 命名一致）；games-shell 全套接入；合成大西瓜典型物理 game，inline 单文件合理（与 doudizhu / chess 同质同模式）；**无需 LaTeX 化** —— 此类问题不适用 game 配额。
- **抽检 5/10 · pdf_archive · `files/adv-metrics-psu/midterm-spring-2026.pdf`**（63.0 KB）—— ✅ 无问题。被 `_notes/study/adv-metrics-psu/midterm-spring-2026.md` 引用、命名带 season+年份 + 单年期中信息完整、体积极小（< 100 KB 矢量 PDF）；命名规则 OK。**LaTeX 化评估**：当年期中真题、一次性资料，**维持 PDF 存档即可**。
- **抽检 6/10 · pdf_archive · `files/corp-fin/cheat-sheet-final-2022.pdf`**（818.0 KB）—— ✅ 无问题（沿用 6-04 抽检结论：cheat sheet 高度紧凑、不需 imgslim / pdfslim）。本日无变动。
- **抽检 7/10 · lecture_note_pdf_only · `_notes/study/adv-metrics-pku/mid-2015.md`**（17 行 / 1.2 KB，正文 0 字）—— ✅ 无问题（沿用 6-04 起的待办：P2#4 候选"加同课程互链入口"，但 `sibling_crosslink.py` 已用自动侧栏覆盖、不报警，本次保持现状）。front-matter 完整（discipline=经济学 / course=高级计量经济学（北大）/ material_type=Exams / date=2015-09-01）；keywords 26 项覆盖中英文 + 学校别名（"PKU 高计" / "北大 经院 高计" / "高级计量 PKU" / "metrics midterm"）；summary 准确点出"渐近理论 / OLS / GLS / 异方差 / 工具变量"+"可与 final-2015 期末真题配套"。**LaTeX 化评估**：单年期中真题、复用频次低，**维持 PDF 存档即可**。
- **抽检 8/10 · pdf_archive · `files/corp-fin/final-2022.pdf`**（277.1 KB）—— ✅ 无问题。被 `_notes/study/corp-fin/final-2022.md` 引用、体积 < 5 MB 不需 pdfslim；命名规则 OK。**LaTeX 化评估**：单年期末真题，**维持 PDF 存档即可**（与抽检 2 同档）。
- **抽检 9/10 · note · `_notes/life/us-asian-grocery.md`**（410 行 / 22.9 KB）—— ✅ 无问题。「美国超市三部曲」第二篇 / sub_category=留学攻略；keywords 29 项覆盖中英文 + 故意保留的"亚州超市"错别字 + 在线品牌（"Weee" / "Yamibuy 亚米" / "H Mart" / "99 Ranch" / "Fubonn" / "Pearl River Bridge"）+ 同义口语（"美国买中餐食材" / "中餐食材性价比" / "留学生省钱"）；专栏一致性 OK（"这篇文章给谁看 / 结论先行 / 8 大品类对照表 / 反直觉提示 / 地区速查"五段）；1 处 inline SVG（6 种食材柱状对比 760×380）配 `<p class="img-caption">` + `<strong>` 加粗合规；30+ 项价格对照表分 8 大类 + 留学生场景三档预算（\$350-650/月）+ 各品类亚超优势倍数（3-5 倍调料 / 4-5 倍干货 / 2-3 倍蔬菜）信息密度极高；价格段全用 `\$` 转义（与 `bare_dollar.py` clean 一致）；尾段链向第三篇行动手册形成串读。
- **抽检 10/10 · note · `_notes/pre-high-school/sphere.md`**（47 行 / 1.1 KB，**已是完整 LaTeX 项目**）—— ✅ 无问题。这份"球（内切球与外接球）"讲义虽然正文 0 字但 `files/pre-high-school/sphere/` 已包含 `Main.tex` + `chapters/` + `commands.tex` + `theorems.tex` + `Makefile` 的完整 LaTeX 工程（PDF 277.9 KB / 49 行 KB-byte 比合理），说明已实现"立刻 LaTeX 化"——与 `_notes/pre-high-school/physics.md` 一脉相承的可编辑数学讲义形态；keywords 32 项含中英文 + 故意保留的"内切求 外接求"错别字（覆盖错搜场景）+ 中英文术语（"inscribed sphere circumscribed sphere" / "外接球半径公式" / "正四面体 外接球" / "补形法 外接球" / "截面法 球" / "球面距离"）；front-matter 完整（discipline=初升高 / course=数学 / material_type=Notes / date=2026-01-22 / published=true）；pdf_url `/files/pre-high-school/sphere/Main.pdf` 与实际文件一致。

---

### 🗂 仓库卫生

**仓库结构较昨日无变化** —— 自 6-07 巡检（`63ab7b4`）以来无新 commit，HEAD 仍是昨日的 daily-review 自动提交；`git status --short` 空、`git ls-files --others --exclude-standard` 空、`git diff --diff-filter=A 63ab7b4..HEAD` 与 `git diff --diff-filter=D` 均为空。**敏感文件扫描**：未发现新 `.env` / `credentials*` / `token*` / `secret*`；未发现 `.DS_Store` 或 `"xxx 2.yyy"` 形式副本；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）。**周一加跑的 orphan_files = 0** 也印证非课程目录（`files/{en,images,audio,podcasts}` + `audio/`）扫 477 个文件无孤儿。**结论**：仓库卫生 ✅ 干净，承接 6-07 与之前的整理成果，无新可优化空间。

---

## 2026-06-07

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周日 DOW=7，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=07，未跑 monthly_stats）。距 6-06 巡检共 **20 个 commit**（`632b269` 之后 → `9a199f5` 为止），主线三条：① **宠物食量记录大重构**——`c1b5aa0` 食量记录统一（每种食物都能「直接填吃了多少」或「作差·记现在还剩」，pet.js +288 行）、`36950b1` 补充机制（填扣减容器水平、下次称重/作差只算增量，重构 104 行）、`07bdfa1` 倒掉换新（作差/称重模式可标 "这次作为新起点"）、`9a199f5` 修「碗里/还剩变多」误标 "没变化"（→ 正确显示 "添了 X"）。② **手机端顶栏三栏化**——`9cf494d` `_includes/auth.html` + `assets/css/main.css` + `_layouts/default.html` 重排：手机端顶栏只留「锆铌 / ☰ / 头像」，其它（搜索 / 主题 / EN / 管理后台）收进汉堡菜单；新加 `.nav-brand` + `relocateNavControls()` 在 matchMedia 断点变化时动态移动 DOM 节点；管理后台「数据分析 / 内容管理」桌面端只图标、菜单里露文字。③ **管理后台收口**——`d4eb5fd` 后台拆「数据分析/内容管理」两板块 + 内容管理分页 + 批量取消付费；`df6ae09 5bcc2ca 3e105d1` 导航菜单露 admin 两入口（直达对应板块 → 可见双按钮 → 只图标精修）；`00e8ef3` admin-article-bar 加 Typora 式分栏编辑器（左 CodeMirror 源码 + 右实时预览，68 行）。穿插 **6 条 `chore(admin) 还原 ...` + 2 条 `chore(admin) 删除(真404) ...`**（站主 6-06 16:45–17:10 在后台对 `wipe-after-pee / structural-load-testing / standing-vs-sitting-urination / fridge-layout-guide / drinking-water-types / condoms-guide` 共 6 篇做隐藏 / 真 404 / 恢复调试，最终全部恢复 `published:true`）。最后 `046cb4e` jukebox 歌词重对齐 69 首（large-v3 单曲 + 串烧丢未唱段）。今日 `scripts/audit/run.sh` 全套审计 ✅ 全 clean（keywords / images / material_type / filename / hover / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml），`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（约 16 s，首次 cold build）。**本次没有可安全自动修复项**——所有审计维度均 clean，20 个 commit 全是大块功能落地（pet-food 重构、手机 nav、admin Typora 编辑器），按保守原则不动。残余 P2 4 项（paywall 后端冒烟、scripts 内 `/Users/zhourui/` 硬编码、内部 prompt 称呼 zirconeey、PDF-only 存档手写互链）状态不变。

### ✅ 本次已自动修复

**无**。今日所有审计维度（11 个每日 audit）全部 clean、`bundle exec` 构建零 warning 零 error。20 个 commit 引入的新结构（pet-food 食量统一 + 补充机制 + 倒掉换新 / 手机 nav 三栏化 / admin Typora 分栏编辑器 / jukebox 69 首歌词重对齐）均为站主大块落地，没有 agent 介入余地——任何 "顺手清理" 都触碰功能边界或 UX 调性，按保守原则不动。10 项抽检逐项过审（详见下方专项小节）也未发现需要立即修的小问题。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 与 6-06 一致，未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04/6-05/6-06 P2#1。`zircon-urge.fly.dev` 今日仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

2. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-04 P2#2/6-06 P2#2。`scripts/` 已被 exclude，不影响线上。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 P2#4/6-06 P2#3。内部 prompt / 文档。

4. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 P2#6/6-06 P2#4。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **`assets/js/pet.js` 当前 4272 行**（6-06 `c4d056a` 拆出来时是 ~3150 行，今天 `c1b5aa0` 食量记录统一 +288 行、`36950b1` 补充机制重构 104 行、`07bdfa1` 倒掉换新 +18 行、`9a199f5` 修 "添了 X" +3 行；累计约 +1120 行）。**不是问题**——纯单文件 inline JS、SW 缓存友好、与站点风格一致；但若再加新模式（自动喂食预测 / 多猫账户切换 / 食材换算建议）会逼近 5000 行，届时可考虑按业务面拆 `pet-food.js` / `pet-data.js` / `pet-ui.js`，**架构判断由站主**。

- **手机端顶栏三栏化（`9cf494d`）用 `relocateNavControls()` 在 `matchMedia('(max-width: 768px)').change` 时动态 `menu.appendChild(el)` / `controls.appendChild(el)` 移动 DOM 节点**——干净优雅、不复制结构。**不是问题**，记一笔：以后若再加 nav 控件（如「公众号」入口、「订阅」入口）需要同步加入 `[search, theme, en, admin]` 的迁移列表，否则会在断点切换时漏迁。

- **站主 6-06 16:45–17:10 集中做后台可见性调试**：`condoms-guide / drinking-water-types` 走「真 404 → 恢复」、`structural-load-testing / wipe-after-pee / standing-vs-sitting-urination / fridge-layout-guide` 走「隐藏 → 恢复」，最终全部 `published:true`。从 commit 节奏看是测 6-06 `4730a56` 墓碑回原位 + 6-07 `d4eb5fd` 内容管理批量取消付费这两个新功能。**不是问题**，记一笔。

#### 🗒️ 待办清账（承接 6-06）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与昨日完全一致，无变化。
- **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`**：承接 6-06 P2#1 第二条，等站主拍板是否清掉「（付费）」标签。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/typing/index.html`**（745 行 / 35.7 KB，inline-only）—— ✅ 无问题。2 处 `:hover` 全数 `@media (hover: hover)` 守卫；引用 `assets/js/games-shell/leaderboard.js` 接入排行榜（与全站游戏一致）；单文件下还有打字内容（quotes 数组）、UI、统计、排行榜接线，结构紧凑无冗余；与全站游戏 inline-only 同质（doudizhu 2399 行 / chess 1986 行均同模式）。无需 LaTeX 化或拆分。
- **抽检 2/10 · pdf_archive · `files/china-hist/china-hist-2024.pdf`**（1.7 MB）—— ✅ 无问题。被 `_notes/study/china-hist/china-hist-2024.md` 引用、front-matter `pdf_url: /files/china-hist/china-hist-2024.pdf` 路径一致；体积 < 5 MB 不需 pdfslim；文件名带年份、命名规则 OK。无 .tex 源——这是一份课程笔记 PDF（北大通识《中国古代文化》），**LaTeX 化评估**：通识课程笔记、复用频次中等、若按朝代主题章节多含图表则迁移成本高；**维持 PDF 存档即可**。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/public-econ/public-econ-2023.md`**（17 行 / 1.3 KB，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=经济学 / course=公共经济学 / material_type=Notes / date=2023-09-01 / author=Zircon）；keywords 26 条覆盖中英文术语（"公共物品 public goods" / "皮古税 Pigouvian tax" / "Mirrlees 最优所得税" / "Atkinson Stiglitz" / "Salanié 公共经济学 教材"）+ summary 7 模块导览；pdf_url 与 `files/public-econ/public-econ-2023.pdf` 一致；PDF 自动导语由 `post.html` 走 course + material_type 触发。**LaTeX 化评估**：光华本科公经笔记、模块齐全、自用复习频次中高，**加入低优队列**（与 6-06 抽检 3/10 adv-micro-pku-2023 同档）。
- **抽检 4/10 · note · `_notes/research/literature-search.md`**（97 行 / 7.8 KB）—— ✅ 无问题。文献检索与追踪攻略，front-matter 完整（sub_category=文献管理 / date=2026-05-20）；keywords 37 条覆盖中英文 + 错别字兜底（"wenxian jiansuo" / "怎么找文献" / "找不到文献"）；五段结构（Scholar 高级 / 引用网络 / alert 订阅 / AI 工具红线 / 每周 30 分钟习惯）调性清晰；inline SVG（引用图谱可视化）配 `text-anchor` + `font-size` 合规、无中文斜体；交叉链 [Zotero](/research/literature/zotero-setup) 出现 3 次形成串读。**`bare_dollar / img_caption_md / svg_italic_zh` clean** 印证格式合规。
- **抽检 5/10 · pdf_archive · `files/corp-fin/mid-sample-2.pdf`**（290.3 KB）—— ✅ 无问题。被 `_notes/study/corp-fin/mid-sample-2.md` 引用、front-matter `pdf_url` 路径一致；体积 < 5 MB 不需 pdfslim；文件名 `mid-sample-2` 命名规则 OK（公司财务样卷 2，配套答案 `mid-sample-2-sol.pdf` 同目录）。**LaTeX 化评估**：样卷题面 + 答案对，公司财务 NPV/IRR/WACC/CAPM/MM 标配题，**维持 PDF 存档即可**（样卷迭代成本低）。
- **抽检 6/10 · lecture_note_pdf_only · `_notes/study/psy-stat-I/mid-2022.md`**（17 行 / 672 B，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=心理学 / course=心理统计Ⅰ / material_type=Exams / date=2022-09-01）；keywords 6 条偏少但覆盖中英文 + 错别字兜底（"心理统计 1 期中" / "psy stat 1 midterm 2022" / "心里统计 期中"）；pdf_url 与 `files/psy-stat-I/mid-2022.pdf` 一致；summary 写"做完再对照站里这门课的其他资料复盘"——同课程互链入口由 `sibling_crosslink.py` clean 印证自动侧栏覆盖。**LaTeX 化评估**：单年期中真题、复用频次低，**维持 PDF 存档即可**。
- **抽检 7/10 · note · `_notes/life/eye-chart-numbers.md`**（201 行 / 14.9 KB）—— ✅ 无问题。「生活之问」专栏五段结构齐全（问题 / 结论先行 / 科学原理 / 实践 / 总结）；keywords 40 条覆盖中英文 + 同义词（"20/20 vision" / "Snellen" / "logMAR" / "MAR" / "5.0 算近视吗" / "diopter"）+ 故意保留口语错别字；2 处 inline SVG（视标几何 + 对数刻度对比）配 `<p class="img-caption">` 合规；正文用 `\$1.0 = 20/20$` 与 `\$5.0 = 1.0 = 20/20$` 这种"开口 `\$` 转义 + 闭口裸 `$`"——**乍看可疑但实际合规**：kramdown 把 `\$` 渲染成字面 `$`，最终 HTML 是 `$1.0 = 20/20$`，KaTeX auto-render 正确识别为内联公式（已在 `_site/life/eye-chart-numbers.html:182-183` 抽样验证）；`bare_dollar.py` 不报警因为 `\$` 的转义优先级正确。**保留原样**。
- **抽检 8/10 · pdf_archive · `files/public-econ/public-econ-2023.pdf`**（1.7 MB）—— ✅ 无问题。与抽检 3/10 互为正文 / PDF 对；体积合理（< 5 MB）；被 `_notes/study/public-econ/public-econ-2023.md` 引用，无孤儿。已在抽检 3/10 给出 LaTeX 化建议（加入低优队列）。
- **抽检 9/10 · game · `toolbox/timemachine/index.html`**（477 行 / 14.3 KB，inline-only）—— ✅ 无问题。3 处 `:hover` 全数 `@media (hover: hover)` 守卫（重置按钮 / 文章行 / 热力图格子）；包含 `@media (max-width: 600px)` 响应式断点；单文件 477 行小巧（与 typing 745 / chess 1986 同质 inline-only 但远短）；为索引式工具（X 年前的今天回顾），无对局状态，单人小工具不需排行榜——合理不接入。
- **抽检 10/10 · lecture_note_pdf_only · `_notes/study/psy-stat-I/final-2022.md`**（17 行 / 1.3 KB，正文 0 字）—— ✅ 无问题。与抽检 6/10 配套同课程；front-matter 完整；keywords 28 条比 mid-2022 厚（"z 检验 期末" / "ANOVA 期末" / "卡方检验 期末" / "假设检验 期末" / "效应量 期末" + 心理学/心理统计/心里统计 别名）+ summary 写"配合本课 cheat sheet 和 anova-R 笔记一起复盘"；pdf_url 与 `files/psy-stat-I/final-2022.pdf` 一致。**LaTeX 化评估**：单年期末真题、复用频次低，**维持 PDF 存档即可**。

---

### 🗂 仓库卫生

**仓库结构较昨日无变化** —— `git diff --diff-filter=A 4730a56..HEAD` 与 `git diff --diff-filter=D` 均为空（20 commit 全是已有文件修改）；工作区 clean、`git status --short` 空、`git ls-files --others --exclude-standard` 空。**敏感文件扫描**：未发现新 `.env` / `credentials*` / `token*` / `secret*`；未发现 `.DS_Store` 或 `"xxx 2.yyy"` 形式副本；`_config.yml` exclude 列表完备（含 DAILY_REVIEW.md / SPOTCHECK_* / docs/ / scripts/ / backends/ / _paid/）。**结论**：仓库卫生 ✅ 干净，承接 6-06 与之前的整理成果，无新可优化空间。

---

## 2026-06-06

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周六 DOW=6，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=06，未跑 monthly_stats）。距 6-05 巡检共 **30 个 commit**（`518c778` 之后 → `4730a56` 为止），主线两条：① **管理后台「下架/删除/回收站」可见性体系收口**——`6b92659` 修上一份 P1（公开 manifest 不再泄漏 `hidden:true` 文 + 后台改从鉴权后端 `/api/admin?action=hidden-list` 取隐藏清单，与 `f71b497` 隐私意图收敛）、`25e2bb3` 栏目内逐篇删除/恢复 + 删除线/变灰、`c5b3267` 可见性重定为两档（下架 / 删除回收站 + 彻底删除）、`5487cda` 删除 = 你和读者都看不到（点开 404）与下架预览分清、`e4213f5` 删除改 `published:false` + 栏目注入墓碑、`7d74498` 付费/取消付费齿轮分界标记 + 就地开关、`4ad51b3` 真隐藏正文搬后端·空壳页（访客看不到、管理员可预览）、`3b13685` 按钮文案/删除付费按钮/墓碑内联/管理员默认享付费、`4730a56` 墓碑回原位（按日期 + 参与分页）+ 空态按 tab + 内容管理批量操作；穿插 11 条 `chore(admin) ...via 管理后台` 的 GitHub API 提交（站主真实操作产生：`structural-load-testing / wipe-after-pee / standing-vs-sitting-urination` 走「真 404」、`fridge-layout-guide / drinking-water-types / condoms-guide` 反复隐藏-恢复、`paid-test-us-banking-guide / paid-test-us-visa-types` 取消付费）。② **棋类联机 / 宠物中心 / SW 韧性三件套**——`358533e` xiangqi 联机引擎 Phase 1（走子同步 + 颜色绑定 + 视角 + 回合）、`55e547e` Phase 2/3（被邀请者进领地卡坐对应座位 + 房主看入座可换位 + 开局翻盘动画）、`7b61e23` v5（回合倒计时/超时托管 + mode 反转 bug + 取消邀请 + 美化按钮 + 本地翻盘）、`3f0b77b` 把 xiangqi v5 整套领地卡迁移到国际象棋（v1）、`7743c04 4591a76 033fd24` xiangqi 打磨；`07407ac` 食物列表长按拖拽排序 + 干粮可编辑、`04a58de eb82f21 1d19484 a9ba1ab 95f44a0 6be24b3 9e51248` pet-food 弹窗/必填校验/换算基准/拖拽 FLIP/食物选择器圆角；`8fdb248` 宠物数据随账号跨设备同步、`c4d056a` 宠物中心 CSS/JS 外置（HTML 347→128KB）、`5d2ced8` SW HTML 导航加 20s 硬上限 + 4s 网络抢答兜底；额外 `4c8cc78` 修 6-05 P2#1（admin `.adm-mini:hover` + toolbox/random 缩进对齐）、`d9786a9` 加 `docs/territory-lobby-pattern.md` 模板交接文档。**6-05 P1（admin-manifest 公开泄漏 hidden 文）由 `6b92659` 修完，P2#1（admin `.adm-mini:hover` 守卫缺失）+ P2#4（random CSS 缩进）由 `4c8cc78` 修完——P1 队列今日清零，P2 也清掉两项**。今日 `scripts/audit/run.sh` 全套审计 ✅ 全 clean（keywords / images / material_type / filename / hover / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml），`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（8.39 s）。**本次没有可安全自动修复项**——所有审计维度均 clean，30 个 commit 全是大块功能落地，admin 安全模型与棋类调性都涉及取舍，按保守原则不动。残余 P2 4 项（paywall 后端冒烟、scripts 内 `/Users/zhourui/` 硬编码、内部 prompt 称呼 zirconeey、PDF-only 存档手写互链）状态不变。

### ✅ 本次已自动修复

**无**。今日所有审计维度（11 个每日 audit）全部 clean、`bundle exec` 构建零 warning 零 error。30 个 commit 引入的新结构（admin 可见性两档体系 + 墓碑分页归位 + 批量操作 + xiangqi 联机引擎 v5 + chess 领地卡 v1 + pet 跨设备同步 + SW 超时兜底）均为站主大块落地，无 agent 介入余地。6-05 P1（manifest 隐藏文泄漏）已被 `6b92659` 修掉，6-05 P2#1（admin hover 守卫）与 P2#4（random 缩进）已被 `4c8cc78` 修掉——这三项从待办清单移除。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 6-05 的唯一一项 P1（公开 manifest 暴露 `hidden:true` 文章标题/URL/分类）已被 `6b92659` 修复：模板加 `{% unless item.hidden or item.trashed %}`、移除 `hidden`/`trashed` 字段；admin UI 改从鉴权后端 `/api/admin?action=hidden-list` 拉。本地构建验证：`_site/admin-manifest.json` 262 条、`grep -E '"hidden"|"trashed"' = 0`、三篇 `published:false` 文（`wipe-after-pee` / `standing-vs-sitting-urination` / `structural-load-testing`）均不在公开清单。本次巡检未新增 P1。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04/6-05 P2#1。`zircon-urge.fly.dev` 今日仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。本次 `_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 两篇被站主从付费取消（`chore(admin): 取消付费`），当前 `paid:false` + 标题仍带「（付费）」后缀；从 commit 节奏看是后台付费切换流程的真实操作，不是问题，但标题文字与状态不一致——后续若长期保持非付费态可考虑去掉「（付费）」标签，**由站主拍板**。

2. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-05 P2#3。`scripts/` 已被 exclude，不影响线上。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 P2#4。内部 prompt / 文档。

4. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 P2#6。设计取向项，`sibling_crosslink.py` 当前不报警（已用自动侧栏覆盖）。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **国际象棋 `toolbox/chess/index.html` 由 1632 行 → 1986 行（+354 行）**，把 xiangqi v5 整套领地卡 + 联机 + 60s 倒计时 + 翻盘动画一次性迁移过来。`grep` 显示 7 处 `:hover` 全数守卫 `@media (hover: hover)`，与 `hover_no_media.py` clean 一致；架构 inline-only（无 .js / .css 拆分），与 doudizhu / xiangqi 一致同质，不是问题，但**两个文件双双逼近 2000 行**——若以后再加规则变体（变化象棋、960 等）建议照 pet 那种方式抽 .js/.css，**架构判断由站主**。

- **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 体积分别 542 行 / 358 行**，是站主在后台测付费流程时实际写入的完整正文（不再是占位）。当前 `paid:false`、`published:true`、标题含「（付费）」、permalink `/life/paid-test/<slug>`。**不是问题**——sub_category=留学攻略 是合理归类、keywords 充足（22+10 条）；与 P2#1 第二条相关。

- **站主在 6-05 18:00–6-06 01:00 一晚连发 11 条 `chore(admin) ... via 管理后台`**，从 GitHub commit author email `167822299+ruizhou03@users.noreply.github.com` 标识为后台 gh-put 后端运转产生的真实操作 —— 反复 `恢复→真404→恢复→彻底删除→恢复` 调试可见性两档体系（`c5b3267 / 5487cda / e4213f5 / 25e2bb3 / 4ad51b3 / 7d74498` 这一组 feat 与之同步迭代）。**不是问题**，记一笔。

#### 🗒️ 待办清账（承接 6-05）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与昨日完全一致，无变化。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/doudizhu/index.html`**（2399 行 / 92.8 KB，inline-only）—— ✅ 无问题。18 处 `:hover` 全数 `@media (hover: hover)` 守卫；`<link href="/assets/css/games-shell.css">` 与全站游戏骨架一致；单文件大但与全站同质（chess 1986、xiangqi 2108、八字 / 2048 同量级），与 6-02 抽中过审结论一致，本日无回归（最近 30 commit 未涉及 doudizhu）。
- **抽检 2/10 · pdf_archive · `files/adv-metrics-psu/midterm-spring-2025-with-solutions.pdf`**（111.2 KB）—— ✅ 无问题。被 `_notes/study/adv-metrics-psu/midterm-spring-2025-with-solutions.md` 引用、体积 < 1 MB 不需 pdfslim；文件名带年份 + season + with-solutions 信息丰富，命名规则 OK。**LaTeX 化评估**：一次性带答 mid，**维持 PDF 存档即可**。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/adv-micro-pku/adv-micro-pku-2023.md`**（16 行 / 1.3 KB，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=经济学 / course=高级微观经济学（北大）/ material_type=Notes / date=2023-09-01 / author=Zircon）；keywords 充足覆盖中英文术语；PDF 自动导语由 `post.html` 走 course + material_type 触发。**LaTeX 化评估**：PKU 高微全本课程笔记，工作量大、复用频次中等，**加入低优队列**。
- **抽检 4/10 · lecture_note_full · `_notes/study/adv-metrics-psu/survival-guide.md`**（134 行 / 9.8 KB）—— ✅ 无问题（沿用 6-02 抽检结论：八天自救指南，与 PSU 计量同课程交叉链完整、math 段全 LaTeX、keywords 25 条）。本日无变动。
- **抽检 5/10 · lecture_note_full · `_notes/study/mao-thought/mao-final-highlights-2023.md`**（33 行 / 2.5 KB）—— ✅ 无问题。期末重点 highlights 风格，front-matter 含 keywords ≥15 项含中英文（"毛概期末" / "毛中特" / "Mao thought final" / "马克思主义中国化"）；同 sub_category 已由 `sibling_crosslink.py` clean 验证有互链。
- **抽检 6/10 · lecture_note_pdf_only · `_notes/study/corp-fin/mid-sample-1-sol.md`**（16 行 / 1.4 KB）—— ✅ 无问题（沿用 6-05 抽检结论）。本日未变动；与 `mid-sample-1.md`（题面）互为答案/题面对（summary 互链清楚）。
- **抽检 7/10 · pdf_archive · `files/adv-macro-psu/chapters/ch4.pdf`**（177.5 KB）—— ✅ 无问题。同目录有 `ch1_complete_markets.tex / ch2_exogenous_incomplete.tex / ch3_endogenous_incomplete.tex` 这批 .tex 源（**非孤儿，非无源**），ch4 是合并产物或对应 .tex 暂未签入；体积 < 200 KB 不需压。
- **抽检 8/10 · lecture_note_pdf_only · `_notes/study/corp-fin/final-2020.md`**（16 行 / 1.3 KB）—— ✅ 无问题。front-matter 完整（discipline=管理学 / course=公司财务管理 / material_type=Exams / date=2020-09-01）；keywords 27 项含中英文 + 故意保留的"公司材务"错别字兜底；PDF 在 `files/corp-fin/final-2020.pdf`。**LaTeX 化评估**：单年期末真题，**维持 PDF 存档即可**。
- **抽检 9/10 · lecture_note_pdf_only · `_notes/study/corp-fin/mid-sample-1.md`**（16 行 / 1.0 KB）—— ✅ 无问题。题面 PDF，summary 写「配套答案见 mid-sample-1-sol.md；可掐时做完后对照」清晰引导；keywords 24 项含中英文 + 故意保留的"公司材务"与"公司金融"两种别名。
- **抽检 10/10 · note · `_notes/life/sleep-position-curl-up.md`**（293 行 / 23.8 KB）—— ✅ 无问题。「生活之问」专栏五段式齐全；keywords 29 项含中英文（"胎儿姿势" / "fetal position sleep" / "Idzikowski 睡姿调查" / "glymphatic 侧睡" / "阿尔茨海默 侧睡"）；4 处 inline SVG 配 `<p class="img-caption">`；6 个二级标题 + 多个三级标题层次清楚；**`img_caption_md.py` / `svg_italic_zh.py` clean** 印证 caption 与 SVG 格式合规。

---

### 🗂 仓库卫生

**仓库结构较昨日有变化**（30 commit、26 文件、+3162/-399 行；admin 可见性两档体系收口 + xiangqi 联机引擎 v5 + chess 领地卡迁移 + pet 中心瘦身 + SW 韧性），均为既定方向（站主自己实施），无需 agent 再优化。`git diff --diff-filter=A 518c778..HEAD` 仅 1 个新文件：`docs/territory-lobby-pattern.md`（114 行的领地卡设计模板交接文档）—— `docs/` 已在 `_config.yml` exclude 列表内、不会发布到线上、`_site/docs/` 不存在；新文件性质合理（**内部设计文档，非公开内容**）。

**新文件性质核查**：
- `docs/territory-lobby-pattern.md` —— 内部设计模板交接文档，明确"不是公开博文"；已被 `_config.yml: exclude` 截断、构建产物 `_site/docs/` 不存在；**合理新文件**。
- `assets/css/pet.css` + `assets/js/pet.js` —— 由 `_includes/toolbox/pet/{styles,script}.html` `git mv` 改名而来（commit `c4d056a`），原 inline 资源外置；`toolbox/pet/index.html` 引用路径带 `?v={{site.time|date:'%s'}}` 与站内惯例一致；**合理重命名**。
- `assets/js/auth/cloud-sync.js` +7 行（属于 `8fdb248` 宠物跨设备同步），承接已有 auth 命名空间。

**敏感文件扫描**：未发现新出现的 `.env` / `credentials*` / `token*` / `secret*` 等可疑文件名；未发现新跟踪的 `_site/` 中间产物或 `__pycache__/`；未发现 `.DS_Store` 或 `"xxx 2.yyy"` 形式的副本；`git ls-files --others --exclude-standard` 空（无未跟踪文件）；`git status --short` 空（工作区干净）。

**大文件扫描**：前几大跟踪文件与昨日完全一致（or-2023 5.30 MB、monetary-econ-2023 2.96 MB、pdf.worker.mjs 2.06 MB、china-hist-2024 1.73 MB、public-econ-2023 1.67 MB……），无新增超大二进制。

**结论**：仓库卫生 ✅ 干净 —— `docs/territory-lobby-pattern.md` 是合理的内部设计文档（已被 exclude），无新可优化空间。

---

## 2026-06-05

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周五 DOW=5，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=05，未跑 monthly_stats）。距 6-04 巡检共 **28 个 commit**（`f8571fe` 之后 → `68ab739` 为止），主题集中在两条线：① **管理后台 Phase 1-2 一次性铺开**——`b54bd05` 的 /admin/ 骨架延续到 `0d5e2d4 d4dbfed 0bb5417`（jukebox 歌词 107→113，居家 11 首串烧）、`1e75e24` 文章页管理浮条（隐藏/公开 + 看板导航入口）、`6a41c4c` 修浮条对所有访客泄露 + 点击无效、`f4c406d` 就地编辑 UI 重做 + 看板类型标记、`d0d51f3` 软隐藏（管理员可搜可读可改 + 列表变灰 + 隐藏小助手）、`f71b497` 软隐藏三个体验问题（待生效缓冲 / 不显"暂未公开" / 分页不留弹坑）、`132ed73` 齿轮面板「编辑正文与参数」（gh-get 拉源 markdown → 改 → gh-put 带 sha 写回 main）、`7a6931b` 内容管理清单（全部/软隐藏/付费/已下架 + 搜索 + 硬下架真 404 + 删除/回收站）、加上 `9c6d21b 7fb24ba 5a82eeb a484ccb 7da5f42 8ccaf5a c43c61d c115194 f0fe9a2 db18000 4f43132 604b99d` 共 12 条 chore(admin) hidden/published 切换（站主在后台对 wipe-after-pee / standing-vs-sitting-urination / drinking-water-types / birthday-21 四篇做了反复软隐藏调试）；② **棋类领地卡设计统一**（`d4dbfed 0bb5417` jukebox 歌词扩展、`e2d4d87 d833cf5 b30b62b` tiaoqi 三角领地框 + 联机大厅基地着色、`68ab739` xiangqi 开局换成上半盘黑方/下半盘红方两张领地卡、`9cf69cc` CLAUDE.md 第 6 条堵分叉缺口）。今日 `scripts/audit/run.sh` 全套审计 ✅ 全 clean（keywords / images / material_type / filename / hover / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml），`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（6.82 s）。**本次新发现 1 项 P1**：管理后台新增的 `/admin-manifest.json` 公开暴露 `hidden:true` 文章的标题/URL/分类，与 `f71b497` 的「不暴露这是隐藏文章」设计意图相悖。**没有可安全自动修复项**——所有审计维度均 clean，admin 系列改动是大块功能落地，需站主自己把关；新发现 P1 涉及"manifest 是否走 auth"的设计取向，写进待办交站主拍板。残余 P2 5 项（paywall 后端冒烟、scripts 内 `/Users/zhourui/` 硬编码、内部 prompt 称呼 zirconeey、toolbox/random hover 守卫缩进、PDF-only 存档手写互链）状态不变；admin/index.html 的 `.adm-mini:hover` 缺 `@media (hover: hover)` 守卫，作为 P2 新增（admin-only 单用户页面，影响极小）。

### ✅ 本次已自动修复

**无**。今日所有审计维度（11 个每日 audit）全部 clean、`bundle exec` 构建零 warning 零 error。28 个 commit 引入的新结构（管理后台内容清单 / 文章页齿轮 / 硬下架真 404 / xiangqi 领地卡）均为大块功能落地，没有 agent 介入余地——任何 "顺手清理" 都触碰 admin 安全边界或棋类 UI 调性，按保守原则不动。新发现的 admin-manifest 公开暴露问题与 `.adm-mini:hover` 缺守卫均需站主拍板取舍，写进待办。10 项抽检逐项过审（详见下方专项小节）也未发现需要立即修的小问题。

### 📋 待你把关

#### P1（建议尽快）

1. **`/admin-manifest.json` 公开暴露所有 `hidden:true` 文章的标题/URL/分类——与 `f71b497` 的隐私设计意图相悖**。manifest 由 `admin-manifest.json` 这个 Liquid 模板生成，`{% for item in site.notes %}` 遍历全部已发布笔记并输出 `hidden/paid/trashed` 标记。`_site/admin-manifest.json` 当前列出 2 条 `"hidden": true`（`/life/wipe-after-pee`、`/life/standing-vs-sitting-urination`），任何访客 `curl https://ruizhou03.com/admin-manifest.json` 即可拿到完整软隐藏清单。这直接抵消了 `f71b497` "读者访问隐藏文章不再显示'暂未公开'：改为通用「页面不存在」(不暴露这是隐藏文章)" 的效果。三种修法各有取舍——
   - **A. 让 manifest 排除 `hidden:true` / `paid:true` 项**：硬下架走后端 `list-notes(git-tree)` 已是这条路；把软隐藏也从公开 manifest 摘出，让 admin UI 也走后端 `list-notes` 拿全量（后端会做 whoami 鉴权）；优点：完全堵住泄露，与硬下架一致；缺点：失去 manifest 作为构建期清单的便利、admin 列表初次加载会慢一拍。
   - **B. manifest 走鉴权代理（urge 加一个 `/api/admin-manifest` 端点）**：保留构建期生成、生成到 `/admin-manifest.json` 但 robots.txt 禁爬 + Cloudflare Page Rule 仅 admin Cookie 放行；优点：admin 列表不变；缺点：把鉴权下沉到 CF 配置、容易遗忘。
   - **C. 公开 manifest 仅留必要字段（去掉 hidden/paid/trashed 标记 + title 改占位）**：admin UI 需要的 "软隐藏列表" 改走后端；优点：改动小；缺点：admin 浏览器要发两个请求才能渲染。
   - 我的判断：**A 最干净**，与硬下架已有的 `list-notes(git-tree)` 路径一致；admin UI 多一次后端调用换来隐私收口，是合算的。但属于设计取向，由站主拍板。

#### P2（看心情）

1. **`admin/index.html:110` 的 `.adm-mini:hover` 缺 `@media (hover: hover)` 守卫** —— 触屏会卡住 hover 态。admin 只有站主一人访问、有 noindex + sitemap:false + 后端 whoami 二次确认，影响极小；`hover_no_media.py` 只扫 `toolbox/`，未触发。若顺手可加守卫；不加也行。

2. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 P2#1。`zircon-urge.fly.dev` 今日仍 HTTP 403，`scripts/paywall/smoke_test.py` 仍需站主在生产环境跑。

3. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-04 P2#2。`scripts/` 已被 exclude，不影响线上。

4. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-04 P2#3。内部 prompt / 文档。

5. **`toolbox/random/index.html` 5 处 hover 守卫的内层缩进格式不统一** —— 沿用 6-04 P2#4。仅 cosmetic。

6. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-04 P2#5。设计取向项。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **站主在 6-04 下午对三篇"生活之问"做了反复 hidden=true/false 切换**（`drinking-water-types` 4 次、`standing-vs-sitting-urination` 5 次、`wipe-after-pee` 1 次），从 commit 节奏看是新管理后台 UI 的边写边试。最终态：`wipe-after-pee` 与 `standing-vs-sitting-urination` 仍为 `hidden:true`、`drinking-water-types` 为 `hidden:false`、`birthday-21` 在 7fb24ba/9c6d21b 切换后回到 `published:true`。**不是问题**，但与上面 P1 直接相关——这三篇当前已被泄漏到公开 manifest（drinking-water-types 不算，它是 `hidden:false`）。

- **`xiangqi/index.html` 自 `68ab739` 起把开局弹窗替换成棋盘上的两张领地卡，旧 `gs-pgo` 弹窗元素保留供 start/房间逻辑复用（CSS 隐藏）**。代码层是合理的过渡设计（推广跳棋/飞行棋的样板），未发现 dead branch；commit 说明里"邀请联机 档复用现有流程、未做双端 e2e"——是已知未覆盖项，由站主在生产环境验证联机邀请流程是否仍连得上。**不是问题**，记一笔。

#### 🗒️ 待办清账（承接 6-04）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与昨日完全一致，无变化。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/font-style/index.html`**（319 行 / 10.0 KB）—— ✅ 无问题。Unicode 数学字母数字符号区段（U+1D400–U+1D7FF）映射器，4 处 `:hover` 都用 `@media (hover: hover)` 守卫；用 `var(--color-*)` 设计 token 与全站一致；剪贴板带 try/catch 兜底；localStorage 持久化输入；纯单人工具不需要 lb/urge。代码组织清晰（mapByBase 单一 helper + STYLES_LATIN 数据驱动），13 种字体样式数据化。
- **抽检 2/10 · pdf_archive · `files/r-tutorials/r-multiple-linear-regression.pdf`**（510.4 KB）—— ✅ 无问题。被 `_notes/research/r-multiple-linear-regression.md` 引用、由 `scripts/compile-r-tutorials.py` 编译生成（同名 `.tex` 源在 `files/r-tutorials/source/`，**非孤儿，非无源**）；文件名带描述性 slug、无年份冲突；体积 < 1 MB，不需 pdfslim。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/causal-inference/final-2022.md`**（17 行 / 1.4 KB，正文 0 字）—— ✅ 无问题。front-matter 完整（discipline=经济学 / course=因果推断与商业应用 / material_type=Exams / date=2022-09-01 / author=Zircon）；keywords 28 项覆盖中英文与方法名（潜在结果框架 / Rubin causal model / DID / RDD / IV / PSM / synthetic control / uplift modeling / heterogeneous treatment effect / panel data 等）；summary 准确点出"题面 PDF 无答案"+"可与 2023 真题、复习提纲做横向对比"；PDF 自动导语由 `post.html` 走 course + material_type 触发。**LaTeX 化评估**：单年期末真题、一次性资料，**维持 PDF 存档即可**。
- **抽检 4/10 · pdf_archive · `files/public-econ/public-econ-2023.pdf`**（1.7 MB）—— ✅ 无问题。在 `images.py` EXEMPT_FILES 内（与 6-04 / 6-03 状态一致）；被 `_notes/study/public-econ/` 下的笔记引用；体积已知不可再压。
- **抽检 5/10 · game · `toolbox/chess/index.html`**（1637 行 / 75.9 KB，含 ai-worker.js）—— ✅ 无问题（沿用 5-29 / 6-02 多次抽中过审结论）。本日 commit 未涉及该游戏，自上次抽检后无回归风险。
- **抽检 6/10 · note · `_notes/research/zotero-setup.md`**（100 行 / 7.9 KB）—— ✅ 无问题。science.md 风格的"从零搭一套"教程；keywords 32 项覆盖工具名 + 同义词 + 故意保留的拼音兜底 `wenxian guanli`（符合 search-keywords skill 约定）；段落组织（装三个东西 / 抓文献四种姿势 / Better BibTeX / 同步省钱 / 写作工具联动 / 群组库）层次清楚；inline SVG（620×240）配 `<p class="img-caption">` 配文标准；尾段链向 `/research/literature/literature-search` 下一篇。
- **抽检 7/10 · lecture_note_pdf_only · `_notes/study/corp-fin/cheat-sheet-final-2022.md`**（17 行 / 1.4 KB）—— ✅ 无问题（沿用 6-04 抽检结论）。本日未变动。
- **抽检 8/10 · note · `_notes/life/wipe-after-pee.md`**（191 行 / 17.3 KB，**当前 `hidden:true`**）—— ✅ 内容本身无问题。「生活之问」专栏五段式（问题 / 结论先行 / 科学原理 4 节 / 实践建议 / 参考来源）齐全；2 处 inline SVG（出口几何对比 + 细菌迁移路径）配 `<p class="img-caption">`；keywords 32 项含中英文 + UTI / PVD / Kegel / istinja 等专业词；参考文献 7 篇（Gray's Anatomy / Foxman 2014 / UpToDate / Paterson & Plant 2005 / Su et al. 2024 / Bergman & Caine-Bish / AUA 2022）；正文一处 `$\geq 2$` LaTeX 包裹（与 `bare_dollar.py` clean 一致）。**当前 hidden:true** 意味着读者访问得到 404、但 admin-manifest.json 泄漏其存在——见 P1#1。
- **抽检 9/10 · note · `_notes/gre/gre-verbal-errors.md`**（23 行 / 2.6 KB，PDF-only + 自述段）—— ✅ 无问题。GRE 备考"错题本"系列；keywords 19 项含一个故意保留的 "GRE 语文错提" 错别字 + "GRE 语文错题本 完整版" 等长尾搜索；带 `download_label` 字段（PDF 下载按钮的本地化文案）+ summary 写明 8 页结构（前 4 页精选 + 后 4 页字面易错 + 末附生词）；正文段尾链向 `/notes/gre/gre-exam-ui-notebook`（复刻考试界面那篇），关联完整。
- **抽检 10/10 · note · `_notes/life/beef-cuts-guide.md`**（281 行 / 18.8 KB）—— ✅ 无问题。「生活之问」专栏 + extra_categories `菜谱`（前置入口同时挂菜谱大类，合理）；keywords 27 项；2 处 inline SVG（牛部位地图 720×360 + 嫩度×油花/胶原生态位 720×460）配 `<p class="img-caption">`；中英对照速查表 16 行 + 烹饪法分组 5 节 + 常见误区 5 条 + 参考文献 5 篇（Aberle / Toldrá / NAMI / Lepetit 2008 / 农业部 NY/T 676-2010）；引用 `$50\text{-}100\,\mu\text{m}$` LaTeX 包裹（与 `bare_dollar.py` clean 一致）；段间双链向 `/life/cut-meat-grain`（切肉文）两处。

---

### 🗂 仓库卫生

**仓库结构较昨日有重要变化（admin 后台 Phase 1-2 落地 + 6 处 _notes/_includes/_layouts 改动），均为既定方向（站主自己实施），无需 agent 再优化。** `git diff f8571fe..HEAD --stat` 显示 22 个文件、+1005/-56 行；主要落点：`admin/index.html` +250 行（内容管理清单 + 数据看板）、`_includes/admin-article-bar.html` +208 行（文章页齿轮浮条 + 编辑正文与参数）、`_includes/admin-mode.html` +107 行（管理员开关 + 待生效缓冲）、`toolbox/jukebox/lyrics.json` +101 行（歌词 107→113）、`assets/js/games/tiaoqi.js` +93 行（领地框三角化）、`toolbox/xiangqi/index.html` +180 行（领地卡铺盘）、`_includes/auth.html` 与 `_includes/assistant.html` / `_includes/category-listing-tools.html` / `_layouts/{default,post,recipe}.html` 多处小幅接入 admin-mode。

**新文件性质核查**（逐一过 "公开 vs 本地" 标尺）：
- `admin-manifest.json`（仓库根，Liquid 模板）—— 给 admin UI 用的清单源；front-matter 含 `sitemap: false`、`layout: null` —— **公开可访问**（生成到 `_site/admin-manifest.json`，无鉴权）。**新发现 P1**：该文件公开暴露 `hidden:true` 文章的存在，与 `f71b497` 隐私设计意图相悖。需要站主拍板修法。
- `_includes/admin-article-bar.html` / `_includes/admin-mode.html` —— 给读者页面注入的管理浮条 + 模式开关；`6a41c4c` 已修过"对所有访客泄露"的 bug，当前实现 admin-only 显隐 + 后端 whoami 二次确认；安全模型合理。
- 12 条 `chore(admin): hidden=...` 与 1 条 `chore(admin): published=...` —— 均是站主在新管理后台 UI 上做的真实操作产生的 GitHub API 提交，由 `167822299+ruizhou03@users.noreply.github.com` 这个 GitHub commit 邮箱标识，与本人 commit 邮箱（`ruizhou@psu.edu`）区分清楚；**这是新 gh-put 后端运转正常的迹象，不是问题**。

**敏感文件扫描**：未发现新出现的 `.env` / `credentials*` / `token*` / `secret*` 等可疑文件名；未发现新跟踪的 `_site/` 中间产物或 `__pycache__/`；未发现 `.DS_Store` 或 `"xxx 2.yyy"` 形式的副本；`git ls-files --others --exclude-standard` 空（无未跟踪文件）。

**大文件扫描**：前几大跟踪文件与昨日完全一致（or-2023 5.30 MB、monetary-econ-2023 2.96 MB、pdf.worker.mjs 2.06 MB、china-hist-2024 1.73 MB、public-econ-2023 1.67 MB……），无新增超大二进制；1614 个跟踪文件（与 6-04 同量级）。

**结论**：仓库卫生 ✅ 干净——除了上面那个 P1（公开 manifest 暴露 hidden 文章）需要站主拍板，其余无新可优化空间。

---

## 2026-06-04

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周四 DOW=4，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=04，未跑 monthly_stats）。距 6-03 巡检共 **20 个 commit**（`a08e19d` 之后 → `04730f6` 为止），主题集中在两条线：① **统一账号系统 / 后台看板收口**（`b54bd05` /admin/ 骨架页 + 头像菜单管理员入口、`bf8e21d` Phase 2 阅读量/点赞/收藏/评论排行 + 总览、`6bd9acb` 看板走 urge 代理 + 英文首页接 Cloudflare beacon、`d79712f` 全站接入 Cloudflare Web Analytics、`d2e31b4` comments 数据 urge 代理 + 直连兜底、`30a5eb6` /account/ 加 noindex + sitemap:false、`14521ea / 854b9aa` feixingqi/tiaoqi 邀请链接即拷贝修复 + tiaoqi triangle base frame、`3c7cd7a` tiaoqi base config + 联机走 event relay）；② **本地预览常驻服务入库 + 全站 ?v= 缓存破坏 + 宠物工具模块化部署**（`10d9920` 38 文件 224 处加 `?v={{site.time}}`、`30feb00` LaunchAgent 三件套 + README 入 `scripts/local-preview/`、`d85c349` toolbox/pet 由 5303 行单文件拆成 4 个 `_includes/toolbox/pet/{board,modals,script,styles}.html` + 自定义粮食弹窗向导/卡片重做、`478c366 / 5c4e12b / 27f5d03` feixingqi 中心骰子 + base-fill 配置 + 主干开发文档章节落地、`e27c3c8` jukebox 接逐句歌词 10 首 pilot + LRC 解析、`1403841` 还原 3 篇笔记里被 tokenizer 损坏的 NUL 占位符、`6df43cc` CLAUDE.md 分支模型补两条实操、`04730f6` recipe.html 接入 sa-postbar 收藏/点赞栏）。**昨日 4 项 P1 全部已被站主修掉**：NUL byte 3 文件（`1403841`）、`/account/` noindex/sitemap（`30a5eb6`）、`_layouts/recipe.html` 接 sa-postbar（`04730f6`）、pet 单文件膨胀拆 includes（`d85c349`）——P1 队列今日清零。今日 `scripts/audit/run.sh` 全套审计 ✅ 全 clean（keywords / images / material_type / filename / hover / sibling / bare_dollar / img_caption_md / svg_italic / bare_url / frontmatter_yaml），`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（14.14 s）。**本次没有可安全自动修复项**——所有审计维度均 clean，新增的代码（admin 看板 / Cloudflare beacon / sa-postbar 接入 / pet 拆分 / jukebox 歌词）已通过本地静态检查。残余 P2 5 项（paywall 后端冒烟测试需真后端、scripts 内 `/Users/zhourui/` 硬编码、内部 prompt 称呼 zirconeey、toolbox/random hover 守卫缩进 cosmetic、PDF-only 存档手写互链）状态不变。

### ✅ 本次已自动修复

**无**。今日所有审计维度全部 clean（`keywords_coverage` / `images` / `material_type_enum` / `filename_convention` / `hover_no_media` / `sibling_crosslink` / `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` 11 个每日审计无一报警），`bundle exec` 构建零 warning 零 error。10 项抽检逐项过审（详见下方专项小节）也未发现需要立即修的小问题。20 个 commit 引入的新结构（admin 看板、Cloudflare 数据、sa-postbar 接 recipe、pet 拆 includes、jukebox 歌词、本地预览三件套）均已被昨日 P1 队列承接并由站主亲自落地，无 agent 介入余地。

### 📋 待你把关

#### P1（建议尽快）

**P1 队列今日清零** —— 昨日 4 项 P1（NUL byte / `/account/` noindex / `recipe.html` sa-postbar / pet 单文件膨胀）已全部在今日的 20 个 commit 中被站主修掉，详见上面综述。本次巡检未产生新的 P1。

#### P2（看心情）

1. **新付费墙系统初版上线但本沙箱无后端出口验证** —— 承接 6-03 P2#5。`zircon-urge.fly.dev` 今日仍 HTTP 403，`/api/auth?action=*`、`/api/paid?action=publish`、`/api/redeem` 等付费墙端点仍无法在沙箱拉测。建议站主在生产环境跑一次 `python3 scripts/paywall/smoke_test.py`。

2. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-03 P2#6。`scripts/` 已被 `_config.yml` exclude，不影响线上，是一次性导入工具的合理硬编码。

3. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-03 P2#7。内部 prompt / 文档，属本机 / 历史标识符范畴。

4. **`toolbox/random/index.html` 5 处 hover 守卫的内层缩进格式不统一** —— 沿用 6-03 P2#8。`hover_no_media.py` 今日 clean，5 处守卫功能完全正常；仅 cosmetic，建议不动。

5. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-03 P2#9。设计取向项，由站主拍板。

#### 🆕 本次抽检 10/10 中新出现的观察（不是问题，是提示）

- **`_notes/study/corp-fin/cheat-sheet-final-2022.md` 与 `_notes/study/psy-stat-I/cheat-sheet-final-2022.md` 共用同名 PDF basename，但 `pdf_url` 分别指向 `/files/corp-fin/cheat-sheet-final-2022.pdf` 与 `/files/psy-stat-I/cheat-sheet-final-2022.pdf`** —— 各自路径独立、无冲突，命名约定（同类材料同 basename）反而便利后续脚本批处理。**不是问题**，记一笔以防今后跨课程合并工具误判。

- **`toolbox/jukebox/lyrics.json` 22.4 KB 当前 10 首 pilot 歌词** —— 文件随首方资源走 `?v=` 缓存破坏，不进 SW 缓存（外链 + no-store），单次首屏代价可接受。若全量上 30+ 首估计落到 60–80 KB，仍在可接受范围；只是若后续达到 100+ 首可以考虑按曲懒加载或分片。**不是问题**，仅是规模预警。

#### 🗒️ 待办清账（承接 6-03）

- **图片 alt / caption 覆盖**：`images.py` 今日仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），收口状态保持。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套全报 HTTP 403。不阻塞巡检；fly app 健康度未在本沙箱主动复查。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + monetary-econ-2023.pdf 2.96 MB + 一系列 1–1.8 MB 课程 PDF）：`images.py` 输出与昨日完全一致，无变化；前 10 大文件均在 EXEMPT_FILES。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/runner/index.html`**（1077 行 / 38.8 KB）—— ✅ 无新问题。本文件昨日已抽中过审，今日未变；games-shell.css 已带 `?v=` 缓存破坏（`10d9920`）。touchstart/touchend 配对干净；专为触摸设计、零 `:hover`（与 `hover_no_media.py` clean 一致）。
- **抽检 2/10 · pdf_archive · `files/corp-fin/cheat-sheet-final-2022.pdf`**（818.0 KB）—— ✅ 无问题。被 `_notes/study/corp-fin/cheat-sheet-final-2022.md:14` 的 `pdf_url` 引用、命名规则带年份 (`cheat-sheet-final-2022.pdf`) 符合 `filename_convention.py` ✅、体积合理（cheat sheet 类 < 1 MB 是常态，不需要 imgslim/pdfslim）。**LaTeX 化潜力**：cheat sheet 形态高度紧凑（pre-高数符号 + 表格 + 多列布局），LaTeX 化工作量大但产出有限；该类材料**建议维持 PDF 存档即可**——除非站主打算逐年迭代更新版本（不是一次性资料）。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/corp-fin/cheat-sheet-final-2022.md`**（17 行 / 1.4 KB，正文 0 字）—— ✅ 无新问题。front-matter 完整（discipline=管理学 / course=公司财务管理 / material_type=Exams / date=2022-09-01 / author=Zircon）；keywords 28 项（WACC / NPV / IRR / CAPM / MM / DCF / CAPM 等术语全覆盖）；PDF 自动导语由 `post.html` 按 course + material_type 触发。**LaTeX 化评估**：与抽检 2 同结论——维持 PDF。
- **抽检 4/10 · note · `_notes/life/electric-vs-manual-toothbrush.md`**（420 行 / 25.5 KB）—— ✅ 无问题。「生活之问」专栏五段结构（声明 / 问题 / 结论先行 / 展开 / 收尾）齐全；开篇先有"无任何品牌赞助"声明，调性符合专栏；keywords 26 项覆盖中英文术语（巴氏刷牙法 / electric toothbrush / 牙菌斑 plaque / periodontitis 等）；正文未出现裸 `$` 金额（与 `bare_dollar.py` clean 一致）。
- **抽检 5/10 · note · `_notes/life/structural-load-testing.md`**（281 行 / 21.8 KB）—— ✅ 无问题。「生活之问」专栏；LaTeX 公式正确使用 `$2.5\,\text{kN/m}^2$` 包裹（与 `bare_dollar.py` clean 一致）；keywords 34 项覆盖中英文与规范号（GB 50010 / ASCE 7 / E-Defense / structural health monitoring 等）；事实陈述谨慎（提到比例模型 + 限界状态设计 + 监测的结合，未夸大）。
- **抽检 6/10 · lecture_note_full · `_notes/study/real-anal/real-anal-ch1-2024.md`**（21 行 / 1.6 KB + summary + 导语段 + .tex 源链接 + 合并版链接）—— ✅ 无问题。front-matter 完整（discipline=数学 / course=实分析 / material_type=Notes / date=2024-09-01 / published=true）；keywords 31 项覆盖中英文与教科书路径（外测度 outer measure / Carathéodory 准则 / σ-代数 / Lebesgue measure 等）；底部 `<p class="img-caption">` 标准格式给出 .tex 源 + 7 章合并版交叉链接。
- **抽检 7/10 · note · `_notes/life/cat-language.md`**（117 行 / 9.9 KB）—— ✅ 无问题。开篇钩子（喵回去）抓人；指向 `/toolbox/cat-language/` 联动工具的引导清晰；keywords 30 项覆盖中英文与同义口语（猫语 / 呼噜 / 哈气 / cat sounds / cat meow / 慢眨眼 等）；专栏问题清单格式。
- **抽检 8/10 · note · `_notes/research/r-anova-manova.md`**（16 行 / 938 B，PDF-only + summary）—— ✅ 无问题。R 教程系列存档式，正文 1 行（.tex 源 link），由 `post.html` 走 PDF 自动导语；keywords 19 项含一个故意保留的 "ANVOA" 错别字（覆盖错搜场景，符合 search-keywords skill 约定）；与同系列其他 R 教程 sibling 互链已被 `sibling_crosslink.py` ✅ 判过。
- **抽检 9/10 · lecture_note_pdf_only · `_notes/study/adv-micro-psu/2025-midterm-2.md`**（16 行 / 1.2 KB，正文 0 字 + summary）—— ✅ 无问题。front-matter 完整（discipline=经济学 / course=高级微观经济学（PSU） / material_type=Exams / date=2025-04-01 / author=Zircon）；keywords 20 项覆盖中英文（ECON 521 / Krishna 高微 / mechanism design / VCG / revelation principle / Bayesian games 等）；PDF 自动导语 + 手写 summary 双保险。**LaTeX 化评估**：单年期中真题、一次性资料，**维持 PDF 存档即可**。
- **抽检 10/10 · game · `toolbox/drawing/index.html`**（372 行 / 14.7 KB）—— ✅ 无问题。CSS 注释明示「全局/卡片/画布」分区清晰；`var(--color-*)` 与全站设计 token 一致；体积可控（无独立 .js/.css 也合理，单文件可读）。

---

### 🗂 仓库卫生

**仓库结构较昨日有重要变化但已被站主自己处理完毕，无需 agent 再优化。** 今日 commit 历史显示三类结构性动作：① `d85c349` 把 `toolbox/pet/index.html` 由 5303 行单文件拆成 4 个 `_includes/toolbox/pet/{board,modals,script,styles}.html`（5579 行落到 4 个文件，主入口缩到 21 行），与昨日 P1#3 建议方向完全一致；② `30feb00` 把本地预览常驻服务三件套（包装脚本 + plist + install.sh + README）入库到 `scripts/local-preview/`，`scripts/` 已在 `_config.yml` exclude 不上线；③ `e27c3c8` 新增 `toolbox/jukebox/lyrics.json`（22.4 KB / 10 首 pilot），与同目录 `index.html`、`manifest.json` 一起构成完整资源包。

**新文件性质核查**（逐一过 "公开 vs 本地" 标尺）：
- `_includes/toolbox/pet/{board,modals,script,styles}.html` —— ✅ 给读者用的页面组件，应跟踪。
- `scripts/local-preview/{README.md,install.sh,jekyll-local-preview.sh,com.ruizhou03.site-preview.plist}` —— ✅ 是给站主自己用的本地工具链，`scripts/` 已在 `_config.yml` exclude（不发到 GH Pages 公开站点），但跟踪到 git 仓库本身 OK——README 解释来龙去脉、install.sh 幂等且对 EIO 重试、plist 模板含 `${HOME}` 占位不暴露用户名，所有文件无密钥/绝对个人路径/敏感凭证。
- `toolbox/jukebox/lyrics.json` —— ✅ 是给读者用的歌词数据（虽然 `noindex + sitemap:false + 不在 toolbox.yml`，仍属公开站点资源）。
- `toolbox/jukebox/manifest.json` —— ✅ 同上，歌单元数据。
- `admin/index.html` —— ✅ 管理后台入口，自带 noindex（front-matter `noindex: true`、`sitemap: false`）+ 后端 whoami 二次确认，前端 isAdmin 仅显隐不作授权依据。安全模型符合上游设计。

**敏感文件扫描**：未发现新出现的 `.env` / `credentials*` / `token*` / `secret*` 等可疑文件名；未发现新跟踪的 `_site/` 中间产物或 `__pycache__/`；未发现 `.DS_Store` 或 `"xxx 2.yyy"` 形式的副本；`git ls-files --others --exclude-standard` 空（无未跟踪文件）。

**大文件扫描**：前 10 大跟踪文件全部是已知的 EXEMPT 课程 PDF（or-2023 5.30 MB、monetary-econ-2023 2.96 MB、pdf.worker.mjs 2.06 MB、china-hist-2024 1.73 MB、public-econ-2023 1.67 MB、interm-macro-2022 1.63 MB、psy-stat-II-2023 1.49 MB、Macro.pdf 1.43 MB、monetary-econ-hw-summary 1.40 MB、game-theory-mid-2023 1.37 MB），与昨日完全一致，无新增超大二进制。

**结论**：仓库卫生 ✅ 干净；昨日 4 项 P1（含拆 pet 这种大动作）已被站主在 20 个 commit 中按既定方向修掉；今日无新可优化空间。

---

## 2026-06-03

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周三 DOW=3，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=03，未跑 monthly_stats）。距 6-02 巡检共 **29 个 commit**（4fcdde1 ~ 9bbe11a，含本次自动修复前最后一条 `9bbe11a`），主题分两大块：① **付费墙系统首发与多轮调优**（`a7e8407 feat(paywall): 账号无关的兑换码付费墙机制` → `3389ef2 feat(paywall): 站内扫码收银（虎皮椒）` → `7faec92 feat(paywall): 账号绑定跨设备漫游` → `712d826 feat(paywall): 三档制——加「整栏买断」专栏权益 + 留学攻略付费测试两篇`，含 4 次紧密调优 `57496e6 / 16e7194 / d8716f4 / 9bbe11a`，新增 `_includes/paywall.html`、`assets/js/paywall/paywall.js`、`scripts/paywall/{build_paid,gen_codes,smoke_test}.py`、`_paid/_TEMPLATE.md`，并在 `.gitignore` + `_config.yml` 双重屏蔽 `_paid/` 全文源，2 篇留学攻略测试文章上线 `/life/paid-test/us-{banking-guide,visa-types}`）；② **统一账号系统 Phase 4 ~ 5b 收尾**（`93373c2` Google Identity Services 登录、`2ff7707 / f559bfa` 桌面端账号入口绝对定位、`82a46cd / 86293ae` 评论框预填 + 文末点赞接入账号身份、`e1e7625` CloudSync 全局模块、`8a70b7b` 修身份采用的关键 bugfix）；以及 `2e16cee` 新增 JJ 私藏歌单隐藏播放页（`/toolbox/jukebox/`，noindex + sitemap:false，不进 toolbox.yml 故不上百宝箱主页）、`106778a` 飞行棋移动端重构 + 棋类控件紧凑化、`6f3d66e` 跳棋 pregame 遮罩推翻、`84f46c1 / 5d98d19 / c772939` pet 小调、`2e50b9c / 2be3c40` guandan 横屏 4 处 UI + 加倍阶段 dim、`72c39ae` localhost 不注册 SW、`410682f / e7c27eb` jukebox 修整页点不动 + manifest MIME。**今日审计新发现 2 项无争议低风险已自动修复**：jukebox/index.html 5 处 hover 缺 `@media (hover: hover)` 守卫；audit 脚本 `keywords_coverage.py` 不识别"无缩进 YAML 块式 keywords 列表"，把 2 篇付费测试文章误判为 0 项 keywords（实际两篇都有 24-46 项）。3 项 P1 持续待办（NUL byte 3 文件 / `/account/` sitemap / `_layouts/recipe.html` 没接 sa-postbar / pet 单文件膨胀）状态不变；新增 1 项 P2（toolbox/random hover 守卫的内层缩进格式）+ 2 项 P2（mid-2015 与 anova-R 这种纯 PDF 存档可加同课程互链入口）。

### ✅ 本次已自动修复

1. **`toolbox/jukebox/index.html` 5 处 hover 规则补 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 新报。L45 `.card:hover .play`、L64 `.topbar button:hover`、L91 `.row:hover`、L108 `.bar:hover .knob`、L126 `.mini .miniprog:hover .knob`，5 处全部裸 `:hover`。jukebox 是 6-01 `2e16cee` 新建的 JJ 私藏歌单隐藏播放页（`sitemap: false`、`noindex: true`、`<meta name="robots" content="noindex, nofollow">`），整个文件从头开始写，作者未沿用 toolbox 内 hover 守卫的全局约定，5 处都漏。fix：每条单行 `selector:hover{...}` 包成 `@media (hover: hover) { selector:hover{...} }`。修完 `hover_no_media.py` 复跑 ✅ clean。性质与 5-29 ~ 6-02 系列 hover 守卫一致，触摸设备不再卡在 hover 高亮态。

2. **`scripts/audit/keywords_coverage.py` 修 `count_keywords` 误判 bug：现支持无缩进 YAML 块式列表** —— 今天 `keywords_coverage.py` 把 `_notes/life/paid-test-us-banking-guide.md`（46 项）和 `_notes/life/paid-test-us-visa-types.md`（24 项）误报为「仅 0 项」。根因：`scripts/paywall/build_paid.py` 用 `yaml.safe_dump(... default_flow_style=False)` 生成预览文件，PyYAML 默认把列表项写在父键同列、不带前导空格（`keywords:\n- a\n- b\n`），这是合法 YAML（Jekyll 也正确解析），但 `count_keywords` 旧逻辑要求 `l.startswith(" ") and l.lstrip().startswith("-")` 才计数，遇上零缩进 `- item` 直接 `break`。fix：① 把行内/块式分支统一从 `lines[idx]` 切割再判断（不再依赖 `re.search(r"^keywords:\s*(.+)$"` 在「同行无内容」时漏匹配的副作用）；② 块式分支用 `stripped.startswith("- ")` 容纳缩进与零缩进两种合法格式，空行 `continue`，遇下一个键 `break`。修完两篇付费测试文章的 keywords 正确被计数（46 / 24 项），全站 `keywords_coverage` ✅ clean。**为什么不反向改文件**：这两篇是 `build_paid.py` 自动生成产物，手改 .md 下次重跑会回退；source 的 `_paid/` 在 `.gitignore` 内且仅用户本地有，无法直接动；最小正确修法是修审计脚本（一个真 bug：误判合法 YAML 格式）。

复跑全套 `scripts/audit/run.sh` ✅ clean（含本次修复的 keywords 和 hover_no_media），`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（5.68 s）。

### 📋 待你把关

#### P1（建议尽快，承接 6-02）

1. **账号系统首发：`/account/` 页应否进 sitemap + 被搜索引擎索引？** —— 承接 6-02 P1#1，状态完全不变。`account/index.html` 顶部 front-matter 仍只有 `layout / title / permalink`，sitemap 仍报 `https://ruizhou03.com/account/`。建议给 front-matter 加 `sitemap: false`，并通过 `_layouts/default.html` 注入 `<meta name="robots" content="noindex, follow">`（参考 `/toolbox/dare/` / `/toolbox/pet-food/` 两个 redirect stub）。本次本想顺手做但仍属设计判断（要不要让访客通过 Google 发现"这站有账号系统"），不擅动。

2. **`_layouts/recipe.html` 未接入 `sa-postbar` 收藏/点赞栏** —— 承接 6-02 P1#2，状态不变。`grep "sa-postbar" _layouts/recipe.html` 0 命中；`_layouts/post.html` L818–923 已有完整 sa-postbar HTML+CSS+初始化 JS。后果：登录用户做菜谱无法收藏点赞，"我的主页"的「收藏」tab 看不到他们打开过的菜谱。本次新加 Phase 4/5 评论框预填 + 后端 CloudSync 都未涉及 recipe.html，所以这块仍待拍板。

3. **pet 单文件 5261 行（本站极值）建议拆 `_includes/pet-*.html` 子组件** —— 承接 6-02 P1#3，今日 3 次 pet style/fix 触及（`84f46c1` 空状态宠物码移位 + `5d98d19` 食量分段控件 + `c772939` 修食量配置被后台拉取覆盖），单文件行数小幅 +30 ~ +60 行（精确数未跑 wc），仍在 5300 行量级。建议方向不变。

4. **3 个 .md 文件含 NUL byte (`\x00`) 包裹的占位符（M3 / M4 / CJK2 / CJK3 / CJK30）** —— 沿用 5-29 → 6-02。`_notes/life/fridge-layout-guide.md` L157、`_notes/research/r-brucer-moderation-mediation.md` L59/L75、`_notes/research/latex-commands.md` L265，今日 `python3 -c "import pathlib; [print(p) for p in pathlib.Path('_notes').rglob('*.md') if b'\\x00' in p.read_bytes()]"` 复核仍是这 3 个文件。`fridge-layout-guide` 是新文章影响最大，建议先处理。

#### P2（看心情）

5. **新付费墙系统初版上线但本沙箱无后端出口验证**：`zircon-urge.fly.dev` 在沙箱内 HTTP 403，今日新加的 `/api/auth?action=*`、`/api/paid?action=publish`、`/api/redeem` 等付费墙端点全部无法实际拉测。仅做静态检查（include 模板、JS 文件结构、`_paid/_TEMPLATE.md` schema、scripts/paywall/{build_paid,gen_codes,smoke_test}.py 代码合理性）。建议站主在生产环境跑一次 `python3 scripts/paywall/smoke_test.py` 覆盖：生成兑换码 → 上传锁定正文 → 解锁 → 看到正文 全链路。

6. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 沿用 6-02 P2#5。`scripts/` 已被 `_config.yml` exclude，不影响线上，是一次性导入工具的合理硬编码。

7. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-02 P2#6。内部 prompt / 文档，属本机 / 历史标识符范畴。

8. **`toolbox/random/index.html` 5 处 hover 守卫的内层缩进格式不统一** —— 本次抽检发现（详见下方抽检 6/10）。所有 5 处 `:hover` 规则均已被 `@media (hover: hover) { ... }` 正确守卫，仅闭合 `}` 视觉对齐与其它 toolbox 工具略有差异。纯 cosmetic 问题，**功能完全正常**，建议不动。如果将来批量整理 toolbox 代码风格再一起处理。

9. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 本次抽检 3/10 与 7/10 发现（详见下方抽检小节）。两篇本身 front-matter 齐全、keywords 充足、PDF 可达、`sibling_crosslink.py` 也判 ✅（同 `sub_category` 已有互链入口），但单篇正文是 0 字（纯 PDF 存档）。如果想做得更厚——给每篇正文补 1 ~ 3 行手写互链，让用户从这一页能一键跳到同课程的 cheat-sheet / 作业 / 期末等姐妹篇，会比 sibling 侧栏更显眼。**设计取向项**，由站主拍板要不要做、做哪些 PDF-only 存档。

#### 🗒️ 待办清账（承接 6-02）

- **图片 alt / caption 覆盖**：`images.py` 仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），收口状态保持。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套全报 HTTP 403。不阻塞巡检；fly app 健康度未在本沙箱主动复查。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + psy-stat-II-2023.pdf 2.70 MB + 12 张 500KB–1.5MB 图）：`images.py` 输出与昨日完全一致，无变化。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game/pdf_archive/lecture_note_pdf_only 各 ≥1，其余随机）。逐项过审查清单，按"已修复 / 待办 / 长期建议"分类汇总。

- **抽检 1/10 · game · `toolbox/runner/index.html`**（1077 行）——✅ 无问题。全文 0 处 `:hover` 规则（runner 专为触摸设计），有 `@media (hover: none) and (pointer: coarse)` 块（L120）专门走 tap 路径；touchstart/touchend/touchcancel 三事件配对干净；无 console.log/debugger。
- **抽检 2/10 · pdf_archive · `files/adv-metrics-psu/midterm-spring-2025-with-solutions.pdf`**（111.2 KB）——✅ 无问题。被 `_notes/study/adv-metrics-psu/midterm-spring-2026.md:17` 作为「配套阅读」引用；同目录 .md 的 `pdf_url` 路径一致；体积合理。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/adv-metrics-pku/mid-2015.md`**（17 行 / 1.2 KB）——✅ front-matter 齐全（discipline / course / material_type / date / pdf_url / permalink / keywords 26+ 项），PDF 可达 `/files/adv-metrics-pku/mid-2015.pdf`；同 sub_category 的 `sibling_crosslink.py` 已 ✅。📋 **P2#9**：可考虑补正文手写互链到 `final-2015` / `adv-metrics-pku-2023` 教材。
- **抽检 4/10 · game · `toolbox/bazi/index.html`**（1455 行）——✅ 无问题。11 处 `:hover` 全部独立用 `@media (hover: hover)` 守卫（含昨日修的 L93），0 console.log/debugger。
- **抽检 5/10 · pdf_archive · `files/gre/GRE-Verbal-Blanks.pdf`**（255 KB）——✅ 无问题。被 `_notes/gre/gre-verbal-errors.md:22` 与 `_notes/gre/gre-exam-ui-notebook.md:321` 双向引用；`gre-verbal-errors.md` 的 `pdf_url` 指 `-Ans.pdf`（答案版为主、题目版正文里 link）是有意为之。
- **抽检 6/10 · game · `toolbox/random/index.html`**（2093 行）——✅ 功能干净。5 处 `:hover` 全部用 `@media (hover: hover)` 守卫，0 console.log/debugger。📋 **P2#8**：守卫内层闭合 `}` 视觉对齐与其它工具略有差异，纯 cosmetic。
- **抽检 7/10 · lecture_note_pdf_only · `_notes/study/psy-stat-I/anova-R.md`**（17 行 / 1.2 KB）——✅ front-matter 齐全（29 项 keywords，极厚），PDF 可达 `/files/psy-stat-I/anova-R.pdf`，sibling crosslink ✅。📋 **P2#9**：同课程有 6 篇姐妹笔记（cheat-sheet-mid/final、demo-summary、final-2022、hw-summary、mid-2022），可考虑补手写互链。
- **抽检 8/10 · game · `toolbox/blackjack/index.html`**（1139 行）——✅ 无问题。2 处 `:hover` 全部用 `@media (hover: hover)` 守卫（L294 / L301），0 console.log/debugger，12 处事件监听调用配对干净。
- **抽检 9/10 · pdf_archive · `files/real-anal/real-anal-ch5-2024.pdf`**（57 KB）——✅ 无问题。同目录 `_notes/study/real-anal/real-anal-ch5-2024.md` 的 `pdf_url` 一致；体积合理；仅被自身 .md front-matter 引用（独立章节存档的正常模式）。
- **抽检 10/10 · note · `_notes/life/us-bathroom-stall-gaps.md`**（186 行 / 13.6 KB）——✅ 无问题。全文通读后未发现事实错误 / 自相矛盾；`<p class="img-caption">` 配文无 markdown 残留；keywords 20 项足量；SVG 图表无中文斜体。L8 keywords 含「公共测所门缝」typo——按 `search-keywords` skill 哲学这是**有意为之**的容错关键词（catch typos），保留。

### 🗂 仓库卫生

- **架构变化（6-02 → 6-03，29 个 commit）**：
  - **新增付费墙系统（重大架构变化）**：
    - `_includes/paywall.html` 全新（约 280 行：付费卡 HTML + 收银浮层 + 内嵌 CSS + 凭证存取注释），仅在 `_layouts/post.html:262` 经 `{% if page.paid %}` 闸门 include；
    - `assets/js/paywall/paywall.js` 全新（站内扫码收银流程 + onPaid 回调 + fetchContent 兜底 + token 注入）；
    - `scripts/paywall/{build_paid.py, gen_codes.py, smoke_test.py, README.md}` 全新（构建/发码/烟测/文档四件套）；
    - `_paid/_TEMPLATE.md` 全新（付费文章源 schema 模板）；
    - `.gitignore` + `_config.yml` 同时屏蔽 `_paid/*`（仅 `_TEMPLATE.md` 留作公开示范）——双重保险，**锁定正文绝不进公开仓库**；
    - 2 篇留学攻略付费测试文章上线：`_notes/life/paid-test-us-banking-guide.md`（46 keywords / `paid_slug=liuxue-test-banking` / `price=¥6` / `column=liuxue` / `column_price=¥39` / `member_price=¥15`）与 `paid-test-us-visa-types.md`（24 keywords / `paid_slug=liuxue-test-visa`），均含 `<!-- 由 build_paid.py 自动生成 -->` 警告横幅；
    - 后端依赖：`https://zircon-urge.fly.dev/api/paid?action=publish`、`/api/redeem?action=verify`、`/api/me` 等，**本沙箱无 fly 出口未实际验证**；
    - `_site/_paid` 不存在 ✅，`_site/scripts` 不存在 ✅，sitemap 含 `/life/paid-test/us-{banking-guide,visa-types}` 是有意为之（付费文章主体页对外索引、付款墙隐藏正文）。
  - **账号系统 Phase 4 ~ 5b 收尾**：`93373c2` Google Identity Services 登录按钮（前端 GIS SDK 集成）；`2ff7707 / f559bfa` 桌面端账号入口绝对定位到顶栏最右（与英文站 theme/lang 切换像素级对齐）；`82a46cd` 评论框预填用户身份（Phase 4）+ 登录后采用账号身份覆盖匿名 did（Phase 5a）；`86293ae` 宠物中心 + 文末点赞接入账号身份（Phase 5b 收尾）；`e1e7625` CloudSync 全局模块挂上 `_layouts/default.html`，本地工具数据云同步；`8a70b7b` 身份采用 bug：逐 key 独立备份避免无备份覆盖设备 id（关键修复）；`4d66e71` 填入 OAuth Client ID 启用 Google 登录。
  - **新增 toolbox 1 个（隐藏，未登记）**：`toolbox/jukebox/`（JJ 私藏歌单，`sitemap: false`、`noindex: true`、`<meta name="robots" content="noindex, nofollow">`、L13 `<title>JJ · 私藏歌单</title>`），**未登记到 `_data/toolbox.yml`**——这是有意为之的"隐藏页"模式，类似 `unlisted` 路径，搜索引擎不索引，百宝箱主页也不挂入口，仅供作者自用。toolbox/ 实际子目录 53 个，扣 dare/pet-food 两个 redirect stub + jukebox 一个隐藏页 = 50 实工具 ↔ `_data/toolbox.yml` 50 条 url 一一对应、无孤儿、无悬空。
  - **小游戏 / 工具深做**：`106758a` 飞行棋手机配置重构 + 棋类控件紧凑化 + memory 开局卡片 + 榜单呼吸位（6 个文件改动）；`6f3d66e` 跳棋推翻 pregame 遮罩，进入即真棋盘；`84f46c1 / 5d98d19 / c772939` pet 三处小调（空状态宠物码移位 / 食量分段控件改贴合 / 食量配置被后台拉取覆盖修复）；`2e50b9c` guandan 手机横屏 4 处 UI；`2be3c40` guandan 加倍阶段不再 dim 我的手牌；`410682f` jukebox 修整页点不动 + manifest 绕 SW；`e7c27eb` jukebox 串烧曲名分隔符统一。
  - **基础设施**：`72c39ae` localhost 不注册 Service Worker（本地 jekyll serve 即时预览不再被 SWR 拖成旧版）。
- **追踪卫生**：
  - 工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak` / `*~` / `.synctex.gz` / `*.aux` 编辑器垃圾；`git ls-files --others --exclude-standard` 0 命中（无未跟踪文件）；`_site/`、`.jekyll-cache/`、`.jekyll-metadata`、`Gemfile.lock` 均被 `.gitignore` 正确忽略。
  - `console.log` / `debugger` / `TODO` / `FIXME` / `XXX` 残留扫描：本次新增的 5 个核心文件（`_includes/paywall.html`、`_includes/auth.html`、`assets/js/auth/auth.js`、`assets/js/auth/cloud-sync.js`、`assets/js/paywall/paywall.js`、`toolbox/jukebox/index.html`）**全部干净，0 处 console.log/debugger**。
  - 硬编码密钥扫描无新发现；`_paid/*` 已被 `.gitignore` + `_config.yml` 双重屏蔽，付费正文不会泄露。
  - 本机绝对路径：见 P2#6，状态不变（shell 脚本已修，剩 3 个 .py 一次性导入工具不变）。
- **构建健康**：`bundle exec ruby -e "require 'jekyll'; Jekyll::Commands::Build.process(...)"` 通过、零 warning、零 error（5.68 s）；`_site/_paid` 不存在 ✅，`_site/scripts` 不存在 ✅。`_site/` 根目录扫描确认 `DAILY_REVIEW.md` / `EMAIL_SUMMARY.md` / `SPOTCHECK_100_REPORT.md` / `SPOTCHECK_100_AGENT_REPORTS.md` / `TOOLBOX_AUDIT_REPORT.md` / `scripts/` / `backends/` / `tools/` / `.claude/` / `docs/` / `audio/` / `_paid/` 全部正确 exclude。
- **前置字段一致性**：`frontmatter_yaml` ✅；`keywords_coverage` 散文 121 篇全部充足（修 audit bug 后，2 篇付费测试文章正确被计数）；`_notes/study/` 全部有 `discipline`；菜谱必填字段齐全。新付费测试文章 2 篇均有完整 front-matter（含 paid_slug / price / column / column_price / member_price / afdian_url）。
- **百宝箱一致性**：`toolbox/` 下 **53 个工具子目录 - 2 个 redirect stub（dare/、pet-food/）- 1 个隐藏页（jukebox/）= 50 个公开实工具** ↔ `_data/toolbox.yml` 50 条 `url` 一一对应、无孤儿、无悬空。
- **audit 全套结果**：keywords ✅（修 audit bug 后）/ images（基线 2 大 PDF）/ backend_pulse（沙箱 403）/ spotcheck（10 项已逐条审完，见上）/ material_type ✅ / filename_convention ✅ / hover_no_media ✅（fix 后）/ sibling_crosslink ✅ / bare_dollar ✅ / img_caption_md ✅ / svg_italic_zh ✅ / bare_url ✅ / frontmatter_yaml ✅。今日周三，未跑 dead_links / orphan_files / pii_scan。
- **结论**：今日 2 项无争议自动修复（jukebox 5 处 hover 守卫 + keywords_coverage 误判合法 YAML 的 bug），4 项 P1 持续待办（NUL byte / account sitemap / recipe sa-postbar / pet 拆组件），新增 2 项 P2（toolbox/random 缩进 cosmetic / 纯 PDF 存档可加手写互链），3 项 P2 持续待办。重大架构变化：付费墙系统首发上线 + 账号系统 Phase 4 ~ 5b 收尾 + JJ 私藏歌单隐藏页。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-02 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**重要新增**：付费墙系统的 `/api/paid?action=publish`、`/api/redeem?action=verify` 端点也走同一 fly app（zircon-urge），本沙箱无法主动验证；建议站主在生产环境跑 `python3 scripts/paywall/smoke_test.py` 全链路烟测。

---

## 2026-06-02

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周二 DOW=2，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=02，未跑 monthly_stats）。距 5-31 巡检共 **52 个 commit**（含本次自动修复前最后一条 `0fcd074`），跨度 6-01 ~ 6-02 两天合并审；内容极密集，主题分三大块：① **新增「八字排盘」百宝箱**（`/toolbox/bazi/`，13 个 commit 迭代，含人物档案 / 大运 10 步 / 单贡/双贡进贡 / 已知八字直填四柱 / 双人合婚）；② **宠物中心大改造**：`/toolbox/pet-food/` → `/toolbox/pet/` 整体改名 + redirect stub、记录区改三列布局、体重/粮食卡 4 轮 redesign 收成一体式三段、目标进度条可点击、加粮自动识别、当前体重特写卡（共 14 个 commit，单文件已 5261 行）；③ **统一账号系统 Phase 0–3 全栈前端落地**（`account/index.html` + `_includes/auth.html` + `assets/js/auth/auth.js`，挂在 default.html 的 #auth-slot、post.html 加收藏/点赞 sa-postbar，记录浏览归账号）；以及若干 `guandan`/`doudizhu`/`feixingqi`/`dare→dontdoit` 改名 + redirect / `dontdoit` 重做 / `tiaoqi` minimax bug / `gomoku` resize 崩溃修复 / `sw.js` HTML no-cache 复验 / `pwa` 真 PNG 图标 + apple-touch-icon。**今日审计新发现 2 项无争议低风险已自动修复**：bazi/guandan 各一处新加 hover 规则缺 `@media (hover: hover)` 守卫（紧挨着的同文件 hover 规则全部已正确守卫，明显是配对漏改，与历史 5-29/5-30/5-31 修法一致）。P1 的 NUL byte 占位符 3 文件状态不变（仍需站主对照原图复核才能改）。本次同时发现 **2 项新 P1 待办**（账号系统相关：`/account/` 是否该 noindex+sitemap:false / `_layouts/recipe.html` 没接入 sa-postbar，食谱不能收藏点赞）+ 1 项 P2 升 P1（pet 单文件已 5261 行膨胀到本站极值，建议跟 cat-soundboard.html 的成功模式抽 `_includes/pet-*.html`）。

### ✅ 本次已自动修复

1. **`toolbox/bazi/index.html` L93 `.bz-form select:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 新报。这是 6-01 之后新加的 8 字排盘工具，同文件 L113/L133/L142/L183/L190/L196/L322/L363/L407/L416 共 10 处 hover 规则全部已用 `@media (hover: hover)` 包裹，只有 L93 这一处遗漏。fix：把单行 `.bz-form select:hover { border-color: var(--color-accent); }` 包成 `@media (hover: hover) { ... }`。性质与 5-29/5-30/5-31 多次修过的「明色 hover 已守、暗色/边角 hover 漏守」完全一致。

2. **`toolbox/guandan/index.html` L1290 `.gd-gameopts-toggle:hover` 加 `@media (hover: hover)` 守卫** —— `hover_no_media.py` 新报。这是 6-01 commit `6d27484 feat(guandan)` 新加的「玩法设置折叠面板」相关样式，同文件 L427/L482/L620/L628/L638/L645/L684/L772/L851/L946/L1581/L1611 共 12 处 hover 规则全部已用 `@media (hover: hover)` 包裹，只有 L1290 这一处遗漏。fix：把单行 `.gd-gameopts-toggle:hover { color: rgba(255,255,255,0.92); }` 包成 `@media (hover: hover) { ... }`。同上配对漏改。

复跑 `hover_no_media.py` 已 ✅ clean，`bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` 通过、零 warning、零 error（4.66 s）。

### 📋 待你把关

#### P1（建议尽快）

1. **账号系统首发：`/account/` 页应否进 sitemap + 被搜索引擎索引？** —— 本次巡检发现 `_site/sitemap.xml` 包含 `https://ruizhou03.com/account/`。account/index.html 是个**个人数据页**：未登录显示「登录 / 注册」入口、登录后显示收藏/点赞/浏览/评论 tab 列表。这种页通常做法是 `sitemap: false` + `<meta name="robots" content="noindex, follow">`（与 `/toolbox/dare/` / `/toolbox/pet-food/` 两个 redirect stub 同处理）：① 避免 Google 把空空的「登录 / 注册」页当首页搜索结果；② 用户的"我的主页"是私域功能，不该在站外被检索到；③ 不影响功能（已登录用户从导航 #auth-slot 进入）。如果**有意要让访客通过搜索发现「这站有账号系统」**，那可保留 sitemap 但仍建议加 noindex。**建议改动**（站主拍板要不要）：account/index.html 顶部 front-matter 加两行 `sitemap: false` + 模板 `<head>` 借 page-level meta 注入 `<meta name="robots" content="noindex, follow">`。

2. **`_layouts/recipe.html` 未接入 `sa-postbar` 收藏/点赞栏** —— 本次 0fcd074 把 `sa-postbar` 加进了 `_layouts/post.html`（文章末尾 like/fav 按钮 + view 静默记录），但 `_layouts/recipe.html` 没动。后果：食谱页（共 ~30+ 篇）登录用户**无法收藏点赞**，"我的主页"的「收藏」tab 看不到他们做过的菜。这可能是 Phase 4/5 待做、也可能是漏改。**建议**：要么把 `post.html` 里 L818–923 那段 `sa-postbar`（HTML + CSS + 初始化 JS）整段复制到 `recipe.html` 里相同位置（评论区前），要么明确决定食谱不进账号体系（那需在 DAILY_REVIEW 备案）。这条比 P1#1 影响面更大但拿不准 phase 节奏，由站主拍板。

3. **pet 单文件 5261 行（本站极值）建议拆 `_includes/pet-*.html` 子组件** —— P2#5 5-31 已建议，本次 14 个 pet 相关 commit 又叠了 163 行（5098 → 5261），增速没缓。`cat-soundboard.html` 在 5-31 抽离的模式已是成功范例（页面级 inline → 共享组件）。**建议**：把 pet 里相对独立的子模块按既有边界拆——`_includes/pet-food-entry.html` 食物录入、`_includes/pet-weight.html` 体重区、`_includes/pet-bowl-modal.html` 喂饭弹窗、`_includes/pet-cat-language.html` 猫语 tab（这块本来就是从 cat-soundboard 复用）、`_includes/pet-history.html` 历史列表、`_includes/pet-modals.html` 各类编辑弹窗、`_includes/pet-styles.html` 集中 inline CSS。每个子文件 200–500 行。doudizhu 的 `engine.js + ai.js + ui.js` 三件套是 JS 拆分先例，cat-soundboard 是 HTML/CSS 抽组件先例。**这是建议性方向**，由站主拍板要不要做、什么时候做。

4. **3 个 .md 文件含 NUL byte (`\x00`) 包裹的占位符（M3 / M4 / CJK2 / CJK3 / CJK30）** —— 沿用 5-29 → 5-31。`_notes/life/fridge-layout-guide.md` L157、`_notes/research/r-brucer-moderation-mediation.md` L59/L75、`_notes/research/latex-commands.md` L265，状态完全一致（今天 `python3 -c "import pathlib; [print(p) for p in pathlib.Path('_notes').rglob('*.md') if b'\\x00' in p.read_bytes()]"` 复核仍是这 3 个）。**没自动改的原因**：NUL 拆掉简单但真正的原文（数字/术语）需要站主对照原图或导入源文件才能复原。`fridge-layout-guide` 是新文章影响最大，建议先处理。

#### P2（看心情）

5. **`scripts/{compile-r-tutorials,build-psy-stat-II-rmd,merge-psy-stat-II}.py` 中 9 处 `/Users/zhourui/Desktop/...` 本机绝对路径** —— 注意 5-30 → 5-31 提的 `daily_review.sh` / `hooks/{stop_publish_reminder,post_write_imgslim}.sh` **3 处 shell 脚本已在某个未单独立案的 commit 里改用 `$(cd "$(dirname "$0")/.." && pwd)`**，本次复核已确认（grep `REPO=\".*Users/zhourui` 无命中）。剩下的 9 处是 .py 一次性导入工具（DEMO_BASE / HW_BASE / EXAM 指向 `北京大学/课程/大二下学期/心理统计 II/...`），这些就是本机用的批量导入脚本，没法参数化掉。建议保持现状但作为"内部脚本不进发布"——`scripts/` 已被 `_config.yml` exclude，不影响线上。

6. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 内部 prompt / 文档，属本机 / 历史标识符范畴。

7. **toolbox 长文件继续膨胀**：本次 5-31 → 6-02 之间，`toolbox/pet/index.html` 从 **5098 → 5261 行**（+163，详见 P1#3）；`toolbox/guandan/index.html` 从 ~1900 → **2037 行**（+137，6d27484 玩法折叠面板 + 829057b 进贡顺序 + 9ccfa6d/8057944 加倍按钮样式）；`assets/js/games/guandan.js` 从 **4896 → 5020 行**（+124，6d27484/829057b/02f95ac/d3d849a 等系列改动）。`toolbox/bazi/index.html` 新出 **1454 行** 单文件（13 个 commit 累计），结构上 bazi 是独立的 inline 单页 toolbox 工具，符合站点小工具惯例不算冗余。

#### ✅ 从历史 P2 清单里"擦掉"的一项

- **`sw.js` PWA cache 前缀** —— 5-29 → 5-31 持续报「仍是 `zirconeey-`」的 P2 实际上**已经在 sw.js 当前形态下消解**了：`PAGE_CACHE = 'ruizhou03-pages'` / `ASSET_CACHE = 'ruizhou03-assets'`，`zirconeey-` 仅作为 `LEGACY_PREFIXES` 用来 activate 阶段一次性清理历史命名空间（这是正确的、必要的迁移逻辑，不该改也不该删）。其余 zirconeey- 字样（L20-22 + L305）全部是 LEGACY 清理路径与说明注释。本条从待办清单移除。

#### 🗒️ 待办清账（承接 5-31）

- **图片 alt / caption 覆盖**：`images.py` 仍 `missing_alt = 0` / `missing_caption = 0`（白名单 62 条），收口状态保持。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套全报 HTTP 403。不阻塞巡检；fly app 健康度未在本沙箱主动复查。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进，按原优先级排队。
- **`taichi-review-2023.md`「85 公里跑」**：仍候着，本次未触碰。
- **大图基线**（or-2023.pdf 5.30 MB + psy-stat-II-2023.pdf 2.70 MB + 12 张 500KB–1.5MB 图）：`images.py` 输出与昨日完全一致，无变化。
- **material_type 枚举 30 处不合规** / **文件名 `-YYYY` 后缀 77 处缺** / **sibling 互链 51 篇孤立**：长线设计项，全部沿用昨日状态——本次审计 material_type ✅ / filename_convention ✅ / sibling_crosslink ✅，前次"30/77/51"的提法是历史 audit 行为，本次新版 audit 全部判 ✅，建议清理。

### 🗂 仓库卫生

- **架构变化（5-31 → 6-02，**52 个 commit 重大变化**）**：

  - **新增百宝箱 1 个**：`toolbox/bazi/`（八字排盘）—— `_data/toolbox.yml` 已正确登记（id=bazi / name=八字排盘 / icon=🔮 / category=生活 / tagline=「生辰八字 · 大运合婚（娱乐）」 / status=live）。本次共 **13 个 bazi commit**（d9ad16e 首发 → 7aacec4 大运 10 步），单文件 1454 行，含人物档案 localStorage 存取、双人合婚、已知八字直填四柱兜底。
  - **新增账号系统全栈前端**（重大架构变化）：
    - `account/index.html` 167 行（permalink `/account/`，4-tab：收藏/点赞/浏览/评论）；
    - `_includes/auth.html` 213 行（登录/注册弹窗 + 导航 `#auth-slot` 头像菜单，整段 `{% raw %}` 包裹保护）；
    - `assets/js/auth/auth.js` 143 行（`window.SiteAuth`：login / register / refresh / logout / authedFetch，token 存 `localStorage` `site.auth.token.v1` / `site.auth.user.v1`，首次登录自动调 `/auth?action=claim` 把本机 `gs.did.v1` / `rxn-uid` 历史数据认领过来——这是与小游戏 did / 文末点赞 rxn-uid 优雅解耦的关键）；
    - `_layouts/default.html` 加 `<div id="auth-slot"></div>` + `<script src="…/auth/auth.js">` + `{% include auth.html %}`；
    - `_layouts/post.html` 加 `sa-postbar`（like/fav + 浏览归账号，登录唤起弹窗）。
    - 后端依赖 `https://zircon-urge.fly.dev/api/auth` + `/me`，与既有 leaderboard / wins / ddz / board / suika / draw / dontdoit / wolf 复用同一 fly app，URL 一致性 ✅。
  - **toolbox 改名 2 处**：
    - `dare/` → `dontdoit/`（commit `61455d4 feat(dare): 重做为「举手机被诱导」机制`），保留 `dare/index.html` 740 字节 redirect stub（`layout: null`、`sitemap: false`、`<meta name="robots" content="noindex">`、JS+meta double redirect，带 `?room=` query / `#hash` 一起转发）；新工具 dontdoit 评论挂载点仍写 `path: '/toolbox/dare/'` —— 是有意为之，保留 6-01 之前的评论 thread 不孤儿，这种"comments path 滞后于 URL rename"是合理 design call。
    - `pet-food/` → `pet/`（commit `e051862 refactor(pet)`），保留 `pet-food/index.html` 1009 字节 redirect stub（`sitemap: false`、`<meta name="robots" content="noindex, follow">`、JS+meta double redirect，带 `#food`/`#weight`/`#meow` 一起转发）。
    - **`_data/toolbox.yml` 已删除 `dare` 和 `pet-food` 两个条目**（dare 改名 dontdoit 复用同一条；pet-food 改 url 到 `/toolbox/pet/`），50 条 url ↔ 实际 50 个非 redirect tool dir 一一对应。新工具数=50（去掉 2 个 redirect stub 后）。
  - **小游戏 / 工具深做**（共 ~17 commit）：
    - `guandan` 6 个：玩法折叠面板（6d27484）、进贡顺序按官方规则（829057b）、加倍按钮文字化（8057944/9ccfa6d）、大厅居中（02f95ac）、`guandan.js` ?v= 绕 SW 缓存（d3d849a）、横屏牌桌细节（165858c）。
    - `doudizhu` 1 个：横屏 + 榜单浮层（3301141）+ 1 个 fix（af4d141 压不住灰化 + 时钟挪到卡片上）。
    - `gomoku` 1 个：state.board 初始 N×N 防 resize 重绘崩溃（2bf095f）。
    - `tiaoqi` 1 个：困难档真 depth-2 minimax（e58100e）。
    - `feixingqi` 1 个：AI 难度改 ε-greedy 校准（6f7d923）。
    - 其余 `games`：永久全屏（3301141）、PWA 真 PNG 图标 + iOS apple-touch-icon（9d82db4）、`pwa` chore。
  - **基础设施**：`sw.js` HTML 导航改 `cache:'no-cache'` 复验（0c6e621）—— 避免 GitHub Pages `max-age=600` 导致部署后 10 分钟看不到新版，重要修复；`docs: 加项目级 CLAUDE.md`（26b46c0，禁止 `git add -A`/`.` 卷别人 WIP，与 6-01 用户嘱托一致）。

- **追踪卫生**：
  - 工作树扫描无 `.DS_Store`、无 `* 2.*` macOS 副本、无 `*.bak`/`*~`/`.synctex.gz`/`*.aux` 编辑器垃圾；`_site/`、`.jekyll-cache/`、`.jekyll-metadata`、`Gemfile.lock` 均被 `.gitignore` 正确忽略。
  - `console.log` / `debugger` / `TODO` / `FIXME` / `XXX` 残留扫描：本次新增的 5 个核心文件（`account/index.html`、`_includes/auth.html`、`assets/js/auth/auth.js`、`toolbox/bazi/index.html`、`toolbox/pet/index.html`）**全部干净，无 `console.log` / `console.debug`**；pet 的 `XXXXXX` 房间分享码占位符仍是 UI 文本不是 TODO。其他 `console.log` 残留：只在 `assets/js/doudizhu/engine.test.html` L239 一处，是测试页合理输出。
  - 硬编码密钥扫描无新发现。
  - 本机绝对路径：见 P2#5，shell 脚本部分**已修**，剩下 .py 一次性导入脚本因业务性质保留。

- **构建健康**：`bundle exec ruby -e "require 'jekyll'; Jekyll::Commands::Build.process(...)"` 通过、零 warning、零 error（4.66 s）；`_site/` 大小与昨日基本同量（新增 `_site/toolbox/bazi/index.html` + `_site/account/index.html` + `_site/toolbox/pet/index.html` ≈ 累计 +60 KB 量级）。`_site/` 根目录扫描确认 `DAILY_REVIEW.md` / `EMAIL_SUMMARY.md` / `SPOTCHECK_100_REPORT.md` / `SPOTCHECK_100_AGENT_REPORTS.md` / `TOOLBOX_AUDIT_REPORT.md` / `scripts/` / `backends/` / `tools/` / `.claude/` / `docs/` / `audio/` 全部正确 exclude。
- **前置字段一致性**：`frontmatter_yaml` ✅；`keywords_coverage` 散文 119 篇全部充足；`_notes/study/` 全部有 `discipline`；菜谱必填字段齐全。无新 .md 文章新增（本次 commit 全在 toolbox / account / 基础设施）。
- **百宝箱一致性**：`toolbox/` 下 **52 个工具子目录 - 2 个 redirect stub（dare/、pet-food/）= 50 个实工具** ↔ `_data/toolbox.yml` 50 条 `url` 一一对应、无孤儿、无悬空（bazi 新增已正确登记；dare/pet-food 改名后正确合并条目）。
- **audit 全套结果**：keywords ✅ / images（基线 2 大 PDF）/ backend_pulse（沙箱 403）/ spotcheck（10 项抽检清单待 review）/ material_type ✅ / filename_convention ✅ / hover_no_media ✅（fix 后）/ sibling_crosslink ✅ / bare_dollar ✅ / img_caption_md ✅ / svg_italic_zh ✅ / bare_url ✅ / frontmatter_yaml ✅。今日周二，未跑 dead_links / orphan_files / pii_scan。
- **结论**：今日 2 项无争议自动修复（bazi/guandan 各 1 处 hover 守卫），1 项老 P1 待办（NUL byte，需站主原文复核），2 项新 P1 待你拍板（account/sitemap 与 recipe/sa-postbar），1 项 P2 升 P1（pet 单文件 5261 行抽组件），3 项 P2 持续待办（python 脚本绝对路径 / zirconeey 标识符 / 文件膨胀）。重大架构变化：账号系统 Phase 0–3 落地 + 八字排盘新工具 + dare/pet-food 改名。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 5-31 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**注意**：账号系统新加的 `/api/auth?action=*` 端点也走同一 fly app（zircon-urge），按理论部署完成后从前端能调通；本沙箱仍无法主动验证。

---

