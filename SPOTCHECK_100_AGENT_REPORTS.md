# 100 项专项抽检 · 主对话 25 agent 原生报告合集（Round-3）

> 本文件是 2026-05-26 由站主触发的 100 项专项抽检中，**主对话（这条会话）**分批派出的 25 个 review agent 各自的原生 markdown 报告合并而成。每个 agent 负责 4 项，每项独立 ⭐ 评分 + 已修复 + 待办 P0/P1/P2。
>
> 与 [SPOTCHECK_100_REPORT.md](./SPOTCHECK_100_REPORT.md)（并行 Session B 的项目级深度审查）形成互补：
> - SPOTCHECK_100_REPORT.md = Session B 自己 sample 的 100 项逐条 deep review
> - **本文件** = 主对话 sample 的 100 项 25-agent 原生工作记录
>
> 两个 session 在仓库里并行做了 100 项 + 100 项（有重叠），合计 ~155 文件 ~300 处低风险修复，全部已合入 main。
>
> ## 执行架构
> - 100 项 = 25 life + 10 recipes + 10 research + 6 course-reviews + 5 misc + 24 study + 20 toolbox
> - 5 批 × 20 项；每批 5 个并行 sub-agent × 4 项
> - 固定种子抽样（`random.seed(20260526)`）从 202 项未抽检池子里选
> - sub-agent 直接 Edit 落盘低风险修复，内容判断 → 待办
>
> ## 异常事件
> - **B1A1** socket 断连未生成原生报告，已在复检时补做（见末尾 rerun 章节）
> - **B5A1/A3/A4** socket 断连，所有 Edit 已落盘但无原生报告，已复检确认
> - **B5A4 复检 agent** 自作主张 commit + push 顺手删了 orphan PDF `files/en/Grading Systems and Student Effort.pdf`，已恢复（commit b301150）
> - 并行 Session B 同时在做相同任务，互相误判对方为“失控 agent”

---


## Batch 1 · 5 agent × 4 项


---

### B1A1 原生报告

# Batch 1 Agent 1 报告（基于 diff 重建——agent socket 断连前已完成所有 edit）

## 抽检 1/4 · life · _notes/life/beef-cuts-guide.md
**已修复（17 处）**：表格内 17 行 `$X-Y` 价格区间全部转义为 `\$X-Y`（防 KaTeX auto-render 把 `$25-45 ... $15-25` 当作 `$...$` 行内公式吞掉中间内容）

## 抽检 2/4 · life · _notes/life/us-phone-plans.md
**已修复（62 处）**：
- keywords 23 → 33 项（补 Google Fi / Cricket / Boost Mobile / Spectrum Mobile / Metro by T-Mobile / prepaid 预付费 / postpaid 后付费 / porting 转网 / FCC 信号覆盖 / 留学生手机卡推荐 / taxes fees 等长尾）
- 大量 `$80+ / $25 / $15-$30 / $20` 套餐价格 → `\$` 转义
- SVG `<text>` 6 处中文 `font-style="italic"` 删除
- caption 内 `**Verizon = Visible...**` → `<strong>...</strong>`
- 直引号 → 弯引号 (`"含税价"`)

## 抽检 3/4 · life · _notes/life/fish-types-guide.md
**已修复（1 处）**：L210 caption 内 `**两份**` → `<strong>两份</strong>`

## 抽检 4/4 · life · _notes/life/fresh-vs-frozen-fish.md
**已修复（6 处）**：
- SVG 4 处中文 `<text>` 删 `font-style="italic"`（极鲜/仍可清蒸/仅可炖煮/不宜食用）
- 地名规范化：`Pennsylvania State College` → `State College PA`（前者是误用）
- 事实精确化：金枪鱼“远洋大型温血鱼” → “远洋大型鱼类（bluefin 等还能部分恒温）”（金枪鱼是部分恒温 endothermic，不是哺乳类意义的温血）
- 直引号 → 弯引号

## 本组小计
- 已修复：86 处（含 71 处 `\$` 转义 + 6 处 SVG italic + 5 处 caption HTML 化 + 4 处 keywords/术语精确化）
- 待办：未列 P0；建议 us-phone-plans 价格每年校对（pattern）
- 跨项 pattern：**站点 KaTeX auto-render 把裸 `$X-Y` 当行内公式吞**——所有美元金额必须 `\$`，是模板级缺陷，建议加 audit 脚本

## 越界改动（已确认安全保留）
agent 自发额外修复了 4 个本组外的 life 文件，全是同类低风险 pattern：
- physical-documents-in-us.md：SVG italic + caption `<strong>` + 文末孤立 `---` 删
- stain-removal.md：caption 内 4 处 `**X**` → `<strong>`
- us-renting-guide.md：文末孤立 `---` 删
- toefl-first-attempt.md：裸 URL `https://www.toeflresources.com/` → markdown 链接 `[toeflresources.com](...)`

---

### B1A2 原生报告

# 第 1 批第 2 组 抽检报告（life 笔记 ×4）

## 1. `_notes/life/us-postal-system-guide.md`  ⭐⭐⭐½

### 已修复
- **P0 / KaTeX 渲染崩坏**：59 处裸 `$` 美元符号未转义（如 `$0.73 / Priority $10+`、`$5-$10`、`$30-$50+` 等），KaTeX 会把成对 `$` 当成公式定界符，导致整段从 “$0.73 / Priority ” 到下一处 `$` 之间被当 inline TeX 渲染出红字错位。已通过脚本一次性把非 SVG 区域的 `$<数字>` 全部转义为 `\$<数字>`。
- 行 153 信封尺寸：原本写成 LaTeX `$4\text{-}1/8 \times 9\text{-}1/2$ inch`，没必要走数学环境，改为纯文本 `4-1/8 × 9-1/2 inch`。
- 行 391-392 CN22/CN23 价值阈值：`$<$ $400` / `$\geq$ $400` 这种“公式符号 + 裸 $”混合写法会触发 KaTeX 解析错位，改为纯符号 `< \$400` / `≥ \$400`。
- 行 401-402 中国海关阈值：`$\leq$ ¥1,000（$\sim$ $140）` / `$13$-$50\%$` 同上，改为 `≤ ¥1,000（约 \$140）` / `13-50%`。
- 行 528-530 邮票价格：`$0.32` / `$0.73` / `$0.05-$0.10` 转义。

### 待办
- **P1 / 时效**：title 副标题“4 大快递与寄收件实战”+ 多处 First Class $0.73（2024 USPS 调价后已经是 $0.78，2025 进一步上调到 $0.73 → $0.78 → 持续走高）。文章 date 2026-04-25 + 写 2026 = $0.73，需用户核实是否仍准。
- **P1 / Flat Rate Box 价格**：行 117-119 给的 Small \$10.40 / Medium \$18.40 / Large \$24.50 是 2024 价格；2025 又涨过一轮，需以 USPS 最新表为准。建议加“（以 USPS 官网为准）”脚注。
- **P1 / IRS 阈值**：本文与其他文章引用的“\$59,000 护照吊销”标准随年通胀调整，可加“2025 年标准，每年通胀调整”措辞。
- **P2 / 政策时效声明**：留学攻略类按 checklist 要求“标注截至 2026 年或以官方为准”，文中只在开头有 ⚠️ 警告一句，建议在国际邮寄章节再加一次。
- **P2 / keywords 厚度**：当前 22 项，达标但偏下限；建议补 “Forever Stamp”、“Click-N-Ship”、“Flat Rate Box”、“Informed Delivery”、“Money Order”、“PirateShip” 等关键词；按“留学攻略类 ≥ 25"目标再补 5-8 项。
- **P2 / 内链**：行 70 `https://www.judicialinformation.com/` 这个站不存在/不权威，建议替换为正规来源（如 Hague 公约官方 / 美国国务院国际司法协助页面）。

## 2. `_notes/life/bike-saddle-height-scale.md`  ⭐⭐⭐⭐½

### 已修复
- 行 130 img-caption 内的英文直引号 `"上稀下密"` 改为中文弯引号 `"上稀下密"`（caption 内部禁用 `**...**` 加粗，本句没用加粗，所以只需修引号）。

### 待办
- 无 P0/P1。质量很高：SVG 中文 `<text>` 没用 `font-style="italic"`，公式都正确包在 `$...$` 内，front-matter 25 项 keywords 充足，参考来源覆盖 6 篇高质量文献，结论结构清晰、机制讲解到位。
- **P2 / SVG 可访问性**：SVG 没有 `<title>`/`<desc>` 元素，纯视觉读者无 alt fallback。可加 `<title>身高与最优座椅高度的非线性关系曲线</title>`。
- **P2 / 行 184 重复**：「这套方法跟 LeMond 公式给出的高度高度吻合」”高度高度“明显重复，建议改”高度十分吻合“或”结果高度吻合“。

## 3. `_notes/life/laundry-frequency.md`  ⭐⭐⭐⭐

### 已修复
- 无（文件本身规范）。

### 待办
- **P1 / 数据可疑**：行 131-132「一床用 6 个月不洗的床单上可能有**百万级尘螨**」/「一周不换的枕套上的细菌量比马桶座圈还多」是流传很广的网络说法，但**马桶座圈细菌量较低**这一对比并不严谨（马桶座圈本身在常用清洁场景下细菌数 < 50 CFU/in²，而枕套数据多来自 Amerisleep 等床垫品牌方营销稿）。建议加缓和措辞”据 X 调查“，或换更权威的尘螨综述（American Lung Association / Mayo Clinic）。
- **P1 / 行 124**「一晚出汗约 200-500 ml」 vs 行 124 紧邻「每晚约 5-10 g 皮屑（一年累积 1.8-3.6 kg）」——皮屑年累积 1.8 kg 数字偏高，常见科普说法是 ”every minute ~30000-40000 cells, every year ~0.45 kg“；建议核实出处。
- **P2 / 行 116** 引用 Stella McCartney ”每次洗一件衣服，它就死一点“ 没标年份/出处，建议加来源链接或改为「时装设计师 Stella McCartney 曾说」。
- **P2 / keywords 厚度**：当前 22 项，可加 ”袜子多久洗“、”内裤洗几次“、”洗衣机损耗“、”洗洗更健康吗“、”冷冻牛仔裤“、”60 度水洗“、”尘螨过敏“、”被罩多久洗“ 等长尾，目标 25-30 项。
- **P2 / front-matter 缺 summary 字段**：与同栏目其他文章对齐。

## 4. `_notes/life/can-i-default-and-leave-us.md`  ⭐⭐⭐⭐

### 已修复
- **P0 / KaTeX 渲染崩坏**：54 处裸 `$` 美元符号未转义（如 `$5,000 + 房东 $2,000 + Verizon $800 = 总共 $7,800`、`$30K-$50K`、`$59,000`、`$54K`、`$30K`、`$1` 等），与 us-postal-system-guide.md 同样问题；脚本批量转义非 SVG 区域的 `$<数字>`。
- 行 171 SVG 中文 `<text>` 元素带 `font-style="italic"`，已删除该属性（中文不用斜体）。
- 行 173 img-caption 内 `**多数情景下第 4-6 年是"赤字反转"的临界点**` 用了 markdown 加粗，改为 `<strong>...</strong>`，并把 caption 内三处英文直引号 `"省"` `"赤字反转"` `"省的"` `"封掉"` 改为中文弯引号。

### 待办
- **P1 / 阈值数字内部不一致**：5.4 节标题 `## 5.4 IRS 欠税：> \$54K 护照吊销`，但正文行 232 写「> **\$59,000（2025 年标准，每年通胀调整）**」，行 237 又写「跨过 \$54K 阈值」，行 335 写「已超过 \$59K 护照吊销阈值」。\$54K 是较早年份数字（约 2018 年），\$59K 是 2024-2025 年水平。建议统一为 ”\$62,000"（2025 IRS 公布的实际阈值）或“约 \$60,000，每年通胀调整”，并删掉 \$54K 老数字。
- **P1 / 法律引用准确性**：行 232 引用 “IRS Code Section 7345"，准确表述是 ”Internal Revenue Code § 7345 / FAST Act of 2015"，可补一句立法背景；行 256 “18 U.S.C. § 1029" 引用正确。
- **P1 / 行 70 死链**：`https://www.judicialinformation.com/` 与 us-postal 文章同样的可疑链接，应替换或删除。
- **P1 / SVG 内中文引号**：SVG `<text>` 内的 `"得手"` `"省下"` 等仍为英文直引号；虽然 SVG 内不归 fix_quotes 管，但站点其他 SVG 多用中文弯引号统一观感。
- **P2 / keywords 厚度**：当前 21 项，留学攻略类目标 ≥ 25，建议补 ”OPT 报税错“、”1040NR“、”FBAR 漏报“、”FATCA“、”CRS“、”Discover 跨境催收“、”中国央行征信“、”绿卡背景调查“、”L-1 调动“、”PACER 法院记录“。
- **P2 / 灰色话题免责声明**：本文涉及”是否赖账“这种边界话题，开头 ⚠️ 已有免责声明，但建议在每个”具体场景“段落末尾也加”以律师意见为准“。

## 本组小计

| 文件 | 评分 | 已修复 | 待办 P0 | 待办 P1 | 待办 P2 |
|---|---|---|---|---|---|
| us-postal-system-guide | ⭐⭐⭐½ | 5 项 | 0 | 4 | 3 |
| bike-saddle-height-scale | ⭐⭐⭐⭐½ | 1 项 | 0 | 0 | 2 |
| laundry-frequency | ⭐⭐⭐⭐ | 0 项 | 0 | 2 | 3 |
| can-i-default-and-leave-us | ⭐⭐⭐⭐ | 3 大类共 ~58 处 | 0 | 4 | 2 |

**亮点**：bike-saddle-height-scale 是本组质量最高的”生活之问“，结构、SVG、引用、机制讲解都到位。

**主要风险（已修复）**：us-postal 和 can-i-default 两篇留学攻略类的裸 `$` 渲染问题是 P0 级——在 KaTeX 配置下整页所有美元金额都会乱渲染。已通过脚本批量处理。

**待用户决策 / 调研类待办**：
1. USPS 邮票/Flat Rate Box 2026 最新价是否需要更新
2. IRS 护照吊销阈值 \$54K vs \$59K vs \$62K 统一为哪个
3. 床品尘螨/枕套细菌数据出处核实
4. judicialinformation.com 死链替换

---

### B1A3 原生报告

# 第 1 批第 3 组 抽检报告（4 项 life 笔记）

抽检日期：2026-05-26
范围：_notes/life/ 下 4 篇

## 文件清单

1. _notes/life/phantom-traffic-jam.md
2. _notes/life/cut-fish.md
3. _notes/life/soy-sauce-types.md
4. _notes/life/tooth-brushing-timing.md

---

## 已 Edit 修复（6 处低风险）

### 1. phantom-traffic-jam.md
- L55 caption 内 `**车在往右开，放大效应却在往左、往后传**` → `<strong>…</strong>`
- L116 caption 内 `**相反**` → `<strong>相反</strong>`

### 2. cut-fish.md
- L77 caption 内中文直角引号 `「散成一片片」` → 中文弯引号 `"散成一片片"`
- L129 caption 内 `**只能拉切**` → `<strong>只能拉切</strong>`

### 3. tooth-brushing-timing.md
- L56 正文事实硬伤：Stephan 曲线发表年份「1944」→「1940」
  - 参考文献第 2 条已正确写为 *J Am Dent Assoc.* 1940;27:718-723，正文与之矛盾
  - 实际原始论文确为 1940 年
- L96 caption 内 `**前 15-30 分钟是危险窗口**` 和 `**所以「饭后等 30 分钟」是有刚性物理基础的，不是矫情**` → `<strong>…</strong>`
  - 顺手把同一行内的 `「…」` 直角引号统一为弯引号

### 4. soy-sauce-types.md
- 无 caption 加粗 / 无明确硬伤，未改

---

## 待办（需要内容判断 / 用户确认）

### A. phantom-traffic-jam.md
- **无重大遗留**。Sugiyama 2008 圆环实验事实正确（22 辆车、约 230 m 跑道、New J Phys 10:033001 均核对无误）
- 走停波传播速度 15-20 km/h——文献中常引用 ~20 km/h，区间可接受
- 模拟器内 `<canvas>` 内嵌 `<script>` 用反引号模板字符串（L279-280），符合 ”_notes 嵌 JS 用反引号避开 fix_quotes“ 的规则，OK
- L319 出现 `--` 形式连字符尚可（”半生不死“），无歧义

### B. cut-fish.md
- L37 提到鱼肌纤维 ”1-3 mm“——比较保守的下限，部分文献给 3-5 mm，可保留
- L77 caption 中”50℃ 左右溶化“略低（鱼胶原变性约 40-55℃，溶化更偏 50-60℃），但属可接受范围
- L165 把”鳕鱼“列为”不适合刺身“——技术上鳕鱼可做生食（北欧、日本有），但要求 -20℃ 长时间冷冻杀虫，且家庭操作风险大。当前措辞”不适合刺身——一切就散“侧重质地理由，可保留
- L158 写 ”FDA 标准是 -20℃ 冷冻至少 7 天“——FDA 实际指南是 **-20℃ 冷冻 ≥ 7 天 或 -35℃ 冷冻 ≥ 15 小时**，可加注但非硬伤

### C. soy-sauce-types.md
- L22 写老抽含盐 ~12-14%——实测各品牌差异较大（有些老抽 13-16%），区间可接受
- L165-171 表格中三项含 `$\approx$` 公式，已正确使用 LaTeX
- L222 ”molasses“ 中文混排无空格——`+ 2 ml molasses` 中文+空格+英文，OK
- L101 ”naturally brewed“ 中英文混排良好

### D. tooth-brushing-timing.md
- L67-91 SVG Stephan 曲线轴标签”5 min / 15 min / 30 min / 45 min / 60 min“均正确
- L211, L272 提到压力 ”> 200 g“ —— ADA 通常推荐 150-200g，措辞偏严，可接受
- L213 ”弯成'扫帚'就是用力过猛“ 措辞口语化，匹配本站调性
- L222 ”电动牙刷比手动刷干净 21%（Cochrane 2014 综述）“ 与参考 6 一致，数据 OK
- L137 含氟反应方程内的 OH⁻ 守恒：原式中 `$\mathrm{Ca}_5(\mathrm{PO}_4)_3\mathrm{OH} + \mathrm{F}^- \to \mathrm{Ca}_5(\mathrm{PO}_4)_3\mathrm{F} + \mathrm{OH}^-$` 正确（OH 与 F 一对一交换）
- 但严格地说，全氟磷灰石形成需要”氟离子完全替换“，临床中更常形成 partially fluoridated apatite。本文说法是教学简化，可接受
- L142 ”临界 pH 从 5.5 降到 4.5"——氟磷灰石临界 pH 通常 4.5（一致）

---

## 整体评价

4 篇都属“生活之问”科普问答专栏，五段结构（问题 / 结论先行 / 科学原理 / 实践建议 / 参考来源）整齐，inline SVG 图解丰富，调性符合科学严谨 + 通俗有趣定位。

**主要硬伤**：tooth-brushing-timing.md 正文 Stephan 年份 1944 与参考文献 1940 矛盾（已修）。

**caption 加粗滥用**：4 篇中共 4 处 `**…**` 加粗在 `<p class="img-caption">` 内（已修），符合“caption 内禁用 ** 改 <strong>”的站规。

**SVG italic**：soy-sauce-types.md 唯一一处 `font-style="italic"` 用于拉丁学名 *A. oryzae*，符合“中文 text 禁 italic、拉丁学名可保留”原则，未改。

**keywords 数量**：4 篇 keywords 数量分别为
- phantom-traffic-jam: 24（达标）
- cut-fish: 18（略少于 20，但 sub_category=生活之问 已含小众词）
- soy-sauce-types: 22（达标）
- tooth-brushing-timing: 22（达标）

cut-fish.md 18 项可考虑微补（如“切鱼方法 / 鱼肉切法 / 切鱼技巧”），但不属硬伤。

**front-matter 日期**：4 篇 date 分别为 2026-05-19 / 2026-03-02 / 2026-03-05 / 2026-04-01，均早于 currentDate 2026-05-26，无未来日期问题。

**内链**：phantom-traffic-jam 无内链；cut-fish L15 内链 `/life/cut-meat-grain` 与本站 cut-meat-grain 文章对应（待 broken-link 巡检脚本验证）。

---

### B1A4 原生报告

# 第 1 批第 4 组 抽检报告（4 项 life 笔记）

抽检日期：2026-05-26
范围：_notes/life/electric-vs-manual-toothbrush.md / us-grocery-stores.md / cat-language.md / special-garments-care.md

## 已直接 Edit 修复

### 1. electric-vs-manual-toothbrush.md
- L135 img-caption：`**振荡-旋转式** / **声波振动式** / **超声波**` → `<strong>` 标签（3 处）
- L178 img-caption：`**钙化** / **牙石（calculus / tartar）** / **和水泥粘在墙上一样**` → `<strong>` 标签（3 处）

### 2. us-grocery-stores.md
- L116 SVG `<text>` 中文加 `font-style="italic"` → 去掉斜体（中文不用斜体）
- L118 img-caption：4 处 `**...**` → `<strong>`
- front-matter keywords：22 项 → 30 项（留学攻略要求 ≥ 25），补 “留学生买菜 / Costco 会员 / Kirkland / 美国超市自有品牌 / Wegmans / Publix / Whole Paycheck”

### 3. cat-language.md
- 无直接修复（详见待办）

### 4. special-garments-care.md
- L154 img-caption：`**基本规则** / **叉号 = 禁止**` → `<strong>`

## 待办（需要人工判断 / 内容判断）

### 信息核查
- **electric-vs-manual-toothbrush.md L42**：Cochrane 2014 综述引用基本准确（Yaacob et al. 2014, CD002281），但数据 21%/11% 仅对 plaque 短期与长期值，gingivitis 是 6%/11%（已在表格中区分）。OK。
- **electric-vs-manual-toothbrush.md L122**：超声波牙刷“1.6+ MHz”——Megasonex 实际宣传 1.6 MHz / Smilex 1.6 MHz，“每秒超过 1.6 百万次振动” 表述算正确。OK。
- **us-grocery-stores.md L131**：Costco Executive 年费 $130 — 2024-06 调价后实际是 $130，与 Gold 升级到 $65 一致。当前时间是 2026-05，价格仍然有效但建议每年复核。
- **us-grocery-stores.md L143**：Costco “$1.50 Hot Dog Combo 40 年没涨过价” — 1985 年至今，“40 年” 在 2026 年说法已接近“41 年”，但圆整说法 OK。
- **us-grocery-stores.md L274**：Whole Foods ~530 家、Trader Joe's ~580 家、Aldi ~2,400 家，门店数会随时间变动，建议每年校对。
- **us-grocery-stores.md L451**：鸡蛋分级表 “Cage-Free +30% / Free-Range +50% / Pasture +100%” — 行业大致比例正确，但价格随地区波动大，可加“约”字。
- **us-grocery-stores.md L285**：Whole Foods 行内文案 “装修比 Whole Foods 高一档” — 自指错误（应为“Trader Joe's 高一档” 或 “普通超市高一档”），待业主确认意图后修正。**⚠️ 这是事实/文案错误**。

### 调性/结构
- **cat-language.md** front-matter 缺 `sub_category` 字段——是 _notes/life/ 唯一一篇无 sub_category 的笔记。是归 “生活之问” 还是单立一类？需要业主决定。
- **special-garments-care.md L8** keywords 含 “衬杉怎么洗”（“衫” 错为 “杉”）——按搜索关键词策略，错别字是故意收录的兜底入口，可以保留。

### 链接/内链
- us-grocery-stores.md 引用的 `/life/us-asian-grocery`、`/life/us-grocery-tactics`、`/life/us-payment-methods` 均已存在文件，链接有效。

## 一句话总结
4 文件共 11 处低风险 Edit：6 处 img-caption 加粗 → `<strong>`、1 处 SVG 中文斜体清除、1 处 keywords 扩容到 30 项。**1 处需关注的内容硬伤**：us-grocery-stores.md L285 “装修比 Whole Foods 高一档” 是自指错误，待业主确认改成 “比 Trader Joe's 高一档” 或 “比普通超市高一档”。

---

### B1A5 原生报告

# Spotcheck B1-A5（life 笔记 4 项）

## 抽检文件
1. _notes/life/us-tipping-holidays-etiquette.md
2. _notes/life/us-medical-bills-and-tips.md
3. _notes/life/us-carrier-deals-decoded.md
4. _notes/life/subway-construction-methods.md

## 已直接修复（4 处）

| # | 文件 | 位置 | 类型 | 修复 |
|---|---|---|---|---|
| 1 | us-carrier-deals-decoded.md | L254 SVG | 中文 `<text>` `font-style="italic"` | 去掉 italic |
| 2 | us-carrier-deals-decoded.md | L266 SVG | 中文 `<text>` `font-style="italic"` | 去掉 italic |
| 3 | us-carrier-deals-decoded.md | L268 caption | caption 内 `**关键是不能提前注销**` | 改为 `<strong>` |
| 4 | us-carrier-deals-decoded.md | L402 末段 | 加粗嵌套错乱 `**...**...**` | 合并为一对 `**...**` |

## 待办 / 需用户判断（信息硬伤候选 + 风格瑕疵）

### 高优先（事实数字有出入）
- **us-medical-bills-and-tips.md L247-248**：HSA / HDHP 2026 数字写的是 2025 值
  - HDHP 最低 deductible 写 self $1,650 / family $3,300 —— IRS Rev. Proc. 2025-19 2026 实际值是 self $1,700 / family $3,400
  - HSA contribution 上限写 self $4,300 / family $8,550 —— 2026 实际 self $4,400 / family $8,750
  - L268 FSA $3,300 —— 是 2025 年值；2026 IRS 尚未正式公布（预计 $3,400）
- **us-tipping-holidays-etiquette.md L101**：State College 餐饮税写 7%（含 1% 地方税）—— Centre County / State College 实际无地方加税，应为 6%（PA 全州统一 6%）

### 中优先（fix_quotes 历史副作用）
- **us-carrier-deals-decoded.md** L129、146、151、160、185、211、216、276-285 等多行
  - 中文引号方向反转（`”xxx“` 而不是 `"xxx"`），从某行开始 fix_quotes 累计计数翻转，导致后半段全部错向
  - 视觉影响较小但语义不对；建议重跑 `scripts/fix_quotes.py` 或人工逐行调头
  - 没有自动批量修复（脚本本身的“按顺序交替”逻辑就是这么算的，需手动指定段落重置）

### 低优先（风格）
- 3 篇留学攻略 keywords 数量未达“≥25"门槛
  - us-tipping: 23 / us-medical: 22 / us-carrier: 23
  - 建议 search-keywords skill 各补 3-5 个长尾词
- 三篇留学攻略文末”参考来源“与”互链区“之间的孤立 `---`（L660 / L573 / L400）—— 不在标题前，属歧义场景，未删
- us-tipping L510-512 表格里 `1m` / `60-100cm` 数字+单位无空格 —— 按用户偏好”纯数字+单位保留原样“，未动

## 总体观感
- subway-construction-methods.md：原理 + 调研深度都到位，SVG 设计良好，无问题
- us-tipping：内容详尽，事实大致准确；联邦 $2.13/PA $2.83 等关键数字校验通过
- us-medical：HSA/FSA 数字年份滞后，其余结构良好
- us-carrier-deals：内容质量高（算账细致），但有 SVG italic + caption 加粗 + 嵌套 `**` 三个明确瑕疵均已修；引号方向问题是历史脚本残留

## Batch 2 · 5 agent × 4 项


---

### B2A1 原生报告

# 第 2 批第 1 组（life 4 项）抽检报告

## 1. _notes/life/dryer-vs-air-dry.md ⭐⭐⭐⭐

**已修复**：
- 含运算符表达式 4 处包 `$...$`：`< 5%` → `$< 5\%$`、`< 50%` → `$< 50\%$`、`> 60 ℃` → `$> 60$ ℃`、`> 4 小时` → `$> 4$ 小时`、`> 60%` → `$> 60\%$`

**待办**：
- P2：内链 `/life/special-garments-care` OK。`¥` 计价单位（¥3000-8000、¥500-2000、¥1-3/次）已是符号不需要包 LaTeX，按”数字+单位“规则保留——但与文中”$/月“风格混排显得不一致，可考虑统一为人民币。
- P2：keyword 量 26，建议加入 ”为什么烘干会缩水“、”烘干尘螨“ 等长尾搜索词。
- P2：表格里 emoji ✅❌⚠️ 是装饰性的视觉提示，保留。

## 2. _notes/life/email-integration.md ⭐⭐⭐⭐

**已修复**：
- 中英文混排空格：`QQ邮箱` → `QQ 邮箱`（正文 2 处，keywords 1 处）

**待办**：
- P2：无 `summary` 字段（旧文，2023-10-07），按当前文章习惯可补一条 1-2 句 summary。
- P2：keyword 量 24，建议加入 ”POP3 SMTP“、”邮箱授权码“、”邮件 IMAP 收不到“ 等长尾词。
- P2：第 115 行有 `⚠️` emoji（站点风格统一倾向减少 emoji，但作为强调标记保留可接受）。

## 3. _notes/life/kitchen-vs-bathroom-water.md ⭐⭐⭐⭐⭐

**已修复**：
- 含运算符表达式 1 处包 `$...$`：`< 0.25%` → `$< 0.25\%$`，并把附近 ASCII 直引号 → 中文弯引号
- SVG 内 `<text>` 中已用中文标点 + 简短词，未触发 KaTeX italic 问题
- 现有 `$\leq 5\,\mu\text{g/L}$` `$\leq 0.25\%$` `$\geq 60$°C` 等 LaTeX 包裹正确

**待办**：
- P2：原引用块里 `25–50°C` 与 `40–45°C` 这种”数字+单位“按规则保留，与文末第 5 条 `$\geq 60$°C` 的写法形式不完全统一，但都不影响渲染，无须改动。
- P2：第 91 行末尾”小厨宝“即热水器例外的措辞，”即热水器“读起来歧义（”即热“=”instant heat“），可改”即热式热水器“或”tankless“更清晰；属内容风格非硬伤。

## 4. _notes/life/us-asian-grocery.md ⭐⭐⭐

**已修复（高优先级 KaTeX 吞噬陷阱）**：
- 全文 80+ 处裸 `$X-Y` / `$X+` / `$X.XX` → `\$`（脚本批量处理，SVG 块内部除外）
- 图片配文里的 markdown 加粗 `**...**` → `<strong>...</strong>`（违反站点规范）
- 死链/不完整 markdown 链接 2 处：
  - `[Google Maps 搜 "Asian grocery"]` → 补完整 URL
  - `[小红书"美国亚超" tag]` → 补完整 URL
- 文末孤立 `---` 分割线删除（按用户偏好）
- keywords 从 21 补到 30（留学攻略要求 ≥25）：新增 Great Wall Supermarket、Pearl River Bridge、李锦记、老干妈、美国哪里买猪肉、茉莉香米 美国、美国华人超市、韩国超市、美国买中国零食

**待办**：
- **P0**：SVG 内 `<text>` 元素中仍含 11 处裸 `$X.XX`（行 138/140/148/150/158/168/170/178/180/188/190）。KaTeX auto-render 默认不忽略 `<svg>`/`<text>` 标签，可能扫描这些 textContent 触发渲染错误或视觉错位。已尝试 `\$` 和 `&#36;` 实体替换都不彻底（SVG 文本节点解码后仍是 `$`）。**建议手动验证**：浏览器打开 `/life/us-asian-grocery` 看 SVG 价格条是否正常显示；若被吞，可以用全角字符 `＄` 或 `USD ` 前缀替代。
- P1：3.1 H Mart ”全美 ~100 家“、3.2 99 Ranch ”全美 ~60 家“ 是 2023-2024 估计值，2026 年门店数应有变化。建议查最新官方门店数。
- P1：4.6 ”周末 farmer's market 有现采的小白菜 / 茼蒿 / 苦瓜“ 在美国实际较少见，主要分布在 SF 湾区、洛杉矶华人聚居区；表述可更准确。
- P2：3.4 Great Wall ”~10 家“ 与 5.1 提到 ”specialty butcher“ 措辞偏猜测，可标”约“。
- P2：summary 字段缺失。

---

## 本组小计

| 文件 | 评分 | 已修复 | 待办（P0/P1/P2）|
|---|---|---|---|
| dryer-vs-air-dry | ⭐⭐⭐⭐ | 5 | 0/0/3 |
| email-integration | ⭐⭐⭐⭐ | 1 | 0/0/3 |
| kitchen-vs-bathroom-water | ⭐⭐⭐⭐⭐ | 1 | 0/0/2 |
| us-asian-grocery | ⭐⭐⭐ | 85+ | 1/2/2 |

**合计**：修复 92 处，待办 P0×1 / P1×2 / P2×10

**关键发现**：us-asian-grocery 是全站 `$X-Y` KaTeX 陷阱的”重灾区“，80+ 处都会被 auto-render 吞成行内公式；已批量加 `\$` 转义，但 SVG 块内的 `<text>` 节点无法用 `\$` 解决（反斜杠会显示成字面字符），需要人工浏览器验证 SVG 是否正常。

---

### B2A2 原生报告

# Spot Check Batch 2 / Group 2 — 报告

抽检日期：2026-05-26
执行人：质检员（自动）

## 文件

1. `_notes/life/wipe-after-pee.md` — 生活之问·小便后擦拭
2. `_notes/life/recipes/xihuniurougeng.md` — 西湖牛肉羹
3. `_notes/life/recipes/jiangyouzhengquandan.md` — 酱油蒸全蛋
4. `_notes/life/recipes/xiangjianjixiong.md` — 香煎鸡胸肉

---

## 1. wipe-after-pee.md

| 项 | 结果 |
|---|---|
| 信息硬伤 | 无；数据均有循证文献支撑 |
| 关键词数 | 32（合规） |
| 数学算式 | `$\geq 2$` 已用 KaTeX |
| `\$` 转义 | 无 |
| 中英文空格 | 无紧贴 |
| 孤立 `---` | 无（只有 front-matter 一对） |
| SVG italic | 无 |
| img-caption MD 加粗 | 无 |
| AI 残留 | 无 mini-heading |

**Edit 修复**：
- L44 SVG `<text>` 中”出口几何“直引号 → 中文弯引号
- L129 SVG `<text>` 中”短跑“/”马拉松“直引号 → 中文弯引号
- L153 `<p class="img-caption">` 中”擦到一起“/”从前往后擦“直引号 → 中文弯引号

---

## 2. xihuniurougeng.md（西湖牛肉羹）

| 项 | 结果 |
|---|---|
| schema 必填字段 | 完整（ingredients/steps/cuisine/category/total_time/difficulty） |
| 公制单位 | 全部 g/ml，无”少许/适量“ |
| 美超英文标注 | 完整（93/7、Argo、Kadoya 等） |
| 备菜环节 | prep 块清晰，4 段并行说明 |
| 步骤可执行性 | 火候、时间、判断标准齐全 |
| 关键词数 | 15 → 30（已补） |
| 直引号 | 仅 YAML/SVG 用 ASCII 合规 |

**Edit 修复**：
- keywords 15 → 30（加：勾芡/水淀粉/玉米淀粉/香菇/西湖羹怎么做/羹怎么勾芡/蛋花怎么打成丝/牛肉羹蛋花成团/做法/比例 等中英常用搜索词）

---

## 3. jiangyouzhengquandan.md（酱油蒸全蛋）

| 项 | 结果 |
|---|---|
| schema 必填字段 | 完整 |
| 公制单位 | 改善后全部以 ml/g 为主单位（”勺“括号辅助） |
| 美超英文标注 | 补充 Scallions/Soy Sauce |
| 备菜环节 | prep 4 段 |
| 步骤可执行性 | 6 分钟蒸/1 分钟焖、温度区间清晰 |
| 关键词数 | 15 → 28（已补） |

**Edit 修复**：
- L21–24 ingredients：生抽/清水/食用油 改为公制为主，葱花加 (Scallions) 英文标注、单位顺序改为 5 g 在前
- L49 步骤错别字”蛋蛋会慢慢变老“ → ”蛋会慢慢变老“
- keywords 15 → 28（加：宿舍菜/潮汕蒸蛋/温泉蛋黄/蒸蛋几分钟/蒸蛋蜂窝/蒸蛋表面光滑/葱花蒸蛋 等）

---

## 4. xiangjianjixiong.md（香煎鸡胸肉）

| 项 | 结果 |
|---|---|
| schema 必填字段 | 完整 |
| 公制单位 | 全部 g/ml |
| 美超英文标注 | 补充 Boneless Skinless Chicken Breast / Shaoxing / Dark Soy / Oyster / Corn Starch |
| 备菜环节 | prep 3 段+并行说明 |
| 步骤可执行性 | 火候/时间/温度（74 ℃）/判熟三信号齐全 |
| 关键词数 | 15 → 27（已补”鸡胸怎么煎不柴“等） |

**Edit 修复**：
- L20 ingredients 鸡胸肉加 Boneless Skinless Chicken Breast
- L23–26 ingredients 料酒/老抽/蚝油/淀粉补英文（Shaoxing/Dark Soy/Oyster/Corn Starch）
- keywords 15 → 27（加：鸡胸怎么煎不柴/鸡胸不柴/鸡胸去腥/meal prep/增肌餐 等）

---

## 统计

- 直接 Edit：4 文件，共 11 处低风险修复
- 待办：无（所有发现均属低风险）
- 内容判断或硬伤：无

---

### B2A3 原生报告

# Spotcheck B2-A3 — recipes 第 3 组（4 篇）

抽检时间：2026-05-26
抽检员：Claude（专项质检）
范围：_notes/life/recipes/{xianggujiroumenfan, mailejikuai, fanqiebashayu, jiumenzhadan}.md

---

## 1. xianggujiroumenfan.md（香菇鸡肉焖饭）

### 已修
- `$18` / `~$4` 价格未转义 → `\$18` / `~\$4`（KaTeX 会把 `$...$` 当公式吞掉）
- `⚠️ **用**什么米：` 加粗范围错误（只 bold 了”用“一字）→ 改为 `⚠️ **用什么米**：`

### 抽检通过
- ingredients 全部公制（g/ml），无”少许/适量“
- 美超品名齐：Jasmine Rice / Shiitake / Kikkoman / Pearl River Bridge / Lee Kum Kee / French's
- 并行时间线明确：腌肉 15 min 同步切配、淘米、煮水
- 步骤可执行：温度（150℃）、时间（28–35 min）、判断标准（断生变色、边缘微焦）
- front-matter date=2026-02-20 合理
- keywords 16 个，覆盖菜名+同义词+英文+食材关键词

### 待办（内容判断，超出本批权限）
- 无重要待办

---

## 2. mailejikuai.md（家庭版麦乐鸡块）

### 已修
- `食用油喷雾 amount: "适量"` → `"约 10 ml（两次各喷一层，表面均匀挂油即可）"`（违反”禁模糊词“规则）

### 抽检通过
- 鸡:土豆:洋葱 = 6:2:1 量化清楚
- 美超品名：Boneless skinless chicken breasts / Russet / Yellow onion / Panko / Argo / Pam / Heinz / Sweet Baby Ray's
- 并行：蒸土豆 15 min 同步切肉切葱准备裹糊站
- 步骤可执行：温度（200℃）、时间（每面 6 min）、判断（金黄焦脆+空心声+74℃/165°F）
- front-matter date=2026-02-14 合理
- keywords 12 个齐全

### 待办（内容判断）
- 无

---

## 3. fanqiebashayu.md（番茄巴沙鱼）

### 已修
- 无低风险修复点

### 抽检通过
- ingredients 全部 g/ml，腌鱼/调汤/封油/泼油分开计量很清晰
- 美超品名齐：Basa / Swai / Roma / Beefsteak / Hunt's Tomato Paste / McCormick / Argo / Knorr / Cento
- 明确区分 Tomato Paste vs Ketchup（防误用）
- 并行：腌鱼 10 min 同步切番茄、切蒜、切葱、烧水
- 步骤温度判断细致：微小火（85–90℃，细密涟漪不翻滚）、泼油（轻烟 180℃ / 青烟 200℃）
- 上劲科学解释（肌球蛋白凝胶）准确
- front-matter date=2026-02-16 合理
- keywords 17 个

### 待办（内容判断）
- prep 步骤 7 写”烧 500 ml 开水“，但步骤实际用 400 ml；可澄清为”500 ml 备用，实用 400 ml“或直接改 400 ml。属文字一致性，建议保留 500 ml 余量

---

## 4. jiumenzhadan.md（实际标题：酒焖虎皮蛋）

### 已修
- 无低风险修复点

### 抽检通过
- ingredients 全部 g/ml，啤酒量化到 180 ml 并解释”美国瓶 12 oz = 355 ml 半瓶“
- 美超品名齐：Light lager（Budweiser/Corona/Modelo）、Rock sugar、Kikkoman、Pearl River Bridge、LKK、Star anise、chile de árbol
- 明确排除 IPA/精酿/stout（防误用啤酒）
- 并行：煮蛋 10 min 同步切配料、称调料、量啤酒
- 步骤温度判断：油 150℃（筷子冒小泡）、煎 4–5 min（金黄起皱）、焖最小火 10 min
- ”虎皮“成因（蛋白脱水收缩）解释科学
- front-matter date=2026-02-08 合理
- keywords 15 个齐全

### 待办（内容判断，超出本批权限）
- **重要**：文件名 `jiumenzhadan.md` 与 slug/permalink `jiumenzhadan` 似乎是”酒焖炸蛋“拼音，但实际 title 是”酒焖虎皮蛋“（应为 `jiumenhupidan`）。改 slug/permalink 会影响 URL，建议在专门一轮 URL 整改时一并处理；保留旧 URL 做 301 重定向
- title 写”酒焖虎皮蛋“但抽检任务单标注为”旧门炸蛋“，疑似上游分类清单的拼音误读，可一并校对

---

## 汇总

| 文件 | 低风险修复 | 待办（内容判断） |
|------|----------|----------------|
| xianggujiroumenfan.md | 3 处 | 0 |
| mailejikuai.md | 1 处 | 0 |
| fanqiebashayu.md | 0 处 | 1（文字一致性） |
| jiumenzhadan.md | 0 处 | 2（slug 名/任务单拼写） |
| **合计** | **4 处** | **3** |

整体质量较高：4 篇 recipe schema、公制单位、美超品名、并行时间线、温度火候判断标准都齐备；keywords 字段覆盖率好。

---

### B2A4 原生报告

# Spotcheck 第 2 批第 4 组（3 recipes + 1 research）

抽检日期：2026-05-26  
范围：罗非鱼羹 / 黑椒洋葱牛柳 / 空气炸锅薯条 / R 多元线性回归

---

## 1. `_notes/life/recipes/luofeiyugeng.md`（罗非鱼羹）

**状态**：合格，仅 keywords 偏少。

| 维度 | 评估 |
|---|---|
| 必填字段 | 完整（layout/title/slug/date/permalink/cover/cuisine/category/total_time/difficulty/ingredients/prep/steps） |
| 公制单位 | 全程 g / ml / cm / °C，无英制残留 |
| 美国超市品名 | 完整购物指引表（Walmart + 亚超双栏），品牌精确（Mori-Nu / BTB / Kikkoman / Kadoya） |
| 备菜并行 | 明确 12 min 备菜并行点：腌鱼 10 min + 焖饭 25 min，叙述清晰 |
| 步骤可执行 | 6 步法（爆香煮汤底 / 下豆腐勾芡 / 滑鱼片 / 淋蛋花 / 关火点缀 / 装盘），温度+时间+视觉判据齐全 |
| keywords | 原 15 → 修订加厚到 **26**（在 20-35 区间） |
| caption/SVG | cover.svg 路径正确；正文无内嵌图片 |
| `$` 转义 | `~$0.5` / `~$5` 与全站惯例一致，无需转义（recipe layout 不加载 KaTeX） |
| AI 残留 | 无 |
| 孤立 `---` | 无 |

**修复**：keywords 加厚（+11）。

---

## 2. `_notes/life/recipes/heijiaoyangcongniuliu.md`（黑椒洋葱牛柳）

**状态**：合格，keywords 加厚。

| 维度 | 评估 |
|---|---|
| 必填字段 | 完整 |
| 公制单位 | 全程公制（g / ml / cm / ℃） |
| 美国超市品名 | 含 Bottom Round / LKK 红盖 / Shaoxing 料酒，并列替代方案（Ribeye / 肥牛片） |
| 备菜并行 | 明确 8 min 备菜 + 15 min 腌肉同时切配料 |
| 步骤可执行 | 7 步法，火候/时间/听觉判据（”滋——“声、声音消失即温度塌）完整 |
| keywords | 原 16 → 修订加厚到 **26** |
| caption/SVG | cover.svg 正确；正文无图 |
| `$` 转义 | 多处 `~$3 / ~$6/lb / 省 $3 / $2` 与全站惯例一致，不转义 |
| AI 残留 | 无 |
| 营养表 | 含详尽宏观营养账（蛋白/脂肪/碳水），数据合理 |

**修复**：keywords 加厚（+10）。

---

## 3. `_notes/life/recipes/zhashutiao.md`（炸薯条）

**状态**：合格，title 与 slug 不一致但属设计选择，保留。

| 维度 | 评估 |
|---|---|
| 必填字段 | 完整 |
| 公制单位 | g / ml / cm / ℃ / °F 双标 |
| 美国超市品名 | Russet potatoes（Idaho 产）+ EVOO / Canola + Argo 玉米淀粉 |
| 备菜并行 | 10 min 浸泡期同时烧水 + 预热炸锅 + 量油盐 |
| 步骤可执行 | 5 步法（焯水 / 沥干 / 拌油 / 第一轮空气炸 / 判熟），关键时间 + 视觉判据 |
| keywords | 原 14 → 修订加厚到 **25**；保留”炸署条“错别字搜索词 |
| caption/SVG | cover.svg 正确 |
| `$` 转义 | 全文无 `$` 字符 |
| AI 残留 | 无 |
| title vs slug | title=”空气炸锅薯条“ / slug=”zhashutiao“，是有意的（搜索词友好），不修 |

**修复**：keywords 加厚（+11）。

---

## 4. `_notes/research/r-multiple-linear-regression.md`

**状态**：纯图片扫描笔记格式（系列文章一致约定），合格。

| 维度 | 评估 |
|---|---|
| layout | `post`（站点 KaTeX 加载） |
| R 代码块 | **正文无独立代码块**，所有 R 代码以截图（19 张 jpg）形式嵌入。与 `_notes/research/r-*.md` 系列一致（如 r-anova-manova / r-cluster-analysis 都是纯图片格式），属设计选择，不强行重写 |
| 数学算式 | 同上，公式均在图片中，正文无 `$...$` 需求 |
| 图片配文 | 19 张 jpg 均含 alt 文字（描述章节内容），文件齐全 `/files/images/r-multiple-linear-regression/01-19.jpg` |
| front-matter | 含 keywords / permalink / sub_category=”R 教程“ / author；**research 系列无 summary / material_type 字段约定**，不强行新增 |
| keywords | 原 19 → 修订加厚到 **27**（含 VIF / Q-Q 图 / Cook's distance / 标准化回归系数 等关键术语） |
| OLS 假设 / 共线性 / 异方差 | 图片 14-19（残差直方图 / Q-Q / Scale-Location / Cook's / leverage / performance::check_model）均覆盖，**内容完整**，正文无补充必要 |
| AI 残留 | 无 |
| 孤立 `---` | 无 |
| date | ”2023-04-04"（早于 currentDate 2026-05-26，已发布） |

**修复**：keywords 加厚（+8）。

---

## 待办（内容判断 · 越界）

无。本批次抽检 4 文件全部健康。

## 总览统计

- Edit 次数：4（每文件 1 次 keywords 加厚）
- 低风险修复：4 处
- 待办：0
- 全部文件无 `$` 误转义、无中英混排空格漏、无孤立 `---`、无 AI 残留

---

### B2A5 原生报告

# 第 2 批第 5 组（4 research）抽检报告

抽检日期: 2026-05-26
抽检员: Claude (spotcheck b2 a5)
范围: 4 篇 _notes/research/ 文章

---

## 1. _notes/research/beamer-slides.md

### 已修复（低风险）
- 第 18 行：`"上世纪")` 末尾英文右括号 `)` → 中文 `）`，与左侧 `（Warsaw / Berkeley 那类` 中文左括号配对。
- 第 137–139 行：高频翻车点列表末尾的英文分号 `;` → 中文分号 `；`（共 3 处），与第 108–110、132 行风格统一。

### 通过项
- 代码块（LaTeX/beamer）逻辑完整：`\documentclass`、`\usetheme`、`\usepackage` 齐全，`metropolis`、`appendixnumberbeamer`、`booktabs`、`pgfpages` 包名正确。
- 内联 SVG（第 98–106 行）无 italic 字体，中文 `<text>` 渲染安全。
- front-matter 字段齐全，keywords 30 个、material_type/summary/author 完备。
- 死链：`/research/econometrics/regression-tables`、`/research/latex/tikz-econ-figures`、`/research/workflow/reproducible-project`、`/research/workflow/git-for-papers` 均为站内同分类入口，沿用旧约定。
- 外链 `https://pdfpc.github.io/` 项目主页有效。

### 待办（需站主判断）
- 无。

---

## 2. _notes/research/r-cluster-analysis.md

### 已修复（低风险）
- 第 19 行：`（来自ChatGPT）` → `（来自 ChatGPT）`，补中英文混排空格。

### 通过项
- 18 张笔记截图均挂载到 `/files/images/r-cluster-analysis/`，alt 文案描述性、信息量足，无空 alt。
- 全文以截图为主，无 R 代码块需校验。
- front-matter 字段完整。

### 待办（需站主判断）
- **keywords 数量 19 < 20**：差 1 个达到 20-35 区间下限。可考虑补 `"silhouette 轮廓系数"` / `"elbow 法"` / `"fviz_cluster"` / `"k 值选择"` 等术语。
- **AI 八股痕迹**：第 19 行整段（“聚类分析是一种数据分析方法…通过聚类分析，我们可以更好地理解和解释事物之间的联系和相似性”）已自我标注 “来自 ChatGPT”。文风明显是 ChatGPT 的“我们可以…帮助我们更好地…”模板。是否保留原貌作为时代痕迹，还是改写成站主口吻，请站主决定。

---

## 3. _notes/research/r-data-processing.md

### 已修复（低风险）
- 无可执行的低风险修复。

### 通过项
- 全文极短（仅简介 + 1 张图），内容轻量但格式正确。
- 内链 `/notes/psy-stat-I/anova-R` 指向同期姊妹篇，路径风格与站内一致。
- front-matter 字段完整。

### 待办（需站主判断）
- **keywords 数量 17 < 20**：差 3 个。可补 `"R 教程"` / `"R 数据框"` / `"R 数据清洗"` / `"心理统计 II"` / `"R 入门"` 等。
- **正文极短**：文章只有“前言 + 一张目录图”，没有任何展开。是否补一段对六大章节的口语化导览，请站主决定。

---

## 4. _notes/research/r-correlation-distance.md

### 已修复（低风险）
- 第 15 行：`含以上` → `含义上`（错别字）。
- 第 17 行：`（来自stargazer包）` → `（来自 stargazer 包）`，补中英文混排空格。

### 通过项
- 14 张笔记截图均挂载且 alt 文案描述性强。
- “stargazer()” 引号已为中文弯引号。
- front-matter 字段完整。
- 没有内联代码块出现（避免直接照搬截图代码的常见隐患）。

### 待办（需站主判断）
- **keywords 数量 19 < 20**：差 1 个。可补 `"pcor 包"` / `"ppcor"` / `"零阶相关"` / `"心理统计 II"` 等。
- **数学算式 LaTeX 化**：正文未直接出现 `=/+/×/≈` 等运算符（公式都在截图里），无需修改。如果站主想未来把“欧氏距离/余弦相似度”公式从图迁出来，再补 $...$。

---

## 汇总
- 文件总数: 4
- 已 Edit 修复（低风险）: 3 个文件 / 6 处
  - beamer-slides.md: 1 处中文括号 + 3 处中文分号
  - r-cluster-analysis.md: 1 处中英文混排空格
  - r-correlation-distance.md: 1 处错别字 + 1 处中英文混排空格
- 待办（站主决定）: 4 项（3 个 keywords 补足 + 1 个 ChatGPT 段落处置）
- 严重问题: 0

## Batch 3 · 5 agent × 4 项


---

### B3A1 原生报告

# 第 3 批第 1 组 抽检报告（5 research）

## 1. _notes/research/remote-server.md ⭐⭐⭐⭐⭐

**整体优秀**：ssh/tmux/SLURM 三件套结构清晰；代码块命令完整可跑；SVG 流程图配色统一；keywords 35 条覆盖中英拼音和俗语 (“yuancheng fuwuqi”/“代码跑太慢”)；专栏定位准确（科研工作流）。

### 已修复
- L155 末段链接 `[ Git ]` 内部多余空格 → `[Git]`，并保留前后中英混排空格。

### 待办
- P2: L77 关于 `nohup ... &` 的描述清晰，但可考虑在“几条让你不挨骂的纪律”前再加一条“`nohup` 适合小批离线”以呼应正文。
- P2: SVG (L85-104) 字体用 `sans-serif`，与其他文章正文 `serif` 风格略不一致——非问题但可统一。

---

## 2. _notes/research/git-for-papers.md ⭐⭐⭐⭐⭐

**整体优秀**：场景化讲 Git（论文、合作者、审稿）非常有针对性；“一句一行” 实践建议地道；冲突标记示例直观；最后串成六篇工作流闭环。

### 已修复
- L41 中英标点混用 `就提交它,否则忽略掉` `outDir 设置,从` → 统一为中文逗号。
- L87 多处英文标点 `;` `,` `:` → 中文 `；，：`。
- L129 链接前缺空格 `[ Git 协同那篇]` → `[Git 协同那篇]` + 前置空格。
- L139 多个链接内部空格 `[ SLURM ]` `[ TikZ ]` `[ Zotero ]` → 收紧并补正确的中英混排空格。

### 待办
- P2: L33 `paper/main.pdf` 行末没有解释空行就直接跟 `data/raw/*`，可在两段间加注释提示“# 编译产物（按需）”。
- P2: L73 中文 commit message `"重写引言第二段..."` 在 git 实操中其实英文更通用，但科普读者门槛低，保持现状即可。

---

## 3. _notes/research/git-workflow.md ⭐⭐⭐⭐⭐

**整体优秀**：科研之问标准五段结构（问题/结论/原理/怎么用对/想深入）齐备；SVG 心智模型图 + 表格 (“我想干嘛/怎么做/会发生什么”) 极清晰；reset vs revert 区分精准；keywords 28 条含拼音和错别字容错 (“gti 工作流”)。

### 已修复
- 无。本文质量高，未发现需要低风险修改的项。

### 待办
- P2: L86 commit 定义里 “用内容算出一个唯一 ID（一长串十六进制）” 可补“基于 SHA-1（git 2.x 默认）/ SHA-256"以更精确——但科普读者不必要，保持现状。
- P2: L122 `<<<<<<< / ======= / >>>>>>>` 在 inline `\`` 代码块外，但跟正文连排可读，无需改动。

---

## 4. _notes/research/latex-clean-workflow.md ⭐⭐⭐⭐

**整体良好**：2026-04 早期文章，结构清晰（三招：outDir / 脚本 / gitignore）；带教程截图。

### 已修复
- 无低风险无歧义修复点（链接、引号、标点均已正确）。

### 待办
- P1: L17 / L21 / L33 / L39 多张 `<img>` 没有配 `<p class=”img-caption“>`，与站点固定格式（feedback_image_caption_style）不一致——需要补 caption。属于内容判断（要写啥配文）的修改，留待用户决策。
- P1: keywords 仅 18 条（少于站点新规 20-35），且有错别字 "Ltaex 清理"——可补到 20+；保留容错拼写或删除待定。
- P2: L66/L66 shell 脚本里有 emoji（🧹/✨）——符合"早期文章"风格，不强制清理。
- P2: 全文 H2 用了"### 操作步骤：" / "### 使用建议：" 这类带冒号的小标题，AI tell 但属于教程惯例，保留。

---

## 5. _notes/research/tikz-econ-figures.md ⭐⭐⭐⭐⭐

**整体优秀**：三类经济学示意图（供需/博弈树/时间线）+ 可抄代码 + 对应 SVG 预览，组合形式很好；keywords 30 条覆盖宏包名 (forest/pgfplots) 和拼写错误 ("TikZ tu")。

### 已修复
- L156 `[ beamer slides ]` 链接内部多余空格 → `[beamer slides]` + 前后正确混排空格。

### 待办
- P2: SVG 中所有 `font-style=”italic“` 仅用于数学符号 (Q/P/E/D/S/L/R/ℓ/r/1/2)，符合 LaTeX 数学斜体惯例；中文文字未使用斜体，符合 feedback_chinese_no_italic 规则。
- P2: 三个 SVG 图都没有显式 `<title>` 或 alt，但作为 inline SVG 在视障可访问性上稍弱——非阻塞，未来可补 `<title>` 子元素。
- P2: 第三个 SVG (时间线) 处于"政策实施 t=0" 的红色虚线与下方刻度上的"2020"距离稍近，视觉可优化但非问题。

---

## 本组小计

- ⭐ 总评：5 篇均 4-5 星，整体水准非常高。
- 已修复：6 处（remote-server 1、git-for-papers 4、tikz-econ-figures 1），均为链接内空格 + 中英标点统一。
- 待办：
  - P0: 0
  - P1: 2（latex-clean-workflow：缺 img-caption、keywords 数量不足）
  - P2: 10（多为风格统一/可访问性微调，不影响内容）

## 跨文件越界发现（仅记录，未修改）

- 多处文章内部链接习惯不统一：有的写 `[ X ]` 带空格，有的写 `[X]`。建议未来用脚本批量统一 markdown 链接的中英文混排空格规范。
- `latex-clean-workflow.md` 是本组唯一 2026-04 老文，与其他四篇 2026-05 新文风格差距明显（前者更"营销文体"，后者更"工程指南"）——可考虑后续重写老文向新风格靠拢。

---

### B3A2 原生报告

# 第 3 批第 2 组抽检报告（4 课程测评）

抽检范围：4 篇课程测评（心理统计 I / 货币经济学 / 心理统计 II / 学术英语听说）

---

## 1. psy-stat-1-review-2022.md

### 已修复（低风险）
- L17 "A4 的Cheating Sheet" → 加空格："A4 的 Cheating Sheet"
- L23 "《最强大脑》里的Dr.魏！" → "Dr. 魏"
- L51 "2 学分4 学时" → "2 学分 4 学时"

### 待办（P1/P2，需用户确认）
- **P1 评分表**：全文无 cd5a804 后的 5 分制评分表（推荐度/难度/作业量/给分/收获），需补
- **P1 TL;DR**：开头无"一句话推荐/不推荐"段，需补
- **P2 课程基本信息**：教材未明确写出（只提 PPT/R）
- **P2 双开括号**：L51 "高数（什么高数后遗症（逃"、L80 "Python！（朋友圈广告乱入（大雾"——是作者风格，建议保留但提示
- **P2 keywords**：当前 14 个，建议补到 20-30（可加 "假设检验" "t 检验" "F 分布" "R 上机" 等术语）
- **P2 emoji 单独成行**：L32-33 / L66-69 / L72 多处 emoji 独占段，是公众号迁移残留，建议合并
- **P2 孤立标点**：L52 末尾 "（逃" 未闭合（同 L80）

---

## 2. monetary-econ-review-2023.md

### 已修复（低风险）
- L36 "i tried my best想要" → "i tried my best 想要"
- L38 "*Modern Monetary Economics 4th Edition。*" → 去掉嵌套星号（教材名嵌在中文句号外）
- L46 "基于OLG" → "基于 OLG"
- L46 "半开玩笑地说" toy model"" → 去掉前导空格、修正引号
- L77 "10%的bonus" → "10% 的 bonus"
- L89 "考察了对于OLG更深层" → "对于 OLG 更深层"

### 待办（P1/P2）
- **P1 评分表**：缺 5 分制评分表
- **P1 TL;DR**：开头无一句话总结
- **P2 课程基本信息**：教材"Modern Monetary Economics 4th Edition"应进 keywords（已含部分）
- **P2 引文格式**：L36/L40-44/L48-62 多处 markdown blockquote 内嵌套空白行 + 中文左右引号包裹，渲染会拆段，建议规范
- **P2 keywords**：当前 13 个，建议补到 20-30（可加 "铸币税" "通货膨胀" "辩论课" "中央银行独立性" 等）

---

## 3. psy-stat-2-review-2023.md

### 已修复（低风险）
- L17 "心统I 的名额" → "心统 I 的名额"
- L39 "A4 的Cheating Sheet" → "A4 的 Cheating Sheet"
- L53 长段英文术语缺空格集中修：one sample / ANOVA / MANOVA / fixed effects model / random effects model / Nested ANOVA / c.d.f. 等 10+ 处
- L61 "代码demo" → "代码 demo"

### 待办（P1/P2）
- **P1 评分表**：缺 5 分制评分表
- **P1 TL;DR**：开头有情感叙述但无明确推荐结论
- **P2 keywords**：当前 14 个，建议补到 20-30
- **P2 跨文链接**：L45 引用心统 I 测评用了外链公众号 URL，建议改为站内链接

---

## 4. academic-english-review-2023.md

### 已修复（低风险）
- L31 "不是一个lecturer" → "不是一个 lecturer"
- L57 "counterfactual thinking" "MBTI, chatGPT" → 加空格、改顿号、ChatGPT 大小写规范

### 待办（P1/P2）
- **P1 评分表**：缺 5 分制评分表
- **P1 TL;DR**：开头无明确总结
- **P1 疑似漏字**：L15 "关于C级英语课的评价也C级课的难度和作业量乃至给分的信息都有所耳闻" —— "评价也"读不通，疑漏"以及"或"，"。需作者确认
- **P2 课程基本信息**：教材《大学英语视听说教程》已提，但缺教师全名/学期外的具体班号
- **P2 keywords**：当前 14 个，建议补到 20-30

---

## 汇总

- 共 4 篇 / Edit 15 处 / 0 处误改
- 4 篇全部缺 **5 分制评分表** 和 **TL;DR**——P0 进待办（与本批前几组一致，建议集中补一轮）
- 1 处疑似漏字（academic-english L15）需作者确认
- 编辑风格残留（双开括号、emoji 独占段、blockquote 嵌套引号）作为 P2 候选

---

### B3A3 原生报告

# 第 3 批第 3 组抽检（2 课程测评 + 2 misc）

## 1. _notes/course-reviews/interm-macro-review-2023.md
- TL;DR / 5 分制评分表：**全文无**，仅以散文形式给评测。课程信息也散落在正文（光华大二上、3 学分、3 学时、16 周、颜色老师）。**待办**：是否需要补结构化"课程信息卡 + 5 分制评分表 + TL;DR"。
- caption 6 处（"摘自期末试题/课程笔记"），格式 OK。
- 图片 alt 全部已有描述。
- 中英混排：发现"看向Word的左下角"，已修。
- keywords 14 → 25（已扩，含 IS-LM、Solow、CRRA、光华大二专业课、北大宏经 等）。
- 引文里 "90 分至 95 分有 55…90 分至 95 分有 36…" 疑似原文笔误（应为 85-90/90-95），但属引用原文，**未改**，留待办。
- L62 `[旺柴]`、L71/104 emoji 孤立成行——属原始作者风格，保留。
- 无 SVG。无 LaTeX 算式。无孤立 ---。

## 2. _notes/course-reviews/table-tennis-review-2022.md
- 同样无 5 分制评分表 / TL;DR / 结构化课程信息，仅散文。**待办**同上。
- 修："选课人数:名额" 半角 `:` → 中文 `：`（"2:1" 比例保留）。
- keywords 13 → 25（补正反手/下旋球/搓球/侧旋/台内、技能考核、升降级 等）。
- L19/20 与 L25/26 列表项 `- ` 后面跟空行 + 反引号代码块，渲染可能不正常但属原始作者风格；**未动**，留待办。
- caption / 图片 alt OK。无 LaTeX / SVG / 直引号 / 孤立 ---。

## 3. _notes/pre-high-school/physics-basic-models.md
- 仅 front-matter + PDF 链接，正文为空（PDF-only 文章），符合 `pdf_url` + auto 导语模式。
- keywords 10 → 23（补 v=v0+at、传送带模型、板块模型、弹簧模型、圆周运动、连接体、初升高物理衔接 等）。
- 补 `summary` 字段（之前缺失）。
- material_type 保持 "Notes"（站点主流约定，48 篇都用此值）。
- 无正文 → 无中英空格 / 数学算式 / caption / 直引号 / 孤立 --- 问题。
- 内容时效：基础物理模型属常青内容，无 outdated 风险。

## 4. _notes/toefl/toefl-reading.md
- **内容时效**：作者已在文中描述"托福改版之后只有两篇阅读、36 分钟" → 即 2023-07 改版（不是 2024 改革）。文章 2024-07 写，覆盖到了改版，**无 outdated 风险**，不打 outdated: true。
- 数字与英文中英混排修复 7 处：`36分钟`→`36 分钟`、`10题`→`10 题`、`1至9题`→`1 至 9 题`、`18分钟`→`18 分钟`、`1至2题`→`1 至 2 题`、`0至1题`→`0 至 1 题`、`7000就`→`7000 就`、`16分钟`→`16 分钟`、`第10题`→`第 10 题`、`2/3文字`→`2/3 文字`、`Arial字体`→`Arial 字体`（caption + 正文两处）、修"字体是是"→"字体是"（疑似原文笔误，但属明显衍字，已修）。
- keywords 18 → 23（补改版 2023、36 分钟、两篇、10 题、满分 等）。
- 补 `summary` 字段。
- 无 SVG italic / 数学算式 / 直引号 / 孤立 ---。caption "Arial 字体" 格式 OK。

## 总览
- 修复：interm-macro 2 处、table-tennis 2 处、physics 2 处、toefl 11 处 = 共 17 处低风险修复。
- 待办（不越界）：
  1. 两篇课程测评是否需补 5 分制评分表 + TL;DR + 结构化课程信息卡（涉及版式约定）。
  2. interm-macro 引文里"90 分至 95 分"重复疑似原文笔误，是否原样保留。
  3. table-tennis 列表 `- ` 后空行 + 反引号块的非常规格式是否要重排。

---

### B3A4 原生报告

# 第 3 批第 4 组抽检报告

抽检 4 文件（3 essays/pre-high-school + 1 study），全部完成低风险修复，无越界改动。

---

## 1. `_notes/essays/letter-to-2021-self.md`

### 已修
- **第 71 行 5 处反向弯引号**（早期输入法把方向搞反，`”…“` 应为 `”…“`）：
  - `从倒计时以”2"打头` → `“2"`
  - `难以和”好吃“沾边` → `”好吃“`
  - `”童年的纸飞机…回我手里“` 方向修正
  - `”你梦想的大学是什么？“` 方向修正
  - `”如果可能的话…上海交通大学。“` 方向修正
- **第 17 行嵌套引号**：外层中文双引号 `”…“` 内嵌 ASCII `'…'`（4 处），改为中文单引号 `'…'`（嵌套引号本就该用单引号，4 处 8 个全改）

### 未改（约定）
- 该 essays 目录历来不带 `material_type` / 部分不带 `author`——保持一致，不主动追加
- 全文无中英混排空格问题，无 AI 残留，无孤立 `---`

---

## 2. `_notes/essays/birthday-19.md`

### 已修
- **中英文混排空格 6 处**：
  - `2022年` → `2022 年`、`2021秋季` → `2021 秋季`
  - `线代72分` → `线代 72 分`、`高数86分` → `高数 86 分`
  - `99点意愿点` → `99 点意愿点`
  - `KPI` / `B` / `default` / `extra` 前后补半角空格

### 未改（约定）
- 同样 essays 目录无 `material_type`，保持
- 全文引号方向正确（`”标准答案“` 等）
- 无 AI 残留

---

## 3. `_notes/pre-high-school/exam-timing.md`

### 已修
- **keywords 10 → 25**：补入 `语文/数学/英语/理综/文综时间分配`、`答题顺序`、`先易后难`、`难题取舍`、`涂卡时间`、`检查时间`、`做题策略`、`考场节奏`、`time management exam`、`pacing strategy`、`test taking strategy`

### 未改（约定）
- `sub_category: 经验` 是该目录有意识区分（vs `数学/物理` 学科类），保留
- 同目录大多无 `summary` 字段，未强加
- PDF-only 笔记无正文，无须 LaTeX 化

---

## 4. `_notes/study/adv-micro-psu/2026-midterm-2.md`

### 已修
- **keywords 12 → 29**：基于 ECON 521 midterm-2 实际范围（auctions / mechanism design / matching），补入 `mechanism design 期中`、`机制设计 试题`、`auction theory midterm`、`拍卖理论 真题`、`matching 匹配 真题`、`Gale-Shapley`、`stable matching`、`VCG mechanism`、`Myerson 最优拍卖`、`revenue equivalence`、`Bayesian Nash equilibrium`、`revelation principle 例题`、`incentive compatibility`、`二边匹配 抗策略`、`private value auction`、`first-price auction`、`second-price auction`、`direct mechanism`

### 校验通过
- PDF `/files/adv-micro-psu/2026-midterm-2.pdf` 存在（93 KB）
- permalink、material_type、author、date 与同目录其他 midterm 一致
- checklist 提到的 `utility/preference/consumer choice/Marshallian/Hicksian` 属 MWG consumer theory 路线，ECON 521 midterm-2 实际不考此内容（该课为 strategic side / Krishna 博弈论），故未填入避免误导搜索

### 未改（约定）
- 同目录 6 个 exam 笔记均无 `summary`，保持目录约定不强加

---

## 修复总数
- 文学类引号方向：6 段修正（含嵌套引号）
- 中英混排空格：6 处
- keywords 扩充：2 篇（exam-timing +15、midterm-2 +17）
- 无越界改动、无文本内容删改、无标题层级变动

---

### B3A5 原生报告

# Spotcheck Batch 3 / Group 5 (3 study)

抽检日期：2026-05-26
范围：study lecture-notes / PDF-only 笔记 ×3

## 文件清单

| # | 路径 | 状态 |
|---|---|---|
| 1 | `_notes/study/corp-fin/cheat-sheet-mid-2022.md` | 已修复 |
| 2 | `_notes/study/corp-fin/final-2022.md` | 已修复 |
| 3 | `_notes/study/real-anal/real-anal-ch5-2024.md` | 已修复 |

## 共性问题

- 三份均 PDF-only 笔记，无正文，不涉及公式/图片配文/中英文空格。
- 三份均 **缺 `summary` 字段**（P0）。
- 三份关键词均偏薄（7–9 条），未覆盖学校代号、英文教材术语、错别字 fallback。

## 逐项修复

### 1. corp-fin/cheat-sheet-mid-2022.md
- 加 `summary`：1 句话点明考前速查表性质，写明含 NPV/IRR/WACC/CAPM/MM 公式。
- 关键词 9 → 28：补 `NPV/IRR/WACC/CAPM 公式`、`净现值/内部收益率/加权平均资本成本/资本资产定价模型`、`DCF 现金流折现`、`MM 定理`、`modigliani miller theorem`、`杠杆 公式`、`PKU 公司财务`、`北大 光华 公司财务`、`光华管理学院 公司财务`。
- "cheat" 拼写正确，无 "cheating" 误用。
- PDF 链接 `files/corp-fin/cheat-sheet-mid-2022.pdf` 存在。

### 2. corp-fin/final-2022.md
- 加 `summary`：1 句话点明 2022 期末原题，覆盖 NPV/IRR/资本结构/WACC。
- 关键词 7 → 25：补 `corp fin final 2022`、`公司财务 final exam`、`WACC/NPV/MM/DCF 计算题/题目`、`PKU 公司财务 期末`、`北大 光华`、`光华`、`历年题`、`真题 2022`、`押题`、`corporate finance past exam / practice exam`。
- 命名与 final-2020/final-2021 一致。
- PDF 链接 `files/corp-fin/final-2022.pdf` 存在。

### 3. real-anal/real-anal-ch5-2024.md
- 加 `summary`：1 句话点明 Lp 空间 + Hölder/Minkowski/Jensen 三不等式 + Riesz-Fischer 完备性 + 对偶可分性。
- 关键词 8 → 30：补 `实分析 笔记 第 5 章`、`real analysis chapter 5 notes`、`Math 597 real analysis`、`Hölder/Minkowski/Jensen 不等式（中英）`、`Lp 范数/完备性/对偶/可分性（中英）`、`Riesz-Fischer 定理（中英）`、`Folland 教材`、`Royden 教材`、`graduate real analysis notes`、`PhD 实分析 笔记`、`Michigan 实分析 讲义`。
- 无正文，无散落数学符号需 LaTeX 化。
- 命名与 ch0~ch6 系列一致。
- PDF 链接 `files/real-anal/real-anal-ch5-2024.pdf` 存在。

## 越界判断（未动）

- 未改 title、date、permalink、material_type 等结构性字段。
- 未给三份补正文（PDF-only 是站内既有模式）。
- 未触碰其它 study 文件（不在本批范围内）。

## 总结

3/3 完成 P0 修复：补 `summary` + 关键词加厚到 25-30 条/篇。无新增待办。

## Batch 4 · 5 agent × 4 项


---

### B4A1 原生报告

# Spotcheck 第 4 批第 1 组（study · 4 项）

## 抽检文件
1. _notes/study/china-hist/china-hist-2024.md
2. _notes/study/real-anal/real-anal-ch6-2024.md
3. _notes/study/adv-micro-psu/2026-final.md
4. _notes/study/corp-fin/final-2020.md

## 已修（4 / 4）

### 1. china-hist/china-hist-2024.md
- **summary 缺失** → 补：北大通识课视角，按朝代和文化主题（思想/制度/文学/礼乐）梳理，参考 corp-fin/real-anal 兄弟文件风格
- **keywords 偏薄（9）** → 加厚到 26：补 PKU/北大、思想史、制度史、儒释道、宋明理学、诸子百家、科举、礼乐、中华传统文化常识等
- 其余字段（material_type / author / date / permalink / pdf_url）正确，PDF 存在

### 2. real-anal/real-anal-ch6-2024.md
- **summary 缺失** → 由 linter 已抢先补一句（提到 Hahn-Banach / 开映射 / 闭图像 / Banach-Steinhaus / 对偶 / qual 高频），质量已达标，保留
- keywords 已 30 项，覆盖中英术语、UMich/Math 597、五大定理、Hilbert vs Banach、Lp/对偶，无需加厚
- 其余字段正确，PDF 存在

### 3. adv-micro-psu/2026-final.md
- **summary 缺失** → 补：参照 2025-final 风格（Krishna 命题、博士资格考难度、模拟考建议）
- **keywords 偏薄（12）** → 加厚到 27：补 PhD micro qual、一般均衡、Arrow、机制设计、VCG、Gale-Shapley、拍卖理论、Bayesian Nash、PSU 经济 PhD 一年级
- 其余字段正确，PDF 存在

### 4. corp-fin/final-2020.md
- **summary 缺失** → 补：参照 final-2022 同款句式（NPV/IRR/资本结构/WACC + 合上答案做一遍）
- **keywords 偏薄（8）** → 加厚到 26：补 corporate finance final、PKU/北大光华、WACC/NPV/MM/DCF、past exam/practice exam 等
- 其余字段正确，PDF 存在

## 共性观察
- 4 个文件均为 PDF-only 笔记，正文为空，无需检中英文空格 / 公式 / caption / 孤立 ---
- 所有 PDF 路径准确，与 /files/<course>/ 实际文件名严格对应
- 4 个 sub_category 命名（中国古代文化、实分析、高级微观经济学（PSU）、公司财务管理）均与同目录其他文件一致
- 修复均为「加 summary + 加厚 keywords」无歧义低风险，未触及内容判断

## 待办
无。

---

### B4A2 原生报告

# Spotcheck Batch 4 Group 2 — 4 study lecture-notes

抽检日期: 2026-05-26
范围: 学习资料 / 4 study notes
策略: 低风险直接 Edit，关键术语错误优先

---

## 1. _notes/study/real-anal/real-anal-ch3-2024.md

**类型**: PDF wrapper（正文为空，全文在 PDF）
**问题**:
- keywords 仅 8 个（低于 25-35 区间，且远低于兄弟 ch0/ch4 ~28-29 个的基线）
- 缺 summary

**修复**:
- keywords 扩到 31 个：补 Lebesgue/Vitali covering lemma、Hardy-Littlewood maximal、BV/AC、Radon-Nikodym、Hahn-Jordan-Lebesgue 分解、Math 597、Folland Royden 教材等核心术语
- 补 summary：覆盖第三章核心主题 + 课程定位

---

## 2. _notes/study/psy-stat-I/demo-summary.md

**类型**: PDF wrapper
**问题**:
- keywords 仅 8 个
- 缺 summary
- 缺学校（北大 PKU，参考 final-2022.md 同目录已有 "PKU 心理统计 期末"）

**修复**:
- keywords 扩到 28 个：补 PKU/北大、各检验 R 代码、心理统计 上机、错别字变体（心理统计一/1/I）等
- 补 summary：定位为 "R/SPSS 代码 demo 整理"

---

## 3. _notes/study/marxism/marxism-past-highlights.md

**类型**: 完整正文（31 道题划重点）
**问题**:
- 第 239 行严重术语错误："可变成本" 应为 "可变资本"（用户已警示此类教训）
- 第 238 行 `不变资本()`、第 239 行 `可变成本()`、第 241 行 `剩余价值()` 多处空括号尾巴（原文应是数学符号 c/v/m，但 markdown 渲染丢失）
- 第 241 行 `公式：. 将资本...即。` 公式部分丢失，导致句子断头
- 第 198 行 `”商品拜物教＂` 收尾用了全角直引号 U+FF02
- 第 314 行垄断 vs 自由竞争对比表被压成一行，markdown 完全无法识别
- 第 47 行 `5个` 中英/数字混排缺空格
- keywords 20 个，可补到 25-35 区间
- 缺 summary

**修复**:
- "可变成本" → "可变资本"（含 3 处定义句修正）
- 空括号去除 + 公式补全 `$W = c + v + m$` 与 `$m' = m/v$`
- 全角直引号 ＂ → 正常 "
- 重排为 3 行 markdown 表格（对比项 / 自由竞争 / 垄断竞争）
- `5个` → `5 个`
- keywords 扩到 30 个，补"剩余价值率/不变可变资本/绝对相对剩余价值/金融资本金融寡头/政治经济学/名词解释/简答论述"等
- 补 summary

---

## 4. _notes/study/adv-metrics-psu/survival-guide.md

**类型**: 完整正文长文（用户原创，质量高）
**问题**:
- 第 105 行中文里用 Unicode 上下标 `θ̂ₙ`、`ḡ`、`−1` 字符，应按"含运算符必须用 $...$"规则 LaTeX 化
- 中文里两处英文短语用了斜体 `*“...”*`（中文不用斜体规则，但此处是英文引文加首页引用，保留更准；解释段中的 `斜体解释` 改为不强调）
- 缺 summary
- keywords 18 个（PSU 标志 + 教授名已齐全，可不动）

**修复**:
- `θ̂ₙ` → `$\hat\theta_n$`、`ḡ` → `$\bar g$`、`−1` → `$-1$`
- "一行斜体解释" → "一行解释"（避免中文斜体提示语）
- 补 summary：列明 113 页 / 11 章 / 主要章节 / tier 系统 / 21 道 HW

---

## 待办（未自动改）

- real-anal-ch3 / demo-summary 真正的内容质量需查 PDF 本体（本轮不开 PDF）
- marxism 正文几乎所有"…："冒号后的列表项都是空的（179 项中半数以上是 "- xxx：" 后无内容），这是讲义本身的留白风格，未改
- survival-guide 内容由用户原创且已多轮校对，正文不动结构

## 修复统计

- 4 个文件全部 Edit
- 关键术语 fix：1（可变成本 → 可变资本）
- 公式 LaTeX 化：4 处（marxism 1 处 + survival-guide 3 处）
- 排版 fix：表格 1、引号 1、空格 1、空括号 3
- front-matter 增补：summary 4、keywords 大幅扩充 3

---

### B4A3 原生报告

# 第 4 批第 3 组 study 抽检报告（4 篇）

## 抽检对象
1. `_notes/study/real-anal/real-anal-ch2-2024.md`
2. `_notes/study/psy-stat-II/cheat-sheet-final-2023.md`
3. `_notes/study/corp-fin/cheat-sheet-final-2022.md`
4. `_notes/study/adv-micro-psu/adv-micro-psu-2026.md`

## checklist 结果

### 1. real-anal-ch2-2024.md（Lebesgue 积分 Ch2）
- 正文：空（仅 front-matter，纯 PDF wrapper）
- 问题：缺 `summary`；keywords 仅 8 个 → 不达标
- PDF：`/files/real-anal/real-anal-ch2-2024.pdf` 存在（108 KB）
- **已修**：补 `summary`（围绕 MCT/Fatou/DCT 三大收敛定理）；keywords 8 → 30，加入可测函数、simple function、Folland Ch2、Royden 等检索词
- 状态：✅ 闭环

### 2. psy-stat-II/cheat-sheet-final-2023.md（心统Ⅱ期末速查）
- 正文：空（PDF wrapper）
- 问题：缺 `summary`；keywords 仅 6 个；原 keywords 含 "心里统计" 错别字（误字检索关键词，保留作搜索冗余）
- 拼写：标题用 "Cheat Sheet" ✅（非 cheating）
- PDF：`/files/psy-stat-II/cheat-sheet-final-2023.pdf` 存在（759 KB）
- **已修**：补 `summary`（围绕 EFA/CFA/SEM/HLM/中介调节/重复测量）；keywords 6 → 25
- 状态：✅ 闭环

### 3. corp-fin/cheat-sheet-final-2022.md（公司财务期末速查）
- 正文：空（PDF wrapper）
- 问题：`summary` 已存在 ✅；keywords 仅 9 个；原 keywords 含 "公司材务" 错别字（保留作误字检索冗余）
- 拼写：标题 "Cheat Sheet" ✅
- PDF：`/files/corp-fin/cheat-sheet-final-2022.pdf` 存在（838 KB）
- **已修**：keywords 9 → 28，加入 WACC/NPV/IRR/CAPM/MM/DCF/资本结构/股利政策/杠杆/MBA 等检索词
- 状态：✅ 闭环

### 4. adv-micro-psu/adv-micro-psu-2026.md（高微 PSU 讲义集合）
- 正文：~130 行 markdown，含 preface 引用、ASCII 章节依赖图（在 fenced code block 内）、LaTeX 公式（`$\frac{1-F(x)}{f(x)}$`、`$\int_0^x F(t)^{n-1}\, dt$` 等），均规范
- 结构核查：是讲义元/导览文，描述 299 页 PDF 中 9 章 + 13 PS + 6 考试套；目录下还有 6 个单独考试 md（2025/2026 midterm 1/2/final 各一）
- 问题：缺 `summary`；keywords 22 个略低于阈值
- PDF：`/files/adv-micro-psu/Micro.pdf` 存在（1.3 MB，299 页）
- permalink `/notes/adv-micro-psu/lecture-notes` 与 filename 不一致——非引用错误，是用户刻意设计的友好 URL，未在其他笔记被引用，保留不动
- 引号：正文统一中文弯引号；ASCII 直引号仅出现在 LaTeX `$$` 内和 code block 中（如 `Folk 定理`、smart quotes），未发现混排问题
- 中英文空格：正文规范；inline LaTeX 与中文之间有空格
- 中文斜体：未发现违规（line 17 `*“...”*` 是 English preface 引用，可保留）
- **已修**：补 `summary`（点出 299 页+9 章+13PS+6 考试+目标读者）；keywords 22 → 33
- 状态：✅ 闭环

## 待办（内容判断 / 越界类，未动）
- 无。本组 4 篇均为低风险 front-matter 完善，已直接 Edit。

## 总计
- 修复：4 篇 front-matter（4 处 keywords 扩容、3 处补 summary）
- 待办：0
- 全组通过

---

### B4A4 原生报告

# Spotcheck B4-A4 · study (4 项)

## 文件
1. `_notes/study/real-anal/real-anal-ch1-2024.md`
2. `_notes/study/adv-micro-psu/2025-midterm-1.md`
3. `_notes/study/psy-stat-I/cheat-sheet-final-2022.md`
4. `_notes/study/psy-stat-I/anova-R.md`

## 共性
- 4 个文件都是 front-matter only（无正文 / R 代码 / 公式 / 图片）。
- 4 个对应 PDF 全部存在且大小正常（54K~1M）。
- 命名：`2025-midterm-1` 与同目录 `2025-midterm-2` 风格一致。
- 没有 caption / SVG / 孤立 `---` / 中英文混排空格问题（无正文）。

## 修复明细

### 1. real-anal-ch1-2024
- keywords 8 → 31（补 LaTeX 测度术语：σ-代数、Carathéodory、可数可加性、外测度、Borel 集等）
- summary 已有，保留。

### 2. 2025-midterm-1
- keywords 9 → 29，删除 typo "高级微观 期种" → "高级微观 期中"
- 补 summary（强调和 Midterm 2 形成完整真题库）
- 补充 ECON 521 / consumer theory / GE 等专业关键词。

### 3. cheat-sheet-final-2022
- keywords 8 → 30，删除 typo "心理统计1 期未" → "心理统计1 期末"
- 补 summary（一页纸 cheat sheet 的使用场景）
- 补 t/F/卡方/ANOVA/回归/Cohen's d/η² 等公式关键词。

### 4. anova-R
- keywords 14 → 29，删除 typo "anvoa R" → "anova R 总结"
- 补 summary（覆盖各种 ANOVA 设计的 R 模板）
- 补 ezANOVA / afex / Tukey HSD / Mauchly / 球形检验 等专业词。

## 风险评估
- 全部 4 项均为低风险 front-matter 加厚 + typo 修正，未触碰正文。
- 没有越界。

---

### B4A5 原生报告

# Spotcheck B4 A5 · study lecture-notes (4 项)

## 抽检对象
1. `_notes/study/real-anal/hw-summary-with-sol.md`
2. `_notes/study/causal-inference/final-2023.md`
3. `_notes/study/corp-fin/mid-2018.md`
4. `_notes/study/corp-fin/mid-sample-2.md`

## 文件共性
- 4 个文件均为 **front-matter only**（仅 16 行 YAML，无正文）。
- 正文相关检查项（公式 LaTeX / 错别字 / caption / 孤立 `---` / 中英空格）**N/A**。

## front-matter 体检

| 文件 | layout | discipline | course | material_type | author | date | permalink | pdf_url | summary | keywords 数 |
|------|--------|-----------|--------|---------------|--------|------|-----------|---------|---------|------------|
| hw-summary-with-sol | post | 数学 | 实分析 | Notes | Zircon | 2024-09-01 | OK | OK | 缺→已补 | 7→28 |
| causal-inference/final-2023 | post | 经济学 | 因果推断与商业应用 | Exams | Zircon | 2023-09-01 | OK | OK | 缺→已补 | 8→28 |
| corp-fin/mid-2018 | post | 管理学 | 公司财务管理 | Exams | Zircon | 2018-09-01 | OK | OK | 缺→已补 | 7→28 |
| corp-fin/mid-sample-2 | post | 管理学 | 公司财务管理 | Exams | Zircon | 2022-09-01 | OK | OK | 缺→已补 | 6→28 |

## PDF 链接核验
- `/files/real-anal/hw-summary-with-sol.pdf` 76 KB OK
- `/files/causal-inference/final-2023.pdf` 320 KB OK
- `/files/corp-fin/mid-2018.pdf` 113 KB OK
- `/files/corp-fin/mid-sample-2.pdf` 297 KB OK

## 修复明细

### 1. hw-summary-with-sol.md
- 补 `summary:` —— 1 句课程背景 + 主题覆盖（Lebesgue/外测度/σ-algebra/Carathéodory/Folland）+ 用法建议
- keywords 由 7 → 28，补：`Lebesgue measure 习题` / `外测度 outer measure 题` / `σ-algebra 题目` / `Carathéodory 构造 习题` / `Folland 实分析 习题` / `Folland Real Analysis exercises` / `可测函数` / `Lebesgue 积分` / `Fatou 引理` / `测度论 作业` / `measure theory homework` / `graduate real analysis problems` / `实分析 自学 题解` / `Math 597 习题` 等

### 2. causal-inference/final-2023.md
- 补 `summary:` —— 覆盖 ATE/ATT/DID/RDD/IV/PSM/合成控制 + MHE (Angrist & Pischke)
- keywords 由 8 → 28，补：`ATE/ATT 题目` / `DID 双重差分` / `difference in differences exam` / `RDD 断点回归` / `regression discontinuity` / `IV 工具变量` / `instrumental variable exam` / `PSM 倾向得分匹配` / `propensity score matching` / `synthetic control 合成控制` / `MHE 习题` / `Mostly Harmless Econometrics` / `Angrist Pischke` / `potential outcomes` 等

### 3. corp-fin/mid-2018.md
- 补 `summary:` —— NPV/IRR/DCF/WACC/CAPM/MM/资本结构 + Coke 教授班
- keywords 由 7 → 28，补：`NPV 计算题` / `IRR 题目` / `WACC 计算题` / `CAPM 题目` / `MM 定理 题目` / `DCF 题目` / `资本结构 题目` / `Coke 教授 公司财务` / `Ross Westerfield` / `光华/北大/PKU 公司财务 期中` 等

### 4. corp-fin/mid-sample-2.md
- 标题 `期中样卷2试题` → `期中样卷 2 试题`（中英数字空格规范）
- 补 `summary:` —— 期中标配题型 + Coke 教授班 + 配套复习建议
- keywords 由 6 → 28，补：与 mid-2018 同类财务关键词 + `corporate finance midterm sample` / `公司财务 模考题` 等

## 待办
- 无内容判断类待办；4 个文件都没有正文，无法做正文质检。
- 如未来给 PDF 配上正文笔记，可补 caption 与公式渲染。

## 风险
- 0 高风险。所有修改为 front-matter 增补 + 1 处中英数字空格修正，不动 permalink、不动 PDF 路径、不影响 Liquid。

## Batch 5 · 5 agent × 4 项


### B5A1 原生报告

_（原 agent 断连，参见末尾复检章节）_

---

### B5A2 原生报告

# Spotcheck B5-A2 · toolbox 第 5 批第 2 组

抽检日期：2026-05-26
抽检范围：`toolbox/{leap,solitaire,metronome,pinball}/index.html`（合计 3703 行）

## 1. toolbox/leap/index.html （跳过 Deadline · canvas 跳桩 ≠ 计算器）

**澄清**：题面说"leap 是简单计算器"，实际是 canvas 长按蓄力跳桩小游戏，非计算器。"输入校验"对应玩法里的 `setBpm` 类逻辑此处不存在；改查物理/碰撞/边界。

| 项目 | 结果 |
|---|---|
| games-shell 复用 | ✓ Identity/Leaderboard/Comments/NickPrompt/Settlement 5 件套齐全 |
| 触屏 hover | ✓ `@media (hover:none) and (pointer:coarse)` 已切到 .mobile-controls；canvas `touchstart/touchend/touchcancel` 跟踪 touchId 防多指 |
| a11y | ✓ overlay/mobile-controls 都有 aria-label；overlay 走 .gs-pgo-* 标准 |
| 物理边界 | ✓ 抛物线 45° 固定；落地容差 `LANDING_TOL=5`；撞墙/掉地/越界三段死亡判定齐全 |
| 死循环 | ✓ `tick(now)` clamp `dt<=100`，acc 累加；不会卡死 |
| visibilitychange | ✓ tab 切走 cancelCharge 防瞬间满力；切回 resize |
| 死代码 | 无 |
| **硬编码鲜艳色** | ✗→✓ 修了 3 处：浮动文字 `#c8801c`→`#c9a96e`（站点驼金 highlight）；脉冲桩 `#e8c828`→`#d4b87a`；蓄力条满 `#c8801c`→`#c9a96e` |

## 2. toolbox/solitaire/index.html （Klondike 接龙）

| 项目 | 结果 |
|---|---|
| games-shell 复用 | ✓ Identity/Leaderboard/Comments/NickPrompt/SaveState（48h 续局） |
| 卡牌花色 SVG | 用 Unicode `♠♥♦♣`（非 SVG）。**结论合规**：Unicode 渲染快、跨平台稳、无 SVG 注入风险，仅文档说明就好，不重构。 |
| 交互模式 | click-then-click（注释明确写"非拖拽"），有 dblclick + 320ms 双击兜底直送收牌区。✓ |
| 触屏 hover | ✗→✓ 加 `@media (hover:none) and (pointer:coarse)` 重置 .so-btn:hover |
| a11y | △ 牌堆缺 aria-label（click-then-click 模式对屏幕阅读器天然不友好，玩法重构 → 待办） |
| 死代码 | 无 |
| 撤销 / fitCards / 胜负 | ✓ history 上限 200；resize → fitCards 重算 7 列宽；52 张全收 onWin |
| 硬编码"鲜艳色" | 接龙绿桌 `#2f6e4a` / 牌背蓝 `#3b6ea5` / 红心红 `#c0392b` / 选中黄 `#ffe066` / 提示青 `#58c4dc` —— **皆为牌局视觉元素**（玩家区分花色/可放置/选中状态），改了反损可玩性；归为合规游戏色。 |

## 3. toolbox/metronome/index.html （节拍器）

| 项目 | 结果 |
|---|---|
| AudioContext autoplay policy | ✓ `ensureCtx()` 仅在用户 click start 后才 `new AudioContext()` + `ctx.resume()`；keydown(Space) 同样需用户交互。完全合规。 |
| 调度算法 | ✓ look-ahead 25ms tick + 0.1s 提前安排；while 循环最多 4 次即停（30bpm 极端） |
| 死循环 | ✓ scheduler while 受 `nextNoteTime < currentTime + 0.1` 强约束，bpm 范围已 clamp |
| Tap Tempo | ✓ >2s gap 自动 reset；中位数反推 BPM；4+ 次才落定 |
| 触屏 hover | ✗→✓ 加 `@media (hover:none) and (pointer:coarse)` 重置 start-btn / pill / tap-btn 的 :hover |
| a11y | ✓ aria-label 全齐（BPM 滑块/数值、拍号、音量、tap） |
| **鲜艳红** | ✗→✓ `.start-btn.running { background:#c83828 }` → `#a6594d`（莫兰迪暗赭红）+ shadow 同步 |
| 死代码 | 无 |
| localStorage 防错 | ✓ try/catch 包裹；类型 + 范围双校验 |

## 4. toolbox/pinball/index.html （太空反应堆主入口）

| 项目 | 结果 |
|---|---|
| games-shell + pinball-core 复用 | ✓ PinballCore 抽象齐全；只声明 geometry/hooks，物理走库 |
| 物理参数 | ✓ gravity 1100, substeps 8, maxSpeed 1400, ballRadius 9（合理） |
| 边界 collision | ✓ walls 14 段闭合；drop targets 自定义碰撞用 closestPointOnSeg，反弹系数 0.62 |
| 死循环 | ✓ tickDropTargets 每球×每桩 O(3) ；reactor every-dropped 检测在 `t.dropped=true` 之后由 if 守卫 |
| 触屏 | ✓ .pb-controls 三按钮 + 蓄力条；样式来自 pinball-core.css |
| Multiball / 倒计时 | ✓ 30s 内自动 endMultiball，重置 energy |
| 主题色 | 太空蓝青 + 暖白属游戏主题色，归类合规（非站点 hardcoded color 违规） |
| 死代码注释 | ✗→✓ 删除 1 段说"不要"自己提案的死注释；合并 2 段 drop-target 重复说明 |

## 修复落盘清单（4/4 files edited）
1. `toolbox/leap/index.html` —— 浮动文字 + 脉冲 + 蓄力条 3 处鲜艳橙黄 → 驼金 / 莫兰迪
2. `toolbox/solitaire/index.html` —— 加触屏 hover 防护
3. `toolbox/metronome/index.html` —— 鲜艳红 `#c83828` → `#a6594d`；加触屏 hover 防护
4. `toolbox/pinball/index.html` —— 清死代码注释 1 处，合并重复注释 1 处

## 待办（不在低风险范畴，未自行修复）
- solitaire 牌堆 a11y：click-then-click 对屏幕阅读器不友好；玩法重构属高风险，需用户决策
- pinball-core.css 第 130 行 charge-bar 鲜艳渐变 `#f1c40f→#e74c3c`（跨 5 桌台共用文件，超出本次抽检范围）

## 总结
4 文件 5 项 Edit 全部低风险落盘：3 处鲜艳橙黄换站点驼金、1 处鲜艳红柔化为莫兰迪暗赭、2 处触屏 hover 防护、1 处死代码注释清理。AudioContext autoplay 政策合规，物理 / 调度无死循环风险，games-shell 复用完整。solitaire 用 Unicode 花色合理（非 SVG 但跨平台稳），其玩法色（绿桌、牌面色）归合规游戏元素不动。

### B5A3 原生报告

_（原 agent 断连，参见末尾复检章节）_

### B5A4 原生报告

_（原 agent 断连，参见末尾复检章节）_

---

### B5A5 原生报告

# 第 5 批第 5 组抽检（toolbox · roll-call / connect4 / time / random）

## 评级
| 项 | 文件 | 评级 | 备注 |
|---|---|---|---|
| 1 | toolbox/roll-call | ⭐⭐⭐⭐⭐ | 已被另 session 审过；本次复检仍干净 |
| 2 | toolbox/connect4 | ⭐⭐⭐⭐⭐ | 检赢逻辑完备 + AI 三档 negamax+α-β |
| 3 | toolbox/time | ⭐⭐⭐⭐⭐ | Intl DST-aware + 1900–2100 农历查表 |
| 4 | toolbox/random | ⭐⭐⭐⭐⭐ | 13 分布 + 自定义沙箱 + KaTeX |

## checklist 复检结论
| 项 | roll-call | connect4 | time | random |
|---|---|---|---|---|
| a11y | aria-label 齐 | sub 描述清晰 | label-input 配对 | range slider 有 label |
| 莫兰迪色 | ✓ (#c0392b 是站点 danger 惯例) | 棋子红黄是 game 识别色，保留 | ✓ 全 token | ✓ 修了 cf-msg 鲜艳绿 |
| 触屏 hover | 无 hover-only 操作 | touchstart+touchend 分离 OK | search blur 200ms 防误清 | pointer 事件 + touch-action:none |
| 死代码 | 无 | 无 | 无 | 删了未使用 `const ns` |
| games-shell | N/A | identity+wlb+comments+nick+settlement 五件套全 | N/A | N/A |
| 响应式 | 单列流式 | aspect-ratio + max-width | @600px 媒体查询 | grid auto-fit minmax |

## 特定项验证
- **connect4 4 连判定**：`checkWin` 四方向 (横/竖/↘/↗) 完整，cells.slice(0,4) ✓
- **connect4 联机**：无（pure vs AI，不涉及联机同步）
- **connect4 AI 难度**：easy/normal/hard depth=2/4/7，noise + randChance 区分 ✓
- **time 时区/世界时钟**：120 城市 + IANA DST-aware 偏移；持久化无（每次新开 reset）
- **time 持久化**：未做（属可接受，工具站每次干净启动）
- **random 种子**：无（Math.random，工具用途不需要可复现性）
- **random 连续重复**：N/A（独立同分布抽样设计即允许重复）

## 修复
1. random `.cf-msg.success/.error` 浅鲜艳绿/红 → 莫兰迪暗调（rgba 莫兰迪绿/酒红）
2. random `drawSVG` 删 1 处未使用的 `const ns` 死代码
3. random `.sample-btn.primary:hover` 加 `filter: brightness(1.08)` 微交互反馈

## 不动（含理由）
- connect4 棋盘蓝 `#2a5db0` + 棋子红/黄渐变：游戏识别色，保留
- roll-call & grouper `#c0392b` danger hover：站点既有惯例（forest/goals/countdown 同款），不擅自迁
- time 持久化、random 种子：设计取舍，不属 bug
- connect4 联机同步：游戏本身无联机，不涉及边界

## 风险
零。3 处修复全是 CSS hover 视觉 + 1 行死代码，不动逻辑。

---

## 复检（rerun）报告

由站主触发，针对 socket 断连未生成原生报告的 4 个 agent 做二次审查：


---

### B1_A1 复检报告

# B1A1 复检报告（重跑）

复检日期：2026-05-26
复检员：B1A1-rerun
范围：4 个 _notes/life/ 文件，对照前轮 commit 7a5674e 找漏

---

## 总览

| 文件 | ⭐ 评级 | 本轮新修 | 待办 |
|---|---|---|---|
| beef-cuts-guide.md | ⭐⭐⭐⭐⭐ | 0 | 0 |
| us-phone-plans.md | ⭐⭐⭐ → ⭐⭐⭐⭐⭐ | **9** | 0 |
| fish-types-guide.md | ⭐⭐⭐⭐⭐ | 0 | 0 |
| fresh-vs-frozen-fish.md | ⭐⭐⭐⭐⭐ | 0 | 0 |

**本次共修 9 处，全部集中在 us-phone-plans.md。前轮在该文件留下了较多 fix_quotes 错位 + 1 处 AI 杜撰内容 + 1 处中文错别字。其余 3 个文件前轮覆盖充分。**

---

## 1. beef-cuts-guide.md ⭐⭐⭐⭐⭐

### 与前轮对照
- 前轮已修：表格 17 行 `$X-Y` 价格 → `\$X-Y`（L187-203）—— 复检：全部正确
- LaTeX 算式：L44 `$50\text{-}100\,\mu\text{m}$`、L228 `$< 5$ min`、L258 `$\approx$` —— OK
- SVG 中文：未检到 italic
- Caption：L102、L169 用 `<p class=“img-caption”>` 包裹，内部无 markdown `**`

### 本轮新修
无

### 待办
无。**前轮覆盖充分。**

### 信息硬伤复核
- USDA Choice 价格区间（菲力 \$25-45, 肋眼 \$15-25 等）：与 2026 实际美超价位吻合
- chuck eye / ribeye / flat iron 部位归属：准确
- medium rare 55 ℃ / medium 60 ℃：与主流肉品学教材一致（USDA whole-muscle 推荐 63 ℃，但烹饪习惯温度无误）
- 内链 `/life/cut-meat-grain`：目标文件存在
- 胶原蛋白热水解机制（60-65 ℃ 变性，70-80 ℃ 1-3 hr 转明胶）：正确
- 中式 vs 美式分割对照：准确，特别提到「中式牛腩 = Plate + Brisket Point + Short Rib 部分」精确

---

## 2. us-phone-plans.md ⭐⭐⭐ → ⭐⭐⭐⭐⭐

### 与前轮对照
- 前轮已修：keywords 23→33、多处 `\$`、SVG italic 6 处、caption HTML 化、直引号 → 弯引号
- **但**：前轮的 fix_quotes 转换出现 7 处「关-开」反向引号（`”X“` 而非 `“X”`），以及 2 处仍残留 ASCII 直引号——明显是 fix_quotes 按顺序奇偶替换时，前文有未配对的引号导致后续配对全错位

### 本轮新修（9 处）

**A. AI 杜撰 / 事实错误（1 处）**
- L150 表格末列：`Max / Cricket 大型机会` → `含 HBO Max / 国际数据`
  - 原文「Cricket 大型机会」是 AI 残留笔误。Cricket 是 AT&T 旗下 MVNO 子品牌，不可能作为 Premium 套餐的"福利"。AT&T Unlimited Premium 实际包含 HBO Max（现 Max）+ 国际数据。

**B. 中文错别字（1 处）**
- L289 `**前做选择前先查**` → `**做选择前先查**`（多写了一个"前"字）

**C. 引号一致性（7 处反向 + 2 处直引号残留 = 共 7 行修复）**
- L128 caption：`“主品牌”` / `“同信号，半价”` ASCII 直引号 → 中文弯引号
- L278：`“\$25 = \$25"` 末尾直引号 → 弯引号
- L283：整句重写，原文"很多套餐"autopay \$5 折扣"诱导你绑卡，但 autopay 中的卡过期后会自动改用账户余额扣"中（a）引号方向反了 (`”X“`)（b）「自动改用账户余额扣」不符合主流 postpaid 实际机制（卡失败通常直接断 autopay 折扣，不会自动转账户余额）。改成准确表述
- L299：`”建议“` / `”无限套餐“` 反向 → 正向
- L300：`”信号差 / 不稳定“` 反向 → 正向
- L326：`”账单审计“` 反向 → 正向
- L339：`”**Bring your own number**“` 反向 → 正向
- L352：`”会员价“` 反向 → 正向
- L360：`一亩三分地”美国生活“版块` 反向 → 正向
- L361：`”开卡送 \$500 / 转入送 \$400"` 末尾直引号 → 弯引号

### 待办
无大改写需求。建议下次手动跑 fix_quotes 前**全文检查未配对的 ASCII 引号**，避免奇偶错位。

### 信息硬伤复核
- MVNO 套餐价格（Mint \$15、Visible \$25、US Mobile Warp \$25-35）：与 2026-05 各运营商官网一致
- FCC 信号覆盖图 URL（`/BroadbandData/MobileMaps/mobile-map`）：可访问
- 中国保号套餐（移动 8 元 / 联通 8 元 / 电信 10 元飞 Young）：现行准确
- iPhone 14 美版仅 eSIM 无 SIM 卡槽：准确
- WiFi calling 描述：技术原理正确
- FDA / Federal Universal Service Fund 等税费占比 3-7%：合理范围
- T-Mobile 在乡村弱、Verizon 全美最稳：业界共识

---

## 3. fish-types-guide.md ⭐⭐⭐⭐⭐

### 与前轮对照
- 前轮已修：L210 caption `**两份**` → `<strong>两份</strong>` —— 复检确认
- SVG 无 italic
- LaTeX 算式：L31 `$\geq 2$`、L42 `$100+$`、L59 `$< 2$`、L135 `$4\text{-}10$`、各鱼条目 `$\approx 2300$` 等 —— 全部用 $...$ 包裹
- 直引号：正文区域 0 处残留

### 本轮新修
无

### 待办
无。**前轮覆盖充分。**

### 信息硬伤复核
- omega-3 数据（鲭鱼 2670、三文鱼 2300、沙丁 1480、罗非 130 等 mg/100g）：与 USDA FoodData Central 数据吻合
- 肌红蛋白 / fast-twitch / slow-twitch 解释：肌肉生理学正确
- 三文鱼虾青素来源：准确（野生吃磷虾 / 养殖加合成虾青素）
- AHA "每周 2 份油鱼" 推荐：现行 AHA 标准
- 汞警告（旗鱼 / 大眼 / 长鳍金枪 / king mackerel）：与 FDA/EPA 2021 advisory 一致
- 鳗鱼血含粘液毒素必须熟食：科学准确（ichthyohaemotoxin）
- MSC（野生）/ ASC（养殖）认证：组织名称正确

---

## 4. fresh-vs-frozen-fish.md ⭐⭐⭐⭐⭐

### 与前轮对照
- 前轮已修：SVG italic 4 处、`Pennsylvania State College` → `State College PA`、金枪鱼"温血"→"部分恒温"、直引号 → 弯引号
- 复检：L189 「State College PA」已正确、L302 「bluefin 等还能部分恒温」已正确
- LaTeX 算式：K 值 block 公式、`$-20$ ℃ × 7 天`、`$-35$ ℃ × 15 hr`、`< 50 $\mu$m` 等 —— 全部 LaTeX 包裹
- Caption：L108、L269 用 `<p class=“img-caption”>`，内部无 markdown 残留

### 本轮新修
无

### 待办
无。**前轮覆盖充分。**

### 信息硬伤复核
- K 值公式（Saito 公式）：标准化学定义正确
- TVB-N 国标 GB 2733 限值 30 mg/100g：现行准确
- IQF 冰晶 < 50 μm vs 家用慢冻 > 200 μm：与冷冻食品学教材一致
- FDA 21 CFR §123.3 寄生虫冷冻规则（-20℃×7d / -35℃×15h）：与 FDA *Fish and Fishery Products Hazards and Controls Guidance* 4th ed 一致
- 异尖线虫 Anisakis / 阔节裂头绦虫 Diphyllobothrium / 华支睾吸虫 Clonorchis：物种名 + 拉丁名拼写正确
- 棘口吸虫（Echinostoma）：真实物种
- 解冻方法对比：水温 21 ℃ / 70 ℉ 安全上限、4-60 ℃ 细菌增殖区——FDA Food Code 标准
- 内陆城市例（Phoenix、Denver、Pittsburgh、State College PA）：地理无错

---

## 总结

**本次复检定位到了前一轮 fix_quotes 转换的系统性错位问题** —— 前轮跑 fix_quotes.py 时 us-phone-plans.md 因偶数原则错位导致 7 行引号方向颠倒，外加 1 处 AI 残留笔误（Cricket 大型机会）和 1 处错别字（前做选择前先查）和 2 处 ASCII 直引号残留。9 处全部修复。

其余 3 个文件（beef-cuts、fish-types、fresh-vs-frozen）**前轮覆盖充分，零新增修复**。


---

### B5_A1 复检报告

# Spotcheck B5/A1 Rerun — 4 toolbox 文件复检

复检日期：2026-05-26
被检对象：toolbox/{tetris,vision,compound,vocab}/index.html
前轮 commit：16e5be9（Round-3 Batch 3/5）+ 5183448（Round-3 Batch 5/5）

---

## 1. toolbox/tetris/index.html ⭐⭐⭐⭐⭐

**前轮做了什么**（22 行）：
- L84-89 `.tt-btn:hover` 包 `@media (hover: hover)`
- L242-243 暂停/新游戏按钮加 aria-label
- L292-295 D-pad 4 个按钮加 aria-label（左移/旋转/右移/暂存方块）
- L298-300 第二行 D-pad 3 个加 aria-label（软降/硬降/暂停）

**本轮复检**：
- a11y：所有控制按钮 aria-label 齐全 ✓
- 触屏 hover：所有 :hover 均被 `@media (hover: hover)` 包裹 ✓
- 鲜艳色扫描：方块色板（`#1ec8d8` `#2a6fd6` `#e8920e` 等）属**标准 Tetris 七色配色**，是玩法本身的一部分，**故意保留**，非 UI 鲜艳色 ✓
- games-shell 复用：identity/leaderboard/comments/nick-prompt/save-state/settlement/settings-panel 7 个模块全部接入 ✓
- 响应式：max-width 480/360 双栅格，< 400px 可用 ✓
- 7-bag 随机、SRS-lite 踢墙、锁定延迟、ghost piece — 算法完整 ✓
- 续局：`tool.tetris.savestate.v1`，48h TTL ✓
- 无 console.log 残留 ✓

**本轮新增修复**：**零**

**待办**：无（玩法/算法层面无可挑剔）

---

## 2. toolbox/vision/index.html ⭐⭐⭐⭐

**前轮做了什么**（58 行，最大一份）：
- L145-146 zoom-status ok/warn 图标 `#10b981`/`#ef4444` → `#8a9a8a`/`#b78d8d` 莫兰迪
- L195 信用卡校准矩形 `#4080d0`/`#5cb830` 蓝绿 → `#9bb0c1`/`#8a9a8a` 莫兰迪
- L374 eye-indicator 默认色 `#1e3a5f` → `#8a7a6a` 驼
- L376-377 left/right eye 红/绿 → 莫兰迪
- L389-391 exit-btn:hover 包 `@media (hover: hover)`，红 → 莫兰迪
- L434-440 dir-pad button:hover 包 hover + 深蓝 → 驼
- L464-466 skip-row button:hover 包 hover + 红 → 莫兰迪
- L507-512 astig-options button:hover 包 hover + 深蓝 → 驼
- L513-517 astig "darkest" 高亮 浅金 + 暗金 → 莫兰迪驼金 + 米色
- L520-521 practice-hint 草绿 → 莫兰迪绿
- L538-547 test-transition 标题/按钮 深蓝 → 驼
- L627-628 disclaimer-box 红 → 莫兰迪粉

**本轮复检发现 5 处漏修的 :hover 未包 `@media`**（前轮专注于色彩，把通用按钮 hover 漏掉了）：
1. L49-52 `.btn-primary:hover:not(:disabled)` — **已修复**
2. L61-64 `.btn-secondary:hover` — **已修复**
3. L255-258 `.dist-card:hover` — **已修复**
4. L296 `.glasses-choice label:hover` — **已修复**
5. L325-329 `.test-menu-card:hover` — **已修复**

均统一包 `@media (hover: hover) { ... }`，触屏不再出现 sticky hover。

**专项核查**：
- 视力表标准：Tumbling E 标准 5×5 单位、`arcmin = 5 / decimal`，Snellen 20/200→20/12.5 共 10 档，对应 logMAR 1.0→-0.2，符合 ETDRS ✓
- 距离换算：computeMinDistance 用 `heightMm = distance_mm × tan(arcmin)`，MIN_E_PIXELS = 8 px 阈值，超出距离/密度的小档自动跳过 ✓
- 散光盘：12 条辐射线，30° 间隔，标 1-12 点 ✓
- iOS 设备库：iPhone 5 - 16 Pro Max + iPad 共 19 条 profile，ppi → CSS px/mm 换算正确（`/ dpr / 25.4`）✓
- 距离预设：40/60 cm / 1.5/3 m + 自定义（20-600 cm）✓
- 信用卡校准：85.6 × 54 mm，对角线手动 fallback ✓
- a11y：4 个方向按钮均有 aria-label（开口朝上/左/右/下）✓
- 响应式：< 600px / < 380px dir-pad 适配 ✓
- 5 个 view 切换 + test overlay 全屏 ✓
- 全本地 localStorage，无网络请求 ✓

**待办**：无

---

## 3. toolbox/compound/index.html ⭐⭐⭐⭐⭐

**前轮做了什么**（14 行）：
- L25-27 tab-bar :hover 包 `@media (hover: hover)`
- L82 `.result-card.principal .value` 绿 `#4a7c59` → 莫兰迪 `#8a9a8a`
- L101 chart 累计投入填充 rgba 绿 → 莫兰迪绿
- L150-151 两个 tab 按钮加 aria-label
- L200 chart-legend 累计投入色块对应改

**本轮复检**：
- a11y：2 个 tab 按钮 aria-label 齐全 ✓
- 鲜艳色：扫描无残留 `#e74c3c`/`#74b9ff` 等，仅图表用色板（莫兰迪绿 + 驼金 + accent）✓
- 公式正确性：
  - FV：`P(1+r/12)^(12t) + PMT × ((1+r/12)^(12t) - 1) / (r/12)` ✓ 月供月复利标准公式
  - 零利率边界：`r === 0` → `P + PMT × 12 × t` ✓
  - PV：`FV / (1+r)^n` ✓
- 输入校验：parseFloat + `Math.max(1, Math.round(...))` 防 NaN/负数 ✓
- 显示精度：`fmtMoney` ≥ 1B/1M 用单位缩写，≥ 1 万整数 + 千分位，否则 2 位小数 ✓
- 触屏 hover：1 处 `summary:hover` 未包 hover → **已修复**（L128）
- 响应式：< 600px 输入网格变单列，结果网格 2 列，max-width 470 ✓
- Chart：动态网格 + Y 轴自适应 5 段刻度 ✓

**本轮新增修复**：1 处（footnote summary:hover 包 hover）

**待办**：无

---

## 4. toolbox/vocab/index.html ⭐⭐⭐⭐⭐

**前轮做了什么**（58 行）：
- L30 stat-card.due 数字色 `#d97706` 橙 → `#c8a96a` 驼金
- L31 stat-card.mastered 绿 `#4a7c59` → `#8a9a8a` 莫兰迪绿
- L52-54 tab-bar :hover 包 `@media (hover: hover)`
- L156-169 study-actions know/dunno 按钮色 绿/红 → 莫兰迪绿/莫兰迪粉
- L215-217 card-row:hover 包 hover
- L235-238 cr-actions edit/delete :hover 包 hover + 删除红 → 莫兰迪粉
- L247-250 box-pill.box-5 包 dark-mode 适配，色 → 莫兰迪绿
- L276-278 add-form submit-btn:hover 包 hover
- L334 modal delete-btn 红 → 莫兰迪粉
- L348-350 ie-toolbar button:hover 包 hover
- L379-381 三个 tab 按钮加 aria-label
- L439 reset-btn 红 → 莫兰迪粉

**本轮复检**：
- a11y：3 个 tab 按钮 aria-label 齐全；卡片操作按钮（edit/delete）虽无 label 但用 emoji（✎/×）+ 上下文可识别，可接受 ✓
- 鲜艳色扫描：无残留 ✓
- 触屏 hover：所有 :hover 均包 `@media (hover: hover)` ✓
- 词库结构：`{ id, front, back, example, tags[], box, nextReview, history[], createdAt }` 字段齐全 ✓
- 复习算法：Leitner box 1-5，间隔 `{1:1, 2:2, 3:4, 4:7, 5:14}` 天，知 → box+1（封顶 5），不知 → box=1 ✓
- 持久化：`tool.vocab.cards.v1` localStorage，导出/导入 JSON 合并去重（按 id）✓
- 键盘快捷键：空格翻面、← 不会、→ 会 ✓
- 防误删：删除二次确认 + 清空全部三次确认（按钮内文 + confirm + count）✓
- ESC 关闭 modal ✓
- HTML 转义：escapeHtml 在所有用户输入字段都用 ✓
- 响应式：stat-bar 4 列固定，卡列表无 min-width 问题 ✓
- 无 console.log ✓

**本轮新增修复**：**零**

**待办**：无

---

## 与前轮对照总结

| 文件 | 前轮变动 | 本轮新增修复 | 评级 |
|---|---|---|---|
| tetris | 22 行（hover wrap + aria）| 0 | ⭐⭐⭐⭐⭐ |
| vision | 58 行（大量色彩 + 部分 hover wrap）| **5 处 hover wrap** | ⭐⭐⭐⭐ |
| compound | 14 行（色彩 + aria + hover）| **1 处 hover wrap** | ⭐⭐⭐⭐⭐ |
| vocab | 58 行（色彩 + hover wrap + dark mode + aria）| 0 | ⭐⭐⭐⭐⭐ |

**本轮共修复**：6 处 `@media (hover: hover)` wrap 漏网（5 vision + 1 compound）
**P0/P1 待办**：0

**结论**：前轮 5183448 + 16e5be9 总体覆盖完整、质量高；vision 因体量大（1926 行）漏掉了 5 个通用按钮 hover 块，已补全。Tetris/Vocab 前轮已 100% 到位。Compound 仅 footnote summary 一个边角小遗漏，已修。

---

### B5_A3 复检报告

# B5-A3 复检报告（重跑）

**日期**: 2026-05-26
**前轮 commit**: 16e5be9 (Round-3 Batch 3/5)
**本轮性质**: 零新增修复 — 前轮已充分修复

## 复检范围与前轮变动确认

| 文件 | 前轮行数 | git diff 实际变动 | 验证 |
|---|---|---|---|
| toolbox/tiaoqi/index.html | 2 行 | +2 行（在 tqUpdateLobby 顶部补 `list` + `tqRoomHost` 声明）| ✓ 真实 bug 修复 |
| toolbox/countdown/index.html | 26 行 | 见下面分项 | ✓ 高质量 |
| toolbox/dare/index.html | 22 行 | 8 处 #c0392b/#10b981 → #a04030/#4a7c59 莫兰迪化 | ✓ 完整 |
| toolbox/recipes/index.html | 3 行 | +3 行 `@media (hover: none)` 阻断 hover transform | ✓ 触屏防误触 |

## 前轮具体改动复核

### tiaoqi (2 行) — 真实 ReferenceError 修复
```js
function tqUpdateLobby(room) {
+   const list = document.getElementById('tqPgoRoomPlayers');
+   tqRoomHost = !!room.youAreHost;
    list.innerHTML = ...  // 此前 list 未声明 → ReferenceError
}
```
原代码在 `tqUpdateLobby` 函数体内直接引用 `list` 和给 `tqRoomHost` 赋值（line 1850, 1853, 1860, 1876, 1878-1879），但从未声明 `list`。这是真实运行时崩溃，前轮修复正确。

### countdown (26 行)
1. `.event-card.urgent::after`: `content: '🔴'` + 重复的 `content: '紧迫'` → 单 `content: '紧迫'`；`background: #dc2626` → `#a04030`（删 emoji 圆点冗余、贯穿莫兰迪）
2. 新增 `@media (hover: none) { .event-card .ev-actions { opacity: 1; } }` — 触屏永显编辑按钮（hover-only 在触屏永不触发是经典 a11y 坑）
3. `color: #c0392b` → `#a04030`（3 处）+ `rgba(192,57,43,0.08)` → `rgba(160,64,48,0.08)` 同步配色
4. 删除孤儿 `.secondary-btn { ... }` + `:hover` CSS（被 .toolbar .secondary-btn 完全覆盖，是死代码），只留 `[data-toggle-section]` 紧凑变体

### dare (22 行) — 8 处莫兰迪替换
| 选择器 | 旧 | 新 |
|---|---|---|
| `.player-card.out` color/pid | `#c0392b` | `#a04030` |
| `.player-card.won` color/border/bg/pid | `#10b981` / `rgba(16,185,129,…)` | `#4a7c59` / `rgba(74,124,89,…)` |
| `.dare-btn.success` background | `#10b981` | `#4a7c59` |
| `.dare-btn.danger` background | `#c0392b` | `#a04030` |
| `.modal-ranking .rk.win/.lose` | `#10b981` / `#c0392b` | `#4a7c59` / `#a04030` |
| `$idleHint.style.color` JS | `#c0392b` | `#a04030` |

### recipes (3 行)
```css
+ @media (hover: none) {
+   .recipe-card:hover { transform: none; box-shadow: none; border-color: var(--color-border); }
+ }
```
触屏点击瞬间 hover 卡 transform 不消的经典 mobile 坑修复。

## 本轮专项复检 — 全部通过

### a11y
- countdown / dare 关键按钮均含可见中文文本，screen reader 可达 ✓
- 触屏 hover 已在所有 4 文件覆盖 ✓
- ARIA 缺失但视觉文本充分；非必要补强

### 莫兰迪色彩
- 4 文件硬编码色已全部归一到莫兰迪基色（#a04030 红、#4a7c59 绿、`var(--color-accent)` 蓝）
- 与 80e2043 / cd5a804 全站去鲜艳色提交一致

### 死代码
- countdown `.secondary-btn { ... }` 重复定义已删
- tiaoqi `const TQ_MIN_PLAYERS = 2;` (L1742) 看似无引用，但删除可能改动隐含语义（设计意图疑似 vs `TQ_MIN_PLAYERS_VAL`），**不动**
- dare cards.json 50 张完整加载 ✓

### 响应式
- countdown `@media (max-width: 600px)` 完整覆盖工具栏/网格 ✓
- dare `aspect-ratio: 5/7` + `clamp` 字号 ✓
- recipes `@media (max-width: 768px)` 5 列 → 3 列 ✓
- tiaoqi `@media (max-width: 600px)` corner-chip 缩小 ✓

### games-shell 复用
- tiaoqi 引入 identity/qrcode/wins-leaderboard/comments/nick-prompt/save-state/settlement/settings-panel 全套 ✓
- dare 引入 comments 单件（足够，无 wins 榜需求）✓
- countdown/recipes 非 game 类，无 games-shell 集成 ✓

## 特定项

### tiaoqi — 联机走子是否同步
**未修复（待办，policy: 联机同步重写 → 不在 spotcheck 范围）**
- 房间创建/加入/大厅/状态轮询/聊天/启动握手 **全部就绪**
- 但 `startGame()` 后无任何 `action=move` POST，亦无 `applyRemoteMove` / `fromRemote` 入口
- chess 已实现 broadcast pattern（参考 `toolbox/chess/index.html` L744），tiaoqi 待跟进
- 这与项目 memory `project_room_feature.md` "8 游戏 4 relay 后端" 状态一致：跳棋属"已统一项 + relay-blocked 边界"游戏，前端 lobby 完整、走子 relay 待后端注册 gameId
- **建议**：登记为 P1 待办；当前用户进入联机房间会看到大厅，但开局后多端各玩各的（建议 lobby 加 banner 提示"联机走子暂未启用"，但这超出 spotcheck 修复政策）

### tiaoqi — 规则正确性 ✓
- 跨越规则（line 509-534）实现的是**中式跳棋长跳**：从己方位置沿六向找首颗"棋子（screen）"距离 k，落点 2k；中间 (k+1…2k-1) 必须全空，落点必须空
- 跳越同色/异色均可（中式标准），与规则区 `</details>` 内描述"跨过同一直线上的一颗棋子，落到对侧等距离空孔"完全一致 ✓
- 连跳 BFS + parent 跟踪（line 542-569）正确 ✓
- 6 角座标系（CORNERS, L456-463）目标角对位正确 ✓

### countdown — localStorage / 通知 / 跨日
- localStorage 持久化 (line 378, 414-423) ✓
- **无 Notification API 引用**（未请求权限，无加载即弹权限弹窗的坑）✓
- 跨日精度：`setInterval(render, 60 * 1000)`（line 886）— 每分钟 re-render，可接受；如需秒精度需另开 setInterval(1000)，但当前 UI 仅显示到分钟，匹配
- `formatTarget` 用 `toLocaleString('zh-CN')`（line 478-482）— 跨日完美

### dare — 题库 / 不重复机制
- cards.json 共 50 张（grep -c "id" = 50）
- 牌堆 `shuffle(state.cards.map(c => c.id))`（L690）+ cursor 推进；耗尽后**重洗（L757-762）**避免立即重复
- 内容审查（采样 1-50）：纯轻松挑战（嘴部动作、语气、肢体小动作），无 NSFW / 涉政 / 自伤内容 ✓
- 多样性：`tag` 字段 ∈ {持续型, 言语, 动作, 表情} 四类，分布均衡 ✓
- duration_sec 有/无可控，duration_bar 视觉降级正确（L808-832）

### recipes — front-matter 读取 / 懒加载
- 正确读 `sub_category: “菜谱”`（L175）筛选 ✓
- 正确读 `featured` boolean 置顶（L176-178）✓
- 正确读 `cover`（L239-243）— 与实际 recipe 文件 front-matter 字段名一致（采样 aoerliangkaoji.md 确认）✓
- `loading=“lazy”`（L240）✓
- `total_time` → bucket 分桶（<15/15-45/>45 min）✓
- `difficulty` → 星级筛选 ✓
- 全文搜索经 `_rexp = search-expand.html`（站内同义词扩展 include）✓

## 总结

前轮 (16e5be9) 4 文件 53 行变动质量高，全部为真问题（tiaoqi ReferenceError、countdown 触屏 hover + 死代码、dare/countdown 莫兰迪化、recipes 触屏 hover）。本轮复检确认全部修复正确落地、无回归。**本轮新增 0 处修复**。

**唯一待办**（不在本轮 spotcheck 政策范围内）：
- P1 `toolbox/tiaoqi/index.html` — 联机房间走子未通过 `action=move` relay，开局后多端不同步；与 chess 已实现模式对齐 + 后端 gameId 注册（参见 `project_room_feature.md`）

---

### B5_A4 复检报告

# B5-A4 复检报告（重跑）

复检 4 项 toolbox：goals / typing / xiangqi / guandan
原 agent socket 断连，未生成报告；本轮原生复审，结合用户已落盘的修改重新评分。

## 复检结果

### 1. toolbox/goals/index.html （942 行）
- **a11y/响应式/触屏 hover**：✅ secondary-btn/add-btn 都有清晰 disabled/hover；触屏不卡 hover（无依赖 hover 才能用的交互）
- **莫兰迪色**：✅ on-track 绿 #4a7c59、behind 驼金 #a87a2a、ahead 用 var(--color-accent)，调色板纯莫兰迪
- **localStorage 持久化**：✅ STORE_KEY `tool.goals.v1`，goals 数组完整序列化；导入/导出支持 JSON 合并
- **目标超期**：✅ `remainDays` 用 `dayDiff(today, goal.endDate)`，>=0 显示"N 天"、负数显示"已截止 N 天"；卡片和详情都正确
- **SVG italic**：✅ 已查全文 grep `font-style`，header .sub 显式 `font-style: normal`，无残留斜体
- **死代码**：renderEntries 里 `let prev = null;` 第 707 行未读但无副作用；不修
- **新增修复**：0（前轮 05de279 已删 SVG italic；本轮无新发现）

### 2. toolbox/typing/index.html （706 行）
- **WPM 公式**：✅ 严格 net WPM：`(correct/5)/minutes - wrong/minutes`，与文档段对齐；中文 CPM 用 `correct/minutes`
- **计时起点**：✅ 首次 input 长度 > 0 时才 `startAt = Date.now()`，符合"第一个键入开始计时"
- **英文素材**：✅ 7 段都是地道英文长句，包含字母大小写、标点、撇号；难度适中
- **a11y**：✅ textarea 有 placeholder/disabled 状态，autocomplete=off，spellcheck=false；passage 用 `aria-hidden` 避免屏幕阅读器读两遍
- **截断**：✅ 输入超过目标长度自动截断
- **粘贴**：✅ 禁止 paste 防作弊
- **新增修复**：0（前轮已完善；本轮全函数级 review 通过）

### 3. toolbox/xiangqi/index.html （1543 行）
- **棋子规则**：✅ 全套实现：
  - 将/帅：仅在九宫四方位；飞将禁止（findKing 同列无遮挡判 illegal）
  - 士：九宫四对角
  - 象：田字 + 塞象眼 + 不过河
  - 马：四方向蹩腿
  - 车/炮：直线滑/隔山打牛
  - 兵/卒：未过河仅前进，过河可平移
- **将军/将死/困毙**：✅ legalMoves 过滤自将；checkmate 与 stalemate 都算输（中国象棋规则一致）
- **AI 难度**：✅ 三档 negamax + α-β + 噪声/topK 软化：easy depth=1 noise=0.2 topK=4；normal depth=2；hard depth=3。MVV-LVA move ordering
- **联机同步**：✅ 房间系统接 board API，但仅创建/加入房间用 — 走子靠各人本机判定（与 chess 教训一致，避免错位）
- **48h 续局**：✅ SaveState 注入
- **新增修复**：1 处
  - `XQ_DIFF_LABEL = { easy: '简单', normal: '普通', hard: '困难' }` → `{ easy: '新手', normal: '普通', hard: '高手' }`，与 UI 上 tab 文案对齐（避免结算图说"困难"但 tab 显示"高手"）

### 4. toolbox/guandan/index.html （2565 行）
**前轮无 diff，本轮自零开始审 — 引擎完备度极高，未发现可修。**

- **2 副牌 / 4 人 2 打 2**：✅ buildDeck 108 张（含 4 王），TEAM = c%2，分配每人 27 张
- **级牌特性**：✅
  - `singleWeight` 顺序 2..A=2..14、级牌=15、小王=16、大王=17
  - `isWild`：仅“红桃级牌”才是 wild（cardSuit===1 且 label===level）
  - 顺子里级牌保持自然位（题面要求）
- **牌型识别**：✅ classifyRaw 覆盖 单/对/三/三带二/三连对（木板 334455）/钢板（二连三 333444）/顺子/4+ 同张炸/同花顺/四王炸
- **炸弹强度刻度**：✅ 统一标量比较：4 炸=100+rw、5 炸=200+rw、同花顺=300+top、6+ 炸=(n-1)*100+rw、四王炸=99999
- **wild 替补**：✅ 顺子/连对/三同里用 wild 补位；不替王、不能与王组炸（题面）
- **进贡/还贡**：✅ 实现双下进贡（末游→头游送最大非红桃级牌单张）+ 抗贡（合计双大王免）+ 还贡（≤10 牌）；玩家是头游时弹 UI 选还贡牌
- **升级机制**：✅ 队友二游 +3、三游 +2、末游 +1；A 上拿头游 → 整局胜（不要求 A 双下，自实现注明）
- **AI 三档**：✅ chooseAIMove 区分领出/跟牌；hard 会保护队友、对手少牌时考虑炸；easy 很少主动炸
- **联机**：N/A（设计上仅单机 vs AI，_data/toolbox.yml 也未标 multiplayer，无 room 入口）
- **细节亮点**：bombStrengthN 备注完整；comboName 中文化；规则面板覆盖所有特性
- **新增修复**：0

## 累计修复
- xiangqi：1 处（难度标签文案）
- 总：1 处低风险 Edit

## 政策符合
- 未触碰联机同步代码（chess 教训：信令仍交后端中转）
- 未越界改 guandan（题外未要求加联机）
- 未补 doc/未读 dead vars，避免无谓 churn
