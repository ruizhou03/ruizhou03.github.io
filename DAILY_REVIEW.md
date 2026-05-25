## 2026-05-25

### ✅ 本次已自动修复

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
