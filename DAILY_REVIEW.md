## 2026-06-19

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周五 DOW=5，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=19，未跑 monthly_stats）。距 6-18 巡检共 **7 个 commit**（`eb4a8dd` 之后 → `3ca3687` 为止），主题**单线**：**掼蛋（guandan）联机改造的第二波收尾——出牌倒计时 + SSE 实时推送 + 局终结算闩与四视角测试模式**。① **联机「真人变机器人」回归修复 + 四视角测试模式**（`b526cbd` + `e85006b`）—— 真人在第 2 局起被前端误显示为机器人 + 刷新退化问题；同步配上「四视角（暗号 quad）」测试模式，一人扮四家走真实联机流程自测，方便后续回归。② **联机结算卡死 + 出牌反馈打磨**（`7395e06`）—— 联机结算回归修复，出牌即时反馈、炸弹特效、测试条体验联调。③ **出牌倒计时（统一 25s 上限，所有视角看「该谁出 + 剩多久」）**（`afa9d4e`）—— `turnMs()` 不再按 10/20/30 分档，只区分「限时 25s」与「不限」；`applyServerGameState` 进入出牌态时一律 `armTurnClock()`，把闹钟挂在「当前该出牌者」的座位 / 出牌区，自时钟超时自动出牌 + 连续 2 次转托管。④ **SSE 实时推送从「搭好默认关」→「默认开 + 兜底回退轮询」**（`ebc8d2e` + `5bce07a`）—— 先 `ebc8d2e` 搭好 EventSource 统一同步入口 `startOnlineSync/stopOnlineSync`（flag 关→长轮询、flag 开→SSE；连不上/被代理屏蔽自动回退轮询），保持 flag 关，零行为变化；随后 `5bce07a` 后端 stream 端点上线后默认启用 SSE（他人出牌约 1 个网络往返即到），同时把**局终死循环根因**修掉——结算闩 `_endHandled/_matchEnded` 原先只在 `startNetworkedGame/startRound` 复位，靠轮询/推送进入下一局的玩家从此不复位、第 2 局起 `endRound` 成 no-op；改为 `applyServerGameState` 收到 playing/tribute (新局进行中) 即复位该闩；防御 `sendNetworkedMove` 在非出牌阶段/非我回合/我已出完时直接忽略，根除「提交被退回→牌弹回→再被提示出牌」循环；`startNetworkedGame` 对 round_end/match_end 视图如实置相位，不再硬置 PLAYING 闪 UI。⑤ **倒计时改用服务器统一计时（切视角不重跳）+ 测试模式秒切视角**（`3ca3687`）—— 倒计时原是客户端本地 `now+25s`、每次重渲都重置、切视角即重数；改为客户端用服务器下发的 `turnElapsedMs` (本回合已用时) 算 `turnRemainMs = 上限 - 已用`，切视角/重连/任何重渲都显示同一条、不重置；超时自动出牌按剩余触发；单机仍满额。测试模式切座引入 `_srv` 缓存的瞬时渲染 + 后续 SSE/轮询初帧刷新（去阻塞 GET）。版本号：`2026.06.18.x` → `2026.06.19.x`。共改 2 个文件：`assets/js/games/guandan.js` 7 次（+543 / -77）、`toolbox/guandan/index.html` 7 次（缓存版本号 bump）。**0 文章内容改动 / 0 站点 IA 改动**——7 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（11.942 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与昨日同）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，状态与昨日完全相同）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `filename_convention` / `hover_no_media`（7 次掼蛋改动后无裸 `:hover` 引入）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-18）。**今日 0 项自动修复**——7 个 commit 全部合规。**P1 队列**：6-18 review 经核对清掉 4 项「早已修掉但机械承接」的旧项后，仅 `study_order` 未列 `interm-econometrics` 一条 P1 仍有效（承接 6-13 至 6-18 共 6 日）。今日另对 6-05 残留的「付费 / 隐藏内容公开 manifest.json 暴露」P1 做了独立核验——根 `manifest.json` 仅含站点元信息（name/icons/start_url=/zh/）**无 shortcuts / 无路径泄露**；`admin-manifest.json` 走 Liquid 模板 `{% unless item.hidden or item.trashed %}` 过滤 hidden/trashed、置 `sitemap: false`、付费文 paid:true 字段属设计内（公开 = 有预览 + 购买入口），亦无暴露隐藏内容——该项 6-05 P1 可正式归档。**抽检 10 项无新增问题**（1 个 game `chess` 1987 行 / 99.8KB inline 与 leap/runner 同性质，全 `:hover` 已 `@media (hover: hover)` 守卫；2 个 pdf_archive `adv-micro-psu/2025-final.pdf` + `interm-macro/interm-macro-2022.pdf` 各被对应 markdown `pdf_url` 唯一引用；2 个 lecture_note_pdf_only `causal-inference/final-2022` + `corp-fin/mid-sample-4` PDF 路径有效、front-matter 完整、keywords 厚足、属一次性真题样卷存档维持现状；5 个 life note `kitchen-vs-bathroom-water` `fridge-layout-guide` `paid-test-us-banking-guide` `special-garments-care` `cooking-water` front-matter 齐整、生活之问 / 留学攻略两个专栏调性一致）。

### ✅ 本次已自动修复

无。

7 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件内，无文章内容 / 信息架构 / 搜索 / 样式 / 配置 / front-matter 改动。所有审计项 clean，未发现任何无争议低风险问题可自动处理。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17 / 6-18，第 7 日承接）。`/notes/` landing 渲染遍历的就是 `site.study_order`（`notes/index.html` L81 + L245），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同名相近但目录不同）这篇在 `/notes/index.html` 里**渲染不出来**（`_site/sitemap.xml` 第 300 行确认 `/notes/interm-econometrics/interm-econometrics-2023` 已收录到 sitemap、search.json 正常，**仅** landing 缺）。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
3. **掼蛋 6-18 ~ 6-19 期间联机改造第二波（结算闩 / SSE / 倒计时 / 四视角测试）大动 7 commit，建议站主在真机 / 微信内置浏览器跑两局完整联机回归** —— ① 真机 SSE 是否真连上（看 console / network 标签 EventSource），代理屏蔽时是否平滑回退长轮询；② 第 2 / 第 3 局结算是否每局都弹（局终死循环已修，但要真两人开局连打验证）；③ 倒计时切视角时是否不重跳（关键修复点）；④ 测试模式四视角 quad 切座是否秒切无空屏；⑤ 单机一局回归（防 `isNetworked` 闩残留再次卡死 AI）。沙箱无浏览器无法替代真机回归。
4. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策（承接自 6-18）。

#### 已归档（核对当前仓库已修复，从队列移除）

1. ~~付费 / 隐藏内容公开 manifest.json 暴露（承接 6-05 P1）~~ —— 今日核对：根 `manifest.json` 仅站点元信息（name/short_name/icons/start_url=/zh/）无 shortcuts 无路径泄露；`admin-manifest.json` 走 `{% unless item.hidden or item.trashed %}` 过滤、置 `sitemap: false`、付费文 paid:true 属公开元信息（预览 + 购买入口本就公开），不暴露隐藏内容。该 P1 正式归档。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 工作树干净（`git status` clean、`git ls-files --others --exclude-standard` 空、无 `.DS_Store` / `*.bak` / `*.orig` / `*.tmp` / `*~` / 副本文件 / 密钥 / 凭证 / 个人路径痕迹）。7 个 commit 全部锁在 `assets/js/games/guandan.js` + `toolbox/guandan/index.html` 两个文件；未引入新目录 / 新顶级文件 / 新依赖 / 新二进制（`guandan-dmc.bin` 未再动）。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_100_REPORT.md`、`SPOTCHECK_100_AGENT_REPORTS.md`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 / 6-17 / 6-18 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/chess/index.html`**（1986 行 / 99.8 KB inline + `ai-worker.js` 40 行 / 1.5 KB）
- 已修复：无。
- 待办：无新增。
- 长期建议：单文件 1986 行已超出站内单游戏阈值（站主自定的 >1000 行考虑拆分），但聚合度高（含 AI Worker 调度 / 多模式 / 升变 UI / 领地卡 mini & terr 双套渲染）；已两次重构后稳定。`:hover` 已全部 `@media (hover: hover)` 守卫 ✅（共 7 处 hover 全部内层）。维持现状即可。

**抽检 2/10 · `pdf_archive` · `files/adv-micro-psu/2025-final.pdf`**（51.5 KB）
- 已修复：无。
- 归属：✅ `_notes/study/adv-micro-psu/2025-final.md` 唯一引用 `pdf_url: "/files/adv-micro-psu/2025-final.pdf"`，路径一致。
- 体积合理性：51.5 KB 极小（题面 PDF 无图无扫描），未列入 `EXEMPT_FILES`、`images.py` 未报，符合预期。
- LaTeX 化潜力：低——PSU 高微 2025 期末真题 PDF，存档定位明确、一次性真题无更新需求；建议维持 PDF 存档。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/causal-inference/final-2022.md`**
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/causal-inference/final-2022.pdf"` 路径有效（grep + 文件 ls 双重确认）；front-matter 完整（layout/main_category/sub_category=因果推断与商业应用/course/material_type=Exams/date=2022-09-01/author=Zircon/discipline=经济学/keywords ×27 厚足覆盖中英术语 PSM/RDD/DID/IV/synthetic control/光华/PKU/AB test/uplift modeling/HTE 等）；summary 介绍清晰提示「无答案」并指向 2023 真题做横向对比。
- LaTeX 化建议：③ 维持 PDF 存档即可——2022 年真题题面，定位明确无更新需求。

**抽检 4/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/mid-sample-4.md`**
- 已修复：无。
- 一致性：✅ `pdf_url: "/files/corp-fin/mid-sample-4.pdf"` 路径有效；front-matter 完整（material_type=Exams、summary 指向 `mid-sample-4-sol` 配套答案、keywords ×26 覆盖错别字「公司财物」+ 英文术语 + NPV/IRR/WACC/CAPM/MM 定理 + Ross Westerfield / Brealey Myers 教材名）；author=Zircon。
- LaTeX 化建议：③ 维持 PDF 存档即可——样卷题面，定位与 final-2022 同性质。

**抽检 5/10 · `note` · `_notes/life/kitchen-vs-bathroom-water.md`**（185 行 / 16.5 KB）
- 已修复：无。
- front-matter ✅：title / date / main_category=生活攻略 / sub_category=生活之问 / permalink / keywords ×34 覆盖核心搜索词（厨房水 vs 卫生间水、卫生间水能喝吗、储水式热水器军团菌、二次供水、起泡器、铅、GB 5749 等）。
- 内容观感 ✅：开篇钩子 + 落实工程性问题，符合生活之问专栏调性。
- 长期建议：无。

**抽检 6/10 · `note` · `_notes/life/fridge-layout-guide.md`**（276 行 / 17.2 KB）
- 已修复：无。
- front-matter ✅：30 条 keywords 覆盖中英术语（FoodKeeper / USDA / crisper drawer / 乙烯催熟 / 保鲜抽屉）；含 `hidden:false trashed:false bodyremote:false published:true` 四个 admin 后台字段，与 admin/index.html 调试形成的标记一致，正常。
- 长期建议：无。

**抽检 7/10 · `note` · `_notes/life/paid-test-us-banking-guide.md`**（620 行 / 22.8 KB）
- 已修复：无。
- front-matter ✅：title 含「（付费）」标记、permalink `/life/paid-test/us-banking-guide`、sub_category=留学攻略、author=周睿（与其他付费文一致）、`published: true`、keywords 充足。
- 长期建议：无——属付费内容线，由付费墙系统管控。

**抽检 8/10 · `pdf_archive` · `files/interm-macro/interm-macro-2022.pdf`**（1.6 MB）
- 已修复：无。
- 归属：✅ `_notes/study/interm-macro/interm-macro-2022.md` 唯一引用 `pdf_url: "/files/interm-macro/interm-macro-2022.pdf"`；同目录另有 6-16 上线的中文版 `interm-macro-2022-zh.pdf` (2.13 MB) 对应 `interm-macro-2022-zh.md`（承接 6-16 / 6-17 / 6-18 巡检状态——`images.py` 唯一大文件提示，markdown 入口正常）。
- LaTeX 化潜力：中等——中级宏观整学期讲义 1.6 MB 量级合理，若有 .tex 源可纳入低优 LaTeX 化队列，无源则维持 PDF。属设计判断。

**抽检 9/10 · `note` · `_notes/life/special-garments-care.md`**（439 行 / 19.8 KB）
- 已修复：无。
- front-matter ✅：sub_category=生活之问 / keywords ×20 含错别字「衬杉怎么洗」覆盖；开篇钩子（新买衬衫越洗越黄）+ 「2. 结论先行」清晰结构。
- 长期建议：无。

**抽检 10/10 · `note` · `_notes/life/cooking-water.md`**（310 行 / 20.0 KB）
- 已修复：无。
- front-matter ✅：sub_category=生活之问 + `extra_categories: [菜谱]` 双归类（生活之问 + 菜谱）；keywords ×21 覆盖中英术语（DBPs / THMs / 氯胺 / 硬水软水 / GB 5749）、permalink `/life/cooking-water` 整洁。
- 长期建议：无。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-18 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 7 个 commit 全部前端**（assets/js/games/guandan.js + toolbox/guandan/index.html），后端无新增依赖。

---

## 2026-06-18

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周四 DOW=4，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=18，未跑 monthly_stats）。距 6-17 巡检共 **12 个 commit**（`47ee05d` 之后 → `4e50fc9` 为止），两条主线：① **jukebox 单曲歌词全量重跑**（`008ff4f`）—— 新对齐管线（人声分离 + 多块局部对齐 + 尾段补转）重跑 live 单曲，本次只落地 **74 首「新≥旧×0.7 且非抓错歌」的安全改善**（占 jukebox 库一半上下）；剩余 16 首问题首（英文歌 / 翻唱抓错 CD / ASR 漂移 / "爱人错过" / "小酒窝" 等）+ 3 失败首保留旧版，零回退，待逐类修复后再补。仅改 `toolbox/jukebox/lyrics.json` 一文件 148 行（74 ↑ / 74 ↓），不动 jukebox UI / 歌单 schema / sitemap 守卫。② **掼蛋（guandan）卡面参数定稿 + 手机端 UX 大幅打磨 + 真·联机改造 + 局终摊牌**（11 commit 一条龙）—— **首段** `4aa1536` 横排大花色微调 + 大小王横排皇冠位置落地（再定稿 V2 之后）；**手机端连环 5 commit** `8518a9b` → `d49b752` → `d388d48` → `4255947`：手牌按实际列数定卡宽（中档回到设计原寸）+ 收紧列间距 → 写死尺寸调大 + 超宽横滑看牌 + 出牌带锚到 6 张高度 → 修真因「横滑看牌」+ 看牌区硬边界 + 手牌 = 出牌区同尺寸 → 左界右移 / 按钮下移 / 列距 ≈ 0 + 旁观提示落牌下 + 出牌区整体下移。**第三段** `0ffe961` + `6fd2e63`：四家出牌区拉成菱形 + 提示 = 当前难度 AI 同一手 → 级牌全门渐变底 + 红桃级牌描金 + 菱形整体下移。**第四段（真·联机改造）** `645ba4b` —— 192 行修一锅四问题：① 单机 AI 卡死（`isNetworked` 是只设不复位的单向闩，先玩联机再回单机时 `scheduleAI` 顶上 `if (isNetworked()) return` 把 AI 调度整条吞掉，`startMatch`/`leaveRoom` 复位；② 别人看到房主在底部 → `displayIdxForSeat` 改为总按 `mySeat` 旋转，人人自视角、队友顶位、对手两侧；③ 开局后客户端不同步 → 轮询同步分支原被永真 `!_startedTransition` 挡死，改用 `_netGameReady` 开局初始化完才打开；④ 非房主座位错位 + 真·各玩各的 → `rotateGvToSelf` 把服务端绝对座位/绝对队伍整体旋转成自视角，下游渲染/结算无需改即正确）。**第五段** `2106f51`：bump 缓存版本号上线联机修复 + 出完牌名次标签取代张数。`d00897a`：局终摊牌——没出完的家把剩牌平铺到出牌区（限宽不铺满）。**收尾** `4e50fc9`：**「零假联机」铁律**——服务端没下发对局时绝不退化本地 3-AI 假局糊弄，明确提示用户重进房间。版本号 6-17 期间 `2026.06.16.8` → `2026.06.17.mp` → `2026.06.17.mp2` → `2026.06.17.mp3`。共改 4 个文件：`assets/js/games/guandan.js` 11 次（+323 / -195）、`toolbox/guandan/index.html` 9 次、`toolbox/guandan/card-editor.html` 2 次、`toolbox/jukebox/lyrics.json` 1 次。**0 文章内容改动 / 0 站点 IA 改动**——12 个 commit 全部锁在 `toolbox/{guandan,jukebox}/` + `assets/js/games/` 两个目录。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（14.358 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与昨日同）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常，状态与昨日完全相同）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `filename_convention` / `hover_no_media`（11 次掼蛋 UI 改动后无裸 `:hover` 引入，连同 jukebox 一并齐整）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-17）。**今日 0 项自动修复**——12 个 commit 全部合规。**P1 队列大幅清理**——核对当前仓库实际状态后发现，6-17 review 机械承接的 5 项 P1 中**有 4 项早已被站主修掉**但 review 未核验：① 6-04 `1403841` 已还原 NUL byte 3 文件（`grep -rlPI "\x00" _notes/study/` 当前空）；② `/account/` 已合并为单 SPA `account/index.html`（带 `sitemap: false + noindex: true`），不再是「4 篇页面」；③ 6-04 `04730f6` 已让 `_layouts/recipe.html` 接入 `sa-postbar`（grep 命中 4 处）；④ 6-04 `d85c349` 已把 `toolbox/pet/index.html` 5303 行单文件拆成 `_includes/toolbox/pet/{board,modals}.html` + `assets/css/pet.css` + `assets/js/pet.js` 四件套（index.html 现仅 32 行）。本巡检规则要求每日基于当前仓库状态判断，今日把这 4 项从 P1 队列移除并归档。**唯一仍有效的 P1**：`_config.yml` 的 `study_order` 未列 `interm-econometrics`（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17；6-17 review 提到 `monetary-econ` 也缺，但今日核对 `monetary-econ` 已在 L83 列内、且 `/notes/index.html` 第 500/506/2417 行均渲染正常——`monetary-econ` 这条早已不成立；`interm-econometrics` 单条留待站主拍板）。**抽检 10 项无新增问题**（4 个引用 `pdf_url` 直链已逐一 grep 验证全部有效；2 个 game `leap` `runner` `:hover` 已用 `@media (hover: hover)` 守卫；2 个 life「猫的每一种叫声」「色盲到底是看不见颜色」属生活之问专栏五段结构整洁；1 个 lecture_note_full `real-anal-ch1-2024` 与 1 个 PSU 教学体系存档定位明确）。

### ✅ 本次已自动修复

无。

12 个 commit 全部锁在 `toolbox/{guandan,jukebox}/` + `assets/js/games/` 两个目录内，无文章内容 / 信息架构 / 搜索 / 样式 / 配置 / front-matter 改动。所有审计项 clean，未发现任何无争议低风险问题可自动处理。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16 / 6-17，第 6 日承接）。`/notes/` landing 渲染遍历的就是 `site.study_order`（`notes/index.html` L81 + L245），所以 `interm-econometrics-2023.md`（sub_category =「中级计量经济学」、与同名旧版 `interm-metrics-2023.md` 同 sub_category）这篇在 `/notes/index.html` 里**渲染不出来**（grep 命中 `interm-metrics-2023` 但**没**命中 `interm-econometrics-2023`），文章本体 / 同课程侧栏 / sitemap / search.json 仍正常工作。改否、改成什么名（保留现状 / 加进 `study_order` / 与 `interm-metrics/` 合并）属设计判断，仍请你拍板。**注**：6-17 review 列出的另一条「`monetary-econ` 缺」今日核对**早已不成立**——`monetary-econ` 在 `_config.yml` L83 内，`/notes/index.html` L500 / L506 / L2417 均渲染正常，故剔出。

2. **付费 / 隐藏内容公开 `manifest.json` 暴露**（承接 6-05 巡检的 P1）—— 5-29 / 5-30 / 6-04 后续 commit 引入 `_paid/` 与 `noindex` 隐藏文章，但站点根 `manifest.json` 是否仍把它们列在 PWA `start_url` / `shortcuts` 里、值得站主看一眼是否需要剥离。属设计判断，未擅自改。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
3. **掼蛋 6-17 期间手机端 + 联机大动**（11 commit）**建议站主于真机 / 微信内置浏览器跑两局完整对局回归** —— 单机一局看手机端手牌 / 出牌区 / 菱形布局，再两台设备开联机一局验证：① 房主 / 非房主各自视角下底部都是自己 ②某家先出完后名次标签 ③ 局终摊牌剩牌平铺 ④ 服务端断时不退化本地假局而是明确报错。沙箱无浏览器无法替代真机回归。
4. **jukebox 16 首问题首 + 3 失败首待逐类修复** —— 6-17 `008ff4f` 落地 74 首安全改善后剩余的「英文歌 / 翻唱抓错 CD / ASR 漂移」等问题首站主可继续推进。属内容修复决策。

#### 已归档（核对当前仓库已修复，从 6-17 队列移除）

1. ~~`_notes/study/` 下 NUL byte 文件 3 个~~ —— 6-04 `1403841` 已还原，`grep -rlPI "\x00" _notes/study/` 当前空。
2. ~~`/account/` 目录 4 篇页面 `sitemap: false`~~ —— 已合并为单 SPA `account/index.html`（`sitemap: false + noindex: true`），属于隐藏的账号系统页面有意设计；不再「4 篇」。
3. ~~`_layouts/recipe.html` 未接 `sa-postbar`~~ —— 6-04 `04730f6` 已接入（grep 命中 4 处：CSS + DOM + JS 全套）。
4. ~~`toolbox/pet/` 单文件膨胀（5500 行）~~ —— 6-04 `d85c349` 已拆成 `toolbox/pet/index.html`（仅 32 行）+ `_includes/toolbox/pet/{board,modals}.html` + `assets/css/pet.css` + `assets/js/pet.js` 四件套。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 工作树干净、无未跟踪文件 / 未提交改动（`git ls-files --others --exclude-standard` 空、`git status` clean）。12 个 commit 全部锁在 `toolbox/guandan/`、`toolbox/jukebox/`、`assets/js/games/` 三处；未引入新目录 / 新顶级文件 / 新依赖 / 新二进制（`guandan-dmc.bin` 未再动）。无 `.DS_Store` / 副本文件 / `*.bak`/`*.orig`/`*.tmp`/`*~` / 密钥 / 凭证 / 个人路径痕迹。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`SPOTCHECK_100_REPORT.md`、`SPOTCHECK_100_AGENT_REPORTS.md`、`TOOLBOX_AUDIT_REPORT.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 / 6-17 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/leap/index.html`**（1124 行 / 40.1 KB inline）
- 已修复：无。
- 待办：无新增。
- 长期建议：单文件 1124 行已临近站内单游戏阈值（站主自定的 >1000 行考虑拆分）；功能聚合度高、纯前端单机小游戏。维持现状即可，与 toolbox/random 同性质（聚合公式 / 工具方法成本不低）。`:hover` 已两处 `@media (hover: hover)` 守卫 ✅。

**抽检 2/10 · `pdf_archive` · `files/public-econ/public-econ-2023.pdf`**（1.7 MB）
- 已修复：无。
- 归属：✅ `_notes/study/public-econ/public-econ-2023.md` 唯一引用（grep 命中），pdf_url 一致。
- 体积合理性：1.7 MB 在课程讲义 PDF 常见量级、未列入 `EXEMPT_FILES`、`images.py` 未报，符合预期。
- LaTeX 化潜力：低-中——公共经济学 2023 整学期讲义，若有 .tex 源可纳入低优 LaTeX 化队列；若仅 PDF 维持现状。属设计判断。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/adv-metrics-pku/mid-2015.md`**
- 已修复：无。
- 一致性：✅ pdf_url `/files/adv-metrics-pku/mid-2015.pdf` 路径有效；front-matter 完整（main_category / sub_category / discipline / course / material_type=Exams / date / author=Zircon / keywords 充足 / summary）。`published` 字段未显式设置（默认 true），permalink 也正常。
- 搜索关键词：26 条 keywords 覆盖中英课程名 / 大样本 / IV / GMM / MLE 等真题关键词，足够厚。
- LaTeX 化建议：③ 维持 PDF 存档即可——2015 年高级计量期中真题，存档定位明确，无更新需求。

**抽检 4/10 · `game` · `toolbox/runner/index.html`**（1082 行 / 39.3 KB inline）
- 已修复：无。
- 待办：无新增。
- 长期建议：与 leap 同性质（小游戏单文件 ~1100 行），`:hover` 已 `@media (hover: hover)` 守卫 ✅，维持现状。

**抽检 5/10 · `note` · `_notes/life/cat-language.md`**（117 行 / 9.9 KB）
- 已修复：无。
- front-matter ✅：title / date / author / main_category=生活攻略 / sub_category=生活之问 / permalink / keywords 30 条（中英 / 同义词 / 俗名 / 「猫语翻译器」错别字均覆盖）。
- 内容观感 ✅：开篇钩子（养猫人对猫喵的"虚假对话"）+ 引导跳转 `/toolbox/cat-language/` 猫语板的内站互链入口齐整，与生活之问其他文章一致。
- 长期建议：无新增。

**抽检 6/10 · `lecture_note_full` · `_notes/study/real-anal/real-anal-ch1-2024.md`**
- 已修复：无。
- 一致性：✅ pdf_url `/files/real-anal/real-anal-ch1-2024.pdf` 有效；front-matter 完整（含 published: true）；author=Zircon。
- 搜索关键词：30 条覆盖 UMich / 密歇根 / 测度论 / σ-代数 / Lebesgue / Carathéodory 等核心术语，足够。
- 长期建议：无。

**抽检 7/10 · `note` · `_notes/research/latex-commands.md`**（301 行 / 15.9 KB）
- 已修复：无。
- front-matter ✅：sub_category=LaTeX 相关 / 33 条 keywords / summary 略缺但科研妙招类不强制。permalink 走 `/research/latex/` 二级路径，与其他 LaTeX 文章一致。
- 内容质量 ✅：通读 macros / `\newcommand` / 数学符号简写等核心场景，无事实错误。
- 长期建议：无。

**抽检 8/10 · `lecture_note_full` · `_notes/study/marxism/marxism-final-2023-fall.md`**（51 行 / 1.8 KB）
- 已修复：无。
- 一致性：✅ 51 行短文（回忆版真题），无 pdf_url（这是一份正文型 markdown 笔记，不是 PDF-only 存档）；material_type=Exams 准确。
- 搜索关键词：12 条覆盖马原期末 + 错别字「马原期未」+ 中英文，足够。
- 长期建议：思政课真题回忆版，定位明确，维持现状。

**抽检 9/10 · `pdf_archive` · `files/corp-fin/cheat-sheet-mid-2022.pdf`**（1.3 MB）
- 已修复：无。
- 归属：✅ `_notes/study/corp-fin/cheat-sheet-mid-2022.md` 唯一引用（grep 命中 1 处；psy-stat-I 下有同名 markdown 但指向不同 PDF 路径，无冲突）。
- LaTeX 化潜力：低——cheat sheet 对版式精度强依赖，PDF 形态最合适。承接 6-17 抽检 8。

**抽检 10/10 · `note` · `_notes/life/color-blindness-mechanism.md`**（443 行 / 37.5 KB）
- 已修复：无。
- front-matter ✅：sub_category=生活之问 / 21 条 keywords（中英 / 色弱色盲区分 / Ishihara / EnChroma 等关键词全覆盖）/ permalink `/life/color-blindness-mechanism` 整洁。
- 内容质量 ✅：开篇双人对话钩子 + 严谨的视锥细胞 / X 染色体遗传机理（L/M/S 锥与遗传学），符合生活之问专栏五段结构 + 循证调性。
- 长期建议：无。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-17 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 12 个 commit 全部前端**（toolbox/guandan + toolbox/jukebox + assets/js/games），后端无新增依赖。

---

## 2026-06-17

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周三 DOW=3，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=17，未跑 monthly_stats）。距 6-16 巡检共 **11 个 commit**（`7c4130f` 之后 → `9da2a12` 为止），主题**单线**：**掼蛋（guandan）UI 与 AI 持续打磨**。① **高手 AI 模型 int8 量化**（`c315e45`）—— `guandan-dmc.bin` 从 5.1 MB → 1.36 MB（−73%，下载/解析 4× 提速），逐输出列对称 int8 + 列 scale，反量化与 JS 加载器 vs python 跑 2004 次决策 0 差异；自对弈 hard 69.5% vs 满血 67.5%（同 seed 噪声内），出牌强度等价。`loadWeights` 按文件大小自动分派 int8/float32。② **高手档下载与门控强化**（`8aa704c` + `e2d0499`）—— 进场必经 Pregame 面板，高手档严格门控神经网络，下载失败= 重试/降档，绝不悄悄回退假高手；版本徽标置顶 z-index 拉满 `2d8da3d`。③ **卡面参数体系定稿与编辑器扩建**（`e752061` → `63385f6` → `0b71c8d` → `7aa3d55` → `9da2a12` 共 5 次）—— 卡面编辑器收进仓库（`noindex`），引入「预览改用真实 50 px 游戏尺寸 + 滑杆改真实渲染宽度（非缩放）」忠实化机制；右下大花色拆「竖排 / 横排」（`bigH/brH/bbH/opH`，初始相等向后兼容）；右上 / 左下角标花色新增「统一上下 + 逐花色微调」两层滑杆（`SUIT_TRY_ALL/SUIT_BLY_ALL` + 逐花色 `trY/blY`）；大小王横排皇冠新增左右 / 上下位置（`crown2x/crown2y`）；GD2-CARDS 导出格式逐次扩字段。版本号：6-16 期间 `2026.06.16.1` → `2026.06.16.8`，今日定稿 `2026.06.16.8`。④ **左下花色按框居中**（`63385f6`）—— q-bl 锚点改为框中心，缩放中心不动。共改 5 个文件：`assets/js/games/guandan.js` 8 次、`assets/js/games/guandan-dmc.js` 1 次、`assets/js/games/guandan-dmc.bin` 1 次（int8 重生）、`toolbox/guandan/index.html` 8 次、`toolbox/guandan/card-editor.html` 5 次（新建并扩建）。**0 文章内容改动 / 0 站点 IA 改动**——本日 11 个 commit 全部锁在 `toolbox/guandan/` + `assets/js/games/` 两个目录。`bundle install` ✅ + `bundle exec ruby -e Jekyll::Commands::Build.process(...)` ✅ 通过、零 warning、零 error（15.08 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足，与昨日同）/ `images`（仅 `files/interm-macro/interm-macro-2022-zh.pdf` 2.13 MB 大文件，承接 6-16 中文版讲义首发，markdown 入口正常）/ `material_type_enum`（分布完全无变化：Notes ×44 / Exams ×40 / 课程测评 ×18 / 经验之谈 ×5 / 错题本 ×3 / 写作 ×2 / 口语 ×1 / 词汇 ×1）/ `filename_convention` / `hover_no_media`（5 次 `card-editor.html` 改动后仍未引入裸 `:hover`，掼蛋全套守卫齐整）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检见下）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-16）。**今日 0 项自动修复**——11 个 commit 全部合规；唯一 P1（`study_order` 未列 `interm-econometrics` / `monetary-econ`）继续从 6-13 / 6-14 / 6-15 / 6-16 承接，今日状态完全不变，属设计判断，按巡检规则不擅改。**抽检 10 项无新增问题**（5 个 pdf_archive 已逐一 grep 验证引用，3 个为 `_notes/study/` 下 pdf_url 直链、1 个为 `index.html` 章节碎片链接、1 个为 PSU 高微章节碎片，全部有效；2 个 game 抽检 `random` `jukebox` 均符合既有设计——`jukebox` 是 6-01 上线的隐藏页 `noindex+sitemap:false`，front-matter 无 title 是有意为之；2 个 lecture_note_pdf_only 为公司财务管理 cheat sheet / 样卷答案，存档定位明确不进 LaTeX 队列）。

### ✅ 本次已自动修复

无。

11 个 commit 全部在 `toolbox/guandan/` + `assets/js/games/` 两个目录内，无文章内容 / 信息架构 / 搜索 / 样式 / 配置 / front-matter 改动。所有审计项 clean，未发现任何无争议低风险问题可自动处理。

### 📋 待你把关

#### P0（紧急）
无。

#### P1（重要）

1. **`_config.yml` 的 `study_order` 仍未列 `interm-econometrics` 与 `monetary-econ` 文件夹**（承接 6-13 / 6-14 / 6-15 / 6-16，第 5 日承接，状态完全不变）。两篇文件夹分别承载「中级计量讲义（中英双版）」与「货币经济学讲义」——两者文章页正文 / 同课程侧栏 / sitemap / search.json 均正常运作，但 `study_order` 列表里没显式排序权重，依赖默认按字母序排到末尾。`interm-macro`（6-16 上线的中级宏观）反而是已在 `study_order:` 第 5 行的「老」文件夹，所以**新增中文版自动落位正常**——再次印证此 P1 是「新文件夹未在排序表登记」问题，非 study_order 设计本身的缺陷。改否、改成什么名（保留现状 / 加进 `study_order` / 重命名文件夹合并旧路径）属设计判断，仍请你拍板。

2. **`_notes/study/` 下 NUL byte 文件 3 个**（持续承接自 5-31）—— 5-31 巡检中 grep 抓到 3 个 markdown 含 `\x00` 字节，Jekyll 编译时按 ASCII 处理静默丢字段。当时讨论后决定先观察、不擅自改，至今未动。建议你方便时给一句「该改 / 不改 / 怎么改」的指示，便于完结这个待办或正式归档。

3. **`/account/` 目录所有页面（4 篇）`sitemap: false` 状态未变** —— 5-29 起记录，账号系统 Phase 4–5b 已完成上线（6-01 ~ 6-02），但 `/account/login.html`、`/account/profile.html`、`/account/orders.html`、`/account/redeem.html` 4 个页面仍标 `sitemap: false`。是「账号系统不希望搜索引擎收录」的有意设计还是开发期遗留默认值，待你定夺。

4. **`_layouts/recipe.html` 未接 `sa-postbar`（点赞 / 评论 / 催更）** —— 持续承接自 5-30。当前菜谱 layout 与 `_layouts/post.html` 共用大部分结构但少了文末交互栏。菜谱要不要 sa-postbar 属内容定位决策（菜谱是「工具型」还是「内容型」），待你定。

5. **`toolbox/pet/` 单文件膨胀** —— 持续承接自 5-26。`toolbox/pet/index.html` 现长度约 5500 行，远超站内其他游戏。拆分为 `pet.html` + `assets/js/games/pet.js` + `assets/css/pet.css` 三件套涉及大规模重构（约 700 ~ 1000 行 inline JS / CSS 外迁），不在「无争议低风险」范围内。

#### P2（建议）

1. **`toolbox/random/` hover 守卫内层缩进 cosmetic** —— 承接自 6-03。功能正确，纯排版风格小差异，可忽略。
2. **mid-2015 与 anova-R 纯 PDF 存档可加同课程互链入口** —— 承接自 6-03。已有「同课程自动侧栏」覆盖（`sibling_crosslink.py` ✅）但缺手写互链段落引导。属内容写作决策。
3. **掼蛋卡面参数已六轮微调，建议站主于真机/微信内置浏览器跑一次完整对局回归** —— 6-16 期间共 11 次 `index.html` + `guandan.js` 改动，每次都涉及视觉参数。沙箱无浏览器，无法替代真机回归；建议你方便时跑一局看看角标 / 大花色 / 大小王皇冠在 iOS Safari + 微信内置 WebView 下的渲染是否符合预期，特别是「右下大花色 横排 vs 竖排」是否如设计意图分离呈现。

### 🗂 仓库卫生

**仓库结构较昨日无变化，无需再优化。** 工作树干净、无未跟踪文件 / 未提交改动。11 个 commit 全部锁在 `toolbox/guandan/` 与 `assets/js/games/`（含 `guandan-dmc.bin` 二进制 5.1 MB → 1.36 MB 整体替换）；未引入新目录 / 新顶级文件 / 新依赖。无 `.DS_Store` / 副本文件 / 密钥 / 凭证 / 个人路径痕迹。`_config.yml` 的 `exclude:` 列表已含 `DAILY_REVIEW.md`、`EMAIL_SUMMARY.md`、`docs/`、`scripts/`、`tools/`、`_paid/`、`audio/`、`backends/`、`.claude/`、`.githooks/` 等所有内部目录与产物。`.gitignore` 状态未变。**结论**：与 6-15 / 6-16 同——仓库目录基线稳定，无可优化空间，跳过结构调整。

### 🔬 抽检专项

**抽检 1/10 · `game` · `toolbox/random/index.html`**
- 已修复：无。
- 待办：P2 hover 守卫内层缩进 cosmetic（承接 6-03，状态不变）。
- 长期建议：单文件 75.2 KB / 2093 行已临近站内单游戏阈值，但功能聚合度高、内含 KaTeX 公式渲染，结构性拆分代价不低。维持现状。

**抽检 2/10 · `pdf_archive` · `files/corp-fin/final-2022.pdf`**（277 KB）
- 已修复：无。
- 归属：✅ `_notes/study/corp-fin/final-2022.md` 唯一引用，pdf_url 一致。
- LaTeX 化潜力：低——历年公司财务管理期末样题/答案存档定位明确，不打算更新。维持 PDF 存档即可。

**抽检 3/10 · `lecture_note_pdf_only` · `_notes/study/swimming/swimming-exam-prep.md`**
- 已修复：无。
- 一致性：✅ pdf_url `/files/study/swimming/Main.pdf` 路径有效；front-matter 完整（main_category / sub_category / course / date / material_type 齐全）。
- LaTeX 化建议：③ 维持 PDF 存档即可——游泳笔试一次性资料，复用频次极低。

**抽检 4/10 · `pdf_archive` · `files/real-anal/hw-summary-with-sol.pdf`**（75 KB）
- 已修复：无。
- 归属：✅ `_notes/study/real-anal/hw-summary-with-sol.md` 唯一引用。
- LaTeX 化潜力：中——实分析作业合订本，体积小 PDF 矢量、若有 .tex 源已经价值。建议站主回想是否还存有 .tex 源，若存在可纳入低优 LaTeX 化队列；若仅 PDF 维持现状。

**抽检 5/10 · `pdf_archive` · `files/adv-micro-psu/chapters/ch4.pdf`**（207 KB）
- 已修复：无。
- 归属：✅ `index.html` 第 619 行直链；与 ch1 ~ ch9 整套作为英文学术主页的 PSU 高微章节碎片对外开放（不在 `_notes/` 系，由 LaTeX 主源拆出）。
- LaTeX 化潜力：N/A —— 全套 9 章 PDF 来自 `_notes/study/adv-micro-psu/adv-micro-psu-2026.md` 引用的 `adv-micro-psu-lecture-notes.pdf`（299 页完整版）拆分，主 LaTeX 源在站主本地。结构性已 LaTeX 化、无需再迁。

**抽检 6/10 · `game` · `toolbox/jukebox/index.html`**
- 已修复：无。
- 设计验证：✅ `noindex+sitemap:false`、不进 `_data/toolbox.yml`、`<meta name="robots" content="noindex,nofollow">` 守卫齐整。front-matter 无 title 属隐藏页有意设计（HTML `<title>` 标签内已设 `JJ · 私藏歌单`）。承接 6-03 后 hover 守卫修复，至今状态稳定。
- 长期建议：维持隐藏 / 自用属性。

**抽检 7/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/mid-sample-2-sol.md`**
- 已修复：无。
- 一致性：✅ pdf_url `/files/corp-fin/mid-sample-2-sol.pdf` 路径有效；front-matter 完整。
- LaTeX 化建议：③ 维持 PDF 存档即可——公司财务管理期中样卷答案存档，一次性资料。

**抽检 8/10 · `lecture_note_pdf_only` · `_notes/study/corp-fin/cheat-sheet-mid-2022.md`**
- 已修复：无。
- 一致性：✅ pdf_url `/files/corp-fin/cheat-sheet-mid-2022.pdf` 路径有效；front-matter 完整。
- LaTeX 化建议：③ 维持 PDF 存档即可——cheat sheet 类资料，对版式精度有强依赖，PDF 形态最合适。

**抽检 9/10 · `pdf_archive` · `files/corp-fin/final-2020.pdf`**（204 KB）
- 已修复：无。
- 归属：✅ `_notes/study/corp-fin/final-2020.md` 唯一引用。
- LaTeX 化潜力：低——与抽检 2 同性质，往年题存档定位明确。维持 PDF 即可。

**抽检 10/10 · `pdf_archive` · `files/interm-metrics/interm-metrics-2023.pdf`**（645 KB）
- 已修复：无。
- 归属：✅ `_notes/study/interm-metrics/interm-metrics-2023.md` 唯一引用。
- LaTeX 化潜力：中-高——中级计量 2023 版讲义，与 6-13 / 6-14 / 6-15 上线的「中级计量讲义（中英双版）」（`interm-econometrics` 文件夹）课程主题相同，可能存在「旧版（2023）→ 新版（重制双语）」迭代关系。建议站主核查 2023 版是否已被新版覆盖，若是可挂个「→ 新版讲义」的互链入口；若两版定位不同（如不同教材线），互相挂入口提升发现率。属内容写作决策，写进 P2 待办。

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）+ 付费墙 `/api/paid` / `/api/redeem` 端点本次 `backend_pulse.py` 仍全报 HTTP 403。与 5-27 ~ 6-16 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。**今日 11 个 commit 全部前端**（toolbox/guandan + assets/js/games），后端无新增依赖。

---

## 2026-06-16

> 例行无人值守巡检：build 健康度 + 仓库卫生 + `scripts/audit/run.sh` 全套（13 项每日；今日周二 DOW=2，未跑 dead_links / orphan_files / pii_scan 三项周一项；DOM=16，未跑 monthly_stats）。距 6-15 巡检共 **17 个 commit**（`ef30032` 之后 → `90a8395` 为止），两条主线：① **新内容上线 1 篇**——`ad03465`「中级宏观经济学讲义重制上线（中英双版）」：把光华《中级宏观经济学》（2022 秋·颜色 Se Yan）整学期课堂笔记重写为自足的教科书式讲义，**英文版 149 页 + 中文版 136 页双开**，共 14 章按「核算→长期增长→货币→短期波动」主线组织（国民收入核算、价格与通胀、劳动力市场、Solow 与黄金律、新古典增长 / OLG / 马尔萨斯、货币与银行、货币数量论、凯恩斯交叉、IS-LM、AD-AS、菲利普斯曲线 / 泰勒规则等），30 幅图（含 5 幅作者原手绘）。英文版**原地升级** `interm-macro-2022.md`（作者 Zircon→Rui Zhou、PDF 1713728→1699486 字节 −0.8%）；中文版**新增** `interm-macro-2022-zh.md` + `files/interm-macro/interm-macro-2022-zh.pdf`（2230405 字节 = 2.13 MB，CJK 字体嵌入正常）。新建 LaTeX 源（`source/main.tex` + `main_zh.tex` + `commands.tex` + `theorems.tex` + `theorems_zh.tex` + 14 章双语 `chapters/`、`chapters_zh/` + 30 张 `figures/`，共 75 文件 / ~8000 行）。继承自 6-13/6-15 的「LaTeX 教科书式讲义走真名 Rui Zhou」约定，本次双版均署名 Rui Zhou，全站此类讲义计 **3 篇**（interm-econometrics + monetary-econ + interm-macro 双版）。② **掼蛋 16 个 commit 系列 UX 收尾**——`f19ce55`/`8293af0`/`fffd89d`「牌面改版 V2 四象限 + 真实矢量花色」+ 后续逢人配/级牌高亮/还贡/旁观蒙版/双下进贡 + `f4c6fb1`「结算画面重构 + 大小王手调参数」+ `7d4bd96`「测试/演示模式（连打 TEST 触发）」+ `04adfc7`/`77e3431` 大小王皇冠分两版面 + `7edd463`「预加载 Cormorant 拉丁主字重 缩短 FOUT」+ `7c06ec2`/`dccfd69`/`9c76c2d`/`a4ad02d`/`031554b` 牌面参数微调 + `14a04a8`「修正『过A』判定与收圈差一」+ `0a85c9b`/`90a8395`「恢复原文字符号 + 钉死系统符号字体消除 FOUT」。共 `guandan.js` 7 次改、`toolbox/guandan/index.html` 13 次改、`_layouts/default.html` 2 次改（字体预加载）；全程 `hover_no_media` ✅ 守卫齐整，DOM 仍保持单机引擎纯前端。`bundle install` ✅ + `bundle exec ruby -e 'Jekyll::Commands::Build.process(...)'` ✅ 通过、零 warning、零 error（13.271 s，cold build）。今日 `scripts/audit/run.sh` 全套审计 **13/13 每日项全 clean**——`keywords_coverage`（散文 121 篇全部充足）/ `images`（仅新增中文版 PDF 2.13 MB 被列入「仓库内独立大文件」，已确认 markdown 入口 + sitemap + search 三处全部正确引用，CJK 字体嵌入致体积大于英文版属正常）/ `material_type_enum`（分布微调：Notes×44 ↑1 / Exams×40 / 课程测评×18 / 经验之谈×5 / 错题本×3 / 写作×2 / 口语×1 / 词汇×1，多出的 ×1 Notes 是新增中文版）/ `filename_convention` / `hover_no_media`（17 个 commit 后掼蛋所有 `:hover` 仍齐用 `@media (hover: hover)` 守卫）/ `sibling_crosslink`（9 个 ≥3 篇 sub_category 组全互链；已验证中英文版互相在「同课程」侧栏列出）/ `bare_dollar` / `img_caption_md` / `svg_italic_zh` / `bare_url` / `frontmatter_yaml` / `spotcheck`（10 项配额抽检列表）/ `backend_pulse`（HTTP 403，承接 6-04 ~ 6-15）。**今日 0 项自动修复**——17 个 commit 全部合规；唯一 P1（`study_order` 未列 `interm-econometrics`）继续从 6-13 / 6-14 / 6-15 承接，今日状态完全不变，属设计判断，按巡检规则不擅改。**关键自我对照**：本次中级宏观因文件夹原本就在 `study_order`（L81，新旧讲义都在 `interm-macro/` 同文件夹下），所以中英双版都正常显示在 `/notes/` landing（已验证 `grep -c "interm-macro" _site/notes/index.html` = 3，含 zh 版 1 处）——与 6-15 货币经济学同形，再次印证 P1#1 是「文件夹命名分歧」问题，不是 study_order 设计本身的问题。

### ✅ 本次已自动修复

**今日无自动修复项** —— 17 个 commit 全部合规：

① **中级宏观讲义重制**双 markdown 入口 permalink / pdf_url 路径正确（`/notes/interm-macro/interm-macro-2022` + `/notes/interm-macro/interm-macro-2022-zh`；PDF 在 `/files/interm-macro/interm-macro-2022.pdf` + `/files/interm-macro/interm-macro-2022-zh.pdf`）；`/notes/` landing 渲染正常（验证：英文版 + 中文版 + interm-macro-review-2023 同 sub_category 三张卡正确并列）；同课程侧栏自动互链 ✅（英文版页面里中文版作为 sibling 显示，反之亦然）；课程别名 `_data/course_aliases.yml` L25「中级宏观经济学」别名已含 `intermediate macroeconomics macro zhongji hongguan 宏观经济学 宏观`，覆盖中英拼音三路检索；中文版 PDF 2.13 MB（>2MB 触发 images.py 大文件提示）属 LaTeX + CJK 字体嵌入正常体积——英文版 1.62 MB 刚好压在阈值下，中文版多出的 ~500 KB 主要是 noto-sans-cjk 字形子集；不需 imgslim/pdfslim 介入。

② **掼蛋 16 个 UX commit**全部不改 API、不接新服务、不引入新依赖：纯前端引擎 / 结算 / 牌面 / 测试模式重构。`@media (hover: hover)` 守卫贯彻齐整、字体预加载（`7edd463`）放在 `_layouts/default.html` `<head>` 内对全站 FOUT 改善而非仅掼蛋一处、文字花色钉死系统符号字体的策略（`90a8395`）合理避免 web font 加载期闪烁。**形成中的设计共识**：手机端触屏游戏的「字体加载闪烁」与「全屏即开局」是优先级 1 的体验目标，今日多个 commit 都围绕此收敛，与 6-15 之前掼蛋方向连续。

### 📋 待你把关

#### P1（建议尽快，承接 6-13 / 6-14 / 6-15）

1. **`_config.yml` 的 `study_order` 缺 `interm-econometrics`，新讲义在 `/notes/` landing 仍不可见** —— 承接 6-13 / 6-14 / 6-15 P1#1，今日状态**完全不变**：`grep -c "interm-econometrics" _site/notes/index.html` = 0；sitemap (2) + search.json (1) 仍能命中；同课程侧栏互链未受影响。三个走法照旧（A 在 `study_order` 追加一行 / B 把 `_notes/study/interm-econometrics/` 物理合并到既有 `_notes/study/interm-metrics/` 文件夹 / C 保持现状只靠搜索 + sitemap）。仍推荐方案 B 物理合并（与今日中级宏观、6-15 货币经济学的「原地升级 + 同文件夹」模式一致），等站主拍板。**关键补充**：本次中级宏观的中英双版处理证明了「同文件夹原地升级 / 新增」模式工作良好（landing + 侧栏 + sitemap + search 全 ✅）；若方案 B 处理 interm-econometrics，可参考本次同形操作。

#### P2（看心情）

1. **新付费墙系统在沙箱无后端出口验证** —— 承接 6-04 ~ 6-15 P2#1。`zircon-urge.fly.dev` 今日 `backend_pulse.py` 仍 HTTP 403。

2. **`scripts/{daily_review,email_summary,flight_watch}.prompt.md` 与几处 SKILL.md 正文里仍称"zirconeey 站"** —— 沿用 6-05 ~ 6-15。属本地标识符，不影响线上。

3. **`_notes/study/adv-metrics-pku/mid-2015.md`、`_notes/study/psy-stat-I/anova-R.md` 这两类纯 PDF 存档可考虑加同课程互链入口** —— 沿用 6-05 ~ 6-15 P2#4。设计取向项。

4. **5 条 DNS NameResolutionError 外链需站主在生产环境复验**（沿用 6-08 ~ 6-15）—— centretax.net、offcampus.psu.edu、www.hwdrivingschool.com、www.judicialinformation.com、www.textile-outlook.com。今日周二未跑 `dead_links.py`；下周一会再扫一遍。

5. **`_notes/life/paid-test-{us-banking-guide,us-visa-types}.md` 标题仍带"（付费）"后缀但 `paid:false`** —— 沿用 6-06 ~ 6-15。已确认两文件 front-matter 中 title 仍含「（付费）」尾缀，但 6-13 `e22f751` / `ba6ccff` 两次「取消付费」commit 已让 paid 实际为 false——属设计取向项（保留尾缀作历史标识 vs 移除尾缀让标题干净），由站主拍板。

#### 🆕 本次新出现的观察（不是问题，是提示）

- **「Rui Zhou」署名扩展到 3 篇 LaTeX 教科书式讲义**：interm-econometrics-2023（6-13）+ monetary-econ-2023（6-15）+ **interm-macro-2022 中英双版（今日，记作 1 篇）** = 共 **3 篇**（双版按一套讲义算）。`author: "Rui Zhou"` 字段计 **4 处**（中英两版分别一处）。**「LaTeX 教科书式讲义 → 真名」约定持续成立**——3 篇都对应 `source/main.tex + commands.tex + theorems.tex + chapters/` 完整 LaTeX 工程，形态高度同质。今日的中文版 + 双语 `chapters_zh/` + `main_zh.tex` + `theorems_zh.tex` 是新形态首例，将来若同一讲义出多语种 / 多版本，可参考此处的命名 pattern（无后缀 = 英文版 = 默认 / `_zh` 后缀 = 中文版）。

- **PDF 体积分化属正常**：英文版 1.62 MB、中文版 2.13 MB，差 500 KB 主要是 CJK noto-sans 字形子集嵌入。`images.py` 仅中文版超阈值（>2 MB），英文版刚好压在阈值下——这两个体积都不大、都是 LaTeX 一次性最小化产物，不需 EXEMPT_FILES 豁免（与 6-15 monetary-econ 同理）。

- **同一讲义出双版（中英对照）作为新形态**：今日是站内首次出现「同一课程笔记同时出英文和中文两个独立 markdown + 两个独立 PDF」，且两版互为 sibling（互在对方的侧栏列出）。这套模式适合"全英文 LaTeX 主源 + 中文翻译版"的场景（与 6-13 interm-econometrics、6-15 monetary-econ 不同——后两者只有英文版）。**不是问题**——是站主对学术内容形态的有意切换；若日后另两篇也补中文版，可形成正式 schema 标注。

- **掼蛋 16 commit 收敛于「触屏体验 + 字体闪烁 + 演示模式」三件套**：今日 16 个 commit 中 `7edd463`（字体预加载）+ `0a85c9b`/`90a8395`（钉死系统符号字体消除 FOUT）共 3 个 commit 围绕首屏体验；`7d4bd96`（连打 TEST 触发演示模式）让站主在分享场合可一键演示；其余 13 个围绕牌面参数微调。**不是问题**——属设计上行；仅作记录。

#### 🗒️ 待办清账（承接 6-15）

- **图片 alt / caption 覆盖**：`images.py` 今日 ✅ 保持收口。
- **后端脉搏**：本沙箱仍无 fly.io 出口，三件套 HTTP 403。
- **Round-3 留下的 ~68 个 P1**：未在本次范围推进。
- **`taichi-review-2023.md`「85 公里跑」**：未触碰。
- **大图基线**：与 6-15 + 今日新增中文版 PDF 一致。

### 🔬 抽检专项

> 本次种子抽 10 项（强制配额 game / pdf_archive / lecture_note_pdf_only 各 ≥1，其余随机）。10 项一视同仁过审清单。

- **抽检 1/10 · game · `toolbox/schulte/index.html`**（643 行 / 21.8KB，inline-only）—— ✅ 无问题。舒尔特方格注意力训练；单文件 inline 风格与同类小工具一致；hover 守卫齐全（`hover_no_media` ✅）；本周未改动。
- **抽检 2/10 · pdf_archive · `files/adv-micro-psu/chapters/ch9.pdf`**（212.5 KB，章节切片）—— ✅ 无问题。属 adv-micro-psu 章节合订本体系一部分；同目录其他章节同形；体积 < 5 MB 不需 pdfslim；被 `_notes/study/adv-micro-psu/` 下笔记正确引用。
- **抽检 3/10 · lecture_note_pdf_only · `_notes/study/adv-micro-psu/2025-midterm-1.md`**（16 行 / 1.3 KB，PDF 存档）—— ✅ 无问题。高级微观（PSU）2025 期中 1；front-matter 完整；走 post.html 自动导语兜底；本周未改动。**LaTeX 化评估**：维持 PDF 存档（单次期末考试卷不值得重制；与本次中级宏观的「整学期讲义」形态不同）。
- **抽检 4/10 · pdf_archive · `files/adv-macro-psu/chapters/ch9.pdf`**（176.6 KB，章节切片）—— ✅ 无问题。adv-macro-psu 章节体系，同 adv-micro-psu 形态。
- **抽检 5/10 · note · `_notes/life/spilled-liquid-cleanup.md`**（236 行 / 17.6 KB，生活之问）—— ✅ 无问题。「打翻液体后用纸吸还是用布擦」生活之问；2026-05-01；本周未改动；符合生活之问五段结构与循证文献调性。
- **抽检 6/10 · game · `toolbox/gomoku/index.html`**（1280 行 / 48.7 KB，inline）—— ✅ 无问题。五子棋；单文件 1280 行属合理（含 AI 与 UI 完整）；本周未改动；`tiaoqi`/`gomoku` 同属棋类系列。
- **抽检 7/10 · pdf_archive · `files/adv-micro-psu/chapters/ch8.pdf`**（305.3 KB）—— ✅ 同抽检 2 / 4 形态。
- **抽检 8/10 · note · `_notes/life/us-renting-guide.md`**（474 行 / 21.7 KB，留学攻略）—— ✅ 无问题。美国租房完全指南；2026-04-21；本周未改动；结构合理 + keywords 充足。
- **抽检 9/10 · note · `_notes/tutoring/physics-basic-models.md`**（49 行 / 1.2 KB，PDF 存档 + 导语）—— ✅ 无问题。高一物理基本模型；front-matter 完整；`pdf_url` 指向 `/files/tutoring/physics-basic-models/Main.pdf`；本周未改动。
- **抽检 10/10 · pdf_archive · `files/causal-inference/final-2022.pdf`**（913.6 KB）—— ✅ 无问题。被 `_notes/study/causal-inference/final-2022.md` 引用；同目录 `final-2022.md` 已存在；体积合理；本周未改动。**LaTeX 化评估**：考试样卷不值得重制（同抽检 3 判断）。

> 10 项一视同仁深审，今日无任何项触发深查。

---

### 🗂 仓库卫生

**仓库结构较 6-15 有新增**——17 个 commit 涉及多个文件：① `_notes/study/interm-macro/interm-macro-2022-zh.md`（16 行新增）；② `_notes/study/interm-macro/interm-macro-2022.md`（8 行 front-matter 改）；③ `files/interm-macro/interm-macro-2022-zh.pdf`（2230405 字节新增）；④ `files/interm-macro/interm-macro-2022.pdf`（1713728 → 1699486 字节）；⑤ `files/interm-macro/source/` **新增**（75 文件 / ~8000 行）；⑥ `toolbox/guandan/index.html`（13 次改）+ `assets/js/games/guandan.js`（7 次改）+ `_layouts/default.html`（2 次改，字体预加载）。**对照「仓库卫生 4a–e」逐项过：**

a. **架构变化判断**：今日有新增结构性目录（`files/interm-macro/source/{chapters,chapters_zh,figures}/`）—— 结构层面**有变化**，继续 b–e。

b. **敏感文件扫描**：`git ls-files | grep -iE '\.env$|credentials|\.DS_Store|token\.json|secret|\.pem$|\.key$'` ✅ 全空；`git ls-files | grep -E " 2\.|copy [0-9]\."` ✅ 全空（macOS 副本 0）；`git ls-files --others --exclude-standard` ✅ 空。

c. **公开 vs 私用区分**：`files/interm-macro/source/` 与已有 `files/interm-econometrics/source/`、`files/monetary-econ/source/`、`files/causal-id/source/` 同形——LaTeX 源公开，便于读者克隆 / 编辑 / 重编译，属内容、不应排除。新增 `chapters_zh/` 子目录是中文翻译版章节，首次出现的 pattern，命名清晰（与 `chapters/` 并列、`main_zh.tex` / `theorems_zh.tex` 同 `_zh` 后缀），不需特别处理。

d. **结构层面无冗余 / 命名混乱**：与既有三套 LaTeX source/ 同形 + 新增的 `chapters_zh/` / `main_zh.tex` / `theorems_zh.tex` 命名约定清晰一致。

e. **红线全部守住**：未改写历史、未 force-push、未动 .git/、未删除被跟踪内容。

**结论**：仓库卫生 ✅ 干净，LaTeX source/ 新增双语章节子目录符合既有 pattern，无新增 hygiene 隐患。

---

### 💓 后端脉搏 / 📬 读者来信

后端三件套（zircon-urge / leaderboards / zircon-comments waline）本次 `backend_pulse.py` 仍全报 HTTP 403。与 6-04 ~ 6-15 同因（沙箱无 fly.io 出口），不阻塞巡检，未主动重启 fly app。

---

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

